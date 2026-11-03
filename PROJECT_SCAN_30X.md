# Levantamiento 30X · Ferremax, pedido a crédito con topes

Leído: código, `README.md`, `AGENTS.md`, `30x/Stack de referencia 30X.md`, `30x/Expertos 30X.md`. No existe ningún archivo `.env*`; el código solo nombra la variable `ANTHROPIC_API_KEY` [VISTO EN CÓDIGO: lib/agentes/responder.ts].

## 1. Qué hace

Ferremax pierde control del pedido a crédito entre la solicitud y la entrega en obra; la app lo cuida con reglas y topes de tiempo (24 h para aprobar, 4 días de bodega) [VISTO EN DOCUMENTO: README.md]. La usan crédito y cartera (Andrés, Marcela, Sandra), bodega (Nelson) y vendedores (Édinson) [VISTO EN DOCUMENTO: README.md]. Hoy se demuestran los 4 pasos del menú, que son la numeración que se queda [ME LO DIJISTE]: 1 · Cargar pedidos (CSV de SAP), 2 · Aprobar (en pantalla o respondiendo un WhatsApp simulado, y descargar el archivo para SAP), 3 · Bodega (alistar y entregar a transporte), 4 · Transporte (fotos de la entrega que lee Claude), todo con registro de actividad [VISTO EN CÓDIGO: app/].

## 2. Qué existe de verdad y qué es simulado

- **De verdad:** pantallas y reglas (`lib/rules.ts`); lectura y revisión de los CSV (`lib/carga/`); descarga del CSV para SAP (`lib/exportar-sap.ts`); tres agentes de Claude en el servidor (`app/api/agentes/*`, `lib/agentes/bucle.ts`) [VISTO EN CÓDIGO].
- **Simulado:** guardar (todo en memoria, se pierde al recargar: `lib/store.tsx`); roles ("Ver como… sin permisos reales": `components/nav-user.tsx`); WhatsApp y correo, nada sale (`lib/notificaciones.ts`, `lib/correos.ts`); la hora, fija en 30 nov 2026 9:00 (`lib/data.ts`); fotos de entrega, son dibujos (`components/ferremax/foto.tsx`); agentes en modo ensayo si no hay clave (`lib/agentes/responder.ts`) [VISTO EN CÓDIGO].

## 3. De dónde sale cada dato

| Dato | ¿Ficticio? | ¿Se guarda? | Fuente oficial |
| --- | --- | --- | --- |
| Clientes (19) | Sí, caso didáctico [VISTO EN DOCUMENTO: Stack de referencia 30X.md] | No, memoria | Maestro de clientes de SAP [VISTO EN DOCUMENTO: README.md] |
| Pedidos (18) y sus líneas | Sí, inventados [VISTO EN DOCUMENTO: README.md] | No | Pedidos de SAP; el detalle por línea no tiene fuente definida [VISTO EN DOCUMENTO: README.md] |
| Cartera (saldo, atraso) | Sí, armada para cuadrar [VISTO EN CÓDIGO: lib/data.ts] | No | Partidas abiertas de SAP, que importa Sandra [VISTO EN DOCUMENTO: README.md] |
| Reglas y sus números | No, salen de documentos de la empresa | No; editar solo vive en el navegador | Política de crédito (Andrés), Regla de bodega (Nelson), Ops Charter [VISTO EN DOCUMENTO: README.md] |
| Decisiones y registro de actividad | Se generan en la demo | No | La app; la aprobación final queda en SAP [VISTO EN DOCUMENTO: README.md] |
| Conductores, fotos, número de WhatsApp | Sí, inventados [VISTO EN DOCUMENTO: README.md] | No | Transportadora [por definir] [VISTO EN DOCUMENTO: README.md] |
| Facturas (historia) | Sí, inventada para 4 [VISTO EN DOCUMENTO: README.md] | No | SAP y DIAN [VISTO EN DOCUMENTO: README.md] |

## 4. Señales

