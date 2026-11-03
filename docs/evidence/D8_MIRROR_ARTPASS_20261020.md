# Espejo D8 · diez puntos de acabado · 20/10/2026

Revisión de la segunda candidata a partir de los diez puntos y cinco imágenes del usuario. Solo cambia la presentación de `mirror`. No se reinician las mesas de los puertos 3000, 58748 o 59822 ni se usan sus guardados. Sin subagentes, cambio de modelo del agente ni publicación en GitHub.

## Resultado por punto

1. **Suelo:** malla de relieve suave, máscaras espaciales de nieve/hielo pulido, abrasión, fracturas finas y acumulación contra paredes. La cota máxima del terreno transitable es 0,015 m; los pies permanecen a 0,045 m. El área del lago conserva sus superficies y peligros, por encima del nuevo terreno hundido.
2. **Profundidad:** contrafuertes contra la pared trasera, velos de bruma y costillas sucesivas dentro de la galería.
3. **Primer plano:** grupos de roca, bordes de hielo y carámbanos, colocados fuera del perímetro transitable. Los obstáculos nuevos participan en la atenuación por triángulos.
4. **Espejo:** incrustación ritual helada baja, grabados, fracturas perladas, collar de escarcha, halo y caída de luz. Se conserva el pedestal dibujado en el PNG; no vuelve el cilindro duplicado.
5. **Composición:** franjas de hielo pulido alrededor del lago y masas laterales que distinguen bordes y espacios. Es decoración; no propone casillas nuevas ni modifica alturas de navegación.
6. **Luz:** rebote frío en hielo, contribución desde la galería, foco de la reliquia, sombras de contacto suaves y tono local sobre personajes. No se cambian pies ni animaciones.
7. **Ambiente:** nieve fina y motas, escarcha ramificada y fragmentos pequeños. Menos partículas en el perfil móvil y durante combate; se retiran las partículas grandes anteriores.
8. **Silueta:** la franja plana del techo se sustituye por una bóveda con volumen, fracturas y dientes de hielo. Paredes continuas altas, caras cristalinas laterales y borde irregular de una sola galería. El interior usa materiales progresivamente oscuros.
9. **Narrativa visual:** marcas perladas/violáceas, pequeños restos rituales y motas cerca de la reliquia. Al resolverse la escena se apaga su resplandor. No se añaden objetos interactuables, reglas, tiradas ni resultados narrativos automáticos.
10. **Acabado conjunto:** gradación vertical de sombra en paredes, techo más oscuro, detalle de albedo del suelo, bruma de fondo, foco de luz y viñeta leve desactivada en combate. No se aplica desenfoque global al tablero. El ajuste de imagen se restaura al salir de la escena.

`playground/mirror-art-direction.ts` organiza este pase y su limpieza; `mirror-environment.ts` mantiene las secuencias y la oclusión. El paquete Playground incorpora el módulo nuevo. Las dos texturas originales de `imagegen`, sus exportaciones de menor resolución y los prompts exactos están en `campaigns/one-shot/public/art/materials/mirror/README.md`. Las referencias aportadas son dirección artística y no se incorporan como fondos.

## Ejecución y evidencia

`./scripts/review-d8-mirror.ps1` abre ahora esta candidata por defecto, en puerto libre y carpeta temporal. `-Version refinement` y `-Version candidate` conservan las revisiones anteriores; `-Build` reconstruye. Compilaciones en `runtime/d8-mirror-artpass-20261019/{server,web}`. La sesión de esta revisión es `http://127.0.0.1:57177/dm`, con datos temporales en `dungeons-review-4lGDUI`.

La galería es `http://127.0.0.1:4598/gallery/`; el visor real, `/candidate/`. Se reproduce con `node scripts/d8-mirror-review-server.mjs --runtime=runtime/d8-mirror-artpass-20261019 --evidence=output/d8-mirror-artpass-20261019 --port=4598`. Añadir `--build --stage=candidate` reconstruye el visor.

Cada punto tiene cuatro capturas, un JSON de disponibilidad sin errores, una copia del módulo y una compilación independiente `p01`–`p10`. Las tres vistas de exploración usan 15°, giro 0° y zoom 2; la general usa zoom 1. Los paquetes compilados conservan cada resultado ejecutable. La candidata final añade la optimización de memoria posterior al punto 10; sus capturas son `candidate-*`.

