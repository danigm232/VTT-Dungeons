# Auditoría Astra y relevo a Sol — 2026-09-13

**Documento histórico de RC1.** Sus fallos se corrigieron en RC2, aceptada operativamente el 2026-09-14. ALPHA_0_2_AUDIT_RESULTS.json contiene ahora la ejecución posterior 12/12 PASS; no es la salida histórica 5/12 de esta revisión. Encargo activo en NEXT_MODEL_PROMPT.md.

## Dictamen

`package.json` identifica `0.2.0-rc.1`, pero es una **implementación parcial ejecutable**, no una candidata completa según el contrato. La última entrega aceptada operativamente sigue siendo Alpha 0.1.1 RC4. No basta con desacoplar el pack y pedir pruebas físicas: faltan funciones y hay errores reproducidos. Este dictamen sustituye los resúmenes anteriores que daban por cerrada la implementación.

El bloque de Astra termina con esta auditoría y ADR-016. Sol High tiene un encargo de implementación cerrado en `docs/NEXT_MODEL_PROMPT.md`. No hay una contradicción de arquitectura que requiera otro turno de Astra antes de implementar. No se inicia 0.2.1 ni persistencia 0.3.

## Evidencia de este turno

- Copia previa no destructiva: `backups/astra-pre-review-0.2-20260913-223941.zip`.
- SHA-256: `3614A28B36EE2ACBECD400EFC2D31FD639CA1BB26ED7AE3AA0BF99B7012CC32F`. Incluye fuente/build/documentación/recursos anteriores a esta auditoría; es una recuperación de trabajo incompleto, no una release aceptada.
- Compilación del servidor fuente con TypeScript a `tmp/astra-audit-build`: PASS; no se sobrescribió `dist/`.
- Vitest del proyecto: **15/15 PASS**, repetido. Sólo dos tests se refieren a objetos; no cubren O01–O12 íntegros.
- `scripts/audit-alpha02.mjs`: **5/12 PASS y 7 FAIL** contra ese build aislado. Salida íntegra: `docs/ALPHA_0_2_AUDIT_RESULTS.json`. Código de salida 1 deliberado: informa fallos reales, no los convierte en PASS.
- R10–R12 usan sockets DM autenticados reales en un servidor propio en loopback, con puerto efímero, token aleatorio y cierre en finally. No acceden a la mesa del usuario ni reutilizan los puertos 3000/3123/3124.
- No se ejecutaron navegador ni hardware en este turno. La inspección de render/UI se identifica aparte. No se cambiaron código del producto, dependencias, audio ni assets.
- Cierre verificado: 69 archivos de apps/engine/campaigns/dist comparados por SHA-256 con la copia previa, sin cambios; 18 enlaces Markdown locales revisados, ninguno roto. Hash RC4 recalculado y coincidente con PROJECT_STATE.md. Sintaxis del nuevo auditor comprobada con node --check.

Reproducción en PowerShell, con Node oficial disponible:

```powershell
node node_modules/typescript/bin/tsc -p tsconfig.server.json --outDir tmp/astra-audit-build
$env:AUDIT_BUILD_DIR='tmp/astra-audit-build'
$env:AUDIT_REPORT='docs/ALPHA_0_2_AUDIT_RESULTS.json'
node scripts/audit-alpha02.mjs
```

El auditor está escrito para la API parcial de RC1; Sol debe adaptar su composición al bundle inyectado conservando las expectativas y mover los casos a tests mantenibles. No cambiar expectativas para ocultar un fallo.

## Hallazgos reproducidos

