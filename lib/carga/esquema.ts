import { diasCalendario, soloFecha } from "../fechas"
import { normalizarEncabezado } from "./csv"

// LAS CUATRO TABLAS DE LA CARGA. Este archivo es lo que en una base de datos real serían las tablas:
// nombre de cada columna, tipo, cuáles son obligatorias, cuál es la llave y cuáles son las referencias entre tablas.
// Los nombres de columna son los de los CSV de la sesión 9 (carpeta datos/01_Primero_Aprobacion).

export type TablaId = "clientes" | "pedidos" | "aprobaciones" | "cartera"
export type TipoCampo = "texto" | "entero" | "decimal" | "dinero" | "fecha" | "momento" | "opcion"
export type Valor = string | number | null
export type Valores = Record<string, Valor>

export interface Campo {
  nombre: string
  tipo: TipoCampo
  obligatorio?: boolean
  /** Una vez cargado no debería cambiar (identidad, valor facturado): si cambia, la fila se revisa en vez de actualizarse. */
  fijo?: boolean
  opciones?: readonly string[]
  /** Con `opciones`: un valor distinto bloquea la fila. Sin esto solo avisa. */
  estricta?: boolean
  patron?: RegExp
  patronMensaje?: string
  descripcion: string
  ejemplo: string
}

export interface Tabla {
  id: TablaId
  titulo: string
  archivo: string
  descripcion: string
  clave: string
  /** Los archivos se revisan en este orden: cada uno puede apoyarse en los anteriores. */
  orden: number
  campos: Campo[]
  /** Columnas que apuntan a la llave de otra tabla. */
  refs: { campo: string; tabla: TablaId }[]
  /** Llaves distintas que describen lo mismo: si dos filas con otra llave coinciden, puede ser un duplicado. */
  parecidos?: (v: Valores) => string[]
  /** Revisión entre columnas de una misma fila. */
  entreColumnas?: (v: Valores) => { problemas: string[]; avisos: string[] }
}

const c = (nombre: string, tipo: TipoCampo, descripcion: string, ejemplo: string, extra: Partial<Campo> = {}): Campo => ({
  nombre,
  tipo,
  descripcion,
  ejemplo,
  ...extra,
})

const SEGMENTOS = ["Constructora", "Contratista eléctrico", "Industria", "Minera"] as const
const SEDES = ["Bogotá", "Medellín", "Cali"] as const
const num = (v: Valores, k: string) => (typeof v[k] === "number" ? (v[k] as number) : null)
const txt = (v: Valores, k: string) => (typeof v[k] === "string" ? (v[k] as string) : null)

const CLIENTES: Tabla = {
  id: "clientes",
  titulo: "Clientes",
  archivo: "01_clientes.csv",
  descripcion: "El maestro de clientes: NIT, razón social, cupo autorizado y plazo.",
  clave: "id_cliente",
  orden: 1,
  refs: [],
  campos: [
    c("id_cliente", "texto", "ID del cliente en SAP", "CLI-002", { obligatorio: true, fijo: true, patron: /^CLI-\d{3,}$/, patronMensaje: "tiene que tener el formato CLI-000" }),
    c("nit", "texto", "NIT con dígito de verificación", "879.771.155-3", { obligatorio: true, fijo: true }),
    c("razon_social", "texto", "Nombre legal del cliente", "Ingeniería y Obras Yarumo S.A.S.", { obligatorio: true }),
    c("segmento", "opcion", "Tipo de cliente", "Constructora", { obligatorio: true, opciones: SEGMENTOS, estricta: true }),
    c("sede_principal", "opcion", "Sede que lo atiende", "Cali", { obligatorio: true, opciones: SEDES, estricta: true }),
    c("vendedor_asignado", "texto", "Vendedor de la cuenta", "Daniela Ospina", { obligatorio: true }),
    c("plazo_credito_dias", "entero", "Plazo de pago en días", "60", { obligatorio: true }),
    c("cupo_credito_cop", "dinero", "Cupo de crédito autorizado", "800000000", { obligatorio: true }),
    c("antiguedad_anios", "entero", "Años como cliente", "5", { obligatorio: true }),
  ],
  parecidos: (v) => {
    const nit = (txt(v, "nit") ?? "").replace(/\D/g, "")
    const nombre = normalizarEncabezado(txt(v, "razon_social") ?? "")
    return [nit ? `NIT ${nit}` : "", nombre ? `nombre ${nombre}` : ""].filter(Boolean)
  },
  entreColumnas: (v) => {
    const avisos: string[] = []
    const nit = txt(v, "nit")
    if (nit && !/^[\d.]{6,}-\d$/.test(nit)) avisos.push(`El NIT «${nit}» no tiene el formato 000.000.000-0.`)
    return { problemas: [], avisos }
  },
}

