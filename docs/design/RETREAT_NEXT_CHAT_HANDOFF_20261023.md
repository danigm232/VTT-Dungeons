# Cierre vigente · segunda pasada visual · revisión18

## Actualización prioritaria · 29/10/2026

Tercer pase de 15 puntos y optimización conservadora publicados en 3000 mediante **runtime/prepared-retreat-corrections3-20261029c**. Leer primero docs/evidence/RETREAT_CORRECTIONS3_20261029.md, roadmap maestro revisión 19 y prototypes/retreat-corrections3-20261028/STATE.md. Galería de 57 parejas en output/retreat-corrections3-20261028/index.html. Las secciones anteriores a esta fecha son antecedentes. No restaurar las candidatas a/b ni reconstruir el Retiro.

175 pruebas; 675 vistas; 283.860 muestras sin huecos; 1.596 casillas/13 superficies; 187 GLB y seis celdas exactos. Guardado 5 y once grupos protegidos. Optimización visualmente conservadora aplicada; Q1.4 prolongada y carga selectiva completa pendientes. FPS observados en cuatro focos contrastados: 25.1 → 25.1, sin garantía universal. Solo cuatro focos tienen referencia próxima para atribuir ganancia.

Conservar las mejoras privadas DM de otro chat y todos los originales en disco. No probar moviendo actores reales ni cambiando su escena. Usar copia aislada y cierre con guardado/backup antes de activar una candidata nueva.

---


Petición del28/10: revisar y mejorar A1–A5, costa, bosquetes y salidas antes de continuar la optimización. Publicada en3000: `runtime/prepared-retreat-visual-round2-20261028b`. Leer el maestro revisión18, `docs/evidence/RETREAT_VISUAL_ROUND2_20261028.md` y `prototypes/retreat-visual-round2-20261028/STATE.md`. Galería: `output/retreat-visual-round2-20261028/index.html` (servidor estático4632).

A1: conservar UV originales de roca nativa; el antiguo worldSurfaceUV mezclaba planos por vértice y producía bandas. No volver a reproyectar estas piezas. A2/A3/A4: tres acabados de madera con imágenes compartidas y dos rellenos interiores existentes ajustados. A4:27pilas y54rollos en huecos de las estanterías. A5: acanaladuras sutiles en cuatro fustes y patrón de suelo retirado del pedestal, piedra fina para la escultura. Costa: apoyo cerrado de Pleamar baja incluida unión con playa y continuación curva escénica. Ocho copas P5 refinadas, mismos troncos y ubicaciones.

Navegación exacta1.349casillas/13superficies/68conexiones,31fuentes de terreno/layout/nav/viajes exactas,183GLB originales conservados.71mallas estáticas de celdas con geometría física/matrices exactas;36UV de roca restauradas intencionalmente, las otras35 conservan todos los buffers.87pruebas/11archivos y675vistas;42destinos ida/vuelta,12.226pasos y745.842muestras físicas.63GLB compilados/2.213inputs congelados. Guardado versión4 y11grupos protegidos intactos. No mover actores reales, no usar selector de escenas para QA, no restaurar la copia privada sobre una partida activa.

La siguiente tarea es revisión artística con el usuario; optimización en espera. Si se retoma Q1: Q1.3b y después Q1.4, medición global sostenida en todas las zonas. Q1.1/Q1.2/Q1.3a y sus sistemas permanecen. No declarar FPS actuales a partir de galerías, pruebas en segundo plano ni mediciones históricas. Persisten perfiles ortogonales y vegetación simplificada; el objetivo visual de la propuesta no se certifica como acabado final.

Las secciones siguientes son antecedentes; prevalecen este cierre y el maestro revisión18.
# Cierre vigente V2–V5 · revisión17

Publicado en3000: runtime/prepared-retreat-v25-20261027b. El usuario autorizó terminar hastaV5; no hay una fase visual pendiente de ejecución en el registro de19puntos. Leer docs/evidence/RETREAT_VISUAL_V2_V5_20261027.md, el maestro revisión17 y prototypes/retreat-v2-v4-20261027/STATE.md.

