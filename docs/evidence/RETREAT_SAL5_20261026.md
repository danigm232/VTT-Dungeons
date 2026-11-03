# Retiro del Dragón — cierre de SAL-2R a SAL-5

26 de octubre de 2026. Lote construido, comprobado y publicado en el VTT del puerto 3000. La revisión conceptual del usuario sigue pendiente; esta entrega no declara alcanzado todo el acabado de la propuesta visual.

## Resultado por fase

| Fase | Cambios | Comparativas |
|---|---|---:|
| SAL-2R | 54 pinos adicionales reutilizados, agrupados con claros; vegetación baja, tierra y afloramientos. Acabado del sendero sobre la misma superficie de los peldaños. | 145 |
| SAL-3 | Cornisa del Observatorio abierta al mar, recorte de los respaldos decorativos, hombro rocoso y continuación escénica. Apoyo corregido del hito costero. | 118 |
| SAL-4 | Orilla seca conservada, variación de roca y afloramientos bajos alrededor de la senda de Pleamar. | 118 |
| SAL-5 | Revisión conjunta de las cuatro salidas, grupo, roles, cuadrícula, combate, regresos y publicación. | 172 |

Son **553 pares antes/después**, con cámaras coincidentes. Las entregas están separadas:

- [SAL-2R — bosque y sendero interior](../../output/retreat-sal2r-20261026/index.html)
- [SAL-3 — cornisa costera](../../output/retreat-sal3-20261026/index.html)
- [SAL-4 — calas bajas](../../output/retreat-sal4-20261026/index.html)
- [Comparación general](../../output/retreat-sal5-20261026/index.html)

## Conservación y canon

Se mantienen A1–A5, las seis celdas y su mobiliario, la orientación aceptada, el puerto a la derecha, las ampliaciones anteriores y la escala de 1,5 m por casilla. Los caminos conservan sus coordenadas, alturas, anclas y conexiones. El acabado y los bordes se trabajan alrededor de esos ejes.

CANON conserva las funciones del claustro y las alternativas de viaje ya fijadas. Las especies vegetales, agrupaciones, desgaste, tierra y afloramientos de esta entrega son **VTT_AMBIENCE**. Las pruebas, mareas, encuentros, descansos y viajes continúan bajo resolución manual del DM, con dados físicos.

El JSON original conserva sus 1142 casillas. El runtime utiliza **1279 casillas, 13 superficies y 18 conexiones**, incluyendo las 137 casillas de playa autorizadas en otro chat. SAL no añade casillas ni retira esa ampliación.

## Archivos de producción

- `campaigns/stormwreck-isle/public/retreat-departure-landscape.ts` y `.json`: fases, metadatos y sustitución validada del paisaje.
- `campaigns/stormwreck-isle/public/retreat-departure-contacts.ts`: corrección limitada a las piedras costeras; las interiores se conservan.
- `campaigns/stormwreck-isle/public/retreat-quick-opt.ts`: descarga de las copias visuales ya sustituidas, manteniendo materiales y texturas compartidos.
- Tres modelos nuevos en `campaigns/stormwreck-isle/public/art/retreat-modules/`: `retreat_departure_sal2r_runtime.glb`, `retreat_departure_sal3_runtime.glb` y `retreat_departure_sal4_runtime.glb`.
- `engine/client/retreat-natural-landscape.test.ts`: pruebas de respaldo, materiales compartidos y contacto de las piedras.

Fuentes editables de Blender, generador y validadores en `prototypes/retreat-sal-natural-20261026/`. Los 48 modelos originales permanecen idénticos en disco.

| Modelo | Bytes | Triángulos únicos del archivo | Primitivas |
|---|---:|---:|---:|
| SAL-2R | 3375584 | 28198 | 67 |
| SAL-3 | 1930440 | 16701 | 42 |
| SAL-4 | 882892 | 7535 | 27 |

