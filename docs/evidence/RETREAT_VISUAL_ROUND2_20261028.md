# Retiro del Dragón · segunda pasada visual · 28/10/2026

## Estado y alcance

**Estado: pasada visual validada y publicada en http://127.0.0.1:3000/dm, candidata `runtime/prepared-retreat-visual-round2-20261028b`.** No se declara terminada la calidad artística del mapa ni se reutilizan cifras históricas de FPS como medida de esta entrega.

El usuario ha pedido volver a revisar cada zona y aplicar mejoras visuales **antes de continuar la optimización**. La base es la entrega [V2–V5](RETREAT_VISUAL_V2_V5_20261027.md). Esta pasada corrige materiales, lectura de mobiliario, perfiles vegetales, uniones del terreno y defectos visibles de textura. No reconstruye el Retiro ni sustituye geometría por imágenes.

Se mantienen la escala de **1,5 m por casilla**, las coordenadas, las seis celdas y su mobiliario, los accesos, las puertas, las colisiones, las superficies de navegación y los puntos de viaje. La aventura oficial, capítulo 1, pp. 6–12, sigue fijando funciones y contenido canónico. La orientación del proyecto y las ampliaciones previamente autorizadas se conservan.

La variante se conecta al importador y a los sistemas existentes. No introduce controles para el DM. Dados, decisiones, pruebas narrativas y confirmación de los viajes continúan siendo manuales.

## Revisión por zonas

### A1 · Camino, plaza y celdas monásticas

**Hallazgo.** Varias superficies rocosas parecían mostrar cintas grises o triángulos estirados. El diagnóstico identifica un problema de UV: al elegir el plano de proyección por la normal de cada vértice, un mismo triángulo curvo podía recibir coordenadas de planos distintos. En `a1:ridge:continuation`, 3.191 triángulos superaban una elongación de 5×; los mismos triángulos con las UV de autoría no presentaban ese defecto.

**Modificación.** La revisión conserva las UV nativas de la roca A1 en lugar de regenerarlas con esa proyección. Se restaura la continuidad de textura sin desplazar vértices, alterar índices, modificar alturas ni inventar rocas nuevas para tapar el fallo.

**Conservación.** La geometría, los colores y las matrices de las celdas permanecen protegidos. La restauración de UV/tangentes de la roca se distingue expresamente de un cambio de geometría. No se permite modificar buffers del mobiliario o de los suelos. Se mantienen las jardineras, los bancos, las velas estables y las barandillas existentes; no se duplican sistemas de oclusión o movimiento.

**CANON:** camino, plaza, estatua y seis celdas del lugar existente. **VTT_AMBIENCE:** corrección de mapeado y acabado superficial. Evidencia: [diagnóstico de UV](../../prototypes/retreat-visual-round2-20261028/checks/a1-uv-discontinuity.json), [script reproducible](../../prototypes/retreat-visual-round2-20261028/diagnose_rock_uv.py), [antes](../../output/retreat-visual-round2-20261028/evidence/a1-probe-before.png) y [después](../../output/retreat-visual-round2-20261028/evidence/a1-probe-after.png).

### A2 · Casa del cabrestante

**Hallazgo.** Suelo, soportes, tambor y piezas de madera compartían un tono demasiado uniforme. El agrupado anterior de materiales colapsaba las diferencias entre tablas, testas y estructuras, dificultando reconocer el mecanismo.

**Modificación.** Se distinguen tres acabados para las maderas importadas: tablones, testa y estructura. Cambian el tono y una pequeña parte de la respuesta de rugosidad, compartiendo el albedo, las normales y el ORM que ya existen. Los elementos estructurales del cabrestante ganan contraste respecto al suelo sin añadir ornamentación.

**Conservación.** Se mantienen edificio, tejado a dos aguas, puerta, mecanismo, plataforma suspendida, amarre de cargas, cotas y recorrido vertical. No se añaden obstáculos ni se automatiza la operación del cabrestante. La geometría de esta zona no se rediseña para justificar el cambio de materiales.

**CANON:** casa, cubierta, cabrestante y palé. **VTT_AMBIENCE:** acabado de madera. Comparativa: [antes](../../output/retreat-visual-round2-20261028/evidence/before-a2-25-30.png) y [después](../../output/retreat-visual-round2-20261028/evidence/after-a2-25-30.png); también se revisa el acceso exterior.

### A3 · Comedor, pasillo y cocina

**Hallazgo.** La carpintería y el relleno de iluminación daban una lectura plana y algo fría. Una sospecha inicial sobre el marco de acceso no se confirmó en las nuevas capturas a 25°/+30°: el brazo del personaje queda libre. No se modifica un acceso que ya funciona.

