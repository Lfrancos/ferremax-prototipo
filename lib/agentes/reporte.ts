import { fmtFechaHora, fmtRango } from "../fechas"
import { fmtHoras, fmtPct } from "../formato"
import { resumenSemana } from "../propuestas"
import { A_TIEMPO, INDICADOR_A, INDICADOR_B, INDICADOR_C, RELOJ_APROBACION, RELOJ_BODEGA } from "../rules"
import type { CambioRegla, Pedido } from "../tipos"
import { alertas, alertasTransporte, aprobo, asignacion, diasEnBodega, estadoActual, ETIQUETA_ESTADO, horasDeEspera, listaDeAlistamiento, revisionSemanal } from "../vistas"
import { herramienta, lista, texto, type Agente, type Herramienta } from "./agente"

// AGENTE 3 · EL REPORTE DEL LUNES (Seguimiento · Revisión del lunes).
// Lee los indicadores y los pedidos de la semana, escribe el reporte para la reunión y propone ideas
// de lo que se podría agregar o cambiar. Las ideas son para discutir: no cambia reglas ni decide (PER-9).
// En modo ensayo entrega el resumen de plantilla (resumenSemana) y unas ideas armadas con los mismos datos.

export interface ContextoReporte {
  /** Los pedidos de la semana y los que siguen abiertos. */
  pedidos: Pedido[]
  cambios: CambioRegla[]
}

const SISTEMA = `Eres el analista de la revisión del lunes de Ferremax, una ferretería industrial de Colombia. Cada lunes Marcela (cartera), Andrés (gerente comercial) y Nelson (bodega) revisan la semana anterior de pedidos a crédito: cuánto se demoró la aprobación, qué se aprobó fuera de regla, qué salió tarde de bodega y qué pasó con las entregas.

Cómo trabajas:
- Consulta los indicadores, los pedidos de la semana, bodega y transporte, y los cambios de reglas. Puedes pedir varias herramientas a la vez.
- Escribe el reporte para la reunión: un resumen corto, lo que salió bien, lo que preocupa y preguntas para discutir.
- Propón de 2 a 4 ideas de lo que se podría agregar o cambiar, en el proceso o en la app, para que la próxima semana salga mejor. Cada idea se apoya en un dato de la semana y dice quién la decidiría: Andrés es dueño de la Política de crédito, Marcela de los casos resueltos, la revisión semanal y los avisos, Nelson de la regla de bodega, Sandra del diccionario de datos.
- Usa solo cifras que salgan de las herramientas. Si un dato no está, dilo.
- Entrega con entregar_reporte.

Límites:
- No cambias reglas ni decides: las ideas son propuestas para la reunión.
- Español de Colombia, frases cortas, sin jerga.`

const fila = (p: Pedido) => ({
  id_pedido: p.id_pedido,
  cliente: p.cliente,
  valor_cop: p.valor_cop,
  le_tocaba: asignacion(p).texto,
  horas_de_espera: Math.round(horasDeEspera(p) * 10) / 10,
  aprobo: aprobo(p) ?? null,
  estado: ETIQUETA_ESTADO[estadoActual(p)],
})

