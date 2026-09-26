# Alpha 0.3 — contrato de persistencia para Sol

Decidido por Astra el 2026-09-15. Estado: **DISEÑO CERRADO; RUNTIME PENDIENTE**. Entrega única `0.3.0-rc.1`: puerta corregida conforme a `ALPHA_0_2_1_DOOR_VISUAL_CONTRACT.md` + guardar/cerrar/recuperar. Por decisión expresa del usuario, no hay gate físico intermedio 0.2.1; comprobará puerta y móviles al terminar Sol. RC1 no se declara aceptada por ello.

## 1. Alcance y elecciones

Una partida activa por campaña instalada, local y privada. Snapshot completo JSON UTF-8 versionado, validador Zod ya instalado, `node:fs/promises`/`node:crypto`, un escritor, copia anterior y exportación/restauración autenticadas. Sin DB/dependencia nueva, nube, cuentas, editor de campañas, inventario editable, event sourcing ni cifrado. Inventario ya existe y debe conservarse aunque su editor siga en 0.4.1. Exportar estado NO exporta arte, manuales ni pack privado de campaña.

Node de entrega: **24 LTS, mínimo 24.21.0 dentro de la rama 24** (`>=24.21.0 <25`), ya observado localmente. Sol alineará package/lockfile si procede, INSTALAR/INICIAR/README y pruebas del lanzador; no instalará ni cambiará automáticamente el runtime del usuario. Se elimina la promesa imprecisa `>=20`: Node20 está EOL y no se verificó todo ese rango. Usar `FileHandle.sync()` explícito, no APIs experimentales. Otras majors se reevaluarán en actualización futura. Fuentes/licencias/alternativas en `OPEN_SOURCE_REVIEW.md`.

## 2. Esquema canónico de disco v1

Todos los objetos son estrictos (claves desconocidas rechazadas), números finitos, enteros seguros cuando corresponde. Archivo máximo 4 MiB; profundidad máxima 20; UTF-8 válido; JSON sin comentarios, claves duplicadas ni `__proto__`/`prototype`/`constructor` como claves de objetos. Rechazar antes de hidratar; nunca `Object.assign` de entrada sobre GameState. Sol implementará detección de claves duplicadas mediante lector JSON acotado o comprobador léxico probado; no basta `JSON.parse` que conserva sólo la última.

Envoltorio exacto:

```ts
type SaveV1 = {
  format: 'dungeons-save'; schemaVersion: 1;
  campaignId: string; campaignVersion: string; campaignStateVersion: number;
  saveId: string; generation: number; stateRevision: number; savedAt: string;
  payload: {
    sceneId: string;
    characters: Array<{id:string; hp:number; inventory:string[];
      cell:{col:number;row:number}; surfaceId:string; facing:'north'|'south'|'east'|'west'}>;
    creature: null | {id:string; sceneId:string; surfaceId:string;
      cell:{col:number;row:number}; visible:boolean};
    scenes: Array<{sceneId:string; objects: SavedObject[]}>;
    camera: {mode:'fixed'|'semiFixed'|'follow'; focusId:string|null};
    environment: {storm:boolean};
    audio: {music:SavedTrack; layers:{ocean:SavedTrack;wind:SavedTrack;wood:SavedTrack;storm:SavedTrack}};
  };
  checksum: string;
};
type SavedTrack = {playing:boolean;volume:number;offsetSeconds:number};
type SavedObject = {id:string;cell:{col:number;row:number};rotation:0|90|180|270;
  structure:'intact'|'damaged'|'destroyed'} & (
    {kind:'crate'} |
    {kind:'door';state:'closed'|'open'|'locked'} |
    {kind:'wheel';attachment:'attached'|'detached';state:'upright'|'caught'|'fallen'}
  );
```

