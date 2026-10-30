import { diasCalendario, soloFecha } from "../fechas"
import type { FechaHora } from "../tipos"
import type { Base, Fila } from "./base"
import { huella, leerMomento, leerNumero, leerTabla, normalizarEncabezado, sinTildes } from "./csv"
import { TABLAS, detectarTabla, tablaPorId, type Campo, type Tabla, type TablaId, type Valor, type Valores } from "./esquema"

// REVISIÓN DE UNA CARGA. Recibe los archivos tal como llegaron y dice, sin guardar nada:
//   · si cada archivo se puede leer y qué tabla es;
//   · qué hay de raro (columnas que sobran o faltan, tipos, fechas, sumas que no cuadran, referencias rotas);
//   · de cada fila, qué es respecto a lo que ya hay en la base: nueva, igual, cambiada, sospechosa, posible duplicado…
// Cada fila queda en exactamente una clase, así que las cuentas siempre cuadran con las filas del archivo.
// Es lo que correría el script en el servidor; la pantalla solo lo muestra y deja decidir.

export type Clase = "nueva" | "igual" | "repetida_igual" | "cambia" | "sospechosa" | "posible_duplicado" | "conflicto_archivo" | "error"

export const CLASES: Clase[] = ["nueva", "igual", "repetida_igual", "cambia", "sospechosa", "posible_duplicado", "conflicto_archivo", "error"]

export interface Cambio {
  campo: string
  antes: Valor
  despues: Valor
  /** Un dato que no debería cambiar. */
  fijo: boolean
}

export interface FilaRevisada {
  linea: number
  clave: string
  clase: Clase
  /** Lo que se guardaría. Falta en las filas con error. */
  fila?: Fila
  /** Lo que hay hoy en la base con esa llave. */
  anterior?: Fila
  cambios: Cambio[]
  problemas: string[]
  avisos: string[]
  /** De qué otra llave puede ser duplicado. */
  parecidoA?: string
  crudo: Record<string, string>
  /** Solo en conflicto_archivo: qué pasaría si se usa esta fila. */
  candidata?: { clase: "nueva" | "igual" | "cambia" | "sospechosa"; cambios: Cambio[]; anterior?: Fila }
  /** Solo en conflicto_archivo: la última fila del archivo con esa llave. */
  ultimaDelGrupo?: boolean
}

export interface Hallazgo {
  nivel: "error" | "aviso" | "info"
  texto: string
}

export interface RevisionArchivo {
  nombre: string
  tabla: TablaId | null
  huella: string
  encabezado: string[]
  separador: string
  hallazgos: Hallazgo[]
  /** No se puede cargar nada de este archivo. */
  bloqueado: boolean
  filas: FilaRevisada[]
  /** Filas de datos del archivo. */
  total: number
  conteo: Record<Clase, number>
  /** Si es el mismo archivo de una carga anterior. */
  yaCargado?: { id: string; fecha: FechaHora }
}

export interface Revision {
  archivos: RevisionArchivo[]
  entreArchivos: Hallazgo[]
}

export interface ContextoRevision {
  base: Base
  ahora: FechaHora
  /** Pedidos que el flujo de aprobación ya tiene: se guardan en la base pero no se vuelven a crear. */
  pedidosEnApp?: Set<string>
}

// ── Decisiones ───────────────────────────────────────────────────────────────────

export type Grupo = "cambia" | "sospechosa" | "posible_duplicado" | "conflicto_archivo"

export interface Decisiones {
  cambia: "actualizar" | "dejar"
  sospechosa: "dejar" | "aplicar"
  posible_duplicado: "dejar" | "cargar"
  conflicto_archivo: "dejar" | "ultima"
}

/** Lo que el software recomienda. Cargar con esto es "aceptar las recomendaciones". */
export const RECOMENDADO: Decisiones = { cambia: "actualizar", sospechosa: "dejar", posible_duplicado: "dejar", conflicto_archivo: "dejar" }

