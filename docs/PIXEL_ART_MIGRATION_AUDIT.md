# Auditoría visual y plan de migración — Pixel art táctico

**ANTECEDENTE SUPERADO (2026-09-13).** La auditoría de Astra detectó errores en este borrador: la Alpha no está aceptada, la privacidad no está completamente resuelta y redondear el movimiento libre sólo al dibujar no cumple la petición de casillas. Aplicar [TACTICAL_PIXEL_SPEC.md](TACTICAL_PIXEL_SPEC.md), [ACCEPTANCE_RESULTS.md](ACCEPTANCE_RESULTS.md) y [NEXT_MODEL_PROMPT.md](NEXT_MODEL_PROMPT.md). Las recomendaciones de conservar protocolo, movimiento continuo y runtime sin correcciones NO son decisiones vigentes.

Fecha: 2026-09-12  
Estado: auditoría preparatoria para el siguiente bloque de Astra.  
Alcance: adaptar la presentación de Alpha 0.1 a la referencia visual entregada por el usuario sin romper la partida LAN ya funcional.

## Dirección confirmada

La referencia objetivo es un VTT de D&D en pixel art táctico 2D/2.5D:

- cuadrícula cuadrada visible e integrada en el terreno;
- vista cenital con inclinación suave, sin rotación libre;
- desplazamiento de cámara limitado y legible;
- movimiento e interpretación por casillas;
- mapa como battlemap vivo, no como diorama 3D;
- personajes, PNJ y criaturas como sprites o tokens pixel art intercambiables;
- silueta, clase, equipo y estado de cada token legibles a distancia;
- Stormwreck Isle reconocible por mar, pecio, madera, rocas, viento y tormenta.

Las imágenes aportadas son referencias de lenguaje visual. No deben copiarse sus personajes, interfaces, mapas, sprites, tipografías ni assets.

## Qué se conserva

La implementación actual ya separa el motor de la campaña y tiene pruebas de servidor e integración. Estas partes no dependen del estilo visual y deben permanecer estables:

| Área | Estado actual | Acción en migración |
|---|---|---|
| Servidor LAN y rutas `/dm`, `/player`, `/projector` | Funcional | Conservar |
| Roles, cookie DM y token de jugador | Filtrado e idempotente | Conservar |
| Snapshots, `sceneEpoch` y reconexión | Probado | Conservar |
| Ownership de personajes | Probado | Conservar |
| Movimiento autoritativo y colisiones XZ | Probado | Conservar el contrato; revisar unidades de casilla |
| PG, inventario e interacción del timón | Funcional | Conservar |
| Reveal/hide de criatura | Filtrado | Conservar |
| Audio por capas y tres SFX | Funcional | Conservar, sólo cambiar presentación de controles si hace falta |
| `SceneDefinition` y `CampaignPack` | Base adecuada | Extender con grid, tiles y tokens |

No se debe trasladar `private/` al cliente ni poner notas de DM en el bundle público durante esta migración.

## Qué debe cambiar

### 1. Renderer

`apps/web/world.ts` construye ahora geometría 3D con `BoxGeometry`, cilindros, sombras, niebla y una malla de océano. Es el principal desacuerdo con la nueva dirección. Sustituir el contenido visual por una capa de mapa 2D/2.5D con la misma interfaz pública (`applySnapshot`, `setLocalPlayer`, `screenVectorToWorld`, `dispose`).

La opción de bajo riesgo es mantener el límite `WorldRenderer` y elegir en el siguiente bloque entre canvas 2D con escalado entero o una biblioteca de sprites/tilemap con licencia MIT. No cambiar Socket.IO ni el formato de snapshot para resolver un problema de render.

### 2. Modelo de escena de campaña

Ampliar `campaigns/stormwreck-isle/public/pack.ts` con datos declarativos:

- `grid`: tamaño de casilla, origen, filas/columnas y escala visual;
- `terrain`: capas de suelo y agua, con ids de tiles y procedencia;
- `decorations`: rocas, tablones, mástiles, barandillas y timón anclados a casillas;
- `tokenManifest`: sprite, fallback, color de aro, escala y etiqueta por personaje/criatura;
- `camera`: inclinación suave, zoom mínimo/máximo, límites y zona muerta;
- `walkable`/`blocked`: celdas o polígonos derivados de la misma navegación autoritativa.

El servidor puede seguir usando obstáculos XZ durante Alpha. La extensión de celdas debe representar la misma geometría y tener una prueba que impida que el grid visual y la colisión diverjan.

### 3. Cuadrícula

