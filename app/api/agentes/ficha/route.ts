import { agenteFicha, type ContextoFicha } from "@/lib/agentes/ficha"
import { responder } from "@/lib/agentes/responder"

// POST /api/agentes/ficha · el agente que prepara la nota de contexto (lib/agentes/ficha.ts).
export async function POST(request: Request) {
  const contexto = (await request.json()) as ContextoFicha
  return responder(agenteFicha(contexto))
}
