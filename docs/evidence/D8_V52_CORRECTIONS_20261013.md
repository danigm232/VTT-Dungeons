# D8 V52 — correcciones de las nuevas fotografías

> V53 continúa esta versión con cierres de tejados decorativos, ventanas traseras y luz solar del templo: [D8_V53_VISUAL_POLISH_20261013.md](D8_V53_VISUAL_POLISH_20261013.md). Sigue pendiente la aceptación visual dentro del VTT.

13 de octubre de 2026. Versión local V52; no se ha publicado en GitHub en esta pasada ni reiniciado la partida abierta.

## Resultado y límite de aceptación

Se han corregido las causas de las cubiertas partidas, la revelación de interiores desde fuera, la puerta interior excesiva, las acciones de asiento/cartel que no aparecían, el salto sin desplazamiento y el modo Sigilo ausente. Se han incorporado las siete ventanas del Café como objetos persistentes, las rutas de distracción, la huida del caballo, nuevas vistas de parroquianos y la pose de Margaret sujetando la cuerda. La mochila usa iconos específicos y una presentación más compacta.

247 pruebas aprobadas en 29 archivos, comprobación de tipos de cliente/servidor aprobada y compilación de producción aprobada (1 min 17 s). La construcción de las seis escenas Babylon con NullEngine pasa, incluida entrada/salida y separación de habitaciones. Estas comprobaciones no son capturas ni certifican calidad de iluminación, ausencia universal de juntas visibles, alineación final de sprites o rendimiento de GPU.

El acceso al navegador de revisión estaba bloqueado por política. No se ha usado otro navegador, servidor, CDP ni herramienta para eludirlo. La aceptación visual dentro del VTT y las mediciones de FPS/memoria siguen pendientes. No se presenta el resultado como «perfecto» o «sin errores».

## Nuevas peticiones, punto por punto

«Implementado» significa cambio en las fuentes y pruebas indicadas, no aprobación visual automática. La numeración del templo conserva el salto de 2 a 4 del mensaje del usuario.

