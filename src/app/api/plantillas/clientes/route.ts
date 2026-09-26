import { getUsuarioActual } from "@/server/sesion";
import { ENCABEZADOS_PLANTILLA } from "@/lib/importacion";

const NOMBRES: Record<string, string> = {
  razonSocial: "razon_social", nombreComercial: "nombre_comercial", contactoNombre: "contacto",
};

export async function GET() {
  if (!(await getUsuarioActual())) return new Response("No autorizado", { status: 401 });
  const encabezados = ENCABEZADOS_PLANTILLA.map((c) => NOMBRES[c] ?? c);
  const ejemplo = [
    "20131312955", "Calzados Ejemplo S.A.C.", "Zapatería Ejemplo", "María Pérez", "987654321", "987654321",
    "compras@ejemplo.pe", "Av. Grau 123", "La Victoria", "Lima", "Lima", "tienda", "", "", "Lima Centro", "",
  ];
  const csv = "﻿" + [encabezados.join(","), ejemplo.join(",")].join("\r\n") + "\r\n";
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="plantilla-clientes.csv"',
    },
  });
}
