# Fauna de fondo · bosque de Pleamar

Modelos aportados por el usuario para esta integración:

- `quaternius_cc0-deer-908.glb` — Quaternius CC0.
- `quaternius_cc0-stag-1373.glb` — Quaternius CC0.

Los GLB originales se conservan sin modificar. En tiempo de ejecución Babylon reduce el brillo especular, eleva la rugosidad y aplica un matiz boscoso ligero. Se conservan `Idle`, `Idle_2`, `Idle_Headlow`, `Eating`, `Walk` y `Gallop`; los clips de combate y muerte se descartan. El animal alterna reposo y ramoneo cuando se detiene; `Walk` se usa solo al avanzar y, ocasionalmente, `Gallop` al alejarse.

La fauna es VTT_AMBIENCE: ambos animales recorren las franjas arboladas exteriores, siempre fuera de la cuadrícula y con un margen mínimo de 1,25 m respecto a ella. Se detienen fuera del espacio jugable y se marchan hasta ocultarse entre los árboles. Solo se muestra un animal cada vez y las apariciones están espaciadas. Los recorridos usan curvas suaves y velocidad constante, ajustada a `Walk` o `Gallop`; reposan o ramonean sin pisar el mapa. No añade colisiones, puntos interactivos, combate ni efectos sobre descansos.
