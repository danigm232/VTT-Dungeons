# Espejo · bruma, sonido y recorrido de salida — 21/10/2026

Refinamiento de la candidata existente, iniciado el 20/10. Alcance: bruma baja legible, ambiente de caverna con gotas espaciadas, avance visible por la galería y revisión de cámara. Se conservan las fases E0–E6 y las referencias anteriores; esta entrega no las presenta como pruebas físicas aprobadas ni vuelve a acreditar su sesión prolongada.

## Resultado

La máscara de bruma anterior tenía poca intensidad y contraste, y su plano vertical se leía mal con distintas inclinaciones. Ahora cada bolsa combina un plano bajo y otro horizontal, con bordes suaves y variación orgánica. Hay tres bolsas exteriores al túnel y una cuarta dentro de la galería abierta. En pantalla pequeña se eligen las dos bolsas **disponibles** más cercanas al personaje: la del túnel sellado no puede consumir uno de esos puestos. El combate reduce la intensidad; movimiento reducido inmoviliza la deriva. No se altera el suelo físico ni la lectura de peligros.

Audio original sintetizado en el proyecto: aire interior grave de 34,5 s en bucle, dos gotas con eco corto y un asentamiento de hielo. Música predeterminada a 0,13 y aire a 0,14; gotas a 0,14–0,16, crujido a 0,085. Una incidencia cada **32–58 s**, con selección ponderada 5:1 entre gotas y crujido; no significa que cada intervalo produzca necesariamente una gota. Se suspenden nuevas incidencias durante combate, activación, salida, silencio, desconexión y cambio de mapa. Se conserva el mezclador y la salida de audio elegida por la mesa. Procedencia, síntesis y medidas en `campaigns/one-shot/public/audio/d8-night/mirror-cave-v1/` y créditos del proyecto; sin muestras externas.

Tras derrotar al Reflejo y cruzar el umbral, el servidor mantiene al personaje en `mirror` durante **5 s**, con un recorrido público de seis puntos que cubre cinco casillas de 1,5 m. El cliente interpola esos 7,5 m hacia el fondo, mantiene un plano desde la embocadura y reduce la luz del personaje al entrar. Después llega a `dinner`. El giro temporal de salida no sobrescribe preferencias de cámara. No se añaden casillas tácticas al túnel, reglas, tiradas ni decisiones narrativas. El sello volumétrico, su rotura y su condición de apertura se conservan.

La cámara del Espejo usa una envolvente corporal estable, evitando correcciones pequeñas por la silueta de cada fotograma del atlas. Incluye 0,18 m bajo la posición lógica del pie: tres muestras iniciales dejaban el pie unos 0,73 px fuera de pantalla al seguir un borde; la repetición final tiene cero pérdidas. También se corrige la apertura de una mesa vacía: no intenta calcular el encuadre de refugio desde un personaje inexistente. El resto de mapas y el perfil continuo actual 5°–25°, giros ±30° y preferencias existentes se conservan. Referencia artística: 15° y zoom medio.

## Verificación nueva

