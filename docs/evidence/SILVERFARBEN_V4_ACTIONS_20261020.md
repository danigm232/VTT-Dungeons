# Silverfarben V4 · nueve animaciones solicitadas

## Entrega

Sustituidas conjurar, trepar, nadar, arrastrarse, paralizada, restringida, agarrada, hechizada y derribada. Cada secuencia tiene seis dibujos distintos. Conjurar conserva cinco ángulos dibujados y tres vistas simétricas: son 13 PNG y 78 poses contando sus cinco ángulos, no 78 acciones diferentes.

La referencia de identidad es `campaigns/one-shot/public/art/tokens/Silverfarben Hotel/silverfarben_hotel_base.png`. Se preserva el original y el arte V3. No cambian la altura física (1,37 m), las estadísticas, los turnos ni los personajes presentes. Tampoco se cambian las imágenes de Trinity o de los PNJ.

Arte final, configuración por fase y prompts exactos en `campaigns/one-shot/public/art/silverfarben-v4/`. Generación con la herramienta integrada `image_gen`, no CLI ni API externa. Se rechazaron borradores con brazos duplicados, manos incompletas, recortes en el borde, anotaciones o estilos distintos. El nado definitivo se rehízo desde el original y su PNG de nadar; la última reparación amplió márgenes y completó el borde del libro.

## Aplicación y reutilización

- El instalador del perfil canónico sustituye los nueve roles y sus alias, después de instalar locomoción/combate. Se reaplica al recibir catálogos del servidor y respeta skins personalizados.
- Conjurar se reproduce una vez y conserva las vistas relativas a la cámara; niebla/pluma comparten cuerpo con efectos independientes.
- Trepar alterna el brazo que alcanza; nadar cambia brazada y patada; arrastrarse mantiene el torso pegado al suelo y alterna el brazo adelantado. Son poses dibujadas, no fotogramas repetidos para inflar la cuenta.
- Los cinco estados nuevos se reproducen como bucles de seis poses; la rigidez de paralizada conserva variaciones pequeñas, no una oscilación grande. `prone` usa la misma secuencia de derribada, y `apresada` continúa resolviéndose como restringida.
- Recortes por componentes alfa con semillas de cuerpo y libro: se excluyen restos de los vecinos incluso si sus cajas rectangulares se solapan. Se rechazan siluetas cortadas en el borde y cuerpos conectados accidentalmente.
- Escala isotrópica constante dentro de cada lámina. Alturas anatómicas equivalentes medidas visualmente: trepar 430, nadar 460, arrastrarse 500 y derribada 560 píxeles fuente. No se amplía un cuerpo tendido hasta la altura de una figura de pie. Los dos últimos valores se corrigieron después de compararlos en el navegador.

## Verificación

- Medición de los 13 PNG: 78 poses, sin duplicados exactos, siluetas cortadas o vecinos unidos.
- Auditoría de todo el catálogo de Silverfarben: 154 clips/alias, 815 referencias de fotograma y 47 PNG referenciados. Cero roles, archivos o recortes fuera de límites detectados. Estas 815 referencias no son 815 dibujos independientes.
- 78 pruebas aprobadas en nueve archivos de cliente y servidor, repetidas tras el ajuste final de escala. Cubren recortes/semillas/escala, condiciones, ocho direcciones de conjurar, reproducción de una sola ejecución, reposo/locomoción, otros personajes y el paquete D8.
- Tipado de cliente y servidor correcto. Compilación aislada de cliente/servidor en `runtime/prepared-silverfarben-20261020-v4c`.
- Revisión real del navegador: filtro de las nueve acciones, cámara lenta, pausa y recorrido hasta la sexta pose. Captura en `output/silverfarben-v4/review-final.jpg`; hojas de contacto en `output/silverfarben-v4/final/`.

## Cómo verlo

La galería mantiene la ruta `/art/silverfarben-v3/review.html`, aunque sus datos iniciales ya son V4. Publica únicamente el catálogo visual de Silverfarben, no el estado de la partida. Incluye original, reposo, filtro de las nueve acciones, todas las animaciones, dirección, giro de cámara, velocidad, pausa, posición y nombre de la fase.

El servidor de la mesa del puerto 3000 estaba cerrado durante la comprobación final. Se dejó un visor estático de solo lectura en `http://127.0.0.1:4602/art/silverfarben-v3/review.html`, iniciado con `node scripts/serve-silverfarben-review.mjs`. No ocupa el puerto de la mesa ni carga sockets, personajes o guardados. No se cerró ninguna mesa ni se modificaron guardados ni `dist`.

Para utilizarlo en la mesa normal, abrir `INICIAR.cmd`: compila y activa las fuentes actuales mediante su procedimiento habitual. La candidata aislada no se activó durante esta revisión.

## Límites expresos

Trepar, nadar, arrastrarse y los estados revisados siguen teniendo una vista propia, no ocho ángulos completos. La cámara lenta permite seguir afinando apoyos, transición entre ciclos y uniformidad del dibujo; seis poses no convierten la ilustración en una animación esquelética. Queda por verificar la oclusión y el contacto exacto con superficies en los mapas reales con esta versión activa. No se declara esa prueba de mapa completada a partir de la galería.

## Reproducir

1. `python scripts/build-silverfarben-v4.py` (Pillow y NumPy): mide los PNG y genera los recortes, sin editar los píxeles.
2. `node node_modules/tsx/dist/cli.mjs scripts/audit-silverfarben-visuals.ts output/silverfarben-v4/final --publish-preview`.
3. `node scripts/build-silverfarben-review.mjs`: compila el visor sin vaciar el directorio de arte.
4. `node scripts/serve-silverfarben-review.mjs`: sirve solo el arte en el puerto local 4602.
