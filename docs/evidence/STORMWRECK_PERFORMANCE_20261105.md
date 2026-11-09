# Rendimiento del Retiro y del Pecio · 05/11/2026

[Segunda pasada y mediciones posteriores](STORMWRECK_PERFORMANCE_20261106.md).

Objetivo del usuario: superar 30 FPS sostenidos en ambos mapas con el acabado actual. Candidata aislada en `runtime/stormwreck-performance-20261105`. El lanzador `REVISAR-RENDIMIENTO.cmd` abre una partida temporal con enlaces para DM, jugador y proyector.

## Cambios de renderizado

| Propietario | Trabajo que se evita | Conservación |
| --- | --- | --- |
| `apps/web/world.ts`, `engine/shared/terrain.ts` | Las luces del Pecio solo se vuelven a sincronizar con las mallas al encenderse o apagarse. La proyección visual indexa las casillas y usa la misma interpolación de alturas. | Intensidades, alcance, separación por habitaciones, puntos de apoyo y movimiento. |
| `engine/client/wreck-ocean.ts`, `engine/client/wreck-dragon-bones.ts` | Se descartan objetos fuera del encuadre reflejado, se omiten lecturas de reflejo cuando su contribución es cero y se evalúa una vez la caída de color del bajío más cercano. Se dividen los huesos lejanos en seis rangos de dibujo con límites propios. | Geometría, UV, normales, material óseo, límites del emisor de sombra, oleaje y tamaño y cadencia del reflejo. |
| `campaigns/camp-rests/public/a1-visuals.ts`, `camp-surface-effects.ts`, `engine/client/wreck-environment.ts` | Una búsqueda de actores por fotograma para las luces de A1, pertenencia por conjunto en sombras locales y trabajo de deposición omitido cuando su aporte es cero. | Luz, resolución de sombra, lluvia, nieve, inundación y charcos. |
| `campaigns/stormwreck-isle/public/retreat-local-occlusion.ts`, `retreat-global-visuals.ts`, `retreat-refinement-coast.ts` | Se comparten los límites de malla entre los doce rayos del personaje. Los materiales conservan su modo mientras se aplica el recorte. Se evita reenviar opacidad del mar que ya está en el búfer. | Los mismos rayos, opacidades, texturas, encuadres y geometría animada del agua. |

Bloque VA-17. Las decisiones artísticas y las pruebas físicas de Q1 y M7 conservan su registro independiente.

## Medición

Pruebas cortas en Chrome con Intel UHD por Direct3D 11, vista de jugador a 1280 × 720, misma inclinación, clima y acabado en cada comparación. Se registró el tiempo entre fotogramas visibles en el visor aislado. El mínimo usa ventanas completas de un segundo. Un p95 por encima de 33,3 ms indica que la cadencia aún cae por debajo del objetivo. Se conservaron las tandas separadas para distinguir la variabilidad de la mejora.

| Zona | FPS medios, base → optimización | Mínimo por segundo, optimización | p95, optimización |
| --- | ---: | ---: | ---: |
| Pecio C1, cubierta | 24,2 → 31,0 | 28,6 | 53,5 ms |
| Pecio C4, camarote | 29,6 → 39,6 | 36,4 | 36,2 ms |
| Pecio C9, bodega | 59,7 → 56,5 | 56,3 | 18,2 ms |
| Retiro A1, celda | 17,0 → 20,7 | 17,8 | 72,1 ms |
| Retiro A4, biblioteca | 11,3–17,0 → 19,0 | 15,5 | 72,3 ms |
| Retiro, costa | 27,1 → 27,5 | 24,0 | 36,4 ms |

Tras dividir el lote óseo, la comprobación adicional de C1 dio **32,6 FPS medios**, **27,1 FPS** en el segundo más lento y **49,9 ms** de p95. Esa tanda coincidió con la preparación de la compilación y se conserva separada. La matriz es un diagnóstico corto de seis encuadres. Siguen pendientes la comparación prolongada en el equipo de mesa, las transiciones y los perfiles físicos. El objetivo de más de 30 FPS sostenidos sigue abierto.

[Comparativas superpuestas y mediciones](../../output/stormwreck-performance-20261105/index.html). [Lanzador de la candidata](../../runtime/stormwreck-performance-20261105/REVISAR-RENDIMIENTO.cmd).

## Verificación

55 pruebas dirigidas en nueve archivos, tipos de cliente y compilación de servidor correctos. Se comprobó que los seis rangos óseos cubren los índices originales completos, que el recorte de la biblioteca restaura el modo opaco al salir y que la costa conserva el límite de la lámina de agua. Se revisaron la cubierta C1 y la biblioteca A4 con pose y resolución equivalentes. El oleaje, las aves y las partículas avanzan durante la sesión.

Compilación final del cliente correcta. Diez comprobaciones con la partida temporal verifican acceso, sincronización de ambos mapas, movimiento visible en el proyector, clima y reconexión. [Registro de la prueba de red](../../output/stormwreck-performance-20261105/network-smoke.json).
