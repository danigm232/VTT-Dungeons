# Rendimiento del Retiro y el Pecio · mar y espuma

Cuarta pasada sobre el acabado por zonas. Aplica a VA-15 y VA-17. Se conservan la geometría y los materiales visibles, el reloj de oleaje, la iluminación, las rutas y los apoyos. El objetivo sigue siendo al menos 30 FPS de media en cada zona y tramo, con intervalos de hasta 33,33 ms durante el juego.

| Escena y elementos | Cambio |
| --- | --- |
| Retiro · `a1:bay-background`, `a1:shore-wash`, `retreat:bay-maritime-skirt` | El mar lejano comprueba por separado sus tres franjas. Antes usaba un volumen único que abarcaba también el hueco entre ellas. Si las franjas quedan fuera de la vista, se omite actualizar sus vértices y su desvanecimiento. La espuma usa un volumen que abarca el recorrido máximo de su animación. El agua cercana conserva el alfa opaco que ya escribe el oleaje, evitando revisarlo una segunda vez. |
| Pecio · `wreck-ocean`, `wreck-contact-foam`, restos flotantes y reflejos | El recorte de cubierta ya ocultaba el mar y la espuma en las plantas bajas. El reloj del material y los restos ocultos se suspenden durante ese recorte y se sincronizan al volver a mostrarse. El material del mar descarta primero los fragmentos transparentes del horizonte antes de calcular su color y sus reflejos. |

Las cámaras secundarias y los destinos de renderizado que necesitan el agua del Retiro conservan sus actualizaciones. Cuando el volumen del agua cruza la cámara, todavía puede haber agua tapada por roca. Este descarte se basa en el encuadre y los volúmenes del oleaje.

## Medición de escritorio

Chrome con Intel UHD, 1280 × 720, cámara de jugador a 15° con giro de 30°, de noche con lluvia. Cuatro tandas de cinco segundos por vista en orden base, candidata, candidata, base. La media combina las dos tandas de cada variante. El peor segundo y el mayor intervalo toman el peor dato de ambas.

| Vista | FPS medios | Peor segundo en FPS | Mayor intervalo |
| --- | ---: | ---: | ---: |
| Retiro · biblioteca A4 | 30,8 → 30,5 | 26,1 → 27,1 | 66,9 → 50,9 ms |
| Retiro · expedición | 37,1 → 36,4 | 31,9 → 25,2 | 66,7 → 363,1 ms |
| Retiro · embarcadero | 46,0 → 45,9 | 42,5 → 44,3 | 89,2 → 54,7 ms |
| Pecio · cubierta C1 | 32,8 → 37,7 | 25,6 → 30,0 | 66,6 → 66,8 ms |
| Pecio · cubierta inferior C8 | 60,0 → 60,0 | 60,0 → 60,0 | 17,7 → 17,2 ms |

En expedición se pasó de 190 actualizaciones de espuma a cero en las dos tandas por variante. La candidata registró un pico de 363,1 ms en una tanda y de 36,6 ms en la otra. La mejora inicial de media de A4 no se reprodujo en la prueba final. En los tres focos del Retiro el volumen del mar lejano seguía cruzando la cámara. Su suspensión y reanudación se comprobaron aparte con una cámara sobre el hueco del norte. Bajo cubierta en C8, el mar y la espuma ocultos dejaron de recibir el tiempo de animación durante las tandas completas. C8 ya estaba a la frecuencia del visor. La cubierta C1 mejora la media y el peor segundo, con intervalos aún por encima de 33,33 ms.

Las cinco comparativas con cámara y reloj fijados coinciden píxel a píxel. [Galería superpuesta y mediciones originales](../../output/stormwreck-performance-20261106-pass4/index.html).

El visor también alternó expedición → A4 → expedición. La espuma quedó en pausa, se reanudó en A4 y volvió a quedar en pausa. En C8 → C1 → C8, el mar y la espuma retomaron el reloj en C1 y volvieron a suspenderlo bajo cubierta. Ambos ciclos terminaron sin errores de consola. [Ciclo del Retiro](../../output/stormwreck-performance-20261106-pass4/water-cycle-dragon-rest.json) · [Ciclo del Pecio](../../output/stormwreck-performance-20261106-pass4/water-cycle-wreck-ship.json).

## Candidata jugable

Pasaron 39 pruebas dirigidas, incluidas la pausa en el hueco al norte del Retiro, la reanudación de los vértices al volver al agua y la actualización independiente del mar y la espuma en el Pecio. Se compilaron el cliente y el servidor. Diez comprobaciones de red verificaron acceso de DM, movimiento, clima, reconexión y ambas escenas en una partida temporal. Esta pasada es un diagnóstico de vistas fijas y reentrada de cámara. El umbral de 30 FPS por fotograma y por recorrido sigue abierto. [Pruebas de red](../../output/stormwreck-performance-20261106-pass4/network-smoke.json).

[Abrir candidata aislada](../../runtime/stormwreck-performance-20261106-pass4/REVISAR-RENDIMIENTO.cmd).
