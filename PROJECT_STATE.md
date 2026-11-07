# Estado del proyecto

## Pantallas de habilidades · revisión numerada 0–18 — 2026-11-07

Candidata aislada en `dev/skill-transition`: nuevos sprites con objetos integrados para Mía, Mike y Trinity, pies apoyados, utilería y secundarios ilustrados, dado que rueda y desenlace animado persistente. Acrobacias inicia fuera de la cuerda; Atletismo usa suelo continuo en movimiento y caída al fallar. Contactos conjuntos de apretón y vendaje; caballo con escala y poses de alcance ajustadas. Visor autónomo actualizado en `output/skill-transition/PROBAR-LAS-18-PANTALLAS.html`; comparativas y vídeo en `output/skill-transition/correcciones-v3/REVISAR-CORRECCIONES-0-A-18.html`.

Diez pruebas dirigidas, tipos, compilación de cliente, 108 combinaciones y doce repeticiones de los dos últimos ajustes; móvil/táctil emulado y transición real por Socket.IO aprobados. Revisión artística del usuario y prueba física separadas. La mesa habitual y los cambios de otros chats se conservan. [Recursos y cambios por número](docs/design/SKILL_ANIMATION_CORRECTIONS_20261107.md), [evidencia y límites](docs/evidence/PLAYER_SKILL_TRANSITIONS_20261106.md).

## Instalación habitual 3000 y comparativas por superposición — 2026-11-02

Por petición explícita del usuario se instalan en `dist` las muestras Retiro/Pecio, adaptación de actores y cráneo terminado; la mesa habitual Stormwreck queda arrancada en el puerto 3000 con los guardados existentes. Preparación de cliente/tipos/servidor PASS y activación con el instalador existente; compilación anterior conservada en `runtime/previous-build-*`. El acabado queda activo por defecto en futuros arranques (`DUNGEONS_STYLE_SAMPLE=0` permite una compilación base aislada). [Registro de instalación y comprobaciones HTTP](output/stormwreck-style-sample-20261101/deployment-3000-20261102.json). La instalación solicitada no inventa aceptación artística ni física.

Nueva regla persistida en AGENTS/dirección/anexo visual: todos los informes nuevos o regenerados alternan antes/después superpuestos con clic/toque, sin perder encuadre/zoom/desplazamiento. Componente común `scripts/lib/visual-comparison.mjs`, ampliación hasta 300 %, etiquetas y teclado. Regenerados informes de materiales/cráneo y luz del 01/11 sin alterar capturas originales. La interfaz se verifica con imágenes sintéticas; el navegador de prueba bloquea `file:` y no se reexpone el informe local para sortear esa restricción. Las comparativas reales mantienen sus fechas/condiciones y aceptación pendiente.

## Muestras Retiro/Pecio y finalización del cráneo — 2026-11-02

Implementadas las primeras muestras de materiales ilustrados en el WorldRenderer actual: A3/umbral y piedra continua compartida del Retiro, cubierta/C4 del Pecio. Tres albedos derivados con ImageGen integrada, normales/UV y geometría conservadas, activación reversible y compilación de revisión separada. Cráneo recibido de Antigravity terminado por encargo explícito posterior del usuario: escala coherente dentro de la huella, bóveda redondeada, mandíbula conectada y cavidades hundidas. Se conserva el resto de su archivo y material óseo. Corregida la preparación de las capas vivas de clima de los materiales nuevos antes de dibujarlos. Pruebas dirigidas: 45/45 en siete archivos; tipos/compilación PASS y 10 comprobaciones de red real de la candidata PASS. La integración ampliada histórica mantiene una expectativa antigua de abordaje pendiente, detallada en el informe.

Acceso: `REVISAR-ACABADO.cmd`, con puerto libre y guardado temporal. [Galería real](output/stormwreck-style-sample-20261101/index.html) e [informe, propietarios, pruebas y pendientes](docs/evidence/STORMWRECK_STYLE_SKULL_20261102.md). La dirección artística está aprobada; la implementación requiere revisión del usuario. No se han instalado las muestras en la mesa habitual, reiniciado 3000, cambiado de modelo o publicado en GitHub. No cierra VIS2–6 ni Q1/M5/M7; mobiliario, plantas y profundidad completos siguen en el maestro.

## Coordinación inicial con Antigravity: sustituida por autorización posterior — 2026-11-01

Inicialmente el usuario pidió dejar el cráneo a Antigravity. Después encargó explícitamente terminarlo tras las muestras: «Cuando acabes de hacer lo tuyo, acaba el craneo que ha dejado a la mitad antigravity». La finalización del 02/11 parte de su fuente, no la revierte. El material de hueso sigue separado del controlador de madera/piedra. Los demás cambios concurrentes se conservan y no se atribuyen a esta entrega.

## Huesos de dragón del Pecio Rosa de los Vientos (Clyssavar) · fidelidad al canon del PDF — 2026-11-01

Reconstrucción integral de los restos esqueléticos de Clyssavar, el dragón de oro anciano cuya muerte violenta en el bajío norte dio origen al arrecife de huesos y provocó el naufragio del *Rosa de los Vientos* hace 40 años, según la descripción literal del libro oficial (`Aventura Los Dragones de la Isla de las Tempestades`, Cap. 3, pp. 22–27):

- **Identidad anatómica del dragón de oro:** cráneo en `reef-south-west` con cuernos curvados hacia atrás sobre el cuello, cuernos secundarios de cresta/corona, barbillones óseos mandibulares (chin-spurs), fosa temporal expuesta, cuencas oculares cavernosas con cavidad interna profunda (`cavities`), bóveda craneal con cresta sagital y mandíbula desencajada con grandes colmillos superiores e inferiores en marfil mineralizado.
- **Eliminación del clamp plano:** eliminada la función anterior de pinzamiento que aplastaba los vértices contra las paredes cuadradas de la celda. Las trayectorias paramétricas y volúmenes están calibrados analíticamente para respetar la huella de obstáculos (`reef-south-west` cols 14..16, rows 28..29; `dragon-bone-stern` col 1, rows 13..15) con cero deformación geométrica y cero violaciones de footprint.
- **Espina y costillar de popa (`dragon-bone-stern`):** 5 vértebras articuladas a lo largo del eje Z con apófisis espinosas dorsales y arcos de costillas gigantes que se elevan hasta 2,8 m sobre la lámina de agua, con cabezas de costilla (capitulum) y fracturas desgastadas por el salitre.
- **Huesos que rompen y sostienen el casco (Cap. 3, p. 23):** en `buildDistantDragonBones`, se incorporan las costillas colosales y el espinazo que empalan y acunan el casco fracturado en la brecha de popa («sostenido en los huesos antiguos que rompieron el casco»), además de las osamentas bajo el arrecife del trinquete en C2 («hasta las rocas y los huesos de dragón que se encuentran en el agua»).
- **Verificación:** 15/15 tests dirigidos de pecio (`wreck-rebuild.test.ts` y `wreck-atmosphere.test.ts`) PASS; typecheck cliente/servidor PASS (0 errores); bundle de producción Vite PASS.

## Dirección de las dos láminas aprobada — 2026-11-01

Respuesta explícita del usuario: «Acabado de las dos láminas (recomendado)». Aprobada la dirección ilustrada 2.5D para Retiro/Pecio y el desarrollo de muestras reales VIS-2. Actualizados maestro, dirección y perfil; los números de material se calibran en el motor. Las láminas continúan siendo conceptos, sin autoridad para alterar geometría o contenido. Esta aceptación no cierra muestras aún no construidas, pruebas, dispositivos, Q1 o M5/M7.

## Dirección visual candidata V1 de Retiro/Pecio — 2026-11-01

El usuario pide tomar decisiones visuales. Preparadas dos láminas de concepto con image_gen integrado, editando capturas propias recientes del comedor del Retiro y cubierta del Pecio; originales conservados y copias estables en `docs/references/stormwreck-style-20261101/`. Recomendación: misma familia 2.5D estilizada, Retiro volcánico templado y Pecio salino frío. Paletas por rol, material, muestreo/UV/resolución, grid y límites en `docs/design/STORMWRECK_VISUAL_PROFILE.json`; contiene prompts completos y procedencia. La dirección artística y el maestro enlazan esta especificación de VIS-2 sin crear otro roadmap.

**Estado: propuesta, valoración del usuario pendiente, no aplicada al juego.** Los bocetos no fijan geometría o contenido: no reinterpretar puertas como bancos, copiar refuerzos/vegetación/cielo, reparar barco o añadir botín por detalles generados. Valores de roughness/normal/UV son candidatos de muestra, aún no resultados verificados en motor. No se alteran fuentes de runtime, mapas, guardados, controles, dependencias o servidor habitual, ni se ejecutan nuevas pruebas del juego. Láminas, paletas, antes real/concepto y prompts en `output/stormwreck-style-decisions-20261101/index.html`.

## Roadmap consolidado y matriz de cambios — 2026-11-01

Auditoría de nombres fuera de copias/prototipos/runtime/output/dependencias/respaldos: 19 archivos con `roadmap`, de los que 14 son históricos/puentes antiguos, cuatro anexos y uno maestro. `ROADMAP_V1.md` contiene ahora la única secuencia de ejecución, motor/herramientas, diez categorías de cambios concretos por Retiro/Pecio, referencias por categoría, criterios de salida y decisiones aún abiertas. El anexo visual deja de duplicar la tabla de fases/estados. README/AGENTS/NEXT_MODEL_PROMPT apuntan a las secciones activas; el relevo r36 del Pecio queda explícitamente histórico.

Se conserva Babylon 9.26.0, PBR/StandardMaterial y propietarios actuales; no se encarga migrar motor/bibliotecas. Muestras A3/umbral y cubierta/C4 siguientes; paleta final, UV/resolución/normal/roughness y derivados se deciden con esas muestras, no constan aprobados. Referencias modernas ya incorporadas: doce documentadas, cinco familias examinadas y siete secundarias de estudio. No hay nueva implementación gráfica, compilación, prueba del juego, instalación, publicación o cambio de modelo por esta consolidación.

## Inicio visual: Retiro del Dragón y Pecio Rosa de los Vientos — 2026-11-01

El usuario cambia la prioridad de la línea visual: Retiro y Pecio antes que Cena. Actualizados el maestro y su anexo visual; Cena mantiene sus listas para después. Primera subentrega acotada VA-10/11: respuesta pictórica de los personajes al sol/ambiente y luces existentes, con separación por camarotes/plantas/celdas y sin alterar autoridad, visibilidad de entidades, física, colocación, sprites o controles. Se usa el renderizador integrado en una revisión aislada; no son sesiones reales de red ni certificación de dispositivos. [Registro de implementación, comparativas y límites](docs/evidence/STORMWRECK_VISUAL_START_20261101.md). El acabado de materiales, muebles, vegetación y profundidad del conjunto sigue pendiente, sin promover versión ni aceptación artística por esta entrada.

## Entrada única de planificación — 2026-11-01

Aclarada la jerarquía para evitar roadmaps competidores: `ROADMAP_V1.md` es el maestro y punto inicial para cualquier chat. `docs/VISUAL_ROADMAP.md` pasa a titularse plan de acabado visual; la ficha del Retiro conserva revisión 19 y orden local; Cena mantiene E0–E6/C01–C60; Dani/Fer conserva coordinación. Se mantienen nombres/rutas para no romper referencias y se etiqueta la propuesta `docs/ROADMAP_V1_REVISION_1.md` como histórica. README y AGENTS apuntan primero al maestro. No se mueven archivos, reinician mapas, cambian prioridades locales autorizadas o publican revisiones del juego. La siguiente muestra de Cena corresponde a la línea visual, sin detener los trabajos ya autorizados de otras escenas.

## Referencias modernas y dirección visual compartida — 2026-11-01

Encargo del 30/10, acotado por el usuario a 2018 en adelante: biblioteca de 12 juegos/ediciones modernas en `docs/design/VISUAL_REFERENCE_CATALOG.json` y `docs/design/VISUAL_REFERENCE_LIBRARY.md`; incluye Octopath 2018/II 2023, Witchbrook promocional 2026, FFTactics Enhanced 2025, Triangle Strategy 2022, DQIII HD-2D 2024, Star Ocean 2R 2023, Sea of Stars 2023, Eastward 2021, Chained Echoes 2022, Live A Live 2022, Eiyuden 2024 y Songs of Conquest 2024. Distingue cinco familias con imágenes examinadas y siete de estudio documental pendiente; no declara revisión completa de los 12 juegos ni convierte sus capturas en assets libres.

Guía común `docs/design/VISUAL_ART_DIRECTION.md`, auditoría `docs/audits/VISUAL_GAP_AUDIT_20261101.md` (VA-01–VA-18) y `docs/VISUAL_ROADMAP.md` (VIS-0…VIS-6), enlazadas desde arranque/roadmaps/relevos. Conserva mapas vigentes, fases del Retiro, referencias aprobadas y C01–C60 de Cena. El diagnóstico prioriza muestra coherente de materiales, muebles, vegetación, personajes y luz; reconoce sistemas ya hechos. `AGENTS.md` guía a futuros chats en tareas visuales; no se han enviado mensajes a otros chats ni cambiado modelos.

Galería local en `output/visual-reference-library-20261030/index.html` (carpeta conserva fecha de inicio del encargo). Investigación y planificación, sin arte integrado, reinicio/despliegue, nuevas pruebas del juego o aprobación física/artística. Las evidencias antiguas conservan su fecha; pendientes revalidación y ejecución de los bloques autorizados.

## Espejo D8 · bruma, sonido y recorrido de salida — 2026-10-21

