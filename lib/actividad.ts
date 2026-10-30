import type { Carga } from "./carga/base"
import type { Exportacion } from "./exportar-sap"
import type { Accion, CambioRegla, Cliente, CorteCartera, Evento, FechaHora, MensajeTransporte, MensajeWhatsApp, PedidoRegistro, Persona } from "./tipos"
import { NOMBRE_ACCION } from "./vistas"

// REGISTRO DE ACTIVIDAD: quién hizo qué y cuándo, todo junto y en orden, para auditar.
// Cada pantalla sigue mostrando lo suyo (el historial del pedido, las cargas, los archivos para SAP,
// los cambios de reglas, el chat de WhatsApp); aquí está todo en una sola lista.
// Solo se agrega: ninguna línea se edita ni se borra. Los correos salen de estas líneas (lib/correos.ts).
// La hora de la demo está fija (HOY), así que el orden lo da `n`, no la fecha.
// En producción es una tabla `actividad` append-only (README · Para producción · Correo y registro de actividad).

export type TipoActividad = "pedido" | "transporte" | "whatsapp" | "carga" | "sap" | "cliente" | "regla" | "seguimiento" | "ia" | "correo"

export const TIPOS_ACTIVIDAD: Record<TipoActividad, string> = {
  pedido: "Pedidos",
  transporte: "Transporte",
  whatsapp: "WhatsApp",
  carga: "Cargas de SAP",
  sap: "Archivos para SAP",
  cliente: "Clientes y cartera",
  regla: "Reglas",
  seguimiento: "Seguir un pedido",
  ia: "Claude",
  correo: "Correos enviados a mano",
}

export interface Actividad {
  /** Orden de llegada. Es lo que se audita: no hay dos líneas con el mismo número. */
  n: number
  fecha: FechaHora
  /** Una persona, "Sistema", "Transportadora", "Claude" o "Demostración". */
  quien: string
  tipo: TipoActividad
  que: string
  detalle?: string
  id_pedido?: string
  /** El detalle es información de crédito: no lo ve quien no tiene PER-1. */
  credito?: boolean
  /** Lo que se referencia: la carga, el lote, la regla, el mensaje. */
  ref?: string
  /** El archivo que va con el correo de esta línea. */
  adjunto?: string
  /** En "seguimiento": si empezó o dejó de seguir el pedido. */
  sigue?: boolean
  /** En "correo": lo que se mandó. */
  correo?: { para: Persona[]; asunto: string; cuerpo: string[] }
}

export type NuevaActividad = Omit<Actividad, "n">

/** Decisiones de crédito: su motivo es información de crédito (PER-1). */
export const DE_CREDITO = new Set<Accion>(["aprobado", "rechazado", "info_pedida"])

const DE_TRANSPORTE = new Set<Accion>(["entregado", "evidencia_recibida", "evidencia_pedida", "evidencia_aceptada"])

export const numerar = (nuevas: NuevaActividad[], ultimo: number): Actividad[] => nuevas.map((a, i) => ({ ...a, n: ultimo + i + 1 }))

// ── Una línea por cada cosa que pasa ────────────────────────────────────────────

export const deEvento = (id_pedido: string, e: Evento): NuevaActividad => ({
  fecha: e.fecha,
  quien: e.quien,
  tipo: DE_TRANSPORTE.has(e.accion) ? "transporte" : "pedido",
  que: NOMBRE_ACCION[e.accion] + (e.via ? ` por ${e.via}` : ""),
  detalle: e.motivo,
  id_pedido,
  credito: DE_CREDITO.has(e.accion) || undefined,
  ref: e.ref,
})

/** Los eventos que se agregaron a los pedidos entre un estado y el siguiente. Un pedido sin cambios es el mismo objeto. */
export function eventosNuevos(antes: PedidoRegistro[], despues: PedidoRegistro[]): NuevaActividad[] {
  if (antes === despues) return []
  const previos = new Map(antes.map((r) => [r.id_pedido, r]))
  return despues.flatMap((r) => {
    const p = previos.get(r.id_pedido)
    return p === r ? [] : r.eventos.slice(p?.eventos.length ?? 0).map((e) => deEvento(r.id_pedido, e))
  })
}

export function deCarga(c: Carga): NuevaActividad {
  const archivos = c.archivos.map((a) => `${a.nombre}: ${a.nuevas} nuevas, ${a.actualizadas} actualizadas, ${a.iguales} iguales, ${a.apartadas} apartadas`)
  return {
    fecha: c.fecha,
    quien: c.quien,
    tipo: "carga",
    que: `Guardó la carga ${c.id}`,
    detalle: [...archivos, ...c.notas].join(" · "),
    ref: c.id,
    adjunto: c.apartadas.length ? `apartadas_${c.id}.csv` : undefined,
  }
}

