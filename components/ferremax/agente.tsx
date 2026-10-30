"use client"

import { useState } from "react"
import { LoaderCircleIcon } from "lucide-react"
import type { Herramienta } from "@/lib/agentes/agente"
import type { AgenteId, Corrida, Linea, Modo, Paso } from "@/lib/agentes/tipos"
import { HOY } from "@/lib/data"
import { fmtNumero } from "@/lib/formato"
import { usePrototipo } from "@/lib/store"
import { cn } from "@/lib/utils"

// La pantalla de un agente: llama a su ruta (app/api/agentes), lee los pasos a medida que llegan
// y, al terminar, guarda la corrida en el almacén y deja la línea en el registro de actividad.

interface EnVivo {
  modo?: Modo
  modelo?: string
  pasos: Paso[]
}

export function useAgente(agente: AgenteId, clave: string) {
  const { corridas, guardarCorrida, rol } = usePrototipo()
  const [vivo, setVivo] = useState<EnVivo | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function correr(contexto: unknown, que: string, id_pedido?: string) {
    setError(null)
    const estado: EnVivo = { pasos: [] }
    setVivo({ ...estado })
    let termino = false
    try {
      const r = await fetch(`/api/agentes/${agente}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(contexto) })
      if (!r.ok || !r.body) throw new Error(`La ruta respondió ${r.status}.`)
      const lector = r.body.pipeThrough(new TextDecoderStream()).getReader()
      let resto = ""
      for (;;) {
        const { value, done } = await lector.read()
        if (done) break
        resto += value
        const lineas = resto.split("\n")
        resto = lineas.pop() ?? ""
        for (const t of lineas.filter((x) => x.trim())) {
          const l = JSON.parse(t) as Linea
          if (l.tipo === "inicio") Object.assign(estado, { modo: l.modo, modelo: l.modelo })
          if (l.tipo === "paso") estado.pasos.push(l.paso)
          if (l.tipo === "error") throw new Error(l.mensaje)
          if (l.tipo === "fin") {
            termino = true
            guardarCorrida(
              {
                agente,
                clave: `${agente}:${clave}`,
                modo: estado.modo ?? "ensayo",
                modelo: estado.modelo ?? "",
                pasos: estado.pasos,
                resultado: l.resultado,
                vueltas: l.vueltas,
                tokens: l.tokens,
                pidio: rol,
                fecha: HOY,
              },
              que,
              id_pedido,
            )
          }
          setVivo({ ...estado, pasos: [...estado.pasos] })
        }
      }
      if (!termino) throw new Error("La respuesta se cortó antes de terminar.")
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setVivo(null)
    }
  }

  return { corrida: corridas[`${agente}:${clave}`] as Corrida | undefined, vivo, corriendo: vivo !== null, error, correr }
}

/** Cómo trabajó: modo, vueltas, herramientas y tokens. */
export function CabeceraCorrida({ corrida }: { corrida: Corrida }) {
  const herramientas = corrida.pasos.filter((p) => p.tipo === "herramienta").length
  return (
    <p className="text-sm text-grafito">
      {corrida.modo === "claude" ? (
        <>
          Claude · <span className="dato">{corrida.modelo}</span>
        </>
      ) : (
        <>Modo ensayo: no hay clave de API, así que usa las mismas herramientas con un texto de plantilla</>
      )}{" "}
      · {corrida.vueltas} {corrida.vueltas === 1 ? "vuelta" : "vueltas"} · {herramientas} herramientas
      {corrida.tokens && <> · {fmtNumero(corrida.tokens.entrada + corrida.tokens.salida, 0)} tokens</>} · lo pidió {corrida.pidio}
    </p>
  )
}

const corto = (v: unknown, max = 1600) => {
  const t = JSON.stringify(v, null, 2) ?? ""
  return t.length > max ? t.slice(0, max) + "\n…" : t
}

const vacia = (v: unknown) => !v || (typeof v === "object" && Object.keys(v as object).length === 0)

/** Cada paso del agente, por vuelta: lo que pensó, qué herramienta pidió, con qué y qué le devolvió la app. */
export function Traza({ pasos, entrega, enVivo = false }: { pasos: Paso[]; entrega: string; enVivo?: boolean }) {
  const vueltas = [...new Set(pasos.map((p) => p.vuelta))]
  return (
    <ol className="flex flex-col gap-4">
      {vueltas.map((v) => (
        <li key={v} className="border-l-2 border-tinta pl-4">
          <p className="etiqueta mb-2 text-grafito">
            Vuelta {v} · {v === 1 ? "Claude recibe el pedido y sus herramientas" : "Claude recibe lo que devolvieron las herramientas"}
          </p>
          <ul className="flex flex-col gap-2">
            {pasos
              .filter((p) => p.vuelta === v)
              .map((p, i) => (
                <li key={i} className="text-sm">
                  {p.tipo === "pensando" && <p className="whitespace-pre-line text-grafito italic">◆ Piensa: {p.texto}</p>}
                  {p.tipo === "texto" && <p className="whitespace-pre-line">{p.texto}</p>}
                  {p.tipo === "herramienta" && (
                    <div className={cn("border border-linea bg-card px-3 py-2", p.nombre === entrega && "border-tinta", p.error && "border-vencido")}>
                      <p>
                        {p.nombre === entrega ? "Entrega con " : "Pide "}
                        <span className="dato font-medium">{p.nombre}</span>
                        {!vacia(p.entrada) && p.nombre !== entrega && <span className="dato text-grafito"> {JSON.stringify(p.entrada)}</span>}
                      </p>
                      <details className="mt-1">
                        <summary className="cursor-pointer text-xs text-grafito underline-offset-4 hover:underline">
                          {p.nombre === entrega ? "Lo que escribió" : "Lo que le devolvió la app"}
                        </summary>
                        <pre className="mt-1 max-h-72 overflow-auto bg-muted/50 p-2 font-mono text-xs whitespace-pre-wrap">
                          {corto(p.nombre === entrega ? p.entrada : p.salida)}
                        </pre>
                      </details>
                    </div>
                  )}
                </li>
              ))}
          </ul>
        </li>
      ))}
      {enVivo && (
        <li className="flex items-center gap-2 text-sm text-grafito">
          <LoaderCircleIcon className="size-4 animate-spin" aria-hidden /> {pasos.length ? "Sigue trabajando…" : "Llamando al agente…"}
        </li>
      )}
    </ol>
  )
}

/** Las herramientas que tiene el agente: lo único con lo que puede tocar los datos. */
export function HerramientasDelAgente({ herramientas, entrega }: { herramientas: Herramienta[]; entrega: string }) {
  return (
    <ul className="flex flex-col gap-1.5 text-sm">
      {herramientas.map((h) => (
        <li key={h.definicion.name} className="flex flex-wrap gap-x-2">
          <span className={cn("dato", h.definicion.name === entrega && "font-medium")}>{h.definicion.name}</span>
          <span className="text-grafito">{h.definicion.description}</span>
        </li>
      ))}
    </ul>
  )
}

/** El recorrido de una corrida guardada, plegado. */
export function ComoLoHizo({ corrida, entrega, titulo = "Cómo lo hizo" }: { corrida: Corrida; entrega: string; titulo?: string }) {
  return (
    <details className="mt-4 border-t border-linea pt-3">
      <summary className="cursor-pointer text-sm font-medium underline-offset-4 hover:underline">
        {titulo} · {corrida.pasos.length} pasos
      </summary>
      <div className="mt-3">
        <Traza pasos={corrida.pasos} entrega={entrega} />
      </div>
    </details>
  )
}