**Modificación.** Las nuevas variantes de madera separan tablones y testas en mesa, bancos, silla y muebles de cocina. Se ajusta la luz de relleno existente de A3, con posición e intensidad adaptadas a las habitaciones ya ampliadas y un tono cálido más perceptible. Se conserva su alcance por sala; no se crean otras luces o mapas de sombras.

**Conservación.** Una mesa larga, dos bancos y una única silla en la cabecera. Cocina pequeña y ordenada, pasillo corto, utensilios y despensa existentes. No se añade mobiliario a los pasillos, no se estrecha la reserva de circulación y no se sustituye el recorte de paredes y techos.

**CANON:** composición y conexión de los espacios. **VTT_AMBIENCE:** materiales y balance de la luz. Evidencia del comedor: [antes](../../output/retreat-visual-round2-20261028/evidence/before-a3-25-30.png) y [después](../../output/retreat-visual-round2-20261028/evidence/after-a3-25-30.png). Cocina: [antes](../../output/retreat-visual-round2-20261028/evidence/before-kitchen-25-30.png) y [después](../../output/retreat-visual-round2-20261028/evidence/after-kitchen-25-30.png).

### A4 · Biblioteca y acceso ajardinado

**Hallazgo.** V2 ya había variado huecos y alturas, pero todavía predominaban hileras de volúmenes verticales y una carpintería uniforme. La función de biblioteca se reconocía, aunque faltaba variedad de uso cotidiano.

**Modificación.** Un derivado del Blender de V2 coloca **27 pilas bajas y 54 rollos huecos** en huecos distribuidos por los 20 estantes. Se mantienen los libros de pie y los espacios vacíos; la variación ocurre dentro del mobiliario. El acabado de madera diferencia tablas y testas, y se ajusta el relleno cálido existente de A4 para dar más volumen al conjunto.

**Conservación.** Las huellas y alturas de los **20 estantes**, sus marcos y UV permanecen iguales; siguen siendo **tres estanterías independientes**. Mesa de estudio, dos bancos, atriles, lámparas, escritura, puerta de roble y hierro, pared exterior ampliada y acceso conservados. El builder comprueba que los **963 objetos mesh ajenos a los estantes** de la fuente permanecen sin cambios. No se añaden obstáculos ni se redistribuye A4. El jardín occidental previo sigue ocupando la misma parcela; no se convierte en otra habitación.

**CANON:** biblioteca, disposición funcional y puerta. **VTT_AMBIENCE:** composición de libros, rollos, acabados y luz. Fuente y validación: [builder de interiores](../../prototypes/retreat-visual-round2-20261028/build_interiors.py), [informe de modelo](../../prototypes/retreat-visual-round2-20261028/checks/interiors-model.json), [comprobación de materiales](../../prototypes/retreat-visual-round2-20261028/checks/interiors-materials-check.json). Comparativa: [antes](../../output/retreat-visual-round2-20261028/evidence/before-a4-25-30.png) y [después](../../output/retreat-visual-round2-20261028/evidence/after-a4-25-30.png).

### A5 · Templo de Bahamut

**Hallazgo.** El blanco uniforme hacía perder volumen a columnas y escultura. El pedestal conservaba un dibujo de pavimento que podía parecer transparencia. Los fustes mantenían una silueta demasiado lisa para el acabado clásico solicitado.

**Modificación.** Anciano, canarios, columnas y pedestal comparten una piedra cálida menos blanca. Se elimina el dibujo de baldosas del pedestal y se hace más fino el grano de relieve/rugosidad mediante la escala de UV, reutilizando los mapas existentes. Los cuatro fustes reciben **16 estrías poco profundas**, de hasta **2,2 cm**, dentro de su envolvente previa.

**Conservación.** Cuatro columnas del perímetro, mismas cotas, límites y matrices; bases, capiteles, caras y UV de esos elementos protegidos. Los otros **39 meshes** de la fuente se mantienen. Continúan el anciano, **siete canarios**, **tres puntales arqueados**, el muro excavado, techo de madera, puente y **cuatro ofrendas**. Los huecos laterales del pedestal ya eran reales: no se tapan ni se mueven las ofrendas para simularlos. Se conserva la ocultación conjunta de cubierta y vigas al entrar.

**CANON:** templo abierto, escultura, aves, ofrendas y soportes. **VTT_AMBIENCE/adaptación previamente autorizada:** acabado clásico de los fustes y tratamiento de piedra. Evidencia: [builder](../../prototypes/retreat-visual-round2-20261028/build_temple.py), [auditoría del templo](../../prototypes/retreat-visual-round2-20261028/checks/temple-model.json), [antes](../../output/retreat-visual-round2-20261028/evidence/before-a5-25-30.png) y [después](../../output/retreat-visual-round2-20261028/evidence/after-a5-25-30.png).

