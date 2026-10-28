import { CLIENTES, HOY, PARTIDAS_INICIALES } from "./data"
import { aLaHora, esAntes, leerFechaHora, soloFecha } from "./fechas"
import { leerCSV, leerNumero } from "./importar"
import { TIPOS_PARTIDA, type Cliente, type CorteCartera, type FechaHora, type PartidaAbierta, type TipoPartida } from "./tipos"

// OPCIÓN A · SATÉLITE PARA LA CARTERA: SAP sigue llevando facturas y pagos.
// Cada mañana se descarga el reporte de partidas abiertas de clientes y se importa.
// Un corte es una foto completa: reemplaza al anterior. Por eso, si una fila tiene un
// error de formato no se importa nada: un corte a medias daría saldos más bajos de lo real.
// Aquí solo se revisan datos; el saldo y el atraso los calculan CART-1 y CART-2.

export const COLUMNAS_CARTERA = [
  { clave: "id_cliente", descripcion: "ID del cliente en el maestro de SAP", ejemplo: "CLI-068" },
  { clave: "razon_social", descripcion: "Para revisar que el ID es el cliente correcto", ejemplo: "Consorcio Pacífico Ltda." },
  { clave: "documento", descripcion: "Número de la factura o del recibo de caja", ejemplo: "FAC-2026-04412" },
  { clave: "tipo", descripcion: "Factura o Pago sin aplicar", ejemplo: "Factura" },
  { clave: "id_pedido", descripcion: "Pedido de la factura (opcional)", ejemplo: "PED-2026-03101" },
  { clave: "fecha_documento", descripcion: "Fecha de la factura o del pago", ejemplo: "2026-11-10" },
  { clave: "vencimiento", descripcion: "Facturas: fecha + plazo del cliente", ejemplo: "2026-12-25" },
  { clave: "valor_cop", descripcion: "Valor del documento", ejemplo: "2412000" },
  { clave: "saldo_abierto_cop", descripcion: "Lo que sigue sin pagar", ejemplo: "2412000" },
] as const

type Clave = (typeof COLUMNAS_CARTERA)[number]["clave"]

export const NOMBRE_EJEMPLO_CARTERA = `partidas_abiertas_${soloFecha(HOY)}_0830.csv`

/**
 * Corte de ejemplo de las 8:30 a.m.: lo que cambió desde el de las 6:00.
 * Pacífico pagó la factura vencida; cartera aplicó el pago de Manufacturas Cóndor;
 * llegó el saldo de Metalmecánica Cóndor.
 */
export function carteraEjemplo() {
  const partidas = PARTIDAS_INICIALES.filter(
    (p) => !["FAC-2026-03987", "FAC-2026-03690", "RC-2026-01877"].includes(p.documento),
  ).map((p) => (p.documento === "FAC-2026-04425" ? { ...p, saldo_abierto_cop: p.valor_cop } : p))
  const fecha = (f: FechaHora | null) => (f ? soloFecha(f) : "")
  const filas = partidas.map((p) => [
    p.id_cliente,
    CLIENTES.find((c) => c.id_cliente === p.id_cliente)?.razon_social ?? "",
    p.documento,
    p.tipo,
    p.id_pedido ?? "",
    fecha(p.fecha_documento),
    fecha(p.vencimiento),
    String(p.valor_cop),
    p.saldo_abierto_cop === null ? "" : String(p.saldo_abierto_cop),
  ])
  return [COLUMNAS_CARTERA.map((c) => c.clave), ...filas].map((f) => f.join(";")).join("\r\n")
}

export interface FilaCartera {
  numero: number
  valores: Record<Clave, string>
  problemas: string[]
  avisos: string[]
  partida?: PartidaAbierta
}

export interface RevisionCartera {
  archivo: string
  faltanColumnas: string[]
  filas: FilaCartera[]
  /** Si hay errores no se importa nada. */
  bloqueada: boolean
  corte?: CorteCartera
}

