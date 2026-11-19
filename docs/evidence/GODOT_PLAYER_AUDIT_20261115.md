# Combate, cuadrícula y preferencias Godot — 15/11/2026

Encargo directo del usuario sobre los proyectos actuales. Fuente compartida en `prototypes/godot-shared/combat` y `prototypes/godot-shared/player`, instalada en Pecio, Retiro y Campamentos. Se conservan escenarios, personajes, escala, colisiones y controles de desplazamiento.

Dirección vigente del usuario: **rueda lateral adaptativa, animada y sin ventana redundante de objetivo**. La selección se muestra en el icono y las plantillas sobre el mapa. El bloque del 16/11 siguiente sustituye la distribución del círculo completo de la primera revisión.


## Corrección vigente · rueda lateral y acciones directas — 16/11/2026

Petición posterior del usuario: recuperar la rueda que se despliega desde el lado y se adapta a la posición del control; eliminar la ventana redundante de objetivo y cancelar deseleccionando la acción. Este bloque sustituye la distribución del círculo completo mostrada en la entrega del 15/11. El resto de la auditoría y sus cambios de cuadrícula/preferencias se conservan.

- **Rueda adaptativa:** puerto del contrato de `engine/client/radial-layout.ts` a `radial_layout.gd`. Cuarto o medio círculo hacia el espacio libre desde el botón real, reflejado al moverlo a la izquierda/derecha/arriba/abajo. Iconos y etiquetas excluyen la zona de controles inferiores y joystick. Se conserva apertura animada y movimiento reducido.
- **Selección directa:** la maza, ataques, curaciones, ayudas y acciones dirigidas esperan un clic/toque sobre el personaje del mapa. Desaparece por completo la ventana «Elegir objetivo»; tampoco hay lista de criaturas ni botón redundante para confirmar la selección. La acción sigue iluminada y puede quitarse pulsando el mismo icono o Esc. Ventaja, no letal y furtivo se conservan como opciones discretas sin panel.
- **Área, dirección y radio:** Manos ardientes orienta desde el lanzador un cono de 4,5 m; la distancia del punto de mira no alarga el cono ni exige elegir una criatura. Nube de niebla marca radio 6 m alrededor de la casilla elegida. Detectar magia y Canto cautivador conservan radio centrado en el emisor. Buscar ahora señala una casilla/zona descriptiva; el DM determina el alcance real de la investigación, sin inventarle una distancia de reglas. Los demás efectos puntuales conservan su colocación de casilla.
- **Resolución de mesa:** efectos guiados, acciones básicas que requieren arbitraje y retirada usan una franja transparente inferior, sin el falso valor de dado de confirmación. Los dados físicos mantienen su entrada real de resultados. Las plantillas no automatizan cobertura, afectados múltiples ni obstáculos.
- **Integridad:** quitar una declaración antes de confirmar no consume acción ni espacio; un dado ya confirmado no puede borrarse para repetirlo. Al escribir la descripción opcional de un objeto se bloquea el movimiento por teclado y se libera al salir del campo.

[Comparación nativa actual](../../output/godot-combat-direct-20261115/index.html) · [resultados, hashes, cámara y posiciones](../../output/godot-combat-direct-20261115/evidence.json). Resultado actual: **546 comprobaciones correctas, 0 fallos** (124 de reglas, 133 de preferencias/catálogo, 221 de interacción directa y geometría, 34 de combate integrado en cada uno de Pecio y Retiro). Ocho capturas actuales forman cuatro pares comparables. Los resultados de la entrega del 15/11, más abajo, son históricos y no certifican esta revisión.

Las comparaciones se renderizan consecutivamente **en una sola instancia de la escena actual**, con las fuentes de interfaz anteriores conservadas y la candidata; cámara, posiciones del grupo, resolución y reloj detenido equivalentes. Así se conservan los cambios paralelos del campamento sin hacer pasar otro mapa por un antes exacto. Fuentes originales de interfaz en `output/godot-combat-direct-20261115/baseline`; el visor de revisión solo sustituye la ruta del recurso de la rosa para cargar la copia anterior. No cambia recursos de arte, materiales, UV, roughness, colisiones ni distribución.

| ID | Propietario | Base → candidata | VA / referencia / aceptación |
| --- | --- | --- | --- |
| `FloatingActionRose` | `radial_layout.gd`, `action_rose.gd`, `combat_controller.gd` | círculo completo separado del control → abanico lateral adaptativo, origen en el control y objetivos táctiles separados | VA-14/17/18; preferencia explícita del usuario y sistema web propio, sin copiar UI comercial; revisión integrada realizada, aceptación pendiente |
| `InlineActionControls` | `combat_controller.gd` | ventana de objetivo y confirmación genérica → selección en mapa y franja inferior sin panel | VA-14/17; transparencia solicitada, controles existentes reutilizados |
| contorno de cono/círculo/casilla | `action_targeting.gd`, `combat_overlay.gd`, `combat_rules.gd` | solo contorno general de alcance → plantilla de la acción, dirección o centro real | VA-14/17; lectura táctica REF-03 como criterio general, geometría de las fichas actuales |

