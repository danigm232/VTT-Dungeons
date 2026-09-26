# D&D Immersive Engine — Roadmap hacia v1.0

## Prioridad inmediata — revisión 13, 2026-09-18

[D8 Night: auditoría](docs/D8_NIGHT_AUDIT_20260918.md) y [roadmap de implementación para Sol](docs/D8_NIGHT_SOL_ROADMAP.md) fijan el trabajo inmediato: F0 base; F1 flujo de ataques; F2 persistencia/recuperación; F3 reglas/fichas; F4 monstruos/reflejo; F5 aventura/terreno; F6 presentación; F7 aceptación D8 + regresión Stormwreck. Todas pendientes de implementación/verificación por Sol. No se declara una nueva versión aceptada.

Conservar arquitectura web y dirección Babylon HD-2D, con integración visual después del cierre funcional; Babylon YA está instalado y probado aisladamente. Las referencias inferiores a instalación bloqueada o todavía no realizada son históricas. Los mecanismos de D8 se implementarán en el motor compartido, su contenido en el pack privado. El alcance maestro hacia v1 se conserva; este bloque sustituye únicamente el orden inmediato de trabajo.

## Histórico — revisión 12

Revisión 12 · 2026-09-15 · Alpha0.3 DEV1 en trabajo: persistencia ensayada, puerta FAIL visual. Superficies0.3.1 preparadas, Babylon aún no instalado. Alpha0.2 RC2 sigue aceptada operativamente.

| Campo | Valor |
|---|---|
| ROADMAP_REVISION | 12 |
| CURRENT_VERSION | Alpha0.3.0 DEV1 no aceptada; Alpha0.2.0 RC2 última aceptada |
| CURRENT_STAGE | Guardado/restore automatizados; puerta FAIL visual; QA/hardware pendientes |
| NEXT_TARGET | Cerrar arte puerta0.3 y matriz P01–P15/D01–D05, luego gate físico D06 |
| NEXT_FEATURE_TARGET | Alpha0.3.1 terreno3D integrado tras aceptar0.3; esquema sintético ya preparado |
| PROJECT_STATUS | ACTIVE |
| Próximo bloque de trabajo | Sol termina DEV1 de0.3; instalación Babylon0.3.1 bloqueada por entorno |
| Principio de entrega | Cada versión publicada arranca y permite jugar un recorrido completo |

## 1. Objetivo y límites del producto

Un VTT presencial para D&D: servidor en Windows, DM en PC, jugadores con mapa y control individual desde móviles y mundo público en proyector/TV. Dirección aprobada: sprites2D en escenarios3D con estética HD-2D estilizada, cuadrícula lógica cuadrada permanente de 1,5 m proyectada sobre el terreno y cámara ortográfica oblicua estable. Octopath Traveler inspira atmósfera/composición, no se copia ni se promete su escala de producción. Personajes y criaturas deben poder importarse y distinguirse con claridad.

Decisión vigente: conservar arquitectura web/Node/TypeScript y adoptar Babylon.js, no migrar el producto a Godot/Unity/Unreal. `docs/HD2D_DIRECTION.md` y ADR-023 concretan alcance, límites y transición. Pixi sigue en0.3; Babylon y el nuevo terreno se validan en0.3.1. Visión individual por capacidades configuradas llega en0.7; no existe todavía. Astra y Sol realizan la mayor parte del trabajo técnico y de contenido; el usuario decide y comprueba la experiencia física.

El DM arbitra. Los jugadores declaran intenciones y tiran dados en mesa; el VTT representa las consecuencias autorizadas. No se construye un videojuego de combate automático ni un motor general de física. La cámara mantiene orientación táctica estable y no gira libremente.

La v1.0 incluye campaña local multisesión, objetos preparados que pueden cambiar de estado, editor de escenas, persistencia, audio contextual, visión y edición asistida por IA con aprobación del DM. La partida y las herramientas manuales funcionan sin conexión a un proveedor de IA. La IA es una capacidad adicional instalada/configurada, no una condición para arrancar o seguir jugando.

Stormwreck Isle es la campaña de referencia local. El motor debe admitir otras campañas. Los originales privados y el contenido sin permiso de redistribución no entran en el instalador público.

## 2. Qué significa que cada versión sea funcional

Una versión publicada añade una experiencia completa y conserva las anteriores. Una base de datos, un contrato JSON, un editor vacío o una demostración visual no constituyen por sí solos una versión jugable.

- Una sola entrega activa. Se permiten ramas de investigación, pero no sustituyen la última versión aceptada.
- Antes de empezar, identificar la entrega anterior recuperable: commit/tag si procede y existe historial, o copia identificada de código/build y recursos. No asumir que Git ya contiene todos los archivos.
- Cada bloque se integra con servidor, DM, jugador, proyector, pruebas, recursos y guía de uso aplicables.
- Sin controles visibles que prometan funciones sin implementar. Las capacidades en construcción permanecen fuera de la entrega aceptada.
- Hasta 0.3, indicar expresamente que el estado se pierde al reiniciar; desde 0.3 toda nueva función incorpora guardado y migración.
- Si una versión crece demasiado, dividirla en entregas jugables como 0.2 y 0.2.1. No publicar media funcionalidad.
- Un parche de errores puede salir sin nuevas funciones. No avanzar oficialmente al siguiente hito si hay un defecto bloqueante.
- Falta de hardware: se puede preparar código o investigación; la entrega queda CANDIDATA, nunca aceptada por inferencia.

### Gate común de todas las versiones

G1. Instalación/build y arranque documentados en Windows; partida local sin CDN ni herramientas de desarrollo durante el juego.
G2. Recorrido base: DM entra, al menos dos jugadores se asignan personajes, proyector se prepara, cambio de escena, movimiento independiente, interacción, PG/inventario, reveal/hide y audio.
G3. Permisos: intentos no autorizados rechazados; secretos excluidos de estado público, mensajes, errores y recursos no autorizados. Entradas tardías y reconexiones no reciben información oculta.
G4. Red/control: toque, mantener, soltar, desenfoque, inventario abierto, timeout, doble pestaña, reconexión y cambio durante carga. Un controlador activo por personaje.
G5. Calidad visual: mapa/cuadrícula/colisiones coinciden; pies dentro de su celda, sprites legibles, cámara sin saltos y controles táctiles utilizables.
G6. Caso nuevo de la versión PASS de extremo a extremo; sin regresiones del recorrido anterior. Desde 0.3, comprobar también guardar, cerrar y recuperar.
G7. Evidencias de tests, navegador, hardware y mediciones separadas, con fecha y build. Audio enviado no equivale a audio escuchado.
G8. Arte/dependencias nuevos con origen, licencia o condiciones exactas y avisos conservados. Documentación, incidencias y reversión actualizadas.

### Gate de reutilización, open source y recursos artísticos

Antes de crear o incorporar una capacidad, dependencia o recurso nuevo, hacer una búsqueda breve y proporcional de hasta tres candidatos relevantes. No se repite para cada bug ni obliga a reutilizar algo sólo porque exista.

Para cada candidato se comprueba: repositorio o página exacta y versión si aplica; licencia del código y de los assets por separado; autor/procedencia y requisitos de atribución o redistribución; archivos fuente y facilidad de transformación; encaje con la dirección visual y cámara oblicua; resolución, transparencia y anclas; compatibilidad Windows/Node/web (Pixi hasta0.3, Babylon desde la transición0.3.1), coste de runtime y mantenimiento; y coste real de adaptar frente a crear.

Registrar una decisión `ADOPT`, `ADAPT`, `STUDY`, `REJECT` o `GENERATE` en `docs/OPEN_SOURCE_REVIEW.md`. Si se incorpora, fijar origen, versión/hash cuando proceda, licencia y cambios en `LICENSES_AND_CREDITS.md` y el manifiesto de arte. No descargar, instalar ni servir recursos automáticamente sólo por encontrarlos. Una previsualización de una web no sustituye al archivo licenciado; una licencia del código no cubre necesariamente su arte.

No repetir toda la campaña tras cada cambio de texto. Ejecutar regresiones proporcionales al cambio y el recorrido común antes de publicar una versión.

### Estados y evidencia

- [ ] TODO: trabajo no iniciado.
- [~] PARCIAL: implementado en parte, en curso o sin verificación suficiente.
- [x] PASS: caso concreto verificado en una versión identificada.
- [!] BLOQUEADO: causa y acción necesaria registradas.
- [-] APLAZADO: fuera de la entrega actual; indicar destino.

Registrar por criterio: ID, versión/build, fecha, comando o pasos, resultado, salida/captura/archivo, dispositivo y límite de la prueba. Si una ejecución no pudo arrancar por sandbox o cuota, registrar NO EJECUTADA y conservar separado el último resultado válido. Un archivo existente o un resumen previo no bastan para marcar aceptación completa.

