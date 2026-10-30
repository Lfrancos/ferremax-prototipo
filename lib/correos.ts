import type { Actividad } from "./actividad"
import { fmtFechaHora } from "./fechas"
import { avisosDe } from "./notificaciones"
import { CORREOS, VER_INFO_CREDITO, reglaPorId } from "./rules"
import type { FechaHora, Pedido, Persona } from "./tipos"

// CORREOS (simulados). No hay una lista de correos guardada: salen del registro de actividad.
// Cada línea dice qué pasó; CORREOS (NOT-3, lib/rules.ts) dice quién debe enterarse; aquí se arma el correo.
// La versión real cambia solo la salida: un proceso lee las líneas nuevas de `actividad`, llama a correosDe,
// guarda cada correo en una tabla de salida (outbox) y el proveedor [por definir] lo manda. Ver README.
// Nada de este archivo manda un correo de verdad.

/** Direcciones de muestra. En la versión real salen del directorio de Ferremax. */
export const DIRECCION: Record<Persona, string> = {
  "Andrés Molina": "andres.molina@ferremax.co",
  "Marcela Ríos": "marcela.rios@ferremax.co",
  "Sandra Beltrán": "sandra.beltran@ferremax.co",
  Nelson: "nelson.bodega@ferremax.co",
  "Édinson Rojas": "edinson.rojas@ferremax.co",
}

export const REMITENTE = "pedidos@ferremax.co"

export interface Correo {
  id: string
  fecha: FechaHora
  para: Persona[]
  asunto: string
  cuerpo: string[]
  adjunto?: string
  /** Por qué salió, en palabras. Siempre empieza por la regla. */
  porque: string
  /** La línea del registro que lo disparó. El fuera de plazo no tiene: sale del aviso de WhatsApp. */
  n?: number
  id_pedido?: string
}

const firma = ["", "— Ferremax · pedidos a crédito", "Este correo deja constancia. Para decidir, responde el WhatsApp o entra a la app."]

/** El correo para quien sigue un pedido. Si la persona no ve crédito (PER-1), va sin el motivo. */
function paraSeguidor(a: Actividad, persona: Persona, cliente: string | undefined): Correo {
  const oculto = a.credito && !VER_INFO_CREDITO.fn(persona)
  return {
    id: `COR-${a.n}-${persona}`,
    fecha: a.fecha,
    para: [persona],
    asunto: `${a.id_pedido} · ${a.que}`,
    cuerpo: [
      `${a.id_pedido}${cliente ? ` · ${cliente}` : ""}`,
      `${a.que} · ${a.quien} · ${fmtFechaHora(a.fecha)}`,
      ...(a.detalle ? [oculto ? "El motivo es información de crédito y no va en tu correo (PER-1)." : a.detalle] : []),
      "",
      "Te llega porque sigues este pedido. Para dejar de seguirlo, entra a la ficha.",
      ...firma,
    ],
    porque: `${CORREOS.id} · sigue el pedido`,
    n: a.n,
    id_pedido: a.id_pedido,
  }
}

