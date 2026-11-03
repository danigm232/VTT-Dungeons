# Retiro del Dragón · V1 · recorrido y visibilidad

Entrega parcial del 27/10/2026. Registro completo de los 19 puntos: [plan de correcciones](../design/RETREAT_VISUAL_CORRECTIONS_20261027.md). Galería: `output/retreat-visual-fixes-20261027/index.html`. Publicación y conservación del guardado se acreditan en `checks/published.json` y `checks/live-save-preservation.json` de esa entrega.

## Resultado y límites

Se cierran técnicamente los puntos **1, 2, 6, 12, 13 y 14**. El **17** queda parcial: suelo y cuadrícula corregidos, contacto mar/arbolado pendiente de V5. Biblioteca decorativa, ampliación del templo, costa y paisaje continúan en las siguientes fases; no se presentan como terminados.

- Movimiento: la extensión anterior añadía 137 casillas copiando alturas de escalera por columna; la comprobación física encontró 134 sin apoyo en las superficies reconocidas. Se sustituye esa extensión por 190 casillas verificadas en las dos parcelas existentes, con reservas de troncos y conexiones a los caminos. Todos los 1.142 registros del JSON original se conservan. Resultado: **1.332 casillas, 13 superficies y 68 conexiones**, escala 1,5 m.
- Cuadrícula: proyección única al cargar sobre superficies 3D, recortada en bordes sin suelo y separada por huellas. Se conserva la cuadrícula regular elevada de plaza e interiores. Mostrar/ocultar y cambiar su estilo no altera la navegación.
- A3/A4: se divide únicamente la envolvente decorativa compartida, con UV y materiales conservados; se retira el frente de la habitación ocupada y sus estanterías adosadas del lado de cámara. La apertura depende de entrar en su superficie, no de pasar por la calle. La otra sala conserva su fachada. Se mantienen paredes bajas, reservas físicas, puertas y resolución manual.
- Escalera lateral: **32 huellas** niveladas transversalmente; 301 vértices afectados; desplazamiento máximo individual 25 cm. Desnivel transversal máximo medido **50 cm → 0** en las 96 caras revisadas. Se conservan X/Z, índices, UV, pendiente de ascenso, conexión y navegación. Fuente GLB intacta.
- Bancos: dejan de compartir atenuación con todos los objetos bajos de la plaza. Su geometría y reserva se conservan.
- Velas: las cinco llamas ya no cambian de separación al escalar el conjunto; conservan X/Z y solo una tenue variación vertical. El resto de iluminación se mantiene.

## Pruebas

- **47 pruebas / 7 archivos**, compilación de cliente y servidor correctas.
- **513 encuadres**: 19 focos, inclinaciones 5°/15°/25°, giros −30°/0°/+30°, DM/jugador/proyector. Incluye entradas, interiores, calle exterior de A3/A4, seis celdas, bancos, ambas escaleras y parcelas. Personaje encuadrado, interior ocupado abierto y fachada exterior conservada. Es una matriz técnica, complementada por revisión visual de las fotografías; no es una medición de FPS.
- **12.226 pasos autoritativos**, 745.828 muestras frente a las reservas físicas de los módulos; 42 destinos de ida/vuelta y bordes regionales negativos.
- **715 aristas / 9295 muestras de apoyo** en las parcelas nuevas y la escalera lateral, sobre la escena final cargada.
- 75 mallas de las celdas con hashes de geometría idénticos; 71 transformaciones estáticas idénticas. Las otras 4 son llamas animadas: geometría idéntica, fase temporal de escala variable.
- 176 fuentes GLB del proyecto sin cambios; 52 GLB del paquete compilado contrastados. Dueños de optimización Q1.1/Q1.2/Q1.3a conservados byte a byte. 2.195 entradas de fuente congeladas para la candidata C.
- Versión de guardado 4: solo recoloca posiciones obsoletas sin suelo. La lectura de la partida actual encontró cero actores que necesitaran recolocación; comprobar el resultado publicado en el informe de guardado.

## Recursos y rendimiento

Comparación con la matriz anterior: 1569 → 1578 nodos de malla cargados, por partición de la envolvente; máximo 1620 durante la revisión, incluyendo los proxies temporales de oclusión. Materiales **233 → 233**, texturas **77 → 77**, luces **18 → 18**. No se rebajan sombras, luces, resolución ni materiales. La adaptación de cuadrícula tarda 179 ms en esta carga de revisión y no trabaja cada fotograma.

No se atribuye una mejora o caída de FPS a estos datos. La auditoría sostenida de FPS de todo el mapa sigue pendiente tras corregir los errores visuales; las cifras históricas de dos focos no certifican esta entrega.

## Archivos de implementación

Modificados: `apps/web/world.ts`, `engine/client/terrain3d.ts`, `engine/server/retreat-migration.ts`, `campaigns/camp-rests/public/a1-visuals.ts`, y en `campaigns/stormwreck-isle/public/`: `retreat-global-visuals.ts`, `retreat-local-occlusion.ts`, `retreat-refinement.ts`, `retreat-island.ts`, `retreat-island-walkability.ts`.

Nuevos: `retreat-grid-presentation.ts`, `retreat-stair-presentation.ts`, `retreat-forest-walkability.json` en ese módulo; pruebas de cuadrícula, escalera y navegación del bosque. Se actualizan las expectativas de versión del guardado en las pruebas existentes y su verificador. Guiones, congelaciones y evidencia de esta entrega: `prototypes/retreat-visual-fixes-20261027/`.

## CANON y siguiente fase

CANON contrastado con el PDF oficial, capítulo 1, pp. 6–12: acceso excavado al comedor, mesa larga/dos bancos/una silla, cocina por pasillo; biblioteca con puerta de roble e hierro, estantes de pared, tres independientes y mesa con dos bancos; templo abierto, cubierta de madera y anciano Bahamut con siete canarios. Los recortes de cámara y las reparaciones técnicas son presentación VTT; no cambian el relato ni resuelven pruebas.

**Siguiente: V2, puntos 3–5**, estanterías variadas y algo mayores, espesor de pared derecha y jardín exterior. Revisar conceptualmente V1 antes de modelar V2. Templo (V3), caminos/jardineras/Pleamar (V4) y mar/bote/costa (V5) conservan su detalle en el registro; no continuar Q1.3b por inercia.
