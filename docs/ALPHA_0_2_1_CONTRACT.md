# Alpha 0.2.1 — contrato ejecutable para Sol

Decidido por Astra el 2026-09-14. **Diseño cerrado; runtime y recursos 0.2.1 todavía no implementados.** Base: Alpha 0.2.0 RC2 aceptada operativamente. ADR-017–019 resuelven las extensiones de ADR-012–016. Los documentos de 0.2 siguen siendo regresiones, no órdenes de volver a RC1.

## 1. Resultado jugable y alcance

En Cubiertas C1/C2/C3, un jugador llega al timón y solicita interactuar. El DM arbitra en mesa, elige Supera/sujetado o Falla/cae, previsualiza dónde dejar la pieza y confirma. El timón desaparece de su soporte y aparece una única pieza separada en el destino. El DM puede trasladarla, girarla, dañarla y romperla. Los restos se ven y permiten pasar. Deshacer restaura el objeto sólo si la situación actual lo permite.

La escena Prueba de objetos conserva puerta/caja: se corrige la perspectiva de la puerta y se añaden daño y destrucción preparados a ambos objetos. La puerta rota libera el hueco; la caja rota libera su paso. Esto da significado al caso «romper puerta» ya previsto en el roadmap 0.3, sin crear una cuarta escena artística.

Dados, CD, daño aplicado y consecuencias narrativas siguen siendo decisión del DM. No añadir combate, tirada digital, empuje, transporte atado al PJ, inventario de objetos, estados ambientales, IA ni disco. «Sujetado» significa pieza separada depositada bajo control del grupo: no añadirla automáticamente a mochila ni hacer que siga a Mike. Explicar esta adaptación en la ayuda DM. Pedir mover/romper puerta/caja sigue siendo verbal; la solicitud digital de esta versión es la del timón existente. Generalización de intenciones: 0.5.

## 2. Un solo estado y capacidades cerradas

Extender la unión discriminada actual de tipos. No ECS, evaluador de scripts ni diccionario arbitrario de propiedades. Todas las definiciones son datos compilados al arrancar; cliente nunca envía tipo, capacidad, sprite ni huella.

Identidad de objeto: par `(sceneId, objectId)`. Introducir el timón en `SceneObjectState.objects`; eliminar `wheelStates` como almacén independiente. Un getter de compatibilidad puede derivar el valor, nunca escribir por fuera de la transacción común. Cada runtime guarda definición por ID y una instantánea mutable discriminada, además de un `version` interno monótono por objeto para invalidar solicitudes.

Definición común: id, kind, label, assetId obligatorio, sourceKind/sourceRef públicos revisados, celda/rotación inicial, baseFootprint normalizada y allowedRotations; `capabilities: { transform: boolean, detach: boolean, structure: boolean }` estricta. Las capacidades son límites máximos de definición, no permisos del jugador. Matriz legal en esta versión:

| Tipo | transform | detach | structure | Estado mutable |
|---|---|---|---|---|
| door | false | false | true o false | cell/rotation fijas, state open/closed/locked, structure intact/damaged/destroyed |
| crate | true | false | true o false | cell/rotation, structure intact/damaged/destroyed |
| wheel | true | true | true o false | cell/rotation, attachment attached/detached, structure intact/damaged/destroyed, state upright/caught/fallen |

Door y crate no tienen attachment ficticio. Si structure=false, sólo intact es legal. Las tres piezas de demostración habilitan structure. Caja conserva [0,90]; son dos huellas distintas, no un fallo de giro. Timón separado usa [0,90,180,270] con variantes dibujadas y huella 1×1 en las cuatro orientaciones. Se elige una casilla (1,5 m) porque la rueda cabe en ella; no inflar su volumen para demostrar giro.

