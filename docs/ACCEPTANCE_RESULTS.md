# Resultados de aceptación — RC4 y avance Alpha 0.2

## Campamentos V1.4.2 — candidata visual A1, 2026-09-27

La escena A1 adopta una planta irregular con seis habitaciones, plaza, estatua y hoguera. La fachada correspondiente se abre visualmente al entrar; rutas, casillas bloqueadas e interacciones mantienen sus datos de juego independientes. El cambio incluye un atlas de materiales y vegetación ilustrada. Es candidata técnica; el usuario aún debe revisar la lectura artística y el movimiento en los dispositivos de mesa.

| Comprobación | Resultado | Alcance |
|---|---|---|
| Suite completa | PASS — 190/190 | 18 archivos de pruebas, incluida geometría A1, fachadas, navegación y persistencia. |
| Typecheck cliente/servidor | PASS | Ejecutado directamente con el TypeScript bloqueado del proyecto. |
| Build del cliente | PASS | Vite compiló las cuatro vistas en `tmp/a1-v5-check`, sin alterar `dist` ni la mesa local. Persiste el aviso conocido de `/art/ship/loot-atlas-m5.svg`, que se resolverá en runtime. |
| Revisión física | PENDIENTE | No se ha aceptado en el móvil, el portátil ni el proyector del usuario. |
| Procedencia artística | PARCIAL | El atlas A1 V5 tiene origen y prompt registrados; las texturas previas del bosque siguen sin ficha de origen/licencia. |

La invitación a colaborar y la aceptación de la escena no forman parte de esta verificación técnica.

## Corrección de PID reciclado y opción R — candidata 0.3.2-dev.5, 26/09/2026

El usuario observó que Stormwreck no iniciaba y que `R` no cerraba la mesa. Diagnóstico local: `stormwreck-isle/writer.lock` conservaba un PID cuya instancia anterior ya había terminado; Windows asignó luego ese número a `crashpad_handler.exe` de Spotify, iniciado después del bloqueo. El servidor confundía el PID vivo reutilizado con el dueño de la partida, mientras el helper se negaba correctamente a terminarlo porque no poseía el puerto. La partida y el proceso de Spotify no se modificaron.

La persistencia ahora escribe `processStartedAt`; en bloqueos antiguos compara la hora de creación del proceso de Windows con `createdAt`. Si demuestra reutilización, archiva únicamente el archivo `writer.lock` en `recovery` y luego permite iniciar con la partida intacta. `R` se limita a la campaña seleccionada, localiza su instancia en cualquier puerto y solicita el cierre ordenado autenticado; sólo usa terminación forzada si el PID, bloqueo y hora de proceso coinciden. Los procesos ajenos del puerto permanecen intactos.

| Comprobación | Resultado | Evidencia y límite |
|---|---|---|
| Regresión de persistencia | PASS esperado | Nueva prueba: PID válido pero `processStartedAt` distinto; conserva y archiva el bloqueo anterior, abre el guardado y no afecta al proceso de prueba. |
| Helper con PID de Spotify reutilizado | PASS aislado | Se copió a una carpeta temporal el lock antiguo con PID 12564 y su fecha original; `R` simulada archivó sólo la copia. `crashpad_handler.exe` siguió vivo. |
| Cierre ordenado desde otro puerto | PASS aislado | Servidor Stormwreck desechable en `127.0.0.1:63959`; al simular `R` para 3000, el helper usó el token local, cerró ese proceso y liberó su lock. |
| Arranque con lock legado reciclado | PASS aislado | Servidor compilado inició en 54580 con copia temporal del lock antiguo, archivó la copia y cerró ordenadamente; salida 0. Los puertos 3000 y datos reales no se usaron en estas pruebas. |
| Listener ajeno sin lock | PASS aislado | El helper rechazó cerrarlo y el servidor HTTP temporal siguió respondiendo; salida de helper 1, como se espera ante un ocupante desconocido. |
| Suite, tipos y builds | PASS | Vitest **186/186**, typecheck cliente/servidor, build de Vite y build servidor. Siguen los avisos conocidos de chunk Babylon grande y atlas SVG resuelto en runtime. |
| Arranque del usuario | PENDIENTE | Falta confirmar el recorrido con `INICIAR.cmd` en la mesa del usuario; las pruebas técnicas no sustituyen ese arranque. |

## Corrección del lanzador y mapas — candidata 0.3.2-dev.4, 26/09/2026

- `INICIAR.cmd` comprueba primero el puerto: si ya sirve una mesa, no recompila los archivos que usa esa sesión; después de liberar una mesa conocida recompila la interfaz Vite y el servidor TypeScript para incluir los mapas recientes.
- La opción R contempla Stormwreck y D8 Night. Las mesas actuales reciben una solicitud local autenticada, guardan y liberan el bloqueo. Una versión antigua se termina solo después de que su PID aparezca tanto en el bloqueo como en el puerto. El comprobador de puerto se probó con un listener libre y uno ocupado; el servidor ajeno siguió respondiendo y el helper se negó a cerrarlo.
- Pruebas aisladas, con puertos y guardados temporales: el catálogo DM de Stormwreck devolvió `dragon-rest`, `wreck-ship` y los cinco `camp-*`; el cierre autenticado liberó el bloqueo en Stormwreck y D8 Night. Ambos procesos terminaron limpiamente.
- Vitest **185/185**, typecheck cliente/servidor y build del servidor PASS; build Vite PASS. No se abrió ni cambió una mesa real en el puerto 3000; no se hicieron comprobaciones con dispositivos físicos en este cambio.

## Auditoría del pecio — 21/09/2026, sin nueva candidata

