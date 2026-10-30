"use client"

import { useRef } from "react"
import { Button } from "@/components/ui/button"
import { agenteFotos, type ContextoFotos } from "@/lib/agentes/fotos"
import { svgAPNG } from "@/lib/agentes/imagen"
import type { LecturaFotos } from "@/lib/agentes/tipos"
import { LO_QUE_HACE_CLAUDE } from "@/lib/rules"
import { usePrototipo } from "@/lib/store"
import type { MensajeTransporte } from "@/lib/tipos"
import { cn } from "@/lib/utils"
import { CabeceraCorrida, ComoLoHizo, Traza, useAgente } from "./agente"
import { FotoDelDocumento, FotoDelProducto } from "./foto"
import { Insignia, ReglaBoton } from "./insignia"

const PALABRA = { si: "Se ve", no: "No hay foto", borrosa: "Sale borrosa" }

function Fila({ ok, rotulo, children }: { ok: boolean | null; rotulo: string; children: React.ReactNode }) {
  return (
    <li className="flex items-baseline gap-2 py-1.5 text-sm">
      <span aria-hidden className={cn("w-4 shrink-0 font-mono", ok === true && "text-aprobado", ok === false && "text-vencido", ok === null && "text-grafito")}>
        {ok === true ? "✓" : ok === false ? "✕" : "…"}
      </span>
      <span className="w-24 shrink-0 text-grafito">{rotulo}</span>
      <span className="flex-1">{children}</span>
    </li>
  )
}

/** El agente de lib/agentes/fotos.ts: Claude mira las fotos (convertidas a PNG) y dice qué lee. No cierra ni abre alertas. */
export function LeerConClaude({ mensaje }: { mensaje: MensajeTransporte }) {
  const { pedidos } = usePrototipo()
  const agente = useAgente("fotos", mensaje.id)
  const fotos = useRef<HTMLDivElement>(null)
  const { entrega } = agenteFotos({ mensaje, imagenes: {}, pedidos: [] })
  const c = agente.corrida
  const l = c?.resultado as LecturaFotos | null | undefined

  async function leer() {
    const svg = (cual: string) => fotos.current?.querySelector<SVGSVGElement>(`[data-foto="${cual}"] svg`)
    const producto = svg("producto")
    const documento = svg("documento")
    const contexto: ContextoFotos = {
      mensaje,
      imagenes: {
        producto: producto && mensaje.producto ? await svgAPNG(producto, !mensaje.producto.nitida) : undefined,
        documento: documento && mensaje.documento ? await svgAPNG(documento, !mensaje.documento.nitida) : undefined,
      },
      pedidos: pedidos.filter((p) => p.despacho),
    }
    agente.correr(contexto, `Leyó las fotos del mensaje ${mensaje.id}`, mensaje.id_pedido ?? undefined)
  }

  return (
    <div className="border border-tinta p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          <span className="etiqueta">Claude lee las fotos</span>
          <Insignia tipo="ia" />
          <ReglaBoton id={LO_QUE_HACE_CLAUDE.id} soloId />
        </span>
        <Button size="sm" variant={c ? "outline" : "default"} disabled={agente.corriendo} onClick={leer}>
          {agente.corriendo ? "Leyendo…" : c ? "Leer otra vez" : "Leer con Claude"}
        </Button>
      </div>

      {/* Copias fuera de pantalla de las fotos, para convertirlas en PNG. */}
      <div ref={fotos} aria-hidden className="pointer-events-none fixed -left-[9999px] w-60">
        {mensaje.producto && (
          <div data-foto="producto">
            <FotoDelProducto foto={mensaje.producto} />
          </div>
        )}
        {mensaje.documento && (
          <div data-foto="documento">
            <FotoDelDocumento foto={mensaje.documento} />
          </div>
        )}
      </div>

      {agente.vivo ? (
        <Traza pasos={agente.vivo.pasos} entrega={entrega} enVivo />
      ) : c && l ? (
        <>
          <CabeceraCorrida corrida={c} />
          <ul className="mt-2 divide-y divide-linea">
            <Fila ok={l.producto === "si"} rotulo="Producto">
              {PALABRA[l.producto]}
              {l.bultos !== null && ` · ${l.bultos} bultos`}
            </Fila>
            <Fila ok={l.documento === "si"} rotulo="Documento">
              {PALABRA[l.documento]}
            </Fila>
            {l.documento === "si" && (
              <>
                <Fila ok={l.remision === null ? false : l.es_de_este_pedido !== false} rotulo="Remisión">
                  {l.remision ? <span className="dato">{l.remision}</span> : "No se ve el número"}
                  {l.es_de_este_pedido === false && <span className="text-vencido"> · no es la de este pedido</span>}
                </Fila>
                <Fila ok={!!l.nombre} rotulo="Quien recibe">
                  {l.nombre ?? "No aparece el nombre"}
                </Fila>
                <Fila ok={l.firma} rotulo="Firma">
                  {l.firma === null ? "No se lee" : l.firma ? "Sí" : "No hay firma"}
                </Fila>
                <Fila ok={l.novedad ? false : null} rotulo="Novedad">
                  {l.novedad ? `Escribió: "${l.novedad}"` : "Ninguna"}
                </Fila>
              </>
            )}
          </ul>
          {l.observaciones.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-sm">
              {l.observaciones.map((o) => (
                <li key={o}>{o}</li>
              ))}
            </ul>
          )}
          <ComoLoHizo corrida={c} entrega={entrega} titulo="Cómo leyó las fotos" />
        </>
      ) : c ? (
        <p className="text-sm text-vencido">Terminó sin entregar la lectura. Revisa el recorrido.</p>
      ) : (
        <p className="text-sm text-grafito">
          Le manda a Claude las fotos tal como se ven. Si lee una remisión, la busca para saber de qué pedido es. No da la entrega por buena: eso lo hacen Nelson o Marcela.
        </p>
      )}
      {agente.error && <p className="mt-2 text-sm text-vencido">No se pudo: {agente.error}</p>}
    </div>
  )
}
