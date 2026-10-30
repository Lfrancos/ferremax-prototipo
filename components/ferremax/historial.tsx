"use client"

import { DE_CREDITO } from "@/lib/actividad"
import { fmtFechaHora } from "@/lib/fechas"
import { VER_INFO_CREDITO } from "@/lib/rules"
import { usePrototipo } from "@/lib/store"
import type { Pedido } from "@/lib/tipos"
import { cn } from "@/lib/utils"
import { NOMBRE_ACCION } from "@/lib/vistas"
import { Estado } from "./estado"
import { Insignia } from "./insignia"

/** Historial de actividad: quién hizo qué y cuándo. Los eventos del Sistema son reglas. */
export function HistorialPedido({ pedido, horizontal = false }: { pedido: Pedido; horizontal?: boolean }) {
  const { rol } = usePrototipo()
  const verInfo = VER_INFO_CREDITO.fn(rol)

  return (
    <ol
      className={cn(
        "relative",
        horizontal ? "grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-4" : "flex flex-col gap-4 border-l border-linea pl-5",
      )}
    >
      {pedido.eventos.map((e, i) => (
        <li key={i} className={cn("relative", horizontal && "border-l-2 border-tinta pl-3")}>
          {!horizontal && <span className="absolute top-1.5 -left-[25px] size-2.5 bg-tinta" aria-hidden />}
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{NOMBRE_ACCION[e.accion]}</span>
            {e.accion === "rechazado" && <Estado clase="rechazado" palabra="Rechazado" />}
            <Insignia tipo={e.quien === "Sistema" ? "regla" : "humano"} />
          </div>
          <p className="text-sm text-muted-foreground">
            {fmtFechaHora(e.fecha)} · {e.quien}
            {e.via && ` · por ${e.via}`}
          </p>
          {e.motivo &&
            (verInfo || !DE_CREDITO.has(e.accion) ? (
              <p className="mt-1 text-sm">{e.motivo}</p>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground italic">Motivo de crédito, oculto para tu rol (PER-1).</p>
            ))}
        </li>
      ))}
    </ol>
  )
}
