"use client"

import { useState } from "react"
import Link from "next/link"
import { Estado } from "@/components/ferremax/estado"
import { ReglaBoton } from "@/components/ferremax/insignia"
import { Bloque, PorDefinir, Titulo } from "@/components/ferremax/piezas"
import { ChatWhatsApp } from "@/components/ferremax/whatsapp"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { HOY } from "@/lib/data"
import { fmtFechaHora, horasEntre, sumarHoras } from "@/lib/fechas"
import { fmtDuracion } from "@/lib/formato"
import { destinatarios, enviosDe, proximoAviso } from "@/lib/notificaciones"
import { AVISO_WHATSAPP, RELOJ_APROBACION, RESPUESTA_WHATSAPP, VER_INFO_CREDITO, type Cadena, type TipoEnvio } from "@/lib/rules"
import { usePrototipo } from "@/lib/store"
import { relojAprobacion, tramoDe } from "@/lib/vistas"

// Avisos por WhatsApp (simulados). El aviso y la respuesta son dos reglas (NOT-1 y NOT-2); el chat es
// solo la pantalla de ensayo. Nada sale a WhatsApp de verdad: ver lib/notificaciones.ts para lo que se reutiliza.

const NOMBRE_TIPO: Record<TipoEnvio, string> = {
  inicial: "Aviso al entrar",
  recordatorio: "Recordatorio",
  info: "Piden información",
  apoyo: "Ayuda a ubicar",
  escalamiento: "Escalamiento",
}

const CADENAS: { cadena: Cadena; titulo: string; escala: string }[] = [
  { cadena: "andres", titulo: "Si aprueba Andrés", escala: "avisa a Marcela" },
  { cadena: "marcela_o_sandra", titulo: "Si aprueban Marcela o Sandra", escala: "avisa a Andrés" },
  { cadena: "marcela_sola", titulo: "Si decide Marcela sola", escala: "avisa a Andrés" },
]

/** Los avisos de un pedido que entra a las 8:00, contados en horas desde que entra. Es la regla, sin pedidos de por medio. */
function lineaDeTiempo(cadena: Cadena) {
  const base = "2026-01-05T08:00"
  const tope = RELOJ_APROBACION.valores!.tope_h
  const porHora = new Map<number, string[]>()
  for (const e of AVISO_WHATSAPP.fn(base, sumarHoras(base, tope + 1), base, { cadena, infos: [] })) {
    const h = horasEntre(base, e.fecha)
    porHora.set(h, [...(porHora.get(h) ?? []), e.tipo === "recordatorio" ? `Recordatorio ${e.n}` : NOMBRE_TIPO[e.tipo]])
  }
  return [...porHora.entries()].sort((a, b) => a[0] - b[0])
}