No mover personajes reales ni usar el selector de escenas para QA. Originales conservados, seis celdas exactas, navegación13superficies/1.349casillas/68conexiones, guardado versión4. SoloA5 tiene17altas autorizadas y cuatro columnas perimetrales. Galería output/retreat-v2-v4-20261027/index.html. Pendiente revisión artística y FPS/memoria sostenidos en TODOel mapa antes de Q1. No reutilizar mediciones antiguas como actuales.

Las secciones inferiores son antecedentes.

# Retiro del Dragón — entrada para el siguiente chat

Actualizado: 27/10/2026. Raíz: C:/Users/User/Desktop/Dungeons.
Campaña: stormwreck-isle. Escena: dragon-rest. DM: http://127.0.0.1:3000/dm.

## Trabajo vigente — V1 visual publicada; próxima V2

Maestro revisión16. La petición actual contiene19puntos/15fotos y antepone su reparación aQ1. **V1 publicada en3000**, candidata `runtime/prepared-retreat-visual-fixes-20261027c`,PID8296; estado en `prototypes/retreat-visual-fixes-20261027/STATE.md`. Informe `docs/evidence/RETREAT_VISUAL_V1_20261027.md`; galería `output/retreat-visual-fixes-20261027/index.html`; registro COMPLETO y contrato de fases `docs/design/RETREAT_VISUAL_CORRECTIONS_20261027.md`. Leer estos tres antes de modificar nada.

Técnicamente cerrados1,2,6,12,13,14;17parcial. **Esperar revisión conceptual de V1 y continuar V2(puntos3–5): estanterías mayores/variadas, pared derecha y jardín.** Derecha en la vista del usuario corresponde al oeste de A4 en la cámara frontal; no confundir con el claro de Observatorio. Después V3templo/puente,V4caminos/jardineras/Pleamar,V5costa/mar/bote. No continuar Q1.3b ahora ni declarar los19puntos terminados.

Runtime nuevo1332casillas/13superficies/68conexiones; JSONoriginal1142intacto.190casillas nuevas verificadas sustituyen137de extensión defectuosa. Guardado versión4,0actores reales reubicados,11grupos protegidos idénticos.47pruebas,513vistas de3roles,12.226pasos y715aristas físicas.75geometrías nativas de celdas exactas;71matrices estáticas idénticas y4llamas animadas.32huellas laterales niveladas,50cm→0de desnivel transversal. Sin cambios deX/Z,UV,índices o navegación de esa escalera.176GLB originales idénticos,52compilados verificados.

Las candidatas A/B son intermedias; **C es la publicada**. Congelación final `checks/release-source-c.json`(2195entradas). Copia privada del guardado anterior en `runtime/retreat-visual-v1-before-publication-20261027/active.json`; no ponerla en una galería ni restaurarla sobre una partida en uso. Las pestañas de prueba3D se cierran al entregar; usar3000y la galería estática4623.

La calidad de luces/sombras/materiales se conserva. Escena1569→1578nodos, pico1620con proxies;233materiales/77texturas/18luces. Medición global sostenida deFPS pendiente tras las correcciones. No certificarFPS del mapa con A1/A4.

## Q1 conservado — contexto histórico de la entrega anterior

El usuario notó mejoras y autorizó continuar tras explicar el método. **Q1.3a publicada y medida** en3000, candidata `runtime/prepared-retreat-q13-20261027a`,PID11952. Se acelera el cálculo exacto de normales del agua y se omite el cálculo descartado de la espuma sin atributo; si este se añade, se calcula como antes. Sin recortes gráficos, nuevas mallas, luces, sombras o colliders. Informe `docs/evidence/RETREAT_Q13_20261027.md`; galería `output/retreat-q13-20261027/index.html`; estado `prototypes/retreat-q13-20261027/STATE.md`.18pruebas/5archivos,144estados/10.996.128valores exactamente iguales,90parejas/904firmas estáticas,50vistas funcionales,3retornos,12.242pasos/746.804muestras.58GLB y11grupos del guardado intactos;557inputs congelados/52GLB compilados. A1 43.73→44.27FPS,p95 37.30→37.15ms,CPU de normales−88.77%; A4 40.53→42.24FPS,p95 36.90→35.05ms,CPU de normales−86.18%. Una misma escena cargada,8bloques visibles de60s,10s de calentamiento,ordenABBA por foco,sin compilación concurrente y calidad de escritorio idéntica. O1Q1.2 activo en ambos estados. Medias de estadísticas de dos bloques, no certificación global. Caché adicional deCPU:75.264bytes de tablas en escritorio/31.104en compacto;sin nuevos recursos gráficos. Q1global sigue abierta. Maestro anterior revisión15; prioridad actual revisión16.

