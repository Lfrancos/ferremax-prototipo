"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { AlertTriangleIcon, CheckCircle2Icon, FileUpIcon, InfoIcon, XCircleIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { aplicarCarga, type ResultadoCarga } from "@/lib/carga/aplicar"
import { CARGA_DEMO } from "@/lib/carga/base"
import { TABLAS, tablaPorId, type Valor } from "@/lib/carga/esquema"
import { archivosEjemplo, TITULO_EJEMPLO, type JuegoEjemplo } from "@/lib/carga/ejemplo"
import {
  GRUPOS,
  RECOMENDADO,
  previsualizar,
  revisarArchivos,
  type Clase,
  type Decisiones,
  type FilaRevisada,
  type Grupo,
  type Hallazgo,
  type Revision,
} from "@/lib/carga/revisar"
import { HOY } from "@/lib/data"
import { fmtFechaHora } from "@/lib/fechas"
import { fmtCOP } from "@/lib/formato"
import { ASIGNAR_APROBADOR, AVISO_WHATSAPP, IMPORTAR_SOLICITUDES, VER_INFO_CREDITO } from "@/lib/rules"
import { usePrototipo } from "@/lib/store"
import { cn } from "@/lib/utils"
import { tramoDe } from "@/lib/vistas"
import { Estado, type ClaseEtiqueta } from "./estado"
import { ReglaBoton } from "./insignia"
import { Bloque } from "./piezas"
import { DescargaApartadas } from "./base-datos"

// Cargar archivos: se suben los tres CSV de SAP (clientes, pedidos, cartera), se revisan antes de guardar y se guardan
// en la base sin perder ninguna fila. Toda la lógica está en lib/carga (sin React); aquí solo se muestra y se decide.

const ETIQUETA: Record<Clase, { clase: ClaseEtiqueta; palabra: string }> = {
  nueva: { clase: "aprobado", palabra: "Nuevas" },
  igual: { clase: "en-plazo", palabra: "Ya estaban" },
  repetida_igual: { clase: "en-plazo", palabra: "Repetidas en el archivo" },
  cambia: { clase: "aviso", palabra: "Con datos nuevos" },
  sospechosa: { clase: "vencido", palabra: "Dato que no debería cambiar" },
  posible_duplicado: { clase: "fuera-regla", palabra: "Posible duplicado" },
  conflicto_archivo: { clase: "fuera-regla", palabra: "Llave repetida con datos distintos" },
  error: { clase: "vencido", palabra: "Con error" },
}

const DINERO = new Set(TABLAS.flatMap((t) => t.campos.filter((c) => c.tipo === "dinero").map((c) => c.nombre)))

const ICONO = { error: XCircleIcon, aviso: AlertTriangleIcon, info: InfoIcon } as const
const COLOR = { error: "text-vencido", aviso: "text-aviso", info: "text-grafito" } as const

function Hallazgos({ lista }: { lista: Hallazgo[] }) {
  if (!lista.length) return null
  return (
    <ul className="flex flex-col gap-1.5">
      {lista.map((h, i) => {
        const Icono = ICONO[h.nivel]
        return (
          <li key={i} className={cn("flex gap-2 text-sm", COLOR[h.nivel])}>
            <Icono className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>{h.texto}</span>
          </li>
        )
      })}
    </ul>
  )
}