export const GRUPOS: Record<Grupo, { titulo: string; que: string; opciones: { valor: string; etiqueta: string; efecto: string }[]; porque: string }> = {
  cambia: {
    titulo: "Ya estaban y traen datos nuevos",
    que: "Misma llave que una fila de la base, pero cambió algo que suele cambiar: un saldo, un estado, la fecha de una decisión.",
    opciones: [
      { valor: "actualizar", etiqueta: "Actualizar", efecto: "Se guarda el dato nuevo. El anterior queda en el historial de la fila." },
      { valor: "dejar", etiqueta: "Dejar como estaba", efecto: "La fila nueva queda apartada, con su motivo." },
    ],
    porque: "Es lo normal al volver a subir un reporte: gana el dato más reciente y el anterior no se pierde.",
  },
  sospechosa: {
    titulo: "Cambiaron un dato que no debería cambiar",
    que: "Misma llave, pero cambió el valor de un pedido o de una factura, el cliente, el NIT o una fecha de origen.",
    opciones: [
      { valor: "dejar", etiqueta: "Dejar como estaba", efecto: "La fila nueva queda apartada para revisarla en SAP." },
      { valor: "aplicar", etiqueta: "Aplicar igual", efecto: "Se guarda el dato nuevo y el anterior queda en el historial." },
    ],
    porque: "Un valor facturado o un NIT no se corrigen en silencio: primero se pregunta en SAP qué pasó.",
  },
  posible_duplicado: {
    titulo: "Pueden ser un duplicado con otra llave",
    que: "Llave nueva, pero coincide con otra fila en lo que identifica de verdad (el NIT o el nombre del cliente, o cliente + fecha + valor del pedido o factura).",
    opciones: [
      { valor: "dejar", etiqueta: "No cargar", efecto: "Quedan apartadas hasta confirmar que no son lo mismo." },
      { valor: "cargar", etiqueta: "Cargar igual", efecto: "Se guardan como filas nuevas." },
    ],
    porque: "Cargar dos veces el mismo cliente o pedido duplica cupos y saldos; apartar una fila es barato y se puede revertir.",
  },
  conflicto_archivo: {
    titulo: "La misma llave dos veces en el archivo, con datos distintos",
    que: "El archivo trae dos filas con la misma llave y no dicen lo mismo. No se sabe cuál es la buena.",
    opciones: [
      { valor: "dejar", etiqueta: "No cargar ninguna", efecto: "Quedan apartadas todas las filas con esa llave." },
      { valor: "ultima", etiqueta: "Usar la última", efecto: "Se usa la última fila del archivo; las anteriores quedan apartadas." },
    ],
    porque: "Si SAP exportó dos versiones, quien exporta debe decir cuál vale. Hasta entonces no se guarda ninguna.",
  },
}

export type Destino = "nueva" | "actualizada" | "igual" | "apartada"

/** Qué pasa con una fila según las decisiones. La usan la vista previa y la carga: no pueden discrepar. */
export function destinoDe(f: FilaRevisada, dec: Decisiones): Destino {
  switch (f.clase) {
    case "nueva":
      return "nueva"
    case "igual":
    case "repetida_igual":
      return "igual"
    case "cambia":
      return dec.cambia === "actualizar" ? "actualizada" : "apartada"
    case "sospechosa":
      return dec.sospechosa === "aplicar" ? "actualizada" : "apartada"
    case "posible_duplicado":
      return dec.posible_duplicado === "cargar" ? "nueva" : "apartada"
    case "conflicto_archivo": {
      if (dec.conflicto_archivo !== "ultima" || !f.ultimaDelGrupo || !f.candidata) return "apartada"
      const { clase } = f.candidata
      return clase === "nueva" ? "nueva" : clase === "igual" ? "igual" : "actualizada"
    }
    case "error":
      return "apartada"
  }
}

/** Cuántas filas de cada archivo terminan nuevas, actualizadas, iguales o apartadas con estas decisiones. */
export function previsualizar(a: RevisionArchivo, dec: Decisiones): Record<Destino, number> {
  const r: Record<Destino, number> = { nueva: 0, actualizada: 0, igual: 0, apartada: 0 }
  if (a.bloqueado) return r
  for (const f of a.filas) r[destinoDe(f, dec)]++
  return r
}

// ── Lectura de cada celda ────────────────────────────────────────────────────────

interface Celda {
  valor: Valor
  problema?: string
  /** Vino como día/mes/año. */
  local?: boolean
  /** Un valor de lista que llegó con otra escritura y se normalizó. */
  normalizado?: boolean
  desconocido?: string
}

/** El rastro de un UTF-8 leído como otra codificación: Ã©, â€, �. */
const DANADO = /Ã[\u0080-¿]|â€|�/
const corto = (t: string) => (t.length > 24 ? `${t.slice(0, 24)}…` : t)

