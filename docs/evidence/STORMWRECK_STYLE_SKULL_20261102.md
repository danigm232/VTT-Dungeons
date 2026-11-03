# Retiro/Pecio: muestras implementadas y cráneo completado · 02/11/2026

**Instalación posterior autorizada:** el usuario pide llevar la actualización a su puerto 3000. Cliente/servidor recompilados y activados con `prepared-build.mjs`, guardados habituales conservados y compilación anterior archivada por el instalador. [Comprobaciones de instalación](../../output/stormwreck-style-sample-20261101/deployment-3000-20261102.json). La candidata separada descrita debajo conserva su valor como evidencia del primer pase; ya no es la única forma de ver el acabado. Galería regenerada con superposición por clic y ampliación; imágenes originales intactas. La aceptación artística/física continúa pendiente.

Entrega del bloque autorizado, dependiente del único [roadmap maestro](../../ROADMAP_V1.md). Dirección de las dos láminas aprobada el 01/11; acabado real pendiente de revisión del usuario. No es el cierre de todas las fases visuales ni una nueva versión aceptada.

## Resultado y acceso

- Candidata independiente: `runtime/stormwreck-style-skull-20261102/{web,server}`. Abrir `REVISAR-ACABADO.cmd`; muestra enlaces DM/jugador/proyector en un puerto libre, usa guardado temporal y se cierra escribiendo `quit` en esa consola. Acceso de revisión local en el mismo PC; no acredita conexión física LAN.
- [Galería de capturas reales](../../output/stormwreck-style-sample-20261101/index.html), con base/muestra al mismo encuadre y cráneo antes/después.
- El cliente normal conserva las muestras desactivadas por defecto; la candidata se compila con `DUNGEONS_STYLE_SAMPLE=1`. La corrección del cráneo está en la fuente común. No se ha reiniciado ni sustituido la mesa del puerto 3000 o sus guardados.
- Los conceptos aprobados se conservan [aparte](../../output/stormwreck-style-decisions-20261101/index.html); no se han convertido en fondos del mapa.

## Registro literal de materiales y objetos

Propietario de la muestra: `campaigns/stormwreck-isle/public/style-sample.ts`; integración y compilación: `apps/web/world.ts`, `vite.config.ts`. El informe JSON contiene cada nombre/ID de malla, material base/candidato, familia, geometría, índices y transformación; las filas siguientes describen las reglas, no inventan una aceptación por objeto.

| Familia / identificación actual | Base conservada | Candidata real | VA y referencia | Alcance y aceptación |
| --- | --- | --- | --- | --- |
| Retiro `retreat:pbr:rock*` / `carved*`, salvo `a1:room-*` | Albedo basáltico existente y UV nativa | `basalt-illustrated-v1.png`, tinte `#B2BAB3`, PBR roughness .95, normal .18 | VA01–05, Sea of Stars/Witchbrook | Piedra continua compartida: se amplía más allá de A3 para no producir un parche rectangular. Los interiores nativos de las seis celdas quedan fuera. Revisión artística pendiente. |
| A3 `CANON_Long_Table*`, bancos, cocina/umbral con rol `a3` y material `retreat:pbr:wood*` | Roble y geometría actuales | `oak-illustrated-v1.png`, `#C7B9A2`, roughness .92, normal .24 | VA01–06, Witchbrook/Eastward | Cambia la superficie; no se han remodelado patas, bancos, puertas ni añadido utensilios. |
| Pavimento A3 con `retreatFloor` / `walkable-floor` | UV y material existentes | Reutiliza diffuse de `a1:limestone-v5`, `#C7BC9E`, roughness .95, normal .18 | VA01–05, Sea of Stars | Sin albedo nuevo para suelo. |
| Pecio `terrain-material:exterior-deck`, madera/casco/tablas expuestos y C4 | Tablas actuales, UV y lotes combinados | `ship-timber-illustrated-v1.png`, `#DEDFCA`, StandardMaterial, normal .50, specular `#161E1C`, potencia 24 | VA01–05, Sea of Stars/Octopath | Los lotes compartidos de suelo/madera pueden abarcar otras zonas de la cubierta; no se separa geometría para simular aislamiento. Props explícitos de otros camarotes, bodegas y cofa excluidos. |
| Pecio `ship-exterior:oxidised-iron` / `salt-rope` | Recursos actuales | Hierro `#3A4647`, specular `#30383A` potencia 48; cabo `#A79D79` | VA01/02/06 | Ajustes de material, sin reparación del barco ni botín nuevo. |
| Personajes | Atlas, animación, control, apoyos y adaptación de luz del bloque anterior | Se conserva la adaptación a las luces existentes | VA10/11, Octopath | Se mantiene activa tanto en la base como en la muestra de materiales. |
| Cráneo `reef-south-west` | Diseño recibido de Antigravity, material `wreck-bone-material.ts` | Bóveda redondeada, escala común, cuencas/temporales/nariz cóncavos, maxilar y mandíbula conectados, sínfisis y bisagras; raíz mar + .80 m | VA06/08/09, legibilidad de objeto | Autorización posterior explícita del usuario para terminarlo. Huella original cols14–16/filas28–29 y obstáculos intactos; mandíbula visible sobre el agua media. No se certifica anatomía oficial exacta. |

