# Correcciones de las 18 microescenas · 07/11/2026

Encargo: revisión numerada del usuario, 0 general y 1–18 en el orden del visor. Continúa la misma rama `dev/skill-transition`, los fondos aprobados como referencia y el reproductor compartido. Esta candidata sustituye el retorno automático al ambiente por un desenlace permanente, según la instrucción más reciente.

## Cambios comunes

- D20 con malla de icosaedro proyectada, rotación en tres ejes, traslación, rebotes y frenado durante 1115 ms. Tamaño reducido; resultado situado encima para liberar el área de actuación.
- Los pies son el origen del render. Se eliminan desplazamientos y giros de cuerpo completo en los gestos quietos. El movimiento de torso/manos proviene de las poses; la respiración apenas varía la altura alrededor del apoyo.
- Los recortes se calculan por componentes alfa conectados, reutilizando `isolateAtlasRGBA`; las filas generadas no se suponen perfectamente uniformes. Así no se incluyen botas o cabezas de una fila vecina. Pivotes de pies y alturas de referencia quedan en el manifiesto.
- Clips y fotogramas reutilizados por identidad de recurso. Las secuencias conservan la misma clave de caché entre actualizaciones; no se crea otro canvas por cada fotograma de marcha. La revisión posterior elimina el fundido entre poses: perdía opacidad y duplicaba el contorno. Se dibuja una pose nítida por fotograma; el fallback conserva la altura del protagonista durante la carga.
- `OUTCOME_LOOP` mantiene la posición final y un gesto vivo. No reinicia el reto, no reautoriza otra tirada y no teletransporta al protagonista al origen. Nueva entrada o Reiniciar del visor crean otra demostración.
- Pergamino, instrumento, vendas, moneda, sombrero y libro se pintan en las manos/cabeza del personaje. Desaparecen los montajes de objetos flotantes de esas escenas. Las poses especiales se resuelven por URL del token, sin depender del nombre del personaje.

## Recursos y propietarios

Todos los derivados se guardan en `apps/web/ui/art/`. Fuentes, recortes, escala y semillas alfa en `skill-animation-v3.json`. Prompts completos en [el registro de ImageGen](SKILL_ANIMATION_V3_PROMPTS_20261107.json); se usó **ImageGen integrado**, con transparencia, no el CLI. Los PNG originales se conservan en el directorio de imágenes generadas de la conversación.

| ID / derivado | Fuente y original generado | Uso / propietario |
| --- | --- | --- |
| `skill-cleric-objects-v3.webp` | Mía, `/art/tokens/cleric.png`; `exec-7e70ea86-02a7-4d71-bb32-5e942eb4790f.png` | 36 poses con objetos; `skill-actor-sequences.ts`. |
| `skill-wizard-objects-v3.webp` | Mike, `/art/tokens/wizard.png`; `exec-e9b74ced-bcf9-4f6d-9e06-becf235a9ea6.png` | 36 poses con objetos; mismo propietario. |
| `skill-rogue-objects-v3.webp` | Trinity, `/art/m3/trinity/maria_base.png`; `exec-d3008ec4-3aba-46ce-9768-21558aceae31.png` | 36 poses con objetos; mismo propietario. |
| `skill-cleric-motion-v3.webp` | Misma identidad; `exec-95c93be6-d88e-467f-bb6d-79917ce86191.png` | 36 poses: diálogo, equilibrio, salto/caída, alcance, inspección/estornudo y animales. |
| `skill-wizard-motion-v3.webp` | Misma identidad; `exec-fcbf6d9a-3507-47e3-90c9-ad997b1e2e71.png` | 36 poses de movimiento y gestos. |
| `skill-rogue-motion-v3.webp` | Misma identidad; `exec-911f9886-7c8c-4267-aa34-15bb7dedb829.png` | 36 poses de movimiento y gestos. |
| `skill-environment-v3.webp` | Utilería del visor; `exec-0fe5d6ee-79b2-462a-ac28-ee8bbaee9063.png` | 16 imágenes: runa, mesa, arbusto, piedra, señal, escudo con soporte, rastros, cuatro estados del mecanismo y cuatro de lechuza; `skill-prop-sprites.ts`. |
| `skill-people-v3.webp` | Secundarios existentes; `exec-077f73a6-3400-493f-9f03-505ced1a1479.png` | 36 poses: guardia, comerciante, bandido, viajero, paciente y público. |
| `skill-horse-v3.webp` | Caballo castaño existente; `exec-145b4ca3-af48-4414-8c2a-09bd92cf0beb.png` | 12 poses de orejas, cuello, calma y empujón; altura de referencia 154 unidades frente a las 85 de Mía. |
| `skill-handshake-v3.webp` | Los tres protagonistas y comerciante; `exec-b519b368-74b5-4de8-b35b-0cdfd9fc9f8d.png` | 18 poses conjuntas, seis por protagonista. Contacto de manos pintado en el mismo recurso. |
| `skill-medicine-pair-v3.webp` | Los tres protagonistas y paciente; `exec-1ec88ba4-d318-4199-ace6-1031309a7586.png` | 18 poses conjuntas: examen, herida, vendaje aplicado y enredo; no altera PG. |
| `skill-animal-reach-v3.webp` | Los tres protagonistas; `exec-27288e40-1c47-407e-82d1-5f9d5fd4b90f.png` | 18 poses de alcance: Mía y Trinity levantan la mano; Mike la ofrece a la altura de la cara. El caballo conserva su propio tamaño y sus doce poses. |

