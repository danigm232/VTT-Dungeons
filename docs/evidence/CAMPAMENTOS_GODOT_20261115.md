# Migración de los cinco campamentos a Godot Engine 4.7.2 Forward+

**Fecha:** 15/11/2026  
**Proyecto destino:** `prototypes/godot-campamentos/` (Engine: Godot v4.7.2-stable Forward+)  
**Fuente preservada sin cambios:** `campaigns/camp-rests/` (`public/pack.ts`, `public/a1-layout.ts`, `public/a1-visuals.ts`, `public/outdoor-props.ts`)

---

## 1. Escenas migradas y métricas canónicas exportadas

Script reproducible de exportación y staging: `scripts/export-camps-godot-bundle.mjs` (`node --import tsx scripts/export-camps-godot-bundle.mjs` -> `prototypes/godot-campamentos/assets/data/camps-layout.json` y 1.398 recursos en `prototypes/godot-campamentos/assets/` + módulos compartidos).

| ID de campaña | Título | Escena `.tscn` | Rejilla (1.5 m/celda) | Transitables | Obstáculos | Puntos interactivos | Elementos característicos implementados |
| --- | --- | --- | --- | ---: | ---: | ---: | --- |
| `camp-a1-rooms` | `01 · Habitaciones A1` | `scenes/camp_a1_rooms.tscn` | `48 × 22` (`72 × 33 m`) | 467 | 29 | 10 | Misma zona exacta de **El Retiro del Dragón** montada mediante `RetreatLayoutBuilder` desplazada `-A1_TRANSLATION` (`-72, -9, -72`): GLBs `retreat_architecture_canon.glb`, `retreat_geography_stone.glb` y `retreat_landscape_r3.glb`, 6 bóvedas esculpidas (`CaveRoof_cell_1..6` -> `CutawayRoof_cell-1..6`) con puertas/carteles y mobiliario interior (camas, mesa de artífice, escritórios, cofres), estatua esculpida de Astalagan + altar, pozo, hoguera/caldero/trípode con llama animada de `CampAtmosphereFx`, bancos, pérgolas, balaustrada, acantilado y mar, además de colisionadores de `blockedEdges`. |
| `camp-forest-pleamar` | `02 · Bosque camino a Pleamar` | `scenes/camp_forest_pleamar.tscn` | `24 × 22` (`36 × 33 m`) | 283 | 61 | 16 | Arroyo serpenteante animado (`forestStream.samples`), sendero erosionado, 14 coníferas + bosque perimetral, 3 tiendas *cutaway* + 3 baúles abatibles + enseres, hoguera, puesto de guardia y fauna animada CC0 (`quaternius_cc0-deer-908.glb` y `quaternius_cc0-stag-1373.glb`). |
| `camp-wreck-beach` | `03 · Playa del pecio` | `scenes/camp_wreck_beach.tscn` | `25 × 22` (`37.5 × 33 m`) | 266 | 60 | 16 | Playa arenosa con loma norte, mar con shader de oleaje y banda de espuma (`BreakingSurfRibbon`), 8 rocas costeras, bote varado con bancos y remo, 3 tiendas/baúles/enseres, hoguera y farol de guardia. |
| `camp-cliffs-observatory` | `04 · Acantilados del Observatorio` | `scenes/camp_cliffs_observatory.tscn` | `25 × 22` (`37.5 × 33 m`) | 261 | 62 | 16 | Meseta de basalto elevada sobre océano a `-15.5 m`, 4 pilares hexagonales, 4 cúmulos de cristales arcanos emisivos con luz cian, 3 cintas de aurora 3D, nubes a la deriva y relámpagos en tormenta. |
| `camp-coastal-refuge` | `05 · Refugio costero de Pleamar` | `scenes/camp_coastal_refuge.tscn` | `25 × 22` (`37.5 × 33 m`) | 279 | 59 | 16 | Saliente rocoso con techo *cutaway* sobre la mitad norte, hiedra colgante, gotas de agua animadas desde bóveda, charcas mareales someras dentro de celdas, 3 tiendas/baúles/enseres y hoguera. |

---

## 2. Arquitectura y sistemas integrados

