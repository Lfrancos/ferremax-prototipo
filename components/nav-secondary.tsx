"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { toast } from "sonner"
import { MoonIcon, RotateCcwIcon, SunIcon } from "lucide-react"
import { SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"
import { usePrototipo } from "@/lib/store"

export function NavSecondary(props: React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  const { resolvedTheme, setTheme } = useTheme()
  const { reiniciar } = usePrototipo()
  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
              <SunIcon className="hidden dark:block" />
              <MoonIcon className="dark:hidden" />
              <span>Tema claro u oscuro</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => {
                reiniciar()
                toast("Demo reiniciada", { description: "Clientes, pedidos y reglas vuelven a lib/data.ts y a los documentos." })
              }}
            >
              <RotateCcwIcon />
              <span>Reiniciar demo</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
