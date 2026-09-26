import "server-only";
import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { formatFecha, formatSoles } from "@/lib/format";

const MARCA = "#74421d";
const s = StyleSheet.create({
  pagina: { padding: 36, fontSize: 9.5, fontFamily: "Helvetica", color: "#1c1917" },
  cabecera: { flexDirection: "row", justifyContent: "space-between", borderBottom: `2 solid ${MARCA}`, paddingBottom: 10, marginBottom: 14 },
  marca: { fontSize: 20, fontFamily: "Helvetica-Bold", color: MARCA },
  suave: { color: "#6b645c" },
  titulo: { fontSize: 13, fontFamily: "Helvetica-Bold", textAlign: "right" },
  bloque: { flexDirection: "row", gap: 16, marginBottom: 14 },
  caja: { flex: 1, padding: 8, backgroundColor: "#f7f4ef", borderRadius: 4 },
  etiqueta: { fontSize: 8, color: "#6b645c", marginBottom: 2 },
  filaTabla: { flexDirection: "row", borderBottom: "0.5 solid #e5e2dd", paddingVertical: 5 },
  encabezado: { flexDirection: "row", backgroundColor: MARCA, color: "#fff", paddingVertical: 5, fontFamily: "Helvetica-Bold" },
  totales: { marginTop: 10, marginLeft: "auto", width: 220 },
  filaTotal: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  total: { flexDirection: "row", justifyContent: "space-between", paddingTop: 5, marginTop: 3, borderTop: `1 solid ${MARCA}`, fontFamily: "Helvetica-Bold", fontSize: 12 },
  pie: { position: "absolute", bottom: 28, left: 36, right: 36, fontSize: 8, color: "#6b645c", borderTop: "0.5 solid #e5e2dd", paddingTop: 6 },
});

const COLS = [
  { t: "Modelo", w: "34%" }, { t: "Color", w: "14%" }, { t: "Series", w: "9%", r: true }, { t: "Pares", w: "9%", r: true },
  { t: "Precio par", w: "16%", r: true }, { t: "Subtotal", w: "18%", r: true },
];

export type DatosPdfCotizacion = {
  numero: number;
  fecha: Date;
  validaHasta: Date | null;
  cliente: { razonSocial: string; ruc: string; contacto: string | null; direccion: string; telefono: string | null };
  vendedor: { nombre: string; telefono: string | null; email: string };
  items: { modelo: string; sku: string; color: string; series: number; pares: number; precioPar: number; subtotal: number }[];
  subtotal: number; descuentoVolumen: number; descuentoPorcentaje: number; descuentoMonto: number;
  baseImponible: number; igvPorcentaje: number; igv: number; total: number;
  notas: string | null;
  condiciones: string[];
};

function CotizacionPdf({ d }: { d: DatosPdfCotizacion }) {
  return (
    <Document title={`Cotización ${d.numero} - Convert`} author="Convert">
      <Page size="A4" style={s.pagina}>
        <View style={s.cabecera}>
          <View>
            <Text style={s.marca}>CONVERT</Text>
            <Text style={s.suave}>Zapatillas de cuero al por mayor · Lima, Perú</Text>
          </View>
          <View>
            <Text style={s.titulo}>COTIZACIÓN N° {String(d.numero).padStart(6, "0")}</Text>
            <Text style={[s.suave, { textAlign: "right" }]}>Fecha: {formatFecha(d.fecha)}</Text>
            <Text style={[s.suave, { textAlign: "right" }]}>Válida hasta: {formatFecha(d.validaHasta)}</Text>
          </View>
        </View>

        <View style={s.bloque}>
          <View style={s.caja}>
            <Text style={s.etiqueta}>CLIENTE</Text>
            <Text style={{ fontFamily: "Helvetica-Bold" }}>{d.cliente.razonSocial}</Text>
            <Text>RUC {d.cliente.ruc}</Text>
            {d.cliente.contacto && <Text>Atención: {d.cliente.contacto}</Text>}
            {d.cliente.direccion && <Text>{d.cliente.direccion}</Text>}
            {d.cliente.telefono && <Text>Tel. {d.cliente.telefono}</Text>}
          </View>
          <View style={s.caja}>
            <Text style={s.etiqueta}>ASESOR COMERCIAL</Text>
            <Text style={{ fontFamily: "Helvetica-Bold" }}>{d.vendedor.nombre}</Text>
            {d.vendedor.telefono && <Text>Cel. {d.vendedor.telefono}</Text>}
            <Text>{d.vendedor.email}</Text>
          </View>
        </View>

        <View style={s.encabezado}>
          {COLS.map((c) => <Text key={c.t} style={{ width: c.w, paddingHorizontal: 4, textAlign: c.r ? "right" : "left" }}>{c.t}</Text>)}
        </View>
        {d.items.map((i, n) => (
          <View key={n} style={s.filaTabla} wrap={false}>
            <Text style={{ width: COLS[0]!.w, paddingHorizontal: 4 }}>{i.modelo}{"\n"}<Text style={s.suave}>{i.sku}</Text></Text>
            <Text style={{ width: COLS[1]!.w, paddingHorizontal: 4 }}>{i.color}</Text>
            <Text style={{ width: COLS[2]!.w, paddingHorizontal: 4, textAlign: "right" }}>{i.series}</Text>
            <Text style={{ width: COLS[3]!.w, paddingHorizontal: 4, textAlign: "right" }}>{i.pares}</Text>
            <Text style={{ width: COLS[4]!.w, paddingHorizontal: 4, textAlign: "right" }}>{formatSoles(i.precioPar)}</Text>
            <Text style={{ width: COLS[5]!.w, paddingHorizontal: 4, textAlign: "right" }}>{formatSoles(i.subtotal)}</Text>
          </View>
        ))}

        <View style={s.totales}>
          <View style={s.filaTotal}><Text>Subtotal</Text><Text>{formatSoles(d.subtotal)}</Text></View>
          {d.descuentoVolumen > 0 && <View style={s.filaTotal}><Text>Descuento por volumen</Text><Text>-{formatSoles(d.descuentoVolumen)}</Text></View>}
          {d.descuentoMonto > 0 && <View style={s.filaTotal}><Text>Descuento ({d.descuentoPorcentaje} %)</Text><Text>-{formatSoles(d.descuentoMonto)}</Text></View>}
          <View style={s.filaTotal}><Text>Valor de venta</Text><Text>{formatSoles(d.baseImponible)}</Text></View>
          <View style={s.filaTotal}><Text>IGV ({d.igvPorcentaje} %)</Text><Text>{formatSoles(d.igv)}</Text></View>
          <View style={s.total}><Text>TOTAL</Text><Text>{formatSoles(d.total)}</Text></View>
        </View>

        {d.notas && (
          <View style={{ marginTop: 16 }}>
            <Text style={s.etiqueta}>NOTAS</Text>
            <Text>{d.notas}</Text>
          </View>
        )}
        <View style={{ marginTop: 16 }}>
          <Text style={s.etiqueta}>CONDICIONES</Text>
          {d.condiciones.map((c) => <Text key={c}>• {c}</Text>)}
        </View>

        <Text style={s.pie} fixed>
          Convert · Precios en soles (PEN). Documento no válido como comprobante de pago. El comprobante electrónico se emite al confirmar el pedido.
        </Text>
      </Page>
    </Document>
  );
}

export function generarPdfCotizacion(d: DatosPdfCotizacion) {
  return renderToBuffer(<CotizacionPdf d={d} />);
}
