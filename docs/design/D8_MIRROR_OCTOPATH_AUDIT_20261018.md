# D8 Night · auditoría del Espejo frente a Octopath Traveler

Fecha: 18 de octubre de 2026. Escenario auditado: `mirror`, «Espejo de plata del amor verdadero», V65. Estado: análisis y especificación de acabado; las mejoras propuestas todavía no están implementadas.

## 1. Dictamen

El Espejo funciona como escenario táctico, pero su acabado actual sigue siendo el de un conjunto de formas 3D simples sobre una superficie azul. Todavía está lejos de la continuidad espacial, riqueza de materiales, composición y atmósfera de las referencias de Octopath aportadas por el usuario.

La mayor mejora vendrá de reconstruir su **presentación artística**, conservando la partida: una caverna helada que envuelva al jugador, una reliquia reconocible como espejo, materiales coherentes, profundidad entre planos y personajes integrados en la luz. El desenfoque, el resplandor y las partículas deben rematar ese trabajo. Activarlos sobre la composición actual no resolvería sus carencias principales.

El objetivo recomendado es una **caverna del Espejo con lenguaje HD-2D**, original y compatible con el tablero de D&D. Debe parecer un lugar habitado por luz, hielo y magia desde varios puntos de juego, no únicamente en una captura de presentación. El alcance de la primera implementación debe limitarse a este mapa.

No hace falta iniciar una migración de motor para probar esta dirección: ya tenemos Babylon, personajes sobre planos 3D, profundidad, sombras, efectos, un reloj y una capa autoritativa de juego. Primero hay que demostrar el acabado sobre esa base.

## 2. Qué se ha comprobado y qué no

| Evidencia | Alcance real |
| --- | --- |
| Capturas V65 del 18/10 | Vistas general/media/cercana, hojas de inclinaciones y giros, día, atardecer, noche y combate. Imágenes del renderizador real en una revisión aislada. |
| Hoja del Espejo a 15° | Tres puntos y cinco giros horizontales; archivo guardado a las 21:21 del 18/10. La tanda anterior siguió produciendo imágenes tras perderse el control del navegador. |
| Código actual | Configuración, construcción del escenario, materiales, recorte por cámara, luces, personajes, transformación, clima, audio y contrato de navegación. Huellas de cinco fuentes registradas en el archivo de base. |
| Pruebas nuevas de esta auditoría | **44 pruebas aprobadas en 9 archivos**, sin cambios de producto. Validan aspectos funcionales; no puntúan la calidad artística. |
| Rendimiento | Se reutiliza una medición existente del 18/10, a 1280 × 720. No se ha ejecutado una medición nueva de GPU ni una prueba sostenida en dispositivos físicos. |
| Animación y sonido | Inspección de implementación y recursos. No hay una nueva revisión de vídeo ni escucha en móvil/proyector en esta auditoría. |
| Presentación del informe | HTML y Markdown generados, con sus enlaces y referencias locales comprobados. La política del navegador bloqueó la apertura automática del archivo HTML local; no se certifica una revisión visual de esa página en pantalla. |

La hoja de tres puntos modifica instantáneas locales para obtener encuadres. «Centro» no significa que un jugador haya llegado andando a esa casilla: el selector genérico de puntos puede elegir hielo letal. Sirve como evidencia de composición; no demuestra un recorrido legal. Las siguientes capturas de jugabilidad deberán proceder de posiciones seguras comprobadas con el servidor.

No se ha abierto ni guardado una partida, cambiado el puerto 3000, recompilado la distribución de juego ni publicado nada en GitHub. Se preservan los cambios de otras tareas presentes en el espacio de trabajo.

Evidencia reproducible: [base extraída del código y huellas](../../output/d8-mirror-octopath-audit-20261018/baseline.json), [salida de las 44 pruebas](../../output/d8-mirror-octopath-audit-20261018/baseline-tests.txt), [revisión visual V65 anterior](../../docs/evidence/D8_V65_VISUAL_POLISH_20261016.md).

## 3. Qué estamos tomando de Octopath

