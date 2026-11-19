# Pecio Rosa de los Vientos · Godot

Candidata local 2.5D sobre el mapa existente. Motor comprobado: Godot 4.7.2, Forward+. El estado y los criterios están en `../../docs/evidence/PECIO_GODOT_LAYERS_20261114.md` y en el roadmap maestro del repositorio.

## Pantallas de carga de habilidades · encargo del 14/11

El [roadmap maestro](../../ROADMAP_V1.md) incorpora el port de las 18 microescenas y la ampliación a tiradas enfrentadas. [Contrato de integración Godot](../../docs/design/GODOT_SKILL_LOADING_20261114.md): carga inicial y cambios de mapa, escena compartida en el proyector, dado y lanzamiento en la pantalla del protagonista presente, observadores con fundido/indicador/Continuar compacto. En los duelos, cada uno de los dos participantes recibe su propio dado. La selección excluye a personajes de jugadores ausentes, incluso como visitantes de Percepción.

**Implementado el port nativo.** El arranque pasa por `loading/loading_boot.tscn`: 18 habilidades, atlas originales y preparación real del mapa. Proyector con viñeta, controles personales con d20/Continuar y sesión local que filtra presentes y valida tiradas. Abrir `PROBAR-CARGAS-GODOT.cmd` para revisar todas las escenas. Incluye dos demostraciones enfrentadas reutilizando los recursos actuales. [Uso, pruebas y límites de integración](loading/README.md). La conexión local de los controles de carga no equivale a migrar las cuentas y los guardados de campaña.

## Abrir y revisar

- Desde la raíz de Dungeons, `ABRIR-PECIO-GODOT.cmd` abre el juego.
- `ABRIR-PECIO-CAPAS.cmd` abre la candidata aislada de acabado de las seis capas, conservada al entrar cambios paralelos de interfaz en este proyecto. Su validación se reproduce añadiendo `-ProjectPath runtime/godot-pecio-horizon-review-20261114` al script de verificación desde la raíz.
- `REVISAR-PECIO-CAPAS.cmd` abre las comparativas y el selector de ambientes.
- **WASD** para moverse; **Q/E** para girar; rueda para zoom; **T** para interactuar; **I/B** para mochila; **V** para la antorcha; **1/2/3** para el grupo.
- **Ambiente · F6** abre los controles de día/atardecer/noche y despejado/lluvia/tormenta/bruma. **Efectos suaves** reduce partículas y agitación textil. Son controles visuales locales.

## Capas implementadas

1. Distribución auditada y diagrama de plantas.
2. Greybox de la misma escena y comprobaciones físicas.
3. Construcción naval, cubiertas con espesor, refuerzos, aparejos y restos.
4. Materiales compartidos, lino reutilizado, vidrio y humedad reversible.
5. Iluminación por estancia, sombras conservadas en recortes y actores iluminados por ambiente/luces locales.
6. Clima regulable, lluvia exterior, mar continuo, espuma/partículas por zona y oleaje coherente con la barca.

Las capturas no equivalen a aceptación artística, rendimiento sostenido o prueba física. Esta candidata no está integrada todavía con el servidor multijugador ni con los guardados de campaña del VTT web.

## Fuentes y pruebas

`ship_geometry.gd` aporta geometría compartida; `ship_construction.gd` acabados estructurales; `ship_environment.gd` materiales de intemperie, luces y controles; `vfx_manager.gd` conserva y regula los emisores existentes. Las fuentes y recursos están visibles para Git; `.godot/` es caché excluida. No se ha publicado el proyecto.

Suites headless: `test_ship_construction.gd`, `test_ship_environment.gd`, `test_pecio_integrity.gd`, `test_doors_alignment.gd`, `test_babylon_camera_parity.gd` y `test_character_animations.gd`.

Desde la raíz del repositorio, `powershell -File scripts/verify-godot-pecio-layers.ps1 -Phase Verify` ejecuta las seis suites con registros separados. `-Phase Capture` regenera las vistas de construcción y acabado con el renderer real, en ventanas de revisión ocultas y sin cambiar las fuentes del juego. Después ejecutar, por orden, `node scripts/build-godot-pecio-layer-report.mjs`, `node scripts/build-godot-pecio-finish-report.mjs` y `node scripts/validate-godot-pecio-report.mjs`. La validación estática no sustituye la revisión interactiva en navegador.

Ejemplo desde esta carpeta: `godot --headless --path . --script scripts/test_ship_environment.gd`. Para las capturas reales se requiere un renderer con ventana: `godot --path . --script scripts/capture_ship_layers.gd -- --audit-time=night --audit-weather=storm --audit-dir=<ruta-de-salida>`.

## Procedencia

- Geometría y shaders nuevos: código original del proyecto, con fuentes conservadas.
- `linen-reused-v4.webp`: copia exacta del lino 512×512 de `campaigns/camp-rests/public/art/a1-hd2d-v1/linen-v4.webp`; atlas de ImageGen documentado en el README de esa carpeta. No es un recurso nuevo de terceros ni se declara CC0.
- Texturas ilustradas de madera/piedra/roble: manifiesto de `campaigns/stormwreck-isle/public/art/visual-style-v1/`, registrado en los créditos generales.
- Los modelos y otros recursos heredados del prototipo mantienen pendiente la reconciliación de sus créditos. El nombre de un archivo o una familia comercial no acredita su licencia.

## Cámaras VTT — 14/11/2026

[Política actual, controles, pruebas y límites de red](../../docs/evidence/GODOT_CAMERAS_20261114.md). F/R ajustan 5–25° de forma continua; Q/E ±30°. Las preferencias son por escena/rol y el zoom no cambia al entrar o salir. La publicación de cámaras usa arranque directo; la integración de cargas en curso se conserva en este espacio de trabajo.
