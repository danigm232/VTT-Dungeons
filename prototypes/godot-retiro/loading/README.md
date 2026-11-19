# Microescenas de carga nativas

Implementación compartida para Godot, 14/11/2026. El catálogo contiene las 18 habilidades y las secuencias de Mía, Trinity y Mike, exportadas de las fuentes del VTT: 576 recortes de dibujos existentes, empaquetados en seis atlas. Sin navegador incrustado, imágenes generadas nuevas ni cambios de identidad.

## Probar

- Desde la raíz del repositorio, abrir `PROBAR-CARGAS-GODOT.cmd`: selector de las 18 escenas, personaje, éxito/fallo, movimiento reducido y dos modalidades enfrentadas (equilibrio y música). Es un visor de demostración, separado del estado de campaña.
- La apertura normal de Pecio/Retiro entra por `loading_boot.tscn` y prepara el mapa en paralelo. El proceso persistente es `/root/SkillLoading`.
- Para la mesa compartida, abrir **una instancia en modo Proyector** desde `JUGAR-GODOT.cmd`. La dirección para conectar los controles personales aparece abajo. Abrirla desde los móviles de la misma red, elegir personaje y entrar. Puertos locales por defecto: Pecio 47920, Retiro 47921; `--loading-port=...` permite cambiarlos.
- La viñeta aparece en el proyector; el dado, su lanzamiento, el indicador y Continuar compacto aparecen en la pantalla personal correspondiente. Los observadores reciben solo el indicador y Continuar. La entrada se completa cuando el mapa está preparado y los jugadores conectados confirman.
- El modo Jugador de una instancia local ofrece el dado/Continuar de escritorio como alternativa independiente. No abrir varias instancias servidor esperando que sus sesiones sean la misma.
- `--character=maria` o el ID de otro personaje configura el control local; `--loading-reduced` reduce movimiento. En modo DM, F10 permite entrar a un prototipo sin inventar jugadores remotos; F8 reintenta una carga fallida.

## Integración

`SkillLoading.load_map(path, destination_label, reason)` sirve tanto al arranque como a cambios de mapa. En Retiro, `MapTransition` ya lo invoca conservando sus destinos, posiciones de aparición, orientación, bloqueos y señal de finalización. No se abre una pantalla por cada escalera o puerta del Pecio.

`loading_session.gd` conserva elección de participantes, una tirada por entrada, resultados, preparación y confirmaciones. El servidor local `loading_http.gd` asigna credenciales aleatorias al conectar un personaje, rechaza propietarios incorrectos y repeticiones, conserva la tirada al recargar el control y retira conexiones ausentes. Las tiradas nunca modifican PG, inventario o progreso. Solo se seleccionan personajes presentes; Percepción también filtra sus visitantes.

Con dos o más presentes puede elegirse una demostración enfrentada de equilibrio o interpretación en un cambio de mapa. Se espera a ambas tiradas, se comparan sus totales naturales y el empate tiene su propio mensaje. El pulso sobre mesa sigue pendiente de poses conjuntas adecuadas; no se finge el contacto con accesorios sueltos.

El adaptador es una sesión **local del prototipo Godot**, no una migración de las cuentas, guardados o servidor Socket.IO de la campaña web. Los móviles actuales sirven de controles de carga; no se ha trasladado aquí todo el HUD móvil del VTT. La prueba con teléfonos/proyector físicos sigue separada de las pruebas de navegador.

## Fuentes reproducibles

`scripts/export-godot-skill-loading.ts` usa el catálogo y el resolvedor de animaciones originales, aísla los componentes alfa, mantiene pies/pivotes/alturas y empaqueta recortes con WebP calidad 94 y alfa 100. `SOURCE_MANIFEST.json` registra las fuentes y sus hashes. Prompts, originales y créditos: `docs/design/SKILL_ANIMATION_V5_PROMPTS_20261107.json` y `LICENSES_AND_CREDITS.md`.

`scripts/sync-godot-skill-loading.mjs` copia este módulo al proyecto Retiro, sin borrar archivos locales adicionales. Cada proyecto tiene recursos `res://loading` propios porque se abren como proyectos Godot independientes; no son dos implementaciones diseñadas por separado.

Pruebas: `loading/test_loading.gd` comprueba el modelo y las 108 combinaciones de habilidad/personaje/desenlace; `loading/test_map_roundtrip.gd` en Retiro comprueba arranque e ida/vuelta mediante `MapTransition`; `scripts/check-godot-loading-mobile.mjs` comprueba dos controles de navegador conectados a Godot real. El parámetro `--loading-capture` del primer script produce capturas reales con Forward+.
