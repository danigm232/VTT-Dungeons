# Delta M4 · llegada/salida r35 · 25/09/2026

Este archivo es un overlay incremental, no una candidata completa. Para recuperar el estado exacto: descomprimir `backups/pecio-m5-m6-qa-candidate-r32-20260925.zip`, aplicar `backups/pecio-m4-audit-fixes-r34-20260925.zip` y, por último, aplicar `backups/pecio-m4-arrival-routes-r35-20260925.zip`, conservando las rutas relativas.

## Contenido del delta

- `apps/server/index.ts`
- `campaigns/stormwreck-isle/public/retreat-runtime.ts`
- `campaigns/stormwreck-isle/public/wreck-runtime-v6.ts`
- `campaigns/stormwreck-isle/private/M4_ARRIVAL_AND_DEPARTURE_AUDIT_20260925.md`
- `campaigns/stormwreck-isle/private/M4_AUDIT_DELTA_R35_20260925.md`
- `campaigns/stormwreck-isle/private/C1_GREYBOX_GATE.md`
- `campaigns/stormwreck-isle/private/m5/M6_M7_PHYSICAL_PLAYTEST_20260925.md`
- `docs/NEXT_MODEL_PROMPT.md`
- `engine/server/wreck-runtime.test.ts`
- `scripts/integration-test.mjs`
- `PROJECT_STATE.md`
- `ROADMAP_V1.md`

## Corrección funcional

La llegada de la barca estaba desplazada y la ruta acuática hacia la brecha podía activar antes la entrada normal por P01. El actor de la barca y el destino de viaje ahora coinciden en `sea`, casilla 24,15; P01 queda a una casilla para subir físicamente a C1. El carril exterior ocupa filas 15–16 y permite alcanzar P16 nadando, separado de la ruta de jarcia. Se retiró la definición redundante P19. El DM sigue adjudicando el retorno al Retiro.

La integración de sockets comprueba dos personajes: uno recorre barco y regresa individualmente desde la barca con autorización del DM, mientras el otro permanece en C3; no cambia ni la ubicación del segundo ni el foco del proyector. Las pruebas del motor recorren entrada/salida por P16. Si el proceso sólo escucha en loopback, `/api/info`, el QR y el mensaje de inicio indican sólo el acceso local, sin anunciar una IP LAN inaccesible.

## Verificación

- Suite: **154/154**.
- Integración compilada ampliada: PASS (dos jugadores, llegada/abordaje, capas separadas, retorno individual y foco estable).
- Typecheck cliente y servidor: PASS.
- Builds aislados cliente y servidor: PASS; bundle `world` 1.615,93 kB (426,00 kB gzip), sobre el umbral de 500 kB.
- HTTP de candidata loopback: `/player` 200, textura `deck-planks-art01.png` 200; `/api/info` informa `127.0.0.1` y lista de direcciones vacía.
- Candidata abierta: `http://127.0.0.1:4399`, datos temporales en `tmp/roadmap-m7-candidate-r35-20260925/data`.

No se probaron FPS sostenidos, hardware físico, audio escuchado, fluidez subjetiva ni conexión móvil. El ZIP omite guardados, dependencias, `dist`, datos QA y fuentes originales de `Imagenes VTT`/OneDrive.