**Al retomar Q1 tras las correcciones y la auditoría global, Q1.3b:** carga selectiva de respaldos sustituidos y trabajo oculto por terreno. Mantener originales y respaldo válido hasta confirmar el relevo; no suspender animación por simples muestras que puedan omitir agua visible desde otra altura/cámara/render target. La puerta conservadoraQ0 sigue activa. DespuésQ1.4: memoriaGPU,sombras,exploración real≥10min y táctil real. LosFPS de dos focos no acreditan todo el conjunto.

Q1.1 (suelo estable/listas de luces) yQ1.2 (índiceCPU deoclusión) se conservan. Q1.3a modifica únicamente coastal-backdrop.ts y añade coastal-normals.ts/sus pruebas.554de555inputs anteriores idénticos. No regenerar baselines ni repetir arte/celdas/muebles/SAL/MEL. Las58fuentesGLB originales son idénticas. Ese hito conservabaJSON1142/runtime1279/13superficies/18conexiones. V1 retira la ampliación defectuosa de137y aporta190casillas medidas: runtime1332/13/68, JSONoriginal1142intacto.

Las transformacionesQA que alternan el método de normales no entran en producción; no usar los ensayosQ12 como números actuales. Guardado protegido y ningún actor real movido. No usar el selector scene para enfocarRetiro. Verificar identidad depuerto/lock antes de cerrar un servidor. Las pestañasQA se convierten en galería estática al terminar;3000 permanece activo.

## Último cierre anterior — M1/E1/L1,27/10/2026

**M1/E1/L1 CERRADAS TÉCNICAMENTE y PUBLICADAS en3000.** El límite anterior de no iniciarQ1 quedó superado por la petición posterior indicada arriba. Informe `docs/evidence/RETREAT_MEL_20261026.md`, galería `output/retreat-mel-20261026/index.html`, maestro anterior revisión12.309 pares/130 pruebas / 18 archivos/50 vistas funcionales/3 retornos estables. Estado `prototypes/retreat-mel-20261026/STATE.md`.

Candidata `runtime/prepared-retreat-mel-20261027a` ACTIVADA; servidor 3000 PID9664.52 GLB compilados,51 originales compilados coinciden con su fuente;55 GLB anteriores en disco intactos. JSON1142/runtime1279/13/18 conservados, incluidas137 casillas de playa autorizadas en otro chat. Celdas,muebles,arquitectura,anclas y sistemas originales exactos.10 grupos del guardado idénticos; el focoDM/proyector pasa aRetiro mediante `view:focus`,sin trasladar a ningún personaje. La raíz3000 abre jugadores; usar `/dm` para dirección.

M1:basalto a dos escalas,pavimento sobrio. E1:25 plantas/5 lotes/2376 triángulos/107244bytes,fuente Blender y apoyos verificados;material de acículas correcto yuna textura compartida256²,sin árboles nuevos. L1:caras interiores PBR iluminadas por ambos lados,rellenos existentes con atenuación coherente,sol/ambiente ajustados,cielo parcial y espuma608vértices/1lote con textura nativa.18luces y mismos mapas de sombra.3retornos:1569mallas/233materiales/75texturas/18luces estables; no equivale aFPS/VRAM certificadas.

No repetir M1/E1/L1 ni restaurarSAL/G2 por el aspecto simplificado del recurso. Revisar galerías con el usuario; permanecen siluetas de pinos simplificadas,paños grandes y ejes ortogonales heredados. Q1 queda para medición sostenida,carga selectiva,oclusión por terreno y memoria,con nueva instrucción explícita. Las secciones siguientes son antecedentes.

