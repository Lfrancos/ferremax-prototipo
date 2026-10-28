"use client"

import Link from "next/link"
import { Estado } from "@/components/ferremax/estado"
import { HojaRemision } from "@/components/ferremax/hojas"
import { LineaDeTiempo } from "@/components/ferremax/hitos"
import { Bloque, PorDefinir, Titulo } from "@/components/ferremax/piezas"
import { FotoDelDocumento } from "@/components/ferremax/foto"
import { trazaRemision, pedidoDeRemision } from "@/lib/documentos"
import { fmtFechaHora } from "@/lib/fechas"
import { ENTREGAR_A_TRANSPORTE, EVIDENCIA_ENTREGA, REMISION_SIN_FIRMA } from "@/lib/rules"
import { usePrototipo } from "@/lib/store"
import { entregaDe } from "@/lib/vistas"

export function VistaRemision({ id }: { id: string }) {
  const { pedidos, clientes } = usePrototipo()
  const p = pedidoDeRemision(id, pedidos)
  if (!p)
    return (
      <p className="subtitulo">
        No hay una remisión {id} en los datos.{" "}
        <Link href="/" className="underline">
          Volver al tablero
        </Link>
      </p>
    )
  const e = entregaDe(p)
  const fotos = p.mensajes.filter((m) => m.documento)

  return (
    <>
      <Titulo
        indice="(009) Remisión"
        titulo={id}
        bajada={
          <>
            {p.cliente} · pedido{" "}
            <Link href={`/pedidos/${p.id_pedido}`} className="font-mono underline underline-offset-4">
              {p.id_pedido}
            </Link>
          </>
        }
      >
        {e ? <Estado clase={e.estado.clase} palabra={e.estado.palabra} /> : <Estado clase="en-plazo" palabra="Todavía en bodega" />}
      </Titulo>

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <div className="flex flex-col gap-6">
          <HojaRemision pedido={p} cliente={clientes.find((c) => c.id_cliente === p.id_cliente)} ev={e?.evidencia ?? null} />

          <Bloque
            titulo={`Fotos del documento firmado · ${fotos.length}`}
            tipos={["regla"]}
            reglas={[EVIDENCIA_ENTREGA.id]}
            pie="Estas son las fotos que subió el conductor. La hoja de arriba se completa con lo que se lee en ellas."
          >
            {fotos.length ? (
              <div className="flex flex-wrap gap-4">
                {fotos.map((m) => (
                  <figure key={m.id} className="w-40">
                    <FotoDelDocumento foto={m.documento!} />
                    <figcaption className="mt-1 text-xs text-grafito">
                      <span className="dato">{m.id}</span> · {m.de}
                      <br />
                      {m.canal} · {fmtFechaHora(m.fecha)}
                    </figcaption>
                  </figure>
                ))}
              </div>
            ) : (
              <p className="text-[15px] text-grafito">Todavía no ha llegado ninguna foto del documento.</p>
            )}
          </Bloque>
        </div>

        <div className="flex flex-col gap-6">
          <Bloque titulo="Qué pasó con esta remisión" tipos={["regla", "humano"]} reglas={[REMISION_SIN_FIRMA.id, ENTREGAR_A_TRANSPORTE.id]}>
            <LineaDeTiempo hitos={trazaRemision(p)} />
          </Bloque>

          <Bloque titulo="Cómo funciona" tipos={["propuesta"]}>
            <dl className="grid gap-3 text-[15px]">
              <div>
                <dt className="etiqueta text-grafito">Quién la crea</dt>
                <dd>Nadie a mano: SAP la genera cuando se aprueba el crédito. No necesita firma de cartera.</dd>
              </div>
              <div>
                <dt className="etiqueta text-grafito">Quién la sube</dt>
                <dd>
                  La remisión no se sube: ya está en SAP. Lo que se sube es la <strong className="font-medium">foto del documento firmado</strong>, y la sube
                  el conductor por el chat de WhatsApp o por su enlace.
                </dd>
              </div>
              <div>
                <dt className="etiqueta text-grafito">Quién la firma</dt>
                <dd>Quien recibe en la obra del cliente, con nombre y firma a mano. Ferremax no firma la remisión.</dd>
              </div>
              <div>
                <dt className="etiqueta text-grafito">Cuándo se firma</dt>
                <dd>En la obra, cuando entregan. La app no ve ese momento: solo sabe cuándo llegó la foto.</dd>
              </div>
              <div>
                <dt className="etiqueta text-grafito">Para discutir</dt>
                <dd>
                  Dónde se guarda la foto y cuánto tiempo, y quién puede verla <PorDefinir />.
                </dd>
              </div>
            </dl>
          </Bloque>
        </div>
      </div>
    </>
  )
}
