# Retiro del Dragón · Auditoría técnica, geográfica y visual

**Fecha:** 21 de octubre de 2026. **Estado:** diagnóstico y propuesta para revisión; ninguna mejora del mapa ejecutada.

## 1. Conclusión y orden recomendado

El Retiro existe como escenario 3D independiente y utiliza los sistemas actuales del VTT. Su problema principal de conjunto es **la falta de masa terrestre conectada detrás de las habitaciones y del templo**. Mejorar solo una textura no resuelve esa lectura de islote. Hay además dos defectos de presentación demostrados: **cielo blanco** y **ocultación de lotes completos de mobiliario**.

La intervención propuesta conserva celdas, muebles, coordenadas, navegación, puertas, viajes, estados y dados físicos. Orden: geografía y reservas → continuidad por sectores → cierre de cielo/mar y encuadre → oclusión y acabados por zona → materiales → vegetación/atmósfera → auditoría de cierre. Cada subfase se verifica antes de pasar a la siguiente. El roadmap contiene **17 subfases**, con los diez campos pedidos.

**Zoom recomendado para jugador:** semialtura ortográfica máxima de **8 m**, además de un techo de **30 m de ancho** en pantallas muy panorámicas. En 16:9 da **28,44 m, unas 19 casillas de ancho**. Mantener los límites interiores más cercanos, la continuidad de zoom al cruzar puertas y los ángulos actuales. Revisar «Conjunto» para que el jugador conserve una vista local. DM y proyector mantienen su vista general. Es una propuesta, todavía sin aplicar.

**Preservación comprobada:** 2,112 archivos protegidos comparados por SHA-256; 0 modificados y 0 ausentes durante la auditoría. El estado previo del repositorio ya contenía cambios ajenos; no se han revertido ni atribuido a esta auditoría.

## 2. Fuentes y método

Fuente canónica correcta: [PDF oficial aportado](<C:/Users/User/Desktop/Dungeons/OneDrive_1_12-9-2026/Aventura Los Dragones de la Isla de las Tempestades.pdf>), capítulo 1 pp. 6–12, mapa regional 1 y mapa local 2. Se ha leído el texto relevante y revisado visualmente ambos mapas; no se utilizó D8 Night como referencia del Retiro. Los renders de lectura están en [mapa 1](<C:/Users/User/Desktop/Dungeons/output/retreat-audit-20261021/source-review/map1.png>) y [mapa 2](<C:/Users/User/Desktop/Dungeons/output/retreat-audit-20261021/source-review/map2.png>).

Se creó un visor aislado que importa **el mismo WorldRenderer y la misma campaña pública**, sin servidor de partida, guardados ni cambios de código de producción. Captura después de comprobar que los recursos visibles están preparados. El personaje de una copia de estado se coloca en puntos existentes para estudiar encuadres; esta colocación **no demuestra un recorrido físico completo**.

Se conservan 1.000 capturas de matriz, 120 comparativas de zoom, 54 vistas de roles/tamaños, cinco muestras de ángulo fraccional, nueve diagnósticos de horizonte, 12 vistas de clima/luz, tres personajes a escala y dos transiciones: **1.205 capturas de prueba**, además de la captura inicial de la interfaz. Las 40 hojas de contacto de la matriz se revisaron visualmente, junto con originales seleccionados a resolución completa. No se afirma una inspección manual a tamaño completo de las 1.205 imágenes.

La matriz usa los cinco hitos verticales 5/10/15/20/25° y los cinco giros −30/−15/0/+15/+30°. El rango es continuo; no puede enumerarse cada valor real. Se añaden muestras a 12,5°/7,5°. Hay 13 focos locales × 25 ángulos × tres zooms, más 25 vistas generales = **1.000**. «Conjunto» solo tiene un zoom por ángulo porque una acción real de zoom abandona ese modo.

Evidencias de datos: [matriz](<C:/Users/User/Desktop/Dungeons/output/retreat-audit-20261021/evidence/matrix.json>), [zoom](<C:/Users/User/Desktop/Dungeons/output/retreat-audit-20261021/evidence/zoom-study.json>), [roles y coste](<C:/Users/User/Desktop/Dungeons/output/retreat-audit-20261021/evidence/profiles.json>), [diagnóstico adicional](<C:/Users/User/Desktop/Dungeons/output/retreat-audit-20261021/evidence/deep-audit.json>), [muebles](<C:/Users/User/Desktop/Dungeons/output/retreat-audit-20261021/evidence/furniture-visibility.json>) y [pruebas existentes](<C:/Users/User/Desktop/Dungeons/output/retreat-audit-20261021/evidence/functional-tests.json>).

## 3. Arquitectura y responsabilidades reales

| Propietario | Responsabilidad y conservación |
|---|---|
| [retreat-runtime.ts](<C:/Users/User/Desktop/Dungeons/campaigns/stormwreck-isle/public/retreat-runtime.ts>) | Escena dragon-rest, terreno v2, 13 puntos, dos puertas y viaje al pecio. Reglas y conversación manuales. |
| [retreat-terrain-v2.json](<C:/Users/User/Desktop/Dungeons/campaigns/stormwreck-isle/public/retreat-terrain-v2.json>) | Suelos, alturas, obstáculos, bordes y conexiones; independiente de la cuadrícula visual. |
| [global-layout.json](<C:/Users/User/Desktop/Dungeons/campaigns/stormwreck-isle/public/retreat-zones/global-layout.json>) | Coordenadas de ensamblaje, destinos de revisión y referencias de zonas. |
| [retreat-global-visuals.ts](<C:/Users/User/Desktop/Dungeons/campaigns/stormwreck-isle/public/retreat-global-visuals.ts:56>) | Reutiliza createA1Visuals, carga módulos, puertas, elevador, soporte visual de suelo y ocultación. |
| [a1-visuals.ts](<C:/Users/User/Desktop/Dungeons/campaigns/camp-rests/public/a1-visuals.ts:469>) | Celdas y campamento originales; un lote de muebles fusionado por celda. Transformación global del conjunto A1: (72,9,72). |
| [retreat-refinement.ts](<C:/Users/User/Desktop/Dungeons/campaigns/stormwreck-isle/public/retreat-refinement.ts>) | Importa refinamientos y S3; sustituye presentación solo después de cargar su reemplazo. Conserva originales desactivados. |
| [retreat-refinement-materials.ts](<C:/Users/User/Desktop/Dungeons/campaigns/stormwreck-isle/public/retreat-refinement-materials.ts>) | Materiales compartidos, normales/ORM y cambio de PBR cercano a Standard lejano; no es LOD de geometría. |
| [retreat-refinement-lighting.ts](<C:/Users/User/Desktop/Dungeons/campaigns/stormwreck-isle/public/retreat-refinement-lighting.ts>) | Corrige foco de la sombra solar, filtra pieles de piedra en sombras locales y mantiene dos rellenos interiores sin mapas nuevos. |
| [retreat-refinement-coast.ts](<C:/Users/User/Desktop/Dungeons/campaigns/stormwreck-isle/public/retreat-refinement-coast.ts>) | Reutiliza mar, evita agua por encima de 0,08 m en la costa baja y controla material de cielo. |
| [retreat-scenic-depth.ts](<C:/Users/User/Desktop/Dungeons/campaigns/stormwreck-isle/public/retreat-scenic-depth.ts>) | Tres rocas de primer plano y cuatro conos lejanos. Capas 3/4/6/7 reservadas vacías; su nombre no prueba que exista entorno medio. |
| [coastal-backdrop.ts](<C:/Users/User/Desktop/Dungeons/engine/client/coastal-backdrop.ts>) | Mar de 360 m, animación de vértices y espuma. Reutilizar el propietario actual. |
| [world.ts](<C:/Users/User/Desktop/Dungeons/apps/web/world.ts>) | Render, cámara, actores, soporte de terreno y presentación compartida. El generador Playground/retreat-geometry.js no es la ruta activa de este VTT. |
| [player.ts](<C:/Users/User/Desktop/Dungeons/apps/web/player.ts:2192>), [dm.ts](<C:/Users/User/Desktop/Dungeons/apps/web/dm.ts>), [projector.ts](<C:/Users/User/Desktop/Dungeons/apps/web/projector.ts>) | Distintos roles sobre el renderizador común. Jugador independiente; proyector puede recibir encuadre compartido. |