Sobre código `0.3.0-dev.1`:85/85pruebas Vitest en7archivos PASS (incluidas2 Babylon NullEngine); tipos cliente y servidor PASS con noEmit;84 rutas únicas del pack Stormwreck presentes,46de audio. No se ha generado arte, cambiado código ni ejecutado build nuevo. No se ha probado una nueva sesión de navegador/hardware ni escuchado toda la biblioteca. F0/F1/F2 del19/09 siguen siendo evidencia histórica separada. C4–C9 y capítulo completo continúan pendientes; Alpha0.2 RC2 sigue última aceptación operativa.

Auditoría privada y decisiones en `campaigns/stormwreck-isle/private/PECIO_AUDIT_20260921.md` y `PECIO_SPATIAL_PLAN.md`; secuencia vigente en `ROADMAP_V1.md`. Ninguna fase de contenido se acepta solo por tener un PNG o una prueba de tipos.

## M1a — fuentes maestras del pecio, 22/09/2026, sin nueva candidata

Se entregó la fuente privada `campaigns/stormwreck-isle/private/m1a/`: cuatro mapas alineados A–D, 16 puertos P01–P16, anclas de hueco/rueda/brecha, cuatro SVG de capas estáticas y cuatro overlays de QA. El comprobador estructural registra **PASS: 4 mapas, 16 puertos y 8 SVG XML válidos**; la columna C4/C8/C9 queda en la celda (5,6) y P02–P05 aparecen como los cuatro accesos superiores. Las capas no contienen retícula ni puertas, timón, cofres, cajas, tablón, tesoro o criaturas.

Se inspeccionó visualmente el mapa4 del PDF local y los originales privados de Drive para cofa, jarcia, escaleras y brecha. Se mantienen `STUDY`: no se descargaron, copiaron ni sirvieron, y los duplicados/rechazados quedan excluidos. No se ejecutó build, runtime, navegador ni hardware; no cambia la última aceptación Alpha0.2 RC2. M1b debe integrar, filtrar recursos, validar tránsito/guardado y ejecutar las comprobaciones de tres roles.

## M1b — candidata técnica 0.3.1-dev.1, 22/09/2026

Resultado: **PASS técnico / CANDIDATA NO ACEPTADA FÍSICAMENTE**.

| Comprobación | Resultado | Evidencia y límite |
|---|---|---|
| Contrato mapas/superficies | PASS | A–D conservan28×18,1,5m; P01–P16 y alineaciones C4/C8/C9 se validan en `wreck-runtime.test.ts`. |
| Ubicación/foco | PASS unitario + navegador acotado | Dos PJ pueden persistir en mapas distintos; `view:focus` no cambia sus ubicaciones ni combate. En navegador, el proyector cambió a C8 y Mike permaneció viendo B. |
| Puertos | PASS unitario | Origen exacto, superficie, destino libre, retorno explícito y adjudicación se validan; P11 ocupado rechaza. Hatch/agujeros requieren adjudicación. |
| Persistencia0.3 | PASS | SaveV1 acepta `sceneId` opcional por PJ; guardados anteriores heredan el `payload.sceneId`. Restore reproduce ubicaciones separadas sin subir `campaignStateVersion`. Pruebas sólo en temporales. |
| Filtrado | PASS automatizado | `/api/campaign` anónimo no contiene escenas ni URLs `/art/m1b/`; el socket entrega sólo `WorldSnapshot.scene` autorizada. Puertos/conditionId no aparecen en snapshot público. Los ficheros estáticos no se consideran control de privacidad. |
| Babylon | PASS navegador local | DM, jugador y proyector mostraron canvas `Terreno HD-2D Babylon`; capturas inspeccionadas y las tres consolas sin error/aviso. Pixi conserva escenarios antiguos y overlay de fichas durante la migración. |
| C8/C9 | PASS de contrato | C8: agua y coste2 en tiles; C9: oscuridad0,9, sin luces y `manualReveal:true`. Falta juicio físico de legibilidad. |
| Regresión | PASS automatizado | Typecheck cliente/servidor;89/89 tests en8archivos; build producción PASS. Incluye puerta, timón, control, one-shot y14 pruebas de persistencia. |

No ejecutado: dos dispositivos reales simultáneos, recorrido P01–P16 completo en UI, móvil, proyector físico1080p, FPS, audio escuchado ni reapertura de una sesión física. Por ello Alpha0.2 RC2 continúa como última versión aceptada operativamente.

## M2 — candidata técnica 0.3.2-dev.1, 22/09/2026

Resultado: **PASS técnico / CANDIDATA NO ACEPTADA FÍSICAMENTE**.

| Comprobación | Resultado | Evidencia y límite |
|---|---|---|
| C4 y P06 | PASS | P06 rechaza incluso con adjudicación mientras el listón siga puesto o la hoja cerrada. Retirar listón y abrir son commits separados, CAS/undo y persistentes. |
| C6 | PASS | El alijo no aparece en `WorldSnapshot.scene.props` ni `props` antes de descubrirse; trampa armada impide apertura simple, `trigger-open` la gasta una vez y rearme es explícito. Etiqueta y propietario del botín quedan sólo en DM/save. |
| C8 | PASS | Tres contenedores con IDs/huellas propios, apertura y propietario único. Undo revierte asignación sin duplicarla; mover sobre actor, spawn, objeto, mount o extremo de puerto se rechaza. Agua/coste2 se conservan. |
| C9 | PASS | Cofre con superficie lógica. Apertura sumergida registra contexto y libera paquete; apertura seca no lo libera. Cofre/tesoro/paquete conservan ubicación y propietarios tras save/restore. Contenido y URLs específicas no se publican. |
| Compatibilidad | PASS | SaveV1 amplía filas de objeto con campos opcionales y `surfaceId`; un guardado Stormwreck0.3.1 recibe únicamente los objetos M2 ausentes desde semillas. `campaignStateVersion` sigue en1. |
| Regresión | PASS | Typecheck cliente/servidor;93/93 tests en8archivos; integraciones general, objetos y persistencia PASS; build producción PASS. |
| Navegador local | PASS acotado | DM mostró listón retirado/puerta abierta, alijo descubierto y trampa gastada, tres contenedoresC8 y cofre sumergido que libera paquete. Jugador y proyector mostraron Babylon; DM/jugador/proyector acabaron sin errores ni avisos de consola. |

