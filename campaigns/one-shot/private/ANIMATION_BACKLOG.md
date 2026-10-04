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

## Para una siguiente pasada

- Completar las acciones que ahora aparecen explícitamente como «falta»; no confundir una secuencia reutilizada con una acción dibujada propia.
- Añadir ciclos propios de carrera para ocho rumbos de todos los PNJ; algunos rumbos reutilizan caminar acelerado.
- VFX específicos de plumas/chispas presentes en la prueba local; falta llevar su duración y finalización persistente al estado de la partida, sin automatizar consecuencias que decide el DM.
- Transiciones de entrada/salida entre movimiento, acción y condición; oclusión parcial en vez de ocultación completa cuando sólo se tapa una parte del cuerpo.
- Confirmar alturas exactas: las de María, Ben, Margaret y vaca son estimaciones visuales, no modificaciones de sus reglas.
- La suite global tiene un fallo ajeno a D8 en el catálogo anónimo de Stormwreck (wreck-m3.test.ts). Coordinar con ese proyecto; no modificarlo desde esta entrega.

Mantener los cambios de arte en campaigns/one-shot y preservar los trabajos paralelos en el motor y otras campañas. Activar la mesa habitual con INICIAR-ONE-SHOT.cmd cuando esté libre.
