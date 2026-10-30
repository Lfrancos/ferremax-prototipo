// Lectura simple de CSV y descarga de archivos. La carga de los cuatro archivos de SAP (con su revisión) vive en lib/carga;
// esto lo usa el importador de cartera de /cartera, que sigue con su propio formato de partidas abiertas.

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
