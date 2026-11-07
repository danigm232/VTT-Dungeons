# Microescenas de habilidades en la transición del jugador

La candidata está en `dev/skill-transition`. La entrada se identifica con `sceneEpoch` e ID de mapa dentro del runtime autorizado. Esto cubre cambios del grupo y portales que cambian solo el destino del personaje. Un snapshot repetido conserva la viñeta y la tirada. Un destino posterior sustituye la viñeta y espera su propia carga. La entrada inicial al selector de personaje sigue usando su flujo habitual.

`apps/web/player.ts` mantiene `world.applySnapshot`, `SceneLoadRecovery` y `scene:ready`. La viñeta se monta en paralelo y habilita Continuar al instalar el mapa vigente. La confirmación del render se envía al servidor en ese momento. Continuar cierra la pausa local. El proyector conserva su avance automático. Si se corta la conexión durante la transición, la pantalla espera la reconexión y conserva su tirada mientras siga siendo la misma entrada.

## Presentación a pantalla completa y visor

**Revisión numerada 0–18 del 07/11.** La nueva candidata incorpora poses con objetos integrados para Mía, Mike y Trinity, pies anclados al suelo, utilería detallada, escenas conjuntas para los contactos y un dado que rueda mediante una malla proyectada. El final permanece animado en `OUTCOME_LOOP` hasta Continuar o una nueva entrada; sustituye el reinicio ambiental de la entrega anterior. [Cambios por número, recursos y prompts](../design/SKILL_ANIMATION_CORRECTIONS_20261107.md). La [tanda v2](../design/SKILL_ANIMATION_ASSETS_20261107.md) se conserva como antecedente.

La referencia principal es `1000059518.jpg`, aportada por el usuario. Atletismo reproduce la composición lateral, los bordes de roca sobre la niebla, el título centrado con separadores dorados, el d20 facetado y la consigna «Salta la grieta y aterriza al otro lado». La apertura del visor usa a Mía. En la partida se utiliza el personaje asignado. Acrobacias comparte el fondo de la grieta, con una cuerda sobre sus dos bordes. Las otras 16 escenas tienen una superficie continua para apoyar su utilería. En ellas el dado se coloca más alto para liberar el espacio de la acción.

El archivo `PROBAR-LAS-18-PANTALLAS.html` se abre directamente en el navegador. Elige habilidad con el selector o las flechas. En Ajustes puedes cambiar de personaje, forzar un desenlace para la siguiente tirada o reiniciar. Continuar avanza a la siguiente habilidad en el visor. El visor comparte la interfaz y el reproductor del VTT y lleva integrados los fondos, los sprites públicos usados y el código. `pnpm build:skill-preview` regenera el HTML en `output/skill-transition/`.

| Recurso por ID | Propietario y base | Candidata y criterio |
| --- | --- | --- |
| `skill-chasm` · `takeoff` / `landing` | `skill-scenes.ts` y `skill-scene-art.ts`, siluetas vectoriales de los dos bordes | `apps/web/ui/art/skill-chasm.webp`, 1600 × 900, 44.232 bytes. Los puntos x=392 y 906 y el apoyo y=471 se calibran sobre el lienzo lógico 1280 × 720. VA-05/08/10/12. |
| `skill-floor` | `skill-transition.ts`, línea horizontal de apoyo | `apps/web/ui/art/skill-floor.webp`, 1600 × 900, 53.636 bytes. Mismo apoyo y=471 con superficie continua. VA-05/06/12. |
| `tightrope` | `skill-scenes.ts` y `skill-scene-art.ts`, dos postes y cuerda | Postes a ±137 unidades del centro de la cuerda para apoyar en ambos bordes. Tensión animada por el resultado de Acrobacias. VA-06/10. |
| `skillDie`, `skillTitle`, `skillCaption` | Tarjeta y dado lineal de la interfaz anterior | `skill-transition.html` y `skill-transition.css`, SVG facetado, órbita, títulos serif y reto por escena. La órbita respeta movimiento reducido. VA-12/16/17. |
| Utilería del catálogo inferior | Dibujos y trayectorias de `skill-scene-art.ts` y `skill-scenes.ts` | Gradiente cálido de luz y sombra fría según la altura pintada. Contornos, colores base, apoyos y acciones propios de cada objeto. VA-06/10/12. |

Los fondos son ediciones realizadas con **ImageGen integrado**. El JPG del usuario y los PNG originales generados quedan como fuentes de estudio y trazabilidad. Los WebP se escalan a 1600 × 900 y se codifican con calidad 89. El dado, el texto y los actores se componen en el navegador. La lectura de planos usa REF-01 y la de utilería REF-08. [Biblioteca visual](../design/VISUAL_REFERENCE_LIBRARY.md)