Bruma baja reforzada con capas cruzadas; móvil conserva las dos bolsas disponibles más cercanas, sin elegir la galería sellada. Audio original de aire interior, dos gotas y crujido: incidencias cada 32–58 s, mezcla discreta y suspensión durante combate/activación/salida/silencio. Al cruzar la abertura tras la derrota se ven cinco casillas (7,5 m) de avance durante cinco segundos, sincronizadas por servidor, antes de la cena. Reconexión viva conserva el reloj; restauración duradera vuelve al umbral sin repetir automáticamente. Cámara del Espejo con envolvente corporal estable y margen bajo los pies; corregida la mesa vacía sin personaje de foco. Sin cambiar reglas, estadísticas o preferencias de otros mapas.

Candidata `runtime/d8-mirror-immersive-20261020/{server,web}`; lanzador `scripts/review-d8-mirror.ps1`, ahora versión predeterminada `immersive`. Mesa temporal `http://127.0.0.1:59950/dm`, galería `http://127.0.0.1:4603/gallery/`. 52 pruebas en 11 archivos, tipos/compilaciones e integración DM/dos jugadores/proyector correctos. 160 vistas, 252 muestras durante 413 estados de movimiento, 16 perfiles y mesa vacía sin errores ni pérdida del jugador. Grabación sonora de 70 s con gota a los 57,756 s. Conservadas 399 casillas, 344 difíciles y 49 peligrosas.

Tres regresos idénticos: 604 mallas, 60 texturas, 73,1043 MiB estimados. Perfiles: 130–298 llamadas y 69,33–83,97 MiB; 1080p aún supera el presupuesto orientativo de 80 MiB. Revisión enfocada, sin nueva sesión de veinte minutos ni certificación física de FPS. Pendientes aprobación artística, escucha con voces y Pixel/proyector físicos. Distribución habitual y guardados reales conservados; sin publicación ni subagentes. [Informe y reproducción](docs/evidence/D8_MIRROR_IMMERSIVE_20261021.md).

## Retiro · correcciones y piedra por fases — 2026-10-21

Primera entrega de piedra integrada sobre la entrega existente. Corregidos el agua que invadía el desembarco, la exclusión de las rocas de primer plano del sistema de ocultación y las estadísticas de capas/mar. Juego y visor comparten frente de 90° y dimensiones de zona; se conserva el perfil actual continuo de 5° a 25° y el controlador de cámara existente. Documentación FASE_3A/3B contrastada con el código.

Tres fases revisadas: material de basalto compartido, refinado en Blender de 18 masas existentes y contactos/variación mineral. Tres bloques de primer plano sustituidos por salientes nativos. Capa final de 21 mallas, 28.514 triángulos y 1,28 MiB. Conservadas las 128 mallas originales de celdas y siete archivos protegidos de navegación/distribución/campaña. 68/68 pruebas, cliente/servidor compilados, recorrido físico de 4.828 posiciones sin colisiones nuevas y coronación sin pliegues. Auditoría de 195 encuadres y 83 casos de primer plano sin incidencias; personaje completa las diez superficies con cuadrícula visible/oculta y sin perder apoyos. Capturas por fase y mediciones en el [informe](docs/evidence/RETREAT_STONE_20261021.md). Pendiente reducir el coste de la piedra en A3; después afinar encuentros y coronaciones y validar dispositivos físicos.

## Cena final D8 · instrucciones literales para compartir — 2026-10-21

El usuario concreta «mejorarlo, no cambiarlo». Añadido contrato de conservación de distribución/identidad/funciones y lista C01–C60 en `docs/design/D8_DINNER_LITERAL_CHECKLIST_20261021.json`, con versión legible `.md`. Once categorías; cada punto declara evidencia/tipo, qué falta o comprobar, acción, qué conservar, aceptación, fase y prioridad. Distingue observación visual, código auditado, verificación pendiente y efectos condicionados. Se revalida antes de implementar para conservar trabajo de otros chats.

Actualizados auditoría, encargo e informe visual con los 60 puntos completos, búsqueda y filtros. Copia autónoma `output/d8-dinner-octopath-audit-20261020/informe-para-compartir.html`: análisis, lista, prompt, base/pruebas fechadas y 13 imágenes integradas, sin dependencias de archivos locales. Validación documental de IDs, enlaces, PNG y sintaxis; sin ejecutar ni desplegar mejoras del juego, sin nuevos tests de runtime ni pruebas físicas. Las 41 pruebas y cifras de ejecución siguen siendo evidencia de base del 20/10.

## Cena final D8 · luz y profundidad explícitas — 2026-10-21

Ampliado el apartado 17 de `docs/design/D8_DINNER_OCTOPATH_AUDIT_20261020.md`, su encargo `docs/design/D8_DINNER_EXECUTION_PROMPT.md` y la galería local. Luz/profundidad ahora tienen entregables por fase: E0 base de planos y fuentes, E1 profundidad geométrica y luz inicial, E2 volumen/materiales, E3 iluminación completa y actores, E4 profundidad atmosférica/luz en el aire, E5 estados de luz por desenlace, E6 comparativas sin efectos/completas/móvil y vídeo de movimiento. Incluye primer plano selectivo, entorno lejano, sombras proyectadas/contacto, fuentes locales, reloj y claridad táctica. Cambios de documentación; sin implementar ni desplegar mejoras y sin acreditar pruebas nuevas del juego. Las 41 pruebas citadas siguen siendo la base del 20/10.

## Cena final D8 · auditoría Octopath — 2026-10-20

Auditoría centrada exclusivamente en `dinner`, sin modificar ejecución, mapas, partidas o despliegue. Informe completo en `docs/design/D8_DINNER_OCTOPATH_AUDIT_20261020.md`, encargo de producción en `docs/design/D8_DINNER_EXECUTION_PROMPT.md` y galería local en `output/d8-dinner-octopath-audit-20261020/index.html` (capturas reales identificadas por fecha, seis observaciones visuales y referencias del usuario; no hay un después simulado).

Base inspeccionada: grid 19×18 de 1,5 m, 318 casillas transitables, 4 difíciles, 35 objetos autorados, puerta e interacción con Anteros conservadas. Cambio de escena correcto en estado aislado en memoria; conectividad estática 318/318, sin acreditar recorrido legal completo. 41 pruebas aprobadas en cuatro archivos de campaña/paquete/cámara/movimiento. Rendimiento mostrado de 725 mallas/540 draw calls es histórico del 18/10, no medición nueva de móvil. Pendientes pruebas físicas y rendimiento sostenido.

Prioridad: composición y recorte de casa/patio, materiales y siluetas, integración de actores con luz local (actualmente conectada solo al Espejo), después ambiente, audio y tres desenlaces. Siete fases E0–E6, cada una funcional; validar en mesa integrada, no solo Playground. Recoge cámara actual continua 5°–25°, interior 10°, comparación artística a 15°, giro ±30° y WASD estable. No restaura el perfil antiguo de las capturas ni reemplaza mejoras recientes del Espejo/personajes.

## Espejo D8 · sello completo y ambiente — 2026-10-20

Corregida la lámina de cierre que dejaba ver detrás al girar: bloque de hielo cerrado de 3,35 m, base enterrada, revestimiento arqueado y unión superior a la caverna. Mantiene rotura, polvo/fragmentos y salida física a la cena tras derrotar al Reflejo. Añadidas tres bolsas de bruma baja y caídas pequeñas y espaciadas de escarcha, con reducción en combate/pantallas pequeñas y respeto a movimiento reducido. Ambiente sonoro propuesto, sin cambiar la mezcla.

Candidata aislada `runtime/d8-mirror-seal-atmosphere-20261020/{server,web}`; lanzador `scripts/review-d8-mirror.ps1`, versión predeterminada `atmosphere`, conservadas las anteriores. Mesa temporal `http://127.0.0.1:57255/dm`; galería `http://127.0.0.1:4602/gallery/`. 19 pruebas, 5.985 rayos contra la abertura, 384 comprobaciones de espacio corporal, 70 vistas anteriores y 70 finales, 16 perfiles y red DM/dos jugadores/proyector correctos. Conservadas 399 casillas, 344 difíciles y 49 peligrosas, cámaras continuas y trabajo de otros chats.

Tres regresos estables: 599 mallas, 62 texturas, 78,1043 MiB estimados. Perfiles: 120–291 llamadas, 74,33–88,97 MiB; 1080p todavía supera el objetivo orientativo de 80 MiB. Comprobación enfocada: no se repite la sesión de veinte minutos anterior ni se certifican FPS/dispositivos físicos. Pendientes aprobación artística, móvil/proyector y escucha. Servidor habitual, distribución y guardados reales intactos; sin publicación. [Informe y reproducción](docs/evidence/D8_MIRROR_SEAL_ATMOSPHERE_20261020.md).

## Espejo D8 · hielo, bóveda y salida — 2026-10-20

Implementados los cinco refinamientos solicitados: suelo sin juntas repetidas ni borde estirado en la extensión frontal; reflejos tenues de personajes sobre hielo con muestreo de nieve/luz y atlas compartidos; paredes y contrafuertes con relieve irregular; bóveda interior continua que se retira del encuadre útil; y sello de hielo con grietas, fragmentos y polvo que se abre al derrotar al Reflejo preparado. Cruzar el umbral lleva a la cena con Anteros, sin elegir desenlace ni cambiar dados, estadísticas o inventarios. El sello ocupa temporalmente tres casillas; las 399 casillas, 344 difíciles y 49 peligrosas conservan sus coordenadas.

Candidata aislada en `runtime/d8-mirror-icepass-20261020/{server,web}`. El lanzador `scripts/review-d8-mirror.ps1` usa ahora `icepass` por defecto y conserva las revisiones anteriores mediante `-Version`. Mesa de revisión `http://127.0.0.1:50722/dm`, jugador `/player`, proyector `/projector`; galería `http://127.0.0.1:4601/gallery/`. Guardados exclusivos en una carpeta temporal. No se ha sustituido `dist`, reiniciado el puerto 3000 ni publicado en GitHub; se conserva la corrección de cámara y los cambios de otros chats.

126 regresiones en 20 archivos, 8 comprobaciones finales específicas y 3 de pasos compartidos correctas; tipos, compilaciones y prueba de red DM/dos jugadores/proyector aprobados. Sello bloqueado, derrota, movimiento físico de jugador hasta la cena, independencia del segundo jugador, reconexión, guardado/restauración y reinicio verificados. 120 cámaras, 16 perfiles y sesión automatizada de 20,69 minutos, ocho idas/vueltas y cero errores. Tres regresos de limpieza idénticos: 583 mallas, 58 texturas y 72,6877 MiB. Texturas repetidas entre 72,68 y 72,69 MiB; pico tras animaciones de 118,81 MiB, todavía sobre el presupuesto orientativo de 80 MiB. Entre 135 y 232 llamadas de dibujo en los perfiles medidos. No son FPS ni memoria total de dispositivos físicos.

Pendientes la aprobación artística y las pruebas físicas en Pixel 9a/proyector/sonido. [Informe, límites y guion de revisión](docs/evidence/D8_MIRROR_ICEPASS_20261020.md), [capturas y secuencia de salida](output/d8-mirror-icepass-20261020/index.html).

## Espejo · corrección de cámara vacía — 2026-10-20

Corregida la pérdida de `y` al copiar un Vector3 en `clampMirrorCameraTarget`, que invalidaba la cámara y dejaba el mapa azul pese a tener cargados los recursos. 17/17 regresiones de cámara, tipos y compilaciones cliente/servidor correctos. Revisión visual aislada con escenario visible; corrección instalada en `dist/` y distribución anterior retenida. El puerto 3000 estaba libre; el arranque automático en segundo plano fue rechazado por la revisión de permisos («blocked by policy»). Pendiente abrir `INICIAR-ONE-SHOT.cmd` y recargar el DM. Mantenimiento reforzado para conservar siempre lo funcional y aplazar carpetas generadas con servidores abiertos: 27 comprobaciones. [Causa, prueba visual y estado de arranque](docs/evidence/MIRROR_CAMERA_HEIGHT_FIX_20261020.md).

## Orden y mantenimiento de la carpeta — 2026-10-20

Retirados 12.778 archivos antiguos: 5,29 GB (4,92 GiB) de respaldos intermedios, compilaciones, cachés y capturas sin referencias. Protegido todo lo creado o modificado desde el 13/10/2026: 60.312 archivos recientes conservados. Comparación SHA-256 de 3.009 fuentes/recursos sin diferencias al terminar el borrado; guardados, distribución instalada, originales, prototipos y servidores abiertos conservados. Cinco hitos ZIP y parches posteriores retenidos. `MANTENIMIENTO.cmd` permite revisar o repetir con un mínimo de siete días; 26 comprobaciones aisladas correctas y revisión posterior sin residuos adicionales propuestos. DM/jugador/proyector responden 200. [Resultado y registros](docs/evidence/WORKSPACE_CLEANUP_20261020.md), [guía de carpetas y mantenimiento](docs/WORKSPACE_MAINTENANCE.md).

## Espejo D8 · diez puntos de acabado — 2026-10-20

Implementados en orden los diez puntos de la revisión: terreno con relieve y materiales diferenciados, fondo en capas, primer plano, plataforma ritual del espejo, composición lateral, luz focal y rebote frío, nieve/escarcha, bóveda rota con volumen, huellas de magia y acabado conjunto. Cuatro capturas y una compilación funcional por punto. Módulo `mirror-art-direction.ts`, dos albedos originales de ImageGen con prompts/procedencia y exportaciones optimizadas; navegación de 399 casillas, 344 difíciles y 49 peligrosas conservada.

