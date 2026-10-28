"use client"

import { cn } from "@/lib/utils"
import type { TipoInsignia } from "@/lib/flujo"
import { reglaPorId } from "@/lib/rules"
import { usePrototipo } from "@/lib/store"

// Insignia del tipo de cada elemento: Regla, IA, Humano o Propuesta IA.
// Se distinguen por relleno, borde y glifo, nunca por color de estado.

export const INSIGNIAS: Record<TipoInsignia, { palabra: string; glifo: string; clase: string; explica: string }> = {
  regla: {
    palabra: "Regla",
    glifo: "■",
    clase: "border-tinta bg-tinta text-papel",
    explica: "Determinista: siempre da el mismo resultado y muestra el porqué. Haz clic para leerla.",
  },
  ia: {
    palabra: "IA",
    glifo: "◆",
    clase: "border-niebla bg-niebla text-tinta",
    explica: "Claude interpreta, resume o redacta. Nunca decide.",
  },
  humano: {
    palabra: "Humano",
    glifo: "●",
    clase: "border-tinta bg-transparent text-tinta",
    explica: "Decide y firma.",
  },
  propuesta: {
    palabra: "Propuesta IA",
    glifo: "◇",
    clase: "border-dashed border-grafito bg-transparent text-grafito",
    explica: "Idea aún no decidida, para discutir con los mentores.",
  },
}

const BASE = "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap"

export function Insignia({ tipo, className }: { tipo: TipoInsignia; className?: string }) {
  const i = INSIGNIAS[tipo]
  return (
    <span title={i.explica} className={cn(BASE, i.clase, className)}>
      <span aria-hidden>{i.glifo}</span>
      {i.palabra}
    </span>
  )
}

/** Insignia "Regla" que abre la regla en un diálogo. */
export function ReglaBoton({ id, className, soloId = false }: { id: string; className?: string; soloId?: boolean }) {
  const { abrirRegla } = usePrototipo()
  const r = reglaPorId(id)
  if (!r) return null
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        abrirRegla(id)
      }}
      title={`${r.titulo} · clic para leer la regla`}
      className={cn(BASE, INSIGNIAS.regla.clase, "cursor-pointer hover:opacity-80 focus-visible:outline-2", className)}
    >
      <span aria-hidden>■</span>
      {soloId ? id : <>Regla <span className="font-mono font-normal opacity-80">{id}</span></>}
    </button>
  )
}

export function Leyenda() {
  return (
    <aside aria-label="Leyenda de insignias" className="sticky bottom-0 z-30 mt-auto border-t border-linea bg-superficie/95 backdrop-blur">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 px-4 py-2 text-xs text-grafito lg:px-6">
        <span className="etiqueta text-tinta">Leyenda</span>
        {(Object.keys(INSIGNIAS) as TipoInsignia[]).map((t) => (
          <span key={t} className="flex items-center gap-2">
            <Insignia tipo={t} />
            <span className="hidden xl:inline">{INSIGNIAS[t].explica}</span>
          </span>
        ))}
      </div>
    </aside>
  )
}
