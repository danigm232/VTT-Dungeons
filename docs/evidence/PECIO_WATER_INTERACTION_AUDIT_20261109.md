# Pecio Rosa de los Vientos · Auditoría de Interacción Mar-Objetos y Riqueza Visual (VA-15 / VA-05)

Fecha: 09/11/2026  
Mapeo de Roadmaps: `ROADMAP_V1.md` (M5 consolidación visual), `VISUAL_ROADMAP.md` (VIS-3/4/5), `VISUAL_GAP_AUDIT_20261101.md` (VA-05, VA-15).

---

## 1. Diagnóstico y Problemas Resueltos

| Elemento | Diagnóstico Previo | Mejora Implementada | Archivo Propietario |
| :--- | :--- | :--- | :--- |
| **Color y Opacidad de Espuma** | Tinte verdoso oscuro (`#045, #14, #15`) con alfa ~0.3 (casi invisible); bordes de corte duros y plásticos. | Espuma marina blanca cremosa (`#e8f8f5`) con resalte glint (`#f5fffe`), turbulencia celular y alfa de hasta 0.88 en la cresta de choque. | [`engine/client/wreck-ocean.ts`](file:///c:/Users/User/Desktop/Dungeons/engine/client/wreck-ocean.ts) |
| **Amplitud de Oleaje** | 4.7 cm de oscilación senoidal simple; agua casi inmóvil de piscina. | 19.5 cm de oleaje trocoidal (swell atlántico + contraola + chop armónico) en `wreckWaveGLSL`. | [`engine/client/wreck-water-contact.ts`](file:///c:/Users/User/Desktop/Dungeons/engine/client/wreck-water-contact.ts) |
| **Huesos de Dragón (Clyssavar)** | Banda de contacto de 0.34 m (~2 px a cámara de juego); corte seco en el agua. | Collar de rompiente ensanchado a 0.85 m con turbulencia orgánica y espuma viva. | [`engine/client/wreck-ocean.ts`](file:///c:/Users/User/Desktop/Dungeons/engine/client/wreck-ocean.ts) |
| **Casco y Brecha de Popa** | Estela tímida de 0.96 m estribor / 0.72 m babor. | 1.45 m estribor / 1.15 m babor con oleaje y resaca de reflujo. | [`engine/client/wreck-ocean.ts`](file:///c:/Users/User/Desktop/Dungeons/engine/client/wreck-ocean.ts) |
| **Rocas del Arrecife** | Contactos estrechos de 0.75 m / 1.28 m. | 1.20 m / 1.65 m con salpicaduras en los espolones basálticos. | [`engine/client/wreck-ocean.ts`](file:///c:/Users/User/Desktop/Dungeons/engine/client/wreck-ocean.ts) |
| **Barca de Abordaje** | 0.68 m con partículas estáticas. | 0.95 m de estela perimetral blanca en `ship-rowboat3d.ts`. | [`engine/client/ship-rowboat3d.ts`](file:///c:/Users/User/Desktop/Dungeons/engine/client/ship-rowboat3d.ts) |
| **Profundidad y Cáusticas** | Océano plano sin refracción. | Red procedimental de cáusticas animadas sobre los arrecifes sumergidos (`shallows(uv)`) y crestas de espuma en mar abierto. | [`engine/client/wreck-ocean.ts`](file:///c:/Users/User/Desktop/Dungeons/engine/client/wreck-ocean.ts) |

---

## 2. Validación Técnica

1. **Vitest Suites:** **16/16 suites pasadas, 124/124 tests pasados** (incluyendo `wreck-rebuild.test.ts`, `wreck-performance.test.ts`, `wreck-atmosphere.test.ts`).
2. **TypeScript:** 0 errores en `tsconfig.client.json` y 0 errores en `tsconfig.server.json`.
3. **Compilaciones de Producción:**
   - Cliente Vite (`dist/web/`): PASS (2.318 módulos transformados en 2m 6s).
   - Servidor Node (`dist/server/`): PASS.
4. **Visor Comparativo Interactivo:** Disponible en [`output/stormwreck-zone-finish-20261104/water-interaction-report.html`](file:///c:/Users/User/Desktop/Dungeons/output/stormwreck-zone-finish-20261104/water-interaction-report.html) con alternancia clic antes/después y ampliación al 100%–300%.
