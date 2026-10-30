"use client"

import Link from "next/link"
import { EnlacesDocumentos } from "@/components/ferremax/enlaces-documentos"
import { BotonEntregar } from "@/components/ferremax/entregar"
import { EntregaDelPedido } from "@/components/ferremax/entrega-pedido"
import { Semaforo } from "@/components/ferremax/estado"
import { EstadoPedido } from "@/components/ferremax/estado-pedido"
import { TiempoTotalPedido } from "@/components/ferremax/tiempo-total"
import { PanelFirma, usePermisoFirma } from "@/components/ferremax/firmar"
import { HistorialPedido } from "@/components/ferremax/historial"
import { ReglaBoton } from "@/components/ferremax/insignia"
import { Bloque, NotaPropuesta, Titulo } from "@/components/ferremax/piezas"
import { fmtDia, fmtFechaHora } from "@/lib/fechas"
import { fmtCOP } from "@/lib/formato"
import { notaDeContexto } from "@/lib/propuestas"
import {
  ASIGNAR_APROBADOR,
  CHEQUEOS,
  ENTRADA_A_LA_FILA,
  FECHA_LIMITE,
  FICHA,
  FIRMAR_PEDIDO,
  SALDO_VENCIDO,
  REMISION_SIN_FIRMA,
  VER_INFO_CREDITO,
} from "@/lib/rules"
import { usePrototipo } from "@/lib/store"
import type { Pedido } from "@/lib/tipos"
import { cn } from "@/lib/utils"
import { ETIQUETA_ESTADO, asignacion, decision, listoDesde, relojAprobacion, relojBodega, resumenDecision, tramoDe } from "@/lib/vistas"

export function FichaPedido({ id }: { id: string }) {
  const { pedidos, rol } = usePrototipo()
  const p = pedidos.find((x) => x.id_pedido === id)
  if (!p)
    return (
      <p className="subtitulo">
        No hay un pedido {id} en los datos.{" "}
        <Link href="/" className="underline">
          Volver al tablero
        </Link>
      </p>
    )
  const verInfo = VER_INFO_CREDITO.fn(rol)

  return (
    <>
      <Titulo indice="(003) Ficha y decisión" titulo={p.id_pedido} bajada={p.cliente}>
        <div className="flex flex-col items-end gap-3">
          <EstadoPedido pedido={p} />
          <div className="text-right">
            <p className="etiqueta mb-1 text-muted-foreground">Tiempo total</p>
            <TiempoTotalPedido pedido={p} />
          </div>
          <div className="text-right">
            <p className="etiqueta mb-1 text-muted-foreground">Documentos</p>
            <EnlacesDocumentos pedido={p} className="justify-end" />
          </div>
          <div className="text-right">
            <p className="etiqueta mb-1 text-muted-foreground">Reloj de aprobación</p>
            <Semaforo reloj={relojAprobacion(p)} />
          </div>
        </div>
      </Titulo>
      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <div className="flex flex-col gap-6">
          <QuienAprueba pedido={p} verInfo={verInfo} />
          {verInfo ? (
            <>
              <Ficha pedido={p} />
              <NotaContexto pedido={p} pedidos={pedidos} />
            </>
          ) : (
            <Bloque titulo="2 · Ficha de decisión" tipos={["regla"]} reglas={[VER_INFO_CREDITO.id]}>
              <p className="text-[15px] text-muted-foreground">
                La ficha trae valor, cupo autorizado y disponible, saldo vencido, atraso y antigüedad. Tu rol ve solo el nombre del cliente.
              </p>
            </Bloque>
          )}
        </div>
        <div className="flex flex-col gap-6">
          <Decision pedido={p} />
          <PasoABodega pedido={p} />
          <Bloque titulo="Historial de actividad" tipos={["regla", "humano"]} pie="Cada evento queda con quién y cuándo. Los del Sistema son reglas.">
            <HistorialPedido pedido={p} />
          </Bloque>
        </div>
      </div>
      <div className="mt-6">
        <EntregaDelPedido pedido={p} />
      </div>
    </>
  )
}

