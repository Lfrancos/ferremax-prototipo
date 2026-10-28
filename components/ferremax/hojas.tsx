import Link from "next/link"
import { hrefRemision } from "@/lib/documentos"
import { remisionDe } from "@/lib/evidencia"
import { fmtDia } from "@/lib/fechas"
import { fmtCOP } from "@/lib/formato"
import { lineasDe } from "@/lib/lineas"
import type { Cliente, EvidenciaCombinada, PartidaAbierta, Pedido } from "@/lib/tipos"
import { cn } from "@/lib/utils"
import { aprobacion } from "@/lib/vistas"

// Cómo se vería cada documento. Son hojas de muestra, con colores fijos: un documento impreso no cambia con el tema.

const LETRA_A_MANO = '"Segoe Script", "Brush Script MT", "Bradley Hand", cursive'
const HOJA = "border border-linea bg-[#fdfcf8] p-6 font-sans text-[#141413] shadow-sm"

function Campo({ rotulo, children, className }: { rotulo: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <p className="text-[11px] tracking-wide text-[#5c5b55] uppercase">{rotulo}</p>
      <p className="text-[15px]">{children}</p>
    </div>
  )
}

/** La remisión que viaja con el pedido. Lo que firma quien recibe sale de lo que leyó Claude en las fotos. */
export function HojaRemision({ pedido, cliente, ev }: { pedido: Pedido; cliente?: Cliente; ev: EvidenciaCombinada | null }) {
  const items = lineasDe(pedido)
  const d = pedido.despacho
  const emitida = aprobacion(pedido)?.fecha
  const firmada = !!ev && ev.documento === "si" && ev.firma
  return (
    <div className={HOJA}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-[#141413] pb-3">
        <div>
          <p className="text-lg font-bold">FERREMAX S.A.S.</p>
          <p className="text-sm text-[#5c5b55]">Remisión de entrega</p>
        </div>
        <p className="font-mono text-lg font-bold">{remisionDe(pedido.id_pedido)}</p>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Campo rotulo="Cliente">
          {pedido.cliente}
          {cliente && (
            <span className="block text-sm text-[#5c5b55]">
              NIT {cliente.nit} · {cliente.sede}
            </span>
          )}
        </Campo>
        <Campo rotulo="Pedido">{pedido.id_pedido}</Campo>
        <Campo rotulo="Emitida">{emitida ? fmtDia(emitida) : "Sin aprobar todavía"}</Campo>
        <Campo rotulo="Transporta">{d ? `${d.nombre} · ${d.placa}` : "Sin entregar a transporte"}</Campo>
      </div>

      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="border-b border-[#141413] text-left text-[11px] tracking-wide text-[#5c5b55] uppercase">
            <th className="py-1.5 font-normal">Producto</th>
            <th className="py-1.5 text-right font-normal">Pedido</th>
            <th className="py-1.5 pl-4 text-right font-normal">Despachado</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => {
            const c = d?.cargado.find((x) => x.sku === i.sku)?.cantidad
            const falta = c !== undefined && c < i.cantidad
            return (
              <tr key={i.sku} className="border-b border-[#e3e1d8]">
                <td className="py-1.5 pr-2">
                  <span className="font-mono text-xs text-[#5c5b55]">{i.sku}</span> {i.descripcion}
                </td>
                <td className="py-1.5 text-right font-mono">{i.cantidad}</td>
                <td className={cn("py-1.5 text-right font-mono", falta && "font-bold text-[#b3261e]")}>{c ?? "—"}</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-[11px] tracking-wide text-[#5c5b55] uppercase">Recibe</p>
          <p className="min-h-9 border-b border-[#8f8a7f] text-xl text-[#1d3a8a] italic" style={{ fontFamily: LETRA_A_MANO }}>
            {ev?.documento === "si" ? ev.nombre : ""}
          </p>
        </div>
        <div>
          <p className="text-[11px] tracking-wide text-[#5c5b55] uppercase">Firma</p>
          <div className="min-h-9 border-b border-[#8f8a7f]">
            {firmada && (
              <svg viewBox="0 0 160 36" className="h-9 w-40" aria-label="Firma de quien recibe" role="img">
                <path
                  d="M6 24 C 16 4, 28 36, 42 14 S 66 6, 76 22 S 104 30, 116 8 L 150 20"
                  fill="none"
                  stroke="#1d3a8a"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            )}
          </div>
        </div>
      </div>
      {ev?.novedad && (
        <p className="mt-3 text-lg text-[#9b1c1c] italic" style={{ fontFamily: LETRA_A_MANO }}>
          Novedad: {ev.novedad}
        </p>
      )}
      {!firmada && <p className="mt-3 text-sm text-[#5c5b55]">Sin firmar: la firma llega cuando el conductor sube la foto del documento.</p>}
    </div>
  )
}

/** La factura electrónica de un pedido. Sin precios por línea: esos datos no están en la demo. */
export function HojaFactura({
  factura,
  cliente,
  pedido,
  verValores,
}: {
  factura: PartidaAbierta
  cliente?: Cliente
  pedido: Pedido | null
  verValores: boolean
}) {
  const items = pedido ? lineasDe(pedido) : []
  return (
    <div className={HOJA}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-[#141413] pb-3">
        <div>
          <p className="text-lg font-bold">FERREMAX S.A.S.</p>
          <p className="text-sm text-[#5c5b55]">Factura electrónica de venta</p>
        </div>
        <p className="font-mono text-lg font-bold">{factura.documento}</p>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Campo rotulo="Cliente">
          {cliente?.razon_social ?? factura.id_cliente}
          {cliente && <span className="block text-sm text-[#5c5b55]">NIT {cliente.nit}</span>}
        </Campo>
        <Campo rotulo="Forma de pago">{cliente ? `Crédito a ${cliente.plazo_dias} días` : "Crédito"}</Campo>
        <Campo rotulo="Fecha de emisión">{fmtDia(factura.fecha_documento)}</Campo>
        <Campo rotulo="Vence">{factura.vencimiento ? fmtDia(factura.vencimiento) : "Sin vencimiento"}</Campo>
        <Campo rotulo="Pedido">{pedido ? pedido.id_pedido : "Anterior a esta demo"}</Campo>
        <Campo rotulo="Remisión">
          {pedido ? (
            <Link href={hrefRemision(pedido.id_pedido)} className="underline underline-offset-4">
              {remisionDe(pedido.id_pedido)}
            </Link>
          ) : (
            "—"
          )}
        </Campo>
      </div>

      {items.length > 0 && (
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="border-b border-[#141413] text-left text-[11px] tracking-wide text-[#5c5b55] uppercase">
              <th className="py-1.5 font-normal">Producto</th>
              <th className="py-1.5 text-right font-normal">Cantidad</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.sku} className="border-b border-[#e3e1d8]">
                <td className="py-1.5 pr-2">
                  <span className="font-mono text-xs text-[#5c5b55]">{i.sku}</span> {i.descripcion}
                </td>
                <td className="py-1.5 text-right font-mono">
                  {i.cantidad} {i.unidad}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="mt-4 flex flex-col items-end gap-1 border-t-2 border-[#141413] pt-3">
        {verValores ? (
          <>
            <p className="text-xl font-bold">
              Total <span className="font-mono">COP {fmtCOP(factura.valor_cop)}</span>
            </p>
            <p className="text-sm text-[#5c5b55]">
              Saldo abierto{" "}
              <span className="font-mono">{factura.saldo_abierto_cop === null ? "en blanco" : `COP ${fmtCOP(factura.saldo_abierto_cop)}`}</span>
            </p>
          </>
        ) : (
          <p className="text-sm text-[#5c5b55]">Valor y saldo: información de crédito, oculta para tu rol (PER-1).</p>
        )}
      </div>
      <p className="mt-3 text-xs text-[#5c5b55]">Los precios por línea no están en los datos de la demo: los trae SAP.</p>
    </div>
  )
}
