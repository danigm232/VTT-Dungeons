# Retiro del Dragón · G1.1 · Respaldo de A3/A4

**Fecha:** 21–22/10/2026. **Entrega parcial:** primera intervención geométrica del roadmap, después del marco geográfico G0. Estado de las pruebas: completadas; entrega para revisión visual de esta zona.

## Qué se ha construido

Un respaldo rocoso 3D continuo detrás del comedor/cocina y la biblioteca. Se reutilizan **375 caras seleccionadas de la meseta original A1 sin recortar**, se adapta únicamente la copia y se exporta como módulo independiente. La geometría del mapa, las habitaciones y los muebles existentes no se reconstruyen.

La fuente correcta era [A1 nativo original](<C:/Users/User/Desktop/Dungeons/prototypes/retreat-a1-preserved/artifacts/retreat_a1_preserved.blend>): la copia de esa meseta dentro del ensamblaje global ya estaba recortada. No se reactiva el lote completo del VTT. Se conserva el origen global actual y la escala de 1,5 m.

La nueva pieza ocupa X **79–138 m**, Z **−40–54,7 m**, con cota superior máxima **32,43 m**. El frente enlaza por detrás de A3/A4; los laterales y el retorno posterior descienden. La prolongación inicial hasta Z−60 se acortó a Z−40 tras revisar la cámara, para evitar una losa larga o un muro que dominase la composición. Es dimensionado **VTT_AMBIENCE**, no un relieve exacto atribuido al PDF.

El respaldo permanece visible cuando se oculta el techo local de A3/A4. No es una superficie transitable, no aporta colliders, no se selecciona al pulsar el mapa y queda fuera del volumen reservado a personajes. Recibe la iluminación existente; no añade luces, texturas ni nuevos emisores de sombras.

El conjunto aún muestra una masa central grande y un material uniforme en los encuadres generales. Esta es una intervención de continuidad geométrica; las uniones laterales y la naturalización del acabado se revisarán en las subfases siguientes. Las imágenes generales también se entregan para que esa limitación quede visible.

## Antes y después

Galería: [Comparar 250 encuadres](<C:/Users/User/Desktop/Dungeons/output/retreat-geography-20261021/g11/index.html>). Fotografías originales del renderizador actual; misma cámara, zoom, foco y resolución 1280×720. Se oculta o muestra exclusivamente la pieza nueva sobre la misma escena. El oleaje y los detalles animados pueden avanzar entre fotografías; no se han pintado ni sustituido fondos en las imágenes.

| Antes · conjunto, 25° / 0° | Después · mismo encuadre |
|---|---|
| ![Antes](C:/Users/User/Desktop/Dungeons/output/retreat-geography-20261021/g11/evidence/g11-overview-t25-y0-zfull-before.jpg) | ![Después](C:/Users/User/Desktop/Dungeons/output/retreat-geography-20261021/g11/evidence/g11-overview-t25-y0-zfull-after.jpg) |

| Antes · A3, 25° / 0°, lejano | Después · mismo encuadre |
|---|---|
| ![Antes A3](C:/Users/User/Desktop/Dungeons/output/retreat-geography-20261021/g11/evidence/g11-a3-t25-y0-zfar-before.jpg) | ![Después A3](C:/Users/User/Desktop/Dungeons/output/retreat-geography-20261021/g11/evidence/g11-a3-t25-y0-zfar-after.jpg) |

| Antes · A4, 25° / 0°, lejano | Después · mismo encuadre |
|---|---|
| ![Antes A4](C:/Users/User/Desktop/Dungeons/output/retreat-geography-20261021/g11/evidence/g11-a4-t25-y0-zfar-before.jpg) | ![Después A4](C:/Users/User/Desktop/Dungeons/output/retreat-geography-20261021/g11/evidence/g11-a4-t25-y0-zfar-after.jpg) |

## CANON y VTT_AMBIENCE

**CANON conservado:** comedor con mesa larga, dos bancos, única silla, pasillo y cocina; biblioteca y puerta de roble/hierro; ambos interiores excavados en el acantilado. Marco geográfico contrastado con mapas 1/2 y capítulo 1 del PDF del usuario. Las seis celdas y todo su mobiliario siguen siendo el mismo lugar. Bahía y frente marino permanecen abiertos.

