# Stack de referencia 30X

Última revisión: 2 nov 2026 · Lorenzo Franco

## Para qué es

Es la referencia única de herramientas del curso: qué pieza usar para cada función, cuándo entra y qué controles exige según el riesgo. No es una lista para instalar todo; es una regla para decidir.

Lo leen tres lectores. Claude Code, cuando corre los prompts de levantamiento y de arquitecto: el primero responde las señales de este documento y el segundo elige las herramientas con él. El participante, cuando quiere entender por qué le recomendaron una pieza. Los mentores, para revisar que una recomendación siga la regla.

La regla central: mismas señales y mismo riesgo, misma recomendación. La IA interpreta el prototipo; las decisiones y las excepciones se justifican con lo que dice aquí. Una recomendación de stack no es una certificación de seguridad ni una autorización de la empresa.

## Cómo se decide

1. El levantamiento lee el prototipo y sus documentos y responde cada señal por su nombre con SÍ, NO o NO SÉ, con su evidencia.
2. El arquitecto toma esas señales, elige solo las piezas que justifican, consulta los roles de Expertos 30X que esas señales activan y propone una sola primera conexión.
3. Lo que no se sabe se marca «consultar antes» con quién lo decide. No se supone.
4. Antes de usar datos reales o pasar a uso diario se cumplen los controles del nivel que corresponda (sección «Tres niveles de madurez»).

### Señales funcionales

Cada señal se nombra por su nombre, sin código.

| Señal | Pregunta |
| --- | --- |
| Roles | ¿Personas distintas necesitan ver o hacer cosas distintas? |
| Acceso | ¿Quién entra? Empleados de una empresa, varias empresas clientes, personas sueltas o un solo usuario. |
| Datos que cambian | ¿Hay que guardar información que cambia: estados, registros o historial? |
| Archivos | ¿La app recibe, guarda o entrega archivos como PDF, fotos o adjuntos? |
| Sistemas existentes | ¿Lee o escribe en un sistema que ya existe: ERP, Excel, correo, WhatsApp? |
| Tareas automáticas | ¿Algo debe ejecutarse sin que nadie haga clic? |
| IA en el flujo | ¿Usa IA dentro del flujo para interpretar, resumir, clasificar o redactar? |
| Aprobaciones | ¿Hay aprobaciones, acciones importantes o necesidad de saber quién hizo qué? |
| Contenido público | ¿Hay contenido público que debe aparecer en buscadores? |

Roles dice si hacen falta permisos distintos; no dice por sí sola si hace falta login. Una app de un solo usuario con datos privados reales también necesita acceso protegido.

### Señales de riesgo y operación

Mientras sea un prototipo, si el proyecto no dice nada, se asume: datos ficticios, planes gratuitos, sin requisitos de TI y la persona que construye como responsable. Eso no bloquea nada; se decide con la empresa antes de usar datos reales.

| Señal | Pregunta | Qué cambia |
| --- | --- | --- |
| Datos reales | ¿Datos ficticios, internos reales, personales, financieros o confidenciales? ¿Quién autorizó usarlos? | Si se puede usar información real y qué privacidad se exige. |
| Continuidad | ¿Qué pasa si la app no funciona o se pierde información? | Recuperación, respaldos y soporte. |
| Impacto | ¿Aprueba, rechaza, mueve plata o hace algo difícil de revertir? | Reglas fijas, permisos, registro de quién hizo qué y pruebas de los casos críticos. |
| Requisitos de la empresa | ¿TI exige identidad corporativa, ciertos proveedores, ubicación de datos o conexión interna? | Puede cambiar el proveedor o frenar la puesta en uso. |
| Responsable | ¿Quién la mantiene, atiende fallas y paga los servicios? | Sin responsable y presupuesto no hay uso diario. |

**Semáforo de datos.**

- **Ficticios:** se prototipa sin pedir permiso. No se reutilizan después sin revisar.
- **Internos reales:** consultar antes con el responsable de la empresa, aunque no parezcan sensibles.
- **Personales, financieros o confidenciales:** consultar antes con TI, seguridad o privacidad. No se cargan a la app ni se envían a una API de IA sin autorización.

## Seis principios

1. **Primero el flujo, después la herramienta.** Cada servicio responde a una necesidad del flujo y tiene un responsable.
2. **Pocos proveedores.** Dos herramientas que hacen lo mismo necesitan una razón.
3. **Servicios administrados, con sus límites claros.** No se construyen contraseñas ni respaldos propios; se revisa qué incluye cada plan y quién lo cuida.
4. **Las reglas importantes son fijas.** La IA interpreta o sugiere; no decide plata, crédito ni permisos.
5. **La seguridad vive en el servidor y en los datos.** Ocultar un botón no es negar una acción.
6. **Probar antes de confiar.** Una pantalla que parece funcionar no demuestra que permisos, datos y operaciones estén bien.

