# Retiro del Dragón — paisaje de las salidas y continuidad insular

Revisión del 07/11 por encargo de auditar todos los recorridos. La [ficha de evidencia](../evidence/RETREAT_ROUTES_20261107.md) contiene el inventario de 26 rutas y el estado verificable de la candidata. Se amplían únicamente las cuatro continuaciones escénicas, conservando las anclas SAL, las casillas y la adjudicación manual de viajes. Esta revisión actualiza el detalle local; la prioridad global permanece en `ROADMAP_V1.md`.

Muestra del 06/11 en la cala de Pleamar y el ramal costero del Observatorio. [Perfil, contacto con el mar y evidencia](../evidence/RETREAT_COAST_PROFILE_20261106.md).

El 06/11 se refinaron los cuatro finales escénicos con el terreno y las anclas vigentes. [Ficha de cambios y 12 comparativas](../evidence/RETREAT_TRAIL_ENDS_20261106.md).

Fecha inicial: 25/10/2026. Actualización: 26/10/2026. Revisión: continuación SAL autorizada. Estado: **SAL-2R/3/4/5 comprobadas y publicadas el26/10; revisión conceptual del usuario pendiente. Próxima M1**.

Este documento desarrolla las fichas SAL del roadmap maestro. La petición inicial autorizó analizar, crear imágenes y actualizar el plan. Después el usuario aprobó esas imágenes como referencias y autorizó SAL-1; su posterior «Adelante» autorizó SAL-2, ya entregada. SAL-3…5 siguen pendientes; no iniciarlas sin cerrar la fase anterior y respetar la autorización vigente. G2 y A1–A5 siguen cerradas funcionalmente. El propósito es mejorar el paisaje alrededor de sus caminos conservados.

## 1. Decisión de diseño

Se distinguen cuatro salidas terrestres y la barca existente:

| Nº de estas imágenes | ID estable | Carácter que debe percibirse |
|---|---|---|
| 1 | `pleamar-high` | Senda alta por el acantilado, con mar hacia fuera y roca/matorral hacia la isla. |
| 2 | `pleamar-low` | Senda baja por calas y afloramientos húmedos, ligada a bajamar. |
| 3 | `observatory-inland` | Interior volcánico accidentado con bosquetes abiertos y pérdida progresiva de la vista del mar. |
| 4 | `observatory-coast` | Ramal de cornisa costera, distinguible del interior en la bifurcación compartida. |
| Barca | `travel-pecio-boat` y puertos actuales | Embarcadero a la derecha. Mantener embarcación, carga y opciones marítimas existentes. |

Los números son referencias gráficas de esta propuesta. T03 usaba otra numeración para las dos rutas de Pleamar. **Identificar siempre por el ID estable, superficie y casilla; no renombrar IDs, puertos o guardados por los números de un dibujo.**

La isla continúa detrás del claustro y por sus flancos. Se conserva el mar frontal. No se modela toda la isla regional ni se convierte el Retiro en otra isla pequeña separada de ella.

## 2. Qué existe y qué falta

- Ya existen cuatro extremos terrestres transitables, el acceso común y la bifurcación del Observatorio, las conexiones manuales y el regreso. No crear otra red de viajes.
- La última captura diurna entregada muestra traseras amplias de roca, remates rectos de caminos/escaleras y árboles aislados que no bastan para expresar continuidad terrestre.
- La mejora pendiente es de **volumen y lectura del paisaje**: sostener visualmente los caminos existentes con laderas y cornisas; enlazar sus fondos; situar vegetación sobre terreno; hacer que cada extremo parezca continuar detrás de un accidente natural.
- Los giros geométricos del camino conservan sus casillas. Se puede redondear la lectura de bordes y taludes alrededor; no desplazar o suavizar el eje navegable para que coincida con la ilustración.

## 3. Fuentes y límites de las imágenes