La cuadrícula debe ser visible en `/projector` y en la vista del jugador cuando ayude a orientarse. Dibujarla como una capa estable por encima del terreno, con opacidad suficiente para leer casillas y baja intensidad para no tapar tokens. Cada entidad debe ocupar una casilla claramente identificable y la posición debe redondearse sólo para presentar; el servidor conserva coordenadas continuas dentro de la casilla durante el movimiento.

Añadir a las pruebas visuales:

1. una escena cargada muestra líneas horizontales y verticales en toda el área jugable;
2. cambiar de escena conserva la escala de casilla y recalcula el origen;
3. el centro del token coincide con su celda después de interpolar un snapshot;
4. la cuadrícula no aparece en login, panel DM ni controles del proyector.

### 4. Tokens pixel art

Reemplazar héroes geométricos y la arpía low-poly por tokens intercambiables. La Alpha no necesita un editor: basta un atlas propio de tamaño pequeño, nearest-neighbour y fallback procedural claramente pixelado. El manifiesto debe poder cambiar sprite sin tocar la lógica de red.

Requisitos mínimos de cada token:

- aro azul para jugadores y aro rojo/ámbar para criatura o amenaza;
- silueta de clase y equipo (báculo, escudo, arco, capa, alas);
- estado idle y una animación corta de caminar o bobbing por frames;
- etiqueta opcional sólo en Player/DM; el proyector prioriza la lectura visual;
- fallback de color si falta el recurso, sin romper la escena.

Los sprites y tiles nuevos deben ser originales o tener licencia documentada. No usar capturas ni extraer sprites de las imágenes de referencia.

### 5. Cámara y movimiento

La cámara debe seguir siendo ortográfica y con inclinación suave. Eliminar la sensación de cámara 3D mediante zoom y paneo limitados, sin rotación libre. El eje de joystick/WASD debe calcularse con la base pública de la cámara; revisar la implementación actual de `screenVectorToWorld`, porque invierte el vector derecho al aplicar `.negate()`.

La navegación debe moverse por casillas o por un vector continuo cuantizado a casillas de destino. No convertirla en turnos automáticos: el jugador conserva control directo y la mesa sigue resolviendo reglas y dados.

### 6. Interfaz

El HUD del jugador debe parecer una hoja de control ligera: nombre, PG, inventario, casilla/objetivo e INTERACTUAR. El panel DM puede conservar su diseño operativo, pero debe mostrar una miniatura del battlemap y la cuadrícula en la fase posterior si no aumenta el riesgo.

El proyector debe permanecer limpio: mapa, cuadrícula, tokens, animación ambiental y feedback de tormenta/SFX. No mostrar coordenadas, ids, inventarios, notas ni controles.

## Orden recomendado de implementación

1. Corregir el eje derecho de `screenVectorToWorld` y añadir una prueba de orientación.
2. Introducir los tipos declarativos de grid, tiles, decoraciones y tokens en el pack público.
3. Crear una interfaz de renderer y conservar temporalmente el renderer actual como fallback.
4. Implementar mapa de cubierta con tile layer, grid y cámara 2.5D; validar una única escena (`wreck-deck`) antes de duplicar `wreck-approach`.
5. Añadir atlas de tokens originales/fallback y animación de idle/caminar.
6. Conectar snapshots, reveal/hide, timón, clima y cámara al renderer nuevo.
7. Ajustar Player móvil y Projector 16:9; medir lectura de casillas en pantalla pequeña y pared.
8. Repetir integración, reconexión, privacidad, audio y recorrido completo de Alpha.

## Riesgos y decisiones que debe cerrar Astra

- Canvas propio reduce dependencias, pero exige resolver escalado, atlas y batching manualmente.
- Una biblioteca de tilemap reduce trabajo de render, pero añade dependencia y una decisión de empaquetado/licencia.
- El movimiento continuo actual es compatible con un battlemap, aunque la presentación debe hacer evidente la casilla ocupada.
- Los mapas dibujados a mano con mucho detalle pueden dificultar la licencia y el rendimiento; empezar con un único deck legible y ampliar después.
- La cámara inclinada debe ser suave: una perspectiva fuerte perjudica medir distancias y contradice la prioridad táctica.

## Criterio de salida del bloque visual

La migración estará lista para auditoría cuando un usuario pueda abrir las tres rutas, ver una cuadrícula persistente, distinguir los tres tokens por clase/silueta, mover cada personaje por casillas en la cubierta, ver la posición sincronizada en el proyector, revelar la criatura sin filtración previa y seguir usando timón, audio, clima y reconexión con las pruebas existentes en verde.
