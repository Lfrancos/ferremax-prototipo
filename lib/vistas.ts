import { HOY } from "./data"
import { combinarEvidencia, remisionDe } from "./evidencia"
import { diaDeSemana, diasCalendario, enRango, esAntes, horasEntre, soloFecha, sumarDias, sumarHoras } from "./fechas"
import { fmtCOP, fmtDias, fmtHoras } from "./formato"
import { lineasDe } from "./lineas"
import {
  A_TIEMPO,
  ALERTA_ENTREGA,
  ASIGNAR_APROBADOR,
  CASO_4,
  CHEQUEO_ATRASO,
  CHEQUEO_CLIENTE_NUEVO,
  CHEQUEO_CUPO,
  CHEQUEOS,
  CRUCE_DEL_LIMITE,
  DIAS_DE_ATRASO,
  SALDO_PENDIENTE,
  SALDO_VENCIDO,
  ENTRADA_A_LA_FILA,
  EVIDENCIA_ENTREGA,
  FECHA_LIMITE,
  FUERA_DE_REGLA,
  INDICADOR_A,
  INDICADOR_B,
  INDICADOR_C,
  ORDEN_DE_LA_FILA,
  PARA_ESCALAR,
  RELOJ_APROBACION,
  RELOJ_BODEGA,
  RELOJ_TRANSPORTE,
  SALIDA_COMPLETA,
  type ClaseEstado,
  type Faltante,
  type FaltaEvidencia,
  type FilaRevision,
  type PasoReloj,
} from "./rules"
import {
  ACCIONES_INFORMATIVAS,
  type Accion,
  type Cliente,
  type CorteCartera,
  type EvidenciaCombinada,
  type Estado,
  type Evento,
  type FechaHora,
  type MensajeTransporte,
  type PartidaAbierta,
  type Pedido,
  type PedidoRegistro,
  type Persona,
} from "./tipos"

// VISTAS CALCULADAS. Nada aquí guarda datos: todo sale de los clientes y pedidos
// (lib/data.ts más las acciones de la sesión) y de las reglas (lib/rules.ts).

// ── Pedido + cliente ────────────────────────────────────────────────────────────

// ── Cartera de un cliente ───────────────────────────────────────────────────────

export interface EstadoCartera {
  partidas: PartidaAbierta[]
  saldo: number | null
  /** Saldo abierto de las facturas ya vencidas (CART-5). */
  saldoVencido: number | null
  atraso: number | null
  /** Factura vencida más antigua (la que da el atraso). */
  facturaMasAntigua: string | null
  pagoSinAplicar: number
  /** Desde qué día falla el chequeo 3 (CART-3). */
  cruce: { fecha: FechaHora; factura: string } | null
}

/** Saldo, atraso y cruce del límite de un cliente, calculados sobre el corte de cartera. */
export function estadoCartera(id_cliente: string, cartera: CorteCartera, hoy: FechaHora = HOY): EstadoCartera {
  const partidas = cartera.partidas.filter((p) => p.id_cliente === id_cliente)
  const atraso = DIAS_DE_ATRASO.fn(partidas, hoy)
  return {
    partidas,
    saldo: SALDO_PENDIENTE.fn(partidas),
    saldoVencido: SALDO_VENCIDO.fn(partidas, hoy),
    atraso: atraso.dias,
    facturaMasAntigua: atraso.factura,
    pagoSinAplicar: partidas.filter((p) => p.tipo === "Pago sin aplicar").reduce((s, p) => s + p.valor_cop, 0),
    cruce: CRUCE_DEL_LIMITE.fn(partidas),
  }
}

/** Clientes con facturas abiertas, ordenados por el día en que cruzan (o cruzaron) el límite de atraso. */
export function crucesDelLimite(clientes: Cliente[], cartera: CorteCartera, hoy: FechaHora = HOY) {
  return clientes
    .map((cliente) => ({ cliente, estado: estadoCartera(cliente.id_cliente, cartera, hoy) }))
    .filter((x) => x.estado.cruce !== null)
    .map((x) => ({ ...x, faltan: diasCalendario(hoy, x.estado.cruce!.fecha) }))
    .sort((a, b) => a.estado.cruce!.fecha.localeCompare(b.estado.cruce!.fecha))
}

