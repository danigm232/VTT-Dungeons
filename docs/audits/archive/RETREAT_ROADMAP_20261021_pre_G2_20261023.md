# Retiro del Dragón · Roadmap de intervención por subfases

**Plan original: 21/10/2026. Estado de ejecución actualizado: 23/10/2026.**

**Propuesta conceptual posterior a O1:** priorizar G2, continuidad de la propia
isla y comienzos jugables de expedición, antes de los acabados A1. E1 describía
principalmente fondo/vegetación; G2 añade el estudio de corredores transitables
y viajes alternativos canónicos. [Análisis, planta y rutas](<C:/Users/User/Desktop/Dungeons/docs/design/RETREAT_ISLAND_CONTINUITY_PROPOSAL_20261023.md>).
Pendiente de revisión conceptual: no hay geometría ni navegación G2 implementadas.

G0, G1.1–G1.4, C1, C2 y O1 están entregadas. Se propone G2 antes de A1,
pendiente de la revisión conceptual indicada arriba.
Los objetivos agregados de coste C1 y O1 requieren seguimiento en Q1;
O1 conserva cinco focos por encima del +10 %, sin certificar FPS sostenidos.
Entrega O1: [informe y pruebas](<C:/Users/User/Desktop/Dungeons/docs/evidence/RETREAT_OCCLUSION_O1_20261023.md>),
[fotos antes/después](<C:/Users/User/Desktop/Dungeons/output/retreat-occlusion-o1-20261023/index.html>).
El Retiro está comprobado en el DM real del puerto 3000. Se corrigió la niebla
guardada que ocultaba el escenario, conservando el clima y los datos de partida.
Las entregas C1/C2 están en [su galería](<C:/Users/User/Desktop/Dungeons/output/retreat-camera-c1c2-20261023/index.html>).
El detalle vigente está en [PROGRESS.md](<C:/Users/User/Desktop/Dungeons/prototypes/retreat-geography-20261021/PROGRESS.md>)
y la entrega geográfica anterior en [RETREAT_GEOGRAPHY_G1_20261023.md](<C:/Users/User/Desktop/Dungeons/docs/evidence/RETREAT_GEOGRAPHY_G1_20261023.md>).
Tras la ampliación A2–A5 autorizada, la base actual tiene **980 casillas**;
las 850 citadas en el contrato original inferior describen la auditoría del
21/10 y no deben restaurarse sobre el estado actual. Ángulos, escala y A1
siguen conservados.

Informe base: [RETREAT_AUDIT_20261021.md](<C:/Users/User/Desktop/Dungeons/docs/audits/RETREAT_AUDIT_20261021.md>). Galería: [index.html](<C:/Users/User/Desktop/Dungeons/output/retreat-audit-20261021/index.html>).

## Contrato de conservación

Mismas 850 casillas, 10 superficies, 15 conexiones, 87 obstáculos, 33 bordes, dos puertas, 13 puntos, guardados y 128 mallas originales A1. Cámara 5–25 grados, giro ±30 grados.

Todas las coordenadas, dimensiones, muebles, interacciones, navegación y guardados existentes se conservan. Los cambios nuevos son visuales salvo una corrección demostrada y acotada del encuadre por rol. Toda extensión propuesta es VTT_AMBIENCE, aunque responda a la necesidad canónica de integrar el Retiro en una isla mayor. Las cotas nuevas no proceden del mapa oficial.

## Orden de ejecución

1. **G0 · Fijar el marco geográfico y la reserva jugable** — P0.
2. **G1.1 · Continuidad posterior de A3/A4** — P0.
3. **G1.2 · Unir el respaldo del templo y las coronaciones de A1** — P0.
4. **G1.3 · Resolver el flanco A2 y el camino del Observatorio** — P0.
5. **G1.4 · Naturalizar la conexión baja y el desembarco** — P1.
6. **C1 · Cerrar mar y cielo en los encuadres permitidos** — P0.
7. **C2 · Limitar el alejamiento del jugador** — P1.
8. **O1 · Recorte local de roca, paredes y estructura** — P1; regresión visual confirmada.
9. **A1 · Encuentro de la roca con las seis entradas** — P2.
10. **A3 · Comedor y cocina: integrar sin redistribuir** — P2.
11. **A4 · Biblioteca: acabado y respaldo permanente** — P2.
12. **A2 · Cabrestante: lectura vertical y relación con el agua** — P2.
13. **A5 · Templo: preservar silueta y serenidad** — P2.
14. **M1 · Basalto y pavimento a dos escalas** — P2.
15. **E1 · Vegetación y geografía lejana conectadas** — P2.
16. **L1 · Luz, mar y atmósfera después de la estructura** — P2.
17. **Q1 · Optimización y cierre verificable** — P0 de cierre.

## Cierre obligatorio en cada subfase

