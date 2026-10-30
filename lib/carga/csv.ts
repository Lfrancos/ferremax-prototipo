import { leerFechaHora } from "../fechas"
import type { FechaHora } from "../tipos"

// Lectura de archivos CSV para la carga de datos. Sin React ni estado: es lo que haría el script del servidor.
// Cada celda se guarda tal como llegó; entenderla (número, fecha) es un paso aparte para no perder nada.

export type Separador = "," | ";" | "\t"

export interface TablaLeida {
  separador: Separador
  tieneBOM: boolean
  encabezado: string[]
  /** `linea` es la línea del archivo donde empieza la fila (la 1 es el encabezado). */
  filas: { linea: number; celdas: string[] }[]
  /** Líneas en blanco que se saltaron. */
  vacias: number
  /** Una comilla abierta que nunca se cierra se come el resto del archivo. */
  comillasSinCerrar: boolean
}

/** Separa un CSV en celdas. Respeta comillas ("a,b" es una sola celda) y detecta , ; o tabulador. */
export function leerTabla(texto: string): TablaLeida {
  const tieneBOM = texto.startsWith("﻿")
  const s = tieneBOM ? texto.slice(1) : texto
  const primera = s.split(/\r\n|\n|\r/, 1)[0] ?? ""
  const veces = (c: string) => primera.split(c).length - 1
  const separador: Separador = veces("\t") > 0 ? "\t" : veces(";") > veces(",") ? ";" : ","

  const crudas: { linea: number; celdas: string[] }[] = []
  let fila: string[] = []
  let celda = ""
  let comillas = false
  let linea = 1
  let inicio = 1
  const cerrar = () => {
    fila.push(celda)
    crudas.push({ linea: inicio, celdas: fila })
    fila = []
    celda = ""
  }
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (comillas) {
      if (c === '"' && s[i + 1] === '"') {
        celda += '"'
        i++
      } else if (c === '"') comillas = false
      else {
        if (c === "\n") linea++
        celda += c
      }
    } else if (c === '"' && celda === "") comillas = true
    else if (c === separador) {
      fila.push(celda)
      celda = ""
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++
      cerrar()
      linea++
      inicio = linea
    } else celda += c
  }
  const comillasSinCerrar = comillas
  if (celda !== "" || fila.length) cerrar()

  const enBlanco = (f: { celdas: string[] }) => f.celdas.every((x) => !x.trim())
  const utiles = crudas.filter((f) => !enBlanco(f))
  const [cabecera, ...filas] = utiles
  return {
    separador,
    tieneBOM,
    encabezado: (cabecera?.celdas ?? []).map((h) => h.trim()),
    filas,
    vacias: crudas.length - utiles.length,
    comillasSinCerrar,
  }
}

/** "ID Cliente", "Razón social" → "id_cliente", "razon_social". */
export const normalizarEncabezado = (h: string) =>
  h
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")

/** Sin tildes ni mayúsculas, para comparar valores de una lista. */
export const sinTildes = (t: string) =>
  t
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")

/**
 * "6120000", "6.120.000", "6,120,000", "$ 6.120.000" o "0,312" → número. null si no se entiende.
 * Con `decimal`, un punto con tres cifras detrás ("1.234") es decimal; si no, son miles.
 */
export function leerNumero(texto: string, decimal = false): number | null {
  const t = texto.trim().replace(/[$\s]/g, "")
  if (/^-?\d+$/.test(t)) return Number(t)
  if (decimal && /^-?\d+[.,]\d+$/.test(t)) return Number(t.replace(",", "."))
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) return Number(t.replace(/\./g, "").replace(",", "."))
  if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(t)) return Number(t.replace(/,/g, ""))
  if (/^-?\d+[.,]\d+$/.test(t)) return Number(t.replace(",", "."))
  return null
}

const diasDelMes = (a: number, m: number) => new Date(Date.UTC(a, m, 0)).getUTCDate()

/**
 * "2026-04-01", "2026-04-01 08:20:00", "2026-04-01T08:20" o "01/04/2026 8:20" → "AAAA-MM-DDTHH:mm".
 * Revisa que el día exista (el 31 de febrero no). `local` avisa que venía como día/mes/año.
 */
export function leerMomento(texto: string): { valor: FechaHora; local: boolean } | null {
  const t = texto.trim().replace(/(\d{1,2}:\d{2}):\d{2}(?:\.\d+)?(?:Z|[+-]\d\d:?\d\d)?$/, "$1")
  const valor = leerFechaHora(t)
  if (!valor) return null
  const [a, m, d] = valor.split("T")[0].split("-").map(Number)
  if (d > diasDelMes(a, m)) return null
  return { valor, local: /^\d{1,2}\//.test(t) }
}

/** Una huella corta del contenido, para saber si el mismo archivo ya se cargó. No es criptografía. */
export function huella(texto: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return `${(h >>> 0).toString(16).padStart(8, "0")}-${texto.length}`
}

/** Un CSV con comillas donde hacen falta. */
export function escribirCSV(encabezado: string[], filas: string[][]): string {
  const celda = (x: string) => (/[",\n\r;]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x)
  return [encabezado, ...filas].map((f) => f.map(celda).join(",")).join("\r\n")
}
