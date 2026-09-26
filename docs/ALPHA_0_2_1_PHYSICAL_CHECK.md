# Prueba física guiada — Alpha 0.2.1 RC1

Estado tras informe del usuario de 2026-09-15: **parcial**. Timón, daño/restos, colisiones, undo, conexión y audio tienen confirmación positiva; puerta abierta/cerrada tiene FAIL visual. Quedan móvil vertical/horizontal, preview/huella y algunas comprobaciones individuales sin confirmar. Registro exacto en `ALPHA_0_2_1_PHYSICAL_REPORT_20260915.md`. No repetir lo ya confirmado salvo después de un cambio que lo afecte.

Equipo objetivo: portátil MSI como DM/servidor, Pixel 9a con Chrome en vertical y horizontal y proyector/TV a 1080p. Mantener la copia Alpha 0.2.0 RC2; no usar una partida importante porque el estado de RC1 todavía se pierde al reiniciar.

## Preparación

1. Arrancar la carpeta actual con `INICIAR.cmd` y abrir las URLs impresas: `/dm` en el MSI, `/player` en el Pixel 9a y `/projector` en la salida 1080p.
2. Preparar el audio del proyector, asignar un personaje al móvil y entrar en la cubierta del pecio. Confirmar que los tres muestran la misma escena.
3. Mirar la popa antes de tocar nada: debe haber un soporte y **una sola** rueda montada. La cubierta no debe contener otra rueda o pedestal dibujado debajo.

## A. Timón separado, traslado y giro

1. Llegar caminando al timón y solicitar la interacción. El DM resuelve manualmente Supera o Falla.
2. Elegir un destino libre en el preview y aplicar. Confirmar en DM, móvil y proyector: soporte vacío en popa y una sola rueda en el destino.
3. Mover la rueda a otra casilla válida. Girarla sucesivamente a 0°, 90°, 180° y 270°. Cada orientación debe distinguirse, respetar su huella y no crear copias.
4. Intentar una posición ocupada por personaje, otro objeto o geometría bloqueada: el preview debe ser inválido y Aplicar no debe cambiar el mundo público.

## B. Daño, destrucción y restos

1. Dañar y después destruir la rueda. Repetir con la puerta y la caja.
2. Confirmar que el estado dañado se ve distinto y que el destruido muestra restos en los tres roles.
3. Caminar a través de cada resto: no debe bloquear personajes. Intentar colocar otro objeto encima: debe rechazarse mientras los restos reservan su ubicación.

## C. Deshacer sin pisar personajes

1. Tras mover o destruir un objeto, situar un personaje en la casilla que necesitaría el estado anterior.
2. Pulsar Deshacer: debe rechazarse, conservar el mundo actual y no desplazar ni superponer al personaje.
3. Retirar el personaje y repetir Deshacer: ahora debe restaurar exactamente el estado anterior, sin duplicados ni reactivar una solicitud antigua.

## D. Puerta, preview y perspectiva

1. Observar cerrada, dañada y destruida. Cerrada debe leerse como barrera estrecha vista desde arriba, alineada con el tabique, no como una puerta frontal mirando al jugador.
2. Abrir/cerrar y cruzar cuando está abierta; verificar que cerrada bloquea. El estado bloqueado sólo debe indicarse al DM.
3. En el editor, mover/girar caja y objetos: el preview debe mostrar el sprite final y la huella verde/roja. Cancelar y Escape no deben publicar cambios.

## E. Red y regresión breve

1. Cortar y recuperar la Wi‑Fi del móvil durante la escena. Al reconectar debe recibir el estado vigente sin duplicados ni borradores viejos.
2. Comprobar movimiento/joystick en vertical y horizontal, criatura mostrar/ocultar, mochila/PG, cámaras y música/SFX del proyector.
3. Mantener la mesa unos minutos y anotar cualquier salto visual, objeto fantasma, error visible o audio repetido.

## Registro que debe devolver el usuario

- Fecha y versión mostrada: 
- Pixel 9a / Chrome vertical: PASS o incidencia:
- Pixel 9a / Chrome horizontal: PASS o incidencia:
- MSI / DM: PASS o incidencia:
- Proyector 1080p / audio: PASS o incidencia:
- A Timón: PASS o incidencia:
- B Daño/restos: PASS o incidencia:
- C Deshacer ocupado: PASS o incidencia:
- D Puerta/preview/perspectiva: PASS o incidencia:
- E Reconexión/regresión: PASS o incidencia:
- La rueda vertical necesita más escorzo elíptico: sí / no / dudoso:

Si aparece una incidencia, conservar el estado y describir el último paso, el objeto y la vista afectada. Sol debe reproducir y corregir sólo los fallos observados antes de promover RC1.
