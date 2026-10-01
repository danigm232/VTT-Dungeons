# D8 Night — Babylon Playground

Esta carpeta es la fuente maestra del prototipo de D8 Night para Babylon Playground.

## Archivos

- `index.ts`: motor estable del Playground.
- `d8night.config.ts`: mapas, objetos, CANON y VTT_AMBIENCE.
- `VERSION`: número de versión actual.
- `playground_vN.json`: archivo final versionado que Babylon Playground puede cargar.
- `playground.json`: alias interno de la versión más reciente.
- `generate-playground-json.mjs`: empaqueta los TypeScript en formato Babylon Playground v2.

## Flujo

1. ChatGPT modifica `index.ts` o `d8night.config.ts`.
2. Se incrementa `VERSION` cuando se publica una nueva pasada.
3. GitHub genera `playground_vN.json`.
4. En Babylon Playground usa **Scene → Load** y carga siempre el archivo versionado.

No hace falta localizar ni editar líneas manualmente.
