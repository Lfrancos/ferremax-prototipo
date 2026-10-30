import { CONDUCTORES, describirMensaje, remisionDe } from "./evidencia"
import { lineasDe } from "./lineas"
import type {
  Cliente,
  CorteCartera,
  Despacho,
  Evento,
  FechaHora,
  HitoDocumento,
  MensajeTransporte,
  PartidaAbierta,
  PedidoRegistro,
} from "./tipos"

// ÚNICO REGISTRO DE VERDAD DEL PROTOTIPO: CLIENTES, CARTERA y PEDIDOS.
// Todas las pantallas son vistas calculadas sobre estos arreglos (ver lib/vistas.ts).
// Nada de lo que se ve en pantalla se guarda aparte: saldo y atraso, quién aprueba,
// horas de espera, semáforo, lista de bodega e indicadores se calculan con lib/rules.ts.
//
// Datos ficticios del curso. Los clientes salen del maestro de SAP (hoja Clientes de
// Ferremax_Dataset). Las partidas abiertas están armadas para dar el saldo y el atraso
// del extracto aprobaciones_2026-08-03. Los pedidos (valor, fechas y líneas) son inventados.

/** Fecha de hoy fija de demo, para que el semáforo no cambie entre ensayos. Es lunes. */
export const HOY: FechaHora = "2026-11-30T09:00"

/** La última vez que se pasaron decisiones a SAP antes de la demo (lote EXP-000): el viernes por la tarde. */
export const ULTIMA_EXPORTACION: FechaHora = "2026-11-27T18:00"

/** El maestro de SAP tiene 134 clientes (Diccionario de datos): los nuevos siguen desde ahí. */
export const ULTIMO_ID_SAP = 134

/**
 * Capacidad de la bodega. Es un dato, no una regla: no está en ningún documento de 03-Areas.
 * Fuente: hoja S6_Capacidad de "Copy of Ferremax_Dataset_S6.xlsx" (en revisión, ver pendientes del CLAUDE.md).
 */
export const CAPACIDAD_BODEGA = {
  pedidos_por_dia: 18,
  nota: 'Dato de Nelson: "salen casi 20 pedidos al día", con 2 alistadores y 1 turno.',
  fuente: "S6_Capacidad (dataset S6, por confirmar)",
}

// ── Clientes ────────────────────────────────────────────────────────────────────
// Para agregar uno: una fila más con los campos del maestro. Sandra lo hace desde /clientes.

