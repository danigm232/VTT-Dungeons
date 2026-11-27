# Estado del proyecto

## Agua e interacciones del Pecio — 26/11/2026

Mía, Mike y Trinity pueden alternar natación e inmersión en mar abierto, con respiración por CON, emisión independiente de estela y burbujas, y humedad dependiente del contacto y el clima. C9 usa sus salidas y bolsas de aire existentes. Las cuatro acciones con objetos se orientan hacia el punto de interacción. [Ficha del agua](docs/evidence/STORMWRECK_AQUATIC_20261126.md) · [Visor y pruebas en el Pecio](output/stormwreck-aquatic/index.html).

El 27/11 se refuerzan las burbujas y el goteo al pisar una superficie seca. Godot verificó 192 casos funcionales y 54 con render. [Antes y después](output/stormwreck-aquatic/vfx/index.html).

## Virajes y aterrizajes de las arpías — 26/11/2026

Ocho virajes de cámara con dibujos propios y cuatro ciclos de aterrizaje en las dos ubicaciones del Pecio. El rumbo y la fase se mantienen al girar la cámara. El sonido de la cofa sale al apoyar las garras. [Ficha y comparativas](docs/evidence/NPC_SPRITES_20261116.md#virajes-y-aterrizajes-de-las-arpías--26112026).

## Repertorio terrestre del gul — 26/11/2026

Diez secuencias nuevas para el gul de C8. El reposo conserva el rumbo al detenerse y al orbitar la cámara. Correr y Esconderse seleccionan secuencias propias durante el desplazamiento. Se completan las vistas traseras de reacción, arrastre y caída, y las transiciones de giro, arranque, frenada y recuperación. [Ficha del gul](docs/evidence/NPC_SPRITES_20261116.md#repertorio-terrestre-del-gul--26112026).

## Gul y arpías del Pecio — 26/11/2026

El gul de C8 usa su apariencia propia, garras y mordisco distintos, marcha, arrastre, caída y reacción al daño. La aparición de las arpías encadena el giro de aproximación con el aterrizaje. C2 utiliza el refuerzo canónico de nivel 2 con su ficha de combate. Los tres bloques de rutinas del Retiro se aplazan en el maestro. [Ficha, alcance y pruebas](docs/evidence/NPC_SPRITES_20261116.md#gul-y-arpías-del-pecio--26112026).

## Identidad y dado de las cargas Godot — 25/11/2026

Corregida la familia de Mike y la continuidad del comerciante de Persuasión; el resto de Mía/Trinity se conserva. Once láminas seleccionadas (88 poses), locomoción/reposo reutilizados y desenlaces sin reinicio. Instalado en Pecio, Retiro y Campamentos, junto al dado nativo de Antigravity. Pipeline limitado a 14 recursos; 11.304 comprobaciones de catálogo, 27 de pipeline, 183 de carga por proyecto y 192 en GPU. Revisión interna realizada; aceptación artística/física pendiente. [Ficha y capturas](docs/evidence/GODOT_SKILL_LOADING_20261114.md#corrección-selectiva-instalada--25112026).

## Retiro del Dragón · rutinas características — 25/11/2026

Siete rutinas de oficios, carga y limpieza tienen once secuencias nuevas y herramientas independientes. La carga se recoge, se transporta y se deposita en la escena. La cámara conserva el rumbo de los habitantes durante el gesto. [Visor y pruebas](output/retreat-work-contacts-20261125/index.html).

Corregido el solapamiento entre la túnica de Runara y el taburete de A4. Se revisaron la lectura y el gesto de mano en 50 vistas nativas. [Antes y después](output/retreat-runara-stool-20261125/index.html).

El acabado de lectura y pesca añade dos poses sentadas de Runara en cinco vistas, y cuatro fases laterales de caña para Tarak y Blepp. Los dibujos se usan sobre el asiento y los puestos del mapa. [Comparativas](output/retreat-contact-pass-20261125/index.html).

Los doce habitantes tienen dos actividades características dentro del ciclo del Retiro. El DM puede consultar su destino, asignar rutinas, pausarlas y dar una orden de movimiento por ruta. Se verificaron los veinticuatro contactos y el recorrido simultáneo de Tarak y Blepp hasta el muelle. Continúan pendientes algunos agarres y poses específicas, así como la replicación entre instancias. [Ficha de implementación y pruebas](docs/evidence/RETIRO_RUTINAS_CARACTERISTICAS_20261125.md).

## Sincronización Godot — 25/11/2026

Se reúnen los cambios recientes de Pecio, Retiro y Campamentos. Una instalación limpia detectó que cinco archivos de geometría y terreno estaban excluidos de Git: se incorporan y se mantiene la exclusión de las partidas. La candidata de mantas continúa pendiente de capturas nativas y aceptación visual; los proyectos Godot se mantienen como proyectos separados. [Contenido y pruebas](docs/evidence/GODOT_SYNC_20261125.md).

## Retiro del Dragón · mantas para el descanso — 24/11/2026

Los doce habitantes tienen implementado el descanso con manta en los lechos de A1. Once usan un busto fijo y Kilnip reutiliza seis fases de su siesta. Mía, Mike y Trinity conservan sus mantas y pueden usarlas también en los petates. **Corrección 25/11:** la red de rutas se amplía al suelo ya existente del petate occidental, al que Runara no podía llegar. La prueba sin pantalla pasa ahora 159/159. **Candidata pendiente de cierre visual:** los registros nativos anteriores contienen aquel fallo y `output/retreat-blankets-20261124/index.html` aún no existe; falta repetir la captura nativa y generar el informe antes de darla por revisada o aceptada.

## Retiro del Dragón · siesta de Kilnip — 24/11/2026

Kilnip se tumba durante su ronda diurna y utiliza los apoyos de la hamaca. El ciclo de respiración contiene ocho WebP sin pérdida. Al terminar o interrumpir el descanso vuelve a su posición en el suelo. [Comparativas y reproductor](output/retreat-hammock-20261124/index.html).

**Auditoría de sprites de carga Godot, 24/11:** confirmadas diferencias de identidad (especialmente Mike) y de comerciante al entrar en la pareja de Persuasión. Corregidos el apoyo de la cuerda y el cambio de bandido a otro PNJ al huir, en Pecio/Retiro/Campamentos. La familia artística sigue pendiente de poses fieles; no se considera aprobada por las pruebas técnicas. [Hallazgos y evidencia actual](docs/evidence/GODOT_SKILL_LOADING_20261114.md#auditoría-de-identidad-apoyos-y-pnj--24112026).

## Retiro del Dragón · gestos vistos de espaldas — 24/11/2026

Doce gestos nuevos en la candidata local de Godot, con una acción propia por habitante. Las secuencias se usan desde atrás y en las dos diagonales traseras. Sus 96 fotogramas ocupan 8,24 MB en WebP sin pérdida frente a 13,10 MB de los mismos recortes en PNG. Se conservan las láminas originales. [Comparativas y reproductor](output/retreat-gesture-views-20261124/index.html).

## Retiro del Dragón · Auditoría 3 y Bloques 1–5 — 24/11/2026

Completados los **5 bloques** resultantes de la auditoría integral visual + canon PDF en `prototypes/godot-retiro/` (conservando intactas las rutinas de los 12 habitantes y sin tocar Pecio ni el trabajo paralelo de Codex):

1. **Bloque 1 — Geometría, escaleras, árboles y spawn (`retreat_winch_and_stairs.gd`, `retreat_temple_and_cliffs.gd`, `retreat_scene_enhancer.gd`, `retreat_layout_builder.gd`, `main.tscn`):** corregido `_box_xf()` (`Basis.from_euler(...) * Basis.from_scale(sz)`), cimentación profunda en escaleras de montaña (`5,2 m` en `ObsTurn`) con barandillas y faroles cálidos en todos los tramos, terraza `A5NorthSummitLanding` y despeje total de `A5RidgeW` (`Surface_IslandPleamarHigh` visualmente transparente conservando su colisión trimesh) y del acceso al Cementerio de Brastos, retirada de rocas de `EastCliffWestRail`, jardineras botánicas esculpidas + 2 faroles en borde norte de los rellanos Z2, reubicación de `WizardToken` (Mike) a `(97,8, 9, 91,6)` libre del pozo y zonas de exclusión en `LushMountainForest` (**0 troncos y 0 copas** recortando edificios/escaleras en 512 árboles).
2. **Bloque 2 — Climatología 3D real y audio DM (`retreat_weather_and_audio.gd`, `retreat_layout_builder.gd`, `vtt_role_ui.gd`, `vtt_dm_hud.gd`):** sistema `RetreatWeatherAndAudio` con modos `clear`/`rain`/`storm`/`fog`, partículas `RetreatRainParticles` con 4 bloqueadores de techo `GPUParticlesCollisionBox3D` (`RainRoofBlockers` sobre A1/A2/A3-A4/A5), `RetreatFogMistParticles`, relámpagos `StormLightningLight`, humedad dinámica en materiales, modulación atmosférica/oceánica y mezclador procedural vivo de 4 canales + 5 SFX disparables desde el HUD DM.
3. **Bloque 3 — Mar, mareas, SSAO, sombras, tejado A5 y acantilado A1 (`main.tscn`, `retreat_layout_builder.gd`, `retreat_winch_and_stairs.gd`, `retreat_temple_and_cliffs.gd`, `retreat_scene_enhancer.gd`):** malla `OceanPlane` subdividida a `128×112` con `ocean_shader` mejorado (3 ondas, cáusticas y crestas blancas en tormenta), 11 nodos `tide_foam` sincronizados con `low` (`−0,34 m`) / `rising` (`+0,18 m`) / `high` (`+0,42 m`), algas sumergidas en oliva oscuro natural, SSAO calibrado, sombras activas en las 5 luces focales hero (`CampfireLight`, `DiningLampLight`, `KitchenHearthLight`, `LibraryStudyLight`, `TempleSanctuaryLight`), `EastCliffBounceLight`, tejado de pizarra mate en A5 y contrafuertes asimétricos en A1.
4. **Bloque 4 — Fauna 3D esculpida y vida costera (`retreat_layout_builder.gd`, `retreat_scene_enhancer.gd`):** 5 gaviotas planeando con alas perfiladas 3D, 6 gaviotas posadas esculpidas, 7 canarios dorados esculpidos en A5, 12 mariposas bilobuladas en A1 y Z7, y 8 peces costeros nadando bajo el muelle Z1 sincronizados a la altura de marea.
5. **Bloque 5 — Cierre total del canon PDF e interactivos (`retreat_myla_shop_panel.gd`, `retreat_conversations.gd`, `retreat_residents.gd`, `interactive_prop.gd`, `retreat_interiors_a3_a4.gd`, `retreat_winch_and_stairs.gd`, `vtt_role_ui.gd`, `vtt_dm_hud.gd`):** tienda transaccional `RetreatMylaShopPanel` (10 artículos del PHB con descuento de oro y entrada real a mochila vía `InventoryBridge`), memoria de pistas descubiertas (`record_discovered_clue`) desbloqueando 5 temas en Tarak, Varnoth, Laylee, Myla y Runara, botón DM **🍲 Comida A3** congregando residentes en torno a la silla de cabecera de Runara, alarma viva de Blepp y Tarak al activar la reaparición de zombis, botones DM de recompensa (**🧪 +2 Pociones** con `healing_range` `[4, 10]` y **🔑 Llave lunar**), e interactivos `[T]` en `Z2EntryRouteBoard`, `PleamarWayfinderPost`, `PierSeaRouteBoard`, `A2_WinchMechanism` y mesas `RefectoryTable_576`/`615`.
6. **Verificación tras el último cambio:** `--check-only` **12/12**, `test_retreat_layout.gd` **152/152**, `test_camera_contract.gd` **49/49**, `test_map_exits.gd` **128/128**, `test_retreat_residents.gd` **209/209**, `test_retreat_routines.gd` **483/483**, `inventory/test_backpack.gd` **161/161** y `verify_bloques1_to_5_20261124.gd` **51/51** (**1.233 PASS / 0 FAIL** totales). Inspeccionadas las 16 parejas exactas `1440×810` Forward+ + 3 vistas extra en [output/retreat-audit3-20261124/index.html](output/retreat-audit3-20261124/index.html) · [Evidencia detallada](docs/evidence/RETIRO_GODOT_LAYERS_20261114.md#auditoría-3-y-bloques-15-geometría-clima-3d-mar-fauna-y-cierre-canónico--24112026). Pendientes separados: sprite dracónico de Runara (en cola del pipeline de personajes), aceptación artística en mesa del usuario y pruebas físicas/ENet.

## Visuales de combate en Godot — 24/11/2026

Pecio, Retiro y Campamentos comparten las correcciones de alcance, proyectiles, contacto y efectos de área, además de la transición a derrota y la limpieza del marcador. Trinity reutiliza las poses de caída y recuperación de su atlas publicado en el proyecto. [Auditoría y procedencia](docs/evidence/GODOT_COMBAT_20261115.md#auditoría-de-visuales--24112026).

## Retiro del Dragón · rutinas de los doce habitantes — 24/11/2026

Runara consulta el códice y llama a los canarios, Tarak riega y sirve el guiso, y Myla puede mostrarle a Laylee un montaje en el taller. Las 72 tareas se reparten por franjas según la función de cada habitante y respetan las conversaciones y el combate. El suelo, las puertas y los muebles determinan dónde puede llegar cada PNJ. Las marchas frontales y traseras y los gestos conservan la orientación respecto al objeto al girar la cámara. [Agenda y comparativas](output/retreat-routines-20261124/index.html).

## Retiro del Dragón · cierre canónico, Cementerio de Brastos e hitos DM — 24/11/2026

Cerrado el bloque de fidelidad canónica del Capítulo 1 del Retiro del Dragón en `prototypes/godot-retiro/` (conservando íntegramente *Vida del claustro* y los 12 residentes), junto con el pulido arquitectónico previo de A2/A3/A4/Paseo ([comparativa interactiva](output/retreat-final-20261123/index.html)):

1. **Restauración de fachada y sellado:** corregido el error de parseo de tipos en `retreat_interiors_a3_a4.gd` que interrumpía `build_rooms_and_plaza_furniture()` y `build_cave_roofs_and_archways()` (restaurados `A4CliffStrata`, `A3CliffStrata`, 5 contrafuertes escalonados, mobiliario de paseo y *cutaways* A2/A5), y cerrada la grieta vertical de `0,15 m` entre `A4VaultMesh` y `A3VaultMesh` (`retreat_scene_enhancer.gd`).
2. **Narrativa ambiental A1–A5 y Cementerio de Brastos:** añadidos secretos e interactivos canónicos en las 6 celdas y parapeto de A1 (petates de invitados, compost + pociones + 3 dagas ocultas de Tarak, herramientas de cantero + espada bajo colchón de Varnoth, expositor/catálogo PHB de Myla, clavo de Blepp, moneda de Mumpo y puesto de vigía), silla de cabecera de Runara y quemadura/aviso alquímico de Laylee en A3, lámparas de cristal y códices en A4, 4 hornacinas cardinales de incienso, kit de cantería y bendición `+1d4` / *Detectar magia* en A5, y **Cementerio de Brastos** al NO (`NW_BrastosCliffGraveyard` en terraza `y = 36,85 m` conectada con 5 escalones + rampa de colisión y claro forestal despejado).
3. **Ganchos de PJ e hitos DM:** ajustado `kilnip_dining` al pasillo central `(125,6, 18,0, 59,15)`; incorporados `HERO_TOPICS` específicos para **Mía**, **Trinity** y **Mike** en `retreat_conversations.gd` sin alterar índices previos; añadidos conmutadores reversibles en el panel **Hitos del Retiro (DM)** (`vtt_dm_hud.gd`) para **Reaparición de zombis + aparejos** (`Z2_ZombieReappearanceGear`) y **Revelación en A5 + llave de piedra lunar** (`A5_RunaraRevelationFx`).
4. **Verificación tras el último cambio:** `--check-only` **10/10**, `test_retreat_layout.gd` **152/152**, `test_camera_contract.gd` **49/49**, `test_map_exits.gd` **128/128**, `test_retreat_residents.gd` **209/209** y `verify_canon_enhancements.gd` **29/29** (**567/567 PASS, 0 FAIL**), más 7 capturas nativas Forward+ inspeccionadas. [Evidencia e inventario de IDs](docs/evidence/RETIRO_GODOT_LAYERS_20261114.md#cierre-canónico-del-retiro-cementerio-de-brastos-ganchos-de-pj-e-hitos-dm--24112026). Pendientes separados: comercio transaccional con oro/inventario en Myla, entregas automáticas de misión, sprite dracónico de Runara, marchas frontales/traseras de PNJ, aceptación artística en mesa y pruebas físicas/ENet.

## Retiro del Dragón · vida del claustro — 24/11/2026

Los doce habitantes caminan por el mapa al cambiar de turno y realizan rondas entre tareas. Las puertas cerradas frenan al PNJ hasta que se abre el paso. El jugador pulsa **T** para hablar y elige una intervención. Los intercambios entre residentes se leen al acercarse. **Grupo** o **Y** abre el texto de los héroes durante la sesión local. Hay trece marchas y cuatro gestos nuevos de ocho fotogramas. La cocina de Tarak activa vapor sobre el fogón durante su rutina. [Cinco comparativas y reproductor](output/retreat-life-20261124/index.html).

## Retiro del Dragón · habitantes del claustro — 24/11/2026

Los doce residentes del capítulo 1 tienen ficha visual, apoyo físico y conversación de proximidad. Runara recibe a los héroes y después alterna biblioteca y templo. Tarak cuida hierbas, Varnoth se ocupa de la piedra del templo, Myla y Laylee trabajan en el taller y Rix lleva las ofrendas. Los kobolds ocupan las celdas durante el día y los puestos de actividad al bajar la luz. Ocho gestos nuevos con 64 poses y doce reposos reutilizados. El DM revela a los tres marineros ahogados con el control existente. [Comparativas y reproductor](output/retreat-residents-20261124/index.html).

## Retiro del Dragón (Godot) · Segunda auditoría visual y plan de mejoras (Fases 0–7) — 24/11/2026

Completadas las 8 fases (0 a 7) de la segunda auditoría visual en `prototypes/godot-retiro/` conservando planta, cotas, navegación (`WalkableGrid` 1.044 casillas), interacciones `[T]`, cámara táctica y trabajo paralelo de las demás campañas:

1. **A5 Templo de Bahamut, farallón y viaducto (`Fases 1–3`, `retreat_temple_and_cliffs.gd`, `retreat_winch_and_stairs.gd`, `retreat_scene_enhancer.gd`):** eliminado `TemplePlinthCliff` y los 9 pilares cónicos `WestCliffButtress_*`, sustituidos por un macizo volcánico estratificado continuo (`y = -2,8..25,35 m`) con 15 hombros facetados, crepidoma escalonado y 7 contrafuertes funcionales; viaducto `A5_WidenedBridge` de canto continuo (`2,04 m`), 4 pilares cimentados, 3 arcos de descarga, postes en plintos y 3 faroles; 4 columnas acanaladas con capiteles alados, muro trasero con hornacina y cubierta de pizarra/imbrices/pares + frontones esculpidos con Dragón de Platino agrupados en `TempleRoofCutawayGroup` (cutaway independiente `"a5_temple"`); interior sagrado con pavimento octogonal, tapiz azul zafiro/oro, estrado + altar de ofrendas `[T]`, 2 bancos `[T]`, 4 braseros con aro toroidal y lecho de carbón/brasas, urnas con laurel, 7 canarios asentados y motas `GPUParticles3D`.
2. **Acantilados, costa Z1/Z2 y océano (`Fase 4`, `retreat_scene_enhancer.gd`, `retreat_upper_architecture.gd`, `retreat_layout_builder.gd`, `retreat_temple_and_cliffs.gd`):** `make_basalt_outcrop_mesh` reescrito como basalto multifacetado (`smooth_group = -1`) con meseta erosionada; costillas `MM_CliffFractureRibs` sin cizalla; respaldo geológico y contrafuertes enrasados sobre A4/A3 eliminando cavidades negras; arrecifes escalonados `Z1Z2_CoastalGeologicalReefs` rompiendo la arista recta sumergida en Z1/Z2; `ocean_shader` recalibrado (`ROUGHNESS = 0,42..0,78`, `SPECULAR = 0,09`) eliminando el deslumbramiento blanco quemado.
3. **Jardines Z7, bosque unificado y Paseo Superior Z9 (`Fase 5`, `retreat_layout_builder.gd`, `retreat_scene_enhancer.gd`, `retreat_temple_and_cliffs.gd`):** omitidas las mallas cónicas/esféricas de Babylon (`r3land__r3_pine_*`, `r3land__r3_olive`, `r3land__r3_bark`, `p5__refinement_pine_needles`, `~938K` tris menos) y unificadas todas las copas mediterráneas facetadas con collarines de raíces; desarrolladas las terrazas `Z7_TerracedSanctuaryGardens` (4 bancales de hierbas/lavanda, pila de agua, pérgola de cedro, umbrales florales y flora orgánica de repisas) y 4 miradores abiertos con antepecho tallado en Paseo Superior Z9.
4. **Pulido localizado A1–A4 e iluminación (`Fases 6–7`, `retreat_scene_enhancer.gd`, `retreat_winch_and_stairs.gd`, `retreat_interiors_a3_a4.gd`, `main.tscn`):** muro rocoso trasero permanente tras celdas abiertas + bloques estratificados + 3 miradores sur en A1; pilar de esquina sellando la grieta bajo escaleras + transición orgánica NO + utillaje y cabo colgado en A2; losas de pizarra `MM_A3_KitchenSlateFlags`, borde SW despejado (`a4_mesh x1 = 112,75`) y repisas diferenciadas en A3; ceja rocosa continua, 6 remates eruditos distintos y lámparas de lectura en A4; ambiente/exposición calibrados en `day`, `dusk` y `night` (`directional_shadow_max_distance = 155 m`).
5. **Verificación tras el último cambio (`task-2774`, `task-2792`):** `test_retreat_layout.gd` **152/152**, `test_map_exits.gd` **128/128**, `test_camera_contract.gd` **49/49**, `player/test_grid_navigation.gd` **12/12**, `loading/test_map_roundtrip.gd` **24/24** (**365/365 PASS, 0 FAIL**). Inspeccionadas las 19 capturas `after/` (`1440×810` Forward+ MX350, `MISSING_ASSETS=0`, `draws = 740..5755`, `vram = 1262 MB`). [Informe interactivo clic-superponer Antes/Después (19 pares + SHA-256)](output/retreat-audit2-20261123/index.html) · [Evidencia y matriz](docs/evidence/RETIRO_GODOT_LAYERS_20261114.md#segunda-auditoría-visual-y-plan-de-mejoras-fases-07--24112026). Aceptación artística del usuario y pruebas físicas/rendimiento en primer plano en dispositivo quedan separadas y pendientes.

## Ficha de personaje definitiva · Fases 0–8 (Pulido artístico) completadas · 23–24/11/2026

Completadas las ocho fases de la auditoría crítica (0–7) más la **Fase 8 de pulido artístico** en Godot (`prototypes/godot-shared/` sincronizado en `godot-pecio`, `godot-retiro` y `godot-campamentos`): retrato circular ampliado sobresaliendo del marco superior izquierdo y solapando la cartela del nombre, sombras proyectadas y biseles en todas las cenefas y marcos dorados, **Biografía editable en línea** dentro de la pestaña Historia (disponible para Jugador y DM con guardado directo), shader GPU `ink_engraving.gdshader` (`render_mode blend_mul;` + grano de papel + desvanecido UV orgánico en los 4 bordes visibles + `clip_contents`) que funde biblioteca/castillo/montañas/ruinas directamente en las fibras del pergamino, friso superior envejecido con filigrana y broche dorado inferior, y corona oscura en madera de nogal/latón integrando las pestañas superiores al marco exterior. Suites tras el último cambio: **337/337** de ficha en Pecio, Retiro y Campamentos (**1.011/1.011 PASS, 0 FAIL**), además de mochila/combate/interfaces sin regresiones (**1.514/1.514** totales) y 31 capturas Forward+ (`views=15 failures=0`). [Informe interactivo clic-a-fase (Antes → F0 → … → F8 Pulido)](output/ficha-definitiva-20261123/index.html) · [Evidencia](docs/evidence/GODOT_CHARACTER_SHEET_20261116.md#fases-0-a-8--ficha-definitiva-y-pulido-artístico-en-godot--2324112026). Aceptación artística del usuario y pruebas táctiles físicas separadas.

## Ficha de personaje · sistema común de la fase 0 · 23/11/2026

La ficha de los tres prototipos usa papel continuo, marcos transparentes, símbolos con margen y ayudas de lectura sobre pergamino. La galería permite alternar el antes y el después de cada pestaña a 1366, 1600 y 1920 píxeles de ancho y consultar por separado el concepto artístico correspondiente. [Galería](output/ficha-fase-0/index.html) · [Evidencia](docs/evidence/GODOT_CHARACTER_SHEET_20261116.md#fase-0-de-la-auditoría-crítica).

## Campamentos Godot · O2: Bosque camino a Pleamar — PASO 23 (Pulido final del bosque) — 2026-11-22

Completado el **PASO 23 — Pulido final del bosque (23.1–23.7 y setos volumétricos amplios)** sobre `02 · Bosque camino a Pleamar` (`camp-forest-pleamar`) en `prototypes/godot-campamentos/`, conservando íntegramente el trabajo de **FASE 1 (Pasos 1–10)** y **FASE 2 (Pasos 11–20)**, el claro del campamento, río, puente, caminos y los demás campamentos/campañas:

1. **Variación de siluetas en árboles de hoja ancha y eliminación de copas repetitivas (`Pasos 23.1, 23.2`):** ampliadas las submasas foliares (`get_foliage_lobe_variants`) de 4 a **7 formas botánicas asimétricas** (rama extendida, penacho ovoide ascendente, repisa trilobulada, faldón lateral, cresta asimétrica, media luna de horquilla y volumen diagonal); creados **4 arquetipos estructurales por especie caducifolia (`v0..v3`)** en `get_tree_species_proto(species, v_i)` y `_emit_classic_tree` (0 = veterano extendido con rama baja lateral; 1 = copa alta ascendente ovoide/llama; 2 = tronco bifurcado de doble copa con escotadura visible; 3 = copa inclinada escalonada por el viento; y abedul multitronco en `birch_v2` con tronco rematado dentro del núcleo foliar a `y = 2,86 m` sin punta desnuda); `_bake_cohesive_crown_normals()` orienta un `68%` de las normales hacia la cúpula global del árbol para que los volúmenes solapados se sombreen como una sola copa continua en lugar de esferas oscuras separadas.
2. **Suavizado de verdes excesivamente luminosos y diferencias de edad/tamaño (`Pasos 23.3, 23.4`):** reducido el realce amarillo-lima en `create_foliage_wind_shader_material` (`sunlit_tint = col * vec3(1.12, 1.13, 1.01) + vec3(0.006, 0.009, 0.003)`) y suavizados los tintes caducifolios (`mat_oak #4e6d39`, `birch #55703b`, `beech #476535`, `willow #4e6939`, `copper #7c5834`, todos con `tint.g <= 0,52`); jerarquía de edades desde retoños (`0,38..0,68`) y jóvenes subdosel (`0,62..0,88`) hasta dosel maduro (`0,88..1,24`) y árboles veteranos (`1,24..1,50`) con excentricidad XZ independiente.
3. **Integración de raíces en el terreno (`Paso 23.5`):** sustituidos los cilindros sueltos inclinados por `_append_flared_buttress_base()`: faldón basal acampanado continuo hundido hasta `y = -0,58 m` + 4–6 contrafuertes arqueados en 2 segmentos que nacen dentro del tronco (`y = 0,36..0,54 m`), pasan por un codo compacto a ras de tierra (`y = -0,02 m`) y se hunden verticalmente hasta `y = -0,58 m` (0 raíces flotantes en taludes ni riberas), con collarín de musgo (`RootMossCollar`) en los árboles del claro.
4. **Densidad irregular junto al sendero, contraste bosquete/claro, conservación de líneas de visión y setos amplios con colisión (`Pasos 23.6, 23.7`):** `trail_tree_setback` varía orgánicamente entre `2,18 m` (bosquetes `trail_coppices` junto al hombro del camino norte/sur) y `5,35 m` (recodos abiertos); reforzado el contraste entre 8 núcleos de bosquete denso (`grove_nuclei`, espaciado `1,96 m` con árboles jóvenes acompañantes) y 4 claros abiertos (`sparse_glades`) manteniendo el claro del campamento y las líneas de visión 100 % despejados (`23.7`); añadidos **14 setos volumétricos 3D amplios (`ForestHedgeThickets` / `ForestHedgeThicket_0..13`, `2,6–4,2 m` de ancho)** con tallos leñosos, masa foliar 3D cohesiva, frondas exteriores y **9 colisionadores físicos `StaticBody3D` (`ForestHedgeCollider_0..8`)** que impiden el paso fuera de camino sin obstruir senderos ni puente.
5. **Verificación tras la última edición (`task-3024`, `task-3042`, `task-3052`):** `test_camps_layout` **259/259**, `test_camera_contract` **49/49**, `loading/test_loading` **172/172**, `combat/test_combat_rules` **124/124**, `player/test_player_preferences` **133/133**, `player/test_grid_navigation` **12/12**, `player/test_player_integration` **110/110** (**859/859 PASS, 0 FAIL**). Forward+ MX350 (`1440×810`): **15,5–21,0 FPS**, **1,28M–1,51M primitivas**, **4,8–6,9 s** carga. Comparativa clic-superponer con SHA-256 en [output/godot-forest-paso23-20261122/index.html](output/godot-forest-paso23-20261122/index.html) y registro en [CAMPAMENTOS_GODOT_20261115.md](docs/evidence/CAMPAMENTOS_GODOT_20261115.md#11-paso-23--pulido-final-del-bosque-de-o2-camp-forest-pleamar-pasos-231237-y-setos-volumétricos--22112026). Aceptación artística final del usuario y pruebas físicas pendientes.

## Campamentos Godot · O2: Bosque camino a Pleamar — FASE 2 (Pasos 11–20) — 2026-11-22

Completada la **FASE 2 — Campamento, iluminación e integración RPG 2.5D (Pasos 11–20)** sobre `02 · Bosque camino a Pleamar` (`camp-forest-pleamar`) en `prototypes/godot-campamentos/`, aprovechando íntegramente el entorno natural de **FASE 1** sin rehacer el bosque ni el río y conservando los demás campamentos (`camp-a1-rooms`, `wreck-beach`, `cliffs-observatory`, `coastal-refuge`), `prototypes/godot-retiro/` y Pecio:

1. **Refugio de tela reconstruido (`Paso 11`):** cumbrera trasera elevada (`2,38 m`, travesaño `RidgePole`, 2 postes traseros `RearPole_0..1` y amarres a árboles) descendiendo hacia el alero frontal (`1,66 m`, altura libre mínima `1,56 m`, 2 postes frontales `FrontPole_0..1`) para que la cámara VTT lea toda la caída catenaria, las costuras y los pliegues sin quedar de canto; contorno festoneado no rectangular (`_make_sculpted_tarp_mesh`), arrugas radiales de tensión en las 4 esquinas, ribete curvo cosido, 4 parches de cuero (`CornerPatch_0..3`), 4 ojales de latón (`CornerGrommet_0..3`), 4 vientos a estacas (`ShelterStake_0..3` + `StakeLoop_0..3`), shader textil `create_tarp_canvas_shader_material` con trama de lino/desgaste/rugosidad `0,76–0,95` y ventana local Bayer 4×4 (`max 42%`) sobre personajes ocluidos manteniendo la lona siempre visible y la cámara estable (`OccludedSilhouette` activo).
2. **Hoguera y caldero suspendido (`Paso 12`):** trípode de 3 patas (`TripodLeg_0..2`) convergiendo radialmente en la unión superior `(0, 1.28, 0)` con amarres (`TripodApexLashing_0..2`) y argolla de forja (`TripodApexRing`); caldero (`CampfireKettle`) a `y = 0,49 m` sobre las llamas suspendido por cadena con eslabones (`CauldronChain` + `ChainLink_0..4`), gancho en S (`CauldronHook`), asa curva (`CauldronBailHandle`) y orejetas (`CauldronLug_L/R`); 6 leños parcialmente carbonizados con fisuras incandescentes (`LogEmberFissure_0..5`), 7 brasas (`GlowingCoal_0..6`), 11 piedras irregulares tiznadas (`HearthStone_0..10`), sombra AO (`CampfireContactAO`), 5 lenguas de llama asimétricas sin blanco quemado; humo de combustión anular (`EMISSION_SHAPE_RING`, `inner_radius = 0,185`) bordeando el exterior del caldero sin atravesarlo, vapor blanco de cocción (`KettleSteamParticles`) y 3 estados (`"off"`, `"embers"`, `"lit"`).
3. **Mobiliario, interacciones de descanso, reglas y persistencia (`Pasos 13–14`):** tronco asiento (`NaturalSeat_forest`) con 4 discos de corte de duramen (`LogCutEnd_0..3`), anillos internos (`LogCutCore_0..3`), planos superiores desgastados (`LogWornSeatFlat_0..1`) y piedras de calce; petates (`create_bedroll`) con grosor físico 3D cerrado en los 4 lados en esterilla (`0,024 m`), manta (`0,036 m`) y embozo (`0,026 m`); ocultación inmediata garantizada de `CampCookButton` al alejarse o cambiar de objetivo; descanso simultáneo de los 3 héroes verificado; `perform_camp_rest("short-rest" / "long-rest")` conectado con recuperación de PG, avance de reloj y brasas al amanecer; `export_camp_state()` y `restore_camp_state()` preservando fase, clima, fuego, mochilas, petates, posiciones/poses del grupo y PG.
4. **Iluminación, integración 2D-en-3D, fauna y audio por superficie (`Pasos 15–19`):** eliminado el velo grisáceo diurno (`fog_depth_begin = 78 m`, `fog_density = 0,055`, rebote verde-ámbar `#5a7462`, sol `1,48`); noche con luz lunar legible (`#88b0e8`, `0,68`), parpadeo orgánico de hoguera en 4 frecuencias (`14,2 m`) y `0,0` autoluz en personajes sin antorcha encendida; `SelectionRing` y `ContactShadow` alineados a la normal real de pendiente (`_resolve_floor_normal`) y adaptados al vadeo; aves posadas en ramas altas (`ForestPerchedThrush` a `2,38 m`, `ForestPerchedFinch` a `2,52 m`), copos `SnowParticles` radiales sin cuadrados blancos, y audio 3D de pasos diferenciado por superficie (`"earth"`, `"wood"` en puente y `"water"` al vadear) + ganancia dinámica de hoguera ligada a combustible y avivado.
5. **Verificación tras la última edición (`task-2832`, `task-2859`):** `test_camps_layout` **255/255**, `test_camera_contract` **49/49**, `loading/test_loading` **172/172**, `combat/test_combat_rules` **124/124**, `player/test_player_preferences` **133/133**, `player/test_grid_navigation` **12/12**, `player/test_player_integration` **110/110** (**855/855 PASS, 0 FAIL**). Forward+ MX350 (`1440×810`): **16,4–22,0 FPS**, **844K–953K primitivas**, **3,9–5,8 s** carga. Comparativa clic-superponer + escena de descanso simultáneo en [output/godot-forest-fase2-20261122/index.html](output/godot-forest-fase2-20261122/index.html) y registro en [CAMPAMENTOS_GODOT_20261115.md](docs/evidence/CAMPAMENTOS_GODOT_20261115.md#10-fase-2--campamento-iluminación-e-integración-rpg-25d-de-o2-camp-forest-pleamar-pasos-1120--22112026). Aceptación artística final del usuario y pruebas físicas pendientes.

## Campamentos Godot · O2: Bosque camino a Pleamar — FASE 1 (Pasos 1–10) — 2026-11-22

Completada la **FASE 1 — Reconstrucción del entorno natural (Pasos 1–10)** sobre `02 · Bosque camino a Pleamar` (`camp-forest-pleamar`) en `prototypes/godot-campamentos/`, preservando distribución general, claro jugable, los otros 4 campamentos (`camp-a1-rooms`, `wreck-beach`, `cliffs-observatory`, `coastal-refuge`), `prototypes/godot-retiro/` y Pecio:

1. **Auditoría y eliminación de artefactos (`Paso 1.6`):** corregido `_add_guy_rope()` en `camp_prop_factory.gd` (que proyectaba en coords globales las 6 tensoras del refugio sobre la ribera NW creando las líneas amarillas angulosas) y migradas todas las setas a prototipos aislados `MultiMesh` (`get_mushroom_proto`) + `st.deindex()` en `flush_batches()` (0 triángulos estirados `> 3.2 m` en `BiomeVegetation`).
2. **Río continuo, shader de dos escalas y orillas orgánicas (`Pasos 2–4`):** eliminadas las bandas longitudinales por cizallado temporal y los recortes rectangulares de celdas en orillas mediante `GroundPrimary` continuo esculpido (`0.75 m`) fusionado sin costura con `OuterTerrainSkirt`; shader de agua corriente en espacio de flujo real (`river_waves_macro` + `river_waves_fine`), normales móviles, 10 `wake_pts` con estelas en V no repetitivas, barras de sedimento, grupos irregulares de cantos semienterrados, raíces expuestas y helechos/carrizos ribereños.
3. **Puente, colisiones, `SelectionRing` y navegación (`Paso 5`):** 13 tablones en 3 tonos, bordillos rústicos, losas planas de acceso y `StreamFootbridgeBody` con rampas solapadas sin arista; corregido el hueco en `col=0` hacia el camino oeste (`524/526` celdas, `4418` aristas); `SelectionRing` elevado sobre la lámina de agua al vadear; `find_path()` en `walkable_grid.gd` con coste acuático `5.0` que cruza automáticamente por el puente en lugar de vadear.
4. **Terreno, caminos, bosque esculpido, sotobosque y ocultación vegetal 2.5D (`Pasos 6–10`):** relieve forestal suave 1:1 con colisión, 5 capas de terreno y curvas S orgánicas en caminos norte/sur/oeste con piedras/raíces laterales; coníferas con verticilos estrellados emplumados (`_append_evergreen_whorl`) y frondosas ligeras (`get_foliage_lobe_variants`) con volumen 3D (`canopy_volume_boost = 1.0`, **−22,5% primitivas** y **−48% tiempo de carga**); sotobosque agrupado/desaturado y ramas caídas; transparencia progresiva Bayer 4×4 en copas entre cámara y personajes (`occlude_fade_enabled = 1.0`, **solo O2**, troncos intactos y 0 cambios de colisión).
5. **Verificación tras la última edición (`task-2649`, `task-2591`, `task-2604`):** `test_camps_layout` **238/238**, `test_camera_contract` **49/49**, `loading/test_loading` **172/172**, `combat/test_combat_rules` **124/124**, `player/test_player_preferences` **133/133**, `player/test_grid_navigation` **12/12**, `player/test_player_integration` **110/110** (**838/838 PASS, 0 FAIL**). Forward+ MX350 (`1440×810`): **16,5–22,4 FPS**, **846K–912K primitivas**, **4,3–4,9 s** carga. Comparativa clic-superponer con SHA-256 en [output/godot-forest-fase1-20261122/index.html](output/godot-forest-fase1-20261122/index.html) y registro en [CAMPAMENTOS_GODOT_20261115.md](docs/evidence/CAMPAMENTOS_GODOT_20261115.md#9-fase-1--reconstrucción-del-entorno-natural-de-o2-camp-forest-pleamar-pasos-110--22112026). Aceptación artística final del usuario y pruebas físicas pendientes.

**Interpretación en cargas Godot, 19/11:** corregida la orientación del público al aplaudir en Pecio, Retiro y Campamentos; conserva sprites y resto de estados. Suite actual 172/172 y 24 pares de captura. [Registro](docs/evidence/GODOT_SKILL_LOADING_20261114.md#corrección-de-interpretación--19112026).

## Campamentos Godot · O2: Bosque camino a Pleamar (Pasos 1–16) — 2026-11-19

Completada la auditoría y mejora visual/funcional integral en `prototypes/godot-campamentos/` sobre `camp-forest-pleamar` conservando distribución, claro jugable y los demás campamentos/proyectos (`camp-a1-rooms`, `godot-retiro` y Pecio intactos):

1. **Río, puente y suelo continuo (`Pasos 1–3, 14`):** shader de río `create_river_shader_material` en espacio mundo sin bandas longitudinales (`across = 8`), traslucidez somero–profundo sobre lecho de guijarros y estelas orgánicas en piedras/pilotes (`wake_pts`); puente rústico `StreamFootbridge` con estribos en orilla, vigas arqueadas, pilotes con collares de musgo, amarres de cuerda, 12 tablones, colisión sólida y cruce seco en `CampStructure.is_water_at()`; shader unificado `create_forest_terrain_shader_material` en claro y faldón exterior ampliado (`OuterTerrainSkirt` con color neutro `0,0,0,1`) trazando sin costuras musgo, hojarasca, tierra del claro, sendero continuo a Pleamar y relieve que cierra el corte recto del horizonte.
2. **Bosque, sotobosque y optimización MultiMesh (`Pasos 4, 5, 16.3`):** copas 3D con textura continua `foliage.webp` sin recortes negros del atlas, vegetación repetida instanciada por `MultiMeshInstance3D` (`ForestFlora_*`), variación cromática por instancia y sotobosque agrupado junto a troncos, rocas y riberas con tonos húmedos apagados.
3. **Refugio, hoguera, noche, sprites 2D e interfaz (`Pasos 6–15`):** lona `linen.webp` sobre 2 postes rústicos, travesaño, farolillo colgante `ShelterHangingLantern`, cuerdas a árboles reales/estacas y cesta; hoguera con lecho de ceniza, troncos carbonizados, caldero y llamas orgánicas por shader + humo radial; luciérnagas radiales y audio 3D de río/fuego; luz lunar nocturna legible sin negros aplastados, `Sprite3D.shaded = true` y `SeatedCharacterSurface` sombreado por píxel; sincronización de reloj con fase (`18:30` atardecer / `22:15` noche / `12:00` día) y título DM sin duplicar.
4. **Ampliación en 10 puntos de O2 (`camp_structure.gd`, `camp_fauna_kit.gd`, `camp_material_kit.gd`, `camp_environment_kit.gd`, `camp_outdoor_builder.gd`, `tactical_grid_overlay.gd`, `camp_scene_controller.gd`, `player_token.gd`, `player_preferences.gd`):** caminos norte (`-96 m`), sur (`+116 m`) y oeste (`-28 m`) alargados sin costuras; grid activado con radio por defecto `64 m` y celdas extendidas por los tres caminos (`518/523` verificadas); `ForestDeer`/`ForestStag` fuera del grid con ciclos más largos (`148–165 s`) y pezuñas ajustadas al relieve real por `eval_ground_height`; bosque/sotobosque más denso fuera del claro con arbustos en la base de cada árbol y raíces de `birch`/`sapling` corregidas; paso seco restringido a tablones del puente (`is_on_forest_bridge`), vadeo poco profundo andando (`-0.22 m` sin `swim`), olas reactivas (`mover_ripples[8]`), salpicaduras (`WaterSplashParticles` + `SplashRing`) y huellas húmedas de botas (`~150 s` base y tope estricto de `15.0 m` en `wet_distance_remaining_m`) con intensidad decreciente (`0.84 → 0.04`) que se evaporan según clima y hora del día (`72 s` día despejado a `185 s` niebla).
5. **Verificación tras el último cambio (`task-2259`):** `test_camps_layout.gd` **166/166 PASS**, `test_camera_contract.gd` **49/49 PASS**, `loading/test_loading.gd` **172/172 PASS**, `combat/test_combat_rules.gd` **124/124 PASS**, `player/test_player_preferences.gd` **133/133 PASS**, `player/test_grid_navigation.gd` **12/12 PASS**, `player/test_player_integration.gd` **110/110 PASS** (**766/766 PASS**). En Vulkan Forward+ (`1440×810` MX350): **19,4–26,0 FPS** en las 7 vistas O2 (incluyendo vadeo y huellas con degradado hasta 15 m). Comparativa superpuesta en [output/godot-forest-o2-20261119/index.html](output/godot-forest-o2-20261119/index.html) y registro en [CAMPAMENTOS_GODOT_20261115.md](docs/evidence/CAMPAMENTOS_GODOT_20261115.md#8-auditoría-y-mejora-integral-de-o2-02--bosque-camino-a-pleamar-pasos-116--19112026). Aceptación visual final del usuario y pruebas físicas pendientes.

## Micromejoras visuales transversales y por campaña (Pecio + Retiro + Campamentos) — 2026-11-19

Completadas las micromejoras visuales solicitadas conservando planta, navegación, colisiones y trabajo paralelo:

1. **Transversales (`player_token.gd`, `map_exit.gd` en Pecio, Retiro y Campamentos):** sombra `ContactShadow` escalada a estatura canónica (compensando `race_scale` en Campamentos) y desvanecida en saltos/vuelo (`1.0 → 0.38`); `SelectionRing` con pulso lento respetando `SkillLoading.reduced`, oculto al sentarse/reposar y sigilo translúcido real (`alpha = 0.28`, `emission_enabled = false`); balanceo pendular suave (`±0.024 rad`) en las placas colgantes `dragon_plaque` respetando `SkillLoading.reduced` y sin mover `SignpostProp`.
2. **El Retiro del Dragón (`retreat_layout_builder.gd`):** `_apply_atmosphere_lighting()` sincroniza ahora `ProceduralSkyMaterial` y `env.fog_light_color` en `day`, `dusk` y `night`; `_build_interior_contact_ao()` añade decals radiales de oclusión de contacto bajo columnas/braseros de A5, mesas/bancos/fogón/toneles de A3, librerías/pupitres/mesa cartográfica de A4 y conjuntos de plaza A1.
3. **Pecio Rosa de los Vientos (`ocean_water.gdshader`, `ship_environment.gd`, `main.tscn`):** parámetros dinámicos `fresnel_sky_color`, `distant_color_tint`, `fresnel_strength` y `ground_bottom_color` sincronizados con hora y clima; `glow_intensity = 0.32` y `glow_bloom = 0.045` iniciales en `main.tscn`.
4. **Campamentos de Descanso (`camp_material_kit.gd`, `camp_prop_factory.gd`):** `make_organic_normal()` con ruido lattice periódico FBM multioctava, mipmaps y caché (`cloth`, `leather`, `timber`, `rock`); `make_leather_mat()` pasa a usar `"leather"`; `_add_prop_contact_ao()` con textura radial acolchada a alpha nulo en bordes bajo petates, mochilas, fogón, asientos naturales, kits personales, farol portátil y lona abierta.
5. **Verificación tras la última edición (`task-1998`) e informe comparativo:**
   - **Pecio:** `test_ship_environment.gd` **2210 PASS / 0 FAIL**, `test_character_animations.gd` **EXIT=0**, `test_vtt_interfaces.gd` **57 PASS / 0 FAIL**, `test_camera_contract.gd` **49 PASS / 0 FAIL** (`test_pecio_integrity.gd` falla en 8 capas previas `Grid_C1..C10` ajenas a esta entrega).
   - **Retiro:** `test_retreat_layout.gd` **136 PASS / 0 FAIL**, `test_map_exits.gd` **128 PASSED, 0 FAILED**, `test_camera_contract.gd` **49 PASS / 0 FAIL**.
   - **Campamentos:** `test_camps_layout.gd` **151 PASSED / 0 FAILED** (persisten avisos previos de `get_visible_rect` en headless), `test_camera_contract.gd` **49 PASS / 0 FAIL**.
   - **Informe interactivo Antes/Después (10 pares Forward+ `1440×810`):** [output/micro-visual-improvements-20261119/index.html](output/micro-visual-improvements-20261119/index.html) (`records.json` con hashes SHA-256). Aceptación visual del usuario y pruebas físicas en dispositivo quedan separadas y pendientes.

## Retiro del Dragón (Godot) · Auditoría de Fauna, Puertas Interactivas A1 y Acciones Animadas — 2026-11-19

Completada la auditoría y corrección integral en `prototypes/godot-retiro/` conservando el mapa y las campañas paralelas:

1. **Fauna sin atravesar rocas (`retreat_layout_builder.gd`):** las 6 gaviotas posadas (`A1PerchedGull_0..5`) se asientan automáticamente mediante raycast físico + muestreo de triángulos sobre la roca y remates de pretil (`A1GullPerchCapstone_*`), las 3 gaviotas planeando (`A1GlidingGull_0..2`) orbitan sobre la bahía abierta (`z >= 107.8m`) y las 8 mariposas sobre flores despejadas (**0 colisiones físicas ni visuales** verificadas en 210 muestras), y se retiró la flor de cornisa flotante sobre Celda 1.
2. **Puertas interactivas A1 + A2 (`interactive_door.gd`, `retreat_scene_enhancer.gd`, `vtt_role_ui.gd`):** las 6 puertas dobles de A1 (`CellDoor_cell_1..6`) y la de A2 se abren y cierran con `[T]` (botón HUD dinámico) y desde el panel del DM (`get_scene_doors()` devuelve **7 puertas**), con animación de bisagras, colisión sólida al cerrar, audio procedural y animación del personaje.
3. **Sprites de asiento 8-dir, descanso 3D en cama y 84 interacciones animadas (`player_token.gd`, `seated_character_surface.gd`, `resting_character_surface.gd`, `resting_body_mesh.gd`, `shaders/rest_blanket.gdshader`, `interactive_prop.gd`, `vtt_role_ui.gd`, `vtt_player_hud.gd`):** activadas las 8 vistas de sentado (`SeatedCharacterSurface`) y el reposo 3D con manta (`RestingCharacterSurface` + `RestBlanket`) para **Mia, Trinity y Mike**; habilitados **84 props en 21 categorías** (camas, hamacas con balanceo, bancos multiplaza, taburetes, cojín, puertas, hoguera/braseros/fogón con encendido y avivado incluso de día, leñera recolectable, pozo con polea/cubo/cantimplora, baúles abatibles, engranaje de Myla, altares con velas votivas, cabrestante A2 por `[T]`, regaderas con gotas, herboristería, armero, tablón, refrigerios, escritorios y estanterías) con prompts en vivo en el HUD y botón `[T] Levantarse`.
4. **Pruebas y rendimiento tras los cambios finales (`task-6715`, `task-6662`, `task-6708`):** `verify_a1_fixes_audit.gd` **37 PASS / 0 FAIL**, `test_retreat_layout.gd` **136/136**, `test_map_exits.gd` **128/128**, `test_camera_contract.gd` **49/49**, `player/test_grid_navigation.gd` **12/12**, `loading/test_map_roundtrip.gd` **24/24**, `inventory/test_backpack.gd` **161/161** (**547 PASS / 0 FAIL**). En Vulkan Forward+ (`1600×900` MX350): **`BELOW_30_FPS=[]`** (`overview` **56.9 FPS**, `Z1_beach` **85.7 FPS**, `Z3_a1_plaza` **69.6 FPS**, `Z3_a1_cell_in` **82.7 FPS**, `Z5_a3_dining` **90.0 FPS**, `Z8_a5_temple` **73.6 FPS**).
5. **Informe interactivo clic-superponer:** [output/retreat-a1-fixes-audit-20261119/index.html](output/retreat-a1-fixes-audit-20261119/index.html) y registro en [RETIRO_GODOT_LAYERS_20261114.md](docs/evidence/RETIRO_GODOT_LAYERS_20261114.md#auditoría-a1-y-retiro-fauna-sin-colisiones-puertas-interactivas-e-interacciones-animadas--19112026). Aceptación visual final del usuario pendiente.

## Retiro del Dragón (Godot) · Bloque A — Zona A1 (Plaza Central y 6 Celdas) en 11 Pasos — 2026-11-18

Completado íntegramente el **Bloque A (Zona A1: Plaza y 6 Celdas Excavadas, Pasos 1–11)** en `prototypes/godot-retiro/` (`scripts/retreat_scene_enhancer.gd`, `scripts/retreat_layout_builder.gd`, `scripts/interactive_prop.gd`, `scripts/player_token.gd` y `scripts/vtt_campaign_data.gd`), conservando Z1/Z2 y las demás zonas del mapa:

1. **Roca y volumetría base (`Paso 1`):** acantilado de basalto volcánico estratificado (`ExcavatedCaveRoofs`, `A1Buttress_0..6_T0..2`), cierres laterales escalonados (`A1WestFlankStrata_*`, `A1EastFlankStrata_*`) y portales de sillería de `1.40m` de espesor real.
2. **Interiores reales excavados (`Paso 2`) y ocultación (`Paso 3`):** paredes rocosas laterales y traseras irregulares, cornisas orgánicas de cueva, lajas talladas interiores, esteras de yute, hornacinas con libros/velas, tapices dracónicos, doble iluminación de santuario por celda y puertas monásticas entreabiertas (`CellDoor_cell_1..6`) con *cutaway* inmediato e histéresis de `+0.45m` (`update_cave_roof_cutaways`).
3. **Plaza y Estatua de Astalagan (`Paso 4`) y Pozo interactivo (`Paso 5`):** estatua del dragón elevada y centrada en `(85.80, 9.54, 93.35)` sobre `AstalaganCircularPedestal` (3 niveles + 8 velas votivas + circulación 360°), `MonasticFountainWell` profundo sin disco cian superficial y mecánica funcional de llenado de cantimplora (`cantimplora_vacia` → `cantimplora_llena` con límite si no queda vacía, animación de polea/cubo y audio procedural).
4. **Iluminación nocturna (`Paso 6`) y vegetación (`Paso 7`):** base lunar azul fría + 12 antorchas murales (`A1PortalTorch_*`), 5 faroles de pretil (`A1ParapetLantern_*`), derrame interior y 11 sombras de contacto AO (`_optimize_scene_lights` con `distance_fade_enabled = false`), macetas pareadas flanqueando los 6 portales, 7 parterres de piedra, flores blancas/lavandas y 3 conjuntos de jardinería monástica.
5. **Interacciones (`Paso 8`), vida monástica (`Paso 9`), fauna (`Paso 10`) y pulido (`Paso 11`):** camas, hamacas, bancos de claustro/hoguera/pérgola y taburetes usables (`[T]`); telas sobrias, petates/cestas, hierbas secándose en Celda 2, altar contemplativo en Celda 6 y mesa auxiliar en la plaza; 6 gaviotas posadas, 3 gaviotas planeando, 8 mariposas y paisaje sonoro costero; limpieza de postes/barras residuales en los vanos.
6. **Pruebas y rendimiento tras la última edición (`task-6344`, `task-6352`, `task-6364`, `task-6376`):** `verify_a1_step11.gd` (**31 PASS / 0 FAIL**, `137` casillas en plaza y `142` en las 6 celdas, `safe_frac=1.00` hacia las 6 puertas), `test_retreat_layout.gd` (**136 PASS / 0 FAIL**), `test_map_exits.gd` (**128 PASSED, 0 FAILED**), `test_camera_contract.gd` (**49 PASS / 0 FAIL**), `player/test_grid_navigation.gd` (**12 passed, 0 failed**), `loading/test_map_roundtrip.gd` (**24 passed; 0 failed**) e `inventory/test_backpack.gd` (**161 PASS / 0 FAIL**). En Vulkan Forward+ (`1600×900` MX350, `task-6376`), **`BELOW_30_FPS=[]`**: `Z3_a1_plaza` **54.0 FPS** (`51.1 p95`), `Z3_a1_cell_in` **63.2 FPS** (`59.1 p95`), `overview` **43.9 FPS** (`34.1 p95`), `Z1..Z10` **60.4–80.7 FPS**.
7. **Informe interactivo clic-a-paso (`Base → Paso 1..11`):** [output/retreat-a1-11steps-20261118/index.html](output/retreat-a1-11steps-20261118/index.html) y registro en [RETIRO_GODOT_LAYERS_20261114.md](docs/evidence/RETIRO_GODOT_LAYERS_20261114.md#bloque-a--zona-a1-z3_a1_plaza-y-las-6-celdas-excavadas-en-11-pasos-paso-1paso-11--18112026). Pendientes separados: aceptación visual de A1, bloques `B–F` y pruebas ENet multi-dispositivo.

## Retiro del Dragón (Godot) · Playa Z1 y Escalera Z2 en 10 Pasos (Pasos 1–10) — 2026-11-18

Completado el bloque de **10 pasos (`Paso 1` a `Paso 10`)** sobre la llegada costera `Z1_BEACH`, el muelle (`RicketyWoodenPier`), la escalera tallada `Z2_ASCENT` y la salida occidental hacia Pleamar en `prototypes/godot-retiro/` (`scripts/retreat_layout_builder.gd` y `scenes/main.tscn`), conservando la planta canónica, cotas, los carteles 3D empalados a `-0.55m` (`map_exit.gd`), el control DM de marea (`Baja`/`Creciente`/`Alta`) y el resto de zonas (`Z3`–`Z11`):

1. **Agua y línea de costa (`Paso 1`):** batimetría vertical + radial en 3 zonas (turquesa somero sobre fondo marino `SeabedPlane` → azul medio → azul Atlántico profundo), espuma rota no uniforme con golpes de ola en pilotes/rocas/pie de Z2 (`MM_WaveLapFoam`), cintas de algas variadas (`MM_SubmergedKelp_A/B`) y piedras sumergidas (`MM_SubmergedStones`).
2. **Muelle y bote (`Paso 2`):** lógica constructiva diferenciada (acceso con traviesas `PierAccessSleepers` y postes `PierAccessStile_*`, pasillo de desgaste `PierWearRunner`, escalón frontal de embarque `PierEmbarkStep`, cruces de San Andrés `PierFrontXBraceA/B`), poste maestro `PierMainMooringPost`, props curados (1 barril zunchado, 2 cajas, 1 rollo de cuerda, 1 red con corchos `PierDrapedNet`) y sombra de contacto del bote (`BoatWaterContactAO`) con amarras tensas.
3. **Escalera Z2 (`Paso 3`):** variación de losas (`MM_Z2StairFlags`), cuñas basálticas de anclaje (`MM_Z2RockAnchors`), musgo en juntas (`MM_Z2JointMoss`), postes principales en giros (`Z2TurnPlinth_*`, `Z2TurnMainPost_*`), pórtico de entrada con farol y rótulo `El Retiro ↑` (`Z2EntranceLanternPost`) y pilares de llegada a A1 (`Z2TopExitPillar_*`).
4. **Playa y terreno (`Paso 4`):** separación de 4 superficies en `_eval_cove_beach_sample` (arena húmeda, arena seca central despejada, tierra compactada de paso y grava basáltica bajo el muelle), losas pisadas (`MM_BeachTrailPavers`) y restos marinos perimetrales (`MM_ShoreShells`).
5. **Roca, acantilado y grieta oeste (`Paso 5`):** costillas de fractura columnar (`MM_CliffFractureRibs`), vegetación de grieta (`MM_CliffCreviceVines`, `MM_CliffCreviceFerns`) y hendidura costera occidental (`WestCoastalCleftPocket`, `WestCleftShadowRecess`, `WestCleftBasaltJamb_*`, `Mist_WestCleftMouth`).
6. **Vegetación (`Paso 6`):** variación de silueta/escala/inclinación/tono en coníferas costeras y de monte (`_append_scenic_pine`) y collarines de transición roca-hierba-helecho-brezo (`MM_RockGrassTransitions`, `MM_ShelteredCoastalFerns`, `MM_ShelteredCoastalHeather`).
7. **Iluminación y atmósfera (`Paso 7`):** sol oblicuo costero (`-31°, -49°, energy=1.62`), ambiente azul profundo (`0.38`), niebla marina (`0.0031`), rebote turquesa (`CoastalWaterBounce_Pier/Z2`), 16 sellos AO (`CoastalContactAO_*`) y jerarquía de 3 focos (`CoastalFocalHierarchy_1..3`: Muelle/Bote → Arranque Z2 → Salida Oeste Pleamar).
8. **Lectura de salida a Pleamar (`Paso 8`) y Props monásticos (`Paso 9`):** poste direccional `PleamarWayfinderPost` con doble aspa (`← Costa Pleamar (Marea ↓)` / `↑ Senda Alta (Collado)`), peldaños del desvío alto (`HighRidgeForkStep_0..2`), cartel de ruta marítima `PierSeaRouteBoard` (`Pleamar · Pecio →`) y acopio monástico austero (`MonasticLandingSupplies`).
9. **Pruebas y rendimiento tras la última edición (`task-5839`, `task-5845`, `task-5850`, `task-5887`, `task-5894`):** `test_retreat_layout.gd` (**136 PASS / 0 FAIL**), `test_map_exits.gd` (**128 PASSED, 0 FAILED**), `test_camera_contract.gd` (**49 PASS / 0 FAIL**), `test_grid_navigation.gd` (**12 passed, 0 failed**), `loading/test_map_roundtrip.gd` (**24 passed; 0 failed**) y `verify_beach_nav_step10.gd` (**25 PASS / 0 FAIL**, `safe_frac=1.000` en los 4 barridos de cápsula). En Vulkan Forward+ (`1600×900` MX350, `task-5894`), **`BELOW_30_FPS=[]`** con **`>= 50.9 FPS p95`** en todas las zonas (`Z1_beach` **81.1 FPS** media / **73.2 p95**; `Z1_pleamar_cove` **85.0 FPS** / **75.4 p95**; `Z2_ascent` **80.6 FPS** / **73.9 p95**; `overview` **55.6 FPS** / **50.9 p95**; `Z3..Z10` **70.8–90.1 FPS** media).
10. **Informe interactivo clic-a-paso (`Base → Paso 1..10`):** [output/retreat-beach-10steps-20261118/index.html](output/retreat-beach-10steps-20261118/index.html) y registro en [RETIRO_GODOT_LAYERS_20261114.md](docs/evidence/RETIRO_GODOT_LAYERS_20261114.md#zona-z1-y-escalera-z2--acabado-costero-en-10-pasos-pasos-110--18112026). Pendientes separados: aceptación visual del usuario y red ENet multi-dispositivo.

## Retiro del Dragón (Godot) · Playa y Embarcadero Z1 (Pasos 1–7) — 2026-11-18

Completada la reconstrucción por pasos (`1.1`–`6.6`) y el refinamiento de carteles empalados y sombreado (**Paso 7**) en `prototypes/godot-retiro/` conservando planta, cotas, escaleras Z2 y zonas restantes: costa basáltica continua ampliada al oeste (`PleamarCoveBeach`, `PleamarFarWestSpurCliff`), muelle desvencijado (`RicketyWoodenPier`) con gran bote de remos (`CoastalRowboat`), postes 3D de roble empalados a `-0.55m` bajo tierra con orientación fija inmóvil frente a la cámara, sombreado PSSM 4-splits PCF5 (`shadow_normal_bias = 0.25`), sombras reales activadas en pinos/rocas/contrafuertes/carteles de Z1, oclusión de contacto en arena seca (`_eval_cove_beach_sample`), agua sin halos cian con espuma de encaje y algas sumergidas, y control DM de marea (`Baja`/`Creciente`/`Alta`) sincronizado en `MapTransition` y `LoadingSession` (HTTP local `47921`, sin ENet completo).

- **Pruebas tras la última edición (`task-5188`):** `test_retreat_layout.gd` (**136 PASS / 0 FAIL**), `test_map_exits.gd` (**128 PASSED, 0 FAILED**), `test_camera_contract.gd` (**49 PASS / 0 FAIL**) y `loading/test_map_roundtrip.gd` (**24 passed; 0 failed**).
- **Rendimiento Forward+ (`1600x900` MX350, `task-5188`):** **0 zonas por debajo de 30 FPS (`BELOW_30_FPS=[]`)**: `Z1_beach` **80.6 FPS** (`70.7 p95`), `Z1_pleamar_cove` **83.0 FPS** (`75.2 p95`), `overview` **53.1 FPS** (`50.0 p95`), y todas las zonas restantes `67.5–165.6 FPS` media (`62.3–141.3 FPS p95`).
- **Informe interactivo por pasos (clic = paso siguiente `Base -> Paso 1..7` + vistas Jugador/DM):** [retreat-beach-final-20261118/index.html](output/retreat-beach-final-20261118/index.html) y registro detallado en [RETIRO_GODOT_LAYERS_20261114.md](docs/evidence/RETIRO_GODOT_LAYERS_20261114.md#zona-z1--playa-y-embarcadero-en-godot-pasos-17--18112026). Aceptación visual del usuario pendiente.

## Stormwreck · asientos para los tres protagonistas — 2026-11-18

Mía y Mike tienen ocho vistas de reposo sentado con pivotes de pelvis y suelas. Se probaron con Trinity en muestras del banco con respaldo, tronco caído, madero de deriva y laja. Se mantienen nueve ubicaciones interactivas. Los dos bancos A1 se vinculan a sus cojines reales y la piedra del bosque reutiliza la familia de laja. [Visor por tipo y personaje](output/stormwreck-party-seats/index.html). Aceptación artística por el usuario pendiente.

Regresión del botón «Sentarse» corregida. El HUD mantiene el callback del aviso de Campamentos y lo ejecuta al pulsar, con el flujo genérico disponible para las demás interacciones. La suite de Campamentos prueba sentarse y levantarse pulsando la señal del botón.

## Stormwreck · descanso tumbado en cama y petate — 2026-11-18

Mía, Mike y Trinity se tumban desde el botón contextual. La revisión del 3D usa una malla cerrada de cabeza, cuello y hombros con normales suaves y medidas de los rasgos tomadas de cada ilustración. El pelo y los bordes de la ropa envuelven los laterales con una escala más uniforme. El personaje conserva el apoyo, el rumbo y la talla en cada lecho. Se comprueban la ocupación, la retirada de la manta al levantarse y la escarcha sobre la malla. [Comparativas con la postura anterior y vistas de noche](output/stormwreck-bed-rest/sculpt/index.html). Pendientes las transiciones dibujadas y el encaje específico de las hamacas.

## Trinity · asiento, rumbo y reutilización — 2026-11-18

Corrección puntual del tres cuartos frontal derecho. Se reutiliza el dibujo izquierdo en espejo con pelvis y suelas reflejadas. Verificados el rumbo y el apoyo en el mismo encuadre del tronco, además del efecto de escarcha. 180 comprobaciones en Forward+. [Comparativa de la vista corregida](output/trinity-object-facing/fit/right/index.html).

Candidata de Campamentos Godot con ocho vistas sostenidas de Trinity y rumbo fijo al asiento durante el giro. Cada plaza se ajusta a la superficie del tronco, madero o piedra existente. En la plaza central del tronco la altura pasa de 0,36 m a 0,425 m. Las suelas registradas guían la profundidad de las piernas para que se lean por delante del borde y queden ocultas cuando corresponde. Verificados los cuatro exteriores, el giro Q/E, la silla de prueba, la liberación de plazas y la escarcha sobre la silueta. 183 comprobaciones en Godot Forward+ y 26 del pipeline. [Comparativa y pruebas](output/trinity-object-facing/fit/index.html), [contrato de asientos](docs/design/STORMWRECK_MOTION_MATRIX_20261118.md#asientos-reutilizables-en-godot). Pendientes de revisión artística por el usuario, transiciones, pose tumbada y contactos específicos de manos.

## Letreros de salida de mapa y tipografía común VTT (Metamorphous + Almendra) — 18/11/2026

Aplicada de forma permanente para todo el juego en `prototypes/godot-retiro/`, `prototypes/godot-pecio/`, `prototypes/godot-campamentos/` y `prototypes/godot-shared/ui/`:
- **Tipografía común (`Metamorphous` y `Almendra` SIL OFL 1.1):** instaladas en `assets/ui/fonts/` y conectadas en `vtt_ui_theme.gd`, `vtt_player_hud.gd` y `dm_style/appearance.gd`: **Metamorphous** para títulos, nombres de destinos, cabeceras y rótulos de letrero; **Almendra** (`Regular`, `Bold`, `Italic`) para textos narrativos, diálogos y botones. Regla y créditos guardados en [VISUAL_ART_DIRECTION.md](docs/design/VISUAL_ART_DIRECTION.md#10-tipografía-común-y-letreros-de-salida-de-mapa--18112026) y [LICENSES_AND_CREDITS.md](LICENSES_AND_CREDITS.md#tipografía-vtt-y-letreros-de-salida--18112026).
- **Letrero de confirmación antes de cambiar de mapa (`MapExit` + `MapTransition`):** al entrar en cualquier salida de mapa, ya no dispara el salto automático directo, sino que muestra `MapExitSignOverlay` usando las placas ilustradas (`sign_dragon_plaque.png` o `sign_hanging_ropes.png`) con título de destino en `Metamorphous`, texto descriptivo y botones (`Continuar / Embarcar [T]` y `Permanecer aquí [Esc]`) en `Almendra`; al cancelar suprime la reapertura hasta salir del área.
- **Letreros 3D en todas las salidas del Retiro del Dragón y rutas:** incorporados `SignpostProp` en las 5 salidas de `main.tscn` (`pleamar-low`, `pleamar-high`, `observatory-inland`, `observatory-coast` con poste tallado `sign_dragon_post.png`; `boat-pecio` con tabla rústica de cuerdas `sign_hanging_ropes.png`) y en los retornos de `pleamar_coves.tscn`, `observatory_approach.tscn` y `pecio_cove_arrival.tscn`, con rótulo `Label3D` en `Metamorphous`.
- **Verificación ejecutada tras los cambios finales:** `godot-retiro`: `test_map_exits.gd` (**81 PASSED, 0 FAILED**), `loading/test_map_roundtrip.gd` (**24 passed; 0 failed**), `dm_style/test_dm_style.gd` (**63 PASS / 0 FAIL**), capturas Forward+ en `output/retiro-exit-signs-20261118/` (`sign-3d-pleamar-low.png`, `sign-3d-boat-pier.png`, `sign-modal-pleamar.png`, `sign-modal-boat.png`); `godot-pecio`: `test_vtt_interfaces.gd` (**57 PASS / 0 FAIL**); `godot-campamentos`: `test_camps_layout.gd` (**PASSED=105 FAILED=0**; nota: persisten avisos previos ajenos en `dm_style/appearance.gd` / `combat_controller.gd` al ejecutar fuera de árbol en ese test). Nota: `test_retreat_layout.gd` pasó `136 PASS / 0 FAIL` previo al ajuste final de márgenes en `map_transition_manager.gd`.

## Stormwreck · marcha y vuelo con mayor resolución — 2026-11-18

Segunda tanda instalada en Godot. Marcha sureste de las otras tres apariencias de zombi y vuelo norte de las dos arpías. Cuatro ciclos de ocho dibujos nativos, con 40 renders verificados y 26 pruebas del pipeline superadas. Las dos arpías eligen el vuelo norte en la escena real del Pecio. Se mantienen pendientes otros rumbos, ataques, transiciones y el ajuste de anclajes físicos. [Visor de la segunda tanda](output/stormwreck-motion-detail/expansion/index.html).

Candidata local en Pecio, Retiro y campamentos. Ocho fases sureste para la marcha del zombi principal y ocho para el vuelo de ambas arpías. Las poses tienen 412–432 px y 343–386 px de altura visible, respectivamente. 19 atlas inventariados y dos ciclos nuevos extraídos de láminas 4 × 2. Pruebas de bucle, apoyo, escarcha siguiendo la silueta y selección en la escena del Pecio. Quedan por revisar los otros rumbos y clips inventariados, los anclajes físicos y la aceptación artística. [Comparaciones y ciclos](output/stormwreck-motion-detail/index.html), [evidencia](docs/evidence/NPC_SPRITES_20261116.md#nitidez-de-la-marcha-y-el-vuelo).

## Stormwreck · matriz de movimientos y preparación de overlays — 2026-11-18

Estudio por encargo del usuario sobre las **37 apariencias / 24 perfiles cinéticos**, con fuentes de aventura y fichas, locomoción natural/contextual, acciones y excepciones (Myla, Runara por forma, Chispa excavando, pulpo siervo espora). [Matriz](docs/design/STORMWRECK_MOTION_MATRIX_20261118.md), [catálogo completo](output/stormwreck-motion-20261118/index.html). El inventario nativo encuentra ocho apariencias con locomoción registrada y 29 con reposo; no equivale a que todas sus direcciones estén revisadas visualmente. Se buscará reutilización antes de producir.

Nueva política fuente de Stormwreck: **mínimo seis fotogramas distintos por ciclo, objetivo ocho, más admitidos**; conserva los contratos existentes de ocho y la política general de otras campañas. 26 pruebas del pipeline superadas. El contrato separa capacidades de clips y exige fuente explícita para un movimiento concedido. Preparación de overlays por fotograma: anclajes, apoyo, zonas, orden frontal/trasero, visibilidad e inmunidades; 75 entradas de pendientes registradas, no 75 fallos de arte demostrados. Las máscaras y ajustes siguen pendientes de producción/revisión.

Este bloque no importa sprites ni despliega una candidata gráfica. La candidata nativa de reposos mantiene su revisión `89c0a6ed…`; la nueva política tiene validación fuente separada en `output/stormwreck-motion-20261118/pipeline-validation.json`. D8, creación de ropa/equipo, reglas y escenarios conservados.

## Campamento camino a Pleamar: río largo animado y flora ampliada — 2026-11-18

Ampliada la escena `camp-forest-pleamar` (`02 · Bosque camino a Pleamar`) en `prototypes/godot-campamentos/`: río serpenteante alargado norte–sur (`>140 m`) con valle tallado en el faldón exterior, lecho de guijarros (`stream.jpg`), puente de tablones `StreamFootbridge` y nuevo shader direccional (`create_river_shader_material`) con corriente central, espuma en orillas, ondas normales y soporte de `reduced_motion`. Añadidos por lotes árboles multi-especie (`pine`, `spruce`, `oak`, `birch`, `beech`, `beech_copper`, `willow` con lianas colgantes, `sapling`, `snag`), arbustos/helechos/flores recortados por cuadrantes de los atlas existentes, troncos caídos y cinco tipos de setas (`amanita`, `porcini`, `chanterelle`, `parasol`, `puffball`) más hongos de repisa. Suites tras el último cambio: `test_camps_layout` **105/105**, `test_camera_contract` **49/49**, `loading/test_loading` **172/172**, `combat/test_combat_rules` **124/124**; 6 pares antes/después Forward+ (`25,1–29,1 FPS` en MX350) en [comparativa interactiva](output/godot-forest-river-20261117/index.html) y [ficha local](docs/evidence/CAMPAMENTOS_GODOT_20261115.md). Conserva el resto de campamentos, Retiro y Pecio; aceptación artística y dispositivos físicos pendientes.

## Stormwreck · bases y reposos de ocho fases — 2026-11-17

Foco actual elegido por el usuario: Mía, Mike, Trinity/María y PNJ/criaturas de la aventura local. **Hito técnico cerrado: 37 ciclos / 296 fotogramas, todos renderizados sin fallos en la tanda final**, con 14 pruebas del pipeline, diez casos de servicio y comprobación del taller. Tanda completa reejecutada tras corregir los saltos de alineación/fase al alternar reposo normal y de combate. Preserva identidades, originales, posición/estatura de juego y equipo ya dibujado; 15 micónidos secundarios comparten adulto/brote. Candidata instalada en los tres prototipos Godot. El usuario aprueba la muestra de Runara; aceptación del resto separada. [Visor](output/stormwreck-characters-20261117/index.html), [pruebas y límites](output/stormwreck-characters-20261117/REVIEW_STATUS.md), [registro por ID](output/stormwreck-characters-20261117/art-change-register.json). Ocho fases consecutivas en una vista base; otras direcciones/acciones conservadas. D8, ropa/equipo, overlays, colocación futura de PNJ y dispositivos físicos siguen fuera de este cierre; sin despliegue web.

## Personajes modulares y pipeline permanente — 2026-11-16, en implementación

Nuevo encargo completo del usuario tras rechazar las tres propuestas de overlays. Última instrucción: **aplazar la creación y ajuste de ropa/equipo**. Auditoría actual: 5.898 gráficos relacionados, 37 atlas / 2.368 fotogramas. Implementados máscaras de estado, seis anatomías, anclajes por fotograma, visor y validación; integración local comprobada en Retiro/campamentos. **El resultado visual no está conseguido**: raíces con aspecto de cuerdas y tratamientos que aún dependen demasiado del contorno. [Muestras reales y fases](output/npc-sprites-20261115/modular-progress-20261116/index.html) · [encargo](docs/evidence/CHARACTER_MODULAR_REQUEST_20261116.md) · [estado, pruebas y límites](docs/evidence/CHARACTER_MODULAR_20261116.md). No está terminado ni promovido a biblioteca revisada; las cifras técnicas históricas no acreditan las nuevas candidatas.

## Ficha de personaje medieval ilustrada — 2026-11-17

Auditoría de nueve fases del 23/11 en Pecio, Retiro y Campamentos. Pergamino y cartelas de lectura refinados, marco estable, columnas desplazables y consulta de conjuros. El DM confirma o cancela los cambios de ficha y crónica. Inventario y mochila comparten existencias y preparación, con consumo registrado y transferencia personal según los permisos de mesa. El guardado local conserva las existencias y la ficha. [Comparativa en Godot](output/ficha-auditoria-integral/index.html) · [Criterios y límites](docs/evidence/GODOT_CHARACTER_SHEET_20261116.md#ejecución-integral-de-la-auditoría).

Extensión posterior autorizada al resto de la ficha: misma familia de placas doradas/pergamino, títulos de cuero oscuro, iconos en medallones de acción, filas contrastadas y ranuras coherentes en inventario. [Comparaciones V7 → nueva candidata](output/godot-sheet-finish-20261117/index.html). Se reutiliza el arte aprobado; datos, actor y operaciones de mochila conservados. Aceptación de esta extensión pendiente.

Petición posterior acotada: dos bloques de acabado, puntos de golpe y cabecera con retrato/identidad/pestañas. Candidata y pruebas propias en [revisión focalizada](output/godot-sheet-header-20261117/index.html); un atlas UI nuevo y retratos existentes reutilizados. No cambia personaje, reglas, mapas o partidas. Aceptación artística del usuario pendiente; las cifras V6 del párrafo siguiente corresponden a esa pasada histórica.

Refinamiento de la guía y auditoría V6 aplicados sobre la ficha existente: cinco pestañas, la misma mochila, retratos mayores, materiales ilustrados, arco real, iconografía semántica y datos compartidos. Corregidos cinco fallos reproducidos y problemas visuales de detalle, navegación y controles; las reservas abiertas se revalidan, cambiar de actor descarta su detalle anterior, las áreas personales conservan el radio y las salvaciones sin registrar no se dan por confirmadas. Conjuros reúne su contenido corto y rasgos; la mochila ajusta su altura manteniendo controles visibles. Fuente instalada en Pecio, Retiro y campamentos; **818 comprobaciones actuales sin fallos y 27 capturas nativas** en las tres resoluciones, con [galería vigente V6](output/godot-character-sheet-v6-20261117/index.html) y [auditoría y límites](docs/evidence/GODOT_CHARACTER_SHEET_20261116.md). V4 y V5 quedan como antecedentes. No se inventan preparación, competencias o reglas nativas de consumo/transferencia; aceptación artística y dispositivos físicos pendientes.

## Tres acabados de estados y estaturas — 2026-11-16

El usuario rechaza los overlays anteriores y pide tres opciones. Implementadas bruma/partículas, runas/energía y pincelada ilustrada con anclajes propios, combinaciones, retirada reversible, movimiento reducido e inmunidades. Elección por miniatura visible del mapa en DM → Ajustes → Aspecto → Estados de personajes, persistente localmente en cada prototipo. 456 capturas nativas comparables, muestras en Pecio e interfaz real verificadas. Unificadas las alturas visuales de campaña entre prototipos; 33 ajustes de fichas y 37 atlas auditados. Las fichas dejan escoger la altura, por lo que se distinguen calibraciones visuales de alturas individuales confirmadas. [Ficha actual](docs/evidence/NPC_SPRITES_20261116.md#tres-opciones-de-overlays-y-auditoría-de-estaturas--16112026) · [visor y comparaciones](output/npc-sprites-20261115/overlays-options-20261116/index.html). Selección artística del usuario, dispositivos físicos y rendimiento sostenido separados. Mesa web sin cambios en esta entrega.

## Segunda auditoría de animaciones y estados — 2026-11-16

Corregidos multiataques que se interrumpían, rumbo visual al girar cámara, reposo con atuendo equivocado, conjuro sobre uno mismo, arrastre y poses inmovilizadas, acentos flotantes sobre cuerpos tumbados y recuperación con colisión de un refuerzo oculto. Sonidos apropiados reutilizados de campaña y carga histórica innecesaria evitada. Fuente común y copias nativas instaladas en los tres prototipos; adaptador web actualizado en fuentes. Pasan 99 comprobaciones nuevas por prototipo, 442 de catálogo/2.354 de personajes/124 de combate reejecutadas en Pecio y 15 pruebas web, además de tipos de cliente/servidor. [Ficha y límites](docs/evidence/NPC_SPRITES_20261116.md#segunda-auditoría-y-correcciones--16112026) · [tres comparativas nativas y resultados](output/npc-sprites-20261115/audit-20261116/index.html). Visor verificado con teclado y ampliación. Aceptación artística, dispositivos físicos y despliegue web siguen separados; mapas y reglas conservados.

## Zombis y las dos arpías — 2026-11-16

Completada la ampliación visual de cuatro apariencias de zombi y las dos arpías: 15 atlas nuevos con ocho fases por secuencia, ataques separados, caída/recuperación real y estados discretos con retirada de tinte/opacidad. Biblioteca común instalada en Pecio, Retiro y campamentos; segunda arpía nativa oculta en C2, independiente. 442 comprobaciones por prototipo, 2.354 de regresión de sprites, 124 de combate y 13 pruebas web focalizadas superadas. [Ficha actual](docs/evidence/NPC_SPRITES_20261116.md) · [visor](output/npc-sprites-20261115/index.html). Adaptador web en fuentes; aceptación artística, prueba física y despliegue separados.

## Rueda lateral y acciones directas Godot — 2026-11-16

Recuperada la rueda de cuarto/medio círculo que abre hacia dentro desde el control, con adaptación a su posición. Eliminada la ventana redundante de objetivo: selección de criaturas en el mapa, cancelación por el mismo icono, efectos de dirección/radio/zona con plantilla y arbitraje del DM en una franja discreta. Fuente y copias de los tres proyectos sincronizadas; se conservan escenarios, cuadrícula y preferencias. [Ficha, archivos y pruebas actuales](docs/evidence/GODOT_PLAYER_AUDIT_20261115.md) · [comparación nativa](output/godot-combat-direct-20261115/index.html).

## Combate, cuadrícula y preferencias Godot — 2026-11-15

Rosa circular flotante animada y minimalista, sin ventana según corrección expresa del usuario; clasificación real de objetivos y ejecución personal sin selector; grid común sobre superficies verificadas contra colisiones, radio 50 m configurable y atenuación por altura; preferencias persistentes e importación de ajustes web. Aplicado a Pecio, Retiro y destinos y cinco campamentos, con pruebas nativas y capturas. [Ficha y mantenimiento](docs/evidence/GODOT_PLAYER_AUDIT_20261115.md) · [informe de pruebas y comparación](output/godot-player-audit-20261115/index.html). Estados técnico, visual, físico y red/guardado separados; no cierra M5/M7 ni el acabado de escenarios.

## Direcciones visuales del DM en Godot — 15/11/2026

Sistema compartido `prototypes/godot-shared/dm_style/` instalado en Pecio, Retiro y campamentos. Tres acabados reales, elegibles en DM → Ajustes → Aspecto de la consola, con preferencia local: Obsidiana y latón (predeterminado), Crónica de pergamino y Atlas astral. Incluye 32 SVG propios para marcos, grabados, miniaturas e iconos, tipografía serif en títulos, retratos del catálogo actual, barras de PG, cajón superpuesto y herramientas de combate agrupadas. Conserva cambios de mapas, traslado, HP, combate y presentación de jugador/proyector. [Galería nativa y antes/después](output/godot-dm-style-20261115/index.html), [alcance, recursos y pruebas](docs/evidence/GODOT_DM_APPEARANCE_20261115.md). No añade sincronización ni guardado de campaña.

Validación final: 63 comprobaciones por prototipo (189 en total), sin fallos ni errores de script en los tres registros finales; ocho capturas Forward+ de la nueva interfaz, con comparación respecto a la base anterior. La aceptación artística del usuario y la validación física permanecen separadas.

## Sprites de zombis y jugadores — 15/11/2026

Corregida la selección de una sola pose al caminar/correr en Mía, Mike y el zombi. Mínimo de ocho imágenes distintas por ciclo de desplazamiento, con carreras y ataques principales de ocho rumbos para los cinco personajes revisados, utilidades y antorchas completas. Fuentes compartidas en `prototypes/godot-shared/sprites`, copias instaladas en Pecio/Retiro/campamentos y adaptador web preservando skins/condiciones. [Ficha, visor y resultados actuales](docs/evidence/CHARACTER_SPRITES_20261115.md). No se da por renovado todo el combate histórico ni por aceptado artísticamente; red/guardados y prueba física siguen separados.

## Rediseño integral, fauna/flora texturizadas y peces de río/mar en campamentos Godot — 2026-11-18 (rama `feat/godot-camps-redesign`)

Reconstruidos `camp-forest-pleamar`, `camp-wreck-beach`, `camp-cliffs-observatory` y `camp-coastal-refuge` en `prototypes/godot-campamentos/` manteniendo intactos `camp-a1-rooms` (`retreat_*`), `prototypes/godot-retiro/` y Pecio C1–C9:
- **Diseño y escala canónica:** layout orgánico en `campaigns/camp-rests/public/pack.ts` exportado a `camps-layout.json` con nodos reutilizables en `CampPropFactory` y `CampEnvironmentKit`, mezcla FBM de suelo sin costuras, estaturas canónicas (`Mike 1,82 m` > `Mia 1,32 m` > `Trinity 1,06 m`), petates/mochilas adaptados, asientos naturales multi-plaza (`seat_anchors`), refugios de lona dimensionados para >=3 héroes (cero lonas en Refugio Costero) y faroles diurnos apagados.
- **Fauna y flora texturizadas, aves en los 5 mapas y peces en río/mar:** síntesis en caché de texturas procedurales con mapas de normales en `CampFaunaKit` (pelaje, plumaje en alas aerodinámicas afiladas, placas de caparazón, cuernos anillados, cangrejos moteados, escamas con aletas y ojos brillantes); **aves 3D en los cinco mapas**; flora recortada por cuadrante botánico a resolución 4× (`foliage-atlas.png`/`foliage-atlas-v5.png`) con viento y normales; hoguera nocturna automática con interruptor manual (`fire-toggle`); corriente traslúcida en Bosque con `3` truchas visibles (`StreamTrout_0..2`, incluida trucha con salto ocasional), peces de poza (`CaveFish_0..2`) y peces costeros ocasionales/saltarines en Playa (`SeaFish_0..1`) y boca del Refugio (`SeaFish_Cove_0`).
- **Validación tras la última edición:** `test_camps_layout` (`127/127`), `test_camera_contract` (`49/49`), `loading/test_loading` (`172/172`), `combat/test_combat_rules` (`124/124`); `inventory/test_backpack.gd` quedó fuera porque referencia `res://scenes/main.tscn`. Doce capturas Forward+ en MX350 (`23,9–57,5 FPS` exteriores, `25,4 FPS` HUD DM) en [informe comparativo](output/godot-campamentos-redesign-20261115/index.html) y [ficha técnica](docs/evidence/CAMPAMENTOS_GODOT_20261115.md). Aceptación artística, pruebas físicas y red/guardados web siguen separados.

## Campamentos de Descanso en Godot — 15/11/2026

Migrados los cinco campamentos de `campaigns/camp-rests` a un proyecto autónomo en Godot Engine 4.7.2 Forward+ (`prototypes/godot-campamentos/`), generado desde `scripts/export-camps-godot-bundle.mjs`:
- **Escenas migradas:** `01 · Habitaciones A1` (`camp_a1_rooms.tscn`, 48×22, 467 transitables; reutiliza directamente el `RetreatLayoutBuilder` y los `.glb` esculpidos de la zona A1 de El Retiro del Dragón desplazados `-A1_TRANSLATION` con 6 bóvedas *cutaway*, mobiliario de celdas, estatua de Astalagan, plaza/hogar, pérgolas y acantilado/mar), `02 · Bosque camino a Pleamar` (`camp_forest_pleamar.tscn`, 24×22, 283 transitables, arroyo, coníferas y ciervo/venado CC0 GLB), `03 · Playa del pecio` (`camp_wreck_beach.tscn`, 25×22, 266 transitables, bote varado y rompiente), `04 · Acantilados del Observatorio` (`camp_cliffs_observatory.tscn`, 25×22, 261 transitables, pilares de basalto, cristales emisivos, auroras y nubes), `05 · Refugio costero de Pleamar` (`camp_coastal_refuge.tscn`, 25×22, 279 transitables, saliente *cutaway*, hiedra, gotas y charcas mareales).
- **Sistemas integrados:** cámara 2.5D (`TacticalCamera`), rejilla táctica, ciclos de luz (`day`/`arrival`/`dusk`/`night`/`dawn`) y clima (`clear`/`rain`/`storm`/`fog`/`snow`) con niebla de profundidad desactivada en tiempo despejado, hoguera con consumo, baúles abatibles, roles `JUGADOR`/`DM`/`PROYECTOR` con cambio directo entre los 5 campamentos y módulos de carga (`47922`), combate y mochila.
- **Auditoría y salto visual Triple-A (`02`–`05`, A1/Retiro intactos):** corregida detección de nado en suelo seco (`camp_structure.gd::is_water_at`), rejilla salvia sutil `#9ca696` en exteriores (`tactical_grid_overlay.gd`), shader oceánico por trenes trigonométricos direccionales sin manchas en charcas/arroyo (`camp_material_kit.gd`), rocas facetadas procedurales PBR + matas *alpha-cut* en lugar de modelos lisos, madera roble envejecida en utilería GLB, cobertura sur completa en Bosque, rocas de borde ancladas y auroras visibles en Observatorio, y arco continuo en Refugio (`camp_outdoor_builder.gd`). `camp-a1-rooms` y `prototypes/godot-retiro/` permanecen intactos.
- **Lanzadores:** `ABRIR-CAMPAMENTOS-GODOT.cmd` y `JUGAR-GODOT.cmd` (`campamentos` / `[7..9]`).
- **Verificación ejecutada tras los cambios finales:** `test_camps_layout.gd` (69/69 PASS), `test_camera_contract.gd` (49/49 PASS), `loading/test_loading.gd` (172/172 PASS), `combat/test_combat_rules.gd` (124/124 PASS), `inventory/test_backpack.gd` (149/149 PASS), 8 capturas Forward+ (1440×810) e informe interactivo antes/después en [comparativa visual](output/godot-campamentos-20261115/index.html). [Ficha de evidencia, tabla de activos y límites](docs/evidence/CAMPAMENTOS_GODOT_20261115.md). Siguen separados red/guardados web, dispositivos físicos y aceptación artística.

## Combate nativo compartido en Godot — 15/11/2026

Pecio y Retiro consumen el mismo módulo de combate, con datos de D8 y Stormwreck. Iniciativas introducidas por la mesa, línea de hasta siete retratos, rueda contextual, presupuestos de turno, dados físicos, críticos/furtivo, ataques múltiples, preparación y reacciones, concentración, cuerpos persistentes y final automático al derrotar al último enemigo. Silverfarben y Anteros se añaden explícitamente desde el DM. [Ficha y alcance](docs/evidence/GODOT_COMBAT_20261115.md), [capturas reales y comprobaciones](output/godot-combat-20261115/index.html).

Se mantienen fichas actuales, mapas y trabajo paralelo de mochila/interiores. El módulo es una sesión local: no equivale a conectar las cuentas o guardados web ni a instalar todos los PNJ del catálogo en los mapas. Las resoluciones especiales de mesa, la integración de autoridad entre dispositivos y la aceptación física/artística permanecen diferenciadas.

Verificación de esta candidata: 192 comprobaciones pasan (124 de reglas y 34 por mapa), seis duelos simulados y diez capturas reales Forward+. Se comprueban reacción durante multiataque, concentración, preparación, recuperación con veinte natural, botones visibles y consumo de recursos sin duplicación. Los módulos compartidos coinciden por SHA-256 en las dos copias.

## Consola DM: cambio de mapas (10 escenarios) y traslado libre de jugadores — 15/11/2026

Ampliada la consola del DM (`VttRoleUi`, `DmHud`, `DmMapInteraction`, `VttCampaignData` y `loading_boot.gd`) en los tres proyectos (`prototypes/godot-pecio/`, `prototypes/godot-retiro/` y `prototypes/godot-campamentos/`) para cambiar a cualquier escenario y trasladar a los jugadores desde una única mesa:
- **Acceso directo del DM a los 10 mapas (`Escena / Zona` -> `MAPAS DE CAMPAÑA`):** El Rosa de los Vientos (`pecio_main`), El Retiro del Dragón (`retiro_main`), las 3 rutas (`retiro_pleamar`, `retiro_observatory`, `retiro_pecio_cove`) y los 5 Campamentos de Descanso (`camp-a1-rooms`..`camp-coastal-refuge`). Dentro de cada proyecto cambia con `SkillLoading.load_map(...)` conservando el rol `dm`; entre proyectos (`godot-pecio` <-> `godot-retiro` <-> `godot-campamentos`) relanza al proyecto destino con `--role=... --scene=... --destination=...` (y `--camp=...` en campamentos). Corregido en `camp_scene_controller.gd` (`_resolve_scene_id()`) para que el `.tscn` propio tenga prioridad sobre `--camp=` residual al cambiar de campamento en vivo.
- **Traslado libre de jugadores y del grupo:**
  - En **Jugadores de la mesa** (`👥 Traer grupo aquí`, `🗺 Mapas / Zonas` y botón individual `⇢ Traer` por ficha) y en **Exploración y Relato** (`👥 Traer grupo a esta vista / zona`).
  - En **`Escena / Zona`**, cada zona/cubierta/estancia ofrece `⇢ Grupo` junto al enfoque de cámara para llevar a los 3 héroes en formación resolviendo suelo/colisiones y recortes *cutaway*.
  - En **`DmMapInteraction` (clic derecho sobre cualquier superficie 3D):** añade `Traer a <personaje activo> aquí` y `Traer todo el grupo aquí` sin requerir preselección previa, con deshacer en bloque mediante `Ctrl+Z`.
- **Verificación ejecutada tras los cambios finales:** `godot-pecio/scripts/test_vtt_interfaces.gd` (`57 PASS / 0 FAIL`), `verify_retiro_dm.gd` (`RETIRO_DM_10MAPS_WARP_OK`), `verify_camps_dm.gd` (`CAMPS_DM_10MAPS_WARP_OK`), `godot-campamentos/scripts/test_camps_layout.gd` (`PASSED=69 FAILED=0`), `godot-campamentos/scripts/test_camera_contract.gd` (`49 PASS / 0 FAIL`), `godot-campamentos/loading/test_loading.gd` (`172 passed; 0 failed`) y captura Forward+ `ui-dm-camps-10maps.png` verificada en `camp_coastal_refuge.tscn`.

## Mochila RPG Godot — 15/11/2026

Mochila compartida en Pecio y Retiro: cuadrícula de objetos con iconos, filtros, búsqueda, detalle y acciones preparadas; retrato del héroe junto al equipo, leído del mismo perfil visual que el personaje. Retiro conecta el equipo inicial de cada ficha al inventario local. Nuevos atlas de tres héroes con 144 poses en total (sacar, guardar y caminar con antorcha en ocho direcciones), y biblioteca de 101 iconos SVG. La mochila bloquea el movimiento; cerrar reproduce las acciones para el héroe que las preparó. [Ficha de cambios y pruebas](docs/evidence/GODOT_INVENTORY_RPG_20261115.md). El cambio futuro de atuendo necesita su perfil de animaciones correspondiente; no se inventan atuendos, botín, estadísticas ni persistencia en red.

## Limpieza y mantenimiento Babylon/Godot — 15/11/2026

Retirados 134.170 archivos de residuos antiguos (18,04 GiB), conservando el plazo de siete días, fuentes/arte, distribución instalada, guardados, dependencias y ambos proyectos Godot. Herramienta de mantenimiento mejorada con protecciones Godot, lanzadores, referencias de recursos y perfiles aislados de auditoría; 39 comprobaciones pasan. Git compactado conservando sus 6.788 objetos. [Resultado, inventarios y límites](docs/evidence/WORKSPACE_CLEANUP_20261115.md).

Verificación final: TypeScript cliente/servidor y diez comprobaciones de red Babylon pasan; integridad del Pecio y 136 comprobaciones del Retiro Godot pasan sin ventana y sin errores en sus registros finales. Se corrigieron una anotación de tipo y la orientación del contenedor de turnos en el combate nuevo que otro trabajo estaba incorporando durante la sesión, conservando el resto de sus cambios. No se reinició la mesa habitual ni se acredita una nueva aceptación artística o física.

## Cámaras 2.5D en Godot — 14/11/2026

Aplicadas en Pecio, Retiro y tres escenas conectadas. Q/E ±30°, F/R y dos dedos para 5–25° continuo, interior 10° / exterior 25° sin cambiar zoom, preferencias por escena/rol, WASD/joystick estable, modos de seguimiento, protección de encuadre sin autozoom y navegación/traslado contextual DM. [Implementación, pruebas actuales, capturas y alcance publicado](docs/evidence/GODOT_CAMERAS_20261114.md). Compartir cámara incluye inclinación y zoom en la vista local de proyector; no acredita sincronización entre dispositivos.

## Interfaces VTT de DM, Jugador y Proyector en Godot — 14/11/2026

Implementadas en Godot Engine 4.7.2 Forward+ las tres interfaces canónicas (`JUGADOR`, `DM` y `PROYECTOR`) inspiradas en la estética obsidiana/dorado/verde azulado de Babylon.js para `prototypes/godot-pecio/` y `prototypes/godot-retiro/`, coordinadas por `VttRoleUi` (`scripts/vtt_role_ui.gd`) y los módulos `vtt_campaign_data.gd`, `vtt_ui_theme.gd`, `vtt_player_hud.gd`, `vtt_dm_hud.gd` y `vtt_projector_hud.gd`:
- **JUGADOR (`F1` / `--role=player`):** barra superior de identidad/PG/modo/farol, reloj de campaña e indicador de zona, joystick virtual 2D (`TacticalThumbStick`), botones de acción/interacción (`⚔ Acciones`, `Terminar turno`), tira de combate y 5 modales (`PlayerJoinModal`, `HpDialogModal`, `CharacterSheetModal`, `InventoryModal` con `I`/`B`, `PlayerSettingsModal`).
- **DM (`F2` / `--role=dm`):** cabecera `MESA DE DIRECCIÓN · PRIVADA` con selector de rol, contador de solicitudes, estado del proyector y guardado; raíl lateral con cajón (`Mesa`, `Clima`, `Sonido`, `Ajustes`); herramientas superiores de mapa (`Escena / Zona`, `Cámara`, `Objetos`); paneles flotantes (`Exploración y Relato`, `Solicitudes e Interacciones`, `Combate e Iniciativa`, `Jugadores de la mesa`, `PNJ y Amenazas de Escena`) y dock inferior de accesos rápidos.
- **PROYECTOR (`F3` / `--role=projector`):** pantalla previa `Mesa inmersiva` con `ENTRAR AL PROYECTOR` (`--projector-ready` para saltar la espera), vista limpia de tablero con reloj de campaña, banner de turno en combate, aviso de audio e indicador compacto de cambio de rol, ocultando automáticamente la cuadrícula táctica (`TacticalGrid` / `TacticalGridOverlay`) y los aros de selección (`selection_ring`).
- **Lanzador unificado y capturas:** implementado el lanzador maestro unificado [JUGAR-GODOT.cmd](file:///c:/Users/User/Desktop/Dungeons/JUGAR-GODOT.cmd) con menú interactivo (Pecio / Retiro en roles Jugador, DM o Proyector; Enter para arranque directo y atajos en caliente `F1`/`F2`/`F3`/`F11`), eliminando los 4 lanzadores redundantes (`ABRIR-DM`, `ABRIR-JUGADOR`, `ABRIR-PROYECTOR`, `ABRIR-PECIO-CAPAS`) y delegando `ABRIR-PECIO-GODOT.cmd` y `ABRIR-RETIRO-GODOT.cmd`. Capturas Forward+ generadas e inspeccionadas en `docs/evidence/captures/pecio-godot-20261114/` (`ui-player.png`, `ui-dm.png`, `ui-projector-prepare.png`, `ui-projector.png`).
- **Validación:** `test_vtt_interfaces.gd` (`37 PASS / 0 FAIL`), suites previas de Pecio sin regresiones (`test_pecio_integrity.gd`, `test_doors_alignment.gd`, `test_babylon_camera_parity.gd`, `test_character_animations.gd`, `test_ship_construction.gd` `72 PASS / 0 FAIL`, `test_ship_environment.gd` `2071 PASS / 0 FAIL`) y `test_retreat_layout.gd` (`129 PASS / 0 FAIL`). Integración local en los prototipos Godot; sin sincronización en red WebSocket entre dispositivos.

## Retiro del Dragón en Godot: Capa 1 Concepto y Diseño (Layout) — 14/11/2026

Completada e implementada la **Capa 1: Concepto y Diseño (Layout)** de El Retiro del Dragón en Godot Engine 4.7.2 Forward+ (`prototypes/godot-retiro/`), trasladando formalmente desde Babylon.js (`campaigns/stormwreck-isle/public/retreat-zones/` y `retreat-terrain-v2.json`):
- **Cuadrícula y Métrica Canónica:** Cuadrícula táctica 1.5 m (5 pies D&D 5e), dimensiones totales de 112 columnas × 80 filas = 168.0 m × 120.0 m, origen canónico [72.0, 72.0] y traslación de A1 [72.0, 9.0, 72.0].
- **Cotas de Elevación Estructuradas:** Mar (0.0 m), orilla/desembarco (0.25 m), plataforma baja cabrestante (0.24 m), Plaza y Celdas A1 (9.0 m), Terraza Cabrestante A2 (15.0 m), Comedor/Cocina A3 (18.0 m), Biblioteca A4 (18.0 m), Templo de Bahamut A5 (27.0 m), y rutas de expedición (0.25 m a 37.0 m).
- **11 Zonas Canónicas Definidas:** Z1 Playa y Embarcadero, Z2 Subida al Retiro, Z3 A1 Celdas y Plaza Central, Z4 A2 Cabrestante y Almacén Marino, Z5 A3 Comedor y Cocina Excavados, Z6 A4 Biblioteca (Scriptorium), Z7 Jardines y Bosquetes, Z8 A5 Templo de Bahamut, Z9 Paseos y Explanadas, Z10 Rutas hacia la Isla (Pleamar y Observatorio), y Z11 Entorno Global.
- **13 Superficies Transitables y 6 Celdas de A1:** Superficies con materiales diferenciados y colisión física sólida; 6 celdas excavadas canónicas (Libre, Tarak, Varnoth, Myla, Kobolds Oeste, Kobolds Este) con dotación de 4 camas y 8 hamacas.
- **16 Landmarks y PNJ:** `spawn`, `boat`, `pleamar`, `observatorio`, `a2-door`, `winch`, `community`, `library`, `a4-door`, `temple`, `runara`, `tarak`, `varnoth`, `myla`, `kobold-west` y `kobold-east` posicionados con balizas visuales y etiquetas 3D.
- **Cámara Táctica 2.5D y Preajustes:** 8 preajustes de encuadre idénticos a `RETREAT_ZONE_VIEWS` (overview, beach, a1, a2, a3, a4, a5, caves), rotación orbital Q/E (45°), zoom suave y recentrado.
- **Validación Automatizada y Lanzador:** 129/129 tests PASS (0 fallos) en `test_retreat_layout.gd`; reporte en `output/godot-retiro-layout-20261114/layout-tests.json`. Lanzador directo `ABRIR-RETIRO-GODOT.cmd`. Ficha técnica en [RETIRO_GODOT_LAYERS_20261114.md](docs/evidence/RETIRO_GODOT_LAYERS_20261114.md).

## Pantallas de habilidades para Godot · implementación nativa — 14/11/2026

Implementadas las 18 microescenas en `prototypes/godot-pecio/loading` y `prototypes/godot-retiro/loading`: un reproductor nativo, seis atlas con 576 dibujos originales, carga inicial ligera y cambios reales mediante `MapTransition`. Escena en el proyector; d20 animado solo para el protagonista presente; observadores con fundido, indicador y Continuar compacto. El mapa se prepara en paralelo y la entrada espera su disponibilidad y la confirmación del grupo. Selección por presencia, también en visitantes; dos demostraciones enfrentadas funcionales (equilibrio y música).

Sesión local propia de Godot con controles móviles, propiedad de personaje/tirada, una tirada por entrada, reconexión y salida compartida. Pruebas actuales: 178 comprobaciones de catálogo/render en Forward+, 24 de arranque e ida/vuelta del Retiro y dos controles personales conectados al motor. Abrir `PROBAR-CARGAS-GODOT.cmd` para el visor de las 18. [Evidencia, procedencia y límites](docs/evidence/GODOT_SKILL_LOADING_20261114.md), [contrato actualizado](docs/design/GODOT_SKILL_LOADING_20261114.md). Pendientes: cuentas/guardados y HUD móvil completo del VTT web, nuevas poses para pulso y ensayo físico; no son requisitos sin implementar del port local entregado.

## Pecio en Godot: auditoría, construcción y acabado por capas 1-6 - 14/11/2026

**Ampliación posterior autorizada:** continuar también texturas/materiales, iluminación y VFX/clima (capas 4–6). Implementadas las familias de materiales por exposición, controles locales día/atardecer/noche y despejado/lluvia/tormenta/bruma, máscaras de luces por estancia, emisores separados por sala y opción de efectos suaves. La evidencia final y sus límites se mantienen en la misma ficha; no se crea otro roadmap.

**Retoma del encargo:** seis suites reejecutadas sin errores (72 comprobaciones de construcción y 2.071 de ambiente, además de las cuatro suites anteriores). Se termina la entrega visual que estaba incompleta: capturas actuales, comparativas de las seis capas, selector de siete ambientes y registros de fuentes/hashes. Ajuste localizado del sombreado del horizonte tras revisar muestras reales de día y ocaso. La interacción del informe en navegador continúa sin verificar por la política de acceso local; los renders del motor y la validación estática se registran aparte en la ficha.

**Candidata de acabado aislada:** `ABRIR-PECIO-CAPAS.cmd` abre `runtime/godot-pecio-horizon-review-20261114`. Se aísla al entrar cambios de interfaz de otro trabajo durante las capturas; se conservan las fuentes compartidas y se reejecuta la validación en la candidata. `ABRIR-PECIO-GODOT.cmd` sigue apuntando al proyecto compartido; el nuevo HUD no forma parte de la aceptación de esta entrega visual.

Encargo actual del usuario: auditar el prototipo Godot y avanzar concepto/distribución, blockout y geometría/arte base, empezando por restos y estructura. Candidata en `prototypes/godot-pecio`, conservando sus plantas, puertas y conexiones. [Registro de implementación, inventario, pruebas y límites](docs/evidence/PECIO_GODOT_LAYERS_20261114.md); [informe interactivo](output/godot-pecio-layers-20261114/index.html), accesible también con `REVISAR-PECIO-CAPAS.cmd`. La partida local se abre con `ABRIR-PECIO-GODOT.cmd`. Godot sigue sin integración de red ni guardado persistente de campaña; M5 artístico/M7 físico permanecen abiertos.

## Pecio Rosa de los Vientos (Godot Forward+): Estructura de Puertas, Bodega Sumergida C9 y Salva-Vacío Absoluto — 2026-11-12

Completados y verificados los cuatro requerimientos estructurales y jugables en el prototipo Godot Forward+ (`prototypes/godot-pecio`):
- **Puerta C4 a la izquierda de la escalera de popa babor:**
  - Trasladada la puerta del Camarote del Capitán (`DoorC4`) a `x = -13.5, z = -5.2` (en `scenes/main.tscn`), situándola en el pasillo exterior de babor a la izquierda de la escalera física de popa (`StairsAftPort` en `z = -3.5`).
  - Actualizado el mamparo divisorio de popa en `interiors_builder.gd` (`build_cabins_aft`): muro exterior sellado desde `-beam_aft` hasta `-5.80`, vano y jambas integradas de C4 de `-5.80` a `-4.60`, y mamparo intermedio continuo desde `-4.60` pasando tras la escalera y enlazando con la espina central (`z = 0.0`) y la puerta de C5 (`z = 1.25`).
  - Verificada la alineación, rotación de apertura batiente hacia el interior (-90°) y colisión giratoria con `test_doors_alignment.gd`.
- **Diferenciación y tono claro en todas las puertas:**
  - Hoja batiente de madera (`door_leaf`) actualizada en `interactive_door.gd` a un roble envejecido más claro (`#9a8268`, rugosidad 0.76) con veteado procedural de tablazón PBR, contrastando nítidamente con los mamparos oscuros (`#6d5c46`).
  - Marco estructural (`mat_frame`) ajustado a tono intermedio cálido (`#7d6954`, rugosidad 0.82), conservando herrajes y argollas en hierro forjado oxidado (`#232423`).
  - Aplicado a las 4 puertas de camarote (`DoorC4` Capitán, `DoorC5` Cocina, `DoorC6` Tripulación, `DoorC7` Comedor).
- **Sellado hermético de la Bodega Sumergida C9 (última planta baja):**
  - Cubierta de bodega `Deck_C9` extendida de forma continua desde el espejo de popa (`x = -30.75`) hasta la roda de proa (`x = 27.5`) con manga ampliada (`0.82 * beam`), eliminando las brechas de 80 cm en los extremos.
  - Añadida base de colisión física sólida (`Deck_C9_SolidFloorCol`) con cajas `BoxShape3D` de 0.85m de grosor en toda la longitud de C9.
  - Mamparo proel de cierre estanco en `x = 27.5` (`Bulkhead_C9_BowWall`) y mamparos popeles a ambos lados de la brecha submarina P16 (`Bulkhead_C9_SternPort/Front`).
  - Revestimientos interiores `HullInner_C9_Port/Front` ampliados a longitud completa (`-30.75..27.5`) con colisionadores de 0.65m de espesor y zócalos de sellado a ras de suelo (`cs_bot`).
- **Prevención absoluta contra caídas al vacío:**
  - Añadida colisión física trimesh a todo el fondo marino (`seabed_inst.create_trimesh_collision()` en `reef_builder.gd`), cubriendo la totalidad del relieve de basalto de `-48..+48, -36..+36`.
  - En `player_token.gd`, freno hidrodinámico que amortigua la caída bajo el agua a un máximo de -3.2 m/s.
  - Límite inferior de suelo inviolable calculado dinámicamente con la cota real del lecho marino (`_seabed_height`) y la tarima de C9 (`-6.40m`), anulando velocidad negativa descendente.
  - Contención perimetral de coordenadas (`[-46..46, -34..34]`) y red de seguridad global de rescate instantáneo si alguna perturbación física empujara fuera del mundo.
- **Validación técnica y visual:**
  - `test_doors_alignment.gd` -> PASS (0 errores).
  - `test_pecio_integrity.gd` -> PASS (0 errores).
  - `test_babylon_camera_parity.gd` -> PASS (6/6 suites, 0 errores).
  - `test_character_animations.gd` -> PASS (0 errores).
  - Capturas Forward+ generadas: `doors-closed.png`, `doors-open.png` y `zone-c9-hold.png`.


## Retiro del Dragón: Auditoría de geometría oculta y optimización integral (>30 FPS en todas las zonas) — 2026-11-10

Auditoría exhaustiva de elementos en memoria y optimización de rendimiento en el Retiro del Dragón (`dragon-rest`), cumpliendo el objetivo de superar ampliamente los 30 FPS en todas las zonas sin reducir ni recortar la calidad gráfica:
- **Auditoría de elementos ocultos y nunca visibles (caso planteado por el usuario confirmado):**
  - *Plantas y rocas sepultadas sobre las celdas A1:* Se confirmó exactamente el caso señalado por el usuario. En `a1-visuals.ts`, el generador de campamento base añadía sobre cada una de las 6 celdas (`a1:room-1..6`) 6 bloques orgánicos (`roof-outcrop`, 36 rocas, 20.472 vértices) y 18 tarjetas de vegetación de salvia (`a1:painted-foliage-sage-v6`, 108 tarjetas con alfa-test) a cotas Y=11.8..15.2. En el Retiro del Dragón, la roca madre continua de la montaña (`Stone_P6_Continuous_Lower_Bedrock_Core` y `P3_Continuous_Plaza_Bedrock`) se asienta sobre estas cotas (Y=8.3..27.0), dejando estos 144 elementos 100 % sepultados dentro de roca sólida opaca. Se añadió el flag `omitCellRoofs: true` en `createRetreatGlobalVisuals`, eliminando esta carga muerta y manteniendo intactos los techos y sellos interiores requeridos para el recorte de visualización de estancias.
  - *Mallas obsoletas en memoria (392 mallas):* Las piezas sustituidas por fases de acabado visual previas se desactivaban con `setEnabled(false)` permaneciendo en `scene.meshes`. Se implementó su liberación y limpieza automática en `retreat-quick-opt.ts`.
  - *Desactivación de 12 luces inactivas en shaders diurnos:* Antorchas de celdas desocupadas, velas diurnas y faroles con intensidad 0.0 permanecían en estado `isEnabled() = true`, obligando a Babylon a evaluar bucles de iluminación en cada malla activa. Con `light.setEnabled(light.intensity > 0.01)`, se eliminaron de los pases de shader diurnos, ahorrando ~15 ms por fotograma.
  - *Caché reactiva de techos y paredes A2–A5:* Se sustituyó la iteración por fotograma de ~300 nodos por un chequeo condicional al cambiar de estancia (`active !== lastActive`), eliminando microtirones de CPU.
- **Rendimiento medido en las 10 zonas reales (todas >44 FPS, media 47.3 FPS):**
  - Zona 1 — Playa y Embarcadero: **46.6 FPS** (avg 21.4 ms, p95 36.4 ms)
  - Zona 2 — Subida al Retiro: **48.6 FPS** (avg 20.6 ms, p95 35.6 ms)
  - Zona 3 — A1 Celdas y Plaza: **50.1 FPS** (avg 20.0 ms, p95 35.7 ms)
  - Zona 4 — A2 Cabrestante: **47.2 FPS** (avg 21.2 ms, p95 35.4 ms)
  - Zona 5 — A3 Comedor y Cocina: **44.0 FPS** (avg 22.8 ms, p95 36.0 ms)
  - Zona 6 — A4 Biblioteca: **50.5 FPS** (avg 19.8 ms, p95 35.7 ms)
  - Zona 7 — Jardines y Bosquetes: **48.0 FPS** (avg 20.8 ms, p95 35.6 ms)
  - Zona 8 — A5 Templo: **44.0 FPS** (avg 22.7 ms, p95 35.8 ms)
  - Zona 9 — Paseos y Explanadas: **46.8 FPS** (avg 21.4 ms, p95 35.7 ms)
  - Zona 10 — Rutas hacia la isla: **47.3 FPS** (avg 21.1 ms, p95 36.0 ms)
- **Validación:** 137/137 tests de Retiro pasados (29 suites), bundle web cliente compilado sin errores, servidor activo en puerto 3000 con 0 regresiones visuales.

## Sincronización de cambio de escena DM-Jugador y pantalla de carga atmosférica — 2026-11-09

Corregido el flujo de cambio de escena en la mesa de dirección y la experiencia de transición en clientes de jugador y proyector:
- **Cambio de escena sincronizado para DM y jugadores**: al seleccionar una escena en la consola del DM (`$('scene')`), se despacha el comando canónico `{ type: 'scene', sceneId }`, actualizando el estado de partida en el servidor (`this.state.changeScene`), trasladando a todos los aventureros a los puntos de aparición correspondientes de la nueva escena, reseteando previews privadas del DM y emitiendo los snapshots sincronizados a todos los sockets conectados (jugadores, proyector y DM).
- **Acción explícita para vistas previas privadas**: si el DM se encuentra explorando privadamente otra planta o acceso (`tableSceneId !== sceneId`), se incorpora el botón y opción de menú contextual «Trasladar partida y jugadores a esta escena».
- **Pantalla de carga completa con compuerta de preparación visual y botón de entrada**: implementada la pantalla de carga atmosférica inmersiva (`.world-loading-screen`) a pantalla completa (`position: fixed; inset: 0; z-index: 99999;`). Incorpora doble aro místico con giro en direcciones opuestas (`world-loading-ring` y `world-loading-ring-inner`), glifo rúnico central palpitante (`⚔`), barra de progreso animada con destello dorado (`world-loading-bar-fill`) y mensajes de estado dinámicos.
  - **Bloqueo hasta carga visual 100 % completa**: el motor espera asíncronamente a que Babylon compile todos los materiales, shaders e iluminación (`whenReadyAsync()`), a que los modelos GLTF/GLB del Retiro y campamentos finalicen (`retreatVisuals.ready`) y a que las texturas estén en memoria de vídeo antes de permitir la entrada.
  - **Botón «⚔ CONTINUAR ⚔» interactivo**: hasta que todo lo visual no está 100 % preparado, no se puede entrar ni interactuar con el mapa. Cuando finaliza la carga, la barra se completa en verde, se ilumina el botón de confirmación de entrada («⚔ CONTINUAR AL ESCENARIO ⚔») con atajos por teclado (Espacio / Enter) y, al pulsarlo, la pantalla se desvanece de forma suave y cinematográfica (350 ms) desvelando el mapa táctico sin tirones ni texturas a medio cargar.
- **Validación**: 8/8 tests PASS en `engine/server/dm-scene-change.test.ts` y `engine/client/world-scene-loading.test.ts`, 70/70 tests en `engine/server/game.test.ts`, compilación de producción de Vite y verificación de tipos TypeScript cliente y servidor con 0 errores.

## Pecio Rosa de los Vientos: telón escénico 2.5D y auditoría triple — 2026-11-09

Integrado el telón escénico RPG 2.5D en el arco cilíndrico exterior del motor 3D (`engine/client/wreck-scenic-depth.ts`) reutilizando los recursos autorizados (`scenic-rpg-backdrop-clean.jpg`):
- **Alineación Artística 2.5D:** Flanco izquierdo con acantilados de basalto y cementerio de pecios naufragados lejanos; flanco derecho con horizonte infinito y bruma marina baja; cenit con firmamento estrellado.
- **Auditoría Triple Aprobada:**
  1. *Ángulo Táctico Canónico 2.5D (beta 65°):* Proyección vertical confinada al tercio superior `[0.340, 0.939]` sin ocluir cubiertas C1–C9, dragón Clyssavar ni miniaturas. UVs continuas sin costura.
  2. *Órbita Lateral Panorámica (yaw ±30°):* Mantención en frustum sin cortes en bordes (`edgeAlpha` suave en extremos `-78°` y `+48°`). Modulación de luz día/noche dinámica (`1.00` a `0.51`).
  3. *Cenital Empinado (beta 80°) y Cabinas Interiores:* Ocultación instantánea de los 6 meshes en interiores (`wreckInterior = true`), restauración al salir a cubierta. Presupuesto de 1.269 vértices (<1.500) a 60 FPS garantizados.
- **Validación Completa:** 124/124 tests de Pecio pasados (16 archivos), 194/194 tests de Retiro pasados (36 archivos), compilación Vite de producción y TypeScript cliente/servidor con 0 errores. [Dossier y auditoría](output/stormwreck-zone-finish-20261104/scenic-variants.html).

## Retiro del Dragón: Salto de Calidad Visual Integral (Zonas 1, 2 y 3 cerradas; Zonas 4 a 11 pendientes para Gemini 4 Argon) — 2026-11-09

Completadas, auditadas y verificadas visual y técnicamente las primeras tres zonas del Retiro del Dragón dentro de la misión de Salto de Calidad Visual Integral 2.5D:
- **Zona 1 — Playa y Embarcadero (100 % completada y verificada):**
  - Arena mineral cálida PBR (`retreat:pbr:beach-sand`) y franja reflectante de orilla mojada (`retreat:pbr:beach-wet-sand`).
  - Dunas 3D, oleaje dinámico animado de resaca marina, 4 troncos de deriva, 6 bloques de basalto y 72 conchas y guijarros.
  - Pradera costera con 320 penachos 3D y flores de armeria marítima con contorno orgánico difuminado.
  - Muelle de roble con 8 pilotes sumergidos y colonias de percebes, pernos de forja, carga marina y cabo adujado.
  - Bote de remos canónico amarrado sin colisión, con cuadernas curvas de roble, bancadas y remos de madera con palas talladas.
  - Farallón de basalto sellado herméticamente con 3 contrafuertes masivos y sendero con barandilla y faroles náuticos ámbar.
- **Zona 2 — Subida al Retiro (100 % completada y verificada):**
  - Acantilado continuo de basalto facetado (`retreat:cliff-buttress-seal-ascent`), escalones de piedra con bordillos (`retreat:ascent-curb-*`) y arbustos costeros multirrama.
  - Tres faroles de guía en sendero (`retreat:ascent-lantern-*-bottom/mid/top`).
  - Faldón de basalto bajo escaleras (`retreat:stair-abutment-rock-0..1` vía `buildUnderStairBasaltSkirt`) que sella herméticamente los dos huecos triangulares de agua bajo el tramo 3 y descansillo 3.
- **Zona 3 — A1: Celdas y Plaza (100 % completada y verificada):**
  - Paños plegados flotantes (`a1:bench-folded-cloth`) corregidos y asentados sobre los bancos de madera canónicos.
  - Tiras planas de tierra de versiones antiguas retiradas del paseo sur, dejando limpias las 14 jardineras de piedra R3.
  - Hoguera central (`a1:plaza-fire`) y velas votivas de Astalagan (`a1:statue-votive-flame`) encendidas cálidamente de día y noche.
  - Seis portales tallados con umbrales de piedra rústica (`retreat:a1-portal-threshold-1..6`), plintos biselados y dinteles de roble envejecido con pletinas de forja (`retreat:a1-portal-lintel-1..6`).
  - Bordillo de piedra occidental (`retreat:a1-west-plaza-curb`) y farol de entrada.
  - Recorte interior de celdas verificado (celda de Myla, taller, antorchas y mobiliario visibles).
- **Zonas pendientes reservadas en roadmap para ejecución con Gemini 4 Argon:**
  - Zona 4 — A2: Cabrestante
  - Zona 5 — A3: Comedor y Cocina
  - Zona 6 — A4: Biblioteca
  - Zona 7 — Jardines y Bosquetes
  - Zona 8 — A5: Templo
  - Zona 9 — Paseos y Explanadas
  - Zona 10 — Rutas hacia el Resto de la Isla
  - Zona 11 — Entorno Global
- **Validación técnica:** 9 vistas comparativas interactivas con cámara 100 % idéntica en `output/retreat-beach-20261109/index.html`, 5/5 unit tests PASS, compilación TypeScript client sin errores (`tsc -p tsconfig.client.json --noEmit`).

## Retiro del Dragón: Playa y Embarcadero AAA — 2026-11-09

Salto de calidad gráfica Triple-A en la zona costera de desembarco del Retiro del Dragón (`dragon-rest`):
- **Arena PBR y dunas 3D**: sustitución de baldosas calcáreas de plaza (`a1:plaza-v6`) por superficie 3D ondulada de dunas de arena mineral cálida (`retreat:pbr:beach-sand`, albedo `#c2b196`, rugosidad 0.92) que desciende suavemente hacia el agua.
- **Orilla de arena mojada reflectante**: banda continua a lo largo del arco de pleamar/bajamar con material saturado (`retreat:pbr:beach-wet-sand`, rugosidad 0.22) que refleja cielo y sol.
- **Dispersión costera y restos marinos**: 4 troncos de madera de deriva erosionados por el mar, 6 grandes bloques de basalto costero y 72 guijarros y conchas marinas.
- **Pradera costera y pinar 3D volumétrico**: 180 matas de gramíneas costeras y racimos de armeria marítima con contorno plumoso orgánico difuminado, eliminando los bordes rectilíneos artificiales.
- **Carpintería marina y pilotes del muelle**: entablado de roble macizo con 28 pernos de forja, 8 pilotes sumergidos con colonias de percebes, cajas de víveres, barril de ron y adujas de cáñamo.
- **Bote de remos amarrado sin colisión**: reubicado libre de maderas del muelle, con 3 cuadernas vistas de roble, 2 bancadas, 2 remos de madera con palas talladas y cabo de proa amarrado.
- **Farallón de acantilado sellado**: 3 contrafuertes masivos de basalto volcánico que cierran herméticamente el enorme vacío en la montaña tras el sendero de subida a Pleamar, con faldón de rompiente marina al pie.
- **Sendero con hitos y faroles**: 5 postes guía de madera con barandilla de cabo de cáñamo a lo largo del risco, escalones de piedra rústica y faroles náuticos ámbar dinámicos que se encienden al anochecer con parpadeo orgánico.
- **Verificación y paridad**: 5 comparativas interactivas con cámara 100 % idéntica (`cameraDelta = 0.000000`), 17/17 tests PASS en 4 suites de pruebas, TypeScript client/server 0 errores. [Informe interactivo](output/retreat-beach-20261109/index.html) · [Ficha técnica de evidencia](docs/evidence/RETREAT_BEACH_PIER_AAA_20261109.md).

## Antorchas del Retiro: llama y parpadeo — 2026-11-09

Terminadas las cinco antorchas de la fachada y las seis de las celdas del Retiro, conservando el trabajo recibido de Antigravity, sus posiciones y luces. Llama con forma y degradado compartidos, movimiento reducido y luz sincronizada. Compilación instalada y mesa Stormwreck iniciada en el puerto 3000; se conserva la compilación anterior. [Comparaciones superpuestas y animación](output/retreat-torches-20261108/index.html) · [registro y límites](docs/evidence/FIRE_SMOKE_LIGHTING_IMPROVEMENT_20261108.md#5-cierre-localizado-antorchas-del-retiro--09112026).

Pasan 36 pruebas dirigidas y diez comprobaciones de red en una partida aislada. La prueba amplia de embarque de Mia falla igual en la compilación anterior y la nueva; causa o expectativa pendientes de investigar. Quedan por revisar con el usuario el aspecto y, físicamente, rendimiento, móvil y proyector. La entrega no valida todas las antorchas ajenas al Retiro ni el humo y la iluminación global.

## Fuego, humo e iluminación de antorchas y fuentes — 2026-11-08

Mejorados los tres componentes visuales y dinámicos de combustión e iluminación:
- **Estilo visual y animación de llamas**: espectro cromático enriquecido con núcleo incandescente; parpadeo armónico compuesto (doble onda) con sutil oscilación lateral y contracción volumétrica en antorchas del Retiro y campamentos.
- **Humo**: partículas con rotación angular orgánica, mayor tamaño máximo y tiempo de vida alargado, dando volumen denso y ascendente a la fogata.
- **Fuentes de luz**: parpadeo sincronizado con la llama, especular cálido controlado en paredes y rebote suave en los personajes sin alterar las luces maestras ni romper techos. 9/9 tests dirigidos PASS, typecheck 0 errores, compilación Vite y server PASS. [Detalle técnico](docs/evidence/FIRE_SMOKE_LIGHTING_IMPROVEMENT_20261108.md).

## Sombras de contacto de personajes y muebles — 2026-11-08

Mejoradas las sombras de contacto en todos los mapas reutilizando los sistemas existentes:
- Activada la sombra proyectada (dynamicShadows) en el Retiro del Dragón (dragon-rest) dentro de WorldBillboards, unificando su comportamiento con Pecio, Espejo y Campamentos.
- Refinado el gradiente procedural de contacto (ctor:contact-shadow) de 2 a 5 paradas para eliminar cortes duros bajo los pies sin coste adicional.
- Preservadas las sombras y receptores de muebles en el acabado por zonas (stormwreck-object-finish) y utilería del pecio y campamentos.
- Verificación analítica de día (sol dominante con silueta plana) y noche (antorchas con proyección orientada; sin artefactos en oscuridad). Pruebas dirigidas 21/21 PASS, typecheck 0 errores, compilaciones Vite y server PASS. [Detalle técnico](docs/evidence/CONTACT_SHADOWS_IMPROVEMENT_20261108.md).

## Celdas A1: visibilidad y mobiliario — 2026-11-08

Las piezas delanteras de la celda ocupada se ocultan y los muebles próximos a roca se separan ligeramente. Las seis habitaciones se revisaron en cenital y desde jugador; la última deja visibles sus cuatro hamacas. Entradas y salidas comprobadas, candidata compilada e instalada con la mesa cerrada; el servidor 3000 no se ha iniciado. [Registro y comparativas](docs/evidence/RETREAT_CELLS_VISIBILITY_20261108.md). Aceptación visual y pruebas físicas pendientes. La muestra marina incompleta queda limitada a revisión de desarrollo.

## Detalle marino en A2 — 2026-11-08

Se prepara una muestra de percebes y algas adheridos a las rocas y espuma local sobre el oleaje existente. [Evidencia y comparativas](docs/evidence/RETREAT_A2_MARINE_DETAIL_20261108.md). La espuma se actualiza pero se aprecia poco en el encuadre revisado: requiere otra iteración antes de considerarla terminada. La muestra no está instalada y la medición de FPS sigue pendiente.

## Rocas marinas ante el cabrestante — 2026-11-08

Retiradas tres piezas visuales de acantilado que formaban paños cortados ante A2, sustituidas por siete rocas emergentes con el basalto del Retiro. Se conservan los apoyos de la caseta y de la escalera y el descenso animado con seguimiento. Seis comparativas equivalentes y 26 pruebas dirigidas. Compilación instalada con la mesa cerrada; el servidor 3000 no se ha arrancado. Esta instalación incluye las mejoras A2, pradera y cueva anteriormente pendientes. [Registro y comparativas](docs/evidence/RETREAT_WINCH_SEA_ROCKS_20261108.md). Revisión artística y física pendientes.

## Pradera y pared excavada junto a A3 — 2026-11-08

La pradera de expediciones llega al paseo y una pieza de roca remata la unión abierta de la fachada con el lateral de la cueva. La antorcha conserva su posición y el paño se oculta al entrar en A3. Seis pares de cámara y comprobación interior en tres giros. La candidata conjunta `runtime/prepared-retreat-a2-meadow-cave-20261108` supera 39 pruebas, compila y conecta en mesa temporal; incluida en la instalación conjunta posterior, con revisión artística y pruebas físicas pendientes. [Detalle y comparativas](docs/evidence/RETREAT_EXPEDITION_CAVE_SEAMS_20261108.md).

## Unión de caminos de la caseta A2 — 2026-11-07

Se cubre el hueco entre la escalera y la pasarela, se ensancha esta a dos casillas con el mismo pavimento de la escalera y se trasladan las cuerdas interiores al perímetro. Paso y puerta comprobados en ambos sentidos, con muro y posición guardada preservados. [Evidencia y comparación](docs/evidence/RETREAT_A2_JUNCTION_20261107.md). Candidata aislada; la mesa activa no se ha reiniciado.

## Caseta del cabrestante A2 — 2026-11-07

Paredes de madera, dos ventanas acristaladas, reflejo estilizado y encaje del cable/soporte sobre la casa existente. El paño que mira a cámara se retira al ocupar el interior. 36 pruebas y diez pares de cámara del jugador. Candidata compilada `runtime/prepared-retreat-winch-20261107b` y comprobada en una mesa temporal; continúa separada de la mesa abierta en 3000. [Evidencia y límites](docs/evidence/RETREAT_WINCH_HOUSE_20261107.md).

## Recorridos del Retiro — 2026-11-07

Auditoría de 26 rutas del Retiro con lectura del PDF original, 1.596 casillas conectadas y 846 pasos de ida/vuelta en una partida temporal. Las cuatro salidas terrestres reciben continuaciones curvas con apoyo de roca. Se corrige también la unión marina oriental. Candidata compilada en `runtime/prepared-retreat-routes-20261107`, 104 pares comparativos y 75 pruebas del Retiro aprobadas. Conserva seis viajes con posición y orientación de regreso comprobadas. Sigue separada de la mesa habitual; FPS sostenidos y prueba física pendientes. [Estado, capturas y límites de validación](docs/evidence/RETREAT_ROUTES_20261107.md).

## Antorchas y focos del Retiro — 2026-11-06

Rehechos los soportes del pasillo y de las celdas. Las luces del pasillo siguen a sus llamas y al recorte de la fachada. Los emisores de comedor y biblioteca coinciden con sus lámparas. Candidata compilada en mesa de prueba 4683 y comprobada con los modelos reales y 35 pruebas. Revisión de imagen pendiente por la configuración del navegador local de Work. [Ficha y visor](docs/evidence/RETREAT_FIXTURES_20261106.md).

## Identificación de versión al arrancar — 2026-11-06

El mensaje del servidor obtiene la versión declarada en `package.json` en vez de mostrar siempre «Alpha 0.3». Para la versión actual muestra «versión del proyecto 0.3.2-dev.7 · en desarrollo». La cifra identifica el código del proyecto, no certifica que una compilación o una versión hayan sido aceptadas. Si no puede leer el manifiesto, informa «no disponible» y permite iniciar la mesa. Se compiló y se comprobó el arranque con una partida temporal. El único archivo actualizado de la compilación habitual es `dist/server/apps/server/index.js`, tras comparar que sus únicas diferencias eran este anuncio; copia anterior en `runtime/version-label-20261106/`. La mesa abierta no se reinicia: mostrará el texto nuevo la próxima vez que arranque.

## Acabado de Retiro y Pecio instalado en la mesa habitual

Por petición del usuario se activó en `dist` la candidata de acabado por zonas del 05/11. La mesa Stormwreck está disponible en el puerto 3000 con el guardado en estado `ready`. Se cotejaron por hash las cuatro interfaces y sus recursos directos, 23 archivos en total. `INICIAR.cmd` usa la versión instalada al elegir Stormwreck. La partida y la compilación anterior tienen copias de respaldo. [Registro de instalación](output/stormwreck-zone-finish-20261104/deployment-3000-20261105.json).

## Cuarta pasada de rendimiento del Retiro y del Pecio

Se reduce el trabajo del mar y la espuma fuera de vista. El visor confirma la suspensión bajo cubierta en C8 y la omisión de la espuma desde el foco de expedición del Retiro. La cubierta C1 mejora en la comparación nocturna con lluvia, con intervalos que aún superan 33,33 ms. [Detalles, pruebas y candidata aislada](docs/evidence/STORMWRECK_PERFORMANCE_PASS4_20261106.md).

## Tercera pasada de rendimiento del Retiro y del Pecio

La biblioteca A4 baja de 2.473 a 1.576 mallas examinadas en la vista principal. De noche con lluvia, la media de dos tandas pasa de 24,1 a 28,9 FPS. El camarote C5 pasa de 44,5 a 50,0 FPS al suspender las partículas ocultas. Persisten intervalos superiores a 33,33 ms, también durante los recorridos. [Candidata aislada y pruebas](docs/evidence/STORMWRECK_PERFORMANCE_PASS3_20261106.md).

## Segunda pasada de rendimiento del Retiro y del Pecio

La cubierta C1 alcanza 52,7 FPS medios y 41,3 FPS en su ventana de un segundo más lenta, con picos de intervalo entre fotogramas. El Retiro mejora en la celda A1 y en A4, con 24,6 y 27,9 FPS medios en la candidata. Sigue abierto el umbral en ambos mapas completos. [Optimización de sombras, agua y recorte, pruebas y capturas](docs/evidence/STORMWRECK_PERFORMANCE_20261106.md).

El barrido posterior cubre diez focos por mapa de día y de noche con lluvia. El Pecio cumple el límite de 33,33 ms por fotograma en 4/20 tandas y el Retiro en 0/20. Prioridades observadas: C5 con lluvia, y A1/A3/A4 y exteriores del Retiro. El criterio del usuario incluye las transiciones y el acabado íntegro.

## Rendimiento del Retiro y del Pecio — 2026-11-05

El usuario pide más de 30 FPS sostenidos con el acabado actual. Implementadas optimizaciones de sincronización de luces, búsquedas de casillas, recorte del Retiro y dibujo de agua, reflejos y huesos. Los ensayos cortos con Intel UHD muestran caídas en A1, A4 y cubierta. El objetivo sigue abierto. [Medidas, comparativas y candidata](docs/evidence/STORMWRECK_PERFORMANCE_20261105.md).

## Acabado por zonas de Retiro y Pecio — 2026-11-05

Candidata jugable aislada `runtime/stormwreck-zone-finish-20261105`, accesible mediante `REVISAR-ACABADO.cmd`. Retiro A1–A5 y cinco focos de paisaje con piedra, madera, cuatro muebles del comedor, 31 jardineras, 86 copas y tres praderas refinados. Pecio C1–C9 y cofa con maderas por exposición, hierro, cabo, lino, 205 componentes biselados y recorte selectivo de escalera en C4 y C8. Texturas textiles originales compartidas y acabado preservado al reconstruir el estado de un objeto.

[Galería](output/stormwreck-zone-finish-20261104/index.html) con 40 pares de cámara/resolución equivalentes y 100 comprobaciones de luz, giro y clima, más tres roles por mapa. Tres ciclos de apertura y cierre de cuatro objetos con recuentos estables. Tipos, compilaciones, 48 pruebas dirigidas y diez comprobaciones de red superadas. Movimiento con D verificado en la interfaz real de jugador. [Informe y propietarios](docs/evidence/STORMWRECK_ZONE_FINISH_20261105.md). La instalación habitual sigue separada. Revisión artística, escucha con voz, Q1 y M7 físicos pendientes. Cena de D8 conserva su prioridad posterior.

## Muestra de mobiliario/plantas y extensión autorizada — 2026-11-04

El usuario encarga continuar con Astra el apartado visual completo y confirma Retiro/Pecio primero; Cena queda posterior. Terminada la muestra de cuatro muebles A3, dos jardineras y piezas del timón/balista/C4. Candidata aislada `runtime/stormwreck-object-finish-20261104`, tipos/compilación, seis pruebas de objetos y diez comprobaciones de red; diez pares reales con iguales cámara/resolución y sin errores. Corregida la generación de hojas antes de finalizar la transformación GLTF. [Informe, IDs y límites](docs/evidence/STORMWRECK_OBJECT_FINISH_20261104.md). La instalación 3000 sigue en la entrega del 02/11. Continúa extensión por zonas VIS-3 y corrección VIS-4 de la escalera ante el personaje en C4. Aceptación artística/física y Q1/M5/M7 pendientes; no son una nueva revisión técnica ni otra cola global.

## Pantallas de habilidades · revisión numerada 0–18 — 2026-11-07

Última revisión: dado abajo en el centro, resultado temporal bajo el título, sombras y apoyos comunes. Nuevas poses y desenlaces de persecución, pulgar arriba, público, hurto de bolsa, vendaje ampliado, caída lila, carta, libro y sigilo. Percepción alterna ocho visitantes; Supervivencia muestra pezuñas de jabalí y otro rastro animal sobre el suelo. Dieciséis pruebas dirigidas, tipos/compilación, 108 desenlaces y seis repeticiones de la persecución, las ocho variantes, toque y vistas 1280 × 720 / 390 × 700 / 844 × 390 aprobados. En móvil se amplía la viñeta y la franja de Continuar deja libre la pulsación del dado. Misma candidata aislada; aceptación artística y prueba física pendientes. [Recursos y criterios](docs/design/SKILL_ANIMATION_NARRATIVE_20261107.md), [informe con vídeo y 19 comparativas](output/skill-transition/narrativa-v5/REVISAR-ANIMACIONES-Y-HUELLAS.html). Visor autónomo vigente: `output/skill-transition/PROBAR-LAS-18-PANTALLAS.html`.

Corrección posterior: eliminado el fundido entre dibujos que hacía parpadear el cuerpo y duplicaba contornos; opacidad estable con los tres protagonistas. Acrobacias completa la caída y Atletismo enlaza el suelo mediante un reloj continuo y máscara gradual. Trece pruebas, 36 desenlaces, tipos/compilación y transición VTT aislada aprobados. [Vídeo y cuatro comparativas](output/skill-transition/parpadeo-v4/SIN-PARPADEOS.html); detalle y condiciones en la ficha de evidencia.

Candidata aislada en `dev/skill-transition`: nuevos sprites con objetos integrados para Mía, Mike y Trinity, pies apoyados, utilería y secundarios ilustrados, dado que rueda y desenlace animado persistente. Acrobacias inicia fuera de la cuerda; Atletismo usa suelo continuo en movimiento y caída al fallar. Contactos conjuntos de apretón y vendaje; caballo con escala y poses de alcance ajustadas. Visor autónomo actualizado en `output/skill-transition/PROBAR-LAS-18-PANTALLAS.html`; comparativas y vídeo en `output/skill-transition/correcciones-v3/REVISAR-CORRECCIONES-0-A-18.html`.

Diez pruebas dirigidas, tipos, compilación de cliente, 108 combinaciones y doce repeticiones de los dos últimos ajustes; móvil/táctil emulado y transición real por Socket.IO aprobados. Revisión artística del usuario y prueba física separadas. La mesa habitual y los cambios de otros chats se conservan. [Recursos y cambios por número](docs/design/SKILL_ANIMATION_CORRECTIONS_20261107.md), [evidencia y límites](docs/evidence/PLAYER_SKILL_TRANSITIONS_20261106.md).

## Instalación habitual 3000 y comparativas por superposición — 2026-11-02

Por petición explícita del usuario se instalan en `dist` las muestras Retiro/Pecio, adaptación de actores y cráneo terminado; la mesa habitual Stormwreck queda arrancada en el puerto 3000 con los guardados existentes. Preparación de cliente/tipos/servidor PASS y activación con el instalador existente; compilación anterior conservada en `runtime/previous-build-*`. El acabado queda activo por defecto en futuros arranques (`DUNGEONS_STYLE_SAMPLE=0` permite una compilación base aislada). [Registro de instalación y comprobaciones HTTP](output/stormwreck-style-sample-20261101/deployment-3000-20261102.json). La instalación solicitada no inventa aceptación artística ni física.

Nueva regla persistida en AGENTS/dirección/anexo visual: todos los informes nuevos o regenerados alternan antes/después superpuestos con clic/toque, sin perder encuadre/zoom/desplazamiento. Componente común `scripts/lib/visual-comparison.mjs`, ampliación hasta 300 %, etiquetas y teclado. Regenerados informes de materiales/cráneo y luz del 01/11 sin alterar capturas originales. La interfaz se verifica con imágenes sintéticas; el navegador de prueba bloquea `file:` y no se reexpone el informe local para sortear esa restricción. Las comparativas reales mantienen sus fechas/condiciones y aceptación pendiente.

## Muestras Retiro/Pecio y finalización del cráneo — 2026-11-02

Implementadas las primeras muestras de materiales ilustrados en el WorldRenderer actual: A3/umbral y piedra continua compartida del Retiro, cubierta/C4 del Pecio. Tres albedos derivados con ImageGen integrada, normales/UV y geometría conservadas, activación reversible y compilación de revisión separada. Cráneo recibido de Antigravity terminado por encargo explícito posterior del usuario: escala coherente dentro de la huella, bóveda redondeada, mandíbula conectada y cavidades hundidas. Se conserva el resto de su archivo y material óseo. Corregida la preparación de las capas vivas de clima de los materiales nuevos antes de dibujarlos. Pruebas dirigidas: 45/45 en siete archivos; tipos/compilación PASS y 10 comprobaciones de red real de la candidata PASS. La integración ampliada histórica mantiene una expectativa antigua de abordaje pendiente, detallada en el informe.

Acceso: `REVISAR-ACABADO.cmd`, con puerto libre y guardado temporal. [Galería real](output/stormwreck-style-sample-20261101/index.html) e [informe, propietarios, pruebas y pendientes](docs/evidence/STORMWRECK_STYLE_SKULL_20261102.md). La dirección artística está aprobada; la implementación requiere revisión del usuario. No se han instalado las muestras en la mesa habitual, reiniciado 3000, cambiado de modelo o publicado en GitHub. No cierra VIS2–6 ni Q1/M5/M7; mobiliario, plantas y profundidad completos siguen en el maestro.

## Coordinación inicial con Antigravity: sustituida por autorización posterior — 2026-11-01

Inicialmente el usuario pidió dejar el cráneo a Antigravity. Después encargó explícitamente terminarlo tras las muestras: «Cuando acabes de hacer lo tuyo, acaba el craneo que ha dejado a la mitad antigravity». La finalización del 02/11 parte de su fuente, no la revierte. El material de hueso sigue separado del controlador de madera/piedra. Los demás cambios concurrentes se conservan y no se atribuyen a esta entrega.

## Huesos de dragón del Pecio Rosa de los Vientos (Clyssavar) · fidelidad al canon del PDF — 2026-11-01

Reconstrucción integral de los restos esqueléticos de Clyssavar, el dragón de oro anciano cuya muerte violenta en el bajío norte dio origen al arrecife de huesos y provocó el naufragio del *Rosa de los Vientos* hace 40 años, según la descripción literal del libro oficial (`Aventura Los Dragones de la Isla de las Tempestades`, Cap. 3, pp. 22–27):

- **Identidad anatómica del dragón de oro:** cráneo en `reef-south-west` con cuernos curvados hacia atrás sobre el cuello, cuernos secundarios de cresta/corona, barbillones óseos mandibulares (chin-spurs), fosa temporal expuesta, cuencas oculares cavernosas con cavidad interna profunda (`cavities`), bóveda craneal con cresta sagital y mandíbula desencajada con grandes colmillos superiores e inferiores en marfil mineralizado.
- **Eliminación del clamp plano:** eliminada la función anterior de pinzamiento que aplastaba los vértices contra las paredes cuadradas de la celda. Las trayectorias paramétricas y volúmenes están calibrados analíticamente para respetar la huella de obstáculos (`reef-south-west` cols 14..16, rows 28..29; `dragon-bone-stern` col 1, rows 13..15) con cero deformación geométrica y cero violaciones de footprint.
- **Espina y costillar de popa (`dragon-bone-stern`):** 5 vértebras articuladas a lo largo del eje Z con apófisis espinosas dorsales y arcos de costillas gigantes que se elevan hasta 2,8 m sobre la lámina de agua, con cabezas de costilla (capitulum) y fracturas desgastadas por el salitre.
- **Huesos que rompen y sostienen el casco (Cap. 3, p. 23):** en `buildDistantDragonBones`, se incorporan las costillas colosales y el espinazo que empalan y acunan el casco fracturado en la brecha de popa («sostenido en los huesos antiguos que rompieron el casco»), además de las osamentas bajo el arrecife del trinquete en C2 («hasta las rocas y los huesos de dragón que se encuentran en el agua»).
- **Verificación:** 15/15 tests dirigidos de pecio (`wreck-rebuild.test.ts` y `wreck-atmosphere.test.ts`) PASS; typecheck cliente/servidor PASS (0 errores); bundle de producción Vite PASS.

## Dirección de las dos láminas aprobada — 2026-11-01

Respuesta explícita del usuario: «Acabado de las dos láminas (recomendado)». Aprobada la dirección ilustrada 2.5D para Retiro/Pecio y el desarrollo de muestras reales VIS-2. Actualizados maestro, dirección y perfil; los números de material se calibran en el motor. Las láminas continúan siendo conceptos, sin autoridad para alterar geometría o contenido. Esta aceptación no cierra muestras aún no construidas, pruebas, dispositivos, Q1 o M5/M7.

## Dirección visual candidata V1 de Retiro/Pecio — 2026-11-01

El usuario pide tomar decisiones visuales. Preparadas dos láminas de concepto con image_gen integrado, editando capturas propias recientes del comedor del Retiro y cubierta del Pecio; originales conservados y copias estables en `docs/references/stormwreck-style-20261101/`. Recomendación: misma familia 2.5D estilizada, Retiro volcánico templado y Pecio salino frío. Paletas por rol, material, muestreo/UV/resolución, grid y límites en `docs/design/STORMWRECK_VISUAL_PROFILE.json`; contiene prompts completos y procedencia. La dirección artística y el maestro enlazan esta especificación de VIS-2 sin crear otro roadmap.

**Estado: propuesta, valoración del usuario pendiente, no aplicada al juego.** Los bocetos no fijan geometría o contenido: no reinterpretar puertas como bancos, copiar refuerzos/vegetación/cielo, reparar barco o añadir botín por detalles generados. Valores de roughness/normal/UV son candidatos de muestra, aún no resultados verificados en motor. No se alteran fuentes de runtime, mapas, guardados, controles, dependencias o servidor habitual, ni se ejecutan nuevas pruebas del juego. Láminas, paletas, antes real/concepto y prompts en `output/stormwreck-style-decisions-20261101/index.html`.

## Roadmap consolidado y matriz de cambios — 2026-11-01

Auditoría de nombres fuera de copias/prototipos/runtime/output/dependencias/respaldos: 19 archivos con `roadmap`, de los que 14 son históricos/puentes antiguos, cuatro anexos y uno maestro. `ROADMAP_V1.md` contiene ahora la única secuencia de ejecución, motor/herramientas, diez categorías de cambios concretos por Retiro/Pecio, referencias por categoría, criterios de salida y decisiones aún abiertas. El anexo visual deja de duplicar la tabla de fases/estados. README/AGENTS/NEXT_MODEL_PROMPT apuntan a las secciones activas; el relevo r36 del Pecio queda explícitamente histórico.

Se conserva Babylon 9.26.0, PBR/StandardMaterial y propietarios actuales; no se encarga migrar motor/bibliotecas. Muestras A3/umbral y cubierta/C4 siguientes; paleta final, UV/resolución/normal/roughness y derivados se deciden con esas muestras, no constan aprobados. Referencias modernas ya incorporadas: doce documentadas, cinco familias examinadas y siete secundarias de estudio. No hay nueva implementación gráfica, compilación, prueba del juego, instalación, publicación o cambio de modelo por esta consolidación.

## Inicio visual: Retiro del Dragón y Pecio Rosa de los Vientos — 2026-11-01

El usuario cambia la prioridad de la línea visual: Retiro y Pecio antes que Cena. Actualizados el maestro y su anexo visual; Cena mantiene sus listas para después. Primera subentrega acotada VA-10/11: respuesta pictórica de los personajes al sol/ambiente y luces existentes, con separación por camarotes/plantas/celdas y sin alterar autoridad, visibilidad de entidades, física, colocación, sprites o controles. Se usa el renderizador integrado en una revisión aislada; no son sesiones reales de red ni certificación de dispositivos. [Registro de implementación, comparativas y límites](docs/evidence/STORMWRECK_VISUAL_START_20261101.md). El acabado de materiales, muebles, vegetación y profundidad del conjunto sigue pendiente, sin promover versión ni aceptación artística por esta entrada.

## Entrada única de planificación — 2026-11-01

Aclarada la jerarquía para evitar roadmaps competidores: `ROADMAP_V1.md` es el maestro y punto inicial para cualquier chat. `docs/VISUAL_ROADMAP.md` pasa a titularse plan de acabado visual; la ficha del Retiro conserva revisión 19 y orden local; Cena mantiene E0–E6/C01–C60; Dani/Fer conserva coordinación. Se mantienen nombres/rutas para no romper referencias y se etiqueta la propuesta `docs/ROADMAP_V1_REVISION_1.md` como histórica. README y AGENTS apuntan primero al maestro. No se mueven archivos, reinician mapas, cambian prioridades locales autorizadas o publican revisiones del juego. La siguiente muestra de Cena corresponde a la línea visual, sin detener los trabajos ya autorizados de otras escenas.

## Referencias modernas y dirección visual compartida — 2026-11-01

Encargo del 30/10, acotado por el usuario a 2018 en adelante: biblioteca de 12 juegos/ediciones modernas en `docs/design/VISUAL_REFERENCE_CATALOG.json` y `docs/design/VISUAL_REFERENCE_LIBRARY.md`; incluye Octopath 2018/II 2023, Witchbrook promocional 2026, FFTactics Enhanced 2025, Triangle Strategy 2022, DQIII HD-2D 2024, Star Ocean 2R 2023, Sea of Stars 2023, Eastward 2021, Chained Echoes 2022, Live A Live 2022, Eiyuden 2024 y Songs of Conquest 2024. Distingue cinco familias con imágenes examinadas y siete de estudio documental pendiente; no declara revisión completa de los 12 juegos ni convierte sus capturas en assets libres.

Guía común `docs/design/VISUAL_ART_DIRECTION.md`, auditoría `docs/audits/VISUAL_GAP_AUDIT_20261101.md` (VA-01–VA-18) y `docs/VISUAL_ROADMAP.md` (VIS-0…VIS-6), enlazadas desde arranque/roadmaps/relevos. Conserva mapas vigentes, fases del Retiro, referencias aprobadas y C01–C60 de Cena. El diagnóstico prioriza muestra coherente de materiales, muebles, vegetación, personajes y luz; reconoce sistemas ya hechos. `AGENTS.md` guía a futuros chats en tareas visuales; no se han enviado mensajes a otros chats ni cambiado modelos.

Galería local en `output/visual-reference-library-20261030/index.html` (carpeta conserva fecha de inicio del encargo). Investigación y planificación, sin arte integrado, reinicio/despliegue, nuevas pruebas del juego o aprobación física/artística. Las evidencias antiguas conservan su fecha; pendientes revalidación y ejecución de los bloques autorizados.

## Espejo D8 · bruma, sonido y recorrido de salida — 2026-10-21

Bruma baja reforzada con capas cruzadas; móvil conserva las dos bolsas disponibles más cercanas, sin elegir la galería sellada. Audio original de aire interior, dos gotas y crujido: incidencias cada 32–58 s, mezcla discreta y suspensión durante combate/activación/salida/silencio. Al cruzar la abertura tras la derrota se ven cinco casillas (7,5 m) de avance durante cinco segundos, sincronizadas por servidor, antes de la cena. Reconexión viva conserva el reloj; restauración duradera vuelve al umbral sin repetir automáticamente. Cámara del Espejo con envolvente corporal estable y margen bajo los pies; corregida la mesa vacía sin personaje de foco. Sin cambiar reglas, estadísticas o preferencias de otros mapas.

Candidata `runtime/d8-mirror-immersive-20261020/{server,web}`; lanzador `scripts/review-d8-mirror.ps1`, ahora versión predeterminada `immersive`. Mesa temporal `http://127.0.0.1:59950/dm`, galería `http://127.0.0.1:4603/gallery/`. 52 pruebas en 11 archivos, tipos/compilaciones e integración DM/dos jugadores/proyector correctos. 160 vistas, 252 muestras durante 413 estados de movimiento, 16 perfiles y mesa vacía sin errores ni pérdida del jugador. Grabación sonora de 70 s con gota a los 57,756 s. Conservadas 399 casillas, 344 difíciles y 49 peligrosas.

Tres regresos idénticos: 604 mallas, 60 texturas, 73,1043 MiB estimados. Perfiles: 130–298 llamadas y 69,33–83,97 MiB; 1080p aún supera el presupuesto orientativo de 80 MiB. Revisión enfocada, sin nueva sesión de veinte minutos ni certificación física de FPS. Pendientes aprobación artística, escucha con voces y Pixel/proyector físicos. Distribución habitual y guardados reales conservados; sin publicación ni subagentes. [Informe y reproducción](docs/evidence/D8_MIRROR_IMMERSIVE_20261021.md).

## Retiro · correcciones y piedra por fases — 2026-10-21

Primera entrega de piedra integrada sobre la entrega existente. Corregidos el agua que invadía el desembarco, la exclusión de las rocas de primer plano del sistema de ocultación y las estadísticas de capas/mar. Juego y visor comparten frente de 90° y dimensiones de zona; se conserva el perfil actual continuo de 5° a 25° y el controlador de cámara existente. Documentación FASE_3A/3B contrastada con el código.

Tres fases revisadas: material de basalto compartido, refinado en Blender de 18 masas existentes y contactos/variación mineral. Tres bloques de primer plano sustituidos por salientes nativos. Capa final de 21 mallas, 28.514 triángulos y 1,28 MiB. Conservadas las 128 mallas originales de celdas y siete archivos protegidos de navegación/distribución/campaña. 68/68 pruebas, cliente/servidor compilados, recorrido físico de 4.828 posiciones sin colisiones nuevas y coronación sin pliegues. Auditoría de 195 encuadres y 83 casos de primer plano sin incidencias; personaje completa las diez superficies con cuadrícula visible/oculta y sin perder apoyos. Capturas por fase y mediciones en el [informe](docs/evidence/RETREAT_STONE_20261021.md). Pendiente reducir el coste de la piedra en A3; después afinar encuentros y coronaciones y validar dispositivos físicos.

## Cena final D8 · instrucciones literales para compartir — 2026-10-21

El usuario concreta «mejorarlo, no cambiarlo». Añadido contrato de conservación de distribución/identidad/funciones y lista C01–C60 en `docs/design/D8_DINNER_LITERAL_CHECKLIST_20261021.json`, con versión legible `.md`. Once categorías; cada punto declara evidencia/tipo, qué falta o comprobar, acción, qué conservar, aceptación, fase y prioridad. Distingue observación visual, código auditado, verificación pendiente y efectos condicionados. Se revalida antes de implementar para conservar trabajo de otros chats.

Actualizados auditoría, encargo e informe visual con los 60 puntos completos, búsqueda y filtros. Copia autónoma `output/d8-dinner-octopath-audit-20261020/informe-para-compartir.html`: análisis, lista, prompt, base/pruebas fechadas y 13 imágenes integradas, sin dependencias de archivos locales. Validación documental de IDs, enlaces, PNG y sintaxis; sin ejecutar ni desplegar mejoras del juego, sin nuevos tests de runtime ni pruebas físicas. Las 41 pruebas y cifras de ejecución siguen siendo evidencia de base del 20/10.

## Cena final D8 · luz y profundidad explícitas — 2026-10-21

Ampliado el apartado 17 de `docs/design/D8_DINNER_OCTOPATH_AUDIT_20261020.md`, su encargo `docs/design/D8_DINNER_EXECUTION_PROMPT.md` y la galería local. Luz/profundidad ahora tienen entregables por fase: E0 base de planos y fuentes, E1 profundidad geométrica y luz inicial, E2 volumen/materiales, E3 iluminación completa y actores, E4 profundidad atmosférica/luz en el aire, E5 estados de luz por desenlace, E6 comparativas sin efectos/completas/móvil y vídeo de movimiento. Incluye primer plano selectivo, entorno lejano, sombras proyectadas/contacto, fuentes locales, reloj y claridad táctica. Cambios de documentación; sin implementar ni desplegar mejoras y sin acreditar pruebas nuevas del juego. Las 41 pruebas citadas siguen siendo la base del 20/10.

## Cena final D8 · auditoría Octopath — 2026-10-20

Auditoría centrada exclusivamente en `dinner`, sin modificar ejecución, mapas, partidas o despliegue. Informe completo en `docs/design/D8_DINNER_OCTOPATH_AUDIT_20261020.md`, encargo de producción en `docs/design/D8_DINNER_EXECUTION_PROMPT.md` y galería local en `output/d8-dinner-octopath-audit-20261020/index.html` (capturas reales identificadas por fecha, seis observaciones visuales y referencias del usuario; no hay un después simulado).

Base inspeccionada: grid 19×18 de 1,5 m, 318 casillas transitables, 4 difíciles, 35 objetos autorados, puerta e interacción con Anteros conservadas. Cambio de escena correcto en estado aislado en memoria; conectividad estática 318/318, sin acreditar recorrido legal completo. 41 pruebas aprobadas en cuatro archivos de campaña/paquete/cámara/movimiento. Rendimiento mostrado de 725 mallas/540 draw calls es histórico del 18/10, no medición nueva de móvil. Pendientes pruebas físicas y rendimiento sostenido.

Prioridad: composición y recorte de casa/patio, materiales y siluetas, integración de actores con luz local (actualmente conectada solo al Espejo), después ambiente, audio y tres desenlaces. Siete fases E0–E6, cada una funcional; validar en mesa integrada, no solo Playground. Recoge cámara actual continua 5°–25°, interior 10°, comparación artística a 15°, giro ±30° y WASD estable. No restaura el perfil antiguo de las capturas ni reemplaza mejoras recientes del Espejo/personajes.

## Espejo D8 · sello completo y ambiente — 2026-10-20

Corregida la lámina de cierre que dejaba ver detrás al girar: bloque de hielo cerrado de 3,35 m, base enterrada, revestimiento arqueado y unión superior a la caverna. Mantiene rotura, polvo/fragmentos y salida física a la cena tras derrotar al Reflejo. Añadidas tres bolsas de bruma baja y caídas pequeñas y espaciadas de escarcha, con reducción en combate/pantallas pequeñas y respeto a movimiento reducido. Ambiente sonoro propuesto, sin cambiar la mezcla.

Candidata aislada `runtime/d8-mirror-seal-atmosphere-20261020/{server,web}`; lanzador `scripts/review-d8-mirror.ps1`, versión predeterminada `atmosphere`, conservadas las anteriores. Mesa temporal `http://127.0.0.1:57255/dm`; galería `http://127.0.0.1:4602/gallery/`. 19 pruebas, 5.985 rayos contra la abertura, 384 comprobaciones de espacio corporal, 70 vistas anteriores y 70 finales, 16 perfiles y red DM/dos jugadores/proyector correctos. Conservadas 399 casillas, 344 difíciles y 49 peligrosas, cámaras continuas y trabajo de otros chats.

Tres regresos estables: 599 mallas, 62 texturas, 78,1043 MiB estimados. Perfiles: 120–291 llamadas, 74,33–88,97 MiB; 1080p todavía supera el objetivo orientativo de 80 MiB. Comprobación enfocada: no se repite la sesión de veinte minutos anterior ni se certifican FPS/dispositivos físicos. Pendientes aprobación artística, móvil/proyector y escucha. Servidor habitual, distribución y guardados reales intactos; sin publicación. [Informe y reproducción](docs/evidence/D8_MIRROR_SEAL_ATMOSPHERE_20261020.md).

## Espejo D8 · hielo, bóveda y salida — 2026-10-20

Implementados los cinco refinamientos solicitados: suelo sin juntas repetidas ni borde estirado en la extensión frontal; reflejos tenues de personajes sobre hielo con muestreo de nieve/luz y atlas compartidos; paredes y contrafuertes con relieve irregular; bóveda interior continua que se retira del encuadre útil; y sello de hielo con grietas, fragmentos y polvo que se abre al derrotar al Reflejo preparado. Cruzar el umbral lleva a la cena con Anteros, sin elegir desenlace ni cambiar dados, estadísticas o inventarios. El sello ocupa temporalmente tres casillas; las 399 casillas, 344 difíciles y 49 peligrosas conservan sus coordenadas.

Candidata aislada en `runtime/d8-mirror-icepass-20261020/{server,web}`. El lanzador `scripts/review-d8-mirror.ps1` usa ahora `icepass` por defecto y conserva las revisiones anteriores mediante `-Version`. Mesa de revisión `http://127.0.0.1:50722/dm`, jugador `/player`, proyector `/projector`; galería `http://127.0.0.1:4601/gallery/`. Guardados exclusivos en una carpeta temporal. No se ha sustituido `dist`, reiniciado el puerto 3000 ni publicado en GitHub; se conserva la corrección de cámara y los cambios de otros chats.

126 regresiones en 20 archivos, 8 comprobaciones finales específicas y 3 de pasos compartidos correctas; tipos, compilaciones y prueba de red DM/dos jugadores/proyector aprobados. Sello bloqueado, derrota, movimiento físico de jugador hasta la cena, independencia del segundo jugador, reconexión, guardado/restauración y reinicio verificados. 120 cámaras, 16 perfiles y sesión automatizada de 20,69 minutos, ocho idas/vueltas y cero errores. Tres regresos de limpieza idénticos: 583 mallas, 58 texturas y 72,6877 MiB. Texturas repetidas entre 72,68 y 72,69 MiB; pico tras animaciones de 118,81 MiB, todavía sobre el presupuesto orientativo de 80 MiB. Entre 135 y 232 llamadas de dibujo en los perfiles medidos. No son FPS ni memoria total de dispositivos físicos.

Pendientes la aprobación artística y las pruebas físicas en Pixel 9a/proyector/sonido. [Informe, límites y guion de revisión](docs/evidence/D8_MIRROR_ICEPASS_20261020.md), [capturas y secuencia de salida](output/d8-mirror-icepass-20261020/index.html).

## Espejo · corrección de cámara vacía — 2026-10-20

Corregida la pérdida de `y` al copiar un Vector3 en `clampMirrorCameraTarget`, que invalidaba la cámara y dejaba el mapa azul pese a tener cargados los recursos. 17/17 regresiones de cámara, tipos y compilaciones cliente/servidor correctos. Revisión visual aislada con escenario visible; corrección instalada en `dist/` y distribución anterior retenida. El puerto 3000 estaba libre; el arranque automático en segundo plano fue rechazado por la revisión de permisos («blocked by policy»). Pendiente abrir `INICIAR-ONE-SHOT.cmd` y recargar el DM. Mantenimiento reforzado para conservar siempre lo funcional y aplazar carpetas generadas con servidores abiertos: 27 comprobaciones. [Causa, prueba visual y estado de arranque](docs/evidence/MIRROR_CAMERA_HEIGHT_FIX_20261020.md).

## Orden y mantenimiento de la carpeta — 2026-10-20

Retirados 12.778 archivos antiguos: 5,29 GB (4,92 GiB) de respaldos intermedios, compilaciones, cachés y capturas sin referencias. Protegido todo lo creado o modificado desde el 13/10/2026: 60.312 archivos recientes conservados. Comparación SHA-256 de 3.009 fuentes/recursos sin diferencias al terminar el borrado; guardados, distribución instalada, originales, prototipos y servidores abiertos conservados. Cinco hitos ZIP y parches posteriores retenidos. `MANTENIMIENTO.cmd` permite revisar o repetir con un mínimo de siete días; 26 comprobaciones aisladas correctas y revisión posterior sin residuos adicionales propuestos. DM/jugador/proyector responden 200. [Resultado y registros](docs/evidence/WORKSPACE_CLEANUP_20261020.md), [guía de carpetas y mantenimiento](docs/WORKSPACE_MAINTENANCE.md).

## Espejo D8 · diez puntos de acabado — 2026-10-20

Implementados en orden los diez puntos de la revisión: terreno con relieve y materiales diferenciados, fondo en capas, primer plano, plataforma ritual del espejo, composición lateral, luz focal y rebote frío, nieve/escarcha, bóveda rota con volumen, huellas de magia y acabado conjunto. Cuatro capturas y una compilación funcional por punto. Módulo `mirror-art-direction.ts`, dos albedos originales de ImageGen con prompts/procedencia y exportaciones optimizadas; navegación de 399 casillas, 344 difíciles y 49 peligrosas conservada.

Candidata ejecutable en `runtime/d8-mirror-artpass-20261019/{server,web}`. `./scripts/review-d8-mirror.ps1` usa esta revisión por defecto; `-Version refinement`/`candidate` conservan las anteriores. Sesión aislada actual: `http://127.0.0.1:57177/dm`; galería: `http://127.0.0.1:4598/gallery/`. La mesa habitual y la revisión abierta en 59822 siguen intactas.

78/78 regresiones, paquete Playground, tipos, compilaciones y prueba de red DM/dos jugadores/proyector correctos. 120 vistas y 16 perfiles sin errores. Sesión automatizada nueva de 20,15 minutos, catorce idas/vueltas y cero errores; memoria repetida 72,34–72,35 MiB. Tres regresos de limpieza estables: 553 mallas, 57 texturas, 69,94 MiB. Recorrido de 387 estados autoritativos hasta el perímetro, sin daño.

Carga limpia: 68,13–78,40 MiB estimados. El pico tras secuencia alcanza 137,65 MiB y el máximo es de 359 llamadas de dibujo: los guardarraíles transitorios/rendimiento siguen pendientes de validación y ajuste en el dispositivo objetivo. No se certifican FPS ni aceptación artística por capturas. [Informe, pruebas físicas pendientes y materiales](docs/evidence/D8_MIRROR_ARTPASS_20261020.md), [comparativas y vídeos](output/d8-mirror-artpass-20261019/index.html).

## Espejo D8 · correcciones de la revisión visual — 2026-10-19

Segunda candidata: pedestal duplicado eliminado, una galería interior profunda, paredes continuas de hielo de 26 m, bóvedas y estalactitas, vetas/normal de hielo y contacto irregular con el suelo. La oclusión usa triángulos y volumen corporal; conserva 32 % de visibilidad cuando hay un obstáculo real. Se retiran sombras de objetos sustituidos.

Por petición del usuario, el perímetro irregular añade 139 casillas: 399 transitables, 344 difíciles y los mismos 49 peligros. Origen e índices anteriores, espejo, llegadas y estadísticas preservados. Guardado/carga en casillas nuevas y migración del formato más antiguo comprobados. 78/78 pruebas en 15 archivos; integración de red, reconexión, guardados y autoload PASS. Compilaciones aisladas en `runtime/d8-mirror-refinement`; el lanzador `./scripts/review-d8-mirror.ps1` usa esta revisión por defecto y admite `-Version candidate` para la anterior.

[Informe de correcciones y aceptación pendiente](docs/evidence/D8_MIRROR_REFINEMENT_20261019.md). [Comparativas, recorridos y medidas](output/d8-mirror-refinement-20261019/index.html). La sesión de veinte minutos anterior es histórica; aprobación artística y dispositivos físicos siguen pendientes. La mesa habitual y sus guardados se conservan.

120 vistas finales y 16 casos de luz/pantalla sin errores. Carga limpia: 54,31–62,42 MiB estimados; pico tras animaciones/recorrido: 133,68 MiB, presupuesto transitorio pendiente. Tres idas/vueltas café–Espejo vuelven a 422 mallas, 46 texturas y 56,53 MiB estables.

## Espejo D8 · candidata HD-2D E0–E6 — 2026-10-19

Implementada la presentación exclusiva de `mirror`: envolvente estratificada y primer plano selectivo, materiales propios, espejo ornamentado local, luz interior y respuesta opcional de personajes, bruma/partículas por calidad, secuencia sincronizada con el servidor y mezcla temporal. Navegación, 260 casillas transitables, 205 difíciles, 49 peligrosas, estadísticas, interacción y reglas conservadas; dados y decisiones en mesa. Corregido en esta escena un shader exterior duplicado al asignar/reconectar personaje.

Candidata aislada en `runtime/d8-mirror-candidate`, sin tocar la distribución ni guardados reales. Abrir con `./scripts/review-d8-mirror.ps1` (añadir `-Build` para reconstruir). Base 44/44, regresiones 74/74, comprobación final dirigida 10/10; integración DM/dos jugadores/proyector, reconexión sin repetir aparición, restauración y autoload PASS. Matriz de 75 vistas y sesión registrada de 20,47 minutos; tres regresos con 45 texturas/58,56 MiB estables. El pico transitorio después de animaciones alcanza 111,49 MiB; no equivale a una prueba de FPS ni certifica el Pixel físico.

[Informe, límites y aceptación física/artística pendiente](docs/evidence/D8_MIRROR_CANDIDATE_20261019.md). [Evidencias y comparativa](output/d8-mirror-candidate-20261018/index.html). E6 técnica tiene candidata ejecutable; la aprobación artística, escucha real, proyector y sesión física continua siguen pendientes. No se ha publicado en GitHub. Cambios previos de cámara/Retiro y auditoría original preservados.

## Cámara compartida y frente del Retiro — 2026-10-17

El giro horizontal 0° del Retiro del Dragón queda centrado a 90° de Babylon: la cámara mira desde la playa hacia el acantilado. Los encuadres por zona y combate usan el mismo frente. La casilla «Compartir cámara con la mesa» publica además zoom y encuadre del DM al proyector; desmarcada, el proyector recupera su encuadre propio y el zoom personal del jugador permanece independiente. Pruebas dirigidas 24/24, humo de red D8/Stormwreck con reconexión y validación del encuadre PASS; typecheck y compilaciones cliente/servidor correctos. Mesa D8 local reiniciada; estado `ready`, página DM y recursos 200.

## Retiro del Dragón · Profundidad Escénica 2.5D y Composición de Cámara — 2026-10-17

Incorporado el sistema integral de siete capas visuales ([retreat-scenic-depth.ts](campaigns/stormwreck-isle/public/retreat-scenic-depth.ts)) y presets de encuadre inmersivo 2.5D ([retreat-camera-composition.ts](campaigns/stormwreck-isle/public/retreat-camera-composition.ts)). Capa 1 de primer plano con atenuación dinámica por proximidad; Capa 2 con máxima nitidez de zona jugable; Capa 3 con zócalos de basalto descendiendo hasta el fondo marino (-1 m a -5 m) y 10 arrecifes sumergidos que reflejan las caídas de 9 a 27 m; Capa 4 con cabos oriental y occidental y farallones; Capa 5 con 4 picos volcánicos distantes de la Isla de las Tempestades (300-500 m) con perspectiva aérea; Capa 6 con anillo de horizonte continuo 360° a 920 m de diámetro; Capa 7 con bruma marina cuadrática graduada y oscilación ambiental.
Encuadres optimizados para Playa, A1, A2, A3, A4 y A5 respetando 20°–40° vertical (con 15° interior), ±30° horizontal y combate automático a 40°. 4.828 posiciones verificadas contra sólidos del GLB con 0 colisiones en todas las fases. Pruebas dirigidas 9/9 PASS, typecheck cliente/servidor y compilaciones Vite y TypeScript completadas con éxito. [Documentación FASE_3A](prototypes/retreat-refinement/FASE_3A.md) y [FASE_3B](prototypes/retreat-refinement/FASE_3B.md).

## Controles de giro compactos — 2026-10-17

La consola DM muestra horizontal y vertical juntos en dos columnas iguales, con botones en ambos ejes y el ángulo entre ellos. Retirado el deslizador vertical; bajar/subir y F/R usan el mismo ajuste por pasos y desactivan el botón al alcanzar cada límite. Se conserva la publicación de giro e inclinación. Tipos y build cliente correctos; comprobados en una mesa aislada los clics, límites 15°/35° y disposición real de 410 px. Cliente publicado sin reiniciar la mesa; [captura](output/camera-buttons-20261017/camera-buttons.png).

## Inclinación compartida con el proyector — 2026-10-17

La casilla DM comparte ahora giro e inclinación, incluidos R/F, control vertical y presets de zona/combate. El proyector respeta el ángulo del DM mientras se comparte y lo recupera al reconectar; desactivar libera ambos ejes. 15 pruebas dirigidas, integración de cámara D8/Stormwreck, tipos y compilaciones correctos. Mesa D8 del puerto 3000 guardada, actualizada y reiniciada; estado recuperado en `ready`. [Detalle y límites](docs/evidence/SHARED_CAMERA_TILT_20261017.md).

## Retiro del Dragón · mejora integral en ocho fases — 2026-10-16

Ocho fases construidas y verificadas sobre la escena existente. Las 128 mallas originales de A1, sus seis celdas y todo el mobiliario conservan geometría y matrices exactas; escala 1,5 m, 850 posiciones, conexiones, puertas, PNJ y narrativa intactos. Interiores integrados, arquitectura revisada, continuidad rocosa, materiales PBR compartidos, jardines, sombras globales y costa mejorados. Perfil propio del Retiro 20°/30°/40°, combate inicial a 40° y gesto del jugador compatible; D8 mantiene sus valores anteriores.

65 pruebas dirigidas, 936 encuadres entre las ocho fases, 1.514 pasos del servidor, 4.828 posiciones contra el GLB final y dos recorridos en pantalla con 1.413 comprobaciones de apoyo/visibilidad, sin fallos. Clientes DM/jugador/proyector y 23 recursos HTTP comprobados. Medición Intel UHD: 23,4 FPS conjunto, 40,3 comedor, 33,9 templo; la vista general requiere más perfilado para buscar mayor frecuencia.

Fuentes y ocho comparativas en [informe de la mejora](prototypes/retreat-refinement/INFORME_FINAL.md). Visor compilado 4568 y mesa de revisión 4591 con guardados separados. La mesa habitual no se ha reiniciado. Pendientes: sesión física prolongada, destinos definitivos Pleamar/Observatorio y ampliaciones previas del palé/historial. Siguiente tarea: revisión artística y rendimiento en el equipo de juego.

## Retiro del Dragón · integración global A1–A5 — 2026-10-15

Fase 6 construida para revisión: escena `dragon-rest`, celdas reales de `camp-a1-rooms` conservadas, módulos Blender aprobados y conexiones a 9/15/18/27 m. Navegación de 1,5 m con 850 direcciones conectadas, puertas A2/A4 y pasos físicos para los pasillos estrechos. Se reservan los márgenes rocosos ante las fachadas de A1 sin mover sus habitaciones. 1.514 pasos del servidor, 46.490 muestras frente a cajas y 4.828 posiciones contrastadas con los triángulos sólidos del GLB, sin colisiones a cuatro alturas corporales. Recorrido final compilado: 1.424 comprobaciones de suelo, cero pérdidas de apoyo y cero oclusiones. Cuadrícula independiente, puntos de interacción discretos y decisiones/dados manuales. GLB completo y fuente Blender disponibles; mesa de prueba separada de los guardados habituales.

27/27 pruebas dirigidas; compilaciones cliente/servidor y visor comprobadas. La pasada general del historial mantiene dos expectativas fallidas de cantidad/rotación; la migración del Retiro conserva estados. Destinos Pleamar/Observatorio preparados a falta de mapas definitivos; animación de pasajeros del palé y prueba física prolongada en móvil/proyector pendientes. Revisar conceptualmente el conjunto antes de activar en la mesa habitual. [Informe y fuentes](prototypes/retreat-global/GLOBAL_REPORT.md).


## Frentes de Stormwreck, pecio y campamentos — 2026-10-14

Retiro del Dragón inicia mirando desde la playa hacia el camino y las puertas del monasterio, con el límite habitual de ±30° alrededor de ese frente. En el Pecio, al seguir o seleccionar un personaje dentro de C6/C7, el frente orbital gira suavemente al lado oeste donde están sus puertas; C4/C5 conservan el lado este. Las tiendas de la playa, observatorio, refugio y bosque orientan sus entradas hacia la cámara inicial de cada campamento, para que sean visibles dentro del arco limitado. Coordenadas de movimiento, terreno y objetos no cambian.

## Inclinación vertical 15° / 25° / 35° — 2026-10-14

D8 y Stormwreck comparten límites de 15°–35° y tres posiciones de inclinación (15°, 25°, 35°) para DM y jugador: R/F, deslizador DM y gesto vertical con dos dedos. El gesto acumula desplazamiento y la cámara interpola suavemente. Interiores automáticos a 15°, exteriores a 25°; combate conserva el encuadre elevado a 35°. Se mantiene el zoom del jugador al cruzar puertas.

## Zoom del jugador al cruzar interiores — 2026-10-14

La exploración del jugador conserva su escala ortográfica al entrar y salir de edificios en D8 y Stormwreck: el cambio de tamaño de zona y la inclinación automática ya no recalculan el zoom. La base se fija por escena; los límites de la nueva zona se aplican al ajuste manual sin saltar desde un zoom heredado fuera de rango. Se mantienen los presets verticales 20°/40° y el encuadre de combate y vista general.

## D8 · frente de puertas corregido — 2026-10-13

Las seis escenas centran el giro limitado mirando perpendicularmente a las fachadas, hacia +Z; corregidos el redondeo diagonal y el lado opuesto de Cena. Preferencias horizontales D8 separadas como `doors-v3`. 43 pruebas y seis vistas reales aprobadas; tipos y compilación PASS. Cliente actualizado en la mesa de puerto 3000, con páginas anteriores conservadas; recargar DM primero y luego jugador/proyector. [Registro y capturas](docs/evidence/D8_CAMERA_FRONT_20261013.md).

## Cámara limitada D8 y Stormwreck — 2026-10-13

Perfil ortográfico compartido de 20°–40° vertical y ±30° horizontal alrededor del frente propio de cada mapa. Q/E avanzan 15°, dos dedos ajustan giro/inclinación y la pinza controla un zoom limitado por escena, zona y pantalla. R/F también disponibles en DM. Entrar/salir de interiores aplica 20°/40° una vez y admite ajuste manual posterior. Combate aplica 40°, frente inicial y encuadre del encuentro; al terminar recupera las preferencias de exploración. Retirado el preset de 55° del Pecio y adaptado su recorte de paredes/techos a la vista baja, conservando ocultos los otros camarotes.

64 pruebas dirigidas aprobadas; tipos cliente/servidor/visor y compilaciones de cliente/servidor PASS. Visor real: 208 comprobaciones en los 13 mapas y 8 adicionales en C4–C7, sin fallos registrados; 38 capturas. La pasada general precede a los últimos ajustes de encuadre colectivo y recorte, comprobados después en interiores. Integración D8 con orientación compartida firmada/fraccionaria y persistencia PASS. No se ha repetido la suite completa ni probado móvil/proyector físicos; la mesa real conserva su servidor abierto. [Informe, registros y activación](docs/evidence/CAMERA_POLICY_20261013.md).

## Guardado, carga y actualizaciones seguras — 2026-10-13

Auditados Stormwreck/campamentos y D8. El cierre exige guardar antes de confirmar;
si falla conserva la mesa. Actualizaciones preparadas fuera de `dist`, originales
archivados al migrar, incompatibilidades futuras bloqueadas, historial protegido
de copias del reloj y aviso DM al recuperar un respaldo. Jugador/proyector
recargan tras reinicio; arte/audio revalidados. 48 pruebas dirigidas, seis pruebas
del lanzador e integraciones aisladas de Stormwreck y D8 superadas. También
corregido el cierre con descargas de arte/audio pendientes. No se interrumpió la
mesa real. [Evidencia, comprobaciones finales y límites](docs/evidence/SAVE_UPDATE_AUDIT_20261013.md).


## Cuadrícula táctica configurable — 2026-10-13

La línea inicial ahora es más tenue. DM y Jugador pueden elegir transparencia,
grosor y color fijo o contraste claro/oscuro por casilla; los mapas ilustrados
muestrean el suelo una sola vez por escena. Las preferencias se conservan en
cada dispositivo y son independientes por interfaz. No cambian movimiento,
colisiones ni estado de campaña. 21 pruebas dirigidas y typecheck de cliente
superados; build de 2.213 módulos y candidata aislada en el puerto 3002. Falta
validar en Pixel 9a, MSI y proyector físico. [Registro de aceptación](docs/evidence/GRID_SETTINGS_20261013.md).

## Campamentos · camino, reloj y clima V1.4.8 — 2026-10-12

Camino A1 prolongado con barreras, cuerda de seguridad y vegetación irregular.
Laterales de celdas conservados desde el frente; Astalagan esculpido con velas.
Clima y reloj en DM y móvil: oleaje separado de inundación, reglas consultables,
pausas y cambios de hora corregidos; selección de audio por nombres exactos.
132 pruebas dirigidas y 13 comprobaciones adicionales; recorrido conectado de
705 pasos y 120 interacciones. Candidata separada en 4494, galería en 4492.
[Registro y límites](docs/evidence/CAMPS_CLIMATE_20261012.md).

## Pecio · cofa y nido orgánico — 2026-10-12

Canasta tridimensional con ramas entrelazadas, fibras, lona desgarrada, huesos,
pelo y plumas. Tesoro canónico conservado por piezas; encuadre centrado y
barandilla separada del tejido. Se corrigió el descenso automático al pisar
P10: el jugador puede explorar toda la cofa y bajar mediante una acción.
62 pruebas superadas, 44 pasos conectados por las diez casillas, cinco piezas
recogidas y persistidas, 19 vistas reales sin errores. Cliente y servidor
compilados. No se reinició la mesa real ni se modificó el resto del barco.
[Registro y límites](docs/evidence/PECIO_NEST_20261012.md).

## Pecio · sombras, clima y detalle — candidata visual, 2026-10-12

Sombras compartidas con campamentos, reflejo planar real de objetos, algas y
restos de cubierta, mobiliario deteriorado y huesos con erosión/relieve. Nido
ampliado, mástil íntegro levemente inclinado y separado en tramos para evitar
su desaparición completa. Cámara interior gradual que supera techos vecinos
sin descubrir sus camarotes. Lluvia/humedad/nieve según clima autoritativo,
interiores protegidos y espuma/spray de contacto en la barca.

Subir a la cofa solicita Atletismo CD 10 al DM (adaptación opcional, sin dados,
caída ni daño automáticos); el descenso conserva su movimiento gradual libre.
Prueba conectada: **241 pasos**, dos jugadores y proyector, C1–C9, puertas,
natación/buceo, CD fallida/superada y persistencia. Una segunda prueba confirma
la acción contextual del jugador, descenso sin CD y guardado. No se reinició
la mesa real. M5 conserva aceptación artística y M7 dispositivos/audio físicos.
Suite de 633 pruebas superada y 22 regresiones dirigidas finales de cámara,
oclusiones/velas, protocolo y cofa. Visor: 112 capturas, 106 diagnósticos listos
sin errores, más reproducción visual del recorrido y escalada.
[Cambios, capturas y comprobaciones](docs/evidence/PECIO_ATMOSPHERE_20261012.md).

## Reloj global, iluminación y clima — candidata técnica, 2026-10-12

El servidor mantiene un reloj de campaña único, visible y sincronizado para DM,
jugadores y proyector. Exploración a escala real; combate detenido con seis
segundos al cerrar cada asalto; descansos y rutas avanzan el tiempo explícito.
El estado del reloj y el clima por escena se guarda y se recupera con la campaña.
El clima calcula nieve, espesor, deshielo, humedad, charcos, niebla e inundación;
la capa visual no cambia reglas por sí sola. El terreno nevado solo se considera
difícil si alcanza el umbral y el DM activa esa decisión.

Tipos, build de cliente/servidor y pruebas específicas pasan. En la suite global
concurrente hubo siete fallos en seis archivos: cinco límites de tiempo de
render y dos aserciones de arte ajenas al reloj. Los cinco renderes pasan con
un worker aislado. La integración aislada llega a la vuelta de C2
y queda pendiente por un timeout de movimiento. Móvil, MSI y proyector físicos
pendientes. La candidata está iniciada en el puerto 3001 con guardados de
prueba separados; la mesa del puerto 3000 conserva su proceso. Evidencia:
[reloj y clima](docs/evidence/GAME_CLOCK_CLIMATE_20261012.md).

## Cinco campamentos — correcciones V1.4.7, 2026-10-12

Muebles A1 redistribuidos, Astalagan hacia el mar con velas, continuidad del
acantilado y postes apoyados. Tiendas integradas con el suelo, cristales
texturizados con luz tenue, fauna con reloj de pose/movimiento y vida ambiental.
Sombras de contacto, de tiendas y proyección dinámica básica de personajes.
Prueba conectada: 680 pasos, 120 interacciones, tres jugadores y proyector.
Registro: [CAMPS_POLISH_20261011](docs/evidence/CAMPS_POLISH_20261011.md).
Capturas y compilación en `output/camps-polish-20261011`.

## Cinco campamentos — correcciones V1.4.6, 2026-10-11

Brasas en las cinco hogueras; luces apagadas de día, nieve acumulada,
humedad, lluvia que reduce/apaga el fuego y leña animada con la acción del
jugador. Recorte de árboles completos y estructuras de tiendas, entradas
orientadas hacia la hoguera, arroyo fuera de las tiendas, prolongado entre
la arboleda y con corriente. Sombras del sol/luna y de una fuente cálida
cercana, con caché y perfil compacto.

Comprobación conectada: 681 pasos y 120 interacciones, tres jugadores y
proyector; descanso, interrupciones, guardado y reconexión correctos.
Registro: [CAMPS_WEATHER_20261011](docs/evidence/CAMPS_WEATHER_20261011.md).
Evidencia nueva en `output/camps-weather-20261011`. La acumulación y calor
son ambientación local; el siguiente ensayo es con dispositivos físicos.

## Cinco campamentos — detalle V1.4.5, 2026-10-11

Pasada sobre A1, bosque, playa, observatorio y refugio: roca con relieve y
estratos, montaña A1 cerrada, recorte de sus particiones al ocupar una celda,
estanterías y muebles diferenciados, tejidos, herrajes y utensilios. Más
variedad vegetal y fondo arbolado, sendero/arroyo orgánicos, bote detallado,
espuma transparente, fuego de partículas, aurora plegada y pozas húmedas.
Cuadrícula con transparencia efectiva en campamentos. Luces limitadas a cada
interior; piezas de interacción y navegación autoritativa conservadas.

110 capturas antes, 120 después y 19 de perfiles de dispositivo; 90 muestras
exteriores listas. Bosque con unos 120.000 vértices frente a 199.000 anteriores.
Recorrido aislado: 705 pasos y 120 interacciones, DM, tres jugadores y proyector,
descanso e interrupciones, guardar/reconectar, sin beneficios automáticos.
Novedades V1.4.5 comprobadas al iniciar la interfaz compilada. La versión entra
con el inicio habitual; la mesa del puerto 3000 conserva su partida.

60/60 pruebas dirigidas únicas en nueve archivos, tipos y compilaciones PASS.
La ejecución conectada final comprueba también la descarga completa de 19
recursos. Interfaz real: zoom, WASD, actividad de hoguera y descanso en cinco
acciones del DM conservando PG. Queda la revisión física de móvil, proyector
y mezcla de audio. La prueba de puerta D8 V48 presenta una discrepancia
de estado inicial, documentada aparte del módulo. Evidencia y límites:
[Campamentos · detalle](docs/evidence/CAMPS_DETAIL_20261011.md).

## Rosa de los Vientos — detalle, natación y buceo, 2026-10-11

Corregidas las capturas: cuenco orgánico del nido, timón y soportes en C3,
cráneo/mandíbulas/costillas de dragón, triangulación de la brecha y revelado
interior, entrada P16 con descenso temporizado, cierre de márgenes C8/C9 y
fondos de escaleras. Muebles conservan contenido canónico y reciben acabado
de madera/telas. Llegada al mar desde el lado abierto, sin restringir giros
ni alterar cámara compartida. Guardados v5 reanclan solo el timón montado.
Mástil y jarcias se atenúan únicamente cuando ocultan la ficha, recuperando
su opacidad desde el lado libre; comprobado en la cofa sin cambiar colisiones.

Tabla de acabado aplicada al pecio: contacto/AO analítico y mapas estáticos
UV2, multiescala, manchas, color y filtrado. No son GI/SSAO ni luces nuevas.
**535/535 pruebas, 72 archivos**, tipos y compilaciones PASS; **239 pasos**,
dos jugadores, proyector, P16, cofa, puertas y guardar/restaurar PASS.
Navegador: **69 capturas estáticas, 61 diagnósticos sin errores ni recursos
pendientes** y recorrido real reproducido con 14 capturas de movimiento.

Mesa real intacta; inicio habitual recompila. Sigue abierta la aceptación
artística de M5 y el ensayo físico móvil/proyector/audio M7. No se afirma
perfección ni equivalencia con la ilustración de referencia. Evidencia:
[Detalle y buceo del pecio](docs/evidence/PECIO_DETAIL_20261010.md).

## Rosa de los Vientos — contraste canónico y ajuste integrado, 2026-10-10

PDF capítulo 3 y mapa 4 auditados antes de cambiar arquitectura. C4/C5 quedan
bajo C3 y C6/C7 bajo C2, con paredes dentro del casco y cubierta superior
oculta solo al entrar en su estancia. Perfil reducido a 63 × 21,1 m y escora
de 0,86° compartidos por geometría/navegación, sin cambiar el grid de 1,5 m.
Escaleras y eje C4/C8/C9 ajustados; guardados migran a versión 4 conservando
inventario, estados, secretos y botín. Cofa con nido completo; velas realmente
desgarradas, cabos caídos, deterioro localizado y apoyos de hueso/arrecife.
Agua C8 visible a 15–45 cm, C9 sumergida con burbujas/peces/cáusticas y sin
luz solar residual; antorchas apagadas, retrato C6 mirando al interior y
mezcla sonora local por planta sin alterar controles de audio del DM.

**528/528 pruebas, 71 archivos**, tipos y builds cliente/servidor PASS.
Prueba aislada de **224 pasos con dos jugadores y proyector**: C1–C9, puertas,
foco, privacidad, cofa y guardar/reiniciar. Navegador: 26 capturas estáticas,
19 diagnósticos sin errores y reproducción completa del recorrido observada.
Mesa real no reiniciada ni modificada. El inicio habitual compila al arrancar.

M5 sigue como candidata con aceptación artística abierta. La escala ampliada
y cofa centrada no son una reproducción literal del mapa/PDF; falta ensayo
prolongado móvil/proyector y escucha física del audio. Evidencia y límites:
[Contraste canónico del pecio](docs/evidence/PECIO_CANON_20261010.md).

## Pecio completo — reconstrucción visual 3D, 2026-10-09

C1–C9, cofa y entorno tienen una reconstrucción integrada por capas, dentro
del mismo barco lógico. Perfil naval compartido entre geometría y navegación,
casco curvo, niveles/escaleras físicos, daños asimétricos y arrecife de apoyo;
océano continuo animado, madera húmeda, techos cerrados por habitación,
mobiliario canónico a escala, interiores inundados y luz portada. P01/P10
escalan con trayectoria temporizada; no se duplican ni teletransportan fichas.

Cámara y recorte interiores retiran techo, pared/hoja delantera y aparejos
que obstruyen; el mobiliario delante del ocupante se atenúa sin cambiar
colisiones. Antorchas apagadas/recogibles y barca abierta opaca en el agua.
Guardados válidos se conservan; se recolocan solo las celdas ahora inválidas.

Prueba aislada: 202 pasos, dos jugadores y proyector, C1–C9, cuatro puertas,
visibilidad individual, cofa, foco y guardar/reiniciar. Navegador: 26 capturas,
19 diagnósticos sin errores. Suite general **521/521, 69 archivos** y tipos/build
superados. Evidencia y límites:
[Reconstrucción del pecio](docs/evidence/PECIO_EXTERIOR_REBUILD_20261008.md).
La aceptación artística y el rendimiento sostenido móvil/proyector siguen
abiertos; no se declara perfección ni paridad con la ilustración de referencia.
La mesa real no se ha reiniciado. `INICIAR.cmd` actualiza al próximo arranque.

## Biblioteca reutilizable de interacciones — 2026-10-08

Implementado registro por funciones de piezas reales, reloj común y articulación
procedural 2,5D. Conectados todos los puntos de los cinco campamentos: páginas y
libro, símbolo, ganzúas, mantas/almohadas/hamacas, solapas/ataduras, cuchara/olla,
leños/llamas, farol/cuerda, tela del asiento y tapa persistente del baúl. Sin
duplicar accesorios cuando hay piezas conectadas. Libro, símbolo y una ganzúa
se recogen y regresan; interrupción restaura el objeto y no repite la acción.

Puntos de uso junto al mobiliario: A1 deja de usar la entrada como contacto de
cama; exteriores separan lecho y puerta de tienda. Datos opcionales `activities`
permiten reutilizar con futuros personajes sin depender de sus IDs. No cambian
grid, colisiones, recursos ni beneficios de descanso. La mesa real sigue intacta.

Guía de conexión y límites: [Biblioteca](docs/REUSABLE_INTERACTION_ANIMATIONS.md).
Queda la aceptación artística de las manos/poses PNG y crear vistas dibujadas
que no existan en los originales; no se presenta esto como un rig 3D terminado.

## Requisito de cierre: animaciones emparejadas — 2026-10-08

El usuario exige que todas las acciones creadas animen tanto a cada personaje
participante como al objeto real con el que interactúa. Un botón funcional,
un VFX aislado o una inclinación de una pose estática no cierran ese trabajo.
Ambas animaciones deben compartir inicio, contacto, respuesta y finalización,
orientación respecto a la cámara, escala, oclusión y cancelación coherente.

Auditoría inicial (anterior a la biblioteca descrita arriba): existen gestos, poses reutilizadas y accesorios
procedurales, pero falta completar la respuesta de varios objetos reales.
En A1 el controlador visual todavía ignora el historial de interacciones.
El baúl exterior ya anima su tapa; esto no acredita todas las demás acciones.
Los efectos actuales de manta/libro/herramientas no sustituyen la animación
del mobiliario/equipo existente ni una secuencia de manos adecuada.
Cobertura y criterios pendientes:
[Informe](docs/evidence/ACTORS_CAMPS_AUDIT_20261007.md#requisito-de-animacion-emparejada--seguimiento-2026-10-08).

## Personajes y actividades de campamento — 2026-10-07

Stormwreck: escala física calibrada, pies según alfa visible, asientos en el
banco real, retratos PNJ reducidos y cámara inicial desde el lado abierto.
D8 y Stormwreck: filtrado de PNG, lienzo sin submuestreo y «Detalle/Conjunto».
Once actividades de ambiente con poses, gestos y accesorios animados,
proximidad/propiedad autoritativas, cancelación al moverse o combatir y
baúles persistentes aunque el historial se llene. Sin beneficios de descanso
ni consumos automáticos. Se preserva el trabajo paralelo de campamentos.

Verificación: **484/484 pruebas**, tipos y build; integración aislada de cinco
campamentos con DM, proyector y tres jugadores: **643 pasos, 116 interacciones**,
guardado y reconexión. La mesa del puerto 3000 no se ha reiniciado.
Stormwreck: 224 encuadres finales con todas las fichas y recursos listos.
Trece vistas iniciales completas verificadas entre ambas campañas. Pendiente:
repetir las métricas completas de D8 tras corregir la espera del visor de pruebas;
su repetición anterior quedó bloqueada. No afecta a las actividades verificadas.
Detalle y límites de los originales PNG/SVG:
[Informe](docs/evidence/ACTORS_CAMPS_AUDIT_20261007.md).

## Campamentos — acabado y jugabilidad V1.4.4, 2026-10-07

Las cinco escenas tienen ambientación propia, texturas, roca orgánica, vegetación,
tiendas cerradas con corte al entrar, equipo personal, baúles y asientos con pose.
A1 conserva sus seis celdas canónicas y sus luces limitadas a cada interior;
el bosque conserva los animales fuera del grid y anima la locomoción al aparecer.
Las novedades V1.4.4 se muestran al primer acceso del DM.

La última pasada añade desgaste de suelo, pozas orgánicas, estratos y grupos
vegetales variados, y permite al suelo táctico recibir las sombras del decorado.
Galería de 80 vistas exteriores y 18 interiores; interfaz de jugador comprobada
a 390 × 844 y 844 × 390. Capturas, métricas y límites detallados en el informe.

Verificación: **469/469 pruebas generales**, **15/15 específicas**, tipos y build
correctos. Integración aislada con DM, proyector y tres jugadores: **554 pasos,
38 interacciones**, colisiones, descanso, guardado y reconexión. La partida del
puerto 3000 y el mapa principal del Retiro se conservan. Visor y galería en 4482;
VTT de revisión en 4485. Informe: [Campamentos](docs/evidence/CAMPS_FINAL_20261007.md).
La medición en teléfono/proyector físicos y la aceptación artística/auditiva final
del usuario siguen siendo verificaciones propias de esos dispositivos.

## D8 — correcciones V49, 2026-10-06

Aplicadas las 22 correcciones: cabaña Fritz cerrada con vegetación exterior y puerta en el sendero; Café medieval completo, ventanas con huecos y cristal; cubierta del templo y casa de Cena accesible. Puertas jugables articuladas e interactivas, ocupación de PNJ y llegadas separadas. Cámara interior suave a 38° y regreso al encuadre exterior, paredes/muebles atenuados sin alterar colisiones. Agua ondulante, lluvia/nieve progresivas por intensidad y tiempo, farolas y luz solar por hora, niños junto a vaca con cuerda y reflejo centrado con aparición mágica.

Movimiento enlazado con búfer visual de 80 ms, tolerancia a pausas de entrada y deslizamiento por paredes; cachés de texturas/hoja/mochila, decorado agrupado, sombras y efectos de render acotados. Rueda con etiquetas completas, iconos y regreso cercano; paginación móvil corregida, cuatro categorías comprobadas a 390×844 y 844×390. Aviso de mapa en esquina, configurable 3–25 segundos.

Verificación: **397/397 pruebas**, 58 archivos; tipos, compilación y payload V49 PASS. Integración DM/dos jugadores/proyector y smoke de seis mapas PASS. Auditoría base de **192 vistas** sin errores, recursos pendientes ni variación de cámara; comprobaciones visuales adicionales después de los ajustes finales. V48 archivada, sin publicación GitHub ni partidas reales modificadas. El lanzador recompila al próximo arranque seguro. Detalles, capturas y límites de rendimiento/aceptación artística en el [informe V49](docs/evidence/D8_V49_REVIEW_20261006.md).

## D8 — correcciones V48, 2026-10-06

Puerta y paredes completas del café; patio ajustado; caminos con seis filas nuevas sin desplazar celdas antiguas; Cena con más patio y fachadas orientadas hacia él. Sentarse/levantarse es una acción real de jugador y DM, con poses propias, ocupación, guardado y salida al caminar o combatir. Respaldos y mesas se atenúan únicamente cuando obstruyen la visión; foco físico correcto al sentarse. Aislamiento alfa de Silverfarben y reloj monotónico para no rebobinar pasos por variaciones de latencia. Mercado con niños, vaca-sprite, cuerda y vendedor colocado en su puesto.

Clima completo en ambas consolas DM; Mesa / Clima / Sonido separados. Campos enviados independientemente para no perder cambios rápidos. Materiales exteriores mojados/nevados; precipitación excluida de interiores por cubiertas; cuatro fases de iluminación y faroles/ventanas exteriores apagados de día. Se mantiene la casilla de 1,5 m: el ajuste del café afecta al área transitable, no a su escala táctica.

Verificación final: **382/382** pruebas, tipos y builds separados PASS; integración D8 con sentarse por jugador y DM, clima compartido, espejo, desenlace, saves y reinicio; smoke de seis mapas/70 audios y regresiones de Stormwreck PASS. Pasada global de **192 vistas** y **32 adicionales del templo** con recursos listos y posiciones conservadas. Ambas pasadas registraron una pequeña variación de encuadre 0,05224 en una muestra: se conserva expresamente, sin darla por resuelta ni declarar falsamente estabilidad cero. Puerta, personaje cercano y cambios rápidos de clima de ambas consolas comprobados en navegador. Detalles y límites en el [informe V48](docs/evidence/D8_V48_REVIEW_20261006.md). No se publicaron cambios ni se tocaron las partidas reales. La aceptación artística, escucha final y prueba prolongada en el equipo de mesa siguen siendo comprobaciones humanas, no una garantía de «cero errores».

## Correcciones de mapas y clima D8 — 2026-10-05 · Playground V47

Corregidos alfa/colores, pies y profundidad nativa de fichas; continuidad durante cambio de textura de movimiento; vaca sólo como sprite; materiales continuos del exterior, abrevadero sin camino superpuesto, agua animada, estatua pétrea y luces reales. Anteros y aldeana usan poses sentadas existentes. Café/Fritz tienen cubierta; arquitectura que cruza la visión se atenúa sin alterar colisiones. Cámara D8 inicial 25°. Carteles legibles sin teletransporte y cinco pasos físicos de aproximación para viajar por los puertos existentes.

Espejo único 3D: desaparece al revelar su copia del jugador, preparada en una casilla libre no fatal antes de validar ocupación. Hielo blanco difícil; pisar azul aplica caída fatal persistente, inconsciente y fin de concentración tanto para jugador como para movimiento DM. Climatología compartida: cuatro fases del día, lluvia/nieve en tres niveles y viento, con audio existente, sincronización y saves completos.

Verificación: **371/371** pruebas, tipos/builds, integración D8 completa y smoke PASS; regresión de Stormwreck PASS. Navegador DM/jugador y móvil horizontal/vertical comprobados. Auditoría global de **192 vistas**, más **32 de Cena** tras cerrar ambos hastiales: cero errores, recursos listos, posiciones conservadas y variación de pose 0; evidencias en el [informe V47](docs/evidence/D8_MAP_CORRECTIONS_20261005.md). F1–F5 cerradas técnicamente. No confundir aceptación artística/escucha/hardware físico, aún pendientes, con cierre de pruebas técnicas. Sin GitHub ni saves reales modificados; el lanzador recompila en el próximo arranque seguro.

## Revisión integral final D8 — 2026-10-05

Se corrigieron el último impacto perdido al cerrar automáticamente combate, privacidad de acciones del DM y caída/desvanecimiento de criaturas ya derrotadas sin devolverlas al mundo lógico. La distribución recomendada prioriza tablero y consola contextual; QR, orientación y herramientas de prueba quedan plegables. DM, jugador y proyector muestran preparación del escenario y comparten recuperación de carga. La iniciativa deja de tapar el menú de hoja/mochila. Las ayudas de estados leen CD, rasgos y PG reales; el resumen de salto deja de estrechar la hoja móvil. Cargar conserva propietarios conectados y el mensaje de confirmación ya no promete una elección de personaje innecesaria.

Verificación: **360/360 pruebas, cero fallos**, tipos cliente/servidor y builds PASS. Integración D8 real (DM/dos jugadores/proyector, recorrido, dados, restore, diez saves y autocarga), smoke de seis mapas/70 audios e integración Stormwreck contra el servidor recién compilado PASS. En navegador se completó arco → objetivo → d20 → daño y se restauró un archivo real con escena/PG/estado/ronda/iniciativa/acción usados. Proyector sin grid, reconexión a María y vistas efectivas 390×844 / 844×390 comprobadas.

Este cierre acredita el **MVP con arbitraje DM**, no automatización universal de D&D 2024 ni ausencia de todo error posible. Continúan pendientes aceptación artística/escucha del usuario y hardware físico; preparados/conversión de fichas requieren elección, y Light/offhand/Nick/maestrías y ciertos efectos situacionales siguen guiados. No se alteraron partidas reales ni se subió a GitHub. El lanzador recompila al próximo arranque seguro. Informe, archivos y capturas: [auditoría final](docs/evidence/D8_FINAL_AUDIT_20261005.md).

## Integración medieval y pies de fichas D8 — 2026-10-05

Los caminos de Templo, Café y Mercado sustituyen las bandas rectangulares por adoquines individuales irregulares agrupados en mallas, con tonos ajustados al suelo de cada escenario. El acceso exterior del Templo tiene una silueta de terreno irregular y comparte material con la costa. El barrio reutiliza fachadas entramadas, puertas de madera con hierro, carteles colgantes y faroles medievales; el patio exterior del Café comparte el tono del pavimento próximo.

Corregido el anclaje de las fichas nativas D8: el pivote de ordenación del mapa plano enterraba parte de los pies en el suelo 3D. El render D8 usa el borde inferior del sprite como apoyo. La cuadrícula comparte el búfer de profundidad del escenario y conserva las casillas transitables y alturas autoritativas, evitando dibujarse encima de muebles o personajes. La oclusión física de columnas, paredes y puestos se mantiene.

Verificación: revisión visual de caminos y fichas en Templo, Café y Mercado, más capturas de Jardín, Espejo y Cena; auditoría de los seis mapas en 8 orientaciones × 3 inclinaciones, **144 vistas, 0 errores**, sin recursos pendientes, posiciones conservadas y variación de pose asentada 0. Pruebas focalizadas **49/49**, tipos cliente, build de producción y smoke del one-shot PASS. Informe y capturas en `output/camera-2-5d/backdrop-v43/` (carpeta histórica del visor). Estas comprobaciones no certifican todas las posiciones posibles ni el rendimiento en móvil/proyector físicos; queda la pasada manual del usuario.

## Caminos y barrio continuo D8 — 2026-10-05 · Playground V46

El Templo ya no termina en una costura rectangular: el césped del terreno Babylon continúa hasta la costa y el límite jugable queda señalado por un seto sobre zócalo de piedra, abierto en el acceso. Dos ramales se dirigen hacia Café y Mercado. Café y Mercado comparten materiales de fachadas, árboles, faroles, puestos y pavimento; desde cada tablero se insinúa el otro barrio. Cena queda encuadrada como patio de finca, con jardín, setos, casas y camino exterior. Los fondos son mallas en el mundo y giran con la cámara; no son fotografías del mapa ni amplían el grid transitable.

Los tres caminos Templo↔Café, Templo↔Mercado y Café↔Mercado usan los puertos existentes del motor, con nuevo modo genérico `road`: pisar la casilla de salida fuera de combate cambia de escena, conserva la posición individual y provoca autoguardado. El DM/proyector sigue al viajero; los demás personajes permanecen donde estaban. Las casillas de ambos extremos se comprueban como transitables. La ruta de Cena es decorativa por ahora: no se ha inventado una transición narrativa para el desenlace.

Revisión manual en navegador de Templo, Café, Mercado y Cena con la cámara inicial. Auditoría automática de 8 giros × 3 inclinaciones en cada uno: **96 vistas, 0 errores**, texturas preparadas y posiciones estables. Pruebas focalizadas de navegación, guardado, cámara y carga de escena: **34/34**; compilación cliente/servidor y smoke del one-shot PASS. Pendientes: aceptación artística del usuario y rendimiento en móvil/proyector físicos. No se añadieron activos descargados.

## Fondos y horizontes D8 — 2026-10-05 · Playground V45

Los seis biomas conservan escenario Babylon 2.5D nativo; el exterior se prolonga con materiales procedurales y geometría mundial no interactiva, no con una captura prerenderizada. La inspección por capas confirmó que el azul/negro previo lo producían los materiales exteriores demasiado oscuros en Babylon, no una capa Pixi. El Templo tiene mar texturizado y costa irregular con vegetación consistente con los árboles de la escena; Jardín, Café, Mercado y Cena conservan sus ambientes de nieve, aldea, plaza nocturna y finca. Café y Mercado reciben pavimento de transición para evitar el corte rectangular al vacío. En el Espejo se quitó una bóveda opaca que tapaba el tablero y se rodeó la arena con suelo y relieve de caverna. Las mallas de entorno no son seleccionables ni añaden colisiones/cuadrícula.

Comprobación visual manual en navegador de los seis mapas D8, Templo girado y probado a 35°/45°/50°, Espejo y plaza revisados a resolución de escritorio; cambiar D8 → Stormwreck → D8 deja los perfiles aislados. Cuadrícula limitada al tablero jugable. Tipos cliente, build de producción y 11/11 pruebas focalizadas de cámara/carga de escenas PASS. La auditoría global automática de todos los ángulos no se repitió porque se bloqueó antes; tampoco se han medido FPS ni probado proyector/móvil físicos. Cena recibió sólo integración ambiental común, no una nueva composición artística. No se descargaron assets.

## Cámara táctil del jugador — 2026-10-05

La pantalla del jugador utiliza el perfil compartido de cámara 2.5D, con inclinación inicial de 45° y límites de 35°–50°. Deslizar dos dedos hacia arriba eleva la vista; hacia abajo la baja. El desplazamiento horizontal conserva el giro de 45° y la pinza controla el zoom; Q/E siguen funcionando sin etiquetas en el mapa. Se suaviza el inicio del gesto y se procesan ambos contactos en el mismo cuadro para distinguir el deslizamiento de la pinza. Cambiar de mapa, ocultar la página o perder el foco cancela los contactos pendientes.

Verificación focalizada: **19/19** pruebas aprobadas, tipos cliente y compilación de producción PASS. Incluye reconocimiento, límites, inversión del gesto y movimientos pequeños; no se ha repetido la auditoría completa anterior ni probado el gesto en un móvil físico. Evidencia en el [informe de cámara](docs/evidence/CAMERA_2_5D_20261004.md).

## Cámara 2.5D compartida — 2026-10-04 · D8 V42

Los 13 mapas jugables Babylon de D8, Retiro, Pecio y campamentos usan cámara ortográfica 3/4, inclinación inicial 45° y límite 35°–50°. Ocho orientaciones con transición amortiguada; zoom máximo 24; foco correcto en ficha local/selección DM; modos fija, semifija y seguimiento conservados. WASD y joystick consumen el ángulo visible, incluido el giro en curso, y el teclado del DM utiliza la misma conversión de cuadrícula.

Personajes animados integrados en la profundidad del escenario, conservando sus ilustraciones y atlas. Corregidos materiales compartidos del Retiro, transparencia SVG, sombras de contacto y altura de los patios circulares del Templo D8. Cámara, fichas y Babylon se actualizan en un único reloj. Fuentes y Playground V42 validados; V41 archivada.

Verificación: tipos cliente/servidor/banco visual y build de producción PASS; pruebas focalizadas **62/62**; suite completa **337/338**, con el mismo fallo previo de resolución/publicación de combate en `engine/server/game.test.ts`. Foco y modos: **38/38** comprobaciones en Templo/Retiro, incluido el zoom local de cada personaje en los tres modos. Las 312 vistas de los 13 escenarios completan sin errores registrados, con posiciones conservadas y variación de pose asentada 0; resultados y capturas en [informe de cámara](docs/evidence/CAMERA_2_5D_20261004.md). La aplicación real de D8 confirmó cambio de mapa y giro compartido entre DM, jugador y proyector en una instancia aislada; la compilación final confirmó giro con E, zoom centrado y ausencia de la flecha del prototipo. La medición de estabilidad de pose no certifica FPS ni hardware físico; el gesto multitáctil se conserva, con prueba física pendiente. Los fondos narrativos/de práctica planos heredados no se presentan como geometría 3D convertida.

## Optimización de mapas D8 lentos — 2026-10-04

Las escenas **Temple** y **Mirror** aplican menos muestras de oclusión ambiental y una escala de render ajustada sólo para esos mapas; el resto de D8 mantiene su calidad habitual. Las comprobaciones de visibilidad de fichas ya consultan un índice espacial de la escenografía estática, siguen comprobando por separado los elementos móviles y conservan la máscara de Pixi mientras no cambie qué partes de la ficha quedan tapadas.

Verificación: build de producción Vite PASS (2.130 módulos); pruebas focalizadas PASS (**15/15 en 3 archivos**), incluidas geometría estática/móvil, máscara de oclusión y cámara D8; tipos de servidor PASS. La suite completa queda **331/332** por un fallo reproducible en `engine/server/game.test.ts` (resultado de combate), no relacionado con el render. El typecheck cliente conserva un diagnóstico en `apps/web/world.ts:1285` (`Camera.alpha`), en el cálculo de orientación anterior a este ajuste. No se midieron FPS con el MSI, un navegador físico ni el proyector; la fluidez real de Temple y Mirror sigue pendiente de esa comprobación.

## Verificación vigente — 2026-10-04 · D8 Babylon V41, navegación/oclusión/audio

Corregida la correspondencia de los seis mapas con casillas reales de 1,5 m: obstáculos del escenario, taberna efectiva, paredes finas, accesos y desniveles del templo. Grid, pies de fichas y selección consumen el terreno autoritativo; las zonas de aparición comparten una componente accesible. Los guardados D8 anteriores se migran una sola vez, conservando coordenadas legales y recursos. No se cambió el arte de Cena.

El inventario ya asigna el atlas de botín M5 sólo en Stormwreck. D8 deja de solicitar un recurso que su servidor de campaña no sirve, y el build Vite termina sin ese aviso.

La oclusión parcial utiliza el cuerpo de la ficha orientado a cámara y su pivote real, también al cambiar a pose tumbada. Corregidas repeticiones finitas de audio y conexión tardía; la selección de personaje se transmite inmediatamente a DM/proyector. Suite completa: **319/319 pruebas, 37 archivos**, tipos cliente/servidor PASS. Evidencia, integraciones y límites en [informe espacial/audio](docs/evidence/D8_SPATIAL_AUDIO_20261004.md). La herramienta de control del navegador interrumpió la revisión visual; no se afirma inspección final de los seis mapas, escucha de audio ni rendimiento físico. El lanzador recompila al próximo arranque seguro, sin cerrar la mesa real del usuario.

## Estado vigente — 2026-10-04 · D8, candidata jugable de principio a fin

Se conserva servidor autoritativo, persistencia y Babylon V40 existente. D8 ya registra cuatro componentes/resultados, inventario de misión derivado, notas y tres finales con empate/excepciones motivadas. Los primeros tres lugares pueden resolverse en cualquier orden, espejo al final. Se amplían encuentros hasta seis rosas/diez parroquianos sin curar al revelar; Reflejo genérico usa la forma del PJ ya en exploración, datos/estados propios e imitación tras original. Paredes bloquean ataques e hielo difícil consume doble movimiento.

Corregidos botones del arco tapados por la barra inferior, selección accesible de objetivo desde iniciativa, borradores DM y CA enemiga privada. Cargar conserva propietarios conectados y entrega snapshots completos a DM/dos PJ/proyector sin recargar. Se validan nuevas referencias antes de instalar saves y conservan diez puntos. Prueba real: arco→d20→crítico→daño15 aplicado una vez; red: seis escenas, cuatro componentes, final, restauración exacta, diez saves y reinicio/autocarga.

Guía DM/matriz/roadmap actualizados. Fases MVP técnicas acreditadas; no se afirma D&D2024 completo ni hardware físico/versión1. Preparados de Aoife, casos creativos, hielo frágil/bucle y vuelo se arbitran según guía; placeholder/animaciones específicas pendientes. Sin nuevos paquetes, assets externos, arte de Cena ni alteración de saves reales. Ver [informe](docs/evidence/D8_CLOSEOUT_20261004.md). Compilación en salidas aisladas: el lanzador recompila al próximo arranque seguro.

## Estado vigente — 2026-10-03 · D8 Night V35 integrado como candidata funcional

Por petición del usuario, D8 Night ya no se queda en el Playground: las seis escenas (`temple`, `garden`, `cafe`, `market`, `mirror`, `dinner`) se muestran en la mesa VTT con el render Babylon 2.5D V34 compartido como V35. La cuadrícula, las casillas transitables, los actores y objetos continúan definidos por el paquete de campaña y el servidor; la vista proyecta fichas y selección sobre el terreno. La cámara mantiene el encuadre oblicuo inicial de cada mapa y ahora ofrece giros discretos de 45°, inclinación acotada y zoom, como Stormwreck. El DM puede compartir el giro con jugadores y proyector; las preferencias locales se conservan por campaña y mapa. Los guardados D8 previos migran una vez a la nueva cuadrícula y reciben una marca de versión.

La ruta HTTP de configuración sólo publica geometría/ambiente visual saneados; `CANON`, interacciones narrativas y encuentros ocultos permanecen en el servidor. Candidata de aplicación `0.3.2-dev.7`, paquete D8 `0.3.0-dev.2`, fuente visual Playground `V35`. Este paso integra el render existente: **no crea aún texturas/escenarios nuevos ni cierra F3–F7**. Quedan para ciclos posteriores la revisión de arquitectura reutilizable y el trabajo artístico de escenarios, texturas, iluminación y VFX que ha pedido el usuario.

Verificación de `0.3.2-dev.7`: TypeScript cliente/servidor PASS; suite Vitest **214/214** PASS; build de cliente y servidor PASS; smoke aislado de D8 PASS con seis mapas, fichas, configuración sin secretos, recursos de audio, guardado privado y sincronización de giro DM→proyector; artefacto Playground V35 validado. No se ha inspeccionado esta candidata en navegador físico, Pixel 9a, MSI o proyector: confirmar inclinación y perspectiva, alineación del grid, movimiento táctil/teclado y transición de cámara entre las seis escenas con el usuario antes de aceptar visualmente. El render emplea texturas generadas por el motor existente y conserva el aviso de build del atlas M5 del Pecio, resuelta por el servidor en runtime.

## Campamentos V1.4.2 — actualización visual A1, 2026-09-27

`camp-a1-rooms` se ajusta a la planta canónica irregular: seis celdas abiertas a una plaza común, con estatua de Astalagan y hoguera. Las fachadas de piedra se ocultan al entrar en una habitación para conservar la lectura y el movimiento. La dirección añade materiales ilustrados, vegetación y detalles de fuego/ambiente; la cuadrícula, rutas, interacciones y decisiones del DM siguen separadas del arte. Verificación de esta candidata: suite completa **190/190**, typecheck cliente/servidor y build Vite aislado PASS. Aún falta la revisión del usuario en navegador/móvil/proyector físicos. La procedencia de las tres texturas originales del bosque continúa pendiente, como indica `LICENSES_AND_CREDITS.md`.

## Candidata visual de campamentos — 2026-09-26

El árbol de trabajo incorpora mejoras visuales de A1 y un primer pase del camino del bosque hacia Pleamar: materiales ilustrados para musgo, sendero y arroyo, además de vegetación y detalles de terreno. La cuadrícula, navegación y colisiones existentes se mantienen como contrato. Comprobación de esta candidata: typecheck de cliente/servidor PASS, 16 pruebas automatizadas de cámara/campamentos PASS y build aislado del cliente PASS. La aceptación visual del usuario y la revisión en móvil/proyector físicos siguen pendientes. Las tres texturas del bosque no tienen todavía una ficha de procedencia/licencia en el repositorio; consultar `LICENSES_AND_CREDITS.md`.

## Retiro del Dragón — integración 2026-09-24; repaso 2026-09-25

Escena inicial Babylon `dragon-rest` integrada desde Retiro V5.2 para *Los Dragones de la Isla de las Tempestades*. La aventura oficial se contrastó en A1–A5 (PDF, pp. 7–13). Hay superficies, colisiones, accesos, escaleras, seis celdas, puerta de A4, interacción manual de PNJ/objetos, zombis revelables por el DM y salida en barca al pecio; las salidas a Pleamar y al Observatorio están preparadas. Repaso 25/09: la guía privada del DM ya incluye el gancho del naufragio y aclara que pueden ir antes a Pleamar. La suite total actual (154/154) incluye la regresión de esta escena; los tipos de cliente/servidor y builds aislados pasan; no se ha certificado fluidez en dispositivo físico ni FPS. El timeout Vitest se amplió a 30 s porque las rutas integrales superan a veces el valor predeterminado de 5 s en Windows. El entorno actual usa Node 24.19 aunque `package.json` pide >=24.21; las verificaciones pasaron con aviso de motor. Véase [informe privado](campaigns/stormwreck-isle/private/RETREAT_INTEGRATION_20260924.md) y [roadmap](ROADMAP_V1.md).

## Estado vigente — 2026-09-25 · revisión 47 · M5: candidata técnica

El pecio continúa siendo un único escenario Babylon `wreck-ship`. M5 integra mar navegable y fondo escénico separado, espuma/oleaje, agua interior, cubierta/casco/arrecife texturizados, props con estados e iconos de botín, viento/lluvia/niebla/luces. La revisión 47 añade `deck-planks-art06.png`, cuadrícula de cubierta atenuada, rejillas/cabos decorativos y mantas en camarotes. La barca admite piloto y pasajeros, navegación casilla a casilla en mar, desembarco, persistencia y relevo de piloto. La candidata fue inspeccionada en navegador aislado; **no se afirma equivalencia con la referencia pictórica ni aprobación visual**. Falta opinión del usuario sobre arte; la prueba física y FPS pertenecen a M7. Ver [roadmap vigente](ROADMAP_V1.md) e [informe M5](campaigns/stormwreck-isle/private/m5/M5_ART_LAYER_IMPLEMENTATION_20260925.md).

## Corrección de inicio, PID reciclado y catálogo de mapas — 2026-09-26

La candidata de aplicación pasa a `0.3.2-dev.5`. `INICIAR.cmd` comprueba el puerto antes de compilar, para no interrumpir una mesa que ya está sirviendo sus archivos; una vez libre, recompila Vite y el servidor antes de iniciar. Los nuevos bloqueos guardan la hora de inicio del proceso y, para los anteriores, Windows la compara con la fecha del bloqueo: un PID reciclado se archiva en `recovery` sin tocar al proceso que ahora lo usa. La opción R se limita a la campaña elegida, cierra su mesa con solicitud autenticada incluso si escucha en otro puerto, y preserva programas ajenos. `/api/campaign` del DM en una instancia nueva devuelve el pecio y los cinco campamentos. Vitest 186/186, tipos, builds, cierre en puerto alternativo y arranque con lock legado pasan en pruebas aisladas. No se ha iniciado una mesa real del usuario ni probado hardware físico; falta confirmar el arranque con su acceso directo.

## Registro histórico — 2026-09-25 · revisión 36 · M5: mar y cobertura de assets

### Corrección vigente r35

El viaje deja a cada personaje sobre la barca (`sea`, 24,15), a una casilla de P01; desde allí sube caminando a C1. La ruta alternativa nada por el carril exterior (filas 15–16) hasta P16/C9 y vuelve por el mismo hueco, sin engancharse en P01. Una integración real con dos clientes verifica que Mia regresa individualmente al Retiro con confirmación del DM mientras Mike se queda en C3 y el foco no cambia. Suite 154/154 e integración compilada PASS; typecheck de servidor PASS; build/typecheck aislados cliente/servidor PASS en esta candidata. El servidor local r35 está en `http://127.0.0.1:4399`, ligado a loopback y con datos desechables separados. Recuperación: base r32 + delta r34 + delta r35, en ese orden.

### Alcance visual vigente r36

El usuario pide completar el mar y crear los assets finales de **todos** los objetos interactuables/recogibles y de toda la decoración de C1–C9, cofa y exterior. La textura repetible de agua actual es provisional, no el mar ilustrado de las referencias. Puertas/cajas genéricas, mobiliario y utilería `blockout` tampoco cuentan como assets finales. El inventario por zona, estados y criterios está en [plan de cobertura M5](campaigns/stormwreck-isle/private/m5/M5_ASSET_COVERAGE_PLAN_20260925.md). Mantener secretos fuera del arte base y no tocar la geometría navegable.

La decisión del usuario es vinculante: C1–C9 y la cofa son **un solo mapa lógico `wreck-ship`**, con superficies/niveles conectados; no son pantallas ni mapas separados. C1 y C4–C7 comparten `main`; C2, C3, C8, C9, `crow` (cofa) y `sea` son superficies del mismo terreno Babylon 44×20 a 1,5 m/casilla. El capítulo 3 (PDF pp. 22–27; mapa 4 en p. 25) se auditó para todo el ciclo desde el viaje en barca y los dos abordajes hasta la salida/desenlace. Ver [auditoría M4](campaigns/stormwreck-isle/private/M4_ARRIVAL_AND_DEPARTURE_AUDIT_20260925.md), [roadmap vigente](ROADMAP_V1.md), [estándar visual](docs/PECIO_VISUAL_STANDARD_20260922.md) y [gate de C1–C9](campaigns/stormwreck-isle/private/C1_GREYBOX_GATE.md).

M4 registra las rutas de barca/jarcia y brecha submarina, la regla del timón y C4, el estado de C5/C6, encuentros y d6 único de C8, tesoro/paquete secreto de C9, vuelta de la arpía y cierres de la maldición sin automatizar tiradas. Esta auditoría añadió los hallazgos individuales de C4 y la cofa, los ocultó correctamente tras la puerta/superficie y corrigió la condición del sueño del clérigo para la ruta de destrucción a bordo. Al generar la candidata M7 se detectó una referencia a helper de animación fuera de su clase; ahora es compartido por el estado y servidor, y hay prueba de regresión. El panel privado del Retiro ofrece el gancho Runara/Varnoth/Rix y deja a elección el orden Pecio/Pleamar; el panel del Pecio explica ambos abordajes. La prueba de sockets con dos jugadores recorrió llegada, abordaje P01, separación de superficies, C2/C8 y C3/timón; integración de objetos y guardado/restauración también se comprobaron en instancias temporales. El helper de prueba se corrigió para enviar keyup después de una pulsación de una casilla; no era una reproducción fiel dejar la dirección mantenida.

El resultado sigue siendo un **greybox con materiales candidatos M5**, no el acabado HD-2D/2.5D final. En un cliente real de jugador con datos aislados se corrigió el desvío diagonal de la cofa. W subió a ella, rodeó el mástil, S volvió a C1 y tras girar 45° W siguió la cámara. En una segunda comprobación D avanzó de `24,6` a `25,7` y A regresó a `24,6`, manteniendo la escena `wreck-ship`; el DM sólo observó. La simulación del servidor es 30 Hz, los snapshots 20 Hz y cada casilla tiene paso de 220 ms. Esto valida el rumbo y el retorno de una casilla, no mide latencia/FPS ni sustituye la sensación subjetiva del usuario en su teclado/móvil.

La primera capa artística M5 carga `deck-planks-art01.png` en cubierta y casco; se conservan agua/oleaje, viento marino y luces localizadas C8/C9; las cuatro antorchas siguen apagadas. La retícula del barco mezcla alpha real (`#88968b`, 0,66); geometría, selección, alturas y colisiones permanecen independientes. Sigue siendo un greybox en fase de arte, no el acabado de las referencias: M5 espera revisión visual del usuario y faltan paredes/props modulares. Suite **154/154**, integración ampliada con dos jugadores y tipos/builds aislados PASS; no se midió FPS sostenido ni se probó hardware físico. La candidata r35 se reconstruye desde base M6 r32 aplicando r34 y r35; los overlays excluyen guardados, QA saves, dependencias, `dist` y fuentes originales. Ver [gate C1–C9](campaigns/stormwreck-isle/private/C1_GREYBOX_GATE.md), [worklog M5](campaigns/stormwreck-isle/private/m5/ART_WORKLOG_20260925.md), [guion físico](campaigns/stormwreck-isle/private/m5/M6_M7_PHYSICAL_PLAYTEST_20260925.md) y [roadmap vigente](ROADMAP_V1.md).

## Histórico — prioridad del 2026-09-22, sustituida por el trabajo C1–C7 del 23/09

M1+M2 forman la candidata técnica `0.3.2-dev.1`; `0.3.2-dev.2` inicia su corrección visual: recorrido A–D con mapa táctico visible y estados locales para puerta/listón C4, tablón/trampa C6, tres contenedores C8 y cofre/paquete C9. Es ejecutable y compatible con guardados 0.3.1, **no una aceptación física ni el capítulo completo**. Orden único en [ROADMAP_V1.md](ROADMAP_V1.md).

- Versión de trabajo `0.3.2-dev.2`; última aceptada Alpha0.2 RC2. La malla Babylon A–D demostró geometría, pero ocultaba sus capas de mapa y se veía como plataforma vacía. A–D vuelven a la composición Pixi mientras se preparan fondos HD-2D compatibles; la geometría/puertos/estados se conservan.
- Reutilizar LAN/controles/objetos/guardado/combate/audio y originales locales:40PNG zombi y57arpía. La fuente viva de Drive aporta además43PNG de Zombie1,2 de Arpía1,62 de Arpía3,23 del gul y8 recursos de entorno del pecio utilizables por nombre; todos requieren descarga, inspección visual e integración antes de darse por terminados. Animaciones Stormwreck vacías pese a soporte del motor. F0/F1/F2 D8 cerradas según evidencia19/09; F3–F7 no certificadas, conservadas fuera del camino crítico del pecio.
- Babylon9.26 queda preparado para A–D, pero no se vuelve a presentar allí hasta alinear arte, cámara, fichas y grid. Pixi muestra de nuevo las capas tácticas completas durante esa corrección. C8 declara agua/terreno difícil y C9 oscuridad0,9/revelado por autorización.
- Cuatro mapas alineados: A superiores/exterior C2/C3/cofa; B principal C1+C4–C7; C inferior C8; D bodega C9. C4–C7 no son piso separado de C1. Un plano/estado único, conexiones dirigidas.
- Evidencia21/09: **85/85tests (7 archivos), typecheck cliente/servidor PASS,84 rutas de arte/audio presentes (46audio)**. No nuevo build ni pruebas físicas; no acredita mapas inexistentes.
- **M1a COMPLETADO como fuente, 22/09:** se conserva íntegro en `private/m1a/`; referencias Drive siguen `STUDY`, no copiadas.
- **M1b COMPLETADO técnicamente, 22/09:** protocolo18; escena única autorizada, ubicación individual, foco separado, P01–P16 y persistencia compatible. Evidencia:89/89, tipos/build y navegador local.
- **M2 COMPLETADO técnicamente, 22/09:** protocolo19 y ADR-026. `P06` exige retirar listón y abrir puerta; C6 conserva revelado/trampa gastada/rearme/propietario; C8 aporta tres contenedores con IDs propios; C9 distingue cofre sumergido/superficie, contexto de apertura y propietario de paquete. SaveV1 añade estado opcional y migra guardados0.3.1 añadiendo sólo objetos M2 ausentes. 93/93 pruebas, typecheck, integraciones general/objetos/save y build completo de producción PASS. La QA de navegador demostró estados y Babylon, pero el usuario identificó con razón una regresión visual: faltaba el mapa y la cámara no seguía el estándar HD-2D aportado. [Estándar visual](docs/PECIO_VISUAL_STANDARD_20260922.md) registrado; **siguiente prioridad: Sol High, M2.5 recuperación visual**, antes de M3a.

Copia recuperable M2: `backups/pecio-m2-0.3.2-dev1-20260922.zip`, 574 680 305 bytes, 854 entradas comprobadas, SHA-256 `A1547C835013350FF8A689CD6D83773FC228F371DB04FAB434148CFFA68E1F2B`. Incluye código, build, campañas y documentación; excluye guardados reales, temporales, dependencias y copias anteriores. Contiene fuentes privadas del pecio y no debe publicarse.

Copia recuperable de la corrección visual inicial: `backups/pecio-m25-0.3.2-dev2-20260922.zip`, 574 683 492 bytes, 855 entradas comprobadas, SHA-256 `B8E6129D78322E4157BBA3920040D0216F8C66949430A65776D3EFF9404CF96B`. Conserva el mapa táctico visible en A–D, pero no sustituye la futura entrega de fondos HD-2D; contiene material privado y no debe publicarse.

Detalle privado: [auditoría](campaigns/stormwreck-isle/private/PECIO_AUDIT_20260921.md) y [plan espacial A–H/conectividad](campaigns/stormwreck-isle/private/PECIO_SPATIAL_PLAN.md), fuera de HTTP. Lo inferior conserva evidencia histórica, no sustituye esta prioridad ni recuentos.

## Histórico — prioridad del 2026-09-18, sustituida

El usuario encarga a Astra auditar D8 Night y preparar la implementación por fases para Sol, reutilizable en Stormwreck. Ver [auditoría del18/09](docs/D8_NIGHT_AUDIT_20260918.md) y [ruta de Sol F0–F7](docs/D8_NIGHT_SOL_ROADMAP.md). Es el orden de trabajo inmediato; el estado histórico inferior no acredita que esos hallazgos estén corregidos.

Comprobado en esta auditoría:50/50tests y tipos cliente/servidor pasan;12diagnósticos adicionales reproducen fallos de combate/estado. Roster actual D8: María y Aoife, no tres PJ provisionales. Babylon está instalado pero la escena jugable sigue con Pixi. No se modificó producción ni los guardados; aceptación de navegador/móvil y correcciones quedan para Sol. No hay nueva RC aceptada.

Actualizado: 2026-09-16. La carpeta de trabajo contiene **Alpha 0.3.0 DEV1**, todavía sin RC ni aceptación física. Alpha 0.2.0 RC2 sigue siendo la última versión aceptada. La familia v4 de puerta ya está integrada, pero su aceptación visual/física y subcasos físicos siguen pendientes.

## Inicio de mesa

`INICIAR.cmd` pregunta al DM qué campaña abrir antes de iniciar el servidor: Isla de las Tempestades o D8 Night. Cada elección conserva su slot de guardado independiente. Mientras no se defina `DM_PASSWORD`, `/dm` crea una sesión local automáticamente y no muestra contraseña; si se vuelve a definir esa variable, el formulario reaparece sin cambiar el resto de la mesa.

## Alpha 0.3 DEV1 — registro del 16/09, ampliado por F1/F2

Implementados formato privado SaveV1/legado0, checksum, hidratación de escenas/PG/inventario/objetos/audio, checkpoint atómico con backup, lock de escritor, autosave, exportación privada, preview y restore confirmados, epoch de mundo y recuperación explícita. Pruebas actuales: typecheck/build PASS, Vitest 39/39, integraciones generales/de objetos PASS y `scripts/alpha03-smoke.mjs`/`scripts/one-shot-smoke.mjs` PASS con servidores hijos, cierre/reinicio, corrupción de active y recuperación de backup en carpeta temporal. Ninguna prueba usa la mesa del usuario en puerto3000. Se conserva el estado anterior en recovery antes de restaurar; input, sesiones de PJ, SFX y undo no reaparecen al cargar. La matriz honesta de cobertura está en `docs/ALPHA_0_3_IMPLEMENTATION_RESULTS.md`.

Pendiente para RC: aceptación visual/física de `objects-v4`, QA de navegador completa, cobertura P01–P15/D01–D05 que falta y recorrido físico D06/móviles. Varios borradores ImageGen anteriores se descartaron por desalineación y perspectiva. Babylon.js 9.26.0 (Apache-2.0) ya está instalado: hay terreno sintético, malla, grid proyectado, oclusores, luz, cámara y prueba `NullEngine`, pero no render3D integrado ni escena jugable. El one-shot privado aportado por el usuario ya tiene un pack separado de seis localizaciones, con mapas, actores de escena y tres PJ provisionales; falta pulido narrativo, balance y QA final.

Copia local de trabajo DEV1: `backups/alpha-0.3.0-dev1-20260915.zip` (20 633 284 bytes), SHA-256 `4574020BE1D040A67F1F900657E495093196D133720F1252CC8CE92B7C953911`, 199 entradas ZIP comprobadas. Incluye código/build/assets/documentación y la semilla privada del servidor necesaria para arrancar, así que **no debe compartirse públicamente**; excluye saves, capturas de evidencia, originales aportados y el ZIP del one-shot. No reemplaza las copias RC2/RC1 conservadas.

## Alpha 0.2.1 RC1 — registro histórico

El timón está integrado en los objetos por escena, sin `wheelStates` paralelo ni copia lógica. Tiene soporte fijo, separación atómica con destino, estados sujeto/caído, cuatro rotaciones, daño y restos. Puerta y caja también admiten intacto/dañado/roto; los restos dejan pasar actores pero conservan su ubicación para que otro objeto no se superponga. Deshacer valida ocupación y no desplaza personajes. Las solicitudes quedan ligadas a sesión, controlador, escena y versión del objeto y se invalidan por movimiento, desconexión, cambio de escena, mutación o caducidad.

Evidencia: typecheck cliente/servidor PASS; Vitest **23/23 PASS**; build Vite 842 módulos y servidor TypeScript presentes en `dist`; auditoría Alpha 0.2 **12/12 PASS**; integraciones general y de objetos Alpha 0.2.1 PASS; `scripts/audit-alpha021.mjs` termina sin fallos automatizados y conserva marcadores separados de comprobación en navegador. DM/Player/Projector fueron comprobados a 390×844, 844×390 y 1920×1080, con las tres consolas limpias.

Arte v3 terminado: cubierta limpia sin timón/pedestal horneados, soporte, variantes del timón, puerta y caja, y restos transparentes. La puerta cerrada se rehízo como barrera estrecha en planta para respetar la cámara cenital/oblicua. El editor DM previsualiza el sprite final y la huella; jugador y proyector sólo reciben estados aplicados. La rueda montada/cogida conserva lectura circular de rueda vertical y debe juzgarse en la prueba física por si necesita una elipse más marcada.

**Hallazgo físico del 15/09:** el usuario confirmó timón único, separación sin duplicado, traslado/giro, daño y restos, colisiones funcionales de puerta, deshacer ocupado, conexión y audio. También aportó dos capturas que demuestran que la puerta abierta todavía usa una hoja casi frontal mientras la cerrada usa una barra horizontal cenital: **FAIL visual**. El soporte del timón parece desplazado respecto a la cuadrícula según el usuario, sin posición alternativa todavía inequívoca. El usuario confirmó después preview rojo ocupado/bloqueado y Escape que elimina borrador/huella y vuelve a amarillo; no describió por separado el verde válido ni cuatro giros individuales. Móvil vertical/horizontal aplazado expresamente al cierre0.3. Informe detallado en `docs/ALPHA_0_2_1_PHYSICAL_REPORT_20260915.md`.

Copia recuperable RC1: `backups/alpha-0.2.1-rc1-20260914.zip` (20 528 652 bytes), SHA-256 `444F3A09524DA4AB26B4A0AF62A55B5505BF568D68EF5E520E407EC8F5352EF2`; ZIP comprobado como legible. La copia DEV1 y la aceptada `alpha-0.2.0-rc2-final-20260914.zip`, SHA-256 `28588478A586510BAD5AE3BA174BFD806AFE26E3BFCC1BD35743C3BC12F96E7A`, se conservan sin sobrescribir.

**Última versión aceptada operativamente por el usuario: Alpha 0.2.0 RC2.** La candidata histórica 0.2.1 RC1 tuvo arranque y recorrido físico parcial, pero no fue aceptada mientras la puerta abierta/cerrada siguió visualmente incoherente. La carpeta actual ya es DEV1 de 0.3.

## Qué incluye RC2

- Servidor de campaña inyectada: el motor y los clientes ya no importan Stormwreck ni dependen de sus IDs. `/api/campaign` entrega únicamente el DTO público validado; secretos, PG, inventarios, notas, criatura y reglas del timón se componen en servidor.
- Puerta cerrada/abierta/bloqueada con serialización privada del bloqueo, colisión autoritativa y deshacer. Una puerta bloqueada debe pasar a cerrada antes de abrirse.
- Caja 2×1 con giro, recolocación discreta, colisión por huella, reservas de spawns/PJ/pasos/criatura visible y deshacer por escena.
- Editor DM con mapa real, selección por mapa/lista, contorno, giro, elección de destino, preview privado válido/inválido y Aplicar/Cancelar/Escape.
- Fondo 576×432 y sprites separados para puerta abierta/cerrada y caja horizontal/vertical. Cuadrícula runtime permanente, tokens y props con orden visual común.
- Revisiones por escena, CAS de dos DM, fingerprint idempotente, reconexión al estado vigente y guardas frente a cargas antiguas.
- Se conservan aproximación, cubierta, joystick/WASD, timón, criatura, inventario/PG, cámaras y audio por capas con tres SFX.

## Evidencia técnica histórica de RC2

- Typecheck cliente y servidor: PASS.
- Vitest: **18/18 PASS**, incluida campaña sintética sin timón ni criatura.
- Build de producción: PASS, 842 módulos Vite y servidor TypeScript.
- Auditoría Alpha 0.2: **12/12 PASS**, 0 fallos; resultados en `docs/ALPHA_0_2_AUDIT_RESULTS.json`.
- Integración general en servidor nuevo y puerto libre: PASS (HTTP privado, permisos, tres roles, dos jugadores, timón, criatura, PG/inventario, reconexión, audio/SFX).
- Integración de objetos: PASS (tres roles, puerta, caja, stale refresh y undo).
- Navegador final DM/Player/Projector: login, catálogo, mapa, arte, preview privado, asignación de Mike y preparación del proyector comprobados; consolas sin errores ni avisos tras corregir la precarga.
- Búsqueda de imports/literales: sin imports de `campaigns/` en `engine/` o `apps/web/`.

## Recuperación y ejecución

- Rollback aceptado: `backups/alpha-0.1.1-rc4-20260913.zip`, SHA-256 `9029B7B26B854EF439CF4DEC14CA38A6C9595036CE117735A921ABEF615EE299`.
- Copia de trabajo previa: `backups/astra-pre-review-0.2-20260913-223941.zip`, SHA-256 `3614A28B36EE2ACBECD400EFC2D31FD639CA1BB26ED7AE3AA0BF99B7012CC32F`.
- Copia final RC2 con documentación de relevo: `backups/alpha-0.2.0-rc2-final-20260914.zip` (15 867 968 bytes), SHA-256 `28588478A586510BAD5AE3BA174BFD806AFE26E3BFCC1BD35743C3BC12F96E7A`. La copia `alpha-0.2.0-rc2-20260914.zip` se conserva como instantánea intermedia y no se sobrescribió.
- Los comprobadores usan servidores propios en loopback y puertos libres. No deben reiniciar ni reutilizar la mesa abierta por el usuario en el puerto 3000.
- En RC2 el estado de partida seguía sólo en memoria. DEV1 de Alpha 0.3 ya tiene persistencia, aún sin aceptación física.

## Siguiente versión

**Dirección posterior aprobada (15/09):** conservar arquitectura web/servidor y adoptar Babylon.js para sprites2D en escenarios3D; Astra y Sol realizan el trabajo principal y Terra/Luna reciben bloques acordes a su capacidad cuando ahorran trabajo. `docs/HD2D_DIRECTION.md` y ADR-023 fijan inmersión de mesa, percepción individual futura en móvil, recursos reutilizables y alcance. Babylon 9.26.0 ya está instalado, pero sólo sustenta un adaptador de terreno aislado; el recorrido3D completo sigue dependiendo de la integración0.3.1 y de aceptar0.3.

El gate físico de RC2 permanece **PASS operativo**. El intento de corrección de puerta en 0.2.1 sólo arregló la variante cerrada: la abierta sigue casi frontal y ambos estados no comparten lectura de marco/bisagra. La nueva observación física prevalece sobre la QA de navegador anterior.

**La histórica Alpha 0.2.1 RC1 quedó técnicamente verificada.** El contrato, ADR-017–019 y fixture siguen siendo referencia histórica. En ese corte se usó protocolo v3; DEV1 de0.3 usa v4 con runtimeEpoch y conserva DTO público v2.

La evidencia actual ya incluye ejecución de las funciones nuevas: Vitest 23/23, integraciones de socket y `scripts/audit-alpha021.mjs`, además de QA de navegador. El comprobador de diseño sigue validando nueve rutas, seis casos de ubicación y cuatro giros. No se añadió ninguna dependencia.

Las correcciones de borrador/revisión/conexión, `step.from`, preview con sprite, validación unificada y reutilización de props ya están incorporadas. RC2 se conserva como rollback aceptado. La futura confirmación física debe distinguir qué se observó de la evidencia automatizada.

Siguiente resultado exigido: **cerrar la puerta y las pruebas faltantes de Alpha0.3 conjunta**, siguiendo `docs/NEXT_MODEL_PROMPT.md`. Astra cerró ambos contratos, ADR-020–022, fixtures y matriz de aceptación; la persistencia ya está en DEV1. El usuario autoriza completar0.3 antes de comprobar puerta y móvil: no existe gate físico intermedio0.2.1 ni aceptación por inferencia.

Contratos vigentes: `docs/ALPHA_0_2_1_DOOR_VISUAL_CONTRACT.md`, `docs/ALPHA_0_3_PERSISTENCE_CONTRACT.md` y `docs/ALPHA_0_3_ACCEPTANCE_PLAN.md`. `node scripts/check-alpha03-design.mjs` verifica sólo fixtures de diseño; la implementación tiene ahora pruebas runtime propias. El descubrimiento preparatorio queda histórico y no prevalece sobre el contrato.

Antes de todo componente o asset nuevo se aplica el gate de reutilización de `ROADMAP_V1.md` y `docs/OPEN_SOURCE_REVIEW.md`: se estudian alternativas libres/gratuitas, pero sólo se incorporan si licencia, procedencia, transformabilidad y encaje técnico/artístico justifican el coste. Se mantienen dados y decisiones en mesa, secretos sólo en servidor, estética táctica pixel art y SFX PCM actuales como backlog artístico.

### Registro de cierre técnico Alpha 0.2.1 RC1 — 2026-09-14

Luna Reserve completó el encargo funcional y visual iniciado por Sol sin subagentes ni cambio automático de modelo. La prueba física está deliberadamente pendiente. La copia final RC1 y su hash están registrados arriba; las copias RC2 aceptada y DEV1 siguen disponibles.


Antorchas del Retiro instaladas en 3000 por autorización posterior del usuario. Cuatro accesos, paquete de iluminación y guardado verificados. Véase docs/evidence/RETREAT_FIXTURES_20261106.md.

- **Fauna con comportamiento realista en campamentos Godot (18/11/2026, rama eat/godot-camps-redesign):** CampFaunaKit.set_behavior/update_agents filtran por fase, clima, ciclos de visita escalonados, pausas de pasto/olfateo y huida ante el grupo; nocturnos ocultos de día, diurnos recogidos de noche/tormenta. camps_layout 142/0, camera 49/0, loading 172/0, combat 124/0; 12/12 capturas Forward+. Pendiente: revisión visual del usuario y pruebas físicas.
