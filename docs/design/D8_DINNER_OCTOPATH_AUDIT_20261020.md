# Cena con Anteros: auditoría visual y técnica hacia un acabado HD-2D

Fecha: 20/10/2026. Proyecto: D8 Night, D&D Immersive Engine. Alcance exclusivo: escena `dinner`, «Cena con Anteros · desenlace». Estado: análisis y encargo de producción; las mejoras descritas aún no están implementadas.

Revisión del 21/10/2026: iluminación y profundidad pasan a ser entregables explícitos de todas las fases, con trabajo dedicado en E1, E3 y E4. La revisión amplía el encargo; no acredita mejoras nuevas del juego ni pruebas nuevas de ejecución.

Encargo literal del usuario: **mejorar este mapa, conservándolo**. La distribución de la finca, los elementos principales, la casa, el patio, la mesa, las sillas, los accesos y su función son la base del trabajo. Se mejoran detalle, materiales, siluetas, luz, profundidad, recorte y ambiente dentro de esa distribución. Las referencias no autorizan sustituir el mapa, reformar sus espacios, trasladar objetos jugables o cambiar su tema. Esta regla limita cualquier propuesta amplia de los apartados siguientes.

La [lista literal C01–C60](D8_DINNER_LITERAL_CHECKLIST_20261021.md) convierte el análisis en instrucciones verificables: qué falta o debe comprobarse, mejora concreta, qué conservar, evidencia y criterio de aceptación. Sus tipos distinguen observación visual, comprobación de código, verificación pendiente y recurso condicionado; no todos los puntos son fallos confirmados. El informe visual incorpora la lista íntegra y una versión autónoma para adjuntar a otro chat.

## 1. Dictamen y resultado que buscamos

La Cena funciona como escenario de la aventura, pero su presentación todavía se parece a una reconstrucción geométrica básica de un patio. El salto pendiente consiste en mejorar **ese mismo patio y su casa** hasta que se perciban íntimos, habitados y memorables para el desenlace, con lectura de materiales, luz dirigida y profundidad alrededor de los personajes.

El orden correcto de trabajo es composición, arquitectura y materiales, integración de personajes, iluminación, atmósfera y sonido. Bloom, desenfoque o partículas por sí solos no resolverán las superficies vacías, las siluetas simples o la escala del encuadre.

La referencia más útil de Octopath para esta escena es el pueblo: edificios de piedra y madera, desniveles legibles, sombras profundas con detalle, pequeños focos cálidos y elementos que ocupan el primer plano. El bosque sirve para estudiar capas y oclusión; la nieve, para estudiar partículas y luz. No se propone convertir la Cena en una caverna, bosque o nevada permanente.

La meta es aproximar su lenguaje visual con arte propio y nuestros recursos. No es una promesa de reproducir exactamente un juego comercial ni de obtener su acabado solo mediante ajustes del motor. La coherencia y calidad del arte serán determinantes. **Conservamos un VTT de D&D**, sus casillas, control del DM y decisiones en mesa.

[Abrir informe visual](../../output/d8-dinner-octopath-audit-20261020/index.html) · [Datos de base](../../output/d8-dinner-octopath-audit-20261020/baseline.json) · [Encargo para implementar](D8_DINNER_EXECUTION_PROMPT.md).

## 2. Evidencia utilizada y límites

Se ha leído el código actual del mapa, el paquete público, la navegación compilada, el servidor de D8, cámara, actores y audio; se han comparado las capturas existentes y la referencia original local. Se ha ejecutado una instancia del estado del servidor solo en memoria y una selección de pruebas automatizadas. No se ha manipulado una mesa abierta ni sus partidas.

| Evidencia | Qué demuestra | Qué no demuestra |
| --- | --- | --- |
| `output/d8-mirror-icepass-20261020/candidate-exit-dinner.png`, archivo del 20/10 a las 16:55 locales | Apariencia real reciente de la Cena después de salir del Espejo: patio central y gran extensión de pavimento | Rendimiento actual sostenido, todas las cámaras o el estado de cada final |
| `output/d8-polish-20261016/d8-dinner-polish-after-*.png`, metadatos del 18/10 | Detalle, día/noche, interior recortado y varios encuadres reales | Que todo cambio posterior se vea exactamente igual |
| `output/d8-polish-20261016/d8-dinner.png` | Tres posiciones y cinco giros, a 15°, con cuadrícula | Un recorrido legal del personaje: son instantáneas de revisión |
| `campaigns/one-shot/source/Cena con Anteros.png` | Dirección inicial: patio circular, casa, faroles, vegetación, puestos y abundancia de detalle | Arte HD-2D final o geometría navegable |
| Cinco capturas de Octopath aportadas por el usuario | Referencias de composición, planos, material y ambiente | Valores exactos de cámara, shaders o recursos reutilizables |
| `baseline.json` de esta auditoría | Configuración y cifras compiladas del código leído, hashes y conectividad de navegación | Pruebas físicas o comparación de GPU entre dispositivos |

Las imágenes del 18/10 son históricas. La prueba de salida del 20/10 es más reciente, pero no sustituye una matriz nueva del código actual. El perfil de cámara ha cambiado desde aquellas capturas: este documento recoge el intervalo actual, no restaura los límites antiguos.

## 3. Qué hace Octopath y qué trasladamos

