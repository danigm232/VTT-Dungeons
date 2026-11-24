# Retiro del Dragón en Godot — Auditoría y Traslado por Capas, 14/11/2026

## Auditoría 3 y Bloques 1–5 (geometría, clima 3D, mar, fauna y cierre canónico) — 24/11/2026

Tras auditar integralmente la escena Forward+ frente al Capítulo 1 del PDF y a las capturas reales, se implementaron los **5 bloques** en `prototypes/godot-retiro/` sin tocar Pecio ni el trabajo paralelo de Codex (rutinas de los 12 habitantes y combate compartidos intactos):

| Bloque | Objetos / sistemas y archivos propietarios | Resultado verificado |
| --- | --- | --- |
| **Bloque 1 · Geometría, escaleras, árboles y spawn** | `_box_xf()` y `build_upgraded_rustic_stone_flight()` (`retreat_winch_and_stairs.gd`); `A5NorthSummitLanding` y `GraveyardCliffBase` (`retreat_temple_and_cliffs.gd`); `A1EastFlankStrata` (`retreat_scene_enhancer.gd`); exclusiones forestales, `Surface_IslandPleamarHigh` visual transparente, `MM_Z2PlanterHerbs/Blossoms`, `Z2MidLanternPost_0/1` (`retreat_layout_builder.gd`); `WizardToken` (`main.tscn`) | **0 troncos y 0 copas** recortando muros/escaleras/edificios (512 troncos); `ObsTurn` con cimentación maciza de `5,2 m` y farol; `A5RidgeW`, `A5NorthSummitLanding` (`y=35,04 m`) y acceso al Cementerio de Brastos 100 % despejados; `EastCliffWestRail` y Z2 libres; Mike libre del pozo (`x=97,80`). |
| **Bloque 2 · Climatología 3D real y audio DM** | `RetreatWeatherAndAudio` (`retreat_weather_and_audio.gd`), `retreat_layout_builder.gd`, `vtt_role_ui.gd`, `vtt_dm_hud.gd` | `clear`/`rain`/`storm`/`fog` activos con `RetreatRainParticles` + 4 `RainRoofBlockers` (no llueve en interiores), `RetreatFogMistParticles`, relámpagos `StormLightningLight`, humedad en materiales, modulación del mar y mezclador procedural DM de 4 canales + 5 SFX. |
| **Bloque 3 · Mar, mareas, SSAO, sombras, A5 y A1** | `OceanPlane` (`128×112`), `ocean_shader`, `_on_tide_state_changed()`, `MM_SubmergedKelp`, `_optimize_scene_lights()` (`retreat_layout_builder.gd`); `EastCliffBounceLight` y grupo `tide_foam` (`retreat_winch_and_stairs.gd`); SSAO (`main.tscn`); tejado pizarra mate A5 (`retreat_temple_and_cliffs.gd`); contrafuertes asimétricos A1 (`retreat_scene_enhancer.gd`) | 11 nodos `tide_foam` sincronizados (`low=−0,31`, `mid=+0,03`, `high=+0,45`); SSAO activo; 5 luces focales hero con sombras (`CampfireLight`, `DiningLampLight`, `KitchenHearthLight`, `LibraryStudyLight`, `TempleSanctuaryLight`); tejado A5 mate sin brillo plástico. |
| **Bloque 4 · Fauna 3D esculpida y vida costera** | `_make_swept_gull_wing_mesh`, `_make_butterfly_wing_mesh`, `_create_coastal_fish_node` (`retreat_layout_builder.gd`); `build_sanctuary_canary` (`retreat_scene_enhancer.gd`) | 5 gaviotas planeadoras aerodinámicas, 6 posadas esculpidas, 7 canarios dorados 3D en A5, 12 mariposas bilobuladas (A1 + Z7) y 8 peces costeros animados bajo el muelle Z1. |
| **Bloque 5 · Cierre canónico PDF e interactivos** | `RetreatMylaShopPanel` (`retreat_myla_shop_panel.gd`), `CLUE_TOPICS` (`retreat_conversations.gd`), `record_discovered_clue` / `set_dining_gathering_active` / `trigger_zombie_alarm` (`retreat_residents.gd`), `interactive_prop.gd`, `retreat_interiors_a3_a4.gd`, `retreat_winch_and_stairs.gd`, `vtt_role_ui.gd`, `vtt_dm_hud.gd` | Tienda Myla descuenta oro y entrega objetos reales a la mochila (`InventoryBridge`); 4 pistas desbloquean 5 temas de diálogo en Tarak/Varnoth/Laylee/Myla/Runara; conmutador DM **Comida A3**; alarma viva de Blepp/Tarak; botones DM de recompensa (`+2 Pociones` `[4, 10]` y `Llave lunar`); interactivos `[T]` en los 3 carteles, `A2_WinchMechanism` y mesas `RefectoryTable_576`/`615`. |

### Verificación técnica, revisión visual y estado separado
1. **Verificación técnica (tras el último cambio):** `--check-only` **12/12 PASS**; `test_retreat_layout.gd` **152/152**, `test_camera_contract.gd` **49/49**, `test_map_exits.gd` **128/128**, `test_retreat_residents.gd` **209/209**, `test_retreat_routines.gd` **483/483**, `inventory/test_backpack.gd` **161/161**, `verify_bloques1_to_5_20261124.gd` **51/51** (**1.233 PASS / 0 FAIL**, 0 errores en ejecución).
2. **Revisión visual integrada (Godot 4.7.2 Forward+ · `1440×810`):** comparadas las 16 parejas con cámara/resolución idénticas más 3 vistas extra (niebla, peces Z1 y tienda de Myla) en [informe interactivo Antes/Después con clic-superponer y SHA-256](../../output/retreat-audit3-20261124/index.html) (`manifest.json`).
3. **Aceptación artística del usuario:** pendiente de revisión final en el informe y en sesión de juego.
4. **Pruebas físicas / multijugador y pendientes fuera de alcance:** validación física/ENet en dispositivo y sprite dracónico de Runara (sujeto a `docs/CHARACTER_ASSET_PIPELINE.md`) quedan separados.

## Rutinas de los doce habitantes — 24/11/2026

Las seis tareas de cada residente son una adaptación propia de las personalidades y funciones del capítulo 1, pp. 8–12. Runara alterna estudio y templo. Tarak cuida los brotes, recoge agua y trabaja en la cocina. Varnoth atiende la cantería y las lecturas. Los kobolds alternan encargos, recreo y trabajo con periodos de reposo diurno. Cuando se encuentran cerca, pueden cooperar o conversar. Hablar con un héroe interrumpe la tarea y el combate suspende la actividad ambiental.

| Alcance | Archivo propietario y cambio |
| --- | --- |
| Agenda | `prototypes/godot-retiro/scripts/retreat_routine_directory.gd`. 72 actividades con destino, franja, gesto y reacción declarada. |
| Movimiento | `retreat_resident.gd` y `retreat_residents.gd`. Se mantienen los recorridos con suelo y puertas y la orientación física de la ficha al cambiar el ángulo de cámara. |
| Utilería | `retreat_routine_props.gd` enlaza cubo, torno, regadera, folios, bandejas, engranajes, vajilla, lona o pasador con el gesto. El ciclo del pozo se reutiliza sin aplicar inventario de jugador. El pasador del baúl se anima separado de su tapa interactiva. |
| Recursos | 24 marchas de 8 fotogramas, 5 gestos específicos de 8 fotogramas y 96 poses orientadas. El catálogo registra origen, altura de referencia, apoyo y poses por vista. Las diagonales usan la vista disponible más próxima. |

El informe interactivo recoge los 72 contactos y compara riego y lectura en dos ángulos con el mismo encuadre por par. Conserva originales y registra cada objeto y animación por ID. Se seleccionaron imágenes y se rechazaron dos láminas de Kilnip por su fondo opaco o su parecido con Rix. Queda pendiente animar el descanso tumbado en hamaca. Los gestos específicos aún utilizan una pose de trabajo en los ángulos que carecen de una secuencia propia. La aceptación artística en mesa y las pruebas físicas quedan separadas. [Auditoría y reproductor](../../output/retreat-routines-20261124/index.html).

Pasaron 483 comprobaciones de rutinas y cámara, 346 en la captura nativa y 209 en la suite de residentes. La agenda avanzó de forma automática del engranaje al alambique de Myla. Se observaron tres colaboraciones, entre ellas la demostración con Laylee. Las 23 comprobaciones del trabajo paralelo confirmaron la presencia de los elementos de Antigravity y la activación y desactivación de sus dos hitos DM. [Prueba de rutinas](../../output/retreat-routines-20261124/headless-routines.json) · [Render nativo](../../output/retreat-routines-20261124/native-routines.json) · [Prueba del trabajo paralelo](../../output/retreat-routines-20261124/routine-evidence-parallel.log).

## Cierre canónico del Retiro, Cementerio de Brastos, ganchos de PJ e hitos DM · 24/11/2026

Cierre de fidelidad canónica del Capítulo 1 (*Aventura Los Dragones de la Isla de las Tempestades.pdf*, pp. 6–15, Mapa 2 p. 11, p. 27, pp. 41/44/47–48 y pregenerados pp. 49–58) junto con la restauración estructural de la fachada A4/A3 y el pulido arquitectónico previo de A2/A3/A4/Paseo (Fases 0–7 + 5 mejoras extra del 23/11, [comparativa interactiva A2/A3/A4/Paseo](../../output/retreat-final-20261123/index.html)):

### 1. Reparación estructural y sellado de fachada
- **Error de parseo en `retreat_interiors_a3_a4.gd`:** corregida la inferencia estricta en el bucle de vajilla (`var side_z := float(side_z_v)`, `var soup: bool`, `var drink: bool`) que abortaba `build_rooms_and_plaza_furniture()` y `build_cave_roofs_and_archways()`, restaurando íntegramente `A4CliffStrata`, `A3CliffStrata`, los 5 contrafuertes escalonados del paseo, bancos, faroles, tablón de avisos, muro occidental y el registro de *cutaway* de A2/A5.
- **Sellado de costura A4/A3 (`retreat_scene_enhancer.gd`):** ampliado el borde oriental de `A4VaultMesh` (`112,75` → `112,95`) para solapar `A3VaultMesh` (`112,90`) eliminando la grieta vertical de `0,15 m` en la fachada superior.

