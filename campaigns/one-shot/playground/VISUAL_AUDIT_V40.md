# D8 Night — pasada artística V40

## Alcance y protección

Mejorados exclusivamente `cafe` (TABERNA), `garden`, `market` y `mirror`, dentro del renderer Babylon real que comparten el Playground y el VTT. No hay fondos de mapa PNG, nuevas dependencias, descargas de assets ni cambios de mecánica.

Cena queda excluida. El templo V39 aprobado también queda protegido. SHA-256 de su configuración completa, iguales antes y después:

- Cena: `7152dca9b5babc7875828d25c9c949887829a9c2b0e7cf1576e11e4a3577ea67`.
- Templo: `278a8c5657ae89aba6594275e1e2999b2e66103c0d29bd6dfd97d7941f181317`.

Comparación con el snapshot V39: CANON, navegación, posiciones de entrada y número de objetos de configuración idénticos en los seis mapas. La única modificación de un objeto configurado es la orientación visual del espejo. La decoración añadida no crea colisiones ni objetivos nuevos.

## Mejoras por escenario

- **Taberna:** pavimento menos contrastado, alfombra verde tejida, relieve de chimenea, ventanales emplomados, carpintería y ménsulas perimetrales, libros, comida, hierbas colgadas, faroles y luces reales de mesa. Cámara desde el acceso. Se conserva el abrevadero exterior y no vuelve el agua al interior.
- **Jardín:** rosales más densos, ramificación de espinos y árboles invernales, pétalos, nieve con grano fino y montículos de relieve con UV continuas, refugio con colcha, cabeceros, mesa, armario, libros, cesto y faroles. Contraste entre nieve fría y refugio cálido; AO más suave.
- **Mercado:** toldos curvos de tela con caída, festones finos, cestas, libros, bandejas de joyería, flores, ventanas y tejados en el borde posterior. Vaca con manchas, hocico, orejas, ojos, pezuñas y cola. Pavimento irregular y faroles locales cálidos frente a ambiente nocturno frío.
- **Espejo:** masas de hielo facetadas con siluetas irregulares, escarcha sobre témpanos, grietas y agua oscura, marco ornamentado orientado hacia la cámara, superficie del espejo con destellos y movimiento sutil, contraste cian/azul violeta.

## Correcciones técnicas reutilizables

- Materiales artísticos locales, compartidos por tipo dentro del mapa y liberados por el ciclo de vida existente. No se modifican materiales globales de Cena o del templo.
- Suelo visual dividido en parches con UV continuas y altura original: permite que los faroles iluminen sus alrededores. La cuadrícula y la navegación no cambian.
- Asignación de luz según proximidad a los volúmenes y presupuesto fijo de cuatro luces locales por mesh. El rig ambiental conserva sus slots para evitar cambios de color rectangulares entre parches.
- Sombras PCF y profundidad ajustada para estos cuatro mapas; se comprueba su presencia en el shader del suelo.
- Batches espaciales de detalles, matrices estáticas congeladas y límites de luces. La orientación de cilindros decorativos se calcula mediante una base ortogonal, validada en tres direcciones 3D.
- Tejido de toldos y superficie del espejo procedurales, sin fondos incrustados. Las texturas originales compartidas no se clonan como canvases vacíos.

## Validación

- Revisión real en Chrome/WebGL2, vistas de conjunto y detalle, comparadas con las cuatro referencias. Capturas en `qa/v40/`.
- Materiales visibles preparados y cero texturas pendientes en los cuatro mapas.
- Prueba final de tres ciclos por los seis mapas: todos OK, sin materiales/texturas pendientes. Recursos estables entre el segundo y el tercero: taberna 123/54, templo 108/58, cena 81/41, jardín 78/42, mercado 85/44 y espejo 90/41 (materiales/texturas de la escena, incluidos recursos compartidos).
- TypeScript servidor: correcto, también en la comprobación final independiente. Cliente: la primera comprobación pasó, pero la última falla por cambios concurrentes fuera de esta pasada: `apps/web/world.ts:1627` asigna `undefined` donde se exige `StepState | null`, y `engine/client/combat-presentation.test.ts:30,31,34` accede a elementos posiblemente indefinidos. Estos archivos se modificaron a las 22:19 y 22:17, después de las primeras comprobaciones, y no fueron editados en esta tarea. No se presenta el typecheck global final como aprobado.
- Pruebas de D8 Night: **22/22**.
- Integración de combate D8: **PASS**, incluyendo tiradas manuales, prompts privados, idempotencia, cancelación y retirada confirmada por el DM.
- Batería general: **228/229**. El fallo está en `engine/server/wreck-m3.test.ts:23`: el catálogo público de Stormwreck contiene la cadena `ghoul`. No se ha corregido dentro de esta petición artística ni se atribuye a estos mapas.
- Compilación final de producción del cliente: correcta (2 min 51 s). Vite no sustituye la comprobación estricta de TypeScript. Advertencia externa: `/art/ship/loot-atlas-m5.svg` no se resuelve en build. No pertenece a D8 Night.
- Integridad V40: current y snapshot numerado idénticos, base64 UTF-8 exacto y fuentes incrustadas iguales a las maestras; V39 archivada y solo V40 activa.

## Archivos

Fuentes: `renderer.ts`, `d8night.config.ts`, `VERSION`. Herramienta de QA: `visual-preview.html`. Pruebas: `engine/server/one-shot.test.ts`. Artefactos regenerados con el generador oficial: `playground_current.json`, `playground_v40.json`, archivo de V39 en `historico/` y capturas `qa/v40/`.

## Límites y puesta en marcha

Esta es una mejora sobre el diorama procedural existente, no una producción artística equivalente a Octopath Traveler. Sigue habiendo margen para assets artesanales más complejos. No se ha medido rendimiento en móviles reales o proyector; el FPS de esta sesión está afectado por compilaciones y trabajo concurrente, y no constituye un benchmark.

No se han tocado guardados ni reiniciado el servidor de la mesa activa. Al terminar la sesión en curso, reiniciar normalmente la aplicación y recargar los clientes para recibir la configuración y el renderer compilados V40. Para Babylon Playground cargar únicamente `playground_current.json`.
