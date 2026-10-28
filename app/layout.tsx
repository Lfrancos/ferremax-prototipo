import type { CSSProperties } from "react"
import type { Metadata } from "next"
import { Geist_Mono, Schibsted_Grotesk } from "next/font/google"
import { AppSidebar } from "@/components/app-sidebar"
import { DialogoRegla } from "@/components/ferremax/dialogo-regla"
import { Leyenda } from "@/components/ferremax/insignia"
import { SiteHeader } from "@/components/site-header"
import { ThemeProvider } from "@/components/theme-provider"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ProveedorPrototipo } from "@/lib/store"
import "./globals.css"

// Tipografía del Sistema de diseño: Schibsted Grotesk y Geist Mono para cifras e IDs.
const schibsted = Schibsted_Grotesk({ variable: "--font-schibsted", subsets: ["latin"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Ferremax · Pedido a crédito (prototipo)",
  description: "Prototipo no funcional del flujo de aprobaciones con topes. Datos ficticios.",
}

// Base: bloque dashboard-01 de shadcn/ui (sidebar, tarjetas, gráfico y tabla).
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-CO" suppressHydrationWarning className={`${schibsted.variable} ${geistMono.variable} antialiased`}>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange storageKey="tema">
          <TooltipProvider>
            <ProveedorPrototipo>
              <SidebarProvider
                style={
                  {
                    "--sidebar-width": "calc(var(--spacing) * 68)",
                    "--header-height": "calc(var(--spacing) * 12)",
                  } as CSSProperties
                }
              >
                <AppSidebar variant="inset" />
                <SidebarInset>
                  <SiteHeader />
                  <div className="@container/main flex flex-1 flex-col">
                    <main className="flex flex-1 flex-col gap-6 px-4 py-6 lg:px-6">{children}</main>
                    <Leyenda />
                  </div>
                </SidebarInset>
              </SidebarProvider>
              <DialogoRegla />
              <Toaster position="top-right" />
            </ProveedorPrototipo>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
