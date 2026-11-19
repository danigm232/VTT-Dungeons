# Cargas de habilidades en Godot · contrato del 14/11/2026

Estado actualizado: **port nativo implementado en Pecio y Retiro, con sesión local de controles de carga**. Las cuentas/guardados del servidor web y la prueba física siguen pendientes. [Implementación y evidencia de esta candidata](../evidence/GODOT_SKILL_LOADING_20261114.md). Este documento concreta el bloque del maestro `ROADMAP_V1.md`, sin crear otra cola global; las propuestas originales se conservan como contrato y se contrastan con esta evidencia.

## 1. Base que se traslada

Reutilizar las 18 habilidades, descripciones, escenarios, atlas y correcciones de la candidata web. Conservar identidad, proporciones, objetos integrados en sprites, sombras, apoyos, ausencia de parpadeo, bucles ambientales propios y desenlaces animados persistentes. No sustituirlos por personajes corriendo en todas las escenas.

Fuentes actuales:

- [Catálogo de escenas](../../apps/web/ui/skill-scenes.ts) y [reloj/contratos](../../engine/client/skill-micro-scene.ts).
- [Secuencias de protagonistas](../../apps/web/ui/skill-actor-sequences.ts), [utilería](../../apps/web/ui/skill-prop-sprites.ts), [sombras](../../apps/web/ui/skill-scene-shadows.ts) y [variantes de Percepción](../../apps/web/ui/skill-perception-variants.ts).
- [Correcciones, recursos y procedencia](SKILL_ANIMATION_NARRATIVE_20261107.md), [prompts](SKILL_ANIMATION_V5_PROMPTS_20261107.json) y [fuentes originales](SKILL_ANIMATION_V5_SOURCES_20261107.json). Los atlas están en `apps/web/ui/art/`; conservar recortes, pivotes y alturas de referencia de sus manifiestos.

Se porta el catálogo a datos consumibles por Godot y el reproductor a su capa 2D nativa. El código TypeScript/Canvas es referencia funcional, no un módulo GDScript ya disponible. No generar otra colección de sprites para empezar; validar primero tres pilotos con los recursos existentes.

## 2. Cuándo aparece

1. **Inicio del juego:** la primera carga del mapa también tiene esta presentación. Preparar una entrada ligera de arranque antes de cargar la escena pesada; seleccionar protagonistas al recibir el estado autorizado de jugadores presentes.
2. **Cambio de mapa:** nueva entrada coordinada al cambiar el destino autorizado, incluso si sus recursos ya están en caché. Un cambio de mapa y su actualización de estado no deben producir dos entradas.
3. **Reconexión:** recuperar la entrada que sigue abierta y la tirada ya consumida. No sortear de nuevo ni conceder otro intento.
4. **Incorporación tardía:** adherirse a una carga compartida en curso como observador, sin sustituir a sus protagonistas. Si la mesa ya está jugando, la carga local del dispositivo muestra fundido/indicador/Continuar sin interrumpir el proyector ni reiniciar la escena compartida.

La presentación y la carga real avanzan en paralelo. La tirada sigue siendo opcional; no es requisito para terminar de cargar ni para entrar. El ambiente continúa si nadie tira. Una tirada resuelta conserva su desenlace vivo y no reinicia el reto.

## 3. Reparto de pantallas

| Dispositivo / papel | Presentación durante la carga | Cuando está preparado |
| --- | --- | --- |
| Proyector Godot | Microescena compartida, nombre del destino, habilidad/característica, explicación y desenlace. | Conserva la escena hasta la salida coordinada y funde al mapa. Sin d20 interactivo ni botón Continuar. |
| Jugador protagonista de una escena individual | Fundido sobre el juego, d20 interactivo y su animación de lanzamiento, indicador de carga. Resultado propio legible. | Botón Continuar compacto. El dado usado permanece bloqueado. |
| Jugador presente que no protagoniza la escena | **Solo fundido e indicador de carga**, sin microescena ni dado. | Botón Continuar compacto. |
| Dos jugadores elegidos para una escena enfrentada | Cada uno recibe únicamente su propio d20 y animación, además del indicador. La acción de ambos se ve en el proyector. | Continuar compacto en cada pantalla; el resto de jugadores sigue como observador. |