function leerCelda(campo: Campo, texto: string): Celda {
  const t = texto.trim()
  if (t === "") return campo.obligatorio ? { valor: null, problema: `Falta ${campo.nombre}.` } : { valor: null }
  switch (campo.tipo) {
    case "texto":
      if (DANADO.test(t)) return { valor: t, problema: `${campo.nombre} trae caracteres dañados («${corto(t)}»): el archivo no está en UTF-8.` }
      if (campo.patron && !campo.patron.test(t)) return { valor: t, problema: `${campo.nombre} «${corto(t)}» ${campo.patronMensaje ?? "no tiene el formato esperado"}.` }
      return { valor: t }
    case "entero":
    case "dinero":
    case "decimal": {
      const n = leerNumero(t, campo.tipo === "decimal")
      if (n === null || !Number.isFinite(n)) return { valor: null, problema: `${campo.nombre} tiene que ser un número (llegó «${corto(t)}»).` }
      if (campo.tipo === "entero" && !Number.isInteger(n)) return { valor: null, problema: `${campo.nombre} tiene que ser un número entero (llegó «${corto(t)}»).` }
      if (n < 0) return { valor: null, problema: `${campo.nombre} no puede ser negativo (llegó «${corto(t)}»).` }
      return { valor: n }
    }
    case "fecha":
    case "momento": {
      const m = leerMomento(t)
      if (!m) return { valor: null, problema: `${campo.nombre} no es una fecha válida (llegó «${corto(t)}»). Usa AAAA-MM-DD.` }
      return { valor: campo.tipo === "fecha" ? m.valor.slice(0, 10) : m.valor, local: m.local }
    }
    case "opcion": {
      const conocido = campo.opciones!.find((o) => sinTildes(o) === sinTildes(t))
      if (conocido) return { valor: conocido, normalizado: conocido !== t }
      const lista = campo.opciones!.join(", ")
      return campo.estricta
        ? { valor: t, problema: `${campo.nombre} «${corto(t)}» no es uno de: ${lista}.` }
        : { valor: t, desconocido: `${campo.nombre} «${corto(t)}» no está entre los valores conocidos (${lista}).` }
    }
  }
}

const igualValor = (a: Valor, b: Valor) => a === b || (typeof a === "number" && typeof b === "number" && Math.abs(a - b) < 1e-9)

function cambiosEntre(tabla: Tabla, antes: Valores, despues: Valores): Cambio[] {
  return tabla.campos
    .filter((k) => !igualValor(antes[k.nombre] ?? null, despues[k.nombre] ?? null))
    .map((k) => ({ campo: k.nombre, antes: antes[k.nombre] ?? null, despues: despues[k.nombre] ?? null, fijo: !!k.fijo }))
}

// ── Cruces con otras tablas ──────────────────────────────────────────────────────

type Vista = Record<TablaId, Map<string, Valores>>

function referenciasRotas(tabla: Tabla, v: Valores, vista: Vista): string[] {
  return tabla.refs.flatMap((r) => {
    const valor = v[r.campo]
    return typeof valor === "string" && !vista[r.tabla].has(valor)
      ? [`${r.campo} «${valor}» no está en ${tablaPorId(r.tabla).titulo.toLowerCase()}: carga primero ese archivo.`]
      : []
  })
}

function cruces(tabla: Tabla, v: Valores, vista: Vista): string[] {
  const avisos: string[] = []
  if (tabla.id === "pedidos") {
    const cliente = vista.clientes.get(String(v.id_cliente))
    if (cliente && v.cliente && v.cliente !== cliente.razon_social) avisos.push(`El pedido dice «${v.cliente}» y el maestro de clientes dice «${cliente.razon_social}».`)
  }
  if (tabla.id === "aprobaciones") {
    const p = vista.pedidos.get(String(v.id_pedido))
    if (p && p.valor_pedido_cop !== v.valor_pedido_cop) avisos.push("El valor no coincide con el del pedido.")
    if (p?.aprobo && p.aprobo !== v.aprobador) avisos.push(`El pedido dice que aprobó ${p.aprobo} y esta fila dice ${v.aprobador}.`)
  }
  if (tabla.id === "cartera") {
    const p = vista.pedidos.get(String(v.id_pedido))
    if (p && p.id_cliente !== v.id_cliente) avisos.push(`La factura es de ${v.id_cliente} pero el pedido es de ${p.id_cliente}.`)
    else if (p && p.valor_pedido_cop !== v.valor_factura_cop) avisos.push("El valor facturado no coincide con el valor del pedido.")
  }
  return avisos
}

// ── Un archivo ───────────────────────────────────────────────────────────────────