Registrar fuentes y hashes de conservación; guardar originales con mismo actor, tiempo/clima, ángulo, zoom y tamaño de pantalla; implementar únicamente el alcance indicado; revisar cinco inclinaciones y cinco giros, cerca/medio/lejos, exterior/ocupado; repetir las pruebas aplicables y coste por vista; resolver regresiones importantes y documentar archivos/capturas/resultados antes de avanzar. En geometría junto a rutas, repetir recorrido físico y comprobar volumen corporal. Capturas de un actor colocado no sustituyen caminar.

Presupuesto de partida: geografía completa ≤24.000 triángulos, ≤18 mallas, ≤1,5 MiB adicionales; cero luces/mapas de sombras nuevos. Objetivo de coste: no empeorar mediana más del 10 % en mismo equipo/encuadre y comparar también p95, pendiente de acordar al implementar. Si se rebasa, simplificar el entorno decorativo antes de ampliar presupuesto.

No crear controles del DM para cada capa. Reutilizar gestores de clima, cámara, materiales, instancias, ocultación y navegación. No tocar D8 ni otros escenarios para una mejora específica del Retiro. Ante un defecto compartido, justificar y probar una solución acotada.

## G0 · Fijar el marco geográfico y la reserva jugable

**Prioridad:** P0. **Impacto previsto:** Solo documentación; coste de render cero.

1. **Zona y elementos:** Conjunto y mapas oficiales 1/2
2. **Problema verificado:** La ausencia de registro geográfico favorece confundir los lados de una captura con los rumbos del mapa; los conos del fondo no documentan una geografía oficial.
3. **Resultado visual:** Plano de sectores con norte local, bahía y conexión regional hacia la isla mayor, aprobado antes de modelar.
4. **Cambios geométricos exactos:** Ninguna modificación. Superponer las huellas existentes y las reservas de navegación en una planta; marcar como orientativas las distancias regionales y como métricas las coordenadas locales.
5. **Materiales, iluminación y entorno:** Sin cambios.
6. **Componentes y archivos:** global-layout.json y retreat-terrain-v2.json solo lectura; documentación nueva del Retiro y fuente Blender de la futura envolvente.
7. **Dependencias:** Aceptación de esta auditoría.
8. **Riesgos de regresión:** Asignar mar o terreno al lado equivocado; tratar la salida local de una expedición como rumbo regional rectilíneo.
9. **Pruebas y capturas:** Comparar mapas 1/2 y planta local. Hash de fuentes, celdas y datos de juego. Reservar cada superficie más 0,60 m en planta y su volumen corporal.
10. **Aceptación verificable:** Sectores tierra/mar definidos sin mover ninguna coordenada ni crear nuevas casillas. El norte inmediato del claustro no se interpreta como una cordillera infinita.

## G1.1 · Continuidad posterior de A3/A4

**Prioridad:** P0. **Impacto previsto:** Presupuesto inicial conjunto geográfico: hasta 24.000 triángulos, 18 mallas y 1,5 MiB adicionales; medir antes de aceptar, sin nuevas sombras locales.

1. **Zona y elementos:** Franja central norte: X 85–135; junta actual Z 38–58
2. **Problema verificado:** Las salas tienen envolvente local, pero se ve mar inmediatamente detrás de su coronación; parecen una masa independiente.
3. **Resultado visual:** Habitaciones excavadas en el borde de una masa terrestre continua.
4. **Cambios geométricos exactos:** Reutilizar por selección de caras la meseta original hoy incluida en a1:ridge:continuation. Exportar una copia visual independiente, sin reactivar el lote entero. Unir las caras traseras del macizo actual a un relieve irregular hasta Z aproximadamente -60; cotas iniciales orientativas 26–42 m, VTT_AMBIENCE. Respetar la reserva de la salida Observatorio. Mantener intactos interiores y paredes originales.
5. **Materiales, iluminación y entorno:** Mismos basalto, UV de escala métrica y biblioteca compartida. Variación amplia por vértice; ninguna textura nueva necesaria.
6. **Componentes y archivos:** prototypes/retreat-refinement/refine_environment.py como referencia; nuevo archivo Blender y GLB de entorno; retreat-refinement.ts como propietario de importación; retreat-global-visuals.ts para metadatos existentes.
7. **Dependencias:** G0.
8. **Riesgos de regresión:** Enterrar la salida Observatorio, tapar personajes o borrar el fondo cuando se aplica el recorte de A3/A4.
9. **Pruebas y capturas:** Exterior y ocupación de A3/A4 a cinco inclinaciones, cinco giros y tres zooms. Recorrido/cápsula contra geometría candidata y comprobación de reservas. Misma planta antes/después.
10. **Aceptación verificable:** No aparece mar a través de la junta inmediata posterior; ningún nuevo sólido invade el volumen de movimiento. La nueva masa posterior permanece visible cuando se oculta el techo local.

