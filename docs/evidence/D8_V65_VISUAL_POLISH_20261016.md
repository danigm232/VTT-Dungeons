# D8 Night V65 — pulido visual por escenarios

Estado: pulido de los seis mapas implementado, revisión visual y compilación terminadas el 18 de octubre. V65 instalada mediante activación protegida, después de confirmar que ya no había una mesa abierta.

## Alcance y método

Se conserva V64 como referencia en `campaigns/one-shot/playground/historico/`. La revisión utiliza `WorldRenderer`, las fichas y la cámara reales de los jugadores, con instantáneas locales aisladas: no conecta con una mesa ni modifica partidas guardadas.

Orden: Templo → Fritz → Mercado → Café → Espejo → Cena. Las imágenes y los informes están en `output/d8-polish-20261016/`.

El perfil real actual permite 15°, 25° y 35° con giro horizontal ±30°. Se conserva ese perfil, incluidos los cambios de cámara que ya tenía el usuario. Se capturan las nueve combinaciones de inclinación/giro en tres distancias, además de día, atardecer, noche, límites del interior y combate. Las transiciones visuales se dejan terminar antes de copiar los lienzos WebGL reales; no se reconstruyen ni retocan las capturas.

La vista de desarrollo de Vite produjo referencias caducadas a sombreadores. Se sustituyó solamente el servidor de revisión por una compilación ESM estable (`scripts/d8-polish-server.mjs`). Los informes finales no deben contener esos errores. La advertencia de empaquetado sobre un import lateral de sombras pertenece al módulo de Stormwreck; los mapas D8 utilizan su registro propio, y se comprueba el resultado renderizado.

El coste de fotograma se mide mediante 24 muestras después del calentamiento, con finalización de GPU. Es una comparación local, no una garantía de FPS en otros equipos. La memoria de texturas es una estimación RGBA8/mipmaps, no la memoria total del controlador.

## 1. Templo

Problemas observados: juntas oscuras que dominaban la piedra, tejas enormes/estiradas y con bloques de color muy contrastados, granito y remates planos, exceso de azul en la luz indirecta y puertas casi negras desde su cara sombreada.

Cambios: mortero más discreto, variación mineral y desgaste fino, escala de textura consistente en suelo y cubierta, cubierta de teja cocida más cálida, superficies pétreas de los remates con textura, sol existente más presente y rebote cálido en la veta de las puertas. Sin nuevas mallas, cambios de colisión ni recolocación de objetos.

Comparaciones: `d8-temple-polish-before-{far,mid,near}.png` y `d8-temple-polish-after-{far,mid,near}.png`; hojas de ángulos y variantes de iluminación con el mismo prefijo. Completadas 33 vistas por etapa, sin errores de carga. Revisadas las hojas de ángulos interiores y las vistas exteriores. Se mantienen 1037 mallas y 1251 llamadas de dibujo; texturas estimadas 65,90 → 67,15 MiB. Mediana local 32,6 → 34,4 ms (muestras cortas, no promesa de FPS).

## 2. Jardín de Fritz

Auditoría: la cubierta ya aparece fuera y desaparece dentro; dominaban el azul uniforme, las coníferas lisas y la madera estirada. Se han ajustado los UV de la cabaña, acabado de cedro/envejecido de sus remates, teja de arcilla oscura a escala, grano de acículas en los abetos y nieve granular. Luz solar y ambiente más equilibrados sin quitar el control horario del DM.

32 vistas antes/después, sin errores de carga. Revisadas hojas de exterior/interior: cubierta completa fuera, interior despejado. No se añadieron objetos; la separación de materiales modifica la agrupación de mallas (647 → 651; llamadas 681 → 699). La primera mediana de 26,3 ms estaba afectada por trabajo concurrente. Repetición final sin compilación: 20,4 ms / p95 26,6 ms, 76,98 MiB de texturas estimados. La referencia anterior fue 18,2 ms; las muestras de días/cargas diferentes no prueban una igualdad de FPS. El coste de dibujo aumenta un 2,6 % y queda documentado.

## 3. Mercado

Auditoría: madera y piedra demasiado azuladas, toldos sin contraste de material, herrajes planos. Se ajustan roble, piedra y pavimento, escala de veta en puestos/cajas/abrevadero, hierro forjado y respuesta mate de los tejidos. Sin recolocar puestos ni personajes. 32 vistas antes/después, sin errores. Revisadas las hojas de ángulos y luz. Resultado: 1195 mallas, 691 llamadas, 84,45 MiB estimados; mediana local 15,8 ms.

