# Auditoría del Pecio Maldito — 21/09/2026

Documento privado de preparación de mesa. No servir en `/art`, `/audio`, `/api/campaign` ni incluir en un paquete público. Encargo: auditar y planificar C1–C9; no generar arte ni implementar escenas. La orden del usuario sustituye la prioridad D8 del 18/09, pero conserva su trabajo reutilizable.

## Resultado y fuentes

Existe un VTT ejecutable, no un capítulo completo. El pack Stormwreck contiene exactamente tres escenas: aproximación sin movimiento, cubierta C1/C2/C3 y sala de pruebas de objetos. La tercera NO es C4 ni un interior canónico. La versión declarada es `0.3.0-dev.1`; la última aceptación operativa documentada sigue siendo Alpha 0.2 RC2. No se publica una versión con esta auditoría.

Fuente principal: PDF local `OneDrive_1_12-9-2026/Aventura Los Dragones de la Isla de las Tempestades.pdf`, 64 páginas. Se ha leído íntegramente el capítulo, páginas PDF/impresas 22–27, y revisado visualmente el mapa 4 de p.25 mediante el render existente `tmp/pdfs/pecio-map.png`. No se atribuye a esta sesión una lectura del resto de la aventura o de todos los perfiles del apéndice.

Contraste con `PROJECT_STATE.md`, `ARCHITECTURE_DECISIONS.md`, `ROADMAP_V1.md`, `docs/NEXT_MODEL_PROMPT.md`, `docs/HD2D_DIRECTION.md`, contratos 0.2/0.2.1/0.3, notas privadas, manifiestos y créditos; inspección de pack/seed/server Stormwreck, esquemas públicos/terreno, navegación, GameState, persistencia, HTTP, renderer y pruebas. D8 aporta evidencia F0/F1/F2 del 19/09 y sistemas compartidos; no se certifican F3–F7 por el número de tests.

`CANON` identifica hechos de la aventura. `VTT_AMBIENCE` identifica su representación añadida, sonidos escogidos y ayudas de interfaz: no añade reglas. Las decisiones de arquitectura descritas como VTT son diseño del producto, no hechos del PDF. La procedencia y la licencia son campos distintos.

## Inventario con clasificación

Cada fila clasifica un alcance concreto. HECHO no significa que toda la versión o todos los dispositivos estén aceptados.

