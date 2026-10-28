"use client"

import { useRouter } from "next/navigation"
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar"
import { usePrototipo } from "@/lib/store"
import type { Persona } from "@/lib/tipos"

export const ROLES: { persona: Persona; cargo: string; inicio: string }[] = [
  { persona: "Andrés Molina", cargo: "Gerente general", inicio: "/revision" },
  { persona: "Marcela Ríos", cargo: "Jefa de operaciones", inicio: "/alertas" },
  { persona: "Sandra Beltrán", cargo: "Administración y cartera", inicio: "/clientes" },
  { persona: "Nelson", cargo: "Jefe de bodega", inicio: "/bodega" },
  { persona: "Édinson Rojas", cargo: "Vendedor", inicio: "/solicitudes" },
]

const iniciales = (p: string) =>
  p
    .split(" ")
    .map((x) => x[0])
    .join("")
    .slice(0, 2)

/** El rol de la demo. No es un login: solo cambia qué se ve y la pantalla de inicio. */
export function NavUser() {
  const { isMobile } = useSidebar()
  const router = useRouter()
  const { rol, setRol } = usePrototipo()
  const actual = ROLES.find((r) => r.persona === rol)!

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger render={<SidebarMenuButton size="lg" className="aria-expanded:bg-muted" />}>
            <Avatar className="size-8 rounded-none">
              <AvatarFallback className="rounded-none bg-amarillo text-sobre-amarillo">{iniciales(rol)}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{rol}</span>
              <span className="truncate text-xs text-foreground/70">{actual.cargo}</span>
            </div>
            <ChevronsUpDownIcon className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="min-w-64" side={isMobile ? "bottom" : "right"} align="end" sideOffset={4}>
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                Ver como · rol de la demo, sin permisos reales
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              {ROLES.map((r) => (
                <DropdownMenuItem
                  key={r.persona}
                  onClick={() => {
                    setRol(r.persona)
                    router.push(r.inicio)
                  }}
                >
                  <Avatar className="size-6 rounded-none">
                    <AvatarFallback className="rounded-none text-[10px]">{iniciales(r.persona)}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 leading-tight">
                    <span>{r.persona}</span>
                    <span className="text-xs text-muted-foreground">{r.cargo}</span>
                  </div>
                  {r.persona === rol && <CheckIcon />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