## Tres niveles de madurez

Son una sola arquitectura que gana controles, no tres stacks distintos. Una app sensible puede exigir controles de operación empresarial desde su primer uso con datos reales.

| Nivel | Uso permitido | Mínimo para avanzar |
| --- | --- | --- |
| **Prototipo** | Demostrar el flujo con datos ficticios. | Flujo principal reproducible, datos de prueba, ningún secreto en el repositorio. |
| **Producto controlado** | Lo usan personas autorizadas, con alcance y riesgo limitados; datos reales solo si están aprobados. | Login cuando aplique, permisos y validación probados, registro de acciones críticas, monitoreo, recuperación definida y responsable. |
| **Operación empresarial** | Parte del trabajo diario, con continuidad esperada. | Aprobación de la empresa, entornos separados, respaldos y restauración probados, despliegues controlados, soporte, costos y revisión periódica. |

Satélite, núcleo operativo y plataforma integrada son el alcance (qué tanto abarca la solución); prototipo, producto controlado y operación empresarial son la madurez (qué tan lista está). No se mezclan.

El curso acompaña hasta el producto controlado. No promete que una app queda lista para operación empresarial.

## Stack base

| Función | Herramienta | Por qué | Cuándo |
| --- | --- | --- | --- |
| Interfaz y lógica | **Next.js + TypeScript** | Pantallas y lógica de servidor en un solo proyecto. | Siempre en la ruta del curso. |
| Componentes visuales | **Tailwind + shadcn/ui** | Pantallas consistentes sin diseñar un sistema visual desde cero. | Siempre en la ruta del curso. |
| Versiones del código | **GitHub**, repositorio privado | Historial, colaboración y volver atrás. | Siempre. Nunca se suben claves ni datos reales. |
| Publicación | **Vercel** | Publica desde GitHub. | Cuando alguien más tiene que abrir la app, sujeto a las reglas de la empresa. |
| Claves y configuración | **Variables de entorno por ambiente** | Separan las credenciales del código. | Siempre que haya credenciales. Las secretas nunca van al navegador. |
| Datos y permisos | **Supabase (PostgreSQL)** | Datos estructurados y reglas de acceso por fila (RLS). | Si hay datos que cambian, roles, o cuentas que se guarden. |
| Login | **Supabase Auth** | Cuentas y sesiones administradas. | Si hay datos privados reales o acceso privado, incluso con un solo usuario. |
| Archivos | **Supabase Storage** | Mismo proveedor y control de acceso. | Si hay archivos. Buckets privados cuando el contenido no es público. |

**Decisiones explícitas.** Supabase Storage es la referencia; Cloudflare R2 solo si volumen, costo o un requisito concreto lo justifica. Better Auth queda fuera del stack salvo que una restricción confirmada lo exija. No se exige Prisma, otro ORM, TanStack Query ni colas de mensajes: entran solo ante una necesidad demostrada.

### Login no es lo mismo que roles

- **Autenticación:** quién es la persona. Supabase Auth cuando el acceso debe ser privado.
- **Autorización:** qué puede ver y cambiar. Reglas en el servidor, permisos de base de datos y RLS cuando corresponde.
- **Roles = NO:** todos hacen lo mismo, pero eso no significa acceso público.
- **Roles = SÍ:** permisos por rol, probados con usuarios de prueba distintos.

| Situación | Regla |
| --- | --- |
| Demo pública con datos ficticios | Puede ir sin login; nunca con datos internos ni secretos. |
| Una persona con datos privados reales | Requiere login. No hacen falta varios roles si todos los permisos son iguales. |
| Empleados de una empresa | Se prueba con usuarios ficticios; para datos reales, confirmar con TI cómo se permite entrar. |
| Entrar con Microsoft o Google | Requiere configurar OAuth y, cuando aplique, autorización de TI. No reemplaza los permisos dentro de la app. |
| SaaS para varias empresas | Revisión especializada: aislar los datos de cada empresa antes de usar datos reales. |
| SAML, SCIM o identidad corporativa avanzada | Consultar antes; no se activa por defecto. |

