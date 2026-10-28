"use client"

import * as React from "react"
import Link from "next/link"
import {
  columnVisibilityFeature,
  createColumnHelper,
  createPaginatedRowModel,
  FlexRender,
  rowPaginationFeature,
  tableFeatures,
  useTable,
  type ColumnVisibilityState,
} from "@tanstack/react-table"
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  Columns3Icon,
  HistoryIcon,
} from "lucide-react"

import { Estado, Semaforo } from "@/components/ferremax/estado"
import { EstadoPedido } from "@/components/ferremax/estado-pedido"
import { BotonFirmar } from "@/components/ferremax/firmar"
import { EnlacesDocumentos } from "@/components/ferremax/enlaces-documentos"
import { HistorialPedido } from "@/components/ferremax/historial"
import { TiempoTotalPedido } from "@/components/ferremax/tiempo-total"
import { ReglaBoton } from "@/components/ferremax/insignia"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { fmtCOP } from "@/lib/formato"
import { A_TIEMPO, ASIGNAR_APROBADOR, FIRMAR_PEDIDO, RELOJ_APROBACION, RELOJ_BODEGA, RELOJ_TRANSPORTE, VER_INFO_CREDITO } from "@/lib/rules"
import { usePrototipo } from "@/lib/store"
import type { Pedido } from "@/lib/tipos"
import { cn } from "@/lib/utils"
import { NOMBRE_TRAMO, entregaDe, quienDecide, relojActual, tramoDe, coincideFiltro, type Filtro } from "@/lib/vistas"

// Tabla del bloque dashboard-01, sobre los pedidos de lib/data.ts.
// Sin arrastrar filas: el orden no lo cambia nadie a mano (BOD-3.2).

const features = tableFeatures({
  columnVisibilityFeature,
  rowPaginationFeature,
  paginatedRowModel: createPaginatedRowModel(),
})

const ayuda = createColumnHelper<typeof features, Pedido>()

const NOMBRE_COLUMNA: Record<string, string> = {
  valor_cop: "Monto",
  estado: "Estado",
  total: "Tiempo total",
  tramo: "Tramo actual",
  reloj: "Contra tope",
  decide: "Quién decide",
}

const PESTANAS: { clave: Filtro; nombre: string }[] = [
  { clave: "todos", nombre: "Todos" },
  { clave: "aprobar", nombre: "Aprobar" },
  { clave: "bodega", nombre: "Alistar y despachar" },
  { clave: "camino", nombre: "En camino" },
  { clave: "cerrado", nombre: "Cerrados" },
  { clave: "cerca", nombre: "Cerca del tope" },
  { clave: "fuera", nombre: "Fuera de tope" },
]

/** Primero lo que pide acción: fuera de tope, luego cerca, luego lo demás. */
function porUrgencia(a: Pedido, b: Pedido) {
  const orden = { vencido: 0, aviso: 1, "en-plazo": 2 }
  const ra = relojActual(a)
  const rb = relojActual(b)
  return (ra ? orden[ra.clase] : 3) - (rb ? orden[rb.clase] : 3) || (rb?.fraccion ?? 0) - (ra?.fraccion ?? 0)
}

