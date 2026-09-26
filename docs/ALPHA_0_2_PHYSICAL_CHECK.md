# Prueba física — Alpha 0.2 RC2

**Resultado: PASS operativo el 2026-09-14.** Probado por el usuario con Pixel 9a y portátil MSI en Chrome, móvil vertical y horizontal y salida 1080p. Puerta, caja, sincronización, colisiones, reconexión y regresión funcionaron. Única incidencia: el sprite de puerta se ve demasiado frontal para la cámara cenital inclinada; queda como mejora visual no bloqueante. El detalle se conserva en `docs/ACCEPTANCE_RESULTS.md`.

Esta prueba confirma lo que no puede demostrar la automatización: respuesta táctil, sincronización visible, legibilidad en pantalla grande y recuperación de la red. RC2 ya superó typechecks, 18 pruebas unitarias, las 12 comprobaciones del contrato y dos integraciones en servidores propios con puerto libre. Alcance exacto del informe físico en ACCEPTANCE_RESULTS.md.

## Preparación

1. Cuando no haya una partida que quieras conservar, cierra el servidor anterior y haz doble clic en `INICIAR.cmd`.
2. En el PC abre la dirección **DM** que muestra la consola e introduce su clave.
3. Abre la dirección **Proyector** en la pantalla grande y pulsa **Preparar audio**.
4. En el móvil abre la dirección **Jugadores** o escanea el QR del DM; elige Mike. Si puedes, abre otro jugador en PC o segundo móvil.
5. En DM cambia **Escena** a **Prueba de objetos del pecio**. Confirma que móvil y proyector cambian enseguida y muestran el interior con cuadrícula, puerta y caja.

## Puerta

1. En **Mapa de trabajo y objetos**, pulsa la puerta en el mapa o **Seleccionar** en su fila.
2. Pulsa **Abrir**. Comprueba que cambia el sprite en DM, jugador y proyector.
3. Lleva a Mike hasta la abertura y crúzala con el joystick. Debe pasar por la casilla central.
4. Aleja a Mike del hueco y pulsa **Cerrar**. Intenta cruzar: el personaje debe detenerse ante la puerta.
5. Pulsa **Bloquear**. El DM debe leer «bloqueada»; jugador y proyector deben verla simplemente cerrada. Pulsa **Abrir** y confirma que el DM recibe el aviso de que está bloqueada. Pulsa **Cerrar** para desbloquearla y después **Abrir**.

## Caja, preview y deshacer

1. Pulsa la caja en el mapa o **Mover**. Deben aparecer contorno, **Girar**, **Aplicar** y **Cancelar**.
2. Pulsa **Girar**: la vista previa debe pasar de 2×1 a 1×2 sin mover todavía la caja pública.
3. Toca una casilla libre del mapa. La previsualización verde debe seguir al destino. Toca pared, spawn, puerta o una ficha: debe verse roja y **Aplicar** quedar deshabilitado.
4. Pulsa **Cancelar** o la tecla Escape. Confirma en jugador/proyector que la caja nunca cambió.
5. Vuelve a **Mover**, gira y elige un destino verde que corte la ruta izquierda. Pulsa **Aplicar**. La caja debe cambiar para todos y bloquear el paso.
6. Pulsa **Deshacer: Caja recolocada**. Debe regresar a la posición y orientación previas para los tres roles.

## Reconexión y regresión

1. Apaga el Wi-Fi del móvil durante unos segundos y vuelve a encenderlo. Debe recuperar el mismo personaje, escena y estado actual de puerta/caja sin repetir movimientos.
2. Cambia a **Cubiertas C1 · C2 · C3**. Verifica un movimiento, el timón, revelar/ocultar la criatura, mochila y cámaras.
3. Reproduce música, una capa ambiente y los tres efectos desde DM. Deben sonar sólo en el proyector. La calidad artística de los SFX PCM sigue en backlog; aquí se comprueba funcionamiento.

Anota en `docs/ACCEPTANCE_RESULTS.md`: fecha, dispositivos/navegadores, orientación del móvil, resolución aproximada del proyector, resultado de cada bloque y cualquier diferencia visible. No hace falta repetir pruebas RC4 que ya quedaron confirmadas salvo que observes una regresión.
