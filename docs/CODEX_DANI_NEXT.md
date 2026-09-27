# Encargo Codex — Dani / D0 · Pecio y necesidades reales

**Roadmap coordinador:** [ROADMAP_COMPARTIDO_DANI_FER.md](../ROADMAP_COMPARTIDO_DANI_FER.md). **Roadmap específico:** [ROADMAP_V1.md](../ROADMAP_V1.md). **Estado:** [PROJECT_STATE.md](../PROJECT_STATE.md). Fecha de encargo: 27/09/2026. No supone cierre de M5, M6 ni M7.

## Rol y objetivo

Eres el Codex de **Dani**, responsable del contenido y la experiencia jugable de campañas concretas. Continúa la creación y aceptación del Pecio Maldito sin reconstruir el motor ni duplicar funciones de Fer. Tu segundo objetivo es aportar necesidades reproducibles para el backlog universal.

## Antes de tocar código

1. Lee ROADMAP_V1.md, PROJECT_STATE.md y el guion campaigns/stormwreck-isle/private/m5/M6_M7_PHYSICAL_PLAYTEST_20260925.md. Consulta el plan M5 de cobertura y la dirección visual. Verifica el HEAD y los cambios locales antes de editar.
2. Delimita M5: candidata técnica, aceptación artística pendiente; M6: candidata técnica, sin convertirla en release aprobada; M7: ensayo físico pendiente salvo nueva evidencia real.
3. Identifica qué elementos de M7 requieren observación de Dani y **no los marques PASS** desde un navegador simulado.

## Trabajo D0

- Haz un inventario **corto y contrastado** de los problemas vigentes del Pecio por prioridad: a) bug/capa de campaña; b) bug universal del motor; c) herramienta común ausente o difícil de utilizar. Máximo cinco propuestas iniciales.
- Para cada una: archivo/componente afectado, escena y reproducción, comportamiento esperado, impacto en la partida, solución provisional segura si existe y criterio de aceptación. No inventes fallos ni reabras errores que PROJECT_STATE documenta como resueltos.
- Conserva como contrato C1–C9 + cofa + mar dentro de un único `wreck-ship`, geometría separada de arte, CANON distinto de VTT_AMBIENCE, arbitraje y dados físicos bajo DM.
- Continúa M5/M7 cuando sea viable sin Fer: prepara candidata y guion verificable para Dani, ejecuta regresiones técnicas relevantes y entrega evidencia. No reinicies la mesa real ni manipules data/saves; puertos libres y datos temporales.
- Redacta las solicitudes transversales para Fer en el formato de ROADMAP_COMPARTIDO_DANI_FER.md. No implementes un segundo motor de ambiente/editor/scene schema cuando existe una solución compartida en curso.

## Archivos y PR

Tu propiedad principal es `campaigns/stormwreck-isle/` y documentos de aceptación de la campaña; puedes modificar interfaces compartidas **solo** con incidencia y revisión cruzada de Fer. Trabaja en rama `dani/pecio-m7` (o nueva rama no existente) y worktree propio, no en la rama de Fer. No sobrescribas docs/CODEX_FER_NEXT.md ni el roadmap conjunto para registrar avances diarios.

## Salida obligatoria

1. Estado M5/M6/M7 con HECHO TÉCNICO / PENDIENTE FÍSICO / PENDIENTE VISUAL / FAIL reproducible; evidencia con fecha/build, sin heredar falsos PASS.
2. Hasta cinco necesidades reproducibles, máximo tres propuestas para INT0, asignando responsable y dependencia.
3. Tests ejecutados, resultados y límites. Si no se puede medir FPS ni escuchar audio real, declararlo pendiente.
4. PR delimitada si hubo cambios, plan de reversión y guía de aceptación física breve para Dani.
5. **Relevo explícito:** siguiente tarea concreta, modelo recomendado según la matriz de ROADMAP_V1 y condición para pasar a Fer o volver a la campaña; no cambiar de modelo automáticamente.
