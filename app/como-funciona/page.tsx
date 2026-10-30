"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Insignia, ReglaBoton } from "@/components/ferremax/insignia"
import { Titulo } from "@/components/ferremax/piezas"
import { MOMENTOS, tramos, type Momento } from "@/lib/flujo"
import { usePrototipo } from "@/lib/store"
import { cn } from "@/lib/utils"

// Abre la presentación: los 8 momentos, con su tipo, quién decide y dónde viven.
// Antes, las dos opciones para discutir sobre cómo entra la solicitud. Después, el transporte (momentos 7 y 8).

const OPCIONES = [
  {
    letra: "A",
    titulo: "Satélite: SAP sigue siendo la puerta de entrada",
    como: "El vendedor registra el pedido en SAP, como hoy. Cada día se suben aquí tres archivos de SAP (clientes, pedidos y cartera), se aprueba en la app y las decisiones vuelven a SAP en un archivo exportado. La herramienta cuida aprobar, alistar y la revisión del lunes.",
    reglas: ["PER-5", "CRED-1.1"],
    filas: [
      ["Quién", "El vendedor en SAP. Marcela o Sandra cargan los archivos y exportan las decisiones."],
      ["Qué cambia", "Nada en SAP. Entran tres archivos al día y sale uno de vuelta, con el formato de aprobaciones de SAP."],
      ["Para discutir", "La solicitud llega a la herramienta cuando se importa; el reloj cuenta desde SAP, así que ese rato ya es espera. Qué reporte de SAP saca el archivo: [por definir]."],
    ],
  },
  {
    letra: "B",
    titulo: "Solución completa: la solicitud nace aquí",
    como: "El vendedor crea la solicitud en la app. En ese momento ve quién la aprueba, qué fecha de salida de bodega puede prometer y cómo está la carga de la bodega.",
    reglas: ["PER-6", "CRED-1.1"],
    filas: [
      ["Quién", "Los vendedores."],
      ["Qué cambia", "El vendedor entra a la app y deja de prometer fechas a ojo."],
      ["Para discutir", "Cómo llega después el pedido a SAP: doble digitación o integración [por definir]. La capacidad de bodega es un dato, no una regla escrita."],
    ],
  },
] as const

function TarjetaMomento({ m, flecha }: { m: Momento; flecha: boolean }) {
  return (
    <article className="relative flex flex-col border border-linea bg-card p-5">
      {flecha && <ArrowRight aria-hidden className="absolute top-8 -right-[18px] z-10 size-5 bg-background text-grafito" />}
      <p className="font-mono text-sm text-grafito">({String(m.n).padStart(3, "0")})</p>
      <h2 className="mt-1 text-[22px] leading-tight font-medium tracking-tight">{m.titulo}</h2>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {m.tipos.map((t) => (t === "regla" ? m.reglas.map((id) => <ReglaBoton key={id} id={id} />) : <Insignia key={t} tipo={t} />))}
      </div>
      <p className="mt-3 flex-1 text-[15px]">{m.hace}</p>
      <dl className="mt-4 border-t border-linea pt-3 text-sm">
        <dt className="etiqueta text-grafito">Tipo</dt>
        <dd className="mb-2">{m.tipoTexto}</dd>
        <dt className="etiqueta text-grafito">Quién decide</dt>
        <dd className="mb-2 font-medium">{m.decide}</dd>
        <dt className="etiqueta text-grafito">Dónde vive</dt>
        <dd>
          <Link href={m.pantalla.href} className="underline underline-offset-4">
            {m.pantalla.nombre}
          </Link>
        </dd>
      </dl>
    </article>
  )
}

