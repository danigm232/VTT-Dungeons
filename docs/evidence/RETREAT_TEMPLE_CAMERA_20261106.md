# Retiro del Dragón · acabado del templo A5

## Revisión

El visor aislado carga el Retiro integrado con cámara de jugador y el personaje en la terraza. Se fijaron mediodía, resolución 1280 × 720 y estado de escena. Se cruzaron las cinco inclinaciones de 5° a 25°, los cinco giros de −30° a +30° y tres distancias de cámara. El [comparador](../../output/retreat-fixtures-20261106/templo.html) reúne 75 pares con el hallazgo de cada encuadre. El [registro](../../output/retreat-fixtures-20261106/templo-originales.json) conserva archivos originales, huellas SHA-256 y poses. La diferencia medida entre las poses de cada pareja fue cero y el visor registró cero errores.

## Cambios y aceptación

| ID y propietario | Original | Candidata | Revisión |
| --- | --- | --- | --- |
| `CANON_Column_*` y `CANON_Bahamut_Pedestal` · `retreat-refinement-materials.ts` | PBR compartido de escultura, color `#b7ae97` | Piedra mate `#a49b83`. Desgaste localizado en basas y capiteles por color de vértice de las columnas. Reutiliza el relieve y los mapas del Retiro. | VA-04/06. Lectura de piedra y planos en vistas bajas y cercanas. |
| `CANON_Bahamut_Kind_Elder_primitive0/1` y `CANON_Canary_V3_1…7` · `retreat-refinement-materials.ts` y `retreat-global-visuals.ts` | Misma piedra para todas las piezas. Aves separadas de sus puntos de apoyo por 6,4–10,3 cm. | Piedra `#91887a` para la figura y ocre `#b39855` para las aves. Ajuste vertical por ave, medido contra los triángulos del GLB R3. | VA-06. Se leen los apoyos y se conserva la composición de siete aves. |
| Anciano y siete canarios · `retreat-local-occlusion.ts` | Las aves podían quedar opacas al desvanecerse el anciano. | Los canarios siguen el corte local de la estatua. Se recupera la opacidad al despejar la línea de visión. | VA-11. Capturas frontales y prueba de regresión. |

CANON conserva la figura, los siete canarios, el pedestal, las columnas y la planta existente. VTT_AMBIENCE abarca paleta, desgaste y presentación del corte. Se siguió el criterio de silueta y separación tonal de [REF-01, Octopath Traveler II](../design/VISUAL_REFERENCE_LIBRARY.md#ref-01--octopath-traveler--octopath-traveler-ii), con las capturas locales como referencia directa. Materiales, mallas y mapas derivados de los recursos del proyecto.

## Validación y límites

21 pruebas de navegación y oclusión aprobadas, incluida una nueva de los canarios. Las capturas comprueban el interior de día desde un punto fijo de la terraza. El pavimento conserva su modulación visible. La revisión de la cubierta exterior y de cómo se leen los soportes desde la llegada requiere una segunda posición de jugador. Aceptación de mesa pendiente.