| Escena / punto | Corrección | Evidencia / pendiente |
|---|---|---|
| Templo 1 | Bandas de cierre superiores y uniones en fachadas delantera, trasera y división interior; cubierta completa por habitación. | Runtime: 18 piezas, ninguna oculta fuera ni visible dentro de su habitación. Acabado de juntas pendiente de capturas. |
| Templo 2 | Piedra caliza cálida, madera en puertas, tejado pardo/terracota; contraste con latón y burdeos. | Materiales y luz de atardecer comprobados; color final depende de GPU y exposición. |
| Templo 4 | Retiradas cuatro casas lejanas que ocupaban la aproximación. Se mantiene el camino jugable. | Navegación conectada y actores/objetivos alcanzables. |
| Templo 5 | Pueblo costero lejano ilustrado en PNG; isla plana, sin colina ni edificios 3D de fondo. | Asset real integrado y también embebido en Playground. Fondo sin colisión. |
| Templo 6 | Manchas suaves de tierra y musgo en jardines, sin modificar obstáculos. | Construcción de materiales correcta; transiciones finales pendientes visualmente. |
| Templo 7 | Nave y vestíbulo con límites distintos, contiguos sin solapamiento; puerta interior de 2,8 × 3,2 m. | Entrar en una habitación no descubre la cubierta de la otra. |
| Templo 8 | Animación de oración; solicitud al DM; Inspiración de un uso con caducidad tras 24 h de juego. | Espera aprobación, guarda/restaura y caduca correctamente. Véase reglamento/adaptación abajo. |
| Templo 9 | La acción contextual encuentra las posiciones de los asientos publicados. | Todos los asientos libres probados; los ocupados por un PNJ siguen reservados. |
| Templo 10 | El salto legal actualiza la casilla y crea un desplazamiento animado; alcance por FUE/carrera y comprobación de trayecto/aterrizaje. | Salto real probado, requisito de carrera explicado para la mediana con FUE baja. No atraviesa muros. |
| Templo 11 | Acción Leer cartel y burbuja de cómic anclada a la posición elevada del cartel. | Interacciones publicadas probadas; texto seguro mediante textContent. Encaje de burbuja pendiente en pantalla. |
| Café 1 | Materiales neutros/cálidos para bases y cubiertas; copas de árbol con iluminación real, no azul autoiluminado. | Fuentes/materiales corregidos; color nocturno requiere captura. |
| Café 2 | Cubierta completa desde fuera, cierres superiores de fachadas y ocultación conjunta desde dentro. | Runtime: 15 piezas; cero ocultas fuera y cero visibles dentro. |
| Café 3 | Hoja de puerta nativa opaca e independiente del fundido de fachada, con madera cálida. | Estado real abierto/cerrado conservado. Visibilidad artística pendiente. |
| Café 4 | Cuatro vistas de tres parroquianos, cada una con tres gestos de bebida; ocho orientaciones relativas mediante vistas y espejo. | PNG RGBA reales, recortes dentro de límites y alfa de esquina comprobados. Las poses no llevan una segunda silla dibujada. |
| Café 5 | Se mantiene la profundidad de muebles, paredes y billboards, con sprites sin sillas horneadas y fachadas opacas fuera. | Regresiones de oclusión pasan; recorrido visual completo alrededor de PNJ/caballo pendiente. |
| Café 6 | Sigilo visible en rueda de acciones; marcha más lenta; CD16 en ese modo frente a CD18 normal. Panel para que el jugador introduzca el total físico y el DM confirme. | Prueba de total propio/ajeno y solicitud pendiente pasa; una CD ya solicitada no cambia al alternar el modo. La CD16 es adaptación solicitada, no invisibilidad automática. |
| Café 7 | Siete ventanas rompibles delante/detrás; desaparecen cristales y travesaños, sonido de vaso/cristal y rutas de los tres clientes hacia la ventana elegida. | Las siete roturas persisten; los tres PNJ alcanzan destinos distintos en cada una. Los huecos traseros se contemplan desde el lado público de la barra. |
| Café 8 | Saltar por ventana abierta/rota con alcance de FUE, altura y aterrizaje libre válidos. | Ventana cerrada rechazada; cruzar una rota crea desplazamiento real animado. Sin tiradas automáticas. |
| Café 9 | Franja adicional para rodear el caballo y conexión lateral con pasillo trasero. | Navegación pasa; la auditoría encontró y corrigió un pasillo trasero aislado. |
| Café 10 | Declarar un ataque contra el caballo desencadena huida, no un combatiente hostil. | Llega a su destino exterior; no activa combate. Se corrigió también que el inicio de otro combate congelara su huida. No aplica daño físico inventado. |
| Mochila 1 | Iconos diferenciados para arco, daga, libro, mochila, componentes, tinta, pluma, pergamino, arena, vino, antorcha, monedas, cuerda, etc. | Pruebas de iconos/control e inventario autoritativo pasan; recursos SVG locales. |
| Mochila 2 | Cabecera y tarjetas más compactas, menos marcos, categorías vacías ocultas, cantidades ×1 suprimidas y detalle accesible conservado. | Compila y mantiene selección/edición; comodidad móvil requiere uso real. |
| Fritz 1 | Farola retirada del tramo horizontal; arco girado y pilares físicos girados a juego para abrir el paso. | Navegación pasa; captura cercana del recorrido pendiente. |
| Fritz 2 | Tejado y vigas solo se ocultan si el foco está realmente dentro, no porque un rayo de cámara cruce la casa. | Runtime: 11 piezas visibles fuera y ocultas dentro; cámara entra a 25° y conserva ajustes manuales. |
| Mercado 1 | Margaret mira hacia la vaca con pose nueva de agarre; cuerda inicia en mano proyectada y termina en cabeza de la vaca, según sus posiciones actuales. | Recortes/posiciones probados; alineación en todos los ángulos pendiente visualmente. |
| Mercado 2 | Boris al lateral de un puesto, fuera de debajo del toldo. | Posición y migración de antiguas posiciones por defecto comprobadas; ajustes propios del DM se conservan. |
| Mercado 3 | Casas, cubiertas y bases incluidas y priorizadas en el presupuesto de sombras exterior, sin perder metadatos al agrupar geometría. | Runtime: tres mapas de sombras y 19 contactos; contraste final pendiente. |
| Cena 1 | El exterior opaco y la cubierta completa no desaparecen mientras el foco permanece fuera. | Runtime: 11 piezas visibles fuera, ocultas dentro; acceso y asientos siguen pasando. |

## Reglamento y oración

Se leyeron completos los PDF locales `Reglamento/Reglas básicas novatos.pdf` (2 páginas) y `Reglamento/Notas básicas DM.pdf` (5 páginas). El primero, página 1, permite al DM premiar interpretación con Inspiración para obtener ventaja en un d20 físico. Estos documentos no contienen una tabla de bonificaciones por oración según raza o clase. No se ha inventado ni atribuido esa tabla al reglamento.

La implementación ofrece al DM el trasfondo y rasgos de la ficha para decidir si concede el premio. El uso único, el nombre «Inspiración de Sylvania» y la caducidad de 24 horas de juego son una adaptación explícita del VTT a la petición. No concede estadísticas ni rasgos raciales/de clase nuevos, no se acumula y no tira dados. La decisión de no concederla también está disponible.

