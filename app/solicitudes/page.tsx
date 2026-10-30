"use client"

import { CrearSolicitud } from "@/components/ferremax/crear-solicitud"
import { ImportarSAP } from "@/components/ferremax/importar-sap"
import { Titulo } from "@/components/ferremax/piezas"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CREAR_SOLICITUD } from "@/lib/rules"
import { usePrototipo } from "@/lib/store"

// Antes del momento 1: por dónde entra la solicitud. Dos opciones para discutir;
// en las dos, la regla del momento 1 (CRED-1.1) dice quién aprueba apenas entra.

export default function Solicitudes() {
  const { rol } = usePrototipo()
  return (
    <>
      <Titulo
        indice="(000) Cargar pedidos"
        titulo="Los pedidos entran por un archivo"
        bajada="Aquí se sube un archivo CSV (el que sale de SAP o de Excel). Cada fila es un pedido por aprobar: apenas entra, la regla del momento 1 dice quién aprueba, arranca el reloj y se le avisa por WhatsApp. Crear un pedido a mano queda como alternativa a discutir."
      />
      {/* key={rol}: al cambiar de rol se abre la pestaña de ese rol */}
      <Tabs key={rol} defaultValue={CREAR_SOLICITUD.fn(rol) ? "crear" : "importar"} className="gap-6">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="importar" className="px-4 py-2 text-[15px]">
            Subir un archivo CSV
          </TabsTrigger>
          <TabsTrigger value="crear" className="px-4 py-2 text-[15px]">
            Crear un pedido a mano
          </TabsTrigger>
        </TabsList>
        <TabsContent value="importar">
          <p className="mb-6 max-w-3xl text-[15px] text-muted-foreground">
            SAP sigue siendo la puerta de entrada: el vendedor registra el pedido allá, como hoy. La herramienta recibe un archivo
            diario y solo cuida la aprobación, la bodega y la revisión del lunes.
          </p>
          <ImportarSAP />
        </TabsContent>
        <TabsContent value="crear">
          <p className="mb-6 max-w-3xl text-[15px] text-muted-foreground">
            La solicitud nace aquí. El vendedor la crea y, en el mismo momento, ve quién la aprueba, qué fecha de salida puede
            prometer y cómo está la bodega.
          </p>
          <CrearSolicitud />
        </TabsContent>
      </Tabs>
    </>
  )
}
