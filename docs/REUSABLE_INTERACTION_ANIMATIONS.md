# Animaciones emparejadas reutilizables — 2026-10-08

## Contrato de reutilización

La biblioteca vive en `engine/client/interaction-animation.ts` y
`interaction-actor-pose.ts`, no dentro de un mapa. Un mapa conecta piezas reales
por su función (`page`, `blanket`, `tool`, `flame`, etc.) y el identificador de su
punto de interacción. No se buscan nombres de meshes ni IDs de escenas en el
motor. Las poses se normalizan por altura pintada, descontando el alfa del PNG,
y el contacto se expresa en metros, no en píxeles de pantalla.

El mismo reloj de la interacción dirige aproximación, contacto, trabajo y
retirada. La animación no cambia casillas, colisiones, mochila, PG ni recursos.
El servidor conserva proximidad, propiedad y efectos persistentes (asiento y
apertura del baúl). La cancelación visual nunca deshace esos estados.

## Conectar un objeto en otro mapa

1. Crear un punto con `id`, `kind`, `cell`, `objectCell` y `surfaceId`. `cell`
   debe ser una casilla transitable junto al objeto, no la entrada de una sala.
   El campo opcional `activities` permite escoger acciones sin depender de los
   nombres Mike/Mia/María. DM y jugador usan la misma lista que valida el servidor.
2. Mantener separadas las piezas móviles antes de agrupar el decorado estático.
3. Registrar cada pieza con `registerInteractionPart`. Dar un `contact` explícito
   si la geometría tiene vértices absolutos o el centro del mesh no es el punto
   de uso. El contacto es una coordenada mundial en metros.
4. Para un objeto que se recoge, indicar `grip`: el pivote mundial común de sus
   componentes en reposo. Libro y páginas comparten ese pivote. Una herramienta
   puede ser recogida mientras las demás permanecen en su estuche.
5. Mantener las piezas en los grupos de iluminación y corte/ocultación del
   interior. El controlador no fuerza visibilidad a través de techos o paredes.
6. Actualizar `CampActivityVisuals` después del movimiento ambiental, usando el
   reloj de presentación y el historial del servidor. `WorldRenderer` ya lo hace.

Ejemplo de conexión de un libro existente:

```ts
const grip = new Vector3(bookX, tableHeight, bookZ);
registerInteractionPart(scene, 'library-book', 'book', cover, { grip });
registerInteractionPart(scene, 'library-book', 'page', leftPage, { side: -1, grip });
registerInteractionPart(scene, 'library-book', 'page', rightPage, { side: 1, grip });
// Punto: kind:'personal', activities:['study','inspect'].
```

Para una tienda se conectan `flap` y `tie`; para un lecho, `blanket`, `pillow`
o `hammock`; para una hoguera, `log`, `flame`, `pot`, `liquid` y `utensil`.
Un baúl utiliza `chest-lid` con bisagra en su eje local X. Los objetos rígidos
no deben animarse artificialmente: el banco permanece fijo, su tela cede; la
estatua permanece fija, responde el farol de vigilancia añadido como ambiente.

## Cobertura conectada

| Acción | Personaje | Respuesta del objeto existente |
|---|---|---|
| Calentarse | Gesto de brazos y torso | Variación de llama y pequeñas brasas |
| Cocinar | Gesto cíclico de remover | Cuchara, contenido de la olla y vapor en su ubicación real |
| Avivar | Inclinación y alcance | Leños y llama |
| Preparar lecho | Gesto de extender/acomodar | Manta, almohada o lona de hamaca |
| Descansar | Pose sentada y respiración | Manta/almohada; hamaca con extremos anclados |
| Estudiar | Pose y brazos | Libro real, recogida/retorno y páginas |
| Orar | Gesto recogido | Símbolo real, recogida/retorno |
| Herramientas | Gesto de revisión | Recogida de una ganzúa y revisión del resto |
| Vigilar | Giro y gesto leve | Farol o cuerda; no mueve estatua/bote |
| Sentarse | Pose y asiento autoritativo | Compresión leve de la tela del banco |
| Baúl | Gesto existente de interacción | Tapa con transición sincronizada y estado persistente |
| Revisar equipo | Gesto de inspección | Libro, símbolo, herramientas o cierre del baúl, según el objeto |
| Refugio | Gesto de alcance | Solapas y ataduras de la tienda |

Las cinco escenas actuales registran piezas para cada punto. Los cuatro
exteriores separan la revisión de la entrada de la tienda del uso del lecho
interior. A1 mantiene el mobiliario canónico y coloca la casilla de uso junto a
la cama/hamaca. La cuadrícula y las colisiones no se redibujan.

## Límites y evolución

Esto es articulación procedural 2,5D sobre los PNG disponibles, no un esqueleto
3D ni nuevas secuencias dibujadas. Reutiliza las poses direccionales existentes;
no inventa vistas traseras donde el personaje no las tiene. El registro de
objetos y las fases seguirán sirviendo si después se añaden sprites específicos
o un esqueleto: se sustituye la representación del personaje, no el comportamiento
de cada mapa. Las manos pintadas no ofrecen precisión anatómica de un rig 3D.

Un objeto sin piezas registradas conserva la representación genérica anterior
como compatibilidad, pero **no** debe considerarse una interacción emparejada
terminada. La prueba de cobertura exige piezas reales en todos los puntos de
los campamentos actuales. Para reutilizar en un mapa nuevo hay que conectar sus
piezas/contactos; no hay reconocimiento automático de cualquier dibujo del mapa.

Pruebas: reloj y fases; biblioteca futura con mueble escalado/rotado; atlas/alfa;
pies fijos; retorno a locomoción; extremos de hamaca; limpieza al eliminar meshes;
cancelación antes del primer fotograma; cobertura de cada acción en cinco mapas.
La aceptación artística y el rendimiento en proyector/teléfono físicos requieren
su comprobación específica, y no se deducen de una prueba sin GPU.
