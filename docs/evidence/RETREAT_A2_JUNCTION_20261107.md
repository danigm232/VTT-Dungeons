# Retiro del Dragón · unión de caminos de A2

Encargo del 07/11/2026. [Comparativa interactiva](../../output/retreat-a2-junction-20261107/index.html) · [originales, poses, huellas y muestras de apoyo](../../output/retreat-a2-junction-20261107/originals.json).

## Resultado y alcance

La escalera superior, la escalera del acantilado y la pasarela de la casa se encuentran a 15 m. La casilla `a2:103,45` solo cubría su mitad oriental: entre el último escalón y la pasarela faltaban 0,75 × 1,5 m de apoyo y no había conexión directa en ese borde. A petición posterior del usuario, la pasarela se ensancha a **3 m, dos casillas**, como la escalera, y comparte su pavimento. Se completa la casilla original y se añaden tres casillas exteriores en la franja ampliada; dos conexiones reversibles unen ambas filas a la escalera superior. La conexión ya existente con `cliff:103,46` continúa. El perfil de movimiento desciende hasta 15 m en el borde del escalón y sigue a nivel por el descansillo.

Tres tramos de cuerda y sus postes se habían generado en el interior del cruce porque se trataron los bordes de las escaleras por separado. Se retiran solo `R3_Stair_Rope_upper_12`, `13` y `14` de los lotes visuales y se coloca protección en el borde exterior de la pasarela. Las otras cuerdas y postes se mantienen. La puerta conserva su ancho original y se bloquea expresamente el paso a través del muro contiguo. Ni los GLB originales ni las paredes, puerta, cabrestante, palé, personajes, disparadores y salidas se sustituyen.

**CANON:** casa y acceso del cabrestante dentro del recorrido del claustro. **VTT_AMBIENCE:** forma concreta del empalme, pavimento derivado de la pasarela existente y emplazamiento de las barandillas. Estos acabados no se presentan como detalles escritos del PDF.

## Registro visual y técnico

Referencia de estudio **REF-03, Final Fantasy Tactics 2025**, para lectura táctica de apoyos y alturas con sprites; no se usan sus imágenes como recursos. La intervención atiende VA-07 (contactos) y VA-14 (lectura jugable desde la cámara). La valoración artística final pertenece al usuario.

| ID y propietario | Base | Candidata / aceptación |
| --- | --- | --- |
| `a2:103,45`, nueva fila `a2:103–105,44` y transiciones a `upper:102,44–45` · `retreat-winch-junction-navigation.ts` / `retreat-runtime.ts` | Polígono de media casilla y pasarela de una casilla de ancho | Dos filas de 1,5 m, con conexiones directas y un borde bloqueado ante el muro. La última casilla de la fila ampliada se recorta en la fachada. Se conservan direcciones anteriores y reglas de puerta. |
| `retreat:a2-junction-foundation`, `retreat:a2-junction-north-foundation` · `retreat-winch-junction.ts` | No existía base bajo el hueco ni la segunda fila | Piezas con 0,32 m de grosor; reutilizan la piedra de `CANON_Floor_West_Path_primitive0`, albedo 1254 × 1254 y rugosidad 0,95. Registradas como apoyo; sin nuevo obstáculo. |
| `CANON_Floor_West_Path_primitive1` y tres piezas `retreat:a2-junction-...paving` · mismo archivo | Losas grises distintas del pavimento de las escaleras | Se comparte el material existente de `CANON_Global_upper_walkable-stair` y sus texturas; se prolonga la geometría de la pasarela y se ajusta su escala de UV. La valoración visual sigue pendiente de revisión del usuario. |
| `R3_Rail_Batch_12_5_a1_oak-v5`, `...coastal-cliff-v10`, `...R3_Rope` y `retreat:a2-edge-*` · mismo archivo | Lotes con cuerdas interiores 12–14 y protecciones exteriores | Se comprueba cantidad y posición de los vértices antes de retirar únicamente esos tres tramos. Nuevos postes y cuerda comparten materiales y siguen el borde exterior. Se conservan los GLB originales. |

## Comprobaciones

- **39 pruebas aprobadas** en seis archivos para esta candidata y las dos correcciones adyacentes: movimiento real del servidor, puerta cerrada/abierta, muro, posición guardada, conectividad, obstáculos, oclusión y ventanas/mecanismo.
- Sondeo real: de **120 puntos** en el antiguo hueco y **675** en la franja ampliada, antes no había apoyo en ninguno; después los **795** tienen suelo entre 14,975 y 15 m. Las cuatro superficies visibles de la pasarela usan exactamente el mismo material que la escalera, con `/art/a1-hd2d-v1/a1-plaza-v6.png` de 627 × 627. Son muestras espaciales, no una garantía matemática sobre cada punto de la escena.
- La cuadrícula corresponde a las dos filas nuevas, recortada ante la pared, y se comprueba que pueda ocultarse y volver a mostrarse. La escala sigue en 1,5 m. Los datos de movimiento no dependen de esa visibilidad.
- **56 rayos** a distintas alturas sobre los tres cruces y la franja nueva no encuentran postes o cuerdas en el paso. La protección nueva sigue el borde del acantilado; las pruebas de movimiento comprueban también que la pared junto a la puerta no pueda atravesarse.
- **Diez pares** de 1280 × 720 con cámara, zoom, luz, actor y puerta equivalentes: inclinaciones 15°/25° con giros −30°/0°/+30°, además de 5°/0° y dos vistas con la cuadrícula destacada. El comparador alterna mediante clic o teclado y permite ampliar. El primer encuadre de cuadrícula de la referencia no alcanzó el mismo zoom y se excluyó del comparador; su original se conserva.
- La referencia de cuadrícula se generó a partir de las mismas fuentes actuales, desactivando solo el adaptador y la corrección de esta unión. Las demás capturas anteriores se tomaron antes de introducirlos.
- Los tramos retirados pertenecían a lotes existentes y se reutilizan materiales. No se ha medido FPS sostenido ni memoria de GPU; no se afirma una mejora de rendimiento.

## Archivos

- `campaigns/stormwreck-isle/public/retreat-winch-junction-navigation.ts` y `retreat-runtime.ts`: casilla y conexiones del terreno autoritativo.
- `campaigns/stormwreck-isle/public/retreat-winch-junction.ts` y `retreat-refinement.ts`: suelo derivado y retirada selectiva de los dos tramos interiores.
- `engine/server/retreat-winch-junction.test.ts`: movimiento, puerta y partida guardada.
- `prototypes/retreat-fixtures-20261106/review.ts`, `vite.config.mjs` y `prototypes/retreat-a2-junction-20261107/gallery.mjs`: revisión real y comparador.
- `ROADMAP_V1.md` y `PROJECT_STATE.md`: registro común.

La candidata conjunta `runtime/prepared-retreat-a2-meadow-cave-20261108` compila cliente y servidor. En una mesa temporal con datos independientes, el DM muestra el Retiro y conecta con el servidor; las rutas de DM, jugador y proyector responden. Esto no constituye una prueba física de varias pantallas. La mesa habitual conserva su proceso y guardado; la candidata no está instalada allí. La revisión artística sigue pendiente.
