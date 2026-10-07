# Estado del proyecto

## D8 — correcciones V49, 2026-10-06

Aplicadas las 22 correcciones: cabaña Fritz cerrada con vegetación exterior y puerta en el sendero; Café medieval completo, ventanas con huecos y cristal; cubierta del templo y casa de Cena accesible. Puertas jugables articuladas e interactivas, ocupación de PNJ y llegadas separadas. Cámara interior suave a 38° y regreso al encuadre exterior, paredes/muebles atenuados sin alterar colisiones. Agua ondulante, lluvia/nieve progresivas por intensidad y tiempo, farolas y luz solar por hora, niños junto a vaca con cuerda y reflejo centrado con aparición mágica.

Movimiento enlazado con búfer visual de 80 ms, tolerancia a pausas de entrada y deslizamiento por paredes; cachés de texturas/hoja/mochila, decorado agrupado, sombras y efectos de render acotados. Rueda con etiquetas completas, iconos y regreso cercano; paginación móvil corregida, cuatro categorías comprobadas a 390×844 y 844×390. Aviso de mapa en esquina, configurable 3–25 segundos.

Verificación: **397/397 pruebas**, 58 archivos; tipos, compilación y payload V49 PASS. Integración DM/dos jugadores/proyector y smoke de seis mapas PASS. Auditoría base de **192 vistas** sin errores, recursos pendientes ni variación de cámara; comprobaciones visuales adicionales después de los ajustes finales. V48 archivada, sin publicación GitHub ni partidas reales modificadas. El lanzador recompila al próximo arranque seguro. Detalles, capturas y límites de rendimiento/aceptación artística en el [informe V49](docs/evidence/D8_V49_REVIEW_20261006.md).

## D8 — correcciones V48, 2026-10-06

Puerta y paredes completas del café; patio ajustado; caminos con seis filas nuevas sin desplazar celdas antiguas; Cena con más patio y fachadas orientadas hacia él. Sentarse/levantarse es una acción real de jugador y DM, con poses propias, ocupación, guardado y salida al caminar o combatir. Respaldos y mesas se atenúan únicamente cuando obstruyen la visión; foco físico correcto al sentarse. Aislamiento alfa de Silverfarben y reloj monotónico para no rebobinar pasos por variaciones de latencia. Mercado con niños, vaca-sprite, cuerda y vendedor colocado en su puesto.

Clima completo en ambas consolas DM; Mesa / Clima / Sonido separados. Campos enviados independientemente para no perder cambios rápidos. Materiales exteriores mojados/nevados; precipitación excluida de interiores por cubiertas; cuatro fases de iluminación y faroles/ventanas exteriores apagados de día. Se mantiene la casilla de 1,5 m: el ajuste del café afecta al área transitable, no a su escala táctica.

Verificación final: **382/382** pruebas, tipos y builds separados PASS; integración D8 con sentarse por jugador y DM, clima compartido, espejo, desenlace, saves y reinicio; smoke de seis mapas/70 audios y regresiones de Stormwreck PASS. Pasada global de **192 vistas** y **32 adicionales del templo** con recursos listos y posiciones conservadas. Ambas pasadas registraron una pequeña variación de encuadre 0,05224 en una muestra: se conserva expresamente, sin darla por resuelta ni declarar falsamente estabilidad cero. Puerta, personaje cercano y cambios rápidos de clima de ambas consolas comprobados en navegador. Detalles y límites en el [informe V48](docs/evidence/D8_V48_REVIEW_20261006.md). No se publicaron cambios ni se tocaron las partidas reales. La aceptación artística, escucha final y prueba prolongada en el equipo de mesa siguen siendo comprobaciones humanas, no una garantía de «cero errores».

## Correcciones de mapas y clima D8 — 2026-10-05 · Playground V47

Corregidos alfa/colores, pies y profundidad nativa de fichas; continuidad durante cambio de textura de movimiento; vaca sólo como sprite; materiales continuos del exterior, abrevadero sin camino superpuesto, agua animada, estatua pétrea y luces reales. Anteros y aldeana usan poses sentadas existentes. Café/Fritz tienen cubierta; arquitectura que cruza la visión se atenúa sin alterar colisiones. Cámara D8 inicial 25°. Carteles legibles sin teletransporte y cinco pasos físicos de aproximación para viajar por los puertos existentes.

Espejo único 3D: desaparece al revelar su copia del jugador, preparada en una casilla libre no fatal antes de validar ocupación. Hielo blanco difícil; pisar azul aplica caída fatal persistente, inconsciente y fin de concentración tanto para jugador como para movimiento DM. Climatología compartida: cuatro fases del día, lluvia/nieve en tres niveles y viento, con audio existente, sincronización y saves completos.

Verificación: **371/371** pruebas, tipos/builds, integración D8 completa y smoke PASS; regresión de Stormwreck PASS. Navegador DM/jugador y móvil horizontal/vertical comprobados. Auditoría global de **192 vistas**, más **32 de Cena** tras cerrar ambos hastiales: cero errores, recursos listos, posiciones conservadas y variación de pose 0; evidencias en el [informe V47](docs/evidence/D8_MAP_CORRECTIONS_20261005.md). F1–F5 cerradas técnicamente. No confundir aceptación artística/escucha/hardware físico, aún pendientes, con cierre de pruebas técnicas. Sin GitHub ni saves reales modificados; el lanzador recompila en el próximo arranque seguro.

## Revisión integral final D8 — 2026-10-05

Se corrigieron el último impacto perdido al cerrar automáticamente combate, privacidad de acciones del DM y caída/desvanecimiento de criaturas ya derrotadas sin devolverlas al mundo lógico. La distribución recomendada prioriza tablero y consola contextual; QR, orientación y herramientas de prueba quedan plegables. DM, jugador y proyector muestran preparación del escenario y comparten recuperación de carga. La iniciativa deja de tapar el menú de hoja/mochila. Las ayudas de estados leen CD, rasgos y PG reales; el resumen de salto deja de estrechar la hoja móvil. Cargar conserva propietarios conectados y el mensaje de confirmación ya no promete una elección de personaje innecesaria.