La base anterior a los diez puntos está en `baseline-*`, `before-source/` y `before.patch`. No se sobrescriben las evidencias originales de la auditoría ni de las candidatas previas. `scripts/d8-mirror-artpass-report.mjs` comprueba los resultados finales y genera la galería con comparaciones, vídeos y hashes de fuentes/compilaciones.

## Validación

- `regression-tests-final.txt`: 78/78 pruebas en 15 archivos. `package-final.txt` confirma además el paquete generado después de exportar los materiales optimizados. Tipos cliente y compilaciones TypeScript/Vite aisladas correctas.
- `navigation-final.txt` y `gameplay-invariants.json`: 399 casillas transitables, 139 añadidas en la revisión anterior, 344 difíciles y 49 peligrosas; origen, direcciones anteriores, props, spawns y guardado/restauración conservados. Ocho rutas seguras, con separación mínima al contorno base de pared de 1,278 m.
- `network-tests-final.txt`: DM, dos jugadores y proyector; tiradas manuales/privadas, idempotencia, única transformación/aparición, reconexión sin repetición, restauración, historial y autoload PASS.
- `candidate-matrix.json`: 120 vistas, ocho posiciones × cinco giros × tres inclinaciones; recursos listos y cero errores.
- `fresh-extras.json`: cuatro horarios y doce combinaciones de rol/tamaño, todas listas. Memoria estimada de texturas: 68,13 MiB en tamaños móviles, 71,62 MiB a 720p y 78,40 MiB a 1080p. La exportación de materiales reduce 13,33 MiB frente al primer intento.
- `candidate-extras.json`, después de la secuencia: pico estimado de 137,65 MiB. Ese pico sigue excediendo el guardarraíl de 80 MiB; no se declara aprobado el presupuesto transitorio. Entre 122 y 359 llamadas de dibujo en los perfiles: el máximo supera ligeramente el guardarraíl de 350. La mejora visible y el coste quedan documentados para revisión en el dispositivo objetivo.
- Las mediciones usan 24 redibujados calientes con espera de GPU. No representan FPS sostenidos ni memoria total del controlador. GPU de revisión: Intel UHD mediante ANGLE; no es el Pixel físico ni una certificación del equipo/proyector de juego.
- `ui-player-390-844.jpg`, `ui-player-detail-390-844.jpg`, `ui-player-844-390.jpg`, `ui-projector-1920-1080.jpg` y `ui-dm-final.jpg` documentan las páginas ejecutables. Se prueban selección de personaje, detalle, configuración y cuadrícula; el DM puede compartir el encuadre completo con el proyector.

- `candidate-soak.json`: sesión automatizada de 20,15 minutos, incluidas secuencia, matriz y perfiles, con catorce idas/vueltas café–Espejo. Cero errores; todas las muestras de navegación en estado visible. Memoria de las muestras repetidas entre 72,34 y 72,35 MiB. No sustituye veinte minutos de juego físico.
- `candidate-cleanup.json`: tres regresos, todos con 553 mallas, 57 texturas y 69,94 MiB estimados, sin crecimiento. `candidate-walk.json`: 387 estados autoritativos y 31,739 s de movimiento del servidor, sin daño; la grabación dura más por el coste de captura. Ambos vídeos se han reproducido en la galería; no se declara escucha física.

`acceptance-summary.json` valida los resultados y conserva hashes de fuentes y paquetes compilados. Los datos históricos de veinte minutos anteriores no se atribuyen a este pase.

## Aceptación pendiente del usuario

Revisión artística del suelo, la bóveda, el foco del espejo, la cavidad y la transparencia. Movimiento y gestos en Pixel 9a físico, legibilidad en el proyector real, brillo/contraste de la sala y escucha física. Repetir la sesión con el equipo de juego para medir FPS, estabilidad y el pico de memoria después de animaciones. La candidata es ejecutable; estas comprobaciones y la aprobación artística no se dan por realizadas mediante capturas o simulación de tamaño.