const conteoVacio = (): Record<Clase, number> => Object.fromEntries(CLASES.map((c) => [c, 0])) as Record<Clase, number>

function revisarArchivo(nombre: string, texto: string, ctx: ContextoRevision, vista: Vista): RevisionArchivo {
  const leido = leerTabla(texto)
  const base: RevisionArchivo = {
    nombre,
    tabla: null,
    huella: huella(texto),
    encabezado: leido.encabezado,
    separador: leido.separador,
    hallazgos: [],
    bloqueado: false,
    filas: [],
    total: leido.filas.length,
    conteo: conteoVacio(),
  }
  const bloquear = (texto: string): RevisionArchivo => ({ ...base, bloqueado: true, hallazgos: [...base.hallazgos, { nivel: "error", texto }] })

  const previa = ctx.base.cargas.flatMap((c) => c.archivos.filter((a) => a.huella === base.huella).map(() => c))[0]
  if (previa) base.yaCargado = { id: previa.id, fecha: previa.fecha }

  if (!texto.trim()) return bloquear("El archivo está vacío.")
  if (texto.startsWith("PK") || texto.includes("\u0000"))
    return bloquear("No parece un CSV sino un archivo de Excel (.xlsx). En Excel: Guardar como → CSV UTF-8 (delimitado por comas).")
  if (leido.comillasSinCerrar) return bloquear("Hay una comilla sin cerrar: el resto del archivo quedó dentro de una sola celda. Revisa el archivo en un editor de texto.")
  if (DANADO.test(texto))
    base.hallazgos.push({ nivel: "aviso", texto: "Se ven caracteres dañados (como Ã© o �): el archivo no está guardado en UTF-8. Las filas con texto dañado no se cargan." })
  if (leido.separador !== ",") base.hallazgos.push({ nivel: "info", texto: `El separador es «${leido.separador === "\t" ? "tabulador" : leido.separador}» y no la coma. Se leyó bien.` })
  if (leido.vacias) base.hallazgos.push({ nivel: "info", texto: `Se saltaron ${leido.vacias} líneas en blanco.` })

  const det = detectarTabla(leido.encabezado, nombre)
  if (!det)
    return bloquear(
      `No reconozco este archivo. Trae las columnas ${leido.encabezado.slice(0, 5).join(", ")}${leido.encabezado.length > 5 ? "…" : ""}, y no son las de clientes, pedidos, aprobaciones ni cartera.`,
    )
  const tabla = det.tabla
  base.tabla = tabla.id

  for (const r of det.renombradas) base.hallazgos.push({ nivel: "info", texto: `La columna «${r.original}» se leyó como ${r.campo}.` })
  if (det.sobran.length)
    base.hallazgos.push({ nivel: "aviso", texto: `Trae columnas que no conozco: ${det.sobran.join(", ")}. Se guardan tal cual con cada fila, sin usarlas.` })
  const obligatoriasFaltan = det.faltan.filter((f) => tabla.campos.find((k) => k.nombre === f)?.obligatorio)
  if (obligatoriasFaltan.length) return { ...base, bloqueado: true, hallazgos: [...base.hallazgos, { nivel: "error", texto: `Faltan columnas obligatorias de ${tabla.titulo.toLowerCase()}: ${obligatoriasFaltan.join(", ")}. No se carga nada hasta que estén.` }] }
  const opcionalesFaltan = det.faltan.filter((f) => !obligatoriasFaltan.includes(f))
  if (opcionalesFaltan.length)
    base.hallazgos.push({ nivel: "aviso", texto: `Faltan columnas opcionales: ${opcionalesFaltan.join(", ")}. Quedan en blanco.` })

  const normales = leido.encabezado.map(normalizarEncabezado)
  const repetidas = normales.filter((n, i) => n && normales.indexOf(n) !== i)
  if (repetidas.length) base.hallazgos.push({ nivel: "aviso", texto: `La columna ${[...new Set(repetidas)].join(", ")} está repetida. Se usa la primera.` })
  const columna = (campo: string) => normales.indexOf(campo)

  let fechasLocales = 0
  let valoresNormalizados = 0
  const filas: FilaRevisada[] = []
  const parecidos = new Map<string, string>()
  const indexar = (clave: string, v: Valores) => {
    for (const k of tabla.parecidos?.(v) ?? []) if (!parecidos.has(k)) parecidos.set(k, clave)
  }
  for (const f of Object.values(ctx.base.tablas[tabla.id])) indexar(f.clave, f.v)

  // 1 · Leer cada fila.
  for (const { linea, celdas } of leido.filas) {
    const crudo: Record<string, string> = {}
    leido.encabezado.forEach((h, i) => {
      crudo[h] = celdas[i] ?? ""
    })
    const problemas: string[] = []
    const avisos: string[] = []
    const sobrantes = celdas.slice(leido.encabezado.length)
    if (celdas.length < leido.encabezado.length) problemas.push(`Tiene ${celdas.length} celdas y el encabezado tiene ${leido.encabezado.length}.`)
    else if (sobrantes.some((x) => x.trim())) problemas.push(`Tiene ${celdas.length} celdas y el encabezado tiene ${leido.encabezado.length}: sobran datos.`)

    const v: Valores = {}
    for (const campo of tabla.campos) {
      const i = columna(campo.nombre)
      const r = i < 0 ? ({ valor: null } as Celda) : leerCelda(campo, celdas[i] ?? "")
      v[campo.nombre] = r.valor
      if (r.problema) problemas.push(r.problema)
      if (r.desconocido) avisos.push(r.desconocido)
      if (r.local) fechasLocales++
      if (r.normalizado) valoresNormalizados++
    }
    const clave = typeof v[tabla.clave] === "string" ? (v[tabla.clave] as string) : ""
    if (!problemas.length) {
      const entre = tabla.entreColumnas?.(v)
      if (entre) {
        problemas.push(...entre.problemas)
        avisos.push(...entre.avisos)
      }
      problemas.push(...referenciasRotas(tabla, v, vista))
      avisos.push(...cruces(tabla, v, vista))
      if (tabla.id === "pedidos" && ctx.pedidosEnApp?.has(clave)) avisos.push("Ya está en el flujo de aprobación: se guarda en la base y no se vuelve a crear.")
    }
    const fila: Fila = { clave, v, crudo, carga: "", linea, versiones: [] }
    filas.push({ linea, clave, clase: problemas.length ? "error" : "nueva", fila: problemas.length ? undefined : fila, cambios: [], problemas, avisos, crudo })
  }

  // 2 · Llaves repetidas dentro del archivo.
  const porClave = new Map<string, FilaRevisada[]>()
  for (const f of filas) if (f.clase !== "error") porClave.set(f.clave, [...(porClave.get(f.clave) ?? []), f])

  // 3 · Cada fila contra la base.
  const clasificar = (f: FilaRevisada): NonNullable<FilaRevisada["candidata"]> => {
    const anterior = ctx.base.tablas[tabla.id][f.clave]
    if (!anterior) return { clase: "nueva", cambios: [] }
    const cambios = cambiosEntre(tabla, anterior.v, f.fila!.v)
    if (!cambios.length) return { clase: "igual", cambios, anterior }
    return { clase: cambios.some((c) => c.fijo) ? "sospechosa" : "cambia", cambios, anterior }
  }

  for (const grupo of porClave.values()) {
    const [primera, ...resto] = grupo
    const todasIguales = resto.every((f) => cambiosEntre(tabla, primera.fila!.v, f.fila!.v).length === 0)
    if (!todasIguales) {
      grupo.forEach((f, i) => {
        f.clase = "conflicto_archivo"
        f.candidata = clasificar(f)
        f.ultimaDelGrupo = i === grupo.length - 1
        f.problemas.push(`La llave ${f.clave} aparece ${grupo.length} veces en el archivo con datos distintos.`)
      })
      continue
    }
    for (const f of resto) {
      f.clase = "repetida_igual"
      f.avisos.push(`Repetida: igual a la fila de la línea ${primera.linea}.`)
    }
    const c = clasificar(primera)
    primera.clase = c.clase
    primera.cambios = c.cambios
    primera.anterior = c.anterior
    if (c.clase === "nueva") {
      const parecido = (tabla.parecidos?.(primera.fila!.v) ?? []).map((k) => ({ k, otra: parecidos.get(k) })).find((x) => x.otra && x.otra !== primera.clave)
      if (parecido) {
        primera.clase = "posible_duplicado"
        primera.parecidoA = parecido.otra
        primera.avisos.push(`Coincide con ${parecido.otra} (${parecido.k.split("|").join(" · ")}).`)
      } else indexar(primera.clave, primera.fila!.v)
    }
  }

  for (const f of filas) base.conteo[f.clase]++
  if (fechasLocales)
    base.hallazgos.push({ nivel: "aviso", texto: `${fechasLocales} fechas vienen como día/mes/año (01/04/2026). Se leyeron así; confirma que no es mes/día.` })
  if (valoresNormalizados)
    base.hallazgos.push({ nivel: "info", texto: `${valoresNormalizados} valores se escribieron distinto (mayúsculas o tildes) y se leyeron como el valor conocido.` })
  const nuevoAlgo = filas.some((f) => !["igual", "repetida_igual", "error"].includes(f.clase))
  if (filas.length && !nuevoAlgo && !base.conteo.error)
    base.hallazgos.push({ nivel: "info", texto: "Todas las filas ya estaban cargadas y no cambiaron: no hay nada nuevo en este archivo." })
  if (base.yaCargado)
    base.hallazgos.push({ nivel: "aviso", texto: `Es exactamente el mismo archivo que se cargó en ${base.yaCargado.id}. Todo sería repetido.` })

  base.filas = filas
  return base
}

