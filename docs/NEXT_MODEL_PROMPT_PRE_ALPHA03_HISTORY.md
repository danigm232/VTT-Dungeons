# HISTÓRICO — encargo anterior sustituido el2026-09-15

No ejecutar como instrucciones activas. El usuario cambió el gate: puerta/persistencia se implementan juntas en0.3 y prueba física después. Ver NEXT_MODEL_PROMPT.md vigente.

# Siguiente relevo vigente — Astra High — diseño de puerta 0.2.1 y persistencia 0.3

El usuario informó el 2026-09-15 de prueba física parcial y dos capturas con **FAIL visual** de puerta abierta/cerrada. Solicita que Astra se ocupe del diseño de esa corrección y del contrato de 0.3. Ejecutar `docs/ASTRA_ALPHA_0_3_HANDOFF.md` ahora **sólo como diseño**. Después Sol implementa primero la puerta en una candidata 0.2.1 de nombre nuevo; el usuario verifica la puerta y los subcasos pendientes; sólo tras aceptar 0.2.1 Sol implementa 0.3. No cambiar automáticamente de modelo ni usar subagentes.

Informe exacto: `docs/ALPHA_0_2_1_PHYSICAL_REPORT_20260915.md`. Backup RC1 existente no se sobrescribe. La puerta funciona para colisión, pero el sprite abierto aún es frontal/erguido y el cerrado una barra horizontal cenital; no forman una transición coherente desde la cámara del jugador.

---

## Relevo anterior Sol — conservar como historial

> **Instrucción histórica previa al informe físico del 15/09.** Se conserva como trazabilidad. El encabezado Astra de arriba prevalece; no reimplementar lo ya terminado ni empezar persistencia 0.3 antes de corregir/aceptar 0.2.1.

Continúa en `C:\Users\User\Desktop\Dungeons` con Sol y razonamiento High. No uses subagentes ni cambies automáticamente de modelo. La fuente y `dist` actuales son `0.2.1-rc.1` candidata técnica; Alpha 0.2.0 RC2 sigue siendo la última versión aceptada físicamente.

Ya está terminado: timón separado/movible/cuatro giros sin copia lógica o visual; daño/destrucción/restos de timón, puerta y caja; undo que rechaza ocupación; solicitudes contextuales; preview con sprite; vistas conservadas por ID; fondo limpio y puerta corregida para la cámara cenital/oblicua. Typechecks PASS, Vitest 23/23, build, auditoría Alpha 0.2 12/12, integraciones general/objetos y `node scripts/audit-alpha021.mjs` PASS; navegador DM/Player/Projector comprobado a 390×844, 844×390 y 1920×1080 con consolas limpias.

## Trabajo de Sol al volver

1. Leer `PROJECT_STATE.md`, `docs/ALPHA_0_2_1_PHYSICAL_CHECK.md`, `docs/ACCEPTANCE_RESULTS.md`, `docs/LUNA_RESERVE_CONTINUATION.md` y el cierre más reciente del roadmap. Consultar contrato/ADR sólo ante una contradicción.
2. Guiar la prueba física en Pixel 9a/Chrome vertical y horizontal, portátil MSI y proyector 1080p. Registrar hechos separados; no heredar el PASS físico de RC2.
3. Comprobar especialmente: soporte + una sola rueda; solicitud/separación/traslado/cuatro giros; daño y restos de los tres objetos; restos atravesables pero reservados para objetos; undo ocupado rechazado sin desplazar personaje; reconexión; puerta estrecha vista desde arriba; preview real y cancelación privada.
4. Preguntar si la rueda vertical necesita un escorzo elíptico mayor. No cambiarla sólo por hipótesis: debe juzgarse en el equipo real.
5. Corregir únicamente fallos reproducidos, ejecutar tests proporcionales más `node scripts/audit-alpha021.mjs`, revisar las vistas afectadas y repetir sólo el tramo físico afectado.
6. Si todo pasa, actualizar aceptación/estado/README/roadmap. Conservar `backups/alpha-0.2.1-rc1-20260914.zip` (20 528 652 bytes), SHA-256 `444F3A09524DA4AB26B4A0AF62A55B5505BF568D68EF5E520E407EC8F5352EF2`; si se corrige producto, crear un backup de nombre nuevo. Sólo entonces entregar a Astra el diseño de persistencia 0.3.

