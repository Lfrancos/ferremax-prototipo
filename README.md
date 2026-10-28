# Ferremax · Pedido a crédito con topes (prototipo)

Prototipo **no funcional** para mostrar a los mentores del curso 30X hacia dónde va el curso: una herramienta pequeña que cuida el pedido a crédito desde la solicitud hasta la salida de bodega, con topes de tiempo.

- Sin backend, sin base de datos, sin autenticación y sin llamadas a APIs ni a LLMs.
- Datos ficticios en un solo archivo. Las acciones solo cambian el estado local. Al recargar todo vuelve a empezar; también se reinicia con "Reiniciar demo" en el sidebar.
- Interfaz en español de Colombia, en tema claro y oscuro.
- Base visual: el bloque `dashboard-01` de shadcn/ui (sidebar, tarjetas, gráfico y tabla), con los colores y la tipografía del Sistema de diseño de Ferremax.

## Cómo correrlo

```bash
npm install
npm run dev
```

Abre http://localhost:3000. Si el puerto está ocupado, Next usa el siguiente (3001, …) y lo dice en la consola.

## Mapa de pantallas

El menú lateral va por secciones: **Cómo funciona** (aparte) · **Clientes** (Nuevo cliente, Clientes, Cartera) · **Pedidos** (Solicitudes, Tablero de pedidos, Bodega, Transporte) · **Seguimiento** (Alertas, Revisión del lunes) · **Reglas**. La pantalla en la que estás se marca con fondo negro y texto amarillo.

| Ruta | Momento | Qué muestra |
|---|---|---|
| `/como-funciona` | Los 8 | Abre la presentación. Primero, "Antes del momento 1": las dos opciones para que entre la solicitud. Después, los 6 momentos hasta la salida de bodega con su tipo, quién decide, sus reglas y dónde viven, y los dos topes. Al final, el transporte (momentos 7 y 8). |
| `/solicitudes` | Antes del 1 | **Opción A · Satélite:** importar el archivo diario de SAP (formato, ejemplo descargable, revisión fila por fila). **Opción B · Solución completa:** el vendedor crea la solicitud y ve quién la aprueba, qué fecha puede prometer y la carga de bodega. |
| `/` | Todos | Tablero: 5 tarjetas (incluye **En camino**) que **filtran la tabla** al pulsarlas (Por aprobar, Cerca del tope, Fuera de tope, En camino; "% a tiempo" abre la revisión), un gráfico de pedidos abiertos por día y la tabla de pedidos con pestañas por tramo (Aprobar, Alistar y despachar, **En camino**, Cerrados) y por tope (Cerca del tope, Fuera de tope), con una columna **Tiempo total**. Cada fila tiene una flecha que despliega su historial y el botón **Aprobar** cuando la regla deja firmar al rol. |
| `/clientes` | 1 | Base de clientes (maestro de SAP). Sandra crea clientes; Nelson y los vendedores ven solo los nombres. |
| `/cartera` | 1, 2, 5 | Informe de cartera: el corte vigente, cuándo cruza cada cliente los 30 días de atraso, los pagos sin aplicar, el importador del corte de SAP con vista previa de lo que cambia, y las partidas abiertas. |
| `/pedidos/[id]` | 1 a 8 | Quién aprueba y por qué, ficha de cinco líneas, nota de contexto (propuesta IA), firma, paso a bodega, historial y, desde que sale de bodega, **5 · Transporte y entrega**: lo cargado contra lo pedido, el conductor, las fotos que llegaron y lo que leyó Claude. |
| `/bodega` | 4 y 7 | Lista de alistamiento de mañana (vista de Nelson), en el orden de la regla y con fecha límite. Cada fila tiene el botón **Entregar a transporte** (solo Nelson). |
| `/transporte` | 7 y 8 | Qué va en camino, qué salió incompleto, qué entregas tienen alerta y cuáles están confirmadas. Las dos opciones para que llegue la evidencia (chat de WhatsApp o enlace por entrega), con una simulación de lo que manda el conductor. |
| `/remisiones/[id]` | 4, 7 y 8 | La remisión de un pedido como se vería, las fotos firmadas que subió el conductor y **qué pasó con ella**: cuándo la generó SAP, cuándo entró a la lista, quién la entregó a transporte, cuándo llegó la foto firmada y qué leyó Claude. Se llega desde la ficha, el tablero (fila desplegada), Bodega y Transporte. |
| `/facturas/[id]` | Después de 8 | La factura como se vería y **qué pasó con ella**: quién la emitió, firma electrónica, DIAN, envío, acuse del cliente, corte de cartera y vencimiento. Se llega desde la ficha, el tablero y `/cartera`. |
| `/alertas` | 5 | Rutina diaria: qué está cerca del tope o fuera de tope en cada tramo, el tramo En camino (sin confirmar, evidencia con alerta, salidas incompletas) y borradores de aviso (propuesta IA). |
| `/revision` | 6 | Revisión del lunes: A, B, C, % a tiempo, fuera de tope por tramo, listas y resumen narrativo (propuesta IA). |
| `/reglas` | Todos | Las reglas con una pestaña por área: **Todas** (agrupadas por área) o solo una (Crédito, Bodega, Transporte, Proyecto, Sistema), con su dueño. |

