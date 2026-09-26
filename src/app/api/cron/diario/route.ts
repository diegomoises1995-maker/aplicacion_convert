import { db } from "@/lib/db";
import { ejecutarTareasDiarias } from "@/server/tareas-diarias";

export const runtime = "nodejs";
export const maxDuration = 300;

// Vercel Cron envía «Authorization: Bearer <CRON_SECRET>».
export async function GET(req: Request) {
  const secreto = process.env.CRON_SECRET;
  if (!secreto || req.headers.get("authorization") !== `Bearer ${secreto}`) {
    return new Response("No autorizado", { status: 401 });
  }
  const resultado = await ejecutarTareasDiarias(db);
  return Response.json(resultado);
}