## G1.2 · Unir el respaldo del templo y las coronaciones de A1

**Prioridad:** P0. **Impacto previsto:** Incluido en el presupuesto geográfico de G1.1; geometría estática y sin colisión nueva.

1. **Zona y elementos:** Oeste/norte: A5 X 28–57, Z 41–66 y conexión hacia X 85
2. **Problema verificado:** El templo está sobre un pináculo aislado y la franja entre él y el macizo de A3/A4 carece de continuidad posterior.
3. **Resultado visual:** A5 sobresale de un acantilado perteneciente al mismo claustro; A1 conserva su frente exacto.
4. **Cambios geométricos exactos:** Añadir una unión irregular por detrás de Z 60, desde el respaldo del templo hasta G1.1. Mantener abiertos los lados marinos de A5, sus arcos y la escalera de 18 a 27 m. Extraer únicamente geometría decorativa de respaldo; no editar las 128 mallas ni las seis habitaciones A1. Ningún relleno delante de sus accesos.
5. **Materiales, iluminación y entorno:** Basalto compartido y sombra propia del relieve, sin oscurecer globalmente el templo.
6. **Componentes y archivos:** Fuente Blender del entorno; retreat-refinement.ts; retreat-scenic-depth.ts solo si cambia la pertenencia de piezas decorativas.
7. **Dependencias:** G1.1.
8. **Riesgos de regresión:** Convertir el saliente canónico del templo en una plataforma sobre tierra o cubrir la escalera.
9. **Pruebas y capturas:** Mismas capturas A5 y conjunto a 5/10/15/20/25 grados y ambos extremos horizontales; comprobación de arcos, apoyo y escala 27 m.
10. **Aceptación verificable:** Se conserva aire y mar bajo los puntales; la roca posterior conecta con el resto sin juntas visibles. A1 y su mobiliario conservan sus hashes y matrices.

## G1.3 · Resolver el flanco A2 y el camino del Observatorio

**Prioridad:** P0. **Impacto previsto:** Incluido en G1.1; no añadir navegabilidad al fondo.

1. **Zona y elementos:** Este/noreste: X 132–176, Z 38–70
2. **Problema verificado:** A2 y la salida forestal parecen prolongaciones independientes rodeadas de mar; el rumbo local de la salida no representa por sí solo el viaje regional.
3. **Resultado visual:** Cabo costero legible y unión al interior sin crear un islote nuevo.
4. **Cambios geométricos exactos:** Unir el respaldo del cabrestante por su cara posterior Z inferior a 62 al terreno norte. Mantener el frente y el desnivel marino de 15 m. Abrir en la nueva envolvente la reserva del corredor Observatorio X 139,5–142,5 / Z 49,5–64,5 a cota 18. Continuar la masa decorativa hacia el este, con costa curva; no prolongar rectilíneamente la ruta jugable.
5. **Materiales, iluminación y entorno:** Mismos roca/suelo; transición sobria entre suelo forestal y basalto.
6. **Componentes y archivos:** Fuente Blender/GLB de entorno; retreat-refinement.ts; global-layout.json y navegación solo lectura.
7. **Dependencias:** G1.1.
8. **Riesgos de regresión:** Obstruir la salida o rellenar el agua bajo el palé; hacer pasar un cono lejano por un accidente canónico.
9. **Pruebas y capturas:** Recorrido A1–A2–upper–Observatorio; puerta cerrada/abierta; captura lateral a -30/+30 y palé en cotas 0, 12 y 15 en una copia de revisión.
10. **Aceptación verificable:** Camino original libre, palé sobre el agua y pendiente posterior continua; ninguna transición ni trigger cambia.

## G1.4 · Naturalizar la conexión baja y el desembarco

**Prioridad:** P1. **Impacto previsto:** Puede reducir una representación superpuesta; incremento de taludes dentro del presupuesto global.

1. **Zona y elementos:** Playa, Pleamar y base del camino; X 0–74 / Z 92–130
2. **Problema verificado:** El terreno de partida se lee como una plataforma de suelo plano con contorno abrupto; hay dos representaciones de la barca en el puerto.
3. **Resultado visual:** Costa continua y una embarcación visible con el mismo viaje disponible.
4. **Cambios geométricos exactos:** Cerrar el lateral del suelo ya existente mediante taludes 3D hacia la cota marina y enlazarlos con Stone_P3_Approach_Embedded_Cliff_Sides. Conservar muelle, embarcación 3D, playa y posiciones del encuentro. Resolver la representación redundante del actor de viaje mediante su presentación existente, manteniendo ID, posición, puerto e interacción. No retirar ningún elemento de juego.
5. **Materiales, iluminación y entorno:** Humedad basal y suelo costero compartidos; espuma solo en contacto real.
6. **Componentes y archivos:** Fuente Blender del entorno; retreat-refinement-coast.ts; retreat-runtime.ts/retreat-global-visuals.ts solo para desacoplar icono visual del punto de viaje si resulta necesario.
7. **Dependencias:** G0 y revisión de la costa regional; puede cerrarse antes de G1.3.
8. **Riesgos de regresión:** Alterar la playa de zombis, la salida Pleamar o el viaje al pecio al suprimir un gráfico duplicado.
9. **Pruebas y capturas:** Capturas de costa a tres zooms, cuadrícula visible/oculta, barco y puerto en snapshot aislado; igualdad de los tres zombis privados, salidas y puerta del viaje.
10. **Aceptación verificable:** Una barca en la lectura visual y el mismo punto TRAVEL_PECIO_BOAT operativo. Sin cambios en suelo navegable, dados ni decisiones del DM.

