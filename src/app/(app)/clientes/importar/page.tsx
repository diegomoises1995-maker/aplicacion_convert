import type { Metadata } from "next";
import { requirePermiso } from "@/server/sesion";
import { Card, EncabezadoPagina } from "@/components/ui/card";
import { Importador } from "./importador";

export const metadata: Metadata = { title: "Importar clientes" };

export default async function ImportarPage() {
  const usuario = await requirePermiso("clientes.importar");
  return (
    <>
      <EncabezadoPagina titulo="Importar clientes" descripcion="Carga masiva desde CSV o Excel (.xlsx)" />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <Importador />
        </Card>
        <Card className="text-sm">
          <h2 className="font-semibold">Formato</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-texto-suave">
            <li><strong>Obligatorias:</strong> ruc, razon_social.</li>
            <li>Opcionales: nombre_comercial, contacto, telefono, whatsapp, email, direccion, distrito, ciudad, departamento, tipo (tienda / revendedor / distribuidor / otro), categoria (A/B/C), vendedor (correo), zona, notas.</li>
            <li>Los encabezados pueden ir con tildes o mayúsculas; separador coma o punto y coma.</li>
            <li>El RUC se valida (11 dígitos y dígito verificador).</li>
            {usuario.rol !== "ADMIN" && <li>Si no indicas vendedor, los clientes quedan a tu nombre. Solo puedes asignar a vendedores de tu equipo.</li>}
            <li>Primero verás una vista previa; nada se guarda hasta que confirmes.</li>
          </ul>
          <a href="/api/plantillas/clientes" className="mt-4 inline-block font-medium text-marca-700">Descargar plantilla CSV →</a>
        </Card>
      </div>
    </>
  );
}
