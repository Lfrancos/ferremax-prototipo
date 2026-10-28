import { Suspense } from "react"
import { PEDIDOS } from "@/lib/data"
import { FichaPedido } from "./ficha-pedido"

export function generateStaticParams() {
  return PEDIDOS.map((p) => ({ id: p.id_pedido }))
}

// Las solicitudes importadas o creadas en la demo no existen al compilar:
// su id se lee dentro de Suspense, como pide Next para datos de la URL.
async function Ficha({ params }: { params: PageProps<"/pedidos/[id]">["params"] }) {
  const { id } = await params
  return <FichaPedido id={decodeURIComponent(id)} />
}

export default function Page({ params }: PageProps<"/pedidos/[id]">) {
  return (
    <Suspense fallback={null}>
      <Ficha params={params} />
    </Suspense>
  )
}
