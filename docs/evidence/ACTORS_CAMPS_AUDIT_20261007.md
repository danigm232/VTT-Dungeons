# Personajes, nitidez e interacciones de campamento · 2026-10-07

Cierre y comprobación de interfaz: 2026-10-08.

## Alcance y conservación

Revisión de Stormwreck y del render compartido con D8. Se conservan el trabajo previo de campamentos, el mapa canónico del Retiro, las celdas transitables, la cuadrícula de 1,5 m y las partidas reales. Las pruebas usan procesos, puertos, builds y guardados aislados; no se ha reiniciado ni manipulado la mesa del puerto 3000.

## Ajustes realizados

- Pies apoyados en el alfa visible de cada imagen, no en su margen transparente. La calibración de cada secuencia de pie toma su primera pose y no cambia el tamaño físico durante la respiración.
- Alturas visuales de Mike 1,8 m, Mia 1,3 m y Trinity 1,05 m. Son calibraciones artísticas, no cambios a FUE, alcance, movimiento ni estadísticas. Los retratos SVG de PNJ usan un tamaño de marcador, no una falsa altura humana.
- Asientos Stormwreck centrados en el banco real, con altura de asiento y sombra en el suelo; la casilla lógica sigue siendo la autorizada por el servidor.
- Cámara inicial del Retiro y de tres campamentos orientada desde el lado abierto, evitando ocultar al grupo detrás del relieve o la tienda norte. A1 y bosque mantienen sus frentes adecuados. WASD y joystick siguen usando el ángulo visible de la cámara.
- Personajes y accesorios comparten la profundidad de Babylon con el escenario. No se dibujan por encima de paredes para simular visibilidad. Los gestos inclinan la figura alrededor de los pies.
- PNG con mipmaps y filtrado trilineal/anisotrópico; lienzo sin el antiguo submuestreo de D8 y móvil. Densidad de pantalla limitada a 1,5 en escritorio y 1,25 en compacto para acotar coste.
- Botones «Detalle» y «Conjunto» en DM y jugador. El primero busca 90–150 píxeles de altura proyectada, sujeto al límite de zoom del mapa, sin cambiar sus metros; el segundo vuelve al encuadre inicial.

## Actividades y consecuencias

| Objeto | Acciones y representación |
| --- | --- |
| Hoguera/olla | Calentarse; cocinar con cuchara y vapor; avivar con atizador y brasas. Alcance respecto al fuego real desde cualquiera de sus lados. |
| Cama/tienda | Preparar el lecho, pausa, revisar el refugio. Manta que se despliega, almohada y gesto de descanso. |
| Equipo de Mike | Estudiar con libro y páginas animadas; revisar equipo. |
| Equipo de Mia | Orar con símbolo sagrado; revisar equipo. |
| Equipo de Trinity | Revisar herramientas con utensilios animados; revisar equipo. |
| Puesto de guardia | Vigilar con farol oscilante. |
| Asiento | Sentarse/levantarse con la pose existente y ocupación autorizada. |
| Baúl | Apertura/cierre animado y revisión sin cambiar la mochila. Revisarlo no lo cierra y su estado sobrevive al límite del historial. |

Hay once actividades nuevas de ambiente, además de sentarse y abrir/cerrar. El jugador las elige al acercarse e interactuar. El DM puede ejecutarlas sobre un jugador presente, cercano y autorizado en el diálogo del objeto. Catálogo compartido por servidor y pantallas: no se ofrecen acciones que el servidor no valida.

Se comprueban escena, superficie, proximidad, propiedad, movimiento, combate, PG e incapacidad. El personaje mira hacia el objeto real; las actividades de pie de Trinity reutilizan sus poses direccionales respecto a la cámara. Los efectos no se repiten después de cancelarse al caminar, combatir o quedar incapacitado; dos jugadores haciendo la misma actividad simultáneamente no se cancelan entre sí.

Libros, herramientas, símbolo y farol se colocan delante del personaje según sus ocho direcciones reales, no delante de la cámara. Mirándolo de espaldas, el cuerpo oculta el accesorio en lugar de pintarlo sobre su espalda.

