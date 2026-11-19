# Estética RPG del DM en Godot — 15/11/2026

Petición del usuario: mejora sustancial de las interfaces y ventanas del DM, con opciones visuales inspiradas en RPG 2.5D e implementación en Godot. La elección del usuario permanece abierta entre tres opciones ya funcionales; Obsidiana es el valor predeterminado, no una aceptación artística inferida.

## Direcciones implementadas

| Opción | Material y lectura | Valores principales |
|---|---|---|
| Obsidiana y latón — recomendada | Fondo oscuro, metal grabado y títulos de aventura | Fondo `#151D21`, acento `#DBB876`, texto `#ECE6D9` |
| Crónica de pergamino | Papel cálido, tinta oscura y márgenes de cuaderno | Fondo `#E7DCC0`, acento `#765025`, texto `#302B24` |
| Atlas astral | Azul de medianoche, plata y cartografía | Fondo `#142236`, acento `#B6D1E7`, texto `#E3EDF5` |

En el juego: **F2 → Ajustes → Aspecto de la consola**. Las tres tarjetas tienen miniatura, nombre, descripción y selección visible. La elección se aplica sin reiniciar el mapa y se guarda en `user://dm-appearance.cfg` de cada prototipo. No modifica preferencias del jugador ni del proyector.

## Cambios reales

- Marcos grabados de nueve parches sobre fondos nativos independientes; títulos serif, botones de 13 px, iconos coherentes, foco/selección/desactivación y controles de desplazamiento/volumen. Los paneles principales reciben material; las tarjetas interiores mantienen superficies tranquilas. Se separan fondo y grabado, y se actualizan los comandos de dibujo después de ordenar los contenedores para evitar ocultar textos y retratos durante un cambio de estilo.
- Escena y combate en la columna izquierda; jugadores y PNJ a la derecha. Se conservan las cuatro disposiciones de visibilidad existentes. No se rehace el sistema de movimiento de ventanas del cliente web.
- Retratos tomados del perfil vigente de cada actor, recortados como bustos de interfaz sin editar el sprite del mundo. PG y CA siguen el estado actual; las barras de PG no sustituyen sus valores numéricos. Las tarjetas se conservan durante los refrescos del reloj; se reconstruyen cuando cambian sus datos, selección o textura de apariencia.
- Las ocho herramientas secundarias del combate se trasladan conservando sus botones y conexiones a una sección plegable, «Gestión del combate». La capa de combate mantiene dados, reacciones, fichas y controles; su presentación compartida se restaura al salir del rol DM.
- El cajón lateral gana título, cierre y prioridad sobre las ventanas mediante el orden de los nodos, conservando el orden normal dentro de los contenedores recortados. Menús, tarjetas de estilo, reloj y meteorología se integran en la familia gráfica. Los avances del reloj mantienen +10 min, +1 h y +8 h.
- Encabezado y dock se ajustan a 1280×720; el encabezado compacto conserva campaña, modo, solicitudes y guardado, dejando el estado del proyector también accesible en la ayuda de escena.

No cambian mapas, cámaras, personajes, colisiones, navegación, equipo ni reglas de combate. Se preservan las ampliaciones recientes de mapas/traslado y sprites de otros chats. El trabajo es sobre Godot: no publica ni sustituye la mesa web.

## Propietarios y registro de arte

Fuente común: `prototypes/godot-shared/dm_style/`. Copias reproducibles en `dm_style/` de `godot-pecio`, `godot-retiro` y `godot-campamentos`, mediante `scripts/build-godot-dm-style.mjs`. Los tres `scripts/vtt_dm_hud.gd` mantienen sus diferencias de campaña; solo se introducen los puntos de conexión y la composición del DM.

