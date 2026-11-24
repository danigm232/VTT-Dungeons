# Combate nativo compartido en Godot — 15/11/2026

## Auditoría de visuales — 24/11/2026

Auditoría del módulo en Pecio, Retiro y Campamentos. Cubre la elección de pose y rumbo de las acciones instaladas, vuelo y contacto, heridas y curación, área y alcance, niebla, derrota y retirada de efectos. Las referencias de estudio son REF-01 para conservar la lectura de los personajes entre efectos y REF-03 para comunicar áreas y distancias sobre el plano del tablero.

| Recurso / ID | Propietario | Antes y candidata | Criterio |
| --- | --- | --- | --- |
| `CombatProjectile_arrow, blade, ember, dart` | `combat/combat_cues.gd` y `visual_profiles.json` | Esfera de radio 0,085 m para todo. Ahora cada familia tiene su geometría, color y tamaño en la definición compartida. El lanzamiento ocurre tras la preparación del sprite. El impacto se sincroniza con la llegada. | VA-03/14/16; silueta e impacto identificables |
| `CombatImpact, CombatHealing, CombatWard, CombatBoon` | `combat/combat_visuals.gd` y `combat_cues.gd` | El impacto dependía de un retardo distinto al vuelo. Ahora comparte contacto y usa una luz breve de 0,95 m. La curación, protección y ventajas tienen tratamientos propios. Los fallos de ataque y la inmunidad omiten la herida. | VA-10/16; se distingue el resultado sin sumar un estado a las reglas |
| `CombatArea_burning-hands, harpy-song, detect-magic` | `combat/combat_cues.gd` | Pose genérica sin huella al confirmar. Cono de 4,5 m orientado por el punto elegido. Los otros dos usan una señal local de 2,3 o 2,9 m, respectivamente. Sus alcances reglamentarios permanecen en la vista de selección. | VA-14/16; se entiende de dónde procede la acción |
| `FogVolume_<actor>` | `combat/combat_visuals.gd` | 18 billboards altos con alfa 0,70. Ahora sus centros quedan más cerca del suelo y el alfa baja a 0,24–0,42. Su radio lógico permanece en 6 m y la retirada sigue la concentración. | VA-14/16; niebla con profundidad y pies visibles |
| `CombatOverlay` | `combat/combat_overlay.gd` | Solo límite normal en verde tenue. Se distingue el límite normal del largo con línea ámbar discontinua y marcador del objetivo. La confirmación guiada se proyecta desde el lanzador de esa acción. | VA-14; lectura táctica en ambos alcances |
| `fall, stand, defeated` | Catálogo de personaje y `combat_visuals.gd` | Estado final instantáneo en los personajes sin el reproductor de PNJ. Se reproducen la caída y recuperación existentes cuando el perfil incluye las poses. Para Trinity se usan los recortes de `rogue-rise.png` ya registrados. El marcador sigue el plano de apoyo y se oculta con la ficha. | VA-03/10/17; textura, escala y pies conservados |
| `PhysicalBindingInstances` | `characters/binding_layer.gd` | La misma causa sobre el mismo fotograma podía reutilizar la firma después de crear una malla vacía. Ahora se invalida la firma cuando se crea la malla y vuelve a dibujar la restricción. | VA-10/16/17; retirar y volver a aplicar el mismo efecto |

Se revisó la definición y el perfil de cada familia antes de reutilizar los recursos. La definición de María registra la excepción de cuatro fotogramas históricos por acción, con atuendo pintado y sin ranuras de equipo añadidas. Las poses especializadas conservan un gesto general donde la ficha carece de un clip específico. Los efectos nuevos son geometría y alfa procedural en el mundo. Los overlays anatómicos usan el sistema modular ya instalado. Se corrigieron sus pruebas para comprobar la superficie y el anclaje actuales en vez de buscar el antiguo acento. La validación del pipeline se guardó en una carpeta independiente. Los catálogos de inspección que están editando otros trabajos quedan fuera de la regeneración.

