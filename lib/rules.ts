import { aLaHora, diaDeSemana, diasCalendario, esAntes, soloFecha, sumarDias, sumarHoras } from "./fechas"
import { fmtCOP } from "./formato"
import {
  VENDEDORES,
  type EvidenciaCombinada,
  type FechaHora,
  type ItemPedido,
  type LineaCargada,
  type PartidaAbierta,
  type Pedido,
  type Persona,
} from "./tipos"

// TODAS LAS REGLAS DEL PROTOTIPO, UNA SOLA VEZ.
// Cada regla tiene id, texto legible, área, fuente, documento (con su dueño) y la
// función que la aplica. Los números (montos, plazos, metas) viven en un solo objeto
// por regla; el texto se arma con esos números para que nunca digan cosas distintas.
// Fuentes: empresa\second-brain\03-Areas (Crédito y Bodega) y 02-Projects (Ops Charter).

// ── Documentos, áreas y dueños ──────────────────────────────────────────────────

export type Area = "Crédito" | "Avisos" | "Bodega" | "Transporte" | "Proyecto" | "Sistema"
export const AREAS: Area[] = ["Crédito", "Avisos", "Bodega", "Transporte", "Proyecto", "Sistema"]

export interface Documento {
  nombre: string
  area: Area
  /** Dueño del documento: el único que lo edita ("Reglas del sistema · dónde viven las reglas"). */
  dueno: Persona | null
  ruta: string
  nota?: string
}

export const DOCUMENTOS = {
  politica: {
    nombre: "Política de aprobación de crédito (v1)",
    area: "Crédito",
    dueno: "Andrés Molina",
    ruta: "empresa\\second-brain\\03-Areas\\Crédito",
  },
  casos: {
    nombre: "Casos resueltos de crédito (v1)",
    area: "Crédito",
    dueno: "Marcela Ríos",
    ruta: "empresa\\second-brain\\03-Areas\\Crédito",
  },
  revisionCredito: {
    nombre: "Revisión semanal de crédito",
    area: "Crédito",
    dueno: "Marcela Ríos",
    ruta: "empresa\\second-brain\\03-Areas\\Crédito",
  },
  alistamiento: {
    nombre: "Regla de prioridad de alistamiento (v1)",
    area: "Bodega",
    dueno: "Nelson",
    ruta: "empresa\\second-brain\\03-Areas\\Bodega",
    nota: "Los cambios los aprueba Andrés Molina.",
  },
  transporte: {
    nombre: "Salida y entrega a transporte (pedido para la demo)",
    area: "Transporte",
    dueno: null,
    ruta: "Ningún documento de empresa\\ todavía",
    nota: "Salen del pedido para esta demo. No están escritos en ningún documento: [por definir] quién es su dueño. El transporte a la obra queda fuera del Ops Charter.",
  },
  avisos: {
    nombre: "Avisos por WhatsApp al aprobador (pedido para la demo)",
    area: "Avisos",
    dueno: "Marcela Ríos",
    ruta: "Ningún documento de empresa\\ todavía",
    nota: "Salen del pedido para esta demo. Se propone a Marcela como dueña porque lleva el seguimiento del reloj, pero Andrés es el dueño de la Política (CRED-3.1) que ya habla de un aviso a las 12 h: [por confirmar] con los dos.",
  },
  diccionario: {
    nombre: "Diccionario de datos",
    area: "Crédito",
    dueno: "Sandra Beltrán",
    ruta: "empresa\\datos",
  },
  charter: {
    nombre: "Ops Charter · Pedido a crédito (v2)",
    area: "Proyecto",
    dueno: "Andrés Molina",
    ruta: "empresa\\second-brain\\02-Projects",
  },
  sistema: {
    nombre: "Reglas del sistema · dónde viven las reglas",
    area: "Sistema",
    dueno: "Marcela Ríos",
    ruta: "empresa\\skills\\sistemas\\Pedido a crédito",
  },
  prototipo: {
    nombre: "Permisos del prototipo (pedido para la demo)",
    area: "Sistema",
    dueno: null,
    ruta: "Ningún documento de empresa\\ todavía",
    nota: "Salen del pedido para esta demo. No están escritos en ningún documento: [por definir] quién es su dueño.",
  },
} satisfies Record<string, Documento>

// ── La forma de una regla ───────────────────────────────────────────────────────

export type Fuente = "Política escrita" | "Regla de Marcela" | "Permiso del prototipo" | "Pedido del prototipo"

export interface Campo {
  etiqueta: string
  unidad: "COP" | "días" | "h" | "%" | "años" | "veces" | ""
}

export interface Regla<F extends (...args: never[]) => unknown = (...args: never[]) => unknown> {
  id: string
  titulo: string
  /** La regla en palabras, como está en el documento. */
  readonly texto: string
  fuente: Fuente
  documento: Documento
  seccion: string
  /** Momentos del flujo (1 a 6) donde actúa. */
  momentos: number[]
  /** Números que usa la regla (algunos se leen de otra regla). */
  readonly valores?: Record<string, number>
  /** Números propios que el dueño puede editar. */
  campos?: Record<string, Campo>
  /** De qué regla sale un número que no es propio. */
  heredaDe?: string
  /** Para los casos resueltos: la regla de la Política que los resuelve. */
  seApoyaEn?: string
  fn: F
}

const regla = <F extends (...args: never[]) => unknown>(r: Regla<F>) => r

// Números propios de cada regla. Son los únicos que cambian al editar una regla.
const V_MAXIMO = { maximo_cop: 20_000_000 }
const V_ATRASO = { max_dias: 30 }
const V_CLIENTE_NUEVO = { min_anios: 2 }
const V_RELOJ_APROBACION = { aviso_h: 12, tope_h: 24 }
const V_FECHA_LIMITE = { dias: 4 }
const V_AVISO = { reenvio_h: 6, max_recordatorios: 3, pausa_info_h: 12, escala_h: 20 }
const V_RELOJ_BODEGA = { aviso_dia: 3 }
const V_TRANSPORTE = { aviso_h: 24 }
const V_A = { meta_pct: 80 }
const V_C = { meta: 0 }
const V_A_TIEMPO = { dias: 5, meta_pct: 95 }
const V_CASO_3 = { costumbre_vieja_cop: 5_000_000 }

const anios = (n: number) => `${n} ${n === 1 ? "año" : "años"}`

// ── Cartera · de dónde salen el saldo y el atraso ───────────────────────────────
// Ya no los escribe nadie: se calculan sobre las partidas abiertas del último corte
// de cartera de SAP. Cada corte reemplaza al anterior.

export const SALDO_PENDIENTE = regla({
  id: "CART-1",
  titulo: "Saldo pendiente",
  texto:
    "El saldo pendiente de un cliente es la suma del saldo abierto de sus facturas en el último corte de cartera. Los pagos sin aplicar no se restan. Si una factura llega sin saldo, el saldo queda en blanco.",
  fuente: "Política escrita",
  documento: DOCUMENTOS.diccionario,
  seccion: "Cuidados (facturas: entrega más el plazo del cliente)",
  momentos: [1, 2],
  fn(partidas: PartidaAbierta[]): number | null {
    const facturas = partidas.filter((p) => p.tipo === "Factura")
    if (facturas.some((p) => p.saldo_abierto_cop === null)) return null
    return facturas.reduce((s, p) => s + p.saldo_abierto_cop!, 0)
  },
})

/** Facturas con saldo abierto. Una con saldo en blanco cuenta como abierta: no se sabe. */
const abiertas = (partidas: PartidaAbierta[]) =>
  partidas.filter((p) => p.tipo === "Factura" && (p.saldo_abierto_cop === null || p.saldo_abierto_cop > 0))