export function agenteReporte({ pedidos, cambios }: ContextoReporte): Agente {
  const r = revisionSemanal(pedidos)
  const tope = RELOJ_APROBACION.valores!.tope_h
  const pct = (v: number | null) => (v === null ? "sin dato" : fmtPct(v))

  const herramientas: Herramienta[] = [
    {
      definicion: herramienta("indicadores_semana", "Los cuatro indicadores de la semana anterior con su meta, y cuántos pedidos pasaron del tope en cada tramo."),
      ejecutar: () => ({
        semana: fmtRango(r.desde, r.hasta),
        solicitudes: r.semana.length,
        indicadores: [
          { id: INDICADOR_A.id, titulo: INDICADOR_A.titulo, valor: pct(r.a.valor), meta: `${INDICADOR_A.valores!.meta_pct}% o más`, cumple: r.a.cumple, detalle: r.a.detalle },
          { id: INDICADOR_B.id, titulo: INDICADOR_B.titulo, valor: r.b.valor === null ? "sin dato" : fmtHoras(r.b.valor), meta: `menos de ${INDICADOR_B.valores!.meta_h} h`, cumple: r.b.cumple, detalle: r.b.detalle },
          { id: INDICADOR_C.id, titulo: INDICADOR_C.titulo, valor: r.c.valor, meta: INDICADOR_C.valores!.meta, cumple: r.c.cumple, detalle: r.c.detalle },
          { id: A_TIEMPO.id, titulo: A_TIEMPO.titulo, valor: pct(r.aTiempo.valor), meta: `${A_TIEMPO.valores!.meta_pct}%`, cumple: r.aTiempo.cumple, detalle: r.aTiempo.detalle },
        ],
        fuera_de_tope: {
          aprobar: { tope: `${tope} h`, pedidos: r.fueraDeTope.aprobar.map((p) => p.id_pedido) },
          bodega: { tope: `${RELOJ_BODEGA.valores!.tope_dias} días`, pedidos: r.fueraDeTope.bodega.map((p) => `${p.id_pedido} (día ${diasEnBodega(p)})`) },
        },
      }),
    },
    {
      definicion: herramienta("pedidos_de_la_semana", "Los pedidos de la semana que piden atención: para escalar hoy, aprobados fuera de regla y sin aprobación."),
      ejecutar: () => ({
        para_escalar: r.paraEscalar.map(fila),
        fuera_de_regla: r.fueraDeRegla.map(fila),
        sin_aprobacion: r.sinAprobacion.map(fila),
        andres_ve_para_estar_al_tanto: r.paraVerAndres.map((p) => p.id_pedido),
      }),
    },
    {
      definicion: herramienta("bodega_y_transporte", "Cómo va bodega (lista de mañana, pedidos cerca del tope) y las alertas de transporte y entrega."),
      ejecutar: () => {
        const lista = listaDeAlistamiento(pedidos)
        return {
          despachados_en_la_semana: r.despachados.length,
          lista_de_manana: { corte: fmtFechaHora(lista.corte), pedidos: lista.filas.length },
          bodega_cerca_o_fuera: alertas(pedidos).bodega.map(({ pedido, reloj }) => ({ id_pedido: pedido.id_pedido, lleva: reloj.actual, estado: reloj.palabra })),
          transporte: alertasTransporte(pedidos).map((a) => ({ id_pedido: a.pedido.id_pedido, cliente: a.pedido.cliente, estado: a.palabra, que: a.que })),
        }
      },
    },
    {
      definicion: herramienta("cambios_de_reglas", "Los números de reglas que se cambiaron en la app, con quién, cuándo y por qué."),
      ejecutar: () => ({ cambios: cambios.map((c) => ({ ...c })) }),
    },
    {
      definicion: herramienta("entregar_reporte", "Entrega el reporte de la semana. Llámala una sola vez, al final.", {
        titulo: texto("Una línea con la semana y lo más importante."),
        resumen: lista("3 a 5 frases con lo que pasó en la semana."),
        bien: lista("Lo que salió bien, con su cifra."),
        preocupa: lista("Lo que preocupa, con su cifra."),
        ideas: {
          type: "array",
          description: "2 a 4 ideas de lo que se podría agregar o cambiar.",
          items: {
            type: "object",
            properties: {
              idea: texto("Qué agregar o cambiar."),
              por_que: texto("El dato de la semana que la justifica."),
              quien_decide: texto("El dueño del documento que la decidiría."),
            },
            required: ["idea", "por_que", "quien_decide"],
            additionalProperties: false,
          },
        },
        preguntas: lista("1 a 3 preguntas para la reunión."),
      }),
      ejecutar: () => ({ recibido: true }),
    },
  ]

  return {
    id: "reporte",
    sistema: SISTEMA,
    herramientas,
    entrega: "entregar_reporte",
    esfuerzo: "medium",
    maxVueltas: 6,
    pedido: `Prepara el reporte de la revisión del lunes para la semana del ${fmtRango(r.desde, r.hasta)} e incluye tus ideas de lo que podemos agregar o cambiar.`,
    ensayo: {
      pensando: [
        "Para el reporte necesito los indicadores, los pedidos que piden atención, cómo van bodega y transporte, y si alguien cambió una regla. Pido todo de una vez.",
        "Con esto escribo el reporte y propongo ideas apoyadas en los datos. No cambio nada: son para la reunión.",
      ],
      consultas: ["indicadores_semana", "pedidos_de_la_semana", "bodega_y_transporte", "cambios_de_reglas"].map((nombre) => ({ nombre, entrada: {} })),
      entrega: () => {
        const indicadores = [
          { t: INDICADOR_A.titulo, v: pct(r.a.valor), ok: r.a.cumple },
          { t: INDICADOR_B.titulo, v: r.b.valor === null ? "sin dato" : fmtHoras(r.b.valor), ok: r.b.cumple },
          { t: INDICADOR_C.titulo, v: String(r.c.valor), ok: r.c.cumple },
          { t: A_TIEMPO.titulo, v: pct(r.aTiempo.valor), ok: r.aTiempo.cumple },
        ]
        const transporte = alertasTransporte(pedidos)
        const ideas = [
          r.fueraDeTope.aprobar.length && {
            idea: "Mandar un aviso extra a quien aprueba dos horas antes del tope.",
            por_que: `${r.fueraDeTope.aprobar.length === 1 ? "1 solicitud de la semana pasó" : `${r.fueraDeTope.aprobar.length} solicitudes de la semana pasaron`} de ${tope} h.`,
            quien_decide: "Marcela Ríos (avisos)",
          },
          r.c.valor && {
            idea: "Que la app no deje firmar a quien no le toca, en vez de solo marcarlo.",
            por_que: `Hubo ${r.c.valor} ${r.c.valor === 1 ? "aprobación" : "aprobaciones"} fuera de regla.`,
            quien_decide: "Andrés Molina (Política de crédito)",
          },
          r.fueraDeTope.bodega.length && {
            idea: "Revisar con Nelson la capacidad de bodega de los días con más pedidos.",
            por_que: `${r.fueraDeTope.bodega.length === 1 ? "1 pedido salió" : `${r.fueraDeTope.bodega.length} pedidos salieron`} de bodega después del tope.`,
            quien_decide: "Nelson (regla de bodega)",
          },
          transporte.length && {
            idea: "Pedirle al conductor la foto de la remisión firmada antes de irse de la obra.",
            por_que: `${transporte.length === 1 ? "1 entrega pide" : `${transporte.length} entregas piden`} una llamada por la evidencia.`,
            quien_decide: "Nelson [por definir: el documento de transporte no tiene dueño]",
          },
          {
            idea: "Agregar el historial de pagos del cliente a la ficha.",
            por_que: "La nota de contexto no tiene con qué medir cómo paga el cliente.",
            quien_decide: "Sandra Beltrán (diccionario de datos)",
          },
        ].filter((x): x is { idea: string; por_que: string; quien_decide: string } => !!x)
        return {
          titulo: `Semana del ${fmtRango(r.desde, r.hasta)}: ${r.semana.length} solicitudes, ${r.paraEscalar.length} para escalar`,
          resumen: resumenSemana(pedidos).slice(0, 5),
          bien: indicadores.filter((i) => i.ok === true).map((i) => `${i.t}: ${i.v}.`),
          preocupa: indicadores.filter((i) => i.ok === false).map((i) => `${i.t}: ${i.v}.`),
          ideas: ideas.slice(0, 4),
          preguntas: [
            ...(r.paraEscalar.length ? [`¿Quién llama hoy por ${r.paraEscalar.map((p) => p.id_pedido).join(", ")}?`] : []),
            ...(cambios.length ? [`Se cambiaron ${cambios.length} números de reglas: ¿se dejan así?`] : []),
            "¿Cuál de estas ideas probamos esta semana?",
          ],
        }
      },
    },
  }
}
