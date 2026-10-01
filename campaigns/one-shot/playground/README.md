# D8 Night — Babylon Playground

Esta carpeta es la fuente maestra del prototipo de D8 Night para Babylon Playground.

## Archivos

- `index.ts`: motor estable del Playground.
- `d8night.config.ts`: mapas, objetos, CANON y VTT_AMBIENCE.
- `playground.json`: archivo final que Babylon Playground puede cargar.
- `generate-playground-json.mjs`: empaqueta los dos archivos TypeScript en formato Babylon Playground v2.

## Flujo

1. ChatGPT modifica `index.ts` o `d8night.config.ts`.
2. GitHub Actions regenera automáticamente `playground.json`.
3. En Babylon Playground usa **Scene → Load** y carga `playground.json`.

No hace falta localizar ni editar líneas manualmente.
