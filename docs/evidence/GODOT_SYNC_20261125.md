# Sincronización de los proyectos Godot — 25/11/2026

Encargo: reunir el trabajo reciente de Codex y Antigravity y compartirlo en GitHub, preservando los proyectos y los cambios de otros chats. La planificación sigue en `ROADMAP_V1.md`.

## Contenido de la actualización

- Se conservan Pecio, Retiro y Campamentos, sus módulos compartidos y los cambios existentes de navegación, escenarios, clima, carga, combate y habitantes. Se incorporan los cambios locales posteriores sobre rutinas, reposos, gestos y correcciones de la carga.
- Las 24 definiciones nuevas de animación de Retiro conservan sus originales y derivados. Una comprobación sobre el índice de Git encontró disponibles **137 originales/fotogramas fuente y 226 fotogramas de ejecución** comprobados en las bibliotecas del Retiro y compartida. Las propuestas de identidad v6 permanecen en `drafts/`, sin promoverlas a recursos aprobados.
- Se incluyen los informes visuales recientes de [auditoría del Retiro](../../output/retreat-audit3-20261124/index.html), [habitantes](../../output/retreat-residents-20261124/index.html), [vida del claustro](../../output/retreat-life-20261124/index.html), [rutinas](../../output/retreat-routines-20261124/index.html), [gestos](../../output/retreat-gesture-views-20261124/index.html), [hamaca](../../output/retreat-hammock-20261124/index.html) y [auditoría de las cargas](../../output/loading-sprite-audit-20261124/index.html), con los archivos enlazados por sus páginas. Los demás resultados de `output/`, compilaciones temporales y partidas siguen siendo locales según `.gitignore`.
- `README.md` identifica los tres proyectos y cómo importarlos por primera vez en Godot. El script local `_tmp_kobolds.gd`, con una ruta de captura particular de otra herramienta, se conserva fuera del commit.
- Al probar una copia limpia se descubrió que la regla general `data/` ignoraba cinco JSON estáticos necesarios para la geometría del Retiro y Campamentos. Se incluyen explícitamente los tres archivos de Campamentos y los dos del Retiro, sin dejar de ignorar las partidas. Antes de incluirlos, el Retiro no podía reconstruir la cuadrícula ni cargar los habitantes en esa copia.

## Corrección de la ruta de Runara

La prueba de mantas reproducía un fallo previo: el petate occidental de Runara quedaba fuera del rectángulo muestreado por `retreat_resident_routes.gd`. Se extiende la zona de búsqueda a suelo ya existente, manteniendo la validación física de soporte, obstáculos y puertas. No se mueve el petate ni se cambian colisiones. Se añade una comprobación de la ruta al test de habitantes.

La revisión de las mantas pasa **159/159** comprobaciones en modo sin pantalla tras el ajuste, frente al fallo reproducido antes. Los registros nativos anteriores siguen mostrando ese fallo: falta repetir las capturas nativas y generar el informe final, y la aceptación visual del usuario continúa pendiente.

## Verificación efectuada

- Godot 4.7.2, sin ventana: las pantallas de carga pasan **176/176** en cada uno de Pecio, Retiro y Campamentos; navegación del Retiro **12/12**; campamentos **291/291**; transición del Retiro y regreso **28/28**; habitantes del Retiro **210/210** tras ampliar la ruta. Estas pruebas no sustituyen las pruebas físicas de móvil, audio o proyector. La prueba de habitantes terminó con salida 0, pero Godot registró recursos todavía en uso al cerrar; queda pendiente investigar la limpieza de la prueba.
- Se creó una copia separada desde Git, sin la caché `.godot` del equipo: los tres proyectos se importaron con salida 0 y sin errores de importación. Al probarla se detectó la falta de los cinco JSON; tras incorporarlos y actualizar la copia al commit `cfb8f99`, pasaron integridad del Pecio, transición del Retiro **28/28** y Campamentos **291/291**. La prueba del Pecio termina con advertencias de recursos al cerrar; las pruebas se ejecutaron sin ventana.
- Pipeline de personajes: validación estructural con **0 errores y 40 advertencias**; **27 pruebas** del pipeline superadas. Las advertencias de anclajes y equipo heredado y las revisiones artísticas pendientes siguen vigentes.
- La inspección de los siete informes visuales encontró **1.139 referencias locales** presentes en el índice de Git; esto comprueba sus archivos enlazados, no la aceptación artística de su contenido.
- Se revisó que los archivos añadidos no superen el límite individual habitual de GitHub y se escanearon las fuentes textuales para detectar formatos comunes de credenciales. El resultado no sustituye una revisión exhaustiva de derechos de terceros.

La aceptación artística, el funcionamiento entre dispositivos y el rendimiento físico de cada mapa siguen siendo estados separados. El código y los informes históricos no se presentan como una nueva versión final aceptada.
