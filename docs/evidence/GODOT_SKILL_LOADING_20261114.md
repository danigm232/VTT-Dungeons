# Microescenas nativas de Godot · implementación del 14/11/2026

## Resultado y alcance

Port implementado en `prototypes/godot-pecio/loading` y sincronizado en `prototypes/godot-retiro/loading`. Las 18 habilidades usan un reproductor 2D nativo, el catálogo original y 576 recortes de sprites existentes, empaquetados en seis atlas. No se incrusta el visor HTML en el proyector ni se rediseñan los personajes. Se conservan escala, pivotes de pies, objetos integrados y secuencias conjuntas de contacto.

Los dos proyectos arrancan mediante `loading_boot.tscn`. Se presenta la carga antes de pedir el mapa, se preparan sus recursos en segundo plano y se espera a su instancia y primeros fotogramas antes de habilitar la entrada. En Retiro, el gestor `MapTransition` delega también sus cambios reales de mapa en el coordinador persistente, conservando rutas, aparición y orientación. Las puertas/escaleras del mismo Pecio siguen su funcionamiento anterior.

La escena aparece en modo Proyector. El propietario del personaje representado recibe d20, lanzamiento y Continuar compacto en su control personal. Los observadores reciben fundido, indicador y Continuar. El proyector no exige una segunda confirmación grande de entrada después de que el grupo haya confirmado. Sin participantes se mantiene una carga neutra hasta que alguien se conecta; no se inventa a Mía como protagonista.

Los controles se sirven desde el propio Godot mediante un adaptador HTTP local y una sesión de demostración autorizada. La asignación y las tiradas se validan en Godot, no solamente ocultando botones. Credenciales aleatorias por conexión, un propietario por personaje, una tirada por entrada, recuperación de la tirada al recargar el control, rechazo de observadores/entradas antiguas/repeticiones y retirada de conexiones ausentes. La sesión se separa del estado de campaña y no modifica PG, botín, recursos ni historia.

Dos modalidades enfrentadas funcionan con los recursos actuales: equilibrio sobre apoyos y duelo musical. En un cambio de mapa con al menos dos presentes puede elegirse una de ellas; cada participante tira desde su dispositivo y el proyector espera ambos resultados. Se compara el total y se representa también el empate. El pulso requiere nuevas poses conjuntas y sigue pendiente; no se presenta como ya dibujado.

## Fuentes, propietarios y valores

| ID / conjunto | Propietario | Base → candidata | VA / criterio | Aceptación |
| --- | --- | --- | --- | --- |
| `frames:0..575`, `atlas:0..5` | exportador + `loading_stage.gd` | Catálogos v2/v3/v5 → aislamiento alfa y seis atlas 2048², WebP 94/alfa 100 | VA-05/07/10; mismas identidades/pies/alturas | Render integrado revisado; usuario pendiente |
| `scene:<skill-id>` × 18 | `catalog.json`, resolvedor TS reutilizado | Datos originales → catálogo nativo con clips deduplicados y fases muestreadas a 1/128 | VA-10/16; ambiente distinto por habilidad, desenlace persistente | Cobertura técnica, usuario pendiente |
| props, visitantes, sombras y VFX | `loading_stage.gd` | Atlas originales y trazos Canvas → texturas/primitivas 2D nativas | VA-06/07/10/16; apoyos y lectura, sin transparencia entre poses | Candidata inspeccionada |
| `boot`, `map-entry`, `Continue` | `loading_coordinator.gd`, `MapTransition` | Arranque directo/fundido previo → carga paralela con compuerta real y confirmaciones | Recursos preparados y apariciones conservadas | Ida/vuelta comprobada; prueba física pendiente |
| `owner-d20`, `observer` | `loading_session.gd`, `loading_http.gd`, `mobile.html` | Demostración individual web → reparto por presencia y propietario | Ausentes excluidos, también en Percepción; una tirada por entrada | Dos navegadores conectados a Godot real |
| `rolling-d20` | `die.js`, generado del `SkillD20` original | Icosaedro proyectado original → mismo código en el control personal | Veinte caras, rotación, movimiento reducido | Geometría variable y 20 caras comprobadas |
| `performance-tone` | `performance_tones.gd` | Frecuencias/envolventes originales de `skill-performance-sound.ts` → audio nativo triangular | Audio original, sin melodías externas | Recurso nativo validado; escucha física pendiente |
| `contest-balance`, `contest-performance` | mismo reproductor y ledger | Poses disponibles → dos actores y dos tiradas coordinadas | Apoyos de madera, escalas y equipos integrados | Pilotos nativos, refinamiento artístico pendiente |

Procedencia y hashes de entradas: `loading/SOURCE_MANIFEST.json`; recortes, referencias de altura y regiones: `loading/catalog.json`. Los PNG originales, prompts y derechos se conservan en los registros del VTT. No se añaden imágenes comerciales ni arte nuevo de terceros. Las fuentes Godot/JS de la carga se sincronizan con `scripts/sync-godot-skill-loading.mjs`, sin borrar extensiones locales de Retiro.

Los atlas se liberan al entrar al mapa y se recuperan en la siguiente entrada. Los controles de móvil descargan HTML y el d20, no los atlas de personajes. La exportación de datos se reproduce con `scripts/export-godot-skill-loading.ts`; después hay que importar los recursos en ambos proyectos Godot. El lanzador del visor realiza esa importación para evitar utilizar una caché de texturas antigua.

