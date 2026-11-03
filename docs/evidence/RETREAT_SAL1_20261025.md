# SAL-1 — Cornisa alta de Pleamar · entrega parcial

Fecha:25/10/2026. Estado: construida y validada técnicamente; pendiente de revisión conceptual del usuario antes deSAL-2. Galería: output/retreat-sal1-20261025/index.html.

## Alcance y resultado

Se mejora el paisaje de `island-pleamar-high` sobre la ruta actual: conexión junto al templo, ascenso, cumbre, descenso y extremo8,29. El eje conserva58,5m, inicio+26,648m, máximo+35,50m y final+21,25m. Se añaden hombros de basalto, taludes, cuatro afloramientos, un espolón terminal, matorral bajo y continuidad escénica detrás del espolón. Esta continuación no añade casillas ni traslada el ancla.

Las imágenes aprobadas deSAL-0 se incorporaron al catálogo de referencias y al roadmap. La ilustración guía carácter y composición; coordenadas, alturas y contenido protegido proceden de los datos actuales.

## CANON y VTT_AMBIENCE

CANON: referencia del PDF oficial de la campaña, mapa regional y descripción de los desplazamientos hacia Pleamar. Se mantienen las interacciones, los viajes manuales, las decisiones delDM y los dados físicos.

VTT_AMBIENCE: forma exacta de estos taludes y del espolón, afloramientos, vegetación concreta y sendero escénico. No se declara este relieve local como trazado cartográfico literal del libro. Ningún interactivo nuevo ni control adicional delDM.

## Adaptación mínima y protección de lo existente

La masa decorativaG2 sobresalía sobre el paso en un punto y se extendía por el lado marítimo. Se conserva suGLB original íntegro y cargado como respaldo. Tras cargar por completo la nueva presentación se desactiva exclusivamente `G2_Backland_Connected_Volcanic_Island`; una derivada conserva sus atributos fuera del recorte y reemplaza la piel local por un talud más denso. Si la carga falla, permanece el paisaje previo. No se cambian las superficies de movimiento.

El terreno estructural permanece visible. Rocas y matorral próximos siguen la ocultación localO1. Se evita aplicar ocultación de una pieza grande a todo el suelo: durante la revisión producía agujeros visuales. Ocho encuadres bajos revelaron además un borde que tapaba las piernas; se rebajó antes del cierre. No se conserva esa candidata defectuosa como entrega.

Un cambio paralelo en `engine/client/wreck-scenic-depth.ts` recargó el visor y se conservó íntegro. Se desactivó la recarga automática solo del visor de revisión y se preparó la candidata b incluyendo esa primera revisión. El pecio siguió recibiendo ediciones posteriores: sus fuentes permanecen intactas; SAL-1 no certifica que su última versión en curso esté publicada. No se atribuye ese trabajo a esta fase. El próximo build habitual incorporará ambas fuentes vigentes.

Se conservan las seis celdas y todos sus muebles, ampliacionesA2–A5, puertas, anclas, embarcadero a la derecha, orientación aceptada y escala1,5m/casilla. Reservas bajo los arcosA5 y vertical de cargaA2 libres. No se toca la rama ajena `game.ts/turnOnly`.

## Archivos

- Adaptados: `apps/web/world.ts`; `campaigns/stormwreck-isle/public/retreat-global-visuals.ts`, `retreat-refinement.ts`, `retreat-zone-finishes.ts`.
- Nuevos: `retreat-decoration-loader.ts` compartido por acabados/paisaje; `retreat-departure-landscape.ts/.json`; `art/retreat-modules/retreat_departure_sal1_runtime.glb`, todos en la campaña pública.
- Fuente editable: `prototypes/retreat-departure-sal1-20261025/build_scene.py` y `artifacts/retreat_departure_sal1.blend`; verificadores y visor aislado en esa misma carpeta.
- Regresión nueva: `engine/client/retreat-departure-landscape.test.ts`.
- Documentación: roadmap maestro, catálogo de referencias, fichaSAL, relevo e informe en `docs/evidence/RETREAT_SAL1_20261025.md`.

## Validación

- 142 pares antes/después con la misma cámara: cinco inclinaciones5/10/15/20/25°, cinco giros−30/−15/0/15/30°, cuatro segmentos, cerca/lejos, roles y vistas de protección. Sin oclusiones nuevas a0,75/1,35m sobre el personaje.
- 41 vistas de grupo, cuadrícula, móvil y combate; límite del jugador≤16m de alto/30m de ancho; combate conserva inclinación manual. Tres retornos de escena sin crecimiento en las métricas de recursos verificadas.
- GLB real reimportado:594.660 muestras corporales/radio0,30m/altura2,05m sobre28.591 puntos distintos del recorrido y1.142 centros de casilla; cero invasiones.
- Movimiento autoritativo:12.242 pasos de ida/vuelta por42 objetivos,746.804 muestras y243 bordes exteriores rechazados. Perfil y navegación conservados por contenido/hash.
- 93/93 pruebas en9archivos;4/4 del cargador repetidas tras su último ajuste. Viajes manuales, cancelación, confirmación y regreso de tres personajes en estado aislado; guardados reales no usados para fotos.
- ValidadorGLB:0errores/0advertencias. Los15avisos informativos indicanUVsin textura incrustada: se reutilizan las texturas de los materiales existentes al cargar enBabylon.
- Conservación: 80/84 fuentes protegidas idénticas; las4variaciones son los propietarios adaptados listados arriba. Modelos originales, celdas, navegación, puertos y conexiones intactos.
- Tipos y compilación aislada; publicación y entradaDM3000 documentadas en las pruebas de cierre. Comparación semántica del guardado en `checks/live-save-preservation.json`.
- Ventanas realesDM/proyector: servidor conectado, proyector listo, mapa renderizado y sin errores de consola; guardado manual confirmado(copia10659). Fotos `evidence/published-dm.png` y `published-projector.png`, con la noche/clima existentes. Los11grupos protegidos del guardado permanecen iguales; reloj y simulación climática siguen su curso normal.

## Coste y límites

Módulo: 1,039,096bytes, 14,805triángulos,15primitivas y3materiales por nombre ya existentes. Se mantiene cargada la malla original desactivada para respaldo, por lo que esta entrega prioriza conservación y calidad. Cambio real de recursos: `{"meshes": {"before": 1279, "after": 1295, "delta": 16}, "materials": {"before": 231, "after": 231, "delta": 0}, "textures": {"before": 73, "after": 73, "delta": 0}, "lights": {"before": 18, "after": 18, "delta": 0}}`. No se añaden imágenes, luces ni mapas de sombra.

No se certificanFPS/memoria ni se optimiza esta fase. Q1 sigue al final por decisión del usuario; M1 afinará los materiales globales y L1 la luz/costa. El tratamiento del resto de los remates pertenece aSAL-2…4. La integración global definitiva corresponde aSAL-5. Los mapas finales deCuevas/Observatorio siguen preparados si aún no existen.

## Próximo paso

Revisar conceptualmente esta entrega. DespuésSAL-2: acceso compartido y rama interior delObservatorio hasta80,10/+37m, bosquetes abiertos y remate tras una loma. Conservar bifurcación96,22/+29,90m, cornisaSAL-1 y cargaA2; sin nuevas colisiones, navegación o viajes. No iniciarSAL-2 automáticamente.
