# Retiro del Dragón en Godot — Auditoría y Traslado por Capas, 14/11/2026

## Encargo y Alcance

**Encargo activo del usuario:**
> «1 Concepto y Diseño (Layout) del mapa del retiro del dragon.
> mira lo que hemos hecho en babylon y traslademoslo aqui en godot»
> «En babylon, la estructura o el mapa del retiro del dragon era un poco diferente, estaba construido mas ampliado, etc. podriamos copiar la estructura dle mapa en godot?»

Se traslada integralmente a **Godot Engine 4.7.2 (Vulkan Forward+)** la estructura ampliada de **El Retiro del Dragón (`dragon-rest`)** procedente de Babylon.js (`R3`, expansión de superficies, `retreat-modules/*.glb` y texturas pintadas), manteniendo la cuadrícula táctica de 1.5 m, cotas canónicas, las 11 zonas, 13 superficies ampliadas (**1.599 casillas reales** en `retreat-terrain-v2.json`), los 3 paquetes `.glb` esculpidos con recorte táctico (*cutaway*) en A2/A3/A4, las 6 celdas excavadas de A1, los 16 landmarks y los 8 preajustes de cámara 2.5D.

Base del prototipo: `prototypes/godot-retiro/`, motor Godot 4.7.2 Forward+, ventana táctica 1600×900.

---

## Capa 1: Concepto y Diseño (Layout) y Traslado Estructural Ampliado

### 1. Exportación desde Babylon y Paquetes Godot-Ready (`scripts/export-retreat-godot-bundle.mjs`)
- **Terreno ampliado (`prototypes/godot-retiro/assets/data/retreat-terrain-v2.json`):** 13 superficies con un total de **1.599 casillas**:
  - `beach`: 223 · `a1`: 410 · `cliff`: 48 · `a2`: 15 · `upper`: 442 · `a3`: 61 · `a4`: 113 · `a5`: 87 · `pleamar`: 18 · `observatorio`: 20 · `island-pleamar-low`: 30 · `island-pleamar-high`: 50 · `island-observatory`: 82.
- **Módulos 3D esculpidos (`prototypes/godot-retiro/assets/retreat-modules/`):**
  - `retreat_architecture_canon.glb` (91 nodos, 258.681 triángulos, 26,86 MB): contexto A1, orilla/embarcadero, conexiones, A2, A3, A4, A5, acabados P1/P2/P5/E1 y senderos V4 con recorte táctico (*cutaway*) de techos y muros frontales/laterales en A2/A3/A4.
  - `retreat_geography_stone.glb` (33 nodos, 129.969 triángulos, 11,30 MB): orografía costera S3/P3, crestas montañosas recortadas a `Z <= 49.2`, extensiones SAL1–SAL4 y senderos R2/R3.
  - `retreat_landscape_r3.glb` (17 nodos, 1.330.769 triángulos, 74,84 MB): paisaje forestal superior, praderas, pinos y acantilados integrados.
- **Texturas copiadas (`prototypes/godot-retiro/assets/textures/`):** 18 archivos incluyendo `a1-plaza-v6.png`, `a1-cell-v6.png`, `a1-cliff-rugged-v8.png`, `basalt-coastal-albedo-v1.webp`, `coastal-rock.png`, `foliage-atlas.png` (con recorte alfa para enredaderas y jardineras), `oak-v4.webp`, `limestone-v3.webp`, `ashlar-v4.webp`, `earth.webp`, `linen-v4.webp`, `wool-v4.webp`, `bay-v3.png` y mapas normales `rock-normal-v1.png`, `wood-normal-v1.png`, `metal-normal-v1.png`.

### 2. Cuadrícula y Escala Canónica
- **Métrica táctica:** Cuadrícula de 1.5 metros por casilla (estándar 5 pies de D&D 5e).
- **Dimensiones globales:** 112 columnas × 80 filas = **168.0 m × 120.0 m** de mapa táctico continuo.
- **Origen y traslación:** Coordenadas de origen `[72.0, 72.0]` y traslación canónica de A1 en `[72.0, 9.0, 72.0]`.

