# Ficha de ejecución del Retiro del Dragón — revisión 19

**Entrada general: [roadmap maestro ROADMAP_V1.md](../../ROADMAP_V1.md).** Esta ficha conserva autoridad sobre el orden, contratos y estado técnico local del Retiro. No es otro roadmap maestro del proyecto; el nombre del archivo y sus fases se mantienen para no romper referencias.

**Fecha inicial:** 23/10/2026. **Actualización técnica:** 30/10/2026. **Autoridad de planificación local del Retiro:** este documento. Jerarquía aclarada el 01/11/2026, sin una nueva revisión técnica.
**Proyecto:** `C:/Users/User/Desktop/Dungeons`. **Campaña:** `stormwreck-isle`.
**Escena:** `dragon-rest`. **Entrada de dirección:** `http://localhost:3000/dm`.

**Complemento artístico común, 01/11/2026:** leer [dirección artística](../design/VISUAL_ART_DIRECTION.md), [roadmap visual](../VISUAL_ROADMAP.md) y [biblioteca moderna](../design/VISUAL_REFERENCE_LIBRARY.md) al iniciar un bloque gráfico. Conservar revisión 19, orden autorizado, fases terminadas, ampliaciones y referencias aprobadas del 25/10. Se armoniza el acabado de materiales, muebles, plantas, luz y profundidad en la siguiente subfase pertinente; no se reinicia A1–A5, SAL o Q1 ni se impone otra geografía/cámara. Esta inserción es documental y no publica una revisión del juego.

## 0. Instrucción de arranque para otro chat

**Entrega artística 02/11:** primera muestra real de basalto/roble/pavimento y actor/luz, con piedra continua compartida para evitar un parche A3. [Registro](../evidence/STORMWRECK_STYLE_SKULL_20261102.md) y `REVISAR-ACABADO.cmd`. Se conserva revisión 19; muebles/plantas no se remodelan ni se cierra Q1. Aceptación de muestra pendiente. Esta nota actualiza la subentrega sin crear otra revisión técnica del Retiro.

**Nuevo bloque artístico, 01/11/2026:** el usuario elige Retiro y Pecio como primeras mejoras de la dirección común. Se parte de la revisión 19 y sus avances. La primera subentrega VA-10/11 adapta el color de los personajes a las luces actuales; no reconstruye celdas, mobiliario, paisaje, sombras o navegación, ni repite Q1. [Registro y continuación](../evidence/STORMWRECK_VISUAL_START_20261101.md). La muestra completa de familias de arte sigue pendiente; no confundir este bloque con aceptación final o con una nueva certificación Q1.

1. Leer esta ficha completa, después `docs/design/RETREAT_NEXT_CHAT_HANDOFF_20261023.md` y el nuevo detalle `docs/design/RETREAT_DEPARTURE_LANDSCAPE_PLAN_20261025.md`.
2. Abrir T03 y T04 en `output/retreat-g25-20261023/`: planta y perfiles construidos. T01/T02 en `output/retreat-technical-masterplan-20261023/` son la propuesta histórica.
3. Comprobar los archivos actuales: la base funcional está cerrada al24/10; la revisión de paisaje SAL se propone el25/10. No restaurar versiones anteriores por sus nombres.
4. T01/T02 son la propuesta histórica. La ejecución G2 publica geometría y navegación aditivas; consultar T03/T04 y los informes actuales antes de modificarla.
5. Estado vigente: tercer pase de15correcciones y optimización conservadora publicados en3000. Leer docs/evidence/RETREAT_CORRECTIONS3_20261029.md y prototypes/retreat-corrections3-20261028/STATE.md. Q1.4 prolongada y carga selectiva profunda siguen pendientes; no rehacer los avances.
6. Trabajar una subfase cada vez. Entregar imágenes antes/después y resultados; esperar revisión conceptual al cerrar la subfase antes de modelar la siguiente.
7. Una instrucción posterior explícita del usuario puede autorizar varias subfases consecutivas; aun así documentarlas y validarlas por separado.

**Hito de optimización conservado — Q1.3a,27/10:** **Q1.3a publicada y medida** en3000, candidata `runtime/prepared-retreat-q13-20261027a`,PID11952. Se acelera el cálculo exacto de normales del agua y se omite el cálculo descartado de la espuma sin atributo; si este se añade, se calcula como antes. Sin recortes gráficos, nuevas mallas, luces, sombras o colliders. Informe `docs/evidence/RETREAT_Q13_20261027.md`; galería `output/retreat-q13-20261027/index.html`; estado `prototypes/retreat-q13-20261027/STATE.md`.18pruebas/5archivos,144estados/10.996.128valores exactamente iguales,90parejas/904firmas estáticas,50vistas funcionales,3retornos,12.242pasos/746.804muestras.58GLB y11grupos del guardado intactos;557inputs congelados/52GLB compilados. A1 43.73→44.27FPS,p95 37.30→37.15ms,CPU de normales−88.77%; A4 40.53→42.24FPS,p95 36.90→35.05ms,CPU de normales−86.18%. Una misma escena cargada,8bloques visibles de60s,10s de calentamiento,ordenABBA por foco,sin compilación concurrente y calidad de escritorio idéntica. O1Q1.2 activo en ambos estados. Medias de estadísticas de dos bloques, no certificación global. Caché adicional deCPU:75.264bytes de tablas en escritorio/31.104en compacto;sin nuevos recursos gráficos. Q1global sigue abierta. Al retomar Q1 tras las correcciones visuales y la auditoría global, Q1.3b: carga selectiva de respaldos y trabajo oculto por terreno; después certificaciónQ1.4. No repetir Q1.1/Q1.2/Q1.3a ni reconstruir el mapa.

Esta revisión sustituye al roadmap del 21/10/2026 y al orden preliminar de la propuesta insular. Los informes antiguos permanecen como evidencia histórica; sus «siguientes tareas» no prevalecen sobre este documento.

**Prioridad vigente del usuario — 24/10/2026, conservada el25/10:** dejar la optimización para el final, en Q1. Hasta entonces, priorizar construcción, calidad visual y jugabilidad por zonas. La deuda de FPS y memoria ya registrada no bloquea los acabados ni requiere repetir largas baterías de rendimiento en cada entrega. Conservar las comprobaciones funcionales, navegación, visibilidad y guardados; reutilizar recursos y corregir fallos que impidan cargar o jugar. La optimización y su certificación se realizan después de A1 → A3 → A4 → A2 → A5 → SAL-0…SAL-5 → M1 → E1 → L1.

**Excepción autorizada el25/10:** Q0 es una pasada acotada de trabajo invisible/recursos. Se conserva toda la calidad y el orden artístico. Q1 sigue al final para oclusión por terreno, partición/streaming, ajuste de sombras y certificación prolongada. No interpretarQ0 como autorización de nuevos recortes gráficos.

## 0. Estado vigente · tercer pase y optimización conservadora publicados

Petición de 15 puntos del 28/10, publicada el 29/10 y cierre documental el 30/10. Informe: docs/evidence/RETREAT_CORRECTIONS3_20261029.md. Estado reproducible: prototypes/retreat-corrections3-20261028/STATE.md. Galería: output/retreat-corrections3-20261028/index.html. Candidata final **runtime/prepared-retreat-corrections3-20261029c**; las candidatas a/b son intermedias y no se publican.

Terminados: superficies sin dientes y normales de escalera;circulación A1/A2 y claros;pasillo exterior7,5m;ampliaciones laterales A3/A4;puertas/jambas e interiores visibles,incluida cocina;columnas en cuatro esquinas;86árboles y31jardineras,cuerdas,bancos/antorchas;muelle,bote con embarque/remada y cabrestante animado con seguimiento. Decisiones narrativas,dados y viajes siguen manuales. Seis celdas y mobiliario exactos.

Optimización: paisaje1.008→663mallas conservando1.330.769triángulos;materiales originales y límites conservados,predecesores desactivados liberados,menos trabajo estático y bote fuera de cámara en pausa. Inventario de escena2.673→2.140nodos. No se reducen78texturas,23luces,sombras,mar o resolución. El derivado conserva materiales y UV originales;no hay compresión con pérdida ni streaming completo.

Validación:175pruebas/32archivos,675vistas y108comprobaciones de cuerpo;1.596casillas/13superficies/126conexiones;2.670bordes y283.860muestras sobre suelo real,sin huecos.187GLB y25JSON originales,71mallas de celdas exactas,cinco archivos DM ajenos exactos.73GLB compilados y2685inputs congelados. Guardado v5,11grupos protegidos,recolocaciones necesarias:0. Cierre seguro,copia privada,3000verificado.

Medida controlada: cuatro focos contrastados **25,1 → 25,1 FPS**, sin mejora global acreditada; trece focos finales medidos 20 s cada uno. Tiempo de actualización del Retiro: **−24,7 %** como promedio de cuatro medianas, sin representar toda la CPU. Las otras nueve vistas no tienen referencia próxima comparable. No usar esta cifra como FPS garantizado en todas las ventanas o condiciones.

**Siguiente Q1.4:** priorizar biblioteca y room1, repetir contraste ABBA y estudiar percentiles de fotograma. El promedio FPS de los cuatro focos queda estable; el tiempo de actualización de Retiro baja 24.7 %. No declarar ganancia global ni ahorro de memoria total. Certificar después recorridos prolongados, variantes de ventana/hora/clima, regresos a zonas ocultas y memoria GPU/proceso; después carga selectiva de paquetes que aún se importan antes de sustituirse. Revisar artísticamente con el usuario sin reconstruir celdas ni revertir estas correcciones. Las autorizaciones anteriores de lote completo y optimización prevalecen sobre la espera histórica.

## 0. Antecedente · segunda pasada visual A1–A5 y entorno

Petición del28/10: revisar y mejorar cada zona antes de continuar la optimización. Entrega publicada en3000 mediante `runtime/prepared-retreat-visual-round2-20261028b`. Informe `docs/evidence/RETREAT_VISUAL_ROUND2_20261028.md`; galería `output/retreat-visual-round2-20261028/index.html`; estado `prototypes/retreat-visual-round2-20261028/STATE.md`.

| Zona | Hallazgo y corrección aplicada | Conservación |
|---|---|---|
| A1 / acantilado | La reproyección por normal de cada vértice mezclaba planos dentro del mismo triángulo y producía bandas. Se recuperan las UV originales de roca nativa. | Seis celdas, mobiliario, posiciones, normales, colores, índices y matrices intactos. Cambian solo las UV de36mallas de roca; no reconstruirlas. |
| A2 | Acabado demasiado uniforme entre tablones, testas y elementos estructurales. Tres acabados comparten las mismas imágenes de madera. | Mecanismo, cadena, palé, accesos, tejado y huella sin cambios. |
| A3 | Madera e iluminación interior planas. Variación sobria de acabados y ajuste del relleno existente. | Mesa larga, dos bancos, una silla, cocina/pasillo y circulación conservados. La entrada actual resultó visible: no se alteró O1. |
| A4 | Libros demasiado repetitivos.27pilas bajas y54rollos en huecos existentes, variación de madera y ajuste del relleno. Dintel fijo incluido en la ocultación frontal existente para evitar tapar la cara. | Veinte estanterías, tres independientes, huellas, puerta, pasillos y colisiones originales. |
| A5 | Columnas sin relieve y pedestal con patrón de pavimento.16acanaladuras leves por fuste; piedra fina compartida para estatua, pedestal y columnas. | Cuatro columnas perimetrales; siete canarios, tres arcos, cuatro ofrendas, suelo, cubierta, ocultación y puente conservados. |
| Costa / bosquetes / salidas | Copas de8pinos existentes menos simétricas; soporte cerrado bajo Pleamar baja y su unión con playa. Continuación escénica curva de8,285m rodeando la roca. | Troncos, anclas, bordes y navegación exactos. La continuación fuera del ancla sigue siendo escénica: viaje manual del DM. |

87pruebas/11archivos;675encuadres de tres roles;36vistas interiores sin bloqueo opaco,2.262muestras A5,cubierta oculta/restaurada y flotación comprobada;42recorridos de ida/vuelta,12.226pasos y745.842muestras físicas.183GLB originales exactos,4derivados nuevos,63GLB compilados y2.213inputs congelados. Navegación1.349casillas/13superficies/68conexiones y31fuentes de terreno/layout/viaje protegidas. El guardado conserva sus11grupos semánticos y versión4. Fuentes Blender y verificadores reproducibles en la carpeta de estado. Las capturas aisladas son al mediodía y no cambian hora/clima ni posiciones de la partida real. Candidata a intermedia; b es la definitiva publicada.

