# Revisión de desenlaces, apoyos y rastros · 07/11/2026

Continúa la candidata aislada `dev/skill-transition`. Alcance: los puntos 0 y 3–17 del último comentario del usuario, incluida su aclaración de que Supervivencia debe mostrar huellas de un animal como un jabalí. Conserva los fondos y la identidad de los protagonistas, la caída de Acrobacias, el suelo continuo de Atletismo y la corrección del parpadeo. No cambia mapas, motor, guardados ni la mesa habitual.

## Comportamiento integrado

- D20 centrado abajo. El resultado aparece debajo del título al resolverse la tirada y se oculta a los 4.500 ms desde el clic; no tapa la risa ni el movimiento de los participantes. La tirada sigue bloqueada hasta una nueva entrada.
- Sombras de contacto y proyectadas con luz desde arriba a la izquierda. La cota de apoyo se obtiene del alfa sólido del dibujo; se ignoran las franjas casi transparentes inferiores. Los personajes en parejas tienen una sombra por participante, sin duplicar el PNJ de reemplazo. Las huellas son hendiduras sobre el suelo, sin sombra de objeto elevado.
- Los gestos comunes pasan de 6 a 3,8 dibujos/s y el instrumento de 8 a 4,8. Las nuevas carreras mantienen seis u ocho dibujos coherentes de dirección; el sigilo tiene ocho poses a 4,8 dibujos/s. Los desenlaces tienen duraciones declarativas propias de 5,5–9 s. Acrobacias y Atletismo conservan sus tiempos de apoyo/despegue.
- Una pose opaca por fotograma: no se recupera el fundido que producía el parpadeo. Los pies siguen siendo el origen y la respiración se realiza sobre ese apoyo.
- Arcano: humo de remolinos suaves y dispersión, cristal realmente más luminoso y luz reflejada sobre el suelo al acertar.
- Engaño: al fallar, el personaje huye con el sombrero incorporado y el guardia lo persigue; ambos salen por la derecha. Queda una bruma de polvo tenue. El éxito conserva el paso concedido.
- Historia: escudo apoyado, sombra y cara hacia el protagonista. Aproximación con pergamino en la mano, giro hacia cámara y pulgar arriba. Fallo: rascarse la cabeza y bajar los hombros.
- Interpretación: público humano más alto que Mía/Trinity, distintos saltos y aplausos; notas desde el protagonista y los tres espectadores. Al fallar, el grupo se marcha en una dirección.
- Intimidación: el bandido gira una sola vez y los seis dibujos de huida miran todos a la derecha. «¡Ja, ja, ja!» queda en el espacio de actuación.
- Investigación y Persuasión: mecanismo, mesa y secundarios apoyados con sombras comunes. Se conserva el apretón de manos conjunto ya ilustrado.
- Juego de manos: sustituye el truco de la moneda por sacar una bolsa del bolsillo de un viajero. Secuencia conjunta: alcance, dedos en el bolsillo, extracción y exhibición discreta; alternativa con giro del dueño, muñeca sorprendida y retirada avergonzada.
- Medicina: examen, colocación, envoltura, cierre, prueba del brazo, levantarse y agradecer. El fallo continúa con ayuda para desenredar las vendas y una reacción compartida. No modifica PG.
- Naturaleza: aproximación, contacto con plantas, estornudo, piel lila, pérdida de equilibrio y caída de espaldas; termina tumbado respirando. El color es demostrativo, no una condición de la partida.
- Percepción: una variante por entrada entre lechuza, trasgo, ratón, kobold, Trinity, Mía, Silverfarben y Mike. El visor permite elegir las ocho. Los visitantes terrestres permanecen en la cota del suelo; solo la lechuza vuela. Los protagonistas reutilizan su arte y altura; Silverfarben reutiliza sus fotogramas originales de reposo y carrera.
- Perspicacia: éxito con escucha, carta mostrada y alivio; fallo con carta retirada, rostro cubierto y postura de cierre. Interpreta preocupación, sin convertirla en detector de mentiras.
- Religión: consulta comparada del símbolo del libro y del altar, reverencia; fallo con libro girado, páginas sueltas y confusión. No concede poderes ni recompensas.
- Sigilo: pausa al bostezar el guardia, pasos dibujados y cruce detrás de su cuerpo, que actúa como cobertura. Fallo con ruido, giro del guardia y retroceso del intruso.
- Supervivencia: rastro de seis pezuñas hendidas de jabalí con espolones y otro de ciervo, sobre pequeñas zonas de suelo que conservan la familia de pizarra y tierra. Se amplían las marcas, con borde cálido y realce discreto al reconocerlas. Los recorridos mantienen el apoyo terrestre.

## Registro de arte y valores

La referencia principal sigue siendo la imagen facilitada por el usuario. Se mantienen los criterios VA-01/02 (familia y paleta), VA-06/07 (utilería, escala y contacto), VA-10 (identidad y lectura corporal) y VA-16 (movimiento). La referencia moderna REF-08 ya utilizada para lectura de objetos sigue siendo material de estudio, no un recurso incorporado.

Propietarios: `skill-actor-sequences.ts` para protagonistas y contactos; `skill-prop-sprites.ts` para secundarios, criaturas y rastros; `skill-scene-shadows.ts` para apoyos; `skill-scenes.ts` para trayectorias, tiempos y sincronización; `skill-perception-variants.ts` para selección de visitantes. Los objetos que se llevan en las manos o cabeza siguen pintados en el propio sprite.