No hay curación, recuperación de conjuros, tiradas, apertura automática de cerraduras ni consumos inventados. Cocinar, avivar y descansar son interacciones de ambiente: el DM adjudica ingredientes, combustible y beneficios mediante los sistemas existentes. Los puntos de exploración del Retiro y las acciones de objetos de D8 mantienen sus reglas.

## Verificación

- 484/484 pruebas en 65 archivos; informe generado en `output/actors-camp-audit-20261007/unit-tests.json`. Incluye la cancelación de la pose al quedar paralizado/inconsciente, aun sin ilustración propia de esa condición, y la posición de accesorios en las ocho direcciones.
- Tipos de cliente, servidor y visor comprobados; compilación de producción en carpetas aisladas.
- Integración con DM, proyector y tres jugadores en los cinco campamentos: 643 pasos y 116 interacciones; colisiones, permisos, actividades, descanso sin beneficios automáticos, guardado y reconexión. Informe en `output/actors-camp-audit-20261007/playability.json`.
- Comprobación visual mediante navegador de revisión aislado; capturas y métricas en `output/actors-camp-audit-20261007/`.
- Stormwreck: comprobación final de 224 encuadres en siete mapas, ocho orientaciones y cuatro inclinaciones (`storm-audit.json`): todas las fichas cargadas; cero errores, recursos pendientes, cambios de posición o variación de cámara tras estabilizarla.
- D8: recorrido inicial de 192 encuadres en seis mapas y posterior recaptura completa de las seis vistas iniciales (`d8-startup-audit.json`). El informe de estas seis vistas comprueba todas las fichas y recursos listos. La repetición íntegra de métricas posterior quedó bloqueada en el navegador y no se considera una verificación final de 192 vistas. El visor se ha ajustado para ceder el control entre encuadres; queda repetir esta pasada de D8. Los pasos de tiempo de revisión no miden los FPS del dispositivo de la mesa.
- Interfaz de producción: DM con solo Trinity presente, 13 objetos del campamento actual, hoguera bloqueada a distancia y habilitada tras acercarse. Actividades ejecutadas desde DM y jugador; preparación de comida confirmada por el servidor.
- Corregido el envío de actividades desde DM para incluir la época de escena exigida por el servidor. «Avivar la hoguera» quedó registrado a las 08:21 del 8 de octubre. La lista de objetos se restablece al abrir el diálogo y permite reabrir el mismo objeto inmediatamente.
- Vistas iniciales de los trece mapas recapturadas después de sincronizar las fichas y el decorado de carga diferida. Los informes `d8-startup-audit.json` y `storm-startup-audit.json` verifican todas las fichas, recursos listos y cámara estable. El diagnóstico ya no marca una escena como lista antes de crear sus personajes o su decorado de campamento.
- «Detalle» accesible desde el nombre del jugador, manteniendo la escala del mapa. Diálogo probado en 390 × 844 y 844 × 390; sin desbordamiento horizontal y con desplazamiento interno en horizontal. Las dimensiones CSS efectivas dependen del zoom del navegador.
- Visor de cámara también compilable en producción, sin depender de la caché del optimizador de desarrollo. Su inicio no bloquea la carga diferida de Pixi.

## Límites y siguiente paso artístico

Mike y Mia conservan PNG base de 256 × 256 y variantes sentadas; parte de las acciones reutiliza esas poses con gestos y accesorios procedurales. Trinity tiene direcciones existentes, pero una pose reutilizada de espalda no equivale a una nueva secuencia dibujada de brazos. Runara, Tarak, Varnoth y los kobolds del Retiro siguen usando retratos SVG, no sprites de cuerpo entero.

Para mejorar la definición anatómica más allá del original hacen falta nuevas ilustraciones de alta resolución y secuencias por dirección. Este trabajo mejora escala, apoyo, muestreo, encuadre e interacción, sin prometer detalle inexistente ni animación esquelética 3D. Falta medir rendimiento y aceptación artística en el teléfono y proyector físicos de la mesa.

## Activación segura

Abrir `INICIAR.cmd` y elegir la campaña. Si la mesa de esa misma campaña ya está abierta, elegir «A · Actualizar esta mesa (guardar y reiniciar)». El lanzador guarda y recompila antes de iniciar; no se necesita tocar los guardados ni cerrar otros procesos a mano.

