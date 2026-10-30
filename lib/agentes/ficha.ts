import { HOY } from "../data"
import { diasCalendario, fmtFechaHora } from "../fechas"
import { fmtCOP } from "../formato"
import { notaDeContexto } from "../propuestas"
import { CASOS_RESUELTOS, CHEQUEOS } from "../rules"
import type { Cliente, FechaHora, PartidaAbierta, Pedido } from "../tipos"
import { ETIQUETA_ESTADO, asignacion, decision, estadoActual, fechaSolicitud, relojAprobacion, resumenDecision } from "../vistas"
import { herramienta, lista, type Agente, type Herramienta } from "./agente"

// AGENTE 1 · PREPARAR LA DECISIÓN (paso 2 · Aprobar).
// Lee lo que hay del cliente y escribe la nota de contexto que va junto a la ficha.
// Investiga y redacta; no aprueba (PER-9). Reemplaza la plantilla notaDeContexto de lib/propuestas.ts,
// que sigue siendo lo que entrega en modo ensayo.

/** Lo que manda la pantalla: el pedido y lo que hay de su cliente. En producción, cada herramienta consulta la base. */
export interface ContextoFicha {
  pedido: Pedido
  cliente: Cliente | null
  /** Los otros pedidos del mismo cliente. */
  otros: Pedido[]
  /** Las partidas abiertas del cliente en el último corte de cartera. */
  partidas: PartidaAbierta[]
  corte: FechaHora
}

const SISTEMA = `Eres el asistente de crédito de Ferremax, una ferretería industrial de Colombia. Preparas la nota de contexto que lee quien aprueba un pedido a crédito, junto a la ficha de decisión.

Cómo trabajas:
- Consulta con las herramientas lo que necesites: el cliente, su cartera, sus pedidos anteriores, las reglas que aplican y los casos resueltos parecidos. Puedes pedir varias a la vez.
- No inventes datos. Si algo no está, dilo.
- Cuando tengas lo necesario, entrega con entregar_nota.

Límites:
- No decides. No digas si aprobar o rechazar ni sugieras prioridad: eso lo hace una persona.
- No tienes herramientas para aprobar, cambiar datos ni mandar mensajes.
- Español de Colombia, frases cortas, sin jerga. Cifras en COP con puntos de miles.`

