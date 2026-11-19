# Zombis y las dos arpías — cierre visual del 16/11/2026

Ampliación de [la auditoría de personajes del 15/11](CHARACTER_SPRITES_20261115.md), solicitada expresamente por el usuario: completar los zombis disponibles y continuar con ambas arpías. Se conserva el trabajo actual de escenarios, rueda de acciones, cuadrícula e interfaz. No cambia el orden de acabado del roadmap maestro.

## Resultado implementado

La primera entrega solo renovaba el zombi con tricornio y su ataque principal. Ahora hay **cuatro apariencias de marinero** —tricornio, camisa a rayas, pañuelo morado y red de pesca— con sus propios recortes y siluetas. Golpe, mordisco y presa tienen rutas visuales diferentes. Cada uno dispone de ocho fases para recibir daño, caer, levantarse, arrastrarse y recuperar la postura por Fortaleza de no muerto, además de guardia. Los cuerpos derrotados conservan la última pose tumbada; ya no se congela la caída al desactivar el movimiento.

Las **dos arpías** reutilizan la identidad original de pelo rojo, alas cobrizas, ropa azul y porra de hueso. Tienen caminar, vuelo, garras y porra en ocho rumbos con ocho imágenes por secuencia; canto, despegue, aterrizaje, impacto, caída, levantarse, arrastre y guardia tienen ocho fases. El multiataque existente conserva sus dos resoluciones, con garras y porra visualmente separadas. La arpía adicional de C2 está registrada como `harpy-2` en el prototipo del Pecio: empieza oculta, fuera de la selección de participantes visibles, con PG/condiciones propios y el mismo perfil de vuelo y acciones. No se revela automáticamente ni se incorporan nuevos zombis a los encuentros.

Se añaden **15 atlas seleccionados, 960 poses** a la biblioteca compartida, que pasa a 37 atlas. Los tres marineros adicionales aceleran su propia caminata para el desplazamiento rápido: contienen ocho dibujos distintos, pero no se presentan como tres carreras redibujadas. Mordisco, presa y transiciones usan una vista de acción con los reflejos laterales disponibles; no son ocho vistas nuevas de cada gesto. Las acciones de movimiento de jugadores de la entrega anterior se conservan.

## Estados y resolución

Los PNJ usan acentos discretos compartidos sobre su silueta. El adaptador contempla agarrada/apresada/restringida, asustada, aturdida, cegada, derribada, ensordecida, hechizada, incapacitada, inconsciente, invisible, paralizada, petrificada, envenenada, agotamiento y oculta. Se reutiliza el cuerpo propio tumbado para inconsciente/derribada y una postura quieta para inmovilizadores; no se han encargado poses especiales de condición para todos los PNJ. Al quitar una condición se eliminan su acento y el tinte/opacidad correspondientes. La inmunidad del zombi a envenenada se respeta. El estado lógico, duración y eliminación siguen perteneciendo al sistema de combate y al DM.

Fortaleza de no muerto no resucita por reproducir un dibujo. Mientras se espera la salvación física el cuerpo cae; la recuperación se reproduce cuando las reglas confirman que sigue vivo. La CD y los PG proceden de la lógica existente. El canto conserva el arbitraje del DM. La presa tenía un daño `1d1` de marcador: se convierte en acción guiada para que ese marcador no quite PG ni aplique una condición automáticamente. Se mantiene el perfil de campaña y no se inventa una CD contextual. Esta entrega no declara una conversión completa de todos los monstruos de la aventura a otra edición.

## Registro de recursos

Referencia principal: identidad de los PNG originales de campaña; REF-01 de la biblioteca común para lectura de silueta en escenario 2.5D. No se copia arte comercial. VA-03/10/14/16/17/18: proporción, lectura del actor, coherencia del recurso, animación, importación y trazabilidad. Los archivos propietarios y cambios son:

| ID/material | Propietario | Recurso anterior | Candidato seleccionado | Aceptación |
| --- | --- | --- | --- | --- |
| zombie-2/3/4.walk, attack | `godot-shared/sprites/npc_sprite_library.gd` | El catálogo solo elegía el primer marinero; secuencias cortas históricas | `baked/zombie-{2,3,4}-{walk,attack}.png`, ocho rumbos × ocho fases | Prueba nativa superada; artística pendiente |
| zombie/2/3/4.reactions | mismo módulo | Golpe genérico/4 fases/reacciones incompletas | `baked/zombie*-reactions.png`, ocho acciones × ocho fases | Prueba nativa y revisión de recortes integrada |
| harpy.walk, flight, claws, club | mismo módulo | 4 fases y porra indistinguible de garras | `baked/harpy-{walk,flight,claws,club}.png` | Ocho fases verificadas en cada rumbo |
| harpy.utility | mismo módulo | Sin canto/despegue/aterrizaje completos | `baked/harpy-utility.png`, ocho acciones × ocho fases | Sin contacto con borde del original seleccionado |
| npc.conditions | `npc_condition_visuals.gd` | Sin conexión visual nativa completa | SVG propios discretos, postura y tinte/opacidad reversible | Estados e inmunidad verificados |
| npc.collapse/recovery | `npc_runtime.gd`, `combat_visuals.gd` | Derrota detenía inmediatamente el reproductor | Secuencia completa con física desactivada y recuperación condicionada por reglas | Prueba del último fotograma y retorno a vivo |
| harpy-2 | `npc_encounter_variants.gd` | Refuerzo existente solo en campaña web | Instancia nativa oculta junto a C2, reutilizando arte y perfil | Integración real del Pecio verificada |

Fuentes y derivados están en `prototypes/godot-shared/sprites/`, con copias instaladas en Pecio, Retiro y campamentos. `art-sources.json` registra originales de ImageGen integrada, prompts, revisiones y referencias; `asset-manifest.json` contiene hashes y dimensiones. Los originales generados permanecen sin modificar. Se descartaron intentos de siete columnas y se corrigió un ala que tocaba el borde izquierdo. Las **15 láminas finales tienen 64 siluetas completas y cero avisos de borde de origen**. La extracción identifica figuras sobre la lámina completa antes de asignar celdas y conserva margen; el reproductor neutraliza el RGB invisible antes de crear mipmaps.

El VTT web consume los mismos derivados mediante `engine/client/character-motion.ts`; `combat-animation.ts` diferencia mordisco, presa, porra y canto. Las variantes están asignadas a los actores existentes de C4/C8/playa sin cambiar sus posiciones, número ni visibilidad inicial. Las dos arpías de campaña conservan sus identificadores, ubicación y condiciones independientes. Se respeta una apariencia alternativa configurada por el usuario.

## Validación y revisión

El refuerzo oculto mantiene desactivados movimiento y colisión: no se convierte en un obstáculo invisible. Al revelarlo se activan mediante su visibilidad real. La comprobación integrada verifica también sus PG y condiciones independientes.

- **442 comprobaciones nativas sin fallos en cada uno de los tres prototipos**: ocho imágenes distintas por secuencia direccional, acciones específicas, estados, inmunidad, retirada de invisibilidad, caída congelada solo al final y recuperación.
- **2.354 comprobaciones del reproductor anterior** y **124 de combate** superadas en Pecio. El cambio de presa guiada se valida además con las reglas actuales de confirmación del DM.
- **13 pruebas web focalizadas**: adaptador de recursos, rutas de ataque y actores M3, incluyendo visibilidad, guardado de condiciones y ubicación de criaturas. Tipos de cliente y servidor comprobados.
- Capturas Forward+ reales en escenario neutro: 1280×720, cámara `(0,4,10)`, objetivo `(0,.8,0)`, tamaño ortográfico 5, misma luz y selección temporal de fotograma. Diez comparativas superpuestas reversibles con teclado y ampliación; `capture-originals.json` registra los 20 archivos y sus hashes. Cuando antes no existía un gesto se ve su reserva anterior, como indica el informe.
- Doce capturas nativas adicionales de estados y tres dentro del mapa actual del Pecio. Las capturas del refuerzo lo revelan solo en esa ejecución de revisión; no se guarda una campaña ni se altera la partida abierta.
- Visor comprobado en navegador: selección de segunda arpía, vuelo de ocho fases, pausa/avance, estado paralizada estático, inmunidad del marinero a envenenada y comparación antes/después reversible. Sin errores de consola durante esta revisión.

