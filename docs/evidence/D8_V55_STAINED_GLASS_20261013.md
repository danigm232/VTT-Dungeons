# D8 V55 — vidrieras de templo y atardecer

13 de octubre de 2026. Última petición del usuario: sustituir los paños transparentes lisos entre pared y tejado por vidrieras coloridas con luz de atardecer. Mantiene todas las correcciones de [V54](D8_V54_CORRECTIONS_20261013.md).

## Acabado aplicado

- Siete cierres de vidrio coloreado, en los mismos vanos de fachada, puerta y laterales. No se crean muros nuevos ni se reduce el paso.
- Rosetones de ocho hojas, centro dorado y mosaico romboidal con emplomado oscuro. Paleta ámbar, rubí, esmeralda, verde azulado y violeta; tono dorado de atardecer.
- Un patrón procedural compartido con repetición de UV ajustada a las proporciones de cada paño: no se estira un único rosetón a lo largo de toda la fachada. Los materiales conservan la textura original; se corrigió que `DynamicTexture.clone()` creaba un lienzo vacío. La auditoría ahora comprueba los píxeles de color, no solo la existencia de una textura.
- Vidrio translúcido (alpha 0,68), sin escritura de profundidad y sin ocluir fichas. Se conserva la envolvente/cutaway y la ocultación del techo del vestíbulo desde la nave.
- Tres proyectores solares occidentales utilizan el propio dibujo de la vidriera como textura de proyección real sobre las superficies interiores. Tres haces cálidos sutiles acompañan la luz; no son lámparas permanentemente encendidas.
- Proyección y haces se apagan por la noche; la emisión del vidrio cae al 12 % del valor base. Materiales y texturas siguen el ciclo de eliminación de la escena, sin mantener referencias activas entre mapas.
- Sin descargas ni imágenes nuevas generadas: se extiende el sistema nativo de materiales/Canvas que ya dibuja las vidrieras y decoración del templo. No se alteran reglas, tiradas ni guardados.

## Comprobaciones y activación

- Paquete V55 regenerado y validado: `current` idéntico al snapshot, fuentes exactas, imports relativos resueltos y V54 archivada. Se incorpora `camera-profile.ts`, nueva dependencia de la cámara compartida.
- Auditoría NullEngine de las seis escenas aprobada. Templo: 936 mallas, 40 luces locales, seis luces solares (tres con proyección de vidriera), nueve haces/manchas solares, tres mapas de sombras y 48 sombras de contacto. Cero cierres ausentes, cubiertas ocultas fuera, piezas superiores sin habitación ni referencias eliminadas en luces.
- Las siete vidrieras tienen textura repetida/transparencia correctas y no ocluyen tokens. Los tres proyectores usan la textura real del rosetón; se apagan de noche y reaparecen al atardecer.
- La cámara compartida se está actualizando en paralelo en «St. Wreck Camara», por petición posterior del usuario: 20°–40°, entrada a 20° y exterior a 40°. No se revierte ese cambio a los 25° anteriores. La auditoría usa los valores de la fuente real y comprueba que se conserva el ajuste manual.
- 20 pruebas focalizadas aprobadas (paquete, asientos/recuperación de bebida, seis regresiones V54, recompensa reutilizable y oclusión). Tipos del cliente y servidor aprobados después de integrar los cambios compartidos disponibles.
- Compilación de producción final V55 aprobada (4 min 14 s), incluida la corrección de textura: módulo servido `renderer-CVby6Rh2.js`. El servidor confirma V55, seis escenas y guardado `ready`, sin error ni cambios pendientes. Los guardados antiguos permanecen archivados según V54.
- La comprobación global realizada durante ediciones concurrentes obtuvo 758/762 pruebas aprobadas. La diferencia del paquete corresponde a la edición de la textura durante la ejecución: corregida y revalidada con 20/20 pruebas focalizadas después de regenerar las fuentes finales. Las otras tres son de combate (`game.test.ts` y dos combates sin armas de `silverfarben-combat.test.ts`); el trabajo paralelo «D8 Combate» sigue activo. No se sobrescriben sus cambios ni se presenta esa pasada global como completamente aprobada.
- Vista del patrón procedural guardada en `runtime/d8-v55-stained-glass.png`, inspeccionada: rosetón, emplomado y los seis colores presentes. Es el dibujo del vidrio, no una captura del VTT.

## Límite visual

La comprobación de geometría/materiales se realiza sin navegador mediante Babylon NullEngine. No sustituye una captura con GPU ni permite certificar la apariencia artística desde todos los ángulos. Sigue vigente el rechazo explícito de la navegación de revisión: no se ha eludido mediante otro navegador, superficie ni ejecución indirecta.

Recargar completamente las pestañas del VTT después de activar V55 para que reciban el cliente nuevo.
