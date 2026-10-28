"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { HOY } from "@/lib/data"
import { CELULAR_DESCONOCIDO, ESCENARIOS, NUMERO_FERREMAX, enlaceDe, quienRecibe, remisionDe } from "@/lib/evidencia"
import type { Canal, Pedido } from "@/lib/tipos"
import { usePrototipo } from "@/lib/store"
import { esperanEvidencia } from "@/lib/vistas"
import { FotoDelDocumento, FotoDelProducto } from "./foto"
import { ReglaBoton } from "./insignia"
import { EVIDENCIA_ENTREGA } from "@/lib/rules"

/**
 * Para ensayar la demo: hace de conductor. Escribe lo que el conductor mandaría por el chat de WhatsApp (opción A)
 * o desde su enlace (opción B). Nada sale a WhatsApp de verdad.
 */
export function SimularMensaje({
  canal,
  pedido,
  etiqueta = "Simular lo que manda el conductor",
  variante = "outline",
}: {
  canal: Canal
  /** Con enlace el mensaje ya es de un pedido; en el chat se elige. */
  pedido?: Pedido
  etiqueta?: string
  variante?: "default" | "outline"
}) {
  const [abierto, setAbierto] = useState(false)
  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger render={<Button size="sm" variant={variante} className="px-3" />}>{etiqueta}</DialogTrigger>
      <DialogContent className="max-h-[92vh] gap-4 overflow-y-auto rounded-none sm:max-w-2xl">
        {abierto && <Formulario canal={canal} fijo={pedido} alTerminar={() => setAbierto(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function Formulario({ canal, fijo, alTerminar }: { canal: Canal; fijo?: Pedido; alTerminar: () => void }) {
  const { pedidos, mensajes, recibirMensaje } = usePrototipo()
  const candidatos = esperanEvidencia(pedidos)
  const [clave, setClave] = useState<string>(fijo?.id_pedido ?? candidatos[0]?.id_pedido ?? "")
  const [numero, setNumero] = useState<"conductor" | "desconocido">("conductor")
  const [escenario, setEscenario] = useState(ESCENARIOS[0].clave)

  const objetivo = pedidos.find((p) => p.id_pedido === clave)
  const e = ESCENARIOS.find((x) => x.clave === escenario)!
  const armado = objetivo ? e.armar(remisionDe(objetivo.id_pedido), quienRecibe(mensajes.length)) : null
  const conductor = objetivo?.despacho
  const desconocido = canal === "Chat de WhatsApp" && numero === "desconocido"

  function enviar() {
    if (!objetivo || !armado || !conductor) return
    const r = recibirMensaje({
      canal,
      fecha: HOY,
      celular: desconocido ? CELULAR_DESCONOCIDO : conductor.celular,
      de: desconocido ? "Número desconocido" : conductor.nombre,
      ...armado,
      id_pedido: canal === "Enlace" ? objetivo.id_pedido : undefined,
    })
    if (r.id_pedido)
      toast.success(`${r.id}: asociado a ${r.id_pedido}`, { description: "Claude leyó las fotos. Mira la ficha del pedido o la lista de Transporte." })
    else
      toast.warning(`${r.id}: sin pedido`, { description: "No se pudo saber de cuál es. Queda en la bandeja para asociarlo a mano." })
    alTerminar()
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-xl font-medium">
          {canal === "Chat de WhatsApp" ? `Mensaje al ${NUMERO_FERREMAX}` : "Lo que ve el conductor en su enlace"}
        </DialogTitle>
        <DialogDescription>
          {canal === "Chat de WhatsApp"
            ? "El conductor escribe como cualquier persona: texto y dos fotos. Nadie le dice de qué pedido es."
            : fijo
              ? `Enlace único de ${fijo.id_pedido}: ${enlaceDe(fijo.id_pedido)}. Pide las dos fotos y ya sabe de qué pedido es.`
              : "Cada entrega tiene su enlace. Pide las dos fotos y ya sabe de qué pedido es."}
        </DialogDescription>
      </DialogHeader>

      {!candidatos.length || !objetivo ? (
        <p className="text-[15px]">No hay pedidos en camino ni entregas con alerta de las que pueda llegar un mensaje.</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {!fijo && (
              <div className="grid gap-1.5 sm:col-span-2">
                <Label className="etiqueta">Pedido que entrega</Label>
                <Select value={clave} onValueChange={(v) => v && setClave(v as string)}>
                  <SelectTrigger className="w-full">
                    <SelectValue>{objetivo && `${objetivo.id_pedido} · ${objetivo.cliente}`}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {candidatos.map((p) => (
                      <SelectItem key={p.id_pedido} value={p.id_pedido}>
                        {p.id_pedido} · {p.cliente} · {p.despacho?.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {canal === "Chat de WhatsApp" && (
              <div className="grid gap-1.5 sm:col-span-2">
                <Label className="etiqueta">Desde qué número escribe</Label>
                <Select value={numero} onValueChange={(v) => v && setNumero(v as "conductor" | "desconocido")}>
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {numero === "conductor"
                        ? `${conductor?.nombre} · ${conductor?.celular}`
                        : `Un número que Ferremax no conoce · ${CELULAR_DESCONOCIDO}`}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conductor">
                      {conductor?.nombre} · {conductor?.celular}
                    </SelectItem>
                    <SelectItem value="desconocido">Un número que Ferremax no conoce · {CELULAR_DESCONOCIDO}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid gap-1.5 sm:col-span-2">
              <Label className="etiqueta">Qué manda</Label>
              <Select value={escenario} onValueChange={(v) => v && setEscenario(v as string)}>
                <SelectTrigger className="w-full">
                  <SelectValue>{e.nombre}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {ESCENARIOS.map((x) => (
                    <SelectItem key={x.clave} value={x.clave}>
                      {x.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-grafito">{e.detalle}</p>
            </div>
          </div>

          {armado && (
            <div className="border border-linea bg-muted/40 p-4">
              <p className="w-fit max-w-md rounded-r-lg rounded-tl-lg bg-niebla px-3 py-2 text-[15px]">{armado.texto}</p>
              {(armado.producto || armado.documento) && (
                <div className="mt-3 flex flex-wrap items-start gap-3">
                  {armado.producto && (
                    <div className="w-40">
                      <FotoDelProducto foto={armado.producto} />
                    </div>
                  )}
                  {armado.documento && (
                    <div className="w-32">
                      <FotoDelDocumento foto={armado.documento} />
                    </div>
                  )}
                </div>
              )}
              <p className="mt-3 text-sm text-grafito">
                Se pide lo de <ReglaBoton id={EVIDENCIA_ENTREGA.id} soloId />: foto del producto y del documento con nombre, firma y la remisión{" "}
                <span className="dato">{remisionDe(objetivo.id_pedido)}</span>.
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Button size="lg" className="px-4 text-[15px]" onClick={enviar}>
              Enviar
            </Button>
            <span className="text-sm text-grafito">
              {canal === "Chat de WhatsApp"
                ? "El sistema busca el pedido por la remisión que se lea y, si no, por el celular."
                : "Con enlace no hay que adivinar: el mensaje ya es de este pedido."}
            </span>
          </div>
        </>
      )}
    </>
  )
}