export const DIAS_DE_ATRASO = regla({
  id: "CART-2",
  titulo: "Días de atraso",
  texto:
    "Días calendario desde el vencimiento de la factura abierta más antigua ya vencida hasta hoy. Si ninguna ha vencido, 0. Si una factura abierta llega sin vencimiento, el atraso queda en blanco.",
  fuente: "Política escrita",
  documento: DOCUMENTOS.politica,
  seccion: "2 · Preparar la decisión (chequeo 3: la factura vencida más antigua)",
  momentos: [1, 2],
  fn(partidas: PartidaAbierta[], hoy: FechaHora): { dias: number | null; factura: string | null } {
    const facturas = abiertas(partidas)
    if (facturas.some((p) => p.vencimiento === null)) return { dias: null, factura: null }
    const vencidas = facturas.filter((p) => esAntes(p.vencimiento!, soloFecha(hoy) + "T00:00"))
    if (!vencidas.length) return { dias: 0, factura: null }
    const mas = vencidas.reduce((a, b) => (esAntes(b.vencimiento!, a.vencimiento!) ? b : a))
    return { dias: diasCalendario(mas.vencimiento!, hoy), factura: mas.documento }
  },
})

export const CRUCE_DEL_LIMITE = regla({
  id: "CART-3",
  titulo: "Cuándo cruza el límite de atraso",
  get texto() {
    return `Desde qué día un cliente falla el chequeo 3: vencimiento de su factura abierta más antigua + ${V_ATRASO.max_dias} días + 1. Si paga esa factura antes, la fecha se corre. La rutina avisa: no cobra ni cambia nada.`
  },
  fuente: "Política escrita",
  documento: DOCUMENTOS.politica,
  seccion: "2 · Preparar la decisión (chequeo 3) y 3 · Vigilar el reloj (la rutina avisa)",
  momentos: [5],
  fn(partidas: PartidaAbierta[]): { fecha: FechaHora; factura: string } | null {
    const facturas = abiertas(partidas).filter((p) => p.vencimiento !== null)
    if (!facturas.length) return null
    const mas = facturas.reduce((a, b) => (esAntes(b.vencimiento!, a.vencimiento!) ? b : a))
    return { fecha: sumarDias(mas.vencimiento!, V_ATRASO.max_dias + 1), factura: mas.documento }
  },
})

export const PAGO_SIN_APLICAR = regla({
  id: "CART-4",
  titulo: "Pago sin aplicar",
  texto:
    "Si el cliente tiene un pago que cartera todavía no aplica, ninguna regla dice si cuenta: decide Marcela y lo anota. Es el caso que Sandra le preguntó a Andrés: \"uno que pagó ayer y cartera todavía no aplica el pago\".",
  fuente: "Política escrita",
  documento: DOCUMENTOS.politica,
  seccion: "4 · Decidir (Entrevista a Andrés Molina, 28 de septiembre)",
  momentos: [1, 3],
  fn: (p: Pedido) => p.pago_sin_aplicar_cop > 0,
})

export const SALDO_VENCIDO = regla({
  id: "CART-5",
  titulo: "Saldo vencido",
  texto:
    "Suma del saldo abierto de las facturas que ya vencieron en el último corte de cartera. Es lo que se ve en la ficha de decisión como \"saldo vencido\"; no cambia ningún chequeo. Si una factura abierta llega sin saldo o sin vencimiento, queda en blanco.",
  fuente: "Pedido del prototipo",
  documento: DOCUMENTOS.prototipo,
  seccion: "Ficha de decisión",
  momentos: [2],
  fn(partidas: PartidaAbierta[], hoy: FechaHora): number | null {
    const facturas = abiertas(partidas)
    if (facturas.some((p) => p.vencimiento === null || p.saldo_abierto_cop === null)) return null
    return facturas
      .filter((p) => esAntes(p.vencimiento!, soloFecha(hoy) + "T00:00"))
      .reduce((s, p) => s + p.saldo_abierto_cop!, 0)
  },
})

// ── Momento 1 y 2 · Los cuatro chequeos ─────────────────────────────────────────

export interface ResultadoChequeo {
  /** null = falta un dato para correr el chequeo. */
  pasa: boolean | null
  detalle: string
  falta?: string
}

export const CHEQUEO_MAXIMO = regla({
  id: "CRED-2.1",
  titulo: "Chequeo 1 · Máximo por pedido",
  get texto() {
    return `Pasa si el valor es de COP ${fmtCOP(V_MAXIMO.maximo_cop)} o menos. Si no pasa, lo aprueba Andrés Molina.`
  },
  fuente: "Política escrita",
  documento: DOCUMENTOS.politica,
  seccion: "2 · Preparar la decisión",
  momentos: [1, 2],
  valores: V_MAXIMO,
  campos: { maximo_cop: { etiqueta: "Máximo por pedido", unidad: "COP" } },
  fn(p: Pedido): ResultadoChequeo {
    const max = V_MAXIMO.maximo_cop
    return { pasa: p.valor_cop <= max, detalle: `${fmtCOP(p.valor_cop)} contra un máximo de ${fmtCOP(max)}` }
  },
})

export const CHEQUEO_CUPO = regla({
  id: "CRED-2.2",
  titulo: "Chequeo 2 · Cupo",
  texto: "Pasa si el valor del pedido más el saldo pendiente del cliente no supera su cupo. Si no pasa, lo aprueba Andrés Molina.",
  fuente: "Política escrita",
  documento: DOCUMENTOS.politica,
  seccion: "2 · Preparar la decisión",
  momentos: [1, 2],
  fn(p: Pedido): ResultadoChequeo {
    if (p.saldo_pendiente_cop === null)
      return { pasa: null, detalle: "Saldo pendiente en blanco", falta: "el saldo pendiente" }
    const total = p.valor_cop + p.saldo_pendiente_cop
    return {
      pasa: total <= p.cupo_cop,
      detalle: `${fmtCOP(p.valor_cop)} + ${fmtCOP(p.saldo_pendiente_cop)} de saldo = ${fmtCOP(total)}, cupo ${fmtCOP(p.cupo_cop)}`,
    }
  },
})

export const CHEQUEO_ATRASO = regla({
  id: "CRED-2.3",
  titulo: "Chequeo 3 · Atraso",
  get texto() {
    return `Pasa si la factura vencida más antigua tiene ${V_ATRASO.max_dias} días o menos. Si no pasa, lo aprueba Andrés Molina.`
  },
  fuente: "Política escrita",
  documento: DOCUMENTOS.politica,
  seccion: "2 · Preparar la decisión",
  momentos: [1, 2],
  valores: V_ATRASO,
  campos: { max_dias: { etiqueta: "Atraso máximo", unidad: "días" } },
  fn(p: Pedido): ResultadoChequeo {
    if (p.dias_atraso === null) return { pasa: null, detalle: "Atraso en blanco", falta: "los días de atraso" }
    const max = V_ATRASO.max_dias
    const factura = p.factura_mas_antigua ? ` (${p.factura_mas_antigua})` : ""
    return { pasa: p.dias_atraso <= max, detalle: `${p.dias_atraso} días de atraso${factura}, límite ${max}` }
  },
})

export const CHEQUEO_CLIENTE_NUEVO = regla({
  id: "CRED-2.4",
  titulo: "Chequeo 4 · Cliente nuevo",
  get texto() {
    return `Pasa si el cliente lleva ${anios(V_CLIENTE_NUEVO.min_anios)} o más con Ferremax. Si no pasa, lo aprueba Andrés Molina.`
  },
  fuente: "Política escrita",
  documento: DOCUMENTOS.politica,
  seccion: "2 · Preparar la decisión",
  momentos: [1, 2],
  valores: V_CLIENTE_NUEVO,
  campos: { min_anios: { etiqueta: "Antigüedad mínima", unidad: "años" } },
  fn(p: Pedido): ResultadoChequeo {
    const min = V_CLIENTE_NUEVO.min_anios
    return { pasa: p.antiguedad_anios >= min, detalle: `${anios(p.antiguedad_anios)} con Ferremax, mínimo ${min}` }
  },
})