<details>
<summary>Fuentes de ImageGen y prompts</summary>

| Archivo de origen | SHA-256 |
| --- | --- |
| `1000059518.jpg` | `d0c0127eed7764c05705f8ae6800027c986ed331743df9f71796ba03c3a2f6d0` |
| PNG de la grieta | `03692707981dab5702be415f46bb6578d660df3ffae44af100eed5ad22ba10c9` |
| PNG de suelo continuo | `7fddf29675c8ad8839b5a68d8f6f4c1e7422f40de78dbf00ecca2f42f3b5f385` |

- Grieta, original generado `exec-bdbc974b-eb3a-4fe9-9154-d6b5e4ee07e1.png`. Fuente de edición `1000059518.jpg`.

  > Use case: precise-object-edit. Asset type: clean 16:9 game environment plate for an interactive HD-2D skill transition. Input Image 1 is the edit target and exact visual reference. Remove the red-haired character, the die with every digit and its circular ring, and all interface, lettering, ornaments, diamonds and lines. Reconstruct behind them with the same environment, dark teal fog and subtle warm overhead shaft that is already in the reference. Preserve the framing and both grassy stone cliffs with their inner lip positions at about 30% and 71% of image width, both ledge tops precisely 65% down the image. Preserve pixel-painted stone, golden top-edge highlights, teal mist layering, foreground dark grass silhouettes, silhouette of the deep gap, color and light balance. Keep the empty center and dark upper half. The output is the existing environment only. Keep a 16:9 landscape canvas like the reference. No people, objects, dice, interface, words, letters or watermark.

- Suelo, original generado `exec-2a40d049-5cfd-41c9-a1b1-82f4f74bc01b.png`. Fuente de edición, la lámina de la grieta.

  > Use case: precise-object-edit. Asset type: matching reusable 16:9 environment plate for HD-2D fantasy skill demonstrations. Input 1 is the existing chasm environment. Change the bottom third only: fill the gap at the ledge height by joining both sides into ONE visually continuous level floor of weathered dark slate, with the contact line exactly 65% down the image from x=0 through x=100%. The actors and objects are added later; keep the whole floor surface unobstructed with a restrained subtle warm amber edge, a hint of moss only at extreme edges, and dark foreground silhouettes near the bottom corners. Preserve the clean negative space, soft teal fog, dark petrol shadows, restrained gold central overhead light, pixel-painted scenery and layered depth. Let the lower fifth fade dark so captions will be legible. Camera is straight-on side elevation. It should feel like the same cavern scene and same frame, with a continuous rocky playing surface where the two cliff tops used to end. 16:9 landscape. No cliffs interrupting the ground, structures, tall objects, characters, interface, dice, type, symbols or watermark.

</details>

## Configuración y reutilización

- `engine/client/skill-micro-scene.ts` define el contrato y el reloj compartido por actor, utilería y d20. El clic consume una tirada de práctica y el resultado se compara con la CD. Después de la reacción se mantiene el desenlace, sin reiniciar el reto ni permitir otra tirada.
- `apps/web/ui/skill-scenes.ts` define las 18 habilidades. `defaultDC` parte de 12. El catálogo público de una campaña admite `skillTransition: { dc: 14 }`, por ejemplo, para cambiar la CD de práctica.
- Una semilla privada puede aportar `skillModifiers: { athletics: 3 }`, donde el número es el modificador total registrado para ese ID. Se entrega en el estado privado del jugador. Las campañas existentes que omiten el dato usan el d20 natural.
- `apps/web/ui/skill-scene-sprite.ts` resuelve el token asignado a partir de los snapshots y el catálogo de la campaña. Reutiliza el reproductor de fotogramas, las direcciones y el aislamiento alfa del VTT. Ajusta el encuadre según la altura publicada, conserva la paleta y vuelve al sprite base si falta una pose. La silueta provisional cubre el tiempo de carga del recurso.
- `apps/web/ui/skill-transition.ts` pinta el actor y la utilería en un lienzo 2D de 1280 × 720 a un máximo aproximado de 33 actualizaciones por segundo. El fondo WebP se compone como capa estática. Con movimiento reducido muestra poses fijas por fase. La secuencia de Interpretación sintetiza su audio local después de pulsar el d20 y lo libera al salir.

## Registro visual

