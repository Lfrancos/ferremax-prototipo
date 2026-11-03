# Decisiones de stack · Ferremax, pedido a crédito con topes

Fecha: 2 nov 2026 · Base: `PROJECT_SCAN_30X.md`, el código de la rama `s09`, `30x/Stack de referencia 30X.md` y `30x/Expertos 30X.md`.
Nivel actual: **prototipo** con datos ficticios. Este documento no autoriza datos reales ni uso diario.

## 1. Conclusión

El prototipo ya tiene casi todo lo que se ve (pantallas, reglas, carga de los archivos de SAP y agentes de Claude), pero no guarda nada y cualquiera puede hacerse pasar por Andrés. Por eso lo único que se conecta ahora es **Supabase**, en tres pasos pequeños: guardar las decisiones, entrar con una cuenta y que el servidor revise el rol antes de aprobar. WhatsApp, correo, SAP automático, avisos programados, fotos reales, publicación y medición esperan: dependen de decisiones de Ferremax o de que lo anterior funcione primero.

## 2. Mapa por función

| Función | Qué ya existe | Qué propongo | Por qué lo necesita el flujo | Cuándo |
| --- | --- | --- | --- | --- |
| **Interfaz** | Next.js 16 con TypeScript, Tailwind y shadcn/ui. Los 4 pasos del menú, tableros, ficha del pedido y registro de actividad. | Conservarla. Agregar solo una pantalla de entrada (login) y el mensaje «no tienes permiso» donde hoy simplemente se oculta un botón. | Quien aprueba tiene que saber quién es en la app y entender por qué no puede hacer algo. | **AHORA** (con las piezas 2 y 3) |
| **Lógica** | Reglas de crédito, bodega y avisos en `lib/rules.ts`, pero se aplican en el navegador. Tres agentes de Claude que corren en el servidor. | La acción «aprobar, rechazar o pedir información» pasa a ejecutarse en el servidor, revisando lo que llega (con **Zod**) y el estado del pedido antes de cambiarlo. Las reglas existentes se reutilizan; no se reescriben. | Aprobar un crédito tiene consecuencias. Una regla que solo vive en la pantalla se puede saltar. | **AHORA** (pieza 1) |
| **Datos** | Clientes, cartera y pedidos ficticios escritos en el código (`lib/data.ts`); todo cambio vive en la memoria del navegador y se pierde al recargar. | **Supabase (PostgreSQL)**. Primero solo los eventos del pedido (quién aprobó, rechazó o pidió información, y cuándo). Clientes, cartera y pedidos completos pasan a la base después, con el diseño de `DATA_MODEL_30X.md`. | Una aprobación que se pierde al recargar no sirve. El evento es a la vez la decisión y su registro, así nunca queda una aprobación sin rastro. | Eventos: **AHORA** (pieza 1). Resto: **DESPUÉS** |
| **Login y permisos** | Selector «Ver como… sin permisos reales». Los permisos PER-1 a PER-9 están escritos en `lib/rules.ts`, pero solo esconden botones. | **Supabase Auth** con cinco cuentas ficticias (una por persona). Una tabla de roles en la base y verificación del rol en el servidor en cada acción. Reglas de acceso por fila (RLS) por rol cuando clientes y cartera estén en la base. | Hay cinco personas con permisos distintos y una acción de alto impacto. Ocultar un botón no es negar una acción. | Login y roles en el servidor: **AHORA** (piezas 2 y 3). RLS por rol: **DESPUÉS**. Entrar con Microsoft o Google: **DESPUÉS**, lo decide TI |
| **Integraciones** | SAP por CSV a mano: se suben 3 archivos y se descarga el archivo de decisiones. WhatsApp y correo simulados: nada sale ni entra. | SAP sigue igual. WhatsApp y correo: la API o exportación que apruebe Ferremax; el stack no fija un proveedor. Los avisos cada 6 h necesitan una tarea programada: **Vercel Cron** solo corre una vez al día en el plan gratuito, así que haría falta un plan pago o **Railway**. Las fotos de entrega que lleguen de verdad irían a **Supabase Storage**, en un espacio privado. | Sin avisos que salgan, el tope de 24 h depende de que alguien mire la pantalla. Pero conectar WhatsApp o correo exige decidir proveedor, número y permisos que hoy no existen. | SAP por CSV: se queda. WhatsApp, correo, avisos programados y fotos reales: **DESPUÉS** |
| **Medición** | El indicador del negocio (horas para aprobar, días en bodega) ya se calcula en la app. No hay registro de errores ni de uso. | Errores: los registros de Vercel y Supabase cuando se publique; **Sentry** solo si Ferremax lo aprueba. Uso: **PostHog** no entra sin una pregunta concreta. | Hoy nadie más usa la app, así que no hay a quién medir ni errores que alguien tenga que atender. | Errores: **DESPUÉS**. Medir uso: **NO APLICA** por ahora |