/** Horas desde el corte de cartera hasta ahora. */
export const edadDelCorte = (cartera: CorteCartera, hoy: FechaHora = HOY) => horasEntre(cartera.corte, hoy)

// ── Pedido + cliente + cartera ──────────────────────────────────────────────────

/** Une cada pedido con su cliente, su cartera y los mensajes de la transportadora, con los nombres de columna del extracto semanal. */
export function unirPedidos(
  registros: PedidoRegistro[],
  clientes: Cliente[],
  cartera: CorteCartera,
  mensajes: MensajeTransporte[] = [],
  hoy: FechaHora = HOY,
): Pedido[] {
  const porId = new Map(clientes.map((c) => [c.id_cliente, c]))
  const estados = new Map<string, EstadoCartera>()
  return registros.map((r) => {
    const c = porId.get(r.id_cliente)!
    if (!estados.has(c.id_cliente)) estados.set(c.id_cliente, estadoCartera(c.id_cliente, cartera, hoy))
    const e = estados.get(c.id_cliente)!
    return {
      ...r,
      cliente: c.razon_social,
      cupo_cop: c.cupo_cop,
      saldo_pendiente_cop: e.saldo,
      dias_atraso: e.atraso,
      factura_mas_antigua: e.facturaMasAntigua,
      saldo_vencido_cop: e.saldoVencido,
      pago_sin_aplicar_cop: e.pagoSinAplicar,
      antiguedad_anios: c.antiguedad_anios,
      mensajes: mensajes.filter((m) => m.id_pedido === r.id_pedido),
    }
  })
}

/** Cupo que le queda al cliente. null si el saldo está en blanco. */
export const cupoDisponible = (c: Cliente, e: EstadoCartera) => (e.saldo === null ? null : c.cupo_cop - e.saldo)

/**
 * Chequeos que dependen solo del cliente (atraso, cliente nuevo, saldo en blanco),
 * corridos con las mismas reglas que un pedido. Los que fallan mandan sus pedidos a Andrés.
 */
export function chequeosDeCliente(c: Cliente, cartera: CorteCartera) {
  const comoPedido = unirPedidos([{ id_pedido: "", id_cliente: c.id_cliente, valor_cop: 0, lineas: 0, eventos: [] }], [c], cartera)[0]
  return [CHEQUEO_CUPO, CHEQUEO_ATRASO, CHEQUEO_CLIENTE_NUEVO]
    .map((regla) => ({ regla, resultado: regla.fn(comoPedido) }))
    .filter((x) => x.resultado.pasa !== true)
}

// ── Ficha de decisión ───────────────────────────────────────────────────────────

export interface ResumenDecision {
  pedido: number
  cupoAutorizado: number
  /** null = el saldo está en blanco. */
  cupoDisponible: number | null
  saldoVencido: number | null
  /** Cuánto se pasa el pedido del cupo disponible; 0 si cabe. */
  excesoCupo: number
  /** Chequeos que no pasan, dichos como condición ("Excede cupo disponible"). */
  condiciones: string[]
  /** Hechos de los datos, una frase cada uno. */
  informacion: string[]
  /** Hay algo que revisar antes de decidir. */
  requiereRevision: boolean
}

const CONDICION_DE: Record<string, (p: Pedido) => string> = {
  "CRED-2.1": () => "Supera el máximo por pedido",
  "CRED-2.2": () => "Excede cupo disponible",
  "CRED-2.3": (p) => `Atraso de ${p.dias_atraso} días`,
  "CRED-2.4": (p) => `Cliente nuevo (${p.antiguedad_anios} ${p.antiguedad_anios === 1 ? "año" : "años"})`,
}

/**
 * Lo que necesita quien aprueba para decidir, en una sola ficha: pedido, cupo autorizado y disponible,
 * saldo vencido y la condición que lo manda a revisión. Son los mismos datos y chequeos de siempre;
 * aquí solo se ordenan y se dicen en frases. No decide nada.
 */
