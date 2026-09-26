# Contrato visual de puerta — corrección integrada en Alpha 0.3

Decidido por Astra, 2026-09-15. Diseño, no arte final ni PASS visual. Sol lo implementa junto con persistencia en `0.3.0-rc.1`; el usuario comprobará puerta y móvil al terminar. Sustituye las indicaciones incompatibles de puerta de 0.2.1, no sus reglas funcionales.

## Diagnóstico y decisión

Inspeccionados fondo `objects-v2/wreck-objects-room-v2.png`, variantes v3, pack y renderer, además del informe físico. El problema no es solamente la perspectiva: el fondo de 576×432 dibuja el eje del tabique aproximadamente en x=288, mientras la columna lógica 6 tiene centro x=312. Los extremos del hueco dibujado están aproximadamente en y=176/230, no en los límites lógicos y=192/240. Son medidas de inspección visual, no una segmentación exacta. Los PNG de puerta tampoco comparten eje visible y desperdician gran parte de su lienzo transparente.

**ADAPT del arte propio**: corregir localmente el tabique del fondo y producir una familia coherente de cinco variantes, con lienzo/ancla idénticos. Mantener grid48, cámara afín `scaleY=0.92`, navegación y celda (6,4). No girar 90° un PNG oblicuo ni cambiar colisiones para acomodar una imagen errónea. Sin 3D, editor nuevo ni puerta móvil.

## Coordenadas obligatorias

Todas son píxeles lógicos del fondo ANTES de compresión vertical y zoom. Norte arriba, este derecha. El paso es oeste↔este; cerrada sigue el tabique norte↔sur.

| Elemento | Coordenadas / regla |
|---|---|
| Celda de puerta | (6,4), rectángulo x=[288,336), y=[192,240), centro C=(312,216) |
| Tabique y marco fijos | Eje x=312; cuerpo dentro de columna 6, centrado y de anchura aproximada 20 px. Norte termina en y=192; sur comienza en y=240 |
| Bisagra H, extremo norte | (312,192), permanente en abierta/cerrada/dañada |
| Cerrada: extremo libre | (312,240); eje de hoja H→(312,240), longitud 48 |
| Abierta: extremo libre | (360,192); eje de hoja H→(360,192), longitud 48, giro de 90° hacia el este |
| Lienzo de cada variante | 96×96 lógicos; ancla (0.25,0.5); origen mundial (288,168) al colocar en C |
| H dentro del PNG | (24,24); cerrada termina (24,72), abierta (72,24). Igual origen en las cinco variantes; nunca autocentrar por caja alfa |
| Grosor / altura dibujada | Grosor nominal 6 px, canto superior y cara lateral somera de hasta 6 px. Altura visual hacia el norte; sombra pequeña, misma luz/material en los estados |

La igualdad `origen + (ancla × tamaño) = C` y los dos radios de 48 px son verificables sin hardware. El giro es de la hoja física, no de la cámara. Se ve la parte superior y algo del lateral, nunca un rectángulo frontal alto. El estado puede cambiar instantáneamente; animar la bisagra no es requisito de 0.3.

El marco pertenece **sólo al fondo**: extremos rematados/herrajes fijos en H y al sur; no un dintel gráfico atravesando el paso abierto. El sprite contiene hoja, sombra y, en destruida, restos. No repetir postes en cada PNG. El centro y eje deben respetarse con tolerancia de 1 px lógico; textura y astillas pueden variar.

### Fondo correctivo

Crear `objects-v4/wreck-objects-room-v4.png`, 576×432. Mover/redibujar el tabique norte y sur hasta x=312 y ajustar sus extremos al hueco indicado. Reconstruir el suelo donde estaba el tabique viejo; no dejar sombra/poste fantasma. Acotar edición aproximadamente a x=264..336 e integrar sus encuentros con vigas exteriores; mantener intactos caja, suelos laterales, faroles y composición restante. No arrastrar el fondo entero, cambiar origen de grid, ni modificar el mapa del pecio. Verificar también las celdas (5,3)/(6,3)/(7,3) y (5,5)/(6,5)/(7,5): sólo columna 6 bloqueada en esos tramos.

### Familia de sprites

