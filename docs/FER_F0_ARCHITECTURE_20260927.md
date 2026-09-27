# Fer / F0 — arquitectura observada y primera integración propuesta

Fecha: 2026-09-27. Responsable: Fer (hlwn), con su Codex. Dani (Nekromanticas) conserva la propiedad de campañas y aceptación jugable.

Base inspeccionada: `dbadd77`, rama de origen `docs/roadmap-compartido-dani-fer-20260927`. Trabajo documental en `fer/f0-architecture`, en el clon local separado `VTT-Dungeons-roadmap`. No es un worktree administrado por la app: su creación no estaba disponible porque la carpeta raíz de este chat no es un repositorio. El clon tiene su propio índice y rama; no comparte la carpeta de Dani.

**Estado: F0 documental entregado; INT0 pendiente de selección conjunta.** No se implementa F1, no se cambia runtime, no se declara adopción ni aceptación de Dani. La inspección es estática y dirigida a fronteras, no una certificación completa de seguridad o ejecución.

**Actualización posterior del mismo día:** el entorno y las pruebas ya se comprobaron en la [línea base técnica](FER_BASELINE_20260927.md): Node 24.21.0, 189/189 tests, tipos, build y cuatro integraciones PASS. Los límites de ejecución del apartado 7 describen el momento de F0 y se conservan como registro histórico.

## 1. Fuentes y precedencia

