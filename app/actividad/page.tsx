"use client"

import { useState } from "react"
import Link from "next/link"
import { DownloadIcon, PaperclipIcon } from "lucide-react"
import { Insignia } from "@/components/ferremax/insignia"
import { Bloque, Titulo } from "@/components/ferremax/piezas"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TIPOS_ACTIVIDAD, type Actividad, type TipoActividad } from "@/lib/actividad"
import { escribirCSV } from "@/lib/carga/csv"
import { DIRECCION, REMITENTE, type Correo } from "@/lib/correos"
import { fmtFechaHora } from "@/lib/fechas"
import { descargar } from "@/lib/importar"
import { CORREOS, VER_INFO_CREDITO } from "@/lib/rules"
import { usePrototipo } from "@/lib/store"
import { PERSONAS, type Persona } from "@/lib/tipos"

// REGISTRO DE ACTIVIDAD (Seguimiento). Todo lo que pasó, junto y en orden, para auditar; y los correos que salieron de ahí.
// Cada pantalla sigue mostrando lo suyo. Las líneas salen de lib/actividad.ts y los correos de lib/correos.ts.

const PAGINA = 100
const TODOS = "todos"

/** Sistema es una regla, Claude es IA; Transportadora y la carga de la demostración no son una persona de Ferremax. */
const insigniaDe = (quien: string) => (quien === "Sistema" ? "regla" : quien === "Claude" ? "ia" : quien === "Transportadora" || quien === "Demostración" ? null : "humano")

