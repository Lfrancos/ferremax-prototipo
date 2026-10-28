import type { FechaHora } from "./tipos"

// Todas las fechas son hora local de Colombia, sin zona horaria.
// Se calculan con Date.UTC para que servidor y navegador den lo mismo.

function partes(f: FechaHora) {
  const [fecha, hora = "00:00"] = f.split("T")
  const [a, m, d] = fecha.split("-").map(Number)
  const [h, mi] = hora.split(":").map(Number)
  return { a, m, d, h, mi }
}

function aMinutos(f: FechaHora) {
  const p = partes(f)
  return Date.UTC(p.a, p.m - 1, p.d, p.h, p.mi) / 60000
}

function desdeUTC(ms: number): FechaHora {
  const dt = new Date(ms)
  const dos = (n: number) => String(n).padStart(2, "0")
  return `${dt.getUTCFullYear()}-${dos(dt.getUTCMonth() + 1)}-${dos(dt.getUTCDate())}T${dos(dt.getUTCHours())}:${dos(dt.getUTCMinutes())}`
}

/** Horas corridas entre dos momentos, de día y de noche. */
export const horasEntre = (desde: FechaHora, hasta: FechaHora) =>
  (aMinutos(hasta) - aMinutos(desde)) / 60

/** Días calendario por fecha: el mismo día es 0. */
export function diasCalendario(desde: FechaHora, hasta: FechaHora) {
  const a = partes(desde)
  const b = partes(hasta)
  return (Date.UTC(b.a, b.m - 1, b.d) - Date.UTC(a.a, a.m - 1, a.d)) / 86400000
}

export function sumarDias(f: FechaHora, dias: number): FechaHora {
  const p = partes(f)
  return desdeUTC(Date.UTC(p.a, p.m - 1, p.d + dias, p.h, p.mi))
}

export const sumarHoras = (f: FechaHora, horas: number): FechaHora => desdeUTC((aMinutos(f) + horas * 60) * 60000)

/**
 * "2026-11-30 06:45", "2026-11-30T06:45" o "30/11/2026 6:45" (como lo guarda Excel en es-CO).
 * Sin hora ("2026-11-30" o "30/11/2026") toma las 00:00. null si no se entiende.
 */
export function leerFechaHora(texto: string): FechaHora | null {
  const t = texto.trim()
  const iso = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2}))?$/)
  const local = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?: (\d{1,2}):(\d{2}))?$/)
  const p = iso
    ? { a: +iso[1], m: +iso[2], d: +iso[3], h: +(iso[4] ?? 0), mi: +(iso[5] ?? 0) }
    : local
      ? { a: +local[3], m: +local[2], d: +local[1], h: +(local[4] ?? 0), mi: +(local[5] ?? 0) }
      : null
  if (!p || p.m < 1 || p.m > 12 || p.d < 1 || p.d > 31 || p.h > 23 || p.mi > 59) return null
  const dos = (n: number) => String(n).padStart(2, "0")
  return `${p.a}-${dos(p.m)}-${dos(p.d)}T${dos(p.h)}:${dos(p.mi)}`
}

/** La misma fecha a otra hora ("07:00"). */
export const aLaHora = (f: FechaHora, hora: string): FechaHora => `${f.split("T")[0]}T${hora}`

export const soloFecha = (f: FechaHora) => f.split("T")[0]

/** 0 = domingo … 6 = sábado. */
export function diaDeSemana(f: FechaHora) {
  const p = partes(f)
  return new Date(Date.UTC(p.a, p.m - 1, p.d)).getUTCDay()
}

export const esAntes = (a: FechaHora, b: FechaHora) => aMinutos(a) < aMinutos(b)

/** Fecha dentro de un rango de días, ambos incluidos ("AAAA-MM-DD"). */
export const enRango = (f: FechaHora, desde: string, hasta: string) =>
  soloFecha(f) >= desde && soloFecha(f) <= hasta

const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"]
const DIAS_LARGO = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"]
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]
const MESES_LARGO = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
]

function horaTexto(h: number, mi: number) {
  const sufijo = h < 12 ? "a. m." : "p. m."
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(mi).padStart(2, "0")} ${sufijo}`
}

/** "lun 30 nov" */
export function fmtDia(f: FechaHora) {
  const p = partes(f)
  return `${DIAS[diaDeSemana(f)]} ${p.d} ${MESES[p.m - 1]}`
}

/** "lun 30 nov · 9:00 a. m." */
export function fmtFechaHora(f: FechaHora) {
  const p = partes(f)
  return `${fmtDia(f)} · ${horaTexto(p.h, p.mi)}`
}

/** "lunes 30 de noviembre de 2026, 9:00 a. m." */
export function fmtLargo(f: FechaHora) {
  const p = partes(f)
  return `${DIAS_LARGO[diaDeSemana(f)]} ${p.d} de ${MESES_LARGO[p.m - 1]} de ${p.a}, ${horaTexto(p.h, p.mi)}`
}

/** "23 al 29 de noviembre" */
export function fmtRango(desde: string, hasta: string) {
  const a = partes(desde)
  const b = partes(hasta)
  return a.m === b.m
    ? `${a.d} al ${b.d} de ${MESES_LARGO[b.m - 1]}`
    : `${a.d} de ${MESES_LARGO[a.m - 1]} al ${b.d} de ${MESES_LARGO[b.m - 1]}`
}