- [Roadmap compartido](../ROADMAP_COMPARTIDO_DANI_FER.md), [encargo de Fer](CODEX_FER_NEXT.md), [encargo de Dani](CODEX_DANI_NEXT.md).
- [Roadmap del Pecio](../ROADMAP_V1.md), [estado observado](../PROJECT_STATE.md), [decisiones](../ARCHITECTURE_DECISIONS.md).
- [Dirección gráfica](HD2D_DIRECTION.md), [reutilización](OPEN_SOURCE_REVIEW.md), [contrato de persistencia](ALPHA_0_3_PERSISTENCE_CONTRACT.md).
- [Chat compartido](https://chatgpt.com/share/6ab8ce62-1478-83ed-8c6c-a6917d0f801c), recuperado y leído el 27/09: Fer desarrolla el sistema de creación; Dani produce campañas y aporta necesidades. Las propuestas iniciales de carpetas y rama develop no son requisitos de migración; el roadmap posterior conserva el árbol existente y PR pequeñas.

Los documentos conservan historia: el contrato de persistencia menciona protocolo 4 y la dirección gráfica menciona Babylon pendiente, pero el código base tiene protocolo 22 y Babylon instalado. No restaurar esos estados antiguos. La candidata declarada en package.json es 0.3.2-dev.5; su aceptación no se deduce del número.

## 2. Mapa real de dependencias

```text
campaigns/*/server.ts -> tipos/compilador engine/server/campaign.ts
                    -> formatos engine/shared/campaign.ts y terrain.ts
apps/server/index.ts -> selecciona explícitamente Stormwreck o D8
                    -> GameServer / GameState -> navegación y contratos
                    -> PersistenceCoordinator -> SaveStore + codec
                                              -> GameState para hidratar
apps/web/*          -> protocolo y DTOs -> WorldRenderer / AudioDirector
WorldRenderer       -> módulos gráficos engine/client/*
                    -> geometría de Stormwreck y campamentos (acoplamiento)
GameState           -> IDs, progreso y migraciones de campañas (acoplamiento semántico)
```

Las importaciones no cuentan toda la historia: `game.ts` no necesita importar un bundle para depender de los nombres de una campaña. Una búsqueda de imports por sí sola produciría una conclusión incompleta.

## 3. Matriz de capacidades

Clasificaciones: **REUTILIZAR**, **EXTRAER DESPUÉS**, **FALTA** (en el alcance inspeccionado) y **POSPONER**. Riesgo relativo, sin estimaciones de horas inventadas. Las pruebas enlazadas existen; no se han ejecutado en F0.

| Capacidad y estado observado | Evidencia de código / pruebas existentes | Decisión, consumidor y riesgo |
|---|---|---|
| Esquema público de campaña, recursos y escenas; implementado | [campaign.ts](../engine/shared/campaign.ts), `validatePublicCampaign`; [compilador](../engine/server/campaign.ts), `compileCampaignBundle`; [game.test.ts](../engine/server/game.test.ts), campaña sintética y rechazo de bundles incoherentes | REUTILIZAR. Stormwreck y D8 ya consumen el contrato. Bajo si solo se documenta; medio si cambia validación o defaults. No crear otro esquema paralelo. |
| Superficies, alturas, conexiones y movimiento; implementado | [terrain.ts](../engine/shared/terrain.ts), [navigation.ts](../engine/server/navigation.ts); [terrain.test.ts](../engine/shared/terrain.test.ts), [wreck-runtime.test.ts](../engine/server/wreck-runtime.test.ts) | REUTILIZAR. Pecio, Retiro y campamentos. Alto al cambiar ocupación o transiciones; preservar mapa continuo y coordenadas. |
| Objetos, estados y transacciones; implementados dentro de GameState | [game.ts](../engine/server/game.ts), `GameState`; [game.test.ts](../engine/server/game.test.ts), bloque transacciones de objetos | REUTILIZAR; EXTRAER DESPUÉS solo ante necesidad demostrada. Puertas/cajas/timón. Alto: revisiones, reservas, deshacer y persistencia están relacionados. |
| Protocolo, comandos y autoridad; implementados | [protocol.ts](../engine/shared/protocol.ts), `PROTOCOL_VERSION = 22`, `OBJECT_MODEL_VERSION = 1`; [game.ts](../engine/server/game.ts), `GameServer`; [protocol.test.ts](../engine/shared/protocol.test.ts) | REUTILIZAR. DM, jugador y proyector de ambas campañas. Alto si cambia handshake, epoch o semántica de comandos. |
| Proyecciones de datos por rol; implementadas, con lógica de campaña | [campaign-view.ts](../engine/shared/campaign-view.ts), `anonymousCampaignView`; [game.ts](../engine/server/game.ts), `publicSnapshot`, `playerPrivate`, `dmState`; pruebas de privacidad en game.test.ts | REUTILIZAR y caracterizar antes de extraer. Ambas campañas. Alto: ocultación gráfica no sustituye filtrado del servidor. |
| Autenticación y rutas privadas; implementadas en aplicación | [index.ts](../apps/server/index.ts), `privateGuard`, `sameOrigin`, rutas save y estáticas; [integration-test.mjs](../scripts/integration-test.mjs) | REUTILIZAR y revisar por caso. La contraseña DM es opcional por decisión del producto; documentar el modo probado. No afirmar aislamiento absoluto de recursos por disponer de DTO filtrado: `/art` y `/audio` se sirven como recursos públicos. |
| Persistencia de archivo, checksum, recuperación y coordinación; implementadas | [codec.ts](../engine/server/persistence/codec.ts), [store.ts](../engine/server/persistence/store.ts), [coordinator.ts](../engine/server/persistence/coordinator.ts), [persistence.test.ts](../engine/server/persistence/persistence.test.ts) | REUTILIZAR. Stormwreck y D8. Alto: conservar SaveV1, IDs, campaignStateVersion, exclusión de escritor y restauración. El coordinador depende de GameState; no es aún una biblioteca independiente. |
| Migraciones por campaña; acopladas al estado del motor | [game.ts](../engine/server/game.ts), `migrateStormwreckScenes` y bloques condicionados por `d8-night-private`; [one-shot.test.ts](../engine/server/one-shot.test.ts), [persistence.test.ts](../engine/server/persistence/persistence.test.ts) | EXTRAER DESPUÉS. Dos consumidores reales, pero riesgo alto de pérdida de compatibilidad. No es la primera PR. |
| Triggers/progreso y barca del Pecio; lógica específica dentro del motor | [game.ts](../engine/server/game.ts), `rowboat`, ramas `stormwreck-isle` y `wreck.*`; [wreck-m3.test.ts](../engine/server/wreck-m3.test.ts), [game.test.ts](../engine/server/game.test.ts) | EXTRAER DESPUÉS. Consumidor actual Pecio; no inventar una máquina narrativa universal. Mantener decisión DM y semántica del save. |
| Render y composición de campañas; frontera parcialmente acoplada | [world.ts](../apps/web/world.ts), imports de geometría de Retiro/campamentos y ramas por sceneId; [terrain3d.ts](../engine/client/terrain3d.ts), [ship-props3d.ts](../engine/client/ship-props3d.ts) y sus tests | REUTILIZAR renderer; EXTRAER DESPUÉS las configuraciones específicas con un contrato validado. Riesgo medio/alto de selección, oclusión y cambios visuales. |
| Audio y ambiente; piezas existentes | [audio.ts](../apps/web/audio.ts), `AudioDirector`; [ship-ambience.ts](../engine/client/ship-ambience.ts), [audio.test.ts](../engine/server/audio.test.ts), [ship-ambience.test.ts](../engine/client/ship-ambience.test.ts) | REUTILIZAR; generalizar presets en F3 si dos escenas lo necesitan. Las capas ocean/wind/wood/storm siguen presentes en el estado común; no confundir nombres temáticos con una avería. |
| Preparación de recursos; scripts existentes específicos | [process-token-atlas.py](../scripts/process-token-atlas.py), [process-object-art.py](../scripts/process-object-art.py), [generate-audio.mjs](../scripts/generate-audio.mjs) | REUTILIZAR como punto de partida. EXTRAER DESPUÉS una herramienta común basada en fricción de Dani; no certificar derechos ni calidad artística desde nombres de archivo. |
| Regresión sintética y real; existe, distribuida | [game.test.ts](../engine/server/game.test.ts) ya crea una campaña sintética; [one-shot.test.ts](../engine/server/one-shot.test.ts); [run-integration.mjs](../scripts/run-integration.mjs), [alpha03-smoke.mjs](../scripts/alpha03-smoke.mjs) | REUTILIZAR. FALTA en esta entrega una matriz de ejecución actual y un gate de compatibilidad acordado por entrega. No afirmar que faltan todos los tests genéricos. |
| Alta genérica de campaña y generador | [index.ts](../apps/server/index.ts) selecciona dos campañas explícitamente; no hay script de scaffolding en package.json | POSPONER a F4. La selección explícita en el punto de arranque es aceptable hoy. No incorporar carga dinámica de código arbitrario. |

## 4. Fronteras y propiedad

- Fer: `engine/`, contratos transversales, herramientas comunes y regresiones. `apps/` y scripts de integración requieren coordinación cuando cambia la experiencia de Dani.
- Dani: contenido de `campaigns/`, canon, mapas/arte, configuración de encuentros y aceptación física/visual. Un archivo dentro de `engine/` con contenido del Pecio sigue requiriendo su revisión narrativa al extraerlo.
- La composición de la aplicación puede conocer los packs que instala. El objetivo es que navegación, validación, persistencia y herramientas no necesiten nuevas excepciones por cada campaña.
- Conservar `engine/shared`, `engine/server`, `engine/client`, `apps` y `campaigns`. No renombrar a core/shared por imitar el dibujo conceptual del chat.
- No introducir ECS, SQLite, bus de eventos general, editor 3D, IA narrativa ni una nueva dependencia en F0/F1. Reutilización local evaluada; investigación OSS actual solo cuando una necesidad de implementación concreta la justifique. No se afirma haber reevaluado licencias externas hoy.

## 5. Tres candidatos, en orden

| Candidato | Beneficio y alcance | Coste/riesgo y decisión |
|---|---|---|
| **FER-F1-001: gate de compatibilidad de campañas** | Hacer reproducible la comprobación del contrato existente con fixture sintética y casos reales. Reutilizar validadores y tests; añadir solo lagunas demostradas. | Acotado a tests/herramientas/documentación, sin migración ni cambio de runtime. **Seleccionado como propuesta inicial**, pendiente INT0. Beneficia cada integración de Dani. |
| **FER-F2-001: diagnóstico de autoría de escenas** | Presentar errores de datos y referencias de forma útil antes de arrancar una campaña, usando compileCampaignBundle. | Bajo/medio; el validador ya comprueba puertos y objetos, así que un segundo validador sería redundante. Posponer hasta recibir un caso de configuración difícil de Dani. |
| **FER-F3-001: configuración visual por escena** | Separar un bloque pequeño de materiales/presets que hoy se selecciona por sceneId en WorldRenderer. | Medio/alto por impacto gráfico y carga de recursos. Requiere dos consumidores y aprobación visual. Posponer hasta después de la primera integración. |

No se seleccionan migraciones, barca ni narrativa como primera extracción: entrelazan comportamiento ya usado, datos duraderos y decisiones de campaña. Tampoco se abre un calendario de issues especulativas.

### Ticket propuesto FER-F1-001

**Problema observado:** las comprobaciones de contratos están distribuidas, hay fixtures sintéticas embebidas en game.test.ts y herramientas históricas que conservan IDs anteriores (audit-baseline.mjs contiene `wreck-deck`). No se ha ejecutado ese script aquí; la referencia antigua es evidencia para revisarlo, no prueba de fallo.

**Propietario:** Fer. **Consumidores:** integración del Pecio y regresión de D8. **Estado:** PROPUESTO; no es todavía una issue publicada ni un alcance aceptado por Dani.

**Archivos previstos:** tests bajo engine/ cubiertos por vitest.config.ts, helper de fixture solo si tiene dos consumidores, guía del gate; package.json solo si hace falta un comando útil. No modificar campañas ni servidor de producción en este ticket.

**Aceptación propuesta:**

1. Una campaña sintética con IDs propios compila, conserva estado durable al restaurar y filtra información por destinatario. Partir del fixture existente; no introducir un catálogo duplicado de campañas.
2. Un dato inválido (por ejemplo puerto hacia una superficie ausente) se rechaza por el compilador actual. Documentar el test existente o cubrir una laguna, sin duplicarlo por estética.
3. Casos de Stormwreck y D8 siguen pasando: guardado/restauración, objetos y privacidad. Comparar invariantes de dominio; no comparar UUID, tiempos o epochs literalmente.
4. La receta indica versión Node, commit, comandos, estado y límites. Sin escribir saves reales, sin puerto 3000, sin inventar PASS físico.
5. Dani puede ejecutar un recorrido representativo en copia; se registra adopción o incidencia. Pasar tests no cierra INT1 por sí solo.

## 6. Contrato mínimo de integración propuesto — F0-CI-01

Propuesta documental, no ADR aprobada ni API nueva.

| Aspecto | Regla para la primera entrega |
|---|---|
| Unidad de entrega | Una rama/PR, objetivo y commit base explícitos. Un cambio documental y un cambio ejecutable van identificados por separado. |
| Interfaces vigentes | CampaignServerBundle + PublicCampaignDefinition, protocolo 22, objectModelVersion 1, SaveV1. No cambiar versiones por una entrega solo de tests. |
| Compatibilidad | Registrar antes/después de IDs, defaults, DTOs, comandos y captura/restauración. Una extracción interna no autoriza cambiar comportamiento. |
| Cambio incompatible | Proponer adaptador/migración, fixture anterior, ruta de reversión y revisión conjunta antes de adopción. Mantener original; nunca migrar el único save del usuario. |
| Privacidad | Probar por separado DTO anónimo, jugador propietario, otro jugador, proyector y DM. Revisar rutas de recursos además del snapshot si cambia assets. |
| Escritura | Solo el servidor aplica comandos; conservar validación, epoch, revisiones e idempotencia. El renderer presenta, no resuelve autoridad. |
| Publicación | Notas con consumidor real, uso, pruebas y límites. La fusión no equivale a adopción ni a versión aceptada para partida. |
| Adopción | Dani fija versión anterior, prepara copia aislada, prueba candidata y registra resultado. Actualizar instalación real solo cuando lo decida. |
| Reversión | Para F1 de tests: volver al commit previo, sin conversión de datos. Para futuras migraciones: código anterior y copia de datos compatible en entorno separado. |

### Plan de comprobación para F1

Preparación: runtime Node `>=24.21.0 <25`, pnpm fijado por packageManager y dependencias del lockfile. Confirmar scripts y rutas antes de ejecutarlos.

1. Ejecutar la suite existente con `corepack pnpm test` para obtener base real; investigar fallos antes de atribuirlos a una extracción.
2. Completar solo pruebas de contrato ausentes. Ejecutar pruebas pertinentes, `corepack pnpm typecheck` y `corepack pnpm build`.
3. Ejecutar `node scripts/run-integration.mjs`, `node scripts/run-object-integration.mjs` y `node scripts/alpha03-smoke.mjs` para el alcance afectado, tras comprobar su aislamiento. Añadir `node scripts/one-shot-smoke.mjs` si es necesario para D8. No ejecutar scripts históricos a ciegas por figurar en un README.
4. Dani: recorrer acceso, dos PJ, cambio de superficie, interacción con puerta/objeto, guardar/reanudar y reconexión en copia temporal. Seguir el guion M7 para aceptación física; este gate no lo sustituye.
5. Registrar resultados por comando/commit. Un fallo previo se conserva como incidencia, no se elimina el test ni se hereda el PASS de PROJECT_STATE.

## 7. Verificación efectuada y límites

- Lectura de documentos, esquemas, compilación de bundles, selección de campañas, serializadores, persistencia, imports del renderer y pruebas indicadas; búsquedas de IDs/imports y revisión del estado Git.
- Entorno observado: Node **v20.17.0**; package.json exige **>=24.21.0 <25**. `node_modules` no existe en este clon. No se instalaron dependencias ni se cambió el runtime del usuario.
- **Unit tests, typecheck, build, integraciones y pruebas físicas: NO EJECUTADOS en F0.** Los 186 tests registrados en PROJECT_STATE son evidencia histórica de otra ejecución, no de este equipo.
- No se leyó ni modificó un guardado real, no se inició servidor, no se copiaron fuentes privadas al informe. No se publicó una PR ni se contactó con Dani.
- Validación de esta entrega: enlaces relativos locales y `git diff --check`; resultados consignados en el cierre de la entrega.

## 8. Relevo

**Siguiente tarea de Fer:** preparar el entorno compatible y ejecutar la línea base; después afinar FER-F1-001 con los resultados y D0. Si una prueba existente ya cubre el requisito, reutilizarla. Antes de modificar runtime, cerrar INT0 con Dani: necesidad, alcance, dueño y recorrido.

**Entrada pendiente de Dani:** hasta tres necesidades candidatas de D0 y elección del recorrido para adopción. Dani puede continuar M5/M7 mientras tanto.

**Modelo recomendado por el reparto del roadmap:** Sol High para implementación y regresión acotadas; Astra para una decisión transversal nueva. Recomendación documental, sin cambio de modelo ni delegación automática.

F0 queda entregado como auditoría documental. F1, INT0, INT1 y M5/M7 no quedan aprobados por este informe.
