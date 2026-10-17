# Combate compartido — 13 de octubre de 2026

## Cambios aplicados

- Barra de previsión inspirada en la referencia de Octopath: máximo siete posiciones en total (turno actual, tres siguientes destacados y tres posteriores más pequeños). Incluye la ronda prevista, repite retratos cuando cruza a otra ronda y conserva el desempate decidido por el DM. Los derrotados no ocupan próximos turnos; el jugador a 0 PG que todavía tiene salvaciones pendientes sí los ocupa.
- La consola del DM y el jugador usan el mismo cálculo de previsión. Los retratos del jugador mantienen la información limitada a lo que ya estaba publicado, con identificadores distintos aunque aparezca la misma persona varias veces.
- La rueda se abre automáticamente una vez al comenzar cada turno propio disponible, después de registrar iniciativa. Presenta directamente las acciones habilitadas, paginadas cuando no caben. No se reabre por cada actualización de red ni interrumpe una tirada pendiente. Se cierra al pasar a otro combatiente.
- Los PJ, PNJ y criaturas derrotados siguen presentes en el mapa, también fuera del combate y al restaurar un guardado. Se conservan los cuerpos de jugadores desconectados/no reclamados; los PNJ ocultos siguen ocultos.
- Remate no mágico contundente o sin armas: inconsciente a **1 PG**, tumbado y con un indicador azulado de inconsciencia, sin sangre. La inmunidad a inconsciencia se respeta. Curar el golpe no letal elimina su origen de inconsciencia, sin eliminar otras condiciones independientes.
- Otros remates, incluidos conjuros: **0 PG**, cuerpo tumbado y mancha de sangre. Para los PJ no se han eliminado las salvaciones contra muerte: la apariencia de caído no declara automáticamente una muerte definitiva.
- En 3D los cuerpos se colocan sobre el suelo, con la mancha debajo y sin la antigua desaparición/transparencia final. En 2D se conserva la pose existente y se usa una postura tumbada de reserva si falta arte. Se reutilizan las ilustraciones disponibles; los dos indicadores de suelo se dibujan y comparten en memoria.
- Un inconsciente a 1 PG no actúa ni se mueve por sí solo, deja de contar como oponente capaz de continuar y permite terminar el combate. Los cuerpos no bloquean el paso de personajes activos. Un cuerpo tampoco vuelve a una silla al acabar el combate.

La regla de remate a 1 PG es una regla propia solicitada para este juego, no una afirmación de que ese sea el resultado estándar de todas las reglas D&D 2024. No cambia el formato del guardado: los estados visuales se reconstruyen desde PG y condiciones/orígenes ya persistidos.

## Comprobación

- Tipado del cliente y compilación del servidor correctos.
- Suite general: **770 pruebas aprobadas en 108 archivos**.
- Después del último ajuste de las sillas: **16 pruebas específicas del cliente aprobadas**, incluida la nueva regresión que comprueba que el cuerpo queda en su casilla sobre el suelo.
- Pruebas del motor: **131 comprobaciones aprobadas** entre los archivos de combate general y Silverfarben; incluyen remates con puños, daga, fuego y Misil mágico, restauración, incapacitación del jugador y paso sobre un cuerpo.
- Integración de combate con servidor real, DM, dos jugadores y proyector: correcta usando `scripts/d8-combat-integration.mjs --combat-only`. Comprueba iniciativa física, tiradas privadas, daño, reintentos y retirada. La aproximación de la prueba ahora respeta también las puertas/objetos del mapa.
- El recorrido completo de ese script, que además prueba clima y aventura, encontró una discrepancia ajena a estos cambios en su expectativa del canal de audio de tormenta durante nieve. No se modificó el clima ni su audio para resolver una tarea de combate.
- Comprobación visual **pendiente**: computer-use detuvo el control de Windows al no poder determinar con seguridad la URL del navegador. No se realizaron más entradas de interfaz después de ese bloqueo y no se presenta una captura antigua como verificación de esta versión.

Las pruebas utilizaron instancias temporales separadas. No se reinició la mesa real ni se alteraron sus guardados. Para ver los cambios en una mesa que ya estaba funcionando con otra compilación, hace falta su reinicio habitual y recargar las consolas.
