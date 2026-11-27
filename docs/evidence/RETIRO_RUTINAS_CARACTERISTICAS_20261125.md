# Rutinas características del Retiro del Dragón

## Auditoría previa

La base actual ofrece 72 tareas, pausas nocturnas, rutas que consultan suelo y colisiones, contactos por gesto, conversaciones, reloj y clima Godot. Se conserva esa agenda. La tarea de descanso convencional de Runara se retira de la rotación automática para respetar el encargo nuevo. La pose del petate se conserva como recurso.

Se han contrastado el PDF «Los dragones de la Isla de las Tempestades», capítulo 1, pp. 8–12, y los archivos de escena. El PDF establece la sensibilidad solar de los kobolds, el insomnio de Kilnip, la daga corriente de Blepp, la moneda de Mumpo y la limitación de Laylee con el fuego. La pesca compartida está vinculada al episodio de la playa. Los detalles de horario y las labores añadidas son puesta en escena.

| Residentes | Arte utilizable adicional a los reposos, marchas y poses cardinales comunes |
| --- | --- |
| Runara | Estudio de frente y espalda, meditación y saludo. |
| Tarak | Riego de frente y espalda, cocina y herbolaria. |
| Varnoth | Cantería de frente y espalda, ambos perfiles sin mover de lado la prótesis. |
| Myla | Taller de tres cuartos y espalda con alas pintadas. |
| Agga, Blepp, Frub | Dirección, vigilancia y manipulación de vaso, con vistas de frente y espalda. |
| Kilnip, Laylee, Mumpo | Charla, herramientas y observación, con vistas de frente y espalda. Kilnip tiene reposo de ojos cerrados. |
| Rix, Zark | Oración, incienso, recogida, vistas de frente y espalda. |

Los doce tienen tres ciclos de marcha cardinales de ocho fotogramas, cuatro poses cardinales de trabajo y cuatro poses cardinales erguidas. Varnoth tiene un ciclo de marcha adicional del otro perfil. Se usan planos anatómicos y profundidad del sistema modular existente. Los anclajes por defecto son estimaciones y el código de equipamiento de inspección no habilita herramientas para producción automáticamente. Por ello se aprovechan los props de escena y sus contactos, con una excepción declarada para los útiles que requieran un modelo nuevo. Para cualquier dibujo nuevo se auditará el ángulo relativo de la estación. Se conserva la cámara del jugador y la fase de gesto debe mantenerse al girar.

Riego, libro, alambique, engranaje, planos, cuencos y hamacas tienen ya objetos y reacciones. El mapa incluye daga de Blepp, moneda de Mumpo, mazo y cincel, y cañas de la escena de los zombis, que pueden servir como referencia o malla de origen. Faltan contactos portátiles específicos y anclajes revisados de caña, carga y escoba. La navegación ambiental cubre A1 y A3–A5. La playa necesita ampliar el muestreo a sus apoyos reales para que los habitantes bajen por la ruta jugable.

El reloj, el clima y los hitos de emergencia pertenecen a la mesa Godot. El cambio de mapa conserva metadatos de sesión mediante `MapTransition`. El puente HTTP de carga sincroniza su propia fase. Actualmente no hay replicación de estos PNJ entre instancias Godot ni guardado de campaña en disco para sus rutinas. La comprobación de esa capacidad se registra como distinta de los ensayos de una sola mesa.

## Implementación en Godot

