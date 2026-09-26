# Alpha 0.3 DEV1 — resultados de implementación, 2026-09-15

> **Actualización de trabajo, 2026-09-16.** El corte histórico inferior conserva la evidencia de aquel momento. Después se integró la familia local `objects-v4` de puerta sobre lienzo y bisagra comunes; queda pendiente su aceptación visual/física, por lo que no se eleva a RC. Babylon.js `9.26.0` ya está fijado en `package.json` y lockfile. `engine/client/terrain3d.ts` añade una prueba aislada con `NullEngine`, malla de relieve, grid proyectado, oclusores, luz y cámara: no es todavía el renderizador VTT ni cambia save/protocolo. La suite actual es 39 pruebas; typecheck, build y smoke de la campaña privada pasan.

Versión comprobada: `package.json` y pack `0.3.0-dev.1`, protocolo4, save formato1/campaignStateVersion1. Build/typecheck PASS, Vitest36/36, auditoría histórica actualizada10/10 bloques sin fallo automatizado, integraciones general/objetos PASS, `node scripts/alpha03-smoke.mjs` PASS en servidor hijo, puerto libre y DATA_DIR temporal. **No es RC aceptada**; D01–D03 fallan y ninguna prueba física nueva se atribuye al usuario.

| Caso | Estado DEV1 | Evidencia y límite |
|---|---|---|
| P01 | Parcial | Round-trip real de objetos de todas las escenas, puerta destruida/locked privado, actor sobre restos, criatura oculta y cinco canales audio en `persistence.test.ts`. Reinicio HTTP smoke; faltan combinaciones y medir avance audio. |
| P02 | Pendiente | Persistencia excluye step/input y usa celda comprometida; falta ensayo de paso en curso con cierre y giro bloqueado. |
| P03 | Parcial | Test comprueba sesiones/step/undo efímeros limpios; smoke comprueba reclamo anterior rechazado. Falta proyector/audio/requests multicliente completos. |
| P04 | Pendiente | Autosave debounce1s/max5s y audio30s implementados; faltan concurrencia dos manuales+movimiento continuo/fallo inyectado. |
| P05 | Pendiente | Prueba de restart normal y active corrupto; no caída real instrumentada antes/después de fsync/rename. |
| P06 | Parcial | ENOSPC precommit y error postcommit inyectados a nivel coordinador; conserva memoria/reconcilia active exacto. No hay matriz fs real Windows EPERM/EIO/ROFS. |
| P07 | Parcial | Legado0 real archivado y migrado a1; formato futuro entra modo incompatible sin fallback automático. Faltan variantes negativas campaña/stateVersion y migración fallida por IO. |
| P08 | Parcial | API privada anónima401, Origin ajeno403, UTF8/duplicados/checksum, DTO público auditado; faltan límites4MiB/prototype/HTML y browser seguro. |
| P09 | Parcial | Preview no muta, CAS viejo rechazado, anterior archivado, requestId restore idéntico no repite. En navegador temporal DM, Cancelar conservó generación2; faltan BUSY/TTL/otro DM y restore físico completo. |
| P10 | Parcial | Doble writer bloqueado y ruta con espacios en tests. Node/package/lanzadores rama24 alineados; no test Windows doble proceso, symlink ni lock huérfano automático completo. |
| P11 | Parcial | Smoke envía hp/SFX DM y claim jugador con epoch viejo tras restore y recibe STALE_RUNTIME sin cambiar revisión; faltan dos DM, dos jugadores, proyector, input/ready/cargas asíncronas. |
| P12 | Parcial | IDs, capacidades, colisiones, puerta rota locked privada y criatura oculta/visible bajo objeto ensayadas; faltan todos los casos hostiles de hidratación. |
| P13 | Parcial | Active truncado+backup válido con recuperación HTTP/archivo de evidencia; ambos corruptos, sólo temporal y futuro verificados a nivel store. Falta preservar evidencia fallida/IO y UI física. |
| P14 | Parcial | Cierre normal flush y reapertura PASS; SAVED generación confirmada; falta shutdown timeout/error visible físicamente. |
| P15 | Parcial/FAIL visual | Regresión typecheck/build/tests/auditorías/socket PASS. D01–D03 fallan, navegador y hardware pendientes. |

| Caso puerta | Estado DEV1 | Observación |
|---|---|---|
| D01 | FAIL | Fondo actual sigue con tabique desalineado del hueco lógico x312/y192–240; observado además en navegador DM temporal a escala real. Borradores ImageGen no preservaron localmente sala/geometría. |
| D02 | FAIL | Door abierta v3 sigue casi frontal frente a cerrada cenital; no hay familia v4 integrada. |
| D03 | FAIL | Daño/restos v3 existen funcionalmente, pero no comparten la nueva bisagra/lienzo v4 requeridos. |
| D04 | Parcial | Preview privado/cancelar/rojo fueron comprobados previamente; nuevas anclas v4 aún no existen, verde físico pendiente. |
| D05 | Pendiente | Pies/aro junto a hoja abierta no se pueden verificar sin familia v4. |
| D06 | Usuario pendiente | Recorrido físico puerta y móvil vertical/horizontal sólo después de candidata completa, no se sustituye por capturas automáticas. |

Estado0.3.1 actual: Babylon.js9.26.0 (Apache-2.0) está instalado y se limita intencionadamente a la prueba aislada descrita arriba. Aún no hay escena render3D integrada ni migración de pack/save. El one-shot privado ya tiene un pack separado de seis localizaciones; no sustituye la validación del motor. Véase `ALPHA_0_3_1_TERRAIN_CONTRACT.md`.

Rollback local DEV1: `backups/alpha-0.3.0-dev1-20260915.zip`, SHA-256 `4574020BE1D040A67F1F900657E495093196D133720F1252CC8CE92B7C953911`; copia privada de trabajo, no RC distribuible. No contiene saves ni originales del one-shot.