export const CLIENTES: Cliente[] = [
  { id_cliente: "CLI-002", nit: "879.771.155-3", razon_social: "Ingeniería y Obras Yarumo S.A.S.", segmento: "Constructora", sede: "Cali", vendedor: "Daniela Ospina", plazo_dias: 60, cupo_cop: 800_000_000, antiguedad_anios: 5 },
  { id_cliente: "CLI-010", nit: "880.992.023-0", razon_social: "Metalmecánica Cóndor Ltda.", segmento: "Industria", sede: "Bogotá", vendedor: "Camilo Duarte", plazo_dias: 30, cupo_cop: 30_000_000, antiguedad_anios: 8 },
  { id_cliente: "CLI-014", nit: "843.554.514-0", razon_social: "Constructora Cordillera S.A.S.", segmento: "Constructora", sede: "Medellín", vendedor: "Esteban Giraldo", plazo_dias: 45, cupo_cop: 1_500_000_000, antiguedad_anios: 14 },
  { id_cliente: "CLI-020", nit: "881.396.198-3", razon_social: "Constructora Los Cerros S.A.", segmento: "Constructora", sede: "Cali", vendedor: "Mauricio Lasso", plazo_dias: 30, cupo_cop: 400_000_000, antiguedad_anios: 8 },
  { id_cliente: "CLI-021", nit: "878.043.702-1", razon_social: "Urbanizadora Palmetto S.A.", segmento: "Constructora", sede: "Medellín", vendedor: "Esteban Giraldo", plazo_dias: 30, cupo_cop: 800_000_000, antiguedad_anios: 13 },
  { id_cliente: "CLI-026", nit: "901.439.634-7", razon_social: "Constructora Nogal Ltda.", segmento: "Constructora", sede: "Bogotá", vendedor: "Paula Cifuentes", plazo_dias: 45, cupo_cop: 800_000_000, antiguedad_anios: 5 },
  { id_cliente: "CLI-033", nit: "879.439.282-1", razon_social: "Urbanizadora Boreal S.A.", segmento: "Constructora", sede: "Medellín", vendedor: "Sofía Mejía", plazo_dias: 45, cupo_cop: 400_000_000, antiguedad_anios: 1 },
  { id_cliente: "CLI-037", nit: "879.981.880-4", razon_social: "Explotaciones Mineros del Norte S.A.", segmento: "Minera", sede: "Bogotá", vendedor: "Édinson Rojas", plazo_dias: 45, cupo_cop: 800_000_000, antiguedad_anios: 10 },
  { id_cliente: "CLI-046", nit: "893.388.990-8", razon_social: "Textiles Tundra S.A.", segmento: "Industria", sede: "Medellín", vendedor: "Julián Arango", plazo_dias: 30, cupo_cop: 30_000_000, antiguedad_anios: 8 },
  { id_cliente: "CLI-055", nit: "813.373.074-6", razon_social: "Montajes Arias S.A.", segmento: "Contratista eléctrico", sede: "Bogotá", vendedor: "Paula Cifuentes", plazo_dias: 30, cupo_cop: 120_000_000, antiguedad_anios: 13 },
  { id_cliente: "CLI-056", nit: "825.176.077-5", razon_social: "Montajes Arias S.A.S.", segmento: "Contratista eléctrico", sede: "Cali", vendedor: "Mauricio Lasso", plazo_dias: 15, cupo_cop: 15_000_000, antiguedad_anios: 12 },
  { id_cliente: "CLI-058", nit: "800.696.153-6", razon_social: "Montajes Pardo S.A.", segmento: "Contratista eléctrico", sede: "Medellín", vendedor: "Julián Arango", plazo_dias: 30, cupo_cop: 30_000_000, antiguedad_anios: 14 },
  { id_cliente: "CLI-068", nit: "886.986.822-4", razon_social: "Consorcio Pacífico Ltda.", segmento: "Constructora", sede: "Medellín", vendedor: "Sofía Mejía", plazo_dias: 45, cupo_cop: 30_000_000, antiguedad_anios: 3 },
  { id_cliente: "CLI-070", nit: "807.836.352-6", razon_social: "Carbones del Cesar S.A.", segmento: "Minera", sede: "Medellín", vendedor: "Esteban Giraldo", plazo_dias: 45, cupo_cop: 120_000_000, antiguedad_anios: 14 },
  { id_cliente: "CLI-079", nit: "827.632.959-8", razon_social: "Constructora Nogal S.A.", segmento: "Constructora", sede: "Cali", vendedor: "Mauricio Lasso", plazo_dias: 45, cupo_cop: 30_000_000, antiguedad_anios: 6 },
  { id_cliente: "CLI-088", nit: "860.371.440-0", razon_social: "Ingeniería y Obras Bahía Ltda.", segmento: "Constructora", sede: "Cali", vendedor: "Mauricio Lasso", plazo_dias: 30, cupo_cop: 15_000_000, antiguedad_anios: 12 },
  { id_cliente: "CLI-093", nit: "829.491.507-5", razon_social: "Electricistas Cárdenas S.A.S.", segmento: "Contratista eléctrico", sede: "Medellín", vendedor: "Sofía Mejía", plazo_dias: 30, cupo_cop: 30_000_000, antiguedad_anios: 1 },
  { id_cliente: "CLI-108", nit: "841.838.659-1", razon_social: "Consorcio Cumbre S.A.S.", segmento: "Constructora", sede: "Medellín", vendedor: "Esteban Giraldo", plazo_dias: 45, cupo_cop: 30_000_000, antiguedad_anios: 8 },
  { id_cliente: "CLI-118", nit: "804.082.813-6", razon_social: "Manufacturas Cóndor Ltda.", segmento: "Industria", sede: "Cali", vendedor: "Mauricio Lasso", plazo_dias: 15, cupo_cop: 60_000_000, antiguedad_anios: 11 },
]

