"use client"

import { usePathname } from "next/navigation"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { HOY } from "@/lib/data"
import { fmtFechaHora } from "@/lib/fechas"

const TITULOS: [string, string][] = [
  ["/como-funciona", "Cómo funciona"],
  ["/solicitudes", "1 · Cargar pedidos"],
  ["/clientes", "Clientes"],
  ["/cartera", "Informe de cartera"],
  ["/pedidos", "Ficha del pedido"],
  ["/bodega", "3 · Bodega"],
  ["/transporte", "4 · Transporte"],
  ["/remisiones", "Remisión"],
  ["/facturas", "Factura"],
  ["/aprobar", "2 · Aprobar"],
  ["/alertas", "Alertas"],
  ["/avisos", "Avisos por WhatsApp"],
  ["/revision", "Revisión del lunes"],
  ["/actividad", "Registro de actividad"],
  ["/reglas", "Reglas"],
]

export function SiteHeader() {
  const ruta = usePathname()
  const titulo = TITULOS.find(([r]) => ruta.startsWith(r))?.[1] ?? "Tablero de pedidos"
  return (
    <header className="sticky top-0 z-30 flex h-(--header-height) shrink-0 items-center gap-2 border-b bg-background transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mx-2 h-4 data-vertical:self-auto" />
        <h1 className="text-base font-medium">{titulo}</h1>
        <p className="ml-auto hidden text-sm text-muted-foreground md:block">
          Prototipo · datos ficticios · Hoy, fijo: {fmtFechaHora(HOY)}
        </p>
      </div>
    </header>
  )
}
