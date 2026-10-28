"use client"

import { useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { HOY } from "@/lib/data"
import { fmtDia, fmtFechaHora } from "@/lib/fechas"
import { fmtCOP } from "@/lib/formato"
import { ASIGNAR_APROBADOR, CREAR_SOLICITUD, ENTRADA_A_LA_FILA, FECHA_LIMITE, RELOJ_APROBACION, VER_INFO_CREDITO } from "@/lib/rules"
import { usePrototipo } from "@/lib/store"
import type { PedidoRegistro } from "@/lib/tipos"
import { asignacion, promesaDeSalida, siguienteIdApp, unirPedidos } from "@/lib/vistas"
import { CargaBodega } from "./carga-bodega"
import { Bloque, PorDefinir } from "./piezas"

/** "6.250.000" o "6250000" → 6250000. */
const leerPesos = (t: string) => {
  const n = Number(t.replace(/[.\s$]/g, ""))
  return t.trim() && Number.isFinite(n) ? n : null
}

export function CrearSolicitud() {
  const { clientes, cartera, pedidos, rol, agregarPedidos } = usePrototipo()
  const puede = CREAR_SOLICITUD.fn(rol)
  const verInfo = VER_INFO_CREDITO.fn(rol)
  const ordenados = [...clientes].sort((a, b) => a.razon_social.localeCompare(b.razon_social, "es"))
  const [idCliente, setIdCliente] = useState<string>(
    ordenados.find((c) => c.vendedor === rol)?.id_cliente ?? ordenados[0].id_cliente,
  )
  const [valor, setValor] = useState("")
  const [lineas, setLineas] = useState("1")
  const [nota, setNota] = useState("")
  const [error, setError] = useState<string | null>(null)

  const id = siguienteIdApp(pedidos)
  const pesos = leerPesos(valor)
  const nLineas = Number(lineas)
  const borrador: PedidoRegistro = {
    id_pedido: id,
    id_cliente: idCliente,
    valor_cop: pesos ?? 0,
    lineas: Number.isInteger(nLineas) && nLineas > 0 ? nLineas : 1,
    origen: "App",
    eventos: [
      { accion: "solicitado", fecha: HOY, quien: rol, motivo: nota.trim() || "Creada en la app." },
      { accion: "por_aprobar", fecha: HOY, quien: "Sistema" },
    ],
  }
  const vista = unirPedidos([borrador], clientes, cartera)[0]
  const a = asignacion(vista)
  const promesa = promesaDeSalida(HOY)
  const mias = pedidos.filter((p) => p.origen === "App" && p.eventos[0].quien === rol)

  function crear() {
    if (pesos === null || pesos <= 0) return setError("Escribe el valor del pedido en pesos.")
    if (!Number.isInteger(nLineas) || nLineas <= 0) return setError("Las líneas tienen que ser un número entero mayor que 0.")
    agregarPedidos([borrador])
    toast.success(`${id} creada`, { description: `La aprueba ${a.texto}.` })
    setValor("")
    setLineas("1")
    setNota("")
    setError(null)
  }

  if (!puede)
    return (
      <Bloque titulo="Crear solicitud" tipos={["humano"]} reglas={[CREAR_SOLICITUD.id]}>
        <p className="text-[15px]">
          En esta opción las solicitudes las crean los vendedores. Para probarla, cambia el rol a <strong className="font-medium">Édinson Rojas</strong> en
          &quot;Ver como&quot;, abajo en el sidebar.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">{CREAR_SOLICITUD.texto}</p>
      </Bloque>
    )

  return (
    <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
      <div className="flex flex-col gap-6">
        <Bloque titulo={`Nueva solicitud · ${id}`} tipos={["humano"]} reglas={[CREAR_SOLICITUD.id]}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="cliente" className="etiqueta">
                Cliente
              </Label>
              <Select value={idCliente} onValueChange={(v) => v && setIdCliente(v as string)}>
                <SelectTrigger id="cliente" className="w-full">
                  <SelectValue>{clientes.find((c) => c.id_cliente === idCliente)?.razon_social}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {ordenados.map((c) => (
                    <SelectItem key={c.id_cliente} value={c.id_cliente}>
                      {c.razon_social}
                      {c.vendedor === rol && <span className="text-xs text-muted-foreground">· tu cliente</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="valor" className="etiqueta">
                Valor del pedido (COP)
              </Label>
              <Input id="valor" inputMode="numeric" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="6.250.000" className="font-mono" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="lineas" className="etiqueta">
                Líneas
              </Label>
              <Input id="lineas" inputMode="numeric" value={lineas} onChange={(e) => setLineas(e.target.value)} className="font-mono" />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="nota" className="etiqueta">
                Nota para quien aprueba (opcional)
              </Label>
              <Textarea id="nota" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Obra, urgencia, contexto" className="min-h-16" />
            </div>
          </div>
          {error && <p className="mt-3 text-sm text-vencido">{error}</p>}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button size="lg" className="px-4" onClick={crear}>
              Crear solicitud
            </Button>
            <span className="text-sm text-muted-foreground">
              Se registra con fecha {fmtFechaHora(HOY)} · El número definitivo de SAP llega después <PorDefinir />
            </span>
          </div>
        </Bloque>

        {mias.length > 0 && (
          <Bloque titulo="Tus solicitudes de hoy" tipos={["regla"]} reglas={[ASIGNAR_APROBADOR.id]}>
            <ul className="divide-y divide-linea border-y border-linea text-[15px]">
              {mias.map((p) => (
                <li key={p.id_pedido} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                  <Link href={`/pedidos/${p.id_pedido}`} className="font-mono underline-offset-4 hover:underline">
                    {p.id_pedido}
                  </Link>
                  <span className="flex-1">{p.cliente}</span>
                  <span className="font-mono">{fmtCOP(p.valor_cop)}</span>
                  <span className="font-medium">{asignacion(p).texto}</span>
                </li>
              ))}
            </ul>
          </Bloque>
        )}
      </div>

      <div className="flex flex-col gap-6">
        <Bloque titulo="Quién la aprueba" tipos={["regla"]} reglas={[ASIGNAR_APROBADOR.id]}>
          <p className="titulo">{a.texto}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {verInfo ? a.porque : "El porqué usa información de crédito, que tu rol no ve (PER-1)."} Cambia con el cliente y el valor.
          </p>
        </Bloque>

        <Bloque
          titulo="Fecha que puedes prometer"
          tipos={["regla"]}
          reglas={[RELOJ_APROBACION.id, ENTRADA_A_LA_FILA.id, FECHA_LIMITE.id]}
          pie="Si cada tramo va en plazo. El transporte a la obra no está incluido: queda fuera del proyecto (Ops Charter)."
        >
          <dl className="divide-y divide-linea border-y border-linea text-[15px]">
            <div className="flex justify-between gap-4 py-2.5">
              <dt className="text-muted-foreground">Aprobada a más tardar</dt>
              <dd>{fmtFechaHora(promesa.aprobarAntesDe)}</dd>
            </div>
            <div className="flex justify-between gap-4 py-2.5">
              <dt className="text-muted-foreground">Entra en la lista de bodega</dt>
              <dd>{fmtFechaHora(promesa.entraEnLista)}</dd>
            </div>
            <div className="flex justify-between gap-4 py-2.5">
              <dt className="font-medium">Sale de bodega a más tardar</dt>
              <dd className="text-xl font-medium">{fmtDia(promesa.saleAMasTardar)}</dd>
            </div>
          </dl>
        </Bloque>

        <Bloque titulo="Cómo está la bodega" tipos={[]}>
          <CargaBodega />
        </Bloque>
      </div>
    </div>
  )
}