**Geometría visual:** A1 nativo y módulos GLB con conversión de eje por raíz (1,1,−1). **Dinámica:** hojas de puertas y conjunto del elevador. **Interactivos:** datos de escena y puntos, sin depender de esconder una malla. **Decoración:** roca, costa, vegetación, mar y fondo; no necesita nuevos colliders si se mantiene fuera de volúmenes jugables. El límite de la cuadrícula es un marco de datos, no una pared geológica.

Inventario de carga inicial: **1.103 mallas**, 808 habilitadas con vértices, **387.537 triángulos habilitados** —no todos visibles a la vez—, 224 materiales en la escena incluyendo importados/sin uso y 73 objetos de textura. Los **19 GLB actuales suman 26,88 MiB** de archivos. Stone S3 aporta 21 mallas y 28.514 triángulos. Inventario detallado: [runtime-inventory.json](<C:/Users/User/Desktop/Dungeons/output/retreat-audit-20261021/evidence/runtime-inventory.json>) y [analysis.json](<C:/Users/User/Desktop/Dungeons/output/retreat-audit-20261021/source-review/analysis.json>).

### Navegación y escala

Cuadrícula 112×80, 168×120 m, **1,5 m por casilla**, 850 casillas transitables repartidas en 10 superficies, 15 conexiones, 87 obstáculos y 33 bordes bloqueados. Estos datos permanecen idénticos. Las paredes y muebles se bloquean mediante la navegación existente, no mediante la opacidad de su representación.

| Superficie | Casillas | X mínimo–máximo (m) | Z mínimo–máximo (m) | Y (m) |
|---|---:|---:|---:|---:|
| beach | 122 | 18,00–73,50 | 91,50–115,50 | 0,25–9,00 |
| a1 | 409 | 73,50–142,50 | 76,50–99,00 | 9,00–9,00 |
| cliff | 48 | 142,50–156,00 | 69,00–94,50 | 9,00–15,00 |
| a2 | 6 | 154,50–162,00 | 66,00–69,00 | 15,00–15,00 |
| upper | 138 | 49,50–154,50 | 64,50–69,00 | 15,00–27,00 |
| a3 | 19 | 117,00–126,00 | 55,50–66,00 | 18,00–18,00 |
| a4 | 32 | 96,00–108,00 | 57,00–66,00 | 18,00–18,00 |
| a5 | 38 | 37,50–49,50 | 63,00–72,00 | 27,00–27,00 |
| pleamar | 18 | 4,50–18,00 | 111,00–114,00 | 0,25–0,25 |
| observatorio | 20 | 139,50–142,50 | 49,50–64,50 | 18,00–18,00 |

## 4. Geografía: dónde continúa la isla y dónde sigue el mar

El mapa 2 muestra roca inmediatamente detrás de las habitaciones y del templo; el frente del claustro se abre a la bahía. El mapa 1 sitúa el Retiro en un brazo rocoso de la parte norte de una isla mucho mayor, cuya masa principal continúa hacia **este/sudeste regional**. Esto justifica un respaldo próximo conectado, pero **no una cordillera infinita hacia el norte** ni rellenar toda la bahía.

Marco local existente: +X este, +Z sur, −Z norte, Y altura. A5 ocupa el extremo de X menor; A2 el de X mayor. A 0° de giro, la cámara con alpha=90° proyecta +X hacia la izquierda de pantalla. Por eso izquierda/derecha de una captura no bastan para asignar rumbos. No se propone girar ni reflejar la escena.

Los mapas regional y local son de escalas diferentes y no proporcionan una transformación afín exacta. La salida del Observatorio avanza hacia −Z dentro del escenario, aunque el destino regional queda al SE. Un sendero fuera de escena puede curvarse: **no se mueve el punto existente** para forzar un rumbo recto.

**Reutilización concreta:** a1:ridge:continuation está desactivado; su lote abarca X−48..264, Z−47..107,38 e Y−1,43..35,74, con 20.884 triángulos. Incluye meseta y otras caras del acantilado/costa. Se pueden seleccionar caras traseras como fuente de una nueva envolvente, conservando el original. Activar todo el lote arriesga solapes y rutas enterradas.

| Sector de intervención | Referencia local y solución propuesta | Reservas obligatorias |
|---|---|---|
| G1.1, detrás de A3/A4 | Unir coronación actual X≈87,5–132 / Z39–64 a relieve posterior irregular. Estudiar extensión finita hasta Z≈−60 y cotas 26–42 m. Es dimensionado inicial VTT_AMBIENCE, sujeto a revisión, no elevación oficial. | Interiores A3/A4, puertas y camino alto intactos; respaldo no ocultable al entrar. |
| G1.2, detrás de A5 y coronación A1 | Unión posterior desde X≈28–57 hacia el macizo central, por detrás de los accesos. | Conservar arcos, vacío marino bajo A5 y escalera 18→27 m; seis celdas intactas. |
| G1.3, flanco A2 | Conectar cara posterior y costa curva hacia el este; preparar contexto regional sin prolongar la ruta jugable. | Corredor Observatorio X139,5–142,5 / Z49,5–64,5 a Y18, y agua bajo el palé a 15 m. |
| G1.4, costa baja y Pleamar | Talud decorativo por debajo y fuera del pad actual; contacto irregular con agua y vegetación sobria. | Playa, encuentro, muelle, salida X4,5–18 / Z111–114 y navegación sin cambios. |
| Frente sur y laterales marinos | Mantener bahía, arcos y horizonte de agua; prolongar visualmente el océano, no el suelo jugable. | No crear falsas penínsulas ni rellenar los desniveles costeros. |

Planta anotada: [sectores, reservas y orientación](<C:/Users/User/Desktop/Dungeons/output/retreat-audit-20261021/geography.svg>). Los contornos discontinuos de esa planta son propuestas de trabajo y no nuevos límites canónicos.

## 5. Cámaras y zoom real

