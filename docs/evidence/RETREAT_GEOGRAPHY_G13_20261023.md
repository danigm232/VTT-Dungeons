# Retiro del Dragón · G1.3 · cabo y camino del Observatorio

23/10/2026. Entrega parcial verificada. Base: G1.2 y ampliación A2–A5 entregadas.

## Cambios y límites

Una masa posterior enlaza G1.1 con el respaldo de la casa del cabrestante y
con el terreno forestal del Observatorio. Se reutilizan caras de la retícula
nativa A1 y el mismo basalto. El contorno oriental curva y desciende hacia el mar.

El primer ensayo seguía demasiado pronto la falda baja de G1.1 y producía una
hendidura brusca tras el camino. Se extiende el solapamiento occidental, se
continúa la coronación central y se rebaja el volumen lejano del cabo.
Las evidencias finales corresponden a la versión corregida.

**VTT_AMBIENCE:** contorno nuevo, relieve y uniones. No se atribuyen estas cotas
al mapa oficial. **CANON conservado:** casa, puerta de madera, mecanismo,
palé, acceso forestal, viajes, PNJ y resolución manual del DM.

## Conservación

- 984 mallas nativas previas idénticas en geometría, matrices, materiales y UV,
  incluidas las 128 de A1 con sus seis celdas y todos sus muebles.
- 980 casillas, diez superficies, 15 conexiones, dos puertas y 13 interacciones.
- Misma escala de 1,5 m por casilla, alturas y guardados de versión 3.
- Reserva mínima del corredor del Observatorio: 0,80 m.
- El frente de 15 m del cabrestante y el agua bajo el palé permanecen libres.
- Sin nuevas rutas, colisiones, luces, sombras, texturas ni controles del DM.

## Pruebas

| Comprobación | Resultado |
|---|---|
| Pruebas de Retiro, terreno, movimiento y cámara | 69/69 aprobadas |
| Movimiento autoritativo | 1.580 pasos |
| Muestras físicas | 60.869, sin colisiones |
| Posiciones contra triángulos reales del GLB nuevo | 5.456, sin colisiones |
| Puertas cerradas / apertura manual | 2/2 |
| Interacciones recorridas | 13/13 |
| Partida anterior y tres zombis privados | Conservados |
| GLB de referencia y ejecución | 0 errores, 0 advertencias |
| Malla | Cerrada, sin degenerados, duplicados ni aristas no-manifold |
| Tipos de cliente | Correctos |
| Matriz visual | 250 pares, cinco inclinaciones y cinco giros, tres distancias locales |
| Mobiliario de las seis celdas | 30 pares, misma visibilidad |
| Puerta de A2 y palé | 18 pares: abierto/cerrado, 0/12/15 m, giros −30/0/+30° |
| Tierra nueva bajo el palé | Ninguna |
| Nuevas oclusiones corporales comprobadas | Ninguna |
| Cámara antes/después | Diferencia 0 |

Se guardan **596 fotografías**. Las incidencias previas de cielo a ángulos bajos
y ocultación local permanecen registradas en C1/O1. La pieza geográfica nueva
no forma parte de los recortes de techo.

## Recursos y rendimiento

Una malla nueva: **344,056 bytes y 3.418 triángulos**.
G1.1–G1.3: 1,054,684 bytes, 10,928 triángulos y tres mallas,
dentro del presupuesto de 1,5 MiB / 24.000 triángulos / 18 mallas.

Matriz inicial: 144 mediciones alternadas, cuatro por estado y caso. Repetición:
64 mediciones ABBA/BAAB equilibradas en las dos vistas principales de proyector,
16 por estado y vista. Cada medición temporiza 24 fotogramas después de ocho
renderizados de calentamiento, con finalización explícita de GPU, a 1280 × 720.

