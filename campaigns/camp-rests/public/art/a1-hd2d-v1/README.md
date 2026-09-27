# Materiales A1 · HD-2D · versión 1

Catorce recursos propios para la escena `camp-a1-rooms`, incluyendo la roca anterior conservada para las comparativas. Las otras cuatro zonas no los cargan.

- `cliff`, `masonry`, `flagstone`, `earth`, `wood`, `linen`: texturas WebP de 512 × 512.
- `foliage`: recorte RGBA WebP de 768 × 512, usado en planos cruzados anclados al mundo. No es un fondo fijo.
- `bay-v2`: mar ilustrado WebP de 1024 × 1024 sobre una superficie 3D situada bajo el acantilado; desplazamiento lento y color por fase.
- `limestone-v3`: caliza de contraste moderado, WebP de 768 × 768, utilizada por A1 en la tercera mejora. La iluminación y el relieve proceden de la escena.

Generados con ImageGen el 26/09/2026. El atlas original se dividió en seis materiales sin alterar su contenido; el follaje se redujo conservando su transparencia. Originales conservados en la carpeta de imágenes generadas de Codex.

Originales: `exec-50861fe5-a785-458a-913e-99dee8814e0d.png` y `exec-ecf23999-0b52-4da9-bb15-48f216fa682f.png`.

Original del mar: `exec-87b02b35-9d77-4273-91d7-9d1697abf4ef.png`.

Original de caliza: `exec-292bd0e8-3dfc-4575-84a2-090daca8d9cc.png`. Generado con la herramienta integrada ImageGen el 26/09/2026 y reducido a WebP para el VTT.

Prompt de la caliza: «Use case: stylized-concept. Asset type: seamless square diffuse/albedo texture for real 3D coastal monastery rock in an HD-2D fantasy diorama. Entire image is an orthographic close view of a SINGLE continuous limestone surface, broad warm grey and desaturated sandstone planes, restrained hand painted brushwork, sparse fine fractures, a few subtle horizontal strata, slight patches of lichen. Low to moderate contrast, large quiet areas, flat neutral illumination suitable for being lit in a game. Seamlessly tileable on all four edges. No illustration of separate rocks, no boulders, no landscape, no perspective, no shadows, no black crevices, no border, no text, no objects. Sophisticated painterly game texture, not photographic noise. Square 1024x1024.»

Dirección: materiales naturales ilustrados para un diorama HD-2D, roca costera, piedra monástica, madera usada y lino. Son VTT_AMBIENCE. No aportan geometría canónica, reglas ni obstáculos.


## Acabado V4 · 27/09/2026

`foliage-atlas-v4.webp`: atlas RGBA de 1024 × 1024, cuatro siluetas en una única textura. Arbusto costero, helechos con flores, hiedra colgante y tomillo/musgo. Planos cruzados y orientados en coordenadas de mundo; ninguna vegetación sigue la cámara. Original: `exec-0cc63f1a-9894-45f5-8954-6a11c2f4d45f.png`, generado con ImageGen integrado y reducido conservando el canal alfa.

Prompt: «Game environment foliage atlas for a richly illustrated HD-2D monastery on a temperate coastal limestone cliff. Transparent RGBA background. EXACTLY four separate plant clumps arranged in equal 2x2 square cells with generous transparent margins, no overlap across center lines, each clump fully visible. Top left: dense rounded leafy coastal shrub, small olive/sage green leaves, woody branch stems, irregular airy silhouette. Top right: ferns and feathery meadow grasses with tiny cream and pale gold flowers, graceful irregular arch. Bottom left: hanging ivy curtain trailing downward from a dense top cluster, small heart-shaped leaves, dark forest green with subtle olive highlights. Bottom right: low lush groundcover mound of moss, thyme and tiny lavender wildflowers. Hand painted game texture art with realistic botanical shapes, detailed painterly leaves, muted natural color, gentle ambient occlusion within foliage, soft neutral diffuse lighting so real game lights can light it, no strong directional shadows. Front three-quarter view, no ground patch, no pots, no rocks, no scene, no labels, no borders, no checkerboard. Premium miniature diorama vegetation, organically varying leaf sizes, not cartoon blobs. Square 1024x1024.»


`linen-v4`, `wool-v4`, `oak-v4`, `ashlar-v4`: cuatro materiales de 512 � 512, extra�dos sin retoque de las cuatro celdas del atlas `exec-5df07f66-7058-4848-b3e4-86ab3b579598.png` (ImageGen integrado). Sustituyen en A1 las telas con pliegues pintados y las superficies de madera/piedra anteriores. El relieve y las sombras son geometr�a e iluminaci�n del VTT.

Prompt del atlas: �Asset type: four square seamless albedo material textures in an exact 2x2 atlas, each occupies precisely one quadrant, no gutter no borders no captions, overall square 1024. For high quality painterly HD-2D monastery game interiors. All textures flat orthographic surface scan, softly hand-painted microdetail, diffuse neutral lighting, no directional lighting or large shadows. TOP LEFT: natural warm ivory plain linen woven fabric, small irregular warp and weft threads, subtle speckle, absolutely no folds, no bedding, no objects. TOP RIGHT: muted dusty terracotta woven wool cloth, very fine subtle herringbone weave, uniform diffuse, no folds or shapes. BOTTOM LEFT: weathered honey brown oak boards parallel vertically, four or five narrow planks, fine quiet straight wood grain, small knots, subtle dark seams, no furniture or scene. BOTTOM RIGHT: hand-cut warm pale limestone ashlar masonry wall, courses of modest rectangular squared stone blocks, narrow recessed dusty mortar seams, subtle softly chipped edges and color variations, stone surfaces quiet and naturally worn, not high contrast black seams. This is a texture sheet of raw materials, NOT four objects or scene illustrations. No perspective, no decorative framing, no characters, no text. Individual quadrants tile seamlessly.�
