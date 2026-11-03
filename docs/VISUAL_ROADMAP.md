# Plan de acabado visual — anexo del roadmap maestro

Revisión: 01/11/2026. Anexo técnico de correspondencias y aceptación. El orden, prioridades, herramientas y cambios concretos se mantienen únicamente en el maestro. La primera adaptación de luz de actores está en candidata aislada; el acabado completo sigue pendiente. No crea ni cierra una versión del juego.

**Plan de ejecución único: [ROADMAP_V1.md](../ROADMAP_V1.md), secciones 3–5.** Allí están el orden VIS-0…VIS-6, el motor/bibliotecas y la matriz por categoría y mapa. Este anexo conserva correspondencias con las fichas locales y el formato de evidencia. El nombre se mantiene por compatibilidad; no crea otra planificación.

## Entrada común para cualquier chat

Leer [dirección artística](design/VISUAL_ART_DIRECTION.md), [biblioteca moderna](design/VISUAL_REFERENCE_LIBRARY.md), [auditoría de carencias](audits/VISUAL_GAP_AUDIT_20261101.md), `PROJECT_STATE.md` y el roadmap local de la escena. El estado actual de una escena se contrasta con sus archivos y evidencia reciente; el histórico general puede ir por detrás de sus fichas específicas.

Objetivo autorizado: mejorar el mismo mapa, su arte y ambiente conservando distribución, funciones y trabajos vigentes. Referencias principales: Octopath II, Witchbrook, Sea of Stars y Final Fantasy Tactics de 2025. Otras ocho referencias modernas amplían el estudio sin imponer una mezcla de estilos. Se eligen juegos/ediciones de 2018 en adelante; no se cuentan originales antiguos o ports sin cambio de arte como referencias modernas por defecto.

## 1. Secuencia de producción y estados