Verificación: **360/360 pruebas, cero fallos**, tipos cliente/servidor y builds PASS. Integración D8 real (DM/dos jugadores/proyector, recorrido, dados, restore, diez saves y autocarga), smoke de seis mapas/70 audios e integración Stormwreck contra el servidor recién compilado PASS. En navegador se completó arco → objetivo → d20 → daño y se restauró un archivo real con escena/PG/estado/ronda/iniciativa/acción usados. Proyector sin grid, reconexión a María y vistas efectivas 390×844 / 844×390 comprobadas.

Este cierre acredita el **MVP con arbitraje DM**, no automatización universal de D&D 2024 ni ausencia de todo error posible. Continúan pendientes aceptación artística/escucha del usuario y hardware físico; preparados/conversión de fichas requieren elección, y Light/offhand/Nick/maestrías y ciertos efectos situacionales siguen guiados. No se alteraron partidas reales ni se subió a GitHub. El lanzador recompila al próximo arranque seguro. Informe, archivos y capturas: [auditoría final](docs/evidence/D8_FINAL_AUDIT_20261005.md).

## Integración medieval y pies de fichas D8 — 2026-10-05

Los caminos de Templo, Café y Mercado sustituyen las bandas rectangulares por adoquines individuales irregulares agrupados en mallas, con tonos ajustados al suelo de cada escenario. El acceso exterior del Templo tiene una silueta de terreno irregular y comparte material con la costa. El barrio reutiliza fachadas entramadas, puertas de madera con hierro, carteles colgantes y faroles medievales; el patio exterior del Café comparte el tono del pavimento próximo.

Corregido el anclaje de las fichas nativas D8: el pivote de ordenación del mapa plano enterraba parte de los pies en el suelo 3D. El render D8 usa el borde inferior del sprite como apoyo. La cuadrícula comparte el búfer de profundidad del escenario y conserva las casillas transitables y alturas autoritativas, evitando dibujarse encima de muebles o personajes. La oclusión física de columnas, paredes y puestos se mantiene.

Verificación: revisión visual de caminos y fichas en Templo, Café y Mercado, más capturas de Jardín, Espejo y Cena; auditoría de los seis mapas en 8 orientaciones × 3 inclinaciones, **144 vistas, 0 errores**, sin recursos pendientes, posiciones conservadas y variación de pose asentada 0. Pruebas focalizadas **49/49**, tipos cliente, build de producción y smoke del one-shot PASS. Informe y capturas en `output/camera-2-5d/backdrop-v43/` (carpeta histórica del visor). Estas comprobaciones no certifican todas las posiciones posibles ni el rendimiento en móvil/proyector físicos; queda la pasada manual del usuario.

## Caminos y barrio continuo D8 — 2026-10-05 · Playground V46

El Templo ya no termina en una costura rectangular: el césped del terreno Babylon continúa hasta la costa y el límite jugable queda señalado por un seto sobre zócalo de piedra, abierto en el acceso. Dos ramales se dirigen hacia Café y Mercado. Café y Mercado comparten materiales de fachadas, árboles, faroles, puestos y pavimento; desde cada tablero se insinúa el otro barrio. Cena queda encuadrada como patio de finca, con jardín, setos, casas y camino exterior. Los fondos son mallas en el mundo y giran con la cámara; no son fotografías del mapa ni amplían el grid transitable.

Los tres caminos Templo↔Café, Templo↔Mercado y Café↔Mercado usan los puertos existentes del motor, con nuevo modo genérico `road`: pisar la casilla de salida fuera de combate cambia de escena, conserva la posición individual y provoca autoguardado. El DM/proyector sigue al viajero; los demás personajes permanecen donde estaban. Las casillas de ambos extremos se comprueban como transitables. La ruta de Cena es decorativa por ahora: no se ha inventado una transición narrativa para el desenlace.

Revisión manual en navegador de Templo, Café, Mercado y Cena con la cámara inicial. Auditoría automática de 8 giros × 3 inclinaciones en cada uno: **96 vistas, 0 errores**, texturas preparadas y posiciones estables. Pruebas focalizadas de navegación, guardado, cámara y carga de escena: **34/34**; compilación cliente/servidor y smoke del one-shot PASS. Pendientes: aceptación artística del usuario y rendimiento en móvil/proyector físicos. No se añadieron activos descargados.

## Fondos y horizontes D8 — 2026-10-05 · Playground V45

Los seis biomas conservan escenario Babylon 2.5D nativo; el exterior se prolonga con materiales procedurales y geometría mundial no interactiva, no con una captura prerenderizada. La inspección por capas confirmó que el azul/negro previo lo producían los materiales exteriores demasiado oscuros en Babylon, no una capa Pixi. El Templo tiene mar texturizado y costa irregular con vegetación consistente con los árboles de la escena; Jardín, Café, Mercado y Cena conservan sus ambientes de nieve, aldea, plaza nocturna y finca. Café y Mercado reciben pavimento de transición para evitar el corte rectangular al vacío. En el Espejo se quitó una bóveda opaca que tapaba el tablero y se rodeó la arena con suelo y relieve de caverna. Las mallas de entorno no son seleccionables ni añaden colisiones/cuadrícula.

Comprobación visual manual en navegador de los seis mapas D8, Templo girado y probado a 35°/45°/50°, Espejo y plaza revisados a resolución de escritorio; cambiar D8 → Stormwreck → D8 deja los perfiles aislados. Cuadrícula limitada al tablero jugable. Tipos cliente, build de producción y 11/11 pruebas focalizadas de cámara/carga de escenas PASS. La auditoría global automática de todos los ángulos no se repitió porque se bloqueó antes; tampoco se han medido FPS ni probado proyector/móvil físicos. Cena recibió sólo integración ambiental común, no una nueva composición artística. No se descargaron assets.

## Cámara táctil del jugador — 2026-10-05

La pantalla del jugador utiliza el perfil compartido de cámara 2.5D, con inclinación inicial de 45° y límites de 35°–50°. Deslizar dos dedos hacia arriba eleva la vista; hacia abajo la baja. El desplazamiento horizontal conserva el giro de 45° y la pinza controla el zoom; Q/E siguen funcionando sin etiquetas en el mapa. Se suaviza el inicio del gesto y se procesan ambos contactos en el mismo cuadro para distinguir el deslizamiento de la pinza. Cambiar de mapa, ocultar la página o perder el foco cancela los contactos pendientes.

