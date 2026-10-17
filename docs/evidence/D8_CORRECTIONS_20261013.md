# Auditoría de correcciones D8 — 13 octubre 2026

> Informe histórico de V51. Las nuevas fotografías revelaron fallos que esta auditoría técnica no había detectado. El estado vigente, las correcciones de V52 y los límites de aceptación están en [D8_V52_CORRECTIONS_20261013.md](D8_V52_CORRECTIONS_20261013.md). No interpretar esta versión histórica como aceptación visual de V52.

## Resultado

Build local V51, generada con el procedimiento oficial y V50 archivada. La segunda auditoría detectó y corrigió omisiones reales de V50: vigas de puerta sin habitación asociada, seguimiento de cámara que alteraba la inclinación/zoom manuales, dependencias ausentes del paquete Playground, luz azul que anulaba el atardecer del templo, alfombras elevadas, caballo demasiado separado del abrevadero, falta de sombras locales y sonidos que solo estaban disponibles manualmente.

Se conservaron los escenarios, sus actores y mecánicas. No se redujo la escala de los mapas. La ampliación del patio de la cena conserva las casillas anteriores y añade seis filas, 9 m hacia Z positivo. El punto 18 sigue parcial: no se incorporaron tos/sollozos/carraspeo. La aceptación visual y la medición de FPS/memoria siguen pendientes; las pruebas sin GPU no las sustituyen.

## Revisión por escena

| Escena | Cambios de código | Estado de validación |
|---|---|---|
| Templo | Cierres y piezas de relleno para juntas; cubierta de nave y vestíbulo con una habitación común; vigas/travesaños asociados tras calcular su posición mundial; estatua refinada; velas con luces reales; key light cálida y menos luz ambiental; alfombras finas a distinta altura; ampliación transitable y casas en la aproximación del pueblo. | Construcción real y ocultación exterior/interior verificadas sin GPU; navegación y todos los asientos libres pasan pruebas. Juntas, estatua y lectura de aldea pendientes de capturas. |
| Jardín de la señorita Fritz | Fritz dentro; lámparas fuera del acceso; puerta, tejado y vigas con cutaway corregido; flores con viento. Seguimiento de cámara independiente sin recalcular inclinación/zoom al mover el objetivo. | Construcción real comprueba tejado visible fuera/oculto dentro y viga asociada. Cámara independiente: entrada 25°, ajuste manual y restauración exterior correctos. Capturas pendientes. |
| Café No-Me-Olvides | Madera interior y pavimento exterior texturizados; sillas/alfombra y parroquianos bebiendo; chimenea con varias llamas; farolas reales, sombras locales y menos luz general; cubierta con cutaway. Caballo acercado al borde del abrevadero, ocho direcciones × cuatro fotogramas; distraerlo hace salir a los tres clientes. Vino inventariable y Sigilo físico CD18 al pasar a menos de 1,5 m; dos clientes distintos molestados activan combate. | Inventario, posiciones, migraciones que respetan ajustes del DM, salida de clientes y reglas pasan pruebas. Audio automático: laúd 7 %, fuego 14 %, vasos/bebida/silla ocasionales cada 18–42 s; pausa al salir clientes, combatir, desconectar o silenciar todos los canales. Tos/sollozo pendientes por descarga bloqueada. Estética y escucha final pendientes. |
| Mercado | Vaca colocada frente al abrevadero con niños cerca y cuerda visible cuando corresponde; carnicero adelantado; sombras y contactos refinados. | Posiciones y accesibilidad de actores pasan regresiones; falta captura visual nueva. |
| Espejo | Contorno real del hielo conservado; rescate legal del DM a 0 PG; sombras locales y contactos para pedestal, espejo, cristales y rocas. | Prueba verifica rescate sin curar, guardado y movimiento propio tras recuperar PG mediante el DM. Se generan 15 contactos antes ausentes; calidad visual pendiente. |
| Cena | Mueble retirado del acceso; sillas orientadas hacia la mesa y asiento interactivo; suelo y patio ampliados 9 m al norte con navegación en casillas de 1,5 m. | Prueba nueva confirma que las casillas anteriores no se desplazan y que la zona añadida es transitable; prueba de asientos/puertas también pasa. |

## Comprobación de los 36 puntos

«Implementado» significa corrección en fuentes, no aceptación visual automática. «Runtime» se refiere a construcción Babylon real con NullEngine, sin GPU. Todas las apariencias requieren todavía capturas cercanas, medias y lejanas de V51.