**VTT_AMBIENCE ejecutado:** forma y extensión del respaldo, caída de sus laderas, variación mineral sobria y unión visual a la roca existente. No crea habitaciones, nuevos lugares canónicos, decisiones narrativas, PNJ ni interactivos.

## Problemas encontrados y corregidos durante la fase

1. **Fuente recortada:** se localizó la meseta completa en el A1 nativo anterior al ensamblaje, y se extrajo solo su fragmento posterior. Las celdas no se tocan.
2. **Franjas de color en el primer ensayo:** al crear capas de datos en Blender se invalidaban referencias previas a UV/color. Se corrigió la escritura de ambos atributos y se verificó la exportación. Alfa opaco en todos los vértices; tonos minerales válidos. El ensayo rechazado queda registrado en checks/rejected-v1-colors.jpg, fuera de la galería final.
3. **Silueta demasiado rígida:** el primer volumen se prolongaba demasiado hacia el norte. Se redujo su longitud y se bajaron los flancos; las cámaras mantienen exactamente sus límites anteriores.
4. **Ocultación del respaldo:** la pieza tiene propietario y metadatos separados del techo recortable. Las 250 vistas finales comprueban que continúa habilitada y visible al ocupar A3/A4.
5. **Dibujo fuera de plano:** la comprobación predeterminada mediante esfera envolvente incluía la pieza en encuadres que no la necesitan. Se usa también la caja envolvente exacta, solo en la nueva malla. Después se repitieron los 250 encuadres, se actualizaron las seis fotografías principales y se repitió el coste. La geometría y las cámaras no cambian.

El exportador de Blender avisa de un sampler heredado en el material fuente. La ejecución reutiliza los materiales/texturas del VTT y elimina las imágenes embebidas del módulo. El GLB final pasa el validador Khronos con **cero errores y cero advertencias**; solo conserva avisos informativos de UV/tangentes que utiliza la reasignación de materiales del VTT.

## Conservación y pruebas realizadas

| Control | Resultado |
|---|---|
| Archivos protegidos del mapa comparados | 2112 SHA-256; **solo cambia retreat-refinement.ts** para importar la nueva capa. Los otros 2111 archivos permanecen idénticos. Las herramientas de revisión se enumeran aparte. |
| Celdas y geometría A1 | **128 mallas nativas** con geometría y matrices idénticas. Fuentes de muebles/celdas, distribución, assets previos y navegación intactos. |
| Reserva de navegación | 850 casillas comprobadas; margen mínimo conservador XZ **0,80 m**, superior a la reserva de 0,60 m. Ninguna casilla invadida. |
| Movimiento autorizado | **1.514 pasos** con el GameState actual, todas las zonas principales y diez superficies. |
| Muebles y paredes físicas | 46.490 muestras sobre las rutas y obstáculos existentes; 33 bordes bloqueados. |
| Puertas | A2/A4 cerradas bloquean el paso; apertura manual correcta. |
| Interacciones y estado | 13 puntos conservados, guardado anterior restaurado, encuentro de tres zombis privado y resolución manual conservados. |
| Geometría nueva frente al recorrido | **4.828 posiciones**, radio 0,30 m, cuatro alturas y 16 direcciones: **cero colisiones nuevas**. |
| Integridad de malla | 3446 triángulos; cero degenerados, duplicados, bordes abiertos o bordes no manifold. |
| Cámara A3/A4 y entorno | **250 pares / 500 capturas**: cinco inclinaciones 5/10/15/20/25°, cinco giros −30/−15/0/+15/+30° y tres zooms locales; conjunto tiene un único encuadre por ángulo. Diferencia máxima de pose 0.00000000. |
| Zonas conservadas | **90 vistas adicionales** de playa, A1, A2, A5 y las seis celdas; sin bloqueo de cabeza/torso en los rayos de control. |
| Pruebas específicas del alcance | **68/68 aprobadas**, once archivos; sin cambiar pruebas ni snapshots anteriores. |
| Cliente | Tipos correctos y compilación aislada correcta para las entradas DM, jugador y proyector. GLB empaquetado idéntico al validado, por SHA-256. |