Crear `objects-v4/door-{intact,damaged}-{closed,open}-v4.png` y `door-destroyed-v4.png`. Las cuatro hojas son el mismo objeto y herrajes, no generaciones sin referencia común. El daño sigue las mismas zonas materiales al abrir; conservar la estética de daño que gustó al usuario. Destruida conserva restos bajos dentro de la celda (6,4), sin una hoja aún erguida. Su marco de fondo no desaparece. PNG RGBA con alfa real; tamaño nativo 96×96 o múltiplo entero común, sin margen añadido por variante. Registrar prompts/fuentes/procesado y hashes al producirlos. Usar la herramienta/skill de imagen indicada por el entorno para la edición raster; este contrato no autoriza saltarse sus instrucciones.

Actualizar sólo el fondo de `wreck-objects` y las cinco entradas de `practice-door` del pack. Las coordenadas nuevas ya caben en `VisualAsset`; no aumentar el DTO público por este ajuste. Preview usa exactamente asset/ancla/centro del estado aplicado; amarillo selección, verde destino válido, rojo inválido. Escape cancela, no aplica y no deja rastro. No ampliar la capacidad de transformar una puerta fija para demostrar preview: comprobar el renderer y la selección de puerta sin inventar un botón de traslado.

La hoja abierta sobresale visualmente hacia la celda vecina por su borde norte. Esa franja no añade un collider ni una huella de ubicación: la puerta sigue reservando sólo (6,4) para otros objetos. Mantener cara/sombra compactas y comprobar que no oculte pies/aro de un personaje en (7,3)/(7,4). Si el orden por centro la tapa, ordenar la hoja abierta por su línea de apoyo norte (y=192), usando metadato visual opcional y genérico con valor por defecto para otros props, no un literal `practice-door` en engine. No atenuar toda la ficha ni mover su posición lógica.

## Invariantes funcionales

- `locked` privado usa la misma imagen que `closed`; no mandar cerradura privada a Player/Projector.
- Cerrada/locked intacta o dañada bloquea (6,4); abierta/destruida deja pasar actores. Restos/marco reservan ubicación frente a otros objetos.
- No cerrar/reparar/undo sobre PJ, incluidos desconectados y extremos de paso, ni criatura visible. No revelar criaturas ocultas mediante rechazos de colisión.
- Una sola entidad y un marco; cambio de escena/reconexión no duplica hojas. No tocar los estados de timón/caja aprobados.

## Timón: observación acotada

Pack y renderer coinciden en soporte/timón (3,8), centro (168,416) por `originY=8`. Las celdas arriba (3,7) y derecha (4,8) ya están entre las cuatro autorizadas para interacción. El fondo limpio inspeccionado no tiene otra rueda. La frase «uno arriba y uno a la derecha» no identifica con certeza una nueva posición: **no desplazar ni soporte ni navegación en 0.3**. Sol conserva la duda en la checklist y aporta captura con grid y centro; corregirá un eventual descentrado del propio sprite si lo mide, no inventará la intención del usuario.

## Reutilización y aceptación

Criba registrada en `OPEN_SOURCE_REVIEW.md`: Tiny Dungeon 1.0 de Kenney, CC0 verificada dentro del ZIP, PNG/atlas 16px. No se integra: no está demostrado que incluya esta familia y anclas, y cambiar la densidad/materiales no ahorra el ajuste geométrico. Se conserva arte propio del pecio y se adapta con trazabilidad; no se declara CC0.

| ID | Evidencia exigida a Sol antes de entregar |
|---|---|
| D01 | Capturas de fondo+grid: eje x312 y hueco y192..240; PNG alfa/anclas/tamaños comprobados automáticamente |
| D02 | Comparación abierta/cerrada, intacta/dañada y rota a la MISMA escala en DM, Player y Projector; misma H, radio y perspectiva |
| D03 | Cruzar oeste→este y este→oeste abierta; bloquear cerrada; impedir cierre/undo ocupado; atravesar restos |
| D04 | Preview privado y Escape sin cambios; reconexión/cambio rápido durante carga sin variante vieja ni duplicado; locked no filtra |
| D05 | Pies/aro legibles en celda de puerta y celdas junto a hoja abierta; sin corrimiento de caja ni regresión del timón |
| D06 | Usuario valida puerta y móvil después de la entrega conjunta 0.3; PENDIENTE, nunca suplida por captura de agente |

No aceptar el arte sólo porque se hayan exportado cinco PNG o pasado los tests de colisión. No se produce ni valida arte final en este bloque de Astra.
