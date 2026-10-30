import { agenteReporte, type ContextoReporte } from "@/lib/agentes/reporte"
import { responder } from "@/lib/agentes/responder"

// POST /api/agentes/reporte · el agente que arma el reporte del lunes (lib/agentes/reporte.ts).
export async function POST(request: Request) {
  const contexto = (await request.json()) as ContextoReporte
  return responder(agenteReporte(contexto))
}
