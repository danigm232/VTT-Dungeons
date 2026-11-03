# Cierre de acabados A1–A5 · 24/10/2026

Acabados A1–A5 publicados en el VTT. Celdas y mobiliario conservados; navegación1142casillas/13superficies/18conexiones intacta. Corregidos libros opacos en muebles atenuados, carga del palé y contexto amplio A2. Optimización al final, Q1.

## Entregas y alcance

- [A1 — Seis accesos monásticos](RETREAT_FINISH_A1_20261024.md): 214 parejas antes/después.
- [A3 — Comedor, pasillo y cocina](RETREAT_FINISH_A3_20261024.md): 103 parejas antes/después.
- [A4 — Biblioteca y puerta](RETREAT_FINISH_A4_20261024.md): 103 parejas antes/después.
- [A2 — Casa del cabrestante](RETREAT_FINISH_A2_20261024.md): 72 parejas antes/después.
- [A5 — Templo de Bahamut](RETREAT_FINISH_A5_20261024.md): 103 parejas antes/después.

No se reconstruyen habitaciones ni se amplían de nuevo. Permanecen la orientación aprobada, seis celdas, todos sus muebles, entradas, suelos y alturas. Las adiciones son 91 piezas/ 3612 triángulos/ 427340 bytes, sin imágenes nuevas, colisiones o superficies de navegación.

## Fallos corregidos

- A4: distintas primitivas de un mismo mueble se atenuaban por separado y el modo OPAQUE glTF ignoraba la opacidad de malla. O1 reúne las partes del mueble alcanzado y habilita temporalmente el modo automático del material; restaura el modo exacto al actualizar/salir. Materiales compartidos, sin retirar libros.
- A2: la caja permanecía a12m al bajar el palé. Vinculación con pose mundial conservada, incluida la raíz glTF reflejada. Comprobado0/12/15m; la caja de la casa permanece independiente.
- A2: el encuadre interior excluía la vertical de carga. El amplio usa las dimensiones A2 existentes y sigue la carga con margen para el actor. Se conservan C2 y ángulos; a5° puede no caber toda la vertical dentro de C2. No se fuerza una inclinación ni se crea un ascensor.
- A3/A4: ajuste moderado de los rellenos cálidos ya existentes, sin nuevas luces.
- Ensayo de retornos: el recuento inicial incluyó595callbacks de liberación diferida de efectos antes de completar el cierre de fotograma. El ensayo reproduce ahora las tareas y`engine.endFrame`del bucle real antes de contar. Se conserva el fallo en`drafts/deferred-effect-disposal`; pasan las mismas aserciones, sin relajar umbrales ni modificar producción por ese diagnóstico. Los tres retornos terminan con un observador final y recuentos de recursos idénticos.

## Validación realizada

- 595 parejas de imágenes:5inclinaciones×5giros, cercanía/lejanía, DM/jugador/proyector. A2 declara su cambio deliberado de encuadre amplio.
- Puertas originales abiertas/cerradas; palé/caja0/12/15m; personajes1,05/1,3/1,8m. A5 mantiene ocho columnas y siete canarios.
- 38 vistas finales de tres personajes, cuadrícula/móvil y combate con inclinación manual preservada; tres viajes de ida/vuelta a escenas existentes, liberación de escenas y recuentos estables.
- 594660 muestras corporales sobre los cinco GLB reimportados; 28591 puntos distintos del recorrido autoritativo previo12242pasos, con fuentes de navegación protegidas. Las pruebas actuales del servidor vuelven a recorrer las zonas y rutas.
- 113 mallas originales A1 con geometría/índices/materiales intactos;103matrices estáticas exactas y10llamas originales animadas comprobadas por fuentes/geometría.298mallas originales A3/A4/A5 conservan límites/roles/materiales.
- 30 pruebas específicas actuales y72pruebas adicionales de consumidores, sin fallos; tipado y compilación cliente/servidor correctos.
- DM y proyector reales del puerto3000 comprobados. Once categorías del guardado conservadas; ninguna prueba de movimiento/combate/viaje se ejecuta sobre la partida real.

Las comparativas usan una copia aislada a mediodía. Las capturas reales de publicación conservan la noche y el clima de la partida: [DM](../../output/retreat-finish-batch-20261024/evidence/dm-3000.png), [proyector](../../output/retreat-finish-batch-20261024/evidence/projector-3000.png).

No se certifican FPS/memoria en este lote: optimización aplazada a Q1 por instrucción expresa. El registro automático de cámara no equivale a una medición controlada de rendimiento.

## Archivos principales

- `campaigns/stormwreck-isle/public/retreat-zone-finishes.ts`/`.json` y cinco`art/retreat-modules/retreat_finish_*_runtime.glb`.
- Integración existente:`retreat-refinement.ts`, `retreat-global-visuals.ts`, `retreat-local-occlusion.ts`, `retreat-camera-composition.ts`, `retreat-refinement-lighting.ts`, `apps/web/world.ts`.
- Regresiones:`engine/client/retreat-local-occlusion.test.ts`, `engine/client/retreat-winch-context.test.ts`.
- Fuentes Blender, generador, verificadores y pruebas aisladas:`prototypes/retreat-zone-finishes-20261024/`. Informes/galerías por zona y esta entrega.

Un cambio simultáneo ajeno en`engine/server/game.ts`(rama opcionalturnOnly) fue revisado y conservado; no se restauró ni se atribuye a este lote.60de61fuentes protegidas exactas y única excepción fijada por hash.

## Pendientes y siguiente tarea

Recomendada M1: piedra/materiales a escala cercana y lejana, sobre la geometría aceptada. Luego E1(ambiente),L1(luz) yQ1(optimización). No iniciadas aquí. La repetición de basalto y los grandes planos de fondo siguen pendientes de afinado. Mapas finales B/D ausentes; rutas preparadas y paradas opcionales conservadas.

[Galería del lote](../../output/retreat-finish-batch-20261024/index.html) · [Comprobación](../../output/retreat-finish-batch-20261024/checks/batch-verification.json).