**Cualquier insignia "■ Regla" se puede pulsar.** Abre un diálogo con la regla en palabras, su área, su documento y sección, sus números, dónde actúa, quién la puede editar y el historial de cambios.

## Roles

El rol se cambia abajo en el sidebar ("Ver como"). No es un login: cambia qué se ve, qué se puede hacer y la pantalla de inicio.

| Rol | Ve | Puede | Inicio |
|---|---|---|---|
| Andrés Molina | Todo | Firmar lo que la tabla le asigna. Editar las reglas de la Política y del Ops Charter. | `/revision` |
| Marcela Ríos | Todo | Firmar lo que pasa los 4 chequeos y los casos grises. Pedir el dato cuando falta. Editar Casos resueltos y la Revisión semanal de crédito. | `/alertas` |
| Sandra Beltrán | Todo | Firmar lo que pasa los 4 chequeos. **Crear clientes.** | `/clientes` |
| Nelson | Solo nombres de clientes; sin montos, cupos, saldos, atrasos ni motivos de crédito | Editar la Regla de prioridad de alistamiento. **Entregar a transporte** y atender las alertas de entrega. | `/bodega` |
| Édinson Rojas (vendedor) | Igual que Nelson | Crear solicitudes en la app (opción B). | `/solicitudes` |

Marcela y Sandra también importan el archivo de SAP (opción A). Marcela también atiende las alertas de entrega.

Estos permisos también son reglas, en el área Sistema:

- `PER-1`: quién ve la información de crédito.
- `PER-2`: quién crea clientes.
- `PER-3`: quién edita una regla. Sale de "Reglas del sistema · dónde viven las reglas": solo el dueño del documento lo edita.
- `PER-4`: quién firma y quién pide el dato. Sale de la tabla de la Política.
- `PER-5`: quién importa las solicitudes de SAP.
- `PER-6`: quién crea una solicitud en la app.
- `PER-8`: quién entrega a transporte (Nelson) y quién atiende las alertas de entrega (Nelson y Marcela).

## Cartera automática (opción A · satélite)

El saldo y el atraso ya no se escriben en el cliente: se calculan sobre las **partidas abiertas** del último corte de cartera de SAP. Cada corte reemplaza al anterior.