## C1 · Cerrar mar y cielo en los encuadres permitidos

**Prioridad:** P0. **Impacto previsto:** Objetivo: hasta dos mallas y sin nuevas luces ni pases de reflexión.

1. **Zona y elementos:** Sector marítimo y horizonte
2. **Problema verificado:** A 5°/10° y en esquinas del conjunto se ve el final del mar de 360 m. Los píxeles blancos intersectan P7_Maritime_Sky_Dome; su material desactiva iluminación, tiene emisión blanca y colores de vértice blancos. Las diagonales azuladas corresponden a conos de fondo, no a nubes. La matriz del cielo está congelada pese a infiniteDistance.
3. **Resultado visual:** Horizonte continuo en todas las vistas vigentes, manteniendo la bahía al sur.
4. **Cambios geométricos exactos:** Diagnosticar propietario, transformaciones y recorte de P7_Maritime_Sky_Dome antes de editarlo. Reutilizar su esfera 3D; revisar combinación de infiniteDistance, padre GLB y matriz congelada. Añadir únicamente el faldón marino visual que falte fuera del mar animado existente, con unión oculta bajo el agua actual y sin convertir el norte terrestre en océano nuevo.
5. **Materiales, iluminación y entorno:** Corregir el material específico retreat:maritime-sky reutilizando el color/gradiente marítimo existente. No intentar curarlo cambiando maxZ, que ya es 8.400 m. Revisar el congelado y el padre de la cúpula antes de excluirla del freeze solo si la prueba demuestra desplazamiento incorrecto. Integrar costa/cielo por color y distancia sin niebla sobre el plano táctico.
6. **Componentes y archivos:** retreat-refinement-coast.ts; retreat-refinement.ts; fuente P7 del entorno. coastal-backdrop.ts solo si se demuestra indispensable y con alcance exclusivo del Retiro.
7. **Dependencias:** G0; validar nuevamente después de G1.1–G1.4.
8. **Riesgos de regresión:** Ocultar el oleaje, inundar el desembarco, volver a congelar el cielo o tapar la isla con una banda de agua.
9. **Pruebas y capturas:** Matriz completa, especialmente conjunto a 5 grados y giros extremos; rayos/píxeles de cielo, animación del agua y protección del muelle. Comparar también 1920×1080 y 390×844.
10. **Aceptación verificable:** Cero fondo blanco o borde artificial de agua en las capturas permitidas; misma protección marina de 0,08 m en el desembarco y oleaje conservado fuera de ella.

## C2 · Limitar el alejamiento del jugador

**Prioridad:** P1. **Impacto previsto:** Coste gráfico normalmente menor al mostrar menos entorno; debe medirse. No requiere controles nuevos.

1. **Zona y elementos:** Cámara de jugador del Retiro
2. **Problema verificado:** El alejamiento depende de zona y tamaño del personaje; Conjunto permite ver el mapa entero. Un zoom heredado puede mantenerse por encima del límite manual de la nueva estancia.
3. **Resultado visual:** Exploración local legible, con límite máximo comprensible y sin mostrar todo el claustro de una vez.
4. **Cambios geométricos exactos:** Ninguna. Propuesta a revisar: semialtura ortográfica máxima de 8 m y ancho máximo de 30 m, sujetos a un límite existente más cercano. Mantener los ángulos 5–25 y ±30. Reutilizar maxStageHalfHeight con una condición exclusiva dragon-rest/jugador. Conjunto debe volver al entorno del personaje en ese rol; DM y proyector conservan sus vistas actuales.
5. **Materiales, iluminación y entorno:** Ningún cambio; no usar niebla o desenfoque como sustituto del control de encuadre.
6. **Componentes y archivos:** apps/web/world.ts, exclusivamente política dragon-rest con cameraRole player y comportamiento del control ya existente. camera-zoom.ts es reutilizable sin crear otro controlador.
7. **Dependencias:** Comparativa de zoom de esta auditoría; aceptación conceptual del límite.
8. **Riesgos de regresión:** Saltos al cruzar puertas, recuperar zoom excesivo desde preferencias antiguas o centrar Conjunto lejos del personaje. El zoom por sí solo no constituye un sistema de secretos.
9. **Pruebas y capturas:** Pinza, rueda, botones, Inicio/Conjunto, reconexión, preferencias previas, A1↔A3/A4, tres personajes y tres proporciones de pantalla. Verificar que DM/proyector y otros mapas no cambian.
10. **Aceptación verificable:** En el jugador, halfHeight ≤ min(8,15/aspect) en entradas y cambios de modo; personaje completo visible; no hay salto de zoom durante un cruce que ya cumple el límite. Distinguir este encuadre de una futura política de revelado.

