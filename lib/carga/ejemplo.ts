import { CLIENTES, HOY, PARTIDAS_INICIALES } from "../data"
import { diasCalendario, soloFecha } from "../fechas"
import { escribirCSV } from "./csv"
import { tablaPorId, type TablaId } from "./esquema"

// ARCHIVOS DE EJEMPLO para ensayar la carga sin tener los CSV de SAP a mano. Tienen las columnas reales de los
// archivos de la sesión 9 (datos/01_Primero_Aprobacion). Hay tres juegos:
//   · "dia1": una primera carga limpia, con una solicitud que viene con el valor en blanco;
//   · "dia2": lo que se sube al día siguiente: lo repetido, lo que cambió, lo dudoso y lo que se corrigió;
//   · "roto": archivos con problemas de formato, para ver cómo se avisa.

export type JuegoEjemplo = "dia1" | "dia2" | "roto"

type Fila = Record<string, string | number>
interface Archivo {
  nombre: string
  texto: string
}

const DIA = soloFecha(HOY)

/** Las columnas de la tabla, en su orden, y las filas como vienen en un CSV. */
function csv(tabla: TablaId, filas: Fila[], extra: string[] = []): string {
  const columnas = [...tablaPorId(tabla).campos.map((c) => c.nombre), ...extra]
  return escribirCSV(columnas, filas.map((f) => columnas.map((c) => String(f[c] ?? ""))))
}

const cliente = (id: string): Fila => {
  const c = CLIENTES.find((x) => x.id_cliente === id)!
  return {
    id_cliente: c.id_cliente,
    nit: c.nit,
    razon_social: c.razon_social,
    segmento: c.segmento,
    sede_principal: c.sede,
    vendedor_asignado: c.vendedor,
    plazo_credito_dias: c.plazo_dias,
    cupo_credito_cop: c.cupo_cop,
    antiguedad_anios: c.antiguedad_anios,
  }
}

const NUEVO_135: Fila = {
  id_cliente: "CLI-135",
  nit: "890.123.456-7",
  razon_social: "Constructora Altamira S.A.S.",
  segmento: "Constructora",
  sede_principal: "Bogotá",
  vendedor_asignado: "Paula Cifuentes",
  plazo_credito_dias: 30,
  cupo_credito_cop: 120_000_000,
  antiguedad_anios: 1,
}
const NUEVO_136: Fila = {
  id_cliente: "CLI-136",
  nit: "891.222.333-1",
  razon_social: "Electricistas Lumbre S.A.S.",
  segmento: "Contratista eléctrico",
  sede_principal: "Cali",
  vendedor_asignado: "Mauricio Lasso",
  plazo_credito_dias: 15,
  cupo_credito_cop: 15_000_000,
  antiguedad_anios: 3,
}

const ID_DEMO = ["CLI-002", "CLI-021", "CLI-037", "CLI-068", "CLI-118"]

/** Un pedido ya aprobado y entregado: historia que solo se guarda. */
function entregado(id: string, id_cliente: string, fecha: string, valor: number, aprobo: string, horas: number): Fila {
  const c = CLIENTES.find((x) => x.id_cliente === id_cliente)!
  const costo = Math.round(valor * 0.78)
  const solicitud = `${fecha} 08:20:00`
  const decision = `${fecha} ${String(8 + horas).padStart(2, "0")}:20:00`
  return {
    id_pedido: id,
    fecha_pedido: fecha,
    id_cliente,
    cliente: c.razon_social,
    segmento: c.segmento,
    sede: c.sede,
    vendedor: c.vendedor,
    forma_pago: "Crédito",
    valor_pedido_cop: valor,
    costo_cop: costo,
    margen_pct: Math.round(((valor - costo) / valor) * 1000) / 1000,
    lineas_pedidas: 2,
    lineas_despachadas: 2,
    solicitud_credito_at: solicitud,
    aprobacion_credito_at: decision,
    aprobo,
    fecha_despacho: "2026-11-24",
    fecha_entrega: "2026-11-25",
    lead_time_dias: 3,
    estado: "Entregado",
  }
}

const aprobacion = (p: Fila, horas: number): Fila => ({
  id_pedido: p.id_pedido,
  solicitud_at: p.solicitud_credito_at,
  decision_at: p.aprobacion_credito_at,
  aprobador: p.aprobo,
  horas_espera: horas,
  dia_solicitud: "viernes",
  valor_pedido_cop: p.valor_pedido_cop,
  resultado: "Aprobado",
})