**Siguiente:** revisión visual del usuario con comparativas. Después, si se retoma Q1, medir todas las zonas y recorridos con la versión publicada: Q1.3b(carga selectiva y trabajo oculto), luego Q1.4(certificación sostenida). No usar FPS de estas capturas ni cifras históricas como FPS actuales. No hay recortes de luces, sombras, resolución ni detalle por este lote. Persisten perfiles ortogonales heredados y vegetación simplificada; esta entrega no declara acabado artístico final ni cumplimiento fotográfico de la propuesta.

## 0. Antecedente · V1–V5 cerradas

El usuario autorizó continuar hastaV4 y después amplió expresamente hastaV5. V2–V5 validadas por separado y publicadas en3000: runtime/prepared-retreat-v25-20261027b. Informe docs/evidence/RETREAT_VISUAL_V2_V5_20261027.md; galería output/retreat-v2-v4-20261027/index.html; estado prototypes/retreat-v2-v4-20261027/STATE.md.

V2 biblioteca/jardín; V3 templo/puente; V4 cuerdas/bordes/jardineras/Pleamar; V5 costa/raíces/bote. Se mantienen las correcciones V1. Runtime1.349casillas/13superficies/68conexiones; soloA5 cambia por ampliación autorizada:72direcciones conservadas+17altas. JSON de terreno original intacto. 53pruebas/9archivos,918vistas;176GLB originales y71piezas estáticas de celdas exactos;11grupos del guardado preservados.

**Siguiente histórico, sustituido por el cierre superior:** revisión artística y auditoría sostenida global deFPS/memoria en todas las zonas y recorridos, después continuación Q1. No repetir Q1.1/Q1.2/Q1.3a ni declarar unFPS actual usando cifras históricas. Los controles narrativos y viajes siguen manuales.

## 1. Decisiones fijadas por el usuario

| Decisión | Consecuencia obligatoria |
|---|---|
| Embarcadero a la derecha | Conservar su posición en el juego y mostrarlo a la derecha en T01/T02. No trasladarlo para coincidir con el PDF. |
| Arquitectura actual aceptada aunque esté invertida respecto al mapa oficial | No girar, reflejar, redistribuir ni reconstruir A1–A5. El canon fija funciones y acontecimientos; esta orientación es una adaptación autorizada del proyecto. |
| Mejorar lo construido | G1, ampliaciones A2–A5, seis celdas y mobiliario son base obligatoria. |
| El Retiro pertenece a una isla mayor | Añadir continuidad del interior insular y comienzos físicos de viaje; conservar el frente marítimo. No crear un puente a la costa continental. |
| Planificación por fases | Conservar evidencias y cerrar cada ficha. No declarar una fase completa con regresiones importantes. |

Las ampliaciones aprobadas ya forman parte de la base: biblioteca/comedor ampliados y separados, suelo de A2 duplicado, suelo de A5 duplicado y columnas grandes. No duplicarlos de nuevo. Las proporciones exportadas actuales prevalecen sobre medidas esquemáticas de las láminas.

## 2. Fuentes, canon y límites de interpretación

**Fuente oficial:** `OneDrive_1_12-9-2026/Aventura Los Dragones de la Isla de las Tempestades.pdf`.
Referencias: mapa regional 1 p. 5; capítulo 1 pp. 6–12; mapa local 2 p. 11; viajes pp. 17, 23 y 29.
No confundir con D8 Night ni con otra aventura del repositorio.

**CANON:** enclave monástico costero, seis celdas excavadas, comedor con mesa larga/dos bancos/una silla, cocina conectada por pasillo, biblioteca con puerta y estanterías, casa del cabrestante, templo abierto de Bahamut con anciano y siete canarios, PNJ y acontecimientos de la aventura. Conservar el encuentro de tres zombis, descanso, conversación, investigación y preparación de expediciones con resolución del DM.

**ADAPTACIÓN AUTORIZADA:** orientación arquitectónica actual, embarcadero a la derecha, ampliaciones ya construidas y columnas mayores. No presentarlas como reproducción métrica literal del PDF.

**VTT_AMBIENCE:** perfiles concretos de lomas, curvas de caminos locales, bosquete, vegetación de transición, costuras de roca, iluminación y límites de escena. El PDF no define esas coordenadas.

Los rumbos regionales no son lados de pantalla. Pleamar está al suroeste regional; Observatorio al sureste; pecio al norte/noroeste. Las sendas pueden curvarse fuera del encuadre para alcanzar esos rumbos. No reflejar la isla oficial para justificar la disposición local.

## 3. Lectura de T01 y T02

| Lámina | Contenido y precisión |
|---|---|
| T01 — planta | Huella de las 980 casillas del terreno actual, obstáculos simplificados, zonas y anclas existentes. Los volúmenes de roca entre suelos se omiten: el vacío del dibujo no significa agua. El rayado verde es una reserva conceptual; las líneas discontinuas son hipótesis de corredores sin alturas resueltas. No constituyen navegación nueva. |
| T02 — alzado frontal | Vista desde el mar, de +Z hacia −Z, mismo orden horizontal que T01. Solo las cotas de suelo están medidas. Cubiertas, portales, columnas, palé y perfil rocoso son símbolos de volumen; no dimensionar modelos desde ellos. |

Archivos: `output/retreat-technical-masterplan-20261023/T01-planta.png`, `T02-alzado.png` y versiones `.svg` editables.
Manifiesto: `technical-manifest.json`. Generador: `prototypes/retreat-technical-masterplan-20261023/build_drawings.py`.

**Construido en G2:** T03-planta-construida y T04-perfiles-construidos, con PNG/SVG y `as-built-manifest.json` en `output/retreat-g25-20261023/`. T03 recoge las 1.142 casillas publicadas; T04, los cuatro ejes de ruta con cotas reales. No son un levantamiento de toda la costa ni sustituyen las huellas arquitectónicas de los GLB. Sus escalas están declaradas en cada lámina; no aplicarles las fórmulas de T01/T02.

**Coordenadas:** metros; X/Z en planta, Y vertical. Centro de casilla: `X=(col+0,5)*1,5`, `Z=(row+0,5)*1,5`.
La proyección de dibujo es `u=1280−6X`, `v=275+6Z`: X aumenta a la izquierda y Z hacia abajo.
El alzado usa `u=1280−6X`, `v=856−12Y`; exageración vertical **×2** declarada. Estas fórmulas solo dibujan: no transforman la escena ni sus guardados.
No asignar «norte geográfico» al borde superior por deducción de una captura.

## 4. Base protegida y comprobable

Base protegida de R0: conteos originales de terreno/ensamblaje; puertas, interacciones y piezas contrastadas con O1. G2 conserva esta base y publica las altas indicadas debajo:

| Elemento | Base vigente | Regla de conservación |
|---|---:|---|
| Escala | 1,5 m/casilla | No modificar. |
| Rejilla lógica | 112 columnas × 80 filas; versión 2 | No mover origen ni renumerar casillas existentes. |
| Casillas de terreno | 980 | Preservar cada registro original; G2 puede añadir registros. |
| Superficies | 10 | Conservar IDs; ampliar de forma aditiva y documentada. |
| Transiciones | 15 | Conservar extremos/modos; conexiones nuevas con IDs/definiciones sin conflicto. |
| Obstáculos de terreno | 87 | Conservar los originales; no confundir con las cajas de ensamblaje. |
| Bordes bloqueados | 34 | Conservar. El recuento histórico de 33 ya no es la base actual. |
| Trayectorias de borde `edgePaths` | 1001 | Verificar por contenido, no solo por número. |
| Cajas de ensamblaje `collisionBoxes` | 72 | Registro distinto de los 87 obstáculos. No sumarlos como si fueran colliders duplicados. |
| Puertas funcionales / puntos de interacción | 2 / 13 | Mantener estados, IDs y comportamiento; futuras altas separadas. |
| Celdas monásticas / mallas originales A1 | 6 / 128 | Geometría, muebles, índices, matrices, materiales y distribución protegidos. |
| Formato de guardado | versión 3 | No migrar por conveniencia ni editar partidas/locks manualmente. |

**Importante:** «conservar 980» significa mantener ese subconjunto exactamente. No significa impedir que la navegación crezca al crear los senderos. Comparar por identidad y contenido; un recuento total igual puede ocultar sustituciones.

**Publicado en G2:** 1.142 casillas = 980 originales exactas +162 nuevas; 13 superficies y 18 conexiones. Altas: 30 casillas de Pleamar baja, 50 alta y 82 del Observatorio. Los 13 actores originales se conservan; cuatro alias de lugar elevan a 17 las definiciones de interacción sin crear PNJ persistentes. Guardado v3 y rejilla v2 sin migración.

Anclas originales, todas inmutables:

| Uso | Superficie | Casilla col,row | Centro X,Z | Y de suelo |
|---|---|---|---|---:|
| Llegada / spawn | beach | 16,74 | 24,75 / 111,75 | +0,25 |
| Barca | beach | 13,75 | 20,25 / 113,25 | +0,25 |
| Pleamar | pleamar | 3,74 | 5,25 / 111,75 | +0,25 |
| Observatorio | observatorio | 93,33 | 140,25 / 50,25 | +18 |
| Puerta A2 | a2 | 105,45 | 158,25 / 68,25 | +15 |
| Cabrestante | a2 | 107,45 | 161,25 / 68,25 | +15 |
| Comedor | a3 | 79,40 | 119,25 / 60,75 | +18 |
| Biblioteca | a4 | 68,39 | 102,75 / 59,25 | +18 |
| Puerta A4 | a4 | 68,42 | 102,75 / 63,75 | +18 |
| Templo | a5 | 27,43 | 41,25 / 65,25 | +27 |

Cotas y reservas de huella actuales, no nuevas dimensiones a imponer:

| Zona | Rango X | Rango Z | Suelo |
|---|---|---|---|
| A1 + plaza/celdas | 73,5–142,5 | 76,5–99 | +9 m |
| A2, huella ampliada | 158,6–163,8 | 64,7–69,3 | +15 m |
| A3, huella ampliada | 113,7–129,3 | 50,7–65,3 | +18 m |
| A4, huella ampliada | 92,7–111,3 | 52,2–65,3 | +18 m |
| A5, huella ampliada | 34,2–49,5 | 62,5–76,8 | +27 m |
| Salida Observatorio actual | 139,5–142,5 | 49,5–64,5 | +18 m |
| Salida Pleamar actual | 4,5–18 | 111–114 | +0,25 m |

La huella arquitectónica y el conjunto de casillas transitables no son el mismo polígono. Extraer dimensiones exactas del módulo GLB vigente cuando se trabaje en una junta.
Radio de actor de referencia: 0,30 m. La reserva decorativa mínima es el suelo actual dilatado 0,60 m en planta más el volumen corporal real de los sprites usados. El margen no sustituye a colliders ni comprueba altura por sí solo.

## 5. Sistemas existentes: propietarios y archivos

Todas las rutas de esta sección son relativas a `C:/Users/User/Desktop/Dungeons/`.

| Necesidad | Propietario existente / instrucción |
|---|---|
| Escena, actores, acciones y puerto | `campaigns/stormwreck-isle/public/retreat-runtime.ts`. Mantener datos públicos/privados de PNJ y zombis separados. |
| Terreno de movimiento | `.../retreat-terrain-v2.json`; compiladores actuales de `engine/shared/terrain.ts` y navegación espacial. No crear otro controlador de movimiento. |
| Ensamblaje/anclas | `.../retreat-zones/global-layout.json`; `.../retreat-expansion.ts` y `.json`. No desplazar placements. |
| Importación visual / puertas / palé | `.../retreat-global-visuals.ts`. Verificar sincronización con estados existentes. |
| Envolvente y recursos | `.../retreat-refinement.ts`; `.../retreat-geography.json`. Nuevas piezas por módulos; un solo propietario de carga y liberación. |
| Materiales, costa, luz y fondo | `.../retreat-refinement-materials.ts`, `retreat-refinement-coast.ts`, `retreat-refinement-lighting.ts`, `retreat-scenic-depth.ts`. Reutilizar recursos. |
| Oclusión y niebla | `.../retreat-local-occlusion.ts`, `retreat-weather-visibility.ts`. No volver a esconder el lote completo de muebles ni poner niebla sobre la reserva táctica. |
| Cámara y roles | `.../retreat-camera-composition.ts`, `apps/web/world.ts`, helpers de `engine/client/`. Cambio específico del Retiro antes que modificación global. |
| Celdas originales | `campaigns/camp-rests/public/a1-layout.ts`, `a1-visuals.ts`; fuente `prototypes/retreat-a1-preserved/artifacts/retreat_a1_preserved.blend`. Consulta, no rediseño. |
| Catálogo de destinos | `campaigns/stormwreck-isle/public/pack.ts` + `campaigns/camp-rests/public/pack.ts`. No confundir fixtures con mapas publicados. |
| Módulos 3D vigentes | `campaigns/stormwreck-isle/public/art/retreat-modules/retreat_expanded_a[2–5]*.glb` y `retreat_geography_g1[1–4]_runtime.glb`. Confirmar los realmente cargados antes de editar. |

