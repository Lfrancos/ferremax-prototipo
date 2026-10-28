"use client"

import { useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { leerMensaje, remisionDe } from "@/lib/evidencia"
import { fmtFechaHora } from "@/lib/fechas"
import { ENTREGAR_A_TRANSPORTE } from "@/lib/rules"
import { usePrototipo } from "@/lib/store"
import type { MensajeTransporte } from "@/lib/tipos"
import { cn } from "@/lib/utils"
import { esperanEvidencia } from "@/lib/vistas"
import { FotoDelDocumento, FotoDelProducto } from "./foto"
import { Insignia } from "./insignia"

type Marca = "ok" | "mal" | "nada"

function Fila({ marca, rotulo, children }: { marca: Marca; rotulo: string; children: React.ReactNode }) {
  const glifo = marca === "ok" ? "✓" : marca === "mal" ? "✕" : "…"
  return (
    <li className="flex items-baseline gap-2 py-1.5 text-sm">
      <span
        aria-hidden
        className={cn("w-4 shrink-0 font-mono", marca === "ok" && "text-aprobado", marca === "mal" && "text-vencido", marca === "nada" && "text-grafito")}
      >
        {glifo}
      </span>
      <span className="w-24 shrink-0 text-grafito">{rotulo}</span>
      <span className="flex-1">{children}</span>
    </li>
  )
}

/** Lo que leyó Claude de un mensaje. Es una propuesta: no decide nada ni cambia el estado del pedido. */
export function LecturaDeClaude({ mensaje, remisionEsperada }: { mensaje: MensajeTransporte; remisionEsperada?: string }) {
  const l = leerMensaje(mensaje)
  return (
    <div className="border-2 border-dashed border-grafito p-3">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <span className="etiqueta">Lo que leyó Claude</span>
        <Insignia tipo="propuesta" />
      </div>
      <ul className="divide-y divide-linea">
        <Fila marca={l.producto === "si" ? "ok" : "mal"} rotulo="Producto">
          {l.producto === "si"
            ? `${mensaje.producto!.bultos} bultos a la vista`
            : l.producto === "borrosa"
              ? "La foto sale borrosa"
              : "No hay foto del producto"}
        </Fila>
        <Fila marca={l.documento === "si" ? "ok" : "mal"} rotulo="Documento">
          {l.documento === "si" ? "Se lee bien" : l.documento === "borrosa" ? "Sale borroso: no se lee" : "No hay foto del documento"}
        </Fila>
        {l.documento === "si" && (
          <>
            <Fila marca={l.remision === null ? "mal" : !remisionEsperada || l.remision === remisionEsperada ? "ok" : "mal"} rotulo="Remisión">
              {l.remision === null ? (
                "No se ve el número"
              ) : (
                <>
                  <span className="dato">{l.remision}</span>
                  {remisionEsperada && l.remision !== remisionEsperada && <span className="text-vencido"> · no es la de este pedido</span>}
                </>
              )}
            </Fila>
            <Fila marca={l.nombre ? "ok" : "mal"} rotulo="Quien recibe">
              {l.nombre ?? "No aparece el nombre"}
            </Fila>
            <Fila marca={l.firma ? "ok" : "mal"} rotulo="Firma">
              {l.firma ? "Sí" : "No hay firma"}
            </Fila>
            <Fila marca={l.novedad ? "mal" : "nada"} rotulo="Novedad">
              {l.novedad ? `Escribió: "${l.novedad}"` : "Ninguna"}
            </Fila>
          </>
        )}
      </ul>
      <p className="mt-2 text-xs text-grafito">
        Texto de muestra armado con plantillas sobre la misma descripción de la foto. En la versión real lo lee Claude.
      </p>
    </div>
  )
}

/** A qué pedido se asoció un mensaje del chat. Si no se pudo, Nelson o Marcela lo eligen. */
function Asociacion({ mensaje }: { mensaje: MensajeTransporte }) {
  const { pedidos, rol, asociarMensaje } = usePrototipo()
  const [elegido, setElegido] = useState<string>("")
  const puede = ENTREGAR_A_TRANSPORTE.fn(rol).atender

  if (mensaje.id_pedido)
    return (
      <p className="text-sm">
        <span className="text-grafito">Asociado a </span>
        <Link href={`/pedidos/${mensaje.id_pedido}`} className="dato underline underline-offset-4">
          {mensaje.id_pedido}
        </Link>
        {mensaje.canal === "Enlace" && <span className="text-grafito"> · el enlace ya es de ese pedido</span>}
      </p>
    )

  const candidatos = esperanEvidencia(pedidos)

  return (
    <div className="flex flex-col gap-2 bg-amarillo-suave p-3">
      <p className="text-sm font-medium">Sin pedido: no se pudo saber de cuál es.</p>
      <p className="text-sm text-grafito">
        No trae un número de remisión que se lea y el celular tiene más de un pedido, o no está en la lista de conductores.
      </p>
      {puede ? (
        <div className="flex flex-wrap items-center gap-2">
          <Select value={elegido} onValueChange={(v) => v && setElegido(v as string)}>
            <SelectTrigger className="w-72 bg-papel" aria-label="Pedido al que corresponde el mensaje">
              <SelectValue placeholder="Elige el pedido">
                {candidatos.find((p) => p.id_pedido === elegido) &&
                  `${elegido} · ${candidatos.find((p) => p.id_pedido === elegido)!.cliente}`}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {candidatos.map((p) => (
                <SelectItem key={p.id_pedido} value={p.id_pedido}>
                  {p.id_pedido} · {p.cliente} · {remisionDe(p.id_pedido)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            disabled={!elegido}
            onClick={() => {
              asociarMensaje(mensaje.id, elegido)
              toast.success(`Mensaje asociado a ${elegido}`, { description: "Quedó en su historial y se revisó la evidencia." })
            }}
          >
            Asociar
          </Button>
        </div>
      ) : (
        <p className="text-sm text-grafito">Lo asocia Nelson o Marcela. Tu rol ({rol}) solo lo ve.</p>
      )}
    </div>
  )
}

/** Un mensaje de la transportadora, tal como llegó, con sus fotos y lo que leyó Claude. */
export function MensajeTarjeta({ mensaje, compacto = false }: { mensaje: MensajeTransporte; compacto?: boolean }) {
  const esperada = mensaje.id_pedido ? remisionDe(mensaje.id_pedido) : undefined
  return (
    <article className="border border-linea bg-card">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-linea bg-muted/50 px-4 py-2 text-sm">
        <span className="dato">{mensaje.id}</span>
        <span className="rounded-full border border-linea px-2 py-0.5 text-xs font-medium">{mensaje.canal}</span>
        <span className="font-medium">{mensaje.de}</span>
        <span className="dato text-grafito">{mensaje.celular}</span>
        <span className="ml-auto text-grafito">{fmtFechaHora(mensaje.fecha)}</span>
      </header>
      <div className={cn("grid gap-4 p-4", !compacto && "lg:grid-cols-[1fr_20rem]")}>
        <div className="flex flex-col gap-3">
          <p className="w-fit max-w-md rounded-r-lg rounded-tl-lg bg-niebla px-3 py-2 text-[15px]">{mensaje.texto}</p>
          {(mensaje.producto || mensaje.documento) && (
            <div className="flex flex-wrap items-start gap-3">
              {mensaje.producto && (
                <figure className="w-44">
                  <FotoDelProducto foto={mensaje.producto} />
                  <figcaption className="mt-1 text-xs text-grafito">Foto 1 · producto</figcaption>
                </figure>
              )}
              {mensaje.documento && (
                <figure className="w-36">
                  <FotoDelDocumento foto={mensaje.documento} />
                  <figcaption className="mt-1 text-xs text-grafito">Foto {mensaje.producto ? 2 : 1} · documento</figcaption>
                </figure>
              )}
            </div>
          )}
          <Asociacion mensaje={mensaje} />
        </div>
        <LecturaDeClaude mensaje={mensaje} remisionEsperada={esperada} />
      </div>
    </article>
  )
}
