# Ficha de personaje medieval ilustrada en Godot — 16/11/2026

**Revisión vigente: refinamiento ilustrado con cinco pestañas e Inventario conectado a la misma mochila, según el nuevo encargo explícito.** [Capturas actuales, referencia y comparación](../../output/godot-character-sheet-v4-20261116/index.html). Las entregas anteriores se conservan como historial; la petición actual sustituye la exclusión de Inventario de la pasada anterior.

Encargo explícito: auditar y sustituir la ficha por una interfaz funcional cercana a las dos referencias adjuntas, con materiales ilustrados, sprite real animado, datos de cada personaje y mochila independiente. La especificación actual elige **Resumen · Combate · Conjuros · Historia**, más **Editar** para los campos permitidos. Prevalece sobre las etiquetas distintas del wireframe.

## Auditoría y fuentes

| Área | Fuente real / hallazgo | Integración |
| --- | --- | --- |
| Ficha anterior | `scripts/vtt_player_hud.gd`, `_build_sheet_modal` / `_rebuild_sheet_body`: ventana 720 × 540, listas, tres pestañas; la vista completa incluía equipo | Sustituida solo esa ficha; se conservan las demás ventanas y preferencias de inicio resumen/completa |
| Personajes | `scripts/vtt_campaign_data.gd`: identidad, nivel, seis puntuaciones, PG/CA/velocidad, acciones resumidas, rasgos y notas de Mia/Trinity/Mike | Adaptador de lectura por ID; ninguna cifra de Mia en componentes gráficos |
| Datos más completos | `combat/catalogue.json`, perfil `maria.sheet`, transcrito de la ficha heredada | Importa las 18 habilidades confirmadas, pericia, rasgos y narración; excluye el bloque de equipo |
| Combate y estados | `combat_controller.rules.actors`, acciones de `combat_catalogue.gd`, disponibilidad, recursos, concentración y salvaciones existentes | PG/estados y recursos proceden de la autoridad local; preparar delega al controlador y conserva el gasto para la resolución real |
| Dados | VTT local de dados físicos; cola `dm_requests` y arbitraje existentes | Atributos/habilidades/salvaciones abren consulta y envían una solicitud de d20 físico al DM; no se añade RNG ni una segunda autoridad |
| Sprite y apariencia | Token actual, `Sprite3D`, `char_profile`, transformaciones y capas de estados | Visor 3D transparente, de solo lectura; comparte las texturas/materiales actuales y refleja sus propiedades. No contiene otro actor ni reloj de animación propio |
| Pausa al abrir modales | `player_token.gd` retornaba antes de avanzar la animación al abrir cualquier ventana | La ficha bloquea desplazamiento y mantiene el render de pose original con `_process_pose_visuals`; al cerrar retira su marca. Inventario y ajustes conservan su pausa previa |
| Transparencia entre proyectos | Retiro y campamentos heredaban FSR/escala 0,85 del mapa y mostraban un rectángulo negro en el visor | Escala 1 y modo bilineal únicamente en el SubViewport de la ficha; se conserva el reescalado del escenario. La captura anterior del fallo se guarda en `source-before/retiro-opaque-preview.png` |
| Mochila | `inventory/backpack_panel.gd`, puente/sesión independientes | Sin rejilla, cantidades, peso ni gestión de mochila dentro de la ficha; comprobada la apertura/cierre independiente |
| Arte y fuentes | Materiales anteriores teal; familia de iconos local, SystemFont, sprites vigentes | Cuatro recursos ilustrados originales sin letras ni personajes: tres superficies y un atlas de doce grabados; tipografía del sistema. No se incorpora ninguna captura como fondo |

## Arte aplicado y propietarios

Referencias principales: las dos imágenes aportadas por el usuario el 16/11. La biblioteca moderna común se ha consultado como contexto de legibilidad 2.5D; no sustituye esta dirección específica. VA-01/02/03 para familia, contraste y escala; VA-10 para el personaje; VA-17/18 para integración y evidencia. No se modifican mapas, geometría, colisiones, navegación, luz de campaña ni prioridades locales M5/M7.

| ID / propietario | Recurso o valor anterior | Candidata / valores de uso | Referencia y aceptación |
| --- | --- | --- | --- |
| RPG-SHEET-PARCHMENT-01 · `character_sheet/skin.gd` | Panel teal de ThemeKit | `art/manuscript-frame.png`, pergamino y nogal/latón; nueve regiones con esquinas conservadas (origen 196 × 178, destino según componente) | Referencia artística del usuario; revisado integrado, aceptación del usuario pendiente |
| RPG-SHEET-RIBBON-01 · `skin.gd` | Títulos de texto sobre panel plano | `art/leather-ribbon.png`, cuero borgoña con madera/latón, origen 310 × 100; extremos 20 × 6 en cabeceras | Misma familia; texto nativo marfil por encima |
| RPG-SHEET-ALCOVE-01 · `character_sheet.gd` | Sin personaje central | `art/empty-alcove.png`, hornacina vacía; visor vivo superpuesto, proporciones del sprite real y filtrado nearest solo del personaje | No sustituye al héroe por la ilustración de Mia |
| RPG-SHEET-ICONS-01 · `skin.gd` | Glifos dispersos / sin iconos de atributos | `art/engraved-icons.png`, 12 grabados ilustrados propios, celdas 4 × 3, recorte transparente y alfa mínimo 32/255; tinta, acuarela y latón. Siluetas de código solo como reserva ante recurso ausente | Reposo/hover/pulsación/foco/deshabilitado; disponibilidad real al preparar |
| RPG-SHEET-TYPE-01 · `skin.gd` | Tipografía genérica de HUD | Georgia/Noto Serif para títulos; Palatino/Georgia para lectura; números 23 px, identidad 30 px | Sin binarios de fuentes redistribuidos |

Paleta de la candidata: pergamino crema/marfil, nogal `#493023`, latón `#b68a42`, borgoña `#642f32`, tinta `#30251c`. Los recursos raster no son texturas PBR del mundo: no tienen UV ni roughness. Dimensiones originales, SHA, procedencia y prompts completos en `character_sheet/asset-manifest.json` y `art-sources.json`. Generados mediante la herramienta integrada de imágenes; originales conservados. Las referencias se copian solo a la galería de estudio, fuera de los recursos del juego.

