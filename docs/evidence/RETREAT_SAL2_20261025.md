# SAL-2 — Sendero interior del Observatorio y bosquetes

Fecha:25/10/2026. **Entrega técnica cerrada y publicada en3000; pendiente de revisión conceptual antes deSAL-3.** [Galería](../../output/retreat-sal2-20261025/index.html). [Roadmap maestro](../audits/RETREAT_TECHNICAL_ROADMAP_20261023.md).

## Alcance

Acceso compartido, bifurcación96,22/+29,90m y rama interior hasta80,10/+37m. El eje local conserva61,5m desde+18,525m. Se mantienen anclas, coordenadas de circulación, alturas y escala1,5m/casilla. La rama costera queda como alternativa abierta y reconocible; la cornisa dePleamar SAL-1 permanece íntegra.

El terreno nuevo sostiene visualmente el camino existente, enlaza pequeñas lomas y deja un corredor claro entre bosquetes abiertos. La continuación visual del extremo se pierde tras una roca. No añade casillas ni mueve el punto de viaje: para continuar se utiliza la misma interacción manual.

## CANON y VTT_AMBIENCE

Referencia comprobada: PDF correcto `OneDrive_1_12-9-2026/Aventura Los Dragones de la Isla de las Tempestades.pdf`, p.29. Describe una vía por terreno rocoso interior y otra bordeando la costa. El trayecto regional interior de5,25km/1h15 no se confunde con estos61,5m de escenografía local. No se automatizan tiempos, pruebas, encuentros ni el resultado de acciones.

VTT_AMBIENCE: ubicación concreta de pinos, bosquetes abiertos, hierbas, afloramientos, coloración tenue del terreno y forma de las lomas. No se presenta un bosque denso como dato obligatorio del libro. Las imágenes SAL-0 aprobadas siguen siendo referencia de carácter; las coordenadas proceden de la navegación actual.

## Auditoría y fallos corregidos

- Los tres pinos G2 existentes flotaban5,53/6,99/9,02m sobre la roca anterior, comprobado reimportando losGLB publicados. Se conserva su geometría, material, escala y posiciónX/Z; solo se corrige su altura para apoyarlos sobre el nuevo terreno. Descensos aplicados:5,53/6,08/7,82m. La diferencia respecto al hueco inicial corresponde al relieve local mejorado.
- El hito interior existente también estaba suspendido. Se trasladan verticalmente sus51vértices, como un único grupo de piedras,5,558m hacia abajo. SusX/Z, UV, índices y formas se conservan. Las piedras del hito costero en el mismoGLB quedan intactas, verificadas por vértice.
- La primera continuación decorativa atravesaba algunos triángulos de la loma. Se recortó sobre los triángulos reales del terreno exportado para mantenerla continua, con2cm de separación visual.
- El relleno local se integra con una presentación derivada de `SAL1_Backland_Presentation`, que queda cargada y desactivada como respaldo. Se conservan los atributos fuera de la intervención y elGLB original permanece idéntico. La carga fallida conserva SAL-1; los contactos se validan antes de modificar árboles o piedras.

## Construcción e integración

Once árboles adicionales reutilizan el pino nativo delG2; se organizan en grupos pequeños con alturas y orientación variadas, separados del paso. Con los tres anteriores quedan14pinos apoyados. La segunda familia vegetal es el sotobosque bajo, con materiales existentes. Se añade un matiz discreto de suelo vegetal, sin texturas nuevas.

El módulo tiene13primitivas y20instancias vinculadas de partes de pino. Las copas y afloramientos usanO1; el talud estructural permanece visible. Su perfil se limita alrededor del recorrido para que tampoco oculte al personaje desde5° y giros±30°. A2, su carga vertical y los interiores A1/A3/A4/A5 no reciben terreno nuevo.

Se amplía el cargador compartido para devolver mallas e instancias, conservando el propietario existente `retreat-refinement.ts`. No se añade otro renderizador, cámara, navegación, interacción o control delDM. Los stagesG2 y acabados anteriores mantienen su significado; el catálogoSAL llega a2.

## Archivos

Adaptados en `campaigns/stormwreck-isle/public/`:

- `retreat-decoration-loader.ts`: importación compartida con instancias y liberación de materiales temporales.
- `retreat-zone-finishes.ts`: adaptación del consumidor al mismo cargador; acabados anteriores conservados.
- `retreat-departure-landscape.ts/.json`: catálogo secuencial, respaldo y cargaSAL-2.

Nuevos:

- `retreat-departure-contacts.ts`: correcciones de altura acotadas a los tres pinos y al hito interior.
- `art/retreat-modules/retreat_departure_sal2_runtime.glb`.
- `engine/client/retreat-departure-groves.test.ts`.
- `prototypes/retreat-departure-sal2-20261025/`: fuenteBlender, `build_scene.py`, controles editoriales no exportables, visor y verificadores propios.
- `artifacts/retreat_departure_sal2.blend`, `sal2-asset.json` y datos de contactos en esa carpeta.
- Este informe, galería, roadmap revisión8, fichaSAL y relevo actualizados.

## Pruebas y conservación

- **99/99 pruebas en10archivos.** Incluyen raíces bajo un padre reflejado, prevalidación sin cambios parciales, conservación del hito costero, materiales/instancias, respaldo deSAL-1 ante fallo, navegación, viajes manuales y guardados.
- **147pares antes/después**, misma cámara, escala, hora y clima: cinco inclinaciones5/10/15/20/25°, cinco giros−30/−15/0/15/30°, cuatro segmentos, cerca/lejos y roles. Incluyen protección deSAL-1, A2, A4, A5 y una celda. Cero rayos nuevos cruzando al personaje a0,75/1,35m.
- **41vistas funcionales**: tres personajes/tallas y rolesDM/jugador/proyector, cuadrícula, móvil390×844 y combate. El jugador conserva≤16m de alto/30m de ancho; el combate mantiene la inclinación manual. Tres salidas/regresos con recursos estables en las métricas verificadas.
- **GLB real decodificado:**594.660 muestras corporales sobre28.591 puntos distintos y1.142centros de casilla; radio0,30m/altura2,05m. Sin invasiones. Los14pinos tienen contacto a−15mm de la superficie, dentro de tolerancia.
- **Movimiento autoritativo:**12.242pasos por42objetivos,746.804muestras y243bordes exteriores rechazados. Incluye ida/vuelta de las zonas y salidas existentes.
- ValidadorGLB:0errores y0advertencias. Los13informativosUVsintextura incrustada son intencionales: las imágenes se comparten desde los materiales nativos.
- **85/89fuentes protegidas idénticas**; las cuatro adaptaciones son los propietarios listados. GLB originales, SAL-1, celdas/muebles, navegación, anclas y puertos intactos. Las1.236mallas previas se cotejaron, permitiendo solo las correcciones de contacto documentadas y bounds de animaciones nativas de llama/oleaje.
- Candidata aislada `runtime/prepared-retreat-sal2-20261025a`, tipos y compilación completos. Activación segura con la versión anterior conservada. El asset servido en3000 coincide con elSHA final `931c7b68995f8ad66c98398cf2eb22f964ff2fc2ce9567528e7f3c070af7ddc5`.
- Ventanas realesDM/proyector renderizadas, servidor conectado, proyector listo y ceroerrores de consola. `Guardado confirmado · copia 10731.`. Los11grupos protegidos del guardado siguen iguales. Noche y clima reales conservados; las fotos diurnas proceden de una copia aislada.

## Coste y límites

Archivo: **1,002,768bytes**, **13,928triángulos únicos**,13primitivas,5materiales existentes por nombre,0imágenes/luces/mapas de sombra nuevos. Reutiliza20instancias para los once pinos adicionales. Recuentos de escena:1295→1329nodos de malla;231materiales,76texturas y18luces en ambos estados. El respaldo anterior queda cargado y desactivado: su coste se revisará enQ1.

No se certificanFPS/VRAM ni se optimiza esta fase. Q1 permanece al final; M1 y L1 afinarán materiales y luz sobre los volúmenes aceptados. Las partes nuevas son decorativas, sin colisiones ni suelos lógicos añadidos. El sendero que supera el ancla es solo continuidad visual.

## Pendientes y siguiente fase

Tras revisión conceptual, **SAL-3: cornisa costera delObservatorio**, desde la bifurcación96,22 hasta106,17/+32,70m. Reutilizar el acceso común y el relieveSAL-2; no duplicar esa subida ni los bosquetes. Conservar A2 y el paso costero. Auditar también el apoyo del hito costero antiguo, que esta fase dejó sin cambios.

SAL-4 calas bajas ySAL-5 integración global siguen después. E1 reutilizará estos bosquetes en lugar de duplicarlos. No iniciar otra fase automáticamente. El trabajo ajeno del pecio se conserva sin atribuirlo aSAL-2; esta entrega no altera su fuente.
