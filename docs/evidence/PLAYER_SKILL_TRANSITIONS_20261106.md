# Microescenas de habilidades en la transición del jugador

La candidata está en `dev/skill-transition`. La entrada se identifica con `sceneEpoch` e ID de mapa dentro del runtime autorizado. Esto cubre cambios del grupo y portales que cambian solo el destino del personaje. Un snapshot repetido conserva la viñeta y la tirada. Un destino posterior sustituye la viñeta y espera su propia carga. La entrada inicial al selector de personaje sigue usando su flujo habitual.

`apps/web/player.ts` mantiene `world.applySnapshot`, `SceneLoadRecovery` y `scene:ready`. La viñeta se monta en paralelo y habilita Continuar al instalar el mapa vigente. La confirmación del render se envía al servidor en ese momento. Continuar cierra la pausa local. El proyector conserva su avance automático. Si se corta la conexión durante la transición, la pantalla espera la reconexión y conserva su tirada mientras siga siendo la misma entrada.

## Configuración y reutilización

- `engine/client/skill-micro-scene.ts` define el contrato y el reloj compartido por actor, utilería y d20. El clic consume una tirada de práctica y el resultado se compara con la CD. El bucle ambiental vuelve tras la reacción y la recuperación.
- `apps/web/ui/skill-scenes.ts` define las 18 habilidades. `defaultDC` parte de 12. El catálogo público de una campaña admite `skillTransition: { dc: 14 }`, por ejemplo, para cambiar la CD de práctica.
- Una semilla privada puede aportar `skillModifiers: { athletics: 3 }`, donde el número es el modificador total registrado para ese ID. Se entrega en el estado privado del jugador. Las campañas existentes que omiten el dato usan el d20 natural.
- `apps/web/ui/skill-scene-sprite.ts` resuelve el token asignado a partir de los snapshots y el catálogo de la campaña. Reutiliza el reproductor de fotogramas, las direcciones y el aislamiento alfa del VTT. Ajusta el encuadre según la altura publicada, conserva la paleta y vuelve al sprite base si falta una pose. La silueta provisional cubre el tiempo de carga del recurso.
- `apps/web/ui/skill-transition.ts` pinta un lienzo 2D de 640 × 260 a un máximo aproximado de 33 actualizaciones por segundo. Con movimiento reducido muestra poses fijas por fase. La secuencia de Interpretación sintetiza su audio local después de pulsar el d20 y lo libera al salir.

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

La aceptación artística del usuario y la prueba en un dispositivo físico se registran por separado. Quedan registradas como recursos pendientes las poses de agarre exacto, brazos de equilibrio, arrodillado y contacto de manos para los personajes que carecen de ellas. La candidata representa estos gestos con los fotogramas disponibles y el movimiento de la utilería.

## Verificación

La muestra inicial de Atletismo, Conocimiento arcano y Persuasión se revisó en una mesa Stormwreck aislada con Trinity y cambios de mapa por Socket.IO. Se comprobó el retorno al ambiente, el bloqueo de una segunda tirada y la conservación de PG, posición, mochila y recursos. La toma de Persuasión detectó una mesa en primer plano que tapaba parte del actor. La candidata la coloca detrás del protagonista.

La compilación final pasó la comprobación de tipos de cliente y servidor y la compilación de producción de Vite. En Chromium pasaron los 36 desenlaces de la candidata con Trinity, además de la salida sin tirar y un cambio de mapa individual con `sceneEpoch` constante. La revisión de pantalla incluyó escritorio y una ventana de 390 × 700.

Con Mía y entrada táctil emulada a 390 × 700, una latencia simulada de 2.700 ms permitió completar la tirada mientras Continuar seguía deshabilitado. Continuar se habilitó al instalarse el mapa. La captura de esta toma es `output/skill-transition/mia/mobile-touch.png` en el directorio de trabajo de la candidata.

El piloto de Atletismo también pasó con Mike. Las capturas del piloto muestran los sprites originales de Mike y Mía a sus alturas relativas de campaña.

La comprobación ampliada reprodujo el fallo de `wreck.boat-arrived` en la prueba M4 del viaje en barca tanto en la candidata como en la rama base. El resto de las 99 comprobaciones de esa tanda pasó. Vitest también registró un tiempo de espera de su worker durante la tanda ampliada. [Prueba M4](../../engine/server/wreck-runtime.test.ts#L731)