- **Carga y núcleo (`scripts/camp_structure.gd`, `scripts/camp_scene_controller.gd`, `loading/loading_boot.gd`):** carga de `camps-layout.json`, soporte CLI `--camp=<id>` y transición viva entre los 5 campamentos desde el menú DM (`switch_camp_scene`).
- **Materiales, agua y ambiente (`scripts/camp_material_kit.gd`, `scripts/camp_atmosphere_fx.gd`):** PBR texturizado con mapas normales (roca, madera, tela, metal), shader oceánico/arroyo sin lavado especular, respuesta a humedad/nieve, ciclos `day`/`arrival`/`dusk`/`night`/`dawn` con niebla de profundidad (`FOG_MODE_DEPTH`) desactivada en clima despejado para nitidez táctica, partículas GPU de lluvia y nieve, aves diurnas y luciérnagas nocturnas.
- **Constructores (`scripts/camp_a1_builder.gd`, `scripts/camp_outdoor_builder.gd`):** A1 reutiliza directamente la escena esculpida de A1 de `prototypes/godot-retiro/` (`RetreatLayoutBuilder` + `RetreatSceneEnhancer` + `ObjectOcclusionController` + módulos `.glb` alineados 1:1 en `0..72 × 0..33 m`, desactivando portales `Exit_*` de transición entre mapas de campaña y manteniendo `A1WalkableFloor`, `blockedEdges`, luz táctica, llama animada en el hogar y *cutaways* en `CutawayRoof_cell-1..6`); los campamentos exteriores construyen tiendas *cutaway*, baúles con pivote animado (`toggle_chest`), hoguera con combustible decreciente según clima y actividades interactivas (`tend-fire`, `warm`, `cook`, `sit`, `rest`, `chest-toggle`, `guard`, `study`).
- **Cámara 2.5D y rejilla (`scripts/camp_camera.gd`, `scripts/tactical_grid_overlay.gd`):** contrato 2.5D completo (`TacticalCamera` sobre `vtt_camera_base.gd`), paso automático 10° interior / 25° exterior, preajustes por habitación/tienda/hoguera y rejilla táctica 1.5 m controlada por rol.
- **Audio (`scripts/camp_audio_manager.gd`) e interfaces (`scripts/vtt_role_ui.gd`, `scripts/vtt_dm_hud.gd`, `scripts/vtt_player_hud.gd`):** perfiles ambientales por campamento (`assets/audio/`) más roles `JUGADOR · F1`, `DM · F2` (selector de los 5 campamentos, clima/hora, cámara y control de hoguera/baúles) y `PROYECTOR · F3`, junto a los módulos compartidos de carga (`loading/`, puerto `47922`), combate (`combat/`) y mochila RPG (`inventory/`).
- **Lanzadores:** `ABRIR-CAMPAMENTOS-GODOT.cmd` (menú `[1..7]` para cualquiera de los 5 campamentos + DM/Proyector y parámetros CLI) y opciones `[7..9]` integradas en `JUGAR-GODOT.cmd`.

---

## 3. Verificación ejecutada tras los cambios finales

1. **Importación de recursos (Godot v4.7.2 headless):** importación completa de los activos, fauna GLB (`deer` y `stag`) y módulos esculpidos del Retiro (`retreat_architecture_canon.glb`, `retreat_geography_stone.glb`, `retreat_landscape_r3.glb`).
2. **Pruebas específicas y de integración en `prototypes/godot-campamentos` (ejecutadas tras los cambios finales):**
   - `test_camps_layout.gd`: **69 passed, 0 failed**.
   - `test_camera_contract.gd`: **49 PASS / 0 FAIL**.
   - `loading/test_loading.gd -- --loading-port=47963`: **172 passed; 0 failed**.
   - `combat/test_combat_rules.gd`: **124 passed, 0 failed**.
   - `inventory/test_backpack.gd -- --loading-port=47965`: **149 PASS / 0 FAIL**.
3. **Capturas reales Forward+ (`scripts/capture_camps.gd` con GPU NVIDIA GeForce MX350, exit code `0`, `CAPTURE_DONE=8`) + informe comparativo superpuesto (`output/godot-campamentos-20261115/index.html` vía `scripts/lib/visual-comparison.mjs`, 1440×810, originales previos respaldados en `output/godot-campamentos-20261115/before/`):**
   - `output/godot-campamentos-20261115/camp-01-a1-rooms-day.png`
   - `output/godot-campamentos-20261115/camp-01-a1-cutaway-night.png`
   - `output/godot-campamentos-20261115/camp-02-forest-dusk.png`
   - `output/godot-campamentos-20261115/camp-02-forest-night.png`
   - `output/godot-campamentos-20261115/camp-03-wreck-beach-dusk.png`
   - `output/godot-campamentos-20261115/camp-04-cliffs-observatory-night.png`
   - `output/godot-campamentos-20261115/camp-05-coastal-refuge-dusk.png`
   - `output/godot-campamentos-20261115/camp-hud-dm.png`

