Trabaja en el proyecto existente:
C:\Users\User\Desktop\Dungeons

Tu encargo es implementar la mejora artística y técnica del mapa del Espejo de D8 Night, siguiendo la auditoría preparada el 18/10/2026. Queremos acercar su acabado al lenguaje HD-2D de Octopath Traveler: profundidad escénica, arte coherente, luz, personajes integrados, ambiente, efectos y sonido, manteniendo un VTT táctico de D&D plenamente jugable.

El alcance es únicamente la escena `mirror`, «Espejo de plata del amor verdadero». Las siete fases son trabajo pendiente, no mejoras ya implementadas. No uses subagentes ni cambies automáticamente de modelo.

Antes de editar:

1. Lee las instrucciones AGENTS.md aplicables y revisa los cambios existentes. Conserva el trabajo de otros chats.
2. Lee PROJECT_STATE.md, ARCHITECTURE_DECISIONS.md y LICENSES_AND_CREDITS.md para entender el proyecto y sus límites.
3. Lee íntegramente docs/design/D8_MIRROR_OCTOPATH_AUDIT_20261018.md. Es la especificación principal de este encargo: diagnóstico, causas verificadas, recursos existentes, arquitectura propuesta, fases E0–E6 y aceptación.
4. Examina las imágenes, no solo sus nombres: output/d8-mirror-octopath-audit-20261018/index.html, las cinco referencias en su carpeta refs/, las capturas del Espejo en output/d8-polish-20261016/ y los recursos locales de campaigns/one-shot/public/art/tokens/Espejo/.
5. Consulta baseline.json y baseline-tests.txt en output/d8-mirror-octopath-audit-20261018/. Son evidencia histórica de esta auditoría; comprueba de nuevo el estado actual antes de tomar sus cifras como vigentes.

El encargo antiguo de docs/NEXT_MODEL_PROMPT.md trata del Pecio y no corresponde a este trabajo. Si otras notas históricas tienen otro objetivo o perfil de cámara, utiliza este encargo y la auditoría del Espejo para fijar el alcance actual. Si faltan archivos o referencias, identifica cuáles y continúa solo con las partes que puedas fundamentar; no finjas haberlos visto.

Ejecuta en orden las siete fases del apartado 17:

- E0: base reproducible, datos y capturas actuales, puntos de cámara seguros y aclaración documental del hielo. Conserva la regla que ejecuta actualmente el servidor; no cambies peligros o reglas por una contradicción en un texto antiguo.
- E1: composición y envolvente de cueva, primer plano selectivo, galerías y continuidad del entorno. Debe sentirse un lugar profundo a 15° y zoom medio.
- E2: siluetas y materiales coherentes de roca, nieve, hielo y espejo. Reutiliza y adapta el diseño ornamentado disponible; evita que la reliquia parezca solo un portal circular.
- E3: jerarquía de luz, sombras de contacto e integración estilizada de personajes en la iluminación local. Conserva pies, escala y animaciones.
- E4: atmósfera, bruma, partículas, resplandor y enfoque selectivo, con perfiles medidos por dispositivo y tablero útil nítido.
- E5: activación, aparición del Reflejo y resolución coherentes con los eventos del servidor, más revisión de mezcla y sonidos de caverna.
- E6: candidata ejecutable, comparativas, regresiones, sincronización, reconexión, guardado/carga y guion de aceptación física.

Trabaja en bloques cortos y verificables; cada fase debe dejar el mapa funcional. Continúa autónomamente hasta obtener la candidata técnicamente comprobada. No cierres el encargo entregando solamente otro plan, documentación o una maqueta visual. Las pruebas físicas y la aprobación artística del usuario deben quedar explícitamente pendientes cuando no puedas realizarlas.

Preserva la partida y la claridad táctica:

- Conserva navegación, casillas de 1,5 m, peligros, posiciones, interacción del espejo, identidad del Reflejo, estadísticas, inventario, progreso y reglas. Revalida las cifras de la base; no adaptes tests para ocultar una regresión.
- Mantén dados y decisiones en mesa y los secretos en servidor.
- Explora con 15° y zoom medio como referencia artística; conserva las opciones actuales 15°/25°/35°, los cinco giros de −30° a +30° y el encuadre táctico de combate. Respeta las preferencias de cámara del jugador.
- Diseña el primer plano para enmarcar sin ocultar personajes, interacción o hielo peligroso. Comprueba varios puntos del mapa y todos los giros admitidos.
- No extiendas esta mejora a otros mapas ni rediseñes la consola completa. Una ampliación compartida necesaria debe ser opcional por escena y tener regresiones apropiadas.

Audita y reutiliza antes de reconstruir. Revisa especialmente el recorte que elimina la mitad del perímetro próxima a cámara, los personajes sin respuesta a luces locales y las diferencias de acabado entre el visor y la mesa integrada. Evita acumular correcciones globales al final del renderer; organiza la presentación del Espejo con limpieza de recursos al cambiar de escena. Conserva el motor, reloj y clima existentes. Reutiliza los assets locales y las bibliotecas adecuadas; documenta procedencia y licencia de cualquier incorporación. Las imágenes de Octopath son referencias, no assets para el juego.

Prepara compilaciones y pruebas aisladas. Inspecciona si hay una mesa abierta antes de actuar; no cierres el servidor habitual, sobrescribas una distribución en uso ni alteres guardados reales para probar. No publiques en GitHub sin un encargo específico.

Verifica el apartado 18 completo. La base de la auditoría pasó 44 pruebas en 9 archivos; repítelas y añade solo las comprobaciones necesarias para los cambios realizados. Captura cinco puntos seguros × cinco giros × tres inclinaciones, con comparativas equivalentes, y revisa luz, movimiento, aparición, combate y las tres interfaces. Objetivos de pantalla: Pixel 9a vertical/horizontal y PC/proyector a 1080p. Distingue una simulación de tamaño móvil de una prueba en el móvil físico, y el análisis de archivos de una escucha real. No inventes FPS, aprobaciones visuales o resultados de dispositivos no probados.

Registra avances y evidencia junto a la auditoría, sin sobrescribir las referencias originales, y actualiza PROJECT_STATE.md al cerrar una entrega significativa. Al terminar, explica qué cambió, cómo abrir la candidata, qué verificaste y qué queda para la aprobación artística y física. Si aparece una decisión real que altere reglas, narrativa o alcance, presenta la cuestión concreta; resuelve autónomamente las elecciones rutinarias de implementación.