| Parámetro | Estado comprobado |
|---|---|
| Proyección | Ortográfica. El FOV nominal de 0,8 rad no determina el encuadre ortográfico. |
| Vertical | Continuo de 5° a 25°; hitos 5/10/15/20/25, exterior por defecto 25 e interior 10. Los informes antiguos a 40° no describen el código actual. |
| Horizontal | −30°..+30°, botones en pasos de 15° y entrada táctil fraccional. |
| Distancia al objetivo | Radio de cámara ≈230,456 m, derivado del tamaño del terreno; no equivale al zoom. |
| Recorte | minZ=1, maxZ=8.400. El blanco no se explica por un far plane demasiado corto. |
| Zoom | Ajuste ortográfico por zona, aspecto, tamaño de personaje, rol y modo. No hay un único número global actual. |
| Objetivo | Personaje/foco o encuadre compartido. Conjunto usa el objetivo global (91,14,80); exploración sigue al actor. |
| Cambio de refugio | Se preserva la escala elegida para evitar saltos. Los límites informados para el siguiente gesto pueden diferir de la escala actualmente renderizada. |
| Combate | Utiliza la política existente; no fuerza 40°. Revisar también su acción «Mapa completo» al definir el límite del jugador. |

Código: [camera-profile.ts](<C:/Users/User/Desktop/Dungeons/engine/shared/camera-profile.ts>), [camera.ts](<C:/Users/User/Desktop/Dungeons/engine/shared/camera.ts>), [camera-zoom.ts](<C:/Users/User/Desktop/Dungeons/engine/client/camera-zoom.ts>), [retreat-camera-composition.ts](<C:/Users/User/Desktop/Dungeons/campaigns/stormwreck-isle/public/retreat-camera-composition.ts>) y [world.ts](<C:/Users/User/Desktop/Dungeons/apps/web/world.ts:649>).

### Límites medidos de exploración, 1280×720, 25° / 0°

Estas son poses preparadas usando un gesto de zoom real, no valores copiados del antiguo viewer. Semialtura mínima medida: 3 m en todos estos focos.

| Foco | Semialtura máxima local (m) | Anchura en pantalla (m) | Casillas de ancho |
|---|---:|---:|---:|
| Desembarco | 19,37 | 68,86 | 45,91 |
| A1 · Plaza | 16,65 | 59,20 | 39,47 |
| Accesos superiores | 19,37 | 68,86 | 45,91 |
| A2 · Cabrestante | 4,36 | 15,51 | 10,34 |
| A3 · Comedor/cocina | 5,28 | 18,79 | 12,52 |
| A4 · Biblioteca | 6,14 | 21,83 | 14,55 |
| A5 · Templo | 10,02 | 35,64 | 23,76 |
| Celda libre | 5,19 | 18,44 | 12,30 |

Conjunto a 25°/0° tiene semialtura **56,57 m**, unos **201,15 m de ancho**; también está disponible para el jugador. En la transición de playa a A3 sin un nuevo gesto se mantuvieron **19,37 m** de semialtura aunque la consulta de límites locales indicaba 3,65 m. Es la política explícita de continuidad, no una prueba de que el gesto haya fallado. El futuro tope global del jugador debe aplicarse sobre la pose efectiva y evitar saltos al cruzar puertas dentro del rango permitido.

### Comparativa para definir el máximo alejado

120 capturas comparan las semialturas 6, 8, 10, 12 m y el máximo actual en ocho focos y tres inclinaciones. Se respetan los límites interiores más cercanos: A3, por ejemplo, no se aleja hasta 8 m si su límite propio es 5,28 m.

| Semialtura candidata | Ancho 16:9 | Casillas | Mike 1,80 m | Mia 1,30 m | Maria 1,05 m |
|---|---:|---:|---:|---:|---:|
| 6 m | 21,33 m | 14,22 | 97,88 px | 70,69 px | 57,10 px |
| 8 m **recomendada** | 28,44 m | 18,96 | 73,41 px | 53,02 px | 42,82 px |
| 10 m | 35,56 m | 23,70 | 58,73 px | 42,42 px | 34,26 px |
| 12 m | 42,67 m | 28,44 | 48,94 px | 35,35 px | 28,55 px |

Las alturas de píxel son estimaciones geométricas para sprites verticales a 25° y 720 píxeles de alto; se acompañan de renders de los tres personajes reales. Al máximo actual de A1, Maria ocupa unos 20,58 px y en playa 17,69 px. Con 8 m ocupa 42,82 px. La opción de 6 m estrecha mucho los recorridos; 10–12 m devuelve figuras más pequeñas y demasiada visión lateral. **8 m es el compromiso recomendado para esta escena.**

Especificación propuesta: `maxHalfHeight = min(límite actual de la zona, 8, 15 / aspect)`, conservando la continuidad de las escalas que ya están dentro del tope global y los límites del siguiente gesto. Utilizar la opción existente `maxStageHalfHeight` únicamente en dragon-rest y rol player. No cambiar el perfil angular ni sustituir la cámara. Conjunto y Mapa completo del jugador deben respetar la intención local; no basta con achicar un rectángulo que sigue apuntando al centro global lejos del personaje. DM y proyector conservan sus políticas actuales. Ningún control nuevo necesario.

**Límite de esta solución:** el zoom mejora encuadre, escala y exploración, pero no es un sistema de visión o de secretos. A 5°, una semialtura de 8 m puede abarcar unos 183,58 m de profundidad sobre un plano a igual altura; a 25°, unos 37,86 m. Relieve y oclusión modifican lo visible. En A1, la proyección de seis centros de celda pasa de seis dentro del marco actual a tres con 8 m; eso no significa que tres interiores estén revelados. No se propone añadir niebla de guerra ni cambiar los ángulos para resolver este objetivo.

## 6. Hallazgos con evidencia

| ID | Hallazgo y certeza | Consecuencia / actuación propuesta |
|---|---|---|
| G1 | Confirmado: mar detrás de las coronaciones y masas aisladas. [captura](<C:/Users/User/Desktop/Dungeons/output/retreat-audit-20261021/evidence/vtt-overview-t25-y0-zfull.jpg>) | Construir continuidad posterior y retornos costeros sobre fuentes existentes; no rehacer habitaciones. |
| C1 | Confirmado: píxeles blancos [255,255,255] intersectan P7_Maritime_Sky_Dome. Material sin iluminación, emisión blanca y colores de vértice blancos. Conos lejanos producen diagonales azules. [datos](<C:/Users/User/Desktop/Dungeons/output/retreat-audit-20261021/evidence/deep-audit.json>) | Corregir material específico de cielo y cierre del mar. La cúpula tiene matriz congelada e infiniteDistance; revisar ese comportamiento por separado, sin atribuirle automáticamente todo el defecto. |
| O1 | Confirmado: diez de 30 encuadres dejan isVisible=false en el lote de muebles de la celda ocupada. [datos](<C:/Users/User/Desktop/Dungeons/output/retreat-audit-20261021/evidence/furniture-visibility.json>) | La prueba de cabeza/torso pasa precisamente porque desaparecen objetos completos. Conservar mobiliario visible y hacer recorte más local. |
| O2 | Confirmado: se retiran respaldo superior de A3/A4 y tramos completos de estructura de A5. [templo](<C:/Users/User/Desktop/Dungeons/output/retreat-audit-20261021/evidence/vtt-a5-t25-y0-zfar.jpg>) | Separar techo ocultable, fragmentos frontales y fondo permanente. |
| C2 | Confirmado: jugador puede abrir Conjunto global y la escala se conserva al entrar en refugios. [vista jugador](<C:/Users/User/Desktop/Dungeons/output/retreat-audit-20261021/evidence/player-overview.jpg>) | Tope por rol y escena sobre la pose real; Conjunto local. |
| G2 | Confirmado: actor-barca y casco 3D simultáneos, con distinta orientación. [costa](<C:/Users/User/Desktop/Dungeons/output/retreat-audit-20261021/evidence/vtt-beach-t25-y0-zmid.jpg>) | Unificar representación conservando ID, interacción, viaje y casco. |
| A2 | Confirmado: palé recortado por encuadre de refugio; geometría presente. [cabrestante](<C:/Users/User/Desktop/Dungeons/output/retreat-audit-20261021/evidence/vtt-a2-t25-y0-zfar.jpg>) | Revisar tamaño/foco contextual de la cámara existente; no construir otro palé. |
| J1 | Confirmada junta azul visual bajo pavimento alto. Límites de malla compatibles con 0,012–0,036 m de separación, sin inspección local de triángulos. [junta](<C:/Users/User/Desktop/Dungeons/output/retreat-audit-20261021/evidence/vtt-upper-t25-y0-znear.jpg>) | Verificar el punto concreto y añadir faldón visual si procede. No se certifica hueco de colisión ni se cambia suelo por una sospecha. |
| M1 | Juicio visual: pavimento/mar de alto contraste y roca con repetición de bandas. | Afinar jerarquía y escalas de material después de cerrar masa y luz; no se ha demostrado estiramiento de UV. |
| Q1 | Medición: coste alto y variable tras noche/lluvia; 99,9 ms mediana y p95 187,4 ms en celda 1 lluviosa. | Aislar coste de clima, sombras y actualización en sesión visible antes de añadir efectos. No declarar FPS sostenidos con esta muestra. |

