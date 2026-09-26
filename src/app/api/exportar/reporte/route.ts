import type { NextRequest } from "next/server";
import { getAlcance, getUsuarioActual } from "@/server/sesion";
import { tienePermiso } from "@/lib/permisos";
import { NOMBRE_TIPO_ACTIVIDAD, type TipoActividad } from "@/lib/actividades";
import { NOMBRE_ETAPA } from "@/lib/pipeline";
import { NOMBRE_ESTADO, type EstadoCliente } from "@/lib/clientes";
import { respuestaExcel, num, type HojaExcel } from "@/server/excel";
import {
  leerRango, reporteActividades, reporteClientes, reporteModelos, reporteOportunidades, reporteVendedores, reporteZonas,
} from "@/server/reportes";

export async function GET(req: NextRequest) {
  const usuario = await getUsuarioActual();
  if (!usuario) return new Response("No autorizado", { status: 401 });
  if (!tienePermiso(usuario.rol, "reportes.gerencia")) return new Response("Sin permiso", { status: 403 });
  const sp = req.nextUrl.searchParams;
  const rango = leerRango({ desde: sp.get("desde") ?? undefined, hasta: sp.get("hasta") ?? undefined });
  const alcance = await getAlcance(usuario);
  const tipo = sp.get("tipo");
  const sufijo = `${rango.desdeTexto}_a_${rango.hastaTexto}`;

  // Cada caso arma su hoja con el tipo de fila de su propio reporte.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let hoja: HojaExcel<any>;
  switch (tipo) {
    case "vendedores": {
      const filas = await reporteVendedores(alcance, rango);
      type F = (typeof filas)[number];
      hoja = { nombre: "Vendedores", filas: filas, columnas: [
        { titulo: "Vendedor", valor: (f: F) => f.vendedor, ancho: 24 },
        { titulo: "Pedidos", valor: (f: F) => f.pedidos, formato: "numero" },
        { titulo: "Clientes", valor: (f: F) => f.clientes, formato: "numero" },
        { titulo: "Clientes nuevos", valor: (f: F) => f.nuevos, formato: "numero" },
        { titulo: "Pares", valor: (f: F) => f.pares, formato: "numero" },
        { titulo: "Ventas (sin IGV)", valor: (f: F) => f.soles, formato: "soles" },
        { titulo: "Ticket promedio", valor: (f: F) => f.ticket, formato: "soles" },
      ] };
      break;
    }
    case "clientes": {
      const filas = await reporteClientes(alcance, rango);
      type F = (typeof filas)[number];
      hoja = { nombre: "Clientes", filas: filas, columnas: [
        { titulo: "RUC", valor: (f: F) => f.ruc, ancho: 14 },
        { titulo: "Razón social", valor: (f: F) => f.razon, ancho: 34 },
        { titulo: "Ciudad", valor: (f: F) => f.ciudad },
        { titulo: "Vendedor", valor: (f: F) => f.vendedor, ancho: 20 },
        { titulo: "Categoría", valor: (f: F) => f.categoria },
        { titulo: "Estado", valor: (f: F) => NOMBRE_ESTADO[f.estado as EstadoCliente] },
        { titulo: "Pedidos", valor: (f: F) => f.pedidos, formato: "numero" },
        { titulo: "Pares", valor: (f: F) => f.pares, formato: "numero" },
        { titulo: "Ventas (sin IGV)", valor: (f: F) => f.soles, formato: "soles" },
      ] };
      break;
    }
    case "modelos": {
      const filas = await reporteModelos(alcance, rango);
      type F = (typeof filas)[number];
      hoja = { nombre: "Modelos", filas: filas, columnas: [
        { titulo: "SKU", valor: (f: F) => f.sku },
        { titulo: "Modelo", valor: (f: F) => f.nombre, ancho: 24 },
        { titulo: "Color", valor: (f: F) => f.color },
        { titulo: "Series", valor: (f: F) => f.series, formato: "numero" },
        { titulo: "Pares", valor: (f: F) => f.pares, formato: "numero" },
        { titulo: "Clientes", valor: (f: F) => f.clientes, formato: "numero" },
        { titulo: "Ventas (sin IGV)", valor: (f: F) => f.soles, formato: "soles" },
      ] };
      break;
    }
    case "zonas": {
      const filas = await reporteZonas(alcance, rango);
      type F = (typeof filas)[number];
      hoja = { nombre: "Zonas", filas: filas, columnas: [
        { titulo: "Zona", valor: (f: F) => f.zona, ancho: 20 },
        { titulo: "Pedidos", valor: (f: F) => f.pedidos, formato: "numero" },
        { titulo: "Clientes", valor: (f: F) => f.clientes, formato: "numero" },
        { titulo: "Ventas (sin IGV)", valor: (f: F) => f.soles, formato: "soles" },
      ] };
      break;
    }
    case "actividades": {
      const filas = await reporteActividades(alcance, rango);
      type F = (typeof filas)[number];
      hoja = { nombre: "Actividades", filas: filas, columnas: [
        { titulo: "Vendedor", valor: (f: F) => f.vendedor, ancho: 24 },
        { titulo: "Tipo", valor: (f: F) => NOMBRE_TIPO_ACTIVIDAD[f.tipo as TipoActividad] },
        { titulo: "Total", valor: (f: F) => f.total, formato: "numero" },
        { titulo: "Exitosas", valor: (f: F) => f.exitosas, formato: "numero" },
        { titulo: "Pendientes", valor: (f: F) => f.pendientes, formato: "numero" },
      ] };
      break;
    }
    case "oportunidades": {
      const filas = await reporteOportunidades(alcance, rango);
      type F = (typeof filas)[number];
      hoja = { nombre: "Oportunidades", filas: filas, columnas: [
        { titulo: "Oportunidad", valor: (f: F) => f.titulo, ancho: 34 },
        { titulo: "Cliente", valor: (f: F) => f.cliente.razonSocial, ancho: 30 },
        { titulo: "Vendedor", valor: (f: F) => f.vendedor.nombre, ancho: 20 },
        { titulo: "Etapa", valor: (f: F) => NOMBRE_ETAPA[f.etapa] },
        { titulo: "Valor estimado", valor: (f: F) => num(f.valorEstimado), formato: "soles" },
        { titulo: "Cierre probable", valor: (f: F) => f.fechaCierreProbable, formato: "fecha" },
        { titulo: "Cierre real", valor: (f: F) => f.fechaCierreReal, formato: "fecha" },
        { titulo: "Motivo de pérdida", valor: (f: F) => f.motivoPerdida, ancho: 24 },
      ] };
      break;
    }
    default:
      return new Response("Tipo de reporte inválido", { status: 400 });
  }
  return respuestaExcel(`reporte-${tipo}-${sufijo}`, [hoja]);
}
