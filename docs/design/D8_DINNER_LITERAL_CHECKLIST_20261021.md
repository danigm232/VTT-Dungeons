# Cena con Anteros: 60 instrucciones literales para mejorar el mapa existente

Revisión: 2026-10-21. Solo presentación de dinner. Conservar identidad, distribución física, reglas y comportamiento.

Capturas 18/10 y 20/10/2026; inspección de código y 41 pruebas del 20/10. No se acredita una candidata mejorada ni pruebas nuevas.

## Contrato: mejorar la Cena conservándola

- Mantener el mapa dinner como la misma finca y patio de la Cena. No sustituirlo por otro escenario ni reconstruir la distribución a partir de la imagen de referencia.
- Mantener posición, huella y uso de casa, mesa circular, sillas, puerta, pozo, puesto, caminos, vegetación principal y accesos. Se pueden mejorar revestimientos y siluetas dentro de sus envolventes; no desplazar objetos jugables.
- Conservar grid, origen, alturas de apoyo, navegación, colisiones, aparición de personajes, línea de efecto y transiciones. Base del 20/10: 19×18, 1,5 m, 318 transitables y 4 difíciles; revalidar cambios previos legítimos sin restaurar versiones antiguas.
- Conservar Anteros, personajes, identidades, poses y animaciones. No reemplazar atlas nuevos de otros chats para uniformar el estilo sin una necesidad concreta documentada.
- Conservar interacción de brindis, inventario, finales y autoridad del servidor; dados y decisiones del DM siguen en mesa.
- Conservar cámara ortográfica, preferencias y orientación estable de WASD/joystick. La base auditada usa inclinación continua 5°–25° y giro limitado ±30°; comparar a 15° y zoom medio.
- Reutilizar motor, Sylvania, reloj, clima, audio y recorte existentes. Incorporar únicamente detalles decorativos coherentes, sin colisión ni función nueva, cuando ayuden a mejorar el mismo lugar.
- No tocar otros mapas, guardados reales o despliegue para fabricar capturas. No usar esta revisión como encargo de limpieza de carpetas, publicación o rediseño general de interfaz.

## Cómo ejecutar esta lista

No todos los puntos son fallos confirmados. Visual y código remiten a la base fechada; verificar exige comprobar antes de corregir; condicionado permite omitir un efecto con justificación. Estado inicial: pendiente de revalidación/implementación. El chat implementador registra por Cxx pendiente, ya resuelto, implementado con evidencia, no reproducible o no aplicable con motivo. No declara pruebas físicas realizadas si no lo están.

## A · Conservación y base

### C01. Fijar qué mapa se está mejorando

**Fase:** E0. **Prioridad:** P0. **Tipo:** Falta comprobarlo; no se declara un fallo existente.

**Qué falta o debe comprobarse:** Falta una comparación de la versión que vaya a editarse que impida confundir mejora visual con una redistribución del mapa.

**Mejora literal:** Guardar una vista general y un inventario de posiciones/huellas del mapa actual. Usarlos como referencia fija durante el pase de arte.

**Conservar:** La finca, casa, patio circular, mesa, puerta, pozo, puesto, caminos y accesos existentes.

**Se acepta cuando:** Antes y después muestran los mismos elementos principales en el mismo sitio y con la misma función. Cualquier diferencia previa de otros chats queda identificada.

**Evidencia de partida:** baseline.json y captura actual-20261020.png

### C02. Congelar la base física y narrativa

**Fase:** E0. **Prioridad:** P0. **Tipo:** Falta comprobarlo; no se declara un fallo existente.

**Qué falta o debe comprobarse:** Falta acreditar que el pase visual conserva casillas, obstáculos, apoyos, aparición y decisiones.

**Mejora literal:** Registrar navegación, grid, alturas de apoyo, puerta, asiento, spawns, interacción y transición Espejo→Cena antes de editar. Comparar esos contratos al cerrar cada fase.

**Conservar:** Posiciones de juego, colisiones, línea de efecto, inventario, reglas, brindis y finales del servidor.

**Se acepta cuando:** No aparecen casillas bloqueadas, escalones, teletransportes, decisiones automáticas o cambios de alcance nuevos por el decorado.

**Evidencia de partida:** baseline.json; paquete público y servidor del repositorio

### C03. Revalidar los hallazgos contra el código actual

**Fase:** E0. **Prioridad:** P0. **Tipo:** Falta comprobarlo; no se declara un fallo existente.

**Qué falta o debe comprobarse:** Las capturas son una base fechada; no demuestran que una mejora de otro chat siga pendiente hoy.

**Mejora literal:** Reproducir cinco puntos del mapa con cámara, hora, clima y estado registrados. Clasificar cada Cxx como pendiente, ya resuelto, no reproducible o no aplicable, adjuntando evidencia.

**Conservar:** Trabajo reciente y mejoras que ya funcionen; no duplicarlas ni revertirlas para ajustarse a fotos antiguas.

**Se acepta cuando:** Cada punto tiene un estado justificado. No se implementa de nuevo un sistema existente ni se declara un fallo sin observarlo.

**Evidencia de partida:** Capturas del 18/10 y 20/10; hashes de baseline.json

## B · Profundidad y cámara

### C04. Dar escala de juego útil a la Cena

**Fase:** E1. **Prioridad:** P0. **Tipo:** Observado en capturas fechadas; revalidar contra la base actual.

**Qué falta o debe comprobarse:** La mesa y Anteros quedan pequeños frente a una gran extensión de pavimento.

**Mejora literal:** Calibrar el encuadre y zoom inicial de referencia para mostrar mesa, personajes y acceso con tamaño legible; mantener disponible la vista general y las preferencias del usuario.

**Conservar:** Tamaño real y posición de mesa, actores y edificios; el ajuste es de presentación de cámara.

**Se acepta cuando:** A 15° y zoom medio se distingue Anteros de su silla y se entiende dónde acercarse. La solución no consiste en agrandar o mover el patio.

**Evidencia de partida:** refs/actual-20261020.png

### C05. Mejorar el primer plano cercano a la cámara

**Fase:** E1. **Prioridad:** P0. **Tipo:** Observado en capturas fechadas; revalidar contra la base actual.

**Qué falta o debe comprobarse:** Los bordes cercanos no forman un marco rico y selectivo; predominan tejados recortados y suelo.

**Mejora literal:** Aprovechar árboles, aleros, faroles o carros ya presentes para que parte de su silueta enmarque una esquina. Si hace falta un ramaje decorativo, añadirlo unido a vegetación existente y sin colisión.

**Conservar:** Accesos, casas y recorrido central; no crear un arco, muro, bosque o estructura nueva alrededor del grupo.

