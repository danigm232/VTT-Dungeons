# Retiro del Dragón · G1.2 · continuidad posterior del templo

**23/10/2026. Entrega parcial del roadmap geográfico.** Base: ampliación A2–A5
entregada el 23/10/2026. Se conserva esa ampliación y se interviene solo en la
roca posterior, siguiendo G1.2.

## Modificación

Se añade una única masa terrestre entre el respaldo del templo y el macizo
central, enlazando por detrás con la meseta que sostiene el frente de A1.
Se reutilizan caras del suelo original `a1:ridge:continuation`, extraídas de la
fuente nativa preservada y exportadas por separado. No se reactiva el lote
completo ni se sustituyen las piezas entregadas.

La masa tiene un contorno irregular, bordes lejanos descendentes y una zona de
solapamiento con los respaldos existentes. Su encuentro oriental se ajusta a la
superficie real de G1.1. La geometría es permanente: permanece visible cuando
el VTT oculta los techos locales.

**La pieza nueva es VTT_AMBIENCE.** Las funciones, habitaciones, personajes,
puertas y acontecimientos canónicos no cambian. El contorno decorativo nuevo
no se atribuye al mapa oficial ni crea espacios transitables.

## Conservación

- Las **983 mallas nativas previas** conservan sus huellas de geometría, matrices,
  materiales y UV. Incluyen las **128 mallas originales A1**, con sus seis celdas
  y su mobiliario, y las ampliaciones A2–A5.
- **980 casillas**, diez superficies y **15 conexiones** sin cambios. Los archivos
  de navegación, obstáculos, puntos de interacción y guardados no se modifican.
- Escala de 1,5 m por casilla y alturas existentes conservadas.
- Se mantiene el templo ampliado de 162 m², su cubierta, las ocho columnas,
  Bahamut, los siete canarios, los arcos y la escalera de 18 a 27 m.
- La masa queda por detrás del saliente y de los arcos. No rellena el espacio
  marino bajo sus extremos ni proporciona suelo bajo el palé del cabrestante.
- La reserva horizontal mínima entre el contorno nuevo y el suelo navegable es
  **1,20 m**, superior al margen de 0,60 m del roadmap.
- Se reutilizan el cargador, el material de basalto, la iluminación, la cámara,
  la ocultación y el movimiento del proyecto.
- Sin nuevos controles del DM, colliders, luces, texturas ni mapas de sombra.
- Las pruebas y los dados permanecen en manos del DM.

## Auditoría e iteraciones

1. Se revisan la fuente Blender de la ampliación, el inventario, las reservas,
   los archivos de navegación y el roadmap. El respaldo del templo todavía
   terminaba como una masa aislada respecto a G1.1.
2. El primer ensayo enlazaba demasiado pronto con la falda occidental baja de
   G1.1. La vista general mostraba una hendidura artificial entre ambos relieves.
3. Se extiende el solapamiento hacia el interior del respaldo existente y se
   ajusta la unión respecto a su superficie real en el borde de encuentro.
4. Se bajan los bordes lejanos para reducir la lectura de una plataforma alta
   extruida. Se mantiene el frente necesario para enlazar por detrás de la
   escalera, sin acercarlo al suelo jugable.
5. Se repiten validación de GLB, integridad de malla, reserva y recorrido físico
   sobre la versión corregida. Las capturas finales usan esa versión.

