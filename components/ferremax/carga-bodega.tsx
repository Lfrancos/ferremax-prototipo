"use client"

import { CAPACIDAD_BODEGA } from "@/lib/data"
import { fmtNumero } from "@/lib/formato"
import { usePrototipo } from "@/lib/store"
import { cn } from "@/lib/utils"
import { cargaBodega } from "@/lib/vistas"
import { PorDefinir } from "./piezas"

/** Cuánto trabajo hay en la fila de bodega contra lo que alcanza a sacar en un día. Es un dato, no una regla. */
export function CargaBodega({ compacta = false }: { compacta?: boolean }) {
  const { pedidos } = usePrototipo()
  const cap = CAPACIDAD_BODEGA.pedidos_por_dia
  const c = cargaBodega(pedidos, cap)
  const fraccion = Math.min(c.enFila / cap, 1)
  const fraccionTodo = Math.min((c.enFila + c.porAprobar) / cap, 1)

  return (
    <div className={cn("flex flex-col gap-3", !compacta && "text-[15px]")}>
      <div className="flex items-center gap-2">
        <span className="rounded-full border border-linea px-2 py-0.5 text-xs font-medium">Dato, no regla</span>
        <span className="text-xs text-muted-foreground">Capacidad: {cap} pedidos por día</span>
      </div>
      <div>
        <div className="flex items-baseline justify-between gap-3">
          <span>En la fila de bodega</span>
          <span className="font-mono">
            {c.enFila} pedidos · {c.lineasEnFila} líneas
          </span>
        </div>
        <div className="relative mt-1.5 h-3 w-full bg-niebla" aria-hidden>
          <div className="absolute inset-y-0 left-0 bg-grafito/40" style={{ width: `${fraccionTodo * 100}%` }} />
          <div className="absolute inset-y-0 left-0 bg-tinta" style={{ width: `${fraccion * 100}%` }} />
        </div>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {fmtNumero(c.diasDeTrabajo)} días de trabajo hoy. Si se aprueba lo que está por aprobar ({c.porAprobar}), sube a{" "}
          {fmtNumero(c.diasSiSeApruebaTodo)} días. La barra llena es un día de bodega.
        </p>
      </div>
      {!compacta && (
        <p className="text-xs text-muted-foreground">
          {CAPACIDAD_BODEGA.nota} Fuente: {CAPACIDAD_BODEGA.fuente}. La capacidad no está en ninguna regla escrita <PorDefinir />.
        </p>
      )}
    </div>
  )
}