**Se acepta cuando:** Se reconoce un elemento delante del plano de personajes en varios giros, sin cubrir de forma permanente sus cuerpos o la mesa.

**Evidencia de partida:** refs/actual-20261020.png y refs/octopath-primer-plano.png

### C06. Hacer selectiva la oclusión del primer plano

**Fase:** E1. **Prioridad:** P0. **Tipo:** Falta comprobarlo; no se declara un fallo existente.

**Qué falta o debe comprobarse:** Falta demostrar que el detalle cercano puede cruzar la vista sin impedir jugar.

**Mejora literal:** Detectar las piezas decorativas que ocultan personaje, puerta o interacción y recortarlas o atenuarlas suavemente; recuperar su aspecto al despejar la línea de visión.

**Conservar:** Colisiones y bloqueo de línea de efecto reales; transparentar para cámara no abre una pared físicamente.

**Se acepta cuando:** Caminar y girar no hace desaparecer al personaje ni produce parpadeos; el resto del decorado permanece visible.

**Evidencia de partida:** Matriz de cámara actual; requiere secuencia nueva

### C07. Hacer legible el entorno que ya continúa detrás

**Fase:** E1. **Prioridad:** P0. **Tipo:** Observado en capturas fechadas; revalidar contra la base actual.

**Qué falta o debe comprobarse:** La continuidad del pueblo se percibe poco en la vista general y el pavimento domina el fondo.

**Mejora literal:** Revisar el encuadre y las capas existentes de casas, copas y panorama para que se distingan más allá de la finca. Ajustar presentación, contraste y detalle de esas capas antes de añadir objetos.

**Conservar:** Distribución de finca y pueblo existente; no mover la casa principal ni construir una población diferente.

**Se acepta cuando:** Desde llegada y mesa se reconoce un segundo término y una distancia; no se ve un gran tapiz de suelo o un fondo plano sustituyendo el escenario.

**Evidencia de partida:** refs/actual-20261020.png; capas Sylvania existentes

### C08. Separar los cinco planos con una jerarquía visible

**Fase:** E1. **Prioridad:** P0. **Tipo:** Observado en capturas fechadas; revalidar contra la base actual.

**Qué falta o debe comprobarse:** Primer plano, patio, casa y distancia se aproximan demasiado en valor, contraste y detalle.

**Mejora literal:** Asignar primer plano contenido, recorrido legible, mesa/grupo como foco, casa como respaldo y distancia menos contrastada. Ajustar luz inicial y materiales provisionales para comprobarlo.

**Conservar:** Paleta e identidad de la Cena y capacidad de leer casillas; no oscurecer todo el perímetro hasta ocultarlo.

**Se acepta cuando:** Los planos se reconocen sin desenfoque ni partículas y la mirada encuentra el grupo antes que el pavimento lejano.

**Evidencia de partida:** refs/actual-20261020.png

### C09. Mostrar volumen por siluetas y solapamientos

**Fase:** E1. **Prioridad:** P0. **Tipo:** Observado en capturas fechadas; revalidar contra la base actual.

**Qué falta o debe comprobarse:** Muchos elementos parecen piezas aisladas sobre el mismo plano, con pocas relaciones de profundidad.

**Mejora literal:** Mejorar grosor de aleros, huecos, ramas y bordes dentro de sus envolventes; conservar relaciones correctas delante/detrás. Revisar el efecto al caminar y girar con cámara ortográfica.

**Conservar:** Apoyos y distribución física; no inclinar sprites, mover casillas o desplazar capas jugables para fingir paralaje.

**Se acepta cuando:** La perspectiva sigue siendo táctica; la casa y los objetos tienen profundidad reconocible en cinco giros sin depender de una única foto.

**Evidencia de partida:** refs/actual-20261020.png y refs/actual-detalle-20261018.png

### C10. Evitar que el seguimiento enseñe vacío innecesario

**Fase:** E1. **Prioridad:** P0. **Tipo:** Falta comprobarlo; no se declara un fallo existente.

**Qué falta o debe comprobarse:** Falta una comprobación actual de los límites de cámara de Cena en varios puntos y pantallas.

**Mejora literal:** Reutilizar la política de seguimiento/límites adecuada para la finca y comprobar el cuerpo completo del personaje al acercarse a los bordes.

**Conservar:** Giro, zoom elegido, vista general y comportamiento local/compartido actuales; no copiar dimensiones de la cueva.

**Se acepta cuando:** El encuadre se frena de forma suave cuando corresponde y vuelve a seguir; no salta al centro, corta al actor o revela zonas sin acabado.

**Evidencia de partida:** refs/actual-20261020.png; política de límites existente

### C11. Conservar estructura visible al recortar la casa

**Fase:** E1. **Prioridad:** P0. **Tipo:** Observado en capturas fechadas; revalidar contra la base actual.

**Qué falta o debe comprobarse:** En las capturas interiores se ve un rectángulo abierto con pérdida de fachada, cubierta y sensación de edificio.

**Mejora literal:** Recortar solo cubierta y segmentos de pared que estorben. Mantener jambas, marcos, grosor y partes de alero que expliquen la casa.

**Conservar:** Interior existente, puerta y techo exterior reconocibles; no eliminar la pared entera ni añadir nuevas habitaciones.

**Se acepta cuando:** Entrar, salir y girar permite ver al personaje y entender el edificio; desde fuera la casa vuelve a verse completa sin destellos.

**Evidencia de partida:** refs/actual-detalle-20261018.png y refs/actual-noche-20261018.png

## C · Casa existente

### C12. Dar material y relieve a la fachada

**Fase:** E2. **Prioridad:** P0. **Tipo:** Observado en capturas fechadas; revalidar contra la base actual.

**Qué falta o debe comprobarse:** Los muros se leen como superficies lisas y uniformes con poco carácter.

**Mejora literal:** Mejorar piedra/revoco y vigas con variación agrupada, juntas, desgaste y relieve moderado; usar la familia de materiales de Sylvania.

**Conservar:** Huella, altura principal, huecos, estilo de vivienda y posición de la casa; no convertirla en castillo, templo o edificio mayor.

**Se acepta cuando:** Piedra, revoco y madera se distinguen a zoom de juego y no aparecen ruido fino, textura estirada o patrones dominantes.

**Evidencia de partida:** refs/actual-20261020.png y refs/actual-detalle-20261018.png

### C13. Hacer que las ventanas sean huecos creíbles

**Fase:** E2. **Prioridad:** P1. **Tipo:** Observado en capturas fechadas; revalidar contra la base actual.

**Qué falta o debe comprobarse:** Las ventanas se perciben como rectángulos poco profundos sobre la fachada.

**Mejora literal:** Dar espesor a marcos y alféizares y una zona interior legible. Ajustar la superficie luminosa para que quede dentro del hueco y su luz afecte al entorno próximo.