| Rol | Vista | Mediana antes → después (ms) | Cambio | p95 antes → después (ms) |
|---|---|---|---|---|
| dm | overview | 19,00 → 18,75 | -1.3 % | 22,40 → 22,70 |
| dm | a2 | 7,05 → 7,35 | +4.3 % | 11,45 → 11,90 |
| dm | observatorio | 11,90 → 12,00 | +0.8 % | 18,85 → 19,75 |
| dm | upper | 19,10 → 18,00 | -5.8 % | 24,35 → 27,65 |
| dm | a1 | 18,15 → 16,35 | -9.9 % | 50,50 → 56,00 |
| dm | a5 | 14,60 → 13,45 | -7.9 % | 50,75 → 50,65 |
| player | overview | 18,40 → 18,10 | -1.6 % | 21,65 → 21,45 |
| player | a2 | 7,15 → 7,40 | +3.5 % | 11,65 → 11,55 |
| player | observatorio | 13,70 → 13,50 | -1.5 % | 20,70 → 19,40 |
| player | upper | 20,05 → 22,95 | +14.5 % | 27,35 → 30,15 |
| player | a1 | 15,35 → 16,40 | +6.8 % | 54,20 → 46,25 |
| player | a5 | 17,40 → 16,80 | -3.4 % | 40,65 → 36,55 |
| projector | overview | 18,75 → 19,15 | +2.1 % | 22,05 → 25,05 |
| projector | a2 | 8,25 → 8,55 | +3.6 % | 12,95 → 13,65 |
| projector | observatorio | 8,95 → 8,55 | -4.5 % | 12,35 → 14,70 |
| projector | upper | 16,25 → 16,65 | +2.5 % | 21,60 → 21,20 |
| projector | a1 | 15,85 → 11,40 | -28.1 % | 54,80 → 31,35 |
| projector | a5 | 17,80 → 10,95 | -38.5 % | 57,35 → 47,65 |

Repetición ampliada:

| Vista proyector | Mediana antes → después (ms) | Cambio | p95 antes → después (ms) |
|---|---|---|---|
| a2 | 10,85 → 10,60 | -2.3 % | 19,40 → 18,85 |
| observatorio | 8,40 → 8,25 | -1.8 % | 12,60 → 12,65 |

Se repite también el acceso superior del jugador, que registra +14,5 % en la matriz inicial, con A5 como control: 64 mediciones adicionales, 16 por estado y vista.

| Repetición jugador | Mediana antes → después (ms) | Cambio | p95 antes → después (ms) |
|---|---|---|---|
| upper | 21,45 → 21,25 | -0.9 % | 29,50 → 27,95 |
| a5 | 16,45 → 17,10 | +4.0 % | 44,70 → 49,65 |

Los resultados iniciales y sus variaciones se conservan. Activar la pieza
mantiene las mismas texturas y memoria estimada en cada sesión. Los tiempos
locales tienen dispersión; el seguimiento sostenido de FPS, memoria residente
y p95 queda en Q1. Los descensos aislados no acreditan una optimización general.

## Entrega y archivos

- [Galería antes/después](<C:/Users/User/Desktop/Dungeons/output/retreat-geography-g13-20261023/index.html>).
- [Resultados verificables](<C:/Users/User/Desktop/Dungeons/output/retreat-geography-g13-20261023/checks/visual-performance-verification.json>).
- `campaigns/stormwreck-isle/public/retreat-refinement.ts`: misma carga geográfica, etapa 3.
- `campaigns/stormwreck-isle/public/retreat-geography.json`: registro de G1.3.
- `campaigns/stormwreck-isle/public/art/retreat-modules/retreat_geography_g13_runtime.glb`: pieza nueva.
- `prototypes/retreat-geography-g13-20261023/artifacts/retreat_geography_g13.blend`: fuente nativa acumulada.
- `prototypes/retreat-geography-g13-20261023/`: construcción, validadores y visor reproducibles.

De los 384 archivos previos protegidos, solo cambian los dos de carga/configuración.
El contenido anterior de modelos, navegación y lógica de juego permanece igual.

Referencias visuales: [NPS · Columnar Jointing](https://www.nps.gov/subjects/volcanoes/columnar-jointing.htm)
y [USGS · Sheepeater Cliffs](https://www.usgs.gov/observatories/yvo/news/spectacular-columns-sheepeater-cliffs),
consultadas el 23/10/2026. Inspiran solo el relieve decorativo.

## Incidencia previa observada en la prueba aislada

En el encuadre del palé a 0 m, un bulto de la carga conserva su cota original.
La comparación antes/después presenta el mismo comportamiento. Se registra
para la subfase A2, donde corresponde revisar la vinculación visual de la carga
al elevador; G1.3 conserva esa jerarquía y comprueba la ausencia de tierra nueva
bajo la plataforma. Las posiciones de la barca y de los viajes no se alteran.

## Siguiente

G1.4: taludes de la costa baja y desembarco, y una única representación de la
barca. Después se cierra G1 y continúan C1 (horizonte), C2 (zoom), O1
(ocultación) y los acabados por zona/material según el roadmap.
