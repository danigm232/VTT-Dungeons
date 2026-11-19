# Limpieza de Dungeons conservando Babylon y Godot

Fecha: 15/11/2026. Trabajo de mantenimiento del espacio de desarrollo; no cambia la dirección visual ni la prioridad del roadmap.

## Resultado

Se retiraron **134.170 archivos**, correspondientes a **19.374.365.882 bytes (18,04 GiB)**, en 438 destinos comprobados. No hubo errores de eliminación. Se conservaron todos los archivos creados o modificados desde el **08/11/2026**, los originales y las fuentes necesarias, independientemente de su antigüedad.

| Medida del inventario | Antes | Después |
| --- | ---: | ---: |
| Tamaño lógico | 53,94 GiB | 36,51 GiB |
| Archivos | 284.595 | 146.651 |
| Fuentes, recursos, distribución, dependencias y archivos protegidos ausentes | — | 0 de 45.587 |
| Archivos recientes ausentes | — | 0 de 18.663 |
| Eliminaciones sin registrar, fuera de la compactación de Git | — | 0 |

Los totales son tamaños lógicos y excluyen el inventario de esta operación. La diferencia neta también incluye trabajo Godot incorporado simultáneamente y registros nuevos; no equivale exactamente al volumen retirado por la limpieza.

Retirados: clientes y servidores de prueba compilados, preparaciones antiguas y rollbacks excedentes, perfiles Chrome aislados de auditoría, cachés regenerables, registros antiguos y 84 capturas sin referencias literales detectadas. Los perfiles personales de navegador están fuera del ámbito de la herramienta.

Conservados: `dist/`, `data/`, `apps/`, `engine/`, `campaigns/`, dependencias, fuentes y materiales del usuario, documentación, originales de Blender, ambos proyectos Godot y sus importaciones, candidatas recientes y los dos rollbacks más recientes. Las fuentes históricas de `prototypes/` no se borran por su nombre ni por su edad. Se mantienen también los artefactos utilizados por lanzadores o herramientas actuales.

## Mejoras de mantenimiento y organización

- `MANTENIMIENTO.cmd` sigue ofreciendo revisión y limpieza. El script identifica también las compilaciones antiguas de `runtime/` y perfiles aislados de auditoría de `tmp/`.
- Se protege toda candidata que contenga `project.godot`, scripts/escenas/recursos Godot o fuentes Blender. También se protegen las rutas utilizadas por los lanzadores y herramientas.
- Las referencias a imágenes se comprueban en documentación, galerías, scripts y fuentes de ambos motores. La lectura tolera las rutas deliberadamente inválidas que aparecen en pruebas de código.
- La propuesta reutiliza una enumeración de cada área. La aplicación vuelve a comprobar rutas resueltas, enlaces, archivos versionados, fechas y procesos antes de cada borrado.
- El README y el [mapa de carpetas](../WORKSPACE_MAINTENANCE.md) identifican los accesos Babylon y Godot y sus fuentes actuales.

Se compactó además Git con `repack -a -d`, sin expirar reflogs ni ejecutar una poda de objetos inalcanzables. Se comprobaron los mismos **6.788 objetos antes y después**, sin pérdidas. `fsck --connectivity-only` pasa. Los objetos sueltos bajan de 4.980 a 50; se conserva el historial.

## Verificación actual

- **Mantenimiento:** 39 comprobaciones de seguridad pasan, incluidas conservación de archivos recientes, rutas en uso, enlaces, proyectos Godot, referencias de imágenes y los dos últimos rollbacks.
- **Babylon:** TypeScript de cliente y servidor pasan. Diez comprobaciones de sockets reales pasan contra la distribución instalada, con guardado y puerto temporales propios: permisos, ocupación, escenas Retiro/Pecio, movimiento en proyector, clima, reconexión y cuatro páginas compiladas con recursos. El servidor temporal se cerró al terminar; la mesa habitual no se reinició.
- **Godot 4.7.2:** la integridad del Pecio carga escenas, nodos, colisiones y mapas PBR correctamente. El Retiro obtiene **136 PASS / 0 FAIL**. Se ejecutaron sin ventana; no equivalen a una revisión visual Forward+ ni a pruebas físicas de móvil/proyector.

Durante la revisión había cambios simultáneos en los proyectos Godot, incluida la incorporación de módulos de combate. Una primera prueba encontró errores en ese código nuevo. Se conservaron copias de `combat_rules.gd` y `combat_controller.gd` de ambos proyectos. Se corrigieron la declaración de tipo de `continuing` a `bool` y la creación de la barra de turnos como `BoxContainer`, que admite alternar orientación, evitando el error que emitía `HBoxContainer`. Las pruebas finales se repitieron sobre el estado actual y sus registros no contienen `SCRIPT ERROR` ni `ERROR:`. Los cambios del generador de arrecife pertenecen al otro trabajo y se conservaron. La operación de limpieza no retiró ninguno de esos scripts.

## Evidencias locales

- [Propuesta, resultado completo y diario por archivo](../../backups/maintenance-reports/20261115-091033-038/).
- [Inventarios y comprobación de conservación](../../backups/maintenance-reports/20261115-inventory/verification.json).
- [Red Babylon](../../backups/maintenance-reports/20261115-inventory/network-smoke-after.json).
- [Godot Pecio](../../backups/maintenance-reports/20261115-inventory/godot-pecio-final.log) y [Godot Retiro](../../backups/maintenance-reports/20261115-inventory/godot-retiro-final.log).
- [Integridad de objetos Git](../../backups/maintenance-reports/20261115-inventory/git-verification.json).

Las evidencias reflejan el estado revisado durante esta sesión. El trabajo posterior de otros chats requiere su propia validación.
