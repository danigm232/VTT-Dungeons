# Auditoría visual secuencial de Stormwreck · 11 octubre 2026

Regla de alcance: se preservan distribución, dimensiones, accesos, objetos e interacciones. El manual local `OneDrive_1_12-9-2026/Aventura Los Dragones de la Isla de las Tempestades.pdf` es la fuente de canon; los otros cuatro campamentos son `VTT_AMBIENCE` según el paquete actual.

## 1. Habitaciones A1 · CANON · validado

- **Detectado:** el mar pintado se repetía a escala demasiado pequeña; un mapa normal adicional creaba tramado/muaré y ralentizaba la GPU integrada. La captura automatizada en una pestaña de Chrome oculta también falseaba los FPS.
- **Ejecutado:** se redujo el mosaico del mar de 24 a 12 repeticiones, se elevó el filtrado anisótropo y se retiró solo su mapa normal. La ola sigue siendo una malla deformable con espuma y textura animada. Se corrigió la herramienta de medición para tomar la muestra antes de pausar el render para cada PNG y se añadió encuadre parametrizable para las tres distancias.
- **Canon:** el PDF, p. 10, confirma seis entradas abiertas, plaza alargada, estatua de Astalagan, cuatro celdas con camas y dos con ocho hamacas. Nada de ello se ha modificado.
- **Evidencia:** `output/camps-detail-20261011/before-camp-a1-rooms-arrival-0-outside.png`; después lejano `output/camps-detail-20261011/a1final-camp-a1-rooms-arrival-0-outside.png`, medio `a1medium-camp-a1-rooms-arrival-0-outside.png`, cercano `a1close-camp-a1-rooms-arrival-0-outside.png`. Ronda final: `output/stormwreck-visual-20261011/` contiene 18 exteriores (ocho ángulos de día y de noche, anochecer y amanecer) y seis interiores.
- **Rendimiento:** 18 muestras en visor activo, Intel UHD, 736 × 658: 54,6–58,5 FPS; 111 envíos de dibujo; 139 mallas; 365 253 vértices; 34 texturas. Heap JS observado: 275,9–302,2 MB sin crecimiento monótono. La lectura de Chrome en segundo plano se descartó al comprobar que incluso una escena vacía caía a 1 FPS.
- **Regresión:** comprobación de tipos cliente correcta; 28 pruebas dirigidas de campamentos/terreno/animación y una prueba nueva del agua A1 correctas. La prueba de jugabilidad previa (`output/camps-detail-20261011/playability.json`) cubre 200 pasos, 27 interacciones, colisión y descanso; no se volvió a ejecutar en esta pasada porque el cambio solo afecta al material decorativo.
- **Checklist:** render y materiales completados para el defecto del agua; composición cercana/media/lejana y ocho ángulos comprobados; navegación y objetos preservados; memoria y FPS observados. El resto de refinamientos artísticos A1 conservados de la pasada anterior.
- **Siguiente:** bosque camino a Pleamar (`camp-forest-pleamar`).

## 2. Bosque camino a Pleamar · VTT_AMBIENCE · validado

