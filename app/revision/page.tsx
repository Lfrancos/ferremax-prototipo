"use client"

import Link from "next/link"
import { Bar, BarChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from "recharts"
import { Estado } from "@/components/ferremax/estado"
import { Bloque, Kpi, PorDefinir, Titulo } from "@/components/ferremax/piezas"
import { EstadoPedido } from "@/components/ferremax/estado-pedido"
import { ReporteDeLaSemana } from "@/components/ferremax/reporte-semana"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { fmtRango } from "@/lib/fechas"
import { tramos } from "@/lib/flujo"
import { fmtCOP, fmtHoras, fmtPct } from "@/lib/formato"
import {
  A_TIEMPO,
  CASO_4,
  INDICADOR_A,
  INDICADOR_B,
  INDICADOR_C,
  PARA_ESCALAR,
  RELOJ_APROBACION,
  RELOJ_BODEGA,
  VER_INFO_CREDITO,
} from "@/lib/rules"
import { usePrototipo } from "@/lib/store"
import type { Pedido } from "@/lib/tipos"
import { aprobacion, aprobo, asignacion, diasEnBodega, horasDeEspera, revisionSemanal } from "@/lib/vistas"

function Lista({ pedidos, vacio }: { pedidos: Pedido[]; vacio: string }) {
  const { rol } = usePrototipo()
  const verInfo = VER_INFO_CREDITO.fn(rol)
  if (!pedidos.length) return <p className="text-[15px] text-grafito">{vacio}</p>
  return (
    <div className="overflow-x-auto border border-linea">
      <Table className="text-[15px]">
        <TableHeader>
          <TableRow className="border-b-2 border-tinta hover:bg-transparent">
            <TableHead className="etiqueta text-grafito">Pedido</TableHead>
            <TableHead className="etiqueta text-grafito">Cliente</TableHead>
            {verInfo && <TableHead className="etiqueta text-right text-grafito">Valor (COP)</TableHead>}
            <TableHead className="etiqueta text-grafito">Le tocaba a</TableHead>
            <TableHead className="etiqueta text-right text-grafito">Horas de espera</TableHead>
            <TableHead className="etiqueta text-grafito">Aprobó</TableHead>
            <TableHead className="etiqueta text-grafito">Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pedidos.map((p) => (
            <TableRow key={p.id_pedido} className="border-linea">
              <TableCell className="py-3">
                <Link href={`/pedidos/${p.id_pedido}`} className="dato hover:underline">
                  {p.id_pedido}
                </Link>
              </TableCell>
              <TableCell>{p.cliente}</TableCell>
              {verInfo && <TableCell className="dato text-right">{fmtCOP(p.valor_cop)}</TableCell>}
              <TableCell>{asignacion(p).texto}</TableCell>
              <TableCell className="dato text-right">{fmtHoras(horasDeEspera(p))}</TableCell>
              <TableCell>{aprobo(p) ?? "—"}</TableCell>
              <TableCell>
                <EstadoPedido pedido={p} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

const configGrafico = { horas: { label: "Horas de espera", color: "var(--chart-1)" } } satisfies ChartConfig

export default function Revision() {
  const { pedidos } = usePrototipo()
  const r = revisionSemanal(pedidos)
  const tope = RELOJ_APROBACION.valores!.tope_h
  const [tramoAprobar, tramoBodega] = tramos()
  const pct = (v: number | null) => (v === null ? <PorDefinir>[sin dato]</PorDefinir> : fmtPct(v))

  const datosGrafico = r.semana
    .filter((p) => aprobacion(p))
    .map((p) => ({ id: p.id_pedido, horas: Math.round(horasDeEspera(p) * 10) / 10 }))
    .sort((a, b) => b.horas - a.horas)

  return (
    <>
      <Titulo
        indice="(006) Revisión del lunes"
        titulo={`Semana del ${fmtRango(r.desde, r.hasta)}`}
        bajada={`${r.semana.length} solicitudes de crédito · La revisan Marcela, Andrés y Nelson.`}
      />

      <div className="mb-6">
        <ReporteDeLaSemana />
      </div>

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <Bloque titulo="Indicadores" tipos={["regla"]} reglas={[INDICADOR_A.id, INDICADOR_B.id, INDICADOR_C.id, A_TIEMPO.id]} pie="Fuente: Revisión semanal de crédito y Ops Charter · Pedido a crédito (v2). Las cifras con marcador no cumplen la meta.">
          <Kpi
            rotulo={INDICADOR_A.titulo}
            meta={`Meta: ${INDICADOR_A.valores!.meta_pct}% o más · aprobados en ${tope} h o menos`}
            valor={pct(r.a.valor)}
            cumple={r.a.cumple}
            pie={r.a.detalle}
          />
          <Kpi
            rotulo={INDICADOR_B.titulo}
            meta={`Meta: menos de ${INDICADOR_B.valores!.meta_h} h`}
            valor={r.b.valor === null ? <PorDefinir>[sin dato]</PorDefinir> : fmtHoras(r.b.valor)}
            cumple={r.b.cumple}
            pie={r.b.detalle}
          />
          <Kpi
            rotulo={INDICADOR_C.titulo}
            meta={`Meta: ${INDICADOR_C.valores!.meta}`}
            valor={String(r.c.valor)}
            cumple={r.c.cumple}
            pie={r.c.detalle}
          />
          <Kpi
            rotulo={A_TIEMPO.titulo}
            meta={`Meta: ${A_TIEMPO.valores!.meta_pct}% · salida de bodega en ${A_TIEMPO.valores!.dias} días o menos desde la orden`}
            valor={pct(r.aTiempo.valor)}
            cumple={r.aTiempo.cumple}
            pie={r.aTiempo.detalle}
          />
        </Bloque>

        <Bloque titulo="Fuera de tope por tramo" tipos={["regla"]} reglas={[RELOJ_APROBACION.id, RELOJ_BODEGA.id]} pie={`${RELOJ_APROBACION.id} y ${RELOJ_BODEGA.id}.`}>
          <Kpi
            rotulo={tramoAprobar.rotulo}
            meta={`Solicitudes de la semana con más de ${tope} h de espera`}
            valor={String(r.fueraDeTope.aprobar.length)}
            cumple={r.fueraDeTope.aprobar.length === 0}
            pie={r.fueraDeTope.aprobar.map((p) => p.id_pedido).join(" · ") || "—"}
          />
          <Kpi
            rotulo={tramoBodega.rotulo}
            meta={`Despachados en la semana con más de ${RELOJ_BODEGA.valores!.tope_dias} días en bodega`}
            valor={String(r.fueraDeTope.bodega.length)}
            cumple={r.fueraDeTope.bodega.length === 0}
            pie={r.fueraDeTope.bodega.map((p) => `${p.id_pedido} (día ${diasEnBodega(p)})`).join(" · ") || "—"}
          />
        </Bloque>
      </div>

      <div className="mt-6 flex flex-col gap-6">
        <Bloque titulo="Para escalar" tipos={["regla"]} reglas={[PARA_ESCALAR.id]} pie={`${PARA_ESCALAR.texto} (${PARA_ESCALAR.id})`}>
          <Lista pedidos={r.paraEscalar} vacio="No hay pedidos para escalar." />
        </Bloque>

        <div className="grid gap-6 lg:grid-cols-2">
          <Bloque titulo="Fuera de regla" tipos={["regla"]} reglas={["CRED-4.1"]} pie="Aprobaciones dadas por quien no correspondía (CRED-4.1).">
            <Lista pedidos={r.fueraDeRegla} vacio="Ninguna aprobación fuera de regla." />
          </Bloque>
          <Bloque titulo="Sin aprobación" tipos={["regla"]} pie="Pedidos de la semana sin fecha de aprobación, con su estado.">
            <Lista pedidos={r.sinAprobacion} vacio="Todos tienen aprobación." />
          </Bloque>
        </div>

        <Bloque
          titulo="Horas de espera de lo aprobado en la semana"
          tipos={["regla"]}
          reglas={[RELOJ_APROBACION.id]}
          pie={`Línea discontinua: tope de ${tope} h (${RELOJ_APROBACION.id}). Fuente: lib/data.ts.`}
        >
          <ChartContainer config={configGrafico} className="aspect-auto h-80 w-full">
            <BarChart data={datosGrafico} layout="vertical" margin={{ left: 8, right: 32 }}>
              <CartesianGrid horizontal={false} stroke="var(--linea)" />
              <XAxis type="number" tickLine={false} axisLine={false} unit=" h" />
              <YAxis type="category" dataKey="id" width={130} interval={0} tickLine={false} axisLine={false} className="font-mono" />
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <ReferenceLine x={tope} stroke="var(--tinta)" strokeDasharray="6 4" strokeWidth={2} />
              <Bar dataKey="horas" fill="var(--color-horas)" barSize={18} />
            </BarChart>
          </ChartContainer>
        </Bloque>

        <Bloque titulo="Andrés ve, para estar al tanto" tipos={["regla"]} reglas={[CASO_4.id]} pie={`${CASO_4.titulo}. Los ve, no los aprueba.`}>
          <ul className="divide-y divide-linea border-y border-linea">
            {r.paraVerAndres.map((p) => (
              <li key={p.id_pedido} className="flex items-center justify-between gap-3 py-2.5 text-[15px]">
                <span>
                  <span className="dato mr-2">{p.id_pedido}</span>
                  {p.cliente}
                </span>
                {aprobacion(p) ? <Estado clase="aprobado" palabra={`Aprobó ${aprobo(p)}`} /> : <EstadoPedido pedido={p} />}
              </li>
            ))}
          </ul>
        </Bloque>
      </div>
    </>
  )
}
