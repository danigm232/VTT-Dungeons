# O1 · Visibilidad local y acceso desde el VTT

Entrega funcional y visual: 23/10/2026. Siguiente subfase: **A1**, encuentros de roca y accesos.

![Celdas antes/después](C:/Users/User/Desktop/Dungeons/output/retreat-occlusion-o1-20261023/o1-cells-proof.jpg)

## Cambios y fallos corregidos

- Las seis celdas conservan sus paredes, muebles y matrices originales. Se corrige
  la ocultación del lote completo de muebles que dejaba colchones y almohadas flotando.
- Ese lote también contenía jambas y umbrales pétreos. Sus submallas existentes se
  presentan aparte, compartiendo exactamente geometría y material: se puede atenuar
  la entrada sin borrar cama, mesa, taburete ni enseres.
- Se conserva la transformación original de las paredes. Solo las caras de la
  celda ocupada que miran a cámara se atenúan; el muro trasero permanece.
- La cubierta pétrea común A3/A4 se divide por sus triángulos existentes en comedor,
  biblioteca y respaldo. Se levanta únicamente el techo local. El original sigue
  disponible desactivado; no se ha construido una habitación ni un suelo nuevos.
- Doce rayos comprueban el cuerpo del personaje. Solo los objetos que cruzan
  su vista se atenúan. Las ocho columnas mantienen su altura y silueta.
- Las instancias GLB necesitan una representación temporal individual para poder
  atenuarse sin afectar sus copias vecinas. Comparte geometría, material y matriz;
  se restaura y libera al dejar de utilizarse.
- Se limita la suma de capas transparentes de un mismo objeto. El personaje
  enfocado se compone después de esas capas conservando la profundidad opaca;
  las paredes opacas siguen bloqueando la vista.
- Los cambios se restauran al cambiar de foco o salir de la escena. No se añaden
  controles, luces, texturas ni materiales por personaje.
- La prueba real de DM detectó un fallo previo: con la niebla guardada al 85 %,
  el modo exponencial incluía toda la distancia de la cámara ortográfica y borraba
  visualmente el mapa. En el Retiro se reutiliza la niebla lineal existente desde
  después de la reserva jugable completa, calculada con sus casillas originales.
  El fondo conserva la bruma; densidad, color y ajustes de la partida no se editan.

## CANON y VTT_AMBIENCE

CANON conservado: seis celdas y su mobiliario, distribución ampliada autorizada,
templo, comedor/cocina, biblioteca y cabrestante. No se modifica contenido narrativo.
VTT_AMBIENCE: recorte y transparencia para lectura táctica; son recursos de
presentación, no cambios físicos de arquitectura. Dados y resolución manual intactos.

## Verificación

- **459 pares** de fotos con idéntico personaje, ángulo, zoom,
  papel y tamaño de ventana. Cinco inclinaciones 5–25°, giros −30/−15/0/+15/+30°,
  seis celdas, A3/cocina/A4/A5 y exteriores; tres personajes y tres pantallas.
- 5508 rayos registrados: **cero obstáculos opacos** delante del
  cuerpo en los casos comprobados. 222 vistas de mobiliario:
  ninguna celda pierde su lote original. Antes desaparecía en
  62 vistas.
- 42 vistas adicionales del templo: sus ocho columnas
  (16 primitivas), estatua, pedestal y siete canarios conservan matrices y presencia.
  15 vistas al 85 % de niebla y a las 19:37, en los tres papeles.
- Mismas coordenadas de cámara, tolerancia máxima 0.
- Corregido el inventario de la herramienta: las etiquetas GLB de columna están
  en el nodo padre. Se verifican sus 16 primitivas reales como ocho columnas en
  una pasada suplementaria de 42 vistas, comparada con las matrices originales.
  La corrección de niebla deja intacta la presentación cuando su densidad es cero.
- Conservación geométrica en escena: índices, vértices, matrices y materiales de
  los seis lotes de mobiliario iguales; unión exacta de los rangos de submallas.
  Cubierta: 1.708 → 2.008 triángulos por clipping; misma superficie, error relativo
  inferior a 10⁻¹⁴. Incremento permanente neto: ocho mallas; sin recursos gráficos nuevos.