export function agenteFicha({ pedido: p, cliente, otros, partidas, corte }: ContextoFicha): Agente {
  const herramientas: Herramienta[] = [
    {
      definicion: herramienta("consultar_cliente", "Datos del maestro de clientes de SAP: razón social, segmento, sede, vendedor, plazo, cupo autorizado y antigüedad."),
      ejecutar: () =>
        cliente
          ? { ...cliente }
          : { razon_social: p.cliente, cupo_cop: p.cupo_cop, antiguedad_anios: p.antiguedad_anios, nota: "El cliente no está en el maestro cargado." },
    },
    {
      definicion: herramienta("consultar_cartera", "Lo que debe el cliente según el último corte de cartera: saldo, saldo vencido, días de atraso, pagos sin aplicar y cada partida abierta."),
      ejecutar: () => ({
        corte,
        saldo_pendiente_cop: p.saldo_pendiente_cop,
        saldo_vencido_cop: p.saldo_vencido_cop,
        dias_atraso: p.dias_atraso,
        pago_sin_aplicar_cop: p.pago_sin_aplicar_cop,
        factura_mas_antigua: p.factura_mas_antigua,
        partidas: partidas.map((x) => ({
          documento: x.documento,
          tipo: x.tipo,
          fecha: x.fecha_documento,
          vence: x.vencimiento,
          saldo_abierto_cop: x.saldo_abierto_cop,
          dias_vencida: x.vencimiento ? Math.max(0, diasCalendario(x.vencimiento, HOY)) : null,
        })),
      }),
    },
    {
      definicion: herramienta("pedidos_anteriores", "Los otros pedidos del cliente en la app: cuándo se pidieron, cuánto valían, cómo quedaron y quién los decidió."),
      ejecutar: () => {
        const promedio = otros.length ? otros.reduce((s, o) => s + o.valor_cop, 0) / otros.length : null
        return {
          cuantos: otros.length,
          promedio_cop: promedio === null ? null : Math.round(promedio),
          este_pedido_vale_veces_el_promedio: promedio ? Math.round((p.valor_cop / promedio) * 10) / 10 : null,
          pedidos: [...otros]
            .sort((a, b) => fechaSolicitud(b).localeCompare(fechaSolicitud(a)))
            .slice(0, 10)
            .map((o) => ({
              id_pedido: o.id_pedido,
              solicitud: fechaSolicitud(o),
              valor_cop: o.valor_cop,
              estado: ETIQUETA_ESTADO[estadoActual(o)],
              decidio: decision(o)?.quien ?? null,
              motivo: decision(o)?.motivo ?? null,
            })),
        }
      },
    },
    {
      definicion: herramienta("reglas_del_pedido", "Lo que dicen las reglas de este pedido: quién lo aprueba y por qué, los cuatro chequeos, la condición que pide revisión y cuánto lleva esperando."),
      ejecutar: () => {
        const a = asignacion(p)
        const r = resumenDecision(p)
        const reloj = relojAprobacion(p)
        return {
          quien_aprueba: a.texto,
          por_que: a.porque,
          chequeos: CHEQUEOS.map((c) => ({ id: c.id, titulo: c.titulo, ...c.fn(p) })),
          condiciones: r.condiciones,
          informacion: r.informacion,
          cupo_disponible_cop: r.cupoDisponible,
          espera: { lleva: reloj.actual, tope: reloj.tope, estado: reloj.palabra },
          situacion_no_cubierta: p.situacion_no_cubierta ?? null,
        }
      },
    },
    {
      definicion: herramienta("casos_parecidos", "Los casos resueltos de crédito que escribió Marcela y que se parecen a este pedido, con lo que se decidió en cada uno."),
      ejecutar: () => ({
        parecidos: CASOS_RESUELTOS.filter((c) => c.fn(p) === true).map((c) => ({ id: c.id, titulo: c.titulo, texto: c.texto })),
        otros_casos: CASOS_RESUELTOS.filter((c) => c.fn(p) !== true).map((c) => c.titulo),
      }),
    },
    {
      definicion: herramienta("entregar_nota", "Entrega la nota de contexto. Llámala una sola vez, al final.", {
        nota: lista("2 a 4 frases cortas con lo que no se ve a simple vista en la ficha."),
        mirar: lista("1 a 3 cosas concretas que conviene revisar antes de firmar. Sin decir si aprobar o rechazar."),
        falta: lista("Datos que no están y ayudarían a decidir. Vacío si no falta nada."),
      }),
      ejecutar: () => ({ recibido: true }),
    },
  ]

  return {
    id: "ficha",
    sistema: SISTEMA,
    herramientas,
    entrega: "entregar_nota",
    esfuerzo: "low",
    maxVueltas: 6,
    pedido: `Prepara la nota de contexto del pedido ${p.id_pedido} de ${p.cliente}, por COP ${fmtCOP(p.valor_cop)}, solicitado el ${fmtFechaHora(fechaSolicitud(p))}. Lo aprueba: ${asignacion(p).texto}.`,
    ensayo: {
      pensando: [
        `Para escribir la nota de ${p.id_pedido} necesito el cliente, su cartera, cómo le ha ido antes, las reglas y los casos parecidos. Pido las cinco consultas de una vez.`,
        "Ya tengo lo necesario. Escribo la nota sin decir si aprobar: eso lo decide quien firma.",
      ],
      consultas: ["consultar_cliente", "consultar_cartera", "pedidos_anteriores", "reglas_del_pedido", "casos_parecidos"].map((nombre) => ({ nombre, entrada: {} })),
      entrega: () => {
        const n = notaDeContexto(p, [p, ...otros])
        const r = resumenDecision(p)
        return {
          nota: [...n.lineas, ...r.informacion].slice(0, 4),
          mirar: r.condiciones.length
            ? r.condiciones.map((c) => `${c}: revisar si procede una excepción, un pago previo o un ajuste.`)
            : [`Pasa los cuatro chequeos. Confirmar que nada cambió desde el corte de cartera (${fmtFechaHora(corte)}).`],
          falta: [n.falta],
        }
      },
    },
  }
}
