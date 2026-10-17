# Auditoría de climatología unificada · 12 octubre 2026

## Problemas encontrados y correcciones

- La fuerza de tormenta y la intensidad de precipitación podían discrepar. Ambos paneles utilizan ahora cinco modos y una sola intensidad: despejado, lluvia, nieve, tormenta eléctrica y temporal de lluvia/viento. La lluvia intensa por sí sola no activa truenos. Temporal se distingue de tormenta eléctrica y no produce relámpagos.
- Los cambios independientes de niebla, viento o temperatura reenviaban un valor de tormenta que podía estar obsoleto. Se envía únicamente el campo editado y el servidor resuelve la transición común.
- Los iconos de hora solo forzaban la iluminación. Ahora avanzan el reloj real a la próxima ocurrencia: mediodía 12:00, atardecer 19:00, noche 22:00 y madrugada 05:00. Si la hora ya pasó, se utiliza el día siguiente; no se rebobina la acumulación. La iluminación continúa siguiendo el reloj después del salto. Elegir hora no concede curación ni beneficios de descanso.
- La nieve no cuaja por encima de 2 °C. Seleccionar nieve desde los iconos utiliza -4 °C si la temperatura existente era cálida, salvo temperatura explícita en el mismo cambio. Ajustar posteriormente la temperatura sigue siendo posible y el panel advierte cuando no cuaja.
- El Retiro podía tener precipitación y nieve registrada, pero su capa de suelo genérica no la dibujaba. Se añade nieve sobre superficies exteriores orientadas hacia arriba mediante el material existente, respetando coberturas e interiores y sin duplicar las capas propias de campamentos, Pecio o D8.
- El cliente conservaba una estimación anterior después de saltar horas/cambiar clima o escena. Se invalida esa estimación para aplicar inmediatamente el estado acumulado del servidor.
- La niebla del Pecio se oscurecía con una fuerza de tormenta antigua incluso con tormenta desactivada. Las descargas aleatorias del Observatorio aparecían también con cielo despejado. Se condicionan ambos efectos al estado climático correspondiente.
- El resumen del proyector y jugador usa los mismos nombres que las consolas. Un ambiente sonoro móvil no corta la capa activa de lluvia/nieve.

## Nieve y tiempo

Con temperatura fría y dos horas de juego, sin capas previas:

| Intensidad | Cobertura | Profundidad |
| --- | --- | --- |
| Suave | 67 % | 1,2 cm |
| Media | 100 % | 3,6 cm |
| Intensa | 100 % | 10,8 cm |

Son tasas de simulación del VTT, no medidas meteorológicas. El estado acumulado permanece en el guardado; al subir la temperatura se derrite. El reloj pausado no acumula por tiempo real, pero un avance explícito de horas sí integra ese intervalo.

## Sonidos

Se reutilizan grabaciones ya presentes en la biblioteca, sin descargar duplicados externos:

- Lluvia: lluvia costera / llovizna de cada campaña; volumen según intensidad.
- Nieve: viento frío del Observatorio / icy wind, también audible con viento general en calma.
- Tormenta eléctrica: lluvia y truenos de kindland, CC0, [fuente](https://opengameart.org/content/rain-and-thunders).
- Temporal: lluvia y ráfagas de DRAGON-STUDIO, licencia Pixabay, [fuente](https://pixabay.com/sound-effects/nature-rainstorm-with-wind-351117/).
- Despejado: se detiene la precipitación sonora y se conserva el ambiente apropiado de escena. Viento y mar siguen siendo capas independientes.

Las dos pistas que faltaban en el catálogo de Stormwreck se copian desde la biblioteca D8 existente. Sus créditos figuran en `campaigns/stormwreck-isle/public/STORMWRECK_AUDIO_CREDITS.md`.

## Verificación

- 122 pruebas relevantes del servidor, persistencia, protocolo, reloj, clima y materiales pasan; además pasan 15 pruebas existentes de campamentos, precipitación y acumulación D8: 137 en total.
- Compilación de servidor y tipado de cliente correctos. Compilación web de producción revisada en partida temporal aislada.
- Chrome real: seleccionar mediodía en escritorio cambia el reloj a 12:00; nieve media + avanzar 120 minutos llega a 14:00, cobertura 100 %, profundidad 3,6 cm y terreno exterior blanco en el Retiro. La consola móvil recibe el mismo estado.
- Chrome a 390 × 844: iconos de hora con su hora, cinco modos, intensidad y viento legibles.
- Elegir temporal y atardecer en móvil se refleja en escritorio a las 19:00 con descripción de lluvia/viento sin relámpagos.
- Sin errores de consola de DM ni del proyector durante la revisión de nieve/temporal. Los tests verifican archivos de audio existentes y cuatro pistas distintas en ambas campañas. No se afirma escucha física en cada dispositivo: el navegador necesita activar el sonido del proyector.
- No se modifican partidas reales para las pruebas; se usa una carpeta temporal y otro puerto. Se conservan los cambios ajenos del árbol de trabajo.
- Los cuatro archivos climáticos se sirven con HTTP 200 y tipos de audio correctos. La compilación final se copia a `dist/web` y se verifica por SHA256. Se inicia el servidor actualizado de Stormwreck en puerto 3000, que estaba libre, con el guardado habitual; no se aplican allí los comandos de clima de la prueba.

Evidencia visual: `CLIMATE_SNOW_2H_20261012.png` y `CLIMATE_UNIFIED_MOBILE_20261012.png`.