Archivos de esta corrección: los seis módulos anteriores, `test_direct_actions.gd` y `capture_direct_actions.gd`, `player/test_player_preferences.gd`, sus copias en los tres proyectos y la comprobación de foco de `scripts/player_token.gd` de cada uno. Registro reproducible: `scripts/report-godot-direct-actions.mjs` y `scripts/sync-godot-player.mjs`. Las copias de revisión en `godot-campamentos/review` solo se usan para la comparación.

## Registro de la entrega anterior — 15/11/2026

## Auditoría e implementación

La base tenía etiquetas pequeñas y separadas sobre el escenario, páginas sin explicación suficiente y acciones personales que pasaban por el selector de criaturas. La cuadrícula del Pecio se construía por zonas geométricas, la del Retiro desde superficies y las de los destinos no se incorporaban a los ajustes del jugador. Solo existían controles nativos básicos de visibilidad y opacidad.

La rosa conserva el formato flotante. Botones de 64 px lógicos, foco de teclado, estados deshabilitados, motivo/coste/objetivo al consultar o enfocar, categorías vacías deshabilitadas y paginación acotada. Las etiquetas tienen contorno oscuro para conservar lectura sobre madera o suelo. La animación de apertura respeta movimiento reducido. La posición sigue al control de acciones, se limita al área visible y evita al actor activo cuando coincide con él.

`action_targeting.gd` constituye el contrato común entre catálogo, interfaz y reglas; el carácter guiado por el DM no implica que una acción carezca de objetivo. [Inventario completo por perfil](../../output/godot-player-audit-20261115/action-targets.json).

| Necesidad | Acciones / decisión |
| --- | --- |
| Ninguno | Correr, Destrabarse, Esquivar, Esconderse, Buscar, Estudiar, Preparar e Improvisar. Las tres primeras se ejecutan directamente; las demás conservan descripción, dados físicos o confirmación del DM según corresponda. Preparar conserva la elección de capacidad y desencadenante. |
| Autoselección | Detectar magia, Escudo, encender la antorcha propia y Canto cautivador centrado en el emisor. Se omite la selección de una criatura. Escudo conserva su desencadenante y reacción; rituales y efectos guiados siguen sujetos al tiempo y resolución del DM. Terminar concentración actúa sobre uno mismo. |
| Casilla / área | Nube de niebla, Manos ardientes, Prestidigitación, Encontrar familiar y Disco flotante. Requieren punto real; pulsar una miniatura utiliza su posición en vez del origen del mapa. |
| Aliado / uno mismo | Palabra de curación, Bendición y Escudo de fe; Caída de pluma conserva el desencadenante y la resolución de varios afectados. Ayudar necesita otro aliado cercano. |
| Enemigo / criatura dirigida | Ataques, proyectiles, salvaciones dirigidas e Influir. Los ataques ordenan enemigos primero, conservando la posibilidad previa de ataque deliberado a otro aliado o a uno mismo. No se introduce una prohibición artificial de fuego amigo. |
| Objeto | Remendar, Identificar y Usar objeto: descripción del objeto al alcance, sin obligar a seleccionar una criatura. El DM confirma que el objeto y el efecto son válidos. |

Se conservan alcance, turnos, incapacitación, espacios, reacción, munición, secuencias, salvaciones, dados físicos y confirmación de efectos no automatizados. Los objetivos muertos se excluyen del selector; los que están fuera de alcance se deshabilitan. Las curaciones permiten elegirse a uno mismo, sin asumir automáticamente a quién quiere curar el jugador.

## Cuadrícula y navegación

Se adapta el mismo sistema común a los **diez mapas/escenas Godot existentes**: Pecio; Retiro y tres destinos conectados; cinco campamentos. Los adaptadores del mapa conservan su dominio canónico y alturas, incluida la escora y las escaleras del Pecio. No se cubre el mar libre ni se sustituye el suelo por una rejilla plana.

Las celdas candidatas se verifican contra las colisiones actuales: apoyo con normal transitable, ausencia de vacío y espacio para una cápsula de radio 0,36 m y altura 1,63 m, acorde con el cuerpo del grupo. Los bordes se subdividen y proyectan sobre el apoyo real; se omiten segmentos bloqueados y duplicados. Las puertas del Pecio invalidan la caché después de su transición.