Otras piezas del stack base:

- **GitHub:** ya existe (`Lfrancos/ferremax-prototipo`). Hay que confirmar en GitHub que el repositorio es privado.
- **Variables de entorno:** ya existen (`ANTHROPIC_API_KEY`, opcional, en `.env.local`, que no se sube). Las de Supabase se suman igual.
- **Vercel (publicar):** **DESPUÉS**, cuando alguien más tenga que abrir la app. El plan gratuito es para uso personal no comercial.
- **Contenido público:** **NO APLICA**. Es una herramienta interna.

## 3. Plan de acción

Las tres piezas usan una sola conexión nueva: **un proyecto de Supabase de desarrollo**. Cada pieza es un cambio con su prueba y su commit. Juntas cumplen el criterio de la primera conexión del stack: las tres primeras pruebas de Ferremax pasan.

### Pieza 1 · Las decisiones sobre un pedido se guardan

- **Qué conecta:** la app con una base de datos en Supabase. Solo una tabla nueva: los eventos de cada pedido (pedido, acción, quién, cuándo, motivo). Los clientes, la cartera y los pedidos siguen saliendo de los datos ficticios del código; al abrir la app se les suman los eventos guardados. La aprobación se hace en el servidor: revisa lo que llega, revisa que el pedido siga por aprobar y guarda el evento. El navegador no tiene acceso directo a la tabla.
- **Por qué va primero:** es la brecha más visible (todo se pierde al recargar), es la base que necesitan el login y los roles, y no cambia ninguna pantalla. Por ahora el «quién» sigue saliendo del selector «Ver como»; eso se corrige en la pieza 2.
- **Qué necesitas:**
  - Una cuenta en Supabase (plan gratuito) y un proyecto solo de desarrollo, por ejemplo `ferremax-dev`.
  - En `.env.local`: `NEXT_PUBLIC_SUPABASE_URL` y `SUPABASE_SECRET_KEY`. La segunda es secreta: solo la usa el servidor y nunca va al navegador, al repositorio ni al chat.
  - La forma de la tabla queda escrita en un archivo de migración dentro del repositorio, para poder repetirla.
- **Cómo compruebas que funciona (datos ficticios):**
  1. Como Andrés, apruebas PED-2026-03103 con un motivo. Recargas la página: sigue aprobado y el registro de actividad dice quién y cuándo.
  2. En el panel de Supabase ves esa fila en la tabla de eventos.
  3. Mandas la misma aprobación otra vez: se rechaza porque el pedido ya no está por aprobar, y no aparece una segunda fila.
  4. Sin las variables de entorno, la app arranca como hoy, en memoria.
- **Cómo la deshaces:** quitas las dos variables de `.env.local` y la app vuelve a funcionar en memoria. Si hace falta, reviertes el commit y borras la tabla o el proyecto de desarrollo. No hay datos reales que perder.

### Pieza 2 · Entrar con una cuenta