| ID | Resultado | Hecho y corrección exigida |
|---|---|---|
| R01 | PASS | La colisión real produce las cuatro rutas esperadas: cerrada no, abierta sí, caja en (5,3)/90° no, caja restaurada sí. Conservar. |
| R02 | FAIL | `locked → open` devuelve APPLIED. Debe devolver DOOR_LOCKED; el DM pasa primero a closed para desbloquear. |
| R03 | FAIL | `dmState().objects` reutiliza el serializador público y muestra closed cuando está locked. Separar DTO DM completo y DTO público visual. |
| R04 | FAIL | Caja horizontal en (6,4) se aplica sobre la puerta abierta. Separar huella de ubicación (marco siempre ocupado por un objeto) y huella bloqueante (vacía cuando está abierta). |
| R05 | FAIL | Una edición de objeto no incrementa world.revision. Los snapshots de estados distintos pueden tener igual revisión, incompatible con el descarte por revisión exigido. |
| R06 | FAIL | Salir/volver conserva objeto y undo pero reinicia objectRevision de 1 a 0. Guardar revisión junto al estado de cada escena. |
| R07 | FAIL | Snapshot público incluye objectRevision pese al contrato privado. Retirar contador de edición de WorldSnapshot; conservarlo en DM/ACK de objetos. No se observó exposición literal de locked al jugador. |
| R08 | PASS | Un paso real reserva origen/destino a 0/150/299 ms; a 300 ms libera origen y conserva ocupación del destino. Alcance: puerta y PJ, sin certificación de toda O04. |
| R09 | PASS | Undo sobre PJ devuelve rechazo sin consumir pila ni revisión. Conservar. |
| R10 | PASS | Reintento idéntico por socket devuelve mismo ACK sin aumentar revisión. Conservar. |
| R11 | FAIL | Mismo UUID con state distinto devuelve el éxito original. Añadir fingerprint canónico y COMMAND_ID_REUSED antes de validar CAS. |
| R12 | PASS | Dos DM con revisión igual: una edición aplica y la otra recibe STALE_OBJECTS. Aún falta devolver estado fresco al rechazado. |

## Faltantes por inspección, sin PASS visual

| ID | Evidencia concreta | Entrega necesaria |
|---|---|---|
| I01 | `engine/server/game.ts`/`navigation.ts` importan campaña; SceneId enum específico; `world.ts` importa pack; audio contiene rutas fijas; /api/campaign sin schema ni consumo cliente. | Bundle inyectado, manifiesto validado, cargador común, UI/renderer/audio por datos y campaña sintética. Incluir catálogo de los tres SFX. |
| I02 | `dm.html` carece de mapa de trabajo; `dm.ts` sólo reconstruye formularios de coordenadas. | Selección en mapa/lista, contorno, borrador local, Aplicar/Cancelar/Escape y entradas estables mientras otro jugador camina. No llamar preview a esos formularios. |
| I03 | Escena 12×9 usa `/art/wreck-deck.png` comprimido a 576×432; tabique lógico no tiene arte propio. Objetos son Graphics con rectángulos. | Fondo dedicado alineado con el fixture, puerta/caja pixel art separadas y manifiesto/licencias. No está creada la escena artística contratada. |
| I04 | Caja 2×1 se dibuja centrada en la celda ancla; el servidor ocupa ancla y siguiente. Falta +24 px de centro en eje largo con tile48. Tokens y props tienen contenedores separados con zIndex fijo. | Alinear bounds de dibujo a TODA la huella; anclas por asset y orden común por pie. Probar giro y posiciones de esquina visualmente. |
| I05 | `applySnapshot` sólo compara epoch después de awaits; no usa generación de conexión ni revisión. Projector confirma ready al resolver incluso si ya hubo otro cambio. | Cargar y confirmar sólo el último estado válido de conexión/epoch/revisión. Pruebas con carga diferida y reconexión. |
| I06 | `handleDm` descarta rechazo sin enviar DM fresco; mensajes técnicos/estados ingleses; Projector no maneja PROTOCOL_MISMATCH. | ACK homogéneo, reenvío al DM rechazado, mensajes españoles y recarga explícita ante incompatibilidad en tres roles. |
| I07 | `occupiedCells` sólo contempla PJ y objetos; no criaturas visibles. DTOs de objetos no son unión discriminada y caja tiene estado closed artificial. | Validador sobre runtime completo, criaturas visibles de la superficie actual, secretos excluidos de validación pública y tipos por capacidad. |
| I08 | `innerHTML` interpola etiquetas/IDs/inventario del pack; la integración de objetos espera algunos eventos después del connect/ACK y presupone estado inicial. | textContent/escaping seguro; tests aislados con listeners antes de conectar/enviar, timeout y finally. No usar una mesa existente para integración. |

## Matriz O01–O12 actual

O01 pendiente; O02 falla R02/R03; O03 lógica de ruta PASS, visual pendiente; O04 parcial R08/R09; O05 falla R04; O06 CAS parcial R12 y preview ausente; O07 falla R11; O08 falla R06; O09 parcial con R07 fallando y permisos específicos de objetos por probar; O10 pendiente de carreras; O11 pendiente de UI/arte/navegador; O12 conserva la integración previa, repetir tras los cambios de Sol.

Las pruebas físicas del usuario corresponden a RC4 y siguen siendo válidas para esa entrega. No pedir todavía aceptación de objetos: primero terminar UI/arte/función, pasar O01–O12 y preparar una nueva RC recuperable.
