# Retiro y Pecio · acabado por zonas

Encargo autorizado de continuar con Astra el apartado visual, con Retiro y Pecio como prioridades. Esta entrega desarrolla VIS-3, el recorte de primer plano de VIS-4 y la integración de clima de VIS-5 del roadmap maestro. La carpeta de evidencia conserva la fecha de inicio, 04/11. La candidata se compila el 05/11.

## Candidata y revisión

El acabado está instalado en la mesa habitual y se abre con `INICIAR.cmd` al elegir Stormwreck. El puerto 3000 sirve los 23 archivos cotejados con la compilación revisada. El guardado está en estado `ready`. [Instalación y copias](../../output/stormwreck-zone-finish-20261104/deployment-3000-20261105.json).

Abrir `REVISAR-ACABADO.cmd` para jugar desde `runtime/stormwreck-zone-finish-20261105/{web,server}`. Inicia una partida temporal en un puerto local libre. [Galería de comparativas](../../output/stormwreck-zone-finish-20261104/index.html). La revisión integrada usa `prototypes/stormwreck-zone-finish-20261104/review.ts` y `scripts/build-stormwreck-zone-evidence.mjs` genera su registro.

Aceptación artística del usuario, escucha con voces, dispositivos físicos y Q1/M7 pendientes. La dirección aprobada sigue siendo la familia ilustrada de las dos láminas. Retiro conserva revisión 19 y Pecio conserva sus contratos M5/M7. La candidata anterior de mobiliario queda disponible en `runtime/stormwreck-object-finish-20261104`.

## Materiales y propietarios

Propietario del acabado `campaigns/stormwreck-isle/public/style-sample.ts`. Biblioteca original en `retreat-refinement-materials.ts`, `wreck-materials.ts`, `wreck-exterior.ts` y `ship-props3d.ts`. `validation.json` registra cada malla, material original y derivado, parámetros antes/después, geometría y matriz. Los materiales agrupados de A1 reciben variantes compartidas por submaterial.

| Familia | Candidata | VA y referencia |
|---|---|---|
| Basalto del Retiro | Albedo ilustrado existente de 1254², tinte `#B2BAB3`, escala de muestreo 0,46, normal 0,10. Con UV de 3,3 m, repetición aproximada de 7,17 m. Las UV particulares constan en las fuentes. | VA-01–05, REF-02/07 |
| Roble | `#C7B9A2`, estructura `#94816A`, testa `#AE9678`. Albedo ilustrado existente y normal 0,24. Rugosidad PBR 0,92 en tablas y 0,95 en estructura. | VA-01–06, REF-02/08 |
| Suelo | Pavimento `#C5BEA8`, caliza `#C7BC9E`, texturas propias de cada familia y normal 0,10. | VA-02–05, REF-02/07 |
| Vegetación | Pino `#2D432F`, luz `#465C35`, olivo `#53663F`, salvia `#6E7953`, hierba `#526335`/`#778043`, con el factor de autoría 0,40 del GLTF. Suelo de pradera `#ADB298`, corteza `#463D2D`. | VA-07–09, REF-02/07 |
| Madera del Pecio | Expuesta `#DEDFCA`, estructura `#8D9A8B`, húmeda `#A1B2A4`. Albedo ilustrado existente de 1254², escala 0,82, normal 0,32. | VA-01–05, REF-07/08 |
| Metal, cabo y tela | Hierro `#3A4647`, cuerda `#A79D79`, lino `#C6C2A9`. Cofre de hierro C9 con superficie metálica. StandardMaterial usa brillo especular 48 en hierro, 40 en madera húmeda y 24 en las otras familias. | VA-02/06, REF-07/08 |

Los mapas ORM existentes participan en el resultado PBR junto con sus multiplicadores. Las variantes usan las imágenes locales existentes y sus muestreadores compartidos. Las capturas comerciales permanecen como referencias atribuidas en la biblioteca del proyecto.

## Objetos y vegetación

Propietarios `engine/client/stormwreck-object-finish.ts` y `stormwreck-foliage-finish.ts`. El registro por ID se exporta a `validation.json`.

| Grupo por ID | Acabado integrado | Conservación verificada por código y pruebas |
|---|---|---|
| `CANON_Long_Table`, `CANON_Bench_North`, `CANON_Bench_South`, `CANON_Only_Head_Chair` | Tablones separados, cantos biselados, caballetes, travesaños y respaldo abierto. | Cuatro muebles, huellas, envolventes, fuentes y función canónica. |
| `R3_Upper_Planter_*`, `R3_A1_Trailing_Herbs_*`, `R3_Lower_Stair_Planter_*`, `R3_Garden_Herbs_*` | Hojas plegadas agrupadas, ancladas al plano de tierra de cada jardinera. | 31 emplazamientos, cotas, flores, tallos y tramos colgantes inferiores. |
| `R3_Tree_*_crown_R3_Olive/Pine_Dark` | Sombreado interior por grupos de hojas existentes, con transición hacia el borde iluminado. | 86 árboles, todos los vértices e índices de la copa, troncos y ramas. |
| `R3_Garden/Harbor/Expedition_Meadow_R3_Grass*` | Altura graduada entre 30 % y 100 % por manchas amplias, tinte 84–100 %. | Raíces, huella, flores, caminos y triángulos originales. |
| Timón, balista y componentes de muebles `c1-`…`c9-` | Cantos cerrados biselados de hasta 12 mm en piezas prismáticas. Tres tablones en escritorio C4. | Tres patas del escritorio, piezas rotas, pivotes, estados y contenidos de los objetos. |

