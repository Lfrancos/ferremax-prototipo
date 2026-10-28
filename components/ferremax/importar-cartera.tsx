"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { DownloadIcon, FileUpIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table"
import { fmtCOP } from "@/lib/formato"
import { descargar } from "@/lib/importar"
import { COLUMNAS_CARTERA, NOMBRE_EJEMPLO_CARTERA, carteraEjemplo, revisarCartera, type RevisionCartera } from "@/lib/importar-cartera"
import { ASIGNAR_APROBADOR, DIAS_DE_ATRASO, IMPORTAR_CARTERA, SALDO_PENDIENTE } from "@/lib/rules"
import { usePrototipo } from "@/lib/store"
import type { CorteCartera } from "@/lib/tipos"
import { cn } from "@/lib/utils"
import { asignacion, estadoCartera, tramoDe, unirPedidos } from "@/lib/vistas"
import { ReglaBoton } from "./insignia"
import { Bloque, PorDefinir } from "./piezas"

const fmtSaldo = (n: number | null) => (n === null ? "[en blanco]" : fmtCOP(n))
const fmtAtraso = (n: number | null) => (n === null ? "[en blanco]" : `${n} d`)

/** Qué cambia si se aplica el corte nuevo: por cliente y en los pedidos por aprobar. */
function Cambios({ nuevo }: { nuevo: CorteCartera }) {
  const { clientes, cartera, pedidos } = usePrototipo()
  const porCliente = clientes
    .map((c) => ({ c, antes: estadoCartera(c.id_cliente, cartera), despues: estadoCartera(c.id_cliente, nuevo) }))
    .filter((x) => x.antes.saldo !== x.despues.saldo || x.antes.atraso !== x.despues.atraso || x.antes.pagoSinAplicar !== x.despues.pagoSinAplicar)
  const recalculados = unirPedidos(pedidos, clientes, nuevo)
  const reasignados = pedidos
    .filter((p) => tramoDe(p) === "aprobar")
    .map((p) => ({ p, antes: asignacion(p).texto, despues: asignacion(recalculados.find((x) => x.id_pedido === p.id_pedido)!).texto }))
    .filter((x) => x.antes !== x.despues)

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div>
        <h3 className="etiqueta mb-2 text-muted-foreground">Clientes que cambian ({porCliente.length})</h3>
        {porCliente.length ? (
          <ul className="divide-y divide-linea border-y border-linea text-sm">
            {porCliente.map(({ c, antes, despues }) => (
              <li key={c.id_cliente} className="py-2">
                <span className="font-medium">{c.razon_social}</span>
                <p className="font-mono text-xs text-muted-foreground">
                  saldo {fmtSaldo(antes.saldo)} → {fmtSaldo(despues.saldo)} · atraso {fmtAtraso(antes.atraso)} → {fmtAtraso(despues.atraso)}
                  {antes.pagoSinAplicar !== despues.pagoSinAplicar &&
                    ` · pago sin aplicar ${fmtCOP(antes.pagoSinAplicar)} → ${fmtCOP(despues.pagoSinAplicar)}`}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Ningún cliente cambia.</p>
        )}
      </div>
      <div>
        <h3 className="etiqueta mb-2 flex items-center gap-2 text-muted-foreground">
          Pedidos por aprobar que cambian de aprobador ({reasignados.length}) <ReglaBoton id={ASIGNAR_APROBADOR.id} soloId />
        </h3>
        {reasignados.length ? (
          <ul className="divide-y divide-linea border-y border-linea text-sm">
            {reasignados.map(({ p, antes, despues }) => (
              <li key={p.id_pedido} className="py-2">
                <Link href={`/pedidos/${p.id_pedido}`} className="font-mono underline-offset-4 hover:underline">
                  {p.id_pedido}
                </Link>{" "}
                · {p.cliente}
                <p className="text-xs text-muted-foreground">
                  {antes} → <span className="font-medium text-foreground">{despues}</span>
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Ningún pedido por aprobar cambia de aprobador.</p>
        )}
      </div>
    </div>
  )
}

export function ImportarCartera() {
  const { clientes, rol, reemplazarCartera } = usePrototipo()
  const [revision, setRevision] = useState<RevisionCartera | null>(null)
  const archivo = useRef<HTMLInputElement>(null)
  const puede = IMPORTAR_CARTERA.fn(rol)

  const revisar = (texto: string, nombre: string) => setRevision(revisarCartera(texto, nombre, clientes, rol))

  function aplicar() {
    if (!revision?.corte) return
    reemplazarCartera(revision.corte)
    toast.success("Cartera actualizada", { description: `${revision.archivo}: saldos, atrasos y aprobadores recalculados.` })
    setRevision(null)
  }

  return (
    <div className="flex flex-col gap-6">
      <Bloque
        titulo="Actualizar cartera · opción A (satélite)"
        tipos={["humano"]}
        reglas={[IMPORTAR_CARTERA.id]}
        pie={<>Qué reporte de SAP saca estas columnas (suele llamarse &quot;partidas abiertas de deudores&quot;): <PorDefinir /></>}
      >
        <p className="mb-4 max-w-3xl text-[15px]">
          SAP sigue llevando facturas y pagos. Cada mañana se descarga el reporte de partidas abiertas de clientes y se importa
          aquí. Cada corte es una foto completa: reemplaza al anterior. Si una fila tiene un error de formato, no se importa
          nada, porque un corte a medias daría saldos más bajos de lo real.
        </p>
        <details className="mb-4">
          <summary className="cursor-pointer text-sm font-medium">Columnas del archivo ({COLUMNAS_CARTERA.length})</summary>
          <div className="mt-2 overflow-x-auto border border-linea">
            <Table className="text-sm">
              <TableBody>
                {COLUMNAS_CARTERA.map((c) => (
                  <TableRow key={c.clave}>
                    <TableCell className="font-mono">{c.clave}</TableCell>
                    <TableCell>{c.descripcion}</TableCell>
                    <TableCell className="font-mono text-muted-foreground">{c.ejemplo}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </details>
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
            Cargar corte .csv
          </Button>
          <Button variant="outline" onClick={() => revisar(carteraEjemplo(), NOMBRE_EJEMPLO_CARTERA)}>
            Usar el corte de ejemplo de las 8:30
          </Button>
          <Button variant="ghost" onClick={() => descargar(NOMBRE_EJEMPLO_CARTERA, carteraEjemplo())}>
            <DownloadIcon data-icon="inline-start" />
            Descargar ese ejemplo
          </Button>
        </div>
      </Bloque>

      {revision && (
        <Bloque
          titulo={`Revisar · ${revision.archivo}`}
          tipos={["regla"]}
          reglas={[SALDO_PENDIENTE.id, DIAS_DE_ATRASO.id]}
          pie="Nada cambia hasta aplicar el corte."
        >
          {revision.faltanColumnas.length ? (
            <p className="text-[15px] text-vencido">Al archivo le faltan columnas: {revision.faltanColumnas.join(", ")}.</p>
          ) : (
            <div className="flex flex-col gap-5">
              <p className="text-[15px]">
                {revision.filas.length} partidas · {revision.filas.filter((f) => f.problemas.length).length} con error ·{" "}
                {revision.filas.filter((f) => f.avisos.length).length} con aviso
              </p>
              {revision.filas.some((f) => f.problemas.length || f.avisos.length) && (
                <ul className="divide-y divide-linea border-y border-linea text-sm">
                  {revision.filas
                    .filter((f) => f.problemas.length || f.avisos.length)
                    .map((f) => (
                      <li key={f.numero} className={cn("py-2", f.problemas.length && "text-vencido")}>
                        Fila {f.numero} · {f.valores.documento || "(sin documento)"}: {[...f.problemas, ...f.avisos].join(" ")}
                      </li>
                    ))}
                </ul>
              )}
              {revision.corte ? <Cambios nuevo={revision.corte} /> : <p className="text-[15px] text-vencido">Corrige el archivo y vuelve a cargarlo.</p>}
              {puede ? (
                <Button size="lg" className="w-fit px-4" disabled={!revision.corte} onClick={aplicar}>
                  Aplicar este corte
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Tu rol puede revisar el corte, pero solo Sandra lo aplica <ReglaBoton id={IMPORTAR_CARTERA.id} soloId />.
                </p>
              )}
            </div>
          )}
        </Bloque>
      )}
    </div>
  )
}
