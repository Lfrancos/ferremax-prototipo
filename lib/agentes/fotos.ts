import type Anthropic from "@anthropic-ai/sdk"
import { leerMensaje, remisionDe } from "../evidencia"
import { lineasDe } from "../lineas"
import { ALERTA_ENTREGA, EVIDENCIA_ENTREGA } from "../rules"
import type { MensajeTransporte, Pedido } from "../tipos"
import { entregaDe } from "../vistas"
import { herramienta, lista, oNulo, texto, textoONulo, type Agente, type Herramienta } from "./agente"

// AGENTE 2 · LEER LAS FOTOS DE LA ENTREGA (paso 4 · Transporte).
// Claude ve las fotos que mandó el conductor (la pantalla las convierte en PNG) y dice qué lee en ellas.
// Si lee un número de remisión, lo busca para saber de qué pedido es: eso es lo que lo vuelve agente.
// No da la entrega por buena ni cierra alertas: eso lo hacen Nelson o Marcela (TRA-4).
// La descripción de cada foto (lib/tipos.ts) NO se le manda a Claude: solo la usa el modo ensayo.

export interface ContextoFotos {
  mensaje: MensajeTransporte
  /** Las fotos en PNG, en base64, tal como se ven en pantalla. */
  imagenes: { producto?: string; documento?: string }
  /** Los pedidos que ya salieron de bodega: donde se busca una remisión. */
  pedidos: Pedido[]
}

const SISTEMA = `Eres el lector de evidencias de entrega de Ferremax, una ferretería industrial de Colombia. Cuando el conductor entrega en la obra, manda por WhatsApp o por un enlace una foto del producto entregado y una foto de la remisión firmada por quien recibe.

Cómo trabajas:
- Mira cada foto con cuidado. En la del producto, cuenta los bultos (cajas) a la vista.
- En la remisión, lee el número impreso (formato REM-AAAA-NNNNN), el nombre escrito a mano junto a «Recibe», si hay una firma junto a «Firma» y lo que se escribió junto a «Novedad».
- Si una foto está borrosa y no se lee, dilo. No adivines.
- Si lees un número de remisión, búscalo con buscar_remision para saber de qué pedido es y qué salió de bodega. Con reglas_de_evidencia sabes qué debe traer la evidencia.
- Al final, entrega con entregar_lectura.

Límites:
- No das la entrega por buena ni abres o cierras alertas: eso lo hacen Nelson o Marcela.
- No le escribes al conductor.
- Español de Colombia, frases cortas.`

const SI_NO_BORROSA = { type: "string", enum: ["si", "no", "borrosa"] }