export function resumenDecision(p: Pedido): ResumenDecision {
  const cupoDisponible = p.saldo_pendiente_cop === null ? null : p.cupo_cop - p.saldo_pendiente_cop
  const excesoCupo = cupoDisponible === null ? 0 : Math.max(0, p.valor_cop - cupoDisponible)
  const condiciones: string[] = []
  for (const c of CHEQUEOS) {
    const r = c.fn(p)
    if (r.pasa === false) condiciones.push(CONDICION_DE[c.id](p))
    if (r.pasa === null) condiciones.push(`Falta ${r.falta}`)
  }
  const informacion: string[] = []
  if (excesoCupo > 0) informacion.push(`El pedido supera el cupo disponible en COP ${fmtCOP(excesoCupo)}.`)
  if (p.saldo_vencido_cop !== null && p.saldo_vencido_cop > 0) {
    const atraso = p.dias_atraso ? ` La factura vencida más antigua lleva ${fmtDias(p.dias_atraso)}.` : ""
    informacion.push(`Existe cartera vencida de COP ${fmtCOP(p.saldo_vencido_cop)}.${atraso}`)
  }
  if (p.pago_sin_aplicar_cop > 0)
    informacion.push(`El cliente tiene un pago sin aplicar de COP ${fmtCOP(p.pago_sin_aplicar_cop)}.`)
  return {
    pedido: p.valor_cop,
    cupoAutorizado: p.cupo_cop,
    cupoDisponible,
    saldoVencido: p.saldo_vencido_cop,
    excesoCupo,
    condiciones,
    informacion,
    requiereRevision: condiciones.length > 0,
  }
}

// ── Lo básico de un pedido ──────────────────────────────────────────────────────

export const eventoDe = (p: Pedido, accion: Accion) => p.eventos.find((e) => e.accion === accion)

/** El estado es el último evento que cambia el estado: los informativos solo dejan constancia. */
export function estadoDeEventos(eventos: Evento[]): Estado {
  const ultimo = [...eventos].reverse().find((e) => !ACCIONES_INFORMATIVAS.includes(e.accion))
  return ultimo!.accion as Estado
}

export const estadoActual = (p: Pick<Pedido, "eventos">): Estado => estadoDeEventos(p.eventos)

export const fechaSolicitud = (p: Pedido) => eventoDe(p, "solicitado")!.fecha
export const aprobacion = (p: Pedido) => eventoDe(p, "aprobado")
export const aprobo = (p: Pedido) => aprobacion(p)?.quien
export const decision = (p: Pedido) => eventoDe(p, "aprobado") ?? eventoDe(p, "rechazado")
export const asignacion = (p: Pedido) => ASIGNAR_APROBADOR.fn(p)

/** En crédito, "listo desde" es la hora de aprobación (Regla de alistamiento, sección 1). */
export const listoDesde = (p: Pedido) => aprobacion(p)?.fecha

export const ETIQUETA_ESTADO: Record<Estado, string> = {
  solicitado: "Solicitado",
  por_aprobar: "Por aprobar",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
  en_alistamiento: "En alistamiento",
  despachado: "En camino",
  entregado: "Entregado",
}

// ── Tramos y relojes ────────────────────────────────────────────────────────────

export type Tramo = "aprobar" | "bodega" | "camino" | "cerrado"

export function tramoDe(p: Pick<Pedido, "eventos">): Tramo {
  const e = estadoActual(p)
  if (e === "solicitado" || e === "por_aprobar") return "aprobar"
  if (e === "aprobado" || e === "en_alistamiento") return "bodega"
  if (e === "despachado") return "camino"
  return "cerrado"
}

export const NOMBRE_TRAMO: Record<Tramo, string> = {
  aprobar: "Aprobar",
  bodega: "Alistar y despachar",
  camino: "En camino",
  cerrado: "Cerrado",
}

