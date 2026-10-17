# Carrerilla automática · 2026-10-14

La acción de salto de exploración ofrece **con carrerilla** y **en parado**. La primera busca dos casillas de 1,5 m detrás de la dirección del salto y, si no son válidas, prueba las dos direcciones traseras contiguas. Retrocede dos pasos, vuelve dos pasos corriendo hasta el punto original de despegue y sólo entonces salta al destino elegido. No incrementa la distancia de salto desde el nuevo punto trasero: el alcance sigue calculado desde el punto original con la FUE de la ficha.

El retroceso y la carrera recorren 6 m en total antes del salto. Es una ayuda de control del VTT, no una regla que regale movimiento ni una bonificación a la Fuerza. Las reglas de referencia mantienen el alcance con carrera/en parado y el coste del salto por distancia: [reglas gratuitas 2024, Long Jump](https://www.dndbeyond.com/sources/dnd/br-2024/rules-glossary#LongJump).

## Arquitectura y seguridad

- `engine/shared/jump-run-up.ts`: planificador independiente de personaje, sprite, cámara o campaña; las campañas nuevas reutilizan el mecanismo para cualquier PJ que tenga habilitada la acción.
- `engine/server/game.ts`: cola autoritativa transitoria por PJ, con pasos normales de retroceso, pasos `run-up` para la carrera y un paso `jump` para el vuelo. Cada tramo se valida otra vez antes de comenzar. No hay timers del navegador ni teletransporte al destino durante la preparación.
- Se comprueban colisiones, terreno transitable, actores, límites, obstáculos, paredes/puertas, superficie, desniveles, peligros y portales. La preparación no cambia de planta ni activa automáticamente un portal. No corta esquinas bloqueadas.
- Una aproximación reciente, continua, en la misma escena/superficie/celda y orientada al destino puede servir de carrerilla ya hecha. No exige retroceder otra vez. Los paquetes de teclado/joystick no borran accidentalmente esa acumulación.
- Interrumpen la preparación: orden manual de movimiento, desconexión/cambio de controlador, cambio de ubicación o superficie por el DM, inicio del combate, condición que impide correr, interacción que requiere detenerse o nuevo bloqueo de la ruta/aterrizaje. No fuerza el salto después de cancelar.
- La cola no se guarda: cargar una partida no reanuda una orden de salto antigua. Cambiar de escena o restaurar correctamente una partida limpia también la carrerilla reciente.
- `jumpMode` es opcional (`standing`, `running`, `auto`) y sólo se admite con `action: jump`. Clientes sin ese campo conservan el modo automático: en parado si basta y con preparación si hace falta.

## Presentación

La rueda del jugador contiene dos entradas de salto. La carrera elige la animación orientada existente, y el vuelo usa el salto existente. No se generan PNG nuevos. La declaración de la acción ya no emite un salto prematuro durante el retroceso: el renderer sigue el tramo autoritativo. Los personajes sin ciclo de carrera propio usan el fallback existente.

## Alcance de esta entrega

Se aplica al salto de **exploración**, para todos los PJ actuales y futuros habilitados. No añade el salto a la rueda de combate: el endpoint conserva `COMBAT_ACTIVE` durante un combate para no eludir el turno, movimiento restante ni ataques de oportunidad. Los saltos por ventanas, conjuros de salto y otras maniobras adjudicadas por el DM mantienen su circuito existente. La retícula actual del salto usa casillas de 5 pies/1,5 m, incluida su convención diagonal; no es una simulación métrica libre.

Se compilan cliente y servidor; al arrancar con `INICIAR.cmd` se usa el código actualizado. No se ha cerrado ni reiniciado ninguna mesa durante esta entrega ni se han modificado guardados reales.

Verificación: 77 pruebas superadas en 9 archivos (planificador, modos del protocolo, secuencia real por tick para tres identificadores de PJ, fallback diagonal, interrupciones, poses carrera/vuelo/reposo, saltos D8/ventanas y regresiones relacionadas). Comprobaciones TypeScript de cliente y servidor correctas. No había una mesa escuchando en los puertos 3000/3308 durante la comprobación; no se afirma haber probado un salto en una partida real del usuario.