El timón añade `mount: { cell, footprint, assetId }`, un soporte fijo 1×1; `cell` inicial coincide con mount.cell y rotation inicial es 0. El soporte tiene su propio recurso y no es otro objeto seleccionable. No puede separarse, dañarse ni destruirse. Su huella fija queda fuera del suelo transitable como ahora y es una reserva de ubicación explícita en todas las fases. Sólo el propio timón attached puede coincidir exactamente con su soporte. No inferir esa excepción de kind ni de un literal de campaña.

El timón usa inicialmente attachment=attached, structure=intact, state=upright. Su baseFootprint es [{col:0,row:0}]. Structure dañada no altera huella. No existe attached+destroyed: para destruir la rueda se separa primero. El soporte vacío queda visible después, sin resucitar la rueda del fondo.

## 3. Tabla completa de transiciones

| Acción | Precondición | Resultado / error |
|---|---|---|
| Separar | wheel attached, intact o damaged | detached, destino válido elegido, state caught o fallen; conserva structure |
| Separar de nuevo | wheel detached | INVALID_TRANSITION, no mover implícitamente |
| Recolocar/girar | crate o wheel detached, structure no destroyed | Nueva celda/rotación; iguales -> NO_CHANGE |
| Mover wheel attached | cualquier integridad | OBJECT_ATTACHED |
| Dañar | structure habilitada e intact | damaged, misma huella, nueva variante |
| Dañar otra vez | damaged | NO_CHANGE |
| Romper | intact o damaged; wheel ya detached | destroyed, misma ubicación visual, bloqueo vacío |
| Romper otra vez | destroyed | NO_CHANGE |
| Dañar/mover restos | destroyed | INVALID_TRANSITION |
| Abrir/cerrar/bloquear | door no destroyed | Semántica RC2, incluyendo DOOR_LOCKED |
| Cambiar puerta rota | destroyed | INVALID_TRANSITION, no «reparar» con Abrir/Cerrar |
| Reparar/reunir | sin acción directa | Sólo Deshacer validado dentro del historial disponible |

Romper una puerta guarda su state anterior en servidor (incluido locked) para undo; el público ve la variante destroyed y state=open, nunca locked. No generar daño numérico ni activar encuentros. Caer no implica destroyed. El DM puede escoger separar directamente sin solicitud, con la misma previsualización y validadores.

## 4. Huellas y validación común

Crear funciones puras en `engine/shared/objects.ts` (o extensión pequeña de geometry.ts) que calculen geometría y validen una propuesta sobre datos autorizados. Usarlas desde compilador, movimiento, teleport, servidor y preview DM. No mantener una tercera interpretación en `dm.ts`.

- `locationCells`: huella normalizada, girada y trasladada; incluye restos y marcos abiertos. Sirve para selección y evita colocar otros objetos encima.
- `blockingCells`: ubicación para crate/wheel no destruidos y puerta cerrada/bloqueada; vacía para restos y puerta abierta. El soporte permanece bloqueado por terreno y por su reserva fija.
- Restos: atraviesan actores, no se recolocan ni se borran en 0.2.1; conservan su huella de ubicación. Representarlos como astillas bajas, no como una pared que visualmente parezca sólida.
- Para wheel attached validar coincidencia exacta con mount, aun siendo celda excluida de walkable. Es la única excepción al requisito de suelo. Nunca permitirla en un destino detached ni en caja/puerta.
- Toda otra propuesta necesita suelo de su escena/superficie, límites válidos, sin spawns, sin ubicación de otros props/restos/marcos ni soporte. Sólo excluir de la comparación el objeto que se está editando; su mount no se excluye al separarlo.
- Ninguna nueva celda bloqueante puede cubrir un PJ quieto o desconectado, origen ni destino de un paso vivo, o criatura visible de la escena/superficie. No consultar criatura oculta. Abrir/destruir retira bloqueo y puede ocurrir mientras un actor cruza; no rechazarlo sólo porque haya un actor en celdas que quedarán transitables.
- La criatura runtime debe identificar también sceneId, actualizado en teleport; filtrar por escena Y superficie al reservar/serializar. No asumir que surfaceId es globalmente único. El DM sólo obtiene reservas visibles de la escena que está editando.
- Validar la propuesta final completa antes de modificar nada; callback sin await. No hay barrido de arrastre, ni empujar personajes, ni cancelación de pasos para hacer sitio. El movimiento y teleport posteriores usan los bloqueos actuales de TODOS los tipos, incluido el timón.

