# Color y follaje de los jardines del Retiro

Muestra VIS-3 para VA-08/09, con los verdes agrupados y los acentos florales de REF-02 como referencia. [Biblioteca visual](../design/VISUAL_REFERENCE_LIBRARY.md)

| Propietario y piezas | Base | Candidata |
| --- | --- | --- |
| `style-sample.ts`, R3_Pine_Dark / Pine_Sun / Olive / Sage | #2D432F / #465C35 / #53663F / #6E7953 | #325737 / #627D38 / #607C37 / #789A58, con el factor de color 0,40 existente |
| Mismo propietario, R3_Grass / Grass_Light / Meadow_Base | #526335 / #778043 / #ADB298 | #5A7735 / #8C9D45 / #AAB981 |
| Mismo propietario, R3_Lavender / Flower_Cream / Flower_Rose | Colores lineales GLB (0,46/0,38/0,56), (0,82/0,76/0,50), (0,65/0,43/0,46) | #A46AC6 / #F5DA86 / #D48299 en variantes compartidas |
| `stormwreck-foliage-finish.ts`, derivados de copas R3_Olive y R3_Pine_Dark | Hojas plegadas con sombreado por racimo | Hojas individuales al 115 % alrededor de su centro, limitadas a la envolvente original |

Se reutilizan UV y texturas existentes. Las variantes PBR de la familia visual usan rugosidad 0,95. Se mantienen las mallas de colisión, la posición de los árboles, los troncos y el número de triángulos de las copas. El ajuste añade trabajo al preparar los derivados en la carga de escena.

14 pruebas aprobadas y candidata cliente/servidor compilada en `runtime/prepared-retreat-gardens`. Se revisaron el jardín de la biblioteca y el bosquete del embarcadero en el renderer integrado, con la misma casilla, hora diurna y resolución. El giro del bosquete difiere en 0,0012 grados por el asentamiento de la cámara. Las dos parejas conservan sus originales, poses y hashes. Aceptación artística, rendimiento e instalación en 3000 pendientes.

[Comparativas superpuestas](../../output/retreat-fixtures-20261106/jardines.html) · [Originales](../../output/retreat-fixtures-20261106/garden-originales.json)
