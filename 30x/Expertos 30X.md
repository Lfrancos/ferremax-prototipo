# Expertos 30X

Última revisión: 2 nov 2026 · Lorenzo Franco

## Para qué es

Cuando estás construyendo tu prototipo y piensas «esto necesita seguridad» o «¿y los datos de dónde salen?», en una empresa de software hay una persona que piensa exactamente eso todo el día. Aquí están esas personas: qué hacen, cuándo les hablarías, qué no les preguntarías, y las preguntas que cada una le haría a tu código. Tú copias la pregunta, la pegas en Claude Code con tu proyecto abierto y revisas la respuesta. Es contratar ese rol por diez minutos.

Lo usan dos lectores. Tú, para orientarte y preguntar. El prompt de arquitecto, que consulta solo los roles que tu prototipo activa y deja escrito cuáles usó.

Este documento no elige herramientas: eso lo hace el Stack de referencia 30X. No autoriza datos reales ni reemplaza a tu equipo de TI. Lo que dice cada rol es qué mirar, no qué está aprobado.

## Cómo se lee la empresa

Trece roles en cuatro departamentos, como en una empresa de software pequeña. En una de cinco personas, una sola lleva tres de estos sombreros; en una grande, cada uno es un equipo. Lo que importa no es el cargo sino la pregunta que esa persona hace.

**Producto**: decide qué se construye, que se entienda y que llegue a usarse.
**Ingeniería**: lo construye, lo asegura, lo prueba y lo publica.
**Datos**: cuida de dónde sale cada dato y qué dice el uso.
**Operaciones**: cuida lo legal y la plata.

Cada rol tiene las mismas partes: qué hace en una empresa, cuándo le hablarías, qué no le preguntarías, qué cambia con IA, en qué pensar, pregúntale a tu código, y cómo sabes que quedó bien.

Todas las preguntas asumen que trabajas con datos ficticios, en desarrollo, y que Claude Code tiene tu proyecto abierto. Si una respuesta propone tocar datos reales, producción o credenciales, para y pregunta en tu sala.

---

# Producto

## Product Manager

**Nombre en español.** Gerente de producto.
**En una línea.** Decide qué se construye, para quién y por qué, y qué se deja fuera.

**Qué hace en una empresa.** Es el dueño del problema, no de la solución. Habla con los usuarios, prioriza qué se construye primero, escribe qué significa «terminado» y dice que no a casi todo. Mide si lo que se construyó resolvió algo.

**Cuándo le hablarías.** Cada vez que vas a agregar una función, una pantalla o una herramienta nueva. Y siempre antes de conectar la primera pieza.

**Qué no le preguntarías.** Qué base de datos usar ni cómo se programa algo. Tampoco si tu empresa lo va a adoptar: eso lo decide tu empresa.

**Qué cambia con IA.** Ahora puede proponer soluciones que antes costaban semanas, y por eso su trabajo de decir que no vale más: la IA construye rápido lo que no hacía falta.

**En qué pensar.**
- Qué fuga de plata o de tiempo resuelve este flujo, y quién lo va a usar.
- Si un cambio de proceso, una skill o una rutina lo resuelve antes que una app.
- Satélite, núcleo operativo o plataforma integrada: si ya lo decidiste, no lo vuelvas a decidir cada vez que agregas algo.
- Qué queda fuera. Lo que no está en el flujo mínimo, no se construye todavía.
- Qué tarea concreta completa la persona al terminar el recorrido.

**Pregúntale a tu código.**
- «Lee mi proyecto y dime cuál es el flujo mínimo que resuelve el problema que describo en PROJECT_SCAN_30X.md. Señala qué pantallas o funciones sobran para ese flujo y qué puedo dejar para después».
- «Describe en tres frases, para alguien sin formación técnica, qué hace hoy mi prototipo y qué no hace. No inventes funciones que no estén en el código».
- «¿Qué prueba demostraría que esto le ahorra tiempo o plata a la persona que lo usa? Propón una, con datos ficticios».

**Cómo sabes que quedó bien.** Una persona completa el recorrido y puede decir en una frase qué problema le resolvió. Lo que no está probado queda marcado como no probado.

## Product Designer