/** En el orden de la Política: si falla más de uno, el motivo es el primero. */
export const CHEQUEOS = [CHEQUEO_MAXIMO, CHEQUEO_CUPO, CHEQUEO_ATRASO, CHEQUEO_CLIENTE_NUEVO]

export const DATO_FALTANTE = regla({
  id: "CRED-2.5",
  titulo: "Si falta un dato",
  texto:
    "Si falta un dato, la solicitud queda \"incompleta\" y se le pide el dato a quien lo tiene. El saldo y el atraso los entrega el informe de cartera de Sandra Beltrán. No se escala.",
  fuente: "Política escrita",
  documento: DOCUMENTOS.politica,
  seccion: "2 · Preparar la decisión y 4 · Decidir",
  momentos: [1, 2],
  fn: (p: Pedido): string[] =>
    CHEQUEOS.map((c) => c.fn(p))
      .filter((r) => r.pasa === null)
      .map((r) => r.falta!),
})

export const NINGUNA_REGLA_CUBRE = regla({
  id: "CRED-4.2",
  titulo: "Ninguna regla cubre el caso",
  texto: "Marcela decide y anota el caso en \"Casos nuevos\".",
  fuente: "Política escrita",
  documento: DOCUMENTOS.politica,
  seccion: "4 · Decidir",
  momentos: [1, 3],
  fn: (p: Pedido): string | null =>
    p.situacion_no_cubierta ??
    (PAGO_SIN_APLICAR.fn(p)
      ? `El cliente tiene un pago sin aplicar de COP ${fmtCOP(p.pago_sin_aplicar_cop)}. Ninguna regla dice si cuenta (CART-4).`
      : null),
})

// ── Momento 1 · Quién aprueba ───────────────────────────────────────────────────

export interface Asignacion {
  tipo: "andres" | "marcela_o_sandra" | "incompleta" | "decide_marcela"
  /** Quién puede firmar. Vacío mientras falta un dato. */
  decide: Persona[]
  texto: string
  porque: string
  /** Ids de las reglas que se citan. */
  reglas: string[]
}

const ID_ASIGNAR = "CRED-1.1"
export const ASIGNAR_APROBADOR = regla({
  id: ID_ASIGNAR,
  titulo: "Un solo aprobador, que sale de la tabla",
  texto:
    "Si el pedido supera el máximo por pedido, no cabe en el cupo, tiene atraso o es de un cliente nuevo, lo aprueba Andrés Molina. Si pasa los cuatro chequeos, lo aprueba Marcela Ríos o Sandra Beltrán, cualquiera de las dos. No se elige a mano.",
  fuente: "Política escrita",
  documento: DOCUMENTOS.politica,
  seccion: "1 · Llegada de la solicitud",
  momentos: [1],
  fn(p: Pedido): Asignacion {
    const situacion = NINGUNA_REGLA_CUBRE.fn(p)
    if (situacion)
      return {
        tipo: "decide_marcela",
        decide: ["Marcela Ríos"],
        texto: "Decide Marcela",
        porque: situacion,
        reglas: [NINGUNA_REGLA_CUBRE.id],
      }
    const faltan = DATO_FALTANTE.fn(p)
    if (faltan.length)
      return {
        tipo: "incompleta",
        decide: [],
        texto: "Incompleta",
        porque: `Falta ${faltan.join(" y ")}. Se le pide el dato a Sandra Beltrán. No se escala.`,
        reglas: [DATO_FALTANTE.id],
      }
    for (const c of CHEQUEOS) {
      const r = c.fn(p)
      if (r.pasa === false)
        return {
          tipo: "andres",
          decide: ["Andrés Molina"],
          texto: "Andrés Molina",
          porque: `Falla ${c.titulo.toLowerCase()}: ${r.detalle}.`,
          reglas: [ID_ASIGNAR, c.id],
        }
    }
    return {
      tipo: "marcela_o_sandra",
      decide: ["Marcela Ríos", "Sandra Beltrán"],
      texto: "Marcela o Sandra",
      porque: "Pasa los cuatro chequeos.",
      reglas: [ID_ASIGNAR],
    }
  },
})

// ── Momento 2 · La ficha de cinco líneas ────────────────────────────────────────

export const FICHA = regla({
  id: "CRED-2.6",
  titulo: "La ficha de cinco líneas",
  texto:
    "Quien aprueba recibe cinco líneas: cliente, valor, cupo y saldo pendiente, atraso y antigüedad. Se le agrega el chequeo que falló. No se mira precio, margen, inventario ni ruta.",
  fuente: "Política escrita",
  documento: DOCUMENTOS.politica,
  seccion: "2 · Preparar la decisión",
  momentos: [2],
  fn(p: Pedido) {
    const blanco = "[en blanco]"
    const lineas = [
      { rotulo: "Cliente", valor: p.cliente },
      { rotulo: "Valor", valor: `COP ${fmtCOP(p.valor_cop)}` },
      {
        rotulo: "Cupo y saldo pendiente",
        valor: `${fmtCOP(p.cupo_cop)} · saldo ${p.saldo_pendiente_cop === null ? blanco : fmtCOP(p.saldo_pendiente_cop)}`,
      },
      { rotulo: "Atraso", valor: p.dias_atraso === null ? blanco : `${p.dias_atraso} días` },
      { rotulo: "Antigüedad", valor: anios(p.antiguedad_anios) },
    ]
    const a = ASIGNAR_APROBADOR.fn(p)
    return { lineas, pie: a.tipo === "andres" ? a.porque : null }
  },
})

// ── Momento 3 · Decidir ─────────────────────────────────────────────────────────

export const MOTIVO_ESCRITO = regla({
  id: "CRED-4.3",
  titulo: "Toda decisión lleva motivo escrito",
  texto: "Quien aprueba libera o rechaza, con el motivo escrito.",
  fuente: "Política escrita",
  documento: DOCUMENTOS.politica,
  seccion: "4 · Decidir",
  momentos: [3],
  fn: (motivo: string) => motivo.trim().length > 0,
})

export const FUERA_DE_REGLA = regla({
  id: "CRED-4.1",
  titulo: "Aprobación fuera de regla",
  texto: "Una aprobación está fuera de regla cuando la dio alguien distinto de quien asigna la tabla.",
  fuente: "Política escrita",
  documento: DOCUMENTOS.politica,
  seccion: "4 · Decidir",
  momentos: [3, 6],
  fn: (asignacion: Asignacion, aprobo: string) => !asignacion.decide.includes(aprobo as Persona),
})

// ── Momento 5 · Reloj de aprobación ─────────────────────────────────────────────

export type ClaseEstado = "en-plazo" | "aviso" | "vencido"

/** Una fila de la tabla "Vigilar el reloj": estado, qué pasa y quién. */
export interface PasoReloj {
  clase: ClaseEstado
  palabra: string
  queHace: string
  quien: string
}

