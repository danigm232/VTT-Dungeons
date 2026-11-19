# Mochila RPG en Godot — 15/11/2026

**Ampliación posterior del mismo día:** las caminatas con antorcha pasan de cuatro a ocho poses por rumbo mediante la biblioteca compartida de sprites. Se conservan los atlas originales y las secuencias de sacar/guardar. [Auditoría, recursos y comprobaciones actuales](CHARACTER_SPRITES_20261115.md).

Petición autorizada: mejorar la mochila, mostrar al héroe junto al inventario, ampliar iconos RPG y crear animaciones de sacar/guardar y caminar con antorcha. Se aplica a los prototipos actuales de Pecio y Retiro, conservando mapas, cámaras, distribución, actores, equipo y reglas. No cambia prioridades del roadmap maestro.

## Implementación

- Propietario compartido: `prototypes/godot-shared/inventory/`. El generador `scripts/build-godot-inventory-assets.ts` copia únicamente este módulo a `inventory/` de cada prototipo.
- `backpack_panel.gd`: marco de latón y verde oscuro, tipografía serif, personaje a la izquierda, cuadrícula de objetos a la derecha y detalle contextual. Búsqueda, seis categorías y editor explícito conservan el acceso al inventario. Adaptación a ventanas estrechas mediante disposición vertical y desplazamiento interior.
- `inventory_bridge.gd`: inventario existente del Pecio; equipo inicial real de cada ficha cuando no hay InventoryManager (Retiro). Cantidades iniciales se leen de la ficha; no se añade tesoro nuevo. Sacar y guardar conservan la cantidad total de objetos.
- `backpack_session.gd`: prepara acciones sin ejecutarlas. Una preparación opuesta cancela la anterior. Cerrar oculta la ventana antes de iniciar la reproducción, con actor capturado al preparar. Reabrir pausa la reproducción. Se evita que el atajo V o el gestor antiguo enciendan antorchas mientras la mochila sigue abierta.
- `sprite_library.gd` y catálogo actual: 8 poses de sacar + 8 de guardar + 4 pasos × 8 direcciones por héroe. Tres héroes, 144 poses. Antorcha en movimiento, reposo y carrera; luz real ligada al héroe elegido, sin duplicar la antorcha dibujada con una segunda geometría luminosa.
- `PlayerToken.set_equipment_appearance(portrait_texture, animation_profile)`: punto de actualización conjunto para futuros atuendos. El panel consulta el retrato del actor; no mantiene un retrato fijo independiente. Cambiar realmente un atuendo exige aportar sus animaciones, no solo sustituir una etiqueta.

## Registro de arte y referencias

Referencia de jerarquía y lectura: REF-01 Octopath Traveler (2018/2023), REF-07 Sea of Stars (2023), biblioteca visual del proyecto. Aplicación local de VA-01 (familia visual), VA-03 (escala de los dibujos), VA-14 (recortes jugables), VA-17 (integración en aplicación) y VA-18 (evidencia comparable). Este trabajo no acredita cerrar VA-01–VA-18 para escenarios completos.

| ID | Propietario | Recurso anterior | Candidato | Aceptación |
|---|---|---|---|---|
| inventory.panel | shared/inventory/backpack_panel.gd | panel genérico de lista, sin retrato | panel RPG, cuadrícula, retrato vivo y acciones diferidas | Integración técnica; revisión del usuario pendiente |
| inventory.icons.* | shared/inventory/icons/manifest.json | glifos locales y emojis de mochila | 101 SVG coherentes; trazados propios y derivados locales | Candidatos integrados |
| cleric.backpack / torch | shared/inventory/art/cleric-backpack-torch-v1.png | cleric.png y perfil existente | atlas ImageGen de 48 poses, sin sustituir los ciclos existentes | Candidato integrado |
| rogue.backpack / torch | shared/inventory/art/rogue-backpack-torch-v1.png | rogue-maria-v1.png y perfil Trinity | atlas ImageGen de 48 poses | Candidato integrado |
| wizard.backpack / torch | shared/inventory/art/wizard-backpack-torch-v1.png | wizard.png y perfil existente | atlas ImageGen de 48 poses | Candidato integrado |

`art-sources.json` conserva las instrucciones, referencias, originales y bordes medidos de cada fila. Los originales tienen 1254×1254 píxeles, pero sus seis filas no son iguales: la división uniforme cortaba algunas poses de Mike. El importador usa los límites medidos, aplica umbral alfa 32 para eliminar sangrado casi transparente, recorta verticalmente cada celda y mantiene su pivote horizontal. La altura se normaliza respecto a la primera pose en pie, para no agrandar al héroe al agacharse o levantar una llama. `asset-manifest.json` registra los hashes SHA-256 de los 104 recursos gráficos. No se incorporan imágenes comerciales ni paquetes de terceros.

## Comprobación

Pruebas reproducibles: `scripts/review-godot-inventory.ps1 -Project pecio|retiro -Mode Test|Capture`. La prueba abre la mochila real, verifica retratos, stock, eventos al cerrar, luz individual, cancelación de preparaciones, clips y carga de todos los iconos. Las capturas usan Godot Forward+ a 1600×900.

Resultados: Pecio 159 comprobaciones de mochila, Retiro 161, y 45 comprobaciones de integración de interfaz del Pecio: todas sin fallos. La comprobación específica del importador inspecciona las 144 poses y verifica que ninguna quede vacía, demasiado corta o cortada por el borde vertical de su celda: 144 revisadas, cero fallos. La actualización conjunta de retrato y sprite se prueba con un perfil visual alternativo; los ciclos de antorcha se resuelven desde el actor real en las ocho direcciones.

Capturas nativas de la mochila integrada en el Pecio: `output/godot-inventory-20261115/pecio/{mia,maria,mike}.png`, Godot Forward+ 1600×900, registro `capture.log`. Inspeccionados los retratos, stock existente, botones y detalle. Inspeccionadas también las láminas de sacar y antorcha importadas por el motor; la segunda revisión corrige las filas desiguales de Mike y retira pequeños restos de filas vecinas.

[Visor de revisión](../../output/godot-inventory-20261115/index.html): integración real, láminas de sprites y comparativas con superposición de la primera candidata de esta tarea frente a su revisión final. Las comparativas de panel usan el mismo entorno de prueba ligero, ficha, textura, stock y ventana. No son una reconstrucción de la versión antigua enviada por el usuario. `capture-originals.json` conserva hashes de ambos originales; se usa `scripts/lib/visual-comparison.mjs`, con clic, teclado y ampliación sin mover el encuadre.

Las primeras ejecuciones de captura concurrentes se interrumpieron y una candidata intermedia tuvo un error de sangría detectado al compilar. Se corrigió antes de repetir la compilación, las pruebas y la captura integrada final. El visor solo presenta las capturas completas. Los registros finales no contienen errores; el aviso ocasional de puerto móvil ocupado corresponde al coordinador de cargas existente y no acredita conexión a dispositivos.

## Límites

Integración local en Godot; no implementa la sincronización con inventarios/guardados de la mesa web. El stock del Pecio sigue siendo compartido; Retiro usa el equipo local de cada actor mientras no tenga gestor de inventario de campaña. Sacar/guardar representa manipulación visual, no una regla nueva de consumir, curar o cambiar estadísticas. Revisión visual del usuario y prueba física en mesa pendientes.
