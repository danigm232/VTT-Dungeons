# Cinco campamentos · pasada de detalle V1.4.5

11 de octubre de 2026. Revisión sobre las escenas existentes, con capturas
reales de Babylon.js antes y después. Los mapas principales del Retiro y del
Rosa de los Vientos quedan fuera de esta entrega.

## Resultado visual por escenario

| Escenario | Trabajo aplicado |
| --- | --- |
| **01 · A1** | Roca con relieve y variación de color, estratos, salientes unidos a la montaña, cima cerrada y particiones orgánicas entre las celdas. Camas con mantas curvas, carpintería y herrajes; estanterías distintas de hierbas, libros, herramientas y compartimentos. Utensilios, vasos, frascos, cuerdas y detalles adicionales en el dragón de piedra. Antorchas colocadas dentro de cada habitación y luz exclusiva sobre sus superficies. |
| **02 · Bosque** | Arboleda posterior en capas, árboles de distintas siluetas, abedules, ramas y raíces ligeras. Helechos, hierbas, flores, hongos y troncos caídos; sendero erosionado de borde difuminado y arroyo de orilla ondulada con flujo. Las rutas y animaciones existentes de los dos animales se conservan fuera del grid. |
| **03 · Playa** | Abrigos de roca menos repetidos, variación de estratos y afloramientos posteriores. Bote con bordas, costillas, remo y cabos; restos de deriva. Relieve del agua y espuma celular con transparencia real, junto con la rompiente y el viento existentes. |
| **04 · Observatorio** | Columnas y grupos de basalto de distintas alturas, juntas y estratificación. Aurora de varias cintas plegadas con bordes difuminados, nubes rápidas, cristales y noche más legible. Se mantienen los destellos y truenos existentes. |
| **05 · Refugio** | Terreno posterior elevado para prolongar el abrigo, salientes minerales e hiedra. Pozas húmedas con brillo, grava somera y ondas; se conservan los goteos y el oleaje amortiguado. |

En los cuatro exteriores: tiendas con costuras, remiendos, cuerda, estacas y
tirantes; interiores con cestas, frascos, mantas, almohadas y rollos de tela.
Los baúles ganan herrajes y asas. La hoguera añade lenguas de fuego de partículas
y utensilios de cocina. Se conservan las piezas móviles y los contactos de las
actividades del personaje: no se sustituye una manta, tapa o libro animados por
un bloque estático.

### Correcciones encontradas durante la inspección

- La cara posterior de la montaña A1 quedaba demasiado oscura: material de
  roca con iluminación coherente por ambas caras.
- Se cerró la unión abierta entre la cresta y el terreno posterior de A1.
- Algunas rocas y paredes laterales ocultaban el lecho de Tarak. Ahora la
  celda ocupada recorta sus dos laterales y las particiones rocosas adyacentes.
  Las otras celdas conservan su fachada y techo.
- Se corrigió una referencia inválida en las costillas del bote decorativo.
- El visor bloquea sus controles mientras guarda una captura para evitar
  cambiar el encuadre durante la codificación. Sus controles se adaptan al
  espacio disponible en pantallas estrechas.
- La prueba conectada espera el snapshot que confirma la finalización del
  descanso; una espera fija de 50 ms podía comprobar un estado anterior.
- La cuadrícula exterior destacaba demasiado en la vista real del jugador.
  Se añadió un estilo opcional con transparencia efectiva, aplicado a los
  campamentos. La atenuación de A1 también utiliza ahora ese paso de mezcla.
- La prueba de recursos consume cada respuesta completa. Dejar sin leer
  imágenes grandes podía prolongar el cierre del servidor de prueba.

## Canon, juego y límites de la intervención

A1 conserva sus seis celdas desiguales, orden oeste–este, entradas abiertas,
camino y plaza a unos nueve metros sobre la bahía. Habitación libre, Tarak,
Varnoth, Myla y dos estancias de hamacas. La estatua sigue representando al
dragón Astalagan. El detalle de superficies y mobiliario es acabado visual;
la hoguera de la plaza es el añadido ambiental solicitado por el usuario.

