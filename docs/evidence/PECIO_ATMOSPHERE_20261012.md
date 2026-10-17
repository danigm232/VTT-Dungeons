# Rosa de los Vientos · sombras, clima y detalle

Pase del 12/10/2026 sobre el pecio reconstruido. Fuente narrativa: PDF local
«Aventura Los Dragones de la Isla de las Tempestades», capítulo 3, pp. 22–27,
y mapa C1–C9. El PDF es referencia descriptiva, no dirección artística.
No se sustituye la escena Babylon por una imagen ni se modifica la cuadrícula.

## Diez puntos atendidos

| Petición | Causa / cambio implementado | Conservación y alcance |
| --- | --- | --- |
| Iluminación de campamentos | El antiguo mapa de sombras solo cubría parte de la estructura. Se reutiliza `CampShadows`, con filtro específico del pecio, sol/luna y una luz portada próxima; profundidad acotada y caché. | No se encienden antorchas abandonadas. El filtro por defecto de los campamentos no cambia. |
| Mobiliario y canon | C4: dos cajones, pergaminos mojados y estantería deteriorada. C2: balista fracturada, cuerda rota, sin proyectil utilizable. C7: silla con pata perdida. C9: restos de carga, botas y paquete visibles solo con el estado adecuado. | Se conservan cocina vacía, seis literas, retrato, trampas, botín, tabla d6, encuentros y secretos. No se añade tesoro ni se revelan compartimentos cerrados. |
| Reflejos | Un RTT planar real compartido por océano, barco, bote, rocas y huesos; distorsión animada y Fresnel. | 512 px, 256 en perfil compacto; muestreo limitado, sin RTT dentro de interiores. No es ray tracing. |
| Antigüedad de cubierta | Colonias irregulares de algas con textura alfa, cabos deshilachados, botas, astillas levantadas y huesos de presas junto al rastro ya descrito en C1. | Detalle agrupado por planta/material; sin nuevos obstáculos, esqueletos de encuentro o botín inventado. |
| Mástil y prueba | Mástil mayor íntegro con inclinación aproximada de 1,5°. Ascenso P10 solicita Fuerza (Atletismo) CD 10 y autorización del DM con total físico. | **Adaptación opcional**, no CD del libro. Un fallo no produce caída, daño ni dados automáticos. El DM puede omitirla; descenso libre y escalada temporizada de 15 m. |
| Visibilidad y sombras | El mástil entero desaparecía al atenuar su base: ahora tiene cuatro tramos independientes. La cámara interior eleva suavemente el encuadre a 55° para superar el techo del camarote vecino. | Ocho orientaciones conservadas; el camarote vecino permanece cerrado. El ángulo exterior se recupera al salir. Sombras de muebles/personajes y contacto existentes se mantienen. |
| Huesos | Textura de erosión, grietas y relieve compartida; tres conjuntos de vértebras/costillas adicionales fuera de la navegación. | Huesos principales permanecen dentro de arrecifes bloqueados. Sin obstáculos invisibles nuevos. |
| Lluvia y nieve | Partículas compartidas, humedad y acumulación según clima autoritativo; exposición por altura/techo. | C4–C9 protegidos; C2/C3/cofa reciben nieve. No se cambian reglas de terreno por el mero efecto visual. |
| Nido | Radio envolvente 1,55 m frente a 1,17 m anterior, cuenco más hondo, borde irregular y fibras/telas/huesos existentes. | Superficie aproximadamente 75% mayor; centros de celdas transitables siguen libres. |
| VFX de barca | Espuma viajera alrededor del casco y ocho gotas bajas de spray, ligadas a la iluminación ambiental. | No alteran pasajeros, piloto, colisiones, posición o inventario. |

Se mantienen casco, conexiones C1–C9, escora de la estructura, cierre de C8/C9,
brecha de popa y tránsito de natación/buceo P16 del pase anterior.

## Correcciones surgidas al comprobar

1. Las primeras colonias de algas parecían polígonos demasiado brillantes:
   se sustituyó su relleno uniforme por textura moteada con bordes transparentes.
2. En C4, desde el sur, el techo cerrado de C5 ocultaba parte del personaje:
   encuadre interior gradual más elevado, sin descubrir C5. Se extiende la
   auditoría a ocho orientaciones de cada camarote.
   La litera que cruza solo los pies también se atenúa. Las capturas de escalada
   llevaron a incluir velas y los bordes de la silueta en la detección del mástil;
   el material de vela conserva recorte alfa y admite la atenuación gradual.
3. La ruta automatizada de regreso de C9 atravesaba la casilla de la arpía
   que acaba de volver a C1. Se corrige el planificador de **la prueba** para
   respetar actores presentes; no se elimina el encuentro ni su colisión.
4. P10 era rechazado por el validador de identificadores en minúsculas:
   se admiten referencias de puerto `P01`–`P99` únicamente en comandos de puerto,
   y `P10` específicamente en la acción de jugador. El resto de IDs mantiene
   su validación estricta. Prueba de protocolo cubre total válido e ID malicioso.
   La acción incorpora también su casilla/planta para aparecer en el menú
   contextual del jugador, aunque no sea un mueble ni un actor.