Candidata ejecutable en `runtime/d8-mirror-artpass-20261019/{server,web}`. `./scripts/review-d8-mirror.ps1` usa esta revisión por defecto; `-Version refinement`/`candidate` conservan las anteriores. Sesión aislada actual: `http://127.0.0.1:57177/dm`; galería: `http://127.0.0.1:4598/gallery/`. La mesa habitual y la revisión abierta en 59822 siguen intactas.

78/78 regresiones, paquete Playground, tipos, compilaciones y prueba de red DM/dos jugadores/proyector correctos. 120 vistas y 16 perfiles sin errores. Sesión automatizada nueva de 20,15 minutos, catorce idas/vueltas y cero errores; memoria repetida 72,34–72,35 MiB. Tres regresos de limpieza estables: 553 mallas, 57 texturas, 69,94 MiB. Recorrido de 387 estados autoritativos hasta el perímetro, sin daño.

Carga limpia: 68,13–78,40 MiB estimados. El pico tras secuencia alcanza 137,65 MiB y el máximo es de 359 llamadas de dibujo: los guardarraíles transitorios/rendimiento siguen pendientes de validación y ajuste en el dispositivo objetivo. No se certifican FPS ni aceptación artística por capturas. [Informe, pruebas físicas pendientes y materiales](docs/evidence/D8_MIRROR_ARTPASS_20261020.md), [comparativas y vídeos](output/d8-mirror-artpass-20261019/index.html).

## Espejo D8 · correcciones de la revisión visual — 2026-10-19

Segunda candidata: pedestal duplicado eliminado, una galería interior profunda, paredes continuas de hielo de 26 m, bóvedas y estalactitas, vetas/normal de hielo y contacto irregular con el suelo. La oclusión usa triángulos y volumen corporal; conserva 32 % de visibilidad cuando hay un obstáculo real. Se retiran sombras de objetos sustituidos.

Por petición del usuario, el perímetro irregular añade 139 casillas: 399 transitables, 344 difíciles y los mismos 49 peligros. Origen e índices anteriores, espejo, llegadas y estadísticas preservados. Guardado/carga en casillas nuevas y migración del formato más antiguo comprobados. 78/78 pruebas en 15 archivos; integración de red, reconexión, guardados y autoload PASS. Compilaciones aisladas en `runtime/d8-mirror-refinement`; el lanzador `./scripts/review-d8-mirror.ps1` usa esta revisión por defecto y admite `-Version candidate` para la anterior.

[Informe de correcciones y aceptación pendiente](docs/evidence/D8_MIRROR_REFINEMENT_20261019.md). [Comparativas, recorridos y medidas](output/d8-mirror-refinement-20261019/index.html). La sesión de veinte minutos anterior es histórica; aprobación artística y dispositivos físicos siguen pendientes. La mesa habitual y sus guardados se conservan.

120 vistas finales y 16 casos de luz/pantalla sin errores. Carga limpia: 54,31–62,42 MiB estimados; pico tras animaciones/recorrido: 133,68 MiB, presupuesto transitorio pendiente. Tres idas/vueltas café–Espejo vuelven a 422 mallas, 46 texturas y 56,53 MiB estables.

## Espejo D8 · candidata HD-2D E0–E6 — 2026-10-19

Implementada la presentación exclusiva de `mirror`: envolvente estratificada y primer plano selectivo, materiales propios, espejo ornamentado local, luz interior y respuesta opcional de personajes, bruma/partículas por calidad, secuencia sincronizada con el servidor y mezcla temporal. Navegación, 260 casillas transitables, 205 difíciles, 49 peligrosas, estadísticas, interacción y reglas conservadas; dados y decisiones en mesa. Corregido en esta escena un shader exterior duplicado al asignar/reconectar personaje.

Candidata aislada en `runtime/d8-mirror-candidate`, sin tocar la distribución ni guardados reales. Abrir con `./scripts/review-d8-mirror.ps1` (añadir `-Build` para reconstruir). Base 44/44, regresiones 74/74, comprobación final dirigida 10/10; integración DM/dos jugadores/proyector, reconexión sin repetir aparición, restauración y autoload PASS. Matriz de 75 vistas y sesión registrada de 20,47 minutos; tres regresos con 45 texturas/58,56 MiB estables. El pico transitorio después de animaciones alcanza 111,49 MiB; no equivale a una prueba de FPS ni certifica el Pixel físico.

[Informe, límites y aceptación física/artística pendiente](docs/evidence/D8_MIRROR_CANDIDATE_20261019.md). [Evidencias y comparativa](output/d8-mirror-candidate-20261018/index.html). E6 técnica tiene candidata ejecutable; la aprobación artística, escucha real, proyector y sesión física continua siguen pendientes. No se ha publicado en GitHub. Cambios previos de cámara/Retiro y auditoría original preservados.

## Cámara compartida y frente del Retiro — 2026-10-17

El giro horizontal 0° del Retiro del Dragón queda centrado a 90° de Babylon: la cámara mira desde la playa hacia el acantilado. Los encuadres por zona y combate usan el mismo frente. La casilla «Compartir cámara con la mesa» publica además zoom y encuadre del DM al proyector; desmarcada, el proyector recupera su encuadre propio y el zoom personal del jugador permanece independiente. Pruebas dirigidas 24/24, humo de red D8/Stormwreck con reconexión y validación del encuadre PASS; typecheck y compilaciones cliente/servidor correctos. Mesa D8 local reiniciada; estado `ready`, página DM y recursos 200.

## Retiro del Dragón · Profundidad Escénica 2.5D y Composición de Cámara — 2026-10-17

Incorporado el sistema integral de siete capas visuales ([retreat-scenic-depth.ts](campaigns/stormwreck-isle/public/retreat-scenic-depth.ts)) y presets de encuadre inmersivo 2.5D ([retreat-camera-composition.ts](campaigns/stormwreck-isle/public/retreat-camera-composition.ts)). Capa 1 de primer plano con atenuación dinámica por proximidad; Capa 2 con máxima nitidez de zona jugable; Capa 3 con zócalos de basalto descendiendo hasta el fondo marino (-1 m a -5 m) y 10 arrecifes sumergidos que reflejan las caídas de 9 a 27 m; Capa 4 con cabos oriental y occidental y farallones; Capa 5 con 4 picos volcánicos distantes de la Isla de las Tempestades (300-500 m) con perspectiva aérea; Capa 6 con anillo de horizonte continuo 360° a 920 m de diámetro; Capa 7 con bruma marina cuadrática graduada y oscilación ambiental.
Encuadres optimizados para Playa, A1, A2, A3, A4 y A5 respetando 20°–40° vertical (con 15° interior), ±30° horizontal y combate automático a 40°. 4.828 posiciones verificadas contra sólidos del GLB con 0 colisiones en todas las fases. Pruebas dirigidas 9/9 PASS, typecheck cliente/servidor y compilaciones Vite y TypeScript completadas con éxito. [Documentación FASE_3A](prototypes/retreat-refinement/FASE_3A.md) y [FASE_3B](prototypes/retreat-refinement/FASE_3B.md).

## Controles de giro compactos — 2026-10-17

La consola DM muestra horizontal y vertical juntos en dos columnas iguales, con botones en ambos ejes y el ángulo entre ellos. Retirado el deslizador vertical; bajar/subir y F/R usan el mismo ajuste por pasos y desactivan el botón al alcanzar cada límite. Se conserva la publicación de giro e inclinación. Tipos y build cliente correctos; comprobados en una mesa aislada los clics, límites 15°/35° y disposición real de 410 px. Cliente publicado sin reiniciar la mesa; [captura](output/camera-buttons-20261017/camera-buttons.png).

## Inclinación compartida con el proyector — 2026-10-17

La casilla DM comparte ahora giro e inclinación, incluidos R/F, control vertical y presets de zona/combate. El proyector respeta el ángulo del DM mientras se comparte y lo recupera al reconectar; desactivar libera ambos ejes. 15 pruebas dirigidas, integración de cámara D8/Stormwreck, tipos y compilaciones correctos. Mesa D8 del puerto 3000 guardada, actualizada y reiniciada; estado recuperado en `ready`. [Detalle y límites](docs/evidence/SHARED_CAMERA_TILT_20261017.md).

## Retiro del Dragón · mejora integral en ocho fases — 2026-10-16

Ocho fases construidas y verificadas sobre la escena existente. Las 128 mallas originales de A1, sus seis celdas y todo el mobiliario conservan geometría y matrices exactas; escala 1,5 m, 850 posiciones, conexiones, puertas, PNJ y narrativa intactos. Interiores integrados, arquitectura revisada, continuidad rocosa, materiales PBR compartidos, jardines, sombras globales y costa mejorados. Perfil propio del Retiro 20°/30°/40°, combate inicial a 40° y gesto del jugador compatible; D8 mantiene sus valores anteriores.

65 pruebas dirigidas, 936 encuadres entre las ocho fases, 1.514 pasos del servidor, 4.828 posiciones contra el GLB final y dos recorridos en pantalla con 1.413 comprobaciones de apoyo/visibilidad, sin fallos. Clientes DM/jugador/proyector y 23 recursos HTTP comprobados. Medición Intel UHD: 23,4 FPS conjunto, 40,3 comedor, 33,9 templo; la vista general requiere más perfilado para buscar mayor frecuencia.

Fuentes y ocho comparativas en [informe de la mejora](prototypes/retreat-refinement/INFORME_FINAL.md). Visor compilado 4568 y mesa de revisión 4591 con guardados separados. La mesa habitual no se ha reiniciado. Pendientes: sesión física prolongada, destinos definitivos Pleamar/Observatorio y ampliaciones previas del palé/historial. Siguiente tarea: revisión artística y rendimiento en el equipo de juego.

## Retiro del Dragón · integración global A1–A5 — 2026-10-15

Fase 6 construida para revisión: escena `dragon-rest`, celdas reales de `camp-a1-rooms` conservadas, módulos Blender aprobados y conexiones a 9/15/18/27 m. Navegación de 1,5 m con 850 direcciones conectadas, puertas A2/A4 y pasos físicos para los pasillos estrechos. Se reservan los márgenes rocosos ante las fachadas de A1 sin mover sus habitaciones. 1.514 pasos del servidor, 46.490 muestras frente a cajas y 4.828 posiciones contrastadas con los triángulos sólidos del GLB, sin colisiones a cuatro alturas corporales. Recorrido final compilado: 1.424 comprobaciones de suelo, cero pérdidas de apoyo y cero oclusiones. Cuadrícula independiente, puntos de interacción discretos y decisiones/dados manuales. GLB completo y fuente Blender disponibles; mesa de prueba separada de los guardados habituales.

27/27 pruebas dirigidas; compilaciones cliente/servidor y visor comprobadas. La pasada general del historial mantiene dos expectativas fallidas de cantidad/rotación; la migración del Retiro conserva estados. Destinos Pleamar/Observatorio preparados a falta de mapas definitivos; animación de pasajeros del palé y prueba física prolongada en móvil/proyector pendientes. Revisar conceptualmente el conjunto antes de activar en la mesa habitual. [Informe y fuentes](prototypes/retreat-global/GLOBAL_REPORT.md).


## Frentes de Stormwreck, pecio y campamentos — 2026-10-14

Retiro del Dragón inicia mirando desde la playa hacia el camino y las puertas del monasterio, con el límite habitual de ±30° alrededor de ese frente. En el Pecio, al seguir o seleccionar un personaje dentro de C6/C7, el frente orbital gira suavemente al lado oeste donde están sus puertas; C4/C5 conservan el lado este. Las tiendas de la playa, observatorio, refugio y bosque orientan sus entradas hacia la cámara inicial de cada campamento, para que sean visibles dentro del arco limitado. Coordenadas de movimiento, terreno y objetos no cambian.

## Inclinación vertical 15° / 25° / 35° — 2026-10-14

D8 y Stormwreck comparten límites de 15°–35° y tres posiciones de inclinación (15°, 25°, 35°) para DM y jugador: R/F, deslizador DM y gesto vertical con dos dedos. El gesto acumula desplazamiento y la cámara interpola suavemente. Interiores automáticos a 15°, exteriores a 25°; combate conserva el encuadre elevado a 35°. Se mantiene el zoom del jugador al cruzar puertas.

## Zoom del jugador al cruzar interiores — 2026-10-14

La exploración del jugador conserva su escala ortográfica al entrar y salir de edificios en D8 y Stormwreck: el cambio de tamaño de zona y la inclinación automática ya no recalculan el zoom. La base se fija por escena; los límites de la nueva zona se aplican al ajuste manual sin saltar desde un zoom heredado fuera de rango. Se mantienen los presets verticales 20°/40° y el encuadre de combate y vista general.

## D8 · frente de puertas corregido — 2026-10-13

Las seis escenas centran el giro limitado mirando perpendicularmente a las fachadas, hacia +Z; corregidos el redondeo diagonal y el lado opuesto de Cena. Preferencias horizontales D8 separadas como `doors-v3`. 43 pruebas y seis vistas reales aprobadas; tipos y compilación PASS. Cliente actualizado en la mesa de puerto 3000, con páginas anteriores conservadas; recargar DM primero y luego jugador/proyector. [Registro y capturas](docs/evidence/D8_CAMERA_FRONT_20261013.md).

## Cámara limitada D8 y Stormwreck — 2026-10-13

Perfil ortográfico compartido de 20°–40° vertical y ±30° horizontal alrededor del frente propio de cada mapa. Q/E avanzan 15°, dos dedos ajustan giro/inclinación y la pinza controla un zoom limitado por escena, zona y pantalla. R/F también disponibles en DM. Entrar/salir de interiores aplica 20°/40° una vez y admite ajuste manual posterior. Combate aplica 40°, frente inicial y encuadre del encuentro; al terminar recupera las preferencias de exploración. Retirado el preset de 55° del Pecio y adaptado su recorte de paredes/techos a la vista baja, conservando ocultos los otros camarotes.