## Último cierre vigente — SAL-5,26/10/2026

Lote **SAL-2R/3/4/5 CERRADO TÉCNICAMENTE y PUBLICADO en3000**. Galería `output/retreat-sal5-20261026/index.html`, informe `docs/evidence/RETREAT_SAL5_20261026.md`, consolidado `checks/batch.json` en esa entrega.553 pares/50 vistas de grupo,roles,cuadrícula,390×844 ycombate/3 retornos estables;102 pruebas/11 archivos.54 pinos adicionales; costa y orilla derivadas sin cambiar arquitectura, celdas/muebles, anclas o navegación.51 GLB compilados,48 originales idénticos,560 inputs congelados.

Candidata `runtime/prepared-retreat-sal-20261026b` ACTIVADA en dist; servidor 3000 PID 20660. DM conectado/proyector dentro/guardado confirmado;11 grupos semánticos intactos. No mover personajes reales para QA. JSON 1142 sin cambios, runtime 1279 por ampliación de playa autorizada en otro chat. No retirar esas137 casillas ni restaurar la geometría anterior por sus nombres. Modelos2R/3/4 finales y fuentes Blender en `prototypes/retreat-sal-natural-20261026/`. Originales en disco y descarga de respaldos aprobados solo tras validar sustituto.

**Próxima ficha M1, con revisión conceptual del usuario pendiente.** El acabado de la propuesta aún no está certificado: quedan paños amplios/ejes ortogonales heredados y refinamiento general. E1/L1 yQ1 después; optimizar al final. No iniciar nuevas fases automáticamente ni repetir SAL/G2/A1–A5/Q0. Maestro revisión11. Las secciones del25/10 inferiores son antecedentes.

## Último cierre — Q0,26/10/2026

Primera pasada de optimización expresamente autorizada tras el paréntesis del usuario. Informe `docs/evidence/RETREAT_QUICK_OPT_20261025.md`, galería `output/retreat-quick-opt-20261025/index.html`, maestro revisión9. Estado `prototypes/retreat-quick-opt-20261025/STATE.md`.104 pruebas/11 archivos,35 pares y 3 regresos; sin reducción de calidad/luces/sombras. Candidata `runtime/prepared-retreat-quick-opt-20261025c` ACTIVADA. Q1 sigue al final.

Conservar la ampliación de playa autorizada por el humano en «Jugador y PNJ»: `retreat-island-walkability.ts` y su aplicación enretreat-runtime.ts. JSON original idéntico, runtime ampliado. Q0 solo resolvió el tipo de entrada validando con el esquema y adaptó la conservación por registros originales/orden, admitiendo altas sin duplicados. No restaurar el helper ni atribuir sus casillas aQ0.

Dos respaldos se descargan tras validar relevos, sin borrar originales ni materiales/texturas compartidos. Caché de hijos solo tras ready; agua/espuma con buffers reutilizados y pausas independientes, sin forzar matrices de cámara. Las35 vistas conservan pose, materiales y sombra efectiva. Q1 debe tratar carga selectiva inicial, oclusión de agua por terreno y medición sostenida. Primeras candidatas a/b y mediciones de ensayo son históricas; c es la entrega.

Próximo paso: revisión conceptual del bosque deSAL-2. Sus14 pinos no alcanzan aún la presencia de la referencia; revisar lectura/relieve antes deSAL-3. No se añadió bosque duranteQ0. No avanzar automáticamente ni reabrir optimización profunda.

## Antecedente del25/10 — SAL (superado por el cierre superior)

SAL-0 ySAL-1 aceptadas para continuar. El posterior «Adelante» autorizó SAL-2, ahora cerrada técnicamente y publicada. Próxima SAL-3, pendiente de revisión conceptual deSAL-2; no asumir autorización de todo el lote. Estado vigente: `prototypes/retreat-departure-sal2-20261025/STATE.md`. Maestro revisión8; ficha `docs/design/RETREAT_DEPARTURE_LANDSCAPE_PLAN_20261025.md`. Referencias aprobadas archivadas en `docs/references/retreat-departures-20261025/`.

