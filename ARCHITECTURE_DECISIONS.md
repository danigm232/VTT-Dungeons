# Decisiones de arquitectura

## ADR-028 — Órbita de cámara 3D sin transformar el mapa

Decidido el 24/09/2026. Aplicable a todas las escenas con renderer `babylon-hd2d` y terreno, incluidas `wreck-ship` y `dragon-rest`; las escenas 3D futuras heredan este comportamiento.

1. La cámara ortográfica mantiene su inclinación 3/4 y permite ocho azimuts separados por 45°. Q gira a la izquierda, E a la derecha; la vista inicial puede recuperarse en cualquier momento y el DM conserva una preferencia local por escena.
2. Sólo se transforma la cámara Babylon alrededor del punto de interés. Celdas, alturas, personajes, props, efectos, cuadrícula, navegación y colisiones mantienen sus coordenadas del mundo. El renderer convierte el `facing` lógico de cada personaje en la dirección de sprite relativa al azimut visible.
3. La exploración del DM es local por defecto. Al activar «Compartir giro con la mesa», el ángulo actual se transmite en tiempo real al proyector y a los jugadores que reciben esa escena. Es estado de presentación de la sesión, no parte del guardado de partida.
4. Las vistas cliente reproducen el ángulo compartido y lo retienen para cuando carguen esa escena. La cuadrícula y los overlays tácticos se vuelven a proyectar con la cámara; la selección de casilla sigue convirtiendo el clic al terreno y a la celda originales.
5. La aceptación cubre el Pecio y el Retiro del Dragón: ocho orientaciones, transición, correspondencia entre casilla/clic/objeto/ficha y sincronización opcional con proyector/jugadores. Un mapa que sólo tenga una ilustración plana Pixi no puede ofrecer una órbita espacial coherente hasta disponer de geometría y profundidad para sus elementos.

## ADR-027 — Primacía del mapa compuesto sobre la malla de presentación

Decidido el 22/09/2026 por revisión visual explícita del usuario, en candidata `0.3.2-dev.2`. La malla Babylon de A–D es válida como prueba de geometría y superficies, pero no puede ocultar el fondo táctico ni sustituir la dirección artística de la campaña.

1. Una escena navegable debe presentar en todo momento mapa, grid, fichas y objetos en el mismo sistema de coordenadas. Una plataforma de casillas plana/inclinada sin el mapa es un fallo visible, aunque los puertos y tests de terreno funcionen.
2. Mientras Babylon no componga fondo HD-2D, cámara, proyección de fichas, props y grid con calidad equivalente, A–D usan Pixi. El campo `terrain` permanece como verdad de superficies/alturas, no se degrada el servidor ni se reintroduce una posición plana separada.
3. El estándar de aceptación visual está en `docs/PECIO_VISUAL_STANDARD_20260922.md`: lectura cenital-oblicua suave, entorno pictórico rico, contraste marino frío/luz cálida y overlay táctico discreto. Las referencias guían estilo, no autorizan copiar sus assets, textos o UI.
4. Ningún fondo futuro desplaza el plano maestro 28×18, P01–P16, anclas C4/C8/C9 ni hornea objetos o secretos runtime. Babylon se reactiva planta a planta sólo tras prueba de composición visual y funcional superior a la presentación Pixi.

La comprobación aislada DM/jugador/proyector mostró de nuevo el mapa en las tres vistas, con consolas limpias. No certifica fondos finales, dispositivo físico, rendimiento ni perspectiva aceptada por el usuario.

## ADR-026 — M2: estado interactivo único, botín con propietario y puertos condicionados

Decidido e implementado el 22/09/2026 en protocolo 19/candidata `0.3.2-dev.1`. Extiende los contratos de objeto y SaveV1 sin duplicar estado por vista.

1. Cada interactivo conserva una única instancia runtime dentro de `(sceneId/mapId, objectId)`. La definición pública aporta huella/asset neutro; la semilla privada aporta listón, trampa, contenido y paquete. Animaciones y avisos no son verdad durable.
2. `P06` ya no acepta `adjudicate` como atajo: sólo atraviesa si `c4-barred-door` está abierta o destruida y el listón está retirado. Listón y hoja son estados ortogonales y ambos participan en undo/CAS.
3. C6 usa revelado, apertura, trampa `armed|spent` y propietario de botín. El objeto oculto se elimina tanto de `WorldSnapshot.props` como de `WorldSnapshot.scene.props`; el contenido/propietario nunca entra en DTO público. Rearmar es una orden DM explícita.
4. C8 contiene tres objetos con IDs y huellas propias. C9 conserva superficie lógica, contexto de primera apertura y estado del paquete; abrir sumergido lo libera, abrir fuera del agua no inventa la burbuja. Botín y paquete tienen como máximo un propietario.
5. Recolocar valida terreno por superficie, actores, objetos, mounts, spawns y extremos P01–P16. Undo nunca desplaza actores y revierte el propietario como un solo estado, sin añadir copias al inventario.
6. SaveV1 añade campos opcionales por objeto y `surfaceId`; los guardados Stormwreck 0.3.1 reciben sólo los interactivos M2 ausentes desde sus semillas. `campaignStateVersion` continúa en 1 porque la migración es compatible y no altera valores existentes.

