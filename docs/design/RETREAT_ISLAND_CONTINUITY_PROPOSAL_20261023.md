> **DOCUMENTO HISTÓRICO. Actualización25/10:** G2 y A1–A5 ya están construidas y publicadas. Para el paisaje de salidas usar [ficha SAL vigente](RETREAT_DEPARTURE_LANDSCAPE_PLAN_20261025.md) y maestro revisión5. No ejecutar instrucciones de G2 pendiente contenidas en esta propuesta antigua.

# Retiro del Dragón: continuidad insular y comienzo de las expediciones


> Actualizacion T0/revision 2: el usuario fija embarcadero a la derecha y conserva
> la arquitectura actual aunque difiera de la orientacion del PDF. La autoridad
> de ejecucion es [el roadmap tecnico maestro](<C:/Users/User/Desktop/Dungeons/docs/audits/RETREAT_TECHNICAL_ROADMAP_20261023.md>).
> El orden de fases del apartado 9 y la planta inicial son historicos: usar T01/T02.
> G2 sigue sin implementar; primera ejecucion R0 y despues G2.1.

Fecha: 23/10/2026. **Propuesta conceptual para revisión.**
Este documento analiza la geografía y define una intervención posterior a O1.
El mapa de producción, sus guardados y su navegación no se modifican con esta entrega.

## 1. Lectura del mapa oficial

Fuentes: aventura aportada por el usuario, mapa regional 1 (p. 5), mapa local 2
(p. 11), viajes a Pleamar (p. 17), al pecio (p. 23) y al Observatorio (p. 29).

[PDF de referencia](<C:/Users/User/Desktop/Dungeons/OneDrive_1_12-9-2026/Aventura Los Dragones de la Isla de las Tempestades.pdf>).

![Mapa regional original](C:/Users/User/Desktop/Dungeons/output/retreat-island-proposal-20261023/mapa-isla-original.jpg)

La imagen anterior es el recurso incrustado original del mapa regional, extraído
sin modificar sus píxeles. Su título superpuesto en el PDF no forma parte de la imagen.
La procedencia y el hash del PDF están en
[sources.json](<C:/Users/User/Desktop/Dungeons/output/retreat-island-proposal-20261023/sources.json>).

### Hechos geográficos

- El Retiro ocupa un enclave en el sector norte de la propia Isla de las Tempestades.
  La isla continúa alrededor de la bahía y hacia su interior meridional; incluye
  terreno al suroeste y al sureste del monasterio.
- Pleamar está en la costa suroeste. El Observatorio se encuentra en el extremo
  sureste. El pecio está al norte/noroeste del Retiro, junto al espigón de rocas.
- La costa de La Carretera Alta, dibujada al este, está separada por agua. La nueva
  continuidad se construye dentro de Stormwreck; no se crea una unión con esa costa.
- La escala regional es 0,75 km por hexágono. El Retiro emplea 1,5 m por casilla.
  Una longitud dibujada en una de esas escalas no debe copiarse directamente a la otra.
- El mapa local detalla arquitectura y desniveles. El regional fija destinos y
  relaciones generales; no define cada curva de un sendero entre ambos encuadres.

Los rumbos indicados en esta propuesta son **regionales**. Se conservarán la
orientación, las coordenadas y los accesos locales actuales del VTT. Los senderos
pueden curvarse fuera del enclave para alcanzar su rumbo regional; no se girará el
monasterio ni se alinearán artificialmente todos los destinos en una recta.

## 2. Qué falta en la representación actual

G1 añadió continuidad próxima entre las masas rocosas del monasterio. O1 corrigió
la presentación de interiores y mobiliario. El resultado sigue cerrándose visualmente
sobre el agua y falta una transición reconocible hacia un interior insular extenso.
Los dos puntos terrestres están preparados, pero no hay un comienzo de viaje
forestal y costero suficientemente desarrollado alrededor de ellos.

E1 estaba definido como entorno principalmente decorativo. La petición actual
requiere un alcance adicional: **suelo transitable, conexiones de altura y salida
física del enclave**, además de la continuidad visual.

## 3. Propuesta espacial recomendada

![T01 vigente: embarcadero a la derecha](C:/Users/User/Desktop/Dungeons/output/retreat-technical-masterplan-20261023/T01-planta.png)

