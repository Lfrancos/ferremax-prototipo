"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { usePrototipo } from "@/lib/store"
import { cn } from "@/lib/utils"
import { tramoDe } from "@/lib/vistas"

// LOS CUATRO PASOS DEL PEDIDO. Los mismos nombres del menú: Cargar pedidos, Aprobar, Bodega, Transporte.
// Entre un paso y el siguiente hay una conexión que no es un paso: el aviso por WhatsApp y el paso a SAP.
// Se muestra arriba de cada paso y del tablero, con lo que hay en este momento en cada uno.

export type Paso = 1 | 2 | 3 | 4

export const PASOS: { n: Paso; nombre: string; href: string }[] = [
  { n: 1, nombre: "Cargar pedidos", href: "/solicitudes" },
  { n: 2, nombre: "Aprobar", href: "/aprobar" },
  { n: 3, nombre: "Bodega", href: "/bodega" },
  { n: 4, nombre: "Transporte", href: "/transporte" },
]

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`

export function PasosPedido({ paso }: { paso?: Paso }) {
  const { base, pedidos, porExportar } = usePrototipo()
  const en = (t: ReturnType<typeof tramoDe>) => pedidos.filter((p) => tramoDe(p) === t).length
  const ultima = base.cargas.at(-1)

  const detalle: Record<Paso, { que: string; quien: string; dato: string; luego?: string }> = {
    1: { que: "Se suben los 3 archivos de SAP", quien: "Marcela o Sandra", dato: ultima ? `Última carga: ${ultima.id}` : "Nada cargado", luego: "avisa por WhatsApp a quien aprueba" },
    2: {
      que: "Se aprueba o se rechaza",
      quien: "Andrés, Marcela o Sandra",
      dato: `${en("aprobar")} por aprobar · ${porExportar.length} por pasar a SAP`,
      luego: "se pasa a SAP con un archivo",
    },
    3: { que: "Se alista y sale de bodega", quien: "Nelson", dato: plural(en("bodega"), "pedido", "pedidos") },
    4: { que: "Llega a la obra con el documento firmado", quien: "Transportadora, Nelson y Marcela", dato: `${en("camino")} en camino` },
  }

  return (
    <nav aria-label="Los pasos del pedido" className="mb-8">
      <ol className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {PASOS.map((p, i) => {
          const activo = p.n === paso
          const d = detalle[p.n]
          return (
            <li key={p.n} className="relative">
              {i < PASOS.length - 1 && <ArrowRight aria-hidden className="absolute top-1/2 -right-[18px] z-10 hidden size-5 -translate-y-1/2 bg-background text-grafito xl:block" />}
              <Link
                href={p.href}
                aria-current={activo ? "step" : undefined}
                className={cn(
                  "flex h-full flex-col gap-1 border p-4 transition-colors",
                  activo ? "border-black bg-black text-white dark:border-amarillo/60" : "border-linea bg-card hover:bg-muted",
                )}
              >
                <span className="text-[17px] leading-snug font-medium">
                  {p.n} · {p.nombre}
                </span>
                <span className="text-sm">{d.que}</span>
                <span className={cn("text-sm", activo ? "text-white/70" : "text-grafito")}>{d.quien}</span>
                <span className={cn("mt-auto pt-2 font-mono text-sm", activo && "text-amarillo")}>{d.dato}</span>
                {d.luego && <span className={cn("border-t pt-2 text-xs", activo ? "border-white/20 text-white/70" : "border-linea text-grafito")}>Luego: {d.luego}</span>}
              </Link>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
