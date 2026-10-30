"use client"

import { createContext, useContext, useMemo, useReducer, useState, type ReactNode } from "react"
import { CARTERA_INICIAL, CLIENTES, HOY, MENSAJES_INICIALES, PEDIDOS } from "./data"
import { describirMensaje, pedidoDelMensaje } from "./evidencia"
import { cambiarNumero, numeroDe, restaurarNumeros } from "./rules"
import type {
  Cliente,
  CorteCartera,
  Despacho,
  Evento,
  FechaHora,
  MensajeTransporte,
  MensajeWhatsApp,
  Pedido,
  PedidoRegistro,
  Persona,
} from "./tipos"
import { esperanEvidencia, estadoDeEventos, tramoDe, unirPedidos } from "./vistas"

// Estado local de la sesión. Arranca con CLIENTES, PEDIDOS y MENSAJES de lib/data.ts y solo
// agrega: eventos a un pedido, solicitudes nuevas, clientes nuevos, mensajes de la transportadora
// y cambios de números de una regla.
// Los pedidos que ven las pantallas se arman uniendo pedido + cliente: no hay copias.
// Al recargar la página (o con "Reiniciar demo") todo vuelve a empezar.

export interface CambioRegla {
  regla: string
  clave: string
  antes: number
  despues: number
  quien: Persona
  fecha: FechaHora
  motivo: string
}

interface Datos {
  registros: PedidoRegistro[]
  clientes: Cliente[]
  cartera: CorteCartera
  mensajes: MensajeTransporte[]
  whatsapp: MensajeWhatsApp[]
  cambios: CambioRegla[]
}

type Accion =
  | { tipo: "registrar"; id: string; evento: Evento }
  | { tipo: "despachar"; id: string; evento: Evento; despacho: Despacho }
  | { tipo: "mensaje"; mensaje: MensajeTransporte }
  | { tipo: "asociarMensaje"; id: string; id_pedido: string }
  | { tipo: "whatsapp"; mensajes: MensajeWhatsApp[] }
  | { tipo: "agregarCliente"; cliente: Cliente }
  | { tipo: "agregarPedidos"; registros: PedidoRegistro[] }
  | { tipo: "reemplazarCartera"; cartera: CorteCartera }
  | { tipo: "cambioRegla"; cambio: CambioRegla }
  | { tipo: "reiniciar" }

const INICIO: Datos = { registros: PEDIDOS, clientes: CLIENTES, cartera: CARTERA_INICIAL, mensajes: MENSAJES_INICIALES, whatsapp: [], cambios: [] }

/** Un mensaje asociado a un pedido que va en camino lo da por entregado y deja su constancia en el historial. */
function conMensaje(registros: PedidoRegistro[], m: MensajeTransporte): PedidoRegistro[] {
  return registros.map((r) => {
    if (r.id_pedido !== m.id_pedido) return r
    const eventos: Evento[] = [...r.eventos]
    if (estadoDeEventos(r.eventos) === "despachado") eventos.push({ accion: "entregado", fecha: m.fecha, quien: "Transportadora" })
    eventos.push({ accion: "evidencia_recibida", fecha: m.fecha, quien: "Transportadora", motivo: describirMensaje(m), ref: m.id })
    return { ...r, eventos }
  })
}

function reducir(d: Datos, a: Accion): Datos {
  switch (a.tipo) {
    case "registrar":
      return {
        ...d,
        registros: d.registros.map((p) => (p.id_pedido === a.id ? { ...p, eventos: [...p.eventos, a.evento] } : p)),
      }
    case "despachar":
      return {
        ...d,
        registros: d.registros.map((p) =>
          p.id_pedido === a.id ? { ...p, despacho: a.despacho, eventos: [...p.eventos, a.evento] } : p,
        ),
      }
    case "mensaje":
      return { ...d, mensajes: [...d.mensajes, a.mensaje], registros: conMensaje(d.registros, a.mensaje) }
    case "asociarMensaje": {
      const mensaje = d.mensajes.find((m) => m.id === a.id)!
      const asociado = { ...mensaje, id_pedido: a.id_pedido }
      return {
        ...d,
        mensajes: d.mensajes.map((m) => (m.id === a.id ? asociado : m)),
        registros: conMensaje(d.registros, asociado),
      }
    }
    case "whatsapp":
      return { ...d, whatsapp: [...d.whatsapp, ...a.mensajes] }
    case "agregarCliente":
      return { ...d, clientes: [...d.clientes, a.cliente] }
    case "agregarPedidos":
      return { ...d, registros: [...d.registros, ...a.registros] }
    case "reemplazarCartera":
      return { ...d, cartera: a.cartera }
    case "cambioRegla":
      return { ...d, cambios: [...d.cambios, a.cambio] }
    case "reiniciar":
      return INICIO
  }
}

/** Lo que escribe la transportadora. Con `id_pedido` (opción B, enlace) ya se sabe de qué pedido es; sin él (opción A, chat) se busca. */
export type MensajeNuevo = Omit<MensajeTransporte, "id" | "id_pedido"> & { id_pedido?: string }

