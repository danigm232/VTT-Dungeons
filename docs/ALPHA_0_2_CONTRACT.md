# Alpha 0.2 — contrato de implementación

Decidido por Astra el 2026-09-13. Estado vigente 2026-09-14: **RC2 implementada y aceptada operativamente**. La auditoría histórica RC1 reproducía siete fallos posteriormente corregidos. Este contrato queda como referencia de regresión; la extensión 0.2.1 está en [ALPHA_0_2_1_CONTRACT.md](ALPHA_0_2_1_CONTRACT.md). Las órdenes finales de implementar RC2 ya se completaron y no sustituyen el encargo activo de NEXT_MODEL_PROMPT.

## 1. Entrega jugable

El DM selecciona una puerta, la abre y un jugador la cruza. Cerrada vuelve a impedir el paso. El DM selecciona una caja, ve una previsualización privada, la mueve o gira por casillas y aplica o cancela. La caja cambia la ruta para todos. El DM puede deshacer la última operación de objetos si el destino sigue siendo válido. Reconectar devuelve el estado completo actual.

Se conservan Aproximación, Cubierta C1/C2/C3, timón, criatura, PG, mochila, control individual, cámaras, audio y lanzadores Windows. Alpha 0.2 añade una tercera escena **«Prueba de objetos del pecio»**, indicada como añadido de demostración en el DM. No representa C4 ni introduce un cofre o tesoro oficial. No sustituye el fondo ni las colisiones de la cubierta aceptada.

No incluye inventario de la caja, empuje automático del jugador, combate, editor general, persistencia en disco, destrucción ni timón separable. Los jugadores solicitan al DM estas nuevas acciones verbalmente; INTERACTUAR con el timón conserva su flujo. La puerta no se abre por cercanía ni mediante una tirada automática.

## 2. Escena concreta y recursos

La geometría verificable está en `docs/fixtures/alpha-0.2-objects.json`. Coordenadas cero-based: 12 columnas × 9 filas, superficie `objects-deck`. Suelo transitable en columnas 1–10 y filas 1–7, excepto tabique en columna 6 con un único hueco en fila 4. Puerta de 1×1 en (6,4), inicialmente cerrada. Caja de 2×1 en (3,4), orientación 0°. Spawns en (2,4), (2,5), (3,5). Reservar estos spawns contra objetos.

Validación de diseño ejecutada por Astra: parseo JSON, recorrido cardinal por búsqueda en anchura, huella rotada y separación de spawns/marco. Los cuatro resultados del fixture coinciden: cerrado=false, abierto=true, caja bloqueando=false, caja restaurada=true. Esto verifica la geometría propuesta, no el futuro runtime ni el arte. Comprobador local de esta sesión: `tmp/check-alpha02-design.mjs` (temporal, fuera de distribución).

Con la puerta abierta existe ruta de (2,4) a (8,4). Una caja en (5,3), girada 90°, ocupa (5,3) y (5,4) e impide alcanzar el umbral desde la sala izquierda. Volverla a (3,4), 0°, restablece la ruta. No se necesita un algoritmo de pathfinding en producción: esta ruta es un criterio de prueba.

Crear un pequeño interior de madera deteriorada, tabique legible, luz y detalles salinos coherentes con las referencias. Fondo limpio sin puerta ni caja pintadas; sprites PNG transparentes separados: puerta abierta/cerrada y caja horizontal/vertical. El hueco de puerta siempre pertenece al suelo base. La puerta abierta conserva marco visible pero no colisión de paso. Su hoja dibujada cabe en la celda para no representar una casilla vecina falsamente ocupada.

Grid inicial 48 píxeles lógicos, origen (0,0), fondo 576×432; densidad y escala coherentes con fichas existentes y compresión vertical actual. No cambiar la proyección del baseline durante este bloque. El detalle de arte puede usar mayor resolución de archivo manteniendo las mismas coordenadas lógicas. Cada sprite declara tamaño lógico y anclaje; rotar la caja cambia su huella y selecciona su variante dibujada, no gira el PNG de una vista inclinada como si fuera una imagen plana.

Recursos originales mediante ImageGen y su skill, o recursos externos con origen/licencia exacta verificados. Fondo y sprites deben verse antes de aceptarlos: sin damero horneado, fondos opacos, caja fantasma ni duplicado bajo el objeto. Registrar todos en el manifiesto y créditos; no declararlos CC0 por ser generados. Si hay que editar una imagen, seguir la herramienta/skill de imagen disponible. Usar nombres nuevos de assets para evitar la caché `immutable` del baseline.

