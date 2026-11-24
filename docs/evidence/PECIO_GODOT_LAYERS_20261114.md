# Pecio Godot — auditoría y mejora por capas, 14/11/2026

## Encargo y estado

El usuario encarga auditar el Pecio ya iniciado en Godot y continuar todos sus elementos por concepto/distribución, blockout y geometría/arte base. Después amplía explícitamente el encargo a texturas/materiales, iluminación y VFX/clima. Esta ficha registra implementación y evidencias; el orden global sigue en `ROADMAP_V1.md`. No declara aceptado M5 ni probado físicamente M7.

Base: `prototypes/godot-pecio`, Godot 4.7.2 Forward+, NVIDIA MX350 en las capturas de esta sesión. El prototipo es local: no se encontró integración con el servidor de partidas del VTT ni guardado persistente de campaña. El runtime web, los guardados y `engine/client/wreck-ocean.ts` modificado por otro trabajo se conservan.

## Capas 1–3 implementadas

- Distribución: perfil de doce estaciones, eslora 61,5 m, cuadrícula 1,5 m, escora 9,5° y asiento 1,2° conservados; plantas C1–C9 y cofa, puertas y conexiones existentes. Diagrama exacto derivado de `wreck_structure.gd`, no concepto presentado como render.
- Blockout: greybox de la misma escena y pruebas físicas de apoyos, huecos y escaleras. No es otra maqueta ni otro mapa.
- Construcción: `ship_geometry.gd` comparte vigas cerradas, tubos y extrusión de cantos/cara inferior. Cancela aristas internas y divide las uniones en T de las escaleras para no fabricar falsos tabiques.
- `hull_builder.gd`: cuadernas volumétricas, espesor de 18 cm en C1/C2/C3, límite exacto de brecha en x=-24, materiales opacos de cubierta.
- `ship_construction.gd`: cierre de aparadura y quilla, cintones y astillas sin reparar la brecha, trancaniles, cadenas/vigotas/acolladores, zunchos y ligadas, remate y cartabones de cofa, herrajes y ensamblaje del afuste.
- `interiors_builder.gd`: cantos de 18/20/22 cm en camarotes/C8/C9, testas y parte inferior de mamparos cerradas, pies derechos/soleras, cuadernas interiores y cartabones de puntales; UV de C9.
- `rigging_builder.gd`: vergas y paños transversales, obenques fijados a mesas de guarnición, eliminación de la segunda instancia del trinquete roto (dos colisiones duplicadas eliminadas; las de C2 permanecen).
- `deck_dressing_builder.gd`: bancada abierta, brazola hueca, adujas espirales, marinero articulado y testas fracturadas de palos. El cuerpo decorativo se desplaza 25 cm hacia babor, z=-4,60→-4,85, para separarlo del barril; interacción y colisiones de carga conservadas.
- Balista inutilizable conforme a M5: brazo partido, cuerda caída y virote depositado; se corrige el mensaje que decía que estaba lista para disparar. Mismo objeto e interacción, sin nuevo botín.
- `dragon_bones_builder.gd`: bóveda con volumen, órbitas hundidas, mandíbula conectada y dentición asentada. Se conserva ancla, límites y colisión original de 370 triángulos. Hueso mate sin los tablones/clavos que se heredaban del atlas de roble.

## Registro de recursos y aceptación

| IDs / familia | Propietario | Antes → candidata | VA / referencia | Aceptación |
| --- | --- | --- | --- | --- |
| `Frames*`, `Deck_C1..C3` | hull + ship_geometry | láminas → sección cerrada / cantos 18 cm | VA-05/07, REF-07 | Construido, revisión artística pendiente |
| `Floor_*`, `Deck_C8/C9`, `Bulkhead_*`, `HullInner_*` | interiors | caras abiertas → cantos, testas, refuerzos | VA-05/06/07, REF-02/08 | Construido, revisión artística pendiente |
| `MainYard`, `TopYard`, `TatteredSails`, `Chainwales_*`, cofa | rigging + construction | ejes/anclajes incoherentes → montaje conectado | VA-05/07/13/14, REF-07 | Construido, revisión artística pendiente |
| madera exterior | material kit | mismo albedo ilustrado; escala 0,35 → 8×4 m, normal 0,22, rugosidad 0,96 | VA-03/04/05, REF-07 | Muestra C1 inspeccionada y extendida; pendiente usuario |
| `GoldDragonSkull`, `OrbitalCavities`, huesos humanos | bones + material kit | caras/roble → volumen y hueso #c0b7a4 / #a69e8c, rugosidad 0,88 | VA-03/05/07, REF-07 | Candidata inspeccionada, pendiente usuario |
| bancada, brazola, adujas, marinero, balista | dressing + construction | bloques/primitivas → ensamblaje y restos | VA-06/07, REF-08 | Candidata, pendiente usuario |