- **117 pruebas específicas**, tipos cliente/servidor y compilación
  correctos. Se ha probado el alcance afectado; no se declara pasada toda la suite histórica.
- **980 casillas alcanzables**, diez superficies, 15 conexiones, dos puertas,
  13 interacciones y guardados v3 conservados. Recorrido autorizado de
  1580 pasos y 60869 muestras físicas repetido.
- 639 archivos vigilados por hash: solo cambian las tres fuentes
  existentes indicadas abajo. GLB, terrenos, celdas fuente y datos de juego intactos.

![Biblioteca antes/después](C:/Users/User/Desktop/Dungeons/output/retreat-occlusion-o1-20261023/o1-library-proof.jpg)
![Templo antes/después](C:/Users/User/Desktop/Dungeons/output/retreat-occlusion-o1-20261023/o1-temple-proof.jpg)

## Rendimiento

84 medidas antes y 84 después, cuatro repeticiones por foco y papel, 1280×720.
Son costes locales del renderizador, no una certificación de FPS sostenidos.
5 de 21 focos superan el objetivo relativo del +10 %. Se conserva esta desviación para Q1; no se declara aprobado el objetivo agregado de coste.

| Papel y foco | Antes, ms | Después, ms | Cambio | p95 después, ms | Draw calls antes → después |
|---|---:|---:|---:|---:|---:|
| dm · room1 | 9.85 | 10.30 | +4.6 % | 32.90 | 89 → 90 |
| dm · room3 | 21.25 | 15.60 | -26.6 % | 78.10 | 99 → 100 |
| dm · a3 | 19.20 | 17.50 | -8.9 % | 29.65 | 133 → 153 |
| dm · kitchen | 23.50 | 15.15 | -35.5 % | 20.60 | 178 → 202 |
| dm · a4 | 18.90 | 18.70 | -1.1 % | 26.30 | 174 → 181 |
| dm · a5 | 11.50 | 11.75 | +2.2 % | 18.50 | 81 → 76 |
| dm · overview | 19.80 | 15.05 | -24.0 % | 20.35 | 590 → 587 |
| player · room1 | 7.30 | 9.05 | +24.0 % | 22.50 | 94 → 95 |
| player · room3 | 11.95 | 12.85 | +7.5 % | 76.05 | 108 → 109 |
| player · a3 | 16.70 | 21.40 | +28.1 % | 41.50 | 150 → 171 |
| player · kitchen | 18.15 | 17.25 | -5.0 % | 25.15 | 182 → 206 |
| player · a4 | 12.40 | 19.10 | +54.0 % | 23.65 | 180 → 187 |
| player · a5 | 7.80 | 11.25 | +44.2 % | 17.30 | 81 → 76 |
| player · overview | 9.10 | 8.65 | -4.9 % | 15.00 | 71 → 66 |
| projector · room1 | 12.15 | 16.75 | +37.9 % | 49.90 | 97 → 98 |
| projector · room3 | 18.45 | 12.25 | -33.6 % | 61.95 | 107 → 108 |
| projector · a3 | 17.55 | 17.35 | -1.1 % | 24.85 | 151 → 174 |
| projector · kitchen | 16.45 | 13.95 | -15.2 % | 23.05 | 159 → 183 |
| projector · a4 | 20.85 | 15.00 | -28.1 % | 21.75 | 179 → 186 |
| projector · a5 | 10.50 | 11.25 | +7.1 % | 18.85 | 81 → 76 |
| projector · overview | 20.90 | 16.45 | -21.3 % | 21.25 | 590 → 587 |

Las representaciones temporales se reutilizan y caducan; no se acumula una copia
por cada objeto visitado. FPS sostenidos, memoria residente y prueba física táctil
siguen en Q1. No se han añadido luces ni mapas de sombra.

## Entrada real por el puerto 3000

La candidata se ha preparado y activado mediante el mecanismo del proyecto,
con la compilación anterior conservada en runtime. Se han mantenido los guardados
existentes y se ha arrancado Stormwreck en el puerto 3000.