- **Detectado:** el borde del sendero pisado aún se leía demasiado geométrico respecto del suelo musgoso, sobre todo cerca de la fogata. El bosque, las tres tiendas, sus lechos, el arroyo y la navegación ya estaban presentes y se han mantenido.
- **Ejecutado:** se amplió la franja de transparencia de la malla de tierra existente desde el borde hasta dos subdivisiones interiores. No se movió ningún vértice, casilla, tienda, roca, árbol ni interacción. La transición tierra-musgo es más suave vista de cerca y a media distancia.
- **Evidencia:** antes `output/camps-detail-20261011/before-camp-forest-pleamar-arrival-0-outside.png`; después `output/stormwreck-visual-20261011/after-camp-forest-pleamar-arrival-0-outside.png`, `forestmedium-camp-forest-pleamar-arrival-0-outside.png` y `forestclose-camp-forest-pleamar-arrival-0-outside.png`. Se capturaron 18 vistas exteriores y seis enfoques interiores.
- **Rendimiento:** 18 muestras, 736 × 658 en Intel UHD: 59,5–60,2 FPS; 140 envíos de dibujo; 198 mallas; 119 567 vértices; 34 texturas. Heap JS observado: 118,6–124,4 MB, sin crecimiento sostenido.
- **Regresión:** prueba del sendero ampliada para exigir alfa intermedia; cinco pruebas del kit de detalle y comprobación de tipos cliente correctas. La prueba de jugabilidad previa cubre 118 pasos, 23 interacciones y colisión; esta pasada no alteró la lógica.
- **Checklist:** exterior cercano/medio/lejano, ocho ángulos, noche/amanecer/anochecer e interiores comprobados; el trazado y los elementos interactivos permanecen. Mejora focalizada del acabado del camino completada.
- **Siguiente:** playa del pecio (`camp-wreck-beach`).

## 3. Playa del pecio · VTT_AMBIENCE · validada

- **Detectado:** el mar diurno tenía un reflejo cian demasiado fuerte y una trama de microrelieve excesiva a distancia. Las tres tiendas, fogata, barca, madera a la deriva, vegetación costera y barrera de rocas se conservaron.
- **Ejecutado:** solo para esta playa, se moderó el color especular del agua y se redujo la frecuencia de repetición de su mapa normal de 32 a 12. La malla animada, las olas, la espuma, la línea de costa, las colisiones y el resto de materiales no cambiaron.
- **Evidencia:** antes de esta corrección `output/stormwreck-visual-20261011/beachbaseline-camp-wreck-beach-arrival-0-outside.png`; después `after-camp-wreck-beach-arrival-0-outside.png` (lejos), `beachmedium-camp-wreck-beach-arrival-0-outside.png` (medio) y `beachclose-camp-wreck-beach-arrival-0-outside.png` (cerca). Se capturaron 18 vistas exteriores —ocho ángulos de día y noche más anochecer y amanecer— y seis interiores de tiendas y lechos.
- **Rendimiento:** 18 muestras en visor activo a 735 × 656, Intel UHD: 56,5–57,5 FPS; 118 envíos de dibujo; 153 mallas; 83 476 vértices; 31 texturas. Heap JS observado: 70,9–100,4 MB, sin tendencia creciente sostenida.
- **Regresión:** comprobación de tipos cliente y nueva prueba de mar correctas. La prueba de jugabilidad previa cubre 117 pasos, 24 interacciones, colisión y descanso; no se repitió porque la corrección se limita al material decorativo del mar.
- **Checklist:** material acuático, costa y composición de cerca/media/lejos comprobados; noche e interiores también. No se detectaron objetos desplazados o flotantes en los ángulos examinados.
- **Siguiente:** acantilados del Observatorio (`camp-cliffs-observatory`).

## 4. Acantilados del Observatorio · VTT_AMBIENCE · validado

- **Detectado:** el mar que rodea la meseta presentaba un brillo y una frecuencia de relieve demasiado altos desde lejos, como en la playa. La piedra, la fogata, las tres tiendas, los cristales y la aurora nocturna se mantienen en sus sitios.
- **Ejecutado:** se aplicó al agua del acantilado el reflejo moderado y la repetición de relieve 12 en lugar de 32. No se alteraron altura, contorno, navegación ni decoración de la meseta.
- **Evidencia:** referencia anterior `output/stormwreck-visual-20261011/cliffbaseline-camp-cliffs-observatory-arrival-0-outside.png`; después `after-camp-cliffs-observatory-arrival-0-outside.png` (lejos), `cliffmedium-camp-cliffs-observatory-arrival-0-outside.png` (medio) y `cliffclose-camp-cliffs-observatory-arrival-0-outside.png` (cerca). Ronda completa de 18 exteriores y seis interiores.
- **Rendimiento:** 18 muestras visibles a 735 × 656, Intel UHD: 56,5–57,5 FPS; 118 envíos de dibujo; 159 mallas; 83 489 vértices; 32 texturas. Heap JS: 69,5–72,9 MB, sin tendencia ascendente sostenida.
- **Regresión:** comprobación de tipos cliente y dos pruebas del mar correctas. La prueba de jugabilidad previa cubre 133 pasos, 23 interacciones, colisión y descanso; no se repitió porque aquí solo cambió el material decorativo.
- **Checklist:** vista cercana, media y lejana; ocho ángulos de día/noche, transición de fases e interiores comprobados. No se detectaron nuevos objetos flotantes ni roturas de malla en las vistas revisadas.
- **Siguiente:** refugio costero de Pleamar (`camp-coastal-refuge`).

