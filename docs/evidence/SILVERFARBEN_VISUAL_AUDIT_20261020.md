# Silverfarben Hotel — identidad, recortes y reproducción

Actualización posterior: conjurar, trepar, nadar, arrastrarse y cinco estados se sustituyen en [la entrega V4](SILVERFARBEN_V4_ACTIONS_20261020.md), con seis poses por secuencia. Las cifras y pendientes de abajo describen la entrega V3 anterior, no el catálogo final V4.

## Resultado

El PNG original `campaigns/one-shot/public/art/tokens/Silverfarben Hotel/silverfarben_hotel_base.png` es la autoridad de cara, cuerpo, piernas, ropa y libro. La especie de la ficha no se utiliza para reinterpretar el dibujo con piernas cortas, cabeza grande o torso redondo. El original no se ha sobrescrito. La altura física sigue siendo 1,37 m; no se han cambiado estadísticas ni reglas de movimiento.

Se aceptaron 17 PNG con 227 poses medidas (incluye cinco vistas neutras). Generación mediante `image_gen` integrada, no CLI/API externa. Prompts exactos, referencia y procedencia: `campaigns/one-shot/public/art/silverfarben-v3/provenance.json`.

- Reposo: pies apoyados y orientación persistente; cinco vistas base y tres simetrías explícitas.
- Caminar: se conservan las ocho poses auditadas por rumbo de `player-walks-v2`.
- Correr: seis poses nuevas por rumbo; cinco direcciones dibujadas y oeste/noroeste/suroeste simétricas. No es la caminata acelerada.
- Salto, daga y conjurar: seis poses por dirección; cinco vistas base y tres simetrías. Niebla y pluma comparten gesto corporal, con efectos independientes en el juego.
- Arco, lanzar daga y golpe sin armas: seis poses nuevas de vista frontal oblicua; arco y lanzamiento admiten el espejo lateral existente. No son ocho vistas independientes.
- Hablar, ayudar, influir, buscar, estudiar, interactuar, esquivar, preparar, reacción al daño y antorcha: seis poses por secuencia, de vista única. La reacción corporal se comparte entre tipos de daño; los VFX no se convierten en cuerpos distintos.
- Ocho estados: tres poses propias por estado (envenenada, asustada, paralizada, restringida, agarrada, hechizada, derribada e inconsciente). Las poses de suelo no se estiran hasta la altura de un personaje de pie.

## Correcciones técnicas

1. Recortes medidos por componentes alfa, con semillas explícitas para conservar cuerpo/libro y excluir vecinos. Se rechazaron borradores con cuerpos unidos entre filas, etiquetas, anatomía alterada o armas/manos cortadas. No se han añadido esos borradores al juego.
2. Escala isotrópica constante dentro de cada ciclo: no se ensancha el torso ni se estira una pose agachada para igualar alturas. Los objetos extendidos no deciden el tamaño del personaje.
3. Las flechas/dagas independientes de las láminas de cuerpo se excluyen: su movimiento corresponde al proyectil del mundo, no al recorte vecino.
4. La pose sentada pedía 1280 × 1280 sobre un PNG de 1254 × 1254. El recorte ahora respeta el archivo real, también en catálogos antiguos.
5. Encender antorcha se resuelve como `use-torch`, no como ataque de daga. Las campañas sin pose específica conservan una alternativa de interacción.
6. Acciones de una ejecución conservan el último fotograma, sin repetir impactos/igniciones durante la misma acción. La animación de salto sigue el progreso del desplazamiento real.
7. La cámara cambia la vista del gesto dirigido sin reiniciar su reloj ni cambiar el objetivo en el mundo.
8. Se reinstala el perfil visual después del catálogo de locomoción y de las actualizaciones del servidor; no se añaden actores ocultos ni se sustituyen skins personalizados.

## Comprobaciones

- Auditoría final: 154 clips/alias, 785 referencias de fotograma, 47 archivos referenciados; cero roles ausentes, archivos ausentes o recortes fuera de límites. Estos 785 no son 785 dibujos independientes.
- 53 pruebas enfocadas de animación/recortes/condiciones aprobadas. Tras añadir reposo neutro se repitieron las 26 afectadas, aprobadas.
- 23 pruebas del paquete/servidor D8 aprobadas, incluyendo las nuevas expectativas de carrera y ataques.
- Compilación de cliente y servidor preparada correctamente en `runtime/prepared-silverfarben-20261020-v3c`.
- Hojas de contacto y catálogo: `output/silverfarben-audit-20261020/final/` (diagnósticos ignorados por Git).
- Galería independiente servida por el mismo `/art`: `http://localhost:3000/art/silverfarben-v3/review.html`. Solo contiene el catálogo de Silverfarben; no conecta a sockets ni modifica la partida. HTML, JS y JSON respondieron HTTP 200. La automatización del navegador no logró abrir una pestaña; no se afirma una prueba visual end-to-end del navegador.

La mesa D8 del puerto 3000 estaba abierta. No se cerró, no se sustituyó `dist` y no se escribieron guardados. Para usar el nuevo motor de reproducción en la mesa hay que cerrar/reiniciar con `INICIAR.cmd`; la galería y los PNG ya son accesibles por `/art` sin reiniciar.

## Pendientes expresos

- Ampliar, con el mismo patrón anatómico, las secuencias originales conservadas de trepar, nadar, arrastrarse, sigilo y transiciones de caer/levantarse. No se simula esta ampliación duplicando fotogramas.
- Dibujar vistas traseras/laterales propias para arco, lanzamiento, puñetazo y gestos de interacción que hoy indican «vista única».
- Sustituir simetrías por dibujos propios si se exige mantener exactamente la lateralidad del rapado y el equipo.
- Afinar la alternancia y los apoyos de la carrera a cámara lenta en el mapa real; disponer de seis poses no garantiza por sí solo un ciclo biomecánico perfecto.
- Revisar la sincronía exacta del instante de suelta/golpe con los proyectiles/VFX del mundo, y comprobar oclusión/escala en los escenarios con la nueva versión activa.

## Reproducir la revisión

1. `python scripts/build-silverfarben-frames.py` (Pillow y NumPy): mide alfa y regenera `silverfarben-frames-v3.ts`; no altera los PNG.
2. `node node_modules/tsx/dist/cli.mjs scripts/audit-silverfarben-visuals.ts output/silverfarben-audit-20261020/final --publish-preview`: valida el catálogo en memoria y publica únicamente sus datos visuales de Silverfarben.
3. `node scripts/build-silverfarben-review.mjs`: compila la galería sin vaciar la carpeta de arte.
4. `python scripts/review-silverfarben-art.py output/silverfarben-audit-20261020/final`: regenera las hojas de contacto.