// ── Cartera ─────────────────────────────────────────────────────────────────────
// Corte de partidas abiertas de SAP, importado esta mañana. Opción A (satélite):
// cada corte se importa en /cartera y reemplaza al anterior. Fechas: AAAA-MM-DDT00:00.

const dia = (f: string): FechaHora => `${f}T00:00`

function factura(
  id_cliente: string,
  documento: string,
  fecha: string,
  vence: string | null,
  valor: number,
  opciones: { pedido?: string; saldo?: number | null } = {},
): PartidaAbierta {
  return {
    id_cliente,
    documento,
    tipo: "Factura",
    id_pedido: opciones.pedido ?? null,
    fecha_documento: dia(fecha),
    vencimiento: vence ? dia(vence) : null,
    valor_cop: valor,
    saldo_abierto_cop: opciones.saldo === undefined ? valor : opciones.saldo,
  }
}

export const PARTIDAS_INICIALES: PartidaAbierta[] = [
  factura("CLI-002", "FAC-2026-04410", "2026-11-10", "2027-01-09", 45_000_000),
  factura("CLI-002", "FAC-2026-04502", "2026-11-20", "2027-01-19", 28_112_000),
  // Llegó sin saldo en el reporte: los pedidos de este cliente quedan incompletos (CRED-2.5).
  factura("CLI-010", "FAC-2026-04425", "2026-11-12", "2026-12-12", 2_150_000, { saldo: null }),
  factura("CLI-014", "FAC-2026-04288", "2026-10-28", "2026-12-12", 120_000_000),
  factura("CLI-014", "FAC-2026-04480", "2026-11-18", "2027-01-02", 77_256_500),
  factura("CLI-020", "FAC-2026-04301", "2026-10-29", "2026-11-28", 12_400_000),
  factura("CLI-020", "FAC-2026-04503", "2026-11-20", "2026-12-20", 22_359_500),
  factura("CLI-021", "FAC-2026-04270", "2026-10-27", "2026-11-26", 9_800_000),
  factura("CLI-021", "FAC-2026-04455", "2026-11-15", "2026-12-15", 15_397_000),
  factura("CLI-026", "FAC-2026-04366", "2026-11-05", "2026-12-20", 1_159_000),
  factura("CLI-026", "FAC-2026-04571", "2026-11-27", "2027-01-11", 516_000, { pedido: "PED-2026-03092" }),
  factura("CLI-033", "FAC-2026-04212", "2026-10-20", "2026-12-04", 118_265_500),
  factura("CLI-033", "FAC-2026-04436", "2026-11-12", "2026-12-27", 100_000_000),
  factura("CLI-037", "FAC-2026-04352", "2026-11-03", "2026-12-18", 18_301_500),
  factura("CLI-046", "FAC-2026-04215", "2026-10-20", "2026-11-19", 8_585_000),
  factura("CLI-046", "FAC-2026-04569", "2026-11-27", "2026-12-27", 9_767_000, { pedido: "PED-2026-03089" }),
  factura("CLI-056", "FAC-2026-04520", "2026-11-22", "2026-12-07", 399_500),
  factura("CLI-058", "FAC-2026-04144", "2026-10-10", "2026-11-09", 10_000_000),
  factura("CLI-058", "FAC-2026-04452", "2026-11-15", "2026-12-15", 5_113_000),
  factura("CLI-058", "FAC-2026-04560", "2026-11-26", "2026-12-26", 1_250_000, { pedido: "PED-2026-03090" }),
  factura("CLI-068", "FAC-2026-03987", "2026-09-19", "2026-11-03", 3_000_000),
  factura("CLI-068", "FAC-2026-04412", "2026-11-10", "2026-12-25", 2_412_000),
  factura("CLI-070", "FAC-2026-04367", "2026-11-05", "2026-12-20", 1_474_000),
  factura("CLI-079", "FAC-2026-04340", "2026-11-01", "2026-12-16", 6_912_000),
  factura("CLI-088", "FAC-2026-04309", "2026-10-30", "2026-11-29", 4_000_000),
  factura("CLI-088", "FAC-2026-04481", "2026-11-18", "2026-12-18", 3_641_500),
  factura("CLI-093", "FAC-2026-04440", "2026-11-13", "2026-12-13", 2_133_000),
  factura("CLI-093", "FAC-2026-04585", "2026-11-28", "2026-12-28", 6_937_000, { pedido: "PED-2026-03098" }),
  factura("CLI-108", "FAC-2026-04255", "2026-10-25", "2026-12-09", 15_000_000),
  factura("CLI-108", "FAC-2026-04437", "2026-11-12", "2026-12-27", 10_093_000),
  factura("CLI-118", "FAC-2026-03690", "2026-08-20", "2026-09-04", 8_000_000),
  factura("CLI-118", "FAC-2026-04003", "2026-10-01", "2026-10-16", 5_891_500),
  // Pagó ayer y cartera todavía no aplica el pago: el caso que Sandra le preguntó a Andrés (CART-4).
  {
    id_cliente: "CLI-118",
    documento: "RC-2026-01877",
    tipo: "Pago sin aplicar",
    id_pedido: null,
    fecha_documento: dia("2026-11-29"),
    vencimiento: null,
    valor_cop: 8_000_000,
    saldo_abierto_cop: 8_000_000,
  },
]

