# Pecio — optimización de renderizado (29/10/2026)

## Alcance

Optimización del Rosa de los Vientos. No se modifica el mapa de navegación,
las conexiones C1–C9, el tamaño del barco, los tesoros, las interacciones ni
los límites de cámara. No se eliminan el nido, mobiliario, huesos o desgaste.

## Medidas y cambios

Conteos reproducidos con `buildTerrain3D`, `shipDeck: true`, `batchTiles: true`
en Babylon NullEngine. Es geometría base, sin personajes, props dinámicos o
assets asíncronos; estos valores **no son FPS de una partida**.

| Medida | Antes | Después |
|---|---:|---:|
| Vértices de la base | 284.653 | 269.021 |
| Meshes con geometría | 522 | 522 |
| Vértices del océano | 16.641 | 1.009 |
| Triángulos del océano | 32.768 | 1.920 |
| Extensión del océano | 1.600 × 1.600 m | 1.600 × 1.600 m |
| Paso de la malla junto al barco | 12,5 m | 4 m |
| Envíos de posiciones del fondo durante cada fotograma de giro | 4 | 0 |

El océano usa un núcleo de alta densidad y cuatro anillos exteriores que
comparten índices de vértices. No hay bordes abiertos internos ni parches
solapados. Las coordenadas, el shader de oleaje, la espuma y el nivel del agua
se conservan. Los límites de culling incluyen los 4,7 cm de desplazamiento.

El fondo conserva su proyección mediante una matriz afín. Sus posiciones,
colores e índices se cargan una sola vez. Las pruebas verifican el resultado
proyectado en las inclinaciones 5–25°, los giros ±30°, cuatro focos del barco
y proporciones de pantalla vertical, panorámica y ultrapanorámica.

Los reflejos mantienen resolución 512/256 y todos los candidatos anteriores.
Al mover cámara o zoom se limitan a 15 pases/s en escritorio y unos 8 en
pantalla compacta. En reposo mantienen la cadencia anterior (unos 8/4 pases/s).
Salir de un interior o reactivar reflejos pide un pase inmediato. Se cachea la
pertenencia, no la visibilidad, y se invalidan también sustituciones de meshes
con el mismo número total. Puertas y cutaways conservan su visibilidad viva.

El clima prepara únicamente materiales nuevos, después de sus notificaciones
de construcción. Los importados tardíamente siguen recibiendo humedad y nieve.
Las siluetas escénicas se excluyen de los mapas de sombras; la iluminación del
barco y las sombras del mobiliario conservan sus sistemas anteriores.

## Validación

- **23 pruebas pasan** en los cuatro archivos `wreck-performance`,
  `wreck-scenic-depth`, `wreck-atmosphere` y `wreck-rebuild`.
- Comprobación de tipos del cliente superada. Compilación candidata completa
  superada: cliente Vite y servidor TypeScript, con manifiesto `prepared.json`.
- Pruebas del fondo: proyección, frustum, retorno desde interiores y buffers
  inmutables durante giro/zoom.
- Pruebas del océano: área total, orientación de caras/normales, malla conexa,
  límites y bordes abiertos solamente en el perímetro de 1.600 m.
- Pruebas de reflejos: cadencia con cámara en movimiento, zoom y reposo,
  reactivación inmediata, sustitución de candidatos y visibilidad viva.
- Regresiones del Pecio: estructura, inundación C8/C9, cofa, accesos originales,
  muebles canónicos, VFX del bote y deposición del clima.

Los resultados geométricos se guardan en
`output/pecio-optimization-20261029/geometry.json`.

## Límites de la comprobación

El navegador de revisión no ha respondido a las órdenes de carga y captura.
No se ha completado una inspección visual nueva ni un benchmark de FPS/GPU;
no se atribuye un porcentaje de mejora de FPS a la reducción de triángulos.
El visor aislado puede iniciarse con la configuración
`scripts/wreck-performance-review.config.mjs` (puerto 4636).

La candidata compilada está en `runtime/prepared-wreck-opt-20261029`.
La aplicación activa y las partidas guardadas no se sustituyen mientras haya
una mesa abierta; `INICIAR.cmd` conserva su actualización segura habitual.