---

## 4. Auditoría y mejora visual Triple-A (`camp-02`–`camp-05`, conservación intacta de A1 / Retiro)

Siguiendo `VISUAL_ART_DIRECTION.md`, `VISUAL_REFERENCE_LIBRARY.md` y `VISUAL_GAP_AUDIT_20261101.md` (VA-01..VA-18), se auditó y reconstruyó la capa visual de los cuatro campamentos exteriores dejando **`camp-a1-rooms` (`retreat_layout_builder.gd`, `retreat_scene_enhancer.gd`, `retreat_structure.gd`) y `prototypes/godot-retiro/` intactos**:

| Área / Objeto / Material | Archivo propietario | Estado anterior (auditoría) | Candidata Triple-A implementada | Criterio VA / Referencia | Aceptación |
| --- | --- | --- | --- | --- | --- |
| Fichas sobre suelo seco (`PlayerToken`) | `scripts/player_token.gd` (`is_water_at`) | Héroes nadando sobre tierra/piedra a cota `-0.025 m` | Detección explícita de agua real (`camp_structure.gd::is_water_at`), Mía y grupo erguidos sobre arena/basalto/musgo | VA-04 / Operativo táctico | Verificado en 4 renders |
| Rejilla táctica en exteriores | `scripts/tactical_grid_overlay.gd` | Líneas claras saturadas (>60% contraste visual) sobre suelos oscuros | Salvia sutil `#9ca696` (`opacity = 0.095` lineal, `thickness = 0.56`, solo `camp-02..05`; `camp-01` sin alterar) | VA-06 / `VISUAL_ART_DIRECTION.md` §9 | Verificado en renders 02–05 |
| Shader oceánico y de charcas (`create_water_shader_material`) | `scripts/camp_material_kit.gd` | Ruido cartesiano + manchas blancas en crestas y espuma en charcas sin UV | 6 trenes de ondas direccionales sin rejilla, Fresnel limpio y uniforme `shore_foam = 0.0` en arroyo/charcas mareales | VA-02, VA-13 / *Sea of Stars*, *Octopath II* | Verificado en `02`, `03`, `05` |
| Rocas y follaje exteriores (`_spawn_craggy_rock`, `_spawn_foliage_tuft`) | `scripts/camp_outdoor_builder.gd` | Cilindros lisos CC0 (`rocks-a/b/c`) y matojos verde menta plásticos | Rocas facetadas procedurales con desplazamiento + texturas PBR (`a1-cliff-organic-v7`, `a1-cliff-rugged-v8`, `basalt-coastal`) y helechos/carrizos *alpha-cut* (`foliage-atlas-v5`) | VA-01, VA-05, VA-08 / Familia compartida Retiro | Verificado en `02`–`05` |
| Tiendas, botes, barriles y mobiliario | `scripts/camp_outdoor_builder.gd`, `assets/models/` | Cajas simples saturadas (`colormap.png`) y cumbrera sobredimensionada | Tiendas proporcionadas (`2.28 m`), estacas/cuerdas tensadas, farol de latón, mesas/catres y tintado madera roble envejecido en `barrel`/`crate`/`boat-row-large`/`ship-wreck` | VA-07, VA-09 / *Witchbrook*, *FFT 2025* | Verificado en `02`–`05` |
| Bosque, Observatorio y Refugio (`_build_sculpted_surround_skirt`, auroras, bóveda) | `scripts/camp_outdoor_builder.gd`, `camp_atmosphere_fx.gd` | Banda inferior oscura en Bosque, rocas flotantes y auroras fuera de plano en Observatorio, arco separado en Refugio | Faldón sur plano extendido + musgo vivo en Bosque; rocas ancladas al labio de basalto + 3 cortinas de aurora visibles en Observatorio; muro trasero y contrafuertes unidos sin hueco al voladizo *cutaway* en Refugio + espuma continua en orilla | VA-03, VA-10, VA-12 / Encuadre y lectura vertical | Verificado en renders finales |

