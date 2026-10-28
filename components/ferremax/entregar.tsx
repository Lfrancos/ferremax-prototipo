"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { HOY } from "@/lib/data"
import { CONDUCTORES, remisionDe } from "@/lib/evidencia"
import { fmtFechaHora } from "@/lib/fechas"
import { lineasDe } from "@/lib/lineas"
import { ENTREGAR_A_TRANSPORTE, REMISION_SIN_FIRMA, SALIDA_COMPLETA } from "@/lib/rules"
import { usePrototipo } from "@/lib/store"
import type { Pedido } from "@/lib/tipos"
import { cn } from "@/lib/utils"
import { tramoDe } from "@/lib/vistas"
import { Estado } from "./estado"
import { ReglaBoton } from "./insignia"

/** Botón "Entregar a transporte": solo aparece si PER-8 deja al rol y el pedido está en bodega. */
export function BotonEntregar({ pedido, grande = false }: { pedido: Pedido; grande?: boolean }) {
  const { rol } = usePrototipo()
  const [abierto, setAbierto] = useState(false)
  if (tramoDe(pedido) !== "bodega") return null
  if (!ENTREGAR_A_TRANSPORTE.fn(rol).entregar) return grande ? null : <span className="text-grafito">—</span>

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger render={<Button size={grande ? "lg" : "sm"} className={grande ? "px-4 text-[15px]" : "px-3"} />}>
        Entregar a transporte
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] gap-4 overflow-y-auto rounded-none sm:max-w-3xl">
        {abierto && <Formulario pedido={pedido} alTerminar={() => setAbierto(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function Formulario({ pedido, alTerminar }: { pedido: Pedido; alTerminar: () => void }) {
  const { rol, despachar } = usePrototipo()
  const items = lineasDe(pedido)
  const [cargado, setCargado] = useState<Record<string, string>>(() => Object.fromEntries(items.map((i) => [i.sku, String(i.cantidad)])))
  const [conductor, setConductor] = useState<string>("")
  const [motivo, setMotivo] = useState("")
  const [error, setError] = useState<string | null>(null)

  const cantidad = (sku: string) => {
    const n = Number(cargado[sku])
    return Number.isInteger(n) && n >= 0 ? n : NaN
  }
  const lineas = items.map((i) => ({ sku: i.sku, cantidad: cantidad(i.sku) }))
  const invalida = lineas.some((l) => Number.isNaN(l.cantidad) || l.cantidad > items.find((i) => i.sku === l.sku)!.cantidad)
  const revision = SALIDA_COMPLETA.fn(items, invalida ? items.map((i) => ({ sku: i.sku, cantidad: i.cantidad })) : lineas)
  const elegido = CONDUCTORES.find((c) => c.nombre === conductor)

  function confirmar() {
    if (invalida) return setError("Cada cantidad tiene que ser un número entero entre 0 y lo pedido.")
    if (!elegido) return setError("Elige el conductor que se lleva el pedido.")
    if (!revision.completo && !motivo.trim()) return setError("Salió incompleto: escribe qué falta y por qué. Queda a la vista de Marcela y del vendedor.")
    const resumen = revision.completo
      ? "Salió completo."
      : `Salió incompleto: ${revision.faltantes.map((f) => `faltan ${f.falta} de ${f.descripcion.toLowerCase()}`).join("; ")}. ${motivo.trim()}`
    despachar(
      pedido.id_pedido,
      { ...elegido, cargado: lineas, faltante_motivo: revision.completo ? undefined : motivo.trim() },
      { accion: "despachado", fecha: HOY, quien: rol, motivo: resumen },
    )
    toast.success(`${pedido.id_pedido} va en camino`, {
      description: revision.completo ? `Salió completo con ${elegido.nombre}.` : `Salió incompleto con ${elegido.nombre}. Marcela y el vendedor lo ven.`,
    })
    alTerminar()
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-xl font-medium">Entregar a transporte · {pedido.id_pedido}</DialogTitle>
        <DialogDescription>
          {pedido.cliente} · {pedido.lineas} {pedido.lineas === 1 ? "línea" : "líneas"} · Remisión{" "}
          <span className="dato">{remisionDe(pedido.id_pedido)}</span> (sale de SAP, no necesita firma de cartera){" "}
          <ReglaBoton id={REMISION_SIN_FIRMA.id} soloId />
        </DialogDescription>
      </DialogHeader>

      <div className="overflow-x-auto border border-linea">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-tinta text-left">
              <th className="etiqueta px-3 py-2 font-normal text-grafito">Producto</th>
              <th className="etiqueta px-3 py-2 text-right font-normal text-grafito">Pedido</th>
              <th className="etiqueta px-3 py-2 text-right font-normal text-grafito">Cargado</th>
              <th className="etiqueta px-3 py-2 font-normal text-grafito">Estado</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => {
              const c = cantidad(i.sku)
              const falta = Number.isNaN(c) ? 0 : i.cantidad - c
              const exceso = !Number.isNaN(c) && c > i.cantidad
              return (
                <tr key={i.sku} className="border-b border-linea last:border-b-0">
                  <td className="px-3 py-2">
                    <span className="dato text-grafito">{i.sku}</span> · {i.descripcion}
                  </td>
                  <td className="dato px-3 py-2 text-right">
                    {i.cantidad} <span className="text-grafito">{i.unidad}</span>
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    <Input
                      inputMode="numeric"
                      value={cargado[i.sku]}
                      onChange={(e) => {
                        setError(null)
                        setCargado((s) => ({ ...s, [i.sku]: e.target.value }))
                      }}
                      aria-label={`Cantidad cargada de ${i.descripcion}`}
                      aria-invalid={Number.isNaN(c) || exceso}
                      className={cn("ml-auto h-8 w-20 bg-papel text-right font-mono", (Number.isNaN(c) || exceso) && "border-vencido")}
                    />
                  </td>
                  <td className="px-3 py-2">
                    {Number.isNaN(c) || exceso ? (
                      <span className="text-vencido">Revisa la cantidad</span>
                    ) : falta > 0 ? (
                      <Estado clase="aviso" palabra={`Faltan ${falta}`} />
                    ) : (
                      <span className="text-aprobado">✓ Completa</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[15px]">
          {revision.completo ? <Estado clase="aprobado" palabra="Sale completo" /> : <Estado clase="aviso" palabra={`Sale incompleto · ${revision.faltantes.length} ${revision.faltantes.length === 1 ? "línea" : "líneas"}`} />}
          <ReglaBoton id={SALIDA_COMPLETA.id} soloId />
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setError(null)
            setCargado(Object.fromEntries(items.map((i) => [i.sku, String(i.cantidad)])))
          }}
        >
          Cargué todo lo pedido
        </Button>
      </div>

      {!revision.completo && (
        <div className="grid gap-1.5">
          <Label htmlFor="faltante" className="etiqueta">
            Qué falta y por qué (obligatorio)
          </Label>
          <Textarea
            id="faltante"
            value={motivo}
            onChange={(e) => {
              setError(null)
              setMotivo(e.target.value)
            }}
            placeholder="Ej.: llegó incompleto de la fábrica, va en el viaje del martes"
            className="min-h-16 bg-papel text-[15px]"
          />
        </div>
      )}

      <div className="grid gap-1.5">
        <Label htmlFor="conductor" className="etiqueta">
          Conductor
        </Label>
        <Select
          value={conductor}
          onValueChange={(v) => {
            if (!v) return
            setError(null)
            setConductor(v as string)
          }}
        >
          <SelectTrigger id="conductor" className="w-full">
            <SelectValue placeholder="Elige quién se lleva el pedido">{elegido && `${elegido.nombre} · ${elegido.transportadora}`}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {CONDUCTORES.map((c) => (
              <SelectItem key={c.nombre} value={c.nombre}>
                {c.nombre} · {c.transportadora}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {elegido && (
          <p className="text-sm text-grafito">
            Placa <span className="dato">{elegido.placa}</span> · Celular <span className="dato">{elegido.celular}</span>: por ese número
            escribe cuando entregue, así el chat sabe de qué pedido es.
          </p>
        )}
      </div>

      {error && <p className="text-sm text-vencido">{error}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <Button size="lg" className="px-4 text-[15px]" onClick={confirmar}>
          Confirmar: se entregó a transporte
        </Button>
        <span className="text-sm text-grafito">
          Se registra {fmtFechaHora(HOY)} por {rol}. Aquí se detiene el reloj de bodega.
        </span>
      </div>
    </>
  )
}