| ID / propietario | Estado previo | Candidato | VA / referencia | Aceptación |
|---|---|---|---|---|
| dm.window.frame · palette.gd + art/*-trim.svg | Panel plano verde azulado, borde simple y radio 12 | Fondo nativo y tres grabados transparentes SVG 96×96, margen de textura 24 px, esquinas grabadas y textura lineal sutil; las plantillas originales se conservan | VA-01/03/17 · REF-01, interpretación propia | Integrado; juicio del usuario pendiente |
| dm.typography · appearance.gd | Misma tipografía de interfaz en títulos y acciones | Georgia/Noto Serif para títulos; Segoe UI/Noto Sans para controles; selección visible | VA-01/03/14 | Integrado y revisado en capturas |
| dm.icons.* · icons/*.svg | Símbolos Unicode y emoji de familias distintas | 23 trazados SVG monocromos, con acento por paleta | VA-01/03 | Integrados; originales y hashes en manifest.json |
| dm.style.preview · art/*-preview.svg | Sin opciones visuales | Tres miniaturas propias 160×120, elección aplicada al panel real | VA-17/18 | Funcional; elección del usuario pendiente |
| dm.actor.card · vtt_dm_hud.gd | Nombre, texto de estadísticas y botones juntos | Busto del catálogo actual, PG, CA, barra y fila de acciones | VA-03/14 | Funciones conservadas y verificadas |
| dm.drawer / dm.combat.shelf · appearance.gd + vtt_dm_hud.gd | Cajón tapado por ventanas; ocho botones de combate flotando sobre el mapa | Cajón en primer plano y herramientas plegadas en la ventana de combate | VA-14/17 | Integrado y verificado |

No hay materiales PBR, UV ni roughness nuevos: son controles 2D nativos y vectores escalables. No se aplican filtros globales al mundo. Los recursos son propios o reutilizados del repositorio; no se han descargado imágenes comerciales para el juego.

Fuentes de estudio consultadas: [Octopath Traveler II, presentación HD-2D](https://www.jp.square-enix.com/octopathtraveler2/about/), [sus sistemas](https://www.jp.square-enix.com/octopathtraveler2/system/) y [Sea of Stars, sitio oficial](https://seaofstarsgame.co/). Se toma la intención de una interfaz de aventura con jerarquía y lectura sobre un escenario, como interpretación propia; no se atribuyen a esas obras nuestros marcos, paletas o controles ni se promete reproducir sus interfaces. Se conserva la dirección local de mapas y los contratos M5/M7.

## Evidencia y comprobación

[Galería de las tres opciones](../../output/godot-dm-style-20261115/index.html), con pares antes/después del mismo Pecio, cámara, resolución 1600×900, rol DM, día 1 a las 12:00 y tiempo despejado. Agua, fuego y poses de reposo pueden variar por animación entre capturas; no se presentan como una identidad píxel a píxel. Vista adicional a 1280×720. Se usa `scripts/lib/visual-comparison.mjs`: clic/toque superpuesto, teclado y ampliación conservando el rectángulo.

Originales de las fuentes anteriores del HUD en `output/godot-dm-style-20261115/source-before/`; capturas y registros en las carpetas por prototipo; `originals.json` registra originales, dimensiones, condiciones y SHA-256. Las láminas son renders de Godot Forward+, no conceptos de imagen generativa.

Verificación final: `--headless --path prototypes/godot-{pecio|retiro|campamentos} --script dm_style/test_dm_style.gd`, **63 comprobaciones por prototipo: 189 pasan, cero fallos y cero errores de script en los tres registros finales**. Cubren opciones, persistencia local, restauración y selección por rol, retirada de adornos en diálogos compartidos, retratos, estabilidad durante el refresco del reloj, barras/acciones de PG, cajones, herramientas conservadas y disposiciones. Las 57 comprobaciones de `scripts/test_vtt_interfaces.gd` del Pecio también pasaron durante la sesión; no sustituyen el cierre de las suites propias de esta candidata.

La primera prueba de campamentos intentó una ruta genérica inexistente; el comprobador ya usa su escena A1 real. Durante el cierre entraron dependencias del módulo de jugador/cuadrícula de otro trabajo en paralelo; se repitieron las pruebas tras completarse esa sincronización, sin revertir sus cambios. Los resultados finales se consultan en los registros `test.log` por prototipo. La captura final `pecio/after.log` termina sin errores y contiene las ocho vistas de las tres opciones, ajustes y ventana compacta.

Separación de estados: implementado y comprobado técnicamente; revisión visual realizada con capturas nativas. La aceptación estética del usuario y las pruebas físicas en sus pantallas siguen pendientes. No se certifican FPS sostenidos, red, audio físico ni guardado de campaña a partir de esta mejora de interfaz.