El prefijo `.../` de la tabla significa **`campaigns/stormwreck-isle/public/`**, no una carpeta nueva.
No tocar D8/one-shot para una mejora del Retiro. Un defecto realmente compartido exige justificación y prueba acotada en sus consumidores.

## 6. Estado de entregas y orden nuevo

| Fase | Estado al 25/10/2026 | Resultado / seguimiento |
|---|---|---|
| G0 y G1.1–G1.4 | Entregadas | No rehacer. Geografía próxima: 6 mallas, 12.088 triángulos, 1.232.188 bytes. |
| C1 — mar/cielo | Entregada visual/funcionalmente | Seguimiento de coste agregado en R0/Q1. |
| C2 — zoom jugador | Entregada | Preservar encuadre local y roles. |
| O1 — ocultación local | Entregada visual/funcionalmente | Cinco de 21 focos superaron +10 %, máximo +6,70 ms. No hay certificación de FPS sostenidos. |
| T0 — revisión de plan | Entregada; propuesta histórica | T01/T02 y fichas. G2 resolvió sus rutas en 3D; T03/T04 muestran lo construido. |
| R0 | Cerrada funcionalmente; rendimiento previo registrado | 47 pruebas, 325 vistas y quince mediciones de 60 s. Deuda 17–24 FPS en Q1. |
| G2.1 | Cerrada funcionalmente | Fondo insular; material corregido en G2.2. |
| G2.2 | Cerrada funcionalmente el 24/10 | 80 casillas aditivas, 56 pruebas, 11.244 pasos; informes G21/G22. |
| G2.3 | Cerrada funcionalmente el 24/10 | 82 casillas aditivas, 58 pruebas, 12.242 pasos; interior y costa. Informe G23. |
| G2.4 | Cerrada funcionalmente el 24/10 | Seis paradas opcionales, pecio original y regresos por PJ; prueba real de dos ventanas. Informe G24. |
| G2.5 | Cerrada funcionalmente y publicada el24/10 | 300 pruebas distintas;325 vistas+126 de grupo/cuadrícula/móvil+34 de puertas/palé/combate+25 parejas generales. DM/proyector3000 y guardado verificados. Coste añadido dentro del10%; ≈23 FPS, Q1 abierta. |
| A1, A3, A4, A2, A5 | Cerradas y publicadas | 595 parejas;102 pruebas actuales;38 vistas conjuntas y3 retornos. A4: libros opacos corregidos. A2: carga y encuadre corregidos. Informe RETREAT_FINISH_BATCH_20261024.md. |
| SAL-0 | Aceptada conceptualmente el25/10; referencias obligatorias | Cuatro salidas: cornisa alta, calas bajas, interior con bosquetes y cornisa del Observatorio. T05/T06 y perfiles exactos; producción intacta. |
| SAL-1 | Entregada, publicada y aceptada para continuar el25/10 | Cornisa alta:142 pares,41 vistas funcionales,3 retornos;93 pruebas y594660 muestras. Informe RETREAT_SAL1_20261025.md. |
| SAL-2 | Entregada y publicada el25/10; pendiente de revisión conceptual | Interior delObservatorio:147 pares,41 vistas funcionales,3 retornos;99 pruebas,594660 muestras y12242 pasos. Tres pinos e hito interior apoyados; once pinos reutilizados. Informe RETREAT_SAL2_20261025.md. |
| Q0 — primera pasada breve | Entregada y publicada el25/10; excepción autorizada al orden de optimización | Dos respaldos descargados, buffers reutilizados, pausa independiente de espuma y caché de jerarquías.104 pruebas/11 archivos,35 pares y3 retornos. Calidad/luces/sombras preservadas. Informe RETREAT_QUICK_OPT_20261025.md. |
| SAL-2R/SAL-3/SAL-4/SAL-5 | Cerradas técnicamente y publicadas el26/10; entregadas a revisión conceptual | 553 pares/50 vistas funcionales/3 retornos/102 pruebas;54 pinos adicionales y paisaje naturalizado. Informe RETREAT_SAL5_20261026.md. |
| M1 | Publicada27/10 | 85 pares; basalto y pavimento compartidos. |
| E1 | Publicada27/10 | 103 pares; copas corregidas y25 plantas bajas/5 lotes. |
| L1 | Publicada27/10 | 121 pares; luz,caras interiores,cielo y espuma de contacto. |
| Q1 | En curso desde27/10; autorización posterior explícita | Suelo de A1, perfiles visibles y optimización sin recortes de calidad. Certificación global pendiente; consultar estadoQ1. |

**Primera entregaQ1.1,27/10:** publicada en3000, candidata `runtime/prepared-retreat-q1-20261027a`, PID22584. Suelos opacos/excluidos de ocultación y roca exterior despejada de la plaza; luces con listas estables.85pruebas/9archivos,100vistas/36parejas,50funcionales,3retornos,12.242pasos/746.804muestras y once grupos del guardado idénticos.58GLB originales conservados. ComparativaABBA visible: A1 21,20→22,66FPS; A4 21,92→24,95FPS. CPU de actualización−20,5%/−32,9%; mismos recursos/luces/sombras/drawcalls. Variación entre tandas y p95 deA1 pendiente96,80→104,95ms. **No alcanza30FPS;Q1 global sigue abierta.** Informe `docs/evidence/RETREAT_Q1_20261027.md`; galería `output/retreat-q1-20261027/index.html`. SiguienteQ1.2: carga redundante/trabajo oculto por terreno y perfil de los fotogramas lentos, sin recortes gráficos. No repetir acabados ni restaurarMEL para continuar.

**Secuencia vigente:** R0 → G2.1 → G2.2 → G2.3 → G2.4 → G2.5 → A1 → A3 → A4 → A2 → A5 → **SAL-0 → SAL-1 → SAL-2 → SAL-3 → SAL-4 → SAL-5** → M1 → E1 → L1 → Q1.
G2 resolvió relieve y circulación funcionales. SAL mejora la lectura y continuidad del paisaje alrededor de esos caminos sin moverlos. E1 viste el entorno general y reutiliza lo resuelto en SAL; no diseña rutas paralelas.

## 7. Protocolo obligatorio de cada ficha

### 7.1 Antes de cambiar

1. Revisar el estado del repositorio y los cambios ajenos sin limpiarlos ni restaurarlos.
2. Guardar inventario y SHA-256 de fuentes protegidas, assets cargados y datos de terreno. Para cambios visuales, comparar guardados por contenido sin abrir otro escritor sobre la partida real.
3. Registrar rol, personaje, posición/superficie, objetivo y orientación de cámara, zoom, resolución, DPR, hora y clima. No corregir clima/niebla de una partida para embellecer una captura.
4. Capturar el antes en escenario de revisión aislado. Guardar una comprobación adicional con el clima real de la mesa.
5. Escribir lista cerrada de archivos y objetos a cambiar. Si el alcance requiere mover arquitectura/anclas, detener ese diseño y buscar otra solución.

### 7.2 Construcción e integración

1. Separar cuatro capas: visual 3D, obstáculos lógicos, suelo transitable y objetos interactivos. Ocultar la cuadrícula no descarga navegación.
2. Usar Blender → GLB para geometría nueva, módulos nombrados, unidades métricas y transformaciones documentadas. Validar ejes Blender/glTF/Babylon con una pieza de prueba; no asumir que Z exportado equivale a Z local del juego.
3. Mantener pivots estables, material compartido, instancias donde convenga y liberación de recursos al salir. No exportar cámara/luces del estudio como luces de juego.
4. Las pieles decorativas no abren caminos ni cambian colisiones por su apariencia. Cada superficie nueva necesita cotas y conexión lógica explícitas.
5. Conservar decisiones narrativas, dados físicos y resultados manuales. Llegar a un trigger ofrece una interacción; no resuelve pruebas ni desplaza automáticamente al grupo.

### 7.3 Validación común, exigida por el usuario

- Cámara vigente: inclinaciones **5°, 10°, 15°, 20°, 25°**; giros **−30°, −15°, 0°, +15°, +30°**. No sustituir por el antiguo plan de 20°/30°/40°.
- Capturas generales: 25 combinaciones, mismo antes/después. En las zonas afectadas, repetir cerca/medio/lejos y exterior/interior ocupado, con tres sprites de diferente talla cuando haya oclusión.
- Tres roles: DM, jugador y proyector. Resolución de referencia 1920×1080; comprobar además panel real del DM y móvil 390×844. La imagen visible del jugador conserva el límite C2: alto ≤16 m y ancho ≤30 m, o el límite local más cercano.
- Recorrido real continuo desde playa por A1, seis celdas, A2, A3/comedor/pasillo/cocina, A4, A5, dos salidas y barca. Ida y vuelta. Un teleport para una foto no demuestra navegación.
- Pruebas negativas: paredes, muebles, puertas cerradas, bordes y desniveles sin conexión bloquean el paso; escalera/rampa autorizada permite el cambio de altura. Sin caídas ni saltos por interpolación.
- Cuadrícula visible/oculta: misma navegación y acciones. Puertas, palé, PNJ, encuentro y viajes permanecen utilizables. No revelar al jugador información privada del DM.
- Guardados: carga, reconexión, roles y partida anterior compatibles. Si hay casillas nuevas, el subconjunto original sigue idéntico.
- En Q1, realizar la medición visible, no en pestaña oculta: mismo equipo/encuadre, calentamiento 10 s, tres repeticiones de 60 s por foco crítico; registrar mediana, p95, FPS, memoria, mallas, triángulos, materiales, draw calls y sombras. No mezclar memoria JS con memoria GPU. Las fases previas no requieren repetir estas mediciones prolongadas.
- En Q1, comparar alternadamente antes/después para reducir ruido térmico; registrar versión del navegador, GPU, DPR y aplicaciones de revisión abiertas. Antes de Q1, conservar las referencias existentes y anotar las observaciones necesarias sin convertirlas en otra fase de optimización.
- No ejecutar toda la batería histórica sin necesidad: seleccionar pruebas de navegación/cámara/oclusión/puertos afectadas, tipos, compilación y validación GLB. Conservar comandos/resultados reales en la evidencia.

### 7.4 Presupuesto y condiciones de parada

- Presupuesto G1 original: ≤24.000 triángulos, ≤18 mallas y ≤1,5 MiB para **ese grupo geográfico**. O1 tiene ocho mallas adicionales de presentación; no confundirlas con un incumplimiento de G1.
- G2: fijar presupuesto medido en R0/G2.1, sin ocultar el coste sumándolo a otro grupo. Como límite de la primera candidata, intentar conservar el tope del grupo geográfico mediante reutilización/LOD; si necesita ampliarse, entregar cifras y justificación antes de poblarlo.
- Cero luces, mapas de sombra o materiales por personaje nuevos como solución por defecto. Reutilizar mar, cielo, vegetación y PBR existentes.
- Referencia histórica de coste relativo: +10 % frente a la base inmediata, mismo foco/equipo, con p95 registrado. Se conserva la evidencia ya obtenida; por la prioridad actual del usuario, el ajuste y la aceptación de rendimiento de las próximas fases se resuelven conjuntamente en Q1 y no bloquean el avance de los acabados.
- Objetivo orientativo de uso: 60 FPS; referencia mínima de revisión, 30 FPS sostenidos en el equipo acordado en R0. Es un objetivo de producción, **no un resultado ya alcanzado**. Si la base no lo cumple, registrar el déficit y tratarlo en optimización antes de certificar Q1.
- Detener avance ante pérdida de muebles, paredes atravesables, cambios de anclas, terreno que se cae, exposición de secretos, guardados incompatibles, duplicación de escenas/puertos o fallos que impidan cargar o jugar. La deuda de optimización se registra para Q1.
- Revertir únicamente la candidata de la subfase; conservar y no borrar trabajo ajeno. Guardados y formato no son un mecanismo de rollback visual.

