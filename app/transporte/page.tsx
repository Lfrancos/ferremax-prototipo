"use client"

import Link from "next/link"
import { BotonAtender } from "@/components/ferremax/atender"
import { Estado } from "@/components/ferremax/estado"
import { ReglaBoton } from "@/components/ferremax/insignia"
import { MensajeTarjeta } from "@/components/ferremax/mensaje"
import { Bloque, Titulo } from "@/components/ferremax/piezas"
import { SimularMensaje } from "@/components/ferremax/simular-mensaje"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { HOY } from "@/lib/data"
import { hrefRemision } from "@/lib/documentos"
import { NUMERO_FERREMAX, enlaceDe, remisionDe } from "@/lib/evidencia"
import { fmtFechaHora } from "@/lib/fechas"
import { fmtHoras } from "@/lib/formato"
import {
  ALERTA_ENTREGA,
  ENTREGAR_A_TRANSPORTE,
  EVIDENCIA_ENTREGA,
  RELOJ_TRANSPORTE,
  SALIDA_COMPLETA,
} from "@/lib/rules"
import { usePrototipo } from "@/lib/store"
import { cn } from "@/lib/utils"
import { transporte } from "@/lib/vistas"

function Cifra({ rotulo, valor, pie, alerta = false }: { rotulo: string; valor: number; pie: string; alerta?: boolean }) {
  return (
    <div className={cn("border border-linea bg-card p-5", alerta && valor > 0 && "shadow-[inset_4px_0_0_var(--vencido)]")}>
      <p className="etiqueta text-grafito">{rotulo}</p>
      <p className="mt-1 text-5xl font-medium tracking-tight tabular-nums">{valor}</p>
      <p className="mt-1 text-sm text-grafito">{pie}</p>
    </div>
  )
}