| Nº | Solicitud / resultado | Evidencia y estado |
|---|---|---|
| 1 | Juntas arquitectónicas cerradas con piezas de unión. | Implementado; acabado de todas las juntas pendiente de revisión visual. |
| 2 | Entrada interior a 25° y orbitado manual. | Pruebas de controlador y cámara Babylon independiente; no sustituye el encuadre táctico de combate. |
| 3 | Vigas/puertas/tejados no obstruyen al entrar o cruzar la línea de visión. | Runtime: ninguna viga auditada sin habitación; metadatos sobreviven al agrupado. |
| 4 | Alfombras sin superficies coplanares ni flotación de varios centímetros. | Runtime comprueba cruces; bordes/capa superior milimétricos. Captura pendiente. |
| 5 | Silla orientada hacia mesa y asiento interactivo. | Todas las orientaciones de config y todos los asientos libres de templo/cena probados. |
| 6 | Velas reales, sombras/contactos, atardecer y menos ambiente. | Runtime templo: luz cálida, 37 emisores locales, 3 mapas de sombras; balance visual pendiente. |
| 7 | Estatua refinada en manos, rostro, pliegues y alas. | Implementado; aceptación artística pendiente. |
| 8 | Grid ampliado respetando obstáculos y accesos. | Navegación física, objetivos y actores alcanzables en pruebas. No permite atravesar muros/agua. |
| 9 | Reducción proporcional opcional. | No aplicada: se conservan dimensiones; se limita el coste de sombras y se agrupa geometría. Rendimiento real pendiente. |
| 10 | Templo integrado en la aldea. | Casas/caminos existentes acercados a la aproximación, con terreno coherente; lectura lejana pendiente. |
| 11 | Acceso Fritz despejado de farolas y obstáculos. | Implementado y navegación probada; captura pendiente. |
| 12 | Fritz dentro de casa. | Posición authored y migración de guardados probadas; ajustes personalizados del DM preservados. |
| 13 | Techo/puerta visibles fuera, viga oculta dentro. | Runtime jardín: 11 piezas de cubierta, cero ocultas fuera y cero visibles dentro. |
| 14 | Flores con movimiento de viento. | Animación ligada a intensidad de viento; inspección visual pendiente. |
| 15 | Suelo de aldea variado; casas sin material azul de relleno. | Texturas/materiales corregidos; comparación visual pendiente. |
| 16 | Café interior a 25° ajustable. | Mismo controlador de entrada/manual/salida que el jardín; prueba del controlador y seguimiento. |
| 17 | Clientes sentados bebiendo en local decadente. | Posiciones/asientos y atlas verificados; gesto triste/ambiente final pendientes visualmente. |
| 18 | Audio leve combinado con efectos ocasionales. | Parcial: laúd, fuego, vasos, bebida y silla automáticos probados; falta tos/sollozo/carraspeo y escucha. |
| 19 | Barras delante de sillas eliminadas. | Builder corregido; captura cercana pendiente. |
| 20 | Llamas de chimenea mejoradas. | Varias lenguas animadas y luz real; visual final pendiente. |
| 21 | Caballo bebiendo junto al agua, ocho direcciones. | 32 recortes distintos dentro de PNG RGBA con esquina transparente; posición al borde probada. Animación visual pendiente. |
| 22 | Espantar caballo hace salir clientes. | Prueba recorre rutas a tres destinos exteriores distintos, abre puerta y no inicia combate. |
| 23 | Vino de la barra recogible. | Inventario, recogida única y restauración probados; botella nativa se oculta tras recogida. |
| 24 | Sigilo CD18 bajo 1,5 m; dos molestados alertan a todos. | Pruebas: espera tirada física/DM, 18 pasa, dos clientes distintos activan iniciativa pendiente con todos los clientes visibles. |
| 25 | Tejado Café visible fuera/oculto con vigas dentro. | Runtime: 15 piezas de cubierta, cero ocultas fuera y cero visibles dentro. |
| 26 | Farolas Café iluminan y proyectan sombras. | Emisores reales y mapas locales pequeños; calidad/alcance de todas las sombras pendientes visualmente. |
| 27 | Árboles fuera de fachadas. | Distribución de árboles corregida en fuentes; no se certifica ausencia universal de intersecciones sin capturas. |
| 28 | Vaca frente al agua, niños cerca sujetándola. | Posiciones probadas; sprite existente de guía y cuerda dinámica ligada a posiciones reales. Captura pendiente. |
| 29 | Carnicero delante de puestos. | Posición y accesibilidad probadas; visibilidad desde cámaras pendientes. |
| 30 | Mercado con sombras y contacto. | Runtime: 3 mapas de sombras, 19 contactos; composición visual pendiente. |
| 31 | DM puede rescatar incapacitada; despierta puede moverse. | Prueba de 0 PG sin automovimiento/curación, rescate legal, restauración y movimiento tras recuperar PG. |
| 32 | Espejo con sombras y contactos. | Runtime: 3 mapas de sombras, 15 contactos; apariencia pendiente. |
| 33 | Entrada cena sin mueble bloqueando. | Mueble fuera del acceso; navegación/interacciones probadas. |
| 34 | Cena con sombras. | Runtime: 2 mapas de sombras, 11 contactos; apariencia pendiente. |
| 35 | Sillas cena hacia mesa, utilizables. | Orientaciones y todos los asientos libres probados; silla de PNJ ocupado no se permite duplicar. |
| 36 | Suelo ampliado sin corte brusco. | Seis filas nuevas preservan casillas anteriores; terreno continuo generado; unión visual pendiente. |