### 7.5 Carpeta y entrega por subfase

Crear `output/retreat-<id>-<AAAAMMDD>/` con `before/`, `after/`, `checks/`, `index.html` y `README.md`.
Cada par usa el mismo identificador de vista y un manifiesto de cámara/clima/actor. Guardar originales sin recomprimir para comparar.
Informe en `docs/evidence/RETREAT_<ID>_<AAAAMMDD>.md`: archivos cambiados, CANON/ambiente, imágenes, pruebas y salidas, métricas antes/después, fallos corregidos, pendientes y siguiente ficha.
Actualizar estado en este roadmap y `prototypes/retreat-geography-20261021/PROGRESS.md`. «Implementada», «comprobada» y «aceptada conceptualmente» son estados distintos.

## 8. Fichas de ejecución

### R0 — Base reproducible y presupuesto medido

**Estado:** cerrada funcionalmente el 23/10/2026. Informe `docs/evidence/RETREAT_R0_20261023.md`; deuda de FPS previa registrada para Q1. **Prioridad:** crítica. **Dependencia:** T0 entregado; antes de G2.1. **Alcance:** revisión y correcciones de regresiones demostradas, sin ampliar el mapa.

1. Leer evidencia O1 y sus hashes; comprobar que las fuentes actuales corresponden a la entrega activa. No activar candidatas históricas `o1`, `final` o `release` por su nombre.
2. Releer terreno/ensamblaje/catálogo y regenerar inventario; si cambió desde las láminas, actualizar la base y explicar diferencias antes de construir.
3. Repetir recorrido y accesos en copia aislada; verificar niebla .85 sin modificar el guardado real, mobiliario de seis celdas y columnas del templo.
4. Medir los cinco focos O1 pendientes y las vistas generales/celdas/interiores. Separar coste de oclusión, transparencia, mar, materiales y sombras.
5. Corregir solo errores comprobados de la base; compartir geometría/material y restaurar recursos al dejar de usar proxies. No eliminar muebles para ganar FPS.
6. Escribir presupuesto G2 por grupo (mallas/triángulos/bytes/materiales/sombras/draw calls), equipo de referencia y rendimiento base. Mantener las deudas previas visibles.

**Archivos de consulta:** O1, `retreat-local-occlusion.ts`, `retreat-weather-visibility.ts`, manifiestos G1, terreno, `world.ts`. Editar solo el propietario de un fallo reproducido.
**Pruebas/entrega:** protocolo §7, base de 980 casillas y roles, informe R0 con medidas nuevas.
**Aceptación:** partida íntegra; ninguna regresión funcional abierta; presupuesto de G2 explícito y datos de coste reproducibles. No exige llamar resuelto al déficit previo de FPS si sigue en Q1; sí prohíbe ocultarlo o añadir vegetación densa antes de medirlo.
**Siguiente:** G2.1.

### G2.1 — Continuidad insular: masas, costa y reservas

**Estado:** cerrada funcionalmente; presentación actualizada en G2.2. **Prioridad:** crítica. **Dependencia:** R0. **Clase:** VTT_AMBIENCE sobre geografía G1 existente.

1. Abrir fuentes Blender/GLB realmente cargadas de G1. Identificar respaldo permanente, techo recortable y costa; conservar sus propietarios actuales.
2. Replantear T01 sobre geometría actual. Estudiar la franja posterior a A3/A4 y los flancos de A5/A2, aproximadamente X −10…190 / Z −20…65; es reserva visual de estudio, no una orden de construir un rectángulo ni de navegar X negativo.
3. Dibujar una costa curva y lomas conectadas. El frente conserva agua, palé suspendido y arcos del templo; las masas de fondo no deben cerrar una islita nueva alrededor del Retiro.
4. Reservar sin construir todavía los corredores de G2.2/G2.3. Estimar 30–60 m de aproximación jugable donde quepa; no imponer esa longitud si obliga a mover arquitectura o reindexar casillas.
5. Extender selectivamente las piezas de respaldo, sin reexportar módulos A1 ni alterar suelos. La escala escénica de 200–400 m es una hipótesis para estudiar el fondo, no una obligación de terreno táctico de ese tamaño.
6. Separar módulos `G2_Backland_*` por masa/LOD; pivots métricos, UV coherentes, sin luces nuevas ni colisión automática. Nombres indicativos, no IDs ya publicados.
7. Integrar desde `retreat-refinement.ts`/`retreat-scenic-depth.ts`; recorte O1 solo donde una pieza nueva oculte al personaje. El terreno posterior no desaparece al entrar en A3/A4.
8. Revisar mar/cielo C1 a cinco inclinaciones y giros extremos; ajustar límites escénicos sin ampliar zoom jugador.

**Prohibido:** modelar toda la isla regional, rellenar el voladizo, usar una imagen plana de montaña, exportar un nuevo A1, inventar superficie transitable bajo una malla visual.
**Validación:** §7; cero cambios en registros originales; reserva corporal sin invasiones; fondo unido desde DM/jugador/proyector; coste dentro del presupuesto R0.
**Entrega:** planta de costa revisada, alzado, `.blend`, `.glb`, manifiesto de módulos y comparativa de encuadres. Los volúmenes propuestos tendrán cotas exportadas reales en esta entrega.
**Aceptación:** lectura de enclave en una isla mayor; mar conservado en frente; sin juntas, muros tapados ni nuevas rutas falsas. Revisión conceptual antes de G2.2.

### G2.2 — Pleamar: inicio litoral y alternativa alta

**Estado:** cerrada funcionalmente el 24/10/2026; informe `docs/evidence/RETREAT_G22_20261023.md`. **Prioridad:** alta. **Dependencia:** G2.1. **Ancla protegida:** `pleamar`, casilla 3,74, Y +0,25; intención `EXIT_PLEAMAR`.

1. Medir espacio entre salida actual, playa y borde X=0. No añadir columnas/filas negativas ni desplazar origen para prolongar el ramal.
2. Resolver el tramo bajo con una curva dentro de las coordenadas admitidas. Si no cabe con seguridad, usar la salida actual como enlace manual a una escena de costa; documentar esa elección y sus dos anclas de retorno.
3. Estudiar la alternativa alta desde el entorno del extremo de `upper`; candidato de T01: centro X 51,75 / Z 66,75, escalera actual ~26–26,5 m. Es una candidata de estudio, no una conexión aprobada ni una nueva puerta.
4. Redactar tabla de puntos X/Y/Z, anchura útil, tipo suelo/escalera/rampa y destino. Demostrar espacio para salvar cada desnivel con el movimiento existente. No conectar directamente los ~26 m con la playa por proximidad en planta.
5. Mantener 1,5 m de paso útil en los tramos de una casilla, libre de roca/props. Donde no quepa o el desnivel sea incompatible, escoger enlace interescena en lugar de una pendiente ficticia.
6. Crear datos de superficie/conexión de forma aditiva, por IDs propios verificados; conservar los 980 registros originales y todos sus estados. Añadir colliders/bordes solo a la extensión.
7. Representar los primeros metros de senda, roca costera y reunión del grupo. La marea de la ruta baja es información/contexto para el DM: no inundar físicamente una ruta ocupada ni lanzar pruebas automáticas.
8. Preparar interacción de continuación sin transición al pisar el borde. Coordinar conexión/retorno con G2.4; no duplicar el marcador original.

**Archivos:** terreno/ensamblaje y generador vigente, `retreat-runtime.ts`, módulo visual G2. Fuentes existentes solo donde sea necesario por el esquema de navegación.
**CANON:** opciones alta/baja y condicionamiento de calas por marea. **Ambiente:** curvas, conexión local concreta y vegetación.
**Validación:** ida/vuelta desde playa y enlace alto, bloqueo de bordes, tres personajes, cuadrícula oculta/visible, guardado/reconexión; el recorrido no usa teleport para cruzar una brecha.
**Aceptación:** opción baja segura y límite legible; opción alta resuelta físicamente o mediante enlace documentado. Ningún descenso imposible, ancla movida o paso a través de muro. Entrega del ramal y su tabla de cotas reales.

### G2.3 — Observatorio: interior, bosque y costa oriental

**Estado:** cerrada funcionalmente el 24/10/2026; informe `docs/evidence/RETREAT_G23_20261023.md`. **Prioridad:** alta. **Dependencias:** G2.1 y cierre G2.2. **Ancla:** `observatorio`, casilla 93,33, Y +18; intención `EXIT_OBSERVATORIO`.

1. Partir del extremo actual de X 139,5–142,5 / Z 49,5–64,5. No abrir otro paso por A2 o atravesar A3/A4.
2. Contrastar con la roca G1/G2.1. T01 propone curvas por X144/Z43 y X151/Z34; son guía en planta, no coordenadas de navegación aprobadas.
3. Resolver cotas reales y dos continuaciones: interior rocoso con bosquete sobrio y cornisa de costa oriental. Medir anchuras, pendientes y radios de paso antes de exportar.
4. Producir una tabla X/Y/Z por tramo y reservas de seguridad; añadir únicamente las nuevas superficies, bordes y enlaces necesarios.
5. Usar una primera curva/loma para que el jugador pueda adentrarse y deje de ver el monasterio completo sin cambiar C2. Vegetación fuera de paso, con oclusión local y LOD.
6. Mantener A2, cabrestante, puerta, cadena, palé y su volumen vertical libres. No cerrar su agua con el terreno nuevo.
7. Situar el límite de viaje después de la bifurcación reconocible. No adelantar cristales, marcas de relámpago o apariciones que corresponden al tramo final del Observatorio.
8. Preparar ida/vuelta de cada alternativa para G2.4; no convertir el campamento existente en el Observatorio canónico.

**Archivos:** módulo G2/propietarios visuales, terreno/compilación, catálogo de escenas y `retreat-runtime.ts` solo para el flujo de ruta.
**Validación:** ambas ramas a pie desde A1/A2 y retorno; suelo continuo, ausencia de colisión con troncos decorativos; jugador a zoom máximo C2; estados de puerta/palé intactos.
**Aceptación:** dos opciones distinguibles con acceso común a +18 m, cambio de ambiente legible y navegación certificada; sin bloquear A2 ni revelar sucesos narrativos.

### G2.4 — Viajes, mapas disponibles y retorno

**Estado:** cerrada funcionalmente el 24/10/2026; informe `docs/evidence/RETREAT_G24_20261023.md`. **Prioridad:** crítica funcional. **Dependencias:** G2.2/G2.3. **No crea los mapas finales B/D.**

1. Auditar `PortDefinition`, acciones/solicitudes y cambio de escena existentes. Actualmente el único puerto real de viaje es `travel-pecio-boat`: `dragon-rest`/beach → `wreck-ship`/sea, `autoDirection: manual`, `return: adjudicated`, `travelSeconds: 6000`.
2. Aclarar el uso actual del enum `mode: swim` en ese puerto. Es un valor técnico existente; no cambiarlo ni copiarlo a rutas nuevas sin demostrar cómo lo consume el sistema. No crear un segundo motor de viajes.
3. Definir una tabla de rutas con ID estable, intención original, medio, escena/ancla de salida y llegada, retorno, disponibilidad y estado. Los nuevos IDs se registran una vez y se prueban sin colisiones.
4. Reutilizar `EXIT_PLEAMAR`, `EXIT_OBSERVATORIO` y `TRAVEL_PECIO_BOAT`; un punto físico nuevo puede iniciar la misma intención mediante alias explícito, sin duplicar IDs de actor ni mover el original.
5. Extender la interacción de la barca existente con las opciones marítimas canónicas. Una sola barca/objeto interactivo en el embarcadero derecho; no tres barcos ni tres marcadores superpuestos.
6. Pasar por el flujo de solicitud/confirmación ya existente: grupo declara ruta, DM confirma destino y tiempo. Rechazar/cancelar mantiene posición/escena. No gastar recursos, avanzar reloj o resolver encuentros al pisar una salida.
7. Conectar `wreck-ship`, ya disponible. Campamentos son paradas opcionales y conservan props: no son escenas finales ni descansos garantizados.
8. Mantener Cuevas B1–B6 y Observatorio D1–D6 como destinos preparados no cargados hasta que existan. No cambiar a un mapId ausente, placeholder vacío o campamento haciéndolo pasar por destino canónico.
9. Conservar ruta/medio/dirección para retornar al acceso correcto. No devolver una barca a una salida terrestre ni poner todo el grupo sobre un actor o un borde; validar anclas de aparición libres.
10. Decidir qué parte del desplazamiento local cuenta dentro del viaje regional y escribirlo en datos/contexto del DM para no sumar tiempo dos veces. Mantener tiempos del libro como referencia manual.
11. Probar acciones con DM/jugador/proyector, dos clientes, solicitud cancelada, destino no disponible, regreso, reconexión y guardado anterior. Las decisiones de aparición y pruebas siguen manuales.