- CANON: PDF aportado, mapa regional p.5; Pleamar p.17; Observatorio p.29; rutas marítimas pp.17/23/29. Pleamar terrestre admite acantilados o calas con bajamar. Observatorio terrestre admite interior rocoso o costa.
- VTT_AMBIENCE: bosquetes, especies concretas de vegetación, agrupación de rocas, curvas de ocultación, relieve escénico cercano y mantenimiento de los senderos. No declarar un bosque denso continuo como dato del libro.
- Base visual: `output/retreat-finish-a5-20261024/evidence/a5-after-overview-t25-y0-full.jpg`.
- Base métrica: `retreat-terrain-v2.json`, `retreat-island-navigation.json` y `retreat-zones/global-layout.json` de la campaña pública.
- `prototipo-visual.png` es una edición conceptual con image_gen integrada. Sirve para comparar carácter, composición y continuidad; no sirve para medir ni autorizar cambios de edificios, muebles, arcos o posiciones.
- T05/T06 usan casillas y cotas actuales. El color de suelo/bosquetes y la silueta del alzado son reservas de diseño. No son un levantamiento de la costa GLB ni certifican una envolvente libre de colisiones.
- Línea continua: navegación actual. Línea discontinua: continuación visual más allá del ancla, **sin nuevas casillas**. No sustituir el dato continuo por el trazo generado de la ilustración.
- X crece hacia la izquierda y Z hacia el fondo frontal en estas proyecciones locales. No confundirlos con el norte regional ni reflejar el mapa para alinearlos.

## 4. Datos fijados antes de modelar

Escala 1,5 m/casilla. Dominio112×80. Navegación actual:1142 casillas,13 superficies y18 conexiones. Se conserva todo su contenido, no solo esos recuentos. Las cotas siguientes son la media de las esquinas de casilla; las distancias son las del eje local, no kilómetros de viaje regional.

| Ruta | Superficie | Ancla col,row | X / Z local | Y final | Eje local | Inicio / máximo |
|---|---|---|---|---:|---:|---|
| Pleamar alta | `island-pleamar-high` | 8,29 | 12,75 /44,25 m | +21,25 m | 58,5 m | +26,648 /+35,50 m |
| Pleamar baja | `island-pleamar-low` | 8,61 | 12,75 /92,25 m | +0,569 m | 28,5 m | +0,25 /+0,569 m |
| Observatorio interior | `island-observatory` | 80,10 | 120,75 /15,75 m | +37,00 m | 61,5 m | +18,525 /+37,00 m |
| Observatorio costa | `island-observatory` | 106,17 | 159,75 /26,25 m | +32,70 m | 42,0 m | +18,525 /+32,70 m |
| Bifurcación común | `island-observatory` | 96,22 | 144,75 /33,75 m | +29,90 m | Compartido | No es otro portal. |

**Pleamar alta no es una plataforma horizontal a21,25 m:** primero sube hasta35,50 m y después desciende. Mantener ese perfil y comprobar cada enlace. Los perfiles T06 conservan escala H=V, sin exageración vertical oculta. No deducir contrahuellas ni pendientes de una interpolación del dibujo: comprobar la malla y el movimiento reales.

## 5. Prohibiciones y reservas físicas

1. No mover o reconstruir arquitectura, habitaciones, seis celdas, mobiliario, puertas, estatuas, columnas, cubiertas, PNJ ni anclas.
2. No ampliar otra vez A2/A5 ni comedor/biblioteca. Conservar el embarcadero a la derecha y la orientación aceptada.
3. Mantener el aire/mar bajo el voladizo del templo; los arcos siguen legibles. El alzado no autoriza rellenar el volumen bajo A5.
4. Mantener libre la vertical del palé/caja entre0 y15 m, mecanismo, puerta y lámina de agua de A2. No crear un ascensor de personajes.
5. Las piezas nuevas de paisaje serán decorativas y previsibles; no inventar suelo transitable ni obstáculos por apariencia.
6. Reservar el volumen corporal actual de los caminos: verificaciones con radio0,30 m y altura conservadora2,05 m, más apoyos continuos. Ningún árbol/roca decorativo invade esa reserva.
7. No introducir portales luminosos, plataformas de salida circulares, marcadores nuevos o botones DM para resolver el paisaje.
8. No extender el suelo jugable después del ancla en estas fases. Si el usuario pide caminar más allá, documentar un alcance de navegación aditiva o escena de enlace y validarlo por separado. No ocultarlo dentro de una entrega visual.
9. No alterar dados, marea, tiempo, descanso, encuentros o resultados narrativos. No transición automática por caminar cerca de la salida.