## O1 · Recorte local de roca, paredes y estructura

**Prioridad:** P1; regresión visual confirmada. **Impacto previsto:** Límite inicial de 4–8 piezas adicionales al dividir masas; revisar draw calls antes de cerrar.

1. **Zona y elementos:** A1, A3/A4 y A5
2. **Problema verificado:** La ocultación por rayos retira lotes completos: se verifica isVisible=false del único lote de muebles de cada celda en ciertos giros. Desaparecen camas, escritorios o hamacas mientras cojines y accesorios separados siguen visibles. También retira masas amplias de roca y estructura del templo; quedan oclusiones puntuales de pies/piernas.
3. **Resultado visual:** Interior legible que siga perteneciendo a una cavidad; templo reconocible incluso ocupado.
4. **Cambios geométricos exactos:** Conservar todas las piezas originales y sus matrices. Resolver primero la ocultación de los muebles fusionados sin reconstruirlos: atenuación legible del lote existente o exclusión selectiva con oclusión local compatible. Si una separación de submallas fuera imprescindible, demostrar igualdad de posiciones, materiales y transformaciones antes/después. Separar únicamente las nuevas pieles decorativas en techo local, respaldo permanente y fragmentos de fachada. Mantener el fondo fuera de vttCutaway y no esconder cerchas/columnas enteras si basta su parte frontal.
5. **Materiales, iluminación y entorno:** Reutilizar ocultación/visibilidad existentes, sin volver a introducir transparencia por color de vértice ni materiales duplicados por personaje.
6. **Componentes y archivos:** retreat-global-visuals.ts, retreat-refinement.ts y metadatos de los GLB nuevos; biblioteca de materiales existente.
7. **Dependencias:** G1.1/G1.2 para distinguir techo local y terreno posterior.
8. **Riesgos de regresión:** Perder accesorios al ocultar sus padres, ver otra habitación sin contexto o cambiar una colisión junto con una pared visual.
9. **Pruebas y capturas:** Rayos a pies, piernas, torso y cabeza; seis celdas, cocina, biblioteca, templo y tres personajes. Capturas exterior/ocupado con la misma inclinación. Puertas y muebles siguen bloqueando el movimiento.
10. **Aceptación verificable:** Los seis lotes de muebles siguen reconocibles en los cinco giros y al acercarse; no quedan cojines sin cama. Cuerpo legible, respaldo continuo y templo reconocible. Ningún collider, navegación o estado depende de la opacidad.

## A1 · Encuentro de la roca con las seis entradas

**Prioridad:** P2. **Impacto previsto:** Materiales compartidos; evitar nueva decoración en cada casilla.

1. **Zona y elementos:** A1 y jardines inmediatos
2. **Problema verificado:** Persisten franjas de roca repetitivas y alguna junta fina entre el sendero superior y el respaldo; el pavimento compite visualmente con las figuras.
3. **Resultado visual:** Frente excavado continuo y plaza más tranquila visualmente.
4. **Cambios geométricos exactos:** Añadir o ajustar únicamente pieles de transición fuera de los seis accesos y su reserva. Sellar juntas desde el canto inferior del pavimento hasta la roca; conservar superficie, escalones, estatua, barandillas, celdas y mobiliario exactos.
5. **Materiales, iluminación y entorno:** Variación amplia y contenida de basalto; reducir contraste del pavimento reutilizado, sin reemplazar sus piezas.
6. **Componentes y archivos:** Fuente de pieles Blender; retreat-refinement-materials.ts; a1-layout.ts/a1-visuals.ts protegidos, solo consulta.
7. **Dependencias:** G1.2 y O1.
8. **Riesgos de regresión:** Tapar un vano o alterar la identidad de las habitaciones existentes al intentar mejorar la fachada.
9. **Pruebas y capturas:** Seis puertas desde plaza/interior, capturas cercanas y lejanas, hashes nativos y navegación completa A1.
10. **Aceptación verificable:** Misma geometría A1 original; no se ve cielo o mar por una junta de respaldo en las vistas de prueba. Estatua pétrea del dragón de bronce legible.

## A3 · Comedor y cocina: integrar sin redistribuir

