# D8 Night · biblioteca de audio

Estado de la biblioteca tras incorporar la tanda descargada. Los originales importados siguen siendo MP3: ya están comprimidos y no los he vuelto a codificar para evitar pérdida de calidad sin una escucha y comparación previas.

## Archivos incorporados

| Archivo local | Uso en la consola | Fuente |
| --- | --- | --- |
| `public/audio/d8-night/ambience/d8-night-loop-tavern-openfire.mp3` | Capa Taberna del preajuste; pista larga seleccionada. Se combina con viento frío bajo. | [Tavern ambience with openfire effect · Placidplace](https://pixabay.com/sound-effects/tavern-ambience-with-openfire-effect-no-loops-86151/) |
| `public/audio/d8-night/ambience/d8-night-ambience-tempest-rain-wind.mp3` | Estado «Temporal» (intensidad alta) en D8; máster compuesto provisional. | [Rainstorm with wind · DRAGON-STUDIO](https://pixabay.com/sound-effects/nature-rainstorm-with-wind-351117/) |
| `public/audio/d8-night/sfx/d8-night-sfx-attack-whip-crack.mp3` | Ataques/enredos de las rosas; se dispara como efecto breve, nunca en bucle. | [Mixed Whip Crack 1 · peterbullmusic](https://pixabay.com/de/sound-effects/film-spezialeffekte-mixed-whip-crack-1-102825/) |
| `private/audio/archive/sfx/unused/d8-night-sfx-attack-plant-impact.mp3` | Alternativa descartada: para las rosas se eligió el latigazo; se conserva fuera de `public`. | [Hit Tree 01 · u_xjrmmgxfru](https://pixabay.com/sound-effects/film-special-effects-hit-tree-01-266310/) |
| `public/audio/d8-night/sfx/d8-night-sfx-ice-shatter.mp3` | Grieta/quiebre del espejo; ocupa el ID existente para evitar un botón duplicado. | [Shattering Ice · DRAGON-STUDIO](https://pixabay.com/sound-effects/shattering-ice-454251/) |
| `public/audio/d8-night/sfx/d8-night-sfx-step-ice.mp3` | Pisada de la escena del espejo; el motor la mantiene solo durante el movimiento de la ficha. | [Two step on thin ice · spinopel](https://pixabay.com/pt/sound-effects/two-step-on-thin-ice-456407/) |
| `public/audio/d8-night/sfx/d8-night-sfx-bow-release.mp3` | Primer tramo del disparo con arco. | [Bow release, bow and arrow 4 · freesound_community](https://pixabay.com/sound-effects/film-special-effects-bow-release-bow-and-arrow-4-101936/) |
| `public/audio/d8-night/sfx/d8-night-sfx-arrow-swish.mp3` | Vuelo de flecha, después de soltar la cuerda. | [Arrow Swish 03 · DJARTMUSIC](https://pixabay.com/sound-effects/film-special-effects-arrow-swish-03-306040/) |
| `public/audio/d8-night/sfx/d8-night-sfx-arrow-hit.mp3` | Impacto de flecha solo si el ataque acierta. | [Arrow hit · 49053354](https://pixabay.com/sound-effects/film-special-effects-arrow-hit-307490/) |
| `public/audio/d8-night/sfx/d8-night-sfx-market-cow-moo.mp3` | Mugido puntual recomendado en Mercado y asociado a interacciones de la vaca; no se reproduce constantemente. | [Cow Moo · Universfield](https://pixabay.com/sound-effects/nature-cow-moo-122255/) |

El mugido alternativo se conserva fuera de la biblioteca activa, en `private/audio/archive/alternates/d8-night-sfx-market-cow-moo-alternate.mp3`, para que no haya dos botones casi iguales. [Cow Moo 1 · DRAGON-STUDIO](https://pixabay.com/sound-effects/nature-cow-moo-1-472361/).

## Conexiones y decisiones

- Taberna usa la pista de 4:40 elegida como capa de escena y conserva viento nocturno suave en otra capa. El archivo es largo y la página lo presenta como «no loops»; no he podido verificar aquí mediante escucha que toda la pista mantenga el tono triste y sin voces. Conviene probarla antes de la partida. Sillas, vasos y bebida siguen siendo efectos manuales puntuales; falta descargar el tosido aislado.
- Jardín recomienda latigazo y golpe de vegetación. La acción de enredar de las rosas reproduce el latigazo automáticamente.
- Los disparos con arco encadenan cuerda → vuelo → impacto (solo con acierto). Un `soundId` explícito de una acción conserva prioridad.
- El Espejo usa pisadas de hielo mientras se desplaza y el quiebre de hielo en vez del antiguo impacto genérico de piedra.
- Mercado recomienda el mugido. Las animaciones «guiar vaca» y «tirar vaca» también lo disparan puntualmente.
- Llovizna y Tormenta conservan sus fuentes actuales. El estado alto «Temporal» usa por ahora Rainstorm with Wind; los controles/capas independientes de lluvia, tormenta y viento siguen siendo la siguiente mejora, no una separación que este archivo pueda ofrecer.

Los nuevos archivos activos suman 15.332.511 bytes (unos 14,6 MiB); el ambiente de taberna (8,96 MB) y el temporal (5,98 MB) concentran casi todo. El resto son efectos breves. No se duplicó el mugido alternativo en la consola. Las páginas de Pixabay indican uso bajo [Pixabay Content License](https://pixabay.com/service/license-summary/); se guardan los enlaces de origen aquí para atribución y trazabilidad.
