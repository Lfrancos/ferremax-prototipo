import type { Cliente, FechaHora, Segmento, Sede } from "../tipos"
import type { TablaId, Valores } from "./esquema"

// LA BASE DE DATOS DE LA CARGA. Aquí vive todo lo que se ha subido, fila por fila, sin perder nada:
//   · cada fila guarda sus valores ya leídos (`v`) y la fila tal como llegó (`crudo`), con todas sus columnas;
//   · cuando una fila se actualiza, la versión anterior queda en `versiones`;
//   · lo que no se carga (errores, dudas) queda en la carga como "apartada", con su motivo, para corregirlo y volver a subir.
// En la app real esto son cuatro tablas, una tabla de cargas y una de filas apartadas. Aquí es un objeto en memoria.

export interface Version {
  v: Valores
  crudo: Record<string, string>
  carga: string
  linea: number
}

export interface Fila {
  clave: string
  v: Valores
  /** La fila como llegó, con las columnas del archivo (también las que la app no usa). */
  crudo: Record<string, string>
  carga: string
  linea: number
  /** Lo que tenía antes, cada vez que se actualizó. La más reciente va al final. */
  versiones: Version[]
}

export interface Apartada {
  tabla: TablaId
  archivo: string
  linea: number
  clave: string
  motivo: string
  crudo: Record<string, string>
  encabezado: string[]
}

export interface CargaArchivo {
  nombre: string
  tabla: TablaId | null
  huella: string
  /** Filas de datos del archivo. Siempre: nuevas + actualizadas + iguales + apartadas. */
  filas: number
  nuevas: number
  actualizadas: number
  iguales: number
  apartadas: number
}

export interface Carga {
  id: string
  fecha: FechaHora
  quien: string
  archivos: CargaArchivo[]
  apartadas: Apartada[]
  /** Lo que se dijo al confirmar: decisiones tomadas, archivos que no se pudieron leer. */
  notas: string[]
}

export interface Base {
  tablas: Record<TablaId, Record<string, Fila>>
  cargas: Carga[]
}

export const CARGA_DEMO = "CARGA-000"
export const CARGA_MANUAL = "MANUAL"

const vacia = (): Base => ({ tablas: { clientes: {}, pedidos: {}, aprobaciones: {}, cartera: {} }, cargas: [] })

/** El maestro de clientes como fila de la tabla `clientes`. */
export function filaDeCliente(c: Cliente, carga: string, linea = 0): Fila {
  const v: Valores = {
    id_cliente: c.id_cliente,
    nit: c.nit,
    razon_social: c.razon_social,
    segmento: c.segmento,
    sede_principal: c.sede,
    vendedor_asignado: c.vendedor,
    plazo_credito_dias: c.plazo_dias,
    cupo_credito_cop: c.cupo_cop,
    antiguedad_anios: c.antiguedad_anios,
  }
  return {
    clave: c.id_cliente,
    v,
    crudo: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, String(x ?? "")])),
    carga,
    linea,
    versiones: [],
  }
}

/** La fila de la tabla `clientes` como el cliente que usa la app. */
export const clienteDeFila = (f: Fila): Cliente => ({
  id_cliente: String(f.v.id_cliente),
  nit: String(f.v.nit),
  razon_social: String(f.v.razon_social),
  segmento: f.v.segmento as Segmento,
  sede: f.v.sede_principal as Sede,
  vendedor: String(f.v.vendedor_asignado),
  plazo_dias: Number(f.v.plazo_credito_dias),
  cupo_cop: Number(f.v.cupo_credito_cop),
  antiguedad_anios: Number(f.v.antiguedad_anios),
})

/** La base al abrir la demo: los clientes de siempre, como si ya se hubieran cargado. */
export function baseInicial(clientes: Cliente[]): Base {
  const base = vacia()
  clientes.forEach((c, i) => {
    base.tablas.clientes[c.id_cliente] = filaDeCliente(c, CARGA_DEMO, i + 2)
  })
  base.cargas.push({
    id: CARGA_DEMO,
    fecha: "2026-11-30T06:00",
    quien: "Demostración",
    archivos: [{ nombre: "clientes de la demostración", tabla: "clientes", huella: "demo", filas: clientes.length, nuevas: clientes.length, actualizadas: 0, iguales: 0, apartadas: 0 }],
    apartadas: [],
    notas: ["Los clientes con los que arranca la demostración."],
  })
  return base
}

/** Cuántas filas hay en cada tabla. */
export const contarFilas = (base: Base): Record<TablaId, number> => ({
  clientes: Object.keys(base.tablas.clientes).length,
  pedidos: Object.keys(base.tablas.pedidos).length,
  aprobaciones: Object.keys(base.tablas.aprobaciones).length,
  cartera: Object.keys(base.tablas.cartera).length,
})
