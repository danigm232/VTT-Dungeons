# Retiro del Dragón · tercer pase de correcciones · 29/10/2026

**Publicado en3000.** Quedan resueltos los quince puntos de este pase y aplicada una optimización conservadora. Base: revisión18, sin reconstruir el mapa. Candidata final: `runtime/prepared-retreat-corrections3-20261029c`.

## Correcciones por bloque

| Puntos | Cambio realizado | Conservación y clasificación |
|---|---|---|
| 1 | Los dientes procedían de `R2_Pleamar_Low_Soil_Shoulder`, identificado con picks del render real. Una cinta de contorno continuo sustituye la selección de triángulos completos. El bosquete recibe suelo con soporte rocoso. | Originales intactos en disco; VTT_AMBIENCE. No es una textura plana que sustituya terreno3D. |
| 2 | Pequeño muelle de madera, atraque separado de la roca, embarque por el muelle, pose sentada e inclinación corporal existentes y remos3D animados. Flotación y amarre usan las mismas olas del mar nativo. | Reutiliza `travel-pecio-boat` y el recorrido de salida del servidor. Solo comienza al confirmar el DM; vuelve a validar la llegada de cada viajero. No hay un atlas nuevo de manos remando. |
| 3 | Cuerdas y postes siguen los laterales de peldaños medidos; se evitan tramos duplicados. Jardineras adicionales junto a las escaleras bajas. | Escaleras y alturas conservadas; adornos fuera del corredor. VTT_AMBIENCE. |
| 4 | Los dos bancos comunitarios se separan y se desplazan hacia atrás; los objetos que llevan encima y las sombras los acompañan. La navegación reserva sus huellas nuevas y recupera el paso anterior. | No se modifica ninguna de las seis celdas. El fuego y los elementos cotidianos se conservan. |
| 5 | Catorce jardineras adicionales en la cornisa A1 con aromáticas, floración discreta y ramillas colgantes. | Referencias RHS declaradas en la ficha de diseño; ambiente mediterráneo solicitado, no botánica atribuida al PDF. |
| 6 | Canal de roca despejado bajo el cabrestante, cable de longitud variable, palé/carga y tambor/manivela animados. La cámara sigue la carga, se orienta temporalmente hacia el hueco abierto y después recupera el giro seleccionado. | Una opción contextual de subir/bajar; pose persistente. No se añaden botones a la barra ni se resuelven pruebas narrativas. Se retira de la vista la antigua lámina cian que cubría el agua animada. |
| 7 | Recalculados puntos de parada y trayectorias delante de A2, con radio corporal de0,30m. | Mismo acceso, ID y estado de puerta. |
| 8,13 | Claro elevado uniformemente a+18m, pradera y carril de tierra, árboles recolocados dentro del claro cuando chocaban con la roca. Normales de peldaños corregidas bajo la raíz glTF reflejada. | Dos casillas planas sin altura libre bajo una escalera se retiran; sigue disponible su superficie de escalera. Se conservan seis casillas antiguas bajo tramos con altura libre suficiente. |
| 9 | A3 se extiende deX129 aX131, cerrando su vacío lateral. | Cocina pequeña, pasillo, mesa larga, dos bancos y una silla conservados. Es una ampliación autorizada, no una dimensión literal del canon. |
| 10 | Puertas, revelados y jambas dejan de tapar la sala ocupada. La ocultación contempla también las instancias glTF. Las antorchas de la fachada se ocultan con su paño. | Transformaciones, estado y colisiones de puertas siguen activos. |
| 11 | Pasillo superior de3m ampliado hasta una explanada de7,5m; baranda anterior retirada del centro. Nuevas jardineras, cuerda en el borde, tres bancos y cinco antorchas con luz. | Suelo3D y navegación nuevos; al menos cuatro casillas de ancho en el paso principal. Escala1,5m y conexiones conservadas. |
| 12 | A4 llega aX87 y se une al jardín; los tres estantes occidentales y sus detalles acompañan a la pared. Jardín de ocio con arbolado, pradera, aromáticas y banco. | Mesa, estantes independientes, puerta y funciones conservados. |
| 14 | Dos columnas traseras del templo se trasladan a las esquinas verdaderas; cuatro columnas perimetrales. | Suelo, estatua del anciano, siete canarios, cubierta, arcos, ofrendas y puente conservados. |
| 15 | Copas de hojas con volumen, pinos y olivos de distintas siluetas, sotobosque, césped y flores en grupos.86árboles y31jardineras en el nuevo conjunto. | VTT_AMBIENCE. Troncos como obstáculos simples; las copas no crean barreras de movimiento. |