[Visor y comparativas](../../output/npc-sprites-20261115/index.html), abrible también con `REVISAR-ZOMBIS-ARPIAS.cmd`. Repetir comprobaciones mediante `scripts/review-npc-sprites.ps1 -Project pecio|retiro|campamentos -Mode Test|Capture|Integrated|Rules|PlayerRegression`. Las capturas integradas son del Pecio; las otras dos copias se comprueban mediante su catálogo/reproductor real.

La candidata queda implementada y revisable. La aceptación artística del usuario y la prueba física sostenida siguen separadas. El arte y adaptador web están en fuentes; no se recompila ni reinicia una mesa web en marcha. No se cierra M5/M7 ni el acabado completo de los mapas por esta entrega de animaciones.

## Segunda auditoría y correcciones — 16/11/2026

Petición posterior: «audita, busca errores y mejora». Los resultados siguientes corresponden a la candidata corregida en esta segunda revisión; las cifras de la entrega anterior se conservan arriba como historial.

### Errores reproducidos y corregidos

- **Multiataque de arpía:** la porra sustituía inmediatamente a las garras cuando llegaban ambos resultados juntos. `combat_visuals.gd` encola las acciones y respeta la duración real de cada clip; la reacción al daño sigue su momento visual. Los cuerpos no interrumpen una acción comprometida. Las resoluciones de daño y los dados físicos conservan su autoridad.
- **Fortaleza de no muerto:** se conserva el resultado aunque el DM resuelva rápidamente la salvación durante el ataque. La recuperación se representa al terminar la secuencia correspondiente. Recuperar PG de un refuerzo oculto ya no activa una colisión invisible; su visibilidad sigue gobernando movimiento y colisión.
- **Dirección y cámara:** `sprite_facing.gd` proyecta el rumbo del mundo sobre la vista para elegir el dibujo. Objetivos y puntos usan posiciones globales. Apuntar a uno mismo conserva el rumbo. Se mantienen los ejes de movimiento y controles vigentes.
- **Conjuro sobre uno mismo:** una curación propia ya no cancela su pose al aplicar la respuesta visual del objetivo.
- **Reposo y estados:** los marineros adicionales conservan su propio atuendo al detenerse o recurrir a una reserva visual. Los inmovilizadores mantienen su orientación; derribada en movimiento usa arrastre y la inconsciencia tiene prioridad. Canto/vuelo temporales terminan en reposo; los PNJ con estos atlas no reciben giros o vuelos ambientales espontáneos del reproductor antiguo.
- **Acentos de condición:** siguen el tamaño real de la silueta de cada fotograma. Sobre un cuerpo tumbado dejan de flotar a la altura de una persona en pie. Se conserva el estilo discreto existente, sin nuevas poses especiales ni concesión automática de condiciones.
- **Sonido y carga:** canto y ataques de zombi reutilizan sonidos de campaña apropiados, con procedencia en `sprites/audio/sources.json` y caché de audio. Un atlas completo evita cargar y descodificar los antiguos collages descartados de ese PNJ. Se comprueba la eliminación de esas cargas; no se atribuye una mejora de FPS sin medirla.
- **Fuentes web:** cada campaña recibe su copia independiente de clips/fotogramas; el reposo direccional es estático y pertenece a su apariencia. Las variantes ya no heredan accidentalmente gestos del primer marinero. El visor refleja estos mismos criterios y corrige el reflejo duplicado en poses inmovilizadas hacia el oeste.

### Registro de ajustes de esta candidata

Misma identidad de los originales y REF-01; VA-03/10/14/16/17/18. No se genera arte raster nuevo en esta auditoría.

