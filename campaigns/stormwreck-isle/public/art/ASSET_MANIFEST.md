# Manifiesto de arte público — Alpha 0.2.1 RC1

Generado el 2026-09-13 con la herramienta ImageGen integrada de Codex, en modo de generación de imagen, para este proyecto local. No usa archivos oficiales, atlas descargados ni las imágenes de referencia como entrada binaria. Los resultados no se declaran CC0 ni se sublicencian; su uso queda sujeto a las condiciones aplicables de OpenAI y a los derechos del usuario sobre el proyecto.

| Archivo | Prompt resumido | Cambios posteriores |
|---|---|---|
| wreck-deck.png | Battlemap pixel art JRPG táctico, cenital con inclinación suave, pecio horizontal reconocible, timón en popa, palo mayor, balista, cubiertas de madera, rocas, oleaje y huesos marinos; sin fichas, texto, UI ni cuadrícula | Copia directa; la cuadrícula se dibuja en runtime |
| wreck-approach.png | Vista exterior pixel art táctica del mismo pecio entre rocas y restos de criatura marina, bote vacío en primer plano; sin fichas, texto, UI ni cuadrícula | Copia directa |
| token-atlas.png | Cuatro fichas pixel art tácticas separadas: mago, clériga, pícara y arpía; siluetas legibles desde arriba y a escala pequeña | Se conserva como fuente |
| tokens/*.png | Derivados del atlas anterior | `scripts/process-token-atlas.py` elimina por flood-fill el damero horneado, recorta las cuatro regiones y exporta PNG 256×256 con fondo transparente |
| objects-v2/wreck-objects-room-v2.png | Interior táctico pixel art de pecio, dos cámaras separadas por tabique central con un único hueco de puerta, madera húmeda, salitre, faroles y agua en bordes; fondo limpio sin objetos móviles, fichas, texto ni cuadrícula | ImageGen integrado; segunda pasada para abrir el hueco central; ajustado a 576×432 RGB mediante `scripts/process-object-art.py` |
| objects-v2/door-closed-v2.png | Puerta naval cerrada de madera oscura con herrajes, pixel art táctico oblicuo, aislada sobre transparencia | ImageGen integrado; recorte alfa y exportación 128×128 RGBA mediante `scripts/process-object-art.py`; tamaño lógico 48×64 |
| objects-v2/door-open-v2.png | Hoja y marco de puerta naval abierta, paso central libre, pixel art táctico oblicuo, aislada sobre transparencia | ImageGen integrado; recorte alfa y exportación 128×128 RGBA mediante `scripts/process-object-art.py`; tamaño lógico 48×64 |
| objects-v2/crate-horizontal-v2.png | Caja naval alargada 2×1 con tablones y herrajes, pixel art táctico oblicuo, aislada sobre transparencia | ImageGen integrado; recorte alfa y exportación 192×96 RGBA mediante `scripts/process-object-art.py`; tamaño lógico 96×48 |
| objects-v2/crate-vertical-v2.png | Variante dibujada 1×2 de la misma caja, sin rotación automática del PNG, aislada sobre transparencia | ImageGen integrado; recorte alfa y exportación 96×192 RGBA mediante `scripts/process-object-art.py`; tamaño lógico 48×96 |

Las tres imágenes de referencia del usuario permanecen en `OneDrive_1_12-9-2026/Referencias estilo/`, fuera de los assets servidos y fuera del control de versiones. Se usaron como dirección visual descrita por el usuario, no se redistribuyen.

## Recursos objects-v3 — 2026-09-14

Los 30 PNG de `objects-v3/` se produjeron con ImageGen integrada de Codex para este proyecto y después se normalizaron a RGBA con transparencia real cuando corresponde. No se descargaron ni incorporaron assets de terceros. Se conservaron siluetas y anclas legibles para la cuadrícula y la cámara cenital suavemente oblicua; el runtime no rota automáticamente un sprite oblicuo para fingir otra perspectiva.

| Archivos | Prompt/dirección resumida | Tratamiento y uso |
|---|---|---|
| `wreck-deck-clean-v3.png` | Misma cubierta táctica del pecio, reconstruyendo los tablones de popa sin timón, soporte ni sombras horneadas | Fondo 576×432; evita una copia visual al separar la rueda |
| `wheel-mount-v3.png` | Soporte naval fijo vacío, visto desde arriba con leve inclinación | PNG transparente; permanece en el punto de montaje |
| `wheel-attached-{intact,damaged}-v3.png` | Timón vertical montado, legible en vista táctica, entero o astillado | Dos variantes transparentes; se compone una sola rueda sobre el soporte |
| `wheel-{caught,fallen}-{intact,damaged}-{0,90,180,270}-v3.png` | Timón separado, atrapado/erguido o caído, con cuatro orientaciones dibujadas y dos integridades | 16 sprites transparentes; no son rotaciones CSS de una imagen oblicua |
| `wheel-debris-v3.png` | Restos de aro, radios y madera astillada vistos desde arriba | Un sprite simétrico reutilizado por las cuatro orientaciones lógicas |
| `door-{intact,damaged}-{open,closed}-v3.png`, `door-destroyed-v3.png` | Puerta naval con herrajes, abierta/cerrada, entera/dañada y restos | Cinco sprites transparentes. Las cerradas se regeneraron en la pasada final como barrera estrecha en planta, mostrando canto/grosor y no una hoja frontal erguida |
| `crate-{damaged,destroyed}-{0,90}-v3.png` | Caja naval 2×1 dañada o rota, vista táctica superior en ambas orientaciones | Cuatro sprites transparentes preparados para huellas 2×1 y 1×2 |

La previsualización DM usa estas mismas variantes y muestra además la huella válida/inválida; jugador y proyector sólo reciben el estado aplicado. La rueda montada conserva lectura circular porque su plano físico es vertical. La aceptación física decidirá si necesita un escorzo elíptico más fuerte; no se declara defecto ni se sustituye sin comprobarlo en la pantalla real.

**Revisión física 2026-09-15:** la puerta abierta/cerrada todavía tiene incoherencia artística. La abierta parece una hoja frontal/erguida y la cerrada una barra cenital horizontal; ambas carecen de marco/bisagra visual común aunque la colisión funciona. Dos capturas del usuario se conservan en `docs/evidence/`. El próximo contrato visual de Astra debe fijar la misma puerta y perspectiva para todas las variantes; no atribuir PASS físico al conjunto v3 de puerta por la generación anterior.

Desde esta candidata, antes de producir un recurso nuevo se aplica la criba de reutilización documentada en `docs/OPEN_SOURCE_REVIEW.md`. Los candidatos externos estudiados no forman parte de este manifiesto mientras no se adopten de manera explícita con licencia, origen y transformaciones registrados.

## Recurso ambiental M5 — 2026-09-25

`ship/water-ripples-m5-candidate.png` se generó con ImageGen integrada de Codex a partir de un prompt original para oleaje/espuma repetibles. Es un material ambiental (no mapa ni suelo completo) que Babylon comparte entre el agua exterior y las casillas acuáticas. No se declara CC0 ni arte oficial; permanece candidata hasta revisión visual. SHA-256 `8FE9FE1A27A6AB4B3B42D97A2F54DB664E7B8DBBDABB479BABB7141B87FD81BA`. Procedencia e integración están en `campaigns/stormwreck-isle/private/m5/ART_WORKLOG_20260925.md`.