### 3. Jerarquía de Cotas de Elevación Canónicas
| Elemento / Zona | Cota canónica (Y) | Función táctica y física |
| --- | --- | --- |
| Manto oceánico | 0.00 m | Nivel del mar circundante |
| Plataforma baja cabrestante (mar) | 0.24 m | Recogida de mercancías en cota de flotación |
| Playa y Embarcadero (Z1) | 0.25 m | Desembarco del bote y orilla arenosa |
| Sendero de Pleamar (Z10) | 0.25 m – 0.59 m | Ruta costera suroeste hacia cuevas marinas |
| Plaza Central y Celdas A1 (Z3) | 9.00 m | Terraza baja del monasterio y claustro |
| Terraza Cabrestante A2 (Z4) | 15.00 m | Plataforma alta del almacén logístico |
| Comedor y Cocina A3 (Z5) | 18.00 m | Caverna comunal excavada en la montaña |
| Biblioteca del Retiro A4 (Z6) | 18.00 m | Scriptorium y archivo monástico |
| Paseo Superior y Cornisas (Z9) | 15.00 m – 27.00 m | Comunicación horizontal A2–A3–A4–A5 |
| Templo de Bahamut A5 (Z8) | 27.00 m | Santuario sagrado al aire libre en la cumbre |
| Sendero del Observatorio (Z10) | 18.00 m – 37.00 m | Ascensión oriental hacia las altas cumbres |

---

### 4. Las 11 Zonas Canónicas del Retiro
1. **Zona 1 — Playa y Embarcadero (Z1_BEACH):** Cols 12..48, Rows 61..76 (18.0..73.5m, 91.5..115.5m). Muelle de roble, pilotes, bote de remos amarrado (`boat`), punto de desembarco de los aventureros (`spawn`), dunas de arena cálida mineral PBR y rompientes de basalto.
2. **Zona 2 — Subida al Retiro (Z2_ASCENT):** Cols 40..48, Rows 61..68. Escalera de tres tramos tallada en la roca viva con bordillos de piedra, descansillos y faroles náuticos ámbar (salto de cota 0.25m → 9.0m).
3. **Zona 3 — A1: Celdas y Plaza Central (Z3_A1_PLAZA):** Cols 49..94, Rows 51..65 (73.5..142.5m, 76.5..99.0m, cota Y=9.0m). Plaza central con hoguera comunitaria, bancos con paños plegados, estatua de Astalagan con velas votivas y 6 celdas desiguales excavadas al norte.
4. **Zona 4 — A2: Cabrestante y Almacén Marino (Z4_A2_WINCH):** Cols 103..108, Rows 43..46 (154.5..163.5m, 64.5..70.5m, cota Y=15.0m). Caseta de madera (4.5m × 4.0m), torno, eje, tambor, cable y plataforma de carga con recorrido vertical 0.24m ↔ 15.0m.
5. **Zona 5 — A3: Comedor y Cocina Excavados (Z5_A3_DINING):** Cols 76..85, Rows 34..43 (114.0..129.0m, 51.0..66.0m, cota Y=18.0m). Mesa comunal larga con bancos, silla de respaldo alto y pasillo interior hacia la cocina con fogón y despensa.
6. **Zona 6 — A4: Biblioteca del Retiro (Z6_A4_LIBRARY):** Cols 62..73, Rows 35..43 (93.0..111.0m, 52.5..66.0m, cota Y=18.0m). Puerta de roble exterior, scriptorium interior, 20 estanterías murales y 3 exentas con pergaminos y códices, mesas de estudio y atriles.
7. **Zona 7 — Jardines y Bosquetes (Z7_GARDENS):** Cols 45..62, Rows 42..50 (67.5..94.5m, 63.0..76.5m, cotas Y=12.0m..18.0m). Terrazas ajardinadas con 14 jardineras de piedra, flores de armeria, matas de salvia y bosquetes de pinos marítimos y olivos.
8. **Zona 8 — A5: Templo de Bahamut (Z8_A5_TEMPLE):** Cols 23..32, Rows 42..50 (34.5..49.5m, 63.0..76.5m, cota Y=27.0m). Plataforma sagrada de caliza clara, estatua monumental de Bahamut, 4 columnas acanaladas perimetrales, estanque sagrado y 7 perchas para los canarios dorados de Bahamut.
9. **Zona 9 — Paseos y Explanadas (Z9_UPPER_WALKWAY):** Cols 33..102, Rows 43..45 (49.5..154.5m, 64.5..69.0m, cotas Y=15.0m..27.0m). Cornisa superior rocosa con paseo pavimentado articulando el tránsito horizontal y miradores oceánicos.
10. **Zona 10 — Rutas hacia el Resto de la Isla (Z10_ISLAND_ROUTES):** Sendero de Pleamar (Cols 2..11, Rows 74..75, Y=0.25..0.59m) hacia cuevas y pecios, y Sendero del Observatorio (Cols 80..107, Rows 10..42, Y=18.0..37.0m).
11. **Zona 11 — Entorno Global (Z11_GLOBAL_ENV):** Bounding global 168m × 120m, manto oceánico somero, farallón de basalto continuo y telón escénico 2.5D.