Estas exportaciones incluyen geometría derivada que sustituye presentaciones anteriores; las cifras no equivalen a todos los triángulos añadidos a la escena. No incorporan imágenes ni luces nuevas.

## Comprobaciones

- **102 pruebas correctas en 11 archivos**. Compilación del cliente y servidor correcta.
- 12242 pasos con el movimiento autoritativo, a 42 objetivos y regreso; 243 bordes exteriores bloqueados. Incluye habitaciones, escaleras y salidas.
- 597400 muestras corporales por candidata sobre GLB reimportados. Se comprueban 54 raíces y el apoyo del hito costero. El acabado del sendero conserva exactamente la superficie original.
- Cámaras de 5°, 10°, 15°, 20° y 25°, con giros de −30°, −15°, 0°, +15° y +30°. Sin oclusiones añadidas en la matriz.
- **50 vistas funcionales** con tres personajes, DM/jugador/proyector, cuadrícula, disposición de 390 × 844 y combate. Se mantiene la inclinación manual y el límite de cámara del jugador.
- **Tres regresos** con escenas anteriores liberadas y recursos estables.
- Validación glTF sin errores ni advertencias. Los 51 GLB compilados coinciden con las fuentes; 560 entradas de compilación congeladas.
- Publicación real comprobada: DM conectado, proyector dentro de la escena, tres lienzos en cada vista, sin errores actuales. Once grupos del guardado preservados. No se movieron personajes reales para las fotografías ni se cambió la hora o el clima de la partida.

## Problemas corregidos

La primera cornisa conservaba un respaldo G13 demasiado ancho y producía una pared/plataforma artificial. Se recortó su presentación exterior conservando el original y los accesos de A2.

Una primera deformación de la orilla dejaba huecos de agua rectangulares. Se rechazó y se conservó la base seca, limitando la variación del terreno fuera del paso.

Dos pestañas de diferente ancho elegían distinto detalle nativo del agua. Ese ensayo se rechazó y el antes se repitió en la misma ventana. Los 172 pares globales finales comparten malla de agua, cámara, lienzo y DPR. El ensayo funcional adicional comprueba también el perfil de escritorio. Las capturas rechazadas se conservan en la carpeta de comprobaciones del prototipo; ninguna candidata rechazada se publicó.

## Recursos y rendimiento

| Recurso de la matriz comparable | Antes | Después |
|---|---:|---:|
| Mallas | 1327 | 1562 |
| Geometrías | 898 | 1024 |
| Materiales | 231 | 231 |
| Texturas | 73 | 73 |
| Luces | 18 | 18 |

El perfil de escritorio de los tres regresos conserva 74 texturas de forma estable. Estos recuentos no son una medida exacta de memoria GPU. El paisaje añade geometría; **no se certifican FPS sostenidos en esta fase**. Carga selectiva, LOD, sombras, draw calls y medición prolongada siguen en Q1.

## Publicación y siguiente tarea

Candidata `runtime/prepared-retreat-sal-20261026b`, activa en `dist`. Servidor 3000, PID 20660. La compilación anterior se conserva y el cambio se hizo con cierre y guardado seguros.

[Entrada DM](http://127.0.0.1:3000/dm) · [Proyector](http://127.0.0.1:3000/projector) · [Publicación comprobada](../../output/retreat-sal5-20261026/checks/published.json) · [Consolidado](../../output/retreat-sal5-20261026/checks/batch.json) · [Guardado preservado](../../output/retreat-sal5-20261026/checks/live-save-preservation.json)

Quedan paños de roca amplios, ejes ortogonales heredados y acabado general por refinar. La siguiente ficha es **M1**, para piedra, pavimentos y materiales; después E1, L1 y Q1. La revisión conceptual del lote corresponde al usuario. No se inicia otra fase automáticamente.

![DM publicado](../../output/retreat-sal5-20261026/evidence/published-dm.png)

![Proyector publicado](../../output/retreat-sal5-20261026/evidence/published-projector.png)
