# D8: frente de puertas — 2026-10-13

## Causa y corrección

El frente inicial se redondeaba a una diagonal de 45°, desplazando el centro del giro limitado respecto a las fachadas. Cena conservaba además una cámara heredada desde el lado opuesto, aunque su puerta y las de Jardín miran hacia +Z.

Los seis mapas de D8 utilizan ahora un frente explícito hacia +Z (alpha 90°), perpendicular a sus fachadas/entradas. El margen horizontal sigue siendo ±30°, con pasos de 15°. La misma función se utiliza para la vista y para la base del movimiento cuando aún no hay una cámara instalada. Se mantiene el punto de interés de vista general, selección, seguimiento y combate: el ajuste corrige la orientación, no desplaza físicamente el mapa.

Se cambia sólo la clave de preferencias horizontal de D8 a `doors-v3`; las preferencias antiguas no vuelven a desplazar el frente nuevo. Stormwreck conserva su clave y sus frentes existentes.

## Verificación

- **43/43** pruebas dirigidas, incluidas fachadas de los seis mapas, límites de cámara, selección proyectada, movimiento y orientación de sprites.
- Tipos del cliente PASS y compilación de producción PASS.
- Visor Babylon: **6/6** vistas iniciales a 40°, frente perpendicular correcto, sin errores registrados y con coordenadas conservadas. Informe: [D8](../../output/d8-camera-front-20261013/d8-audit.json).
- Capturas de [Cena](../../output/d8-camera-front-20261013/d8-dinner-front-door-40.png), [Jardín](../../output/d8-camera-front-20261013/d8-garden-front-door-40.png) y los restantes mapas en el mismo directorio.

## Activación

Se ha copiado el cliente compilado a la carpeta que sirve la mesa de puerto 3000, tras verificar su correspondencia con la página publicada. Las páginas anteriores se conservan en `output/d8-camera-front-20261013/previous-pages` y los assets antiguos permanecen disponibles. La lectura HTTP posterior confirmó que `/player` entrega la nueva página compilada.

Recargar primero DM y después jugador/proyector, para que DM publique la vista inicial del nuevo frente. Esta corrección no necesita reiniciar el servidor. No se han ejecutado comandos de juego ni modificado guardados. El visor temporal utiliza fixtures y se cierra al terminar.