Antes de implementar o generar algo nuevo, aplicar el gate de `ROADMAP_V1.md` y `docs/OPEN_SOURCE_REVIEW.md`: estudiar hasta tres alternativas gratuitas/open source, sus licencias separadas de código/arte, transformabilidad, procedencia, perspectiva/estilo, formatos, rendimiento y coste de adaptación; decidir `ADOPT`, `ADAPT`, `STUDY`, `REJECT` o `GENERATE`. Que exista no obliga a usarlo y no se incorpora automáticamente.

Después de aceptar 0.2.1, usar `docs/ASTRA_ALPHA_0_3_HANDOFF.md`. Astra debe revisar `docs/ALPHA_0_3_PERSISTENCE_DISCOVERY.md` y definir persistencia 0.3 —esquema/versionado, secretos/sesiones, durabilidad, migraciones, recuperación y JSON atómico frente a SQLite—; Sol volverá para implementarla de extremo a extremo. No iniciar 0.3 antes de ese contrato.

---

## Encargo histórico ya ejecutado — conservar sólo como trazabilidad

Continúa en `C:\Users\User\Desktop\Dungeons` con Sol y razonamiento High. No uses subagentes ni cambies automáticamente de modelo. Implementa el bloque completo hasta una candidata funcional `0.2.1-rc.1`; no entregues sólo planificación, arte o un prototipo.

## Estado de partida

Alpha 0.2.0 RC2 está aceptada operativamente (14/09, Pixel 9a y portátil MSI, Chrome, vertical/horizontal, salida 1080p). La perspectiva frontal de la puerta es una incidencia visual no bloqueante incluida aquí. No repetir ahora el recorrido físico RC2. Astra cerró ADR-017–019, contrato y geometría de 0.2.1; ninguna función ni asset de la extensión está implementado aún.

Copia recuperable: `backups/alpha-0.2.0-rc2-final-20260914.zip`, SHA-256 `28588478A586510BAD5AE3BA174BFD806AFE26E3BFCC1BD35743C3BC12F96E7A`. Verifica hash antes de cambiar producto. Conserva originales, copia y cambios del usuario. Git puede tener todos los archivos sin seguir; no asumir rollback por commit.

## Lecturas obligatorias

Lee íntegramente `PROJECT_STATE.md`, `docs/ALPHA_0_2_1_CONTRACT.md`, `docs/fixtures/alpha-0.2.1-objects.json`, ADR-017–019 de `ARCHITECTURE_DECISIONS.md`, `docs/TACTICAL_PIXEL_SPEC.md`, `docs/ACCEPTANCE_RESULTS.md`, `LICENSES_AND_CREDITS.md` y el manifiesto de arte. Del roadmap revisión 7 respeta objetivo/gates, 0.2.1 y relevo; usa contrato 0.2/ADR-016 y su fixture como regresión. Lee la revisión 0.2.1 de `docs/OPEN_SOURCE_REVIEW.md`: no hace falta otra búsqueda general de motores. Consulta notas privadas del pecio y bundle para preservar la interacción, sin copiarlas a recursos públicos.

Inspecciona los tipos/geometría/protocolo compartidos, compilador/navegación/GameState/GameServer, entradas web/renderer, servidor HTTP, pack y bundle Stormwreck y pruebas actuales. El encargo Astra queda archivado en `docs/NEXT_MODEL_PROMPT_ASTRA_ALPHA_0_2_1_HISTORICAL.md`; no ejecutarlo como trabajo nuevo.

## Implementación exigida