## 3. Pack inyectado y fronteras

Mover los tipos de campaña, `SceneDefinition` y `cellKey` al engine. `SceneId` pasa a cadena con formato y longitud validados, y pertenencia comprobada en el catálogo inyectado; eliminar el enum de dos escenas. No evaluar código del pack ni admitir plugins arbitrarios.

Separar tres representaciones:

| Representación | Contenido y consumidor |
|---|---|
| `PublicCampaignDefinition` | schemaVersion 1, campaignId/version, título público, initialSceneId, escenas públicas, roster público, catálogo de tokens/props/audio por assetId. JSON serializable; arrays de celdas, no Set/Map. |
| `CampaignServerBundle` | Definición pública + semillas de PJ/criatura, escena de encuentro, notas y parámetros del timón, semillas/privados de objetos. Sólo composición del servidor. |
| `GameState` | Copias mutables por escena y sesión; índices de navegación compilados en Set/Map. No mutar las definiciones ni devolver referencias runtime. |

`apps/server/index.ts` importa el bundle Stormwreck y los directorios públicos permitidos y construye `new GameServer(io, dmSessionToken, bundle)`; éste construye `new GameState(bundle)`. No quedan imports de `campaigns/` ni nombres/coordenadas de Stormwreck en `engine/`, incluyendo navigation y tests genéricos. Pruebas de campaña pueden residir bajo `campaigns/` o recibir fixtures desde su composición.

El servidor expone `GET /api/campaign` con el DTO público explícito, validado al arrancar. No servir el bundle ni hacer spread de semillas privadas. Las tres entradas web cargan este manifiesto antes de inicializar el renderer/conectar; `WorldRenderer(host, publicDefinition)` recibe datos. Se permite `apps/web/campaign.ts` como cargador común. DM llena el selector de escenas desde el catálogo. Renderer no elige por literal `wreck-deck`, `harpy`, `wizard` o por nombre de personaje.

También parametrizar en datos el título, el encuentro único opcional y su escena, target/celdas del timón, estados permitidos/notas y catálogo de audio. El motor puede conservar una capacidad genérica `wheel` y un encuentro opcional; no implementar un lenguaje de reglas. El cliente de audio recibe URLs de su catálogo, conservando los tres canales SFX y capas existentes. Descripciones de CD y consecuencias privadas sólo viajan en `dm:state` autenticado.

Validar con Zod instalado: IDs únicos en su ámbito, escenas referenciadas existentes, dimensiones/celdas enteras acotadas (hasta 256×256), spawns válidos, refs de assets existentes, huellas no vacías sin duplicados, orientaciones permitidas, semillas en su superficie y sin colisiones iniciales. Errores detallados en consola local y arranque fallido. Como máximo 100 objetos por escena, huellas de hasta 16 celdas. No usar rutas de archivo recibidas de clientes. Assets bajo `/art/` y `/audio/`; metadatos privados fuera de esos directorios.

Demostrar inyección con un bundle sintético pequeño de IDs distintos, sin timón ni criatura; iniciar el mismo GameState/GameServer y probar snapshot, escena, movimiento y objeto sin editar el engine. No hace falta crear una segunda campaña artística.

## 4. Objetos y serialización

No migrar todos los actores a ECS. Conservar `entities` para PJ/criaturas y extender `props` mediante unión discriminada. Identidad estable, tipo y definición se crean en servidor; ningún comando acepta sustitución de tipo, asset, propiedad arbitraria o script.

Campos comunes de `ObjectDefinition`: `id`, `sceneId`, `surfaceId`, `kind`, `label`, `assetId`, `baseFootprint: Cell[]` de offsets normalizados, `allowedRotations: (0|90|180|270)[]`. Los offsets tienen mínimo col=0 y row=0. `sourceKind: 'addition'` y referencia de autoría se registran en la definición del escenario/manifiesto, sin fuente privada servida.

Estado runtime por tipo:

- Puerta: ancla/orientación fija; `state: 'open'|'closed'|'locked'`. El bloqueo impide Abrir; DM puede cambiar a cerrada para desbloquear y abrir después. Estado inicial cerrada. Huella de ubicación 1×1 siempre; huella bloqueante vacía sólo abierta.
- Caja: `cell` y `rotation` mutables; ocupa y bloquea toda la huella rotada. No estados de inventario ni daño ficticios.
- Timón: mantener sus tres estados y comandos existentes, con ID/escena/celdas desde el pack. Su separación se pospone a 0.2.1; el fondo horneado existente queda identificado como limitación previa.