El recorrido del servidor y las comprobaciones de geometría son nuevas ejecuciones. Las fotografías usan una copia de estado colocada en focos para revisar cámara; por sí solas no constituyen un recorrido interactivo en una partida real. La comprobación final sostenida y en dispositivos físicos permanece en Q1.

Registros: [Conservación y navegación](<C:/Users/User/Desktop/Dungeons/output/retreat-geography-20261021/g11/checks/phase-verification.json>), [Integridad de la malla](<C:/Users/User/Desktop/Dungeons/output/retreat-geography-20261021/g11/checks/mesh-integrity.json>), [Recorrido del servidor](<C:/Users/User/Desktop/Dungeons/output/retreat-geography-20261021/g11/checks/runtime-verification.json>), [Prueba frente al GLB](<C:/Users/User/Desktop/Dungeons/output/retreat-geography-20261021/g11/checks/geometry-walk-verification.json>), [Comparabilidad de cámaras](<C:/Users/User/Desktop/Dungeons/output/retreat-geography-20261021/g11/evidence/g11-pairs.json>), [Zonas y costes](<C:/Users/User/Desktop/Dungeons/output/retreat-geography-20261021/g11/evidence/g11-regressions.json>).

### Resultado del pase completo del proyecto

Se ejecutó también toda la batería: **896 de 902 pruebas aprobadas, 6 fallidas**. Por tanto, no se declara que todo el VTT esté en verde. Los casos fallidos corresponden a la cámara de la cueva del espejo de D8 (límite de tiempo), la orientación de tiendas, el paquete Playground de D8, expectativas de filas/puertas de D8 y el recuento privado de criaturas del pecio. La modificación de producción de esta fase está limitada al importador visual del Retiro; estos seis casos quedan registrados para investigar fuera de G1.1, sin atribuirles una causa nueva no comprobada.

Registros completos: [Batería completa](<C:/Users/User/Desktop/Dungeons/output/retreat-geography-20261021/g11/checks/full-suite.json>); [Los seis casos fallidos](<C:/Users/User/Desktop/Dungeons/output/retreat-geography-20261021/g11/checks/full-suite-summary.json>).

## Impacto sobre rendimiento

Se añade **una malla, 3446 triángulos y 0,28 MiB de GLB** (294804 bytes). Cero imágenes y luces nuevas. Se mantienen materiales compartidos y el cambio de calidad PBR/Standard existente.

36 mediciones iniciales por redibujado con finalización GPU forman 18 pares antes/después: seis focos y tres roles, host 1280×720, 24 muestras tras ocho cuadros de calentamiento en cada medida. Había pruebas generales en segundo plano durante esa primera pasada, por lo que se conserva como registro orientativo. Son costes de CPU/GPU sincronizados, **no FPS sostenidos**, y no sustituyen un teléfono/proyector físico.

| Rol / vista | Mediana antes / después (ms) | p95 antes / después (ms) | Llamadas antes / después |
|---|---:|---:|---:|
| dm / overview | 21,40 / 20,80 | 27,70 / 27,40 | 541 / 542 |
| dm / upper | 13,50 / 16,20 | 22,70 / 24,90 | 303 / 304 |
| dm / a3 | 12,90 / 11,30 | 22,20 / 21,10 | 103 / 104 |
| dm / a4 | 21,30 / 21,50 | 47,50 / 31,90 | 167 / 168 |
| dm / a5 | 15,00 / 16,00 | 28,30 / 26,70 | 57 / 57 |
| dm / room1 | 20,40 / 13,00 | 43,00 / 16,50 | 86 / 87 |
| player / overview | 23,80 / 24,00 | 28,10 / 34,70 | 542 / 543 |
| player / upper | 18,60 / 19,40 | 25,90 / 36,00 | 313 / 314 |
| player / a3 | 10,60 / 9,50 | 23,30 / 18,70 | 105 / 106 |
| player / a4 | 19,70 / 19,00 | 33,20 / 30,90 | 167 / 168 |
| player / a5 | 13,80 / 12,80 | 23,00 / 25,50 | 58 / 58 |
| player / room1 | 18,70 / 15,00 | 37,30 / 31,80 | 91 / 92 |
| projector / overview | 31,30 / 22,00 | 44,10 / 30,20 | 541 / 542 |
| projector / upper | 13,00 / 12,80 | 16,50 / 16,80 | 197 / 198 |
| projector / a3 | 14,30 / 14,70 | 23,50 / 25,00 | 105 / 106 |
| projector / a4 | 25,80 / 20,00 | 38,00 / 28,00 | 167 / 168 |
| projector / a5 | 11,10 / 13,00 | 18,40 / 23,60 | 57 / 57 |
| projector / room1 | 28,30 / 13,90 | 131,30 / 70,10 | 94 / 95 |