function QuienAprueba({ pedido, verInfo }: { pedido: Pedido; verInfo: boolean }) {
  const a = asignacion(pedido)
  return (
    <Bloque titulo="1 · Quién aprueba" tipos={["regla"]} reglas={a.reglas}>
      <p className="etiqueta text-muted-foreground">Lo aprueba</p>
      <p className="titulo mt-1">{a.texto}</p>
      {verInfo ? (
        <>
          <p className="subtitulo mt-3">{a.porque}</p>
          <ul className="mt-5 divide-y divide-linea border-y border-linea">
            {CHEQUEOS.map((c) => {
              const r = c.fn(pedido)
              const glifo = r.pasa === null ? "…" : r.pasa ? "✓" : "✕"
              return (
                <li key={c.id} className="flex flex-wrap items-baseline gap-3 py-2.5 text-[15px]">
                  <span
                    aria-hidden
                    className={cn("w-4 font-mono", r.pasa === false && "text-vencido", r.pasa === true && "text-aprobado", r.pasa === null && "text-muted-foreground")}
                  >
                    {glifo}
                  </span>
                  <span className="w-56 shrink-0 font-medium">{c.titulo}</span>
                  <span className="flex-1 text-muted-foreground">
                    {r.pasa === null ? "Falta el dato" : r.pasa ? "Pasa" : "No pasa"} · {r.detalle}
                  </span>
                  <ReglaBoton id={c.id} soloId />
                </li>
              )
            })}
          </ul>
        </>
      ) : (
        <p className="mt-3 text-[15px] text-muted-foreground">
          El porqué usa información de crédito, oculta para tu rol <ReglaBoton id={VER_INFO_CREDITO.id} soloId />.
        </p>
      )}
      <p className="mt-3 text-sm text-muted-foreground">{ASIGNAR_APROBADOR.texto}</p>
    </Bloque>
  )
}

function Ficha({ pedido }: { pedido: Pedido }) {
  const f = FICHA.fn(pedido)
  const r = resumenDecision(pedido)
  const blanco = "[en blanco]"
  // Las cinco líneas son las de la Política (CRED-2.6). Las de abajo salen de los mismos datos del corte de cartera.
  const paraDecidir = [
    { rotulo: "Cupo autorizado", valor: `COP ${fmtCOP(r.cupoAutorizado)}` },
    { rotulo: "Cupo disponible", valor: r.cupoDisponible === null ? blanco : `COP ${fmtCOP(r.cupoDisponible)}`, regla: CHEQUEOS[1].id },
    { rotulo: "Saldo vencido", valor: r.saldoVencido === null ? blanco : `COP ${fmtCOP(r.saldoVencido)}`, regla: SALDO_VENCIDO.id },
  ]
  return (
    <section className="border border-linea bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-amarillo px-6 py-3 text-sobre-amarillo">
        <h2 className="subtitulo">2 · Ficha de decisión · {pedido.id_pedido}</h2>
        <div className="flex items-center gap-2">
          {r.requiereRevision && <span className="etiqueta border border-sobre-amarillo px-2 py-0.5">Requiere revisión</span>}
          <ReglaBoton id={FICHA.id} className="border-sobre-amarillo bg-sobre-amarillo text-amarillo" />
        </div>
      </div>
      <dl className="divide-y divide-linea px-6">
        {f.lineas.map((l) => (
          <div key={l.rotulo} className="grid grid-cols-[14rem_1fr] gap-4 py-3">
            <dt className="etiqueta pt-1 text-muted-foreground">{l.rotulo}</dt>
            <dd className={cn("text-lg", l.valor.includes("[en blanco]") && "text-vencido")}>{l.valor}</dd>
          </div>
        ))}
        {paraDecidir.map((l) => (
          <div key={l.rotulo} className="grid grid-cols-[14rem_1fr] gap-4 py-3">
            <dt className="etiqueta pt-1 text-muted-foreground">{l.rotulo}</dt>
            <dd className={cn("flex items-center gap-2 text-lg", l.valor === blanco && "text-vencido")}>
              {l.valor} {l.regla && <ReglaBoton id={l.regla} soloId />}
            </dd>
          </div>
        ))}
        <div className="grid grid-cols-[14rem_1fr] gap-4 py-3">
          <dt className="etiqueta pt-1 text-muted-foreground">Condición</dt>
          <dd className={cn("text-lg", r.requiereRevision ? "font-medium text-vencido" : "text-aprobado")}>
            {r.requiereRevision ? r.condiciones.join(" · ") : "Pasa los cuatro chequeos"}
          </dd>
        </div>
      </dl>
      {r.informacion.length > 0 && (
        <div className="border-t border-linea px-6 py-4">
          <p className="etiqueta mb-2 text-muted-foreground">Información para decidir</p>
          <p className="text-[15px]">{r.informacion.join(" ")}</p>
          {r.requiereRevision && (
            <p className="mt-2 text-[15px] text-muted-foreground">
              Se necesita revisar si procede una excepción, un pago previo o un ajuste de condiciones. [por definir: ninguna regla lo dice]
            </p>
          )}
        </div>
      )}
      <p className="border-t border-linea px-6 py-3 text-sm text-muted-foreground">
        {f.pie ? <>Chequeo que falló: {f.pie}</> : "No falla ningún chequeo."} No se mira precio, margen, inventario ni ruta.
      </p>
    </section>
  )
}

