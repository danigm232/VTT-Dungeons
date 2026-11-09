# Retiro y Pecio · muestra de mobiliario y plantas · 04/11/2026

Subentrega VIS-2 del [maestro](../../ROADMAP_V1.md), previa a la extensión autorizada por zonas. El usuario ha pedido continuar todo el apartado visual de Retiro y Pecio; Cena queda después. La autorización permite avanzar por bloques, pero la aceptación artística de los resultados sigue separada.

## Resultado reproducible

Candidata compilada `runtime/stormwreck-object-finish-20261104/{web,server}`. Acceso mediante `REVISAR-ACABADO.cmd`, con partida temporal y puerto libre. La instalación habitual de 3000 conserva la entrega del 02/11. [Galería superpuesta](../../output/stormwreck-object-finish-20261104/index.html), [auditoría por ID](../../output/stormwreck-object-finish-20261104/validation.json) y [originales con SHA-256](../../output/stormwreck-object-finish-20261104/manifest.json).

La muestra usa el WorldRenderer real y las familias de material/actor del 02/11 en ambos estados. Cambia únicamente la geometría visual descrita abajo. Sus fuentes quedan congeladas en `prototypes/stormwreck-object-finish-20261104/checkpoint-source/` antes del siguiente bloque. Generador de evidencia: `scripts/build-stormwreck-object-evidence.mjs`; visor de captura: `prototypes/stormwreck-object-finish-20261104/`.

## Objetos, recursos y parámetros

Propietario del derivado: `engine/client/stormwreck-object-finish.ts`. No se crean albedos, materiales, luces ni obstáculos. Las mallas candidatas reutilizan el material vivo de la pieza original, incluidas sus variantes de distancia, luz, clima y ocultación.

| ID / fuente propietaria | Base conservada | Derivado candidato | VA / referencia | Aceptación |
| --- | --- | --- | --- | --- |
| `CANON_Long_Table`, `CANON_Bench_North`, `CANON_Bench_South`; `retreat_r3_a3.glb` | Misma envolvente, apoyo y altura superior; materiales roble y estructura | Cuatro tablas en mesa / dos en bancos, juntas de 6 mm, grosor de 85/80 mm, caballetes, travesaño y cuñas; bisel máximo 16 mm | VA-05/06/07; REF-02 Witchbrook, REF-08 Eastward | Implementado y revisado en capturas; usuario pendiente |
| `CANON_Only_Head_Chair`; mismo GLB | Única silla y posición actual en cabecera | Asiento de dos tablas, cuatro patas, respaldo abierto con travesaños y tres listones, dentro del volumen anterior | VA-06; REF-02/08 | Usuario pendiente |
| `R3_Upper_Planter_7/8_R3_{Olive,Sage,Pine_Sun}`; `retreat_r3_landscape_runtime.glb` | Jardineras, tierra, tallos, flores y geometría colgante por debajo de 18,60 m | Hojas plegadas agrupadas: 3/2/5 grupos por material; variación de color de vértice 0,87–1,005; sin desplazar las anclas | VA-07/08/09; REF-02/07 | Usuario pendiente |
| `wheel:*`, `c2-ballista-blockout:*`, `c4-desk-blockout:*`, `c4-bed-blockout:*`; `engine/client/ship-props3d.ts` | Transformaciones, jerarquías y estados originales; tres patas del escritorio; balista rota | Cantos cerrados de hasta 12 mm en piezas de madera seleccionadas; escritorio dividido en tres tablas con junta de 7 mm, incluida su capa superior | VA-05/06/07; REF-02/08 | Usuario pendiente |

Madera nueva: proyección de superficie a 3,5 m por repetición, conservando los albedos ilustrados y los mapas de normal/ORM documentados en [la muestra anterior](STORMWRECK_STYLE_SKULL_20261102.md). Plantas: colores/materiales R3 existentes; no incorporan textura nueva. Los nombres exactos de cada primitiva, matrices, volúmenes y recuentos están en la auditoría enlazada. Procedencia: geometría propia derivada de los objetos del repositorio; las imágenes comerciales siguen siendo referencias de estudio, sin incorporarlas al juego.

## Comprobaciones y límites

Diez pares de capturas a 1280×720: comedor/umbral y cubierta/timón/C4, día/noche. Cámara, proyección y estado comparables; superposición mediante el componente común con clic/toque, teclado y ampliación. Nueve combinaciones de inclinación/giro y tres roles por mapa. Sin errores registrados en la revisión integrada. Geometría y matrices originales idénticas al alternar, derivado dentro del volumen original con tolerancia de 0,1 mm y sin crecimiento de recursos al alternar.

La comprobación integrada detectó que el importador GLTF expone hojas antes de corregir el eje de su raíz. El derivado espera ahora a que termine el propietario del Retiro; se repitieron todas sus capturas. Una prueba reproduce esa carga aplazada y verifica los límites. Pruebas de objetos: 6/6; también pasan las pruebas dirigidas de materiales, props, camarotes e integración de luces ejecutadas en este bloque. Cliente y servidor compilan. Diez comprobaciones de red real de la candidata temporal pasan: roles, permisos, cambios de mapa, movimiento, clima, reconexión e interfaces/recursos.

Los recuentos corresponden al derivado; los originales quedan en memoria para comparar. No se acreditan FPS ni memoria GPU por esos recuentos. No se ha certificado móvil/proyector físicos. El encuadre C4 sigue mostrando una escalera delante del personaje y pasa a la corrección VIS-4 del siguiente bloque. La piedra repetida, la familia completa por zonas y la vegetación del conjunto también continúan en VIS-3; esta muestra no cierra el apartado visual, Q1, M5 o M7.
