# M5 · cobertura de mar, interactuables y decoración

**Requisito del usuario, 25/09/2026.** Este inventario convierte “hacer el mar y todos los assets” en cobertura comprobable. Estado actual: se ha integrado una candidata por capas con espuma animada, texturas de cubierta/casco/arrecife, mallas propias para los props definidos del barco, iconos de botín y una barca pilotable con pasajeros. Sigue pendiente la aceptación visual y la QA física de M7. Véase la [implementación y procedencia de assets](M5_ART_LAYER_IMPLEMENTATION_20260925.md). El agua repetible original y los blockouts sin acabado no cuentan como assets finales.

## Alcance y reglas

- Pecio completo C1–C9, cofa, barca y mar que lo rodea, dentro del único mapa lógico `wreck-ship`.
- Cada objeto visible tendrá un asset ilustrado o una variante de una familia visual. Reutilizar una familia para objetos equivalentes está bien; dejar cubos/cajas genéricos o conservar nombres `practice-*`/`*-blockout` en el arte final no.
- Las variantes de estado deben ser legibles (cerrado/abierto, montado/caído, intacto/roto, recogible/recogido) y estar separadas del suelo. La información privada no se hornea en fondos: diario, talismán, tesoros y contenidos de contenedores sólo aparecen cuando el estado del juego los revela.
- Arte por capas y anclado a las coordenadas/alturas actuales. Nada de los assets artísticos cambia grid, navegación, colisiones, conexiones, selección o tamaño del barco sin revisión explícita del greybox.
- Cámara y acabado siguen el estándar visual HD-2D/2.5D del proyecto; no copiar píxeles de las referencias.

## 1. Mar y entorno exterior — blockout funcional integrado; arte final pendiente

**Avance revisión 47:** el greybox incorpora una franja continua de agua navegable de 9 m alrededor del casco. El arrecife, los huesos de dragón y los restos tienen celdas bloqueantes y formas Babylon no seleccionables; la franja permite rodear el casco y alcanzar la brecha de popa. `deep-sea-background-v1.png` pinta las casillas navegables; `deep-sea-background-art02.png` cubre el fondo escénico no jugable. La espuma transparente `sea-foam-art03.png` se anima solo sobre la geometría de agua real, con brisa y estela discretas. Se eliminaron el borde oscuro y las placas planas que sobresalían del mar pintado. El agua transitable conserva su relieve de oleaje y su grid atenuado. La barca ya se puede pilotar libremente con pasajeros y posición persistente. Restan aceptación visual y revisión de corrientes/espuma junto a arrecifes.

El archivo de ondulaciones existente (`water-ripples-m5-candidate.png`) sólo cubre una textura repetible candidata; no equivale al mar ilustrado de las referencias. Crear/revisar un conjunto que incluya:

- Superficie amplia de mar azul petróleo/turquesa, con variación de profundidad y lectura clara alrededor del casco.
- Capas animadas de oleaje, reflejos, espuma y estela junto al barco, arrecife y brecha; movimiento discreto y continuo, sin desplazar personajes ni el mapa.
- Espuma/corrientes en rocas y huesos sumergidos; transición visual de superficie a C8 inundada y C9 bajo el agua, sin añadir colisiones falsas.
- Decorado exterior: arrecife, grandes huesos del dragón, restos de naufragio y pecios distantes que se ven desde cubierta/cofa. Mantenerlos no transitables/no seleccionables salvo que el greybox aprobado diga lo contrario.
- Variantes de luz/ambiente para día y tormenta; lluvia, viento y bruma siguen como capas separadas y no sustituyen la superficie del agua.

## 2. Objetos interactuables y recogibles

Todo elemento de la lista tendrá arte propio o una variante utilizable en sus estados de juego:

| Zona | Objetos que deben recibir arte | Estados/lectura necesarios |
|---|---|---|
| Acceso exterior / C1 | Barca de expedición, punto de amarre, jarcia para abordar | Barca junto al casco; cuerdas tensas/colgantes; lectura de dónde se sube/baja |
| C1 / C3 | Timón y soporte | Montado; se suelta; atrapado; caído/desprendido; orientación/giro legible |
| C4–C7 | Cuatro puertas distintas, incluida la puerta atrancada de C4 | Cerrada, abierta y C4 con/sin tranca; conservar bisagra y grosor al abrir |
| C6 | Tablón levantable, mecanismo/dardo de trampa y bolsa con 200 po | Oculto/descubierto, armado/disparado y bolsa encontrada; el arte base no delata el tesoro |
| C8 | Tres contenedores, cuatro barriles (siete recipientes) y el objeto correspondiente a cada uno de los seis resultados canónicos | Cerrado, abierto y roto/saqueado si ese estado existe; verificar la tabla del PDF antes de hacer los seis assets; el resultado D6 lo elige el DM |
| C9 | Cofre de hierro, 55 po, tres turquesas, botas élficas, paquete encerado, diario y talismán de Aleitha | Cofre cerrado/abierto y sumergido/sacado; paquete dentro/fuera; diario y talismán sólo al revelarlos |
| C4 | Bolsa de 50 po, herramientas de cartógrafo, daga y brújula | Cuatro fichas de botín separadas; invisibles hasta abrir la puerta según el estado actual |
| Cofa | Pulsera, pendiente, dos ojos de tigre y heliotropo | Cinco recogibles independientes, sin duplicación |
| Varias | Cuatro antorchas apagadas | En suelo y en inventario; no dibujar llama encendida antes de que el sistema soporte ese estado |