export const RELOJ_APROBACION = regla({
  id: "CRED-3.1",
  titulo: "Reloj de aprobación",
  get texto() {
    const { aviso_h, tope_h } = V_RELOJ_APROBACION
    return `El reloj empieza cuando se registra la solicitud y termina cuando se aprueba. Horas corridas, de día y de noche. A las ${aviso_h} horas, aviso al aprobador por mensaje con la ficha. A las ${tope_h} horas, fuera de plazo: Marcela llama al aprobador ese mismo día. La rutina avisa. No aprueba.`
  },
  fuente: "Política escrita",
  documento: DOCUMENTOS.politica,
  seccion: "3 · Vigilar el reloj",
  momentos: [5],
  valores: V_RELOJ_APROBACION,
  campos: {
    aviso_h: { etiqueta: "Aviso al aprobador", unidad: "h" },
    tope_h: { etiqueta: "Tope para aprobar", unidad: "h" },
  },
  fn(horas: number): PasoReloj {
    const { aviso_h, tope_h } = V_RELOJ_APROBACION
    if (horas > tope_h)
      return { clase: "vencido", palabra: "Fuera de plazo", queHace: "Marcela llama al aprobador ese mismo día", quien: "Marcela Ríos" }
    if (horas >= aviso_h)
      return { clase: "aviso", palabra: `Aviso ${aviso_h} h`, queHace: "Aviso al aprobador por mensaje, con la ficha", quien: "Rutina de seguimiento" }
    return { clase: "en-plazo", palabra: "En plazo", queHace: "Nada", quien: "—" }
  },
})

// ── Momento 1 y 5 · Avisos por WhatsApp ─────────────────────────────────────────
// Estas reglas salen del pedido para la demo. La Política (CRED-3.1) solo habla de un aviso a las
// 12 h; aquí el aviso nace con la solicitud y se repite. Es el choque a resolver con Andrés.

/**
 * inicial · recordatorio: a quien aprueba.
 * info: a quien consigue el dato cuando el aprobador pidió información.
 * apoyo: a Sandra cuando solo Marcela decide y no responde.
 * escalamiento: al que está por encima cuando nadie responde (Marcela si aprueba Andrés; Andrés si aprueban ellas).
 */
export type TipoEnvio = "inicial" | "recordatorio" | "info" | "apoyo" | "escalamiento"

/** Quién queda por encima de quien aprueba. Sale de la tabla de CRED-1.1. */
export type Cadena = "andres" | "marcela_o_sandra" | "marcela_sola"

export interface Envio {
  fecha: FechaHora
  tipo: TipoEnvio
  /** 0 para el inicial y el escalamiento; 1, 2, 3… para los recordatorios y los pedidos de información. */
  n: number
}

/** Lo que hay que saber de un pedido para armar sus avisos: quién aprueba y cuándo se pidió información. */
export interface ContextoAviso {
  cadena: Cadena
  infos: FechaHora[]
}

export const AVISO_WHATSAPP = regla({
  id: "NOT-1",
  titulo: "Aviso al aprobador por WhatsApp",
  get texto() {
    const { reenvio_h, max_recordatorios, pausa_info_h, escala_h } = V_AVISO
    const { aviso_h, tope_h } = V_RELOJ_APROBACION
    return `Apenas entra la solicitud, el sistema le escribe por WhatsApp a quien la aprueba, con la ficha y cómo responder. Si no hay decisión, le vuelve a escribir cada ${reenvio_h} horas, hasta ${max_recordatorios} veces. Si quien aprueba pide información, los recordatorios se pausan ${pausa_info_h} horas, Sandra recibe el aviso para conseguir el dato y el reloj de ${tope_h} horas no se detiene. Si aprueba Andrés, a las ${tope_h} horas se le avisa a Marcela para que llame (CRED-3.1). Si aprueban Marcela o Sandra, a las ${escala_h} horas se le avisa a Andrés que a las dos se les escribió y no hay respuesta. Si decide Marcela sola, a las ${aviso_h} horas también se le escribe a Sandra. Cuando alguien decide, los avisos paran. Los avisos salen de día y de noche: las horas son corridas. El sistema avisa. No aprueba.`
  },
  fuente: "Pedido del prototipo",
  documento: DOCUMENTOS.avisos,
  seccion: "Avisar",
  momentos: [1, 5],
  valores: V_AVISO,
  campos: {
    reenvio_h: { etiqueta: "Volver a avisar cada", unidad: "h" },
    max_recordatorios: { etiqueta: "Máximo de recordatorios", unidad: "veces" },
    pausa_info_h: { etiqueta: "Pausa al pedir información", unidad: "h" },
    escala_h: { etiqueta: "Avisar a Andrés (si aprueban ellas) a las", unidad: "h" },
  },
  heredaDe: RELOJ_APROBACION.id,
  /**
   * Los avisos que tocan entre que la solicitud entra a la app y `hasta`.
   * `solicitud` es cuando se registró (ahí empieza el reloj de aprobación y se cuentan los topes).
   */
  fn(entrada: FechaHora, hasta: FechaHora, solicitud: FechaHora = entrada, ctx: ContextoAviso = { cadena: "andres", infos: [] }): Envio[] {
    const { reenvio_h, max_recordatorios, pausa_info_h, escala_h } = V_AVISO
    const { aviso_h, tope_h } = V_RELOJ_APROBACION
    const hecho = (f: FechaHora) => !esAntes(hasta, f)
    const enPausa = (f: FechaHora) => ctx.infos.some((i) => !esAntes(f, i) && esAntes(f, sumarHoras(i, pausa_info_h)))
    const envios: Envio[] = []
    if (hecho(entrada)) envios.push({ fecha: entrada, tipo: "inicial", n: 0 })
    for (let k = 1; reenvio_h > 0 && k <= max_recordatorios; k++) {
      const f = sumarHoras(entrada, k * reenvio_h)
      if (!hecho(f)) break
      if (!enPausa(f)) envios.push({ fecha: f, tipo: "recordatorio", n: k })
    }
    ctx.infos.forEach((f, i) => {
      if (hecho(f)) envios.push({ fecha: f, tipo: "info", n: i + 1 })
    })
    const apoyo = sumarHoras(solicitud, aviso_h)
    if (ctx.cadena === "marcela_sola" && hecho(apoyo)) envios.push({ fecha: apoyo, tipo: "apoyo", n: 0 })
    const escala = sumarHoras(solicitud, ctx.cadena === "andres" ? tope_h : escala_h)
    if (hecho(escala)) envios.push({ fecha: escala, tipo: "escalamiento", n: 0 })
    return envios.sort((a, b) => a.fecha.localeCompare(b.fecha))
  },
})

export type AccionWhatsApp = "aprobado" | "rechazado" | "info_pedida"

export type Interpretacion =
  | { tipo: "decision"; accion: AccionWhatsApp; motivo: string }
  | { tipo: "falta_motivo"; accion: AccionWhatsApp }
  | { tipo: "no_entendido" }

/** La palabra con la que empieza la respuesta. Un número solo vale si no sigue otra letra o cifra ("10 cajas" no es "1"). */
const PALABRAS_RESPUESTA: { accion: AccionWhatsApp; inicio: RegExp }[] = [
  { accion: "aprobado", inicio: /^(1|aprobar|aprobado|apruebo)(?![a-záéíóúñ0-9])[\s:,.\-–]*/i },
  { accion: "rechazado", inicio: /^(2|rechazar|rechazado|rechazo)(?![a-záéíóúñ0-9])[\s:,.\-–]*/i },
  { accion: "info_pedida", inicio: /^(3|info|informaci[oó]n|dato)(?![a-záéíóúñ0-9])[\s:,.\-–]*/i },
]

export const RESPUESTA_WHATSAPP = regla({
  id: "NOT-2",
  titulo: "Decidir respondiendo por WhatsApp",
  texto:
    "Quien aprueba responde en el mismo chat: 1 o APROBAR, 2 o RECHAZAR, 3 o INFO (pide información), seguido del motivo. Sin motivo no se registra: el sistema lo pide (CRED-4.3). Solo vale la respuesta de quien asigna la tabla (CRED-1.1) desde su celular registrado. La primera respuesta gana: a los demás se les dice quién resolvió. La decisión queda en el historial marcada \"por WhatsApp\" y el pedido sigue igual que si se hubiera firmado en la app.",
  fuente: "Pedido del prototipo",
  documento: DOCUMENTOS.avisos,
  seccion: "Responder",
  momentos: [3],
  fn(texto: string): Interpretacion {
    const t = texto.trim()
    for (const { accion, inicio } of PALABRAS_RESPUESTA) {
      const m = t.match(inicio)
      if (!m) continue
      const motivo = t.slice(m[0].length).trim()
      return MOTIVO_ESCRITO.fn(motivo) ? { tipo: "decision", accion, motivo } : { tipo: "falta_motivo", accion }
    }
    return { tipo: "no_entendido" }
  },
})