**Prioridad:** P2. **Impacto previsto:** Objetivo: cero luces nuevas y cero texturas adicionales.

1. **Zona y elementos:** A3
2. **Problema verificado:** El recorte deja las salas como una caja sobre una explanada; desde 5 grados el mobiliario se superpone y el pasillo pierde lectura.
3. **Resultado visual:** Cavidad habitable clara con mesa, dos bancos, única silla, pasillo y cocina ordenada.
4. **Cambios geométricos exactos:** Conservar todos los muebles y proporciones; trabajar solo zócalos, dinteles y unión de la nueva envolvente a las paredes actuales. Ninguna ampliación de habitaciones ni nueva puerta.
5. **Materiales, iluminación y entorno:** Revisar la luz cálida ya situada en 118,5/20,2/57, sombra de contacto y contraste madera/piedra; no añadir más lámparas si basta la existente.
6. **Componentes y archivos:** retreat-refinement-lighting.ts, retreat-refinement-materials.ts y pieles de envolvente; módulo A3 original protegido.
7. **Dependencias:** G1.1 y O1.
8. **Riesgos de regresión:** Añadir ruido visual o elevar el coste PBR en una zona que ya necesita perfilado.
9. **Pruebas y capturas:** Comedor, pasillo y cocina desde 5/10/25 y giros extremos; todas las rutas de mobiliario, coste de fotograma y mismos encuadres antes/después.
10. **Aceptación verificable:** Se reconocen las dos salas y su conexión; muebles y navegación idénticos. Rendimiento dentro del presupuesto acordado y sin otra silla de cabecera.

## A4 · Biblioteca: acabado y respaldo permanente

**Prioridad:** P2. **Impacto previsto:** Reutilizar el relleno y materiales existentes.

1. **Zona y elementos:** A4
2. **Problema verificado:** La biblioteca es funcional y amueblada, pero pierde su contexto rocoso al ocuparla; a 5 grados las estanterías se superponen.
3. **Resultado visual:** Biblioteca excavada legible que conserva puerta de roble/hierro y distribución.
4. **Cambios geométricos exactos:** Mantener puerta, estanterías murales, tres estantes independientes y mesa oriental. Añadir solo encuentros de roca con el perímetro actual; aplicar O1 sobre piezas nuevas.
5. **Materiales, iluminación y entorno:** Ajustar el relleno existente 105/20,2/60 y contraste de estantes/libros. Evitar brillo especular que borre la lectura de madera.
6. **Componentes y archivos:** retreat-refinement-lighting.ts, retreat-refinement-materials.ts; metadatos de envolvente. Módulo A4 y colisiones preservados.
7. **Dependencias:** G1.1/O1.
8. **Riesgos de regresión:** Romper la bisagra, ocultar estantes enteros o modificar pasillos para corregir un problema exclusivamente visual.
9. **Pruebas y capturas:** Abrir/cerrar puerta, transitar pasillos originales, revisar página cercana/lejana y foco de tres personajes.
10. **Aceptación verificable:** La puerta conserva su comportamiento y se lee la sala completa a los encuadres vigentes; no hay recolocación de mobiliario.

## A2 · Cabrestante: lectura vertical y relación con el agua

**Prioridad:** P2. **Impacto previsto:** Preferir foco/contexto local y geometría existente; sin luces nuevas.

1. **Zona y elementos:** A2
2. **Problema verificado:** El encuadre de habitación reduce la altura considerada a 4 m; incluso el zoom local lejano suele recortar el palé inferior.
3. **Resultado visual:** Mecanismo reconocible y relación visual clara entre edificio, cadena y plataforma, sin perder el personaje.
4. **Cambios geométricos exactos:** Mantener cubierta a dos aguas, marco, cabrestante, palanca, cadena y palé. Refinar solo encajes de roca y soportes decorativos que lo necesiten.
5. **Materiales, iluminación y entorno:** Madera/metal compartidos y desgaste salino moderado; conservar la diferencia entre estructura y mecanismo.
6. **Componentes y archivos:** retreat-camera-composition.ts y apps/web/world.ts solo para resolver tamaño/foco del contexto A2 dentro del controlador actual; retreat-global-visuals.ts para el lift existente; fuente exterior.
7. **Dependencias:** G1.3 y C2.
8. **Riesgos de regresión:** Ampliar indiscriminadamente el zoom del jugador o automatizar una decisión de uso del cabrestante.
9. **Pruebas y capturas:** Comparar interior, acceso exterior y palé a 0/12/15 m en copia local; mismos límites angulares, puerta bloqueante y acción manual del DM.
10. **Aceptación verificable:** El recorrido vertical se entiende desde un encuadre existente de acceso/inspección; no se añade cámara alternativa ni resolución automática.

## A5 · Templo: preservar silueta y serenidad

**Prioridad:** P2. **Impacto previsto:** Reutilizar geometría; evitar otra luz con sombras solo para la estatua.

