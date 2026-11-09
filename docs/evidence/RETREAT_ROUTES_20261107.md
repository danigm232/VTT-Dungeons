# Retiro del Dragón · auditoría de recorridos · 07/11/2026

Estado de candidata verificada técnicamente y revisada en imágenes. Aceptación artística, prueba física y activación en 3000 pendientes. Inventario del mapa vigente, con 1.596 casillas, 13 superficies y 126 enlaces entre superficies. La escena conserva escala de 1,5 m.

Se ha vuelto a leer el PDF aportado, capítulo 1, mapa local 2, mapa regional 1 y viajes de pp. 17/23/29. Las ampliaciones y orientación actuales son adaptación autorizada.

| ID | Recorrido | Inicio | Llegada | Tramos de ida | Referencia |
|---|---|---|---|---:|---|
| muelle | Embarcadero y acceso al bote | beach 16,74 | beach 13,75 | 4 | p.6 |
| playa | Playa y arranque del ascenso | beach 16,74 | beach 44,65 | 37 | pp.6,10 |
| subida-a1 | Escaleras desde la orilla hasta A1 | beach 44,65 | a1 50,61 | 10 | p.10 |
| plaza | Plaza longitudinal de las celdas | a1 50,61 | a1 94,61 | 46 | p.10 |
| celda-1 | Acceso de la celda 1 | a1 53,61 | a1 53,58 | 5 | p.10 |
| celda-2 | Acceso de la celda 2 | a1 59,61 | a1 59,57 | 6 | p.10 |
| celda-3 | Acceso de la celda 3 | a1 66,61 | a1 66,57 | 6 | p.10 |
| celda-4 | Acceso de la celda 4 | a1 74,61 | a1 74,57 | 4 | p.10 |
| celda-5 | Acceso de la celda 5 | a1 81,61 | a1 81,57 | 4 | p.10 |
| celda-6 | Acceso de la celda 6 | a1 87,61 | a1 87,57 | 4 | p.10 |
| cliff-bajo | Primer tramo del acantilado y descansillo | a1 94,61 | cliff 102,53 | 16 | pp.10–11 |
| cabrestante | Desvío y puerta de la casa del cabrestante | cliff 102,53 | a2 107,45 | 13 | p.10 |
| cliff-alto | Escalera de A2 al paseo superior | cliff 102,53 | upper 101,45 | 9 | pp.10–11 |
| paseo-a3a4 | Paseo exterior del comedor y biblioteca | upper 101,45 | upper 59,45 | 44 | pp.10–11 |
| comedor | Umbral excavado del comedor | upper 78,45 | a3 79,40 | 6 | p.10 |
| cocina | Pasillo corto del comedor a la cocina | a3 79,40 | a3 78,34 | 9 | p.10 |
| biblioteca | Umbral y puerta de roble de la biblioteca | upper 68,45 | a4 68,39 | 6 | p.10 |
| jardin | Jardín y descanso junto a biblioteca | upper 59,45 | upper 54,39 | 11 | VTT_AMBIENCE |
| expedicion | Explanada de preparación y subida al interior | upper 93,43 | upper 95,33 | 12 | VTT_AMBIENCE |
| templo-puente | Subida, puente de madera y templo | upper 59,45 | a5 27,43 | 34 | p.11 |
| pleamar-baja-acceso | Playa al paso de las calas | beach 16,74 | pleamar 3,74 | 13 | p.17 |
| pleamar-baja | Senda baja de Pleamar y continuación | pleamar 3,74 | island-pleamar-low 8,61 | 18 | p.17 |
| pleamar-alta | Senda alta de Pleamar y continuación | upper 34,43 | island-pleamar-high 8,29 | 40 | p.17 |
| observatorio-enlace | Acceso compartido a la bifurcación | observatorio 93,42 | island-observatory 96,22 | 23 | p.29 |
| observatorio-bosque | Observatorio por el interior rocoso | island-observatory 96,22 | island-observatory 80,10 | 28 | p.29 |
| observatorio-costa | Observatorio por la cornisa costera | island-observatory 96,22 | island-observatory 106,17 | 15 | p.29 |