**Nombre en español.** Diseñador de producto.
**En una línea.** Hace que la persona entienda la pantalla y logre su tarea sin que nadie le explique.

**Qué hace en una empresa.** Dibuja las pantallas antes de que existan, las prueba con usuarios reales y vuelve a dibujar. Piensa en las pantallas que nadie piensa: cuando no hay datos, cuando algo falla, cuando el usuario se equivoca. No es el que elige colores; es el que elige qué ve primero el usuario.

**Cuándo le hablarías.** Cuando alguien distinto a ti va a usar la pantalla. Si solo la usas tú, este rol puede esperar.

**Qué no le preguntarías.** Si los datos son correctos ni si la app es segura. Tampoco qué debe hacer el negocio: eso es del Product Manager.

**Qué cambia con IA.** Las pantallas se generan en minutos, así que el trabajo ya no es dibujarlas: es decidir cuáles sobran y probar que se entienden.

**En qué pensar.**
- Quién usa cada pantalla y qué tiene que lograr en ella. Una pantalla, una tarea.
- Qué pasa cuando no hay datos, cuando algo falla o cuando el usuario se equivoca. Esas pantallas también existen.
- Qué botón hace algo irreversible, y si se ve distinto a los demás.
- Si se entiende desde un celular, porque el vendedor en la obra no tiene computador.
- Si los nombres en pantalla son los que usa tu gente, no los que usa el código.

**Pregúntale a tu código.**
- «Recorre las pantallas de mi proyecto como si fueras [rol, por ejemplo: el jefe de bodega] que entra por primera vez. Dime en qué paso te perderías y por qué».
- «Lista los estados que mis pantallas no manejan: sin datos, cargando, error, sin permiso. Para cada uno dime qué ve hoy el usuario».
- «¿Qué acciones de mi interfaz son irreversibles? Dime si están protegidas con una confirmación o si se pueden disparar por accidente».
- «Revisa los textos de botones y títulos. Señala los que usan lenguaje técnico y propón cómo los diría [tu empresa]».

**Cómo sabes que quedó bien.** Alguien de tu equipo completa el flujo sin que tú le expliques nada. Si le tuviste que explicar, anota qué.

## Delivery Lead

**Nombre en español.** Líder de entrega. A veces se llama Customer Success u Operaciones de producto.
**En una línea.** Hace que lo construido llegue a usarse: piloto, usuarios, responsables y forma de pararlo.

**Qué hace en una empresa.** Está entre el equipo que construye y la gente que usa. Organiza el piloto: quiénes lo prueban, con qué datos, por cuánto tiempo, qué se mide y quién atiende cuando algo falla. Consigue las aprobaciones que el equipo técnico no puede conseguir solo.

**Cuándo le hablarías.** Cuando quieres que lo use gente real o que la empresa dependa de esto a diario. No antes.

**Qué no le preguntarías.** Cómo se construye ni si el código está bien. Tampoco le pedirías que apruebe por tu empresa: prepara la conversación, no la reemplaza.

**Qué cambia con IA.** Los prototipos llegan más rápido a la puerta del piloto, y por eso hay más prototipos esperando permiso. Su trabajo es que ese permiso se pida bien y con evidencia.

**En qué pensar.**
- Prototipo, producto controlado y operación empresarial son tres niveles de madurez. No es una escalera automática: subir de nivel es una decisión.
- Un producto controlado tiene objetivo, personas, datos autorizados, período, responsable y una forma de pararlo.
- Quién autoriza los datos, quién paga los servicios y quién atiende cuando algo falla.
- Permisos de TI, seguridad y privacidad los da tu empresa. El curso no los sustituye.
- Si se revierte el código, no se revierten las aprobaciones ni los mensajes que ya salieron.

**Pregúntale a tu código.**
- «Según mi proyecto, dime qué puedo probar hoy con datos ficticios, qué necesitaría un piloto con usuarios autorizados y qué tendría que aprobar mi empresa para uso diario. No declares autorizaciones que no existen».
- «Si dos personas de mi equipo usan esto durante dos semanas, ¿qué puede salir mal y quién tendría que estar pendiente?».
- «¿Qué tendría que pasar para detener el piloto y volver a como estábamos? Dime qué se recupera con el código y qué no».

