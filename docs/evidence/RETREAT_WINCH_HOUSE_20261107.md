# Retiro del Dragón · caseta del cabrestante A2

Encargo del 07/11/2026. Candidata para revisión, sin sustituir la mesa abierta en el puerto 3000. [Comparador antes/después](../../output/retreat-winch-house-20261107/index.html) · [Originales, poses y huellas](../../output/retreat-winch-house-20261107/originals.json).

## Resultado

La caseta utiliza las mismas paredes y huella de A2, ahora acabadas con tablones de madera. Dos ventanas acristaladas, una en la pared del mar y otra lateral, se abren realmente en la geometría. Sus marcos siguen el mismo recorte que la pared. La cubierta a dos aguas vuelve a verse desde fuera y se retira durante el uso interior. La pared superior de cara a la cámara también se abre mientras el personaje está dentro.

El vidrio usa reflejo especular, Fresnel y franjas discretas que sugieren el cielo. Es una representación estilizada que responde a la luz y la dirección de visión; no calcula un reflejo exacto del entorno en tiempo real. Las ventanas y su vidrio no son accesos ni interacciones nuevas.

La cadena atraviesa una abertura pequeña en la pared sur. El montante de madera ya existente queda alojado en un rebaje interior, de modo que sus superficies no se solapan con las del paño de madera. La abertura del cable es independiente de la puerta. El suelo, cabrestante, palé, elevación, navegación y colisiones de los personajes continúan bajo los sistemas existentes.

**CANON:** casa del cabrestante, puerta, cubierta, cabrestante y palé. **VTT_AMBIENCE solicitado:** paredes de tablas, ventanas, reflejo, paso del cable y rebaje del soporte. No se atribuyen estos acabados al texto de la aventura.

## Registro de arte y geometría

Referencia de estudio: REF-02 Witchbrook para coherencia del material/mueble y REF-03 Final Fantasy Tactics 2025 para lectura de sprites y volúmenes. Se aplican los criterios VA-05 (familia de arquitectura), VA-07 (contactos) y VA-12/13 (visibilidad y capas), sin usar las capturas comerciales como activos.

| ID / propietario | Base observada | Candidata y criterio |
|---|---|---|
| `East_Wall_Base/Upper`, `North_Wall_Base/Upper`, `South_Wall_Base/Upper`, `West_Wall_North_Base/Upper`, `West_Wall_South_Base/Upper` · `retreat-winch-house.ts` | `style-v1:zones:basalt:retreat:pbr:carved`, albedo ilustrado 1254 × 1254, rugosidad 0,95 | `style-v1:zones:oak:retreat:pbr:wood:planks`, albedo existente 1254 × 1254, rugosidad 0,92 y normal existente 256 × 256. UV generadas en metros a 1,35 m, veta vertical. Misma caja exterior y metadatos de pared. |
| `retreat:winch-south-window-frame` y `retreat:winch-east-window-frame` · `retreat-winch-house.ts` | Sin ventana | Marcos y divisores de madera compartida `style-v1:zones:oak-endgrain:retreat:pbr:wood:endgrain`, rugosidad 0,95. Aberturas de 0,94 × 1,06 m en los paños superiores. |
| `retreat:winch-south-window-glass` y `retreat:winch-east-window-glass` · mismo archivo | Sin vidrio | Material compartido `retreat:winch-window-glass`, opacidad 0,68, brillo especular 128 y Fresnel. Geometría de vidrio fina dentro del hueco, sin collider ni selección. |
| `retreat:winch-south-window-reflection` y `retreat:winch-east-window-reflection` · mismo archivo | Sin reflejo | Material compartido `retreat:winch-window-glass-reflection`, opacidad 0,26 y dos brillos discretos por cara. Sin textura nueva ni pasada adicional de cámara. |
| `South_Wall_Upper` y `CANON_Chain_Feed` · mismo archivo | El cable y parte del soporte ocupaban el volumen de la pared | Ranura alta para el cable y rebaje parcial para el soporte entre Z 69,055 y 69,215 m. El montante sigue en su posición y el muro conserva su cara exterior. |
| `retreatExcavationCutsMesh` · `retreat-local-occlusion.ts` | La casa seguía la atenuación individual por rayos | Se abre el paño superior de A2 situado hacia la cámara cuando A2 está ocupada. La pared trasera y las bases conservan su función. |

