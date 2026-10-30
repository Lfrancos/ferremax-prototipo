"use client"

import Link from "next/link"
import { toast } from "sonner"
import { DownloadIcon } from "lucide-react"
import { Estado } from "@/components/ferremax/estado"
import { BotonFirmar } from "@/components/ferremax/firmar"
import { ReglaBoton } from "@/components/ferremax/insignia"
import { PasosPedido } from "@/components/ferremax/pasos"
import { Bloque, PorDefinir, Titulo } from "@/components/ferremax/piezas"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { csvParaSAP, decisionesParaSAP } from "@/lib/exportar-sap"
import { fmtFechaHora } from "@/lib/fechas"
import { fmtCOP } from "@/lib/formato"
import { descargar } from "@/lib/importar"
import { ASIGNAR_APROBADOR, IMPORTAR_SOLICITUDES, VER_INFO_CREDITO } from "@/lib/rules"
import { usePrototipo } from "@/lib/store"
import { asignacion, relojAprobacion, tramoDe } from "@/lib/vistas"

// Paso 2 · Aprobar. Arriba, lo que espera decisión (cada pedido con su único aprobador y su reloj).
// Abajo, lo ya decidido que falta pasar a SAP: sale en un archivo con el formato de aprobaciones de SAP (lib/exportar-sap.ts).

const nombreArchivo = (lote: string) => `aprobaciones_para_SAP_${lote}.csv`

