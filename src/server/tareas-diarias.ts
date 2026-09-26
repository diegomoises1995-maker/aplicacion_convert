// Proceso diario (Vercel Cron o botón en Configuración). Sin dependencias de Next
// para poder ejecutarlo también desde el seed.
import type { PrismaClient } from "@prisma/client";
import { necesitaRecompra } from "@/lib/clientes";
import { ESTADOS_VENTA } from "@/lib/ventas";
import { recalcularCliente, reglasDesdeConfig } from "@/server/metricas-core";

export type ResultadoTareas = {
  clientes: number;
  cambiosEstado: number;
  alertasNuevas: number;
  alertasCerradas: number;
  cotizacionesVencidas: number;
  ms: number;
};

export async function ejecutarTareasDiarias(db: PrismaClient, ahora = new Date()): Promise<ResultadoTareas> {
  const t0 = Date.now();
  const config = await db.configuracion.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  const reglas = reglasDesdeConfig(config);

  // 1. Métricas, estado (nuevo/activo/en riesgo/inactivo) y categoría A/B/C
  const clientes = await db.cliente.findMany({ select: { id: true, estado: true } });
  let cambiosEstado = 0;
  for (const c of clientes) {
    const r = await recalcularCliente(db, c.id, reglas, ahora);
    if (r.estado !== c.estado) cambiosEstado++;
  }

  // 2. Cerrar alertas de clientes que ya volvieron a comprar
  const abiertas = await db.alertaRecompra.findMany({ where: { atendida: false }, select: { id: true, clienteId: true, createdAt: true } });
  let alertasCerradas = 0;
  for (const a of abiertas) {
    const compro = await db.pedido.count({ where: { clienteId: a.clienteId, fecha: { gte: a.createdAt }, estado: { in: [...ESTADOS_VENTA, "PENDIENTE_PAGO"] } } });
    if (compro > 0) {
      await db.alertaRecompra.update({ where: { id: a.id }, data: { atendida: true, atendidaAt: ahora } });
      alertasCerradas++;
    }
  }

  // 3. Nuevas alertas de recompra: superó su frecuencia habitual sin comprar.
  //    Una sola alerta por ciclo de compra: si ya hubo una (atendida o no) desde
  //    la última compra, no se vuelve a crear hasta que el cliente compre de nuevo.
  const candidatos = await db.cliente.findMany({
    where: { ultimaCompra: { not: null }, estado: { in: ["NUEVO", "ACTIVO", "EN_RIESGO"] } },
    select: {
      id: true, razonSocial: true, nombreComercial: true, vendedorId: true, primeraCompra: true, ultimaCompra: true, frecuenciaDias: true,
      alertas: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
    },
  });
  let alertasNuevas = 0;
  for (const c of candidatos) {
    const ultimaAlerta = c.alertas[0]?.createdAt;
    if (ultimaAlerta && c.ultimaCompra && ultimaAlerta >= c.ultimaCompra) continue;
    const r = necesitaRecompra(c, reglas, ahora);
    if (!r) continue;
    await db.$transaction(async (tx) => {
      await tx.alertaRecompra.create({
        data: { clienteId: c.id, vendedorId: c.vendedorId, diasSinCompra: r.diasSinCompra, frecuenciaDias: r.frecuenciaDias },
      });
      if (c.vendedorId) {
        await tx.actividad.create({
          data: {
            tipo: "WHATSAPP",
            asunto: `Recompra: ${c.nombreComercial || c.razonSocial} lleva ${r.diasSinCompra} días sin comprar (suele comprar cada ${r.frecuenciaDias})`,
            clienteId: c.id,
            vendedorId: c.vendedorId,
            fechaProgramada: ahora,
          },
        });
      }
    });
    alertasNuevas++;
  }

  // 4. Cotizaciones abiertas cuya validez terminó
  const vencidas = await db.cotizacion.updateMany({
    where: { estado: { in: ["BORRADOR", "ENVIADA", "ACEPTADA"] }, validaHasta: { lt: ahora } },
    data: { estado: "VENCIDA" },
  });

  const resultado = {
    clientes: clientes.length, cambiosEstado, alertasNuevas, alertasCerradas,
    cotizacionesVencidas: vencidas.count, ms: Date.now() - t0,
  };
  await db.auditLog.create({ data: { accion: "sistema.tareas_diarias", entidad: "Sistema", despues: resultado } });
  return resultado;
}