export default function ComoFunciona() {
  // Los topes se leen de las reglas: si alguien los edita, el diagrama cambia.
  usePrototipo()
  return (
    <>
      <Titulo
        indice="(001) Cómo funciona"
        titulo="Del pedido a crédito a la entrega en obra, con topes de tiempo hasta la salida de bodega"
        bajada="Ocho momentos: seis hasta que sale de bodega y dos de transporte. Las reglas calculan, la IA lee y redacta, las personas deciden."
      />

      <section aria-labelledby="entrada">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="entrada" className="subtitulo">
            <span className="mr-2 font-mono text-sm text-grafito">(000)</span>Antes del momento 1 · ¿por dónde entra la solicitud?
          </h2>
          <p className="text-sm text-grafito">Por decidir con los mentores. De aquí en adelante el flujo es el mismo.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {OPCIONES.map((o) => (
            <article key={o.letra} className="flex flex-col gap-3 border-2 border-dashed border-linea bg-card p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-tinta px-2 py-0.5 font-mono text-xs text-papel">Opción {o.letra}</span>
                <span className="rounded-full border border-dashed border-grafito px-2 py-0.5 text-xs text-grafito">Por decidir</span>
                {o.reglas.map((id) => (
                  <ReglaBoton key={id} id={id} soloId />
                ))}
              </div>
              <h3 className="text-[22px] leading-tight font-medium tracking-tight">{o.titulo}</h3>
              <p className="text-[15px]">{o.como}</p>
              <dl className="grid gap-2 border-t border-linea pt-3 text-sm">
                {o.filas.map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[8rem_1fr] gap-3">
                    <dt className="etiqueta text-grafito">{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
              <Link href="/solicitudes" className="mt-auto text-sm underline underline-offset-4">
                Probar la opción {o.letra}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <div className="overflow-x-auto pb-2">
        <div className="grid min-w-[1100px] grid-cols-6 gap-3">
          {tramos().map((t) => (
            <div
              key={t.clave}
              className={cn(
                "flex items-center justify-between gap-3 px-4 py-3",
                t.clave === "aprobar" ? "col-span-3 bg-tinta text-papel" : "col-span-2 bg-niebla",
              )}
            >
              <div>
                <p className="subtitulo">{t.rotulo}</p>
                <p className={cn("text-sm", t.clave === "aprobar" ? "text-papel/80" : "text-grafito")}>{t.detalle}</p>
              </div>
              <ReglaBoton id={t.regla} soloId className={t.clave === "aprobar" ? "border-papel bg-papel text-tinta" : ""} />
            </div>
          ))}
          <div className="flex flex-col justify-center border border-dashed border-linea px-4 py-3">
            <p className="subtitulo">Cada lunes</p>
            <p className="text-sm text-grafito">Sin tope: mira la semana</p>
          </div>

          {MOMENTOS.filter((m) => m.n <= 6).map((m, i) => (
            <TarjetaMomento key={m.n} m={m} flecha={i < 5} />
          ))}
        </div>
      </div>

      <section aria-labelledby="transporte">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="transporte" className="subtitulo">
            <span className="mr-2 font-mono text-sm text-grafito">(007–008)</span>Después de bodega · el transporte a la obra
          </h2>
          <p className="text-sm text-grafito">
            Sin tope: el transporte queda fuera del proyecto (Ops Charter). Aquí solo hay visibilidad y un aviso si nadie confirma la entrega.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {MOMENTOS.filter((m) => m.n > 6).map((m, i) => (
            <TarjetaMomento key={m.n} m={m} flecha={i === 0} />
          ))}
          <div className="flex flex-col justify-center gap-2 border-2 border-dashed border-linea bg-card p-5">
            <p className="etiqueta">Por decidir</p>
            <p className="text-[15px]">
              ¿Llegan las fotos por el chat de WhatsApp o por un enlace por entrega? Las dos están en{" "}
              <Link href="/transporte" className="underline underline-offset-4">
                Transporte
              </Link>
              , con la simulación de lo que manda el conductor.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <div className="bg-amarillo p-6 text-sobre-amarillo">
          <p className="subtitulo">&quot;La rutina avisa. No aprueba.&quot;</p>
          <p className="mt-3 text-sm">Política de aprobación de crédito (v1), sección 3</p>
        </div>
        <div className="border border-linea bg-card p-6">
          <p className="etiqueta">Un solo registro de verdad</p>
          <p className="mt-2 text-[15px]">
            Clientes y pedidos viven en <span className="font-mono">lib/data.ts</span>. Todas las pantallas son vistas calculadas
            sobre esos datos.
          </p>
        </div>
        <div className="border border-linea bg-card p-6">
          <p className="etiqueta">Una regla en un solo lugar</p>
          <p className="mt-2 text-[15px]">
            Montos, plazos y metas viven en <span className="font-mono">lib/rules.ts</span>, cada uno con su área y su dueño.{" "}
            <Link href="/reglas" className="underline underline-offset-4">
              Ver las reglas
            </Link>
          </p>
        </div>
      </section>
    </>
  )
}
