# Mejora de sombras de contacto de personajes y muebles — todos los mapas

**Fecha:** 08/11/2026  
**Línea:** VIS-2 / VIS-4 (iluminación y sombras de contacto, VA-10, VA-11, VA-12)  
**Alcance:** Retiro del Dragón (`dragon-rest`), Pecio Rosa de los Vientos (`wreck-ship`), Campamentos (`camp`) y Espejo D8 (`mirror`).  

---

## 1. Diagnóstico y carencias atendidas

1. **Retiro del Dragón (`dragon-rest`)**:
   - `dynamicShadows` estaba desactivado en [`apps/web/world.ts`](file:///c:/Users/User/Desktop/Dungeons/apps/web/world.ts#L1380), provocando que los personajes no proyectasen silueta direccional sobre el suelo bajo el sol ni bajo antorchas o faroles locales.
   - Activado incorporando `definition.id === 'dragon-rest'` al constructor de [`WorldBillboards`](file:///c:/Users/User/Desktop/Dungeons/engine/client/world-billboards.ts).
   - Reutiliza el evaluador analítico [`actorShadow`](file:///c:/Users/User/Desktop/Dungeons/engine/client/actor-shadow.ts) sin alterar geometrías ni crear pases de render adicionales.

2. **Calidad del gradiente de contacto de personajes (todos los mapas)**:
   - En [`engine/client/world-billboards.ts`](file:///c:/Users/User/Desktop/Dungeons/engine/client/world-billboards.ts#L68-L71), la textura procedural compartida `actor:contact-shadow` tenía únicamente dos paradas de desvanecimiento brusco (`0.55` y `1.0`).
   - Se refina a 5 paradas de atenuación suave (`0 -> 0.58`, `0.28 -> 0.38`, `0.58 -> 0.14`, `0.82 -> 0.04`, `1.0 -> 0.0`), logrando una oclusión de contacto que asienta los pies sin bandas ni cortes duros.

3. **Muebles y elementos de utilería**:
   - En [`engine/client/stormwreck-object-finish.ts`](file:///c:/Users/User/Desktop/Dungeons/engine/client/stormwreck-object-finish.ts), se preserva la propagación de `receiveShadows = true` y la vinculación a los `ShadowGenerator` de escena para los elementos derivados de mobiliario y vegetación.
   - En `ship-props3d.ts` y `a1-visuals.ts`, los elementos conservan sus pisadas de contacto estáticas (`softPoolMaterial`).

---

## 2. Comprobación Día y Noche

Se verificó el comportamiento analítico mediante prueba unitaria dirigida ([`engine/client/actor-shadow.test.ts`](file:///c:/Users/User/Desktop/Dungeons/engine/client/actor-shadow.test.ts)):

1. **Día (Sol direccional activo)**:
   - `alpha`: 0.34 (moderado, nítido y estilizado, respetando el límite <= 0.55).
   - `direction`: Proyectada en el plano del suelo ($y = 0$, longitud normalizada a 1.0).
   - `length`: Sombra alargada y legible de acuerdo con el ángulo del sol (`length > 0.5`).

2. **Noche (Sol inactivo / tenue, fuentes puntuales activas)**:
   - Con antorcha puntual activa (alcance 10m, intensidad 1.2), la sombra se proyecta en sentido opuesto a la fuente ($x < 0, z < 0$).
   - `alpha`: Coherente con la distancia cuadrática y atenuación de la luz.
   - Longitud contenida y orientada a la posición del fuego.

3. **Noche profunda (sin fuentes de luz directa)**:
   - `alpha`: 0. No genera artefactos ni manchas flotantes en la oscuridad total.

---

## 3. Verificaciones técnicas

- **Unit tests**:
  - `engine/client/actor-shadow.test.ts`: **PASS** (1/1)
  - `engine/client/world-billboards.test.ts`: **PASS** (8/8)
  - `engine/client/stormwreck-actor-light.test.ts`: **PASS** (6/6)
  - `engine/client/camp-light-targets.test.ts`: **PASS** (2/2)
  - `engine/client/stormwreck-object-finish.test.ts`: **PASS** (7/7)
  - `engine/client/actor-grounding.test.ts`: **PASS** (3/3)
- **Typecheck**:
  - `tsc -p tsconfig.client.json --noEmit`: **0 errores**
  - `tsc -p tsconfig.server.json --noEmit`: **0 errores**
- **Compilaciones**:
  - Vite client bundle: **PASS** (`dist/web` construido limpiamente)
  - TypeScript server build: **PASS** (`dist/server` actualizado)