**Conservar:** Número, ubicación y función actual de las ventanas; no abrir pasadizos o ventanas nuevas.

**Se acepta cuando:** En giro oblicuo se ve profundidad y la ventana encendida no parece una pegatina brillante o una pantalla opaca sobre el muro.

**Evidencia de partida:** refs/actual-20261020.png

### C14. Mejorar jambas, hoja y umbral de la puerta

**Fase:** E2. **Prioridad:** P1. **Tipo:** Falta comprobarlo; no se declara un fallo existente.

**Qué falta o debe comprobarse:** Falta acreditar volumen y continuidad visual del acceso abierto y cerrado desde los giros actuales.

**Mejora literal:** Mejorar espesor, marco, herrajes y umbral dentro de su envolvente. Comprobar orientación, bisagra y material por ambos lados.

**Conservar:** ID, casilla, apertura, cierre, bloqueo y paso legal existentes; no desplazar la puerta ni cambiar su anchura útil.

**Se acepta cuando:** Abierta se entiende por dónde pasar; cerrada se alinea con la pared y bloquea igual que antes, sin huecos gráficos engañosos.

**Evidencia de partida:** Puerta dinner-entry-door y capturas nuevas de ambos lados

### C15. Dar grosor al tejado y sus encuentros

**Fase:** E2. **Prioridad:** P0. **Tipo:** Observado en capturas fechadas; revalidar contra la base actual.

**Qué falta o debe comprobarse:** La cubierta se lee como dos planos triangulados simples, con poco alero o remate visible.

**Mejora literal:** Mejorar borde de alero, cumbrera y unión con el muro mediante piezas pequeñas o relieve donde afecte a la silueta.

**Conservar:** Forma general, altura y volumen de la cubierta y sistema de recorte; no elevar la casa o añadir pisos.

**Se acepta cuando:** Frente y laterales muestran una cubierta con espesor sin aumentar de forma apreciable su masa o tapar a los personajes.

**Evidencia de partida:** refs/actual-20261020.png

### C16. Romper la uniformidad de las tejas

**Fase:** E2. **Prioridad:** P1. **Tipo:** Observado en capturas fechadas; revalidar contra la base actual.

**Qué falta o debe comprobarse:** El tejado tiene un patrón de color/material demasiado homogéneo para la riqueza buscada.

**Mejora literal:** Agrupar tonos de teja, desgaste y humedad coherentes; ajustar escala y relieve de textura, reservando geometría a los bordes necesarios.

**Conservar:** Cubierta existente y paleta cálida; no modelar cada teja ni sustituirla por una cubierta de otro tipo.

**Se acepta cuando:** La variación se percibe de cerca sin parpadear al alejar y el material no se vuelve ruido fotográfico.

**Evidencia de partida:** refs/actual-20261020.png

### C17. Unificar interior, laterales y parte trasera

**Fase:** E2. **Prioridad:** P1. **Tipo:** Falta comprobarlo; no se declara un fallo existente.

**Qué falta o debe comprobarse:** Falta demostrar el mismo grado de acabado fuera del frente principal; el interior observado es muy esquemático.

**Mejora literal:** Mejorar los muebles y revestimientos ya presentes con la misma escala de detalle. Revisar caras laterales y traseras que permita ver la cámara.

**Conservar:** Habitaciones, muebles funcionales, hogar y accesos existentes; no reformar la distribución interior.

**Se acepta cuando:** Ningún giro o recorte descubre una cara lisa provisional o un material de familia distinta; la casa sigue siendo la misma.

**Evidencia de partida:** refs/actual-detalle-20261018.png; requiere matriz actual

## D · Suelo y apoyos

### C18. Reducir la repetición del adoquín

**Fase:** E2. **Prioridad:** P0. **Tipo:** Observado en capturas fechadas; revalidar contra la base actual.

**Qué falta o debe comprobarse:** Un mismo patrón de pavimento cubre mucha pantalla y hace evidente la repetición.

**Mejora literal:** Reutilizar el material con variantes compatibles y manchas amplias de desgaste, juntas o musgo en lugares justificados; mantener escala uniforme de piedra.

**Conservar:** Superficie continua, casillas, cotas y paleta del patio; no sustituir todo por hierba, arena o una imagen completa.

**Se acepta cuando:** En vista general no se reconoce una baldosa repetida dominante y la cuadrícula sigue distinguible al activarla.

**Evidencia de partida:** refs/actual-20261020.png

### C19. Suavizar el camino de manchas oscuras idénticas

**Fase:** E2. **Prioridad:** P0. **Tipo:** Observado en capturas fechadas; revalidar contra la base actual.

**Qué falta o debe comprobarse:** El acceso a la mesa se lee como una hilera regular de manchas negras independientes.

**Mejora literal:** Mejorar esas marcas como adoquín gastado o transición de camino, con juntas y variación agrupada; conservar su trazado como guía de llegada.

**Conservar:** Ruta y entrada al patio; no desplazar el camino ni bloquear o acortar su recorrido.

**Se acepta cuando:** El camino parece parte del mismo terreno y conduce al patio sin aspecto de estampado de puntos o piedras flotantes.

**Evidencia de partida:** refs/actual-20261020.png

### C20. Mejorar el borde y material del patio circular

**Fase:** E2. **Prioridad:** P1. **Tipo:** Observado en capturas fechadas; revalidar contra la base actual.

**Qué falta o debe comprobarse:** El patio aparece como un disco claro uniforme, especialmente brillante durante el día.

**Mejora literal:** Añadir juntas, desgaste y lectura radial/borde mediante material y relieve visual compatible con sus apoyos actuales. Ajustar reflectancia para que no se blanquee.

**Conservar:** Centro, diámetro de 6,8 m de la base, forma circular y alturas de apoyo existentes; no convertir el borde en un muro.

**Se acepta cuando:** El patio se integra con el camino y sostiene visualmente la cena sin parecer una plataforma blanca flotante ni crear un escalón nuevo.

**Evidencia de partida:** refs/actual-detalle-20261018.png y refs/actual-dia-20261018.png

### C21. Integrar encuentros entre materiales

**Fase:** E2. **Prioridad:** P1. **Tipo:** Observado en capturas fechadas; revalidar contra la base actual.

**Qué falta o debe comprobarse:** Algunos parches de camino, patio y pavimento se distinguen como formas limpias superpuestas.

**Mejora literal:** Suavizar encuentros con juntas, bordes gastados y pequeñas transiciones visuales donde ya cambian los materiales.

**Conservar:** Límites físicos de terreno y alturas; no añadir terreno difícil ni vegetación que invada pasillos.

**Se acepta cuando:** No se ven rectángulos de material sin transición, superposiciones que parpadean o cortes que parezcan barreras inexistentes.

