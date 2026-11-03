# Silverfarben · nueve secuencias rehechas

El original aportado por el usuario es la referencia de identidad, no las variantes V3 rechazadas. Se conservan rostro anguloso, cuerpo, proporciones de las piernas, vestuario y libro flotante. No se cambia la altura física de la ficha.

Cada secuencia contiene seis dibujos, no copias de un mismo fotograma. Conjurar conserva cinco ángulos dibujados y tres simetrías; trepar, nadar, arrastrarse y los cinco estados tienen una vista propia cada uno. No son ocho direcciones independientes para todas las acciones.

Los PNG finales están en esta carpeta. [Prompts y procedencia](provenance.json), [fases y configuración de escala](spec.json). Se usó la generación integrada de imágenes, no una API/CLI externa. No son recursos oficiales de D&D ni se les atribuye una licencia CC0.

`scripts/build-silverfarben-v4.py` mide los componentes alfa sin editar los PNG. Rechaza siluetas cortadas, vecinos unidos y poses con píxeles duplicados. Los recortes conservan las semillas del cuerpo/libro y excluyen los fragmentos de otras figuras. La escala es isotrópica y constante por lámina; para los cuerpos horizontales se utiliza una altura anatómica equivalente, no la altura de su caja agachada.

`silverfarben-visuals.ts` aplica las sustituciones al personaje canónico en cualquier mapa, también después de actualizar el catálogo del servidor. No añade personajes ni modifica estadísticas. Se conserva V3 para las acciones no incluidas en esta revisión.

Revisión visual: [/art/silverfarben-v3/review.html](/art/silverfarben-v3/review.html). Aunque mantiene la URL anterior, el filtro inicial muestra las nueve acciones V4. Incluye cámara lenta, pausa, dirección/cámara y recorrido por pose. Es una página aislada: no se conecta a sockets ni modifica la partida.
