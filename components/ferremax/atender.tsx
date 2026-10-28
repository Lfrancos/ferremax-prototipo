"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { HOY } from "@/lib/data"
import { borradorPedirEvidencia } from "@/lib/evidencia"
import { ALERTA_ENTREGA, ENTREGAR_A_TRANSPORTE, MOTIVO_ESCRITO } from "@/lib/rules"
import { usePrototipo } from "@/lib/store"
import type { Pedido } from "@/lib/tipos"
import { entregaDe } from "@/lib/vistas"
import { ReglaBoton } from "./insignia"
import { NotaPropuesta } from "./piezas"

/** Qué puede hacer el rol con la alerta de entrega de un pedido (PER-8 y TRA-4). */
export function usePermisoAtender(p: Pedido) {
  const { rol } = usePrototipo()
  const e = entregaDe(p)
  return !!e && e.alerta && ENTREGAR_A_TRANSPORTE.fn(rol).atender
}

/** Pedir la evidencia otra vez o darla por buena. Nada más: la alerta no bloquea ni cambia el estado del pedido. */
export function PanelAtender({ pedido, alTerminar }: { pedido: Pedido; alTerminar?: () => void }) {
  const { rol, registrar } = usePrototipo()
  const e = entregaDe(pedido)!
  const [motivo, setMotivo] = useState("")
  const [error, setError] = useState<string | null>(null)
  const borrador = borradorPedirEvidencia(pedido, e.faltas.map((f) => f.texto), e.novedad)

  function pedir() {
    const quien = pedido.despacho?.nombre ?? "el conductor"
    registrar(pedido.id_pedido, {
      accion: "evidencia_pedida",
      fecha: HOY,
      quien: rol,
      motivo: `Se le pidió a ${quien}: ${[...e.faltas.map((f) => f.texto), ...(e.novedad ? ["explicar la novedad"] : [])].join("; ")}.`,
    })
    toast.success(`${pedido.id_pedido}: evidencia pedida de nuevo`, { description: `Quedó anotado por ${rol}. El mensaje no se envía desde la demo.` })
    alTerminar?.()
  }

  function aceptar() {
    if (!MOTIVO_ESCRITO.fn(motivo)) return setError("Escribe por qué das la evidencia por buena. Queda en el historial.")
    registrar(pedido.id_pedido, { accion: "evidencia_aceptada", fecha: HOY, quien: rol, motivo: motivo.trim() })
    toast.success(`${pedido.id_pedido}: evidencia dada por buena`, { description: `La alerta se cerró. Lo firma ${rol}.` })
    setMotivo("")
    setError(null)
    alTerminar?.()
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="list-disc pl-5 text-[15px]">
        {e.faltas.map((f) => (
          <li key={f.texto}>{f.texto}</li>
        ))}
        {e.novedad && <li>Quien recibió escribió: &quot;{e.novedad}&quot;</li>}
      </ul>

      <div className="border-2 border-dashed border-grafito p-3">
        <p className="etiqueta mb-1">Mensaje para pedirla otra vez</p>
        <NotaPropuesta />
        <pre className="font-sans text-[15px] leading-relaxed whitespace-pre-wrap">{borrador}</pre>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor={`aceptar-${pedido.id_pedido}`} className="etiqueta">
          Motivo, solo si la das por buena <ReglaBoton id={ALERTA_ENTREGA.id} soloId className="ml-1" />
        </Label>
        <Textarea
          id={`aceptar-${pedido.id_pedido}`}
          value={motivo}
          onChange={(ev) => setMotivo(ev.target.value)}
          placeholder="Ej.: hablé con el cliente, recibió todo y firma en la próxima visita"
          className="min-h-16 bg-papel text-[15px]"
          aria-invalid={!!error}
        />
        {error && <p className="text-sm text-vencido">{error}</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="lg" className="px-4 text-[15px]" onClick={pedir} disabled={e.atencion === "pedida"}>
          {e.atencion === "pedida" ? "Ya se pidió de nuevo" : "Pedir la evidencia otra vez"}
        </Button>
        <Button size="lg" variant="outline" className="px-4 text-[15px]" onClick={aceptar}>
          Dar por buena
        </Button>
      </div>
    </div>
  )
}

/** Botón de la lista de alertas: abre el panel para atender la alerta. */
export function BotonAtender({ pedido }: { pedido: Pedido }) {
  const puede = usePermisoAtender(pedido)
  const [abierto, setAbierto] = useState(false)
  if (!puede) return <span className="text-grafito">—</span>
  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger render={<Button size="sm" className="px-3" />}>Atender</DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-none sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-medium">{pedido.id_pedido}</DialogTitle>
          <DialogDescription>
            {pedido.cliente} · La alerta sigue abierta hasta que la pidas de nuevo y llegue bien, o la des por buena{" "}
            <ReglaBoton id={ALERTA_ENTREGA.id} soloId />
          </DialogDescription>
        </DialogHeader>
        {abierto && <PanelAtender pedido={pedido} alTerminar={() => setAbierto(false)} />}
      </DialogContent>
    </Dialog>
  )
}
