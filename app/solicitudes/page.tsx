"use client"

import { BaseDatos } from "@/components/ferremax/base-datos"
import { CargarArchivos } from "@/components/ferremax/cargar-archivos"
import { PasosPedido } from "@/components/ferremax/pasos"
import { CrearSolicitud } from "@/components/ferremax/crear-solicitud"
import { Titulo } from "@/components/ferremax/piezas"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CREAR_SOLICITUD } from "@/lib/rules"
import { usePrototipo } from "@/lib/store"

// Paso 1 · Cargar pedidos: se suben los tres archivos de SAP (clientes, pedidos, cartera), se revisan y se guardan en la base;
// los pedidos a crédito sin aprobar pasan al paso 2 (/aprobar), desde donde la decisión vuelve a SAP.
// En los dos caminos, la regla del momento 1 (CRED-1.1) dice quién aprueba apenas entra.

export default function Solicitudes() {
  const { rol } = usePrototipo()
  return (
    <>
      <Titulo
        indice="Paso 1 · Cargar pedidos"
        titulo="Cargar pedidos: los 3 archivos de SAP"
        bajada="Subes los archivos de clientes, pedidos y cartera. La app los revisa antes de guardar y te recomienda qué hacer con lo raro o repetido. Los pedidos a crédito sin aprobar pasan a 2 · Aprobar y a quien los aprueba le llega el aviso por WhatsApp."
      />
      <PasosPedido paso={1} />
      {/* key={rol}: al cambiar de rol se abre la pestaña de ese rol */}
      <Tabs key={rol} defaultValue={CREAR_SOLICITUD.fn(rol) ? "crear" : "subir"} className="gap-6">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="subir" className="px-4 py-2 text-[15px]">
            Subir los archivos CSV
          </TabsTrigger>
          <TabsTrigger value="base" className="px-4 py-2 text-[15px]">
            Lo que hay en la base
          </TabsTrigger>
          <TabsTrigger value="crear" className="px-4 py-2 text-[15px]">
            Crear un pedido a mano
          </TabsTrigger>
        </TabsList>
        <TabsContent value="subir">
          <CargarArchivos />
        </TabsContent>
        <TabsContent value="base">
          <BaseDatos />
        </TabsContent>
        <TabsContent value="crear">
          <p className="mb-6 max-w-3xl text-[15px] text-muted-foreground">
            Alternativa a discutir: la solicitud nace en la app y no en SAP. El vendedor la crea y, en el mismo momento, ve quién la aprueba, qué
            fecha de salida puede prometer y cómo está la bodega.
          </p>
          <CrearSolicitud />
        </TabsContent>
      </Tabs>
    </>
  )
}