La comprobación local en navegador no equivale a aceptación física: quedan móvil/dispositivo real, proyector físico, audio escuchado, FPS y recorrido completo.

## ADR-025 — M1b: ubicación individual, foco separado y escena autorizada

Decidido e implementado22/09/2026 en protocolo18/candidata0.3.1-dev.1. Concreta ADR-023/024 sin sustituir los contratos de objetos y persistencia0.3.

1. La ubicación durable de cada PJ es `(sceneId/mapId, surfaceId, cell)`. SaveV1 acepta `sceneId` opcional: un guardado anterior hereda el `payload.sceneId`, de modo que `campaignStateVersion` continúa en1 y la migración no invalida copias existentes.
2. `GameState.sceneId` representa el foco compartido DM/proyector. `view:focus` cambia sólo ese foco. El selector de escena de la consola DM usa `scene` en todos los mapas: incrementa el epoch, coloca al grupo en los spawns del mapa elegido y sincroniza el mapa activo de DM, proyector y jugadores.
3. `WorldSnapshot` incluye una sola `scene` ya autorizada. DM/proyector reciben el foco; cada jugador reclamado recibe el mapa de su PJ, que coincide con el seleccionado por el DM tras una transición de grupo. El catálogo HTTP anónimo elimina escenas `access:authorized`, sus perfiles y URLs; nunca contiene puertos ni condiciones. El asset/shader no es una barrera de privacidad.
4. P01–P16 permanecen privados en `CampaignServerBundle`. `entity:portal` deriva la entidad del ID autorizado por DM y valida puerto, dirección, origen exacto, superficie, terreno y ocupación. `hatch`/`hole` y retornos marcados `adjudicated` exigen confirmación DM; `conditionId` también. La operación reserva implícitamente ambos extremos al ser un commit síncrono y rechaza un actor en paso.
5. C8 expresa `medium:water` y `movementCost:2`; el servidor consume ese coste. C9 carece de luces, usa oscuridad0,9 y revelado manual mediante autorización de vista. Babylon conserva A–D como geometría preparada; por ADR-027 Pixi presenta temporalmente los mapas completos hasta que Babylon componga arte, grid y fichas sin regresión visual.

La prueba local de navegador no equivale a aceptación física: quedan para M7 segundo dispositivo, proyector real, rendimiento, audio y recorrido completo.

## ADR-024 — Pecio completo: cuatro plantas, mapa maestro y secuencia por contenido

Decidido21/09/2026 tras encargo de auditoría/planificación. Documentación, no implementación. Sustituye el orden inmediato D8 y la obligación de esperar a editor/FOV general para completar capítulo3; conserva ADR-023, servidor web autoritativo y Babylon como destino. Contratos antiguos gobiernan lo ya existente salvo cambios posteriores explícitos; sus estados de implementación son históricos.

1. Un plano maestro1,5m; cuatro mapas/vistas: A superiores/exterior(C2/C3/cofa), B principal(C1/C4–C7), C inferior(C8), D bodega(C9). C4/C5 bajo C3, C6/C7 bajo C2, al nivel de C1; no planta interior intermedia. Vista contextual nunca duplica actor/objeto. Grafo/puertos y excepciones en `campaigns/stormwreck-isle/private/PECIO_SPATIAL_PLAN.md`.
2. Separar posición persistente por entidad (mapa/superficie/casilla), zona narrativa y encuadre público. Cambiar vista no teletransporta grupo ni reinicia combate. Tránsitos dirigidos según medios, autorización y ocupación. Agujero/salto no se convierte en escalera bidireccional gratuita. Campos exactos de protocolo/save y migración se cierran en M1b antes de editar.
3. Fuentes estáticas/capas reutilizables para HD-2D, sin interactivos/tesoros/criaturas horneados. Reutilizar rueda/puerta/caja y arte de zombi/arpía; M1 entrega espacio navegable antes de encuentros completos. No hacer pasar una imagen o el fixture NullEngine por escena jugable.
4. Luz CANON y privacidad mínima entran en el recorrido: servidor filtra mapas/objetos/conocimiento/recursos no autorizados, proyector con vista compartida elegida; oscuridadC9 y noche no se resuelven solo con tinte. Revelado manual suficiente primero; FOV automático general puede esperar.
5. CANON frente a VTT_AMBIENCE en contenido; reglas y dados en mesa. Estados locales/persistentes independientes de animación y eventos efímeros. DM decide consecuencias significativas; ambiente automático. No se fija en esta auditoría el esquema final de cofre/trampa.
6. Terra High prepara mapas M1a bajo este contrato; Sol High integra M1b y posteriores funciones. Astra resuelve contradicciones transversales; Luna prepara inventarios/evidencia. Un modelo por turno y cambio manual, sin subagentes. M1a no es release; cada candidata integrada mantiene recorrido previo, guardado, permisos y arranque. Orden y gates vigentes en `ROADMAP_V1.md`.

