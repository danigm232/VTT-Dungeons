# Orientación al detenerse · 2026-10-12

Actualización posterior de esta revisión: Trinity y Silverfarben ya no dependen de los ciclos antiguos descritos aquí. Se instalaron nuevos atlas de caminata por rumbo y reposo derivado, incluido el catálogo de un servidor abierto. Véase [PLAYER_LOCOMOTION_AUDIT.md](PLAYER_LOCOMOTION_AUDIT.md) para fuentes, dos espejados explícitos, fase de zancada y límites de la carrera reutilizada. El resto de personajes mantiene el comportamiento documentado abajo.

El servidor ya conserva `facing` al soltar teclado/joystick. El fallo visual era volver a `idle`/`combat-idle` frontales. Ahora el renderer elige reposo orientado según ese rumbo y la cámara actual, tanto en DM como en jugador/proyector. Un giro de cámara cambia la vista del sprite, nunca el rumbo de juego.

La revisión visual encontró las diagonales traseras de Silverfarben espejadas al revés. Se corrigen NE/NW al caminar, al correr y al detenerse, incluso con un catálogo antiguo. Para correr hacia norte, donde el atlas de carrera sólo tenía una espalda diagonal, se adapta el ciclo de espalda recta de caminar con cadencia más rápida; no se presenta como un nuevo ciclo dibujado.

`directional-rest.ts` prioriza los clips `idle-n`, `combat-idle-n`, etc. Si no existe una pose propia, toma un solo fotograma de su caminar orientado, conserva recorte/escala/anclaje/espejado y no copia movimiento procedural. Los clips adaptados se cachean por catálogo y se invalidan si cambia la secuencia de origen. Así se reutilizan los recursos de todos los cuerpos de D8 y de Trinity en Stormwreck. Los asientos, interacciones activas, ataques, caídas y poses especiales de estado mantienen su prioridad.

Compatibilidad con la mesa abierta: al llegar el catálogo de un servidor anterior se conservan sólo las direcciones visuales que éste todavía no conoce. Los clips recibidos siguen teniendo prioridad; no se recuperan acciones eliminadas ni se mezclan diseños cuando cambia la imagen base del token. No hace falta reiniciar la partida para mostrar estas vistas.

## Recursos nuevos

Se han creado con la herramienta integrada `image_gen`, tomando los PNG del proyecto como referencia, cinco atlas RGBA de 1254 × 1254, ocho vistas quietas por atlas:

- `campaigns/stormwreck-isle/public/art/m3/facing-20261012/wizard-rest-v1.png`
- `campaigns/stormwreck-isle/public/art/m3/facing-20261012/cleric-rest-v1.png`
- `campaigns/stormwreck-isle/public/art/m3/facing-20261012/zombie-rest-v1.png`
- `campaigns/stormwreck-isle/public/art/m3/facing-20261012/harpy-rest-v1.png`
- `campaigns/stormwreck-isle/public/art/m3/facing-20261012/ghoul-rest-v1.png`

Los prompts exactos, referencias y destinos están en `SPRITE_FACING_PROMPTS.json`. No se han sustituido los originales. `facing-sprites.ts` recorta mediante límites y semillas de conectividad alfa; elimina fragmentos vecinos sin editar el atlas. Se normaliza contra la silueta aislada para evitar cambios de talla al detenerse.

Estas son vistas quietas, no cuarenta nuevos ciclos de caminar. Los ciclos sur y ataques existentes se conservan; los rumbos sin ciclo usan la imagen orientada al desplazarse. Runara/Tarak/Varnoth/kobolds siguen siendo marcadores de retrato, no sprites corporales, y el bote utiliza su orientación 3D existente.

## Verificación

Prueba visual aislada: `http://127.0.0.1:4598/scripts/facing-review.html`, servida junto a los estados por `node scripts/conditions-preview.mjs`. Permite mantener W/A/S/D combinadas o flechas táctiles, soltarlas y cambiar el giro de cámara; no conecta a la partida ni modifica guardados.

Pruebas automáticas: los ocho rumbos de cada actor D8, parada dentro/fuera de combate, ocho giros de cámara, W → vista de espalda, prioridad de asientos/estados/ataques, integridad de los cinco atlas y continuidad de la altura/oclusión. `audit-facing-atlases.py` es una auditoría sólo de lectura de conectividad alfa.

Resultado: 53 pruebas focalizadas superadas, comprobación de tipos de cliente y compilación de servidor correctas, build de producción de cliente completado. Revisión visual en navegador de Trinity, Silverfarben (incluidas diagonales), Mike y gul. El servidor abierto sirve el cliente nuevo y los PNG, sin reinicio ni modificación de la partida.
