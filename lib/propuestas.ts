import { fmtFechaHora, fmtRango } from "./fechas"
import { fmtCOP, fmtHoras, fmtNumero, fmtPct } from "./formato"
import { A_TIEMPO, CASOS_RESUELTOS, FICHA, INDICADOR_A } from "./rules"
import type { Pedido } from "./tipos"
import { alertas, alertasTransporte, asignacion, fechaSolicitud, listaDeAlistamiento, relojAprobacion, revisionSemanal } from "./vistas"

// PROPUESTAS IA (para discutir con los mentores).
// Estos textos se arman con plantillas sobre los mismos datos y reglas. Ninguno aprueba, rechaza ni prioriza.
// La nota de contexto y el resumen de la semana ya los redacta Claude (lib/agentes/ficha.ts y reporte.ts);
// estas plantillas quedan como lo que entregan esos agentes en modo ensayo. El borrador de aviso sigue siendo plantilla.

/** Momento 2 · Nota de contexto junto a la ficha. */
export function notaDeContexto(p: Pedido, pedidos: Pedido[]) {
  const otros = pedidos.filter((o) => o.cliente === p.cliente && o.id_pedido !== p.id_pedido)
  const lineas: string[] = []
  if (otros.length) {
    const promedio = otros.reduce((s, o) => s + o.valor_cop, 0) / otros.length
    const veces = p.valor_cop / promedio
    lineas.push(
      `${p.cliente} tiene ${otros.length} ${otros.length === 1 ? "pedido más" : "pedidos más"} en estos datos. Este vale ${fmtNumero(veces)} veces su promedio (COP ${fmtCOP(promedio)}).`,
    )
  } else {
    lineas.push(`No hay otros pedidos de ${p.cliente} en estos datos para comparar.`)
  }
  const casos = CASOS_RESUELTOS.filter((c) => c.fn(p) === true)
  if (casos.length) lineas.push(`Se parece a: ${casos.map((c) => c.titulo).join(" · ")}.`)
  return {
    lineas,
    falta: "Historial de pagos del cliente: no está en el extracto ni en el informe de cartera. [por definir]",
  }
}

/** Momento 5 · Aviso de la rutina, como borrador de WhatsApp o correo. */
export function borradorAviso(pedidos: Pedido[]) {
  const { aprobar, bodega } = alertas(pedidos)
  const partes: string[] = []
  for (const { pedido } of aprobar) {
    const a = asignacion(pedido)
    const r = relojAprobacion(pedido)
    const ficha = FICHA.fn(pedido)
    partes.push(
      [
        `Para: ${a.tipo === "incompleta" ? "Sandra Beltrán" : a.decide.join(" o ")}`,
        `${pedido.id_pedido} lleva ${r.actual} esperando (${r.palabra}).`,
        ...ficha.lineas.map((l) => `${l.rotulo}: ${l.valor}`),
        `Por qué le llegó: ${a.porque}`,
      ].join("\n"),
    )
  }
  if (bodega.length) {
    partes.push(
      [
        "Para: Nelson",
        "Pedidos de bodega cerca del tope o fuera de plazo:",
        ...bodega.map(({ pedido, reloj }) => `• ${pedido.id_pedido} · ${pedido.cliente} · ${reloj.actual} · ${reloj.palabra}`),
      ].join("\n"),
    )
  }
  const transporte = alertasTransporte(pedidos)
  if (transporte.length) {
    partes.push(
      [
        "Para: Nelson y Marcela",
        "Transporte, pedidos que piden una llamada:",
        ...transporte.map(({ pedido, palabra, que }) => `• ${pedido.id_pedido} · ${pedido.cliente} · ${palabra}: ${que}`),
      ].join("\n"),
    )
  }
  return partes
}

/** Momento 6 · Resumen narrativo de la semana. */
export function resumenSemana(pedidos: Pedido[]) {
  const r = revisionSemanal(pedidos)
  const lista = listaDeAlistamiento(pedidos)
  const pct = (v: number | null) => (v === null ? "[sin dato]" : fmtPct(v))
  return [
    `Semana del ${fmtRango(r.desde, r.hasta)}: ${r.semana.length} solicitudes de crédito.`,
    `Andrés aprobó en plazo ${r.a.detalle} de sus pedidos (${pct(r.a.valor)}; meta ${INDICADOR_A.valores!.meta_pct}%). Lo demás esperó en promedio ${r.b.valor === null ? "[sin dato]" : fmtHoras(r.b.valor)}.`,
    r.c.valor
      ? `Hubo ${r.c.valor} ${r.c.valor === 1 ? "aprobación" : "aprobaciones"} fuera de regla: ${r.fueraDeRegla.map((p) => `${p.id_pedido} (${p.cliente})`).join(", ")}.`
      : "No hubo aprobaciones fuera de regla.",
    r.paraEscalar.length
      ? `Para escalar hoy: ${r.paraEscalar.map((p) => p.id_pedido).join(", ")}.`
      : "No hay pedidos para escalar.",
    `De bodega salieron ${r.despachados.length} pedidos a crédito; ${r.aTiempo.detalle} en ${A_TIEMPO.valores!.dias} días o menos desde la orden (${pct(r.aTiempo.valor)}; meta ${A_TIEMPO.valores!.meta_pct}%).`,
    `La lista de mañana (${fmtFechaHora(lista.corte)}) trae ${lista.filas.length} pedidos.`,
    `Solicitud más antigua sin aprobar: ${
      r.sinAprobacion
        .filter((p) => !p.eventos.some((e) => e.accion === "rechazado"))
        .sort((a, b) => fechaSolicitud(a).localeCompare(fechaSolicitud(b)))
        .map((p) => `${p.id_pedido} (${fmtFechaHora(fechaSolicitud(p))})`)[0] ?? "ninguna"
    }.`,
  ]
}
