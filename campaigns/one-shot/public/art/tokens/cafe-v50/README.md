# Café sprite atlas · v50

Two transparent sprite sheets generated for the existing café cast. They add
animation and facing while keeping the authored actors and map positions.

| File | Layout | Runtime use |
| --- | --- | --- |
| `horse-drinking-8-directions.png` | 4 frames × 8 facing rows; 1024 × 1536 px | Horse drinking at the exterior trough; 3 fps, eight-direction idle/drink states. |
| `seated-men-drinking.png` | 4 frames × 2 character rows; 1536 × 1024 px | Seated drinking loops for the existing patron and bartender. |

The horse sheet's eight row bounds were measured and both sheets' genuine
alpha transparency was confirmed before integration. The character sheet reuses the existing patron
and bartender designs as visual references. Full original ImageGen prompts
were not retained; this note records the requested sheet layouts and actions,
not verbatim prompts. These are generated VTT assets, not official D&D art and
not declared CC0.

See `campaigns/one-shot/public/cafe-sprites.ts` for frame bounds, logical sizes,
anchors, direction mapping, and animation rates.
