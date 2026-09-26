# Pecio C1–C9 — arquitectura espacial y representación

Decisión de planificación, 21/09/2026. Fuente: capítulo 3 pp.22–27 y mapa 4 p.25 del PDF local citado en `PECIO_AUDIT_20260921.md`. **No es una implementación ni un atlas de mapas generado.** Documento privado, no servible a jugadores. Etiquetas CANON para hechos, VTT_AMBIENCE para añadidos de presentación; el diseño técnico es adaptación VTT.

> **Actualización vinculante · 24/09/2026:** el usuario ha fijado que el Rosa de los Vientos será **un único mapa continuo**. La tabla y el apartado «cuatro mapas» que siguen son una propuesta anterior conservada como historial, no instrucciones de implementación. En runtime, C1–C9, cofa y mar pertenecen a `wreck-ship`; son superficies/alturas dentro de la misma geometría, con una posición persistente por personaje. C2/C3, C8/C9 y la cofa no se presentan en un selector como mapas separados. C4–C7 son habitaciones de C1 y sus puertas se cruzan caminando cuando están abiertas. El DM puede cambiar el encuadre sin reubicar fichas; cada jugador recibe solo entidades/objetos de su superficie visible. `wreck-approach` puede ser la aproximación exterior. La sala `wreck-objects` es únicamente una fixture técnica, no una zona del barco.

## 1. Propuesta anterior de cuatro mapas (superada para el runtime)

| Mapa / mapId propuesto | Zonas navegables | Representación y razón |
|---|---|---|
| A · `wreck-upper` | C2, C3, cofa de C1 como superficie elevada; exterior/agua/bote como superficies distintas | Cubiertas superiores, entorno y conexiones exteriores. C2 y C3 son plataformas separadas por el vacío sobre C1: no se camina de una a otra cruzando ese vacío. |
| B · `wreck-main` | C1, C4, C5, C6, C7 | Una cubierta principal continua. C4/C5 bajo C3; C6/C7 bajo C2. Puertas al espacio central C1, no corredores ficticios entre camarotes. |
| C · `wreck-lower` | C8 | Cubierta inferior con agua somera, obstáculos y coste de terreno difícil. |
| D · `wreck-hold` | C9 | Bodega sumergida, acceso exterior en popa y puntos de respiración hacia C8. Oscuridad propia, no filtro azul sobre un interior iluminado. |

La cofa pertenece narrativamente a C1, pero usa `zoneId: c1-crow`, `surfaceId: crow`, en A; no es una décima habitación. El exterior usa `zoneId: exterior`, superficies mar/bote separadas de las cubiertas. La aproximación existente queda como encuadre/presentación opcional, no como quinta planta obligatoria.

**Corrección de la hipótesis inicial:** mover C1 al mapa B junto a sus puertas. En A puede verse el suelo central de C1 como contexto autorizado, pero no existe una segunda C1 editable, ni dos copias de actores/objetos. Las dos vistas referencian el mismo barco y estado. Un actor situado en B no pasa a A porque el DM cambie la cámara. Si una vista contextual muestra una entidad autorizada, se proyecta su estado único.

Alternativas descartadas: nueve mapas añaden cortes/clics sin cambiar de planta; A=C1–C3 más B=C4–C7 inventa una falsa bajada; un único casco con todas las plantas siempre visibles aumenta oclusión y filtraciones. Un único modelo geométrico maestro sí es conveniente: cuatro vistas/capas navegables de ese modelo, con superficies y recortes por planta. No mantener cuatro barcos dibujados con escalas independientes.

**CANON:** cuadrícula1,5m; norte/babor arriba, sur/estribor abajo, proa este/derecha y popa oeste/izquierda. Techos casi2,5m, puertas casi2m; cofa15m. No convertir la altura de techo en separación exacta entre cubiertas sin considerar forjado. La pendiente del casco explica profundidad diferente de agua; no inventa diagonales gratuitas ni penalización por resbalar.

**VTT_AMBIENCE / contrato visual:** cámara ortográfica oblicua estable, sprites2D/entorno HD-2D de la dirección aprobada. Cuadrícula dibujada en runtime sobre superficies, no en texturas. Paleta salina coherente, sin rotación libre. El plano maestro fija casco, retícula y offsets; puertas, escaleras y columna de agujeros se ajustan a ese plano antes del arte. Las coordenadas exactas se medirán en M1a: no se declaran ya obtenidas ni se heredan las32×21 casillas aproximadas del fondo actual.

