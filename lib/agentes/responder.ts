import Anthropic from "@anthropic-ai/sdk"
import type { Agente } from "./agente"
import { MODELO, correrAgente } from "./bucle"
import type { Linea } from "./tipos"

// Lo que hace cada ruta de app/api/agentes: correr el agente y mandar a la pantalla cada paso apenas pasa,
// una línea JSON por paso (NDJSON). Así la pantalla muestra el recorrido mientras ocurre.
// Sin ANTHROPIC_API_KEY corre el modo ensayo: las mismas herramientas, con lo que Claude "pensaría"
// y entregaría escrito de antemano. Sirve para ensayar la clase sin conexión ni costo.

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function correrEnsayo(agente: Agente, emitir: (l: Linea) => void) {
  const { pensando, consultas, entrega } = agente.ensayo
  const porNombre = new Map(agente.herramientas.map((h) => [h.definicion.name, h]))
  await espera(500)
  emitir({ tipo: "paso", paso: { tipo: "pensando", vuelta: 1, texto: pensando[0] } })
  const salidas: unknown[] = []
  for (const c of consultas) {
    await espera(350)
    const salida = porNombre.get(c.nombre)!.ejecutar(c.entrada)
    salidas.push(salida)
    emitir({ tipo: "paso", paso: { tipo: "herramienta", vuelta: 1, nombre: c.nombre, entrada: c.entrada, salida } })
  }
  await espera(600)
  emitir({ tipo: "paso", paso: { tipo: "pensando", vuelta: 2, texto: pensando[1] } })
  const resultado = entrega(salidas)
  emitir({ tipo: "paso", paso: { tipo: "herramienta", vuelta: 2, nombre: agente.entrega, entrada: resultado, salida: { recibido: true } } })
  return { resultado, vueltas: 2 }
}

export function responder(agente: Agente): Response {
  const conClave = !!process.env.ANTHROPIC_API_KEY
  const cuerpo = new ReadableStream<Uint8Array>({
    async start(control) {
      const emitir = (l: Linea) => control.enqueue(new TextEncoder().encode(JSON.stringify(l) + "\n"))
      emitir({ tipo: "inicio", modo: conClave ? "claude" : "ensayo", modelo: MODELO })
      try {
        const fin = conClave ? await correrAgente(agente, emitir) : await correrEnsayo(agente, emitir)
        emitir({ tipo: "fin", ...fin })
      } catch (e) {
        const mensaje =
          e instanceof Anthropic.AuthenticationError
            ? "La clave de API no es válida. Revisa ANTHROPIC_API_KEY en .env.local."
            : e instanceof Anthropic.RateLimitError
              ? "Claude está recibiendo demasiadas solicitudes. Prueba en un minuto."
              : e instanceof Anthropic.APIError
                ? `Error de la API (${e.status}): ${e.message}`
                : e instanceof Error
                  ? e.message
                  : "Error desconocido."
        emitir({ tipo: "error", mensaje })
      }
      control.close()
    },
  })
  return new Response(cuerpo, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } })
}