| ID/recurso | Archivo propietario | Valor anterior → candidato | Aceptación |
| --- | --- | --- | --- |
| harpy.multiattack | `godot-shared/combat/combat_visuals.gd` | Eventos simultáneos que se sustituyen → cola con duración del clip | Regresión y comparación nativa superadas |
| npc.facing, self-cast | `godot-shared/sprites/sprite_facing.gd` y `scripts/player_token.gd` de los tres mapas | Vista fija/objetivo local → selección relativa a cámara y objetivo global | Ocho rumbos con cámara a −30°, 0° y +30° verificados |
| zombie-2/3/4.idle, conditions | `npc_sprite_library.gd`, `npc_condition_visuals.gd`, `sprite_library.gd` | Reservas de otro atuendo/acento a altura fija → reposo propio y metadatos `silhouette_size` | Pruebas y capturas nativas; aceptación artística pendiente |
| npc.recovery, harpy-2.hidden | `npc_runtime.gd`, `combat_visuals.gd` | Recuperación podía habilitar física oculta → recuperación ligada a visibilidad | Ciclos de ocultar/revelar/curar y salvación rápida superados |
| harpy-song, zombie-groan | `sprites/audio/`, `audio/sources.json`, reproductor de cada mapa | Sonido genérico → `harpy-song.ogg` y `zombie-groan.wav` de la campaña actual | Carga, selección y silencio verificados; balance físico pendiente |
| npc.catalogue | `npc_sprite_library.gd::ready`, catálogos de cada mapa | Construcción de clips históricos descartados → validar atlas completo y conservar reserva si falta | Caché de imágenes históricas sin crecimiento al cargar estos PNJ |
| web.motion | `engine/client/character-motion.ts`, `stormwreck-isle/public/pack.ts` | Caché mutable compartida/reservas heredadas → copia por campaña y reposo propio | Pruebas web; solo fuentes, sin despliegue |

El código compartido de sprites y combate está instalado en Pecio, Retiro y campamentos. Los reproductores de cada mapa conservan sus particularidades. Los nuevos auxiliares `npc_test_controller.gd`, `npc_test_ui.gd`, `test_npc_regressions.gd` y `capture_npc_audit.gd` permiten reproducir la comprobación sin modificar la partida.

### Validación de la segunda auditoría

- **99 comprobaciones nuevas en cada uno de los tres prototipos, cero fallos**: secuencia de multiataque, rumbo/cámara, estados y siluetas, atuendos, sonidos, salvación rápida, curación propia y visibilidad/colisión.
- Reejecutadas en **Pecio**: **442** comprobaciones del catálogo de PNJ, **2.354** del reproductor de personajes y **124** de combate; cero fallos. Esta segunda pasada no presenta las 442 de los otros mapas como nuevas ejecuciones.
- **15 pruebas web** superadas: seis del adaptador de movimiento, cuatro de animaciones de combate y cinco de actores M3. Comprobaciones de tipos de cliente y servidor terminadas sin errores.
- Captura integrada actual del Pecio completada con dos arpías independientes y refuerzo oculto, conservando posiciones originales. Nuevas capturas de estados revisadas en el escenario nativo.
- [Informe de la segunda auditoría y tres comparativas superpuestas](../../output/npc-sprites-20261115/audit-20261116/index.html), construido con `scripts/build-npc-sprite-audit.mjs` y `scripts/lib/visual-comparison.mjs`. Sus seis originales sin modificar, hashes SHA-256, cámara y dimensiones se registran en `capture-originals.json`. Evidencia bruta: `output/npc-sprites-audit-20261116/`; resultados consolidados: `validation.json` del informe.
- Misma cámara neutra, luz, 1280×720 y tamaño ortográfico 5 en cada pareja. Multiataque comparado a 0,21 s; el antes procede del reproductor anterior real. Las comparaciones de estados conservan la pose equivalente. No se presentan encuadres distintos como una comparación exacta.
- Visor e informe comprobados en navegador: selección de variante/acción/estado, pose estática, clic reversible antes/después, teclado, ampliación al 200 % y ausencia de errores de consola.

Repetir las comprobaciones nuevas mediante `scripts/review-npc-sprites.ps1 -Project pecio|retiro|campamentos -Mode Regression`; capturas con `-Mode AuditCapture -Phase before|after` y `-Mode AuditConditions`. `before` etiqueta la captura del código que esté instalado al ejecutarlo: no restaura automáticamente una versión histórica. Los originales del informe preservan el antes real de esta auditoría.