El análisis del grafo localiza 24 casillas con una sola conexión. Incluyen fondos de las celdas, huecos entre muebles, el extremo del embarcadero y el final de Pleamar alta. Esta condición del grafo por sí sola no identifica un corte visual. La lista y las rutas completas constan en el inventario.

La navegación y los viajes se validan en una partida temporal. Las puertas se abren mediante el comando del DM en esa copia para poder recorrer sus accesos. En la ampliación de playa hay direcciones coincidentes en las superficies beach y pleamar con una diferencia de altura de 9 cm. El motor resuelve la superficie al mover. El registro conserva estos cambios de dirección interna sin interpretarlos como un bloqueo de paso.

CANON define las funciones de A1–A5 y las alternativas de viaje. VTT_AMBIENCE define la forma precisa de los senderos locales, vegetación, taludes y prolongaciones escénicas. Pleamar conduce al suroeste regional, Observatorio al sureste y el pecio al norte/noroeste. Los ejes del modelo conservan la orientación adaptada del claustro.

## Correcciones sobre el mismo mapa

| Objeto y archivo propietario | Estado auditado | Derivado candidato | Criterio |
|---|---|---|---|
| `SAL1_Decorative_Trail_Continuation`, `retreat-trail-ends.ts` | Huella corta tras el descansillo alto; roca oculta parte de la continuación | Prolongación curva hasta el respaldo del promontorio, con hombro continuo de basalto y pendiente acotada | VA-07/13; mantiene la ancla `pleamar-high` |
| `R2_Pleamar_Low_Cove_Continuation`, mismo archivo | El remate apunta frontalmente contra la pared rocosa | Gira hacia la cala exterior, recorre su borde seco y continúa alrededor del afloramiento; cota escénica de 0,569 m | VA-07/13/15; mantiene `pleamar-low` |
| `SAL2_Scenic_Trail_Continuation`, mismo archivo | La continuación del interior es corta y se confunde con el rellano | Huella de tierra prolongada hacia el relieve del interior con dos cambios suaves de dirección | VA-04/13; mantiene `observatory-inland` |
| `SAL3_Scenic_Coast_Continuation`, mismo archivo | Última cara de la cinta GLB desciende hasta el fondo marino | Se limita la variación de altura entre muestras; la huella rodea el hombro costero y continúa hacia el norte local | VA-07/13/15; mantiene `observatory-coast` |
| Cuatro `:rock-shoulder`, mismo archivo | Prolongar solo la textura dejaba tramos sin apoyo geológico | Cuatro apoyos 3D de anchura variable, con material rocoso existente, tintado mineral y bordes descendentes | VTT_AMBIENCE; sin suelo de navegación, colisiones o recorte de personajes |
| `retreat:eastern-coastal-water`, `retreat-eastern-water.ts` y conexión en `retreat-refinement-coast.ts` | Abertura azul clara entre cornisa y agua en la vista frontal del Observatorio | Superficie marina trazada fuera del acantilado vigente, material y colores del agua nativa, actualización solo cuando se ve | VA-15; sin mar nuevo encima del terreno jugable |

Los pavimentos, escaleras, puente del templo y umbrales internos examinados tienen continuidad funcional. Se conservan como arquitectura construida; la revisión no convierte cada tramo recto de cantería en un sendero sinuoso. Las seis celdas y todos sus muebles conservan sus fuentes. Las puertas, puertos, puntos de interacción y cámaras no se han desplazado.

Las cuatro fuentes de sendero siguen en disco y en la escena, desactivadas después de crear su derivado. La nueva huella comparte una variante de la tierra existente. Los apoyos comparten roca del Retiro. El agua comparte el material de la bahía y las variaciones de sus vértices. No hay imágenes conceptuales utilizadas como terreno o recursos comerciales incorporados.

Referencia de paisaje REF-01 para separación de planos y REF-07 para continuidad costera, según `VISUAL_REFERENCE_LIBRARY.md`; aplicación interpretativa sobre la geografía vigente. La forma precisa de estas prolongaciones es VTT_AMBIENCE. El PDF acredita las funciones y opciones de viaje, no este trazado métrico de los senderos.

## Navegación y viajes