5. El visor de prueba reutilizaba un snapshot mutable, invalidando la comparación
   de clima anterior. Ahora envía copias independientes como la conexión real;
   acumulación y hora de prueba se separan del reloj de la partida.
   Cada repetición de la grabación usa además una época visual nueva, evitando
   que una segunda escalada herede la llegada de la reproducción anterior.

## Evidencia y comprobaciones

- Suite completa: **633/633 pruebas en 86 archivos**. Después del ajuste final
  de transición interior y oclusión, **22/22 regresiones dirigidas en seis archivos**
  de cámara D8, encuadre interior, estructuras/velas, protocolo y escalada; el comportamiento por defecto
  de otras escenas conserva sus límites anteriores.
- Tipos de cliente y compilaciones de producción cliente/servidor comprobados.
- Red aislada: **241 pasos**, dos jugadores y proyector, C1–C9, cuatro puertas
  abiertas por jugador, visibilidad individual, natación y buceo P16, solicitud
  de cofa, total 9 rechazado, total 10 aceptado, subida gradual y guardar/reiniciar.
- Segunda prueba conectada: la acción contextual incluye casilla/planta,
  subida con CD, descenso animado sin CD y persistencia; **PASS**.
- Navegador Babylon real: **112 capturas en la auditoría**, **106 diagnósticos**
  sin errores ni recursos pendientes. Cenital, estructura sin texturas, ocho
  vistas exteriores, cuatro camarotes desde ocho lados, cofa/huesos/brecha/C8/C9,
  reflejos activados/desactivados, noche con/sin luz, lluvia y nieve fuerte.
- Reproducción completa de los snapshots del recorrido, **14 capturas adicionales**
  incluidas inmersión/escalada intermedias. La escalada se vuelve a observar
  desde el lado donde la vela y el mástil interferían con la ficha.

Directorio exclusivo: `output/pecio-atmosphere-20261012`; las pruebas no escriben
en la partida de la mesa. Visor aislado: `http://127.0.0.1:4612/scripts/wreck-review.html`.

La versión final de los informes automáticos y las capturas se enlaza aquí:

- [Suite completa](../../output/pecio-atmosphere-20261012/test-results.json).
- [Regresiones dirigidas finales](../../output/pecio-atmosphere-20261012/final-targeted-tests.json).
- [Navegación conectada](../../output/pecio-atmosphere-20261012/playability.json).
- [Acción contextual, CD y descenso](../../output/pecio-atmosphere-20261012/climb-smoke.json).
- [Auditoría visual y costes](../../output/pecio-atmosphere-20261012/visual-audit.json).
- [Grabación del servidor](../../output/pecio-atmosphere-20261012/navigation-replay.json).
- [Reflejos activados](../../output/pecio-atmosphere-20261012/wreck-boat-reflections-on.png)
  y [desactivados](../../output/pecio-atmosphere-20261012/wreck-boat-reflections-off.png).
- [Nido ampliado](../../output/pecio-atmosphere-20261012/wreck-crow-angle-0.png).
- [Nido antes del pase](../../output/pecio-detail-20261010/wreck-crow-angle-0.png).
- [Mástil visible desde C1](../../output/pecio-atmosphere-20261012/wreck-detail-main.png).
- [C4 desde el sur](../../output/pecio-atmosphere-20261012/wreck-c4-angle-3.png).
- [Nieve exterior](../../output/pecio-atmosphere-20261012/wreck-snow-main.png),
  [interior protegido](../../output/pecio-atmosphere-20261012/wreck-snow-c4.png)
  y [lluvia](../../output/pecio-atmosphere-20261012/wreck-rain-main.png).
- [Huesos texturizados](../../output/pecio-atmosphere-20261012/wreck-bones-angle-2.png).
- [Escalada intermedia](../../output/pecio-atmosphere-20261012/wreck-walk-climb-middle.png)
  y [buceo intermedio](../../output/pecio-atmosphere-20261012/wreck-walk-dive-middle.png).

La reflexión planar se apoya en la técnica de
[MirrorTexture documentada por Babylon.js](https://doc.babylonjs.com/features/featuresDeepDive/materials/using/reflectionTexture).
Texturas nuevas de huesos/algas y geometría de detalle generadas en el proyecto;
no se descargaron assets ni se incorporaron licencias externas.

## Límites

Es una mejora implementada y comprobada, no una declaración de perfección ni
equivalencia a Octopath Traveler. El arte sigue siendo procedural estilizado;
las texturas repetidas de cubierta, la forma anatómica de los restos y el
acabado pictórico admiten una dirección artística posterior.

Un RTT planar de baja resolución puede perder detalle en reflejos lejanos.
Las mediciones del visor son 24 redibujados forzados con sincronización GPU,
en un lienzo de 899 × 546: medianas C1 16,1 ms, C4 9,6 ms, C8 5,3 ms y C9
4,3 ms; p95 C1 33 ms. No son FPS sostenidos ni garantía de rendimiento móvil/proyector físico. M5
conserva aceptación artística abierta y M7 ensayo físico prolongado/audio.

La CD de escalada es una adaptación de mesa; el mástil está levemente inclinado,
no se simula balanceo físico ni caída. Respiración, consecuencias del fallo y
adjudicación narrativa permanecen bajo el DM.

Para cargar todo en la mesa, usar `INICIAR.cmd`; con servidor abierto, su opción
**A** guarda y reinicia la campaña elegida. No se ha reiniciado la mesa real.
