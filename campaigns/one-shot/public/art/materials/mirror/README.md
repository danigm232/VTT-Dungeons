# Materiales originales del Espejo · 20/10/2026

Dos albedos generados con la herramienta integrada `imagegen`, sin imágenes de entrada. Las capturas del usuario y Octopath son referencias de dirección artística, no píxeles incorporados. Los PNG originales se conservan sin editar (1254 × 1254). No se declaran recursos oficiales ni CC0. El resto de las superficies, normales, máscaras, geometría y grabados se generan por código.

- `glacial-slate-v1.png`: pared, bóveda, bordes y roca helada. Original: `exec-a0217d5d-b36f-4ca0-8c8d-15c7ebfe6d32.png`.
- `glacial-floor-v1.png`: detalle fino de albedo del suelo; el renderer conserva las máscaras espaciales de nieve, recorrido y pulido. Original: `exec-6ac993f2-cae4-4a88-8fa6-8aade3d60663.png`.

La candidata usa exportaciones bicúbicas `glacial-slate-v1-1024.png` (1024²) y `glacial-floor-v1-512.png` (512²) para reducir memoria GPU. Son derivados de resolución; no cambian el contenido. Los PNG originales permanecen disponibles para las compilaciones de los puntos intermedios. La máscara espacial del terreno también usa 512²; el detalle fino se repite en su propio mapa.

## Prompts exactos

Pared:

> Use case: stylized-concept. Asset type: original seamless square albedo texture for a three-dimensional icy cave wall in a HD-2D fantasy videogame. Generate ONLY a flat orthographic front-facing material swatch filling every pixel, no scene, no perspective, no frame, no text. Subject: rough ancient glacial blue ice fused with craggy dark slate, a rich broken faceted surface with crystalline translucent ice patches, branching trapped fractures, opaque white frost dust in recessed crevices and little mineral rock peeking through. Materials should have a carefully hand-painted miniature diorama quality, realistic intricate natural forms simplified into crisp painterly facets, softly lit neutral albedo with no directional shadow baked in, medium contrast, luminous pale blue small fracture edges against muted steel blue ice and dark navy blue stone. No regular vertical streaks, no cloth weave, no horizontal layers, no uniform repeating crystals, no icicles or columns or big detached objects, no large white blobs, no symbols. Seamless tileable all four edges. Square 1024x1024.

Suelo:

> Use case: stylized-concept. Asset type: original square seamless tileable videogame FLOOR ALBEDO TEXTURE, orthographic straight down, surface fills every pixel, no perspective, no scene. A naturally worn glacial cave floor: mottled pale powdery snow deposits forming irregular jagged frost margins around smooth translucent steel-blue ice; intricate fine white scratches, branching tiny hairline fractures trapped below the ice, granular broken ice crystals and wind-scoured cloudy opaque streaks. Rich carefully hand-painted HD-2D miniature game environment material, sharp natural painterly detail, no photoreal lens or blur. Medium light value overall, steel blue and silver white, subtle soft neutral flat light, no large dark black areas or holes or pools, no big objects, no rocks, no footprints, no water, no text, no ritual symbols or grid. Avoid round cloud blobs, avoid regular repeated lines. Fully opaque. Tileable all four edges. Square about1024 pixels.
