# Caminatas Trinity / Silverfarben · 2026-10-12

## Hallazgos corregidos

- Trinity: el antiguo noroeste reutilizaba una fila frontal; oeste y suroeste no tenían perfiles corporales suficientemente diferenciados. Recortes rectangulares dejaban fragmentos de poses vecinas.
- Silverfarben: rumbos delanteros/laterales reutilizados, diagonales traseras mal espejadas y ciclos con poca variedad de apoyo. Una orden genérica de correr podía bloquear la vista frontal mientras el actor se desplazaba hacia otro rumbo.
- Cambiar W → W+A o girar la cámara reiniciaba el reloj del caminar. Ahora se conserva la fase normalizada de la zancada, también al cambiar caminar/correr. Paradas, ataques, asientos y condiciones reinician su propio reloj.

## Recursos e integración

ImageGen integrada, usando las bases originales como referencia; no se modificaron los PNG originales. Se generaron 16 candidatos y se aceptaron 14 atlas RGBA de 1536 × 1024, ocho poses cada uno: 112 dibujos aceptados. El este candidato de Trinity y el suroeste candidato de Silverfarben se rechazaron por orientación incorrecta; esos rumbos utilizan respectivamente oeste/sureste espejados. Son 16 vistas de ocho fotogramas, no 128 dibujos únicos.

- D8: `campaigns/one-shot/public/art/player-walks-v2/`.
- Copias idénticas de Trinity para Stormwreck: `campaigns/stormwreck-isle/public/art/player-walks-v2/`.
- Prompts exactos, referencias, candidatos y destinos: [PLAYER_LOCOMOTION_PROMPTS.json](PLAYER_LOCOMOTION_PROMPTS.json).
- Metadatos: `engine/client/player-walk-frames.ts`; auditor de conectividad alfa sólo de lectura: `scripts/audit-player-walks.py`.
- Instalador reusable: `engine/client/player-locomotion.ts`, en packs estáticos, carga de API y actualización del catálogo al recibir snapshots. No añade actores ocultos y no se aplica si cambia su skin base.

Se aíslan siluetas conectadas mediante semillas alfa, conservando libros/piezas deliberadas y quitando fragmentos ajenos. El pivote horizontal sigue el centro de las caderas; los pies quedan anclados al suelo. Una escala por atlas se calcula contra la mediana de altura corporal: no se estira cada pose para disimular su movimiento. No se modifica la talla física del personaje ni el zoom de la cámara.

Caminar: ocho fotogramas a 16 fps, ciclo de 0,5 s. Correr reutiliza esas poses a 20 fps, ciclo de 0,4 s; **no es un sprint nuevo dibujado**. Ataques, gateo, estados, poses de asiento y acciones de campamento conservan sus recursos y prioridades existentes. No se reauditan todas las acciones de juego en esta revisión de caminatas.

## Revisión visual y límites

El visor aislado [facing-review](http://127.0.0.1:4598/scripts/facing-review.html) usa los mismos packs, recortes, semillas y espejado que el juego. Añade caminar/correr/reposo, cámara lenta, pausa y avance por fotograma. La escala se mantiene constante dentro del ciclo; no oculta diferencias de altura ajustando cada imagen. Las tarjetas muestran rumbo mundial y vista relativa a la cámara por separado. No conecta sockets ni escribe guardados.

Se comprobaron en navegador las ocho vistas de los dos personajes, transparencia sobre fondo oscuro, perfiles laterales y poses de ambas mitades del ciclo. Las pruebas cubren todos los rumbos y ocho orientaciones de cámara, fase al girar/cambiar velocidad, parada dentro/fuera de combate, orden genérica de correr, prioridad de ataques/asientos/estados, compatibilidad con API antigua, crops/semillas/talla y copias idénticas entre campañas.

Son ciclos 2D ilustrados, no un rig 3D ni una animación certificada como anatómicamente perfecta. Un sprint con poses propias y vistas sin espejado para las dos excepciones serían mejoras posteriores, no entregables de esta tanda.

Resultado final: 53 pruebas focalizadas superadas (7 archivos), tipos cliente/servidor correctos y build de producción completado. El servidor de `localhost:3000` sirve `dm-BB-bLp89.js`, `player-C3Z_BOlx.js` y los atlas nuevos (HTTP 200). El instalador cliente actualiza también el catálogo antiguo del API al cargar la página; no hace falta alterar guardados. No se han editado los cambios ajenos de geometría/clima del workspace. Durante una ejecución intermedia su pack Stormwreck estuvo temporalmente inválido por una barandilla; la repetición final pasó con el pack ya corregido, sin intervenir sobre esa geometría.
