# Delta de auditoría M4 · r33 · 25/09/2026

Este paquete es un **overlay**, no una copia completa. Para recuperar exactamente la candidata, descomprimir primero `backups/pecio-m5-m6-qa-candidate-r32-20260925.zip` y aplicar después `backups/pecio-m4-audit-fixes-r33-20260925.zip`, conservando las rutas relativas.

Incluye solamente código y documentación que forman la corrección M4 y su estado:

- `apps/web/dm.ts`
- `apps/web/world.ts`
- `campaigns/stormwreck-isle/private/C1_GREYBOX_GATE.md`
- `campaigns/stormwreck-isle/private/M4_ARRIVAL_AND_DEPARTURE_AUDIT_20260925.md`
- `campaigns/stormwreck-isle/private/M4_AUDIT_DELTA_R33_20260925.md`
- `campaigns/stormwreck-isle/private/m5/M6_M7_PHYSICAL_PLAYTEST_20260925.md`
- `campaigns/stormwreck-isle/public/wreck-runtime-v6.ts`
- `docs/NEXT_MODEL_PROMPT.md`
- `engine/server/game.ts`
- `engine/server/wreck-runtime.test.ts`
- `engine/shared/campaign.ts`
- `engine/shared/protocol.ts`
- `PROJECT_STATE.md`
- `ROADMAP_V1.md`

Cambios funcionales: botín de C4 bloqueado a jugadores hasta abrir su puerta, tesoro de la cofa en piezas independientes con valor conjunto de 120 po y activación del sueño del clérigo tras la ruta de destrucción del talismán a bordo. Validación actual: 153/153 pruebas y tipos de cliente/servidor PASS. El checkpoint excluye expresamente guardados/partidas, dependencias, `dist`, datos QA y fuentes originales de `Imagenes VTT`/OneDrive.