Los cuatro exteriores siguen siendo **VTT_AMBIENCE**. No garantizan seguridad
para descansar ni añaden conexiones a los mapas principales. La cuadrícula
de 1,5 m, casillas transitables, obstáculos, propiedad de objetos y estados
autoritativos no cambian por el decorado nuevo. Las antorchas y velas de una
celda o tienda mantienen su lista exclusiva de superficies iluminadas.

El DM prepara y confirma el descanso. Llegada, anochecer, noche, amanecer y
finalización conservan su máquina de estados, interrupción y reanudación.
No se automatizan tiradas, encuentros, decisiones narrativas ni beneficios.
Las actividades siguen siendo accesibles para los jugadores.

## Capturas comparativas

[Galería local del antes y después](../../output/camps-detail-20261011/gallery.html)
o [galería abierta en el visor](http://127.0.0.1:4482/evidence/gallery.html).

- **110 capturas antes**: ocho ángulos diurnos, ocho nocturnos y seis interiores
  por campamento, al comienzo de esta revisión.
- **120 capturas después**: las mismas vistas, más anochecer y amanecer.
- **19 capturas adicionales** en perfiles de escritorio, móvil vertical y
  horizontal, incluidos los interiores cercanos.
- **90 muestras exteriores finales**, todas con escena lista y documento
  visible. Los seis interiores de cada escenario se inspeccionaron aparte.
- **230/230 PNG comparativos íntegros**: firma, CRC de cada chunk,
  descompresión y filas de píxeles. Esto comprueba los archivos; la calidad
  artística se evalúa mirando las imágenes.

Archivos: `visual-report-before.json`, `visual-report.json`,
`capture-integrity.json`, `detail-summary.json` y `device-review.json`, en
`output/camps-detail-20261011/`. Las capturas de dispositivos conservan sus
dimensiones efectivas; el escalado del navegador puede diferir del tamaño
solicitado. No son una prueba sobre teléfonos físicos.

## Optimización y medición

| Escena | Mallas antes → ahora | Vértices antes → ahora | Máximo de envíos de dibujo antes → ahora |
| --- | ---: | ---: | ---: |
| A1 | 137 → 139 | 352.299 → 365.253 | 95 → 111 |
| Bosque, con fauna cargada | 211 → 198 | 198.870 → 119.567 | 181 → 140 |
| Playa | 175 → 153 | 85.794 → 83.476 | 166 → 118 |
| Observatorio | 181 → 159 | 88.961 → 83.489 | 167 → 118 |
| Refugio | 183 → 159 | 124.943 → 114.651 | 179 → 129 |

El aumento de A1 permite recortar por separado la roca adyacente a cada celda.
Se agrupa el resto del mobiliario estático; los exteriores reducen lotes y
el bosque utiliza raíces y rocas pequeñas más ligeras. El presupuesto de la
prueba sigue siendo menos de 144 mallas en A1 y 208 en exteriores, antes de
la fauna cargada bajo demanda. No se elevó para permitir el detalle nuevo.

La medición del visor usa Intel UHD, ANGLE D3D11, WebGL2 y un lienzo de
735 × 656 en perfil compacto. Medianas de intervalos de los últimos 60 frames:
**57,5–60,3 FPS** entre las 90 muestras. La comprobación visible de escritorio
con sombras registró muestras calientes de **51–60 FPS**. Son observaciones
en este equipo, no un ensayo prolongado ni una garantía para otras GPU.
`renderSubmissionMs` mide envío CPU y no se convierte a FPS.

Se comparten cuatro normales de 128 px y una máscara de espuma celular por
escena. La vegetación y el detalle estático se integran en los lotes existentes.
Los interiores cerrados no dibujan su mobiliario. Móvil evita los pases de
sombras y resplandor; PC mantiene sombras almacenadas. El agua conserva
actualización limitada a 12/20 Hz, las partículas capacidad finita y el modo
de movimiento reducido atenúa emisiones y desactiva destellos.

## Comprobaciones

- **60/60 pruebas dirigidas únicas, nueve archivos**, consolidando los tres
  informes sin contar duplicados: escenas, navegación alcanzable, colisiones,
  luz limitada, fachadas y particiones, descanso, guardado, materiales, espuma,
  mantas, actividades y animación del objeto real, cámara/WASD en ocho
  orientaciones, biblioteca de interacción y adaptador de terreno/cuadrícula.
  La prueba de transparencia comprueba también el estilo anterior por defecto
  y conserva exactamente las posiciones de la cuadrícula.
- Tipos del cliente, servidor y visor: **PASS**.
- Compilaciones de producción del cliente y servidor: **PASS**.
- Interfaz compilada: novedades V1.4.5, entrada como Mike, zoom Detalle,
  un paso WASD recibido por el servidor, los cinco escenarios y entrada al
  proyector comprobados. Tras recargar la última compilación, se comprobó
  la cuadrícula atenuada, «Avivar la hoguera» desde el jugador y el descanso
  completo en **cinco acciones del DM**, conservando PG 8/8. Sin errores ni
  advertencias en las consolas inspeccionadas de jugador/proyector.
- Recorrido conectado de los cinco campamentos: **705 pasos, 120 interacciones**,
  DM, tres jugadores y proyector; obstáculos, propiedad de baúles, fases e
  interrupción/reanudación del descanso, PG sin beneficios automáticos,
  guardar/reiniciar/reconectar: **PASS**. La ejecución final descarga y consume
  completamente los **19 recursos** de imagen/audio y termina con código 0.

La suite general, ejecutada antes del último ajuste de cuadrícula, dio **539/540**, con una
única prueba fallida en `engine/server/d8-v48.test.ts:24`. Se reprodujo aparte:
la prueba espera cerrar inicialmente una puerta cuyo pack actual inicia
cerrada, por lo que recibe `DOOR_OPENED`. Es una discrepancia de D8, fuera de
los campamentos; queda identificada y no se presenta la suite general como
completamente verde. Evidencia de reproducción: `supporting-tests.json`.

## Archivos de esta pasada

| Grupo | Archivos |
| --- | --- |
| Visuales | `campaigns/camp-rests/public/a1-visuals.ts`, `outdoor-visuals.ts`, `camp-atmosphere.ts`; nuevo `camp-detail-kit.ts` |
| Recursos | `campaigns/camp-rests/public/art/camp-detail-v1/foliage-atlas.png`, `coastal-rock.png` y README de procedencia |
| Novedades | Textos de campamentos en `apps/web/dm.html` y clave V1.4.5 en `apps/web/dm.ts` |
| Cuadrícula | Estilo opcional en `engine/client/terrain3d.ts`, activado para campamentos desde `apps/web/world.ts` |
| Pruebas | Aserciones adicionales en `engine/server/camp-rest.test.ts`; nuevo `engine/client/camp-detail-kit.test.ts` |
| Herramientas | `scripts/camps-review-server.mjs`, `camps-review.html`, `camps-review.ts`, `camps-gallery.mjs`, `camps-preview.mjs`, `actors-camp-playability.mjs`; nuevos `camps-capture-integrity.mjs` y `camps-detail-evidence.mjs` |
| Documentación | README del módulo, este informe y entradas de campamentos en PROJECT_STATE/ROADMAP |

Los cuatro módulos visuales finales están copiados en `source-after/` y sus
hashes, junto con los dos recursos nuevos, en `source-manifest.json`.
También se conservan el adaptador de terreno y su llamada desde el visor del VTT.
`source-before/` conserva los tres módulos existentes al iniciar la pasada.
El repositorio contiene otros cambios previos; esta tabla no atribuye esos
cambios a la revisión de campamentos.

## Uso y siguiente comprobación

El próximo inicio habitual con **INICIAR.cmd** recompila y muestra V1.4.5.
La vista compilada aislada está en [mesa de revisión](http://127.0.0.1:4485/dm),
con datos propios; la mesa abierta en el puerto 3000 conserva su partida.

Queda la revisión física de rendimiento, legibilidad y mezcla de audio en
teléfono/proyector, y la aceptación del acabado comparando la galería con las
referencias del usuario. Los sonidos anteriores se reutilizan y sus recursos
se comprueban; una respuesta HTTP correcta no acredita una escucha física.
Esta entrega mejora el diorama jugable, sin afirmar paridad exacta con una
ilustración prerenderizada ni crear un rig nuevo para los personajes 2D.