Conservar los cuatro casos de ruta de `alpha-0.2-objects.json`. El nuevo fixture `alpha-0.2.1-objects.json` añade transiciones, restos y soporte sintético; comprueba geometría propuesta, no funcionalidad futura. Para cubierta: mantener grid32×21, tile48, origen(0,8), spawns y todas las celdas existentes; soporte (3,8) continúa excluido. Destino sugerido para separar (4,8), 0°, válido sólo si está libre al aplicar. Si Mike está ahí, rojo: elegir otra celda. No elegir silenciosamente el «primer hueco libre».

## 5. Protocolo, compatibilidad y privacidad

Conservar `PROTOCOL_VERSION=3` y campos canónicos `commandId`, `sceneEpoch`, `objectRevision`. La extensión cambia semántica del timón: añadir `objectModelVersion:1` obligatorio al auth de los tres clientes y al WorldSnapshot. Un RC2 v3 sin esa capacidad, o un valor distinto, recibe PROTOCOL_MISMATCH antes de reclamar/controlar. Actualizar todos los probes. Así no se deja que un cliente antiguo use botones con semántica incompatible dentro del mismo v3.

El DTO de campaña pasa a `schemaVersion:2` por las nuevas definiciones requeridas. Error de manifiesto visible en las tres entradas («La aplicación se ha actualizado; recarga»), también antes de conectar. No dual runtime. Migrar pack y fixtures TypeScript del repositorio; versión 1 no se acepta silenciosamente. No cambia formato de guardado en disco porque aún no existe.

Comandos nuevos/extendidos, schemas estrictos y exclusivos de DM:

| type | Campos además de commandId/sceneEpoch/objectRevision |
|---|---|
| object:detach | objectId, cell, rotation, outcome: caught/fallen |
| object:structure | objectId, structure: damaged/destroyed |
| object:transform | objectId, cell, rotation; ahora también wheel detached |
| object:door | Sin cambio de campos; exige puerta no destruida |
| object:undo | entryId; común a todas las mutaciones de objetos |
| resolveInteraction | requestId, result: cancelled O caught/fallen; caught/fallen exige cell y rotation; cancelled los prohíbe |

`resolveInteraction` pertenece ahora al dominio de objetos y exige CAS incluso al cancelar. Reutiliza el mismo reducer de separación que object:detach. Retirar la rama de escritura directa de `wheel`: el antiguo comando queda fuera del schema (INVALID_COMMAND), sus botones directos se sustituyen por selección, Separar y Deshacer. Se conserva el recorrido del timón y la elección Supera/Falla; no se conserva una vía que salte ocupación/CAS.

Todos esos ACK válidos llevan `{commandId,ok,code,sceneId,sceneEpoch,objectRevision}`; mantener los códigos de RC2 y añadir OBJECT_ATTACHED, INVALID_TRANSITION, CAPABILITY_UNAVAILABLE, REQUEST_STALE. Ante error de schema, INVALID_COMMAND no refleja payload ni detalles privados. Permisos se comprueban por socket autenticado, no por type.

Caché: mismo ámbito DM autenticado/dominio objetos/UUID para separar, transformar, estructura, resolve y undo. Fingerprint canónico tras parseo estricto, antes de CAS, máximo1000/TTL10min. Mismo UUID/payload devuelve ACK original; payload distinto COMMAND_ID_REUSED; no duplicar sonido, petición ni historial. El DM compartido actual usa una credencial común; varias pestañas compiten por la misma revisión, no son identidades distintas.