## 6. Integración técnica prevista

Propietario de escena: `retreat-refinement.ts` dentro de `retreat-global-visuals.ts`. Reutilizar la importación aditiva de GLB, materiales, sombras, actualización/ocultación y liberación existentes. No crear otro renderer, escena paralela, cámara, navegación o sistema de viaje.

Al construir SAL, registrar cada módulo por nombre estable y fase. Si se necesita un manifiesto de paisaje, será un pequeño catálogo decorativo (`retreat-departure-landscape.json`) cargado por el mismo propietario y una rutina de importación compartida; no copiar otro ciclo de carga completo. No reinterpretar los valores históricos de `availableStage`/`authoredStage` de G2 o A1–A5. La forma exacta del registro se confirma contra el código vigente antes de añadirlo.

Fuentes nuevas en carpeta propia del trabajo SAL, no reexportar los Blender/GLB protegidos. Nombres propuestos: `retreat_departure_sal1_runtime.glb` a`sal4`, con objetos `SAL1_*`…`SAL4_*`. Separar fondo permanente de rocas/copas próximas sujetas a O1. Las etiquetas de fondo permanente se usan solo donde jamás deban tapar al personaje.

Reutilizar recursos basálticos y vegetación existentes. No añadir luces, mapas de sombra o un material por roca. Registrar triángulos, primitivas, materiales e imágenes por fase. La optimización y certificación de FPS/memoria permanecen en Q1; no dedicar SAL a baterías prolongadas de rendimiento.

## 7. Fichas y orden de ejecución

### SAL-0 — Replanteo y prototipos

**Estado:** entrega documental aceptada conceptualmente por el usuario el25/10. Referencias aprobadas en RETREAT_VISUAL_REFERENCES_20261025.md. Su imagen no sustituye las coordenadas ni el contenido protegido.

1. Identificar las cuatro rutas por ID, ancla y superficie.
2. Congelar como referencias los datos actuales y la última captura diurna. Separar exactitud métrica de interpretación artística.
3. Entregar imagen visual, planta/alzado y cuatro perfiles, con leyendas de actual/propuesto.
4. Comprobar perfiles contra T04 publicado y verificar que producción permanece intacta.
5. Registrar reservas A2/A5, cámara vigente y dependencias en el maestro y relevo.

**Entregables:** `output/retreat-departure-prototypes-20261025/`, este documento y roadmap actualizado. **Cierre:** propuesta comprensible y revisada; no confundir generación de imágenes con construcción.

### SAL-1 — Cornisa de Pleamar alta y respaldo terrestre próximo

**Construida y validada el25/10:** [informe](../evidence/RETREAT_SAL1_20261025.md), [142 comparativas](../../output/retreat-sal1-20261025/index.html). El usuario revisa esta entrega antes deSAL-2. Se conserva la ruta completa y el perfil; la continuidad detrás del ancla es escenografía. GLB/Blender propios,15 primitivas,14805 triángulos,0 texturas/luces nuevas. Módulo disponible en la entrada habitualDM3000. SAL-5 mantendrá la auditoría e integración global de las cuatro salidas; publicar esta entrega no cierraSAL-5.

**Dependencia:** revisión SAL-0 y base G2/A1–A5 conservada. **Límite:** entorno de `island-pleamar-high`, desde su enlace actual hasta8,29; no entrar o reformar A5.

