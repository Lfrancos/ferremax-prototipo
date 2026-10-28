import { HOY } from "./data"
import { esAntes, leerFechaHora, soloFecha } from "./fechas"
import type { Cliente, FechaHora, Pedido, PedidoRegistro } from "./tipos"

// OPCIÓN A · SATÉLITE: las solicitudes nacen en SAP y llegan en un archivo diario.
// El archivo es un CSV que Excel abre y guarda sin problema (separador ";" como en
// Excel en español, o "," o tabulador). También sirve pegar las filas copiadas de Excel.
// Esto revisa datos; no aplica reglas del negocio: esas corren después, en lib/rules.ts.

export const COLUMNAS_SAP = [
  { clave: "id_pedido", descripcion: "Número del pedido en SAP", ejemplo: "PED-2026-03108" },
  { clave: "id_cliente", descripcion: "ID del cliente en el maestro de SAP", ejemplo: "CLI-002" },
  { clave: "razon_social", descripcion: "Para revisar que el ID es el cliente correcto", ejemplo: "Ingeniería y Obras Yarumo S.A.S." },
  { clave: "valor_cop", descripcion: "Valor del pedido en pesos, sin signo", ejemplo: "6250000" },
  { clave: "lineas", descripcion: "Referencias del pedido", ejemplo: "4" },
  { clave: "fecha_solicitud", descripcion: "Cuándo se registró la solicitud de crédito en SAP", ejemplo: "2026-11-30 06:45" },
  { clave: "vendedor", descripcion: "Quién la registró", ejemplo: "Daniela Ospina" },
] as const

export type ClaveSAP = (typeof COLUMNAS_SAP)[number]["clave"]

export const NOMBRE_EJEMPLO = `solicitudes_${soloFecha(HOY)}.csv`

/** Archivo de ejemplo "descargado de SAP" hoy: trae casos buenos y casos con problemas. */
export function archivoEjemplo() {
  const filas = [
    ["PED-2026-03108", "CLI-002", "Ingeniería y Obras Yarumo S.A.S.", "6250000", "4", "2026-11-30 06:45", "Daniela Ospina"],
    ["PED-2026-03109", "CLI-021", "Urbanizadora Palmetto S.A.", "32400000", "12", "2026-11-30 07:10", "Esteban Giraldo"],
    ["PED-2026-03110", "CLI-118", "Manufacturas Cóndor Ltda.", "1200000", "1", "2026-11-30 07:30", "Mauricio Lasso"],
    ["PED-2026-03101", "CLI-068", "Consorcio Pacífico Ltda.", "1840000", "2", "2026-11-30 07:40", "Sofía Mejía"],
    ["PED-2026-03111", "CLI-150", "Constructora Altamira S.A.S.", "3900000", "3", "2026-11-30 08:05", "Paula Cifuentes"],
    ["PED-2026-03112", "CLI-037", "Explotaciones Mineros del Norte S.A.", "", "5", "2026-11-30 08:20", "Édinson Rojas"],
  ]
  return [COLUMNAS_SAP.map((c) => c.clave), ...filas].map((f) => f.join(";")).join("\r\n")
}

/** Descarga un texto como archivo. El BOM hace que Excel lea bien las tildes. */
export function descargar(nombre: string, texto: string) {
  const url = URL.createObjectURL(new Blob(["﻿" + texto], { type: "text/csv;charset=utf-8" }))
  const a = document.createElement("a")
  a.href = url
  a.download = nombre
  a.click()
  URL.revokeObjectURL(url)
}

/** Separa un CSV en celdas. Respeta comillas ("a;b" es una sola celda). */
export function leerCSV(texto: string): string[][] {
  const limpio = texto.replace(/^﻿/, "").replace(/\r\n?/g, "\n")
  const primera = limpio.split("\n")[0] ?? ""
  const sep = primera.includes("\t") ? "\t" : primera.split(";").length >= primera.split(",").length ? ";" : ","
  const filas: string[][] = []
  let fila: string[] = []
  let celda = ""
  let comillas = false
  for (let i = 0; i < limpio.length; i++) {
    const c = limpio[i]
    if (comillas) {
      if (c === '"' && limpio[i + 1] === '"') {
        celda += '"'
        i++
      } else if (c === '"') comillas = false
      else celda += c
    } else if (c === '"') comillas = true
    else if (c === sep) {
      fila.push(celda)
      celda = ""
    } else if (c === "\n") {
      fila.push(celda)
      filas.push(fila)
      fila = []
      celda = ""
    } else celda += c
  }
  if (celda || fila.length) filas.push([...fila, celda])
  return filas.filter((f) => f.some((x) => x.trim()))
}

