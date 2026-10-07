# Revisión open source y reutilización — actualizado 2026-09-22

## Auditoría final D8 — 05/10/2026

ADAPT: controles HTML nativos (`details`), gestor de ventanas existente, reintento del cargador existente, Pixi/Babylon y conciliación de snapshots autoritativos. Se extrae únicamente la programación de reintentos para compartirla entre los tres clientes; no otro estado del mundo ni otro sistema de guardado. REJECT para esta corrección: framework nuevo de paneles o caché/red, porque duplicaría mecanismos ya integrados. Assets existentes: comprobados sin descargar ni regenerar ilustraciones correctas. Sin dependencia externa nueva.

## Cierre D8 — 04/10/2026

ADAPT: Node/fs/JSON/Zod, geometría/navegación, Socket.IO, renderer Babylon y sprites/audio ya integrados. Progreso/encuentros se declaran por pack sobre el mismo estado/save, sin nueva dependencia. REJECT para este alcance: segundo gestor de guardado, otro motor y framework de formularios; duplicarían contratos que ya funcionan. No se ha descargado arte, biblioteca ni recurso externo nuevo. La aldeana existente se verificó en render; no se oculta un fondo mediante CSS ni se regenera por defecto un asset con alpha correcto.

## Regla vigente de fuentes — 2026-09-22

