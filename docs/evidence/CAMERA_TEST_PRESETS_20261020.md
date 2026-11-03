# Cámara de prueba: 5°, 10°, 15° y 25°

## Cambios

- Los cuatro pasos verticales se comparten entre DM, jugador, gestos táctiles y validación de mensajes de cámara. Se aplican también al Retiro del Dragón.
- F/R y los botones del DM recorren pasos adyacentes, incluidos los intervalos desiguales. La ayuda del jugador muestra los nuevos valores.
- Los cambios automáticos de zona conservan 15° en interior y 25° en exterior. El ajuste manual permite 5° y 10°; el combate comienza a 25°.
- El seguimiento del Espejo solo corrige la posición: deja de calcular un zoom a partir de la proximidad del personaje al borde.
- El DM conserva la escala de exploración al cambiar de zona o inclinación, igual que el jugador. Los límites nuevos no convierten un intento de alejar en un acercamiento.
- En los rincones donde no cabe el encuadre elegido se mantiene el personaje en pantalla y se oculta el exterior mediante un recorte oscuro. No se inventa una pared frontal ni se cambia el zoom.
- Se aprovecha la altura existente de 26 m de las paredes del Espejo para sus límites de zoom. A 5°, la distancia física de la cámara se amplía cuando su punto de mira queda desplazado, para evitar que el personaje desaparezca detrás del plano cercano. La proyección sigue siendo ortográfica.

## Comprobación

57 pruebas correctas en ocho archivos de cámara. El recorrido geométrico cubre las 399 casillas transitables del Espejo en dos tamaños de pantalla, dos escalas, cuatro inclinaciones y tres giros: 19.152 combinaciones. Comprueba la figura completa dentro de pantalla, su pertenencia al recorte del escenario y que la escala no cambie.

Comprobación de tipos del cliente correcta. Servidor candidato compilado correctamente. Un servidor aislado recibió los cuatro ángulos y retransmitió cada uno a jugador y proyector conservando el encuadre compartido.

La revisión visual aislada recorrió ocho puntos con DM y jugador a 5°. En ambos casos la semialtura ortográfica permaneció exactamente en 5,43417578883001 y el multiplicador en 2. No se registraron errores. El acercamiento manual pasó a semialtura 4,180135222176931 y alejar recuperó el valor anterior.

Evidencia en `output/camera-test-presets-20261020/evidence/`:

- `tests.json`
- `shared-angles.json`
- `player-5-fixed-zoom.json`
- `dm-5-fixed-zoom.json`
- `arrival-5-fixed.jpg`
- `south-wall-5-final.jpg`
- `player-manual-zoom.json`

Los tamaños de teléfono se verifican geométricamente; no se acredita una prueba física de dos dedos en un móvil. A 5° el suelo aparece muy comprimido, como corresponde a esta inclinación experimental.

## Activación

Cliente Vite compilado correctamente en `output/camera-test-presets-20261020/published/web` y activado en `dist/web`, con recursos copiados antes de las entradas HTML y conservando los recursos anteriores. Copia previa en `previous-web`.

Para admitir los ángulos nuevos se actualizó únicamente el módulo de perfil de cámara del servidor compilado. El cierre existente confirmó el guardado antes del reinicio. La mesa pasó del PID 26932 al 20896 y recuperó el guardado de generación 2384 en `mirror`.

Se compararon la escena, la configuración de cámara, las casillas de los personajes, sus puntos de vida, inventarios, recursos y el estado de combate con el guardado final. Coinciden. El estado se verificó mediante la consola DM: los personajes sin sesión todavía no forman parte de las entidades visibles del mapa después de reiniciar.

Las cuatro entradas `/dm`, `/dm-mobile`, `/player` y `/projector` respondieron HTTP 200 con el HTML exacto de la compilación. Se comparó también el archivo de cámara servido y el perfil del servidor con los archivos preparados. Resultado en `evidence/published.json`.

Las pestañas y los servidores aislados de revisión se cerraron. Las pantallas de la mesa deben recargarse para utilizar el cliente actualizado.