**Aceptación:** pecio continúa operativo; rutas terrestres y alternativas marítimas preparadas/utilizables según catálogo; ningún salto involuntario, pérdida de actor, doble avance de tiempo ni enlace roto. Guardado anterior carga y conserva estado de la mesa.

### G2.5 — Cierre conjunto de la ampliación insular

**Estado:** cerrada funcionalmente y publicada el24/10/2026. Informe `docs/evidence/RETREAT_G25_20261023.md`; galería `output/retreat-g25-20261023/index.html`. **Prioridad:** crítica de cierre. **Dependencias:** G2.1–G2.4.

1. Exportar inventario aditivo: 980 registros originales iguales + altas nuevas desglosadas; superficies, enlaces, obstáculos, rutas y escenas finales disponibles por separado.
2. Recorrer de forma continua todos los espacios originales y las ramas nuevas, con ida/vuelta y pruebas contra paredes/bordes. Registrar cada escalera y conexión vertical utilizada.
3. Probar puertas y palé en estados distintos, interacción PNJ, encuentro sin revelar privados y viaje al pecio con retorno adjudicado.
4. Repetir matriz de cámara/roles, mobiliario de seis celdas, A3/A4 ocupados, ocho columnas y siete aves. Verificar que las masas nuevas permanecen de fondo cuando se recorta un techo.
5. Medir coste y memoria tras al menos tres ciclos de entrada/salida. Comprobar que listeners, proxies, texturas y meshes regresan a la base esperada.
6. Preparar candidata aislada y verificar la entrada real del DM en 3000 siguiendo §11. Capturar al menos DM y proyector reales además del visor de revisión.
7. Entregar comparación T01/T02 conceptual frente a planta/cotas construidas. Actualizar diagramas para distinguir lo realizado de los destinos todavía pendientes.

**Aceptación:** Retiro unido visual/físicamente a su isla; ramas utilizables; base intacta; presupuesto respetado y ningún defecto crítico abierto. Los mapas B/D ausentes siguen declarados pendientes. G2 no certifica por sí sola Q1.

**Resultado:** 12.242 pasos/746.804 muestras físicas, GLB reimportados,980 casillas originales exactas y modelos previos sin cambios. G1+G2:19.947 triángulos/1.553.440 bytes/18 primitivas. Corregidas imagen GPU huérfana del agua por visita y ocultación de compañeros en combate.360 bloques cortos y24 bloques pasivos de30s: contrastes finales A3+0,78% yA5+0,99%, dentro del10%.15 muestras de60s≈22–23 FPS; Q1 sigue pendiente. En G25 quedaba una oclusión previa A4 a5°; se resolvió posteriormente en el acabado A4 del24/10. El respaldo rocoso mantiene planos amplios y repetición de basalto pendientes de afinado visual; cierre funcional no equivale a acabado artístico final.
**Siguiente histórico G25:** A1, ya completada con el lote A1–A5. La siguiente entrega vigente es la revisión de SAL-0 y, tras autorización de construcción, SAL-1.

### A1 — Integración fina de las seis entradas y plaza

**Estado:** acabado construido y comprobado el24/10/2026. Informe `docs/evidence/RETREAT_FINISH_A1_20261024.md`; galería `output/retreat-finish-a1-20261024/index.html`. **Dependencias:** G2.5/O1.

1. Auditar juntas de roca/pavimento alrededor de los seis vanos y el encuentro del camino superior, con la misma cámara del informe O1.
2. Marcar solo juntas defectuosas; crear pieles de transición fuera de la reserva corporal, sin cambiar caras originales de A1 ni su mobiliario.
3. Sellar huecos de respaldo y cantos; conservar identidades 1–6, distribución, estatua, jardines y barandillas. No renumerar por el orden invertido de la pantalla.
4. Ajustar contraste amplio de basalto/pavimento con materiales compartidos; no colocar piedras por casilla ni decoración repetitiva.
5. Comparar hashes, índices, matrices y materiales de los 128 originales; repetir accesos de todas las celdas y cuerpos visibles desde los cinco giros.

**Propietarios:** pieles G2/G1 y `retreat-refinement-materials.ts`; fuentes `a1-layout.ts`/`a1-visuals.ts` protegidas.
**Aceptación:** seis accesos libres, mismo interior exacto y fachada continua; sin almohadas/muebles flotantes ni mar/cielo por costuras. Imágenes antes/después y pruebas funcionales; optimización/mediciones prolongadas en Q1.

### A3 — Acabados de comedor, pasillo y cocina

**Estado:** acabado construido y comprobado el24/10/2026. Informe `docs/evidence/RETREAT_FINISH_A3_20261024.md`; galería `output/retreat-finish-a3-20261024/index.html`. **Dependencia:** A1 cerrada.

1. Auditar unión de suelo, paredes y roca en el perímetro actual. Preservar separación respecto a A4.
2. Refinar únicamente zócalos/dinteles/encajes de la envolvente; no ampliar otra vez ni modificar pasillo o entradas.
3. Conservar mesa larga, dos bancos y una silla de cabecera; cocina pequeña, ordenada, unida por pasillo corto. Prop útil y austero, sin estética de taberna.
4. Ajustar contraste y luz cálida existente antes de añadir lámparas; humo/vapor solo si el sistema disponible puede hacerlo sin ruido ni coste excesivo.
5. Caminar alrededor de mesa/bancos, atravesar pasillo y entrar en cocina. Muebles bloquean; techo/roca dejan ver al sprite mediante O1.

**Propietarios:** envolvente, `retreat-refinement-materials.ts`, `retreat-refinement-lighting.ts`; no recrear el módulo A3.
**Aceptación:** función reconocible cerca/lejos, misma distribución y navegación y lectura clara del pasillo; optimización en Q1. La segunda silla no aparece como «detalle ambiental».

### A4 — Biblioteca excavada, puerta y lectura del mobiliario

**Estado:** acabado construido y comprobado el24/10/2026. Informe `docs/evidence/RETREAT_FINISH_A4_20261024.md`; galería `output/retreat-finish-a4-20261024/index.html`. Corregida también la oclusión previa de libros a5°. **Dependencia:** A3 cerrada.

1. Auditar roca trasera/techo y puerta actual. Mantener hoja, eje, estado y collider sincronizados.
2. Refinar roble/hierro de la puerta y encuentros sin cambiar vano ni abrir accesos nuevos.
3. Conservar estanterías murales e independientes, mesa/bancos, atriles, escritura y lámparas existentes. No desplazar pasillos para resolver una oclusión visual.
4. Ajustar materiales/relleno existentes para distinguir libros/madera/figuras; aplicar O1 a nuevas pieles sin esconder estantes completos.
5. Entrar con puerta abierta, intentar cruzar cerrada, recorrer pasillos y retornar. Revisar tres sprites y espacio ocupado desde giros extremos.

**Propietarios:** puerta/importación actuales, envolvente y materiales/luz del Retiro.
**Aceptación:** puerta funcional y legible, biblioteca integrada permanentemente en roca, muebles intactos y sin pasillos atravesables o techo global ausente.

### A2 — Casa del cabrestante y lectura de su altura

**Estado:** acabado construido y comprobado el24/10/2026. Informe docs/evidence/RETREAT_FINISH_A2_20261024.md; galería output/retreat-finish-a2-20261024/index.html. Carga y encuadre amplio corregidos; suelo duplicado conservado. **Dependencia:** A4 cerrada; G2.3 protegido.

1. Verificar tejado a dos aguas, puerta, mecanismo, palanca, cadena y palé. Comparar la carga fija del fixture con runtime antes de llamarla fallo.
2. Refinar encajes de apoyos y roca posterior manteniendo el agua bajo el recorrido de carga.
3. Si el palé inferior queda fuera del encuadre, ajustar el foco/contexto A2 del controlador existente; mantener C2 del jugador. No añadir una segunda cámara o un botón innecesario.
4. En copia aislada comprobar palé a 0/12/15 m, estados y sincronización visual. Estos valores son casos de prueba, no orden de cambiar límites mecánicos actuales.
5. Probar puerta y acceso terrestre, cuerpo visible y solicitud manual de uso. No convertir la plataforma de carga en ascensor de personajes sin soporte explícito del sistema.

**Propietarios:** `retreat-camera-composition.ts`, lift en `retreat-global-visuals.ts`, pieles de soporte; `world.ts` solo si el propietario actual lo requiere.
**Aceptación:** se entiende la relación edificio/cadena/agua/palé usando los controles vigentes; estados y recorrido original conservados; sin ampliación adicional.

### A5 — Templo abierto, soportes y composición

**Estado:** acabado construido, comprobado y publicado el24/10/2026. Informe `docs/evidence/RETREAT_FINISH_A5_20261024.md`; galería `output/retreat-finish-a5-20261024/index.html`. Suelo duplicado y columnas mayores conservados. **Dependencia:** A2.

1. Confirmar ocho columnas actuales, cubierta de madera, muro tallado, puntales arqueados, anciano, siete canarios, pedestal y ofrendas. No contar dos veces filas que se superponen en alzado.
2. Refinar solo uniones roca/soportes/cubierta y acabado pétreo. Conservar proporciones grandes autorizadas; no reducirlas al «templo humilde» ni agrandarlas otra vez.
3. Mantener aire/mar bajo los apoyos y apertura lateral. No rellenar el voladizo como una terraza sobre tierra maciza.
4. Revisar O1 en vistas ocupadas: columnas conservan altura y silueta, techo se recorta localmente; estatua y aves no desaparecen por un lote padre.
5. Caminar desde la escalera y alrededor del centro con Runara/actor; verificar bordes, escala +27 m y visión desde costa.

**Propietarios:** envolvente existente, metadatos de estructura/O1, materiales y luces actuales.
**Aceptación:** templo reconocible exterior/ocupado, siete aves y ofrendas conservadas, estructura abierta y sin mecanismos narrativos automáticos.

### M1 — Piedra, pavimento y PBR a dos escalas

**Estado:** validada y publicada 27/10;85 pares. Informe `docs/evidence/RETREAT_M1_20261026.md`. Piedra S2/S3 conservada. **Dependencias:** zonas cerradas y SAL-5 validada, para texturizar sobre volúmenes estables.

1. Auditar material y UV de cada cara defectuosa; no reemplazar todo el basalto por otra biblioteca. Registrar nombres y fotos de estiramiento/repetición demostrados.
2. Separar lectura de masa a distancia de grano mineral cercano; reutilizar albedo, normal y ORM actuales, UV métricas y colores opacos.
3. Corregir UV/normales/tangentes solo en las nuevas envolventes afectadas. No alterar originales A1 como efecto colateral.
4. Ajustar rugosidad/humedad de forma localizada; madera/metal/piedra reconocibles y pavimento menos contrastado que personajes.
5. Repetir cerca/medio/lejos, transición PBR/Standard alrededor del umbral existente y coste por material. Validar GLB y ausencia de alfa accidental/parches negros.

**Propietario:** `retreat-refinement-materials.ts`, fuentes de piedra ya instaladas y UV de módulos nuevos.
**Aceptación:** sin estiramientos/costuras perceptibles en los focos auditados, patrón no dominante, materiales compartidos y rendimiento dentro de presupuesto. No crear un material por roca.

### E1 — Vegetación, mantenimiento y profundidad

**Estado:** validada y publicada 27/10;103 pares. Informe `docs/evidence/RETREAT_E1_20261026.md`. **Dependencias:** G2, SAL-5 y M1. **Solo vestimenta del terreno aprobado; no duplicar los bosquetes y remates ya resueltos en SAL.**

1. Distribuir plantas cultivadas en jardines y vegetación costera/interior en tierra plausible; no sobre pavimento, vanos o bajo agua.
2. Reutilizar 2–3 familias de recursos por zona, agrupar con variación de tamaño/rotación; evitar cuadrícula regular o una planta por casilla.
3. Añadir musgo/grietas con moderación y detalles de mantenimiento funcionales. Claustro habitado y cuidado; no ruinas ni bosque denso dentro de la plaza.
4. Conectar visualmente planos cercano/medio/lejos ya construidos en G2. No crear nuevos volcanes canónicos ni otra costa detrás de un camino aprobado.
5. Usar instancias/LOD/culling y oclusión de copas. Presupuesto inicial de revisión: ≤64 instancias nuevas y <8 draw calls nuevos; reducir antes de ampliar.
6. Repetir recorrido y perfiles: ninguna planta nueva bloquea, tapa entradas o activa interacción innecesaria.