| Habitante | Primera rutina | Segunda rutina |
| --- | --- | --- |
| Runara | Medita sentada frente al altar. Cinco vistas y respiración leve. | Lee el códice del escritorio este sentada en el taburete. El manuscrito permanece independiente y la mano cambia de pose. |
| Tarak | Riega dos parterres. El agua sale del pico y se dirige a la planta. El riego se cancela con lluvia. | Baja por la escalera hasta el puesto oeste del muelle. Usa caña, sedal y flotador en un puesto separado de Blepp. |
| Varnoth | Usa mazo y cincel en el sillar, con impactos y polvo. Conserva la prótesis derecha. | Recorre dos puestos del pórtico y se detiene a examinar la estructura. |
| Myla | Vierte en el alambique con recipiente y líquido separados. | Trabaja en el engranaje con herramienta y chispas. Puede coincidir con Laylee. |
| Agga | Busca un kobold disponible en la zona, se aproxima y da un recado. | Revisa la estantería de provisiones de la cocina. |
| Blepp | Baja a su propio puesto al este del muelle. Puede coincidir con Tarak. | Levanta y examina una daga corriente. |
| Frub | Curiosea en dos puntos del taller. | Recoge una caja, la lleva y la deja en el banco. |
| Kilnip | Reposa despierta en su hamaca con la manta y el balanceo previos. | Prepara una infusión en una taza en la balda baja de la cocina. |
| Laylee | Trabaja con herramienta fría sobre el banco. | Consulta el plano independiente. |
| Mumpo | Levanta y gira una moneda en su celda. | Recorre dos puntos seguros del sendero y la galería del acantilado. |
| Rix | Reza ante Bahamut. Puede coincidir con Runara. | Barre el paso del templo con escoba, polvo y sonido. |
| Zark | Recoge y entrega un saco en una ruta de dos tramos. | Pasa el trapo por el borde de la mesa del comedor. |

`retreat_characteristic_routines.gd` declara las veinticuatro actividades, sus estaciones, fases, parejas y segundos tramos. Se amplían `retreat_residents.gd` y `retreat_routine_props.gd` para reservar puestos, reaccionar al contacto, mantener y devolver la utilería y buscar otra ruta cuando falla un tramo. Los horarios de desayuno, comida y cena abren oportunidades a las 8, 13 y 19 horas. La reparación de la ruta al muelle vuelve a usar suelo y colisión del mapa. El control DM está en **Mesa → Rutinas del Retiro** y permite asignar rutinas, ver el destino, pausar y ordenar un desplazamiento por ruta hasta el foco.

Las nueve estaturas pequeñas corresponden a la tabla del encargo. El selector usa el rumbo del cuerpo y el ángulo de cámara con histéresis. Para las vistas nuevas de Runara se midió la orientación desde su puesto ante el altar. La respiración de la pose sentada no necesita duplicar dibujos. El perfil izquierdo de Myla ocupa ocho fotogramas para conservar sus alas dañadas. El reposo despierto de Kilnip usa un busto cenital que se proyecta sobre el soporte 3D. Así se instalan **14 dibujos nuevos en WebP sin pérdida**, frente a los 300 del presupuesto de referencia.

Los originales PNG se conservan por huella. La primera lámina de Runara se descartó por el fondo opaco. El registro identifica la iluminación, el equipo y los recursos elegidos por ID. Los criterios revisados son escala y detalle (VA-03), contacto con mobiliario (VA-06 y VA-07) e integración y profundidad (VA-10 y VA-13), con las referencias locales REF-01 y REF-08. [Comparativas y matrices nativas](../../output/retreat-featured-20261125/index.html).

## Verificación

Godot Forward+ produjo 600 muestras de cámara, 25 por rutina, con 288 comprobaciones superadas. Se conservaron siete pares antes/después de 1440 × 810 en la misma posición y con los mismos ajustes de cámara. La prueba sin interfaz superó otras 209 comprobaciones de contactos, rutas, clima e interrupciones, incluido el desplazamiento simultáneo de Tarak y Blepp desde sus posiciones de partida hasta sus respectivos puestos en el muelle. La regresión de la agenda anterior superó 483 comprobaciones y obtuvo los 72 contactos previstos. El registro local vincula capturas, recursos y resultados a la misma revisión del catálogo de personajes. [Registro de capturas y archivos](../../output/retreat-featured-20261125/capture-register.json).

La prueba del panel DM superó ocho comprobaciones. Abrió la sección real de Mesa, seleccionó a Agga, comprobó sus dos rutinas, activó las pausas global e individual, asignó una actividad y reconstruyó la escena tras la señal de transición. La actividad asignada y la pausa global se recuperaron juntas. Las 27 pruebas del catálogo y del proceso de importación de personajes también se superaron. [Prueba del panel y la recuperación](../../output/retreat-featured-20261125/ui-checkpoint-retry.log).

