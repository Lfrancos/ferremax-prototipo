import type { ItemPedido, PedidoRegistro } from "./tipos"

// Detalle de las líneas de cada pedido: lo que el cliente pidió. Con esto se compara lo que
// Nelson carga al entregar a transporte (TRA-1). Es dato ficticio, como los valores de los pedidos.
// La cantidad de líneas de cada pedido es la misma que PEDIDOS.lineas en lib/data.ts.

const CATALOGO: Record<string, { descripcion: string; unidad: string }> = {
  "CAB-12R": { descripcion: "Cable THHN 12 AWG rojo, rollo de 100 m", unidad: "rollo" },
  "CAB-12N": { descripcion: "Cable THHN 12 AWG negro, rollo de 100 m", unidad: "rollo" },
  "CAB-10N": { descripcion: "Cable THHN 10 AWG negro, rollo de 100 m", unidad: "rollo" },
  "CAB-08V": { descripcion: "Cable THHN 8 AWG verde, rollo de 100 m", unidad: "rollo" },
  "BRK-1P20": { descripcion: "Breaker enchufable 1×20 A", unidad: "und" },
  "BRK-2P30": { descripcion: "Breaker enchufable 2×30 A", unidad: "und" },
  "BRK-3P60": { descripcion: "Breaker industrial 3×60 A", unidad: "und" },
  "TAB-12C": { descripcion: "Tablero trifásico de 12 circuitos", unidad: "und" },
  "TUB-EMT34": { descripcion: 'Tubo EMT 3/4", tramo de 3 m', unidad: "tramo" },
  "TUB-PVC12": { descripcion: 'Tubo PVC conduit 1/2", tramo de 3 m', unidad: "tramo" },
  "CAJ-2X4": { descripcion: "Caja metálica 2×4", unidad: "und" },
  "TOM-DOB": { descripcion: "Tomacorriente doble con polo a tierra", unidad: "und" },
  "INT-SEN": { descripcion: "Interruptor sencillo", unidad: "und" },
  "LUM-LED18": { descripcion: "Panel LED de 18 W", unidad: "und" },
  "LUM-REF50": { descripcion: "Reflector LED de 50 W", unidad: "und" },
  "CIN-AIS": { descripcion: "Cinta aislante de 19 mm × 18 m", unidad: "und" },
  "CON-3P25": { descripcion: "Contactor tripolar de 25 A", unidad: "und" },
  "REL-TER": { descripcion: "Relé térmico de 9 a 13 A", unidad: "und" },
  "MOT-1HP": { descripcion: "Motor trifásico de 1 HP", unidad: "und" },
  "VAR-5HP": { descripcion: "Variador de frecuencia de 5 HP", unidad: "und" },
  "ROD-6205": { descripcion: "Rodamiento 6205-2RS", unidad: "und" },
}

type Linea = [sku: string, cantidad: number]

const LINEAS: Record<string, Linea[]> = {
  "PED-2026-03089": [["CAB-12R", 8], ["CAB-12N", 8], ["BRK-1P20", 24], ["TOM-DOB", 60], ["INT-SEN", 40], ["CAJ-2X4", 100]],
  "PED-2026-03090": [["CIN-AIS", 50], ["TUB-PVC12", 30]],
  "PED-2026-03091": [["CON-3P25", 6], ["REL-TER", 6], ["BRK-3P60", 2]],
  "PED-2026-03092": [["BRK-2P30", 12]],
  "PED-2026-03093": [["TAB-12C", 4], ["BRK-1P20", 48], ["CAB-10N", 10], ["TUB-EMT34", 120], ["CAJ-2X4", 80]],
  "PED-2026-03094": [["LUM-REF50", 6], ["CIN-AIS", 30]],
  "PED-2026-03095": [
    ["CAB-12R", 60], ["CAB-12N", 60], ["CAB-10N", 40], ["CAB-08V", 20], ["BRK-1P20", 120], ["BRK-2P30", 60], ["BRK-3P60", 20],
    ["TAB-12C", 16], ["TUB-EMT34", 400], ["TUB-PVC12", 300], ["CAJ-2X4", 500], ["TOM-DOB", 300], ["INT-SEN", 300], ["LUM-LED18", 150],
  ],
  "PED-2026-03096": [
    ["CAB-12R", 6], ["CAB-08V", 4], ["CON-3P25", 10], ["REL-TER", 10], ["BRK-3P60", 8], ["TAB-12C", 2], ["TUB-EMT34", 60], ["CIN-AIS", 40],
  ],
  "PED-2026-03097": [["MOT-1HP", 3], ["VAR-5HP", 1], ["CON-3P25", 4], ["ROD-6205", 20]],
  "PED-2026-03098": [["LUM-LED18", 30], ["TOM-DOB", 50], ["CAB-12N", 6]],
  "PED-2026-03099": [["BRK-1P20", 36], ["CAB-12N", 10], ["TOM-DOB", 50]],
  "PED-2026-03101": [["INT-SEN", 60], ["TOM-DOB", 60]],
  "PED-2026-03102": [["CAB-12R", 4], ["CAB-12N", 4], ["CAJ-2X4", 60], ["CIN-AIS", 20]],
  "PED-2026-03103": [
    ["TAB-12C", 6], ["BRK-1P20", 60], ["BRK-2P30", 30], ["CAB-10N", 12], ["CAB-08V", 8], ["TUB-EMT34", 200], ["CAJ-2X4", 150],
    ["LUM-REF50", 20], ["CON-3P25", 6],
  ],
  "PED-2026-03104": [["VAR-5HP", 1], ["MOT-1HP", 2], ["REL-TER", 2]],
  "PED-2026-03105": [["CIN-AIS", 100], ["INT-SEN", 40]],
  "PED-2026-03106": [["CAB-12R", 6], ["CAB-12N", 6], ["BRK-1P20", 40], ["TOM-DOB", 80], ["CAJ-2X4", 120]],
  "PED-2026-03107": [["LUM-LED18", 60], ["LUM-REF50", 12], ["TUB-PVC12", 100], ["CIN-AIS", 30]],
}

/**
 * Las líneas de un pedido. Las solicitudes que entran por SAP o por la app solo traen la cantidad de líneas,
 * no el detalle: de dónde sale es [por definir] (en SAP, el pedido de venta). Mientras tanto salen genéricas.
 */
export function lineasDe(p: Pick<PedidoRegistro, "id_pedido" | "lineas">): ItemPedido[] {
  const detalle = LINEAS[p.id_pedido]
  if (detalle)
    return detalle.map(([sku, cantidad]) => ({ sku, cantidad, descripcion: CATALOGO[sku].descripcion, unidad: CATALOGO[sku].unidad }))
  return Array.from({ length: p.lineas }, (_, i) => ({
    sku: `LIN-${i + 1}`,
    descripcion: `Línea ${i + 1} (el detalle llega de SAP)`,
    unidad: "und",
    cantidad: 1,
  }))
}

/** Cuántas líneas tiene el detalle de un pedido, para comprobar que coincide con PEDIDOS.lineas. */
export const lineasConDetalle = () => Object.entries(LINEAS).map(([id, l]) => [id, l.length] as const)