## Registro histórico de decisiones anteriores

Estado vigente 2026-09-15: Alpha 0.2.1 RC1 implementada, prueba física parcial y FAIL visual de puerta; 0.2.0 RC2 sigue aceptada operativamente. ADR-020–022 cierran diseño de puerta/persistencia para entrega conjunta 0.3 por Sol; todavía no implementados. El usuario aplaza puerta/móvil físicos hasta esa entrega, sin aceptar RC1 por inferencia. Las instrucciones de secuencia anteriores son históricas.

Actualizado: 2026-09-15. **Dirección aprobada ADR-023: conservar arquitectura web y pasar gradualmente de Pixi a Babylon.js, con sprites 2D en escenarios 3D.** Runtime actual 0.2.1: Pixi/protocolo3; encargo inmediato 0.3: puerta + persistencia/protocolo4 según ADR-020–022, sin migración gráfica todavía. ADR-008–011 en [docs/TACTICAL_PIXEL_SPEC.md](docs/TACTICAL_PIXEL_SPEC.md) describen la base táctica; sus restricciones de representación plana se sustituyen para 0.3.1 y posteriores. No confundir decisiones históricas, diseño futuro e implementación actual.

## ADR-001 — Aplicación local de navegador

Un proceso Node.js 24 LTS, TypeScript, Express y Socket.IO, en `0.0.0.0:3000` (puerto configurable). Sirve únicamente el build web y los assets públicos autorizados. Vite construye las entradas DM, Player y Projector. UI con TypeScript y DOM/CSS; no hace falta incorporar React ni otro framework para tres vistas pequeñas. Un solo package.json y lockfile en la raíz, sin monorepo de paquetes ni Docker.

Rutas de usuario: `/dm`, `/player`, `/projector`. Lanzador `INICIAR.cmd`, instalación separada y documentada, comprobación de Node, dependencia bloqueada por lockfile y mensajes de errores legibles. Tras instalar/build, jugar no debe necesitar internet, CDN ni Codex. El runtime de Codex sirve para desarrollar, pero no es una dependencia válida del lanzador final.

En consola y DM: localhost para DM/proyector y IPv4 LAN candidata para móviles; seleccionar IP si hay VPN o varios adaptadores. QR local con biblioteca qrcode, nunca un servicio externo. Mostrar que Wi-Fi de invitados/aislamiento y firewall pueden impedir conexión. No abrir puertos del router ni cambiar firewall silenciosamente. Extender escritorio Windows para proyectar sólo la vista pública.

## ADR-002 — HISTÓRICO, sustituido: Three.js con simulación 2D y altura visual

Three.js es el renderizador de Alpha: modelos glTF, materiales, luz, sombras moderadas, animación, partículas y cámara ortográfica oblicua. Su capacidad 3D evita pintar una falsa vista cenital y permite conservar alturas, casco y océano. No añadir React Three Fiber, Havok ni física rígida para esta escena.

Mundo: metros, X este, Z sur, Y altura. Navegación en XZ sobre superficies explícitas de cubierta y rampas. El servidor calcula colisiones con huella circular y obstáculos 2D; la altura procede de la superficie, nunca del móvil. Una pequeña solución cinemática es aceptable para esta geometría acotada: disco contra límites/obstáculos, subpasos y deslizamiento. No escribir un motor de física general. Pasarelas/escaleras se aproximan por rampas visuales. Registrar simplificación.

Datos de navegación independientes de meshes. `WorldRenderer` debe aceptar snapshots públicos y SceneDefinition, con `loadScene`, `applySnapshot`, `setCamera`, `dispose`. No anticipar una implementación completa de múltiples renderizadores; esta frontera permite añadir Pixi/2D en el futuro.

Three.js se reutiliza para cámaras, glTF, interpolación, animación y representación. NippleJS para joystick. Howler para reproducción, buses lógicos y fades. Socket.IO para transporte/reconexión. Bibliotecas resuelven infraestructura; la lógica de permisos y representación D&D pertenece al proyecto.

## ADR-003 — Estado autoritativo y filtrado por destinatario

El servidor posee posiciones, personajes, controladores, escenas, elementos, visibilidad, cámaras y estado de audio. Móvil envía intención de movimiento, nunca coordenadas autorizadas. `socket.id` no es identidad persistente.

Identidades de sesión mediante tokens aleatorios criptográficos: DM secreto mostrado sólo en consola local, sesión de jugador asignada al entrar y asignación única personaje-sesión en servidor. El móvil puede pedir un personaje disponible; asignación atómica. Reconectar recupera el mismo personaje con credencial de sesión; nombre o characterId no son prueba de propiedad. Segunda pestaña: reemplazar controlador anterior y pararlo, o rechazarla explícitamente. DM puede liberar una asignación. No cuentas online. No inferir rol por URL, query `role=dm`, nombre ni localhost sin autenticación.