## Comportamiento y arquitectura

- Cabecera y cinco estadísticas permanecen fuera del desplazamiento. El resumen compone atributos, hornacina y acciones; debajo, habilidades/salvaciones, magia cuando existe y rasgos/trasfondo. Sin magia ni recursos se aprovecha el ancho con dos bloques, sin repetir rasgos.
- Navegación de detalle sin límite de cuatro conjuros ni de acciones. Las listas largas tienen desplazamiento; los detalles no recortan su descripción. Las pestañas con pocos datos reducen la altura de la ventana para evitar pergamino vacío. A 1280 × 720 se mantiene el tamaño de lectura y se desplaza el cuerpo; a 900 px se apilan los bloques. Revisado también a 1920 × 1080.
- Disponibilidad de acciones consultada al controlador: agotadas o fuera de turno se explican y deshabilitan. Consultar/preparar no gasta espacios ni aplica daño.
- Las actualizaciones se detectan mientras la ficha está abierta; el editor conserva el control activo al cambiar un valor. CA y velocidad se actualizan tanto en el registro como en combate.
- El DM abre la misma ficha desde **Jugadores → Ficha**, sin pasar al rol jugador. Se cierra antes de entrar en proyector. El selector de rol se oculta durante el modal y reaparece al cerrarlo.
- Se mantiene la apariencia real de Mia, incluidos sus sprites actuales; no se redibuja al personaje basándose en la referencia artística.

Archivos fuente compartidos en `prototypes/godot-shared/character_sheet/`: `character_sheet.gd`, `sheet_model.gd`, `live_actor_view.gd`, `skin.gd`, `test_character_sheet.gd`, manifiestos y `art/`. Instalados en `prototypes/godot-pecio`, `prototypes/godot-retiro` y `prototypes/godot-campamentos` con `scripts/sync-godot-character-sheet.mjs`. Hooks localizados en sus tres `vtt_player_hud.gd`, `vtt_dm_hud.gd` y `player_token.gd`. No se sobrescriben preferencias, grid, atlas o módulos de combate de otros trabajos.

## Validación de la candidata

**612 comprobaciones de ficha: 204 por prototipo, cero fallos.** Registros en `output/godot-character-sheet-20261116/test-{pecio,retiro,campamentos}.log`. Incluyen los tres personajes, ausencia de magia en Trinity, importación de competencias/pericia, seis salvaciones y 18 habilidades, PG temporales/actuales, espacios gastados y bloqueo por agotamiento, concentración, edición compartida de CA, datos explícitos de multiclase/subclase/especie, consultas/acciones reales, inmovilidad con reloj de idle activo, apariencia de solo lectura, independencia del reescalado del mapa, ajuste de altura de pestañas/detalles breves, 50 acciones añadidas como prueba no persistida, narración extensa, ventana 1280 × 720, acceso DM, privacidad en proyector y mochila independiente. Regresión de interfaces: **57 correctas / 0 fallos**; suite de sprites/animaciones de jugador y PNJ terminada con `ALL PLAYER & NPC SPRITES/ANIMATIONS VERIFIED`. Son pruebas actuales, no resultados históricos reutilizados.

Capturas **Forward+ reales** y revisión de composición en [galería](../../output/godot-character-sheet-20261116/index.html). Comparación anterior/después a 1600 × 1000 con mismo mapa C1, cámara, actor, 12:00 y despejado; superposición por clic/toque, teclado y ampliación mediante `scripts/lib/visual-comparison.mjs`. No se presenta la imagen artística como una comparación exacta. Renders adicionales a 1920 × 1080, 1280 × 720 y 900 × 1200. Las animaciones del mundo y del personaje pueden variar entre tomas. Originales y hashes en `originals.json`; fuente anterior conservada en `source-before/`.

Estados: **construido, comprobado técnicamente y revisado visualmente en Godot**. Aceptación artística del usuario, pruebas físicas y rendimiento sostenido siguen separados; no se deducen por el número de tests.

La apertura automatizada del HTML local en el navegador integrado fue rechazada por su política de protocolos. No se eludió el bloqueo. La revisión de las imágenes se realizó directamente sobre los PNG de Godot; el informe estático queda entregado para apertura local por el usuario. No se declara verificada su interacción en navegador durante esta entrega.

## Datos incompletos y límites explícitos