/** "1 nueva", "3 nuevas". */
const cuenta = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`

const ORDEN_GRUPOS: Grupo[] = ["cambia", "sospechosa", "posible_duplicado", "conflicto_archivo"]

export function CargarArchivos() {
  const { base, pedidos, rol, cargar } = usePrototipo()
  const [revision, setRevision] = useState<Revision | null>(null)
  const [decisiones, setDecisiones] = useState<Decisiones>(RECOMENDADO)
  const [resultado, setResultado] = useState<ResultadoCarga | null>(null)
  const [abiertos, setAbiertos] = useState<Record<string, boolean>>({})
  const entrada = useRef<HTMLInputElement>(null)
  const puede = IMPORTAR_SOLICITUDES.fn(rol)
  const verInfo = VER_INFO_CREDITO.fn(rol)
  const enApp = new Set(pedidos.map((p) => p.id_pedido))
  const porAprobar = new Set(pedidos.filter((p) => tramoDe(p) === "aprobar").map((p) => p.id_pedido))

  function revisar(nuevos: { nombre: string; texto: string }[]) {
    setRevision(revisarArchivos(nuevos, { base, ahora: HOY, pedidosEnApp: enApp }))
    setDecisiones(RECOMENDADO)
    setResultado(null)
    setAbiertos({})
  }

  async function leer(lista: FileList | File[]) {
    const leidos = await Promise.all([...lista].map(async (f) => ({ nombre: f.name, texto: await f.text() })))
    if (leidos.length) revisar(leidos)
  }

  function guardar() {
    if (!revision) return
    const r = aplicarCarga(base, revision, decisiones, { fecha: HOY, quien: rol, pedidosEnApp: enApp, porAprobar })
    cargar(r)
    setResultado(r)
    setRevision(null)
    const t = r.carga.archivos.reduce((s, a) => ({ n: s.n + a.nuevas, a: s.a + a.actualizadas, x: s.x + a.apartadas }), { n: 0, a: 0, x: 0 })
    toast.success(`${r.carga.id} guardada`, { description: `${t.n} filas nuevas, ${t.a} actualizadas, ${t.x} apartadas. Ninguna se perdió.` })
  }

  const valor = (campo: string, v: Valor) => (v === null ? "(vacío)" : DINERO.has(campo) && typeof v === "number" ? (verInfo ? fmtCOP(v) : "oculto") : String(v))
  const detalle = (f: FilaRevisada) => [
    ...f.cambios.map((c) => `${c.campo}: ${valor(c.campo, c.antes)} → ${valor(c.campo, c.despues)}${c.fijo ? " (no debería cambiar)" : ""}`),
    ...f.problemas,
    ...f.avisos,
  ]

  const todas = revision?.archivos.flatMap((a) => (a.bloqueado ? [] : a.filas.map((f) => ({ a, f })))) ?? []
  const sumas = revision
    ? revision.archivos.reduce(
        (s, a) => {
          const p = previsualizar(a, decisiones)
          return { nueva: s.nueva + p.nueva, actualizada: s.actualizada + p.actualizada, igual: s.igual + p.igual, apartada: s.apartada + p.apartada }
        },
        { nueva: 0, actualizada: 0, igual: 0, apartada: 0 },
      )
    : null
  const hayAlgo = revision?.archivos.some((a) => !a.bloqueado) ?? false
  const ver = (id: string) => abiertos[id] ?? false
  const deLaDemo = Object.values(base.tablas.clientes).filter((f) => f.carga === CARGA_DEMO).length

  return (
    <div className="flex flex-col gap-6">
      <Bloque
        titulo="Los tres archivos que se suben"
        tipos={["humano"]}
        pie={
          <>
            Salen de SAP como CSV (en Excel: Guardar como → CSV UTF-8). Se pueden subir juntos y en cualquier orden: la app los revisa en este orden porque cada
            uno se apoya en el anterior. El de aprobaciones ya no se sube: la aprobación se da aquí y sale hacia SAP desde{" "}
            <Link href="/aprobar" className="underline underline-offset-4">
              2 · Aprobar
            </Link>
            . Qué reporte de SAP saca cada uno: <span className="dato">[por definir]</span>
            {deLaDemo > 0 && (
              <>
                <br />
                «Ya en la base» cuenta lo que hay antes de subir. La demostración arranca con {deLaDemo} clientes con sus mismos códigos de SAP: por eso, al subir el archivo de clientes, esos {deLaDemo} salen como «ya estaban».
              </>
            )}
          </>
        }
      >
        <div className="overflow-x-auto border border-linea">
          <Table className="text-sm">
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead className="etiqueta">Orden</TableHead>
                <TableHead className="etiqueta">Archivo</TableHead>
                <TableHead className="etiqueta">Qué trae</TableHead>
                <TableHead className="etiqueta">Llave</TableHead>
                <TableHead className="etiqueta text-right">Ya en la base</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {TABLAS.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-mono text-muted-foreground">{t.orden}</TableCell>
                  <TableCell>
                    <span className="font-mono">{t.archivo}</span>
                    <details className="mt-1 text-xs text-muted-foreground">
                      <summary className="cursor-pointer">Ver las {t.campos.length} columnas</summary>
                      <ul className="mt-1 flex flex-col gap-0.5">
                        {t.campos.map((c) => (
                          <li key={c.nombre}>
                            <span className="font-mono text-foreground">{c.nombre}</span>
                            {c.obligatorio ? " · obligatoria" : ""} · {c.descripcion} · ej. <span className="font-mono">{c.ejemplo}</span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  </TableCell>
                  <TableCell className="min-w-60 max-w-96 whitespace-normal">{t.descripcion}</TableCell>
                  <TableCell className="font-mono">{t.clave}</TableCell>
                  <TableCell className="text-right font-mono">{Object.keys(base.tablas[t.id]).length}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Bloque>

      <Bloque
        titulo="Subir los archivos"
        tipos={["humano"]}
        pie="Nada se guarda todavía: primero se revisa. Si algo no se puede leer, el archivo se descarta completo; las filas con error se apartan y el resto sigue."
      >
        <input
          ref={entrada}
          type="file"
          multiple
          accept=".csv,.txt,.tsv,.xlsx,.xls"
          className="hidden"
          onChange={async (e) => {
            if (e.target.files) await leer(e.target.files)
            e.target.value = ""
          }}
        />
        <div
          className="flex flex-col items-start gap-3 border-2 border-dashed border-grafito bg-papel p-6"
          onDragOver={(e) => e.preventDefault()}
          onDrop={async (e) => {
            e.preventDefault()
            await leer(e.dataTransfer.files)
          }}
        >
          <Button size="lg" className="px-4" onClick={() => entrada.current?.click()}>
            <FileUpIcon data-icon="inline-start" />
            Elegir los archivos CSV
          </Button>
          <p className="text-sm text-muted-foreground">O arrastra aquí uno o varios archivos. Se revisan apenas llegan.</p>
        </div>

        <div className="mt-4 grid gap-2">
          <p className="text-sm text-muted-foreground">
            ¿No tienes los archivos a la mano? Ensaya con unos de ejemplo. Primero el primer día, guárdalo, y después el día siguiente:
          </p>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(TITULO_EJEMPLO) as JuegoEjemplo[]).map((j) => (
              <Button key={j} variant="outline" title={TITULO_EJEMPLO[j].detalle} onClick={() => revisar(archivosEjemplo(j))}>
                {TITULO_EJEMPLO[j].titulo}
              </Button>
            ))}
          </div>
          <ul className="flex list-disc flex-col gap-0.5 pl-5 text-xs text-muted-foreground">
            {(Object.keys(TITULO_EJEMPLO) as JuegoEjemplo[]).map((j) => (
              <li key={j}>
                <strong className="font-medium text-foreground">{TITULO_EJEMPLO[j].titulo}:</strong> {TITULO_EJEMPLO[j].detalle}
              </li>
            ))}
          </ul>
        </div>
      </Bloque>

      {revision && (
        <Bloque
          titulo="Revisar antes de guardar"
          tipos={["regla"]}
          reglas={[ASIGNAR_APROBADOR.id]}
          pie="Cada fila queda en una sola clase, por eso las cuentas siempre cuadran con las filas del archivo. Lo que no se guarda queda apartado con su motivo, para corregirlo en SAP y volver a subir: las que ya estaban no se duplican."
        >
          <div className="flex flex-col gap-6">
            {revision.entreArchivos.length > 0 && <Hallazgos lista={revision.entreArchivos} />}

            {revision.archivos.map((a) => {
              const p = previsualizar(a, decisiones)
              const errores = a.filas.filter((f) => f.clase === "error")
              return (
                <section key={a.nombre} className={cn("border p-4", a.bloqueado ? "border-vencido" : "border-linea")}>
                  <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <h3 className="font-mono text-[15px]">{a.nombre}</h3>
                    {a.tabla ? (
                      <Estado clase="en-plazo" palabra={tablaPorId(a.tabla).titulo} className="text-xs" />
                    ) : a.yaNoSeSube ? (
                      <Estado clase="aviso" palabra="Aprobaciones · ya no se sube" className="text-xs" />
                    ) : (
                      <Estado clase="vencido" palabra="No se reconoce" className="text-xs" />
                    )}
                    {!a.bloqueado && <span className="text-sm text-muted-foreground">{a.total} filas</span>}
                    {a.bloqueado && <span className="text-sm text-vencido">No se carga nada de este archivo</span>}
                  </div>
                  <Hallazgos lista={a.hallazgos} />
                  {!a.bloqueado && (
                    <>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(Object.keys(ETIQUETA) as Clase[])
                          .filter((c) => a.conteo[c] > 0)
                          .map((c) => (
                            <Estado key={c} clase={ETIQUETA[c].clase} palabra={`${a.conteo[c]} · ${ETIQUETA[c].palabra}`} className="text-xs" />
                          ))}
                      </div>
                      <p className="mt-3 text-sm">
                        <strong className="font-medium">Con estas decisiones queda así:</strong> {cuenta(p.nueva, "nueva", "nuevas")} · {cuenta(p.actualizada, "actualizada", "actualizadas")} ·{" "}
                        {cuenta(p.igual, "ya estaba", "ya estaban")} · {cuenta(p.apartada, "apartada", "apartadas")} = <strong className="font-medium">{cuenta(a.total, "fila", "filas")}</strong>.
                      </p>
                      {errores.length > 0 && (
                        <div className="mt-3">
                          <button className="text-sm underline underline-offset-4" onClick={() => setAbiertos((s) => ({ ...s, [`e-${a.nombre}`]: !s[`e-${a.nombre}`] }))}>
                            {ver(`e-${a.nombre}`) ? "Ocultar" : "Ver"} {errores.length === 1 ? "la fila con error" : `las ${errores.length} filas con error`}
                          </button>
                          {ver(`e-${a.nombre}`) && (
                            <div className="mt-2 overflow-x-auto border border-linea">
                              <Table className="text-xs">
                                <TableHeader className="bg-muted">
                                  <TableRow>
                                    <TableHead className="etiqueta">Línea</TableHead>
                                    <TableHead className="etiqueta">Llave</TableHead>
                                    <TableHead className="etiqueta">Qué pasa</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {errores.slice(0, 100).map((f) => (
                                    <TableRow key={f.linea} className="shadow-[inset_4px_0_0_var(--vencido)]">
                                      <TableCell className="font-mono">{f.linea}</TableCell>
                                      <TableCell className="font-mono">{f.clave || "—"}</TableCell>
                                      <TableCell className="whitespace-normal text-vencido">{f.problemas.join(" ")}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                              {errores.length > 100 && <p className="p-2 text-xs text-muted-foreground">Se muestran las primeras 100.</p>}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </section>
              )
            })}

            {hayAlgo && ORDEN_GRUPOS.some((g) => todas.some(({ f }) => f.clase === g)) && (
              <div className="flex flex-col gap-4">
                <h3 className="subtitulo">Decisiones, con la recomendación del software</h3>
                {ORDEN_GRUPOS.map((g) => {
                  const filas = todas.filter(({ f }) => f.clase === g)
                  if (!filas.length) return null
                  const info = GRUPOS[g]
                  const abierto = ver(`g-${g}`)
                  return (
                    <section key={g} className="border border-linea bg-papel p-4">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <Estado clase={ETIQUETA[g].clase} palabra={`${filas.length}`} className="text-xs" />
                        <h4 className="font-medium">{info.titulo}</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">{info.que}</p>
                      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={info.titulo}>
                        {info.opciones.map((o) => (
                          <Button
                            key={o.valor}
                            size="sm"
                            variant={decisiones[g] === o.valor ? "default" : "outline"}
                            aria-pressed={decisiones[g] === o.valor}
                            onClick={() => setDecisiones((d) => ({ ...d, [g]: o.valor }))}
                          >
                            {o.etiqueta}
                            {RECOMENDADO[g] === o.valor ? " · recomendado" : ""}
                          </Button>
                        ))}
                      </div>
                      <p className="mt-2 text-sm">{info.opciones.find((o) => o.valor === decisiones[g])?.efecto}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Por qué se recomienda: {info.porque}</p>
                      <div className="mt-3 overflow-x-auto border border-linea">
                        <Table className="text-xs">
                          <TableHeader className="bg-muted">
                            <TableRow>
                              <TableHead className="etiqueta">Archivo</TableHead>
                              <TableHead className="etiqueta">Llave</TableHead>
                              <TableHead className="etiqueta">Qué pasó</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filas.slice(0, abierto ? 100 : 4).map(({ a, f }) => (
                              <TableRow key={`${a.nombre}-${f.linea}`}>
                                <TableCell className="max-w-40 truncate font-mono text-muted-foreground">{a.tabla}</TableCell>
                                <TableCell className="font-mono">{f.clave}</TableCell>
                                <TableCell className="whitespace-normal">
                                  {detalle(f).map((t) => (
                                    <p key={t}>{t}</p>
                                  ))}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      {filas.length > 4 && (
                        <button className="mt-2 text-sm underline underline-offset-4" onClick={() => setAbiertos((s) => ({ ...s, [`g-${g}`]: !s[`g-${g}`] }))}>
                          {abierto ? "Ver menos" : `Ver las ${Math.min(filas.length, 100)} filas`}
                        </button>
                      )}
                    </section>
                  )
                })}
                <Button variant="ghost" className="w-fit" onClick={() => setDecisiones(RECOMENDADO)}>
                  Volver a las recomendaciones
                </Button>
              </div>
            )}

            {sumas && (
              <div className="flex flex-wrap items-center gap-3 border-t border-linea pt-4">
                {puede ? (
                  <Button size="lg" className="px-4" disabled={!hayAlgo || sumas.nueva + sumas.actualizada === 0} onClick={guardar}>
                    Guardar en la base · {cuenta(sumas.nueva, "nueva", "nuevas")} · {cuenta(sumas.actualizada, "actualizada", "actualizadas")}
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Tu rol puede revisar los archivos, pero solo Marcela o Sandra los guardan <ReglaBoton id={IMPORTAR_SOLICITUDES.id} soloId />.
                  </p>
                )}
                <span className="text-sm text-muted-foreground">
                  {cuenta(sumas.igual, "ya estaba", "ya estaban")} y {sumas.apartada === 1 ? "1 queda apartada" : `${sumas.apartada} quedan apartadas`}. {hayAlgo && sumas.nueva + sumas.actualizada === 0 ? "No hay nada nuevo para guardar." : ""}
                </span>
                <Button variant="ghost" onClick={() => setRevision(null)}>
                  Descartar
                </Button>
              </div>
            )}
          </div>
        </Bloque>
      )}

      {resultado && (
        <Bloque titulo={`Guardado · ${resultado.carga.id}`} tipos={["regla"]} reglas={[ASIGNAR_APROBADOR.id, AVISO_WHATSAPP.id]}>
          <ul className="flex flex-col gap-2 text-[15px]">
            {resultado.carga.archivos.map((a) => (
              <li key={a.nombre} className="flex gap-2">
                <CheckCircle2Icon className="mt-1 size-4 shrink-0 text-aprobado" aria-hidden />
                <span>
                  <span className="font-mono">{a.nombre}</span>:{" "}
                  {a.tabla ? (
                    <>
                      {cuenta(a.filas, "fila", "filas")} = {cuenta(a.nuevas, "nueva", "nuevas")} + {cuenta(a.actualizadas, "actualizada", "actualizadas")} + {cuenta(a.iguales, "ya estaba", "ya estaban")} + {cuenta(a.apartadas, "apartada", "apartadas")}.{" "}
                      <strong className="font-medium">{a.filas === a.nuevas + a.actualizadas + a.iguales + a.apartadas ? "Cuadra." : "No cuadra."}</strong>
                    </>
                  ) : (
                    "No se pudo leer: no se cargó."
                  )}
                </span>
              </li>
            ))}
          </ul>
          {resultado.registros.length > 0 && (
            <p className="mt-4 text-[15px]">
              Entraron a aprobación:{" "}
              {resultado.registros.map((r, i) => (
                <span key={r.id_pedido}>
                  {i > 0 && " · "}
                  <Link href={`/pedidos/${r.id_pedido}`} className="font-mono underline underline-offset-4">
                    {r.id_pedido}
                  </Link>
                </span>
              ))}
              . Ya tienen aprobador y reloj, y a quien las aprueba le llegó el aviso por{" "}
              <Link href="/avisos" className="underline underline-offset-4">
                WhatsApp
              </Link>
              .
            </p>
          )}
          {resultado.decididos.length > 0 && (
            <p className="mt-2 text-[15px]">
              SAP ya traía la aprobación de {resultado.decididos.map((d) => d.id_pedido).join(", ")}: quedó registrada en el historial como «por SAP».
            </p>
          )}
          {resultado.corte && (
            <p className="mt-2 text-[15px]">
              La cartera de las fichas ahora es la de <span className="font-mono">{resultado.corte.archivo}</span>: {resultado.corte.partidas.length} facturas con saldo, al corte del{" "}
              {fmtFechaHora(resultado.corte.corte).split(" · ")[0]}.
            </p>
          )}
          {resultado.carga.notas.map((n) => (
            <p key={n} className="mt-2 text-sm text-vencido">
              {n}
            </p>
          ))}
          {resultado.carga.apartadas.length > 0 && (
            <div className="mt-4 border-t border-linea pt-3">
              <p className="mb-2 text-sm">
                {resultado.carga.apartadas.length === 1 ? "1 fila quedó apartada" : `${resultado.carga.apartadas.length} filas quedaron apartadas`}. Descarga el detalle con el motivo, corrige en SAP y vuelve a subir el archivo: lo que ya está no se duplica.
              </p>
              <DescargaApartadas carga={resultado.carga} />
            </div>
          )}
        </Bloque>
      )}
    </div>
  )
}
