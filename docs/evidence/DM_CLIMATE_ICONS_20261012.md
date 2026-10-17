# Climatología con iconos en las dos consolas DM

Esta nota recoge la primera fase visual. La auditoría posterior del motor, reloj, nieve y sonidos está en [CLIMATE_UNIFIED_AUDIT_20261012.md](CLIMATE_UNIFIED_AUDIT_20261012.md); sustituye las referencias de esta nota a tres tipos de precipitación y a una fuerza de tormenta separada.

La barra lateral y la consola móvil comparten botones con dibujos SVG, etiquetas breves y selección dorada. Hora del día: según reloj, mediodía, atardecer, noche y madrugada. Precipitación: despejado, lluvia y nieve. Intensidad: suave, media e intensa.

Viento, niebla, oleaje, inundación y fuerza de tormenta también tienen opciones visuales. Se conserva el ajuste automático del mar y la temperatura precisa en grados. La climatología aparece antes que el reloj en ambas interfaces.

Los botones utilizan los manejadores de cambio existentes y los valores recibidos del servidor. Se conserva la sincronización con la otra consola, jugadores, proyector y audio. No hay cambios a reglas, protocolos ni guardados en este trabajo.

## Comprobaciones

- Tipado de cliente y compilación de servidor correctos.
- Primera compilación web: 2205 módulos, 2 min 36 s.
- Chrome, partida temporal aislada: seleccionar atardecer, lluvia e intensidad intensa en la barra lateral aparece también en la consola móvil.
- Seleccionar noche, nieve, intensidad suave y viento fuerte en móvil se refleja en el ordenador (night, snow, 1, 0.85).
- Revisión inicial a 390 px: botones de hora, precipitación, intensidad y viento visibles y legibles. Se ajustó el texto de madrugada para evitar que la última letra bajase a otra línea en la barra lateral.

Se mantiene la partida del servidor de puerto 3000. Las pruebas de interacción se hicieron en otra partida y los cambios ajenos del árbol de trabajo se conservan.