1. **Zona y elementos:** A5
2. **Problema verificado:** Algunas vistas ocupadas de 20/25 grados muestran columnas reducidas a bases y cerchas ausentes; el respaldo se lee como pináculo independiente.
3. **Resultado visual:** Templo abierto y saliente reconocible con personajes, estatua y mar.
4. **Cambios geométricos exactos:** Conservar arcos, ocho soportes existentes, cubierta de madera, estatua, siete canarios y cuatro ofrendas. Aplicar el recorte segmentado O1 a piezas frontales; integrar respaldo G1.2 sin rellenar el voladizo.
5. **Materiales, iluminación y entorno:** Contraste sobrio de estatua pétrea, madera y roca. Luz marítima lateral y contacto, sin aura mágica nueva ni adornos adicionales.
6. **Componentes y archivos:** retreat-global-visuals.ts, metadatos de estructura, retreat-refinement-lighting.ts y materiales del Retiro.
7. **Dependencias:** G1.2 y O1.
8. **Riesgos de regresión:** Tapar a Runara/personajes, ocultar los siete canarios o convertir el templo modesto en una arquitectura monumental nueva.
9. **Pruebas y capturas:** Exterior y ocupado, cinco inclinaciones y giros; verificar siete aves y cuatro ofrendas en detalle; vista desde la costa.
10. **Aceptación verificable:** Templo identificable con y sin techo visible, arcos suspendidos sobre costa y misma distribución. Ninguna mecánica del aura se automatiza.

## M1 · Basalto y pavimento a dos escalas

**Prioridad:** P2. **Impacto previsto:** Objetivo: reutilizar todas las texturas y no superar el número de materiales activos de partida.

1. **Zona y elementos:** Materiales del conjunto
2. **Problema verificado:** El albedo compartido conserva coherencia, pero ciertas grandes caras resultan uniformes y el mar/pavimento concentran más contraste que las figuras.
3. **Resultado visual:** Grandes masas legibles de lejos y detalle mineral discreto al acercarse.
4. **Cambios geométricos exactos:** Ninguna reconstrucción; revisar UV y normales solo en superficies nuevas con defecto demostrado. Mantener colores de vértice opacos y tangentes coherentes.
5. **Materiales, iluminación y entorno:** Reutilizar albedo 512, normales y ORM. Ajustar variación mineral amplia y contraste del suelo; conservar la estrategia PBR cercano/Standard lejano. Separar lectura de masa y detalle sin añadir seis materiales por roca.
6. **Componentes y archivos:** retreat-refinement-materials.ts; arte/retreat-stone y normales/ORM existentes como fuentes, sin modificación de otros mapas.
7. **Dependencias:** Geografía, recortes y zonas cerrados.
8. **Riesgos de regresión:** Reintroducir parches negros, repetición perceptible, costuras UV o costes altos del PBR.
9. **Pruebas y capturas:** Mismos encuadres a tres zooms y alrededor del umbral de semialtura 16 m; color alfa, normals/tangentes y glTF validator.
10. **Aceptación verificable:** Sin parches de transparencia ni texturas estiradas verificadas; personaje y accesos conservan mayor jerarquía que el suelo.

## E1 · Vegetación y geografía lejana conectadas

**Prioridad:** P2. **Impacto previsto:** Objetivo inicial: hasta 64 instancias repartidas y menos de 8 llamadas de dibujo nuevas; revisar contra mediciones reales.

1. **Zona y elementos:** Interior, laterales y fondo regional
2. **Problema verificado:** El entorno medio falta y cuatro conos lejanos no representan una masa terrestre conectada ni documentada por el canon.
3. **Resultado visual:** Cinco planos de profundidad, con interior cuidado y costa reconocible.
4. **Cambios geométricos exactos:** Usar 2–3 crestas 3D bajas conectadas hacia el este/sudeste regional, acotadas por G0. Reutilizar la geometría de los conos como fuente si compensa, sin tratarlos como volcanes canónicos. Vegetación instanciada en grietas y tierra nueva, fuera de rutas; nunca una pared plana con una imagen.
5. **Materiales, iluminación y entorno:** Misma biblioteca, menor contraste y matiz marítimo en lo lejano. Plantas agrupadas en suelos plausibles y sin repetición por casilla.
6. **Componentes y archivos:** retreat-scenic-depth.ts; GLB de entorno; recursos de vegetación existentes y control de capas.
7. **Dependencias:** G1/C1 y zonas cerrados.
8. **Riesgos de regresión:** Crear falsas islas o penínsulas; tapar el templo o añadir cientos de llamadas de dibujo.
9. **Pruebas y capturas:** Giros extremos y los cinco niveles de profundidad por zona; revisar anclajes de plantas y ningún collider nuevo. Presupuesto de instancias, sombra y culling.
10. **Aceptación verificable:** Fondo conectado con un rumbo regional justificado y sin nuevas zonas jugables; océano preservado en los sectores marinos oficiales.

