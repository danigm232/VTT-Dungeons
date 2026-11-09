# Retiro del Dragón · perfil costero

Primera muestra posterior a los finales de sendero. El Observatorio tenía un borde continuo demasiado recto en los giros laterales. En Pleamar baja, las rocas y la plataforma intermareal tenían un tono uniforme hasta el agua.

| IDs | Original | Candidata |
| --- | --- | --- |
| `SAL3_Seaward_Cliff_1`, `SAL3_Coastal_Backland_Soil`, `SAL3_Coastal_Backland_Headland`, `SAL3_Weathered_Coastal_Shoulder`, `SAL4_Tidal_Backland_Stone` | Perfil SAL3 de corte continuo | Labio ondulado y relieve bajo en la cara al mar. Desplazamiento compartido entre el borde superior y su pared, a partir de x=163,5 m, más allá del rellano. Conserva los datos de sombreado del GLB para evitar una junta de luz. |
| `SAL4_Cove_Outcrop_1/2` y restantes `SAL4_Cove_Outcrop_*` activos, `SAL4_Intertidal_Cove_Shelf` | Acabado de roca uniforme | Basas extendidas hacia el mar en los dos primeros afloramientos. Banda de roca oscura por color de vértice en las piezas de la cala y el pie del acantilado del Observatorio. |

VTT_AMBIENCE, VA-07/13/15. Propietarios `retreat-shore-rock.ts` y `retreat-refinement.ts`. Fuente de arte propia SAL3/SAL4, con UV, texturas, materiales y normales de origen. Referencia de estudio REF-07 para la separación por masas y el contacto roca-mar. [Biblioteca visual](../design/VISUAL_REFERENCE_LIBRARY.md#ref-07--sea-of-stars)

Se conservan las anclas, las superficies navegables, la altura de apoyo y el agua animada. En el visor se mantuvieron 2296 mallas, 247 materiales, 123 objetos de textura y 23 luces. No se midieron FPS.

Se revisaron seis pares diurnos en el renderer del jugador, a 1280 × 720, inclinación de 25° y giros de −30°, 0° y +30°. Las poses coinciden y no hubo errores registrados. El oleaje conserva su propia fase. Tipos del cliente y diez pruebas dirigidas, incluida una prueba de que la unión del perfil sigue coincidiendo y de que el rellano queda fuera del cambio. En Pleamar, el fondo lejano sigue mostrando cortes poligonales según el giro. Pendientes revisión de usuario, prueba física y activación en la mesa habitual.

[Comparador](../../output/retreat-fixtures-20261106/costa.html) · [Originales y huellas](../../output/retreat-fixtures-20261106/costa-originales.json)