No ejecutado: móvil o segundo equipo real, proyector físico1080p, FPS, audio escuchado, recorrido completo con dos PJ ni juicio físico final de la perspectiva de puerta. Alpha0.2 RC2 continúa como última versión aceptada operativamente.

Copia recuperable técnica: `backups/pecio-m2-0.3.2-dev1-20260922.zip`, 574 680 305 bytes, 854 entradas ZIP comprobadas, SHA-256 `A1547C835013350FF8A689CD6D83773FC228F371DB04FAB434148CFFA68E1F2B`. Incluye fuentes privadas del pecio; no es una distribución pública ni convierte la candidata en aceptada.

## M2.5 — corrección visual inicial 0.3.2-dev.2, 22/09/2026

Resultado: **PASS de corrección inmediata / NO es el acabado artístico del Pecio**.

La presentación A–D vuelve a Pixi, que muestra fondo, cuadrícula, fichas y props alineados en vez de ocultarlos tras la malla Babylon vacía. La geometría Babylon y el estado lógico permanecen preparados, pero no se reactivarán visualmente sin una composición HD-2D coherente. El estándar vinculante y las seis referencias inspeccionadas están en `docs/PECIO_VISUAL_STANDARD_20260922.md`.

Typecheck, 93/93 pruebas y build de producción PASS. Navegador local aislado comprobó planta principal en DM, jugador y proyector: mapa visible, ficha visible y consolas sin avisos ni errores. No se usó la partida real ni se probaron dispositivo físico, FPS, audio o los fondos finales A–D.

Copia recuperable de esta base: `backups/pecio-m25-0.3.2-dev2-20260922.zip`, 574 683 492 bytes, 855 entradas comprobadas, SHA-256 `B8E6129D78322E4157BBA3920040D0216F8C66949430A65776D3EFF9404CF96B`.

## Historial de aceptación anterior

**Lectura vigente:** Alpha 0.2.0 RC2 es la última versión aceptada operativamente. Superó la batería técnica y el recorrido físico específico el 2026-09-14; los registros de RC4, RC1 y la auditoría Astra se conservan como historial.

Fecha: 2026-09-13. Build identificado por `package.json` como `0.1.1-rc.4`. Estado: **Alpha 0.1.1 funcionalmente aceptada en sesión física; métricas formales y pulido de SFX pendientes**.

Antes de modificar se creó `backups/alpha-0.1-before-0.1.1-20260913.zip` (SHA-256 `C89FADB04D3FE08EFB20DAF7274C2E01B2AD8FB0811410DF33EB400E485653D3`, 15 301 513 bytes). Incluye fuente, documentación, recursos y build anterior; `backups/` queda fuera de Git.

Después de la batería RC1 se conservó `backups/alpha-0.1.1-rc1-20260913.zip` (SHA-256 `51BB86ED65841A0C9E04857A3C5AF39FA0DD96B3AB5112A0C671682EA56744B5`, 15 308 498 bytes). RC2 queda archivada en `backups/alpha-0.1.1-rc2-20260913.zip` (SHA-256 `A024583F5220DC377DD516D2AB191B30521CA359BC0B7C25EE0C8CE946AD610F`, 15 310 580 bytes).

RC3 queda archivada en `backups/alpha-0.1.1-rc3-20260913.zip` (SHA-256 `62D6DB774310ED1E883D0F171BDE6797720F46BB03EEEC247AC000BCA3EB9506`, 15 311 707 bytes).

RC4 queda archivada en `backups/alpha-0.1.1-rc4-20260913.zip` (SHA-256 `9029B7B26B854EF439CF4DEC14CA38A6C9595036CE117735A921ABEF615EE299`, 15 313 687 bytes).

## Incidencia física recibida y corrección RC2

El usuario reprodujo en móvil vertical (y también en escritorio) un joystick visualmente desplazado hacia abajo; en horizontal parecía centrarse. La causa era medir el contenedor de NippleJS mientras el HUD seguía oculto. RC2 crea el joystick después de mostrar el HUD y consume el vector táctil directo. También se observó que en Aproximación la ficha solo giraba: esa escena tiene el movimiento bloqueado por diseño, pero el giro era confuso. RC2 desactiva el control en esa escena y el servidor conserva la orientación sin aceptar pasos.

## Hallazgo de continuidad y corrección RC3

Durante la repetición en navegador se detectó que una pestaña liberada por el DM podía conservar visualmente el HUD anterior aunque el servidor ya hubiera retirado su autoridad. RC3 mantiene esa pestaña conectada, entrega estado privado vacío, vuelve a la selección y publica inmediatamente la disponibilidad. Al transferir el mismo personaje a otra pestaña, la anterior también limpia su control antes de desconectarse. La integración comprueba liberación, HUD privado vacío, conexión conservada y reclamación posterior.