El inventario completo por malla, propietario, material, transformación y triángulos se genera en `output/godot-pecio-layers-20261114/{before,after}/inventory.json`; los cambios por conjunto están en `asset-register.json`. Los elementos conservados no se declaran remodelados. Paleta, texel y rugosidad de la candidata no equivalen a aprobación del usuario.

## Pruebas y evidencia

- Suite nueva `test_ship_construction.gd`: 72 comprobaciones de volumen, espesores, apoyos por rayos físicos, tres huecos, escalera C1–C8, entrada P16, montaje, recorte/restauración, límites y colisión de Clyssavar y ausencia de textura de roble en hueso.
- Suites existentes: integridad, alineación de cuatro puertas, paridad de cámara y animaciones. Logs y códigos de salida en la carpeta de evidencia; los resultados vigentes se recogen en `regressions.json`.
- Capturas originales Forward+, 1280×720, misma cámara/FOV, semilla 14112026 y simulación congelada: conjunto, popa, proa, C1–C9, cofa, cráneo y marinero. Tres series: antes, candidata y greybox.
- El antes se reconstruye en un proyecto temporal aislado a partir de las fuentes originales guardadas, sin restaurar ni intercambiar archivos en el prototipo activo. Recursos e importaciones copiados localmente; no se modifica la mesa habitual.
- Comparativas superpuestas con clic/toque, teclado y ampliación mediante `scripts/lib/visual-comparison.mjs`; originales y SHA-256 en `manifest.json`. `REVISAR-PECIO-CAPAS.cmd` abre el informe, `ABRIR-PECIO-GODOT.cmd` el juego.
- La interacción del informe no se pudo comprobar en el navegador integrado: conexión loopback rechazada y página de error bloqueada por su política. No se intentó sortear esa restricción. La escena sí se renderiza y sus PNG se inspeccionan con el motor real.

## Procedencia y conservación

Geometría nueva original/reproducible en GDScript. Texturas ilustradas existentes: procedencia en `LICENSES_AND_CREDITS.md` y `campaigns/stormwreck-isle/public/art/visual-style-v1/SOURCE_MANIFEST.json`. No se importan capturas comerciales ni nuevos modelos externos. Los modelos heredados que el prototipo denomina Kenney requieren reconciliar sus créditos con el registro general anterior; no se declaran licenciados por sus nombres.

Se corrige `.gitignore` para que el proyecto Godot deje de estar oculto por `/prototypes/`; su caché `.godot` sigue excluida. Sin commit ni publicación. Checkpoint de fuentes sin assets en la carpeta de evidencia.

## Capas 4–6 implementadas

### Texturas y materiales

- Lino 512×512 reutilizado exactamente desde A1 V4 para los textiles: `linen-reused-v4.webp`, escala 0,75, normal 0,16, rugosidad 0,97 y tinte #aaa28a. Procedencia en el README de `campaigns/camp-rests/public/art/a1-hd2d-v1/`.
- Suelo y mamparos interiores usan la familia ilustrada de madera existente en lugar de la foto de suelo anterior; normal 0,28 y AO 0,30 para calmar el relieve.
- Vidrio de popa tintado, alpha 0,65 y sin emisión permanente; ya no son cuatro rectángulos ámbar luminosos sin fuente.
- Variantes de intemperie compartidas y separadas de los interiores. La lluvia oscurece albedo y ajusta rugosidad/especular; los shaders de casco, velas y modelos heredados reciben `rain_wetness`. El secado es gradual y se comprueba la restauración exacta de los valores secos. No se crean materiales nuevos en cada cambio de estado ni se reescriben cuando la humedad ya es estable.