- **De dónde sale.** SAP sigue llevando facturas y pagos. Cada mañana Sandra importa en `/cartera` el reporte de partidas abiertas de clientes (PER-7). Las columnas son `id_cliente`, `razon_social`, `documento`, `tipo` (Factura o Pago sin aplicar), `id_pedido`, `fecha_documento`, `vencimiento`, `valor_cop` y `saldo_abierto_cop`.
- **CART-1 · Saldo pendiente.** La suma del saldo abierto de las facturas. Los pagos sin aplicar no se restan. Si una factura llega sin saldo, el saldo queda en blanco y los pedidos del cliente salen incompletos.
- **CART-2 · Días de atraso.** Desde el vencimiento de la factura abierta más antigua ya vencida hasta hoy (es la definición del chequeo 3). Cambia sola cada día.
- **CART-3 · Cuándo cruza el límite.** El vencimiento de la factura más antigua + 30 días + 1. Desde ese día sus pedidos van a Andrés. Por ejemplo, Consorcio Pacífico cruza el viernes 4 de diciembre. Se ve en `/cartera` y en `/alertas`; si alguien edita el límite de CRED-2.3, la fecha se mueve.
- **CART-4 · Pago sin aplicar.** Si el cliente tiene un pago que cartera aún no aplica, decide Marcela. Es el caso que Sandra le preguntó a Andrés en la entrevista.
- **Vista previa.** Antes de aplicar un corte se ve qué clientes cambian de saldo o atraso y qué pedidos por aprobar cambian de aprobador. Si una fila tiene un error de formato no se importa nada, porque un corte a medias daría saldos más bajos de lo real.
- **Ejemplo.** "Usar el corte de ejemplo de las 8:30" trae tres cambios: Pacífico pagó la factura vencida, cartera aplicó el pago de Manufacturas Cóndor y llegó el saldo de Metalmecánica Cóndor. Con eso, PED-2026-03105 deja de estar incompleta y pasa a Marcela o Sandra.
- Las partidas iniciales (`PARTIDAS_INICIALES` en `lib/data.ts`) están armadas para dar el mismo saldo y atraso del extracto del 3 de agosto. La lectura y revisión del archivo están en `lib/importar-cartera.ts`.

## Llega la solicitud: dos opciones

En las dos, apenas entra la solicitud, la regla CRED-1.1 dice quién la aprueba y arranca el reloj de 24 h.

**Opción A · Satélite.** SAP sigue siendo la puerta de entrada. Cada día se descarga de SAP un archivo con las solicitudes y se importa en `/solicitudes`.
- El archivo es un CSV que Excel guarda y abre: separador `;` (Excel en español), `,` o tabulador. También se pueden pegar las filas copiadas de Excel.
- Columnas: `id_pedido`, `id_cliente`, `razon_social`, `valor_cop`, `lineas`, `fecha_solicitud`, `vendedor`.
- "Descargar el ejemplo de hoy" baja `solicitudes_2026-11-30.csv`, que trae 3 solicitudes nuevas, 1 que ya está en la app y 2 con error (un cliente que no existe y una sin valor).
- Cada fila se revisa antes de entrar. Un pedido que ya está en la app no se duplica. Un cliente que no existe se le pide a Sandra. El reloj cuenta desde la fecha de SAP, así que el rato antes de importar ya es espera.
- La lectura y revisión del archivo están en `lib/importar.ts`.

**Opción B · Solución completa.** El vendedor crea la solicitud en la app. Mientras la llena ve tres cosas:
- Quién la aprueba (CRED-1.1). Sin el porqué, que es información de crédito.
- La fecha más tardía de salida de bodega que puede prometer si todo va en plazo: tope de aprobación, luego lista de las 7:00, luego fecha límite (CRED-3.1, BOD-1.1, BOD-3.1).
- La carga de bodega contra su capacidad: 18 pedidos por día. Es un dato de `S6_Capacidad`, no una regla escrita.

Las solicitudes creadas en la app usan números `SOL-2026-00001`, porque SAP todavía no les ha dado número de pedido.

## Transporte: de la salida de bodega a la entrega (momentos 7 y 8)

Hasta ahora el flujo terminaba cuando el pedido "salía en camión". Ahora sigue hasta que hay prueba de que llegó. **Estas reglas salen del pedido para la demo: ningún documento de `03-Areas` habla de transporte** (área Transporte en `/reglas`, sin dueño: [por definir]). El transporte a la obra sigue fuera del Ops Charter, así que no hay tope de días para el viaje: solo visibilidad y un aviso.

