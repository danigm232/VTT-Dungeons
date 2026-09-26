# Continuación — Astra / High — Cierre Alpha 0.2

**ENCARGO HISTÓRICO, YA REVISADO.** La auditoría encontró más trabajo que el aquí descrito: siete fallos y editor/arte ausentes. Prevalecen ALPHA_0_2_ASTRA_REVIEW.md y ADR-016. El siguiente modelo es Sol High y debe ejecutar NEXT_MODEL_PROMPT.md; no repetir este relevo a Astra.

Continúa en `C:\Users\User\Desktop\Dungeons`. La candidata `0.2.0-rc.1` ya compila y funciona en servidor aislado. Lee `PROJECT_STATE.md`, `ROADMAP_V1.md`, `docs/ALPHA_0_2_CONTRACT.md`, `docs/ACCEPTANCE_RESULTS.md`, `ARCHITECTURE_DECISIONS.md`, `docs/TACTICAL_PIXEL_SPEC.md` y `LICENSES_AND_CREDITS.md` antes de cambiar código.

## Evidencia que debes conservar

- Typecheck cliente/servidor: PASS.
- Vitest: 15/15.
- Build: 840 módulos web + servidor con Node oficial 24.21.0.
- `scripts/integration-test.mjs`: PASS en puerto aislado.
- `scripts/object-integration-test.mjs`: PASS para escena, puerta, caja, `STALE_OBJECTS` y deshacer.
- La mesa del usuario en el puerto 3000 no se reinició.

## Trabajo prioritario

1. Completa A06 según el contrato: `GameServer`/`GameState` deben recibir un `CampaignServerBundle`; elimina imports y literales Stormwreck de `engine/` y del renderer. Mantén el bundle Stormwreck en `apps/server`/`campaigns`.
2. Cambia `SceneId` a cadena validada por el catálogo inyectado sin perder el control de `sceneEpoch` y `objectRevision`.
3. Haz que las tres entradas web carguen `/api/campaign` y que el renderer/DM use datos del manifiesto, sin escoger escenas, actores o assets por literales de campaña.
4. Añade una prueba de bundle sintético con IDs distintos, sin timón ni encuentro, que arranque el mismo runtime y compruebe snapshot, escena, movimiento y un objeto.
5. Revisa `objectRevision` por escena, reservas de origen/destino durante pasos y serialización de puerta bloqueada como cerrada públicamente. Corrige sólo regresiones demostradas.
6. Reconstruye y registra resultados en `PROJECT_STATE.md`, `ROADMAP_V1.md` y `docs/ACCEPTANCE_RESULTS.md`. No marques aceptación física: solicita al usuario la prueba guiada de 0.2 con móvil, PC y proyector.

## Límites

No añadas persistencia, ECS, motor físico, combate, editor general, nueva biblioteca ni assets sin licencia. No reinicies el servidor activo del usuario; usa un puerto libre. No cambies automáticamente de modelo ni uses subagentes.