## Doble pestaña y lanzadores RC4

La reconexión automática de una segunda pestaña seguía una ruta distinta a la reclamación y podía omitir el aviso de revocación. RC4 concentra ambas rutas en la misma operación: la primera pestaña recibe estado privado vacío y el aviso de transferencia antes de desconectarse; la segunda conserva el personaje y reinicia su secuencia de entrada. La prueba de navegador confirma el cambio visible y la integración exige ambos eventos.

El cuadro de Windows “la operación solicitada requiere elevación” procedía del Node privado de Codex, que era el único presente en `PATH`. `INICIAR.cmd` e `INSTALAR.cmd` ahora prefieren ubicaciones oficiales y rechazan `codex-runtimes` con una explicación. Se descargó Node.js 24.21.0 LTS desde `nodejs.org`; su SHA-256 coincidió con `SHASUMS256.txt` y la firma válida pertenece a OpenJS Foundation. Tras instalarlo, el chequeo, la instalación/build completa y el arranque con el Node oficial pasan.

## Evidencia obtenida en RC4

| Comprobación | Resultado | Evidencia y límite |
|---|---|---|
| Entorno del instalador | PASS técnico | Node oficial 24.21.0 LTS y pnpm 11.19.0. `INSTALAR.cmd --check` PASS; `INSTALAR.cmd` resuelve el lockfile y compila; `INICIAR.cmd` levanta RC4 con `C:\Program Files\nodejs\node.exe`. Doble clic y firewall se confirman físicamente. |
| Typecheck cliente/servidor | PASS | `pnpm run typecheck`, sin errores. |
| Unitarias | PASS | Vitest: 13/13. Incluye la regresión de escena bloqueada y las tres carreras de audio. |
| Build de producción | PASS | Build directo equivalente: audio generado, 769 módulos Vite y servidor TypeScript. Se usa `configLoader runner` para evitar el bloqueo de lectura de esbuild dentro del sandbox. |
| Auditoría básica | PASS | `node scripts/audit-baseline.mjs`: 0 fallos en notas DM, foco oculto, mástil y perímetro. |
| Integración servidor/clientes | PASS | `node scripts/run-integration.mjs`: recursos privados 404, DM no autenticado/rol inválido/cookie malformada, dos jugadores moviéndose, bloqueo hasta `scene:ready`, llegada a pie al timón, resolución, PG/inventario, duplicados, reveal/hide y entrada tardía, comandos DM desde jugador/proyector ignorados, sustitución de controlador, liberación/reasignación, estado de audio y eventos de los tres SFX. |
| Navegador de escritorio | PASS con alcance acotado | RC4: la segunda pestaña conserva Mike; la primera vuelve a selección, muestra “Control finalizado” y el aviso de transferencia. Joystick centrado exactamente a 390×844; proyector preparado; 0 errores de consola. No certifica móvil, pared ni audio físicos. |
| Audio audible | PASS de reproducción; mezcla parcial | El usuario confirma música y sonidos desde el proyector. No confirmó por separado pausar una capa manteniendo otra, saturación ni deduplicación audible tras reconectar. |
| Sesión física dirigida (usuario) | PASS acotado | Cubierta C1/C2/C3 permitió mover a Mike; el joystick respondió correctamente; una segunda pestaña recibió el aviso de personaje ocupado; Aproximación quedó bloqueada como exige el diseño. No se aportaron aún dispositivo, navegador, resolución ni evidencia de las demás filas. |
| Recorrido físico ampliado (usuario) | PASS funcional | Móvil + PC con personajes distintos; movimiento cardinal visible también en proyector; liberación/reentrada; timón con solicitud y CD10 visible; resultado Falla aplicado; arpía revelada/reposicionada/ocultada; mochila; música y SFX audibles desde proyector; reconexión Wi‑Fi; tres modos de cámara. El usuario solicita mejorar la calidad artística de los SFX como trabajo posterior. |

## Cierre de hallazgos A01–A09

| ID | Estado RC4 | Resultado |
|---|---|---|
| A01 | PASS automatizado | El servidor emite estado privado al iniciar y completar pasos. La integración habilita el timón tras ocho pasos reales, sin teletransporte. |
| A02 | PASS de implementación; físico pendiente | `send()` exige socket conectado; cambio de epoch, desconexión, blur, ocultación e inventario llaman a `stop`; el diálogo bloquea teclado/envío periódico. RC2 no muestra control activo ni cambia orientación en Aproximación. El gate táctil se repite en móvil real. |
| A03 | PASS automatizado | Integración con dos jugadores, segundo controlador, release/reclaim, entrada tardía y los tres SFX. |
| A04 | PARCIAL | Cámara interpolada y revisión visual de escritorio PASS. Los rangos transitables siguen siendo aproximaciones manuales sobre el arte; se revisaron mástil, timón, casco visible y fichas en bote. Movimiento en proyector y cámaras confirmados por el usuario; alineación completa de geometría, resoluciones y rendimiento pendientes. |
| A05 | PASS lógico y reproducción audible; mezcla pendiente | Tests prueban actualización de B durante pausa de A, reinicio rápido y handler de carga obsoleto. El proyector solo anuncia preparado si el contexto queda `running`. Escucha básica confirmada; independencia de capas y saturación pendientes. |
| A06 | APLAZADO 0.2 | El pack Stormwreck sigue importado por el engine. El contrato de pack inyectado se resolverá junto a puerta/caja para evitar una reescritura sin caso jugable. |
| A07 | PASS técnico y arranque local; instalación limpia externa pendiente | Versiones exactas, lockfile, instalación/build y arranque con Node oficial pasan; los lanzadores rechazan rutas Codex con mensaje claro. El usuario confirmó el paso de arranque; no describió una instalación limpia en otro Windows ni la política exacta de firewall. |
| A08 | PASS automatizado | Se añadieron permisos negativos, cookie malformada, rol inválido, recurso privado, cliente tardío y comandos ajenos. |
| A09 | PASS automatizado | La caché guarda el resultado final; un duplicado rechazado conserva `BLOCKED_CELL`. Máximo 1 000 resultados, caducidad de 10 min, una petición pendiente por personaje/objetivo e historial de interacciones acotado. |