function NotaContexto({ pedido, pedidos }: { pedido: Pedido; pedidos: Pedido[] }) {
  const n = notaDeContexto(pedido, pedidos)
  return (
    <Bloque titulo="Nota de contexto" tipos={["propuesta"]}>
      <NotaPropuesta />
      <ul className="flex list-disc flex-col gap-2 pl-5 text-[15px]">
        {n.lineas.map((l) => (
          <li key={l}>{l}</li>
        ))}
        <li className="text-muted-foreground">{n.falta}</li>
      </ul>
      <p className="mt-4 text-sm text-muted-foreground">Pregunta para mentores: ¿qué contexto ayuda a decidir sin cambiar quién decide?</p>
    </Bloque>
  )
}

function Decision({ pedido }: { pedido: Pedido }) {
  const { rol } = usePrototipo()
  const permiso = usePermisoFirma(pedido)
  const tomada = decision(pedido)
  const a = asignacion(pedido)
  const abierto = tramoDe(pedido) === "aprobar"
  const verInfo = VER_INFO_CREDITO.fn(rol)

  return (
    <Bloque
      titulo="3 · Decidir"
      tipos={["humano", "regla"]}
      reglas={[FIRMAR_PEDIDO.id]}
      pie="La firma es humana. El sistema no aprueba, no rechaza y no prioriza."
    >
      {!abierto ? (
        <p className="text-[15px]">
          {tomada ? (
            <>
              {ETIQUETA_ESTADO[tomada.accion as "aprobado"]} por <strong className="font-medium">{tomada.quien}</strong> el{" "}
              {fmtFechaHora(tomada.fecha)}
              {verInfo && <span className="mt-1 block">Motivo: {tomada.motivo}</span>}
            </>
          ) : (
            "Este pedido ya no está en el tramo Aprobar."
          )}
        </p>
      ) : permiso.firmar || permiso.pedirDato ? (
        <PanelFirma pedido={pedido} />
      ) : (
        <p className="text-[15px]">
          {a.tipo === "incompleta"
            ? "Falta un dato: nadie firma hasta que llegue. Lo pide Marcela."
            : `Lo firma ${a.texto}. Tu rol (${rol}) no puede firmarlo, así que no ves los botones.`}
        </p>
      )}
    </Bloque>
  )
}

function PasoABodega({ pedido }: { pedido: Pedido }) {
  const listo = listoDesde(pedido)
  if (!listo || tramoDe(pedido) === "aprobar") return null
  const reloj = relojBodega(pedido)!
  const filas = [
    { rotulo: "Listo desde", valor: fmtFechaHora(listo), regla: ENTRADA_A_LA_FILA.id },
    { rotulo: "Entra en la lista de", valor: fmtFechaHora(ENTRADA_A_LA_FILA.fn(listo)), regla: ENTRADA_A_LA_FILA.id },
    { rotulo: "Fecha límite", valor: fmtDia(FECHA_LIMITE.fn(listo)), regla: FECHA_LIMITE.id },
    {
      rotulo: "Remisión",
      valor: REMISION_SIN_FIRMA.fn().requiereFirma ? "Con firma de cartera" : "Sin firma de cartera",
      regla: REMISION_SIN_FIRMA.id,
    },
  ]
  return (
    <Bloque titulo="4 · Pasar a bodega" tipos={["regla"]} pie="Quien decide en bodega: Nelson, en el orden de la lista.">
      <dl className="divide-y divide-linea border-y border-linea">
        {filas.map((f) => (
          <div key={f.rotulo} className="flex items-center justify-between gap-4 py-2.5 text-[15px]">
            <dt className="text-muted-foreground">{f.rotulo}</dt>
            <dd className="flex items-center gap-2 text-right">
              {f.valor} <ReglaBoton id={f.regla} soloId />
            </dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <Semaforo reloj={reloj} />
        {tramoDe(pedido) === "bodega" && <BotonEntregar pedido={pedido} grande />}
      </div>
    </Bloque>
  )
}