| Señal | Respuesta | Evidencia |
| --- | --- | --- |
| Roles | SÍ | Cinco personas con permisos distintos (PER-1 a PER-9), cambiados en el navegador sin login [VISTO EN CÓDIGO: components/nav-user.tsx] |
| Acceso | SÍ · empleados de una empresa | Crédito, cartera, bodega y vendedores de Ferremax [VISTO EN DOCUMENTO: README.md]; los conductores no entran a la app, mandan la evidencia por WhatsApp o correo [ME LO DIJISTE] |
| Datos que cambian | SÍ | Pedidos con eventos, cargas, lotes, cambios de reglas; hoy en memoria [VISTO EN CÓDIGO: lib/store.tsx] |
| Archivos | SÍ | Sube 3 CSV, descarga CSV para SAP y de lo apartado; fotos de entrega (dibujos convertidos a PNG) [VISTO EN CÓDIGO: lib/carga/, lib/agentes/imagen.ts]; las fotos llegarán por WhatsApp y por correo [ME LO DIJISTE] |
| Sistemas existentes | SÍ | SAP por CSV a mano; WhatsApp y correo simulados [VISTO EN CÓDIGO: lib/exportar-sap.ts, lib/notificaciones.ts]. El correo también será entrada de evidencia, algo que el código aún no tiene [ME LO DIJISTE] |
| Tareas automáticas | SÍ, simuladas | Avisos apenas entra la solicitud y luego cada 6 h [ME LO DIJISTE]; hoy se recalculan al pintar, sin proceso programado [VISTO EN DOCUMENTO: README.md] |
| IA en el flujo | SÍ | Tres agentes (nota de decisión, lectura de fotos, reporte del lunes) con `claude-opus-5-5` desde el servidor; no deciden [VISTO EN CÓDIGO: lib/agentes/] |
| Aprobaciones | SÍ | Aprobar, rechazar o pedir información, con motivo obligatorio y registro de quién y cuándo [VISTO EN CÓDIGO: lib/store.tsx, lib/actividad.ts] |
| Contenido público | NO | Herramienta interna; ninguna página para buscadores [VISTO EN CÓDIGO: app/] |
| Datos reales | NO | Datos ficticios de un caso didáctico [VISTO EN DOCUMENTO: Stack de referencia 30X.md] |
| Continuidad | NO | Al recargar todo vuelve a empezar [VISTO EN DOCUMENTO: README.md]; nadie depende de ella hoy [SUPUESTO] |
| Impacto | SÍ | Aprueba o rechaza pedidos a crédito que siguen a bodega y a SAP; hoy solo cambia estado local [VISTO EN DOCUMENTO: README.md] |
| Requisitos de la empresa | NO | Sin requisitos de TI mientras sea prototipo [SUPUESTO] |
| Responsable | SÍ | La persona que construye, Lorenzo Franco, con planes gratuitos [SUPUESTO] |

## 5. Tres brechas

1. **No guarda nada.** Una aprobación se pierde al recargar; no hay base de datos [VISTO EN CÓDIGO: lib/store.tsx].
2. **Roles sin login ni permisos en el servidor.** Cualquiera elige ser Andrés; las rutas de los agentes aceptan del navegador los datos del pedido sin sesión ni validación [VISTO EN CÓDIGO: app/api/agentes/ficha/route.ts].
3. **SAP, WhatsApp y correo no se conectan.** La vuelta a SAP es un CSV a mano y los avisos no salen; sin eso el tope de 24 h depende de que alguien mire la pantalla [VISTO EN DOCUMENTO: README.md].

**Lo siguiente:** entrar con una cuenta según el rol y aprobar un pedido (por ejemplo PED-2026-03103) que siga aprobado al recargar [ME LO DIJISTE]. Cierra las brechas 1 y 2.

**Decidido:** la numeración es la de los 4 pasos del menú; la evidencia de entrega llega por WhatsApp y por correo (no por enlace); los avisos salen apenas entra la solicitud y luego cada 6 h [ME LO DIJISTE]. Con eso, el aviso de las 12 h de CRED-3.1 pasa a ser el segundo recordatorio [VISTO EN DOCUMENTO: README.md].

## 6. Preguntas para mí

Pendientes, sin respuesta todavía:

1. ¿Qué debe pasar con un pedido rechazado en la app: se cierra, se puede corregir y reenviar, o se cancela en SAP? Hoy el archivo dice "Rechazado" y nada más [VISTO EN DOCUMENTO: README.md].
2. ¿Un vendedor solo puede crear solicitudes de sus propios clientes? Hoy puede crearlas para cualquiera [VISTO EN DOCUMENTO: README.md].

## 7. Para después

- **Autorización de datos:** quién en Ferremax permite usar datos de crédito reales y enviarlos, con las fotos que traen nombre y firma, a la API de Anthropic.
- **Quién mantiene y paga:** tokens de Claude, número de WhatsApp, proveedor de correo y planes de publicación y base de datos.
- **Requisitos de TI:** cómo entran los empleados (cuenta corporativa o no), Baileys o API oficial de WhatsApp, Microsoft 365 o Google para el correo.
- **Qué pasa si falla:** SAP sigue siendo la fuente oficial; falta definir respaldos, retención del registro y fotos, y quién atiende una caída.