### IDs actuales que deben auditarse

- Acceso/estructura: actor `wreck-rowboat`; puertos `P01`, `P10`, `P12`, `P13`, `P14` y `P16`; escaleras `stairs-c2-north/south`, `stairs-c3-north/south`, `stairs-c8`, `stairs-c9`; escotillas `c1-hatch` y `c4-shaft`.
- Interactuables: `wheel`/`wheel-mount-v3`; `c4-barred-door`, `c5-door`, `c6-door`, `c7-door`; `c6-trapped-stash`; `c8-container-01`–`03`; `c8-barrel-01`–`04`; `c9-iron-chest`/`c9-waxed-package`.
- Antorchas: `torch-c1-a`, `torch-c4`, `torch-c7`, `torch-c2`. Botín C4: `c4-gold`, `c4-cartographer-tools`, `c4-dagger`, `c4-compass`. Tesoro cofa: `crow-bracelet`, `crow-earring`, `crow-tiger-eye-1`, `crow-tiger-eye-2`, `crow-heliotrope`. C6 bolsa: `c6-gold-pouch`; C9 tesoro: `c9-chest-treasure`.
- Decoración/blockouts: `c2-flotsam`, `c2-ballista-blockout`, `c2-bowsprit-blockout`; `c4-bookshelf-blockout`, `c4-desk-blockout`, `c4-bed-blockout`; `c5-counter-blockout`, `c5-skeleton-blockout`; `c6-bunk-01`–`06`; `c7-table-blockout`, `c7-chair-01`–`04`; `c9-debris-01`–`02`. Los siete recipientes de C8 aparecen también en la lista interactuable.
- Estructura visual: oclusores de mástiles `c1-mast`, `c2-mast`, `c3-mast`, `crow-mast`; costillas `lower-ribs`, `hold-ribs`; paredes interiores `cabin-room-vertical-*` y `cabin-room-horizontal-*`; casco/bordas, jarcia, cofa y rampas deben tener módulos/artes equivalentes aunque no sean `PropDefinition`.

El botín que aún dependa de una tirada/elección del DM se presenta después de esa decisión; el fondo no debe revelar qué resultado salió. Los tokens de criaturas y las fichas de PJ son otro paquete (M3), no sustituyen los props de esta lista.

## 3. Decoración y arquitectura no interactuable

Reemplazar todos los blockouts y dar continuidad visual a:

- Casco, bordas/barandillas, costillas y paredes interiores; tablones rotos, huecos y bordes de la brecha.
- Mástil principal y secundarios, verga, velas desgarradas si encajan con el canon, jarcia y escala de cuerda, cofa circular y escaleras/rampas.
- Escotillas, marco de la caída vertical C4→C8→C9 y travesaños/curvas que distinguen cubiertas; deben conservar vacíos y rutas visibles.
- C2: restos del palo, balista oxidada e inutilizable y bauprés roto.
- C4: estantería, escritorio/brújula y cama. C5: encimera/cocina y esqueleto sin cabeza. C6: seis literas. C7: mesa y cuatro sillas.
- C8: decoración húmeda, cuatro barriles y desgaste/algas. C9: dos grupos de escombros/carga rota y piezas del casco sumergido.
- Exterior: arrecife, huesos del dragón, maderos flotantes y siluetas de otros pecios visibles desde la cofa.

## Criterios de cierre del paquete artístico

- [x] Mar exterior con textura/capas animadas y espuma integrado en la vista normal; revisión artística desde la cofa pendiente de aceptación.
- [x] Los interactuables y recogibles de la tabla tienen mallas/variantes o iconos tras revelarse. IDs de respaldo `practice-*` persisten por compatibilidad; no son los assets principales Babylon.
- [x] Los props decorativos enumerados tienen mallas independientes y huellas/capas conservadas; su detalle pictórico sigue sujeto a la evaluación del usuario.
- [x] Cada asset carga según escena/superficie/estado; secretos y botín no se ven antes de revelarse (regresiones automatizadas y QA anterior de inventario).
- [ ] QA física con grid visible/oculto, dos jugadores, DM y proyector; probar rendimiento en dispositivo real. Este gate corresponde a M7.
- [ ] El usuario acepta por separado el aspecto visual. Hasta entonces, M5 sigue pendiente.
