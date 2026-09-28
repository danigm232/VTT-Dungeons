# Rosa de los Vientos · fidelidad descriptiva y acabado visual

28/09/2026. El PDF de la aventura, capítulo 3 y mapa 4 (pp. 22–27), fija espacios, rasgos, accesos y acontecimientos. Las imágenes de `OneDrive_1_12-9-2026/Referencias estilo`, en especial `Imagen de Codex 22 sept 2026, 16_17_03-4.png`, fijan cámara, atmósfera y calidad pictórica. Ninguna composición de referencia sustituye la escena navegable de Babylon ni define secretos del libro.

## Hechos que deben poder verse

| Lugar | Descripción del libro | Traducción al escenario |
|---|---|---|
| Exterior | Naufragio de hace unos 40 años, sostenido por rocas y huesos de dragón; la mayor parte queda sobre el agua. | Casco envejecido negro verdoso, rotura de casco en popa bajo flotación, apoyos visibles en el arrecife, algas y percebes localizados. Edad aproximada, no abandono de siglos. |
| C1 y acceso | La barca se amarra a la jarcia del costado de estribor; cubierta resbaladiza con algas, botas, huesos y manchas de sangre recientes. | P01 legible desde barca y cubierta; objetos visuales separados, humedad legible y tránsito intacto. No se exige una tirada rutinaria por el arte. |
| C1 y cofa | Palo mayor casi vertical; escala de cuerda de 15 m; cofa con nido de virutas, hierba, tela, huesos, pelo y baratijas. | Mástil íntegro, escala y cofa de superficie propia; nido inicial sin arpía visible hasta su regreso; botín independiente. |
| C2 | Trinquete roto inclinado sobre barandilla partida, lona y jarcia hasta roca y huesos; balista oxidada inoperante. | Proa dañada, aparejo caído y balista claramente rota; sin sugerir que se pueda disparar. |
| C3 | Restos de mástil astillado y timón torcido, suelto; nombre Rosa de los Vientos grabado con nácar e invertido en su posición. | Timón independiente con estados; detalle de nácar por resolver sin incluir texto falso o ilegible. |
| Interior | Paredes mojadas negras y verdosas, algas/percebes; C8 con agua de 15–45 cm, C9 sumergida. | Materiales y luz por altura, preservando puertas, trampas y pistas secretas. |

La escala de trabajo de 66 × 22 m es una decisión del VTT para la navegación y visibilidad. El PDF usa cuadrícula de 1,5 m, pero no afirma esa longitud/eslora como dato narrativo.

## Seis entregas verificables

1. **Canon visual y funcional.** Inventario por zona contra pp. 22–27 y mapa 4; marcar canónico, interpretación visual y ampliación opcional. Base documentada aquí. Falta revisar con detalle fino la posición de cada objeto decorativo de C4–C9.
2. **Silueta y desgaste del casco.** Bordas partidas, volúmenes curvos, costillas visibles, rotura real de popa, textura desigual, algas/percebes. Primera intervención local añadida al costado exterior; la silueta global y proa aún necesitan un pase de modelado. Criterio: el casco debe leerse como embarcación rota a escala normal y en vista cercana.
3. **Cubiertas superiores y cofa.** C1, C2, C3, aparejos, balista, timón, cofa y nido, con materiales/objetos independientes. Criterio: cada rasgo del libro es reconocible sin rótulos, secretos y estados permanecen separados.
4. **Contacto con el arrecife.** Rocas, huesos, espuma alrededor del casco, restos y pecios lejanos; distinguir agua navegable de fondo. Criterio: el barco parece varado y las rutas por barca/nado siguen claras.
5. **Luz y ambiente.** Día con cubierta superior/principal iluminadas y C8 tenue; noche oscura; C9 sin sol. Viento/velas, bruma, oleaje y focos cálidos solo donde procedan. Criterio: legibilidad de jugadores y grid sin una apariencia plana.
6. **Resto del barco y prueba real.** Extender lenguaje visual a C4–C9; verificar caminos, oclusión, cámara, dos jugadores en distintas alturas, proyector y móvil; medir rendimiento. Criterio: completar el recorrido sin cambios manuales de mapa ni pérdida de posición.

## Primer incremento integrado

Asset propio `public/art/ship/c1-board-debris-art09.png`, generado con la herramienta integrada de imágenes como cutout RGBA (1254²). Se ancla a la cubierta real y no participa en clics ni colisiones. Costillas, percebes y algas son mallas decorativas en el contorno existente; la jarcia visual de P01 lleva de la borda hacia la barca. La geometría navegable, puertas, alturas y transiciones no se modifican.

Prompt final del asset, literal:

> Use case: stylized-concept. Asset type: transparent top-down environmental decal for a playable Babylon.js 2.5D fantasy shipwreck deck, placed as a separate object on existing geometry. Primary request: one irregular cluster of old salt-soaked debris on the main deck: collapsed worn sailor boots, a few scattered pale bones, subtle old dark-red stains, thin damp green seaweed fronds, and loose frayed brown rigging. Richly hand-painted dark fantasy RPG asset, grey olive and muted umber, directly overhead orthographic view, entire cluster inside square, genuine transparent background and gaps, no floor, no grid, no characters, no text, no border or watermark.

La inspección en proyector aislado (puerto 4470) y la prueba de terreno muestran que este incremento es pequeño en el encuadre de barco completo. Se conserva como pieza de C1, no como prueba de que el nivel de calidad visual de las referencias esté alcanzado. El siguiente pase debe reforzar la forma naval y revisar una vista cercana antes de multiplicar assets.