Cada mutación efectiva del objeto y cada undo incrementa una sola vez objectRevision de escena, world.revision y version interno del objeto. NO_CHANGE/rechazos no los cambian. Cancelar solicitud sólo cambia su estado privado: no crea entrada ni cambia revisión de objetos/mundo. Tras STALE_OBJECTS/REQUEST_STALE devolver dm:state fresco; nunca reaplicar borrador automáticamente.

PublicProp contiene sólo identidad pública, assetId, cell/surfaceId, rotation, footprint de offsets base, structure y campos visuales de su tipo. Timón: attachment y state son visibles. Puerta: locked se filtra como closed; destroyed se muestra como open+destroyed. Soporte procede de la definición pública. Capabilities son autoría pública sin CD/notas. DmObject añade estado de cerradura y acciones permitidas; contador, solicitudes y undo sólo DM. No servir el runtime por spread.

Cerrar también el caso de semilla privada: schema público de door.initialState admite sólo open/closed. Añadir al bundle privado un override opcional `doorStates: Record<sceneId, Record<objectId, open|closed|locked>>`, validado contra puertas existentes; el compilador aplica el override al runtime sin modificar el DTO. Prueba con puerta inicialmente locked y marcador privado en notas. Esto evita publicar locked por /api/campaign aunque el snapshot lo filtre. Nunca mover notas de aventura o motivos de tirada a los catálogos de sprites, títulos, manifest público o errores.

## 6. Solicitud del jugador y decisiones en mesa

Mantener `player:interact {commandId,sceneEpoch,targetId}`. Sólo el controlador activo, con scene:ready y sin paso, en celdas autorizadas del timón attached puede pedir. Comprobar también superficie; tras separar o romper, canInteract=false y el móvil deja de pedir acercarse al soporte vacío. No mostrar a otro jugador el resultado privado de Mike.

Internamente la solicitud vincula sceneId/epoch, targetId, version de objeto y sesión propietaria. Esos campos internos no se envían al público ni como token en dm:state. DM recibe sólo id, objetivo/etiqueta, personaje, fecha, estado y motivo breve autorizado. Hasta200 solicitudes en memoria, una pendiente por personaje/objetivo; eliminar resueltas antiguas primero y rechazar INTERACTION_LIMIT si no cabe sin eliminar pendientes. Caducidad de pendientes:120s; usar reloj de servidor y probar con tiempo controlado.

Cualquier mutación/undo del objetivo cancela las solicitudes pendientes anteriores (incluidas las de otros PJ); la que está resolviéndose se marca resolved en el mismo commit. Alejarse, iniciar paso, perder controlador, liberar, desconectar, cambiar escena o caducar cancela pendientes del PJ afectado. Undo no las revive. Al resolver se revalida sesión, versión, estado attached, proximidad y ausencia de paso: REQUEST_STALE si cambió. No basta con que la petición siga en una lista.

Flujo DM: pulsar Supera o Falla abre un borrador con ese resultado y la pieza separada. Seleccionar destino en mapa, Girar, Aplicar, Cancelar. Cancelar borrador no resuelve la solicitud; un botón distinto «Cancelar solicitud» envía result=cancelled. Cuando se rechaza destino ocupado, la solicitud queda pendiente si sigue vigente. Todos los cambios y avisos llegan después del commit. CD y notas existentes se leen sólo en DM; no escribir en documentación pública consecuencias de aventura privadas.

El sonido de caída sigue siendo manual con los tres SFX existentes. No exigir uno nuevo ni disparar SFX al aplicar daño/undo; el audio contextual corresponde a 0.6. Se preserva el sistema de capas y el backlog de calidad de muestras.

## 7. Deshacer y futuras partidas guardadas

