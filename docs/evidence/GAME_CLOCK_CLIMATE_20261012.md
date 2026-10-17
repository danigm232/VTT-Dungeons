# Evidencia — reloj global, iluminación y clima

Fecha: 2026-10-12
Ámbito: candidata web/servidor en una carpeta aislada; no se detuvo ni se
reemplazó la mesa que ya escuchaba en el puerto 3000.

## Funcionalidad implementada

- Reloj autoritativo de 24 horas sincronizado en las vistas DM, jugador y proyector.
- Escala de un segundo real por segundo de campaña durante exploración; pausas
  por combate, cuadros de decisión del DM y pausa manual.
- Seis segundos al completarse un asalto, una hora por descanso corto, ocho por
  descanso largo y tiempos de viaje sólo en rutas con duración escrita.
- Ciclo solar gradual y estado climático por escena guardado en la partida.
- Nieve con cobertura y profundidad separadas, retención y deshielo según
  temperatura; lluvia y humedad; acumulación de charcos, niebla e inundación.
- La nieve mecánicamente difícil requiere al menos 15 cm y una elección del DM.
  Ningún otro efecto ambiental aplica daño, penalización o visibilidad automática.
- Sin librerías, imágenes ni audio de terceros nuevos. Se reutilizan Babylon.js,
  PixiJS y los materiales existentes; constancia en `LICENSES_AND_CREDITS.md`.

## Verificación ejecutada

| Comprobación | Resultado |
|---|---|
| `engine/shared/game-time.test.ts` | 7/7 PASS: escala y formato del reloj, fases solares, ritmos de nieve, persistencia, deshielo, lluvia, niebla e inundación. |
| `engine/shared/protocol.test.ts` | 8/8 PASS, incluidos los comandos y campos del reloj/clima. |
| `engine/server/game.test.ts` | 68/68 PASS, incluidas pausa, 1:1, descansos, asalto, viaje, guardado y canal/permisos. |
| Visuales clima/luz de campamentos | 3/3 PASS en aislamiento (`--maxWorkers=1`): luz interior, perfil solar de A1 y sombras/luces diurnas. |
| Cinco renderes que excedieron el límite global | 5/5 PASS al ejecutarlos aislados con un worker; no se elevó el timeout general de pruebas. |
| Puertas D8 V48 | 7/7 PASS aislado y en la suite global tras alinear la expectativa con la puerta inicialmente cerrada del mapa. |
| Typecheck cliente y servidor | PASS. |
| Build web Vite | PASS: 2.193 módulos; `output/clock-climate-candidate-20261012/dist/web`. |
| Build servidor TypeScript | PASS: `output/clock-climate-candidate-20261012/dist/server`. |
| Servidor de candidata | PASS: puerto 3001, datos separados bajo `output/clock-climate-candidate-20261012/data/saves`; DM, jugador y proyector responden HTTP 200 y `/api/info` anuncia `192.168.9.39`. |
| Suite completa | 615/622 PASS; 7 fallos en 6 archivos y 5 errores de timeout del worker. Cinco pruebas de render (camp animation, camp polish, camp weather y dos de camp rest) excedieron 30 s en la ejecución paralela; las cinco pasan con un worker. `ship-props3d.test.ts` y `wreck-runtime.test.ts` tienen dos aserciones de geometría distintas a las expectativas. |
| Smoke de integración | Parcial. Con el server candidate indicado explícitamente, pasa arranque loopback, seguridad HTTP, roles, catálogo privado, assets, abordaje, movimiento y foco. El paso de vuelta de C2 queda en timeout: el actor aparece en `main 30,19` cuando el helper espera `main 29,19`. La causa no está resuelta y no se cuenta como PASS. |

El smoke de integración se detuvo siempre en un puerto libre de loopback y usó
datos temporales. La mesa de usuario en el puerto 3000 siguió en ejecución.

## Pendiente de aceptación

- Repetir DM/jugador/proyector en Pixel 9a y MSI, orientación vertical y horizontal.
- Observar visualmente amanecer, mediodía, atardecer, noche, nevada, lluvia,
  niebla e inundación en Pecio, campamentos y D8.
- Medir rendimiento sostenido y legibilidad en el proyector físico a 1080p.
- Revisar el timeout de recorrido en el smoke C2 y corregir la expectativa inicial
  del test de puerta D8 en el trabajo de navegación que le corresponda.
