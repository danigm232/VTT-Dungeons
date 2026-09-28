# Licencias y créditos

Actualizado: 2026-09-27, campamentos V1.4.2 y candidata técnica0.3.2-dev.5. Los avisos de terceros permanecen en `node_modules` y deben conservarse al empaquetar. El barco C1–C9 se renderiza como escena continua de terreno Babylon; Pixi mantiene escenas/runtime heredados. Los recursos añadidos tienen registros separados y algunos originales aportados aún carecen de licencia verificable; no se afirma que todo lo existente esté certificado para redistribución.

## Dependencias directas

Metadatos y archivos `LICENSE` comprobados en la instalación bloqueada de esta candidata:

| Dependencia | Versión | Licencia |
|---|---:|---|
| Babylon.js core | 9.26.0 | Apache-2.0; package.json y license.md locales comprobados21/09 |
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

`Imagenes VTT/DnD VTT/` contiene231PNG:40zombi,57arpía,104María y30condiciones. No se localizó un manifiesto de origen/condiciones para este conjunto durante la auditoría. No atribuirles CC0 ni afirmar que todos fueron generados por una herramienta concreta. Los30recursos de condiciones tienen copias en arte servido; debe completarse su procedencia antes de una distribución pública. M3 seleccionó sólo ciclos mínimos de zombi, arpía, Trinity y gul para el pack Stormwreck; trazabilidad en [M3_ASSET_PROVENANCE_20260923.md](campaigns/stormwreck-isle/private/M3_ASSET_PROVENANCE_20260923.md). La revisión visual de las bases no certifica toda la tanda.

La carpeta privada de Google Drive aportada por el usuario es una fuente viva autorizada para este uso personal: contiene, entre otros,23PNG del gul,43 de Zombie1,2 de Arpía1,62 de Arpía3 y9 de entorno del pecio según inventario de metadatos del21/09. Uno de entorno está marcado `REJECTED_` y queda excluido. La autorización de uso privado no convierte estos archivos en CC0 ni prueba su derecho de redistribución. Los recursos seleccionados se copiarán al proyecto con ID remoto, fecha, hash, ruta, derivados y revisión visual en el manifiesto correspondiente; el inventario está en `campaigns/stormwreck-isle/private/DRIVE_ASSET_INDEX_20260921.json`.

M1a revisó el 22/09 los recursos de entorno actualizados de Drive: cofa (`sw_env_traversal_005`), brecha (`004`), jarcia (`003`) y escalera (`002`). Son candidatos `STUDY` de uso privado; ningún original se descargó ni se añadió a `public/`. Se excluyen `REJECTED_offtarget_B2_rope_ladders`, `REJECTED_offtarget_B4_hull_breach` y `DUPLICATE_prior_B4_hull_breach`. Las fuentes `campaigns/stormwreck-isle/private/m1a/layers/*.svg` son geometría/arte vectorial original de M1a, no contienen píxeles del PDF oficial ni los originales de Drive. M1b publicó sólo cuatro derivados estáticos versionados en `public/art/m1b/`; su manifiesto identifica fuente, exclusiones y condiciones, y confirma que retícula, puertos y mutables no se hornearon. Procedencia completa en `private/m1a/asset-provenance.json` y `public/art/m1b/manifest.json`.

La reparación de puerta v4 tiene entradas/salidas y hashes en `campaigns/stormwreck-isle/public/art/objects-v4/SOURCE_MANIFEST.json`, que registra tratamiento determinista de originales previos; no es una licencia nueva. Se conserva aceptación visual física pendiente. Los documentos de auditoría/plan del capítulo están en la carpeta privada, fuera de las rutas estáticas del servidor.
