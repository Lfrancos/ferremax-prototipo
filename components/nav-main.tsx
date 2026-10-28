"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { CirclePlusIcon } from "lucide-react"
import { NuevoCliente } from "@/components/ferremax/nuevo-cliente"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { CREAR_CLIENTES } from "@/lib/rules"
import { usePrototipo } from "@/lib/store"

/** La sección donde estás: fondo negro y texto amarillo, en claro y en oscuro (en oscuro, con un borde amarillo para que se vea). */
const SECCION_ACTIVA =
  "data-active:bg-black data-active:font-semibold data-active:text-amarillo data-active:hover:bg-black data-active:hover:text-amarillo dark:data-active:ring-1 dark:data-active:ring-amarillo/60"

export interface ItemNav {
  titulo: string
  url: string
  icono?: React.ReactNode
  /** Número a la derecha, por ejemplo cuántas reglas hay. */
  contador?: number
}

/** El tablero también es la ficha del pedido, así que sigue activo dentro de /pedidos. */
function estaActivo(ruta: string, url: string) {
  return url === "/" ? ruta === "/" || ruta.startsWith("/pedidos") : ruta.startsWith(url)
}

/** Un grupo del menú, con su título (o sin él) y sus pantallas. `arriba` va antes de las pantallas. */
export function NavGrupo({ titulo, items, arriba }: { titulo?: string; items: ItemNav[]; arriba?: React.ReactNode }) {
  const ruta = usePathname()
  return (
    <SidebarGroup>
      {titulo && <SidebarGroupLabel className="etiqueta">{titulo}</SidebarGroupLabel>}
      <SidebarGroupContent className="flex flex-col gap-2">
        {arriba}
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.url}>
              <SidebarMenuButton
                tooltip={item.titulo}
                isActive={estaActivo(ruta, item.url)}
                className={SECCION_ACTIVA}
                render={<Link href={item.url} />}
              >
                {item.icono}
                <span>{item.titulo}</span>
              </SidebarMenuButton>
              {item.contador !== undefined && (
                <SidebarMenuBadge className="peer-data-active/menu-button:text-amarillo">{item.contador}</SidebarMenuBadge>
              )}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

/** "Nuevo cliente": solo lo ve activo quien puede crear clientes (PER-2). */
export function BotonNuevoCliente() {
  const { rol } = usePrototipo()
  const puedeCrear = CREAR_CLIENTES.fn(rol)
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        {puedeCrear ? (
          <NuevoCliente
            trigger={
              <SidebarMenuButton
                tooltip="Nuevo cliente"
                className="min-w-8 bg-primary text-primary-foreground duration-200 ease-linear hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground"
              />
            }
          >
            <CirclePlusIcon />
            <span>Nuevo cliente</span>
          </NuevoCliente>
        ) : (
          <SidebarMenuButton
            disabled
            title={`${CREAR_CLIENTES.id}: ${CREAR_CLIENTES.texto}`}
            className="min-w-8 border border-dashed border-linea text-grafito"
          >
            <CirclePlusIcon />
            <span>Nuevo cliente · solo Sandra</span>
          </SidebarMenuButton>
        )}
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