---

### 5. Las 6 Celdas de Peregrinos de A1 (Canon Oficial)
| Celda | Rol canónico | Entrada global (Col, Row) | Posición mundial (X, Y, Z) | Mobiliario canónico |
| --- | --- | --- | --- | --- |
| Celda 1 | Habitación libre | (54, 57) | 81.75m, 9.0m, 86.25m | 1 Cama, 1 mesita, 1 escritorio, 1 silla |
| Celda 2 | Tarak (Herborista) | (60, 57) | 90.75m, 9.0m, 86.25m | 1 Cama, 1 mesita, 1 escritorio, 1 silla |
| Celda 3 | Varnoth (Comandante) | (67, 57) | 101.25m, 9.0m, 86.25m | 1 Cama, 1 mesita, 1 escritorio, 1 silla |
| Celda 4 | Myla (Erudita/Taller) | (74, 57) | 111.75m, 9.0m, 86.25m | 1 Cama, 1 mesita, 1 escritorio, 1 silla, herramientas |
| Celda 5 | Kobolds oeste (Ruk) | (81, 57) | 122.25m, 9.0m, 86.25m | 4 Hamacas para kobolds |
| Celda 6 | Kobolds este (Meepo) | (87, 57) | 131.25m, 9.0m, 86.25m | 4 Hamacas para kobolds |

*Total verificado:* 4 camas individuales y 8 hamacas canónicas exactas.

---

### 6. Registro de los 16 Landmarks Canónicos
| ID | Superficie | Casilla (Col, Row) | Posición Mundial (X, Y, Z) | Descripción |
| --- | --- | --- | --- | --- |
| `spawn` | beach | [16, 74] | (24.75, 0.25, 111.75) | Llegada de los Aventureros |
| `boat` | beach | [13, 75] | (20.25, 0.25, 113.25) | Bote de remos amarrado |
| `pleamar` | pleamar | [3, 74] | (5.25, 0.25, 111.75) | Sendero de Pleamar |
| `observatorio` | observatorio | [93, 33] | (140.25, 18.00, 50.25) | Sendero al Observatorio |
| `a2-door` | a2 | [105, 45] | (158.25, 15.00, 68.25) | Puerta del Cabrestante |
| `winch` | a2 | [107, 45] | (161.25, 15.00, 68.25) | Torno del Cabrestante |
| `community` | a3 | [79, 40] | (119.25, 18.00, 60.75) | Mesa Comunal (Comedor A3) |
| `library` | a4 | [68, 39] | (102.75, 18.00, 59.25) | Estanterías de la Biblioteca |
| `a4-door` | a4 | [68, 42] | (102.75, 18.00, 63.75) | Puerta de la Biblioteca |
| `temple` | a5 | [27, 43] | (41.25, 27.00, 65.25) | Templo de Bahamut |
| `runara` | a5 | [29, 43] | (44.25, 27.00, 65.25) | Runara (Líder del claustro) |
| `tarak` | a1 | [59, 57] | (89.25, 9.00, 86.25) | Tarak (Monje herborista) |
| `varnoth` | a1 | [66, 57] | (99.75, 9.00, 86.25) | Varnoth (Comandante retirada) |
| `myla` | a1 | [74, 57] | (111.75, 9.00, 86.25) | Myla (Erudita y artesana) |
| `kobold-west` | a1 | [81, 57] | (122.25, 9.00, 86.25) | Kobolds oeste (Ruk y cuadrilla) |
| `kobold-east` | a1 | [87, 57] | (131.25, 9.00, 86.25) | Kobolds este (Meepo y aprendices) |

