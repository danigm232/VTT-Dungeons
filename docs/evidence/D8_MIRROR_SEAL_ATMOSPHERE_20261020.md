# Espejo · sello y ambiente — 20/10/2026

Revisión solicitada: sugerir ambiente de cueva y corregir el cierre de hielo para que no se vea abierto al girar o inclinar la cámara. Exclusiva de `mirror`, sobre los cambios existentes de hielo, salida y cámara continua. Sin publicación ni cambios de guardados reales o distribución instalada.

## Resultado

El cierre anterior era una cara de arco adelantada respecto a la abertura real, con dos paredes laterales sin continuidad superior. Las vistas oblicuas permitían ver detrás. Se sustituye por una extrusión cerrada de 3,35 m, con tapas, arco y base bajo el suelo. La embocadura mantiene un cuello estrecho delante de la última fila; se ensancha detrás de las casillas legales y solapa la abertura original. Un revestimiento arqueado y una masa superior inclinada conectan el cierre con la pared. La unión de escarcha es continua e irregular.

El núcleo lechoso y las vetas del hielo comunican un cierre completo. Se mantienen grietas, 16 fragmentos y polvo al derrotar al Reflejo preparado; todo el bloque desaparece, mientras permanece la galería. Caminar por el umbral sigue llevando a la cena con Anteros. No se recoge automáticamente el espejo ni se decide un desenlace.

Se añaden tres bolsas pequeñas de bruma baja y doce partículas de escarcha repartidas entre tres puntos, con caídas breves y pausas largas. La bruma existente pasa a usar posiciones absolutas: no acumula desplazamiento según los fotogramas. En combate se atenúa la bruma y se eliminan las caídas; las pantallas pequeñas usan una bolsa y un punto de caída. Movimiento reducido inmoviliza las bolsas y elimina los desprendimientos nuevos. Reutilizados colores/materiales del mapa; dos máscaras procedurales propias de 128/256 px, sin descargas ni nuevas licencias externas.

Para audio se recomienda aire grave discreto, crujidos aislados y alguna caída de hielo lejana. Esta entrega **no cambia el audio** ni acredita escucha física. Conviene ajustar esa mezcla junto a las voces de la mesa antes de añadir capas permanentes.

## Verificación

- 19 pruebas en seis archivos correctas: geometría, presentación, atlas/reflejos, paquete Playground, navegación y salida.
- El volumen no tiene aristas abiertas: cada arista pertenece a dos triángulos. 5.985 rayos contra triángulos reales cubren el área de la abertura, cinco giros y siete inclinaciones; todos encuentran hielo. Se usa material explícito en la prueba para impedir el fallback de Babylon a la caja envolvente.
- 384 rayos verticales comprueban la altura corporal de las casillas contiguas, incluyendo su radio de 0,28 m; sin intersección con el sello.
- 70 capturas anteriores y 70 finales equivalentes: casillas seguras 5,2 y 5,1, giros −30°/−15°/0°/+15°/+30°, inclinaciones 5°/7,35°/10°/12,6°/15°/20°/25°, zoom 2, 1280×720. Hojas finales revisadas visualmente y sin errores de carga. Es un muestreo de la cámara continua, complementado por el volumen cerrado; no una captura de cada valor intermedio posible.
- Cuatro horas y doce combinaciones de rol/tamaño: 390×844, 844×390, 1920×1080 y 1280×720; 16 perfiles, todos listos y sin errores. Son tamaños simulados, no dispositivos físicos.
- Rotura grabada: grietas, 16 fragmentos durante la ráfaga, paso abierto y llegada a `dinner`. Vídeo ambiental de doce segundos y capturas de llegada, orilla, reliquia y conjunto.
- Red real aislada DM/dos jugadores/proyector: bloqueo previo, derrota, cruce con movimiento del jugador hasta Anteros, independencia del segundo jugador, reconexión sin repetir eventos, guardado/restauración e historial/reinicio correctos.
- Compilaciones cliente/servidor aisladas y comprobación de tipos del cliente correctas. Interfaz DM/jugador abierta en el Espejo. No se han cambiado las cámaras actuales de otros chats.
- Conservadas las 399 casillas, 344 difíciles y 49 peligrosas; coordenadas, entradas, estadísticas y objetos previos verificados contra la base. Sin nuevas reglas o decisiones automáticas.

## Coste y límites

Tres regresos café–Espejo vuelven a **599 mallas, 62 texturas y 78,1043 MiB estimados**, idénticos en las tres muestras. Entre 120 y 291 llamadas de dibujo y 74,33–88,97 MiB en los perfiles medidos. La referencia ambiental a 1280×720 registra 231 llamadas, 78,09 MiB y fotograma forzado con finalización de GPU de 8,3 ms mediana / 12,1 ms p95, 24 muestras.

Estos tiempos se obtienen en navegador con otras vistas abiertas y no certifican FPS, fluidez física o memoria total de GPU. **La muestra de 1080p supera el presupuesto orientativo de 80 MiB**; permanece pendiente el ajuste/validación de memoria en el dispositivo objetivo. Los límites transitorios de la candidata anterior siguen documentados en su informe.

Esta revisión enfocada no repite la sesión de veinte minutos. La sesión anterior de 20,69 minutos pertenece a `icepass` y no se presenta como prueba nueva. Pendientes la aprobación artística del usuario, revisión física del Pixel 9a y proyector, escucha con voces y sesión física prolongada.

## Abrir y reproducir

- Candidata temporal de esta entrega: `http://127.0.0.1:57255/dm`, `/player` y `/projector`; datos separados en `C:\Users\User\AppData\Local\Temp\dungeons-review-0GANSH`.
- Galería con comparador, hojas y vídeos: `http://127.0.0.1:4602/gallery/`.
- Reiniciar una candidata aislada: `./scripts/review-d8-mirror.ps1`; ahora usa `-Version atmosphere`. Las revisiones anteriores siguen disponibles con `-Version icepass`, `artpass`, `refinement` o `candidate`. `-Build` recompila sólo su carpeta aislada.
- Fuentes compiladas: `runtime/d8-mirror-seal-atmosphere-20261020/{server,web}`. Evidencia: `output/d8-mirror-seal-atmosphere-20261020/`.
- Fixtures nuevos: `node node_modules/tsx/dist/cli.mjs scripts/d8-mirror-icepass-fixtures.ts --output=output/d8-mirror-seal-atmosphere-20261020`.
- Resumen verificable, hashes y galería: `node scripts/d8-mirror-seal-atmosphere-report.mjs`.

El parche previo y las fuentes del Espejo se conservaron en `before/`. No se ha detenido el servidor habitual de puerto 3000, sustituido `dist`, modificado guardados reales ni publicado en GitHub. Los cambios de cámara continua, Silverfarben y otros mapas permanecen.