**Momento 7 · Entregar a transporte** (`/bodega`, solo Nelson, `PER-8`).
- `TRA-1 · Salida completa.` Nelson anota por línea cuánto cargó contra lo pedido. Si todo sale completo, "Salió completo". Si falta algo, "Salió incompleto": escribe qué falta y por qué, y el faltante queda a la vista de Marcela, del vendedor y en la ficha. No frena la salida: avisa.
- El conductor sale de una lista (`CONDUCTORES` en `lib/evidencia.ts`). Su celular es el número por el que escribirá al entregar.
- Aquí se detiene el reloj de bodega (`BOD-4.1`) y el pedido pasa al tramo **En camino**.
- `TRA-2 · En camino.` No tiene tope. Pasadas 24 h sin confirmación de entrega sale "Sin confirmar" y Nelson llama a la transportadora. Las 24 h son un número de la regla.

**Momento 8 · Confirmar la entrega** (`/transporte`).
- `TRA-3 · Evidencia de entrega.` La transportadora manda dos fotos: el producto entregado y el documento (la remisión) con el nombre de quien recibe y su firma. Sin una de las dos, con una borrosa, con el documento de otra remisión, sin nombre o sin firma, o si quien recibe escribió una novedad, la entrega queda con alerta.
- `TRA-4 · Alerta de entrega.` No cambia el estado del pedido ni lo bloquea. Sigue abierta hasta que Nelson o Marcela piden la evidencia otra vez (con un borrador del mensaje, propuesta IA) o la dan por buena con motivo escrito. Si llega una foto buena después, la alerta se cierra sola.
- **Lo que lee Claude es una propuesta, no una regla.** Cada foto se describe por lo que se ve (`FotoProducto`, `FotoDocumento` en `lib/tipos.ts`); de ahí se dibuja (`components/ferremax/foto.tsx`) y de ahí sale la lectura (`lib/evidencia.ts`), así que la imagen y lo que "lee" nunca se contradicen. En la versión real Claude leería la foto de verdad. Aquí no se sube ni se lee ninguna imagen.

**Dos opciones para que llegue la evidencia** (en `/transporte`, por decidir con los mentores; en las dos el resultado es el mismo mensaje con dos fotos).
- **A · Chat de WhatsApp.** Los conductores escriben a un número de Ferremax. Nadie les dice de qué pedido es: se busca por el número de remisión que se lea en el texto o en la foto y, si no, por el celular del conductor (si lleva un solo pedido en camino). Si no se puede, el mensaje queda **sin pedido** y Nelson o Marcela lo asocian a mano (`pedidoDelMensaje` en `lib/evidencia.ts`).
- **B · Enlace por entrega.** Al entregar a transporte, el conductor recibe un enlace único. Al llegar lo abre y manda las dos fotos. No hay que adivinar de qué pedido es.

**Cómo probarlo en la demo** (los mensajes se ensayan; nada sale a WhatsApp):
1. Como **Nelson**, en `/bodega`, **Entregar a transporte**. Baja una cantidad para ver "Sale incompleto".
2. En `/transporte` hay dos pedidos en camino desde el principio: `PED-2026-03096` (salió incompleto y lleva 47 h sin confirmar) y `PED-2026-03097`. Pulsa **Simular lo que manda el conductor** (chat) o **Abrir como conductor** (enlace) y elige qué manda: todo en orden, sin firma, sin nombre, sin foto del producto, documento borroso, documento de otra remisión, con novedad o solo texto.
3. Para ver un mensaje **sin pedido**: simula el chat desde "un número que Ferremax no conoce" con un documento borroso.
4. `PED-2026-03092` ya tiene una alerta (documento sin firma). Como Nelson o Marcela, **Atender**.

Estados de una entrega (`entregaDe` en `lib/vistas.ts`): En camino · Sin confirmar · Evidencia pedida · Entrega con alerta · Entrega confirmada. Todo se calcula sobre los eventos del pedido y los mensajes, no se guarda aparte.

## Documentos: remisión y factura

Cada pedido enlaza a su remisión y a su factura (ficha, fila desplegada del tablero, Bodega, Transporte y Cartera). Cada una muestra el documento y su historia: qué pasó, cuándo, quién y de qué lado (SAP, regla, persona, transportadora, cliente, DIAN o propuesta IA).