const PEDIDOS: Tabla = {
  id: "pedidos",
  titulo: "Pedidos",
  archivo: "02_pedidos.csv",
  descripcion: "Cada pedido con su valor, forma de pago, fechas y estado. Los de crédito sin aprobación son los que entran a aprobar.",
  clave: "id_pedido",
  orden: 2,
  refs: [{ campo: "id_cliente", tabla: "clientes" }],
  campos: [
    c("id_pedido", "texto", "Número del pedido en SAP", "PED-2026-00001", { obligatorio: true, fijo: true, patron: /^PED-\d{4}-\d{5}$/, patronMensaje: "tiene que tener el formato PED-AAAA-00000" }),
    c("fecha_pedido", "fecha", "Día en que se registró el pedido", "2026-04-01", { obligatorio: true, fijo: true }),
    c("id_cliente", "texto", "Cliente del maestro", "CLI-049", { obligatorio: true, fijo: true }),
    c("cliente", "texto", "Nombre del cliente (para revisar el ID)", "Servicios Eléctricos Arias S.A.S.", { }),
    c("segmento", "texto", "Segmento del cliente", "Contratista eléctrico", {}),
    c("sede", "texto", "Sede", "Bogotá", {}),
    c("vendedor", "texto", "Quién registró el pedido", "Paula Cifuentes", { obligatorio: true }),
    c("forma_pago", "opcion", "Crédito o contado", "Crédito", { obligatorio: true, opciones: ["Crédito", "Contado"], estricta: true }),
    c("valor_pedido_cop", "dinero", "Valor del pedido", "6120000", { obligatorio: true, fijo: true }),
    c("costo_cop", "dinero", "Costo del pedido", "4207500", {}),
    c("margen_pct", "decimal", "Margen (0,312 = 31,2 %)", "0.312", {}),
    c("lineas_pedidas", "entero", "Referencias pedidas", "1", { obligatorio: true }),
    c("lineas_despachadas", "entero", "Referencias despachadas", "1", {}),
    c("solicitud_credito_at", "momento", "Cuándo se pidió el crédito", "2026-04-01 08:20:00", {}),
    c("aprobacion_credito_at", "momento", "Cuándo se aprobó (vacío = por aprobar)", "2026-04-01 13:30:00", {}),
    c("aprobo", "texto", "Quién aprobó", "Marcela Ríos", {}),
    c("fecha_despacho", "fecha", "Día del despacho", "2026-04-06", {}),
    c("fecha_entrega", "fecha", "Día de la entrega", "2026-04-08", {}),
    c("lead_time_dias", "entero", "Días del pedido a la entrega", "7", {}),
    c("estado", "opcion", "Estado del pedido", "Entregado", { obligatorio: true, opciones: ["Entregado", "Entregado parcial", "En proceso", "Cancelado"] }),
    c("motivo_cancelacion", "texto", "Por qué se canceló", "Precio", {}),
    c("fecha_cancelacion", "fecha", "Día de la cancelación", "2026-04-07", {}),
  ],
  parecidos: (v) => [`${v.id_cliente}|${v.fecha_pedido}|${v.valor_pedido_cop}|${v.lineas_pedidas}`],
  entreColumnas: (v) => {
    const avisos: string[] = []
    const valor = num(v, "valor_pedido_cop")
    const costo = num(v, "costo_cop")
    const margen = num(v, "margen_pct")
    if (valor && costo !== null && margen !== null && Math.abs((valor - costo) / valor - margen) > 0.002)
      avisos.push("El margen no cuadra con el valor y el costo.")
    const ped = num(v, "lineas_pedidas")
    const des = num(v, "lineas_despachadas")
    if (ped !== null && des !== null && des > ped) avisos.push("Hay más líneas despachadas que pedidas.")
    const fp = txt(v, "fecha_pedido")
    const fd = txt(v, "fecha_despacho")
    const fe = txt(v, "fecha_entrega")
    if (fp && fd && fd < fp) avisos.push("El despacho es anterior al pedido.")
    if (fd && fe && fe < fd) avisos.push("La entrega es anterior al despacho.")
    const sol = txt(v, "solicitud_credito_at")
    const apr = txt(v, "aprobacion_credito_at")
    if (sol && apr && apr < sol) avisos.push("La aprobación es anterior a la solicitud.")
    if (v.forma_pago === "Crédito" && !sol) avisos.push("Es a crédito pero no trae fecha de solicitud de crédito.")
    if (apr && !txt(v, "aprobo")) avisos.push("Trae fecha de aprobación pero no dice quién aprobó.")
    if (v.estado === "Cancelado" && !txt(v, "motivo_cancelacion")) avisos.push("Está cancelado y no dice el motivo.")
    if (v.estado === "Entregado" && !fe) avisos.push("Está entregado y no trae fecha de entrega.")
    return { problemas: [], avisos }
  },
}