**Evidencia de partida:** refs/actual-detalle-20261018.png

### C22. Verificar apoyo de objetos y personajes

**Fase:** E3. **Prioridad:** P0. **Tipo:** Falta comprobarlo; no se declara un fallo existente.

**Qué falta o debe comprobarse:** Falta una comprobación actual de contacto y altura de pies y muebles después de mejorar superficies.

**Mejora literal:** Revisar apoyo y sombra de cada familia de objeto sobre el suelo existente, incluida la transición al interior y el patio circular.

**Conservar:** Alturas físicas y cálculo de apoyo; no subir el suelo para ocultar un error del sprite.

**Se acepta cuando:** Patas, base del pozo y pies no flotan, se hunden ni cambian de altura al girar; caminar mantiene el comportamiento anterior.

**Evidencia de partida:** Capturas actuales junto a mesa, puerta, pozo y escalones

## E · Vegetación existente

### C23. Mejorar las copas redondeadas de los árboles

**Fase:** E2. **Prioridad:** P1. **Tipo:** Observado en capturas fechadas; revalidar contra la base actual.

**Qué falta o debe comprobarse:** Los árboles se reconocen por copas hechas de pocas masas redondeadas, con poco detalle de hojas o ramas.

**Mejora literal:** Refinar la silueta de las copas y la lectura del follaje con racimos y huecos; dar detalle al tronco sin llenar el mapa de piezas pequeñas.

**Conservar:** Ubicación, altura y volumen general de los árboles; no convertir la finca en bosque ni alterar pasos.

**Se acepta cuando:** Se leen como árboles de la misma escena en lugar de bolas verdes, con buen contraste y sin contornos transparentes sucios.

**Evidencia de partida:** refs/actual-20261020.png

### C24. Dar continuidad orgánica a los setos

**Fase:** E2. **Prioridad:** P1. **Tipo:** Observado en capturas fechadas; revalidar contra la base actual.

**Qué falta o debe comprobarse:** Los setos muestran una sucesión muy regular de bultos del mismo tamaño.

**Mejora literal:** Variar racimos, pequeños huecos, tono y silueta dentro de la franja ya ocupada; integrar su base con el suelo y contenedor existentes.

**Conservar:** Trazado, límites y condición física de cada seto; no añadir vallado que cierre pasos.

**Se acepta cuando:** La franja se percibe como vegetación continua, sin repetición mecánica evidente ni crecimiento sobre casillas libres.

**Evidencia de partida:** refs/actual-20261020.png

### C25. Mejorar rosas, hojas y jardineras

**Fase:** E2. **Prioridad:** P1. **Tipo:** Observado en capturas fechadas; revalidar contra la base actual.

**Qué falta o debe comprobarse:** Las flores aparecen como globos rojos sobre tallos simples y las jardineras tienen poca riqueza de superficie.

**Mejora literal:** Refinar racimos de pétalos/hojas y los materiales del contenedor, agrupando color y dejando huecos entre plantas.

**Conservar:** Zonas, cantidad narrativa y posición de plantas; no convertirlas en criaturas o interactuables nuevos.

**Se acepta cuando:** A zoom medio se distinguen flor, hoja y soporte con una escala de detalle compatible con casa y personajes.

**Evidencia de partida:** refs/actual-detalle-20261018.png

### C26. Controlar el movimiento de hojas y telas

**Fase:** E4. **Prioridad:** P2. **Tipo:** Falta comprobarlo; no se declara un fallo existente.

**Qué falta o debe comprobarse:** Hay movimiento configurado, pero falta verificar su lectura y coherencia en la Cena actual.

**Mejora literal:** Reutilizar la animación existente y ajustar un balanceo leve en copas/rosas/telas donde corresponda al viento y clima. Reducirlo con movimiento reducido.

**Conservar:** Anclajes, colisiones y silueta útil; no mover árboles completos o telas rígidas como si fueran goma.

**Se acepta cuando:** La escena tiene vida sin vibración continua, costes altos o movimiento de objetos que deberían permanecer fijos.

**Evidencia de partida:** VFX existentes roseSway y secuencia en movimiento nueva

## F · Mesa y cena

### C27. Dar carácter a la mesa circular

**Fase:** E2. **Prioridad:** P1. **Tipo:** Observado en capturas fechadas; revalidar contra la base actual.

**Qué falta o debe comprobarse:** La mesa se lee como un disco de madera con acabado muy simple.

**Mejora literal:** Refinar espesor, borde, soporte, juntas de madera y desgaste; mejorar el material bajo luz cálida.

**Conservar:** Forma circular, centro X=0/Z=3,2, tamaño y función de la mesa de la base; no reemplazarla por un banquete rectangular.

**Se acepta cuando:** Se distinguen tablero y soporte a zoom medio, mantiene la misma ocupación y no tapa las caras de personajes sentados.

**Evidencia de partida:** refs/actual-detalle-20261018.png

### C28. Corregir la lectura de las sillas

**Fase:** E2. **Prioridad:** P0. **Tipo:** Observado en capturas fechadas; revalidar contra la base actual.

**Qué falta o debe comprobarse:** Las sillas laterales parecen perfiles en L y la frontal se lee como un bloque oscuro que tapa al personaje.

**Mejora literal:** Mejorar respaldo, asiento y patas con huecos y grosor coherentes; revisar orden de profundidad y recorte selectivo cuando oculte identidad.

**Conservar:** Cuatro sillas, posiciones, orientación de asiento y asociación con los actores; no moverlas para evitar resolver la oclusión.

**Se acepta cuando:** Se reconoce una silla desde los cinco giros y el personaje sentado sigue siendo identificable; no atraviesa el respaldo ni flota.

**Evidencia de partida:** refs/actual-detalle-20261018.png

### C29. Hacer legibles los objetos de la cena

**Fase:** E2. **Prioridad:** P1. **Tipo:** Observado en capturas fechadas; revalidar contra la base actual.

**Qué falta o debe comprobarse:** Vajilla y objetos del tablero son muy esquemáticos; no transmiten todavía una cena preparada.

**Mejora literal:** Mejorar platos, copas, botella, comida y textil ya previstos en pequeños grupos legibles. Dar espesor y material sin convertir cada cubierto en una malla costosa.

**Conservar:** Espacio de manos/caras y coherencia de los cuatro puestos; no llenar la mesa de objetos que tapen interacción.

**Se acepta cuando:** A zoom medio se reconoce una cena y sus materiales; el detalle no exige una vista de editor ni produce brillos quemados.

**Evidencia de partida:** refs/actual-detalle-20261018.png

### C30. Mostrar objetos narrativos solo cuando existen