La textura de pradera se generó con **imagegen integrado** para un material de suelo3D. [Activo](../../campaigns/stormwreck-isle/public/art/retreat-refinement/r3-coastal-meadow-albedo-v1.png) y [prompt/procedencia](../../prototypes/retreat-corrections3-20261028/meadow-texture-provenance.json). No se ha sustituido la geometría del mapa por imágenes.

## Fallos detectados durante la validación

- Una transición nueva del jardín atravesaba lateralmente la pared de A4. Corregida mediante barrido corporal; la biblioteca cerrada vuelve a exigir su acceso.
- La primera corrección del acantilado no incluía el respaldo `V5_Eastern_Cliff_Continuous_Spine`. Se amplió únicamente el canal del cabrestante. Una lámina de agua provisional tapaba el oleaje real: se conserva su original y se muestra la bahía animada existente.
- La jamba repetida de A4 era `InstancedMesh`. El corte visual ahora cubre ambas clases de malla; no se elimina la puerta.
- La pared compartida del comedor seguía ocultando parte de la cocina. El corte usa ahora el foco de la cocina cuando el personaje está dentro; se comprobaron también sus mesas, hogar y paso al comedor.
- En los primeros árboles de prueba las masas centrales resultaban demasiado facetadas y claras. Se sustituyeron por hojas plegadas con volumen y una paleta más oscura antes de medir.
- El jardín tenía un desajuste de centímetros entre su borde visible y la reserva corporal. Se corrigió la reserva; el embarcadero recibió soporte físico real en el margen nuevo.

## Pruebas y evidencia

QA aislada mediante el renderizador real, sin conexión a la partida ni desplazamiento de personajes reales. Fotografías1280×720,DPR1,125,mediodía; las comparativas repiten cámara, encuadre y foco anteriores. La hora y el clima de la partida se conservan.

La candidata c se compila desde una copia inmutable de las fuentes para conservar los cambios simultáneos de otro chat. Su manifiesto registra 2.685 entradas. Además de la batería de 175 pruebas, se aprobaron 22 comprobaciones de compatibilidad en cinco archivos sobre esa copia: cámara del pecio, interiores, nido, navegación DM y límites de zoom del Retiro. Hay solapamiento entre baterías; no se suman como si fueran 197 pruebas distintas. Las fuentes nuevas de la copia siguen en el proyecto.

Los resultados consolidados quedan en `prototypes/retreat-corrections3-20261028/checks/` y `output/retreat-corrections3-20261028/`. La matriz de675vistas cubre25focos, tres roles, elevaciones5°/15°/25° y giros−30°/0°/+30°. Las108consultas de visibilidad de interiores no encuentran bloqueos opacos sobre el cuerpo. Una matriz automática no equivale a revisar artísticamente cada foto; se inspeccionan además las vistas representativas y las incidencias concretas del usuario.

## Optimización conservadora

Aplicada después de validar las correcciones: agrupación de materiales equivalentes y piezas estáticas, liberación de sustitutos antiguos ya desactivados, menor trabajo repetido de ocultación y suspensión de actualizaciones del bote fuera de cámara. Se conservan todas las caras del conjunto nuevo, imágenes, vegetación, resolución, luces y configuración de sombras. Las originales de autoría permanecen en disco.

El paisaje final pasa de1.008a663mallas con **1.330.769triángulos en ambos estados**. Posiciones, normales, UV, materiales, colores e imágenes se conservan. Árboles y jardineras mantienen sus límites por material para que una pieza visible no fuerce a dibujar partes que quedan fuera del encuadre. Se agrupan segmentos estáticos de barandilla por material y región. El inventario de escena pasa de2.673a2.140nodos; se mantienen262materiales,78texturas y23luces. Las cinco luces adicionales son las antorchas solicitadas y ya estaban presentes antes de optimizar.