- **Remisión.** Casi toda su historia se arma con lo que ya sabe la app (`trazaRemision` en `lib/documentos.ts`): la genera SAP al aprobar (`BOD-2.1`, sin firma de cartera), entra a la lista de las 7:00, Nelson la entrega a transporte, el conductor sube la foto firmada y Claude la lee. **Nadie sube la remisión: la que se sube es la foto del documento firmado**, y la sube el conductor. **Quien firma es quien recibe en la obra.** La app no ve ese momento: solo sabe cuándo llegó la foto, y lo dice.
- **Factura.** La emite SAP (aquí figura Sandra Beltrán), la firma electrónicamente con el certificado de Ferremax (no una persona), la valida la DIAN y se envía al cliente, que responde con un acuse. **Nadie la sube a la app:** se entera por el corte de partidas abiertas que Sandra importa (`PER-7`). Valor y saldo se ocultan a quien no ve crédito (`PER-1`). Esa parte de la historia (`HITOS_FACTURA` en `lib/data.ts`) es lo que reportaría SAP: está inventada para 4 facturas; las demás solo muestran lo que trae el corte.
- Hoy solo los pedidos entregados de la demo tienen factura; la de `PED-2026-03092` se emitió con la entrega en alerta, y la historia lo dice.

## Cómo está armado

```
lib/data.ts        ÚNICO registro de verdad: CLIENTES, PEDIDOS (con estado y fecha de cada transición) y HOY fijo
lib/rules.ts       TODAS las reglas, una vez: id, texto, área, fuente, documento (con dueño), números y función
lib/vistas.ts      Vistas calculadas: pedido + cliente, tramo, relojes, lista de bodega, alertas, revisión, gráfico
lib/store.tsx      Estado de la sesión: arranca con data.ts y solo agrega eventos, clientes y cambios de reglas
lib/propuestas.ts  Textos de "Propuesta IA" armados con plantillas. No deciden nada
lib/importar.ts    Opción A: formato del archivo de SAP, lectura del CSV y revisión fila por fila
lib/importar-cartera.ts  Corte de cartera: columnas, lectura y revisión de las partidas abiertas
lib/lineas.ts      Detalle de las líneas de cada pedido (producto y cantidad pedida) para comparar con lo cargado
lib/evidencia.ts   Mensajes de la transportadora: conductores, lectura de las fotos (IA de muestra), asociación al pedido y escenarios
lib/documentos.ts  Historia de la remisión y de la factura de un pedido (qué pasó, cuándo, quién)
lib/flujo.ts       Los 8 momentos; los topes se leen de rules.ts
components/        Bloque dashboard-01 adaptado (sidebar, tarjetas, gráfico, tabla) y components/ferremax/
```

- **Clientes y pedidos separados.** Un pedido guarda solo `id_cliente`, valor, líneas y eventos. El cupo, saldo, atraso y antigüedad se leen del cliente cada vez. Para agregar un cliente basta una fila en `CLIENTES`, o el formulario de Sandra en `/clientes`.
- **Una regla en un solo lugar.** Cada número (máximo por pedido, horas del reloj, días de bodega, metas) vive en un solo objeto dentro de `rules.ts`. El texto de la regla se arma con ese número, así que nunca dicen cosas distintas.
- **Editar una regla.** El dueño del documento cambia un número desde el diálogo, con un motivo obligatorio. Todas las pantallas se recalculan, el cambio queda en el historial de la regla y el diálogo muestra qué dice el documento. Por ejemplo, si Andrés sube el máximo por pedido a 25.000.000, el chequeo 1 cambia en todas partes.
- **Firmar.** El botón Aprobar (o "Pedir dato") solo aparece si `PER-4` lo permite al rol. Ya no se puede firmar "fuera de regla" desde la pantalla. El caso fuera de regla que muestra la revisión viene de los datos (PED-2026-03092).
- **Sin arrastrar filas.** El bloque traía filas que se reordenan arrastrando; se quitaron porque contradicen BOD-3.2 ("el orden no lo cambia nadie a mano").

### De dónde sale cada cosa (solo lectura, en `..\empresa\`)