export function DataTable({ filtro, onFiltro }: { filtro: Filtro; onFiltro: (f: Filtro) => void }) {
  const { pedidos, rol } = usePrototipo()
  const verInfo = VER_INFO_CREDITO.fn(rol)
  const [abiertos, setAbiertos] = React.useState<Set<string>>(new Set())
  // "Tramo actual" arranca oculta: las pestañas ya dicen el tramo. Se muestra desde "Columnas".
  const [columnVisibility, setColumnVisibility] = React.useState<ColumnVisibilityState>({ tramo: false })
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 })
  // Si el filtro cambia desde las tarjetas, la tabla vuelve a la primera página.
  const [filtroPrevio, setFiltroPrevio] = React.useState(filtro)
  if (filtro !== filtroPrevio) {
    setFiltroPrevio(filtro)
    setPagination((p) => ({ ...p, pageIndex: 0 }))
  }

  const alternar = (id: string) =>
    setAbiertos((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  const datos = React.useMemo(
    () => pedidos.filter((p) => coincideFiltro(p, filtro)).sort(porUrgencia),
    [pedidos, filtro],
  )

  const columnas = React.useMemo(
    () =>
      ayuda.columns([
        ayuda.display({
          id: "historial",
          header: () => <span className="sr-only">Historial</span>,
          cell: ({ row }) => {
            const abierto = abiertos.has(row.original.id_pedido)
            return (
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground"
                aria-expanded={abierto}
                aria-label={`${abierto ? "Ocultar" : "Ver"} historial de ${row.original.id_pedido}`}
                onClick={() => alternar(row.original.id_pedido)}
              >
                <ChevronRightIcon className={cn("transition-transform", abierto && "rotate-90")} />
              </Button>
            )
          },
          enableHiding: false,
        }),
        ayuda.accessor("id_pedido", {
          header: "Pedido",
          cell: ({ row }) => (
            <Link href={`/pedidos/${row.original.id_pedido}`} className="font-mono underline-offset-4 hover:underline">
              {row.original.id_pedido}
            </Link>
          ),
          enableHiding: false,
        }),
        ayuda.accessor("cliente", {
          header: "Cliente",
          cell: ({ row }) => (
            <span className="block max-w-52 truncate" title={row.original.cliente}>
              {row.original.cliente}
            </span>
          ),
          enableHiding: false,
        }),
        ...(verInfo
          ? [
              ayuda.accessor("valor_cop", {
                header: () => <div className="w-full text-right">Monto (COP)</div>,
                cell: ({ row }) => <div className="text-right font-mono">{fmtCOP(row.original.valor_cop)}</div>,
              }),
            ]
          : []),
        ayuda.display({ id: "estado", header: "Estado", cell: ({ row }) => <EstadoPedido pedido={row.original} /> }),
        ayuda.display({
          id: "total",
          header: () => (
            <span className="flex flex-col items-start gap-1 py-1.5">
              Tiempo total <ReglaBoton id={A_TIEMPO.id} soloId />
            </span>
          ),
          cell: ({ row }) => <TiempoTotalPedido pedido={row.original} />,
        }),
        ayuda.display({ id: "tramo", header: "Tramo actual", cell: ({ row }) => NOMBRE_TRAMO[tramoDe(row.original)] }),
        ayuda.display({
          id: "reloj",
          header: () => (
            <span className="flex flex-col items-start gap-1 py-1.5">
              Contra tope
              <span className="flex gap-1">
                <ReglaBoton id={RELOJ_APROBACION.id} soloId /> <ReglaBoton id={RELOJ_BODEGA.id} soloId />{" "}
                <ReglaBoton id={RELOJ_TRANSPORTE.id} soloId />
              </span>
            </span>
          ),
          cell: ({ row }) => {
            const r = relojActual(row.original)
            if (r) return <Semaforo reloj={r} />
            // En camino no hay tope, pero sí un aviso si nadie confirma la entrega (TRA-2).
            const entrega = tramoDe(row.original) === "camino" ? entregaDe(row.original) : null
            return entrega ? <Estado clase={entrega.estado.clase} palabra={entrega.estado.palabra} /> : <span className="text-muted-foreground">Sin tope</span>
          },
        }),
        ayuda.display({
          id: "decide",
          header: () => (
            <span className="flex flex-col items-start gap-1 py-1.5">
              Quién decide <ReglaBoton id={ASIGNAR_APROBADOR.id} soloId />
            </span>
          ),
          cell: ({ row }) => {
            return <span className="font-medium">{quienDecide(row.original).texto}</span>
          },
        }),
        ayuda.display({
          id: "accion",
          header: () => (
            <span className="flex flex-col items-start gap-1 py-1.5">
              Acción <ReglaBoton id={FIRMAR_PEDIDO.id} soloId />
            </span>
          ),
          cell: ({ row }) => <BotonFirmar pedido={row.original} />,
          enableHiding: false,
        }),
      ]),
    // `abiertos` cambia el ícono de la primera columna.
    [verInfo, abiertos],
  )

  const table = useTable({
    features,
    data: datos,
    columns: columnas,
    state: { columnVisibility, pagination },
    getRowId: (p) => p.id_pedido,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
  })

  const cuenta = (f: Filtro) => pedidos.filter((p) => coincideFiltro(p, f)).length
  const nColumnas = table.getVisibleLeafColumns().length

  return (
    <Tabs
      id="pedidos-tabla"
      value={filtro}
      onValueChange={(v) => {
        onFiltro(v as Filtro)
        setPagination((p) => ({ ...p, pageIndex: 0 }))
      }}
      className="w-full flex-col justify-start gap-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TabsList className="**:data-[slot=badge]:size-5 **:data-[slot=badge]:rounded-full **:data-[slot=badge]:bg-muted-foreground/30 **:data-[slot=badge]:px-1">
          {PESTANAS.map((p) => (
            <TabsTrigger key={p.clave} value={p.clave}>
              {p.nombre} <Badge variant="secondary">{cuenta(p.clave)}</Badge>
            </TabsTrigger>
          ))}
        </TabsList>
        <div className="flex items-center gap-2">
          {!verInfo && (
            <span className="text-sm text-muted-foreground">
              Tu rol no ve montos <ReglaBoton id={VER_INFO_CREDITO.id} soloId className="ml-1" />
            </span>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
              <Columns3Icon data-icon="inline-start" />
              Columnas
              <ChevronDownIcon data-icon="inline-end" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {table
                .getAllColumns()
                .filter((c) => c.getCanHide())
                .map((c) => (
                  <DropdownMenuCheckboxItem key={c.id} checked={c.getIsVisible()} onCheckedChange={(v) => c.toggleVisibility(!!v)}>
                    {NOMBRE_COLUMNA[c.id] ?? c.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="overflow-x-auto border border-linea bg-card">
        <Table className="text-[15px]">
          <TableHeader className="sticky top-0 z-10 bg-muted">
            {table.getHeaderGroups().map((g) => (
              <TableRow key={g.id}>
                {g.headers.map((h) => (
                  <TableHead key={h.id} colSpan={h.colSpan} className="etiqueta">
                    {h.isPlaceholder ? null : <FlexRender header={h} />}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => {
                const p = row.original
                const abierto = abiertos.has(p.id_pedido)
                const teToca = quienDecide(p).personas.includes(rol)
                const vencido = relojActual(p)?.clase === "vencido"
                return (
                  <React.Fragment key={row.id}>
                    <TableRow
                      className={cn(
                        teToca && "bg-amarillo-suave hover:bg-amarillo-suave",
                        vencido && "shadow-[inset_4px_0_0_var(--vencido)]",
                        abierto && "border-b-0",
                      )}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="py-3">
                          <FlexRender cell={cell} />
                        </TableCell>
                      ))}
                    </TableRow>
                    {abierto && (
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableCell colSpan={nColumnas} className="px-6 py-4 whitespace-normal">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <span className="etiqueta flex items-center gap-2">
                              <HistoryIcon className="size-4" /> Historial de actividad · {p.id_pedido}
                            </span>
                            <Link href={`/pedidos/${p.id_pedido}`} className="text-sm underline underline-offset-4">
                              Abrir ficha completa
                            </Link>
                          </div>
                          <EnlacesDocumentos pedido={p} className="mb-4" />
                          <HistorialPedido pedido={p} horizontal />
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={nColumnas} className="h-24 text-center">
                  No hay pedidos en este tramo.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between gap-4">
        <p className="hidden text-sm text-muted-foreground lg:block">
          Filas resaltadas: le tocan a {rol}. Borde rojo: fuera de tope. La flecha abre el historial.
        </p>
        <div className="ml-auto flex items-center gap-6">
          <span className="text-sm font-medium">
            Página {table.state.pagination.pageIndex + 1} de {Math.max(table.getPageCount(), 1)}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="hidden size-8 lg:flex" size="icon" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}>
              <span className="sr-only">Primera página</span>
              <ChevronsLeftIcon />
            </Button>
            <Button variant="outline" className="size-8" size="icon" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
              <span className="sr-only">Página anterior</span>
              <ChevronLeftIcon />
            </Button>
            <Button variant="outline" className="size-8" size="icon" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
              <span className="sr-only">Página siguiente</span>
              <ChevronRightIcon />
            </Button>
            <Button
              variant="outline"
              className="hidden size-8 lg:flex"
              size="icon"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Última página</span>
              <ChevronsRightIcon />
            </Button>
          </div>
        </div>
      </div>
    </Tabs>
  )
}