Se revisó primero la muestra A3/umbral, después el jardín con una copa de olivo y un pino. El acabado final de copas usa el sombreado de las hojas. La copia de muestra queda en `dragon-rest-jardin-foliage-sample.png` como evidencia de desarrollo. Las comparativas definitivas usan parejas tomadas en una misma sesión y encuadre.

## Luz, profundidad y ambiente

`apps/web/world.ts` atenúa al 18 % exclusivamente las piezas de escalera que cruzan la silueta del personaje en camarotes o bajo cubierta. Usa las pruebas de intersección y el suavizado existentes. En los pares principales se atenúan cinco piezas en C4 y dos en C8. En C1 se observa la escalera opaca. Los derivados del Retiro respetan el recorte local aplicado a la pieza visible. VA-12–14, REF-01/03.

Los objetos derivados heredan luces y listas de sombra de sus fuentes. Se utilizan el reloj, mar, iluminación local y clima actuales. La capa de clima de A1 prepara materiales derivados antes de su primer dibujo y conserva el estado vivo de lluvia y nieve. Se corrigió el ciclo de fotograma de las capturas y su espera a los materiales visibles. Las variantes del Pecio comparten los lienzos originales de las telas porque duplicarlos generaba texturas vacías. Al reconstruir un objeto, el acabado reaplica las variantes compartidas y libera sus asociaciones antiguas. VA-05/10/11/16/17, REF-01/07.

La revisión de audio comprueba los controles y las secuencias del mezclador existente. Retiro usa mar/santuario y el Pecio usa oleaje/viento/madera. La evaluación de balance con la voz del DM requiere escucha en mesa.

## Validación y límites

Se han registrado 40 pares con idéntica cámara y resolución de 1280 × 720, 20 capturas adicionales con lluvia y 100 comprobaciones de ocaso, giros, luz portada y clima. Tres roles por mapa. Tres ciclos completos de apertura y cierre de `c4-barred-door`, `c5-door`, `c8-container-01` y `c9-iron-chest` conservan los recuentos de mallas, luces, texturas y materiales. Los informes de renderizado no registran errores.

Cliente y servidor compilados. Pasan 47 pruebas dirigidas y la regresión de clima de A1, 48 en ocho archivos. Las diez comprobaciones de red pasan contra la candidata arrancada con el lanzador. Incluyen conexión de roles, propiedad de ficha, movimiento, clima y reconexión. Se cotejaron las cuatro páginas servidas con los archivos compilados. En la interfaz de jugador se eligió a Mia y se comprobó su desplazamiento con D en la cubierta C1. Ocho fuentes protegidas, incluidas las de terreno, distribución, casco y paisaje, coinciden con sus hashes de Git. Las pruebas físicas y la aprobación del usuario continúan pendientes.

En la galería, el clic sobre la imagen cambia al después y Espacio vuelve al antes. La vista al 200 % mantiene el mismo rectángulo y desplazamiento en ambos sentidos. Los originales y sus hashes figuran en `manifest.json`. Los resultados de objetos, red, protección de fuentes e interacción están en `wreck-ship-object-states.json`, `network-smoke.json`, `protected-sources.json` y `gallery-ui.json`.

Las capturas proceden del visor de acabado y la comprobación de entrada y movimiento se hizo sobre la compilación aislada. `validation.json` distingue los hashes de las entradas compiladas y sus recursos directos de los hashes de las fuentes del espacio compartido al generar el informe. La [candidata de rendimiento](STORMWRECK_PERFORMANCE_20261105.md) tiene su propio registro y lanzador.

En la prueba ampliada de campamentos aparece una expectativa anterior sobre la orientación de la entrada de una tienda, `camp-weather.test.ts`, caso «orienta la entrada hacia el fuego». Las definiciones de esos campamentos están intactas en el diff. La regresión específica de preparación del clima se prueba separadamente.

Los originales gráficos permanecen disponibles para alternar las comparativas. Los 394 grupos de geometría derivada y las 2.224 asignaciones de material están registrados por ID. La geometría de objetos no añade imágenes ni materiales propios. En los objetos intervenidos del Retiro se pasa de 915.508 a 778.730 triángulos visibles potenciales, y en los del Pecio de 2.460 a 9.196. Los originales también ocupan memoria para permitir la comparación. Son recuentos del conjunto intervenido. La certificación prolongada de rendimiento corresponde a Q1/M7.