El d20 y su animación pasan a los controles personales: no duplicarlos sobre la viñeta proyectada. En el proyector se reproduce la consecuencia sincronizada de la tirada, no otra tirada local.

Interfaz móvil: controles pequeños, sin botón de entrada gigante ni a todo el ancho. Objetivo inicial: d20 de 64–80 px, indicador de 16–24 px y Continuar de ancho ajustado al texto con zona táctil de 44 px de alto. Son valores candidatos a validar en dispositivos; evitar que la franja vacía del pie intercepte el dado. Mantener movimiento reducido y entrada por teclado.

## 4. Quién puede aparecer y quién puede tirar

**Elegibles = personajes asignados a jugadores presentes y autorizados en esta partida.** La presencia debe venir del servicio de sesión, no de que exista un token o un sprite en el proyecto. En este contrato «activo» significa presente/habilitado para participar, no necesariamente quien tiene el turno de combate.

- Un jugador presente: su personaje protagoniza la escena y su pantalla recibe el d20.
- Varios presentes, escena individual: elegir un protagonista entre ellos y entregar el d20 solamente a su propietario. Los demás reciben la pantalla de observador.
- Ejemplo vinculante: si solo están Trinity y Mike, solo Trinity o Mike pueden protagonizarla. **Mía no aparece ni recibe un dado.**
- Aplicar el filtro a **todos los personajes de campaña visibles**, incluidos visitantes de Percepción y actores secundarios de nuevas escenas. Los PNJ genéricos y animales del desafío pueden mantenerse. Evitar duplicar al mismo personaje como protagonista y visitante.
- Escena enfrentada: seleccionar dos personajes distintos entre los elegibles. Con tres o más jugadores, los no seleccionados siguen como observadores.
- Sin jugadores elegibles: fundido/carga neutra, sin personaje asignado inventado ni d20. Nunca usar Mía como sustituto automático.
- Seleccionar una sola vez por entrada y comunicar la misma decisión a todos los clientes. Puede alternarse el protagonismo para repartir participación, sin cambiarlo a mitad de una acción.
- Identificar por IDs de partida, jugador y personaje. Los nombres del ejemplo no son condiciones del código. Dos conexiones del mismo personaje no le conceden dos tiradas.

## 5. Sincronización, carga y Continuar

Separar dos relojes: **estado de carga real** y **estado de demostración**. El mapa puede estar preparado antes de tirar, durante la tirada o después del desenlace.

Contrato de sesión propuesto, pendiente de implementar:

| Campo | Finalidad |
| --- | --- |
| `loadEntryId`, `sceneEpoch`, `destinationId`, `reason` | Distinguir arranque/cambio de mapa e invalidar eventos antiguos. Una carga inicial necesita ID aunque no haya cambio de epoch. |
| `microSceneId`, `mode`, `variant`, `seed` | Elegir la misma escena y variante en todas las vistas; modos individual/enfrentada. |
| `eligibleCharacterIds`, `participantCharacterIds`, `participantOwners` | Separar presencia real, protagonistas y permisos personales. |
| `demoPhase`, `phaseStartedAt`, `rollsByParticipant`, `outcome` | Reproducir preparación, lanzamiento, acción, reacción y desenlace con un reloj compartido. |
| `requiredClientIds`, `readyByClient`, `continuedByClient` | Registrar preparación real del proyector y dispositivos, y confirmaciones de entrada. |

Reglas de integración:

- El estado autorizado elige protagonistas y valida la tirada. Ocultar el botón por CSS no concede ni revoca permisos: rechazar también en el servicio las peticiones de observadores, otros propietarios, entradas antiguas y repeticiones.
- Una tirada resuelta por participante y entrada. Registrar el resultado demostrativo por separado de las pruebas oficiales y del estado de campaña; reconectar no lo borra.
- Mantener CD configurable, inicialmente 12, en las escenas individuales. Mostrar modificadores únicamente si existen en datos autorizados; en su ausencia, d20 natural. Sin experiencia, recompensas, gasto de recursos, movimiento real ni cambios de PG/inventario/historia.
- Habilitar Continuar cuando el mapa propio y el proyector estén realmente preparados. No usar un temporizador decorativo o el fin de la animación como señal de carga completa.
- **Salida compartida propuesta:** cada jugador presente confirma con su botón pequeño; el proyector y los dispositivos funden al mapa cuando están preparados y han llegado las confirmaciones requeridas. Mostrar «Esperando al grupo» discretamente tras confirmar. La preparación del proyector no es un clic adicional.
- Continuar sin tirar omite la demostración pendiente. En una escena enfrentada incompleta no inventar un resultado ni otorgar victoria por ausencia de tirada.
- Una desconexión retira al dispositivo del conjunto de confirmaciones requeridas para no bloquear a todos. Si el protagonista abandona antes de tirar, revocar su permiso y coordinar un sustituto elegible o una carga neutra. Si ya tiró, conservar y resolver el resultado recibido, sin conceder otra tirada.
- Si una escena enfrentada pierde un participante antes de completarse, cancelar la competición de forma explícita; pasar a individual si aún no hubo tiradas o mostrar demostración interrumpida si ya las hubo. No fabricar la tirada del ausente.
- Una carga fallida conserva el error y ofrece recuperación; no habilita Continuar sobre un mapa incompleto. Un error ajeno o una conexión tardía no deben conceder nuevos dados.

La política de salida compartida y los tamaños son decisiones propuestas para concretar la implementación; la distribución de pantallas, la carga inicial y el filtro de presentes son instrucciones explícitas del usuario.

## 6. Ampliación: escenas de tiradas enfrentadas

Añadir un modo de demostración entre jugadores, separado de las 18 escenas individuales y reutilizando el mismo reproductor. Aquí «combatir con dados» es una competición visual durante la carga, sin daño ni efectos reales en la partida.

Pilotos propuestos, pendientes de revisión artística:

| ID candidato | Representación | Habilidad / lectura visual |
| --- | --- | --- |
| `contest-arm-wrestle` | Pulso amistoso sobre una mesa, preparación de ambos y esfuerzo opuesto; vencedor celebra y rival cede. | Atletismo; contacto de manos y apoyos coherentes. |
| `contest-balance` | Dos personajes en apoyos estrechos paralelos; uno termina antes o mantiene mejor el equilibrio. | Acrobacias; pasos dibujados, sin deslizamientos ni caídas de la partida. |
| `contest-performance` | Duelo musical amistoso, frases alternas y público que responde al desenlace. | Interpretación; instrumentos integrados, audio original y PNJ a escala. |

Cada participante puede tirar una vez desde su dispositivo. La primera tirada se conserva mientras llega la segunda; el proyector mantiene una preparación viva, sin adelantar un ganador. Comparar los totales válidos de ambos, en lugar de aplicarles la CD 12 de la escena individual. Propuesta para empate: desenlace de empate amistoso, sin una segunda tirada en la misma entrada. Omitir/cancelar la demostración no equivale a perder.

Estas tres ideas son una ampliación propuesta, no escenas ya dibujadas o aprobadas. Validar primero un piloto entre dos jugadores y luego extenderlo a las demás combinaciones de personajes. Registrar las poses conjuntas que falten como recursos pendientes; no montar objetos postizos ni regenerar masivamente todos los pares antes de probar el contacto.

## 7. Puntos de integración y entregas del bloque