## Requisito de animación emparejada · seguimiento 2026-10-08

Petición explícita del usuario: cada acción creada debe tener animación del personaje o personajes participantes y del objeto real utilizado. Esta exigencia no se considera satisfecha solo por los gestos y accesorios procedurales de la tanda anterior. El cierre anterior corresponde a funcionalidad, escala y primeras representaciones; no al acabado artístico completo de todas las interacciones.

La inspección confirma que `a1-visuals.ts` recibe pero ignora las interacciones (`_interactions`), mientras el exterior sí responde a la apertura/cierre del baúl. El fuego ambiental, humo permanente y objetos estáticos no son por sí solos respuestas a una acción. Las mantas y accesorios temporales tampoco demuestran que se haya animado el objeto existente.

| Acción | Animación del personaje requerida | Respuesta del objeto requerida |
| --- | --- | --- |
| Calentarse | Acercar/extender manos hacia el calor, retirar manos al terminar | Calor/brillo vinculado al fuego real; no mover la hoguera |
| Cocinar | Agarrar cuchara, remover en contacto con la olla y soltar | Cuchara, contenido/vapor en la olla real, no centrado genéricamente en la hoguera |
| Avivar | Acercar atizador o acomodar leños | Leños/brasas y llama real responden al contacto |
| Preparar lecho | Agacharse y acomodar ropa de cama | Manta y almohada del lecho real se despliegan/acomodan |
| Pausa/descanso | Transición al apoyo disponible, reposo y salida | Ropa de cama/cojín responde cuando hay contacto; sin beneficios automáticos |
| Estudiar | Tomar/abrir libro, seguir lectura y devolverlo | Libro de equipo real, cubierta y páginas; evitar duplicación del accesorio |
| Orar | Tomar símbolo y mantener gesto de oración | Símbolo existente acompaña la mano; respuesta de vela solo cuando corresponde |
| Herramientas | Tomar/revisar y devolver utensilios | Estuche y utensilios reales responden; no abrir cerraduras automáticamente |
| Vigilar | Tomar farol si existe y mirar alrededor | Farol/equipo del puesto acompaña el gesto; no oscilar la estructura fija |
| Sentarse/levantarse | Entrada, pose apoyada y salida del asiento | Cojín/tela o respuesta al contacto; un banco rígido permanece rígido |
| Abrir/cerrar baúl | Alcanzar tapa y acompañar apertura/cierre | Tapa real articulada, contacto y estado final autorizado; completar también A1 |
| Revisar equipo | Manipulación adecuada al objeto elegido | Equipo/baúl responde sin cambiar su estado o inventario injustificadamente |
| Revisar refugio | Inspeccionar/tensar amarre o comprobar entrada | Lona, amarre o solapa concreta responde, no una manta genérica |

Criterios de aceptación pendientes: cubrir cada combinación válida de acción, personaje y campamento; ajustar manos/contacto a la altura individual; coordinar inicio, contacto, respuesta y fin; respetar las ocho direcciones respecto a la cámara y la profundidad del escenario. Para acciones compartidas, cada participante debe tener su papel y no duplicar el mismo objeto ni cancelar al otro. Distinguir finalización normal de interrupción por movimiento, combate, incapacidad, cambio de escena o desaparición del actor, conservando únicamente estados persistentes autorizados por el servidor.

Separar en la siguiente pasada «completa y verificada», «representación provisional» y «pendiente de arte». No declarar todas las animaciones terminadas mientras solo existan poses reutilizadas o VFX sin interacción real. Este seguimiento documenta el requisito y las carencias; no añade nuevas secuencias artísticas ni modifica el juego.
# Seguimiento: biblioteca reutilizable — 2026-10-08

La revisión anterior identificaba accesorios duplicados y objetos reales sin
respuesta. Se ha añadido una biblioteca de registro por funciones, fases
compartidas, recogida/retorno de objetos y articulación 2,5D del actor. Los cinco
campamentos conectan cada punto al objeto real. Cobertura, contrato de mapas
futuros y límites de los PNG en
[la guía](../REUSABLE_INTERACTION_ANIMATIONS.md). Las notas anteriores se conservan
como historial; no describen el estado posterior a esta implementación.
