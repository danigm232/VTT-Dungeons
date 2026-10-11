# Campamentos y descansos · escenas de Stormwreck

## Correcciones visuales V1.4.6

Brasas, luces apagadas de día, fuego sensible a lluvia, leña animada con
Avivar fuego, nieve acumulada y humedad. Sombras compartidas con un mapa
solar/lunar y una fuente cálida cercana, también en perfil compacto.
Los árboles se recortan completos; postes y travesaño se ocultan al entrar
en las tiendas. Entradas orientadas al fuego y río desplazado fuera de las
tiendas, prolongado entre la arboleda y con reflejos de corriente.

La leña es una animación ambiental de un tronco existente: no consume
inventario ni decide el descanso. Acumulación y calor se simulan por cliente;
los objetos, actores y actividades mantienen su persistencia actual.
Registro: `docs/evidence/CAMPS_WEATHER_20261011.md`.

Este paquete fuente aporta cinco escenas de descanso que ahora se integran en la campaña **Los Dragones de la Isla de las Tempestades**. Comparten el roster, el ambiente, el sistema de descanso y el slot de guardado `stormwreck-isle`; no son una campaña aparte. La escena A1 contiene solo sus seis habitaciones; no incorpora el monasterio.

## Escenas

| Escena | Contenido |
| --- | --- |
| Habitaciones A1 | Seis celdas en una sola línea, con entradas abiertas al camino. Las cuatro primeras tienen cama y mobiliario; las dos últimas ofrecen ocho hamacas para los kobolds. Es una representación autónoma, sin el resto del monasterio. |
| Bosque camino a Pleamar | Claro, tres tiendas amplias asignadas a los personajes, arroyo, vegetación y niebla. Dos animales Quaternius CC0 cruzan ocasionalmente la arboleda del fondo; no son tokens ni interactuables. |
| Playa del pecio | Costa rocosa, rompiente, restos y bote; separada del mapa del pecio, con tiendas dentro del abrigo rocoso. |
| Acantilados del Observatorio | Meseta de basalto, tiendas al abrigo de las rocas, fuego, cristales y aurora arcana. |
| Refugio costero de Pleamar | Abrigo rocoso, tiendas, hoguera y pozas; no es B6. |

Los cuatro campamentos exteriores están marcados `VTT_AMBIENCE`: el DM decide si el lugar permite descansar. Esa decisión no se infiere del mapa.

## Uso

Inicia [INICIAR.cmd](../../INICIAR.cmd) y elige **Los Dragones de la Isla de las Tempestades**. En la consola DM, abre «Escena, cámara y mapa» y elige la categoría **Campamentos y descansos**. Los cinco mapas conservan sus límites, movimiento, cuadrícula de 1,5 m, colisiones, tokens y cámaras; cambiar de mapa desde ese selector mueve al grupo a los puntos de aparición de la localización elegida.

El valor heredado `DUNGEONS_CAMPAIGN=camp-rests` se acepta como alias de arranque de Stormwreck. Los guardados antiguos que sigan en `data/saves/camp-rests/` no se borran ni se mezclan automáticamente; el nuevo juego unificado guarda en `data/saves/stormwreck-isle/`.

La consola del DM prepara el descanso, lo avanza por llegada, anochecer, noche y amanecer, registra interrupciones y deja al DM confirmar si termina. No lanza dados, decide encuentros ni restaura puntos de golpe o recursos. Los personajes realizan sus propias interacciones desde el panel «A tu alrededor» al acercarse a camas, tiendas, baúles, objetos personales, hogueras, asientos o puestos de guardia.

En cada campamento exterior, Mike tiene un atril y libro de conjuros, Mia un rincón de oración y Trinity un estuche de herramientas. Sus acciones describen el uso, pero no modifican automáticamente inventario, pruebas, conjuros ni beneficios de descanso. Cada personaje solo puede abrir su propio baúl.

## Entregas y verificación

**V1.3:** escenas navegables, puertas y obstáculos con colisión, puntos interactivos por proximidad y estado del descanso persistente.