**SAL-2 cerrada técnicamente y publicada:** informe `docs/evidence/RETREAT_SAL2_20261025.md`, galería `output/retreat-sal2-20261025/index.html`, consolidado `checks/sal2-verification.json` dentro de esa entrega.147 pares/41 vistas funcionales/3 retornos,99 pruebas en10 archivos,594660 muestras,12242 pasos. DM/proyector3000 sin errores; once grupos del guardado preservados y guardado confirmado porUI. No queda una tanda de pruebas activa.

Construido acceso compartido e interior delObservatorio sobre el mismo eje de61,5m; tres pinosG2 apoyados, once añadidos por reutilización y hito interior corregido. Modificado soloY de contactos nativos; arquitectura/celdas/muebles/anclas intactos. GLB SAL-2 SHA-256 `931c7b68995f8ad66c98398cf2eb22f964ff2fc2ce9567528e7f3c070af7ddc5`,1002768 bytes/13928 triángulos únicos/13 primitivas. Fuente editable/validador en la carpeta de estado vigente. SAL-1 original SHA `81cb48c57b780b2a17348858ef7f78324ad05547270d1e76a22e7b3554f7be01` conservada. El cargador compartido admite instancias; O1 usa metadatos independientes y las luces locales excluyen el decorado exterior. E1 reutilizará estos bosquetes.

Orden vigente: SAL-0/SAL-1 aceptadas → SAL-2 entregada a revisión → SAL-3 Observatorio costa → SAL-4 Pleamar baja/calas → SAL-5 validación global → M1 → E1 → L1 → Q1. G2/A1–A5 siguen cerradas. Mantener caminos/anclas y adaptar el paisaje a sus cotas; no rehacer rutas para copiar la imagen generada. Q1 al final.

## Petición y estado anterior

El usuario autorizó completar R0 → G2.5, ya cerrado, y después el nuevo lote **A1 → A3 → A4 → A2 → A5**, sin pausas intermedias de aprobación. No pidió commits, subagentes ni otro chat. Estado activo de los acabados: `prototypes/retreat-zone-finishes-20261024/STATE.md`. El lote A1–A5 está CERRADO y PUBLICADO; no iniciar M1/E1/L1/Q1 sin nueva instrucción. Informe actual docs/evidence/RETREAT_FINISH_BATCH_20261024.md; galería output/retreat-finish-batch-20261024/index.html.

R0–G2.5 cerradas funcionalmente. G2.5 publicada en3000 y comprobada con DM/proyector y guardado real.300 pruebas distintas correctas; contrastes de rendimiento terminados y aceptados por coste relativo. El informe G25 y checks/g25-verification.json son la autoridad del cierre. No retomar G2.3 desde notas históricas ni certificar acabado artístico final.

**Prioridad posterior del usuario (24/10): optimizar al final, en Q1.** Las próximas fases priorizan calidad del mapa y jugabilidad. La deuda actual de FPS/memoria no bloquea los acabados. No repetir mediciones prolongadas ni dedicar fases intermedias a optimizar; mantener pruebas funcionales, navegación, visibilidad, guardados y reutilización de recursos. Resolver fallos que impidan cargar o jugar; concentrar ajuste y certificación de rendimiento en Q1, después de L1.

## Leer primero

1. docs/audits/RETREAT_TECHNICAL_ROADMAP_20261023.md: orden, fichas y aceptación.
2. docs/evidence/RETREAT_G25_20261023.md y output/retreat-g25-20261023/checks/g25-verification.json, ya generados y comprobados.
3. Informes R0/G21/G22/G23/G24 en docs/evidence y galerías output/retreat-*-20261023.
4. T03-planta-construida, T04-perfiles-construidos y as-built-manifest.json en output/retreat-g25-20261023. T01/T02 son propuestas históricas, no navegación vigente.
5. prototypes/retreat-island-g2-20261023/STATE.md: cierre arriba; ignorar sus secciones históricas superadas. No queda una tanda de pruebas activa.
6. PDF correcto: OneDrive_1_12-9-2026/Aventura Los Dragones de la Isla de las Tempestades.pdf. Regional p.5; Retiro p.11 y capítulo1 pp.6–12; viajes pp.17/23/29. D8 Night no es fuente de esta aventura.