`saveId` UUID identifica la partida, no una sesión de control. `generation` entero 1..MAX_SAFE_INTEGER cuenta checkpoints comprometidos; nunca es reloj ni `world.revision`. `stateRevision` entero >=0 cuenta mutaciones duraderas dentro del mundo activo; puede reiniciar al reemplazar partida, siempre delimitado por `runtimeEpoch`. `savedAt` ISO UTC normalizada con milisegundos. IDs usan `idSchema` vigente; versión del pack 1..30 caracteres. `campaignStateVersion` entero positivo nuevo, obligatorio en **bundle privado**, inicial 1; actualizar también bundles de tests. No añadirlo al DTO público.

`checksum` es SHA256 hexadecimal minúsculo de JSON canónico del envoltorio completo **sin checksum**, claves de objetos ordenadas recursivamente con comparación JS de cadenas (no localeCompare), arrays en su orden, números mediante JSON.stringify. Escritor ordena characters por id, scenes por sceneId y objects por id; NO ordenar inventario. Lector verifica hash del orden presente y luego normaliza arrays de entidades. No hash de bytes con espacios. El hash detecta corrupción accidental, NO firma ni sustituye validación/autenticación. El archivo es privado, no cifrado.

Máximos: personajes20; escenas100; objetos100 por escena; inventario100 cadenas de 1..200 caracteres cada una (texto literal, no HTML/Markdown ejecutable); PG entero 0..maxHp de la semilla; volumen0..1; offsetSeconds0..1e12 finito; celdas0..255 y dentro del grid real. Rechazar, no truncar, clamp ni trasladar silenciosamente. Antes de publicar, validar que semillas instaladas respetan los límites; no cambiar inventario del usuario para que pase.

## 3. Compatibilidad, captura e hidratación

`campaignId` debe coincidir. `campaignStateVersion` debe coincidir o existir migración explícita **de esa campaña y esas versiones**, no rellenar objetos nuevos arbitrariamente. Versión textual diferente con stateVersion idéntica se admite con aviso DM; permite correcciones artísticas sin invalidar partidas. Toda edición futura de geometría, IDs, capacidades, semántica, roster/maxHp o semillas que afecte restauración debe aumentar stateVersion. Cambiar sólo PNG/anclas/textos de presentación no. Se validan todas las referencias y geometría aunque coincida la versión; stateVersion no es un permiso para saltar comprobaciones.

Capturar en una sección síncrona: escena activa, TODOS los personajes, criatura incluso oculta/fuera de escena, y objetos de TODAS las escenas, incluidas no visitadas. No usar `publicSnapshot`, `dmState` ni JSON.stringify(GameState): pierden datos privados/inventario/escenas o incluyen credenciales. Clonar por lista permitida. Guardar `character.cell` (destino ya comprometido durante un paso). Persistir facing incluso si un giro contra obstáculo cambió orientación. Capturar audio con un único now para todos los canales: offset + max(0,now-startedAt)/1000 si playing; no guardar startedAt. El tiempo apagado no avanza los loops; al cargar set startedAt al reloj nuevo si playing, o null si no. No SFX reemitidos. `environment.lightning` se deriva de storm como en runtime actual.

Hidratar una **GameState candidata**, construida con bundle validado, antes de tocar mundo/archivos activos. Asignar sólo campos permitidos; capacidades, huellas, mount, assets, maxHp, labels, tokens y notas vienen exclusivamente del bundle. Igualdad exacta de conjuntos de IDs por escena y roster (sin duplicados/faltantes/sobrantes). No duplicar ubicaciones de PJ por escena: el runtime sólo tiene posición de grupo en escena activa.

Validación global por fases, independiente del orden de arrays:

1. Objetos: kind igual a definición, rotación permitida, posición fija si transform=false. Estructura no intacta exige capacidad. Puerta destruida conserva su `state` privado open/closed/locked: el runtime actual sólo cambia structure al romperla, y publica open por ser destroyed. Capturar ese estado latente tal cual, no confundirlo con el DTO público ni rechazar un mundo alcanzable. Timón attached exige upright, no destroyed, posición/rotación inicial y coincidencia exacta con mount; detached exige caught/fallen; destroyed exige detached. No rehabilitar una combinación ilegal.
2. Calcular ubicación y bloqueo de todos los objetos por escena con geometría compartida; validar terreno, límites, spawns, soportes, otros objetos. Excepción de terreno sólo el attached coincidente con su mount, nunca genérica. Restos/puerta abierta reservan ubicación contra objetos, no contra actores. No validar incrementalmente contra semillas que luego serán sustituidas.
3. PJ en suelo/superficie de escena activa sin bloqueo sólido; se permite apilarlos entre sí. Criatura en suelo de su escena/superficie; si visible validar contra bloqueos (aunque fuera de escena activa); si oculta NO hacer que un objeto colocado legalmente sobre ella vuelva inválido el guardado. Esta excepción respeta la privacidad/colisión actual. Al revelarla, aplicar reglas existentes y probar estados alcanzables; no filtrarla durante carga.
4. Foco null o actor existente; si criatura no es pública en la escena actual, normalizar foco a null con aviso sólo DM, nunca publicar su ID. No inventar un foco sustituto. Todo fallo restante rechaza snapshot completo; ninguna carga parcial.

Hallazgo de integración a resolver por Sol: hoy el comando reveal permite mostrar una criatura oculta sin revalidar el bloqueo dinámico colocado mientras estaba oculta. Para que un mundo alcanzable no falle al guardarse, añadir al reveal una comprobación de terreno/superficie/bloqueo sólido en la escena de la criatura. Si está bloqueada, rechazar sólo al DM con diagnóstico y opción de usar el teleport existente antes de revelar; no moverla automáticamente. Permitir apilamiento con PJ según ADR-009. La colocación de objetos y snapshots públicos siguen ignorando a la criatura oculta. Probar ocultar→poner caja sobre su celda→guardar/cargar→reveal rechazado→teleport DM válido→reveal→guardar/cargar. Es una guarda de coherencia de persistencia, no niebla de guerra ni sistema de visión nuevo.

Tras reinicio/restauración: PJ libres, sessionToken/socketId null, input vacío/seq=-1, moving=false, step=null, solicitudes vacías, undo vacío en todas las escenas, projectorReady=false. Versiones CAS de objetos/escenas y world.revision nuevas. **Deshacer no atraviesa restauración/reinicio**; informar en UI. No persistir DM cookie/clave, conexiones, IP, SFX, timers, previews, cachés, notas ni definiciones del bundle.

## 4. Módulos y contrato de escritura

Sol extrae `engine/server/persistence/{schema,codec,hydrate,store,coordinator}.ts` (puede unir módulos pequeños, no un framework). `GameState.captureDurable(now)` y función pura `hydrateDurable(bundle,payload)` encapsulan objectScenes privado. `SaveStore` recibe ruta/fs/reloj/failpoints inyectables; devuelve errores tipados sin payload. `PersistenceCoordinator` serializa capturas/escrituras/restauraciones y emite estado sólo al DM. `apps/server` compone y carga ANTES de arrancar ticks/admitir controles. Sin dependencia de campaña en engine.

Ruta predeterminada absoluta derivada del directorio del proyecto: `data/saves/<campaignId>/`, independiente de cwd al arrancar el build. Override servidor `DUNGEONS_DATA_DIR` absoluto para tests/instalaciones, nunca del navegador. Prohibir raíz estática/dist/art/audio, symlinks/junctions y salidas de la carpeta resuelta para destinos administrados. campaignId validado; nombres internos constantes o UUID generado, jamás nombre subido/ruta enviada por cliente. `.gitignore` incluye data; scripts de empaquetado excluyen partidas/exports/secretos reales. ACL heredada del usuario en Windows (mode0600 donde tenga efecto), sin dar permisos amplios. Ruta no pública; puede mostrarse sólo al DM autenticado/local consola.