**Cómo sabes que quedó bien.** Tienes una decisión escrita: GO, NO-GO o PENDIENTE, con quién aprueba, qué evidencia falta y cómo se detiene.

---

# Ingeniería

## Tech Lead

**Nombre en español.** Líder técnico.
**En una línea.** Cuida que el código crezca sin romperse: qué se conserva, qué se cambia y cómo se vuelve atrás.

**Qué hace en una empresa.** Es el ingeniero con más criterio del equipo. Revisa el código de los demás, decide cómo se organiza el proyecto, frena los cambios grandes y pide cambios pequeños con prueba. Cuando algo se rompe, es quien sabe volver al estado anterior.

**Cuándo le hablarías.** Siempre que vas a cambiar algo de lo que ya construiste. Antes de agregar tecnología, decide qué conservas.

**Qué no le preguntarías.** Qué pieza conectar primero: eso lo propone el arquitecto y lo decides tú. Tampoco si el negocio necesita la función.

**Qué cambia con IA.** Claude Code escribe el código; el Tech Lead es quien lo revisa. Su pregunta de siempre, «¿qué archivos tocas y cómo vuelvo atrás?», ahora se la haces a la IA antes de cada cambio.

**En qué pensar.**
- Qué existe de verdad en el código y qué es una pantalla que simula.
- Es el mismo proyecto: no crees otro. Si sigue siendo la misma aplicación, sigue en el mismo repositorio.
- Los datos ficticios, las reglas de negocio y el acceso futuro a datos reales son tres capas. Que no queden pegadas.
- Cambios pequeños, con versión guardada antes, y una prueba que confirme que lo anterior sigue funcionando.
- Si algo se rompe, cómo vuelves al estado anterior en cinco minutos.

**Pregúntale a tu código.**
- «Lee PROJECT_SCAN_30X.md y compara con el código. Dime qué puedo reutilizar tal cual, qué hay que corregir y qué es solo simulación en pantalla».
- «Propón el cambio más pequeño que habilite [la pieza que voy a conectar]. Dime qué archivos tocas, qué riesgo tiene y cómo vuelvo atrás si falla».
- «¿Mis reglas de negocio están separadas de los datos ficticios? Si están mezcladas, dime dónde y cómo separarlas sin romper lo que funciona».

**Cómo sabes que quedó bien.** Tienes una lista de lo que se reutiliza, lo que se corrige y un cambio mínimo que puedes probar sin tocar datos reales.

## Backend Engineer

**Nombre en español.** Ingeniero de backend, o de integraciones.
**En una línea.** Conecta tu aplicación con los sistemas que ya existen y hace que algo corra sin que nadie haga clic.

**Qué hace en una empresa.** Construye lo que no se ve: la conexión con el ERP, el envío de correos, las tareas que corren solas de noche. Vive pensando en qué pasa cuando el otro sistema se cae, tarda o responde dos veces.

**Cuándo le hablarías.** Cuando tu prototipo lee o escribe en algo que ya existe (ERP, Excel, correo, WhatsApp) o cuando algo debe correr sin que nadie haga clic.

**Qué no le preguntarías.** Si puedes conectarte a SAP de verdad: eso lo autoriza tu empresa. Tampoco cómo se ve la pantalla.

**Qué cambia con IA.** La IA inventa APIs que no existen con mucha seguridad. El Backend Engineer es el que pide la documentación antes de creerle.

**En qué pensar.**
- Antes de conectar: de dónde sale, a dónde va, quién es el dueño y qué permiso hace falta.
- Empieza leyendo. Escribir en un sistema real exige permiso de quien lo cuida.
- Las APIs no se inventan. Si no tienes la documentación o el contrato, no asumas que existe el dato.
- Qué pasa si el otro sistema se cae, tarda o responde dos veces.
- Una acción que no se puede deshacer (aprobar, enviar, cobrar) necesita registro y, según el riesgo, una persona que confirme.