export function agenteFotos({ mensaje: m, imagenes, pedidos }: ContextoFotos): Agente {
  const esperada = m.id_pedido ? remisionDe(m.id_pedido) : null

  const herramientas: Herramienta[] = [
    {
      definicion: herramienta("buscar_remision", "Busca una remisión entre los pedidos que ya salieron de bodega: de qué pedido y cliente es, quién la lleva y qué salió.", {
        numero: texto("El número de remisión tal como se lee, por ejemplo REM-2026-03001."),
      }),
      ejecutar: ({ numero }) => {
        const p = pedidos.find((x) => remisionDe(x.id_pedido) === String(numero).trim().toUpperCase())
        if (!p) return { encontrada: false, nota: `Ningún pedido que haya salido de bodega tiene la remisión ${numero}.` }
        const e = entregaDe(p)
        return {
          encontrada: true,
          id_pedido: p.id_pedido,
          cliente: p.cliente,
          conductor: p.despacho ? `${p.despacho.nombre} · ${p.despacho.transportadora} · ${p.despacho.placa}` : null,
          salio_completo: e?.carga.completo ?? null,
          faltantes: e?.carga.faltantes.map((f) => `${f.descripcion}: faltan ${f.falta}`) ?? [],
          lineas: lineasDe(p).map((l) => `${l.cantidad} ${l.unidad} · ${l.descripcion}`),
          es_la_esperada: esperada ? remisionDe(p.id_pedido) === esperada : null,
        }
      },
    },
    {
      definicion: herramienta("reglas_de_evidencia", "Qué debe traer la evidencia de entrega y cuándo se abre una alerta."),
      ejecutar: () => ({ [EVIDENCIA_ENTREGA.id]: EVIDENCIA_ENTREGA.texto, [ALERTA_ENTREGA.id]: ALERTA_ENTREGA.texto }),
    },
    {
      definicion: herramienta("entregar_lectura", "Entrega lo que leíste en las fotos. Llámala una sola vez, al final.", {
        producto: { ...SI_NO_BORROSA, description: "Si hay foto del producto y se ve (si), si no hay (no) o si sale borrosa." },
        bultos: oNulo("integer", "Bultos a la vista en la foto del producto. null si no hay foto o no se distinguen."),
        documento: { ...SI_NO_BORROSA, description: "Si hay foto de la remisión y se lee (si), si no hay (no) o si sale borrosa." },
        remision: textoONulo("El número de remisión que se lee. null si no se ve."),
        nombre: textoONulo("El nombre escrito a mano junto a «Recibe». null si no hay."),
        firma: oNulo("boolean", "Si hay firma. null si la remisión no se lee."),
        novedad: textoONulo("Lo escrito junto a «Novedad». null si no hay nada."),
        es_de_este_pedido: oNulo("boolean", "Si la remisión leída es la del pedido esperado. null si no hay pedido esperado o no se leyó."),
        observaciones: lista("1 a 3 frases sobre lo que conviene que revise una persona. Vacío si todo está claro."),
      }),
      ejecutar: () => ({ recibido: true }),
    },
  ]

  const foto = (data: string): Anthropic.ImageBlockParam => ({ type: "image", source: { type: "base64", media_type: "image/png", data } })
  const pedido: Anthropic.ContentBlockParam[] = [
    {
      type: "text",
      text: `Mensaje ${m.id} del conductor ${m.de} por ${m.canal}. Escribió: «${m.texto}». ${esperada ? `Lo esperamos para la remisión ${esperada} (pedido ${m.id_pedido}).` : "Todavía no se sabe de qué pedido es."}`,
    },
    ...(imagenes.producto ? [{ type: "text" as const, text: "Foto 1 · producto:" }, foto(imagenes.producto)] : []),
    ...(imagenes.documento ? [{ type: "text" as const, text: `Foto ${imagenes.producto ? 2 : 1} · remisión:` }, foto(imagenes.documento)] : []),
    { type: "text", text: imagenes.producto || imagenes.documento ? "Lee las fotos y entrega la lectura." : "El mensaje no trae fotos. Entrega la lectura diciendo qué falta." },
  ]

  const l = leerMensaje(m)
  return {
    id: "fotos",
    sistema: SISTEMA,
    herramientas,
    entrega: "entregar_lectura",
    esfuerzo: "low",
    maxVueltas: 5,
    pedido,
    ensayo: {
      pensando: [
        l.remision
          ? `En la remisión leo ${l.remision}. La busco para saber de qué pedido es, y miro qué debe traer la evidencia.`
          : "No leo un número de remisión. Miro qué debe traer la evidencia para decir qué falta.",
        "Ya tengo la lectura. No doy la entrega por buena: eso lo decide una persona.",
      ],
      consultas: [{ nombre: "reglas_de_evidencia", entrada: {} }, ...(l.remision ? [{ nombre: "buscar_remision", entrada: { numero: l.remision } }] : [])],
      entrega: () => ({
        ...l,
        bultos: l.producto === "si" ? (m.producto?.bultos ?? null) : null,
        es_de_este_pedido: esperada && l.remision ? l.remision === esperada : null,
        observaciones: [
          ...(l.documento === "borrosa" ? ["La remisión sale borrosa: hay que pedirla otra vez."] : []),
          ...(esperada && l.remision && l.remision !== esperada ? [`La remisión ${l.remision} no es la de este pedido (${esperada}).`] : []),
          ...(l.documento === "si" && !l.firma ? ["La remisión no tiene firma."] : []),
          ...(l.documento === "si" && !l.nombre ? ["Nadie escribió quién recibió."] : []),
          ...(l.novedad ? [`Quien recibió anotó una novedad: «${l.novedad}».`] : []),
        ],
      }),
    },
  }
}