Verificación focalizada: **19/19** pruebas aprobadas, tipos cliente y compilación de producción PASS. Incluye reconocimiento, límites, inversión del gesto y movimientos pequeños; no se ha repetido la auditoría completa anterior ni probado el gesto en un móvil físico. Evidencia en el [informe de cámara](docs/evidence/CAMERA_2_5D_20261004.md).

## Cámara 2.5D compartida — 2026-10-04 · D8 V42

Los 13 mapas jugables Babylon de D8, Retiro, Pecio y campamentos usan cámara ortográfica 3/4, inclinación inicial 45° y límite 35°–50°. Ocho orientaciones con transición amortiguada; zoom máximo 24; foco correcto en ficha local/selección DM; modos fija, semifija y seguimiento conservados. WASD y joystick consumen el ángulo visible, incluido el giro en curso, y el teclado del DM utiliza la misma conversión de cuadrícula.

Personajes animados integrados en la profundidad del escenario, conservando sus ilustraciones y atlas. Corregidos materiales compartidos del Retiro, transparencia SVG, sombras de contacto y altura de los patios circulares del Templo D8. Cámara, fichas y Babylon se actualizan en un único reloj. Fuentes y Playground V42 validados; V41 archivada.

Verificación: tipos cliente/servidor/banco visual y build de producción PASS; pruebas focalizadas **62/62**; suite completa **337/338**, con el mismo fallo previo de resolución/publicación de combate en `engine/server/game.test.ts`. Foco y modos: **38/38** comprobaciones en Templo/Retiro, incluido el zoom local de cada personaje en los tres modos. Las 312 vistas de los 13 escenarios completan sin errores registrados, con posiciones conservadas y variación de pose asentada 0; resultados y capturas en [informe de cámara](docs/evidence/CAMERA_2_5D_20261004.md). La aplicación real de D8 confirmó cambio de mapa y giro compartido entre DM, jugador y proyector en una instancia aislada; la compilación final confirmó giro con E, zoom centrado y ausencia de la flecha del prototipo. La medición de estabilidad de pose no certifica FPS ni hardware físico; el gesto multitáctil se conserva, con prueba física pendiente. Los fondos narrativos/de práctica planos heredados no se presentan como geometría 3D convertida.

## Optimización de mapas D8 lentos — 2026-10-04

Las escenas **Temple** y **Mirror** aplican menos muestras de oclusión ambiental y una escala de render ajustada sólo para esos mapas; el resto de D8 mantiene su calidad habitual. Las comprobaciones de visibilidad de fichas ya consultan un índice espacial de la escenografía estática, siguen comprobando por separado los elementos móviles y conservan la máscara de Pixi mientras no cambie qué partes de la ficha quedan tapadas.

Verificación: build de producción Vite PASS (2.130 módulos); pruebas focalizadas PASS (**15/15 en 3 archivos**), incluidas geometría estática/móvil, máscara de oclusión y cámara D8; tipos de servidor PASS. La suite completa queda **331/332** por un fallo reproducible en `engine/server/game.test.ts` (resultado de combate), no relacionado con el render. El typecheck cliente conserva un diagnóstico en `apps/web/world.ts:1285` (`Camera.alpha`), en el cálculo de orientación anterior a este ajuste. No se midieron FPS con el MSI, un navegador físico ni el proyector; la fluidez real de Temple y Mirror sigue pendiente de esa comprobación.

## Verificación vigente — 2026-10-04 · D8 Babylon V41, navegación/oclusión/audio

Corregida la correspondencia de los seis mapas con casillas reales de 1,5 m: obstáculos del escenario, taberna efectiva, paredes finas, accesos y desniveles del templo. Grid, pies de fichas y selección consumen el terreno autoritativo; las zonas de aparición comparten una componente accesible. Los guardados D8 anteriores se migran una sola vez, conservando coordenadas legales y recursos. No se cambió el arte de Cena.

El inventario ya asigna el atlas de botín M5 sólo en Stormwreck. D8 deja de solicitar un recurso que su servidor de campaña no sirve, y el build Vite termina sin ese aviso.

La oclusión parcial utiliza el cuerpo de la ficha orientado a cámara y su pivote real, también al cambiar a pose tumbada. Corregidas repeticiones finitas de audio y conexión tardía; la selección de personaje se transmite inmediatamente a DM/proyector. Suite completa: **319/319 pruebas, 37 archivos**, tipos cliente/servidor PASS. Evidencia, integraciones y límites en [informe espacial/audio](docs/evidence/D8_SPATIAL_AUDIO_20261004.md). La herramienta de control del navegador interrumpió la revisión visual; no se afirma inspección final de los seis mapas, escucha de audio ni rendimiento físico. El lanzador recompila al próximo arranque seguro, sin cerrar la mesa real del usuario.

## Estado vigente — 2026-10-04 · D8, candidata jugable de principio a fin

Se conserva servidor autoritativo, persistencia y Babylon V40 existente. D8 ya registra cuatro componentes/resultados, inventario de misión derivado, notas y tres finales con empate/excepciones motivadas. Los primeros tres lugares pueden resolverse en cualquier orden, espejo al final. Se amplían encuentros hasta seis rosas/diez parroquianos sin curar al revelar; Reflejo genérico usa la forma del PJ ya en exploración, datos/estados propios e imitación tras original. Paredes bloquean ataques e hielo difícil consume doble movimiento.

Corregidos botones del arco tapados por la barra inferior, selección accesible de objetivo desde iniciativa, borradores DM y CA enemiga privada. Cargar conserva propietarios conectados y entrega snapshots completos a DM/dos PJ/proyector sin recargar. Se validan nuevas referencias antes de instalar saves y conservan diez puntos. Prueba real: arco→d20→crítico→daño15 aplicado una vez; red: seis escenas, cuatro componentes, final, restauración exacta, diez saves y reinicio/autocarga.

Guía DM/matriz/roadmap actualizados. Fases MVP técnicas acreditadas; no se afirma D&D2024 completo ni hardware físico/versión1. Preparados de Aoife, casos creativos, hielo frágil/bucle y vuelo se arbitran según guía; placeholder/animaciones específicas pendientes. Sin nuevos paquetes, assets externos, arte de Cena ni alteración de saves reales. Ver [informe](docs/evidence/D8_CLOSEOUT_20261004.md). Compilación en salidas aisladas: el lanzador recompila al próximo arranque seguro.