## Decisiones fijas

- Embarcadero a la derecha y arquitectura con su orientación actual, por decisión expresa aunque difiera del PDF. No espejar ni mover habitaciones.
- Seis celdas existentes y todo su mobiliario: conservar estructura, distribución, proporciones y accesos. No recrearlas desde una imagen.
- A2–A5 ya ampliadas; templo con superficie duplicada y columnas grandes. No duplicar otra vez.
- 1,5 m/casilla, Y vertical, dominio112×80 conservado.
- Dados físicos; DM decide tiempo, mareas, viajes, encuentros, pruebas, descansos y resultados narrativos.
- CANON y VTT_AMBIENCE separados. Sin nuevos paneles o controles innecesarios.

## Navegación publicada

retreat-terrain-v2.json conserva exactamente980 registros originales y añade162:30 Pleamar baja,50 alta y82 Observatorio. Total1142 casillas,13 superficies y18 transiciones. La conservación se comprueba por registros, no manteniendo fijo el total980.

Obstáculos, blockedEdges, edgePaths y transiciones originales permanecen al principio de las listas. retreat-island-navigation.json contiene trazas, centros y anclas nuevas. Ocultar cuadrícula no elimina navegación.

| Ancla | Superficie | Casilla |
|---|---|---|
| pleamar-low | island-pleamar-low | 8,61 |
| pleamar-high | island-pleamar-high | 8,29 |
| observatory-inland | island-observatory | 80,10 |
| observatory-coast | island-observatory | 106,17 |
| observatory-fork | island-observatory | 96,22 |

La bifurcación no es otro portal. Observatorio original93,33/+18m intacto. Rellanos nuevos: bifurcación29,90m, costa32,70m e interior37m. Pleamar alta sube y desciende hasta21,25m. height_profiles.py centraliza el perfil oriental.

Pruebas:12242 pasos autoritativos/746804 muestras físicas,17130 muestras corporales en GLB decodificados,4050 apoyos,864 reservas de agua y243 bordes nuevos bloqueados. El máximo0,1833m es separación navegación/apoyo, no contrahuella medida. Guardado y rejilla no cambian de versión.

## Geometría y propietarios

G1 permanece intacto. Tres GLB nuevos retreat_island_g2_1_runtime.glb, _2_ y _3_, en campaigns/stormwreck-isle/public/art/retreat-modules. G1+G2:19947 triángulos/1553440 bytes/18 primitivas; límites24000/1,5 MiB/18. Reutilizan materiales y pinos nativos.

retreat-island.ts carga dentro de retreat-refinement.ts/retreat-global-visuals.ts. Suelo visual, fondo permanente, obstáculos y objetos interactivos separados. No crear otro motor de movimiento, otro mapa paralelo o una imagen plana.

Los modelos originales de celdas y módulos ampliados conservan hashes. Los GLB publicados, comprobados por reimportación, son la entrega vigente. No reexportar G1 o G2.1/G2.2 por abrir el Blender de G2.3. Toda reexportación exige geometría y presupuesto nuevos.

Fuentes/validadores: prototypes/retreat-island-g2-20261023. No ejecutar prepare_baseline.py ni finish_r0.py sobre la entrega actual: modificarían o exigirían referencias ya históricas.

## Viajes y regreso

retreat-journeys.ts añade6 puertos retreat-journey-*, manuales/adjudicados, a PARADAS OPCIONALES. Cuatro alias siteAnchor reutilizan las intenciones terrestres originales; no nuevos actores persistentes.13 actores originales;17 definiciones de interacción.

| Ruta | Parada / llegada ground |
|---|---|
| Pleamar baja | camp-coastal-refuge /12,18 |
| Pleamar alta | camp-forest-pleamar /12,19 |
| Observatorio interior | camp-cliffs-observatory /12,18 |
| Observatorio costa | camp-cliffs-observatory /22,10 |
| Barca Pleamar | camp-coastal-refuge /12,2 |
| Barca Observatorio | camp-cliffs-observatory /12,2 |