// ── Momento 4 · Pasar a bodega ──────────────────────────────────────────────────

export const ENTRADA_A_LA_FILA = regla({
  id: "BOD-1.1",
  titulo: "Entrada a la fila",
  texto:
    "Todos los días a las 7:00 a.m. sale la lista de alistamiento. Entra todo pedido listo a esa hora; en crédito, listo desde la hora de aprobación en SAP. Lo que se aprueba durante el día entra en la lista del día siguiente. Domingo no se trabaja: la lista del lunes trae lo del sábado y el domingo. Si hay capacidad libre en la tarde, Nelson puede adelantar lo de mañana sin cambiar el orden.",
  fuente: "Política escrita",
  documento: DOCUMENTOS.alistamiento,
  seccion: "1 · Entrada a la fila",
  momentos: [4],
  /** Fecha y hora de la lista en la que entra un pedido listo desde `listo`. */
  fn(listo: FechaHora): FechaHora {
    let lista = aLaHora(listo, "07:00")
    if (esAntes(lista, listo)) lista = sumarDias(lista, 1)
    while (diaDeSemana(lista) === 0) lista = sumarDias(lista, 1)
    return lista
  },
})

export const REMISION_SIN_FIRMA = regla({
  id: "BOD-2.1",
  titulo: "Remisión",
  texto: "La remisión sale de SAP con la aprobación del crédito. No necesita firma de cartera.",
  fuente: "Política escrita",
  documento: DOCUMENTOS.alistamiento,
  seccion: "2 · Remisión",
  momentos: [4],
  fn: () => ({ requiereFirma: false }),
})

export const FECHA_LIMITE = regla({
  id: "BOD-3.1",
  titulo: "Fecha límite en bodega",
  get texto() {
    return `Crédito: listo desde + ${V_FECHA_LIMITE.dias} días calendario. Son días calendario porque el cliente cuenta calendario.`
  },
  fuente: "Política escrita",
  documento: DOCUMENTOS.alistamiento,
  seccion: "3 · Orden de la fila",
  momentos: [4, 5],
  valores: V_FECHA_LIMITE,
  campos: { dias: { etiqueta: "Días para alistar y despachar", unidad: "días" } },
  fn: (listo: FechaHora) => soloFecha(sumarDias(listo, V_FECHA_LIMITE.dias)),
})

export interface EnFila {
  id_pedido: string
  fechaLimite: string
  listoDesde: FechaHora
}

export const ORDEN_DE_LA_FILA = regla({
  id: "BOD-3.2",
  titulo: "Orden de la fila",
  texto:
    "La fila se ordena por fecha límite, no por forma de pago ni por quién llama. Desempate: primero el que lleva más horas listo. Si empatan, el número de pedido más bajo. Una llamada de un vendedor no cambia el orden: si la obra de verdad está parada, Marcela decide y lo anota.",
  fuente: "Política escrita",
  documento: DOCUMENTOS.alistamiento,
  seccion: "3 · Orden de la fila",
  momentos: [4],
  fn: (a: EnFila, b: EnFila) =>
    a.fechaLimite.localeCompare(b.fechaLimite) ||
    a.listoDesde.localeCompare(b.listoDesde) ||
    a.id_pedido.localeCompare(b.id_pedido),
})

// ── Momento 5 · Reloj de bodega ─────────────────────────────────────────────────

export const RELOJ_BODEGA = regla({
  id: "BOD-4.1",
  titulo: "Reloj de bodega",
  get texto() {
    const aviso = V_RELOJ_BODEGA.aviso_dia
    const tope = V_FECHA_LIMITE.dias
    return `Empieza en "listo desde" y termina cuando el pedido sale en camión. Días calendario, por fecha: el día en que quedó listo es el día 0. Antes del día ${aviso}, en plazo. Desde el día ${aviso}, aviso: sale marcado en la lista. Día ${tope}, vence hoy: sale de primero. Más de ${tope}, fuera de plazo: Marcela llama a Nelson ese mismo día. La rutina avisa. No reordena a mano ni despacha.`
  },
  fuente: "Política escrita",
  documento: DOCUMENTOS.alistamiento,
  seccion: "4 · Vigilar el reloj",
  momentos: [5],
  get valores() {
    return { aviso_dia: V_RELOJ_BODEGA.aviso_dia, tope_dias: V_FECHA_LIMITE.dias }
  },
  campos: { aviso_dia: { etiqueta: "Día del aviso", unidad: "días" } },
  heredaDe: FECHA_LIMITE.id,
  fn(dias: number): PasoReloj {
    const aviso = V_RELOJ_BODEGA.aviso_dia
    const tope = V_FECHA_LIMITE.dias
    if (dias > tope)
      return { clase: "vencido", palabra: "Fuera de plazo", queHace: "Marcela llama a Nelson ese mismo día", quien: "Marcela Ríos" }
    if (dias === tope)
      return { clase: "aviso", palabra: "Vence hoy", queHace: "Sale de primero en la lista", quien: "Rutina de la lista" }
    if (dias >= aviso)
      return { clase: "aviso", palabra: "Aviso", queHace: "Sale marcado en la lista del día", quien: "Rutina de la lista" }
    return { clase: "en-plazo", palabra: "En plazo", queHace: "Nada", quien: "—" }
  },
})

// ── Momento 7 · Entregar a transporte ───────────────────────────────────────────
// Estas reglas salen del pedido para la demo: ningún documento de 03-Areas habla de transporte.

export interface Faltante {
  sku: string
  descripcion: string
  unidad: string
  pedido: number
  cargado: number
  falta: number
}

export const SALIDA_COMPLETA = regla({
  id: "TRA-1",
  titulo: "Salida completa",
  texto:
    "Al entregar un pedido a transporte, Nelson anota por línea cuánto cargó. Si todas las líneas salen con la cantidad pedida, sale completo. Si falta algo, sale incompleto: Nelson escribe qué falta y por qué, y el faltante queda a la vista de Marcela y del vendedor. El sistema no frena la salida: avisa.",
  fuente: "Pedido del prototipo",
  documento: DOCUMENTOS.transporte,
  seccion: "Entregar a transporte",
  momentos: [7],
  fn(items: ItemPedido[], cargado: LineaCargada[]): { completo: boolean; faltantes: Faltante[] } {
    const faltantes = items
      .map((i) => {
        const c = cargado.find((x) => x.sku === i.sku)?.cantidad ?? 0
        return { sku: i.sku, descripcion: i.descripcion, unidad: i.unidad, pedido: i.cantidad, cargado: c, falta: Math.max(0, i.cantidad - c) }
      })
      .filter((x) => x.falta > 0)
    return { completo: faltantes.length === 0, faltantes }
  },
})

export const RELOJ_TRANSPORTE = regla({
  id: "TRA-2",
  titulo: "En camino",
  get texto() {
    return `Desde que Nelson entrega el pedido a transporte, está en camino hasta que la transportadora confirma la entrega. A las ${V_TRANSPORTE.aviso_h} horas sin confirmación, aviso: Nelson llama a la transportadora. No hay tope para el viaje: el transporte a la obra queda fuera del proyecto (Ops Charter). La rutina avisa. No decide.`
  },
  fuente: "Pedido del prototipo",
  documento: DOCUMENTOS.transporte,
  seccion: "Entregar a transporte",
  momentos: [7, 8],
  valores: V_TRANSPORTE,
  campos: { aviso_h: { etiqueta: "Aviso si nadie confirma la entrega", unidad: "h" } },
  fn(horas: number): PasoReloj {
    if (horas >= V_TRANSPORTE.aviso_h)
      return { clase: "aviso", palabra: "Sin confirmar", queHace: "Nelson llama a la transportadora", quien: "Nelson" }
    return { clase: "en-plazo", palabra: "En camino", queHace: "Nada", quien: "—" }
  },
})

