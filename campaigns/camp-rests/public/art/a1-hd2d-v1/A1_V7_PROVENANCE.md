# A1 V7 · relieve, roca y oleaje

Revisión actualizada: 2026-09-28. El alcance es exclusivamente la escena CANON A1 y sus mejoras VTT_AMBIENCE. Se mantienen las seis celdas, la plaza, el acceso, la estatua, la cuadrícula y las colisiones.

## Texturas

`a1-cliff-organic-v7.png` se generó con ImageGen integrada de OpenAI (`exec-5a6d38fd-51e0-4d99-87c3-e789da1a5186.png`). Prompt: textura cuadrada y tileable de albedo para roca caliza costera erosionada, ilustrada HD-2D, vetas y fracturas orgánicas, grises fríos y variación beige tenue, sin bloques, ladrillos, filas, perspectiva, sombras ni objetos. Es VTT_AMBIENCE; no se declara CC0 ni arte oficial. El archivo final está en esta carpeta.

El atlas alternativo de la prueba anterior (`exec-c8d13041-f2a5-46ab-aa25-d8990d57ddbb.png`) se descartó por su repetición fotográfica y no se sirve. Los cuatro recortes `a1-{plaza,carved,cliff,cell}-v6.png` siguen siendo derivados exactos del atlas V6.

## Geometría y oleaje

`campaigns/camp-rests/public/a1-visuals.ts` usa UV métricas deformadas para el paño rocoso, ondulación de vértices para crear resaltes integrados detrás de las celdas, roca irregular y losas con tamaños/bordes variables y juntas de tierra. Los techos siguen pudiendo ocultar el interior hasta que se selecciona la celda.

`engine/client/coastal-backdrop.ts` usa Babylon Core (`MeshBuilder`, `Mesh`, `VertexData`, `StandardMaterial`) con tres trenes de onda, actualización limitada a 24 Hz y una banda de espuma deformada. Cinco sistemas de partículas existentes intensifican el espray en las crestas. No se añadió un paquete externo de materiales de agua.

## Paquete de mobiliario

El manifiesto local identifica `Dungeon-assets.fbx` de OpenGameArt como CC0, pero el proyecto no dispone de importador FBX ni de conversión GLB del paquete. El FBX permanece bajo `private/sources`; no se publica ni se afirma que los muebles actuales procedan de ese modelo. A1 conserva geometría nativa de Babylon hasta que exista un flujo de conversión adecuado.
