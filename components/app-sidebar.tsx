"use client"

import * as React from "react"
import Link from "next/link"
import {
  BellRingIcon,
  BookOpenIcon,
  CalendarCheckIcon,
  InboxIcon,
  LayoutDashboardIcon,
  ListOrderedIcon,
  RouteIcon,
  TruckIcon,
  UsersIcon,
  WalletIcon,
} from "lucide-react"

import { BotonNuevoCliente, NavGrupo, type ItemNav } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader } from "@/components/ui/sidebar"
import { REGLAS } from "@/lib/rules"

// El menú, por secciones. Cada sección es una pregunta distinta:
// qué es esto, quiénes son los clientes, dónde va cada pedido, qué pide atención y qué reglas rigen.

const COMO_FUNCIONA: ItemNav[] = [{ titulo: "Cómo funciona", url: "/como-funciona", icono: <RouteIcon /> }]

const CLIENTES: ItemNav[] = [
  { titulo: "Clientes", url: "/clientes", icono: <UsersIcon /> },
  { titulo: "Cartera", url: "/cartera", icono: <WalletIcon /> },
]

const PEDIDOS: ItemNav[] = [
  { titulo: "Solicitudes", url: "/solicitudes", icono: <InboxIcon /> },
  { titulo: "Tablero de pedidos", url: "/", icono: <LayoutDashboardIcon /> },
  { titulo: "Bodega", url: "/bodega", icono: <ListOrderedIcon /> },
  { titulo: "Transporte", url: "/transporte", icono: <TruckIcon /> },
]

const SEGUIMIENTO: ItemNav[] = [
  { titulo: "Alertas", url: "/alertas", icono: <BellRingIcon /> },
  { titulo: "Revisión del lunes", url: "/revision", icono: <CalendarCheckIcon /> },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const reglas: ItemNav[] = [{ titulo: "Reglas", url: "/reglas", icono: <BookOpenIcon />, contador: REGLAS.length }]
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <Link
          href="/como-funciona"
          aria-label="Ferremax · inicio de la presentación"
          className="flex items-center bg-amarillo px-3 py-3"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo/ferremax-wordmark.svg" alt="Ferremax" width={139} height={16} className="h-4 w-[139px]" />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <NavGrupo items={COMO_FUNCIONA} />
        <NavGrupo titulo="Clientes" items={CLIENTES} arriba={<BotonNuevoCliente />} />
        <NavGrupo titulo="Pedidos" items={PEDIDOS} />
        <NavGrupo titulo="Seguimiento" items={SEGUIMIENTO} />
        <NavGrupo titulo="Reglas" items={reglas} />
        <NavSecondary className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