## Estado vigente — 2026-10-03 · D8 Night V35 integrado como candidata funcional

Por petición del usuario, D8 Night ya no se queda en el Playground: las seis escenas (`temple`, `garden`, `cafe`, `market`, `mirror`, `dinner`) se muestran en la mesa VTT con el render Babylon 2.5D V34 compartido como V35. La cuadrícula, las casillas transitables, los actores y objetos continúan definidos por el paquete de campaña y el servidor; la vista proyecta fichas y selección sobre el terreno. La cámara mantiene el encuadre oblicuo inicial de cada mapa y ahora ofrece giros discretos de 45°, inclinación acotada y zoom, como Stormwreck. El DM puede compartir el giro con jugadores y proyector; las preferencias locales se conservan por campaña y mapa. Los guardados D8 previos migran una vez a la nueva cuadrícula y reciben una marca de versión.

La ruta HTTP de configuración sólo publica geometría/ambiente visual saneados; `CANON`, interacciones narrativas y encuentros ocultos permanecen en el servidor. Candidata de aplicación `0.3.2-dev.7`, paquete D8 `0.3.0-dev.2`, fuente visual Playground `V35`. Este paso integra el render existente: **no crea aún texturas/escenarios nuevos ni cierra F3–F7**. Quedan para ciclos posteriores la revisión de arquitectura reutilizable y el trabajo artístico de escenarios, texturas, iluminación y VFX que ha pedido el usuario.

Verificación de `0.3.2-dev.7`: TypeScript cliente/servidor PASS; suite Vitest **214/214** PASS; build de cliente y servidor PASS; smoke aislado de D8 PASS con seis mapas, fichas, configuración sin secretos, recursos de audio, guardado privado y sincronización de giro DM→proyector; artefacto Playground V35 validado. No se ha inspeccionado esta candidata en navegador físico, Pixel 9a, MSI o proyector: confirmar inclinación y perspectiva, alineación del grid, movimiento táctil/teclado y transición de cámara entre las seis escenas con el usuario antes de aceptar visualmente. El render emplea texturas generadas por el motor existente y conserva el aviso de build del atlas M5 del Pecio, resuelta por el servidor en runtime.

## Campamentos V1.4.2 — actualización visual A1, 2026-09-27

`camp-a1-rooms` se ajusta a la planta canónica irregular: seis celdas abiertas a una plaza común, con estatua de Astalagan y hoguera. Las fachadas de piedra se ocultan al entrar en una habitación para conservar la lectura y el movimiento. La dirección añade materiales ilustrados, vegetación y detalles de fuego/ambiente; la cuadrícula, rutas, interacciones y decisiones del DM siguen separadas del arte. Verificación de esta candidata: suite completa **190/190**, typecheck cliente/servidor y build Vite aislado PASS. Aún falta la revisión del usuario en navegador/móvil/proyector físicos. La procedencia de las tres texturas originales del bosque continúa pendiente, como indica `LICENSES_AND_CREDITS.md`.

## Candidata visual de campamentos — 2026-09-26

El árbol de trabajo incorpora mejoras visuales de A1 y un primer pase del camino del bosque hacia Pleamar: materiales ilustrados para musgo, sendero y arroyo, además de vegetación y detalles de terreno. La cuadrícula, navegación y colisiones existentes se mantienen como contrato. Comprobación de esta candidata: typecheck de cliente/servidor PASS, 16 pruebas automatizadas de cámara/campamentos PASS y build aislado del cliente PASS. La aceptación visual del usuario y la revisión en móvil/proyector físicos siguen pendientes. Las tres texturas del bosque no tienen todavía una ficha de procedencia/licencia en el repositorio; consultar `LICENSES_AND_CREDITS.md`.

## Retiro del Dragón — integración 2026-09-24; repaso 2026-09-25

Escena inicial Babylon `dragon-rest` integrada desde Retiro V5.2 para *Los Dragones de la Isla de las Tempestades*. La aventura oficial se contrastó en A1–A5 (PDF, pp. 7–13). Hay superficies, colisiones, accesos, escaleras, seis celdas, puerta de A4, interacción manual de PNJ/objetos, zombis revelables por el DM y salida en barca al pecio; las salidas a Pleamar y al Observatorio están preparadas. Repaso 25/09: la guía privada del DM ya incluye el gancho del naufragio y aclara que pueden ir antes a Pleamar. La suite total actual (154/154) incluye la regresión de esta escena; los tipos de cliente/servidor y builds aislados pasan; no se ha certificado fluidez en dispositivo físico ni FPS. El timeout Vitest se amplió a 30 s porque las rutas integrales superan a veces el valor predeterminado de 5 s en Windows. El entorno actual usa Node 24.19 aunque `package.json` pide >=24.21; las verificaciones pasaron con aviso de motor. Véase [informe privado](campaigns/stormwreck-isle/private/RETREAT_INTEGRATION_20260924.md) y [roadmap](ROADMAP_V1.md).

## Estado vigente — 2026-09-25 · revisión 47 · M5: candidata técnica

El pecio continúa siendo un único escenario Babylon `wreck-ship`. M5 integra mar navegable y fondo escénico separado, espuma/oleaje, agua interior, cubierta/casco/arrecife texturizados, props con estados e iconos de botín, viento/lluvia/niebla/luces. La revisión 47 añade `deck-planks-art06.png`, cuadrícula de cubierta atenuada, rejillas/cabos decorativos y mantas en camarotes. La barca admite piloto y pasajeros, navegación casilla a casilla en mar, desembarco, persistencia y relevo de piloto. La candidata fue inspeccionada en navegador aislado; **no se afirma equivalencia con la referencia pictórica ni aprobación visual**. Falta opinión del usuario sobre arte; la prueba física y FPS pertenecen a M7. Ver [roadmap vigente](ROADMAP_V1.md) e [informe M5](campaigns/stormwreck-isle/private/m5/M5_ART_LAYER_IMPLEMENTATION_20260925.md).

## Corrección de inicio, PID reciclado y catálogo de mapas — 2026-09-26