Una sola pila LIFO por escena, máximo50, para puerta/caja/timón, incluyendo separación originada en una solicitud. Entrada: entryId/objectId/label y before/after de instantáneas mutables discriminadas completas, sin definitions, sockets, sesiones, contadores ni historial de solicitudes. Comprobar que el estado actual corresponde a after antes de invertir (UNDO_STALE si no coincide). Una solicitud resuelta nunca vuelve a pendiente al deshacer.

Revalidar before con ocupación actual. Deshacer destrucción de caja/puerta puede fallar porque Mike está sobre sus restos: OCCUPIED_CELL, pila conservada. Deshacer separación restaura sólo el timón al soporte y quita su pieza detached; nunca restaura todo el mundo. Validar attached con la excepción exacta del mount. Deshacer no decrementa version ni revisiones.

Cambiar escena conserva objetos, estados y pila durante el proceso. No claves por objectId global como wheelStates; probar IDs iguales en escenas distintas. En 0.3 se guardarán IDs y snapshots mutables canónicos; los índices de colisión se recalcularán desde definición. Este contrato no decide persistir undo ni sesiones, no implementa SQLite/JSON ni promete recuperación tras reinicio.

## 8. Arte y cámara: encargo concreto

Conservar inclinación runtime actual `scaleY/scaleX=0.92`, cuadrícula y orientación. El 0.875 de la primera propuesta era un valor inicial; cambiar toda la cámara no arregla un sprite frontal. Usar nearest y variantes dibujadas; nunca rotar un PNG oblicuo con sprite.rotation para fingir orientación del mundo.

Crear archivos nuevos bajo `/art/objects-v3/`, con manifiesto y condiciones. No sobrescribir los v2 ni el fondo original; URLs nuevas evitan caché immutable. Usar ImageGen/skill para generar y editar raster. No presentar borradores de arte como recursos aprobados. El usuario puede usar RC2 mientras se prepara la candidata.

| Recurso | Tamaño lógico / ancla en centro de huella | Variantes obligatorias |
|---|---|---|
| wreck-deck-clean-v3.png |1536×1024, origen(0,0) | Fondo original editado localmente: quitar rueda, pedestal y sus sombras horneadas; reconstruir tablones; sin cambiar casco/escaleras/mástil/mar |
| wheel-mount-v3.png |48×48, .5/.5 | Soporte vacío bajo, fijo en centro(168,416) de celda(3,8); acotado a su huella |
| wheel-attached-*.png |48×64, .5/.75 | intact/damaged; montado sobre soporte, vista desde arriba con ligera inclinación |
| wheel-caught-*.png |48×64, .5/.75 | intact/damaged × 0/90/180/270, pieza apoyada bajo control del grupo |
| wheel-fallen-*.png |48×48, .5/.5 | intact/damaged × 0/90/180/270, pieza tumbada |
| wheel-debris-*.png |48×48, .5/.5 |0/90/180/270; astillas y aro roto bajos; puede reutilizarse arte simétrico si está registrado explícitamente |
| door-*.png |48×48, .5/.5 | intact-closed/open, damaged-closed/open, destroyed; cabe en celda(6,4) |
| crate-*.png |96×48 o48×96, .5/.5 | damaged y destroyed × 0/90; conservar intact v2 si encaja |

Dimensiones de archivo pueden ser múltiplos enteros. Mantener dimensiones y anclas lógicas, transparencia real, sombra de contacto sin invadir una casilla vecina sólida. Registrar claves de catálogo: wheel `attached:<structure>` o `detached:<state>:<structure>:<rotation>`; destroyed `debris:<rotation>`; door `<structure>:<open|closed>` y `destroyed`; crate `<structure>:<rotation>`; soporte `default`. Verificar todas al compilar y eliminar el fallback silencioso a la primera variante en objetos preparados.

Inspección del fondo real: el timón pintado actual está aproximadamente en rectángulo x150–240/y290–405; la celda lógica (3,8) corresponde a x144–192/y392–440. Hay desalineación entre dibujo y estado. Editar la región visual antigua y colocar soporte/sprite nuevos en la celda lógica, conservando la navegación aceptada. Estas cotas son guía de inspección, no una máscara exacta: Sol debe verificar la imagen resultante y no cubrirla con un rectángulo opaco.