La cadena que oculta mobiliario está localizada: [a1-visuals.ts](<C:/Users/User/Desktop/Dungeons/campaigns/camp-rests/public/a1-visuals.ts:469>) fusiona muebles por celda; [retreat-global-visuals.ts](<C:/Users/User/Desktop/Dungeons/campaigns/stormwreck-isle/public/retreat-global-visuals.ts:147>) oculta la malla completa ante un impacto de rayo. Los colliders siguen en los datos de movimiento. La corrección deberá mantener geometría y distribución originales.

Control a 25° / zoom intermedio: celda 1 oculta a −30° y −15°; celdas 2 y 3 a −15°; celdas 4, 5 y 6 a −15° y +15°. Diez casos reproducidos. Las capturas restantes de la matriz muestran otros ángulos, sin que esta tabla pretenda enumerar cada combinación continua.

## 7. Diagnóstico individual por áreas

### A1 · Camino, plaza y seis celdas

| Criterio | Diagnóstico / propuesta |
|---|---|
| Núcleo / existente | 409 casillas A1, seis celdas originales, mobiliario, plaza, jardines, estatua pétrea de un dragón de bronce y camino que dobla sobre sí mismo. |
| Conservar | 128 mallas originales A1, distribución, accesos y todos los muebles. Altura de la plaza 9 m; escaleras y barandillas actuales. |
| Entorno y fondo | Pared y repisas de basalto existentes. Falta una coronación conectada a la masa posterior y hay repetición de bandas/rocas. |
| Deficiencia verificada | En 10 de 30 encuadres de control desaparece el lote completo de muebles de la celda ocupada. Se mantienen accesorios separados; no se ha borrado geometría. La piedra clara del pavimento compite con las figuras. |
| Mejora exacta propuesta | Corregir la ocultación por lote, integrar encuentros de las seis bocas sin moverlas y prolongar únicamente la roca posterior. Afinar contraste del suelo después de la geometría. |
| Archivos / prioridad / impacto | a1-visuals.ts se conserva como fuente; retreat-global-visuals.ts para oclusión; GLB nuevo de envolvente y materiales específicos. G1.2 / O1 / A1 / M1. Prioridad alta; sin nuevas colisiones. |

### A2 · Casa del cabrestante

| Criterio | Diagnóstico / propuesta |
|---|---|
| Núcleo / existente | Casa independiente, cubierta a dos aguas, puerta de madera, mecanismo, cadena/cuerda y palé; plataforma a 15 m sobre el agua. Elevador visual y adjudicación manual ya existen. |
| Conservar | Geometría móvil, puerta/colisión, estados y punto retreat-winch; el descenso no se convierte en un automatismo narrativo. |
| Entorno y fondo | Flanco rocoso oriental y acceso al camino alto. El frente debe permanecer sobre agua y el respaldo conectar con la masa inmediata. |
| Deficiencia verificada | El zoom de refugio considera 4 m de altura y recorta casi todo el descenso del palé. No falta el palé ni el mecanismo. Contexto posterior insuficiente. |
| Mejora exacta propuesta | Encajar el respaldo sin rellenar el hueco marino; resolver el tamaño/foco contextual dentro del controlador actual. Revisar las posiciones 0/12/15 m en copia de revisión. |
| Archivos / prioridad / impacto | retreat-camera-composition.ts, WorldRenderer y GLB exterior; propietario de setLift intacto. G1.3 / A2. Alta para geografía; media para encuadre; cero luces nuevas. |

### A3 · Comedor y cocina

| Criterio | Diagnóstico / propuesta |
|---|---|
| Núcleo / existente | Entrada excavada, mesa larga, dos bancos, única silla de cabecera, corredor corto y pequeña cocina ordenada a cota 18 m. |
| Conservar | Distribución, mobiliario, pasillo, superficies y punto retreat-community. Comida, descanso y conversación siguen bajo control del DM. |
| Entorno y fondo | Envolvente superior compartida con A4; acceso sobre camino alto. Se ve agua inmediatamente detrás de la coronación. |
| Deficiencia verificada | Al entrar se oculta la masa de upper-caves junto con el techo local, dejando una habitación en forma de caja recortada. Encuentro visual muy uniforme con la roca. |
| Mejora exacta propuesta | Respaldo geológico permanente independiente del techo ocultable. Afinar solo juntas de roca/suelo y el relleno cálido existente, sin redistribuir muebles. |
| Archivos / prioridad / impacto | retreat-refinement.ts, retreat-global-visuals.ts, metadatos del GLB y retreat-refinement-lighting.ts. G1.1 / O1 / A3. Alta; comparte presupuesto geográfico. |

### A4 · Biblioteca

| Criterio | Diagnóstico / propuesta |
|---|---|
| Núcleo / existente | Biblioteca excavada, puerta real de roble/hierro, estantes murales y tres independientes, mesa con bancos, lectura y escritura; cota 18 m. |
| Conservar | Hoja y bisagra de la puerta, bloqueo y pasillos, mobiliario y punto retreat-library. Investigación manual sin resultados automáticos. |
| Entorno y fondo | Comparte macizo con A3. Debe conservar respaldo al abrir el interior, y mar en el frente costero. |
| Deficiencia verificada | El recorte deja la biblioteca como caja aislada. A 5°/10° ciertos estantes o la puerta aún cubren pies/piernas; cabeza/torso superan la muestra de rayos. |
| Mejora exacta propuesta | Separar piel posterior de techo ocultable y afinar oclusión local. Mantener estantes y puerta exactos; ajustar contraste de libros/madera y relleno cálido existente. |
| Archivos / prioridad / impacto | retreat-refinement.ts, retreat-global-visuals.ts, materiales/luz del Retiro. G1.1 / O1 / A4. Alta; no ampliar pasillos para resolver un defecto visual. |

### A5 · Templo de Bahamut