**Fase:** E5. **Prioridad:** P1. **Tipo:** Falta comprobarlo; no se declara un fallo existente.

**Qué falta o debe comprobarse:** Falta comprobar qué detalles de rosa, vino, alimento o espejo pueden mostrarse legítimamente en cada partida.

**Mejora literal:** Reutilizar estados existentes para presentar o retirar esos detalles si se integran en la mesa; no inventar un sistema nuevo de obtención o consumo.

**Conservar:** Inventario, progreso y arbitraje del DM; un objeto decorativo no concede recompensa ni completa objetivo.

**Se acepta cuando:** No aparece un objeto obtenido que la partida no tenga y cargar o cambiar el progreso restaura el detalle sin duplicarlo.

**Evidencia de partida:** Inventario/progreso del servidor; no acreditado solo por capturas

## G · Personajes existentes

### C31. Mantener a Anteros sentado y apoyado

**Fase:** E3. **Prioridad:** P0. **Tipo:** Falta comprobarlo; no se declara un fallo existente.

**Qué falta o debe comprobarse:** La pose sentada existe; falta comprobar encaje completo con silla, mesa y animaciones en la base que se edite.

**Mejora literal:** Ajustar anclaje y oclusión visual de cuerpo, brazos, piernas y silla. Revisar reposo y respuesta al brindis.

**Conservar:** ID anteros-dinner, identidad, pose/atlas existentes y asiento X=0/Z=1,4 de la base; no sustituirlo por Anteros de pie.

**Se acepta cuando:** En reposo y al reaccionar no se levanta por error, se hunde, atraviesa muebles o pierde partes del cuerpo al girar.

**Evidencia de partida:** refs/actual-detalle-20261018.png; anteros_dinner_idle y atlas de Cena

### C32. Conservar identidades y coherencia de escala

**Fase:** E3. **Prioridad:** P0. **Tipo:** Falta comprobarlo; no se declara un fallo existente.

**Qué falta o debe comprobarse:** Falta confirmar los atlas que realmente usa la candidata actual; las fotos históricas no certifican ese catálogo.

**Mejora literal:** Comprobar escala aparente, pies, silueta, contorno y color de los personajes activos; resolver diferencias con ajustes de integración antes de redibujar o sustituir.

**Conservar:** Trinity, Silverfarben y sus atlas/identidades, orientaciones y acciones; originales y trabajo de otros chats.

**Se acepta cuando:** Los personajes se reconocen y mantienen proporción al caminar, sentarse y reaccionar; no cambia su diseño por imponer un estilo nuevo.

**Evidencia de partida:** Sprites activos actuales y trabajos recientes de personajes

### C33. Resolver la profundidad entre actor y mobiliario

**Fase:** E3. **Prioridad:** P0. **Tipo:** Falta comprobarlo; no se declara un fallo existente.

**Qué falta o debe comprobarse:** Falta acreditar orden de profundidad estable delante/detrás de mesa, sillas, puerta y plantas.

**Mejora literal:** Revisar transparencia, escritura de profundidad y apoyos usando la solución de billboards existente; corregir solo capas o anclajes necesarios.

**Conservar:** Posición real y lógica de selección; no dibujar siempre al personaje por encima de todos los objetos.

**Se acepta cuando:** El actor queda oculto solo donde corresponde físicamente, se identifica durante el juego y no aparecen rectángulos negros ni halos de recorte.

**Evidencia de partida:** refs/actual-detalle-20261018.png; validación nueva por giro

## H · Iluminación y sombras

### C34. Dar una dirección legible a la luz natural

**Fase:** E3. **Prioridad:** P0. **Tipo:** Falta comprobarlo; no se declara un fallo existente.

**Qué falta o debe comprobarse:** La luz natural existe; falta acreditar que su dirección modela la Cena sin aplanarla en cada hora.

**Mejora literal:** Calibrar luz principal con la orientación y hora existentes para que fachada, cubierta, patio y personajes tengan caras iluminadas y caras en sombra coherentes.

**Conservar:** Reloj, posición del mundo y decisiones de iluminación del DM; no imponer atardecer fijo al mapa.

**Se acepta cuando:** Se entiende de qué lado llega la luz sin sombras contradictorias o un brillo uniforme sobre todas las caras.

**Evidencia de partida:** Luces y estilo Sylvania; capturas nuevas de tres horas

### C35. Reducir el aspecto gris uniforme del relleno

**Fase:** E3. **Prioridad:** P0. **Tipo:** Observado en capturas fechadas; revalidar contra la base actual.

**Qué falta o debe comprobarse:** La escena tiene un relleno gris relativamente uniforme que reduce volumen y separación de planos.

**Mejora literal:** Ajustar el relleno ambiental/cielo y contraste por estado; conservar detalle en sombras y dejar a las fuentes cálidas modelar el foco.

**Conservar:** Legibilidad táctica y paleta de la finca; no arreglarlo pintando todo de naranja o llevando negros a cero.

**Se acepta cuando:** Madera, piedra y personajes conservan color propio y el patio se separa de la casa y del fondo también en proyector.

**Evidencia de partida:** refs/actual-20261020.png y refs/actual-noche-20261018.png

### C36. Iluminar la mesa y el grupo como foco principal

**Fase:** E3. **Prioridad:** P0. **Tipo:** Observado en capturas fechadas; revalidar contra la base actual.

**Qué falta o debe comprobarse:** Ya hay luz cálida, pero no integra suficientemente caras, silla, vajilla y superficie en un foco común.

**Mejora literal:** Calibrar contribución de vela/fuentes cercanas, alcance y caída para bañar mesa y personajes próximos con calidez contenida y variación lenta si procede.

**Conservar:** Fuentes existentes y geometría; no ocultar el problema añadiendo una gran luz omnidireccional sin origen.

**Se acepta cuando:** Caras, ropa, cerámica y madera participan de la misma luz sin quemarse ni convertir al personaje en una silueta negra.

**Evidencia de partida:** refs/actual-detalle-20261018.png

### C37. Relacionar ventanas y faroles con su luz real

**Fase:** E3. **Prioridad:** P1. **Tipo:** Falta comprobarlo; no se declara un fallo existente.

**Qué falta o debe comprobarse:** Falta acreditar correspondencia entre superficie emisiva, luz cercana y obstáculos en la candidata actual.

**Mejora literal:** Revisar intensidad, color, rango y selección de luces; las superficies próximas reciben luz y los muros cerrados la limitan. Priorizar fuentes que aporten dentro del presupuesto existente.

**Conservar:** Número y ubicación de los faroles principales y ventanas; no añadir focos para compensar materiales malos.

**Se acepta cuando:** Cada mancha de luz tiene una fuente reconocible, no atraviesa la casa y se apaga junto a su emisor.

