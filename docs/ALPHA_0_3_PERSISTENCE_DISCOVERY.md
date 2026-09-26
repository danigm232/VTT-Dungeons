# Descubrimiento previo — persistencia Alpha 0.3 (HISTÓRICO)

> Sustituido2026-09-15 por `ALPHA_0_3_PERSISTENCE_CONTRACT.md`. No ejecutar sus recomendaciones incompatibles: temporal de generación mayor NO equivale a commit; Node24 es la base decidida; el usuario aplaza puerta/móvil hasta terminar0.3 conjunta.

Fecha: 2026-09-14. Estado: **preparación no vinculante para Astra**. Este documento no inicia la implementación, no cambia el runtime de Alpha 0.2.1 RC1 y no sustituye la aceptación física pendiente.

## Resultado recomendado

Para el volumen y la forma actuales del estado, comenzar Alpha 0.3 con **un snapshot JSON único, privado, versionado, validado y escrito de forma atómica**, más copia anterior recuperable. No hay consultas relacionales, concurrencia multiproceso ni volumen que justifiquen todavía una base de datos.

Reevaluar SQLite cuando el editor 0.4 introduzca varias campañas/partidas, índices, historial extenso o consultas parciales. La decisión final corresponde al contrato de Astra después de aceptar 0.2.1.

## Inventario exacto del runtime actual

### Debe persistir

| Área | Campos canónicos | Regla de carga |
|---|---|---|
| Cabecera | `schemaVersion`, `saveId`, `generation`, `savedAt`, identidad y versión del pack de campaña | Rechazar formato futuro; migrar versiones conocidas; no mezclar con otra campaña |
| Escena | `sceneId` | Debe existir en el pack instalado |
| Personajes | por ID: `hp`, `inventory`, `cell`, `surfaceId`, `facing` | IDs/`maxHp`/token/arquetipo vienen del pack; validar suelo y limitar PG al máximo vigente |
| Criatura | ID, `visible`, `sceneId`, `surfaceId`, `cell` | Validar escena/superficie/suelo; si el pack ya no contiene el encuentro, requerir migración explícita |
| Objetos | por escena e ID: posición, rotación, estructura y estado específico de puerta/timón; relación unido/separado; versión persistente sólo si el contrato la necesita | Definición estática, capacidades, huellas, soporte y assets vienen del pack; recalcular colisiones al cargar |
| Cámara | `mode`, `focusId` | Conservar foco sólo si la entidad sigue siendo públicamente visible y válida |
| Ambiente | `storm`, `lightning` o una única fuente canónica si siguen acoplados | Normalizar invariantes al migrar |
| Audio | `playing`, `volume` y offset lógico de música/capas calculado en el momento del guardado | No persistir `startedAt` del proceso; al cargar, reanudar desde el offset guardado con reloj nuevo. El tiempo con el servidor apagado no avanza la pista |

La posición canónica de un personaje durante un paso ya es la celda de destino. Si se guarda en movimiento, al cargar aparece quieto en esa celda; no se reanuda la animación parcial.

### Debe descartarse al reiniciar

- `sessionToken`, `socketId`, `sessionSockets`, reclamaciones y controladores activos. Tras arrancar, todos los personajes quedan libres para reasignación segura.
- `input`, `held`, `seq`, `updatedAt`, `moving`, `step`, timers y offsets de reloj del proceso.
- Solicitudes de interacción, previews DM, comandos pendientes, `processedCommands` y caché de idempotencia.
- `projectorReady`, salas Socket.IO, conexiones, clave/cookie DM y direcciones LAN.
- Eventos SFX efímeros, avisos y mensajes de UI.
- `world.revision`, `sceneEpoch` y revisiones CAS de proceso pueden reiniciarse con una nueva ejecución; si se guardan por diagnóstico nunca deben aceptar comandos de una conexión anterior.
- Notas privadas, semillas, capacidades, geometría, catálogos y definiciones estáticas: pertenecen al bundle de campaña, no se duplican en la partida.

### Decisión que Astra debe cerrar

La pila `undo` está limitada a 50 entradas por escena, pero su formato depende de los tipos de runtime. Recomendación inicial: **no persistir undo entre reinicios** y mostrar “historial nuevo tras cargar”. Persistir el mundo resultante sí es obligatorio. Si el producto exige deshacer después de cerrar, el contrato debe versionar y migrar cada entrada, no serializarla accidentalmente.

## Propuesta de archivo y privacidad

- Ruta de datos separada de `dist` y de cualquier raíz estática, por ejemplo `data/saves/<campaignId>/active.json`. Nunca debe responderse por HTTP.
- El archivo contiene información privada —inventarios, posiciones ocultas, cerraduras y criatura— y se trata como estado del servidor, no DTO público.
- JSON UTF-8, claves estables y esquema estricto. No guardar clases, `Map`, `Set`, funciones ni rutas absolutas.
- Cabecera mínima propuesta: `schemaVersion: 1`, `campaignId`, `campaignVersion`, `saveId` UUID, `generation` entero, `savedAt` ISO y `payload`.
- Un hash del payload puede detectar truncado/manipulación accidental, pero no aporta autenticidad si vive en el mismo archivo. La validación estructural y la copia anterior siguen siendo obligatorias.

## Escritura y recuperación en Windows

Secuencia candidata, siempre serializada y sin dos escritores:

1. Construir un snapshot inmutable y validarlo antes de tocar disco.
2. Escribir un temporal único en la misma carpeta; vaciar sus datos a disco (`FileHandle.sync()` o una API equivalente compatible con el mínimo de Node).
3. Conservar la versión principal válida como `.bak` mediante su propio reemplazo seguro.
4. Renombrar el temporal sobre `active.json`. Node documenta que `rename` sobrescribe un archivo destino existente.
5. Confirmar al DM “guardado” sólo después de completar escritura/sincronización/reemplazo.
6. En Windows, reintentar con espera acotada los bloqueos transitorios `EPERM`, `EACCES` o `EBUSY`; nunca borrar el principal válido antes de disponer de temporal y backup válidos.

Al arrancar, examinar `active.json`, `.bak` y temporales reconocibles sin ejecutar contenido. Validar esquema, campaña y generación; elegir el candidato válido más reciente. Si el principal está corrupto y el backup es válido, cargar el backup con aviso visible. Si ninguno es válido, **no arrancar silenciosamente una partida vacía ni sobrescribir pruebas**: ofrecer iniciar nueva partida o restaurar una copia.

La opción `flush` de `fs.writeFile` llegó en Node 20.10; el proyecto declara actualmente `node >=20`. Astra debe elegir entre elevar el mínimo documentado o usar primitivas disponibles en todo el rango soportado.

## Cuándo guardar

- Guardado manual siempre disponible y con estado visible: limpio, guardando, guardado con hora/generación o error.
- Autosave en una cola de un solo escritor. Mutaciones DM discretas —PG, objetos, escena, criatura, cámara, ambiente y audio— marcan su generación.
- Movimiento continuo se agrupa: guardar cuando el paso queda estable o tras un debounce corto; no escribir a 20/30 Hz.
- Una generación nueva durante una escritura provoca otra escritura posterior; nunca se considera guardada sólo porque fue capturada en memoria.
- Un error de disco mantiene la partida en memoria, muestra aviso persistente y permite reintentar o exportar; no sigue anunciando “guardado”.

## Matriz mínima para el contrato y las pruebas

| ID | Caso obligatorio |
|---|---|
| P01 | Mover caja, separar timón, romper puerta, cambiar PG/inventario, criatura/ambiente/audio; guardar, cerrar y recuperar exactamente el estado duradero |
| P02 | Guardar durante un paso; cargar quieto en una celda válida sin input ni interacción antigua |
| P03 | Reinicio libera todos los controladores y no conserva sockets, clave DM, proyector preparado, solicitudes ni SFX |
| P04 | Dos guardados solapados se serializan y termina en disco la generación más nueva |
| P05 | Corte/error antes y después del rename conserva principal o backup válido; archivo truncado nunca produce estado parcial |
| P06 | `EPERM`/`EACCES`/`EBUSY` transitorio reintenta con límite; error permanente se muestra y no destruye el último guardado |
| P07 | Esquema antiguo migra una sola vez con backup; esquema futuro o campaña equivocada se rechaza sin sobrescribir |
| P08 | Ruta de guardado y datos privados no son servidos por `/api/campaign`, estáticos, snapshots públicos o errores |
| P09 | Exportar/restaurar usa un archivo identificado y no reemplaza automáticamente la partida activa sin confirmación del DM |
| P10 | Instalación limpia Windows, ruta con espacios y usuario sin permisos de escritura producen diagnóstico accionable |

## Gate de reutilización aplicado

| Opción | Encaje actual | Decisión preparatoria |
|---|---|---|
| Node `fs` + implementación pequeña propia | Sin dependencia; `writeFile`/`rename`/sincronización están disponibles, pero hay que probar reemplazo, fallos y reintentos Windows cuidadosamente | `ADAPT`, recomendada para el primer snapshot |
| `write-file-atomic` | ISC, cola escrituras y `fsync`; la versión 8 exige Node 22.22.2/24.15/26 y no cubre el rango `>=20` actual. Además hay historial de bloqueos transitorios de rename en Windows | `REJECT` para 0.3 con el mínimo actual; no instalar |
| `node:sqlite` | SQLite integrado evita dependencia externa, pero apareció en Node 22.5 y sigue marcado release candidate en documentación actual | `DEFER`; incompatible con Node 20 sin elevar el mínimo |
| `better-sqlite3` | MIT, transacciones SQLite sólidas y binarios precompilados; la rama actual exige Node >=22 y añade componente nativo/distribución por arquitectura | `DEFER`; reconsiderar cuando haya consultas o múltiples partidas que lo justifiquen |
| SQLite como formato, en general | Atomicidad transaccional y buena evolución hacia datos mayores | `STUDY`; no aporta ventaja suficiente para el pequeño snapshot actual |

Fuentes primarias consultadas: [Node.js File System](https://nodejs.org/api/fs.html), [Node.js SQLite](https://nodejs.org/api/sqlite.html), [better-sqlite3](https://github.com/WiseLibs/better-sqlite3), [write-file-atomic](https://github.com/npm/write-file-atomic) y [atomic commit de SQLite](https://www.sqlite.org/atomiccommit.html).

## Entrega a Astra y Sol

Astra debe transformar este inventario en ADR/contrato tras aceptar 0.2.1, fijando formato, directorio real, política de undo, mínimo de Node, confirmación de guardado, migraciones y recuperación. Sol implementará luego serializador/validador, almacenamiento, UI DM, tests de fallos y guía de restauración como una sola entrega jugable. No añadir todavía botones visibles ni dependencias.
