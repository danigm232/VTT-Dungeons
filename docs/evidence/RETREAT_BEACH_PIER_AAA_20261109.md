# Retiro del Dragón · Playa y Embarcadero AAA

Mejora visual integral y salto de calidad gráfica (Triple-A) en la zona de llegada costera del Retiro del Dragón (`dragon-rest`), cubriendo la playa de desembarco con dunas 3D, la orilla de marea reflectante, la pradera costera y pinar marítimo volumétrico, el muelle de roble con pilotes sumergidos y carga náutica, el bote de remos amarrado sin colisiones con sus remos de madera, el sellado hermético del farallón de roca basáltica que cierra el vacío en la montaña tras el sendero de Pleamar, y los hitos de seguridad con faroles de señalización.

Responde de forma rigurosa a las auditorías visuales sobre las capturas de control del usuario y a las directrices de [AGENTS.md](file:///c:/Users/User/Desktop/Dungeons/AGENTS.md), [ROADMAP_V1.md](file:///c:/Users/User/Desktop/Dungeons/ROADMAP_V1.md), [VISUAL_ART_DIRECTION.md](file:///c:/Users/User/Desktop/Dungeons/docs/design/VISUAL_ART_DIRECTION.md) y la auditoría de brechas visuales [VISUAL_GAP_AUDIT_20261101.md](file:///c:/Users/User/Desktop/Dungeons/docs/audits/VISUAL_GAP_AUDIT_20261101.md) (puntos VA-01 a VA-18).

---

## 1. Módulos y Acabado Artístico Implementado

El propietario del acabado de la playa y el muelle es [`campaigns/stormwreck-isle/public/retreat-beach-presentation.ts`](file:///c:/Users/User/Desktop/Dungeons/campaigns/stormwreck-isle/public/retreat-beach-presentation.ts), integrado directamente en el ciclo de vida y renderizado de [`campaigns/stormwreck-isle/public/retreat-refinement.ts`](file:///c:/Users/User/Desktop/Dungeons/campaigns/stormwreck-isle/public/retreat-refinement.ts).

| ID / Componente | Material / Recurso | Detalle Visual y Art Direction | VA / Criterio |
|---|---|---|---|
| **Arena Costera y Dunas 3D** (`retreat:beach-natural-dunes`, `CANON_Global_beach_walkable-floor`) | `retreat:pbr:beach-sand` (`#c2b196`, roughness 0.92, micro-relieve mineral) | Sustituye el pavimento de baldosas de plaza calcárea por una superficie 3D ondulada de dunas de arena mineral cálida que desciende suavemente desde la berma (Y: 0.35) hacia el mar (Y: -0.45). | VA-01, VA-02, VA-04 |
| **Orilla de Arena Húmeda** (`retreat:beach-wet-shore-ribbon`) | `retreat:pbr:beach-wet-sand` (`#6c5f4c`, roughness 0.22, environmentIntensity 0.82) | Franja reflectante continua a lo largo del arco de marea (`X: 11.5..31.5`, `Z: 110..122`), reproduciendo el brillo especular de la arena saturada por el batir de las olas. | VA-03, VA-05, VA-10 |
| **Dispersión de Troncos, Rocas y Conchas** (`retreat:driftwood-*`, `retreat:beach-scatter`) | `retreat:pbr:pier-timber`, `retreat:pbr:cliff-basalt`, calcita | 4 troncos de deriva erosionados por el mar, 6 grandes bloques de basalto costero y 72 guijarros y valvas de conchas marinas depositados en la línea de pleamar. | VA-04, VA-06, VA-11 |
| **Pradera Costera Volumétrica 3D** (`retreat:coastal-lush-meadow`, `retreat:pine-grove-bush-*`) | `retreat:pbr:coastal-grass` (`#5e7a3e`), `retreat:pbr:sea-thrift` (`#d9799b`) | 180 matas 3D de gramíneas costeras y racimos de flor de armeria marítima con contorno plumoso orgánico, eliminando los bordes rectilíneos artificiales de la alfombra verde anterior. | VA-08, VA-09, VA-14 |
| **Muelle de Roble y Carga Náutica** (`retreat:jetty-deck-plank-*`, `retreat:pier-crate-*`, `retreat:pier-barrel`) | Roble macizo envejecido, `retreat:pbr:marine-iron`, `retreat:pbr:hemp-rope` | Entablado de roble con 28 pernos de carruaje de forja, 8 pilotes sumergidos hasta el fondo con colonias de percebes, 2 cajas de víveres, barril de ron y aduja de cabo de cubierta. | VA-02, VA-06, VA-11 |
| **Bote de Remos Flawless** (`retreat:moored-boat`, `retreat:boat-rib-*`, `retreat:oar-*`) | Roble curvado, obra viva alquitranada (`#1e2122`), remos de pino | Reubicado al costado del muelle `(20.25, 0.04, 119.5)` eliminando la interpenetración con los tablones; incorpora 3 cuadernas de refuerzo, 2 bancadas, 2 remos de madera con palas talladas y cabo de proa amarrado. Conserva el viaje canónico a `wreck-ship`. | VA-02, VA-06, VA-15 |
| **Farallón de Acantilado Sellado** (`retreat:cliff-buttress-seal-0..2`, `retreat:cliff-surf-skirt`) | `retreat:pbr:cliff-basalt` (`#525a58`, roughness 0.86), faldón de espuma | 3 contrafuertes macizos de basalto volcánico que sellan herméticamente el enorme hueco en la montaña detrás del sendero de subida a Pleamar (detectado en Imagen 2), con rompiente marina al pie. | VA-01, VA-07, VA-13 |
| **Sendero Atmosférico y Faroles Náuticos** (`retreat:trail-guidepost-*`, `retreat:trail-safety-rope`, `PointLight`) | Bronce naval (`#ffa84e`), cáñamo trenzado, basalto | 5 postes guía de madera con barandilla protectora de cabo de cáñamo a lo largo del precipicio, escalones de piedra y faroles sincronizados con el crepúsculo y la noche con parpadeo orgánico. | VA-05, VA-16, VA-17 |
| **Fondo Somero y Rompiente Dinámica** (`retreat:shallow-seabed-bedrock`, `retreat:beach-sand-surf`) | Lecho arenoso con oclusión de contacto, espuma alfa animada | Relieve submarino visible en aguas transparentes y cinta de batiente de olas dinámica que avanza y retrocede sobre la orilla. | VA-03, VA-04, VA-10 |

---

## 2. Validación de Paridad y Reglas de Navegación

Todas las adiciones son estrictamente decorativas (`VTT_AMBIENCE`):
- **Cero bloqueos o colisiones añadidas:** Todas las mallas cuentan con `checkCollisions = false`, `isPickable = false`, y `metadata.tokenOccluder = false`.
- **Navegación 100 % intacta:** La cuadrícula jugable (980 celdas canónicas + extensiones G2) conserva sus cotas de apoyo canónicas, su conectividad hacia los senderos de subida a A1 y el enlace de interacción con el bote hacia el Pecio.
- **Rendimiento e Integración:** Materiales PBR dedicados, 0 fugas de memoria y soporte completo para reciclaje y disposición.

---

## 3. Pruebas Automatizadas y Compilación

- **Pruebas Unitarias de Acabado de Playa y Embarcadero:**
  - [`engine/client/retreat-beach-presentation.test.ts`](file:///c:/Users/User/Desktop/Dungeons/engine/client/retreat-beach-presentation.test.ts) (todas las aserciones dirigidas): **100 % PASS**.
- **Pruebas de Regresión y Agua Costera:**
  - `engine/client/retreat-coastal-presentation.test.ts`: **3/3 PASS**.
  - `engine/client/a1-coastal-water.test.ts`: **1/1 PASS**.
  - `engine/client/retreat-refinement-regressions.test.ts`: **12/12 PASS**.
  - Total: **17 pruebas superadas en 4 suites**.
- **Verificación de Tipos TypeScript:**
  - `tsc -p tsconfig.client.json --noEmit`: **Código de salida 0 (sin errores)**.
  - `tsc -p tsconfig.server.json --noEmit`: **Código de salida 0 (sin errores)**.

---

## 4. Informe Visual Interactivo y Comparativas (Cámara Idéntica)

El informe con las comparativas interactivas antes/después se encuentra generado y disponible en:
[`output/retreat-beach-20261109/index.html`](file:///c:/Users/User/Desktop/Dungeons/output/retreat-beach-20261109/index.html)

Registro de auditoría técnica en:
[`output/retreat-beach-20261109/records.json`](file:///c:/Users/User/Desktop/Dungeons/output/retreat-beach-20261109/records.json)

### Resumen de Vistas Comparadas (1280 × 720)

| Vista | ID | Horario | Delta Cámara | SHA-256 Antes | SHA-256 Después |
|---|---|---|---|---|---|
| **Playa y desembarcadero completo (Cámara Imagen 1)** | `zona-playa-completa` | Día | `0.000000` | `a5cb8efe6cd3...` | `5636357445b8...` |
| **Sendero hacia Pleamar y farallón sellado (Cámara Imagen 2)** | `camino-acantilado` | Día | `0.000000` | `e1c0b71ba481...` | `33a33aba32f1...` |
| **Muelle de roble y bote de remos con quilla y remos** | `embarcadero-bote` | Día | `0.000000` | `64573057792d...` | `1e6e9d793ed6...` |
| **Dunas de arena dorada, rompiente y pradera costera** | `orilla-arena-surf` | Día | `0.000000` | `2f8180ad4319...` | `68a70177779b...` |
| **Atmósfera nocturna con faroles de muelle y sendero** | `noche-farol-atmosfera` | Noche | `0.000000` | `9c0ea28a1a9c...` | `483cbae0a5e3...` |

> [!NOTE]
> En el informe interactivo, al hacer clic o pulsar sobre cualquiera de las imágenes se conmuta instantáneamente entre el estado previo y la mejora AAA en el mismo rectángulo exacto (`scripts/lib/visual-comparison.mjs`). Incluye controles de teclado y modal de zoom hasta el 300 % para inspeccionar los detalles de texturas y materiales a escala completa.
