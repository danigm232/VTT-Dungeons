# Retiro del Dragón · pradera y esquina excavada A3

Corrección de las dos zonas señaladas por el usuario el 08/11/2026. [Comparativa de seis encuadres](../../output/retreat-expedition-seams-20261108/index.html) · [originales y poses](../../output/retreat-expedition-seams-20261108/originals.json).

## Resultado

La pradera de preparación llegaba en diagonal hasta un borde anterior al paseo y dejaba una cuña de roca desnuda entre el césped, el camino y la pared. Una pequeña pieza de terreno prolonga el césped hasta el encuentro; se reutilizan las hierbas y flores de la explanada y la vegetación queda fuera del pavimento. No se han creado celdas navegables ni obstáculos en este sector.

La esquina del comedor mostraba la unión abierta entre el lateral y la fachada excavados, con una pieza rectangular expuesta. Se añade un remate pétreo poco profundo, articulado con la fachada y el lateral de roca. El detalle se integra en el recorte visual de A3; no cambia la pared física ni el acceso. La antorcha permanece en su sitio y la superficie queda retranqueada junto a la llama.

**CANON:** comedor excavado y circulación existente en el Retiro. **VTT_AMBIENCE:** acabado exacto de la pradera, plantas y superficie de unión de roca. No se atribuye la forma del césped al texto de la aventura.

## Registro por pieza

Referencias de estudio REF-02 (Witchbrook: transiciones suaves de vegetación y suelo) y REF-03 (Final Fantasy Tactics 2025: lectura de alturas y personaje). Se aplican VA-07 (contactos), VA-08 (césped agrupado) y VA-14 (oclusiones). Las referencias son material de estudio; no son recursos del juego.

| ID / propietario | Antes | Candidata y criterio |
| --- | --- | --- |
| `retreat:expedition-meadow-edge` · `retreat-expedition-seams.ts` | La geometría `R3_Expedition_Soil_R3_Meadow_Base` terminaba antes del paseo | Pieza de suelo a +18,004 m, con el mismo material `style-v1:zones:meadow:R3_Meadow_Base`, albedo de 1254 × 1254 y UV a 2,7 m. Se superpone muy ligeramente al borde original; el contorno respeta el pavimento. |
| `retreat:expedition-edge-grass`, `...grass-light`, `...cream`, `...lavender` · mismo archivo | Sin plantas en la cuña | 380 matas con el campo de altura y tono de la pradera existente y flores discretas. Cuatro mallas agrupadas, materiales `R3_Grass`, `R3_Grass_Light`, `R3_Flower_Cream` y `R3_Lavender` compartidos. Sin selección ni colisiones. |
| `Stone_P3_Sculpted_Carved_Front_A3_Seam` · mismo archivo | Junta abierta entre `Stone_P3_Sculpted_Carved_Front_2` y `Stone_P7_Cave_Exterior_Edge_Closures` | Superficie irregular de roca con el material `style-v1:zones:basalt:retreat:pbr:rock`, albedo 1254 × 1254, rugosidad 0,95 y UV estables en cada cara. Recorte de A3 existente; no añade un collider. |

Durante la revisión se corrigieron normales nulas que oscurecían las primeras briznas y una proyección UV que producía bandas en la cara lateral. Los GLB y la geometría de las celdas y habitaciones originales siguen disponibles.

## Comprobaciones

- Seis pares de 1280 × 720 con cámara, zoom, luz, personaje y cuadrícula iguales: frontal y giros −30°/+30° sobre la pradera y la fachada. La galería permite alternar por clic o teclado y ampliar; las posiciones de cámara son idénticas en cada par.
- En el comedor, el nuevo paño se oculta en los tres giros comprobados para conservar la vista del personaje. La prueba geométrica mantiene libre el entorno inmediato de la llama; la posición e iluminación existentes no se alteran.
- La pradera añadida comparte suelo y materiales, y las cuatro mallas de vegetación no tienen colisión. Se verifica que haya apoyo en la cuña y que la roca use el recorte de A3 sin abrir otros interiores.
- La escena de la muestra pasa de 2.314 a 2.320 mallas y conserva 23 luces y 250 materiales. No se ha medido FPS sostenido ni memoria real; la evaluación de rendimiento permanece pendiente.
- La candidata conjunta supera **39 pruebas** de terreno, movimiento, puertas, colisiones, oclusión, la casa del cabrestante y estas piezas. Esto no sustituye el ensayo físico en varios dispositivos ni la revisión artística del usuario.
- Cliente y servidor compilan en `runtime/prepared-retreat-a2-meadow-cave-20261108`. Una mesa temporal con datos independientes conecta el DM y muestra el Retiro; DM, jugador y proyector responden. La mesa habitual sigue separada y no se ha reiniciado.

Archivos: `campaigns/stormwreck-isle/public/retreat-expedition-seams.ts`, `retreat-refinement.ts`, `engine/client/retreat-expedition-seams.test.ts`, el visor de `prototypes/retreat-fixtures-20261106/` y el generador de la galería en `prototypes/retreat-expedition-seams-20261108/`.
