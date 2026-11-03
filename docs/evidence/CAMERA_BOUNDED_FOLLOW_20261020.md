# Seguimiento con límite de escenario — Espejo — 20/10/2026

## Comportamiento

Con seguimiento activado, la cámara acompaña al personaje, se frena cuando
el encuadre llega al contorno del escenario y vuelve a seguir al regresar
al interior. El personaje completo permanece dentro de la pantalla.
La posición del encuadre puede cambiar al alcanzar un borde; el giro elegido
y las direcciones de WASD/joystick no intervienen en esa corrección.

El cambio se aplica al escenario del Espejo en el encuadre normal y de combate,
para jugador, DM y proyector. La vista explícita de mapa completo conserva
su comportamiento propio, sin convertirla en seguimiento.

## Corrección

- Se sustituye el límite antiguo, que devolvía siempre el centro de la cueva
  si el tamaño visible no cabía y anulaba así el seguimiento.
- `camera-stage-bounds.ts` calcula la silueta proyectada del suelo y el fondo
  opaco de la cueva. Considera la altura del objetivo, el giro, la inclinación,
  el tamaño real de pantalla y el desplazamiento reservado al HUD.
- El contorno utilizado es `MIRROR_WALL_OUTLINE`. Se cuentan ocho metros de
  fondo continuo de las paredes de 26 m, sin inventar una pared en el corte
  abierto del primer plano.
- La zona permitida se cruza con la que mantiene visible la silueta completa
  del personaje. Si hace falta, se busca un encuadre válido más próximo en
  escala, sin devolver la cámara al centro del mapa. En esquinas extremas
  se prioriza la pantalla real sobre la franja amplia reservada al HUD.
- El máximo alejamiento se incorpora a los límites de zoom de la escena;
  se mantiene estable entre los ángulos permitidos. Los controles de zoom
  responden desde ese límite, sin pasos que no cambien la imagen.
- El límite se aplica antes y después de la interpolación. Se elimina la
  velocidad residual que intentaba atravesarlo.
- El tamaño del personaje se obtiene de su contenido opaco y sus desplazamientos
  de animación, excluyendo los márgenes transparentes del atlas.
- En la revisión visual, varias capas de primer plano al 32% de opacidad
  se acumulaban hasta tapar al personaje. Su opacidad al bloquearlo pasa al
  3,5%; suelo y fondo opaco permanecen detrás del recorte.

## Comprobación

**35 pruebas** de encuadre, movimiento de cámara, zoom, visibilidad de sprites
y cámara compartida; **4 pruebas adicionales** de presentación del Espejo.
Todas correctas. Incluyen las 399 casillas transitables, en 390×844 y
1600×900, giros −30°/0°/+30° e inclinaciones de 15° y 35°: 4.788 casos,
además de otras inclinaciones y una transición continua de 150 fotogramas.
La comprobación de tipos del cliente y la compilación final Vite terminaron
correctamente. También se validó la definición pública actual de la campaña.

Las pruebas proyectan el cuerpo del personaje con matrices reales de Babylon
y trazan los rayos de las esquinas de la pantalla contra suelo y paredes.
El borde frontal abierto de la cueva no se considera una pared de respaldo.
También verifican seguimiento en el interior, parada en la pared, retorno,
conservación del ángulo y reacción inmediata de los controles de zoom.

Revisión visual aislada de llegada, pared este, pared este a −30° y pared sur.
El personaje queda dentro del encuadre y no se ve el exterior del decorado.
La transparencia corregida permite verlo al atravesarse capas de primer plano.
Las capturas finales están en:

- `output/bounded-follow-20261020/evidence/east-wall-minus30-final.jpg`
- `output/bounded-follow-20261020/evidence/south-wall-final.jpg`

La revisión utilizó instantáneas de prueba y no envió acciones a la partida
abierta en el puerto 3000. Se cerraron las pestañas de prueba y el servidor
aislado propio del puerto 4612. Las pruebas de teléfono son de geometría y
tamaño de pantalla; no sustituyen una prueba física de gestos en un móvil.

## Distribución

Cliente compilado en `output/bounded-follow-20261020/final/web` y publicado
en `dist/web`, copiando primero los recursos y al final las entradas HTML.
Se conservan los recursos con nombres antiguos para las pestañas abiertas y
una copia de la distribución previa en
`output/bounded-follow-20261020/previous-web`.

`/dm`, `/dm-mobile`, `/player` y `/projector` devolvieron HTTP 200 con el HTML
exacto de la nueva compilación. Se comparó también el código de cámara servido
con el archivo compilado. Resultado en `output/bounded-follow-20261020/published.json`.
El servidor de partida mantuvo su PID 23732; no se reinició ni se enviaron
acciones de juego. Las pantallas abiertas necesitan recargarse para usar el
cliente actualizado.