Referencias geológicas consultadas el 23/10/2026: [NPS · Columnar Jointing](https://www.nps.gov/subjects/volcanoes/columnar-jointing.htm)
y [USGS · Sheepeater Cliffs](https://www.usgs.gov/observatories/yvo/news/spectacular-columns-sheepeater-cliffs).
Inspiran las variaciones amplias y los encuentros del basalto. No añaden
información narrativa ni nuevos lugares a la aventura.

## Comprobaciones funcionales y geométricas

| Comprobación | Resultado |
|---|---|
| Pruebas seleccionadas de Retiro, movimiento, cámaras y terreno | **69/69 aprobadas** |
| Recorrido mediante el movimiento autoritativo del VTT | **1.580 pasos** |
| Muestras contra los obstáculos físicos de las rutas | **60.869, sin colisiones** |
| Posiciones contrastadas con los triángulos reales del GLB nuevo | **5.456, sin colisiones** |
| Volumen corporal en el contraste geométrico | Radio 0,30 m, cuatro alturas, 16 direcciones |
| Puertas cerradas y apertura manual | **2/2** |
| Puntos de interacción recorridos | **13/13** |
| Conservación de partidas anteriores | Correcta |
| Suelo navegable reservado | **980 casillas, sin invasiones** |
| Validación de GLB completo y de ejecución | **0 errores, 0 advertencias** |
| Integridad de la malla | Sin triángulos degenerados, duplicados, bordes abiertos ni no-manifold |
| Color/UV | Valores finitos, escala métrica y alfa completamente opaco |
| Comprobación de tipos de cliente y servidor | Correcta |
| Compilación aislada del cliente | Correcta |

No se repite la batería completa de otros escenarios. El alcance de esta
entrega es el Retiro y sus sistemas compartidos directamente afectados.

## Coste de recursos

- **Una malla nueva**, 4.064 triángulos, **410.360 bytes** en ejecución.
- G1.1 + G1.2: **dos mallas, 7.510 triángulos y 710.628 bytes**.
- Se mantiene el presupuesto geográfico conjunto de 24.000 triángulos,
  18 mallas y 1,5 MiB.
- Material y texturas compartidos; sin nuevos emisores de sombras.
- Se conserva el descarte por caja y esfera del cargador geográfico existente.
- Las mediciones de renderizado alternan antes/después en la misma escena
  cargada, tras terminar pruebas y compilaciones; los resultados se guardan
  en `checks/visual-performance-verification.json`.

## Medición local por rol

Matriz inicial: 144 mediciones, cuatro por estado y caso, en secuencia ABBA
repetida dos veces. Cada medición descarta ocho fotogramas de calentamiento y
temporiza 24 renderizados con finalización explícita de GPU, a 1280 × 720.
Las cámaras coinciden exactamente dentro de cada caso.

| Rol | Vista | Mediana antes → después (ms) | Cambio | p95 antes → después (ms) | Dibujos añadidos |
|---|---|---|---|---|---|
| dm | overview | 16,85 → 16,85 | -0.0 % | 22,65 → 21,95 | +1 |
| dm | a5 | 9,00 → 7,40 | -17.8 % | 58,55 → 31,30 | +1 |
| dm | a1 | 15,35 → 14,90 | -2.9 % | 78,75 → 64,30 | +1 |
| dm | upper | 18,95 → 19,05 | +0.5 % | 24,50 → 22,90 | +1 |
| dm | a3 | 20,25 → 16,50 | -18.5 % | 26,75 → 21,40 | +1 |
| dm | a2 | 10,90 → 9,25 | -15.1 % | 20,80 → 15,95 | +0 |
| player | overview | 17,60 → 17,20 | -2.3 % | 20,85 → 22,45 | +1 |
| player | a5 | 8,85 → 7,55 | -14.7 % | 70,30 → 33,00 | +1 |
| player | a1 | 12,35 → 12,40 | +0.4 % | 80,05 → 81,90 | +1 |
| player | upper | 21,15 → 21,60 | +2.1 % | 28,35 → 30,20 | +1 |
| player | a3 | 19,15 → 16,10 | -15.9 % | 26,75 → 22,35 | +1 |
| player | a2 | 8,70 → 8,70 | +0.0 % | 14,60 → 15,45 | +0 |
| projector | overview | 17,20 → 18,30 | +6.4 % | 21,75 → 21,25 | +1 |
| projector | a5 | 10,70 → 7,50 | -29.9 % | 66,30 → 30,20 | +1 |
| projector | a1 | 10,25 → 13,75 | +34.1 % | 69,45 → 84,95 | +1 |
| projector | upper | 15,70 → 16,55 | +5.4 % | 23,75 → 21,10 | +1 |
| projector | a3 | 19,85 → 19,90 | +0.3 % | 25,60 → 22,90 | +1 |
| projector | a2 | 9,05 → 9,65 | +6.6 % | 14,60 → 17,85 | +0 |

La primera matriz deja 17 de los 18 casos dentro del objetivo del +10 %.
A1/proyector registra +34,1 %, por lo que se repite junto a A2 como control,
manteniendo los datos iniciales. La repetición usa una segunda carga del
visor y ocho bloques ABBA/BAAB equilibrados por vista: **64 mediciones**,
16 por estado y vista.

| Repetición proyector | Mediana antes → después (ms) | Cambio | p95 antes → después (ms) |
|---|---|---|---|
| a1 | 15,95 → 16,55 | +3.8 % | 63,45 → 62,30 |
| a2 | 9,10 → 9,95 | +9.3 % | 15,80 → 16,15 |

La repetición sitúa ambos casos dentro del objetivo. Los picos y la dispersión
aparecen también con la pieza desactivada, especialmente en A1. El coste
estructural observado es un dibujo adicional cuando la pieza entra en cámara,
y cero en A2. El seguimiento de p95 y FPS sostenidos continúa en Q1.

Activar G1.2 mantiene el mismo número de texturas y la misma estimación de
memoria en cada sesión: 63 y 82,42 MiB en la matriz inicial; 61 y 80,94 MiB
en la repetición. Estas cifras estiman las texturas cargadas y sus mipmaps;
no miden la memoria residente total del proceso ni certifican otros equipos.

Resultados completos: [visual-performance-verification.json](<C:/Users/User/Desktop/Dungeons/output/retreat-geography-g12-20261023/checks/visual-performance-verification.json>).

## Evidencias visuales

Galería: `output/retreat-geography-g12-20261023/index.html`.
Visor: `http://127.0.0.1:4611/review.html`.

La comparativa activa y desactiva únicamente la pieza G1.2. Conserva los mismos
recursos cargados, actor, tiempo, clima y cámara. Se cubren conjunto, templo,
plaza A1 y acceso superior con cinco inclinaciones de 5° a 25°, cinco giros
de −30° a +30° y tres distancias locales. El conjunto usa su encuadre completo.

Las seis celdas se comparan aparte a 25° y en los cinco giros, verificando que
la nueva roca no altere la visibilidad de su mobiliario. Se comprueban los
rayos hacia pies, piernas, torso y cabeza contra la pieza añadida.

**Resultado:** 250 pares de la matriz y 30 pares de las seis celdas:
**560 fotografías**. Diferencia de cámara antes/después: **0**. Sin nuevas
oclusiones corporales de G1.2 en los rayos comprobados y sin cambios de
visibilidad del mobiliario de A1. Se conserva la ocultación previa del VTT;
las incidencias locales ya previstas en O1 siguen su orden.

| Encuadre | Antes | Después |
|---|---|---|
| Conjunto | [Antes](<C:/Users/User/Desktop/Dungeons/output/retreat-geography-g12-20261023/evidence/g12-overview-t25-y0-zfull-before.jpg>) | [Después](<C:/Users/User/Desktop/Dungeons/output/retreat-geography-g12-20261023/evidence/g12-overview-t25-y0-zfull-after.jpg>) |
| Templo y arcos | [Antes](<C:/Users/User/Desktop/Dungeons/output/retreat-geography-g12-20261023/evidence/g12-a5-t5-y-30-zfar-before.jpg>) | [Después](<C:/Users/User/Desktop/Dungeons/output/retreat-geography-g12-20261023/evidence/g12-a5-t5-y-30-zfar-after.jpg>) |
| Escalera superior | [Antes](<C:/Users/User/Desktop/Dungeons/output/retreat-geography-g12-20261023/evidence/g12-upper-t20-y0-zfar-before.jpg>) | [Después](<C:/Users/User/Desktop/Dungeons/output/retreat-geography-g12-20261023/evidence/g12-upper-t20-y0-zfar-after.jpg>) |
| Plaza y celdas | [Antes](<C:/Users/User/Desktop/Dungeons/output/retreat-geography-g12-20261023/evidence/g12-a1-t25-y0-zfar-before.jpg>) | [Después](<C:/Users/User/Desktop/Dungeons/output/retreat-geography-g12-20261023/evidence/g12-a1-t25-y0-zfar-after.jpg>) |

## Archivos

### Fuentes del VTT

- `campaigns/stormwreck-isle/public/retreat-refinement.ts`: carga la segunda pieza
  geográfica con el mismo propietario, material compartido y metadatos.
- `campaigns/stormwreck-isle/public/retreat-geography.json`: etapa disponible 2
  y registro de G1.2.
- `campaigns/stormwreck-isle/public/art/retreat-modules/retreat_geography_g12_runtime.glb`:
  única geometría nueva publicada.

De los 383 archivos existentes protegidos para esta intervención, solo cambian
los dos archivos de configuración/carga anteriores. Los archivos previos de
modelos, navegación y lógica de juego permanecen iguales.

### Fuente nativa, herramientas y pruebas

- `prototypes/retreat-geography-g12-20261023/artifacts/retreat_geography_g12.blend`:
  escena entregada más la colección geográfica nueva.
- `prototypes/retreat-geography-g12-20261023/artifacts/retreat_geography_g12.glb`:
  exportación completa con material de referencia.
- `prototypes/retreat-geography-g12-20261023/build_g12.py`: extracción, modelado
  de la unión, exportación y huellas de conservación reproducibles.
- `prototypes/retreat-geography-g12-20261023/`: plan, inventario del encuentro,
  validadores y visor, reutilizando el renderizador y el marco de revisión existentes.
- `output/retreat-geography-g12-20261023/checks/`: verificaciones, pruebas y medidas.
- `runtime/retreat-geography-g12-20261023/client/`: compilación aislada de revisión.

## Pendiente y siguiente

**G1.3:** unir el flanco posterior del cabrestante y el contexto de la salida
al Observatorio. Después, **G1.4:** naturalizar la costa baja y el desembarco.

El mar/cielo a ángulos rasantes, el límite de zoom del jugador, la ocultación
local más fina y los acabados posteriores de roca y arquitectura siguen en sus
subfases del roadmap. Esta entrega resuelve la continuidad posterior occidental;
no cierra la mejora artística integral ni certifica FPS sostenidos en otros equipos.