export const CARTERA_INICIAL: CorteCartera = {
  archivo: "partidas_abiertas_2026-11-30_0600.csv",
  corte: "2026-11-30T06:00",
  importo: "Sandra Beltrán",
  partidas: PARTIDAS_INICIALES,
}

/** El vendedor del cliente registra la solicitud; la regla del momento 1 la deja por aprobar en el mismo minuto. */
function solicitud(id_cliente: string, fecha: FechaHora): Evento[] {
  const vendedor = CLIENTES.find((c) => c.id_cliente === id_cliente)!.vendedor
  return [
    { accion: "solicitado", fecha, quien: vendedor },
    { accion: "por_aprobar", fecha, quien: "Sistema" },
  ]
}

// ── Historia de las facturas ────────────────────────────────────────────────────
// Lo que pasó con cada factura después de emitirla: firma electrónica, DIAN, envío y acuse del cliente.
// La app no lo calcula: es lo que reportaría SAP. Qué trae SAP y cuándo lo trae es [por definir] (ver README).
// Lo demás (entrega, corte de cartera) se arma con los datos de cada pedido y del corte (lib/documentos.ts).

function emision(fecha: FechaHora, quien: string, cufe: string, correo: string, acuse?: { fecha: FechaHora; quien: string }): HitoDocumento[] {
  const minuto = (n: number) => fecha.replace(/:(\d\d)$/, (_, m) => `:${String(Number(m) + n).padStart(2, "0")}`)
  return [
    { que: "Factura generada en SAP", fecha, quien, actor: "Persona", estado: "hecho", detalle: "Se emite desde el pedido y su remisión." },
    {
      que: "Firmada electrónicamente por Ferremax",
      fecha,
      quien: "SAP · certificado digital de Ferremax S.A.S.",
      actor: "SAP",
      estado: "hecho",
      detalle: `No la firma una persona. Queda su código único (CUFE) ${cufe}.`,
    },
    { que: "Validada por la DIAN", fecha: minuto(1), quien: "DIAN", actor: "DIAN", estado: "hecho", detalle: "Aceptada, sin observaciones." },
    { que: "Enviada al cliente", fecha: minuto(2), quien: "SAP", actor: "SAP", estado: "hecho", detalle: `Por correo electrónico a ${correo}${correo.endsWith(".") ? "" : "."}` },
    acuse
      ? { que: "Acuse de recibo del cliente", fecha: acuse.fecha, quien: acuse.quien, actor: "Cliente", estado: "hecho", detalle: "El cliente confirma que la recibió." }
      : { que: "Acuse de recibo del cliente", fecha: null, quien: "El cliente", actor: "Cliente", estado: "pendiente", detalle: "Todavía no confirma que la recibió." },
  ]
}