1. Integrar wheel en objetos por escena, identidad (sceneId,objectId), capacidades cerradas y estado mutable tipado. Eliminar wheelStates paralelo. Soporte fijo, rueda 1×1 con cuatro orientaciones; intact/damaged/destroyed para rueda/puerta/caja. Restos atravesables conservan ubicación reservada. Transiciones exactas del contrato, sin daño/tiradas automáticos.
2. Geometría y validación compartidas para compilador, servidor, movimiento, teleport y preview. Sólo attached coincide exactamente con mount fuera del suelo. Respetar spawns, marcos, restos, PJ desconectados, ambos extremos de paso y criatura visible en escena/superficie; secretos ocultos no afectan ocupación.
3. object:detach y object:structure; ampliar transform/undo y resolveInteraction con CAS/destino. Un commit síncrono, revisión e historial por mutación. Fingerprint canónico, caché acotada, ACK contextual. Eliminar bypass de comando wheel. Conservar v3 con objectModelVersion:1 obligatorio en handshake/snapshot; DTO schemaVersion:2; rechazo visible de clientes antiguos. Cerradura inicial privada en doorStates del bundle.
4. Solicitud del timón a pie y sin paso: sesión/controlador, escena y versión del objeto vinculadas; cancelar por movimiento/lejanía, pérdida de controlador, desconexión/liberación, mutación del objetivo, escena o caducidad de 120 s. Supera/Falla abre preview con destino; Aplicar separa/coloca y resuelve atómicamente. Cancelar borrador y solicitud son acciones distintas. Undo no revive peticiones ni desplaza PJ.
5. Corregir editor RC2: capturar revisión/generación al crear borrador, invalidarlo por otra revisión/conexión/escena, evitar cola offline, correlacionar ACK, incorporar step.from y sprite de preview. Caminar recalcula validez sin borrar destino. Las vistas públicas sólo reciben resultado confirmado.
6. Crear TODOS los recursos de la sección 8 del contrato mediante skill/herramienta de imagen: cubierta limpia sin rueda/pedestal horneados, soporte, timón montado/separado/dañado/restos y orientaciones, puerta corregida y caja dañada/rota. Inspeccionar referencias y assets antes de editar. Nombres nuevos objects-v3, transparencia real, dimensiones/anclas y procedencia verificadas. Ajustar arte del tabique al fixture si hace falta; conservar navegación y proyección 0.92. No girar PNG oblicuos ni entregar placeholders.
7. Renderer conserva vistas por ID, cambia textura por variante y no recrea props a 20 Hz. Soporte/rueda sin duplicados, restos por debajo de actores, grid/aros legibles. Rechazar catálogos incompletos.
8. Conservar servidor LAN Windows, /dm, /player, /projector, aproximación/cubiertas, joystick/WASD, secretos/PG/mochila, criatura, cámaras, capas y tres SFX. Audio contextual y persistencia están fuera del bloque.

## Verificación y aislamiento

Ejecuta T01–T13 íntegros, tests anteriores y nuevos de estados/red/UI. `node scripts/check-alpha021-design.mjs` sólo valida geometría propuesta, no sustituye runtime. Typechecks, unitarias, build, auditorías baseline/alpha02, integraciones general/objetos y ampliación 0.2.1. Adapta fixtures y flujo de timón a separación con destino sin reducir expectativas.

No reinicies ni uses la mesa 3000 del usuario. Servidores propios en loopback/puerto libre, cierre verificado en finally. Los runners RC2 eligen puerto libre pero apps/server escucha 0.0.0.0: añadir HOST configurable (por defecto 0.0.0.0 para LAN), pruebas HOST=127.0.0.1. No publicar claves ni abrir firewall automáticamente.

Navegador con tres roles, dos DM para stale, carga diferida y reconexión; capturas a 390×844, 844×390 y 1920×1080. Puerta alineada, preview con sprite, soporte vacío, una rueda y restos visibles; consolas sin errores. Separar automatización, navegador y hardware, sin PASS físicos inferidos.

## Cierre

Entrega `0.2.1-rc.1` coherente en package/pack/banner, build ejecutable, recursos/licencias, backup nuevo por hash y guía física sencilla con enlaces actuales. Actualiza README/Windows, manifiesto, aceptación, PROJECT_STATE y roadmap sólo con hechos comprobados. No sobrescribir ZIP RC2 ni desconectar mesa activa para enseñar candidata: preparar arranque separado.

Tras completar todo lo automatizable y visual, guía al usuario para probar solicitud/separación, giro, daño/restos, undo ocupado, reconexión y puerta corregida en Pixel 9a/Chrome y proyector 1080p. RC2 sigue aceptada hasta recibir el informe de 0.2.1. Sol resuelve fallos locales sin otro contrato Astra previo. Sólo escalar una contradicción transversal nueva no resuelta aquí; tras aceptar 0.2.1 tocará Astra para persistencia 0.3. No iniciar 0.3 en este bloque.
