import { cn } from "@/lib/utils"
import type { Reloj } from "@/lib/vistas"

// Componente Estado del Sistema de diseño: siempre glifo y palabra.
// Rechazado va en tinta: es una decisión, no una alarma.

export type ClaseEtiqueta = "en-plazo" | "aviso" | "vencido" | "aprobado" | "rechazado" | "incompleta" | "fuera-regla"

const ESTILO: Record<ClaseEtiqueta, { glifo: string; clase: string }> = {
  "en-plazo": { glifo: "○", clase: "border-linea text-tinta" },
  aviso: { glifo: "◔", clase: "border-transparent bg-aviso-fondo text-aviso" },
  vencido: { glifo: "!", clase: "border-transparent bg-vencido-fondo text-vencido" },
  aprobado: { glifo: "✓", clase: "border-transparent bg-aprobado-fondo text-aprobado" },
  rechazado: { glifo: "✕", clase: "border-tinta text-tinta" },
  incompleta: { glifo: "…", clase: "border-dashed border-grafito text-grafito" },
  "fuera-regla": { glifo: "≠", clase: "border-transparent bg-vencido-fondo text-vencido" },
}

export function Estado({ clase, palabra, className }: { clase: ClaseEtiqueta; palabra: string; className?: string }) {
  const e = ESTILO[clase]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-sm font-medium whitespace-nowrap",
        e.clase,
        className,
      )}
    >
      <span aria-hidden className="font-mono">
        {e.glifo}
      </span>
      {palabra}
    </span>
  )
}

const BARRA: Record<Reloj["clase"], string> = {
  "en-plazo": "bg-tinta",
  aviso: "bg-aviso",
  vencido: "bg-vencido",
}

/** Semáforo: estado más avance contra el tope. */
export function Semaforo({ reloj }: { reloj: Reloj }) {
  return (
    <div className="flex w-36 flex-col gap-1">
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
        <Estado clase={reloj.clase} palabra={reloj.palabra} />
        <span className="dato text-xs text-grafito">
          {reloj.actual} / {reloj.tope}
        </span>
      </div>
      <div className="h-1.5 w-full bg-niebla" aria-hidden>
        <div className={cn("h-full", BARRA[reloj.clase])} style={{ width: `${Math.min(reloj.fraccion, 1) * 100}%` }} />
      </div>
    </div>
  )
}