| Elemento | Clasificación | Evidencia y consecuencia |
|---|---|---|
| Servidor Windows/LAN y tres interfaces | HECHO | Apps web/servidor y pruebas previas de mesa. Conservar arranque, autorización y control exclusivo; regresión por entrega. |
| Joystick, WASD, movimiento por casillas y colisiones | HECHO | Código compartido y confirmaciones físicas del usuario. No rehacer controles para dibujar mapas nuevos. |
| Inventario/PG, reveal/hide, cámaras y audio de proyector | HECHO | Recorrido físico previo y engine actual. El contenido de nuevos interiores no está creado. |
| Guardado, recuperación e idempotencia | REUTILIZABLE | Implementación y evidencia F2: estado privado, checkpoints, recuperación y condiciones persistentes. Añadir migración de mapas/objetos; no sustituir el sistema. |
| Combate con dados aportados por jugadores, NPC y condiciones | REUTILIZABLE | GameState, F1/F2 y tests actuales. No equivale a tener resueltos canto, parálisis o varios encuentros Stormwreck. |
| Aproximación actual | REUTILIZABLE | `/art/wreck-approach.png`: presentación/encuadre de llegada. Mantener disponible; no representa navegación marítima. |
| Cubierta actual | HECHO PERO NECESITA CORRECCIÓN | `objects-v3/wreck-deck-clean-v3.png`, inspeccionado: aspecto de pecio, mar, huesos y rueda separada aprovechables. Dos rejillas, barriles/cajas y arquitectura pintados no son un plano maestro canónico. Walkable aproximado 32×21 con casilla48; carece de verdaderas transiciones/alturas. No inferir cotas oficiales de sus píxeles. |
| C4–C7, C8 y C9 | FALTA | No existen como escenas del pack. La sala de práctica no debe reciclarse como camarote sin rediseñar su planta. |
| Puerta y caja preparadas | REUTILIZABLE | Estados, huellas, preview, colisiones, daño, undo. Puerta v4 y caja v2/v3 servidas; no hace falta reprogramar apertura/colisión. |
| Familia visual de puerta | HECHO PERO NECESITA CORRECCIÓN | FAIL físico previo v3; v4 incorpora reparación con manifiesto, pero falta aceptación visual física de esta revisión y adaptación a la planta real. No afirmar que el fallo observado siga idéntico en v4. |
| Timón separado del fondo | HECHO | v3 con soporte, orientaciones, daño/restos y solicitud Supera/Falla. No volver a crear una segunda rueda. |
| Consecuencia narrativa del timón | INCOMPLETO | La caída existe; no hay zombis C4 ni alerta de capítulo enlazada. Debe afectar su colocación, no iniciar combate al girar. |
| Tablón/trampa, cajones saqueables, cofre de hierro, paquete y talismán | FALTA | PropDefinition solo admite wheel/door/crate. La caja movible no tiene apertura y contenido persistente de contenedor. |
| Zombi: material visual aportado | REUTILIZABLE | 40 PNG distintos en `Imagenes VTT/DnD VTT/Zombie 1`; 30 de1024² y 10 de1254², RGBA. Base inspeccionada con alfa real. Incluye idle/caminar/ataques/caída y otras poses por nombre. No se ha aprobado la continuidad visual de todos los ciclos. |
| Zombis: contenido jugable | FALTA | No registrados en tokens/animaciones/encuentros Stormwreck; no están colocados en C4/C8. Reutilizar base y ciclos mínimos, no regenerar40 imágenes. |
| Arpía antigua | HECHO | Token estático público y semilla privada con PG/acciones; revelable. Canto resuelto manualmente, no automatizado. |
| Arpía nueva: material aportado | REUTILIZABLE | 57 PNG distintos, 30 de1254² y 27 de1024², RGBA, base inspeccionada con alfa real. Incluye vuelo, canto, cofa, suelo y estados por nombre. No está registrada en el pack; evitar gastar en otra tanda. |
| Regreso y segunda arpía | INCOMPLETO | Una criatura singular en semilla, sin regreso de capítulo ni segunda arpía preparada. Los NPC del motor son punto de partida para multiplicidad, no prueba de que este encuentro exista. |
| Gul: arte y entidad | INCOMPLETO | Localizados23PNG en la carpeta privada `Ghoul` de Drive: base, retrato, idle, caminar, ataques, acciones y estados según nombres. No están descargados, inspeccionados, registrados ni sembrados todavía; existe además un SFX de gul. No confundir disponibilidad de archivos con criatura terminada. |
| Animación por fotogramas | REUTILIZABLE | `world.ts` y schema tokenAnimations soportan secuencias; Stormwreck tiene `tokenAnimations: {}`. La oscilación de una ficha no es ciclo de caminar. |
| María aportada | REUTILIZABLE | 104 imágenes distintas, resoluciones mixtas (incluye1 RGB). No es requisito rehacer PJ para completar la geometría. |
| Condiciones e impactos | REUTILIZABLE | 30 imágenes icono/VFX (15 pares), copiadas a arte público; renderer aplica condición prioritaria. Ya hay proyectiles/impactos y bruma de combate. No son ambientes de C5/C8/C9. |
| Mar actual | INCOMPLETO | Líneas de Graphics desplazadas sobre el mapa con `waves: true`; espuma del fondo estática. No hay máscara por casco/roca/huesos ni agua poco profunda/submarina. |
| Lluvia/tormenta | REUTILIZABLE | Efectos visuales y estado ambiental; tormenta es VTT_AMBIENCE opcional, no condición obligatoria del capítulo. |
| Biblioteca de música/SFX/ambientes | REUTILIZABLE | 46 URLs de audio distintas referenciadas por el pack, todas presentes; mezcla/perfiles y sonidos de zombis/gul/puertas ya disponibles. Reutilizar selección antes de buscar más. |
| Cue sheets del capítulo | INCOMPLETO | `STORMWRECK_AUDIO_VFX_CUES.md` es guía de uso; solo hay perfiles vinculados a las tres escenas actuales. No prueba triggers ni efectos por zona. |
| Iluminación y oscuridad autorizada | FALTA | No hay visión individual ni filtro espacial de recursos. Tinte de tormenta no resuelve oscuridad CANON. Requerido mínimo funcional antes de aceptar C9. |
| Terreno Babylon | REUTILIZABLE | Babylon9.26 instalado; terrain.ts, terrain3d.ts y fixture con dos alturas/grid/luces. Pruebas NullEngine, no renderer integrado DM/Player/Projector. Luz ambiental fija0.7 del fixture sería incorrecta en C9. |
| Portales entre plantas y posiciones independientes | FALTA | changeScene global recoloca a todos en spawns, borra combate y oculta criatura. No es entrar/salir por una escalera ni permitir un PJ en C8 y otro en C9. |
| Regreso, botín único, maldición y final | FALTA | No hay máquina de capítulo C1–C9. Los toggles de progreso de D8 son base de UI/persistencia, no este contenido. |
| Sala de pruebas como destino del capítulo | YA NO ES NECESARIO | Conservar como fixture/regresión. Sacarla del recorrido narrativo cuando el nuevo conjunto se integre. |
| Instalar otro motor, rehacer guardado/joystick, generar de nuevo zombis/arpías | YA NO ES NECESARIO | Ya hay implementación/recursos. El coste relevante es conectar y validar. |