La comparación carga los dos scripts anteriores preservados en la misma escena en que ejecuta la candidata. Guarda posición de personaje y objetivo, cámara, resolución y hashes. Las pruebas recorren las escenas principales del Pecio y del Retiro y el campamento A1. La aceptación artística, la prueba táctil física y las medidas sostenidas de rendimiento siguen pendientes. Durante la verificación del Pecio se desambiguó un identificador de variable en la malla de un saco para que compilase el constructor de interiores.

Pasan 637 comprobaciones de la auditoría en escena (247 Pecio, 231 Retiro, 159 Campamentos). La matriz registra el clip de cada acción presente y sus ocho rumbos. En Pecio pasan también 2.354 verificaciones de sprites, 442 de PNJ, 99 regresiones de PNJ, 198 del shader de silueta, 674 de overlays actualizados y 159 de reglas e integración de combate. La suma incluye verificaciones que se solapan entre suites. Los avisos de ocupación del puerto móvil y limpieza de nodos al cerrar el proceso de auditoría se conservan en los registros.

Reproducción: ejecutar `res://combat/audit_combat_visuals.gd` desde cada proyecto. Los argumentos de usuario `-- --capture --fast-render` generan las tomas Forward+ en la carpeta `review` de la auditoría. El reloj de simulación se fija durante la comparación y se avanza el efecto a la fase medida antes de guardar el fotograma. `node scripts/report-combat-visual-audit.mjs` comprueba igualdad de cámara/posiciones/tamaño, resultados y hashes antes de montar la galería.

[Comparativas superpuestas](../../output/combat-visual-audit-20261124/index.html) · [Originales y comprobaciones](../../output/combat-visual-audit-20261124/originales.json).

## Entrega inicial — 15/11/2026

Encargo: trasladar a Godot el combate que ya existía, conservando los mapas actuales y aprovechando sus iconos, animaciones y fichas. Candidata instalada en `prototypes/godot-pecio` y `prototypes/godot-retiro`; fuente común en `prototypes/godot-shared/combat`. No se han sustituido escenarios ni modificado la mesa web del puerto 3000.

## Alcance implementado