**Propietarios:** recursos existentes, `retreat-scenic-depth.ts` y dueño de vegetación vigente.
**Aceptación:** naturalidad sin saturación, rutas claras, anclajes correctos y coste medido. Cualquier cambio de ruta vuelve a la ficha G2 correspondiente, no se oculta aquí.

### L1 — Luz, mar y atmósfera marítima

**Estado:** validada y publicada 27/10;121 pares. Informe `docs/evidence/RETREAT_L1_20261026.md`. C1/O1 protegidos. **Dependencias:** M1/E1.

1. Medir luces/sombras realmente habilitadas antes de tocar intensidad. Revisar hora/clima en una copia; conservar la mesa real.
2. Afinar sol/ambiente existentes y contacto bajo mobiliario para dar volumen sin oscurecer interiores ni iluminar cavernas como exterior.
3. Mantener cielo parcial, mar y espuma en contacto real con costa; olas pequeñas y reflejos controlados con sistemas actuales.
4. Bruma solo en profundidad con reserva táctica O1. No reintroducir niebla exponencial que tape todo al valor guardado .85 ni cambiar el valor del clima para ocultar el fallo.
5. Revisar día/atardecer/noche, lluvia y niebla fuerte en seis focos, con sombras y agua. Buscar fugas de luz, dientes, parpadeos y costa inundada.
6. Cero luces/mapas de sombras adicionales de partida. Si un efecto nuevo exige coste, entregar medición aislada y reducir otra fuente antes de aceptarlo.

**Propietarios:** `retreat-refinement-lighting.ts`, `retreat-refinement-coast.ts`, `retreat-weather-visibility.ts`; sistemas compartidos solo por defecto demostrado.
**Aceptación:** volumen y lectura táctica en todos los climas, horizonte sin cortes y consumo dentro del presupuesto. No declarar resueltos FPS sostenidos con una captura soleada.

### Q1 — Auditoría final, optimización y acceso desde inicio

**Subfases vigentes (revisión15):**

| Subfase | Estado y alcance |
|---|---|
| Q1.1 | Publicada. PavimentoA1 y listas idénticas de luces. InformeQ1 del27/10, conservado. |
| Q1.2 | Publicada. Consultas de oclusiónO1 con índiceCPU equivalente; informeQ12 del27/10. |
| Q1.3a | Publicada. Normales de agua equivalentes y cálculo descartado de espuma eliminado; seguimiento A4 medido en una misma escena. |
| Q1.3b | Siguiente: carga selectiva de respaldos sustituidos y trabajo oculto por terreno. Conservar originales y relevo válido; comprobar cámaras, alturas, rutas y render targets antes de suspender trabajo. |
| Q1.4 | Posterior: memoria/carga y sombras según el perfil, exploración real≥10min, ciclos de escena, roles y revisión táctil real. Certificar únicamente objetivos efectivamente medidos. |

Cada bloque mantiene originales, datos de navegación y partida. No deducir que toda Q1 termina por mejorar dos focos; no recortar gráficos para alcanzar una cifra.


**Estado:** en curso, autorizada expresamente el27/10 después deM1/E1/L1. **Dependencias:** todas las fichas anteriores. Suelo de A1 prioritario. Se conservan todos los criterios de certificación siguientes; una primera mejora medida no cierra la fase global.

1. Volver a inventariar fuentes/GLB/recursos, cargar partida previa y comparar el subconjunto protegido. Eliminar duplicación de carga demostrada, no elementos del juego.
2. Ejecutar matriz §7 en A1–A5, playa, salidas y nuevas ramas. Comprobar combate con los ángulos vigentes, sin cambiarlo a 40° ni automatizar resultados.
3. Recorrer todas las rutas en runtime y manualmente desde cliente; probar errores de intento contra paredes, muebles, puertas y precipicios. Incluir escalera, palé, actores altos/bajos y retorno interescena.
4. Medir sesiones visibles y prolongadas: al menos 10 min de exploración y tres ciclos completos de escena, memoria estable tras liberar, p95 y FPS. Registrar equipo y resolución para que el resultado sea interpretable.
5. Resolver la deuda de C1/O1 con perfiles reales: transparencia/cutaway, instancias, materiales, LOD, mar y sombras. No certificar el coste solo porque el último parche no añade más.
6. Comprobar todos los roles y ausencia de datos privados en jugador/proyector. Revisión táctil real pendiente si el equipo disponible no permite realizarla.
7. Preparar/activar con §11; abrir desde `INICIAR.cmd` → opción Stormwreck → DM 3000. Confirmar carga del mapa y conexión real, no solo HTTP 200 de un visor de arte.
8. Entregar informe final: cambios por fase, comparación idéntica antes/después, pruebas realmente realizadas, tiempos/FPS/memoria, deudas y mapas de destino aún ausentes.

**Aceptación:** conjunto monástico único conectado a su isla, base intacta, recorrido demostrable sin atravesar paredes/caídas y viajes coherentes. Ningún crítico abierto; objetivos de rendimiento acreditados en el equipo de referencia. Si un criterio no se prueba o no se cumple, Q1 queda abierta y el informe lo dice.

## 9. Matriz canónica de viajes y catálogo disponible

| Destino/ruta | Distancia y tiempo del PDF | Estado/cuidado |
|---|---|---|
| Pleamar por acantilados o calas | 10,5 km / 2 h 20 min, p.17 | Calas solo con bajamar; aproximación alta incluye descenso natural. No obligar a atravesar bosque. |
| Pleamar por barca, extremo occidental | 7,5 km / 3 h 20 min, p.17 | No convertir `camp-coastal-refuge` en B1/B6. |
| Observatorio interior, terreno difícil | 5,25 km / 1 h 15 min, p.29 | Respetar el tiempo del libro sin recalcularlo por una fórmula distinta. |
| Observatorio por costa oriental | 9 km / 2 h, p.29 | Alternativa, no tramo obligatorio adicional al interior. |
| Observatorio por barca, extremo oriental | 7,5 km / 3 h 20 min, p.29 | Llegada costera/pilares se decide manualmente. |
| Pecio por barca | Casi 4 km / aprox. 1 h 40 min, p.23 | Puerto actual a `wreck-ship`; opciones C1/C9 según decisiones del grupo/DM. |

Catálogo consultado: `output/retreat-island-proposal-20261023/current-scenes.json`. Releer en R0 por si cambió.

| sceneId | Uso permitido |
|---|---|
| `dragon-rest` | Centro de operaciones actual. |
| `wreck-ship` | Pecio C1–C9 y cofa, mapa real disponible. |
| `wreck-approach` | Aproximación estática, movimiento desactivado. No presentarla como mapa táctico nuevo. |
| `wreck-objects` | Escena de prueba. No destino de campaña. |
| `camp-a1-rooms` | Fuente/escena original de seis celdas. No sustituirla ni duplicarla para G2. |
| `camp-forest-pleamar` | Parada opcional de bosque/arroyo, VTT_AMBIENCE. |
| `camp-coastal-refuge` | Parada costera opcional; no Cuevas finales. |
| `camp-cliffs-observatory` | Parada/meseta opcional; no Observatorio D1–D6. |
| `camp-wreck-beach` | Apoyo narrativo opcional; no desembarco forzoso antes del pecio. |

Actualmente no figuran escenas finales B1–B6 ni D1–D6 en el catálogo público activo. Dejarlas preparadas es aceptable; afirmar que ya están conectadas/cargadas no lo es.

## 10. Resoluciones de G2 y datos pendientes

- Resuelto: perfiles X/Y/Z y topología publicados en `retreat-island-navigation.json`, informes G22/G23 y T03/T04. Las trazas de T01 quedan históricas; no copiarlas sobre la navegación actual.
- Resuelto Pleamar: enlace bajo desde `pleamar` 3,74 hasta `island-pleamar-low` 8,61; enlace alto desde `upper` 34,43 hasta `island-pleamar-high` 8,29, a +21,25 m. La escalera y anclas originales se conservan.
- Resuelto Observatorio: acceso original 93,33/+18 m; bifurcación 96,22/+29,90 m, interior 80,10/+37 m y costa 106,17/+32,70 m. Las cotas nuevas evitan la roca G1 sin modificarla.
- Resuelto esquema: mismo dominio positivo112×80, origen, guardado v3 y rejilla v2. Las intenciones de viaje usan la cola existente del DM; el regreso se conserva por PJ mediante claves booleanas compactas. No introducir otro formato al retomar.
- Pendientes mapas finales B1–B6/D1–D6. Las paradas son opcionales; no reasignar sus seis puertos a destinos futuros de forma silenciosa. Para una futura extensión fuera del dominio, preferir escena de enlace antes que reindexar.
- Resuelto en acabado A4: oclusión previa de libros a5°. O1 agrupa primitivas del mismo mueble y permite temporalmente mezcla en materiales glTF OPAQUE, restaurándolos después; sin desplazar mobiliario. Evidencia RETREAT_FINISH_A4_20261024.md.
- Rendimiento C1/O1 y gesto táctil físico siguen pendientes. Registrar lo medible con el equipo disponible; no convertir una prueba sintética en una certificación física.

## 11. Entrega al VTT real y reversión segura

No ejecutar esta sección por entregar documentos. Se usa al publicar una futura subfase de código/arte comprobada.

1. Verificar campaña, puerto y guardado activo. `INICIAR.cmd` opción Stormwreck abre DM; `/` conduce al jugador, no demuestra acceso DM.
2. Preparar candidata en carpeta nueva con `node scripts/prepared-build.mjs prepare runtime/prepared-retreat-<fase>-<sello-unico>`. La preparación comprueba tipos y compila sin reemplazar `dist` activo.
3. Revisar candidata de forma aislada, con copia/snapshot y sin segundo escritor de la misma partida. No confundir el visor de revisión 46xx con el VTT 3000.
4. Para activar, cerrar limpiamente la mesa propia mediante `node scripts/close-table-on-port.mjs C:/Users/User/Desktop/Dungeons/data/saves 3000 stormwreck-isle`. No matar procesos ajenos ni borrar locks a mano.
5. Activar con `node scripts/prepared-build.mjs activate runtime/prepared-retreat-<fase>-<sello-unico> C:/Users/User/Desktop/Dungeons/data/saves`. El script verifica escritor cerrado y conserva la compilación anterior en `runtime/previous-build-*`.
6. Arrancar por el inicio habitual, entrar en `http://localhost:3000/dm`, cargar Retiro, verificar canvas/conexión/actor/puertas y capturar. Comprobar jugador/proyector sin reclamar fichas ajenas.
7. Si falla, cerrar la candidata limpiamente y restaurar la compilación anterior por el mecanismo existente de intercambio validado; comprobar rutas absolutas antes de mover directorios. No tocar guardados para revertir arte. Registrar versión activa y hashes.

Publicación vigente: `runtime/prepared-retreat-finishes-20261024a`, activada en`dist`. DM/proyector3000 y guardado comprobados;11 categorías de partida preservadas. Evidencia `output/retreat-finish-batch-20261024/checks/publication.json`, `live-save-preservation.json`, `candidate-source-freeze.json`(77 fuentes/assets) y capturas reales. Candidata D deG25 y anteriores son históricas; no reactivarlas por su nombre. Los IDs de procesos/pestañas no garantizan que sigan vivos.

## 12. Evidencias previas y documentos relacionados

- Auditoría inicial: `docs/audits/RETREAT_AUDIT_20261021.md`.
- Roadmap anterior archivado: `docs/audits/archive/RETREAT_ROADMAP_20261021_pre_G2_20261023.md`.
- G1: `docs/evidence/RETREAT_GEOGRAPHY_G1_20261023.md`.
- C1/C2: `docs/evidence/RETREAT_C1_HORIZON_20261023.md`, `RETREAT_C2_PLAYER_ZOOM_20261023.md`.
- O1: `docs/evidence/RETREAT_OCCLUSION_O1_20261023.md` y `output/retreat-occlusion-o1-20261023/index.html`.
- R0–G2: informes `RETREAT_R0_20261023.md`, `RETREAT_G21_20261023.md` a `RETREAT_G25_20261023.md` en `docs/evidence/`; galerías correspondientes en `output/`.
- Análisis insular y fuentes: `docs/design/RETREAT_ISLAND_CONTINUITY_PROPOSAL_20261023.md`; su planta inicial queda sustituida por T01, no sus distancias/tiempos documentados.
- Seguimiento: `prototypes/retreat-geography-20261021/PROGRESS.md`.