function Filtro({ valor, onCambio, opciones, rotulo }: { valor: string; onCambio: (v: string) => void; opciones: [string, string][]; rotulo: string }) {
  return (
    <Select value={valor} onValueChange={(v) => v && onCambio(v as string)}>
      <SelectTrigger className="w-56" aria-label={rotulo}>
        <SelectValue>{opciones.find(([v]) => v === valor)?.[1]}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {opciones.map(([v, t]) => (
          <SelectItem key={v} value={v}>
            {t}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function TablaActividad({ actividad, correos }: { actividad: Actividad[]; correos: Correo[] }) {
  const { rol } = usePrototipo()
  const verInfo = VER_INFO_CREDITO.fn(rol)
  const [tipo, setTipo] = useState(TODOS)
  const [quien, setQuien] = useState(TODOS)
  const [pedido, setPedido] = useState("")
  const [cuantas, setCuantas] = useState(PAGINA)

  const correosDe = new Map<number, number>()
  for (const c of correos) if (c.n) correosDe.set(c.n, (correosDe.get(c.n) ?? 0) + 1)
  const quienes = [...new Set(actividad.map((a) => a.quien))].sort()
  const filtradas = actividad
    .filter((a) => (tipo === TODOS || a.tipo === tipo) && (quien === TODOS || a.quien === quien) && (!pedido.trim() || a.id_pedido?.toLowerCase().includes(pedido.trim().toLowerCase())))
    .reverse()
  const detalle = (a: Actividad) => (a.credito && !verInfo ? "Información de crédito, oculta para tu rol (PER-1)." : (a.detalle ?? ""))

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Filtro rotulo="Tipo" valor={tipo} onCambio={setTipo} opciones={[[TODOS, "Todos los tipos"], ...(Object.entries(TIPOS_ACTIVIDAD) as [TipoActividad, string][])]} />
        <Filtro rotulo="Quién" valor={quien} onCambio={setQuien} opciones={[[TODOS, "Todas las personas"], ...quienes.map((q): [string, string] => [q, q])]} />
        <Input value={pedido} onChange={(e) => setPedido(e.target.value)} placeholder="Pedido, p. ej. 03102" className="w-56" aria-label="Filtrar por pedido" />
        <span className="text-sm text-grafito">
          {filtradas.length} de {actividad.length} líneas
        </span>
        <Button
          variant="outline"
          className="ml-auto"
          onClick={() =>
            descargar(
              "registro_de_actividad.csv",
              escribirCSV(
                ["n", "fecha", "quien", "tipo", "que", "id_pedido", "detalle", "ref"],
                filtradas.map((a) => [String(a.n), a.fecha, a.quien, a.tipo, a.que, a.id_pedido ?? "", detalle(a), a.ref ?? ""]),
              ),
            )
          }
        >
          <DownloadIcon /> Descargar CSV
        </Button>
      </div>
      <div className="overflow-x-auto border border-linea">
        <Table className="text-[15px]">
          <TableHeader>
            <TableRow className="border-b-2 border-tinta hover:bg-transparent">
              <TableHead className="etiqueta text-right text-grafito">N.º</TableHead>
              <TableHead className="etiqueta text-grafito">Cuándo</TableHead>
              <TableHead className="etiqueta text-grafito">Quién</TableHead>
              <TableHead className="etiqueta text-grafito">Qué</TableHead>
              <TableHead className="etiqueta text-grafito">Pedido</TableHead>
              <TableHead className="etiqueta text-grafito">Detalle</TableHead>
              <TableHead className="etiqueta text-grafito">Correos</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtradas.slice(0, cuantas).map((a) => {
              const insignia = insigniaDe(a.quien)
              return (
                <TableRow key={a.n} className="border-linea align-top">
                  <TableCell className="dato py-3 text-right text-grafito">{a.n}</TableCell>
                  <TableCell className="dato whitespace-nowrap">{fmtFechaHora(a.fecha)}</TableCell>
                  <TableCell>
                    <span className="flex flex-wrap items-center gap-1.5">
                      {a.quien}
                      {insignia && <Insignia tipo={insignia} />}
                    </span>
                  </TableCell>
                  <TableCell>
                    {a.que}
                    <span className="block text-xs text-grafito">{TIPOS_ACTIVIDAD[a.tipo]}</span>
                  </TableCell>
                  <TableCell>
                    {a.id_pedido ? (
                      <Link href={`/pedidos/${a.id_pedido}`} className="dato whitespace-nowrap hover:underline">
                        {a.id_pedido}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className={a.credito && !verInfo ? "max-w-md text-sm text-grafito italic" : "max-w-md text-sm"}>{detalle(a) || "—"}</TableCell>
                  <TableCell className="dato">{correosDe.get(a.n) ?? "—"}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
      {filtradas.length > cuantas && (
        <Button variant="outline" className="mt-3" onClick={() => setCuantas((n) => n + PAGINA)}>
          Mostrar {Math.min(PAGINA, filtradas.length - cuantas)} más
        </Button>
      )}
    </>
  )
}

function Bandeja({ correos }: { correos: Correo[] }) {
  const [para, setPara] = useState(TODOS)
  const [cuantos, setCuantos] = useState(30)
  const filtrados = correos.filter((c) => para === TODOS || c.para.includes(para as Persona)).reverse()
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Filtro rotulo="Bandeja de" valor={para} onCambio={setPara} opciones={[[TODOS, "Todas las bandejas"], ...PERSONAS.map((p): [string, string] => [p, `Bandeja de ${p}`])]} />
        <span className="text-sm text-grafito">{filtrados.length} correos · simulados, nadie los recibe</span>
      </div>
      {filtrados.length ? (
        <div className="flex flex-col gap-4">
          {filtrados.slice(0, cuantos).map((c) => (
            <article key={c.id} className="border border-linea bg-card">
              <header className="flex flex-col gap-1 border-b border-linea bg-muted/50 px-4 py-3 text-sm">
                <div className="flex flex-wrap items-baseline gap-x-3">
                  <span className="text-[15px] font-medium">{c.asunto}</span>
                  <span className="ml-auto dato text-grafito">{fmtFechaHora(c.fecha)}</span>
                </div>
                <p className="text-grafito">
                  De <span className="dato">{REMITENTE}</span> · Para {c.para.map((p) => `${p} <${DIRECCION[p]}>`).join(", ")}
                </p>
                <p className="flex flex-wrap items-center gap-x-3 text-xs text-grafito">
                  <span>{c.porque}</span>
                  {c.n && <span>Línea {c.n} del registro</span>}
                  {c.id_pedido && (
                    <Link href={`/pedidos/${c.id_pedido}`} className="dato underline-offset-4 hover:underline">
                      {c.id_pedido}
                    </Link>
                  )}
                  {c.adjunto && (
                    <span className="flex items-center gap-1 dato">
                      <PaperclipIcon className="size-3" aria-hidden /> {c.adjunto}
                    </span>
                  )}
                </p>
              </header>
              <p className="px-4 py-3 text-[15px] whitespace-pre-line">{c.cuerpo.join("\n")}</p>
            </article>
          ))}
          {filtrados.length > cuantos && (
            <Button variant="outline" className="self-start" onClick={() => setCuantos((n) => n + 30)}>
              Mostrar más
            </Button>
          )}
        </div>
      ) : (
        <p className="text-[15px] text-grafito">No hay correos en esta bandeja.</p>
      )}
    </>
  )
}

export default function RegistroDeActividad() {
  const { actividad, correos } = usePrototipo()
  return (
    <>
      <Titulo
        indice="Seguimiento · Registro de actividad"
        titulo="Registro de actividad"
        bajada="Todo lo que pasó, en orden: quién hizo qué y cuándo. Solo se agrega, nunca se edita ni se borra. Cada pantalla sigue mostrando lo suyo; aquí está todo junto para auditar."
      />
      <Tabs defaultValue="actividad" className="gap-6">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="actividad" className="px-4 py-2 text-[15px]">
            Actividad · {actividad.length}
          </TabsTrigger>
          <TabsTrigger value="correos" className="px-4 py-2 text-[15px]">
            Correos · {correos.length}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="actividad">
          <Bloque
            titulo="Todo lo que pasó"
            tipos={["regla", "humano", "ia"]}
            pie="Las demás pantallas muestran cada cosa por separado: el historial en la ficha del pedido, las cargas en 1 · Cargar pedidos, los archivos para SAP en 2 · Aprobar, los cambios en Reglas y el chat en Avisos por WhatsApp. En producción esto es una tabla que solo admite agregar filas (README · Para producción)."
          >
            <TablaActividad actividad={actividad} correos={correos} />
          </Bloque>
        </TabsContent>
        <TabsContent value="correos">
          <Bloque
            titulo="Correos que mandó el sistema"
            tipos={["regla"]}
            reglas={[CORREOS.id]}
            pie={`${CORREOS.texto} Para seguir un pedido: botón «Seguir por correo» en su ficha.`}
          >
            <Bandeja correos={correos} />
          </Bloque>
        </TabsContent>
      </Tabs>
    </>
  )
}