Esta revisión conserva mapas, distribución, escala física, reglas de campaña y controles. La candidata nativa está instalada; las fuentes web están actualizadas sin recompilar ni reiniciar una mesa en marcha. Aceptación artística del usuario, balance de audio y prueba sostenida con dispositivos físicos siguen separados de las pruebas técnicas realizadas. No cierra M5/M7 ni declara redibujados los gestos históricos no incluidos.

## Tres opciones de overlays y auditoría de estaturas — 16/11/2026

El usuario rechaza el acabado anterior y encarga rehacerlo con tres opciones, adaptarlas por personaje/PNJ/monstruo y revisar tamaños y alturas. La primera muestra de trazos retargeteados no se da por aceptada; queda sustituida por tres candidatas seleccionables. La aceptación artística de estas candidatas sigue pendiente.

### Aspecto implementado y elección del DM

- **Bruma y partículas:** trazos difundidos en varias capas, degradados radiales, vaho y motas localizadas.
- **Runas y energía:** filamentos segmentados, sellos abiertos, signos pequeños y núcleos de luz.
- **Pincelada ilustrada:** trazos secos irregulares, veladuras y fragmentos dibujados. Las tres comparten el color semántico de cada estado, pero cambian dibujo y tratamiento.

Dieciséis estados canónicos de presentación y el alias `apresada`/`restringida`; ocho fases de efecto por opción. Las ligaduras físicas mantienen una forma estable. Invisibilidad conserva la transparencia del cuerpo en los tres acabados, sin añadir un halo que revele a la criatura. Un zombi inmune al veneno no recibe el efecto. Las inmunidades respetan también los alias históricos en ambos sentidos.

`condition_overlay_library.gd` usa anclajes propios para Silverfarben, Trinity, Mía, Mike, Anteros, marineros y arpías. Las alas no ensanchan un efecto de torso. Hay un perfil humanoide de reserva y una plantilla configurable de cuadrúpedo, **sin declarar esta última validada sobre un monstruo nuevo**. Los cuerpos tumbados reciben el acento sobre su silueta; el salto usa su desplazamiento lógico para evitar arrastrar la altura de la pose anterior. Se muestran condiciones simultáneas con prioridad estable e intensidad repartida. El movimiento reducido congela el efecto. Los billboards mantienen prueba de profundidad, sin sombras ni colisión, por encima del dibujo del actor pero detrás de la geometría que lo oculte.

El módulo ahora aplica los efectos también a jugadores. Conserva las poses existentes de Silverfarben y Trinity y los estados nativos anteriores de los PNJ; no se redibujan cuerpos ni se conceden condiciones. La selección está en **DM → Ajustes → Aspecto de la consola → Estados de personajes · 3 acabados**. Ofrece solo miniaturas visibles, tres opciones y una recomendación por personaje/estado. El DM puede sustituir esa recomendación por cualquiera de las opciones de forma independiente. La preferencia se guarda en `user://condition-overlays.cfg` de cada prototipo; no modifica el guardado de campaña ni sincroniza otros dispositivos. El refuerzo oculto queda fuera del selector.

Recomendación candidata: runas para lanzadores y hechizos, pincelada para Trinity y ligaduras físicas, bruma para veneno y marineros; las arpías combinan pincelada con runas en magia. Es una asignación inicial sustituible, no una decisión artística aceptada por el usuario. La elección del visor HTML se conserva para revisión y no escribe automáticamente las preferencias del juego.

### Registro de recursos y cambios

Se reutiliza el arte de personajes. Los efectos son vectores propios generados por `scripts/build-condition-overlay-art.mjs`; no se descarga arte comercial ni se genera un nuevo collage raster. REF-01 para integración discreta y REF-03 para lectura táctica; VA-03/10/14/16/17/18. No se promete equivalencia de calidad con un título comercial por añadir VFX.