- Mia y Mike no tienen todas sus competencias registradas en las fuentes nativas actuales. Se identifica el modificador base y se marca `?` hasta confirmar competencia, en vez de inventarla a partir de la imagen. Trinity sí tiene los totales confirmados. Las reglas de modificador y competencia se contrastaron con las [reglas básicas oficiales](https://www.dndbeyond.com/sources/dnd/br-2024/playing-the-game); no se concedieron rasgos nuevos ni se cambió la edición de los personajes.
- Algunos conjuros/rasgos solo tienen mecánica resumida o guía del DM. La consulta muestra todo lo registrado y avisa cuando falta descripción ampliada. Admite descripción, nivel, preparación, duración y característica de lanzamiento cuando consten en el personaje; no supone esos datos por su nombre de clase.
- Editar conserva los campos que el VTT permitía (CA, velocidad y gestión existente de PG), no crea un editor total de fichas ni permisos nuevos.
- Integración local en Godot: no añade red, cuentas ni guardado de campaña web. No cambia escenarios ni cierra su revisión artística/física.

## Segunda revisión — ventana recogida, mochila y presentación personal

Encargo posterior de ocho puntos: conservar parte del juego visible, integrar inventario como pestaña, acercar más la composición a la referencia, plataforma/fondo animado por personaje, retratos individuales, iconos, fuentes y cenefas. La incorporación de mochila **sustituye expresamente** la separación de la primera entrega; se reutiliza el mismo panel y puente de inventario, sin crear cantidades ni una segunda bolsa.

### Implementación y registro visual

| ID / propietario | Recurso o valor anterior | Candidata integrada | Referencia / aceptación |
| --- | --- | --- | --- |
| RPG-SHEET-V2-WINDOW · `character_sheet.gd`, HUD jugador | Modal casi completo y velo oscuro | Máximo 1180 × 820 y 82 % de cada eje; velo 0,20; pestañas breves adaptan altura, contenido largo con scroll interno | Petición 1; captura nativa revisada, aceptación artística pendiente |
| RPG-SHEET-V2-BAG · `inventory/backpack_panel.gd` | Ventana independiente teal | Pestaña Mochila, rejilla + inspección, búsqueda, filtros y cantidades existentes; mismo pergamino y marco | Petición 2, VA-01/VA-17: familia común y acabado dentro de la aplicación; no duplica inventario |
| RPG-SHEET-V2-MIA-{PORTRAIT,STAGE} · `presentation.gd` | Recorte de sprite y hornacina genérica | `art/v2/mia-portrait.png`, `mia-stage.png`; capilla de piedra y destellos cálidos; conserva barba/atuendo del sprite actual | Referencia adjunta y aspecto real de Mia; sin sustituirlo por el retrato femenino de estudio |
| RPG-SHEET-V2-MARIA-{PORTRAIT,STAGE} · `presentation.gd` | Recorte de sprite y hornacina genérica | `maria-portrait.png`, `maria-stage.png`; adoquines, arquitectura urbana y hojas animadas | Identidad y trasfondo registrados de Trinity; interpretación decorativa, sin añadir hechos canónicos |
| RPG-SHEET-V2-MIKE-{PORTRAIT,STAGE} · `presentation.gd` | Recorte de sprite y hornacina genérica | `mike-portrait.png`, `mike-stage.png`; biblioteca élfica, plataforma azul y luces arcanas | Identidad de Mike; decorado de ficha, sin alterar el escenario |
| RPG-SHEET-V2-ICONS · `skin.gd` | Atlas anterior de 12 grabados | `art/v2/icons-v2.png`: 24 ilustraciones adicionales de mochila, monedas, consumibles, armas, equipo y magia; recorte alfa y mipmaps en ejecución | Petición 6, misma familia de manuscrito; no se inventan reglas |
| RPG-SHEET-V2-FONTS · `skin.gd` | Fuentes instaladas Georgia/Palatino | Cinzel 600 y Crimson Pro 500 incluidas, soporte de acentos y licencias SIL OFL 1.1 | Petición 7; títulos y lectura separados |
| RPG-SHEET-V2-PANEL · `skin.gd` | Marco genérico reutilizado | `art/v2/ornate-panel.png`, cenefas de hojas y latón; nueve regiones (origen 280 × 240), márgenes protegen las esquinas | Petición 8 y referencia artística adjunta |

Las texturas son materiales de interfaz, no PBR del mundo: no modifican UV, roughness, colisiones, escala o navegación. Los fondos son imágenes vacías con el visor del actor real superpuesto; los elementos móviles son controles nativos decorativos, respetan movimiento reducido y se detienen al ocultarse. El visor conserva la transparencia independiente del reescalado del mapa. Retratos en medallón disponibles también en selección de personaje y tarjetas del DM, con sustitución mediante metadato de apariencia cuando exista.

La mochila se reubica dentro de la pestaña y se devuelve a su propietario al salir. **Cambiar de pestaña no termina la sesión ni reproduce las acciones. Cerrar la ficha empieza la reproducción pendiente**, igual que el contrato previo de cerrar la mochila. Se conservan consulta, filtros, edición permitida, cantidades y controlador de acciones existentes. El actor no se desplaza mientras la ficha está abierta y su reposo real continúa.

Fuentes actuales: `character_sheet/{character_sheet,presentation,skin,test_character_sheet,capture_v2}.gd`, `inventory/backpack_panel.gd`, `dm_style/appearance.gd`; ajustes localizados de integración en los tres `scripts/vtt_player_hud.gd`. Distribución con `scripts/sync-godot-character-sheet.mjs`, que copia únicamente los módulos autorizados. Los demás sistemas de los otros chats se conservan.

### Validación y procedencia de esta revisión

**761 comprobaciones actuales, cero fallos:** ficha 128 por prototipo (384), mochila Pecio 159/Retiro 161 (320), interfaces Pecio 57. Resultados nuevos por suite/prototipo en [validation.json](../../output/godot-character-sheet-v2-20261116/validation.json), con sus registros individuales. La suite actual sustituye las comprobaciones de ausencia de inventario por integración, sesión persistente entre pestañas, reproducción solo al cerrar y conservación del stock; añade tipografía, acentos, los 24 iconos, tres retratos/fondos diferentes, efectos nativos, tamaño de ventana y legibilidad exterior. La observación de la textura reflejada se sincroniza dentro del mismo avance de imagen, evitando comparar dos instantes de reposo distintos.

Doce capturas actuales Forward+ a 1600 × 900, 1280 × 720 y 1920 × 1080. [Informe actual](../../output/godot-character-sheet-v2-20261116/index.html), generado por `scripts/build-godot-character-sheet-v2-review.mjs`. Antes/después a 1600 × 900: entrega anterior `pecio-native.png` conservada sin modificar y nueva ficha Mia, misma cámara, escena C1, actor, mediodía y despejado. Superposición, etiqueta, teclado y ampliación con el componente común; fases de reposo/agua/fuego pueden variar. El antes de mochila a 1600 × 1000 es solo documental y **no se superpone** sobre una toma de otra resolución.

Prompts completos y originales de los ocho recursos nuevos en `character_sheet/art/v2/sources.json`; enlazados desde `art-sources.json` y reunidos con dimensiones/SHA en `asset-manifest.json`. Dos fuentes con procedencia y licencia incluidas en `character_sheet/fonts/`. Originales de capturas y fuentes previas registrados en `originals.json` del informe. Las imágenes de referencia son material de estudio fuera de los recursos del juego.

Capturas nativas revisadas y archivos del informe comprobados; no se declara revalidada la interacción del HTML en navegador ni la ejecución en dispositivos físicos. Aceptación artística del usuario y rendimiento sostenido permanecen separados. Continúan los límites de datos de Mia/Mike indicados arriba.

## Tercera revisión — auditoría integral y refinamiento 16:9

Encargo completo en el texto adjunto del 16/11: auditar, implementar y refinar mediante capturas sucesivas. La referencia artística es la lámina ilustrada; `Downloads/mia.png` es el estado real anterior. El documento intercambia sus números, por lo que se identifican por contenido. **Esta petición elimina expresamente la pestaña Mochila y conserva su ventana independiente**, sustituyendo la instrucción de la segunda entrega. No se ha creado otra escena o lógica de personaje.

### Auditoría antes de modificar

| Sistema / propietario encontrado | Funcionaba | Corrección de esta entrega |
| --- | --- | --- |
| `character_sheet.gd`, árbol construido con controles | Acceso desde jugador y DM, privacidad del proyector, pestañas, consultas, edición permitida | HFlow de seis pestañas, retrato/cabecera y márgenes dejaban los bloques inferiores fuera. Cuatro pestañas en HBox, edición/cierre externos y dos filas adaptativas del Resumen |
| `sheet_model.gd`, campaña `scripts/vtt_campaign_data.gd`, `combat/catalogue.json` | Identidad, atributos, habilidades de Trinity, recursos y estados reales | Adaptador de columnas de acción; categorías de magia sin asumir preparación, enlace de alias Proyectil/Misil mágico, deduplicación y agrupación de rasgos legados |
| `skin.gd`, `art/`, `fonts/`, `presentation.gd` | Pergamino/nogal, retratos y tres escenarios propios con motas animadas | Exceso de nueve parches pesados por componente y Cinzel en el nombre. Nuevo estilo **limitado a la ficha** en `sheet_widgets.gd`; Crimson Pro 700/650 para caja normal y jerarquía editorial |
| `live_actor_view.gd`, `player_token.gd`, catálogo de sprites/equipo/overlays | Reflejo de solo lectura, reposo original activo, transparencia separada del FSR del mapa | Conservados; ajuste local de cámara del visor para encajar el personaje sobre la plataforma. No crea un AnimationPlayer ni actor paralelo |
| Atributos, habilidades y salvaciones | Modificadores, 18 habilidades y seis salvaciones, dados físicos enviados al DM | Filas uniformes con insignia, listas locales, orden por total, las seis salvaciones visibles, ampliación completa y detalle de otras bonificaciones registradas |
| Ataques/conjuros/controlador | Preparación, objetivos, resolución, gasto, reacciones y concentración | Columnas legibles y detalle del contrato de objetivo; disponibilidad tomada de `rules.availability`. Un recurso agotado impide preparar, conservando la consulta |
| Inventario y animaciones diferidas | Mismo puente, cantidades y cola de sacar/guardar | HUD abre de nuevo el panel independiente con sus controles y sesión. Cerrar la mochila reproduce la cola, sin duplicarla dentro de la ficha |
| Escalado y desplazamiento | Scroll general para contenido extenso | Resumen de escritorio sin scroll general; listas extensas y detalles con scroll localizado. Páginas extensas de combate/historia mantienen desplazamiento; formato estrecho apila contenedores |

Árbol actual: `CharacterSheetHost → CharacterSheetModal → VBox` con cabecera (medallón, nombre/nivel/identidad/estados, navegación, edición y cierre), `HBox` de estadísticas y `SheetScroll → VBox → SummaryTop/SummaryBottom`. Arriba: atributos, visor real y tabla de acciones. Abajo: habilidades + seis salvaciones, magia o recursos/estados, rasgos + trasfondo. El detalle es un control superpuesto con su propio desplazamiento. En escritorio, el contenedor exterior de Resumen tiene el desplazamiento vertical desactivado.

### Registro de refinamiento visual y funcional

| ID / archivo propietario | Anterior → candidata | VA / referencia y aceptación |
| --- | --- | --- |
| RPG-SHEET-V3-COMPOSITION · `summary_composer.gd`, `character_sheet.gd` | 1180 × 738 y bloques inferiores cortados → objetivo 1420 × 792 en 1600 × 900, márgenes de juego visibles, tres bloques inferiores completos | Referencia adjunta reinterpretada para 16:9; VA-17/18. Composición comprobada dentro del motor; aceptación del usuario separada |
| RPG-SHEET-V3-WIDGETS · `sheet_widgets.gd` | Marco dorado grueso por fila → pergamino continuo, líneas de tinta, esquinas finas, cartelas con forma y textura del cuero existente | VA-01/17 y petición de menos cuadrícula. Conserva el marco exterior y concentra ornamento en títulos/insignias |
| RPG-SHEET-V3-TYPOGRAPHY · `sheet_widgets.gd` | Nombre en versales de Cinzel → «Mia» con Crimson Pro 700; cabeceras 650 y lectura 500 | Fuentes originales ya incluidas y licencia OFL conservada; sin modificar binarios ni otros temas del VTT |
| RPG-SHEET-V3-STATS · `character_sheet.gd`, `sheet_widgets.gd` | Cifras pequeñas e iconos poco claros → corazón reconocible, barra proporcional, PG temporales, escudo de CA con cifra central, unidades con coma, bonificadores | Datos reales, sin importar números de la referencia |
| RPG-SHEET-V3-ACTIONS · `sheet_model.gd`, `summary_composer.gd` | Cadena comprimida de resumen → campos estructurados de tipo, alcance, ataque/CD, efecto, usos; duración/objetivo en consulta | Reutiliza catálogo y `action_targeting.gd`; no inventa daño o efectos para llenar columnas |
| RPG-SHEET-V3-DETAILS · `sheet_model.gd`, `character_sheet.gd` | Lista única de magia y rasgos repetidos → trucos/preparados/conocidos/repertorio separados, espacios actuales, agrupación de rasgos y deduplicación de explicaciones legadas | Los estados preparado/conocido y subclases/dotes solo aparecen cuando constan; no se deducen de la clase |
| RPG-SHEET-V3-INK · `sheet_widgets.gd` | Sin viñeta secundaria → montaña y pequeña fortaleza a tinta en zona reservada del pie | Dibujo propio nativo, decorativo y separado del texto; no añade un lugar a la campaña |

Los recursos anteriores de pergamino, cuero, retratos y escenarios se reutilizan. Los nuevos símbolos, medallones de modificador, escudo y filigranas son dibujo nativo escalable; no se ha añadido una captura como interfaz ni texto generado dentro de una textura. Registro de propietarios/derivación en `character_sheet/art/v3/sources.json`, enlazado desde `art-sources.json`; manifiesto combinado con SHA actuales. La paleta conserva la familia marfil/nogal/latón/borgoña/tinta. No modifica materiales PBR, UV, roughness, escenario, colisiones, escala canónica o narrativa.

### Capturas, iteraciones y pruebas actuales

Primera inspección: visibles los tres bloques inferiores, pero el nombre recibía anchura cero y las pestañas heredaban toda la altura de cabecera. Se corrigieron ambos con mínimos de texto y alineación de contenedor. También se redujeron mínimos interiores en 1280 × 720, donde la primera candidata excedía el borde inferior. Segundo pase: revisión de nombre, navegación, sprite sobre plataforma y márgenes. Pase final: cuatro filas completas de acciones en escritorio menor, habilidades ordenadas por total, recursos/munición/estados para el personaje sin magia, eliminación de rasgos legados repetidos y prueba visual de PG/recursos/condiciones. Las tomas intermedias válidas se conservan en `iterations/`.

**984 comprobaciones actuales sin fallos:** ficha 161 por prototipo (483); mochila Pecio 159/Retiro 161 (320); reglas de combate 124; interfaces 57. [Resultados exactos](../../output/godot-character-sheet-v3-20261116/validation.json) y registros junto al informe. Incluyen geometría y márgenes en 1600 × 900/1280 × 720, seis salvaciones visibles, ausencia de pestaña Mochila, cuatro pestañas en una fila, nombre en su caja real, barra de PG, cambio de característica y dado físico, recursos agotados, separación de trucos, pericia/otros bonificadores, 50 acciones, rasgos extensos, privacidad del proyector y apariencia/idle reflejados. La regresión del inventario verifica cantidades y reproducción al cerrar; la de combate conserva resolución, recursos, concentración y estados.

La inspección final de Mike detectó un `attackBonus=0` de reserva en Manos ardientes: al ser una resolución guiada no representa un ataque. Ahora la ficha lo muestra como **Guiado**, mientras la consulta conserva el texto de salvación registrado. El adaptador recoge CD/ataque de conjuro únicamente si los valores registrados del propio personaje son consistentes, sin calcularlos por su clase ni alterar la lógica de área. Pruebas específicas verifican CD 13 y ataque +5 de Mike y la ausencia de ese falso +0.

Trece capturas actuales Forward+ a 1600 × 900, 1280 × 720 y 1920 × 1080, incluyendo Mia, Trinity, Mike, detalle, pestañas, DM, mochila independiente y estado dinámico. En la toma dinámica se simulan 7/11 PG, 3 temporales, un espacio de nivel 1 restante, Bendición activa y envenenamiento; el estado de prueba se restaura antes de seguir. No se persiste como una partida real.

[Informe visual vigente](../../output/godot-character-sheet-v3-20261116/index.html): comparación superpuesta entre el `mia.png` aportado y la candidata, 1600 × 900, mismo actor, cámara inicial, C1, mediodía y despejado; fases de animación variables. Se reutiliza `scripts/lib/visual-comparison.mjs` para clic/toque, etiqueta, teclado y ampliación conservando zoom/desplazamiento. La referencia artística aparece aparte, con sus proporciones originales; no se presenta como un antes equivalente. Hashes, condiciones y fuentes previas en `originals.json`; medidas nativas en `layout.json`.

Los datos ausentes de las fuentes —competencias de Mia/Mike, preparación y descripciones estructuradas completas de algunos conjuros— siguen identificados sin inventarse. Para efectos guiados se conserva la consulta del texto registrado y el controlador real. Capturas revisadas dentro del motor y archivos del informe comprobados; interacción del HTML en navegador, dispositivos físicos, rendimiento sostenido y aceptación artística del usuario permanecen separados.

## Refinamiento ilustrado e Inventario integrado — pasada V4 conservada

Se conserva la distribución 16:9, el arco, las plataformas personales, los retratos, las reglas y el visor de solo lectura. El nuevo texto solicita expresamente **Resumen · Combate · Conjuros · Inventario · Historia**, presentes también en el personaje sin magia. Editar y cerrar siguen en el marco. La ficha usa la misma mochila del VTT; su presentación externa sigue disponible.

### Auditoría y correcciones

| Hallazgo en la candidata anterior | Corrección y propietario |
| --- | --- |
| Pictogramas planos, cinco cajas de estadísticas y títulos casi idénticos | Cinco materiales originales nuevos; `illuminated_materials.gd` extrae regiones y conserva extremos mediante nueve parches; `sheet_widgets.gd` compone cartelas, escudos, medallones, iconos y pies ilustrados |
| Interrogantes delante de Medicina/Percepción/Perspicacia | No eran glifos ausentes: `Model.rank=-1` señalaba datos de competencia que no constan en los perfiles nativos de Mia/Mike. Se auditaron campaña, catálogo y fuentes de proyecto. Se conserva esa distinción mediante sello **Sin registrar** y leyenda, separada de Sin competencia/Competencia/Pericia. No se inventa entrenamiento ni se cambia el total |
| `Auto.`, `Guiado`, `Consultar` y `2/2` sin contexto | `sheet_model.gd` proyecta salvación/CD desde los campos o descripciones registrados; muestra Curación/Sin d20 cuando corresponde, el efecto real de la ficha, número de impactos y reserva **Nv.1** como espacio de conjuro. El detalle identifica coste, objetivo y reserva; la ejecución continúa en el controlador |
| Bendición sin efecto visible, Manos ardientes como guía genérica, Misil mágico con un único dado visible | Se aprovechan el +1d4 registrado en la ficha, DES CD 13 de la guía y `attackCount=3` del catálogo. No cambian acciones, salvaciones, daño o resoluciones del motor |
| Mochila fuera de la ficha | Se reutiliza **la misma instancia** de `BackpackPanel`, reubicada/restilizada para Inventario y restaurada para el acceso externo; misma `InventoryBridge` y mismas existencias. No se crea una segunda base ni otro inventario |
| Estado `equipped` solo actualizado para antorchas; el mapa de mano se podía sobrescribir al guardar la antorcha | En `inventory_bridge.gd`, la reproducción actualiza el dato compartido para todos los objetos y mantiene la antorcha independiente de la referencia de mano de otros objetos. Se conservan animaciones y cantidades |
| Listas inferiores simples y barras grises | Filas reutilizables de habilidad con sello, atributo y total alineado; salvaciones separadas. CD/ataque de conjuro ilustrados, espacios disponibles/gastados, filas de magia con icono, rasgos/historia en dos columnas, paisaje de acuarela y desplazamientos de pergamino/latón |
| Ventanas con mínimo mayor que el objetivo podían centrarse usando el tamaño previo | Se centra el tamaño real resultante y se habilita desplazamiento intencionado en alturas insuficientes. El Resumen de 1600 × 900 conserva sus tres bloques inferiores sin scroll general |

Cambiar de pestaña o transferir entre la ficha y la mochila externa conserva la sesión y sus acciones preparadas. **Cerrar termina la sesión y reproduce sacar/guardar.** La selección, búsqueda y estado se conservan al cambiar de presentación. Una firma ligera de existencias detecta cambios externos; no contiene otra copia de objetos. Las pruebas verifican altas, cambios de cantidad que representan consumo externo, eliminación y equipar/desequipar en ambas vistas.

La interfaz embebida utiliza pergamino, ranuras ilustradas, selección borgoña y descripciones legibles. Fuera de la ficha se restaura el estilo y los controles previos. El visor conserva las texturas, orientación, equipo y capas visuales soportadas del actor original; el último reescalado del SubViewport usa nearest para mantener el pixel-art. No se ha añadido un actor o AnimationPlayer paralelo ni modificado el escenario.

### Registro de materiales

| ID / archivo | Valor anterior → candidato / propietario | Referencia y estado |
| --- | --- | --- |
| RPG-SHEET-V4-STAT-PLATE · `art/v4/stat-plate.png` | Superficie nativa plana → cartela de pergamino, nogal y latón con extremos tallados; estadísticas y ranuras de Inventario | Lámina del usuario, VA-01/17; muestra integrada revisada, aceptación artística pendiente |
| RPG-SHEET-V4-ORNAMENTS · `ornaments.png` | Anillo/escudo/insignia de trazo plano → atlas de seis adornos con aro vegetal, escudo y medallón; `presentation.gd`, `sheet_widgets.gd` | Misma familia de materiales; centro del aro transparente, fuente original conservada |
| RPG-SHEET-V4-ILLUSTRATED-ICONS · `illustrated-icons.png` | Ocho pictogramas de relleno simple → quince iconos pintados para estadísticas, atributos, magia y categorías | Atlas 5 × 3, extracción alfa y mipmaps; reutiliza el resto de los iconos ya existentes |
| RPG-SHEET-V4-RIBBONS · `ribbons.png` | Una cinta burgundy repetida → tres cartelas de cuero, pergamino y nogal; identidad, navegación y títulos secundarios | Atlas 1 × 3 y nueve parches, sin letras incrustadas ni deformar los extremos |
| RPG-SHEET-V4-LANDSCAPE · `landscape.png` | Boceto geométrico del pie → paisaje secundario de montaña/fortaleza a tinta y acuarela | Decoración en zona reservada, sin añadir lugar o historia canónicos |

Originales generados conservados en `.codex/generated_images`; copias de producción en el módulo compartido. Prompts completos, autores/derivación y límites en `art/v4/sources.json`, enlazado desde `art-sources.json`; dimensiones y SHA en `asset-manifest.json`. Los cinco PNG son componentes independientes; ningún dato del personaje está incrustado en ellos. La referencia de usuario sigue fuera de los recursos del juego. Se reutilizan Crimson Pro, sus pesos editoriales y las licencias ya incluidas. Los materiales de interfaz no modifican PBR, UV, roughness, mapas, colisiones o navegación.

### Reglas y datos

Se contrastaron [conjuros y espacios de 2024](https://www.dndbeyond.com/sources/dnd/br-2024/spells) y las [descripciones oficiales](https://www.dndbeyond.com/sources/dnd/br-2024/spell-descriptions). Se mantiene la curación 2d4 de Palabra de curación ya registrada para Mia; la referencia artística no impone valores. Trinity conserva los rasgos de su ficha heredada, compatibles con la [referencia de especies de 2014](https://www.dndbeyond.com/sources/dnd/basic-rules-2014/races). No se uniforman las fichas a una edición distinta.

Trucos, preparados, conocidos y repertorio sin preparación registrada se separan con datos existentes. Los trucos no cuentan como preparados ni consumen espacios. Los campos ausentes de competencia/preparación siguen identificados. El componente nativo auditado dispone de añadir, sacar/guardar y sus datos de objetos; no contiene una regla de carga ni resolución automática de consumibles. La integración conserva sus operaciones y refleja cualquier cambio de existencias recibido por el juego, sin inventar peso o curación automática.

### Iteraciones y comprobaciones de esta candidata

La primera captura detectó cartelas nuevas dibujadas sobre el texto de los botones; se pasaron detrás del control y se preservaron sus estados. Se ajustaron márgenes de la placa de identidad. La revisión de Inventario detectó ranuras con anchuras distintas y botones de sacar/guardar cortados: se igualaron expansiones y se reservó la anchura del texto actualizado. Se verificaron las correcciones en nuevas capturas, incluyendo antorcha equipada y estado dinámico en 1366 × 768. Tomas intermedias en `iterations/`.

La revisión de las páginas completas fijó también la altura de los medallones en Combate para evitar estirarlos con la fila y aplicó iconos e indicadores ilustrados de CD/ataque al repertorio completo. Nuevas capturas de ambas páginas verifican esos ajustes de presentación; las reglas e interacciones no cambian.

**1.209 comprobaciones actuales sin fallos:** ficha 236 por prototipo (708), mochila Pecio 159/Retiro 161 (320), reglas de combate 124 e interfaces 57. Las pruebas nuevas incluyen cinco pestañas, dieciocho habilidades con sellos, pericia/bonificaciones, muchos conjuros y cincuenta acciones, rasgos extensos, PG/recursos/estados, edición/dados físicos, espejo de apariencia/idle, privacidad y sincronía de inventario. Se comprueba el mismo ID de instancia de mochila al entrar/salir, acciones pendientes, altas, cambio externo de cantidades, eliminación, equipar y desequipar sin consumir stock.

Dieciséis capturas actuales Forward+ en 1600 × 900, 1920 × 1080 y 1366 × 768: [galería de las cinco pestañas, referencia y antes/después](../../output/godot-character-sheet-v4-20261116/index.html). Incluye Mia, Trinity, Mike, estados, antorcha, mochila externa, detalle y DM. Comparación exacta de UI con la entrega nativa anterior, mismo C1, cámara inicial, actor, mediodía y despejado; las fases de animación pueden variar. La referencia artística se presenta aparte. El componente común de comparación conserva clic/toque, etiqueta, teclado, ampliación, zoom y desplazamiento.

[Pruebas](../../output/godot-character-sheet-v4-20261116/validation.json), [originales/iteraciones](../../output/godot-character-sheet-v4-20261116/originals.json) y [medidas nativas](../../output/godot-character-sheet-v4-20261116/layout.json). Fuentes actuales distribuidas a los tres prototipos con `scripts/sync-godot-character-sheet.mjs`, incluyendo los dos archivos concretos de inventario modificados. Capturas revisadas en Godot; verificación estática del informe. Interacción del HTML en navegador, dispositivos físicos, rendimiento sostenido y aceptación artística del usuario permanecen separados. Se conservan los cambios de los demás chats.

## Auditoría y correcciones V6 — pasada anterior del 17/11/2026

Se continúa la ficha existente y la guía de doce mejoras. La [candidata V5](../../output/godot-character-sheet-v5-20261117/index.html) queda como antecedente; la [galería vigente V6](../../output/godot-character-sheet-v6-20261117/index.html) incluye las cinco pestañas, los tres personajes, las tres resoluciones, detalle con reserva disponible/agotada y personaje sin magia. No se sustituye el escenario, el sistema de combate ni el actor.

### Fallos reproducidos y correcciones

El registro [reproduced.log](../../output/godot-character-sheet-v6-20261117/reproduced.log) acredita **cinco fallos antes de corregirlos**. Se conservan esas pruebas, además de comprobar restauración de disponibilidad, controles de inventario visibles, anchura útil de los rasgos y centrado del detalle.

| ID / componente | Propietario | Antes → candidata | Referencia / estado |
| --- | --- | --- | --- |
| SHEET-AUD-01 · detalle de acción | `character_sheet.gd` | Disponibilidad congelada al abrir → actualiza reserva, coste y botón desde el estado real; conserva desplazamiento/foco. | Guía 7/9, VA-17; revisión técnica y visual actual en la galería. |
| SHEET-AUD-02 · cambio de personaje | `character_sheet.gd` | Detalle del actor anterior visible → se descarta al cambiar de actor. | Guía dinámica, VA-17; sin cambio de reglas. |
| SHEET-AUD-03 · área personal | `sheet_model.gd` | “Personal” ocultaba el radio → muestra el radio del contrato compartido; Detectar magia conserva sus 9 m. | Guía 7/9; geometría de `combat/action_targeting.gd` intacta. |
| SHEET-AUD-04 · repertorio | `character_sheet.gd` | 763 px de contenido y un segundo panel de rasgos → resumen en una fila, tarjetas compactas y rasgos legibles al pie. | Guía 9/10; reserva explícita, preparación ausente no inventada. |
| SHEET-AUD-05 · salvaciones | `character_sheet.gd` | Un valor base ausente se trataba como confirmado → pide confirmar la competencia igual que Resumen. | Guía 8; sin inventar datos. |
| SHEET-AUD-06 · mochila | `character_sheet.gd` | Siempre al máximo → tamaño adaptable para bolsas pequeñas, con altura útil que mantiene Sacar/Guardar visibles; bolsas grandes conservan espacio. | Guía 11, VA-14; misma instancia y sesión. |
| SHEET-AUD-07 · navegación | `illuminated_materials.gd` | Selección poco distinguible → estado nativo, línea de oro de 2 px y remate de 4 px, color `#f1cd7e`. | Guía 3; mismas texturas V4. |
| SHEET-AUD-08 · estados | `sheet_model.gd`, `summary_composer.gd` | Identificadores internos visibles → nombres españoles coherentes; identificadores mecánicos intactos. | Guía 8/9; adaptación de presentación. |
| SHEET-AUD-09 · ventana de detalle | `character_sheet.gd` | Fondo translúcido que mezclaba textos y centro desplazado 22 px → pergamino opaco, sombra, velo local y centrado respecto al contenedor real. | Guía 2/3/7, VA-14/18; captura real del defecto y la corrección conservadas. |

### Iteración visual y reutilización

Las primeras capturas de esta auditoría descubrieron botones de rasgos sin anchura útil, una mochila reducida que escondía sus controles y el detalle transparente. Las iteraciones se conservan en `output/godot-character-sheet-v6-20261117/iterations/`; se corrigieron después de ver el render, sin presentar la primera pasada como terminada.

No se crean sprites ni piezas de equipo. Se han consultado el pipeline, las definiciones y anatomías existentes; se reutilizan los retratos, atlas, animación, máscara de ventana y materiales registrados. No se modifica la anatomía, la escala física ni una máscara de reemplazo corporal, ni se promueve la candidata modular de otro trabajo. [Registro de recursos/cambios](../../prototypes/godot-shared/character_sheet/art/v6/sources.json), [manifiesto](../../prototypes/godot-shared/character_sheet/asset-manifest.json) y validación actual del pipeline en la galería.

### Archivos y comprobación

**Validación final V6: 818 comprobaciones actuales, cero fallos**: 268 de ficha por cada uno de los tres prototipos y 14 casos del pipeline. Veintisiete capturas actuales Forward+; revisión de las cinco pestañas a 1366 × 768, 1600 × 900 y 1920 × 1080. Las cifras V4/V5 acreditan sus pasadas históricas y no se suman a esta candidata.

Fuente común: `prototypes/godot-shared/character_sheet/character_sheet.gd`, `sheet_model.gd`, `summary_composer.gd`, `illuminated_materials.gd`, `test_character_sheet.gd` y `capture_v6.gd`. Copias instaladas mediante el sincronizador existente en Pecio, Retiro y campamentos. El inventario conserva su componente, fuente de cantidades y acciones diferidas; esta auditoría ajusta su alojamiento.

[Resultados actuales](../../output/godot-character-sheet-v6-20261117/validation.json), [medidas](../../output/godot-character-sheet-v6-20261117/layout.json), [originales y hashes](../../output/godot-character-sheet-v6-20261117/originals.json) y [estado de las doce mejoras](../../output/godot-character-sheet-v6-20261117/twelve-improvements.json). Antes/después de V5 con el componente común: mismo personaje, cámara inicial, hora, clima y resolución; fases de reposo, agua y fuego pueden variar. Referencia artística aparte. Las capturas de cambio de reserva representan estados de prueba distintos y están identificadas.

Se ejecuta sobre un perfil aislado, sin tocar partidas de la mesa. Las tres resoluciones tienen las cinco pestañas; las páginas largas conservan desplazamiento interior. El consumo automático y las transferencias entre inventarios personales siguen sin motor nativo; no se añaden reglas para simularlos. Revisión visual de capturas, pruebas técnicas, aceptación del usuario y dispositivos físicos tienen estados separados. El informe HTML tiene comprobación estática; su interacción en navegador no se ha revalidado en esta sesión.

## Dos bloques de acabado: vida y cabecera — 17/11/2026

Petición posterior expresa: corregir puntos de golpe; cabecera con foto, nombre, clase, nivel y pestañas. La guía comparativa y el recorte de vida del usuario son referencias artísticas. Esta pasada no declara completado el resto de la ficha.

| ID | Propietario | Anterior → candidata | Criterio / aceptación |
| --- | --- | --- | --- |
| SHEET-HP-07 | `hp_finish.gd`, `character_sheet.gd`, `art/v7/royal-controls.png` | Rectángulo granate sobre una placa genérica → placa ilustrada con cuero rojo sombreado y marco dorado en una misma pieza; barra roja con relieve dentro de los márgenes, texto centrado y corazón dorado. | Referencia PG, VA-01/03/14; pendiente aceptación del usuario. |
| SHEET-IDENTITY-07 | `character_sheet.gd`, `header_finish.gd`, `presentation.gd` | Retrato alejado y nombre con área sobrante → encuadre facial del retrato existente, medallón 116/96 px, nombre destacado, clase y nivel agrupados sobre cartela. | Guía 1/3/4, VA-14/18; no cambia la identidad del actor ni su bitmap. |
| SHEET-TABS-07 | `header_finish.gd`, `character_sheet.gd` | Cinco cartelas separadas → banda de pestañas contiguas, estado activo granate elevado, relieve dorado, foco de teclado y texto nativo. | Guía 3, VA-14/18; navegación existente conservada. |

Un atlas UI nuevo de cuatro regiones creado con la herramienta integrada `image_gen`. [Original, prompt y alcance](../../prototypes/godot-shared/character_sheet/art/v7/sources.json). Los recortes alfa se calculan en Godot; no se recorta una captura comercial. El corazón usa seis texturas escaladas en memoria, almacenadas una vez y reproducidas con pausa entre latidos: no se presentan como seis dibujos independientes ni poses de personaje. Retratos, marcos de medallón, tipografía y pictogramas existentes reutilizados; no hay sustitución de cuerpo, equipo o atlas de locomoción ni promoción modular.

[Revisión focalizada](../../output/godot-sheet-header-20261117/index.html): originales antes/después nuevos, misma escena/cámara/hora/clima y resolución para cada pareja; fases animadas pueden variar. La vida parcial con puntos temporales está identificada como estado distinto. No se reescriben las capturas ni hashes históricos V6. Validación vigente de esta pasada en `output/godot-sheet-header-20261117/`; aceptación artística del usuario y pruebas físicas siguen separadas.

Validación final de esta pasada: 295 comprobaciones de ficha sin fallos en Pecio (final-tests.log); instalación de fuentes compartidas en los tres prototipos. Cuatro capturas finales Forward+ revisadas: Mia/Mike a 1600x900, Mia a 1366x768 y vida parcial 4/11 +3 temporales. Se corrigió tras la primera captura el margen alfa residual del atlas reutilizando el recortador existente. Primera iteración conservada en iterations/. No se atribuye esta suite a ejecuciones nuevas en Retiro o campamentos.

## Extensión del acabado aprobado al resto de la ficha — 17/11/2026

El usuario aprueba los dos bloques anteriores y encarga mejorar el resto siguiendo la misma guía. Se extiende la familia de materiales existente, sin generar otro atlas ni modificar personajes. Las estadísticas reciben las placas de oro/pergamino V7 e iconos mayores; todos los títulos comparten cuero oscuro y relieve; las filas de acciones y atributos ganan contraste, las acciones tienen icono enmarcado y los modificadores una medalla legible. Magia e historia heredan paneles y tipografía comunes. Inventario conserva la misma instancia y operaciones, con ranuras doradas y selección roja coherente.

[SHEET-V8-PANELS/STATS/ROWS/BAG: propietarios, antes/candidata y recursos](../../prototypes/godot-shared/character_sheet/art/v8/sources.json). Referencia: guía comparativa del usuario, apartados 2–5 y 7–11; VA-01/03/14/18. El arco, plataforma, retratos y actor vivo existentes se revisan y conservan: no hay nuevo equipo, anatomía, pose o máscara corporal ni promoción de recursos de otro chat. La aceptación V7 no se extiende automáticamente a esta candidata.

[Comparación de cinco pestañas](../../output/godot-sheet-finish-20261117/index.html), con pares nuevos del mismo personaje/cámara/hora/clima/resolución; las fases animadas pueden variar. Se conservan originales/hashes e iteración descartada. Tras revisar el primer render se evita estirar el pergamino de la cartela en paneles altos, se compactan las filas para que entren las seis acciones y se corrige el fondo del botón que ocultaba el marco de la ranura seleccionada. Capturas y comprobaciones de esta revisión en su propia carpeta; no se reutilizan cifras históricas como pruebas nuevas. Fuentes instaladas en los tres prototipos mediante el sincronizador existente. Revisión artística del usuario y dispositivos físicos pendientes.

Validación final de la extensión: 295 comprobaciones sin fallos en Pecio (final-tests.log), diez capturas finales Forward+ y diez parejas antes/después. Tres personajes en Resumen; cinco pestañas de Mike a 1600x900; Resumen/Conjuros/Inventario de Mia a 1366x768. Capturas finales revisadas, con las seis filas de acciones visibles en escritorio y Sacar/Guardar visibles en inventario compacto. Se instala la misma fuente en los tres prototipos; no se afirma haber ejecutado esta suite nuevamente en Retiro/campamentos. Informe HTML generado y sintaxis del generador comprobada; interacción en navegador y pruebas físicas separadas.
