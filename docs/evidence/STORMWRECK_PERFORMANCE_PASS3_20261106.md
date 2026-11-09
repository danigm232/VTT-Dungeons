# Rendimiento del Retiro y el Pecio · tercera pasada

El objetivo sigue siendo una media de al menos 30 FPS en cada zona y tramo y un máximo de 33,33 ms entre fotogramas durante el juego, con el acabado actual. Esta candidata avanza en VA-17 y Q1.3b, con validación de rendimiento abierta en Q1.4 y M7.

## Cambios

- El Retiro agrupa las mallas estáticas pequeñas en sectores de 16 metros. Si el volumen de un sector queda fuera de la cámara, su decoración se excluye de la evaluación de la vista principal. Se conserva el orden de las mallas que llegan a Babylon, y los objetos dinámicos y la arquitectura de gran tamaño conservan su evaluación habitual. Las listas de sombras, las consultas de posición y las colisiones se mantienen en sus sistemas. La importación de GLB sigue ocurriendo al entrar. [Propietario](../../campaigns/stormwreck-isle/public/retreat-quick-opt.ts).
- El Pecio suspende las transformaciones y deshabilita las instancias de gotas y copos cuando el foco queda totalmente protegido. Se mantienen preparados los recursos y el reloj de precipitación. Al salir, cada partícula recupera la posición que le corresponde en ese instante. Suelo mojado, acumulación, lluvia y nieve visibles usan los mismos valores y materiales. [Propietario](../../engine/client/world-weather.ts).

## Comparación de escritorio

Chrome con Intel UHD por Direct3D 11, 1280 × 720, cámara de jugador a 15° y giro de 30°, de noche con lluvia. Cuatro tandas de ocho segundos por vista, en orden base, candidata, candidata, base sobre la misma escena. La media de cada variante usa sus dos tandas. Los mínimos y máximos toman el peor dato de ambas.

| Foco | Mallas examinadas | FPS medios | Peor segundo en FPS | Mayor intervalo |
| --- | ---: | ---: | ---: | ---: |
| Retiro · celdas A1 | 2.473 → 1.295 | 24,4 → 26,9 | 21,3 → 20,0 | 83,5 → 99,9 ms |
| Retiro · biblioteca A4 | 2.473 → 1.576 | 24,1 → 28,9 | 16,4 → 20,6 | 100,4 → 133,3 ms |
| Retiro · embarcadero | 2.473 → 1.290 | 37,4 → 41,0 | 32,4 → 34,4 | 66,7 → 66,7 ms |
| Pecio · camarote C5 | 1.516 → 1.516 | 44,5 → 50,0 | 33,9 → 45,3 | 50,8 → 49,9 ms |

La comparación de C5 corresponde a la versión final, que deshabilita las instancias resguardadas además de dejar de actualizar sus posiciones. La prueba anterior, que solo omitía las transformaciones, fue variable. En A1 y A4 el mayor intervalo empeoró en una de las tandas aunque subió la media. Ninguno de los cuatro focos cumplió el límite de 33,33 ms en todas sus tandas.

Las cuatro parejas tienen cámara y reloj de animación fijados. A4, embarcadero y C5 coinciden píxel a píxel. En A1 difieren seis de 921.600 píxeles. [Comparación de píxeles](../../output/stormwreck-performance-20261106-pass3/visual-pixels.json).

[Datos y comparativas superpuestas](../../output/stormwreck-performance-20261106-pass3/index.html). [Candidata aislada](../../runtime/stormwreck-performance-20261106-pass3/REVISAR-RENDIMIENTO.cmd).

## Barrido nocturno con lluvia

Diez focos por mapa, a 1280 × 720 y con el mismo acabado, en tandas de cinco segundos después de preparar cada cámara. El barrido pasó por A1–A5, umbral, jardín, bosquete, expedición y embarcadero en el Retiro y por C1–C9 y cofa en el Pecio.

| Mapa | Media ≥30 FPS | Todos los segundos ≥30 FPS | Todos los fotogramas ≤33,33 ms |
| --- | ---: | ---: | ---: |
| Retiro | 9 de 10 | 8 de 10 | 0 de 10 |
| Pecio | 10 de 10 | 10 de 10 | 4 de 10 |

A3 quedó en 29,3 FPS de media en el Retiro. A4 superó 30 FPS de media en el barrido, con 28,5 FPS en su peor segundo. Las tomas de Pecio que cumplieron el intervalo estricto fueron C3, C8, C9 y cofa. Son vistas fijas de escritorio.

## Recorridos con clima

El visor envía estados sucesivos de movimiento al renderizador con puertas abiertas y conexiones del terreno vigente. Usa cámara de seguimiento a 15° con giro de 30°, noche, precipitación de intensidad 3 y viento de 0,9. Se mide toda la secuencia después de preparar el punto de partida, incluidos los cambios de estancia. Es un diagnóstico de movimiento local. La prueba de red y el ensayo físico tienen cobertura separada.

| Recorrido | Clima | Pasos | FPS medios | Peor segundo en FPS | Mayor intervalo |
| --- | --- | ---: | ---: | ---: | ---: |
| Retiro · embarcadero al templo | Nieve | 194 | 22,7 | 8,9 | 249,9 ms |
| Retiro · embarcadero al templo | Lluvia | 194 | 28,2 | 10,0 | 183,3 ms |
| Retiro · biblioteca al umbral | Nieve | 20 | 26,2 | 20,3 | 133,2 ms |
| Retiro · biblioteca al umbral | Lluvia | 20 | 24,6 | 12,6 | 266,6 ms |
| Pecio · C5 a C1 | Nieve | 15 | 3,9 | 0,2 | 4.465,8 ms |
| Pecio · C5 a C1 | Lluvia | 15 | 34,4 | 16,7 | 216,4 ms |

El parón del primer recorrido de nieve del Pecio se registró entre las casillas (25,16) y (26,16) de la cubierta principal. El visor completó las seis rutas sin errores de consola.

Se repitió C5 a C1 con nieve, en otra sesión y con el perfilador de Chrome. La primera pasada registró un intervalo máximo de 1.999,6 ms y 97 compilaciones de shaders. Una sola llamada de dibujo en la casilla (18,16) tardó 1.320,5 ms e inició 58 compilaciones. La repetición en la misma escena redujo el máximo a 199,9 ms y registró cinco compilaciones. Sigue abierta la preparación anticipada de las variantes de luz y material en los cruces. [Datos del perfil](../../output/stormwreck-performance-20261106-pass3/repeat-wreck-snow.json).

## Candidata jugable

Compilación de cliente y servidor y comprobación de tipos correctas. Pasaron 54 pruebas dirigidas, incluidas la selección al girar la cámara y la reanudación exacta de gotas y copos al salir de cubierta. Diez comprobaciones de red con una partida temporal verificaron el acceso de DM, los dos mapas, movimiento, clima, reconexión e interfaces. Las pruebas de rendimiento del visor se mantienen separadas del ensayo físico de Q1.4 y M7. [Pruebas de red](../../output/stormwreck-performance-20261106-pass3/network-smoke.json).