- **Qué conecta:** el login de Supabase (Supabase Auth) con cinco cuentas ficticias, una por persona: Andrés, Marcela, Sandra, Nelson y Édinson. La sesión reemplaza al selector «Ver como». La aprobación y las rutas de los agentes de Claude dejan de responder a quien no tiene sesión.
- **Por qué va en este lugar:** con la pieza 1 ya hay algo que proteger. Sin login, el servidor no puede saber quién aprueba y cualquiera que conozca la dirección puede llamar a los agentes y gastar la clave de Claude.
- **Qué necesitas:**
  - El mismo proyecto de Supabase.
  - Una variable nueva en `.env.local`: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Es pública por diseño; aun así no se pega en el chat.
  - Las cinco cuentas se crean a mano en el panel de Supabase, con correos ficticios (por ejemplo `andres@ferremax.test`). Las contraseñas las eliges tú y no van al código ni al chat. No se usan invitaciones por correo: el correo de prueba de Supabase tiene límites.
- **Cómo compruebas que funciona (datos ficticios):**
  1. Sin sesión, cualquier página te lleva a la entrada.
  2. Una llamada directa al servidor para aprobar, sin sesión, responde «no autorizado» y el pedido no cambia. Lo mismo con una ruta de agente.
  3. Entras como Andrés, apruebas un pedido y el registro dice «Andrés Molina», tomado de la sesión y no de lo que mande la pantalla.
- **Cómo la deshaces:** reviertes el commit y vuelve el selector. Las cuentas de prueba se pueden desactivar o borrar en el panel de Supabase sin tocar los eventos guardados.

### Pieza 3 · El servidor revisa el rol antes de aprobar

- **Qué conecta:** una tabla de roles en la base de datos que dice qué persona es cada cuenta, guardada con el número fijo de la cuenta y no con su correo. La acción de aprobar consulta esa tabla y aplica las reglas que ya existen (PER-4: quién firma qué pedido, PER-1: quién ve información de crédito), reutilizando `lib/rules.ts`.
- **Por qué va en este lugar:** primero hay que saber quién es la persona (pieza 2) para poder decidir qué puede hacer. Con esta pieza pasan las tres pruebas que pide el stack para la primera conexión.
- **Qué necesitas:** nada nuevo. Mismo proyecto y mismas variables. Los roles quedan en la misma migración del repositorio.
- **Cómo compruebas que funciona (datos ficticios):**
  1. Édinson (vendedor) entra e intenta aprobar PED-2026-03103: por pantalla no puede, y una llamada directa al servidor con su sesión responde «no tienes permiso». El pedido no cambia.
  2. Nelson intenta lo mismo: se rechaza.
  3. Andrés aprueba: funciona y queda registrado.
  4. Repites las pruebas de las piezas 1 y 2: siguen pasando.
- **Cómo la deshaces:** reviertes el commit. La tabla de roles puede quedarse sin hacer daño o borrarse.

## 4. Roles consultados

Consulté 11 de los 13 roles de Expertos 30X, solo los que activan las señales del levantamiento.