---

### 7. Preajustes de Cámara Táctica 2.5D
Paridad con la geometría ampliada en `RETREAT_ZONE_VIEWS` / `CAMERA_PRESETS`:
- `overview`: Objetivo `(88.0, 14.0, 74.0)`, `ortho_half = 46.0`, Pitch 27°, Yaw 0°.
- `beach`: Objetivo `(17.5, 1.5, 108.0)`, `ortho_half = 18.0`, Pitch 25°, Yaw 0°.
- `a1`: Objetivo `(106.0, 9.5, 89.0)`, `ortho_half = 38.0`, Pitch 25°, Yaw 0°.
- `a2`: Objetivo `(160.0, 15.0, 67.5)`, `ortho_half = 9.0`, Pitch 25°, Yaw 0°.
- `a3`: Objetivo `(122.0, 18.5, 58.0)`, `ortho_half = 9.5`, Pitch 26°, Yaw 0°.
- `a4`: Objetivo `(99.0, 18.5, 58.0)`, `ortho_half = 10.5`, Pitch 26°, Yaw 0°.
- `a5`: Objetivo `(41.5, 27.5, 68.5)`, `ortho_half = 9.5`, Pitch 24°, Yaw 0°.
- `caves`: Objetivo `(109.0, 19.0, 58.5)`, `ortho_half = 24.0`, Pitch 27°, Yaw 0°.

---

## Verificación, Pruebas Automatizadas y Capturas Forward+

1. **Suite automatizada headless (`test_retreat_layout.gd` en Godot 4.7.2 tras la última edición):**
   - **Pruebas superadas:** **129 / 129 PASS (100 %)**
   - **Fallos:** **0 FAIL**
   - **Reporte generado:** `output/godot-retiro-layout-20261114/layout-tests.json`
2. **Inspección visual Forward+ (5 encuadres en ventana 1600×900 sobre Vulkan GeForce MX350):**
   - `output/godot-retiro-layout-20261114/retiro-overview.png`
   - `output/godot-retiro-layout-20261114/retiro-beach.png`
   - `output/godot-retiro-layout-20261114/retiro-a1.png`
   - `output/godot-retiro-layout-20261114/retiro-caves.png`
   - `output/godot-retiro-layout-20261114/retiro-a5.png`

### Ejecución Local
- Desde la raíz de Dungeons, `ABRIR-RETIRO-GODOT.cmd` abre el escenario interactivo en Godot 4 Forward+.
- Controles:
  - **WASD:** Desplazamiento táctico del clérigo.
  - **Q / E:** Rotación orbital de cámara en pasos de 45°.
  - **Rueda del ratón:** Zoom 2.5D continuo.
  - **Clic derecho / central:** Arrastre panorámico por el mapa.
  - **Espacio / Tecla F:** Recentrar la cámara sobre el aventurero.
  - **Teclas 1..6 y 0:** Salto instantáneo entre preajustes canónicos de zona (Playa, A1, A2, A3, A4, A5, Vista General).

## Cámara actualizada — 14/11/2026

La cámara vigente y sus nuevas pruebas se registran en [Cámaras Godot](GODOT_CAMERAS_20261114.md). Esta actualización sustituye los valores de cámara anteriores de esta ficha y conserva el mapa, arte y contratos existentes.