La utilería se dibuja en `apps/web/ui/skill-scene-art.ts`. La posición, el montaje y las pistas temporales se definen por ID en `apps/web/ui/skill-scenes.ts`. Los elementos de la tabla son dibujos propios de la candidata. La base anterior era el mensaje de carga sin viñeta. La referencia de estudio es REF-08, Eastward, para la lectura de objetos por silueta y contraste. Los atlas originales de cada personaje provienen de sus respectivas campañas. [Biblioteca visual](../design/VISUAL_REFERENCE_LIBRARY.md#ref-08--eastward)

En Stormwreck los IDs de referencia son `rogue`, `wizard` y `cleric`. Sus bases registradas son `/art/m3/trinity/maria_base.png`, `/art/tokens/wizard.png` y `/art/tokens/cleric.png`. El recorte de la viñeta parte de los clips autorizados del catálogo y usa los mismos datos de orientación y alfa. Las alturas de referencia del catálogo son 1,05 m, 1,80 m y 1,30 m, respectivamente. [Catálogo de Stormwreck](../../campaigns/stormwreck-isle/public/pack.ts)

| Habilidad | IDs y recursos de la candidata | Revisión que corresponde |
| --- | --- | --- |
| Acrobacias | `tightrope`, cuerda con dos soportes y tensión variable | VA-06/10. Leer equilibrio, cruce y caída con el mismo encuadre. |
| Atletismo | `takeoff`, `landing`, `stride-dust`, dos bordes de roca y marcas de carrera | VA-10/16. Distinguir despegue, aterrizaje y agarre. |
| Conocimiento arcano | `crystal`, `smoke`, facetas, runas y humo | VA-06/16. Distinguir estudio, runa y humo por causa y posición. |
| Engaño | `gate-guard`, `false-moustache`, guardia y disfraz | VA-06/10. Distinguir paso concedido y bigote caído. |
| Historia | `old-heraldry`, `research-scroll`, escudo y pergamino | VA-06/10. Leer la relación entre documento y emblema. |
| Interpretación | `practice-lute`, `music-notes`, `applause`, laúd, notas y manos | VA-06/16. Distinguir aplauso y nota caída. Timbres originales en `skill-performance-sound.ts`. |
| Intimidación | `bandit`, actor secundario con cambio de postura | VA-10. Distinguir huida y burla. |
| Investigación | `lever-box`, `released-spring`, caja, palancas, tapa y muelle | VA-06/16. Distinguir palanca correcta y muelle disparado. |
| Juego de manos | `coin-table`, `practice-coin`, `coin-reveal`, mesa y moneda | VA-06/10. Distinguir desaparición, reaparición y caída. |
| Medicina | `seated-companion`, `bandage-roll`, `applied-bandage`, `bandage-tangle`, paciente y vendas | VA-06/10. Distinguir vendaje aplicado y enredo. |
| Naturaleza | `narrow-leaves`, `broad-leaves`, `plant-spores`, hojas y esporas | VA-06/16. Distinguir las plantas y el estornudo. |
| Percepción | `hiding-bush`, `hidden-owl`, arbusto y lechuza | VA-06/16. Distinguir descubrimiento y fuga. |
| Perspicacia | `worried-traveler`, viajero con gesto nervioso | VA-10. Leer una señal de inquietud en una conversación. |
| Persuasión | `merchant`, `table`, comerciante y mesa | VA-06/10. Mantener caras y manos visibles al aceptar o rechazar. |
| Religión | `shrine`, `ritual-book`, altar y libro | VA-06/10. Leer consulta y gesto respetuoso. |
| Sigilo | `loose-stone`, `sleepy-guard`, `stone-noise`, guardia y piedra | VA-10/16. Distinguir paso detrás del guardia y ruido al pisar. |
| Supervivencia | `boot-trail`, `paw-trail`, `trail-marker`, dos rastros y señal | VA-06/10. Distinguir seguimiento y vuelta al origen. |
| Trato con animales | `nervous-horse`, caballo con cabeza, orejas y cola animadas | VA-10/16. Distinguir acercamiento tranquilo y retroceso. |

La tabla anterior documenta la primera entrega. Los recursos vigentes, el cambio de bigote a sombrero, los objetos integrados y las secuencias de contacto se registran en la revisión numerada. La aceptación artística del usuario y la prueba en un dispositivo físico se registran por separado.

## Verificación

**Revisión numerada 0–18, 07/11.** Construida en `dev/skill-transition`; no instalada en la mesa habitual. Se comprobaron 108 combinaciones (tres protagonistas × 18 habilidades × éxito/fallo), permanencia de `OUTCOME_LOOP`, variación del desenlace y bloqueo de la segunda tirada. Después del ajuste de alcance de animales y contraste de huellas se repitieron sus doce combinaciones. Las verificaciones finales de tipos, producción y mesa VTT usan el último código.

- Diez pruebas dirigidas de reloj de habilidad, reproducción y recuperación de carga: aprobadas. Incluyen apoyo terrestre y permanencia del desenlace a 90 segundos.
- Tipos de cliente y compilación Vite en `dist/skill-transition-corrections`: aprobados. Prueba con servidor aislado, cambio por Socket.IO, Mía, d20, desenlace final y Continuar: aprobada.
- Visor local sin red: dado proyectado con veinte caras y geometría variable durante la tirada, movimiento reducido, reinicio, toque, móvil 390 × 700 y horizontal 844 × 390. Resultado y cabecera no se superponen en esas dos vistas.
- Revisión visual: paneles de las 18 escenas y 36 desenlaces, más contacto de manos, venda y hocico con los tres protagonistas. El caballo mantiene su recurso y escala; las variantes conjuntas descartadas no entran en el juego.
- `output/skill-transition/correcciones-v3/REVISAR-CORRECCIONES-0-A-18.html`: 18 comparativas por superposición, ampliación y teclado, 36 capturas de desenlace y vídeo de 90 fotogramas reales (11,25 s, 8 fps). `originales.json` conserva hashes y condiciones de las capturas. Vídeo y controles del informe comprobados en el navegador.
- Visor autónomo: `output/skill-transition/PROBAR-LAS-18-PANTALLAS.html`, 17.501.946 bytes, con código y recursos integrados. Revisión artística del usuario y pruebas físicas siguen pendientes; las vistas táctiles son emuladas.

**Tanda del 07/11.** Se compararon dos instantes del área pintada del protagonista en las 18 habilidades con Mía, Mike y Trinity, 54 combinaciones. Todas cambiaron de fotograma. Se verificó también la reducción de movimiento. El visor siguió pasando los 36 desenlaces, la selección de personaje y la entrada táctil emulada. Tipos y compilación de cliente pasaron, y Atletismo pasó con los nuevos recursos en una mesa VTT aislada.

La muestra `output/skill-transition/animaciones-v2/muestra-animaciones.webm` se compone de 64 fotogramas capturados del visor a intervalos de 125 ms. El informe `VER-ANIMACIONES-Y-OBJETOS.html` del mismo directorio incluye el vídeo y cuatro comparativas por superposición. Conserva los originales y sus hashes. Los pares usan Mía, ventana de 1280 × 720, la misma habilidad y el bucle ambiental a 180 ms de entrada. Se revisaron además Persuasión y Medicina con los secundarios ilustrados y los apoyos del mobiliario.

El visor HTML se abrió desde disco con Chromium sin conexión. Pasaron las 18 selecciones y los 36 desenlaces, la selección de personaje, el avance con flecha y Continuar, y la tirada táctil en emulación de 390 × 700. La compilación de Vite y los tipos de cliente y servidor pasaron. Las 9 pruebas dirigidas de reloj, animación y recuperación de carga pasaron.

Atletismo pasó en el VTT compilado con una mesa Stormwreck aislada y un cambio de mapa por Socket.IO. Se verificaron el fondo integrado, la tirada y Continuar. La comparativa de dos capturas reales del VTT está en `output/skill-transition/evidencia-cinematica/COMPARAR-ATLETISMO.html` del workspace. Registra ambos originales a 1280 × 720, con Mía, mapa listo y d20 sin tirar. El informe alterna ambas capturas en el mismo rectángulo e incluye ampliación. La lámina del usuario se usa como referencia de dirección visual.

La muestra inicial de Atletismo, Conocimiento arcano y Persuasión se revisó en una mesa Stormwreck aislada con Trinity y cambios de mapa por Socket.IO. Se comprobó el retorno al ambiente, el bloqueo de una segunda tirada y la conservación de PG, posición, mochila y recursos. La toma de Persuasión detectó una mesa en primer plano que tapaba parte del actor. La candidata la coloca detrás del protagonista.

La compilación final pasó la comprobación de tipos de cliente y servidor y la compilación de producción de Vite. En Chromium pasaron los 36 desenlaces de la candidata con Trinity, además de la salida sin tirar y un cambio de mapa individual con `sceneEpoch` constante. La revisión de pantalla incluyó escritorio y una ventana de 390 × 700.

Con Mía y entrada táctil emulada a 390 × 700, una latencia simulada de 2.700 ms permitió completar la tirada mientras Continuar seguía deshabilitado. Continuar se habilitó al instalarse el mapa. La captura de esta toma es `output/skill-transition/mia/mobile-touch.png` en el directorio de trabajo de la candidata.

El piloto de Atletismo también pasó con Mike. Las capturas del piloto muestran los sprites originales de Mike y Mía a sus alturas relativas de campaña.

La comprobación ampliada reprodujo el fallo de `wreck.boat-arrived` en la prueba M4 del viaje en barca tanto en la candidata como en la rama base. El resto de las 99 comprobaciones de esa tanda pasó. Vitest también registró un tiempo de espera de su worker durante la tanda ampliada. [Prueba M4](../../engine/server/wreck-runtime.test.ts#L731)