**V1.4:** A1 mantiene luz cálida; las escenas exteriores pasan gradualmente de llegada a noche y amanecer. El bosque suma niebla variable, movimiento localizado de copas y helechos, y sombras geométricas ligeras. La playa gana oleaje y espuma más rápidos; el observatorio anima aurora, nubes y destellos; el refugio anima pozas y goteos. Los perfiles de audio existentes se activan al cambiar de escena: bosque nocturno, mar y viento, truenos lejanos y oleaje amortiguado. Si el dispositivo pide movimiento reducido, se apagan los destellos y se atenúan las animaciones.

La fauna del bosque se carga bajo demanda. Ambos animales llegan caminando desde la arboleda exterior, reposan o ramonean y se marchan; usan Walk, Gallop, Idle, Idle_2, Idle_Headlow y Eating. La locomoción empieza antes de hacerse visibles. Sus curvas permanecen fuera del grid con margen de 1,25 m. Procedencia: `public/art/forest-fauna-v1/README.md`.

El decorado agrupa geometría estática y conserva separadas las piezas animadas: la prueba automática exige menos de 144 mallas en A1 y de 208 en exteriores, antes de la fauna cargada bajo demanda. PC usa sombras almacenadas que se renuevan al cambiar una fachada y resplandor a un cuarto de resolución; móvil evita ambos pases. El agua se actualiza a 12/20 Hz según dispositivo. Las partículas tienen capacidad finita y comparten textura; el movimiento reducido atenúa la emisión y desactiva destellos. Los interiores A1 y las tiendas cerradas no dibujan su mobiliario.

Verificación del 7 de octubre: 469/469 pruebas generales y 15/15 de campamentos; tipos cliente/servidor y compilación de producción. Prueba conectada con DM, proyector y tres jugadores: 554 pasos, 38 interacciones, obstáculos, propiedad de baúles, descanso sin beneficios automáticos, guardado y reconexión. Evidencia detallada: [informe](../../docs/evidence/CAMPS_FINAL_20261007.md).

## Componentes y revisión

- `public/outdoor-visuals.ts`: decorado del escenario, rocas, plantas, tiendas, muebles y corte de interiores.
- `public/camp-atmosphere.ts`: partículas, agua y espuma Babylon reutilizables.
- `public/camp-detail-kit.ts`: relieve de materiales, espuma celular, telas con volumen, sendero erosionado y pequeños conjuntos de mobiliario que se agrupan en los lotes existentes.
- `public/art/camp-detail-v1/`: dos recursos nuevos compartidos entre los cinco escenarios; procedencia y especificaciones en su README.
- `engine/client/diorama-kit.ts`: materiales ilustrados, rocas orgánicas, luz y sombras de contacto.
- `public/art/camp-seated-v1/`: variantes sentadas de los personajes existentes, generadas con ImageGen.
- `public/audio/camp-final-v1/`: dos loops originales de goteos y truenos; mezclador Howler existente.

Visor: `node scripts/camps-review-server.mjs` y `http://127.0.0.1:4482/scripts/camps-review.html`.
Galería de capturas: `node scripts/camps-gallery.mjs`.
Prueba conectada reproducible: `node scripts/camps-playability.mjs`, después de compilar el servidor a `dist/camps-final-server` y el cliente a `output/camps-final/web`.
Vista jugable aislada: `node scripts/camps-preview.mjs`, puerto 4485; usa `data/camps-final-preview` y conserva la partida del puerto 3000.

La aceptación artística y la medición en teléfono/proyector físicos corresponden a esos dispositivos. Las cifras de envío de render del visor no son FPS garantizados.

## Pasada de detalle · V1.4.5 · 11 de octubre de 2026

Se mantienen geometría canónica, cuadrícula, colisiones, personajes y actividades.
Los cuatro campamentos exteriores y el detalle de superficie siguen siendo
`VTT_AMBIENCE`; no se conectan lugares nuevos de la aventura.

