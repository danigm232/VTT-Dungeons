# Retiro del Dragón · cierre M1 → E1 → L1 · 26–27/10/2026

**Lote publicado y comprobado en el VTT del puerto 3000. Q1 no iniciada.** [DM](http://127.0.0.1:3000/dm) · [Proyector](http://127.0.0.1:3000/projector) · [Fotos por fase](../../output/retreat-mel-20261026/index.html) · [Roadmap actualizado](../audits/RETREAT_TECHNICAL_ROADMAP_20261023.md).

| Fase | Entrega | Comparativas |
|---|---|---|
| M1 | Basalto a dos escalas, variación mineral y pavimento más sobrio; biblioteca compartida. | [85 pares](../../output/retreat-m1-20261026/index.html) · [informe](RETREAT_M1_20261026.md) |
| E1 | Copas sin atlas floral, una textura de acículas compartida; 25 plantas bajas sobre suelo verificado, 5 lotes y fuente Blender/GLB. | [103 pares](../../output/retreat-e1-20261026/index.html) · [informe](RETREAT_E1_20261026.md) |
| L1 | Sol/ambiente equilibrados, caras interiores PBR corregidas, rellenos cálidos coherentes, cielo parcial y espuma de contacto. | [121 pares](../../output/retreat-l1-20261026/index.html) · [informe](RETREAT_L1_20261026.md) |

## Conservación y validación

130 pruebas en 18 archivos,309 pares de imágenes, 50 vistas funcionales con grupo de tres,DM/jugador/proyector,cuadrícula,móvil y combate;3 salidas y regresos sin crecimiento de recursos. Compilación cliente/servidor correcta. Navegación autoritativa:12.242 pasos y746.804 muestras físicas,1.279 casillas/13 superficies/18 conexiones. Se conservan las137 casillas de playa autorizadas anteriormente; JSON original1.142 intacto.

Las seis celdas y todo su mobiliario, edificios ampliados, navegación, anclas y conexiones mantienen sus fuentes. De105 archivos protegidos,98 permanecen idénticos;7 cambios de integración/materiales/luz declarados. Los 55 GLB originales de la base están intactos;51 de ellos se comprobaron también dentro de los52 GLB compilados, junto al nuevoE1.549 entradas de compilación congeladas. Sin nuevos controles del DM, interactivos, decisiones narrativas o resolución automática de dados. Toda la nueva vestimenta es VTT_AMBIENCE.

## Publicación y guardado

Candidata `runtime/prepared-retreat-mel-20261027a` activada; servidor 3000 PID 9664. La anterior compilación queda conservada en runtime. Durante la prueba de producción: consola conectada, proyector listo, partida guardada, Retiro cargado y 3 lienzos. Proyector:sin pantalla de entrada ni desconexión y3 lienzos. Sin errores de consola.

La raíz3000 abre el cliente de jugadores; el acceso directo de dirección es `/dm`. La partida estaba enfocada en el campamento independienteA1. Se utilizó el comando existente `view:focus` para mostrar el Retiro y se encuadró el mapa; **no se usó el traslado de grupo `scene`**. Los 10 grupos de datos de personajes,PNJ,criatura,objetos/escenas,ambiente,progreso,notas,condiciones y descansos permanecen idénticos. El undécimo grupo cambia de forma intencionada:solo el foco DM/proyector pasa a `dragon-rest`. Hora,simulación climática y reproducción de audio pueden avanzar normalmente. La apertura del panel de Codex quedó en cola mientras este chat no estaba visible; las páginas reales de producción sí se comprobaron mediante navegador controlado.

## Coste y pendientes

M1 mantiene mallas/geometrías/texturas/luces y añade dos variantes de material para la tierra. E1 añade5 primitivas/2.376 triángulos y un único mapa de acículas256². L1 añade1 lote de espuma/608 vértices/456 triángulos, sin texturas,luces,reflejos o mapas de sombras nuevos. Cada comparativa conserva su perfil de pantalla; no se mezclan el agua compacta y la de escritorio para atribuir cambios a rendimiento. En los3 retornos:1.569 mallas,233 materiales,75 texturas y18 luces estables.

Los recuentos no certifican FPS ni VRAM. Q1 queda pendiente para carga selectiva,oclusión por terreno,memoria,sombras y medición sostenida. Las copas conservan la silueta simplificada original y quedan paños rocosos amplios/ejes ortogonales heredados; las galerías permiten la revisión artística del usuario. Este cierre técnico no declara una equivalencia fotorrealista con la propuesta.

## Archivos

- `apps/web/world.ts`
- `campaigns/stormwreck-isle/public/retreat-global-visuals.ts`
- `campaigns/stormwreck-isle/public/retreat-refinement.ts`
- `campaigns/stormwreck-isle/public/retreat-refinement-materials.ts`
- `campaigns/stormwreck-isle/public/retreat-refinement-lighting.ts`
- `campaigns/stormwreck-isle/public/retreat-refinement-coast.ts`
- `campaigns/stormwreck-isle/public/retreat-mineral-surface.ts`
- `campaigns/stormwreck-isle/public/retreat-environment.ts`
- `campaigns/stormwreck-isle/public/retreat-needle-surface.ts`
- `campaigns/stormwreck-isle/public/retreat-contact-surf.ts`
- `campaigns/stormwreck-isle/public/retreat-polish.json`
- `campaigns/stormwreck-isle/public/art/retreat-modules/retreat_environment_e1_runtime.glb`
- `engine/client/retreat-mineral-surface.test.ts`
- `engine/client/retreat-environment.test.ts`
- `engine/client/retreat-contact-surf.test.ts`

Fuentes editables,QA y compilación: `prototypes/retreat-mel-20261026/`. Documentación de fases: `docs/evidence/RETREAT_M1_20261026.md`, `RETREAT_E1_20261026.md`, `RETREAT_L1_20261026.md`. Evidencia consolidada ySHA: `output/retreat-mel-20261026/checks/batch.json`, `source-preservation.json`, `delivery-files.json`, `release.json`, `published.json`.

**Siguiente tarea recomendada:** revisar las tres galerías y,con una instrucción posterior,iniciar Q1. El presente encargo termina antes de esa fase.

Se cerraron los clientes de prueba y el servidor QA4624. El VTT3000 continúa activo;la galería reutiliza el servidor4623 existente para evitar otra sesión de renderizado oculta.