`PublicProp` permite sólo id/kind/label/cell/surfaceId/assetId/rotation/huella visual y estado visual permitido. Una puerta bloqueada se serializa como **cerrada**: el cerrojo y notas se conocen sólo en DM. `DmState` agrega objetos de la escena con estado completo, notas por lista permitida, `objectRevision` y `undo: {canUndo, label, entryId}`. No incluir credenciales ni caché/historial interno.

Los dos objetos nuevos son siempre visibles. No implementar ocultación de objetos sólidos en 0.2. Criaturas ocultas siguen ausentes del snapshot/foco y **no participan** en colisiones ni reservas de movimiento/edición; tampoco provocan errores que permitan detectarlas. Revelar sobre un PJ no lo desplaza. Actores comparten casillas como en la exploración del baseline; la edición de objetos sí respeta actores visibles para no cubrirlos.

## 5. Geometría y autoridad

Separar `terrainWalkable` de los bloqueos de props y usar la misma función pura para movimiento, teleport, preview y validación de objetos. La huella rotada se traslada desde la esquina superior izquierda de su bounding box. Para 90° horario: `(x,y) -> (H-1-y,x)`; repetir para 180°/270°. Se conservan coordenadas enteras y superficie única por celda; pisos superpuestos quedan fuera.

Antes de colocar/girar caja o cerrar/bloquear puerta, validar TODA la huella propuesta:

1. Mismo sceneId/surfaceId, límites, suelo base y tipo/rotación permitidos.
2. Sin intersección con huella de ubicación de otro objeto, incluyendo puerta abierta, ni obstáculos fijos. Excluir únicamente el objeto editado de este cálculo. Una caja no puede colocarse dentro del marco abierto.
3. Nuevas celdas bloqueantes sin PJ presente, conectado o desconectado, ni criatura visible en esa escena. Un paso en curso reserva **origen y destino** hasta su finalización. El baseline ya pone `character.cell` en destino al empezar: no basta con comprobar ese campo.
4. Sin bloquear spawns declarados, para volver a entrar en la escena con objetos conservados. Abrir puerta elimina colisión y se admite incluso si su hueco está siendo cruzado.

Movimiento cardinal y teleport de actores comprueban terreno y huellas bloqueantes actuales; no reservan celdas contra otros actores, conservando apilamiento. Soltar, desconectar o abrir mochila conserva el paso ya autorizado hasta su final y corta el siguiente. No cancelar un paso para hacer caber un objeto.

La acción DM de mover caja es **recolocación discreta**, sin física de arrastre ni barrido por celdas intermedias: sólo se valida destino y se indica así en su ayuda. Rechazar solapamientos, no resolverlos empujando fichas. Cerrar puerta puede separar voluntariamente habitaciones; no implementar una regla global que exija que todo el mapa permanezca conectado.

Las operaciones se validan y confirman sin `await` dentro del mismo callback del servidor. Orden: si empezó antes un paso, su reserva impide cerrar; si primero se cerró, el nuevo paso se rechaza. Ningún cliente modifica el mundo por su preview.

## 6. Protocolo v3, revisiones y confirmación

Subir `PROTOCOL_VERSION` a 3 al implementar; la versión del pack sigue siendo independiente. Incluir `protocolVersion:3` en auth Socket.IO de las tres vistas y exigirlo antes de reclamar personaje o aceptar comandos. Un valor ausente/v2 produce `auth:error {code:'PROTOCOL_MISMATCH'}` y desconexión; cliente nuevo muestra «Actualiza esta página para continuar». No controlar con cliente viejo. Actualizar HTML con cache revalidable, todos los clientes y probes de integración.

Conservar mensajes actuales. Nuevos comandos dentro de `dm:command`, schemas `.strict()`:

| type | Campos además de commandId UUID, sceneEpoch, objectRevision (revisión esperada; ADR-016) |
|---|---|
| `object:door` | objectId, state: open/closed/locked |
| `object:transform` | objectId, cell entera, rotation permitida |
| `object:undo` | entryId de la cabecera actual |

`sceneEpoch` cambia sólo con escena; invalida inputs, previews y ACK viejos. `world.revision` conserva su papel en snapshots, incluidos pasos. **No usar world.revision para el CAS del editor**: cambia al caminar. `objectRevision` es contador por escena, empieza en 0, se expone sólo al DM y sube una vez por edición efectiva/undo. Audio, cámara y movimiento no lo cambian. Dos paneles DM con la misma revisión: una edición gana, la otra recibe `STALE_OBJECTS` y datos frescos; no reaplicar automáticamente.

