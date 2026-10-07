# Mesa de dirección DM · auditoría y rediseño

## 1. Auditoría previa

Componentes reales: cabecera de campaña y conectividad; conexión plegable con URLs/QR; grid de 12 columnas y ventanas con controles; presets y preferencias locales por exploración/combate; mapa WorldRenderer con herramientas de cámara/objetos; resumen de exploración y guías privadas; jugadores, PNJ, encuentro, solicitudes, combate, campamento, pruebas de animación; guardado y recuperación; cajón de mesa/clima/sonido.

Problemas específicos encontrados:

- `syncWorkspaceRowHeights` iguala todas las ventanas de una fila y congela sus alturas: un panel vacío hereda el espacio de su vecino.
- `grid-auto-flow: dense` puede rellenar huecos alterando el orden visual de lectura.
- Cabecera, conexión y títulos consumen altura sin mostrar juntos escena, guardado y decisiones pendientes.
- Jugadores/PNJ muestran coordenadas y recursos editables permanentemente. No existe una lectura compacta previa a editar.
- Objetos concatenan estados en una frase; acciones destructivas no se distinguen suficientemente.
- Exploración mezcla resumen narrativo y controles; las solicitudes no muestran claramente el objeto ni un acceso local al mapa.
- Guardado mezcla estado, generación y fecha técnica; una alerta puede quedar en una ventana minimizada.
- La barra lateral mezcla mesa/ajustes y conserva contenido enfocable cuando está fuera de pantalla.
- El combate ya dispone de iniciativa compacta, retratos, inspector y tiradas físicas: debe conservarse, no rehacerse.

Mejoras CSS/HTML: jerarquía de cabecera y ventanas, estados/badges, cuatro niveles de botón, subnavegación del mapa, dock de accesos, espacios/tipografía, tamaño del cajón, estados vacíos, formularios plegados y colores de peligro.

Cambios menores TS: presentar estados existentes en cabecera/conexión; separar lectura/edición sin cambiar comandos; chips y selección local de fichas/objetos; conservar disclosures durante actualizaciones; abrir una ventana desde el dock; igualar únicamente el mapa y su contexto; presets más compactos; estado de guardado derivado sin alterar persistencia.

Riesgos: conservar IDs de ventana para layouts locales; no borrar disposiciones guardadas; no perder foco/borradores al recibir snapshots; no inventar interacciones de puerta donde el protocolo solo ofrece timón; no alterar validación CAS/epoch; refrescar renderer tras cambios de geometría; distinguir conexión PJ de asignación; no ocultar errores de guardado tras un resumen positivo.

Arquitectura respetada: ADR-001 (DOM/TS sin framework), ADR-006 (audio en proyector), ADR-013/014/018/019 (objetos/preview/CAS), ADR-021/022 (persistencia y runtime), ADR-025/028 (escena y cámara). WorldRenderer ofrece selección/foco/refresco locales suficientes; no se modifica el motor.

## 2. Estructura propuesta sobre el código existente

Cabecera compacta sticky con campaña/escena y estados reales. Conexión plegable bajo la cabecera. Primera fila del grid: mapa dominante + exploración o combate. Las otras ventanas mantienen todas sus capacidades, pero se presentan como fichas operativas compactas. Dock de accesos recupera/expande ventanas. Cajón con Mesa, Ambiente, Sonido y Ajustes. Los presets y disposiciones siguen guardándose por modo y no reemplazan una distribución del usuario al entrar.

## 3. Cambios implementados