**Evidencia de partida:** Ventanas/faroles existentes; capturas nuevas encendido/apagado

### C38. Conectar respuesta de luz local en actores de Cena

**Fase:** E3. **Prioridad:** P0. **Tipo:** Comprobado en el código auditado el 20/10; revalidar antes de editar.

**Qué falta o debe comprobarse:** En el código auditado la función de luz local de actores está conectada solo al Espejo; Cena no usa esa integración.

**Mejora literal:** Revalidar la limitación y, si sigue presente, ampliar la capacidad opcional por escena para Cena. Calibrar respuesta estilizada al foco cálido y relleno sin activar indiscriminadamente iluminación en todos los tokens.

**Conservar:** Diseño, transparencia, animación, tonos de identidad y otros mapas; reutilizar el mecanismo que ya funciona.

**Se acepta cuando:** Un personaje cerca de la mesa y otro fuera reciben diferencias suaves coherentes, con caras legibles y sin parecer pegatinas luminosas.

**Evidencia de partida:** apps/web/world.ts y world-billboards.ts auditados el 20/10

### C39. Hacer coherentes las sombras proyectadas

**Fase:** E3. **Prioridad:** P0. **Tipo:** Falta comprobarlo; no se declara un fallo existente.

**Qué falta o debe comprobarse:** La existencia de un generador no acredita sombras correctas de casa, muebles y plantas en todos los estados.

**Mejora literal:** Revisar dirección, suavidad, resolución, sesgos y selección de emisores/receptores. Invalidar la sombra cuando cambie una puerta o fuente que la afecte.

**Conservar:** Geometría y física existentes; no dibujar una sombra horneada que contradiga reloj o puerta.

**Se acepta cuando:** Sombras estables apoyan la forma, no flotan, vibran o atraviesan paredes y no se convierten en el coste dominante de la escena.

**Evidencia de partida:** Sombras existentes; matriz de luz y puerta nueva

### C40. Dar peso con sombras de contacto

**Fase:** E3. **Prioridad:** P0. **Tipo:** Falta comprobarlo; no se declara un fallo existente.

**Qué falta o debe comprobarse:** Falta demostrar uniones creíbles de pies, patas de silla, mesa, pozo y muros con el suelo.

**Mejora literal:** Ajustar las sombras de contacto y oclusión local existentes; usar apoyos discretos o una solución medida antes de añadir SSAO global.

**Conservar:** Luz de escena, altura y huella física; no dibujar halos negros amplios alrededor de todo.

**Se acepta cuando:** Objetos y actores parecen apoyados, con contacto suave que no mancha casillas ni oculta textura.

**Evidencia de partida:** Contact shadows/billboards existentes; capturas nuevas de apoyo

### C41. Mantener material y color sin blancos quemados

**Fase:** E3. **Prioridad:** P1. **Tipo:** Observado en capturas fechadas; revalidar contra la base actual.

**Qué falta o debe comprobarse:** En la captura diurna patio y vajilla pierden matiz al aclararse; el conjunto todavía mezcla respuestas de material poco coherentes.

**Mejora literal:** Calibrar reflectancia, exposición, contraste y emisivos en la mesa integrada, manteniendo familia cálida de luces y sombra contenida.

**Conservar:** Color propio de piedra, madera, textil y personajes; no sustituir detalle por bloom, tinte general o un filtro de pixelado.

**Se acepta cuando:** Las zonas claras conservan textura, las sombras conservan información y ningún material parece plástico por exceso de brillo.

**Evidencia de partida:** refs/actual-dia-20261018.png

### C42. Respetar hora, interior y clima en el acabado

**Fase:** E3. **Prioridad:** P0. **Tipo:** Falta comprobarlo; no se declara un fallo existente.

**Qué falta o debe comprobarse:** Falta validar el nuevo acabado en día, crepúsculo, noche, cambios de hora y entrada/salida de casa.

**Mejora literal:** Usar el reloj y perfiles existentes; revisar luz interior, fuentes artificiales, lluvia/humedad/nieve si están activas y cambios inmediatos al saltar tiempo.

**Conservar:** Automatismos existentes, elección del DM, acumulación y separación de efectos visuales y reglas.

**Se acepta cuando:** Cambiar hora o clima funciona sin reiniciar, no fija una hora secreta y no elimina el detalle ni aplica precipitación bajo techo.

**Evidencia de partida:** Reloj/clima y selección manual actuales

## I · Profundidad atmosférica

### C43. Separar la distancia con aire y contraste

**Fase:** E4. **Prioridad:** P1. **Tipo:** Observado en capturas fechadas; revalidar contra la base actual.

**Qué falta o debe comprobarse:** La distancia observada pierde profundidad porque se percibe como continuación uniforme del mismo pavimento.

**Mejora literal:** Ajustar la bruma y tratamiento de distancia ya presentes para reducir progresivamente contraste/detalle en el fondo y mantener limpio el patio.

**Conservar:** Escenario y paleta; no cubrir toda la imagen con una lámina gris ni borrar edificios existentes.

**Se acepta cuando:** Fondo y plano jugable se distinguen por profundidad; caras, puerta, casillas y mesa no quedan lavadas.

**Evidencia de partida:** refs/actual-20261020.png; capas de bruma Sylvania

### C44. Situar humo solo donde haya una fuente

**Fase:** E4. **Prioridad:** P2. **Tipo:** Recurso opcional o condicionado; no obliga a añadir un efecto.

**Qué falta o debe comprobarse:** No se acredita humo de chimenea integrado en las imágenes base; su necesidad y salida deben comprobarse.

**Mejora literal:** Si hay salida de humo coherente con el hogar existente, reutilizar un efecto tenue anclado a ella, con viento y oclusión. Si no puede justificarse sin cambiar la casa, omitir y documentar.

**Conservar:** Arquitectura, reglas y luz existentes; no añadir una chimenea grande nueva solo para poder producir humo.

**Se acepta cuando:** El humo tiene origen y recorrido creíbles, queda detrás de paredes cuando corresponde y no llena el patio ni atraviesa personajes.

**Evidencia de partida:** Hogar/chimenea de la casa; verificar emisor visible actual

### C45. Distribuir partículas por posición y profundidad

**Fase:** E4. **Prioridad:** P1. **Tipo:** Falta comprobarlo; no se declara un fallo existente.

**Qué falta o debe comprobarse:** Las partículas están configuradas, pero una foto no demuestra tamaños, oclusión y distancias coherentes.

**Mejora literal:** Ajustar insectos/hojas/polvo existentes según fuente y clima. Distinguir algunas partículas cercanas de otras lejanas mediante posición real, tamaño y contraste, no una capa uniforme a pantalla completa.

**Conservar:** Plano táctico, interiores y movimiento reducido; no producir nieve, brasas o hojas donde no corresponda.