/**
 * Lo que se puede filtrar en el tablero: un tramo, o los pedidos cerca del tope o fuera de tope.
 * Las tarjetas de arriba y las pestañas de la tabla usan el mismo filtro.
 */
export type Filtro = Tramo | "todos" | "cerca" | "fuera"

export function coincideFiltro(p: Pedido, f: Filtro, hoy: FechaHora = HOY) {
  if (f === "todos") return true
  if (f === "cerca") return relojActual(p, hoy)?.clase === "aviso"
  if (f === "fuera") return relojActual(p, hoy)?.clase === "vencido"
  return tramoDe(p) === f
}

/** Horas corridas desde la solicitud hasta la decisión (o hasta ahora). */
export function horasDeEspera(p: Pedido, hoy: FechaHora = HOY) {
  return horasEntre(fechaSolicitud(p), decision(p)?.fecha ?? hoy)
}

/** Días calendario desde "listo desde" hasta la salida en camión (o hasta el corte). */
export function diasEnBodega(p: Pedido, corte: FechaHora = HOY) {
  const listo = listoDesde(p)
  if (!listo) return null
  return diasCalendario(listo, eventoDe(p, "despachado")?.fecha ?? corte)
}

export interface TiempoTotal {
  /** Horas corridas desde la solicitud hasta hoy, o hasta que el pedido terminó (entregado o rechazado). */
  horas: number
  terminado: boolean
  /** Días calendario de la solicitud a la salida de bodega (o hasta hoy si no ha salido): lo que mide el proyecto (PRY-1). */
  diasHastaSalida: number
  salio: boolean
  /** Más días que la meta del proyecto. */
  pasaDeLaMeta: boolean
}

/** El tiempo total de un pedido, de punta a punta: complementa el reloj de cada tramo. */
export function tiempoTotal(p: Pedido, hoy: FechaHora = HOY): TiempoTotal {
  const fin = eventoDe(p, "entregado")?.fecha ?? eventoDe(p, "rechazado")?.fecha
  const salida = eventoDe(p, "despachado")?.fecha
  const diasHastaSalida = diasCalendario(fechaSolicitud(p), salida ?? fin ?? hoy)
  return {
    horas: horasEntre(fechaSolicitud(p), fin ?? hoy),
    terminado: fin !== undefined,
    diasHastaSalida,
    salio: salida !== undefined,
    pasaDeLaMeta: diasHastaSalida > A_TIEMPO.valores!.dias,
  }
}

export interface Reloj extends PasoReloj {
  tramo: "aprobar" | "bodega"
  actual: string
  tope: string
  /** Avance contra el tope (1 = en el tope). */
  fraccion: number
}

export function relojAprobacion(p: Pedido, hoy: FechaHora = HOY): Reloj {
  const horas = horasDeEspera(p, hoy)
  const tope = RELOJ_APROBACION.valores!.tope_h
  return {
    tramo: "aprobar",
    ...RELOJ_APROBACION.fn(horas),
    actual: fmtHoras(horas),
    tope: `${tope} h`,
    fraccion: horas / tope,
  }
}

export function relojBodega(p: Pedido, corte: FechaHora = HOY): Reloj | null {
  const dias = diasEnBodega(p, corte)
  if (dias === null) return null
  const tope = FECHA_LIMITE.valores!.dias
  return {
    tramo: "bodega",
    ...RELOJ_BODEGA.fn(dias),
    actual: `día ${dias}`,
    tope: `${tope} días`,
    fraccion: dias / tope,
  }
}

/** El reloj del tramo en el que está el pedido. Cerrado no tiene reloj. */
export function relojActual(p: Pedido, hoy: FechaHora = HOY): Reloj | null {
  const t = tramoDe(p)
  if (t === "aprobar") return relojAprobacion(p, hoy)
  if (t === "bodega") return relojBodega(p, hoy)
  return null
}

// ── Quién decide ────────────────────────────────────────────────────────────────

