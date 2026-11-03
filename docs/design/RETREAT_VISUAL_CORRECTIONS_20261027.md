> Cierre vigente: V1–V5 implementadas y publicadas. Informes de cada fase y entrega consolidada en docs/evidence/RETREAT_VISUAL_V2_V5_20261027.md. El contrato inferior se conserva como alcance y evidencia histórica.

# Retiro del Dragón · registro de las 19 correcciones visuales

Autoridad: petición del usuario del 27/10/2026 y sus 15 capturas. Este registro complementa el maestro, revisión 17. Se corrige sobre lo existente, por fases y con revisión conceptual al entregar cada una. La optimización Q1 queda pospuesta hasta resolver estos errores y revisar FPS en todo el mapa.

Las referencias originales están archivadas sin cambios en `output/retreat-visual-fixes-20261027/references/`; su manifiesto conserva las rutas de origen y SHA-256. La base anterior está congelada en `prototypes/retreat-visual-fixes-20261027/baseline/`.

| Punto | Trabajo | Fase | Estado |
|---|---|---|---|
| 1 | Ampliar movimiento en suelo disponible | V1 | Implementado: dos parcelas existentes, 190 casillas verificadas; retirada de la ampliación que copiaba alturas de escalera sobre vacío |
| 2 | Oclusión A3/A4 | V1 | Implementado: recorte coherente de frente, cubierta y estanterías adosadas del lado de cámara; otra sala conservada |
| 3 | Variación de librerías | V2 | Implementado y validado: consultar informe de fase y galería V2–V5 |
| 4 | Librerías algo mayores | V2 | Implementado y validado: consultar informe de fase y galería V2–V5 |
| 5 | Pared derecha de A4 y jardín exterior | V2 | Implementado y validado: consultar informe de fase y galería V2–V5 |
| 6 | Escalera lateral del templo inclinada | V1 | Implementado: nivelar transversalmente las huellas existentes y adaptar cuadrícula a peldaños; conservar subida y conexión |
| 7.1 | Sin columnas centrales | V3 | Implementado y validado: consultar informe de fase y galería V2–V5 |
| 7.2 | Templo más alto y ancho | V3 | Implementado y validado: consultar informe de fase y galería V2–V5 |
| 7.3 | Bahamut reconocible | V3 | Implementado y validado: consultar informe de fase y galería V2–V5 |
| 7.4 | Vigas/ocultación y paleta clásica | V3 | Implementado y validado: consultar informe de fase y galería V2–V5 |
| 7.5 | Puente de madera más largo | V3 | Implementado y validado: consultar informe de fase y galería V2–V5 |
| 8 | Postes y cuerda en caminos del acantilado | V4 | Implementado y validado: consultar informe de fase y galería V2–V5 |
| 9 | Bordes menos rectos | V4 | Implementado y validado: consultar informe de fase y galería V2–V5 |
| 10 | Huecos de mar/roca junto a A2 | V5 | Implementado y validado: consultar informe de fase y galería V2–V5 |
| 11 | Más jardineras frente a habitaciones | V4 | Implementado y validado: consultar informe de fase y galería V2–V5 |
| 12 | Bancos desaparecen | V1 | Implementado: evitar oclusión conjunta del bloque de objetos bajos de plaza |
| 13 | Velas que bailan | V1 | Implementado: posiciones horizontales fijas, tenue variación vertical de la llama e iluminación existente |
| 14 | Grid posterior a las celdas | V1 | Implementado: líneas sobre suelo/peldaños, sin prolongar altura de escalera sobre vacío |
| 15 | Contacto mar/piedra plano azul | V5 | Implementado y validado: consultar informe de fase y galería V2–V5 |
| 16 | Bote flotante | V5 | Implementado y validado: consultar informe de fase y galería V2–V5 |
| 17 | Grid junto al bote / mar sobre árboles | V1 + V5 | Implementado: V1 cuadrícula/suelo; V5 protección de orilla y raíces |
| 18 | Parcela del bote pobre | V5 | Implementado y validado: consultar informe de fase y galería V2–V5 |
| 19 | Pleamar acaba en pared | V4 | Implementado y validado: consultar informe de fase y galería V2–V5 |

## Cierre de V1

Consultar `docs/evidence/RETREAT_VISUAL_V1_20261027.md` y galería `output/retreat-visual-fixes-20261027/index.html`. V2–V5 completadas por autorización posterior explícita.

## Contrato de las siguientes fases

1. V2: comenzar por estanterías y pared derecha, después jardín. Usar el módulo A4 y su fuente Blender actual; conservar tres estantes independientes y mesa con dos bancos. Entregar vista cercana/lejana, entradas y giros permitidos.

   «Derecha» significa la derecha del encuadre frontal del usuario, no el este del mundo. La cámara frontal actual proyecta +X hacia la izquierda: comprobar la pared oeste de A4 (`West_Wall`, X aproximada 92,73–93,03 m) y su exterior hacia X menor antes de modelar. Registrar los límites reales de esa parcela y contrastarlos con la captura; no confundirla con el claro de Observatorio en X131–152 m, que ya participa en V1.
2. V3: conservar terraza, accesos, cubierta de madera, columnas pétreas, puntales arqueados y muro norte excavado. La petición actual autoriza estructura más alta/ancha y centro despejado, sin repetir el aumento anterior del 100 % del suelo. Mostrar medidas y apoyos reales en la entrega.
3. V4: proteger originales de celdas, bancos y todos los interactivos. Naturalizar geometría visual y mobiliario exterior conservando anchuras útiles. Para Pleamar mantener el ancla de viaje y hacer legible cómo continúa el sendero.
4. V5: resolver físicamente agua/tierra/roca, arbolado apoyado y movimiento del bote con el oleaje existente. No añadir otro mar ni otro sistema de viaje. Revisar desde cabrestante, playa y senderos altos.
5. Después: auditoría sostenida de FPS y memoria en A1–A5, costa y todas las salidas, con perfiles DM/jugador/proyector. Las cifras históricas de A1/A4 no representan el mapa entero ni esta entrega nueva.

CANON: aventura oficial, capítulo 1, pp. 6–12; referencia regional para posteriores cambios de salida. VTT_AMBIENCE/adaptación: mayor tamaño de arquitectura solicitado, jardines añadidos, acabados, recortes de cámara y mobiliario refinado. Mantener dados físicos y resolución manual del DM. Ninguna fase autoriza automatizar resultados narrativos.
