import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import type { TipoInsignia } from "@/lib/flujo"
import { Insignia, ReglaBoton } from "./insignia"

// Piezas de composición: título de pantalla, bloque con insignia, fila de KPI,
// propuesta IA y la marca "[por definir]".

export function Titulo({ indice, titulo, bajada, children }: { indice?: string; titulo: string; bajada?: ReactNode; children?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-linea pb-6">
      <div className="max-w-3xl">
        {indice && <p className="dato mb-2 text-sm text-grafito">{indice}</p>}
        <h1 className="titulo">{titulo}</h1>
        {bajada && <p className="subtitulo mt-3 text-grafito">{bajada}</p>}
      </div>
      {children}
    </header>
  )
}

export function Bloque({
  titulo,
  tipos,
  reglas = [],
  pie,
  children,
  className,
  accion,
}: {
  titulo: ReactNode
  tipos: TipoInsignia[]
  /** Si se dan, la insignia "Regla" es una por regla y abre su diálogo. */
  reglas?: string[]
  pie?: ReactNode
  children: ReactNode
  className?: string
  accion?: ReactNode
}) {
  const propuesta = tipos.includes("propuesta") && tipos.length === 1
  return (
    <section
      className={cn(
        "bg-superficie p-6",
        propuesta ? "border-2 border-dashed border-grafito" : "border border-linea",
        className,
      )}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="subtitulo">{titulo}</h2>
          {tipos.map((t) =>
            t === "regla" && reglas.length ? (
              reglas.map((id) => <ReglaBoton key={id} id={id} />)
            ) : (
              <Insignia key={t} tipo={t} />
            ),
          )}
        </div>
        {accion}
      </div>
      {children}
      {pie && <p className="mt-4 border-t border-linea pt-3 text-sm text-grafito">{pie}</p>}
    </section>
  )
}

/** KpiFila del Sistema de diseño: rótulo y meta a la izquierda, cifra a la derecha. */
export function Kpi({
  rotulo,
  valor,
  meta,
  cumple,
  pie,
}: {
  rotulo: ReactNode
  valor: ReactNode
  meta?: ReactNode
  cumple?: boolean | null
  pie?: ReactNode
}) {
  return (
    <div className="flex items-end justify-between gap-4 border-b border-linea py-4">
      <div>
        <p className="etiqueta">{rotulo}</p>
        {meta && <p className="mt-1 text-sm text-grafito">{meta}</p>}
        {pie && <p className="mt-1 text-sm text-grafito">{pie}</p>}
      </div>
      <p className={cn("cifra px-1 text-right", cumple === false && "bg-amarillo-suave")}>{valor}</p>
    </div>
  )
}

export function PorDefinir({ children = "[por definir]" }: { children?: ReactNode }) {
  return <span className="dato rounded-sm border border-dashed border-grafito px-1.5 text-grafito">{children}</span>
}

export function NotaPropuesta() {
  return (
    <p className="mb-3 text-sm text-grafito">
      Texto de muestra armado con plantillas sobre los mismos datos. En la versión real lo redactaría Claude. No decide nada.
    </p>
  )
}
