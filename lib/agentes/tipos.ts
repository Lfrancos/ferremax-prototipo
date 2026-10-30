import type { FechaHora, Persona } from "../tipos"

// Lo que viaja entre la ruta del servidor (app/api/agentes) y la pantalla. Sin el SDK: esto lo importa el navegador.

export type AgenteId = "ficha" | "fotos" | "reporte"

/** "claude": hay clave de API y responde Claude. "ensayo": sin clave, mismas herramientas y un texto de plantilla. */
export type Modo = "claude" | "ensayo"

/** Un paso del agente, en el orden en que pasó. */
export type Paso =
  | { tipo: "pensando"; vuelta: number; texto: string }
  | { tipo: "texto"; vuelta: number; texto: string }
  | { tipo: "herramienta"; vuelta: number; nombre: string; entrada: unknown; salida: unknown; error?: boolean }

/** Cada línea del stream (NDJSON) que manda la ruta. */
export type Linea =
  | { tipo: "inicio"; modo: Modo; modelo: string }
  | { tipo: "paso"; paso: Paso }
  | { tipo: "fin"; resultado: unknown; vueltas: number; tokens?: { entrada: number; salida: number } }
  | { tipo: "error"; mensaje: string }

/** Una vez que trabajó un agente: lo que hizo y lo que entregó. Queda en el almacén de la sesión. */
export interface Corrida {
  agente: AgenteId
  /** Sobre qué trabajó: el pedido, el mensaje o la semana. */
  clave: string
  modo: Modo
  modelo: string
  pasos: Paso[]
  /** Lo que entregó con su herramienta de entrega. null: terminó sin entregar. */
  resultado: unknown
  vueltas: number
  tokens?: { entrada: number; salida: number }
  pidio: Persona
  fecha: FechaHora
}

// Lo que entrega cada agente (la entrada de su herramienta de entrega).

export interface NotaFicha {
  nota: string[]
  mirar: string[]
  falta: string[]
}

export interface LecturaFotos {
  producto: "si" | "no" | "borrosa"
  bultos: number | null
  documento: "si" | "no" | "borrosa"
  remision: string | null
  nombre: string | null
  firma: boolean | null
  novedad: string | null
  es_de_este_pedido: boolean | null
  observaciones: string[]
}

export interface ReporteSemana {
  titulo: string
  resumen: string[]
  bien: string[]
  preocupa: string[]
  ideas: { idea: string; por_que: string; quien_decide: string }[]
  preguntas: string[]
}
