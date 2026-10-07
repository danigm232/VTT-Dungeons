# D8 Night · cierre de integración de animaciones

## Alcance

Catálogo implementado de D8 Night, jugadores María/Trinity y Silverfarben Hotel, PNJ de las seis escenas y reflejo del jugador. No se promete una animación única para cualquier acción improvisada ni conversión a personajes 3D.

## Arte

24 atlas PNG nuevos, 736 poses; generación integrada de imágenes, sin CLI/API externa. Destino: `campaigns/one-shot/public/art/tokens/generated-20261004/`.

Identidades conservadas desde PNG originales: Anteros, Fritz, Ben, Margaret, Boris, tabernero, parroquiano, aldeana, vaca, rosas, Silverfarben y María. No se sobrescribieron los originales.

Prompts y recortes manuales documentados en `ANIMATION_PROMPTS_20261004.json`; metadatos de textura en `public/generated-completion-atlases.ts`. Los atlas se consumen mediante rectángulos de textura: no se modifica el PNG para eliminar fondos. Las pruebas verifican alpha real, límites del recorte y rutas existentes.

## Correcciones

- Carrera: ciclos propios de cuatro fases, ocho rumbos por PNJ. Las rosas se mueven como plantas y la vaca como cuadrúpedo.
- Gesto sin armas propio de ambos jugadores, separado de daga; impacto circular sin barrido de hoja. La vaca reutiliza su resistencia corporal existente para el ataque genérico.
- El cuerpo de Anteros usa arco también para flechas radiantes; Enredar usa el estado de enredar. Auditoría y servidor comparten la selección de pose.
- Destrabarse orientado; salto, esquiva, natación y escalada tienen movimiento local del cuerpo sin cambiar posiciones autorizadas.
- Caer y levantarse tienen secuencias propias; se conservan las poses finales inconscientes anteriores.
- Fundido de 90 ms y reloj relativo al inicio del estado. No se resetea el sprite al llegar cada snapshot.
- Oclusión parcial de cuerpo en una máscara de 3×6 muestras, con caché de 66 ms. Ocultación completa solo si todas las muestras están cubiertas. No equivale a una máscara de profundidad por píxel.
- Escala física respecto al mapa y zoom ortográfico; la altura del fotograma recortado no vuelve a escalar el cuerpo a tamaño de pie.
- VFX persistentes del estado autorizado: niebla de radio 6 m hasta una hora/concentración, plumas durante un minuto y chispas breves. Se guardan los tiempos, no se reinician al reconectar. Fin/reemplazo de concentración elimina la niebla. Guardados con metadatos contradictorios o ID duplicados se rechazan antes de mutar el mundo.
- Efectos visuales no otorgan automáticamente ocultación, visión, familiar, reparación, caída ni resultados de dados. Los rituales conservan resolución guiada por el DM.
- Las señales de ataque llevan pose corporal y época de escena para no reproducirse en otro mapa. Los proyectiles/barridos se cancelan al cambiar conexión o escena.
- La ventana muestra únicamente entidades públicas presentes en el mapa; secuencias propias/reutilizadas/ausentes diferenciadas. Recorrido, fotogramas, pausa, marcas locales persistentes y exportación no escriben la partida.

## Verificación

- Suite completa: 39 archivos, 326 pruebas aprobadas. Tras los últimos ajustes, 29 pruebas específicas aprobadas, incluida la validación de metadatos de VFX.
- Tipos de cliente y servidor aprobados; compilación de servidor aprobada.
- Compilación web aprobada; se conservan los chunks anteriores para que las pestañas ya abiertas no pierdan importaciones durante el cambio.
- Integración por socket aprobada: dados físicos, idempotencia, seis escenas, cuatro objetivos, final, carga para DM/dos jugadores/proyector, propiedad de personajes, diez puntos de carga y reinicio/autocarga.
- Smoke HTTP aprobado: seis mapas, configuración sanitizada, todas las rutas de fichas/animaciones y 70 recursos de audio.
- Auditoría aislada por los seis mapas: 3.147 entradas de acciones/poses, cero ausentes y 203 rutas PNG distintas existentes. Incluye los diez parroquianos hostiles, seis rosas y el reflejo. Reporte: `output/animation-closeout/coverage.json`.
- Comando reproducible: `node node_modules/tsx/dist/cli.mjs scripts/audit-d8-animations.ts`.
- Inspección de consola en mesa separada 3308: Anteros, 25 acciones y cero pendientes. No se marcaron resultados artísticos automáticamente. Las operaciones de clic del navegador dieron timeout; por tanto la revisión artística completa sigue siendo aceptación del usuario.

## Aceptación pendiente

Revisión artística manual de todos los gestos, alturas no especificadas en las fichas y pruebas de fluidez/sonido en dispositivos físicos. Orientaciones propias de cada gesto, más fases por ciclo y oclusión por píxel/3D para todos los efectos son mejoras opcionales posteriores.

Se preservó el trabajo compartido V41 de navegación/relieve/audio y los guardados se mantienen separados de las mesas de prueba.

## Publicación verificada

Servidor habitual actualizado en `http://localhost:3000/dm`, PID 748. Cierre ordenado de la instancia anterior y autocarga: Café, personajes internos `aoife` (Silverfarben) y `maria` (Trinity), generación 3856, sin cambios pendientes. No se inició una partida nueva ni se modificó la escena para probar.

La API activa publica ambos golpes sin armas de cuatro fases; las 24 rutas PNG nuevas devuelven HTTP 200. Cliente web final: `world-C6a3ZZPi.js`. La mesa aislada de prueba 3308 se cerró ordenadamente. Se mostró la consola habitual en el navegador, sin aprobar automáticamente las animaciones.