| Escena | Detalle añadido |
| --- | --- |
| A1 | Estratos y salientes unidos al fondo, cima sellada, roca con relieve, estanterías diferenciadas, camas con tela curva, utensilios, escultura del dragón más detallada y antorchas situadas dentro de cada celda. La celda ocupada recorta además sus laterales y roca adyacente. |
| Bosque | Arboleda de fondo, árboles de distinta silueta, ramas/raíces ligeras, helechos, flores, troncos y hongos exteriores al grid, arroyo de orilla ondulada y sendero de borde difuminado. Se conservan los animales y sus rutas exteriores. |
| Playa | Abrigos de roca menos repetidos, afloramientos de fondo, bote con costillas/bordas/remo/cabos, deriva costera y espuma con huecos transparentes reales. |
| Observatorio | Basalto en grupos de alturas distintas, anillos de estratificación, aurora plegada con bordes difuminados, nubes rápidas y noche más legible. |
| Refugio | Terreno posterior elevado, abrigo de roca con salientes minerales e hiedra, pozas con brillo húmedo, grava somera y ondas/goteos existentes. |

Todas las tiendas reciben costuras, remiendos, tirantes, estacas, cestas,
frascos, cuerdas, mantas y herrajes en los baúles; sus piezas móviles conservan
los pivotes del sistema de interacción. La hoguera añade lenguas de fuego de
partículas y útiles de cocina. La luz interior de cada celda o tienda conserva
su lista exclusiva de superficies.

La cuadrícula de los campamentos usa transparencia real para integrarse con
el suelo; conserva los 1,5 m, las casillas y el control para mostrarla u ocultarla.

Informe y límites de esta revisión: [Campamentos · detalle](../../docs/evidence/CAMPS_DETAIL_20261011.md).
Para sus capturas, usa `CAMPS_REVIEW_OUTPUT=output/camps-detail-20261011`
con los scripts del visor y de la galería. La versión V1.4.5 aparece en las
novedades del siguiente inicio habitual, que recompila el programa.

## Personajes y actividades · revisión del 7 de octubre

Las fichas mantienen su tamaño físico al hacer zoom. Se excluyen los márgenes transparentes al calibrar la altura de las poses y los pies se apoyan en el suelo; al sentarse, la imagen ocupa el banco real, no la casilla de aproximación. Los retratos SVG del Retiro se muestran como marcadores pequeños, no como rostros del tamaño de una persona.

«Detalle» acerca la cámara al personaje y «Conjunto» recupera el encuadre inicial. Ambos controles están en las pantallas del DM y del jugador. El filtrado de los PNG y la resolución del lienzo también se aplican a D8. Los originales pequeños de Mike y Mia siguen limitando el detalle al acercarse mucho.

Acércate al objeto y usa «Interactuar» o la rueda contextual. La hoguera ofrece calentarse, cocinar y avivar el fuego; camas y tiendas permiten preparar el lecho, hacer una pausa y revisar el refugio. Hay vigilancia, asientos, baúles y revisión de equipo. Mike puede leer su libro, Mia orar y Trinity revisar sus herramientas. El DM también puede ejecutar estas acciones desde el punto interactivo, eligiendo un jugador presente y cercano.

Las actividades usan las poses disponibles, gestos procedurales y accesorios animados con profundidad real: libro, utensilios, vapor, brasas, símbolo, herramientas, manta y farol. Caminar, combatir o quedar incapacitado cancela el efecto. Trinity reutiliza sus direcciones existentes en las actividades de pie. No se han generado PNG nuevos ni ocho vistas nuevas de Mike y Mia.

La olla y la hoguera deben estar realmente al alcance; el baúl conserva su estado al revisar el contenido y al llenarse el historial. Las pausas narrativas no completan descansos, recuperan PG ni consumen recursos automáticamente. Informe de esta revisión: [personajes y actividades](../../docs/evidence/ACTORS_CAMPS_AUDIT_20261007.md).
# Reutilización de las animaciones

Las interacciones emparejadas utilizan la biblioteca compartida del motor,
registrando las piezas reales del escenario por función. Un nuevo mapa puede
reutilizarlas conectando sus piezas y contactos, sin recrear sus secuencias.
Guía y límites de la articulación 2,5D:
[Animaciones reutilizables](../../docs/REUSABLE_INTERACTION_ANIMATIONS.md).
