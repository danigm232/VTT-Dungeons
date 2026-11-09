# Rendimiento del Retiro y del Pecio · segunda pasada

Continuación del objetivo de mantener un suelo de 30 FPS en todas las zonas y recorridos de ambos mapas con el acabado íntegro. Se registran también los intervalos individuales que superan 33,33 ms. Base de comparación: [pasada anterior de optimización](STORMWRECK_PERFORMANCE_20261105.md).

## Trabajo de renderizado

| Propietario | Optimización | Elementos conservados |
| --- | --- | --- |
| `campaigns/camp-rests/public/camp-surface-effects.ts` | La lista de dibujo de cada sombra omite mallas estáticas completamente fuera de los lados del encuadre de la luz, con margen para el desplazamiento por normal. | Lista original de proyección, luces, resolución, filtro, frecuencia, geometría animada, instancias y desplazamientos de profundidad. |
| `engine/client/terrain3d.ts` | El sol del Pecio reutiliza su matriz de proyección dentro del mismo fotograma cuando la vista y los emisores coinciden. | Matriz original de Babylon, encuadre de la sombra y cálculo nuevo al cambiar el fotograma. |
| `engine/client/coastal-backdrop.ts`, `apps/web/world.ts` | El Retiro precalcula términos fijos de onda y espuma. El Pecio omite los trazos de rocío completamente fuera de pantalla. | Oleaje, espuma, normal, UV, cadencia y trazos visibles. |
| `campaigns/stormwreck-isle/public/retreat-global-visuals.ts`, `retreat-local-occlusion.ts`, `campaigns/camp-rests/public/a1-visuals.ts` | Se aplica un único modo de niebla. Los muebles conservan su transparencia entre fotogramas mientras sigan tapando al personaje. | Misma niebla cuando tiene contribución, mismos rayos de visibilidad y restauración exacta de la opacidad. |

VA-17. Las zonas, los datos de navegación y los materiales artísticos de la candidata son los del acabado por zonas.

## Medición de escritorio

Chrome con Intel UHD por Direct3D 11, resolución de dibujo 1280 × 720 y cámara de jugador a 15°. Tandas de 12 segundos para la base y de 20 para la candidata final. Comparación diagnóstica de una tanda por estado, con el mismo encuadre y configuración gráfica. El mínimo se calcula en ventanas completas de un segundo.

| Foco diurno | FPS medios, base → candidata | Mínimo por segundo, base → candidata | p95, base → candidata |
| --- | ---: | ---: | ---: |
| Pecio, cubierta C1 | 29,7 → 52,7 | 25,6 → 41,3 | 50,1 → 33,3 ms |
| Retiro, celda A1 | 16,4 → 24,6 | 14,5 → 20,3 | 99,9 → 83,3 ms |
| Retiro, biblioteca A4 | 13,2 → 27,9 | 11,4 → 19,7 | 101,7 → 66,5 ms |

C1 superó 30 FPS en todas las ventanas de un segundo de la tanda. El intervalo máximo fue 66,8 ms. A1 y A4 siguen por debajo del umbral. Las cifras del visor corresponden a estas vistas fijas. La validación de recorridos, dispositivos físicos y resto de zonas sigue en Q1/M7.

En la biblioteca de noche con lluvia, dos tandas de 12 segundos a 30° de giro dieron **4,0 → 20,1 FPS medios**, **3,8 → 17,7 FPS** en el peor segundo y **283,3 → 83,3 ms** de p95. La niebla conserva los límites lineales del Retiro. La revisión visual incluye los dos estados de A4, A1 y C1.

El cálculo del mar dio **8.325.504 valores iguales** en 144 casos, con ambos tamaños de agua, distintas intensidades y desplazamientos. Se compararon posiciones, normales, color, UV e índices.

[Comparativas superpuestas y datos](../../output/stormwreck-performance-20261106/index.html).

## Barrido de los focos jugables previo al ajuste de charcos

Se midieron 40 tandas de seis segundos con un actor en el visor. En el Pecio se cubrieron C1–C9 y la cofa. En el Retiro, A1–A5, umbral, jardín, bosquete, expedición y costa. Cada foco se midió de día y de noche con lluvia. Las 40 tomas cargaron con los materiales listos y el visor terminó sin errores de consola en ambos mapas.

| Mapa | Media ≥30 FPS | Todos los segundos ≥30 FPS | Todos los fotogramas ≤33,33 ms |
| --- | ---: | ---: | ---: |
| Pecio | 19 de 20 | 19 de 20 | 4 de 20 |
| Retiro | 6 de 20 | 2 de 20 | 0 de 20 |

C5 nocturno con lluvia quedó en 29,9 FPS de media y 27,1 FPS en su peor segundo. En el Retiro, A4 nocturna con lluvia registró la media más baja, 18,3 FPS, y A3 nocturna con lluvia el peor segundo, 13,8 FPS. El intervalo más largo fue de 66,6 ms en el Pecio y 198,1 ms en el Retiro. Estas tomas fijas localizan la deuda de rendimiento. La comprobación de cada tramo en movimiento y de dispositivos físicos sigue abierta.

[Resumen del barrido](../../output/stormwreck-performance-20261106/matrix-summary.json). [Datos del Pecio](../../output/stormwreck-performance-20261106/matrix-wreck-ship.json) y [datos del Retiro](../../output/stormwreck-performance-20261106/matrix-dragon-rest.json).

## Ajuste de charcos del Pecio

En `engine/client/rain-accumulation.ts`, el material del Pecio omite la simulación de charco y anillos cuando el fragmento queda protegido, su pendiente impide acumular agua o el peso del charco es cero. Conserva el brillo de humedad de las superficies expuestas, las fórmulas de los charcos visibles y la misma lluvia. La protección por camarote conserva sus coordenadas.

Con C5 de noche y con lluvia, el ensayo de 12 segundos pasó de **32,6 a 40,1 FPS medios** y de **25,5 a 30,6 FPS** en el peor segundo. El mayor intervalo pasó de 90,4 a 71,8 ms, todavía fuera del límite de 33,33 ms. Se revisó el par de capturas y se incorporó la variante al Pecio. El ensayo equivalente del Retiro queda separado, pues A4 pasó de 19,0 a 17,4 FPS de media. El barrido general anterior mantiene su propia versión y las pruebas de recorrido siguen pendientes.

## Candidata jugable

Compilaciones de cliente y servidor y comprobación de tipos correctas. Pasaron 51 pruebas dirigidas de la segunda pasada y 20 en la batería específica posterior al ajuste de charcos. Diez comprobaciones de red sobre la compilación final validan el acceso de DM, los dos mapas, movimiento, clima y reconexión en una partida temporal. [Registro de red](../../output/stormwreck-performance-20261106/network-smoke.json). [Abrir candidata aislada](../../runtime/stormwreck-performance-20261106/REVISAR-RENDIMIENTO.cmd).
