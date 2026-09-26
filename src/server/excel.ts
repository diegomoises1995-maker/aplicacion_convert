import "server-only";
import ExcelJS from "exceljs";

export type ColumnaExcel<T> = {
  titulo: string;
  valor: (fila: T) => string | number | Date | null | undefined;
  ancho?: number;
  formato?: "soles" | "numero" | "fecha" | "porcentaje";
};

const FORMATOS = { soles: '"S/" #,##0.00', numero: "#,##0", fecha: "dd/mm/yyyy", porcentaje: "0.0%" };

export type HojaExcel<T> = { nombre: string; columnas: ColumnaExcel<T>[]; filas: T[] };

/** Genera un .xlsx con una o varias hojas y lo devuelve como respuesta descargable. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function respuestaExcel(archivo: string, hojas: HojaExcel<any>[]) {
  const libro = new ExcelJS.Workbook();
  libro.creator = "Convert Ventas";
  libro.created = new Date();

  for (const hoja of hojas) {
    const ws = libro.addWorksheet(hoja.nombre.slice(0, 31));
    ws.columns = hoja.columnas.map((c) => ({ header: c.titulo, width: c.ancho ?? Math.max(12, c.titulo.length + 2) }));
    for (const fila of hoja.filas) ws.addRow(hoja.columnas.map((c) => c.valor(fila) ?? null));
    hoja.columnas.forEach((c, i) => {
      if (c.formato) ws.getColumn(i + 1).numFmt = FORMATOS[c.formato];
    });
    const encabezado = ws.getRow(1);
    encabezado.font = { bold: true, color: { argb: "FFFFFFFF" } };
    encabezado.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF74421D" } };
    ws.views = [{ state: "frozen", ySplit: 1 }];
    if (hoja.filas.length) ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: hoja.columnas.length } };
  }

  const buffer = await libro.xlsx.writeBuffer();
  return new Response(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${archivo}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}

/** Convierte Decimal de Prisma a número para Excel. */
export const num = (v: { toString(): string } | null | undefined) => (v === null || v === undefined ? null : Number(v.toString()));