- Cabecera operativa: campaña, escena, solicitudes, combate, servidor, proyector y guardado. Conexiones permanecen primero y plegadas; URLs y QR siguen disponibles al abrirlas.
- Mapa dominante con subnavegación Mapa / Objetos / Cámara / Ambiente; deshacer continúa arriba. La selección abre una ficha contextual con chips y acciones de peligro diferenciadas.
- Resumen de escena con objetivo, presentes e interactuables. Guías, progreso, botín y gestos conservan sus controles dentro de detalles. Escenas con más de seis objetos muestran un contador y un listado desplegable con accesos al mapa; no decenas de etiquetas permanentes.
- Jugadores y PNJ separan lectura de edición. PG, recursos, casilla, conexión, visibilidad y participación se leen sin inputs; posición/recursos editables siguen disponibles al expandir.
- Solicitudes con origen, objeto, antigüedad, resultado físico, rechazo y acceso al mapa. Señal discreta en cabecera, ventana y dock; sin inventar solicitudes de puerta no soportadas por el protocolo.
- Combate mantiene los retratos, iniciativa física, orden compacto, selección/inspector y categorías existentes. El estado inactivo y la ayuda son compactos; finalizar se distingue como peligro y conserva confirmación.
- Guardado compacto derivado de la revisión realmente guardada. Una copia antigua no se presenta como prueba de que la revisión actual esté guardada. Las alertas recuperan la ventana de copias; las operaciones existentes no cambian.
- Dock inferior con espacio propio: no flota encima de botones. El área de trabajo tiene su propio scroll; filas de altura máxima de contenido impiden que una ventana secundaria invada la siguiente.
- Mesa / Ambiente / Sonido / Ajustes separados. Se mantienen cuatro presets con miniaturas, preferencias de densidad/texto y recuperación de ventanas. Los accesos deshabilitados se calculan después de actualizar la disponibilidad de la escena.
- Se igualan únicamente mapa y contexto; las ventanas secundarias no heredan grandes alturas vacías. Los tamaños explícitos y ambos layouts guardados siguen respetándose.
- Estados positivos, pendientes, error e información; botones principal/secundario/utilidad/peligro; foco visible, labels y texto junto al color. La estética azul-verde/dorada/serif se conserva.

## 4. Archivos y alcance de la entrega

Código de esta tarea:

1. `apps/web/dm.html`: cabecera, conexiones, subnavegación, estructura de paneles, lateral y dock.
2. `apps/web/dm.ts`: presentación derivada del estado existente, lectura/edición, accesos locales, ventanas y avisos.
3. `apps/web/dm-workspace.css`: capa visual exclusiva de DM, geometría responsive, jerarquía y estados.
4. `apps/web/ui/dm/presentation.ts`: helpers pequeños de UI, disclosures, resumen de escena y estado de guardado.
5. `engine/client/dm-workspace.ts`: recomendaciones y spans de las disposiciones; módulo cliente de UI, no motor de reglas.
6. `engine/client/dm-workspace.test.ts`: prueba adicional de recomendaciones compactas y paneles visibles.
7. `engine/client/dm-presentation.test.ts`: seis pruebas de estados de guardado y antigüedad.
8. Este informe de auditoría/aceptación.

La compilación local está en `dist/web`. Evidencias y el fixture desechable de solicitudes están en `output/dm-direction-review-20261006`; son material de QA, no cambios de campaña ni parte de un commit de producto.

**Preparación para GitHub:** no se ha publicado ni hecho commit/staging global. Este árbol ya tenía muchos cambios de jugador, servidor, campañas, combate y arte. `dm.html`, `dm.ts` y las utilidades de layout se solapan con ese trabajo previo; sus diffs completos contra HEAD no son una entrega aislada de este rediseño. El alcance de publicación es únicamente los ocho elementos anteriores, revisando y separando los hunks compartidos y las dependencias previas antes de crear el commit. No se incluyen partidas, adjuntos, carpetas temporales, `output`, `dist`, arte ni cambios previos de reglas. No se presenta el árbol completo como una versión limpia lista para subir.

## 5. Pruebas realizadas · 6–7 de octubre de 2026

Entorno: mesas aisladas con datos temporales y puertos 53054 (D8 Night) y 53622 (Isla de las Tempestades). No se ha reiniciado ni alterado la partida del puerto 3000.
Las pestañas y los dos servidores de QA se cerraron al terminar; las capturas se conservan y el tamaño temporal del navegador se restableció.

Automatizadas:

- TypeScript cliente: sin errores.
- Build de producción cliente: correcto tras las correcciones finales.
- Suite completa cliente: **40 archivos / 157 tests correctos**.
- Pruebas dirigidas de presentación/layout/combate: **25 tests correctos**.
- Integración D8: correcta, incluyendo dados físicos, idempotencia, retirada, escenas, restauración, privacidad del jugador/proyector y guardado/reinicio.
- Integración de objetos del Pecio: correcta; permisos de los tres roles, daño/rotura, revisión, deshacer y timón en cuatro rotaciones.

Navegador real:

- Exploración y combate en **1920×1080, 1600×900 y 1366×768** CSS. Sin desbordamiento horizontal general. Mapa aproximado de 1185×589, 971×440 y 815×307 px respectivamente en la disposición principal. El dock queda separado 8 px del área de trabajo.
- Comprobación de rectángulos: ninguna intersección entre ventanas visibles tras corregir el encogimiento de filas. La prueba detectó un solapamiento de Guardado sobre Solicitudes; quedó corregido con filas de altura de contenido.
- Cámara y cuadrícula accesibles; renderer sigue mostrando terreno y fichas. Selección de puerta, cierre y deshacer mediante los comandos originales.
- Jugador y proyector conectados mediante sus vistas reales; cabecera/resumen detectaron conexión y preparación, y luego desconexión al cerrar las pestañas auxiliares.
- Lateral: cuatro presets, Ambiente visual, Sonido y Ajustes. Conexiones no cambian de posición. Edición avanzada de jugador abre los inputs originales.
- Ventanas: minimizar, maximizar, cerrar y recuperar desde dock. Arrastre de Jugadores antes de Solicitudes; redimensionado de mapa de 458 a 398 px, con contexto alineado. Orden, spans, tamaños y estados recuperados iguales al recargar.
- Layout de combate recuperado igual al recargar. Al volver a exploración se recuperó su layout propio, incluyendo la apertura explícita del panel Combate hecha antes de iniciarlo.
- Combate: iniciativas 18/12, confirmar orden, selección de Anteros sin cambiar el turno, condición derribada y retirada de la condición, edición de PG a 70, siguiente turno y finalización confirmada. Sin generación automática de dados.
- Solicitud real del timón preparada con un jugador sintético mediante 30 pasos legales: aviso pendiente, acceso al mapa, resolver «Supera · sujeto», previsualización de destino, Aplicar y bandeja vacía; timón queda sujeto y deshacer disponible. No se altera el protocolo.
- Pecio: contador de 35 objetos, detalle plegado y selección de C4 desde el listado; D8 mantiene su puerta y el contador de cinco asientos visibles.
- Guardar ahora: confirmación de copia 15; Copias y recuperación conserva exportación, revisión y restauración. Sin errores de consola JS observados durante la comprobación final.

Evidencias principales: `mesa-dm-final.jpg`, `exploracion-1920.png`, `exploracion-1600.png`, `exploracion-1366.png`, `combate-1920.png`, `combate-1600.png`, `combate-1366.png`, `solicitud-pendiente.png` y `pecio-resumen.png` en la carpeta de QA. Capturas sin editar; algunos archivos con extensión PNG proceden de la captura del navegador y contienen JPEG.

Límites de validación: no se han provocado fallos reales de disco ni un `SAVE_GENERATION`; sus estados visuales de error/recuperación/incompatibilidad sí se prueban de forma unitaria. Tampoco se ha efectuado una auditoría exhaustiva con lector de pantalla ni de todos los comandos de cada campaña. Las pruebas no equivalen a una certificación universal de ausencia de regresiones.

## 6. Mejoras UX obtenidas

Escena y estado de la mesa visibles de un vistazo; mapa y decisión actual dominantes; menor carga de formularios; menos texto permanente; pendientes fáciles de encontrar; paneles vacíos compactos; administración accesible sin competir con la partida; filas y dock sin solapamientos. Las ventanas mantienen su flexibilidad y preferencias locales independientes.

## 7. Decisiones de no cambio

No se cambia el motor, reglas, dados físicos, combate autoritativo, permisos, Socket.IO, versiones/revisiones, persistencia ni progreso de campaña. No se modifica el código del jugador, proyector, móvil DM ni estilos compartidos en esta tarea. No se añade framework ni un estado paralelo del servidor. Las escenas y funciones existentes permanecen accesibles, incluidos campamentos y guías privadas.

Los errores reales de persistencia, si se reproducen más adelante, deberán investigarse por separado. No se intenta corregirlos indirectamente con un resumen visual.

## 8. Mejoras futuras separadas

- Extraer más renderizadores puramente visuales de `dm.ts` si su tamaño sigue creciendo.
- Añadir pruebas DOM/responsive automatizadas a CI para detectar solapamientos, foco y accesos del dock.
- Revisar con lector de pantalla y teclado todos los flujos de edición/drag.
- Evaluar búsqueda/filtros de PNJ y objetos en escenas grandes sin cambiar su estado o visibilidad autoritativos.
- Medir con un DM real el número de interacciones y tiempo de decisión; la meta de 2–5 interacciones no se presenta como una métrica ya demostrada.
