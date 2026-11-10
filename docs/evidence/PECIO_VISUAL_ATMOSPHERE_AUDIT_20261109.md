# Pecio Rosa de los Vientos · consolidación visual M5 y auditoría zona a zona

Fecha: 09/11/2026. Trabajo ejecutado bajo la Fase 2 del roadmap local del Pecio, conforme a `AGENTS.md` y `ROADMAP_V1.md`.

## 1. Mejoras de Fondo, Cielo y Atmósfera (M5)

### 1.1. Cielo y horizonte marino dinámico (`apps/web/world.ts`)
- **Problema previo:** El color de borrado de la escena (`terrainScene.clearColor`) permanecía fijado estáticamente en `.025, .07, .09, 1` (negro/petróleo oscuro), provocando que en tomas diurnas con pleno sol el fondo superior tras las montañas pareciera un vacío negro desvinculado del océano iluminado.
- **Mejora aplicada:** Se sincroniza dinámicamente `clearColor` con el reloj y clima de la campaña:
  - **Día despejado:** Interpolación suave hacia cielo costero marino `#253d47`.
  - **Tormenta / Lluvia:** Gris plomizo de temporal `#1a2930`.
  - **Noche:** Azul marino oscuro de luna `#0a151b`.
  - **Sentina sumergida (C8/C9):** Tono profundo de penumbra subacuática `#040a0e`.
- **Efecto:** El horizonte del océano continuo (`wreck-ocean.ts`) se funde naturalmente con la atmósfera sin líneas de corte artificiales ni parpadeos.

### 1.2. Ampliación del panorama montañoso (`engine/client/wreck-scenic-depth.ts`)
- **Problema previo:** Las crestas volcánicas y acantilados cubrían un arco muy reducido (-62° a +38°), y desaparecían de golpe si la cámara rotaba más de 52° desde el eje frontal de la barca.
- **Mejora aplicada:**
  - `wreck:scenic:far-volcanic-crest`: arco ampliado a [-78°, +48°] con 96 segmentos.
  - `wreck:scenic:middle-island-ridge`: arco ampliado a [-72°, +44°].
  - `wreck:scenic:near-coastal-cliffs`: arco ampliado a [-65°, +38°].
  - `wreck:scenic:horizon-mist`: arco ampliado a [-125°, +65°].
  - Tolerancia de ángulo exterior de cámara extendida a `radians(68)` para permitir giros orbitales fluidos sin pérdida repentina del telón de fondo.
  - Vértices totales estrictamente contenidos (1.269 vértices, por debajo del límite de 1.500).

---

## 2. Auditoría Meticulosa Zona a Zona (C1 a C9, Cofa y Exterior)

| Zona | Elementos Canónicos del Libro (Cap. 3 D&D) | Estado en Código e Implementación | Verificación y Cierre |
| :--- | :--- | :--- | :--- |
| **C1 · Cubierta Principal** | Acceso por jarcia P01 desde la barca; tablas resbaladizas con algas, botas viejas, huesos y manchas de sangre; accesos a C2, C3, C4, C5, C8 y cofa. | Textura ilustrada `deck-planks-art06.png`, decal cutout `c1-board-debris-art09.png`, escala a cofa y escotillas físicas coincidentes con colisión. | **100% Conforme.** Tránsito libre de obstáculos espurios; paso de abordaje validado por tests. |
| **C2 · Castillo de Proa** | Trinquete quebrado sobre la barandilla; lona desgarrada cayendo a rocas y huesos; balista rota e inservible. | Mástil inclinado `wreck-exterior.ts`, lona con transparencia `tattered-sail-art08.png`, balista biselada en `ship-props3d.ts`. | **100% Conforme.** Sin interacciones de disparo falsas. |
| **C3 · Alcázar / Popa** | Mástil de mesana astillado; timón torcido desanclado con inscripción en nácar invertida "Rosa de los Vientos"; vistas a la fractura. | Timón interactivo en `server.ts` con 3 estados (`upright`, `caught`, `fallen`); mecánica de caída alerta a C4. | **100% Conforme.** |
| **Cofa (Nido de Arpía)** | Palo mayor de 15 m; nido orgánico con ramas, hierba, pelo, huesos y baratijas (120 po). | Superficie `crow` elevada 15 m, nido volumétrico de radio 2,86 m en `wreck-nest.ts` con exclusión interior para cuerda. | **100% Conforme.** Atletismo CD 10 opcional bajo DM con descenso libre sin daño. |
| **C4 · Camarote Timonel** | Puerta atrancada con listón de madera exterior (P06); mesa/escritorio con 2 cajones y pergaminos húmedos; 3 zombis ocultos. | Objeto interactivo `c4-barred-door`, escritorio con cajones modelados, zombis ocultos hasta abrir, recorte de techo al entrar. | **100% Conforme.** Botín privado hasta apertura. |
| **C5 · Camarote Capitán** | Puerta cerrada; mesa con bitácora, cartas de navegación, armario y caja vacía; sin enseres inventados. | `c5-door`, muebles rústicos sin peroles o botín no canónico; recorte superior al cruzar umbral. | **100% Conforme.** Verificado por `wreck-atmosphere.test.ts`. |
| **C6 · Oficiales / Literas** | Retrato al óleo de Aleitha y Brastos; tablón suelto en el suelo con trampa y alijo oculto (200 po). | Retrato orientado al interior (`c6-aleitha-brastos-portrait-art10.png`), trampa `c6-trapped-stash` idempotente en servidor. | **100% Conforme.** Alijo seguro contra exploits de recarga. |
| **C7 · Tripulación** | Literas destrozadas superpuestas; mantas podridas; silla rota. | Literas con albedo desgastado, mantas oscurecidas, oclusión suave para no tapar ocupantes. | **100% Conforme.** |
| **C8 · Bodega Inundada** | 15–45 cm de agua fría y turbia con gradiente; 3 cajas con botín (tabla d6); 4 barriles decorativos; 3 zombis + 1 gul. | Superficie inclinada `hold-air`, agua translúcida con oleaje interno, tabla d6 ligada estrictamente a cajas. | **100% Conforme.** Barriles excluidos de la tabla de tesoro. |
| **C9 · Pañol Sumergido** | Completamente anegado a -2,78 m; brecha de casco con salida al mar (P16); cofre de hierro sellado con paquete de nigromancia. | Superficie `sea` sumergida, `c9-iron-chest`, cáusticas y peces procedurales; detección de cercanía a 2 casillas sin forzar ganzúa. | **100% Conforme.** Nadadores pueden entrar directamente por popa. |
| **Exterior / Arrecife / Clyssavar** | Huesos del dragón de oro Clyssavar perforando y sosteniendo el casco; rocas afiladas y barca de abordaje. | Cráneo anatómico completo (cuernos curvados, corona, cresta), columna vertebral y costillas hasta 2,8 m sobre el mar; barca 3D con bancos y spray. | **100% Conforme.** Coincide con el texto canónico de pp. 22–27. |

---

## 3. Pruebas y Compilaciones

1. **Vitest:** 16/16 suites PASS, 124/124 tests PASS (incluyendo `wreck-scenic-depth.test.ts`, `wreck-atmosphere.test.ts`, `wreck-performance.test.ts`).
2. **TypeScript:** `tsconfig.server.json` (0 errores) y `tsconfig.client.json` (0 errores).
3. **Compilación de Producción:**
   - Cliente Vite: PASS (`dist/web/`, 2.317 módulos transformados).
   - Servidor Node/Express: PASS (`dist/server/`).
