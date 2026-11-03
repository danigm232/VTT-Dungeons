# Espejo vacío y conservación de archivos funcionales — 20/10/2026

El usuario aclaró que la antigüedad de siete días se aplica a respaldos,
auditorías y residuos, nunca a archivos necesarios para jugar. Ese criterio
queda explícito en la guía de mantenimiento. Se añadió una protección
conservadora: con una mesa o revisión abierta se aplaza el borrado de carpetas
generadas completas, porque su ruta web puede venir de variables de entorno.
La herramienta de mantenimiento completa **27 comprobaciones aisladas**.

## Causa y corrección del mapa vacío

Se reprodujo el lienzo azul en una pestaña nueva del DM. Los recursos del
escenario cargaban y la conexión funcionaba, sin errores de red evidentes.
`clampMirrorCameraTarget` copiaba un `Vector3` de Babylon mediante expansión
de objeto. Sus coordenadas son accesores: `y` desaparecía y la cámara recibía
una altura indefinida. La proyección resultaba inválida.

La reproducción directa devolvía `finite:false` y no incluía `output.y`.
Tras conservar expresamente `y:target.y`, devuelve `finite:true` con altura 4.
Se añadió una regresión con vectores reales y se actualizó la inicialización
del doble de prueba de cámara compartida para su nuevo conjunto de preferencias.

**17/17 pruebas correctas** en `mirror-camera-bounds.test.ts`,
`d8-camera.test.ts` y `world-shared-camera.test.ts`. Comprobación de tipos del
cliente, compilaciones Vite y servidor correctas mediante `prepared-build.mjs`.

La revisión aislada en el puerto 4600 mostró de nuevo terreno, paredes,
personaje y cuadrícula, sin avisos ni errores de consola. Captura:
[mapa corregido](../../output/mirror-camera-fix-20261020/review-fixed.png).
Se cerraron las pestañas y el servidor de revisión propios.

## Instalación y estado al entregar

Candidata preparada en `runtime/prepared-mirror-camera-fix-20261020-1114` y
activada en `dist/` con el mecanismo existente. La distribución anterior se
conservó en `runtime/previous-build-*`.

Al preparar la activación ya no había proceso escuchando en el puerto 3000.
El comprobador del lanzador archivó su bloqueo antiguo y no terminó otros
procesos. Permanecen los guardados `active.json`, `active.bak.json` y su historial.

La revisión automática de permisos **rechazó el arranque en segundo plano**
del servidor actualizado; el mensaje solo indicó «blocked by policy», sin un
motivo más específico. No se intentó eludir el rechazo. Por ello no se acredita
un arranque final en el puerto 3000.

Para abrir la mesa actualizada, ejecutar `INICIAR-ONE-SHOT.cmd`, esperar la
compilación/arranque y recargar la pestaña DM con Ctrl+F5. La prueba visual
descrita arriba es aislada; no equivale a aceptación física de móvil/proyector.