### Iluminación

- `ship_environment.gd`: perfiles locales de día, atardecer y noche, sol/luna orientados hacia abajo, cielo/ambiente por estado, AO y bloom contenidos.
- Máscaras estáticas de geometría y máscaras de luces por C4, C5, C6, C7, C8, C9 y exterior. Los emisores de estancias fuera de vista se suspenden. Los actores reciben ambiente y lámparas locales con una capa constante declarada en `player_token.tscn`; al desplazarse cambia la máscara de su lámpara, no la capa de su geometría.
- Mamparos y forros tienen copias exclusivamente para sombra, sin caras visibles ni colisiones, que siguen impidiendo filtraciones cuando el recorte oculta la pared original. Los faroles interiores pertinentes proyectan sombras.
- C9: anulados los rellenos azules de profundidad/ambiente; la luz de brecha responde a la hora y las lámparas portadas conservan su función. Agua interior menos opaca/especular y cáusticas reducidas, con intensidad menor de noche.
- Se reprodujo en Forward+ el error de emparejamiento de luces al cambiar capas de geometría entre fotogramas. Se evita el cambio de capa de los sprites en vivo y se vacían los emparejamientos antes de destruir la escena de captura. No se actualiza el motor para eludirlo. Contexto primario: [Godot #121989](https://github.com/godotengine/godot/issues/121989).

### VFX y clima

- `Ambiente · F6`: tres horas y cuatro climas (despejado, lluvia, tormenta, bruma), más efectos suaves. Controles locales, sin decidir reglas ni estado narrativo del servidor.
- `VfxManager` existente conserva rompientes, plumas, polvo, goteras, burbujas y brasas. Se separan sus tags C4–C7, se detienen emisores ocultos y se fijan semillas reproducibles. La lluvia nace por encima de la cofa y se suspende al revisar interiores; no se simula dentro de las salas.
- Las adujas y aparejos mantienen su geometría; el viento regula el velamen. Los efectos suaves reducen densidad de partículas y agitación textil sin cambiar colisiones ni la amplitud física del mar.
- La amplitud de tormenta se comparte entre shader, muestreo CPU y barca. No se cambia la escala, cotas o límites navegables. La estela de remo requiere movimiento horizontal; el balanceo estacionario no produce estela.
- Continuación geométrica del océano distante, bajo `OceanWater`, con el mismo shader/estado y sin colisiones. La rama lejana del shader calma normales/espuma a 75–100 m y evita reconstrucción de profundidad sobre triángulos grandes; el agua y flotación jugables conservan el campo próximo.

### Validación y revisión de las seis capas

- Suite `test_ship_environment.gd`: matriz de 12 presets × 7 modos de estancia, lluvia/exclusión interior, parada de emisores, luz/actor por planta, capas estables, ausencia de rellenos artificiales de C9, fuentes/colliders constantes, humedad reversible, oleaje acotado y amplitud CPU/GPU/barca, efectos suaves y estela sólo en movimiento.
- Se ejecutan las seis suites del prototipo. Los resultados finales reales, incluidos códigos de salida y búsqueda de errores, están en `regressions-final.json`; las capturas se verifican aparte en `capture-results.json`.
- Siete ambientes renderizados en quince vistas cada uno: día despejado, atardecer, noche, lluvia, tormenta diurna, bruma y tormenta nocturna. No se afirma haber renderizado todas las combinaciones posibles: la matriz de lógica y la cobertura de imágenes son distintas.
- Antes, construcción y acabado usan ahora posiciones explícitas equivalentes del personaje sobre cada planta. El encuadre/FOV, resolución, semilla y pies del actor se cotejan en los manifiestos; no se hace pasar una vista con el personaje en otra altura por una comparación integrada.
- `finish-asset-register.json` conserva los cambios por ID/propietario/valor/referencia; `finish-manifest.json` registra originales SHA-256, controles, pruebas y límites. El informe incorpora las comparativas superpuestas y un selector de estados visuales.

Referencia de API primaria consultada: [Light3D y máscaras](https://docs.godotengine.org/en/4.7/classes/class_light3d.html) y [capas de VisualInstance3D](https://docs.godotengine.org/en/stable/classes/class_visualinstance3d.html). Estas fuentes explican la API, no acreditan el resultado artístico del prototipo.

Pendientes globales: juicio artístico del usuario (incluido el detalle de muebles/restos y la lectura de C8/C9), prueba física/M7, FPS sostenidos por zona y recorrido, red/guardado/exportación del prototipo y reconciliación narrativa de los añadidos heredados. No cerrar esos apartados por completar documentos o pasar tests. No se declara «perfecto» ni se presenta la candidata como migración completa del VTT.

## Retoma y cierre de la entrega del 14/11

Al retomar se encontró el código de las seis capas, pero el HTML y sus manifiestos solo presentaban las primeras tres. Las capturas de acabado eran anteriores a los últimos ajustes de suelo y partículas. Se conserva el trabajo recibido y se completa su evidencia vigente.

**Candidata reproducible de esta entrega:** `runtime/godot-pecio-horizon-review-20261114`, abierta con `ABRIR-PECIO-CAPAS.cmd`. Durante la segunda tanda de capturas entraron cambios de interfaz VTT de otro trabajo en `prototypes/godot-pecio` (16:12–16:17): esa tanda se detuvo por errores de compilación de los scripts nuevos. No se revierten ni se corrigen a ciegas fuentes que se están editando. La candidata aísla las seis capas ya auditadas con el ajuste del horizonte; los cambios artísticos permanecen también en el proyecto compartido. Las seis suites y los siete ambientes finales se ejecutan sobre esta candidata aislada. No se certifica aquí el nuevo HUD en curso.

El checkpoint de fuentes de acabado, sin caché ni assets duplicados, queda en `godot-finish-source-checkpoint.zip`. Usa los mismos recursos existentes en `prototypes/godot-pecio/assets`; no es una migración a otra versión antigua del mapa. `capture-source-project.json` identifica el proyecto concreto revisado y `finish-manifest.json` conserva esa identidad junto a los hashes.

- Se reejecutan las seis suites: 72 comprobaciones de construcción y 2.071 de ambiente, sin fallos, más integridad, puertas, cámara y animaciones; códigos de salida y errores en `regressions-final.json`.
- `scripts/verify-godot-pecio-layers.ps1` reproduce pruebas o capturas. Usa un checkpoint de construcción en un proyecto aislado, los recursos existentes y caché temporal dentro de `runtime/`. No intercambia fuentes en el proyecto jugable. `-Phase Verify` ejecuta las suites; `-Phase Capture` regenera 15 vistas de construcción y 105 de acabado; `-SkipConstruction` permite repetir solo el acabado.
- Para reproducir esta entrega sin incluir el HUD en curso, añadir `-ProjectPath runtime/godot-pecio-horizon-review-20261114` a ambos comandos de verificación y captura. Los generadores leen la identidad registrada del proyecto, no presuponen que toda la carpeta compartida sea la candidata capturada.
- La captura fija explícitamente los pies iniciales del protagonista, detiene scripts/física, sustituye `TIME` en shaders temporales y usa `--fixed-fps 60` con delta positivo para partículas. Oculta el aviso de interacción antes de renderizar. Se mantienen los originales históricos de construcción, cuyos pies solo difieren hasta 0,000001 m entre proyectos; el manifiesto declara esa tolerancia de 0,00001 m. Las comparaciones nuevas de acabado exigen manifiestos de cámara/pies/simulación idénticos.
- Se registran hashes de fuentes GDScript, escenas y shaders en `capture-source-hashes.json`; el generador de acabado rechaza fuentes modificadas después de las capturas. Se cotejan las 715 formas de colisión por propietario, clase y transformación local, ignorando únicamente los contadores automáticos de nombres de Godot. Los inventarios no serializan dimensiones o vértices de las formas: los apoyos y huecos se comprueban aparte mediante rayos físicos en la suite de construcción.
- Se termina el informe de seis capas: 15 comparativas históricas de construcción, 15 de acabado y dos del ajuste posterior del horizonte; selector de 15 vistas × siete ambientes. `scripts/validate-godot-pecio-report.mjs` verifica originales/hashes, dimensiones PNG, referencias locales y sintaxis de los scripts del informe. Resultados en `report-validation.json`.

### Ajuste posterior localizado: mar distante

Se observó una superficie lejana demasiado lisa y oscura, especialmente al atardecer. Muestras aisladas reales de día y ocaso antes de adoptar el ajuste en el prototipo.

| ID | Propietario | Valor anterior → candidato | VA / referencia | Estado |
| --- | --- | --- | --- | --- |
| `OceanWater / OceanHorizon`, rama distante | `shaders/ocean_water.gdshader` | Albedo lineal `(0.018, 0.038, 0.056)` → `(0.018, 0.055, 0.075)`; normal plana → ondulación amplia calculada por fragmento, pendiente 0,045; rugosidad 0,55 → 0,38; especular 0,12 → 0,22 | VA-13/15/16, REF-07 | Muestra diurna/ocaso revisada visualmente; aceptación del usuario pendiente |

Se conserva la transición existente de 75 a 100 m, sin nuevos muestreos de profundidad, cambio de desplazamiento del agua, amplitud física, geometría, colisiones o barca. Los originales previos están en `horizon-before/{day-clear,dusk-clear}/overview.png`; comparación superpuesta con las capturas finales equivalentes. El resto de los siete ambientes se regenera con el mismo shader final.

### Límite de la revisión del informe

Se intentó comprobar la interacción en Chrome conectado. La URL loopback no resultó accesible y la apertura del archivo local fue rechazada expresamente por la política de URL del navegador (protocolo no permitido). Se detuvo la prueba de navegador sin eludir esa restricción. La validación estática del HTML y sus recursos no se presenta como prueba de clic/toque/zoom. El usuario puede abrir el archivo local con `REVISAR-PECIO-CAPAS.cmd`.

**Resultado final observado:** seis suites y siete tandas de render con salida 0 y sin errores en la candidata aislada. 105 capturas de acabado, 15 de construcción y las dos originales del horizonte, además de las 45 imágenes históricas de construcción/greybox. Validador final: 167 originales con hashes y dimensiones verificados, 149 referencias locales existentes, dos scripts del HTML con sintaxis válida y 32 comparativas superpuestas. Fuentes de la candidata cotejadas con sus hashes; las siete series conservan idénticas cámaras, pies y configuración de captura. Estos resultados no certifican FPS sostenidos, M7 físico ni la nueva interfaz compartida en curso.

## Cámara actualizada — 14/11/2026

La cámara vigente y sus nuevas pruebas se registran en [Cámaras Godot](GODOT_CAMERAS_20261114.md). Esta actualización sustituye los valores de cámara anteriores de esta ficha y conserva el mapa, arte y contratos existentes.

## Micromejoras visuales transversales y océano/bloom — 19/11/2026

- **Cambios en `prototypes/godot-pecio/`:**
  - `shaders/ocean_water.gdshader` + `scripts/ship_environment.gd`: añadidos `fresnel_sky_color`, `distant_color_tint` y `fresnel_strength` conducidos por hora (`day`/`dusk`/`night`) y clima (`overcast`), junto con `ground_bottom_color`.
  - `scenes/main.tscn`: calibración inicial de `Environment_1` (`glow_intensity = 0.32`, `glow_strength = 0.85`, `glow_bloom = 0.045`).
  - `scripts/player_token.gd` y `scripts/map_exit.gd`: sombra `ContactShadow` proporcionada a estatura y altura aérea, pulso + sigilo sin emisión saturada en `SelectionRing`, y balanceo pendular suave en `dragon_plaque` respetando `SkillLoading.reduced`.
- **Verificación tras el último cambio (`task-1998`):** `test_ship_environment.gd` **2210 PASS / 0 FAIL**, `test_character_animations.gd` **EXIT=0**, `test_vtt_interfaces.gd` **57 PASS / 0 FAIL**, `test_camera_contract.gd` **49 PASS / 0 FAIL** (`test_pecio_integrity.gd` falla 8 comprobaciones previas de capas `Grid_C1..Grid_C10` ajenas a esta entrega). Capturas Forward+ `1440×810` en [`output/micro-visual-improvements-20261119/index.html`](../../output/micro-visual-improvements-20261119/index.html). Aceptación visual y pruebas físicas pendientes.