### 2. Narrativa ambiental, secretos de celdas, Cementerio de Brastos e hitos DM
| Zona / Sistema | IDs / elementos implementados | Archivo propietario | Canon y función verificada |
| --- | --- | --- | --- |
| **A1 · Celdas 1–6 y Plaza** | `GuestBedroll_82_78`, `GuestBedroll_78_86` (Celda 1); `TarakCompostSack`, 2 pociones rubí y `TarakHiddenDaggers` (Celda 2); `WeaponRackVarnoth` con herramientas de cantero (conservando `RetreatRackShield`) + `VarnothHiddenSword` bajo el colchón (Celda 3); `MylaGearShopDisplay` con catálogo del PHB (Celda 4); `BleppDaggerPeg` (Celda 5); `MumpoHiddenCoin` (Celda 6); `BleppLookoutPost` en parapeto sur | `prototypes/godot-retiro/scripts/retreat_scene_enhancer.gd` | Secretos y utilería de pp. 8 y 47–48; todos inspeccionables `[T]` sin romper rutas ni rutinas de residentes. |
| **A3 · Comedor y Cocina** | `A3_RunaraHeadChair` en cabecera este de la mesa sur; `A3_LayleeAlchemicalScorch` (hollín y cerámica rota) + `A3_LayleeWarningPlacard` en muro oeste de cocina | `prototypes/godot-retiro/scripts/retreat_interiors_a3_a4.gd` | Silla única de Runara (p. 10) y accidente alquímico de Laylee con aviso de Myla (p. 9). |
| **A4 · Biblioteca** | `CrystalLampChimney` (lámparas de aceite con tulipa de cristal soplado) en escritorios y mesa de cartografía; códices de historia/teología (`lore_topic`) | `prototypes/godot-retiro/scripts/retreat_interiors_a3_a4.gd` | Iluminación de escritorio y fondos bibliográficos canónicos (p. 10). |
| **A5 · Templo de Bahamut** | `CardinalIncenseSlot_N/S/E/W` en el estrado; `A5_VarnothMasonryKit` junto a `varnoth_temple`; bendición `+1d4` y lectura *Detectar magia* en el altar | `prototypes/godot-retiro/scripts/retreat_temple_and_cliffs.gd`, `scripts/interactive_prop.gd` | Hornacinas cardinales y consagración del santuario (p. 11). |
| **NO · Cementerio de Brastos** | `NW_BrastosCliffGraveyard` en terraza elevada con musgo (`x=45,0`, `z=39,4`, `y=36,85 m`), escalera de 5 peldaños + rampa de colisión desde la senda NO (`z=44,20`, `y=35,50`), claro forestal reservado en `_build_lush_mountain_forest()`, 6 túmulos con lápidas de madera y flores, `BrastosGrave` interactiva | `prototypes/godot-retiro/scripts/retreat_temple_and_cliffs.gd`, `scripts/retreat_layout_builder.gd` | Tumba de Brastos sobre el acantilado noroeste (p. 27), despejada de árboles/roca y transitable. |
| **Puestos PNJ y ganchos de PJ** | `kilnip_dining` ajustado a `(125,6, 18,0, 59,15)` en pasillo central libre; `HERO_TOPICS` añadidos sin desplazar índices previos para **Mía** (sueño de la sombra de muerte con Runara/Varnoth), **Trinity** (tatuaje de la Horca Dorada con Tarak/Runara) y **Mike** (carta del Observatorio y llave de piedra lunar con Runara/Myla) | `prototypes/godot-retiro/scripts/retreat_resident_directory.gd`, `scripts/retreat_conversations.gd`, `scripts/retreat_residents.gd`, `scripts/vtt_role_ui.gd` | Trasfondos y ganchos individuales de los pregenerados (pp. 49–58) respetando el contrato de diálogos existente. |
| **Hitos del Retiro (DM)** | Conmutadores en HUD DM: `🎣 Zombis + aparejos` (`Z2_ZombieReappearanceGear` con cañas/cesta/peces + 3 marineros ahogados en playa, p. 12) y `🐉 Revelación A5` (`A5_RunaraRevelationFx` con aura de dragón de bronce + `MoonstoneKeyDisplay` en el altar, p. 13); guarda `is_visible_in_tree()` en `interactive_prop.gd` | `prototypes/godot-retiro/scripts/vtt_dm_hud.gd`, `scripts/retreat_temple_and_cliffs.gd`, `scripts/interactive_prop.gd` | Puesta en escena reversible bajo control del DM sin interferir con la exploración normal. |

### 3. Verificación técnica y visual (Godot 4.7.2 Forward+)
- **Sintaxis (`--check-only`):** **10/10 PASS** en todos los scripts modificados.
- **Suites automatizadas tras el último cambio:** `test_retreat_layout.gd` **152/152**, `test_camera_contract.gd` **49/49**, `test_map_exits.gd` **128/128**, `test_retreat_residents.gd` **209/209** y `verify_canon_enhancements.gd` **29/29** (**567 PASS / 0 FAIL** totales).
- **Revisión visual:** inspeccionadas 7 capturas nativas Forward+ (`canon_01_paseo_restored` a `canon_07_z2_fishing_gear`) confirmando la restauración de estratos/contrafuertes, sellado A4/A3, secretos de A1, interiores A3/A4/A5, Cementerio de Brastos limpio y los dos hitos DM.

### 4. Pendientes separados del Retiro
- Comercio transaccional en la tienda de Myla (deducción de oro y traspaso real de objetos a la mochila).
- Entregas automáticas de misión y seguimiento de recompensas ligadas al progreso de campaña.
- Sprite/animación de Runara en forma de dragón de bronce durante la revelación en A5.
- Marchas de frente y de espalda, riego y descanso en hamacas de los residentes (heredados de *Vida del claustro*).
- Aceptación artística en mesa del usuario y pruebas físicas/ENet en dispositivos.

## Vida del claustro · 24/11/2026

Los doce habitantes recorren la plaza, las celdas, las escaleras junto a A2, el comedor y la cocina de A3, la biblioteca de A4 y el acceso al templo de A5. Cada residente tiene un destino por franja. Hay catorce recorridos cortos entre puestos para tareas como revisar el pórtico, llevar recados y vigilar la bajada. Las rutas se apoyan en el suelo y las colisiones de la escena. Un PNJ espera si una puerta bloquea su recorrido y vuelve a intentarlo cuando queda paso. El combate pausa la actividad del claustro.

Hay 29 opciones de diálogo para los doce residentes y siete intercambios entre parejas basados en los capítulos y escenas de las páginas 8–12 de la aventura. Los intercambios aparecen al alcance de oído y con paso visual libre. El encabezado indica la tarea del PNJ. Al hablar se detiene su recorrido y al terminar continúa hacia su destino. **Grupo** abre una conversación escrita con el nombre del héroe activo y guarda las líneas durante la sesión local.

Se incorporaron doce marchas de perfil, una segunda vista para conservar la prótesis de Varnoth y cuatro gestos. Tarak echa hierbas al guiso de A3 con vapor en el fogón encendido. Agga organiza los recados, Blepp vigila el sendero y Kilnip gesticula al hablar. Se usaron los diseños existentes como referencia y se reservaron los originales por hash. El registro enlaza las 17 definiciones, las 136 poses limpias y las decisiones por recurso. [Comparativas, originales y animaciones](../../output/retreat-life-20261124/index.html).

Verificado con 209 comprobaciones de rutas y juego, 145 comprobaciones y cinco pares comparables en Godot Forward+ a 1440 × 810, y 27 pruebas del catálogo. También pasaron las pruebas de cuadrícula (12), cámara (49) y jugador en cuatro escenas (88). La tanda de rutas registra 12 llegadas en cada franja y seguimiento continuo de Runara de los 9 a los 18 metros de altura. Se comprobó que las siete parejas tienen al menos un puesto en el que el jugador puede oír el intercambio. [Prueba de rutas](../../output/retreat-life-20261124/headless-proof.json) · [Prueba nativa](../../output/retreat-life-20261124/native-proof.json) · [Registro visual](../../output/retreat-life-20261124/capture-register.json).

Quedan las marchas de frente y de espalda, el riego y el descanso en hamacas. Siguen pendientes el comercio de Myla, las entregas de misión y las escenas de rescate y revelación de Runara. La revisión artística en mesa y las pruebas físicas de dispositivos quedan por realizar.

## Habitantes del Retiro · 24/11/2026

Canon consultado en el capítulo 1 de la aventura, pp. 7–12. La estructura y los niveles se contrastaron con el mapa de la p. 11. El guion corto, las posiciones y la distribución por franjas son decisiones de puesta en escena. El diálogo público de Runara conserva el secreto de su forma dracónica. Varnoth conserva su ojo izquierdo ciego y la prótesis derecha. Myla y Laylee trabajan con herramientas en tierra y Laylee evita el fuego alquímico.

| Personaje o grupo | Puestos y recursos del juego |
| --- | --- |
| Runara | Primera bienvenida en A1, lectura y notas en A4 y meditación en A5. El saludo inicial se recuerda durante los cambios de mapa de la sesión. |
| Tarak | Hierbas en A1 y presencia en el comedor de A3 al anochecer. El gesto conserva la ramita dibujada a lo largo de ocho poses. |
| Varnoth | Mantenimiento de piedra en A5, biblioteca al anochecer y celda en A1 por la noche. |
| Myla y Laylee | Ajuste de un engranaje y limpieza de herramientas en el taller. Myla sincroniza el fotograma de contacto con el giro del banco de trabajo. |
| Rix | Reposo en la celda de día y ofrenda junto al altar cuando baja la luz. La ofrenda activa una emisión breve de incienso. |
| Agga, Blepp, Frub, Kilnip, Mumpo y Zark | Celdas de día, puestos de plaza o comedor al anochecer. Cada uno conserva su apariencia, ciclo de reposo y líneas de conversación. |
| Marineros ahogados | Tres variantes existentes en la playa. Se revelan desde la lista del DM y se activan sus colisiones y animaciones. |

Cada estación toma el suelo y el espacio libre de las colisiones de la escena. El cambio de estación se espera hasta que el residente y su destino queden fuera de vista. Los gestos nuevos se pintaron con la herramienta integrada a partir de los diseños existentes. Las láminas de origen se conservan por hash y el importador extrae los ocho fotogramas a escala nativa, con apoyo de pies. Se selecciona una vista pintada por gesto. VA-03/06/10/13/16 y REF-01/03/08 guían la lectura, el contacto y la colocación. [Comparativas, originales y registro por ID](../../output/retreat-residents-20261124/index.html).

La prueba física y funcional de la escena pasó 163 comprobaciones en modo sin pantalla. La prueba nativa de esta revisión pasó 205 con Godot Forward+ y produjo nueve pares de capturas a 1440 × 810, con cámara y escena fijas para cada par. Las 27 pruebas del catálogo de personajes también pasaron. Las capturas permiten revisar el apoyo de los habitantes y la revelación de los marineros. [Prueba nativa](../../output/retreat-residents-20261124/native-proof.json) · [Registro de capturas y originales](../../output/retreat-residents-20261124/capture-register.json).

