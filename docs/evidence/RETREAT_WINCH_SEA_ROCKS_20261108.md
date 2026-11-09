# Retiro · rocas marinas ante el cabrestante A2 — 08/11/2026

Petición: retirar los planos de acantilado incompletos situados delante de la caseta y sustituirlos por rocas que emerjan del mar. Se conserva el macizo situado detrás de la carga y bajo la casa, así como el apoyo independiente de las escaleras. La caseta, el palé, el cable, el mar, las celdas, las rutas y las interacciones mantienen sus sistemas y coordenadas. No se ha modificado otro mapa.

## Registro de arte y procedencia

| Identificador / propietario | Estado anterior | Derivado y aceptación |
| --- | --- | --- |
| `V5_Eastern_Cliff_Continuous_Spine` · `retreat_v5_coast_runtime.glb` / `retreat-visual-revisions.ts` | Espina larga con caras recortadas y finas delante del cabrestante. | Se desactiva en escena solo después de crear las rocas. El GLB original sigue en disco. VA-07/13/15; revisión artística del usuario pendiente. |
| `Stone_Foreground_East` y `Stone_P3_Eastern_Cliff_Continuous_Backing` · fases 3/8 / `retreat-refinement.ts` | Aguja aislada y paño vertical estrecho junto al tramo de escalera. | Se desactivan visualmente, conservando sus originales; `Stone_P8_East_Stair_Embedded_Bedrock` y `Stone_P3_Winch_Embedded_Rock_Headland` siguen activos. VA-07/13. |
| `retreat:a2-sea-outcrops` · `retreat-winch-sea-rocks.ts` | Sin agrupación marina en el lugar de las láminas retiradas. | Siete rocas 3D irregulares, agrupadas en una malla, con `organicStone` de `engine/client/diorama-kit.ts`, colores húmedos y el mismo basalto compartido `a1:coastal-cliff-v10` / `style-v1:zones:basalt:retreat:pbr:rock`. No son transitables ni colisionan. VA-07/13/15; revisión artística pendiente. |

Se toma de [REF-07, Sea of Stars](../design/VISUAL_REFERENCE_LIBRARY.md#ref-07--sea-of-stars) la lectura por siluetas de roca, agua y profundidad; es una referencia de estudio, no un recurso importado. La geometría y los materiales usados son del proyecto. El material conserva la familia y los mapas ya utilizados: no se incorporan texturas, luces ni reflejos nuevos. La petición de retirar las piezas y crear rocas es **VTT_AMBIENCE**; el cabrestante y su función se mantienen en el sistema existente de **CANON**.

## Validación

- [Seis comparativas reales](../../output/retreat-winch-sea-rocks-20261108/index.html) en el renderer integrado, a 1280 × 720, de día y sin tormenta. La cámara, proyección y destino coinciden exactamente en cada par; las olas siguen animadas y pueden diferir entre imágenes. La cámara de seguimiento de la carga se muestra a 12, 6 y 1,2 m. Las imágenes originales, registros de cámara y huellas SHA-256 están en la galería.
- Prueba adicional del descenso con el estado real del mecanismo: 29 muestras, de 12 a 0,24 m, descenso continuo y seguimiento de cámara activado; sin errores de navegador. [Datos](../../output/retreat-winch-sea-rocks-20261108/winch-coast-motion.json). Las capturas comparativas anteriores fijan la carga en las tres alturas para poder igualar el encuadre.
- El ensayo de geometría comprueba el hueco vertical del palé, que las siete rocas asoman sobre el agua, que no son obstáculos y que los soportes, palé y materiales permanecen. Si faltan las piezas originales, la sustitución no se ejecuta.
- 26 pruebas dirigidas superadas entre rocas, caseta, unión de caminos, pradera/cueva, navegación global, persistencia de estados y seguimiento de carga. El primer ensayo global excedió su límite al coincidir con compilaciones y render; se repitió aisladamente y pasó. Comprobaciones de tipos de cliente y servidor y compilación de producción superadas.
- La mesa de prueba independiente abrió el Retiro en la consola DM con el servidor conectado; `/dm`, `/player` y `/projector` respondieron correctamente. Esto no equivale a un ensayo físico ni a una aceptación artística.
- En el inventario de la escena, tres mallas visuales con 776 triángulos dejan de dibujarse y se incorpora una malla de 1.260 triángulos. Sus fuentes permanecen cargadas/desactivadas como recuperación. No se han medido FPS ni memoria en esta entrega y no se afirma una mejora de rendimiento.

## Instalación y límites

Se compiló `runtime/prepared-retreat-a2-sea-rocks-20261108` y se instaló en `dist` después de verificar que el puerto 3000 y los guardados no tenían una mesa activa; la compilación anterior se conserva en `runtime`. Esta compilación incluye las correcciones A2, pradera y cueva que estaban pendientes de instalar. El servidor estaba apagado y no se ha arrancado ni alterado la partida del usuario. Al abrir `INICIAR.cmd` se usa el proyecto actualizado; la revisión de la partida concreta y la aprobación estética siguen pendientes.
