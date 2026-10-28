import { fmtDuracion } from "@/lib/formato"
import { A_TIEMPO } from "@/lib/rules"
import type { Pedido } from "@/lib/tipos"
import { cn } from "@/lib/utils"
import { estadoActual, tiempoTotal } from "@/lib/vistas"

/**
 * Cuánto lleva el pedido de punta a punta, además del reloj de su tramo.
 * La cifra corre desde la solicitud hasta hoy (o hasta que terminó). Debajo, lo que mide el proyecto:
 * los días de la solicitud a la salida de bodega contra la meta de PRY-1.
 */
export function TiempoTotalPedido({ pedido, className }: { pedido: Pedido; className?: string }) {
  const t = tiempoTotal(pedido)
  const meta = A_TIEMPO.valores!.dias
  const rechazado = estadoActual(pedido) === "rechazado"
  const linea = rechazado
    ? "Se cerró con el rechazo"
    : t.salio
      ? `Salió de bodega al día ${t.diasHastaSalida} de ${meta}`
      : `Día ${t.diasHastaSalida} de ${meta} para salir de bodega`

  return (
    <div className={className}>
      <p className="whitespace-nowrap">
        <span className="font-mono text-[15px] font-medium">{fmtDuracion(t.horas)}</span>{" "}
        <span className="text-xs text-muted-foreground">{rechazado ? "hasta el rechazo" : t.terminado ? "hasta la entrega" : "hasta hoy"}</span>
      </p>
      <p className={cn("text-xs whitespace-nowrap text-muted-foreground", !rechazado && t.pasaDeLaMeta && "font-medium text-vencido")}>
        {linea}
        {!rechazado && t.pasaDeLaMeta && " · pasa de la meta"}
      </p>
    </div>
  )
}