export default function Aprobar() {
  const { pedidos, exportaciones, porExportar, exportarASAP, rol } = usePrototipo()
  const puedeExportar = IMPORTAR_SOLICITUDES.fn(rol)
  const verInfo = VER_INFO_CREDITO.fn(rol)
  const porAprobar = pedidos.filter((p) => tramoDe(p) === "aprobar").sort((a, b) => relojAprobacion(b).fraccion - relojAprobacion(a).fraccion)
  const cliente = new Map(pedidos.map((p) => [p.id_pedido, p.cliente]))
  const todas = decisionesParaSAP(pedidos)
  const valor = (v: number) => (verInfo ? fmtCOP(v) : "oculto")

  function exportar() {
    const { lote, decisiones } = exportarASAP()
    descargar(nombreArchivo(lote.id), csvParaSAP(decisiones))
    toast.success(`${lote.id} listo para SAP`, { description: `${decisiones.length === 1 ? "1 decisión" : `${decisiones.length} decisiones`} en ${nombreArchivo(lote.id)}. Ya no vuelven a salir.` })
  }

  return (
    <>
      <Titulo
        indice="Paso 2 · Aprobar"
        titulo="Aprobar y pasar a SAP"
        bajada="Cada pedido tiene un solo aprobador, que sale de la regla. Lo que se aprueba o rechaza aquí (o por WhatsApp) se pasa a SAP con un archivo."
      />
      <PasosPedido paso={2} />

      <div className="flex flex-col gap-6">
        <Bloque titulo={`Por aprobar · ${porAprobar.length}`} tipos={["regla"]} reglas={[ASIGNAR_APROBADOR.id]} pie="Primero lo que lleva más tiempo esperando. A quien aprueba ya le llegó el aviso por WhatsApp.">
          {porAprobar.length ? (
            <div className="overflow-x-auto border border-linea">
              <Table className="text-sm">
                <TableHeader className="bg-muted">
                  <TableRow>
                    <TableHead className="etiqueta">Pedido</TableHead>
                    <TableHead className="etiqueta">Cliente</TableHead>
                    <TableHead className="etiqueta text-right">Valor</TableHead>
                    <TableHead className="etiqueta">Quién aprueba</TableHead>
                    <TableHead className="etiqueta">Espera</TableHead>
                    <TableHead className="etiqueta" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {porAprobar.map((p) => {
                    const r = relojAprobacion(p)
                    return (
                      <TableRow key={p.id_pedido}>
                        <TableCell>
                          <Link href={`/pedidos/${p.id_pedido}`} className="font-mono underline underline-offset-4">
                            {p.id_pedido}
                          </Link>
                        </TableCell>
                        <TableCell>{p.cliente}</TableCell>
                        <TableCell className="text-right font-mono">{valor(p.valor_cop)}</TableCell>
                        <TableCell>{asignacion(p).texto}</TableCell>
                        <TableCell>
                          <span className="flex items-center gap-2">
                            <Estado clase={r.clase} palabra={r.palabra} className="text-xs" />
                            <span className="font-mono text-grafito">
                              {r.actual} de {r.tope}
                            </span>
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <BotonFirmar pedido={p} />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-[15px]">
              No hay nada por aprobar. Los pedidos entran en{" "}
              <Link href="/solicitudes" className="underline underline-offset-4">
                1 · Cargar pedidos
              </Link>
              .
            </p>
          )}
        </Bloque>

        <Bloque
          titulo={`Por pasar a SAP · ${porExportar.length}`}
          tipos={["humano"]}
          accion={
            puedeExportar ? (
              <Button size="lg" className="px-4" disabled={!porExportar.length} onClick={exportar}>
                <DownloadIcon data-icon="inline-start" />
                {porExportar.length ? `Descargar el archivo para SAP (${porExportar.length})` : "Nada por pasar a SAP"}
              </Button>
            ) : (
              <p className="text-sm text-grafito">
                Solo Marcela o Sandra lo descargan <ReglaBoton id={IMPORTAR_SOLICITUDES.id} soloId />
              </p>
            )
          }
          pie={
            <>
              El archivo trae las mismas columnas del archivo de aprobaciones de SAP. Lo que ya se descargó no vuelve a salir. Cómo entra a SAP: <PorDefinir />
            </>
          }
        >
          {porExportar.length ? (
            <div className="overflow-x-auto border border-linea">
              <Table className="text-sm">
                <TableHeader className="bg-muted">
                  <TableRow>
                    <TableHead className="etiqueta">Pedido</TableHead>
                    <TableHead className="etiqueta">Cliente</TableHead>
                    <TableHead className="etiqueta">Resultado</TableHead>
                    <TableHead className="etiqueta">Quién</TableHead>
                    <TableHead className="etiqueta">Cuándo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {porExportar.map((d) => (
                    <TableRow key={d.id_pedido}>
                      <TableCell>
                        <Link href={`/pedidos/${d.id_pedido}`} className="font-mono underline underline-offset-4">
                          {d.id_pedido}
                        </Link>
                      </TableCell>
                      <TableCell>{cliente.get(d.id_pedido)}</TableCell>
                      <TableCell>
                        <Estado clase={d.resultado === "Aprobado" ? "aprobado" : "rechazado"} palabra={d.resultado} className="text-xs" />
                      </TableCell>
                      <TableCell>
                        {d.aprobador}
                        {d.via === "WhatsApp" ? " · por WhatsApp" : ""}
                      </TableCell>
                      <TableCell className="font-mono">{fmtFechaHora(d.decision)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-[15px]">Todo lo decidido ya está en SAP.</p>
          )}

          <details className="mt-4 text-sm">
            <summary className="cursor-pointer text-grafito">Archivos ya descargados ({exportaciones.length})</summary>
            <ul className="mt-2 flex flex-col gap-2">
              {[...exportaciones].reverse().map((x) => (
                <li key={x.id} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-mono">{x.id}</span>
                  <span>
                    {fmtFechaHora(x.fecha)} · {x.quien} · {x.pedidos.length === 1 ? "1 decisión" : `${x.pedidos.length} decisiones`}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!x.pedidos.length}
                    onClick={() => descargar(nombreArchivo(x.id), csvParaSAP(todas.filter((d) => x.pedidos.includes(d.id_pedido))))}
                  >
                    <DownloadIcon data-icon="inline-start" />
                    Otra vez
                  </Button>
                </li>
              ))}
            </ul>
          </details>
        </Bloque>
      </div>
    </>
  )
}