## 2. Grafo real y conexiones dirigidas

```text
EXTERIOR A ──jarcia estribor── B:C1 ──escaleras── A:C2 / A:C3
    │                           ├──puertas── B:C4 / C5 / C6 / C7
    │                           ├──escalera cuerda── A:cofa (15 m)
    │                           └──escalera / escotilla── C:C8
    │                                                     │
    └──agujero submarino popa── D:C9 ──escalera / agujero───┘
                                 ↑
             B:C4 ──agujero── C:C8 ──agujero alineado──────┘
```

Cada flecha del diagrama representa una conexión física, **no permiso automático en ambos sentidos**. Descender por agujero y remontarlo requieren acciones distintas. La descripción de C1 usa «bodega» en sentido general; el mapa por plantas y el texto C8/C9 permiten el descenso C1→C8→C9, no un teletransporte directo ignorando C8.

Inventario de puertos (IDs de diseño; coordenadas pendientes del plano maestro):

| Enlace | mapId / zoneId / exitPoint | targetMap / targetZone / entryPoint | Medio, retorno y condición |
|---|---|---|---|
| P01 | A/exterior/rigging-water | B/c1/rigging-deck | CANON jarcia estribor. Subir y bajar como conexiones dirigidas, con bote amarrado. No exigir una tirada fija que la fuente no exige. |
| P02–03 | B/c1/fore-stair-n y fore-stair-s | A/c2/fore-landing-n y fore-landing-s | CANON mapa: escaleras de proa por ambos lados. Retornos inversos explícitos. |
| P04–05 | B/c1/aft-stair-n y aft-stair-s | A/c3/aft-landing-n y aft-landing-s | CANON mapa: escaleras de popa por ambos lados. Retornos inversos explícitos. |
| P06 | B/c1/captain-out | B/c4/captain-in | CANON puerta C4 atrancada desde dentro; condición de paso vinculada al mismo objeto puerta. Retorno una vez accesible. |
| P07 | B/c1/galley-out | B/c5/galley-in | CANON puerta cocina. Sin cerradura/trampa inventada. |
| P08 | B/c1/crew-out | B/c6/crew-in | CANON puerta camarote de proa/norte. |
| P09 | B/c1/mess-out | B/c7/mess-in | CANON puerta comedor de proa/sur. |
| P10 | B/c1/mast-ladder-base | A/c1-crow/mast-ladder-top | CANON escalera de cuerda, 15 m, cofa sobre agua norte; subir/bajar explícitos. Balanceo no desplaza el collider. |
| P11 | B/c1/lower-stair-top | C/c8/lower-stair-bottom | CANON escalera cercana al mástil; retorno explícito. |
| P12 | B/c1/port-hatch-rim | C/c8/port-hatch-below | CANON escotilla de babor. Bajada mediante medio declarado, salto/trepa arbitrados; NO inventar una segunda escalera. Abertura permanente y tapa, si se representa móvil, separada sin bloqueo inventado. |
| P13 | B/c4/captain-hole-rim | C/c8/captain-hole-below | CANON agujero junto a cama. Descenso y subida con medios diferentes; no simple casilla caminable sobre vacío. |
| P14 | C/c8/hold-hole-rim | D/c9/chest-hole-below | CANON agujero alineado con P13; entrada al agua/salida a respiración. No autorizar remontar C4 sin medios. |
| P15 | C/c8/hold-stair-top | D/c9/hold-stair-bottom | CANON escalera a bodega sumergida; parte alta permite respirar. |
| P16 | A/exterior/stern-breach-out | D/c9/stern-breach-in | CANON gran agujero submarino de popa. Nado ida/vuelta; exterior mar/superficie no se confunde con cubierta alta A. |

P02–05 y puertas se contrastaron en el mapa 4. Mantener sus lados relativos al pasar a casillas. No inventar puertas C4↔C5 o C6↔C7 donde el plano muestra tabique. El agujero de popa de C9 y la columna interior C4/C8/C9 son entradas diferentes.