---

## 5. Alcance local y pendientes separados

- Candidata ejecutable y verificada localmente en Godot 4.7.2 Forward+; no modifica las escenas Babylon de `campaigns/camp-rests/` ni los prototipos paralelos `prototypes/godot-pecio/` y `prototypes/godot-retiro/`.
- Quedan separados para hitos posteriores: sincronización multijugador/red entre dispositivos y persistencia web de campaña, pruebas en dispositivos físicos y aceptación artística final del usuario sobre la comparativa `output/godot-campamentos-20261115/index.html`.


---

## 6. Rediseño integral de los cuatro campamentos exteriores (rama `feat/godot-camps-redesign` · 16/11/2026)

Reconstrucción completa en Godot 4.7.2 Forward+ de los cuatro campamentos exteriores (`camp-forest-pleamar`, `camp-wreck-beach`, `camp-cliffs-observatory`, `camp-coastal-refuge`) preservando íntegramente `camp-a1-rooms` (`retreat_layout_builder.gd`, `retreat_scene_enhancer.gd`, `retreat_structure.gd`, `prototypes/godot-retiro/` y Pecio C1–C9).

### Cambios arquitectónicos y visuales aplicados
- **Layout canónico orgánico ya montado (`campaigns/camp-rests/public/pack.ts` -> `assets/data/camps-layout.json`):** eliminadas tiendas cerradas `4,5 × 4,5 m`, baúles, mesas de campaña, bancos con tableros/cojines, postes/torres de guardia, medallón de bronce en Acantilados y braseros artificiales en Refugio. Núcleos asimétricos de ~8–12 m adaptados al bioma con identidad compartida de puntos de interacción (`*-bed-*`, `*-chest-*` como mochila personal, `*-kit-*`, `*-fire-point`, `*-seat-*`, `*-guard-point`).
- **Módulos reutilizables compartidos:**
  - `scripts/camp_prop_factory.gd` (`CampPropFactory`): `create_bedroll` (con estados `prepared` / `occupied` / `rolled`), `create_backpack` (cuero/lona con bolsillo lateral, manto enrollado y solapa articulada en `ChestLidPivot`), `create_campfire_hearth_kit` (anillo irregular de piedras, olla en trípode, leña, sartén, saco de víveres, 2 cantimploras y cuerda enrollada), `create_canvas_shelter` (toldo de lona `3 × 2,6 m` entre árboles en Bosque; paraviento bajo con lastre de piedras en Playa; lona muy baja sin mástiles en Acantilados; **cero lonas en Refugio Costero**), `create_natural_seat` (tronco caído con musgo, madero de deriva, lajas de basalto/piedra), `create_personal_kit` (libro de conjuros abierto y bolsa de Mike, símbolo sagrado de bronce y estera de Mia, estuche enrollable de herramientas y piedra de afilar de Trinity), `create_portable_lantern` (apagado en `day`/`arrival` claro).
  - `scripts/camp_environment_kit.gd` (`CampEnvironmentKit`): variantes de roca, árboles multi-especie (`append_tree`), helechos, carrizos/espadañas, arbustos con bayas (`spawn_woodland_shrub`), brezo, saxífragas y flores por bioma recortando los **cuadrantes botánicos 2×2 de `foliage-atlas.png` / `foliage-atlas-v5.png` a resolución 4×** con shader de viento y mapas de normales (`_get_quad_mat`, `spawn_hanging_vine`), más almohadillas de musgo con relieve y hongos agrupados (`amanita`, `porcini`, `chanterelle`, `parasol`, `puffball`).
  - `scripts/camp_fauna_kit.gd` (`CampFaunaKit`): síntesis en caché de texturas procedurales con mapas de normales por especie (`feather`, `fur`, `turtle`, `crab`, `scales`, `horn`, `butterfly`), ojos especulares, **alas aerodinámicas afiladas y plumaje con puntas en aves** (vuelo en los **cinco mapas** + posadas animadas), cuernos anillados en íbice, conejos/liebres, zorro, tortuga marina con placas hexagonales, cangrejos y **peces con aletas dorsales/pectorales/caudales tanto en el río como ocasionales y saltarines en el mar** (`swim_fish`, `swim_ocean_jump` en `StreamTrout_0..2`, `SeaFish_0..1`, `CaveFish_0..2`, `SeaFish_Cove_0`).
  - `scripts/camp_material_kit.gd`: agua de río y orilla marina traslúcidas (`ALPHA` reducido en someros) para que el lecho de grava, las truchas del río y los peces costeros sean claramente visibles, además de `create_foliage_wind_shader_material` y PBR (`make_leather_mat` / `make_bronze_mat`).
  - `scripts/camp_outdoor_builder.gd`, `scripts/camp_atmosphere_fx.gd`, `scripts/camp_scene_controller.gd`, `scripts/vtt_dm_hud.gd` y `scripts/vtt_campaign_data.gd`: bóveda rocosa continua (`GrottoCliffShell` + `RockyOverhangLip` + hiedra recortada colgante), **hoguera nocturna automática** con **control manual (`fire-toggle`)**, **partículas radiales por bioma** y poblamiento completo de fauna/flora por bioma sin tocar `camp-a1-rooms`.

