# Retiro del Dragón · entrega V2–V5

Publicación completada el 28/10/2026; el nombre del lote conserva su fecha de inicio.

Publicada en http://127.0.0.1:3000/dm. runtime/prepared-retreat-v25-20261027b. Galería con comparativas: output/retreat-v2-v4-20261027/index.html.

## Resultado

- V2: Biblioteca y jardín. 20 estanterías refinadas; misma distribución y pasillos. Pared de 75 cm y jardín exterior.
- V3: Templo y puente. Cuatro columnas en perímetro, Bahamut y siete canarios; techo y vigas se ocultan juntos. Puente de madera.
- V4: Caminos y Pleamar. 112 postes, 76 tramos de cuerda, siete jardineras y continuación del camino alrededor de la roca.
- V5: Costa y embarcadero. Roca continua, orilla seca, árboles apoyados y bote con flotación y amarre dinámicos.

## Archivos

Cargadores y presentación: apps/web/world.ts; retreat-global-visuals.ts, retreat-refinement.ts, retreat-expansion.ts, retreat-visual-revisions.ts, retreat-departure-landscape.ts, retreat-refinement-materials.ts, retreat-refinement-coast.ts y retreat-coastal-presentation.ts en campaigns/stormwreck-isle/public. Navegación: retreat-runtime.ts, retreat-temple-navigation.ts/json y únicamente obstáculos A5 en retreat-zones/global-layout.json. Siete GLB derivados nuevos, originales conservados. Fuentes Blender, constructores reproducibles y verificadores en prototypes/retreat-v2-v4-20261027. Se actualizan pruebas de conservación para la ampliación A5 autorizada y se añaden pruebas de navegación del templo y flotación.

## Pruebas

53 pruebas, 9 archivos; 918 vistas de los tres roles; typechecks y compilación de producción. 12.226 pasos, 745.842 muestras físicas;42 objetivos ida/vuelta. V4: 2.116 aristas/128.703 muestras contra piezas nuevas. V3:2.262 muestras sobre suelo real; cubierta oculta/restaurada y grid independiente. V5:flotación, amarre, raíces y continuidad de roca. 71 piezas estáticas de las celdas y176GLB originales exactos. Publicación con11 grupos del guardado intactos; DM/jugador/proyector200.

## Pendiente

Revisión artística del usuario y auditoría sostenida de FPS, memoria y latencia en A1–A5, costa y salidas. Los destinos que aún no tienen mapa conservan su transición manual preparada; no se crean mapas de campaña en este lote. La continuación de Pleamar fuera del ancla es escénica y el DM confirma el viaje. No se declara terminada la optimización ni la calidad artística global por terminar estas correcciones.