Saltos desde bordes C2/C3/cofa al agua o a otra cubierta son opciones físicas de mesa, no rutas automáticas ni puentes nuevos. El DM adjudica distancia, caída, destino y consecuencias; luego se aplica un traslado válido. Ningún salto anima al actor atravesando techos. No añadir CD o daño no especificados por el capítulo sin consulta al reglamento aplicable.

### Contrato lógico mínimo para la próxima implementación

Cada puerto declara `mapId`, `zoneId`, `entryPoint`, `exitPoint`, `targetMap`, `targetZone`, además de `surfaceId`, `targetSurfaceId`, dirección, medio de paso y condición por ID. `entryPoint/exitPoint` son IDs estables resueltos a casillas/huellas del plano, nunca píxeles de una imagen. Una puerta une dos zonas del mismo mapa; una escalera une plantas/superficies; todos usan ocupación autoritativa.

Separar: posición persistente por entidad; mapa/encuadre elegido por DM para proyector; vista individual autorizada por jugador. Recorrer una escalera normal puede ser automático tras intención del jugador y autorización del destino; cruzar por primera vez una zona no compartida pide una decisión agrupada del DM. El DM puede mantener el foco con el grupo o seleccionar otra planta. No reposicionar a todos ni reiniciar combate al cambiar solo la vista.

Los traslados validan propietario, revisión, puerta/medio, destino libre y permisos en una transacción. Esperar junto a entrada ocupada sin repetir eventos. Guardado/restauración conservan mapa/superficie/casilla, objetos y triggers; reintentos no duplican botín ni burbujas. No ampliar este documento a un lenguaje genérico de scripting.

## 3. Capas por mapa (A–H del encargo)

| Mapa | A · Estático | B · Animación ambiental | C · VFX | D · Asset separado | E · Interacción | F · Estado | G · Trigger | H · Conexiones |
|---|---|---|---|---|---|---|---|---|
| A | Casco, rocas, huesos, plataformas C2/C3 y balista rota CANON | Mar/jarcias; balanceo mástil al trepar CANON representado; cadencia VTT_AMBIENCE | Espuma/spray en bordes, no pantalla entera | Timón, bote desplazable, tesoro cofa, arpías; lona si oscila | Trepar, girar, recoger, embarcar | Timón existente, tesoro, cofa/exterior | Ruido, regreso habilitado, salida | P01–05,P10,P16; saltos arbitrados |
| B | C1, suelo/tabiques C4–7, muebles fijos y agujeros CANON | Cangrejos, goteo opcional | Dardo solo al evento, humedad sutil | Puertas, tablón, botín, brújula, retrato si se recoge | Entrar, forzar, investigar, abrir/recoger | Alerta C4, puerta, trampa, posesión | Caída timón/intentos; descubrir/levantar tablón | P01–13, según zona |
| C | C8 casco/suelo/agujeros CANON; agua lógica15–45 cm | Agua somera y carga flotante CANON representadas | Ondas/salpicadura y reflejo tenue VTT_AMBIENCE | Cajas saqueables, barriles movibles, enemigos | Vadear, abrir, saquear, descender | Contenedores y botín único, combate | Aparición autorizada; regreso desde C9 | P11–15 |
| D | C9 casco/escombros y brecha CANON | Peces/algas CANON representados | Suspensión/burbujas VTT_AMBIENCE; gran burbuja de cofre CANON | Cofre/paquete/bitácora/talismán/tesoro | Nadar, respirar, trasladar/abrir, recoger | Cofre hallado/abierto y ubicación, paquete, conocimiento | Apertura contextual, hallazgo y salida | P14–16 |

## 4. Fichas C1–C9: decisiones A–H

### C1 · B + superficie cofa en A

- **A estático — CANON:** tablones húmedos, mástil/base, barandillas rotas, restos recientes, hueco de escotilla y escaleras. Nido fijo; joyas fuera del fondo.
- **B animación:** jarcias/lonas y balanceo de mástil al trepar (situación CANON, animación VTT_AMBIENCE). No oscilación global del tablero.
- **C VFX — VTT_AMBIENCE:** espuma exterior compartida; pequeña salpicadura al embarcar si aporta lectura. Nada que delate arpía ausente.
- **D separados:** tesoro cofa, tapa móvil si se añade, bote, fichas. No pintar criatura en nido.
- **E interacción — CANON:** acceso, subir/bajar, registrar cofa/recoger joyas; narrativa reciente sin chequeo obligatorio nuevo.
- **F estado:** cofa registrada/tesoro tomado; medio de paso y conocimiento. Cofa no duplica inventario al volver de planta.
- **G trigger:** entrada autorizada ajusta perfil ambiental; si regreso de arpía ya ocurrió, siguiente acceso a C1 habilita encuentro para DM.
- **H conexión:** cuatro escaleras superiores, cuatro puertas camarotes, escalera inferior, escotilla y jarcia; cofa por cuerda.

### C2 · A

- **A — CANON:** trinquete roto, barandilla dañada, balista inutilizable. Todo estático mientras no se autorice manipularlo.
- **B:** lona/jarcia con el mismo oscilador VTT_AMBIENCE del exterior.
- **C:** espuma de borde común; sin VFX exclusivo obligatorio.
- **D:** segunda arpía solo en variante nivel2, siempre entidad independiente.
- **E:** inspección narrativa; no puzzle de balista ni reparación requerida.
- **F:** estado de encuentro compartido con regreso, no mecanismo de balista.
- **G:** colocación/revelado autorizado de segunda arpía tras disparador canónico.
- **H:** escaleras a C1, bordes al exterior como salto/trepa adjudicados; sin puente directo C3.

### C3 · A

- **A — CANON:** cubierta elevada, tocón mástil, soporte fijo de timón. Limpiar rueda/sombra del suelo.
- **B:** ambiente exterior común.
- **C:** impacto corto de rueda al caer VTT_AMBIENCE; no explosión ni rotura automática.
- **D:** rueda y soporte existentes; texto/nácar coherentes con nombre CANON.
- **E:** girar y tratar de atrapar, dados físicos DestrezaCD10.
- **F:** usar attached/detached y caught/fallen existentes; añadir alertaC4 una vez por consecuencia confirmada. Daño/destrucción es herramienta VTT opcional, no resultado canónico de fallo.
- **G:** caída comprometida → sonido y aviso C4; golpes10–15s mientras procedan. No lanzar combate/revelar posiciones.
- **H:** escaleras a C1; C4 está debajo, no una puerta directa en esta planta.

### C4 · B

- **A — CANON:** camarote bajo popa, cama hundida, escritorio/estantería, agujero estructural.
- **B:** goteo discreto VTT_AMBIENCE opcional; zombis son entidades, no animación de fondo.
- **C:** golpe/astillas al forzar como representación; sin daño automático añadido.
- **D:** puerta/listón; cajones saqueables; brújula desmontable; bolsa/herramientas/daga; zombis.
- **E:** forzar FuerzaCD10, investigar y recoger; acceso al agujero según medios.
- **F:** `BARRED → FORCED_OPEN`; integridad visual independiente. No tratar BARRED como cerradura con llave. Intentos fallidos y alerta privada; objetos tomados/propietario persistentes.
- **G:** rueda cae O segundo intento necesario prepara zombis tras puerta; apertura/visión habilita ataque para DM.2 zombis o3 a nivel2.
- **H:** puerta desde C1, agujero vertical hacia C8 con C9 debajo. Retorno no supone escalera.

### C5 · B

- **A — CANON:** cocina y esqueleto sin cabeza en encimera.
- **B — CANON/VTT_AMBIENCE:** la existencia y movimiento de cangrejos son CANON; ciclo corto, trayectoria y ritmo concretos son VTT_AMBIENCE. No mover todo el esqueleto con un loop enorme.
- **C:** no necesita VFX propio; humedad común opcional.
- **D:** cangrejos como grupo decorativo separado reutilizable; sin ficha de monstruo, PG, turno ni botín inventado.
- **E:** observar permite al DM describir causa del movimiento; no botón «iniciar combate».
- **F:** solo revelación narrativa si se usa, no máquina de enemigo.
- **G:** activar ambiente al verse cocina y pausarlo fuera de vista.
- **H:** puerta C1; sin paso C4 por pared.

### C6 · B

- **A — CANON:** seis literas, pertenencias genéricas, pared de retrato; suelo continuo sin pista luminosa.
- **B:** ninguna animación exclusiva necesaria.
- **C:** dardo e impacto puntuales; veneno solo si resultado confirmado. VTT_AMBIENCE no revela el alijo antes de descubrirlo.
- **D:** tablón, trampa y bolsa200 po; retrato separado si se permite tomarlo. Texto del retrato como handout autorizado, no texto minúsculo horneado.
- **E:** registrar PercepciónCD10, descubrir, levantar cercano/a distancia, resolver dardo y saquear; posible rearme adjudicado.
- **F:** descubrimiento `HIDDEN → DISCOVERED → OPEN`, trampa `ARMED → TRIGGERED → SPENT`; rearme explícito CANON posible, no reseteo al volver. Botín `AVAILABLE → TAKEN` separado.
- **G:** levantar armado dispara una sola vez; desde distancia segura falla. Dado+5 y daños/salvación se resuelven en mesa, no resultado decidido por VFX.
- **H:** puerta C1. El hueco del alijo NO conecta a C8.

### C7 · B

- **A — CANON:** mesa larga, sillas deterioradas, cristales/vajilla. Reservar corredor alrededor.
- **B/C:** ambiente interior común; ninguna animación/VFX exclusiva necesaria.
- **D:** solo sillas si el diseño de juego permite moverlas; en otro caso decoración estática declarada. No convertir toda vajilla en loot.
- **E:** tránsito e inspección narrativa, sin acción obligatoria.
- **F/G:** sin puzzle ni trigger canónico nuevo; ambiente automático por zona.
- **H:** puerta C1; sin paso a C6 por tabique.

### C8 · C

- **A — CANON:** casco y suelo, agujeros, escaleras, carga fija no interactiva claramente distinguible.
- **B:** agua somera y flotación de decoración; un mismo material/loop con profundidad configurada. Cajas interactuables conservan ancla lógica; oscilación visual no mueve colliders.
- **C — VTT_AMBIENCE:** ondas pequeñas alrededor de pies en movimiento, salpicadura amortiguada y reflejo tenue; usar piscina de efectos con límite por dispositivo.
- **D:** cajas/barriles que se muevan o abran y todos los contenidos; zombi(s) y gul independientes.
- **E — CANON:** vadear terreno difícil, abrir caja1/10 min según herramienta, d6 en mesa y recoger. No hacer esperar10min reales.
- **F:** apertura/saqueo por contenedor, registro global de seis resultados ya concedidos. `OPENING` es presentación; el estado durable es cerrado/abierto y contenido/propietario. No implementar aún esquema final.
- **G:** DM inicia/resuelve encuentro; gul aprovecha distracción sin que una IA decida ataque/parálisis. Hallazgo cofre + regreso C9→C8 habilita regreso arpía, una vez.
- **H:** escaleras/escotilla C1, agujero C4 y dos accesos C9. Todo C8 cuesta terreno difícil CANON; el ripple no produce coste adicional.

### C9 · D

- **A — CANON:** casco, brecha popa y escombros. Hueco bajo cofre alineado con C8/C4. Nada de cofre pintado.
- **B:** algas/peces CANON, movimiento representado VTT_AMBIENCE. Corriente leve solo visual, no arrastre automático.
- **C:** partículas y burbujas discretas; burbuja grande al abrir cofre sumergido representa evento CANON. Distorsión mínima que no deforme grid. Cáusticas solo bajo una fuente de luz autorizada, nunca luz propia.
- **D:** cofre hierro, tapa/variante abierta, paquete encerado flotante, bitácora, talismán y tesoro. Botas como ítem, no decoración permanente.
- **E:** nadar/respirar, hallar, levantar60kg con resolución de mesa, abrir sumergido o en superficie, recoger/leer/detectar magia.
- **F:** localización del cofre independiente de CLOSED/OPEN; evento contextual consumido; paquete liberado/recogido; conocimiento y posesión separados; curseState no depende del sprite.
- **G:** abrir sumergido → burbuja+paquete; abrir tras sacarlo → apertura sin burbuja submarina. Encontrarlo marca condición de regreso, no invoca inmediatamente arpía ni rompe maldición.
- **H:** C8 por agujero y escalera (respiración arriba), exterior submarino por brecha de popa. Sin salida secreta adicional.

## 5. Ambiente reutilizable, presupuesto y luz

Prioridad mínima de exterior: una superficie de mar, una máscara de contacto para espuma en casco/rocas/huesos y audio de oleaje/viento/gaviotas. La presencia de oleaje/brisa/gaviotas está descrita CANON; elección y animación de recursos es VTT_AMBIENCE. Compartir reloj/material y emisores, no un vídeo de toda la escena.

Segunda prioridad: una oscilación para jarcias/lonas, spray ocasional en puntos de impacto y partículas muy limitadas. Gaviotas en vuelo dibujadas, reflejos complejos y salpicadura individual de cada roca pueden esperar. **Descartar balanceo global del barco:** está sostenido en huesos; mover el tablero dificulta apuntar y medir. Sí permitir el balanceo canónico del mástil/cofa al trepar, sin cambiar el grid.

C8 usa la misma base de agua con máscara interior y amplitud baja. No inundar visualmente hasta cintura:15–45 cm CANON. C9 cambia a volumen/submersión visual de bajo coste; sin refracción que desplace las casillas ni peces brillantes. C5 usa pocos cangrejos con un ciclo breve, activados por visibilidad, sin botón DM.

Presets automáticos por zona/estado: exterior, interior, agua somera, sumergido. DM dispone de volumen/pausa global y contexto día/noche o fuente de luz; no necesita activar cada emisor. Desactivar partículas/reflejos en perfil móvil conserva geometría, grid y exactamente la misma información autorizada.

**Iluminación CANON:** día brillante en superiores/principal, tenue en C8, ausencia solar en C9; noche sin iluminación natural en todo el barco. La lectura autorizada puede depender de luz/visión del personaje. Primer alcance: DM declara/revela por zona y capacidades configuradas, servidor filtra contenido; proyector elige vista compartida, nunca suma automáticamente todos los sentidos. Color de interfaz y señal de posición propia pueden ser ayudas VTT, no iluminan tesoros. FOV automático detallado aplazable; oscuridad y secreto de C9 no.

## 6. Estados y triggers: análisis, no código cerrado

Mantener estados ortogonales pequeños: geometría/puerta; descubrimiento; trampa; contenido/propietario; alerta/encuentro; maldición/epílogo. No usar `EVENT` como estado permanente que pierda si se emitió la burbuja o se recogió el paquete. La apertura durable y un identificador de evento evitan repetir sonido/botín al reconectar. El próximo contrato de implementación resolverá campos exactos/versionado.

Regreso de arpías: ausentes → habilitadas por `(cofreHallado && retornoC9aC8) || descansoCompletadoABordo` → llegada confirmada/sonido → encuentro al volver C1 → resuelto por combate/negociación/huida. Si el grupo sale por brecha sin volver C8 ni descansar, no forzar ese disparador. Nivel2 prepara segunda en C2. Inicio de combate y tiradas siguen en mesa.

Maldición: activa → información descubierta/objeto obtenido → rota por resolución canónica confirmada → niebla → desaparición al día siguiente. Derrotar arpía y romper maldición son dos ejes. Nunca eliminar un mapa con PJ dentro por abrir el cofre. Epílogo con Runara/tumba/sueño/subida puede resolverse narrativamente desde DM, sin inventar una quinta planta del barco ni exigir otro battlemap.

Meta2–5 acciones significativas DM por escena fuera de combate: llegada/compartir zona, resolver petición, confirmar hallazgo, avance de escena y desenlace. C5/C7 requieren0–1; C4 unos2–3; C6 unos2–4; C9 unos2–4. C8 puede superar5 si se saquean muchas cajas: agrupar resolución de botín y usar transición automática autorizada; no ocultar tiradas para cumplir una cuota artificial. Éxito/fallo y elección del contenido son decisiones, reproducción de burbuja/ondas/audio no lo son.

## 7. Dependencias y aceptación espacial

Plano maestro común → alineación de escaleras/agujeros → fondos/superficies y colisiones → portales/ubicaciones persistentes → interactivos y encuentros → cues/luz → recorrido completo. C4/C8/C9 deben diseñarse conjuntamente por la columna del cofre. C1/C2/C3/cofa se comprueban juntos por alturas; el acceso submarino exige exterior y C9 alineados.

Mínimo para aceptar M1: ida/vuelta de todas las conexiones declaradas; no atravesar paredes/agua como suelo; dos actores en distintas plantas sin teletransporte colectivo; DM/proyector cambian vista sin alterar posiciones; sin revelar contenido oculto en payload/assets; guardar/reabrir y volver al punto correcto; cuadrícula/click/colisión coherentes. El mapa es recorrible antes de desarrollar encuentros completos; el capítulo solo será completo después de objetos, eventos y epílogo.