export const NOMBRE_ACCION: Record<Accion, string> = {
  ...ETIQUETA_ESTADO,
  despachado: "Entregado a transporte",
  info_pedida: "Pidió información",
  evidencia_recibida: "Evidencia de entrega",
  evidencia_pedida: "Evidencia pedida de nuevo",
  evidencia_aceptada: "Evidencia dada por buena",
}

export function quienDecide(p: Pedido): { texto: string; personas: Persona[] } {
  const t = tramoDe(p)
  if (t === "bodega") return { texto: "Nelson", personas: ["Nelson"] }
  if (t === "camino") return { texto: "Transportadora", personas: [] }
  if (t === "cerrado") return { texto: "—", personas: [] }
  const a = asignacion(p)
  if (a.tipo === "incompleta") return { texto: "Incompleta · dato a Sandra", personas: ["Sandra Beltrán"] }
  return { texto: a.texto, personas: a.decide }
}

export function fueraDeRegla(p: Pedido) {
  const ap = aprobacion(p)
  return ap ? FUERA_DE_REGLA.fn(asignacion(p), ap.quien) : false
}

// ── Momento 4 · Lista de alistamiento ───────────────────────────────────────────

export interface FilaBodega extends PasoReloj {
  pedido: Pedido
  listoDesde: FechaHora
  fechaLimite: string
  dias: number
}

/** La próxima lista de las 7:00 a.m. después de `hoy`, en el orden de la regla. */
export function listaDeAlistamiento(pedidos: Pedido[], hoy: FechaHora = HOY) {
  const corte = ENTRADA_A_LA_FILA.fn(hoy)
  const filas: FilaBodega[] = pedidos
    .filter((p) => tramoDe(p) === "bodega")
    .filter((p) => !esAntes(corte, ENTRADA_A_LA_FILA.fn(listoDesde(p)!)))
    .map((p) => {
      const listo = listoDesde(p)!
      const dias = diasCalendario(listo, corte)
      return { pedido: p, listoDesde: listo, fechaLimite: FECHA_LIMITE.fn(listo), dias, ...RELOJ_BODEGA.fn(dias) }
    })
    .sort((a, b) =>
      ORDEN_DE_LA_FILA.fn(
        { id_pedido: a.pedido.id_pedido, fechaLimite: a.fechaLimite, listoDesde: a.listoDesde },
        { id_pedido: b.pedido.id_pedido, fechaLimite: b.fechaLimite, listoDesde: b.listoDesde },
      ),
    )
  return { corte, filas }
}

// ── Momento 5 · Rutina diaria ───────────────────────────────────────────────────

export function alertas(pedidos: Pedido[], hoy: FechaHora = HOY) {
  const conReloj = pedidos
    .map((p) => ({ pedido: p, reloj: relojActual(p, hoy) }))
    .filter((x): x is { pedido: Pedido; reloj: Reloj } => x.reloj !== null && x.reloj.clase !== "en-plazo")
    .sort((a, b) => b.reloj.fraccion - a.reloj.fraccion)
  return {
    aprobar: conReloj.filter((x) => x.reloj.tramo === "aprobar"),
    bodega: conReloj.filter((x) => x.reloj.tramo === "bodega"),
  }
}

// ── Momentos 7 y 8 · Transporte ─────────────────────────────────────────────────

export interface Entrega {
  etapa: "en_camino" | "entregada"
  salio: FechaHora
  /** Cuando la transportadora confirmó. null = todavía en camino. */
  llego: FechaHora | null
  /** Horas desde que salió hasta que llegó (o hasta ahora). */
  horas: number
  reloj: PasoReloj
  /** Lo cargado contra lo pedido (TRA-1). */
  carga: { completo: boolean; faltantes: Faltante[] }
  evidencia: EvidenciaCombinada
  faltas: FaltaEvidencia[]
  /** Lo que escribió quien recibió en el documento. */
  novedad: string | null
  /** Lo último que hizo una persona con la alerta, si ya hubo mensajes. */
  atencion: "pedida" | "aceptada" | null
  /** Alerta de entrega abierta (TRA-4). */
  alerta: boolean
  estado: { clase: ClaseEstado | "aprobado"; palabra: string }
}

