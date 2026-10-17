# D8 V57 — Café cerrado con madera de taberna

14 de octubre de 2026. Continúa V56 y mantiene la corrección del borde de entrada de Fritz. El usuario solicita que el Café No-Me-Olvides tenga cubierta y una envolvente cerrada de madera. GitHub main consultado al iniciar: V49. Esta entrega no publica cambios remotos.

## Cambios

- Fachadas delantera, trasera y laterales en madera cálida con textura y remates de vigas oscuras. Se mantienen los huecos reales de las siete ventanas y la puerta interactiva.
- Cubierta completa a dos aguas con material de madera envejecida. Los dos frontones volumétricos se colocan sobre las paredes delantera y trasera, no sobre un límite aproximado distinto.
- Parámetros comunes de la envolvente en `MAP.tavernEnvelope`; el constructor dedicado y el cierre de la cubierta utilizan los mismos. Se documenta un fallback en el renderizador para clientes actualizados frente a un servidor anterior.
- Retiradas las dos paredes bajas de piedra coplanares con la fachada completa: podían provocar interferencias de profundidad. Se conservan sus colisiones anteriores.
- Los postes de la entrada pasan a madera y se alinean con el vano real; no se estrecha la puerta ni se recolocan muebles o PNJ.
- La zona interior de la cubierta se limita a las caras internas de los muros (22,65 × 14,615 m). Estar en el borde de la puerta o en el perímetro exterior ya no revela todo el interior.
- Las piezas pertenecientes a ventanas interactivas no se agrupan con postes fijos. La nueva prueba detectó que esa agrupación dejaba un marco visible tras romper una ventana; corregido antes de la entrega.

## Auditoría

- Paquete oficial V57 regenerado: fuentes exactas, imports resueltos, `current` idéntico a `v57`, V56 archivada. V56 se comprobó antes de modificar.
- 29 pruebas iniciales aprobadas: ventanas, puertas cerradas incluso en diagonal, regreso de clientes, Inspiración y navegación/guardados de D8.
- Construcción real del Café en Babylon NullEngine aprobada: 704 mallas, 15 piezas de cubierta, una habitación, 35 luces locales, tres mapas de sombras y 22 sombras de contacto.
- Veinticinco rayos descendentes comprueban cobertura sobre todo el suelo. Diez rayos comprueban el cierre texturado de ambos frontones; se muestrean también las cuatro fachadas fuera de sus huecos deliberados.
- Cubierta habilitada, visible y opaca desde cinco posiciones exteriores, incluido el borde de entrada; ocultación completa dentro y restitución al salir. Las siete ventanas se rompen y restauran sin piezas sobrantes.
- Fritz revalidada con los controles V56: once piezas de cubierta presentes, cierre sobre el suelo y recuperación al salir. Cámara actual 20° interior / 40° exterior, con ajuste manual conservado.
- Pruebas focalizadas finales: 41 de 41 aprobadas en siete archivos, incluidos paquete, asientos, ocultación, oclusión de fichas y regresiones espaciales de D8. Resultado conservado en `runtime/d8-v57-regressions.json`.
- Compilación dedicada final del cliente aprobada (3 min 21 s) y compilación del servidor aprobada. El servicio entrega `renderer-BLaZxxE6.js`, comprobado por HTTP con la exclusión de ventanas interactivas de la agrupación. Comprobación de diferencias sin errores de espacios.

## Servicio local

El puerto 3000 continúa sirviendo `stormwreck-isle`; su proceso no se cierra ni se sustituye. D8 V57 queda activada en una compilación dedicada en `runtime/d8-v57-web` y `runtime/d8-v57-server`, evitando que una compilación posterior de otra campaña reemplace sus archivos en caliente. Dirección de la mesa: `http://127.0.0.1:3001/dm`. No se abre ningún navegador automáticamente.

Verificación HTTP: campaña `d8-night-private`, configuración V57 con las seis escenas, página DM y renderizador final disponibles. Guardado existente en estado `ready`, sin cambios pendientes ni error, generación 586 en la comprobación. Sin errores en el registro de inicio. El servicio se inicia como proceso oculto y mantiene los ajustes de acceso existentes.

## Límite de verificación

Estas comprobaciones son geométricas y de estado, no capturas con GPU. No se ha eludido el bloqueo previo del navegador de revisión. No se certifica la composición artística exacta de la pestaña del usuario. Se conserva el guardado D8 existente; no se borran partidas ni archivos de Stormwreck.

## Revisión ampliada posterior a la activación

Ante la petición de comprobar que no falte nada, se vuelve a ejecutar la construcción real de las seis escenas, con resultado aprobado: Café (704 mallas, 15 piezas de cubierta), templo (936, 18), cena (656, 11), Fritz (736, 11), mercado (1076) y espejo (395). Cero límites inválidos, referencias eliminadas en luces, cubiertas auditadas ocultas fuera o visibles dentro y piezas superiores auditadas sin asociación de habitación. Se conservan las comprobaciones de juntas/frontones, ventanas rompibles, vidrieras diurnas/nocturnas, alfombras y control manual de cámara.

La ampliación de regresiones aprueba 206 de 206 pruebas en 34 archivos. Incluye D8, animaciones y recortes de atlas, oclusión, asientos, saltos, inventario, audio, cuadrícula, locomoción y recarga del cliente. Resultado: `runtime/d8-v57-expanded-audit.json`. La configuración HTTP sigue devolviendo V57 y el registro de errores del servicio permanece vacío en la comprobación.

Inspección directa de archivos de imagen locales: atlas del caballo, clientes sentados frontales y textura de vidriera. Además se comprueba la transparencia real del atlas del caballo (cuatro esquinas y espacio entre cuadros transparentes; alpha máxima 254/255). No se interpreta esa inspección aislada como evidencia del encaje hocico/agua, mano/cuerda o de la composición dentro del VTT. No se ha identificado otro defecto reproducible que justifique modificar las fuentes de la escena o incrementar versión.

La aceptación visual de la escena renderizada continúa pendiente. Se consultan las instrucciones de Computer Use y se respeta el rechazo anterior del navegador: no se usa otra superficie, automatización nativa o navegador para sortearlo. Esta pasada no genera capturas de GPU ni certifica que no exista ningún defecto artístico.

Historial: [Fritz V56](D8_V56_FRITZ_ROOF_20261013.md), [vidrieras V55](D8_V55_STAINED_GLASS_20261013.md).
