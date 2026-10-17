# Reloj y clima de campaña

El reloj autoritativo vive en el servidor de la campaña. DM, jugador y proyector reciben la misma hora y la extrapolan entre snapshots usando la marca temporal del servidor. Las consecuencias de reglas, las tiradas y la recuperación de recursos siguen siendo decisiones de la mesa.

## Ritmo del reloj

- Stormwreck empieza a las 08:00 y D8 Night a las 20:00. El contador presenta día y hora en formato de 24 horas.
- En exploración, un segundo real equivale a un segundo de campaña. Los diálogos modales del DM pausan el reloj; se reanuda al cerrarlos. El DM también puede pausar y continuar manualmente.
- El reloj se detiene durante el combate. Al cerrar un asalto completo avanza seis segundos, con independencia del número de turnos.
- Los controles de descanso avanzan una hora o ocho horas. El reloj no cura, repone recursos ni tira dados: el DM aplica las reglas oficiales y acuerda el resultado con el grupo. El descanso guiado de campamento ya añade las ocho horas al completarse, por lo que los controles rápidos quedan desactivados durante ese descanso.
- «Completar viaje» solo aparece para rutas con duración escrita en la campaña. La ruta en barca al Pecio tiene 6.000 segundos (1 h 40 min), según la duración publicada para ese trayecto. Cambiar de mapa sin una ruta temporizada no adelanta el reloj.
- «Avanzar» suma minutos y «Fijar hora» cambia la hora del día sin cambiar el día actual.

## Clima e iluminación

El estado ambiental es por escena y se calcula con el mismo reloj global. Los cambios se guardan con el estado de campaña; parar el servidor no acumula tiempo fuera de juego. Cambiar precipitación primero materializa el clima anterior, de modo que la nieve o el agua ya acumuladas no desaparecen al cambiar el control.

El amanecer, la mañana, el mediodía, el atardecer y la noche interpolan luz ambiental, luz directa y calidez. La escena obedece «Auto» o la hora manual elegida por el DM. Interiores y cuevas conservan sus fuentes locales; la niebla ambiental se añade a la niebla existente.

La cobertura visual de nieve y su espesor son valores separados. La cobertura completa tarda tres horas con nieve ligera, una hora con moderada y veinte minutos con fuerte. El espesor crece respectivamente a 0,6, 1,8 y 5,4 cm por hora. La nieve queda depositada al parar la nevada; el deshielo depende de la temperatura. A partir de 15 cm, el DM puede activar terreno difícil: sin esa decisión el color de la nieve no altera el movimiento.

La lluvia aumenta la humedad y forma charcos; con temperatura positiva ayuda a derretir la nieve. El control de temperatura regula el deshielo, y los objetivos de niebla/inundación llegan y se disipan gradualmente. La visualización es ambiental: no cambia visibilidad, daño, velocidad, dificultades ni reglas por sí sola.

Las escenas D8 reutilizan sus materiales exteriores; los campamentos usan la capa de clima existente para terreno, vegetación y cubiertas; los mapas 2D reciben manchas discretas por casilla. El Pecio aplica el ciclo de luz y niebla sobre su terreno y agua. Los efectos se actualizan en intervalos cortos, se comparten mediante el snapshot y no reconstruyen mapas ni guardados.

## Límites de aceptación

Las pruebas automatizadas cubren cálculo, comandos, permisos del canal, sincronización lógica, clima y persistencia. No comprueban el brillo percibido en un móvil concreto, el rendimiento térmico durante horas ni la lectura del proyector físico. Esas comprobaciones permanecen pendientes hasta abrir la candidata en el Pixel 9a, el MSI y la salida 1080p.