## Gates de la candidata

| Gate | Estado | Falta |
|---|---|---|
| G1 instalación/arranque | PASS funcional | El servidor arrancó y las vistas DM, jugador y proyector se utilizaron en la sesión física; la política exacta de firewall/dispositivo no quedó anotada. |
| G2 recorrido base | PASS operativo; cobertura parcial | Móvil + PC asignados, escena, movimiento mostrado, timón, criatura, mochila y audio comprobados. Edición de PG y dos movimientos sostenidos simultáneos no confirmados físicamente. |
| G3 permisos/secretos | PASS automatizado | Ninguna filtración conocida. |
| G4 red/control | PASS operativo; cobertura parcial | Joystick, exclusividad de segunda pestaña y pérdida/recuperación de Wi‑Fi confirmados; simultaneidad sostenida y pausa exacta al abrir mochila no se midieron de forma aislada. |
| G5 calidad visual | PASS funcional | Movimiento legible en móvil y proyector; tres cámaras y bloqueo de Aproximación confirmados. Resoluciones y FPS no quedaron anotados. |
| G6 caso nuevo/regresión | PASS automatizado | RC4 conserva el recorrido al timón, cubre la escena bloqueada, recupera una pestaña liberada y revoca la pestaña sustituida. |
| G7 evidencia separada | PARCIAL | La sesión física está registrada por informe del usuario; faltan modelo/navegador/resolución, observación de diez minutos y métricas de FPS/latencia. |
| G8 licencias/reversión | PASS para RC4 | Sin dependencia ni asset nuevos; avisos vigentes y RC3 conservada como rollback. |

La sesión física ampliada no ha revelado un defecto funcional bloqueante. Alpha 0.1.1 queda aceptada como candidata funcional para continuar el desarrollo; las métricas formales y el pulido artístico de los SFX se mantienen como tareas de calidad posteriores y no cambian el recorrido jugable validado.

## Revisión de alcance por Astra — 2026-09-13

Se conserva la aceptación operativa informada; no equivale a certificación completa G1–G8. Las filas compuestas del protocolo físico se han desglosado para no dar PASS a condiciones no descritas: cambiar PG, dos controles mantenidos a la vez, escoger otro PJ tras liberar, detener con mochila, tiempo de reconexión, independencia de capas y ausencia de repetición audible. No son fallos reproducidos ni motivos para repetir lo ya comprobado.

Sólo se inspeccionaron código/documentos y se verificó el hash de backups/alpha-0.1.1-rc4-20260913.zip; coincide con el registrado. Alpha 0.2 tiene contrato y fixture de geometría, pero ninguna función ni test de runtime 0.2 ejecutados. Sol registrará sus resultados por separado.

Validación adicional del diseño (registro previo a la implementación): `tmp/check-alpha02-design.mjs` comprueba el JSON del fixture, sus cuatro rutas cardinales esperadas, giro de caja a (5,3)/(5,4) y separación de spawns/marco. PASS. La ejecución de la candidata 0.2 queda registrada en la sección siguiente.

## Alpha 0.2.0 RC1 — registro previo, corregido por auditoría

Fecha: 2026-09-13. package.json identifica `0.2.0-rc.1`. **Implementación parcial; no candidata completa ni aceptada.** Las afirmaciones previas de cierre omitían funciones y errores. No basta con inyectar el pack y realizar una prueba física.

Evidencia del turno previo conservada con alcance: typechecks PASS, 15 unitarias PASS, build de 840 módulos, integración general, prueba básica de comandos de objetos y auditoría baseline PASS. La integración de objetos no probaba bloqueo locked, editor/preview, arte, fingerprint ni el conjunto O01–O12. El DTO /api/campaign existe, pero carece de validación/consumidores requeridos.

No se infiere escucha, experiencia móvil ni inspección de la escena nueva de esos resultados. La guía física anterior queda como borrador: Sol debe adaptarla después de completar RC2.

## Auditoría de Astra — 2026-09-13

Nueva evidencia ejecutada sobre servidor compilado desde la fuente actual a tmp/astra-audit-build:

| Comprobación | Resultado | Límite |
|---|---|---|
| Compilación servidor | PASS | Build aislado de auditoría; dist del producto no modificado. |
| Vitest existente | 15/15 PASS | Repetido en este turno; no equivale a O01–O12. |
| Auditoría adicional | **5/12 PASS; 7 FAIL** | scripts/audit-alpha02.mjs; salida exacta en ALPHA_0_2_AUDIT_RESULTS.json. |
| R01 | PASS | Rutas reales cerrada/abierta/caja bloqueando/restaurada. |
| R02/R03 | FAIL | Locked se puede abrir directamente; DM recibe closed en vez de locked. |
| R04 | FAIL | Caja puede ocupar el marco abierto. |
| R05/R06/R07 | FAIL | World.revision no aumenta con objeto; revisión de objetos se reinicia al volver y aparece públicamente. |
| R08/R09 | PASS | Reservas de puerta/PJ a 0/150/299/300 ms; undo ocupado conserva pila. |
| R10/R12 | PASS | Retry idéntico y CAS de dos DM mediante sockets autenticados en servidor efímero propio. |
| R11 | FAIL | UUID reutilizado con payload distinto devuelve éxito anterior. |
| Editor/arte/carga/pack | PENDIENTE, faltantes por inspección | Hallazgos I01–I08; no se ejecutó navegador en esta auditoría. |
| Móvil/proyector/audio 0.2 | NO EJECUTADO | Los informes físicos RC4 permanecen asociados a RC4. |
| Copia recuperable del avance | PASS | ZIP nuevo de trabajo parcial; no release aceptada. |

