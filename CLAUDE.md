# Ferremax · Pedido a crédito con topes

## Qué es y para quién

Prototipo interno de Ferremax (caso didáctico del curso 30X). Cuida el pedido a crédito desde que llega la solicitud hasta la entrega en obra, con reglas y topes de tiempo: 24 h para aprobar y 4 días de bodega. Lo usan crédito y cartera (Andrés Molina, Marcela Ríos, Sandra Beltrán), bodega (Nelson) y vendedores (Édinson Rojas). Los conductores no entran a la app: mandan la evidencia de entrega por WhatsApp o por correo.

El flujo son los 4 pasos del menú, y esa numeración se mantiene: 1 · Cargar pedidos (CSV de SAP), 2 · Aprobar, 3 · Bodega, 4 · Transporte. SAP es la fuente oficial; la app no aprueba en SAP. La IA (Claude) redacta y lee fotos, pero no decide.

## Cómo se corre

```bash
npm install
npm run dev
```

Abre http://localhost:3000.

Configuración en `.env.local`, que nunca se sube al repositorio. Aquí solo van los nombres, nunca los valores:

- `ANTHROPIC_API_KEY`: opcional. Sin ella, los agentes corren en modo ensayo.
- Desde la pieza 1 de `STACK_DECISIONS.md`: `NEXT_PUBLIC_SUPABASE_URL` y `SUPABASE_SECRET_KEY` (esta última solo la usa el servidor).
- Desde la pieza 2: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

## Documentos del proyecto: se leen antes de cambiar código

- `PROJECT_SCAN_30X.md`: qué hace la app, qué es real, qué es simulado y las señales.
- `STACK_DECISIONS.md`: qué herramientas se usan, en qué orden se conectan y cómo se prueba cada pieza.
- `DATA_MODEL_30X.md`: tablas y datos, cuando exista.
- Carpeta `30x/`: `Stack de referencia 30X.md` (qué herramientas se permiten) y `Expertos 30X.md` (qué revisa cada rol).
- `README.md`: pantallas, roles, reglas y lo que sigue «[por definir]».
- `AGENTS.md`: esta versión de Next.js cambia cosas conocidas. Antes de escribir código, lee la guía en `node_modules/next/dist/docs/`.

@AGENTS.md

## Stack decidido

- **Ya en uso:** Next.js 16 + TypeScript, Tailwind + shadcn/ui, GitHub y la Anthropic API desde el servidor (`claude-opus-5-5`).
- **AHORA, en este orden:** Supabase (PostgreSQL) para guardar los eventos del pedido, Supabase Auth para entrar con cuentas ficticias, y roles revisados en el servidor. Zod revisa lo que llega al servidor.
- **DESPUÉS:** reglas de acceso por fila (RLS) por rol, clientes y cartera en la base, Vercel para publicar, Supabase Storage para fotos, WhatsApp y correo, avisos programados, y Sentry si la empresa lo aprueba.
- **Sin cambio:** SAP por CSV a mano.
- **Fuera:** proveedores que no estén en `30x/Stack de referencia 30X.md`, salvo una excepción documentada en `STACK_DECISIONS.md`.

## Reglas de trabajo

- **Solo datos ficticios.** No se cargan datos reales de Ferremax ni se envían a Claude sin autorización escrita de la empresa.
- **Nunca secretos en el código ni en el chat.** Las claves van en `.env.local` o en las variables del proveedor. Las secretas, solo en el servidor. No se leen ni se muestran sus valores.
- **Un cambio a la vez, con su prueba.** Antes de cambiar: qué archivos se tocan y cómo se vuelve atrás. Después: correr la prueba y mostrar el resultado. Nada se da por probado sin haberlo corrido.
- **La seguridad vive en el servidor.** Ocultar un botón no es un permiso. Cada acción importante revisa en el servidor quién es la persona y qué puede hacer.
- **La IA interpreta, la regla decide.** Ningún agente aprueba, rechaza ni cambia reglas.
- **Rama y commit.** Se trabaja en una rama, nunca directo en `main`, y cada pieza terminada se guarda con un commit que diga qué se hizo.
