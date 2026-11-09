# Mejora de fuego, humo e iluminación de fuentes de luz

**Fecha:** 08/11/2026  
**Líneas:** VIS-4 / VIS-5 (Iluminación viva, fuego, VFX atmosférico, VA-11, VA-12, VA-16)  
**Alcance:** Campamentos (`camp`), Retiro del Dragón (`dragon-rest`), Pecio (`wreck-ship`).  

---

## 1. Animación y estilo visual del fuego en todas las antorchas y fuentes
- **Materiales de llama (`M.flame`, `M.glow`, `retreat:torch:amber-flame`)**:
  - Tonalidades ajustadas hacia un espectro de combustión más vivo con núcleo de calor (`#ff9838` difuso, `#ff6418` emisivo reforzado a 0.85; `#ffd78a` y `#ff872b` en campamentos).
- **Animación y parpadeo**:
  - En [`retreat-wall-torches.ts`](file:///c:/Users/User/Desktop/Dungeons/campaigns/stormwreck-isle/public/retreat-wall-torches.ts), la oscilación simple previa (`sin(6.3 * t)`) se ha sustituido por oscilación compuesta de doble frecuencia (`sin(7.4 * t) * 0.075 + sin(13.8 * t) * 0.035`) combinada con inclinación lateral sutil (`rotation.z = sin(5.2 * t) * 0.04`) y contracción volumétrica en $X/Z$.
  - En [`a1-visuals.ts`](file:///c:/Users/User/Desktop/Dungeons/campaigns/camp-rests/public/a1-visuals.ts), las antorchas de pared y celdas reciben variación armónica en $Y$ y oscilación en $Z$.
  - En [`outdoor-visuals.ts`](file:///c:/Users/User/Desktop/Dungeons/campaigns/camp-rests/public/outdoor-visuals.ts), las antorchas y fogatas exteriores incorporan respiración en $X/Y$ con desfasaje por índice de antorcha.

---

## 2. Animación del humo de los fuegos
- **Emisión y dispersión (`a1:fire-smoke-vfx`)**:
  - Textura de partícula oscurecida sutilmente para mayor cuerpo (`rgba(125,115,102,.62)`).
  - Tasa de emisión aumentada de 12 a 14 part/s y capacidad a 88 partículas.
  - Añadida velocidad angular aleatoria (`minAngularSpeed = -0.4`, `maxAngularSpeed = 0.4`) para que las bocanadas de humo roten orgánicamente al ascender.
  - Expansión de escala aumentada (`minSize: 0.38`, `maxSize: 1.45`) con tiempo de vida extendido (hasta 4.1 s) y deriva ascendente con gravedad natural (`gravity.y = 0.065`).

---

## 3. Iluminación de todas las fuentes de luz
- **Calibración de intensidad y parpadeo sincrónico**:
  - Las fuentes puntuales asociadas a antorchas (`retreat:r3-wall-lamp-*`, `a1:room-*:torch-light`, `outdoor-visuals` point lights) incorporan parpadeo armónico de doble onda acoplado a la respiración visual de la llama.
  - Tono cálido con especular tenue cobrizo (`#ffbe78` / `#3d2817`) en lugar de negro plano, proporcionando rebote creíble en las superficies de piedra y madera circundantes sin invadir la oscuridad general.
  - En [`actor-light.ts`](file:///c:/Users/User/Desktop/Dungeons/campaigns/stormwreck-isle/public/actor-light.ts), la respuesta lumínica sobre personajes bajo luz artificial cálida se calibra suavemente a un multiplicador de 0.58.

---

## 4. Verificaciones
- **Tests dirigidos**:
  - `stormwreck-actor-light.test.ts`: PASS (6/6)
  - `camp-light-targets.test.ts`: PASS (2/2)
  - `actor-shadow.test.ts`: PASS (1/1)
  - `camp-polish.test.ts`: PASS (6/6)
- **Typecheck**: 0 errores en cliente y servidor.
- **Compilación de producción**: Vite y TypeScript server PASS.

## 5. Cierre localizado: antorchas del Retiro — 09/11/2026

Este apartado completa y comprueba **las once antorchas encendidas del Retiro**: cinco de fachada y una en cada una de las seis celdas. Mantiene su ubicación, soporte, luces existentes, rutas y colisiones. El trabajo anterior de Antigravity se conserva. Esta comprobación no acredita que todas las antorchas de otras escenas, los humos o todas las fuentes de luz de las dos campañas hayan sido revisadas visualmente.

| Identificador | Archivo propietario | Estado de partida → candidata | Referencia y aceptación |
| --- | --- | --- | --- |
| `retreat:torch:0:flame`…`retreat:torch:4:flame`; luces `retreat:r3-wall-lamp-0`…`4` | `campaigns/stormwreck-isle/public/retreat-wall-torches.ts` | Llama sencilla de Antigravity → llama afilada con degradado procedimental cálido; la luz existente acompaña el parpadeo. La pared, su recorte y los puntos de luz se conservan. | VA-11/12/16; contraste de luz cálida y entorno nocturno inspirado en REF-01. Comprobada técnicamente; aceptación visual del usuario pendiente. |
| `a1:room-1:torch-flame`…`a1:room-6:torch-flame`; luces `a1:room-N:torch-light` | `campaigns/camp-rests/public/a1-visuals.ts` | Llamas redondeadas previas → la misma familia cálida con la base fija; parpadeo sincronizado con la luz existente. Se mantiene la visibilidad de la habitación correspondiente. | Mismo criterio. Comprobación automática de las seis y revisión integrada de una celda; aceptación visual pendiente. |
| Material compartido `vtt:torch-flame-painted-v1` | `engine/client/torch-flame.ts` | Geometría de pocos polígonos y textura de color generada de 4 × 64 píxeles, compartida por escena. No se han incorporado imágenes comerciales ni bibliotecas nuevas. | Reducir la silueta simple sin añadir luces ni mallas. El acabado observado a distancia de juego es deliberadamente sutil y aún requiere valoración. |

**Comparación y movimiento.** El [informe visual](../../output/retreat-torches-20261108/index.html) reúne los originales del pasillo y de una celda, a 15°, 1280 × 720 y con la misma cámara y estado general, además de secuencias del parpadeo capturadas en el renderer real. Al pulsar sobre la imagen se alternan antes/después en el mismo rectángulo; hay ampliación y teclado. Los encuadres y hashes figuran en `originals.json` junto a las imágenes. Las partículas y fases de animación son variables, por lo que pueden diferir entre capturas. La base conserva copias de los dos archivos recibidos en `prototypes/retreat-torches-20261108/baseline/`.

**Pruebas técnicas.** Pasan 36 pruebas dirigidas, incluida la sincronización de la llama con su luz, movimiento reducido y ocultación de la pared. Compilan cliente y servidor. Diez comprobaciones con sockets reales sobre una partida aislada pasan para conexión de DM, ocupación exclusiva, permisos, dos escenas, movimiento en proyector, clima, reconexión y páginas compiladas; [registro](../../output/retreat-torches-20261108/network-smoke.json). La escena medida conserva 2.331 mallas y suma una textura compartida; no es una medición de FPS. Se abrió el Retiro en la mesa compilada de prueba. Las cuatro pantallas responden en la instalación del puerto 3000.

**Límites y diagnóstico independiente.** La prueba amplia de integración se detiene en el embarque de Mia en el Pecio: espera `main` (29, 20) y recibe `main` (29, 19). La misma prueba falla igual tanto con la compilación anterior como con esta candidata; queda pendiente investigar si es un fallo previo o una expectativa antigua. No se ha certificado rendimiento sostenido ni se ha comprobado en móvil o proyector físicos. La aceptación artística de las llamas, el humo y la iluminación global permanece pendiente.

**Instalación.** Candidata compilada desde el estado compartido existente e instalada con el puerto 3000 libre y sin mesas escribiendo en los guardados habituales. La compilación anterior se ha conservado en `runtime/previous-build-d055530a-1c7e-47ee-b960-d1dc5459a615`. El servidor de Stormwreck se ha iniciado en el puerto 3000.
