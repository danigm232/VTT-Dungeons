# Retiro del Dragón · antorchas y focos · 06/11/2026

Bloque VIS-4 de la revisión 19. La candidata está compilada y servida en una partida de prueba en el puerto 4683. Revisión visual y aceptación pendientes. El navegador local de Work estaba desactivado durante la validación.

## Registro de piezas

Coordenadas Babylon en metros, en orden X, Y, Z. Se toma de REF-01 el contraste cálido junto a la llama sobre un fondo frío. REF-02 orienta el grosor de placas, madera y herrajes. Las piezas son derivadas propias con materiales del Retiro. [Biblioteca de referencias](../design/VISUAL_REFERENCE_LIBRARY.md) · [VA-10–12 y VA-16](../audits/VISUAL_GAP_AUDIT_20261101.md).

| Pieza / propietario | Antes | Candidata |
| --- | --- | --- |
| `R3_Upper_Torch_0…4` y `retreat:r3-wall-lamp-0…4`, `retreat-visual-revisions.ts` → `retreat-wall-torches.ts` | Tacos y llama facetada en el GLB R3. Luces en Y 65,4 / Z 20,35, con rango de 7 m. | Placa de hierro `#494441`, brazo, mango de roble existente y collar. Llama perfilada de 0,36 m, emisivo ámbar y oscilación vertical suave desde la mecha. Emisor a 0,128 m de su base, Y 20,18 y rango 5,6 m. El soporte y la luz obedecen al recorte de la pared. |
| Extremo del jardín, `retreat:torch:0` | X 82,5 frente a un hueco. | X 88,5, contra `South_Wall_West_Upper`. Los otros cuatro puntos mantienen X 94,5 / 105 / 121,5 / 130,2 y se ajustan en profundidad a la piedra. |
| `a1:room-1…6:torch-light`, `campaigns/camp-rests/public/a1-visuals.ts` | Soporte y mango con inclinaciones en ejes distintos. Rango 7,5 m. | Placa lateral, brazo y mango inclinados hacia la celda. Llama anclada al collar, rango 5,8 m y pulso más contenido. La variante se activa desde el ensamblaje del Retiro. |
| `a1:room-N:candle`, `candle-light`, `a1:statue-votive-flame`, mismo propietario | Vela de escritorio con foco separado. Llamas votivas agrupadas. | Foco de escritorio a la altura de su llama. Base de cada votiva en Y 0,44 local, sobre la cera. Se conservan los estados de encendido por hora y clima. |
| `retreat:existing-interior-fill:a3`, `retreat-refinement-lighting.ts` | [118,5, 20,4, 55,3], separado de la lámpara. | [122,03, 19,88, 55,67], centro de `Oil_Lamp_Dining_primitive1`. Se conserva el alcance interior. |
| `retreat:existing-interior-fill:a4`, mismo propietario | [103,5, 20,5, 57,75], separado de la lámpara. | [106,45, 18,98, 58,81], centro de `CANON_Glass_Study_Lamp_1_primitive2`. Se conserva el alcance interior. |

Las cinco luces del pasillo tienen receptores explícitos en su lado de la fachada y se integran con el color de las fichas. El pavimento combinado admite las cinco fuentes locales y sol/cielo mediante el presupuesto de su material. Se conservan las fuentes existentes y los mapas de sombra. El montaje, emisivos y receptores son VTT_AMBIENCE. Las lámparas de estudio conservan sus IDs y función.

## Validación

- 35 pruebas aprobadas en iluminación, recorte y presentación. Una regresión verifica que apagar u ocultar el soporte corta la luz y sus receptores quedan del lado exterior.
- El ensamblaje real del Retiro cargó sus GLB con Babylon NullEngine. Se comprobaron las cinco fijaciones a pared, la coincidencia de llama y emisor, los seis puntos de las celdas, los anclajes de A3/A4, día y noche, el recorte de biblioteca y la respuesta del color de la ficha. [Datos del modelo](../../output/retreat-fixtures-20261106/model-check.json).
- TypeScript y compilación de cliente y servidor completados. DM, DM móvil, jugador y proyector responden 200 y sirven el HTML de la candidata en 4683. Este acceso usa un guardado de prueba.
- Revisión de imagen, capturas equivalentes y coste GPU pendientes. La prueba NullEngine acredita geometría y estados del motor. El visor prepara siete encuadres del pasillo, biblioteca, comedor, cocina, celda y votivas con el renderer integrado. El modo `baseline` usa las seis fuentes anteriores archivadas con sus hashes. Para la entrega con imágenes se compararán los originales equivalentes mediante el componente compartido de superposición.

[Visor del Retiro](http://127.0.0.1:4681/review.html) · [Mesa de prueba](http://127.0.0.1:4683/dm) · [Candidata compilada](../../runtime/prepared-retreat-fixtures-20261106/prepared.json) · [Fuentes anteriores](../../prototypes/retreat-fixtures-20261106/baseline/hashes.json).


## Instalación autorizada

Candidata activada en el puerto 3000 tras confirmar el cierre con guardado y crear una copia privada. Los cuatro accesos sirven la compilación instalada y el paquete de iluminación contiene las antorchas nuevas. Los once grupos protegidos del guardado pasan la comprobación posterior. La revisión de imagen sigue pendiente.
