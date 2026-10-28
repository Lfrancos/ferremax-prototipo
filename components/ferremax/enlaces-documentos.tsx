"use client"

import Link from "next/link"
import { FileTextIcon, ReceiptTextIcon } from "lucide-react"
import { facturaDe, hrefFactura, hrefRemision } from "@/lib/documentos"
import { remisionDe } from "@/lib/evidencia"
import { usePrototipo } from "@/lib/store"
import type { Pedido } from "@/lib/tipos"
import { cn } from "@/lib/utils"
import { aprobacion } from "@/lib/vistas"

const BASE = "inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1 text-sm font-medium whitespace-nowrap"

/** Los documentos de un pedido: su remisión y su factura, con un enlace a la historia de cada una. */
export function EnlacesDocumentos({ pedido, className }: { pedido: Pedido; className?: string }) {
  const { cartera } = usePrototipo()
  const factura = facturaDe(pedido.id_pedido, cartera)
  const hayRemision = !!aprobacion(pedido)

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {hayRemision ? (
        <Link href={hrefRemision(pedido.id_pedido)} className={cn(BASE, "border-tinta hover:bg-niebla")}>
          <FileTextIcon className="size-4" />
          Remisión <span className="font-mono font-normal">{remisionDe(pedido.id_pedido)}</span>
        </Link>
      ) : (
        <span className={cn(BASE, "border-dashed border-linea font-normal text-grafito")} title="La remisión sale de SAP cuando se aprueba el crédito.">
          <FileTextIcon className="size-4" />
          Remisión · sale al aprobar
        </span>
      )}
      {factura ? (
        <Link href={hrefFactura(factura.documento)} className={cn(BASE, "border-tinta hover:bg-niebla")}>
          <ReceiptTextIcon className="size-4" />
          Factura <span className="font-mono font-normal">{factura.documento}</span>
        </Link>
      ) : (
        <span className={cn(BASE, "border-dashed border-linea font-normal text-grafito")} title="El corte de cartera todavía no trae una factura de este pedido.">
          <ReceiptTextIcon className="size-4" />
          Factura · todavía no hay
        </span>
      )}
    </div>
  )
}
