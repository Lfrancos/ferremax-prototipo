import { HITOS_FACTURA, HOY } from "./data"
import { leerMensaje, remisionDe } from "./evidencia"
import { diasCalendario, esAntes } from "./fechas"
import { fmtDias } from "./formato"
import { ENTRADA_A_LA_FILA, REMISION_SIN_FIRMA } from "./rules"
import type { CorteCartera, FechaHora, HitoDocumento, PartidaAbierta, Pedido } from "./tipos"
import { aprobacion, entregaDe, eventoDe } from "./vistas"

// LA HISTORIA DE UN DOCUMENTO: la remisión y la factura de un pedido, con qué pasó, cuándo y quién.
// La remisión se arma casi toda con lo que ya sabe la app (aprobación, lista, salida, fotos del conductor).
// La factura combina lo que reportaría SAP (HITOS_FACTURA en lib/data.ts) con la entrega y el corte de cartera.

export const hrefRemision = (id_pedido: string) => `/remisiones/${remisionDe(id_pedido)}`
export const hrefFactura = (documento: string) => `/facturas/${documento}`

export { pedidoDeRemision } from "./evidencia"

/** La factura de un pedido, si el último corte de cartera la trae. */
export const facturaDe = (id_pedido: string, cartera: CorteCartera): PartidaAbierta | null =>
  cartera.partidas.find((p) => p.tipo === "Factura" && p.id_pedido === id_pedido) ?? null

// ── Remisión ────────────────────────────────────────────────────────────────────

/** Qué pasó con la remisión de un pedido, de que sale de SAP a que vuelve firmada. */
export function trazaRemision(p: Pedido): HitoDocumento[] {
  const hitos: HitoDocumento[] = []
  const rem = remisionDe(p.id_pedido)
  const ap = aprobacion(p)
  const listo = ap?.fecha

  hitos.push({
    que: "SAP genera la remisión",
    fecha: ap?.fecha ?? null,
    quien: "SAP",
    actor: "SAP",
    estado: ap ? "hecho" : "pendiente",
    detalle: ap
      ? `${rem} sale con la aprobación del crédito (${ap.quien}). ${REMISION_SIN_FIRMA.texto.split(". ")[1] ?? ""}`.trim()
      : "Todavía no existe: sale cuando se aprueba el crédito.",
  })

  const alistamiento = eventoDe(p, "en_alistamiento")
  const entra = listo ? ENTRADA_A_LA_FILA.fn(listo) : null
  hitos.push({
    que: "Entra en la lista de alistamiento",
    fecha: alistamiento?.fecha ?? entra,
    quien: "Sistema",
    actor: "Sistema",
    estado: alistamiento ? "hecho" : "pendiente",
    detalle: "La lista de las 7:00 a. m. trae lo aprobado el día anterior. Bodega alista contra esta remisión.",
  })

  const salida = eventoDe(p, "despachado")
  if (salida && p.despacho) {
    const e = entregaDe(p)!
    hitos.push({
      que: "Nelson entrega a transporte",
      fecha: salida.fecha,
      quien: salida.quien,
      actor: "Persona",
      estado: e.carga.completo ? "hecho" : "alerta",
      detalle: `${e.carga.completo ? "Salió completo" : `Salió incompleto (${e.carga.faltantes.length} ${e.carga.faltantes.length === 1 ? "línea" : "líneas"})`} con ${p.despacho.nombre}, placa ${p.despacho.placa}. La remisión viaja con el pedido para que quien recibe la firme.`,
    })
  } else if (alistamiento || ap) {
    hitos.push({
      que: "Nelson entrega a transporte",
      fecha: null,
      quien: "Nelson",
      actor: "Persona",
      estado: "pendiente",
      detalle: "Anota lo que carga contra esta remisión. Con eso sale en camino.",
    })
  }

  // Lo que manda la transportadora y lo que hacen Nelson y Marcela con eso, en el orden en que pasó.
  for (const ev of p.eventos) {
    if (ev.accion === "evidencia_recibida") {
      const m = p.mensajes.find((x) => x.id === ev.ref)
      if (!m) continue
      const l = leerMensaje(m)
      const partes = [
        l.documento === "si" ? "documento legible" : l.documento === "borrosa" ? "documento borroso" : "sin foto del documento",
        l.documento === "si" ? (l.nombre ? `recibe ${l.nombre}` : "sin nombre de quien recibe") : null,
        l.documento === "si" ? (l.firma ? "con firma" : "sin firma") : null,
        l.novedad ? `novedad escrita: "${l.novedad}"` : null,
      ].filter(Boolean)
      hitos.push({
        que: m.documento ? "Llega la foto del documento firmado" : "Llega un mensaje sin foto del documento",
        fecha: m.fecha,
        quien: `${m.de} · ${m.canal}`,
        actor: "Transportadora",
        estado: l.documento === "si" && l.firma && l.nombre ? "hecho" : "alerta",
        detalle: `${m.id} · ${partes.join(", ")}.`,
      })
    } else if (ev.accion === "evidencia_pedida" || ev.accion === "evidencia_aceptada") {
      hitos.push({
        que: ev.accion === "evidencia_pedida" ? "Se pide el documento otra vez" : "Se da por buena la evidencia",
        fecha: ev.fecha,
        quien: ev.quien,
        actor: "Persona",
        estado: "hecho",
        detalle: ev.motivo,
      })
    }
  }

  const e = salida ? entregaDe(p) : null
  if (e) {
    const ev = e.evidencia
    if (!p.mensajes.length) {
      hitos.push({
        que: "Falta la foto del documento firmado",
        fecha: null,
        quien: p.despacho?.nombre ?? "El conductor",
        actor: "Transportadora",
        estado: "pendiente",
        detalle: "Quien recibe firma en la obra y el conductor sube la foto por el chat o por su enlace.",
      })
    } else {
      const firmo = ev.documento === "si" && ev.firma && !!ev.nombre
      hitos.push({
        que: firmo ? `Firmó ${ev.nombre}, en la obra del cliente` : "Todavía no hay una firma que se lea",
        fecha: null,
        quien: firmo ? (ev.nombre as string) : "Quien recibe",
        actor: "Cliente",
        estado: firmo ? "hecho" : "alerta",
        detalle: firmo
          ? "La firma ocurre en la obra, sin que la app lo vea: la hora exacta no queda registrada. Lo más cercano es la hora en que llegó la foto."
          : e.faltas.map((f) => f.texto).join(". ") + ".",
      })
      hitos.push({
        que: "Claude lee las fotos",
        fecha: p.mensajes[p.mensajes.length - 1].fecha,
        quien: "Claude (propuesta, no decide)",
        actor: "Claude",
        estado: e.faltas.length || e.novedad ? "alerta" : "hecho",
        detalle: e.faltas.length || e.novedad
          ? [...e.faltas.map((f) => f.texto), ...(e.novedad ? [`Quien recibió escribió: "${e.novedad}"`] : [])].join(" · ")
          : "Producto, documento, remisión, nombre y firma en orden.",
      })
    }
  }
  return hitos
}