**Se acepta cuando:** Una secuencia revela aire entre planos sin tapar caras/selección; edificios ocultan los efectos correctamente y no hay acumulación de sprites transparentes.

**Evidencia de partida:** Fireflies existentes y secuencia nueva de cámara

### C46. Usar luz en el aire únicamente si está justificada

**Fase:** E4. **Prioridad:** P2. **Tipo:** Recurso opcional o condicionado; no obliga a añadir un efecto.

**Qué falta o debe comprobarse:** No se ha observado una necesidad concreta de haces volumétricos; son un recurso condicionado, no un fallo confirmado.

**Mejora literal:** Probar un haz local contenido solo si una abertura/fuente y un medio visible lo justifican. Omitirlo si no aporta o excede el presupuesto; registrar la decisión.

**Conservar:** Luz principal y claridad; no poner rayos divinos permanentes sobre la mesa ni inventar magia narrativa.

**Se acepta cuando:** Si se usa, tiene dirección, origen y límite creíbles y desaparece al apagar la fuente o cambiar condiciones; no es imprescindible para leer profundidad.

**Evidencia de partida:** Ventanas/sol y humo real del estado que se revise

### C47. Mantener desenfoque como recurso opcional

**Fase:** E4. **Prioridad:** P2. **Tipo:** Recurso opcional o condicionado; no obliga a añadir un efecto.

**Qué falta o debe comprobarse:** Falta comprobar si un enfoque selectivo mejora la escena sin afectar el tablero; no se exige activarlo.

**Mejora literal:** Si se prueba, limitarlo a decoración cercana/lejana y medirlo. Conservar desactivación y omitirlo si no puede mantener nítido el plano jugable.

**Conservar:** Pies, personajes, cuadrícula, puerta, objetivos, selección y texto; no esconder materiales incompletos con blur.

**Se acepta cuando:** La profundidad ya funciona con el efecto apagado y jugar con él encendido no pierde precisión o identificación.

**Evidencia de partida:** Mesa integrada y rango actual de cámara ortográfica

### C48. Restringir glow y bloom a fuentes pequeñas

**Fase:** E4. **Prioridad:** P2. **Tipo:** Recurso opcional o condicionado; no obliga a añadir un efecto.

**Qué falta o debe comprobarse:** Falta calibrar qué resplandor aporta al acabado real sin lavar el patio; añadir bloom no es obligatorio.

**Mejora literal:** Revisar selección/intensidad de glow en llamas, faroles y ventanas. Probar bloom reducido solo si suma detalle percibido y cabe en presupuesto.

**Conservar:** Contornos, color y lectura de actores y materiales; no cambiar el render global de otras escenas.

**Se acepta cuando:** Las fuentes se perciben vivas pero no hay halo general, personaje luminiscente o blanco sin detalle.

**Evidencia de partida:** Glow selectivo existente y diferencia integrated/Playground

## J · Desenlaces, audio e interacción

### C49. Dar presentación coherente a los tres finales

**Fase:** E5. **Prioridad:** P1. **Tipo:** Comprobado en el código auditado el 20/10; revalidar antes de editar.

**Qué falta o debe comprobarse:** El comportamiento auditado incluye multiplicadores de luz; falta acreditar una presentación completa de cada estado con el nuevo acabado.

**Mejora literal:** Ajustar luz, actividad y mezcla de los estados existentes: celebración acogedora, soledad contenida y oscuridad legible. Hacerlo con detalles reversibles y respetando su texto narrativo.

**Conservar:** Mismo escenario, personajes y final elegido por el servidor/DM; no añadir invitados, castigos, recompensas o finales nuevos.

**Se acepta cuando:** Los tres estados tienen intención perceptible sin cambiar distribución; deshacer o cargar restaura correctamente la presentación.

**Evidencia de partida:** Estados celebration/solitude/darkness y multiplicadores auditados

### C50. Restaurar fuentes, sombras y emisivos juntos

**Fase:** E5. **Prioridad:** P0. **Tipo:** Falta comprobarlo; no se declara un fallo existente.

**Qué falta o debe comprobarse:** Falta una prueba de ida/vuelta de cada final tras el nuevo arte y efectos.

**Mejora literal:** Comprobar apagado/restauración de vela, ventanas, faroles, humo asociado, luz sobre actores y sombras cuando corresponda al estado real.

**Conservar:** Selección manual del DM, reloj y visibilidad útil de controles, incluso en darkness.

**Se acepta cuando:** No quedan ventanas brillantes sin luz, sombras de fuentes apagadas, humo incorrecto o un mapa ilegible al cargar/reconectar.

**Evidencia de partida:** Llamas, light pools y localLightBases existentes

### C51. Completar la mezcla de Cena con fuentes existentes

**Fase:** E5. **Prioridad:** P1. **Tipo:** Comprobado en el código auditado el 20/10; revalidar antes de editar.

**Qué falta o debe comprobarse:** El catálogo existe; falta acreditar una mezcla ambiental propia y la transición desde el Espejo.

**Mejora literal:** Escuchar el perfil real, seleccionar ambiente exterior/fuego adecuados y espaciar gestos de silla/copa. Corregir fundidos y silencio por final usando el mezclador existente.

**Conservar:** Música y decisión de salida de audio, gesto de desbloqueo y voz del DM; no añadir diálogos automáticos ni duplicar sonido por cliente.

**Se acepta cuando:** La llegada no arrastra viento helado, el ambiente no tapa conversación y jugador/proyector no producen eco o SFX duplicados.

**Evidencia de partida:** Perfil dinner del pack: música esperanza, SFX y capas apagadas por defecto

### C52. Mantener el brindis claro sin cubrir la escena

**Fase:** E5. **Prioridad:** P1. **Tipo:** Falta comprobarlo; no se declara un fallo existente.

**Qué falta o debe comprobarse:** Falta comprobar comodidad de la señal de interacción sobre la escena mejorada; la captura de escenario no valida la interfaz.

**Mejora literal:** Ajustar solo la presentación necesaria del control actual para que se entienda alcance y acción sin cubrir caras, mesa o selección.

**Conservar:** Texto funcional, respuesta, tamaño táctil y preferencias de posición; no rediseñar consola DM/combate ni convertir el brindis en decisión moral.

**Se acepta cuando:** Acercarse permite interactuar con comodidad y la respuesta no cambia automáticamente puntuación, inventario o final.

**Evidencia de partida:** Interacción Brindar con Anteros; revisión nueva móvil/DM

## K · Integración y aceptación

### C53. Aceptar el resultado en la mesa integrada

**Fase:** E6. **Prioridad:** P0. **Tipo:** Comprobado en el código auditado el 20/10; revalidar antes de editar.