| Criterio | Diagnóstico / propuesta |
|---|---|
| Núcleo / existente | Punto alto a 27 m; saliente abierto, muro posterior tallado, puntales arqueados, columnas, madera, anciano pétreo, siete canarios y cuatro ofrendas de incienso. |
| Conservar | Saliente con aire/mar debajo, arcos y accesos; estatua, aves, ofrendas y Runara. No sustituirlo por una plataforma maciza o un templo monumental nuevo. |
| Entorno y fondo | Actualmente pináculo separado del macizo A3/A4. El respaldo debe conectar por el norte inmediato; tres frentes siguen abiertos. |
| Deficiencia verificada | A 20°/25° algunos encuadres ocupados retiran columnas/cerchas enteras y dejan bases cortas. El fondo favorece la lectura de islote. |
| Mejora exacta propuesta | Unión posterior G1.2, manteniendo vacío bajo el voladizo. Recorte de partes frontales o atenuación legible que conserve el pórtico y a los personajes. |
| Archivos / prioridad / impacto | GLB de entorno, metadatos de estructura y retreat-global-visuals.ts. G1.2 / O1 / A5. Alta; reutilización de geometría, sin nueva luz de estatua. |

### Desembarco · Playa, muelle y encuentro

| Criterio | Diagnóstico / propuesta |
|---|---|
| Núcleo / existente | Muelle, bote 3D, tarjeta del actor de viaje, playa y camino de subida; tres zombis iniciales en contenido privado del DM. |
| Conservar | Superficie beach, encuentro y destinos. TRAVEL_PECIO_BOAT enlaza con wreck-ship; Pleamar y Observatorio permanecen preparados sin destino cargado. |
| Entorno y fondo | Costa muy fina, plataforma forestal plana y rocas emergentes. La bahía debe mantenerse abierta y la salida terrestre apoyarse sobre costa conectada. |
| Deficiencia verificada | Dos representaciones de la barca con alturas/orientaciones distintas. La plataforma forestal termina en un borde abrupto sobre el agua; repetición de árboles cónicos. |
| Mejora exacta propuesta | Conservar casco 3D y el mismo actor funcional sin duplicar su imagen. Añadir talud decorativo por debajo/fuera del suelo y costa irregular; nada en el área del encuentro. |
| Archivos / prioridad / impacto | retreat-runtime.ts para presentación del token solo si se implementa; GLB costero, retreat-refinement-coast.ts y scenic-depth. G1.4. Alta; sin nuevos obstáculos. |

### Sector marítimo

| Criterio | Diagnóstico / propuesta |
|---|---|
| Existente / conservar | Mar animado nativo de 360 m, espuma y límite de altura 0,08 m en el desembarco. No reactivar el mar estático duplicado P7. |
| Deficiencia verificada | Borde finito del agua y blanco detrás a 5°/10°; contraste azul repetido muy dominante en vistas lejanas. |
| Mejora exacta propuesta | Prolongación periférica 3D de baja subdivisión conectada al mar existente; mismo material y continuidad de altura/color. Afinar contraste y espuma solo en contactos reales. |
| Archivos / prioridad / impacto | retreat-refinement-coast.ts y coastal-backdrop.ts como propietario actual; cambio compartido únicamente si se demuestra necesario y acotado. C1 / L1. Alta; sin otro pase de reflejo. |

### Sector de acantilados

| Criterio | Diagnóstico / propuesta |
|---|---|
| Existente / conservar | Piel Stone S3: 21 mallas y 28.514 triángulos. Basalto, repisas, arcos, caminos y cotas actuales. |
| Deficiencia verificada | Masas separadas por el respaldo ausente; grandes paños uniformes, bandas horizontales repetidas y una junta azul bajo el camino alto. No se han demostrado texturas estiradas ni una caída física por esa junta. |
| Mejora exacta propuesta | Resolver primero continuidad de masa. En la junta, comprobar triángulos y colocar faldón visual bajo el pavimento si se confirma; variación de silueta solo fuera de rutas. |
| Archivos / prioridad / impacto | Fuente Blender y GLB de entorno, materiales específicos del Retiro. G1 / A1 / M1. Alta; no desplazar suelos ni navegación. |

### Interior inmediato de la isla · norte local

| Criterio | Diagnóstico / propuesta |
|---|---|
| Existente / conservar | Coronas locales del templo y las cuevas; lote a1:ridge:continuation original desactivado. Contiene caras de meseta reutilizables. |
| Deficiencia verificada | El agua comienza justo detrás de A3/A4/A5. Las capas reservadas de entorno medio no aportan masa terrestre conectada. |
| Mejora exacta propuesta | Seleccionar caras posteriores del lote antiguo y exportar una copia decorativa ajustada. No habilitar el lote entero: también contiene costa y caras capaces de solapar rutas. |
| Archivos / prioridad / impacto | Fuente A1 de solo lectura; nuevo Blender/GLB y importación en retreat-refinement.ts. G1.1–G1.3. Crítica; presupuesto global, sin colisión ni casillas nuevas. |

### Lateral oeste · A5 y retorno de costa

| Criterio | Diagnóstico / propuesta |
|---|---|
| Existente / conservar | Escalera al templo, pináculo, puntales y frente costero. El mapa local sitúa aquí el extremo del templo. |
| Deficiencia verificada | Falta unión del respaldo con el macizo central. El giro horizontal expone el corte y el espacio vacío entre masas. |
| Mejora exacta propuesta | Conexión rocosa posterior irregular y retorno costero finito. No rellenar debajo del templo ni crear una cordillera occidental nueva. |
| Archivos / prioridad / impacto | GLB de entorno, importación existente. G1.2. Alta; dentro del presupuesto geográfico. |

### Lateral este · A2 y salida Observatorio

| Criterio | Diagnóstico / propuesta |
|---|---|
| Existente / conservar | Edificio y descenso del cabrestante, camino alto y corredor Observatorio a Y18 m: X139,5–142,5 / Z49,5–64,5. |
| Deficiencia verificada | El corredor y su tierra parecen aislados sobre el agua; falta contexto terrestre continuo. |
| Mejora exacta propuesta | Respaldo y costa curva; reserva explícita del corredor más volumen corporal. La continuación regional E/SE ocurre fuera del escenario y no obliga a mover la salida local. |
| Archivos / prioridad / impacto | GLB de entorno; global-layout y terrain-v2 solo lectura. G1.3. Crítica; no colisión nueva sobre la reserva. |

### Lateral bajo · Pleamar y borde suroeste

| Criterio | Diagnóstico / propuesta |
|---|---|
| Existente / conservar | Sendero terrestre y playa a cota baja; salida Pleamar X4,5–18 / Z111–114. |
| Deficiencia verificada | Pad de tierra plano, canto fino y árboles aislados; falta pendiente visual que lo ancle a una costa mayor. |
| Mejora exacta propuesta | Talud irregular por debajo/fuera de la huella, agrupaciones pequeñas de vegetación en suelo plausible. Mantener bahía y punto de viaje. |
| Archivos / prioridad / impacto | Envolvente costera y scenic-depth/vegetación existentes. G1.4 / E1. Alta; ninguna ampliación del mapa jugable. |

### Fondo regional y horizonte

