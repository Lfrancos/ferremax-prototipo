import Anthropic from "@anthropic-ai/sdk"
import { LO_QUE_HACE_CLAUDE } from "../rules"
import type { Agente } from "./agente"
import type { Linea } from "./tipos"

// EL CICLO DE UN AGENTE. Es lo que se muestra en clase: unas 50 líneas y el mismo para los tres agentes.
//
//   1. Se le manda a Claude lo que se le pide, sus herramientas y lo que ya pasó.
//   2. Claude piensa y responde. Si pide herramientas (stop_reason "tool_use"), la app las ejecuta
//      y le devuelve los resultados. Vuelve al paso 1.
//   3. Cuando llama a la herramienta de entrega, terminó: lo que escribió ahí es el resultado.
//
// Corre solo en el servidor (app/api/agentes): la clave de API nunca llega al navegador.
// Versión corta para producción: el Tool Runner del SDK (client.beta.messages.toolRunner) hace este mismo
// ciclo solo. Aquí se escribe a mano para que se vea cada vuelta.

export const MODELO = "claude-opus-5-5"

export async function correrAgente(agente: Agente, emitir: (l: Linea) => void) {
  const client = new Anthropic() // Lee ANTHROPIC_API_KEY del entorno (.env.local).
  const porNombre = new Map(agente.herramientas.map((h) => [h.definicion.name, h]))
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: agente.pedido }]
  const tokens = { entrada: 0, salida: 0 }

  for (let vuelta = 1; vuelta <= agente.maxVueltas; vuelta++) {
    // 1 · Claude piensa y responde.
    const respuesta = await client.messages.create({
      model: MODELO,
      max_tokens: 16000,
      system: agente.sistema,
      thinking: { type: "adaptive", display: "summarized" },
      output_config: { effort: agente.esfuerzo },
      tools: agente.herramientas.map((h) => h.definicion),
      messages,
    })
    tokens.entrada += respuesta.usage.input_tokens
    tokens.salida += respuesta.usage.output_tokens

    for (const b of respuesta.content) {
      if (b.type === "thinking" && b.thinking) emitir({ tipo: "paso", paso: { tipo: "pensando", vuelta, texto: b.thinking } })
      if (b.type === "text" && b.text.trim()) emitir({ tipo: "paso", paso: { tipo: "texto", vuelta, texto: b.text } })
    }

    // Si no pidió herramientas, terminó sin entregar (o se negó: stop_reason "refusal").
    if (respuesta.stop_reason !== "tool_use") return { resultado: null, vueltas: vuelta, tokens }

    // 2 · La app ejecuta cada herramienta que pidió y le devuelve lo que salió.
    messages.push({ role: "assistant", content: respuesta.content })
    const resultados: Anthropic.ToolResultBlockParam[] = []
    let entregado: unknown = undefined

    for (const uso of respuesta.content) {
      if (uso.type !== "tool_use") continue
      const h = porNombre.get(uso.name)
      // Lo que no está en la lista no se ejecuta (PER-9). Con estas herramientas nunca pasa: es la defensa.
      const permitida = h && LO_QUE_HACE_CLAUDE.fn(uso.name)
      const salida = permitida ? h.ejecutar(uso.input as Record<string, unknown>) : { error: `La herramienta ${uso.name} no existe.` }
      emitir({ tipo: "paso", paso: { tipo: "herramienta", vuelta, nombre: uso.name, entrada: uso.input, salida, error: !permitida || undefined } })
      if (uso.name === agente.entrega) entregado = uso.input
      resultados.push({ type: "tool_result", tool_use_id: uso.id, content: JSON.stringify(salida), is_error: !permitida || undefined })
    }

    // 3 · Si entregó, terminó.
    if (entregado !== undefined) return { resultado: entregado, vueltas: vuelta, tokens }
    messages.push({ role: "user", content: resultados })
  }
  throw new Error(`El agente no entregó en ${agente.maxVueltas} vueltas.`)
}
