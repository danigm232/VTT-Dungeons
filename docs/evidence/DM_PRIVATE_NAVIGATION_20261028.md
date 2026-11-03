# Navegación privada y colocación de fichas del DM · 28/10/2026

## Uso

- Arrastrar el mapa sin selección desplaza la cámara. Doble clic selecciona una ficha u objeto; Escape libera la selección.
- Botón derecho sobre un destino abre el menú. Con ficha seleccionada, «Colocar aquí» realiza un traslado directo y reversible con Ctrl+Z.
- El menú ofrece seguimiento local, ficha y estado, ocultar/mostrar PNJ y retirada del combate cuando corresponden.
- «Mirar aquí» entra visualmente en interiores. «Subir/Bajar una planta aquí» recorre superficies superpuestas desde el propio mapa; los accesos permiten explorar su otro extremo sin mover fichas.
- La exploración comienza en privado. La casilla de compartir publica el encuadre y la escena del proyector. El foco espacial compartido conserva también la planta y el interior abierto. Las cámaras personales conservan las reglas previas de orientación compartida y ajustes locales.
- Cambiar de escena para explorar o compartir su vista conserva las ubicaciones reales. Para trasladar personajes se utiliza «Colocar aquí».

## Implementación y límites

El foco de navegación es local, sin entidad añadida a la partida. Alimenta el recorte de cubiertas, habitaciones, tiendas y edificios. Se conservan los controles existentes de giro, inclinación y zoom. La cámara puede atravesar paredes; las puertas reales mantienen su estado.

El servidor autoriza las vistas privadas por sesión DM y permite destinos transitables en cualquier escena o superficie real, sin exigir ruta, turno ni gasto de movimiento. Valida superficies, objetos que bloquean el destino y ocupación antes de modificar la ficha. Cancela pasos, saltos, asientos y recorridos pendientes de la ficha trasladada. Un traslado entre escenas retira al actor de su combate si procede; se espera a resolver una tirada pendiente. Los PNJ ocultos pueden prepararse desde la vista privada sin revelarlos al jugador.

## Verificación

- 87 pruebas aprobadas; informe: `output/dm-navigation-20261028/tests.json`.
- Comprobación de tipos de cliente y compilación de servidor correctas; compilación de producción del cliente correcta.
- Pruebas con dos DM independientes, proyector y jugador: la exploración privada no cambia la escena común ni las ubicaciones; un jugador no puede solicitar una vista DM.
- Traslados de jugador y PNJ entre escenas/plantas, persistencia, destinos inválidos, ocupación y deshacer comprobados.
- Entrada de ratón comprobada: un clic no selecciona; doble clic selecciona; arrastrar no confirma acciones; el botón derecho no cambia la selección.
- Revisión visual aislada del Pecio: arrastre, cubierta inferior, menú contextual y colocación directa de Mike. Revisión adicional del foco de cámara: Mike renderizado, en pantalla y encuadrado alrededor del objetivo esperado.
- Captura del menú: `output/dm-navigation-20261028/context-menu.png`.

## Publicación

Servidor Stormwreck actualizado con cierre y guardado confirmados: PID 13900 → 21964; copia 11344; escena conservada: `dragon-rest`.

Se conservaron posiciones, PG, inventarios, recursos, visibilidad de PNJ y cámara. Las cuatro páginas servidas coinciden con la entrega. Se comprobaron las huellas de 531 archivos fuente. Los tres módulos del servidor sustituidos coincidían con las fuentes previas; el resto de cambios del espacio de trabajo se preservó.

La partida usada para las pruebas y traslados es independiente de la partida de la mesa. El guardado confirmado previo a la actualización y las páginas/módulos anteriores están en `output/dm-navigation-20261028/`.