- Selección de implicados por el DM; todas las iniciativas se introducen físicamente. Sin generador aleatorio. Los empates usan el orden de participantes, indicado en la ventana.
- Línea de iniciativa sin ventana, actual y seis previsiones como máximo. Arriba al centro por defecto; derecha/izquierda desde Ajustes, con margen lógico de 57 px (aproximación a 1,5 cm). Retratos, distinción de futuro y consulta por ratón o pulsación prolongada.
- Conocimiento registrado por el DM para un personaje concreto o compartido con el grupo. Sin investigación, el jugador no recibe CA/PG/velocidad del enemigo por el retrato ni su defensa en la tirada. El DM conserva su vista completa.
- Rueda abierta al empezar: ataques, trucos, conjuros y otras acciones. Cuatro accesos visibles en la esquina y páginas limitadas al contenido real. Disponibilidad según turno, acción, adicional, reacción, espacios, munición, estado y alcance.
- Ataque contra CA, d20 natural, críticos, salvaciones contra CD, daño físico con modificador separado, curación, resistencia/inmunidad, furtivo y secuencias de varios ataques/dardos. Si falta un modificador de salvación de PNJ, el DM aporta el total físico; no se inventa un valor.
- Cancelación antes de confirmar el dado, dentro de su propia ventana. Confirmar un resultado no permite repetirlo cancelándolo. Reintentar el mismo comando no duplica daño.
- Animación, proyectil, impacto y sonido tras resolver ataque y daño. Una secuencia retiene sus VFX hasta completar o descartar los ataques restantes. Continuación de dardos/ataques guiada por la interfaz.
- La reacción conserva por separado la secuencia y los resultados visuales de la acción interrumpida; no consume otro ataque ni vuelve a cobrar sus recursos. Escudo bloquea también los dardos posteriores de Misil mágico. La curación usa una señal verde, sin representar una herida en el receptor.
- Correr, Esquivar y Destrabarse de una pulsación; el resto solicita resolución al DM. Movimiento consumido en metros y coste doble cuando corresponda. Oportunidad al abandonar alcance, con elección de usar la reacción.
- Reacciones con desencadenante: Escudo puede interrumpir un impacto; preparación de ataque/conjuro y liberación posterior. Preparar un conjuro gasta su espacio y exige concentración al prepararlo; liberarlo no cobra otro espacio. Recarga de Anteros mediante d6 físico.
- Concentración, salvación tras daño y finalización voluntaria. Nube de niebla conserva su área de 6 m en el mundo y caduca con el reloj de campaña. La cámara encuadra participantes usando la proyección ortográfica y reencuadra objetivos fuera de vista al seleccionar una acción.
- El último enemigo derrotado termina el combate. Las fichas permanecen en el suelo. Un PJ a 0 PG conserva salvaciones de muerte, también si todo el grupo cae; 0 PG no implica muerte automática.
- Convención solicitada para contundente cuerpo a cuerpo: inconsciente a 1 PG y marcador azul. Otros finales a 0 PG usan sangre, conservando las reglas de muerte del PJ. Cualquier ataque cuerpo a cuerpo puede declararse no letal. Se mantienen cuerpo y escala sin comprimir el dibujo contra el suelo.
- Huida confirmada por el DM después de comprobar la salida real; no concede movimiento gratuito. Cancelación/finalización del encuentro por el DM. Guardado local de combate, incluidas posiciones, dados pendientes, concentración y secuencias, separado del guardado web.

Mia, Mike y Trinity usan las fichas presentes en Godot; se corrigen la curación de 2024 y las características de Trinity según su ficha canónica. Silverfarben y Anteros pueden añadirse explícitamente desde los controles del DM, con colocación comprobada contra el escenario. El zombi existente en el Retiro queda registrado en el combate. La arpía conserva garras/porra y su canto guiado; el zombi resuelve Fortaleza de no muerto antes de declarar el final.

## Arte y procedencia

Se exportan 42 perfiles de ambos juegos y 252 iconos: 247 del sistema existente y cinco SVG originales para Llama sagrada, Bendición, Escudo de fe, golpe de zombi y hacha lanzada. Se copian 121 originales de Silverfarben, Trinity y Anteros, conservando recortes y alfa; 642 fotogramas preparados sin cambiar resolución evitan repetir aislamiento de píxeles durante la partida. No se han generado ilustraciones nuevas ni usado imágenes comerciales como recursos.

Registro reproducible: `prototypes/godot-shared/combat/asset-provenance.json`, con originales, operaciones y SHA-256; `catalogue.json` conserva los recortes y sus parámetros. Los originales de campaña permanecen intactos. La extensión de una imagen que contenía JPEG se corrige en la copia nativa.