### Verificación tras los últimos cambios
- **Suites headless ejecutadas sobre la candidata final:**
  - `scripts/test_camps_layout.gd`: **127 passed, 0 failed** (incluye textura/normal procedural en fauna, peces de río y mar en Bosque/Playa/Refugio, aves 3D en los 5 mapas, flora recortada por bioma, río traslúcido `> 140 m`, hoguera diurna apagada / nocturna encendida + `fire-toggle`/`tend-fire`, partículas, estaturas raciales canónicas, sentado/petates, cero lonas en Refugio y conservación de `camp-a1-rooms`).
  - `scripts/test_camera_contract.gd`: **49 PASS / 0 FAIL**.
  - `loading/test_loading.gd`: **172 passed; 0 failed**.
  - `combat/test_combat_rules.gd`: **124 passed, 0 failed**.
  - *Nota:* `inventory/test_backpack.gd` quedó fuera de este proyecto porque carga `res://scenes/main.tscn`.
- **Capturas Forward+ y perfilado en GPU real (`NVIDIA GeForce MX350`, `scripts/capture_camps.gd`, `CAPTURE_DONE=12`, `1440×810`):**
  - Verificadas visualmente las 12 capturas: Playa `43,9–44,9 FPS`, Acantilados `45,5–57,5 FPS`, Refugio `34,9–39,5 FPS`, Bosque `23,9–29,9 FPS` (`25,4 FPS` en vista DM, con pico inicial de arranque solo en la primera captura A1). Truchas visibles en la corriente del río, peces en poza y rompiente costera, flora detallada y fauna con pelaje/plumaje/caparazón/escamas texturizados.
  - Comparativa interactiva Antes vs Después con registro SHA-256 en [output/godot-campamentos-redesign-20261115/index.html](../../output/godot-campamentos-redesign-20261115/index.html).

### Separación de estados
- **Técnico:** suites de campamentos, cámara, cargas y combate en verde; `inventory/test_backpack.gd` requiere `res://scenes/main.tscn` fuera del alcance de `campamentos`.
- **Visual:** inspeccionadas las 12 capturas Forward+ en primer plano y panorámica.
- **Pendientes separados:** aceptación artística del usuario sobre la comparativa, pruebas en dispositivos físicos y sincronización/guardados web.

---

## 7. Ampliación de río animado y flora en `camp-forest-pleamar` (`02 · Bosque camino a Pleamar`, 17–18/11/2026)

Encargo explícito del usuario: alargar el río de la escena camino a Pleamar, dotarlo de animación tipo río y añadir mucha más flora (más tipos de árboles, arbustos, helechos, flores y setas), manteniendo intactos el claro jugable, las colisiones, los puntos interactivos y el resto de campamentos.