**Histórico T0:** entregó solo planta/alzado propuestos, orientación y fichas. La ejecución posterior G2 sí publica mallas, 162 casillas nuevas y viajes manuales; sus informes y T03/T04 son la referencia vigente.

## 13. Cierre vigente de acabados A1–A5 — 24/10/2026

[Informe del lote](../evidence/RETREAT_FINISH_BATCH_20261024.md) · [Galería de cinco zonas](../../output/retreat-finish-batch-20261024/index.html).

91 piezas aditivas/3612 triángulos/427340 bytes, cero imágenes nuevas. Geometría original, seis celdas/muebles, ampliaciones,1142 casillas/13 superficies/18 conexiones conservadas.595 parejas de vistas;594660 muestras físicas sobre los GLB reimportados;102 pruebas actuales;38 vistas de grupo/cuadrícula/móvil/combate y3 retornos con recuentos estables. Puertas/palé0/12/15 y tres tallas comprobados. Ocho columnas y siete canarios conservados.

A2 conserva C2; a5° puede no caber simultáneamente toda la vertical de carga. La prioridad es personaje visible y límites del jugador, sin forzar ángulos. Las fotos aisladas usan mediodía; la partida real conserva su noche/clima.

Cambio simultáneo ajeno engine/server/game.ts(rama turnOnly) revisado y conservado, fijado por hash; no atribuirlo al lote ni restaurarlo.60de61 fuentes protegidas exactas y única excepción documentada.

**Siguiente recomendada en el cierre del24/10: M1**, sustituida el25/10 por SAL-0…SAL-5 antes de M1. Después E1→L1→Q1. No iniciadas en este lote; optimización solo al final. Mapas finales B/D ausentes. No repetir R0/G2 ni reconstruir zonas para continuar.

## 14. Revisión SAL — paisaje de salidas y continuidad insular,25/10/2026

**Estado:** SAL-0 ySAL-1 aceptadas para continuar; SAL-2 construida, validada y publicada en3000, a revisión conceptual; SAL-3…5 pendientes. Este bloque complementa la base G2/A1–A5 sin reabrir sus cierres funcionales ni autorizar cambios de navegación.

**Detalle obligatorio de ejecución:** [Ficha completa de paisaje de salidas](../design/RETREAT_DEPARTURE_LANDSCAPE_PLAN_20261025.md). Contiene límites, pasos, propietarios, validaciones y aceptación por fase. Leerla antes de modelar.

**Prototipos:** [visual](../../output/retreat-departure-prototypes-20261025/prototipo-visual.png), [lámina técnica completa](../../output/retreat-departure-prototypes-20261025/prototipo-tecnico.png), [planta/alzado T05](../../output/retreat-departure-prototypes-20261025/T05-planta-alzado.png), [perfiles T06](../../output/retreat-departure-prototypes-20261025/T06-perfiles.png). T05/T06 tienen versionesSVG. Son propuestas; las líneas de navegación continuas y perfiles proceden de los datos actuales, los fondos y discontinuas son paisaje previsto.

### SAL-0 — Replanteo y revisión de prototipos

1. Fijar como referencias captura diurna del cierreA1–A5 y navegación actual. No interpretar el dibujo generado como geometría exacta.
2. Comprobar las cuatro rutas y la bifurcación por IDs/superficies/casillas. T05/T06 mantienen los datos; la numeración1 alta/2 baja/3 interior/4 costa solo es gráfica.
3. Revisar lectura del paisaje y reservasA2/A5, cercanía/lejanía y cámara5–25°. La revisión de una imagen no certifica colisiones u oclusión del futuro modelo.
4. Registrar esta entrega y esperar revisión conceptual antes de ejecutar construcción no solicitada.

**Entregado ahora:** propuesta visual, planta/alzado, cuatro perfiles métricos y plan. **Aceptación conceptual:** confirmada por el usuario el25/10. Imágenes incorporadas como referencias; construcción SAL-1 autorizada. Ninguna aprobación automática de las fases siguientes.

### SAL-1 — Pleamar alta y respaldo terrestre

**Entrega del25/10:** [informe verificable](../evidence/RETREAT_SAL1_20261025.md) · [galería antes/después](../../output/retreat-sal1-20261025/index.html).15 primitivas/14805 triángulos/1039096 bytes; materiales e imágenes existentes.142 pares,41 vistas funcionales,3 retornos,93 pruebas actuales,594660 muestras corporales y12242 pasos autoritativos.1142 casillas/13 superficies/18 conexiones y1221 mallas originales conservadas. DM/proyector3000 y11 grupos del guardado comprobados. SAL-1 aceptada para continuar; SAL-2 ya entregada debajo. SuGLB original conservaSHA-256 `81cb48c57b780b2a17348858ef7f78324ad05547270d1e76a22e7b3554f7be01`.

El relleno visual localG2 sobresalía sobre el paso y cubría el lado marítimo. Se conserva suGLB original como respaldo y se oculta únicamente su malla de presentación tras cargar una derivada local completa. No se altera ningún suelo lógico. Talud estructural permanente; afloramientos/matorral bajoO1. Los materiales globales siguen enM1 y la optimización enQ1. Fuentes/cierre en `prototypes/retreat-departure-sal1-20261025/STATE.md`.

- **Zona:** camino`island-pleamar-high`; ancla8,29, X12,75/Z44,25/Y21,25m. Eje58,5m, inicio26,648m y máximo35,50m. No convertirlo en plataforma horizontal.
- **Pasos:** antes por segmentos → reservar cuerpo y huecoA5 → modelar hombros/taludes basálticos fuera del eje → espolón de continuidad en el remate → matorral bajo → exportar/reimportar/validar → recorrido y viaje/regreso manuales → entrega.
- **Conservar:** templo, accesos, voladizo, navegación e interacción actual.
- **Cierre:** cornisa con mar exterior y tierra hacia dentro; ningún hueco, caída o invasión corporal nueva.

### SAL-2 — Observatorio interior con bosquetes

**Entrega del25/10:** [informe verificable](../evidence/RETREAT_SAL2_20261025.md) · [galería antes/después](../../output/retreat-sal2-20261025/index.html). Construida y publicada en3000; esperar revisión conceptual antes deSAL-3. GLB de1002768 bytes,13928 triángulos únicos y13 primitivas, cinco materiales existentes y20 instancias de partes de pinos. Cero texturas, luces, colliders o interactivos nuevos.

Se modelaron hombros rocosos, lomas y remate escénico sobre la circulación existente. Se corrigió soloY de los tres pinosG2 y de51 vértices del hito interior; X/Z, geometría, UV, índices y escala conservados. Once pinos reutilizados forman bosquetes abiertos; catorce raíces verificadas sobre suelo. El hito costero se conserva y su apoyo se auditará enSAL-3. La presentación local deriva deSAL-1; su fuente sigue intacta como respaldo y solo se desactiva al terminar la carga nueva.

Validación:147 pares de cámaras,41 vistas funcionales,3 retornos,99 pruebas en10 archivos,594660 muestras corporales,12242 pasos autoritativos.1142 casillas/13 superficies/18 conexiones y fuentes de arquitectura/celdas/muebles intactas. Revisión nativaDM/proyector3000 sin errores y once grupos del guardado preservados. Inventario: mallas1295→1329, materiales231→231, texturas76→76, luces18→18; FPS/VRAM pendientes deQ1. Fuente/estado `prototypes/retreat-departure-sal2-20261025/STATE.md`; candidata `runtime/prepared-retreat-sal2-20261025a` activada. E1 reutilizará estos bosquetes sin duplicarlos.

- **Zona:** subida común y bifurcación96,22/+29,90m; rama a80,10, X120,75/Z15,75/Y37m. Eje61,5m desde18,525m.
- **Pasos:** antes/apoyos actuales → lomas/rellanos alrededor del eje → bosquetes abiertos reutilizando recursos → transición donde se pierde el mar → remate entre roca/copas en el ancla → pruebas de grupo/oclusión/retorno → entrega.
- **Conservar:** A2, carga0–15m, puerta, tramo común y bifurcación. No suelo o árboles flotantes ni bosque denso obligatorio.
- **Cierre:** entrada terrestre legible y diferenciada del ramal costero; misma circulación.

### SAL-3 — Cornisa costera del Observatorio

- **Zona:** rama existente desde la bifurcación a106,17, X159,75/Z26,25/Y32,70m. Eje42m, tramo inicial compartido.
- **Pasos:** comparar ramas desde la bifurcación → integrar apoyo/cornisa lateral → vegetación baja y horizonte → continuidad tras un espolón → revisar A2/agua/cámara → recorrido/puertos existentes → entrega.
- **Conservar:** único acceso compartido, ancla y opciones de viaje. No duplicar escaleras ni generar otra salida persistente.
- **Auditoría inicial adicional:** comprobar el apoyo del hito costero conservado en `G2_Wayfinding_Cairns_3`; corregir solo su contacto, sin alterar la corrección interior deSAL-2 ni su rama compartida.
- **Cierre:** costa e interior se reconocen por el paisaje con las mismas conexiones.

### SAL-4 — Pleamar baja y calas

- **Zona:** `island-pleamar-low`, ancla8,61, X12,75/Z92,25/Y0,569m. Eje28,5m desde0,25m.
- **Pasos:** antes desde playa/barca → encajar afloramientos/calas húmedas alrededor del camino → continuidad detrás de roca costera → mantener suelo/estados de revisión → probar rutas alta/baja y barca con cuadrícula visible/oculta → entrega.
- **Conservar:** embarcadero a la derecha, barca/puertos y navegación actual. La marea y disponibilidad se resuelven con el DM; sin inundación o prueba automática nuevas.
- **Cierre:** litoral reconocible, puerto libre y regreso por el acceso correcto.

### SAL-5 — Integración, verificación y publicación

1. Revisar tierra continua al fondo/flancos, mar frontal y reservas A5/A2; no sustituir el muro de roca por otro de vegetación.
2. Aplicar §7 a las cuatro rutas:25 encuadres, tres tallas/roles, límitesC2, grupo, cuadrícula, oclusión y combate que conserva inclinación manual.
3. Comparar contenido de1142 casillas/13 superficies/18 conexiones, obstáculos, puertas, anclas, puertos y modelos originales protegidos.
4. Recorrer ida/vuelta con movimiento real. Probar solicitud/cancelación/confirmación/regreso y paradas opcionales en copia aislada.
5. Comprobar liberación al cambiar de escena completando tareas yendFrame antes de contar recursos. Medir inventario, no iniciar optimización prolongada.
6. Compilar candidata aislada y publicar con §11; verificar DM 3000/jugador/proyector y guardado preservado.
7. Entregar informe/fotos por fase y de conjunto. Mapas finalesB/D siguen preparados si no existen todavía.

**Aceptación:** base intacta y salidas útiles que se leen como caminos de una isla extensa. Próxima fichaM1; Q1 conserva toda la optimización al final.

### Reglas comunes SAL

- Blender→GLB modular, materiales/recursos existentes y un único propietario de carga/liberación desde`retreat-refinement.ts`. No otra escena, cámara, navegación, cola de viajes o controlesDM.
- Decorado fuera de reserva corporal radio0,30m/altura2,05m; apoyo continuo del suelo actual. Los perfiles técnicos son cotas medias de casilla, no contrahuellas de malla.
- Discontinuas detrás del ancla: continuidad visual, no autorización de nueva superficie. Un recorrido jugable más largo requiere alcance de navegación explícito, sin modificar originales ni mover anclas en secreto.
- CANON fija destinos/tipos de viaje; bosquetes, formas de roca y remates concretos son VTT_AMBIENCE.
- No restaurar cambios ajenos ni rebaselinar sobre G2/A1–A5. SAL-1 ySAL-2 disponen de construcción y pruebas físicas/funcionales; SAL-3…5 siguen pendientes. La certificación de rendimiento continúa enQ1.

## 15. Q0 — primera pasada de optimización sin reducción visual

Entrega del25/10: [informe](../evidence/RETREAT_QUICK_OPT_20261025.md) · [galería35 pares](../../output/retreat-quick-opt-20261025/index.html) · [pruebas](../../output/retreat-quick-opt-20261025/checks/verification.json).104 pruebas/11 archivos, tres regresos estables, candidata `runtime/prepared-retreat-quick-opt-20261025c` publicada y DM/proyector3000/guardado comprobados.