| Criterio | Diagnóstico / propuesta |
|---|---|
| Existente / conservar | Cuatro conos 3D lejanos y cúpula; existen propietarios de cielo y clima, sin necesidad de otro sistema. |
| Deficiencia verificada | Conos con ubicación no documentada por el mapa 1 y aspecto de grandes triángulos celestes; cúpula blanca. No prueban profundidad geográfica coherente. |
| Mejora exacta propuesta | Corregir cielo y continuidad antes de estilizar el fondo. Reutilizar formas como crestas bajas únicamente donde G0 justifique tierra, con menor contraste por distancia. |
| Archivos / prioridad / impacto | retreat-scenic-depth.ts, retreat-refinement-coast.ts y envolvente. C1 / E1 / L1. Alta para cielo; media para detalle. Nada de telón plano. |

## 8. Cinco planos de profundidad y composición 2.5D

| Plano | Estado real | Corrección localizada propuesta |
|---|---|---|
| 1 · Primer plano | Tres rocas decorativas, mar y bordes; algunas dominan giros bajos. | Mantener en los márgenes y su atenuación existente; variar solo silueta y anclaje. Nada delante del cuerpo jugable como marco permanente. |
| 2 · Juego | Suelos, actores, habitaciones y rutas completos; lectura del personaje protegida por recorte. | Resolver la desaparición de muebles y mantener accesos y suelo más claros que el detalle mineral. Sin profundidad de campo sobre personajes/cuadrícula. |
| 3 · Entorno medio | Insuficiente: masas locales terminan en agua. Capas reservadas no aportan geometría. | G1.1–G1.4: terreno conectado inmediatamente detrás y taludes laterales. Principal inversión geométrica. |
| 4 · Fondo | Cuatro conos a cientos de metros, sin registro regional; se leen como triángulos celestes. | Solo después de G0, crestas 3D bajas en sectores terrestres justificados; menor contraste, misma biblioteca. No montañas nuevas canónicas. |
| 5 · Horizonte | Mar finito, cúpula blanca y ausencia de transición creíble en vistas bajas. | C1: continuidad geométrica de agua periférica y material de cielo. L1: bruma por distancia del entorno, sin lechar el suelo táctico. |

| Inclinación existente | Lectura y carencias comprobadas en los cinco giros | Criterio de composición sin cambiar ángulos |
|---|---|---|
| 5° | Suelo muy comprimido, obstáculos bajos cubren pies, cielo blanco y conos/final de mar expuestos. | Fondo y agua cerrados; siluetas laterales subordinadas. El zoom no garantiza ocultar zonas lejanas. |
| 10° | Interior por defecto; se aprecian entradas, pero la envolvente recortada y el fondo plano dominan. | Respaldo permanente y luz interior medida. Mantener escala al cruzar puertas. |
| 15° | Mejor lectura de suelo y profundidad local; quedan juntas y repetición de paños. | Unir masa media y reducir contraste repetido de pavimento/roca. |
| 20° | Aumenta lectura táctica; algunos tramos del pórtico A5 desaparecen por lote. | Recorte localizado sin destruir la identidad arquitectónica. |
| 25° | Mejor lectura de circulación; se ve claramente el islote, suelo repetido y ausencia de muebles en giros concretos. | Priorizar continuidad posterior, muebles presentes y límite de zoom. |

Los giros −30°/+30° exponen los retornos de ambos lados; 0° permite comparar alturas y doble recorrido; −15°/+15° son esenciales para reproducir los muebles que desaparecen. Faltan sobre todo terrenos detrás del conjunto y retornos de costa; añadir decoración indiscriminada frente a la cámara empeoraría la legibilidad.

