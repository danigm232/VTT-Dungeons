# Retiro — correcciones y piedra, 21/10/2026

Trabajo secuencial sobre el Retiro existente. Estado de ejecución y evidencias: [plan](../../prototypes/retreat-stone-20261021/PLAN.md).

## P0 · Correcciones

- Protección del desembarco reinstalada en todas las fases aplicables. Conserva oleaje mar adentro y devuelve el ancho real de 360 m.
- Rocas de primer plano incluidas en la política de ocultación existente. El contador diferencia las siete piezas nuevas de las mallas previas; la operación de capa existente conserva padres y estados desactivados.
- Juego y visor comparten frente de 90°, dimensiones por zona y política de cámara. Se conserva la cámara actual continua de 5° a 25°, sin recuperar los presets históricos de 40° ni añadir un segundo controlador de combate.
- El visor espera recursos visibles; las variantes ocultas de materiales se preparan al mostrarse. Ya no queda esperando indefinidamente variantes que no se dibujan.
- 17/17 comprobaciones iniciales dirigidas y tipos de cliente correctos. La revisión visual y las verificaciones ampliadas se incorporarán al cerrar las fases de piedra.

## P1 · Material

Un albedo de basalto compartido, ejecución WebP de 512 × 512, sobre la geometría existente. Normales/rugosidad y materiales del proyecto reutilizados. Pavimento, madera, habitaciones, rutas y mobiliario se conservan. Escala de textura 3,3 m; etapa 0 disponible para comparar. [Procedencia y prompt](../../campaigns/stormwreck-isle/public/art/retreat-stone/PROVENANCE.md).

[Textura WebP de ejecución](../../campaigns/stormwreck-isle/public/art/retreat-stone/basalt-coastal-albedo-v1.webp).

