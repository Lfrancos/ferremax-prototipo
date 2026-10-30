import { HOY } from "./data"
import { NUMERO_FERREMAX } from "./evidencia"
import { esAntes, fmtFechaHora, horasEntre, sumarHoras } from "./fechas"
import { fmtCOP, fmtDuracion } from "./formato"
import {
  AVISO_WHATSAPP,
  ENTRADA_A_LA_FILA,
  FIRMAR_PEDIDO,
  MOTIVO_ESCRITO,
  RELOJ_APROBACION,
  RESPUESTA_WHATSAPP,
  type Cadena,
  type Envio,
  type TipoEnvio,
} from "./rules"
import type { Evento, FechaHora, MensajeWhatsApp, Pedido, Persona } from "./tipos"
import {
  ETIQUETA_ESTADO,
  asignacion,
  decision,
  estadoActual,
  eventoDe,
  fechaSolicitud,
  resumenDecision,
  tramoDe,
} from "./vistas"

// AVISOS POR WHATSAPP AL APROBADOR (simulados).
//
// Aquí vive TODO lo que importa para la versión real, sin React y sin estado:
//   · cuándo toca avisar            → AVISO_WHATSAPP.fn (lib/rules.ts, NOT-1)
//   · qué se le escribe a cada uno  → avisosDe / textoAviso
//   · cómo se lee su respuesta      → RESPUESTA_WHATSAPP.fn (NOT-2) + resolverRespuesta
// La versión real cambia solo la entrada y la salida:
//   · salida: un proceso que corre cada minuto, llama a avisosDe y manda por Baileys lo que aún no se envió
//     (hay que guardar lo enviado: aquí se recalcula porque el prototipo no guarda nada);
//   · entrada: el evento "mensaje recibido" de Baileys llama a resolverRespuesta, con el mensaje citado
//     para saber de qué pedido habla. Si devuelve un evento, se guarda como cualquier otra decisión.
// Nada de este archivo manda un mensaje de verdad.

export { NUMERO_FERREMAX }

/** Quienes pueden recibir y responder avisos de aprobación. */
export const APROBADORES: Persona[] = ["Andrés Molina", "Marcela Ríos", "Sandra Beltrán"]

/** Celulares de muestra. En la versión real el sistema solo acepta respuestas de estos números. */
export const CELULARES: Partial<Record<Persona, string>> = {
  "Andrés Molina": "+57 300 555 0101",
  "Marcela Ríos": "+57 300 555 0102",
  "Sandra Beltrán": "+57 300 555 0103",
}

/** Cuándo entró la solicitud a la app: ahí sale el primer aviso. En SAP puede haberse registrado antes. */
export const entradaDe = (p: Pedido): FechaHora => eventoDe(p, "por_aprobar")?.fecha ?? fechaSolicitud(p)

/** A quién se le escribe. Si falta un dato nadie firma: se le avisa a Marcela, que lo pide (PER-4). */
export function destinatarios(p: Pedido): { para: Persona[]; soloInformar: boolean } {
  const a = asignacion(p)
  return a.decide.length ? { para: a.decide, soloInformar: false } : { para: ["Marcela Ríos"], soloInformar: true }
}

export interface AvisoWhatsApp {
  id: string
  fecha: FechaHora
  para: Persona
  id_pedido: string
  tipo: TipoEnvio | "cierre"
  texto: string
}

/** Quién queda por encima de quien aprueba (CRED-1.1). Incompleta y "decide Marcela" cuentan como Marcela sola. */
export function cadenaDe(p: Pedido): Cadena {
  const t = asignacion(p).tipo
  return t === "andres" ? "andres" : t === "marcela_o_sandra" ? "marcela_o_sandra" : "marcela_sola"
}

/** Las veces que quien aprueba pidió información: pausan los recordatorios. */
const infosDe = (p: Pedido) => p.eventos.filter((e) => e.accion === "info_pedida")

/** Los envíos de NOT-1 para un pedido hasta `hasta`, sin destinatario. */
export const enviosDe = (p: Pedido, hasta: FechaHora): Envio[] =>
  AVISO_WHATSAPP.fn(entradaDe(p), hasta, fechaSolicitud(p), { cadena: cadenaDe(p), infos: infosDe(p).map((e) => e.fecha) })

const RESPONDE = ["", "Responde:", "1 Aprobar + motivo", "2 Rechazar + motivo", "3 Info + qué falta"]

/** El texto de un aviso. Lo lee quien aprueba, así que lleva la ficha: no hay que abrir otra cosa para decidir. */
export function textoAviso(p: Pedido, e: Envio, avisados: Persona[], info?: Evento): string {
  const horas = horasEntre(fechaSolicitud(p), e.fecha)
  const tope = RELOJ_APROBACION.valores!.tope_h
  const max = AVISO_WHATSAPP.valores!.max_recordatorios
  const { para, soloInformar } = destinatarios(p)
  const encabezado = `${p.id_pedido} · ${p.cliente}`
  const lleva = `Lleva ${fmtDuracion(horas)} de ${tope} h.`

  if (e.tipo === "escalamiento" && cadenaDe(p) === "andres")
    return [
      "*Ferremax · Fuera de plazo*",
      encabezado,
      `Lleva ${fmtDuracion(horas)} sin decisión de ${para.join(" o ")} (el tope es de ${tope} h).`,
      "Llama hoy a quien aprueba (CRED-3.1).",
    ].join("\n")

  if (e.tipo === "escalamiento")
    return [
      "*Ferremax · Sin respuesta*",
      encabezado,
      `Se le avisó a ${avisados.join(" y ")} y no hay respuesta. ${lleva}`,
      "Necesitamos una respuesta hoy.",
    ].join("\n")

  if (e.tipo === "apoyo")
    return [
      "*Ferremax · Ayuda a ubicar*",
      encabezado,
      `${para.join(" y ")} lleva ${fmtDuracion(horas)} sin responder. Si la ves, avísale. No te toca aprobar.`,
      lleva,
    ].join("\n")

  if (e.tipo === "info")
    return [
      "*Ferremax · Piden información*",
      encabezado,
      `${info?.quien ?? "Quien aprueba"} pidió información: «${info?.motivo ?? "sin detalle"}».`,
      "Consíguela y avísale. El plazo sigue corriendo.",
      lleva,
    ].join("\n")

  if (soloInformar)
    return [
      `*Ferremax · ${e.tipo === "inicial" ? "Solicitud incompleta" : `Recordatorio ${e.n} de ${max}`}*`,
      encabezado,
      asignacion(p).porque,
      `Lleva ${fmtDuracion(horas)}. Nadie firma hasta que llegue el dato.`,
    ].join("\n")

  const r = resumenDecision(p)
  const titulo = e.tipo === "inicial" ? "Pedido por aprobar" : `Recordatorio ${e.n} de ${max} · sin decisión`
  return [
    `*Ferremax · ${titulo}*`,
    encabezado,
    `Pedido: COP ${fmtCOP(r.pedido)}`,
    `Cupo: ${r.cupoDisponible === null ? "[en blanco]" : `COP ${fmtCOP(r.cupoDisponible)}`} disponible de ${fmtCOP(r.cupoAutorizado)}`,
    `Saldo vencido: ${r.saldoVencido === null ? "[en blanco]" : `COP ${fmtCOP(r.saldoVencido)}`}`,
    r.condiciones.length ? `Condición: ${r.condiciones.join(" · ")}` : "Condición: pasa los cuatro chequeos",
    ...r.informacion,
    lleva,
    ...RESPONDE,
  ].join("\n")
}

/** A quién le llega cada tipo de envío. Quien ya recibe el aviso por ser aprobador no lo recibe dos veces. */
function destinoDe(e: Envio, p: Pedido, infos: Evento[]): Persona[] {
  const { para } = destinatarios(p)
  switch (e.tipo) {
    case "inicial":
    case "recordatorio":
      return para
    case "apoyo":
      return para.includes("Sandra Beltrán") ? [] : ["Sandra Beltrán"]
    case "info":
      return [infos[e.n - 1]?.quien === "Sandra Beltrán" ? "Marcela Ríos" : "Sandra Beltrán"]
    case "escalamiento": {
      const alto: Persona = cadenaDe(p) === "andres" ? "Marcela Ríos" : "Andrés Molina"
      return para.includes(alto) ? [] : [alto]
    }
  }
}

/**
 * Los mensajes que el sistema habría mandado hasta `ahora` para un pedido, ya con su destinatario.
 * Solo hay avisos para lo que está por aprobar y para lo que se decidió durante la demo: lo anterior a hoy es historia.
 */
export function avisosDe(p: Pedido, ahora: FechaHora = HOY): AvisoWhatsApp[] {
  const d = decision(p)
  if (tramoDe(p) !== "aprobar" && (!d || esAntes(d.fecha, HOY))) return []
  const hasta = d && esAntes(d.fecha, ahora) ? d.fecha : ahora
  const infos = infosDe(p)

  const avisos: AvisoWhatsApp[] = []
  const avisados: Persona[] = []
  for (const e of enviosDe(p, hasta)) {
    const destino = destinoDe(e, p, infos)
    for (const persona of destino)
      avisos.push({
        id: `${p.id_pedido}:${e.tipo}${e.n}:${persona}`,
        fecha: e.fecha,
        para: persona,
        id_pedido: p.id_pedido,
        tipo: e.tipo,
        texto: textoAviso(p, e, avisados, infos[e.n - 1]),
      })
    for (const persona of destino) if (!avisados.includes(persona)) avisados.push(persona)
  }

  // Cuando uno decide, a todos los demás que se avisó se les dice quién fue.
  if (d && !esAntes(ahora, d.fecha))
    for (const persona of avisados.filter((x) => x !== d.quien))
      avisos.push({
        id: `${p.id_pedido}:cierre:${persona}`,
        fecha: d.fecha,
        para: persona,
        id_pedido: p.id_pedido,
        tipo: "cierre",
        texto: [
          "*Ferremax · Ya está resuelto*",
          `${p.id_pedido} · ${p.cliente}`,
          `${ETIQUETA_ESTADO[d.accion as "aprobado"]} por ${d.quien}. No hace falta que respondas.`,
        ].join("\n"),
      })
  return avisos
}

