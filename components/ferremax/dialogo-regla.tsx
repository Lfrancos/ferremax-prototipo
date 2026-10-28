"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { fmtFechaHora } from "@/lib/fechas"
import { MOMENTOS } from "@/lib/flujo"
import { fmtCOP } from "@/lib/formato"
import {
  EDITAR_REGLA,
  REGLAS,
  numeroDelDocumento,
  reglaPorId,
  validarNumero,
  type Campo,
  type Regla,
} from "@/lib/rules"
import { usePrototipo } from "@/lib/store"
import { PorDefinir } from "./piezas"

function fmtValor(n: number, unidad: Campo["unidad"]) {
  if (unidad === "COP") return `COP ${fmtCOP(n)}`
  if (unidad === "%") return `${n}%`
  if (unidad === "") return String(n)
  return `${n} ${unidad === "años" && n === 1 ? "año" : unidad === "días" && n === 1 ? "día" : unidad}`
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-linea px-2.5 py-0.5 text-xs font-medium">{children}</span>
}

function EditarNumero({ r, clave, campo }: { r: Regla; clave: string; campo: Campo }) {
  const { editarRegla } = usePrototipo()
  const actual = r.valores![clave]
  const [texto, setTexto] = useState(String(actual))
  const [motivo, setMotivo] = useState("")
  const [error, setError] = useState<string | null>(null)

  function guardar() {
    const valor = Number(texto.replace(/\./g, "").replace(",", "."))
    const problema = validarNumero(r.id, clave, valor)
    if (problema) return setError(problema)
    if (valor === actual) return setError("Es el mismo número. No hay nada que cambiar.")
    if (!motivo.trim()) return setError("Escribe qué cambió y por qué. El cambio queda en el historial de la regla.")
    editarRegla(r.id, clave, valor, motivo.trim())
    setMotivo("")
    setError(null)
    toast.success(`${r.id} actualizada`, { description: "Todas las pantallas ya usan el número nuevo." })
  }

  return (
    <div className="mt-3 grid gap-2 border-t border-linea pt-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="grid gap-1.5">
          <Label htmlFor={`${r.id}-${clave}`} className="etiqueta">
            Nuevo valor ({campo.unidad || "número"})
          </Label>
          <Input
            id={`${r.id}-${clave}`}
            inputMode="numeric"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            className="w-44 bg-papel font-mono"
            aria-invalid={!!error}
          />
        </div>
        <Button onClick={guardar}>Guardar cambio</Button>
      </div>
      <Textarea
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        placeholder="Qué cambió y por qué (queda en el historial)"
        className="min-h-16 bg-papel"
      />
      {error && <p className="text-sm text-vencido">{error}</p>}
    </div>
  )
}

/** Id de otra regla: al hacer clic, el diálogo pasa a esa regla. */
function Enlace({ id }: { id: string }) {
  const { abrirRegla } = usePrototipo()
  return (
    <button type="button" onClick={() => abrirRegla(id)} className="font-mono underline underline-offset-4">
      {id}
    </button>
  )
}