### Repetición con orden alternado

El ensayo previo al ajuste de culling mostró variaciones grandes y picos de llamadas de dibujo en algunos focos; se conserva en checks/performance-before-culling.json. Terminadas las compilaciones y la batería completa, se repitieron **los 18 casos**, incluidos los controles del templo, con dos bloques antes/después/después/antes por caso: **144 mediciones finales**, cuatro por estado. Se conservan cámara y recursos; la tabla resume la mediana de las cuatro medianas, no todos los cuadros como una única muestra independiente. El ensayo intermedio con pruebas en segundo plano queda en checks/performance-during-full-suite.json.

| Rol / vista | Antes / después (ms) | Variación | Rango de medianas antes / después (ms) | Mediana de p95 antes / después (ms) |
|---|---:|---:|---:|---:|
| dm / overview | 14,75 / 14,50 | -1,69 % | 14,20–15,70 / 13,90–14,90 | 17,35 / 18,80 |
| dm / upper | 16,50 / 16,95 | 2,73 % | 11,90–21,20 / 14,10–18,90 | 22,10 / 22,20 |
| dm / a3 | 13,10 / 13,70 | 4,58 % | 12,80–13,30 / 13,10–14,10 | 17,45 / 19,25 |
| dm / a4 | 15,90 / 14,95 | -5,97 % | 14,80–19,30 / 14,70–15,60 | 24,85 / 21,20 |
| dm / a5 | 10,20 / 10,60 | 3,92 % | 9,30–11,70 / 9,40–11,90 | 14,70 / 17,50 |
| dm / room1 | 15,85 / 11,45 | -27,76 % | 9,90–19,10 / 9,20–16,20 | 100,95 / 43,30 |
| player / overview | 15,10 / 14,50 | -3,97 % | 14,50–15,70 / 14,00–15,10 | 17,65 / 17,45 |
| player / upper | 18,15 / 18,60 | 2,48 % | 11,20–21,90 / 12,90–20,10 | 22,75 / 24,75 |
| player / a3 | 13,05 / 11,85 | -9,20 % | 10,40–13,60 / 10,60–15,90 | 17,55 / 16,25 |
| player / a4 | 14,70 / 15,45 | 5,10 % | 12,70–15,40 / 15,10–17,70 | 20,80 / 19,55 |
| player / a5 | 10,10 / 10,05 | -0,50 % | 9,20–11,90 / 9,20–12,40 | 13,65 / 14,20 |
| player / room1 | 19,45 / 13,55 | -30,33 % | 9,20–21,90 / 9,30–22,30 | 87,35 / 54,80 |
| projector / overview | 15,75 / 15,55 | -1,27 % | 14,70–19,90 / 14,20–16,70 | 19,40 / 21,50 |
| projector / upper | 15,50 / 16,35 | 5,48 % | 9,20–26,10 / 9,90–20,90 | 21,75 / 21,45 |
| projector / a3 | 12,25 / 13,00 | 6,12 % | 11,60–16,10 / 10,30–14,50 | 18,05 / 21,05 |
| projector / a4 | 14,70 / 15,55 | 5,78 % | 14,20–15,00 / 14,40–16,20 | 20,15 / 20,95 |
| projector / a5 | 11,50 / 12,75 | 10,87 % | 10,80–19,00 / 10,10–17,80 | 20,85 / 18,05 |
| projector / room1 | 19,20 / 14,25 | -25,78 % | 10,50–25,60 / 9,60–16,50 | 96,00 / 82,60 |