Las nuevas texturas son PNG nativos de ImageGen, con mipmaps/trilineal y anisotropía 8 en el muestreador. Dimensiones, bytes y hashes reales están en [SOURCE_MANIFEST.json](../../campaigns/stormwreck-isle/public/art/visual-style-v1/SOURCE_MANIFEST.json); el tamaño pedido en el prompt no sustituye la medida del archivo. Se conservan UV/repetición del escenario actual; no se afirma haber fijado los 6–8 m propuestos para cada malla. No hay migración de motor o PBR general.

El material de hueso queda excluido del controlador de madera/piedra para mantener su propietario independiente. Copia exacta del archivo recibido: `prototypes/stormwreck-style-sample-20261101/antigravity-skull-before.ts.txt`. Se ha conservado íntegro el contenido desde `// 2. STERN VERTEBRAL COLUMN` hasta el final del archivo; no se han rehecho columna/costillas ni el trabajo restante de Antigravity.

## Clima y recursos

Las variantes se comparten por material base/familia y cargan dos albedos en Retiro o uno en Pecio. Su activación es reversible, sin recrear geometría/luces. Las normales comparten la imagen interna existente con intensidad independiente y conservan espacio gamma, canal y transformaciones UV.

La inspección del render detectó registro tardío de uniforms de lluvia. `RainAccumulation.prepare()` y `createWreckEnvironment.prepare()` permiten instalar sus capas vivas antes del primer dibujo de las variantes. Ambos plugins excluyen serialización genérica: clonarlos como `MaterialPluginBase` perdía su contexto de campaña. Una prueba verifica que el clon preparado responde al mismo estado climático y no duplica la capa. Los recuentos y límites de cada muestra se registran en `validation.json`; no equivalen a medición de memoria GPU.

## Evidencia y límites de aceptación

Las capturas usan el WorldRenderer integrado con snapshots públicos sintéticos y reloj detenido, sin tocar la partida real. Retiro: plaza/A3/A4, día/noche; Pecio: cubierta/C4, día/noche. Inclinaciones 5°/15°/25°, giros −30°/0°/30° y roles DM/jugador/proyector. El cráneo tiene prueba específica desde el mar, día/noche y tres giros a 15°. Mar, reflejo y pequeños elementos animados pueden cambiar entre capturas; no se declara igualdad píxel a píxel ni de matrices animadas.

La validación distingue pruebas dirigidas, tipos/compilación, red real de la candidata y revisión de imágenes. Resultado exacto en [validación](../../output/stormwreck-style-sample-20261101/validation.json); logs de red, cuando se ejecutan, en la misma carpeta. Las comprobaciones de roles del visor no sustituyen conexiones de red.

**Resultado final:** 45/45 pruebas dirigidas en siete archivos, tipos cliente, compilaciones cliente/servidor y arranque mediante el lanzador PASS. La candidata compilada pasa 10 comprobaciones con sockets reales: acceso DM, exclusividad del personaje, rechazo de control climático por jugador, rutas privadas bloqueadas, cambio Retiro/Pecio sincronizado, movimiento en proyector, lluvia sin `save_unavailable`, reconexión conservando posición y servicio de las tres interfaces/albedos. [Resultado de red](../../output/stormwreck-style-sample-20261101/network-smoke.json). DM abierto y renderizado en navegador. Las 12 parejas de captura incluyen 6 Retiro, 4 Pecio y 2 cráneo; cada informe registra nueve ángulos y tres roles, sin nuevas excepciones de JavaScript. Tras corregir la preparación no reaparecen los errores UBO en las inspecciones de consola; los eventos históricos anteriores permanecen en el historial del navegador.

**Límite de la regresión ampliada:** `scripts/integration-test.mjs` todavía conserva expectativas de la ruta antigua. Se actualiza su salida del puerto para usar `retreatLandmarks.boat` y esperar la caminata vigente de 9,5 s; la ejecución siguiente llega al barco pero espera `main 29,20` y recibe `main 29,19` en el abordaje. [Log conservado](../../output/stormwreck-style-sample-20261101/network-integration-current-route.log). No se cambia la navegación del juego para satisfacer esa expectativa ni se declara toda la integración histórica PASS. El arranque de la campaña excedía el límite antiguo de 8 s mientras se compilaba: el corredor admite ahora `DUNGEONS_TEST_START_TIMEOUT_MS=60000`, manteniendo los tiempos y aserciones de protocolo. Queda actualizar el recorrido general con las conexiones actuales si se encarga la regresión completa de la campaña.

Pendientes fuera de esta entrega: aceptación artística del usuario; refinamiento geométrico del mobiliario y vegetación; extensión del acabado por zonas; iluminación/profundidad/ambiente completas VIS3–5; revisión de ocaso/tormentas y todas las plantas; móvil/proyector físicos y sesión prolongada Q1/M7. C4 conserva el caso conocido de la escalera delante del personaje para su trabajo de visibilidad. No se oculta ese pendiente mejorando únicamente las texturas. No se promueve RC ni publicación en GitHub.
