# D8 Night · hielo, bóveda y salida del Espejo

20 de octubre de 2026. Refinamiento solicitado después del pase de diez puntos. Alcance: `mirror`, más la conexión explícitamente solicitada a `dinner`. Sin subagentes, publicación ni cambios en guardados reales. Se preservó el trabajo existente, incluida la corrección de altura de cámara de otro chat.

## Resultado de los cinco puntos

1. Se eliminó el mosaico repetido de la textura de detalle que dibujaba juntas rectas. La imagen se lee una sola vez, dentro de su borde opaco, incluyendo la extensión escénica del suelo frente al tablero. Las grietas que identifican el hielo peligroso y la cuadrícula opcional siguen disponibles.
2. Reflejos tenues de los personajes, optativos por escena. Reutilizan la textura y pose que está realmente visible; también respetan su orientación y transparencia. Se proyectan en tiras sobre las superficies de hielo, con desvanecimiento y muestreo local de nieve, pulido y luz del espejo. Se consultan los triángulos reales del lago y placas para dibujarlos por encima del hielo. No se crean cámaras, texturas de reflexión ni un efecto global. Es una aproximación estilizada, no un reflejo físico completo ni SSR.
3. Paredes con pliegues continuos e irregularidad a varias escalas; más subdivisiones para que el relieve sea geométrico. Contrafuertes con anchura variable, desvíos, crestas y ensanchamientos. El relieve adicional crece por encima de los personajes; se conserva el espacio libre en las casillas próximas al perímetro.
4. Se retiró la franja transversal de bloques que parecía una losa flotante. La nueva superficie interior abovedada une ambos laterales y la zona posterior. Su opacidad se retira gradualmente en la parte del encuadre que taparía la escena, conservando el techo superior y sus formaciones colgantes. Se mantienen 15°/25°/35°, los cinco giros y las preferencias de cámara. Recomendación: conservar 15° para explorar. Bajar a 5°–10° no resuelve por sí solo una geometría cortada; no se ha impuesto ese cambio.
5. Un sello de hielo ligeramente transparente cierra la única galería. Al llegar a 0 PG el Reflejo preparado, el servidor rompe el sello una sola vez. El cliente presenta grietas, caída de fragmentos, polvo de hielo y un breve refuerzo de luz. La reducción de movimiento evita fragmentos y partículas. Cruzar caminando la casilla 5,0 lleva a la cena con Anteros; DM/proyector siguen al viajero y el otro jugador conserva su mapa. Esto no elige una opción narrativa, recoge el espejo ni decide el final.

## Contrato y guardados

Se conservan 399 casillas del catálogo, 344 difíciles y las mismas 49 casillas peligrosas, su origen y sus coordenadas. El sello nuevo bloquea temporalmente las tres casillas 4,0 / 5,0 / 6,0. Es la ampliación de progresión autorizada en el quinto punto; no se presenta como un cambio puramente visual. Permanecen las estadísticas, inventarios, reglas, dados y decisiones manuales.

El paso automático comprueba la condición de la puerta igual que el paso manual. Ocultar una criatura viva no abre la galería. Las campañas que no configuran una salida por derrota no reciben este comportamiento. Los jugadores no pueden abrir el sello bloqueado como una puerta ordinaria; el DM conserva las herramientas explícitas de intervención sobre objetos.

Los guardados modernos conservan la puerta abierta/cerrada. Un guardado antiguo añade el objeto ausente: si ya contenía un Reflejo preparado derrotado, se instala abierto antes de la primera instantánea. Solo si un actor ocupaba una de las tres nuevas casillas bloqueadas se reubica en la casilla segura libre más cercana, conservando sus datos. Se ignoran las vistas de preparación sin props al decidir si debe reproducirse una rotura; entrar/reconectar con el sello ya roto no repite el efecto.

## Ejecución aislada

Compilaciones en `runtime/d8-mirror-icepass-20261020/{server,web}`. El lanzador `scripts/review-d8-mirror.ps1` usa esta revisión por defecto, con un puerto libre y carpeta temporal nueva. `-Build` reconstruye; `-Version artpass`, `refinement` y `candidate` conservan las revisiones anteriores. No se sobrescribe `dist` ni se reinicia la mesa normal.

Galería: `http://127.0.0.1:4601/gallery/`. Visor de prueba: `http://127.0.0.1:4601/candidate/?icepass`. La galería se sirve con `scripts/d8-mirror-review-server.mjs --runtime=runtime/d8-mirror-icepass-20261020 --evidence=output/d8-mirror-icepass-20261020 --port=4601`.

Mesa ejecutable de esta revisión: `http://127.0.0.1:50722/dm`, jugador `/player` y proyector `/projector`. Usa exclusivamente la carpeta temporal `dungeons-review-Q820zM`; se dejó el Espejo seleccionado. Los enlaces y el directorio de esta sesión se conservan en `review-session.json`. El puerto normal 3000 siguió a cargo del proceso existente.

