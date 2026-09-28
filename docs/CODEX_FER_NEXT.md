# Encargo Codex — Fer / F0 · arquitectura sin interferir con Dani

**Roadmap coordinador:** [ROADMAP_COMPARTIDO_DANI_FER.md](../ROADMAP_COMPARTIDO_DANI_FER.md). **Roadmap específico de Dani:** [ROADMAP_V1.md](../ROADMAP_V1.md). **Estado:** [PROJECT_STATE.md](../PROJECT_STATE.md). Fecha de encargo: 27/09/2026.

## Rol y objetivo

**Relevo actualizado · 27/09/2026:** leer [informe F0](FER_F0_ARCHITECTURE_20260927.md) y [línea base ejecutada](FER_BASELINE_20260927.md). Node 24.21.0 y dependencias preparados; 189 pruebas, tipos, build y cuatro integraciones PASS. No repetir auditoría/instalación desde cero. Contrastar FER-F1-001 con D0/INT0: ya hay cobertura sintética de privacidad y restauración; añadir solo una laguna demostrada o mejora útil acordada. Runtime, F1 ejecutable y adopción siguen pendientes. El encargo original inferior se conserva como alcance y criterios.

Eres el Codex de **Fer**, responsable de las bases reutilizables de un generador de campañas. Mejora la arquitectura y las herramientas universales del VTT para que Dani pueda producir campañas más rápido. No desarrolles la campaña por Dani y no refactorices código que funciona solo por estética.

## Auditoría F0 — lectura antes de cualquier implementación

1. Lee README.md, ROADMAP_COMPARTIDO_DANI_FER.md, ROADMAP_V1.md, PROJECT_STATE.md, docs/HD2D_DIRECTION.md, docs/OPEN_SOURCE_REVIEW.md y contratos vigentes de guardado/seguridad.
2. Inspecciona rutas reales del repositorio, especialmente `engine/`, `apps/`, `campaigns/`, `scripts/` y dependencias. Identifica qué partes del runtime ya son genéricas y cuáles contienen dependencias específicas de Stormwreck o D8; distingue HECHO, REUTILIZABLE, ACOPLADO, PENDIENTE.
3. Comprueba el esquema actual de campañas, serialización/persistencia, permisos DM/player/projector, Babylon/sprites, audio, triggers, objetos y tests antes de proponer nuevas carpetas o dependencias. No asumas que el esquema sugerido en el roadmap ya existe.
4. Consulta el gate open source/Drive y las licencias antes de cualquier paquete o recurso nuevo. No copies PDF, notas ni originales privados al cliente ni a docs públicos.

## Entrega F0

- Produce **matriz de capacidades** con módulo y evidencia: REUTILIZAR / EXTRAER DESPUÉS / FALTA / POSPONER. Indica consumidor real y coste/riesgo de migración.
- Define fronteras de propiedad y primer **contrato de integración mínimo**: cómo publicar un componente compartido, comprobar compatibilidad de saves, privacidad, pruebas con campaña sintética y escenario real, y cómo debe adoptarlo Dani.
- Identifica de una a tres mejoras de bajo riesgo útiles para M5/M7 o la futura Pleamar. No imponer un editor general, nuevo motor, IA de DM ni importación completa de PDF.
- Prioriza **una** primera mejora pequeña y reversible, con criterios de aceptación y archivo propietario; registra lo descartado. Si hay dependencia de una necesidad aún no reproducida, termina F0 documental y espera al ticket de Dani antes de modificar runtime.
- Solo implementar F1 si existe alcance compartido demostrado. Si lo haces, separa auditoría y código en commits/PR acotados.

## Guardrails

- Fer lidera motor, componentes y contratos; Dani lidera canon, escenas/arte específico y aceptación física. No edites `campaigns/stormwreck-isle/` como atajo para probar una mejora universal sin acuerdo y fixture aislado.
- Trabaja en rama `fer/f0-architecture` (o nueva rama no existente) y worktree distinto del de Dani. No sobrescribas docs/CODEX_DANI_NEXT.md ni docs/NEXT_MODEL_PROMPT.md, cuyo relevo vigente está orientado al Pecio.
- Preserva un único `wreck-ship` C1–C9, cofa y mar, independencia de D8 Night, autoridad del servidor y secretos DM, dados físicos y confirmación de decisiones narrativas.
- No manipules mesa real, puerto 3000, guardados activos ni backups aceptados. Ejecuta tests con `HOST=127.0.0.1`, puertos libres y directorios temporales. No declares FPS, escucha de audio ni aceptación visual por pruebas de navegador.
- Para cambios a persistencia, red o contratos de campañas, preparar migración/adapter y rollback antes de pedir a Dani que adopte. Cualquier dependencia debe pasar el gate de reutilización.

## Salida obligatoria

1. Matriz de módulos con enlaces a archivo/tests y riesgos verificados.
2. Tres o menos candidatos de mejora con costes/dependencias y selección justificada del primer incremento.
3. Contrato/ADR propuesto, plan de pruebas (sintética + Stormwreck), compatibilidad, privacidad y guía de adopción.
4. PR pequeña o informe F0 de solo lectura si los criterios de implementación no se cumplen. No afirmar que Dani la ha adoptado.
5. **Relevo:** próxima tarea concreta, modelo recomendado en función de ROADMAP_V1 y dependencia de D0/INT0; no cambiar de modelo automáticamente.
