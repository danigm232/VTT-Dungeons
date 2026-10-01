# D8 Night — Babylon Playground

Esta carpeta es la fuente maestra del prototipo de D8 Night para Babylon Playground.

## Estructura

- `index.ts`: motor estable del Playground.
- `d8night.config.ts`: mapas, objetos, CANON y VTT_AMBIENCE.
- `VERSION`: número de versión actual.
- `playground_vN.json`: **única versión actual**, lista para cargar en Babylon Playground.
- `historico/`: versiones anteriores del Playground.
- `generate-playground-json.mjs`: genera el JSON de la versión actual.

## Publicación de una nueva versión

Ejemplo al pasar de v5 a v6:

```text
playground/
├── playground_v6.json      ← actual
└── historico/
    └── playground_v5.json  ← anterior
```

No se mantiene un `playground.json` sin versión.

## Flujo

1. ChatGPT modifica `index.ts` o `d8night.config.ts`.
2. Se incrementa `VERSION`.
3. La versión anterior se mueve automáticamente a `historico/`.
4. Se genera en la raíz solo `playground_vN.json`, que es el archivo que se prueba en Babylon Playground.

No hace falta localizar ni editar líneas manualmente.


## Arquitectura visual v13

Cada mapa mantiene separados:

- `CANON`: contenido narrativo y mecánico respaldado por la aventura.
- `VTT_AMBIENCE`: cámara, iluminación, materiales, VFX y acabado visual.

La pasada v13 añade un perfil visual por habitación con:

- límite seguro de luces reales para WebGL2;
- contraste y exposición por escena;
- material polish;
- sombras de contacto;
- pools de luz sin coste de PointLight;
- cámara propia;
- glow controlado.

Perfiles actuales:

- Café: `cafe_warm_fireplace`
- Templo: `temple_banquet`
- Dinner: `dinner_twilight`
- Garden: `garden_golden_hour`
- Market: `market_golden_hour`
- Mirror: `mirror_aurora_cave`
