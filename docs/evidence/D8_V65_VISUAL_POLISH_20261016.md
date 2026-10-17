# D8 Night V65 — pulido visual por escenarios

Estado: trabajo en curso. No es una certificación de los seis mapas terminados.

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

32 vistas antes/después, sin errores de carga. Revisadas hojas de exterior/interior: cubierta completa fuera, interior despejado. No se añadieron objetos; la separación de materiales modifica la agrupación de mallas (647 → 651; llamadas 681 → 699; texturas 74,20 → 75,70 MiB). Mediana 18,2 → 26,3 ms durante trabajo concurrente: pendiente repetir en reposo al cierre, no interpretar como resultado estable.

## 3–6. Escenarios pendientes

Mercado, Café, Espejo y Cena aún no se consideran auditados ni entregados en esta versión.

## Protección funcional

`scripts/audit-d8-polish.mjs` compara con V64: CANON, MAP completo, posiciones iniciales, configuración de cámara, etiquetas y funciones de navegación/interacción. El primer pase confirma todos esos datos intactos. Debe repetirse al finalizar.

La compilación TypeScript del cliente ha pasado durante la fase del Templo. La aplicación instalada todavía no se ha sustituido.