Informe completo, correcciones y matriz O01–O12: [ALPHA_0_2_ASTRA_REVIEW.md](ALPHA_0_2_ASTRA_REVIEW.md). ADR-016 resuelve las firmas y límites para Sol. Estado: **REQUIERE IMPLEMENTACIÓN Y CORRECCIONES**; siguiente entrega buscada RC2.

El impedimento anterior del ZIP quedó resuelto con una copia de nombre nuevo sin borrar archivos:
`backups/astra-pre-review-0.2-20260913-223941.zip`,
SHA-256 `3614A28B36EE2ACBECD400EFC2D31FD639CA1BB26ED7AE3AA0BF99B7012CC32F`.
El rollback aceptado RC4 se conserva. No se reinició la mesa del usuario ni se declara cerrado ningún servidor previo sin verificarlo.

## Alpha 0.2.0 RC2 — aceptada operativamente

Fecha técnica: 2026-09-13. Fecha de aceptación física: 2026-09-14. `package.json` y el pack se identifican como `0.2.0-rc.2`.

| Comprobación | Resultado | Evidencia y límite |
|---|---|---|
| Typecheck cliente/servidor | PASS | TypeScript sin errores tras inyección del pack y editor DM. |
| Unitarias | PASS | Vitest 18/18. Incluye bundle sintético con IDs distintos y sin encuentro/timón, privacidad, movimiento, escenas, locked, marco abierto, revisiones, reservas, ACK y undo. |
| Build producción | PASS | Audio generado, Vite 842 módulos y servidor compilado. |
| Auditoría R01–R12 | PASS 12/12 | `scripts/audit-alpha02.mjs`; `docs/ALPHA_0_2_AUDIT_RESULTS.json` actualizado. Los siete fallos de RC1 quedan corregidos. |
| Integración general | PASS | Servidor nuevo en loopback/puerto libre: HTTP privado, permisos, tres roles, dos jugadores, scene-ready, timón, criatura, PG/inventario, reconexión, liberación, capas y tres SFX. |
| Integración de objetos | PASS | Servidor nuevo: puerta, caja, stale con refresco DM, undo y comandos de puerta/transform/undo ignorados desde jugador/proyector. |
| Frontera de campaña | PASS por código/tests | Sin imports de campañas en `engine/` ni `apps/web/`; `/api/campaign` es DTO público validado y las tres vistas lo cargan antes de conectar. |
| Editor/arte en navegador | PASS acotado | Build final: login DM, selector desde catálogo, fondo 576×432, sprites separados, selección de caja y preview verde; jugador asignado; proyector preparado y sin borrador público. Consolas de las tres vistas sin errores ni avisos. |
| Secretos | PASS automatizado | `objectRevision` ausente del snapshot público; locked se publica closed; criatura oculta y notas/semillas privadas no se sirven. |
| Móvil/proyector/audio físicos RC2 | PASS operativo | Pixel 9a y portátil MSI, Chrome, vertical/horizontal y salida 1080p. Puerta, caja, sincronización, colisiones, reconexión y regresión confirmadas; detalle en la sección de aceptación física. |

Estado: **aceptada operativamente**. El recorrido físico real no reveló defectos funcionales bloqueantes.

Copia recuperable final con documentación de relevo: `backups/alpha-0.2.0-rc2-final-20260914.zip`, 15 867 968 bytes, SHA-256 `28588478A586510BAD5AE3BA174BFD806AFE26E3BFCC1BD35743C3BC12F96E7A`. No sobrescribe RC4, la copia previa a la auditoría ni la instantánea RC2 intermedia.

## Aceptación física Alpha 0.2.0 RC2 — 2026-09-14

Informe recibido a las 07:11 (hora indicada por el usuario). Equipo: Pixel 9a y portátil MSI, Chrome, móvil probado en vertical y horizontal y salida/proyector a 1080p.

| Bloque | Resultado | Observación física |
|---|---|---|
| Cambio de escena y sincronización | PASS | El cambio llegó inmediatamente a jugador y proyector. |
| Puerta abierta | PASS | El estado cambió en DM, jugador y proyector; Mike cruzó la abertura. |
| Puerta cerrada y bloqueada | PASS funcional; alcance acotado | Cerrada impidió el paso. DM mostró «bloqueada» y el usuario indicó que seguía visible en jugador/proyector. No describió por separado el rechazo al abrir bloqueada ni el desbloqueo; esos casos y el filtrado exacto de locked tienen evidencia automatizada. |
| Selección y preview de caja | PASS | Aparecieron Girar, Aplicar y Cancelar. La ocupación por una ficha produjo preview rojo. |
| Giro y recolocación | PASS | La caja giró 90 grados tras llevarla a una casilla válida y el cambio se publicó a los tres roles. |
| Colisión de caja | PASS | Mike no pudo atravesarla y la ruta quedó cortada. |
| Reconexión y regresión | PASS por informe | El usuario indicó que todo el resto del recorrido funcionó correctamente, incluyendo las comprobaciones ya guiadas de reconexión, timón, criatura, mochila, cámaras y audio. |
| Legibilidad artística | PASS funcional con incidencia | La puerta se entiende y funciona, pero su dibujo se percibe frontal frente a una cámara cenital inclinada. Se registra como mejora visual no bloqueante para el siguiente ciclo de recursos. |