export const HITOS_FACTURA: Record<string, HitoDocumento[]> = {
  "FAC-2026-04569": emision("2026-11-27T14:10", "Sandra Beltrán", "9f3c…a1b7", "la facturación de Textiles Tundra S.A.", {
    fecha: "2026-11-28T09:30",
    quien: "Textiles Tundra S.A.",
  }),
  "FAC-2026-04560": emision("2026-11-26T15:40", "Sandra Beltrán", "41d8…07ce", "la facturación de Montajes Pardo S.A."),
  "FAC-2026-04571": emision("2026-11-27T14:40", "Sandra Beltrán", "c2e5…9d40", "la facturación de Constructora Nogal Ltda."),
  "FAC-2026-04585": emision("2026-11-28T15:20", "Sandra Beltrán", "7ab1…e3f2", "la facturación de Electricistas Cárdenas S.A.S.", {
    fecha: "2026-11-30T08:05",
    quien: "Electricistas Cárdenas S.A.S.",
  }),
}

// ── Transporte ──────────────────────────────────────────────────────────────────
// Cómo salió de bodega cada pedido despachado y lo que mandó la transportadora.
// El detalle de las líneas está en lib/lineas.ts.

/** Lo que Nelson cargó: todo lo pedido, menos el faltante si lo hay. */
function despacho(
  id_pedido: string,
  lineas: number,
  conductor: string,
  faltante?: { sku: string; falta: number; motivo: string },
): Despacho {
  const c = CONDUCTORES.find((x) => x.nombre === conductor)!
  const cargado = lineasDe({ id_pedido, lineas }).map((i) => ({
    sku: i.sku,
    cantidad: i.sku === faltante?.sku ? i.cantidad - faltante.falta : i.cantidad,
  }))
  return { ...c, cargado, faltante_motivo: faltante?.motivo }
}

/** Un mensaje de la transportadora trae la entrega y deja su constancia en el historial del pedido. */
function entrega(m: MensajeTransporte, entregado = true): Evento[] {
  return [
    ...(entregado ? [{ accion: "entregado", fecha: m.fecha, quien: "Transportadora" } satisfies Evento] : []),
    { accion: "evidencia_recibida", fecha: m.fecha, quien: "Transportadora", motivo: describirMensaje(m), ref: m.id },
  ]
}

const FOTO_BUENA = { bultos: 6, nitida: true }

function mensaje(m: Omit<MensajeTransporte, "celular"> & { conductor: string }): MensajeTransporte {
  const { conductor, ...resto } = m
  return { ...resto, celular: CONDUCTORES.find((c) => c.nombre === conductor)!.celular }
}