Resultado de objeto: `{commandId,ok,code,sceneId,sceneEpoch,objectRevision}`. Códigos concretos: `APPLIED`, `NO_CHANGE`, `STALE_SCENE`, `STALE_OBJECTS`, `UNKNOWN_OBJECT`, `INVALID_TRANSFORM`, `BLOCKED_CELL`, `OCCUPIED_CELL`, `SPAWN_RESERVED`, `DOOR_LOCKED`, `UNDO_EMPTY`, `UNDO_STALE`, `COMMAND_ID_REUSED`. Rechazos no cambian estado, revisión ni historial. Idempotencia se consulta antes del CAS: scope de sesión DM + dominio de objetos + UUID; guardar fingerprint de payload validado y resultado final. Mismo UUID/payload devuelve el mismo resultado aunque haya cambiado la escena; UUID reutilizado con otro payload se rechaza. Conservar límites/TTL del baseline y no provocar sonidos en un reintento.

Mundo y DM reciben inmediatamente su snapshot filtrado al aplicar; sigue siendo snapshot completo para reconexión. Renderer y entradas deben descartar snapshots obsoletos **también después de esperar assets**: contador local de generación/conexión + epoch + revisión. Un resultado viejo de carga no reemplaza objetos nuevos ni emite `scene:ready` de otra época. Reconectar cancela previews, limpia entradas y reinicia el seguimiento de revisiones de la conexión; un reinicio del servidor no debe atascar el cliente comparando revisiones antiguas.

## 7. Deshacer y estado por escena

Una pila LIFO compartida entre los DM, por escena, hasta 50 entradas de edición de puerta/caja; contiene entryId, objectId y copias before/after de campos afectados, sin restaurar el mundo entero. No incluye movimientos de PJ, audio, PG, reveal ni timón de 0.1. No redo ni timeline general en 0.2.

Deshacer requiere entryId de cabecera y objectRevision esperada vigentes. Revalida el estado inverso contra terreno, otros objetos, actores, reservas y spawns **actuales**. Si está ocupado, devuelve rechazo, conserva la pila y permite que el DM aparte primero la ficha. Éxito: restaura sólo el objeto, elimina la entrada y aumenta objectRevision y world.revision; nunca rebobina contadores o personajes. Un NO_CHANGE no crea entrada.

Cada escena conserva objetos y pila al salir y volver durante el mismo proceso. Cambio de escena para pasos/inputs/solicitudes como ahora y cancela preview local; spawns seguros siempre disponibles. Reiniciar pierde objetos e historial como el resto de la Alpha, explicado en Windows/DM. Guardado en disco sigue en 0.3.

## 8. DM, jugador y proyector

Añadir al DM mapa de trabajo reutilizando WorldRenderer y una sección **Objetos**: selección por clic o lista accesible, contorno privado, nombre y acciones por tipo. Puerta: Abrir / Cerrar / Bloquear; caja: Elegir destino / Girar 90° / Aplicar / Cancelar. Deshacer muestra descripción de última acción. Teclado Escape cancela. No mostrar revisiones, epochs o coordenadas técnicas como pasos obligatorios del usuario.

Preview de caja semitransparente y huella válida/inválida sólo en DM. Conversión de clic por transformación inversa real de Pixi, incluyendo zoom, paneo y compresión; no restar manualmente el rectángulo del canvas. Cambiar selección/escena/conexión o recibir una nueva objectRevision cancela el borrador; refrescos de posición actualizan su validez sin borrar el destino elegido. No reconstruir inputs enfocados en cada `dm:state` como hace actualmente renderPlayers. Los errores se traducen a español («Hay una ficha cruzando», «El objeto ha cambiado; vuelve a elegir»).

Player/Projector ven sólo el resultado confirmado, misma huella/posición/estado, sin controles, preview, notas ni pila. Detalle de puerta bloqueada permanece privado. Cargar sprites genéricos no incluye semillas de encuentros. Reutilizar sprite views por ID; actualizar propiedad/estado, no destruir todo en cada snapshot. Props y fichas deben compartir orden por pie para que una caja no se dibuje siempre por debajo del PJ. Rejilla y aros continúan legibles. Los textos del pack se insertan con textContent o escaping explícito, nunca HTML sin sanear.