- **52 pruebas en 11 archivos**, sin fallos: salida, navegación, presentación, geometría del sello, paquete, audio, recorrido compartido y cámara. La prueba extensa de límites de cámara agotó tiempo al ejecutarse junto a otras tareas pesadas; repetida por separado pasó sin cambiar expectativas. Resultados finales en `tests.json` (46) y `tests-camera.json` (6).
- Tipos de cliente y compilaciones aisladas de cliente/servidor correctos. Las advertencias de empaquetado de Babylon siguen registradas; no son una certificación de rendimiento.
- **160 vistas**: ocho posiciones seguras × inclinaciones 5°/10°/15°/25° × cinco giros −30°/−15°/0°/+15°/+30°. Todas listas, jugador visible/renderizado y cero errores.
- **413 estados de movimiento del servidor**, grabación de 33,49 s y 252 muestras de cámara: cero pérdidas del jugador, recursos pendientes o errores. Cambios de giro e inclinación incluidos. Las pausas de escritura de capturas se retiraron del bucle de grabación de la salida.
- Cuatro horas de luz y doce combinaciones de tamaño/rol: **16 perfiles**, todos listos. Móvil vertical 390×844 y horizontal 844×390 conservan dos bolsas, cuatro mallas de bruma. Son simulaciones del navegador.
- Salida grabada con posiciones z de −10,401 / −11,925 / −13,485 / −15,0405 / −16,5 m, una muestra por segundo; jugador visible y encuadre estable. Grietas, fragmentos, abertura y cena verificados con estados del servidor.
- Integración real aislada con DM, dos jugadores y proyector: mismo reloj de salida en todos, reconexión a mitad de marcha sin reiniciarla, segundo jugador independiente, guardado/restauración e historial/reinicio correctos. Un guardado duradero a mitad de recorrido restaura al personaje en el umbral seguro sin reproducción automática; la reconexión a una sesión viva conserva el reloj original.
- Grabación real de **70 s** del mezclador del navegador, contexto desbloqueado: una gota a los **57,756 s**, ganancia 0,16 y cero errores. Comprueba reproducción/programación; no acredita escucha física.
- Mesa integrada: apertura del Espejo sin jugadores, asignación de Maria, movimiento y giro en la interfaz del jugador revisados visualmente. DM/jugador/proyector cargan y se han capturado en `integrated-dm.png`, `integrated-player.png` e `integrated-projector.png`; sin errores de consola nuevos en estas vistas. No se usan guardados reales para estas acciones.
- Conservadas **399 casillas, 344 difíciles y 49 peligrosas**, coordenadas, estadísticas, inventarios e interacciones. Dados y decisiones siguen en mesa.

## Coste y límites

Tres regresos café–Espejo idénticos: **604 mallas, 60 texturas, 73,1043 MiB estimados y 133 llamadas de dibujo**. Los doce perfiles medidos registran 130–298 llamadas y 69,33–83,97 MiB. La muestra de 1080p todavía supera el presupuesto orientativo de 80 MiB. Estas cifras no representan memoria total de GPU ni FPS físicos; tampoco garantizan un pico máximo durante todas las animaciones.

Esta revisión es enfocada. No repite la sesión automatizada de veinte minutos de la candidata `icepass`, ni la acredita como nueva. Pendientes: aprobación artística del usuario, escucha junto a voces en el altavoz elegido, Pixel 9a/proyector físicos, fluidez sostenida y memoria en el equipo objetivo.

Guion físico: explorar a 15° y zoom medio; recorrer entrada/orillas/reliquia y girar ±30° sin perder al personaje; comprobar bruma tenue y localizada en móvil; conversar durante dos minutos con audio y comprobar que las gotas no molesten; derrotar al Reflejo con el flujo habitual, cruzar el umbral y observar cinco pasos antes de la cena; repetir con reconexión y comprobar el audio en el dispositivo asignado. No se considera aprobado hasta que el usuario lo confirme.

## Abrir y reproducir

- Mesa temporal: `http://127.0.0.1:59950/dm`, `/player`, `/projector`. Datos exclusivos en `C:\Users\User\AppData\Local\Temp\dungeons-review-hkUFxI`.
- Galería con comparativas, audio y vídeos: `http://127.0.0.1:4603/gallery/`.
- Ejecutable aislado: `runtime/d8-mirror-immersive-20261020/{server,web}`. Evidencia y base anterior: `output/d8-mirror-immersive-20261020/`, incluida carpeta `before/`.
- Reiniciar una candidata: `./scripts/review-d8-mirror.ps1`; usa `-Version immersive` por defecto. `-Build` recompila sólo su carpeta aislada. Conserva las versiones `atmosphere`, `icepass`, `artpass`, `refinement` y `candidate`.
- Regenerar datos de salida: `node node_modules/tsx/dist/cli.mjs scripts/d8-mirror-icepass-fixtures.ts --output=output/d8-mirror-immersive-20261020`.
- Verificar evidencia y generar resumen con hashes/galería: `node scripts/d8-mirror-immersive-report.mjs`.

No se ha sustituido `dist`, alterado guardados reales, detenido el servidor habitual ni publicado en GitHub. Se conservan los cambios de otros chats, incluidos Cena, Retiro, cámara y personajes.
