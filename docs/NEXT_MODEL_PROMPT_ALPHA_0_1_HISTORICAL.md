# Prompt vigente — Sol / razonamiento alto (High)

Estado de ejecución: este encargo se completó el 2026-09-13. PROJECT_STATE.md y docs/ACCEPTANCE_RESULTS.md contienen la evidencia actual; las instrucciones siguientes se conservan como registro de decisiones y criterios, no como tareas pendientes.

Continúa como Sol en C:\Users\User\Desktop\Dungeons. Implementa la Alpha 0.1 táctica completa; no uses subagentes ni cambies de modelo automáticamente.

Antes de editar, lee íntegramente PROJECT_STATE.md, docs/TACTICAL_PIXEL_SPEC.md, docs/ACCEPTANCE_RESULTS.md, ARCHITECTURE_DECISIONS.md, docs/ALPHA_0_1.md, LICENSES_AND_CREDITS.md, campaigns/stormwreck-isle/private/CAMPAIGN_NOTES.md y docs/USER_SPEC.md. TACTICAL_PIXEL_SPEC recoge la corrección explícita del usuario y prevalece sobre la dirección antigua low-poly/sin grid. NEXT_PIXEL_PROMPT_ASTRA y PIXEL_ART_MIGRATION_AUDIT son antecedentes superados, no otros encargos que ejecutar.

Mira las tres referencias locales:
- OneDrive_1_12-9-2026/Referencias estilo/Imagen de Codex 12 sept 2026, 22_44_18.png
- OneDrive_1_12-9-2026/Referencias estilo/Imagen de Codex 12 sept 2026, 22_43_52.png
- OneDrive_1_12-9-2026/Referencias estilo/Imagen de Codex 12 sept 2026, 22_44_12.png

El objetivo es un battlemap vivo de D&D: pixel art detallado por capas, sprites identificables, grid cuadrada permanente y movimiento real por casillas. Vista cenital con inclinación suave, profundidad dibujada y desplazamiento de cámara limitado; sin diorama 3D ni rotación libre. Las interfaces de turnos, barras enemigas, objetivos y escenarios de campamento/ruinas en las referencias no añaden esas funciones al encargo. La slice sigue siendo aproximación y C1/C2/C3 del pecio del Rosa de los Vientos.

Estado real: hay aplicación y dependencias, siete unitarias y una integración local pasan, servidor/build compilan. La Alpha NO está aceptada. Astra reprodujo cuatro fallos en scripts/audit-baseline.mjs (notas DM en HTML, foco de cámara filtrando criatura oculta, teleport dentro de mástil y fuera del bote), y el typecheck estricto del cliente falla con dos errores. La auditoría contiene otros hallazgos, incluido crypto.randomUUID incompatible con HTTP LAN. No presentes el baseline como completamente verificado.

Implementa en un solo bloque:

1. Corrige privacidad y autoridad. Notas/encuentros/semillas sólo servidor; separa public/pack.ts antes de importarlo al renderer. Mueve PG/inventarios/harpyStart a private. Serialización por lista permitida incluyendo cámara. Prueba cookies malformadas, roles falsificados, comandos de otro jugador, dos conexiones con mismo token antes/después de claim, control activo y reconexión. UUID de cliente compatible con HTTP LAN usando getRandomValues cuando randomUUID no exista. Idempotencia acotada por sesión/tipo y epoch para comandos dependientes de escena.

2. Implementa contrato táctico v2 decidido por Astra: cell entera, surfaceId, step from/to con tiempos del servidor; casilla 1,5 m; pasos cardinales de 300 ms; tap inmediato, mantener repite, soltar/timeout no inicia otro paso. Validar transitabilidad y escaleras; terminar paso ya aceptado en su centro. Escena nueva cancela paso/carga/input viejo. scene:ready por epoch. Spawns explícitos y teleport validado por predicado de celda, incluso en aproximación. No mantener movimiento libre redondeado sólo en pantalla. D&D se resuelve en mesa; no automatices turnos o puntos de movimiento.

