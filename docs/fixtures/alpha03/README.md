# Ejemplos de diseño Alpha 0.3

Todos los datos son sintéticos. No son una partida del usuario ni guardados reales de 0.2.1. `bundle.json` define una campaña de dos salas, dos personajes y una criatura opcional; sus URLs art/audio son placeholders, no recursos para navegador. `save-v1.json` es un checkpoint completo contra ese bundle, con PG/inventario modificados, puerta privada locked en sala activa y objetos modificados en sala inactiva. `save-v0.json` es el mismo estado sin cámara, bajo el legado sintético0 especificado; la migración añade fixed/null y produce exactamente v1, incluido checksum.

`door-geometry.json` especifica coordenadas propuestas de la puerta real, no una captura ni el arte corregido. Las posiciones de bisagra/lienzo y mount se comprueban contra la cuadrícula del pack compilado actual.

Desde raíz del proyecto ejecutar `node scripts/check-alpha03-design.mjs` con el build RC1 existente. Sólo lectura: verifica hashes/migración de ejemplo, referencias y geometría de fixtures con helpers del build; **no implementa ni certifica SaveStore, red v4, fallos de disco, nuevas imágenes o pruebas físicas**. Sol convertirá estos casos en tests de producción y no usará el comprobador de diseño como sustituto de P01–P15/D01–D06.
