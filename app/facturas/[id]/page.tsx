import { Suspense } from "react"
import { PARTIDAS_INICIALES } from "@/lib/data"
import { VistaFactura } from "./vista-factura"

export function generateStaticParams() {
  return PARTIDAS_INICIALES.filter((p) => p.tipo === "Factura").map((p) => ({ id: p.documento }))
}

// Una factura que llega en un corte de cartera nuevo no existe al compilar: su número se lee dentro de Suspense.
async function Factura({ params }: { params: PageProps<"/facturas/[id]">["params"] }) {
  const { id } = await params
  return <VistaFactura id={decodeURIComponent(id)} />
}

export default function Page({ params }: PageProps<"/facturas/[id]">) {
  return (
    <Suspense fallback={null}>
      <Factura params={params} />
    </Suspense>
  )
}
