import { PERSONAS, type CorteCartera, type Evento, type FechaHora, type PartidaAbierta, type PedidoRegistro, type Persona } from "../tipos"
import type { Apartada, Base, Carga, CargaArchivo, Fila } from "./base"
import type { TablaId, Valores } from "./esquema"
import { destinoDe, type Decisiones, type FilaRevisada, type Revision } from "./revisar"

// GUARDAR UNA CARGA. Toma la revisión y las decisiones y devuelve la base nueva, sin tocar la anterior.
// Además dice qué de lo cargado le sirve al flujo de aprobación:
//   · los pedidos a crédito que aún no tienen aprobación son solicitudes por aprobar;
//   · una aprobación que SAP ya trae para un pedido que la app tenía por aprobar se registra como decisión;
//   · la cartera cargada es el corte con el que se calculan saldo y atraso.
// Lo demás (el histórico de pedidos y las facturas pagadas) queda solo en la base.

export interface ContextoCarga {
  fecha: FechaHora
  quien: string
  /** Pedidos que el flujo ya tiene, para no crearlos dos veces. */
  pedidosEnApp: Set<string>
  /** Pedidos que el flujo tiene por aprobar. */
  porAprobar: Set<string>
}

export interface ResultadoCarga {
  base: Base
  carga: Carga
  /** Solicitudes nuevas para el flujo de aprobación. */
  registros: PedidoRegistro[]
  /** Decisiones que SAP ya traía para pedidos que la app tenía por aprobar. */
  decididos: { id_pedido: string; evento: Evento }[]
  /** El corte de cartera que reemplaza al de la app, si la carga trajo cartera. */
  corte?: CorteCartera
}

const texto = (v: Valores, k: string) => (typeof v[k] === "string" ? (v[k] as string) : "")

/** Un pedido a crédito con solicitud y sin aprobación: está por aprobar. */
function registroPendiente(v: Valores, archivo: string, ctx: ContextoCarga): PedidoRegistro | null {
  if (v.forma_pago !== "Crédito" || !texto(v, "solicitud_credito_at") || texto(v, "aprobacion_credito_at") || v.estado === "Cancelado") return null
  return {
    id_pedido: texto(v, "id_pedido"),
    id_cliente: texto(v, "id_cliente"),
    valor_cop: Number(v.valor_pedido_cop),
    lineas: Number(v.lineas_pedidas) || 1,
    origen: "SAP",
    eventos: [
      { accion: "solicitado", fecha: texto(v, "solicitud_credito_at"), quien: texto(v, "vendedor"), motivo: "Registrada en SAP." },
      { accion: "por_aprobar", fecha: ctx.fecha, quien: "Sistema", motivo: `Cargada de ${archivo}.` },
    ],
  }
}

/** Las facturas con saldo de la base, como partidas abiertas: es lo que usan CART-1 a CART-5. */
export function corteDeCartera(facturas: Record<string, Fila>, archivo: string, importo: string): CorteCartera {
  const filas = Object.values(facturas)
  const partidas: PartidaAbierta[] = filas
    .filter((f) => f.v.saldo_pendiente_cop === null || Number(f.v.saldo_pendiente_cop) > 0)
    .map((f) => ({
      id_cliente: texto(f.v, "id_cliente"),
      documento: texto(f.v, "id_factura"),
      tipo: "Factura" as const,
      id_pedido: texto(f.v, "id_pedido") || null,
      fecha_documento: `${texto(f.v, "fecha_factura")}T00:00`,
      vencimiento: `${texto(f.v, "fecha_vencimiento")}T00:00`,
      valor_cop: Number(f.v.valor_factura_cop),
      saldo_abierto_cop: f.v.saldo_pendiente_cop === null ? null : Number(f.v.saldo_pendiente_cop),
    }))
  const corte = filas.map((f) => texto(f.v, "fecha_corte")).filter(Boolean).sort().at(-1) ?? ""
  return { archivo, corte: `${corte}T00:00`, importo, partidas }
}

