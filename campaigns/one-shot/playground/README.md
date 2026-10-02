# D8 Night — Babylon Playground

Esta carpeta contiene la fuente maestra del prototipo de **D8 Night** para Babylon Playground.

## Fuente única

La versión activa se construye únicamente desde:

- `index.ts` — motor del Playground.
- `d8night.config.ts` — mapas, objetos, `CANON` y `VTT_AMBIENCE`.
- `VERSION` — número de versión activa.
- `generate-playground-json.mjs` — genera los JSON que consume Babylon.

Los JSON no se editan como fuente maestra.

## Qué archivo cargar en Babylon

**Usar siempre `playground_current.json`.**

La carpeta mantiene además:

- `playground_vN.json` — snapshot numerado de la misma versión activa.
- `historico/` — snapshots numerados anteriores.

Cuando la versión activa es V26:

```text
playground/
├── VERSION                    ← 26
├── index.ts                   ← fuente V26
├── d8night.config.ts          ← D8_VERSION = "V26"
├── generate-playground-json.mjs
├── playground_current.json    ← cargar este en Babylon
├── playground_v26.json        ← snapshot numerado idéntico
└── historico/
    ├── playground_v25.json
    └── ...
```

## Publicación de una nueva versión

1. Modificar `index.ts` y/o `d8night.config.ts`.
2. Cambiar `VERSION` al nuevo número.
3. Cambiar `D8_VERSION` en `d8night.config.ts` al mismo valor, por ejemplo `"V27"`.
4. Ejecutar:

```bash
node generate-playground-json.mjs
```

El generador:

- aborta si `VERSION` y `D8_VERSION` no coinciden;
- serializa una sola vez el proyecto;
- usa ese mismo contenido para `payload.code` y `payload.unicode`;
- genera `playground_vN.json`;
- genera una copia byte a byte idéntica en `playground_current.json`;
- mueve versiones numeradas anteriores a `historico/`.

Esto evita los fallos anteriores en los que Babylon ejecutaba una copia antigua incrustada en `payload.unicode`.

## Regla de trabajo

`playground_current.json` es el **único punto de entrada estable para pruebas manuales en Babylon**.

`playground_vN.json` sirve para identificar y conservar la versión actual. No hay que elegir entre ambos para trabajar: para Babylon se usa `current`.

## Arquitectura del VTT

Cada mapa mantiene separados:

- **CANON** — contenido narrativo y mecánico respaldado por la aventura.
- **VTT_AMBIENCE** — cámara, iluminación, materiales, VFX, presentación e interacción ambiental que no cambia la historia.

El VTT mantiene decisiones narrativas y tiradas bajo control del DM.