Archivos: `active.json`, `active.bak.json`, `.active-<uuid>.tmp`, `.backup-<uuid>.tmp`, `writer.lock`, `recovery/<uuid>-<rol>.json`. Un lock `wx` con pid/token/createdAt evita dos procesos incluso con puertos diferentes. Mantenerlo hasta cierre; liberar sólo lock propio. **No borrar automáticamente un lock huérfano** ni inferirlo sólo por antigüedad. Ofrecer utilidad local de recuperación (lanzador con opción clara): exigir todas las mesas cerradas, comprobar PID muerto (si vivo/EPERM/identidad dudosa, rechazar), mostrar directorio exacto y pedir confirmación local; archivar lock, no archivos de partida, y volver a intentar arranque. Documentar que la salida forzada puede requerir este paso. No botón remoto que mate procesos o robe locks.

Secuencia única por checkpoint:

1. Capturar/validar snapshot inmutable, reservar siguiente generation del slot. Abrir temporal único con wx, escribir completo, sync y close, volver a leer/validar checksum y esquema.
2. Si existe active válido reconocido, copiar SUS BYTES a temporal de backup, sync/close/validar y rename sobre active.bak.json. No mover/quitar active para hacer backup. Si crear backup falla, abortar guardado antes del commit. Un active corrupto nunca pisa backup válido.
3. Rename del temporal nuevo sobre active.json SIN unlink previo: **punto de commit**. Volver a leer/verificar ese generation/hash antes de anunciar guardado. Intentar sync directorio donde se soporte; si Windows no soporta sync de directorio, registrar limitación, no fingir garantía ante fallo físico del disco.
4. Confirmar generation/stateRevision capturados. Sólo limpiar temporales del propio intento que ya no sean evidencia necesaria. Nunca borrar archivos desconocidos o de otros procesos. Retener checkpoints recuperables.

Reintentar EPERM/EACCES/EBUSY en cada operación recuperable hasta cinco intentos totales, esperas 50/100/200/400ms; no bucle eterno. ENOSPC/EROFS/EIO y validación fallan inmediatamente. Si el resultado de rename/verificación queda incierto, inspeccionar active antes de reintentar: mismo generation+hash comprometido equivale a éxito, antiguo válido equivale a fallo antes del commit; cualquier otro estado entra RECOVERY_REQUIRED y detiene escrituras. No confirmar fracaso y luego reintentar ciegamente una restauración ya comprometida.

Garantía: tras SAVED y terminación del proceso, recuperar ese checkpoint o uno posterior validado; ante error ANTES de commit se conserva principal anterior. Testear caídas en cada frontera. No prometer cero pérdida entre checkpoints ni resistencia absoluta a corte eléctrico, fallos de hardware, carpetas de red o sincronización en nube. Sólo almacenamiento local Windows certificado.

## 5. Programación, errores y recuperación inicial

`stateRevision` aumenta sólo cuando cambia estado duradero, no por ticks, animación, claims, solicitudes, ready, SFX, undo vacío, NO_CHANGE o rechazos. Los commits síncronos de objetos conservan CAS/idempotencia y no añaden await en su validación. Marcar dirty al aceptar paso/giro efectivo y mutaciones DM duraderas, incluidas undo/resolver interacción cuando cambian el objeto. Una comparación de representación duradera barata antes/después de comandos es válida; no hashear todo el mundo a 30Hz.

Autosave: debounce de 1000ms desde última mutación, plazo máximo 5000ms desde primera no guardada; movimento continuo no debe posponerlo indefinidamente. Un escritor y una petición siguiente coalescida; snapshot nuevo al empezar cada escritura. Manual fuerza captura inmediata (o al liberar escritor) e informa al menos el stateRevision solicitado; cambios posteriores mantienen indicador dirty aunque el guardado manual termine bien. Cada escritura exitosa lleva generation nuevo, incluso si sólo avanza offset de audio. Mientras haya canal playing, checkpoint como máximo cada30s para posición de loop; no marcar dirty cada frame. Error: conservar estado jugable en memoria, aviso persistente y botones Reintentar/Exportar; suspender autosave hasta reintento explícito para evitar bucles. Exportar memoria funciona aunque disco local falle.

