# Contrato de migración táctica — decisión de Astra

Fecha: 2026-09-13. Estado: decidido e implementado en la candidata Alpha 0.1.

Este documento aplica la corrección explícita del usuario y sus tres imágenes. Sustituye las decisiones anteriores de diorama low-poly, ausencia de cuadrícula y movimiento libre. La auditoría preliminar de Luna es histórica: no es suficiente conservar coordenadas libres y redondear sólo la representación. El protocolo de modelos del usuario sigue vigente: Astra cierra arquitectura y auditoría; Sol implementa este bloque completo, sin subagentes.

## Experiencia y dirección artística

Battlemap vivo de D&D con sprites pixel art y profundidad dibujada. Terreno legible, cuadrícula de celdas cuadradas en el mundo, cenital suavemente inclinada, personajes apoyados en su casilla. Sin perspectiva convergente, rotación libre, cubos low-poly ni filtro pixelado aplicado al diorama anterior.

Las tres referencias están en `OneDrive_1_12-9-2026/Referencias estilo/`: `Imagen de Codex 12 sept 2026, 22_44_18.png`, `Imagen de Codex 12 sept 2026, 22_43_52.png` e `Imagen de Codex 12 sept 2026, 22_44_12.png`. Revisarlas antes de producir arte. La primera fija legibilidad táctica; las otras dos muestran profundidad dibujada, siluetas de clase, aros y riqueza de terreno. Sus textos de turnos, objetivos, barras enemigas y escenas de campamento/ruinas no son nuevos requisitos funcionales. No añadir combate o turnos automáticos ni sustituir el pecio por esas localizaciones.

El mapa de la aventura p.25, revisado de nuevo en `tmp/pdfs/pecio-map.png`, fija 1 casilla = 1,5 m, proa al este/derecha, popa al oeste/izquierda, C1 central y cubiertas superiores C2/C3 conectadas por escaleras. Dibujar una huella navegable siguiendo esa referencia; documentar las celdas de borde aproximadas. No servir esta imagen privada ni usar toda la página como fondo público. Conservar bajío, huesos de dragón, madera negra verdosa, espuma y balista rota. No añadir enemigos/tesoros de las imágenes de estilo como contenido oficial.

## ADR-008 — PixiJS v8 como renderer único

Usar `pixi.js` v8, API WebGL, `Sprite`, `Texture`, `Assets`, `Container` y animación por atlas. Selección deliberada: resuelve sprites, texturas y escena sin escribir infraestructura gráfica propia; Socket.IO y Howler se conservan. Fijar versión estable exacta de v8 y lockfile al instalar, verificar LICENSE de esa versión y guardar aviso. No instalar Phaser, un segundo motor de red, React ni plugins de tilemap para este tablero pequeño.

PixiJS 8.20.1 es el renderer único de la candidata. Three.js se retiró del cliente y de las dependencias directas; no mantener dos renderers ni un selector de estilos.