**Qué falta o debe comprobarse:** Una captura del visor independiente no acredita el acabado de /dm, /player y /projector.

**Mejora literal:** Comparar los tres roles usando el renderer integrado real. Revalidar qué efectos están activos y corregir la presentación de Cena en ese modo.

**Conservar:** Arquitectura y perfiles; no activar SSAO/HDR/bloom globalmente solo para igualar una foto del Playground.

**Se acepta cuando:** La mejora se ve y se usa en las tres interfaces; no existe únicamente en una página de demostración.

**Evidencia de partida:** renderer.ts: efectos distintos según integrated en la base auditada

### C54. Conservar cámara, controles y preferencias

**Fase:** E6. **Prioridad:** P0. **Tipo:** Falta comprobarlo; no se declara un fallo existente.

**Qué falta o debe comprobarse:** Falta la regresión final de preferencias y lectura de la escena con los detalles nuevos.

**Mejora literal:** Comprobar 15°/zoom medio, cinco giros e intermedios, extremos actuales y móvil vertical/horizontal. Reabrir la pantalla y entrar/salir de combate.

**Conservar:** Inclinación elegida, zoom, cámara local/compartida, cuadrícula, posición de joystick/interacción y orientación de movimiento.

**Se acepta cuando:** Ningún adorno cambia controles, restablece preferencias o obliga a jugar desde un único ángulo para evitar errores.

**Evidencia de partida:** Perfil actual de cámara y decisión de WASD estable

### C55. Conservar profundidad e iluminación en calidad baja

**Fase:** E4. **Prioridad:** P0. **Tipo:** Falta comprobarlo; no se declara un fallo existente.

**Qué falta o debe comprobarse:** Falta acreditar que reducir coste no elimina los rasgos que hacen reconocible la mejora.

**Mejora literal:** Reducir primero transparencias, partículas finas, posprocesado y sombras secundarias; mantener planos, siluetas, foco cálido y luz de actores.

**Conservar:** Mismo mapa y composición; no usar una imagen plana o cambiar distribución como perfil móvil.

**Se acepta cuando:** El móvil muestra el mismo lugar mejorado y legible, con menos efectos, y movimiento reducido se respeta.

**Evidencia de partida:** Perfiles actuales; comparación nueva PC/móvil

### C56. Medir el coste del acabado, no asumir FPS

**Fase:** E6. **Prioridad:** P0. **Tipo:** Falta comprobarlo; no se declara un fallo existente.

**Qué falta o debe comprobarse:** No hay una medición sostenida de la candidata futura ni una prueba física nueva sobre Pixel 9a.

**Mejora literal:** Medir base y candidata con mismo dispositivo/resolución/estado; registrar cuadros, llamadas, texturas, memoria estimada y transiciones durante al menos 15 minutos. Optimizar agrupación y materiales.

**Conservar:** Detalle útil y funcionalidad; no presentar 24 redibujados de PC como FPS móvil ni ocultar el coste bajando resolución sin indicarlo.

**Se acepta cuando:** Se publican datos comparables y límites pendientes; cualquier objetivo no alcanzado queda explicado con evidencia.

**Evidencia de partida:** Medición histórica 18/10: 725 mallas, 540 draw calls, p95 9,7 ms a 720p

### C57. Liberar todos los recursos de la presentación

**Fase:** E6. **Prioridad:** P0. **Tipo:** Falta comprobarlo; no se declara un fallo existente.

**Qué falta o debe comprobarse:** Falta comprobar que los detalles nuevos no acumulan texturas, mallas, luces, listeners o audio al volver a Cena.

**Mejora literal:** Dar propietario y limpieza a cada recurso nuevo; medir 20 entradas/salidas con las cachés y reglas existentes.

**Conservar:** Recursos compartidos de Sylvania y otros mapas; no destruir atlas compartidos o reiniciar el motor para ocultar una fuga.

**Se acepta cuando:** Conteos y memoria se estabilizan y no reaparecen efectos duplicados o sonidos de una escena anterior.

**Evidencia de partida:** Ciclo de vida renderer/presentación; requiere medición nueva

### C58. Conservar sincronización y recuperación

**Fase:** E6. **Prioridad:** P0. **Tipo:** Falta comprobarlo; no se declara un fallo existente.

**Qué falta o debe comprobarse:** Las pruebas de base no acreditan la futura presentación tras desconexión, carga o cambio de estado.

**Mejora literal:** Probar DM, dos jugadores y proyector; mover, abrir puerta, brindar, cambiar final, desconectar/reconectar y guardar/cargar en copias aisladas.

**Conservar:** Secretos en servidor, estado autoritativo y guardados reales del usuario.

**Se acepta cuando:** Todos ven los mismos estados y posiciones; preferencias locales permanecen; no se duplican objetos/luz/SFX ni se pierden decisiones.

**Evidencia de partida:** Servidor/guardado actuales; pruebas aisladas nuevas necesarias

### C59. Demostrar la mejora punto por punto

**Fase:** E6. **Prioridad:** P0. **Tipo:** Falta comprobarlo; no se declara un fallo existente.

**Qué falta o debe comprobarse:** Falta una candidata implementada; este informe describe trabajo pendiente y no es un después.

**Mejora literal:** Entregar comparativas con misma cámara/hora/clima/final: sin efectos de atmósfera/desenfoque, acabado completo y perfil móvil. Añadir vídeo corto caminando, girando y entrando a casa. Vincular evidencia a cada Cxx.

**Conservar:** Encuadre y condiciones de comparación; no usar solo tomas favorecedoras, editor o renders generados.

**Se acepta cuando:** Puede verificarse qué mejoró en cada punto, qué ya estaba resuelto y qué sigue pendiente; profundidad y luz se ven también en movimiento.

**Evidencia de partida:** Esta lista C01–C60 y capturas base fechadas

### C60. Entregar una candidata del mismo mapa, jugable

**Fase:** E6. **Prioridad:** P0. **Tipo:** Falta comprobarlo; no se declara un fallo existente.

**Qué falta o debe comprobarse:** Aún no existe una implementación de este encargo acreditada por esta auditoría.

**Mejora literal:** Entregar arranque Windows, candidata aislada, fuentes/derivados/licencias, resultados por Cxx y pendientes de móvil/proyector/escucha física. Mantener una versión funcional al terminar cada fase.

**Conservar:** Cena existente y trabajo de otros mapas/chats; no cerrar con un mapa distinto, una maqueta o solo documentación.

**Se acepta cuando:** El usuario puede arrancar, recorrer e interactuar en la misma Cena con el acabado mejorado; ninguna comprobación física o aprobación artística se declara hecha sin realizarla.

**Evidencia de partida:** Candidata futura y guion de aceptación

