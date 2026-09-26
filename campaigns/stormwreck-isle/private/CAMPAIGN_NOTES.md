# Notas privadas de DM y adaptación

**Actualización21/09/2026:** capítulo completo auditado en `PECIO_AUDIT_20260921.md` y arquitectura vigente en `PECIO_SPATIAL_PLAN.md`. Esos documentos sustituyen el alcance limitado a cubierta y las decisiones visuales antiguas inferiores («sin grid», low-poly y cofa solo decorativa). Se mantiene grid1,5m, dirección HD-2D, C1 con C4–C7 al mismo nivel y cuatro plantas. Los datos de fuente e informes de fichas inferiores conservan su fecha/alcance; no son nuevos resultados de esta auditoría.

Revisión técnica 2026-09-13: los hechos de fuente siguientes se conservan. Las menciones históricas a low-poly, rampas continuas y «sin grid» se sustituyen por `docs/TACTICAL_PIXEL_SPEC.md`: pixel art, grid permanente de 1,5 m, celdas/superficies y escaleras declaradas. No es un cambio de aventura.

Fuente: `OneDrive_1_12-9-2026/Aventura Los Dragones de la Isla de las Tempestades.pdf`, 64 páginas PDF. Páginas indicadas aquí son 1-based y coinciden con las impresas del capítulo. Leídos introducción/trasfondo (2–3), identidad de lugares (6,16–17,28–29) y capítulo completo del pecio (22–27); mapa 4 de p.25 revisado visualmente. No se afirma haber leído las 64 páginas completas. Manual del Jugador no encontrado y no necesario para esta Alpha sin automatización de reglas.

## Contenido oficial que condiciona la adaptación

- Pp.22–23: bajío al norte de la isla, rocas y huesos de dragón de oro; naufragio de hace unos cuarenta años. Casco sostenido sobre huesos, gran parte fuera del agua. Madera negra/verdosa, algas y percebes. No situarlo en playa tropical ni barco navegando.
- P.23 C1: entrada por jarcia al sur/estribor, cubierta principal central, palo mayor aún erguido y cofa a 15 m; restos recientes, barandillas rotas, accesos de proa/popa. Arpía ausente al llegar.
- P.23 C2: proa al este en mapa, trinquete roto inclinado, balista oxidada inutilizable.
- P.24 C3: popa al oeste, mástil roto, timón torcido con nombre incrustado en nácar e invertido. Girarlo lo desprende; sujetarlo se resuelve con salvación de Destreza CD 10 en mesa. Si cae, ruido alerta zombis de C4; no generar ataque automático.
- P.24 C4: camarote del capitán bajo popa, dos zombis a nivel 1 (tres a nivel 2); no trasladarlos silenciosamente a cubierta. C5 cocina, C6 tripulación, C7 comedor quedan fuera del recorrido Alpha.
- P.25: cuatro niveles/planta en mapa, casilla de 1.5 m. C8 inundada a poca altura y con enemigos; C9 es bodega sumergida. No poner cofre del capitán sobre cubierta.
- Pp.26–27: cofre/talismán y resolución de maldición son secretos de DM; no entran en UI pública ni inventario inicial.
- P.27: arpía vuelve tras encontrar cofre y regresar a C8, o al completar descanso en barco. Alpha permite al DM representar el descanso y después revelar, sin automatizar tiempo. Si la revela antes para demostración, señalar en DM que es puesta en escena de prueba. Variante nivel 2 tiene segunda arpía, fuera del alcance de demo.

## Adaptación visual/técnica declarada

La cubierta explorable combina C1/C2/C3 conservando orden, alturas y conexiones de escaleras. Aproximar huella según mapa, no declarar cotas exactas no medidas. Escaleras mediante rampas, caídas/natación/trepar cofa no simulados. Cofa visible y mástil oscilante sólo decorativo. Sin grid ni etiquetas C1/C2/C3 en Projector. No usar la página de mapa DM como textura pública.

Encuadre oblicuo desde sur permite leer proa a la derecha, popa a la izquierda y entrada por estribor; evitar que el mástil oculte personajes. Cámara de aproximación exterior y cámara principal comparten geometría. La proyección lateral no cambia puntos cardinales del pack.

Paleta propuesta: océano azul petróleo, espuma gris marfil, basalto antracita, madera negra/verde salino, huesos envejecidos claros; acentos de nácar en timón. Low-poly sobrio con superficies legibles y profundidad. Luz diurna velada por defecto para explorar; nocturno no debe adoptarse como canon obligatorio.

## Añadidos para inmersión (no hechos de aventura)

Loop musical original, capas separadas de oleaje/viento/madera, estado de tormenta conmutado por DM, partículas de salpicadura y niebla atmosférica sutil. La tormenta no es obligatoria en este encuentro. No inventar runas luminosas, cofres nuevos ni dragón vivo decorativo en el pecio.

## Identidad de otras localizaciones, sin construirlas aún

Retiro: paz, refugio, templo abierto y luz sobre basalto. Pleamar: basalto hexagonal, mareas, hongos bioluminiscentes y humedad; origen del gas reservado al DM. Observatorio: ruinas elevadas sobre pilares de basalto, mármol/vidrieras rotas, viento, cicatrices de relámpago y puentes mágicos. Mantener estos contrastes en futuros packs/escenas.

## Fichas locales

Archivos: Mike Mago Erudito (4 pp.), Mia Enano Clérigo (4 pp.), Maria Pies ligeros (4 pp.), Maria Pies ligeros Info (13 pp.), Ficha de personajes (5 pp.). Son escaneados: extracción de texto de primera página vacía. La lectura automática de campos no terminó y se canceló. Se renderizó y revisó visualmente la primera página de las tres fichas nominales; no se revisaron completas las fichas ni las hojas adicionales.

| Etiqueta de archivo (nombre de personaje vacío) | Datos visibles p.1 | Inventario básico verificado, subconjunto |
|---|---|---|
| Mike | Alto elfo, mago 1, erudito; PG máximos 8, CA 12, velocidad 9 m | Espada corta, saquito de componentes, libro de conjuros, mochila |
| Mia | Enano de las colinas, clérigo 1, soldado; PG máximos 11, CA 18, velocidad 7.5 m | Cota de malla, escudo, maza, hacha de mano, símbolo sagrado, mochila |
| Maria | Mediano piesligeros, pícaro 1, criminal; PG máximos 9, CA 14, velocidad 7.5 m | Armadura de cuero, arco corto, 20 flechas, 2 dagas, herramientas de ladrón, mochila |

PG actuales están vacíos en las tres hojas: inicializar a máximos es una decisión de demo, no lectura de ficha. Etiquetas Mike/Mia/Maria proceden del nombre de archivo, no del campo de nombre; permitir editarlas. Mostrar inventario como selección básica de Alpha sin afirmar que es completo. Velocidad de exploración visual puede fijarse a 3 m/s para todos, declarada adaptación y sin consumir turnos/reglas. No transcribir resto de fichas para Alpha ni pedir confirmación de campos irrelevantes.
