import type { Conductor, EvidenciaCombinada, Lectura, MensajeTransporte, Pedido } from "./tipos"

// LA EVIDENCIA DE ENTREGA: lo que manda la transportadora y lo que la IA de muestra lee de ahí.
// Nada de esto llama a un modelo. Cada foto se describe por lo que se ve (tipos.ts) y la lectura sale
// de esa descripción, así que la imagen que se dibuja y lo que "lee Claude" siempre coinciden.
// Qué debe traer la evidencia lo dice TRA-3 en lib/rules.ts; aquí solo se lee.

/** Número de remisión de un pedido. La remisión sale de SAP con la aprobación de crédito (BOD-2.1). */
export const remisionDe = (id_pedido: string) => id_pedido.replace(/^(PED|SOL)-/, "REM-")

/** El pedido de una remisión: la remisión lleva el mismo número que el pedido. */
export const pedidoDeRemision = <P extends { id_pedido: string }>(remision: string, pedidos: P[]) =>
  pedidos.find((p) => remisionDe(p.id_pedido) === remision) ?? null

/** Número y enlace de la opción A y B. Son de muestra. */
export const NUMERO_FERREMAX = "+57 300 555 0100"
export const enlaceDe = (id_pedido: string) => `ferremax.co/e/${id_pedido.slice(-5)}${id_pedido.length % 7}k`

/** Los conductores de las transportadoras con las que trabaja Ferremax (datos de muestra). */
export const CONDUCTORES: Conductor[] = [
  { nombre: "Jairo Pinzón", transportadora: "Transportes Andina S.A.S.", placa: "SXN 231", celular: "311 555 0121" },
  { nombre: "Wilson Rengifo", transportadora: "Carga Express del Valle", placa: "CLK 904", celular: "314 555 0177" },
  { nombre: "Hernán Beltrán", transportadora: "Transportes Andina S.A.S.", placa: "TKQ 482", celular: "310 555 0188" },
  { nombre: "Luis Mora", transportadora: "Fletes Cafetero S.A.S.", placa: "WMB 117", celular: "312 555 0142" },
]

/** Un celular que no está en la lista de conductores. */
export const CELULAR_DESCONOCIDO = "300 555 0999"

// ── Lo que lee la IA de muestra ─────────────────────────────────────────────────

/** Qué ve Claude en un mensaje. Si la foto sale borrosa no lee nada de ella. */
export function leerMensaje(m: MensajeTransporte): Lectura {
  const d = m.documento
  const legible = !!d && d.nitida
  return {
    producto: !m.producto ? "no" : m.producto.nitida ? "si" : "borrosa",
    documento: !d ? "no" : d.nitida ? "si" : "borrosa",
    remision: legible ? d.remision : null,
    nombre: legible ? d.nombre : null,
    firma: legible ? d.firma : null,
    novedad: legible ? d.novedad : null,
  }
}

/**
 * Todos los mensajes de un pedido juntos: una foto buena de un mensaje posterior completa la anterior.
 * Del documento se toma el que mejor cumple (remisión correcta, nombre y firma); si empatan, el más reciente.
 */
export function combinarEvidencia(mensajes: MensajeTransporte[], remisionEsperada: string): EvidenciaCombinada {
  const lecturas = mensajes.map(leerMensaje)
  const puntos = (l: Lectura) => (l.remision === remisionEsperada ? 4 : 0) + (l.nombre ? 2 : 0) + (l.firma ? 1 : 0)
  let mejor: Lectura | null = null
  for (const l of lecturas) if (l.documento === "si" && (!mejor || puntos(l) >= puntos(mejor))) mejor = l
  const uno = (campo: "producto" | "documento") =>
    lecturas.some((l) => l[campo] === "si") ? "si" : lecturas.some((l) => l[campo] === "borrosa") ? "borrosa" : "no"
  return {
    mensajes: mensajes.length,
    producto: uno("producto"),
    documento: uno("documento"),
    remision: mejor?.remision ?? null,
    nombre: mejor?.nombre ?? null,
    firma: mejor?.firma ?? false,
    // La novedad que escribió quien recibe cuenta aunque otro documento salga mejor.
    novedad: lecturas.map((l) => l.novedad).filter(Boolean).at(-1) ?? null,
  }
}

/** Una línea para el historial del pedido. */
export function describirMensaje(m: MensajeTransporte) {
  const fotos = [m.producto && "foto del producto", m.documento && "foto del documento"].filter(Boolean)
  return `${m.canal} · ${fotos.length ? fotos.join(" y ") : "sin fotos"} · "${m.texto}"`
}

// ── A qué pedido corresponde un mensaje ─────────────────────────────────────────

/**
 * Opción A (chat): nadie dice de qué pedido es el mensaje. Se busca primero por el número de remisión
 * (en el texto o leído en la foto) y después por el celular: si ese conductor lleva un solo pedido en camino,
 * es ese; si no lleva ninguno, el único con alerta abierta. Si no se puede, el mensaje queda "sin pedido"
 * y alguien lo asocia a mano.
 */
