"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { ReglaBoton } from "@/components/ferremax/insignia"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { HOY } from "@/lib/data"
import { fmtDia, fmtFechaHora } from "@/lib/fechas"
import { usePrototipo } from "@/lib/store"
import { abiertosPorDia } from "@/lib/vistas"

// Pedidos abiertos al cierre de cada día, por tramo. Serie 1 (tinta) = aprobación,
// serie 2 (grafito) = bodega, como pide el Sistema de diseño.

const chartConfig = {
  aprobar: { label: "Esperando aprobación", color: "var(--chart-1)" },
  bodega: { label: "Aprobados, sin salir de bodega", color: "var(--chart-2)" },
} satisfies ChartConfig

const RANGOS = { "7": "Últimos 7 días", "11": "Desde el 20 de noviembre" } as const

export function ChartAreaInteractive() {
  const { pedidos } = usePrototipo()
  const [rango, setRango] = React.useState<keyof typeof RANGOS>("11")
  const datos = abiertosPorDia(pedidos, Number(rango))

  return (
    <Card className="@container/card rounded-none shadow-none">
      <CardHeader>
        <CardTitle className="text-lg font-medium">Pedidos abiertos por día</CardTitle>
        <CardDescription>
          Al cierre de cada día; hoy, al {fmtFechaHora(HOY)}. Solo los pedidos de la demo.
        </CardDescription>
        <CardAction className="flex items-center gap-2">
          <ReglaBoton id="CRED-3.1" soloId />
          <ReglaBoton id="BOD-4.1" soloId />
          <ToggleGroup
            multiple={false}
            value={[rango]}
            onValueChange={(v) => v[0] && setRango(v[0] as keyof typeof RANGOS)}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:px-4! @[640px]/card:flex"
          >
            {Object.entries(RANGOS).map(([k, v]) => (
              <ToggleGroupItem key={k} value={k}>
                {v}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-2 sm:px-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[240px] w-full">
          <AreaChart data={datos} margin={{ left: 0, right: 12 }}>
            <CartesianGrid vertical={false} stroke="var(--linea)" />
            <XAxis
              dataKey="fecha"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={24}
              tickFormatter={(v: string) => fmtDia(`${v}T00:00`)}
            />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent labelFormatter={(v) => fmtDia(`${v}T00:00`)} indicator="dot" />}
            />
            <Area dataKey="aprobar" type="monotone" fill="var(--color-aprobar)" fillOpacity={0.85} stroke="var(--color-aprobar)" stackId="a" />
            <Area dataKey="bodega" type="monotone" fill="var(--color-bodega)" fillOpacity={0.5} stroke="var(--color-bodega)" stackId="a" />
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