1. Capturar antes por segmentos: conexión junto al templo, ascenso, cumbre35,50 m, descenso y ancla21,25 m.
2. Dibujar en Blender la reserva corporal del eje real y el hueco bajo A5 como geometrías de control no exportables.
3. Crear hombros de basalto y taludes que sostengan visualmente las escaleras; romper juntas/planos rectos solo con capas nuevas fuera de la reserva. No aplanar el recorrido.
4. En el remate, disponer un espolón y continuidad de sendero visible detrás de él. Mantener la última casilla y su interacción accesibles, también al volver.
5. Integrar roca/matorral bajo; mar visible hacia fuera y masa terrestre hacia dentro. El matorral no debe ocultar el piso desde5°.
6. Exportar módulo, validar GLB/ejes, reimportar y muestrear cuerpos, apoyos y arcos. Revisar los25 encuadres y tres tallas.
7. Recorrer ida/vuelta y solicitar/cancelar viaje con la cola DM existente. Entregar antes/después y archivos.

**Aceptación:** cornisa legible que continúa en la isla, perfil exacto y templo/voladizo intactos. Cero nuevas superficies, obstáculos lógicos o interactivos.

### SAL-2 — Sendero interior del Observatorio y bosquetes

**Cierre verificable del25/10:** [informe](../evidence/RETREAT_SAL2_20261025.md), [147 comparativas](../../output/retreat-sal2-20261025/index.html), [resultado consolidado](../../output/retreat-sal2-20261025/checks/sal2-verification.json). Publicada enDM/proyector3000 y guardado real preservado.99 pruebas/10 archivos,41 vistas funcionales,3 retornos,594660 muestras y12242 pasos. Navegación1142/13/18, arquitectura y seis celdas/mobiliario intactos. Revisión conceptual pendiente; no iniciarSAL-3 automáticamente.

Construidos hombros volcánicos y continuidad visual, tres pinos originales e hito interior apoyados y once pinos reutilizados en claros pequeños. Catorce raíces verificadas; ningún collider/interactivo nuevo. Cinco materiales nativos; colores de vértice para transición terrosa/herbácea sin imágenes nuevas. No se necesitó crear familias vegetales adicionales: pinos, matorral y hierbas actuales cubren la lectura buscada. SAL-1 conserva suGLB original. E1 debe reutilizar estos bosquetes, no duplicarlos. Coste bruto:1002768 bytes/13928 triángulos únicos/13 primitivas; mallas+34, materiales/texturas/luces sin aumento. Optimización yFPS/VRAM enQ1.

**Dependencia:** SAL-1 sin regresiones. **Límite:** acceso común existente y rama a80,10/+37 m. Se conserva la bifurcación96,22/+29,90 m.

1. Auditar suelo real bajo los árboles actuales y la llegada visual desde A2. No dar por válido un árbol por verse desde una sola cámara.
2. Encajar el ascenso en lomas y rellanos volcánicos nuevos alrededor del eje conservado. Mantener libre A2 y su carga vertical.
3. Reutilizar dos o tres familias vegetales actuales: agrupaciones pequeñas sobre suelo, claros pedregosos, alturas variadas y separación del camino. No bosque denso obligatorio.
4. La rama interior pierde progresivamente el mar y el Retiro detrás de roca/copas; desde la cornisa vecina aún se distingue que es otra ruta.
5. Resolver el final junto al ancla con continuidad escénica entre dos masas naturales; no troncos/puertas cerrando el sendero.
6. Validar apoyo, oclusión de copas, lectura de bifurcación, grupo de tres y retorno. Sin nuevas colisiones vegetales sobre los pasos.
7. Entregar módulo y comparativas. Registrar qué vegetación específica de esta ruta queda hecha para que E1 no la duplique.

**Aceptación:** entrada al interior reconocible, terreno difícil rocoso coherente, árboles apoyados y anclas/puertos intactos.

### SAL-3 — Cornisa costera del Observatorio

**Dependencia:** SAL-2. **Límite:** rama actual entre bifurcación común y106,17/+32,70 m. No duplicar el tramo de subida compartido.

**Pendiente conocido para su auditoría inicial:** apoyo del hito costero en `G2_Wayfinding_Cairns_3`. SAL-2 corrigió únicamente las piedras interiores, conservando las costeras vértice por vértice. Mantener la corrección interior y evitar trasladar toda la malla combinada.

