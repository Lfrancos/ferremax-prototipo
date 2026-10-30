import type Anthropic from "@anthropic-ai/sdk"
import type { AgenteId } from "./tipos"

// LA FORMA DE UN AGENTE. Un agente es cuatro cosas:
//   1. un sistema: quién es y qué no puede hacer;
//   2. unas herramientas: lo único con lo que puede tocar los datos (aquí, solo leer);
//   3. una herramienta de entrega: cuando la llama, terminó;
//   4. lo que se le pide: el primer mensaje.
// El ciclo que lo hace trabajar está en bucle.ts y es el mismo para los tres agentes.
// Aquí solo se importan tipos del SDK: la pantalla también lee estas definiciones para mostrar las herramientas.

export interface Herramienta {
  definicion: Anthropic.Tool
  /** Lo que hace la app cuando Claude la pide. Recibe la entrada que escribió Claude y devuelve lo que se le contesta. */
  ejecutar: (entrada: Record<string, unknown>) => unknown
}

export interface Agente {
  id: AgenteId
  sistema: string
  herramientas: Herramienta[]
  /** El nombre de la herramienta con la que entrega. */
  entrega: string
  /** Cuánto piensa antes de responder. Menos esfuerzo, más rápido. */
  esfuerzo: "low" | "medium" | "high"
  /** Tope de vueltas del ciclo, por si nunca entrega. */
  maxVueltas: number
  pedido: Anthropic.MessageParam["content"]
  /** Sin clave de API: lo que piensa, qué herramientas llama y qué entrega, con las mismas herramientas. */
  ensayo: {
    pensando: [string, string]
    consultas: { nombre: string; entrada: Record<string, unknown> }[]
    /** Con lo que devolvieron las consultas, lo que entrega (texto de plantilla). */
    entrega: (salidas: unknown[]) => Record<string, unknown>
  }
}

type Propiedad = Record<string, unknown>

/** Una herramienta con su esquema estricto: Claude solo puede llamarla con exactamente estos campos. */
export function herramienta(nombre: string, descripcion: string, propiedades: Record<string, Propiedad> = {}): Anthropic.Tool {
  return {
    name: nombre,
    description: descripcion,
    strict: true,
    input_schema: { type: "object", properties: propiedades, required: Object.keys(propiedades), additionalProperties: false },
  }
}

export const lista = (descripcion: string): Propiedad => ({ type: "array", items: { type: "string" }, description: descripcion })
export const texto = (descripcion: string): Propiedad => ({ type: "string", description: descripcion })
/** Un campo que puede venir vacío (null): un tipo o null. */
export const oNulo = (tipo: "string" | "integer" | "boolean", descripcion: string): Propiedad => ({ anyOf: [{ type: tipo }, { type: "null" }], description: descripcion })
export const textoONulo = (descripcion: string) => oNulo("string", descripcion)