Puerta: hoja alineada norte-sur con el tabique en col6 y tránsito este-oeste por fila4; mostrar borde superior/grosor y caras escorzadas. Abierta deja centro legible. La imagen actual del tabique está aproximadamente x288 (límite entre col5/6) y su hueco alrededor y180–230, mientras la celda lógica es x288–336/y192–240. Si el sprite no puede encajar en ese hueco, crear `wreck-objects-room-v3.png` ajustando sólo marco/tabique al fixture; no modificar coordenadas de puerta/rutas para acomodar el dibujo. Verificar la alineación en el renderer, no sólo abriendo el PNG.

Soporte y rueda son vistas distintas bajo el mismo propietario. Attached dibuja ambas; detached y destroyed dibujan soporte fijo+pieza en su sitio actual. Actualizar por ID/variante y no recrear containers a20Hz. Ordenar piezas por punto de contacto; restos y sombra por debajo de actores, rejilla/aros legibles. Una etiqueta de resultado no sustituye el sprite roto.

## 9. Editor: correcciones necesarias al ampliar RC2

Por inspección del código actual, no por una nueva prueba física: `dm.ts` no invalida draft al recibir nueva objectRevision/conexión; command() toma la revisión más reciente aunque el borrador sea anterior. draftValid omite step.from; world.showPreview dibuja sólo celdas. Corregir en este bloque antes de incorporar separación/destrucción.

Capturar `{connectionGeneration,sceneId,sceneEpoch,objectRevision}` al crear borrador y usar esa revisión al enviar. Cancelarlo y limpiar renderer al desconectar/reconectar, cambiar selección/escena o recibir otra revisión. Deshabilitar edición/envío offline, sin cola Socket.IO. No reinstalar latestSnapshot de conexión anterior como si fuera fresco. ACK tardío se correlaciona con commandId/generación; no borra otro borrador ni habilita control nuevo.

Añadir step a los datos de actor de DM o un DTO DM de reservas derivado en servidor; no inferir liberación con reloj local. Caminar actualiza validez, conservando destino y orientación; descartar sólo por cambios de objetos/escena/conexión. Criatura visible debe pertenecer a la superficie y escena editadas. Restos y soporte participan correctamente en preview de ubicación.

Borrador incluye sprite semitransparente de la variante final y huella verde/roja, sólo en capa local DM. Daño/destrucción también tienen Aplicar/Cancelar; no actuar al elegir «Romper». Acciones españolas por capacidad/estado, motivo si bloqueadas. Peticiones y campos enfocados no se reconstruyen cada snapshot. Map click usa transformación inversa existente.

## 10. Matriz de aceptación de Sol

Cada fila es obligación verificable, no PASS heredado. Mantener resultados RC2 como históricos.

