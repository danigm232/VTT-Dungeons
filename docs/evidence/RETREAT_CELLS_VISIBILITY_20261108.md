# Celdas A1: entrada y mobiliario — 08/11/2026

Corrección localizada de las seis habitaciones existentes del Retiro. La vista cenital se usa solo para inspección; las cámaras de juego, las casillas, la distribución de las habitaciones y sus interacciones siguen siendo las existentes. La roca mantiene su relieve.

| Elemento / propietario | Antes | Candidato y aceptación |
| --- | --- | --- |
| `a1:room-N:face-3` y `face-3:portal-sides` / `a1-visuals.ts`, `retreat-cell-visibility.ts` | El marco y partes de sus laterales seguían delante del personaje. | Se agrupan los tramos frontales y se ocultan solo en la celda ocupada; el resto de la pared se conserva. VA-14. Aceptación visual pendiente. |
| `P1_A1_N_Carved_Jamb_*`, `Finish_A1_N_Rock_Shoulder_*` / `retreat-refinement.ts` | Capas adicionales de jambas y hombros seguían visibles delante de la puerta. | Se ocultan en la habitación ocupada y se recuperan al salir. Los suelos, piezas bajas y colisiones no se alteran. VA-14. |
| `a1:room-N:furniture` y sus piezas interactivas / `a1-visuals.ts` | Algunos muebles estaban demasiado cerca de los salientes de roca. | Desplazamiento pequeño dentro de su casilla, manteniendo sus piezas y el punto interactivo; estantes posteriores ligeramente separados. VA-06/07. |
| `a1:bedrock-partition:1–6` / `a1-visuals.ts` | Masas divisorias irregulares invadían muebles y una hamaca. | Menor anchura en la geometría del Retiro, sin alisar ni borrar los perfiles; en la última celda las cuatro hamacas quedan visibles en la revisión cenital. VA-07/14. |

Referencia de lectura táctica: [REF-03](../design/VISUAL_REFERENCE_LIBRARY.md#ref-03--final-fantasy-tactics--the-ivalice-chronicles); no se usa material del juego de referencia. Los muebles de las celdas se conservan como CANON existente; los ajustes de presentación son VTT_AMBIENCE.

[Doce comparativas](../../output/retreat-cells-20261108/index.html): seis vistas cenitales de diagnóstico y seis vistas de jugador. Cada par conserva cámara y resolución; pulsar para alternar. Los originales y sus huellas están registrados. La revisión visual del usuario y las pruebas físicas siguen pendientes.

26 pruebas dirigidas de oclusión, geometría, navegación y guardado pasaron sobre esta corrección. La muestra marina previa permanece solo en desarrollo, pues su espuma aún necesita ajuste; no se incluye en la compilación normal del VTT.

La comprobación integrada de entrada y salida confirmó los marcos ocultos dentro y restaurados fuera en las seis celdas; [registro](../../output/retreat-cells-20261108/cells-exits.json). Se compiló la candidata, se abrió una mesa aislada con el Retiro conectado y respondieron las tres interfaces. Después se instaló en `dist` con la mesa habitual cerrada; la versión anterior se conservó en `runtime`. El servidor 3000 no se ha iniciado y la partida del usuario no se ha modificado.