| Rol | Qué lo activó | Qué aportó a este documento |
| --- | --- | --- |
| Product Manager | Siempre, antes de la primera conexión. | El flujo mínimo es «aprobar y que quede». WhatsApp, correo y SAP automático se dejan fuera de esta etapa. |
| Product Designer | Las pantallas las usarán otras personas: crédito, cartera, bodega y vendedores. | Hacen falta la pantalla de entrada y el mensaje «sin permiso»; hoy los botones simplemente desaparecen. |
| Tech Lead | Ya hay código. | Se reutilizan las reglas de `lib/rules.ts`. Los datos ficticios siguen en `lib/data.ts`. Cada pieza es pequeña y se apaga quitando sus variables o revirtiendo su commit. |
| Backend Engineer | Sistemas existentes (SAP, WhatsApp, correo), tareas automáticas (avisos cada 6 h) e impacto alto (aprobar crédito). | SAP se queda en CSV. La aprobación revisa el estado antes de cambiarlo para no duplicarse. El plan gratuito de Vercel no alcanza para avisos cada 6 h. |
| AI Engineer | IA en el flujo: tres agentes con `claude-opus-5-5`. | La IA ya solo redacta y lee: no aprueba (PER-9). Pendiente para después: que el agente de la ficha lea el pedido desde el servidor y no lo reciba armado desde el navegador. |
| Security Engineer | Roles, aprobaciones, impacto alto e IA en el flujo. Evidencia: `app/api/agentes/ficha/route.ts` acepta lo que mande el navegador, sin sesión ni revisión. | Piezas 2 y 3: sesión obligatoria y rol revisado en el servidor, con pruebas de usuario autorizado, no autorizado y sin sesión. La clave secreta de Supabase solo en el servidor. |
| QA Engineer | Impacto alto, y siempre antes de declarar algo conectado. | Cada pieza tiene pruebas con resultado esperado. Ninguna se da por pasada sin correrla. |
| DevOps Engineer | Desde la pieza 1 se guarda algo que hoy no se puede reconstruir: las decisiones. | Proyecto de Supabase solo de desarrollo. La forma de la tabla queda en una migración en el repositorio. Publicar y respaldar quedan para después. |
| Data Engineer | Datos que cambian, aprobaciones y SAP como fuente oficial. | Primero solo se guardan los eventos; SAP sigue siendo la fuente oficial de clientes, pedidos y cartera. El modelo completo se diseña en `DATA_MODEL_30X.md`. |
| Product Analyst | La señal «Responsable» es SÍ (Lorenzo) y el mapa pide la función de medición. | No se instala medición sin una pregunta. El indicador del negocio ya existe en la app. |
| Legal & Privacy | IA que procesa contenido de personas: el agente de fotos lee nombres y firmas de quien recibe (hoy son dibujos ficticios). | Nada que hacer con datos ficticios. Las preguntas quedan en la sección 5. |

No consulté:

- **Delivery Lead:** nadie va a usar la app con datos reales ni a diario todavía (Datos reales = NO, Continuidad = NO).
- **FinOps:** la IA corre cuando alguien aprieta un botón, no en cada clic, y ningún plan está cerca de su límite.

## 5. Para después

Notas para cuando Ferremax quiera usar datos reales o pasar a un piloto. No hay que responderlas ahora.

- **Datos autorizados.** Quién en Ferremax permite usar datos reales de crédito y cartera, y si pueden enviarse a la API de Anthropic, incluidas las fotos de entrega con nombre y firma de quien recibe. Hay que revisar los términos y la retención de datos del proveedor.
- **Cómo entran los empleados.** Cuentas propias de la app o cuenta corporativa (Microsoft o Google). Lo decide TI.
- **WhatsApp y correo.** Qué servicio y qué número se usan. Baileys, mencionado en el levantamiento, no está en el Stack de referencia 30X: usarlo sería una excepción que habría que documentar aquí, con motivo, responsable y costo. Lo mismo para el proveedor de correo (Microsoft 365 o Google).
- **Avisos cada 6 h.** Necesitan una tarea programada que el plan gratuito de Vercel no ofrece, porque corre una vez al día. Hay que elegir entre un plan pago de Vercel o Railway, con protección para no mandar el mismo aviso dos veces.
- **Quién paga y quién atiende.** Planes de Supabase y Vercel, tokens de Claude y el número de WhatsApp. El plan gratuito de Supabase pausa proyectos con poca actividad y no hace respaldos automáticos; el de Vercel no es para uso comercial.
- **Recuperación.** Cada cuánto se respalda, quién lo cuida y si alguna vez se probó restaurar. Las fotos necesitan su propia copia, aparte de la base de datos. Cuánto tiempo se guardan el registro de actividad y las fotos.
- **Entornos separados.** Antes de datos reales, un proyecto de Supabase para desarrollo y otro para producción, con claves distintas.
- **Qué pasa con un pedido rechazado** y **si un vendedor solo puede crear solicitudes de sus propios clientes**: siguen abiertas en el levantamiento y cambian las reglas que revisa el servidor.
- **SAP sigue siendo la fuente oficial.** Escribir en SAP de forma automática exige permiso de quien lo administra en Ferremax.
