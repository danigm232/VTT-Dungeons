# Zombis y jugadores: auditoría y ciclos de ocho poses — 15/11/2026

**Ampliación del 16/11:** completadas las cuatro apariencias de zombi y las dos arpías en [la ficha de PNJ](NPC_SPRITES_20261116.md), con 15 atlas adicionales, ataques, estados y caída/recuperación. Este documento conserva la evidencia de la primera candidata y no acredita por sí solo la ampliación posterior.

Petición actual: auditar los sprites existentes de zombis y jugadores, mejorarlos, crear los que faltan y establecer un mínimo de ocho sprites por movimiento. Se aplica al catálogo activo de los tres prototipos Godot y al instalador de arte del VTT web; las partidas y mapas conservan sus reglas y distribución.

## Hallazgos y cambios

La auditoría del catálogo real detectó **104 secuencias de desplazamiento cortas**. Mía, Mike y el zombi tenían ocho vistas de reposo, pero `dir_walk` y `dir_run` resolvían una sola imagen por rumbo; esa selección ocultaba incluso los cuatro pasos genéricos existentes del zombi. Trinity conservaba ocho pasos al caminar, con carreras de cuatro, saltos de tres y trepadas/brazadas de cuatro. Silverfarben caminaba con ocho, pero su instalador posterior reintroducía carreras de seis. Las antorchas nuevas del inventario tenían cuatro pasos por dirección.

Se conserva la caminata revisada de Trinity y Silverfarben. Se incorporan **22 atlas candidatos, 1.408 poses**: caminatas de Mía, Mike y zombi; carreras y ataques principales en ocho rumbos para los cinco personajes; ocho fases para correr de perfil, sigilo, trepar, nadar, arrastrarse, saltar, ataque de perfil y gesto/conjuro o agarre del zombi; antorcha en ocho rumbos para los tres héroes de Stormwreck; golpe sin armas propio de Silverfarben. Daga y puñetazo de Silverfarben quedan como secuencias distintas.

La regla mínima cubre los ciclos de desplazamiento; las poses estáticas siguen siendo estáticas. Los ataques principales direccionales también pasan a ocho. No se presenta como una renovación completa de arcos, lanzamientos, heridas, condiciones y todos los conjuros históricos. Trepar usa su vista trasera; nado, arrastre y salto conservan una representación de perfil, con los reflejos disponibles. No son ocho vistas dibujadas de cada acción de utilidad.

El importador identifica las siluetas completas sobre el atlas antes de asignarlas a una celda. Evita recortar una mano, bota o arma por el límite aproximado de fila/columna. Retira fragmentos pequeños y conserva el equipo separado deliberado, incluido el libro de Silverfarben. Se fija un pivote por celda, una escala por atlas y una línea de apoyo, sin estirar cada pose. El alfa opaco sirve para aislar; se conserva un píxel de suavizado junto al contorno. Los originales se mantienen intactos.

El reproductor conserva la fase de la zancada al cambiar rumbo o pasar entre caminar y correr. Las poses dibujadas dejan de recibir el aplastado y giro global usados para simular movimiento con una imagen fija. Las acciones de una sola reproducción reciben tiempo suficiente para mostrar todos sus fotogramas. El margen transparente inferior se compensa para mantener el apoyo en el suelo.

## Registro de arte y propiedad

| ID | Propietario y anterior | Candidato | VA / referencia | Aceptación |
| --- | --- | --- | --- | --- |
| cleric/wizard/zombie.walk | `scripts/character_sprite_catalog.gd`, una vista fija por rumbo | `sprites/baked/*-walk.png`, 8×8 poses | VA-01/03/10/14; REF-01, identidad original del proyecto | Integrado; revisión del usuario pendiente |
| *.run | catálogo nativo, 1/4/6 poses según personaje | `sprites/baked/*-run.png`, ciclos propios 8×8 | VA-01/03/14 | Integrado; no es acelerar la caminata |
| *.attack | catálogo nativo, 1/4/6 poses | `sprites/baked/*-attack.png`, 8×8; `silverfarben-unarmed.png` separado | VA-01/03/16 | Candidato integrado |
| *.utility | clips ausentes o de 3–6 poses | `sprites/baked/*-actions.png`, 8 fases por fila | VA-03/14/16 | Candidato integrado; perfiles descritos arriba |
| cleric/rogue/wizard.torch | `inventory/sprite_library.gd`, 4 pasos por rumbo | `sprites/baked/*-torch.png`, 8×8 | VA-03/10/16 | Integrado con inventario y actor |
| Sprite atlas import | recortes rectangulares locales | `godot-shared/sprites/bake_sprites.gd`, silueta completa y margen | VA-14/17/18 | Verificado técnicamente |

