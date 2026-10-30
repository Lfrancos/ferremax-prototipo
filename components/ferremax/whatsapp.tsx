"use client"

import { useEffect, useRef, useState } from "react"
import { SendIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { fmtFechaHora } from "@/lib/fechas"
import { APROBADORES, CELULARES, NUMERO_FERREMAX, conversacion, destinatarios, resolverRespuesta } from "@/lib/notificaciones"
import { usePrototipo } from "@/lib/store"
import type { FechaHora, Persona } from "@/lib/tipos"
import { cn } from "@/lib/utils"
import { tramoDe } from "@/lib/vistas"

/** WhatsApp pone en negrita lo que va entre asteriscos. */
function Texto({ texto }: { texto: string }) {
  return (
    <>
      {texto.split("\n").map((linea, i) => (
        <p key={i} className="min-h-[1.25em]">
          {linea.split(/(\*[^*]+\*)/).map((trozo, j) =>
            trozo.length > 2 && trozo.startsWith("*") && trozo.endsWith("*") ? <strong key={j}>{trozo.slice(1, -1)}</strong> : trozo,
          )}
        </p>
      ))}
    </>
  )
}

/**
 * El celular de quien aprueba, para ensayar. Muestra los avisos que le tocaron hasta `ahora` y deja contestarlos.
 * Nada sale a WhatsApp: lo que se escribe pasa por resolverRespuesta (lib/notificaciones.ts), que es la misma
 * validación que usaría el sistema real con un mensaje recibido de Baileys.
 */
export function ChatWhatsApp({ ahora }: { ahora: FechaHora }) {
  const { pedidos, whatsapp, escribirWhatsApp, registrar } = usePrototipo()
  const [persona, setPersona] = useState<Persona>("Andrés Molina")
  const [texto, setTexto] = useState("")
  const [citado, setCitado] = useState<string | null>(null)
  const fin = useRef<HTMLDivElement>(null)
  const campo = useRef<HTMLInputElement>(null)

  const burbujas = conversacion(persona, pedidos, whatsapp, ahora)
  // En WhatsApp real se responde citando un mensaje; aquí se elige el pedido de la lista.
  const conversados = [...new Set(burbujas.map((b) => b.id_pedido).filter((x): x is string => x !== null))].sort()
  const abiertos = conversados.filter((id) => {
    const p = pedidos.find((x) => x.id_pedido === id)
    return p && tramoDe(p) === "aprobar" && destinatarios(p).para.includes(persona)
  })
  /** Un pedido que ya no está por aprobar está resuelto; uno abierto que no es de esta persona solo se le avisó. */
  const marca = (id: string) => {
    const p = pedidos.find((x) => x.id_pedido === id)
    if (!p || tramoDe(p) !== "aprobar") return " · resuelto"
    return abiertos.includes(id) ? "" : " · lo aprueba otro"
  }
  const objetivo = citado && conversados.includes(citado) ? citado : (abiertos.at(-1) ?? conversados.at(-1) ?? null)

  useEffect(() => {
    fin.current?.scrollIntoView({ block: "end" })
  }, [burbujas.length, persona])

  function enviar(enviado: string) {
    const p = pedidos.find((x) => x.id_pedido === objetivo)
    if (!p || !enviado.trim()) return
    const r = resolverRespuesta(p, persona, enviado, ahora)
    escribirWhatsApp([
      { fecha: ahora, persona, sentido: "entrada", texto: enviado.trim(), id_pedido: p.id_pedido },
      ...r.respuestas.map((t) => ({ fecha: ahora, persona, sentido: "salida" as const, texto: t, id_pedido: p.id_pedido })),
    ])
    if (r.evento) registrar(p.id_pedido, r.evento)
    setTexto("")
  }

  const atajos = [
    { etiqueta: "1 Aprobar", valor: "1 " },
    { etiqueta: "2 Rechazar", valor: "2 " },
    { etiqueta: "3 Info", valor: "3 " },
  ]

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-1.5">
        <label className="etiqueta text-grafito">Ver el celular de</label>
        <Select value={persona} onValueChange={(v) => v && setPersona(v as Persona)}>
          <SelectTrigger className="w-full">
            <SelectValue>
              {persona} · {CELULARES[persona]}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {APROBADORES.map((a) => (
              <SelectItem key={a} value={a}>
                {a} · {CELULARES[a]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col overflow-hidden rounded-xl border-2 border-tinta bg-papel">
        <div className="flex items-center gap-3 bg-tinta px-4 py-3 text-papel">
          <span className="grid size-8 place-items-center rounded-full bg-amarillo text-sm font-bold text-sobre-amarillo">F</span>
          <div className="leading-tight">
            <p className="text-sm font-medium">Ferremax · Avisos</p>
            <p className="text-xs opacity-70">{NUMERO_FERREMAX}</p>
          </div>
        </div>

        <div className="flex h-[26rem] flex-col gap-2 overflow-y-auto bg-muted/40 p-3" aria-live="polite">
          {burbujas.length === 0 && (
            <p className="m-auto max-w-56 text-center text-sm text-grafito">
              {persona} no tiene avisos todavía. Cuando le toque aprobar algo, llega aquí.
            </p>
          )}
          {burbujas.map((b) => (
            <div key={b.id} className={cn("flex flex-col", b.sentido === "entrada" ? "items-end" : "items-start")}>
              <div
                className={cn(
                  "max-w-[88%] rounded-lg px-3 py-2 text-[13px] leading-snug shadow-sm",
                  b.sentido === "entrada" ? "rounded-tr-none bg-amarillo-suave" : "rounded-tl-none bg-superficie",
                  b.tipo === "escalamiento" && "border border-vencido",
                )}
              >
                <Texto texto={b.texto} />
              </div>
              <span className="mt-0.5 px-1 text-[11px] text-grafito">{fmtFechaHora(b.fecha)}</span>
            </div>
          ))}
          <div ref={fin} />
        </div>

        <form
          className="flex flex-col gap-2 border-t border-linea bg-superficie p-3"
          onSubmit={(e) => {
            e.preventDefault()
            enviar(texto)
          }}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="etiqueta text-grafito">Responder a</span>
            <Select value={objetivo ?? ""} onValueChange={(v) => v && setCitado(v as string)} disabled={!conversados.length}>
              <SelectTrigger size="sm" className="min-w-40">
                <SelectValue placeholder="Ningún pedido">{objetivo}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {conversados.map((id) => (
                  <SelectItem key={id} value={id}>
                    {id}
                    {marca(id)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {atajos.map((a) => (
              <Button
                key={a.etiqueta}
                type="button"
                size="sm"
                variant="outline"
                disabled={!objetivo}
                onClick={() => {
                  setTexto(a.valor)
                  campo.current?.focus()
                }}
              >
                {a.etiqueta}
              </Button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              ref={campo}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              disabled={!objetivo}
              placeholder={objetivo ? "Escribe: 1 Cliente al día, cabe en el cupo" : "Nada que responder"}
              aria-label="Mensaje"
              className="min-w-0 flex-1 rounded-md border border-linea bg-papel px-3 py-2 text-sm outline-none focus-visible:border-tinta"
            />
            <Button type="submit" size="icon" aria-label="Enviar" disabled={!objetivo || !texto.trim()}>
              <SendIcon />
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