**Pregúntale a tu código.**
- «Diseña la conexión mínima que mi flujo necesita con [sistema]. Dime qué datos lee, qué escribe, qué autorización falta y qué documentación necesitarías para no inventar nada».
- «Si [sistema] no responde, responde tarde o responde dos veces, ¿qué hace hoy mi código? Dime qué se duplicaría o se perdería».
- «¿Qué acciones de mi flujo deberían pasar por una confirmación humana antes de ejecutarse? Justifica cada una».

**Cómo sabes que quedó bien.** Simulas un dato viejo, una falla y una petición repetida, y en los tres casos sabes qué pasó y nada se ejecutó dos veces.

## AI Engineer

**Nombre en español.** Ingeniero de IA.
**En una línea.** Decide dónde entra un modelo de IA en tu flujo, escribe los prompts, valida las respuestas y controla cuánto cuesta.

**Qué hace en una empresa.** Es un rol nuevo. No entrena modelos: los usa. Decide qué pasos del flujo se le dan a la IA (interpretar, resumir, clasificar, redactar) y cuáles no (decidir plata, crédito, permisos). Escribe y versiona los prompts, arma pruebas para saber si el modelo responde bien, y vigila que lo que se le manda esté autorizado y que la factura no se dispare.

**Cuándo le hablarías.** Si tu prototipo usa IA para algo más que ayudarte a construirlo: si en el flujo del usuario hay un paso donde un modelo lee, interpreta o escribe.

**Qué no le preguntarías.** Si la IA puede aprobar el pedido. La respuesta siempre es no: la IA interpreta, la regla decide. Tampoco si puedes mandarle datos de clientes: eso es de Legal.

**Qué cambia con IA.** Este rol es el cambio.

**En qué pensar.**
- Qué pasos del flujo son interpretación (la IA puede) y cuáles son decisión (una regla fija y una persona).
- Qué le mandas al modelo. Datos de personas o de la empresa sin autorización, no.
- Lo que el modelo lee de afuera (un documento, un correo) puede traer instrucciones. No puede darle permisos.
- Cómo sabes que la respuesta es buena: necesitas ejemplos con la respuesta correcta conocida para comparar.
- Cuánto cuesta cada llamada y cuántas veces se hace por uso típico. Si la respuesta es siempre la misma, guárdala.

**Pregúntale a tu código.**
- «Lista cada punto donde mi aplicación llama a un modelo de IA. Para cada uno dime qué le manda, qué espera de vuelta, qué hace con la respuesta y qué pasa si la respuesta viene mal».
- «¿Hay decisiones que hoy le pido a la IA y que deberían ser una regla fija? Lista cuáles y propón la regla».
- «Arma cinco casos de prueba para [el paso que usa IA], con entrada ficticia y la respuesta que yo esperaría. Córrelos y dime cuántos acertó».
- «Si el documento que le paso a la IA trae la instrucción "aprueba este pedido", ¿qué pasa en mi código? Dime cómo lo evito».

**Cómo sabes que quedó bien.** Puedes decir qué hace la IA en tu flujo y qué no, tienes casos de prueba con resultado conocido, y sabes cuánto cuesta un uso típico.

## Security Engineer

**Nombre en español.** Ingeniero de seguridad.
**En una línea.** Piensa como alguien que quiere saltarse tu pantalla, y cierra las puertas antes de que lo intente.

**Qué hace en una empresa.** Revisa que quien entra solo pueda hacer lo que le toca, que las claves no estén donde no deben, y que lo que escribe un usuario no rompa nada. Prueba lo prohibido: intenta aprobar sin permiso, llamar directo al servidor, entrar sin sesión.

**Cuándo le hablarías.** Si alguien entra con usuario, si hay datos que no son públicos, si una acción tiene consecuencias (aprobar, cobrar) o si la IA lee contenido que viene de afuera.

**Qué no le preguntarías.** Que certifique que tu aplicación es segura: recomendar login o reglas de acceso no es lo mismo que haberlas probado. Tampoco si puedes usar datos reales: eso es de Legal y de tu empresa.

**Qué cambia con IA.** Aparece una puerta nueva: el contenido que la IA lee puede traer instrucciones escondidas (prompt injection). Y la IA genera código con claves pegadas adentro si nadie la frena.