## L1 · Luz, mar y atmósfera después de la estructura

**Prioridad:** P2. **Impacto previsto:** Presupuesto inicial: cero luces y mapas de sombras adicionales.

1. **Zona y elementos:** Todo el Retiro
2. **Problema verificado:** La profundidad se apoya hoy sobre todo en contraste de superficie; las masas medias/fondo no tienen una transición atmosférica geográficamente coherente.
3. **Resultado visual:** Basalto con volumen, interiores cálidos y mar presente sin dominar el plano táctico.
4. **Cambios geométricos exactos:** Reutilizar mar, espuma y cielo. Movimiento ambiental sutil solo en sistemas existentes; sin aumentar el área jugable.
5. **Materiales, iluminación y entorno:** Afinar luz solar/ambiental existentes, sombras de contacto y contraste del oleaje. Bruma únicamente por distancia en el entorno; mantener nítidos personajes y suelo. Revisar día/noche/lluvia antes de añadir rayos o postprocesado. No usar desenfoque sobre la cuadrícula.
6. **Componentes y archivos:** retreat-refinement-lighting.ts, retreat-refinement-coast.ts, retreat-scenic-depth.ts; camp-surface-effects.ts/coastal-backdrop.ts compartidos solo si hay defecto demostrado y solución acotada.
7. **Dependencias:** C1, M1 y E1.
8. **Riesgos de regresión:** Niebla lechosa global, fuga de luz nocturna, mar excesivamente brillante y sombras cúbicas caras.
9. **Pruebas y capturas:** Día, noche y lluvia en seis focos; comprobar luces realmente habilitadas, sombra solar/local y coste con GPU finish. Revisar costas sin inundación. La muestra actual alcanza 99,9 ms de mediana y p95 187,4 ms en celda 1 con lluvia tras cambios de clima; reproducir en sesión visible y aislar ese coste antes de añadir efectos.
10. **Aceptación verificable:** Lectura táctica conservada, sombras coherentes y atmósfera visible en el fondo sin ocultar accesos ni personajes; ninguna luz/sombra nueva sin perfilado.

## Q1 · Optimización y cierre verificable

**Prioridad:** P0 de cierre. **Impacto previsto:** Debe recuperar o mantener el presupuesto de partida; no fijar 60 FPS como resultado demostrado sin medirlo.

1. **Zona y elementos:** DM, jugador y proyector
2. **Problema verificado:** Un pase técnico de rayos no certifica calidad artística, privacidad del encuadre ni rendimiento físico sostenido.
3. **Resultado visual:** Una candidata que conserve el escenario y pueda revisarse con pruebas repetibles.
4. **Cambios geométricos exactos:** Solo optimizar piezas nuevas o decorativas demostradas: instancias, agrupación por material, LOD de geometría donde aporte y culling. No fusionar puertas, palé ni piezas que necesiten recorte independiente.
5. **Materiales, iluminación y entorno:** Conservar la biblioteca compartida; retirar recursos sin uso únicamente después de demostrar su propiedad y restauración.
6. **Componentes y archivos:** Propietarios específicos del Retiro y herramientas de revisión; tests existentes de cámara, terreno, runtime y conservación. Ninguna modificación de otras escenas.
7. **Dependencias:** Todas las subfases aceptadas individualmente.
8. **Riesgos de regresión:** Romper interacción, restauración de cámara, estados o protección de celdas al optimizar.
9. **Pruebas y capturas:** Repetir 68 pruebas actuales, matriz 1.000, muestras angulares continuas y recorrido físico/cápsula de todas las zonas. Cuadrícula independiente, dos puertas, 13 puntos, salidas, guardados y tres zombis privados. Perf en equipo de juego, móvil y proyector durante sesión sostenida.
10. **Aceptación verificable:** Hashes de gameplay/A1 intactos; sin regresiones visuales importantes. Comparativa antes/después idéntica y coste por vista medido; acordar tolerancia relativa antes de construir (propuesta: no empeorar mediana más del 10 % en el mismo equipo/encuadre). Las pruebas físicas pendientes no se declaran superadas.

## Aceptación global pendiente

El conjunto se lee como un único claustro excavado en un acantilado, conserva la bahía y el marco regional y no inventa otra isla. Los muebles de las seis celdas permanecen reconocibles en todos los hitos de cámara; A5 mantiene su silueta ocupado; el agua/cielo no exponen cortes; jugador respeta el encuadre local; DM/proyector conservan sus vistas. Se demuestra movimiento por todas las zonas sin paredes atravesadas ni caídas y se prueban acciones existentes, estados y rendimiento sostenido. Ninguna de estas aceptaciones futuras se declara aprobada por esta auditoría.
