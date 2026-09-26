# Rosa de los Vientos C1–C9 · gate de mapa continuo, fases 1–3

Estado: **prototipo funcional de fases 1–3 integrado; pendiente de aceptación del usuario**. Decisión del usuario 24/09: C1–C9 y cofa son un único barco/mapa explorable, con superficies de distintas alturas. La tabla antigua de cuatro `mapId` en `PECIO_SPATIAL_PLAN.md` es histórica. Esta ficha no reemplaza la aventura ni autoriza cambios narrativos.

## Fase 1 · diseño funcional

- Contraste canónico completado con el capítulo 3 del PDF, pp. 22–27; inspección visual del mapa 4 en p. 25. Se mantienen sus zonas, encuentros, alturas, agujeros, accesos, terreno difícil y disparadores bajo control del DM, sin automatizar tiradas ni desenlaces.
- C1 conecta físicamente con C2/C3 por las cuatro escaleras, con C4–C7 por puertas, con C8 por escalera/escotilla y con la cofa por escala de cuerda.
- C8 conecta con C9 por la escalera y los pasos por agujeros se mantienen bajo adjudicación del DM.
- Una sola escena lógica `wreck-ship`; cambiar de superficie nunca cambia el mapa ni desplaza a otros personajes.
- Antorchas apagadas se pueden recoger una sola vez. Criaturas y secretos siguen bajo control de revelado del DM.

## Fase 2 · geometría

- Un terreno Babylon compartido 44×20 a 1,5 m/casilla; casco objetivo 66×22,5 m. `main` incluye C1 y los camarotes C4–C7, `c2`/`c3` las plataformas elevadas, `lower-deck` C8, `hold-air` C9, `crow` la cofa y `sea` el agua.
- Las superficies y las fichas comparten coordenadas. Escaleras/rampas son suelo inclinado con altura por esquina; paredes y mástil bloquean movimiento. El arte futuro será decorativo por capas y no podrá alterar esta geometría aprobada.
- La escala física dibujada une C1 con `crow` a 15 m. El DM enfoca el mismo barco sin mover posiciones.
- Cámara ortográfica 3/4 estable; retícula alineada con las alturas. Casco, borda, mástil y escalones no son casillas extras.
- Las siluetas provisionales de arrecife, huesos de dragón, lecho marino y cuatro pecios fuera del casco no tienen colisión ni selección; sirven como referencias espaciales de la vista desde la cofa y Sol podrá sustituirlas por arte.
- Greybox actual: geometría y materiales planos, no el arte final ni una demostración de equivalencia visual con las referencias.

## Fase 3 · navegación y comprobaciones

