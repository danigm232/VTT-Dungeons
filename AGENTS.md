# Trabajo compartido en Dungeons

Las instrucciones explícitas actuales del usuario prevalecen. La planificación única es `ROADMAP_V1.md`: leer secciones 1–5 (prioridad, orden, motor y matriz concreta) antes de elegir trabajo, después `PROJECT_STATE.md`, el anexo autorizado y los archivos actuales. Los anexos no mantienen otra cola global. Conservar cambios de otros chats. Los resultados históricos no acreditan una candidata nueva. No crear otro roadmap maestro para una mejora; actualizar el maestro y la ficha pertinente.

## Trabajo visual de cualquier campaña

Leer `docs/design/VISUAL_ART_DIRECTION.md` y `docs/VISUAL_ROADMAP.md`. Consultar `docs/design/VISUAL_REFERENCE_LIBRARY.md` para elegir referencias modernas (2018 en adelante) según el aspecto a mejorar, y `docs/audits/VISUAL_GAP_AUDIT_20261101.md` para los puntos VA-01–VA-18.

- Mejorar el mismo mapa dentro del alcance autorizado. Conservar distribución/identidad/funciones vigentes, navegación, colisiones, apoyos, escala, personajes y narrativa. Una referencia visual no autoriza reconstruir el escenario o volver a una versión antigua.
- Reutilizar sistemas y arte existentes; unificar familia de materiales, vegetación, muebles, personajes, luz y profundidad. Validar una muestra del lugar antes de extender el acabado. Los efectos no sustituyen esa coherencia.
- Para cada cambio de arte registrar objeto/material por ID, archivo propietario, recurso/valor actual, derivado/valor candidato, VA/referencia y aceptación. Paleta final y resolución/UV/roughness se cierran mediante las muestras; no declararlas aprobadas por estar descritas ni inventar una migración de motor.
- Mantener la candidata jugable en cada entrega; comprobar el render integrado y antes/después con condiciones equivalentes. Separar pruebas técnicas, revisión visual, aceptación del usuario y pruebas físicas.
- Informes con capturas antes/después: al pulsar o tocar el antes, superponer el después en el mismo rectángulo; otro clic vuelve al antes, conservando encuadre, zoom y desplazamiento. Añadir etiqueta visible, teclado y ampliación para revisar detalles. Reutilizar `scripts/lib/visual-comparison.mjs` y registrar los originales. Misma cámara/resolución/estado comparable; no presentar un concepto o encuadres distintos como una comparación exacta. Esta regla se aplica a todos los informes nuevos o regenerados desde el 02/11/2026.
- Seguir el roadmap local: Retiro conserva su revisión técnica y referencias aprobadas; Cena conserva C01–C60/E0–E6; Pecio conserva M5/M7. No reabrir fases cerradas ni cambiar prioridades/criterios físicos por esta guía común.
- Las capturas comerciales son material de estudio con atribución, no recursos del juego ni activos declarados libres. Registrar procedencia de originales y derivados propios/reutilizados.

No ejecutar por defecto todo el roadmap visual durante una tarea de red, guardado o corrección funcional. No cambiar automáticamente de modelo, usar subagentes o publicar en GitHub sin autorización que lo cubra. Una actualización de documentos no equivale a implementación gráfica o despliegue.