| ID / propietario | Anterior | Candidata | Estado de aceptación |
| --- | --- | --- | --- |
| condition.art · `sprites/condition-art.json` | Unos pocos trazos reutilizados entre estados; solo el primero era visible | Tres tratamientos originales, ocho fases, motivo propio por estado, color compartido por significado | Generación/carga y capturas verificadas; artística pendiente |
| condition.rig · `condition_overlay_library.gd` | Escalado genérico a toda la caja del sprite | Cabeza/torso/suelo, ocho perfiles de muestra y ajustes tumbado/salto | Revisados en escenario neutro y muestra integrada |
| condition.runtime · `npc_condition_visuals.gd` | Solo PNJ, un acento y tintes | También jugadores, capas simultáneas, retirada reversible, alias/inmunidades y movimiento reducido | Regresión nativa superada |
| condition.selection · `condition_overlay_picker.gd`, `dm_style/appearance.gd` | Sin elección por miniatura | Tres acabados + recomendación, selección visible y persistencia por actor | Interfaz real y persistencia verificadas |
| stature.party · `character_stature.json` / `.gd`, reproductores de los tres mapas | Mía 1,65 m, Trinity 1,75 m y Mike 1,95 m en Pecio; 1,95 m de reserva en Retiro; otro ajuste en campamentos | Mía 1,30 m, Trinity 1,05 m y Mike 1,80 m, reutilizando las calibraciones de campaña | Comparación real y pruebas en los tres prototipos |
| stature.monsters · mismo módulo | Zombi 1,95 m y arpía 2,20 m en Pecio | Zombi 1,80 m y arpía 1,70 m según calibración web existente; variantes comparten el perfil corporal | Verificación técnica; exactitud individual no acreditada |

Fuentes compartidas de sprites instaladas en Pecio/Retiro/campamentos. `combat_visuals.gd` transmite la preferencia de movimiento reducido. Las modificaciones de `dm_style/appearance.gd` están aplicadas en su fuente y las tres copias. Se mantienen las particularidades del reproductor de cada escenario y los cambios de otros chats.

### Qué se ha verificado sobre altura y canon

Inventario de **33 ajustes de fichas web**, incluidos marcadores/objetos, y **37 atlas / 2.368 fotogramas**: `stature-source-audit.json`. Las envolventes de una pose tumbada, salto o brazo levantado se distinguen de la estatura de pie. No se normaliza una pose tumbada para que vuelva a medir lo mismo que una persona erguida.

Las fichas originales de María, Mía y Mike están escaneadas. Se han renderizado para inspección: la página 2 deja elegir altura, peso, edad y apariencia al jugador; no aporta una estatura individual numérica que permita declarar canónicos 1,05/1,30/1,80 m. Se conserva su identidad de mediana/enana/alto elfo y sus categorías de tamaño. Las cifras unificadas son **calibraciones visuales existentes de la campaña**, expresamente identificadas como estimaciones. Silverfarben conserva 1,37 m y Anteros 2,10 m en Godot; tampoco se afirma haber acreditado esas cifras como alturas individuales del manual.

El ajuste común se aplica antes de crear la representación y la cápsula de altura. Conserva radio de ocupación, colocación, velocidad, alcance, reglas, cuadrícula de 1,5 m y navegación del mapa. Las alturas personalizadas distintas de los valores históricos de reserva se conservan; una muestra de revisión puede fijar su escala mediante `stature_preserve_visual`. El VTT web se inventaría sin cambiar sus medidas ni reiniciar su mesa en esta entrega. No se inventa una altura exacta para los PNJ sin dato ni se trata la altura de un retrato como la de un cuerpo completo.

### Evidencia y validación de la candidata

