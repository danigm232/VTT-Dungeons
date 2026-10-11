# Rosa de los Vientos · detalle, natación y buceo · 10–11/10/2026

## Auditoría y alcance

Se contrastó el contenido con el capítulo 3 del PDF local y su mapa C1–C9.
Las siete capturas de defectos y la octava, tabla de técnicas, determinaron
este pase. El PDF es referencia descriptiva, no sustituto de la dirección
artística. Se conservaron barco continuo, cuadrícula de 1,5 m, perfil
63 × 21,1 m, escora, rutas, encuentros, inventario y secretos existentes.

| Defecto aportado | Causa localizada | Corrección implementada |
|---|---|---|
| Nido artificial | Anillos regulares de `wreck-age-details` y otro tejido duplicado en `wreck-exterior` | Se eliminan ambos. `wreck-nest` construye un cuenco asimétrico deprimido, 260 ramas curvas cruzadas, 500 fibras, retales, huesos y metal; siete lotes, dentro del radio no transitable de 1,2 m |
| Timón desplazado y pedestal esquemático | Anclaje demasiado próximo al extremo de popa en `wreck-runtime-v6`, soportes de `ship-props3d` | Recolocado en C3, eje longitudinal a −22,5 m, mirando a proa; pedestal de madera, riostras, eje y plinto. Migración v5 solo desplaza el timón todavía montado; conserva uno desprendido y sus consecuencias narrativas |
| Huesos como tubos angulares | Obstáculo antiguo de `wreck-ocean` y cuatro apoyos segmentados | `wreck-dragon-bones`: techo craneal hueco, arcos orbitales abiertos, mandíbulas, dientes, cuernos rotos, vértebras y costillas. Apoyos con curva suave. Geometría volumétrica y erosionada, no billboard repetido; limitada a las huellas ya bloqueadas |
| Triángulo negro en la rotura | Triangulación en abanico de un contorno cóncavo del espejo de popa | Espejo dividido en tablas convexas alrededor de la boca irregular. `wreck-breach` añade profundidad, suelo, cuadernas y cantos visibles. El labio roto alcanza −2,78 m, unos 27 cm sobre la cota media del mar, como adaptación de lectura; C9 y su ruta siguen sumergidas |
| Entrada sin descenso visible | P16 cambiaba directamente de superficie | P16 inicia una transición temporizada `dive`, interpolando posición y altura; publica `swim`, `dive` o `rowboat`. El nadador se representa con el cuerpo bajo el agua; al llegar a popa la cámara de seguimiento elige una vez el lado abierto, sin bloquear los ocho giros manuales ni cambiar el encuadre compartido del DM |
| Muebles planos y aparentemente aleatorios | Acabado uniforme y representación rudimentaria de los objetos canónicos | Madera con relieve, cajones y riostras del escritorio, sillas deterioradas, telas deformadas y almohadas combadas. C4–C7 permanecen bajo C2/C3. No se añaden muebles, recipientes, tesoros o encuentros ajenos al capítulo |
| Agua entre suelo y costado en C8/C9 | Suelos rasterizados por casillas frente a paredes continuas y ausencia de cierres en extremos | `wreck-floor-closure` rellena solo márgenes visuales hasta el forro interior y cierra extremos. `wreck-interior` completa los costados; permanece únicamente la entrada central de C9. Fondos reales bajo las dos escaleras; se preservan huecos de descenso y eje C4/C8/C9 |

También se encontraron y corrigieron normales invertidas que oscurecían el
cuenco, el cráneo y las telas; estas últimas ya no atraviesan una caja plana
de manta. La clonación de materiales copiaba una `DynamicTexture` sin sus
píxeles, borrando la inscripción C6: ahora se reutilizan las texturas
originales. Los restos lejanos incorporan tablas de casco junto a sus
cuadernas, para no parecer rastrillos aislados sobre el mar.

En la quinta orientación de la cofa el mástil ocultaba parcialmente la
ficha. `structure-occlusion` comprueba tres rayos reales hacia la cámara:
atenúa solo el componente que tapa al personaje y recupera su opacidad
al girar. Se comprobaron ambos lados en el navegador, sin cambiar colisiones.

La brecha muestra geometría interior real, con una zona localizada de agua
más clara. No contiene una imagen de una habitación ni botín pintado. Desde
el lado opuesto del barco, el casco puede ocultarla físicamente; no se hace
transparente todo el barco para mostrarla desde cualquier ángulo.

## Tabla de acabado solicitada

Aplicación exclusiva al pecio en `wreck-finish`; D8 y los campamentos no
reciben este acabado. No se añaden luces automáticas a sus antorchas.