3. Instala una versión estable exacta de PixiJS v8, verifica LICENSE y fija lockfile. Usa sprites/atlas/Assets/Container, nearest y WebGL; sustituye renderer Three.js con fachada WorldRenderer e implementación reusable en engine/client/render. No añadas Phaser, motor de red alternativo, framework UI ni selector de renderers. Engine recibe pack, sin nombres de campaña hardcodeados.

4. Construye terreno, grid, alturas visuales, props y atlas del pecio según TACTICAL_PIXEL_SPEC y mapa privado de p.25 (tmp/pdfs/pecio-map.png si sigue disponible). Esa página es sólo fuente, jamás textura pública. Proa este/derecha, popa oeste/izquierda, C1 centro, escaleras a C2/C3; mar/rocas/huesos, madera húmeda verde oscura, balista inutilizable, timón, mástiles y partes altas que no tapen tokens. Aproximación es presentación sin navegación. Grid siempre visible en ambas vistas/escenas públicas.

5. Produce o incorpora arte pixel art con procedencia verificable. Usa el skill ImageGen si generas recursos raster originales; también se admiten assets libres con licencia revisada. Entrega arte por capas y sprites sustituibles por manifiesto, no una captura plana con personajes pegados al fondo ni rectángulos con ruido. Mike/Mia/Maria distinguibles por clase, equipo y silueta; criatura sólo al reveal. PNG estático de reemplazo debe funcionar sin editar renderer/red. Sin editor ni upload web obligatorio. No reutilices música protegida ni declares CC0 lo generado por defecto.

6. Mantén /dm, /player, /projector, IP/QR LAN, control individual, PG/inventario propios, timón resuelto por DM, reveal/hide, tormenta, cámaras y audio. Player portrait/landscape con joystick/WASD y botones grandes; no mover bajo inventario ni enviar inputs desconectado. Proyector limpio con grid, sin privados. Corrige carreras de fade/pausa/reinicio, seek de loops cargados, estado real de AudioContext y deduplicación de SFX; música y cuatro capas independientes, tres SFX.

7. Completa instalación e inicio Windows reproducibles con Node 24 y lockfile. No hardcodees el runtime de Codex. Revisa INSTALAR.cmd/INICIAR.cmd, rutas con espacios, puerto ocupado y selección IP si hay VPN. Añade typecheck real de cliente y servidor. Verifica avisos/licencias y documenta audio original. Reinicio pierde estado si no hay persistencia: dilo claramente, no amplíes a guardado obligatorio.

8. Reconstruye y ejecuta unitarias, integración y auditoría. Adapta los probes a celdas si cambia el contrato, conservando las invariantes y añadiendo pruebas por socket; no elimines fallos para obtener verde. Amplía cobertura de taps, límites/obstáculos/escaleras, timeout, escena durante carga, ownership/reconexión, eventos repetidos, foco oculto y bundles sin privados. Abre tres interfaces en navegador, con dos jugadores independientes. Comprueba capturas 1920x1080, 390x844 y 844x390, sprites, grid, movimiento y todos los controles. Prueba audio y distingue escucha de comprobación de WAV/eventos. Móvil/proyector físicos, latencia y FPS sólo se dan por probados si se midieron realmente.

9. Actualiza README.md, PROJECT_STATE.md, ARCHITECTURE_DECISIONS.md, LICENSES_AND_CREDITS.md y docs/ACCEPTANCE_RESULTS.md con comandos/resultados y límites. Deja candidata ejecutable completa; no otro plan ni maqueta. No publicar externamente ni crear remoto/commits sin petición.

Comandos útiles del baseline: node node_modules/vitest/vitest.mjs run; node node_modules/typescript/bin/tsc -p tsconfig.server.json; node node_modules/vite/bin/vite.js build; node scripts/run-integration.mjs; node scripts/audit-baseline.mjs. pnpm wrapper a veces quedó sin salida. Dentro del sandbox Vite/Vitest o procesos hijo pueden fallar por permisos; sigue el flujo de escalación, no lo declares fallo del código ni eludas un rechazo.

Al terminar explica cómo iniciar/probar, qué funciona y qué falta comprobar físicamente. Mantén Sol para errores locales. Recomienda volver a Astra con razonamiento alto sólo ante bloqueo transversal reproducible o auditoría final justificada. No añadas cambios de modelo por obligación.
