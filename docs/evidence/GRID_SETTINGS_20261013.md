# Cuadrícula configurable — 2026-10-13

La cuadrícula parte de una línea tenue y configurable. Tanto DM como Jugador
pueden ajustar transparencia (6–70 %), grosor (fina, media, gruesa), color fijo
o contraste por casilla. El contraste usa el material del suelo en mapas 3D y
muestrea una vez cada casilla del mapa ilustrado en las escenas 2D. Cada pantalla
guarda sus preferencias localmente; no modifica las casillas, el movimiento ni
las colisiones. El Jugador y DM mantienen ajustes independientes.

| Comprobación | Resultado |
|---|---|
| Pruebas de cuadrícula y terreno 3D | PASS — 21/21 en tres archivos. |
| Typecheck del cliente | PASS — `tsconfig.client.json`. |
| Build de producción | PASS — 2.213 módulos; `output/grid-settings-candidate-20261013/web`. |
| Servidor aislado | PASS — puerto 3002; `/dm`, `/player` y `/projector` responden HTTP 200. Guardados separados en `output/grid-settings-candidate-20261013/data`. |
| Pixel 9a, MSI y proyector 1080p | PENDIENTE — comprobar lectura de cuadrícula y guardar preferencias tras cerrar/reabrir el navegador. |

La mesa activa del puerto 3000 no se interrumpió. Para la comprobación física
hay que abrir la candidata en lugar de la mesa habitual. No se han enviado estos
cambios a GitHub.
