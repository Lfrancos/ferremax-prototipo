"use client"

import { useState } from "react"
import { PlusIcon, SearchIcon } from "lucide-react"
import { Estado } from "@/components/ferremax/estado"
import { ReglaBoton } from "@/components/ferremax/insignia"
import { NuevoCliente } from "@/components/ferremax/nuevo-cliente"
import { PorDefinir, Titulo } from "@/components/ferremax/piezas"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ULTIMO_ID_SAP } from "@/lib/data"
import { fmtCOP } from "@/lib/formato"
import { CREAR_CLIENTES, VER_INFO_CREDITO } from "@/lib/rules"
import { usePrototipo } from "@/lib/store"
import { chequeosDeCliente, cupoDisponible, estadoCartera } from "@/lib/vistas"

export default function Clientes() {
  const { clientes, cartera, pedidos, rol } = usePrototipo()
  const [busqueda, setBusqueda] = useState("")
  const verInfo = VER_INFO_CREDITO.fn(rol)
  const puedeCrear = CREAR_CLIENTES.fn(rol)

  const visibles = clientes
    .filter((c) => {
      const q = busqueda.trim().toLowerCase()
      if (!q) return true
      return [c.razon_social, ...(verInfo ? [c.id_cliente, c.nit, c.vendedor, c.sede, c.segmento] : [])].some((x) =>
        x.toLowerCase().includes(q),
      )
    })
    .sort((a, b) => a.razon_social.localeCompare(b.razon_social, "es"))

  const blanco = <PorDefinir>[en blanco]</PorDefinir>

  return (
    <>
      <Titulo
        indice="(008) Base de clientes"
        titulo="Clientes"
        bajada={
          verInfo
            ? "Maestro de clientes de SAP. El saldo y el atraso salen del último corte de cartera (ver Cartera)."
            : "Tu rol ve solo el nombre de cada cliente."
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <ReglaBoton id={VER_INFO_CREDITO.id} />
          <ReglaBoton id={CREAR_CLIENTES.id} />
          {puedeCrear && (
            <NuevoCliente trigger={<Button size="lg" className="px-4" />}>
              <PlusIcon data-icon="inline-start" />
              Nuevo cliente
            </NuevoCliente>
          )}
        </div>
      </Titulo>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder={verInfo ? "Buscar por nombre, NIT, ID, vendedor o sede" : "Buscar por nombre"}
            className="pl-8"
            aria-label="Buscar cliente"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {visibles.length} de {clientes.length} clientes
          {!puedeCrear && " · solo Sandra Beltrán crea clientes"}
        </p>
      </div>

      <div className="overflow-x-auto border border-linea bg-card">
        <Table className="text-[15px]">
          <TableHeader className="bg-muted">
            <TableRow>
              {verInfo && <TableHead className="etiqueta">ID</TableHead>}
              <TableHead className="etiqueta">Razón social</TableHead>
              {verInfo && (
                <>
                  <TableHead className="etiqueta">NIT</TableHead>
                  <TableHead className="etiqueta">Segmento · sede</TableHead>
                  <TableHead className="etiqueta">Vendedor</TableHead>
                  <TableHead className="etiqueta text-right">Plazo</TableHead>
                  <TableHead className="etiqueta text-right">Cupo (COP)</TableHead>
                  <TableHead className="etiqueta text-right">Saldo (COP)</TableHead>
                  <TableHead className="etiqueta text-right">Disponible (COP)</TableHead>
                  <TableHead className="etiqueta text-right">Atraso</TableHead>
                  <TableHead className="etiqueta text-right">Antigüedad</TableHead>
                  <TableHead className="etiqueta">Ya falla, sin contar el pedido</TableHead>
                  <TableHead className="etiqueta text-right">Pedidos</TableHead>
                </>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibles.map((c) => {
              const fallas = verInfo ? chequeosDeCliente(c, cartera) : []
              const e = estadoCartera(c.id_cliente, cartera)
              const disponible = cupoDisponible(c, e)
              const nuevo = Number(c.id_cliente.slice(4)) > ULTIMO_ID_SAP
              return (
                <TableRow key={c.id_cliente}>
                  {verInfo && <TableCell className="py-3 font-mono text-sm">{c.id_cliente}</TableCell>}
                  <TableCell className="py-3 font-medium">
                    {c.razon_social}
                    {nuevo && <span className="ml-2 rounded-full border border-dashed border-linea px-2 text-xs text-muted-foreground">nuevo en la demo</span>}
                  </TableCell>
                  {verInfo && (
                    <>
                      <TableCell className="font-mono text-sm">{c.nit}</TableCell>
                      <TableCell className="text-sm">
                        {c.segmento} · {c.sede}
                      </TableCell>
                      <TableCell className="text-sm">{c.vendedor}</TableCell>
                      <TableCell className="text-right font-mono">{c.plazo_dias} d</TableCell>
                      <TableCell className="text-right font-mono">{fmtCOP(c.cupo_cop)}</TableCell>
                      <TableCell className="text-right font-mono">{e.saldo === null ? blanco : fmtCOP(e.saldo)}</TableCell>
                      <TableCell className="text-right font-mono">{disponible === null ? "—" : fmtCOP(disponible)}</TableCell>
                      <TableCell className="text-right font-mono">{e.atraso === null ? blanco : `${e.atraso} d`}</TableCell>
                      <TableCell className="text-right font-mono">{c.antiguedad_anios} a</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          {fallas.length === 0 && <span className="text-sm text-muted-foreground">—</span>}
                          {fallas.map(({ regla, resultado }) => (
                            <span key={regla.id} className="flex items-center gap-1">
                              <Estado
                                clase={resultado.pasa === null ? "incompleta" : "aviso"}
                                palabra={resultado.pasa === null ? "Dato en blanco" : regla.titulo.split(" · ")[1]}
                                className="text-xs"
                              />
                              <ReglaBoton id={regla.id} soloId />
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">{pedidos.filter((p) => p.id_cliente === c.id_cliente).length}</TableCell>
                    </>
                  )}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
      {verInfo && (
        <p className="text-sm text-muted-foreground">
          Fuente: maestro de clientes de SAP (hoja Clientes). Saldo y atraso: corte de cartera {cartera.archivo} (CART-1 y CART-2). La
          columna &quot;Ya falla&quot; corre los chequeos que dependen solo del cliente: si falla atraso o antigüedad, sus pedidos
          van a Andrés; si un dato está en blanco, quedan incompletos. El máximo por pedido depende de cada pedido.
        </p>
      )}
    </>
  )
}