// ── Todos los archivos ───────────────────────────────────────────────────────────

/** Cada archivo se revisa apoyándose en la base y en los que ya se revisaron: clientes, luego pedidos, aprobaciones y cartera. */
export function revisarArchivos(archivos: { nombre: string; texto: string }[], ctx: ContextoRevision): Revision {
  const vista: Vista = { clientes: new Map(), pedidos: new Map(), aprobaciones: new Map(), cartera: new Map() }
  for (const t of TABLAS) for (const f of Object.values(ctx.base.tablas[t.id])) vista[t.id].set(f.clave, f.v)

  // El orden de las tablas lo da `orden`; los que no se reconocen van al final.
  const orden = (a: { nombre: string; texto: string }) => {
    const det = detectarTabla(leerTabla(a.texto).encabezado, a.nombre)
    return det ? det.tabla.orden : 99
  }
  const revisados = [...archivos]
    .sort((a, b) => orden(a) - orden(b))
    .map((a) => {
      const r = revisarArchivo(a.nombre, a.texto, ctx, vista)
      if (r.tabla && !r.bloqueado) for (const f of r.filas) if (f.fila && f.clase !== "conflicto_archivo") vista[r.tabla].set(f.clave, f.fila.v)
      return r
    })

  const entreArchivos: Hallazgo[] = []
  const repetidos = revisados.filter((a) => a.tabla).filter((a, i, todos) => todos.findIndex((b) => b.tabla === a.tabla) !== i)
  for (const r of repetidos)
    entreArchivos.push({ nivel: "aviso", texto: `Subiste dos archivos de ${tablaPorId(r.tabla!).titulo.toLowerCase()}: «${r.nombre}» y otro. Se revisan por separado, uno después del otro.` })

  // Los archivos de una misma foto de SAP tienen que llegar al mismo corte.
  const cortes: { archivo: string; fecha: string }[] = []
  const maximo = (a: RevisionArchivo | undefined, campo: string) => {
    const fechas = a?.filas.flatMap((f) => (typeof f.fila?.v[campo] === "string" ? [soloFecha(f.fila.v[campo] as string)] : [])) ?? []
    return fechas.length ? fechas.sort().at(-1)! : null
  }
  const de = (t: TablaId) => revisados.find((a) => a.tabla === t && !a.bloqueado)
  const fPedidos = maximo(de("pedidos"), "fecha_pedido")
  const fCartera = maximo(de("cartera"), "fecha_corte")
  if (fPedidos) cortes.push({ archivo: "pedidos", fecha: fPedidos })
  if (fCartera) cortes.push({ archivo: "cartera", fecha: fCartera })
  if (cortes.length > 1) {
    const fechas = cortes.map((c) => c.fecha).sort()
    const dias = diasCalendario(fechas[0], fechas.at(-1)!)
    if (dias > 3)
      entreArchivos.push({
        nivel: "aviso",
        texto: `Los archivos no son del mismo corte (${cortes.map((c) => `${c.archivo} hasta ${c.fecha}`).join(", ")}). Mezclarlos da saldos que no corresponden a los pedidos.`,
      })
  }
  if (fCartera) {
    const atraso = diasCalendario(fCartera, soloFecha(ctx.ahora))
    if (atraso > 3)
      entreArchivos.push({
        nivel: "aviso",
        texto: `La cartera es del ${fCartera}, de hace ${atraso} días. Al cargarla, el saldo y el atraso de las fichas se calculan con ese corte contra la fecha de hoy.`,
      })
  }
  return { archivos: revisados, entreArchivos }
}