/** Un pedido a crédito con solicitud y sin aprobación: es una solicitud por aprobar. */
function porAprobar(id: string, id_cliente: string, valor: number, lineas: number, hora: string): Fila {
  const c = CLIENTES.find((x) => x.id_cliente === id_cliente) ?? { razon_social: String(NUEVO_135.razon_social), segmento: "Constructora", sede: "Bogotá", vendedor: "Paula Cifuentes" }
  const costo = Math.round(valor * 0.78)
  return {
    id_pedido: id,
    fecha_pedido: DIA,
    id_cliente,
    cliente: c.razon_social,
    segmento: c.segmento,
    sede: c.sede,
    vendedor: c.vendedor,
    forma_pago: "Crédito",
    valor_pedido_cop: valor,
    costo_cop: costo,
    margen_pct: valor ? Math.round(((valor - costo) / valor) * 1000) / 1000 : "",
    lineas_pedidas: lineas,
    solicitud_credito_at: `${DIA} ${hora}:00`,
    estado: "En proceso",
  }
}

const HISTORICOS = [
  entregado("PED-2026-03001", "CLI-002", "2026-11-20", 8_400_000, "Marcela Ríos", 5),
  entregado("PED-2026-03002", "CLI-021", "2026-11-20", 31_000_000, "Andrés Molina", 9),
  entregado("PED-2026-03003", "CLI-068", "2026-11-21", 1_450_000, "Sandra Beltrán", 4),
  entregado("PED-2026-03004", "CLI-118", "2026-11-21", 2_200_000, "Marcela Ríos", 6),
]

/** Los mismos pedidos por aprobar de siempre: uno por cada forma de decidir (CRED-1.1) y uno con un dato en blanco. */
const solicitudes = (): Fila[] => [
  porAprobar("PED-2026-03108", "CLI-002", 6_250_000, 4, "06:45"),
  porAprobar("PED-2026-03109", "CLI-021", 32_400_000, 12, "07:10"),
  porAprobar("PED-2026-03110", "CLI-118", 1_200_000, 1, "07:30"),
  porAprobar("PED-2026-03101", "CLI-068", 1_840_000, 2, "07:40"),
  porAprobar("PED-2026-03111", "CLI-135", 3_900_000, 3, "08:05"),
  { ...porAprobar("PED-2026-03112", "CLI-037", 0, 5, "08:20"), valor_pedido_cop: "", costo_cop: "", margen_pct: "" },
]

/** Las facturas de la demo, en el formato de la cartera. Una factura sin saldo en el reporte queda en blanco. */
function facturas(): Fila[] {
  return PARTIDAS_INICIALES.filter((p) => p.tipo === "Factura").map((p) => {
    const vence = soloFecha(p.vencimiento!)
    const saldo = p.saldo_abierto_cop
    const mora = saldo === null ? "" : saldo > 0 ? Math.max(0, diasCalendario(vence, DIA)) : 0
    return {
      id_factura: p.documento,
      id_cliente: p.id_cliente,
      fecha_factura: soloFecha(p.fecha_documento),
      fecha_vencimiento: vence,
      valor_factura_cop: p.valor_cop,
      valor_pagado_cop: saldo === null ? "" : p.valor_cop - saldo,
      saldo_pendiente_cop: saldo ?? "",
      dias_mora_al_corte: mora,
      estado_al_corte: saldo === null ? "" : saldo === 0 ? "Pagada" : mora !== "" && mora > 0 ? (saldo < p.valor_cop ? "Vencida parcial" : "Vencida") : saldo < p.valor_cop ? "Vigente parcial" : "Vigente",
      fecha_corte: DIA,
      origen_dato: "EJEMPLO",
    }
  })
}

function dia1(): Archivo[] {
  const pedidos = [...HISTORICOS, ...solicitudes()]
  return [
    { nombre: `clientes_${DIA}.csv`, texto: csv("clientes", [...ID_DEMO.map(cliente), NUEVO_135, NUEVO_136]) },
    { nombre: `pedidos_${DIA}.csv`, texto: csv("pedidos", pedidos) },
    { nombre: `aprobaciones_credito_${DIA}.csv`, texto: csv("aprobaciones", HISTORICOS.map((p, i) => aprobacion(p, [5, 9, 4, 6][i]))) },
    { nombre: `cartera_facturas_${DIA}.csv`, texto: csv("cartera", facturas()) },
  ]
}

/** Lo que llega al día siguiente: casi todo repetido, y entre lo repetido, lo que cambió o no cuadra. */
function dia2(): Archivo[] {
  const clientes: Fila[] = [
    ...ID_DEMO.map(cliente).map((c) => (c.id_cliente === "CLI-021" ? { ...c, cupo_credito_cop: 900_000_000 } : c)),
    { ...NUEVO_135, nit: "890.123.456-9" },
    NUEVO_136,
    { ...NUEVO_136, id_cliente: "CLI-138", razon_social: "Lumbre Electricistas S.A.S." },
    { ...NUEVO_136, id_cliente: "CLI-139", nit: "892.444.555-6", razon_social: "Minera Horizonte S.A.S.", segmento: "Mineria" },
  ]

  const base = [...HISTORICOS, ...solicitudes()]
  const pedidos: Fila[] = base.map((p) => {
    if (p.id_pedido === "PED-2026-03108") return { ...p, aprobacion_credito_at: `${DIA} 08:40:00`, aprobo: "Marcela Ríos" }
    if (p.id_pedido === "PED-2026-03109") return { ...p, valor_pedido_cop: 34_100_000 }
    if (p.id_pedido === "PED-2026-03112") return { ...porAprobar("PED-2026-03112", "CLI-037", 5_800_000, 5, "08:20") }
    return p
  })
  pedidos.push(
    porAprobar("PED-2026-03113", "CLI-002", 4_200_000, 2, "09:00"),
    { ...porAprobar("PED-2026-03114", "CLI-021", 2_750_000, 3, "09:05"), solicitud_credito_at: "31/02/2026 09:05" },
    porAprobar("PED-2026-03115", "CLI-118", 900_000, 1, "09:10"),
    porAprobar("PED-2026-03116", "CLI-068", 1_100_000, 2, "09:12"),
    porAprobar("PED-2026-03116", "CLI-068", 1_300_000, 2, "09:12"),
    porAprobar("PED-2026-03117", "CLI-002", 4_200_000, 2, "09:00"),
  )

  const aprobaciones: Fila[] = [
    ...HISTORICOS.map((p, i) => aprobacion(p, [5, 9, 4, 6][i])),
    {
      id_pedido: "PED-2026-03108",
      solicitud_at: `${DIA} 06:45:00`,
      decision_at: `${DIA} 08:40:00`,
      aprobador: "Marcela Ríos",
      horas_espera: 1.9,
      dia_solicitud: "lunes",
      valor_pedido_cop: 6_250_000,
      resultado: "Aprobado",
    },
  ]

  const cartera = facturas().map((f, i) => {
    const pagada = { ...f, saldo_pendiente_cop: 0, valor_pagado_cop: f.valor_factura_cop, dias_mora_al_corte: 0, estado_al_corte: "Pagada" }
    if (i === 1 || i === 4) return pagada
    // Cambia el valor facturado: un dato que no debería moverse.
    if (i === 0) return { ...f, valor_factura_cop: Number(f.valor_factura_cop) + 500_000, saldo_pendiente_cop: Number(f.saldo_pendiente_cop) + 500_000 }
    // Lo pagado más el saldo no suma el valor.
    if (i === 12) return { ...f, valor_pagado_cop: 1_000, saldo_pendiente_cop: 1_000 }
    return f
  })
  return [
    { nombre: `clientes_${DIA}_b.csv`, texto: csv("clientes", clientes) },
    { nombre: `pedidos_${DIA}_b.csv`, texto: csv("pedidos", pedidos) },
    { nombre: `aprobaciones_credito_${DIA}_b.csv`, texto: csv("aprobaciones", aprobaciones) },
    { nombre: `cartera_facturas_${DIA}_b.csv`, texto: csv("cartera", cartera.map((f) => ({ ...f, comentario: "" })), ["comentario"]) },
  ]
}

/** Archivos que no se pueden leer o leen a medias: sin una columna, de otro sistema, con la codificación dañada. */
function roto(): Archivo[] {
  const sinValor = csv("pedidos", [porAprobar("PED-2026-03120", "CLI-002", 1_000_000, 1, "10:00")])
    .split("\r\n")
    .map((linea, i) => (i === 0 ? linea.replace("valor_pedido_cop,", "") : linea.replace(/,1000000,/, ",")))
    .join("\r\n")
  const clientes = csv("clientes", [cliente("CLI-002"), { ...cliente("CLI-021"), razon_social: "Urbanizadora Palmetto S.A." }]).replace("Ingeniería", "IngenierÃ­a")
  return [
    { nombre: "pedidos_sin_valor.csv", texto: sinValor },
    { nombre: "reporte_ventas_octubre.csv", texto: "sucursal;mes;ventas\r\nNorte;octubre;120\r\nSur;octubre;98\r\n" },
    { nombre: "clientes_mal_codificados.csv", texto: clientes },
  ]
}

export function archivosEjemplo(juego: JuegoEjemplo): Archivo[] {
  return juego === "dia1" ? dia1() : juego === "dia2" ? dia2() : roto()
}

export const TITULO_EJEMPLO: Record<JuegoEjemplo, { titulo: string; detalle: string }> = {
  dia1: { titulo: "Primer día", detalle: "4 archivos limpios: clientes, pedidos con 6 solicitudes por aprobar, aprobaciones y cartera." },
  dia2: { titulo: "Día siguiente", detalle: "Lo mismo, subido otra vez, con repetidos, cambios, un valor que no debería cambiar, un posible duplicado y errores." },
  roto: { titulo: "Archivos con problemas", detalle: "Un archivo sin una columna, uno de otro sistema y uno con la codificación dañada." },
}
