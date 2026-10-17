# D8 Night — Babylon Playground

Esta carpeta contiene la fuente maestra del prototipo de **D8 Night** para Babylon Playground.

> Para continuar el trabajo en un chat nuevo, leer primero **[WORKFLOW.md](./WORKFLOW.md)**. Ahí está el procedimiento completo de auditoría, edición, versionado y validación.

## Fuente única

La versión activa se construye únicamente desde:

- `index.ts` — punto de entrada compatible con Babylon Playground.
- `renderer.ts` — motor de render, builders y VFX; se comparte con la partida VTT.
- `temple-environment.ts` — cinco capas decorativas independientes de Sylvania, solo para el Templo.
- `sylvania-environment.ts` — cielo, arquitectura y distancia compartidos; capas decorativas del Café, Mercado, Fritz y Cena.
- `d8night.config.ts` — mapas, objetos, navegación, `CANON` y `VTT_AMBIENCE`.
- `VERSION` — número de versión activa.
- `generate-playground-json.mjs` — generador oficial.

Los JSON no se editan como fuente maestra.

El paquete incluye además los módulos compartidos `engine/client/weather-surface.ts`, `engine/client/interior-camera.ts` y `engine/client/camera-profile.ts` desde sus fuentes originales. No mantener copias manuales en esta carpeta.

Desde V58, el Templo utiliza terreno, vecindario, geometría distante y un horizonte curvo continuo en espacio 3D. `generated-assets.ts` mantiene el contrato del wrapper sin incrustar el PNG rectangular ya retirado. Los snapshots históricos y el PNG original se conservan. El archivo generado no se edita a mano.

Desde V60, las otras cuatro escenas exteriores comparten ese cielo y vocabulario visual, conservando el jardín nevado, la taberna y el mercado. Cada capa puede desactivarse en `VTT_AMBIENCE.sylvaniaEnvironment.layers` o mediante `scene.metadata.d8Vtt.scenicEnvironment.setLayer(id, enabled)`: `near`, `village`, `distant`, `panorama`, `atmosphere`. El Templo conserva su configuración `templeEnvironment`. La cueva del Espejo mantiene su iluminación cerrada y no recibe un cielo exterior.

Desde V61, la consola DM y el reloj controlan la hora sin un bloqueo ambiental de atardecer. El atardecer utiliza sol dorado a 15°, relleno de cielo frío y sombras alargadas; día, amanecer y noche actualizan también el panorama y la bruma común. Los finales narrativos confirmados se conservan; la selección explícita de hora del DM tiene prioridad sobre su perfil natural.

## Qué archivo cargar en Babylon

**Usar siempre `playground_current.json`.**

La carpeta mantiene además:

- `playground_vN.json` — snapshot numerado de la versión activa, idéntico a `current`.
- `historico/` — snapshots numerados anteriores.

La versión real nunca se deduce del historial del chat: se lee de `VERSION`.

Estructura esperada:

```text
playground/
├── README.md
├── WORKFLOW.md
├── VERSION
├── index.ts
├── renderer.ts
├── temple-environment.ts
├── d8night.config.ts
├── generated-assets.ts
├── generate-playground-json.mjs
├── playground_current.json
├── playground_vN.json
└── historico/
    ├── playground_v(N-1).json
    └── ...
```

## Publicación de una nueva versión

1. Modificar las fuentes maestras.
2. Incrementar `VERSION`.
3. Hacer coincidir `D8_VERSION` en `d8night.config.ts`.
4. Ejecutar:

```bash
node generate-playground-json.mjs
```

El generador:

- aborta si `VERSION` y `D8_VERSION` no coinciden;
- incluye las dependencias compartidas y aborta si un import relativo no se resuelve dentro del manifest;
- serializa una sola vez el proyecto;
- usa ese contenido para `payload.code` y `payload.unicode`;
- genera `playground_vN.json`;
- genera una copia byte a byte idéntica en `playground_current.json`;
- mueve snapshots numerados anteriores a `historico/`.

## Validación mínima

Antes de probar una versión:

- `VERSION` y `D8_VERSION` coinciden;
- `playground_current.json == playground_vN.json`;
- `payload.code == decoded(payload.unicode)`;
- los archivos fuente incrustados en el payload coinciden con GitHub;
- la versión anterior está en `historico/`.

## Arquitectura del VTT

Cada mapa separa:

- **CANON** — contenido narrativo y mecánico respaldado por la aventura.
- **VTT_AMBIENCE** — cámara, iluminación, materiales, VFX, presentación e interacción ambiental.

El VTT ayuda al DM, pero no automatiza decisiones narrativas ni tiradas.

## Nota sobre la taberna

El mapa con id `cafe` puede usar un `renderMode` dedicado. Consultar siempre la sección **"Excepción actual: TABERNA"** de `WORKFLOW.md` antes de modificarlo.
