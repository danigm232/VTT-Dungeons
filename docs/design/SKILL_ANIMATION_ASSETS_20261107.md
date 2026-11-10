# Recursos de animación de habilidades · 07/11/2026

Los derivados se usan en la pantalla de transición y en su visor autónomo. El registro se vincula a la ficha de transiciones del roadmap maestro. La referencia de acabado sigue siendo la imagen `1000059518.jpg` aportada por el usuario y la lectura de gestos/objetos de REF-08. Se aplican VA-06, VA-10, VA-12 y VA-16.

## Recursos y reproducción

| ID | Fuente original | Derivado de la candidata | Reproducción |
| --- | --- | --- | --- |
| `cleric-skills-v2` | `/art/tokens/cleric.png`, identidad de Mía | `apps/web/ui/art/skill-cleric-v2.webp`, 1024 × 1536 | 24 poses en 4 × 6. Altura de referencia pintada 234 px. |
| `wizard-skills-v2` | `/art/tokens/wizard.png`, identidad de Mike | `apps/web/ui/art/skill-wizard-v2.webp`, 1024 × 1536 | 24 poses en 4 × 6. Altura de referencia 231 px. |
| `rogue-skills-v2` | `/art/m3/trinity/maria_base.png`, identidad de Trinity | `apps/web/ui/art/skill-rogue-v2.webp`, 1024 × 1536 | 24 poses en 4 × 6. Altura de referencia 246 px. |
| `skill-props-v2` | Utilería vectorial del visor | `apps/web/ui/art/skill-props-v2.webp`, 1448 × 1086 | 12 piezas en 4 × 3. Libro, pergamino, escudo, laúd, caja, tapa, palancas, muelle, dos plantas, altar y moneda. |
| `skill-horse-v2` | Caballo vectorial del visor | `apps/web/ui/art/skill-horse-v2.webp`, 1536 × 1024 | 6 poses de alerta, calma y empujón. Pivote de torso común y patas apoyadas. |
| `skill-people-v2` | Secundarios vectoriales del visor | `apps/web/ui/art/skill-people-v2.webp`, 1120 × 1400 | 20 poses. Guardia, comerciante, bandido, viajero y compañero sentado. Dos poses de conversación y dos reacciones por personaje. |

Las seis filas de cada protagonista son carrera, estudio, conversación, salto, sigilo e inspección arrodillada. Se reproducen a 2,5–9 fotogramas por segundo según el gesto. `skill-actor-sequences.ts` selecciona el ciclo y registra el tamaño pintado de referencia para conservar las proporciones durante la flexión. `skill-scene-sprite.ts` mantiene el pivote por pose y usa un reloj propio al cambiar de acción. Las variantes de diálogo, equilibrio, alcance, señal y manipulación reutilizan estas secuencias.

`skill-prop-sprites.ts` separa caja, tapa, palancas y engranajes para animarlos con el reloj de la viñeta. También anima el giro de la moneda, las páginas del libro, el instrumento, las plantas y las poses del caballo. Los brazos y las reacciones de los secundarios cambian con la conversación y el resultado. Los puntos de contacto de Investigación, Medicina y Trato con animales se ajustaron en `skill-scenes.ts`.

Las poses de trabajo dejan las manos libres. Las alturas relativas siguen procediendo del catálogo de cada personaje. El lector de sprites mantiene el soporte del catálogo de campaña para otros personajes. El visor abre con el movimiento activado y ofrece «Reducir animaciones» en Ajustes. La partida consulta la preferencia de movimiento del dispositivo.

## Procedencia de ImageGen

Se usó **ImageGen integrado**, con transparencia solicitada y las bases originales como referencias de identidad de los tres protagonistas. Se inspeccionaron las hojas antes de incorporarlas. Los WebP se codificaron con calidad 94 y alfa 100. La hoja de secundarios se ajustó de 1122 × 1402 a 1120 × 1400 para su división regular. El recorte del quinto caballo conserva su hocico mediante el aislamiento alfa reutilizado del VTT.

Los PNG originales están en el directorio de imágenes generadas de esta conversación.

| Recurso | PNG original |
| --- | --- |
| Mía | `exec-f899cc9b-47a7-439c-9375-90cce75672ca.png` |
| Mike | `exec-a5982a80-2039-42b4-8637-9036402f7ee3.png` |
| Trinity | `exec-88fddfbb-e432-4464-bb74-ae2c4b4226f0.png` |
| Objetos | `exec-ce7d41d7-f8a0-4eee-a578-dc00a0f934a9.png` |
| Caballo | `exec-ab21641c-4639-4c6c-a1d9-cdedcb950dab.png` |
| Secundarios | `exec-ea81e70c-cd57-41da-b320-a2fe6c6a16a8.png` |

### Prompt compartido de los protagonistas

> Use case: identity-preserve. Asset type: a production sprite animation sheet for a 2D VTT. The reference is the character identity. Draw EXACTLY that same character, face, hair, outfit, armor trim and proportions, empty hands (weapons and shield stowed behind the body), facing RIGHT in side / shallow three-quarter profile. Original painted pixel sprite visual style, crisp contours. Create a precise 4-COLUMN by 6-ROW uniform grid, 24 equal cells, transparent background, no labels, no gridlines. Canvas portrait 2:3. Each cell contains exactly one complete full-body character, identical visual scale, baseline at 90% of its cell, with generous transparent gap. Row 1: four distinct chronological RUNNING frames, opposing arms and legs, two contact and two passing poses. Row 2: four distinct STUDY frames, planted feet, head looking down, both free hands at waist like holding an open book (book added later), gaze and fingers move. Row 3: four distinct CONVERSATION frames, planted feet, expressive forearm gestures opening, pointing, relaxed, listening, natural head movement. Row 4: four chronological JUMP frames, anticipation crouch, takeoff extension, airborne tucked knees with arms raised, landing crouch. Row 5: four distinct SNEAKING frames, tiptoe bent knees, cautious quiet steps, low body and arms balancing. Row 6: four distinct KNEELING INSPECTION frames, one knee on ground, lean forward, examine with free hand, reach toward a low object, withdraw. Keep facial features, clothing color, buckles, armor panels, hairstyle and silhouette faithful. All 24 poses clearly different and drawable in sequence. Only this character. No floor, environment, shadow, objects or words. Transparent RGBA.

### Instrucciones de objetos, caballo y secundarios

Los prompts de objetos pidieron una cuadrícula 4 × 3 con las doce piezas de la tabla, vista lateral en tres cuartos, dibujo pixelado pintado, bordes definidos, luz cálida superior izquierda y sombras frías. La caja, la tapa, la palanca y el muelle se solicitaron separados para poder articularlos.

El prompt del caballo pidió una cuadrícula 3 × 2, caballo castaño sin montura mirando a la izquierda, tamaño y apoyo comunes. Las seis poses se definieron como alerta, movimiento de orejas/cola, cabeza baja, asentimiento, empujón de hocico y recuperación.

El prompt de secundarios pidió una cuadrícula 4 × 5. Cada fila contiene la misma persona mirando a la izquierda. Se describieron las dos poses ambientales y las reacciones de paso/sospecha del guardia, acuerdo/rechazo del comerciante, huida/risa del bandido, alivio/inquietud del viajero y agradecimiento/sorpresa del compañero sentado. Se solicitaron cuerpos completos, materiales detallados, separación transparente y ausencia de etiquetas o fondos.
