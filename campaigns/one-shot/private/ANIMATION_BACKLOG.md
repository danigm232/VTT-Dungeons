# D8 Night · notas de animaciones

## Entregado en la pasada actual

- Silverfarben Hotel: ciclos de caminar/correr por ocho rumbos, ataques, salto, trepar, nadar y sigilo; nuevo atlas con ciclos propios para conversación, búsqueda, estudio, interacción con objetos, esquiva y prepararse. Destrabarse usa ahora ciclos de paso orientados, no una pose fija.
- VFX de jugador auditados: el renderizador D8 ya muestra barrido e impacto de ataques cuerpo a cuerpo, vuelo/impacto de proyectiles, VFX de fuego y energía arcana, y nube de niebla. Los recursos de fuego, chispa arcana y humo ya existen en `public/art/vfx/d8-night`; no añadí copias innecesarias.
- Anteros: caminar, conversación, reacción/daño, transformación, espada, arco, flechas radiantes, pose sentado en la cena y pose inconsciente.
- Rosas asesinas y señorita Fritz: se conservan los ciclos existentes; el ataque de Fritz ahora usa una pose de golpe y no una pose de reposo.
- Café: ciclos de conversación, movimiento, bebida, servicio, reacción y golpes propios para la aldeana, el tabernero y el parroquiano.
- Mercado: los ataques de Ben, Margaret y Boris ya no reutilizan gestos de discusión; se conservan sus secuencias de entrega, negociación y manejo de la vaca.
- Vaca: reposo, caminar, reacción/impacto y resistencia.
- Escala revisada contra la cuadrícula D8 de 1,5 m: Silverfarben queda en 1,37 m (≈0,91 casillas); las figuras humanas usan la referencia de 1,65 m. Maria está marcada Pequeña, pero su ficha no indica altura; con su PNG propio, 0,94 m de lienzo producen una silueta visible de ≈0,9 m (≈0,6 casillas), valor visual provisional. En la entrega del 4 de octubre, Ben pasa a 1,28 m, Margaret a 1,32 m y la vaca a 1,35 m, estimaciones visuales con proporciones conservadas.
- Maria/Trinity ya usa en D8 una copia aislada de los 65 PNG de animación disponibles: ocho rumbos de caminar/correr y ataque con daga; arco, daga arrojadiza, sigilo, interacción, trepar, nadar, salto, daño, derribada e inconsciencia. Los originales de Stormwreck Isle no se modificaron.
- Correcciones de auditoría: parroquiano y vaca usan ahora sus reacciones existentes al recibir daño; no se reproduce un puñetazo ni se quedan en la pose base.

## Entrega adicional · 4 de octubre de 2026

La pasada de los seis puntos está documentada en ANIMATION_AUDIT_20261004.md. Se añadieron 200 poses PNG, controles locales completos, cobertura visible de acciones reales, recortes por silueta, orientación de PNJ, integración de despertar/levantarse y escala compatible con la cámara actual. No se reinició la mesa del puerto 3000.

## Cierre de la siguiente pasada · 4 de octubre de 2026

Los seis puntos anteriores están integrados. Detalle y verificaciones en `ANIMATION_CLOSEOUT_20261004.md`.

- 24 PNG nuevos, 736 poses transparentes. Carrera propia en ocho rumbos para ocho PNJ humanos, vaca y rosas; se conservan los ciclos de ambos jugadores.
- Saltar, trepar, nadar, esquivar, esconderse, buscar/estudiar, preparar, interactuar, caer y levantarse. Los gestos compartidos se identifican como reutilizados.
- Golpe sin armas propio para María/Trinity y Silverfarben, sin mostrar una daga. Flechas radiantes de Anteros y Enredar usan su pose correcta.
- Niebla, plumas y chispas autoritativas: reconexión, guardado, caducidad y cancelación de concentración. Son señales visuales; no automatizan consecuencias narrativas, visión, rituales ni reacciones situacionales.
- Transición de 90 ms entre estados, reloj por secuencia y sin reiniciar la textura en cada snapshot. Oclusión parcial muestreada; escala estable frente al zoom y a fotogramas recortados.
- Recorrido de acciones visibles, pausa/fotogramas, marcas persistentes y exportación. No se conceden poderes ni se gastan recursos durante la prueba local.
- El fallo antiguo de Stormwreck y las expectativas V40 se resolvieron en el trabajo compartido: la suite global de 326 pruebas pasó.

## Pendientes de aceptación, no de conexión

- Tu aprobación artística de los gestos mediante «Pruebas visuales de acciones». La cobertura automática no certifica que cada dibujo te guste.
- Confirmar alturas exactas de María, Ben, Margaret y vaca: siguen siendo estimaciones visuales, no modificaciones de sus reglas.
- Validar fluidez y sonido por escucha en el móvil/proyector físicos. El control del navegador permitió inspeccionar la consola, pero sus clics de prueba dieron timeout; no se declara aceptación visual completa.
- Más fotogramas, orientaciones dibujadas propias para cada gesto no locomotor y profundidad 3D de todos los VFX son mejoras posteriores, no requisitos de cobertura del catálogo actual.

Se conservan los originales y los cambios V41 del trabajo compartido. Los prompts finales están en `ANIMATION_PROMPTS_20261004.json`.
