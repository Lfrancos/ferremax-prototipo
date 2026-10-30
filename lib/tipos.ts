// Tipos del prototipo. Los nombres de campo salen del maestro de clientes de SAP
// (hoja Clientes del historial), del extracto semanal y del Diccionario de datos.

/** Fecha y hora local, sin zona: "AAAA-MM-DDTHH:mm". */
export type FechaHora = string

export type Estado =
  | "solicitado"
  | "por_aprobar"
  | "aprobado"
  | "rechazado"
  | "en_alistamiento"
  | "despachado"
  | "entregado"

/** Las personas del selector de rol. Édinson Rojas representa a los vendedores. */
export type Persona = "Andrés Molina" | "Marcela Ríos" | "Sandra Beltrán" | "Nelson" | "Édinson Rojas"

export const PERSONAS: Persona[] = ["Andrés Molina", "Marcela Ríos", "Sandra Beltrán", "Nelson", "Édinson Rojas"]

/** Vendedores con rol en la demo. Los demás vendedores del maestro solo aparecen como datos. */
export const VENDEDORES: Persona[] = ["Édinson Rojas"]

/** Por dónde entró la solicitud a la app. Sin valor: datos de la demo. */
export type Origen = "SAP" | "App"

/** Un evento cambia el estado, salvo los informativos (ACCIONES_INFORMATIVAS), que solo dejan constancia. */
export type Accion = Estado | "info_pedida" | "evidencia_recibida" | "evidencia_pedida" | "evidencia_aceptada"

export const ACCIONES_INFORMATIVAS: Accion[] = ["info_pedida", "evidencia_recibida", "evidencia_pedida", "evidencia_aceptada"]

export interface Evento {
  accion: Accion
  fecha: FechaHora
  /** Una persona, un vendedor, "Sistema" o "Transportadora". */
  quien: string
  motivo?: string
  /** En "evidencia_recibida": el mensaje de la transportadora al que corresponde. */
  ref?: string
  /** Por dónde se dio la decisión, si no fue en la app. */
  via?: "WhatsApp"
}

/**
 * Un mensaje del chat de WhatsApp entre Ferremax y quien aprueba, que NO se calcula solo:
 * lo que escribe la persona y lo que le contesta el sistema. Los avisos (inicial, recordatorios)
 * sí se calculan con la regla NOT-1 (lib/notificaciones.ts).
 */
export interface MensajeWhatsApp {
  id: string
  fecha: FechaHora
  persona: Persona
  /** "entrada": la persona le escribe a Ferremax. "salida": Ferremax le contesta. */
  sentido: "entrada" | "salida"
  texto: string
  /** Pedido al que responde (en WhatsApp real: el mensaje citado). */
  id_pedido: string | null
}

export type Segmento = "Constructora" | "Contratista eléctrico" | "Industria" | "Minera"
export type Sede = "Bogotá" | "Medellín" | "Cali"

export const SEGMENTOS: Segmento[] = ["Constructora", "Contratista eléctrico", "Industria", "Minera"]
export const SEDES: Sede[] = ["Bogotá", "Medellín", "Cali"]

/** Una fila del maestro de clientes. El saldo y el atraso no van aquí: salen del corte de cartera. */
export interface Cliente {
  id_cliente: string
  nit: string
  razon_social: string
  segmento: Segmento
  sede: Sede
  vendedor: string
  plazo_dias: number
  cupo_cop: number
  antiguedad_anios: number
}

export type TipoPartida = "Factura" | "Pago sin aplicar"
export const TIPOS_PARTIDA: TipoPartida[] = ["Factura", "Pago sin aplicar"]

/** Una partida abierta de un cliente, tal como sale del reporte de cartera de SAP. */
export interface PartidaAbierta {
  id_cliente: string
  documento: string
  tipo: TipoPartida
  id_pedido: string | null
  fecha_documento: FechaHora
  /** Facturas: fecha + plazo del cliente. null = llegó en blanco. */
  vencimiento: FechaHora | null
  valor_cop: number
  /** Lo que sigue abierto. null = llegó en blanco. */
  saldo_abierto_cop: number | null
}

/** Una foto completa de la cartera: cada corte reemplaza al anterior. */
export interface CorteCartera {
  archivo: string
  corte: FechaHora
  importo: string
  partidas: PartidaAbierta[]
}

// ── Transporte ──────────────────────────────────────────────────────────────────

/** Una línea del pedido: lo que el cliente pidió. */
export interface ItemPedido {
  sku: string
  descripcion: string
  unidad: string
  cantidad: number
}