- 26 recorridos comprobados con `GameState.moveEntityOneSquare`, **846 pasos efectivos**, ida y regreso, sin bloqueos. Los registros distinguen los 12 cambios de alias `beach`/`pleamar` descritos arriba.
- Las 1.596 casillas permanecen conectadas. Huella SHA-256 de `retreatTerrain` antes y después `601655aca5378f3b83efc77bfefd384386cc8ce32c49a190bf7e7d1750efe833`.
- 53 pruebas funcionales de seis archivos de servidor aprobadas. Incluyen recorridos físicos A1–A5, mobiliario, puerta de A4, subida al templo, bosquetes, seis paradas de viaje optativas, regreso a la posición guardada y confirmación manual del DM.
- Los 13.510 puntos indicados por `walk.json` son el recuento de muestreo de las polilíneas; no constituyen una nueva prueba independiente de colisión en cada punto. Las comprobaciones físicas están en las pruebas del servidor y la navegación conservada.
- Comprobación adicional de las seis paradas vigentes, ida y regreso con adjudicación del DM: posición, superficie, escena y orientación del personaje conservadas. Se registra en `walk.json` bajo `journeys`.
- Se mantienen `EXIT_PLEAMAR`, `EXIT_OBSERVATORIO` y `TRAVEL_PECIO_BOAT` a través de los IDs y puertos vigentes. La información del inventario conserva los IDs originales en minúsculas del código. No se crea otro sistema de viaje.
- El pecio y las paradas existentes continúan conectados. Los destinos completos todavía preparados por el proyecto conservan esa condición; esta entrega no construye las Cuevas ni el Observatorio ni automatiza narración, dados o pruebas.

## Evidencia y reproducción

[Comparador antes/después](../../output/retreat-routes-20261107/index.html) · [Inventario completo](../../output/retreat-routes-20261107/inventory.json) · [Movimiento real](../../output/retreat-routes-20261107/walk.json) · [Originales y huellas](../../output/retreat-routes-20261107/comparison-originals.json).

[Checklist por cada uno de los 26 recorridos](../../output/retreat-routes-20261107/route-checklist.json), con hallazgo, origen/destino, referencia, capturas y límites de aceptación.

El barrido reúne 104 pares a 1280 × 720. Por recorrido se examinan llegada lateral −30°/25°, frontal 0°/15°, detalle +30°/25° y regreso 0°/5°, en los límites de zoom de jugador. Misma luz diurna, puertas abiertas y posiciones del personaje. El manifiesto comprueba diferencia de pose **cero**. La fase de las ondas puede variar entre capturas. Son muestras representativas de cámaras reales, no un barrido de todas las posiciones intermedias ni de clima nocturno. El último retoque de los cuatro apoyos y del agua se repite en 16 vistas y sustituye esos registros en el manifiesto final.

El comparador reutiliza `scripts/lib/visual-comparison.mjs`. Conserva el mismo rectángulo al alternar, muestra ANTES/DESPUÉS y admite teclado, ampliación y originales. Las imágenes oficiales extraídas del PDF son material local de consulta, no assets del juego.

Código de revisión en `prototypes/retreat-routes-20261107/` y ampliaciones de `prototypes/retreat-fixtures-20261106/review.ts`/`vite.config.mjs`. El visor reutiliza `WorldRenderer`; no implementa otra cámara o motor. El entorno de revisión excluye la precompilación duplicada de Babylon y espera texturas y efectos activos para evitar capturas incompletas. No se escriben partidas reales.

## Límites de cierre

La candidata conserva diferencias de acabado previas, como perfiles lejanos de pocos polígonos y grandes superficies de tierra. La continuidad de los recorridos no equivale a cerrar todo el arte del mapa. La aceptación artística, el ensayo físico de jugador/proyector, el clima completo y los FPS sostenidos permanecen separados de estas verificaciones.

La compilación estándar detectó un error de tipos en una prueba del Pecio ya modificada por otro trabajo, `engine/client/wreck-rebuild.test.ts:55` (`AbstractMesh` frente a `Mesh`). Se añadió exclusivamente una importación y una comprobación `instanceof Mesh` a esa prueba, conservando los cambios del otro trabajo. Es una reparación del control de compilación compartido; no modifica el mapa del Pecio. Las nueve pruebas de ese archivo pasan y el control completo de tipos del cliente vuelve a pasar.

## Pruebas y coste de la candidata final