- [x] Runtime declara una escena de barco; las cubiertas no son mapas independientes.
- [x] Pruebas de estado verifican movimiento en ambos sentidos C1↔C2/C3/C8, C8↔C9 y cofa↔C1 sin cambiar `sceneId`.
- [x] El cambio de foco DM no mueve jugadores; posiciones individuales quedan en el guardado.
- [x] Puertas cerradas bloquean el paso y abiertas se cruzan andando. P10 usa la casilla real de la escala, sin portal de terreno de mismo punto.
- [x] Snapshots de jugador filtran fichas/props/botín de superficies remotas; el DM conserva la vista de la escena completa.
- [x] Greybox contrastado con el capítulo 3: blockouts de cubierta y camarotes C2/C4–C9; 24 obstáculos de utilería con huella y colisión. La segunda arpía de nivel 2 espera en C2; la residente permanece oculta en la cofa.
- [x] El cofre de C9 queda a pie de la caída que atraviesa C4/C8; arrecife, restos óseos y pecios distantes son decorado sin casillas ni colisiones.
- [x] Brecha de popa alineada con P16; C9 conserva suelo bajo la entrada. El puerto redundante P19 se eliminó; C8 mantiene terreno difícil y profundidad gradual de 45 cm a 15 cm.
- [x] Suite completa: 116/116 PASS con margen de 30 s por prueba y dos trabajadores (la primera ejecución bajo carga excedió el límite predeterminado de 5 s en ocho pruebas, sin errores de aserción); typecheck y build cliente actuales PASS, build servidor e integración aislada anteriores PASS.
- [x] Integración de sockets en servidor aislado con dos jugadores: camino por playa y viaje en barca, abordaje físico por P01, C1↔C2, C1→C8 mientras el otro jugador se mantiene en C1, trayecto por C3 hasta el timón e interacción/resolución. Cambiar el foco del DM no teletransporta a los personajes.
- [x] Preview aislado `127.0.0.1:4326`: dos jugadores abordaron desde el Retiro, sin cambiar manualmente de mapa. Mike permaneció en C1/C3/cofa mientras Mia llegó a C8 y C9; las posiciones sobrevivieron a la recarga del navegador. El servidor y sus datos de ensayo son temporales; no se reinició ni modificó la mesa habitual.
- [x] QA visual actual de C1↔C2/C3, C1↔cofa y C1↔C8↔C9 con dos navegadores de jugador. C4–C7 se atravesaron a pie: cerradas bloquean, abiertas dejan cruzar y C4 exige retirar el listón. Mia regresó C9→C8→C1 mientras Mike seguía en C7. El proyector cambió de C1 a C9 al enfocar a Mia desde el DM sin mover a ninguno; la consola móvil de sonido cargó y conectó. Esto no equivale a una prueba en un móvil físico.
- [x] Corregida la vista inferior: la cuadrícula y la decoración de la cubierta superior ya no se superponen a C8/C9. Corregida la orientación de las normales de baldosas inclinadas; C8 vuelve a estar iluminada y legible. Hay regresión automatizada para las normales.
- [x] QA física de navegador previa en `127.0.0.1:4324` cubrió C1↔C2/C3, C1↔C8↔C9, cofa, puertas C4–C7, posiciones separadas y persistencia. Es evidencia de la revisión anterior, no de la geometría actual.
- [x] Guardado automático y recarga del cliente en la revisión anterior: Mia conservó `wreck-ship · main · 27,10`. Las pruebas automatizadas cubren además la migración de guardados antiguos C1–C9/cofa.
- [ ] Ensayo de jugador en un móvil físico y aceptación de arquitectura/cámara por el usuario.
- [x] Repetido visualmente en el navegador de esta revisión el paso por las puertas C4–C7 y la vuelta completa C9→C1.
- [ ] Aprobación del usuario de la arquitectura y cámara antes de fase 4.
- [ ] Aprobación visual separada: forma completa del barco, mástil y niveles legibles; no confundir greybox con el arte de las referencias fijas. El acabado visual queda para Sol.

Un test automatizado no sustituye estas comprobaciones. El gate no se cierra por compilar ni por una captura bonita.

## Repaso de control de jugador y M5 — 25/09/2026

### Movimiento en navegador aislado

- [x] Instancia temporal en `127.0.0.1:4338`, con `DUNGEONS_DATA_DIR` fuera del guardado de campaña y navegador Chrome. Se controló a Mike desde `/player`; el DM sólo consultó la posición.
- [x] Reproducción junto a P10: W desde C1 entró en la cofa; otra W pedía rodear el hueco del mástil por una diagonal legal, pero el servidor la rechazaba y el deslizamiento cambiaba el rumbo. Se corrigió `terrainStepDestination`: basta con que una de las dos rutas cardinales intermedias esté conectada; si ambas están cerradas, sigue bloqueando la diagonal. La regresión automatizada cubre la cofa y la diagonal con dos esquinas bloqueadas.
- [x] Verificación posterior en el cliente: W llegó a `crow`; W avanzó a la diagonal esperada alrededor del mástil; S regresó a `main`; después de girar la cámara 45°, W siguió la nueva orientación. El reproductor renderizó la escena y el recurso de textura devolvió HTTP 200; consola sin errores/avisos relevantes.
- [x] Paso estándar: 220 ms por casilla, simulación del servidor a 30 Hz y snapshot a 20 Hz. Esto mide el ritmo diseñado del movimiento por casillas, no latencia/fps sostenidos ni la percepción subjetiva en el dispositivo del usuario.
- [x] Regresión de restauración: la primera autosalvaguarda de una mesa recién abierta ya no puede ejecutarse después de restaurar otra partida y avanzar por sorpresa su generación.
- [x] Suite completa actual **154/154**, tipos de cliente/servidor y builds aislados; integraciones M6 también pasan. La configuración Vitest usa 30 s por prueba; la ejecución completa vuelve a pasar con su configuración normal.
- [ ] Usuario valida que el teclado/cámara ahora se sienten fluidos en su copia. Sin móvil físico, proyector ni medición de FPS sostenido.

### M5 candidato visual — no aprobado