/** Cómo va la entrega de un pedido que ya salió de bodega. null si todavía no sale. */
export function entregaDe(p: Pedido, hoy: FechaHora = HOY): Entrega | null {
  const salida = eventoDe(p, "despachado")
  if (!salida) return null
  const llego = eventoDe(p, "entregado")?.fecha ?? null
  const horas = horasEntre(salida.fecha, llego ?? hoy)
  const reloj = RELOJ_TRANSPORTE.fn(horas)
  const carga = p.despacho ? SALIDA_COMPLETA.fn(lineasDe(p), p.despacho.cargado) : { completo: true, faltantes: [] }

  const evidencia = combinarEvidencia(p.mensajes, remisionDe(p.id_pedido))
  const { faltas } = EVIDENCIA_ENTREGA.fn(evidencia, remisionDe(p.id_pedido))
  let atencion: Entrega["atencion"] = null
  for (const e of p.eventos) {
    if (e.accion === "evidencia_recibida") atencion = null
    else if (e.accion === "evidencia_pedida") atencion = "pedida"
    else if (e.accion === "evidencia_aceptada") atencion = "aceptada"
  }
  const etapa = llego ? "entregada" : "en_camino"
  const alerta = etapa === "entregada" && ALERTA_ENTREGA.fn(faltas.length > 0, !!evidencia.novedad, atencion)

  let estado: Entrega["estado"]
  if (etapa === "en_camino")
    estado = reloj.clase === "aviso" ? { clase: "aviso", palabra: `Sin confirmar · ${fmtHoras(horas)}` } : { clase: "en-plazo", palabra: "En camino" }
  else if (alerta) estado = atencion === "pedida" ? { clase: "aviso", palabra: "Evidencia pedida" } : { clase: "vencido", palabra: "Entrega con alerta" }
  else estado = { clase: "aprobado", palabra: "Entrega confirmada" }

  return { etapa, salio: salida.fecha, llego, horas, reloj, carga, evidencia, faltas, novedad: evidencia.novedad, atencion, alerta, estado }
}

/** Todo lo que ya salió de bodega, partido en lo que importa mirar. */
export function transporte(pedidos: Pedido[], hoy: FechaHora = HOY) {
  const filas = pedidos.flatMap((pedido) => {
    const entrega = entregaDe(pedido, hoy)
    return entrega ? [{ pedido, entrega }] : []
  })
  const enCamino = filas.filter((f) => f.entrega.etapa === "en_camino").sort((a, b) => b.entrega.horas - a.entrega.horas)
  return {
    enCamino,
    sinConfirmar: enCamino.filter((f) => f.entrega.reloj.clase === "aviso"),
    conAlerta: filas.filter((f) => f.entrega.alerta),
    confirmadas: filas
      .filter((f) => f.entrega.etapa === "entregada" && !f.entrega.alerta)
      .sort((a, b) => b.entrega.llego!.localeCompare(a.entrega.llego!)),
    incompletos: filas.filter((f) => !f.entrega.carga.completo),
  }
}

/** Pedidos de los que puede llegar un mensaje: los que van en camino (primero) y los entregados cuya alerta sigue abierta. */
export const esperanEvidencia = (pedidos: Pedido[]) =>
  pedidos
    .flatMap((p) => {
      const e = entregaDe(p)
      return e !== null && (e.etapa === "en_camino" || e.alerta) ? [{ p, camino: e.etapa === "en_camino" }] : []
    })
    .sort((a, b) => Number(b.camino) - Number(a.camino))
    .map((x) => x.p)

export interface AlertaTransporte {
  pedido: Pedido
  tipo: "sin_confirmar" | "evidencia" | "incompleto"
  clase: "aviso" | "vencido"
  palabra: string
  que: string
  queHace: string
  quien: string
}

const unidades = (f: Faltante) => `${f.falta} ${f.unidad === "und" ? (f.falta === 1 ? "unidad" : "unidades") : f.unidad}${f.falta !== 1 && f.unidad !== "und" ? "s" : ""}`