La prueba de ida y vuelta entre Retiro y Pleamar superó 28 comprobaciones, con los doce habitantes y la cuadrícula caminable presentes al regresar. [Prueba de cambio real de mapa](../../output/retreat-featured-20261125/map-roundtrip-retry.log).

## Acabado de la lectura y la pesca

El taburete `RetreatEastDeskSeat` reutiliza el asiento interactivo de A4. Runara conserva el rumbo del mueble y ocupa una plaza real. Se libera al interrumpir la rutina. `RetreatEastFolio` sigue siendo el recurso del manuscrito y ofrece el contacto de mano. La malla de asiento de `seated_character_surface.gd` usa ese punto para llevar la mano al plano del libro sin mover la pelvis ni los pies. Se conservan diez poses de estudio en cinco ángulos de espalda, con dos estados sostenidos.

`RoutineTool_tarak` y `RoutineTool_blepp` reutilizan sus cañas y puestos. Cada uno tiene un perfil lateral con cuatro poses nuevas de preparación, lanzamiento, espera y recogida, con un agarre medido en cada dibujo. El flotador y el sedal siguen esas fases y se retiran al interrumpir la tarea. Se añaden **18 fotogramas WebP sin pérdida**, 3,33 MB de arte fuente derivado. El registro conserva las huellas de los PNG, la escala, el pivote y los contactos de cada fotograma. Criterios VA-03/06/07/10/13 con REF-01/08. [Comparativas y registro](../../output/retreat-contact-pass-20261125/index.html).

La candidata de este bloque supera 97 comprobaciones en Godot Forward+ y proporciona 75 muestras en la matriz de cámara. La comparación de Runara usa el mismo encuadre de 1440 × 810 con las versiones de pie y sentada. Se comprobó la ocupación compartida del asiento y la liberación al interrumpir. La regresión sin interfaz supera 234 comprobaciones, con los 24 contactos y el recorrido simultáneo de los pescadores hasta el muelle. Las 27 pruebas del proceso de recursos también pasaron. [Registro de la revisión exacta](../../output/retreat-contact-pass-20261125/capture-register.json).

### Contacto de la túnica con el taburete

La matriz inicial mostraba el borde de madera cruzando el centro de la falda. El pliegue trasero heredaba la profundidad asignada a rodillas y sandalias. El taburete `RetreatEastDeskSeat` de `retreat_interiors_a3_a4.gd` declara su radio real de 0,27 m. `seated_character_surface.gd` ajusta la profundidad de los pliegues traseros que se cruzan con ese apoyo y conserva sus coordenadas proyectadas. Se reutilizan los diez WebP de Runara y el asiento de roble existente. Aplican VA-06 y VA-07, con REF-08 para el contacto de la figura con el mobiliario.

La revisión nativa supera 47 comprobaciones y recoge 50 vistas con las dos poses. Incluye la liberación del asiento y dos pares superpuestos de 1440 × 810 con cámara, iluminación y fase equivalentes. [Ver corrección y matrices](../../output/retreat-runara-stool-20261125/index.html).

## Herramientas, carga y limpieza

Se incorporan 84 fotogramas WebP en once secuencias. Varnoth, Myla y Laylee disponen de ocho fases traseras cada uno. Frub y Zark tienen ocho fases de marcha por vista, de espaldas y de perfil en el sentido principal de su recorrido. Cada uno tiene además ocho fases para agacharse y alzar la carga. La misma secuencia se reproduce al revés para depositarla. Rix barre con seis fases traseras. Zark limpia con seis fases laterales. Los originales y los informes de extracción quedan ligados al catálogo por huella.