1. Comparar ambos ramales en la misma vista desde la bifurcación. Registrar qué lado ofrece vista al mar en las cámaras locales.
2. Crear continuidad lateral del acantilado y una cornisa apoyada visualmente bajo el eje existente, con rocas de escala variada fuera del paso.
3. Usar vegetación baja y aberturas al horizonte; preservar una diferencia clara con los bosquetes de SAL-2.
4. Hacer desaparecer el sendero tras una curva del relieve en su ancla actual. Continuidad visual sin nueva casilla o teletransporte automático.
5. Revisar que el fondo nuevo no rellene A2, cierre la bahía, invada agua/carga ni tape los personajes al orbitar.
6. Caminar salida/regreso y verificar opción costera con los mismos puertos actuales. Entregar comparativas desde bifurcación, cornisa y remate.

**Aceptación:** elección interior/costa comprensible sin nuevos letreros; ninguna duplicación de suelo, acceso o viaje.

### SAL-4 — Calas y senda baja de Pleamar

**Dependencia:** SAL-3; conservar SAL-1. **Límite:** ruta baja publicada hasta8,61/+0,569 m; embarcadero y navegación marítima intactos.

1. Auditar el sendero desde la costa y su relación con la barca. No cambiar el puerto o el desembarco para acercarlos al nuevo paisaje.
2. Encajar el camino bajo en pie de acantilado: afloramientos, pequeñas calas y roca húmeda fuera del eje. Mostrar que continúa por la costa bajo la ruta alta.
3. Mantener suelo seco y colisiones actuales en el estado de revisión. El aspecto húmedo no altera la marea o disponibilidad lógica.
4. Resolver la continuidad visual detrás de rocas costeras, manteniendo libre el ancla de interacción y su regreso.
5. Revisar mar/espuma solo en contactos apropiados y con los sistemas ya disponibles; el ajuste global de agua/luz sigue en L1.
6. Probar ruta baja, ambas rutas de Pleamar y barca con cuadrícula visible/oculta. Marea y sucesos siguen adjudicados por DM.

**Aceptación:** calas reconocibles, puerto libre, agua coherente y navegación idéntica. No inundar automáticamente un camino validado ni imponer una prueba nueva.

### SAL-5 — Integración de salidas, publicación y cierre

**Dependencia:** SAL-1…4 sin regresiones importantes.

1. Revisar el conjunto y los cuatro remates con cámaras5/10/15/20/25°, giros−30/−15/0/15/30°, cerca/medio/lejos y límite C2 vigente(≤16 m de alto/≤30 m de ancho para jugador).
2. Validar continuidad de tierra hacia el fondo y por flancos; mar frontal, aire bajo A5 y cargaA2 libres. Evitar un muro continuo de vegetación que sustituya al muro de roca.
3. Comparar por contenido las1142 casillas,13 superficies,18 conexiones, obstáculos, puertas, puertos y anclas. Comparar fuentes y modelos originales protegidos y el guardado.
4. Recorrer con el movimiento autoritativo y desde cliente los cuatro ramales y regresos. Probar paredes/bordes, puertas, palé, grupo de tres, cuadrícula, oclusión y combate con inclinación manual conservada.
5. Comprobar solicitudes manuales/cancelación/confirmación, parada opcional y regreso en copia aislada. CuevasB/ObservatorioD siguen preparados si sus mapas finales siguen ausentes.
6. Repetir entradas/salidas con liberación real de escenas y tareas/endFrame antes de contar recursos. No tomar callbacks diferidos del ensayo por una fuga sin comprobarlos.
7. Preparar candidata aislada; cierre/activación seguros; verificar entrada habitual DM 3000, jugador/proyector y preservación semántica de guardado, sin mover PJ reales para fotos.
8. Entregar informe por fase y del lote, capturas comparables, inventario agregado y pendientes. Registrar coste bruto, sin certificar FPS o dedicar optimización antes deQ1.