Los límites de salto emplean la FUE registrada. La carrera mínima es 10 pies (~3 m); el salto en parado es la mitad. Las comprobaciones especiales de obstáculos/terreno quedan al DM. La altura de ventana incluye una adaptación de agarre/impulso para atravesar un alféizar; no se presenta esa fórmula como regla textual del PDF.

## Auditoría técnica

La selección de pruebas incluye todos los archivos `d8-*.test.ts`, inventario, protocolo, juego, salto, ambiente, oclusión, clima y reloj. Resultado final: **29 archivos / 247 pruebas aprobadas**. Regresiones nuevas: guardado anterior sin ventanas, conservación de inventario/posiciones del DM, validación de destinos y CD, tirada propia frente a ajena, oración, siete ventanas, cruce de ventana, huida incluso si empieza combate y ruta de todos los parroquianos.

Se ejecutó `scripts/d8-renderer-audit.ts` sobre el renderer real con Babylon NullEngine y canvas local. Datos sin GPU:

| Escena | Mallas | Habitaciones | Piezas de techo | Luces locales | Mapas de sombras | Contactos |
|---|---:|---:|---:|---:|---:|---:|
| Café | 664 | 1 | 15 | 35 | 3 | 22 |
| Templo | 915 | 2 | 18 | 37 | 3 | 48 |
| Cena | 640 | 1 | 11 | 9 | 2 | 11 |
| Jardín Fritz | 722 | 1 | 11 | 9 | 3 | 9 |
| Mercado | 1054 | 0 | 0 | 24 | 3 | 19 |
| Espejo | 395 | 0 | 0 | 15 | 3 | 15 |

En todas: cero límites geométricos no finitos, cero miembros de iluminación eliminados y cero vigas auditadas sin habitación. Cero techos ocultos fuera (incluido spawn real) y cero techos de la habitación activa visibles dentro. Cámara independiente: entrada 25°, inclinación manual conservada y encuadre exterior restaurado. Las casas decorativas de mercado no tienen habitación jugable, de ahí la columna 0, no ausencia de cubiertas.

El paquete `playground_current.json` coincide byte a byte con `playground_v52.json`; sus seis módulos fuente y dependencias coinciden con los archivos locales, `code` coincide con `unicode` y V51 queda en `historico/`. No se afirma igualdad con GitHub remoto, que no se ha publicado en esta pasada.

## Arte y calidad del alfa

Se usó ImageGen integrada para generar el fondo costero, cuatro atlas de bebida, oración y Margaret con cuerda. No se transformaron estos bitmaps con Python/canvas. Los atlas se integran mediante recortes declarados en código, conservando sus originales generados. Rutas, referencias y prompts de trabajo: [D8_V52_ASSET_PROMPTS.md](D8_V52_ASSET_PROMPTS.md).

Las vistas previas mostraban bordes rojos/amarillos. Una lectura de píxeles, sin editar las imágenes, comprobó que los píxeles muy saturados de los cuatro atlas de bebida tienen alfa máximo 2–3/255; los de oración, 2/255. Son casi transparentes, no un fondo opaco. Margaret contiene cinco píxeles muy saturados con alfa >=220/255; no se certifica un borde completamente limpio ni la ausencia de halos sobre todos los fondos. La revisión de composición real sigue pendiente.

## Peticiones anteriores y pendientes reales

Se conservan las correcciones anteriores de cámara 25°, sombras/contactos, estatua, alfombras, vino inventariable, clientes alertados al molestar a dos, hielo/rescate DM, flores con viento y ampliación de suelo/casillas de cena. Sus regresiones seleccionadas pasan. El detalle histórico de los 36 puntos está en [D8_CORRECTIONS_20261013.md](D8_CORRECTIONS_20261013.md); la separación de habitaciones del templo y el pueblo de fondo ilustrado de V52 sustituyen aquellas soluciones de V51.

El audio anterior sigue **parcial**: laúd tenue, fuego, vasos/bebida/silla ocasionales están disponibles y probados, pero no se añadieron tos, sollozo o carraspeo de Pixabay porque la descarga autorizada estaba bloqueada. No se usó otra vía para eludirla y no se inventa una nueva licencia. Falta escucha integral.

Para aceptar el acabado: revisar V52 dentro/fuera desde varios ángulos, ventanas delanteras y traseras, todos los asientos/carteles, manos/cuerda, sprites detrás de muebles, sombras al atardecer/noche, mochila móvil y audio. Recargar clientes y reiniciar el servidor conservando el guardado es necesario para activar las nuevas acciones; no se ha interrumpido la partida abierta automáticamente.