## 4. Café

Auditoría: veta sobredimensionada, cubierta casi negra, mampostería de la chimenea plana y rectángulos de las ventanas impresos sobre el suelo durante el recorte de la fachada. Ajustados roble oscuro, tablones, superficies de mesa y piedra ahumada; gradiente de temperatura sobre las llamas existentes. El recorte de fachada ahora llega a ocultación completa e incluye los cristales, sin modificar el estado de ventanas/puerta o sus colisiones. La comprobación visual confirmó que la unión del suelo por sí sola no resolvía esos rectángulos; se corrigió también su causa en la fachada.

Las 24 piezas del suelo conservan sus vértices y UV pero se dibujan juntas con el mismo conjunto de luces, ahorrando 23 mallas/llamadas. 32 vistas antes/después, cero errores. Comprobados cubierta cerrada desde fuera, interior despejado y llamas visibles desde ambos giros. Mantiene la penumbra de taberna. No se certifican nuevos comportamientos de PNJ: no se han cambiado en este pulido.

## 5. Espejo

Auditoría: la textura de nieve estaba sobredimensionada y los cambios de luces por pieza producían cuadrados visibles. El marco de la reliquia se veía verdoso. Se mantiene toda la geometría facetada y su recorte frontal; se añade grano fino, relieve propio del hielo, UV de tamaño real y acabado plateado. Suelo y prolongaciones comparten cuatro fuentes locales existentes para evitar saltos de luz. No se altera el hielo peligroso ni las plataformas.

32 vistas antes/después, cero errores. Inspeccionadas vistas medias y la hoja de nueve detalles. Resultado: 393 mallas, 249 llamadas, 42,40 MiB de texturas estimados; mediana local 4,5 ms / p95 5,7 ms. Las columnas decorativas delanteras siguen ocultándose según cámara.

## 6. Cena

Auditoría: adoquines con juntas excesivamente grandes/oscuras, revoco y muebles azulados, cubierta con textura estirada. Se reutilizan pavimento de Sylvania, madera de roble, revoco de cal, piedra y teja cocida, con escalas de textura por superficie. Se mejora el equilibrio solar/ambiental, conservando día/noche y el control DM. Durante el después se detectó una transición de material en la prolongación lejana: se corrigió también esa superficie y se repitió la auditoría.

32 vistas antes/después, cero errores. Cubierta cerrada en exterior, recorte interior y patio comprobados. 725 mallas, 540 llamadas, 55,15 MiB estimados; mediana local 8,7 ms / p95 9,7 ms. Sin modificar sillas, muebles, colisiones o accesos.

## Resultado de cámaras y pruebas

193 vistas finales (33 Templo + 32 por cada otro mapa) y sus referencias antes. Ningún error capturado. Se conserva la definición de escena durante todas las revisiones. Evidencias PNG reales, sin retoque, e informes JSON por mapa en el directorio indicado arriba.

El 18 de octubre pasan **22 archivos / 134 pruebas D8** (cliente y servidor), incluyendo cámara, recorte, clima, entorno Sylvania, paquete Playground, navegación, saltos, puertas, asientos, ventanas, sigilo, caballo y final narrativo. No significa que se haya simulado manualmente cada interacción en cada cámara.

La nueva dependencia compartida de cámara se incluyó en el generador oficial y en su prueba de empaquetado; no se modificó su comportamiento. `playground_current.json` y `playground_v65.json` vuelven a contener las fuentes y dependencias actuales.

## Protección funcional

`scripts/audit-d8-polish.mjs` compara con V64: CANON, MAP completo, posiciones iniciales, configuración de cámara, etiquetas y seis funciones de navegación/interacción. El pase final del 18 de octubre confirma todos esos datos intactos en los seis mapas.

La primera comprobación detectó la mesa `d8-night-private` abierta. No se cerró ni descartó desde esta revisión. Una comprobación posterior confirmó que ya no había escritores activos, y la activación protegida terminó correctamente.

Compilación completa desde `runtime/prepared-v65-visual-polish-20261018-r1/`, instalada ahora en `dist/`. Pasan TypeScript cliente, empaquetado de producción y TypeScript servidor. Comprobados los tres últimos acabados en el renderer instalado. La compilación anterior se conserva recuperable en `runtime/previous-build-*`; no se modificaron los guardados. Reiniciar el VTT/cargar de nuevo la página para ver esta versión.