/** Todos los correos que habría mandado el sistema hasta ahora, del más viejo al más nuevo. */
export function correosDe(actividad: Actividad[], pedidos: Pedido[]): Correo[] {
  const cliente = new Map(pedidos.map((p) => [p.id_pedido, p.cliente]))
  const seguidores = new Map<string, Set<Persona>>()
  const correos: Correo[] = []

  for (const a of actividad) {
    const base = { fecha: a.fecha, n: a.n, adjunto: a.adjunto, id_pedido: a.id_pedido }
    switch (a.tipo) {
      case "carga":
        // La carga con la que arranca la demostración no la guardó nadie.
        if (a.quien === "Demostración") break
        correos.push({
          ...base,
          id: `COR-${a.n}`,
          para: CORREOS.fn("carga"),
          asunto: `Carga ${a.ref} guardada por ${a.quien}`,
          cuerpo: [`${a.quien} guardó la carga ${a.ref} el ${fmtFechaHora(a.fecha)}.`, ...(a.detalle?.split(" · ") ?? []), ...(a.adjunto ? ["", "Adjunto: las filas que quedaron apartadas, para revisarlas."] : []), ...firma],
          porque: `${CORREOS.id} · se guardó una carga de SAP`,
        })
        break
      case "sap":
        correos.push({
          ...base,
          id: `COR-${a.n}`,
          para: CORREOS.fn("sap"),
          asunto: `Archivo para SAP ${a.ref}`,
          cuerpo: [`${a.quien} descargó el archivo ${a.ref} el ${fmtFechaHora(a.fecha)}.`, a.detalle ?? "", "", "Adjunto: el archivo con el formato de aprobaciones de SAP. Falta subirlo a SAP.", ...firma],
          porque: `${CORREOS.id} · se descargó el archivo para SAP`,
        })
        break
      case "regla": {
        const r = a.ref ? reglaPorId(a.ref) : undefined
        correos.push({
          ...base,
          id: `COR-${a.n}`,
          para: CORREOS.fn("regla", { dueno: r?.documento.dueno }),
          asunto: `Cambio en ${a.ref}${r ? ` · ${r.titulo}` : ""}`,
          cuerpo: [`${a.quien} cambió un número de la regla ${a.ref} el ${fmtFechaHora(a.fecha)}.`, a.que, a.detalle ?? "", "", `Te llega porque eres dueño de «${r?.documento.nombre ?? "el documento"}».`, ...firma],
          porque: `${CORREOS.id} · cambió una regla de tu documento`,
        })
        break
      }
      case "correo":
        if (a.correo)
          correos.push({
            ...base,
            id: `COR-${a.n}`,
            para: CORREOS.fn("reporte", { para: a.correo.para }),
            asunto: a.correo.asunto,
            cuerpo: [...a.correo.cuerpo, ...firma],
            porque: `${CORREOS.id} · ${a.quien} lo mandó`,
          })
        break
      case "seguimiento": {
        const lista = seguidores.get(a.id_pedido!) ?? new Set<Persona>()
        if (a.sigue) {
          lista.add(a.quien as Persona)
          correos.push({
            ...base,
            id: `COR-${a.n}`,
            para: [a.quien as Persona],
            asunto: `Sigues ${a.id_pedido}`,
            cuerpo: [`Desde ahora te llega un correo por cada cosa que le pase a ${a.id_pedido} (${cliente.get(a.id_pedido!) ?? "sin cliente"}).`, "Lo que hagas tú no te llega.", ...firma],
            porque: `${CORREOS.id} · empezó a seguir el pedido`,
          })
        } else lista.delete(a.quien as Persona)
        seguidores.set(a.id_pedido!, lista)
        break
      }
      case "pedido":
      case "transporte": {
        const lista = a.id_pedido ? seguidores.get(a.id_pedido) : undefined
        if (lista?.size) for (const persona of CORREOS.fn("seguir", { seguidores: [...lista], quien: a.quien })) correos.push(paraSeguidor(a, persona, cliente.get(a.id_pedido!)))
        break
      }
    }
  }

  // Copia por correo del aviso de fuera de plazo (NOT-1): no es una línea del registro, se calcula como el WhatsApp.
  for (const p of pedidos)
    for (const aviso of avisosDe(p).filter((x) => x.tipo === "escalamiento"))
      correos.push({
        id: `COR-${aviso.id}`,
        fecha: aviso.fecha,
        para: CORREOS.fn("fuera_de_plazo", { para: [aviso.para] }),
        asunto: `Fuera de plazo · ${p.id_pedido} · ${p.cliente}`,
        cuerpo: [...aviso.texto.replace(/\*/g, "").split("\n"), "", `Copia del WhatsApp que recibió ${aviso.para}.`, ...firma],
        porque: `${CORREOS.id} · copia del aviso de fuera de plazo (NOT-1)`,
        id_pedido: p.id_pedido,
      })

  return correos.sort((a, b) => a.fecha.localeCompare(b.fecha) || (a.n ?? 0) - (b.n ?? 0))
}