| En el prototipo | Documento |
|---|---|
| Campos y datos de los clientes | Hoja `Clientes` de `datos\historico\Ferremax_Dataset (SAP…)`; saldo y atraso de `datos\extractos-semanales\aprobaciones_2026-08-03` |
| Chequeos, quién aprueba, ficha, reloj de 12/24 h, decidir | `second-brain\03-Areas\Crédito\Política de aprobación de crédito (v1)` (dueño: Andrés) |
| Casos 1 a 5 y Casos nuevos | `second-brain\03-Areas\Crédito\Casos resueltos de crédito` (dueña: Marcela) |
| Indicadores A, B, C y las listas | `second-brain\03-Areas\Crédito\Revisión semanal de crédito` (dueña: Marcela) |
| Entrada a la fila, remisión, fecha límite, orden, reloj de bodega | `second-brain\03-Areas\Bodega\Regla de prioridad de alistamiento (v1)` (dueño: Nelson, con aprobación de Andrés) |
| % a tiempo y meta del proyecto | `second-brain\02-Projects\…\Ops Charter · Pedido a crédito (v2)` (dueño: Andrés) |
| Quién edita una regla | `skills\sistemas\Pedido a crédito\Reglas del sistema · dónde viven las reglas` |
| Colores, tipografía y logo | `second-brain\04-Resources\Ferremax · Sistema de diseño.md` (v1.1), copiados en `app/globals.css` y `public/logo` |

### Librerías

Next.js (App Router), TypeScript, Tailwind y shadcn/ui. El bloque `dashboard-01` trajo `@tanstack/react-table` (la tabla), `recharts` (los charts de shadcn), `next-themes` y `sonner` (tema y avisos). Se quitaron `@dnd-kit` y `zod`, que el bloque usaba para arrastrar filas.

## Lo que quedó "[por definir]"

Ningún documento lo dice, así que el prototipo no lo inventa:

1. **Si el reloj de aprobación se detiene mientras la solicitud está "incompleta".** La Política dice "se pide el dato, no se escala", pero no dice qué pasa con las 24 h. El prototipo deja correr el reloj y lo marca en `/alertas`.
2. **Historial de pagos del cliente** para la nota de contexto. No está en el extracto ni en el informe de cartera.
3. **Qué es una "Regla de Marcela".** No existe en los documentos. Se usaron los Casos resueltos de crédito (dueña: Marcela Ríos).
4. **Casos nuevos.** La tabla del documento está vacía.
5. **Cuánto es "poco cupo" (Caso 2).** El caso no lo dice, así que no se detecta solo.
6. **Qué pasa con un pedido rechazado** después del rechazo.
7. **Festivos.** La Regla habla de "días hábiles", pero solo dice que el domingo no se trabaja. El prototipo solo salta domingos.
8. **Cómo se cuentan los 5 días del Ops Charter** y qué momento es "la orden". El prototipo toma la orden como el registro de la solicitud y cuenta días calendario por fecha.
9. **Dueño de los permisos PER-1 y PER-2** (quién ve qué y quién crea clientes). Salen del pedido para esta demo, no de un documento.
10. **"Lead del área".** Ningún documento nombra un líder por área. El prototipo usa al dueño del documento de cada regla, que es quien "Reglas del sistema" deja editar. Un área puede tener varios dueños; en Crédito son Andrés y Marcela.
11. **Editar el texto de una regla.** El prototipo solo deja cambiar sus números. El texto se cambia en el documento, como dice "Reglas del sistema".
12. **Opción A:** qué reporte o transacción de SAP saca el archivo diario, y quién lo importa. El prototipo deja importar a Marcela y Sandra.
13. **Opción B:** cómo llega después a SAP un pedido creado en la app (doble digitación o integración), y qué número le da SAP.
14. **Vendedores:** si solo crean solicitudes de sus propios clientes y si deben ver información de crédito. El prototipo los deja crear para cualquier cliente y no les muestra crédito.
15. **Capacidad de bodega:** 18 pedidos por día es un dato de Nelson en `S6_Capacidad`, un dataset que está en revisión. No está en ninguna regla escrita.
16. **Cartera:** qué reporte de SAP saca las partidas abiertas (suele llamarse "partidas abiertas de deudores").
17. **Cartera:** cuántas horas puede tener el corte antes de que las solicitudes queden incompletas.
18. **Cartera:** con cuántos días de anticipación avisar que un cliente va a cruzar el límite de atraso.
19. **Cartera:** si en un despacho parcial se factura el pedido completo o solo lo despachado.
20. **Historia de la cartera:** la revisión del lunes recalcula quién debía aprobar con el corte de hoy, no con el del día de la solicitud. Guardar una foto de la cartera por día la haría exacta.
21. **Transporte (todo el bloque):** ninguna regla de `TRA-1` a `TRA-4` ni `PER-8` está escrita en un documento, y el área no tiene dueño. El Ops Charter deja el transporte a la obra fuera del proyecto.
22. **Cómo sabe el sistema lo que se cargó:** el prototipo deja que Nelson escriba la cantidad por línea. Otras formas: escanear códigos al cargar, o una foto de la lista de picking que Claude lea.
23. **De dónde sale el detalle de las líneas.** Las solicitudes de SAP (opción A) y las de la app (opción B) solo traen la cantidad de líneas. El detalle (producto y cantidad) de los 18 pedidos de la demo es inventado; para los demás salen líneas genéricas.
24. **Qué pasa con lo que faltó:** el segundo viaje no está modelado (¿pedido nuevo, remisión parcial, remisión del faltante?). Tampoco si se factura el pedido completo o solo lo despachado (ver 19).
25. **Quién avisa de una salida incompleta y a quién:** la regla dice Marcela, el vendedor y el cliente; el prototipo solo lo muestra en alertas y ficha.
26. **Las 24 h sin confirmar** (`TRA-2`) son un número elegido para la demo, y quién llama a la transportadora (Nelson) también.
27. **Qué cuenta como documento válido:** remisión correcta, nombre y firma es lo que pidió el equipo; si hace falta sello, cédula o fecha escrita, no está definido.
28. **Opción A:** número de WhatsApp Business, su costo y quién lo paga. Qué se hace con conductores que escriben fotos sueltas sin que el celular ni la remisión digan de qué pedido son.
29. **Opción B:** quién mantiene la página del conductor y qué pasa si escribe por el chat en vez de usar el enlace.
30. **Privacidad:** la foto del documento trae el nombre y la firma de una persona del cliente. No está definido cuánto tiempo se guarda ni quién la ve (el prototipo no oculta nada por rol).
31. **Facturas:** cuándo se factura (en la demo, el día de la entrega), si se factura el pedido completo o solo lo despachado, y qué hace la app si la entrega tiene una alerta abierta. Qué datos de la factura trae SAP (CUFE, hora de la DIAN, acuse) y con qué frecuencia.
32. **Facturas:** quién la emite. La demo pone a Sandra Beltrán; ningún documento lo dice.
33. **Remisión:** si la hoja firmada original se archiva en papel además de la foto, y cuánto tiempo se guarda cada una.
34. **Precios por línea:** la factura de la demo no los muestra porque no están en los datos.

## Supuestos de la demo

- Hoy está fijo en el **lunes 30 de noviembre de 2026, 9:00 a. m.**, con la Política y la Regla de bodega ya vigentes. La semana revisada (23 al 29 de noviembre) no tiene festivos.
- Los 19 clientes y sus datos vienen del maestro de SAP. Los 18 pedidos (valor, fechas y líneas) son inventados. Quien registra cada solicitud es el vendedor asignado al cliente en SAP.
- Los clientes nuevos toman IDs desde `CLI-135`, porque el maestro de SAP tiene 134 clientes según el Diccionario de datos.
- Un cliente con saldo o atraso vacío queda "en blanco": sus pedidos salen incompletos (CRED-2.5).
- Solo hay pedidos a crédito. La lista real de bodega también trae contado.
- Transporte: de los pedidos despachados, 4 ya están entregados (`03089`, `03090` y `03098` con evidencia completa; `03092` con el documento sin firma) y 2 van en camino (`03096`, que salió incompleto y lleva 47 h sin confirmar, y `03097`, que salió hoy a las 8:30). Los conductores, placas, celulares, el número de WhatsApp de Ferremax y el enlace son inventados. Las fotos son dibujos.
- No se usaron la hoja `S6_Regla_Nueva` ni la meta B1 del `S5_KPI_Tree`, porque chocan con la Regla v1 (ver los pendientes del `CLAUDE.md` de la raíz).
