# D8 Night — Babylon Playground

Esta carpeta contiene la fuente maestra del prototipo de **D8 Night** para Babylon Playground.

> Para continuar el trabajo en un chat nuevo, leer primero **[WORKFLOW.md](./WORKFLOW.md)**. Ahí está el procedimiento completo de auditoría, edición, versionado y validación.

## Fuente única

La versión activa se construye únicamente desde:

- `index.ts` — motor del Playground, builders, render y VFX.
- `d8night.config.ts` — mapas, objetos, navegación, `CANON` y `VTT_AMBIENCE`.
- `VERSION` — número de versión activa.
- `generate-playground-json.mjs` — generador oficial.

Los JSON no se editan como fuente maestra.

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
├── d8night.config.ts
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
