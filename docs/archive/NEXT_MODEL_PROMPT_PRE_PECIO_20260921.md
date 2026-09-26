# Encargo vigente a Sol — D8 Night por fases, 2026-09-18

La orden más reciente del usuario es que Astra audite y Sol implemente una mejora integral de D8 reutilizable para Stormwreck. El diagnóstico está en [D8_NIGHT_AUDIT_20260918.md](D8_NIGHT_AUDIT_20260918.md) y la ruta ejecutable en [D8_NIGHT_SOL_ROADMAP.md](D8_NIGHT_SOL_ROADMAP.md). Leer ambos antes de editar. Empezar por F0/F1 y seguir dependencias hasta F7; no rehacer sistemas existentes, no probar contra guardados reales ni declarar aceptación solo por compilar. Conservar cambios locales/concurrentes, incluyendo DM móvil y audio. Las fases aún NO están implementadas por esta auditoría.

La suite actual pasa50tests, pero12observaciones reproducibles demuestran huecos fuera de esa cobertura. El PDF contradice varios valores de monstruos codificados. Corregir pruebas desde la fuente, no perpetuar supuestos del test. La transparencia real de la aldeana v4 está confirmada en el archivo; comprobar navegador/build antes de generar otra.

El encargo inferior se conserva como histórico y contexto de arquitectura/aceptación; no sustituye el orden ni el alcance inmediato de la ruta del18/09. No cambiar modelos ni abrir tareas automáticamente.

## Encargo histórico — Alpha 0.3

Decidido por Astra el 2026-09-15. Continúa en `C:\Users\User\Desktop\Dungeons`. No uses subagentes ni cambies automáticamente de modelo. **Implementa ambos contratos**, no entregues otro plan: puerta coherente con cámara/tabique y persistencia local completa, juntas en una candidata `0.3.0-rc.1`. Si ese nombre ya existe al retomar, usa el siguiente RC libre.

## Decisión más reciente del usuario

**Actualización posterior (15/09):** el usuario aprueba conservar la arquitectura web y migrar la representación a Babylon.js, con sprites2D/escenarios3D, inmersión de mesa y percepción individual futura en móviles. Astra y Sol llevan decisiones/integración principales; Terra y Luna hacen sus trabajos adecuados cuando ahorran uso de Sol, sin traspasos obligatorios. El usuario solicita continuar0.3 y0.3.1; leer `docs/HD2D_DIRECTION.md` y ADR-023. Ejecutar0.3 antes de integrar Babylon; 0.3.1 sigue después con contrato/migración propios. No ampliar el esquema de save0.3 con alturas futuras ni añadir visión individual en0.3. Conservar límites servidor/render y el versionado contratado. Corregir la familia de puerta requerida sin rehacer toda la campaña2D.

Ha confirmado preview rojo en destino ocupado/bloqueado y Escape que quita borrador/huella y devuelve selección amarilla. La puerta tiene FAIL visual previo. Ha aplazado explícitamente sus comprobaciones de puerta y móvil hasta que termines0.3. **No detener implementación pidiendo aceptación física0.2.1, ni simular sus dispositivos, ni declarar RC1 aceptada.** El histórico que exigía ese gate intermedio queda sustituido.

## Lectura mínima obligatoria

1. `PROJECT_STATE.md`, ADR-020–023 en `ARCHITECTURE_DECISIONS.md` y `docs/HD2D_DIRECTION.md` (dirección futura; no ampliar0.3).
2. `docs/ALPHA_0_2_1_DOOR_VISUAL_CONTRACT.md`, incluidas evidencias del informe físico.
3. `docs/ALPHA_0_3_PERSISTENCE_CONTRACT.md`, íntegro.
4. `docs/ALPHA_0_3_ACCEPTANCE_PLAN.md` y `docs/fixtures/alpha03/README.md`.
5. Sección vigente2026-09-15 de `docs/OPEN_SOURCE_REVIEW.md`, manifiesto artístico y skills aplicables antes de editar imágenes.
6. Código afectado: campaign/protocol/geometry/navigation, GameState/GameServer, HTTP/login/shutdown, clientes de tres roles/world/audio y lanzadores.

