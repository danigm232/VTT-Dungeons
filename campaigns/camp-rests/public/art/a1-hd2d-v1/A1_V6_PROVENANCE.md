# A1 V6 · procedencia de materiales y ambiente

Fecha: 2026-09-27. Alcance: VTT_AMBIENCE de `camp-a1-rooms`; no cambia la geometría CANON, la navegación, las colisiones, las interacciones ni el estado persistente.

## Recursos integrados

| Archivo | Origen | Uso |
| --- | --- | --- |
| `a1-material-atlas-v6.png` | Variación pictórica generada con ImageGen integrado a partir del atlas A1 V5; original `exec-2cf5a92c-ecba-417b-8ed9-656cf9298988.png`, 1254 × 1254 | Atlas único 2 × 2 para plaza, roca tallada, estratos de acantilado y suelo de celda. Reduce el microdetalle y deja que la luz del motor aporte el sombreado. |
| `bay-v3.png` | Textura de agua estilizada generada con ImageGen integrado a partir de `bay-v2.webp`; original `exec-37d0ad43-2f00-4765-bf91-de8e1cd06bd8.png`, 1254 × 1254 | Agua local de A1. Oleaje pictórico ancho; la espuma de costa continúa separada y animada por Babylon. |
| `foliage-atlas-v5.png` | Atlas RGBA generado con ImageGen integrado a partir de `foliage-atlas-v4.webp`; original `exec-5cb7c2b0-ec65-4d4f-a807-0066da248a0b.png`, 1254 × 1254 | Las cuatro siluetas existentes de arbusto, helecho, hiedra y tomillo, con transparencia real y menos aspecto fotográfico. |

Estos archivos son arte VTT_AMBIENCE propio de esta campaña; no se declaran CC0 ni arte oficial. Los originales se conservan en el directorio de imágenes generadas de Codex. Las transformaciones se limitan a seleccionar cada cuadrante mediante UV, aplicar tintes y animar fase/color en el runtime.

## Selección de recursos externos

Se examinó `Rock 06` de Poly Haven como candidato para el acantilado. La página identifica su textura fotográfica de roca estratificada, autor Rob Tuytel y licencia CC0 ([ficha del recurso](https://polyhaven.com/a/rock_06), [licencia](https://polyhaven.com/license)). No se descargó ni incorporó: su microdetalle fotográfico contrasta con el objetivo pictórico de A1, y la nueva variante local ofrece formas más legibles a la escala de juego. No hay recursos Poly Haven nuevos en esta revisión.

## Babylon.js reutilizado

Sin dependencias nuevas. A1 continúa usando `@babylonjs/core` ya instalado: `StandardMaterial`/`Texture`, luces hemisférica, direccional y puntual, `ShadowGenerator`, `GlowLayer` y `ParticleSystem`; la espuma se mantiene en `engine/client/coastal-backdrop.ts`. La luz fría costera se limita a la geometría del acantilado y las luces de las celdas conservan sus mallas permitidas.
