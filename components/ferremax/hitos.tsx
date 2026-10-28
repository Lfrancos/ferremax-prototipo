import { fmtDia, fmtFechaHora } from "@/lib/fechas"
import type { Actor, HitoDocumento } from "@/lib/tipos"
import { cn } from "@/lib/utils"

const ACTOR: Record<Actor, { palabra: string; clase: string }> = {
  SAP: { palabra: "SAP", clase: "border-tinta text-tinta" },
  Sistema: { palabra: "Regla", clase: "border-tinta bg-tinta text-papel" },
  Persona: { palabra: "Persona", clase: "border-tinta text-tinta" },
  Transportadora: { palabra: "Transportadora", clase: "border-linea text-grafito" },
  Cliente: { palabra: "Cliente", clase: "border-linea text-grafito" },
  DIAN: { palabra: "DIAN", clase: "border-linea text-grafito" },
  Claude: { palabra: "Propuesta IA", clase: "border-dashed border-grafito text-grafito" },
}

const GLIFO: Record<HitoDocumento["estado"], { glifo: string; clase: string }> = {
  hecho: { glifo: "✓", clase: "border-aprobado bg-aprobado-fondo text-aprobado" },
  pendiente: { glifo: "…", clase: "border-dashed border-grafito bg-superficie text-grafito" },
  alerta: { glifo: "!", clase: "border-vencido bg-vencido-fondo text-vencido" },
}

function cuando(h: HitoDocumento) {
  if (!h.fecha) return h.estado === "pendiente" ? "Todavía no pasa" : "La hora no queda registrada"
  return h.fecha.endsWith("T00:00") ? `${fmtDia(h.fecha)} · solo se conoce el día` : fmtFechaHora(h.fecha)
}

/** Qué pasó con un documento, en orden: cuándo, quién lo hizo y qué quedó. */
export function LineaDeTiempo({ hitos }: { hitos: HitoDocumento[] }) {
  return (
    <ol className="flex flex-col">
      {hitos.map((h, i) => {
        const g = GLIFO[h.estado]
        const a = ACTOR[h.actor]
        return (
          <li key={`${h.que}-${i}`} className="relative flex gap-3 pb-5 last:pb-0">
            {i < hitos.length - 1 && <span aria-hidden className="absolute top-7 bottom-0 left-[13px] w-px bg-linea" />}
            <span
              aria-hidden
              className={cn("z-10 flex size-7 shrink-0 items-center justify-center rounded-full border font-mono text-sm", g.clase)}
            >
              {g.glifo}
            </span>
            <div className="min-w-0 flex-1">
              <p className={cn("font-medium", h.estado === "pendiente" && "text-grafito")}>{h.que}</p>
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-grafito">
                <span>{cuando(h)}</span>
                <span aria-hidden>·</span>
                <span>{h.quien}</span>
                <span className={cn("rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap", a.clase)}>{a.palabra}</span>
              </p>
              {h.detalle && <p className="mt-1 text-[15px]">{h.detalle}</p>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
