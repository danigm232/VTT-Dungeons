# Espejo · correcciones tras revisión visual · 19/10/2026

Segunda candidata, a partir de las ocho capturas y los nueve puntos del usuario. Evidencias independientes en `output/d8-mirror-refinement-20261019/`; la candidata anterior y la mesa habitual se conservan.

## Cambios

1. Se elimina el cilindro añadido bajo el espejo. El PNG ya contiene su pedestal completo; ahora apoya directamente sobre una sombra ajustada a su base.
2. La galería tiene quince metros de geometría interior, cinco tramos de hielo progresivamente oscuros, curva final, suelo propio y carámbanos en la boca. Se retiran las dos siluetas planas anteriores y queda una sola apertura.
3. Se sustituyen las masas cilíndricas y sus tapas por una envolvente continua de hielo de 26 m de alto, bóvedas laterales y techo con estalactitas. El frente se representa como sección de observación de la cueva; no es una segunda puerta ni un nuevo destino de la aventura.
4. Por petición explícita del usuario, la cuadrícula pasa de 260 a 399 casillas transitables, sobre una malla de 24×17 con borde irregular. Conserva el origen exacto `(-15,-9.75)`, los índices y posiciones de las 260 casillas anteriores, las 49 direcciones peligrosas, el espejo, las llegadas y las reglas. Las 139 casillas nuevas son perímetro helado difícil: 344 difíciles en total. No exige remapear posiciones guardadas. Para archivos muy antiguos en formato de 32 columnas, la migración sigue usando el rectángulo histórico de 20 columnas, sin estirarlo a la ampliación. Se prueba también guardar y cargar en las nuevas casillas este y sur.
5. La atenuación usa segmentos ortográficos y la intersección real con triángulos, muestreando el volumen del personaje. Se elimina la protección indiscriminada de una franja amplia de suelo y del espejo a distancia. Las superficies que tapan el cuerpo conservan un 32 % de visibilidad, con transición gradual y retención breve; vuelven a opacas al despejar la vista. El espejo se protege en toda su altura al acercarse.
6. Los pies de pared se hunden bajo el suelo y se mezclan con taludes irregulares de escarcha, fragmentos y suciedad de contacto. Se eliminan las sombras de objetos retirados.
7. Las superficies usan hielo azul con vetas, grietas oblicuas, escarcha y relieve normal generado por código. No se añaden imágenes externas.
8. La vista general DM/proyector encuadra el área ampliada. El seguimiento mantiene la escala de exploración de referencia y las preferencias de giro, inclinación y zoom.

El centro de cada casilla queda como mínimo a 1,278 m del contorno base de la pared. El relieve máximo de la pared es 0,54 m; los fragmentos se alojan hacia la roca. La prueba de navegación verifica conexión de todas las casillas y recorridos reales del servidor hasta las paredes este, sur y oeste. Esto protege la huella del cuerpo; la superposición en pantalla se resuelve mediante transparencia.

## Reproducción y validación

Abrir con `./scripts/review-d8-mirror.ps1`. Por defecto usa `runtime/d8-mirror-refinement/{server,web}`, loopback, puerto libre y guardados temporales. `-Build` reconstruye. `-Version candidate` permite abrir la versión anterior. La mesa normal no se ha reiniciado ni se han tocado sus guardados.

El visor se construye con `node scripts/d8-mirror-review-server.mjs --build --runtime=runtime/d8-mirror-refinement --evidence=output/d8-mirror-refinement-20261019 --port=4597` y se sirve con el mismo comando sin `--build`. `/candidate/` ejecuta el mapa; `/gallery/` muestra comparativas y vídeos.

`working-baseline.json` se obtiene de una compilación aislada que carga las copias de las fuentes anteriores a esta revisión. `gameplay-invariants.json` compara origen, celdas previas, peligros, dificultad anterior, props, spawns y guardado/restauración. Las capturas anteriores se copian como `baseline-*`; las nuevas se guardan como `candidate-*`.

Pruebas, compilaciones, capturas y medidas finales se enumeran en `acceptance-summary.json`. Las mediciones forzadas de captura no representan FPS sostenidos. La sesión de veinte minutos de la primera candidata sigue siendo evidencia histórica y no se atribuye a esta revisión.

- `regression-tests-final.txt`: 78/78 pruebas en 15 archivos. Tipos cliente y compilación servidor sin errores; `client-build-final.txt` confirma la compilación Vite aislada.
- `network-tests-final.txt`: DM, dos jugadores y proyector; iniciativa/tiradas manuales, idempotencia, aparición única, reconexión sin repetición, restauración, historial y autoload correctos.
- `candidate-matrix.json`: 120 vistas, ocho puntos × cinco giros × tres inclinaciones; recursos listos, escena correcta, zoom 2, cero errores y cero superficies totalmente ocultas. Se añaden tres puntos junto a paredes a los cinco puntos seguros originales.
- `candidate-walk.json` y vídeo: 383 estados autoritativos, 33,217 s de tiempo de movimiento del servidor; la grabación dura más por el coste de captura. Llega a los nuevos bordes este y sur y a la pared oeste, sin daño. Ambos vídeos se han reproducido en la galería; no constituyen escucha física.
- `candidate-extras.json`: cuatro horarios y doce combinaciones de rol/tamaño, todas listas y sin errores. Sesión limpia: 54,31 MiB estimados en tamaños móviles, 57,07 MiB a 720p y 62,42 MiB a 1080p. 77–289 llamadas de dibujo; medianas forzadas de 4,6–9,2 ms y percentiles 95 de 7,1–15,7 ms. Son 24 muestras calientes por caso, sin extrapolación a FPS sostenidos.
- `sequence-walk-warm-extras.json`: después de animaciones y recorrido, pico de texturas estimado de 133,68 MiB. Supera el guardarraíl de 80 MiB y requiere validación/optimización adicional en el dispositivo objetivo; no se declara aprobado ese presupuesto transitorio.
- `candidate-cleanup.json`: tres idas/vueltas café–Espejo sin errores. En cada regreso: 422 mallas, 46 texturas y 56,53 MiB estimados; recursos listos y sin crecimiento entre las tres muestras.
- `ui-player-390-844.jpg`, `ui-player-844-390.jpg`, `ui-projector-1920-1080.jpg`, `ui-dm-final.jpg`: páginas reales de la compilación final, además del visor. En proyector se verificó un viewport DOM de 1920×1080. Los tamaños móviles son simulados; se comprobaron los accesos de detalle/conjunto y configuración del jugador.

El ensayo de secuencia inicial agotó una espera fija de recursos al volver del café; no se usa como aceptación. El arnés ahora espera la disponibilidad efectiva con un límite adicional de quince segundos y registra los recursos pendientes en caso de fallo. La repetición final terminó sin errores. Las correcciones de montaje del arnés se mantienen separadas de la lógica de producción.

## Pendiente de aceptación

Revisar artísticamente el techo, la profundidad de la galería, las vetas del hielo y la intensidad de la transparencia. Probar movimiento junto a paredes en Pixel 9a físico y proyector real; las dimensiones simuladas no certifican esos dispositivos. Repetir la sesión física continua y la escucha de audio indicadas en el informe anterior. Dados, decisiones y resolución de la escena siguen en mesa.