## Hallazgos que cambian el plan

1. **La hipótesis A=C1–C3 y B=C4–C7 no describe dos pisos.** C4/C5 están bajo C3 y C6/C7 bajo C2; sus puertas comunican con C1 en la misma cubierta principal. El mapa muestra cuatro plantas. Se adoptan cuatro mapas de presentación alineados: A superiores/exterior; B principal C1+C4–C7; C inferior C8; D bodega C9. Detalles en `PECIO_SPATIAL_PLAN.md`.
2. **El acceso inferior no obliga a cruzar camarotes.** C1 conecta directamente con C8 por escalera y escotilla; C8 con C9 por escalera/agujero. Existe acceso submarino exterior a C9 y columna de agujeros C4/C8/C9. Una ruta lineal C1→C4→C8→C9 sería incorrecta.
3. **El mapa bonito actual no sirve de coordenadas maestras.** Conservar su paleta, recursos y compatibilidad jugable; medir un plano común desde el mapa oficial antes de producir suelo/paredes nuevos. No copiar el mapa oficial con etiquetas/tesoros como fondo público.
4. **Base HD-2D y runtime son cosas distintas.** La dirección Babylon aprobada sigue vigente, pero el VTT usa Pixi. El primer bloque espacial incluye la integración mínima reutilizando el fixture, no una migración general/editor completo. No producir cuatro fondos planos finales que luego haya que reconstruir.
5. **Seguridad debe adelantarse en alcance acotado.** `/api/campaign` devuelve el pack entero y `/art` sirve su carpeta estática. Una trampilla secreta no puede ocultarse solo con shader. Geometría interior no autorizada, manifest de secretos y URLs sensibles deben filtrarse/servirse con autorización. Recursos genéricos compartibles no deben contener la ubicación/contenido del secreto.
6. **Tránsito no es cambio global de escena.** Guardar ubicación de cada actor por mapa/superficie, reservar ambos extremos y mantener combate/objetos al cambiar el encuadre público. Debe poder separarse el grupo sin añadir un clic DM por escalón. Portales excepcionales (salto/nado/trepa) conservan arbitraje de mesa.
7. **La iluminación mínima precede a la aceptación de C9.** Día: superior/principal brillante; C8 tenue; C9 sin luz solar. Noche: todo oscuro. Adjudicación manual de lo revelado y fuentes autorizadas primero; FOV automático complejo puede esperar. Peces y burbujas no emiten luz.

## Comprobación completa del capítulo — paráfrasis de preparación