| ID de recurso / actual → candidata | Derivado en `apps/web/ui/art/` | Contenido / VA / aceptación |
| --- | --- | --- |
| `cleric-reactions:r:c`, objetos/movimientos v3 → poses ampliadas | `skill-cleric-reactions-v5.webp` | 48 dibujos; misma identidad y altura de Mía. VA-10/16; pendiente del usuario. |
| `wizard-reactions:r:c`, v3 → poses ampliadas | `skill-wizard-reactions-v5.webp` | 48 dibujos; misma identidad y altura de Mike. VA-10/16; pendiente del usuario. |
| `rogue-reactions:r:c`, v3 → poses ampliadas | `skill-rogue-reactions-v5.webp` | 48 dibujos; misma identidad y altura de Trinity. VA-10/16; pendiente del usuario. |
| `npcs:r:c`, secundarios v3 → continuación y dirección fija | `skill-npcs-v5.webp` | 48 dibujos de guardia, bandido, público, viajero/carta y guardia adormilado. VA-07/10/16; pendiente del usuario. |
| `creatures:r:c`, solo lechuza → tres especies adicionales | `skill-creatures-v5.webp` | 24 dibujos de trasgo, kobold y ratón. VA-10/16; pendiente del usuario. |
| `pickpocket:r:c`, moneda v3 → contacto de bolsillo | `skill-pickpocket-v5.webp` | 24 dibujos conjuntos, ocho por protagonista, bolsa integrada. VA-06/07/10; pendiente del usuario. |
| `treatment:r:c`, vendaje v3 → desenlace ampliado | `skill-treatment-v5.webp` | 48 dibujos conjuntos; referencia de altura compartida entre éxito/fallo del mismo protagonista. VA-07/10/16; pendiente del usuario. |
| `tracks:0/1`, rastros genéricos v3 → jabalí/ciervo | `skill-tracks-v5.webp` | Dos calcomanías de suelo, anchos 131/113 unidades y altura proyectada 18; pezuñas de jabalí con espolones. VA-06/07; pendiente del usuario. |
| `scroll-walk:r:c`, lectura quieta → marcha con pergamino | `skill-scroll-walk-v5.webp` | 24 dibujos; se seleccionan seis pasos por protagonista y se reservan las poses de extremos. VA-07/10/16; pendiente del usuario. |
| `old-heraldry`, `lever-box`, `table`, NPC, plantas y caballo; alfa inferior → apoyo sólido | recursos v3 conservados | Mismos dibujos, cota 202 y sombras calculadas por huella. VA-07; pendiente del usuario. |
| `crystal`, `smoke`, luminosidad previa → brillo y humo suave | recurso v3 + efectos Canvas | Brillo hasta 1,85×, halo y luz en suelo; humo de 14 remolinos. VA-06/16; pendiente del usuario. |

Las filas/columnas y recortes de los 314 dibujos nuevos están en `skill-animation-v5.json`. Originales y parámetros de preparación en [el manifiesto de fuentes](SKILL_ANIMATION_V5_SOURCES_20261107.json); prompts completos, referencias y rutas finales en [el registro de ImageGen](SKILL_ANIMATION_V5_PROMPTS_20261107.json). Se empleó ImageGen integrado, con transparencia. Los PNG originales permanecen en su ubicación generada. La preparación recorta componentes alfa y codifica WebP; no redibuja personajes.

Reproducción: `scripts/prepare-skill-animation-art.mjs <directorio de PNG originales> docs/design/SKILL_ANIMATION_V5_SOURCES_20261107.json v5`, y después el constructor existente del visor. El soporte de varios atlas amplía la biblioteca compartida; no añade 18 controladores independientes.

## Validación y límites

Visor de esta candidata: `output/skill-transition/PROBAR-LAS-18-PANTALLAS.html`, 34.669.076 bytes, código y recursos integrados para abrir desde disco sin conexión. El tamaño incluye las 18 escenas, los tres protagonistas, todos los visitantes y los recursos originales de Silverfarben; la aplicación carga los recursos del protagonista seleccionado.

Dieciséis pruebas dirigidas aprobadas, tipos de cliente y compilación de producción aprobados. Visor sin red: 108 combinaciones de tres protagonistas × 18 habilidades × éxito/fallo; una tirada por entrada, resultado temporal, permanencia de desenlace y variación del render final. Tras revisar el vídeo se adelanta el arranque del protagonista en Engaño para que rebase al guardia y este lo siga por detrás; prueba de trayectoria y seis combinaciones de Engaño repetidas con éxito. Las ocho variantes de Percepción se comprueban con ambos resultados. Transición real por Socket.IO, d20, mapa listo y Continuar aprobados en la mesa aislada construida en `dist/skill-transition-v5`. Interfaz con toque, dado proyectado rodando, resultado temporal, Continuar y movimiento reducido comprobados a 1280 × 720, 390 × 700 y 844 × 390. El formato horizontal corto permite desplazamiento vertical; el formato vertical amplía la viñeta sin recortar el recorrido de los saltos. Corregida la franja vacía del pie que interceptaba el toque sobre el dado.

El informe `output/skill-transition/narrativa-v5/REVISAR-ANIMACIONES-Y-HUELLAS.html` conserva 19 pares superpuestos, teclado y ampliación mediante `scripts/lib/visual-comparison.mjs`. Mía, 1280 × 720, misma cámara/habilidad/resultado; ambientes a 400 ms y acciones al mismo porcentaje o desenlace persistente. Las historias y duraciones cambian por el encargo: no se afirma que las poses sean idénticas. `originales.json` registra fuentes, tiempos y hashes. El vídeo conserva nueve secuencias capturadas realmente a intervalos de 125 ms, con cortes entre escenas; no es vídeo generado.

La aceptación artística del usuario y las pruebas en dispositivos físicos siguen pendientes. No se instala esta candidata en el puerto 3000 ni se modifica trabajo de otros chats.