### Costa, embarcadero y bosquetes

**Hallazgo.** Algunas copas tenían contornos cónicos y demasiado regulares. Los contactos de costa y determinados márgenes todavía podían leerse como plataformas independientes.

**Modificación.** Se refinan las copas de **ocho pinos existentes** para romper los bordes circulares y variar la silueta. Se conservan los troncos, las transformaciones y los límites exteriores. No se planta un bosque nuevo ni se multiplican los árboles. El trabajo de hombro costero de Pleamar baja, descrito a continuación, aporta continuidad entre suelo, roca y agua.

**Conservación.** El GLB P5 original queda intacto; el derivado conserva los **126 objetos ajenos a los árboles**, sus troncos y las posiciones de los árboles. Los apoyos de raíces y la protección de orilla de V5 continúan. También se conservan los ocho componentes originales del bote, su flotación vinculada al mar existente y el amarre dinámico. Esta pasada no añade otro mar, un sistema de viaje o un oscilador independiente del oleaje.

Todo el refinamiento de copas y márgenes es **VTT_AMBIENCE**. Fuente y auditoría: [builder de exteriores](../../prototypes/retreat-visual-round2-20261028/build_exteriors.py), [informe](../../prototypes/retreat-visual-round2-20261028/checks/exterior-report.json). Bosquete: [antes](../../output/retreat-visual-round2-20261028/evidence/before-grove-25-30.png) y [después](../../output/retreat-visual-round2-20261028/evidence/after-grove-25-30.png). Costa y embarcadero se revisan además en sus tres encuadres de comparación.

### Caminos de Pleamar y Observatorio

**Hallazgo.** La salida baja de Pleamar aún mostraba una cinta recta y una unión poco convincente con el terreno. La continuación alta ya corregida y las rutas de Observatorio se revisan para evitar regresiones.

**Modificación.** Se añade un hombro rocoso cerrado bajo la unión de Pleamar baja y una transición de suelo sobria. La continuación escénica pasa a describir una curva de aproximadamente **8,29 m** alrededor de la cala. El nuevo tramo carga antes de retirar visualmente la cinta anterior, cuyo original permanece en disco.

**Conservación.** Permanecen las **30 casillas** existentes de la ruta baja y sus alturas. El banco de roca es cerrado y queda bajo las superficies de navegación: el control geométrico toma 224 muestras y registra un máximo de **−2,5 cm** respecto al suelo jugable. No crea suelo táctico, colisiones, portales o interactivos. Se conservan `EXIT_PLEAMAR`, `EXIT_OBSERVATORIO` y `TRAVEL_PECIO_BOAT`; el DM sigue confirmando los viajes. La curva fuera del ancla es escenografía, no un nuevo mapa explorable.

La continuidad de roca y sendero es **VTT_AMBIENCE**. Evidencia: [verificador de exteriores](../../prototypes/retreat-visual-round2-20261028/check_exteriors.py), [resultado geométrico](../../prototypes/retreat-visual-round2-20261028/checks/exterior-geometry-check.json), [antes](../../output/retreat-visual-round2-20261028/evidence/before-pleamar-low-25--30.png) y [después](../../output/retreat-visual-round2-20261028/evidence/after-pleamar-low-25--30.png).

## Archivos y reproducción

Los cuatro derivados nuevos son `retreat_round2_a4.glb`, `retreat_round2_a5.glb`, `retreat_round2_p5_runtime.glb` y `retreat_round2_exterior_runtime.glb`, dentro de `campaigns/stormwreck-isle/public/art/retreat-modules/`. Las fuentes `.blend`, builders y checks están en [la carpeta de la pasada](../../prototypes/retreat-visual-round2-20261028/).

La integración reutiliza `retreat-visual-revisions.ts`, `retreat-refinement.ts`, `retreat-refinement-materials.ts` y `retreat-refinement-lighting.ts`. El selector de revisión es interno; no añade controles al producto. Los derivados no sobreescriben los originales. El auditor de conservación contrasta el lote base de **183 GLB** y protege los JSON de terreno, layout, navegación y viaje, además de los buffers de las celdas.

Se conservan **18 luces**. Se ajustan dos rellenos existentes; no se crean luces, mapas de sombra, pases de reflexión o nuevas imágenes para las variantes de madera y piedra. El relieve adicional de copas, libros y columnas aumenta geometría visual: esta entrega no se presenta como una optimización ni como una ganancia de FPS.

## Validación y cierre

Comprobaciones específicas ya disponibles:

- Modelo de interiores: marcos, huellas, alturas y objetos ajenos conservados; materiales y texturas existentes reutilizados.
- Materiales R2: prueba NullEngine de los tres acabados compartidos, pedestal sin patrón de pavimento y posición de vértices intacta. El roble nativo de las celdas conserva su color `#B99672`.
- Templo: envolventes iguales, bases/capiteles y otros 39 meshes exactos; siete canarios, tres arcos y cuatro ofrendas conservados.
- Exteriores: troncos y transformaciones exactos, cero árboles nuevos; banco de costa cerrado y bajo el suelo original.
- Typecheck cliente aprobado durante la implementación de materiales; `retreat-island.test.ts`, **7/7**, aprobado. Estos resultados parciales no sustituyen la batería final de integración.

**Resultado final de integración:**

| Verificación | Resultado |
|---|---|
| Pruebas funcionales y regresión de UV | 87/87 correctas,11archivos. |
| Typechecks y producción | Cliente/servidor y compilación completos;63GLB compilados por SHA,2.213inputs congelados. |
| Cámaras | 675encuadres de25focos(A1–A5,entorno y seis celdas),3roles,5°/15°/25° y−30°/0°/+30°. |
| Interiores y cubiertas | 36encuadres A3/cocina/A4/oeste sin obstáculos opacos sobre el cuerpo;2.262muestras sobre suelo real A5; cubierta oculta/restaurada. |
| Navegación | 42destinos ida/vuelta,12.226pasos autoritativos,745.842muestras físicas y231bordes bloqueados.1.349casillas/13superficies/68conexiones sin cambios en esta pasada. |
| Conservación | 183GLB originales y31fuentes de terreno/layout/nav/viaje exactos.71mallas estáticas A1 mantienen geometría física y matrices;36UV de roca restauradas,35mallas con todos sus buffers exactos. |
| Costa | Banco cerrado y224muestras por debajo del suelo existente;barca comprobada durante90actualizaciones,amarre sin hueco;cuatro pinos costeros apoyados. |
| Partida real | Once grupos semánticos idénticos,versión4;ningún actor trasladado. |
| Publicación | DM,jugador y proyector HTTP200;DM conectado,mapa renderizado y guardado confirmado. Proyector entrado con tres capas de canvas,sin desconexión ni errores. |
| Comparativas | 57parejas en19zonas ×3encuadres; mismas cámaras y posiciones,PNG1280×720. Detalle A1 adicional. |

**Incidencia hallada en la comprobación final:** `Finish_A4_Fixed_Oak_Head` tapaba al personaje en15°/0° y25°/0°. El dintel caía entre las muestras del sistema de rayos. Se clasifica únicamente esa pieza como pared superior para que utilice el corte frontal existente de la sala ocupada, conservando su rol de autoría en metadatos. No se modifica la geometría, la puerta ni el motor O1. Fotos A4 finales y prueba de36encuadres confirman la corrección. La candidata a era intermedia; **b es la publicada**.

La [galería de antes/después](../../output/retreat-visual-round2-20261028/index.html) está construida y verificada en `http://127.0.0.1:4632/index.html`. Las capturas controladas conservan cámara y escala; el oleaje y la vegetación pueden corresponder a fases temporales distintas. Son copias aisladas al mediodía; no alteran hora,clima o posiciones de la partida real.

Consolidado verificable: [checks/final.json](../../output/retreat-visual-round2-20261028/checks/final.json). Fuentes y SHA: [conservación](../../prototypes/retreat-visual-round2-20261028/checks/CONSERVATION.md). La comparación de guardado publica solo hashes; la copia completa previa permanece privada en runtime.

**Recursos, sin certificar FPS:** inventario inicial1653→1658nodos y241→247materiales;75texturas y18luces en ambos estados,un mismo mapa de sombras. Las seis variantes adicionales son materiales que comparten imágenes. Las cifras de tiempo de las capturas automáticas/en segundo plano no son un benchmark. La medición sostenida queda para Q1.
## Límites y siguiente revisión

No se certifica un acabado artístico definitivo por superar pruebas técnicas. Se conserva la arquitectura aceptada y parte de los paños amplios y ejes heredados. No se reconstruye toda la geología ni se cambian rutas para copiar una propuesta visual. Las copas, jardines y bordes podrán seguir afinándose tras revisar las capturas, conservando legibilidad y reservas corporales.

La auditoría sostenida de **FPS, memoria y latencia en todo el mapa** queda para después de esta revisión visual. No se han reducido luces, sombras, resolución ni contenido para producir una cifra de rendimiento. Los destinos de campaña que aún no disponen de mapa mantienen su transición preparada y manual.