| Actividad | Contacto con el mapa |
| --- | --- |
| Varnoth · `VAR_01` | `A5_VarnothMasonryKit` se desplaza a (35,44; 27; 66,55) para que el banco cercano quede detrás del golpe. Se toma como apoyo la cara de `DressedAshlarBlock`. El mazo y el cincel visibles en reposo se ocultan al usarlos y vuelven a aparecer al terminar. |
| Myla · `MYL_02` | `RetreatMylaWorkpiece` registra la pieza de latón en una mordaza frontal a la altura de manos de Myla. Se aprovechan el banco y sus materiales. Las alas conservan su contorno característico. |
| Laylee · `LAY_01` | `RetreatLayleeWorkpiece` registra la tabla en la segunda mordaza frontal. El mazo llega a la pieza durante la fase de impacto y el sonido corresponde al contacto con madera. |
| Frub y Zark · `FRU_02`, `ZAR_01` | La caja y el saco se mantienen como objetos separados durante la marcha. El destino recibe el mismo objeto del primer tramo y lo apoya mediante una consulta al suelo. |
| Rix · `RIX_02` | El mango toma dos referencias de mano. Las cerdas siguen la altura del suelo y activan los efectos durante el barrido. |
| Zark · `ZAR_02` | `RetreatZarkCleaningStep` proporciona un apoyo de 13,5 cm. `RetreatWipeEdge` sigue la superficie real del tablero y limita el recorrido del paño al borde alcanzable. La lámina original conservaba un halo de alfa que alcanzaba otras celdas. Se validó el recorte con la silueta opaca y su franja antialias. |

`retreat_work_contacts.gd` registra los agarres por fotograma. Los modelos y el sonido avanzan con el gesto. Revisar los contactos VA-06/07 y la composición VA-10/13 con REF-01/08. La comparación del paño reproduce la colocación y el gesto anteriores en la misma cámara. [Visor de ciclos, capturas y registro](../../output/retreat-work-contacts-20261125/index.html).

El rumbo de cada gesto se calcula desde la posición del PNJ hasta su punto de trabajo. El giro horizontal cambia la vista relativa de la pose y conserva la fase de la acción. La escoba y el paño siguen recorridos definidos en el mapa. Los agarres de las herramientas se leen del fotograma que se está mostrando.

Godot completó 269 comprobaciones funcionales de las veinticuatro rutinas y 149 comprobaciones en la sesión con render, sin fallos registrados por la prueba. Se capturaron 175 imágenes de las siete actividades, con cinco giros horizontales entre −30° y +30° y cinco inclinaciones entre 5° y 25°. En cada serie se conservó el rumbo del PNJ y la fase de trabajo. Se comprobó también el rumbo de marcha durante el transporte y la estabilidad de la escoba y del paño sobre sus superficies. [Registro de la sesión con render](../../output/retreat-work-contacts-20261125/native.json) · [Registro funcional](../../output/retreat-work-contacts-20261125/headless.json).

## Límite actual de la candidata

Las veinticuatro actividades tienen recorrido, gesto y contacto en la escena. Los principales ángulos de trabajo, limpieza y carga tienen sus propios ciclos. Los rumbos relativos alejados de estos conservan poses de la biblioteca, y el apoyo de la mano izquierda en el cincel de Varnoth es aproximado. La fase exacta de las partículas en vuelo y la aceptación del acabado siguen pendientes.

El guardado local registra posición de suelo, orientación, actividad, pausas y turno de agenda al cambiar de mapa. Una actividad recuperada vuelve a su punto de inicio coherente, incluido el origen si estaba transportando algo. El estado de sesión se comparte entre las vistas de la misma instancia local. La replicación persistente entre procesos Godot queda pendiente de la conexión de campaña nativa.

### Dibujos y anclajes pendientes

Las siguientes son poses de cuerpo distintas, con las cinco vistas relativas donde el gesto existente no cubra el contacto. Los soportes, herramientas y efectos ya están disponibles en el mapa.

| Rutina | Recurso pendiente |
| --- | --- |
| TAR_02, BLE_01 | Extender las cuatro fases de pesca a las vistas alejadas del perfil. Las poses laterales ya tienen calibrado el agarre de la caña. |
| VAR_01, MYL_02, LAY_01 | Vistas específicas fuera del arco trasero de trabajo. Ajustar la mano de apoyo del cincel de Varnoth. |
| FRU_02, ZAR_01 | Vistas frontal y del lado opuesto al recorrido principal. |
| RIX_02, ZAR_02 | Ángulos relativos fuera de las posiciones de trabajo que muestran las matrices. |
