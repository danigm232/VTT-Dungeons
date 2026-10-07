# Auditoría de la biblioteca SFX

Revisión: 2026-10-03. Este inventario cubre D8 Night y Stormwreck Isle.

## Consola del DM

Los efectos con `manual: false` se mantienen en el catálogo para que el motor
pueda reproducirlos, pero no generan botones repetidos en la consola. Se usan
para pasos y superficies, la secuencia automática del arco, ataques y conjuros
que ya se disparan con las animaciones, e interacciones de libro/equipo. Si uno
de esos bucles antiguos sigue activo, la consola conserva su control para poder
detenerlo. Los demás sonidos siguen disponibles como disparadores manuales.
Las recomendaciones manuales por escena también se han depurado para no
prometer botones de efectos que ahora dispara automáticamente el juego.

- D8 Night: 52 entradas de catálogo; 31 botones manuales.
- Stormwreck: 42 entradas de catálogo; 30 botones manuales.

Las bibliotecas activas ya no repiten una misma URL con nombres distintos. En
Stormwreck se separaron los clips específicos de daga, bloqueo, magia, criaturas,
barco, cerradura y equipo; los dos gemidos de zombi y los sonidos de gul/derrota
apuntan a archivos distintos. El ruido de paso de basalto duplicado no se usa
como segundo botón.

Los directorios públicos de SFX quedaron alineados con el catálogo: 52 archivos
para D8 Night y 42 para Stormwreck, sin duplicados exactos por contenido en
ninguna de las dos bibliotecas. No se fusionaron las copias necesarias entre
campañas: cada una sirve sus propios archivos públicos y depende de esas rutas.

## Archivos apartados

- El audio de vegetación quedó fuera del catálogo: se eligió el latigazo para
  los ataques de las rosas. El MP3 se conserva en el archivo privado de D8.
- El ZIP original y los 24 WAV de trabajo del paquete de zombis (51 archivos
  con sus metadatos, 9.802.713 bytes) estaban dentro de `public`, aunque el
  juego solo usa los WAV exportados y renombrados. Se trasladaron a
  `private/audio/_sources` para que no se sirvan con la campaña.
- Los 32 SFX locales de Stormwreck sin URL activa (1.263.192 bytes) se
  preservan en `private/audio/archive/unused-sfx`; los archivos originales no
  se borraron.
- El impacto alternativo de vegetación de D8 (29.184 bytes) quedó en
  `one-shot/private/audio/archive/sfx/unused`: se eligió el latigazo para las
  rosas.

## Revisión de procedencia IA

El alternativo «Cow Moo 1 · DRAGON-STUDIO» está marcado como generado por IA en
su ficha de Pixabay y ya está archivado; además, duplicaba el mugido elegido.
El sonido activo «Cow Moo · Universfield» no muestra esa marca en su ficha.
También se revisaron las fichas de «Shattering Ice», «Rainstorm with Wind»,
«Mixed Whip Crack 1», «Hit Tree 01» y «Sword Clash/Hit»: no aparece en ellas la
etiqueta de audio generado por IA. Esta comprobación se basa en la etiqueta de
Pixabay, no en una escucha/peritaje de cada archivo.

Fuentes consultadas:

- [Cow Moo 1 · DRAGON-STUDIO](https://pixabay.com/sound-effects/nature-cow-moo-1-472361/)
- [Cow Moo · Universfield](https://pixabay.com/sound-effects/nature-cow-moo-122255/)
- [Shattering Ice](https://pixabay.com/sound-effects/shattering-ice-454251/)
- [Rainstorm with Wind](https://pixabay.com/sound-effects/nature-rainstorm-with-wind-351117/)
- [Mixed Whip Crack 1](https://pixabay.com/de/sound-effects/film-spezialeffekte-mixed-whip-crack-1-102825/)
- [Hit Tree 01](https://pixabay.com/sound-effects/film-special-effects-hit-tree-01-266310/)
- [Sword Clash/Hit](https://pixabay.com/sound-effects/film-special-effects-sword-clashhit-393837/)
