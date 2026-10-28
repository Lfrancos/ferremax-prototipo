// Formato colombiano del Sistema de diseño: coma decimal, punto de miles,
// % pegado, horas con "h" y un decimal.

function miles(entero: number) {
  return Math.round(entero)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".")
}

function decimal(n: number, decimales: number) {
  const [e, d] = Math.abs(n).toFixed(decimales).split(".")
  return `${n < 0 ? "-" : ""}${miles(Number(e))}${d ? "," + d : ""}`
}

/** "1.840.000" (la unidad va en el encabezado o el pie). */
export const fmtCOP = (n: number) => miles(n)

/** "COP 131,7 M" */
export const fmtMillones = (n: number) => `COP ${decimal(n / 1_000_000, 1)} M`

/** "13,5 h" */
export const fmtHoras = (h: number) => `${decimal(h, 1)} h`

/** "5 h", "1 d 6 h", "3 d": para lo que ya lleva más de un día. */
export function fmtDuracion(horas: number) {
  const total = Math.max(0, Math.round(horas))
  const d = Math.floor(total / 24)
  const h = total % 24
  if (d === 0) return `${h} h`
  return h === 0 ? `${d} d` : `${d} d ${h} h`
}

/** "66,7%" */
export const fmtPct = (x: number) => `${decimal(x, 1)}%`

/** "1 día", "4 días" */
export const fmtDias = (n: number) => `${n} ${n === 1 ? "día" : "días"}`

export const fmtNumero = (n: number, decimales = 1) => decimal(n, decimales)
