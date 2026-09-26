"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatSoles } from "@/lib/format";

// Paleta validada (scripts/validate_palette.js): marca #8f5324 vs azul #2a78d6, ΔE CVD 25.7, contraste ≥ 3:1.
const ACTUAL = "#8f5324";
const ANTERIOR = "#2a78d6";
const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

type Punto = { anio: number; mes: number; actual: number; anterior: number };

const abreviar = (v: number) => (v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${Math.round(v / 1000)}k` : String(v));

export function GraficoVentasMensuales({ datos }: { datos: Punto[] }) {
  const filas = datos.map((d) => ({ ...d, etiqueta: `${MESES[d.mes - 1]} ${String(d.anio).slice(2)}` }));
  return (
    <figure>
      <div className="h-64 w-full" role="img" aria-label="Ventas mensuales de los últimos 12 meses comparadas con el año anterior">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={filas} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barGap={2} barCategoryGap="22%">
            <CartesianGrid vertical={false} stroke="#e7e5e4" />
            <XAxis dataKey="etiqueta" tickLine={false} axisLine={{ stroke: "#d6d3d1" }} tick={{ fontSize: 11, fill: "#6b645c" }} interval="preserveStartEnd" />
            <YAxis tickFormatter={abreviar} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#6b645c" }} width={48} />
            <Tooltip
              cursor={{ fill: "rgba(0,0,0,0.04)" }}
              formatter={(v, nombre) => [formatSoles(Number(v)), nombre]}
              labelStyle={{ fontWeight: 600, color: "#1c1917" }}
              contentStyle={{ borderRadius: 8, borderColor: "#e5e2dd", fontSize: 12 }}
            />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: "#52514e" }} />
            <Bar dataKey="anterior" name="Año anterior" fill={ANTERIOR} radius={[4, 4, 0, 0]} maxBarSize={18} />
            <Bar dataKey="actual" name="Últimos 12 meses" fill={ACTUAL} radius={[4, 4, 0, 0]} maxBarSize={18} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <details className="mt-2 text-xs">
        <summary className="cursor-pointer text-texto-suave">Ver tabla</summary>
        <table className="mt-2 w-full text-right">
          <thead className="text-texto-suave"><tr><th className="text-left">Mes</th><th>Últimos 12 meses</th><th>Año anterior</th></tr></thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.etiqueta} className="border-t border-borde"><td className="py-1 text-left">{f.etiqueta}</td><td>{formatSoles(f.actual)}</td><td>{formatSoles(f.anterior)}</td></tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
