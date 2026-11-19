# Biblioteca compartida de sprites

Estados, 16/11: tres acabados vectoriales nuevos (`condition-art.json`), con anclajes por cuerpo y elección independiente en DM → Ajustes → Aspecto de la consola → Estados de personajes. `condition_overlay_library.gd` comparte texturas, fases y preferencias locales; `npc_condition_visuals.gd` los aplica también a jugadores sin conceder estados. `character_stature.gd` unifica las medidas visuales de campaña entre mapas, respetando alturas personalizadas; no afirma alturas individuales que las fichas no especifican. [Revisión de opciones y escala](../../../output/npc-sprites-20261115/overlays-options-20261116/index.html). Aceptación artística pendiente.

Ampliación del 16/11: `npc_sprite_library.gd` adapta cuatro marineros y las arpías; `npc_condition_visuals.gd` acentúa condiciones sin concederlas, `npc_runtime.gd` conserva la caída/recuperación y `npc_encounter_variants.gd` instala el refuerzo C2 oculto. [Alcance y pruebas](../../../docs/evidence/NPC_SPRITES_20261116.md). Visor: `REVISAR-ZOMBIS-ARPIAS.cmd`. La biblioteca contiene 37 atlas, 15 de esta ampliación. Caminar/ataque principal y vuelo/porra tienen ocho rumbos; las transiciones y ataques secundarios conservan su vista de acción.

Regla vigente, 15/11/2026: **al menos ocho imágenes distintas por ciclo de desplazamiento**, en todos sus rumbos disponibles. Una vista de reposo, una pose sentada o un cuerpo quieto pueden tener una imagen. Repetir la misma pose, alargar su duración o acelerar una pose estática no completa el mínimo.

La biblioteca actual cubre Mía (`cleric`), Trinity/María (`rogue`), Mike (`wizard`), Silverfarben Hotel y el zombi ahogado. Caminar, correr y el ataque principal tienen ocho rumbos; trepar usa una vista trasera y nadar, arrastrarse y saltar usan perfiles de acción. Los originales conservan su identidad, ropa y equipo. No se conceden acciones ni se modifican reglas, altura física, inventario o colisiones.

- `art-sources.json`: prompts completos, originales generados, referencias y candidatos rechazados.
- `art/`: originales RGBA de ImageGen integrada, preservados.
- `bake_sprites.gd`: extracción de siluetas completas antes de asignar celdas; conserva brazos, botas, armas y equipo separado. No divide una figura por una línea de cuadrícula.
- `baked/` y `frames.json`: atlas derivados con margen, pivote, escala constante por atlas y apoyo común. La acción se calibra con una pose en pie, sin agrandar una postura tumbada.
- `sprite_library.gd`: adaptación de los perfiles existentes; `torch_profile` sirve también al inventario. La interpretación de reglas sigue perteneciendo al combate y al mapa.
- `audit_sprites.gd`, `test_sprites.gd` y capturas: catálogo real, ocho imágenes distintas, cambio de rumbo/velocidad sin reiniciar el paso, duración completa y contacto con el suelo.

Para añadir una animación, conservar el original y su referencia, registrar un atlas con ocho columnas y ocho filas (una secuencia por fila), importarlo con `bake_sprites.gd` en el proyecto Pecio y llevar los derivados a esta carpeta. Ejecutar `node scripts/install-character-sprites.mjs --publish-art` para sincronizar los tres prototipos y las fuentes web. `scripts/review-character-sprites.ps1 -Project pecio|retiro|campamentos -Mode Audit|Test|Capture|Integrated` ejecuta la comprobación pertinente. No editar las copias de `sprites/` de cada prototipo.

Las poses de arcos, lanzamientos, reacciones y algunos estados de la biblioteca anterior se conservan. Esta entrega no las declara redibujadas ni convierte todos los gestos en acciones de ocho rumbos. La aceptación artística y la prueba física siguen separadas de las comprobaciones técnicas.