export function revisarCartera(texto: string, archivo: string, clientes: Cliente[], importa: string, ahora: FechaHora = HOY): RevisionCartera {
  const [encabezado = [], ...datos] = leerCSV(texto)
  const nombres = encabezado.map((h) => h.trim().toLowerCase())
  const faltanColumnas = COLUMNAS_CARTERA.map((c) => c.clave).filter((c) => !nombres.includes(c))
  if (faltanColumnas.length) return { archivo, faltanColumnas, filas: [], bloqueada: true }

  const porCliente = new Map(clientes.map((c) => [c.id_cliente, c]))
  const vistos = new Set<string>()

  const filas = datos.map((celdas, i): FilaCartera => {
    const valores = Object.fromEntries(
      COLUMNAS_CARTERA.map((c) => [c.clave, (celdas[nombres.indexOf(c.clave)] ?? "").trim()]),
    ) as Record<Clave, string>
    const problemas: string[] = []
    const avisos: string[] = []

    const cliente = porCliente.get(valores.id_cliente)
    if (!cliente) problemas.push(`El cliente ${valores.id_cliente || "(vacío)"} no está en la base de clientes.`)
    else if (valores.razon_social && valores.razon_social !== cliente.razon_social)
      avisos.push(`El archivo dice "${valores.razon_social}"; el maestro dice "${cliente.razon_social}".`)

    if (!valores.documento) problemas.push("Falta el número de documento.")
    else if (vistos.has(valores.documento)) problemas.push("El documento está repetido en el archivo.")
    vistos.add(valores.documento)

    const tipo = TIPOS_PARTIDA.find((t) => t.toLowerCase() === valores.tipo.toLowerCase()) as TipoPartida | undefined
    if (!tipo) problemas.push(`El tipo tiene que ser ${TIPOS_PARTIDA.join(" o ")}.`)

    const fecha = leerFechaHora(valores.fecha_documento)
    if (!fecha) problemas.push("La fecha del documento no se entiende.")
    else if (esAntes(ahora, fecha)) problemas.push("La fecha del documento es posterior a hoy.")

    let vencimiento: FechaHora | null = null
    if (valores.vencimiento) {
      vencimiento = leerFechaHora(valores.vencimiento)
      if (!vencimiento) problemas.push("El vencimiento no se entiende.")
    } else if (tipo === "Factura") avisos.push("Factura sin vencimiento: el atraso del cliente queda en blanco (CART-2).")

    const valor = leerNumero(valores.valor_cop)
    if (valor === null || !Number.isFinite(valor) || valor <= 0) problemas.push("El valor tiene que ser un número mayor que 0.")

    let saldo: number | null = null
    if (valores.saldo_abierto_cop) {
      const s = leerNumero(valores.saldo_abierto_cop)
      if (s === null || !Number.isFinite(s) || s < 0) problemas.push("El saldo abierto tiene que ser un número de 0 o más.")
      else if (valor !== null && s > valor) problemas.push("El saldo abierto no puede ser mayor que el valor.")
      else saldo = s
    } else avisos.push("Saldo en blanco: el saldo del cliente queda en blanco y sus pedidos, incompletos (CART-1).")

    const base = { numero: i + 2, valores, problemas, avisos }
    if (problemas.length) return base
    return {
      ...base,
      partida: {
        id_cliente: cliente!.id_cliente,
        documento: valores.documento,
        tipo: tipo!,
        id_pedido: valores.id_pedido || null,
        fecha_documento: aLaHora(fecha!, "00:00"),
        vencimiento: vencimiento ? aLaHora(vencimiento, "00:00") : null,
        valor_cop: valor!,
        saldo_abierto_cop: saldo,
      },
    }
  })

  const bloqueada = filas.some((f) => f.problemas.length > 0)
  return {
    archivo,
    faltanColumnas,
    filas,
    bloqueada,
    corte: bloqueada ? undefined : { archivo, corte: ahora, importo: importa, partidas: filas.map((f) => f.partida!) },
  }
}