El GLB de ejecución ocupa55,11MB frente a54,45MB de autoría por la representación de buffers agrupados. No aplica cuantización ni compresión con pérdida. La liberación de predecesores reduce recursos residentes; no supone haber completado la carga selectiva de todo el mapa.

**Prueba rechazada:** una primera paleta de colores agrupaba todo un árbol y bajaba a296mallas. Aunque reducía llamadas de dibujo, en ángulos bajos obligaba a dibujar copas completas al verse el tronco; algunas vistas perdieron rendimiento. Se probó separar troncos/copas y finalmente se eligieron límites y materiales originales con agrupación estática conservadora. No se publican las candidatas a/b ni se utiliza aquella reducción de mallas como resultado final.

Medición: trece focos finales en primer plano,20segundos por foco y4de calentamiento, sin compilaciones ni verificadores pesados. Como el rendimiento de la versión anterior también varió durante la sesión, se repite la referencia en las cuatro vistas críticas con las cinco fuentes de ejecución congeladas antes de optimizar. La ganancia se atribuye solo a ese contraste próximo; las primeras muestras históricas de trece puntos se conservan como diagnóstico. No es certificación prolongada ni FPS garantizados a cualquier resolución.

## Archivos de implementación

- `campaigns/stormwreck-isle/public/`: `retreat-global-visuals.ts`, `retreat-local-occlusion.ts`, `retreat-refinement.ts`, `retreat-refinement-coast.ts`, `retreat-refinement-materials.ts`, `retreat-visual-revisions.ts`, `retreat-expansion.ts`, `retreat-zone-finishes.ts`, `retreat-stair-presentation.ts`, `retreat-coastal-presentation.ts`, `retreat-quick-opt.ts`, `retreat-runtime.ts`, nuevos `retreat-corrections-navigation.ts`, `retreat-corrections-presentation.ts`, `retreat-r3-navigation.json` y registro `retreat-zones/global-layout.json`.
- `campaigns/camp-rests/public/a1-visuals.ts`: opción de recolocación comunitaria exclusiva del Retiro; no cambia la escena original de las celdas.
- `apps/web/world.ts`, `apps/web/dm.ts`, `engine/client/retreat-boat-departure.ts`, `engine/server/game.ts`, `engine/server/campaign.ts`, `engine/server/retreat-migration.ts`, `engine/shared/protocol.ts`: presentación de salida, pose del cabrestante, acción contextual y migración mínima. Se conservan las mejoras DM del otro chat.
- Once GLB derivados nuevos en `public/art/retreat-modules/`, textura de pradera y fuentes Blender/builders en [la carpeta de trabajo](../../prototypes/retreat-corrections3-20261028/).187GLB anteriores intactos. El listado exacto de cambios figura en [conservación](../../prototypes/retreat-corrections3-20261028/checks/conservation.json).

## Validación consolidada

| Comprobación | Resultado |
|---|---|
| Pruebas funcionales | 175correctas,32archivos; incluye movimiento autoritativo, biblioteca cerrada, tres viajeros, guardado y liberación segura de instancias. |
| Navegación y apoyo real | 1.596casillas,13superficies,2.670bordes y283.860muestras sobre las mallas cargadas;0sin apoyo. |
| Cámaras y oclusión | 675encuadres en25focos/tres roles;108vistas interiores sin bloqueo opaco sobre el cuerpo. |
| Celdas y originales | 71mallas con todos los buffers y matrices exactos;187GLB y25JSON originales exactos. |
| Trabajo ajeno | Cinco archivos nuevos del sistema DM conservados exactamente; pruebas DM aprobadas. |
| Mecánicas | 19capturas/estados de cabrestante y bote, sin errores. El único cruce de rayos hacia el palé es su propia caja de suministros. |
| Compilación | La candidata final c reemplaza a las intermedias a/b. Se verifican los GLB compilados por SHA y las entradas congeladas; QA excluida del producto. |

Las candidatas a/b son intermedias por el corte de cocina y la agrupación demasiado amplia. **No se utilizan como versión final.**

## Publicación y siguiente tarea