export default function Transporte() {
  const { pedidos, mensajes, rol } = usePrototipo()
  const t = transporte(pedidos)
  const atiende = ENTREGAR_A_TRANSPORTE.fn(rol).atender
  const sinPedido = mensajes.filter((m) => m.id_pedido === null)
  const aviso = RELOJ_TRANSPORTE.valores!.aviso_h

  return (
    <>
      <Titulo
        indice="(008) Transporte"
        titulo="Qué va en camino y qué ya se entregó"
        bajada={`Desde que Nelson lo entrega a transporte hasta que llega la foto del documento firmado · Corte: ${fmtFechaHora(HOY)}`}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Cifra rotulo="En camino" valor={t.enCamino.length} pie={`${t.sinConfirmar.length} sin confirmar (más de ${aviso} h)`} />
        <Cifra
          rotulo="Entregas con alerta"
          valor={t.conAlerta.length}
          pie="Falta la foto, la firma o el nombre, o hay novedad"
          alerta
        />
        <Cifra rotulo="Salieron incompletos" valor={t.incompletos.length} pie="Algo cargado de menos que lo pedido" />
        <Cifra rotulo="Entregas confirmadas" valor={t.confirmadas.length} pie="Con producto, nombre y firma" />
      </div>

      <Bloque
        titulo={`${t.enCamino.length} ${t.enCamino.length === 1 ? "pedido en camino" : "pedidos en camino"}`}
        tipos={["regla"]}
        reglas={[RELOJ_TRANSPORTE.id, SALIDA_COMPLETA.id]}
        pie={
          <>
            {RELOJ_TRANSPORTE.texto} <span className="dato">({RELOJ_TRANSPORTE.id})</span>
          </>
        }
      >
        {t.enCamino.length ? (
          <div className="overflow-x-auto border border-linea">
            <Table className="text-[15px]">
              <TableHeader>
                <TableRow className="border-b-2 border-tinta hover:bg-transparent">
                  <TableHead className="etiqueta text-grafito">Pedido</TableHead>
                  <TableHead className="etiqueta text-grafito">Cliente</TableHead>
                  <TableHead className="etiqueta text-grafito">Conductor</TableHead>
                  <TableHead className="etiqueta text-grafito">Salió</TableHead>
                  <TableHead className="etiqueta text-right text-grafito">En camino</TableHead>
                  <TableHead className="etiqueta text-grafito">Carga</TableHead>
                  <TableHead className="etiqueta text-grafito">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {t.enCamino.map(({ pedido, entrega }) => (
                  <TableRow key={pedido.id_pedido} className="border-linea">
                    <TableCell className="py-3">
                      <Link href={`/pedidos/${pedido.id_pedido}`} className="dato hover:underline">
                        {pedido.id_pedido}
                      </Link>
                      <Link href={hrefRemision(pedido.id_pedido)} className="dato block text-sm text-grafito underline-offset-4 hover:underline">
                        {remisionDe(pedido.id_pedido)}
                      </Link>
                    </TableCell>
                    <TableCell>{pedido.cliente}</TableCell>
                    <TableCell>
                      {pedido.despacho?.nombre}
                      <p className="dato text-sm text-grafito">
                        {pedido.despacho?.placa} · {pedido.despacho?.celular}
                      </p>
                    </TableCell>
                    <TableCell className="text-grafito">{fmtFechaHora(entrega.salio)}</TableCell>
                    <TableCell className="dato text-right">{fmtHoras(entrega.horas)}</TableCell>
                    <TableCell>
                      {entrega.carga.completo ? (
                        <span className="text-aprobado">✓ Completa</span>
                      ) : (
                        <Estado clase="aviso" palabra={`Incompleta · ${entrega.carga.faltantes.length} ${entrega.carga.faltantes.length === 1 ? "línea" : "líneas"}`} />
                      )}
                    </TableCell>
                    <TableCell>
                      <Estado clase={entrega.estado.clase} palabra={entrega.estado.palabra} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-[15px] text-grafito">Nada en camino. Cuando Nelson entregue un pedido a transporte, aparece aquí.</p>
        )}
      </Bloque>

      <Bloque
        titulo={`${t.conAlerta.length} ${t.conAlerta.length === 1 ? "entrega con alerta" : "entregas con alerta"}`}
        tipos={["regla", "propuesta"]}
        reglas={[EVIDENCIA_ENTREGA.id, ALERTA_ENTREGA.id]}
        pie={
          <>
            {ALERTA_ENTREGA.texto} <span className="dato">({ALERTA_ENTREGA.id})</span>
          </>
        }
      >
        {t.conAlerta.length ? (
          <ul className="divide-y divide-linea border-y border-linea">
            {t.conAlerta.map(({ pedido, entrega }) => (
              <li key={pedido.id_pedido} className={cn("flex flex-wrap items-start justify-between gap-4 py-4", atiende && "bg-amarillo-suave px-3")}>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2">
                    <Link href={`/pedidos/${pedido.id_pedido}`} className="dato hover:underline">
                      {pedido.id_pedido}
                    </Link>
                    <span className="font-medium">{pedido.cliente}</span>
                    <Estado clase={entrega.estado.clase} palabra={entrega.estado.palabra} />
                  </p>
                  <ul className="mt-2 list-disc pl-5 text-[15px]">
                    {entrega.faltas.map((f) => (
                      <li key={f.texto}>{f.texto}</li>
                    ))}
                    {entrega.novedad && <li>Quien recibió escribió: &quot;{entrega.novedad}&quot;</li>}
                  </ul>
                  <p className="mt-1 text-sm text-grafito">
                    Llegó {fmtFechaHora(entrega.llego!)} · {pedido.despacho?.nombre}
                  </p>
                </div>
                <BotonAtender pedido={pedido} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[15px] text-grafito">Ninguna entrega con alerta.</p>
        )}
      </Bloque>

      <Bloque
        titulo="Cómo llega la evidencia"
        tipos={["propuesta"]}
        pie={`Por decidir con los mentores. En las dos, el resultado es el mismo mensaje con dos fotos; solo cambia cómo sabemos de qué pedido es. Cuánto cuesta cada una y quién paga el número de WhatsApp: [por definir].`}
      >
        <Tabs defaultValue="chat" className="w-full">
          <TabsList>
            <TabsTrigger value="chat">Opción A · Chat de WhatsApp</TabsTrigger>
            <TabsTrigger value="enlace">Opción B · Enlace por entrega</TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="mt-4 flex flex-col gap-4">
            <div className="grid gap-4 lg:grid-cols-[2fr_3fr]">
              <div className="flex flex-col gap-3 border-2 border-dashed border-linea bg-card p-5">
                <p className="text-[22px] leading-tight font-medium tracking-tight">Los conductores escriben a un número de Ferremax</p>
                <p className="text-[15px]">
                  Al número <span className="dato">{NUMERO_FERREMAX}</span> el conductor manda lo que mandaría a cualquier persona: un texto y dos fotos. La
                  herramienta lee el chat directamente.
                </p>
                <dl className="grid gap-2 border-t border-linea pt-3 text-sm">
                  <div className="grid grid-cols-[7rem_1fr] gap-3">
                    <dt className="etiqueta text-grafito">Cómo sabe el pedido</dt>
                    <dd>Por el número de remisión que se lea en el texto o en la foto del documento. Si no, por el celular del conductor, si ese día lleva un solo pedido.</dd>
                  </div>
                  <div className="grid grid-cols-[7rem_1fr] gap-3">
                    <dt className="etiqueta text-grafito">Qué cambia</dt>
                    <dd>Nada para el conductor: ya usa WhatsApp. Ferremax necesita un número de WhatsApp Business.</dd>
                  </div>
                  <div className="grid grid-cols-[7rem_1fr] gap-3">
                    <dt className="etiqueta text-grafito">Para discutir</dt>
                    <dd>Si el conductor lleva varios pedidos y manda una foto borrosa, el mensaje queda sin pedido y alguien lo asocia a mano.</dd>
                  </div>
                </dl>
                <div className="mt-auto pt-2">
                  <SimularMensaje canal="Chat de WhatsApp" variante="default" />
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <p className="etiqueta flex items-center gap-2">
                  Bandeja del número · {mensajes.length} {mensajes.length === 1 ? "mensaje" : "mensajes"}
                  {sinPedido.length > 0 && <Estado clase="aviso" palabra={`${sinPedido.length} sin pedido`} />}
                </p>
                {[...mensajes]
                  .reverse()
                  .filter((m) => m.canal === "Chat de WhatsApp")
                  .slice(0, 3)
                  .map((m) => (
                    <MensajeTarjeta key={m.id} mensaje={m} compacto />
                  ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="enlace" className="mt-4 flex flex-col gap-4">
            <div className="grid gap-4 lg:grid-cols-[2fr_3fr]">
              <div className="flex flex-col gap-3 border-2 border-dashed border-linea bg-card p-5">
                <p className="text-[22px] leading-tight font-medium tracking-tight">Cada entrega tiene su enlace</p>
                <p className="text-[15px]">
                  Al entregar a transporte, el conductor recibe por WhatsApp un enlace único. Al llegar lo abre, toma las dos fotos y envía. No
                  hay que instalar nada.
                </p>
                <dl className="grid gap-2 border-t border-linea pt-3 text-sm">
                  <div className="grid grid-cols-[7rem_1fr] gap-3">
                    <dt className="etiqueta text-grafito">Cómo sabe el pedido</dt>
                    <dd>No adivina: el enlace ya es de ese pedido. La pantalla pide justo lo que exige TRA-3 y no deja enviar a medias.</dd>
                  </div>
                  <div className="grid grid-cols-[7rem_1fr] gap-3">
                    <dt className="etiqueta text-grafito">Qué cambia</dt>
                    <dd>Hay una página pequeña que mantener y el conductor sigue un paso más que en el chat.</dd>
                  </div>
                  <div className="grid grid-cols-[7rem_1fr] gap-3">
                    <dt className="etiqueta text-grafito">Para discutir</dt>
                    <dd>Qué pasa si el conductor no abre el enlace y escribe por el chat de todas formas.</dd>
                  </div>
                </dl>
              </div>

              <div className="flex flex-col gap-3">
                <p className="etiqueta">Enlaces de lo que va en camino</p>
                {t.enCamino.length ? (
                  <ul className="divide-y divide-linea border-y border-linea text-[15px]">
                    {t.enCamino.map(({ pedido }) => (
                      <li key={pedido.id_pedido} className="flex flex-wrap items-center justify-between gap-3 py-3">
                        <span>
                          <span className="dato">{pedido.id_pedido}</span> · {pedido.despacho?.nombre}
                          <p className="dato text-sm text-grafito">
                            {enlaceDe(pedido.id_pedido)} · {remisionDe(pedido.id_pedido)}
                          </p>
                        </span>
                        <SimularMensaje canal="Enlace" pedido={pedido} etiqueta="Abrir como conductor" />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[15px] text-grafito">No hay enlaces abiertos: nada va en camino.</p>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </Bloque>

      {sinPedido.length > 0 && (
        <Bloque titulo="Mensajes sin pedido" tipos={["humano"]} reglas={[]} pie="Los asocia Nelson o Marcela (PER-8). Al asociarlos, el pedido se da por entregado y se revisa la evidencia.">
          <div className="flex flex-col gap-4">
            {sinPedido.map((m) => (
              <MensajeTarjeta key={m.id} mensaje={m} />
            ))}
          </div>
        </Bloque>
      )}

      <Bloque titulo={`${t.confirmadas.length} entregas confirmadas`} tipos={["regla"]} reglas={[EVIDENCIA_ENTREGA.id]}>
        {t.confirmadas.length ? (
          <ul className="divide-y divide-linea border-y border-linea text-[15px]">
            {t.confirmadas.map(({ pedido, entrega }) => (
              <li key={pedido.id_pedido} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                <Link href={`/pedidos/${pedido.id_pedido}`} className="dato hover:underline">
                  {pedido.id_pedido}
                </Link>
                <span className="flex-1">{pedido.cliente}</span>
                <span className="text-grafito">
                  {pedido.despacho?.nombre} · {fmtFechaHora(entrega.llego!)}
                </span>
                {!entrega.carga.completo && <Estado clase="aviso" palabra="Salió incompleto" />}
                <Estado clase="aprobado" palabra="Entrega confirmada" />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[15px] text-grafito">Ninguna todavía.</p>
        )}
        <p className="mt-3 text-sm text-grafito">
          <ReglaBoton id={ENTREGAR_A_TRANSPORTE.id} soloId className="mr-1" />
          {ENTREGAR_A_TRANSPORTE.texto}
        </p>
      </Bloque>
    </>
  )
}