Comprobado desde el inicio real: / redirige al selector del jugador, conectado sin asignar fichas; /dm abre Stormwreck y muestra el Retiro 3D dentro de Mapa de escena, con el servidor conectado y el encuadre de conjunto operativo. El proyector también muestra el escenario. No se han observado errores de consola. Se detectó y corrigió la niebla exponencial que ocultaba el mapa al 85 %; ese valor guardado se conserva. Las nueve huellas de personajes, PNJ, condiciones, concentración, escenas, combate, progreso y notas permanecen iguales. No se han movido personajes ni resuelto acciones.

Acceso directo: [DM](http://localhost:3000/dm). El inicio raíz `/` abre el jugador;
para dirigir hay que usar `/dm` o **INICIAR.cmd → 1 · Stormwreck**, que ya abre DM.
No se han creado nuevas pantallas ni modificado credenciales.

![DM en el servidor habitual](C:/Users/User/Desktop/Dungeons/output/retreat-occlusion-o1-20261023/vtt-dm-3000.png)

## Archivos de producción

Existentes:

- [retreat-global-visuals.ts](<C:/Users/User/Desktop/Dungeons/campaigns/stormwreck-isle/public/retreat-global-visuals.ts>): propietario de visibilidad, foco, alturas y cubiertas locales.
- [retreat-refinement.ts](<C:/Users/User/Desktop/Dungeons/campaigns/stormwreck-isle/public/retreat-refinement.ts>): metadatos y cubierta local.
- [world.ts](<C:/Users/User/Desktop/Dungeons/apps/web/world.ts>): transmite altura e identificador del personaje enfocado.

Nuevos:

- [retreat-local-occlusion.ts](<C:/Users/User/Desktop/Dungeons/campaigns/stormwreck-isle/public/retreat-local-occlusion.ts>): recorte local, conservación y restauración.
- [retreat-local-occlusion.test.ts](<C:/Users/User/Desktop/Dungeons/engine/client/retreat-local-occlusion.test.ts>): 13 pruebas específicas O1.
- [retreat-weather-visibility.ts](<C:/Users/User/Desktop/Dungeons/campaigns/stormwreck-isle/public/retreat-weather-visibility.ts>): reserva visual frente a niebla distante, exclusiva del Retiro.
- [retreat-weather-visibility.test.ts](<C:/Users/User/Desktop/Dungeons/engine/client/retreat-weather-visibility.test.ts>): tres pruebas, incluida la reserva completa en 100 poses de cámara.

Evidencia:

- [Aceptación y costes](<C:/Users/User/Desktop/Dungeons/output/retreat-occlusion-o1-20261023/checks/o1-verification.json>).
- [Conservación geométrica en escena](<C:/Users/User/Desktop/Dungeons/output/retreat-occlusion-o1-20261023/evidence/o1-geometry-conservation.json>).
- [Verificación de entrada al VTT](<C:/Users/User/Desktop/Dungeons/output/retreat-occlusion-o1-20261023/checks/o1-vtt-3000.json>).
- [Galería de fotos](<C:/Users/User/Desktop/Dungeons/output/retreat-occlusion-o1-20261023/index.html>).
- [Herramienta reproducible](<C:/Users/User/Desktop/Dungeons/prototypes/retreat-occlusion-o1-20261023/review.ts>).

Seguimiento actualizado en [roadmap](<C:/Users/User/Desktop/Dungeons/docs/audits/RETREAT_ROADMAP_20261021.md>)
y [progreso](<C:/Users/User/Desktop/Dungeons/prototypes/retreat-geography-20261021/PROGRESS.md>).
Las herramientas, snapshots y verificadores están en prototypes/retreat-occlusion-o1-20261023;
los registros y fotos de la entrega están en output/retreat-occlusion-o1-20261023.

## Siguiente: A1

Refinar los encuentros entre roca, entradas y pavimento de las seis celdas,
conservando puertas, mobiliario y navegación. A3/A4/A2/A5, M1, E1, L1 y Q1
mantienen su orden en el roadmap. O1 no da por terminada la mejora completa del mapa.