## 9. Pruebas de aceptación que Sol debe ejecutar

| ID | Evidencia exigida |
|---|---|
| O01 | Bundle inválido falla con diagnóstico; fixture de otra campaña funciona sin importar Stormwreck en engine. |
| O02 | Puerta cerrada bloquea, abierta permite cruzar, bloqueada rechaza abrir; DM desbloquea y abre. |
| O03 | Caja 2×1 rota a 1×2, valida todas sus celdas y modifica la ruta concreta del fixture. |
| O04 | Caja/puerta no pisan actor quieto, desconectado, origen ni destino de un paso a 0/150/299 ms; al terminar el paso liberar sólo la reserva que corresponde. Ambos órdenes de carrera paso/edición. |
| O05 | Rechazo de límites, superficie, obstáculo, puerta abierta ocupada por caja, spawns y rotación/tipo inválidos; no cambios parciales. Teleport respeta objetos. |
| O06 | Cancelar preview no modifica servidor; dos DM a igual objectRevision producen un único éxito; caminar no invalida una revisión de objetos. |
| O07 | Retry idéntico no duplica; UUID/payload distinto rechazado; rechazo cacheado conserva resultado; epoch viejo no aplica; NO_CHANGE no incrementa. |
| O08 | Undo válido; undo ocupado o entryId obsoleto rechazado sin perder historial; límite 50; cambio de escena conserva estado; reinicio lo resetea según guía. |
| O09 | Player/Projector no ejecutan comandos de objetos, tampoco undo/transform forjados; privado/locked/history ausentes de HTTP público, snapshots, build web y entrada tardía. Criatura oculta no altera validación de colisiones ni errores. |
| O10 | Reconexión con puerta/caja modificadas, carga de assets diferida y cambio rápido de escena: último estado gana, no revive un sprite o preview viejo. Incompatibilidad v2 rechazada antes de claim. |
| O11 | Navegador DM selecciona, mueve, gira, aplica/cancela y deshace; móvil vertical/horizontal sigue moviendo; Projector actualizado; consola sin errores. |
| O12 | Regresión RC4 completa: timón andando, PG privado editado, mochila detiene intención, reveal/hide/foco, release/reclaim, dos clientes, Wi-Fi simulada, tres SFX y capas. |

Tests unitarios con reloj controlado para reservas/transacciones; integración con sockets de roles reales para permisos, CAS, reconexión e idempotencia. No aceptar sólo llamadas directas a applyDmCommand como prueba de autenticación. Validar también artefactos de build/HTTP con marcadores privados de prueba y licencias de assets nuevos.

Typecheck cliente/servidor, unitarias existentes + nuevas, build, auditoría e integración ampliadas. Registrar comandos/salidas realmente ejecutados, no reutilizar el 13/13 de RC4 como resultado de 0.2. Browser automation separada de móvil/proyector/escucha real.

Guía física con enlaces sacados de /api/info y clave de la consola actual; no copiar claves antiguas. Secuencia: puerta cerrada → abrir/cruzar → apartar ficha/cerrar; mover caja al paso → comprobar bloqueo → deshacer → paso libre; intentar cierre mientras alguien cruza; reconectar; volver a Cubierta/timón. Completar además los pendientes reales de RC4 (PG, mochila durante input, dos controles mantenidos, pausa de una capa) y sesión de observación de 30 minutos para 0.2. Preguntar resultados de acciones concretas, sin exigir al usuario interpretar logs o medir percentiles manualmente.

## 10. Secuencia de implementación y cambio de modelo

Sol High implementa todo este bloque, sin subagentes ni cambio automático. Primero verificar las copias de PROJECT_STATE.md. Después pack/tipos, objetos/transacciones/colisiones, protocolo/red, escena/arte/DM, regresiones y guía física. La siguiente entrega completa será `0.2.0-rc.2`; RC1 identifica el trabajo parcial auditado. No detenerse en contratos vacíos o botones sin función.

Probar servidores de integración en otro puerto para no reiniciar la mesa activa del usuario. No sobrescribir una copia anterior. Registrar candidatas y límites reales; la aceptación operativa de RC4 no equivale a que todos G1–G8 estén medidos.

Sol resuelve errores locales sin volver a Astra. Volver a Astra sólo por contradicción transversal que impida cumplir este contrato tras dos intentos razonados o al diseño de persistencia 0.3. La selección Terra/Luna del roadmap no obliga a pasarles tareas si Sol ya puede cerrar el bloque.