| Técnica | Aplicación efectiva | Límite técnico |
|---|---|---|
| Ambient occlusion / contacto | Oscurecimiento estático en bases de mamparos, mástil y bordes, más sombras de contacto de muebles | No es SSAO en pantalla ni simulación de iluminación global |
| Texturas multiescala | Tablazón existente, microrrelieve normal compartido y humedad/variación macro en coordenadas del mundo | No se aumenta la resolución para disimular defectos geométricos |
| Decals | Cinco lotes por planta de manchas irregulares pequeñas, sin colisiones | Son geometría superficial agrupada, no nuevos obstáculos |
| Lightmaps | Siete mapas de contacto de 256 × 256, UV2 por posición mundial; `useLightmapAsShadowmap` | Horneado analítico de contacto, no bake de luces ni GI. No aportan emisión a la bodega |
| Color grading | Paleta moderadamente desaturada, sombras frías, luces algo cálidas y contraste contenido | No sustituye la geometría ni levanta artificialmente la oscuridad de C9 |
| Mipmaps y filtrado anisotrópico | Muestreo trilineal y anisotropía hasta 8× según dispositivo, conservando las texturas originales | El límite real depende de la GPU |

La iluminación portátil y las sombras existentes siguen siendo dinámicas.
C8 conserva 15–45 cm de agua y terreno difícil; C9 conserva inmersión,
peces, burbujas, cáusticas dependientes de luz y oscuridad sin luz portada.
Las reglas de respiración, tiradas y resolución narrativa siguen a cargo del DM.

## Comprobaciones

- Suite completa: **535/535 pruebas, 72 archivos**; informe
  [`test-results.json`](../../output/pecio-detail-20261010/test-results.json).
  Incluye prueba de detección de oclusión por ángulo/altura y conservación
  de colisiones de la estructura.
- Tipos cliente/servidor y compilaciones de producción comprobados.
- Prueba de red aislada: **239 pasos, dos jugadores y proyector**;
  C1–C9, cuatro puertas abiertas por jugador, visibilidad individual,
  natación, descenso temporizado por P16, escalada de 15 m, guardar/reiniciar,
  posiciones independientes y estados conservados. Informe
  [`playability.json`](../../output/pecio-detail-20261010/playability.json).
- Navegador Babylon real: **69 capturas estáticas y 61 diagnósticos**,
  cenital, sin texturas, ocho orientaciones exteriores y ocho cercanas de
  nido, huesos, entrada de popa, C8 y C9; camarotes desde dos lados;
  noche con/sin luz y C9 sin luz. Sin errores ni texturas pendientes.
  [`visual-audit.json`](../../output/pecio-detail-20261010/visual-audit.json).
- Reproducción visual del recorrido completo del servidor, incluidos puntos
  intermedios de buceo y escalada, con **14 capturas adicionales**. No mueve
  ni modifica la partida real. La vista inicial de natación por popa y el
  giro manual se comprobaron también mediante los controles del visor.

### Capturas reales

- [Nido cercano](../../output/pecio-detail-20261010/wreck-crow-angle-0.png).
- [Huesos, lateral](../../output/pecio-detail-20261010/wreck-bones-angle-3.png),
  [frontal](../../output/pecio-detail-20261010/wreck-bones-angle-1.png) y
  [posterior](../../output/pecio-detail-20261010/wreck-bones-angle-5.png).
- [Entrada de popa](../../output/pecio-detail-20261010/wreck-detail-breach.png).
- [C8, márgenes cerrados](../../output/pecio-detail-20261010/wreck-lower-deck-angle-0.png)
  y [C9](../../output/pecio-detail-20261010/wreck-hold-air-angle-2.png).
- [Interior C6](../../output/pecio-detail-20261010/wreck-detail-c6.png).
- [Natación](../../output/pecio-detail-20261010/wreck-walk-sea.png),
  [buceo en curso](../../output/pecio-detail-20261010/wreck-walk-dive-middle.png) y
  [escalada en curso](../../output/pecio-detail-20261010/wreck-walk-climb-middle.png).

## Límites y puesta en marcha

Las mediciones de coste de render están en el informe visual: 24 muestras
por zona, lienzo 900 × 617, redibujado forzado y sincronización GPU. Medianas
C1 12,4 ms, C4 8,3 ms, C8 3,6 ms y C9 3,2 ms; p95 C1 16,7 ms. No son
una garantía de FPS sostenidos ni representan un móvil o proyector físico;
otras compilaciones pueden competir por recursos durante la medición.

Se completa este pase de correcciones y detalle. No se declara «perfecto»
ni equivalente al acabado pictórico de Octopath o las referencias locales.
M5 conserva aceptación artística abierta; M7 conserva el ensayo prolongado
en los dispositivos reales y la escucha física del audio. Escala ampliada,
cofa centrada y lectura del labio de popa son adaptaciones documentadas, no
una reproducción literal de cada trazo del mapa oficial.

El launcher habitual ya compila al arrancar. Usar `INICIAR.cmd`; si hay
servidor abierto, su opción **A** guarda y reinicia la campaña seleccionada.
No recargar una mesa en curso mezclando cliente nuevo con servidor antiguo.
No se reinició ni cambió la partida real durante esta auditoría.
