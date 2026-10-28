"use client"

import Link from "next/link"
import { ReglaBoton } from "@/components/ferremax/insignia"
import { PorDefinir } from "@/components/ferremax/piezas"
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { fmtRango } from "@/lib/fechas"
import { fmtPct } from "@/lib/formato"
import {
  A_TIEMPO,
  ASIGNAR_APROBADOR,
  EVIDENCIA_ENTREGA,
  FECHA_LIMITE,
  RELOJ_APROBACION,
  RELOJ_BODEGA,
  RELOJ_TRANSPORTE,
} from "@/lib/rules"
import { usePrototipo } from "@/lib/store"
import { cn } from "@/lib/utils"
import { resumenTablero, semanaAnterior, type Filtro } from "@/lib/vistas"

export function SectionCards({ filtro, onFiltro }: { filtro: Filtro; onFiltro: (f: Filtro) => void }) {
  const { pedidos } = usePrototipo()
  const r = resumenTablero(pedidos)
  const semana = semanaAnterior()
  const apr = RELOJ_APROBACION.valores!
  const bod = RELOJ_BODEGA.valores!
  const meta = A_TIEMPO.valores!

  const tarjetas = [
    {
      rotulo: "Por aprobar",
      filtro: "aprobar" as Filtro,
      valor: String(r.porAprobar),
      reglas: [ASIGNAR_APROBADOR.id],
      linea: "En el tramo Aprobar",
      pie: "Cada uno con un solo aprobador, que sale de la tabla.",
    },
    {
      rotulo: "Cerca del tope",
      filtro: "cerca" as Filtro,
      valor: String(r.cercaDelTope),
      reglas: [RELOJ_APROBACION.id, RELOJ_BODEGA.id],
      linea: "La rutina ya avisó",
      pie: `Aviso a las ${apr.aviso_h} h · día ${bod.aviso_dia} · vence hoy`,
    },
    {
      rotulo: "Fuera de tope",
      filtro: "fuera" as Filtro,
      valor: String(r.fueraDeTope),
      reglas: [RELOJ_APROBACION.id, FECHA_LIMITE.id],
      linea: r.fueraDeTope ? "Marcela llama hoy" : "Nada fuera de tope",
      pie: `Más de ${apr.tope_h} h por aprobar · más de ${bod.tope_dias} días en bodega`,
      alerta: r.fueraDeTope > 0,
    },
    {
      rotulo: "En camino",
      filtro: "camino" as Filtro,
      valor: String(r.enCamino),
      reglas: [RELOJ_TRANSPORTE.id, EVIDENCIA_ENTREGA.id],
      linea: r.conAlertaDeEntrega ? `${r.conAlertaDeEntrega} ${r.conAlertaDeEntrega === 1 ? "entrega con alerta" : "entregas con alerta"}` : "Ninguna entrega con alerta",
      pie: `${r.sinConfirmar} sin confirmar (más de ${RELOJ_TRANSPORTE.valores!.aviso_h} h) · sin tope`,
      alerta: r.conAlertaDeEntrega > 0,
    },
    {
      rotulo: "% a tiempo",
      valor: r.aTiempo.valor === null ? null : fmtPct(r.aTiempo.valor),
      reglas: [A_TIEMPO.id],
      linea: `${r.aTiempo.detalle} salieron en ${meta.dias} días o menos · meta ${meta.meta_pct}%`,
      pie: `Despachados la semana del ${fmtRango(semana.desde, semana.hasta)}`,
      bajoMeta: r.aTiempo.cumple === false,
    },
  ]

  /** Pulsar una tarjeta filtra la tabla de abajo con el mismo criterio. Pulsarla otra vez quita el filtro. */
  function alternar(f: Filtro) {
    const nuevo = filtro === f ? "todos" : f
    onFiltro(nuevo)
    if (nuevo !== "todos") document.getElementById("pedidos-tabla")?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const SUPERPUESTO = "absolute inset-0 z-0 cursor-pointer outline-offset-2 focus-visible:outline-2 focus-visible:outline-tinta"

  return (
    <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:rounded-none *:data-[slot=card]:shadow-none @xl/main:grid-cols-2 @5xl/main:grid-cols-5">
      {tarjetas.map((t) => {
        const activa = t.filtro !== undefined && filtro === t.filtro
        return (
          <Card
            key={t.rotulo}
            className={cn(
              "@container/card relative transition-colors hover:bg-muted/40",
              t.alerta && "shadow-[inset_4px_0_0_var(--vencido)]!",
              activa && "bg-amarillo-suave ring-2 ring-tinta hover:bg-amarillo-suave",
            )}
          >
            {t.filtro ? (
              <button
                type="button"
                aria-pressed={activa}
                aria-label={activa ? `Quitar el filtro ${t.rotulo}` : `Filtrar la tabla: ${t.rotulo}`}
                onClick={() => alternar(t.filtro!)}
                className={SUPERPUESTO}
              />
            ) : (
              <Link href="/revision" aria-label="Abrir la revisión del lunes" className={SUPERPUESTO} />
            )}
            <CardHeader>
              <CardDescription className="etiqueta">{t.rotulo}</CardDescription>
              <CardTitle className={cn("text-5xl font-medium tracking-tight tabular-nums", t.bajoMeta && "w-fit bg-amarillo-suave px-1")}>
                {t.valor ?? <PorDefinir />}
              </CardTitle>
              <CardAction className="flex flex-col items-end gap-1">
                {t.reglas.map((id) => (
                  <ReglaBoton key={id} id={id} soloId className="relative z-10" />
                ))}
              </CardAction>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1 text-sm">
              <div className="font-medium">{t.linea}</div>
              <div className="text-muted-foreground">{t.pie}</div>
              <div className="etiqueta mt-1 text-grafito">
                {t.filtro ? (activa ? "Filtrando la tabla · pulsa para quitar" : "Pulsa para filtrar la tabla") : "Pulsa para abrir la revisión"}
              </div>
            </CardFooter>
          </Card>
        )
      })}
    </div>
  )
}