const APROBACIONES: Tabla = {
  id: "aprobaciones",
  titulo: "Aprobaciones de crédito",
  archivo: "03_aprobaciones_credito.csv",
  descripcion: "El registro de cada solicitud de crédito y quién la decidió y cuándo.",
  clave: "id_pedido",
  orden: 3,
  refs: [{ campo: "id_pedido", tabla: "pedidos" }],
  campos: [
    c("id_pedido", "texto", "Pedido que se decidió", "PED-2026-00001", { obligatorio: true, fijo: true, patron: /^PED-\d{4}-\d{5}$/, patronMensaje: "tiene que tener el formato PED-AAAA-00000" }),
    c("solicitud_at", "momento", "Cuándo se pidió el crédito", "2026-04-01 08:20:00", { obligatorio: true, fijo: true }),
    c("decision_at", "momento", "Cuándo se decidió", "2026-04-01 13:30:00", {}),
    c("aprobador", "texto", "Quién decidió", "Marcela Ríos", { obligatorio: true, fijo: true }),
    c("horas_espera", "decimal", "Horas entre la solicitud y la decisión", "5.2", {}),
    c("dia_solicitud", "texto", "Día de la semana de la solicitud", "miércoles", {}),
    c("valor_pedido_cop", "dinero", "Valor del pedido", "6120000", { obligatorio: true, fijo: true }),
    c("resultado", "opcion", "Resultado de la solicitud", "Aprobado", { obligatorio: true, opciones: ["Aprobado", "Sin aprobar (cancelado)"] }),
  ],
  entreColumnas: (v) => {
    const avisos: string[] = []
    const sol = txt(v, "solicitud_at")
    const dec = txt(v, "decision_at")
    if (sol && dec && dec < sol) avisos.push("La decisión es anterior a la solicitud.")
    if (v.resultado === "Aprobado" && !dec) avisos.push("Figura aprobado pero no trae fecha de decisión.")
    return { problemas: [], avisos }
  },
}