La candidata de aplicación pasa a `0.3.2-dev.5`. `INICIAR.cmd` comprueba el puerto antes de compilar, para no interrumpir una mesa que ya está sirviendo sus archivos; una vez libre, recompila Vite y el servidor antes de iniciar. Los nuevos bloqueos guardan la hora de inicio del proceso y, para los anteriores, Windows la compara con la fecha del bloqueo: un PID reciclado se archiva en `recovery` sin tocar al proceso que ahora lo usa. La opción R se limita a la campaña elegida, cierra su mesa con solicitud autenticada incluso si escucha en otro puerto, y preserva programas ajenos. `/api/campaign` del DM en una instancia nueva devuelve el pecio y los cinco campamentos. Vitest 186/186, tipos, builds, cierre en puerto alternativo y arranque con lock legado pasan en pruebas aisladas. No se ha iniciado una mesa real del usuario ni probado hardware físico; falta confirmar el arranque con su acceso directo.

## Registro histórico — 2026-09-25 · revisión 36 · M5: mar y cobertura de assets

### Corrección vigente r35

El viaje deja a cada personaje sobre la barca (`sea`, 24,15), a una casilla de P01; desde allí sube caminando a C1. La ruta alternativa nada por el carril exterior (filas 15–16) hasta P16/C9 y vuelve por el mismo hueco, sin engancharse en P01. Una integración real con dos clientes verifica que Mia regresa individualmente al Retiro con confirmación del DM mientras Mike se queda en C3 y el foco no cambia. Suite 154/154 e integración compilada PASS; typecheck de servidor PASS; build/typecheck aislados cliente/servidor PASS en esta candidata. El servidor local r35 está en `http://127.0.0.1:4399`, ligado a loopback y con datos desechables separados. Recuperación: base r32 + delta r34 + delta r35, en ese orden.

### Alcance visual vigente r36

El usuario pide completar el mar y crear los assets finales de **todos** los objetos interactuables/recogibles y de toda la decoración de C1–C9, cofa y exterior. La textura repetible de agua actual es provisional, no el mar ilustrado de las referencias. Puertas/cajas genéricas, mobiliario y utilería `blockout` tampoco cuentan como assets finales. El inventario por zona, estados y criterios está en [plan de cobertura M5](campaigns/stormwreck-isle/private/m5/M5_ASSET_COVERAGE_PLAN_20260925.md). Mantener secretos fuera del arte base y no tocar la geometría navegable.

La decisión del usuario es vinculante: C1–C9 y la cofa son **un solo mapa lógico `wreck-ship`**, con superficies/niveles conectados; no son pantallas ni mapas separados. C1 y C4–C7 comparten `main`; C2, C3, C8, C9, `crow` (cofa) y `sea` son superficies del mismo terreno Babylon 44×20 a 1,5 m/casilla. El capítulo 3 (PDF pp. 22–27; mapa 4 en p. 25) se auditó para todo el ciclo desde el viaje en barca y los dos abordajes hasta la salida/desenlace. Ver [auditoría M4](campaigns/stormwreck-isle/private/M4_ARRIVAL_AND_DEPARTURE_AUDIT_20260925.md), [roadmap vigente](ROADMAP_V1.md), [estándar visual](docs/PECIO_VISUAL_STANDARD_20260922.md) y [gate de C1–C9](campaigns/stormwreck-isle/private/C1_GREYBOX_GATE.md).

M4 registra las rutas de barca/jarcia y brecha submarina, la regla del timón y C4, el estado de C5/C6, encuentros y d6 único de C8, tesoro/paquete secreto de C9, vuelta de la arpía y cierres de la maldición sin automatizar tiradas. Esta auditoría añadió los hallazgos individuales de C4 y la cofa, los ocultó correctamente tras la puerta/superficie y corrigió la condición del sueño del clérigo para la ruta de destrucción a bordo. Al generar la candidata M7 se detectó una referencia a helper de animación fuera de su clase; ahora es compartido por el estado y servidor, y hay prueba de regresión. El panel privado del Retiro ofrece el gancho Runara/Varnoth/Rix y deja a elección el orden Pecio/Pleamar; el panel del Pecio explica ambos abordajes. La prueba de sockets con dos jugadores recorrió llegada, abordaje P01, separación de superficies, C2/C8 y C3/timón; integración de objetos y guardado/restauración también se comprobaron en instancias temporales. El helper de prueba se corrigió para enviar keyup después de una pulsación de una casilla; no era una reproducción fiel dejar la dirección mantenida.

El resultado sigue siendo un **greybox con materiales candidatos M5**, no el acabado HD-2D/2.5D final. En un cliente real de jugador con datos aislados se corrigió el desvío diagonal de la cofa. W subió a ella, rodeó el mástil, S volvió a C1 y tras girar 45° W siguió la cámara. En una segunda comprobación D avanzó de `24,6` a `25,7` y A regresó a `24,6`, manteniendo la escena `wreck-ship`; el DM sólo observó. La simulación del servidor es 30 Hz, los snapshots 20 Hz y cada casilla tiene paso de 220 ms. Esto valida el rumbo y el retorno de una casilla, no mide latencia/FPS ni sustituye la sensación subjetiva del usuario en su teclado/móvil.

La primera capa artística M5 carga `deck-planks-art01.png` en cubierta y casco; se conservan agua/oleaje, viento marino y luces localizadas C8/C9; las cuatro antorchas siguen apagadas. La retícula del barco mezcla alpha real (`#88968b`, 0,66); geometría, selección, alturas y colisiones permanecen independientes. Sigue siendo un greybox en fase de arte, no el acabado de las referencias: M5 espera revisión visual del usuario y faltan paredes/props modulares. Suite **154/154**, integración ampliada con dos jugadores y tipos/builds aislados PASS; no se midió FPS sostenido ni se probó hardware físico. La candidata r35 se reconstruye desde base M6 r32 aplicando r34 y r35; los overlays excluyen guardados, QA saves, dependencias, `dist` y fuentes originales. Ver [gate C1–C9](campaigns/stormwreck-isle/private/C1_GREYBOX_GATE.md), [worklog M5](campaigns/stormwreck-isle/private/m5/ART_WORKLOG_20260925.md), [guion físico](campaigns/stormwreck-isle/private/m5/M6_M7_PHYSICAL_PLAYTEST_20260925.md) y [roadmap vigente](ROADMAP_V1.md).