// ── Momento 8 · Confirmar la entrega ────────────────────────────────────────────

export interface FaltaEvidencia {
  clave: "producto" | "documento" | "remision" | "nombre" | "firma"
  texto: string
}

export const EVIDENCIA_ENTREGA = regla({
  id: "TRA-3",
  titulo: "Evidencia de entrega",
  texto:
    "La transportadora confirma la entrega con dos fotos: el producto entregado y el documento de entrega (la remisión) con el nombre de quien recibe y su firma. Sin las dos fotos, con una foto borrosa, con el documento de otra remisión, sin nombre o sin firma, la entrega queda con alerta. Si quien recibe escribe una novedad en el documento, también.",
  fuente: "Pedido del prototipo",
  documento: DOCUMENTOS.transporte,
  seccion: "Confirmar la entrega",
  momentos: [8],
  fn(ev: EvidenciaCombinada, remisionEsperada: string): { completa: boolean; faltas: FaltaEvidencia[] } {
    const faltas: FaltaEvidencia[] = []
    if (ev.producto === "no") faltas.push({ clave: "producto", texto: "Falta la foto del producto entregado" })
    if (ev.producto === "borrosa") faltas.push({ clave: "producto", texto: "La foto del producto sale borrosa" })
    if (ev.documento === "no") faltas.push({ clave: "documento", texto: "Falta la foto del documento de entrega" })
    if (ev.documento === "borrosa") faltas.push({ clave: "documento", texto: "La foto del documento sale borrosa: no se lee" })
    if (ev.documento === "si") {
      if (ev.remision === null)
        faltas.push({ clave: "remision", texto: "El documento no deja ver el número de remisión" })
      else if (ev.remision !== remisionEsperada)
        faltas.push({ clave: "remision", texto: `El documento es de otra remisión (${ev.remision}, no ${remisionEsperada})` })
      if (!ev.nombre) faltas.push({ clave: "nombre", texto: "El documento no trae el nombre de quien recibe" })
      if (!ev.firma) faltas.push({ clave: "firma", texto: "El documento no está firmado" })
    }
    return { completa: faltas.length === 0, faltas }
  },
})

export const ALERTA_ENTREGA = regla({
  id: "TRA-4",
  titulo: "Alerta de entrega",
  texto:
    "Una alerta de entrega no cambia el estado del pedido ni lo bloquea. Avisa a Nelson y a Marcela y sigue abierta hasta que uno de los dos pide la evidencia otra vez o la da por buena con un motivo escrito. La lectura de las fotos la propone Claude. No decide.",
  fuente: "Pedido del prototipo",
  documento: DOCUMENTOS.transporte,
  seccion: "Confirmar la entrega",
  momentos: [8],
  /** La alerta sigue abierta mientras haya faltas o novedad y nadie la haya dado por buena. */
  fn: (hayFaltas: boolean, hayNovedad: boolean, atencion: "pedida" | "aceptada" | null) =>
    (hayFaltas || hayNovedad) && atencion !== "aceptada",
})

// ── Momento 6 · Revisión del lunes ──────────────────────────────────────────────

export interface FilaRevision {
  asignadoAndres: boolean
  /** Horas de espera con aprobación registrada; null si no se aprobó. */
  horasAprobado: number | null
  fueraDeRegla: boolean
}

export interface ResultadoIndicador {
  valor: number | null
  cumple: boolean | null
  detalle: string
}

export const INDICADOR_A = regla({
  id: "REV-A",
  titulo: "A · Pedidos de Andrés aprobados en plazo",
  get texto() {
    return `% de los pedidos que la tabla de la Política (sección 1) asigna a Andrés, con aprobación registrada, aprobados en ${V_RELOJ_APROBACION.tope_h} horas o menos. Meta: ${V_A.meta_pct}% o más. Dueño: Andrés Molina.`
  },
  fuente: "Política escrita",
  documento: DOCUMENTOS.revisionCredito,
  seccion: "Qué se mide",
  momentos: [6],
  valores: V_A,
  campos: { meta_pct: { etiqueta: "Meta", unidad: "%" } },
  fn(filas: FilaRevision[]): ResultadoIndicador {
    const base = filas.filter((f) => f.asignadoAndres && f.horasAprobado !== null)
    if (!base.length) return { valor: null, cumple: null, detalle: "Sin pedidos de Andrés aprobados" }
    const enPlazo = base.filter((f) => f.horasAprobado! <= V_RELOJ_APROBACION.tope_h).length
    const valor = (enPlazo / base.length) * 100
    return { valor, cumple: valor >= V_A.meta_pct, detalle: `${enPlazo} de ${base.length}` }
  },
})

export const INDICADOR_B = regla({
  id: "REV-B",
  titulo: "B · Espera de todo lo demás",
  get texto() {
    return `Promedio de horas de espera de los pedidos con aprobación que la tabla no asigna a Andrés. Meta: menos de ${V_RELOJ_APROBACION.tope_h} horas (el plazo de la Política, sección 3). Dueña: Marcela Ríos.`
  },
  fuente: "Política escrita",
  documento: DOCUMENTOS.revisionCredito,
  seccion: "Qué se mide",
  momentos: [6],
  get valores() {
    return { meta_h: V_RELOJ_APROBACION.tope_h }
  },
  heredaDe: RELOJ_APROBACION.id,
  fn(filas: FilaRevision[]): ResultadoIndicador {
    const base = filas.filter((f) => !f.asignadoAndres && f.horasAprobado !== null)
    if (!base.length) return { valor: null, cumple: null, detalle: "Sin aprobaciones" }
    const valor = base.reduce((s, f) => s + f.horasAprobado!, 0) / base.length
    return { valor, cumple: valor < V_RELOJ_APROBACION.tope_h, detalle: `${base.length} pedidos` }
  },
})

export const INDICADOR_C = regla({
  id: "REV-C",
  titulo: "C · Aprobaciones fuera de regla",
  get texto() {
    return `Cantidad de aprobaciones dadas por quien no correspondía (Política, sección 4). Meta: ${V_C.meta}. Dueña: Marcela Ríos.`
  },
  fuente: "Política escrita",
  documento: DOCUMENTOS.revisionCredito,
  seccion: "Qué se mide",
  momentos: [6],
  valores: V_C,
  campos: { meta: { etiqueta: "Meta", unidad: "" } },
  fn(filas: FilaRevision[]): ResultadoIndicador {
    const valor = filas.filter((f) => f.fueraDeRegla).length
    return { valor, cumple: valor <= V_C.meta, detalle: `${valor} de ${filas.length}` }
  },
})

export const PARA_ESCALAR = regla({
  id: "REV-L1",
  titulo: "Lista para escalar",
  texto: "Pedidos que la tabla asigna a Andrés y pasaron del plazo. Marcela se la lleva a Andrés ese mismo lunes.",
  fuente: "Política escrita",
  documento: DOCUMENTOS.revisionCredito,
  seccion: "Qué sale de la revisión",
  momentos: [6],
  fn: (asignadoAndres: boolean, horasEspera: number) => asignadoAndres && horasEspera > V_RELOJ_APROBACION.tope_h,
})

