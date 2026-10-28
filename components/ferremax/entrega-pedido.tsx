"use client"

import { lineasDe } from "@/lib/lineas"
import { enlaceDe, remisionDe } from "@/lib/evidencia"
import { fmtFechaHora } from "@/lib/fechas"
import { fmtHoras } from "@/lib/formato"
import { ALERTA_ENTREGA, EVIDENCIA_ENTREGA, RELOJ_TRANSPORTE, SALIDA_COMPLETA } from "@/lib/rules"
import type { Pedido } from "@/lib/tipos"
import { entregaDe, eventoDe } from "@/lib/vistas"
import { BotonAtender, usePermisoAtender } from "./atender"
import { Estado } from "./estado"
import { ReglaBoton } from "./insignia"
import { MensajeTarjeta } from "./mensaje"
import { Bloque } from "./piezas"
import { SimularMensaje } from "./simular-mensaje"

/** Bloque 5 de la ficha: cómo salió el pedido, dónde va y qué evidencia hay de la entrega. */
export function EntregaDelPedido({ pedido }: { pedido: Pedido }) {
  const e = entregaDe(pedido)
  const atiende = usePermisoAtender(pedido)
  if (!e) return null
  const d = pedido.despacho
  const salida = eventoDe(pedido, "despachado")!
  const items = lineasDe(pedido)

  const filas = [
    { rotulo: "Salió de bodega", valor: `${fmtFechaHora(e.salio)} · ${salida.quien}` },
    { rotulo: "Remisión", valor: <span className="dato">{remisionDe(pedido.id_pedido)}</span> },
    ...(d
      ? [
          { rotulo: "Conductor", valor: `${d.nombre} · ${d.transportadora}` },
          { rotulo: "Placa y celular", valor: <span className="dato">{d.placa} · {d.celular}</span> },
        ]
      : []),
    {
      rotulo: e.etapa === "en_camino" ? "Lleva en camino" : "Tardó en llegar",
      valor: fmtHoras(e.horas) + (e.llego ? ` · llegó ${fmtFechaHora(e.llego)}` : ""),
    },
  ]

  return (
    <Bloque
      titulo="5 · Transporte y entrega"
      tipos={["regla", "propuesta"]}
      reglas={[SALIDA_COMPLETA.id, RELOJ_TRANSPORTE.id, EVIDENCIA_ENTREGA.id]}
      pie="El transporte a la obra no cuenta contra el tope de 5 días del proyecto (Ops Charter). Esta parte es visibilidad."
      accion={<Estado clase={e.estado.clase} palabra={e.estado.palabra} />}
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <dl className="divide-y divide-linea border-y border-linea">
            {filas.map((f) => (
              <div key={f.rotulo} className="flex items-center justify-between gap-4 py-2.5 text-[15px]">
                <dt className="text-muted-foreground">{f.rotulo}</dt>
                <dd className="text-right">{f.valor}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div>
          <p className="etiqueta mb-2 flex items-center gap-2">
            Lo cargado contra lo pedido
            {e.carga.completo ? <Estado clase="aprobado" palabra="Salió completo" /> : <Estado clase="aviso" palabra="Salió incompleto" />}
          </p>
          {e.carga.completo ? (
            <p className="text-[15px]">
              {items.length === 1 ? "La única línea salió" : `Las ${items.length} líneas salieron`} con la cantidad pedida.
            </p>
          ) : (
            <>
              <ul className="divide-y divide-linea border-y border-linea text-[15px]">
                {e.carga.faltantes.map((f) => (
                  <li key={f.sku} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
                    <span>
                      <span className="dato text-grafito">{f.sku}</span> · {f.descripcion}
                    </span>
                    <span className="dato">
                      pidió {f.pedido} · cargó {f.cargado} · <span className="text-aviso">faltan {f.falta}</span>
                    </span>
                  </li>
                ))}
              </ul>
              {d?.faltante_motivo && <p className="mt-2 text-[15px]">Motivo: {d.faltante_motivo}</p>}
            </>
          )}
          {d && (
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer text-grafito underline-offset-4 hover:underline">
                {items.length === 1 ? "Ver la línea" : `Ver las ${items.length} líneas`}
              </summary>
              <table className="mt-2 w-full">
                <tbody>
                  {items.map((i) => {
                    const c = d.cargado.find((x) => x.sku === i.sku)?.cantidad ?? 0
                    return (
                      <tr key={i.sku} className="border-b border-linea">
                        <td className="py-1.5 pr-2">
                          <span className="dato text-grafito">{i.sku}</span> · {i.descripcion}
                        </td>
                        <td className="dato py-1.5 text-right whitespace-nowrap">
                          {c} / {i.cantidad}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </details>
          )}
        </div>
      </div>

      <div className="mt-6 border-t border-linea pt-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <p className="etiqueta">Evidencia de la entrega</p>
          <div className="flex flex-wrap items-center gap-2">
            {e.alerta && atiende && <BotonAtender pedido={pedido} />}
            {(e.etapa === "en_camino" || e.alerta) && (
              <>
                <SimularMensaje canal="Chat de WhatsApp" pedido={pedido} etiqueta="Simular chat" />
                <SimularMensaje canal="Enlace" pedido={pedido} etiqueta="Simular enlace" />
              </>
            )}
          </div>
        </div>

        {e.etapa === "en_camino" && !pedido.mensajes.length ? (
          <p className="text-[15px]">
            Todavía nadie ha confirmado la entrega. {e.reloj.clase === "aviso" && <strong className="font-medium">{e.reloj.queHace}.</strong>} El conductor la confirma
            por el chat de WhatsApp o desde su enlace <span className="dato">{enlaceDe(pedido.id_pedido)}</span>.
          </p>
        ) : (
          <>
            {e.alerta ? (
              <div className="mb-4 border-l-4 border-vencido bg-vencido-fondo px-4 py-3 text-[15px]">
                <p className="font-medium">
                  Alerta de entrega <span className="font-normal">· {e.atencion === "pedida" ? "ya se pidió de nuevo" : "abierta"}</span>{" "}
                </p>
                <ul className="mt-1 list-disc pl-5">
                  {e.faltas.map((f) => (
                    <li key={f.texto}>{f.texto}</li>
                  ))}
                  {e.novedad && <li>Quien recibió escribió: &quot;{e.novedad}&quot;</li>}
                </ul>
                <p className="mt-1 flex items-center gap-2 text-sm text-grafito">
                  No bloquea el pedido. Sigue abierta hasta que Nelson o Marcela la atiendan. <ReglaBoton id={ALERTA_ENTREGA.id} soloId />
                </p>
              </div>
            ) : (
              <p className="mb-4 text-[15px]">
                {e.atencion === "aceptada" ? "La alerta se cerró: una persona dio la evidencia por buena." : "La evidencia está completa: producto, documento con nombre y firma."}
              </p>
            )}
            <div className="flex flex-col gap-4">
              {pedido.mensajes.map((m) => (
                <MensajeTarjeta key={m.id} mensaje={m} compacto />
              ))}
            </div>
          </>
        )}
      </div>
    </Bloque>
  )
}
