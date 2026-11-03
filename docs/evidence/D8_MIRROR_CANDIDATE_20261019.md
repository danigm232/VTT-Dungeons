# Espejo D8 · candidata E0–E6 · 19/10/2026

Alcance: presentación de `mirror`, sobre el estado local existente. No publicación ni cambios de reglas. Aprobación artística y aceptación en dispositivos físicos **pendientes**. La auditoría del 18/10 y sus referencias se conservan intactas.

## Abrir y reproducir

Desde la raíz del proyecto: `./scripts/review-d8-mirror.ps1`. Si hay que reconstruir: `./scripts/review-d8-mirror.ps1 -Build`. El lanzador usa exclusivamente `runtime/d8-mirror-candidate/{server,web}`, un puerto libre de loopback y una carpeta temporal nueva de guardados. Imprime los enlaces DM, jugador y proyector; `quit` cierra esa sesión. Elegir el Espejo desde DM y Maria desde jugador. No utiliza `dist`, puerto 3000 ni guardados reales.

El visor de pruebas se construye con `node scripts/d8-mirror-review-server.mjs --build --stage=candidate` y se sirve con `node scripts/d8-mirror-review-server.mjs`, en `http://127.0.0.1:4596/candidate/`. Los botones generan evidencias en [carpeta de resultados](../../output/d8-mirror-candidate-20261018/). La [galería comparativa](../../output/d8-mirror-candidate-20261018/index.html) conserva los encuadres equivalentes de la base y de la candidata.

## Fases ejecutadas

| Fase | Implementación y comprobación |
| --- | --- |
| E0 | Estado previo y diff preservados; hashes y recorridos obtenidos con `GameState`. 260 casillas, 205 difíciles, 49 peligrosas, celdas de 1,5 m. Cinco puntos seguros y 75 vistas iniciales; base de 44 pruebas/9 archivos correcta. Aclarado el manual: las placas del lago pertenecen al conjunto peligroso vigente. |
| E1 | Envolvente rocosa, galerías, estratos lejanos y masas de primer plano fuera del rectángulo táctico. Atenuación mediante segmentos ortográficos finitos hacia actores, interacción y suelo próximo; transición gradual con retención de 240 ms. Cinco posiciones funcionales. |
| E2 | Roca estratificada, nieve agrupada, hielo fracturado y prismas oblicuos. Espejo ornamentado a partir del PNG local, con pie y activación propia. Suelo y prolongación exterior comparten material. No se desplaza la interacción lógica ni el lago. Cinco posiciones funcionales. |
| E3 | Luz principal de reliquia y contribución de entrada; relleno interior estable. Tinte local opcional de personajes, conservando pies, atlas, estados y escala; contacto nativo. Cinco posiciones funcionales y pruebas de billboards. |
| E4 | Bruma localizada, partículas limitadas, resplandor selectivo y tres niveles de detalle según resolución. Tablero siempre nítido; no se añade profundidad de campo dinámica. Medición de perfiles y cuatro estados horarios. |
| E5 | Identificador/tiempo de servidor compartidos por luz, aparición y sonido. Descarte de duplicados y eventos caducados. El Reflejo solo aparece si existe en el estado público; el desplazamiento de aparición es visual. Mezcla inicial menos intensa y atenuación de música/viento durante 1,1 s; restauración de los niveles actuales del DM. |
| E6 | Compilación cliente/servidor aislada, regresiones, cuatro clientes por socket, guardado/restauración, reconexión, vídeo, matriz y sesión prolongada. Interfaces reales revisadas por separado del visor. La parte física y la aprobación artística siguen pendientes. |

Las cinco comprobaciones por fase están en `e1-phase.json` … `e5-phase.json`. Los materiales, luces, partículas y texturas del Espejo se gestionan en `mirror-environment.ts` y se limpian al abandonar la escena. La integración compartida de tintado es opcional y solo se activa en este mapa.

## Evidencia técnica y límites

