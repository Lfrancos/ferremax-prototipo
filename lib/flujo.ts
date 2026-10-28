import { FECHA_LIMITE, RELOJ_APROBACION } from "./rules"

// Los 8 momentos del flujo, para /como-funciona y para saber en qué pantalla vive cada regla.
// Los 6 primeros llegan hasta que el pedido sale de bodega; el 7 y el 8 son el transporte, que no tiene tope.
// Los topes se leen de las reglas cada vez (se pueden editar en la demo).

export type TipoInsignia = "regla" | "ia" | "humano" | "propuesta"

export function tramos() {
  const tope_h = RELOJ_APROBACION.valores!.tope_h
  const diasAprobar = tope_h / 24
  const diasBodega = FECHA_LIMITE.valores!.dias
  const nAprobar = Number.isInteger(diasAprobar) ? String(diasAprobar) : diasAprobar.toFixed(1).replace(".", ",")
  return [
    {
      clave: "aprobar" as const,
      rotulo: `${nAprobar} ${diasAprobar === 1 ? "día" : "días"} · Aprobar`,
      detalle: `${tope_h} h corridas desde la solicitud`,
      regla: RELOJ_APROBACION.id,
      momentos: [1, 2, 3],
    },
    {
      clave: "bodega" as const,
      rotulo: `${diasBodega} días · Alistar y despachar`,
      detalle: "Días calendario desde la aprobación hasta que sale en camión",
      regla: FECHA_LIMITE.id,
      momentos: [4, 5],
    },
  ]
}

export interface Momento {
  n: number
  titulo: string
  hace: string
  tipos: TipoInsignia[]
  tipoTexto: string
  decide: string
  reglas: string[]
  pantalla: { href: string; nombre: string }
}

export const MOMENTOS: Momento[] = [
  {
    n: 1,
    titulo: "Llega la solicitud",
    hace: "Corre los cuatro chequeos (máximo, cupo, atraso, cliente nuevo) y dice quién aprueba.",
    tipos: ["regla"],
    tipoTexto: "Regla",
    decide: "Nadie: es una regla",
    reglas: ["CRED-1.1"],
    pantalla: { href: "/solicitudes", nombre: "Solicitudes" },
  },
  {
    n: 2,
    titulo: "Preparar la decisión",
    hace: "Arma la ficha de cinco líneas: cliente, valor, cupo y saldo, atraso, antigüedad.",
    tipos: ["regla", "propuesta"],
    tipoTexto: "Regla + propuesta IA",
    decide: "Quien aprueba",
    reglas: ["CRED-2.6"],
    pantalla: { href: "/pedidos/PED-2026-03103", nombre: "Ficha del pedido" },
  },
  {
    n: 3,
    titulo: "Decidir",
    hace: "Nada. La firma es humana, con motivo escrito.",
    tipos: ["humano"],
    tipoTexto: "Humano",
    decide: "Andrés, Marcela o Sandra",
    reglas: ["PER-4"],
    pantalla: { href: "/", nombre: "Tablero" },
  },
  {
    n: 4,
    titulo: "Pasar a bodega",
    hace: "Lo aprobado hoy entra en la lista de mañana a las 7:00 a.m., con su fecha límite.",
    tipos: ["regla"],
    tipoTexto: "Regla",
    decide: "Nelson",
    reglas: ["BOD-1.1"],
    pantalla: { href: "/bodega", nombre: "Bodega" },
  },
  {
    n: 5,
    titulo: "Vigilar el reloj",
    hace: "Rutina diaria que avisa qué pedidos se acercan al tope. Avisa, no decide.",
    tipos: ["regla", "propuesta"],
    tipoTexto: "Rutina + propuesta IA",
    decide: "Marcela y Nelson",
    reglas: ["CRED-3.1", "BOD-4.1"],
    pantalla: { href: "/alertas", nombre: "Alertas" },
  },
  {
    n: 6,
    titulo: "Revisar la semana",
    hace: "Cada lunes: indicadores A, B y C, fuera de tope por tramo y lista para escalar.",
    tipos: ["regla", "propuesta"],
    tipoTexto: "Reporte + propuesta IA",
    decide: "Marcela, Andrés y Nelson",
    reglas: ["REV-A"],
    pantalla: { href: "/revision", nombre: "Revisión" },
  },
  {
    n: 7,
    titulo: "Entregar a transporte",
    hace: "Nelson anota lo que carga, línea por línea. Si falta algo, sale incompleto y se avisa. Desde ahí el pedido está en camino.",
    tipos: ["regla", "humano"],
    tipoTexto: "Regla + humano",
    decide: "Nelson",
    reglas: ["TRA-1", "TRA-2"],
    pantalla: { href: "/bodega", nombre: "Bodega" },
  },
  {
    n: 8,
    titulo: "Confirmar la entrega",
    hace: "La transportadora manda la foto del producto y del documento firmado. Claude las lee y levanta una alerta si falta algo.",
    tipos: ["regla", "propuesta"],
    tipoTexto: "Regla + propuesta IA",
    decide: "Nelson y Marcela",
    reglas: ["TRA-3", "TRA-4"],
    pantalla: { href: "/transporte", nombre: "Transporte" },
  },
]
