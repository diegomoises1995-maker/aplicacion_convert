import "server-only";
import type { Prisma } from "@prisma/client";
import { NOMBRE_ESTADO_PEDIDO, type EstadoPedido } from "@/lib/pedidos";
import { filtroVendedor } from "@/lib/alcance";
import { getAlcance, type UsuarioActual } from "@/server/sesion";
import { desdeInputFecha } from "@/lib/fechas";

export type FiltrosPedidos = { estado?: string; cliente?: string; vendedor?: string; desde?: string; hasta?: string; q?: string };

export async function wherePedidos(usuario: UsuarioActual, f: FiltrosPedidos): Promise<Prisma.PedidoWhereInput> {
  const and: Prisma.PedidoWhereInput[] = [filtroVendedor(await getAlcance(usuario))];
  if (f.estado && f.estado in NOMBRE_ESTADO_PEDIDO) and.push({ estado: f.estado as EstadoPedido });
  if (f.cliente) and.push({ clienteId: f.cliente });
  if (f.vendedor) and.push({ vendedorId: f.vendedor });
  const desde = f.desde ? desdeInputFecha(f.desde) : null;
  const hasta = f.hasta ? desdeInputFecha(f.hasta) : null;
  // desdeInputFecha("AAAA-MM-DD") devuelve el mediodía de Lima: ±12 h da el inicio y el fin del día
  if (desde) and.push({ fecha: { gte: new Date(desde.getTime() - 12 * 3_600_000) } });
  if (hasta) and.push({ fecha: { lt: new Date(hasta.getTime() + 12 * 3_600_000) } });
  if (f.q) {
    const n = Number(f.q.replace(/\D/g, ""));
    and.push({
      OR: [
        ...(n ? [{ numero: n }] : []),
        { cliente: { razonSocial: { contains: f.q, mode: "insensitive" } } },
        { cliente: { nombreComercial: { contains: f.q, mode: "insensitive" } } },
        { numeroGuia: { contains: f.q, mode: "insensitive" } },
      ],
    });
  }
  return { AND: and };
}
