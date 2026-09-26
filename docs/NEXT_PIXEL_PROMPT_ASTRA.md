# Prompt de continuidad — Astra / migración pixel art táctico

**RELEVO SUPERADO el 2026-09-13.** Astra ha cerrado arquitectura y auditoría. La afirmación siguiente de Alpha completa y reconexión/audio ya probados era demasiado amplia. No ejecutar este borrador como encargo vigente. Continuación: [NEXT_MODEL_PROMPT.md](NEXT_MODEL_PROMPT.md), para Sol High, y contrato [TACTICAL_PIXEL_SPEC.md](TACTICAL_PIXEL_SPEC.md).

Continúa en el mismo proyecto:

`C:\Users\User\Desktop\Dungeons`

Lee íntegramente, en este orden:

1. `PROJECT_STATE.md`
2. `ARCHITECTURE_DECISIONS.md`
3. `docs/ALPHA_0_1.md`
4. `docs/PIXEL_ART_MIGRATION_AUDIT.md`
5. `docs/USER_SPEC.md`
6. `LICENSES_AND_CREDITS.md`

La Alpha 0.1 ya es funcional: servidor LAN Windows, `/dm`, `/player`, `/projector`, ownership, reconexión, snapshots filtrados, movimiento, colisiones, timón, reveal/hide de criatura, audio por capas y tres SFX tienen pruebas automatizadas y una comprobación visual en navegador. No reescribas ni rompas esas capacidades.

El usuario ha corregido la dirección visual. La escena debe convertirse en un VTT de D&D de pixel art táctico 2D/2.5D, inspirado por las imágenes entregadas sólo como lenguaje visual:

- cuadrícula cuadrada siempre visible e integrada en el terreno;
- vista cenital con inclinación suave;
- movimiento comprensible por casillas;
- cámara con desplazamiento limitado y sin rotación libre;
- mapa legible como battlemap, no como diorama 3D;
- personajes y criaturas como sprites/tokens pixel art intercambiables;
- silueta y equipo reconocibles a distancia;
- Stormwreck Isle reconocible por pecio, mar, madera, rocas, viento y tormenta.

No copies personajes, interfaces, mapas, sprites, tipografías ni assets de las referencias. Usa recursos originales o con licencia verificable y actualiza `LICENSES_AND_CREDITS.md`.

Implementa la migración completa descrita en `docs/PIXEL_ART_MIGRATION_AUDIT.md`:

1. Corrige primero la orientación de `screenVectorToWorld` y añade una prueba.
2. Añade al pack público los datos declarativos de grid, terrain, decoraciones, cámaras, tokens y celdas transitables/bloqueadas.
3. Conserva la frontera de `WorldRenderer` y reemplaza la presentación 3D por canvas o tilemap 2D/2.5D con escalado nítido, nearest-neighbour y cámara ortográfica inclinada suave. Si eliges una dependencia nueva, fija versión y licencia.
4. Implementa `wreck-deck` primero: cubierta C1/C2/C3, agua, pecio, timón, obstáculos, cuadrícula, animación ambiental y tokens. Duplica/adapta después `wreck-approach`.
5. Sustituye héroes geométricos y arpía low-poly por tokens pixel art originales o fallback claramente pixelado. Distingue Mike, Mia, Maria y la arpía por clase, equipo, color de aro y silueta.
6. Conecta snapshots, interpolación, reveal/hide, movimiento, clima, audio, timón y cámaras al renderer nuevo sin exponer secretos.
7. Ajusta Player móvil y Projector 16:9 para que las casillas y tokens se lean; conserva WASD/joystick y controles grandes.
8. Ejecuta pruebas unitarias, integración y build. Añade comprobaciones automatizadas de cuadrícula, orientación, token y privacidad. Distingue lo automatizado de lo pendiente en móvil/proyector físicos.
9. Actualiza `README.md`, `LICENSES_AND_CREDITS.md`, `docs/ACCEPTANCE_RESULTS.md` y `PROJECT_STATE.md` con resultados y limitaciones reales.

Mantén los secretos exclusivamente en servidor. Los dados, salvaciones, decisiones y narración continúan en mesa. No añadas combate automático, IA, editor ni reglas completas.

Trabaja hasta una candidata ejecutable completa. No entregues sólo documentación o una maqueta. Al finalizar, informa de archivos modificados, pruebas ejecutadas, comprobaciones físicas pendientes y la siguiente recomendación de modelo únicamente si queda trabajo sustancial.