// ── Factura ─────────────────────────────────────────────────────────────────────

/** Qué pasó con una factura, con y sin pedido en esta demo. */
export function trazaFactura(f: PartidaAbierta, p: Pedido | null, cartera: CorteCartera, hoy: FechaHora = HOY): HitoDocumento[] {
  const hitos: HitoDocumento[] = []
  const entrega = p ? entregaDe(p, hoy) : null
  const llego = p ? eventoDe(p, "entregado") : undefined

  if (p && llego && entrega)
    hitos.push({
      que: "Entrega confirmada por la transportadora",
      fecha: llego.fecha,
      quien: p.despacho?.nombre ?? llego.quien,
      actor: "Transportadora",
      estado: entrega.alerta ? "alerta" : "hecho",
      detalle: entrega.alerta
        ? `Con alerta abierta: ${entrega.faltas.map((x) => x.texto).join(". ") || "hay una novedad escrita"}. Aun así se facturó.`
        : "Con producto, nombre y firma en orden.",
    })

  const seed = HITOS_FACTURA[f.documento]
  if (seed) hitos.push(...seed)
  else
    hitos.push({
      que: "Factura emitida en SAP",
      fecha: f.fecha_documento,
      quien: "SAP",
      actor: "SAP",
      estado: "hecho",
      detalle: "De esta factura la app solo conoce lo que trae el corte de cartera: fecha, valor y saldo.",
    })

  hitos.push({
    que: "Aparece en el corte de cartera",
    fecha: cartera.corte,
    quien: `Importó ${cartera.importo}`,
    actor: "Persona",
    estado: "hecho",
    detalle: `Así llega a la app: no la sube nadie, la trae el archivo ${cartera.archivo}. ${f.saldo_abierto_cop === null ? "Llegó sin saldo." : "Sigue abierta."}`,
  })

  if (f.vencimiento)
    hitos.push({
      que: esAntes(f.vencimiento, hoy) ? "Venció" : "Vence",
      fecha: f.vencimiento,
      quien: "Plazo del cliente",
      actor: "Sistema",
      estado: esAntes(f.vencimiento, hoy) ? "alerta" : "pendiente",
      detalle: esAntes(f.vencimiento, hoy)
        ? "Pasó el plazo y la factura sigue abierta."
        : `Faltan ${fmtDias(Math.max(0, diasCalendario(hoy, f.vencimiento)))} para el vencimiento.`,
    })
  return hitos
}