La base de trabajo y los módulos iniciales están en `output/d8-mirror-icepass-20261020/before/`. `p01`–`p04` documentan los avances; las imágenes `candidate-*` corresponden al conjunto final y sus correcciones de integración. Las referencias anteriores permanecen intactas. No se añadieron imágenes generadas ni recursos externos: se reutilizan los materiales originales del pase anterior y geometría propia.

## Validación técnica

- `regression-tests.txt`: 126 pruebas aprobadas en 20 archivos, incluidas colisión, peligros, cámaras, personajes, audio, persistencia y las nuevas salidas.
- `final-change-tests.txt`: comprobación adicional del último cambio de presentación, del paquete generado y de la primera instantánea tras una restauración; 8 pruebas en 3 archivos.
- `shared-port-regression.txt`: 3 pruebas adicionales de la otra campaña sobre pasos automáticos y adjudicados, sin cambios en sus mapas.
- Tipos del cliente, servidor y compilaciones aisladas: salidas conservadas junto a la evidencia. La advertencia existente de empaquetado sobre un import de Babylon no se presenta como un error nuevo.
- `gameplay-invariants.json`: comparación exacta con el pase anterior para casillas, terreno, peligros, reliquia y spawns; ocho rutas seguras recorridas mediante `GameState`.
- `network-tests-final.txt`: DM, dos jugadores y proyector; sello bloqueado antes de la derrota, apertura compartida, idempotencia, movimiento real de jugador hasta Anteros, independencia del segundo jugador, reconexión, restauración del mundo completo, historial y reinicio con carga automática. Las tiradas siguen siendo manuales.
- `candidate-exit-stages.json`: captura de la transición con 16 fragmentos activos durante la rotura, antes de su limpieza; `candidate-exit.webm` muestra la secuencia y el paso a la cena. Las instantáneas y los dos pasos finales proceden del servidor de prueba.
- La tanda final de 120 cámaras, los 16 perfiles de luz/pantalla y la sesión automatizada de veinte minutos se registran en `candidate-matrix.json`, `candidate-extras.json` y `candidate-soak.json`. `acceptance-summary.json` exige que estén completos y sin errores antes de cerrar la aceptación técnica.
- Resultado de la tanda: 120 vistas listas, ningún actor fuera de pantalla y cero errores; 16 perfiles completos. La sesión final duró 20,69 minutos, con ocho idas/vueltas, todas las muestras de navegación visibles y ninguna excepción.
- `candidate-cleanup.json`: tres regresos adicionales con exactamente 583 mallas, 58 texturas y 72,6877 MiB cada vez, sin crecimiento. La galería y `acceptance-summary.json` se generaron después de comprobar todos estos resultados.
- `continuous-movement.txt` y `movement-fixtures.json`: 413 estados autoritativos de movimiento continuo, 33,55 segundos y ningún daño. Se regeneraron con el servidor actual y las rutas seguras de esta revisión.

Las mediciones del visor son redibujados forzados con espera de GPU, no FPS sostenidos del Pixel 9a ni memoria total del controlador. Las capturas de tamaños móvil/proyector son simulaciones del tamaño de pantalla. El vídeo no acredita una escucha física.

Los doce perfiles de rol/tamaño registran entre 135 y 232 llamadas de dibujo, por debajo del guardarraíl orientativo de 350. Después de la secuencia hay entre 104,18 y 118,81 MiB de texturas estimadas: el pico sigue por encima del presupuesto orientativo de 80 MiB. Se documenta este exceso transitorio; no se certifica ese presupuesto ni rendimiento físico. Los cambios repetidos de escena recuperan unos 72,69 MiB. Los reflejos comparten sus atlas con los personajes y no añaden texturas; la caché de poses de las animaciones continúa formando parte del pico. Las mediciones se hicieron con otros visores de revisión abiertos.

La consola, el jugador y el proyector se abrieron contra la compilación ejecutable: selección del Espejo, control de Silverfarben y presentación en proyector correctos, sin errores de consola. `ui-dm-live.png`, `ui-player-live.png` y `ui-projector-live.png` conservan las interfaces reales; la cuadrícula es la preferencia del jugador, independiente de la eliminación de las juntas de textura.

## Comprobación pendiente del usuario

Aprobación artística del relieve, intensidad de reflejos, techo y rotura. En Pixel 9a físico: movimiento, zoom, giros, tocar casillas próximas a paredes y estabilidad térmica. En el proyector y sala reales: contraste, legibilidad de peligros y personajes, brillo del hielo y escucha de la mezcla existente.

Guion: abrir la candidata aislada, elegir Espejo, explorar a 15° y zoom medio con los cinco giros; acercarse a nieve, hielo y bordes del lago; alternar 25°/35° y combate; activar el espejo y preparar el Reflejo; resolver la derrota con los dados de mesa, registrar 0 PG y observar la rotura; caminar por el centro de la galería hasta la cena. Confirmar que el otro jugador conserva su escena y que las opciones del desenlace siguen pendientes de decisión en mesa.
