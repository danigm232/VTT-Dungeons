# Cámaras VTT · Godot

Abrir project.godot con Godot 4.7.2 o usar los lanzadores de la raíz. Esta entrega arranca directamente en scenes/main.tscn.

Q/E: giro relativo ±30°. F/R: bajar/subir entre 5° y 25°, toque al siguiente hito de 5° o mantener para ajustar entre ellos. Inicio restablece. Rueda/pellizco: zoom. Dos dedos en horizontal giran y en vertical inclinan. WASD/joystick mantienen la dirección del mapa.

DM: arrastrar sin selección para explorar; doble clic para seleccionar; botón derecho para colocar, seguir o explorar; Escape deselecciona; Ctrl+Z deshace traslado. F1 jugador, F2 DM, F3 proyector local. La casilla de compartir incluye zoom e inclinación en esa previsualización. La sincronización de partida entre dispositivos está pendiente.

[Contrato, límites y comprobaciones](../../docs/evidence/GODOT_CAMERAS_20261114.md). Las pantallas de carga se desarrollan por separado y no se incluyen en esta publicación de cámaras. Se conservan los mapas y recursos existentes; procedencia en los créditos generales y fichas locales.

Prueba: godot --headless --path . --script res://scripts/test_camera_contract.gd. Capturas: godot --path . --script res://scripts/capture_camera_contract.gd.

## Actualización posterior: pantallas de carga

La integración de cargas cambia ahora el arranque a `loading/loading_boot.tscn`, conservando las cámaras y mapas anteriores. Incluye 18 microescenas nativas, controles personales locales y dos duelos de demostración; `MapTransition` utiliza el mismo coordinador al cambiar de mapa. Abrir `PROBAR-CARGAS-GODOT.cmd` en la raíz para revisar el catálogo. [Uso y límites](loading/README.md), [implementación y pruebas actuales](../../docs/evidence/GODOT_SKILL_LOADING_20261114.md). La sincronización completa de la campaña web sigue pendiente y se distingue de los controles de carga locales ya conectados.
