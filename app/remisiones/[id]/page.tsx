import { Suspense } from "react"
import { PEDIDOS } from "@/lib/data"
import { remisionDe } from "@/lib/evidencia"
import { VistaRemision } from "./vista-remision"

export function generateStaticParams() {
  return PEDIDOS.map((p) => ({ id: remisionDe(p.id_pedido) }))
}

// Las solicitudes creadas en la demo no existen al compilar: su número se lee dentro de Suspense.
async function Remision({ params }: { params: PageProps<"/remisiones/[id]">["params"] }) {
  const { id } = await params
  return <VistaRemision id={decodeURIComponent(id)} />
}

export default function Page({ params }: PageProps<"/remisiones/[id]">) {
  return (
    <Suspense fallback={null}>
      <Remision params={params} />
    </Suspense>
  )
}
