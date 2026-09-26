# Guion de validación física · Rosa de los Vientos

Fecha: 25/09/2026 · Candidata: código `0.3.2-dev.3`, base M5/M6 r32 + overlay r34 + overlay r35. Suite actual: 154/154; integración y typecheck de servidor PASS; builds aislados cliente/servidor comprobados.

Este guion valida el teclado/cámara en el equipo del usuario y el uso real de móvil/proyector. No convierte por sí solo el greybox en arte final ni acepta M5/M6/M7.

La candidata abierta para inspección local usa `http://127.0.0.1:4399` y guarda únicamente en `tmp/roadmap-m7-candidate-r35-20260925/data`. Está enlazada a loopback: funciona solo en este PC. El QR también apunta a loopback; no sirve para móvil ni se debe abrir el puerto a Wi‑Fi. La prueba móvil queda pendiente hasta preparar explícitamente una instancia de red de prueba.

## Seguridad de la partida

- Usar una copia de prueba desechable o un slot sin progreso que se quiera conservar.
- No restaurar, reiniciar ni sobrescribir la partida habitual. No reutilizar el servidor o los datos del puerto 3000 para esta comprobación.
- No probar desde el móvil con este QR de loopback. Si se prepara una instancia LAN aparte, usar sólo una red local de confianza y cerrar ese servidor de prueba al acabar.
- Antes de mover fichas u objetos, confirmar que la página abierta es la candidata nueva y que el DM muestra la sesión de prueba.

## Recorrido y criterio de aprobado

En DM + dos personajes distintos, recorrer sin teletransportes ni cambio manual de mapa:

1. Empezar en el Retiro: viajar a la barca con la acción del DM; comprobar que el personaje aparece sobre ella. Caminar una casilla hasta la jarcia y subir a C1. En C1, caminar una casilla con W y volver con S; repetir con D/A. El DM debe ver cada paso una sola vez y en la misma dirección, sin avance tardío, repetición ni atasco.
2. Subir desde C1 a C2 y C3 y regresar por las escaleras visibles. Dejar el segundo personaje quieto en C1: su posición no debe cambiar.
3. Abrir y cruzar C5–C7; en C4, comprobar que el listón bloquea hasta retirarlo. Cerrar las puertas detrás del grupo y repetir el cruce.
4. C4: no revelar ni permitir recoger sus monedas/objetos antes de abrir la puerta; tras abrirla, recoger una pieza y comprobar que no se duplica. En la cofa, comprobar el conjunto de piezas del nido sin duplicar botín.
5. Bajar por la escalera/escotilla a C8, seguir a C9 y volver a C1; subir a la cofa por la escala y regresar. En ningún paso debe cambiar `wreck-ship` ni moverse el otro personaje.
6. Con un jugador en C3 y otro en C8, volver desde C8 a C1, salir por P01 a la barca y pedir al DM que confirme el regreso al Retiro. El personaje de C3 y el foco del DM/proyector deben quedarse donde estaban.
7. Repetir la llegada y probar la alternativa: desde la barca nadar por el exterior hacia la brecha de popa y entrar en C9 por P16; volver a salir hacia el agua. El recorrido no debe engancharse a la jarcia ni requerir cambio manual de mapa.
8. Cambiar el foco del DM entre personajes y girar la cámara. La cámara debe encuadrar el foco sin alterar posiciones; jugador y proyector conservan únicamente las fichas permitidas para su superficie.
9. Guardar, recargar una página de jugador y comprobar posición/superficie. Probar después la pantalla del proyector y el audio ambiental.
10. Repetir desde móvil físico en vertical y horizontal: joystick, giro de cámara por gesto de dos dedos, escalera y lectura de cuadrícula. Mantener una sesión total de al menos 30 minutos y anotar cortes, temperatura o ralentización.

## Resultado que se debe registrar

- Dispositivo/navegador y resolución; Wi‑Fi usado; duración.
- Para cada transición: superficie inicial/final y si el DM tuvo que intervenir.
- Fluidez WASD/joystick, cámara, legibilidad de escaleras/grid, proyector y audio: `PASS` o incidencia reproducible.
- FPS sostenidos sólo si se midieron en el dispositivo; objetivos orientativos del roadmap: 60 fps en proyector y 30 fps en móvil.
- Capturas antes/después de una incidencia, sin incluir contraseñas ni datos de la partida real.

## Estado

Pendiente de ejecutar en el hardware del usuario. La QA de navegador y las pruebas automatizadas no sustituyen este ensayo.