/** "32.400.000", "32400000" o "32 400 000" → 32400000. */
export function leerNumero(texto: string) {
  const t = texto.trim().replace(/[.\s$]/g, "").replace(",", ".")
  return t === "" ? null : Number(t)
}

export interface FilaRevisada {
  numero: number
  valores: Record<ClaveSAP, string>
  estado: "nueva" | "repetida" | "error"
  problemas: string[]
  avisos: string[]
  registro?: PedidoRegistro
  fechaSolicitud?: FechaHora
}

export interface Revision {
  archivo: string
  faltanColumnas: string[]
  filas: FilaRevisada[]
}

/** Revisa cada fila contra el maestro de clientes y los pedidos que ya están en la app. */
export function revisarArchivo(texto: string, archivo: string, clientes: Cliente[], pedidos: Pedido[], ahora: FechaHora = HOY): Revision {
  const [encabezado = [], ...datos] = leerCSV(texto)
  const nombres = encabezado.map((h) => h.trim().toLowerCase())
  const faltanColumnas = COLUMNAS_SAP.map((c) => c.clave).filter((c) => !nombres.includes(c))
  if (faltanColumnas.length) return { archivo, faltanColumnas, filas: [] }

  const porCliente = new Map(clientes.map((c) => [c.id_cliente, c]))
  const yaEnApp = new Set(pedidos.map((p) => p.id_pedido))
  const vistos = new Set<string>()

  const filas = datos.map((celdas, i): FilaRevisada => {
    const valores = Object.fromEntries(COLUMNAS_SAP.map((c) => [c.clave, (celdas[nombres.indexOf(c.clave)] ?? "").trim()])) as Record<ClaveSAP, string>
    const problemas: string[] = []
    const avisos: string[] = []
    const base = { numero: i + 2, valores, problemas, avisos }

    if (!/^PED-\d{4}-\d{5}$/.test(valores.id_pedido)) problemas.push("El número de pedido no tiene el formato PED-AAAA-00000.")
    else if (yaEnApp.has(valores.id_pedido)) return { ...base, estado: "repetida", avisos: ["Ya está en la app: no se vuelve a importar."] }
    else if (vistos.has(valores.id_pedido)) return { ...base, estado: "repetida", avisos: ["Está repetido en el mismo archivo."] }
    vistos.add(valores.id_pedido)

    const cliente = porCliente.get(valores.id_cliente)
    if (!cliente) problemas.push(`El cliente ${valores.id_cliente || "(vacío)"} no está en la base de clientes. Sandra lo crea en /clientes y se vuelve a importar.`)
    else {
      if (valores.razon_social && valores.razon_social !== cliente.razon_social)
        avisos.push(`El archivo dice "${valores.razon_social}"; el maestro dice "${cliente.razon_social}". Se usa el maestro.`)
      if (valores.vendedor && valores.vendedor !== cliente.vendedor)
        avisos.push(`El vendedor asignado en el maestro es ${cliente.vendedor}.`)
    }

    const valor = leerNumero(valores.valor_cop)
    if (valor === null) problemas.push("Falta el valor del pedido.")
    else if (!Number.isFinite(valor) || valor <= 0) problemas.push("El valor tiene que ser un número mayor que 0.")

    const lineas = leerNumero(valores.lineas)
    if (lineas === null || !Number.isInteger(lineas) || lineas <= 0) problemas.push("Las líneas tienen que ser un número entero mayor que 0.")

    const fecha = leerFechaHora(valores.fecha_solicitud)
    if (!fecha) problemas.push("La fecha de solicitud no se entiende. Usa AAAA-MM-DD HH:MM o DD/MM/AAAA HH:MM.")
    else if (esAntes(ahora, fecha)) problemas.push("La fecha de solicitud es posterior a hoy.")

    if (!valores.vendedor) problemas.push("Falta el vendedor.")

    if (problemas.length) return { ...base, estado: "error" }

    return {
      ...base,
      estado: "nueva",
      fechaSolicitud: fecha!,
      registro: {
        id_pedido: valores.id_pedido,
        id_cliente: cliente!.id_cliente,
        valor_cop: valor!,
        lineas: lineas!,
        origen: "SAP",
        eventos: [
          { accion: "solicitado", fecha: fecha!, quien: valores.vendedor, motivo: "Registrada en SAP." },
          { accion: "por_aprobar", fecha: ahora, quien: "Sistema", motivo: `Importada de ${archivo}.` },
        ],
      },
    }
  })

  return { archivo, faltanColumnas, filas }
}
