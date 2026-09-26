# Dirección aprobada — VTT de mesa HD-2D

**Actualización21/09/2026:** dirección gráfica y elección Babylon vigentes. Babylon9.26 ya está instalado y tiene pruebas sintéticas; la aplicación todavía usa Pixi. Las frases inferiores sobre instalación pendiente y el orden0.3/0.3.1 describen el15/09. El orden actual es M1 del [roadmap](../ROADMAP_V1.md) y ADR-024: mapa maestro por Terra, integración mínima por Sol, sin rehacer motor ni exigir cerrar todo D8. Oscuridad/secretos mínimos del pecio se adelantan; FOV avanzado queda posterior. Este documento no declara un benchmark físico superado.

Decisión del usuario, 2026-09-15, posterior a la comparación de motores. Estado: **dirección aprobada; Babylon.js todavía no instalado ni integrado**. Referencia arquitectónica: ADR-023. No sustituye los contratos de implementación de Alpha 0.3.

## Producto y prioridades

1. Astra y Sol realizan la mayor parte del desarrollo, integración, preparación de contenido y comprobaciones automatizables. El usuario decide prioridades y valida la experiencia física; no se presupone que aprenderá un editor 3D o programará para completar la campaña. No prometer autonomía artística o validación de hardware no disponible.
2. Inmersión mediante personajes/sprites 2D dentro de escenarios 3D, cámara ortográfica oblicua estable, texturas estilizadas, iluminación y ambientes coherentes. Octopath Traveler es una referencia de composición y atmósfera, no una especificación de copia ni una promesa de calidad equivalente a un equipo comercial. No reutilizar sus assets.
3. Es D&D presencial: dados físicos, conversación y decisión del DM. La aplicación presenta mapas, música, objetos, consecuencias y percepción; no reemplaza el arbitraje por un videojuego de combate automático.
4. Móviles con mapa y controles individuales, no degradados a meros mandos. La percepción autorizada puede diferir por personaje. Proyector/TV conserva una vista pública compartida controlada por el DM.
5. Cada nueva capacidad se estudia primero como posible reutilización; se adopta sólo si licencia, mantenimiento, automatización, rendimiento y estilo justifican adaptarla.

## Decisión técnica cerrada

Conservar Node/TypeScript, servidor autoritativo, Socket.IO, interfaces web de los tres roles, validadores, comandos transaccionales y Howler. Sustituir la representación Pixi por Babylon.js de forma gradual. No migrar a Godot, Unity ni Unreal; no mantener dos motores definitivos por dispositivo.

Babylon es la elección, no una dependencia ya certificada. Antes de instalar para 0.3.1, fijar versión compatible, revisar dependencias/licencias y registrar avisos. Usar WebGL 2 como perfil inicial; WebGPU no será requisito. Recursos locales, sin CDN durante la partida. El móvil conserva el mapa con menor calidad visual si hace falta, nunca con permisos más amplios.

El servidor conserva el estado lógico. El motor gráfico no decide resultados de dados, daño, permisos, guardado o conocimiento de secretos. Mantener la frontera de WorldRenderer, sin suponer que sólo cambiar world.ts basta: terreno, selección, packs, validadores y pruebas también evolucionan.

## Separaciones obligatorias para crecer

- **Regla y apariencia:** puerta abierta/cerrada/bloqueada/rota es estado de mesa; bisagra, modelo, textura y animación son representación. Conservar comandos, validación, preview privado y undo; ampliar capacidades por necesidades de campaña, no construir una simulación universal.
- **Casilla y superficie:** mantener cuadrícula lógica de 1,5 m, añadir superficies identificables, altura y conexiones para rampas/escaleras. Debe poder distinguirse una posición sobre un puente de otra debajo con la misma fila/columna. El detalle del esquema se cierra antes de implementar 0.3.1.
- **Oclusión y visión:** un mástil puede tapar físicamente un sprite; una criatura no conocida debe estar ausente del estado autorizado. Una sombra, un shader o esconder el sprite no protegen información enviada al cliente.
- **Percepción individual:** capacidad y alcance configurables por personaje/DM y edición elegida; no inferir capacidades de todos los elfos por su nombre o apariencia. Caso de aceptación 0.7: un personaje con visión en oscuridad autorizada distingue lo permitido, otro sin ella no, y el proyector no revela la unión automáticamente. Comprobar reconexión, cachés, carga tardía y sustitución de controlador.
- **Recursos y secretos:** el actual catálogo público no certifica visión individual futura. Auditar también geometría, encuentros, notas, referencias y endpoints de assets; no servir secretos en un pack público confiando en niebla cliente. El contenido deliberadamente público se distingue del contenido desconocido.
- **Ambiente y consecuencias:** fuego, humo, agua, lluvia, viento, banderas y luces se reutilizan mediante configuraciones. Estados como ardiendo/mojado/corroído se aplican por capacidades definidas y aprobación DM. Electricidad u otros efectos entran cuando las fichas/aventura los necesiten y exista una consecuencia especificada. No química general ni destrucción arbitraria.

