# Cola de arte e integración del Pecio

Este documento prepara el trabajo futuro sin modificar el estado del plan maestro ni integrar recursos en el juego. Resume la petición actual y el material de referencia aportado; las reglas de la campaña, la decisión de arte final y cualquier cambio de runtime se validarán al abrir cada bloque.

## Estado y deduplicación

- La próxima generación propuesta es `C2 · sw_env_overlay_002`, agua profunda.
- `A6` ya cuenta con aprobación visual descrita en el material aportado, pero queda pendiente de transferencia. No se debe regenerar solo para desbloquear la cola.
- `D1` y `A6` son el mismo sistema de nido saqueable: mantener un único asset canónico, con los estados `harpy_nest_full` y `harpy_nest_looted`.
- `D5` y `A7` son el mismo escritorio del capitán: mantener un único asset canónico, con `captain_desk_closed`, `captain_desk_opened` y `captain_desk_looted`.
- Las referencias descargadas quedan en `private/sources/pecio-env-20260922/`; todavía no son assets del runtime.

## Activo preparado para la próxima generación

`C2 · sw_env_overlay_002 · agua profunda`

| Campo | Valor preparado |
| --- | --- |
| Tipo | UNITARIO / OVERLAY |
| Modo funcional | STATIC |
| Estados base | `deep_water` |
| Animación | Ninguna; el movimiento se resuelve con una hoja ambiental posterior |
| Variantes | 6 completas |
| Disposición | 3 x 2 |
| Etiquetas | `deep_water_v01` a `deep_water_v06` |
| Contexto | Bodega C9; más oscura y profunda que C1, para inmersión total |
| Permitido | Seis overlays modulares translúcidos de agua profunda, perspectiva cenital VTT, patrones estáticos distinguibles y transparencia alfa real entre cada forma |
| Prohibido | Suelo o casco horneados, peces, algas, partículas, escombros, espuma de mar abierto, personajes, interfaz, escenario, fondo sólido o velo común entre celdas |
| Consistencia | Misma profundidad visual, escala y lectura de agua profunda en las seis variantes; variar únicamente borde, ondulación y distribución |

Prompt de producción listo:

> Use case: stylized-concept. Asset type: overlay modular para VTT. Crear una imagen técnica de seis assets aislados sobre canal alfa real, en disposición 3 x 2. Cada celda contiene una variante estática modular de agua interior profunda para la bodega sumergida de un pecio, vista cenital para VTT y claramente más oscura que agua poco profunda. Etiquetas exactas debajo de las celdas, en orden: deep_water_v01, deep_water_v02, deep_water_v03, deep_water_v04, deep_water_v05, deep_water_v06. Todo el espacio entre y alrededor de las seis formas debe tener alpha 0 real. Solo agua translúcida profunda: sin suelo, madera, casco, rocas, algas, peces, partículas, escombros, espuma, personajes, iconos, escenario ni fondo común. No hay animación ni progresión temporal.

## Backlog preparado por bloques

| Orden | Conjunto | Producción prevista | Dependencia de integración |
| ---: | --- | --- | --- |
| 1 | C2 agua profunda | 6 variantes estáticas, 3 x 2 | Overlay C9; alpha, ancla y opacidad |
| 2 | C3 terreno difícil acuático | Overlay funcional sutil | Se compone sobre C1 sin ocultar el mapa |
| 3 | C4 cubierta mojada | Overlay modular estático | Se compone sobre la cubierta C1 |
| 4 | C5 algas y C6 escombros | Packs variables, sin número forzado | Capas de dressing independientes |
| 5 | D1/A6 nido saqueable | Dos estados canónicos, 2 x 1 | Se coloca dentro de la cofa; no duplicar |
| 6 | D2 mástil, D3 trinquete, D4 balista | Tres setpieces unitarios | Anclas de C1/C2; los complementos animados van aparte |
| 7 | D5/A7 escritorio, D6 literas, D7 cocina, D8 mesa | Un sistema de 3 estados y tres sets/packs | C4–C7; dressing separado |
| 8 | E1–E10 ambiente | Hojas 4 x 2 de 6–8 frames reales | Definir loop, duración y punto de anclaje antes de importar |
| 9 | F1–F6 VFX | Hojas 4 x 2 de 8 frames; F6 solo si se visualiza detectar magia | Overlays de evento, no reemplazan los objetos |
| 10 | G1–G10 narrativa/dressing | Unitarios, sistemas cortos y packs según función | Registrar `inspect`, `pickup`, `open`, `loot` o `destroy`; el estado recogido normalmente oculta el asset |

## Puertas de implementación

1. Validar PNG: RGBA, alpha cero fuera de la silueta, etiquetas legibles y disposición comprometida.
2. Crear derivado de runtime no destructivo: recorte, escala objetivo, ancla, z-index y huella de cuadrícula.
3. Declarar el asset en un manifiesto de campaña con procedencia, hash, relación con el PNG de fuente y estado de revisión.
4. Implementar la conducta lógica separada del arte; `pickup` oculta, `open` cambia estado y `inspect` abre contenido de interfaz.
5. Probar composición en la escena correspondiente sin hornear elementos mutables en las capas de mapa.

## Referencias que se deben preservar

- Para G4, usar `sw_env_interact_002.png` como referencia visual obligatoria del paquete encerado.
- Para la familia de navegación ya producida, usar solo los cinco `sw_env_traversal_*` no excluidos como referencia de estilo, después de QA de escala y anclas.
- Nunca seleccionar los dos PNG marcados como excluidos dentro de `private/sources/pecio-env-20260922/`.