/** Rutina diaria del transporte: sin confirmar, evidencia con alerta y salidas incompletas que siguen en camino. */
export function alertasTransporte(pedidos: Pedido[], hoy: FechaHora = HOY): AlertaTransporte[] {
  const t = transporte(pedidos, hoy)
  const filas: AlertaTransporte[] = []
  for (const { pedido, entrega } of t.conAlerta)
    filas.push({
      pedido,
      tipo: "evidencia",
      clase: entrega.atencion === "pedida" ? "aviso" : "vencido",
      palabra: entrega.estado.palabra,
      que: [...entrega.faltas.map((f) => f.texto), ...(entrega.novedad ? [`Quien recibió escribió: "${entrega.novedad}"`] : [])].join(" · "),
      queHace:
        entrega.atencion === "pedida"
          ? "Ya se pidió de nuevo. Esperar la respuesta del conductor"
          : "Nelson o Marcela piden la evidencia otra vez, o la dan por buena",
      quien: "Nelson o Marcela",
    })
  for (const { pedido, entrega } of t.enCamino) {
    if (entrega.reloj.clase === "aviso")
      filas.push({
        pedido,
        tipo: "sin_confirmar",
        clase: "aviso",
        palabra: entrega.estado.palabra,
        que: `${fmtHoras(entrega.horas)} en camino sin que la transportadora confirme la entrega`,
        queHace: entrega.reloj.queHace,
        quien: entrega.reloj.quien,
      })
    if (!entrega.carga.completo)
      filas.push({
        pedido,
        tipo: "incompleto",
        clase: "aviso",
        palabra: "Salió incompleto",
        que: `Falta ${entrega.carga.faltantes.map((f) => `${unidades(f)} de ${f.descripcion.toLowerCase()}`).join(", ")}`,
        queHace: "Marcela avisa al vendedor y al cliente",
        quien: "Marcela Ríos",
      })
  }
  return filas
}

// ── Momento 6 · Revisión del lunes ──────────────────────────────────────────────

/** Lunes a domingo de la semana anterior a `hoy`. */
export function semanaAnterior(hoy: FechaHora = HOY) {
  const lunes = sumarDias(hoy, -((diaDeSemana(hoy) + 6) % 7))
  return { desde: soloFecha(sumarDias(lunes, -7)), hasta: soloFecha(sumarDias(lunes, -1)) }
}

export function revisionSemanal(pedidos: Pedido[], hoy: FechaHora = HOY) {
  const { desde, hasta } = semanaAnterior(hoy)
  const semana = pedidos.filter((p) => enRango(fechaSolicitud(p), desde, hasta))
  const filas: FilaRevision[] = semana.map((p) => {
    const ap = aprobacion(p)
    return {
      asignadoAndres: asignacion(p).tipo === "andres",
      horasAprobado: ap ? horasEntre(fechaSolicitud(p), ap.fecha) : null,
      fueraDeRegla: fueraDeRegla(p),
    }
  })
  const despachados = pedidos.filter((p) => {
    const d = eventoDe(p, "despachado")
    return d && enRango(d.fecha, desde, hasta)
  })
  return {
    desde,
    hasta,
    semana,
    a: INDICADOR_A.fn(filas),
    b: INDICADOR_B.fn(filas),
    c: INDICADOR_C.fn(filas),
    aTiempo: A_TIEMPO.fn(
      despachados.map((p) => diasCalendario(fechaSolicitud(p), eventoDe(p, "despachado")!.fecha)),
    ),
    paraEscalar: semana.filter((p) => PARA_ESCALAR.fn(asignacion(p).tipo === "andres", horasDeEspera(p, hoy))),
    fueraDeRegla: semana.filter(fueraDeRegla),
    sinAprobacion: semana.filter((p) => !aprobacion(p)),
    fueraDeTope: {
      aprobar: semana.filter((p) => RELOJ_APROBACION.fn(horasDeEspera(p, hoy)).clase === "vencido"),
      bodega: despachados.filter((p) => RELOJ_BODEGA.fn(diasEnBodega(p)!).clase === "vencido"),
    },
    despachados,
    /** Caso 4: Andrés ve Nogal y Los Cerros el lunes, ya aprobados, para estar al tanto. */
    paraVerAndres: semana.filter((p) => CASO_4.fn(p)),
  }
}