export const MENSAJES_INICIALES: MensajeTransporte[] = [
  mensaje({
    id: "MSG-001",
    canal: "Chat de WhatsApp",
    fecha: "2026-11-27T11:00",
    conductor: "Jairo Pinzón",
    de: "Jairo Pinzón",
    texto: "Buenas, ya entregué en la obra. Todo recibido.",
    id_pedido: "PED-2026-03089",
    producto: FOTO_BUENA,
    documento: { remision: remisionDe("PED-2026-03089"), nombre: "Marta Quintero", firma: true, novedad: null, nitida: true },
  }),
  mensaje({
    id: "MSG-002",
    canal: "Enlace",
    fecha: "2026-11-26T10:00",
    conductor: "Wilson Rengifo",
    de: "Wilson Rengifo",
    texto: "Entregado.",
    id_pedido: "PED-2026-03090",
    producto: { bultos: 3, nitida: true },
    documento: { remision: remisionDe("PED-2026-03090"), nombre: "Diego Valencia", firma: true, novedad: null, nitida: true },
  }),
  mensaje({
    id: "MSG-003",
    canal: "Chat de WhatsApp",
    fecha: "2026-11-27T09:00",
    conductor: "Luis Mora",
    de: "Luis Mora",
    texto: "Entregado. Aquí la remisión.",
    id_pedido: "PED-2026-03092",
    producto: { bultos: 2, nitida: true },
    documento: { remision: remisionDe("PED-2026-03092"), nombre: "Claudia Rojas", firma: false, novedad: null, nitida: true },
  }),
  mensaje({
    id: "MSG-004",
    canal: "Chat de WhatsApp",
    fecha: "2026-11-28T11:00",
    conductor: "Hernán Beltrán",
    de: "Hernán Beltrán",
    texto: "Listo, documento firmado.",
    id_pedido: "PED-2026-03098",
    documento: { remision: remisionDe("PED-2026-03098"), nombre: "Jorge Pinto", firma: true, novedad: null, nitida: true },
  }),
  mensaje({
    id: "MSG-005",
    canal: "Chat de WhatsApp",
    fecha: "2026-11-28T14:10",
    conductor: "Hernán Beltrán",
    de: "Hernán Beltrán",
    texto: "Perdón, aquí la foto del producto.",
    id_pedido: "PED-2026-03098",
    producto: { bultos: 4, nitida: true },
  }),
]

const mensajeDe = (id: string) => MENSAJES_INICIALES.find((m) => m.id === id)!

// ── Pedidos ─────────────────────────────────────────────────────────────────────