export const A_TIEMPO = regla({
  id: "PRY-1",
  titulo: "% a tiempo (meta del proyecto)",
  get texto() {
    return `Cada lunes, el % de pedidos a crédito despachados en la semana que salieron de bodega en ${V_A_TIEMPO.dias} días o menos desde la orden. Meta: ${V_A_TIEMPO.meta_pct}%.`
  },
  fuente: "Política escrita",
  documento: DOCUMENTOS.charter,
  seccion: "Cómo se mide",
  momentos: [6],
  valores: V_A_TIEMPO,
  campos: {
    dias: { etiqueta: "Días desde la orden", unidad: "días" },
    meta_pct: { etiqueta: "Meta", unidad: "%" },
  },
  fn(diasOrdenASalida: number[]): ResultadoIndicador {
    if (!diasOrdenASalida.length) return { valor: null, cumple: null, detalle: "Sin despachos en la semana" }
    const ok = diasOrdenASalida.filter((d) => d <= V_A_TIEMPO.dias).length
    const valor = (ok / diasOrdenASalida.length) * 100
    return { valor, cumple: valor >= V_A_TIEMPO.meta_pct, detalle: `${ok} de ${diasOrdenASalida.length}` }
  },
})

// ── Reglas de Marcela · Casos resueltos ─────────────────────────────────────────
// Los casos no copian reglas: dicen qué regla de la Política resuelve cada duda.
// `fn` dice si la duda del caso aparece en un pedido (null = no se puede saber).

export const CASO_1 = regla({
  id: "CASO-1",
  titulo: "Caso 1 · \"El cliente tiene facturas vencidas\"",
  get texto() {
    return `¿Cualquier factura vencida va a Andrés? No. Solo si la más antigua tiene más de ${V_ATRASO.max_dias} días.`
  },
  fuente: "Regla de Marcela",
  documento: DOCUMENTOS.casos,
  seccion: "Caso 1",
  momentos: [1, 2],
  seApoyaEn: CHEQUEO_ATRASO.id,
  fn: (p: Pedido) => (p.dias_atraso === null ? null : p.dias_atraso > 0 && p.dias_atraso <= V_ATRASO.max_dias),
})

export const CASO_2 = regla({
  id: "CASO-2",
  titulo: "Caso 2 · \"Al cliente le queda poco cupo\"",
  texto: "¿Si el saldo ya es alto, mejor que lo vea Andrés? No. Si cabe, cabe.",
  fuente: "Regla de Marcela",
  documento: DOCUMENTOS.casos,
  seccion: "Caso 2",
  momentos: [1, 2],
  seApoyaEn: CHEQUEO_CUPO.id,
  /** El caso no dice cuánto es "poco cupo": no se detecta solo. */
  fn: (): boolean | null => null,
})

export const CASO_3 = regla({
  id: "CASO-3",
  titulo: "Caso 3 · \"Es un pedido grande\"",
  get texto() {
    return `¿Un pedido de más de ${fmtCOP(V_CASO_3.costumbre_vieja_cop)} va a Andrés? No. El único máximo es el de la Política. Ese tope era una costumbre vieja.`
  },
  fuente: "Regla de Marcela",
  documento: DOCUMENTOS.casos,
  seccion: "Caso 3",
  momentos: [1, 2],
  seApoyaEn: CHEQUEO_MAXIMO.id,
  valores: V_CASO_3,
  campos: { costumbre_vieja_cop: { etiqueta: "Tope viejo (costumbre)", unidad: "COP" } },
  fn: (p: Pedido) => p.valor_cop > V_CASO_3.costumbre_vieja_cop && p.valor_cop <= V_MAXIMO.maximo_cop,
})

export const CASO_4 = regla({
  id: "CASO-4",
  titulo: "Caso 4 · \"Es cliente de Andrés\"",
  texto:
    "¿Nogal y Los Cerros se le pasan siempre a Andrés? No. En crédito no hay dueño de cuenta. Andrés ve esos pedidos el lunes, ya aprobados, para estar al tanto.",
  fuente: "Regla de Marcela",
  documento: DOCUMENTOS.casos,
  seccion: "Caso 4",
  momentos: [1, 6],
  seApoyaEn: ASIGNAR_APROBADOR.id,
  fn: (p: Pedido) => /^Constructora (Nogal|Los Cerros)\b/.test(p.cliente),
})

export const CASO_5 = regla({
  id: "CASO-5",
  titulo: "Caso 5 · \"Me falta un dato\"",
  texto: "¿Se le pasa a Andrés para no frenar? No. La solicitud queda incompleta y se le pide el dato a Sandra.",
  fuente: "Regla de Marcela",
  documento: DOCUMENTOS.casos,
  seccion: "Caso 5",
  momentos: [1, 2],
  seApoyaEn: DATO_FALTANTE.id,
  fn: (p: Pedido) => DATO_FALTANTE.fn(p).length > 0,
})

export interface CasoNuevo {
  fecha: string
  pedido: string
  duda: string
  decision: string
  quien: string
}

export const CASOS_NUEVOS = regla({
  id: "CASO-N",
  titulo: "Casos nuevos",
  texto:
    "Cuando ninguna regla ni caso cubre la duda, decide Marcela y lo anota con la fecha, el pedido, la duda y lo que se decidió. Si el mismo caso aparece dos veces, se vuelve un caso resuelto o un cambio de Política.",
  fuente: "Regla de Marcela",
  documento: DOCUMENTOS.casos,
  seccion: "Casos nuevos",
  momentos: [3],
  seApoyaEn: NINGUNA_REGLA_CUBRE.id,
  /** La tabla del documento está vacía. */
  fn: (): CasoNuevo[] => [],
})

export const CASOS_RESUELTOS = [CASO_1, CASO_2, CASO_3, CASO_4, CASO_5]

// ── Permisos por rol ────────────────────────────────────────────────────────────

export const VER_INFO_CREDITO = regla({
  id: "PER-1",
  titulo: "Quién ve la información de crédito",
  texto:
    "Andrés, Marcela y Sandra ven el valor de los pedidos y el cupo, saldo, atraso y antigüedad de los clientes. Nelson (bodega) y los vendedores ven solo el nombre del cliente.",
  fuente: "Permiso del prototipo",
  documento: DOCUMENTOS.prototipo,
  seccion: "Visibilidad",
  momentos: [1, 2, 4, 6],
  fn: (rol: Persona) => rol !== "Nelson" && !VENDEDORES.includes(rol),
})

export const IMPORTAR_CARTERA = regla({
  id: "PER-7",
  titulo: "Quién importa el corte de cartera",
  texto:
    "El saldo y el atraso los entrega el informe de cartera de Sandra Beltrán. En la opción A, Sandra importa cada mañana el corte de partidas abiertas de SAP. Cada corte reemplaza al anterior.",
  fuente: "Política escrita",
  documento: DOCUMENTOS.politica,
  seccion: "2 · Preparar la decisión",
  momentos: [1, 2],
  fn: (rol: Persona) => rol === "Sandra Beltrán",
})

export const IMPORTAR_SOLICITUDES = regla({
  id: "PER-5",
  titulo: "Quién importa las solicitudes de SAP",
  texto:
    "Opción A (satélite). Cada mañana Marcela Ríos o Sandra Beltrán descargan de SAP el archivo de solicitudes y lo importan. Una solicitud que ya está en la app no se vuelve a importar.",
  fuente: "Permiso del prototipo",
  documento: DOCUMENTOS.prototipo,
  seccion: "Llega la solicitud",
  momentos: [1],
  fn: (rol: Persona) => rol === "Marcela Ríos" || rol === "Sandra Beltrán",
})