/** Por qué una fila quedó apartada, en una frase. */
export function motivoApartada(f: FilaRevisada): string {
  const campos = f.cambios.map((c) => c.campo).join(", ")
  switch (f.clase) {
    case "error":
      return f.problemas.join(" ")
    case "cambia":
      return `Traía datos nuevos (${campos}) y se dejó como estaba.`
    case "sospechosa":
      return `Cambió un dato que no debería cambiar (${f.cambios.filter((c) => c.fijo).map((c) => c.campo).join(", ")}) y se dejó como estaba.`
    case "posible_duplicado":
      return `Puede ser duplicado de ${f.parecidoA}: no se cargó.`
    case "conflicto_archivo":
      return "La llave está repetida en el archivo con datos distintos."
    default:
      return "Apartada."
  }
}

export function aplicarCarga(base: Base, revision: Revision, dec: Decisiones, ctx: ContextoCarga): ResultadoCarga {
  const id = `CARGA-${String(base.cargas.length).padStart(3, "0")}`
  const tablas: Record<TablaId, Record<string, Fila>> = {
    clientes: { ...base.tablas.clientes },
    pedidos: { ...base.tablas.pedidos },
    cartera: { ...base.tablas.cartera },
  }
  const apartadas: Apartada[] = []
  const archivos: CargaArchivo[] = []
  const notas: string[] = []
  const registros: PedidoRegistro[] = []
  const decididos: ResultadoCarga["decididos"] = []
  let cartera: string | null = null

  for (const a of revision.archivos) {
    if (a.bloqueado || !a.tabla) {
      archivos.push({ nombre: a.nombre, tabla: a.tabla, huella: a.huella, filas: 0, nuevas: 0, actualizadas: 0, iguales: 0, apartadas: 0 })
      notas.push(`«${a.nombre}» no se cargó: ${a.hallazgos.find((h) => h.nivel === "error")?.texto ?? "no se pudo leer."}`)
      continue
    }
    const cuenta = { nuevas: 0, actualizadas: 0, iguales: 0, apartadas: 0 }
    for (const f of a.filas) {
      const destino = destinoDe(f, dec)
      if (destino === "igual") {
        cuenta.iguales++
        continue
      }
      if (destino === "apartada") {
        cuenta.apartadas++
        apartadas.push({ tabla: a.tabla, archivo: a.nombre, linea: f.linea, clave: f.clave, motivo: motivoApartada(f), crudo: f.crudo, encabezado: a.encabezado })
        continue
      }
      const previo = tablas[a.tabla][f.clave]
      const nueva: Fila = { ...f.fila!, carga: id }
      if (destino === "actualizada" && previo) {
        nueva.versiones = [...previo.versiones, { v: previo.v, crudo: previo.crudo, carga: previo.carga, linea: previo.linea }]
        cuenta.actualizadas++
      } else cuenta.nuevas++
      tablas[a.tabla][f.clave] = nueva

      if (a.tabla === "pedidos") {
        const v = nueva.v
        const aprobo = texto(v, "aprobo")
        if (ctx.porAprobar.has(f.clave) && texto(v, "aprobacion_credito_at") && PERSONAS.includes(aprobo as Persona))
          decididos.push({
            id_pedido: f.clave,
            evento: { accion: "aprobado", fecha: texto(v, "aprobacion_credito_at"), quien: aprobo, motivo: "Aprobado en SAP.", via: "SAP" },
          })
        else if (destino === "nueva" && !ctx.pedidosEnApp.has(f.clave)) {
          const r = registroPendiente(v, a.nombre, ctx)
          if (r) registros.push(r)
        }
      }
    }
    archivos.push({ nombre: a.nombre, tabla: a.tabla, huella: a.huella, filas: a.total, ...cuenta })
    if (a.tabla === "cartera") cartera = a.nombre
  }

  const carga: Carga = { id, fecha: ctx.fecha, quien: ctx.quien, archivos, apartadas, notas }
  const nueva: Base = { tablas, cargas: [...base.cargas, carga] }
  return {
    base: nueva,
    carga,
    registros,
    decididos,
    corte: cartera && Object.keys(tablas.cartera).length ? corteDeCartera(tablas.cartera, cartera, ctx.quien) : undefined,
  }
}