export function pedidoDelMensaje(
  m: Omit<MensajeTransporte, "id" | "id_pedido">,
  candidatos: Pedido[],
  enCamino: (p: Pedido) => boolean,
): string | null {
  const leida = leerMensaje({ ...m, id: "", id_pedido: null }).remision
  const escritas = m.texto.match(/REM-\d{4}-\d{5}/g) ?? []
  for (const r of [leida, ...escritas]) {
    const p = r && candidatos.find((c) => remisionDe(c.id_pedido) === r)
    if (p) return p.id_pedido
  }
  const delCelular = candidatos.filter((c) => c.despacho?.celular === m.celular)
  const deEsteViaje = delCelular.filter(enCamino)
  const posibles = deEsteViaje.length ? deEsteViaje : delCelular
  return posibles.length === 1 ? posibles[0].id_pedido : null
}

// ── Lo que puede mandar el conductor (para ensayar la demo) ─────────────────────

export interface Escenario {
  clave: string
  nombre: string
  detalle: string
  armar: (remision: string, recibe: string) => Pick<MensajeTransporte, "texto" | "producto" | "documento">
}

const buena = { bultos: 6, nitida: true }

export const ESCENARIOS: Escenario[] = [
  {
    clave: "completa",
    nombre: "Todo en orden",
    detalle: "Foto del producto y del documento con nombre y firma.",
    armar: (remision, recibe) => ({
      texto: "Buenas, ya entregué en la obra. Todo recibido.",
      producto: buena,
      documento: { remision, nombre: recibe, firma: true, novedad: null, nitida: true },
    }),
  },
  {
    clave: "sin-firma",
    nombre: "Documento sin firma",
    detalle: "Quien recibe puso el nombre pero no firmó.",
    armar: (remision, recibe) => ({
      texto: "Entregado. Aquí la remisión.",
      producto: buena,
      documento: { remision, nombre: recibe, firma: false, novedad: null, nitida: true },
    }),
  },
  {
    clave: "sin-nombre",
    nombre: "Firma sin nombre",
    detalle: "Hay una firma, pero nadie escribió quién recibió.",
    armar: (remision) => ({
      texto: "Entregado, firmaron aquí.",
      producto: buena,
      documento: { remision, nombre: null, firma: true, novedad: null, nitida: true },
    }),
  },
  {
    clave: "sin-producto",
    nombre: "Sin foto del producto",
    detalle: "Solo manda el documento firmado.",
    armar: (remision, recibe) => ({
      texto: "Listo, documento firmado.",
      documento: { remision, nombre: recibe, firma: true, novedad: null, nitida: true },
    }),
  },
  {
    clave: "borroso",
    nombre: "Documento borroso",
    detalle: "La foto del documento no se lee.",
    armar: (remision, recibe) => ({
      texto: "Entregado. Perdón, la foto salió movida.",
      producto: buena,
      documento: { remision, nombre: recibe, firma: true, novedad: null, nitida: false },
    }),
  },
  {
    clave: "otra-remision",
    nombre: "Documento de otra remisión",
    detalle: "Se equivocó de papel: sube la remisión de otro pedido.",
    armar: (_remision, recibe) => ({
      texto: "Entregado, aquí el documento.",
      producto: buena,
      documento: { remision: "REM-2026-03001", nombre: recibe, firma: true, novedad: null, nitida: true },
    }),
  },
  {
    clave: "novedad",
    nombre: "Con novedad escrita",
    detalle: "Quien recibe escribió que faltó producto.",
    armar: (remision, recibe) => ({
      texto: "Entregado, ellos anotaron algo en el papel.",
      producto: { bultos: 5, nitida: true },
      documento: { remision, nombre: recibe, firma: true, novedad: "Faltó una caja. Recibido con novedad.", nitida: true },
    }),
  },
  {
    clave: "solo-texto",
    nombre: "Solo texto, sin fotos",
    detalle: "Escribe que ya entregó y nada más.",
    armar: () => ({ texto: "Ya entregué, jefe." }),
  },
]

/** Quien recibe en la obra. Rota para que no siempre salga el mismo nombre. */
const RECIBEN = ["Jorge Pinto", "Marta Quintero", "Diego Valencia", "Claudia Rojas"]
export const quienRecibe = (n: number) => RECIBEN[n % RECIBEN.length]

// ── Borrador para pedir la evidencia otra vez ───────────────────────────────────

/** Propuesta IA: el mensaje que Nelson o Marcela enviarían al conductor. Nadie lo envía desde aquí. */
export function borradorPedirEvidencia(p: Pedido, faltas: string[], novedad: string | null) {
  const nombre = p.despacho?.nombre.split(" ")[0] ?? "buenas"
  const lineas = [`Hola ${nombre}, soy de Ferremax. Sobre la remisión ${remisionDe(p.id_pedido)} (${p.cliente}):`]
  for (const f of faltas) lineas.push(`• ${f}.`)
  if (novedad) lineas.push(`• Quien recibió escribió: "${novedad}". ¿Me cuentas qué pasó?`)
  if (faltas.length) lineas.push("¿Me reenvías las fotos por este mismo chat? Gracias.")
  return lineas.join("\n")
}