Inspiración visual autorizada, sin copiar recursos: la combinación de sprites y geometría 3D de HD-2D descrita por [Square Enix](https://www.square-enix-games.com/en_US/home/octopath-traveler-ii-ochette-castti-character-trailer) y [Nintendo](https://www.nintendo.com/en-gb/Games/Nintendo-Switch-games/OCTOPATH-TRAVELER-II-2267059.html). Aquí se toma como referencia la jerarquía de planos, no la saturación, el desenfoque táctico ni un decorado plano.

## 9. Materiales, luz, vegetación y atmósfera

| Elemento | Estado y propuesta concreta | Validación |
|---|---|---|
| Basalto | S3 opaco, sin parches negros nuevos observados. Reutilizar albedo/normal/ORM, variación mineral amplia y detalle fino discreto; ajustar paños uniformes tras unir el macizo. | Tres zooms y transición material a semialtura 16 m. Revisar alfa, normales/tangentes y UV de cada pieza que realmente se edite. |
| Pavimento | Losas contrastadas atraen más atención que sprites pequeños. Mantener geometría y escala; reducir contraste de albedo y repetición perceptiva. | Personaje y entradas legibles a 28 m de ancho sin convertirlo en una superficie borrosa. |
| Madera y metal | Muebles, biblioteca, cubierta y mecanismo ya existen. Desgaste salino sobrio y rugosidad compartida; no sumar un material por objeto. | Comparar detalle y lejanía; sin brillo que lave los libros ni metal lujoso. |
| Luz exterior | Hemisférica/solar existentes, foco de sombra ajustado al mundo. terrain-ambient está deshabilitada; no hay prueba de doble ambiente activo. | Sombras de estructura/actores a tres inclinaciones y giros extremos; revisar mapa 512/1024 según calidad, sin otro sol. |
| Interiores | Dos rellenos cálidos A3/A4 de intensidad 0,24 ya funcionan sin mapas propios. Las celdas tienen luces locales condicionadas. | Conservar legibilidad diurna/nocturna, contacto bajo muebles y transiciones; ajustar rango/contraste antes de sumar luces. |
| Vegetación | Huerto existente y árboles cónicos en pads; entorno medio poco habitado. | Instancias agrupadas en tierra/grietas reales, no por casilla; nada que invada rutas o haga parecer ruinas al claustro cuidado. |
| Agua y costa | Mar y espuma animados, suelo bajo protegido. Oleaje visual dominante a distancia. | Continuidad agua periférica, costa sin inundación ni reflejos nuevos por defecto. |
| Bruma y cielo | Cúpula blanca confirmada; geografía lejana incoherente. | Primero corregir material/cierre; luego tinte por profundidad solo al fondo, sin velar táctico. |
| Lluvia | Se observan trazos proyectados sobre una celda con techo recortado. La imagen no basta para afirmar una filtración física. | Revisar máscara/weatherCovered y profundidad de esas partículas, además del coste alto medido, en la fase L1. |

No se propone SSAO global ni un nuevo postprocesado por defecto: hay sombras de contacto y oclusión dibujada existentes que deben conservarse y medirse. Solo añadir un efecto si una comparación localizada demuestra mejora y coste aceptable. La ausencia de un efecto no es por sí misma un fallo.

## 10. Rendimiento y compatibilidad

Equipo observado: ANGLE (Intel, Intel(R) UHD Graphics (0x00009B41) Direct3D11 vs_5_0 ps_5_0, D3D11), WebGL2/ANGLE. Prueba por redibujado forzado con finalización GPU, 8 cuadros de calentamiento y **24 muestras por encuadre**. Los valores siguientes son costes de CPU+GPU con sincronización; **no son FPS sostenidos**. El contador habitual de FPS se distorsiona al quedar el navegador en segundo plano, por lo que no se usa como resultado.

| Rol | Tamaño del host | Rango de medianas de seis vistas (ms) | Mayor p95 (ms) | Recursos preparados |
|---|---|---:|---:|---:|
| dm | 1280×720 | 6,40–17,80 | 21,50 | 6/6 |
| dm | 390×844 | 6,70–16,80 | 21,40 | 6/6 |
| dm | 1920×1080 | 9,50–33,50 | 70,30 | 6/6 |
| player | 1280×720 | 6,00–17,30 | 40,80 | 6/6 |
| player | 390×844 | 6,00–14,90 | 18,90 | 6/6 |
| player | 1920×1080 | 4,80–23,30 | 51,90 | 6/6 |
| projector | 1280×720 | 7,70–22,10 | 82,00 | 6/6 |
| projector | 390×844 | 6,30–20,40 | 29,90 | 6/6 |
| projector | 1920×1080 | 8,40–30,40 | 45,10 | 6/6 |

En 1280×720, la vista general diurna registra aproximadamente **536 llamadas de dibujo**; vistas locales DM: 70 playa, 98 A3, 162 A4, 54 A5 y 81 celda 1 en esas muestras. Las sombras pueden cambiar ese recuento entre cuadros; una muestra 1920×1080 de A3 sube a 545 llamadas. No se interpreta cada diferencia como geometría nueva.

Texturas GPU cargadas estimadas: 56 y **73,74 MiB** en perfiles diurnos; tras clima, 58 y **75,22 MiB**. Estimación RGBA8 con mipmaps, no memoria total de proceso ni VRAM exacta. 73 objetos de textura en la escena y 56 entradas de caché del motor no son la misma medida. Se definen 18 luces; terrain-ambient está deshabilitada y varias luces habilitadas tienen intensidad cero. No equivalen a 18 luces caras activas sobre todos los objetos.

| Clima a 1280×720 | Vista | Mediana / p95 (ms) | Llamadas de dibujo |
|---|---|---:|---:|
| night | Conjunto | 56,50 / 70,10 | 540 |
| night | Desembarco | 17,60 / 27,90 | 72 |
| night | A3 · Comedor/cocina | 24,40 / 32,70 | 100 |
| night | A4 · Biblioteca | 55,00 / 76,40 | 164 |
| night | A5 · Templo | 30,30 / 43,50 | 54 |
| night | Celda libre | 29,00 / 50,10 | 86 |
| overcast-rain | Conjunto | 55,60 / 67,10 | 1011 |
| overcast-rain | Desembarco | 22,50 / 31,90 | 71 |
| overcast-rain | A3 · Comedor/cocina | 42,90 / 58,70 | 99 |
| overcast-rain | A4 · Biblioteca | 57,60 / 97,00 | 163 |
| overcast-rain | A5 · Templo | 47,90 / 132,10 | 52 |
| overcast-rain | Celda libre | 99,90 / 187,40 | 82 |

La lluvia eleva la escena a 1.231 mallas y la vista general llega a 1.011 llamadas en esa muestra. El coste después de cambios climáticos requiere reproducción y aislamiento: la auditoría no permite certificar una tasa estable de cuadros, atribuir todo a una sola luz ni garantizar rendimiento móvil. Los tamaños 390×844 y 1920×1080 son hosts redimensionados sobre la misma GPU de escritorio; no son pruebas de teléfono o proyector físico ni recrean por sí solos la ruta de calidad táctil.

Presupuesto inicial propuesto para G1 completo: hasta 24.000 triángulos, 18 mallas y 1,5 MiB nuevos, compartiendo materiales; cero luces o mapas de sombra adicionales. Vegetación posterior: hasta 64 instancias y menos de ocho llamadas adicionales como objetivo de partida. Son límites de diseño sujetos a perfilado, no resultados garantizados. Evitar fusionar objetos que necesiten ocultación independiente. Material LOD existente no sustituye un eventual LOD geométrico del fondo.

## 11. CANON frente a VTT_AMBIENCE

| CANON verificado en la aventura | VTT_AMBIENCE / adaptación técnica |
|---|---|
| Claustro en acantilado volcánico de una isla extensa; bahía, vegetación verde y cielo con nubes/luz. | Forma exacta y cotas de la prolongación decorativa, cantidad de grietas, tinte y bruma. No declararlas geografía oficial. |
| A1: doble recorrido, jardines, plaza, seis celdas y estatua de piedra que representa un dragón de bronce. | Shader/material de roca y envejecimiento. No convertir «dragón de bronce» en obligación de estatua fundida en bronce. |
| A2: casa a dos aguas, puerta, cabrestante y palé; descenso de 15 m y manejo adjudicado. | Desgaste salino y detalle mecánico sobrio; encuadre para entender verticalidad. |
| A3: mesa larga, dos bancos, una silla, corredor y cocina pequeña ordenada. | Cuencos, utensilios, luz cálida y vapor sutil existente. No multiplicar sillas ni hacer taberna. |
| A4: puerta roble/hierro, libros, tres estantes independientes, mesa/bancos, atriles y lámparas. | Acabado de materiales y legibilidad de props, conservando pasillos y distribución. |
| A5: templo alto abierto, muro norte excavado, madera, columnas, puntales, anciano con siete canarios e incienso. | Recorte para VTT y luz de contacto; sin nueva aura, lujo o arquitectura monumental. |
| Desembarco, barca y tres zombis iniciales; conversación, descanso y viajes narrados. | Puntos de interacción y representación 3D. Dados y decisiones permanecen físicos/manuales. |

## 12. Pruebas: resultado y límites

| Control | Resultado de esta auditoría |
|---|---|
| Pruebas existentes de cámara, combate/cámara, terreno, navegación, runtime y regresiones | **68/68 aprobadas**, 11 archivos; cero pruebas añadidas o snapshots actualizados. |
| Matriz de cámara | 1.000 encuadres únicos; recursos visibles preparados en todos; cero errores registrados. |
| Rayos sobre actor, altura 0,75 y 1,35 m | Cero impactos bloqueantes en la matriz después de ocultación. Esto no valida la conservación de mobiliario. |
| Actor principal en marco | Dentro de pantalla en la matriz. No certifica PNJ lejanos ni todos los actores de combate. |
| Apoyo visual en 11 focos × nueve ángulos | Suelo de soporte encontrado en 99/99 poses. Rayos a pies/piernas detectan oclusiones puntuales que quedan documentadas. |
| Mobiliario, seis celdas × cinco giros | Lote oculto en diez de 30 vistas a 25°. **Fallo visual abierto**. |
| Roles y diseños de pantalla | 54/54 preparados; cero errores. Cinco muestras fraccionales adicionales. |
| Escala de los tres personajes | Renders de Mike 1,80 m, Mia 1,30 m y Maria 1,05 m a semialtura 8 m. |
| Conservación de fuentes protegidas | 2.112 archivos idénticos por SHA-256 durante la auditoría. |
| Recorrido físico exhaustivo, puertas accionadas en partida, persistencia y sesiones largas | **No repetidos en esta auditoría**. Existen evidencias anteriores, que no se convierten en pruebas nuevas. Deben repetirse al implementar. |
| Móvil y proyector físicos / FPS sostenidos / memoria del proceso | Pendientes de sesión representativa en cada dispositivo. |

No se han encontrado nuevas regresiones de navegación con estas comprobaciones, pero no se declara el mapa terminado ni libre de toda colisión por aprobar rayos de cámara o colocar un personaje en destinos. La aceptación final requiere caminar por todas las zonas, comprobar puertas, escaleras, bordes, cuadrícula, viajes y estados en una partida de prueba.

## 13. Evidencia visual y comparativa

- **G1 · El conjunto se percibe como un islote:** Estado actual, 25° / 0°. Las masas del comedor/biblioteca y del templo terminan directamente en el agua. Conectar únicamente el respaldo terrestre y conservar la bahía delantera. [Original](<C:/Users/User/Desktop/Dungeons/output/retreat-audit-20261021/evidence/vtt-overview-t25-y0-zfull.jpg>) · [Anotación](<C:/Users/User/Desktop/Dungeons/output/retreat-audit-20261021/annotated/geography.svg>)
- **C1 · Cielo blanco y final visible del mar:** Estado actual, 5° / −30°. El blanco pertenece a la cúpula; las grandes diagonales azules son conos de fondo. El mar finito también queda expuesto en el borde inferior. [Original](<C:/Users/User/Desktop/Dungeons/output/retreat-audit-20261021/evidence/vtt-overview-t5-y-30-zfull.jpg>) · [Anotación](<C:/Users/User/Desktop/Dungeons/output/retreat-audit-20261021/annotated/sky.svg>)
- **G1.4 · Dos representaciones de la embarcación:** La tarjeta del actor de viaje y el casco 3D aparecen juntos. Conservar la interacción y el casco; resolver su presentación duplicada. El terreno forestal necesita un talud visual en su borde. [Original](<C:/Users/User/Desktop/Dungeons/output/retreat-audit-20261021/evidence/vtt-beach-t25-y0-zmid.jpg>) · [Anotación](<C:/Users/User/Desktop/Dungeons/output/retreat-audit-20261021/annotated/boats.svg>)
- **O1 · Muebles ocultos por un giro de cámara:** Celda 1, 25° / −15°, zoom intermedio. El lote de muebles queda con isVisible=false; permanecen cojín y ropa de cama separados. No se ha borrado ni recolocado mobiliario. [Original](<C:/Users/User/Desktop/Dungeons/output/retreat-audit-20261021/evidence/vtt-room1-t25-y-15-zmid.jpg>) · [Anotación](<C:/Users/User/Desktop/Dungeons/output/retreat-audit-20261021/annotated/furniture-hidden.svg>)
- **O1 · La misma celda, con los muebles presentes:** Celda 1, 25° / 0°, mismo zoom. La comparación aísla el efecto del giro; no representa un antes/después de una modificación. [Original](<C:/Users/User/Desktop/Dungeons/output/retreat-audit-20261021/evidence/vtt-room1-t25-y0-zmid.jpg>) · [Anotación](<C:/Users/User/Desktop/Dungeons/output/retreat-audit-20261021/annotated/furniture-visible.svg>)
- **A3 · Interior legible, respaldo ausente al recortar:** Mesa, bancos, silla y cocina permanecen. Al ocupar la sala desaparece una parte excesiva de la envolvente y el mar queda detrás de la habitación. [Original](<C:/Users/User/Desktop/Dungeons/output/retreat-audit-20261021/evidence/vtt-a3-t25-y0-zfar.jpg>) · [Anotación](<C:/Users/User/Desktop/Dungeons/output/retreat-audit-20261021/annotated/a3.svg>)
- **A4 · Biblioteca excavada que se lee como una caja:** La puerta y los pasillos se conservan. Hay que separar el techo que se oculta de la masa posterior que debe continuar hacia la isla. [Original](<C:/Users/User/Desktop/Dungeons/output/retreat-audit-20261021/evidence/vtt-a4-t25-y0-zfar.jpg>) · [Anotación](<C:/Users/User/Desktop/Dungeons/output/retreat-audit-20261021/annotated/a4.svg>)
- **A5 · El recorte debilita la silueta del templo:** El templo conserva sus elementos, pero en este encuadre ocupado faltan partes completas de cubierta y columnas. Conservar lectura de pórtico sin ocultar al personaje. [Original](<C:/Users/User/Desktop/Dungeons/output/retreat-audit-20261021/evidence/vtt-a5-t25-y0-zfar.jpg>) · [Anotación](<C:/Users/User/Desktop/Dungeons/output/retreat-audit-20261021/annotated/a5.svg>)
- **A2 · El palé está fuera del encuadre local:** El mecanismo y su descenso existen. El encuadre de refugio usa una altura local de 4 m y recorta la relación de 15 m hasta el agua; no es una ausencia de geometría. [Original](<C:/Users/User/Desktop/Dungeons/output/retreat-audit-20261021/evidence/vtt-a2-t25-y0-zfar.jpg>) · [Anotación](<C:/Users/User/Desktop/Dungeons/output/retreat-audit-20261021/annotated/a2.svg>)
- **A1 / accesos · Junta azul bajo el pavimento:** La junta visual está confirmada. Las cotas de los límites son compatibles con una separación centimétrica; queda pendiente comprobar los triángulos concretos antes de atribuirle un hueco físico. [Original](<C:/Users/User/Desktop/Dungeons/output/retreat-audit-20261021/evidence/vtt-upper-t25-y0-znear.jpg>) · [Anotación](<C:/Users/User/Desktop/Dungeons/output/retreat-audit-20261021/annotated/joint.svg>)

La galería permite comparar zoom actual/candidato y celda con muebles visibles/ocultos. Es una comparación entre encuadres del **estado actual**, no una mejora geométrica ya realizada. No hay «después» arquitectónico porque el encargo prohíbe implementarlo antes de revisión.

Galería local: [abrir auditoría visual](<C:/Users/User/Desktop/Dungeons/output/retreat-audit-20261021/index.html>). Datos compactos: [gallery-data.json](<C:/Users/User/Desktop/Dungeons/output/retreat-audit-20261021/gallery-data.json>). Hojas de contacto: [manifest.json](<C:/Users/User/Desktop/Dungeons/output/retreat-audit-20261021/contact-sheets/manifest.json>).

## 14. Archivos creados y siguiente tarea

Solo se han creado herramientas y entregables de auditoría: `prototypes/retreat-audit-20261021/` (visor aislado, capturas, análisis y generador), `output/retreat-audit-20261021/` (evidencias, galería, planta y anotaciones), este informe y el roadmap. Ningún archivo existente de producción, asset, mapa, celda, navegación o estado se ha cambiado.

Siguiente tarea recomendada: revisar la planta G0 y comenzar **G1.1, respaldo de A3/A4**, como única zona de intervención; comparar antes/después en los mismos encuadres y cerrar esa subfase antes de seguir. Los fallos de oclusión/cielo y el tope de zoom quedan descritos y dimensionados para su fase correspondiente. El orden evita invertir en texturas mientras la masa y el fondo siguen sin continuidad.

Roadmap ejecutable: [RETREAT_ROADMAP_20261021.md](<C:/Users/User/Desktop/Dungeons/docs/audits/RETREAT_ROADMAP_20261021.md>). La auditoría concluye aquí para revisión conceptual; no se han ejecutado las propuestas.

**Comprobación de la entrega:** 1.205 imágenes únicas presentes y válidas, once SVG válidos y ningún enlace local roto en los informes. La galería se ha abierto en la app, con filtros, ampliación de imágenes, detalle de subfase y comparación de A1/A3 comprobados; no se registran errores de consola. [Registro de integridad](<C:/Users/User/Desktop/Dungeons/output/retreat-audit-20261021/delivery-verification.json>) y [captura de la entrega](<C:/Users/User/Desktop/Dungeons/output/retreat-audit-20261021/evidence/delivery-zoom-ui.png>).