export const deLote = (l: Exportacion): NuevaActividad => ({
  fecha: l.fecha,
  quien: l.quien,
  tipo: "sap",
  que: `Descargó el archivo para SAP ${l.id}`,
  detalle: `${l.pedidos.length} ${l.pedidos.length === 1 ? "decisión" : "decisiones"}: ${l.pedidos.join(", ")}`,
  ref: l.id,
  adjunto: `aprobaciones_para_SAP_${l.id}.csv`,
})

export const deCambioRegla = (c: CambioRegla): NuevaActividad => ({
  fecha: c.fecha,
  quien: c.quien,
  tipo: "regla",
  que: `Cambió ${c.regla} · ${c.clave}: ${c.antes} → ${c.despues}`,
  detalle: `Motivo: ${c.motivo}`,
  ref: c.regla,
})

export const deWhatsApp = (m: MensajeWhatsApp): NuevaActividad => ({
  fecha: m.fecha,
  quien: m.sentido === "entrada" ? m.persona : "Sistema",
  tipo: "whatsapp",
  que: m.sentido === "entrada" ? "Escribió por WhatsApp" : `Le contestó por WhatsApp a ${m.persona}`,
  detalle: m.texto,
  id_pedido: m.id_pedido ?? undefined,
  // Quien responde un aviso escribe el motivo de su decisión.
  credito: true,
  ref: m.id,
})

export const deMensajeSinPedido = (m: MensajeTransporte): NuevaActividad => ({
  fecha: m.fecha,
  quien: "Transportadora",
  tipo: "transporte",
  que: `Llegó un mensaje sin pedido (${m.canal})`,
  detalle: `${m.de} · ${m.celular} · "${m.texto}"`,
  ref: m.id,
})

export const deAsociacion = (m: MensajeTransporte, quien: string): NuevaActividad => ({
  fecha: m.fecha,
  quien,
  tipo: "transporte",
  que: `Asoció el mensaje ${m.id} al pedido`,
  id_pedido: m.id_pedido ?? undefined,
  ref: m.id,
})

export const deCliente = (c: Cliente, quien: string, fecha: FechaHora): NuevaActividad => ({
  fecha,
  quien,
  tipo: "cliente",
  que: `Creó el cliente ${c.id_cliente}`,
  detalle: `${c.razon_social} · NIT ${c.nit}`,
  ref: c.id_cliente,
})

export const deCorte = (c: CorteCartera): NuevaActividad => ({
  fecha: c.corte,
  quien: c.importo,
  tipo: "cliente",
  que: "Importó un corte de cartera",
  detalle: `${c.archivo} · ${c.partidas.length} partidas abiertas`,
})

export const deSeguimiento = (id_pedido: string, persona: Persona, sigue: boolean, fecha: FechaHora): NuevaActividad => ({
  fecha,
  quien: persona,
  tipo: "seguimiento",
  que: sigue ? "Empezó a seguir el pedido por correo" : "Dejó de seguir el pedido",
  id_pedido,
  sigue,
})

/** El registro al abrir la demo: lo que ya había pasado, ordenado por fecha. */
export function actividadInicial(registros: PedidoRegistro[], cargas: Carga[], lotes: Exportacion[], mensajes: MensajeTransporte[]): Actividad[] {
  const lineas = [
    ...registros.flatMap((r) => r.eventos.map((e) => deEvento(r.id_pedido, e))),
    ...cargas.map(deCarga),
    ...lotes.map(deLote),
    ...mensajes.filter((m) => !m.id_pedido).map(deMensajeSinPedido),
  ].sort((a, b) => a.fecha.localeCompare(b.fecha))
  return numerar(lineas, 0)
}

// ── Lecturas ────────────────────────────────────────────────────────────────────

/** Quiénes siguen un pedido ahora: la última línea de cada persona dice si sigue o no. */
export function seguidoresDe(actividad: Actividad[], id_pedido: string): Persona[] {
  const sigue = new Map<Persona, boolean>()
  for (const a of actividad) if (a.tipo === "seguimiento" && a.id_pedido === id_pedido) sigue.set(a.quien as Persona, !!a.sigue)
  return [...sigue].filter(([, s]) => s).map(([p]) => p)
}
