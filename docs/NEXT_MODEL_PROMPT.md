# Relevo vigente — Pecio C1–C9, revisión r36

Actualizado el 25/09/2026. Trabaja en `C:\Users\User\Desktop\Dungeons`. Antes de editar, consulta `ROADMAP_V1.md`, `PROJECT_STATE.md`, `campaigns/stormwreck-isle/private/C1_GREYBOX_GATE.md`, `campaigns/stormwreck-isle/private/M4_ARRIVAL_AND_DEPARTURE_AUDIT_20260925.md`, `campaigns/stormwreck-isle/private/m5/ART_WORKLOG_20260925.md` y `campaigns/stormwreck-isle/private/m5/M6_M7_PHYSICAL_PLAYTEST_20260925.md`.

## Estado y evidencia

- C1–C9 y la cofa son una sola escena lógica `wreck-ship`, con superficies conectadas; no dividirla en mapas. No alterar conexiones, alturas ni colisiones al trabajar arte.
- r35 alinea el desembarco con la barca (`sea`, 24,15), deja P01 a un paso y da una vía exterior por agua (filas 15–16) hasta P16/C9. La prueba de motor verifica ida y vuelta por la brecha; la integración compilada con dos clientes verifica llegada, abordaje, salida individual y retorno al Retiro con confirmación del DM. El otro PJ permanece en C3 y no cambia el foco.
- Con servidor ligado a loopback, `/api/info` y el QR no anuncian una IP LAN. La candidata r35 está en `http://127.0.0.1:4399`, sólo para este equipo, con datos desechables en `tmp/roadmap-m7-candidate-r35-20260925/data`. No usar el puerto 3000 ni sus guardados.
- M4 del capítulo 3 está implementado técnicamente: viaje/abordaje, exploración, hallazgos, encuentros, arpía, diario/talismán y desenlaces. C4 sólo revela botín después de abrir la puerta; la cofa tiene cinco piezas/120 po; el sueño del clérigo respeta las dos rutas de maldición. Dados, tiradas y decisiones continúan en manos del DM.
- Verificación actual: suite **154/154**, integración compilada, typecheck de servidor PASS; typecheck/build aislados de cliente y servidor PASS en la candidata. Integraciones previas cubren objetos, permisos, dos jugadores/proyector y guardar/restaurar. La candidata se recupera aplicando base `backups/pecio-m5-m6-qa-candidate-r32-20260925.zip`, delta `backups/pecio-m4-audit-fixes-r34-20260925.zip` y después `backups/pecio-m4-arrival-routes-r35-20260925.zip`. No incluyen saves, dependencias, `dist`, datos QA ni originales `Imagenes VTT`/OneDrive.
- M5 sigue sin aceptación visual: ya se integró la primera textura de tablones (`deck-planks-art01.png`) en cubierta/casco, además de agua, viento y luces ambientales. Es una primera capa, no el acabado HD-2D de las referencias; paredes/props modulares y revisión del usuario siguen pendientes. Cuatro antorchas apagadas y recogibles. No afirmar que ya iguala las referencias.
- Requisito visual añadido por el usuario: terminar el mar ilustrado y crear assets/variantes finales para todos los interactuables/recogibles y todos los objetos decorativos de C1–C9, cofa y exterior. El agua ripples actual es sólo textura provisional; props `practice-*` y `*-blockout` siguen pendientes. Inventario, estados y criterios verificables: `campaigns/stormwreck-isle/private/m5/M5_ASSET_COVERAGE_PLAN_20260925.md`. No contar ningún asset como completado por existir un placeholder.
- Se corrigió el desvío diagonal alrededor del mástil de la cofa y tiene regresión. El paso es 220 ms por casilla, servidor 30 Hz y snapshots 20 Hz; esto no certifica latencia, FPS sostenido ni sensación subjetiva. Bundle `world`: 1.615,93 kB (426,00 kB gzip), aún sobre 500 kB. `package.json` pide Node >=24.21; entorno comprobado: 24.19.

## Siguiente hito: M7 físico, luego revisión M5

Usa el guion `campaigns/stormwreck-isle/private/m5/M6_M7_PHYSICAL_PLAYTEST_20260925.md`. El usuario ya reportó lentitud, WASD desincronizado y choques percibidos; el recorrido automatizado no sustituye probar la copia en su Windows. Comprobar barca/jarcia, entrada alternativa nadando, C1–C9/cofa, puertas y escaleras, jugadores separados, regreso individual, foco DM, proyector, save/reload, audio realmente escuchado y un recorrido de al menos 30 minutos. Registrar dispositivo, resolución/orientación, incidencias y FPS si se miden. No afirmar 60 fps en proyector ni 30 fps en móvil sin medición.

La candidata del puerto 4399 es loopback y no funcionará desde el móvil. No abrir puertos ni anunciar una IP LAN sin preparar una instancia de red de prueba explícita. La aceptación física de teclado, móvil y proyector corresponde al usuario; recoger sus resultados y arreglar incidencias reproducibles antes de cerrar M7. La aceptación visual de M5 también queda pendiente: no inferir aprobación a partir de una captura anterior.

## Límites de seguridad y continuidad

- Mantener intactos el servidor/puerto de producción (`3000`) y los guardados reales; usar sólo datos temporales en pruebas.
- No mover ni modificar referencias de OneDrive ni `Imagenes VTT`. Mantener procedencia/licencias; no incluir fuentes privadas en el cliente.
- No añadir CDN, automatizar tiradas, cambiar la geometría mediante arte ni hornear secretos en imágenes.
- Si aparece lentitud, medir por separado input local, confirmación de servidor y render antes de cambiar el paso de 220 ms o los snapshots; conservar una regresión que reproduzca el problema.
