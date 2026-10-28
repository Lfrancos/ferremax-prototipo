"use client"

import Link from "next/link"
import { Estado } from "@/components/ferremax/estado"
import { LineaDeTiempo } from "@/components/ferremax/hitos"
import { HojaFactura } from "@/components/ferremax/hojas"
import { Bloque, PorDefinir, Titulo } from "@/components/ferremax/piezas"
import { trazaFactura } from "@/lib/documentos"
import { fmtDia } from "@/lib/fechas"
import { IMPORTAR_CARTERA, SALDO_PENDIENTE, VER_INFO_CREDITO } from "@/lib/rules"
import { usePrototipo } from "@/lib/store"

export function VistaFactura({ id }: { id: string }) {
  const { pedidos, clientes, cartera, rol } = usePrototipo()
  const f = cartera.partidas.find((p) => p.tipo === "Factura" && p.documento === id)
  if (!f)
    return (
      <p className="subtitulo">
        La factura {id} no está en el corte de cartera {cartera.archivo}.{" "}
        <Link href="/cartera" className="underline">
          Ver la cartera
        </Link>
      </p>
    )
  const cliente = clientes.find((c) => c.id_cliente === f.id_cliente)
  const pedido = f.id_pedido ? (pedidos.find((p) => p.id_pedido === f.id_pedido) ?? null) : null
  const verValores = VER_INFO_CREDITO.fn(rol)
  const abierta = f.saldo_abierto_cop === null || f.saldo_abierto_cop > 0

  return (
    <>
      <Titulo
        indice="(010) Factura"
        titulo={id}
        bajada={
          <>
            {cliente?.razon_social ?? f.id_cliente} · emitida el {fmtDia(f.fecha_documento)}
            {pedido && (
              <>
                {" "}
                · pedido{" "}
                <Link href={`/pedidos/${pedido.id_pedido}`} className="font-mono underline underline-offset-4">
                  {pedido.id_pedido}
                </Link>
              </>
            )}
          </>
        }
      >
        <Estado clase={abierta ? "aviso" : "aprobado"} palabra={abierta ? "Abierta en cartera" : "Pagada"} />
      </Titulo>

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <HojaFactura factura={f} cliente={cliente} pedido={pedido} verValores={verValores} />

        <div className="flex flex-col gap-6">
          <Bloque titulo="Qué pasó con esta factura" tipos={["regla", "humano"]} reglas={[IMPORTAR_CARTERA.id, SALDO_PENDIENTE.id]}>
            <LineaDeTiempo hitos={trazaFactura(f, pedido, cartera)} />
          </Bloque>

          <Bloque titulo="Cómo funciona" tipos={["propuesta"]}>
            <dl className="grid gap-3 text-[15px]">
              <div>
                <dt className="etiqueta text-grafito">Quién la crea</dt>
                <dd>Se emite desde SAP, con el pedido y su remisión. Aquí figura Sandra Beltrán como quien la emite.</dd>
              </div>
              <div>
                <dt className="etiqueta text-grafito">Quién la sube</dt>
                <dd>Nadie. La app no recibe facturas: se entera de ellas por el corte de partidas abiertas que Sandra importa cada mañana.</dd>
              </div>
              <div>
                <dt className="etiqueta text-grafito">Quién la firma</dt>
                <dd>No la firma una persona: SAP la firma con el certificado digital de Ferremax y la DIAN la valida. El cliente responde con un acuse de recibo.</dd>
              </div>
              <div>
                <dt className="etiqueta text-grafito">Para discutir</dt>
                <dd>
                  Cuándo se factura (hoy se ve el día de la entrega), si se factura el pedido completo o solo lo despachado, y qué hace la app si hay una
                  alerta de entrega abierta <PorDefinir />.
                </dd>
              </div>
            </dl>
          </Bloque>
        </div>
      </div>
    </>
  )
}
