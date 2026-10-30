"use client"

import { useState } from "react"
import { DownloadIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { Carga } from "@/lib/carga/base"
import { escribirCSV } from "@/lib/carga/csv"
import { TABLAS, tablaPorId } from "@/lib/carga/esquema"
import { fmtFechaHora } from "@/lib/fechas"
import { descargar } from "@/lib/importar"
import { usePrototipo } from "@/lib/store"
import { Bloque } from "./piezas"

// Lo que hay en la base: cuántas filas por tabla, las cargas hechas y la historia de cada fila.

/** Un botón por archivo con lo apartado: las mismas columnas del archivo y una más con el motivo. */
export function DescargaApartadas({ carga }: { carga: Carga }) {
  const archivos = [...new Set(carga.apartadas.map((a) => a.archivo))]
  return (
    <div className="flex flex-wrap gap-2">
      {archivos.map((nombre) => {
        const filas = carga.apartadas.filter((a) => a.archivo === nombre)
        const encabezado = filas[0].encabezado
        return (
          <Button
            key={nombre}
            variant="outline"
            size="sm"
            onClick={() =>
              descargar(
                `apartadas_${carga.id}_${nombre}`,
                escribirCSV([...encabezado, "motivo_apartada"], filas.map((f) => [...encabezado.map((h) => f.crudo[h] ?? ""), f.motivo])),
              )
            }
          >
            <DownloadIcon data-icon="inline-start" />
            {filas.length} apartadas de {nombre}
          </Button>
        )
      })}
    </div>
  )
}

const EQUIVALENTE = [
  ["Tabla clientes (llave id_cliente)", "tabla `clientes`, llave primaria id_cliente"],
  ["Tabla pedidos (llave id_pedido)", "tabla `pedidos`, referencia a clientes"],
  ["Las decisiones (eventos de cada pedido) y los lotes EXP-…", "tabla `decisiones`, la que se exporta a SAP con el formato de aprobaciones, y tabla `exportaciones` (quién, cuándo, qué pedidos)"],
  ["Tabla cartera (llave id_factura)", "tabla `cartera_facturas`, referencia a clientes y pedidos"],
  ["`versiones` de cada fila", "tabla de historia: una fila por cada valor anterior, con la carga que lo trajo"],
  ["`crudo` de cada fila", "columna JSON con la fila tal como llegó, también las columnas que la app no usa"],
  ["`cargas` y `apartadas`", "tablas `cargas` (quién, cuándo, qué archivo, huella) y `filas_apartadas` (motivo)"],
  ["Revisión (lib/carga/revisar.ts)", "el mismo script, en el servidor, antes de cada INSERT o UPDATE"],
]

export function BaseDatos() {
  const { base } = usePrototipo()
  const [llave, setLlave] = useState("")
  const buscado = llave.trim()
  const hallazgos = buscado ? TABLAS.flatMap((t) => (base.tablas[t.id][buscado] ? [{ tabla: t, fila: base.tablas[t.id][buscado] }] : [])) : []
  const cargas = [...base.cargas].reverse()

  return (
    <div className="flex flex-col gap-6">
      <Bloque titulo="Lo que hay en la base" tipos={["humano"]} pie="Hoy la base vive en la memoria del navegador: al recargar la página o reiniciar la demostración vuelve a empezar con los clientes de siempre.">
        <div className="overflow-x-auto border border-linea">
          <Table className="text-sm">
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead className="etiqueta">Tabla</TableHead>
                <TableHead className="etiqueta text-right">Filas</TableHead>
                <TableHead className="etiqueta text-right">Con historial</TableHead>
                <TableHead className="etiqueta">Última carga</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {TABLAS.map((t) => {
                const filas = Object.values(base.tablas[t.id])
                const ultima = filas.map((f) => f.carga).sort().at(-1)
                return (
                  <TableRow key={t.id}>
                    <TableCell>{t.titulo}</TableCell>
                    <TableCell className="text-right font-mono">{filas.length}</TableCell>
                    <TableCell className="text-right font-mono">{filas.filter((f) => f.versiones.length).length}</TableCell>
                    <TableCell className="font-mono">{ultima ?? "—"}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </Bloque>

      <Bloque titulo="Cargas hechas" tipos={["humano"]} pie="Cada carga guarda los archivos, cuántas filas hizo de cada tipo y lo que dejó apartado. La huella permite reconocer si un archivo ya se subió.">
        <ul className="flex flex-col gap-4">
          {cargas.map((c) => (
            <li key={c.id} className="border border-linea p-4">
              <p className="mb-2 text-[15px]">
                <span className="font-mono">{c.id}</span> · {fmtFechaHora(c.fecha)} · {c.quien}
              </p>
              <ul className="flex flex-col gap-1 text-sm">
                {c.archivos.map((a) => (
                  <li key={a.nombre}>
                    <span className="font-mono">{a.nombre}</span>
                    {a.tabla ? ` · ${tablaPorId(a.tabla).titulo}: ${a.filas} filas: ${a.nuevas} nuevas, ${a.actualizadas} actualizadas, ${a.iguales} ya estaban, ${a.apartadas} apartadas` : " · no se pudo leer"}
                  </li>
                ))}
              </ul>
              {c.notas.map((n) => (
                <p key={n} className="mt-1 text-sm text-muted-foreground">
                  {n}
                </p>
              ))}
              {c.apartadas.length > 0 && (
                <div className="mt-3">
                  <DescargaApartadas carga={c} />
                </div>
              )}
            </li>
          ))}
        </ul>
      </Bloque>

      <Bloque titulo="Buscar una fila y su historia" tipos={["humano"]} pie="Cuando una fila se actualiza, la versión anterior no se borra: queda aquí, con la carga que la trajo.">
        <input
          value={llave}
          onChange={(e) => setLlave(e.target.value)}
          placeholder="Una llave: CLI-021, PED-2026-03108, FAC-2026-04410…"
          aria-label="Llave a buscar"
          className="w-full max-w-md rounded-md border border-linea bg-papel px-3 py-2 text-sm outline-none focus-visible:border-tinta"
        />
        {buscado && hallazgos.length === 0 && <p className="mt-3 text-sm text-muted-foreground">No hay ninguna fila con la llave «{buscado}».</p>}
        {hallazgos.map(({ tabla, fila }) => (
          <div key={tabla.id} className="mt-4 border border-linea p-4 text-sm">
            <p className="mb-2">
              {tabla.titulo} · cargada en <span className="font-mono">{fila.carga}</span> · línea {fila.linea} del archivo
            </p>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5">
              {tabla.campos.map((c) => (
                <div key={c.nombre} className="contents">
                  <dt className="font-mono text-muted-foreground">{c.nombre}</dt>
                  <dd>{fila.v[c.nombre] === null ? "(vacío)" : String(fila.v[c.nombre])}</dd>
                </div>
              ))}
            </dl>
            {fila.versiones.length > 0 && (
              <div className="mt-3 border-t border-linea pt-2">
                <p className="mb-1 font-medium">Versiones anteriores ({fila.versiones.length})</p>
                {[...fila.versiones].reverse().map((v, i) => (
                  <p key={i}>
                    <span className="font-mono">{v.carga}</span>:{" "}
                    {tabla.campos
                      .filter((c) => v.v[c.nombre] !== fila.v[c.nombre])
                      .map((c) => `${c.nombre} era ${v.v[c.nombre] === null ? "(vacío)" : String(v.v[c.nombre])}`)
                      .join(" · ")}
                  </p>
                ))}
              </div>
            )}
          </div>
        ))}
      </Bloque>

      <Bloque titulo="Cómo sería en una base de datos real" tipos={["humano"]} pie="Para los mentores: lo que pasa aquí es lo que haría un script con una base real. Lo que decide el stack es dónde corre ese script y quién lo dispara.">
        <div className="overflow-x-auto border border-linea">
          <Table className="text-sm">
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead className="etiqueta">En el prototipo</TableHead>
                <TableHead className="etiqueta">En la app real</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {EQUIVALENTE.map(([a, b]) => (
                <TableRow key={a}>
                  <TableCell className="whitespace-normal">{a}</TableCell>
                  <TableCell className="whitespace-normal">{b}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Bloque>
    </div>
  )
}
