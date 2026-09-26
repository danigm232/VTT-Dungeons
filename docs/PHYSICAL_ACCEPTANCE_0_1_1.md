# Prueba física — Alpha 0.1.1 RC4

Esta prueba la realiza el usuario con el PC Windows, dos móviles, el proyector/TV y los altavoces que se usarán en partida. Duración prevista: 15–20 minutos. Anota equipo, navegador, resolución y tipo de Wi-Fi.

## Preparación

1. Cierra servidores anteriores. En una copia limpia del proyecto, abre una consola y ejecuta `INSTALAR.cmd --check`; después ejecuta `INSTALAR.cmd` con doble clic.
2. Ejecuta `INICIAR.cmd`. Si Windows pregunta, permite Node.js en **redes privadas**. No abras puertos del router.
3. En el PC abre `/dm`; en el proyector abre `/projector`, pulsa **PREPARAR PROYECTOR** y después F11. Conecta dos móviles mediante el QR de `/player` usando la misma Wi-Fi.
4. Conserva la consola abierta. Si algo falla, anota el texto exacto y la acción anterior.

> RC4 inicia el joystick cuando el HUD ya está visible. En Aproximación el control aparece atenuado y la ficha no debe girar ni moverse: es una escena de presentación bloqueada. Cambia el DM a **Cubierta** y espera a que las tres vistas indiquen que la escena está lista antes de evaluar el movimiento.

## Enlaces de esta sesión

Con el servidor arrancado en el PC, abre estas direcciones:

- DM en el PC: `http://localhost:3000/dm`
- Jugador en cada móvil: `http://192.168.9.39:3000/player`
- Proyector/TV: `http://192.168.9.39:3000/projector`

La dirección `192.168.9.39` es la IP LAN observada en esta sesión. Si la consola de `INICIAR.cmd` muestra otra IP, sustituye solo esa parte en los dos enlaces LAN. El propio panel DM vuelve a mostrar ambos enlaces y un QR para jugadores.

## Recorrido obligatorio

| Comprobación | Resultado real y alcance |
|---|---|
| Arranque y apertura DM/Player/Projector | PASS reportado; clave de la consola actual funciona. Instalación limpia externa y firewall exacto no descritos. |
| Dos personajes asignados | PASS en móvil + PC; no equivale a dos móviles probados. |
| Seleccionar personaje ocupado desde otro cliente | PASS: no obtiene control. Transferencia con la misma credencial es otro caso, cubierto previamente en navegador/integración. |
| Liberar Mike y volver a entrar con Mike | PASS: vuelve a selección y conserva la posición al reclamarlo. |
| Tras liberar, escoger un personaje diferente | PENDIENTE físico; el relato vuelve a Mike. |
| Cubierta C1/C2/C3 y Aproximación | PASS: cambio rápido percibido, movimiento en Cubierta y bloqueo en Aproximación. Duración de carga no medida. |
| Movimiento cardinal y sincronía con proyector | PASS reportado: todas las direcciones y joystick correcto. |
| Mantener dos controles simultáneos y soltarlos | PENDIENTE físico específico; tener dos personajes asignados no prueba esta condición. |
| Abrir y ver Mochila | PASS reportado. |
| Abrir Mochila mientras se mantiene movimiento y cerrarla | PENDIENTE físico específico; no inferido de abrir inventario. |
| Pérdida/recuperación Wi-Fi | PASS de recuperación funcional: no mueve sin red, vuelve a mover al conectar y se ve en proyector. Tiempo menor de 5 s y ausencia de replay no medidos por separado. |
| Llegar andando al timón y solicitar interacción | PASS: INTERACTUAR disponible y DM recibe solicitud con CD10. |
| Alejarse del timón y deshabilitar interacción | PENDIENTE físico específico. |
| Resolver Falla desde DM | PASS: cambia el timón. No se afirmó haber tirado físicamente el dado ni probado también Supera. |
| Arpía revelada, reposicionada y oculta | PASS reportado. |
| Editar PG desde DM y verificar privacidad | PENDIENTE físico; sí existe evidencia automatizada previa. |
| Tres cámaras | PASS de funcionamiento reportado; resolución/fluidez cuantificada no medidas. |
| Música y SFX desde proyector | PASS de escucha reportado. Calidad artística de SFX a mejorar. |
| Pausar una capa manteniendo otra, saturación y SFX sin replay audible | PENDIENTE físico específico; no inferido de escuchar sonidos. |

## Registro físico parcial — 2026-09-13

El usuario informó de la siguiente sesión física. No se indicó todavía el modelo de móvil, navegador, resolución ni red, por lo que estos datos quedan pendientes de completar en el registro final.

| Comprobación realizada | Resultado real | Alcance |
|---|---|---|
| Cambiar de Aproximación a Cubierta C1/C2/C3 | PASS | La escena de Cubierta queda habilitada para el movimiento probado; Aproximación permanece bloqueada por diseño. |
| Mover a Mike en Cubierta | PASS | La ficha de Mike avanza durante la sesión física. |
| Joystick | PASS | El usuario informa de respuesta correcta y posición útil del joystick en la orientación probada. |
| Abrir otra pestaña con el personaje ocupado | PASS | La segunda pestaña muestra que el personaje está ocupado y no obtiene control; se confirma la exclusividad de controlador. |

Se conserva la aceptación operativa de RC4 para continuar el proyecto. La revisión de Astra distingue los PASS observados de los pasos pendientes; no afirma que todo G1–G8 esté certificado. Completar los pendientes en la siguiente prueba física sin repetir lo ya comprobado salvo regresión. La mejora artística de SFX es una petición de calidad, no un fallo de reproducción.

## Observación durante 10 minutos

Estado: **pendiente de medición formal**. La sesión reportada valida el recorrido funcional; no incluye todavía conteo de 100 movimientos, FPS, latencia visual ni duración continua de diez minutos.

- Realiza al menos 100 cambios de casilla entre ambos móviles. Anota si una intención tarda visiblemente más de 200 ms en empezar; una grabación a 60 FPS permite estimar fotogramas entre gesto y primer cambio visible.
- Anota FPS del proyector como estable, tirones ocasionales o tirones frecuentes. El objetivo es 60 FPS y el mínimo aceptable 30 FPS sostenidos.
- Cambia de escena tres veces, abre/cierra inventario diez veces y fuerza dos reconexiones. No debe crecer el retraso ni duplicarse el audio.
- Desde la distancia normal de juego confirma que cuadrícula, fichas, timón y criatura se distinguen a 1920×1080. Prueba también móvil vertical 390×844 y horizontal 844×390, o anota la resolución real equivalente.

Registra PASS/FAIL y cualquier detalle en la última columna. Si hay un FAIL, conserva RC4 como candidata y entrega el paso, dispositivo, navegador y síntoma exacto a Sol para corregirlo.