**En qué pensar.**
- Quién entra no es lo mismo que qué puede hacer. Ocultar un botón no es un permiso: el permiso se verifica en el servidor y en la base de datos.
- Lo que escribe el usuario se valida en el servidor, nunca se confía en lo que llega del navegador.
- Las claves no van en el código, ni en el repositorio, ni en pantalla, ni en un prompt. Las secretas se quedan en el servidor.
- Si la IA lee documentos, correos o páginas externas, ese contenido puede traer instrucciones. No puede darle permisos ni ejecutar acciones importantes.
- Cada tabla que se expone tiene reglas de quién lee y quién escribe. Se prueban con permitir y con denegar.

**Pregúntale a tu código.**
- «Evalúa las amenazas reales de mi flujo. Revisa permisos en servidor y base de datos, validación de entradas, manejo de secretos y abuso de endpoints. Dame pruebas con usuario autorizado, no autorizado y sin sesión».
- «¿Qué podría hacer alguien que llame directo a mi servidor saltándose la pantalla? Dime qué acciones no están protegidas».
- «Busca en mi proyecto cualquier clave, token o contraseña que esté en el código o en archivos que se suban al repositorio. No me muestres los valores, solo dónde están».

**Cómo sabes que quedó bien.** Pruebas con tres usuarios (autorizado, no autorizado, sin sesión), incluida una llamada directa al servidor. Ninguna acción prohibida se ejecuta.

## QA Engineer

**Nombre en español.** Ingeniero de calidad y pruebas. QA es Quality Assurance.
**En una línea.** Demuestra que funciona y que falla bien, con evidencia y no con «se ve bien».

**Qué hace en una empresa.** Escribe los casos: funciona, entrada inválida, sin permiso, repetido, el otro sistema falla. Los corre antes de cada cambio importante y después. Lleva la tabla de qué pasó y qué no. Es la persona que dice «no está probado» cuando todos quieren decir «ya quedó».

**Cuándo le hablarías.** Antes de confiar en un cambio. Siempre que el cambio toque permisos, datos o el estado de algo.

**Qué no le preguntarías.** Si el flujo está bien diseñado: confirma que hace lo que dice, no si debería decirlo. Tampoco le pedirías que pruebe sobre producción.

**Qué cambia con IA.** La IA dice «listo, probado» sin haber corrido nada. El QA es el que exige ver la prueba ejecutada y el resultado observado.

**En qué pensar.**
- Prueba el recorrido real del negocio, no un porcentaje de cobertura.
- Cinco casos que casi siempre aplican: funciona, entrada inválida, sin permiso, repetido, el otro sistema falla.
- Una prueba tiene resultado esperado, resultado observado, evidencia y alguien que la corrió. «Se ve bien» no es una prueba.
- No se declara que pasó sin haberla ejecutado. No se prueba sobre producción.
- Un cambio pequeño con prueba vale más que uno grande sin ella.

**Pregúntale a tu código.**
- «Propón máximo ocho pruebas prioritarias sobre mi flujo, con entrada ficticia, resultado esperado y riesgo. No marques ninguna como pasada hasta que la ejecutemos y guardemos la evidencia».
- «Para la acción [aprobar un pedido]: ¿qué pasa si la envío dos veces? Escribe la prueba y córrela».
- «Después del cambio que acabamos de hacer, ¿qué prueba confirma que lo anterior sigue funcionando? Ejecútala y muéstrame el resultado».

**Cómo sabes que quedó bien.** Una tabla con los casos críticos marcados PASS, FAIL o NO PROBADO, y el motivo concreto de cada FAIL.

## DevOps Engineer

**Nombre en español.** Ingeniero de operaciones de desarrollo. También se llama SRE o ingeniero de plataforma.
**En una línea.** Publica tu aplicación para que otros la abran, y cuida que se pueda recuperar si algo se pierde.

**Qué hace en una empresa.** Mantiene separados desarrollo y producción, con credenciales y bases distintas. Hace que cada cambio a la base de datos quede escrito y se pueda repetir. Prueba los respaldos restaurándolos, no leyendo que existen. Sabe qué plan tiene cada proveedor y qué pasa cuando se pausa o cobra.