## Histórico — prioridad del 2026-09-22, sustituida por el trabajo C1–C7 del 23/09

M1+M2 forman la candidata técnica `0.3.2-dev.1`; `0.3.2-dev.2` inicia su corrección visual: recorrido A–D con mapa táctico visible y estados locales para puerta/listón C4, tablón/trampa C6, tres contenedores C8 y cofre/paquete C9. Es ejecutable y compatible con guardados 0.3.1, **no una aceptación física ni el capítulo completo**. Orden único en [ROADMAP_V1.md](ROADMAP_V1.md).

- Versión de trabajo `0.3.2-dev.2`; última aceptada Alpha0.2 RC2. La malla Babylon A–D demostró geometría, pero ocultaba sus capas de mapa y se veía como plataforma vacía. A–D vuelven a la composición Pixi mientras se preparan fondos HD-2D compatibles; la geometría/puertos/estados se conservan.
- Reutilizar LAN/controles/objetos/guardado/combate/audio y originales locales:40PNG zombi y57arpía. La fuente viva de Drive aporta además43PNG de Zombie1,2 de Arpía1,62 de Arpía3,23 del gul y8 recursos de entorno del pecio utilizables por nombre; todos requieren descarga, inspección visual e integración antes de darse por terminados. Animaciones Stormwreck vacías pese a soporte del motor. F0/F1/F2 D8 cerradas según evidencia19/09; F3–F7 no certificadas, conservadas fuera del camino crítico del pecio.
- Babylon9.26 queda preparado para A–D, pero no se vuelve a presentar allí hasta alinear arte, cámara, fichas y grid. Pixi muestra de nuevo las capas tácticas completas durante esa corrección. C8 declara agua/terreno difícil y C9 oscuridad0,9/revelado por autorización.
- Cuatro mapas alineados: A superiores/exterior C2/C3/cofa; B principal C1+C4–C7; C inferior C8; D bodega C9. C4–C7 no son piso separado de C1. Un plano/estado único, conexiones dirigidas.
- Evidencia21/09: **85/85tests (7 archivos), typecheck cliente/servidor PASS,84 rutas de arte/audio presentes (46audio)**. No nuevo build ni pruebas físicas; no acredita mapas inexistentes.
- **M1a COMPLETADO como fuente, 22/09:** se conserva íntegro en `private/m1a/`; referencias Drive siguen `STUDY`, no copiadas.
- **M1b COMPLETADO técnicamente, 22/09:** protocolo18; escena única autorizada, ubicación individual, foco separado, P01–P16 y persistencia compatible. Evidencia:89/89, tipos/build y navegador local.
- **M2 COMPLETADO técnicamente, 22/09:** protocolo19 y ADR-026. `P06` exige retirar listón y abrir puerta; C6 conserva revelado/trampa gastada/rearme/propietario; C8 aporta tres contenedores con IDs propios; C9 distingue cofre sumergido/superficie, contexto de apertura y propietario de paquete. SaveV1 añade estado opcional y migra guardados0.3.1 añadiendo sólo objetos M2 ausentes. 93/93 pruebas, typecheck, integraciones general/objetos/save y build completo de producción PASS. La QA de navegador demostró estados y Babylon, pero el usuario identificó con razón una regresión visual: faltaba el mapa y la cámara no seguía el estándar HD-2D aportado. [Estándar visual](docs/PECIO_VISUAL_STANDARD_20260922.md) registrado; **siguiente prioridad: Sol High, M2.5 recuperación visual**, antes de M3a.

Copia recuperable M2: `backups/pecio-m2-0.3.2-dev1-20260922.zip`, 574 680 305 bytes, 854 entradas comprobadas, SHA-256 `A1547C835013350FF8A689CD6D83773FC228F371DB04FAB434148CFFA68E1F2B`. Incluye código, build, campañas y documentación; excluye guardados reales, temporales, dependencias y copias anteriores. Contiene fuentes privadas del pecio y no debe publicarse.

Copia recuperable de la corrección visual inicial: `backups/pecio-m25-0.3.2-dev2-20260922.zip`, 574 683 492 bytes, 855 entradas comprobadas, SHA-256 `B8E6129D78322E4157BBA3920040D0216F8C66949430A65776D3EFF9404CF96B`. Conserva el mapa táctico visible en A–D, pero no sustituye la futura entrega de fondos HD-2D; contiene material privado y no debe publicarse.

Detalle privado: [auditoría](campaigns/stormwreck-isle/private/PECIO_AUDIT_20260921.md) y [plan espacial A–H/conectividad](campaigns/stormwreck-isle/private/PECIO_SPATIAL_PLAN.md), fuera de HTTP. Lo inferior conserva evidencia histórica, no sustituye esta prioridad ni recuentos.

## Histórico — prioridad del 2026-09-18, sustituida

El usuario encarga a Astra auditar D8 Night y preparar la implementación por fases para Sol, reutilizable en Stormwreck. Ver [auditoría del18/09](docs/D8_NIGHT_AUDIT_20260918.md) y [ruta de Sol F0–F7](docs/D8_NIGHT_SOL_ROADMAP.md). Es el orden de trabajo inmediato; el estado histórico inferior no acredita que esos hallazgos estén corregidos.

Comprobado en esta auditoría:50/50tests y tipos cliente/servidor pasan;12diagnósticos adicionales reproducen fallos de combate/estado. Roster actual D8: María y Aoife, no tres PJ provisionales. Babylon está instalado pero la escena jugable sigue con Pixi. No se modificó producción ni los guardados; aceptación de navegador/móvil y correcciones quedan para Sol. No hay nueva RC aceptada.

Actualizado: 2026-09-16. La carpeta de trabajo contiene **Alpha 0.3.0 DEV1**, todavía sin RC ni aceptación física. Alpha 0.2.0 RC2 sigue siendo la última versión aceptada. La familia v4 de puerta ya está integrada, pero su aceptación visual/física y subcasos físicos siguen pendientes.

## Inicio de mesa

`INICIAR.cmd` pregunta al DM qué campaña abrir antes de iniciar el servidor: Isla de las Tempestades o D8 Night. Cada elección conserva su slot de guardado independiente. Mientras no se defina `DM_PASSWORD`, `/dm` crea una sesión local automáticamente y no muestra contraseña; si se vuelve a definir esa variable, el formulario reaparece sin cambiar el resto de la mesa.