DM se autentica por POST y cookie HttpOnly SameSite; comprobar origen en HTTP y Socket.IO, no habilitar CORS universal. El QR contiene sólo dirección de Player. Las credenciales nunca forman parte de snapshots ni logs compartidos. GET `/dm` puede mostrar login, pero sus datos y comandos requieren autenticación.

Tres serializadores explícitos mediante listas de campos permitidos:

| Destinatario | Información |
|---|---|
| DM autenticado | Estado completo necesario, privados de campaña, conexiones y comandos |
| Player | Mundo público + su PG, inventario e información privada propia |
| Projector | Mundo visible, cámara y ambiente; sin PG, inventarios, notas ni herramientas |

Una criatura oculta se omite por completo del snapshot público, incluidos nombre, posición, id y mensajes. Ocultar elimina inmediatamente su representación. Filtrar también interacciones, errores, logs, manifiestos, assets de escena y mensajes de entrada tardía. Un asset genérico de criatura no debe incluir su ubicación ni notas. Ningún import de `private/` en cliente, ni estático de raíz, ni source maps con datos privados.

## ADR-004 — Protocolo pequeño y comprobable

Protocolo versionado `v:2`. Validación en ejecución con Zod; TypeScript no valida la red. Mensajes acotados, ids existentes, amplitud de vector máxima 1, casillas enteras y payload limitado. El cliente no decide destino válido, duración del paso ni resultado de interacciones.

| Mensaje | Contrato mínimo |
|---|---|
| input:move | `{seq, sceneEpoch, x, z, end?}`; intención convertida a un paso cardinal; personaje derivado de sesión |
| player:interact | `{commandId, sceneEpoch, targetId}`; comprobar distancia y disponibilidad |
| dm:command | unión validada para escena, reveal/hide, teleport, cámara, audio, clima, PG y resolución de interacción |
| world:snapshot | `{v, revision, serverTime, sceneId, sceneEpoch, entities, camera, environment, props}` filtrado |
| player:private | sólo a sesión propietaria; PG, inventario y resultado autorizado |
| dm:state | sólo a DM; incluye solicitudes de interacción pendientes |
| audio:state | música y capas con volumen, estado, offset y startedAt |
| sfx:play | `{eventId, serverTime, sfxId}`; efímero, deduplicado y sin replay tardío |
| command:result | ACK `{commandId, ok, code}` sin revelar datos ajenos |

Simulación fija inicial 30 Hz; snapshots completos filtrados 20 Hz para hasta cinco jugadores. Cada paso autorizado dura 300 ms y termina en el centro de la casilla. Input con último cardinal vigente y secuencia creciente por conexión. No acumular paquetes viejos. Parada por `end`, blur, visibilitychange, desconexión y timeout de intención de 220 ms; el paso ya aceptado termina y no comienza otro.

Render independiente con interpolation buffer inicial 75–100 ms. Objetivo medido en LAN: input visible <150 ms habitual; presupuesto de Alpha p95 <200 ms, sin prometerlo sin medir. Movimiento diagonal normalizado. Predicción local sólo si se demuestra necesaria, reutilizando exactamente la colisión compartida.