- [x] Primera capa artística: `deck-planks-art01.png` (1254×1254) en cubiertas y casco; UV mundiales y tablones siguiendo la eslora. El PNG previo se conserva como histórico, no se carga.
- [x] Oleaje/espuma animados en el agua de superficie y en el plano oceánico decorativo; el recurso y ambas rutas responden HTTP 200 en la instancia aislada.
- [x] C8 conserva geometría de suelo inundable con un tinte húmedo; C9 usa una variante fría más oscura. Las casillas siguen seleccionables y sus alturas intactas.
- [x] Retícula táctica, selección, posiciones, superficies, geometría, alturas y colisiones siguen independientes e intactas; no se usa un fondo completo como suelo.
- [x] Viento marino sobrio sólo sobre agua decorativa; brillos fríos localizados y pulsantes en C8/C9. Las cuatro antorchas se mantienen apagadas y recogibles.
- [ ] El usuario valida lectura/color a escala de partida y oclusión/capas. Grid del barco `#88968b`, alpha 0,66 y mezcla alfa real habilitada. No afirmar que el greybox se parece ya a las referencias.
- [ ] Aprobación visual separada de aprobación de navegación. C1–C9/cofa sigue siendo una sola escena continua.

Estos materiales no cierran la fase artística. Son incrementos de M5 autorizados por la solicitud del usuario de continuar; todas las imágenes generadas siguen siendo candidatas hasta su revisión.

## Candidata técnica M6 completada; relevo a validación física — 25/09/2026

- [x] Build aislado cliente/servidor y typecheck; suite actual **154/154**. La preparación de M7 descubrió y corrigió el resolver de animaciones de ataque del servidor; tiene regresión.
- [x] Integración compilada de sockets: dos jugadores, superficies separadas, proyector, reconexión/entrada tardía, privacidad/permisos y audio/SFX.
- [x] Integración de objetos y smoke de guardar, preview, restaurar, rechazar sockets antiguos y reiniciar.
- [x] `/player`, `/dm`, `/dm-mobile` y `/projector` cargan del host local; referencias CSS/JS locales responden 200 y sus HTML no incluyen referencias CDN.
- [x] Checkpoint recuperable: base `backups/pecio-m5-m6-qa-candidate-r32-20260925.zip`, overlay r34 y overlay r35 en ese orden. Los deltas no son independientes; excluyen partidas/saves, QA saves, dependencias, `dist` y fuentes originales `Imagenes VTT`/OneDrive, que siguen intactas.
- [x] Guion preparado: [validación física M6/M7](m5/M6_M7_PHYSICAL_PLAYTEST_20260925.md).
- [ ] Cierre de M5: revisión visual del usuario de textura/grid, contraste y oclusión. La pantalla actual muestra una maqueta de trabajo, no el acabado HD-2D.
- [ ] M7: teclado/joystick, móvil vertical-horizontal, proyector y FPS real en hardware del usuario. No se ha medido FPS sostenido.

### Auditoría de cobertura del capítulo 3 — revisión 32, 25/09/2026

- [x] El botín de C4 (50 po, herramientas de cartógrafo, daga y brújula de 25 po) está en casillas transitables y permanece invisible/inaccesible para jugadores hasta abrir la puerta.
- [x] El tesoro de la cofa está distribuido en cinco recogibles canónicos por valor conjunto de 120 po, disponibles solo en `crow` y persistentes sin duplicación.
- [x] El sueño del clérigo se permite tras la ruta de destrucción a bordo cuando llega el descanso siguiente; el requisito de la ruta de la tumba no se altera.
- [x] Regresiones incluidas en `engine/server/wreck-runtime.test.ts` y `engine/server/game.test.ts`; suite 154/154, typecheck de cliente y servidor y build aislado servidor PASS.
- [ ] Playtest físico M7 y aceptación visual M5 del usuario; la validación temporal de navegador de esta revisión quedó en la escena inicial del Retiro y no cuenta como inspección del barco.

## Revisión r35 · llegada, salida y carril exterior — 25/09/2026

- [x] El viaje deja al personaje en la barca (`sea`, 24,15), a una casilla de P01; sube por la jarcia caminando. Salir del barco requiere volver físicamente por P01 a la barca.
- [x] El agua exterior ocupa filas 15–16 y permite rodear el casco hasta P16/C9. Prueba de motor: nado hasta la brecha, entrada a C9 y salida hacia `sea`; P01 no intercepta ese trayecto.
- [x] Integración real de sockets: dos jugadores, viaje desde playa, abordaje, C2/C8/C3 y retorno individual. El DM confirma que Mia regrese al Retiro; Mike conserva C3 y el foco del DM no cambia.
- [x] En binding loopback, `/api/info` y el QR no publican una dirección LAN. La candidata de navegador usa puerto 4399 y datos temporales.
- [x] Suite **154/154**, integración compilada y typecheck de servidor PASS; builds aislados cliente/servidor comprobados para r35.
- [ ] El usuario verifica movimiento, cámara, escaleras y lectura en su equipo; móvil/proyector físicos y FPS sostenidos siguen pendientes.