La captura aportada confirma el editor de caja, su huella sobre cuadrícula y los estados de preview. La prueba no aporta mediciones de FPS, latencia extremo a extremo ni duración cronometrada; esos objetivos siguen siendo métricas de calidad posteriores y no invalidan el recorrido funcional observado.

## Contrato Alpha 0.2.1 — revisión Astra, 2026-09-14

Estado: **diseño cerrado, implementación pendiente**. RC2 conserva la aceptación operativa del usuario. Su frase «todo lo demás perfecto» se registra como confirmación general: no aporta evidencia aislada de cancelar preview, deshacer, desbloqueo, carreras, mezcla o métricas. No se solicita repetir ahora el recorrido aceptado.

Evidencia nueva ejecutada en este turno:

| Comprobación | Resultado y alcance |
|---|---|
| SHA-256 ZIP RC2 | Coincide con `28588478A586510BAD5AE3BA174BFD806AFE26E3BFCC1BD35743C3BC12F96E7A`. |
| Comparación producto/copia | 84 archivos de apps, engine, campaigns, dist, package.json y lockfile comparados con entradas del ZIP; cero diferencias. |
| `node scripts/check-alpha021-design.mjs` | PASS: nueve rutas de geometría propuesta, seis rechazos de ubicación/restauración, cuatro giros de rueda y coordenadas de la cubierta compilada RC2. NO ejecuta el runtime futuro 0.2.1. |
| Inspección de código y arte | Leídos tipos, pack/bundle, GameState/GameServer, navegación, HTTP y clientes/renderer. Vistos fondo de cubierta e interior de objetos; rueda horneada y desalineaciones de perspectiva/ancla identificadas. |
| Pruebas de producto nuevas | NO EJECUTADAS: no se cambió runtime/build, no se repitieron tests RC2 ni navegador/hardware. Ningún servidor iniciado o reiniciado. |

Hallazgos para Sol, derivados de inspección: el borrador DM no captura/invalida objectRevision y toma revisión nueva al enviar; preview omite step.from y sólo dibuja huella; props se recrean en cada snapshot. El caso de puerta locked inicial requiere override privado para que no pueda aparecer en el DTO público; no se encontró una semilla locked publicada en la campaña actual. Los runners toman puerto libre pero el servidor HTTP sigue enlazando 0.0.0.0, no loopback estricto; corregir HOST de pruebas en 0.2.1. Estos alcances concretan afirmaciones previas, sin atribuir al usuario fallos que no reportó.

Entrega de arquitectura: ADR-017–019, `ALPHA_0_2_1_CONTRACT.md`, fixture y comprobador. No arte/dependencias nuevas. Matriz T01–T13 queda PENDIENTE hasta que Sol implemente y ejecute las pruebas; sólo entonces se pedirá aceptación física de 0.2.1.

## Alpha 0.2.1 RC1 — candidata técnica, 2026-09-14

La sección de contrato anterior es evidencia histórica previa a la implementación. El código y `dist` actuales ya contienen la candidata `0.2.1-rc.1`. Alpha 0.2.0 RC2 continúa aceptada operativamente hasta recibir la comprobación física de esta versión.

| Comprobación | Resultado | Evidencia y límite |
|---|---|---|
| Typecheck cliente/servidor | PASS | Tipos compartidos, cliente y servidor sin errores. |
| Unitarias | PASS | Vitest 23/23: estados, transiciones, geometría, reservas, solicitudes e invalidaciones. |
| Build de producción | PASS | Cliente Vite y servidor TypeScript presentes en `dist`, identificados como RC1. |
| Auditoría Alpha 0.2 | PASS | `node scripts/audit-alpha02.mjs`: R01–R12, 12/12. |
| Integración general | PASS | `node scripts/run-integration.mjs` en servidor aislado/loopback. |
| Integración de objetos | PASS | `node scripts/run-object-integration.mjs`: puerta privada, permisos, daño/destrucción de puerta/caja, daño/separación/cuatro giros/destrucción de timón y ausencia de duplicado lógico. |
| Auditoría Alpha 0.2.1 | PASS técnico | `node scripts/audit-alpha021.mjs`: 10/10 bloques sin fallo automatizado; T11/T12 se separan como navegador. |
| Navegador DM/Player/Projector | PASS acotado | 390×844, 844×390 y 1920×1080; preview de sprite/huella, estados dañados/destruidos, fondo limpio y puerta cenital observados; tres consolas sin errores ni avisos. No equivale a hardware real. |
| Arte v3 | PASS técnico/visual de escritorio | 30 PNG presentes con alfa; fondo sin copia de timón, soporte y variantes completas. Puerta cerrada regenerada como barrera estrecha en planta. |
| Prueba Pixel 9a/MSI/proyector | **PENDIENTE** | Ejecutar `docs/ALPHA_0_2_1_PHYSICAL_CHECK.md`; no trasladar los PASS de RC2. |

Funciones cubiertas técnicamente: una sola entidad wheel; detach/transform/rotación; daño y restos de wheel/door/crate; restos atravesables para actores pero reservados para objetos; undo rechazado cuando el estado anterior ocuparía un personaje; CAS/idempotencia/privacidad; invalidación de solicitudes y borradores; preview con sprite y vistas retenidas por ID.