Referencias: [NPS](https://www.nps.gov/subjects/volcanoes/columnar-jointing.htm), [USGS](https://www.usgs.gov/observatories/yvo/news/spectacular-columns-sheepeater-cliffs). Inspiran estructura y variación mineral de VTT_AMBIENCE; no añaden lugares ni información canónica.

## P2 · Relieve sobre las masas existentes

Refinadas en Blender 18 masas del acantilado, manteniendo originales y procedencia por objeto. Las versiones originales sólo se desactivan al importar correctamente la nueva capa. Los tres bloques decorativos del primer plano se sustituyen por salientes basálticos; conservan sus propietarios de transformación y participan en la ocultación existente. No se añaden obstáculos ni superficies transitables.

La deformación pierde intensidad cerca de las rutas existentes y se anula junto a puertas, escaleras y caminos. La coronación conserva su contorno horizontal: la primera prueba de desplazamiento lateral plegaba algunos triángulos estrechos. Se corrigió antes de entregar. El control final de coronación comprueba 7.056 posiciones verticales: cero solapamientos, cero normales invertidas y cero caras hacia abajo.

La prueba inicial tenía 92.523 triángulos y unos 12 MB. La versión final mantiene 28.514 triángulos en 21 mallas y 1.339.632 bytes (1,28 MiB) de geometría de ejecución. Se reutilizan materiales/texturas; la capa no incorpora copias de imágenes.

## P3 · Contactos y variación mineral

Variación amplia y discreta de color mineral mediante colores de vértice, con oscurecimiento húmedo en la base marina de la piedra. Sin vegetación, luces nuevas, decoración, interactivos ni información narrativa añadida. Las coordenadas UV de la nueva capa se exportan en metros desde Blender; se evita sobrescribirlas y se eliminan tangentes obsoletas al reproyectar UV de roca previa.

La validación encontró que el exportador del material sustituía ese atributo de color por blanco. Se fija por nombre y se conserva también en las 21 piezas del GLB completo, comprobando antes su correspondencia de vértices. Las 21 piezas tienen variación real y alfa opaco. Se suavizan las normales de la cima de A5; el acantilado conserva sus fracturas. [Colores exportados](../../prototypes/retreat-stone-20261021/artifacts/color-stream-verification.json), [control de la cima](../../prototypes/retreat-stone-20261021/artifacts/s3-temple-cap-validation.json).

La última corrección cambia colores y normales. Una comparación exacta de los 28.514 triángulos, matrices y políticas de ocultación confirma que las superficies coinciden con las usadas en las pruebas físicas, cámaras y recorrido. [Equivalencia geométrica](../../prototypes/retreat-stone-20261021/artifacts/geometry-equivalence.json). Las pruebas visuales temporales con materiales neutros se retiran del visor final.

Corregida además la clasificación de opacidad: el flujo RGBA, aunque tenía alfa 1, hacía que los materiales compartidos trataran la roca como transparente. Esto causaba solapamientos de caras y manchas triangulares, especialmente en A5. Se desactiva únicamente ese indicador de alfa en las piezas nuevas. Sus colores siguen activos y el desvanecimiento por visibilidad se conserva. La regresión comprueba PBR, material lejano y desvanecimiento; la revisión visual confirma la desaparición de las manchas.

Presupuesto de sombras de la piedra: las cuatro masas de relleno internas dejan de emitir sombras y las pieles exteriores nuevas no entran en los seis pases de los pequeños mapas cúbicos de las llamas. Las superficies exteriores siguen recibiendo luz; sus siluetas expuestas conservan la sombra solar. Muebles, paredes canónicas, luces y mapas de sombras existentes se conservan. La regresión verifica qué piezas participan en cada lista.

## Conservación y pruebas

- Los siete archivos protegidos de navegación, distribución, campaña, PNJ y celdas conservan su SHA original. [Registro](../../prototypes/retreat-stone-20261021/artifacts/protected-files.json).
- Las 128 mallas originales `a1:` conservan posiciones, caras y matrices en cada exportación nativa. [Registro Blender](../../prototypes/retreat-stone-20261021/artifacts/s3-native.json).
- 68/68 pruebas dirigidas de movimiento, cámaras, terreno, navegación, puertas y regresiones de presentación. Una primera ejecución paralela agotó el límite de 25 s de una subprueba; la repetición completa con un trabajador pasa sin ampliar límites. [Resultados](../../prototypes/retreat-stone-20261021/artifacts/full-tests-serial.json).
- Movimiento autorizado: 850 casillas alcanzables, 1.514 pasos, 46.490 muestras físicas; dos puertas cerradas bloquean y se abren manualmente, 13 interacciones y guardados previos conservados. [Registro de ejecución](../../prototypes/retreat-stone-20261021/artifacts/authoritative-movement.json).
- Geometría GLB final: 4.828 posiciones, radio de 0,3 m, cuatro alturas corporales y 16 direcciones; cero colisiones nuevas. [Prueba física](../../prototypes/retreat-stone-20261021/artifacts/s3-geometry-walk.json).
- Coronación: [comprobación de pliegues](../../prototypes/retreat-stone-20261021/artifacts/s3-crest-validation.json).
- GLB de ejecución de fases 2 y 3 y GLB completo final: cero errores y cero advertencias del validador. Conserva avisos informativos de UV/tangentes sin uso en materiales vacíos porque Babylon los reasigna. Blender avisa además de tres cilindros antiguos sin tangentes; no pertenecen a la nueva capa. [Validación](../../prototypes/retreat-stone-20261021/artifacts/glb-validation-summary.json).
- Tipos de cliente correctos. Compilación de cliente —DM, móvil, jugador y proyector— y servidor correctas, en `runtime/retreat-stone-20261021/`. La compilación incorpora ambos GLB de piedra y el WebP. Sin advertencias de tamaño de fragmentos en esta compilación. [Cliente](../../prototypes/retreat-stone-20261021/artifacts/client-build.log), [servidor](../../prototypes/retreat-stone-20261021/artifacts/server-build.log).

La auditoría final de cámara pasa **195 encuadres** y **83 casos de primer plano** derivados del barrido de las 850 casillas con 15 direcciones de cámara; cero incidencias. El recorrido visible completa 1.514 pasos, 6.295 fotogramas de movimiento y 1.258 comprobaciones de apoyo; visita las diez superficies, incluidas A1–A5, playa, acantilado, camino superior y salidas. Cero apoyos ausentes y cero oclusiones de cabeza o torso. La cuadrícula se muestra y oculta sin interrumpirlo. [Cámaras](../../prototypes/retreat-stone-20261021/evidence/stone-s3-p8-audit-25-0.json), [recorrido](../../prototypes/retreat-stone-20261021/evidence/stone-s3-p8-walk-25-0.json), [cuadrícula](../../prototypes/retreat-stone-20261021/artifacts/grid-during-walk.json).

Se mantiene el perfil de cámara actual 5°–25°, cinco posiciones de auditoría y giro −30°/0°/+30°. No se recupera el antiguo combate fijo a 40°.

## Comparación visual y rendimiento

[Comparativa por fases](../../prototypes/retreat-stone-20261021/evidence/comparison.html). Capturas de Babylon a 1280 × 720, 25° y giro 0°. Los ocho registros de conjunto/interiores comprueban cámara idéntica, escala y preparación de recursos. [Verificación de comparabilidad](../../prototypes/retreat-stone-20261021/artifacts/capture-comparability.json).

| Base corregida | Material, relieve y contactos |
|---|---|
| ![Base](../../prototypes/retreat-stone-20261021/evidence/stone-s0-p8-overview-25-0.png) | ![Piedra final](../../prototypes/retreat-stone-20261021/evidence/stone-s3-p8-overview-25-0.png) |

Los primeros ensayos con pausas cercanas a un segundo se descartaron. El medidor detecta esas pausas y limita su duración. La última comparación se repite con cargas nuevas, viewport CSS y render de 1280 × 720, escalado 1, el mismo Intel UHD/D3D11 y sin compilaciones simultáneas. Cada vista mide 90 fotogramas; no registró intervalos mayores de 200 ms.

| Vista | FPS base / final | Dibujo CPU, ms base / final |
|---|---:|---:|
| Conjunto | 17,4 / 27,4 | 34,99 / 22,98 |
| A3 | 46,4 / 33,2 | 10,96 / 13,88 |
| A5 | 19,5 / 46,6 | 14,56 / 7,37 |

Es una muestra breve con variabilidad, no una certificación de FPS sostenidos. **A3 mantiene un coste superior y requiere una siguiente optimización.** El tiempo CPU de `scene.render` no es el tiempo total de GPU. Los contadores instantáneos incluyen pases periódicos de sombras y no se comparan como si fueran una carga fija.

La capa final ocupa 1,28 MiB; el único albedo nuevo, 88.830 bytes y 512 × 512, añade aproximadamente 1,33 MiB de textura RGBA con mipmaps. Quedan pendientes la medición prolongada y los dispositivos móvil/proyector físicos. [Comparación y registros](../../prototypes/retreat-stone-20261021/artifacts/performance-comparison.json).

## Archivos modificados en esta entrega

| Archivo / grupo | Cambio |
|---|---|
| `retreat-refinement-coast.ts` | Protección de desembarco y ancho real del mar |
| `retreat-scenic-depth.ts` | Oclusión, pertenencia sin reparentar, recuentos y reutilización del primer plano nativo |
| `retreat-camera-composition.ts`, dos puntos de `apps/web/world.ts` | Dimensiones compartidas; retirada del controlador alternativo sin uso |
| `retreat-refinement-materials.ts` | Albedo de basalto compartido, UV, tangentes y materiales existentes |
| `retreat-refinement-lighting.ts` | Presupuesto de sombras de las nuevas masas rocosas |
| `retreat-refinement.ts`, `retreat-global-visuals.ts` | Selección de fase de piedra e importación de la capa nativa |
| `retreat-stone.json`, `retreat-stone-replaced.json` | Versión disponible y lista explícita de masas reemplazadas |
| `public/art/retreat-stone/`, dos `retreat_stone_sN_runtime.glb` | Textura, procedencia y geometría de ejecución |
| `engine/client/retreat-refinement-regressions.test.ts` | Ocho regresiones de presentación |
| `prototypes/retreat-global/viewer.ts`, `vite.config.mjs` | Revisión alineada con juego, captura consistente, auditoría de primer plano y medida de rendimiento |
| `prototypes/retreat-stone-20261021/` | Fuente Blender, exportador, evidencias, referencias y verificaciones |
| `prototypes/retreat-refinement/FASE_3A.md`, `FASE_3B.md`, este informe, `PROJECT_STATE.md` | Documentación contrastada con el código actual |

Las rutas sin prefijo de la tabla pertenecen a `campaigns/stormwreck-isle/public/`. La carpeta contiene otros cambios previos o concurrentes de D8: no se atribuyen a esta entrega.

## Entregables

- [Blender editable](../../prototypes/retreat-stone-20261021/artifacts/retreat_stone_s3.blend).
- [GLB completo de referencia](../../prototypes/retreat-stone-20261021/artifacts/retreat_stone_s3_complete.glb).
- [Capa GLB optimizada del VTT](../../prototypes/retreat-stone-20261021/artifacts/retreat_stone_s3_runtime.glb).
- La integración de código utiliza la etapa 3 por defecto sobre la entrega global 8. Las etapas 0–2 se conservan para revisión y comparación. El selector existe sólo en el visor de revisión; no añade controles al DM.

## Límites y siguiente tarea

Esta entrega resuelve las regresiones citadas y establece material, relieve y contactos de piedra sobre el mapa existente. No equivale a cerrar la dirección artística completa del Retiro. Siguiente tarea: reducir el coste de la piedra visible desde A3 y después afinar la transición entre roca tallada y roca natural y los bordes de la coronación, conservando la envolvente protegida de navegación. La certificación de rendimiento en móvil y proyector físicos sigue pendiente.