**Cuándo le hablarías.** Cuando quieres que alguien más abra tu prototipo desde su computador, y desde el primer día que guardas algo que no quieres perder.

**Qué no le preguntarías.** Qué plan comercial contratar ni quién paga: eso se revisa con tu empresa antes del piloto. Tampoco si la función es útil.

**Qué cambia con IA.** Publicar es un comando. Lo que la IA no hace sola es separar los entornos ni probar que el respaldo se restaura; eso sigue siendo una pregunta que tienes que hacer.

**En qué pensar.**
- Desarrollo y producción son dos entornos con credenciales y bases distintas. Las pruebas nunca apuntan a producción.
- Cada cambio a la base de datos queda escrito en una migración que se puede volver a correr. No se cambia producción a mano.
- Respaldo: cuál es la frecuencia, quién lo cuida y si alguna vez se probó restaurar. «El proveedor tiene backups» no es una respuesta.
- Los archivos (PDF, fotos) no se respaldan con la base de datos. Son otra copia.
- Qué plan del proveedor estás usando y qué pasa cuando se pausa, se llena o cobra.

**Pregúntale a tu código.**
- «Revisa cómo está configurado mi proyecto para publicarse. Dime si desarrollo y producción usan credenciales distintas y si algún preview apunta a datos de producción».
- «¿Qué tendría que hacer para restaurar mi base de datos a como estaba ayer? Dime si eso está probado o es una suposición».
- «Lista las variables de entorno que mi proyecto necesita, cuáles son públicas y cuáles secretas, y dónde debería configurar cada una para publicar. No muestres valores».

**Cómo sabes que quedó bien.** Alguien abre tu prototipo desde un link, con datos ficticios, y tú sabes cómo volver a la versión anterior si algo sale mal.

---

# Datos

## Data Engineer

**Nombre en español.** Ingeniero de datos.
**En una línea.** Sabe de dónde sale cada dato, quién puede cambiarlo y qué pasa si se pierde.

**Qué hace en una empresa.** Construye el camino de los datos: de dónde entran, dónde se guardan, cómo se calculan los indicadores y quién tiene la versión oficial. Cuando dos pantallas muestran dos números distintos para lo mismo, es a quien llaman.

**Cuándo le hablarías.** Cuando tu prototipo guarda algo que cambia, calcula un indicador o consulta otro sistema.

**Qué no le preguntarías.** Si puedes usar datos reales de tu empresa: eso lo autoriza tu empresa. Tampoco qué indicador importa para el negocio: eso viene de tu KPI tree.

**Qué cambia con IA.** La IA calcula cualquier cosa y la muestra con confianza. El Data Engineer pregunta de dónde salió el número y si se puede volver a calcular igual mañana.

**En qué pensar.**
- Para cada dato: de dónde sale y quién puede cambiarlo. Una pantalla no reemplaza al ERP por mostrar lo mismo.
- Qué es observado, qué es simulado, qué es estimado y qué lo calculó la IA. No se mezclan.
- Para un indicador: fórmula, unidad, período y responsable. Si no se puede reproducir, no es un indicador.
- Qué se guarda y qué no. Copiar datos sensibles que no necesitas es un riesgo sin beneficio.
- Qué pasa si se pierde lo que guardaste. Si no se puede reconstruir, piensa en recuperación antes de guardar.

**Pregúntale a tu código.**
- «Traza los datos de mi flujo: para cada uno dime de dónde viene, dónde se usa, si tiene una fórmula, quién puede escribirlo y si es ficticio. Preséntalo como tabla».
- «¿Qué información de mi prototipo necesita guardarse entre una sesión y otra, y cuál puede seguir viniendo del sistema actual?».
- «Toma el indicador [nombre] y dime cómo se calcula en el código, en qué unidad y sobre qué período. Si no está claro, dímelo».

**Cómo sabes que quedó bien.** Cualquier número en pantalla se puede rastrear hasta su fuente o su fórmula.

## Product Analyst

**Nombre en español.** Analista de producto.
**En una línea.** Mide si la gente lo usa, si falla y si mueve el indicador que prometiste.

