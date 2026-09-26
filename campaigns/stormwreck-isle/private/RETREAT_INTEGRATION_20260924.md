# Informe de integración — Retiro del Dragón

Fecha: 24/09/2026  
Campaña: *Los Dragones de la Isla de las Tempestades*  
Fuente visual: `Retiro_Dragon_V5_2`, código Babylon Playground adjunto por el usuario.  
Referencia de aventura: [PDF oficial, pp. 7–13](../../../OneDrive_1_12-9-2026/Aventura%20Los%20Dragones%20de%20la%20Isla%20de%20las%20Tempestades.pdf).

## Resultado

V5.2 está integrada como escena independiente `dragon-rest`, seleccionable y jugable desde el VTT. Se reutilizan el compilador de campañas, Babylon, el estado de escenas, el movimiento autoritativo, props/puertas, actores de escena, interacciones y puertos existentes. No se creó un segundo sistema de movimiento ni se automatizó arbitraje, pruebas, encuentros o desenlaces.

Se conservó la geometría fuente y la distribución longitudinal, incluidos ambos recorridos del acantilado, playa, puerto, entorno forestal, edificios, habitaciones ampliadas, seis celdas y terraza del templo. Se retiraron elementos auxiliares de la fuente que no pertenecen al escenario visible/runtime. Los visuales se agrupan por procedencia `CANON` y `VTT_AMBIENCE`. La colisión y navegación son datos aparte de la geometría visual.

La escena ofrece 13 superficies, 1.272 celdas transitables, 172 obstáculos, 24 límites bloqueados y 409 transiciones, a 1,5 m por casilla. El checkbox “Cuadrícula” en los controles de escena/cámara muestra u oculta únicamente el grid visual; las superficies, colisiones y rutas permanecen instaladas.

## Funcionalidades

- A1–A5 contrastadas con el PDF oficial. Se puede recorrer la costa, ambos recorridos del acantilado, las estancias principales, las seis celdas y la terraza. Se corrigieron anchuras de entradas y pasillos para permitir el paso por las aberturas originales.
- Escaleras y conexiones de altura usan el movimiento existente; al coincidir varias alturas en una casilla, la escalera tiene prioridad. Muros, mobiliario, puerta cerrada de A4 y límites peligrosos bloquean el paso. La puerta de A4 abre/cierra con el sistema de objetos del VTT; A2 conserva el marco y el vano abierto tal como vienen en V5.2.
- Runara, Tarak, Varnoth y los dos grupos de kobolds tienen interacciones cercanas. A2 ofrece el punto de interacción del cabrestante/plataforma; A3 descanso y comedor; A4 investigación; A5 templo. Son indicaciones para el DM, no resultados automatizados.
- Los tres zombis de playa permanecen privados/ocultos y el DM los revela manualmente. Se conservan dados físicos y resolución manual.
- `TRAVEL_PECIO_BOAT` enlaza el puerto con la superficie de mar de `wreck-ship`; el viaje requiere confirmación manual. `EXIT_PLEAMAR` y `EXIT_OBSERVATORIO` están listos como salidas, pero sus mapas aún no están cargados.

## Archivos modificados

- `campaigns/stormwreck-isle/public/retreat-geometry.js` y `.d.ts`: importador de geometría Babylon V5.2, limpieza de elementos auxiliares, bisagra de puerta A4, lotes estáticos por procedencia y encaje de jambas.
- `campaigns/stormwreck-isle/public/retreat-terrain.json`: superficies transitables, obstáculos, límites, transiciones verticales y escala.
- `campaigns/stormwreck-isle/public/retreat-runtime.ts`: escena, actores/interacciones, puerta y conexión de barca.
- `campaigns/stormwreck-isle/private/m3-actors.ts`: tres zombis ocultos del encuentro inicial.
- `campaigns/stormwreck-isle/pack.ts` y `server.ts`: registro de escena, recursos, interacciones, actores privados y puerto.
- `engine/server/game.ts` y `engine/shared/campaign-view.ts`: paso entre superficies por escalera, bloqueo de actores privados y visibilidad pública correcta de actores de escena.
- `engine/client/terrain3d.ts` y `apps/web/world.ts`: adapter/render Babylon, batching e interruptor del grid visual.
- `apps/web/dm.ts`, `dm.html` y `dm.css`: selección habilitada de Retiro y control compacto de cuadrícula.
- `engine/server/retreat-runtime.test.ts` y `wreck-m3.test.ts`: recorrido y ajustes de visibilidad/campaña.
- `ROADMAP_V1.md`, `PROJECT_STATE.md` y este informe.

## Verificación

- `pnpm typecheck`: PASS (cliente y servidor).
- `pnpm test -- --run`: PASS, 11 archivos y 114 pruebas.
- `pnpm build:client`: PASS, Vite transforma 1.364 módulos.
- `pnpm build:server`: PASS en la compilación de servidor de esta integración.
- La prueba de runtime recorre con `GameState.moveEntityOneSquare` desde la playa hacia A1–A5, las seis entradas de celda, interacciones principales y salidas. Comprueba puerta A4 bloqueando/cediendo al abrir, muro bloqueado y borde del acantilado bloqueado.
- Navegador local aislado `127.0.0.1:4324`: Retiro aparece habilitado; cargan escena Babylon, PNJ, puerta y controles manuales de revelar zombis. Se comprobó visualmente ocultar/mostrar la cuadrícula. Consola de navegador sin errores ni avisos.
- El importador Babylon pasó por `NullEngine`; la prueba exige menos de 450 mallas fuente y lotes estáticos no vacíos.

## Pendiente y siguiente tarea

- La ejecución automatizada prueba el movimiento del servidor y las transiciones descritas; falta recorrido físico de mesa con jugadores y validación específica en móvil/proyector. No se midieron FPS sostenidos.
- El bundle de `world` pesa 1.598 kB (420 kB gzip) y supera el umbral de chunk de 500 kB de Vite. Revisar división/carga diferida y medir rendimiento en un equipo objetivo.
- La versión Node instalada para las comprobaciones fue 24.19.0; el paquete solicita `>=24.21.0 <25`, por lo que pnpm mostró advertencia de versión.
- Las salidas terrestres no pueden completar una transición hasta que existan sus mapas. La barca sí apunta al Pecio.
- El aspecto sigue siendo un greybox/visual fuente, no el acabado artístico final ni una aceptación de usuario.

La QA se ejecutó en el preview local aislado `127.0.0.1:4324`; ese proceso se cerró al terminar. No se reiniciaron ni modificaron las mesas habituales de `3000` y `4323`. Los builds actualizaron los artefactos generados en `dist/`.

Siguiente tarea recomendada: ensayo de recorrido de mesa de playa→A1–A5, comprobación de los cambios de altura en dispositivo/proyector y medición de rendimiento. Atender los problemas de geometría antes de pulir el arte.
