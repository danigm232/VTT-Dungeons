# Informe físico de Alpha 0.2.1 RC1 — 2026-09-15

Fuente: relato y dos capturas aportadas por el usuario en la tarea actual, conservadas sin edición como [puerta abierta](evidence/alpha021-door-open-user-20260915.png) y [puerta cerrada](evidence/alpha021-door-closed-user-20260915.png). No se infieren pruebas no descritas. Estado global: **PARCIAL; incidencia visual de puerta abierta/cerrada pendiente**. Alpha 0.2.0 RC2 sigue siendo la última versión aceptada.

| Área | Resultado informado | Límite / acción |
|---|---|---|
| Arranque | PASS: “Iniciado” | No se describió instalación limpia. |
| Timón y soporte | PASS de unicidad: un timón con soporte | Duda de alineación con cuadrícula. El usuario cree que el punto correcto debería estar “uno arriba y uno a la derecha”; requiere concretar referencia visual antes de mover coordenadas. |
| Separar/mover/girar | PASS: separación sin duplicado; puede mover y girar | No se confirmaron por separado las cuatro orientaciones ni todas las reservas de colocación. |
| “Separado y sujeto” | Necesita explicación, no defecto confirmado | Es el resultado `caught` de la resolución manual del DM: el personaje sujeta/recibe el timón al separarlo. `fallen` representa que cae. No son eventos aleatorios ni una tirada automática. |
| Daño/rotura de timón | PASS visual informado | El usuario aprecia ambas variantes. |
| Daño/rotura de puerta y caja | PASS visual informado | El usuario aprecia las variantes. |
| Puerta funcional | PASS informado | Cerrada bloquea, abierta deja pasar, no cierra sobre un personaje, rota deja pasar y permite caminar sobre restos. |
| Puerta artística | **FAIL visual informado** | Captura 1: estado abierto, hoja casi frontal/erguida; captura 2: estado cerrado, tablón horizontal en planta. No forman un giro coherente en la cámara cenital/oblicua ni se leen como una puerta unida al mismo marco/bisagra. |
| Deshacer ocupado | PASS informado | Sobre la casilla se rechaza; al retirarse, permite deshacer. |
| Preview/huella | PASS de rojo ocupado y cancelación, aclarado después por usuario | Rojo para destino ocupado/bloqueado; Escape retira borrador/huella y vuelve a selección amarilla. No describe aisladamente verde válido o sprite semitransparente. |
| Conexión y audio | PASS por informe | El usuario describe conexión y audio perfectos. |
| Móvil vertical/horizontal | APLAZADO hasta entrega0.3 | Decisión explícita del usuario; no sustituir comprobación ni marcar PASS. |

## Inspección de la incidencia de puerta

La escena `wreck-objects` usa cuadrícula 12×9 de 48 px, con hueco del tabique en celda (6,4). `practice-door` está en esa celda y los catálogos v3 declaran ambos estados con `logicalWidth:48`, `logicalHeight:48`, anclas 0.5/0.5. El sprite abierto `door-intact-open-v3.png` sigue mostrando una hoja alta casi frontal; el cerrado `door-intact-closed-v3.png` es una barrera horizontal estrecha vista desde arriba. El renderer escoge la variante por estado y coloca ambos sprites en el mismo centro. La lógica de puerta/colisión responde correctamente; la falta de bisagra/ancla compartida y el cambio de perspectiva explican el salto visual. Astra debe decidir la geometría visual y un juego de variantes coherente antes de que Sol regenere/adapte e integre el arte.

## Estado de versión y relevo

No promover RC1 a “aceptada” ni sustituir su backup. **Actualización posterior explícita del usuario15/09:** Astra diseña puerta y contrato0.3; Sol implementa ambos en una entrega conjunta0.3 y el usuario verifica puerta/móvil al terminar. Queda sustituida la recomendación anterior de verificar primero una correctiva0.2.1. Diseño Astra cerrado en los dos contratos y `NEXT_MODEL_PROMPT.md`; runtime y arte pendientes de Sol.