[Abrir T01 vectorial vigente](<C:/Users/User/Desktop/Dungeons/output/retreat-technical-masterplan-20261023/T01-planta.svg>).
La planta anterior, conservada en output/retreat-island-proposal-20261023, queda sustituida; no copiar sus trazas fuera de X=0 como navegacion.
Los suelos de la planta proceden de las casillas actuales. El rayado indica una
reserva de intervención y los trazos discontinuos son hipótesis de corredor,
sin alturas resueltas ni nueva navegación aprobada. No representan la costa regional
a escala ni el contorno final de las nuevas masas de roca.

### A. Respaldo terrestre continuo

Continuar las piezas G1 por detrás de A3/A4 y enlazarlas con los flancos de A5 y A2.
Representar roca volcánica, lomas y vegetación que continúan fuera del encuadre.
En los sectores que corresponden al interior no se verá una franja de agua que
cierre inmediatamente la masa terrestre.

Como hipótesis inicial VTT_AMBIENCE, estudiar unos **200–400 m de relieve cercano
y medio**, ajustados a las cámaras existentes. Esta cifra es un presupuesto de
representación para estudiar; no es una medición ni una cota oficial del PDF.
No hace falta representar los kilómetros completos de todas las expediciones en
el mismo escenario táctico.

Mantener las bahías, el frente marino, el agua bajo el palé y el voladizo del templo.
La silueta debe expresar que el monasterio está excavado en la costa de una isla
que continúa, con relieve terrestre ocultando sus propios límites decorativos.

### B. Acceso occidental: senda litoral de Pleamar

Partir del acceso costero existente y conservar EXIT_PLEAMAR como punto de preparación.
Desarrollar un sendero que bordea el basalto, con vegetación costera y breves
ensanchamientos para reunir al grupo. Su recorrido regional sigue la costa occidental
hasta la costa suroeste, con las curvas de las bahías.

Representar una bifurcación legible:

1. **Camino alto:** asciende a la cornisa y recorre la parte superior de los acantilados.
2. **Camino bajo:** continúa por las calas, utilizable con bajamar según la aventura.

La alternativa alta puede arrancar del camino superior, en la bifurcación exterior
al templo señalada en la planta, y enlazar con la costa occidental. No requiere
atravesar A5 ni bajar primero hasta el marcador litoral. Ambos accesos preparan
el mismo destino mediante el sistema existente; su encaje vertical se estudia
antes de autorar nuevas casillas.

El bosque puede acompañar el camino alto en manchas y claros. No se inventa un
atajo forestal directo que sustituya la ruta costera canónica de Pleamar.
Un suelo húmedo y rocas descubiertas pueden comunicar el carácter del camino bajo;
la marea y cualquier consecuencia se resuelven con los sistemas actuales y el DM.

### C. Acceso alto: interior y ruta al Observatorio

Prolongar el corredor existente a cota 18 m junto al flanco de A2. Debe internarse
en terreno elevado conectado, con roca, arbustos y un bosquete austero, manteniendo
libres A2, su mecanismo y la plataforma de carga.

Tras una primera curva, ofrecer dos continuaciones:

1. **Senda del interior:** loma pedregosa que atraviesa el interior hacia el sureste.
   Su carácter es accidentado; corresponde al terreno difícil descrito en la aventura.
2. **Camino de costa oriental:** cornisa que sigue la bahía y conserva más vistas del mar.

El entorno del Retiro mantiene su serenidad. Los cristales y las marcas de relámpago
propios de la aproximación al Observatorio pertenecen al tramo final de esa expedición.
El terreno no debe adelantar obligatoriamente un acontecimiento narrativo ni activar
la aparición del dragón por entrar en el sendero.

### D. Embarcadero: salida marítima compartida

El puerto es el tercer comienzo de viaje. Mantener la embarcación existente,
TRAVEL_PECIO_BOAT y su conexión actual al pecio. La misma interacción de embarque
puede ofrecer las alternativas marítimas canónicas a Pleamar y al Observatorio.

No se duplica la barca ni se añaden tres marcadores 3D. Se amplía, cuando se implemente,
el uso del objeto existente mediante el flujo de interacción y confirmación del DM.

## 4. Rutas canónicas que debe permitir el diseño

Las distancias y tiempos se transcriben tal como aparecen en la aventura. El VTT
no los recalculará ni avanzará automáticamente el reloj al pisar una salida.

