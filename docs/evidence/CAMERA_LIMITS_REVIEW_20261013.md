# Revisión de límites de cámara — 2026-10-13

**Implementación posterior autorizada:** el usuario amplió el vertical a 20°–40°, con presets interior/exterior 20°/40°, confirmó ±30° horizontal también en Stormwreck y pidió combate automático y R/F en DM. Esos criterios sustituyen las propuestas de esta revisión. Ver [implementación y comprobaciones](CAMERA_POLICY_20261013.md).

**Propuesta vigente tras la aclaración del usuario:** mantener 25° como inclinación mínima y priorizar una composición inspirada en Octopath Traveler. La propuesta inicial de 35°–45° y cuatro vistas alrededor de 360° queda superada. Ninguna de estas propuestas cambia todavía la aplicación.

## Alcance

Revisión del código vigente y de capturas existentes: comparación D8 Cena a 25° y 45° del 5 de octubre, galería compartida del 4 de octubre y cubierta/camarote del Pecio del 12 de octubre. Se consultó documentación oficial del motor para distinguir órbita y proyección. No se ha iniciado otra partida, generado capturas nuevas, ejecutado pruebas nuevas ni modificado los controles o el arte. Las recomendaciones siguientes todavía no están implementadas ni validadas como configuración final.

## Estado real del código

- `engine/client/camera-profile.ts`: inclinación manual entre **25° y 50°**, valor inicial compartido **45°**.
- `engine/client/interior-camera.ts`: D8 utiliza inicialmente **25°**. Entrar en un espacio cubierto aplica ese valor una vez; salir recupera la inclinación exterior anterior.
- `engine/client/camera-space.ts`: un camarote del Pecio eleva el objetivo a **55°** como mínimo para superar techos vecinos. `apps/web/world.ts` permite ese objetivo en su controlador de movimiento.
- `engine/client/camera-movement.ts`: ocho orientaciones horizontales, separadas por **45°**, con recorrido circular completo. Existen offsets por mapa y una orientación de llegada al Pecio que evita empezar detrás del casco.
- `apps/web/world.ts`: proyección ortográfica y transición amortiguada; `engine/client/world-billboards.ts` mantiene personajes como planos ilustrados orientados a cámara e integrados en la profundidad.
- Los límites anteriores de 35°–50° documentados el 4/5 de octubre son históricos. No describen toda la configuración vigente.

## Compromiso vertical

Ángulos medidos desde el suelo: 0° mira horizontalmente; 90° mira desde arriba. No son el parámetro beta de Babylon, que el proyecto calcula como 90° menos la inclinación.

En una proyección ortográfica, para un suelo horizontal, a escala constante, su componente en profundidad se proyecta proporcionalmente a `sin(inclinación)`. Para una pared vertical de altura h, la longitud de suelo ocultada en la dirección de la cámara es `h / tan(inclinación)`. Son relaciones geométricas ideales; no mediciones de los mapas, FPS ni porcentajes de mejora visual. El encuadre automático también cambia la escala entre capturas.

| Inclinación | Factor de profundidad del suelo | Suelo ocultado por pared, por unidad de altura |
|---|---:|---:|
| 25° | 0,423 | 2,145 |
| 35° | 0,574 | 1,428 |
| 40° | 0,643 | 1,192 |
| 45° | 0,707 | 1,000 |
| 50° | 0,766 | 0,839 |
| 55° | 0,819 | 0,700 |

La vista a 25° resalta fachadas y altura, pero comprime suelo y recorridos. Subir facilita leer casillas y objetos detrás de obstáculos; acerca la composición a una vista de tablero. Los personajes siguen usando su ilustración, no una nueva vista superior anatómica. Restringir el rango puede reducir la discrepancia entre dibujo y escenario, pero no crea arte direccional ni elimina por sí solo temblores.

## Propuesta vigente: composición HD-2D para el VTT

