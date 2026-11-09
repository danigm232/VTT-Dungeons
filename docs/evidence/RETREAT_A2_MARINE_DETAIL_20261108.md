# Detalle marino de las rocas A2 — 08/11/2026

Muestra localizada sobre las siete rocas situadas ante el cabrestante. No se cambian el mar, las rutas, el palé, las cámaras ni las colisiones. El añadido es **VTT_AMBIENCE**, no un cambio de canon.

| ID y propietario | Estado anterior | Candidato y criterio |
| --- | --- | --- |
| `retreat:a2-barnacles` / `retreat-winch-marine-detail.ts` | Sin colonias sobre las rocas nuevas. | Pequeños conos agrupados, colocados mediante rayos sobre la piedra 3D; material claro apagado. VA-07/15, REF-07. Aceptación del usuario pendiente. |
| `retreat:a2-algae` / mismo archivo | Sin algas locales. | Hojas cortas en la banda húmeda, agrupadas y sin colisiones; color verde oscuro coherente con el Pecio. VA-07/15. Aceptación pendiente. |
| `retreat:a2-rock-contact-foam` / mismo archivo | Solo la espuma costera global. | Parches suaves que reutilizan `a1:shore-wash-v2`, muestrean el oleaje del mar existente y suspenden sus actualizaciones fuera de cámara. VA-07/15, REF-07. La lectura visual de la espuma precisa revisión del usuario. |

La referencia de costa [REF-07](../design/VISUAL_REFERENCE_LIBRARY.md#ref-07--sea-of-stars) se usa solo para estudiar contacto y silueta; no se incorpora contenido comercial. Los tres lotes carecen de colisión y selección; no añaden luces ni texturas. La reducción de actualizaciones fuera de vista no certifica FPS ni memoria.

La comparación usa el renderer integrado con cámara y resolución equivalentes; el oleaje no está congelado y varía entre imágenes. [Comparativas y originales](../../output/retreat-marine-a2-20261108/index.html). Se han pasado diez pruebas de rocas, espuma existente, mecanismo y nuevo detalle, y la comprobación de tipos del cliente. Revisión de aspecto y ensayo físico pendientes.

En la inspección del encuadre bajo, la geometría de espuma está activa y sus vértices siguen el nivel del mar, pero su contacto es demasiado poco visible en la captura. No se da por validado el aspecto realista de la espuma; requiere otra iteración visual. No hay medición comparativa de FPS ni se ha instalado esta muestra en la mesa habitual.