**Aceptación:** salidas legibles y utilizables, mapa integrado en su isla, base intacta y pruebas reales. La próxima ficha será M1; no comenzar más fases automáticamente.

## 8. Orden global actualizado

Base cerrada R0–G2.5 → A1/A3/A4/A2/A5 cerradas → **SAL-0/SAL-1 aceptadas → SAL-2 entregada a revisión → SAL-3 → SAL-4 → SAL-5 → M1 → E1 → L1 → Q1**.

- M1 afina piedra, pavimento y materiales después de cerrar los volúmenes de las salidas.
- E1 viste el resto del entorno y conecta sus planos de vegetación; reutiliza lo ya colocado en SAL-2, sin volver a diseñar los caminos.
- L1 afina luz, costa y atmósfera sobre el conjunto aceptado.
- Q1 concentra la optimización, las mediciones prolongadas y la auditoría final.

## 9. Entregas y trazabilidad

Imagen visual, lámina combinada y T05/T06 separadas(PNG/SVG) en `output/retreat-departure-prototypes-20261025/`. Perfiles/cotas/IDs en`technical-data.json`; hashes y comprobación en`checks/`. Prompt exacto de image_gen en`imagegen-prompt.md`.

Cada SAL construida deberá tener su propia carpeta antes/después/checks/informe y actualización del maestro. No ejecutar de nuevo los baselines de G2 o A1–A5 sobre este estado. Respetar cambios simultáneos ajenos: en particular la rama `turnOnly` revisada de`engine/server/game.ts`, sin restaurarla por una referencia histórica.

## 10. Paréntesis Q0 autorizado y cerrado —25/10/2026

[Informe de primera pasada](../evidence/RETREAT_QUICK_OPT_20261025.md) · [Comparativas](../../output/retreat-quick-opt-20261025/index.html). Se descarga geometría sustituida, reutilizan buffers y búsquedas, y pausa espuma fuera de todas las cámaras.104 pruebas/35 pares/3 regresos; DM/proyector3000 y guardado preservados. Sin bajar calidad, luces o sombras. Q1 permanece al final; esta pasada no resuelve toda la oclusión ni el streaming.

La referencia aprobada tiene más presencia de vegetación que los14 pinos deSAL-2. Revisar su lectura y el peso visual de la montaña antes de cerrar el concepto y pasar aSAL-3; no presentar el bosque completo como oculto dentro de la roca. No se añadieron árboles enQ0. Ampliación de playa del otro chat conservada, sin atribuirla a esta fase.


## 11. Ejecución autorizada del26/10 — naturalización

La petición actual autoriza continuar SAL-2R/3/4/5, secuencialmente. SAL-2R comprobada en copia aislada y entregada: 54 pinos adicionales agrupados con claros, terreno de tierra/suelo vegetal sobre la misma roca, afloramientos y copia visual de los peldaños con superficie exacta. 145 pares y597400 muestras. SAL-3 debe llevar el mar junto al ramal costero mediante recorte exclusivo de fondo decorativo, manteniendo su eje/ancla. Las notas antiguas de «no iniciar automáticamente» ya no restringen este lote explícitamente autorizado. Publicación conjunta al cerrarSAL-5. Estado activo en prototypes/retreat-sal-natural-20261026/STATE.md.


## 12. Cierre publicado del26/10

Lote SAL-2R/3/4/5 completado técnicamente,553 pares,50 vistas funcionales y3 regresos estables.102 pruebas,560 inputs compilados y51 GLB coincidentes;48 originales protegidos.54 pinos adicionales reutilizados, costa abierta, hito costero apoyado y orilla seca trabajada. Estado vigente en prototypes/retreat-sal-natural-20261026/STATE.md; maestro revisión11. La versiónSAL2 del25/10 con14 pinos queda superada por2R; no afirmar que esa primera versión ya completaba el bosque.

El cierre funcional no da por aceptado el acabado conceptual: siguen M1/E1/L1 yQ1, con los paños amplios y ejes rectos heredados documentados. Próxima tarea M1 tras revisión; no avanzar automáticamente. Producción3000, DM/proyector/guardado verificados.