## Secuencia y límites del siguiente encargo

### Ahora: Sol implementa Alpha 0.3

Ejecutar docs/NEXT_MODEL_PROMPT.md: puerta coherente y persistencia, todavía con Pixi. No instalar Babylon, rediseñar el terreno, añadir visión o tocar los contratos estrictos de save para campos futuros. IDs, separación estado/arte y versiones/migraciones preparan el crecimiento; no persistir objetos internos del renderizador. La corrección de puerta es acotada: no rehacer toda la campaña 2D.

### Después de aceptar 0.3: Alpha 0.3.1, primer recorrido 3D integrado

Cerrar contrato ejecutable de superficies/pack/migración antes de programarlo; no reabrir una comparación general de motores sin evidencia nueva. Conservar 0.3 y sus datos como copia recuperable. Una escena sintética, no todo el pecio ni toda la campaña, deberá demostrar:

1. Dos alturas, una escalera o rampa y un cruce elevado con espacio inferior, con casilla/superficie inequívocas. Grid pegado al terreno, selección y movimiento coherentes.
2. Sprite con pies anclados al suelo, profundidad delante/detrás de un oclusor y un ciclo sencillo de movimiento con recursos preparados; no prometer IK de pies a partir de un PNG estático.
3. Puerta y objeto manipulable con preview privado, aplicar/cancelar, colisión, undo y restauración después de reiniciar.
4. Una luz dinámica y un efecto ambiental reutilizable. Prueba de sprites recortados, transparencia y sombras; no asumir que un sprite básico recibe/proyecta toda iluminación correctamente.
5. DM, dos jugadores y proyector sincronizados; conservar también las escenas anteriores durante la transición. Pixi es compatibilidad temporal, no una segunda plataforma que se amplía indefinidamente.
6. Calidad reducida en móvil con el mismo estado autorizado. Objetivo inicial a medir: 60 fps en proyector 1080p y 30 fps en los móviles disponibles, escena representativa con 5 PJ y efectos moderados; registrar dispositivo, navegador, resolución y tiempos, no certificar rendimiento por pruebas de viewport. Sesión física de 30 minutos. Ajustar detalle visual si falla; no cambiar de motor automáticamente.
7. Una receta de escena reproducible desde recursos y datos, generable/verificable por agentes. No aceptar una demo que sólo pueda rehacerse con pasos manuales no documentados en un editor externo.

No incluye todavía visión individual completa, editor 3D general, física continua, importación automática de PDF ni reconstrucción 3D de fondos. Sus contratos posteriores permanecen separados. El presupuesto se recalibra con consumo/tiempo observados en este bloque; las cifras de la comparación eran hipótesis, no compromisos.

### 0.4 a 1.0

0.4: importar/configurar escenas 3D preparadas y módulos, no construir un modelador. 0.4.1: fichas/animaciones preparadas y encuentros. 0.5: intenciones y consecuencias. 0.6: biblioteca ambiental y efectos de objetos. 0.7: percepción individual, niebla, iluminación táctica y seguridad de datos/recursos. 0.8: IA propone comandos validados que el DM aprueba. 0.9: campaña completa por ese flujo. Beta/1.0: estabilidad, dispositivos, instalación, calidad y sesiones largas.

## Reparto de trabajo

Astra: decisiones entre capas, contratos necesarios y auditorías de riesgos. Sol: implementación principal, integración gráfica, servidor, permisos y corrección de fallos de integración. Terra: UI, contenido, audio, editor y documentación con contrato cerrado. Luna: inventarios, extracción de datos, rutas, manifiestos y comprobaciones mecánicas. Terra y Luna trabajan cuando su bloque encaja y ahorra uso de Sol; no son pasos obligatorios de todas las versiones. Un modelo por bloque; cambios manuales, sin subagentes automáticos. No devolver al usuario trabajo técnico como solución predeterminada.

## Base de la decisión

Inspección de engine/shared/campaign.ts, engine/server/navigation.ts, game.ts y apps/web/world.ts: mundo lógico plano, props especializados y fondo PNG; servidor y herramientas de mesa aprovechables. Revisión automatizada del 15/09: 23/23 unitarias PASS, sin benchmark de motores ni nueva aceptación física.

Fuentes consultadas durante la comparación: [capacidades Babylon](https://www.babylonjs.com/specifications/), [licencia Apache-2.0](https://github.com/BabylonJS/Babylon.js/blob/master/license.md), [web Godot](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html), [web Unity](https://docs.unity3d.com/6000.0/Documentation/Manual/webgl-browsercompatibility.html), [Pixel Streaming Unreal](https://dev.epicgames.com/documentation/unreal-engine/overview-of-pixel-streaming-in-unreal-engine). La elección se basa en conservar la experiencia web y facilitar el trabajo automatizable, no en que los otros motores sean incapaces de HD-2D.