Dos respaldos sustituidos y desactivados se liberan tras validar sus relevos; originalesGLB intactos en disco y respaldo válido conservado ante fallo. La pasada todavía importa y después descarga esos respaldos: carga selectiva inicial pendiente deQ1. Búsquedas de hijos almacenadas solo al completar importaciones. Buffers de oleaje reutilizados, mar/espuma con puertas de visibilidad independientes que incluyen cámaras secundarias y render targets. Reaparición calculada al tiempo actual, sin reducir frecuencia visible24Hz. No inferir oclusión por roca; el mar bajo terreno puede seguir actualizándose hastaQ1.

Mallas1329→1327, geometrías900→898,231 materiales/73 texturas/18 luces en ambos encuadres. No cambios aGLB, materiales, resolución, iluminación, sombras, colisiones o viajes. Coste breve en el informe; no certificarFPS sostenidos niVRAM. Primeros ensayos preservados y revisión final contrastada en ordenABBA sin compilación concurrente.

Cambio paralelo autorizado en «Jugador y PNJ»: ampliación de playa conservada. JSON original1142 casillas intacto; el runtime añade las celdas de ese helper, fuera deQ0. Se corrige solo el tipado validando elJSON antes de transformar y la prueba exige cada original idéntico/en orden, sin duplicados. No volver al total runtime anterior para deshacer ese trabajo.

Siguiente: revisión conceptual del bosque deSAL-2 y su lectura frente a la montaña antes deSAL-3. No se plantó más vegetación duranteQ0. DespuésSAL-3/SAL-4/SAL-5/M1/E1/L1/Q1.


## 16. Continuación SAL y naturalización — 26/10/2026

Autorización: «Continua para que el retiro del dragon se parezca a la propuesta visual. Junto con el Roadmap continua los Sal»; naturalizar caminos, bosques, escaleras y algunas paredes del acantilado. Se conserva el trazado/altura navegable; se deriva su presentación visual y su encaje, sin mover edificios ni rediseñar las celdas.

| Fase | Estado | Entrega |
|---|---|---|
| SAL-2R | Comprobada/publicada; revisión conceptual pendiente | `docs/evidence/RETREAT_SAL2R_20261026.md`; 145 pares, 54 pinos reutilizados adicionales, suelo orgánico sobre la misma superficie y 597400 muestras. |
| SAL-3 | Comprobada/publicada; revisión conceptual pendiente |118 pares; costa abierta al mar, respaldoG13 derivado y hito costero apoyado. |
| SAL-4 | Comprobada/publicada; revisión conceptual pendiente |118 pares; orilla seca conservada, roca erosionada y afloramientos. |
| SAL-5 | Comprobada y publicada |172 pares globales/50 vistas funcionales/3 regresos;DM/proyector3000 y11 grupos del guardado. |

Todos los detalles de paisaje son VTT_AMBIENCE. GLB nuevos y fuente Blender propia en `prototypes/retreat-sal-natural-20261026/`; originales conservados en disco y respaldo durante carga. El acabado de referencia se alcanza progresivamente: SAL resuelve paisaje y lectura; M1/E1/L1 siguen pendientes. Q1 conserva la optimización profunda.


### Cierre de la continuación SAL — 26/10/2026

Candidata `runtime/prepared-retreat-sal-20261026b` ACTIVADA; servidor 20660. Maestro revisión11; revisión10 archivada. Galería general `output/retreat-sal5-20261026/index.html` y tres entregas anteriores separadas.560 inputs congelados/51 modelos compilados,48 originales idénticos. Navegación:JSON 1142 casillas intactas; runtime 1279 por la ampliación de playa autorizada en «Jugador y PNJ»,13 superficies/18 conexiones. SAL no añade casillas ni cambia el movimiento.12242 pasos/42 objetivos y243 bordes bloqueados.

Recursos de la matriz:1327→1562 mallas,898→1024 geometrías,231 materiales/73 texturas/18 luces conservados. Perfil de escritorio de retornos:74 wrappers estables en3 visitas; no equivale aVRAM. Sin certificaciónFPSantesdeQ1. Los ejes rectos de las escaleras se conservan por el contrato de navegación; se trabajan acabado y bordes. Aún hay paños amplios y remates visuales que revisar: M1/E1/L1 completarán el acabado. No dar por aceptada conceptualmente la propuesta por pasar pruebas funcionales.


## 17. Cierre M1 → E1 → L1 — 27/10/2026



130 pruebas en 18 archivos,309 pares de imágenes, 50 vistas funcionales con grupo de tres,DM/jugador/proyector,cuadrícula,móvil y combate;3 salidas y regresos sin crecimiento de recursos. Compilación cliente/servidor correcta. Navegación autoritativa:12.242 pasos y746.804 muestras físicas,1.279 casillas/13 superficies/18 conexiones. Se conservan las137 casillas de playa autorizadas anteriormente; JSON original1.142 intacto.

Las seis celdas y todo su mobiliario, edificios ampliados, navegación, anclas y conexiones mantienen sus fuentes. De105 archivos protegidos,98 permanecen idénticos;7 cambios de integración/materiales/luz declarados. Los 55 GLB originales de la base están intactos;51 de ellos se comprobaron también dentro de los52 GLB compilados, junto al nuevoE1.549 entradas de compilación congeladas. Sin nuevos controles del DM, interactivos, decisiones narrativas o resolución automática de dados. Toda la nueva vestimenta es VTT_AMBIENCE.

### Publicación y guardado

Candidata `runtime/prepared-retreat-mel-20261027a` activada; servidor 3000 PID 9664. La anterior compilación queda conservada en runtime. Consola:Servidor conectado,Proyector listo,Partida guardada,Retiro cargado y3 lienzos. Proyector:sin pantalla de entrada ni desconexión y3 lienzos. Sin errores de consola.

La raíz3000 abre el cliente de jugadores; el acceso directo de dirección es `/dm`. La partida estaba enfocada en el campamento independienteA1. Se utilizó el comando existente `view:focus` para mostrar el Retiro y se encuadró el mapa; **no se usó el traslado de grupo `scene`**. Los 10 grupos de datos de personajes,PNJ,criatura,objetos/escenas,ambiente,progreso,notas,condiciones y descansos permanecen idénticos. El undécimo grupo cambia de forma intencionada:solo el foco DM/proyector pasa a `dragon-rest`. Hora,simulación climática y reproducción de audio pueden avanzar normalmente. La apertura del panel de Codex quedó en cola mientras este chat no estaba visible; las páginas reales de producción sí se comprobaron mediante navegador controlado.

### Coste y pendientes

M1 mantiene mallas/geometrías/texturas/luces y añade dos variantes de material para la tierra. E1 añade5 primitivas/2.376 triángulos y un único mapa de acículas256². L1 añade1 lote de espuma/608 vértices/456 triángulos, sin texturas,luces,reflejos o mapas de sombras nuevos. Cada comparativa conserva su perfil de pantalla; no se mezclan el agua compacta y la de escritorio para atribuir cambios a rendimiento. En los3 retornos:1.569 mallas,233 materiales,75 texturas y18 luces estables.

Los recuentos no certifican FPS ni VRAM. Q1 queda pendiente para carga selectiva,oclusión por terreno,memoria,sombras y medición sostenida. Las copas conservan la silueta simplificada original y quedan paños rocosos amplios/ejes ortogonales heredados; las galerías permiten la revisión artística del usuario. Este cierre técnico no declara una equivalencia fotorrealista con la propuesta.


Fuentes y detalle: `docs/evidence/RETREAT_MEL_20261026.md`; estado `prototypes/retreat-mel-20261026/STATE.md`. Q1 requiere una instrucción posterior; no forma parte de esta entrega.


## 18. Q1.2 — Oclusión equivalente y coste de CPU,27/10/2026

**Q1.2 publicada y medida** en3000, candidata `runtime/prepared-retreat-q12-20261027a`, PID2336. Informe `docs/evidence/RETREAT_Q12_20261027.md`; galería `output/retreat-q12-20261027/index.html`; estado `prototypes/retreat-q12-20261027/STATE.md`. ÍndiceCPU compartido de O1: mismo resultado y gráficos, sin nuevas mallas, materiales, luces, sombras o colliders. 91pruebas/10archivos,72parejas/904firmas estáticas,86.226consultas idénticas,79registros de puertas/plataforma,50vistas funcionales,3retornos,12.242pasos/746.804muestras.58GLB y11grupos del guardado intactos;555inputs congelados/52GLB compilados. A1 38.77→38.00 FPS (-1.99 %), p95 59.45→44.40 ms; A4 40.68→34.35 FPS (-15.57 %), p95 41.05→49.35 ms. ComparativaABBA de8bloques visibles de60s, perfil completo de escritorio idéntico. Las cifras de dos focos no certifican todo el conjunto. Coste añadido:108índices/1.741.216bytes de tablasCPU, preparación única (~944ms en la matriz instrumentada).

 Seguimiento del resultado adverso deA4: una sola escena cargada,8bloques de30s, A1 −89.78 % deCPU en consultas; A4 −77.41 % deCPU en consultas. La reducción deCPU y delp95 deA1 está demostrada, pero losFPS medios siguen variando. Diagnóstico intercalado adicional48bloques de3s: A1 42.24→46.32 FPS; A4 41.06→42.62 FPS; separado de la prueba sostenida. Se conservan todos los ensayos; no hay mejora global deFPS certificada. Priorizar seguimiento deA4 ymar antes de cerrarQ1.

La preparación añade tablas auxiliares de CPU y un coste inicial declarado; no mide VRAM. El perfil diagnóstico de A1 identificó5,59s/15s enO1 y dos mallas que acumulaban2,80s sin impactos. Por eso Q1.2 prioriza las consultas antes de la carga selectiva. Q1.3 tratará el siguiente coste demostrado: mar y trabajo escondido por terreno, con seguimiento explícito deA4. Todos los criterios globales del§8/Q1 siguen vigentes.

La primera muestra compacta detectada por el ancho del panel se conserva aparte en `output/retreat-q12-20261027/drafts/compact-profile/`; queda excluida de la comparación final. El visor QA fija únicamente para el ensayo el perfil de escritorio: agua3249vértices y sombra1024². La configuración adaptativa de producción permanece intacta. No confundir el visor de arte con3000.


## 19. Q1.3a — Agua y seguimiento de A4,27/10/2026

**Q1.3a publicada y medida** en3000, candidata `runtime/prepared-retreat-q13-20261027a`,PID11952. Se acelera el cálculo exacto de normales del agua y se omite el cálculo descartado de la espuma sin atributo; si este se añade, se calcula como antes. Sin recortes gráficos, nuevas mallas, luces, sombras o colliders. Informe `docs/evidence/RETREAT_Q13_20261027.md`; galería `output/retreat-q13-20261027/index.html`; estado `prototypes/retreat-q13-20261027/STATE.md`.18pruebas/5archivos,144estados/10.996.128valores exactamente iguales,90parejas/904firmas estáticas,50vistas funcionales,3retornos,12.242pasos/746.804muestras.58GLB y11grupos del guardado intactos;557inputs congelados/52GLB compilados. A1 43.73→44.27FPS,p95 37.30→37.15ms,CPU de normales−88.77%; A4 40.53→42.24FPS,p95 36.90→35.05ms,CPU de normales−86.18%. Una misma escena cargada,8bloques visibles de60s,10s de calentamiento,ordenABBA por foco,sin compilación concurrente y calidad de escritorio idéntica. O1Q1.2 activo en ambos estados. Medias de estadísticas de dos bloques, no certificación global. Caché adicional deCPU:75.264bytes de tablas en escritorio/31.104en compacto;sin nuevos recursos gráficos. Q1global sigue abierta.

El perfil anterior deA4 atribuía3,5ms de4,8ms por actualización del agua a las normales. Tras el cambio:0,5ms/1,9ms. La espuma nativa no tiene atributo normal; su cálculo previo se descartaba. Se mantiene intacta la temporización original,limitada a24actualizaciones geométricas/s según el ritmo de fotogramas.

La puerta conservadora deQ0 todavía puede actualizar mar tras el terreno. No se introducen aproximaciones de cobertura que pudieran ocultar olas visibles. Q1.3b revisará carga de respaldos y trabajo escondido;Q1.4 conserva memoriaGPU,sombras,táctil real,exploración real≥10min,todos los encuadres/climas y objetivos globales. El diagnóstico de dos focos no cierraQ1.