**Correos de login.** El correo de prueba de Supabase tiene límites y no sirve para uso empresarial. Si el producto controlado usa invitaciones, recuperación de contraseña o enlaces por correo, se configura un servicio de correo aprobado antes de invitar usuarios reales.

### Patrón inicial de permisos

1. Si hay roles, registrar miembros y roles en tablas propias (por ejemplo, `user_roles`).
2. Proteger cada tabla expuesta con RLS y con permisos SQL (`GRANT` / `REVOKE`), separando leer, crear, editar y borrar.
3. Verificar la identidad en el servidor en cada acción; nunca confiar en un rol que manda el navegador.
4. Usar el ID estable del usuario, no su correo, para los permisos.
5. Probar PERMITIR y DENEGAR, con usuarios distintos y sin sesión.
6. Las claves secretas o administrativas solo en el servidor. Las que pueden saltarse RLS nunca van al navegador.

No se usa Custom Access Token Hook como requisito inicial. Guía de RLS: https://supabase.com/docs/guides/database/postgres/row-level-security

## Piezas que entran según la necesidad

| Necesidad | Cuándo entra | Solución inicial | Límite y verificación |
| --- | --- | --- | --- |
| Validar datos que llegan | Formularios, entradas de usuario, APIs o integraciones | **Zod** o validación equivalente en el servidor | Los tipos de TypeScript no validan lo que llega en ejecución. |
| Integraciones | Sistemas existentes = SÍ | API o exportación aprobada del sistema existente | Empezar leyendo; escribir solo con dueño, pruebas y permiso. |
| Tareas automáticas | Tareas automáticas = SÍ | **Vercel Cron** para tareas cortas; **Railway** para procesos largos o persistentes | Autenticar quién dispara, registrar fallas, evitar ejecuciones dobles, revisar límites del plan. |
| IA dentro del flujo | IA en el flujo = SÍ | **Anthropic API**, desde el servidor | Nada de datos no autorizados; validar respuestas, controlar costo y desconfiar de instrucciones dentro de documentos externos. |
| Registro de quién hizo qué | Aprobaciones = SÍ o impacto alto | Tabla de eventos en PostgreSQL | Autor, acción, fecha, entidad, cambio y resultado, consistentes con la operación. |
| Monitoreo de errores | Antes de usuarios reales | Logs de Vercel y Supabase; **Sentry** si la empresa lo aprueba | Alguien recibe las alertas; no se registran secretos ni datos sensibles. |
| Medir uso | Hay una pregunta concreta y uso autorizado | **PostHog** | Decidir privacidad, consentimiento y retención antes de activarlo. |
| Páginas públicas | Contenido público = SÍ | Funciones de **Next.js** | No aplica a la mayoría de herramientas internas. |

**Tareas automáticas.** Vercel Cron puede ejecutar dos veces, no reintenta solo y en el plan Hobby corre máximo una vez al día. Nunca se usa una tarea programada para mover plata o aprobar crédito sin protección contra duplicados y autorización.

**IA.** No autoriza accesos, no confirma hechos sin validar, no calcula la cifra oficial de un indicador ni ejecuta decisiones irreversibles sola. Si redacta una recomendación, la acción final sigue las reglas del negocio. Antes de enviarle información de la empresa se revisan los términos y la retención de datos del proveedor.

## Controles antes de usar datos reales

Pueden exigirse aunque no haya una señal nueva.

| Control | Comprobación mínima |
| --- | --- |
| Datos autorizados | Un responsable de la empresa confirma qué datos se permiten y dónde se procesan. |
| Entornos separados | Desarrollo y producción con credenciales y bases distintas; los previews no apuntan a producción. |
| Cambios reproducibles | Esquema y políticas de la base de datos en migraciones; producción no se cambia a mano. |
| Recuperación | Se sabe la frecuencia del respaldo, quién lo cuida, cuánto tiempo de caída se acepta y la restauración se probó. |
| Archivos | Si importan, tienen su propia copia: el respaldo de PostgreSQL no restaura archivos borrados de Storage. |
| Entradas seguras | Validación en el servidor, accesos probados y límites para cargas de archivos e integraciones. |
| Operaciones críticas | Reglas fijas, verificación de estado, protección contra duplicados y registro consistente. |
| Fallas y costos | Hay responsable, presupuesto, monitoreo y una forma simple de reportar fallas. |

**Respaldos.** Los respaldos diarios automáticos de Supabase son de planes pagos; en el plan gratis hay que exportar por cuenta propia. Para uso diario no basta con «el proveedor tiene backups»: se prueba restaurar.