export const PEDIDOS: PedidoRegistro[] = [
  // Semana revisada (23 al 29 de noviembre) y lo que sigue en bodega
  {
    id_pedido: "PED-2026-03089",
    id_cliente: "CLI-046",
    valor_cop: 9_767_000,
    lineas: 6,
    despacho: despacho("PED-2026-03089", 6, "Jairo Pinzón"),
    eventos: [
      ...solicitud("CLI-046", "2026-11-20T14:00"),
      { accion: "aprobado", fecha: "2026-11-21T12:00", quien: "Marcela Ríos", motivo: "Pasa los cuatro chequeos." },
      { accion: "en_alistamiento", fecha: "2026-11-23T07:00", quien: "Sistema" },
      { accion: "despachado", fecha: "2026-11-26T15:00", quien: "Nelson", motivo: "Salió completo." },
      ...entrega(mensajeDe("MSG-001")),
    ],
  },
  {
    id_pedido: "PED-2026-03090",
    id_cliente: "CLI-058",
    valor_cop: 1_250_000,
    lineas: 2,
    despacho: despacho("PED-2026-03090", 2, "Wilson Rengifo"),
    eventos: [
      ...solicitud("CLI-058", "2026-11-23T10:00"),
      { accion: "aprobado", fecha: "2026-11-23T16:00", quien: "Sandra Beltrán", motivo: "Atraso de 21 días, dentro del límite." },
      { accion: "en_alistamiento", fecha: "2026-11-24T07:00", quien: "Sistema" },
      { accion: "despachado", fecha: "2026-11-25T15:00", quien: "Nelson", motivo: "Salió completo." },
      ...entrega(mensajeDe("MSG-002")),
    ],
  },
  {
    id_pedido: "PED-2026-03091",
    id_cliente: "CLI-118",
    valor_cop: 2_896_500,
    lineas: 3,
    eventos: [
      ...solicitud("CLI-118", "2026-11-23T15:00"),
      {
        accion: "rechazado",
        fecha: "2026-11-24T11:00",
        quien: "Andrés Molina",
        motivo: "Factura vencida de 87 días. Se vuelve a mirar cuando cartera aplique el pago.",
      },
    ],
  },
  {
    id_pedido: "PED-2026-03092",
    id_cliente: "CLI-026",
    valor_cop: 516_000,
    lineas: 1,
    despacho: despacho("PED-2026-03092", 1, "Luis Mora"),
    eventos: [
      ...solicitud("CLI-026", "2026-11-23T09:00"),
      { accion: "aprobado", fecha: "2026-11-24T15:00", quien: "Andrés Molina", motivo: "Es cuenta mía, lo apruebo yo." },
      { accion: "en_alistamiento", fecha: "2026-11-25T07:00", quien: "Sistema" },
      { accion: "despachado", fecha: "2026-11-26T14:00", quien: "Nelson", motivo: "Salió completo." },
      ...entrega(mensajeDe("MSG-003")),
    ],
  },
  {
    id_pedido: "PED-2026-03093",
    id_cliente: "CLI-070",
    valor_cop: 7_156_500,
    lineas: 5,
    eventos: [
      ...solicitud("CLI-070", "2026-11-24T08:00"),
      { accion: "aprobado", fecha: "2026-11-24T12:00", quien: "Marcela Ríos", motivo: "Pasa los cuatro chequeos." },
      { accion: "en_alistamiento", fecha: "2026-11-25T07:00", quien: "Sistema" },
    ],
  },
  {
    id_pedido: "PED-2026-03094",
    id_cliente: "CLI-108",
    valor_cop: 915_500,
    lineas: 2,
    eventos: [
      ...solicitud("CLI-108", "2026-11-26T10:00"),
      { accion: "aprobado", fecha: "2026-11-26T15:00", quien: "Marcela Ríos", motivo: "Cabe en el cupo." },
      { accion: "en_alistamiento", fecha: "2026-11-27T07:00", quien: "Sistema" },
    ],
  },
  {
    id_pedido: "PED-2026-03095",
    id_cliente: "CLI-021",
    valor_cop: 159_074_000,
    lineas: 14,
    eventos: [
      ...solicitud("CLI-021", "2026-11-26T16:00"),
      { accion: "aprobado", fecha: "2026-11-27T08:00", quien: "Andrés Molina", motivo: "Cliente al día con el cupo. Se libera." },
      { accion: "en_alistamiento", fecha: "2026-11-28T07:00", quien: "Sistema" },
    ],
  },
  {
    id_pedido: "PED-2026-03096",
    id_cliente: "CLI-014",
    valor_cop: 26_372_000,
    lineas: 8,
    // Salió incompleto y nadie ha confirmado la entrega: es el caso de las dos alertas de transporte.
    despacho: despacho("PED-2026-03096", 8, "Hernán Beltrán", {
      sku: "CAB-12R",
      falta: 1,
      motivo: "Faltó un rollo de cable 12 AWG rojo: llegó de la fábrica en la tarde. Va en el viaje del martes.",
    }),
    eventos: [
      ...solicitud("CLI-014", "2026-11-23T11:00"),
      { accion: "aprobado", fecha: "2026-11-25T17:00", quien: "Andrés Molina", motivo: "Revisado al volver de obra. Se libera." },
      { accion: "en_alistamiento", fecha: "2026-11-26T07:00", quien: "Sistema" },
      {
        accion: "despachado",
        fecha: "2026-11-28T10:00",
        quien: "Nelson",
        motivo: "Salió incompleto: faltó un rollo de cable 12 AWG rojo. Va en el viaje del martes.",
      },
    ],
  },
  {
    id_pedido: "PED-2026-03097",
    id_cliente: "CLI-037",
    valor_cop: 4_886_000,
    lineas: 4,
    despacho: despacho("PED-2026-03097", 4, "Luis Mora"),
    eventos: [
      ...solicitud("CLI-037", "2026-11-27T18:00"),
      { accion: "aprobado", fecha: "2026-11-28T10:00", quien: "Sandra Beltrán", motivo: "Pasa los cuatro chequeos." },
      { accion: "en_alistamiento", fecha: "2026-11-30T07:00", quien: "Sistema" },
      { accion: "despachado", fecha: "2026-11-30T08:30", quien: "Nelson", motivo: "Salió completo." },
    ],
  },
  {
    id_pedido: "PED-2026-03098",
    id_cliente: "CLI-093",
    valor_cop: 6_937_000,
    lineas: 3,
    despacho: despacho("PED-2026-03098", 3, "Hernán Beltrán"),
    eventos: [
      ...solicitud("CLI-093", "2026-11-24T14:00"),
      { accion: "aprobado", fecha: "2026-11-25T10:00", quien: "Andrés Molina", motivo: "Cliente nuevo, sin atraso. Se libera." },
      { accion: "en_alistamiento", fecha: "2026-11-26T07:00", quien: "Sistema" },
      { accion: "despachado", fecha: "2026-11-27T15:00", quien: "Nelson", motivo: "Salió completo." },
      ...entrega(mensajeDe("MSG-004")),
      {
        accion: "evidencia_pedida",
        fecha: "2026-11-28T11:20",
        quien: "Nelson",
        motivo: "Se le pidió a Hernán Beltrán la foto del producto entregado.",
      },
      ...entrega(mensajeDe("MSG-005"), false),
    ],
  },
  {
    id_pedido: "PED-2026-03099",
    id_cliente: "CLI-002",
    valor_cop: 4_489_000,
    lineas: 3,
    eventos: [
      ...solicitud("CLI-002", "2026-11-29T21:00"),
      { accion: "aprobado", fecha: "2026-11-30T08:20", quien: "Marcela Ríos", motivo: "Pasa los cuatro chequeos." },
    ],
  },

  // Por aprobar hoy
  { id_pedido: "PED-2026-03101", id_cliente: "CLI-068", valor_cop: 1_840_000, lineas: 2, eventos: solicitud("CLI-068", "2026-11-30T07:40") },
  { id_pedido: "PED-2026-03102", id_cliente: "CLI-020", valor_cop: 3_120_000, lineas: 4, eventos: solicitud("CLI-020", "2026-11-29T18:30") },
  { id_pedido: "PED-2026-03103", id_cliente: "CLI-079", valor_cop: 24_600_000, lineas: 9, eventos: solicitud("CLI-079", "2026-11-28T10:15") },
  { id_pedido: "PED-2026-03104", id_cliente: "CLI-033", valor_cop: 5_940_000, lineas: 3, eventos: solicitud("CLI-033", "2026-11-29T20:00") },
  {
    id_pedido: "PED-2026-03105",
    id_cliente: "CLI-010",
    valor_cop: 1_476_500,
    lineas: 2,
    eventos: [
      ...solicitud("CLI-010", "2026-11-30T08:10"),
      {
        accion: "info_pedida",
        fecha: "2026-11-30T08:30",
        quien: "Marcela Ríos",
        motivo: "El saldo sale en blanco en el informe de cartera. Se le pide a Sandra.",
      },
    ],
  },
  {
    id_pedido: "PED-2026-03106",
    id_cliente: "CLI-055",
    valor_cop: 9_892_500,
    lineas: 5,
    situacion_no_cubierta:
      "En SAP hay dos razones sociales: Montajes Arias S.A.S. (cupo 15.000.000, 12 años) y Montajes Arias S.A. (cupo 120.000.000, 13 años). No se sabe cuál cupo aplica.",
    eventos: solicitud("CLI-055", "2026-11-29T11:00"),
  },
  { id_pedido: "PED-2026-03107", id_cliente: "CLI-088", valor_cop: 9_200_000, lineas: 4, eventos: solicitud("CLI-088", "2026-11-30T06:30") },
]