64 pruebas dirigidas aprobadas; tipos cliente/servidor/visor y compilaciones de cliente/servidor PASS. Visor real: 208 comprobaciones en los 13 mapas y 8 adicionales en C4–C7, sin fallos registrados; 38 capturas. La pasada general precede a los últimos ajustes de encuadre colectivo y recorte, comprobados después en interiores. Integración D8 con orientación compartida firmada/fraccionaria y persistencia PASS. No se ha repetido la suite completa ni probado móvil/proyector físicos; la mesa real conserva su servidor abierto. [Informe, registros y activación](docs/evidence/CAMERA_POLICY_20261013.md).

## Guardado, carga y actualizaciones seguras — 2026-10-13

Auditados Stormwreck/campamentos y D8. El cierre exige guardar antes de confirmar;
si falla conserva la mesa. Actualizaciones preparadas fuera de `dist`, originales
archivados al migrar, incompatibilidades futuras bloqueadas, historial protegido
de copias del reloj y aviso DM al recuperar un respaldo. Jugador/proyector
recargan tras reinicio; arte/audio revalidados. 48 pruebas dirigidas, seis pruebas
del lanzador e integraciones aisladas de Stormwreck y D8 superadas. También
corregido el cierre con descargas de arte/audio pendientes. No se interrumpió la
mesa real. [Evidencia, comprobaciones finales y límites](docs/evidence/SAVE_UPDATE_AUDIT_20261013.md).


## Cuadrícula táctica configurable — 2026-10-13

La línea inicial ahora es más tenue. DM y Jugador pueden elegir transparencia,
grosor y color fijo o contraste claro/oscuro por casilla; los mapas ilustrados
muestrean el suelo una sola vez por escena. Las preferencias se conservan en
cada dispositivo y son independientes por interfaz. No cambian movimiento,
colisiones ni estado de campaña. 21 pruebas dirigidas y typecheck de cliente
superados; build de 2.213 módulos y candidata aislada en el puerto 3002. Falta
validar en Pixel 9a, MSI y proyector físico. [Registro de aceptación](docs/evidence/GRID_SETTINGS_20261013.md).

## Campamentos · camino, reloj y clima V1.4.8 — 2026-10-12

Camino A1 prolongado con barreras, cuerda de seguridad y vegetación irregular.
Laterales de celdas conservados desde el frente; Astalagan esculpido con velas.
Clima y reloj en DM y móvil: oleaje separado de inundación, reglas consultables,
pausas y cambios de hora corregidos; selección de audio por nombres exactos.
132 pruebas dirigidas y 13 comprobaciones adicionales; recorrido conectado de
705 pasos y 120 interacciones. Candidata separada en 4494, galería en 4492.
[Registro y límites](docs/evidence/CAMPS_CLIMATE_20261012.md).

## Pecio · cofa y nido orgánico — 2026-10-12

Canasta tridimensional con ramas entrelazadas, fibras, lona desgarrada, huesos,
pelo y plumas. Tesoro canónico conservado por piezas; encuadre centrado y
barandilla separada del tejido. Se corrigió el descenso automático al pisar
P10: el jugador puede explorar toda la cofa y bajar mediante una acción.
62 pruebas superadas, 44 pasos conectados por las diez casillas, cinco piezas
recogidas y persistidas, 19 vistas reales sin errores. Cliente y servidor
compilados. No se reinició la mesa real ni se modificó el resto del barco.
[Registro y límites](docs/evidence/PECIO_NEST_20261012.md).

## Pecio · sombras, clima y detalle — candidata visual, 2026-10-12

Sombras compartidas con campamentos, reflejo planar real de objetos, algas y
restos de cubierta, mobiliario deteriorado y huesos con erosión/relieve. Nido
ampliado, mástil íntegro levemente inclinado y separado en tramos para evitar
su desaparición completa. Cámara interior gradual que supera techos vecinos
sin descubrir sus camarotes. Lluvia/humedad/nieve según clima autoritativo,
interiores protegidos y espuma/spray de contacto en la barca.

Subir a la cofa solicita Atletismo CD 10 al DM (adaptación opcional, sin dados,
caída ni daño automáticos); el descenso conserva su movimiento gradual libre.
Prueba conectada: **241 pasos**, dos jugadores y proyector, C1–C9, puertas,
natación/buceo, CD fallida/superada y persistencia. Una segunda prueba confirma
la acción contextual del jugador, descenso sin CD y guardado. No se reinició
la mesa real. M5 conserva aceptación artística y M7 dispositivos/audio físicos.
Suite de 633 pruebas superada y 22 regresiones dirigidas finales de cámara,
oclusiones/velas, protocolo y cofa. Visor: 112 capturas, 106 diagnósticos listos
sin errores, más reproducción visual del recorrido y escalada.
[Cambios, capturas y comprobaciones](docs/evidence/PECIO_ATMOSPHERE_20261012.md).

## Reloj global, iluminación y clima — candidata técnica, 2026-10-12

El servidor mantiene un reloj de campaña único, visible y sincronizado para DM,
jugadores y proyector. Exploración a escala real; combate detenido con seis
segundos al cerrar cada asalto; descansos y rutas avanzan el tiempo explícito.
El estado del reloj y el clima por escena se guarda y se recupera con la campaña.
El clima calcula nieve, espesor, deshielo, humedad, charcos, niebla e inundación;
la capa visual no cambia reglas por sí sola. El terreno nevado solo se considera
difícil si alcanza el umbral y el DM activa esa decisión.

Tipos, build de cliente/servidor y pruebas específicas pasan. En la suite global
concurrente hubo siete fallos en seis archivos: cinco límites de tiempo de
render y dos aserciones de arte ajenas al reloj. Los cinco renderes pasan con
un worker aislado. La integración aislada llega a la vuelta de C2
y queda pendiente por un timeout de movimiento. Móvil, MSI y proyector físicos
pendientes. La candidata está iniciada en el puerto 3001 con guardados de
prueba separados; la mesa del puerto 3000 conserva su proceso. Evidencia:
[reloj y clima](docs/evidence/GAME_CLOCK_CLIMATE_20261012.md).

## Cinco campamentos — correcciones V1.4.7, 2026-10-12

Muebles A1 redistribuidos, Astalagan hacia el mar con velas, continuidad del
acantilado y postes apoyados. Tiendas integradas con el suelo, cristales
texturizados con luz tenue, fauna con reloj de pose/movimiento y vida ambiental.
Sombras de contacto, de tiendas y proyección dinámica básica de personajes.
Prueba conectada: 680 pasos, 120 interacciones, tres jugadores y proyector.
Registro: [CAMPS_POLISH_20261011](docs/evidence/CAMPS_POLISH_20261011.md).
Capturas y compilación en `output/camps-polish-20261011`.

## Cinco campamentos — correcciones V1.4.6, 2026-10-11

Brasas en las cinco hogueras; luces apagadas de día, nieve acumulada,
humedad, lluvia que reduce/apaga el fuego y leña animada con la acción del
jugador. Recorte de árboles completos y estructuras de tiendas, entradas
orientadas hacia la hoguera, arroyo fuera de las tiendas, prolongado entre
la arboleda y con corriente. Sombras del sol/luna y de una fuente cálida
cercana, con caché y perfil compacto.

Comprobación conectada: 681 pasos y 120 interacciones, tres jugadores y
proyector; descanso, interrupciones, guardado y reconexión correctos.
Registro: [CAMPS_WEATHER_20261011](docs/evidence/CAMPS_WEATHER_20261011.md).
Evidencia nueva en `output/camps-weather-20261011`. La acumulación y calor
son ambientación local; el siguiente ensayo es con dispositivos físicos.

## Cinco campamentos — detalle V1.4.5, 2026-10-11

Pasada sobre A1, bosque, playa, observatorio y refugio: roca con relieve y
estratos, montaña A1 cerrada, recorte de sus particiones al ocupar una celda,
estanterías y muebles diferenciados, tejidos, herrajes y utensilios. Más
variedad vegetal y fondo arbolado, sendero/arroyo orgánicos, bote detallado,
espuma transparente, fuego de partículas, aurora plegada y pozas húmedas.
Cuadrícula con transparencia efectiva en campamentos. Luces limitadas a cada
interior; piezas de interacción y navegación autoritativa conservadas.

110 capturas antes, 120 después y 19 de perfiles de dispositivo; 90 muestras
exteriores listas. Bosque con unos 120.000 vértices frente a 199.000 anteriores.
Recorrido aislado: 705 pasos y 120 interacciones, DM, tres jugadores y proyector,
descanso e interrupciones, guardar/reconectar, sin beneficios automáticos.
Novedades V1.4.5 comprobadas al iniciar la interfaz compilada. La versión entra
con el inicio habitual; la mesa del puerto 3000 conserva su partida.

60/60 pruebas dirigidas únicas en nueve archivos, tipos y compilaciones PASS.
La ejecución conectada final comprueba también la descarga completa de 19
recursos. Interfaz real: zoom, WASD, actividad de hoguera y descanso en cinco
acciones del DM conservando PG. Queda la revisión física de móvil, proyector
y mezcla de audio. La prueba de puerta D8 V48 presenta una discrepancia
de estado inicial, documentada aparte del módulo. Evidencia y límites:
[Campamentos · detalle](docs/evidence/CAMPS_DETAIL_20261011.md).

## Rosa de los Vientos — detalle, natación y buceo, 2026-10-11

Corregidas las capturas: cuenco orgánico del nido, timón y soportes en C3,
cráneo/mandíbulas/costillas de dragón, triangulación de la brecha y revelado
interior, entrada P16 con descenso temporizado, cierre de márgenes C8/C9 y
fondos de escaleras. Muebles conservan contenido canónico y reciben acabado
de madera/telas. Llegada al mar desde el lado abierto, sin restringir giros
ni alterar cámara compartida. Guardados v5 reanclan solo el timón montado.
Mástil y jarcias se atenúan únicamente cuando ocultan la ficha, recuperando
su opacidad desde el lado libre; comprobado en la cofa sin cambiar colisiones.

Tabla de acabado aplicada al pecio: contacto/AO analítico y mapas estáticos
UV2, multiescala, manchas, color y filtrado. No son GI/SSAO ni luces nuevas.
**535/535 pruebas, 72 archivos**, tipos y compilaciones PASS; **239 pasos**,
dos jugadores, proyector, P16, cofa, puertas y guardar/restaurar PASS.
Navegador: **69 capturas estáticas, 61 diagnósticos sin errores ni recursos
pendientes** y recorrido real reproducido con 14 capturas de movimiento.

Mesa real intacta; inicio habitual recompila. Sigue abierta la aceptación
artística de M5 y el ensayo físico móvil/proyector/audio M7. No se afirma
perfección ni equivalencia con la ilustración de referencia. Evidencia:
[Detalle y buceo del pecio](docs/evidence/PECIO_DETAIL_20261010.md).

## Rosa de los Vientos — contraste canónico y ajuste integrado, 2026-10-10

PDF capítulo 3 y mapa 4 auditados antes de cambiar arquitectura. C4/C5 quedan
bajo C3 y C6/C7 bajo C2, con paredes dentro del casco y cubierta superior
oculta solo al entrar en su estancia. Perfil reducido a 63 × 21,1 m y escora
de 0,86° compartidos por geometría/navegación, sin cambiar el grid de 1,5 m.
Escaleras y eje C4/C8/C9 ajustados; guardados migran a versión 4 conservando
inventario, estados, secretos y botín. Cofa con nido completo; velas realmente
desgarradas, cabos caídos, deterioro localizado y apoyos de hueso/arrecife.
Agua C8 visible a 15–45 cm, C9 sumergida con burbujas/peces/cáusticas y sin
luz solar residual; antorchas apagadas, retrato C6 mirando al interior y
mezcla sonora local por planta sin alterar controles de audio del DM.

**528/528 pruebas, 71 archivos**, tipos y builds cliente/servidor PASS.
Prueba aislada de **224 pasos con dos jugadores y proyector**: C1–C9, puertas,
foco, privacidad, cofa y guardar/reiniciar. Navegador: 26 capturas estáticas,
19 diagnósticos sin errores y reproducción completa del recorrido observada.
Mesa real no reiniciada ni modificada. El inicio habitual compila al arrancar.

M5 sigue como candidata con aceptación artística abierta. La escala ampliada
y cofa centrada no son una reproducción literal del mapa/PDF; falta ensayo
prolongado móvil/proyector y escucha física del audio. Evidencia y límites:
[Contraste canónico del pecio](docs/evidence/PECIO_CANON_20261010.md).

## Pecio completo — reconstrucción visual 3D, 2026-10-09

C1–C9, cofa y entorno tienen una reconstrucción integrada por capas, dentro
del mismo barco lógico. Perfil naval compartido entre geometría y navegación,
casco curvo, niveles/escaleras físicos, daños asimétricos y arrecife de apoyo;
océano continuo animado, madera húmeda, techos cerrados por habitación,
mobiliario canónico a escala, interiores inundados y luz portada. P01/P10
escalan con trayectoria temporizada; no se duplican ni teletransportan fichas.

Cámara y recorte interiores retiran techo, pared/hoja delantera y aparejos
que obstruyen; el mobiliario delante del ocupante se atenúa sin cambiar
colisiones. Antorchas apagadas/recogibles y barca abierta opaca en el agua.
Guardados válidos se conservan; se recolocan solo las celdas ahora inválidas.

