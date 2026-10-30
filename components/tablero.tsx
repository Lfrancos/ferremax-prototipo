"use client"

import { useState } from "react"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { PasosPedido } from "@/components/ferremax/pasos"
import { DataTable } from "@/components/data-table"
import { SectionCards } from "@/components/section-cards"
import type { Filtro } from "@/lib/vistas"

/** Las tarjetas y la tabla comparten el filtro: pulsar una tarjeta es lo mismo que pulsar su pestaña. */
export function Tablero() {
  const [filtro, setFiltro] = useState<Filtro>("todos")
  return (
    <>
      <PasosPedido />
      <SectionCards filtro={filtro} onFiltro={setFiltro} />
      <ChartAreaInteractive />
      <DataTable filtro={filtro} onFiltro={setFiltro} />
    </>
  )
}