**Planes.** Vercel Hobby es para uso personal no comercial; no es el alojamiento normal de una operación empresarial. Supabase Free pausa proyectos con poca actividad. Antes del uso diario se valida el plan comercial y sus límites.

## Ejemplo: Ferremax, aprobación de crédito

Ferremax es un caso didáctico. Su prototipo ya tiene interfaz, lógica, carga de archivos CSV de SAP, avisos y agentes de IA en modo ensayo, pero no guarda nada: al recargar, todo vuelve a empezar, y los roles se simulan en el navegador. SAP sigue siendo la fuente oficial.

| Señal | Respuesta | Decisión |
| --- | --- | --- |
| Roles | SÍ: vendedor, gerente, bodega, administración y operaciones tienen permisos distintos. Hoy se simulan en el navegador. | Login y permisos por rol, verificados en el servidor y en la base de datos. |
| Acceso | Empleados de una empresa. | Cuentas ficticias por rol. |
| Datos que cambian | SÍ: los pedidos cambian de estado y hoy se pierden al recargar. | PostgreSQL en Supabase. |
| Aprobaciones e impacto | SÍ: aprobar un pedido a crédito tiene consecuencias. | Reglas fijas, registro de quién aprobó y cuándo, protección contra duplicados. |
| Sistemas existentes | SAP por CSV, a mano; WhatsApp y correo simulados. | Se quedan así por ahora. |
| Archivos, tareas automáticas, IA en el flujo | SÍ, pero simulados: CSV, avisos y agentes en modo ensayo. | Se quedan como están; no son la primera conexión. |
| Contenido público | NO. | No aplica. |
| Señales de riesgo | Datos ficticios, planes gratuitos, sin TI. | Se decide con la empresa antes de usar datos reales. |

**Primera conexión de Ferremax:** entrar con una cuenta según el rol y aprobar un pedido, por ejemplo PED-2026-03103, que siga aprobado al recargar. Usa Supabase para tres cosas a la vez: login, permisos por rol y guardar el estado del pedido.

### Pruebas que debe pasar Ferremax

| Caso | Resultado esperado |
| --- | --- |
| Andrés (gerente) entra y aprueba PED-2026-03103. | El estado cambia, queda registrado quién aprobó y cuándo, y sigue aprobado al recargar. |
| Édinson (vendedor) entra e intenta aprobar ese pedido, también con una llamada directa al servidor. | Se rechaza; el estado no cambia. |
| Alguien sin sesión intenta ver o aprobar pedidos. | Acceso negado. |
| Se envía la misma aprobación dos veces. | No se duplica nada. |
| Un usuario sin permiso consulta datos de otra área. | Acceso negado también en la base de datos. |
| Falla el registro de una aprobación. | No queda una aprobación confirmada sin su registro; se informa el error. |
| Se cambia código o base de datos. | Las pruebas críticas siguen pasando antes de publicar. |

Criterio de la primera conexión: las tres primeras pruebas pasan. Las demás son la meta antes de un producto controlado.

## Fuera del stack

Solo si hay un estándar corporativo obligatorio o una necesidad confirmada que este documento no resuelve. Se documenta la excepción, el motivo, el responsable y el costo de mantenerla en STACK_DECISIONS.md. No se improvisa un proveedor nuevo por participante.

## Costos y proveedores

Este documento no fija precios porque cambian. Antes del producto controlado o del uso diario se revisa con el responsable: plan comercial permitido, límites, uso estimado, respaldos, correo de login, alertas de gasto y quién paga.

- Vercel, planes y límites: https://vercel.com/pricing · https://vercel.com/docs/plans/hobby
- Supabase, planes, respaldos y pausa del plan gratis: https://supabase.com/pricing · https://supabase.com/docs/guides/platform/backups · https://supabase.com/docs/guides/platform/free-project-pausing
- Correo de Supabase Auth: https://supabase.com/docs/guides/auth/auth-smtp
- RLS y permisos: https://supabase.com/docs/guides/database/postgres/row-level-security
- Permisos de Storage: https://supabase.com/docs/guides/storage/security/access-control
- Entornos y migraciones: https://supabase.com/docs/guides/deployment/managing-environments
- Tareas de Vercel: https://vercel.com/docs/cron-jobs/manage-cron-jobs
- Login con Microsoft: https://supabase.com/docs/guides/auth/social-sign-in/auth-azure

## Qué no cubre

Qué revisa cada rol y las preguntas para el código → Expertos 30X. Los prompts y los pasos de trabajo → el paso a paso del curso. Qué significa cada término → 04 · Vocabulario maestro.
