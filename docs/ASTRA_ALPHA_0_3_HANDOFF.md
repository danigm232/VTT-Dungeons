# Entrega de Astra — contrato conjunto Alpha 0.3

2026-09-15. **DISEÑO COMPLETADO; IMPLEMENTACIÓN PARA SOL.** El usuario ha sustituido la secuencia anterior: se implementan puerta y persistencia juntas, y verifica puerta/móvil después. No se espera aceptación física intermedia0.2.1; RC1 conserva FAIL visual y aceptación parcial.

## Entregado

- `ALPHA_0_2_1_DOOR_VISUAL_CONTRACT.md`: diagnóstico, corrección localizada del fondo, geometría/ancla/bisagra compartida y cinco variantes; colisiones intactas.
- `ALPHA_0_3_PERSISTENCE_CONTRACT.md`: snapshot privado, schema/migración, todas las escenas, backup/IO/recuperación, Node24, API/UI DM, protocolo4 y reset seguro.
- `ALPHA_0_3_ACCEPTANCE_PLAN.md`: P01–P15/D01–D06 y checklist física final.
- `fixtures/alpha03/`: bundle sintético, formatos0/1 con checksums y geometría.
- ADR-020–022, revisión de reutilización y `NEXT_MODEL_PROMPT.md` como único encargo activo a Sol.

## Evidencia de este bloque

`node scripts/check-alpha03-design.mjs`: PASS de coherencia de fixtures, checksum/migración, referencias/huellas y geometría propuesta. No ejecuta almacenamiento0.3 ni corrige PNG. BackupRC1 SHA256 revalidado, sin cambios. Inspeccionados pack, runtime, protocolos, HTTP, renderer, imágenes originales y fuentes primarias de reutilización; Tiny Dungeon1.0 leído en memoria para comprobar licencia/formatos, sin incorporación.

No se modificó runtime/build, no se generó arte final, no se instalaron dependencias, no se arrancó/reinició la mesa ni se hicieron comprobaciones de hardware. La investigación previa de persistencia queda histórica: el contrato nuevo prevalece, especialmente sobre elegir temporales por mayor generación.

## Siguiente acción

El usuario cambia manualmente a Sol y le pide ejecutar íntegramente `docs/NEXT_MODEL_PROMPT.md`. Sol implementa una sola candidata0.3, la prueba y entrega las instrucciones finales. No subagentes ni cambios automáticos de modelo.