Publicada mediante cierre con guardado confirmado, copia privada y activación preparada. DM/jugador/proyector responden200;73GLB publicados coinciden por SHA. El guardado conserva sus11grupos protegidos y pasa a versión5;recolocaciones esperadas:0. No se han movido personajes para probar ni se ha utilizado el selector de escenas. Las posiciones válidas y recursos se conservan. Las mejoras privadas DM del otro chat siguen incluidas.

**Siguiente tarea recomendada:** revisión visual del usuario con la galería y después Q1.4, priorizando biblioteca y room1 con contraste ABBA: medición prolongada, más tamaños de ventana/tiempo/clima, pausas y retornos de cámara, memoria de proceso/GPU y carga selectiva de paquetes antiguos. Este pase no declara streaming completo ni un acabado artístico definitivo. Persisten perfiles ortogonales heredados que pueden refinarse por zonas sin rehacerlas.


## Rendimiento observado y entrega · cierre documental 30/10/2026

En los cuatro focos contrastados, la media ponderada por tiempo pasa de **25.1 a 25.1 FPS**, prácticamente estable. No se acredita una mejora global de FPS. El promedio de las cuatro medianas del tiempo de actualización de Retiro pasa de **9.6 a 7.3 ms**, una reducción del **24.7 %** en ese trabajo concreto; no representa toda la CPU. Biblioteca en el estado final: **19.4 FPS**. La vista room1 pasa de 23,5 a 21,3 FPS en este par de muestras: debe repetirse en orden ABBA en Q1.4 junto a la biblioteca y los percentiles de fotograma. No se oculta esta diferencia ni se presenta como ganancia.

Muestras de 20 s/foco, 1280×720 CSS, render 1440×810, DPR 1,125, Intel UHD del equipo. Son trece focos finales y cuatro referencias próximas de la misma copia de fuentes, sin compilaciones propias concurrentes. Se verificó la presentación del visor durante la toma válida. Una toma previa limitada a un fotograma por segundo al ocultarse el visor está archivada y excluida. No son FPS garantizados en una ventana DM de otro tamaño.

| Foco | Antes FPS | Después FPS | Llamadas de dibujo antes→después |
|---|---:|---:|---:|
|a1|No comparable|27.4|—→176|
|a2|No comparable|36.5|—→105|
|a3|No comparable|29.2|—→242|
|kitchen|No comparable|31.1|—→251|
|a4|No comparable|19.4|—→252|
|a5|No comparable|28.1|—→105|
|grove|24.5|25.3|117→117|
|clearing|25.6|25.6|183→156|
|low-trail|No comparable|26.8|—→92|
|upper-corridor|26.8|28.0|321→321|
|room1|23.5|21.3|156→156|
|room6|No comparable|21.2|—→163|
|observatory-coast|No comparable|35.6|—→72|

Mismas 78 texturas, 23 luces, subdivisiones del mar y tamaño de sombras; sin recortes de resolución o vegetación. El heap observado es una muestra del navegador y no representa toda la memoria de GPU/proceso; no se acredita todavía un ahorro de memoria total. Ver [datos completos de rendimiento](../../prototypes/retreat-corrections3-20261028/checks/performance.json).

[Galería de 57 parejas](../../output/retreat-corrections3-20261028/index.html) · [comprobaciones finales](../../output/retreat-corrections3-20261028/checks/final.json) · [roadmap maestro](../audits/RETREAT_TECHNICAL_ROADMAP_20261023.md).

## Comprobación de acceso · 30/10/2026

La versión publicada vuelve a responder en el puerto 3000. DM: Retiro del Dragón, «Servidor conectado», partida guardada y cero jugadores al terminar la comprobación. Proyector: entrada completada, mapa cargado, indicador de desconexión sin clase `show` y opacidad cero. Jugador: mapa y HUD cargados; el navegador recuperó su identificación previa, sin seleccionar ni mover una ficha, y se desconectó al volver al DM. Ningún error o advertencia en consola durante estas comprobaciones. El guardado vuelve a superar los once grupos protegidos tras visitar los tres roles, con cero recolocaciones.

La copia anterior se conserva en privado. El segundo intento de arranque del 30/10 fue rechazado por el bloqueo del único escritor: se mantuvo el servidor ya publicado, PID 13388. No se sustituyó la candidata c ni se arrancó una segunda mesa.