## Alpha 0.3 DEV1 — registro del 16/09, ampliado por F1/F2

Implementados formato privado SaveV1/legado0, checksum, hidratación de escenas/PG/inventario/objetos/audio, checkpoint atómico con backup, lock de escritor, autosave, exportación privada, preview y restore confirmados, epoch de mundo y recuperación explícita. Pruebas actuales: typecheck/build PASS, Vitest 39/39, integraciones generales/de objetos PASS y `scripts/alpha03-smoke.mjs`/`scripts/one-shot-smoke.mjs` PASS con servidores hijos, cierre/reinicio, corrupción de active y recuperación de backup en carpeta temporal. Ninguna prueba usa la mesa del usuario en puerto3000. Se conserva el estado anterior en recovery antes de restaurar; input, sesiones de PJ, SFX y undo no reaparecen al cargar. La matriz honesta de cobertura está en `docs/ALPHA_0_3_IMPLEMENTATION_RESULTS.md`.

Pendiente para RC: aceptación visual/física de `objects-v4`, QA de navegador completa, cobertura P01–P15/D01–D05 que falta y recorrido físico D06/móviles. Varios borradores ImageGen anteriores se descartaron por desalineación y perspectiva. Babylon.js 9.26.0 (Apache-2.0) ya está instalado: hay terreno sintético, malla, grid proyectado, oclusores, luz, cámara y prueba `NullEngine`, pero no render3D integrado ni escena jugable. El one-shot privado aportado por el usuario ya tiene un pack separado de seis localizaciones, con mapas, actores de escena y tres PJ provisionales; falta pulido narrativo, balance y QA final.

Copia local de trabajo DEV1: `backups/alpha-0.3.0-dev1-20260915.zip` (20 633 284 bytes), SHA-256 `4574020BE1D040A67F1F900657E495093196D133720F1252CC8CE92B7C953911`, 199 entradas ZIP comprobadas. Incluye código/build/assets/documentación y la semilla privada del servidor necesaria para arrancar, así que **no debe compartirse públicamente**; excluye saves, capturas de evidencia, originales aportados y el ZIP del one-shot. No reemplaza las copias RC2/RC1 conservadas.

## Alpha 0.2.1 RC1 — registro histórico

El timón está integrado en los objetos por escena, sin `wheelStates` paralelo ni copia lógica. Tiene soporte fijo, separación atómica con destino, estados sujeto/caído, cuatro rotaciones, daño y restos. Puerta y caja también admiten intacto/dañado/roto; los restos dejan pasar actores pero conservan su ubicación para que otro objeto no se superponga. Deshacer valida ocupación y no desplaza personajes. Las solicitudes quedan ligadas a sesión, controlador, escena y versión del objeto y se invalidan por movimiento, desconexión, cambio de escena, mutación o caducidad.

Evidencia: typecheck cliente/servidor PASS; Vitest **23/23 PASS**; build Vite 842 módulos y servidor TypeScript presentes en `dist`; auditoría Alpha 0.2 **12/12 PASS**; integraciones general y de objetos Alpha 0.2.1 PASS; `scripts/audit-alpha021.mjs` termina sin fallos automatizados y conserva marcadores separados de comprobación en navegador. DM/Player/Projector fueron comprobados a 390×844, 844×390 y 1920×1080, con las tres consolas limpias.

Arte v3 terminado: cubierta limpia sin timón/pedestal horneados, soporte, variantes del timón, puerta y caja, y restos transparentes. La puerta cerrada se rehízo como barrera estrecha en planta para respetar la cámara cenital/oblicua. El editor DM previsualiza el sprite final y la huella; jugador y proyector sólo reciben estados aplicados. La rueda montada/cogida conserva lectura circular de rueda vertical y debe juzgarse en la prueba física por si necesita una elipse más marcada.

**Hallazgo físico del 15/09:** el usuario confirmó timón único, separación sin duplicado, traslado/giro, daño y restos, colisiones funcionales de puerta, deshacer ocupado, conexión y audio. También aportó dos capturas que demuestran que la puerta abierta todavía usa una hoja casi frontal mientras la cerrada usa una barra horizontal cenital: **FAIL visual**. El soporte del timón parece desplazado respecto a la cuadrícula según el usuario, sin posición alternativa todavía inequívoca. El usuario confirmó después preview rojo ocupado/bloqueado y Escape que elimina borrador/huella y vuelve a amarillo; no describió por separado el verde válido ni cuatro giros individuales. Móvil vertical/horizontal aplazado expresamente al cierre0.3. Informe detallado en `docs/ALPHA_0_2_1_PHYSICAL_REPORT_20260915.md`.

Copia recuperable RC1: `backups/alpha-0.2.1-rc1-20260914.zip` (20 528 652 bytes), SHA-256 `444F3A09524DA4AB26B4A0AF62A55B5505BF568D68EF5E520E407EC8F5352EF2`; ZIP comprobado como legible. La copia DEV1 y la aceptada `alpha-0.2.0-rc2-final-20260914.zip`, SHA-256 `28588478A586510BAD5AE3BA174BFD806AFE26E3BFCC1BD35743C3BC12F96E7A`, se conservan sin sobrescribir.

**Última versión aceptada operativamente por el usuario: Alpha 0.2.0 RC2.** La candidata histórica 0.2.1 RC1 tuvo arranque y recorrido físico parcial, pero no fue aceptada mientras la puerta abierta/cerrada siguió visualmente incoherente. La carpeta actual ya es DEV1 de 0.3.

## Qué incluye RC2

- Servidor de campaña inyectada: el motor y los clientes ya no importan Stormwreck ni dependen de sus IDs. `/api/campaign` entrega únicamente el DTO público validado; secretos, PG, inventarios, notas, criatura y reglas del timón se componen en servidor.
- Puerta cerrada/abierta/bloqueada con serialización privada del bloqueo, colisión autoritativa y deshacer. Una puerta bloqueada debe pasar a cerrada antes de abrirse.
- Caja 2×1 con giro, recolocación discreta, colisión por huella, reservas de spawns/PJ/pasos/criatura visible y deshacer por escena.
- Editor DM con mapa real, selección por mapa/lista, contorno, giro, elección de destino, preview privado válido/inválido y Aplicar/Cancelar/Escape.
- Fondo 576×432 y sprites separados para puerta abierta/cerrada y caja horizontal/vertical. Cuadrícula runtime permanente, tokens y props con orden visual común.
- Revisiones por escena, CAS de dos DM, fingerprint idempotente, reconexión al estado vigente y guardas frente a cargas antiguas.
- Se conservan aproximación, cubierta, joystick/WASD, timón, criatura, inventario/PG, cámaras y audio por capas con tres SFX.

