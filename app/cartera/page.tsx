"use client"

import Link from "next/link"
import { Estado } from "@/components/ferremax/estado"
import { ImportarCartera } from "@/components/ferremax/importar-cartera"
import { ReglaBoton } from "@/components/ferremax/insignia"
import { Bloque, Kpi, PorDefinir, Titulo } from "@/components/ferremax/piezas"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { HOY } from "@/lib/data"
import { hrefFactura } from "@/lib/documentos"
import { diasCalendario, esAntes, fmtDia, fmtFechaHora, soloFecha } from "@/lib/fechas"
import { fmtCOP, fmtHoras, fmtMillones } from "@/lib/formato"
import {
  CHEQUEO_ATRASO,
  CRUCE_DEL_LIMITE,
  DIAS_DE_ATRASO,
  IMPORTAR_CARTERA,
  PAGO_SIN_APLICAR,
  SALDO_PENDIENTE,
  VER_INFO_CREDITO,
} from "@/lib/rules"
import { usePrototipo } from "@/lib/store"
import { cn } from "@/lib/utils"
import { asignacion, crucesDelLimite, edadDelCorte, estadoCartera, tramoDe } from "@/lib/vistas"

export default function Cartera() {
  const { cartera, clientes, pedidos, rol } = usePrototipo()

  if (!VER_INFO_CREDITO.fn(rol))
    return (
      <>
        <Titulo indice="(009) Informe de cartera" titulo="Cartera" />
        <p className="text-[15px]">
          La cartera es información de crédito: tu rol no la ve <ReglaBoton id={VER_INFO_CREDITO.id} soloId />.
        </p>
      </>
    )

  const nombre = (id: string) => clientes.find((c) => c.id_cliente === id)?.razon_social ?? id
  const estados = clientes.map((c) => ({ c, e: estadoCartera(c.id_cliente, cartera) }))
  const hoy0 = `${soloFecha(HOY)}T00:00`
  const facturas = cartera.partidas.filter((p) => p.tipo === "Factura")
  const vencidas = facturas.filter((p) => p.vencimiento && esAntes(p.vencimiento, hoy0))
  const total = facturas.reduce((s, p) => s + (p.saldo_abierto_cop ?? 0), 0)
  const totalVencido = vencidas.reduce((s, p) => s + (p.saldo_abierto_cop ?? 0), 0)
  const max = CHEQUEO_ATRASO.valores!.max_dias
  const sobreLimite = estados.filter((x) => x.e.atraso !== null && x.e.atraso > max)
  const pagos = cartera.partidas.filter((p) => p.tipo === "Pago sin aplicar")
  const cruces = crucesDelLimite(clientes, cartera)
  const ordenadas = [...cartera.partidas].sort(
    (a, b) => (a.vencimiento ?? "9999").localeCompare(b.vencimiento ?? "9999") || a.documento.localeCompare(b.documento),
  )

  return (
    <>
      <Titulo
        indice="(009) Informe de cartera"
        titulo="Cartera"
        bajada="El saldo y el atraso ya no los escribe nadie: se calculan sobre las partidas abiertas del último corte de SAP."
      />

      <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
        <Bloque titulo="Corte vigente" tipos={["regla"]} reglas={[IMPORTAR_CARTERA.id]}>
          <dl className="divide-y divide-linea border-y border-linea text-[15px]">
            <div className="flex justify-between gap-4 py-2">
              <dt className="text-muted-foreground">Archivo</dt>
              <dd className="font-mono text-sm">{cartera.archivo}</dd>
            </div>
            <div className="flex justify-between gap-4 py-2">
              <dt className="text-muted-foreground">Corte</dt>
              <dd>{fmtFechaHora(cartera.corte)}</dd>
            </div>
            <div className="flex justify-between gap-4 py-2">
              <dt className="text-muted-foreground">Importó</dt>
              <dd>{cartera.importo}</dd>
            </div>
            <div className="flex justify-between gap-4 py-2">
              <dt className="text-muted-foreground">Edad del dato</dt>
              <dd>{fmtHoras(edadDelCorte(cartera))}</dd>
            </div>
          </dl>
          <p className="mt-3 text-sm text-muted-foreground">
            Cuántas horas puede tener el corte antes de que las solicitudes queden incompletas: <PorDefinir />
          </p>
        </Bloque>

        <Bloque titulo="Resumen" tipos={["regla"]} reglas={[SALDO_PENDIENTE.id, DIAS_DE_ATRASO.id]}>
          <Kpi rotulo="Cartera abierta" valor={fmtMillones(total)} pie={`${facturas.length} facturas abiertas`} />
          <Kpi rotulo="Vencida" valor={fmtMillones(totalVencido)} pie={`${vencidas.length} facturas vencidas`} />
          <Kpi
            rotulo={`Clientes con más de ${max} días de atraso`}
            valor={String(sobreLimite.length)}
            cumple={sobreLimite.length === 0}
            pie={sobreLimite.map((x) => x.c.razon_social).join(" · ") || "—"}
          />
          <Kpi rotulo="Pagos sin aplicar" valor={String(pagos.length)} pie={pagos.map((p) => `${nombre(p.id_cliente)} · COP ${fmtCOP(p.valor_cop)}`).join(" · ") || "—"} />
        </Bloque>
      </div>

      <Bloque
        titulo={`Cuándo cruza cada cliente los ${max} días de atraso`}
        tipos={["regla"]}
        reglas={[CRUCE_DEL_LIMITE.id, CHEQUEO_ATRASO.id]}
        pie={
          <>
            Desde ese día, sus pedidos van a Andrés. Si paga la factura más antigua antes, la fecha se corre. Con cuántos días de
            anticipación avisar: <PorDefinir />
          </>
        }
      >
        <div className="overflow-x-auto border border-linea">
          <Table className="text-[15px]">
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead className="etiqueta">Cliente</TableHead>
                <TableHead className="etiqueta">Factura más antigua</TableHead>
                <TableHead className="etiqueta text-right">Atraso hoy</TableHead>
                <TableHead className="etiqueta">Cruza el límite</TableHead>
                <TableHead className="etiqueta">Pedidos por aprobar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cruces.map(({ cliente, estado, faltan }) => {
                const porAprobar = pedidos.filter((p) => p.id_cliente === cliente.id_cliente && tramoDe(p) === "aprobar")
                return (
                  <TableRow key={cliente.id_cliente} className={cn(faltan <= 0 && "shadow-[inset_4px_0_0_var(--vencido)]")}>
                    <TableCell className="py-3 font-medium">{cliente.razon_social}</TableCell>
                    <TableCell className="font-mono text-sm">{estado.cruce!.factura}</TableCell>
                    <TableCell className="text-right font-mono">{estado.atraso === null ? "[en blanco]" : `${estado.atraso} d`}</TableCell>
                    <TableCell>
                      {faltan <= 0 ? (
                        <Estado clase="vencido" palabra={`Ya cruzó · ${fmtDia(estado.cruce!.fecha)}`} />
                      ) : (
                        <span className="flex flex-wrap items-center gap-2">
                          {fmtDia(estado.cruce!.fecha)}
                          <span className="text-sm text-muted-foreground">en {faltan} {faltan === 1 ? "día" : "días"}</span>
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {porAprobar.length
                        ? porAprobar.map((p) => (
                            <span key={p.id_pedido} className="mr-2 inline-block">
                              <Link href={`/pedidos/${p.id_pedido}`} className="font-mono underline-offset-4 hover:underline">
                                {p.id_pedido}
                              </Link>{" "}
                              · {asignacion(p).texto}
                            </span>
                          ))
                        : "—"}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </Bloque>

      {pagos.length > 0 && (
        <Bloque titulo="Pagos sin aplicar" tipos={["regla"]} reglas={[PAGO_SIN_APLICAR.id]} pie={PAGO_SIN_APLICAR.texto}>
          <ul className="divide-y divide-linea border-y border-linea text-[15px]">
            {pagos.map((p) => (
              <li key={p.documento} className="flex flex-wrap justify-between gap-3 py-2">
                <span>
                  <span className="font-medium">{nombre(p.id_cliente)}</span> · <span className="font-mono text-sm">{p.documento}</span>
                </span>
                <span>
                  {fmtDia(p.fecha_documento)} · COP {fmtCOP(p.valor_cop)}
                </span>
              </li>
            ))}
          </ul>
        </Bloque>
      )}

      <ImportarCartera />

      <Bloque titulo={`Partidas abiertas (${cartera.partidas.length})`} tipos={["regla"]} reglas={[DIAS_DE_ATRASO.id]} pie={`Fuente: ${cartera.archivo}.`}>
        <div className="overflow-x-auto border border-linea">
          <Table className="text-sm">
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead className="etiqueta">Cliente</TableHead>
                <TableHead className="etiqueta">Documento</TableHead>
                <TableHead className="etiqueta">Tipo</TableHead>
                <TableHead className="etiqueta">Pedido</TableHead>
                <TableHead className="etiqueta">Fecha</TableHead>
                <TableHead className="etiqueta">Vence</TableHead>
                <TableHead className="etiqueta text-right">Días vencida</TableHead>
                <TableHead className="etiqueta text-right">Valor (COP)</TableHead>
                <TableHead className="etiqueta text-right">Saldo (COP)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ordenadas.map((p) => {
                const dias = p.vencimiento && esAntes(p.vencimiento, hoy0) ? diasCalendario(p.vencimiento, HOY) : null
                return (
                  <TableRow key={p.documento} className={cn(dias !== null && dias > max && "shadow-[inset_4px_0_0_var(--vencido)]")}>
                    <TableCell className="max-w-56 truncate">{nombre(p.id_cliente)}</TableCell>
                    <TableCell className="font-mono">
                      {p.tipo === "Factura" ? (
                        <Link href={hrefFactura(p.documento)} className="underline underline-offset-4 hover:no-underline">
                          {p.documento}
                        </Link>
                      ) : (
                        p.documento
                      )}
                    </TableCell>
                    <TableCell>{p.tipo}</TableCell>
                    <TableCell className="font-mono">{p.id_pedido ?? "—"}</TableCell>
                    <TableCell>{fmtDia(p.fecha_documento)}</TableCell>
                    <TableCell>{p.vencimiento ? fmtDia(p.vencimiento) : p.tipo === "Factura" ? "[en blanco]" : "—"}</TableCell>
                    <TableCell className="text-right font-mono">{dias ?? "—"}</TableCell>
                    <TableCell className="text-right font-mono">{fmtCOP(p.valor_cop)}</TableCell>
                    <TableCell className="text-right font-mono">{p.saldo_abierto_cop === null ? "[en blanco]" : fmtCOP(p.saldo_abierto_cop)}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </Bloque>
    </>
  )
}