Prueba aislada: 202 pasos, dos jugadores y proyector, C1–C9, cuatro puertas,
visibilidad individual, cofa, foco y guardar/reiniciar. Navegador: 26 capturas,
19 diagnósticos sin errores. Suite general **521/521, 69 archivos** y tipos/build
superados. Evidencia y límites:
[Reconstrucción del pecio](docs/evidence/PECIO_EXTERIOR_REBUILD_20261008.md).
La aceptación artística y el rendimiento sostenido móvil/proyector siguen
abiertos; no se declara perfección ni paridad con la ilustración de referencia.
La mesa real no se ha reiniciado. `INICIAR.cmd` actualiza al próximo arranque.

## Biblioteca reutilizable de interacciones — 2026-10-08

Implementado registro por funciones de piezas reales, reloj común y articulación
procedural 2,5D. Conectados todos los puntos de los cinco campamentos: páginas y
libro, símbolo, ganzúas, mantas/almohadas/hamacas, solapas/ataduras, cuchara/olla,
leños/llamas, farol/cuerda, tela del asiento y tapa persistente del baúl. Sin
duplicar accesorios cuando hay piezas conectadas. Libro, símbolo y una ganzúa
se recogen y regresan; interrupción restaura el objeto y no repite la acción.

Puntos de uso junto al mobiliario: A1 deja de usar la entrada como contacto de
cama; exteriores separan lecho y puerta de tienda. Datos opcionales `activities`
permiten reutilizar con futuros personajes sin depender de sus IDs. No cambian
grid, colisiones, recursos ni beneficios de descanso. La mesa real sigue intacta.

Guía de conexión y límites: [Biblioteca](docs/REUSABLE_INTERACTION_ANIMATIONS.md).
Queda la aceptación artística de las manos/poses PNG y crear vistas dibujadas
que no existan en los originales; no se presenta esto como un rig 3D terminado.

## Requisito de cierre: animaciones emparejadas — 2026-10-08

El usuario exige que todas las acciones creadas animen tanto a cada personaje
participante como al objeto real con el que interactúa. Un botón funcional,
un VFX aislado o una inclinación de una pose estática no cierran ese trabajo.
Ambas animaciones deben compartir inicio, contacto, respuesta y finalización,
orientación respecto a la cámara, escala, oclusión y cancelación coherente.