| Zona/evento | CANON y consecuencia que hay que representar | Estado del VTT |
|---|---|---|
| Llegada (pp.22–23) | Pecio de unos 40 años sobre huesos de dragón de oro en bajío rocoso del norte, mayormente fuera del agua. Bote desde el claustro, cerca de4 km/1h40. Jarcia por estribor/sur o entrada submarina en popa. Madera ennegrecida/verdosa; techos casi2,5m, puertas casi2m. | Aspecto aproximado; conexiones faltan. |
| C1 (p.23) | Cubierta central, accesos a proa/popa y camarotes; escalera junto al mástil y escotilla de babor. Cofa15m, escalera de cuerda resistente, mástil se balancea al trepar y cofa queda sobre agua al norte. Nido vacío de arpía al llegar; tesoro de joyas recuperable. | Cubierta visual; trepa/cofa/botín faltan. |
| C2 (p.23) | Trinquete roto y balista inservible. No añadir reparación/munición/puzzle para obligar interacción. | Decoración aprovechable, revisar escala. |
| C3 (p.24) | Timón torcido con nombre en nácar invertido; girar lo desprende. Atrapar: salvación DestrezaCD10; caída alerta C4 y produce golpes detrás de puerta cada10–15s. | Timón funciona; aviso privado y audio condicionado faltan. |
| C4 (p.24) | Puerta atrancada por listón podrido, FuerzaCD10 para echarla abajo. Dos zombis (tres a nivel2); esperan tras puerta si cayó timón o hizo falta más de un intento de Fuerza, en otro caso vagan. Agujero junto a cama hacia C8 y C9. Cajones:50 po, herramientas de cartógrafo y daga; brújula desmontable25 po. | Todo el camarote y encuentro faltan; puerta/caja aportan base. |
| C5 (p.24) | Esqueleto sin cabeza en encimera. Cangrejos pequeños e inofensivos causan apariencia de movimiento. No es combate. | Falta escena; esqueleto estático y cangrejos separados. |
| C6 (p.24) | Seis literas, pertenencias y retrato de Aleitha/Brastos. PercepciónCD10 descubre tablón levantado. Al abrir: dardo+5,2(1d4) perforante al impactar; ConstituciónCD11 evita3(1d6) veneno. No se repite salvo rearme; abrir desde distancia segura hace fallar dardo.200 po bajo tablón. | Falta; tiradas/arbitraje en mesa, registro de resultado en servidor. |
| C7 (p.24) | Mesa larga, sillas podridas y vajilla/cristal roto. No hay elemento especial obligatorio. | Falta mapa; sin puzzle ni búsqueda forzada. |
| C8 (p.25) | Agua15cm al sur/estribor, 45 cm al norte/babor: toda la cubierta es terreno difícil. Un zombi y un gul en popa que aprovecha distracción para paralizar/arrastrar; a nivel2 se añaden dos zombis (tres en total + gul). Agujeros alineados C4/C9. | Falta; coste de terreno no existe en navegación actual. |
| Botín C8 (p.25) | Abrir caja1min con palanqueta/10sin ella, d6 físico, cada resultado solo una vez: vino, clavo, plata, candelabros, laúd, pergamino. No asignar tesoro canónico a cada barril ni inventar reroll automático de resultados repetidos; decide DM. | Base de caja movible, no saqueable. |
| C9 (p.26) | Totalmente sumergida y sin sol; algas y peces. Respirar en parte alta de escalera o agujero hacia C8. Natación/asfixia según reglamento, sin temporizador real obligatorio. Cofre de hierro~60 kg bajo agujero; abrir sumergido libera gran burbuja y paquete encerado flotante; también se puede subir antes de abrir. | Falta mapa, cofre y evento. |
| Contenido C9 (p.26) |55 po, tres turquesas10 po cada una, botas élficas, bitácora protegida y talismán de cabellos/huesos que la marca. Bitácora explica a Aleitha, Brastos y la súplica a Orcus; detectar magia revela nigromancia. No revelar por proximidad. | Falta estado de conocimiento/recogida por propietario. |
| Regreso (p.27) | Encontrar cofre y volver a C8, O completar descanso corto/largo a bordo. Golpe al aterrizar; encuentro la próxima entrada en C1. Primer turno canta para atraer a cofa. Nivel2: segunda arpía en balista C2. | Solo reveal manual de primera arpía. |
| Negociación (p.27) | Puede marcharse por buen argumento y arbitraje, por perder más de mitad PG, por devolución de tesoro del nido o rivalidad entre dos arpías. No imponer matar para progresar. | Resolución de capítulo falta. |
| Final (p.27) | Vencer/ahuyentar arpías reduce naufragios, NO elimina maldición. Talismán a Runara identifica tumba de Brastos; colocar/enterrar/quemar en tumba rompe maldición. Destruirlo a bordo también. Suspiro/niebla; pecio desaparece al día siguiente, no bajo pies del grupo al pulsar. Sueño del clérigo al dormir después y subida a2 o3 según orden con Pleamar. | Falta; epílogo narrativo puede usar paneles existentes, no requiere otro mapa táctico del cementerio. |

