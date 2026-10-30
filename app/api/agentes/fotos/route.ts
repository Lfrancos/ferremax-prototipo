import { agenteFotos, type ContextoFotos } from "@/lib/agentes/fotos"
import { responder } from "@/lib/agentes/responder"

// POST /api/agentes/fotos · el agente que lee las fotos de la entrega (lib/agentes/fotos.ts).
export async function POST(request: Request) {
  const contexto = (await request.json()) as ContextoFotos
  return responder(agenteFotos(contexto))
}
