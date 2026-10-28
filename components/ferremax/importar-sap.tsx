"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { DownloadIcon, FileUpIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { fmtFechaHora, leerFechaHora } from "@/lib/fechas"
import { fmtCOP, fmtHoras } from "@/lib/formato"
import { COLUMNAS_SAP, NOMBRE_EJEMPLO, archivoEjemplo, descargar, revisarArchivo, type FilaRevisada, type Revision } from "@/lib/importar"
import { ASIGNAR_APROBADOR, IMPORTAR_SOLICITUDES, RELOJ_APROBACION, VER_INFO_CREDITO } from "@/lib/rules"
import { usePrototipo } from "@/lib/store"
import { cn } from "@/lib/utils"
import { asignacion, horasDeEspera, unirPedidos } from "@/lib/vistas"
import { Estado } from "./estado"
import { ReglaBoton } from "./insignia"
import { Bloque, PorDefinir } from "./piezas"

const ESTADO_FILA: Record<FilaRevisada["estado"], { clase: "aprobado" | "incompleta" | "vencido"; palabra: string }> = {
  nueva: { clase: "aprobado", palabra: "Nueva" },
  repetida: { clase: "incompleta", palabra: "Ya está" },
  error: { clase: "vencido", palabra: "Con error" },
}

export function ImportarSAP() {
  const { pedidos, clientes, cartera, rol, agregarPedidos } = usePrototipo()
  const [pegado, setPegado] = useState("")
  const [revision, setRevision] = useState<Revision | null>(null)
  const [importados, setImportados] = useState<string[]>([])
  const archivo = useRef<HTMLInputElement>(null)
  const puede = IMPORTAR_SOLICITUDES.fn(rol)
  const verInfo = VER_INFO_CREDITO.fn(rol)

  const revisar = (texto: string, nombre: string) => {
    setRevision(revisarArchivo(texto, nombre, clientes, pedidos))
    setImportados([])
  }

  const nuevas = revision?.filas.filter((f) => f.estado === "nueva") ?? []

  function importar() {
    const registros = nuevas.map((f) => f.registro!)
    agregarPedidos(registros)
    setImportados(registros.map((r) => r.id_pedido))
    setRevision(null)
    setPegado("")
    toast.success(`${registros.length} solicitudes importadas`, { description: "La regla del momento 1 ya les asignó aprobador." })
  }

  return (
    <div className="flex flex-col gap-6">
      <Bloque titulo="1 · Descargar de SAP" tipos={["humano"]} pie={<>Qué reporte o transacción de SAP saca estas columnas: <PorDefinir /></>}>
        <p className="mb-4 max-w-3xl text-[15px]">
          Cada día alguien descarga de SAP las solicitudes de crédito del día, en una hoja con estas columnas. Excel la guarda
          como CSV y se carga aquí. Si un pedido ya se importó, no se duplica.
        </p>
        <div className="overflow-x-auto border border-linea">
          <Table className="text-sm">
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead className="etiqueta">Columna</TableHead>
                <TableHead className="etiqueta">Qué es</TableHead>
                <TableHead className="etiqueta">Ejemplo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {COLUMNAS_SAP.map((c) => (
                <TableRow key={c.clave}>
                  <TableCell className="font-mono">{c.clave}</TableCell>
                  <TableCell>{c.descripcion}</TableCell>
                  <TableCell className="font-mono text-muted-foreground">{c.ejemplo}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <Button variant="outline" className="mt-4" onClick={() => descargar(NOMBRE_EJEMPLO, archivoEjemplo())}>
          <DownloadIcon data-icon="inline-start" />
          Descargar el ejemplo de hoy ({NOMBRE_EJEMPLO})
        </Button>
      </Bloque>

      <Bloque titulo="2 · Cargar el archivo" tipos={["humano"]} reglas={[IMPORTAR_SOLICITUDES.id]}>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={archivo}
            type="file"
            accept=".csv,.txt,.tsv"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0]
              if (f) revisar(await f.text(), f.name)
              e.target.value = ""
            }}
          />
          <Button onClick={() => archivo.current?.click()}>
            <FileUpIcon data-icon="inline-start" />
            Cargar archivo .csv
          </Button>
          <Button variant="outline" onClick={() => revisar(archivoEjemplo(), NOMBRE_EJEMPLO)}>
            Usar el ejemplo de hoy
          </Button>
        </div>
        <div className="mt-4 grid gap-2">
          <p className="text-sm text-muted-foreground">O pega aquí las filas copiadas de Excel, con la fila de encabezados:</p>
          <Textarea value={pegado} onChange={(e) => setPegado(e.target.value)} className="min-h-24 bg-papel font-mono text-xs" />
          <Button variant="outline" className="w-fit" disabled={!pegado.trim()} onClick={() => revisar(pegado, "filas pegadas")}>
            Revisar lo pegado
          </Button>
        </div>
      </Bloque>

      {revision && (
        <Bloque
          titulo={`3 · Revisar · ${revision.archivo}`}
          tipos={["regla"]}
          reglas={[ASIGNAR_APROBADOR.id, RELOJ_APROBACION.id]}
          pie="El reloj de 24 h cuenta desde que la solicitud se registró en SAP, no desde que se importa: el tiempo antes de importar ya es espera."
        >
          {revision.faltanColumnas.length ? (
            <p className="text-[15px] text-vencido">Al archivo le faltan columnas: {revision.faltanColumnas.join(", ")}. Revisa el formato del paso 1.</p>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap gap-2">
                {(["nueva", "repetida", "error"] as const).map((e) => (
                  <Estado key={e} clase={ESTADO_FILA[e].clase} palabra={`${revision.filas.filter((f) => f.estado === e).length} · ${ESTADO_FILA[e].palabra}`} />
                ))}
              </div>
              <div className="overflow-x-auto border border-linea">
                <Table className="text-sm">
                  <TableHeader className="bg-muted">
                    <TableRow>
                      <TableHead className="etiqueta">Fila</TableHead>
                      <TableHead className="etiqueta">Pedido</TableHead>
                      <TableHead className="etiqueta">Cliente</TableHead>
                      {verInfo && <TableHead className="etiqueta text-right">Valor (COP)</TableHead>}
                      <TableHead className="etiqueta">Solicitud en SAP</TableHead>
                      <TableHead className="etiqueta">Estado</TableHead>
                      <TableHead className="etiqueta">Lo aprueba</TableHead>
                      <TableHead className="etiqueta">Detalle</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {revision.filas.map((f) => {
                      const p = f.registro ? unirPedidos([f.registro], clientes, cartera)[0] : null
                      const valorCrudo = Number(f.valores.valor_cop.replace(/[.\s$]/g, ""))
                      const fechaCruda = leerFechaHora(f.valores.fecha_solicitud)
                      return (
                        <TableRow key={f.numero} className={cn(f.estado === "error" && "shadow-[inset_4px_0_0_var(--vencido)]")}>
                          <TableCell className="font-mono text-muted-foreground">{f.numero}</TableCell>
                          <TableCell className="font-mono">{f.valores.id_pedido || "—"}</TableCell>
                          <TableCell className="max-w-56 truncate">{p?.cliente ?? f.valores.razon_social}</TableCell>
                          {verInfo && (
                            <TableCell className="text-right font-mono">
                              {p ? fmtCOP(p.valor_cop) : f.valores.valor_cop && Number.isFinite(valorCrudo) ? fmtCOP(valorCrudo) : f.valores.valor_cop || "—"}
                            </TableCell>
                          )}
                          <TableCell className="whitespace-nowrap">
                            {f.fechaSolicitud ? (
                              <>
                                {fmtFechaHora(f.fechaSolicitud)}
                                {p && <span className="block text-xs text-muted-foreground">ya lleva {fmtHoras(horasDeEspera(p))}</span>}
                              </>
                            ) : fechaCruda ? (
                              fmtFechaHora(fechaCruda)
                            ) : (
                              f.valores.fecha_solicitud || "—"
                            )}
                          </TableCell>
                          <TableCell>
                            <Estado clase={ESTADO_FILA[f.estado].clase} palabra={ESTADO_FILA[f.estado].palabra} className="text-xs" />
                          </TableCell>
                          <TableCell className="font-medium">{p ? asignacion(p).texto : "—"}</TableCell>
                          <TableCell className="max-w-96 text-xs whitespace-normal">
                            {[...f.problemas, ...f.avisos].map((t) => (
                              <p key={t} className={cn(f.problemas.includes(t) ? "text-vencido" : "text-muted-foreground")}>
                                {t}
                              </p>
                            ))}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                {puede ? (
                  <Button size="lg" className="px-4" disabled={!nuevas.length} onClick={importar}>
                    Importar {nuevas.length} {nuevas.length === 1 ? "solicitud nueva" : "solicitudes nuevas"}
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Tu rol puede revisar el archivo, pero solo Marcela o Sandra lo importan <ReglaBoton id={IMPORTAR_SOLICITUDES.id} soloId />.
                  </p>
                )}
                <span className="text-sm text-muted-foreground">Las filas repetidas o con error no entran. Si se corrigen, se vuelve a cargar el archivo.</span>
              </div>
            </>
          )}
        </Bloque>
      )}

      {importados.length > 0 && (
        <Bloque titulo="Importadas" tipos={["regla"]} reglas={[ASIGNAR_APROBADOR.id]}>
          <p className="text-[15px]">
            Entraron al flujo:{" "}
            {importados.map((id, i) => (
              <span key={id}>
                {i > 0 && " · "}
                <Link href={`/pedidos/${id}`} className="font-mono underline underline-offset-4">
                  {id}
                </Link>
              </span>
            ))}
            . Ya aparecen en el tablero, con su aprobador y su reloj.
          </p>
        </Bloque>
      )}
    </div>
  )
}
