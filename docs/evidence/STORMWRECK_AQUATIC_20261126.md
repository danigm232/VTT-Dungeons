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