Auditoría actual: `project.godot` arranca directamente `scenes/main.tscn`; `scripts/main_controller.gd` reúne tres tokens locales y selecciona uno con 1/2/3. Esa selección **no acredita presencia de jugadores remotos**. `scripts/interactive_transition.gd` trata accesos físicos entre niveles del mismo Pecio: no disparar una pantalla de carga por cada escalera, puerta o cambio de altura si no hay cambio/carga real de mapa.

| Tramo local | Entrega verificable | Estado |
| --- | --- | --- |
| G-CARGA-1 | Catálogo y reproductor 2D compartido para Godot. Pilotos: Atletismo, Arcano y Persuasión; mismos atlas, pivotes, apoyo y desenlace. | Implementado y revisado con render nativo; aceptación artística pendiente. |
| G-CARGA-2 | Entrada ligera de arranque y enganche al cambio autorizado de mapa; carga real en paralelo y recuperación de errores. | Implementado en ambos arranques y en MapTransition del Retiro; ida/vuelta comprobada. |
| G-CARGA-3 | Adaptador de sesión entre Godot/proyector, servicio de partida y controles personales. Presencia, propietario del d20, resultados, preparación y confirmaciones. | Sesión local de carga implementada y comprobada con dos controles; unión con cuentas/guardados del VTT web pendiente. |
| G-CARGA-4 | Cobertura de las 18 escenas, todas las variantes filtradas por presencia y pruebas de reconexión/salida conjunta. | 108 combinaciones y controles conectados comprobados. Visitantes disponibles limitados a criaturas y personajes presentes del catálogo; ampliar otros personajes al importar sus recursos. Prueba física pendiente. |
| G-CARGA-5 | Primer duelo entre dos jugadores y posterior ampliación de escenas enfrentadas. | Equilibrio e interpretación implementados con recursos existentes. Pulso y refinamiento de nuevas poses pendientes. |

Son tramos del bloque autorizado del maestro; no cambian el orden de acabado de otros mapas ni cierran M5/M7. Futuros propietarios: un módulo de carga compartido dentro del proyecto Godot, el adaptador de sesión y las vistas personales existentes del VTT. Definir el transporte al integrar el servicio actual; no dar por migrados Socket.IO, permisos o guardados porque el prototipo dibuje una viñeta.

## 8. Criterios de aceptación

- Arranque desde cero, primera conexión, cambio de mapa frío/caliente y reconexión: entrada única, carga paralela y salida correcta, sin mostrar un mapa a medio preparar.
- Solo Mike; solo Trinity; Trinity + Mike; tres jugadores; sin jugadores. Comprobar por vista qué personaje aparece y quién recibe el dado. En Trinity + Mike, Mía tampoco puede aparecer como visitante de Percepción.
- Tirada autorizada una sola vez, pulsaciones duplicadas, segundo dispositivo del mismo personaje, reconexión y petición manipulada de un observador. Sin efectos sobre la partida.
- Escena enfrentada con ambos órdenes de tirada, empate, omisión, desconexión y tercera persona observadora; ningún desenlace usa una tirada inventada.
- Preparación rápida/lenta del proyector y de cada móvil; confirmación temprana/tardía, abandono y error de carga. Sin bloqueos permanentes ni Continuar prematuro.
- Render integrado en Godot y controles reales en móviles: dado únicamente personal, botones compactos, texto libre, sombras y apoyos, sin parpadeo ni reinicio del desenlace. Separar comprobación técnica, revisión artística y ensayo físico con proyector y dos teléfonos.
- Conservar antes/después comparable y procedencia de todo recurso que cambie. No presentar los tests de la candidata web como validación del port Godot.

La primera entrega de esta ficha fue documental. Tras la instrucción explícita de implementarlo, el flujo nativo y la sesión local ya están construidos y probados según [la evidencia de implementación](../evidence/GODOT_SKILL_LOADING_20261114.md). El listado de propuestas no equivale por sí solo a implementación ni a aceptación física/artística.