// ── Llega la solicitud ──────────────────────────────────────────────────────────

/**
 * La fecha más tardía de salida de bodega que un vendedor puede prometer si cada tramo
 * va en plazo: tope de aprobación (CRED-3.1) → lista de las 7:00 (BOD-1.1) → fecha límite (BOD-3.1).
 * El transporte a la obra queda fuera (Ops Charter).
 */
export function promesaDeSalida(solicitud: FechaHora = HOY) {
  const aprobarAntesDe = sumarHoras(solicitud, RELOJ_APROBACION.valores!.tope_h)
  return {
    aprobarAntesDe,
    entraEnLista: ENTRADA_A_LA_FILA.fn(aprobarAntesDe),
    saleAMasTardar: FECHA_LIMITE.fn(aprobarAntesDe),
  }
}

/** Carga de bodega contra su capacidad (CAPACIDAD_BODEGA: dato, no regla). */
export function cargaBodega(pedidos: Pedido[], capacidadPorDia: number) {
  const enFila = pedidos.filter((p) => tramoDe(p) === "bodega")
  const porAprobar = pedidos.filter((p) => tramoDe(p) === "aprobar")
  return {
    enFila: enFila.length,
    lineasEnFila: enFila.reduce((s, p) => s + p.lineas, 0),
    porAprobar: porAprobar.length,
    diasDeTrabajo: enFila.length / capacidadPorDia,
    diasSiSeApruebaTodo: (enFila.length + porAprobar.length) / capacidadPorDia,
  }
}

/** Número para una solicitud creada en la app: SAP aún no le ha dado número de pedido. */
export function siguienteIdApp(pedidos: Pedido[]) {
  const n = pedidos.filter((p) => p.id_pedido.startsWith("SOL-")).length + 1
  return `SOL-2026-${String(n).padStart(5, "0")}`
}

// ── Tablero ─────────────────────────────────────────────────────────────────────

/**
 * Pedidos abiertos al cierre de cada día (hoy: a la hora de HOY), por tramo.
 * "Aprobar": solicitados sin decisión. "Bodega": aprobados que no han salido en camión.
 */
export function abiertosPorDia(pedidos: Pedido[], dias: number, hoy: FechaHora = HOY) {
  return Array.from({ length: dias }, (_, i) => {
    const dia = sumarDias(hoy, i - dias + 1)
    const corte = i === dias - 1 ? hoy : `${soloFecha(dia)}T23:59`
    const antesDe = (f?: FechaHora) => f !== undefined && !esAntes(corte, f)
    let aprobar = 0
    let bodega = 0
    for (const p of pedidos) {
      const solicitado = antesDe(fechaSolicitud(p))
      const decidido = antesDe(decision(p)?.fecha)
      const aprobado = antesDe(aprobacion(p)?.fecha)
      const salio = antesDe(eventoDe(p, "despachado")?.fecha)
      if (solicitado && !decidido) aprobar++
      if (aprobado && !salio) bodega++
    }
    return { fecha: soloFecha(dia), aprobar, bodega }
  })
}

export function resumenTablero(pedidos: Pedido[], hoy: FechaHora = HOY) {
  const relojes = pedidos.map((p) => relojActual(p, hoy)).filter((r): r is Reloj => r !== null)
  const t = transporte(pedidos, hoy)
  return {
    enCamino: t.enCamino.length,
    sinConfirmar: t.sinConfirmar.length,
    conAlertaDeEntrega: t.conAlerta.length,
    porAprobar: pedidos.filter((p) => tramoDe(p) === "aprobar").length,
    cercaDelTope: relojes.filter((r) => r.clase === "aviso").length,
    fueraDeTope: relojes.filter((r) => r.clase === "vencido").length,
    aTiempo: revisionSemanal(pedidos, hoy).aTiempo,
  }
}