/** El próximo envío que le toca a un pedido que sigue por aprobar. null si ya no hay. */
export function proximoAviso(p: Pedido, ahora: FechaHora = HOY): { fecha: FechaHora; tipo: TipoEnvio } | null {
  if (tramoDe(p) !== "aprobar") return null
  const siguiente = enviosDe(p, sumarHoras(ahora, 72)).find((e) => esAntes(ahora, e.fecha))
  return siguiente ? { fecha: siguiente.fecha, tipo: siguiente.tipo } : null
}

export interface Burbuja {
  id: string
  fecha: FechaHora
  /** "salida": Ferremax le escribe a la persona. "entrada": la persona le escribe a Ferremax. */
  sentido: "entrada" | "salida"
  texto: string
  id_pedido: string | null
  tipo?: AvisoWhatsApp["tipo"]
}

/** El chat de una persona con Ferremax: los avisos que le tocaron más lo que ella escribió y lo que se le contestó. */
export function conversacion(persona: Persona, pedidos: Pedido[], mensajes: MensajeWhatsApp[], ahora: FechaHora = HOY): Burbuja[] {
  const avisos = pedidos
    .flatMap((p) => avisosDe(p, ahora))
    .filter((a) => a.para === persona)
    .map((a): Burbuja & { orden: number } => ({
      id: a.id,
      fecha: a.fecha,
      sentido: "salida",
      texto: a.texto,
      id_pedido: a.id_pedido,
      tipo: a.tipo,
      orden: 0,
    }))
  const propios = mensajes.filter((m) => m.persona === persona).map((m) => ({ ...m, orden: 1 }))
  return [...avisos, ...propios].sort((a, b) => a.fecha.localeCompare(b.fecha) || a.orden - b.orden || a.id.localeCompare(b.id))
}

export interface ResultadoRespuesta {
  /** La decisión que se registra. Sin evento, solo se contesta. */
  evento?: Evento
  /** Lo que el sistema contesta en el chat. */
  respuestas: string[]
}

/**
 * Qué pasa cuando `persona` responde `texto` a un aviso de `p`. Es la misma validación del botón de la app:
 * solo firma quien asigna la tabla (PER-4), con motivo escrito (CRED-4.3), y solo si el pedido sigue por aprobar.
 */
export function resolverRespuesta(p: Pedido, persona: Persona, texto: string, ahora: FechaHora = HOY): ResultadoRespuesta {
  if (tramoDe(p) !== "aprobar") {
    const d = decision(p)
    return {
      respuestas: [
        `Ya está resuelto: ${ETIQUETA_ESTADO[estadoActual(p)].toLowerCase()}${d ? ` por ${d.quien} (${fmtFechaHora(d.fecha)})` : ""}. Tu respuesta no cambia nada.`,
      ],
    }
  }

  const t = RESPUESTA_WHATSAPP.fn(texto)
  if (t.tipo === "no_entendido")
    return { respuestas: ["No entendí. Responde 1 Aprobar, 2 Rechazar o 3 Info, seguido del motivo. Ejemplo: «1 Cliente al día, cabe en el cupo»."] }

  const a = asignacion(p)
  const permiso = FIRMAR_PEDIDO.fn(persona, a)
  if (!(t.accion === "info_pedida" ? permiso.pedirDato : permiso.firmar))
    return {
      respuestas: [
        a.tipo === "incompleta"
          ? "Falta un dato y nadie firma hasta que llegue. Lo pide Marcela."
          : `Este pedido lo aprueba ${a.texto}. Tu respuesta no se registra (CRED-1.1, PER-4).`,
      ],
    }

  if (t.tipo === "falta_motivo")
    return { respuestas: [`Falta el motivo (CRED-4.3). ${MOTIVO_ESCRITO.texto} Ejemplo: «1 Cliente al día, cabe en el cupo».`] }

  const hecho = {
    aprobado: `Aprobado. Entra a la lista de bodega del ${fmtFechaHora(ENTRADA_A_LA_FILA.fn(ahora))}`,
    rechazado: "Rechazado. Queda en el historial con tu motivo.",
    info_pedida: `Anotado. Le avisamos a Sandra para que consiga el dato. Tus recordatorios se pausan ${AVISO_WHATSAPP.valores!.pausa_info_h} h; el plazo de ${RELOJ_APROBACION.valores!.tope_h} h sigue corriendo.`,
  }[t.accion]
  return {
    evento: { accion: t.accion, fecha: ahora, quien: persona, motivo: t.motivo, via: "WhatsApp" },
    respuestas: [`✅ ${p.id_pedido}: ${hecho}`],
  }
}
