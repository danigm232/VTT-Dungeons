# Siguiente relevo — Astra High — Contrato Alpha 0.2.1

Continúa en `C:\Users\User\Desktop\Dungeons` como Astra con razonamiento High. No uses subagentes ni cambies automáticamente de modelo.

Alpha 0.2 RC2 ya está implementada y fue aceptada operativamente por el usuario el 2026-09-14 con Pixel 9a, portátil MSI, Chrome, ambas orientaciones y salida 1080p. Antes de decidir nada, lee íntegramente `PROJECT_STATE.md`, `ROADMAP_V1.md` revisión 6, `ARCHITECTURE_DECISIONS.md`, `docs/ALPHA_0_2_CONTRACT.md`, `docs/ALPHA_0_2_ASTRA_REVIEW.md`, `docs/ALPHA_0_2_AUDIT_RESULTS.json`, `docs/ACCEPTANCE_RESULTS.md`, `docs/ALPHA_0_2_PHYSICAL_CHECK.md`, `docs/TACTICAL_PIXEL_SPEC.md`, `docs/OPEN_SOURCE_REVIEW.md`, `LICENSES_AND_CREDITS.md` y el código actual de campaña/motor/clientes. Consulta las notas privadas sólo para preservar el timón y la aventura; no las copies a contenido público.

Verifica de forma focal que el estado descrito coincide con el repositorio y que existe la copia `backups/alpha-0.2.0-rc2-final-20260914.zip` con SHA-256 `28588478A586510BAD5AE3BA174BFD806AFE26E3BFCC1BD35743C3BC12F96E7A`. No reinicies la mesa del usuario ni uses su puerto 3000. Si repites pruebas, usa servidor propio loopback/puerto libre y ciérralo siempre.

Tu encargo principal es cerrar el **contrato ejecutable de Alpha 0.2.1: timón separable y destrucción preparada**. RC2 ya está aceptada; no repitas su recorrido físico salvo para investigar una regresión concreta. Diseña la extensión mínima sobre las primitivas de RC2, evitando un ECS general, física rígida, segmentación arbitraria o persistencia anticipada.

Decide y documenta con precisión:

1. Modelo público, privado y runtime para un objeto inicialmente unido al escenario que puede separarse, trasladarse, girarse y convertirse en restos; capacidades explícitas por definición, sin aceptar propiedades arbitrarias del cliente.
2. Estados estructurales necesarios y transiciones válidas (unido/separado, intacto/dañado/destruido), qué estado conserva huella, qué sprite usa y qué ve cada rol.
3. Comandos v3, schemas estrictos, ACK, CAS, fingerprint, undo y límites de historial; compatibilidad con puerta/caja y preparación razonable para persistencia 0.3 sin diseñarla completa.
4. Huellas de ubicación/bloqueo, soporte horneado, reservas de actores/spawns, validación al separar/destruir/deshacer y política cuando el destino queda ocupado.
5. Flujo DM y petición del jugador con arbitraje manual y dados físicos: selección, preview privado, aplicar/cancelar y consecuencia visible, reutilizando el editor actual.
6. Recursos artísticos concretos: fondo del pecio sin timón fantasma, soporte vacío, timón separado/orientaciones y restos. Define dimensiones/anclajes y cómo conservar la cubierta aceptada mientras se introduce la variante. Incluye la corrección del sprite de puerta, que el usuario percibe demasiado frontal para la cámara cenital inclinada, sin alterar su huella ni su comportamiento ya aceptados.
7. Matriz de aceptación automatizada, navegador y física: separación, traslado, destrucción, undo, reconexión, ausencia de duplicado en fondo, secretos, regresión completa de puerta/caja/movimiento/timón anterior.

Resuelve contradicciones transversales en ADR nuevo y redacta un contrato implementable, fixture de geometría y criterios observables. Mantén cada versión funcional. Actualiza `PROJECT_STATE.md`, `ROADMAP_V1.md`, `docs/ACCEPTANCE_RESULTS.md` sólo con hechos comprobados y reescribe este archivo con el encargo concreto para Sol High. Conserva la aceptación RC2 y trata la perspectiva de la puerta como incidencia visual no bloqueante salvo que encuentres una regresión funcional reproducible.

Al terminar el diseño, indica al usuario cambiar a **Sol High** para implementar Alpha 0.2.1. No recomiendes Terra o Luna salvo que aparezca una tarea realmente separable que el roadmap les asigne.
