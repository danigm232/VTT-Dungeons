# Agua e interacciones del Pecio

La prueba local usa el Pecio de Stormwreck y las fichas vigentes de Mía, Mike y Trinity. `U` y el botón contextual comparten el control de inmersión y ascenso en mar abierto. El agua de C9 conserva las rutas P14 y P15 y las bolsas de aire. El movimiento vertical usa las colisiones del mapa. La humedad, la estela y las burbujas también funcionan al cambiar de cámara.

| Componente | Archivo propietario | Comportamiento candidato | Revisión |
| --- | --- | --- | --- |
| `AquaticEffects/Estela` | `prototypes/godot-pecio/scripts/aquatic_vfx.gd` | Anillos independientes anclados a la onda, emitidos durante la natación. | VA-03/07/14. |
| `AquaticEffects/Burbujas` | `prototypes/godot-pecio/scripts/aquatic_vfx.gd` | Pequeñas ráfagas ascendentes al bucear. | VA-03/07/14. |
| `OceanWater` | `prototypes/godot-pecio/shaders/ocean_water.gdshader` | La transparencia aumenta de forma local en la línea de visión hacia las fichas mojadas. El mar conserva sus olas y su espuma. | VA-03/07/14. |
| `SubmergedBounceLight` | `prototypes/godot-pecio/scripts/aquatic_vfx.gd` | Luz azul de alcance corto en C9 para distinguir al personaje y el objeto cercano en penumbra. | VA-03/07/14. |
| Humedad de la ficha | `prototypes/godot-pecio/scripts/aquatic_state.gd` | Fracción sumergida, saturación al bucear y secado más rápido con tiempo despejado. Lluvia y tormenta sostienen la humedad a la intemperie. | VA-03/10/14. |
| `IronChestMesh_C9` | `prototypes/godot-pecio/scripts/pecio_canon_controller.gd` | Tapa animada mediante el recurso del cofre y gesto orientado al elegir la ruta sumergida. Conserva el paquete, el sonido y el botín de C9. | VA-03/07/14. |
| Tirador y gesto de puerta | `prototypes/godot-pecio/scripts/interactive_door.gd` | El gesto mira al tirador y precede al giro de la hoja. | VA-03/07. |