interface Prototipo {
  pedidos: Pedido[]
  clientes: Cliente[]
  /** Último corte de partidas abiertas: de aquí salen saldo y atraso. */
  cartera: CorteCartera
  /** Todo lo que ha escrito la transportadora, también lo que todavía no se asocia a un pedido. */
  mensajes: MensajeTransporte[]
  /** Lo que se han escrito en el chat de WhatsApp quienes aprueban y el sistema (sin los avisos, que se calculan). */
  whatsapp: MensajeWhatsApp[]
  cambios: CambioRegla[]
  registrar: (id: string, evento: Evento) => void
  /** Nelson entrega el pedido a transporte: queda el registro de lo cargado y el evento que cierra el reloj de bodega. */
  despachar: (id: string, despacho: Despacho, evento: Evento) => void
  /** Llega un mensaje de la transportadora. Devuelve el pedido al que se asoció, o null si quedó sin pedido. */
  recibirMensaje: (m: MensajeNuevo) => { id: string; id_pedido: string | null }
  asociarMensaje: (id: string, id_pedido: string) => void
  /** Agrega mensajes al chat de WhatsApp. El id y el orden los pone el almacén. */
  escribirWhatsApp: (mensajes: Omit<MensajeWhatsApp, "id">[]) => void
  agregarCliente: (cliente: Cliente) => void
  /** Solicitudes nuevas: importadas de SAP o creadas en la app. */
  agregarPedidos: (registros: PedidoRegistro[]) => void
  /** Un corte nuevo reemplaza al anterior: saldos y atrasos se recalculan. */
  reemplazarCartera: (cartera: CorteCartera) => void
  editarRegla: (regla: string, clave: string, valor: number, motivo: string) => void
  reiniciar: () => void
  rol: Persona
  setRol: (rol: Persona) => void
  reglaAbierta: string | null
  abrirRegla: (id: string | null) => void
}

const Contexto = createContext<Prototipo | null>(null)

export function ProveedorPrototipo({ children }: { children: ReactNode }) {
  const [datos, dispatch] = useReducer(reducir, INICIO)
  const [rol, setRol] = useState<Persona>("Marcela Ríos")
  const [reglaAbierta, abrirRegla] = useState<string | null>(null)

  // Los cambios de reglas también recalculan: por eso `cambios` entra en la dependencia.
  const pedidos = useMemo(
    () => unirPedidos(datos.registros, datos.clientes, datos.cartera, datos.mensajes),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [datos.registros, datos.clientes, datos.cartera, datos.mensajes, datos.cambios],
  )

  const valor: Prototipo = {
    pedidos,
    clientes: datos.clientes,
    cartera: datos.cartera,
    mensajes: datos.mensajes,
    whatsapp: datos.whatsapp,
    cambios: datos.cambios,
    reemplazarCartera: (cartera) => dispatch({ tipo: "reemplazarCartera", cartera }),
    registrar: (id, evento) => dispatch({ tipo: "registrar", id, evento }),
    despachar: (id, despacho, evento) => dispatch({ tipo: "despachar", id, despacho, evento }),
    recibirMensaje: (nuevo) => {
      const id = `MSG-${String(datos.mensajes.length + 1).padStart(3, "0")}`
      const { id_pedido: dado, ...resto } = nuevo
      const id_pedido = dado ?? pedidoDelMensaje(resto, esperanEvidencia(pedidos), (p) => tramoDe(p) === "camino")
      dispatch({ tipo: "mensaje", mensaje: { ...resto, id, id_pedido } })
      return { id, id_pedido }
    },
    asociarMensaje: (id, id_pedido) => dispatch({ tipo: "asociarMensaje", id, id_pedido }),
    escribirWhatsApp: (nuevos) =>
      dispatch({
        tipo: "whatsapp",
        mensajes: nuevos.map((m, i) => ({ ...m, id: `WA-${String(datos.whatsapp.length + i + 1).padStart(3, "0")}` })),
      }),
    agregarCliente: (cliente) => dispatch({ tipo: "agregarCliente", cliente }),
    agregarPedidos: (registros) => dispatch({ tipo: "agregarPedidos", registros }),
    editarRegla: (regla, clave, nuevo, motivo) => {
      const antes = numeroDe(regla, clave)
      cambiarNumero(regla, clave, nuevo)
      dispatch({ tipo: "cambioRegla", cambio: { regla, clave, antes, despues: nuevo, quien: rol, fecha: HOY, motivo } })
    },
    reiniciar: () => {
      restaurarNumeros()
      dispatch({ tipo: "reiniciar" })
    },
    rol,
    setRol,
    reglaAbierta,
    abrirRegla,
  }

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

export function usePrototipo() {
  const c = useContext(Contexto)
  if (!c) throw new Error("usePrototipo va dentro de ProveedorPrototipo")
  return c
}