En los destinos del Retiro se amplía la cobertura a las caras superiores de los suelos, muelles y rampas actuales. También se contrasta el apoyo contra las mallas visibles mediante una capa exclusiva de consulta que no bloquea personajes. Así las cajas de colisión antiguas no hacen aparecer grid sobre sus prolongaciones invisibles en mar o aire. No se modifica la colisión de desplazamiento.

El mismo conjunto verificado alimenta el grafo para las marcas de movimiento. Las conexiones requieren apoyo intermedio y un barrido de la cápsula, evitando paredes, esquinas diagonales y saltos entre plantas. Se conserva el coste de terreno del Retiro. Este grafo informa del alcance; el juego sigue desplazando al personaje mediante sus controles y colisiones existentes. No se acredita aquí un piloto automático ni un sistema de rutas multijugador.

Render mediante un material compartido y mallas de segmentos agrupadas en bloques de 12 m. No hay rayos físicos ni reconstrucción de geometría por fotograma. Los cambios de estilo actualizan parámetros; el movimiento actualiza foco, visibilidad de bloques y las marcas cuando cambia la posición o presupuesto.

Valores: radio **50 m** por defecto, configurable **10–100 m**; desvanecimiento en los últimos 4 m; intensidad de otras alturas **30 %**, ajustable **10–70 %**, transición entre 0,5 y 1,5 m de desnivel. Anchura de línea de **1–3 px**, opacidad **6–70 %**, color fijo o contraste por superficie. La profundidad conserva la oclusión de cubiertas y edificios. El proyector oculta la cuadrícula y las marcas.

El coste inicial por escena se registra realmente en `scenes-*.json` del informe. No es FPS sostenido. Las marcas alcanzables son independientes del interruptor de las líneas del grid.

## Paridad de preferencias

Fuente anterior auditada: `apps/web/player.ts`, tipo `PlayerDisplaySettings`, normalización y aplicación; `engine/client/grid-style.ts`; evidencia `GRID_SETTINGS_20261013.md`.

| Opción anterior | Candidata Godot |
| --- | --- |
| Mostrar cuadrícula, color fijo/contraste, opacidad, grosor | Implementadas y guardadas; alcance y altura añadidos. |
| Mostrar marcas de movimiento | Marcas del conjunto físicamente alcanzable durante el turno y anillo de selección configurables. |
| Aviso de escenario y duración | Interruptor y duración de 3–25 s. |
| Joystick: opacidad, posición horizontal/vertical y cinco tamaños | Implementados con vista inmediata y límites de pantalla. |
| Control de acciones: posición horizontal/vertical y cinco tamaños | Implementados; la rosa sigue su ubicación. |
| Posición de iniciativas | Arriba, derecha e izquierda dentro del panel de ajustes. Se elimina el selector suelto antiguo sobre la interfaz. |
| Menú personal persistente / cierre automático | Implementados; temporizador de 3–30 s, suspendido mientras se consulta con ratón o foco. |
| Ficha resumida/completa | Selección inicial y cambios de pestaña persistentes. |
| Cámara | Se conservan seguimiento, órbita, inclinación, zoom y preferencias del trabajo de cámaras. |

Se añaden silencio local y movimiento reducido de la rosa y niebla de combate. El panel de ajustes utiliza desplazamiento para mantener los controles accesibles, sin convertir la rosa en una ventana.

Guardado común: `OS.get_data_dir()/DungeonsVTT/player-display-v2.cfg`, con perfiles independientes `player` y `dm`, compartido entre los proyectos Godot. Se migra la colocación de turnos del `combat-ui.cfg` existente cuando aún no hay preferencias comunes. Las pruebas redirigen los datos a `runtime/godot-player-audit-appdata` y no utilizan las preferencias reales de la mesa.

El botón **Importar preferencias web (.json)** acepta el objeto anterior o una exportación con la clave `dnd-player-display.v1:<campaña>`. Valida rangos y tipos. No se afirma lectura automática del almacenamiento privado del navegador: hace falta el archivo exportado. Esta importación es de preferencias de presentación, no de cuentas, inventarios ni guardados de campaña.

## Registro visual y procedencia

| ID / recurso | Propietario | Base → candidata | VA / referencia / estado |
| --- | --- | --- | --- |
| `CombatActionWheel/FloatingActionRose`, `CombatIcon_<id>` | `combat_controller.gd`, `action_rose.gd` | abanico de iconos con etiquetas sueltas → círculo flotante sin ventana, iconos existentes, 64 px, foco/estados y apertura 0,24 s | VA-14/17/18; dirección expresa del usuario, lectura táctica REF-03 (edición 2025) sin copiar interfaz; aceptación artística pendiente |
| `WalkableChunk_<x>_<z>` | `player/walkable_grid.gd`, `.gdshader`; adaptadores de cada mapa | líneas por zona/superficie, sin alcance → segmentos comprobados contra física, bloques 12 m, radio 50 m y desnivel 30 % | VA-04/14/17; REF-03 para alturas, paleta de grid existente; revisión integrada y coste registrados |
| `ReachableMovementHints` | `walkable_grid.gd` | sin control nativo equivalente → marcas cian alfa 0,14 del grafo compartido | VA-14/17; función propia del VTT; revisión técnica separada de prueba física |
| `PlayerSettingsModal/PlayerSettingsScroll/Setting_<key>` | `player_preferences.gd`, `vtt_player_hud.gd` | visibilidad/opacidad y cámara → controles de paridad, persistencia e importación | VA-17/18; controles nativos y tema existente; aceptación del usuario pendiente |

No se crean ilustraciones, texturas comerciales, personajes ni una familia de materiales del escenario. Se reutilizan los SVG, tipografía y colores actuales. Los originales se preservan en `output/godot-player-audit-20261115/baseline`, y las capturas originales, cámaras, dimensiones y hashes en el informe. No cambia resolución, UV ni rugosidad del arte del mapa.

## Pruebas y revisión

[Informe con superposición, ampliación y teclado](../../output/godot-player-audit-20261115/index.html), [resultados y originales](../../output/godot-player-audit-20261115/evidence.json). Los registros por suite son la fuente de sus recuentos, no los resultados de entregas históricas.

Resultado: **557 comprobaciones correctas, 0 fallos**: reglas 124, preferencias/catálogo 133, navegación 12, integración de combate 34 en Pecio y 34 en Retiro, integración de jugador 22 en Pecio, 88 en Retiro/destinos y 110 en los campamentos. **34 originales**: 12 pares antes/después y diez muestras de mapa. Estas últimas ejercitan además el ajuste grueso (3 px, radio 35 m y altura 20 %); los pares de la candidata usan el perfil inicial de 1 px / 50 m / 30 %.

Las pruebas cubren reglas de combate; catálogo completo y tipos de objetivo; migración y normalización; obstáculos, vacío, altura, barrido y presupuesto; preferencias en disco y separación de roles; controles reales de configuración; selección de acciones; Esc; tamaños táctiles; cuadrícula y material en cada escena. Las pruebas de controles emiten señales/eventos en Godot, no acreditan interacción manual con un móvil físico.

Capturas reales de Godot Forward+ a 1280×720. Los pares registran cámara, tamaño ortográfico y resolución idénticos; se reproduce la escena inicial y se detiene el reloj de campaña. El asentamiento inicial de personajes, las poses y el ambiente pueden variar; no se afirma identidad de todos los píxeles del mundo. Los diez mapas tienen además muestras actuales separadas. Se revisan las imágenes finales, incluida la rosa sin ventana; no se presenta el diseño rectangular descartado como aceptado.

Para permitir el arranque se corrige una única anotación de tipo en `godot-pecio/scripts/hull_builder.gd` (`is_stbd_boarding_gap: bool`), conservando el cambio ajeno de la brecha y su geometría. Los avisos por puertos del puente móvil ya ocupados se distinguen del combate local y las comprobaciones de esta entrega.

## Archivos y mantenimiento

- Fuente: `prototypes/godot-shared/player/{player_preferences.gd,walkable_grid.gd,walkable_grid.gdshader}` y pruebas; `combat/{action_targeting.gd,action_rose.gd,combat_catalogue.gd,combat_rules.gd,combat_controller.gd,combat_visuals.gd,capture_player_audit.gd}`.
- Integración en los tres proyectos: `scripts/{tactical_grid_overlay.gd,vtt_role_ui.gd,vtt_player_hud.gd,player_token.gd}` y copias de los módulos comunes. Destinos: `godot-retiro/scripts/route_destination_controller.gd`.
- Sincronización: `node scripts/sync-godot-player.mjs`. Copia solo fuentes comunes y conserva arte/archivos ajenos. Tras un exportador anterior, volver a sincronizar para incluir los tres proyectos.
- Informe: `node scripts/report-godot-player-audit.mjs` valida registros, cámaras, capturas y hashes comunes antes de generarlo.

Construido y probado localmente. Siguen separados la aceptación artística del usuario, dispositivos físicos, FPS sostenidos, red y guardado de campañas web. No cierra M5/M7, Q1 ni fases de acabado de los escenarios; no se publica en GitHub.
