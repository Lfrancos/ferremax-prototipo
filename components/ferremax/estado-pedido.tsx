"use client"

import type { Pedido } from "@/lib/tipos"
import { ETIQUETA_ESTADO, asignacion, estadoActual, fueraDeRegla, tramoDe } from "@/lib/vistas"
import { Estado } from "./estado"

/** Estado del flujo, con la marca de la regla cuando aplica. */
export function EstadoPedido({ pedido }: { pedido: Pedido }) {
  const e = estadoActual(pedido)
  if (e === "rechazado") return <Estado clase="rechazado" palabra="Rechazado" />
  if (fueraDeRegla(pedido)) return <Estado clase="fuera-regla" palabra={`${ETIQUETA_ESTADO[e]} · fuera de regla`} />
  const a = asignacion(pedido)
  if (tramoDe(pedido) === "aprobar" && a.tipo === "incompleta") return <Estado clase="incompleta" palabra="Incompleta" />
  if (tramoDe(pedido) === "aprobar" && a.tipo === "decide_marcela") return <Estado clase="incompleta" palabra="Caso gris" />
  return <span>{ETIQUETA_ESTADO[e]}</span>
}