Acquire describe una combinación de personajes pixel art 2D con entornos mayoritariamente 3D, cuyo reto es hacer que ambos parezcan pertenecer al mismo mundo. También explica que el diseño de mapas se compone para una cámara de exploración controlada. Es una referencia útil para nuestro enfoque de 15° y giro limitado. [Entrevista oficial sobre Octopath Traveler II](https://www.unrealengine.com/developer-interviews/octopath-traveler-ii-builds-a-bigger-bolder-world-in-its-stunning-hd-2d-style?lang=en-US).

El equipo artístico del primer juego destaca la combinación de luces con efectos para integrar sombras y entorno. Ese principio resulta más relevante aquí que copiar un efecto de pantalla aislado. [Entrevista oficial sobre el primer Octopath](https://www.unrealengine.com/spotlights/octopath-traveler-s-hd-2d-art-style-and-story-make-for-a-jrpg-dream-come-true).

El siguiente análisis de capas, color, desenfoque y partículas es una lectura visual de las imágenes del usuario. No se afirma conocer los valores de sus shaders, su número de luces, su proyección exacta o la implementación interna de cada efecto. Las capturas proceden de vídeo y no permiten atribuir todo el desenfoque exclusivamente al motor.

De las referencias se toman seis principios: continuidad del mundo, superposición de planos, material gráfico coherente, luz que dirige la mirada, atmósfera situada en el espacio y movimiento ambiental contenido. No se trasladan automáticamente su cámara de combate, su interfaz JRPG ni sus reglas al VTT.

## 4. El mapa actual, con datos

- Superficie de referencia: **30 × 19,5 m**, cuadrícula de **20 × 13 casillas de 1,5 m**.
- El catálogo contiene 260 casillas transitables; 205 constan como difíciles y **49 como peligro de hielo fino**. «Transitable» no significa «segura»: el servidor permite entrar y aplica la consecuencia correspondiente.
- Reliquia: un único objeto autoritativo `true-love-mirror`, representado por la escena 3D. La lógica lo sitúa en la casilla 3,4; la geometría visual está alrededor de X = −9,2 y Z = −2,5. Sus pivotes deberán seguir alineados.
- Entradas reales del grupo: casillas 17,11; 17,10; 16,11, seguras según la definición actual. La primera corresponde a X = 11,25 y Z = 7,5.
- Decoración declarada: 1 lago, 3 conjuntos de grietas, 1 pedestal, 1 marco de espejo, 9 cristales, 6 placas de hielo, 4 grupos de roca, 1 dispersión de suelo y 6 crestas. El renderer añade paredes, prolongaciones y decoración distante.
- Cámara vigente: ortográfica, 15°/25°/35° y cinco giros relativos: −30°, −15°, 0°, +15°, +30°. La cifra FOV de la configuración no es el control de encuadre de esta proyección; el tamaño ortográfico y el foco sí lo son.

La medición previa registra **393 mallas totales, 204 activas, 249 llamadas de dibujo y 46 texturas**, con unos **42,40 MiB estimados de texturas**. Mediana de fotograma forzado: 4,5 ms; p95: 5,7 ms; 24 muestras calientes. No son una medida de la latencia completa de la aplicación, de la memoria total del controlador, de una sesión larga o del Pixel 9a.

## 5. Comparación visual y diagnóstico

| Área | Resultado actual | Acabado objetivo | Prioridad |
| --- | --- | --- | --- |
| Composición | Mucho suelo vacío; grupo pequeño; reliquia y perímetro separados por grandes superficies homogéneas. | Encadenar entrada, borde del lago y espejo; conservar claridad sin enseñar toda la arena a la vez durante exploración. | P0 |
| Primer plano | El recorte elimina la mitad del perímetro próxima a cámara. | Salientes, hielo o columnas que enmarquen y pasen delante sin ocultar personajes ni peligros. | P0 |
| Sensación de cueva | Corona de rocas relativamente baja sobre una explanada que continúa al exterior. | Paredes estratificadas, bóveda sugerida, huecos y galerías lejanas; un interior reconocible a 15°. | P0 |
| Siluetas | Cristales cónicos y masas facetadas repetidas. | Hielo con agrupaciones, fracturas y perfiles diferentes; roca con estratos y escala verosímil. | P0 |
| Textura | Grano fino añadido sobre formas aún simples; muchas superficies siguen siendo bloques amplios de color. | Pintura de material con estructura grande, media y pequeña: estratos, escarcha acumulada y detalle selectivo. | P0 |
| Color | Cian y azul cubren suelo, pared, magia y distancia con poca separación. | Nieve más neutra, roca azul grisácea, sombras profundas y cian reservado a magia e hielo; variación por plano. | P0 |
| Espejo | Aro circular con foco radial muy luminoso; se lee como portal. | Reliquia plateada reconocible, cristal con profundidad aparente y presencia sobrenatural sin perder su material. | P0 |
| Luz | Existen luces locales y sombras, pero el resultado presenta focos muy cian y superficies bastante uniformes. | Jerarquía de luz: espejo dominante, ambiente de caverna tenue y fuentes secundarias justificadas. | P0 |
| Personajes | Integrados en profundidad, con pies y sombra de contacto; materiales sin iluminación local. | Mantener nitidez, pero incorporar temperatura y aporte de luces cercanas, sin convertirlos en modelos realistas. | P0 |
| Hielo peligroso | El contraste azul existe; las seis placas elevadas pueden parecer apoyos seguros. | Peligro reconocible también por fractura y borde, coherente con las casillas realmente letales. | P0 funcional |
| Atmósfera | Niebla global y motas previstas; poca separación visible entre distancias. | Bruma baja localizada, galerías veladas y partículas distribuidas entre planos. | P1 |
| Enfoque | No se ha encontrado un tratamiento de profundidad de campo equivalente en la ruta revisada. | Enfoque selectivo de decorado cercano y fondo; tablero y actores útiles siempre legibles. | P1 |
| Animación | Pulsos, giro/flotación de cristales, ondas y chispas. | Movimiento más orgánico y ligado al material; activación y aparición con una secuencia visual clara. | P1 |
| Sonido | Música, viento gélido, pasos y SFX disponibles. | Mezcla de interior, profundidad sonora y eventos puntuales que acompañen los estados del espejo. | P1; escucha pendiente |
| Presentación táctica | Cuadrícula y aros funcionan, pero pueden dominar la composición. | Mantener preferencias por dispositivo y una superposición sobria sobre el acabado ambiental. | P1 |

![Espejo actual: detalle de la reliquia](../../output/d8-polish-20261016/d8-mirror-polish-after-near.png)

El detalle cercano muestra el problema central: aumentar la resolución del grano no cambia que las rocas se lean facetadas, los cristales como conos y el espejo como un aro luminoso. Hace falta intervenir en las formas, su agrupación y la pintura de materiales.

## 6. Causas concretas en el código

### 6.1. El primer plano se está retirando deliberadamente

En `setViewContext`, cada malla marcada como cresta de recorte se oculta si está en el lado de la cámara, aunque no tape al personaje. También se oculta si corta sus rayos de visibilidad. Es una solución útil para despejar el tablero, pero elimina precisamente el encuadre delantero que se admira en Octopath.

**Cambio propuesto:** separar pared jugable, primer plano escénico y fondo. Conservar las partes delanteras que no obstruyan información útil; atenuar u ocultar únicamente las piezas que crucen la silueta del personaje, su interacción o un peligro cercano. Aplicar histéresis y transición para evitar parpadeos. No colocar otra cúpula opaca completa: el propio código documenta que anteriormente ocultaba la arena.

Fuente: [renderer, bloque de recorte hacia línea 4800](../../campaigns/one-shot/playground/renderer.ts).

### 6.2. El tratamiento pixel art no es uniforme

Hay texturas procedurales con gradientes y grano, geometría explícitamente facetada y personajes ilustrados de alta resolución. El sistema de personajes usa mipmaps y filtrado trilineal para evitar destellos cuando se reducen. Ese filtrado tiene una razón técnica; sustituirlo globalmente por `nearest` no convertiría las ilustraciones en sprites de Octopath.

**Cambio propuesto:** fijar una escala de detalle visible común, paletas y formas de agrupación de píxeles. Crear materiales y variaciones dibujadas para ese tamaño de juego. Preparar una adaptación de arte de personaje coherente cuando se llegue a esa fase, conservando los originales. Revisar el filtrado por familia de recurso; no aplicar pixelado, ruido o posterización global como solución artística.

Fuentes: [materiales y pase del Espejo](../../campaigns/one-shot/playground/renderer.ts), [personajes sobre planos](../../engine/client/world-billboards.ts).

### 6.3. Los personajes no reciben las luces de la reliquia

Los planos de personaje tienen `disableLighting = true` y usan una textura emisiva teñida por su estado. Esto facilita leerlos, pero no implementa la respuesta a las luces locales del espejo. D8 tampoco activa el modo adicional de sombra proyectada del sistema de personajes; conserva la sombra de contacto.

**Cambio propuesto:** una respuesta estilizada y barata a la luz ambiente y a una o dos luces relevantes, con intensidad mínima de lectura. Comparar primero un tinte direccional suave; normales pintadas son una ampliación posible, no un requisito inicial. Mantener el canal de estados —invisibilidad, daño, reflejo— separado del tinte de iluminación. Verificar sombras, pies y profundidad sobre todos los fotogramas, también al caer.

Fuentes: [WorldBillboards](../../engine/client/world-billboards.ts), [creación del controlador y envío de fotogramas](../../apps/web/world.ts).

### 6.4. El visor y la mesa no usan el mismo acabado completo

La mesa crea D8 con `integrated: true`. Esa rama desactiva el bloom del pipeline y el SSAO adicional del visor independiente; el GlowLayer integrado es selectivo y de menor resolución. Existen sombras, luces, exposición, contraste y efectos de brillo: no debe confundirse este recorte de calidad con ausencia total de iluminación.

**Cambio propuesto:** configurar el acabado del Espejo con perfiles de calidad medidos, sin activar indiscriminadamente todas las opciones para los seis mapas. Probar resplandor moderado y sombras de contacto antes del desenfoque. Revisar máscaras alfa de personajes en las pasadas de profundidad, halos y partículas translúcidas. Evitar desenfocar la interfaz y la cuadrícula útil.

Babylon ofrece bloom, profundidad de campo, curvas/color y otros tratamientos en su pipeline. Que existan no demuestra que su combinación sea adecuada o rápida con nuestros sprites y cámara ortográfica; hay que probarla en esta escena. [Documentación oficial del pipeline](https://doc.babylonjs.com/features/featuresDeepDive/postProcesses/defaultRenderingPipeline).

### 6.5. El interior sigue recibiendo parte del tratamiento exterior

El Espejo se identifica como interior y `weatherCovered` lo considera cubierto. Sin embargo, la actualización común conserva un factor de luz dependiente de la hora y modifica el color de fondo/niebla. Las luces de lectura y el claro del fondo deben revisarse para que la cueva no parezca una nieve exterior azul en pleno día. La configuración desactiva el tone mapping; esto merece una comparación controlada al preparar las nuevas luces, no una activación general sin ajustar intensidades.

La nieve del renderer antiguo se desactiva al recibir el campo de precipitación, y la precipitación común está protegida por cobertura. No debe suponerse que `snowfall: true` en la configuración produzca nieve visible durante la partida.

**Cambio propuesto:** separar clima exterior de ambiente interior. La hora podrá influir en una entrada o grieta con justificación espacial; la reliquia mantiene luz propia. Escarcha suspendida, bruma local y desprendimientos son ambiente de cueva, no una segunda simulación del clima de campaña. No introducir otra acumulación o reloj.

Fuentes: [setViewContext y weatherCovered](../../campaigns/one-shot/playground/renderer.ts), [precipitación compartida](../../engine/client/world-weather.ts).

## 7. Dirección artística propuesta para este mapa

**Una cámara helada antigua y silenciosa, con un lago oscuro de hielo traicionero y una reliquia plateada que parece contener una presencia.** El hielo debe sentirse frío y frágil; la piedra, pesada; la luz, localizada. El lugar debe envolver al grupo sin perder la lectura del battlemap.

El encuadre de exploración parte de 15°, con zoom medio siguiendo al personaje. No se amplía el giro a 360° ni se añaden giros de batalla. Los cinco frentes actuales deben resultar correctos. Combate conserva su cámara táctica elevada y sus decisiones en mesa.

Paleta de trabajo propuesta, todavía por aprobar visualmente:

| Función | Familia de color | Intención |
| --- | --- | --- |
| Primer plano | Azul carbón, alrededor de `#111A2B` | Enmarcar con siluetas; sin negros que escondan acciones. |
| Roca próxima | Azul pizarra, alrededor de `#253B52` | Dar masa, estratos y contraste con la nieve. |
| Hielo | Azul gris, alrededor de `#6B8393` | Separar su material del resplandor mágico. |
| Nieve | Gris marfil frío, alrededor de `#C8D1D4` | Reservar las luces más claras para relieves y escarcha. |
| Magia | Cian controlado, alrededor de `#3F8599`, con puntas claras | Dirigir la mirada al espejo sin pintar toda la cueva del mismo color. |
| Plata | Neutros claros y oscuros, reflejos fríos limitados | Hacer visible el marco y diferenciar metal de hielo. |

Estos valores son orientativos de arte, no parámetros finales de luz HDR. No se deben traducir mecánicamente a intensidades del renderer.

## 8. Espacio, profundidad y decoración

El mapa se construirá en seis grupos con propósito propio:

1. **Primer plano:** pocos salientes o columnas de hielo en los extremos inferiores/laterales. Silueta más oscura, detalle contenido, recorte selectivo.
2. **Transición próxima:** bancos de nieve, pie de pared, fragmentos y escarcha que unan suelo y masas grandes. Evitar objetos flotando o apoyados sobre discos de nieve repetidos.
3. **Zona jugable:** suelo, lago, peligros y reliquia exactamente alineados con la navegación vigente. El detalle no debe confundirse con casillas o grietas peligrosas.
4. **Paredes intermedias:** masas estratificadas y grupos de cristales con ritmo, huecos, asimetría y superficies de tamaños diferentes. Siluetas diseñadas, no una corona uniforme de conos.
5. **Profundidad de caverna:** dos o tres galerías o estratos aparentes con escala y contraste decrecientes. Pueden resolverse con geometría ligera y superficies pintadas; no exigen construir un mundo inaccesible completo.
6. **Atmósfera:** bruma baja en puntos elegidos, polvo de hielo y una separación progresiva del fondo. Nada de una lámina uniforme que blanquee el mapa entero.

La entrada, la orilla y la zona del espejo deben tener composiciones diferenciadas y conectadas. El exterior del rectángulo táctico necesita continuidad visual, pero no casillas o rutas nuevas. Cualquier decoración situada sobre un paso legal debe conservar el espacio corporal y la lectura del camino. No añadir desniveles transitables o apoyos nuevos como consecuencia accidental de la decoración.

El encuadre medio debe mantener visibles la silueta del jugador y varias casillas útiles. Se revisará por tamaño de pantalla y con las preferencias de zoom existentes; no se agrandarán personajes en metros para compensar una cámara demasiado lejana.

## 9. Materiales, hielo, agua y la reliquia

**Roca:** volumen principal irregular, estratos medianos y detalle pintado pequeño. Mantener valores oscuros legibles; evitar la triangulación de color como protagonista. Compartir materiales y variaciones con semilla estable para evitar repetición sin perder rendimiento.

**Nieve:** acumulaciones con forma junto a paredes, cornisas y recovecos; transición hacia hielo y piedra. No limitarse a un ruido fino aplicado a toda la superficie. El clima de campaña conserva la autoridad sobre la acumulación adicional.

**Hielo peligroso:** grosor aparente, fracturas, bordes dañados y textura propia. Su silueta visible debe seguir el contorno lógico existente. El embellecimiento no puede convertir una casilla letal en un apoyo que parezca seguro. Probar sin color y con poco contraste de proyector.

**Lago:** profundidad aparente y ondas moderadas, manteniendo intacta la silueta. Evitar un bloque azul plano y también un reflejo demasiado brillante. La alternativa económica son animación de normales/UV y variación pintada; un reflejo planar o SSR queda condicionado a demostrar que mejora la lectura y cabe en el presupuesto.

**Espejo:** la biblioteca local ya contiene un diseño ornamentado y sus variantes. El modelo actual es un aro/disco con gradiente y motas. Se recomienda desarrollar una pieza 2.5D con base física, marco plateado de silueta más elaborada y superficie independiente para reflejo y magia. El recurso existente sirve como guía y material de partida; su alta resolución ilustrada necesita adaptarse al lenguaje gráfico del conjunto, no solo reducirse automáticamente.

El cristal debe seguir siendo reconocible en reposo: escarcha, oscurecimiento, brillo lateral o imagen insinuada. El centro blanco/cian no debería dominar continuamente como un portal activo. No hace falta reflejar toda la escena en tiempo real: una copia visual del personaje y distorsión local pueden contar mejor la aparición con menor coste, siempre a partir de datos ya visibles.

## 10. Recursos existentes y trabajo de arte pendiente

| Recurso local | Situación auditada | Uso recomendado |
| --- | --- | --- |
| `art/mirror.png` | Battlemap ilustrado antiguo; el escenario actual usa geometría Babylon. | Referencia de formas y material. No colocarlo como captura plana que sustituya al mundo. |
| `tokens/Espejo/espejo_amor_verdadero_base.png` | Diseño ornamentado, con detalle bastante mayor que el marco nativo. Registrado en variantes del pack, pero el objeto está marcado `renderedByScene`. | Adaptar su diseño al nuevo marco. No considerar que ya se ve en la escena por estar en el manifiesto. |
| Activación 01/02 y transformación 01/02/03 | Disponibles en el directorio. La rama integrada de transformación utiliza un pulso, una onda, 28 chispas y un retraso de revelación en lugar de la secuencia completa del prop 2D. | Revisar qué fotogramas aportan a la nueva secuencia, con un único controlador de evento. |
| Copia final y fragmentos de hielo | Recursos locales disponibles. | Evaluar alfa, escala, coherencia y reutilización antes de producir otros. Su existencia no equivale a integración validada. |
| Personaje Reflejo | Existe recurso genérico; la implementación actual debe seguir copiando la identidad del personaje original. | Mantener esa identidad y aplicar acabado helado, sin sustituirlo por una criatura genérica ni alterar sus estadísticas. |
| Partículas y niebla | El catálogo local documenta recursos de Kenney y otros paquetes con procedencia registrada. | Reutilizar los adecuados después de revisar su aspecto y su entrada concreta de créditos; esta auditoría no ha descargado ni recertificado bibliotecas. |

Arte nuevo probable: módulo de pared estratificada, cristales asimétricos, variantes de pie de roca/nieve, superficies de hielo/nevada coherentes y un marco de espejo adaptado. La cantidad exacta debe salir de la maqueta de composición. No hace falta llenar el mapa de props para elevar su calidad.

Los recursos de Octopath permanecen como referencias de análisis; no forman parte de la biblioteca del juego.

## 11. Personajes, animación y VFX

Conservar los anclajes de pies, las alturas reales, las animaciones disponibles y la profundidad compartida con el escenario. La mejora necesita consistencia en silueta, escala aparente, contorno y grado de detalle de todos los miembros del grupo, no únicamente un protagonista preparado para una captura.

El movimiento ambiental debería surgir del material: bruma que deriva cerca del suelo, partículas arrastradas por corrientes y destellos escasos sobre hielo. Los nueve cristales tienen actualmente pequeñas oscilaciones y giro; no debe asumirse que todo cristal natural necesita flotar o rotar. Reservar el movimiento claramente mágico para la reliquia y sus satélites justificados.

Secuencia propuesta, sujeta a los eventos autoritativos existentes:

| Estado | Presentación |
| --- | --- |
| Reposo | Cristal visible, luz baja, ambiente frío y pequeñas variaciones. La reliquia conserva su masa y material. |
| Activación | Cambio breve de reflejo, luz y sonido sincronizados; anticipación suficiente para leer lo que ocurre. |
| Aparición | La silueta del personaje emerge del cristal o de su escarcha y conecta espacialmente con la posición real del Reflejo. |
| Combate | Plano táctico actual, golpes/hechizos con luz breve y reacciones legibles. Reducir el decorado animado que compita con las acciones. |
| Resolución | Retirada coherente de magia, espejo y copia según el resultado ya decidido. Evitar luces o partículas residuales tras un cambio de escena. |

La anticipación de una aparición no puede revelar una criatura antes de que el servidor la haga pública. Distorsión, destello, sonido y aparición deben usar el mismo identificador/tiempo de evento para no duplicarse al reconectar. Restaurar una partida no debe volver a reproducir una secuencia ya concluida.

## 12. Enfoque, niebla y tratamiento final de imagen

El acabado próximo a las referencias puede incluir profundidad de campo suave, resplandor selectivo y una corrección de color común. Son la última capa, después de composición, formas y luz.

Con nuestra cámara de 15°, enfocar una sola distancia óptica puede desenfocar casillas legales del fondo del tablero. Además, los sprites recortados y el agua translúcida necesitan profundidad correcta; de lo contrario aparecen halos o rectángulos. Primero se debe probar enfoque de decorado cercano y lejano, manteniendo nítida toda la franja táctica. La máscara o separación de capas tiene que incluir cuadrícula, selección, peligros y personajes, no solo el HUD.

En el perfil económico pueden pintarse fondos de menor detalle y usarse bruma localizada sin desenfoque dinámico. No hace falta una niebla volumétrica costosa para sugerir capas. Si se añade un haz de luz, debe responder a una abertura o fuente concreta y respetar el volumen de las paredes.

Evitar como soluciones generales: viñeta fuerte, aberración cromática, grano de pantalla abundante, enfoque que respire al moverse, bloom blanco sobre nieve y un filtro cian único. No son requisitos para conseguir la lectura de las referencias y perjudican al tablero si se aplican indiscriminadamente.

## 13. Audio y presentación en las tres interfaces

Ya existen música del Espejo, viento gélido, pasos sobre hielo y sonidos de grieta, revelación y magia. El director revisado sincroniza capas y efectos, pero no se ha encontrado ahí un sistema de emisores posicionales o reverberación específico de esta cueva. Esto no permite juzgar cómo suenan sus archivos: la escucha sigue pendiente.

Mezcla propuesta: aire grave discreto, corrientes puntuales, pequeños crujidos de hielo, magia localizada y música que deje espacio a las voces de la mesa. Silencio y reducción de ambiente antes de una aparición pueden aportar más que subir todas las capas. Reverberación ligera solo donde aporte y sin duplicar música/SFX; la mezcla debe salir del dispositivo elegido para audio, con los móviles respetando ese reparto.

En DM se conservan controles y diagnóstico. En jugador, joystick, interacción e iniciativa no deben tapar la reliquia o el peligro inmediato; comprobar portrait y landscape. El proyector debe mostrar el mismo estado y encuadre compartido cuando corresponda. La dirección de luz y el arte deben ser comunes en las tres vistas aunque el dispositivo reduzca efectos.

No se plantea rediseñar toda la consola del DM ni reproducir la interfaz de Octopath dentro de este trabajo. Sí se exige que el mapa acabado siga siendo cómodo de jugar con nuestras interfaces.

## 14. Riesgos funcionales y discrepancias encontradas

**Hielo e instrucciones contradictorias.** El manual DM local describe témpanos sólidos excluidos del peligro. El código actual, en cambio, añade las seis placas como zonas peligrosas y sus pruebas verifican exactamente sus polígonos. También conserva el contorno peligroso del lago. La base extraída registra 49 casillas afectadas. Hay que corregir la documentación contra la decisión canónica de la mesa antes de dar instrucciones de juego o redibujar supuestos apoyos seguros. Esta auditoría no cambia la regla existente.

**Entrada descrita y entrada efectiva.** La zona denominada «acceso a la cueva» está en X ≈ −12,5, mientras el grupo aparece en X ≈ +11,25. No se certifica como fallo de movimiento: puede ser configuración histórica. Para la composición se usa el spawn real y se revisa esa etiqueta; no se mueve la entrada jugable por interpretación artística.

**Pivote del espejo.** Modelo, zona de interacción y objeto de una casilla proceden de distintas representaciones. Cualquier sustitución del marco debe mantener sus coordenadas y alcance; verificar clicks y animación de aparición desde el objeto real.

**Paredes escénicas sobre casillas legales.** La base actual marca todo el rectángulo como transitable. No basta con esculpir un borde bonito: hay que comprobar que no atraviese rutas, oclusión de acciones o apoyo de los personajes.

**Dependencias compartidas.** Personajes, clima, cámara y gran parte del renderer sirven a otros mapas. Cambiar su comportamiento global para mejorar el Espejo podría alterar Café, Jardín o Stormwreck. Las ampliaciones deben ser opcionales por escena y tener pruebas de no regresión.

## 15. Arquitectura recomendada para la implementación posterior

El renderer de D8 acumula pases visuales de versiones anteriores y una capa extensa bajo `@ts-nocheck`. Añadir otra corrección global al final dificultaría saber qué material, luz o recorte prevalece.

La opción recomendada es un controlador visual del Espejo, instalado únicamente al cargar `mirror`, con responsabilidades separadas para escenografía, materiales, luz, atmósfera y secuencias. Debe utilizar los sistemas comunes existentes: datos públicos saneados, cámara, reloj, clima, eventos, recursos y limpieza. No crea otra partida, movimiento o simulación meteorológica.

Contrato de presentación propuesto: recibir cámara/foco, hora/luz, clima, props públicos y fase de efectos; disponer de `update` y `dispose`; liberar mallas, texturas, temporizadores y callbacks al salir. Instancias/atlas y materiales compartidos para repetición. Las partes que deben atenuarse o animarse no se fusionan en un único bloque estático.

El perfil de calidad pertenece al dispositivo y a las preferencias existentes; no cambia la partida ni necesita que el DM gestione nuevos mandos constantemente. Preparar, medir y revisar en una mesa aislada antes de instalar en la distribución normal.

## 16. Rendimiento y perfiles propuestos

Los siguientes son objetivos iniciales de aceptación, **no resultados medidos**:

| Perfil | Prioridad artística | Efectos propuestos |
| --- | --- | --- |
| Ligero / móvil | Misma composición, siluetas, materiales y luz principal. | Contacto pintado, bruma escasa y motas instanciadas; sin SSAO ni profundidad de campo dinámica por defecto. |
| Equilibrado | Acabado principal de juego. | Resplandor selectivo, sombras acotadas, más capas atmosféricas y enfoque solo si la medición lo permite. |
| Alto / PC y proyector | Mayor separación de planos y acabado de magia. | Sombras/contacto adicionales y enfoque de decorado a resolución reducida, con máscaras comprobadas. |

Objetivo a medir: 60 FPS de juego en el MSI a 1080p cuando el equipo lo permita y 30 FPS estables en Pixel 9a; no se promete ese resultado por extrapolar la medición de 4,5 ms. Registrar resolución, GPU, calidad, mediana/p95, llamadas de dibujo, memoria estimada, carga fría/caliente y condiciones de la sesión.

Como guardarraíl de la primera candidata, intentar mantener menos de 350 llamadas de dibujo y menos de 80 MiB de texturas estimadas en la escena de revisión; cualquier incremento se justifica con mejora visible y medición. Estos números son presupuesto de trabajo, no límites universales ni sustitutos de la prueba física.

Revisar transparencia y relleno de pantalla antes de añadir más geometría: varias capas grandes de bruma y bloom pueden costar más que numerosos props estáticos. Mantener limitado el número de luces dinámicas con sombras y las que afectan a cada material.

## 17. Orden de ejecución, con el mapa funcional en cada entrega

| Entrega | Trabajo | Criterio de salida |
| --- | --- | --- |
| E0 · base reproducible | Congelar imágenes/datos, resolver texto del hielo y seleccionar puntos seguros. | Comparativas repetibles y contrato de partida claro. |
| E1 · composición y envolvente | Primer plano selectivo, pared/galerías, unión de bordes y encuadre medio. | La escena ya se lee como cueva desde entrada, orilla y reliquia a 15°. Sigue siendo jugable sin efectos nuevos. |
| E2 · arte y materiales | Siluetas, escarcha, roca, hielo y marco del espejo adaptado. | Calidad y densidad coherentes de cerca y a distancia de juego; peligros reconocibles. |
| E3 · luz y personajes | Luz principal, secundarios, contacto y respuesta estilizada de sprites. | Personajes y entorno pertenecen al mismo espacio en los cuatro estados horarios. |
| E4 · atmósfera y acabado | Bruma, partículas, resplandor y enfoque condicionado a calidad. | Profundidad visible sin perder casillas, selección o rendimiento. |
| E5 · secuencias y sonido | Activación, aparición, resolución y mezcla. | Un único evento coherente en las tres vistas; sin repeticiones al reconectar o restaurar. |
| E6 · aceptación completa | Red, guardado, cambios de escena, regresiones y dispositivos reales. | Candidata ejecutable del Espejo, comparación visual aprobada y límites documentados. |

No avanzar a otros mapas por el mero hecho de completar E4. El Espejo será la referencia artística cuando se apruebe E6. Este orden no exige que cada entrega sea una publicación global ni un cambio de versión de datos de campaña.

Para iniciar la implementación en otro chat del mismo proyecto: [encargo de ejecución completo](../../docs/design/D8_MIRROR_EXECUTION_PROMPT.md). Incluye el orden de lectura, las siete fases, la protección de la partida y el tratamiento de los encargos históricos que no pertenecen al Espejo.

## 18. Lista de aceptación de la candidata

### Imagen y cámara

- Cinco puntos seguros: llegada, dos orillas con composición diferente, aproximación al espejo y posición válida del encuentro. Recorrido de servidor, no desplazamiento artificial a una casilla letal.
- Matriz base: 5 puntos × 5 giros × 3 inclinaciones = **75 encuadres**; registrar también zoom y resolución. La prioridad artística es 15° con zoom medio.
- Capturas adicionales de día, atardecer, noche y madrugada con posiciones, hora y preferencias repetibles.
- Prueba de Pixel 9a 390 × 844 y 844 × 390; PC/proyector 1920 × 1080; referencia técnica 1280 × 720.
- Se reconocen primer plano, zona útil y profundidad de cueva; no aparece un suelo infinito azul o una cúpula cortando a los actores.
- La atenuación conserva el encuadre y protege jugador, objetivo, interacción y peligro; no parpadea al dar un paso.
- Distinción de nieve/hielo peligroso con poco color, proyector lavado y brillo reducido; cuadrícula y preferencias siguen funcionando.

### Juego y sincronización

- Mismas casillas, 1,5 m, navegación, 205 casillas difíciles y conjunto vigente de peligros salvo corrección funcional expresamente acordada.
- Misma reliquia, posición, interacción, original del Reflejo, estados, recursos y resolución por mesa.
- Movimiento, selección y aparición correctos en DM, jugador y proyector; controles móviles no invaden puntos esenciales.
- Reconexión y restauración no duplican efectos ni revelan información oculta; transición a otro mapa limpia los efectos y al volver restaura el estado correcto.
- Guardado/carga conserva datos de partida. Preferencias visuales y calidad siguen siendo locales.

### Movimiento, audio y rendimiento

- Revisar vídeo de exploración, giro, aparición, ataque, caída y resolución; una foto no demuestra animación buena.
- Escucha real con voces en la mesa y salida del proyector. Verificar desbloqueo de audio, mezcla, silencios y ausencia de duplicados en móviles.
- Sesión sostenida de al menos 20 minutos, navegación entre escenas repetida y observación de memoria/texturas; medir carga fría y caliente.
- Repetir las pruebas de esta base y las de cualquier sistema compartido modificado. Aprobación técnica y aprobación artística se registran por separado.

## 19. Evidencias y fuentes

Capturas de nuestro mapa: [tres puntos a 15°](../../output/d8-polish-20261016/d8-mirror.png), [detalle](../../output/d8-polish-20261016/d8-mirror-polish-after-near.png), [hoja de ángulos medios](../../output/d8-polish-20261016/d8-mirror-polish-after-mid-angles.png), [día](../../output/d8-polish-20261016/d8-mirror-polish-after-day.png), [atardecer](../../output/d8-polish-20261016/d8-mirror-polish-after-sunset.png), [noche](../../output/d8-polish-20261016/d8-mirror-polish-after-night.png), [combate](../../output/d8-polish-20261016/d8-mirror-polish-after-combat.png), [informe de medición previo](../../output/d8-polish-20261016/d8-mirror-polish-after.json).

Fuentes del proyecto: [configuración D8](../../campaigns/one-shot/playground/d8night.config.ts), [renderer D8](../../campaigns/one-shot/playground/renderer.ts), [pack y coordenadas reales](../../campaigns/one-shot/public/pack.ts), [integración WorldRenderer](../../apps/web/world.ts), [personajes nativos](../../engine/client/world-billboards.ts), [precipitación](../../engine/client/world-weather.ts), [audio](../../apps/web/audio.ts), [manual DM con discrepancia de hielo](../../campaigns/one-shot/private/DM_RUNBOOK.md), [créditos locales](../../campaigns/one-shot/public/D8_NIGHT_ASSET_CREDITS.md).

Referencias externas primarias: [Acquire / Unreal, Octopath II](https://www.unrealengine.com/developer-interviews/octopath-traveler-ii-builds-a-bigger-bolder-world-in-its-stunning-hd-2d-style?lang=en-US), [Acquire / Unreal, Octopath original](https://www.unrealengine.com/spotlights/octopath-traveler-s-hd-2d-art-style-and-story-make-for-a-jrpg-dream-come-true), [Babylon, pipeline de renderizado](https://doc.babylonjs.com/features/featuresDeepDive/postProcesses/defaultRenderingPipeline).

Las propuestas anteriores describen el trabajo pendiente. Esta auditoría deja el mapa actual intacto y no certifica todavía el acabado Octopath, el audio físico o el rendimiento final de la candidata futura.