| ID / selector | Archivo propietario | Anterior / fuente | Candidata / valor | VA / referencia / aceptación |
| --- | --- | --- | --- | --- |
| `CombatTurnLine`, `CombatActionWheel`, `CombatIcon_<id>` | `combat_controller.gd`, `combat_turn_line.gd` | tira y menús del HUD anterior | línea con hasta 7 retratos; rueda de 4 accesos | VA-14/17/18; lectura de Octopath (REF-01) y referencias del usuario; revisión integrada realizada, aceptación artística pendiente |
| `icons/{sacred-flame,bless,shield-of-faith,zombie-slam,thrown-handaxe}.svg` | SVG de la fuente común | símbolo genérico o ausencia de ID | cinco dibujos vectoriales propios, familia existente | VA-01/17; familia del VTT; aceptación del usuario pendiente |
| `frames[silverfarben-hotel/rogue/anteros]`, `baked[SHA]` | `combat_catalogue.gd`, `bake_combat_sprites.gd` | atlas y recortes de D8 | PNG recortado sin reescalar, caché de texturas compartida | VA-03/10/17; arte actual conservado; no se certifica FPS sostenido |
| `frames[anteros].defeated` | `combat_catalogue.gd` | `anteros_defeated.png`, pose sentada | recorte existente `prone` de `anteros-actions.png`, altura lógica 38,755/92 | VA-03/10; silueta táctica REF-03 y petición del usuario; comprobado en render |
| `FogVolume_aoife` | `combat_visuals.gd` | área sin volumen persistente en el prototipo | 18 nubes con alfa, radio lógico de 6 m y huella horizontal aproximada de 6 m, sin placa rectangular | VA-16/17; función/atmósfera REF-01; comprobado en render, balance de mesa pendiente |
| `glow[receptor de curación]` | `combat_visuals.gd` | reacción genérica de impacto | alfa radial verde `(.35,1,.6,.65)`, diámetro 1,792 m, desvanecimiento de 0,75 s | VA-16; señal funcional propia, aceptación artística pendiente |
| `visuals.pools[actor_id]` | `combat_visuals.gd` | figura retirada o pose plana | cuerpo conservado, mancha suave de 1,6×1,1 m o 2,2×1,5 m para figuras altas | VA-10/16; petición del usuario; revisión integrada realizada |
| `audio/weapon.ogg`, `audio/spell.ogg` | exportador y `combat_visuals.gd` | biblioteca existente D8 | reutilización tras resultado final, respeta silencio | VA-16; créditos originales de D8, balance físico pendiente |
| `compat.pbr.{iron,dark-hull,leather}` | `prototypes/godot-pecio/scripts/pbr_material_kit.gd` | llamadas del constructor sin definición | alias a las familias actuales de hierro, casco y tejido rugoso; cuero conserva el color `#8c382b` del libro | VA-17; compatibilidad técnica, no aceptación de un acabado nuevo de cuero |

Los dos sonidos reutilizados proceden de Swishes Sound Pack (artisticdude) y Magic Spell SFX (JaggedStone), con los créditos CC0 ya registrados en `campaigns/one-shot/public/D8_NIGHT_ASSET_CREDITS.md`. No hay descargas nuevas de Pixabay. Las capturas de referencia de juegos se usan como estudio, no como materiales del juego.

La compatibilidad con el trabajo paralelo conserva la mochila compartida y añade tres alias de la familia PBR existente que los constructores actuales necesitaban. Se desambigua también un nombre local repetido en la vajilla de C7. No cambia su distribución. Las carpetas de inventario se sincronizaron conservando archivos locales más recientes. El alias de cuero es compatibilidad con tejido rugoso ya existente; su acabado específico sigue en el trabajo de interiores, sin declararlo aprobado aquí.

## Comprobaciones y capturas

Resultado final: **192 comprobaciones correctas, 0 fallos**: 124 del motor y 34 de integración en cada mapa. Se verifican además las diez capturas Forward+, la equivalencia de cámara de los pares y la identidad SHA-256 de los seis módulos comunes en ambos proyectos. El pie de controles conserva visible el botón de terminar turno incluso cuando cambia el texto de interacción.

Registros finales: `output/godot-combat-rules-final.log`, `godot-combat-integrated-pecio-final.log`, `godot-combat-integrated-retiro-final.log`. Las pruebas introducen valores físicos de manera determinista; el juego no lanza dados. Incluyen seis duelos simulados de Silverfarben contra Anteros, turnos, cancelación, preparación, reacción, concentración, recarga, munición, salvaciones, derrota y repetición sin bloqueo.

Capturas reales de los dos mapas en Godot 4.7.2, Forward+ / NVIDIA MX350, 1280×720: `output/godot-combat-20261115/captures`. La galería `output/godot-combat-20261115/index.html` usa la superposición común por clic, teclado y ampliación. Registra originales, dimensiones, hashes y cámara.