Después de esta primera entrega, [Vida del claustro](#vida-del-claustro--24112026) completó los recorridos animados y la cocina. La segunda aparición de los zombis con Blepp y Tarak sigue pendiente de puesta en escena.

## Encargo y Alcance

**Encargo activo del usuario:**
> «1 Concepto y Diseño (Layout) del mapa del retiro del dragon.
> mira lo que hemos hecho en babylon y traslademoslo aqui en godot»
> «En babylon, la estructura o el mapa del retiro del dragon era un poco diferente, estaba construido mas ampliado, etc. podriamos copiar la estructura dle mapa en godot?»

Se traslada integralmente a **Godot Engine 4.7.2 (Vulkan Forward+)** la estructura ampliada de **El Retiro del Dragón (`dragon-rest`)** procedente de Babylon.js (`R3`, expansión de superficies, `retreat-modules/*.glb` y texturas pintadas), manteniendo la cuadrícula táctica de 1.5 m, cotas canónicas, las 11 zonas, 13 superficies ampliadas (**1.599 casillas reales** en `retreat-terrain-v2.json`), los 3 paquetes `.glb` esculpidos con recorte táctico (*cutaway*) en A2/A3/A4, las 6 celdas excavadas de A1, los 16 landmarks y los 8 preajustes de cámara 2.5D.

Base del prototipo: `prototypes/godot-retiro/`, motor Godot 4.7.2 Forward+, ventana táctica 1600×900.

---

## Capa 1: Concepto y Diseño (Layout) y Traslado Estructural Ampliado

### 1. Exportación desde Babylon y Paquetes Godot-Ready (`scripts/export-retreat-godot-bundle.mjs`)
- **Terreno ampliado (`prototypes/godot-retiro/assets/data/retreat-terrain-v2.json`):** 13 superficies con un total de **1.599 casillas**:
  - `beach`: 223 · `a1`: 410 · `cliff`: 48 · `a2`: 15 · `upper`: 442 · `a3`: 61 · `a4`: 113 · `a5`: 87 · `pleamar`: 18 · `observatorio`: 20 · `island-pleamar-low`: 30 · `island-pleamar-high`: 50 · `island-observatory`: 82.
- **Módulos 3D esculpidos (`prototypes/godot-retiro/assets/retreat-modules/`):**
  - `retreat_architecture_canon.glb` (91 nodos, 258.681 triángulos, 26,86 MB): contexto A1, orilla/embarcadero, conexiones, A2, A3, A4, A5, acabados P1/P2/P5/E1 y senderos V4 con recorte táctico (*cutaway*) de techos y muros frontales/laterales en A2/A3/A4.
  - `retreat_geography_stone.glb` (33 nodos, 129.969 triángulos, 11,30 MB): orografía costera S3/P3, crestas montañosas recortadas a `Z <= 49.2`, extensiones SAL1–SAL4 y senderos R2/R3.
  - `retreat_landscape_r3.glb` (17 nodos, 1.330.769 triángulos, 74,84 MB): paisaje forestal superior, praderas, pinos y acantilados integrados.
- **Texturas copiadas (`prototypes/godot-retiro/assets/textures/`):** 18 archivos incluyendo `a1-plaza-v6.png`, `a1-cell-v6.png`, `a1-cliff-rugged-v8.png`, `basalt-coastal-albedo-v1.webp`, `coastal-rock.png`, `foliage-atlas.png` (con recorte alfa para enredaderas y jardineras), `oak-v4.webp`, `limestone-v3.webp`, `ashlar-v4.webp`, `earth.webp`, `linen-v4.webp`, `wool-v4.webp`, `bay-v3.png` y mapas normales `rock-normal-v1.png`, `wood-normal-v1.png`, `metal-normal-v1.png`.

### 2. Cuadrícula y Escala Canónica
- **Métrica táctica:** Cuadrícula de 1.5 metros por casilla (estándar 5 pies de D&D 5e).
- **Dimensiones globales:** 112 columnas × 80 filas = **168.0 m × 120.0 m** de mapa táctico continuo.
- **Origen y traslación:** Coordenadas de origen `[72.0, 72.0]` y traslación canónica de A1 en `[72.0, 9.0, 72.0]`.

### 3. Jerarquía de Cotas de Elevación Canónicas
| Elemento / Zona | Cota canónica (Y) | Función táctica y física |
| --- | --- | --- |
| Manto oceánico | 0.00 m | Nivel del mar circundante |
| Plataforma baja cabrestante (mar) | 0.24 m | Recogida de mercancías en cota de flotación |
| Playa y Embarcadero (Z1) | 0.25 m | Desembarco del bote y orilla arenosa |
| Sendero de Pleamar (Z10) | 0.25 m – 0.59 m | Ruta costera suroeste hacia cuevas marinas |
| Plaza Central y Celdas A1 (Z3) | 9.00 m | Terraza baja del monasterio y claustro |
| Terraza Cabrestante A2 (Z4) | 15.00 m | Plataforma alta del almacén logístico |
| Comedor y Cocina A3 (Z5) | 18.00 m | Caverna comunal excavada en la montaña |
| Biblioteca del Retiro A4 (Z6) | 18.00 m | Scriptorium y archivo monástico |
| Paseo Superior y Cornisas (Z9) | 15.00 m – 27.00 m | Comunicación horizontal A2–A3–A4–A5 |
| Templo de Bahamut A5 (Z8) | 27.00 m | Santuario sagrado al aire libre en la cumbre |
| Sendero del Observatorio (Z10) | 18.00 m – 37.00 m | Ascensión oriental hacia las altas cumbres |

---

### 4. Las 11 Zonas Canónicas del Retiro
1. **Zona 1 — Playa y Embarcadero (Z1_BEACH):** Cols 12..48, Rows 61..76 (18.0..73.5m, 91.5..115.5m). Muelle de roble, pilotes, bote de remos amarrado (`boat`), punto de desembarco de los aventureros (`spawn`), dunas de arena cálida mineral PBR y rompientes de basalto.
2. **Zona 2 — Subida al Retiro (Z2_ASCENT):** Cols 40..48, Rows 61..68. Escalera de tres tramos tallada en la roca viva con bordillos de piedra, descansillos y faroles náuticos ámbar (salto de cota 0.25m → 9.0m).
3. **Zona 3 — A1: Celdas y Plaza Central (Z3_A1_PLAZA):** Cols 49..94, Rows 51..65 (73.5..142.5m, 76.5..99.0m, cota Y=9.0m). Plaza central con hoguera comunitaria, bancos con paños plegados, estatua de Astalagan con velas votivas y 6 celdas desiguales excavadas al norte.
4. **Zona 4 — A2: Cabrestante y Almacén Marino (Z4_A2_WINCH):** Cols 103..108, Rows 43..46 (154.5..163.5m, 64.5..70.5m, cota Y=15.0m). Caseta de madera (4.5m × 4.0m), torno, eje, tambor, cable y plataforma de carga con recorrido vertical 0.24m ↔ 15.0m.
5. **Zona 5 — A3: Comedor y Cocina Excavados (Z5_A3_DINING):** Cols 76..85, Rows 34..43 (114.0..129.0m, 51.0..66.0m, cota Y=18.0m). Mesa comunal larga con bancos, silla de respaldo alto y pasillo interior hacia la cocina con fogón y despensa.
6. **Zona 6 — A4: Biblioteca del Retiro (Z6_A4_LIBRARY):** Cols 62..73, Rows 35..43 (93.0..111.0m, 52.5..66.0m, cota Y=18.0m). Puerta de roble exterior, scriptorium interior, 20 estanterías murales y 3 exentas con pergaminos y códices, mesas de estudio y atriles.
7. **Zona 7 — Jardines y Bosquetes (Z7_GARDENS):** Cols 45..62, Rows 42..50 (67.5..94.5m, 63.0..76.5m, cotas Y=12.0m..18.0m). Terrazas ajardinadas con 14 jardineras de piedra, flores de armeria, matas de salvia y bosquetes de pinos marítimos y olivos.
8. **Zona 8 — A5: Templo de Bahamut (Z8_A5_TEMPLE):** Cols 23..32, Rows 42..50 (34.5..49.5m, 63.0..76.5m, cota Y=27.0m). Plataforma sagrada de caliza clara, estatua monumental de Bahamut, 4 columnas acanaladas perimetrales, estanque sagrado y 7 perchas para los canarios dorados de Bahamut.
9. **Zona 9 — Paseos y Explanadas (Z9_UPPER_WALKWAY):** Cols 33..102, Rows 43..45 (49.5..154.5m, 64.5..69.0m, cotas Y=15.0m..27.0m). Cornisa superior rocosa con paseo pavimentado articulando el tránsito horizontal y miradores oceánicos.
10. **Zona 10 — Rutas hacia el Resto de la Isla (Z10_ISLAND_ROUTES):** Sendero de Pleamar (Cols 2..11, Rows 74..75, Y=0.25..0.59m) hacia cuevas y pecios, y Sendero del Observatorio (Cols 80..107, Rows 10..42, Y=18.0..37.0m).
11. **Zona 11 — Entorno Global (Z11_GLOBAL_ENV):** Bounding global 168m × 120m, manto oceánico somero, farallón de basalto continuo y telón escénico 2.5D.

---

### 5. Las 6 Celdas de Peregrinos de A1 (Canon Oficial)
| Celda | Rol canónico | Entrada global (Col, Row) | Posición mundial (X, Y, Z) | Mobiliario canónico |
| --- | --- | --- | --- | --- |
| Celda 1 | Habitación libre | (54, 57) | 81.75m, 9.0m, 86.25m | 1 Cama, 1 mesita, 1 escritorio, 1 silla |
| Celda 2 | Tarak (Herborista) | (60, 57) | 90.75m, 9.0m, 86.25m | 1 Cama, 1 mesita, 1 escritorio, 1 silla |
| Celda 3 | Varnoth (Comandante) | (67, 57) | 101.25m, 9.0m, 86.25m | 1 Cama, 1 mesita, 1 escritorio, 1 silla |
| Celda 4 | Myla (Erudita/Taller) | (74, 57) | 111.75m, 9.0m, 86.25m | 1 Cama, 1 mesita, 1 escritorio, 1 silla, herramientas |
| Celda 5 | Kobolds oeste (Ruk) | (81, 57) | 122.25m, 9.0m, 86.25m | 4 Hamacas para kobolds |
| Celda 6 | Kobolds este (Meepo) | (87, 57) | 131.25m, 9.0m, 86.25m | 4 Hamacas para kobolds |

*Total verificado:* 4 camas individuales y 8 hamacas canónicas exactas.

---

### 6. Registro de los 16 Landmarks Canónicos
| ID | Superficie | Casilla (Col, Row) | Posición Mundial (X, Y, Z) | Descripción |
| --- | --- | --- | --- | --- |
| `spawn` | beach | [16, 74] | (24.75, 0.25, 111.75) | Llegada de los Aventureros |
| `boat` | beach | [13, 75] | (20.25, 0.25, 113.25) | Bote de remos amarrado |
| `pleamar` | pleamar | [3, 74] | (5.25, 0.25, 111.75) | Sendero de Pleamar |
| `observatorio` | observatorio | [93, 33] | (140.25, 18.00, 50.25) | Sendero al Observatorio |
| `a2-door` | a2 | [105, 45] | (158.25, 15.00, 68.25) | Puerta del Cabrestante |
| `winch` | a2 | [107, 45] | (161.25, 15.00, 68.25) | Torno del Cabrestante |
| `community` | a3 | [79, 40] | (119.25, 18.00, 60.75) | Mesa Comunal (Comedor A3) |
| `library` | a4 | [68, 39] | (102.75, 18.00, 59.25) | Estanterías de la Biblioteca |
| `a4-door` | a4 | [68, 42] | (102.75, 18.00, 63.75) | Puerta de la Biblioteca |
| `temple` | a5 | [27, 43] | (41.25, 27.00, 65.25) | Templo de Bahamut |
| `runara` | a5 | [29, 43] | (44.25, 27.00, 65.25) | Runara (Líder del claustro) |
| `tarak` | a1 | [59, 57] | (89.25, 9.00, 86.25) | Tarak (Monje herborista) |
| `varnoth` | a1 | [66, 57] | (99.75, 9.00, 86.25) | Varnoth (Comandante retirada) |
| `myla` | a1 | [74, 57] | (111.75, 9.00, 86.25) | Myla (Erudita y artesana) |
| `kobold-west` | a1 | [81, 57] | (122.25, 9.00, 86.25) | Kobolds oeste (Ruk y cuadrilla) |
| `kobold-east` | a1 | [87, 57] | (131.25, 9.00, 86.25) | Kobolds este (Meepo y aprendices) |

---

### 7. Preajustes de Cámara Táctica 2.5D
Paridad con la geometría ampliada en `RETREAT_ZONE_VIEWS` / `CAMERA_PRESETS`:
- `overview`: Objetivo `(88.0, 14.0, 74.0)`, `ortho_half = 46.0`, Pitch 27°, Yaw 0°.
- `beach`: Objetivo `(17.5, 1.5, 108.0)`, `ortho_half = 18.0`, Pitch 25°, Yaw 0°.
- `a1`: Objetivo `(106.0, 9.5, 89.0)`, `ortho_half = 38.0`, Pitch 25°, Yaw 0°.
- `a2`: Objetivo `(160.0, 15.0, 67.5)`, `ortho_half = 9.0`, Pitch 25°, Yaw 0°.
- `a3`: Objetivo `(122.0, 18.5, 58.0)`, `ortho_half = 9.5`, Pitch 26°, Yaw 0°.
- `a4`: Objetivo `(99.0, 18.5, 58.0)`, `ortho_half = 10.5`, Pitch 26°, Yaw 0°.
- `a5`: Objetivo `(41.5, 27.5, 68.5)`, `ortho_half = 9.5`, Pitch 24°, Yaw 0°.
- `caves`: Objetivo `(109.0, 19.0, 58.5)`, `ortho_half = 24.0`, Pitch 27°, Yaw 0°.

---

## Verificación, Pruebas Automatizadas y Capturas Forward+

1. **Suite automatizada headless (`test_retreat_layout.gd` en Godot 4.7.2 tras la última edición):**
   - **Pruebas superadas:** **129 / 129 PASS (100 %)**
   - **Fallos:** **0 FAIL**
   - **Reporte generado:** `output/godot-retiro-layout-20261114/layout-tests.json`
2. **Inspección visual Forward+ (5 encuadres en ventana 1600×900 sobre Vulkan GeForce MX350):**
   - `output/godot-retiro-layout-20261114/retiro-overview.png`
   - `output/godot-retiro-layout-20261114/retiro-beach.png`
   - `output/godot-retiro-layout-20261114/retiro-a1.png`
   - `output/godot-retiro-layout-20261114/retiro-caves.png`
   - `output/godot-retiro-layout-20261114/retiro-a5.png`

### Ejecución Local
- Desde la raíz de Dungeons, `ABRIR-RETIRO-GODOT.cmd` abre el escenario interactivo en Godot 4 Forward+.
- Controles:
  - **WASD:** Desplazamiento táctico del clérigo.
  - **Q / E:** Rotación orbital de cámara en pasos de 45°.
  - **Rueda del ratón:** Zoom 2.5D continuo.
  - **Clic derecho / central:** Arrastre panorámico por el mapa.
  - **Espacio / Tecla F:** Recentrar la cámara sobre el aventurero.
  - **Teclas 1..6 y 0:** Salto instantáneo entre preajustes canónicos de zona (Playa, A1, A2, A3, A4, A5, Vista General).

## Cámara actualizada — 14/11/2026

La cámara vigente y sus nuevas pruebas se registran en [Cámaras Godot](GODOT_CAMERAS_20261114.md). Esta actualización sustituye los valores de cámara anteriores de esta ficha y conserva el mapa, arte y contratos existentes.

---

## Zona Z1 · Playa y Embarcadero en Godot (Pasos 1–7) — 18/11/2026

Reconstrucción por pasos (`1.1`–`6.6`) y refinamiento de carteles empalados y sombreado (**Paso 7**) en `prototypes/godot-retiro/` siguiendo la dirección visual costera y manteniendo intacta la topografía, las cotas canónicas, las escaleras hacia Z2 y el resto de zonas. Informe visual interactivo paso a paso (clic = avanzar `Base -> Paso 1 -> Paso 2 -> Paso 3 -> Paso 4 -> Paso 5 -> Paso 6 -> Paso 7`, más teclado y ampliación, `1280x720` Vulkan Forward+ modo `PROYECTOR`) y vistas de `Jugador (F1)` y `DM (F2)`: [retreat-beach-final-20261118/index.html](../../output/retreat-beach-final-20261118/index.html).

### Registro de cambios visuales, shaders, salidas y mecánica (ID, propietario, cambio y VA)

| ID / Bloque | Archivo propietario | Estado previo | Candidata implementada (Pasos 1–7) | VA / Criterio |
| --- | --- | --- | --- | --- |
| `PleamarCoveBeach`, `PleamarFarWestSpurCliff`, `SeaArchCrag_7..10`, `CovePost_0..7`, `CovePathFlagstone_0..6` | `prototypes/godot-retiro/scripts/retreat_layout_builder.gd` | Losa cuadrada costera, talud abrupto en banda oeste y corte antes del borde occidental | Costa basáltica facetada continua ampliada al oeste (`x_min = -28.0`), playa curvilínea de arena irregular con oclusión en vértices al pie de cantil/muelle, promontorios volcánicos y sendero costero continuo hasta `(-25.8, 0.96, 82.0)` | VA-04, VA-07, VA-13, VA-15 |
| `RicketyWoodenPier`, `CoastalRowboat` (`BoatBobPivot`) | `prototypes/godot-retiro/scripts/retreat_layout_builder.gd` | Muelle comercial ancho y bote genérico sin acceso marítimo diferenciado | Embarcadero desvencijado con tablones envejecidos, pilotes, cuerdas/cajas y gran bote de remos (`4.60m`) amarrado; enlace marítimo secundario `from_pleamar_sea` hacia `pleamar_coves.tscn` | VA-05, VA-06, VA-07 |
| `SignpostProp` (`SignpostMainPost`, `SignpostPost_L/R`, `SignpostGallowsPost`, `SignpostBoardBack`, `SignpostAnchor_*`, `SignpostTitle`, `SignpostTitleBack`), `PleamarB1ExteriorThreshold` | `map_exit.gd`, `route_destination_controller.gd`, `vtt_ui_theme.gd`, `map_transition_manager.gd`, `retreat_layout_builder.gd` | Carteles 2D sobre disco gris que rotaban hacia la cámara en `_process()` y flotaban o mostraban bordes blancos | Postes 3D de roble (`oak-v4.webp` sin aviso PNG) **empalados a `-0.55m` bajo tierra**, con montículo de suelo/contacto, tableros 3D traseros con sombra (`cast_shadow = ON`), recorte del margen inferior en `hanging_ropes` y orientación fija (`sign_yaw_deg`) inmóvil al mover u orbitar la cámara; alternativa por collado (`from_pleamar_high`), restricción por marea alta y umbral exterior de Pleamar | VA-07, VA-14, VA-18 |
| `DirectionalLight3D`, `Environment_1`, `lights_and_shadows`, `ocean_shader`, `SeabedPlane`, `MM_SubmergedKelp`, `CoastalSunbeams`, `_add_ground_contact_shadow` | `main.tscn`, `pleamar_coves.tscn`, `observatory_approach.tscn`, `pecio_cove_arrival.tscn`, `project.godot`, `retreat_layout_builder.gd` | Sombras direccionales de 2 splits (`shadow_normal_bias = 1.15`), rocas/pinos de Z1 sin sombra (`OFF`), ambiente lavado (`0.66`), mar con halos cian | PSSM 4 splits (`directional_shadow_mode = 2`, `shadow_bias = 0.016`, `shadow_normal_bias = 0.25`, `shadow_blur = 1.35`, `soft_shadow_filter_quality = 2`), sol oblicuo (`-34°, -52°`, `1.50`) frente a ambiente pizarra (`0.46`), sombras activas en `MM_CoastalPine*`, `MM_TrailRocks`, `HeadlandBasaltButtress_*`, `SeaArchCrag_*`, `PleamarBayBackCliff_*`, troncos, cajas, creel y carteles, más decal de contacto en arena seca (`_eval_cove_beach_sample`), agua Atlántica con espuma orgánica y algas | VA-02, VA-11, VA-12, VA-15 |
| `MM_CoastalPineTrunks`, `MM_CoastalPineCrowns`, `MM_CoastalGrasses`, `MM_CoastalHeather`, `MM_CoastalFerns`, `MM_ExposedPineRoots`, `CoastalHerbPlots`, `MM_ShorePebbles`, `WeatheredDriftwood_0..2`, `ShoreMooringStake_*`, `CoastalCrabCreel` | `retreat_layout_builder.gd` | Coníferas uniformes y arbustos escasos/saturados | 13 coníferas variadas en tamaño/copa, matas mediterráneas agrupadas en márgenes, hierbas/brezo/helechos, raíces de pino expuestas, 2 parcelas de hierbas, guijarros, madera lavada y arena central (`x=8..24.5, z=98..109`) despejada para combate | VA-02, VA-08, VA-09 |
| `Safe_Beach_West`, `Safe_Beach_South`, `PleamarCoveBeach_col`, `MAREA EN LA COSTA (Z1)`, `LoadingSession.state()` | `retreat_layout_builder.gd`, `vtt_dm_hud.gd`, `loading_session.gd`, `test_map_exits.gd` | Colisiones extendidas sobre el mar y sin control DM/persistencia de marea | Colisión costera recortada a tierra firme (`cy_avg >= -0.02`), puntos separados de embarque/salida terrestre (`22.2 m`), panel DM `Baja`/`Creciente`/`Alta` sincronizado con nivel de agua, bloqueo en marea alta con bypass alto y sincronización de `"tide"` en `LoadingSession` | VA-17, VA-18 |

### Verificación técnica y de rendimiento

- **Suites headless en Godot 4.7.2 tras la última edición de código/escena (`task-5188`):**
  - `scripts/test_retreat_layout.gd`: **136 PASS / 0 FAIL**.
  - `scripts/test_map_exits.gd`: **128 PASSED, 0 FAILED** (incluyendo comprobación de carteles empalados `min_y <= -0.35m` e inmóviles al mover/rotar `TacticalCamera`, `DirectionalLight3D` 4-splits, sombras de pinos/rocas Z1, separación de salidas, pruebas de raycast, bloqueo por marea alta, desvío por collado sin marea, sincronización `"tide"` en `LoadingSession` y retornos).
  - `scripts/test_camera_contract.gd`: **49 PASS / 0 FAIL**.
  - `loading/test_map_roundtrip.gd`: **24 passed; 0 failed**.
- **Auditoría de rendimiento Vulkan 1.1.119 Forward+ en NVIDIA GeForce MX350 (`1600x900`, `SCALING_3D_SCALE=0.85`, `task-5188` — `BELOW_30_FPS=[]`):**
  - `overview`: **53.1 FPS** media (**50.0 FPS p95**, max 20.31 ms)
  - `Z1_beach`: **80.6 FPS** media (**70.7 FPS p95**) · `Z1_pleamar_cove`: **83.0 FPS** (**75.2 FPS p95**)
  - `Z2_ascent`: **76.8 FPS** (**69.8 FPS p95**) · `Z3_a1_plaza`: **67.5 FPS** (**62.3 FPS p95**) · `Z3_a1_cell_in`: **78.4 FPS** (**71.9 FPS p95**)
  - `Z4_a2_winch`: **84.5 FPS** (**73.6 FPS p95**) · `Z5_a3_dining`: **80.2 FPS** (**72.9 FPS p95**) · `Z6_a4_library`: **77.1 FPS** (**70.8 FPS p95**)
  - `Z7_gardens`: **75.5 FPS** (**70.6 FPS p95**) · `Z8_a5_temple`: **82.9 FPS** (**75.4 FPS p95**) · `Z9_upper_walk`: **75.2 FPS** (**70.2 FPS p95**)
  - `Z10_pleamar_high`: **81.3 FPS** (**74.0 FPS p95**) · `Z10_obs_inland`: **74.6 FPS** (**69.9 FPS p95**) · `Z10_obs_coast`: **82.6 FPS** (**74.6 FPS p95**)
  - Escenas de ruta: `pleamar_coves.tscn` **124.0 FPS** (`105.2 p95`), `observatory_approach.tscn` **153.0 FPS** (`130.2 p95`), `pecio_cove_arrival.tscn` **165.6 FPS** (`141.3 p95`).
- **Alcance y pendientes separados:** aceptación artística final de Z1 por el usuario y red multijugador ENet multi-dispositivo completa (el estado `"tide"` queda sincronizado mediante el servicio HTTP local `LoadingSession` en el puerto `47921`).

---

## Zona Z1 y Escalera Z2 — Acabado Costero en 10 Pasos (Pasos 1–10) — 18/11/2026

Ejecución secuencial completa de los **10 pasos (`Paso 1` a `Paso 10`)** sobre la zona costera `Z1_BEACH`, el muelle (`RicketyWoodenPier`), la escalera tallada `Z2_ASCENT` y la salida occidental hacia las Cuevas de Pleamar en `prototypes/godot-retiro/scripts/retreat_layout_builder.gd` y `prototypes/godot-retiro/scenes/main.tscn`, conservando distribución canónica, cotas, los 5 `MapExit` empalados a `-0.55m` (`map_exit.gd`), el control DM de marea (`Baja`/`Creciente`/`Alta`) y el resto de zonas del Retiro (`Z3`–`Z11`).

### Registro de Activos, Nodos y Correspondencia Visual (`VA-02`–`VA-18`)

| Paso | Sub-objetivos | IDs / Nodos propietarios (`retreat_layout_builder.gd` / `main.tscn`) | Referencia / `VA` | Estado |
| --- | --- | --- | --- | --- |
| **Paso 1** | `1.1–1.4` Agua, batimetría 3 zonas, espuma rota, fondo marino y movimiento | `OceanPlane` (`ocean_shader`), `SeabedPlane`, `MM_SubmergedKelp_A/B`, `MM_SubmergedStones`, `MM_WaveLapFoam` | `REF-07 Sea of Stars` · `VA-15`, `VA-02` | VERIFICADO TÉCNICAMENTE · REVISADO VISUALMENTE |
| **Paso 2** | `2.1–2.4` Muelle constructivo, lectura de embarque, props curados y bote usable | `RicketyWoodenPier`, `PierAccessSleepers`, `PierAccessStile_*`, `PierWearRunner`, `PierEmbarkStep`, `PierFrontXBraceA/B`, `PierMainMooringPost`, `PierDrapedNet`, `PierRopeCoil_*`, `PierEastCrate`, `CoastalRowboat`, `BoatWaterContactAO` | `REF-07`, `REF-08 Eastward` · `VA-05`, `VA-06`, `VA-12` | VERIFICADO TÉCNICAMENTE · REVISADO VISUALMENTE |
| **Paso 3** | `3.1–3.4` Escalera Z2 con variación de losas, anclaje en roca, postes maestros y entrada/salida | `MM_Z2StairFlags`, `MM_Z2RockAnchors`, `MM_Z2JointMoss`, `Z2TurnPlinth_*`, `Z2TurnMainPost_*`, `Z2EntryPlinth_*`, `Z2EntranceLanternPost` (`El Retiro ↑`), `Z2TopExitPillar_*` | `REF-03 FFTactics 2025`, `REF-04` · `VA-04`, `VA-05`, `VA-14` | VERIFICADO TÉCNICAMENTE · REVISADO VISUALMENTE |
| **Paso 4** | `4.1–4.4` Separación de 4 suelos, camino principal con losas pisadas y microdetalle perimetral | `PleamarCoveBeach` (`_eval_cove_beach_sample`: arena húmeda, arena seca central, tierra pisada, grava basáltica), `MM_BeachTrailPavers`, `MM_ShoreShells` | `REF-02 Witchbrook`, `REF-09` · `VA-04`, `VA-07` | VERIFICADO TÉCNICAMENTE · REVISADO VISUALMENTE |
| **Paso 5** | `5.1–5.4` Fractura columnar basáltica, contacto húmedo, vegetación de grieta y hendidura oeste | `MM_CliffFractureRibs`, `MM_CliffCreviceVines`, `MM_CliffCreviceFerns`, `WestCoastalCleftPocket`, `WestCleftShadowRecess`, `WestCleftBasaltJamb_*`, `Mist_WestCleftMouth` | `REF-01 Octopath II`, `REF-07` · `VA-05`, `VA-13`, `VA-15` | VERIFICADO TÉCNICAMENTE · REVISADO VISUALMENTE |
| **Paso 6** | `6.1–6.3` Variación de coníferas mediterráneas y collarines roca-hierba-helecho-brezo | `_append_scenic_pine`, `MM_RockGrassTransitions`, `MM_ShelteredCoastalFerns`, `MM_ShelteredCoastalHeather` | `REF-02 Witchbrook`, `REF-05 DQIII HD-2D` · `VA-08`, `VA-09` | VERIFICADO TÉCNICAMENTE · REVISADO VISUALMENTE |
| **Paso 7** | `7.1–7.4` Luz oblicua costera, rebote turquesa, AO de contacto y jerarquía de 3 focos | `DirectionalLight3D` (`-31°, -49°, energy=1.62`), `WorldEnvironment` (`ambient=0.38`, `fog_density=0.0031`), `CoastalWaterBounce_Pier/Z2`, `CoastalContactAO_*` (16 sellos), `CoastalFocalHierarchy_1..3` | `REF-01 Octopath II`, `REF-07` · `VA-10`, `VA-11`, `VA-12`, `VA-16` | VERIFICADO TÉCNICAMENTE · REVISADO VISUALMENTE |
| **Paso 8** | `8.1–8.3` Señalización de salida a Pleamar, bifurcación alta sobre marea y cartel marítimo | `PleamarWayfinderPost` (con mojón, farol y doble aspa `← Costa Pleamar (Marea ↓)` / `↑ Senda Alta (Collado)`), `HighRidgeForkStep_0..2`, `PierSeaRouteBoard` (`Pleamar · Pecio →`) | `REF-03`, `REF-05` · `VA-06`, `VA-14` | VERIFICADO TÉCNICAMENTE · REVISADO VISUALMENTE |
| **Paso 9** | `9.1–9.3` Props narrativos de retiro monástico austero junto al desembarco | `MonasticLandingSupplies`, `MonasticOpenHerbCrate`, `MonasticHempSack`, `MonasticSpareRopeCoil_*`, `MonasticSeasonedPlank`, `MonasticCacheLantern*` | `REF-02`, `REF-08` · `VA-01`, `VA-06`, `VA-07` | VERIFICADO TÉCNICAMENTE · REVISADO VISUALMENTE |
| **Paso 10** | `10.1–10.5` Auditoría de navegación/colisiones, barrido de cápsula, vistas Jugador/DM e informe 10 pasos | `verify_beach_nav_step10.gd`, reubicación limpia fuera de corredor táctico (`PierEastCrate`, `MonasticLandingSupplies`, `CoastalCrabCreel`, `PierSeaRouteBoard`), capturas `step_00..step_10` y `roles/` | `VA-17`, `VA-18` | VERIFICADO TÉCNICAMENTE · REVISADO VISUALMENTE |

### Pruebas Automatizadas y Auditoría Física (ejecutadas tras la última edición)

- `res://scripts/test_retreat_layout.gd` (`task-5839`): **136 PASS / 0 FAIL** (exit 0).
- `res://scripts/test_map_exits.gd` (`task-5845`): **128 PASSED, 0 FAILED** (exit 0).
- `res://scripts/test_camera_contract.gd`: **49 PASS / 0 FAIL** (exit 0).
- `res://player/test_grid_navigation.gd`: **12 passed, 0 failed** (`{"errors":[],"failed":0,"passed":12,"suite":"grid-navigation"}`, exit 0).
- `res://loading/test_map_roundtrip.gd` (`task-5850`): **24 passed; 0 failed** (exit 0).
- `verify_beach_nav_step10.gd` (`task-5887`): **25 PASS / 0 FAIL** (`WalkableGrid` 1.025 celdas transitables globales, 27 celdas en Z1 playa, grafo conectado Muelle=30 / Playa=30, `safe_frac=1.000` sin enganches de cápsula en `Playa a Muelle`, `Playa a Z2 Pie`, `Z2 Flight 0` y `Senda oeste Pleamar`, y triggers separados `> 16m` con confirmación previa).

### Rendimiento Vulkan Forward+ (`1600×900`, `SCALING_3D_SCALE=0.85`, NVIDIA GeForce MX350 — `task-5894`)

- **Zonas por debajo de 30 FPS:** **`BELOW_30_FPS=[]` (0 zonas)**; todas las 15 vistas de `main.tscn` y las 3 escenas de ruta superan holgadamente el umbral de 30 FPS tanto en media como en percentil 95 (`p95_fps >= 50.9 FPS`):
  - `overview`: **55.6 FPS** media (`50.9 FPS p95`, `17.99 ms`)
  - `Z1_beach`: **81.1 FPS** media (`73.2 FPS p95`, `12.33 ms`)
  - `Z1_pleamar_cove`: **85.0 FPS** media (`75.4 FPS p95`, `11.76 ms`)
  - `Z2_ascent`: **80.6 FPS** media (`73.9 FPS p95`, `12.41 ms`)
  - `Z3_a1_plaza`: **70.8 FPS** media (`66.6 FPS p95`, `14.13 ms`) · `Z3_a1_cell_in`: **83.1 FPS** (`77.5 p95`)
  - `Z4_a2_winch`: **90.1 FPS** (`84.1 p95`) · `Z5_a3_dining`: **85.4 FPS** (`78.8 p95`) · `Z6_a4_library`: **81.2 FPS** (`75.6 p95`)
  - `Z7_gardens`: **80.1 FPS** (`73.7 p95`) · `Z8_a5_temple`: **89.1 FPS** (`81.8 p95`) · `Z9_upper_walk`: **80.5 FPS** (`74.6 p95`)
  - `Z10_pleamar_high`: **87.8 FPS** (`81.2 p95`) · `Z10_obs_inland`: **80.0 FPS** (`74.5 p95`) · `Z10_obs_coast`: **87.0 FPS** (`82.2 p95`)
  - Escenas de ruta: `pleamar_coves.tscn` **177.0 FPS** (`154.3 p95`), `observatory_approach.tscn` **166.7 FPS** (`143.7 p95`), `pecio_cove_arrival.tscn` **185.8 FPS** (`159.2 p95`).

### Informe Interactivo Clic-a-Paso (`Base → Paso 1..10`)

- **Informe HTML interactivo:** [`output/retreat-beach-10steps-20261118/index.html`](../../output/retreat-beach-10steps-20261118/index.html)
  - 4 cámaras fijas (`1280×720`, modo `PROYECTOR`) × 11 estados (`step_00` Base a `step_10` Paso 10 = 44 capturas PNG con hash SHA-256 registrado en tabla).
  - Al pulsar o tocar cada imagen se avanza al paso siguiente en el mismo rectángulo manteniendo encuadre, con etiqueta visible de paso, navegación por teclado (`←`/`→`/`Espacio`), selector directo por paso, avance simultáneo de las 4 cámaras y vista ampliada en `<dialog>`.
  - Incluye capturas de verificación de roles (`roles/player_beach.png`, `roles/dm_beach_tide.png` y `roles/signposts_orbited_check.png`).
- **Pendientes separados:** aceptación visual final del usuario y pruebas físicas/multijugador ENet multi-dispositivo.

---

## Bloque A · Zona A1 (`Z3_A1_PLAZA` y las 6 Celdas Excavadas) en 11 Pasos (`Paso 1`–`Paso 11`) — 18/11/2026

Ejecución secuencial completa de los **11 pasos (`Paso 1` a `Paso 11`)** del **Bloque A (Zona A1)** sobre `prototypes/godot-retiro/scripts/retreat_scene_enhancer.gd`, `prototypes/godot-retiro/scripts/retreat_layout_builder.gd`, `prototypes/godot-retiro/scripts/interactive_prop.gd`, `prototypes/godot-retiro/scripts/player_token.gd` y `prototypes/godot-retiro/scripts/vtt_campaign_data.gd`, siguiendo las 4 imágenes de referencia del usuario y conservando el resto de zonas (`Z1`, `Z2`, `Z4`–`Z11`) y el trabajo paralelo de campañas/personajes.

### Registro de Activos, Nodos y Correspondencia Visual (`Bloque A — A1`)

| Paso | Sub-objetivos | IDs / Nodos propietarios | `VA` / Referencia | Estado |
| --- | --- | --- | --- | --- |
| **Paso 1** | `1.1–1.8` Acantilado basáltico estratificado, 7 contrafuertes, cierres oeste/este y portales profundos (`1.40m`) | `ExcavatedCaveRoofs`, `A1_ExcavatedCliffMass`, `A1Buttress_0..6_T0..2`, `A1WestFlankStrata_*`, `A1EastFlankStrata_*`, `ThresholdSlab_cell_*` (`retreat_scene_enhancer.gd`) | `VA-01`, `VA-02`, `VA-05` · Refs. 1–4 | VERIFICADO TÉCNICAMENTE · REVISADO VISUALMENTE |
| **Paso 2** | `2.1–2.8` Interiores de caverna excavada en las 6 celdas, lajas individuales, esteras de yute, hornacinas con libros/velas, tapices y luz cálida doble | `ExcavatedShell_cell_*`, `CaveRockNiche`, `MonasticWallTapestry`, `CellCaveSanctuaryLight_*`, `CellCaveBackAlcoveLight_*`, lajas `y_a1 + 0.092` (`retreat_scene_enhancer.gd`) | `VA-03`, `VA-06`, `VA-11` · Ref. 4 | VERIFICADO TÉCNICAMENTE · REVISADO VISUALMENTE |
| **Paso 3** | `3.1–3.8` Ocultación dinámica inmediata y reversible al entrar/enfocar + puertas monásticas entreabiertas | `CellDoor_cell_1..6`, `update_cave_roof_cutaways` con histéresis `+0.45m` (`retreat_scene_enhancer.gd`) | `VA-14`, `VA-16` | VERIFICADO TÉCNICAMENTE · REVISADO VISUALMENTE |
| **Paso 4** | `4.1–4.7` Jerarquía compositiva de plaza y estatua de Astalagan centrada/elevada con circulación 360° | `A1PlazaProp__a1_astalagan-weathered-stone` en `(85.80, 9.54, 93.35)`, `AstalaganCircularPedestal` (3 niveles + 8 velas votivas), bancos `Banco del Claustro` (`retreat_layout_builder.gd`, `retreat_scene_enhancer.gd`) | `VA-04`, `VA-08` · Refs. 1–3 | VERIFICADO TÉCNICAMENTE · REVISADO VISUALMENTE |
| **Paso 5** | `5.1–5.9` Pozo arquitectónico sin disco cian + mecánica interactiva de cantimplora y animación/audio de cubo | `MonasticFountainWell`, `WellRollerNode`, `WellRopeMesh`, `WellBucketRig`, `BucketWaterFill`, `Interactive_Well` (`interactive_prop.gd`, `vtt_campaign_data.gd`) | `VA-07`, `VA-12` · Refs. 1–3 | VERIFICADO TÉCNICAMENTE · REVISADO VISUALMENTE |
| **Paso 6** | `6.1–6.8` Iluminación nocturna en dos capas (lunar fría + focos cálidos locales) y sombras de contacto | `A1_NightLightingRig`, `A1PortalTorch_0..11`, `A1ParapetLantern_*`, 11 decals AO, `_optimize_scene_lights` (`distance_fade_enabled = false`) | `VA-09`, `VA-10`, `VA-15` · Ref. 3 | VERIFICADO TÉCNICAMENTE · REVISADO VISUALMENTE |
| **Paso 7** | `7.1–7.8` Macetas pareadas en portales, 7 parterres de mampostería, flores blancas/lavandas y útiles de jardinería | `CavePot_*`, `CaveHerbPot_*`, `A1RockHerbBed_*`, `MonasticWateringCan_*`, `StackedClayPot*`, `HerbBasket_*` (`retreat_layout_builder.gd`) | `VA-11`, `VA-13` · Refs. 1–4 | VERIFICADO TÉCNICAMENTE · REVISADO VISUALMENTE |
| **Paso 8** | `8.1–8.8` Asientos y camas interactivos (`[T]`) en bancos, taburetes de 4 patas, camastros y hamacas con recuperación de posición | `Interactive_Bed`, `Interactive_Hammock`, `Interactive_Bench`, `Interactive_Chair` (`retreat_scene_enhancer.gd`, `interactive_prop.gd`, `player_token.gd`) | `VA-16`, `VA-17` | VERIFICADO TÉCNICAMENTE · REVISADO VISUALMENTE |
| **Paso 9** | `9.1–9.6` Mobiliario sobrio (sin rojo/azul saturado en bancos), vida cotidiana monástica y especialización de celdas | `PilgrimPackCluster`, `DryingHerbBundles`, `MonasticLightStorage`, `CellContemplativeShrine`, `CloisterRefreshmentTable`, `ParapetFoldedBlanket`, `HearthFirewoodStack` (`retreat_scene_enhancer.gd`) | `VA-06`, `VA-12` · Refs. 3–4 | VERIFICADO TÉCNICAMENTE · REVISADO VISUALMENTE |
| **Paso 10** | `10.1–10.6` Fauna costera y ambiente sonoro suave | `A1_AmbientFauna`: `A1PerchedGull_0..5`, `A1GlidingGull_0..2`, `A1GardenButterfly_0..7`, `A1AmbientSoundscape` (`retreat_layout_builder.gd`) | `VA-13`, `VA-18` · Refs. 1–3 | VERIFICADO TÉCNICAMENTE · REVISADO VISUALMENTE |
| **Paso 11** | `11.1–11.8` Limpieza final de vanos, auditoría física/navegación, informe 11 pasos y benchmark FPS | `_should_drop_custom_glb_tri` (sin postes/barras en vanos), `verify_a1_step11.gd`, `output/retreat-a1-11steps-20261118/index.html` | `VA-01`..`VA-18` | VERIFICADO TÉCNICAMENTE · REVISADO VISUALMENTE |

### Pruebas Automatizadas y Rendimiento Vulkan Forward+ (tras la última edición)

- `verify_a1_step11.gd` (`task-6352`): **31 PASS / 0 FAIL** (`WalkableGrid` **137** celdas verificadas en Plaza A1 y **142** celdas en las 6 celdas excavadas; barrido físico `safe_frac=1.00` hacia las 6 puertas; cutaway reversible en `cell_1..cell_6`; conversión `cantimplora_vacia -> cantimplora_llena` y límite en segunda pulsación; `Interactive_Bed` e `Interactive_Bench` reversibles; iluminación día/noche y 17 nodos en `A1_AmbientFauna`).
- `res://scripts/test_retreat_layout.gd` (`task-6344`): **136 PASS / 0 FAIL**.
- `res://scripts/test_map_exits.gd` (`task-6352`): **128 PASSED, 0 FAILED**.
- `res://scripts/test_camera_contract.gd` (`task-6352`): **49 PASS / 0 FAIL**.
- `res://player/test_grid_navigation.gd` (`task-6364`): **12 passed, 0 failed**.
- `res://loading/test_map_roundtrip.gd` (`task-6352`): **24 passed; 0 failed**.
- `res://inventory/test_backpack.gd` (`task-6352`): **161 PASS / 0 FAIL**.
- **Rendimiento Vulkan Forward+ (`1600×900`, `SCALING_3D_SCALE=0.85`, NVIDIA GeForce MX350 — `task-6376`):** **`BELOW_30_FPS=[]`** (`0` zonas por debajo de 30 FPS):
  - `overview`: **43.9 FPS** (`34.1 p95`) · `Z1_beach`: **65.7 FPS** (`61.9 p95`) · `Z1_pleamar_cove`: **60.4 FPS** (`30.8 p95`) · `Z2_ascent`: **68.0 FPS** (`48.6 p95`).
  - `Z3_a1_plaza`: **54.0 FPS** (`51.1 p95`) · `Z3_a1_cell_in`: **63.2 FPS** (`59.1 p95`).
  - `Z4_a2_winch`: **77.0 FPS** (`70.9 p95`) · `Z5_a3_dining`: **69.5 FPS** (`64.4 p95`) · `Z6_a4_library`: **68.1 FPS** (`62.8 p95`) · `Z7_gardens`: **63.9 FPS** (`59.6 p95`) · `Z8_a5_temple`: **66.9 FPS** (`61.0 p95`) · `Z9_upper_walk`: **65.2 FPS** (`61.7 p95`) · `Z10_pleamar_high`: **73.2 FPS** (`33.4 p95`) · `Z10_obs_inland`: **72.0 FPS** (`66.0 p95`) · `Z10_obs_coast`: **80.7 FPS** (`72.9 p95`).
  - Rutas: `pleamar_coves.tscn` **157.0 FPS** (`135.0 p95`), `observatory_approach.tscn` **149.5 FPS** (`128.7 p95`), `pecio_cove_arrival.tscn` **166.2 FPS** (`141.6 p95`).

### Informe Interactivo Clic-a-Paso (`Base → Paso 1..11`)

- **Informe HTML interactivo:** [`output/retreat-a1-11steps-20261118/index.html`](../../output/retreat-a1-11steps-20261118/index.html)
  - 4 cámaras fijas (`1280×720`, modo `PROYECTOR`) × 12 estados (`step_00` Base a `step_11` Final = 48 capturas PNG con hash SHA-256) + 6 capturas en `roles/` (`a1_night_west_statue_well.png`, `a1_night_lighting.png`, `a1_well_interaction.png`, `a1_bed_and_bench_sit.png`, `a1_player_hud.png`, `a1_dm_hud.png`).
  - **Pendientes separados:** aceptación artística final de A1 por el usuario, siguientes bloques del plan Triple-A de Retiro (`Bloques B–F`) y pruebas físicas/multijugador ENet multi-dispositivo.

---

## Auditoría A1 y Retiro: Fauna sin Colisiones, Puertas Interactivas e Interacciones Animadas — 19/11/2026

Corrección integral solicitada sobre `prototypes/godot-retiro/` (conservando toda la geometría canónica y el catálogo de personajes):

1. **Fauna sin penetraciones de roca/muros (`retreat_layout_builder.gd`):**
   - `A1PerchedGull_0..5`: asentamiento automático por raycast físico + muestreo de triángulos sobre mallas visuales (`VaultMesh`, contrafuertes y remates `A1GullPerchCapstone_*` en pretil sur) con verificación de esfera libre (`r = 0.20m`, **0 hits**).
   - `A1GlidingGull_0..2`: órbitas desplazadas limpiamente sobre la bahía abierta al sur del acantilado (`z >= 107.8m`) con verificación de 36 muestras por órbita (108 muestras totales, **0 hits físicos ni visuales**).
   - `A1GardenButterfly_0..7`: centros elevados sobre flores abiertas con radio compacto y 96 muestras verificadas (**0 hits**); eliminada además la flor de cornisa flotante que quedaba visible sobre el interior de Celda 1 al abrir el *cutaway*.
2. **Puertas abatibles interactivas en las 6 Celdas de A1 + A2 (`interactive_door.gd`, `retreat_scene_enhancer.gd`, `vtt_role_ui.gd`):**
   - `CellDoor_cell_1..6` (hoja doble de roble con herrajes y bisagras animadas) y puerta de A2 registradas en `interactive_doors` y expuestas tanto al Jugador (`[T]` / botón HUD dinámico `[T] Cerrar` ↔ `[T] Abrir`) como al panel del DM (`VttRoleUi.get_scene_doors()` devuelve las **7 puertas**).
   - Colisión física `DoorBlockerBody` activa al cerrarse y desactivada al abrirse (inician abiertas para preservar `WalkableGrid` con 1.060 casillas transitables), con empuje seguro fuera del umbral y audio procedural de bisagras/cerrojo.
3. **Sprites registrados (8-dir sentarse + 3D tumbado con manta) y 84 props interactivos animados (`player_token.gd`, `seated_character_surface.gd`, `resting_character_surface.gd`, `resting_body_mesh.gd`, `shaders/rest_blanket.gdshader`, `interactive_prop.gd`, `vtt_role_ui.gd`, `vtt_player_hud.gd`):**
   - Integración de `Registry.with_animations()` y superficies 3D portadas de Campamentos (`SeatedCharacterSurface` 8 direcciones + `RestingCharacterSurface` con `RestBlanket`) para **Mia, Trinity y Mike** (`PilgrimBed` ajustado a `1.86m` útiles para encajar también la talla de Mike).
   - **84 objetos interactivos en 21 categorías** con animación de personaje, efectos y audio procedural: camas (4), hamacas con balanceo (8), bancos multiplaza (14), taburetes y cojín de contemplación (7), puertas (7), hogueras y braseros con encendido/avivado diurno `set_local_fire_state` (5 + 2 + 1 fogón cocina A3), pozo del claustro con polea/cubo/cantimplora (1), baúles con tapa abatible `ChestLidPivot` (3), banco de artesanía con engranaje giratorio `BrassGearPivot` (1), altares con oración y encendido de velas votivas (3), cabrestante A2 por `[T]` (1), leñera recolectable `lena_seca` (1), regaderas monásticas con gotas (3), herboristería, armero, tablón de avisos, refrigerios, escritorios/mesas (9) y estanterías (10).
   - HUD de Jugador actualizado en tiempo real (`_sync_nearby_interaction_prompt`), prioridad segura `[T] Levantarse` al estar sentado/tumbado, etiqueta de zona sincronizada en Retiro y accesos rápidos de poses/gestos en el menú *Acciones*.

### Verificación Técnica, Visual y GPU tras la Última Edición

- `verify_a1_fixes_audit.gd` (`task-6715`): **37 PASS / 0 FAIL**.
- Suites oficiales (`task-6662`): `test_retreat_layout.gd` **136 PASS / 0 FAIL** · `test_map_exits.gd` **128 PASSED, 0 FAILED** · `test_camera_contract.gd` **49 PASS / 0 FAIL** · `player/test_grid_navigation.gd` **12 passed, 0 failed** · `loading/test_map_roundtrip.gd` **24 passed; 0 failed** · `inventory/test_backpack.gd` **161 PASS / 0 FAIL** (**547 PASS / 0 FAIL** total).
- **Rendimiento Vulkan Forward+ (`1600×900`, `SCALING_3D_SCALE=0.85`, NVIDIA GeForce MX350 — `task-6708`):** **`BELOW_30_FPS=[]`**:
  - `overview`: **56.9 FPS** (`51.5 p95`) · `Z1_beach`: **85.7 FPS** (`77.9 p95`) · `Z2_ascent`: **89.5 FPS** (`78.2 p95`) · `Z3_a1_plaza`: **69.6 FPS** (`64.5 p95`) · `Z3_a1_cell_in`: **82.7 FPS** (`74.6 p95`) · `Z4_a2_winch`: **99.2 FPS** (`89.1 p95`) · `Z5_a3_dining`: **90.0 FPS** (`78.8 p95`) · `Z6_a4_library`: **88.0 FPS** (`77.8 p95`) · `Z8_a5_temple`: **73.6 FPS** (`60.6 p95`).
- **Informe visual interactivo (comparativa clic-superponer puertas abiertas/cerradas + capturas de interacciones y fauna):** [`output/retreat-a1-fixes-audit-20261119/index.html`](../../output/retreat-a1-fixes-audit-20261119/index.html). Aceptación visual final del usuario pendiente.

---

## Micromejoras visuales transversales y locales (atmósfera, AO de contacto y señales) — 19/11/2026

- **Cambios en `prototypes/godot-retiro/`:**
  - `scripts/retreat_layout_builder.gd`: `_apply_atmosphere_lighting()` actualiza `ProceduralSkyMaterial` y `env.fog_light_color` en `day`, `dusk` y `night`; `_get_contact_shadow_material()` cachea materiales radiales por alpha y `_build_interior_contact_ao()` coloca sellos de contacto bajo A5 (`ParthenonColBaseLow_*`, `TempleBrazier_*`), A3 (`A3TableAO_*`, `A3BenchAO_*`, `A3StoveAO`, `A3PrepIslandAO`, `A3BarrelAO_*`), A4 (`A4WallCaseAO_*`, `A4IslandCaseAO_*`, `A4MapTableAO`, `A4PedestalAO`, `A4DeskAO_*`, `A4StoolAO_*`) y plaza A1 (`A1PergolaTableAO`, `A1SupplyAO`).
  - `scripts/player_token.gd`: escala `ContactShadow` a estatura canónica, atenúa sombra aérea (`1.0 → 0.38`), añade pulso orgánico a `SelectionRing` (respetando `SkillLoading.reduced`) y atenúa alpha (`0.28`) desactivando emisión en sigilo.
  - `scripts/map_exit.gd`: `_setup_hanging_sway()` añade pivote superior `SignpostSwingPivot` (`±0.024 rad`) a `dragon_plaque` respetando `SkillLoading.reduced` sin alterar `SignpostProp.global_transform`.
- **Verificación tras el último cambio (`task-1998`):** `test_retreat_layout.gd` **136 PASS / 0 FAIL**, `test_map_exits.gd` **128 PASSED, 0 FAILED**, `test_camera_contract.gd` **49 PASS / 0 FAIL**. Comparativas Forward+ `1440×810` en [`output/micro-visual-improvements-20261119/index.html`](../../output/micro-visual-improvements-20261119/index.html). Aceptación visual y pruebas físicas separadas.

---

## Segunda auditoría visual y plan de mejoras (Fases 0–7) — 24/11/2026

Ejecución completa de las **8 fases (Fases 0 a 7)** solicitadas sobre `prototypes/godot-retiro/` tras la revisión de los 14 ángulos iniciales, conservando planta canónica, cotas, `WalkableGrid` (`1.044` casillas transitables), contratos de cámara/salidas, interacciones `[T]` y el trabajo paralelo del repositorio.

### Matriz de cambios de arte, geometría y materiales

| Fase | Objeto / Material ID | Archivo propietario | Recurso / valor anterior | Derivado / valor candidato | VA / Referencia | Aceptación |
| --- | --- | --- | --- | --- | --- | --- |
| **F1** | `A5_PromontoryMassif`, `A5_TempleFoundation`, `TempleButtress*` | `scripts/retreat_temple_and_cliffs.gd` | `TemplePlinthCliff` (prisma cúbico oscuro flotante) | Macizo volcánico 18×40 facetado (`y = -2,8..25,35 m`), 15 hombros basálticos, crepidoma de caliza y 7 contrafuertes funcionales | `VA-01`, `VA-02`, `VA-05` | Verificado técnicamente · Revisado visualmente · Usuario pendiente |
| **F1** | `Retreat_WestCliffButtress` | `scripts/retreat_temple_and_cliffs.gd` | 9 pilares cónicos lisos verticales | 12 bancadas basálticas estratificadas facetadas ancladas a `y = -2,4 m` | `VA-02`, `VA-05` | Verificado técnicamente · Revisado visualmente · Usuario pendiente |
| **F1** | `A5_WidenedBridge` | `scripts/retreat_winch_and_stairs.gd` | Escalones sueltos en diente de sierra | Viaducto de canto continuo (`2,04 m`), 4 pilares cimentados, 3 arcos con dovelas, descansillos, postes en plintos y 3 faroles | `VA-02`, `VA-05`, `VA-14` | Verificado técnicamente · Revisado visualmente · Usuario pendiente |
| **F2** | `ParthenonColumn_0..3`, `TempleRearSanctuaryWall`, `TempleRoofCutawayGroup` | `scripts/retreat_temple_and_cliffs.gd`, `scripts/retreat_scene_enhancer.gd` | 4 cilindros lisos, 2 planos de tejado y disco `PedimentSunburst` | Columnas acanaladas con capiteles alados, muro trasero con hornacina, 9 hiladas de pizarra/imbrices/pares, tímpanos doble cara con relieve de Bahamut y cutaway independiente `"a5_temple"` | `VA-03`, `VA-04`, `VA-08` | Verificado técnicamente · Revisado visualmente · Usuario pendiente |
| **F3** | `A5_SacredInterior` (pavimento, tapiz, estrado, altar, bancos, braseros, urnas, motas) | `scripts/retreat_temple_and_cliffs.gd`, `scripts/retreat_layout_builder.gd` | Plataforma lisa, sin jerarquía de altar y canarios flotantes | Pavimento octogonal, tapiz azul zafiro/oro, estrado + `BahamutOfferingAltar` `[T]`, 2 bancos `[T]`, 4 braseros con aro toroidal y carbón/brasas, urnas con laurel, 7 canarios asentados y motas `GPUParticles3D` | `VA-04`, `VA-06`, `VA-12` | Verificado técnicamente · Revisado visualmente · Usuario pendiente |
| **F4** | `make_basalt_outcrop_mesh`, `MM_CliffFractureRibs`, `Z1Z2_CoastalGeologicalReefs` | `scripts/retreat_scene_enhancer.gd`, `scripts/retreat_layout_builder.gd`, `scripts/retreat_temple_and_cliffs.gd` | Conos lisos en rocas/escollos y borde recto sumergido en Z1/Z2 | Basalto multifacetado (`smooth_group = -1`) con meseta erosionada, costillas anchas sin cizalla y arrecifes escalonados en Z1/Z2 | `VA-01`, `VA-02`, `VA-05` | Verificado técnicamente · Revisado visualmente · Usuario pendiente |
| **F4** | `UpperMountainGeology`, `buttress_specs` | `scripts/retreat_upper_architecture.gd` | Cavidades rectangulares negras y remates salientes sobre A4/A3 | Placas con faldón inferior ataludado, respaldo geológico y contrafuertes enrasados bajo la cornisa | `VA-02`, `VA-05` | Verificado técnicamente · Revisado visualmente · Usuario pendiente |
| **F4/F7** | `ocean_shader` (`OceanPlane`) | `scripts/retreat_layout_builder.gd` | `ROUGHNESS = 0,08..0,64`, `SPECULAR = 0,60` (blanco quemado en `03`) | `ROUGHNESS = 0,42..0,78`, `SPECULAR = 0,09`, `METALLIC = 0,0`, `NORMAL_MAP_DEPTH = 0,36` | `VA-09`, `VA-15` | Verificado técnicamente · Revisado visualmente · Usuario pendiente |
| **F5** | Bosque unificado, `Z7_TerracedSanctuaryGardens`, `PaseoOverlook*` | `scripts/retreat_layout_builder.gd`, `scripts/retreat_scene_enhancer.gd`, `scripts/retreat_temple_and_cliffs.gd` | Pinos cónicos y olivos esféricos Babylon (`~938K` tris), Z7 escaso y hilera continua de 21 jardineras en Z9 | Omisión de árboles cónicos Babylon, copas mediterráneas facetadas con raíces, 4 bancales Z7 con pila/pérgola/flora de repisas y 4 miradores abiertos en Z9 | `VA-11`, `VA-13`, `VA-18` | Verificado técnicamente · Revisado visualmente · Usuario pendiente |
| **F6** | Pulido localizado A1, A2, A3 y A4 | `scripts/retreat_scene_enhancer.gd`, `scripts/retreat_winch_and_stairs.gd`, `scripts/retreat_interiors_a3_a4.gd`, `scripts/retreat_layout_builder.gd` | Abismo trasero y pilares seta en A1; grieta triangular/corte diagonal y estante vacío en A2; losa oscura plana y borde SW en A3; cuñas y cajitas repetitivas en A4 | Muro trasero permanente + estratos + 3 miradores sur en A1; pilar de esquina + transición orgánica NO + utillaje/cabo en A2; losas `MM_A3_KitchenSlateFlags`, `a4_mesh x1 = 112,75` y repisas variadas en A3; ceja continua + 6 remates eruditos distintos + lámparas en A4 | `VA-03`, `VA-06`, `VA-11`, `VA-12` | Verificado técnicamente · Revisado visualmente · Usuario pendiente |
| **F7** | Atmósfera, exposición y sombras (`day`/`dusk`/`night`) | `scripts/retreat_layout_builder.gd`, `scenes/main.tscn` | `ambient_light_energy = 0,38..0,43`, `shadow_max_distance = 125 m` | `ambient_light_energy = 0,54` (día) / `0,50` (ocaso-noche), `tonemap_exposure = 1,02`, `shadow_max_distance = 155 m` | `VA-09`, `VA-10`, `VA-15` | Verificado técnicamente · Revisado visualmente · Usuario pendiente |

### Separación de verificaciones (tras el último cambio)

1. **Pruebas técnicas automatizadas (`task-2792`, todas `exit 0`):**
   - `res://scripts/test_retreat_layout.gd`: **152 PASS / 0 FAIL** (`WalkableGrid`: `1.044` casillas transitables).
   - `res://scripts/test_map_exits.gd`: **128 PASSED / 0 FAILED**.
   - `res://scripts/test_camera_contract.gd`: **49 PASS / 0 FAIL**.
   - `res://player/test_grid_navigation.gd`: **12 passed / 0 failed**.
   - `res://loading/test_map_roundtrip.gd`: **24 passed / 0 failed**.
   - **Total:** **365 / 365 PASS · 0 FAIL**.
2. **Revisión visual e informe interactivo (`task-2774`, `1440×810` Vulkan Forward+ MX350):**
   - **Informe Antes/Después clic-superponer (19 pares, `MISSING_ASSETS=0`, reutilizando `scripts/lib/visual-comparison.mjs`):** [`output/retreat-audit2-20261123/index.html`](../../output/retreat-audit2-20261123/index.html) y registro SHA-256 en [`output/retreat-audit2-20261123/records.json`](../../output/retreat-audit2-20261123/records.json).
   - **Telemetría GPU registrada en Forward+ (`1440×810`, MX350):** `01` (`1.239` draws, `1,11M` prims), `09` (`1.709` draws, `1,72M` prims), `12` (`740` draws, `0,99M` prims), `14` (`5.755` draws, `2,44M` prims), `1.262 MB` VRAM (la cadencia de reloj de pared `~189 ms` en captura automatizada refleja limitación DWM de ventana en segundo plano; el perfilado de FPS interactivo en primer plano queda en validación física).
3. **Aceptación del usuario:** pendiente de revisión directa de las 19 comparativas interactivas y prueba jugable.
4. **Pruebas físicas / dispositivo y red:** pendientes en pantalla real en primer plano (FPS sostenido MX350), control táctil/teclado y sincronización multijugador ENet.



