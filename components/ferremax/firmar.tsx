"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { HOY } from "@/lib/data"
import { FICHA, FIRMAR_PEDIDO, MOTIVO_ESCRITO, VER_INFO_CREDITO } from "@/lib/rules"
import { usePrototipo } from "@/lib/store"
import type { Accion, Pedido } from "@/lib/tipos"
import { asignacion, tramoDe } from "@/lib/vistas"
import { ReglaBoton } from "./insignia"

type Decision = Extract<Accion, "aprobado" | "rechazado" | "info_pedida">

/** Qué puede hacer el rol actual con este pedido, según PER-4. */
export function usePermisoFirma(p: Pedido) {
  const { rol } = usePrototipo()
  if (tramoDe(p) !== "aprobar") return { firmar: false, pedirDato: false }
  return FIRMAR_PEDIDO.fn(rol, asignacion(p))
}

/** Motivo obligatorio y los botones que el rol puede usar. Nada más. */
export function PanelFirma({ pedido, alTerminar }: { pedido: Pedido; alTerminar?: () => void }) {
  const { rol, registrar } = usePrototipo()
  const permiso = usePermisoFirma(pedido)
  const [motivo, setMotivo] = useState("")
  const [error, setError] = useState<string | null>(null)

  const acciones: { accion: Decision; nombre: string; variante: "default" | "outline"; ok: boolean }[] = [
    { accion: "aprobado", nombre: "Aprobar", variante: "default", ok: permiso.firmar },
    { accion: "rechazado", nombre: "Rechazar", variante: "outline", ok: permiso.firmar },
    { accion: "info_pedida", nombre: "Pedir información", variante: "outline", ok: permiso.pedirDato },
  ]

  function actuar(accion: Decision, nombre: string) {
    if (!MOTIVO_ESCRITO.fn(motivo)) return setError(`Escribe el motivo. ${MOTIVO_ESCRITO.texto}`)
    registrar(pedido.id_pedido, { accion, fecha: HOY, quien: rol, motivo: motivo.trim() })
    toast.success(`${pedido.id_pedido}: ${nombre.toLowerCase()}`, { description: `Firmado por ${rol}.` })
    setMotivo("")
    setError(null)
    alTerminar?.()
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[15px]">
        Firmas como <strong className="font-medium">{rol}</strong>.
      </p>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`motivo-${pedido.id_pedido}`} className="etiqueta">
          Motivo (obligatorio) <ReglaBoton id={MOTIVO_ESCRITO.id} soloId className="ml-1" />
        </Label>
        <Textarea
          id={`motivo-${pedido.id_pedido}`}
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder={permiso.firmar ? "Por qué apruebas o rechazas" : "Qué dato falta y a quién se le pide"}
          className="min-h-24 bg-papel text-[15px]"
          aria-invalid={!!error}
        />
        {error && <p className="text-sm text-vencido">{error}</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        {acciones
          .filter((a) => a.ok)
          .map((a) => (
            <Button key={a.accion} variant={a.variante} size="lg" className="px-4 text-[15px]" onClick={() => actuar(a.accion, a.nombre)}>
              {a.nombre}
            </Button>
          ))}
      </div>
    </div>
  )
}

/** Botón de la tabla: aparece solo si la regla deja firmar (o pedir el dato) al rol. */
export function BotonFirmar({ pedido }: { pedido: Pedido }) {
  const { rol } = usePrototipo()
  const permiso = usePermisoFirma(pedido)
  const [abierto, setAbierto] = useState(false)
  if (!permiso.firmar && !permiso.pedirDato) return <span className="text-grafito">—</span>
  const ficha = FICHA.fn(pedido)

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger render={<Button size="sm" variant={permiso.firmar ? "default" : "outline"} className="px-3" />}>
        {permiso.firmar ? "Aprobar" : "Pedir dato"}
      </DialogTrigger>
      <DialogContent className="rounded-none sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-medium">{pedido.id_pedido}</DialogTitle>
          <DialogDescription>
            {asignacion(pedido).porque} <ReglaBoton id={FIRMAR_PEDIDO.id} soloId className="ml-1" />
          </DialogDescription>
        </DialogHeader>
        {VER_INFO_CREDITO.fn(rol) && (
          <dl className="divide-y divide-linea border-y border-linea text-sm">
            {ficha.lineas.map((l) => (
              <div key={l.rotulo} className="flex justify-between gap-4 py-1.5">
                <dt className="text-grafito">{l.rotulo}</dt>
                <dd className="text-right">{l.valor}</dd>
              </div>
            ))}
          </dl>
        )}
        <PanelFirma pedido={pedido} alTerminar={() => setAbierto(false)} />
      </DialogContent>
    </Dialog>
  )
}