Fuentes primarias revisadas el 2026-09-13: [sprites](https://pixijs.com/8.x/guides/components/scene-objects/sprite), [texturas y atlas](https://pixijs.com/8.x/guides/components/textures), [cambios de v8 / nearest](https://pixijs.com/8.x/guides/migrations/v8), [licencia MIT del repositorio](https://github.com/pixijs/pixijs/blob/dev/LICENSE). La licencia de la versión instalada se verifica por separado. No se ha instalado ni medido PixiJS en este bloque.

Mantener `apps/web/world.ts` como fachada y extraer implementación a `engine/client/render/`. Contrato: inicialización asíncrona, `loadScene(definition, epoch): Promise<void>`, `applySnapshot(snapshot)`, `setLocalPlayer(id)`, `dispose()`. Guardar sólo el último snapshot durante carga y cancelar resultados de épocas antiguas. No importar semillas/encuentros privados desde ningún cliente.

## ADR-009 — Posición autoritativa por casillas

Estado lógico: `cell: {col, row}` con enteros, `surfaceId` y, si está animando, `step: {from, to, startedAt, durationMs}`. La celda destino queda comprometida al aceptar el paso; el renderer interpola pies desde `from` a `to`. La colisión siempre usa celdas, nunca píxeles ni el resultado visual de interpolar.

- Paso cardinal de una casilla, 300 ms por defecto como ritmo visual de exploración; no expresa velocidad reglada ni consume turnos. Joystick con zona muerta y dirección cardinal dominante; WASD/flechas equivalen a esos cuatro sentidos. En empate mantener dirección previa o aplicar un desempate estable. Sin diagonales iniciales: evita cortar esquinas y no introduce una regla diagonal de D&D.
- Una pulsación breve inicia exactamente un paso. Mantener dirección repite al terminar cada paso, mientras llegue intención reciente. El cliente manda inmediatamente al pulsar y al soltar, más heartbeat de 50 ms mientras controla; no depender sólo del intervalo para registrar taps.
- El servidor admite como máximo un paso por personaje cada 300 ms, valida celda vecina, enlace de superficie y transitabilidad. No acepta destino arbitrario, duración, velocidad ni otro characterId del jugador.
- `end`, blur, pointercancel, modal, desconexión y timeout de 250 ms impiden pasos siguientes. Un paso ya aceptado termina en su centro; no deja entidades entre celdas. Un cambio de escena cancela también la animación y fija el spawn de la nueva época.
- Los PJ pueden compartir celdas en exploración Alpha (evita bloqueos entre amigos y no automatiza combate). Aros con pequeño desplazamiento visual y marcador de apilamiento si coincide más de uno; el desplazamiento no altera celda. No usar ocupación de criaturas ocultas como colisión: revelaría su ubicación. Registrar esta adaptación de exploración, no afirmar que es una regla de combate.
- Spawns son una lista explícita de celdas válidas. Sin offsets decimales de 1,1 m. Los huecos, obstáculos, perímetro de casco y desniveles se definen en datos; conexiones entre alturas sólo por aristas de escalera declaradas.
- Interactuar con el timón requiere una celda autorizada en la superficie correcta y ningún paso pendiente. Usar `interactionCells` declarativas junto al prop. El DM resuelve dados físicos. Teletransporte DM recibe una celda y pasa el mismo validador de navegación, incluso en aproximación; no validar llamando a movimiento con delta cero.

Incrementar `PROTOCOL_VERSION` a 2 y documentar mensaje de recarga para clientes incompatibles. `input:move` mantiene intención x/z validada y `seq`/`sceneEpoch`, con semántica cardinal nueva; añadir `scene:ready {sceneEpoch}`. Derivar dueño del socket autenticado y comprobar que es el controlador activo. Descarta movimiento hasta carga confirmada. Reiniciar secuencia por conexión/controlador, sin permitir paquetes de una conexión reemplazada.

Snapshots v2: `v`, `revision`, `serverTime`, `sceneId`, `sceneEpoch`, entidades visibles con `cell`, `surfaceId`, `step`, `tokenId`, orientación y datos públicos; props, cámara y clima. Un snapshot completo basta para entrada tardía y movimiento en curso. Conservar ACK de comandos y audio. No enviar ubicación o referencia de foco de una entidad oculta. UUID idempotente por sesión y tipo, con límite/expiración; `sceneEpoch` también en comandos dependientes de escena del DM.

## ADR-010 — Cámara, cuadrícula y arte

Proyección afín estable: `screenX = originX + col * tileWidth`, `screenY = originY + row * tileHeight - elevationPx`; sin rotación ni fuga. `tileHeight / tileWidth = 0,875` inicial. La cuadrícula cuadrada del mundo aparece apenas comprimida verticalmente. Las alturas son offsets visuales discretos con escaleras dibujadas; una sola superficie jugable por celda para la combinación C1/C2/C3 de esta Alpha. No hay pisos superpuestos visitables todavía.

Referencia inicial de densidad: tile de 48×42 píxeles lógicos y sprite de 48×64 con pies anclados al centro inferior. Ajustar juntos si el atlas lo exige, manteniendo densidad homogénea. Texturas con `nearest`, sin suavizado; viewport lógico y escalado entero cuando quepa. Redondear posición final de dibujo a píxeles, no el estado ni la cámara lógica. Probar 1920×1080, 390×844 y 844×390; no reducir todo el mapa hasta volver los tokens ilegibles en portrait.

Capas: agua/rocas exteriores; suelo; cuadrícula; aros/pies; entidades y props ordenados por pie; partes altas atenuables; espuma/lluvia/luz sin tapar casillas. El timón tiene sprites upright/caught/fallen. Mástiles/velas divididos en base y parte alta: atenuar sólo la parte alta si tapa un token, no eliminar la lectura del tablero. Grid siempre visible en ambas vistas públicas, incluida aproximación aunque no permita navegación.

Cámara pública: `fixed` encuadra cubierta completa; `semiFixed` sigue centro del grupo visible con zona muerta; `follow` sigue foco elegido por DM. Sin foco, centro del grupo visible. Límites de mapa y zoom estable, sin girar ni variar inclinación. Móvil puede usar recorte centrado en su PJ para leer casillas, manteniendo orientación, escala de mundo y mismo estado autoritativo. No hacer que la identidad local cambie la cámara del proyector.

Arte real por capas: tablones con roturas y variaciones, bordes del casco curvos/escalonados, algas y percebes, basalto, huesos claros, mar con espuma animada, siluetas equipadas. No aceptar rectángulos planos con ruido como equivalencia de las referencias. Atlas PNG local con transparencia para tokens y props; puede generarse arte original con ImageGen siguiendo su skill, o incorporar sprites libres con licencia comprobada. Conservar procedencia y archivos editables/manifiesto. Los recursos generados se identifican como tales, sin etiquetarlos CC0 por defecto. Las referencias aportadas permanecen como referencias; no aplanar mapa y personajes juntos en una captura estática.

Cada token se define por `tokenId`, ruta/atlas, frames, anchor, tamaño de huella, escala, aro y animaciones idle/walk; los nombres de Mike/Mia/Maria no aparecen en el renderer. Debe funcionar un PNG estático importado sin animación. Para demostrar sustitución, crear una variante local y cambiar sólo un registro, sin tocar código de render/red. No hace falta editor ni subida por navegador en esta Alpha. Assets genéricos no contienen posiciones, triggers ni selección de encuentros.

## ADR-011 — Separar pack público antes de importarlo

`public/pack.ts` actual mezcla navegación con `characterSeeds` (PG e inventarios) y `harpyStart`. Hoy es importado por servidor, pero publicarlo como manifest de renderer filtraría datos. Mover semillas y encuentros a `private/seed.ts` y notas runtime a `private/notes.ts`, sólo imports de servidor. Mantener tipos genéricos de escena/entidad en `engine/shared`; el engine recibe un pack inyectado, sin importar directamente Stormwreck Isle.

`public/scene` contiene únicamente terreno, navegación conocida, props y assets genéricos autorizados. En servidor, HTTP expone build y directorios de arte/audio concretos, nunca raíz del repo o todo `campaigns`. El HTML de login/panel no incluye nombres de encuentros ni notas privadas; `dm:state` autenticado entrega el catálogo necesario. Sanear foco de cámara al serializar o al ocultar su entidad y probarlo.

## Orden único del próximo bloque

1. Reproducir y corregir los cuatro fallos de `scripts/audit-baseline.mjs`; corregir UUID para HTTP LAN, cookies malformadas y confirmaciones de control/reconexión.
2. Separar público/privado y engine/pack; implementar celdas, superficies, intención y protocolo v2 con tests de autoridad.
3. Instalar/fijar PixiJS, construir atlas y mapa del pecio, montar renderer con carga por época y grid permanente.
4. Conectar Player/Projector, input por pasos, cámaras y oclusión; mantener DM, interacción, PG e inventario.
5. Corregir sincronía/fades de audio y preparar Windows reproducible. Typecheck de cliente y servidor.
6. Build y pruebas de red, navegador, privacidad de artefactos y reconexión; ejecutar secuencia completa de mesa. Registrar hardware no probado y comparaciones visuales con las referencias.

No entregar otro plan al acabar ese bloque: candidata ejecutable. Si hay un fallo puntual, resolverlo con Sol. Volver a Astra sólo ante un bloqueo transversal reproducible o para auditoría final que lo justifique; sin cambio automático ni subagentes.