Registros de repetición: [144 mediciones finales](<C:/Users/User/Desktop/Dungeons/output/retreat-geography-20261021/g11/evidence/g11-performance-repeat.json>); [Resumen de la repetición](<C:/Users/User/Desktop/Dungeons/output/retreat-geography-20261021/g11/checks/performance-repeat-summary.json>).

Las vistas finales del templo a 25° / 0° descartan la nueva malla: las llamadas de dibujo no aumentan en esa vista. Aun así, sus tiempos varían y hay picos de los dibujos existentes en ambos estados. No se puede atribuir toda diferencia temporal al módulo añadido ni certificar aquí la tolerancia propuesta del 10 %. Se considera pendiente la comprobación sostenida de rendimiento en Q1; no se han añadido efectos para compensar estas cifras. En las vistas generales la pieza añade una llamada de dibujo.

La textura GPU estimada y su variación están en los registros; no se ha medido memoria total del proceso. El incremento geométrico queda dentro del presupuesto de 24.000 triángulos / 18 mallas / 1,5 MiB para las conexiones geográficas del plan.

## Archivos de esta entrega

- [retreat-refinement.ts](<C:/Users/User/Desktop/Dungeons/campaigns/stormwreck-isle/public/retreat-refinement.ts>) — Único archivo existente de producción modificado: importación, material compartido y metadatos de respaldo permanente.
- [retreat-geography.json](<C:/Users/User/Desktop/Dungeons/campaigns/stormwreck-isle/public/retreat-geography.json>) — Manifiesto nuevo de la subfase disponible.
- [retreat_geography_g11_runtime.glb](<C:/Users/User/Desktop/Dungeons/campaigns/stormwreck-isle/public/art/retreat-modules/retreat_geography_g11_runtime.glb>) — Módulo de ejecución integrado en el VTT.
- [retreat_geography_g11.blend](<C:/Users/User/Desktop/Dungeons/prototypes/retreat-geography-20261021/artifacts/retreat_geography_g11.blend>) — Fuente Blender editable; conserva las piezas originales y añade una colección separada.
- [retreat_geography_g11.glb](<C:/Users/User/Desktop/Dungeons/prototypes/retreat-geography-20261021/artifacts/retreat_geography_g11.glb>) — Exportación de referencia con material fuente.
- [build_g11.py](<C:/Users/User/Desktop/Dungeons/prototypes/retreat-geography-20261021/build_g11.py>) — Construcción reproducible desde la fuente A1 original.
- [audit.ts](<C:/Users/User/Desktop/Dungeons/prototypes/retreat-audit-20261021/audit.ts>) — Herramienta de revisión: contexto reutilizable y espera de recursos sin retrasos artificiales por cada cuadro. No es código de juego.
- [review.ts](<C:/Users/User/Desktop/Dungeons/prototypes/retreat-geography-20261021/review.ts>) — Comparativas y diagnóstico aislados, reutilizando el WorldRenderer y la política de cámaras actuales.
- [index.html](<C:/Users/User/Desktop/Dungeons/output/retreat-geography-20261021/g11/index.html>) — Galería de antes/después y resultados de la fase.

## Pendientes y siguientes fases

**Siguiente: G1.2**, unir el respaldo del templo y las coronaciones de A1 con este macizo, conservando las seis celdas, el voladizo de A5, sus arcos y su escalera. Después, **G1.3**, flanco del cabrestante y contexto de la salida Observatorio; luego **G1.4**, costa baja y desembarco.

El templo aún tiene su separación posterior, la casa del cabrestante y los pads costeros necesitan continuidad, y quedan los defectos anteriores de cielo/mar y ocultación por lotes. No se han dado por corregidos en G1.1. El zoom máximo propuesto tampoco se ha aplicado todavía: corresponde a C2. Materiales más elaborados, vegetación y atmósfera siguen su orden posterior.

Esta entrega cierra **el respaldo de A3/A4**, con terreno y datos jugables conservados. No equivale a cerrar toda la integración geográfica del Retiro ni su dirección artística final.