El contador usa `máx(30 s, 60 s × (1 + modificador de CON))`. Con CON 14, Mía tiene 3 minutos. Con CON 12, Mike y Trinity tienen 2 cada uno. Fuera de combate avanza con el reloj de mesa. Durante el combate se descuentan seis segundos al terminar el turno propio. El agotamiento por falta de aire tiene su propio contador y se quita al recuperar la respiración. Para el movimiento y las armas se aplican las reglas de natación y combate bajo el agua. La humedad visible depende del clima y la inmersión. [Glosario de reglas de D&D 2024](https://www.dndbeyond.com/sources/dnd/br-2024/rules-glossary#SuffocationHazard) · [Combate bajo el agua](https://www.dndbeyond.com/sources/dnd/br-2024/playing-the-game#UnderwaterCombat).

Se conservan los originales PNG. Las definiciones de cada acción indican procedencia, anatomía, registro de recorte, talla y fotogramas WebP sin pérdida. Godot carga los dibujos de agua e interacciones cuando los necesita y mantiene hasta doce secuencias en memoria para reutilizarlas. La revisión visual y la prueba física con móvil se registran por separado.

El catálogo del 27/11/2026 contiene 144 secuencias dibujadas de ocho fotogramas. Son 48 por personaje, con ocho rumbos para nadar, bucear, abrir puerta, abrir cofre, abrir el cofre sumergido y guardar un objeto. La dirección que lleva el personaje se mantiene cuando gira la cámara. Cada vista tiene un código y puede revisarse cuadro a cuadro en el visor. [Visor y comparativa](../../output/stormwreck-aquatic/index.html) · [Registro de procedencia](../../output/stormwreck-aquatic/capture-register.json).

La revisión `70a4d9f6…` pasó 186 comprobaciones funcionales y 46 con render Forward+. Incluye los 144 clips en el juego, los controles de inmersión, el giro de cámara, la puerta C5, el cofre C6, la recogida de un objeto y la tapa del cofre C9. Se mantienen separadas la aceptación artística y la prueba física de los controles móviles.

## Burbujas y salida del agua · 27/11/2026

| Elemento | Archivo propietario | Base y cambio |
| --- | --- | --- |
| `AquaticEffects/Burbujas` | `scripts/aquatic_vfx.gd` | Las esferas pequeñas pasan a planos de dos triángulos con borde y reflejo. El modo reducido conserva el 45 % de la emisión. |
| `AquaticEffects/Goteo` | `scripts/aquatic_vfx.gd` | Tras dejar de tocar el agua, la ropa suficientemente empapada emite gotas breves. Se reutilizan geometría, sombreado y materiales entre héroes, y el emisor se crea al necesitarlo. |
| Color de humedad | `scripts/player_token.gd` y `scripts/aquatic_state.gd` | La mezcla RGB a saturación pasa de `[0.75, 0.82, 0.89]` a `[0.69, 0.79, 0.88]`. El color recupera su valor seco con la humedad restante. |
| Transparencia local al bucear | `scripts/ship_environment.gd` | El volumen que abre la vista en el agua cubre también la trayectoria ascendente de las burbujas. El radio mínimo pasa de 0,8 a 1,2 m durante la inmersión. |

Los efectos reutilizan las 144 secuencias existentes. Referencias de acabado REF-01 y REF-07, con revisión VA-07, VA-10 y VA-14. La comparativa conserva personaje, cámara, clima y estado equivalente. [Comparación en Godot y registro](../../output/stormwreck-aquatic/vfx/index.html).

Pruebas de esta pasada. 192 comprobaciones funcionales y 54 con render Forward+. Se verifican la emisión bajo el agua en modo reducido, el goteo al volver a cubierta, su retirada al sumergirse y la reutilización de recursos entre héroes. Prueba física en móvil pendiente.

## Humedad por altura y huellas

Mía, Mike y Trinity acumulan humedad en ocho bandas que se secan por separado. Un vadeo afecta a las bandas bajas. Nadar en superficie moja la ropa hasta los hombros. Una inmersión satura también la cabeza. Volver a una zona somera conserva la humedad previa de la parte alta hasta que se seca. La lluvia humedece primero la parte superior de los héroes expuestos.

| Elemento | Archivo propietario | Base y candidato | Revisión |
| --- | --- | --- | --- |
| `CharacterVisual/BodyStateSurface` | `characters/body_surface.gd`, `characters/body_effects.gdshader` | El tinte uniforme de la ficha pasa a un sombreado con reflejos en las bandas mojadas. El material usa el alfa y el encuadre del fotograma vigente y compone los estados de combate sobre la humedad. | VA-03/10/14, REF-01 y REF-07. |
| `C8_FloodWater` | `scripts/wreck_structure.gd`, `scripts/interiors_builder.gd`, `scripts/player_token.gd` | La profundidad usaba un tope de 0,55 m. Ahora se calcula hasta la cota existente del agua dentro de su contorno. Las salpicaduras salen a esa altura. | VA-07/14, REF-07. |
| `AquaticEffects/Goteo` | `scripts/aquatic_vfx.gd` | El emisor fijo al 59 % de la talla pasa a la zona más alta que se mojó, con duración e intensidad según la saturación. | VA-07/10, REF-07. |
| `WetFootprints` | `scripts/wet_footprints.gd`, `shaders/wet_footprint.gdshader` | Se reutiliza la forma de suela del Retiro en un material procedural compartido. Los pasos apoyados alternan pies, consultan la normal del suelo y agotan su humedad con el clima actual. Cada héroe usa un lote de hasta 24 marcas, creado en su primer paso mojado. | VA-07/14, REF-07. |
| Indicador de humedad | `scripts/vtt_player_hud.gd` | El indicador general distingue botas, piernas, ropa y cuerpo empapado. El aire conserva prioridad durante el buceo. | VA-14. |

La humedad es ambiental. Las definiciones de anatomía, escala, sprites y equipamiento pintado conservan la revisión `70a4d9f6…`. El secado afecta a la ropa y a las huellas. Unas botas saturadas dejan huellas durante más tiempo. Como referencia, una marca saturada se seca en unos 23 s al mediodía despejado y tarda más con niebla, lluvia o de noche.

Pasaron 199 comprobaciones funcionales y 20 en Godot Forward+. Las comparativas de profundidad usan la pose fija de Mía en C1 y la misma cámara y luz. La secuencia de huellas se obtuvo caminando por la cubierta con el controlador del juego. Las pruebas verifican que el clima cambia el ritmo de marcas ya depositadas y que el lote deja de actualizarse tras secarse. Queda pendiente la prueba física en móvil. [Visor](../../output/stormwreck-aquatic/wetness/index.html) · [Originales y hashes](../../output/stormwreck-aquatic/wetness/capture-register.json).

## Silueta mojada, luz y sombras en el Pecio

La capa corporal mojada dibujaba una segunda silueta separada 8 mm del original. El reflejo claro hacía visible la separación. Además, los sprites estaban en la capa 128 y el sol iluminaba la capa 1. La sombra del sprite estaba desactivada y el contacto se dibujaba a una altura fija a partir de la ficha.

| Elemento | Archivo propietario | Candidato | Revisión |
| --- | --- | --- | --- |
| `Sprite3D` de personajes y criaturas | `scripts/player_token.gd`, `shaders/actor_surface.gdshader` | Las ocho bandas de humedad ajustan el color y la rugosidad en el material del sprite. El recorte se obtiene del mismo alfa que define el cuerpo. La mascarilla de estados sigue en su capa habitual. | VA-03/10/14, REF-01/07. |
| `ShipEnvironment` | `scripts/ship_environment.gd` | Los doce tokens de jugador y criatura se registran por tipo. Cada sprite recibe la luz de su compartimento o la de cubierta. El relleno de cubierta depende de hora y clima. Camarotes, sentina y bodega conservan distintas intensidades. | VA-10/11/12, REF-01. |
| `ContactShadow` y proyección de `Sprite3D` | `scripts/player_token.gd`, `scripts/token_floor.gd`, `shaders/actor_contact_shadow.gdshader` | El contacto se apoya en el suelo físico y pierde fuerza al elevarse. El sprite vuelve a intervenir en la pasada de sombras de las luces de la escena, recortado por el alfa de la pose. | VA-07/11, REF-01/07. |
| `WetFootprints` y `AquaticEffects/Goteo` | `scripts/wet_footprints.gd`, `shaders/wet_footprint.gdshader`, `scripts/aquatic_vfx.gd` | Aparece un charco al tocar suelo tras salir bastante mojado. Durante los primeros 2,2 s se pueden depositar hasta tres en total, incluidos los que quedan atrás al caminar. Comparten lote con las huellas, ajustan el secado al clima y siguen la superficie. Las gotas se reducen de tamaño. | VA-07/15/16, REF-07. |

El material reutiliza las coordenadas del fotograma que suministra Sprite3D, incluidas las de una región de atlas. Usa la orientación de la cámara principal en la pasada de sombras. [Código de Sprite3D](https://github.com/godotengine/godot/blob/master/scene/3d/sprite_3d.cpp) · [Referencia de shaders espaciales](https://docs.godotengine.org/en/stable/tutorials/shaders/shader_reference/spatial_shader.html).

Las capturas corresponden a la escena jugable. Incluyen cubierta despejada, ocaso, tormenta nocturna, C4, C8 y C9 con y sin farol. El registro enlaza los originales de la revisión anterior que se usan para Mía. [Visor](../../output/stormwreck-aquatic/actor-light/index.html) · [Registro de capturas](../../output/stormwreck-aquatic/actor-light/capture-register.json).

Pasaron 38 comprobaciones en la escena con Forward+, 2.239 de entorno y 199 de agua. Las comparativas de sombra conmutan cada tipo por separado sobre la misma escena. En la prueba de salida hay charco antes del primer paso, aparecen huellas y más gotas en el primer tramo y las marcas desaparecen al secarse. La prueba física en móvil sigue pendiente.
