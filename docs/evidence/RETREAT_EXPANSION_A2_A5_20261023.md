# Retiro del Dragón · ampliación A2–A5

Entrega parcial del 23/10/2026. Encargo iniciado el 22/10/2026 como paréntesis
en la mejora de la piedra G1.2. Se amplían los módulos entregados sobre la
fuente nativa G1.1; el conjunto del mapa conserva su arquitectura y sistemas.

## Resultado

| Zona | Antes | Después | Dimensiones nuevas |
|---|---:|---:|---|
| A2 · Casa del cabrestante | 9 m² | **18 m²** | 4,5 × 4 m |
| A3 · Comedor | 22,5 m² | **112,5 m²** | 15 × 7,5 m |
| A3 · Cocina | 9 m² | **18 m²** | 6 × 3 m |
| A4 · Biblioteca | 72 m² | **189 m²** | 18 × 10,5 m |
| A5 · Templo | 81 m² | **162 m²** | 12 × 13,5 m |

El templo y el cabrestante duplican exactamente su superficie de suelo.
El templo crece hacia el voladizo, manteniendo su conexión oriental con las
escaleras. Sus ocho columnas tienen fustes de 0,864 m de diámetro, bases de
aproximadamente 1,24 m y una altura total de 4,71 m. Se conserva la cubierta de
madera y se eleva su armazón para apoyarse en las columnas ampliadas.

Biblioteca y comedor aprovechan el frente excavado X 93–129 m. Entre sus plantas
quedan tres metros de roca. Los dos accesos exteriores conservan su posición.
La cocina conecta con el comedor mediante un pasillo corto de 1,5 × 1,5 m.
El umbral exterior del comedor conserva su longitud previa.

### CANON

- A2: tejado a dos aguas, puerta de madera, cabrestante, cadena y palé suspendido.
- A3: mesa larga, dos bancos, una sola silla en la cabecera y cocina ordenada.
- A4: puerta de madera reforzada con hierro, estanterías, mesa de estudio,
  bancos, atriles, libros, escritura y lámparas.
- A5: templo abierto, columnas de piedra, cubierta de madera, tres soportes
  arqueados existentes, Bahamut anciano, siete canarios y ofrendas.
- A1: las seis celdas y todo su mobiliario siguen siendo los originales.

### VTT_AMBIENCE autorizado

Las superficies ampliadas y las proporciones mayores de las columnas son las
adaptaciones solicitadas por el usuario. No representan medidas literales
atribuidas al PDF. La mesa del comedor se alarga a ocho metros, con sus dos
bancos correspondientes. Silla, puertas, vajilla, libros, utensilios, estatua y
canarios mantienen su escala. Se repiten seis módulos existentes de estantería
para cubrir las paredes ampliadas de A4, con geometría compartida.

## Integración y conservación

- Escala de 1,5 m por casilla y alturas A1/A2/A3/A4/A5 de 9/15/18/18/27 m.
- 128 mallas nativas A1 comprobadas mediante huellas de geometría y matrices,
  sin cambios. Las 409 casillas A1 también son idénticas.
- Playa, A1, ambos recorridos del acantilado, terraza superior y salidas
  terrestres conservan sus superficies originales.
- Las 15 conexiones entre superficies son idénticas a las anteriores.
- Todos los puntos de referencia e interacción conservan sus direcciones.
- Se reutilizan el cargador de módulos, movimiento autoritativo, puertas,
  cabrestante, viajes, ocultación y luces existentes.
- Las cotas navegables ampliadas se generan con el generador original a partir
  de las plantas y obstáculos de las mismas mallas modificadas.
- La cuadrícula visual sigue siendo independiente de esos datos.
- La roca de respaldo se retira del fondo de la nueva cocina; las masas laterales,
  sellos y soporte del cabrestante acompañan las plantas ampliadas.
- Se actualizan los límites de ocultación y protección frente a la lluvia.
- Los nuevos estantes y los eslabones conservan instancias y geometría compartida.
  El cargador reconoce también sus mallas instanciadas para aplicar visibilidad.
- Se conservan las paletas originales de los GLB aprobados. Las mejoras de
  materiales de la escena siguen en manos del controlador PBR existente.
- Dados físicos y resolución narrativa del DM permanecen manuales.

### Partidas guardadas

La revisión de cuadrícula pasa a 3. Una partida de revisión 2 conserva las
posiciones válidas y los estados; únicamente se recolocan sobre suelo cercano
los actores cuya casilla de A2–A5 ha quedado ocupada por el mobiliario ampliado.
Las dos casillas antiguas retiradas son A3 (78,39) y A4 (70,38). También sigue
disponible la migración de la distribución anterior a la revisión 2.
Se verifican vida, inventario, progreso y conservación de una posición válida A1.

## Comprobaciones

| Comprobación | Resultado |
|---|---|
| Pruebas seleccionadas de cámaras, movimiento, terreno y Retiro | **69/69 aprobadas** |
| Recorrido mediante el movimiento autoritativo del VTT | **1.580 pasos** |
| Muestras físicas de los recorridos, radio de actor 0,30 m | **60.869**, sin colisiones |
| Puertas cerradas que bloquean y apertura manual | **2/2** |
| Puntos de interacción recorridos | **13/13** |
| Casillas conectadas | **980/980**, antes 850 |
| Conexiones originales | **15/15 conservadas** |
| Validación de 14 archivos GLB | **0 errores, 0 advertencias** |
| Comprobación de tipos del cliente y servidor | Correcta |
| Compilación aislada del cliente | Correcta |

Las pruebas anteriores corresponden al alcance del Retiro. La batería completa
del proyecto no se ha repetido en esta ampliación.

