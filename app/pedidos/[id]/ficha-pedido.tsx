"use client"

import Link from "next/link"
import { BellIcon, BellOffIcon } from "lucide-react"
import { toast } from "sonner"
import { CabeceraCorrida, ComoLoHizo, HerramientasDelAgente, Traza, useAgente } from "@/components/ferremax/agente"
import { EnlacesDocumentos } from "@/components/ferremax/enlaces-documentos"
import { BotonEntregar } from "@/components/ferremax/entregar"
import { EntregaDelPedido } from "@/components/ferremax/entrega-pedido"
import { Semaforo } from "@/components/ferremax/estado"
import { EstadoPedido } from "@/components/ferremax/estado-pedido"
import { TiempoTotalPedido } from "@/components/ferremax/tiempo-total"
import { PanelFirma, usePermisoFirma } from "@/components/ferremax/firmar"
import { HistorialPedido } from "@/components/ferremax/historial"
import { ReglaBoton } from "@/components/ferremax/insignia"
import { Bloque, Titulo } from "@/components/ferremax/piezas"
import { Button } from "@/components/ui/button"
import { agenteFicha, type ContextoFicha } from "@/lib/agentes/ficha"
import type { NotaFicha } from "@/lib/agentes/tipos"
import { fmtDia, fmtFechaHora } from "@/lib/fechas"
import { fmtCOP } from "@/lib/formato"
import {
  ASIGNAR_APROBADOR,
  CHEQUEOS,
  ENTRADA_A_LA_FILA,
  FECHA_LIMITE,
  FICHA,
  FIRMAR_PEDIDO,
  LO_QUE_HACE_CLAUDE,
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
          <SeguirPedido pedido={p} />
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

/** La nota de contexto la prepara el agente de lib/agentes/ficha.ts. Investiga y redacta; no aprueba (PER-9). */
function NotaContexto({ pedido, pedidos }: { pedido: Pedido; pedidos: Pedido[] }) {
  const { clientes, cartera } = usePrototipo()
  const agente = useAgente("ficha", pedido.id_pedido)
  const contexto: ContextoFicha = {
    pedido,
    cliente: clientes.find((c) => c.id_cliente === pedido.id_cliente) ?? null,
    otros: pedidos.filter((o) => o.id_cliente === pedido.id_cliente && o.id_pedido !== pedido.id_pedido),
    partidas: cartera.partidas.filter((x) => x.id_cliente === pedido.id_cliente),
    corte: cartera.corte,
  }
  const { herramientas, entrega } = agenteFicha(contexto)
  const c = agente.corrida
  const nota = c?.resultado as NotaFicha | null | undefined

  return (
    <Bloque
      titulo="Nota de contexto"
      tipos={["ia", "regla"]}
      reglas={[LO_QUE_HACE_CLAUDE.id]}
      accion={
        <Button variant={c ? "outline" : "default"} disabled={agente.corriendo} onClick={() => agente.correr(contexto, "Preparó la nota de contexto", pedido.id_pedido)}>
          {agente.corriendo ? "Preparando…" : c ? "Volver a preparar" : "Preparar con el agente"}
        </Button>
      }
      pie="Claude consulta y redacta. No tiene herramientas para aprobar, rechazar ni cambiar datos: la firma es de una persona."
    >
      {agente.vivo ? (
        <Traza pasos={agente.vivo.pasos} entrega={entrega} enVivo />
      ) : c ? (
        <>
          <CabeceraCorrida corrida={c} />
          {nota ? (
            <div className="mt-4 flex flex-col gap-4 text-[15px]">
              <ul className="flex list-disc flex-col gap-2 pl-5">
                {nota.nota.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
              {nota.mirar.length > 0 && (
                <div>
                  <p className="etiqueta mb-1 text-grafito">Antes de firmar, mirar</p>
                  <ul className="flex list-disc flex-col gap-1 pl-5">
                    {nota.mirar.map((l) => (
                      <li key={l}>{l}</li>
                    ))}
                  </ul>
                </div>
              )}
              {nota.falta.length > 0 && (
                <div>
                  <p className="etiqueta mb-1 text-grafito">Falta</p>
                  <ul className="flex list-disc flex-col gap-1 pl-5 text-muted-foreground">
                    {nota.falta.map((l) => (
                      <li key={l}>{l}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <p className="mt-3 text-[15px] text-vencido">Terminó sin entregar la nota. Revisa el recorrido.</p>
          )}
          <ComoLoHizo corrida={c} entrega={entrega} titulo="Cómo llegó a la nota" />
        </>
      ) : (
        <>
          <p className="text-[15px]">
            El agente consulta lo que haya del cliente y escribe una nota corta con lo que no se ve a simple vista en la ficha: qué mirar antes de firmar y qué dato falta.
          </p>
          <p className="etiqueta mt-4 mb-2 text-grafito">Lo que puede consultar</p>
          <HerramientasDelAgente herramientas={herramientas} entrega={entrega} />
        </>
      )}
      {agente.error && <p className="mt-3 text-[15px] text-vencido">No se pudo: {agente.error}</p>}
    </Bloque>
  )
}

/** Seguir el pedido por correo (NOT-3): desde ahora le llega un correo al rol actual por cada cosa que le pase. */
function SeguirPedido({ pedido }: { pedido: Pedido }) {
  const { seguidores, seguir, rol } = usePrototipo()
  const lista = seguidores(pedido.id_pedido)
  const sigo = lista.includes(rol)
  return (
    <div className="text-right">
      <p className="etiqueta mb-1 text-muted-foreground">Correo</p>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          seguir(pedido.id_pedido, !sigo)
          toast.success(sigo ? `Dejaste de seguir ${pedido.id_pedido}` : `Sigues ${pedido.id_pedido}`, {
            description: sigo ? undefined : "Te llega un correo por cada cosa que le pase. Los ves en Registro de actividad › Correos.",
          })
        }}
      >
        {sigo ? <BellOffIcon /> : <BellIcon />}
        {sigo ? "Dejar de seguir" : "Seguir por correo"}
      </Button>
      <p className="mt-1 text-xs text-muted-foreground">{lista.length ? `Lo siguen: ${lista.join(", ")}` : "Nadie lo sigue"}</p>
    </div>
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
