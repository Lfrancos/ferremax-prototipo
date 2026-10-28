"use client"

import { useState, type ReactElement, type ReactNode } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ULTIMO_ID_SAP } from "@/lib/data"
import { CREAR_CLIENTES } from "@/lib/rules"
import { usePrototipo } from "@/lib/store"
import { SEDES, SEGMENTOS, type Cliente, type Sede, type Segmento } from "@/lib/tipos"
import { ReglaBoton } from "./insignia"

// Alta de un cliente con los campos del maestro de SAP (hoja Clientes).
// El saldo y el atraso no van aquí: salen del corte de cartera. Solo lo ve quien tiene CREAR_CLIENTES (Sandra).

const VACIO = {
  razon_social: "",
  nit: "",
  segmento: "Constructora" as Segmento,
  sede: "Bogotá" as Sede,
  vendedor: "",
  plazo_dias: "30",
  cupo_cop: "",
  antiguedad_anios: "0",
}

type Formulario = typeof VACIO

/** "30.000.000" o "30000000" → 30000000. Vacío → null. */
function numero(texto: string): number | null {
  const limpio = texto.replace(/\./g, "").replace(/\s/g, "").replace(",", ".")
  if (!limpio) return null
  const n = Number(limpio)
  return Number.isFinite(n) ? n : NaN
}

function Campo({ id, etiqueta, ayuda, children }: { id: string; etiqueta: string; ayuda?: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="etiqueta">
        {etiqueta}
      </Label>
      {children}
      {ayuda && <p className="text-xs text-muted-foreground">{ayuda}</p>}
    </div>
  )
}

export function NuevoCliente({ trigger, children }: { trigger: ReactElement; children: ReactNode }) {
  const { clientes, agregarCliente, rol } = usePrototipo()
  const [abierto, setAbierto] = useState(false)
  const [f, setF] = useState<Formulario>(VACIO)
  const [errores, setErrores] = useState<Partial<Record<keyof Formulario, string>>>({})

  const cambiar = (k: keyof Formulario) => (v: string) => setF((x) => ({ ...x, [k]: v }))
  const siguienteId = `CLI-${String(ULTIMO_ID_SAP + 1 + clientes.filter((c) => Number(c.id_cliente.slice(4)) > ULTIMO_ID_SAP).length).padStart(3, "0")}`

  function guardar() {
    const e: typeof errores = {}
    const nombre = f.razon_social.trim()
    if (!nombre) e.razon_social = "Escribe la razón social."
    else if (clientes.some((c) => c.razon_social.toLowerCase() === nombre.toLowerCase()))
      e.razon_social = "Ya hay un cliente con esa razón social."
    if (!/^\d{3}\.\d{3}\.\d{3}-\d$/.test(f.nit.trim())) e.nit = "Formato 000.000.000-0, como en SAP."
    else if (clientes.some((c) => c.nit === f.nit.trim())) e.nit = "Ya hay un cliente con ese NIT."
    if (!f.vendedor.trim()) e.vendedor = "Escribe el vendedor asignado."
    const plazo = numero(f.plazo_dias)
    if (plazo === null || Number.isNaN(plazo) || plazo <= 0) e.plazo_dias = "Días mayores que 0."
    const cupo = numero(f.cupo_cop)
    if (cupo === null || Number.isNaN(cupo) || cupo <= 0) e.cupo_cop = "Cupo en pesos, mayor que 0."
    const antiguedad = numero(f.antiguedad_anios)
    if (antiguedad === null || Number.isNaN(antiguedad) || antiguedad < 0) e.antiguedad_anios = "Años, 0 o más."
    setErrores(e)
    if (Object.keys(e).length) return

    const cliente: Cliente = {
      id_cliente: siguienteId,
      nit: f.nit.trim(),
      razon_social: nombre,
      segmento: f.segmento,
      sede: f.sede,
      vendedor: f.vendedor.trim(),
      plazo_dias: plazo!,
      cupo_cop: cupo!,
      antiguedad_anios: antiguedad!,
    }
    agregarCliente(cliente)
    toast.success(`${cliente.razon_social} creado`, { description: `${cliente.id_cliente} · por ${rol}` })
    setF(VACIO)
    setAbierto(false)
  }

  const err = (k: keyof Formulario) => errores[k] && <p className="text-xs text-vencido">{errores[k]}</p>

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger render={trigger}>{children}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-none sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-medium">Nuevo cliente · {siguienteId}</DialogTitle>
          <DialogDescription>
            Campos del maestro de clientes de SAP. <ReglaBoton id={CREAR_CLIENTES.id} soloId className="ml-1" />
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Campo id="razon_social" etiqueta="Razón social">
              <Input id="razon_social" value={f.razon_social} onChange={(e) => cambiar("razon_social")(e.target.value)} placeholder="Constructora Ejemplo S.A.S." />
              {err("razon_social")}
            </Campo>
          </div>
          <Campo id="nit" etiqueta="NIT">
            <Input id="nit" value={f.nit} onChange={(e) => cambiar("nit")(e.target.value)} placeholder="900.123.456-7" className="font-mono" />
            {err("nit")}
          </Campo>
          <Campo id="vendedor" etiqueta="Vendedor asignado">
            <Input id="vendedor" value={f.vendedor} onChange={(e) => cambiar("vendedor")(e.target.value)} />
            {err("vendedor")}
          </Campo>
          <Campo id="segmento" etiqueta="Segmento">
            <Select value={f.segmento} onValueChange={(v) => v && cambiar("segmento")(v as string)}>
              <SelectTrigger id="segmento" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SEGMENTOS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Campo>
          <Campo id="sede" etiqueta="Sede principal">
            <Select value={f.sede} onValueChange={(v) => v && cambiar("sede")(v as string)}>
              <SelectTrigger id="sede" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SEDES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Campo>
          <Campo id="cupo_cop" etiqueta="Cupo de crédito (COP)">
            <Input id="cupo_cop" inputMode="numeric" value={f.cupo_cop} onChange={(e) => cambiar("cupo_cop")(e.target.value)} placeholder="30.000.000" className="font-mono" />
            {err("cupo_cop")}
          </Campo>
          <Campo id="plazo_dias" etiqueta="Plazo de crédito (días)">
            <Input id="plazo_dias" inputMode="numeric" value={f.plazo_dias} onChange={(e) => cambiar("plazo_dias")(e.target.value)} className="font-mono" />
            {err("plazo_dias")}
          </Campo>
          <Campo id="antiguedad_anios" etiqueta="Antigüedad (años)" ayuda="Un cliente nuevo falla el chequeo 4 (CRED-2.4).">
            <Input id="antiguedad_anios" inputMode="numeric" value={f.antiguedad_anios} onChange={(e) => cambiar("antiguedad_anios")(e.target.value)} className="font-mono" />
            {err("antiguedad_anios")}
          </Campo>
          <p className="border-t border-linea pt-4 text-sm text-muted-foreground sm:col-span-2">
            El saldo y el atraso no se escriben: salen del corte de cartera de SAP (CART-1 y CART-2). Un cliente nuevo sin
            facturas abiertas tiene saldo 0 y atraso 0.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setAbierto(false)}>
            Cancelar
          </Button>
          <Button onClick={guardar}>Crear cliente</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