No usar12,3: tiendas bloquean esa candidata. No mover los campamentos para encajar otra llegada.

Puerto original travel-pecio-boat conservado íntegro: barca existente → wreck-ship/sea; manual/adjudicado, referencia6000s. Su enum técnico swim entre mapas es traslado directo; no animación de nado. Los seis nuevos no suman automáticamente tiempos regionales completos por parar.

Rueda del jugador → solicitud journey en cola existente → DM confirma/cancela con RPC de puertos existente. No transición al pisar el borde. La dirección local autorizada del alias tiene prioridad sobre el marcador persistente remoto.

Regreso por PJ en booleanos progress mediante journeyReturnKey, hash64 bits, claves31 caracteres. NO concatenar IDs largos legibles: el esquema limita claves a40. Caminar dentro del campamento, guardar y reconectar conserva el medio. Sesiones/solicitudes efímeras no se guardan. Llegada ocupada busca suelo libre de forma acotada.

Cuevas B1–B6 y Observatorio D1–D6 NO existen. retreatPreparedDestinations los deja preparados sin mapId ficticio. Los campamentos no representan destinos finales ni garantizan descanso. Cuando existan mapas finales, añadir puertos nuevos estables: no reasignar silenciosamente los seis puertos de parada de guardados en uso.

## Cámara y ocultación

Perfil vigente5/10/15/20/25°, giro−30/−15/0/15/30°, inclinación continua entre límites. No restaurar el antiguo40°. Combate conserva inclinación manual y encuadra automáticamente; revisión táctica a25°, sin imponer otro preset.

Jugador: alejamiento local≤16m de alto y≤30m de ancho. DM/proyector conservan encuadres.126 registros de grupo/roles/cuadrícula/móvil. QA fija DPR1,125 tras cada entrada para comparar.

G25 amplía el propietario O1 a participantes públicos del combate además del foco: caché independiente acotada a40 actores, rayos/proxies existentes. Nada cambia en colisiones, muebles o narrativa. Antes/después: g25-combat-before-player-a4-y0.jpg /g25-combat-player-a4-y0.jpg.

Resuelto en acabado A4: los libros de un mueble atenuado quedaban opacos. Agrupación de primitivas y modo automático temporal en materiales glTF OPAQUE; restauración exacta, sin mover libros o muebles. Informe RETREAT_FINISH_A4_20261024.md. No generalizar este caso a toda posible oclusión futura.

## Memoria y rendimiento — antecedentes G25

Se corrigió una RawTexture huérfana por visita a campamentos en camp-atmosphere.ts. Un muestreador Texture comparte InternalTexture y referencia propia; conserva nivel1/clamp/repetición12o32. Vendor sin cambios. Tres reentradas:1183 mallas/228 materiales/71 wrappers/55 imágenesGPU y observadores estables. Basalto compartido:8×original/1×nuevo. Esto no es una medida exacta de VRAM.

360 bloques cortos:13 focos≤10%; outliers iniciales player/A3+12,61% yplayer/A5+10,56%. Contrastes pasivos finales g25-sustained-cost-a3.json/a5.json:3 ciclosABBA,60s por condición/ciclo; A3+0,78% yA5+0,99%, ambos PASAN. Datos cortos preservados; no se cambió el umbral.300 pruebas distintas consolidadas; cero fallos.

15 muestras de60s en g25-sustained.json:≈22–23 FPS. Ese ensayo precede al ajuste final de combate; las parejas y costes de combate finales usan el código actual. GPU G25:IntelUHD. R0 registraba WebKit genérico. Q1 pendiente: no certificar30 FPS, memoria o combates muy poblados. El respaldo G2 tiene planos amplios y repetición de basalto visibles: afinado visual pendiente, sin cambiar los suelos o rutas ya comprobados.

## Aplicación real y publicación segura