- **53 pruebas funcionales** del servidor repetidas sobre la candidata final, **22 pruebas** de presentación del Retiro y las **9 pruebas** del archivo compartido corregido. Logs en la carpeta de entrega. Los resultados antiguos se conservan como diagnóstico, no sustituyen estos registros finales.
- Tipos completos del cliente, tipos/compilación del servidor y compilación Vite comprobados. Vite conserva los avisos de tamaño de las dependencias Babylon/Pixi; no son un error de carga. No se modificó el límite de avisos para ocultarlos.
- Candidata completa en `runtime/prepared-retreat-routes-20261107/dist`, con manifiesto `prepared.json`. La compilación inicial de diagnóstico se conserva dentro de esa candidata como `web-initial`; el cliente vigente de la candidata es `dist/web`. [Registro de compilación y controles](../../output/retreat-routes-20261107/candidate.json). No se ha activado en la mesa de 3000.
- El fallo visual de las caras del agua orientadas hacia abajo se detectó al revisar la imagen, se corrigió y se cubrió con una comprobación de normales geométricas orientadas hacia arriba.
- Se revisaron las cuatro hojas de contactos del pase completo y las 16 vistas finales. Comparador probado con clic, teclado y ampliación al 150 % en el navegador integrado.
- Escena de 2.296 a 2.301 mallas y de 247 a 248 materiales; mantiene **23 luces**. Se añaden cuatro apoyos rocosos y una superficie marina. El incremento geométrico de esos objetos y las huellas extendidas es de **13.840 triángulos**. El inventario general también incluye líneas y no debe calcularse dividiendo todos sus índices entre tres.
- El pico de objetos de textura registrado pasa de 124 a 125. Son contadores de recursos del motor, no archivos ni memoria GPU exacta. Se conservan las imágenes existentes de roca/tierra/agua. No se añaden nuevas imágenes, luces o mapas de sombras.
- Los apoyos son estáticos y no tienen colisiones. La superficie marina añade 648 triángulos, comparte el material nativo y aprovecha su versión de geometría para actualizarse solo cuando se ve.

| Foco diurno, cámara frontal | Mediana de redibujado | p95 |
|---|---:|---:|
| Pleamar baja | 8,8 ms | 18,0 ms |
| Pleamar alta | 9,4 ms | 17,9 ms |
| Observatorio interior | 18,2 ms | 26,4 ms |
| Observatorio costero | 12,5 ms | 24,8 ms |

Medición aislada de 16 muestras tras ocho calentamientos, redibujado completo forzado y espera de GPU, 1280 × 720. **No son FPS sostenidos de partida ni una comparación de rendimiento antes/después.** No acreditan todavía ausencia de regresión durante recorridos, lluvia o sesiones DM/jugador/proyector simultáneas. El contador interno de draw calls se conserva como acumulado, sin presentarlo como llamadas por fotograma. [Recursos, método y huellas del código](../../output/retreat-routes-20261107/resources.json).

## Archivos de la entrega y siguiente comprobación

Producción del Retiro en `retreat-trail-ends.ts`, `retreat-eastern-water.ts` y conexión de `retreat-refinement-coast.ts`. Pruebas en `engine/client/retreat-departure-landscape.test.ts` y `engine/client/retreat-refinement-regressions.test.ts`. Reparación de compilación compartida limitada a las dos líneas descritas en `wreck-rebuild.test.ts`. Se conservan otros cambios previos en los archivos compartidos.

Inventario, recorrido, comparador y medición en `prototypes/retreat-routes-20261107/`; visor reutilizado en `prototypes/retreat-fixtures-20261106/`. Se actualizan `ROADMAP_V1.md`, `PROJECT_STATE.md` y la ficha local `RETREAT_DEPARTURE_LANDSCAPE_PLAN_20261025.md`.

Siguiente comprobación recomendada dentro de la misma ficha: recorrer las salidas en mesa real con DM, jugador y proyector simultáneos, de día y con lluvia, medir intervalos de fotograma y decidir la activación de esta candidata. El mapa completo de Cuevas/Observatorio conserva su estado preparado. La mejora posterior del paisaje debe priorizar los grandes perfiles geométricos y la vegetación por hábitat ya identificados, sin modificar casillas ni reconstruir el claustro.