| Elemento / ID | Archivo propietario | Estado anterior | Candidata implementada | VA / Referencia | Estado |
| --- | --- | --- | --- | --- | --- |
| `ForestOrganicStream` / `ForestStreamBed` | `prototypes/godot-campamentos/scripts/camp_outdoor_builder.gd`, `camp_material_kit.gd` | Tramo corto (`-6..+42 m`) con cortes visibles en extremos, suelo `earth.webp` y shader plano sin flujo por canal | Trazado continuo norte–sur (`-47.5..+102.0 m`, >140 m) con valle tallado en `OuterTerrainSkirt` (`72×58`), lecho de guijarros `stream.jpg`, puente artesanal de tablones `StreamFootbridge` y `create_river_shader_material` con UV de canal (`0..1` ancho, distancia aguas abajo), corriente central más rápida, estelas, espuma en orillas, mapa normal animado y respeto a `reduced_motion` (`flow_phase`). Omitido `ShallowWaterCells` cuadrado en `forest`. | VA-07, VA-15 / *Sea of Stars*, *Octopath II* | Construido y verificado |
| Árboles multi-especie (`ForestFlora_trunk_*`, `ForestFlora_canopy_*`, `ForestFlora_cards_willow`) | `prototypes/godot-campamentos/scripts/camp_environment_kit.gd`, `camp_outdoor_builder.gd` | 2 especies (`pine`, `oak`) en anillo único | 8 variantes agrupadas por lotes (`pine`, `spruce`, `oak`, `birch` de tronco claro, `beech`, `beech_copper`, `willow` ribereño con lianas colgantes, `sapling`, `snag`) fuera del claro y respetando el corredor visual sur | VA-09 / *Witchbrook*, *Sea of Stars* | Construido y verificado |
| Arbustos, helechos y flores (`ForestFlora_bush_*`) | `prototypes/godot-campamentos/scripts/camp_environment_kit.gd`, `camp_material_kit.gd`, `camp_outdoor_builder.gd` | Tarjetas de helecho sin recorte de cuadrante del atlas (`0..1`) | Recorte limpio por cuadrantes en `foliage-atlas-v5.png` y `foliage-atlas.png` (`laurel`, `holly`, `fern_yarrow`, `fern_tall`, `heather`, `meadow`) con `uv_rect` + `hang` en shader de viento para anclar raíces, agrupados en ribera, bordes, claros y troncos caídos (150+ conjuntos) | VA-08 / *Witchbrook* | Construido y verificado |
| Setas y troncos caídos (`ForestFlora_mush_*`) | `prototypes/godot-campamentos/scripts/camp_environment_kit.gd`, `camp_outdoor_builder.gd` | 2 pequeños grupos marrones junto al tocón | 5 variedades en lotes (`amanita` roja moteada, `porcini`, `chanterelle` dorado, `parasol`, `puffball`), anillo de hadas en el claro norte y 10 troncos caídos con hongos de repisa (`spawn_shelf_fungi`) | VA-08 / *Witchbrook* | Construido y verificado |

### Verificación tras la última edición
- `test_camps_layout.gd`: **105 passed, 0 failed** (incluye longitud del río `> 140 m`, shader con `flow_speed`, `reduced_motion`, variedad `>= 6` especies de árboles, `>= 60` árboles nuevos, `>= 150` arbustos/flores/helechos, `>= 25` grupos de setas y cero árboles nuevos dentro de la cuadrícula táctica).
- `test_camera_contract.gd`: **49 PASS / 0 FAIL**.
- `loading/test_loading.gd -- --loading-port=47968`: **172 passed; 0 failed**.
- `combat/test_combat_rules.gd`: **124 passed, 0 failed**.
- **Capturas Forward+ (`capture_forest_river.gd`, 6 pares antes/después 1440×810 en MX350, `25,1–29,1 FPS`):** [comparativa superpuesta con hashes SHA-256](../../output/godot-forest-river-20261117/index.html).
- **Separación de estados:** verificado técnicamente y revisado visualmente en las 6 vistas equivalentes; aceptación artística del usuario y pruebas en dispositivos físicos siguen pendientes.

## Fauna con comportamiento realista (18/11/2026)
Horarios por fase/clima, visitas intermitentes (ciclo/duty/offset), pausas de pasto/olfateo y huida ante el grupo (CampFaunaKit.set_behavior/update_agents). Nocturnos (zorro, ciervo macho, búho, murciélagos, cangrejos de cueva) ocultos de día; mariposas/pájaros diurnos recogidos de noche y con tormenta. Pruebas: camps_layout 142/0, camera 49/0, loading 172/0, combat 124/0. Capturas Forward+ 12/12 sin errores (comprobadas visualmente: bosque día sin zorro/ciervo macho; bosque noche con ciervo macho). Pendiente: revisión visual del usuario y pruebas físicas; errores previos get_visible_rect en dm_style/appearance.gd:93 durante la prueba headless.