## 5. Refugio costero de Pleamar · VTT_AMBIENCE · parcial

- **Detectado:** el reflejo del mar exterior era excesivo a distancia, como en los otros campamentos costeros. Las charcas poco profundas del interior se leen demasiado oscuras y necesitan una corrección específica de superficie, no solo de color del material. La carga inicial produjo FPS irregulares en la primera ronda, por lo que se repitió la medición con recursos calientes.
- **Ejecutado:** se moderaron el color especular y la repetición del relieve del **mar exterior** (32 → 12). Se ensayó dar luz propia a las charcas, pero no mejoró su lectura en la captura media; se retiró esa modificación. Las tres tiendas, fogata, charcas, rocas, vegetación, casillas y accesos permanecen.
- **Evidencia:** antes `output/stormwreck-visual-20261011/refugbaseline-camp-coastal-refuge-arrival-0-outside.png`; después `after-camp-coastal-refuge-arrival-0-outside.png` (lejos), `refugfinalmedium-camp-coastal-refuge-arrival-0-outside.png` (medio) y `refugfinalclose-camp-coastal-refuge-arrival-0-outside.png` (cerca). Ronda final de 18 exteriores y seis interiores.
- **Rendimiento:** primera ronda en carga fría, variable (17–61 FPS), descartada como prueba de estabilidad; ronda final del código conservado, 18 vistas a 735 × 656 en Intel UHD: 58,5–61,3 FPS, 128 envíos de dibujo, 159 mallas, 114 651 vértices y 32 texturas. Heap JS observado: 58,7–83,9 MB, sin crecimiento sostenido.
- **Regresión:** comprobación de tipos cliente y tres pruebas del mar correctas. La prueba de jugabilidad previa cubre 137 pasos, 23 interacciones, colisión y descanso; no se repitió porque el único cambio conservado es del material decorativo exterior.
- **Checklist:** cerca/media/lejos, ocho ángulos de día/noche, otras fases e interiores revisados. Mejoría del mar exterior validada; **pendiente:** resolver por qué las charcas se ven casi negras y volver a verificar sus ondas y material sin tocar casillas ni navegación. No se da por completada la mejora visual integral de este mapa.
- **Siguiente:** cerrar las charcas del refugio antes de avanzar al Pecio Maldito / Rosa de los Vientos, de acuerdo con el orden solicitado.

## Cierre de esta tanda

- Cinco campamentos recorridos en el orden del proyecto: cuatro validados en la mejora focalizada; el quinto conserva una incidencia visual localizada en sus charcas interiores. La carpeta de evidencias contiene 90 muestras exteriores finales y 30 interiores, además de los encuadres cercano/medio/lejano y referencias previas indicadas arriba.
- Comprobación de tipos cliente correcta y 27 pruebas dirigidas correctas en siete suites: agua A1, mar de campamentos, detalle, calidad de render, animaciones, actividades y terreno Babylon. No se han ejecutado nuevas pruebas de jugabilidad completas en esta tanda; se citan resultados previos y se distingue esa limitación.
- El Pecio Maldito / Rosa de los Vientos **no se ha auditado ni modificado en esta tanda**. El requisito secuencial aconseja cerrar primero las charcas del refugio; no se marca ningún check del pecio como realizado.