- [Visor de las tres opciones, comparativas y escala](../../output/npc-sprites-20261115/overlays-options-20261116/index.html), generado con `scripts/build-condition-overlay-review.mjs`. Selección de personaje/estado, tres muestras simultáneas, ampliación y preferencia local de revisión.
- **456 capturas nativas** de ocho apariencias de muestra × tres acabados × diecinueve selecciones (estados, combinación y ausencia). Incluyen dos marineros; los cuatro marineros y ambas arpías usan sus perfiles correspondientes en el motor. No se afirma haber hecho capturas de todos los PNJ futuros.
- Ocho originales anteriores preservados, 24 parejas de overlays y una pareja de estaturas con el componente compartido `scripts/lib/visual-comparison.mjs`: clic reversible, teclado, zoom y fuentes/hashes en `capture-originals.json`. Overlays: 1280×720, cámara `(0,4,10)`, objetivo `(0,.85,0)`, ortográfica 3,8 y altura fija de muestra equivalente. Esa muestra aislada no se presenta como la estatura individual de campaña. Estaturas: cámara `(0,4,14)`, objetivo `(0,.9,0)`, tamaño 6,5, misma cuadrícula y miniaturas extraídas de la escena actual del Pecio.
- Tres capturas adicionales de efectos en el mapa actual del Pecio y una de la selección del DM. Son evidencia integrada actual, sin presentarlas como parejas alineadas. Selector real, persistencia por actor, tres opciones + recomendación y exclusión del refuerzo oculto comprobados.
- **690 comprobaciones de overlays/estatura por prototipo**, sin fallos, y regresión de **99** comprobaciones de PNJ y **2.354** del reproductor reejecutadas en Pecio. Las cifras anteriores de esta ficha permanecen como historial; no se reutilizan como acreditación de una ejecución nueva.

Repetir: `scripts/review-condition-overlays.ps1 -Project pecio|retiro|campamentos -Phase test`; `-Scene Integrated -Phase after` comprueba la mesa del Pecio; `-Scene Stature -Phase before|after` etiqueta capturas del código instalado, **no restaura código histórico**. Los antes originales del informe están preservados. Las capturas de opciones mantienen una altura fija de muestra por esa comparación, aunque cambie la calibración de juego.

La candidata nativa queda instalada y revisable. Los overlays web en marcha no se sustituyen por esta implementación de Godot. Aceptación artística, ajuste fino tras la elección del usuario, prueba física de mesa y medición sostenida de rendimiento siguen separados; no se declara una cifra de FPS nueva. No cierra M5/M7 ni red/guardado.
# Nitidez de la marcha y el vuelo

El usuario aprecia borrosidad en zombis y arpías al ampliar. Se inventariaron 19 atlas de ambas familias. Las láminas que sirven de base a la marcha y el vuelo contienen 64 figuras en aproximadamente 1250 × 1250 px. El recortador reubica los píxeles con `blit_rect`. La silueta del primer fotograma sureste mide 146 px en la marcha del zombi y 136 px en el vuelo de arpía. Los valores de los 19 atlas, originales y hashes constan en [el inventario](../../output/stormwreck-motion-detail/asset-review.json).

| Recurso | Propietario | Figura original por fase | Figura candidata por fase | Criterio |
| --- | --- | --- | --- | --- |
| `sw-zombie-walk-detail` | `characters/definitions/animations/sw-zombie-walk-detail.json` | `zombie-walk`, 144–151 px en el atlas | 412–432 px, 8 fases sureste | VA-03/10/14, REF-01 y referencia propia. Apoyo vertical constante en la prueba del ciclo. |
| `sw-harpy-fly-detail` | `characters/definitions/animations/sw-harpy-fly-detail.json` | `harpy-flight`, 105–150 px en el atlas | 343–386 px, 8 fases sureste | Alas completas y batido visible. La envolvente incluye las puntas elevadas. Comparten el clip la residente y el refuerzo C2. |

Se usaron referencias visuales propias del proyecto con ImageGen integrada. Las dos láminas efectivas tienen 1774 × 887 px, ocho poses en una cuadrícula de 4 × 2 y un recorte a tamaño nativo. La primera propuesta de vuelo invadía el margen en cuatro celdas y quedó fuera de la candidata. El importador filtra el alfa débil fuera del margen de la silueta, registra los pies de la marcha en una línea común y conserva la escala del dibujo. Arte, prompts, procedencia y rechazo quedan registrados. El visor alterna el primer fotograma de cada versión con cámara y escala de ficha iguales. El dibujo y la pose de inicio son nuevos. [Comparación y ciclos animados](../../output/stormwreck-motion-detail/index.html).