export default function Avisos() {
  const { pedidos, rol } = usePrototipo()
  const [adelanto, setAdelanto] = useState(0)
  const ahora = sumarHoras(HOY, adelanto)
  const verInfo = VER_INFO_CREDITO.fn(rol)

  const esperando = pedidos.filter((p) => tramoDe(p) === "aprobar")
  const filas = esperando.map((p) => {
    const enviados = enviosDe(p, ahora)
    return { p, enviados, ultimo: enviados.at(-1), siguiente: proximoAviso(p, ahora), reloj: relojAprobacion(p, ahora) }
  })

  return (
    <>
      <Titulo
        indice="(005) Avisos por WhatsApp"
        titulo="El aviso llega solo y la decisión se puede dar ahí mismo"
        bajada="Ensayo: no sale ningún mensaje. Apenas entra una solicitud, quien la aprueba recibe la ficha; si no responde, se le vuelve a escribir. Su respuesta firma el pedido igual que el botón de la app."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="flex flex-col gap-6">
          <Bloque
            titulo="Cuándo avisa"
            tipos={["regla"]}
            reglas={[AVISO_WHATSAPP.id, RELOJ_APROBACION.id]}
            pie={<>Los números salen de la regla y se pueden editar en /reglas (los números de <span className="dato">NOT-1</span>: 6 h, 3 recordatorios, 12 h de pausa y las 20 h de Andrés). {AVISO_WHATSAPP.texto}</>}
          >
            <div className="flex flex-col gap-4">
              {CADENAS.map(({ cadena, titulo, escala }) => (
                <div key={cadena}>
                  <p className="mb-2 text-sm font-medium">
                    {titulo} <span className="font-normal text-grafito">· {escala}</span>
                  </p>
                  <ol className="flex flex-wrap gap-2">
                    {lineaDeTiempo(cadena).map(([h, cosas]) => (
                      <li key={h} className="min-w-28 border border-linea bg-papel px-3 py-2">
                        <p className="cifra text-2xl">{h} h</p>
                        {cosas.map((c) => (
                          <p key={c} className="text-sm text-grafito">
                            {c}
                          </p>
                        ))}
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
            <ul className="mt-4 flex list-disc flex-col gap-1 pl-5 text-sm text-grafito">
              <li>Contado desde que la solicitud entra a la app. El tope y el aviso a Marcela cuentan desde que se registró la solicitud (CRED-3.1).</li>
              <li>
                Los avisos salen también de noche: las horas del reloj son corridas. Cada persona recibe como máximo {AVISO_WHATSAPP.valores!.max_recordatorios}{" "}
                recordatorios; después se pasa a otra persona y no se insiste más.
              </li>
              <li>
                Si quien aprueba pide información (3), sus recordatorios se pausan {AVISO_WHATSAPP.valores!.pausa_info_h} h y Sandra recibe el aviso
                para conseguir el dato. El reloj de {RELOJ_APROBACION.valores!.tope_h} h no se detiene.
              </li>
              <li>
                En el escalamiento a Andrés se le dice a quién se le avisó y que falta una respuesta. Hoy él no firma por ellas (PER-4):{" "}
                <PorDefinir /> si debería poder.
              </li>
            </ul>
          </Bloque>

          <Bloque
            titulo={`Esperando decisión · ${esperando.length}`}
            tipos={["regla"]}
            reglas={[AVISO_WHATSAPP.id]}
            accion={
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-grafito">Reloj de ensayo: {fmtFechaHora(ahora)}</span>
                {[1, 6, 12].map((h) => (
                  <Button key={h} size="sm" variant="outline" onClick={() => setAdelanto((a) => a + h)}>
                    +{h} h
                  </Button>
                ))}
                <Button size="sm" variant="ghost" disabled={adelanto === 0} onClick={() => setAdelanto(0)}>
                  Volver a hoy
                </Button>
              </div>
            }
            pie="El reloj de ensayo solo mueve esta pantalla; el resto de la app sigue en la hora de hoy. Lo que se responda aquí queda con la hora del reloj de ensayo."
          >
            {filas.length === 0 ? (
              <p className="text-[15px] text-grafito">No hay pedidos esperando decisión.</p>
            ) : (
              <div className="overflow-x-auto border border-linea">
                <Table className="text-sm">
                  <TableHeader className="bg-muted">
                    <TableRow>
                      <TableHead className="etiqueta">Pedido</TableHead>
                      <TableHead className="etiqueta">Le avisa a</TableHead>
                      <TableHead className="etiqueta text-right">Espera</TableHead>
                      <TableHead className="etiqueta text-right">Avisos</TableHead>
                      <TableHead className="etiqueta">Último</TableHead>
                      <TableHead className="etiqueta">Próximo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filas.map(({ p, enviados, ultimo, siguiente, reloj }) => {
                      const { para, soloInformar } = destinatarios(p)
                      return (
                        <TableRow key={p.id_pedido}>
                          <TableCell>
                            <Link href={`/pedidos/${p.id_pedido}`} className="font-mono hover:underline">
                              {p.id_pedido}
                            </Link>
                            <span className="block max-w-48 truncate text-xs text-muted-foreground">{p.cliente}</span>
                          </TableCell>
                          <TableCell>
                            {para.join(" o ")}
                            {soloInformar && <span className="block text-xs text-muted-foreground">falta un dato</span>}
                          </TableCell>
                          <TableCell className="text-right">
                            <Estado clase={reloj.clase} palabra={reloj.actual} className="text-xs" />
                          </TableCell>
                          <TableCell className="text-right font-mono">{enviados.length}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            {ultimo ? (
                              <>
                                {NOMBRE_TIPO[ultimo.tipo]}
                                <span className="block text-xs text-muted-foreground">
                                  {fmtFechaHora(ultimo.fecha)}
                                  {` · ${horasEntre(ultimo.fecha, ahora) >= 1 ? `hace ${fmtDuracion(horasEntre(ultimo.fecha, ahora))}` : "ahora"}`}
                                </span>
                              </>
                            ) : (
                              <span className="text-muted-foreground">Todavía ninguno</span>
                            )}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {siguiente ? (
                              <>
                                {NOMBRE_TIPO[siguiente.tipo]}
                                <span className="block text-xs text-muted-foreground">
                                  {fmtFechaHora(siguiente.fecha)} · en {fmtDuracion(horasEntre(ahora, siguiente.fecha))}
                                </span>
                              </>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </Bloque>

          <Bloque
            titulo="Del ensayo a la versión real (Baileys)"
            tipos={["humano"]}
            pie={
              <>
                Hoy los avisos se recalculan cada vez que se pinta la pantalla. En la versión real se guardan al enviarse, para no repetir
                ninguno si el proceso se reinicia.
              </>
            }
          >
            <ul className="flex list-disc flex-col gap-2 pl-5 text-[15px]">
              <li>
                <strong className="font-medium">Salir:</strong> un proceso revisa cada minuto qué avisos tocan (<span className="dato">NOT-1</span>) y los manda por
                Baileys desde un solo número de Ferremax. La regla y el texto ya están escritos y no cambian.
              </li>
              <li>
                <strong className="font-medium">Entrar:</strong> cada mensaje recibido llega con su remitente y el mensaje que cita. Se acepta solo de
                los celulares registrados y se lee con <span className="dato">NOT-2</span>; el resultado se guarda como cualquier otra decisión.
              </li>
              <li>
                <strong className="font-medium">El mismo número</strong> recibe también a los conductores (opción A de Transporte): el sistema
                distingue quién escribe por su celular.
              </li>
              <li>
                Baileys no es una API oficial de WhatsApp: funciona como un WhatsApp Web, y Meta puede bloquear un número que lo use. Para
                producción hay que decidir si se acepta ese riesgo o se usa la API oficial de WhatsApp Business. <PorDefinir />
              </li>
            </ul>
          </Bloque>
        </div>

        <div className="flex flex-col gap-6">
          <Bloque
            titulo="El celular de quien aprueba"
            tipos={["regla", "humano"]}
            reglas={[RESPUESTA_WHATSAPP.id]}
            pie={RESPUESTA_WHATSAPP.texto}
          >
            {verInfo ? (
              <ChatWhatsApp ahora={ahora} />
            ) : (
              <p className="text-[15px] text-grafito">
                Los avisos llevan información de crédito, oculta para tu rol <ReglaBoton id={VER_INFO_CREDITO.id} soloId />. Cambia el rol abajo en
                &quot;Ver como&quot; para probar el chat.
              </p>
            )}
          </Bloque>
        </div>
      </div>
    </>
  )
}
