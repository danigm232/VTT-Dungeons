# Licencias y créditos

## Tipografía VTT y letreros de salida — 18/11/2026

Fuentes incluidas para todo el juego en `prototypes/godot-shared/ui/fonts/` y copias nativas (`assets/ui/fonts/` en `godot-retiro`, `godot-pecio` y `godot-campamentos`):
- [Metamorphous](https://github.com/google/fonts/tree/main/ofl/metamorphous) (`Metamorphous-Regular.ttf`, licencia **SIL Open Font License 1.1** en `Metamorphous-OFL.txt`): títulos, nombres de destinos y letreros.
- [Almendra](https://github.com/google/fonts/tree/main/ofl/almendra) (`Almendra-Regular.ttf`, `Almendra-Bold.ttf`, `Almendra-Italic.ttf`, licencia **SIL Open Font License 1.1** en `Almendra-OFL.txt`): textos narrativos, diálogos y botones.

Recursos gráficos de letreros aportados por el usuario para salidas de mapa y confirmación de viaje, conservados en `prototypes/godot-shared/ui/signs/` y copiados en `assets/ui/signs/`:
- `sign_hanging_ropes.png`: derivado con recorte alfa limpio desde `media_1794993453022_9250d7eb.jpg`.
- `sign_dragon_plaque.png`: cartela de madera con dragón alado y cadenas (`media_1794993453100_6db1b095.png`).
- `sign_dragon_post.png`: poste tallado con escamas de dragón y cartel direccional (`media_1794993453223_e649bc4b.png`).

## Ficha de personaje ilustrada en Godot — 16/11/2026

Refinamiento con Inventario: cinco PNG originales adicionales creados con la herramienta integrada de imágenes —cartela de estadísticas/ranuras, atlas de seis ornamentos, quince iconos pintados, tres cartelas y paisaje a tinta/acuarela—, hasta diecisiete materiales raster conservados. Se componen con controles nativos y sin texto de personaje incrustado. [Prompts y originales de esta pasada](prototypes/godot-shared/character_sheet/art/v4/sources.json), [manifiesto combinado](prototypes/godot-shared/character_sheet/asset-manifest.json). Referencia artística del usuario solo para estudio; ningún recurso se atribuye a un RPG comercial ni se declara CC0.

Tercera revisión: reutiliza esos materiales y añade dibujo nativo original en `character_sheet/sheet_widgets.gd`: esquinas a tinta, cartelas con textura del cuero existente, insignias, escudo, pictogramas y viñeta de montaña/fortaleza. Crimson Pro 700/650 conserva la caja normal del nombre y los títulos; no se modifica ningún binario de fuente. [Propietarios y derivación](prototypes/godot-shared/character_sheet/art/v3/sources.json). No se incorpora arte de un RPG comercial ni se genera una ficha completa como imagen.

Doce recursos originales creados con la herramienta integrada de imágenes: los cuatro materiales iniciales (pergamino, hornacina, cartela y atlas de doce grabados) más tres retratos basados en los sprites actuales, tres escenarios vacíos decorativos, una cenefa de hojas talladas y un atlas de 24 ilustraciones adicionales. Son materiales reutilizables; los textos y datos siguen siendo controles nativos. Sprites y capas de estados reutilizados de los perfiles actuales, sin una licencia nueva para ese arte. Las imágenes aportadas por el usuario son referencias de estudio, copiadas únicamente a la galería, no recursos del juego. [Fuentes, prompts y hashes](prototypes/godot-shared/character_sheet/asset-manifest.json) · [ampliación y originales](prototypes/godot-shared/character_sheet/art/v2/sources.json) · [implementación y evidencia](docs/evidence/GODOT_CHARACTER_SHEET_20261116.md). No se atribuyen estos recursos a un RPG comercial ni se declaran CC0.

Fuentes incluidas: [Cinzel](https://github.com/google/fonts/tree/main/ofl/cinzel) (Copyright 2020 The Cinzel Project Authors) y [Crimson Pro](https://github.com/google/fonts/tree/main/ofl/crimsonpro) (Copyright 2018 The Crimson Pro Project Authors), ambas bajo **SIL Open Font License 1.1**. Se distribuyen los archivos originales variables y las licencias en `prototypes/godot-shared/character_sheet/fonts/` y sus copias nativas; pesos 600/500 de la familia original y 700/650 de la jerarquía editorial de la tercera revisión, mediante FontVariation. Se conserva el aviso de copyright completo de cada licencia.

## Aspecto del DM en Godot — 15/11/2026

32 recursos SVG originales (3 plantillas de marco, 3 grabados transparentes de nueve parches, 3 miniaturas y 23 iconos) generados por `scripts/build-godot-dm-style.mjs`, registrados con hashes en `prototypes/godot-shared/dm_style/manifest.json`. Los controles también reutilizan los glifos locales de inventario cuando procede. Los retratos proceden de los perfiles actuales de personajes, sin reemplazar sus atlas. Georgia/Segoe UI y sus alternativas son fuentes del sistema; no se distribuyen archivos de fuentes nuevos. Octopath Traveler II y Sea of Stars son referencias de estudio, no recursos incorporados al juego ni una declaración de parecido aprobado. [Registro de arte e implementación](docs/evidence/GODOT_DM_APPEARANCE_20261115.md).

## Combate nativo Godot — 15/11/2026

Reutilización de los iconos y atlas actuales de D8/Stormwreck en ambos prototipos. Cinco SVG nuevos de autoría propia amplían la familia existente (`sacred-flame`, `bless`, `shield-of-faith`, `zombie-slam`, `thrown-handaxe`). Los 642 recortes preparados no se reescalan ni sustituyen los originales. [Procedencia y SHA-256](prototypes/godot-shared/combat/asset-provenance.json), [registro de implementación](docs/evidence/GODOT_COMBAT_20261115.md). Los sonidos de arma y conjuro reutilizan Swishes Sound Pack (artisticdude) y Magic Spell SFX (JaggedStone), con sus créditos CC0 conservados en `campaigns/one-shot/public/D8_NIGHT_ASSET_CREDITS.md`. No hay descargas nuevas ni recursos comerciales incorporados. La niebla y las manchas de estado se dibujan mediante código propio y alfa procedural. No se declara una licencia nueva para el arte existente.

## Mochila RPG Godot — 15/11/2026

Tres atlas nuevos generados mediante ImageGen integrada a partir de los sprites existentes de Mia (clérigo), Trinity y Mike: poses de mochila y caminar con antorcha. Se conservan originales, instrucciones y referencias en `prototypes/godot-shared/inventory/art-sources.json` y `art/`. Los 101 SVG de `inventory/icons/` son trazados propios y derivados de la biblioteca local `engine/client/inventory-icons.ts`; generador y manifiesto conservan la procedencia. Las referencias Octopath Traveler y Sea of Stars se usan para estudiar claridad y jerarquía; sus capturas no se incorporan al juego ni se atribuyen derechos nuevos sobre recursos heredados. [Registro](docs/evidence/GODOT_INVENTORY_RPG_20261115.md).

## Pecio Godot, capas 1–6 — 14/11/2026

La construcción, materiales de intemperie, luces y control de clima añadidos en `prototypes/godot-pecio` son código propio reproducible en GDScript/shaders. Se reutiliza el lino de 512×512 `campaigns/camp-rests/public/art/a1-hd2d-v1/linen-v4.webp`, copiado sin modificar como `assets/textures/linen-reused-v4.webp`; su atlas de ImageGen y procedencia constan en el README de A1. Se reutilizan también las texturas ilustradas del 02/11 ya acreditadas. No se importan capturas comerciales ni modelos nuevos de terceros. Los modelos heredados del prototipo requieren conciliar sus créditos con el registro general anterior; esta entrega no los declara CC0 ni resuelve licencias por sus nombres. [Registro de implementación y recursos](docs/evidence/PECIO_GODOT_LAYERS_20261114.md).

El 02/11/2026 se generan con ImageGen integrada tres albedos ilustrados para muestras Retiro/Pecio: `basalt-illustrated-v1.png`, `oak-illustrated-v1.png` y `ship-timber-illustrated-v1.png`, en `campaigns/stormwreck-isle/public/art/visual-style-v1/`. Son derivados de texturas ya existentes del proyecto, usando las dos láminas aprobadas como guía de estilo. [Manifiesto con fuentes, prompts exactos, dimensiones y hashes](campaigns/stormwreck-isle/public/art/visual-style-v1/SOURCE_MANIFEST.json). Originales conservados; no se usan capturas comerciales como texturas, ni se atribuyen a Octopath/Witchbrook/Sea of Stars, ni se declaran CC0 o nuevos derechos sobre sus fuentes. Código de aplicación y mejora geométrica del cráneo: implementación propia que conserva el diseño/material recibido de Antigravity, sin bibliotecas nuevas.

El 21/10/2026 se incorporan cuatro WAV originales para la caverna del Espejo: rumor interior, dos gotas aisladas y asentamiento de hielo, en `campaigns/one-shot/public/audio/d8-night/mirror-cave-v1/`. Síntesis determinista sin muestras externas; fuente y medidas en su README y `scripts/generate-mirror-cave-audio.mjs`. La gota adapta el generador original del abrigo del propio proyecto. No se atribuyen a Octopath ni se declaran CC0.

Actualizado: 2026-09-28, fauna CC0 del bosque. Los avisos de terceros permanecen en `node_modules` y deben conservarse al empaquetar. El barco C1–C9 se renderiza como escena continua de terreno Babylon; Pixi mantiene escenas/runtime heredados. Los recursos añadidos tienen registros separados y algunos originales aportados aún carecen de licencia verificable; no se afirma que todo lo existente esté certificado para redistribución.

El reloj global y el clima dinámico (12/10/2026) no añaden dependencias, fuentes de audio ni imágenes externas. Su presentación reutiliza Babylon.js y PixiJS ya instalados y registrados abajo, junto con código propio del proyecto.

## Dependencias directas

Metadatos y archivos `LICENSE` comprobados en la instalación bloqueada de esta candidata:

| Dependencia | Versión | Licencia |
|---|---:|---|
| Babylon.js core | 9.26.0 | Apache-2.0; package.json y license.md locales comprobados21/09 |
| Babylon.js loaders | 9.26.0 | Apache-2.0; importador glTF/GLB oficial |
| PixiJS | 8.20.1 | MIT |
| Express | 5.1.0 | MIT |
| Socket.IO / socket.io-client | 4.8.1 | MIT |
| Howler | 2.2.4 | MIT |
| NippleJS | 0.10.2 | MIT |
| qrcode | 1.5.4 | MIT |
| Zod | 4.1.8 | MIT |
| TypeScript | 5.9.2 | Apache-2.0 |
| Vite / Vitest / tsx | 7.1.5 / 3.2.4 / 4.20.5 | MIT |

El archivo `node_modules/pixi.js/LICENSE` confirma MIT para la versión exacta usada. `pnpm-lock.yaml` fija versiones y hashes; no se copian runtimes ni dependencias desde la caché de Codex al producto. Las transitivas se instalan desde el lockfile y sus avisos no deben eliminarse al empaquetar.

## Arte y audio del proyecto

El atlas de materiales `campaigns/camp-rests/public/art/a1-hd2d-v1/a1-material-atlas-v5.png`, la vegetación V4 y los cuatro materiales extraídos del atlas se generaron con ImageGen integrada. Prompts, originales y transformaciones constan en `campaigns/camp-rests/public/art/a1-hd2d-v1/README.md` y `A1_V5_PROVENANCE.md`. Son VTT_AMBIENCE; no se declaran CC0 ni arte oficial.

La revisión artística A1 V6 añade `a1-material-atlas-v6.png`, `bay-v3.png` y `foliage-atlas-v5.png`, también generados con ImageGen integrada y no declarados CC0. La evaluación del recurso Poly Haven estudiado y los prompts originales están en `campaigns/camp-rests/public/art/a1-hd2d-v1/A1_V6_PROVENANCE.md`; no se incorporó ningún archivo externo.

La revisión A1 V7 conserva los materiales V6 para pavimentos y roca tallada y añade la textura rocosa orgánica `a1-cliff-organic-v7.png`, oleaje, espuma y relieve con Babylon Core. Un atlas alternativo generado durante la revisión se descartó por su repetición fotográfica. La procedencia y el límite de importación del paquete FBX constan en `campaigns/camp-rests/public/art/a1-hd2d-v1/A1_V7_PROVENANCE.md`.

La fauna de fondo de Bosque camino a Pleamar usa `quaternius_cc0-deer-908.glb` y `quaternius_cc0-stag-1373.glb`, aportados para esta integración como recursos Quaternius CC0. Se conservan los modelos fuente; el acabado mate y la ligera corrección cromática se aplican al cargarlos. Se usan únicamente Idle, Idle_2, Idle_Headlow y Walk. Los archivos están en `campaigns/camp-rests/public/art/forest-fauna-v1/`.

Los fondos `campaigns/stormwreck-isle/public/art/wreck-deck.png` y `wreck-approach.png`, el atlas y las cuatro fichas se generaron el 2026-09-13 con ImageGen integrada de Codex usando prompts originales de dirección visual táctica pixel art. No se asignan CC0 ni se presentan como arte oficial de Wizards of the Coast. El manifiesto con prompts resumidos, transformaciones y condiciones está en `campaigns/stormwreck-isle/public/art/ASSET_MANIFEST.md`.

La base original de audio es PCM WAV sintetizado por `scripts/generate-audio.mjs`: música de64s, cuatro ambientes y tresSFX. **Ya no es toda la biblioteca.** El pack actual referencia46URLs distintas de audio, incluidas grabaciones y música externas. Fuentes/autores y condiciones registradas en [STORMWRECK_AUDIO_CREDITS.md](campaigns/stormwreck-isle/public/STORMWRECK_AUDIO_CREDITS.md): mezcla de CC0 y Pixabay Content License, no todoCC0. Este21/09 se comprobaron archivos/rutas y esos registros locales; no se realizó una nueva certificación externa de todas las licencias ni escucha integral. Conservar avisos y verificar cada recurso seleccionado antes de distribuir.

Para Alpha 0.2 RC2 se generaron con la misma herramienta integrada un fondo limpio del interior del pecio y cuatro sprites transparentes: puerta cerrada, puerta abierta, caja horizontal y caja vertical. `scripts/process-object-art.py` recorta transparencia y ajusta las dimensiones de archivo; el runtime conserva tamaños lógicos declarados por el pack. Su procedencia y prompts resumidos constan en el manifiesto. No se declaran CC0 ni arte oficial. Miniplex y Matter.js sólo se evaluaron, no son dependencias ni código distribuido del proyecto.

Para Alpha 0.2.1 RC1 se generaron también mediante ImageGen integrada los recursos de `campaigns/stormwreck-isle/public/art/objects-v3/`: cubierta sin timón ni soporte horneados, soporte fijo, estados y orientaciones del timón, variantes intacta/dañada/destruida de puerta y caja, y restos. Se normalizaron como PNG RGBA con transparencia real y sin incorporar archivos externos. La puerta cerrada se regeneró como barrera estrecha vista desde arriba para respetar la cámara cenital/oblicua. `wheel-debris-v3.png` se reutiliza simétricamente para las cuatro orientaciones lógicas; no son cuatro obras distintas. Los detalles constan en el manifiesto.

Las imágenes de referencia del usuario están en `OneDrive_1_12-9-2026/Referencias estilo/`; no se sirven ni se incorporan a los assets. Los PDF, fichas y notas privadas de la aventura de Stormwreck Isle son material aportado por el usuario y relacionado con D&D/Wizards of the Coast: permanecen locales, ignorados por Git y fuera del servidor. No se relicencian como contenido abierto.

Los cuatro fondos ilustrados de `public/art/m25/` se generaron con ImageGen integrada el 22–23/09/2026 a partir de guías geométricas propias y referencias de estilo del usuario. Los originales de referencia no se copiaron al servidor. `private/m25/ART_WORKLOG.md` registra hashes, transformación de la cubierta principal y límites del manifiesto (los prompts exactos de la segunda pasada no quedaron preservados). No se declaran CC0 ni se confunden con arte oficial.

Las texturas `campaigns/camp-rests/public/art/forest-hd2d-v1/{moss,path,stream}.jpg` se usan en el primer pase visual del campamento `camp-forest-pleamar`. El repositorio no conserva la fuente, el prompt ni una licencia verificable para estos tres archivos; no se declaran CC0 ni se atribuyen a un autor o catálogo. Su procedencia debe confirmarse o los recursos deben sustituirse antes de autorizar otros usos o redistribuciones.

La textura candidata `campaigns/stormwreck-isle/public/art/ship/deck-planks-m5-candidate.png` se generó con ImageGen integrada de Codex el 25/09/2026 mediante un prompt original para una textura repetible de madera. Es un albedo modular, sin grid, objetos ni composición de mapa. No se declara CC0 ni arte oficial; se conserva como candidata de M5 hasta revisión visual. Procedencia e integración: `campaigns/stormwreck-isle/private/m5/ART_WORKLOG_20260925.md`.

La textura candidata `campaigns/stormwreck-isle/public/art/ship/water-ripples-m5-candidate.png` se generó con ImageGen integrada de Codex el 25/09/2026 mediante un prompt original de oleaje y espuma repetibles. No se declara CC0 ni arte oficial; es candidata de M5, compartida por el agua visible y el plano oceánico decorativo. Procedencia e integración: `campaigns/stormwreck-isle/private/m5/ART_WORKLOG_20260925.md`.

El token `campaigns/one-shot/public/art/tokens/fritz-v3.png` se generó el 2026-09-16 con ImageGen integrada de Codex a partir del retrato que el usuario aportó, convertido a personaje 2D. Su transparencia alfa se comprobó antes de incorporarlo; es arte de mesa privado y sustituye la visualización circular anterior de la señorita Fritz. No se declara CC0 ni recurso oficial.

No se ha copiado código de RPGJS, VeilCast, Open-VTT, MiniVTT ni RPGAtlas. Kenney Pirate Kit no consta incorporado, pero sí hay audio externo y partículas con procedencia Kenney/OpenGameArt registrada en los créditos de campaña. Las menciones a candidatos no adoptados en `docs/OPEN_SOURCE_REVIEW.md` no son licencia de otros archivos de esos catálogos.

## Originales aportados y revisión pendiente

El 20/10/2026 se generaron con `imagegen` integrada dos albedos originales para el Espejo, sin imágenes de entrada: `campaigns/one-shot/public/art/materials/mirror/glacial-{slate,floor}-v1.png`. Prompts exactos y trazabilidad en [materiales del Espejo](campaigns/one-shot/public/art/materials/mirror/README.md). No son arte oficial ni recursos declarados CC0; no contienen capturas de Octopath ni de la referencia del usuario.

El 13/10/2026 se generaron con ImageGen integrada siete PNG de D8 V52: fondo costero de isla plana, cuatro vistas de tres parroquianos bebiendo, oración de los dos personajes y Margaret sujetando una cuerda. Destinos en `campaigns/one-shot/public/art/v52/`; referencias, prompts de trabajo, originales y límites de aceptación en `docs/evidence/D8_V52_ASSET_PROMPTS.md` y `docs/evidence/D8_V52_CORRECTIONS_20261013.md`. Son derivados para la mesa privada, no arte oficial ni recursos declarados CC0. La generación no certifica derechos de redistribución de las referencias.

El 2026-10-12 se generaron con ImageGen integrada 14 atlas aceptados de caminata para Trinity y Silverfarben, tomando sus bases existentes como referencias, en `campaigns/one-shot/public/art/player-walks-v2/`. Las siete imágenes de Trinity se copian idénticas a `campaigns/stormwreck-isle/public/art/player-walks-v2/`. Los originales se conservan; dos candidatos mal orientados no se incorporan. Prompts, referencias y rutas: `docs/PLAYER_LOCOMOTION_PROMPTS.json`; revisión y aliases espejados: `docs/PLAYER_LOCOMOTION_AUDIT.md`. Son derivados para mesa privada, no arte oficial ni recursos declarados CC0. La generación no certifica derechos de redistribución de las referencias.

El 2026-10-12 se generaron con ImageGen integrada cinco atlas de vistas quietas para Mike, Mia, zombi, arpía y gul en `campaigns/stormwreck-isle/public/art/m3/facing-20261012/`, usando sus PNG existentes como referencias de identidad. Los originales se conservan. Prompts exactos, referencias y destinos: `docs/SPRITE_FACING_PROMPTS.json`; recortes alfa e integración: `docs/PERSISTENT_SPRITE_FACING.md`. Son derivados para la mesa privada, no arte oficial ni recursos declarados CC0. La generación no certifica derechos de redistribución de las referencias.

`Imagenes VTT/DnD VTT/` contiene231PNG:40zombi,57arpía,104María y30condiciones. No se localizó un manifiesto de origen/condiciones para este conjunto durante la auditoría. No atribuirles CC0 ni afirmar que todos fueron generados por una herramienta concreta. Los30recursos de condiciones tienen copias en arte servido; debe completarse su procedencia antes de una distribución pública. M3 seleccionó sólo ciclos mínimos de zombi, arpía, Trinity y gul para el pack Stormwreck; trazabilidad en [M3_ASSET_PROVENANCE_20260923.md](campaigns/stormwreck-isle/private/M3_ASSET_PROVENANCE_20260923.md). La revisión visual de las bases no certifica toda la tanda.

La carpeta privada de Google Drive aportada por el usuario es una fuente viva autorizada para este uso personal: contiene, entre otros,23PNG del gul,43 de Zombie1,2 de Arpía1,62 de Arpía3 y9 de entorno del pecio según inventario de metadatos del21/09. Uno de entorno está marcado `REJECTED_` y queda excluido. La autorización de uso privado no convierte estos archivos en CC0 ni prueba su derecho de redistribución. Los recursos seleccionados se copiarán al proyecto con ID remoto, fecha, hash, ruta, derivados y revisión visual en el manifiesto correspondiente; el inventario está en `campaigns/stormwreck-isle/private/DRIVE_ASSET_INDEX_20260921.json`.

M1a revisó el 22/09 los recursos de entorno actualizados de Drive: cofa (`sw_env_traversal_005`), brecha (`004`), jarcia (`003`) y escalera (`002`). Son candidatos `STUDY` de uso privado; ningún original se descargó ni se añadió a `public/`. Se excluyen `REJECTED_offtarget_B2_rope_ladders`, `REJECTED_offtarget_B4_hull_breach` y `DUPLICATE_prior_B4_hull_breach`. Las fuentes `campaigns/stormwreck-isle/private/m1a/layers/*.svg` son geometría/arte vectorial original de M1a, no contienen píxeles del PDF oficial ni los originales de Drive. M1b publicó sólo cuatro derivados estáticos versionados en `public/art/m1b/`; su manifiesto identifica fuente, exclusiones y condiciones, y confirma que retícula, puertos y mutables no se hornearon. Procedencia completa en `private/m1a/asset-provenance.json` y `public/art/m1b/manifest.json`.

La reparación de puerta v4 tiene entradas/salidas y hashes en `campaigns/stormwreck-isle/public/art/objects-v4/SOURCE_MANIFEST.json`, que registra tratamiento determinista de originales previos; no es una licencia nueva. Se conserva aceptación visual física pendiente. Los documentos de auditoría/plan del capítulo están en la carpeta privada, fuera de las rutas estáticas del servidor.

### Microescenas nativas de Godot · 14/11/2026

`prototypes/godot-pecio/loading/art/` y su copia sincronizada en Retiro reutilizan los originales del VTT (personajes, objetos y fondos de las microescenas web). Son recortes y empaquetados deterministas, no arte generado nuevo ni una nueva licencia. `loading/SOURCE_MANIFEST.json` registra entradas y hashes; `scripts/export-godot-skill-loading.ts` conserva trazabilidad de los 576 recortes y seis atlas. Se mantienen las condiciones de sus originales y los registros de `docs/design/SKILL_ANIMATION_V5_PROMPTS_20261107.json`. Las fuentes tipográficas se consultan al sistema, no se redistribuyen. El d20 adapta el módulo propio `apps/web/ui/skill-d20.ts`; los tonos de interpretación reproducen mediante síntesis el timbre original de `skill-performance-sound.ts`, sin melodías ni grabaciones externas. [Registro de recursos y aceptación](docs/evidence/GODOT_SKILL_LOADING_20261114.md).

### Ficha de personaje: materiales de la guía y auditoría · 17/11/2026

Cuatro recursos originales producidos con la herramienta integrada de generación de imágenes: `character_sheet/art/v5/paper.png`, `action-icons.png` (doce pictogramas), `ink-places.png` (seis ilustraciones) y `arch-frame.png`. Prompts completos, originales conservados, edición del fondo transparente, dimensiones y SHA-256 en [fuentes V5](prototypes/godot-shared/character_sheet/art/v5/sources.json) y [manifiesto combinado](prototypes/godot-shared/character_sheet/asset-manifest.json). La infografía del usuario se conserva como referencia de estudio en el informe, sin convertirse en una textura de la ficha. Se mantienen las fuentes tipográficas y licencias OFL anteriores.

La auditoría V6 reutiliza estas imágenes y los atlas/retratos existentes; no genera personajes, equipo, ropa ni animaciones. Sus cambios de componentes y procedencia están en [el registro V6](prototypes/godot-shared/character_sheet/art/v6/sources.json). El visor conserva el actor real y sus materiales; no se apilan nuevas piezas sobre equipo pintado. Aceptación artística del usuario y dispositivos físicos separados.

La pasada focalizada de cabecera y vida añade `character_sheet/art/v7/royal-controls.png`: cuatro elementos UI originales producidos mediante `image_gen` (placa roja, cartela de nombre, pestaña de cuero y corazón dorado). [Prompt completo, original y alcance](prototypes/godot-shared/character_sheet/art/v7/sources.json). Retratos V2 reutilizados con encuadre facial en pantalla; no se genera ni modifica el bitmap del personaje. Las seis fases del corazón son texturas escaladas en memoria del mismo emblema UI.