Auditoría inicial (anterior a la biblioteca descrita arriba): existen gestos, poses reutilizadas y accesorios
procedurales, pero falta completar la respuesta de varios objetos reales.
En A1 el controlador visual todavía ignora el historial de interacciones.
El baúl exterior ya anima su tapa; esto no acredita todas las demás acciones.
Los efectos actuales de manta/libro/herramientas no sustituyen la animación
del mobiliario/equipo existente ni una secuencia de manos adecuada.
Cobertura y criterios pendientes:
[Informe](docs/evidence/ACTORS_CAMPS_AUDIT_20261007.md#requisito-de-animacion-emparejada--seguimiento-2026-10-08).

## Personajes y actividades de campamento — 2026-10-07

Stormwreck: escala física calibrada, pies según alfa visible, asientos en el
banco real, retratos PNJ reducidos y cámara inicial desde el lado abierto.
D8 y Stormwreck: filtrado de PNG, lienzo sin submuestreo y «Detalle/Conjunto».
Once actividades de ambiente con poses, gestos y accesorios animados,
proximidad/propiedad autoritativas, cancelación al moverse o combatir y
baúles persistentes aunque el historial se llene. Sin beneficios de descanso
ni consumos automáticos. Se preserva el trabajo paralelo de campamentos.

Verificación: **484/484 pruebas**, tipos y build; integración aislada de cinco
campamentos con DM, proyector y tres jugadores: **643 pasos, 116 interacciones**,
guardado y reconexión. La mesa del puerto 3000 no se ha reiniciado.
Stormwreck: 224 encuadres finales con todas las fichas y recursos listos.
Trece vistas iniciales completas verificadas entre ambas campañas. Pendiente:
repetir las métricas completas de D8 tras corregir la espera del visor de pruebas;
su repetición anterior quedó bloqueada. No afecta a las actividades verificadas.
Detalle y límites de los originales PNG/SVG:
[Informe](docs/evidence/ACTORS_CAMPS_AUDIT_20261007.md).

## Campamentos — acabado y jugabilidad V1.4.4, 2026-10-07

Las cinco escenas tienen ambientación propia, texturas, roca orgánica, vegetación,
tiendas cerradas con corte al entrar, equipo personal, baúles y asientos con pose.
A1 conserva sus seis celdas canónicas y sus luces limitadas a cada interior;
el bosque conserva los animales fuera del grid y anima la locomoción al aparecer.
Las novedades V1.4.4 se muestran al primer acceso del DM.

La última pasada añade desgaste de suelo, pozas orgánicas, estratos y grupos
vegetales variados, y permite al suelo táctico recibir las sombras del decorado.
Galería de 80 vistas exteriores y 18 interiores; interfaz de jugador comprobada
a 390 × 844 y 844 × 390. Capturas, métricas y límites detallados en el informe.

Verificación: **469/469 pruebas generales**, **15/15 específicas**, tipos y build
correctos. Integración aislada con DM, proyector y tres jugadores: **554 pasos,
38 interacciones**, colisiones, descanso, guardado y reconexión. La partida del
puerto 3000 y el mapa principal del Retiro se conservan. Visor y galería en 4482;
VTT de revisión en 4485. Informe: [Campamentos](docs/evidence/CAMPS_FINAL_20261007.md).
La medición en teléfono/proyector físicos y la aceptación artística/auditiva final
del usuario siguen siendo verificaciones propias de esos dispositivos.

## D8 — correcciones V49, 2026-10-06

Aplicadas las 22 correcciones: cabaña Fritz cerrada con vegetación exterior y puerta en el sendero; Café medieval completo, ventanas con huecos y cristal; cubierta del templo y casa de Cena accesible. Puertas jugables articuladas e interactivas, ocupación de PNJ y llegadas separadas. Cámara interior suave a 38° y regreso al encuadre exterior, paredes/muebles atenuados sin alterar colisiones. Agua ondulante, lluvia/nieve progresivas por intensidad y tiempo, farolas y luz solar por hora, niños junto a vaca con cuerda y reflejo centrado con aparición mágica.

Movimiento enlazado con búfer visual de 80 ms, tolerancia a pausas de entrada y deslizamiento por paredes; cachés de texturas/hoja/mochila, decorado agrupado, sombras y efectos de render acotados. Rueda con etiquetas completas, iconos y regreso cercano; paginación móvil corregida, cuatro categorías comprobadas a 390×844 y 844×390. Aviso de mapa en esquina, configurable 3–25 segundos.

Verificación: **397/397 pruebas**, 58 archivos; tipos, compilación y payload V49 PASS. Integración DM/dos jugadores/proyector y smoke de seis mapas PASS. Auditoría base de **192 vistas** sin errores, recursos pendientes ni variación de cámara; comprobaciones visuales adicionales después de los ajustes finales. V48 archivada, sin publicación GitHub ni partidas reales modificadas. El lanzador recompila al próximo arranque seguro. Detalles, capturas y límites de rendimiento/aceptación artística en el [informe V49](docs/evidence/D8_V49_REVIEW_20261006.md).

## D8 — correcciones V48, 2026-10-06

Puerta y paredes completas del café; patio ajustado; caminos con seis filas nuevas sin desplazar celdas antiguas; Cena con más patio y fachadas orientadas hacia él. Sentarse/levantarse es una acción real de jugador y DM, con poses propias, ocupación, guardado y salida al caminar o combatir. Respaldos y mesas se atenúan únicamente cuando obstruyen la visión; foco físico correcto al sentarse. Aislamiento alfa de Silverfarben y reloj monotónico para no rebobinar pasos por variaciones de latencia. Mercado con niños, vaca-sprite, cuerda y vendedor colocado en su puesto.

Clima completo en ambas consolas DM; Mesa / Clima / Sonido separados. Campos enviados independientemente para no perder cambios rápidos. Materiales exteriores mojados/nevados; precipitación excluida de interiores por cubiertas; cuatro fases de iluminación y faroles/ventanas exteriores apagados de día. Se mantiene la casilla de 1,5 m: el ajuste del café afecta al área transitable, no a su escala táctica.

Verificación final: **382/382** pruebas, tipos y builds separados PASS; integración D8 con sentarse por jugador y DM, clima compartido, espejo, desenlace, saves y reinicio; smoke de seis mapas/70 audios y regresiones de Stormwreck PASS. Pasada global de **192 vistas** y **32 adicionales del templo** con recursos listos y posiciones conservadas. Ambas pasadas registraron una pequeña variación de encuadre 0,05224 en una muestra: se conserva expresamente, sin darla por resuelta ni declarar falsamente estabilidad cero. Puerta, personaje cercano y cambios rápidos de clima de ambas consolas comprobados en navegador. Detalles y límites en el [informe V48](docs/evidence/D8_V48_REVIEW_20261006.md). No se publicaron cambios ni se tocaron las partidas reales. La aceptación artística, escucha final y prueba prolongada en el equipo de mesa siguen siendo comprobaciones humanas, no una garantía de «cero errores».

## Correcciones de mapas y clima D8 — 2026-10-05 · Playground V47

Corregidos alfa/colores, pies y profundidad nativa de fichas; continuidad durante cambio de textura de movimiento; vaca sólo como sprite; materiales continuos del exterior, abrevadero sin camino superpuesto, agua animada, estatua pétrea y luces reales. Anteros y aldeana usan poses sentadas existentes. Café/Fritz tienen cubierta; arquitectura que cruza la visión se atenúa sin alterar colisiones. Cámara D8 inicial 25°. Carteles legibles sin teletransporte y cinco pasos físicos de aproximación para viajar por los puertos existentes.

Espejo único 3D: desaparece al revelar su copia del jugador, preparada en una casilla libre no fatal antes de validar ocupación. Hielo blanco difícil; pisar azul aplica caída fatal persistente, inconsciente y fin de concentración tanto para jugador como para movimiento DM. Climatología compartida: cuatro fases del día, lluvia/nieve en tres niveles y viento, con audio existente, sincronización y saves completos.

Verificación: **371/371** pruebas, tipos/builds, integración D8 completa y smoke PASS; regresión de Stormwreck PASS. Navegador DM/jugador y móvil horizontal/vertical comprobados. Auditoría global de **192 vistas**, más **32 de Cena** tras cerrar ambos hastiales: cero errores, recursos listos, posiciones conservadas y variación de pose 0; evidencias en el [informe V47](docs/evidence/D8_MAP_CORRECTIONS_20261005.md). F1–F5 cerradas técnicamente. No confundir aceptación artística/escucha/hardware físico, aún pendientes, con cierre de pruebas técnicas. Sin GitHub ni saves reales modificados; el lanzador recompila en el próximo arranque seguro.

## Revisión integral final D8 — 2026-10-05

Se corrigieron el último impacto perdido al cerrar automáticamente combate, privacidad de acciones del DM y caída/desvanecimiento de criaturas ya derrotadas sin devolverlas al mundo lógico. La distribución recomendada prioriza tablero y consola contextual; QR, orientación y herramientas de prueba quedan plegables. DM, jugador y proyector muestran preparación del escenario y comparten recuperación de carga. La iniciativa deja de tapar el menú de hoja/mochila. Las ayudas de estados leen CD, rasgos y PG reales; el resumen de salto deja de estrechar la hoja móvil. Cargar conserva propietarios conectados y el mensaje de confirmación ya no promete una elección de personaje innecesaria.

Verificación: **360/360 pruebas, cero fallos**, tipos cliente/servidor y builds PASS. Integración D8 real (DM/dos jugadores/proyector, recorrido, dados, restore, diez saves y autocarga), smoke de seis mapas/70 audios e integración Stormwreck contra el servidor recién compilado PASS. En navegador se completó arco → objetivo → d20 → daño y se restauró un archivo real con escena/PG/estado/ronda/iniciativa/acción usados. Proyector sin grid, reconexión a María y vistas efectivas 390×844 / 844×390 comprobadas.

Este cierre acredita el **MVP con arbitraje DM**, no automatización universal de D&D 2024 ni ausencia de todo error posible. Continúan pendientes aceptación artística/escucha del usuario y hardware físico; preparados/conversión de fichas requieren elección, y Light/offhand/Nick/maestrías y ciertos efectos situacionales siguen guiados. No se alteraron partidas reales ni se subió a GitHub. El lanzador recompila al próximo arranque seguro. Informe, archivos y capturas: [auditoría final](docs/evidence/D8_FINAL_AUDIT_20261005.md).

## Integración medieval y pies de fichas D8 — 2026-10-05

Los caminos de Templo, Café y Mercado sustituyen las bandas rectangulares por adoquines individuales irregulares agrupados en mallas, con tonos ajustados al suelo de cada escenario. El acceso exterior del Templo tiene una silueta de terreno irregular y comparte material con la costa. El barrio reutiliza fachadas entramadas, puertas de madera con hierro, carteles colgantes y faroles medievales; el patio exterior del Café comparte el tono del pavimento próximo.

Corregido el anclaje de las fichas nativas D8: el pivote de ordenación del mapa plano enterraba parte de los pies en el suelo 3D. El render D8 usa el borde inferior del sprite como apoyo. La cuadrícula comparte el búfer de profundidad del escenario y conserva las casillas transitables y alturas autoritativas, evitando dibujarse encima de muebles o personajes. La oclusión física de columnas, paredes y puestos se mantiene.

Verificación: revisión visual de caminos y fichas en Templo, Café y Mercado, más capturas de Jardín, Espejo y Cena; auditoría de los seis mapas en 8 orientaciones × 3 inclinaciones, **144 vistas, 0 errores**, sin recursos pendientes, posiciones conservadas y variación de pose asentada 0. Pruebas focalizadas **49/49**, tipos cliente, build de producción y smoke del one-shot PASS. Informe y capturas en `output/camera-2-5d/backdrop-v43/` (carpeta histórica del visor). Estas comprobaciones no certifican todas las posiciones posibles ni el rendimiento en móvil/proyector físicos; queda la pasada manual del usuario.

## Caminos y barrio continuo D8 — 2026-10-05 · Playground V46

El Templo ya no termina en una costura rectangular: el césped del terreno Babylon continúa hasta la costa y el límite jugable queda señalado por un seto sobre zócalo de piedra, abierto en el acceso. Dos ramales se dirigen hacia Café y Mercado. Café y Mercado comparten materiales de fachadas, árboles, faroles, puestos y pavimento; desde cada tablero se insinúa el otro barrio. Cena queda encuadrada como patio de finca, con jardín, setos, casas y camino exterior. Los fondos son mallas en el mundo y giran con la cámara; no son fotografías del mapa ni amplían el grid transitable.

Los tres caminos Templo↔Café, Templo↔Mercado y Café↔Mercado usan los puertos existentes del motor, con nuevo modo genérico `road`: pisar la casilla de salida fuera de combate cambia de escena, conserva la posición individual y provoca autoguardado. El DM/proyector sigue al viajero; los demás personajes permanecen donde estaban. Las casillas de ambos extremos se comprueban como transitables. La ruta de Cena es decorativa por ahora: no se ha inventado una transición narrativa para el desenlace.

Revisión manual en navegador de Templo, Café, Mercado y Cena con la cámara inicial. Auditoría automática de 8 giros × 3 inclinaciones en cada uno: **96 vistas, 0 errores**, texturas preparadas y posiciones estables. Pruebas focalizadas de navegación, guardado, cámara y carga de escena: **34/34**; compilación cliente/servidor y smoke del one-shot PASS. Pendientes: aceptación artística del usuario y rendimiento en móvil/proyector físicos. No se añadieron activos descargados.

## Fondos y horizontes D8 — 2026-10-05 · Playground V45

Los seis biomas conservan escenario Babylon 2.5D nativo; el exterior se prolonga con materiales procedurales y geometría mundial no interactiva, no con una captura prerenderizada. La inspección por capas confirmó que el azul/negro previo lo producían los materiales exteriores demasiado oscuros en Babylon, no una capa Pixi. El Templo tiene mar texturizado y costa irregular con vegetación consistente con los árboles de la escena; Jardín, Café, Mercado y Cena conservan sus ambientes de nieve, aldea, plaza nocturna y finca. Café y Mercado reciben pavimento de transición para evitar el corte rectangular al vacío. En el Espejo se quitó una bóveda opaca que tapaba el tablero y se rodeó la arena con suelo y relieve de caverna. Las mallas de entorno no son seleccionables ni añaden colisiones/cuadrícula.

Comprobación visual manual en navegador de los seis mapas D8, Templo girado y probado a 35°/45°/50°, Espejo y plaza revisados a resolución de escritorio; cambiar D8 → Stormwreck → D8 deja los perfiles aislados. Cuadrícula limitada al tablero jugable. Tipos cliente, build de producción y 11/11 pruebas focalizadas de cámara/carga de escenas PASS. La auditoría global automática de todos los ángulos no se repitió porque se bloqueó antes; tampoco se han medido FPS ni probado proyector/móvil físicos. Cena recibió sólo integración ambiental común, no una nueva composición artística. No se descargaron assets.

## Cámara táctil del jugador — 2026-10-05

La pantalla del jugador utiliza el perfil compartido de cámara 2.5D, con inclinación inicial de 45° y límites de 35°–50°. Deslizar dos dedos hacia arriba eleva la vista; hacia abajo la baja. El desplazamiento horizontal conserva el giro de 45° y la pinza controla el zoom; Q/E siguen funcionando sin etiquetas en el mapa. Se suaviza el inicio del gesto y se procesan ambos contactos en el mismo cuadro para distinguir el deslizamiento de la pinza. Cambiar de mapa, ocultar la página o perder el foco cancela los contactos pendientes.

Verificación focalizada: **19/19** pruebas aprobadas, tipos cliente y compilación de producción PASS. Incluye reconocimiento, límites, inversión del gesto y movimientos pequeños; no se ha repetido la auditoría completa anterior ni probado el gesto en un móvil físico. Evidencia en el [informe de cámara](docs/evidence/CAMERA_2_5D_20261004.md).

## Cámara 2.5D compartida — 2026-10-04 · D8 V42

Los 13 mapas jugables Babylon de D8, Retiro, Pecio y campamentos usan cámara ortográfica 3/4, inclinación inicial 45° y límite 35°–50°. Ocho orientaciones con transición amortiguada; zoom máximo 24; foco correcto en ficha local/selección DM; modos fija, semifija y seguimiento conservados. WASD y joystick consumen el ángulo visible, incluido el giro en curso, y el teclado del DM utiliza la misma conversión de cuadrícula.

Personajes animados integrados en la profundidad del escenario, conservando sus ilustraciones y atlas. Corregidos materiales compartidos del Retiro, transparencia SVG, sombras de contacto y altura de los patios circulares del Templo D8. Cámara, fichas y Babylon se actualizan en un único reloj. Fuentes y Playground V42 validados; V41 archivada.

Verificación: tipos cliente/servidor/banco visual y build de producción PASS; pruebas focalizadas **62/62**; suite completa **337/338**, con el mismo fallo previo de resolución/publicación de combate en `engine/server/game.test.ts`. Foco y modos: **38/38** comprobaciones en Templo/Retiro, incluido el zoom local de cada personaje en los tres modos. Las 312 vistas de los 13 escenarios completan sin errores registrados, con posiciones conservadas y variación de pose asentada 0; resultados y capturas en [informe de cámara](docs/evidence/CAMERA_2_5D_20261004.md). La aplicación real de D8 confirmó cambio de mapa y giro compartido entre DM, jugador y proyector en una instancia aislada; la compilación final confirmó giro con E, zoom centrado y ausencia de la flecha del prototipo. La medición de estabilidad de pose no certifica FPS ni hardware físico; el gesto multitáctil se conserva, con prueba física pendiente. Los fondos narrativos/de práctica planos heredados no se presentan como geometría 3D convertida.

## Optimización de mapas D8 lentos — 2026-10-04

Las escenas **Temple** y **Mirror** aplican menos muestras de oclusión ambiental y una escala de render ajustada sólo para esos mapas; el resto de D8 mantiene su calidad habitual. Las comprobaciones de visibilidad de fichas ya consultan un índice espacial de la escenografía estática, siguen comprobando por separado los elementos móviles y conservan la máscara de Pixi mientras no cambie qué partes de la ficha quedan tapadas.

Verificación: build de producción Vite PASS (2.130 módulos); pruebas focalizadas PASS (**15/15 en 3 archivos**), incluidas geometría estática/móvil, máscara de oclusión y cámara D8; tipos de servidor PASS. La suite completa queda **331/332** por un fallo reproducible en `engine/server/game.test.ts` (resultado de combate), no relacionado con el render. El typecheck cliente conserva un diagnóstico en `apps/web/world.ts:1285` (`Camera.alpha`), en el cálculo de orientación anterior a este ajuste. No se midieron FPS con el MSI, un navegador físico ni el proyector; la fluidez real de Temple y Mirror sigue pendiente de esa comprobación.

## Verificación vigente — 2026-10-04 · D8 Babylon V41, navegación/oclusión/audio

Corregida la correspondencia de los seis mapas con casillas reales de 1,5 m: obstáculos del escenario, taberna efectiva, paredes finas, accesos y desniveles del templo. Grid, pies de fichas y selección consumen el terreno autoritativo; las zonas de aparición comparten una componente accesible. Los guardados D8 anteriores se migran una sola vez, conservando coordenadas legales y recursos. No se cambió el arte de Cena.

El inventario ya asigna el atlas de botín M5 sólo en Stormwreck. D8 deja de solicitar un recurso que su servidor de campaña no sirve, y el build Vite termina sin ese aviso.

La oclusión parcial utiliza el cuerpo de la ficha orientado a cámara y su pivote real, también al cambiar a pose tumbada. Corregidas repeticiones finitas de audio y conexión tardía; la selección de personaje se transmite inmediatamente a DM/proyector. Suite completa: **319/319 pruebas, 37 archivos**, tipos cliente/servidor PASS. Evidencia, integraciones y límites en [informe espacial/audio](docs/evidence/D8_SPATIAL_AUDIO_20261004.md). La herramienta de control del navegador interrumpió la revisión visual; no se afirma inspección final de los seis mapas, escucha de audio ni rendimiento físico. El lanzador recompila al próximo arranque seguro, sin cerrar la mesa real del usuario.

## Estado vigente — 2026-10-04 · D8, candidata jugable de principio a fin

Se conserva servidor autoritativo, persistencia y Babylon V40 existente. D8 ya registra cuatro componentes/resultados, inventario de misión derivado, notas y tres finales con empate/excepciones motivadas. Los primeros tres lugares pueden resolverse en cualquier orden, espejo al final. Se amplían encuentros hasta seis rosas/diez parroquianos sin curar al revelar; Reflejo genérico usa la forma del PJ ya en exploración, datos/estados propios e imitación tras original. Paredes bloquean ataques e hielo difícil consume doble movimiento.

Corregidos botones del arco tapados por la barra inferior, selección accesible de objetivo desde iniciativa, borradores DM y CA enemiga privada. Cargar conserva propietarios conectados y entrega snapshots completos a DM/dos PJ/proyector sin recargar. Se validan nuevas referencias antes de instalar saves y conservan diez puntos. Prueba real: arco→d20→crítico→daño15 aplicado una vez; red: seis escenas, cuatro componentes, final, restauración exacta, diez saves y reinicio/autocarga.

Guía DM/matriz/roadmap actualizados. Fases MVP técnicas acreditadas; no se afirma D&D2024 completo ni hardware físico/versión1. Preparados de Aoife, casos creativos, hielo frágil/bucle y vuelo se arbitran según guía; placeholder/animaciones específicas pendientes. Sin nuevos paquetes, assets externos, arte de Cena ni alteración de saves reales. Ver [informe](docs/evidence/D8_CLOSEOUT_20261004.md). Compilación en salidas aisladas: el lanzador recompila al próximo arranque seguro.

## Estado vigente — 2026-10-03 · D8 Night V35 integrado como candidata funcional

Por petición del usuario, D8 Night ya no se queda en el Playground: las seis escenas (`temple`, `garden`, `cafe`, `market`, `mirror`, `dinner`) se muestran en la mesa VTT con el render Babylon 2.5D V34 compartido como V35. La cuadrícula, las casillas transitables, los actores y objetos continúan definidos por el paquete de campaña y el servidor; la vista proyecta fichas y selección sobre el terreno. La cámara mantiene el encuadre oblicuo inicial de cada mapa y ahora ofrece giros discretos de 45°, inclinación acotada y zoom, como Stormwreck. El DM puede compartir el giro con jugadores y proyector; las preferencias locales se conservan por campaña y mapa. Los guardados D8 previos migran una vez a la nueva cuadrícula y reciben una marca de versión.

La ruta HTTP de configuración sólo publica geometría/ambiente visual saneados; `CANON`, interacciones narrativas y encuentros ocultos permanecen en el servidor. Candidata de aplicación `0.3.2-dev.7`, paquete D8 `0.3.0-dev.2`, fuente visual Playground `V35`. Este paso integra el render existente: **no crea aún texturas/escenarios nuevos ni cierra F3–F7**. Quedan para ciclos posteriores la revisión de arquitectura reutilizable y el trabajo artístico de escenarios, texturas, iluminación y VFX que ha pedido el usuario.

Verificación de `0.3.2-dev.7`: TypeScript cliente/servidor PASS; suite Vitest **214/214** PASS; build de cliente y servidor PASS; smoke aislado de D8 PASS con seis mapas, fichas, configuración sin secretos, recursos de audio, guardado privado y sincronización de giro DM→proyector; artefacto Playground V35 validado. No se ha inspeccionado esta candidata en navegador físico, Pixel 9a, MSI o proyector: confirmar inclinación y perspectiva, alineación del grid, movimiento táctil/teclado y transición de cámara entre las seis escenas con el usuario antes de aceptar visualmente. El render emplea texturas generadas por el motor existente y conserva el aviso de build del atlas M5 del Pecio, resuelta por el servidor en runtime.

## Campamentos V1.4.2 — actualización visual A1, 2026-09-27

`camp-a1-rooms` se ajusta a la planta canónica irregular: seis celdas abiertas a una plaza común, con estatua de Astalagan y hoguera. Las fachadas de piedra se ocultan al entrar en una habitación para conservar la lectura y el movimiento. La dirección añade materiales ilustrados, vegetación y detalles de fuego/ambiente; la cuadrícula, rutas, interacciones y decisiones del DM siguen separadas del arte. Verificación de esta candidata: suite completa **190/190**, typecheck cliente/servidor y build Vite aislado PASS. Aún falta la revisión del usuario en navegador/móvil/proyector físicos. La procedencia de las tres texturas originales del bosque continúa pendiente, como indica `LICENSES_AND_CREDITS.md`.

## Candidata visual de campamentos — 2026-09-26

El árbol de trabajo incorpora mejoras visuales de A1 y un primer pase del camino del bosque hacia Pleamar: materiales ilustrados para musgo, sendero y arroyo, además de vegetación y detalles de terreno. La cuadrícula, navegación y colisiones existentes se mantienen como contrato. Comprobación de esta candidata: typecheck de cliente/servidor PASS, 16 pruebas automatizadas de cámara/campamentos PASS y build aislado del cliente PASS. La aceptación visual del usuario y la revisión en móvil/proyector físicos siguen pendientes. Las tres texturas del bosque no tienen todavía una ficha de procedencia/licencia en el repositorio; consultar `LICENSES_AND_CREDITS.md`.

## Retiro del Dragón — integración 2026-09-24; repaso 2026-09-25

Escena inicial Babylon `dragon-rest` integrada desde Retiro V5.2 para *Los Dragones de la Isla de las Tempestades*. La aventura oficial se contrastó en A1–A5 (PDF, pp. 7–13). Hay superficies, colisiones, accesos, escaleras, seis celdas, puerta de A4, interacción manual de PNJ/objetos, zombis revelables por el DM y salida en barca al pecio; las salidas a Pleamar y al Observatorio están preparadas. Repaso 25/09: la guía privada del DM ya incluye el gancho del naufragio y aclara que pueden ir antes a Pleamar. La suite total actual (154/154) incluye la regresión de esta escena; los tipos de cliente/servidor y builds aislados pasan; no se ha certificado fluidez en dispositivo físico ni FPS. El timeout Vitest se amplió a 30 s porque las rutas integrales superan a veces el valor predeterminado de 5 s en Windows. El entorno actual usa Node 24.19 aunque `package.json` pide >=24.21; las verificaciones pasaron con aviso de motor. Véase [informe privado](campaigns/stormwreck-isle/private/RETREAT_INTEGRATION_20260924.md) y [roadmap](ROADMAP_V1.md).

## Estado vigente — 2026-09-25 · revisión 47 · M5: candidata técnica

El pecio continúa siendo un único escenario Babylon `wreck-ship`. M5 integra mar navegable y fondo escénico separado, espuma/oleaje, agua interior, cubierta/casco/arrecife texturizados, props con estados e iconos de botín, viento/lluvia/niebla/luces. La revisión 47 añade `deck-planks-art06.png`, cuadrícula de cubierta atenuada, rejillas/cabos decorativos y mantas en camarotes. La barca admite piloto y pasajeros, navegación casilla a casilla en mar, desembarco, persistencia y relevo de piloto. La candidata fue inspeccionada en navegador aislado; **no se afirma equivalencia con la referencia pictórica ni aprobación visual**. Falta opinión del usuario sobre arte; la prueba física y FPS pertenecen a M7. Ver [roadmap vigente](ROADMAP_V1.md) e [informe M5](campaigns/stormwreck-isle/private/m5/M5_ART_LAYER_IMPLEMENTATION_20260925.md).

## Corrección de inicio, PID reciclado y catálogo de mapas — 2026-09-26

La candidata de aplicación pasa a `0.3.2-dev.5`. `INICIAR.cmd` comprueba el puerto antes de compilar, para no interrumpir una mesa que ya está sirviendo sus archivos; una vez libre, recompila Vite y el servidor antes de iniciar. Los nuevos bloqueos guardan la hora de inicio del proceso y, para los anteriores, Windows la compara con la fecha del bloqueo: un PID reciclado se archiva en `recovery` sin tocar al proceso que ahora lo usa. La opción R se limita a la campaña elegida, cierra su mesa con solicitud autenticada incluso si escucha en otro puerto, y preserva programas ajenos. `/api/campaign` del DM en una instancia nueva devuelve el pecio y los cinco campamentos. Vitest 186/186, tipos, builds, cierre en puerto alternativo y arranque con lock legado pasan en pruebas aisladas. No se ha iniciado una mesa real del usuario ni probado hardware físico; falta confirmar el arranque con su acceso directo.

## Registro histórico — 2026-09-25 · revisión 36 · M5: mar y cobertura de assets

### Corrección vigente r35

El viaje deja a cada personaje sobre la barca (`sea`, 24,15), a una casilla de P01; desde allí sube caminando a C1. La ruta alternativa nada por el carril exterior (filas 15–16) hasta P16/C9 y vuelve por el mismo hueco, sin engancharse en P01. Una integración real con dos clientes verifica que Mia regresa individualmente al Retiro con confirmación del DM mientras Mike se queda en C3 y el foco no cambia. Suite 154/154 e integración compilada PASS; typecheck de servidor PASS; build/typecheck aislados cliente/servidor PASS en esta candidata. El servidor local r35 está en `http://127.0.0.1:4399`, ligado a loopback y con datos desechables separados. Recuperación: base r32 + delta r34 + delta r35, en ese orden.

### Alcance visual vigente r36

El usuario pide completar el mar y crear los assets finales de **todos** los objetos interactuables/recogibles y de toda la decoración de C1–C9, cofa y exterior. La textura repetible de agua actual es provisional, no el mar ilustrado de las referencias. Puertas/cajas genéricas, mobiliario y utilería `blockout` tampoco cuentan como assets finales. El inventario por zona, estados y criterios está en [plan de cobertura M5](campaigns/stormwreck-isle/private/m5/M5_ASSET_COVERAGE_PLAN_20260925.md). Mantener secretos fuera del arte base y no tocar la geometría navegable.

La decisión del usuario es vinculante: C1–C9 y la cofa son **un solo mapa lógico `wreck-ship`**, con superficies/niveles conectados; no son pantallas ni mapas separados. C1 y C4–C7 comparten `main`; C2, C3, C8, C9, `crow` (cofa) y `sea` son superficies del mismo terreno Babylon 44×20 a 1,5 m/casilla. El capítulo 3 (PDF pp. 22–27; mapa 4 en p. 25) se auditó para todo el ciclo desde el viaje en barca y los dos abordajes hasta la salida/desenlace. Ver [auditoría M4](campaigns/stormwreck-isle/private/M4_ARRIVAL_AND_DEPARTURE_AUDIT_20260925.md), [roadmap vigente](ROADMAP_V1.md), [estándar visual](docs/PECIO_VISUAL_STANDARD_20260922.md) y [gate de C1–C9](campaigns/stormwreck-isle/private/C1_GREYBOX_GATE.md).

M4 registra las rutas de barca/jarcia y brecha submarina, la regla del timón y C4, el estado de C5/C6, encuentros y d6 único de C8, tesoro/paquete secreto de C9, vuelta de la arpía y cierres de la maldición sin automatizar tiradas. Esta auditoría añadió los hallazgos individuales de C4 y la cofa, los ocultó correctamente tras la puerta/superficie y corrigió la condición del sueño del clérigo para la ruta de destrucción a bordo. Al generar la candidata M7 se detectó una referencia a helper de animación fuera de su clase; ahora es compartido por el estado y servidor, y hay prueba de regresión. El panel privado del Retiro ofrece el gancho Runara/Varnoth/Rix y deja a elección el orden Pecio/Pleamar; el panel del Pecio explica ambos abordajes. La prueba de sockets con dos jugadores recorrió llegada, abordaje P01, separación de superficies, C2/C8 y C3/timón; integración de objetos y guardado/restauración también se comprobaron en instancias temporales. El helper de prueba se corrigió para enviar keyup después de una pulsación de una casilla; no era una reproducción fiel dejar la dirección mantenida.

El resultado sigue siendo un **greybox con materiales candidatos M5**, no el acabado HD-2D/2.5D final. En un cliente real de jugador con datos aislados se corrigió el desvío diagonal de la cofa. W subió a ella, rodeó el mástil, S volvió a C1 y tras girar 45° W siguió la cámara. En una segunda comprobación D avanzó de `24,6` a `25,7` y A regresó a `24,6`, manteniendo la escena `wreck-ship`; el DM sólo observó. La simulación del servidor es 30 Hz, los snapshots 20 Hz y cada casilla tiene paso de 220 ms. Esto valida el rumbo y el retorno de una casilla, no mide latencia/FPS ni sustituye la sensación subjetiva del usuario en su teclado/móvil.

La primera capa artística M5 carga `deck-planks-art01.png` en cubierta y casco; se conservan agua/oleaje, viento marino y luces localizadas C8/C9; las cuatro antorchas siguen apagadas. La retícula del barco mezcla alpha real (`#88968b`, 0,66); geometría, selección, alturas y colisiones permanecen independientes. Sigue siendo un greybox en fase de arte, no el acabado de las referencias: M5 espera revisión visual del usuario y faltan paredes/props modulares. Suite **154/154**, integración ampliada con dos jugadores y tipos/builds aislados PASS; no se midió FPS sostenido ni se probó hardware físico. La candidata r35 se reconstruye desde base M6 r32 aplicando r34 y r35; los overlays excluyen guardados, QA saves, dependencias, `dist` y fuentes originales. Ver [gate C1–C9](campaigns/stormwreck-isle/private/C1_GREYBOX_GATE.md), [worklog M5](campaigns/stormwreck-isle/private/m5/ART_WORKLOG_20260925.md), [guion físico](campaigns/stormwreck-isle/private/m5/M6_M7_PHYSICAL_PLAYTEST_20260925.md) y [roadmap vigente](ROADMAP_V1.md).

## Histórico — prioridad del 2026-09-22, sustituida por el trabajo C1–C7 del 23/09

M1+M2 forman la candidata técnica `0.3.2-dev.1`; `0.3.2-dev.2` inicia su corrección visual: recorrido A–D con mapa táctico visible y estados locales para puerta/listón C4, tablón/trampa C6, tres contenedores C8 y cofre/paquete C9. Es ejecutable y compatible con guardados 0.3.1, **no una aceptación física ni el capítulo completo**. Orden único en [ROADMAP_V1.md](ROADMAP_V1.md).

- Versión de trabajo `0.3.2-dev.2`; última aceptada Alpha0.2 RC2. La malla Babylon A–D demostró geometría, pero ocultaba sus capas de mapa y se veía como plataforma vacía. A–D vuelven a la composición Pixi mientras se preparan fondos HD-2D compatibles; la geometría/puertos/estados se conservan.
- Reutilizar LAN/controles/objetos/guardado/combate/audio y originales locales:40PNG zombi y57arpía. La fuente viva de Drive aporta además43PNG de Zombie1,2 de Arpía1,62 de Arpía3,23 del gul y8 recursos de entorno del pecio utilizables por nombre; todos requieren descarga, inspección visual e integración antes de darse por terminados. Animaciones Stormwreck vacías pese a soporte del motor. F0/F1/F2 D8 cerradas según evidencia19/09; F3–F7 no certificadas, conservadas fuera del camino crítico del pecio.
- Babylon9.26 queda preparado para A–D, pero no se vuelve a presentar allí hasta alinear arte, cámara, fichas y grid. Pixi muestra de nuevo las capas tácticas completas durante esa corrección. C8 declara agua/terreno difícil y C9 oscuridad0,9/revelado por autorización.
- Cuatro mapas alineados: A superiores/exterior C2/C3/cofa; B principal C1+C4–C7; C inferior C8; D bodega C9. C4–C7 no son piso separado de C1. Un plano/estado único, conexiones dirigidas.
- Evidencia21/09: **85/85tests (7 archivos), typecheck cliente/servidor PASS,84 rutas de arte/audio presentes (46audio)**. No nuevo build ni pruebas físicas; no acredita mapas inexistentes.
- **M1a COMPLETADO como fuente, 22/09:** se conserva íntegro en `private/m1a/`; referencias Drive siguen `STUDY`, no copiadas.
- **M1b COMPLETADO técnicamente, 22/09:** protocolo18; escena única autorizada, ubicación individual, foco separado, P01–P16 y persistencia compatible. Evidencia:89/89, tipos/build y navegador local.
- **M2 COMPLETADO técnicamente, 22/09:** protocolo19 y ADR-026. `P06` exige retirar listón y abrir puerta; C6 conserva revelado/trampa gastada/rearme/propietario; C8 aporta tres contenedores con IDs propios; C9 distingue cofre sumergido/superficie, contexto de apertura y propietario de paquete. SaveV1 añade estado opcional y migra guardados0.3.1 añadiendo sólo objetos M2 ausentes. 93/93 pruebas, typecheck, integraciones general/objetos/save y build completo de producción PASS. La QA de navegador demostró estados y Babylon, pero el usuario identificó con razón una regresión visual: faltaba el mapa y la cámara no seguía el estándar HD-2D aportado. [Estándar visual](docs/PECIO_VISUAL_STANDARD_20260922.md) registrado; **siguiente prioridad: Sol High, M2.5 recuperación visual**, antes de M3a.

Copia recuperable M2: `backups/pecio-m2-0.3.2-dev1-20260922.zip`, 574 680 305 bytes, 854 entradas comprobadas, SHA-256 `A1547C835013350FF8A689CD6D83773FC228F371DB04FAB434148CFFA68E1F2B`. Incluye código, build, campañas y documentación; excluye guardados reales, temporales, dependencias y copias anteriores. Contiene fuentes privadas del pecio y no debe publicarse.

Copia recuperable de la corrección visual inicial: `backups/pecio-m25-0.3.2-dev2-20260922.zip`, 574 683 492 bytes, 855 entradas comprobadas, SHA-256 `B8E6129D78322E4157BBA3920040D0216F8C66949430A65776D3EFF9404CF96B`. Conserva el mapa táctico visible en A–D, pero no sustituye la futura entrega de fondos HD-2D; contiene material privado y no debe publicarse.

Detalle privado: [auditoría](campaigns/stormwreck-isle/private/PECIO_AUDIT_20260921.md) y [plan espacial A–H/conectividad](campaigns/stormwreck-isle/private/PECIO_SPATIAL_PLAN.md), fuera de HTTP. Lo inferior conserva evidencia histórica, no sustituye esta prioridad ni recuentos.

## Histórico — prioridad del 2026-09-18, sustituida

El usuario encarga a Astra auditar D8 Night y preparar la implementación por fases para Sol, reutilizable en Stormwreck. Ver [auditoría del18/09](docs/D8_NIGHT_AUDIT_20260918.md) y [ruta de Sol F0–F7](docs/D8_NIGHT_SOL_ROADMAP.md). Es el orden de trabajo inmediato; el estado histórico inferior no acredita que esos hallazgos estén corregidos.

Comprobado en esta auditoría:50/50tests y tipos cliente/servidor pasan;12diagnósticos adicionales reproducen fallos de combate/estado. Roster actual D8: María y Aoife, no tres PJ provisionales. Babylon está instalado pero la escena jugable sigue con Pixi. No se modificó producción ni los guardados; aceptación de navegador/móvil y correcciones quedan para Sol. No hay nueva RC aceptada.

Actualizado: 2026-09-16. La carpeta de trabajo contiene **Alpha 0.3.0 DEV1**, todavía sin RC ni aceptación física. Alpha 0.2.0 RC2 sigue siendo la última versión aceptada. La familia v4 de puerta ya está integrada, pero su aceptación visual/física y subcasos físicos siguen pendientes.

## Inicio de mesa

`INICIAR.cmd` pregunta al DM qué campaña abrir antes de iniciar el servidor: Isla de las Tempestades o D8 Night. Cada elección conserva su slot de guardado independiente. Mientras no se defina `DM_PASSWORD`, `/dm` crea una sesión local automáticamente y no muestra contraseña; si se vuelve a definir esa variable, el formulario reaparece sin cambiar el resto de la mesa.

## Alpha 0.3 DEV1 — registro del 16/09, ampliado por F1/F2

Implementados formato privado SaveV1/legado0, checksum, hidratación de escenas/PG/inventario/objetos/audio, checkpoint atómico con backup, lock de escritor, autosave, exportación privada, preview y restore confirmados, epoch de mundo y recuperación explícita. Pruebas actuales: typecheck/build PASS, Vitest 39/39, integraciones generales/de objetos PASS y `scripts/alpha03-smoke.mjs`/`scripts/one-shot-smoke.mjs` PASS con servidores hijos, cierre/reinicio, corrupción de active y recuperación de backup en carpeta temporal. Ninguna prueba usa la mesa del usuario en puerto3000. Se conserva el estado anterior en recovery antes de restaurar; input, sesiones de PJ, SFX y undo no reaparecen al cargar. La matriz honesta de cobertura está en `docs/ALPHA_0_3_IMPLEMENTATION_RESULTS.md`.

Pendiente para RC: aceptación visual/física de `objects-v4`, QA de navegador completa, cobertura P01–P15/D01–D05 que falta y recorrido físico D06/móviles. Varios borradores ImageGen anteriores se descartaron por desalineación y perspectiva. Babylon.js 9.26.0 (Apache-2.0) ya está instalado: hay terreno sintético, malla, grid proyectado, oclusores, luz, cámara y prueba `NullEngine`, pero no render3D integrado ni escena jugable. El one-shot privado aportado por el usuario ya tiene un pack separado de seis localizaciones, con mapas, actores de escena y tres PJ provisionales; falta pulido narrativo, balance y QA final.

Copia local de trabajo DEV1: `backups/alpha-0.3.0-dev1-20260915.zip` (20 633 284 bytes), SHA-256 `4574020BE1D040A67F1F900657E495093196D133720F1252CC8CE92B7C953911`, 199 entradas ZIP comprobadas. Incluye código/build/assets/documentación y la semilla privada del servidor necesaria para arrancar, así que **no debe compartirse públicamente**; excluye saves, capturas de evidencia, originales aportados y el ZIP del one-shot. No reemplaza las copias RC2/RC1 conservadas.

## Alpha 0.2.1 RC1 — registro histórico

El timón está integrado en los objetos por escena, sin `wheelStates` paralelo ni copia lógica. Tiene soporte fijo, separación atómica con destino, estados sujeto/caído, cuatro rotaciones, daño y restos. Puerta y caja también admiten intacto/dañado/roto; los restos dejan pasar actores pero conservan su ubicación para que otro objeto no se superponga. Deshacer valida ocupación y no desplaza personajes. Las solicitudes quedan ligadas a sesión, controlador, escena y versión del objeto y se invalidan por movimiento, desconexión, cambio de escena, mutación o caducidad.

Evidencia: typecheck cliente/servidor PASS; Vitest **23/23 PASS**; build Vite 842 módulos y servidor TypeScript presentes en `dist`; auditoría Alpha 0.2 **12/12 PASS**; integraciones general y de objetos Alpha 0.2.1 PASS; `scripts/audit-alpha021.mjs` termina sin fallos automatizados y conserva marcadores separados de comprobación en navegador. DM/Player/Projector fueron comprobados a 390×844, 844×390 y 1920×1080, con las tres consolas limpias.

Arte v3 terminado: cubierta limpia sin timón/pedestal horneados, soporte, variantes del timón, puerta y caja, y restos transparentes. La puerta cerrada se rehízo como barrera estrecha en planta para respetar la cámara cenital/oblicua. El editor DM previsualiza el sprite final y la huella; jugador y proyector sólo reciben estados aplicados. La rueda montada/cogida conserva lectura circular de rueda vertical y debe juzgarse en la prueba física por si necesita una elipse más marcada.

**Hallazgo físico del 15/09:** el usuario confirmó timón único, separación sin duplicado, traslado/giro, daño y restos, colisiones funcionales de puerta, deshacer ocupado, conexión y audio. También aportó dos capturas que demuestran que la puerta abierta todavía usa una hoja casi frontal mientras la cerrada usa una barra horizontal cenital: **FAIL visual**. El soporte del timón parece desplazado respecto a la cuadrícula según el usuario, sin posición alternativa todavía inequívoca. El usuario confirmó después preview rojo ocupado/bloqueado y Escape que elimina borrador/huella y vuelve a amarillo; no describió por separado el verde válido ni cuatro giros individuales. Móvil vertical/horizontal aplazado expresamente al cierre0.3. Informe detallado en `docs/ALPHA_0_2_1_PHYSICAL_REPORT_20260915.md`.

Copia recuperable RC1: `backups/alpha-0.2.1-rc1-20260914.zip` (20 528 652 bytes), SHA-256 `444F3A09524DA4AB26B4A0AF62A55B5505BF568D68EF5E520E407EC8F5352EF2`; ZIP comprobado como legible. La copia DEV1 y la aceptada `alpha-0.2.0-rc2-final-20260914.zip`, SHA-256 `28588478A586510BAD5AE3BA174BFD806AFE26E3BFCC1BD35743C3BC12F96E7A`, se conservan sin sobrescribir.

**Última versión aceptada operativamente por el usuario: Alpha 0.2.0 RC2.** La candidata histórica 0.2.1 RC1 tuvo arranque y recorrido físico parcial, pero no fue aceptada mientras la puerta abierta/cerrada siguió visualmente incoherente. La carpeta actual ya es DEV1 de 0.3.

## Qué incluye RC2

- Servidor de campaña inyectada: el motor y los clientes ya no importan Stormwreck ni dependen de sus IDs. `/api/campaign` entrega únicamente el DTO público validado; secretos, PG, inventarios, notas, criatura y reglas del timón se componen en servidor.
- Puerta cerrada/abierta/bloqueada con serialización privada del bloqueo, colisión autoritativa y deshacer. Una puerta bloqueada debe pasar a cerrada antes de abrirse.
- Caja 2×1 con giro, recolocación discreta, colisión por huella, reservas de spawns/PJ/pasos/criatura visible y deshacer por escena.
- Editor DM con mapa real, selección por mapa/lista, contorno, giro, elección de destino, preview privado válido/inválido y Aplicar/Cancelar/Escape.
- Fondo 576×432 y sprites separados para puerta abierta/cerrada y caja horizontal/vertical. Cuadrícula runtime permanente, tokens y props con orden visual común.
- Revisiones por escena, CAS de dos DM, fingerprint idempotente, reconexión al estado vigente y guardas frente a cargas antiguas.
- Se conservan aproximación, cubierta, joystick/WASD, timón, criatura, inventario/PG, cámaras y audio por capas con tres SFX.

## Evidencia técnica histórica de RC2

- Typecheck cliente y servidor: PASS.
- Vitest: **18/18 PASS**, incluida campaña sintética sin timón ni criatura.
- Build de producción: PASS, 842 módulos Vite y servidor TypeScript.
- Auditoría Alpha 0.2: **12/12 PASS**, 0 fallos; resultados en `docs/ALPHA_0_2_AUDIT_RESULTS.json`.
- Integración general en servidor nuevo y puerto libre: PASS (HTTP privado, permisos, tres roles, dos jugadores, timón, criatura, PG/inventario, reconexión, audio/SFX).
- Integración de objetos: PASS (tres roles, puerta, caja, stale refresh y undo).
- Navegador final DM/Player/Projector: login, catálogo, mapa, arte, preview privado, asignación de Mike y preparación del proyector comprobados; consolas sin errores ni avisos tras corregir la precarga.
- Búsqueda de imports/literales: sin imports de `campaigns/` en `engine/` o `apps/web/`.

## Recuperación y ejecución

- Rollback aceptado: `backups/alpha-0.1.1-rc4-20260913.zip`, SHA-256 `9029B7B26B854EF439CF4DEC14CA38A6C9595036CE117735A921ABEF615EE299`.
- Copia de trabajo previa: `backups/astra-pre-review-0.2-20260913-223941.zip`, SHA-256 `3614A28B36EE2ACBECD400EFC2D31FD639CA1BB26ED7AE3AA0BF99B7012CC32F`.
- Copia final RC2 con documentación de relevo: `backups/alpha-0.2.0-rc2-final-20260914.zip` (15 867 968 bytes), SHA-256 `28588478A586510BAD5AE3BA174BFD806AFE26E3BFCC1BD35743C3BC12F96E7A`. La copia `alpha-0.2.0-rc2-20260914.zip` se conserva como instantánea intermedia y no se sobrescribió.
- Los comprobadores usan servidores propios en loopback y puertos libres. No deben reiniciar ni reutilizar la mesa abierta por el usuario en el puerto 3000.
- En RC2 el estado de partida seguía sólo en memoria. DEV1 de Alpha 0.3 ya tiene persistencia, aún sin aceptación física.

## Siguiente versión

**Dirección posterior aprobada (15/09):** conservar arquitectura web/servidor y adoptar Babylon.js para sprites2D en escenarios3D; Astra y Sol realizan el trabajo principal y Terra/Luna reciben bloques acordes a su capacidad cuando ahorran trabajo. `docs/HD2D_DIRECTION.md` y ADR-023 fijan inmersión de mesa, percepción individual futura en móvil, recursos reutilizables y alcance. Babylon 9.26.0 ya está instalado, pero sólo sustenta un adaptador de terreno aislado; el recorrido3D completo sigue dependiendo de la integración0.3.1 y de aceptar0.3.

El gate físico de RC2 permanece **PASS operativo**. El intento de corrección de puerta en 0.2.1 sólo arregló la variante cerrada: la abierta sigue casi frontal y ambos estados no comparten lectura de marco/bisagra. La nueva observación física prevalece sobre la QA de navegador anterior.

**La histórica Alpha 0.2.1 RC1 quedó técnicamente verificada.** El contrato, ADR-017–019 y fixture siguen siendo referencia histórica. En ese corte se usó protocolo v3; DEV1 de0.3 usa v4 con runtimeEpoch y conserva DTO público v2.

La evidencia actual ya incluye ejecución de las funciones nuevas: Vitest 23/23, integraciones de socket y `scripts/audit-alpha021.mjs`, además de QA de navegador. El comprobador de diseño sigue validando nueve rutas, seis casos de ubicación y cuatro giros. No se añadió ninguna dependencia.

Las correcciones de borrador/revisión/conexión, `step.from`, preview con sprite, validación unificada y reutilización de props ya están incorporadas. RC2 se conserva como rollback aceptado. La futura confirmación física debe distinguir qué se observó de la evidencia automatizada.

Siguiente resultado exigido: **cerrar la puerta y las pruebas faltantes de Alpha0.3 conjunta**, siguiendo `docs/NEXT_MODEL_PROMPT.md`. Astra cerró ambos contratos, ADR-020–022, fixtures y matriz de aceptación; la persistencia ya está en DEV1. El usuario autoriza completar0.3 antes de comprobar puerta y móvil: no existe gate físico intermedio0.2.1 ni aceptación por inferencia.

Contratos vigentes: `docs/ALPHA_0_2_1_DOOR_VISUAL_CONTRACT.md`, `docs/ALPHA_0_3_PERSISTENCE_CONTRACT.md` y `docs/ALPHA_0_3_ACCEPTANCE_PLAN.md`. `node scripts/check-alpha03-design.mjs` verifica sólo fixtures de diseño; la implementación tiene ahora pruebas runtime propias. El descubrimiento preparatorio queda histórico y no prevalece sobre el contrato.

Antes de todo componente o asset nuevo se aplica el gate de reutilización de `ROADMAP_V1.md` y `docs/OPEN_SOURCE_REVIEW.md`: se estudian alternativas libres/gratuitas, pero sólo se incorporan si licencia, procedencia, transformabilidad y encaje técnico/artístico justifican el coste. Se mantienen dados y decisiones en mesa, secretos sólo en servidor, estética táctica pixel art y SFX PCM actuales como backlog artístico.

### Registro de cierre técnico Alpha 0.2.1 RC1 — 2026-09-14

Luna Reserve completó el encargo funcional y visual iniciado por Sol sin subagentes ni cambio automático de modelo. La prueba física está deliberadamente pendiente. La copia final RC1 y su hash están registrados arriba; las copias RC2 aceptada y DEV1 siguen disponibles.