## Verificación de esta candidata

- **Godot 4.7.2 Forward+, NVIDIA MX350:** 178 comprobaciones aprobadas con render real, incluyendo seis comparaciones de los atlas importados frente a sus píxeles de origen. Se detectó y corrigió una caché anterior que daba regiones equivocadas tras reempaquetar el arte; no se acepta un catálogo correcto con texturas importadas desactualizadas.
- **18 × 3 × 2 = 108 combinaciones** de habilidad, protagonista y resultado. Comprobación del modelo de presencia/propiedad, ausencia de Mía con Trinity+Mike, tiradas únicas, empate y pilotos de equilibrio/música. 56 capturas nativas: 18 ambientes, 36 desenlaces y dos duelos.
- **24 comprobaciones de arranque/ida/vuelta** en Retiro: mapa principal → Cuevas de Pleamar → mapa principal, con `MapTransition` real. Entrada única, ID nuevo, rechazo de tirada antigua, espera de preparación/Continue, fundido, coordenadas de aparición y orientación configurada en la salida. No se modifica la orientación actual `sw` para ajustarla a un resultado histórico.
- **Dos controles táctiles de navegador, 390×700, conectados al Godot Forward+ real:** Trinity propietario y Mike observador; Mía excluida, d20 de veinte caras que cambia de geometría al rodar, rechazo HTTP de tirada del observador y repetición, reconexión conservando resultado y salida compartida tras ambos Continuar. El mapa se instancia y renderiza realmente; no se sustituye la preparación por una espera artificial.
- Capturas `startup-ready.png` y `entered-map.png` proceden del arranque de la aplicación, además de las capturas aisladas del catálogo. `mobile-tests.json` conserva las comprobaciones de los controles. Las pruebas de navegador no equivalen a probar dos teléfonos y un proyector físicos.
- Informe `output/godot-skill-loading-20261114/index.html`: tres comparaciones superpuestas web/Godot y galería nativa. Para los pilotos: misma ventana 1280×720, cámara lateral, Mía y ambiente a 400 ms. La tipografía y la retirada del dado del proyector son cambios deliberados de interfaz; no se afirma equivalencia píxel a píxel. `manifest.json` conserva originales y SHA-256; se reutiliza `scripts/lib/visual-comparison.mjs` con clic/toque, teclado y ampliación. Comprobado en navegador: todas las imágenes cargan, alternancia y teclado funcionan, el rectángulo no cambia al superponer, la ampliación permite zoom y los 70 hashes coinciden. Los módulos productor/consumidor coinciden byte a byte, excluyendo los metadatos de importación y la prueba adicional de Retiro.

Registros de ejecución: `tmp/godot-loading-capture.log`, `tmp/godot-loading-roundtrip.log` y `tmp/godot-loading-forward-boot*.log`. La comprobación de caché lee los WebP originales exclusivamente en la prueba de desarrollo; sus avisos sobre exportar lecturas crudas no proceden del renderer de producción, que carga recursos importados.

## Uso y límites

Abrir **`PROBAR-CARGAS-GODOT.cmd`** desde la raíz para revisar las 18 animaciones y los dos duelos. Para la sesión compartida, abrir el modo Proyector de `JUGAR-GODOT.cmd`: abajo aparece la dirección que deben abrir los móviles en la misma red. [Instrucciones del módulo](../../prototypes/godot-pecio/loading/README.md).

La conexión es la sesión local de carga del prototipo Godot. No se han migrado las cuentas, guardados ni todo el HUD móvil del servidor web Socket.IO. Solo se incluyen los personajes con recursos en el catálogo Godot de esta campaña; el exportador usa el roster y sus URLs/alturas, mientras el renderer y la selección funcionan por ID. Otros personajes/campañas requieren incorporar sus recursos reales, sin inventar modificadores ni mostrar visitantes ausentes. Los modificadores oficiales todavía no se conectan a este adaptador: las tiradas son naturales.

Los VFX se han traducido a primitivas nativas: conservan su intención, no una equivalencia exacta de rasterizado con Canvas. El juicio artístico, la escucha en mesa y la prueba física siguen pendientes. No se ha instalado una actualización del VTT web ni se han cambiado geometría, cámaras o colisiones de los mapas.

Punto de conservación independiente: rama `codex/godot-skill-loading-20261114`, limitada al módulo de cargas, sus herramientas, lanzador y fichas propias. Se genera con un índice temporal sin cambiar el índice, HEAD o archivos del espacio compartido. Las modificaciones puntuales de integración permanecen en los proyectos actuales; `scripts/install-godot-skill-loading.mjs` las reproduce de forma idempotente y verifica que no sobrescribe un arranque ajeno. La rama no pretende apropiarse de los proyectos Godot completos, desarrollados en paralelo, ni sustituirlos por una versión anterior.

La suite heredada `test_map_exits.gd` se intentó ejecutar, pero espera un nodo llamado `IndicatorRoot`; el proyecto actual lo llama `DiscreetExitIndicator`. Esa suite no se declara aprobada. La nueva prueba de ida/vuelta valida las transiciones y la compuerta de carga sin modificar el indicador ni las pruebas de otro trabajo.
