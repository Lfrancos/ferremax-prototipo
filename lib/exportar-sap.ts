import { escribirCSV } from "./carga/csv"
import { horasEntre, nombreDia } from "./fechas"
import type { Evento, FechaHora, PedidoRegistro } from "./tipos"

// DE VUELTA A SAP. La aprobación se da en la app, pero tiene que quedar en SAP. Esto arma el archivo que se pasa a SAP
// con las decisiones tomadas aquí, en el mismo formato del archivo de aprobaciones de SAP (03_aprobaciones_credito.csv):
// lo que antes llegaba de SAP ahora sale de la app.
// Cada exportación es un lote (EXP-001, EXP-002…) y un pedido sale en un solo lote: exportar otra vez no lo duplica.
// Las decisiones que ya venían de SAP (via "SAP") no se exportan: SAP ya las tiene.

export const COLUMNAS_SAP = [
  "id_pedido",
  "solicitud_at",
  "decision_at",
  "aprobador",
  "horas_espera",
  "dia_solicitud",
  "valor_pedido_cop",
  "resultado",
] as const

export type ResultadoSAP = "Aprobado" | "Rechazado"

/** Una decisión tomada en la app, lista para SAP. */
export interface DecisionSAP {
  id_pedido: string
  solicitud: FechaHora
  decision: FechaHora
  aprobador: string
  horas: number
  valor_cop: number
  resultado: ResultadoSAP
  motivo?: string
  /** Por dónde se decidió: en la app o respondiendo el WhatsApp. */
  via: "App" | "WhatsApp"
}

/** Un archivo que se sacó para SAP: quién, cuándo y qué pedidos llevaba. */
export interface Exportacion {
  id: string
  fecha: FechaHora
  quien: string
  pedidos: string[]
}

const decisionDe = (eventos: Evento[]) => eventos.find((e) => e.accion === "aprobado" || e.accion === "rechazado")

/** Las decisiones tomadas en la app, de la más antigua a la más reciente. */
export function decisionesParaSAP(registros: Pick<PedidoRegistro, "id_pedido" | "valor_cop" | "eventos">[]): DecisionSAP[] {
  return registros
    .flatMap((r) => {
      const d = decisionDe(r.eventos)
      const solicitud = r.eventos.find((e) => e.accion === "solicitado")
      if (!d || !solicitud || d.via === "SAP") return []
      return [
        {
          id_pedido: r.id_pedido,
          solicitud: solicitud.fecha,
          decision: d.fecha,
          aprobador: d.quien,
          horas: Math.round(horasEntre(solicitud.fecha, d.fecha) * 10) / 10,
          valor_cop: r.valor_cop,
          resultado: d.accion === "aprobado" ? ("Aprobado" as const) : ("Rechazado" as const),
          motivo: d.motivo,
          via: d.via === "WhatsApp" ? ("WhatsApp" as const) : ("App" as const),
        },
      ]
    })
    .sort((a, b) => a.decision.localeCompare(b.decision))
}

/** El lote en el que salió un pedido, si ya salió. */
export const loteDe = (id_pedido: string, exportaciones: Exportacion[]) => exportaciones.find((x) => x.pedidos.includes(id_pedido))

/** Lo que falta pasar a SAP: decidido en la app y en ningún lote. */
export const pendientesDeExportar = (decisiones: DecisionSAP[], exportaciones: Exportacion[]) =>
  decisiones.filter((d) => !loteDe(d.id_pedido, exportaciones))

/** "2026-11-30T09:05" → "2026-11-30 09:05:00", como lo escribe SAP. */
const momentoSAP = (f: FechaHora) => `${f.replace("T", " ")}:00`

export function csvParaSAP(decisiones: DecisionSAP[]): string {
  return escribirCSV(
    [...COLUMNAS_SAP],
    decisiones.map((d) => [
      d.id_pedido,
      momentoSAP(d.solicitud),
      momentoSAP(d.decision),
      d.aprobador,
      String(d.horas),
      nombreDia(d.solicitud),
      String(d.valor_cop),
      d.resultado,
    ]),
  )
}

/** El siguiente número de lote. EXP-000 es lo que ya se había pasado antes de la demostración. */
export const siguienteLote = (exportaciones: Exportacion[]) => `EXP-${String(exportaciones.length).padStart(3, "0")}`

/** Al abrir la demostración, lo decidido hasta el viernes ya se pasó a SAP; lo del fin de semana y de hoy está pendiente. */
export function exportacionInicial(registros: PedidoRegistro[], hasta: FechaHora): Exportacion {
  return {
    id: "EXP-000",
    fecha: hasta,
    quien: "Sandra Beltrán",
    pedidos: decisionesParaSAP(registros)
      .filter((d) => d.decision < hasta)
      .map((d) => d.id_pedido),
  }
}