function Contenido({ r }: { r: Regla }) {
  const { rol, cambios } = usePrototipo()
  const puedeEditar = EDITAR_REGLA.fn(rol, r)
  const base = r.seApoyaEn ? reglaPorId(r.seApoyaEn) : null
  const casos = REGLAS.filter((x) => x.seApoyaEn === r.id)
  const heredada = r.heredaDe ? reglaPorId(r.heredaDe) : null
  const historial = cambios.filter((c) => c.regla === r.id)
  const momentos = MOMENTOS.filter((m) => r.momentos.includes(m.n))
  const propios = Object.entries(r.campos ?? {})
  const heredados = Object.keys(r.valores ?? {}).filter((k) => !r.campos?.[k])

  return (
    <>
      <DialogHeader>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-tinta px-2.5 py-0.5 font-mono text-xs text-papel">■ {r.id}</span>
          <Chip>Área: {r.documento.area}</Chip>
          <Chip>{r.fuente}</Chip>
        </div>
        <DialogTitle className="mt-2 text-2xl leading-tight font-medium tracking-tight">{r.titulo}</DialogTitle>
        <DialogDescription>
          {r.documento.nombre} · {r.seccion}
        </DialogDescription>
      </DialogHeader>

      <div className="bg-amarillo px-5 py-4 text-sobre-amarillo">
        <p className="text-lg leading-snug font-medium">{r.texto}</p>
        <p className="mt-2 text-xs">Fuente: {r.documento.ruta}</p>
      </div>

      {(propios.length > 0 || heredados.length > 0) && (
        <section>
          <h3 className="etiqueta mb-2 text-grafito">Números de la regla</h3>
          <div className="divide-y divide-linea border-y border-linea">
            {propios.map(([clave, campo]) => {
              const actual = r.valores![clave]
              const doc = numeroDelDocumento(r.id, clave)
              return (
                <div key={clave} className="py-3">
                  <div className="flex items-baseline justify-between gap-4">
                    <span>{campo.etiqueta}</span>
                    <span className="font-mono text-lg">{fmtValor(actual, campo.unidad)}</span>
                  </div>
                  {doc !== actual && (
                    <p className="mt-1 text-sm text-aviso">Cambiado en esta demo. El documento dice {fmtValor(doc, campo.unidad)}.</p>
                  )}
                  {puedeEditar && <EditarNumero r={r} clave={clave} campo={campo} />}
                </div>
              )
            })}
            {heredados.map((clave) => (
              <div key={clave} className="flex items-baseline justify-between gap-4 py-3 text-sm">
                <span className="text-grafito">
                  {clave === "tope_dias" ? "Día límite" : clave === "meta_h" ? "Meta (horas)" : clave}: viene de{" "}
                  {heredada && <Enlace id={heredada.id} />}
                </span>
                <span className="font-mono">{r.valores![clave]}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="grid gap-4 sm:grid-cols-2">
        <div>
          <h3 className="etiqueta mb-1 text-grafito">Quién la puede editar</h3>
          <p>{r.documento.dueno ?? <PorDefinir />}</p>
          <p className="mt-1 text-sm text-grafito">
            {puedeEditar
              ? "Eres el dueño de este documento: puedes cambiar sus números."
              : propios.length
                ? `La ves como ${rol}. Solo el dueño del documento la cambia.`
                : "Esta regla no tiene números: su texto se cambia en el documento."}{" "}
            <Enlace id={EDITAR_REGLA.id} />
          </p>
          {r.documento.nota && <p className="mt-1 text-sm text-grafito">{r.documento.nota}</p>}
        </div>
        <div>
          <h3 className="etiqueta mb-1 text-grafito">Dónde actúa</h3>
          <ul className="text-sm">
            {momentos.map((m) => (
              <li key={m.n}>
                Momento {m.n} · {m.titulo} <span className="text-grafito">({m.pantalla.nombre})</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {(base || casos.length > 0) && (
        <section className="text-sm">
          {base && (
            <p>
              Se resuelve con <Enlace id={base.id} />: {base.titulo}. El caso no copia la regla.
            </p>
          )}
          {casos.length > 0 && (
            <p>
              Casos que se apoyan en esta regla:{" "}
              {casos.map((c, i) => (
                <span key={c.id}>
                  {i > 0 && " · "}
                  <Enlace id={c.id} />
                </span>
              ))}
            </p>
          )}
        </section>
      )}

      <section>
        <h3 className="etiqueta mb-1 text-grafito">Historial de cambios en esta demo</h3>
        {historial.length ? (
          <ul className="divide-y divide-linea border-y border-linea text-sm">
            {historial.map((c, i) => (
              <li key={i} className="py-2">
                <span className="font-medium">{c.quien}</span> · {fmtFechaHora(c.fecha)} · {r.campos?.[c.clave]?.etiqueta}:{" "}
                <span className="font-mono">
                  {fmtValor(c.antes, r.campos?.[c.clave]?.unidad ?? "")} → {fmtValor(c.despues, r.campos?.[c.clave]?.unidad ?? "")}
                </span>
                <p className="text-grafito">{c.motivo}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-grafito">Sin cambios. Rige lo que dice el documento.</p>
        )}
      </section>
    </>
  )
}

/** Un solo diálogo para todas las reglas. Se abre con abrirRegla(id). */
export function DialogoRegla() {
  const { reglaAbierta, abrirRegla } = usePrototipo()
  const r = reglaAbierta ? reglaPorId(reglaAbierta) : null
  return (
    <Dialog open={!!r} onOpenChange={(abierto) => !abierto && abrirRegla(null)}>
      <DialogContent className="max-h-[90vh] gap-5 overflow-y-auto rounded-none sm:max-w-2xl">
        {r && <Contenido key={r.id} r={r} />}
      </DialogContent>
    </Dialog>
  )
}