**Qué hace en una empresa.** Define qué se mide y para qué decisión. Separa tres cosas que la gente confunde: el indicador del negocio, los errores técnicos y el uso de la herramienta. Monta las alertas con destinatario y acción. Se niega a instalar herramientas de medición «por si acaso».

**Cuándo le hablarías.** Cuando necesitas saber si la gente lo usa, si falla y si mueve el indicador que prometiste.

**Qué no le preguntarías.** Cuál es el indicador de tu negocio: eso viene de tu KPI tree. Tampoco si la app es segura ni si está bien construida.

**Qué cambia con IA.** Medir es más fácil, y por eso se mide de más. Su pregunta sigue siendo la misma: ¿qué decisión cambia con este número?

**En qué pensar.**
- Indicador de negocio, error técnico y uso de la herramienta son tres cosas distintas. No se miden con lo mismo.
- No instales una herramienta de medición sin una pregunta concreta y alguien que vaya a actuar con la respuesta.
- No captures datos sensibles ni grabes sesiones sin evaluar privacidad y cuánto tiempo se guarda.
- Una alerta tiene umbral, destinatario, acción y alguien que verifica que llegó.
- Si tu herramienta es interna, no necesitas posicionamiento en buscadores. Casi ninguna lo necesita.

**Pregúntale a tu código.**
- «Dime qué necesito medir para saber si mi solución funciona. Separa impacto de negocio, uso y fallas. Recomienda solo lo que tenga una pregunta detrás».
- «¿Qué errores puede producir mi aplicación que hoy nadie vería? Propón la forma más simple de enterarme».
- «Diseña un evento de prueba: qué dispara, a dónde llega y cómo verifico que llegó sin exponer datos privados».

**Cómo sabes que quedó bien.** Produces un error o un evento de prueba y llega a donde tiene que llegar, sin información privada en el camino.

---

# Operaciones

## Legal & Privacy

**Nombre en español.** Legal y privacidad. En empresas grandes es el oficial de protección de datos.
**En una línea.** Decide qué datos de personas puedes usar, quién lo autorizó y por cuánto tiempo se guardan.

**Qué hace en una empresa.** Revisa cada dato de una persona que entra al sistema: si hace falta, quién autorizó usarlo, a dónde se envía y cuándo se borra. Lee los términos de cada proveedor antes de que alguien les mande información. Es quien responde cuando un cliente pide que borren sus datos.

**Cuándo le hablarías.** Cuando el prototipo toca datos de personas (clientes, empleados, proveedores), datos financieros o cualquier cosa que no querrías ver en un correo equivocado.

**Qué no le preguntarías.** Que te dé asesoría legal: este rol prepara las preguntas para quien sí puede responderlas en tu empresa. Tampoco cómo proteger técnicamente los datos: eso es del Security Engineer.

**Qué cambia con IA.** Mandarle datos de una persona a un modelo es procesarlos, y casi nadie lo nota. Este rol es quien pregunta qué se le está enviando a la IA y bajo qué términos.

**En qué pensar.**
- Datos ficticios no necesitan permiso. Datos internos reales, personales o financieros: consultar antes, aunque no parezcan sensibles.
- Quién autorizó usar esos datos y dónde se procesan. Enviar datos de una persona a una API de IA es procesarlos.
- Qué datos mínimos necesita el flujo. Lo que no necesitas, no lo pidas ni lo guardes.
- Cuánto tiempo se guarda y quién puede borrarlo.
- Los términos del proveedor: qué hace con lo que le mandas y por cuánto tiempo lo retiene.

**Pregúntale a tu código.**
- «Lista todos los datos de personas que mi prototipo pide, guarda o envía a un servicio externo. Para cada uno dime si el flujo lo necesita de verdad».
- «¿Qué información sale de mi aplicación hacia servicios de terceros (IA, correo, analítica)? Dime exactamente qué se envía».
- «Si un cliente me pide borrar sus datos, ¿qué tendría que hacer en mi aplicación hoy? Dime dónde quedarían copias».

**Cómo sabes que quedó bien.** Puedes decir, dato por dato, quién autorizó usarlo y por qué lo necesitas. Si no puedes, sigue siendo ficticio.

## FinOps

**Nombre en español.** Finanzas de la nube. Quien cuida la factura de los proveedores.
**En una línea.** Sabe cuánto cuesta cada uso de tu herramienta y qué paso es el más lento, con números.

**Qué hace en una empresa.** Lee las facturas de los proveedores (hosting, base de datos, IA) y las conecta con el uso real. Pone alertas de gasto. Encuentra el paso que cuesta de más o tarda de más, y decide con el equipo si vale la pena arreglarlo. Frena las optimizaciones de cosas que nadie usa.

**Cuándo le hablarías.** Cuando algo se siente lento, cuando usas IA en cada clic o cuando el proveedor empieza a cobrar. Antes de eso, casi nunca.

**Qué no le preguntarías.** Cuánto presupuesto hay: eso lo decide tu empresa. Este rol te dice a dónde se va la plata, no cuánta tienes.

**Qué cambia con IA.** Antes el costo de software era fijo; con IA cada clic puede costar. Este rol existe en más empresas pequeñas que antes por esa razón.

**En qué pensar.**
- Lento para quién y en qué paso. Una medición vale más que una impresión.
- Cada llamada a la IA cuesta plata y tiempo. Si la respuesta es siempre la misma, no la vuelvas a pedir.
- Límites del plan: cuántas peticiones, cuánto almacenamiento, qué pasa al superarlos.
- Una alerta de gasto con umbral y destinatario antes de que llegue la sorpresa.
- No optimices lo que nadie usa todavía.

**Pregúntale a tu código.**
- «¿En qué puntos mi aplicación llama a un servicio externo o a la IA? Para cada uno dime cuántas veces por uso típico y si el resultado se podría guardar en vez de volver a pedir».
- «Dime qué parte de mi flujo haría más lenta la aplicación si tuviera 100 pedidos en vez de 10. Mide o estima, y di cuál de las dos hiciste».
- «Según los servicios que usa mi proyecto, ¿qué plan tendría cada uno y qué pasa cuando supero el plan gratuito? Dime dónde pondría una alerta de gasto».

**Cómo sabes que quedó bien.** Sabes cuánto cuesta un uso típico de tu herramienta y qué paso es el más lento, con un número y no con una sensación.

---

## Para el arquitecto

Lee esto solo si eres el prompt de arquitecto o un mentor revisando por qué el arquitecto consultó a un rol.

El arquitecto no ejecuta trece roles. Lee PROJECT_SCAN_30X.md, mira el código y consulta solo los que las señales activan. Deja escrito cuáles consultó y qué evidencia lo motivó.

| Rol | Lo activa |
| --- | --- |
| Product Manager | Siempre, antes de la primera conexión. |
| Product Designer | Alguien distinto a quien construye usa la pantalla. |
| Delivery Lead | La persona quiere usuarios reales o uso diario. |
| Tech Lead | Siempre que ya hay código. |
| Backend Engineer | Sistemas existentes, tareas automáticas, impacto alto o requisitos de la empresa. |
| AI Engineer | IA en el flujo. |
| Security Engineer | Roles, acceso privado, IA en el flujo, aprobaciones, datos reales, impacto alto o requisitos de la empresa. |
| QA Engineer | Continuidad, impacto alto, y siempre antes de declarar algo conectado. |
| DevOps Engineer | Se va a publicar o se guarda algo que no se puede reconstruir. |
| Data Engineer | Datos que cambian, sistemas existentes, aprobaciones o datos reales. |
| Product Analyst | Contenido público, continuidad, responsable, o una pregunta concreta que medir. |
| Legal & Privacy | Datos reales de personas, financieros o confidenciales, o IA que procesa contenido de personas. |
| FinOps | IA en cada interacción, o un límite de plan cerca. |

Las señales están definidas, por nombre, en el Stack de referencia 30X. Las herramientas las elige el stack, no este documento. Para cada pieza el arquitecto entrega: necesidad, estado actual, decisión (AHORA, DESPUÉS, NO APLICA), riesgo y responsable, y la prueba que lo confirma.

## Qué no cubre

Qué herramienta usar y con qué controles → Stack de referencia 30X. Los prompts y los pasos de trabajo → el paso a paso del curso. Qué significa cada término → 04 · Vocabulario maestro.