- `e0.json`, `safe-snapshots.json` y `gameplay-invariants.json`: mismo contrato táctico, identidad del Reflejo y round trip durable exacto con reloj fijado. Las estadísticas e inventarios siguen en el servidor; no se automatizan dados ni decisiones.
- `e0-tests.txt`: 44/44. `e6-tests.txt`: 74/74 en 13 archivos. `final-targeted-tests.txt`: 10/10, incluidos empaquetado exacto, secuencia y mezcla. Tipos cliente y build servidor correctos; Vite produce la candidata aislada.
- `network-tests.txt`: resultado de integración con DM, dos jugadores y proyector; iniciativa y tiradas manuales, reintentos idempotentes, aparición con identidad única, reconexión sin repetición, restauración del mundo/propietarios y reinicio con autoload.
- `candidate-matrix.json`: 75 vistas, cinco posiciones × cinco giros × tres inclinaciones; 1280×720, zoom 2. Se exige escena `mirror`, recursos listos y ausencia de errores. `candidate-extras.json`: cuatro horas y 12 combinaciones de tamaño/rol. Los roles del visor no sustituyen las capturas de las páginas reales `ui-*`.
- `candidate-presentation.webm`: presentación de activación, aparición, giro, ataque y caída. Es una reproducción visual con estados públicos y animaciones nativas; la autoridad de las acciones se comprueba por red. `candidate-walk.webm`: recorrido continuo de 104 snapshots de servidor, sin daño; no son teletransportes de cámara a casillas letales.
- `candidate-soak.json`: 20,47 minutos transcurridos, tres idas/vueltas café–Espejo, cero errores registrados. En las tres muestras de regreso: 393 mallas, 45 texturas y 58,56 MiB estimados, sin crecimiento entre muestras. Incluye tiempo de capturas/carga y posibles pausas de ejecución; **no acredita veinte minutos de juego físico continuo ni FPS sostenidos**. La última corrección de material exterior no añade recursos y se verifica con matriz y páginas finales.
- Las mediciones forzadas de GPU son 24 muestras calientes por caso, no FPS de juego. Intel UHD mediante ANGLE/D3D11. El primer ensayo tras secuencias registró 49–260 dibujos y 98,82–111,49 MiB de texturas; el pico transitorio de atlas/animaciones supera el guardarraíl de 80 MiB. Tras cambiar de escena vuelve a 58,56 MiB. No se oculta este límite; los perfiles finales frescos se conservan en `candidate-extras.json`.

La repetición final en sesión limpia (19/10, 17:39) pasó las 16 combinaciones sin errores y con recursos listos. Estimación de texturas: 54,79 MiB en tamaños móviles, 59,10 MiB a 1280×720 y 67,46 MiB a 1920×1080; 49–260 llamadas de dibujo. Medianas de captura forzada 7–13,7 ms, percentiles 95 de 9,7–30,9 ms, sin extrapolación a FPS sostenidos. El ensayo previo tras secuencias se conserva en `sequence-warm-extras.json`. La captura real del proyector usa ventana solicitada de 1920×1080 pero viewport DOM 2133×1200 por escalado; las medidas exactas de 1080p pertenecen al visor. Ambos vídeos se reprodujeron en la galería; no incluyen validación auditiva.

Durante E6 se detectó y corrigió un shader de lluvia duplicado al asignar/reconectar personaje: el Espejo, completamente cubierto, ya no instala esa capa exterior. El resto de mapas conserva su tratamiento. La compilación real de las tres interfaces es necesaria para detectar este caso; el visor estático por sí solo no lo encontraba.

El primer ensayo E6 mezcló épocas de snapshots: el cliente rechazaba volver del café al Espejo. Sus archivos están en `invalid-first-e6/` y **no constituyen aceptación**. El arnés ahora reescribe épocas monótonas, comprueba aceptación y verifica el identificador de escena. No se cambió el filtro de seguridad del cliente.

Se actualizaron expectativas obsoletas del ensayo de integración frente al código ya existente en HEAD: nieve con viento frío, horario convertido a reloj automático, puerta del café abierta antes de cruzarla, lectura del guardado temporal al haberse retirado la exportación HTTP y cinco entradas de historial. No se modificaron esos comportamientos de producción para lograr un resultado verde.

## Aceptación física y artística pendiente

1. Abrir una sesión de ensayo nueva; elegir Maria y Espejo. A 15° y zoom medio revisar llegada, orillas, reliquia y encuentro con los cinco giros. Aprobar composición, escala, densidad, materiales, contraste y cercanía al lenguaje HD-2D. Esta entrega no se declara equivalente al acabado de Octopath.
2. Pixel 9a físico en vertical/horizontal: movimiento, selección, interacción, cuadrícula y menú; comprobar que el primer plano no tapa casillas/actores y que los controles no invaden objetivos. Repetir con brillo reducido. Las imágenes de 390×844/844×390 son simulaciones de tamaño.
3. PC y proyector reales a 1080p: distinguir hielo/nieve con imagen lavada y poco color. La galería ofrece filtros de comparación orientativos, sin sustituir el proyector.
4. Desbloquear audio con gesto del usuario. Escuchar música, aire frío, pasos y quiebre mientras hablan los jugadores. Comprobar salida efectiva del proyector, silencios, atenuación y ausencia de duplicados en móviles. No se ha realizado escucha física.
5. Activar el espejo y resolver la escena con dados/decisiones en mesa; observar transición, ataque, caída y resolución. Reconectar jugador/proyector y cargar un punto guardado sin repetir efectos. Hacer veinte minutos continuos de juego en el equipo de destino, cambiar varias veces de mapa y registrar fluidez, memoria y carga fría/caliente.

La aprobación técnica automatizada y la aprobación artística/física se registran por separado. Queda pendiente validar el presupuesto transitorio de memoria en el Pixel y la legibilidad final bajo proyección.
