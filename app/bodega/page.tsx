"use client"

import Link from "next/link"
import { CargaBodega } from "@/components/ferremax/carga-bodega"
import { BotonEntregar } from "@/components/ferremax/entregar"
import { Estado } from "@/components/ferremax/estado"
import { ReglaBoton } from "@/components/ferremax/insignia"
import { Bloque, Titulo } from "@/components/ferremax/piezas"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { hrefRemision } from "@/lib/documentos"
import { remisionDe } from "@/lib/evidencia"
import { fmtDia, fmtFechaHora } from "@/lib/fechas"
import {
  ENTRADA_A_LA_FILA,
  ENTREGAR_A_TRANSPORTE,
  FECHA_LIMITE,
  ORDEN_DE_LA_FILA,
  REMISION_SIN_FIRMA,
  RELOJ_BODEGA,
  SALIDA_COMPLETA,
} from "@/lib/rules"
import { usePrototipo } from "@/lib/store"
import { cn } from "@/lib/utils"
import { listaDeAlistamiento } from "@/lib/vistas"

export default function Bodega() {
  const { pedidos, rol } = usePrototipo()
  const { corte, filas } = listaDeAlistamiento(pedidos)
  const deNelson = rol === "Nelson"

  return (
    <>
      <Titulo
        indice="(004) Bodega · vista de Nelson"
        titulo="Lista de alistamiento de mañana"
        bajada={`Corte: ${fmtFechaHora(corte)} · La lista sale sola. Nadie revisa bandejas.`}
      />

      <Bloque
        titulo={`${filas.length} pedidos a crédito, en orden`}
        tipos={["regla"]}
        reglas={[ORDEN_DE_LA_FILA.id, FECHA_LIMITE.id, RELOJ_BODEGA.id]}
        className={cn(deNelson && "outline-2 outline-amarillo")}
        pie={
          <>
            Orden: {ORDEN_DE_LA_FILA.texto} <span className="dato">({ORDEN_DE_LA_FILA.id})</span>. Fecha límite:{" "}
            {FECHA_LIMITE.texto} <span className="dato">({FECHA_LIMITE.id})</span>. Días en bodega y estado al corte de la lista{" "}
            <span className="dato">({RELOJ_BODEGA.id})</span>.
          </>
        }
      >
        <div className="overflow-x-auto border border-linea">
          <Table className="text-[15px]">
            <TableHeader>
              <TableRow className="border-b-2 border-tinta hover:bg-transparent">
                <TableHead className="etiqueta text-grafito">#</TableHead>
                <TableHead className="etiqueta text-grafito">Pedido</TableHead>
                <TableHead className="etiqueta text-grafito">Cliente</TableHead>
                <TableHead className="etiqueta text-right text-grafito">Líneas</TableHead>
                <TableHead className="etiqueta text-grafito">Listo desde</TableHead>
                <TableHead className="etiqueta text-grafito">Fecha límite</TableHead>
                <TableHead className="etiqueta text-right text-grafito">Días en bodega al corte</TableHead>
                <TableHead className="etiqueta text-grafito">Estado</TableHead>
                <TableHead className="etiqueta text-grafito">
                  <span className="flex flex-col items-start gap-1 py-1.5">
                    Salida <ReglaBoton id={SALIDA_COMPLETA.id} soloId />
                  </span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filas.map((f, i) => (
                <TableRow
                  key={f.pedido.id_pedido}
                  className={cn("border-linea", f.clase === "vencido" && "shadow-[inset_4px_0_0_var(--vencido)]")}
                >
                  <TableCell className="dato py-3 text-grafito">{String(i + 1).padStart(2, "0")}</TableCell>
                  <TableCell>
                    <Link href={`/pedidos/${f.pedido.id_pedido}`} className="dato hover:underline">
                      {f.pedido.id_pedido}
                    </Link>
                    <Link href={hrefRemision(f.pedido.id_pedido)} className="dato block text-sm text-grafito underline-offset-4 hover:underline">
                      {remisionDe(f.pedido.id_pedido)}
                    </Link>
                  </TableCell>
                  <TableCell>{f.pedido.cliente}</TableCell>
                  <TableCell className="dato text-right">{f.pedido.lineas}</TableCell>
                  <TableCell className="text-grafito">{fmtFechaHora(f.listoDesde)}</TableCell>
                  <TableCell className="font-medium">{fmtDia(f.fechaLimite)}</TableCell>
                  <TableCell className="dato text-right">{f.dias}</TableCell>
                  <TableCell>
                    <Estado clase={f.clase} palabra={f.palabra} />
                  </TableCell>
                  <TableCell>
                    <BotonEntregar pedido={f.pedido} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Bloque>

      <Bloque titulo="Carga de la bodega" tipos={[]} className="mt-6">
        <CargaBodega />
      </Bloque>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Bloque titulo="Cómo entra un pedido" tipos={["regla"]} reglas={[ENTRADA_A_LA_FILA.id, REMISION_SIN_FIRMA.id]}>
          <p className="text-[15px]">{ENTRADA_A_LA_FILA.texto}</p>
          <p className="mt-3 text-sm text-grafito">
            <span className="dato">{ENTRADA_A_LA_FILA.id}</span> · {REMISION_SIN_FIRMA.texto}{" "}
            <span className="dato">({REMISION_SIN_FIRMA.id})</span>
          </p>
        </Bloque>
        <Bloque titulo="Qué decide Nelson" tipos={["humano", "regla"]} reglas={[ORDEN_DE_LA_FILA.id, ENTREGAR_A_TRANSPORTE.id]}>
          <p className="text-[15px]">
            Alista y despacha en el orden de la lista. El orden no lo cambia nadie a mano: lo dicen{" "}
            <span className="dato">{ENTRADA_A_LA_FILA.id}</span> y <span className="dato">{ORDEN_DE_LA_FILA.id}</span>.
          </p>
          <p className="mt-3 text-[15px]">
            Al entregar a transporte anota lo que cargó, línea por línea. Si falta algo sale incompleto y se avisa.{" "}
            <Link href="/transporte" className="underline underline-offset-4">
              Ver lo que va en camino
            </Link>
          </p>
        </Bloque>
        <Bloque titulo="Lo que no muestra" tipos={["regla"]} reglas={[ENTRADA_A_LA_FILA.id]}>
          <p className="text-[15px]">La lista real también trae los pedidos de contado. El prototipo muestra solo crédito.</p>
          <p className="mt-3 text-sm text-grafito">Fuente: Regla de prioridad de alistamiento (v1), secciones 1 y 3.</p>
        </Bloque>
      </div>
    </>
  )
}