| Destino | Ruta | Distancia | Tiempo indicado | Fuente |
|---|---|---:|---|---|
| Pleamar | Costa, por acantilados o calas; las calas requieren bajamar | 10,5 km | 2 h 20 min | p. 17 |
| Pleamar | Barca alrededor del extremo occidental | 7,5 km | 3 h 20 min | p. 17 |
| Observatorio | Interior hacia el sureste, terreno difícil | 5,25 km | 1 h 15 min | p. 29 |
| Observatorio | Costa, bordeando la bahía oriental | 9 km | 2 h | p. 29 |
| Observatorio | Barca por el extremo oriental | 7,5 km | 3 h 20 min | p. 29 |
| Rosa de los Vientos | Barca hacia el espigón del norte | Casi 4 km | Aproximadamente 1 h 40 min | p. 23 |

La llegada a Pleamar conserva la diferencia entre aproximación alta y a nivel del
mar, incluidas las escaleras naturales y las mareas. Llegar por tierra al Observatorio
lleva a su aproximación D1; llegar en barca permite las opciones costeras y de pilares
descritas en la aventura. En el pecio se conservan la llegada a estribor y las entradas
C1/C9 elegidas por los jugadores y resueltas por el DM.

## 5. Cómo comienza y termina un viaje para los jugadores

**Dentro del Retiro:** el jugador camina con el movimiento habitual hasta la salida
correspondiente. Como objetivo de diseño, estudiar **20–40 casillas de aproximación
(30–60 m)** donde el encaje físico lo permita: una curva, un cambio claro de ambiente
y una zona de reunión. Es dimensionado VTT_AMBIENCE y no una nueva escala regional.

**En el límite:** una curva entre rocas, un estrechamiento del sendero o un tramo
bajo las copas comunica que el recorrido continúa. Al alcanzar la zona se solicita
preparar la expedición mediante la interacción existente. No se cambia de escena
por accidente al pasear, mirar el mar o hablar con un PNJ cercano.

**Decisión:** el grupo declara destino y ruta. El DM confirma salida, tiempo y,
si procede, encuentros. Mantener dados físicos y resolución manual de pruebas.
Los senderos están físicamente presentes; el DM decide qué información conocen
los personajes, sin imponer un orden de misiones mediante bloqueos artificiales.

**Durante el viaje:** usar narración o un mapa de trayecto si hay una situación que
merece jugarse. Los campamentos son paradas opcionales; no se fuerzan al salir ni
se consideran lugares seguros por aparecer en el catálogo.

**Al regresar:** volver al acceso físico correspondiente. Una expedición costera
regresa por la costa; la barca retorna al embarcadero. Una llegada al Observatorio
por mar no se convierte automáticamente en la misma entrada que una llegada por tierra.

## 6. Reutilización de los mapas del VTT

Inventario leído de la campaña pública activa, sin arrancar otra partida:
[current-scenes.json](<C:/Users/User/Desktop/Dungeons/output/retreat-island-proposal-20261023/current-scenes.json>).

| Trayecto | Recurso existente utilizable | Papel propuesto | Destino canónico final |
|---|---|---|---|
| Pleamar, camino alto | camp-forest-pleamar | Bosque/arroyo como parada opcional del trayecto | Cuevas B1–B6: no están en el catálogo activo |
| Pleamar, costa o desembarco | camp-coastal-refuge | Refugio costero opcional; conserva sus props y su condición VTT_AMBIENCE | No sustituye B1 ni B6 |
| Observatorio, tierra | camp-cliffs-observatory | Meseta de aproximación o parada opcional; preservar el mapa existente | Observatorio D1–D6: no está en el catálogo activo |
| Pecio, mar | wreck-ship | Destino real ya explorable, con llegada marítima existente | C1–C9 y cofa disponibles |
| Pecio, apoyo narrativo | wreck-approach / camp-wreck-beach | Aproximación estática o playa opcional si el DM la necesita | No hacer obligatorio un desembarco en esa playa |

No crear copias de los campamentos para resolver transiciones. Mantener sus
distribuciones, mobiliario e identidad. Las transiciones a B/D pueden quedar
preparadas y rotuladas como pendientes hasta construir sus mapas reales.

## 7. Conservación técnica y límites que deben resolverse al implementar

- Las 980 casillas originales, diez superficies y 15 conexiones se mantienen.
  Una ampliación jugable añadirá casillas y conexiones; el total aumentará.
- Conservar las seis celdas, sus muebles, A2–A5 ampliadas, puertas, interacciones,
  coordenadas y los tres puntos de viaje existentes.
- La salida Pleamar está muy cerca del borde occidental de la cuadrícula actual.
  No desplazar el origen ni renumerar el mapa para ganar espacio. Si el ramal no
  cabe con una curva coherente, pasar a una escena de enlace en el límite y reutilizar
  el bosque/costa como siguiente tramo. El corredor alto sí dispone de espacio
  local hacia su prolongación; el trazado exacto necesita revisión de volumen 3D.
- Las nuevas superficies transitables se autoran como datos de navegación. Roca,
  decorado y vegetación no generan caminos por simple apariencia.
- Las nuevas rampas/escaleras se integran con el compilador de movimiento existente.
  No abrir accesos atravesando las paredes de las celdas o las salas.
- La envolvente decorativa se mantiene fuera de la reserva física actual y sin
  colisionadores que bloqueen el terreno protegido. Las copas y rocas cercanas deben
  participar en la ocultación cuando tapen al personaje.
- Reutilizar materiales y recursos; las nuevas masas de fondo necesitan geometría
  sencilla y control de detalle. O1 dejó cinco focos con coste pendiente: medir ese
  presupuesto antes de poblar la extensión con vegetación densa.
- La cámara del jugador conserva los límites de C2. El nuevo terreno tiene que
  funcionar a 5–25° y giro ±30°, además de DM y proyector.
- Conservar guardados y contabilizar únicamente el tramo de viaje todavía no
  representado físicamente, cuando el DM decida avanzar el reloj; no sumar dos veces
  el paseo de aproximación. La ruta elegida y el sentido de retorno deben conservarse.

## 8. CANON y VTT_AMBIENCE

**CANON:** posición relativa de destinos; enclave costero del Retiro; terreno
volcánico y vegetación; alternativas de viaje y distancias/tiempos; mareas en la
ruta baja de Pleamar; características de las aproximaciones; decisiones del DM.

**VTT_AMBIENCE / diseño propuesto:** forma precisa de las nuevas lomas, extensión
de 200–400 m estudiada como fondo, bosque concreto, curvas y bifurcaciones locales,
30–60 m de aproximación, hitos discretos, límites de escena y uso de campamentos
como paradas. Esos detalles no se presentan como un trazado publicado en el PDF.

## 9. Orden preliminar histórico: sustituido por el maestro técnico T0

1. **G2.1 · Planta y continuidad del terreno.** Revisar los sectores tierra/mar y
   los corredores sobre una planta del estado actual. Después, prolongar únicamente
   la envolvente insular; entrega visual para revisar la lectura de enclave costero.
2. **G2.2 · Senda de Pleamar.** Resolver el encaje occidental y las opciones alta/baja,
   con sus superficies y alturas; conservar el punto actual. Entrega del ramal.
3. **G2.3 · Interior y costa del Observatorio.** Desarrollar el acceso alto y su
   bifurcación; conservar A2/palé. Entrega del ramal y comienzo del bosque.
4. **G2.4 · Viajes y retornos.** Conectar los mapas disponibles y preparar los B/D
   pendientes mediante los sistemas actuales. Ampliar la barca a las alternativas
   canónicas y conservar la salida original al pecio.
5. **G2.5 · Revisión conjunta.** Recorridos reales, accesos, regresión de las casillas
   originales y guardados, cámaras, oclusión, cuadrícula, coste y tres roles.

En cada entrega: antes/después del mismo encuadre, recorrido de entrada y retorno,
separación CANON/ambiente y problemas pendientes. No se dan por realizadas esas
pruebas ni esas ampliaciones en esta propuesta conceptual.

## Decisión recomendada

Construir el Retiro como un **enclave costero conectado al interior de su propia
isla**, con tres ámbitos de salida reconocibles y recorridos locales jugables.
Las expediciones mantienen su escala regional mediante transiciones manuales y
los mapas existentes. El arranque vigente es R0 y después G2.1, según el maestro técnico; revisar T01/T02 antes de modificar geometría.

## Referencias de implementación consultadas

- [Catálogo activo](<C:/Users/User/Desktop/Dungeons/campaigns/stormwreck-isle/public/pack.ts>).
- [Escenas de bosque, costa y acantilados](<C:/Users/User/Desktop/Dungeons/campaigns/camp-rests/public/pack.ts>).
- [Retiro y viaje existente al pecio](<C:/Users/User/Desktop/Dungeons/campaigns/stormwreck-isle/public/retreat-runtime.ts>).
- [Terreno actual](<C:/Users/User/Desktop/Dungeons/campaigns/stormwreck-isle/public/retreat-terrain-v2.json>).
- [Roadmap previo](<C:/Users/User/Desktop/Dungeons/docs/audits/RETREAT_ROADMAP_20261021.md>).