Godot Forward+ reprodujo ocho texturas y ocho renders distintos para cada uno de los tres actores y cerró los bucles en la primera fase. El servicio activa ambos clips por su ID. La prueba nativa de escarcha comprueba que el material recibe la textura actual en las ocho fases y se oculta al retirarlo. Los anclajes físicos de estas poses quedan para su revisión por fotograma. La escena real del Pecio verificó los tres perfiles y el refuerzo inicialmente oculto y sin colisión. La toma del zombi conserva la oclusión del casco. Esta prueba visual usa el render neutro para inspeccionar la marcha completa. El servidor de controles físicos no estuvo disponible durante la captura de la escena. 26 pruebas del pipeline y diez casos de servicio superados en esta candidata.

Los dos ciclos nuevos entran en la candidata local Godot de Pecio, Retiro y campamentos. La cobertura de este lote es sureste, con los clips anteriores como reserva de los demás rumbos. El resto de ataques, transiciones y variantes conserva recursos inventariados. La revisión artística del lote y la validación física siguen abiertas. [Informe nativo](../../output/stormwreck-motion-detail/native-proof.json).

## Marcha de los otros marineros y vuelo de espaldas

La segunda tanda añade cuatro ciclos de ocho poses a la biblioteca local. Los tres marineros alternan el paso en vista sureste. El de rayas conserva un pie descalzo, el del pañuelo mantiene su figura más robusta y el de la red conserva los flotadores y las manos violáceas. La arpía y su refuerzo reutilizan la vista norte, dibujada de espaldas con la porra en su mano izquierda y las alas completas durante el batido.

| ID de animación | Atlas anterior | Altura de los dibujos nuevos | Revisión |
| --- | --- | --- | --- |
| `sw-zombie-2-walk-detail` | `zombie-2-walk` | 399–417 px | Paso y ropa propios |
| `sw-zombie-3-walk-detail` | `zombie-3-walk` | 412–419 px | Pañuelo y hebillas conservados |
| `sw-zombie-4-walk-detail` | `zombie-4-walk` | 402–414 px | Red y flotadores integrados en la figura |
| `sw-harpy-fly-detail-n` | `harpy-flight` | 306–384 px | Vista dorsal con ocho posiciones de las alas |

Las definiciones viven en `prototypes/godot-shared/characters/definitions/animations/`. Los originales, hashes, recortes y prompts efectivos de ImageGen constan por ID en el inventario de la segunda tanda. VA-03/10/14 y REF-01 orientan la legibilidad a la escala del juego. Se movieron los cortes horizontales entre celdas de la arpía a bandas transparentes para preservar las puntas. La extracción conserva el pivote de la cuadrícula nominal y amplía el lienzo lo necesario para registrar los pies a resolución nativa. [Comparaciones y ciclos](../../output/stormwreck-motion-detail/expansion/index.html).

En Godot Forward+, los cinco actores recorren sus ocho fases con 40 renders en total y cero errores. Los cuatro ciclos tienen 32 dibujos propios. Las marchas pasan con la altura de ficha de 1,80 m y un rango de apoyo de hasta 4,35 mm. La arpía conserva su escala de 1,70 m y mueve las garras durante el vuelo. Se comprobó el seguimiento por la escarcha y su retirada en las ocho fases, más 26 pruebas del pipeline y diez casos del servicio. La primera captura de la tanda agotó su plazo. Se repitió con tiempo suficiente y con inicialización normal de las tres variantes para obtener la evidencia actual. [Prueba de la revisión](../../output/stormwreck-motion-detail/expansion/native-proof.json).

La candidata está instalada en Pecio, Retiro y campamentos. La escena real selecciona la marcha sureste del zombi principal y el vuelo norte de ambas arpías, con el refuerzo oculto al inicio. Los otros tres marineros se comprueban como fichas de la biblioteca de Godot en la escena de revisión. Quedan pendientes sus apariciones de campaña, los rumbos y gestos restantes, los anclajes físicos y la revisión artística del lote. [Prueba en Pecio](../../output/stormwreck-motion-detail/expansion/native-pecio.log).
