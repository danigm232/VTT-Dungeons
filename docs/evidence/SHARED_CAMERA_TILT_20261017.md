# Giro e inclinación compartidos — 2026-10-17

La opción DM «Compartir giro e inclinación con la mesa» transmite el giro horizontal y la inclinación vertical al proyector y los jugadores. Activarla publica ambos valores inmediatamente; desactivarla libera la vista compartida. Los cambios manuales y los presets automáticos del DM notifican el nuevo ángulo. No se transmite zoom.

El servidor valida las posiciones verticales usando el perfil existente de cada escena y conserva ambos ángulos para reconexiones. El proyector da prioridad a la inclinación compartida frente a sus propios presets de interior y combate. El jugador conserva la posibilidad de ajustar su vista localmente hasta la siguiente publicación DM. Se aceptan los mensajes anteriores que solo contienen giro.

Comprobaciones: tipos de cliente y compilación de servidor correctos; build de cliente correcto; 15 pruebas dirigidas de política y prioridad de cámara aprobadas; integración de cámara con sockets reales aprobada para D8 y Stormwreck, incluyendo reconexión, inclinación fuera de perfil, runtime antiguo y desactivación. El smoke general de one-shot no terminó: usa un endpoint de exportación de guardados que devuelve 404; la integración específica se ejecutó después de forma independiente y pasó.

Activación: cierre seguro del servidor D8 del puerto 3000, con confirmación de guardado; compilación anterior conservada en `output/shared-camera-20261017/previous-server` y `previous-pages`. Nuevo servidor iniciado con la misma campaña, puerto, acceso y carpeta de datos. Guardado recuperado en modo `ready` (generación 1968 antes, 1970 tras el reinicio) y HTML DM actualizado. Registros en `output/shared-camera-20261017`.
