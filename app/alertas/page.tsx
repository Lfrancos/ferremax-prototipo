"use client"

import Link from "next/link"
import { Estado, Semaforo } from "@/components/ferremax/estado"
import { Bloque, NotaPropuesta, Titulo } from "@/components/ferremax/piezas"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { HOY } from "@/lib/data"
import { fmtDia, fmtFechaHora } from "@/lib/fechas"
import { tramos } from "@/lib/flujo"
import { borradorAviso } from "@/lib/propuestas"
import {
  ALERTA_ENTREGA,
  CRUCE_DEL_LIMITE,
  EVIDENCIA_ENTREGA,
  RELOJ_APROBACION,
  RELOJ_BODEGA,
  RELOJ_TRANSPORTE,
  SALIDA_COMPLETA,
  VER_INFO_CREDITO,
} from "@/lib/rules"
import { usePrototipo } from "@/lib/store"
import type { Pedido } from "@/lib/tipos"
import { cn } from "@/lib/utils"
import { alertas, alertasTransporte, asignacion, crucesDelLimite, type AlertaTransporte, type Reloj } from "@/lib/vistas"

function TablaTransporte({ filas }: { filas: AlertaTransporte[] }) {
  const { rol } = usePrototipo()
  if (!filas.length) return <p className="text-[15px] text-grafito">Nada sin confirmar, sin evidencia o incompleto.</p>
  return (
    <div className="overflow-x-auto border border-linea">
      <Table className="text-[15px]">
        <TableHeader>
          <TableRow className="border-b-2 border-tinta hover:bg-transparent">
            <TableHead className="etiqueta text-grafito">Pedido</TableHead>
            <TableHead className="etiqueta text-grafito">Cliente</TableHead>
            <TableHead className="etiqueta text-grafito">Estado</TableHead>
            <TableHead className="etiqueta text-grafito">Qué pasa</TableHead>
            <TableHead className="etiqueta text-grafito">Qué se hace</TableHead>
            <TableHead className="etiqueta text-grafito">Quién</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filas.map((f) => (
            <TableRow
              key={`${f.pedido.id_pedido}-${f.tipo}`}
              className={cn(
                "border-linea",
                f.quien.includes(rol.split(" ")[0]) && "bg-amarillo-suave hover:bg-amarillo-suave",
                f.clase === "vencido" && "shadow-[inset_4px_0_0_var(--vencido)]",
              )}
            >
              <TableCell className="py-3">
                <Link href={`/pedidos/${f.pedido.id_pedido}`} className="dato hover:underline">
                  {f.pedido.id_pedido}
                </Link>
              </TableCell>
              <TableCell>{f.pedido.cliente}</TableCell>
              <TableCell>
                <Estado clase={f.clase} palabra={f.palabra} />
              </TableCell>
              <TableCell className="min-w-64 whitespace-normal">{f.que}</TableCell>
              <TableCell className="min-w-56 whitespace-normal">{f.queHace}</TableCell>
              <TableCell className="text-grafito">{f.quien}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function TablaAlertas({ filas }: { filas: { pedido: Pedido; reloj: Reloj }[] }) {
  const { rol } = usePrototipo()
  if (!filas.length) return <p className="text-[15px] text-grafito">Nada cerca del tope en este tramo.</p>
  return (
    <div className="overflow-x-auto border border-linea">
      <Table className="text-[15px]">
        <TableHeader>
          <TableRow className="border-b-2 border-tinta hover:bg-transparent">
            <TableHead className="etiqueta text-grafito">Pedido</TableHead>
            <TableHead className="etiqueta text-grafito">Cliente</TableHead>
            <TableHead className="etiqueta text-grafito">Reloj</TableHead>
            <TableHead className="etiqueta text-grafito">Qué pasa</TableHead>
            <TableHead className="etiqueta text-grafito">Quién</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filas.map(({ pedido, reloj }) => {
            const incompleta = reloj.tramo === "aprobar" && asignacion(pedido).tipo === "incompleta"
            return (
              <TableRow
                key={pedido.id_pedido}
                className={cn(
                  "border-linea",
                  reloj.quien === rol && "bg-amarillo-suave hover:bg-amarillo-suave",
                  reloj.clase === "vencido" && "shadow-[inset_4px_0_0_var(--vencido)]",
                )}
              >
                <TableCell className="py-3">
                  <Link href={`/pedidos/${pedido.id_pedido}`} className="dato hover:underline">
                    {pedido.id_pedido}
                  </Link>
                </TableCell>
                <TableCell>
                  {pedido.cliente}
                  {incompleta && <p className="text-sm text-grafito">Incompleta: ¿el reloj sigue corriendo? [por definir]</p>}
                </TableCell>
                <TableCell>
                  <Semaforo reloj={reloj} />
                </TableCell>
                <TableCell>{reloj.queHace}</TableCell>
                <TableCell className="text-grafito">{reloj.quien}</TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

export default function Alertas() {
  const { pedidos, rol, clientes, cartera } = usePrototipo()
  const a = alertas(pedidos)
  const deTransporte = alertasTransporte(pedidos)
  const cruces = crucesDelLimite(clientes, cartera)
  // Los tres más próximos: es un recorte de pantalla, no una regla (la lista completa está en /cartera).
  const proximos = cruces.filter((x) => x.faltan > 0).slice(0, 3)
  const yaCruzaron = cruces.filter((x) => x.faltan <= 0)
  const verInfo = VER_INFO_CREDITO.fn(rol)
  // Los avisos a aprobadores llevan la ficha: información de crédito (PER-1).
  const borradores = borradorAviso(pedidos).filter((b) => verInfo || b.startsWith("Para: Nelson"))
  const [tramoAprobar, tramoBodega] = tramos()

  return (
    <>
      <Titulo
        indice="(005) Rutina diaria"
        titulo="Cerca del tope y fuera de tope"
        bajada={`Corrida de hoy: ${fmtFechaHora(HOY)} · La rutina avisa. No decide, no reordena, no despacha.`}
      />

      <div className="flex flex-col gap-6">
        <Bloque
          titulo={`Tramo ${tramoAprobar.rotulo}`}
          tipos={["regla"]}
          reglas={[RELOJ_APROBACION.id]}
          pie={
            <>
              {RELOJ_APROBACION.texto} <span className="dato">({RELOJ_APROBACION.id})</span>
            </>
          }
        >
          <TablaAlertas filas={a.aprobar} />
        </Bloque>

        <Bloque
          titulo={`Tramo ${tramoBodega.rotulo}`}
          tipos={["regla"]}
          reglas={[RELOJ_BODEGA.id]}
          pie={
            <>
              {RELOJ_BODEGA.texto} <span className="dato">({RELOJ_BODEGA.id})</span>
            </>
          }
        >
          <TablaAlertas filas={a.bodega} />
        </Bloque>

        <Bloque
          titulo="Tramo En camino · sin tope, pero con aviso"
          tipos={["regla"]}
          reglas={[RELOJ_TRANSPORTE.id, SALIDA_COMPLETA.id, EVIDENCIA_ENTREGA.id, ALERTA_ENTREGA.id]}
          pie={
            <>
              {RELOJ_TRANSPORTE.texto} <span className="dato">({RELOJ_TRANSPORTE.id})</span>{" "}
              <Link href="/transporte" className="underline underline-offset-4">
                Ver Transporte
              </Link>
            </>
          }
        >
          <TablaTransporte filas={deTransporte} />
        </Bloque>

        {verInfo && (
          <Bloque
            titulo="Cartera · quién cruza pronto el límite de atraso"
            tipos={["regla"]}
            reglas={[CRUCE_DEL_LIMITE.id]}
            pie={
              <>
                Calculado sobre el corte {cartera.archivo}.{" "}
                <Link href="/cartera" className="underline underline-offset-4">
                  Ver toda la cartera
                </Link>
              </>
            }
          >
            <ul className="divide-y divide-linea border-y border-linea text-[15px]">
              {proximos.map(({ cliente, estado, faltan }) => (
                <li key={cliente.id_cliente} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                  <span>
                    <span className="font-medium">{cliente.razon_social}</span>{" "}
                    <span className="text-sm text-muted-foreground">
                      · {estado.atraso} días hoy · {estado.cruce!.factura}
                    </span>
                  </span>
                  <span>
                    Cruza el {fmtDia(estado.cruce!.fecha)} <span className="text-sm text-muted-foreground">(en {faltan} {faltan === 1 ? "día" : "días"})</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-muted-foreground">
              Ya pasaron el límite: {yaCruzaron.map((x) => x.cliente.razon_social).join(" · ") || "ninguno"}. Sus pedidos van a Andrés.
            </p>
          </Bloque>
        )}

        <Bloque
          titulo="Aviso redactado para WhatsApp o correo"
          tipos={["propuesta"]}
          pie={verInfo ? "Borradores. Nadie los envía desde aquí." : "Borradores. Los avisos a aprobadores llevan la ficha: tu rol no los ve (PER-1)."}
        >
          <NotaPropuesta />
          <div className="grid gap-4 md:grid-cols-2">
            {borradores.map((b) => (
              <pre key={b} className="border border-linea bg-papel p-4 font-sans text-[15px] leading-relaxed whitespace-pre-wrap">
                {b}
              </pre>
            ))}
          </div>
        </Bloque>
      </div>
    </>
  )
}
