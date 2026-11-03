# Retiro · tercer pase solicitado · 28/10/2026

**En ejecución.** Autoridad: mensaje de15puntos y13capturas; el usuario confirma que el borde dentado está en el bosquete del embarcadero. Resolver el lote y después optimizar; no cerrar por completar una subfase.

## Base e invariantes

Estado `prototypes/retreat-corrections3-20261028/STATE.md`. Base visual revisión18,187GLB anteriores en disco. Al arrancar se detectaron6fuentes modificadas desde la publicación anterior(game,protocol,camera,DM,map-targets,world) y5archivos nuevos del sistema de navegación del DM. Se congelan **tal como estaban**; no revertir esas mejoras. QAaislada4633; fotos iniciales45en15focos y probes adicionales. No tocar actores reales ni probar con selector de escenas.

Conservar escala1,5m,celdas monásticas y todo su mobiliario,anclas de viajes,puertas y resolución manual. El usuario autoriza ahora ampliar comedor,biblioteca y pasillo exterior,recolocar bancos/fuego comunitarios,mover columnas a esquinas y construir muelle. Esas autorizaciones sustituyen las restricciones anteriores solo en los elementos afectados.

## Fases y aceptación

| Fase | Puntos | Trabajo y aceptación |
|---|---|---|
| 1 · Defectos | 1,8,13 | Normales de escalera correctas y material legible;bordes de suelo sin dientes,árbol completo y terreno sin solapes. Picks sobre superficies reales,antes/después idénticos. |
| 2 · Espacio | 4,7,8,11 | Bancos/fuego permiten rodear;entrada A2 y claros transitables;pasillo exterior pasa de3a6m útiles como mínimo. Cada casilla nueva o modificada tiene suelo y trayecto físico para radio0,30m. |
| 3 · Arquitectura | 9,10,12,14 | Comedor ocupa su vacío lateral;biblioteca alcanza el jardín;puertas y jambas dejan ver al ocupante;cuatro columnas en esquinas reales del suelo,con cubierta coherente. |
| 4 · Paisaje | 3,5,11,12,15 | Cuerdas continuas en escaleras,jardineras abundantes,aromáticas colgantes,jardín de ocio,bancos/antorchas y bosque diverso con copas volumétricas. Vegetación apoyada y fuera de corredores de paso. |
| 5 · Agua y movimiento | 2,6 | Muelle pequeño y bote sin roca;embarque/remada visibles en ángulos permitidos. Pozo de cabrestante libre hasta el agua,descenso interpolado y seguimiento de cámara;control manual del DM,reconexión y cancelación seguros. |
| 6 · Cierre/Q1 | Todos | Cámaras5°/15°/25°×−30°/0°/+30°,roles y puntos exactos de las capturas;recorridos,celdas,interacciones,guardado. Luego carga selectiva y trabajo oculto conservadores y medición global sostenida. No reducir calidad para mejorar FPS. |

## Mediciones y decisiones de implementación

- **Escalera del templo:** `G2_Path_island-pleamar-high`. Los picks previos muestran normales del peldaño `[0,−1,0]` y del frente `[0,0,−1]`. `levelRetreatTempleSideStairs` recalculaba con la convención equivocada bajo la raíz glTF reflejada. Corrección: `useRightHandedSystem:true`. Prueba con raíz reflejada y foto posterior confirman `[0,1,0]`;dos pruebas correctas. El material de acantilado puede aclararse en las caras de pisada sin tocar su posición.
- **Comedor:** suelo actualX114–129/Z55,5–63,Y18. Derivado lo amplía aX131 hacia la explanada,con cocina,pasillo,entrada,mesa y bancos conservados. Ajustar cierre de roca y navegación,no dejar pared antigua dentro.
- **Biblioteca:** suelo actualX93–111/Z52,5–63,Y18. Derivado alcanzaX87. La pared y estantes del oeste se desplazan6m;mesa,estantes independientes y puerta permanecen. Detalles y libros viajan con sus estantes. El jardín existente ocupa aproximadamenteX79–86;cerrar e integrar su unión.
- **Templo:** suelo realX33,75–47,25/Z63–76,5,Y27. X50,25 pertenece al extremo del puente,**no** al ancho del suelo. No mover columnas fuera de la terraza. MantenerX34,5375/46,4625 yZ75,78 delanteros;trasladar las dos posteriores deZ69,225 aZ64. Cubierta/estructura deben apoyar en esas cuatro esquinas.
- **Bosquete del puerto:** sueloP3Y0,16;comprobar la proyección UV y la unión con los faldonesG14. No confundir con el sendero alto. El bote actual centraX20,25/Z117 y su proa alcanzaZ115,25;el margen del embarcadero y alguna roca invaden esa reserva. Nuevo muelle conserva el puerto a la derecha y la interacción existente.
- **Explanada oriental:** sueloP3Y17,68;el camino y sus casillas heredadas pueden estar aY18. Comprobar y eliminar el resalto central,medir las altas y contactos arbóreos. No copiar pendientes de las escaleras a toda la explanada.
- **Muestreo de cámara:** Babylon `createPickingRay` ya aplica el escalado de píxel. No multiplicar otra vez porDPR en los probes;las capturas usan1280×720 y DPR1,125.

## Referencias de vegetación · VTT_AMBIENCE

- [RHS · jardín mediterráneo](https://www.rhs.org.uk/garden-design/design-with-plants/mediterranean-garden-plants):romero,salvia y arbolado como guía de silueta y agrupación.
- [RHS · romero rastrero](https://www.rhs.org.uk/plants/386334/salvia-rosmarinus-prostrata-group-ro/details):porte postrado,hoja perenne,flores azules y caída sobre bordes;referencia principal de cornisa.
- [RHS · aromáticas en recipientes](https://www.rhs.org.uk/advice/grow-your-own/containers/veg-on-walls/june-edible-container-idea):composición funcional de tomillo,romero,salvia y orégano junto a cocina/caminos.

Estas especies orientan la ambientación solicitada;no se atribuyen al canon de Stormwreck. No introducir contenido narrativo ni convertir el claustro en jardín lujoso.
