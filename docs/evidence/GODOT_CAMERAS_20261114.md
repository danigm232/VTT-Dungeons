# Cámaras VTT en Godot — 14/11/2026

Encargo: aplicar la cámara acordada a los proyectos Godot y publicar el resultado en GitHub. Esta ficha registra la candidata funcional; el orden global sigue en ROADMAP_V1.md. Se reutilizan los mapas actuales y sus recortes, sin reconstruir su arte ni modificar las colisiones.

## Comportamiento implementado

- Proyección ortográfica en Pecio y Retiro, incluidas las tres escenas conectadas del Retiro. Q/E recorre pasos suaves de 15° con límite relativo de ±30°. El Retiro mira de frente al acantilado a 0°. Pecio conserva los frentes propios de C4/C5 (+45°) y C6/C7 (−45°), con el mismo margen relativo.
- Vertical continuo entre 5° y 25°. F baja y R sube: toque al siguiente hito de 5°; mantener barre a 10°/s tras 180 ms y pausa 120 ms en cada hito. Se puede soltar entre hitos. Inicio restablece la vista.
- Dos dedos sobre el mapa: desplazamiento horizontal para órbita, vertical para inclinación y pellizco para zoom. El eje queda fijado durante el gesto; se espera al par de dedos antes de distinguir giro de pellizco.
- El ángulo manual se conserva mientras siga en interior o exterior. Solo el cruce de frontera usa interior 10° / exterior 25°. Ese cruce no modifica el zoom. Las preferencias guardan grados fraccionarios, giro y zoom por rol y archivo de escena.
- WASD y joystick mantienen los ejes del mapa al orbitar; caminar no restablece el ángulo. Proyector no acepta movimiento de personajes. En DM solo la ficha seleccionada acepta teclado.
- Modos Fija, Por zonas y Seguir en DM y opciones del jugador. El seguimiento amortigua el foco; la protección de encuadre mantiene el sprite visible sin variar zoom o inclinación. La navegación tiene límites por mapa, y el encuadre puede desplazarse lo necesario para conservar al personaje.
- Límites manuales de zoom: Pecio 5,5–56; camarotes 5,5–24; C8/C9 7–32; cofa 5,5–20. Retiro 6–90 fuera y 6–36 dentro. Son unidades internas de escala ortográfica, no metros de distancia al personaje. La panorámica calcula su encuadre según escena, ángulo y proporción de pantalla.
- Combate guarda/restaura el encuadre y el modo anterior de cada rol, incluso si termina desde otro rol.

## Exploración DM e interfaces

Arrastrar el mapa sin selección mueve un ancla privada, sin mover personajes. Doble clic selecciona una ficha u objeto; Escape deselecciona. Botón derecho abre acciones contextuales: Colocar aquí, Seguir ficha, Mostrar/ocultar ficha, Mirar aquí/entrar, subir/bajar planta y deshacer traslado. La colocación consulta las colisiones y rechaza destinos ocupados; no interrumpe una transición animada. Ctrl+Z deshace la posición.

La cámara puede atravesar paredes al explorar: no utiliza el cuerpo del personaje como sonda. Pecio sigue usando RoofCutout sobre el objetivo de cámara; Retiro reutiliza el cutaway ya exportado en sus GLB. No se añadió un recorte basado en nombres inexistentes de techos ni se ocultaron habitaciones completas.

Los cuatro botones de giro/inclinación están juntos en la consola. El panel queda delante de las ventanas flotantes, con fondo opaco y sin desplazamiento horizontal. G conserva el control del cabrestante del Retiro.

**Compartir cámara con la mesa** incluye foco, giro, inclinación y zoom en la previsualización local F3. Cada rol conserva su vista privada al cambiar entre F1/F2/F3. **No hay transporte de cámara entre dispositivos ni integración con el guardado de campaña del servidor web.** Abrir dos procesos no demuestra sincronización de partida. La prueba física de móvil/proyector y la integración de red siguen pendientes.

## Implementación y recursos

La política común está en scripts/vtt_camera_base.gd, idéntica en ambos proyectos. tactical_camera.gd aporta geometría/frentes/zonas de cada mapa; vtt_map_interaction.gd aporta navegación y colocación DM. Se actualizaron HUD, entrada de fichas y el callback antiguo de escaleras del Pecio.

Corrección de importación, sin cambio de píxeles: a1-cliff-rugged-v8.png contenía un JPEG. Se referencia como a1-cliff-rugged-v8.jpg y se corrige el exportador. Original, recurso y fuente JPG comparten SHA-256 7ba450a28ae54a1371e96b7afe94ab41858b727f01135103c6a21fb4acf53aa0. No se genera arte nuevo ni se declaran licencias nuevas.

## Verificación de esta candidata

Motor Godot 4.7.2. Importación desde cero de ambos proyectos. Suites ejecutadas sobre la copia concreta que se publica:

| Proyecto | Suite | Resultado |
| --- | --- | --- |
| Ambos | test_camera_contract.gd | 49/49 por proyecto |
| Pecio | test_vtt_interfaces.gd | 43/43, incluye botones y casilla |
| Pecio | test_babylon_camera_parity.gd | 6/6 grupos |
| Pecio | test_character_animations.gd | personajes y animaciones |
| Pecio | test_doors_alignment.gd | cuatro puertas |
| Pecio | test_pecio_integrity.gd | integridad física/escénica |
| Retiro | test_retreat_layout.gd | 136/136 |
| Retiro | test_map_exits.gd | 60/60 |

La prueba de salidas tenía un nombre de indicador antiguo y esperaba orientaciones/fundidos con supuestos obsoletos. Se actualizó al nodo y dirección de salida reales y a esperar la transición completa; no se cambió el recorrido para hacer pasar la prueba.

Capturas integradas Forward+ en NVIDIA MX350, 1280×720, de ambos proyectos a 25°, 5°, interior 10° y consola 12,7°. Son vistas de funcionamiento actual, no una comparativa artística antes/después. Originales y registros: output/godot-cameras-20261114/. Copias de revisión: [Pecio 5°](captures/godot-cameras-20261114/pecio-player-5.png), [consola Pecio](captures/godot-cameras-20261114/pecio-dm-controls.png), [Retiro 5°](captures/godot-cameras-20261114/retiro-player-5.png), [interior Retiro](captures/godot-cameras-20261114/retiro-dm-interior.png).

Reproducir desde cada proyecto con Godot: godot --headless --path . --script res://scripts/test_camera_contract.gd. Para capturas: godot --path . --script res://scripts/capture_camera_contract.gd. Las pruebas táctiles sintetizan eventos del motor; no sustituyen una prueba física en móvil.

## Alcance de publicación

Los dos prototipos todavía no estaban versionados. La entrega incluye su base jugable necesaria (escenas, scripts, shaders y recursos), los controles de cámara y lanzadores. Se excluyen cachés .godot, runtime, guardados, salidas locales y las pantallas de carga que otro trabajo desarrolla en paralelo. La copia publicada arranca directamente en scenes/main.tscn. El espacio de trabajo compartido conserva intacta la integración de carga en curso. No se publica el cambio ajeno de engine/client/wreck-ocean.ts ni se modifica la mesa web del puerto 3000.