Comandos importantes usan ACK e idempotencia por sesión/commandId; reintentos no duplican interacción. Socket.IO ordena mensajes pero no garantiza por sí solo entrega persistente de todos los eventos: [garantías oficiales](https://socket.io/docs/v4/delivery-guarantees/). Tras conectar o reconectar, enviar snapshot completo + audio actual, nunca depender sólo de eventos pasados.

Cambio de escena: incrementar sceneEpoch, parar todos, cancelar solicitudes obsoletas, cambiar spawns válidos, reemplazar estado público atómicamente y cargar escena con fundido. Ignorar inputs/ACK de escena anterior. Cliente anuncia scene:ready antes de habilitar joystick. Puede reenviarse estado durante la carga sin construir entidades de la escena vieja.

## ADR-005 — Cámara y control relativos a pantalla

Implementar modos `fixed`, `semiFixed`, `follow` en un controlador pequeño. Datos por campaña: posición/target ortográficos, límites, zona muerta, tiempo de transición y foco. Cubierta usa por defecto encuadre fijo oblicuo que permita ver al grupo; semi-fija con zona muerta y seguimiento seleccionable por DM de un personaje. Un solo encuadre público compartido; DM puede tener vista de trabajo independiente.

Orientación estable sin rotación libre. En la migración usar ejes cardinales de la proyección táctica. Atenuar oclusores decorativos: el mástil no puede ocultar al jugador durante todo un recorrido. **Grid siempre visible**, conforme a ADR-010 y corrección del usuario.

## ADR-006 — Audio central y capas independientes

Salida predeterminada única: Projector en el PC conectado a altavoces. DM controla sin duplicar sonido; móviles silenciosos. Un gesto local de preparación en Projector desbloquea audio/pantalla completa, luego desaparece la capa de preparación. DM ve el estado audio listo/bloqueado. Navegadores pueden impedir autoplay: no declarar el audio roto ni simular activación sin gesto.

Música ambiental original de 60–90 s en loop, no sólo un tono constante. Ambiente: océano, viento, crujidos y tormenta como capas con volumen propio y bus master. SFX mínimo trueno, crujido e impacto/aparición. Howler con fades 0.8–2 s; limiter o margen conservador de mezcla. Generar placeholders originales con herramientas locales (WAV PCM) es aceptable y debe quedar documentado con generador y parámetros. Explorar recursos libres sólo si mejoran resultado sin prolongar búsqueda ni añadir derechos inciertos.

Estado persistente de música/ambientes separado de SFX efímeros. Al volver Projector, aplicar niveles actuales y posición de loop estimada desde reloj servidor; no repetir truenos antiguos. Si el contexto se suspende, mostrar bloqueo al DM y recuperar cuando sea posible. Alpha no exige precisión de audio sample a sample entre varios dispositivos.

## ADR-007 — Packs de campaña y crecimiento

`engine/shared`: tipos, validación, geometría; `engine/server`: sesiones, simulación, permisos, serializadores, comandos; `engine/client`: transporte, input, cámara, render y audio. `apps/server`: configuración/HTTP/inicio; `apps/web`: entradas separadas. `campaigns/stormwreck-isle/public`: descripción visual, recursos publicables y navegación sin secretos; `private`: notas/encuentros/semillas de fichas sólo servidor.

CampaignPack versionado con ids estables, SceneDefinition, spawns, superficies, obstáculos, props, puntos de interacción, cámaras, manifiesto de recursos y referencias de procedencia. `sourceKind`: official | adaptation | addition, más referencia de documento/página. Separar definición estática y estado runtime. No incluir en el engine nombres de personajes, capítulos, PG ni coordenadas de esta campaña.

Persistencia completa aplazada; conservar asignación durante reconexión en la misma ejecución. Si Sol añade snapshot JSON local, hacerlo atómico y versionado; no es condición de Alpha. Reinicio con pérdida de estado debe documentarse. Sin editor, combate automático, IA, reglas completas ni inventario exhaustivo.

## ADR-012 — Pack inyectado, DTO público y escenario de objetos

Decidido para 0.2. Apps/server compone CampaignServerBundle con datos públicos, semillas y notas privadas. Engine recibe el bundle y compila navegación; no importa campañas. Las entradas web reciben PublicCampaignDefinition JSON desde `/api/campaign`, validado y serializado por lista permitida. SceneId genérico validado contra catálogo; títulos, escenas, tokens, audio y referencias de encuentro/timón son datos. Un bundle sintético prueba desacoplamiento sin contenido artístico extra.

Puerta y caja se demuestran en una tercera escena añadida, sin modificar C1/C2/C3 ni representar C4. Geometría y recorrido exactos en `docs/fixtures/alpha-0.2-objects.json`. Arte por capas de suelo limpio, puerta abierta/cerrada y caja horizontal/vertical; procedencia declarada.

## ADR-013 — Objetos por tipo y ocupación autoritativa

Decidido para 0.2. Extender props por unión discriminada; conservar actores y capacidad del timón. Map/TypeScript son suficientes, sin ECS ni física continua. Puerta fija 1×1, abierta/cerrada/bloqueada; bloqueo serializado públicamente como cerrada. Caja con transformación entera y huella rotada normalizada, demostración 2×1. Posicionamiento DM discreto, validado en destino.

Terreno base y bloqueos dinámicos se separan. Movimiento/teleport usan ambos; edición valida toda huella contra terreno, otros objetos, spawns y actores visibles/PJ incluso desconectados. Un paso reserva origen y destino hasta terminar. Se permiten actores apilados según ADR-009. Criaturas ocultas no bloquean ni generan rechazo dependiente de su posición. No hay objetos sólidos ocultos en 0.2. Cerrar una puerta puede separar habitaciones deliberadamente; no se exige conectividad global.

## ADR-014 — Protocolo v3 y transacciones de objetos

Decidido para 0.2. Versionar handshake y snapshots a v3 antes de permitir control. SceneEpoch invalida escena/carga; world.revision ordena snapshots; objectRevision por escena controla CAS de ediciones y no cambia por caminar/audio/cámara. Nuevos comandos object:door, object:transform y object:undo estrictos y exclusivos del DM. Validación+commit síncronos sin await; una operación afecta estado, colisión y revisión de forma atómica.

Idempotencia acotada por sesión/dominio/UUID con fingerprint y resultado final; mismo ID con payload distinto rechazado. Preview local privado no muta servidor. Snapshot completo y guardas de generación/epoch/revisión tras awaits de assets evitan regresión visual al reconectar/cambiar escena.

## ADR-015 — Deshacer acotado y crecimiento

Decidido para 0.2. Historial LIFO compartido por DM y por escena, máximo 50 operaciones de puerta/caja. Undo restaura sólo campos del objeto después de revalidar ocupación actual; si falla no consume la entrada. Aumenta revisión, no retrocede el reloj ni reposiciona PJ. Objetos/historial viven durante el proceso y sobreviven a cambios de escena; disco en 0.3, timón separable/destrucción en 0.2.1.

Implementación íntegra y O01–O12 en `docs/ALPHA_0_2_CONTRACT.md`. No dar por aceptados gates físicos o rendimiento por disponer de este diseño.

## ADR-016 — Cierre de auditoría Alpha 0.2 y contrato preciso para Sol

Decidido por Astra, 2026-09-13. Auditoría reproducible en `docs/ALPHA_0_2_ASTRA_REVIEW.md`: RC1 está incompleta. No se reduce el alcance de ADR-012–015 ni se da por finalizado el editor por tener formularios. Sol implementa; Astra no necesita diseñar otra arquitectura.

1. **Composición y tipos.** Crear tipos/schemas públicos en `engine/shared/campaign.ts`, geometría pura en `engine/shared/geometry.ts` y bundle privado/compilación en `engine/server/campaign.ts`. `campaigns/stormwreck-isle/server.ts` compone los datos actuales, importado sólo por apps/server y pruebas de campaña. GameServer recibe bundle obligatorio y construye GameState(bundle), sin fallback a Stormwreck. SceneDefinition runtime usa índices Set compilados a partir de arrays JSON de `Cell {col,row}`; HTTP sólo entrega el DTO público validado. No importar tipos privados en cliente. Mantener las funciones pequeñas; no requiere frameworks.
2. **Datos genéricos suficientes.** Catálogos de escenas, roster, tokens, props y audio (música, cuatro capas y tres SFX); cada asset visual declara variante, tamaño lógico y ancla. Bundle privado añade semillas de PJ, encuentro opcional con sceneId y semilla/nota, e interacción opcional de timón con sceneId/targetId/celdas/notas. Si no hay encuentro/timón, el DM oculta esos controles y el runtime no los presupone. No añadir un lenguaje de reglas. Fondo, marco y variantes de sprites nuevos son trabajo de Sol conforme al contrato artístico.
3. **Wire canónico v3.** Conservar el campo de entrada `objectRevision` de RC1 (semánticamente revisión esperada), junto a `commandId` y `sceneEpoch`; `objectId` o `entryId` según tipo. No introducir además `expectedObjectRevision` ni exigir `sceneId` en la petición: epoch identifica la escena activa y el comando de cambio de escena valida pertenencia al catálogo. Resultado de objeto siempre incluye sceneId/sceneEpoch/objectRevision actuales, también STALE_SCENE. Esta decisión sustituye los nombres de entrada inconsistentes del contrato inicial. Todas las vistas deben recargarse tras instalar la nueva candidata; v2 no puede controlar.
4. **Revisiones.** Estado por escena `{objects, undo, objectRevision}`; volver recupera las tres partes. Commit y undo efectivos aumentan objectRevision y world.revision una vez; rechazos y NO_CHANGE no cambian ninguna. World.revision ordena snapshots completos también al cambiar propiedades públicas; sólo el contador de objetos es exclusivo del DM. No usar timestamps como desempate de cargas ni el contador de objetos para el renderer público.
5. **Validación/serializadores.** Separar locationFootprint y blockingFootprint. Cajas no ocupan marcos abiertos; actores sí pueden cruzarlos. Door locked → open rechaza DOOR_LOCKED; closed desbloquea; abrir una puerta cerrada elimina bloqueo y puede hacerse durante un paso. DmObject muestra locked, PublicProp sólo closed/open. Caja no tiene estado de puerta. Validar usando runtime, no DTO público. Reserva PJ: cell destino + step.from mientras step exista, incluso desconectado; añadir criatura visible sólo en escena/superficie actual. Criatura oculta no influye. Spawns reservados siempre.
6. **Idempotencia.** Validar schema estricto, crear representación canónica del payload (claves ordenadas), consultar caché por sesión DM/dominio objetos/UUID antes del CAS. Reintento idéntico devuelve ACK original, sin mutar/reemitir efectos; payload distinto rechaza COMMAND_ID_REUSED. Mantener máximo 1000 y TTL 10 min. Tras STALE_OBJECTS enviar al DM su estado actual y cancelar borrador; no aplicar automáticamente su intención vieja.
7. **Carga y editor.** El renderer recibe manifiesto público, mantiene token de generación por conexión y último snapshot por epoch/revision. Assets.load puede completar, pero sólo la generación vigente puede instalarlo. applySnapshot debe indicar si confirmó estado vigente; scene:ready se emite únicamente para esa confirmación. El DM comparte renderer y geometría, convierte clic con transformación inversa de Pixi, mantiene preview en una capa local que nunca se serializa. Movimiento de PJ recalcula validez sin borrar destino; nueva revisión de objetos/escena/conexión sí cancela borrador. Textos de pack siempre seguros y inputs conservan foco.
8. **Recuperación/entrega (ya completada en RC2).** Mantener `0.2.0-rc.1` como identificador del trabajo auditado; cuando Sol complete y pruebe el conjunto, publicar candidata `0.2.0-rc.2` y copia nueva sin sobrescribir RC4 ni la copia de auditoría. Exigir O01–O12, navegador y regresión RC4 antes de pedir recorrido físico. Esta restricción temporal terminó con la aceptación operativa RC2 del 14/09; persistencia sigue siendo 0.3.

## ADR-017 — Capacidades, soporte y estados estructurales

Decidido 2026-09-14, para implementar 0.2.1. Contrato exacto en `docs/ALPHA_0_2_1_CONTRACT.md` y fixture `docs/fixtures/alpha-0.2.1-objects.json`.

Wheel entra en el almacén de objetos por escena, identificado por (sceneId,objectId), sin wheelStates paralelo. Unión discriminada door/crate/wheel, capacidades transform/detach/structure validadas y transiciones cerradas. Estructura intact/damaged/destroyed independiente de la cerradura; wheel añade attached/detached y conserva upright/caught/fallen como pose. No attached+destroyed: separar antes. Puerta, caja y timón de demostración admiten daño/destrucción; no HP de objeto ni daño automático.

Soporte fijo de timón fuera del suelo transitable, siempre reservado; attached comparte exactamente su soporte. Detached ocupa 1×1, cuatro orientaciones dibujadas. Daño conserva colisión; destrucción deja restos atravesables con huella de ubicación reservada. La puerta rota publica open+destroyed, omitiendo locked. Reparar/reunir sólo por undo validado. El fondo limpio, soporte separado y sprites se preparan fuera de partida; no segmentación dinámica ni física.

## ADR-018 — Transacciones del timón, solicitudes y compatibilidad

Separar y colocar es una única transacción con destino explícito del DM. object:detach, object:structure y resolveInteraction comparten CAS/fingerprint/ACK/pila con puerta/caja. resolveInteraction requiere objectRevision y destino al resolver caught/fallen; cancelar no toca el objeto. Retirar escritura directa del comando wheel; interfaz conserva Supera/Falla mediante el nuevo borrador. Fallar no destruye ni activa encuentros automáticamente.

Solicitud ligada internamente a sesión, escena/epoch y version de objeto; se revalida al resolver y cancela por mutación del objetivo, movimiento/lejanía, pérdida de controlador, desconexión, cambio de escena o 120 segundos. Undo no revive peticiones. Historial LIFO50 por escena, instantáneas mutables completas before/after, ocupación inversa validada, contadores monótonos. Definiciones/credenciales/solicitudes no forman parte de ese historial.

Conservar protocolo v3 y exigir objectModelVersion:1 en handshake/snapshot de la extensión; rechazar RC2 sin capacidad antes de controlar. DTO público schemaVersion:2. Estado locked inicial sólo mediante override doorStates privado, nunca initialState público. Compatibilidad de puerta/caja es funcional con clientes actualizados, no permiso para conectar un cliente viejo. No se define formato de disco antes de 0.3.

## ADR-019 — Geometría compartida y presentación táctica

Funciones compartidas calculan locationCells y blockingCells y validan preview/commit/undo/movimiento/teleport. Restos/marcos/mount siguen reservando ubicación. PJ desconectados, ambos extremos de paso y criatura visible en superficie actual reservan; secretos ocultos no influyen. Attached permite sólo coincidencia exacta con mount; no excepción general de terreno por tipo.

Borrador captura revisión y generación al crearse: cancelar ante actualización de otro DM, desconexión o escena; nunca enviarlo con una revisión más reciente tomada silenciosamente. Añadir origen del paso al cálculo de preview y sprite final semitransparente. Corregir también la reconstrucción de props por snapshot. Son ampliaciones y correcciones derivadas de inspección, no negación de la prueba operativa RC2.

Conservar la proyección afín instalada (compresión vertical 0.92), grid48 y celdas existentes. Redibujar puerta orientada al tabique norte-sur y cruce este-oeste; alinear arte al fixture, no cambiar colisiones para acomodar el dibujo. Editar localmente el fondo de cubierta con nombre nuevo, quitar rueda/pedestal horneados y poner soporte en su celda lógica. Rutas/anclas/variantes/aceptación exactas en el contrato. Diseñar no equivale a producir esos assets ni a aprobarlos físicamente.

## ADR-020 — Puerta y tabique alineados como una familia visual

Decidido 2026-09-15. `docs/ALPHA_0_2_1_DOOR_VISUAL_CONTRACT.md`: corrección integrada en 0.3, sin cambiar la celda (6,4), grid48 o cámara0.92. El fondo sitúa aproximadamente el tabique x288 frente al eje lógico x312; corregir fondo local y cinco variantes, bisagra norte fija (312,192), radios48, closed hacia sur/open hacia este. Lienzo96×96 ancla(.25,.5); marco sólo en fondo; daño y restos coherentes. Reutilización: ADAPT arte propio; Tiny Dungeon CC0 comprobado pero no incorporado. No mover timón por indicación ambigua, ni modificar colisiones por ajuste artístico. Aceptación física final del usuario, no del autor del PNG.

## ADR-021 — Snapshot privado, validado y recuperable

Decidido 2026-09-15. Contrato completo en `docs/ALPHA_0_3_PERSISTENCE_CONTRACT.md`. JSON v1 de estado mutable de todas las escenas; schema estricto/hash, IDs y campaignStateVersion privados, hidratación candidata por allowlist. Descarta credenciales, input, steps, undo, solicitudes, SFX y ready; audio congela tiempo apagado. Guardar no equivale a APPLIED: escritor único, temporal sync/readback, backup de bytes previos, rename de commit, verificación y confirmación de generation. Temporales nunca ganan a un principal válido. Corrupción/incompatibilidad sin semilla/fallback destructivo; recovery explícito. Datos fuera de estáticos/build, auth DM/CSRF y export privado.

Sin SQLite ni dependencia nueva para este snapshot pequeño. Node24 LTS mínimo24.21.0/rama24 decidido explícitamente y a alinear por Sol con instaladores; no hay actualización automática del equipo. `node:sqlite` sigue API no estable en documentación inspeccionada; better-sqlite3 13.0.3 MIT soporta Windows pero añade distribución nativa sin necesidad de consultas. Fuentes en OPEN_SOURCE_REVIEW. Reevaluar DB cuando lo exija editor/múltiples partidas, no construir dos almacenes.

## ADR-022 — Reemplazo de mundo exclusivo y epoch de runtime

Protocolo4 conserva modelo de objetos1/DTO público2; UUID runtimeEpoch en cada arranque/restauración y todos los mutadores/estados. Evita que hp/audio/claim/input viejos actúen sobre la partida nueva aunque sceneEpoch se repita. Preview/confirmación DM con CAS de estado duradero; preservar memoria anterior incluso dirty, escribir candidato antes de instalar, reset ordenado de clientes y reasignación de PJ. Undo vacío tras cargar, reactivar audio con gesto según navegador. Respuesta perdida no vuelve a restaurar: requestId/fingerprint/resultados acotados. Mantener commit síncrono/CAS de objetos; IO fuera del solver.

Sol implementa puerta + persistencia en una candidata0.3 con P01–P15 y D01–D06. Por instrucción posterior explícita del usuario, ya no es obligatorio un pase físico0.2.1 intermedio. Esto aplaza la prueba, no borra su FAIL ni permite publicar0.3 con puerta ignorada.

## ADR-023 — Arquitectura web con Babylon.js y percepción individual

Decisión aprobada por el usuario, 2026-09-15. Referencia completa: `docs/HD2D_DIRECTION.md`. Conservar servidor Node/TypeScript autoritativo, Socket.IO, interfaces web DM/Player/Projector, validadores, audio y transacciones. Babylon.js reemplazará gradualmente Pixi para sprites 2D en escenarios 3D; no migrar a Godot/Unity/Unreal. Esta decisión no instala dependencias ni declara un benchmark superado. Alpha0.3 sigue con sus contratos y arte acotado Pixi; Alpha0.3.1 valida una escena 3D integrada y su migración explícita, conservando la versión aceptada recuperable.

Mantener cuadrícula lógica D&D, cámara ortográfica oblicua estable, dados físicos y arbitraje DM. Ampliar superficies/alturas/conexiones, incluyendo plantas superpuestas; no confundir 3D de presentación con física general. Estética inspirada en la atmósfera HD-2D, sin copiar assets ni prometer calidad de un equipo comercial. Recursos locales, perfil inicial WebGL2, menor calidad móvil sin perder mapa/control ni ampliar permisos.

Visión individual por capacidades configuradas por DM: servidor filtra conocimiento de entidades y recursos; un shader no proporciona privacidad. Proyector muestra vista compartida aprobada, no unión automática de sentidos. Distinguir oclusión geométrica de percepción y de legibilidad; atenuar decoración sólo para entidades ya autorizadas. La política completa llega en0.7, no existe hoy. Ampliar comportamiento/apariencia de objetos y ambientes reutilizables sin simular todas las reglas de D&D.

Astra y Sol son responsables principales de decisión e integración; Terra y Luna conservan tareas propias para usar el modelo adecuado: Terra en UI, contenido, audio/editor y documentos acotados; Luna en inventarios, manifiestos y comprobaciones mecánicas. No pasan necesariamente todas las versiones por todos los modelos ni se cambian automáticamente. Antes de0.3.1 cerrar contrato exacto y fijar versión/licencias Babylon. No reabrir selección de motores sin nueva evidencia material. No ampliar0.3 para anticipar componentes, claves de save o abstracciones gráficas que no necesita.