## 3. Categorías permanentes y responsables

Son categorías del trabajo, no equipos que deban ejecutarse simultáneamente.

| Código | Categoría | Entregable | Modelo habitual |
|---|---|---|---|
| PRODUCT / ARCH | Alcance y arquitectura | Contratos, prioridades y decisiones difíciles | Astra High, solo en cruces importantes |
| CORE / NET | Simulación, protocolos, sesiones, LAN | Autoridad y sincronización verificadas | Sol High |
| DM / PLAYER | Interfaces y acciones de mesa | Flujos completos y accesibles | Sol; Terra en UI acotada |
| WORLD | Objetos, huellas, estados, colisiones | Objetos preparados manipulables | Sol High |
| SAVE | Guardado, migraciones, recuperación | Campaña recuperable tras reinicio | Sol High; Astra revisa riesgos |
| EDITOR | Importación y autoría | Crear escenas y fichas sin programar | Sol; Terra en flujos acotados; Astra en contratos |
| VISUAL | Arte, cámaras, capas y visión | Inmersión HD-2D y lectura táctica | Sol; Terra en contenido/ajustes; Astra en límites/percepción |
| AUDIO | Capas, eventos y reproducción | Sonido contextual comprobado | Terra; Sol en integración sensible |
| AI | Propuestas de edición | Validación, preview y aplicación autorizada | Astra diseña límites; Sol implementa |
| RULES | Declaración y arbitraje | Dados físicos y decisión del DM | Sol; sin motor de reglas obligatorio |
| CONTENT | Campaña y assets | Escenas jugables y fichas importables | Terra; Sol en integración; Luna en inventario |
| QA / RELEASE | Regresiones, hardware, distribución | Evidencia, instalador y versión recuperable | Sol; Terra en matriz; Luna en extracción mecánica; Astra en riesgos |
| OSS / DOCS | Reutilización y documentación | Evaluación breve y avisos verificables | Terra; Luna en inventarios/rutas; Astra en decisiones arquitectónicas |

## 4. Astra y Sol como responsables principales

Por decisión expresa del usuario, Astra y Sol llevan las decisiones e integración exigente. Terra y Luna conservan trabajos adecuados a sus capacidades para ahorrar uso de Sol; no son etapas obligatorias de cada versión ni un cambio automático de modelo. El usuario no necesita asumir programación/modelado para suplir el reparto. Esta tabla no decide qué IA ejecutará el VTT en0.8.

| Modelo | Nivel habitual | Encargo adecuado | Salida exigida |
|---|---|---|---|
| GPT-6 Astra | High | Decisión que afecta varias capas, auditoría de permisos/persistencia/IA, bloqueo transversal | Decisión breve, contratos, riesgos y tarea ejecutable |
| GPT-5.6 Sol | High en integración; Medium en fixes claros | Construcción de funciones completas, red, estados, depuración y corrección de regresiones | Código ejecutable, pruebas pertinentes y evidencia |
| GPT-5.6 Terra | Medium; High si la revisión lo justifica | UI acotada, contenido bajo esquema, importación sencilla, pruebas especificadas y documentación técnica | Cambio pequeño verificable sin rediseñar contratos |
| GPT-5.6 Luna | Low o Medium | Revisar enlaces/rutas, inventariar assets, normalizar manifiestos, resumir logs ya disponibles y preparar checklists | Resultado mecánico revisable con fuentes concretas |

Reglas de ahorro:

1. Un modelo por bloque coherente. Astra decide contratos transversales, Sol integra y Terra/Luna reciben bloques adecuados cuando aportan ahorro real. No pasar versiones por cuatro modelos ni delegar automáticamente.
2. Sol conserva los arreglos rutinarios que encuentre al implementar; no gastar otro traspaso para una línea de CSS.
3. Usar Astra al cerrar contratos de entidades, persistencia, visión o IA, o ante dos intentos razonados fallidos sobre el mismo problema transversal. No reservarle toda prueba ni todo cierre.
4. Terra puede liderar contenido/editor/audio con contrato cerrado; Luna hace extracción e inventario mecánicos. Sol conserva integración y permisos. Astra interviene si hay una decisión transversal, no para cada ajuste artístico.
5. Luna no certifica por sí sola seguridad, licencias ambiguas, migraciones ni aceptación final. Puede extraer evidencias para su revisión.
6. Pedir cambio manual al terminar un bloque: modelo + razonamiento + motivo + prompt de continuación + archivos mínimos. No cambiar automáticamente ni crear subagentes por este reparto.
7. Una reserva agotada no se reintenta en bucle ni se interpreta como acceso garantizado a otro cupo. Registrar pendiente y continuar trabajo independiente autorizado.
8. Reducir contexto a estado, contrato del bloque, archivos afectados y evidencia. No reenviar toda la historia o repetir investigaciones ya resueltas.
9. No prometer ahorro porcentual ni convertir precios API en cuota de cinco horas de Codex. Medir utilidad por resultado, retrabajo y traspasos, no solo por tokens.