Inicio bajo lock:

| Situación | Conducta |
|---|---|
| Ningún checkpoint ni temporal de partida | Crear mundo semilla, dirty; primer autosave crea generation1. Sin anuncio previo de guardado |
| active válido y compatible | Cargar active aunque un temporal tenga generation mayor: el temporal NO se comprometió |
| active corrupto/ausente, backup válido | Mostrar recuperación al DM; no jugar ni autosave antes de confirmar restauración de backup. Público sólo “Mesa pendiente de recuperación” |
| Sólo temporales; ambos inválidos; checksum incorrecto | RECOVERY_REQUIRED, preservar evidencia. No arrancar semilla ni promover temporal automáticamente |
| Formato futuro/campaña o stateVersion incompatible en active | INCOMPATIBLE; no fallback silencioso a backup antiguo, no autosave. Restauración explícita de copia compatible o build adecuado |
| Permisos/directorio/lock fallan | Diagnóstico local accionable, no segunda partida automática en otra carpeta |

DM puede exportar evidencia/download privado, importar copia compatible o **Iniciar nueva partida**, siempre con confirmación descriptiva. Antes de sustituir en recuperación, archivar bytes existentes active/bak en recovery con wx y sync; fallo al preservar aborta sustitución. Nueva partida cambia saveId; generation del slot sigue por encima de máximos RECONOCIDOS comprometidos. No tomar generation sin validar desde archivo arbitrario. Si archivo futuro desconocido existe, conservarlo y requerir elección explícita; jamás intentar escribirle encima al arrancar.

Apagado normal: deshabilitar nuevos comandos/inputs, detener nuevos pasos (destinos ya comprometidos), cancelar solicitudes, vaciar cola y hacer checkpoint final. Timeout10s: informar claramente fallo/último guardado, salida no cero, nunca “guardado”. Cierre forzado no garantiza flush final. En shutdown el estado sigue reservado hasta cerrar sockets y liberar lock propio; tests controlan cada límite sin tocar la mesa real.

## 6. Restaurar en vivo y protocolo v4

Elevar PROTOCOL_VERSION a4; conservar objectModelVersion1 y schema público2. Añadir `runtimeEpoch` UUID fresco en cada arranque/reemplazo de mundo, nunca persistido. Propagar en handshake de bienvenida y world:snapshot, dm:state, player:private, personajes disponibles, audio:state, SFX y ACK. Exigir epoch en TODOS los mensajes mutadores: dm:command (también hp/release/audio/sfx), player:claim/interact, input:move, scene:ready y projector:ready. HTTP de guardado/restauración lleva epoch igualmente. Antes de consultar caché de comandos, rechazar STALE_RUNTIME sin efectos si no coincide. SceneEpoch/objectRevision siguen siendo CAS más precisos; no sustituirlos por generation de disco.

Emitir `runtime:reset {runtimeEpoch,reason}` antes de estados del mundo nuevo por conexión ordenada. Conectar recibe esa identidad antes del primer snapshot. Al recibir reset o reconectar: borrar cola/peticiones/ACK pendientes/previews, parar input y audio/SFX/fades pendientes, invalidar carga asíncrona del renderer; sólo aceptar mensajes de epoch nuevo. No cambiar de epoch por un ACK antiguo ni reenviar automáticamente acciones viejas. PJ vuelve a elegir personaje; cookie DM en el mismo proceso puede mantenerse; projectorReady=false y preparar de nuevo con gesto si el navegador lo exige. Caches indexadas por epoch, sin replays de eventos. Primero snapshot/load vigente, después scene:ready y controles. No basta reiniciar world.revision: un cliente conservaría la escena vieja.

Restauración es transacción EXCLUSIVA del coordinador:

1. Previsualización del archivo valida/hidrata candidato sin mutar mundo/disco. Devuelve resumen sólo DM y token aleatorio de un uso, TTL5min, ligado a sesión DM, hash, runtimeEpoch y stateRevision observada. Máximo un candidato pendiente por sesión; límite global4; rate limit por sesión. No interpretar textos del archivo como instrucciones.
2. DM confirma el archivo/campaña/hora y pérdida de cambios no guardados, historial y controles. Commit exige token+epoch+expectedStateRevision+requestId UUID. Si estado cambió desde preview, rechazar STALE_STATE y pedir revisar resumen de nuevo; nunca actualizar silenciosamente la revisión del token. Pausar todos los mutadores y ticks al comenzar commit, descartar inputs recibidos durante pausa (no encolarlos), anular previews/peticiones pendientes. Una segunda restauración recibe BUSY.
3. Esperar escritor en curso; capturar y preservar en recovery un checkpoint completo de memoria ANTERIOR al reemplazo, incluso si tenía cambios sin guardar. Si no se puede escribir esa copia o archivar evidencia en recuperación, abortar y mantener mundo anterior. Exportación manual sigue disponible. Candidato recibe nueva generation del slot, savedAt actual; conserva saveId del archivo importado. Guardar candidato con mismo pipeline atómico. Nunca instalar antes del commit ni restaurar active antiguo automáticamente después del commit.
4. Tras confirmar commit, sustituir GameState en una sección síncrona, cambiar runtimeEpoch y limpiar efímeros según arriba. Reiniciar audio con reloj del instante de instalación, no del inicio de IO. Publicar reset + serializers por rol. Si instalación falla DESPUÉS del commit, parar controles y entrar RECOVERY_REQUIRED; disco contiene el candidato y reinicio debe cargarlo. No seguir jugando memoria vieja mientras disco declara otra partida.
5. requestId+hash/fingerprint mantienen idempotencia (TTL10min/máx1000); repetición idéntica devuelve resultado sin nueva restauración; distinto payload con mismo ID rechaza. Excepción sólo para consultar resultado de requestId de restore exitoso del epoch anterior, autenticado en la misma sesión: no ejecutar mutación vieja. Botón puede consultar estado si respuesta HTTP se perdió.

## 7. HTTP/UI y privacidad

Reutilizar autenticación DM del servidor (cookie HttpOnly SameSite Strict), comprobar antes de parsear datos privados; mutadores exigen Origin igual al origen efectivo permitido, JSON Content-Type y token CSRF de sesión entregado al DM autenticado. No aceptar Origin ausente en API mutadora de navegador; herramientas de tests lo proporcionan. CORS cerrado; no confiar sin más en Host/X-Forwarded-Host de cliente. Endpoint/login actual puede refactorizar helper de sesión/origen sin revelar clave.

| Método y ruta nueva | Contrato |
|---|---|
| GET `/api/dm/save/status` | `{mode, runtimeEpoch, stateRevision, savedStateRevision, generation, savedAt, dirty, errorCode}`; mode ready/saving/error/recovery/incompatible/restoring; nullable si sin disco |
| POST `/api/dm/save` | `{requestId,runtimeEpoch}`; espera checkpoint, respuesta SAVED + generación/revisión capturada, no simple APPLIED |
| GET `/api/dm/save/export` | Snapshot VALIDADO de memoria actual con savedAt de captura, stateRevision actual, saveId conservado y generation=max(1,última comprometida); generation aquí es referencia de origen, NO recibo de durabilidad ni reserva del siguiente checkpoint. No cambia active. attachment filename fijo seguro |
| POST `/api/dm/save/preview` | JSON SaveV1 o legado0 documentado, hasta4MiB; epoch/CSRF en headers; devuelve token/resumen/expectedStateRevision/avisos. No guarda ni cambia partida |
| POST `/api/dm/save/restore` | `{requestId,runtimeEpoch,token,expectedStateRevision}`; flujo exclusivo anterior, RESTORED con nuevo epoch/generation |
| POST `/api/dm/save/new/preview` | Epoch; resumen de nueva partida semilla y token de confirmación del mismo mecanismo. No muta |
| POST `/api/dm/save/backup/preview` | Epoch; lee exclusivamente active.bak.json del slot, valida y emite token/resumen del mismo mecanismo. No acepta ruta |
| GET `/api/dm/save/evidence/:id` | Sólo en recuperación; id opaco de una lista enumerada por servidor para active/backup/evidencias reconocidas. Descarga privada attachment, no path arbitrario |
| GET `/api/dm/save/result/:requestId` | Resultado de petición de esa sesión o NOT_FOUND; nunca contenido privado de otra sesión |