Acquire describe personajes pixel art 2D en escenarios realizados mayoritariamente en 3D, con el reto explícito de que ambos resulten naturales juntos. También explica que el encuadre de exploración condiciona la composición. Aplicación aquí: diseñar volúmenes y materiales para nuestra cámara y hacer que los personajes pertenezcan al lugar, en vez de añadir detalle aislado. [Entrevista oficial de desarrollo de Octopath Traveler II](https://www.unrealengine.com/developer-interviews/octopath-traveler-ii-builds-a-bigger-bolder-world-in-its-stunning-hd-2d-style?lang=en-US).

En el relato del primer juego, el equipo explica la combinación de píxeles 2D y entorno 3D, y cómo asociar luz a los efectos ayudó a integrar sombras y acción. Para nuestra Cena interesa esa conexión física entre vela, mobiliario y personaje, no copiar su sistema de combate. [Artículo y entrevista oficial sobre HD-2D](https://www.unrealengine.com/spotlights/octopath-traveler-s-hd-2d-art-style-and-story-make-for-a-jrpg-dream-come-true?lang=en-US).

Del análisis de las imágenes del usuario se infieren estos recursos artísticos: primer plano oscuro y parcial, plano jugable nítido, fondo menos contrastado, detalle agrupado alrededor de puntos de interés y luces que guían la mirada. Son observaciones de las referencias; no afirmaciones sobre sus parámetros internos.

La tecnología existente ya permite esta dirección. Babylon ofrece postprocesos de bloom, enfoque y tratamiento de color, con costes y parámetros propios. No hace falta migrar a Unreal ni reconstruir el motor. Los efectos se incorporarán solo cuando aporten algo medible. [Documentación oficial de Default Rendering Pipeline](https://doc.babylonjs.com/features/featuresDeepDive/postProcesses/defaultRenderingPipeline).

## 4. Base funcional que debe conservarse

| Elemento actual | Resultado de la inspección del 20/10 |
| --- | --- |
| Identidad | `dinner`, renderer `babylon-d8`, superficie `village`, D8 V65 |
| Mapa autorado | 28 × 18 m, prolongación visual de 9 m hacia +Z y entorno de finca/pueblo |
| Cuadrícula compilada | 19 columnas × 18 filas, casillas de 1,5 m, origen mundo X −14,25 / Z −9 |
| Navegación | 318 casillas transitables, 4 difíciles; sin peligro de movimiento específico declarado para Cena |
| Aparición del grupo | Casillas (9,10), (9,9), (8,10); centros mundo X=0/Z=6,75; X=0/Z=5,25; X=−1,5/Z=6,75 |
| Anteros | `anteros-dinner`, casilla (9,6), asiento visual X 0 / Z 1,4, animación de reposo sentada |
| Mesa | Centro X 0 / Z 3,2, cuatro sillas y vela; patio circular de 6,8 m |
| Casa | Centro X 0 / Z −4,9; 12 × 5,4 m; interior practicable y recorte de cubierta |
| Puerta | `dinner-entry-door`, inicialmente cerrada, casilla (7,4); conserva comportamiento y estado |
| Objetos autorados | 35 entradas de configuración; no equivale a 35 mallas renderizadas |
| Interacción narrativa | «Brindar con Anteros», respuesta breve; no decide ni completa automáticamente el final |
| Finales visuales | `celebration`, `solitude`, `darkness`, derivados del estado del servidor |

En la instancia aislada el cambio a `dinner` devolvió éxito. Las 318 casillas pertenecen al mismo componente del grafo estático desde la aparición inicial. Esta comprobación ignora ocupación dinámica y estado cerrado de la puerta: **no acredita que se haya caminado legalmente por cada una**.

La base física se congela para este pase. No mover mesa, puerta, obstáculos, asiento, origen o escenas de transición para acomodar una ilustración. Las pequeñas alturas decorativas no deben crear escalones invisibles ni cambiar coste de movimiento. Cualquier cambio físico imprescindible exigiría un encargo diferenciado con navegación y colisiones coherentes.

## 5. Comparación por categorías

| Categoría | Cena observada | Dirección deseada | Prioridad |
| --- | --- | --- | --- |
| Composición | La mesa queda pequeña dentro de mucho pavimento | Patio íntimo con foco en Anteros y continuidad lateral | P0 |
| Profundidad | Hay casas y setos, pero se leen como objetos separados sobre un plano | Primer plano parcial, patio, casa y pueblo con separación de valor y tamaño | P0 |
| Arquitectura | Fachada lisa, ventanas simples, cubierta triangular uniforme | Piedra, revoco irregular, vigas, jambas, aleros, tejas y encuentros creíbles | P0 |
| Suelo | Ladrillo repetido y camino de manchas oscuras muy regular | Adoquín desgastado, tierra, musgo y bordes con transiciones autoradas | P0 |
| Vegetación | Copas y rosas hechas de masas redondeadas simples | Siluetas de hojas, racimos y ramas con variedad y pixel coherente | P1 |
| Mobiliario | Mesa reconocible; sillas y útiles demasiado esquemáticos | Grosor y perspectiva correctos, comida y objetos agrupados, lectura a zoom de juego | P1 |
| Personajes | Anteros tiene pose propia; estilos y luz no terminan de casar | Identidad preservada, escala común, apoyo físico y respuesta a luz local | P0 |
| Luz | Calidez central existente, pero la escena conserva una dominante gris uniforme | Centro cálido, relleno frío discreto, sombras con detalle y fuentes justificadas | P1 |
| Atmósfera | Partículas puntuales; poco aire entre planos | Humo de chimenea, aire lejano, luciérnagas puntuales y viento tenue | P2 |
| Cámara | Algunas vistas enseñan demasiado suelo; recorte interior agresivo | Zoom medio útil, límites al seguimiento y recorte selectivo por oclusión | P0 |
| Audio | Música de esperanza y SFX disponibles; capas ambientales de Cena apagadas por defecto | Exterior tranquilo, fuego próximo y gestos de mesa discretos, según desenlace | P1 |
| Interfaz | La revisión del escenario no acredita comodidad de la consola | Señal de interacción limpia y final visible sin ocupar el patio | P1 |

P0 significa que bloquea el parecido; P1 aporta acabado; P2 se añade al estar resueltos los anteriores. No es una clasificación de errores funcionales.

## 6. Composición concreta para la Cena

La llegada debe mostrar un camino que conduce al patio cálido, Anteros reconocible al fondo de la mesa y la casa como respaldo visual. El pueblo tiene que continuar alrededor sin dominar el encuadre. Al acercarse, deben aparecer textiles, vajilla y vegetación; al alejarse, una silueta coherente del conjunto.

Se propone organizar cinco planos, usando los huecos ya disponibles y sin alterar navegación:

| Plano | Contenido | Tratamiento y límite |
| --- | --- | --- |
| A. Primer plano | Ramaje lateral, borde de carro o farol, fragmento de alero fuera del camino | Oscuro, parcial, con transparencia selectiva si tapa personaje/objetivo; nunca una pantalla de hojas |
| B. Llegada | Camino, piedra gastada, puerta de la finca, transición a patio | Lectura del recorrido y casillas claras; evitar la hilera de manchas idénticas |
| C. Acción | Mesa, sillas, Anteros, jugadores, faroles cercanos | Máxima nitidez y contraste útil; grupo protagonista |
| D. Respaldo | Fachada, interior si se entra, jardineras, puesto y pozo | Detalle agrupado; ventanas y puerta con hueco, no pegatinas |
| E. Distancia | Tejados, árboles, camino al pueblo y cielo | Menor contraste y detalle; aire entre volúmenes, sin tapiz de adoquín infinito |

No se trata de eliminar la extensión ya hecha. El problema es cómo ocupa la pantalla y con qué jerarquía. Priorizar encuadre y distribución visual del detalle antes de añadir más edificios.

La referencia original organiza el patio con un borde curvo de piedra, madera, flores y faroles. Recuperar esa riqueza mediante un borde visual de baja altura y sus interrupciones, preservando las casillas existentes. No convertir el aro en una nueva barrera. El suelo junto a la mesa puede tener juntas radiales y desgaste propio que diferencien la zona sin parecer una tarima blanca flotante.

## 7. Arquitectura y materiales

La casa debe leerse como una vivienda habitada. Reutilizar su volumen practicable, puerta y recorte, añadiendo una fachada de piedra/revoco y madera compatible con Sylvania. Dar profundidad a ventanas, alféizares, marcos y entrada. Resolver laterales y parte trasera para que el giro limitado no revele una fachada decorada con costados lisos.

En cubierta: varias siluetas de teja agrupadas, cumbrera, alero con grosor, manchas de humedad y una chimenea proporcionada. No modelar cada teja ni renderizar miles de piezas. Usar textura y relieve moderado para el detalle pequeño; geometría donde cambia la silueta.

La escala del dibujo debe ser compartida: piedra grande con grupos de píxeles reconocibles, madera con vetas y nudos contenidos, metal con pocos reflejos, tela con pliegue claro. Evitar tanto el ruido fotográfico como superficies lisas con una textura diminuta repetida. Una pasada final de pixelado global no corrige una dirección artística incoherente.

| Material | Trabajo concreto | Error que evita |
| --- | --- | --- |
| Pavimento | 3–4 variantes compatibles, manchas amplias autoradas y juntas coherentes | Patrón repetido evidente o ruido aleatorio |
| Piedra | Caras con variación, bordes gastados y juntas oscuras moderadas | Muro de bloques idénticos o muro sin volumen |
| Madera | Familias para roble claro y oscuro, desgaste en bordes y apoyos | Mesas y sillas de plástico |
| Teja | Relieve y color por grupos, musgo solo donde procede | Tejado liso o una malla por teja |
| Tela | Mantel/corredor y cojines con motivos discretos | Grandes planos de color sin historia |
| Metal y cerámica | Brillos cortos, color local y silueta a zoom medio | Blanco quemado, cubiertos negros ilegibles |
| Vegetación | Racimos con huecos, ramas y tonos coherentes | Bolas verdes y flores como globos |

Hacer un atlas modular pequeño y reutilizable para esta escena. Mantener escala de texel y filtrado deliberados; comprobar parpadeo al alejar. El muestreo de sprites y el de paredes oblicuas pueden necesitar soluciones distintas. No imponer nearest-neighbor a todo indiscriminadamente.

## 8. Mesa, personaje sentado y detalles narrativos

La mesa tiene que contar que es una cena preparada: platos con espesor, copas, pan, botella, fuente y tela o papel. Agrupar elementos en 2–3 conjuntos que se lean desde el juego. Mantener libres las manos, caras y puntos de interacción. Los cubiertos individualizados que solo se aprecian en una captura ampliada tienen menor prioridad que una buena silueta.

Anteros ya dispone de `anteros_dinner_idle.png`; la animación de Cena usa una fila sentada del atlas. Conservar esa intención. Revisar asiento real, borde de la mesa por delante del cuerpo cuando corresponda y orden de profundidad de silla, espalda, brazos y piernas. En la captura de detalle, la silla frontal se lee como un bloque oscuro que tapa el torso del personaje próximo: necesita un respaldo reconocible y recorte que preserve su identidad.

No reemplazar automáticamente las identidades de Trinity/Silverfarben ni los atlas nuevos producidos en otros trabajos. El parecido con Octopath exige una escala de representación común, contornos limpios, pies estables y contraste coherente; no obliga a borrar el trabajo de personajes existente. Si su pintura detallada sigue separándose del entorno, preparar una adaptación de estilo conservando originales y aprobarla mediante comparativas, no un filtro destructivo global.

Rosa, vino, alimento y espejo pueden aparecer como detalles del desenlace **solo cuando lo respalde el progreso real**. No mostrar un objeto obtenido si la partida no lo tiene. En esta fase no se crea un sistema nuevo de cocinar, comer, asistentes autónomos o recompensas.

## 9. Iluminación e integración de actores

La escena ya configura ventanas, vela, dos postes y sombras; también aplica materiales específicos de Cena. No parte de cero. Sin embargo, en las imágenes hay mucha luz ambiental uniforme que reduce la separación entre planos, y el día puede blanquear el patio y la vajilla.

Propuesta artística: una masa cálida principal sobre mesa y caras, ventanas como segundo foco, relleno del cielo azul grisáceo y bordes periféricos más contenidos. Que la vela proyecte una variación pequeña y lenta; evitar destellos a pantalla completa. El contraste debe sobrevivir en un proyector con poco negro.

Hay una causa técnica concreta de la separación de personajes: `world-billboards.ts` usa materiales sin iluminación para preservar el dibujo. En `apps/web/world.ts` la función que consulta luz local de la escena está conectada únicamente a `mirror`. **Cena no recibe esa integración actual.** Ampliarla mediante una capacidad opcional por escena, usando el mecanismo del Espejo como referencia y preservando colores de identidad. No activar iluminación 3D indiscriminada en todos los tokens: puede dejar caras negras o revelar sprites como cartones.

Añadir apoyo visual mediante sombra de contacto estable y una dirección de sombra coherente cuando corresponda. La silla y mesa deben recibir contacto; una luz que atraviesa un muro o apaga el personaje al cruzar una casilla exige corregir el alcance, no pintar más brillo.

El reloj y clima existentes siguen mandando. El crepúsculo es el encuadre artístico principal, no una hora perpetua impuesta por el mapa. Validar día, atardecer, noche y selección manual del DM. La luz interior mantiene sus fuentes y el exterior respeta lluvia/nieve acumulada si la partida las tiene.

## 10. Atmósfera, profundidad y efectos

Ya existen capas compartidas `near`, `village`, `distant`, `panorama`, `atmosphere` y bruma lejana de Sylvania. Conviene reajustarlas para Cena; no duplicar un segundo horizonte encima. La palabra «capas» en configuración no demuestra que se distingan bien desde el encuadre final.

Añadir humo tenue de chimenea en su ubicación, leve movimiento de telas y hojas, insectos cerca de vegetación en condiciones adecuadas y polvo o brasas solo junto a su fuente. Diversificar profundidad: algún elemento puede cruzar una esquina cercana; el aire lejano separa casas. Las partículas no deben aparecer uniformemente por toda la pantalla ni atravesar interiores.

El enfoque selectivo será opcional: primer plano y fondo decorativo, nunca pies, casillas, puerta, selección o interacción. Primero resolver profundidad con geometría, tono y contraste. Con cámara ortográfica e inclinación baja, un desenfoque global basado solo en distancia puede afectar una gran parte del tablero: no activarlo como receta universal.

Glow debe quedar reservado a pequeñas llamas y fuentes justificadas. Bloom muy contenido, sin aureola alrededor de cada objeto o de los tokens. No añadir aberración cromática, grano animado o viñeta fuerte por defecto: degradan lectura y no resuelven las carencias observadas.

Respetar movimiento reducido. Al reducir calidad se quitan humo fino, desenfoque y capas secundarias antes que la composición, las siluetas, la iluminación principal o la identificación de personajes.

## 11. Cámara, recortes y claridad táctica

**Código actual:** inclinación continua de 5° a 25°, marcas de cinco grados, valor inicial general 25° e interior 10°. La preferencia por escena se conserva; combate no debe sobrescribir la inclinación elegida. Giro horizontal limitado de −30° a +30°, con valores intermedios. La fachada de Cena mira hacia +Z. No reinstalar el antiguo esquema 15°/25°/35° que aparece en evidencias del 18/10.

Para comparar el arte se fija **15° y zoom medio de juego**, como pidió el usuario, sin convertirlo en una nueva limitación de controles. Usar cinco giros de referencia −30/−15/0/+15/+30 y algunos intermedios para detectar saltos. Repetir los extremos actuales 5° y 25° para comprobar recortes.

El zoom debe permitir distinguir persona, silla y copa principal sin perder mesa y acceso. Como punto de calibración, buscar personajes de aproximadamente 50–85 píxeles de alto en una vista de 1280×720 próxima a la mesa; es una propuesta que debe validarse con los sprites reales y pantallas físicas. No fijar una escala mundial nueva para cumplir ese número.

El seguimiento limitado al contorno, recién trabajado en el Espejo, es un antecedente útil, no una mejora de Cena ya acreditada. Reutilizar su política de límites donde proceda con la geometría de esta finca, sin copiar dimensiones de la cueva. La cámara debe seguir al personaje sin acabar mostrando una gran alfombra de suelo o cortar su cuerpo cuando llega al borde.

El interior está demasiado abierto en algunas capturas: una habitación se convierte en rectángulo de suelo y paredes fantasma. Mantener segmentos de marco, jambas, alero y grosor que expliquen el edificio, ocultando solo las piezas que obstruyan. Recorte suave por oclusión real de personaje y objetivo, no desaparición de toda la fachada al aproximarse. Validar ambos lados de la puerta y la ocupación de sillas.

Primer plano y recorte visual no cambian línea de efecto, colisiones o secretos. Respetar el selector de cuadrícula, su opacidad, grosor y color; debe seguir clara cuando está activa. El proyector conserva su preferencia/política actual. **WASD y joystick mantienen la orientación estable del mapa al girar cámara**, según la decisión del usuario.

## 12. Tres desenlaces coherentes con la aventura

El servidor resuelve el final conforme a los resultados registrados y arbitraje DM. Brindar no suma automáticamente puntos ni selecciona moralidad. La presentación reacciona al estado existente; nunca lo decide a partir de un gesto o una iluminación bonita.

| Estado existente | Tratamiento propuesto | Restricción funcional |
| --- | --- | --- |
| Sin final resuelto | Cena preparada, expectativas abiertas | No anticipar desenlace ni mostrar invitados/recompensas inexistentes |
| `celebration` | Luz acogedora, comida/objetos coherentes, gestos tranquilos y aire vivo | No crear PNJ interactivos ni puntuaciones sin soporte del servidor |
| `solitude` | Composición íntima y más espacio negativo; menos actividad y mezcla contenida | Respetar el texto narrativo de ese final; no reinterpretarlo como derrota |
| `darkness` | Apagado coherente de fuentes, detalle ambiental mínimo y siluetas de seguridad | Mantener controles, selección y retorno a DM; no crear un bloqueo visual |

Actualmente `celebration` multiplica las luces locales por 1,35, `solitude` por 1,12 y `darkness` las apaga junto con llamas y piscinas de luz. El audio ya silencia la escena para oscuridad; Sylvania puede elegir luz natural nocturna cuando el entorno está en modo automático. Auditar transiciones ida/vuelta y carga del estado: no dejar objetos emisivos encendidos tras apagar sus fuentes, ni dejar el mapa roto al deshacer una decisión.

Cualquier nuevo detalle propio de un final se identifica y destruye/restaura correctamente al cambiar el estado. Se necesitan ejemplos de los tres estados, no solamente una captura cálida que se considere terminada.

## 13. Sonido y presentación de interacción

La Cena tiene música «esperanza» a volumen configurado 0,25 y SFX recomendados de silla, copa, bebida y puerta. Sus capas ambientales declaradas están apagadas por defecto; parte del catálogo reutiliza identificadores genéricos de canales como `ocean`, `wind`, `wood` aunque las fuentes son fuego/ambiente de otros sitios. Auditar la mezcla real antes de encenderlos: el nombre de un canal no implica que su contenido encaje.

Diseñar una base exterior tranquila, fuego cercano a chimenea y faroles cuando proceda, roce de hojas y uno o dos gestos de mesa espaciados. La música necesita una entrada y salida suaves al llegar desde Espejo. Evitar un solapamiento de viento helado con la cena. La voz del DM debe poder escucharse sin ajustar continuamente cinco canales.

Celebración puede conservar la esperanza; soledad requiere menos capas, no una nueva música obligatoria; oscuridad respeta el silencio ya definido. Los sonidos del jugador no deben duplicarse por cada cliente: conservar las reglas actuales de salida de audio, normalmente el proyector designado, y el desbloqueo por gesto del navegador.

La señal «Brindar con Anteros» debe aparecer junto a la interacción o en el control existente sin cubrir caras ni platos. Mantener tamaño táctil, posición y preferencias del jugador. Los diálogos siguen siendo de la mesa: no añadir textos, voces automáticas o grandes bocadillos que impongan decisiones. El pase de Cena no incluye rediseñar toda la consola DM o de combate.

## 14. Arquitectura de implementación y reutilización

| Archivo o sistema | Papel actual | Trabajo previsto |
| --- | --- | --- |
| `campaigns/one-shot/playground/d8night.config.ts` | Objetos, luces y navegación de Cena | Añadir datos visuales separados de las posiciones físicas |
| `campaigns/one-shot/playground/renderer.ts` | Construcción, materiales, sombras, recorte y finales | Integrar una presentación Cena con ciclo de vida propio; evitar otra cadena global de correcciones por nombre |
| `campaigns/one-shot/playground/sylvania-environment.ts` | Entorno compartido de pueblo | Reutilizar capas y paleta; ajustes opcionales solo para Cena |
| `campaigns/one-shot/public/pack.ts` | Casillas, actores, atlas y catálogo audio | Preservar contratos; solo referencias artísticas o perfil de audio necesarios |
| `apps/web/world.ts` y `engine/client/world-billboards.ts` | Cámara y actores | Capacidad opcional de luz para Cena, sin cambiar orientación de movimiento |
| `apps/web/audio.ts` | Mezcla y silencio por desenlace | Transiciones y ambiente con el mezclador existente |
| `campaigns/one-shot/server.ts` | Estado y acceso a interacción/escenas | Reutilizar eventos actuales; no trasladar decisiones privadas al cliente |

Un módulo de presentación opcional de Cena puede poseer raíces, materiales, atlas, luces y actualizadores, exponer luz local y liberar todo al salir. Debe integrarse con el ritmo del renderer, reloj, clima y recorte ya presentes. No empezar una segunda escena Babylon, un segundo reloj, otro mezclador o un editor de mapas independiente.

Punto decisivo: el modo integrado usa GlowLayer selectivo reducido y FXAA, pero desactiva bloom, SSAO y el postproceso de imagen de la pipeline; el visor independiente sí activa varios. Esto no significa que la mesa carezca de tratamiento de color en materiales/escena. Significa que una captura bonita del Playground **no acredita el resultado en `/dm`, `/player` y `/projector`**. La aceptación principal será en la mesa integrada.

## 15. Biblioteca y producción de arte

Reutilizar primero la referencia Cena, la pose de Anteros, familia de materiales Sylvania, sonidos de copa/silla/puerta y efectos adecuados. Los originales permanecen intactos. No usar una ilustración completa como suelo con luces y personajes horneados: rompería perspectiva, oclusiones y los tres finales.

| Paquete de trabajo | Contenido mínimo | Formato y comprobación |
| --- | --- | --- |
| Materiales del patio | Adoquín, tierra, musgo, piedra de borde, madera | Atlas y variantes con escala común, sin rejilla ni sombras direccionales horneadas |
| Vivienda | Piedra/revoco, vigas, tejas, huecos y chimenea | Piezas modulares y textura; frente/laterales válidos a ±30° |
| Vegetación | Setos irregulares, plantas de flor, ramaje cercano y enredaderas | Transparencia limpia, agrupaciones y coste de superposición controlados |
| Banquete | Textil, comida, botella, platos y sillas | Silueta legible, sin duplicar el personaje ya sentado |
| Ambiente | Humo y partículas discretas | Atlas pequeño compartido, sin efecto a pantalla completa permanente |
| Finales | Variantes/reacciones según estado existente | Capas reversibles; sin reglas nuevas |

El registro local atribuye música del desenlace a Fantasy Song Pack Volume 1 y distintos recursos a CC0; otros originales y derivados aportados no tienen autorización de redistribución verificada. Eso no se corrige declarando todo CC0. Esta auditoría no incorpora ni descarga nuevos assets. En producción, comprobar la licencia concreta de cada incorporación y registrar URL, autor, licencia, fecha, original y derivado. Octopath sirve como referencia; sus capturas no se incorporan al juego.

## 16. Rendimiento: base real y presupuesto propuesto

La medición existente del 18/10 fue a 1280×720, con 24 redibujados forzados y espera de GPU: mediana 8,7 ms, p95 9,7 ms, 725 mallas totales, 270 activas, 540 llamadas de dibujo y 56 texturas, estimación 55,15 MiB. **No son FPS actuales de un móvil ni una prueba prolongada**, ni se presentan como rendimiento de la candidata futura.

540 llamadas para una escena íntima aconsejan agrupar materiales y geometría antes de añadir detalle. Medir por separado elementos estáticos, sombras y transparencias. La reserva de 5 luces puntuales de la configuración no garantiza que todas aporten algo; elegir las relevantes para cámara y grupo.

Presupuestos iniciales de aceptación, a recalibrar en E0 con el equipo real:

| Perfil | Objetivo propuesto | Cómo conservar el aspecto |
| --- | --- | --- |
| PC MSI/proyector 1080p | p95 de cuadro ≤25 ms y sin pausas recurrentes >100 ms; aspirar a ≤300 draw calls | Agrupar estáticos/atlas, sombras selectivas, detalle por silueta |
| Pixel 9a Chrome | p95 ≤50 ms durante 15 minutos, sin cierre de pestaña; aspirar a ≤180 draw calls | Menos transparencias, sin DoF/SSAO, sombras y partículas reducidas |
| Texturas | Orientación inicial ≤96 MiB estimados PC y ≤64 MiB móvil para la escena completa | Atlas acotados, carga por escena y liberación; medir picos en transición |
| Cambio de escena | Sin crecimiento progresivo tras 20 idas/vueltas | Dispose de listeners, raíces, luces, materiales y texturas propias |

Son metas de este plan, no resultados. Si no se alcanzan, explicar la medición y resolver el coste; no falsear un contador o bajar la resolución hasta perder personajes. Mantener el mapa funcional en cada fase, degradación visual estable y caché identificada por versión.

## 17. Siete fases de ejecución con candidata funcional

**Iluminación y profundidad son dos objetivos principales del encargo, no un acabado opcional al final.** La profundidad combina volúmenes y siluetas, oclusión selectiva, escala de detalle, contraste entre planos, sombras, aire y movimiento. El desenfoque es solo un recurso opcional. La iluminación incluye dirección de luz, relleno ambiental, fuentes locales, sombras, respuesta de materiales y personajes, y cambios de hora/estado.

El resultado debe mostrar personajes dentro de un lugar: elementos delante de ellos, patio que pueden recorrer, casa que los respalda y mundo que continúa detrás. No basta con iluminar mejor la mesa sobre un suelo plano ni con poner una imagen borrosa al fondo. Tampoco se añade volumen fuerte por todas partes: el plano táctico conserva claridad y las alturas físicas actuales.

| Fase | Entrega de profundidad | Entrega de iluminación |
| --- | --- | --- |
| E0 | Identificar cinco planos, vacíos y oclusiones en capturas reproducibles | Inventariar fuentes, sombras y diferencias entre visor y mesa; base día/crepúsculo/noche |
| E1 | Construir composición, primer plano y continuidad lejana | Bloqueo inicial de luz: foco cálido central y jerarquía entre planos ya visibles |
| E2 | Siluetas, huecos, relieves y materiales de escalas coherentes | Materiales que responden de forma distinta a luz y sombra, sin iluminación incompatible horneada |
| E3 | Contacto de suelo, muebles y actores; sombras que explican forma y distancia | Pase completo de luz natural, local, sombras, personajes y color |
| E4 | Separación atmosférica, movimiento y efectos en distintas profundidades | Luz en humo/partículas y resplandor selectivo, con perfiles medidos |
| E5 | Composición y actividad propias de cada desenlace | Tres estados de luz reversibles, audio y reloj coherentes |
| E6 | Comparativas y secuencias que acreditan planos y oclusión desde varios puntos | Matriz de día/noche/finales y aceptación en mesa integrada y dispositivos |

### E0. Base de profundidad, iluminación y contrato de escena

Leer el estado actual y cambios de otros chats; generar una nueva base del código que se vaya a implementar. Capturar Cena en mesa integrada, no solo visor: llegada, mesa, puerta/interior, pozo/lateral y límite del patio; 15°, zoom de juego y cinco giros. Guardar cámara, reloj, clima, estado narrativo, navegador, resolución, hash y métricas. Repetir día/noche y los tres finales en instancias aisladas. Registrar sprites realmente utilizados.

Marcar en la base qué ocupa primer plano, llegada, acción, casa y distancia; dónde se aplana la imagen y qué tapa al personaje. Inventariar sol/cielo, ventanas, faroles, vela, chimenea, sombras, emisivos y luces recibidas por actores. Registrar qué fuentes están configuradas y cuáles contribuyen realmente al render integrado; no confundir intensidad declarada con resultado visible.

Salida: base ejecutable, mapa de planos y esquema de fuentes. Aceptación: transición Espejo→Cena, puerta e interacción legales; 318 casillas/4 difíciles o diferencia previa documentada. Deben poder señalarse las carencias de profundidad y luz sobre imágenes concretas. No iniciar el arte con una navegación rota ni usar una partida real para fabricar ejemplos de finales.

### E1. Profundidad del escenario, composición y luz inicial

Corregir escala del encuadre y límites; organizar los cinco planos, fachada y patio. Añadir primer plano parcial en huecos seguros: ramaje lateral, borde de carro, farol o alero. Crear continuidad de casas y vegetación detrás de la zona de acción, con solapamiento de siluetas y contraste decreciente. Conservar geometría física y mejorar el recorte interior sin borrar toda la identidad de la vivienda.

Probarlo caminando y girando: un elemento cercano puede pasar por delante de la cámara y enmarcar la escena, pero debe apartarse visualmente si tapa al personaje, puerta o interacción. Los planos deben permanecer anclados al mundo y ser coherentes con nuestra cámara ortográfica; no desplazar la cuadrícula o la geometría jugable para simular paralaje.

Hacer ya un bloqueo sencillo de luz: mesa y grupo como foco cálido, casa como respaldo secundario y periferia contenida. Así se comprueba la composición antes de producir texturas. No esperar a E3 para descubrir que todos los planos tienen el mismo valor o que Anteros queda perdido.

Salida: candidata jugable con profundidad reconocible, incluso con materiales sencillos y sin desenfoque. Aceptación: se identifican primer plano, acción y distancia a 15°/zoom medio desde varios puntos; personajes, mesa y acceso reconocibles; sin vacío al girar, oclusiones impeditivas, cambios de WASD o pérdida de preferencias.

### E2. Arquitectura, materiales y profundidad de superficie

Producir/adaptar atlas y siluetas; reemplazar lectura de bloques y bolas por materiales y vegetación coherentes. Detallar mesa/sillas y transiciones del patio. Resolver lado interior/exterior de puerta y edificio.

Trabajar profundidad grande en aleros, marcos, huecos y copas; media en grupos de piedra, tejas, tablas y hojas; pequeña en textura y relieve contenido. La madera no responde como metal, la tela no brilla como cerámica y el musgo no parece plástico. No hornear sombras de un sol fijo que luego contradigan reloj y clima. Reservar geometría para siluetas y profundidad visible; no una malla por cada detalle diminuto.

Salida: candidata con arte trazable y materiales legibles bajo la luz inicial. Aceptación: fuentes y derivados registrados, sin píxeles de Octopath; escala coherente, huecos reconocibles y ausencia de repetición dominante; colisiones y navegación iguales. Comparar con la referencia original para conservar riqueza sin convertirla en copia plana.

### E3. Iluminación completa, sombras y personajes dentro del ambiente

Entregar un pase de iluminación completo, no solo encender más luces:

- Luz natural principal con dirección legible y relleno frío/suave del cielo; intensidad y color coherentes con reloj y clima. Evitar un tinte uniforme que borre materiales.
- Ventanas, faroles, vela y chimenea como fuentes locales justificadas, con alcance y contribución controlados. El foco de mesa ilumina caras, ropa, vajilla y superficies cercanas.
- Sombras direccionales y de contacto para apoyar muebles, plantas y personajes. Sombras proyectadas explican forma; contacto y oclusión dan peso en uniones, pies y asiento. Reutilizar soluciones existentes antes de añadir AO costoso.
- Luz local opcional para actores de Cena, preservando color de identidad, escala, animación y pies. Resolver solapamientos de cuerpo, silla y mesa y evitar que el sprite parezca una pegatina luminosa.
- Contraste y tratamiento de color comunes para escenario y actores: luces cálidas, sombra con detalle, fondo más contenido, sin blancos quemados. Mantener legibilidad del proyector.

Comprobar puerta abierta/cerrada, entrada/salida de casa, faroles encendidos/apagados y transición de día a noche. No debe haber luz local atravesando una pared como si no existiera. Las zonas más oscuras conservan selección, interacción y claridad táctica; no se introducen reglas nuevas de visión.

Salida: candidata con esquema completo de fuentes y comparativas equivalentes de día, crepúsculo y noche en mesa integrada. Aceptación: se reconoce de dónde viene la luz; actores y mobiliario pertenecen a ella; sombras estables, caras/manos legibles y nada flotando, negro absoluto o quemado. La profundidad de E1 sigue visible sin filtros.

### E4. Profundidad atmosférica, luz en el aire y movimiento

Añadir separación atmosférica por distancia, humo de chimenea, viento leve y partículas localizadas en distintas profundidades. El plano lejano pierde contraste y detalle respecto al patio; el cercano puede enmarcar con mayor oscuridad. El aire no se resuelve con una capa gris uniforme sobre toda la pantalla.

Humo y partículas deben ocupar un volumen/posición coherentes, quedar ocultos por edificios cuando corresponda y no atravesar interiores. Algunas hojas o motas pueden cruzar una esquina cercana a la cámara, otras quedar al fondo: no repartir el mismo tamaño, brillo y velocidad por toda la imagen. Mantener libres caras, casillas e interacción.

Representar luz en el aire solo cuando la fuente y el lugar la justifiquen, por ejemplo una abertura iluminada con humo: usar haces locales contenidos o una aproximación económica medida, sin exigir volumetría a pantalla completa. Resplandor selectivo en llama/farol y ventanas; sin aureolas sobre todos los objetos. Desenfoque opcional en decoración cercana/lejana, nunca sobre el plano táctico o como sustituto de E1.

Integrar movimiento reducido y perfiles de calidad. En móvil puede reducirse humo, partículas y posprocesado, pero deben seguir presentes las siluetas, los planos y la dirección de luz. No crear un fondo plano distinto para el perfil bajo.

Salida: candidata con atmósfera en profundidad, movimiento y medidas por dispositivo/visor. Aceptación: comparar efectos activados/desactivados y grabar una secuencia de llegada, giro y aproximación; el movimiento revela capas sin tapar el juego. Sin bucles caros, transparencias masivas, lluvia bajo techo o pérdida del foco cálido.

### E5. Desenlaces, audio e interacción

Aplicar variantes reversibles para los estados existentes, revisar silencio y mezcla, llegada desde Espejo y brindis. Ajustar solo los elementos de interfaz necesarios para esa escena.

Celebración, soledad y oscuridad necesitan composición, cantidad de actividad y luz acordes, no únicamente un multiplicador global de intensidad. Conservar la continuidad del lugar al cambiar de final: posiciones y planos permanecen, fuentes y detalles reaccionan de manera reversible. Oscuridad no elimina controles ni capacidad de orientarse.

Salida: candidata con tres desenlaces completos y comparativas de su iluminación/ambiente. Aceptación: estado autoritativo común en DM/jugador/proyector; ni finales duplicados ni inventario ficticio; cambiar/cargar final restaura fuentes, sombras, emisivos y detalles; audio sin solape ni duplicación por cliente.

### E6. Cierre, comparación y entrega

Construir candidata aislada completa y probar mesa integrada. Verificar guardado/carga, reconexión, escena anterior/siguiente, permisos, consola y liberación de recursos. Hacer secuencias de 15 minutos, matriz de cámaras y galería antes/después equivalente. Conservar mejoras del Espejo y de personajes de otros chats.

Exigir tres entregas visuales: escenario sin efectos de atmósfera/desenfoque para acreditar profundidad y luz base; acabado completo; y perfil móvil. Compararlas con misma cámara, posición, hora, clima y desenlace. Añadir un vídeo corto en movimiento para acreditar primer plano, recorte y separación de planos: una captura estática bonita no basta.

Salida: candidata ejecutable, instrucciones Windows, créditos, evidencia de iluminación/profundidad, pruebas y lista de comprobaciones físicas pendientes. La aceptación artística corresponde al usuario; no declarar «idéntico a Octopath» por pasar tests. Cada fase anterior deja un VTT arrancable; E6 no es el primer momento en que se compila todo.

## 18. Lista de aceptación final

| Área | Criterio observable |
| --- | --- |
| Identidad | Cena íntima reconocible; casa, patio, mesa y Anteros son protagonistas |
| Profundidad geométrica | Se distinguen primer plano, juego, respaldo y distancia a 15°/zoom medio, incluso sin desenfoque ni atmósfera |
| Profundidad en movimiento | Llegada, giro y aproximación muestran capas ancladas al mundo; primer plano selectivo y personaje/objetivo visibles |
| Material | Piedra, madera, teja, tela y vegetación se reconocen sin acercamiento de editor |
| Táctica | Cuadrícula y casillas claras si están activas; selección y destino nunca perdidos bajo decorado |
| Cámara | Cinco giros y sus intermedios; rango actual 5–25°; sin saltos, vacío ni cambios de WASD |
| Interior | Puerta, marcos y estancia entendibles; techo/paredes recortados solo donde procede |
| Actores | Pies, asiento, tamaños, animación y respuesta a luces coherentes |
| Iluminación | Dirección y fuentes reconocibles, cálido/frío coherente, sombra proyectada y contacto; materiales y actores reciben el mismo ambiente |
| Estados de luz | Día/crepúsculo/noche y tres desenlaces legibles; cambio de hora inmediato, transición natural suave; fuentes y emisivos reversibles |
| Profundidad atmosférica | Distancia con contraste contenido; humo/partículas en planos coherentes y oclusión correcta, sin velo uniforme ni objetivos tapados |
| Sonido | Llegada, brindis, soledad y oscuridad consistentes; sin audio duplicado |
| Función | Movimiento, puerta, interacción, progreso, final, inventario y vuelta de escena preservados |
| Sincronización | DM, dos jugadores y proyector comparten estados; preferencias locales mantienen su autoridad |
| Recuperación | Reconectar y cargar no duplica luces/SFX ni pierde final o posiciones |
| Rendimiento | Medición nueva, sostenida y comparable; liberación tras cambios de escena |
| Entrega | Ejecutable verificable, comparativas de cámara equivalente y licencias registradas |

Matriz visual mínima: cinco puntos × cinco giros a 15° = 25 vistas por estado de luz principal. Añadir extremos 5°/25°, puerta dentro/fuera, tres desenlaces, cuadrícula visible/oculta y móvil vertical/horizontal. Automatizar las combinaciones geométricas cuando aporte valor; reservar la valoración artística para imágenes revisadas, no solo contadores.

## 19. Pruebas realizadas en esta auditoría

Se han aprobado **41 pruebas en cuatro archivos**: `engine/server/one-shot.test.ts` (23), `engine/client/d8-playground-package.test.ts` (1), `engine/client/d8-camera.test.ts` (10) y `engine/client/camera-movement.test.ts` (7). Cubren base de campaña, empaquetado, contratos de cámara y movimiento. Se añade la inspección aislada de cambio de escena y conectividad descrita en el apartado 4. [Salida automatizada](../../output/d8-dinner-octopath-audit-20261020/baseline-tests.txt).

No se ha ejecutado una batería nueva de red, recorrido legal completo, guardado físico, teléfono, proyector, audio físico o rendimiento prolongado. No hay capturas de un «después» inventado. Las cifras antiguas se conservan con su fecha; las metas futuras están señaladas como propuestas. Esta auditoría no exige una compilación nueva del juego porque no modifica código de ejecución.

## 20. Decisión recomendada y siguiente trabajo

Empezar por **E0 y E1 de Cena**, conservando el resto de mapas y la funcionalidad. La primera comparación tiene que demostrar que el patio ya se siente como un lugar profundo y bien encuadrado antes de invertir en humo, bloom o docenas de props. Después completar E2–E6 siguiendo el contrato de esta auditoría.

La escena más parecida a Octopath será la que tenga mejor dirección y consistencia, no la que tenga más filtros. Aquí el objetivo concreto es que, al llegar al final de D8, se vea una casa habitada, una mesa preparada y personajes que pertenecen a ese ambiente, con el tablero todavía cómodo para jugar.

## 21. Lista literal para ejecutar la mejora sin rediseñar el mapa

La fuente de las instrucciones numeradas es `docs/design/D8_DINNER_LITERAL_CHECKLIST_20261021.json`; su versión legible es [C01–C60, punto por punto](D8_DINNER_LITERAL_CHECKLIST_20261021.md). El informe visual muestra cada instrucción completa y permite buscarla por ID, categoría o fase. No basta con aplicar el resumen de una fase y omitir los puntos correspondientes.

Para cada Cxx, el chat implementador debe revalidar la evidencia contra el código que recibe, anotar pendiente/ya resuelto/no reproducible/no aplicable con motivo y, si procede, implementar la mejora concreta conservando lo indicado. Un punto condicionado puede terminar como omitido con justificación; no se exige añadir haces de luz, humo, desenfoque o bloom sin necesidad o sin presupuesto.

Se acepta una mejora del mismo mapa. Mantener casa, patio circular, mesa y sillas, pozo, puesto, caminos, accesos y vegetación principal en sus posiciones y envolventes. Revestimientos, bordes, ramas y detalles se mejoran dentro de ellas. No crear pisos, habitaciones, muros, barreras, fuentes o personajes nuevos para conseguir una imagen más vistosa. Los pequeños detalles decorativos coherentes no alteran colisión ni historia.

El otro chat entregará evidencia ligada a los IDs y una candidata jugable, no solo una reinterpretación artística. Las capturas históricas y las 41 pruebas del 20/10 siguen fechadas como base; esta ampliación de instrucciones no acredita una ejecución nueva.