Asignación propuesta como criterio de ingeniería para este proyecto. Las capacidades generales se contrastaron con el [catálogo oficial](https://developers.openai.com/api/docs/models) y la [guía oficial de modelos](https://developers.openai.com/api/docs/guides/latest-model). Disponibilidad y límites dependen de la cuenta; no se certifican aquí.

## 5. Auditoría de cierre de Alpha 0.1.1

Hay implementación y resultados previos válidos de build, typecheck, ocho unitarias, cuatro probes e integración básica. No se han vuelto a ejecutar en esta sesión de planificación. La afirmación anterior de que solo faltaba hardware era demasiado amplia.

Inspección de código del 2026-09-13 que originó RC1:

| ID | Hallazgo o incertidumbre | Evidencia de inspección | Acción de cierre |
|---|---|---|---|
| A01 | Timón: disponibilidad privada no se recalcula/emite tras terminar pasos | engine/server/game.ts: tick y broadcastSnapshot no llaman a broadcastPrivate; sí los comandos DM | Llegar andando, habilitar interacción, alejarse y deshabilitarla sin comando auxiliar |
| A02 | Input puede enviarse desconectado; inventario no detiene controles | apps/web/player.ts: send no verifica socket.connected; showModal no llama a stop | Evitar cola/replay, detener intención al abrir modal y al cambiar epoch; probar |
| A03 | Claims de reconexión/controlador y tres SFX exceden cobertura automatizada | scripts/integration-test.mjs no reconecta ni reemplaza controlador; solo comprueba trueno | Añadir casos reales de red y probar cada SFX, sin equiparar eventos a escucha |
| A04 | Cámara y geometría requieren revisión táctica | apps/web/world.ts fija transformación directamente; pack usa rangos de celdas aproximados sobre imagen | Paneo suave, escala móvil, casco/obstáculos/escaleras alineados; declarar aproximaciones |
| A05 | Audio pausa/recarga puede tener carreras | apps/web/audio.ts cancela pausa pendiente en cualquier apply, incluso al actualizar otra capa | Probar pausa de A seguida de cambio en B, carga tardía y reinicio rápido; estado real de audio |
| A06 | Engine aún importa campaña concreta | engine/server/game.ts y navigation.ts importan el pack Stormwreck | Resolver inyección al preparar 0.2; no duplicar engine para más mapas |
| A07 | Instalación y avisos no plenamente certificados | INSTALAR.cmd, package.json y LICENSES_AND_CREDITS.md | Verificar combinación Node/pnpm exacta, avisos distribuidos y arranque sin runtime Codex |
| A08 | Resultado público requiere pruebas negativas más amplias | Auditoría actual acota cuatro invariantes | DM no autenticado, jugador intentando comandos ajenos, cookies malformadas y entradas tardías |
| A09 | Idempotencia recuerda IDs antes de conocer resultado | engine/server/game.ts: rememberCommand antes de applyDmCommand | Repetir comando rechazado debe conservar su resultado, no anunciar éxito; limitar solicitudes |

Estado RC4/0.2: A01, A02, A03, A05, A07, A08 y A09 tienen PASS automatizado u operativo según su alcance; A04 conserva límites de hardware; A06 quedó implementado y probado con la inyección genérica de 0.2 RC2. Evidencia detallada en `docs/ACCEPTANCE_RESULTS.md`.

Los hallazgos son de inspección; no se presentan como nuevas pruebas ejecutadas. El arte necesita validación del usuario frente a sus referencias: fondos existentes y fichas estáticas con oscilación no equivalen a una animación de caminar por fotogramas.

## 6. Secuencia de versiones jugables

Como regla general dependen de aceptar la anterior. Excepción expresa del usuario15/09: integrar corrección pendiente de puerta0.2.1 y persistencia en0.3, con aceptación física de ambas al final; no declara RC1 aceptada. Cada gate específico se suma a G1–G8. Las entregas 0.2.1 y 0.4.1 acotan tamaño sin dejar versiones intermedias inutilizables.

| Versión | Qué podrá hacer el grupo al terminar | Categorías principales | Modelo líder |
|---|---|---|---|
| 0.1.1 | Jugar el pecio sin depender de comandos auxiliares y con controles/red probados | CORE, NET, PLAYER, QA | Sol High |
| 0.2 | Abrir una puerta y mover una caja que cambian el paso | WORLD, DM, VISUAL | Sol High; contrato Astra acotado |
| 0.2.1 | Arrancar, trasladar y romper objetos preparados sin duplicar el fondo | WORLD, VISUAL, CONTENT | Sol High |
| 0.3 | Guardar la partida y continuarla tras reiniciar | SAVE, NET, RELEASE | Sol High; diseño Astra |
| 0.3.1 | Jugar una escena HD-2D integrada con relieve, grid, oclusión y un ambiente | CORE, VISUAL, SAVE, NET | Sol High; contrato Astra |
| 0.4 | Importar/configurar y jugar otra escena3D preparada sin editar código | EDITOR, CONTENT | Sol |
| 0.4.1 | Importar fichas, preparar encuentros y gestionar PG/inventario desde el DM | EDITOR, DM, PLAYER | Sol |
| 0.5 | Declarar acciones y resolver consecuencias autorizadas con dados físicos | RULES, WORLD, DM | Sol High |
| 0.6 | Jugar con sonido contextual, ambientes reutilizables y efectos de objetos | AUDIO, VISUAL | Sol |
| 0.7 | Explorar con visión individual autorizada en móvil y vista compartida DM | VISUAL, CORE, NET | Sol High; contrato Astra |
| 0.8 | Pedir cambios a la IA, revisarlos, aplicarlos y deshacerlos | AI, WORLD, SAVE | Sol High; límites Astra |
| 0.9 | Recorrer Stormwreck Isle y continuar entre sesiones | CONTENT, QA | Sol |
| 1.0.0-beta.N | Instalar y mantener partidas largas de forma repetible | RELEASE, QA | Sol |
| 1.0.0 | Jugar la campaña completa sin herramientas de desarrollo | Todas | Auditoría focal Astra si quedan riesgos |

### Alpha 0.1.1 — Cerrar la base existente

Entrega: aproximación y cubierta jugables con DM, dos jugadores y proyector, manteniendo dados físicos.

- [x] Reproducir/corregir A01–A05, A07–A09 en el alcance automatizable; A06 acotado para 0.2 sin reescribir el renderer.
- [~] Timón andando y Falla: PASS físico; corte al abrir mochila mientras se mantiene input todavía no confirmado físicamente.
- [~] Dos personajes asignados con móvil + PC, personaje ocupado, liberar/reentrar Mike y reconexión: confirmados; movimiento simultáneo sostenido y cambiar a otro PJ después de liberar no confirmados.
- [~] Movimiento visible en proyector y cámaras: PASS físico; alineación completa de casco/bote y resolución/FPS no medidos.
- [x] Windows, IP LAN HTTP, DM/jugador/proyector, proyector/TV y audio: PASS funcional físico; datos exactos de equipo/firewall no anotados.
- [~] Recorrido real de 10 minutos y mediciones iniciales según sección 8: pendiente de registrar; no bloquea el gate funcional de esta Alpha.
- [x] Actualizar aceptación con salidas reales/límites y conservar copia recuperable previa por hash.

Estado operativo aceptado para continuar, sin defecto bloqueante reportado. **G1–G8 no están todos certificados**: conservar los pendientes explícitos de docs/ACCEPTANCE_RESULTS.md y completarlos en la siguiente prueba física. No convertir este cierre operativo en una rebaja de los gates de las versiones futuras.

Modelos: Sol High lidera; Terra puede ordenar evidencias; Luna solo listas/documentación. Astra solo si la corrección obliga a cambiar un contrato transversal.

### Alpha 0.2 — Puerta y caja interactivas

Contrato decidido: [docs/ALPHA_0_2_CONTRACT.md](docs/ALPHA_0_2_CONTRACT.md), ADR-012–016. RC2 corrige los siete fallos reproducidos por la auditoría y completa editor, arte y pack inyectado. El recorrido físico de [docs/ALPHA_0_2_PHYSICAL_CHECK.md](docs/ALPHA_0_2_PHYSICAL_CHECK.md) quedó PASS el 2026-09-14 con Pixel 9a, portátil MSI, Chrome, ambas orientaciones y salida 1080p. La perspectiva demasiado frontal de la puerta queda como pulido visual del siguiente ciclo, sin bloquear la aceptación funcional.

Entrega: en una escena de prueba jugable del pecio, el DM abre/cierra una puerta y mueve una caja; los jugadores ven y respetan el paso actualizado.

- [x] Pack: schema público, bundle privado, compilación validada, consumo de tres clientes y campaña sintética sin timón/encuentro.
- [x] Huellas/rutas: cuatro escenarios del fixture, marco abierto, giro 2×1/1×2 y centro visual coherente.
- [x] Puerta: open/closed/locked con bloqueo privado y tipos discriminados.
- [x] Editor DM: mapa, selección por clic/lista, contorno, preview privado, aplicar/cancelar/Escape y undo.
- [x] Colisiones: terreno, objetos, spawns, PJ conectados/desconectados, ambos extremos de paso y criatura visible.
- [x] Transacciones: revisión por escena, revisión pública del mundo, CAS de dos DM, retry/fingerprint y permisos específicos.
- [x] Arte dedicado: fondo limpio 576×432 y sprites separados de puerta/caja registrados en manifiesto.

Gate: abrir puerta → cruzar → cerrar; mover caja → bloquear ruta → restaurar; preview cancelado sin efecto público; jugador no autorizado rechazado; reconexión al estado vigente. Ejecutar O01–O12, corregir la auditoría y revisar navegador/arte antes del recorrido físico. No trasladar los PASS de RC4 a 0.2 ni omitir funciones del contrato para declarar una versión funcional.

OSS Gate cerrado por Astra: Map/TypeScript y dependencias instaladas; Miniplex DEFER, Matter.js REJECT para este alcance. Fuentes y motivos en docs/OPEN_SOURCE_REVIEW.md.

Estado: **Alpha 0.2.0 RC2 aceptada operativamente**. Las métricas de FPS/latencia y el pulido artístico pendiente siguen visibles y no se confunden con un fallo del recorrido jugable.

### Alpha 0.2.1 — Timón separable y destrucción preparada

Contrato cerrado por Astra: [docs/ALPHA_0_2_1_CONTRACT.md](docs/ALPHA_0_2_1_CONTRACT.md), ADR-017–019 y fixture de geometría. **RC1 está implementada, pero no aceptada**: typechecks, 23/23 unitarias, build, auditorías e integraciones PASS. La prueba física del 15/09 confirmó muchas funciones, pero encontró FAIL visual de puerta abierta/cerrada que prevalece sobre la QA de navegador. Véase [informe físico](docs/ALPHA_0_2_1_PHYSICAL_REPORT_20260915.md).

Entrega: el DM arranca el timón, lo mueve/rota y lo coloca como obstáculo; rompe un objeto preparado y todos ven sus restos.

- [x] Fondo limpio local, sprite de timón separado y soporte visibles en estados correctos.
- [x] Estado estructural intacto/dañado/destruido y relación unido/separado, según capacidades de cada tipo.
- [x] Transformación visible, sombra de contacto, orden de capas y huella de colisión coherentes en automatización/navegador.
- [x] Deshacer separación/destrucción dentro de la sesión; ocupación validada también al deshacer.
- [x] Petición del jugador → arbitraje manual DM → consecuencia, usando el flujo existente hasta generalizarlo en 0.5.
- [!] Corrección visual de puerta: cerrada cenital pero abierta casi frontal, sin marco/bisagra coherentes en las dos capturas físicas. Colisiones RC2 conservadas. Astra diseña y Sol integra una candidata correctiva.
- [x] Daño y restos de puerta/caja; cascada de revisiones, invalidación de borradores y solicitudes antiguas comprobadas.
- [~] Recorrido físico parcial según `docs/ALPHA_0_2_1_PHYSICAL_REPORT_20260915.md`: timón, daño, colisiones, undo, conexión y audio positivos; puerta abierta/cerrada FAIL visual; rojo ocupado y Escape sin huella confirmados después; verde válido y móvil vertical/horizontal pendientes (móvil aplazado al cierre0.3).

Gate: caso completo del timón con reconexión, sin timón original fantasma; objeto destruible deja los restos/colliders previstos; puerta/caja y movimiento siguen funcionando.

No requiere segmentar una imagen arbitraria durante la partida. Se preparan recursos antes; segmentación/inpainting general permanece post-1.0.

### Alpha 0.3 — Guardar y recuperar partidas

Entrega: tras mover caja, separar timón, romper puerta y editar PG, el DM guarda, cierra y retoma la misma mesa.

Contratos Astra cerrados2026-09-15: [persistencia](docs/ALPHA_0_3_PERSISTENCE_CONTRACT.md), [puerta](docs/ALPHA_0_2_1_DOOR_VISUAL_CONTRACT.md), [aceptación](docs/ALPHA_0_3_ACCEPTANCE_PLAN.md), ADR-020–022 y fixtures sintéticos. DEV1 implementa una parte extensa de persistencia con pruebas unitarias/integración/reinicio/recuperación; no acredita toda la matriz ni el arte. El usuario aplazó puerta/móvil físicos hasta terminar esta entrega conjunta: no esperar otro gate0.2.1 ni trasladar PASS antiguos.

- [~] Esquema versionado de campaña/escenas/entidades/PG/inventario/reveal/objetos/audio persistente; fixture real round-trip PASS, matriz hostil incompleta.
- [~] Guardado manual y automático transaccional; SAVED corresponde a commit validado, inyección de fallos de disco pendiente.
- [~] Paso en curso: destino comprometido se guarda; caso adverso de paso durante caída pendiente.
- [~] Efímeros/sesiones/undo excluidos y runtimeEpoch nuevo; prueba de red multicliente tras restore pendiente.
- [~] Backup/migración0/active corrupto y restore explícito PASS en ensayos; dos archivos corruptos/fallos Windows pendientes.
- [~] Exportar/importar copia privada bajo cookie DM/Origin/CSRF; prueba hostil ampliada pendiente.

Gate: cierre normal y terminación inesperada; recuperar todas las operaciones confirmadas como guardadas; probar restauración de backup y migración con archivo de prueba. Sustituye la promesa imprecisa de «cero pérdida» por una garantía de durabilidad medible.

OSS decidido: node:fs/JSON privado + Zod existente, sin dependencia nueva; node:sqlite/better-sqlite3 diferidos por alcance/mantenimiento, no por incompatibilidad con Node24 elegido. package/lanzadores alineados a rama24 desde24.21.0; sin publicación RC. Fuentes y límites en OPEN_SOURCE_REVIEW; no se instalaron alternativas.

### Alpha 0.3.1 — Recorrido HD-2D integrado

Entrega posterior a aceptar0.3: una escena sintética con Babylon.js, personajes2D y dos niveles3D, escalera/rampa, paso elevado con espacio inferior, grid integrado, oclusión geométrica, puerta y objeto manipulable, luz dinámica y un ambiente reutilizable. Mantener mapa/control móvil, DM, proyector, preview privado, aplicar/cancelar, undo y guardar/reabrir. Referencia: `docs/HD2D_DIRECTION.md`.

Preparación DEV: `engine/shared/terrain.ts` y fixture sintético del puente distinguen ground/bridge en una celda, rampa y transición explícita; 3 pruebas PASS. Aún no forman parte del pack público, el protocolo, el save ni un renderizador. Descarga de Babylon9.26.0 (Apache-2.0) denegada por el entorno; no presentar esta base como gate0.3.1.

- [ ] Astra cierra contrato ejecutable de superficies, pack, selección, protocolo y migración desde0.3 antes de que Sol implemente; la decisión del motor ya está cerrada.
- [ ] Sol fija versión/licencias, integra y automatiza una receta de escena reproducible. WebGL2 inicial, sin CDN, sin exigir editor externo al usuario.
- [ ] Fichas con anclaje de pies, animación sencilla preparada y profundidad correcta; cuadrícula distingue superficies superpuestas. No física continua ni IK prometida.
- [ ] Escenas anteriores conservadas durante transición; copia0.3 recuperable y guardados compatibles mediante migración explícita, sin sobrescritura a ciegas. Pixi temporal, no doble motor permanente.
- [ ] Medir calidad y rendimiento en dispositivos reales (objetivo inicial60fps proyector1080p/30fps móvil, 5PJ y efectos moderados), con calidad móvil reducida sin ampliar permisos.

Gate: recorrido integrado de30min y reinicio/restauración, dos jugadores/proyector, pruebas de superficies/objetos/reconexión y receta reproducible. Registrar dispositivos y límites, no sustituir hardware por viewport. Sin editor general, percepción individual completa ni conversión PDF. Si crece, dividir con entregas jugables; no presentar demo aislada como plataforma terminada.

### Alpha 0.4 — Crear y jugar escenas

Entrega: el DM importa otra escena3D preparada, configura cuadrícula/superficies y entrada, conecta dos escenas y juega sin editar TypeScript ni modelar desde cero.

- [ ] Formato de manifiesto validado y versionado que el engine consume sin imports de campaña.
- [ ] Importar recursos3D preparados (glTF/GLB y manifiesto validado), configurar superficies, alturas/conexiones, grid, colisiones, spawns, hotspots y objetos preparados; separar decoración de navegación. Imagen sólo como referencia o compatibilidad plana explícita, no supuesta conversión3D.
- [ ] Guardar borrador, validar, publicar escena y reabrirla para editar; distinguir contenido base del estado de una partida.
- [ ] Conectar escenas, definir entrada de grupo y cargar con estados/secretos/audio correctos.
- [ ] Rutas de assets locales controladas; rechazar traversal, formatos incompatibles, tamaños excesivos y falta de recursos con mensajes claros.

Gate: una segunda escena creada sin código, transición ida/vuelta con dos jugadores/proyector, guardar y volver a abrir; conservar el pecio anterior.

OSS: importadores Babylon/glTF y herramientas de autoría reutilizables frente a editor VTT acotado. Tiled/LDtk sólo para compatibilidad2D si aporta valor. Una herramienta externa puede preparar recursos con flujo automatizable/documentado; no exigir al usuario aprenderla ni construir un modelador general.

### Alpha 0.4.1 — Fichas y preparación de encuentros

Entrega: el DM importa un PJ o monstruo, lo prepara oculto, lo revela y lo usa en la escena sin programar.

- [ ] PNG con transparencia, tamaño de ficha, anclaje de pies, color de aro, nombre público y notas privadas.
- [ ] Crear/sustituir tokens y configurar huellas; atlas/idle/caminar si se suministran, con fallback estático honesto.
- [ ] Asignar dueño, editar PG e inventario manualmente desde DM; jugador recibe solo lo propio.
- [ ] Preparar encuentros, posiciones, revelado individual y entradas tardías; guardar todo lo nuevo.
- [ ] Una escena adicional de campaña utiliza el flujo de autoría, no recursos hardcodeados.

Gate: importar tres fichas distinguibles, mostrar una criatura solo tras revelar y restaurar fichas/inventarios después del reinicio. No incluye constructor completo de personajes D&D.

### Alpha 0.5 — Intenciones y consecuencias de mesa

Entrega: un jugador pide arrancar, empujar, romper o saltar; el DM decide automático/tirada/imposible, registra resultado y aplica la consecuencia.

- [ ] Peticiones genéricas con objetivo y estado; CD/tipo de tirada opcionales definidos por DM, dados físicos.
- [ ] Resultado éxito/fracaso/cancelación; consecuencia previsualizada y comando ya soportado por WORLD.
- [ ] Permiso temporal solo si aporta al caso: objetivo, jugador, acción, duración/usos y revocación al terminar/desconectar/cambiar escena.
- [ ] Medición por casillas, marcadores/áreas básicas e iniciativa manual opcional; el movimiento no impone reglas de combate.
- [ ] Registro de decisiones y deshacer consecuencias válidas, sin automatizar reglas no solicitadas.

Gate: timón, caja, puerta y salto con éxito/fracaso/cancelación; petición repetida, escena obsoleta y uso de permiso sobre otro objeto rechazados; persistencia coherente.

OSS: no exige motor SRD. Si una regla reutilizada lo necesita, verificar repositorio exacto, edición y licencia. Los nombres dnd-srd-engine y battlecast-engine del roadmap anterior son pistas no validadas.

### Alpha 0.6 — Audio contextual y efectos de estado

Petición de calidad Q-AUDIO-01 (2026-09-13): mejorar los SFX de síntesis local de RC4 con recursos de mejor calidad y licencia verificada, conservando mezcla y deduplicación. Puede adelantarse como mejora acotada después de 0.2; no necesita esperar al audio contextual completo ni otro rediseño de arquitectura. Ningún catálogo externo se declara ya incorporado.

Entrega: una escena jugable reacciona visual y sonoramente a puerta, timón, destrucción y fuego/humo.

- [ ] Ampliar Howler existente: música/ambiente por escena, SFX por evento, crossfade, precarga, volúmenes independientes y parada fiable.
- [ ] Estado real de AudioContext, recuperación con gesto cuando sea necesario, no repetir eventos antiguos.
- [ ] Componentes preparados y reutilizables fuego/humo/lluvia/oleaje, viento/banderas y luces dinámicas, asociados a estados explícitos. Biblioteca acotada a campaña; prioridad a inmersión y lectura de fichas/grid. No programar un sistema ambiental distinto por escena.
- [ ] Ardiendo/mojado/congelado/corroído como efectos por capacidad cuando haya representación y consecuencia definida; sin simulación química o propagación automática.
- [ ] Margen de mezcla y recursos con licencia registrada. Ducking opcional, sin bloquear la entrega.

Gate: sesión de 30 minutos con cambios de escena, capas independientes, los tres SFX, carga tardía, pausa y reconexión; escucha real sin cortes o saturación perceptibles. Fuego/humo se pueden activar, apagar, guardar y restaurar.

### Alpha 0.7 — Niebla, visión e iluminación táctica

Entrega: explorar interior/exterior con información que el DM comparte de forma controlada.

- [ ] Modelo explícito: proyector muestra la zona pública/compartida aprobada por DM; móvil puede tener su visión autorizada; secretos del DM nunca entran en la unión.
- [ ] Niebla manual primero como circuito vertical; añadir LoS/FOV y luz táctica dentro de una entrega siguiente si el bloque crece.
- [ ] Servidor filtra información según permiso/visión; ocultar un sprite en cliente no protege su posición.
- [ ] Puertas y objetos dinámicos actualizan visión; modo de corrección manual del DM.
- [ ] Conservar relieve/superficies y oclusión geométrica de0.3.1; ayudas de legibilidad sólo para fichas autorizadas. Iluminación visual y alcance de percepción separados; sin motor de física general.
- [ ] Percepción por capacidades y alcance configurados por DM/edición, no inferidos de raza o apariencia. Caso personaje con visión en oscuridad frente a otro sin ella: móviles distintos y proyector compartido elegido por DM, sin unión automática.
- [ ] Filtrado servidor incluye información de entidades, geometría y recursos que sean secretos. Auditar catálogo/endpoints/assets/cachés, reconexión, carga tardía y cambio de controlador. Niebla o shader cliente no son autorización.

Gate: criatura detrás de puerta ausente del payload no autorizado; al abrir/revelar aparece según política; cerrar, reconectar y restaurar no filtran. Proyector compartido y móviles conservan coherencia. Rendimiento dentro del perfil acordado.

OSS: PlanarAlly/rot.js se evalúan por función concreta, licencia y adaptación; no se migrará el VTT entero para obtener FOV.

### Alpha 0.8 — Edición asistida por IA

Entrega: el DM selecciona caja, pide «préndele fuego y haz que emita humo», revisa la propuesta, aplica o cancela y puede deshacer.

- [ ] Un adaptador inicial, contrato de acciones cerrado sobre primitivas ya probadas en 0.2–0.7.
- [ ] Contexto mínimo autorizado de selección/escena, validación, preview sin mutación, aprobación y aplicación atómica a la revisión esperada.
- [ ] Rechazar acciones ajenas al contrato, peticiones duplicadas, destino cambiado tras preview y contenidos que intenten dar instrucciones fuera de la partida.
- [ ] Log, cancelación, fallo de proveedor, timeout/cuota y reversión; datos guardados tras aplicación.
- [ ] Interfaz manual disponible sin IA, sin conexión ni credenciales del proveedor.
- [ ] No ejecutar shell, modificar código del proyecto o dar acceso general al equipo desde una propuesta de juego.

Gate: diez intenciones distintas (incluyendo caja ardiendo) con primitivas existentes, cancelaciones y propuestas inválidas; ninguna mutación antes de aprobar; reinicio y caída del proveedor no interrumpen las funciones manuales.

OSS: evaluar interfaz oficial soportada de Codex/SDK/MCP o un proveedor local al iniciar el bloque. No asumir que cuenta ChatGPT implica API gratuita, que Codex CLI es un servidor embebible, ni que MCP aporta por sí solo autenticación. Elegir un camino; Ollama es alternativa, no segunda implementación obligatoria.

### Alpha 0.9 — Stormwreck Isle completa

Entrega: preparar, dirigir y retomar la campaña completa con las herramientas del VTT.

- [ ] Retiro del Dragón, Cuevas de Pleamar, pecio y Observatorio del Acantilado, verificados contra los materiales privados del usuario.
- [ ] Conexiones, criaturas/PNJ, objetos importantes, estados, audio, iluminación y secretos; incorporar lo ya creado en versiones previas.
- [ ] Usar editor/manifiestos y registro de procedencia; no volver a hardcodear capítulo en engine.
- [ ] Sesiones reales documentadas hasta cubrir todas las zonas y continuidad de campaña; cuatro sesiones no prueban por sí solas toda la aventura.
- [ ] Si contenido no tiene permiso de distribución, instalarlo solo en el entorno local y usar contenido de demostración distribuible para el paquete general.

Gate: campaña recorrible de principio a fin, reanudable y sin editar código durante una sesión; cubrir transiciones críticas aunque el grupo no tome todas las rutas narrativas.

### Beta 1.0.0-beta.N — Estabilidad y distribución

Entrega: instalar, actualizar y recuperar una mesa completa de forma repetible.

- [ ] Paquete Windows autocontenido o flujo instalado estable, sin ruta a la caché de Codex; definir Node/pnpm necesarios si no se empaqueta runtime.
- [ ] Actualización/migración con backup, vuelta a build anterior con copia compatible de datos y recursos públicos completos.
- [ ] Android y, cuando se disponga, iOS; declarar navegadores/versiones soportados y no probados.
- [ ] Pruebas de 2 y 4 horas, Wi-Fi doméstica/degradada, reinicio inesperado y recuperación; matriz final de regresiones.
- [ ] Avisos de terceros, guía de DM/jugador, instalación limpia y ninguna función grande nueva salvo para quitar un bloqueo.

Gate: recorrido completo, criterios de rendimiento, recuperación y aceptación física PASS en el perfil soportado; ninguna pérdida confirmada ni filtración pendiente. La etiqueta beta no sustituye evidencia.

### Versión 1.0.0 — Entrega estable

- [ ] Todos los gates previos aplicables aceptados y trazables.
- [ ] Campaña multisesión jugable desde Windows, móviles y proyector.
- [ ] Escenarios3D con sprites2D, relieve/grid coherentes, oclusión, ambientes/luces reutilizables y perfil móvil probado; editor, objetos preparados, persistencia, audio, visión individual autorizada y edición IA aprobada por DM operativos.
- [ ] Funciones manuales de mesa siguen disponibles si IA no responde.
- [ ] Instalación/actualización documentadas, copias recuperables y licencias de lo distribuido verificadas.
- [ ] Cero defectos bloqueantes conocidos; limitaciones no bloqueantes declaradas y acordadas.

Versiones futuras solo después de la estabilidad: extracción arbitraria de objetos de mapas (SAM/inpainting), física avanzada, PNJ conversacionales, voces, generación de aventuras y nuevos proveedores. Los assets de objetos previstos se preparan previamente; no se promete reconstrucción automática de cualquier dibujo en v1.0.

## 7. Reutilización open source sin investigación interminable

Ejecutar un OSS Gate al entrar en una capacidad nueva o cambiar una dependencia relevante. No repetirlo para cada bug, pantalla o mapa.

1. Formular una necesidad concreta y comprobar si las bibliotecas instaladas ya la resuelven.
2. Revisar inicialmente hasta tres candidatos útiles con fuentes primarias; ampliar solo si ninguno encaja.
3. Verificar repo exacto, versión, licencia del código y assets por separado, mantenimiento, compatibilidad Windows/Node/web/Babylon (Pixi sólo durante transición) y dependencias transitivas.
4. Comparar ADOPT / ADAPT / STUDY / REJECT / DEFER frente al coste de código propio acotado.
5. Prueba mínima de integración solo si hay una duda material; fijar antes pregunta y criterio de salida.
6. Registrar decisión reutilizable en docs/OPEN_SOURCE_REVIEW.md y condiciones/avisos en LICENSES_AND_CREDITS.md.

Un repositorio activo no garantiza idoneidad. OpenGameArt y catálogos similares no tienen una licencia uniforme. Recursos generados no se declaran automáticamente CC0. No usar una dependencia de física para resolver decisiones de mesa.

## 8. Rendimiento, pruebas físicas y disponibilidad

Objetivos de aceptación propuestos para el perfil inicial, no mediciones obtenidas:

| Área | Objetivo / método |
|---|---|
| Perfil | Windows del DM + proyector/TV 1920×1080 + hasta 5 móviles; anotar CPU/GPU, navegador, resolución y Wi-Fi |
| FPS | Proyector objetivo 60 FPS; mínimo 30 FPS sostenidos en dispositivos declarados, registrar percentiles de frame time y pausas |
| Movimiento | p50 menor de 150 ms y p95 menor de 200 ms de intención a primer cambio visible en LAN objetivo; separado de los 300 ms del paso |
| Muestreo | Al menos 100 movimientos identificados; ACK mide red/servidor, no equivale a latencia visual extremo a extremo |
| Reconexión | Objetivo: recuperar control/estado en 5 s tras recuperar conectividad y cargar recursos; sin repetir intenciones ni SFX |
| Escenas | Medir carga fría/caliente; mostrar preparación y bloquear controles hasta scene-ready, nunca simular «listo» |
| Duración | 10 min en 0.1.1; 30 min por nueva versión funcional; 2 y 4 horas antes de 1.0 |
| Memoria | Medir base y tras ciclos de cambio de escena/reconexión; investigar crecimiento sostenido sin estabilizar |
| Audio | Escucha en salida física con música/ambiente/SFX, pausa, reconexión y saturación; no inferirlo de logs |
| Compatibilidad visual | 390×844, 844×390 y 1920×1080; capturas del viewport correcto más validación física de legibilidad |

Si el equipo objetivo no alcanza un umbral, optimizar o acordar y documentar otro perfil antes de aceptar; no rebajar silenciosamente la meta.

## 9. Traspaso de modelo y continuidad

Al cerrar un bloque, actualizar este archivo, PROJECT_STATE.md y docs/ACCEPTANCE_RESULTS.md solo en las partes comprobadas. NEXT_MODEL_PROMPT.md contiene un encargo activo único; los antiguos se archivan. Ante discrepancia: roadmap gobierna orden/alcance, especificación táctica gobierna aspecto/control y aceptación gobierna evidencia. Las instrucciones explícitas del usuario prevalecen.

Plantilla de traspaso breve:

- Versión actual y gate pendiente.
- Modelo/nivel recomendado y motivo concreto.
- Objetivo acotado y resultado jugable.
- Archivos mínimos y contratos que respetar.
- Hechos probados, defectos reproducidos e incertidumbres.
- Pruebas necesarias y tarea física que requiere al usuario.
- Estado del build/guardado recuperable y siguiente paso.

No pedir al usuario cambiar de modelo por calendario ni por completar esta tabla. Si ya estamos en el modelo adecuado, continuar allí.

## 10. Registro de esta revisión

ROADMAP_CHANGE_PROPOSAL — aplicada con la autorización explícita de reescribir/modificar del usuario.

- Motivo: cada versión debe ser jugable; reducir bloques demasiado grandes, ordenar dependencias y usar modelos con criterio.
- Cambios: introducir cierre 0.1.1; dividir objetos y editor; adelantar arbitraje manual y efectos antes de IA; IA pasa de 0.5 a 0.8; visión pasa a 0.7.
- Conservado: Stormwreck completa, persistencia, editor, IA con aprobación, estética táctica y gates de evidencia.
- Aplazado: física general, segmentación arbitraria, PNJ IA y voces; ya eran posteriores a 1.0.
- Añadido: corrección de claims de aceptación, backup/rollback, semántica de guardado, política de visión del proyector y criterios medibles.
- Compatibilidad: no cambia código, protocolo ni datos en esta sesión. Cambia numeración de hitos futuros, no versiones publicadas.
- Histórico original: docs/ROADMAP_V1_REVISION_1.md.
- Nueva secuencia: 0.1.1 → 0.2 → 0.2.1 → 0.3 → 0.4 → 0.4.1 → 0.5 → 0.6 → 0.7 → 0.8 → 0.9 → 1.0.0-beta.N → 1.0.0.

DEVELOPMENT LOG ENTRY — planificación previa (histórico)

- DATE: 2026-09-13.
- MODEL: Astra; sin subagentes ni cambio automático.
- ROADMAP_REVISION_BEFORE / AFTER: 1 / 2.
- VERSION_BEFORE / AFTER: Alpha 0.1 candidata / sin cambio.
- TARGET_BLOCK: revisión del roadmap autorizada por el usuario.
- WORK_COMPLETED: revisión documental y de código, secuencia jugable, categorías, asignación por modelo, gates y encargo de cierre.
- CHECKS_CHANGED: ningún gate de producto se convierte a PASS; aceptación global sigue pendiente.
- EVIDENCE: inspección de game.ts, player.ts, world.ts, audio.ts, integration-test.mjs, pack, lanzadores, package.json y documentos previos.
- TESTS: no se ejecutan pruebas de runtime en esta sesión; se valida consistencia de archivos/enlaces de planificación.
- BLOCKERS: defectos/riesgos A01–A09 pendientes de reproducción/corrección; aceptación física pendiente.
- OSS_REVIEW: proceso acotado definido; no se instala ni adopta dependencia nueva.
- FILES_CHANGED: roadmap, copia histórica y documentación de estado/continuación/aceptación.
- NEXT_RECOMMENDED_STEP: Sol High ejecuta el cierre 0.1.1; el usuario aporta después la prueba con su equipo físico.
- CURRENT_STAGE_AFTER: auditoría de cierre y aceptación, sin publicación nueva.

DEVELOPMENT LOG ENTRY — Alpha 0.1.1 RC1

- DATE: 2026-09-13.
- MODEL: Sol High; sin subagentes ni cambio automático.
- VERSION_BEFORE / AFTER: Alpha 0.1 candidata / Alpha 0.1.1 RC1 candidata.
- TARGET_BLOCK: corregir y verificar los hallazgos A01–A09.
- WORK_COMPLETED: autoridad privada del timón, corte de input, cámara interpolada, audio robusto, idempotencia, límites de interacción, chequeo de instalador, integración ampliada y guía física.
- EVIDENCE: typecheck PASS; unitarias 12/12; build PASS; auditoría 0 fallos; integración ampliada PASS; DM/Player/Projector a 1280×720 y consolas sin errores.
- PHYSICAL_PENDING: instalación limpia, dos móviles reales, Wi-Fi/firewall, proyector 1920×1080, altavoces y recorrido de 10 minutos.
- A06: aplazado al contrato de pack/entidades de 0.2.
- ROLLBACK: `backups/alpha-0.1-before-0.1.1-20260913.zip`, SHA-256 `C89FADB04D3FE08EFB20DAF7274C2E01B2AD8FB0811410DF33EB400E485653D3`.
- CANDIDATE_COPY: `backups/alpha-0.1.1-rc1-20260913.zip`, SHA-256 `51BB86ED65841A0C9E04857A3C5AF39FA0DD96B3AB5112A0C671682EA56744B5`.
- NEXT_RECOMMENDED_STEP: continuar con Sol High durante la aceptación física y fixes; tras PASS, Astra High diseña brevemente Alpha 0.2 y devuelve implementación a Sol High.
- CURRENT_STAGE_AFTER: candidata técnica lista para prueba física; no publicada.

DEVELOPMENT LOG ENTRY — Alpha 0.1.1 RC2

- DATE: 2026-09-13.
- MODEL: Sol High; la petición a Luna Reserve no pudo ejecutarse por límite de uso.
- VERSION_BEFORE / AFTER: Alpha 0.1.1 RC1 candidata / Alpha 0.1.1 RC2 candidata.
- TARGET_BLOCK: corregir el joystick desplazado en vertical y el giro engañoso con movimiento bloqueado, según prueba del usuario.
- WORK_COMPLETED: inicialización diferida del joystick tras mostrar HUD, vector táctil directo, control deshabilitado durante Aproximación y guardia de servidor para no girar ni caminar en escenas bloqueadas; regresión automatizada y documentación RC2.
- EVIDENCE: typecheck cliente/servidor PASS; Vitest 13/13; build 769 módulos; auditoría 0 fallos; integración ampliada PASS.
- PHYSICAL_PENDING: repetir móvil vertical y horizontal, dos jugadores, Wi-Fi, proyector/TV, altavoces y recorrido de 10 minutos con RC2.
- ROLLBACK: `backups/alpha-0.1.1-rc1-20260913.zip`, SHA-256 `51BB86ED65841A0C9E04857A3C5AF39FA0DD96B3AB5112A0C671682EA56744B5`.
- CANDIDATE_COPY: `backups/alpha-0.1.1-rc2-20260913.zip`, SHA-256 `A024583F5220DC377DD516D2AB191B30521CA359BC0B7C25EE0C8CE946AD610F`.
- NEXT_RECOMMENDED_STEP: continuar con Sol High durante la aceptación física; tras PASS, Astra High diseña Alpha 0.2 y Sol High la implementa.
- CURRENT_STAGE_AFTER: RC2 candidata ejecutable; aceptación física pendiente.

DEVELOPMENT LOG ENTRY — Alpha 0.1.1 RC3

- DATE: 2026-09-13.
- MODEL: Sol High.
- VERSION_BEFORE / AFTER: Alpha 0.1.1 RC2 candidata / Alpha 0.1.1 RC3 candidata.
- TARGET_BLOCK: eliminar el control fantasma observado al continuar la prueba de selección y movimiento.
- WORK_COMPLETED: estado privado vacío al liberar, regreso a selección sin desconectar, lista de disponibilidad inmediata, limpieza de HUD en transferencia de pestaña y reclamación posterior sin recarga.
- EVIDENCE: typecheck PASS; unitarias 13/13; build 769 módulos; auditoría 0 fallos; integración ampliada PASS; navegador confirma liberar Maria, elegir Mike y mover de fila 11 a 10; DM/Player/Projector con 0 errores.
- PHYSICAL_PENDING: joystick táctil vertical/horizontal, dos móviles simultáneos, Wi-Fi, proyector/TV, altavoces y recorrido de 10 minutos.
- ROLLBACK: `backups/alpha-0.1.1-rc2-20260913.zip`, SHA-256 `A024583F5220DC377DD516D2AB191B30521CA359BC0B7C25EE0C8CE946AD610F`.
- CANDIDATE_COPY: `backups/alpha-0.1.1-rc3-20260913.zip`, SHA-256 `62D6DB774310ED1E883D0F171BDE6797720F46BB03EEEC247AC000BCA3EB9506`.
- NEXT_RECOMMENDED_STEP: continuar con Sol High durante la aceptación física; tras PASS, Astra High diseña Alpha 0.2 y Sol High la implementa.
- CURRENT_STAGE_AFTER: RC3 candidata ejecutable; aceptación física pendiente.

DEVELOPMENT LOG ENTRY — Alpha 0.1.1 RC4

- DATE: 2026-09-13.
- MODEL: Sol High.
- VERSION_BEFORE / AFTER: Alpha 0.1.1 RC3 candidata / Alpha 0.1.1 RC4 candidata.
- TARGET_BLOCK: cerrar la revocación automática por doble pestaña y diagnosticar el fallo de elevación de Windows.
- WORK_COMPLETED: revocación común para conexión y reclamación, limpieza visible de la pestaña anterior, regresión de eventos ordenados y lanzadores que prefieren Node oficial y rechazan el runtime privado de Codex.
- EVIDENCE: typecheck PASS; unitarias 13/13; build 769 módulos; auditoría 0 fallos; integración ampliada PASS; doble pestaña y viewport 390×844 verificados; 0 errores de consola; los dos `.cmd` muestran el diagnóstico esperado sin Node oficial.
- PHYSICAL_PENDING: doble clic, firewall, joystick en móvil vertical/horizontal, dos móviles simultáneos, Wi-Fi, proyector/TV, altavoces y recorrido de 10 minutos.
- ROLLBACK: `backups/alpha-0.1.1-rc3-20260913.zip`, SHA-256 `62D6DB774310ED1E883D0F171BDE6797720F46BB03EEEC247AC000BCA3EB9506`.
- CANDIDATE_COPY: `backups/alpha-0.1.1-rc4-20260913.zip`, SHA-256 `9029B7B26B854EF439CF4DEC14CA38A6C9595036CE117735A921ABEF615EE299`.
- NEXT_RECOMMENDED_STEP: Astra High diseña el contrato ejecutable de Alpha 0.2; después Sol High implementa la versión jugable.
- INSTALLATION_UPDATE: Node.js 24.21.0 LTS oficial instalado tras verificar hash publicado y firma OpenJS; `INSTALAR.cmd --check`, instalación/build y `INICIAR.cmd` PASS con el ejecutable oficial.
- CURRENT_STAGE_AFTER: RC4 aceptada funcionalmente; métricas y pulido SFX en backlog.

DEVELOPMENT LOG ENTRY — Contrato Alpha 0.2 / revisión 3 (registro previo a implementación)

- DATE: 2026-09-13. MODEL: Astra; sin subagentes ni cambio automático.
- RUNTIME: en ese momento permanecía 0.1.1-rc.4. Diseño 0.2 decidido, implementación pendiente.
- WORK_COMPLETED: ADR-012–015, contrato de extremo a extremo, geometría de prueba, OSS Gate, encargo Sol y corrección del alcance de PASS físicos.
- EVIDENCE: inspección de engine/protocol/navigation/renderer/HTTP; fuentes primarias de Pixi/Miniplex/Matter; SHA-256 RC4 comprobado y coincidente. No nuevos tests de runtime.
- PHYSICAL_PENDING: conservados los criterios no descritos por el usuario, incluyendo PG, modal durante input, simultaneidad, mezcla/pausa y métricas; no se exige repetir los PASS descritos sin motivo.
- NEXT_RECOMMENDED_STEP: Sol High implementa 0.2 según docs/NEXT_MODEL_PROMPT.md y valida O01–O12, luego prueba física guiada.

DEVELOPMENT LOG ENTRY — Alpha 0.2.0 RC1 / integración Sol

- DATE: 2026-09-14. MODEL: Sol (GPT-5); sin subagentes ni cambio automático.
- RUNTIME: `0.2.0-rc.1`, build reconstruido en puerto aislado 3124; la mesa activa de 3000 no se reinició.
- WORK_COMPLETED: escena de prueba, puerta 1×1, caja 2×1 girable, colisiones dinámicas, protocolo v3, `objectRevision`, deshacer LIFO, controles DM y DTO `/api/campaign`.
- EVIDENCE: typecheck PASS; Vitest 15/15; build 840 módulos; integración ampliada PASS; `scripts/object-integration-test.mjs` PASS.
- PHYSICAL_PENDING: cruzar puerta con jugador real, recolocar/girar caja desde DM observando móvil/proyector, deshacer y reconexión; no se infiere desde automatización.
- TRANSVERSAL_PENDING: eliminar imports/literales Stormwreck de engine/renderer y demostrar un bundle sintético sin timón/encuentro.
- NEXT_RECOMMENDED_STEP: Astra High revisa/cierra el contrato genérico y después Sol/Terra completa la aceptación visual/física.

DEVELOPMENT LOG ENTRY — Auditoría Astra / revisión 4 (prevalece sobre el cierre anterior)

- DATE: 2026-09-13. MODEL: Astra; sin subagentes ni cambio automático.
- STATE: RC4 sigue siendo última aceptada; RC1 de 0.2 es implementación parcial. No se publica versión nueva durante esta auditoría.
- EVIDENCE: servidor fuente compilado a tmp/astra-audit-build; Vitest 15/15; auditoría adicional 5/12 PASS y 7 FAIL. Resultados y pruebas repetibles en docs/ALPHA_0_2_AUDIT_RESULTS.json y scripts/audit-alpha02.mjs.
- FINDINGS: locked ignora bloqueo y falta al DM; caja pisa marco abierto; revisión pública no avanza; contador de escena se resetea y se publica; UUID/payload distinto devuelve ACK antiguo. Editor/preview/arte dedicados ausentes por inspección.
- WORK_COMPLETED: auditoría, ADR-016, corrección de claims de aceptación, prompt completo para Sol y copia de trabajo parcial por hash.
- BACKUP: backups/astra-pre-review-0.2-20260913-223941.zip; SHA-256 3614A28B36EE2ACBECD400EFC2D31FD639CA1BB26ED7AE3AA0BF99B7012CC32F. RC4 se conserva aparte.
- NEXT_RECOMMENDED_STEP: Sol High termina el contrato y los fallos hasta RC2 completa; sólo entonces pedir pruebas físicas. No repetir un diseño Astra ni comenzar persistencia 0.3.

DEVELOPMENT LOG ENTRY — Alpha 0.2.0 RC2 / implementación Sol

- DATE: 2026-09-13. MODEL: Sol (GPT-5); sin subagentes ni cambio automático.
- VERSION_BEFORE / AFTER: 0.2.0-rc.1 parcial / 0.2.0-rc.2 candidata técnica.
- WORK_COMPLETED: pack inyectado validado, fronteras pública/privada, transacciones corregidas, editor DM con mapa/preview, arte dedicado, audio parametrizado, guardas de carga y pruebas aisladas.
- EVIDENCE: typechecks PASS; Vitest 18/18; build 842 módulos; auditoría R01–R12 12/12; integración general y de objetos PASS; navegador DM/Player/Projector sin errores.
- CANDIDATE_COPY: `backups/alpha-0.2.0-rc2-final-20260914.zip`, SHA-256 `28588478A586510BAD5AE3BA174BFD806AFE26E3BFCC1BD35743C3BC12F96E7A`.
- PHYSICAL_PENDING: recorrido de puerta/caja con móvil y proyector reales, reconexión y observación de audio/legibilidad en el equipo objetivo.
- NEXT_RECOMMENDED_STEP: aceptar físicamente RC2. Después Astra High concreta el contrato transversal de capacidades para timón separable/destrucción 0.2.1 y Sol High lo implementa.

DEVELOPMENT LOG ENTRY — Alpha 0.2.0 RC2 / aceptación física

- DATE: 2026-09-14, 07:11 indicada por el usuario. MODEL: Sol (registro documental); sin cambio automático.
- VERSION_BEFORE / AFTER: 0.2.0-rc.2 candidata técnica / 0.2.0-rc.2 aceptada operativamente.
- DEVICES: Pixel 9a y portátil MSI; Chrome; móvil vertical y horizontal; salida 1080p.
- PHYSICAL_PASS: escena sincronizada; puerta abierta/cerrada/bloqueada; cruce y colisión; selección, preview, giro y traslado de caja; caja bloqueando la ruta; reconexión y regresión restante informadas como correctas.
- NON_BLOCKING_FINDING: sprite de puerta demasiado frontal para la perspectiva cenital inclinada; corregir con el siguiente trabajo de arte/objetos.
- LIMITS: sin medida de FPS, latencia visual o duración cronometrada.
- NEXT_RECOMMENDED_STEP: Astra High concreta 0.2.1 y la corrección visual; Sol High implementa la siguiente versión jugable.

DEVELOPMENT LOG ENTRY — Contrato Alpha 0.2.1 / revisión 7

- DATE: 2026-09-14. MODEL: Astra; sin subagentes ni cambio automático.
- RUNTIME: conserva 0.2.0-rc.2 aceptada; 0.2.1 es diseño, no release.
- WORK_COMPLETED: ADR-017–019, contrato completo, fixture, comprobador independiente, alcance de arte/perspectiva y encargo Sol.
- EVIDENCE: hash RC2 coincidente, 84 archivos de producto/build/recursos idénticos al ZIP; nueve rutas, seis casos de ubicación, cuatro giros y parche de coordenadas de cubierta PASS en comprobador de diseño.
- INSPECTION_FINDINGS: borrador DM no captura/invalida revisión; preview omite origen de paso y no muestra sprite; props se recrean por snapshot; timón conserva dibujo horneado. Incorporados al trabajo 0.2.1, sin cambiar aceptación operativa RC2.
- PHYSICAL: informe del usuario conservado con su alcance; no se repiten ni se inventan pruebas.
- NEXT_RECOMMENDED_STEP: Sol High entrega 0.2.1 RC1 ejecutable, pruebas T01–T13, backup y guía física. Astra sólo después para contrato de persistencia 0.3 o contradicción transversal nueva.

DEVELOPMENT LOG ENTRY — Alpha 0.2.1 RC1 / implementación y QA técnica

- DATE: 2026-09-14. MODEL: Luna Reserve continuando el encargo de Sol; sin subagentes ni cambio automático.
- VERSION_BEFORE / AFTER: 0.2.1 DEV1 funcional parcial / `0.2.1-rc.1` candidata técnica.
- WORK_COMPLETED: timón unificado sin copia lógica o visual, separación/traslado/cuatro giros, estados de daño y restos de timón/puerta/caja, undo con ocupación, solicitudes contextuales, preview con sprite, reutilización de vistas por ID, puerta rehecha para la cámara cenital/oblicua y catálogo v3 completo.
- EVIDENCE: typechecks PASS; Vitest 23/23; build de cliente/servidor; auditorías Alpha 0.2 y 0.2.1 PASS; integraciones general/objetos PASS; navegador DM/Player/Projector a 390×844, 844×390 y 1920×1080 con consolas limpias.
- PHYSICAL_PENDING: ejecutar `docs/ALPHA_0_2_1_PHYSICAL_CHECK.md` en Pixel 9a/Chrome, MSI y proyector 1080p; no se trasladan los PASS físicos de RC2.
- ART_NOTE: puerta cerrada ya es barrera estrecha vista desde arriba. La rueda vertical conserva lectura circular; revisar físicamente si conviene mayor escorzo, sin tratarlo como fallo confirmado.
- CANDIDATE_COPY: `backups/alpha-0.2.1-rc1-20260914.zip`, 20 528 652 bytes, SHA-256 `444F3A09524DA4AB26B4A0AF62A55B5505BF568D68EF5E520E407EC8F5352EF2`; ZIP legible y copias previas conservadas.
- REUSE_GATE: desde esta revisión, toda capacidad o recurso nuevo recibe evaluación breve de alternativas reutilizables antes de generar o implementar; estudiar no implica adoptar.
- NEXT_RECOMMENDED_STEP: Sol High guía la aceptación física, corrige sólo fallos reproducidos, registra el resultado y cierra el backup/release. Tras PASS, Astra diseña persistencia 0.3; no iniciar 0.3 antes.

DEVELOPMENT LOG ENTRY — Alpha 0.2.1 RC1 / prueba física parcial y relevo Astra

- DATE: 2026-09-15. MODEL: Luna Reserve, registro y traspaso; sin subagentes ni cambio automático.
- PHYSICAL_PASS_REPORTED: arranque; timón único con soporte, separación sin duplicado, traslado/giro, daño/rotura; daño/rotura de puerta/caja; puerta cerrada bloquea, abierta/rota deja pasar y cierre ocupado se rechaza; undo ocupado rechazado y luego permitido; conexión y audio.
- PHYSICAL_FAIL: puerta abierta casi frontal/erguida frente a cerrada horizontal cenital. Dos capturas preservadas en `docs/evidence/`; no es un fallo de colisión.
- UNVERIFIED: móvil vertical/horizontal, preview sprite/huella, cuatro giros observados individualmente; duda de alineación del timón sin coordenada alternativa confirmada.
- VERSION_STATE: `0.2.1-rc.1` sigue candidata parcial, no aceptada. RC2 permanece última aceptada y backup RC1 no se sobrescribe.
- USER_DIRECTION: Astra diseña corrección visual de puerta y contrato de persistencia 0.3; Sol implementa primero la puerta en candidata correctiva 0.2.1. Sólo después de retest/aceptación Sol implementa 0.3.
- EVIDENCE: `docs/ALPHA_0_2_1_PHYSICAL_REPORT_20260915.md`; relevo vigente `docs/ASTRA_ALPHA_0_3_HANDOFF.md`.

DEVELOPMENT LOG ENTRY — Contratos Alpha0.3 / revisión10 (contratos conservados en revisión11)

- DATE: 2026-09-15. Diseño Astra; sin subagentes ni cambios automáticos de modelo.
- USER_DIRECTION: rojo ocupado/bloqueado y Escape sin huella confirmados. Usuario aplaza puerta/móvil físicos hasta que Sol termine0.3; sustituye el gate intermedio de entradas anteriores.
- WORK_COMPLETED: contratos puerta/persistencia, ADR-020–022, fixtures con migración sintética y geometría, matriz P01–P15/D01–D06 y encargo único Sol.
- EVIDENCE: `node scripts/check-alpha03-design.mjs` PASS de coherencia de diseño; hash RC1 coincide. Sin runtime/build/arte final nuevos ni hardware sustituido.
- NEXT_RECOMMENDED_STEP: usuario cambia manualmente a Sol; implementar íntegro `docs/NEXT_MODEL_PROMPT.md` en candidata0.3 conjunta, probarla y entregar checklist física final.

DEVELOPMENT LOG ENTRY — Dirección HD-2D / revisión11 (vigente)

- DATE: 2026-09-15. Decisión aprobada por el usuario tras auditoría de arquitectura.
- USER_DIRECTION: conservar arquitectura web y adoptar Babylon.js; inmersión inspirada en HD-2D al servicio de D&D de mesa; mapa/percepción individual en móvil; Astra y Sol responsables principales.
- WORK_COMPLETED: ADR-023, `docs/HD2D_DIRECTION.md`, roadmap revisado y encargo Sol actualizado. 0.3.1 añadida antes del editor; 0.4 pasa a escenas3D preparadas,0.6 ambientes reutilizables,0.7 percepción individual y protección de datos/recursos.
- SCOPE: documentación/planificación; no código, arte ni dependencias nuevas. Los contratos estrictos0.3 no se modifican. Dirección gráfica aprobada no equivale a integración ni rendimiento probado.
- NEXT_RECOMMENDED_STEP: Sol High implementa sólo0.3 según `docs/NEXT_MODEL_PROMPT.md`, corrige fallos rutinarios y entrega prueba física. Tras aceptación, cerrar contrato0.3.1 y ejecutar transición gráfica acotada.
