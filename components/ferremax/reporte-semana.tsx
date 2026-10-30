"use client"

import { toast } from "sonner"
import { FileTextIcon, MailIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { agenteReporte, type ContextoReporte } from "@/lib/agentes/reporte"
import type { ReporteSemana } from "@/lib/agentes/tipos"
import { LO_QUE_HACE_CLAUDE } from "@/lib/rules"
import { usePrototipo } from "@/lib/store"
import type { Persona } from "@/lib/tipos"
import { semanaAnterior, tramoDe } from "@/lib/vistas"
import { CabeceraCorrida, ComoLoHizo, HerramientasDelAgente, Traza, useAgente } from "./agente"
import { Bloque } from "./piezas"

const REVISAN: Persona[] = ["Andrés Molina", "Marcela Ríos", "Nelson"]

/** El reporte en texto, para el correo. */
const enTexto = (r: ReporteSemana) => [
  r.titulo,
  "",
  ...r.resumen,
  "",
  "Lo que salió bien:",
  ...r.bien.map((x) => `• ${x}`),
  "",
  "Lo que preocupa:",
  ...r.preocupa.map((x) => `• ${x}`),
  "",
  "Ideas para discutir:",
  ...r.ideas.map((i) => `• ${i.idea} Por qué: ${i.por_que} Lo decide: ${i.quien_decide}.`),
  "",
  "Preguntas para la reunión:",
  ...r.preguntas.map((x) => `• ${x}`),
]

function Lista({ titulo, items }: { titulo: string; items: string[] }) {
  return (
    <div>
      <p className="etiqueta mb-2 text-grafito">{titulo}</p>
      {items.length ? (
        <ul className="flex list-disc flex-col gap-1 pl-5 text-[15px]">
          {items.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      ) : (
        <p className="text-[15px] text-grafito">Nada.</p>
      )}
    </div>
  )
}

/** El agente de lib/agentes/reporte.ts: arma el reporte de la semana y propone ideas. Una persona decide si lo manda. */
export function ReporteDeLaSemana() {
  const { pedidos, cambios, enviarCorreo } = usePrototipo()
  const agente = useAgente("reporte", "semana")
  const { desde } = semanaAnterior()
  // Lo de la semana y lo que sigue abierto: no hace falta mandarle toda la historia.
  const contexto: ContextoReporte = { pedidos: pedidos.filter((p) => tramoDe(p) !== "cerrado" || p.eventos.some((e) => e.fecha >= desde)), cambios }
  const { herramientas, entrega } = agenteReporte(contexto)
  const c = agente.corrida
  const r = c?.resultado as ReporteSemana | null | undefined

  return (
    <Bloque
      titulo="Reporte de la semana"
      tipos={["ia", "regla"]}
      reglas={[LO_QUE_HACE_CLAUDE.id]}
      accion={
        <div className="flex flex-wrap gap-2">
          {r && (
            <Button
              variant="outline"
              onClick={() => {
                enviarCorreo({ para: REVISAN, asunto: r.titulo, cuerpo: enTexto(r) })
                toast.success("Reporte enviado por correo", { description: `A ${REVISAN.join(", ")}. Queda en Registro de actividad › Correos.` })
              }}
            >
              <MailIcon /> Mandar por correo
            </Button>
          )}
          <Button variant={c ? "outline" : "default"} disabled={agente.corriendo} onClick={() => agente.correr(contexto, "Armó el reporte de la semana")}>
            <FileTextIcon /> {agente.corriendo ? "Haciendo el reporte…" : c ? "Hacer otra vez" : "Hacer reporte"}
          </Button>
        </div>
      }
      pie="Claude lee los indicadores y los pedidos, y propone ideas para discutir el lunes. No cambia reglas ni decide: las ideas las decide el dueño de cada documento."
    >
      {agente.vivo ? (
        <Traza pasos={agente.vivo.pasos} entrega={entrega} enVivo />
      ) : c && r ? (
        <>
          <CabeceraCorrida corrida={c} />
          <h3 className="subtitulo mt-4">{r.titulo}</h3>
          <div className="mt-3 flex flex-col gap-2 text-[15px]">
            {r.resumen.map((l) => (
              <p key={l}>{l}</p>
            ))}
          </div>
          <div className="mt-5 grid gap-6 md:grid-cols-2">
            <Lista titulo="Lo que salió bien" items={r.bien} />
            <Lista titulo="Lo que preocupa" items={r.preocupa} />
          </div>
          <p className="etiqueta mt-6 mb-2 text-grafito">Ideas de Claude para discutir</p>
          <div className="overflow-x-auto border border-linea">
            <table className="w-full text-[15px]">
              <thead>
                <tr className="border-b-2 border-tinta text-left">
                  <th className="etiqueta px-3 py-2 text-grafito">Idea</th>
                  <th className="etiqueta px-3 py-2 text-grafito">Por qué</th>
                  <th className="etiqueta px-3 py-2 text-grafito">Lo decide</th>
                </tr>
              </thead>
              <tbody>
                {r.ideas.map((i) => (
                  <tr key={i.idea} className="border-b border-linea align-top">
                    <td className="px-3 py-2 font-medium">{i.idea}</td>
                    <td className="px-3 py-2">{i.por_que}</td>
                    <td className="px-3 py-2 text-grafito">{i.quien_decide}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-5">
            <Lista titulo="Preguntas para la reunión" items={r.preguntas} />
          </div>
          <ComoLoHizo corrida={c} entrega={entrega} titulo="Cómo armó el reporte" />
        </>
      ) : c ? (
        <p className="text-[15px] text-vencido">Terminó sin entregar el reporte. Revisa el recorrido.</p>
      ) : (
        <>
          <p className="text-[15px]">
            Un clic y Claude revisa la semana: escribe el resumen para la reunión, lo que salió bien, lo que preocupa y de 2 a 4 ideas de lo que podríamos agregar o cambiar, cada una con
            el dato que la justifica y quién la decide.
          </p>
          <p className="etiqueta mt-4 mb-2 text-grafito">Lo que puede consultar</p>
          <HerramientasDelAgente herramientas={herramientas} entrega={entrega} />
        </>
      )}
      {agente.error && <p className="mt-3 text-[15px] text-vencido">No se pudo: {agente.error}</p>}
    </Bloque>
  )
}
