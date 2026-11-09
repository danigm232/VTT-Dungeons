# Retiro del Dragón · finales de sendero

En el visor de jugador se comprobó que las cuatro salidas tenían una continuación escénica. Pleamar mostraba un recorte recto en el extremo, el tramo del bosque se distinguía poco del suelo y parte de la huella costera del Observatorio quedaba enterrada. Se conservaron los anclajes, el suelo jugable, las rutas, los destinos y los GLB de origen.

| ID original | Derivado y diferencia | Lectura comprobada |
| --- | --- | --- |
| `SAL1_Decorative_Trail_Continuation` | `:feathered` sigue el trazado V4, con bordes irregulares y desvanecimiento en la curva | En el giro frontal un saliente todavía oculta un tramo intermedio. |
| `R2_Pleamar_Low_Cove_Continuation` | `:feathered` se apoya sobre el relieve de la cala y alarga ligeramente la huella visible | La tierra se pierde gradualmente entre las rocas. |
| `SAL2_Scenic_Trail_Continuation` | `:feathered` ensancha la huella al entrar al bosque y la apoya sobre la ladera | Se lee la transición de pavimento a tierra. |
| `SAL3_Scenic_Coast_Continuation` | `:feathered` curva la huella sobre el hombro costero y termina antes del descenso pronunciado | Se distingue la curva desde la llegada. |

Propietarios: `retreat-trail-ends.ts` y `retreat-refinement.ts`. VTT_AMBIENCE, VA-04/07/13/15. Se reutiliza la imagen de tierra `earth.webp` del Retiro y una variante compartida con opacidad por vértice. Cuatro mallas derivadas reemplazan en pantalla a las cuatro fuentes, conservadas en disco. El inventario de escena sube de 2291 a 2295 mallas, de 246 a 247 materiales y de 122 a 123 objetos de textura. Mantiene 23 luces. Sin nuevos archivos de textura ni colisiones. No se midieron FPS en este pase.

## Validación

12 pares a 1280 × 720 desde las cuatro anclas, a 25° de inclinación y giros de −30°, 0° y +30°. Misma pose, zoom y luz diurna, sin errores registrados. Tipos del cliente y 15 pruebas aprobadas, incluidas las idas y vueltas con tres personajes por Pleamar alta, Pleamar baja y la superficie del Observatorio. Candidata en el visor integrado de prueba. Aceptación de usuario, prueba física y activación en 3000 pendientes.

[Comparador superpuesto](../../output/retreat-fixtures-20261106/senderos.html) · [Originales, poses y huellas](../../output/retreat-fixtures-20261106/senderos-originales.json)

## Siguiente muestra de acabado

1. **Continuidad en los bordes, VA-07/13/15.** Trabajar primero la cala y el acceso costero. El borde recto del fondo y la unión de roca con agua todavía aparecen en tomas laterales. Comprobar separación de planos y silueta a los tres giros con el agua y las rocas actuales.
2. **Vegetación por hábitat, VA-08/09.** Agrupar plantas bajas en suelo protegido y dejar roca expuesta en la cornisa. Mantener claros en el bosque y distinguir los dos recorridos con densidad y color. El estudio de Sucker Punch usa pocas familias vegetales por bioma y trata la vegetación como parte de la composición. [Dirección de arte de Ghost of Tsushima](https://blog.playstation.com/2020/07/09/crafting-the-world-of-tsushima/) · [Presentación de vegetación en GDC](https://gdcvault.com/play/1027033/Advanced-Graphics-Summit-Procedural-Grass)
3. **Contacto y respuesta a la luz, VA-10/11/12/16.** Afinar el anclaje de raíces, rocas y pies y la diferencia entre piedra seca y roca próxima al mar. Verificar la misma escena de día, al ocaso y con lluvia usando el reloj y el clima existentes.

Son referencias de estudio. La propuesta se evalúa mediante muestras en el VTT y mediciones en los dispositivos objetivo.