const CARTERA: Tabla = {
  id: "cartera",
  titulo: "Cartera",
  archivo: "04_cartera_facturas.csv",
  descripcion: "Las facturas con lo pagado, el saldo pendiente y los días de mora al corte. De aquí salen el saldo y el atraso de cada cliente.",
  clave: "id_factura",
  orden: 4,
  refs: [
    { campo: "id_cliente", tabla: "clientes" },
    { campo: "id_pedido", tabla: "pedidos" },
  ],
  campos: [
    c("id_factura", "texto", "Número de la factura", "FAC-DEMO-2026-00001", { obligatorio: true, fijo: true }),
    c("id_pedido", "texto", "Pedido de la factura (opcional)", "PED-2026-00001", { fijo: true }),
    c("id_cliente", "texto", "Cliente de la factura", "CLI-049", { obligatorio: true, fijo: true }),
    c("fecha_factura", "fecha", "Día de la factura", "2026-04-08", { obligatorio: true, fijo: true }),
    c("fecha_vencimiento", "fecha", "Día en que vence", "2026-05-08", { obligatorio: true, fijo: true }),
    c("valor_factura_cop", "dinero", "Valor facturado", "6120000", { obligatorio: true, fijo: true }),
    c("valor_pagado_cop", "dinero", "Lo pagado hasta el corte", "6120000", {}),
    c("saldo_pendiente_cop", "dinero", "Lo que sigue sin pagar (en blanco = se desconoce)", "0", {}),
    c("dias_mora_al_corte", "entero", "Días de atraso al corte", "0", {}),
    c("estado_al_corte", "opcion", "Situación al corte", "Pagada", { opciones: ["Pagada", "Vigente", "Vigente parcial", "Vencida", "Vencida parcial"] }),
    c("fecha_corte", "fecha", "Fecha de la foto de cartera", "2026-09-30", { obligatorio: true }),
    c("origen_dato", "texto", "De dónde sale el dato", "SIMULADO_DOCENCIA", {}),
  ],
  // Un pedido facturado dos veces el mismo día por el mismo valor. Dos pedidos distintos del mismo valor sí pasan.
  parecidos: (v) => [`${v.id_pedido}|${v.fecha_factura}|${v.valor_factura_cop}`],
  entreColumnas: (v) => {
    const problemas: string[] = []
    const avisos: string[] = []
    const valor = num(v, "valor_factura_cop")
    const pagado = num(v, "valor_pagado_cop")
    const saldo = num(v, "saldo_pendiente_cop")
    if (saldo === null) avisos.push("Saldo en blanco: el saldo del cliente queda en blanco y sus pedidos, incompletos (CART-1).")
    if (valor !== null && saldo !== null && saldo > valor) problemas.push("El saldo pendiente es mayor que el valor de la factura.")
    else if (valor !== null && pagado !== null && saldo !== null && pagado + saldo !== valor)
      problemas.push("Lo pagado más el saldo no suma el valor de la factura.")
    const fv = txt(v, "fecha_vencimiento")
    const ff = txt(v, "fecha_factura")
    const fc = txt(v, "fecha_corte")
    if (fv && ff && fv < ff) avisos.push("El vencimiento es anterior a la factura.")
    const mora = num(v, "dias_mora_al_corte")
    if (fv && fc && saldo !== null && mora !== null) {
      const esperada = saldo > 0 ? Math.max(0, diasCalendario(soloFecha(fv), soloFecha(fc))) : 0
      if (esperada !== mora) avisos.push(`Los días de mora no cuadran: dice ${mora} y el vencimiento y el corte dan ${esperada}.`)
    }
    if (saldo === 0 && v.estado_al_corte && v.estado_al_corte !== "Pagada") avisos.push("Sin saldo pero no figura pagada.")
    if (saldo !== null && saldo > 0 && v.estado_al_corte === "Pagada") avisos.push("Tiene saldo pero figura pagada.")
    return { problemas, avisos }
  },
}

export const TABLAS: Tabla[] = [CLIENTES, PEDIDOS, APROBACIONES, CARTERA]
export const tablaPorId = (id: TablaId) => TABLAS.find((t) => t.id === id)!

/** Qué tabla es un archivo, mirando sus encabezados (y, si empatan, su nombre). */
export function detectarTabla(
  encabezado: string[],
  nombreArchivo: string,
): { tabla: Tabla; reconocidas: number; faltan: string[]; sobran: string[]; renombradas: { original: string; campo: string }[] } | null {
  const normales = encabezado.map(normalizarEncabezado)
  const nombre = normalizarEncabezado(nombreArchivo)
  const PISTAS: Record<TablaId, string> = { clientes: "cliente", pedidos: "pedidos", aprobaciones: "aprobacion", cartera: "cartera" }
  const suena = (t: Tabla) => nombre.includes(PISTAS[t.id])
  let mejor: { tabla: Tabla; puntos: number } | null = null
  for (const tabla of TABLAS) {
    const encontrados = tabla.campos.filter((k) => normales.includes(k.nombre)).length
    const puntos = encontrados / tabla.campos.length + (suena(tabla) ? 0.5 : 0)
    if (!mejor || puntos > mejor.puntos) mejor = { tabla, puntos }
  }
  if (!mejor) return null
  const { tabla } = mejor
  const reconocidas = tabla.campos.filter((k) => normales.includes(k.nombre)).length
  // Menos de la mitad de las columnas: no es ninguna de las cuatro, salvo que el nombre lo diga y traiga la llave.
  if (reconocidas < tabla.campos.length / 2 && !(suena(tabla) && normales.includes(tabla.clave))) return null
  const conocidas = new Set(tabla.campos.map((k) => k.nombre))
  return {
    tabla,
    reconocidas,
    faltan: tabla.campos.filter((k) => !normales.includes(k.nombre)).map((k) => k.nombre),
    sobran: encabezado.filter((h) => !conocidas.has(normalizarEncabezado(h))),
    renombradas: encabezado
      .filter((h) => h !== normalizarEncabezado(h) && conocidas.has(normalizarEncabezado(h)))
      .map((h) => ({ original: h, campo: normalizarEncabezado(h) })),
  }
}