La solución reutiliza las imágenes de roble, normal y rugosidad del Retiro y deja intactos los GLB de origen. Los diez paños derivan la geometría de sus cajas actuales en tiempo de carga. La aceptación de color, vetas y brillo corresponde a la revisión artística del usuario.

## Comprobaciones

- **36 pruebas aprobadas** en cinco archivos, incluidas las ventanas y ranura, la restauración de sus marcos al cambiar de pared, la cámara de oclusión, el acceso, el mecanismo, las puertas y la navegación autoritativa del Retiro.
- La prueba de geometría utiliza la raíz glTF reflejada y comprueba con rayos que los huecos atraviesan la pared, que las tablas colindantes siguen siendo sólidas y que el rebaje del montante no atraviesa la cara exterior. Las banderas de colisión de las paredes se conservan.
- En la escena real se muestrean los triángulos de `CANON_Chain_Feed` y de los dos materiales de `VTT_Chain_Guide_And_Pulley`: **0 muestras dentro del volumen de pared después de descontar el paso y el rebaje**. Es una comprobación muestreada, no una prueba matemática de todas las superficies. [Datos](../../output/retreat-fixtures-20261106/winch-house-after-intersections.json).
- Diez pares de 1280 × 720 con poses idénticas, día y mismo actor. Exterior con puerta cerrada a 15°/25° y giros −30°/0°/+30°; interior con puerta abierta a 25° en los tres giros y a 15°/0°. Los originales y su huella están en la galería. Se ha verificado clic, teclado y ampliación.
- Las 1.596 casillas, 1,5 m por casilla y los datos de navegación no se han modificado. Las cajas de muro y mecanismo se reutilizan, incluida la puerta cerrada. Los huecos se encuentran por encima del paso, por lo que no crean una ruta de movimiento a través de la ventana.
- La escena inspeccionada pasa de 2.300 a 2.306 mallas y de 248 a 250 materiales, con **23 luces**. Se reutilizan texturas y no se añade otra cámara de reflejos. No se ha medido FPS sostenido ni memoria real de GPU para esta candidata.
- Compilación completa de cliente y servidor en `runtime/prepared-retreat-winch-20261107b`. Se abrió esa versión en una mesa temporal con guardado independiente: DM conectó y mostró la caseta, y las rutas de DM, jugador y proyector respondieron correctamente. Esto no sustituye la prueba física de varias pantallas durante una partida.

## Archivos

- `campaigns/stormwreck-isle/public/retreat-winch-house.ts`: material, geometría, ventanas, reflejos y rebaje.
- `campaigns/stormwreck-isle/public/retreat-refinement.ts`, `retreat-global-visuals.ts` y `retreat-local-occlusion.ts`: integración y recorte del paño que mira a la cámara.
- `engine/client/retreat-winch-house.test.ts` y `engine/client/retreat-local-occlusion.test.ts`: pruebas del acabado y su oclusión.
- `prototypes/retreat-fixtures-20261106/review.ts` y `prototypes/retreat-winch-house-20261107/gallery.mjs`: capturas reales y comparador.
- `ROADMAP_V1.md` y `PROJECT_STATE.md`: estado compartido. No se crea un segundo plan maestro.

La compilación y los registros de pruebas están en `output/retreat-fixtures-20261106/winch-*.log`. La instalación en la mesa habitual y la revisión física con DM/jugador/proyector siguen pendientes. La mesa de 3000 continúa abierta; no se fuerza su cierre ni se toca su guardado.