export const CREAR_SOLICITUD = regla({
  id: "PER-6",
  titulo: "Quién crea una solicitud en la app",
  texto:
    "Opción B (solución completa). Los vendedores crean la solicitud de crédito en la app. Al crearla ven quién la aprueba y qué fecha de salida de bodega pueden prometer.",
  fuente: "Permiso del prototipo",
  documento: DOCUMENTOS.prototipo,
  seccion: "Llega la solicitud",
  momentos: [1],
  fn: (rol: Persona) => VENDEDORES.includes(rol),
})

export const ENTREGAR_A_TRANSPORTE = regla({
  id: "PER-8",
  titulo: "Quién entrega a transporte y quién atiende las alertas",
  texto:
    "Solo Nelson (bodega) registra que un pedido se entregó a transporte. Nelson y Marcela atienden las alertas de entrega: piden la evidencia otra vez o la dan por buena, con motivo escrito.",
  fuente: "Permiso del prototipo",
  documento: DOCUMENTOS.prototipo,
  seccion: "Transporte",
  momentos: [7, 8],
  fn: (rol: Persona) => ({
    entregar: rol === "Nelson",
    atender: rol === "Nelson" || rol === "Marcela Ríos",
  }),
})

export const CREAR_CLIENTES = regla({
  id: "PER-2",
  titulo: "Quién crea clientes",
  texto: "Solo Sandra Beltrán (administración y cartera) crea clientes. Los demás los consultan.",
  fuente: "Permiso del prototipo",
  documento: DOCUMENTOS.prototipo,
  seccion: "Clientes",
  momentos: [1],
  fn: (rol: Persona) => rol === "Sandra Beltrán",
})

export const EDITAR_REGLA = regla({
  id: "PER-3",
  titulo: "Quién edita una regla",
  texto:
    "Solo el dueño de cada documento tiene permiso de edición. El resto del equipo lo lee. Así una regla no cambia sin que su dueño lo decida. El cambio se escribe el mismo día y sube la versión.",
  fuente: "Política escrita",
  documento: DOCUMENTOS.sistema,
  seccion: "Por qué",
  momentos: [1, 2, 3, 4, 5, 6],
  fn: (rol: Persona, r: Regla) => r.documento.dueno === rol,
})

export const FIRMAR_PEDIDO = regla({
  id: "PER-4",
  titulo: "Quién firma y quién pide el dato",
  texto:
    "Firma (aprueba o rechaza) solo quien asigna la tabla de la Política (CRED-1.1). Si falta un dato, nadie firma: Marcela, dueña de \"Preparar la decisión\", pide el dato.",
  fuente: "Política escrita",
  documento: DOCUMENTOS.politica,
  seccion: "1 · Llegada de la solicitud y 2 · Preparar la decisión",
  momentos: [3],
  fn: (rol: Persona, a: Asignacion) => ({
    firmar: a.decide.includes(rol),
    pedirDato: a.decide.includes(rol) || (a.tipo === "incompleta" && rol === "Marcela Ríos"),
  }),
})

/** Todas las reglas, para /reglas y para el diálogo de cada regla. */
export const REGLAS: Regla[] = [
  SALDO_PENDIENTE,
  DIAS_DE_ATRASO,
  CRUCE_DEL_LIMITE,
  PAGO_SIN_APLICAR,
  SALDO_VENCIDO,
  ASIGNAR_APROBADOR,
  ...CHEQUEOS,
  DATO_FALTANTE,
  FICHA,
  RELOJ_APROBACION,
  AVISO_WHATSAPP,
  RESPUESTA_WHATSAPP,
  FUERA_DE_REGLA,
  NINGUNA_REGLA_CUBRE,
  MOTIVO_ESCRITO,
  ENTRADA_A_LA_FILA,
  REMISION_SIN_FIRMA,
  FECHA_LIMITE,
  ORDEN_DE_LA_FILA,
  RELOJ_BODEGA,
  SALIDA_COMPLETA,
  RELOJ_TRANSPORTE,
  EVIDENCIA_ENTREGA,
  ALERTA_ENTREGA,
  INDICADOR_A,
  INDICADOR_B,
  INDICADOR_C,
  PARA_ESCALAR,
  A_TIEMPO,
  ...CASOS_RESUELTOS,
  CASOS_NUEVOS,
  VER_INFO_CREDITO,
  ENTREGAR_A_TRANSPORTE,
  CREAR_CLIENTES,
  EDITAR_REGLA,
  FIRMAR_PEDIDO,
  IMPORTAR_SOLICITUDES,
  CREAR_SOLICITUD,
  IMPORTAR_CARTERA,
] as Regla[]

export const reglaPorId = (id: string) => REGLAS.find((r) => r.id === id)

// ── Edición de números ──────────────────────────────────────────────────────────
// Los objetos V_* son el único lugar de cada número. Editar una regla cambia ese
// número y todas las pantallas se recalculan. Al reiniciar la demo vuelven al documento.

const NUMEROS: Record<string, Record<string, number>> = {
  [CHEQUEO_MAXIMO.id]: V_MAXIMO,
  [CHEQUEO_ATRASO.id]: V_ATRASO,
  [CHEQUEO_CLIENTE_NUEVO.id]: V_CLIENTE_NUEVO,
  [RELOJ_APROBACION.id]: V_RELOJ_APROBACION,
  [AVISO_WHATSAPP.id]: V_AVISO,
  [FECHA_LIMITE.id]: V_FECHA_LIMITE,
  [RELOJ_BODEGA.id]: V_RELOJ_BODEGA,
  [RELOJ_TRANSPORTE.id]: V_TRANSPORTE,
  [INDICADOR_A.id]: V_A,
  [INDICADOR_C.id]: V_C,
  [A_TIEMPO.id]: V_A_TIEMPO,
  [CASO_3.id]: V_CASO_3,
}

const DEL_DOCUMENTO = JSON.parse(JSON.stringify(NUMEROS)) as typeof NUMEROS

/** Valor actual de un número propio de una regla. */
export const numeroDe = (id: string, clave: string) => NUMEROS[id]?.[clave]

/** Valor que trae el documento (antes de cualquier edición en la demo). */
export const numeroDelDocumento = (id: string, clave: string) => DEL_DOCUMENTO[id]?.[clave]

/** Revisa un número antes de guardarlo. Devuelve el error o null. */
export function validarNumero(id: string, clave: string, valor: number): string | null {
  if (!Number.isFinite(valor) || valor < 0) return "Escribe un número igual o mayor que 0."
  if (!Number.isInteger(valor)) return "Usa un número entero."
  if (id === RELOJ_APROBACION.id) {
    const otro = { ...V_RELOJ_APROBACION, [clave]: valor }
    if (otro.aviso_h >= otro.tope_h) return "El aviso tiene que llegar antes del tope."
  }
  if (id === AVISO_WHATSAPP.id && clave === "max_recordatorios" && valor > 20) return "Hasta 20 recordatorios."
  if (id === AVISO_WHATSAPP.id && clave !== "max_recordatorios" && (valor < 1 || valor > V_RELOJ_APROBACION.tope_h))
    return `Va de 1 hora al tope de aprobación (${V_RELOJ_APROBACION.tope_h} h).`
  if (id === RELOJ_BODEGA.id && valor >= V_FECHA_LIMITE.dias) return "El aviso tiene que llegar antes del día límite."
  if (id === FECHA_LIMITE.id && valor <= V_RELOJ_BODEGA.aviso_dia) return "El día límite tiene que ser después del día del aviso."
  if (clave.startsWith("meta_pct") && valor > 100) return "Un porcentaje va de 0 a 100."
  return null
}

/** Cambia un número propio de una regla. Solo se llama desde un evento, nunca al pintar. */
export function cambiarNumero(id: string, clave: string, valor: number) {
  NUMEROS[id][clave] = valor
}

/** Vuelve todos los números a los del documento. */
export function restaurarNumeros() {
  for (const id of Object.keys(NUMEROS)) Object.assign(NUMEROS[id], DEL_DOCUMENTO[id])
}
