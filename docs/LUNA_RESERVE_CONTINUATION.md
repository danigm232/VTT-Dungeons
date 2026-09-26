# Continuidad Luna Reserve → Sol — Alpha 0.2.1 RC1

> **Relevo vigente2026-09-15:** contratos Astra ya cerrados. El usuario confirmó rojo/Escape y aplazó puerta/móvil físicos al final. Sol implementa puerta + persistencia juntas en Alpha0.3 mediante `docs/NEXT_MODEL_PROMPT.md`; no esperar aceptación intermedia0.2.1. RC1 conserva FAIL visual/no aceptada. Todo el bloque antiguo de tareas de esta nota es histórico; no reejecutarlo.

> **Estado vigente, 2026-09-14.** El bloqueador DEV1 descrito más abajo quedó resuelto. Se conserva sólo como historial y no debe ejecutarse otra vez.

## Resultado entregado por Luna Reserve

- Candidata técnica coherente `0.2.1-rc.1` en fuente, pack, banners y `dist`.
- Timón sin estado paralelo ni copia visual: fondo limpio, soporte fijo, separación atómica, traslado, estados caught/fallen, cuatro orientaciones, daño y restos.
- Puerta y caja con intacto/dañado/destruido; restos visibles, atravesables por personajes y reservados frente a otros objetos.
- Undo valida ocupación y no coloca objetos encima de personajes; solicitudes y borradores se invalidan por contexto/revisión.
- Preview DM muestra sprite y huella; renderer conserva vistas por ID; puerta cerrada rehecha como barrera estrecha cenital/oblicua.
- Typechecks PASS; Vitest 23/23; build; auditoría 0.2 12/12; integraciones general/objetos y auditoría 0.2.1 PASS.
- Navegador DM/Player/Projector revisado a 390×844, 844×390 y 1920×1080, sin errores ni avisos de consola.
- Recursos `objects-v3` normalizados y documentados; no se adoptó arte externo.

## Lo que queda para Sol

1. Ejecutar con el usuario `docs/ALPHA_0_2_1_PHYSICAL_CHECK.md` en Pixel 9a/Chrome, MSI y proyector 1080p.
2. Verificar en especial una sola rueda, cuatro giros, daños/restos, undo ocupado, reconexión, preview y perspectiva de puerta. Preguntar si la rueda vertical necesita un escorzo elíptico mayor.
3. Corregir sólo incidencias reproducidas y repetir pruebas proporcionales. Si no hay incidencias, registrar aceptación física y promover RC1.
4. Confirmar que se conserva el backup final `backups/alpha-0.2.1-rc1-20260914.zip` (20 528 652 bytes), SHA-256 `444F3A09524DA4AB26B4A0AF62A55B5505BF568D68EF5E520E407EC8F5352EF2`. Sólo crear otro nombre si Sol modifica el producto; no sobrescribirlo.
5. Después del PASS, pasar a Astra para definir persistencia 0.3; Sol la implementará después de ese contrato, no antes.

Regla permanente añadida: antes de cada capacidad o asset nuevo, aplicar la criba breve de reutilización de `ROADMAP_V1.md` y `docs/OPEN_SOURCE_REVIEW.md`. Encontrar algo en Internet no significa incorporarlo; deben encajar licencia, procedencia, transformabilidad, perspectiva, estilo, rendimiento y coste.

---

## Historial DEV1 ya superado

Fecha: 2026-09-14. Base recuperable intacta: `backups/alpha-0.2.0-rc2-final-20260914.zip`, SHA-256 `28588478A586510BAD5AE3BA174BFD806AFE26E3BFCC1BD35743C3BC12F96E7A`. No usar Git como rollback: el repositorio completo aparece sin seguimiento.

Copia vigente del avance: `backups/alpha-0.2.1-dev1-wheel-functional-20260914.zip`, SHA-256 `6568B9052478EF284D70C445D32ED273DFFFC7B3C6DF0E870D9A89B6B70B20AB`. La copia `alpha-0.2.1-dev1-wheel-wip-20260914.zip` es una instantánea anterior y se conserva.

## Hecho y probado: tarea 1, parte funcional

- Wheel vive en `SceneObjectState.objects`; se eliminó `wheelStates` paralelo.
- Identidad por escena/objeto, soporte fijo reservado, attachment attached/detached, estado upright/caught/fallen y rotaciones 0/90/180/270.
- `object:detach` separa y coloca atómicamente; `object:transform` mueve/gira sólo un wheel detached.
- Solicitud de jugador: Supera/Falla crea preview; Aplicar resuelve con destino; Cancelar preview no cancela la solicitud; existe botón separado Cancelar solicitud.
- Un solo prop público wheel; después de separar, canInteract pasa a false. Movimiento y teleport respetan el wheel detached.
- CAS, ACK contextual, idempotencia del dominio de objetos, historial y undo existentes abarcan detach/transform.
- Protocolo v3 exige `objectModelVersion:1`; campaña pública schemaVersion 2; HOST configurable con default LAN y runners en 127.0.0.1.
- PASS: typecheck cliente/servidor, Vitest 20/20, build, integración general y objetos, auditoría baseline 4/4 y auditoría Alpha 0.2 R01–R12.

## Bloqueador para cerrar visualmente tarea 1

No hay assets v3 producidos. La primera edición ImageGen del fondo no devolvió resultado utilizable y la generación de sprites fue interrumpida. `apps/web/world.ts` usa deliberadamente rueda/soporte procedurales para evitar URLs rotas; `pack.ts` ya reserva las claves y rutas finales. El fondo sigue siendo `/art/wreck-deck.png`, con rueda/pedestal horneados, así que hay duplicado visual tras separar.

Continuación concreta:

1. Inspeccionar `wreck-deck.png` y completar mediante ImageGen `objects-v3/wreck-deck-clean-v3.png`, quitando sólo rueda/pedestal/sombras (aprox. x150–240/y290–405) y reconstruyendo tablones.
2. Crear PNG transparentes reales: `wheel-mount-v3.png`, `wheel-attached-v3.png`, caught y fallen para 0/90/180/270. Respetar tamaños/anclas del contrato y no rotar un PNG oblicuo.
3. Cambiar el fondo de `wreck-deck` al limpio; eliminar los retornos temporales `return null` y el fallback procedural comentado en `apps/web/world.ts`; comprobar que todas las rutas de `pack.ts` existen.
4. Verificar visualmente DM/Player/Projector: attached muestra soporte+una rueda, detached muestra soporte vacío+una sola rueda en destino y cada giro es visible. Registrar prompts/procedencia en `ASSET_MANIFEST.md` y `LICENSES_AND_CREDITS.md`.
5. Añadir una integración específica de socket para detach directo + cuatro giros (la solicitud real ya está en `integration-test.mjs`; cuatro giros y no-duplicación lógica están en Vitest).

## Pendiente fuera de la tarea 1 priorizada

- Tarea 2: structure intact/damaged/destroyed para wheel/door/crate, variantes y restos atravesables.
- Tarea 3: completar todas las reglas de undo ocupado, snapshots completos/version interna y cancelación exhaustiva de solicitudes.
- Tarea 4: puerta corregida y preview con sprite; invalidación completa por generación/revisión y reutilización de vistas a 20 Hz.
- Aún faltan T01–T13 completos, auditorías actualizadas, navegador en tres resoluciones, documentación/release, backup final y prueba física. No promover DEV1 a RC1.
