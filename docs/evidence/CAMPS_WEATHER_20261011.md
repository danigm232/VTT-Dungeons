# Campamentos · fuego, clima, recortes y sombras V1.4.6

11 de octubre de 2026. Correcciones de los diez puntos de la revisión del
usuario, sobre las cinco escenas existentes. Los registros y capturas de
V1.4.5 se conservan en `output/camps-detail-20261011`.

## Cambios

| Petición | Implementación |
| --- | --- |
| 1. Brasas | Lecho de carbón irregular y fisuras incandescentes, con pulso suave, en las cinco hogueras. Las brasas se enfrían después de apagarse la llama. |
| 2. Troncos visibles al retirar copas | Cada árbol del claro agrupa tronco, ramas, raíces y follaje. La ocultación y restauración al girar afectan a todo el árbol. Los bordes del bosque también se retiran completos. |
| 3. Postes dentro de las tiendas | Postes, travesaño, cuerdas y estacas pertenecen a la estructura que se oculta al entrar. Se conservan los muebles y sus contactos de interacción. |
| 4. Luces durante el día | Hogueras, antorchas, velas y faroles quedan apagados. Se mantienen las piezas físicas. Anochecer, noche y amanecer recuperan la iluminación cálida; los cristales arcanos conservan su naturaleza ambiental. |
| 5. Nieve acumulada | Capa progresiva sobre las superficies expuestas, sin una segunda pasada de dibujo. Las normales orientan la nieve y los interiores de celdas/tiendas quedan protegidos. La lluvia derrite la nieve y oscurece el terreno. |
| 6. Fuego bajo lluvia | Débil: llama menor y más humo. Media: combustible visual que requiere Avivar fuego. Fuerte: llama que disminuye hasta apagarse en aproximadamente seis segundos, seguida de humo y brasas que se enfrían. |
| 7. Puerta de la tienda frontal | Las entradas se orientan hacia la hoguera, incluidas las tiendas que quedan al sur. Puerta física, hueco del terreno, punto interactivo y lecho se actualizan juntos. |
| 8. Tienda sobre el río | El cauce se desplaza al oeste, con sus celdas de agua, coste de navegación, piedras y vegetación de ribera. Tres árboles se recolocan. |
| 9. Extremos y corriente | Cauce continuo de −80 a +120 m, con extremos fuera de las vistas normales. Textura de corriente, ondas y 24 reflejos alargados animados en una sola malla. |
| 10. Sombras | Muebles, baúles, herramientas, tiendas y vegetación reciben sombras del sol/luna y de la fuente cálida activa más cercana. La profundidad del mapa de sombras se ajusta al diorama y las ocultaciones invalidan su caché. |

Añadir leña anima un tronco existente: se toma de la pila y se deposita en el
hogar junto al gesto del personaje. No se crean personajes nuevos ni se gasta
inventario. La recepción tardía del registro de interacción repone el fuego
una sola vez, aunque la animación ya haya terminado.

## Componentes y archivos principales

- `campaigns/camp-rests/public/camp-fire.ts`: comportamiento ambiental del fuego.
- `campaigns/camp-rests/public/camp-surface-effects.ts`: carbón, nieve/humedad y sombras compartidas.
- `campaigns/camp-rests/public/forest-stream.ts`: cauce compartido por render y terreno.
- `campaigns/camp-rests/public/outdoor-visuals.ts`, `a1-visuals.ts`, `camp-atmosphere.ts`, `visuals.ts`: integración en las cinco escenas.
- `campaigns/camp-rests/public/pack.ts`: puertas, lechos, río y árboles.
- `engine/client/interaction-animation.ts`, `camp-activity-visuals.ts`: leña y efectos de interacción coherentes con el fuego apagado.
- `engine/client/weather-surface.ts`: reloj de acumulación compartido con el sistema existente de D8; su comportamiento se conserva.
- `apps/web/world.ts`: clima, reloj de presentación y fases.
- `apps/web/dm.ts`, `dm.html`: novedades V1.4.6 al inicio, también en el módulo autónomo.
- `engine/server/game.ts`: recuperación de actores guardados en el antiguo acceso, también en el módulo autónomo.
- `scripts/camps-review.ts`, `camps-review.html`: controles de clima y capturas reales de Babylon.

## Comprobaciones

Las pruebas dirigidas cubren los cinco perfiles, recepción tardía/futura de
leña, apagado diurno, lluvia de las tres intensidades, brasas, postes,
recorte completo del árbol, huecos de puerta, río fuera de las tiendas,
celdas de agua, animación de corriente, acumulación y zonas cubiertas,
sombras receptoras, acciones emparejadas y recuperación de guardados.

El recorrido conectado utiliza DM, tres jugadores y proyector:
**681 pasos y 120 interacciones**, cambios de escena, colisiones, descanso,
interrupciones, guardar/reiniciar y reconexión. Se descargan completos los
recursos de imagen y audio. Registro: `output/camps-weather-20261011/playability.json`.

La auditoría visual recorre día/noche y ocho ángulos por escenario, además
de cada interior. Las capturas son renders reales, sin retoque. Los casos de
clima se guardan por separado con su intensidad y avance de tiempo.

## Coste y límites

- Sol/luna: mapa de 1024 px en PC y 512 px en perfil compacto.
- Una sola fuente cálida con sombras: 384 px en PC y 192 px en compacto.
- Sombras estáticas en caché; actualización limitada a 6 Hz durante las acciones.
- Carbón agrupado por hoguera; corriente en una malla actualizada a 20 Hz.
- Nieve y humedad sobre los materiales existentes, sin una pasada adicional.
- Presupuestos de mallas de la escena conservados en las pruebas. Las instancias de precipitación se cuentan aparte y comparten geometría.

Los tiempos de preparación inicial de gráficos no son rendimiento sostenido.
Las muestras breves del visor y la emulación del tamaño de móvil no sustituyen
una prueba prolongada en teléfonos y proyector físicos.

El estado térmico del fuego y la acumulación son ambientación de cada cliente;
no son un nuevo sistema de supervivencia persistente. La acumulación se retiene
al cambiar de escena en esa sesión y se reinicia al recargar. Las acciones,
posiciones, baúles y descanso siguen usando la persistencia existente.

El siguiente ensayo recomendado es sobre los dispositivos reales de la mesa,
con lluvia/nieve intensas y varios jugadores. La decisión sobre descanso,
tiradas y beneficios permanece en el DM.