La carpeta privada [DnD VTT del usuario](https://drive.google.com/drive/folders/1p-X5BsVtg2GOjTPylhV4Jk6i8CQCwIAs) es la fuente prioritaria y viva para personajes, PNJ, objetos y entorno. Su inventario y procedimiento están en `ASSET_SOURCES.md`. Antes de declarar ausente o generar un recurso, consultar de nuevo la carpeta relevante; después usar bibliotecas gratuitas/open source cuando ahorren trabajo y encajen. La autorización cubre la integración rutinaria en este programa personal y privado, pero no asigna una licencia abierta a los originales.

Para efectos, agua, luz y materiales, reutilizar primero las capacidades ya instaladas de `@babylonjs/core`, incluidas partículas y materiales PBR básicos. No añadir `@babylonjs/materials` ni otra dependencia sin una necesidad concreta que el núcleo no cubra.

Criba concreta sin descarga ni incorporación: [Kenney Pirate Kit](https://kenney.nl/assets/pirate-kit),70 recursos3D con animación y CC0 según su ficha; [Kenney Pirate Pack](https://kenney.nl/assets/pirate-pack),190 archivos2D cenitales y CC0 según su ficha; y [Poly Haven](https://polyhaven.com/license), texturas/modelos/HDRI CC0. Los tres quedan `STUDY`: se comparan con Drive y el estilo táctico antes de seleccionar un archivo. Registrar la licencia del recurso exacto al adoptarlo.

## Estado de integración en 0.3.1-dev.1

Persistencia usa `node:fs`/JSON/Zod existentes. [`@babylonjs/core`9.26.0](https://www.npmjs.com/package/%40babylonjs/core?activeTab=versions), Apache-2.0, permanece fijado en package/lockfile. `engine/shared/terrain.ts`, `engine/client/terrain3d.ts` y el adaptador de `apps/web/world.ts` renderizan superficies superpuestas, agua, grid geométrico, oclusores, luz y cámara en los cuatro mapas A–D. Babylon fue visible en DM, jugador y proyector durante la QA local M1b; Pixi conserva escenas antiguas y overlay de fichas, no se declara todavía motor definitivo único ni PASS de hardware. No se añadió dependencia o asset externo nuevo en M1b.

## Dirección HD-2D aprobada — posterior a los contratos0.3

ADR-023 y `HD2D_DIRECTION.md`: **ADOPT como elección arquitectónica Babylon.js**, integración diferida a0.3.1 tras aceptar0.3. [Motor y capacidades](https://www.babylonjs.com/specifications/), [repositorio/licencia Apache-2.0](https://github.com/BabylonJS/Babylon.js/blob/master/license.md). Motivo: gráficos3D existentes conservando servidor, TypeScript, interfaces y móviles web; no construir renderizador propio. La nota histórica de no instalación queda superada: se fijó `@babylonjs/core` 9.26.0 en package/lockfile para una prueba aislada. Antes de integrarlo en el VTT: revisar transitivas, preservar LICENSE/NOTICE aplicables, registrar créditos y probar perfil WebGL2 en hardware real. No aprobar automáticamente Havok, plugins, demos ni arte de terceros por la licencia del núcleo.

Godot/Unity/Unreal: **REJECT para la migración actual**, no por incapacidad gráfica; su integración/exportación no justifica reemplazar esta base web. La comparación ya realizada no se repite en0.3. Se mantiene la decisión de persistencia/puerta inferior. Recursos glTF/GLB, sprites y audio se estudian por pack con licencia/procedencia/transformabilidad propias; los catálogos inferiores siguen siendo candidatos, no assets instalados.

## Gate permanente para nuevas capacidades y recursos

Petición del usuario: aprovechar recursos gratuitos, open source o disponibles en Internet cuando ahorren trabajo **y encajen**, con especial atención al diseño artístico y a que puedan transformarse. La existencia de un recurso no es motivo suficiente para incorporarlo.

Antes de generar, dibujar, instalar o programar algo nuevo, revisar brevemente hasta tres candidatos concretos cuando existan. Para cada uno se anota: URL/proyecto exacto, autor y procedencia; licencia del código y de los recursos por separado; atribución y condiciones de distribución; formatos fuente y transformabilidad; coherencia estilística y con la cámara cenital/oblicua del jugador; resolución, alfa, anclas y rendimiento; mantenimiento/compatibilidad; y coste de adaptar frente a crear. Resultado permitido: `ADOPT`, `ADAPT`, `STUDY`, `REJECT` o `GENERATE`. No se descarga ni incorpora automáticamente nada por aparecer en la búsqueda.

Primera criba general, sin descarga ni adopción:

| Fuente | Viabilidad para Dungeons | Decisión actual |
|---|---|---|
| [Kenney](https://kenney.nl/support) | Los assets de sus páginas se publican como CC0 y no exigen atribución. Buen primer lugar para UI, tiles, props y modelos; cada pack debe comprobarse visualmente y adaptarse a escala/perspectiva. | `STUDY`; candidato preferente cuando encaje, no catálogo importado. |
| [Poly Haven](https://polyhaven.com/license) | Texturas, HDRI y modelos bajo CC0. Más útil como materia prima, textura o referencia de materiales que como sprite pixel art directo; sus renders de ejemplo y otros contenidos de la web no se confunden con los assets CC0. | `STUDY`; viable para transformaciones con trazabilidad. |
| [OpenGameArt](https://opengameart.org/content/faq) | Catálogo amplio y orientado a juegos, pero no tiene licencia uniforme: hay que verificar cada ficha, autor, atribución y licencia, e indicar modificaciones cuando corresponda. | `STUDY`; sólo por recurso individual, nunca aprobación global del sitio. |
| [Game-icons.net](https://game-icons.net/about.html) | Vectores editables y fáciles de recolorear/escalar para UI. Licencia CC BY 3.0: exige crédito al autor; su estilo monocromo no sustituye automáticamente el arte del mapa. | `STUDY`; especialmente viable para iconografía, con atribución. |

Para Alpha 0.2.1 RC1 la decisión permanece `GENERATE`: no se adoptó arte externo. Los sprites v3 ya estaban producidos y verificados para las huellas y perspectiva específicas antes de formular este gate; sustituirlos ahora añadiría riesgo sin ahorro. La criba se aplicará en el próximo recurso o componente nuevo.

## Decisión Astra para entrega conjunta Alpha0.3 — 2026-09-15

Revisión acotada a necesidad concreta; no instala componentes ni recursos. Esta sección sustituye las recomendaciones preparatorias incompatibles inferiores.

| Candidato concreto / evidencia | Encaje, licencia y coste | Decisión |
|---|---|---|
| [Kenney Tiny Dungeon1.0](https://kenney.nl/assets/tiny-dungeon), [ZIP exacto](https://kenney.nl/media/pages/assets/tiny-dungeon/f8422efb44-1674742415/kenney_tiny-dungeon.zip) | Leído ZIP en memoria, no instalado: License.txt identifica Kenney, creación05-07-2022, CC0 y crédito opcional. PNG individuales/Tilemap PNG, tiles16×16; no fuente por capas demostrada. La preview web no pudo abrirse, por lo que NO se declara comparación visual completa ni que incluya las cinco variantes requeridas. Escalar a48px es posible, pero no acredita misma puerta/material/hinge en open/closed/damage. Adaptación incierta y pérdida de densidad respecto al pecio actual | STUDY, no incorporar. Licencia verificada no equivale a encaje artístico |
| Arte propio objects-v2/v3 y renderer instalado | PNG/fondo inspeccionados localmente; dirección/materiales ya existentes. No CC0: procedencia ImageGen del manifiesto. Coste acotado: ajustar franja del tabique y cinco variantes sobre un lienzo común; anclas ya soportadas por pack. No se necesita otra librería ni formato | ADAPT; conservar fuentes y generar/editar familia coherente siguiendo skill, nombresv4 |
| [Node fs](https://nodejs.org/api/fs.html) + [licencia Node](https://github.com/nodejs/node/blob/v24.21.0/LICENSE), JSON y Zod existente | API de archivos/sync/rename del runtime; Node licencia principal MIT con avisos de componentes integrados, no copiar su código ni venderlo como implementación propia. Sin dependencia extra; cola/backup/validación de dominio sí son responsabilidad nuestra. Necesita pruebas Windows y límites de garantía ante fallo físico | ADAPT de primitives, ADOPT Zod existente |
| [node:sqlite en Node24.21.0](https://nodejs.org/download/release/latest-v24.x/docs/api/sqlite.html) | Integrado, sin paquete externo; API aún de estabilidad1.x en documentación consultada. Transacciones útiles, pero introducir DB no elimina esquema privado, restore, backup ni autorización. No necesario para una partida/snapshot | STUDY para versiones con consultas; no incorporar0.3 |
| [better-sqlite3 package](https://raw.githubusercontent.com/WiseLibs/better-sqlite3/master/package.json), [LICENSE](https://raw.githubusercontent.com/WiseLibs/better-sqlite3/master/LICENSE) | Observada13.0.3, MIT, Node>=22, exportaciones win32-x64/arm64, componente nativo/node-addon-api. No instalado ni benchmark; Node24 cumple rango, pero añade distribución/soporte nativo sin requisito de consultas | STUDY futuro; no incorporar0.3 |

No se adopta contenido de páginas o repositorios de terceros como arte final. Tiny Dungeon se descarta de la integración actual por encaje NO demostrado, no porque su licencia impida adaptarlo. No se siguió buscando indiscriminadamente más packs: el ajuste principal es geométrico y existe materia prima propia.

[Calendario oficial Node](https://nodejs.org/en/about/previous-releases) consultado15/09: Node24 LTS y20 EOL. Local observado `node --version = v24.21.0`. Decisión de contrato: rama24 desde24.21.0, alinear package/lanzadores por Sol; no instalación automática ni afirmación de Windows ya probado con nueva persistencia. Descartar APIs experimentales para filesystem. No adoptar write-file-atomic ni otra capa adicional; su evaluación anterior no obliga a instalar al elevar Node.

Fuentes consultadas para decisiones técnicas/licencias; comprobación legal completa de un futuro recurso adoptado sigue pendiente de sus archivos reales. Ninguna dependencia ni asset externo añadido al producto en este bloque.

## Preparación de persistencia Alpha 0.3 — 2026-09-14 (histórica)

Revisión completa en `ALPHA_0_3_PERSISTENCE_DISCOVERY.md`. Para el estado pequeño actual se recomienda `ADAPT` de `node:fs` con snapshot JSON versionado, temporal en la misma carpeta, sincronización, reemplazo, backup y reintentos Windows. `write-file-atomic` 8 queda `REJECT` por exigir Node 22.22.2/24.15/26 frente al `>=20` del proyecto; `node:sqlite` y `better-sqlite3` quedan `DEFER` porque no cubren Node 20 en sus versiones vigentes y SQLite aún no aporta consultas necesarias. No se instaló ninguna dependencia ni se inició el runtime 0.3.

## Extensión Alpha 0.2.1 — 2026-09-14

Necesidad: estados discretos de integridad/separación, transacción con preview, sprites por variante y deshacer. Inspeccionados los tipos, compilador, geometry/navigation, GameState y renderer instalados de RC2. Decisión: ADAPT del sistema de objetos Map/TypeScript y ADOPT de PixiJS/Zod/Socket.IO ya instalados; ninguna dependencia nueva. Una unión discriminada y funciones puras bastan para los tres tipos definidos. No se reabre la comparativa ECS/física de 0.2 ni se afirma haber evaluado versiones nuevas externas. Recursos nuevos se producirán en implementación con procedencia individual; licencias actuales no certifican assets todavía inexistentes. Audio conserva PCM actual y su mejora de muestras sigue separada.

## Decisión vigente para Alpha 0.2 — 2026-09-13

Necesidad: puerta/caja por casillas, selección DM, transacciones y deshacer. Inspección local de game.ts, navigation.ts, protocol.ts y world.ts; revisión de fuentes primarias siguientes. **No se instala ninguna dependencia nueva en este bloque de arquitectura.** No se ha hecho benchmark ni prueba de integración con alternativas no adoptadas.

| Opción | Evidencia | Decisión 0.2 |
|---|---|---|
| Stack instalado: PixiJS 8.20.1, Zod 4.1.8, Socket.IO 4.8.1, TypeScript | Versiones del package/lockfile local. Pixi documenta eventos de puntero y hit testing en su [guía oficial](https://pixijs.com/8.x/guides/components/events). | ADOPT existente. Reutilizar selección y transformación inversa del renderer; Zod para comandos; transporte ya probado. |
| Miniplex (`hmans/miniplex`) | [Repositorio](https://github.com/hmans/miniplex): gestión de entidades mediante ECS y consultas por componentes. [LICENSE.md](https://raw.githubusercontent.com/hmans/miniplex/main/LICENSE.md): MIT. Se revisó README y licencia de main; no se fijó versión porque no se incorpora. | DEFER. Dos tipos de prop no justifican convertir actores/sistemas a ECS; no elimina la validación de permisos, reservas o undo que necesitamos. Reconsiderar sólo con necesidad medida de consultas más complejas. |
| Matter.js (`liabru/matter-js`) | [Repositorio](https://github.com/liabru/matter-js): física de cuerpos rígidos 2D. [LICENSE](https://raw.githubusercontent.com/liabru/matter-js/master/LICENSE): MIT. Sin instalación ni versión fijada. | REJECT para 0.2. La recolocación discreta por casillas y las decisiones del DM no requieren dinámica continua. |

Conclusión de ingeniería: Map por escena, unión discriminada de props, funciones puras de huella/ocupación y pila before/after acotada. No escribir un motor ECS, física ni event sourcing. Contrato en `ALPHA_0_2_CONTRACT.md`.

Audio: el usuario confirmó reproducción y pidió mejorar los SFX. Los WAV actuales proceden de `scripts/generate-audio.mjs`, síntesis PCM local, no de muestras de una biblioteca ni de un generador de audio externo. Conservar Howler; la mejora consiste primero en elegir mejores recursos. No afirmar que ya se han encontrado/descargado SFX licenciados: la revisión histórica sólo menciona candidatos. Al iniciar el bloque AUDIO, verificar la licencia de cada archivo, su procedencia y atribución; después normalizar niveles y comprobarlo por altavoces. No es una dependencia nueva de puerta/caja.

Lo que sigue conserva la investigación histórica; las decisiones de Three.js no describen el stack vigente.

Nota de estado 2026-09-13: este documento conserva la investigación histórica del baseline. La candidata actual usa PixiJS 8.20.1 y su inventario/licencias vigente está en LICENSES_AND_CREDITS.md; Three.js ya no forma parte del producto.

Revisión de fuentes primarias, documentación y código selectivo; no se han instalado ni ejecutado estos motores. Fechas `pushed_at` obtenidas mediante API GitHub, señal de actividad, no garantía de calidad ni fecha de último release. No hay código copiado de estos repositorios.

| Proyecto exacto | Evidencia y actividad observada | Decisión |
|---|---|---|
| [RPGJS](https://github.com/RSamaium/RPG-JS) | MIT; rama v5 presentada como Beta; push 12-09-2026. RPG 2D, movimiento, mapas, inventario y multijugador integrado. | Referencia de movimiento y autoridad; no base. Adaptar su representación 2D y flujo RPG a puesta en escena 3D y tres roles añade acoplamiento. |
| [VeilCast VTT](https://github.com/cr-lolo/VeilCast-VTT) | Push 21-08-2026. LICENSE: código MIT, iconos CC BY 3.0 y efectos JB2A CC BY-NC-SA 4.0. index.html abre ventana local con window.open; orientación a miniaturas físicas. | Referencia excelente para composición DM/pantalla, luz y niebla; no base de red móvil. No incorporar catálogo JB2A ni descarga de recursos en runtime. |
| [Open-VTT de Khazlor](https://github.com/Khazlor/Open-VTT) | MIT, Godot; push 02-08-2026. README describe hosting local, ventanas/Android en pruebas, fichas y luz. | Descartar como base para Alpha navegador: requiere adoptar stack Godot/exportación y adaptar controles/interfaces. No se concluye que sea imposible. No confundir con otros proyectos homónimos. |
| [MiniVTT de SamsterJam](https://github.com/SamsterJam/MiniVTT) | GPL-3.0; push 04-08-2026. Express/Socket.IO, escenas, tokens, música y separación de permisos. | Estudiar referencia, sin reutilizar código. Arrastrar tokens compartidos no resuelve propiedad individual ni locomoción con colisión. |
| [RPGAtlas](https://github.com/DriftwoodGaming/RPGAtlas) | GPL-3.0; push 02-08-2026. Editor RPG, movimiento por casillas, inventario, batalla, eventos, clima y música. | Sólo referencia conceptual de packs/eventos. Copiar su runtime introduciría copyleft y demasiados sistemas fuera de alcance. |

La GPL no prohíbe desarrollar ni usar software localmente. Sí establece condiciones al distribuir derivados; para este motor nuevo no hay ventaja suficiente que justifique incorporar código GPL. Mantener separación de datos por carpetas no cambia automáticamente las obligaciones de código derivado. Consultados los [términos de MiniVTT](https://github.com/SamsterJam/MiniVTT/blob/main/LICENSE) y [RPGAtlas](https://github.com/DriftwoodGaming/RPGAtlas/blob/main/LICENSE). La elección es de alcance y reutilización, no un juicio contra GPL.

## Código realmente inspeccionado

- [MiniVTT socketHandler.js](https://github.com/SamsterJam/MiniVTT/blob/main/socketHandler.js): rol solicitado contrastado con sesión, canales DM/player, datos iniciales y comandos DM restringidos.
- [sceneModel.js](https://github.com/SamsterJam/MiniVTT/blob/main/models/sceneModel.js): validación por campos, `sceneFor` filtra tokens ocultos, canales separados. Hay movimiento mediante coordenadas; nuestro servidor aceptará intenciones y propiedad de personaje.
- [musicModel.js](https://github.com/SamsterJam/MiniVTT/blob/main/models/musicModel.js): estado de reproducción con offset/startedAt para entrada tardía. Se adopta el principio general, sin transcribir implementación.
- [VeilCast index.html](https://github.com/cr-lolo/VeilCast-VTT/blob/main/index.html): inspección selectiva del mecanismo de segunda ventana; no se auditó el fichero completo. [LICENSE](https://github.com/cr-lolo/VeilCast-VTT/blob/main/LICENSE) aclara derechos distintos del código y los efectos.
- [RPGJS MovementManager.ts](https://github.com/RSamaium/RPG-JS/blob/v5/packages/physic/src/movement/MovementManager.ts): estrategias, cuerpos adaptados y actualización antes de physics.step. `@rpgjs/physic` depende de su modelo Entity/PhysicsEngine; no extraer fragmentos sin esa integración. Su paquete declara 5.0.2 en la revisión, mientras README sigue rotulado Beta.

## Alternativas y componentes elegidos

| Componente | Reutilización y límites |
|---|---|
| [Three.js](https://github.com/mrdoob/three.js) | Elegido, MIT, push 12-09-2026. Cámara ortográfica/perspectiva, glTF, AnimationMixer, sombras, materiales, geometría y partículas. No incluye lógica de juego/red. |
| [Socket.IO](https://github.com/socketio/socket.io) | Elegido, MIT, push 11-09-2026. Transporte, sesiones de conexión y reconexión; añadir validación, ownership y resnapshot explícitos. |
| [NippleJS](https://github.com/yoannmoinet/nipplejs) | Elegido, MIT, push 26-05-2026. Joystick táctil; adaptar cancelación, ejes de cámara y teclas. |
| [Howler](https://github.com/goldfire/howler.js) | Elegido, MIT; push 23-11-2025, menor actividad reciente. Reproduce loops, volumen y fades. No sincroniza estado de partida por sí mismo. |
| [Colyseus](https://github.com/colyseus/colyseus) | MIT, push 12-09-2026; alternativa fuerte para rooms, autoridad y parches. No añadir junto a Socket.IO. Para cinco jugadores y secretos explícitos, snapshots pequeños reducen complejidad de schemas/vistas. Reconsiderar sólo ante necesidad medida de escalado, no preventivamente. |
| [Babylon.js](https://github.com/BabylonJS/Babylon.js) | Apache-2.0, push 12-09-2026; motor completo viable. Three basta para escenario pequeño; evitar otro stack/physics innecesarios. |
| [Phaser](https://github.com/phaserjs/phaser) | MIT, push 21-08-2026; buena alternativa si una campaña pide 2D. Menor ajuste a casco, cubiertas y profundidad elegidos para esta Alpha. |
| [Kenney Pirate Kit](https://kenney.nl/assets/pirate-kit) | Candidato CC0 confirmado en página oficial, 3D con animación. Sol debe inspeccionar archivos reales y elegir props/personajes útiles; no se ha descargado aún. Rehacer/recomponer casco roto para respetar mapa. |

Fuentes técnicas adicionales: [sincronización Colyseus](https://docs.colyseus.io/state), [Three.js](https://threejs.org/docs/), [audio Howler](https://howlerjs.com/), [licencias de assets Kenney](https://kenney.nl/support), [entrega Socket.IO](https://socket.io/docs/v4/delivery-guarantees/).

Inventario de reutilización: mapas y colocación mediante datos propios; movimiento/collision solver mínimo acotado; red Socket.IO; joystick NippleJS; cámara/personajes/animación/luz/partículas Three; audio Howler. Inventario D&D básico propio (lista de datos), reglas y niebla de guerra avanzada aplazadas. Niebla atmosférica visual no equivale a ocultación segura.

Antes de instalar, Sol fijará versiones exactas compatibles y guardará lockfile y licencias. No interpretar fechas de actividad como prueba de compatibilidad. No queda justificado gastar otro bloque de Astra en comparar más motores.