Los perfiles completos de zombi/gul/arpía y reglas referenciadas por el capítulo se contrastarán con los documentos locales al preparar encuentros. No copiar los ataques provisionales de un test como autoridad de reglas.

## Arte y audio: uso honesto de lo disponible

Actualización22/09: la fuente viva de recursos del usuario está inventariada en `docs/ASSET_SOURCES.md` y `DRIVE_ASSET_INDEX_20260921.json`. Incluye gul, versiones más recientes de zombi/arpías y ocho recursos de entorno del pecio no marcados como rechazados. Deben revisarse antes de generar sustitutos; la auditoría visual original solo cubría el material local indicado a continuación.

Los originales de zombi y arpía muestran acabado ilustrado más detallado que los tokens pixel art antiguos. No se ordena rehacerlos: probar primero silueta, tamaño y anclaje dentro del mapa HD-2D. Las dimensiones diferentes y poses independientes exigen registro de pivote, recorte y orden de frames; RGBA y nombres correlativos no acreditan continuidad de animación. Revisar dos ciclos cortos antes de normalizar todas las poses. La procedencia/licencia de los nuevos originales aportados no está registrada en un manifiesto localizado; no declararlos CC0.

Audio actual mezcla WAV de síntesis local con recursos externos. Los créditos locales registran CC0 (Kenney/OpenGameArt y packs concretos) y Pixabay Content License; no son una licencia uniforme. `LICENSES_AND_CREDITS.md` decía incorrectamente que no había catálogos externos. El sonido denominado Canto de arpía reutiliza magia arcana, no es grabación de canto. Los gemidos recomendados para aproximación no deben dispararse automáticamente si desvelan un encuentro. No se han escuchado todos los archivos ni reverificado externamente todas sus licencias en esta auditoría.

84 rutas únicas de arte/audio citadas por el pack comprobadas: presentes;46 son audio. Tener recursos descargados bajo `_sources` no equivale a selección final ni a distribución aprobada. Antes de empaquetar, usar allowlist de recursos utilizados y avisos de cada procedencia; no publicar originales privados.

## Evidencia del 21/09

- `node node_modules/vitest/vitest.mjs run --config vitest.config.ts --configLoader runner`: **85/85**, 7 archivos, 53,01s. Incluye2 pruebas Babylon NullEngine; no es render en GPU.
- Typecheck cliente y servidor con `--noEmit`: **PASS**.
- Inspección de84 URLs del pack: **0 ausentes**. Inventario231 PNG aportados, todos distintos dentro de su respectiva carpeta; muestra visual de cubierta, base zombi y base arpía.
- No se ha construido una nueva distribución, ejecutado una partida, escuchado la biblioteca completa ni hecho pruebas nuevas con móvil/proyector físicos. Evidencia de red/navegador anterior: informes F0/F1/F2 del19/09. No trasladar su aceptación a mapas que no existen.
- No se han modificado código, dependencias, imágenes o guardados. El repositorio muestra archivos sin seguimiento: no se presupone un commit recuperable. Roadmap y encargo anteriores archivados con igualdad de hash comprobada.

## Documentación que deja de gobernar el orden

Roadmap anterior rev13: D8 como prioridad, F0–F2 aún pendientes, Babylon no instalado en secciones inferiores, SFX solo sintéticos y capítulo relegado a0.9. Estas afirmaciones están superadas. Se conserva copia literal en `docs/archive/ROADMAP_V1_PRE_PECIO_20260921.md`; el nuevo `ROADMAP_V1.md` es la única secuencia vigente. Contratos anteriores siguen válidos donde no contradigan las decisiones nuevas ni el código verificado.

La auditoría se completa como documentación. El capítulo sigue **INCOMPLETO** y su siguiente bloque es M1, mapas y recorrido espacial.
