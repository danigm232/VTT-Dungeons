# Delta de auditoría M4 y build · r34 · 25/09/2026

Este paquete es un **overlay**, no una copia completa. Para recuperar esta candidata, descomprimir primero `backups/pecio-m5-m6-qa-candidate-r32-20260925.zip` y aplicar después `backups/pecio-m4-audit-fixes-r34-20260925.zip`, conservando las rutas relativas. El delta r33 se conserva como registro histórico y queda sustituido por este.

Incluye código y documentación modificados desde la base r32:

- `apps/web/dm.ts`
- `apps/web/world.ts`
- `campaigns/stormwreck-isle/private/C1_GREYBOX_GATE.md`
- `campaigns/stormwreck-isle/private/M4_ARRIVAL_AND_DEPARTURE_AUDIT_20260925.md`
- `campaigns/stormwreck-isle/private/M4_AUDIT_DELTA_R33_20260925.md` (registro histórico)
- `campaigns/stormwreck-isle/private/M4_AUDIT_DELTA_R34_20260925.md`
- `campaigns/stormwreck-isle/private/m5/M6_M7_PHYSICAL_PLAYTEST_20260925.md`
- `campaigns/stormwreck-isle/public/wreck-runtime-v6.ts`
- `docs/NEXT_MODEL_PROMPT.md`
- `engine/server/game.ts`
- `engine/server/game.test.ts`
- `engine/server/wreck-runtime.test.ts`
- `engine/shared/campaign.ts`
- `engine/shared/protocol.ts`
- `PROJECT_STATE.md`
- `ROADMAP_V1.md`

Correcciones funcionales: botín de C4 oculto hasta abrir su puerta; tesoro de la cofa en cinco recogibles por un total de 120 po, sin duplicación; sueño del clérigo habilitado tras destruir el talismán a bordo y completar el siguiente descanso. Al construir el candidato se reparó también el resolver de animación de ataque del servidor y se añadió una regresión.

Verificación de revisión: 154/154 pruebas, tipos de cliente/servidor y builds aislados cliente/servidor PASS. La comprobación visual temporal aterrizó en la escena inicial del Retiro, no certifica el aspecto del barco. Móvil/proyector físicos, FPS sostenidos, audio escuchado y sensación subjetiva siguen pendientes de M7. El paquete excluye partidas/guardados, dependencias, `dist`, datos QA y fuentes originales `Imagenes VTT`/OneDrive.