Los atlas v2 de carrera y sigilo siguen reutilizándose. Otros tokens de campañas mantienen su catálogo y el fallback existente; si carecen de una pose con objeto debe autorizarse/generarse su derivado de identidad, sin inventar una identidad o competencia. Los nuevos recursos no sustituyen sprites de la partida ni modifican mapas.

La preparación se reproduce con `scripts/prepare-skill-animation-art.mjs <directorio de PNG originales>` y el registro `SKILL_ANIMATION_V3_SOURCES_20261107.json`. Requiere Sharp para codificar WebP; `DUNGEONS_SHARP_MODULE` permite indicar su instalación de herramientas. No genera imágenes ni necesita una API. Las dos variantes conjuntas de caballo estudiadas se descartaron porque no conservaban la escala relativa; se usa el caballo separado con las poses nuevas de alcance.

## Registro de la revisión numerada

| Nº | Cambio integrado | Criterio visual / VA |
| --- | --- | --- |
| 1 | Inicio fuera de la cuerda con respiración, salto inicial, pasos de equilibrio, salto final o caída completa entre la bruma. | VA-10/12: pies sobre la cuerda durante el cruce; el fallo ya no termina en un agarre detenido. |
| 2 | Superficie que se desplaza durante carrera, dado y preparación. La grieta se descubre gradualmente y el suelo se disuelve después del despegue. Fallo: caída hacia la bruma. | VA-07/10/16: reloj continuo, sin borrar la superficie al cambiar de fase. |
| 3 | Cristal con runas grabadas, facetas, ámbar y sombra azul verdosa. | VA-01/02/06, referencia del usuario y REF-08 para lectura de objeto. |
| 4 | Guardia con seis poses. Sombrero pintado en cada protagonista, ajuste y sombrero torcido al fallar. | VA-10: sin bigote falso sobre una barba. |
| 5 | Escudo sobre caballete; pergamino incorporado al protagonista. | VA-06/07: ambos objetos tienen apoyo/contacto. |
| 6 | Público de tres personas, poses de aplauso; instrumento pintado en manos de los tres protagonistas. | VA-06/10/16: ensayo y recepción del público distintos. |
| 7 | Bandido con huida/risa; «¡Ja, ja, ja!» animado sin burbuja. | VA-10/16: lectura de la burla y postura firme. |
| 8 | Cuatro estados coherentes del mismo mecanismo; palanca, engranajes y tapa pertenecen a la misma caja. | VA-06/07: conserva huella y articulación. |
| 9 | Mesa de roble, moneda en los dedos del protagonista; caída, rebotes y rodadura hasta salir del encuadre. | VA-06/10: la moneda suelta tiene su propio trayecto. |
| 10 | Paciente con corte y sangre pequeña, brazo atendido y venda aplicada en una secuencia conjunta; fallo con enredo. | VA-07/10: contacto real de manos y herida; sin modificación de PG. |
| 11 | Aproximación, inspección arrodillada, toque, respuesta de hojas y estornudo dibujado; cuatro plantas. | VA-08/10/16: esporas después de tocar, raíces sobre suelo. |
| 12 | Arbusto detallado y lechuza con alas en cuatro posiciones. | VA-08/10/16: descubrimiento o despegue por detrás. |
| 13 | Gestos de escucha y diálogo, seis poses del viajero. | VA-10: inquietud y comprensión; no detector de mentiras. |
| 14 | Secuencia conjunta de apretón por protagonista; mesa construida y apoyada. | VA-06/07/10: manos unidas en el recurso, personajes completos. |
| 15 | Libro abierto con páginas y dedos integrados en el protagonista. | VA-06/10: lectura, consulta y confusión conservan el objeto. |
| 16 | Piedra de pizarra con volumen; pasos en el suelo, postura agachada y reacción del guardia. | VA-07/10/16: sin elevación artificial de los pasos. |
| 17 | Rastros proyectados sobre la superficie, brillo suave al identificar; señal con poste y herrajes. | VA-06/07/10: avance y vuelta mantienen la cota del suelo. |
| 18 | Caballo de tamaño mayor, doce poses, caricia y empujón; alcance ajustado a la altura del protagonista. | VA-07/10: pezuñas apoyadas, relación de tamaños y hocico/mano. |

## Evidencia y aceptación

Las capturas y el informe quedan en `output/skill-transition/correcciones-v3/`. Se comparan los bucles ambientales a 400 ms, Mía, 1280 × 720 y el mismo encuadre. El comportamiento inicial de Acrobacias y el suelo de Atletismo cambian por este encargo; no se presentan como poses idénticas. Las comparaciones usan superposición, teclado y ampliación mediante `scripts/lib/visual-comparison.mjs`.

Estado de esta ficha: candidata construida; la validación técnica y visual de la entrega se registra en la ficha [PLAYER_SKILL_TRANSITIONS_20261106.md](../evidence/PLAYER_SKILL_TRANSITIONS_20261106.md). La aceptación artística del usuario y las pruebas físicas siguen separadas.