Recuperar backup usa preview de copia del slot mediante identificador servidor `backup`, no ruta ni archivo enviado. Implementar acción explícita en modo recuperación con los mismos controles, token y confirmación. Todos los GET privados `Cache-Control:no-store`, `nosniff`; export JSON attachment. Errores y mensajes al público no llevan paths, inventarios, locked ni criatura. No incluir SaveV1 en tipos importados por cliente público ni empaquetarlo con Vite. El cuerpo privado sólo viaja DM autenticado. Aplicar límite4MiB SÓLO a preview antes del parser global16KiB; no ampliar Socket.IO ni otras rutas. 400 inválido, 401 sin sesión, 403 origen/CSRF, 409 stale/busy/incompatible, 413 tamaño, 422 mundo inválido, 507 espacio, 503 IO/recovery. No volcar JSON crudo a logs.

Al importar, nunca usar generation del archivo subido como contador del slot: el coordinador asigna uno local después de preservar el mundo anterior. El contador para recuperación inicial sólo considera checkpoints locales de formato reconocido íntegramente validados; ante MAX_SAFE_INTEGER bloquear escritura con diagnóstico, no desbordar. Exportar no marca clean ni cambia lastSaved. El caso sin save local exporta generation1 pero sigue sin estar guardado en active.

UI DM pequeña: Guardar ahora, Exportar copia privada, Restaurar copia, última hora guardada/pendiente/error. Confirmación menciona archivo, fecha, escena, cambios perdidos y necesidad de reasignar personajes; Cancelar deja todo igual. Mostrar historial nuevo tras cargar. Sin controles sin implementar ni editor de mochila añadido. Player/Projector nunca muestran lista de saves. Añadir instrucciones para obtener copia antes de actualizar; 0.2.1 no lee el formato nuevo: rollback requiere código Y datos compatibles en otra carpeta.

## 8. Migración y pruebas

Primera versión publicada de disco es1; **0.2.1 no produjo saves**. Fixture legado0 es sintético de diseño, no evidencia de partidas antiguas reales. Formato0 usa exactamente el envoltorio anterior con schemaVersion0 y payload sin camera. Verificar su checksum/esquema estricto, añadir `{mode:'fixed',focusId:null}`, establecer schemaVersion1 y recalcular checksum. Todo lo demás se conserva; no default de PG/inventario/objetos. Migración pura, determinista, idempotente para entrada1. Al cargar0 desde disco, conservar original con nombre nuevo y confirmar migración antes de reescribir; error no pisa archivo. Formatos futuros o negativos rechazados. No existe todavía migración entre campañas/stateVersion diferentes.

Fixtures privados de prueba en `docs/fixtures/alpha03/`; mapa sintético, ningún dato personal/secreto real. Comprobador de diseño sólo comprueba coherencia de ejemplos y geometría propuesta: **no acredita persistencia implementada**. Sol usa los ejemplos contra schema/hydrator reales y añade fixture de cada escena del pack real en tests efímeros, sin guardar inventarios reales en evidence pública.

Pruebas mínimas P01–P15 y D01–D06 en `ALPHA_0_3_ACCEPTANCE_PLAN.md`. Para los runners existentes y nuevos crear DATA_DIR temporal único + HOST127.0.0.1 + puerto libre, esperar readiness real, cerrar y limpiar sólo carpeta creada y validada. No reiniciar ni usar la mesa actual del usuario en 3000/3130. Separar fallos inyectados, caída real de proceso, navegador y equipo físico. Cada nueva función posterior a0.3 debe mantener esquema y round-trip de estado.