Fuentes maestras: `prototypes/godot-shared/sprites/`. `art-sources.json` conserva prompts exactos, referencias de identidad y rutas de los originales de **ImageGen integrada**. `asset-manifest.json` registra hashes/dimensiones derivados. Se rechazó una primera caminata de zombi con fondo opaco y una primera lámina de Silverfarben con siete columnas. Se regeneraron antes de incorporarlas. No hay arte comercial incorporado.

El adaptador web es `engine/client/character-motion.ts`, ejecutado después de los instaladores anteriores en los packs, la carga de API y la actualización del mundo. Comprueba la apariencia base para respetar futuros atuendos alternativos. Reutiliza los mismos atlas derivados; las reglas, condiciones y actores visibles no se cambian.

## Comprobación y revisión

- Auditoría inicial y final del catálogo nativo en `output/sprite-audit-20261115/pecio/{before,after}.json`; inventario inicial de 104 ciclos cortos, primera comprobación posterior con cero ciclos cortos y cero imágenes vacías.
- Pruebas nativas del reproductor: imágenes distintas, ocho rumbos de caminar/correr/atacar, reproducción real, fase al girar, duración del ataque, proporción sin deformar y apoyo en el suelo. El registro de cada prototipo en `output/sprite-audit-20261115/<proyecto>/tests.json` es la evidencia actual, sin trasladar resultados de una candidata anterior.
- Pruebas web focalizadas: actualización de un catálogo antiguo, preservación de condiciones/actores/skins alternativas y distinción daga/puñetazo.
- Capturas Forward+ 1600×900 con los mismos `PlayerToken`, luz y cámara en un escenario neutro. Comparativa superpuesta de norte/este/sur/oeste y trepar/nadar/arrastrarse/saltar, mediante `scripts/lib/visual-comparison.mjs`. `capture-originals.json` conserva originales/hashes. El escenario neutro se identifica como tal.
- Capturas adicionales dentro de la escena jugable actual del Pecio, con el HUD DM; no se presentan como un antes/después exacto del escenario.

[Visor de animaciones y comparativas](../../output/sprite-audit-20261115/index.html): personaje, acción, rumbo, velocidad, pausa y avance por fotograma. La revisión visual realizada comprueba silueta, orientación de las vistas mostradas, margen y contacto. No acredita una animación anatómica perfecta, FPS sostenidos, aceptación del usuario ni pruebas con dispositivos físicos.

La integración Godot está en las fuentes actuales de Pecio, Retiro y campamentos. El adaptador y arte web están en el código fuente; la compilación/despliegue del servidor web habitual no forma parte de esta entrega. No se reinician mesas en marcha ni se escriben guardados.

**Resultado final de esta candidata:** Pecio, Retiro y campamentos superan cada uno 2.354 comprobaciones nativas sin fallos, después del ajuste final de cadencia de la antorcha al correr. La mochila real del Pecio supera sus 159 comprobaciones con el nuevo importador; las tres pruebas web focalizadas y los tipos cliente/servidor pasan. La auditoría final encuentra cero ciclos de desplazamiento cortos y cero imágenes vacías. Visor comprobado en navegador: personaje/acción/rumbo, velocidad, pausa, avance de una imagen y comparación superpuesta reversible. Los registros se resumen en `output/sprite-audit-20261115/validation-summary.json`.

El importador conserva un aviso de contacto con el borde del original en `cleric-actions`, registrado en `frames.json`; su fila de carrera de perfil está sustituida en el juego por el atlas direccional de carrera propio. No se presenta ese aviso como una certificación de silueta perfecta.