Candidata vigente `runtime/prepared-retreat-sal-20261026b` ACTIVADA en `dist`, servidor 3000. Las referencias de publicación SAL-2 de abajo son históricas; consultar Q0 para el último cierre. Versiones anteriores conservadas en `runtime/previous-build-*`; acabados/SAL-1 son históricos. Pruebas de compilación/publicación en `output/retreat-sal2-20261025/checks/release.json` y `published-asset.json`; fuentes compiladas fijadas en `prototypes/retreat-departure-sal2-20261025/checks/release-source-sha256.json`. Cambios ajenos delpecio conservados y comprobados por ese inventario; no restaurarlos. No cambiar autenticación ni editar locks a mano.

DM/proyector reales comprobados en3000 y guardado confirmado por interfaz. live-save-preservation.json: personajes/PG/inventario/posición, PNJ, objetos/puertas, progreso, notas, condiciones, descansos y clima intactos. Reloj, evolución climática y sonido pueden avanzar normalmente. No se usó la partida real para simular viajes, combate o movimiento.

INICIAR.cmd prepara/activa de forma segura y abre /dm; la campaña de isla incluye campamentos. Si hay un encuadre antiguo sin ficha asignada: Herramientas → Cámara → Todo el mapa, sin mover el grupo.

Para futuras versiones: preparar otra runtime/prepared-*; comprobar con datos aislados; cierre seguro con scripts/close-table-on-port.mjs; activar con scripts/prepared-build.mjs; iniciar3000 y comprobar ambos roles. No borrar locks a mano ni abrir dos escritores sobre data/saves.

## Secuencia histórica anterior a SAL-2R (no repetir)

Revisar conceptualmenteSAL-2; despuésSAL-3, cornisa costera delObservatorio desde bifurcación96,22/+29,90m hasta106,17/+32,70m. No duplicar el tramo común ni los bosquetes deSAL-2. Auditar el hito costero conservado en `G2_Wayfinding_Cairns_3`: SAL-2 trasladó solo51 vértices interiores y preservó las piedras costeras. Corregir su apoyo de forma localizada si corresponde. Mantener aire/cargaA2 y horizonte, sin nuevas casillas o viajes automáticos. SAL-4/5 yM1/E1/L1/Q1 siguen posteriores. A1/A3/A4/A2/A5 cerradas; no repetirlas ni duplicar ampliaciones. No declarar construidos mapas finalesB/D. No iniciar otra fase sin la instrucción del usuario.

## Cierre A1–A5 vigente

595 parejas antes/después, cinco GLB válidos,91 piezas/3612 triángulos/427340 bytes y cero imágenes nuevas.1142 casillas/13 superficies/18 conexiones exactas. A1/A3 encajes; A4 puerta/lectura de libros; A2 carga vinculada al palé0/12/15 y encuadre amplio; A5 uniones de columnas/cubierta y anclajes.102 pruebas actuales,38 vistas de grupo/cuadrícula/móvil/combate,3 retornos estables y594660 muestras físicas. DM/proyector3000 y11 categorías del guardado preservadas. Fotos de prueba a mediodía; capturas reales con noche/clima de partida. A2 a5° puede no incluir toda la vertical dentro deC2: preservar personaje/límite/ángulos.

Producción no se cambió por el falso crecimiento de callbacks del ensayo: completar tareas/endFrame antes de contarlos dio1/1/1 y recuentos estables. Evidencia inicial conservada en drafts/deferred-effect-disposal.

Cambio simultáneo ajeno game.ts/turnOnly revisado y conservado; hash5033649 bdebdfff8cd7f693f27037 dab5e8a5630258e9e747728c01557e1fd50. No restaurarlo. Fuentes Blender/validadores/estado: prototypes/retreat-zone-finishes-20261024. No repetir baseline, entregas ni baterías de FPS.

La imagen conceptual deSAL-0 no es fuente de coordenadas o mobiliario. T05/T06 ytechnical-data.json contienen la navegación actual; los fondos/discontinuas son reservas escénicas. Anclas fijas: alta8,29/+21,25m; baja8,61/+0,569m; interior80,10/+37m; costa106,17/+32,70m; bifurcación96,22/+29,90m. Pleamar alta tiene máximo+35,50m antes del descenso. No aplanarla. Numeración de imágenes1 alta/2 baja distinta del T03 histórico; IDs estables siempre prevalecen.