El «antes» es el HUD anterior conservado y mostrado dentro de la candidata actual; no se hace pasar por una versión histórica. Cada par usa la misma escena, cámara, posiciones, resolución y reloj detenido. Niebla, dados y cuerpo caído se presentan como muestras actuales separadas, no como comparativas de estados distintos.

Otras sesiones ya ocupaban puertos del puente móvil de cargas (47920/47921); sus advertencias se conservan. No es el transporte del combate. Las comprobaciones automáticas y el render no acreditan interacción con móviles físicos, rendimiento sostenido ni aceptación artística del usuario.

## Uso y mantenimiento

Abrir `JUGAR-GODOT.cmd` y elegir Pecio o Retiro. F2: DM; F1: jugador; F3: proyector. Desde el DM, añadir las miniaturas opcionales, iniciar combate y elegir implicados. Cada jugador introduce su iniciativa en F1; el DM registra las de PNJ en F2. El selector de identidad permite controlar Silverfarben una vez añadido. K abre ataques y L magia; no ejecutan ataques libres.

Los ajustes del DM permiten modificar CA efectiva, condiciones, movimiento, espacios y munición para las resoluciones de mesa. Guardar antes del ensayo y cargar después permite repetirlo con las mismas fichas presentes; este guardado todavía no recrea una campaña ni miniaturas ausentes de una sesión nueva.

Fuente única: editar `prototypes/godot-shared/combat`; `node node_modules/tsx/dist/cli.mjs scripts/export-godot-combat.ts` exporta datos/arte y sincroniza ambas copias. Si se modifica un atlas o sus recortes, volver a ejecutar `res://combat/bake_combat_sprites.gd` con Godot y después el exportador. Las escenas consumen las copias `res://combat`. Pruebas: `res://combat/test_combat_rules.gd` y `res://combat/test_combat_integration.gd`. Capturas: `res://combat/capture_combat.gd`.

## Límites de esta entrega

El módulo usa datos de D8 y Stormwreck en los dos prototipos Godot existentes; el catálogo de 42 perfiles no significa que se hayan instalado 42 miniaturas en estos mapas. No se crean nuevas escenas de D8 ni se añaden PNJ a la historia automáticamente.

Es una autoridad local por sesión. F1/F2/F3 son vistas locales, no autenticación, multijugador sincronizado ni enlace con cuentas/guardados web. El consumo de munición y los recursos de combate se conservan en este estado local; la mochila compartida de campaña necesita su integración de autoridad antes de dar paridad entre dispositivos.

Las áreas con varios objetivos, cobertura, visibilidad, efectos especiales de aventura y las capacidades no modeladas solicitan resolución del DM. Manos ardientes y Canto cautivador indican área, CD y dados; el DM registra todos los resultados y PG antes de confirmar. No se presenta este módulo como una automatización de todo el SRD. El repertorio respeta las fichas actuales; la biblioteca de iconos no concede niveles o conjuros nuevos.

El flujo guiado admite una interrupción de reacción a la vez. Cadenas anidadas adicionales de reacciones necesitan arbitraje del DM; no se presentan como automatizadas.

El cálculo admite la marca de terreno difícil y suma su sobrecoste al de arrastrarse. No se acredita una detección automática de todos los terrenos especiales de los dos mapas: donde falte la marca, el DM ajusta el movimiento restante.

Referencia normativa: [Playing the Game 2024](https://www.dndbeyond.com/sources/dnd/br-2024/playing-the-game) y [Rules Glossary 2024](https://www.dndbeyond.com/sources/dnd/br-2024/rules-glossary). La variante contundente a 1 PG es una instrucción de esta mesa; se distingue de la elección general de dejar inconsciente mediante ataque cuerpo a cuerpo.

Esta entrega no cierra aceptación visual, pruebas físicas, red/guardado, M5/M7 ni las fases de acabado de los mapas.