El equipo de Acquire explica que Octopath Traveler II utiliza cámara fija durante la exploración y que los giros de casi 90° en efectos de combate y 180° en eventos exigieron cuidar la fidelidad de los personajes planos frente a fondos 3D. Eso demuestra que un giro amplio no elimina técnicamente el enfoque 2.5D, pero tampoco justifica ofrecer órbita libre permanente. Fuente: [entrevista a Square Enix y Acquire](https://www.unrealengine.com/developer-interviews/octopath-traveler-ii-builds-a-bigger-bolder-world-in-its-stunning-hd-2d-style?lang=en-US), apartados de retos 2.5D y diseño de mapas. Los ángulos propuestos aquí son nuestros; no se atribuyen a la cámara de Octopath.

| Parámetro | Propuesta |
|---|---|
| Vertical manual | 25°–40° desde el suelo |
| Vertical inicial | 30°, ajustable artísticamente por escena dentro del rango |
| Horizontal | −30° a +30° respecto al frente compuesto para cada mapa, total 60° |
| Q/E | Pasos de 15°, sin vuelta circular al llegar al límite |
| Dos dedos | Horizontal continuo dentro del margen; vertical continuo entre 25° y 40° |
| Proyección | Conservar la ortográfica actual como decisión de nuestro VTT |
| Zoom | Límites adaptados al espacio actual, objetivo y pantalla, según el apartado de zoom |

La referencia horizontal es local al mapa: por ejemplo, un frente de 45° respecto a su cuadrícula admitiría 15°–75°. Los extremos son propuestas para evaluar, no vistas nuevas ya aprobadas. La orientación de cámara puede seguir al personaje sin girar automáticamente a su espalda; se conservan los modos fija, semifija y seguimiento, las coordenadas y la conversión del movimiento al ángulo visible.

25° permite la vista baja que prefiere el usuario; 30° es un punto de partida próximo a ella. Subir hasta 40° conserva una ayuda para leer suelo y combate sin dar acceso habitual a una vista muy cenital. Un frente elegido por mapa y sólo ±30° reducen la exposición de caras que rompen la composición y la necesidad de revisar composiciones completamente opuestas. Siguen siendo necesarias geometría coherente, oclusión y arte direccional de los personajes; no desaparece el trabajo espacial ni se promete una mejora de FPS.

Se pierde la posibilidad de mirar físicamente desde detrás de edificios/casco. Para que eso no bloquee el VTT, la ocultación de paredes y techos debe hacerse respecto a la habitación y al personaje autorizado, manteniendo aparte visibilidad de juego y secretos. En el Pecio habrá que sustituir o adaptar el encuadre automático a 55° antes de exigir este rango. En A1/Retiro se necesita un frente donde sean legibles camino, celdas y accesos. También se debe sustituir la política actual de llegada al Pecio por una composición de llegada compatible con el nuevo margen.

La dirección artística propuesta combina capas en profundidad, luces de ambiente y contacto, sombras coherentes, paleta ilustrada y un primer plano/fondo que enmarquen la acción. Evitar desenfoque sobre fichas, casillas y objetos interactivos. Conservar el arte existente mientras se comprueba su adaptación a estos encuadres; la inspiración en Octopath no impone convertir todas las ilustraciones en pixel art.

DM, jugador y proyector compartirían la política angular y el cambio de escena, con zoom/encuadre adecuado a cada pantalla y cámara local del jugador cuando se permita. Si se adopta el margen ±30°, las orientaciones antiguas fuera de rango deben migrarse o restablecerse al frente nuevo; no basta cambiar las constantes verticales. Sigue pendiente validar entradas, interiores, combate, zonas elevadas y móvil con esta configuración.

## Propuesta inicial superada

Probar **35°–45°**, con **40° inicial**, como política normal compartida por DM, jugador y proyector. Es una propuesta artística y de legibilidad para este proyecto, no un estándar obligatorio de 2.5D ni un rango ya auditado en todos los interiores actuales.

Conservar recorrido horizontal **360°**, pero probar **cuatro orientaciones de parada separadas 90°**, con transición suave. Normalmente serían las diagonales respecto a la cuadrícula (45°, 135°, 225°, 315°); el frente inicial de cada mapa debe elegirse expresamente, conservando accesos y la composición de A1. Los gestos y Q/E seguirían seleccionando la siguiente vista. Durante la transición se atraviesan ángulos intermedios.

Esto reduce las composiciones de parada que necesitan revisión y evita algunas vistas de frente muy planas. Conserva la posibilidad de mirar desde detrás. Se pierde el ajuste horizontal intermedio de 45° y cada giro recorre más distancia: habría que cuidar duración y velocidad. No reduce a cuatro las direcciones de animación de los personajes, que pueden seguir caminando en ocho direcciones. Tampoco permite dejar sin terminar las caras posteriores del escenario ni garantiza reducir el coste GPU.

Una restricción horizontal de **−45° a +45° respecto a la vista inicial** protegería más una composición artística concreta y reduciría la desorientación. A cambio impediría observar el lado opuesto del barco, acantilados y edificios. Sólo la propondría para una escena concebida expresamente con un único frente y soluciones de oclusión compatibles, no como política global de esta mesa.

## Condiciones antes de aplicar

1. Resolver expresamente los interiores: no basta cambiar dos constantes. D8 tiene un preset de 25° y el Pecio uno de 55°. Evaluar techos/paredes que se ocultan según la habitación antes de exigir 45° a los camarotes. Una excepción documentada puede ser necesaria si no se modifica esa solución.
2. Revisar las preferencias guardadas, los encuadres iniciales y de llegada, las etiquetas, los gestos y las orientaciones compartidas. Aplicar la misma política a los tres clientes; conservar la cámara local opcional del jugador.
3. Comparar entrada, interior y zonas elevadas en D8, A1/Retiro y Pecio; comprobar foco, selección, oclusión y movimiento durante los giros, además de sensación física en móvil.
4. Mantener el zoom y los modos fija/semifija/seguimiento como funciones separadas. Restringir grados no sustituye corregir la interpolación, el foco o las paredes que tapan una ficha.

## Ampliación: límites de zoom por escena y pantalla

La revisión adicional confirma que `apps/web/world.ts` utiliza límites globales **0,4–24** para botones/gestos y rueda. El encuadre ya considera la relación de aspecto, tiene acercamientos iniciales diferentes por escenario y adapta el Pecio a camarotes, cofa y cubiertas. Estas adaptaciones no equivalen a límites dinámicos de zoom: el mismo multiplicador puede producir tamaños visibles muy distintos. El combate también dispone de encuadre y área segura propios, que deben conservarse.

Propuesta pendiente de implementación:

- Calcular los extremos por área jugable actual, objetivo, inclinación y área de pantalla disponible tras descontar paneles/controles. Utilizar unidades visibles y tamaño proyectado, no sólo un multiplicador fijo por mapa.
- Alejamiento máximo: vista general del área pertinente con margen inicial de 10%–15%. Para un camarote o la cofa, esa área es su espacio, no todo el barco; el DM conserva una acción explícita para ver el escenario completo. Sólo utilizar actores/información autorizados para cada cliente.
- Acercamiento máximo de juego: personaje completo, anillo/indicadores y varias casillas vecinas. Probar como tope inicial una altura de personaje del 20%–30% del área vertical útil, sin convertirlo en un porcentaje ya validado ni en límite apropiado para todas las criaturas. Un modo de inspección podría ofrecer acercamiento adicional si se define expresamente.
- Jugador: foco en su personaje; DM: ficha, objeto o punto elegido; proyector: encuadre colectivo legible. La política compartida no requiere idéntico multiplicador ni encuadre en pantallas de tamaños distintos. En combate prevalecen el área segura y las necesidades del encuentro.
- Recalcular al cambiar de mapa, espacio o tamaño de ventana y al girar el móvil. Conservar la preferencia cuando siga siendo válida, ajustar sólo si queda fuera y realizar la transición suavemente. Evitar que cambios mínimos de tamaño o el giro de cámara produzcan oscilación continua de límites.
- La rueda, la pinza, los botones, el detalle y la restauración de preferencias deben pasar por la misma política. Cambiar los límites de un único control dejaría otros caminos con el comportamiento anterior.

Ganancias previstas: evitar fichas diminutas o recortadas, acercamientos sin contexto y exceso de vacío exterior. Costes: menor libertad de inspección y una política más compleja; requiere validar cada espacio y casos de criaturas grandes. No se ha cambiado el zoom de la aplicación ni ejecutado nuevas pruebas.

## Referencias

- [Babylon: cámara orbital y parámetros alpha/beta](https://doc.babylonjs.com/features/featuresDeepDive/cameras/camera_introduction).
- [Godot: modos de proyección de Camera3D](https://docs.godotengine.org/en/stable/classes/class_camera3d.html).
- [Cena a 25°](../../output/d8-map-corrections-20261005/d8-dinner-tilt-25-angle-0.png) y [45°](../../output/d8-map-corrections-20261005/d8-dinner-tilt-45-angle-0.png).
- [Cubierta actual del Pecio](../../output/pecio-atmosphere-20261012/wreck-detail-main.png) y [camarote C4](../../output/pecio-atmosphere-20261012/wreck-c4-angle-3.png).
- [Auditoría previa compartida](CAMERA_2_5D_20261004.md) y [revisión reciente del Pecio](PECIO_ATMOSPHERE_20261012.md).
