"use client"

import { useState } from "react"
import { PencilIcon } from "lucide-react"
import { Titulo } from "@/components/ferremax/piezas"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AREAS, EDITAR_REGLA, REGLAS, type Area, type Regla } from "@/lib/rules"
import { usePrototipo } from "@/lib/store"
import { cn } from "@/lib/utils"

const DESCRIPCION: Record<Area, string> = {
  Crédito: "Quién aprueba, la ficha, el reloj de 24 h, los casos resueltos y los indicadores del lunes.",
  Avisos: "Cuándo y cómo se le avisa por WhatsApp a quien aprueba, y cómo decide respondiendo el mismo mensaje.",
  Bodega: "Cómo entra un pedido a la lista, en qué orden sale y cuándo está tarde.",
  Transporte: "Qué se revisa cuando sale de bodega, cuándo está en camino y qué evidencia confirma la entrega.",
  Proyecto: "La meta del proyecto Pedido a crédito · de 10 a 5 días.",
  Sistema: "Quién ve qué, quién crea clientes, quién firma y quién edita una regla.",
}

function TarjetaRegla({ r }: { r: Regla }) {
  const { abrirRegla, rol, cambios } = usePrototipo()
  const puedeEditar = EDITAR_REGLA.fn(rol, r) && !!r.campos
  const cambiada = cambios.some((c) => c.regla === r.id)
  return (
    <button
      type="button"
      onClick={() => abrirRegla(r.id)}
      className={cn(
        "flex h-full flex-col gap-2 border bg-card p-4 text-left transition-colors hover:border-tinta",
        r.fuente === "Regla de Marcela" ? "border-dashed border-linea" : "border-linea",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-tinta px-2 py-0.5 font-mono text-xs text-papel">■ {r.id}</span>
        <span className="text-xs text-muted-foreground">{r.fuente}</span>
        {puedeEditar && (
          <span className="ml-auto flex items-center gap-1 rounded-full bg-amarillo px-2 py-0.5 text-xs font-medium text-sobre-amarillo">
            <PencilIcon className="size-3" /> Puedes editar
          </span>
        )}
        {cambiada && <span className="rounded-full border border-aviso px-2 py-0.5 text-xs text-aviso">Cambiada en la demo</span>}
      </div>
      <h3 className="text-base leading-snug font-medium">{r.titulo}</h3>
      <p className="line-clamp-3 text-sm text-muted-foreground">{r.texto}</p>
      <p className="mt-auto pt-2 text-xs text-muted-foreground">
        {r.documento.nombre} · {r.seccion}
      </p>
    </button>
  )
}

type Pestana = Area | "todas"

export default function Reglas() {
  const { rol } = usePrototipo()
  const [pestana, setPestana] = useState<Pestana>("todas")
  const editables = REGLAS.filter((r) => EDITAR_REGLA.fn(rol, r) && r.campos).length
  const areas = pestana === "todas" ? AREAS : AREAS.filter((a) => a === pestana)
  const cuenta = (a: Pestana) => (a === "todas" ? REGLAS.length : REGLAS.filter((r) => r.documento.area === a).length)

  return (
    <>
      <Titulo
        indice="(007) Reglas"
        titulo="Cada regla vive en un solo lugar"
        bajada="Todas están en lib/rules.ts, con su id y su documento. Haz clic en una para leerla completa. Solo el dueño del documento la edita."
      >
        <p className="max-w-xs text-sm text-muted-foreground">
          Como {rol} puedes editar {editables} {editables === 1 ? "regla" : "reglas"}.
        </p>
      </Titulo>

      <Tabs value={pestana} onValueChange={(v) => setPestana(v as Pestana)} className="w-full flex-col gap-4">
        <TabsList className="h-auto flex-wrap justify-start">
          {(["todas", ...AREAS] as Pestana[]).map((a) => (
            <TabsTrigger key={a} value={a}>
              {a === "todas" ? "Todas" : a} <Badge variant="secondary">{cuenta(a)}</Badge>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {areas.map((area) => {
        const delArea = REGLAS.filter((r) => r.documento.area === area)
        const duenos = [...new Set(delArea.map((r) => r.documento.dueno ?? "[por definir]"))]
        return (
          <section key={area} id={area} className="scroll-mt-20">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2 border-b-2 border-tinta pb-2">
              <div>
                <h2 className="subtitulo">{area}</h2>
                <p className="text-sm text-muted-foreground">{DESCRIPCION[area]}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                {delArea.length} reglas · dueños: {duenos.join(", ")}
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {delArea.map((r) => (
                <TarjetaRegla key={r.id} r={r} />
              ))}
            </div>
          </section>
        )
      })}
      <p className="text-sm text-muted-foreground">
        Borde punteado: Regla de Marcela (Casos resueltos de crédito). Qué cuenta como &quot;regla de Marcela&quot; no está escrito en
        ningún documento: [por definir].
      </p>
    </>
  )
}