## Validación técnica

- 120 pruebas aprobadas en 22 suites seleccionadas de servidor/cliente, incluidas navegación, cámara, asientos, cutaway, hielo, guardados, animaciones, caballo, vino, audio ocasional, reloj y dependencia exacta del paquete Playground.
- TypeScript del cliente y del servidor: correcto.
- Build de producción del cliente: correcta, 2213 módulos transformados. No sustituye la prueba interactiva del navegador ni una medición de coste GPU.
- Sintaxis de `renderer.ts` y `d8night.config.ts`: correcta.
- Paquete generado: `playground_current.json` y `playground_v51.json` idénticos; Unicode decodificado igual a `payload.code`; las tres fuentes de Playground y dos módulos compartidos exactos y con sintaxis válida; todos los imports relativos resueltos; V50 archivada y única versión numerada activa V51.
- El render limita los objetos que proyectan sombras globales a 192 en modo integrado y 256 en Playground. Añade como máximo dos mapas locales: 256 px para luz puntual (seis caras) o 512 px para foco, hasta 96 objetos cada uno. Caché invalidada al cambiar puertas, ocultación o espejo. No se midieron FPS ni memoria reales; estos límites no equivalen a un benchmark.
- La capa de luz natural pone el Café en atardecer cuando la hora está en automático; las luces locales de velas y farolas son emisores reales, no solo materiales brillantes.
- Las partidas nuevas D8 empiezan a las 19 h (atardecer); no se cambia el reloj de partidas guardadas ni el inicio de Stormwreck.

### Construcción real sin GPU

`scripts/d8-renderer-audit.ts` construye las seis escenas con el renderer y las texturas procedurales reales, usando NullEngine y canvas nativo. Resultado: cero límites geométricos no finitos, cero geometrías eliminadas en las listas de luces y cero vigas auditadas sin habitación. No constituye prueba de antialiasing, materiales compilados en GPU, estética ni rendimiento.

| Mapa | Meshes | Piezas de cubierta | Mapas de sombras | Contactos |
|---|---:|---:|---:|---:|
| Café | 646 | 15 | 3 | 22 |
| Templo | 992 | 18 | 3 | 48 |
| Cena | 637 | 11 | 2 | 11 |
| Jardín | 722 | 11 | 3 | 9 |
| Mercado | 1054 | 0 | 3 | 19 |
| Espejo | 395 | 0 | 3 | 15 |

Todas las habitaciones probadas: cubierta habilitada desde fuera y ninguna pieza de cubierta habilitada dentro. Cámara independiente: entrada 25°, beta manual 0,96 conservada y beta exterior 1 recuperada; seguimiento tampoco modifica alpha ni radio. Los puestos abiertos del mercado y la cueva del espejo no se convierten en casas nuevas.

## Pendiente de aceptación visual

No se pudieron producir capturas posteriores desde cerca, media distancia y lejos: el navegador rechazó abrir el visor local por su política de seguridad. No se intentó eludirlo mediante otra superficie o automatización de navegador. Las capturas anteriores no son prueba de V51. Por tanto, no marco como verificados visualmente todos los solapes, objetos flotantes, juntas, calidad de sombras, lectura de tejados o FPS/memoria. Hace falta revisar `playground_current.json` V51 o la partida VTT en un visor autorizado. No hay siguiente mapa marcado como «aceptado» hasta completar esa inspección.

## Referencias del cambio

- Fuentes V51: `campaigns/one-shot/playground/renderer.ts`, `campaigns/one-shot/playground/d8night.config.ts`, `campaigns/one-shot/public/pack.ts`.
- Reglas y guardados: `campaigns/one-shot/server.ts`, `engine/server/d8-cafe-corrections.test.ts`, `engine/server/d8-map-corrections.test.ts`, `engine/server/d8-spatial.test.ts`.
- Créditos y nota del efecto de tos pendiente: `campaigns/one-shot/private/audio/D8_NIGHT_AUDIO_BACKLOG.md`.
- Estado de GitHub comprobado al iniciar esta auditoría: rama `main` en V49. V51 generada localmente; no se publicó en GitHub en este turno y no se mezclaron los cambios ajenos del workspace.