Riesgo visual pendiente de opinión física: el timón montado/cogido representa una rueda cuyo plano es vertical y conserva lectura circular. En pantalla real se decidirá si necesita un escorzo elíptico mayor; no se marca FAIL de antemano.

Copia recuperable de la candidata: `backups/alpha-0.2.1-rc1-20260914.zip`, 20 528 652 bytes, SHA-256 `444F3A09524DA4AB26B4A0AF62A55B5505BF568D68EF5E520E407EC8F5352EF2`; archivo comprobado como legible. No sustituye la copia RC2 aceptada.

## Recorrido físico Alpha 0.2.1 RC1 — informe del usuario, 2026-09-15

Estado: **PARCIAL, no aceptada**. Informe exacto y límites en `ALPHA_0_2_1_PHYSICAL_REPORT_20260915.md`. Arranque; unicidad/separación/traslado/giro del timón; variantes dañada/rota de los tres objetos; colisión de puerta y restos; undo ocupado; conexión y audio tienen confirmación positiva del usuario. La puerta abierta/cerrada tiene **FAIL visual** con dos capturas: abierta conserva una hoja frontal/erguida, cerrada se muestra como barra horizontal en planta; no forman un mismo giro desde la cámara cenital/oblicua. No se han verificado físicamente las cuatro orientaciones una a una, el preview de sprite/huella ni móvil vertical/horizontal. La duda de alineación del soporte queda sin coordenada alternativa inequívoca.

El usuario desea que Astra diseñe puerta y persistencia 0.3. Esto autoriza adelantar **diseño** de 0.3, no implementar ni aceptar 0.2.1. Sol integrará primero una corrección de puerta en candidata de nombre nuevo y se repetirá sólo el tramo afectado antes de iniciar la implementación 0.3.

## Aclaración física y contrato conjunto Alpha 0.3 — 2026-09-15

Esta entrada posterior sustituye la secuencia de la anterior, no sus resultados observados. El usuario confirma **rojo en destino ocupado/bloqueado y Escape que elimina previsualización/huella y vuelve a selección amarilla**. PASS físico de esos subcasos en RC1, no de verde válido o sprite por separado. Aplaza voluntariamente móvil vertical/horizontal y comprobación de puerta hasta que Sol termine Alpha0.3; no solicitar hardware antes ni marcar RC1 aceptada.

Astra entrega contratos cerrados de puerta/persistencia, ADR-020–022, fixtures sintéticos y P01–P15/D01–D06. Encargo único activo a Sol en `NEXT_MODEL_PROMPT.md`: implementar ambos en una candidata0.3. No hay corrección visual ni persistencia implementadas en este bloque de diseño.

| Evidencia ejecutada | Resultado / límite |
|---|---|
| `node scripts/check-alpha03-design.mjs` | PASS de bundle sintético compilable, checksum v0/v1, migración de ejemplo, referencias/huellas, exclusión de efímeros y geometría propuesta. No ejecuta SaveStore ni protocolo4 ni arte futuro |
| Hash backup RC1 | SHA256 coincide con `444F3A09524DA4AB26B4A0AF62A55B5505BF568D68EF5E520E407EC8F5352EF2`; no sobrescrito |
| Inspección visual/código | Fondo muestra tabique aproximadamente x288 frente al centro lógico x312 y hueco desalineado; contrato fija eje/hueco/bisagra/ancla. No es medición automática exacta ni arte arreglado |
| Gate reutilización | Tiny Dungeon1.0: ZIP leído en memoria, License.txt CC0 y PNG/atlas comprobados, preview web inaccesible; no se incorpora ni se declara comparativa visual completa. APIs fs/SQLite/better-sqlite3 consultadas en fuentes primarias; sin instalaciones |
| Runtime/build/hardware | No modificados/probados de nuevo en este bloque; mesa del usuario no reiniciada. P01–P15 y D01–D06 PENDIENTES de implementación/prueba |

Corrección de precisión de evidencia histórica: `audit-alpha021.mjs` distingue comprobaciones automáticas de marcadores de navegador; no contar estos últimos como tests de hardware ni afirmar que todos sus bloques son automatizados. Los resultados antiguos no certifican0.3.

## Greybox del barco · ajuste tras auditoría del capítulo 3 — 24/09/2026

Resultado: **PASS técnico / recorrido interactivo de esta revisión pendiente**. Se completó el blockout de utilería de cubierta y camarotes; 24 props quedan colocados sobre sus superficies y una prueba confirma que la mesa de C7 bloquea el paso. La abertura del casco en popa coincide con la llegada exterior P16/P19 y C9 conserva el suelo bajo la abertura. C8 usa una pendiente que representa 45 cm de agua en el borde de babor y 15 cm a estribor, manteniendo movimiento difícil. La arpía residente queda oculta en la cofa y la segunda, de nivel 2, junto a la balista de C2.

| Comprobación | Resultado / límite |
|---|---|
| Suite | 109/109 pruebas PASS. |
| Tipos y compilación | Typecheck cliente/servidor, build del cliente y build del servidor PASS. Vite avisa de un chunk Babylon grande; no impide la compilación. |
| Babylon/UI | Captura local confirmó que el mapa continuo y los blockouts se renderizan. No se repitieron movimiento ni transiciones en navegador en esta revisión. |
| Servidor de prueba | El lanzador de desarrollo de `4324` falló con `ENOMEM`; el servidor compilado inició y luego se cerró con código 1 sin diagnóstico útil. `4323` no se tocó. |
| Aceptación | Cámara/arte, proyector y móvil siguen pendientes; esta base sigue siendo greybox, no el acabado HD-2D/2.5D reservado para Sol. |