Consultar la [secuencia única en el maestro](../ROADMAP_V1.md#3-orden-único-apartados-de-producción-y-entregas-jugables). No mantener una segunda tabla de fases/estados en este archivo. Los registros locales indican avance técnico/artístico/físico con fecha; la decisión de qué sigue se toma en el maestro, preservando sus contratos locales.

La luz forma parte de la muestra desde VIS-2 y se completa en VIS-4. Una primera adaptación de actores no cierra toda la iluminación, los materiales ni la profundidad. Cada subentrega conserva una candidata jugable.

## 2. Primer alcance y adopción sin interrumpir otros trabajos

**Elección posterior del usuario, 01/11/2026: empezar por Retiro del Dragón y Pecio Rosa de los Vientos.** Primera subentrega: integrar los personajes con la iluminación viva ya existente, VA-10/11, sin rehacer las escenas. Después fijar una muestra coherente de superficies/mobiliario/vegetación con esa luz y extender por zonas. El [registro de esta subentrega](evidence/STORMWRECK_VISUAL_START_20261101.md) distingue código, comparativas y aceptación. VIS-2 completo sigue pendiente: adaptar personajes no termina por sí solo la familia de arte, la profundidad ni todos los materiales.

La **Cena de D8** conserva el encargo E0–E6/C01–C60 y pasa a trabajo posterior. No se elimina ni se da por implementado; dejó de ser el primer piloto por esta elección explícita. No se requiere terminar toda la biblioteca para empezar un punto verificable.

Los chats del **Retiro**, **Pecio**, **Espejo** y **campamentos** incorporan los criterios al siguiente bloque visual que tengan autorizado. No abandonan el bloque actual para remodelar otra escena ni repiten trabajo cerrado. Conservar referencias locales aprobadas y prioridades posteriores; esta tarea de planificación no publica, reinicia o altera la mesa.

| Línea | Documento local vigente | Aplicación de este plan |
| --- | --- | --- |
| D8 Cena | [Encargo](design/D8_DINNER_EXECUTION_PROMPT.md) y [C01–C60](design/D8_DINNER_LITERAL_CHECKLIST_20261021.md) | E0=VIS-1; E1/E2/E3 desarrollan VIS-2/3/4; E4/E5=VIS-5; E6=VIS-6 |
| D8 Espejo | [Evidencia inmersiva](evidence/D8_MIRROR_IMMERSIVE_20261021.md) | Conservar cueva, bruma, salida y luz local implementadas; revisar material/escala/contraste al recibir un encargo de refinado |
| Retiro | [Roadmap técnico vigente](audits/RETREAT_TECHNICAL_ROADMAP_20261023.md) y [referencias aprobadas](design/RETREAT_VISUAL_REFERENCES_20261025.md) | Adoptar familias coherentes en la subfase autorizada; no deshacer ampliaciones/geografía ni reabrir Q1.1/Q1.2/Q1.3a |
| Pecio | [Roadmap M0–M7](../ROADMAP_V1.md), M5 de recursos y M7 físico | Acabado por familia/estado sobre C1–C9; no cambiar casco, compartimentos, rutas o botín por otra referencia |
| Campamentos | Evidencia/ficha local al iniciar | Revalidar sprites, apoyos, clima y referencias ya elegidas; esta auditoría no declara revisados sus cinco mapas |

## 3. Lista compartida de carencias y mejoras

La auditoría define **VA-01–VA-18** con observación, acción, conservación y aceptación. Son necesidades de calidad o de verificación, no dieciocho bugs confirmados en todas las escenas. Una capacidad existente se afina; no se vuelve a construir.

| IDs | Trabajo | Bloque de producción |
| --- | --- | --- |
| VA-01/02/03 | Familia visual, paleta y escala de detalle | VIS-1/2 |
| VA-04/05/06/07 | Suelo, piedra/madera/tela, muebles y encuentros | VIS-2/3 |
| VA-08/09 | Césped, plantas, árboles y siluetas | VIS-2/3 |
| VA-10/11/12 | Personajes, luz, sombras y contacto | VIS-2/4 |
| VA-13/14/15 | Capas, cámara, recorte, agua y continuidad | VIS-2/4 |
| VA-16 | Atmósfera, clima, estados y audio | VIS-5 |
| VA-17/18 | Integración, coste, evidencia y cierre | VIS-1/6 |

## 4. Ficha que debe dejar cada chat

**Formato de comparativas pedido por el usuario, 02/11:** usar superposición con clic/toque, no solo dos miniaturas separadas. El antes es la base; al pulsarlo el después ocupa exactamente su rectángulo. Otra pulsación vuelve al antes manteniendo zoom y desplazamiento. Incluir etiqueta Antes/Después, teclado y vista ampliada. Reutilizar `scripts/lib/visual-comparison.mjs` (`visualComparison` + `visualComparisonAssets` una vez por HTML), verificar dimensiones iguales y guardar fuentes/hashes. Confirmar el encuadre y las condiciones reales; una animación o un cambio geométrico puede variar píxeles. No simular una alineación exacta entre un concepto y una captura ni entre cámaras distintas. Se aplica a todos los informes nuevos o regenerados.

Registrar escena, bloque local y VIS correspondiente; VA/Cxx atendidos; fuente o captura de referencia; hallazgo actual y su fecha; mejora concreta; límites conservados; recursos propios/reutilizados; evidencia antes/después; comprobación funcional; coste relevante; pendiente de usuario/dispositivo; siguiente bloque autorizado. Si no aplica un ID, explicar por qué. No cambiar de TODO a PASS por existir un archivo, una captura generada o una suite verde.

Estados distintos: PENDIENTE, EN TRABAJO, CONSTRUIDO, VERIFICADO TÉCNICAMENTE, REVISADO VISUALMENTE, ACEPTADO POR USUARIO y FÍSICO VERIFICADO. Se pueden combinar solo con evidencia para cada dimensión. No asignar una nota de parecido comercial o un porcentaje de acabado sin una rúbrica y revisión real.

## 5. Cómo compartirlo

Los criterios y fuentes se guardan en archivos de texto del repositorio y se enlazan desde su arranque, roadmap general y roadmap compartido. La galería local es un apoyo; perder `output/` no elimina la dirección común. Las referencias comerciales se consultan, no se añaden como recursos del juego. No se han enviado mensajes a otros chats: estos deben leer los documentos al retomar su trabajo.

No cambia el reparto de modelos ya acordado. Para una tarea concreta se conserva su relevo vigente, sin cambios automáticos ni subagentes. No se exige una nueva revisión de arquitectura para un ajuste cosmético reversible dentro del contrato existente.