## Rendimiento

Las mediciones finales se hacen a 1280 × 720, con 24 fotogramas medidos por
caso tras calentamiento y sincronización de GPU. Se cubren DM, jugador y
proyector en A2, A3, A4, A5 y una celda de control: 15 casos por versión.

| Vista DM | Llamadas de dibujo antes | Después | Mediana antes/después |
|---|---:|---:|---:|
| A2 | 66 | 67 | 8,0 / 10,0 ms |
| A3 | 108 | 149 | 9,1 / 11,4 ms |
| A4 | 168 | 190 | 10,2 / 11,8 ms |
| A5 | 58 | 81 | 8,6 / 10,1 ms |
| Celda A1 de control | 95 | 95 | 8,0 / 11,5 ms |

La escena conserva **63 texturas y 82,42 MiB estimados para ellas** en ambas
versiones. No se añaden mapas de sombra ni luces. Los módulos ampliados y el
área visible mayor requieren más dibujo, especialmente en A3. Las estanterías
repetidas y los eslabones comparten geometría; la primera exportación, que perdía
esa reutilización y duplicaba texturas, fue descartada y corregida.

Estas medianas describen una muestra local. El cambio de tiempo en la celda de
control, con el mismo número de llamadas, muestra variabilidad entre muestras.
No se atribuye una mejora de velocidad ni se certifican FPS sostenidos en otros
equipos. La optimización general de las fases posteriores sigue pendiente.

## Revisión visual y evidencias

Galería: `output/retreat-expansion-20261022/index.html`.
Visor del renderizador real: `http://127.0.0.1:4610/review.html?expanded=1`.
La referencia original se abre con `expanded=0`.

Se guardan nueve encuadres por zona y versión: inclinaciones 5°, 15° y 25°,
con giros −30°, 0° y +30°. Se usa el zoom permitido por el controlador vigente.
La comparación arquitectónica completa utiliza los mismos cuatro encuadres de
revisión antes/después. Son vistas de inspección; el límite del jugador se conserva.

Además se revisan 18 vistas de los extremos nuevos de A2/A3/A4/A5, incluyendo la
cocina y el frente ampliado del templo, comprobando visibilidad del personaje y
ocultación de cubiertas. El detalle de estas comprobaciones y las mediciones
por rol se encuentra en los JSON de `output/retreat-expansion-20261022/evidence/`.

### Problemas corregidos durante la entrega

1. Piezas sin coordenadas de textura: se añade proyección a escala métrica antes
   de exportar, conservando las coordenadas originales de libros y muebles.
2. Pérdida de geometría compartida al completar las UV de la cadena: se reutiliza
   una copia por geometría fuente, manteniendo las instancias de los eslabones.
3. Duplicación de mapas PBR al reexportar la escena nativa refinada: se conserva
   la biblioteca de materiales de los módulos originales y su mejora en ejecución.
4. Un estante nuevo de A4 quedaba desplazado hacia el muro frontal: se corrige
   su posición y se regenera su obstáculo.
5. La comprobación del visor esperaba variantes de sombra que no se usan con las
   instancias. Se comprueban recursos y materiales del pase visible después de
   calentar el renderizado; las comprobaciones de navegación permanecen intactas.

## Archivos

### Fuentes del VTT

- `campaigns/stormwreck-isle/public/retreat-expansion.ts`: módulos y límites nuevos.
- `campaigns/stormwreck-isle/public/retreat-expansion.json`: dimensiones y procedencia.
- `campaigns/stormwreck-isle/public/retreat-global-visuals.ts`: selección de módulos,
  visibilidad de instancias, ocultación y cobertura.
- `campaigns/stormwreck-isle/public/retreat-refinement.ts`: envolventes compatibles.
- `campaigns/stormwreck-isle/public/retreat-refinement-lighting.ts`: reubicar y ampliar
  el alcance de las dos luces de relleno existentes.
- `campaigns/stormwreck-isle/public/retreat-terrain-v2.json` y
  `retreat-zones/global-layout.json`: navegación regenerada.
- `campaigns/stormwreck-isle/public/retreat-zones/expanded/a2-navigation.json`
  hasta `a5-navigation.json`: plantas y obstáculos de las ampliaciones.
- `campaigns/stormwreck-isle/public/art/retreat-modules/retreat_expanded_*.glb`:
  ocho archivos base/cubierta y seis archivos de envolventes/roca.
- `apps/web/world.ts`: opción de referencia anterior para el visor de revisión.
- `engine/server/retreat-migration.ts`, `engine/server/game.ts`: partidas versión 3.
- `engine/server/retreat-runtime.test.ts`: regresión de migración y conservación.

### Fuente nativa y herramientas

- `prototypes/retreat-expansion-20261022/artifacts/retreat_expanded.blend`.
- `prototypes/retreat-expansion-20261022/build_expansion.py`: modificación reproducible
  de la fuente G1.1, exportación y conservación de materiales aprobados.
- `prototypes/retreat-global/build_navigation.py`: generador existente con selección
  de directorio y salidas; usa las ampliaciones publicadas al regenerar el mapa.
- `prototypes/retreat-global/verify_runtime.ts`: verificador del conjunto activo.
- `prototypes/retreat-expansion-20261022/`: inventario, referencia, visor y entrega.
- `runtime/retreat-expansion-20261022/client/`: compilación aislada de revisión.

## Siguiente tarea

Revisión conceptual de estas dimensiones y, después, retomar **G1.2: piedra y
acantilado**, naturalizando perfiles y encuentros sobre las plantas ampliadas.
El acabado geológico y arquitectónico general sigue formando parte de las fases
posteriores. Esta entrega cierra la ampliación, no la mejora artística integral.