/** Lo que Nelson cargó de una línea al entregar el pedido a transporte. */
export interface LineaCargada {
  sku: string
  cantidad: number
}

/** Un conductor de las transportadoras con las que trabaja Ferremax. El celular es por donde escribe. */
export interface Conductor {
  nombre: string
  transportadora: string
  placa: string
  celular: string
}

/** El registro de la entrega a transporte. La fecha y quién la hizo están en el evento "despachado". */
export interface Despacho extends Conductor {
  cargado: LineaCargada[]
  /** Obligatorio cuando algo salió incompleto. */
  faltante_motivo?: string
}

/** Por dónde llegó la evidencia. A: el conductor escribe al número de Ferremax. B: abre un enlace único. */
export type Canal = "Chat de WhatsApp" | "Enlace"

/**
 * Una foto de la entrega, descrita por lo que se ve. De ahí se dibuja (components/ferremax/foto.tsx)
 * y de ahí la lee la IA de muestra (lib/evidencia.ts): la imagen y la lectura no pueden contradecirse.
 */
export interface FotoProducto {
  bultos: number
  nitida: boolean
}

export interface FotoDocumento {
  /** Número de remisión impreso. null = la foto lo deja fuera del encuadre. */
  remision: string | null
  /** Nombre escrito a mano por quien recibe. */
  nombre: string | null
  firma: boolean
  /** Lo que escribió a mano quien recibe ("faltó una caja"). */
  novedad: string | null
  nitida: boolean
}

/** Un mensaje de la transportadora. Con id_pedido null no se supo de qué pedido es. */
export interface MensajeTransporte {
  id: string
  canal: Canal
  fecha: FechaHora
  celular: string
  de: string
  texto: string
  id_pedido: string | null
  producto?: FotoProducto
  documento?: FotoDocumento
}

/** Lo que la IA de muestra lee de un mensaje. */
export interface Lectura {
  producto: "si" | "no" | "borrosa"
  documento: "si" | "no" | "borrosa"
  remision: string | null
  nombre: string | null
  /** null = el documento no se lee. */
  firma: boolean | null
  novedad: string | null
}

/** Lo que dicen todos los mensajes de un pedido juntos. */
export interface EvidenciaCombinada {
  mensajes: number
  producto: "si" | "no" | "borrosa"
  documento: "si" | "no" | "borrosa"
  remision: string | null
  nombre: string | null
  firma: boolean
  novedad: string | null
}

/** Lo que se guarda de un pedido. Los datos del cliente se leen del maestro. */
export interface PedidoRegistro {
  id_pedido: string
  id_cliente: string
  valor_cop: number
  /** Líneas del pedido (dato de bodega, ver pendientes_bodega). */
  lineas: number
  /** Situación que ninguna regla cubre. Si existe, decide Marcela. */
  situacion_no_cubierta?: string
  origen?: Origen
  /** Cómo salió de bodega. Existe desde que Nelson lo entrega a transporte. */
  despacho?: Despacho
  eventos: Evento[]
}

/**
 * Vista unida pedido + cliente, con los nombres de columna del extracto semanal.
 * No se guarda: se arma cada vez (lib/vistas.ts, unirPedidos).
 */
export interface Pedido extends PedidoRegistro {
  cliente: string
  cupo_cop: number
  /** Del corte de cartera (CART-1). null = en blanco. */
  saldo_pendiente_cop: number | null
  /** Del corte de cartera (CART-2). null = en blanco. */
  dias_atraso: number | null
  /** Documento de la factura vencida más antigua, si hay. */
  factura_mas_antigua: string | null
  /** Saldo abierto de las facturas ya vencidas (CART-5). null = en blanco. */
  saldo_vencido_cop: number | null
  /** Pagos del cliente que cartera aún no aplica (CART-4). */
  pago_sin_aplicar_cop: number
  antiguedad_anios: number
  /** Mensajes de la transportadora ya asociados a este pedido. */
  mensajes: MensajeTransporte[]
}

// ── Documentos: remisión y factura ──────────────────────────────────────────────

/** Quién hizo cada paso de la historia de un documento. */
export type Actor = "SAP" | "Sistema" | "Persona" | "Transportadora" | "Cliente" | "DIAN" | "Claude"

/** Un paso en la historia de un documento: qué pasó, cuándo, quién y qué quedó. */
export interface HitoDocumento {
  que: string
  /** null = todavía no ocurre o no se sabe la hora. Con las 00:00 solo se sabe el día. */
  fecha: FechaHora | null
  quien: string
  actor: Actor
  detalle?: string
  estado: "hecho" | "pendiente" | "alerta"
}