El contrato de puerta contiene coordenadas de tabique, bisagra, apertura, lienzo y ancla; no basta girar el PNG actual. El de persistencia decide esquema, compatibilidad, exclusión de efímeros, durabilidad, backup, recuperación, locking, protocolo4, UI/API privada y límites. Ante un detalle local no previsto, resuélvelo y documenta; escala sólo contradicciones que alteren alcance/seguridad.

## Base y protección

Fuente/build actuales0.2.1-rc.1, sin persistencia; la mesa abierta vive en memoria. No reiniciar ni matar el servidor del usuario, no usar su partida para tests ni introducir migración automática desde estado que no existe en disco. Usa servidores hijos propios, puertos libres, HOST127.0.0.1 y DUNGEONS_DATA_DIR temporal único por runner; adapta también los runners antiguos.

Verifica y conserva `backups/alpha-0.2.1-rc1-20260914.zip`, SHA256 `444F3A09524DA4AB26B4A0AF62A55B5505BF568D68EF5E520E407EC8F5352EF2`; última aceptada0.2.0RC2 en `backups/alpha-0.2.0-rc2-final-20260914.zip`, hash `28588478A586510BAD5AE3BA174BFD806AFE26E3BFCC1BD35743C3BC12F96E7A`. No sobrescribir. Git no es garantía de recuperación: existen archivos sin seguimiento. Preservar trabajo existente.

## Orden de implementación (una sola entrega)

1. Comprobador de diseño `node scripts/check-alpha03-design.mjs`; leer resultado con su límite. Es evidencia de coherencia de ejemplos, NO runtime futuro.
2. Puerta: fondo corregido + familia v4, materiales/daño coherentes, anclas y eje, integración/preview/render. No mover timón por frase ambigua ni tocar arte de caja/timón ya apreciado sin defecto medido. Registrar procedencia y revisiones; seguir skill de imagen aplicable.
3. Schema privado/codec/migración0 sintética/hidratación de todas las escenas; tests de allowlist, referencias, geometría, secretos y audio. Semillas/bundles añaden campaignStateVersion1. No usar DTO público como save.
4. Store y coordinador: un escritor/lock, archivos atómicos y backup, autosave/manual/error, arranque/recovery/shutdown, export de memoria. Implementar e inyectar fallos de IO antes de construir promesas de UI.
5. Protocolo4 con runtimeEpoch y reset en todas las capas, restauración exclusiva con CAS/backup previo/confirmación/idempotencia. API sólo DM y UI usable. Pruebas dosDM/dosplayers/projector, desconexión/cargas viejas y anti-replay.
6. Actualizar Node mínimo a rama24 desde24.21.0 en package/lanzadores/guía (ya disponible localmente); no instalar runtimes silenciosamente. Mantener versiones exactas/lockfile, sin dependencia nueva salvo decisión justificada documentada.
7. Typecheck/build y suite completa; auditorías0.2/0.2.1 actualizadas por cambios legítimos de protocolo sin quitar comprobaciones. Integraciones y P01–P15/D01–D05. Arte en navegador a escala de juego, consolas limpias. No sustituir reinicio real de servidor hijo por test unitario.
8. Crear candidata versionada y ZIP nuevo con código/build/recursos/docs, hash verificado; EXCLUIR saves/datos privados del paquete. Actualizar estado/roadmap/aceptación con qué se ejecutó realmente, errores y límites.

## Entrega al usuario

Al terminar, una versión ejecutable y guía breve: iniciar, puerta, guardar/cerrar/recuperar, exportar/restaurar y móvil vertical/horizontal. Adaptar la checklist final del plan de aceptación a etiquetas reales. El usuario hará esas comprobaciones entonces. No otro traspaso para un fallo rutinario; corrígelo dentro de Sol.

Astra sólo vuelve si aparece una contradicción transversal importante o tras resultados que requieran una decisión arquitectónica. No diseñar0.4 ni cambiar modelos automáticamente. No inventar PASS físico ni prometer guardado ante corte eléctrico/hardware no probado.

Historia anterior preservada en `docs/NEXT_MODEL_PROMPT_PRE_ALPHA03_HISTORY.md`; NO ejecutarla como encargo activo.