## Evidencia técnica histórica de RC2

- Typecheck cliente y servidor: PASS.
- Vitest: **18/18 PASS**, incluida campaña sintética sin timón ni criatura.
- Build de producción: PASS, 842 módulos Vite y servidor TypeScript.
- Auditoría Alpha 0.2: **12/12 PASS**, 0 fallos; resultados en `docs/ALPHA_0_2_AUDIT_RESULTS.json`.
- Integración general en servidor nuevo y puerto libre: PASS (HTTP privado, permisos, tres roles, dos jugadores, timón, criatura, PG/inventario, reconexión, audio/SFX).
- Integración de objetos: PASS (tres roles, puerta, caja, stale refresh y undo).
- Navegador final DM/Player/Projector: login, catálogo, mapa, arte, preview privado, asignación de Mike y preparación del proyector comprobados; consolas sin errores ni avisos tras corregir la precarga.
- Búsqueda de imports/literales: sin imports de `campaigns/` en `engine/` o `apps/web/`.

## Recuperación y ejecución

- Rollback aceptado: `backups/alpha-0.1.1-rc4-20260913.zip`, SHA-256 `9029B7B26B854EF439CF4DEC14CA38A6C9595036CE117735A921ABEF615EE299`.
- Copia de trabajo previa: `backups/astra-pre-review-0.2-20260913-223941.zip`, SHA-256 `3614A28B36EE2ACBECD400EFC2D31FD639CA1BB26ED7AE3AA0BF99B7012CC32F`.
- Copia final RC2 con documentación de relevo: `backups/alpha-0.2.0-rc2-final-20260914.zip` (15 867 968 bytes), SHA-256 `28588478A586510BAD5AE3BA174BFD806AFE26E3BFCC1BD35743C3BC12F96E7A`. La copia `alpha-0.2.0-rc2-20260914.zip` se conserva como instantánea intermedia y no se sobrescribió.
- Los comprobadores usan servidores propios en loopback y puertos libres. No deben reiniciar ni reutilizar la mesa abierta por el usuario en el puerto 3000.
- En RC2 el estado de partida seguía sólo en memoria. DEV1 de Alpha 0.3 ya tiene persistencia, aún sin aceptación física.

## Siguiente versión

**Dirección posterior aprobada (15/09):** conservar arquitectura web/servidor y adoptar Babylon.js para sprites2D en escenarios3D; Astra y Sol realizan el trabajo principal y Terra/Luna reciben bloques acordes a su capacidad cuando ahorran trabajo. `docs/HD2D_DIRECTION.md` y ADR-023 fijan inmersión de mesa, percepción individual futura en móvil, recursos reutilizables y alcance. Babylon 9.26.0 ya está instalado, pero sólo sustenta un adaptador de terreno aislado; el recorrido3D completo sigue dependiendo de la integración0.3.1 y de aceptar0.3.

El gate físico de RC2 permanece **PASS operativo**. El intento de corrección de puerta en 0.2.1 sólo arregló la variante cerrada: la abierta sigue casi frontal y ambos estados no comparten lectura de marco/bisagra. La nueva observación física prevalece sobre la QA de navegador anterior.

**La histórica Alpha 0.2.1 RC1 quedó técnicamente verificada.** El contrato, ADR-017–019 y fixture siguen siendo referencia histórica. En ese corte se usó protocolo v3; DEV1 de0.3 usa v4 con runtimeEpoch y conserva DTO público v2.

La evidencia actual ya incluye ejecución de las funciones nuevas: Vitest 23/23, integraciones de socket y `scripts/audit-alpha021.mjs`, además de QA de navegador. El comprobador de diseño sigue validando nueve rutas, seis casos de ubicación y cuatro giros. No se añadió ninguna dependencia.

Las correcciones de borrador/revisión/conexión, `step.from`, preview con sprite, validación unificada y reutilización de props ya están incorporadas. RC2 se conserva como rollback aceptado. La futura confirmación física debe distinguir qué se observó de la evidencia automatizada.

Siguiente resultado exigido: **cerrar la puerta y las pruebas faltantes de Alpha0.3 conjunta**, siguiendo `docs/NEXT_MODEL_PROMPT.md`. Astra cerró ambos contratos, ADR-020–022, fixtures y matriz de aceptación; la persistencia ya está en DEV1. El usuario autoriza completar0.3 antes de comprobar puerta y móvil: no existe gate físico intermedio0.2.1 ni aceptación por inferencia.

Contratos vigentes: `docs/ALPHA_0_2_1_DOOR_VISUAL_CONTRACT.md`, `docs/ALPHA_0_3_PERSISTENCE_CONTRACT.md` y `docs/ALPHA_0_3_ACCEPTANCE_PLAN.md`. `node scripts/check-alpha03-design.mjs` verifica sólo fixtures de diseño; la implementación tiene ahora pruebas runtime propias. El descubrimiento preparatorio queda histórico y no prevalece sobre el contrato.

Antes de todo componente o asset nuevo se aplica el gate de reutilización de `ROADMAP_V1.md` y `docs/OPEN_SOURCE_REVIEW.md`: se estudian alternativas libres/gratuitas, pero sólo se incorporan si licencia, procedencia, transformabilidad y encaje técnico/artístico justifican el coste. Se mantienen dados y decisiones en mesa, secretos sólo en servidor, estética táctica pixel art y SFX PCM actuales como backlog artístico.

### Registro de cierre técnico Alpha 0.2.1 RC1 — 2026-09-14

Luna Reserve completó el encargo funcional y visual iniciado por Sol sin subagentes ni cambio automático de modelo. La prueba física está deliberadamente pendiente. La copia final RC1 y su hash están registrados arriba; las copias RC2 aceptada y DEV1 siguen disponibles.