| ID | Automatización exigida |
|---|---|
| T01 | Compilar pack2 y bundle sintético sin timón/encuentro; rechazar capacidades ilegales, attached+destroyed, footprint/rotación/variante ausentes, montura incorrecta, overrides privados inválidos. Dos escenas con mismo ID local independientes. |
| T02 | Separar attached una vez: destino, soporte, estructura conservada, bloqueo actual y revisiones+1; fallo destino conserva TODO. No rueda fantasma lógica. |
| T03 | Cuatro giros wheel con huella1×1; caja0/90; sólo detached se transforma; NO_CHANGE sin entrada. |
| T04 | Tabla de structure completa para tres tipos; daño no abre paso, destroyed sí; puerta locked destruida no filtra estado; restos siguen reservando ubicación. |
| T05 | Reservas a0/150/299/300ms, PJ desconectado, actor destino y origen, teleport, spawns, mount, puerta abierta y restos. Oculta no cambia resultado; visible sí sólo en superficie actual. Ambos órdenes paso/edición. |
| T06 | Undo separación/daño/destrucción/movimiento; undo reconstrucción ocupado no consume pila; LIFO50, escena ida/vuelta, version nunca retrocede y solicitudes no reviven. |
| T07 | Sockets DM reales: dos revisiones iguales sólo un éxito; retry idéntico, UUID distinto payload entre tipos, rechazo cacheado, stale, NO_CHANGE. Nuevos comandos y resolve comparten dominio; ACK contextual siempre. |
| T08 | Solicitud real a pie: pending->preview sin cambio->caught/fallen+destino atómico; cancelar borrador/solicitud distintos. Lejanía, paso, desconexión, release, controlador reemplazado,120s y otro DM invalidan; petición resuelta no duplica. |
| T09 | Player/Projector intentan TODOS los comandos nuevos y undo; nunca mutan. /api/campaign, snapshot, assets, build y cliente tardío sin notas/CD/locked privado/solicitud/historial; probar semilla locked privada. |
| T10 | Handshake v3 antiguo sin objectModelVersion rechazado; schema1 visible como incompatible. Reconexión y assets demorados no restauran props/preview antiguos, tampoco tras reset de contadores de servidor nuevo. |
| T11 | Navegador DM: seleccionar, preview con sprite, giro, aplicar/cancelar/Escape, deshacer y stale de otro DM. Caminar mantiene destino y recalcula origen/destino; offline cancela borrador y no encola. |
| T12 | Navegador tres roles a390×844/844×390/1920×1080: puerta alineada, variante de daño/restos clara, soporte vacío único, cuadrícula legible, consolas limpias, actualizaciones sin flicker. |
| T13 | Regresión O01–O12/R01–R12 y baseline: aproximación inmóvil, dos PJ, joystick/WASD, rueda a pie, permisos, PG/inventario, mochila, criatura, cámaras, release/reclaim, audio/capas/3SFX. |

Typecheck, tests unitarios, build, auditorías baseline/alpha02 e integraciones general/objetos + nueva de0.2.1. Servidores propios en loopback/puerto libre y cierre en finally; respetar la mesa3000. Los runners actuales seleccionan puerto libre pero apps/server escucha0.0.0.0: añadir HOST configurable para pruebas, con valor por defecto0.0.0.0 del lanzador LAN y HOST=127.0.0.1 en runners; comprobar dirección efectiva.

Prueba física al terminar candidata: Pixel9a/Chrome en dos orientaciones, MSI/proyector1080p; pedir timón, resolver/colocar, girar, romper, atravesar restos, intentar deshacer con ficha encima, apartarla y deshacer, Wi-Fi ida/vuelta, puerta corregida y regresión breve. Registrar cada respuesta concreta; un «todo lo demás perfecto» es confirmación general, no prueba aislada de casos no descritos. No exigir repetir RC2 ahora. Métricas y30min se registran separadas si se realizan; no inventar valores ni rebajar umbrales.

## 11. Orden y entrega

1. Verificar hash/copia RC2; conservarla y el servidor activo. Archivar prompt anterior.
2. Tipos/capacidades/compilación y geometría común; escribir pruebas de transiciones y ocupación.
3. Reducer único, historial, solicitudes y protocolo, permisos y compatibilidad.
4. Recursos nuevos y editor completo; corregir los huecos identificados y probar tres vistas.
5. Ejecutar matriz, preparar `0.2.1-rc.1` completa (package, catálogo y banner coherentes), backup nuevo por hash, guía Windows/física, licencias, aceptación y PROJECT_STATE.

No aumentar versión del código durante el diseño. No entregar una0.2.1 con rectángulos de reemplazo o comandos sin UI. Sol cierra los fallos locales sin otro traspaso; Astra sólo si surge contradicción transversal no resuelta por este contrato. Tras candidata completa se solicita su prueba física, luego Astra diseña persistencia0.3. No iniciar0.3 aquí.
