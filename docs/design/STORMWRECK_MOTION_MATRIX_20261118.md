# Stormwreck · matriz de movimiento y preparación de estados

## Trinity y los objetos del escenario

Trinity va primero según el orden del maestro. Cada pose guarda un rumbo y un apoyo dentro del mundo. El giro de cámara elige una vista dibujada sin mover al personaje ni alterar su orientación respecto al objeto. Para una animación, el apoyo también se comprueba a lo largo de la transición y al cambiar de vista.

Los asientos naturales de Campamentos proporcionan plaza, altura y rumbo a partir del objeto. Trinity reutiliza ocho vistas sostenidas con marcas de pelvis y suelas por vista. Las plazas de troncos, maderos y lajas toman la altura de su superficie renderizada. El torso se apoya en la plaza y las piernas salen por el borde hacia un punto fijo, limitado por el suelo y la talla. La cámara elige el dibujo y conserva el frente del asiento durante el giro. Las acciones de uso orientan hacia el objeto cuando el personaje está de pie. Los contactos de manos y las transiciones de asiento y lecho siguen pendientes de producción y revisión.

### Asientos reutilizables en Godot

Para añadir un asiento, declarar su punto de interacción `seat` y registrarlo por el mismo ID en `seat_anchors` con `CampPropFactory.seat_anchor`. El nodo del modelo orienta su frente en +Z local. Cada plaza declara un punto local para la pelvis. Los modelos con superficie irregular pueden declarar sus mallas de apoyo para tomar la altura en ese punto. El acceso se expresa en coordenadas del mapa y el radio frontal mide la distancia de la plaza al borde que deben salvar las piernas. Para troncos simétricos se permite elegir el lado de acceso. Una silla con respaldo mantiene su frente declarado. La geometría del asiento y el rumbo se resuelven al sentarse, independientemente de la cámara.

El registro transforma las plazas con el objeto, incluso bajo un nodo padre girado o elevado. Campamentos conserva sus modelos de tronco, madero y piedra con esta misma interfaz. El controlador busca una plaza disponible y al levantarse la libera. Reutilizar el modelo y sus plazas solo requiere registrarlo con su transformación y su nuevo ID.

[Revisión de encaje y giro](../../output/trinity-object-facing/fit/index.html). Comparativa Forward+ del tronco con la misma cámara y modelo, con la altura anterior de 0,36 m y la nueva medida de 0,425 m en la plaza central. Las ocho texturas PNG y sus pivotes de pelvis se reutilizan. Las suelas y la geometría de representación se incorporan mediante el catálogo de imágenes y la superficie compartida con el efecto de estado.

El tres cuartos frontal derecho reutiliza el izquierdo espejado al cargarlo. El pivote y las suelas se reflejan con la ilustración para mantener la escala, el apoyo y la dirección de las rodillas. El PNG anterior sigue en el atlas de origen. [Antes y después del tres cuartos derecho](../../output/trinity-object-facing/fit/right/index.html).

Mía y Mike usan el mismo apoyo y ocho dibujos nuevos por personaje. El catálogo de Campamentos queda en cuatro tipos reutilizables y nueve ubicaciones. Cada prueba usa una muestra por tipo. Los dos bancos con respaldo de A1 anclan a sus cojines y conservan sus dos plazas. El tronco caído y el madero de deriva disponen de tres plazas. Las lajas usan dos plazas sobre las superficies existentes, incluido el asiento de piedra del bosque que antes tenía la malla del tronco. Las variaciones de tono de las lajas comparten geometría y protocolo. [Visor de los tres protagonistas](../../output/stormwreck-party-seats/index.html).

### Camas y petates

Cada lecho registra el apoyo de la cabeza, el plano de la ropa de cama, su anchura y la distancia útil desde la almohada. El modelo orienta los pies hacia +Z local. Campamentos forma el busto como secciones cerradas y sombreadas. `restSculpt` registra los rasgos en coordenadas del PNG, la inclinación de la cabeza y, donde procede, el final de la barba. Las curvas de `restVolume` dan espesor al cuerpo y modelan la manta sobre las piernas. El overlay comparte la malla del busto. `restBlanket` declara los tonos de lana y ribete y el número de bandas. La pose y la tela mantienen el rumbo del lecho al girar la cámara. Los lechos nuevos reutilizan el encaje si declaran el apoyo y cabe el personaje a su talla. [Comparativas por ángulo y lecho](../../output/stormwreck-bed-rest/sculpt/index.html).

| Objeto | Acción y contacto que deben coincidir |
| --- | --- |
| Asiento | Sentarse y levantarse. Ajustar altura, orientación y retorno al punto de acceso. |
| Petate | Preparar la manta, tumbarse, descansar y levantarse. Alinear cabeza y pies con el eje. |
| Baúl o mochila | Agacharse y alcanzar cierre o tapa. Abrir en el fotograma de contacto y reproducir el cierre correspondiente. |
| Hoguera | Acercar manos para calentarse, alcanzar para avivar y manipular utensilios al cocinar. Cada gesto usa su distancia segura y punto de apoyo. |
| Mesa y herramientas | Apoyar manos o usar útiles a la altura real de la superficie. |

Probar plantilla y tamaño de Trinity en campamentos con giro de cámara. Las transiciones utilizan seis poses distintas como mínimo y ocho como objetivo. Revisar el pivote del cuerpo, los puntos de la mano y el efecto de estado con el objeto visible.

Estudio autorizado del 18/11/2026. Ficha de producción del maestro `ROADMAP_V1.md`, no otra cola global. Abarca **37 apariencias registradas, agrupadas en 24 perfiles cinéticos**: Mía, Mike, Trinity/María, PNJ y criaturas de la aventura. D8 y la producción de ropa/equipo siguen aplazados.

La matriz define lo que hace falta y habilita su validación futura. **No acredita que esas animaciones, máscaras u overlays ya estén producidos.** Los 37 reposos anteriores conservan sus ocho fotogramas y su evidencia propia.

## Fuentes y forma de lectura

- Aventura local: `OneDrive_1_12-9-2026/Aventura Los Dragones de la Isla de las Tempestades.pdf`, SHA-256 `26a700407a3878f27428755e40fdb8d8a933a9bbd2aeaa9461e33fc6fae2fc69`. Personajes/encuentros y perfiles de pp8–48; páginas exactas por ID en el contrato.
- Fichas elegidas: `Personajes/Mike Mago Erudito.pdf`, `Mia Enano Clérigo.pdf` y `Maria Pies ligeros.pdf`, p1, bajo el mismo directorio. Son páginas escaneadas: se revisaron renderizadas con Poppler. La extracción de una imagen interna aislada NO reconstruye la ficha y no se usó como lectura final. Hashes y velocidades iniciales en `sheetReference`.
- Definiciones y registro nativo actuales: `prototypes/godot-shared/characters/`; inventario ejecutado con Godot en `output/stormwreck-motion-20261118/native-motion-inventory.json`.
- Los perfiles del PDF se usan como referencia de esta aventura. El estudio no cambia de edición, estadísticas, condiciones, velocidades, equipo, navegación ni decisiones de la partida activa.
- REF-01 de la biblioteca visual: legibilidad del personaje y separación de planos. VA-01/03/10/16: identidad, escala, lectura y estados. No se produce arte nuevo con estas referencias en esta entrega.

## Fotogramas, fps y direcciones

La instrucción actual permite **seis dibujos distintos como mínimo por ciclo nuevo de Stormwreck**, ocho como objetivo, y más cuando mejoren el movimiento. Se conservan contratos anteriores de ocho fases. El pipeline de las demás campañas mantiene su mínimo general.

Los **fotogramas** son dibujos diferentes. Los **fps** indican cuántos se reproducen por segundo. Ocho dibujos a 2,5 fps forman un bucle de 3,2 s; los mismos a 12 fps duran 0,67 s. El framerate del motor es otra medida. No tiene sentido imponer 6 fps a todos los reposos ni usar 8 fps como límite superior.

| Tipo | Dibujos mínimos | Objetivo/recomendación | Fps de reproducción iniciales |
| --- | ---: | --- | --- |
| Reposo | 6 | 8; gestos contenidos | 2–4 |
| Caminar | 6 | 8–10 | 8–12 |
| Avance rápido / Correr | 6 | 8–12 | 12–18 |
| Marcha de zombi | 6 | 6–8; apoyos torpes claros | 6–10 |
| Raíces del hongo violeta | 6 | 6–8 | 3–6 |
| Trepar / arrastrarse | 6 | 8–12; brazos alternos | 6–10 |
| Nadar | 6 | 8–12; ciclo de propulsión completo | 8–12 |
| Vuelo | 6 | 8–12; alas con extensión/recogida | 10–16 |
| Vuelo de estirge | 6 | 8–12; batido rápido legible | 16–24 |
| Salto | 6 | 8–12; anticipación, vuelo y recepción | 12–18 |
| Ataques / alientos | 6 | 8–12; anticipación, liberación, recuperación | 10–18 |
| Caer, levantarse, despegar, aterrizar | 6 | 6–10 | 8–14 |
| Pose sostenida | No es un ciclo | 1–3; se puede pausar | Tiempo propio |

Son presupuestos artísticos para ajustar con una muestra real, no valores universales de calidad. Un ciclo de seis debe conservar apoyo, identidad y continuidad. Subir fps no sustituye fases ausentes. Repetir archivos o cambiarles solo el nombre no cumple el mínimo. Los contactos de pies/patas, la propulsión y la alternancia deben verse realmente.

Las ocho direcciones lógicas son independientes de los ocho dibujos de un ciclo. Las vistas necesarias se auditan una a una. Con cámara libre, frente/espalda y diagonales deben corresponder al rumbo visto por la cámara. Se puede reutilizar una vista simétrica cuando sea correcto; no invertir a Varnoth, sus heridas o el equipo pintado para fabricar otra anatomía. El giro sin desplazamiento conserva el apoyo y la orientación al detenerse.

## Familias y movimientos necesarios

Todos los perfiles incluyen reposo, giro, arranque/parada y una respuesta a impacto/derrota apropiada. Las transiciones se pueden integrar en otros clips; no obligan a producir un atlas distinto por etiqueta. Correr es una acción de reglas y un avance visual más rápido, no una nueva velocidad natural.

| Familia / miembros | Locomoción y gestos que necesita | Particularidades |
| --- | --- | --- |
| Mike | Caminar/correr, sigilo, agacharse/arrastrarse; salto, trepar y nado contextuales. Espada corta y conjuro arcano | Ficha inicial 9 m, FUE 10. Ser mago no concede vuelo. Libro/componentes se vinculan a la acción real. |
| Mía | Paso con peso, avance rápido, guardia con escudo, salto/trepa/nado contextuales; maza, hacha de mano, conjuro divino | Ficha inicial 7,5 m, FUE 14. Armadura y proporciones estables. |
| Trinity / María | Marcha ligera, carrera, sigilo, arrastre real, trepa, nado y salto; daga, lanzamiento, arco, herramientas | Ficha inicial 7,5 m, FUE 8. Es la misma persona. Alternancia visible de manos/piernas; ninguna transformación de cuerpo entre acciones. |
| Runara humana | Marcha serena, saludo, hablar, meditar; cambiar de forma | PDF p41 conserva el perfil al transformarse: caminar 12 m y capacidades heredadas de nado 12/vuelo 24. La presentación humana del vuelo requiere un tratamiento explícito según la forma; no añadir alas a su dibujo ni borrar estadísticas por la silueta. |
| Tarak | Marcha, avance rápido, agacharse, atender, cultivar; daga si está armado | Tres ataques de daga se secuencian con el sistema de acciones; las herramientas no aparecen de la nada. |
| Varnoth | Marcha con prótesis, avance rápido, sentarse/levantarse, meditar, reparación; espada corta si está armada | Prótesis derecha y ojo izquierdo ciego. La ficha mantiene 9 m: no imponer penalización por la prótesis. |
| Agga, Blepp, Frub, Kilnip, Laylee, Mumpo, Rix, Zark y kobold renegado | Marcha pequeña con cola como contrapeso, avance rápido, sigilo/agacharse; tareas/interacción; daga y honda cuando procedan | Una familia de movimiento compartida con correcciones propias por apariencia; no concede vuelo. |
| Myla | Locomoción terrestre y herramientas, alquimia, daga, detectar magia | Excepción narrativa de alas, descrita debajo. Sin producción de vestimenta o accesorios nuevos. |
| Mek, Minn y kobold alado | Marcha, despegar, batido de avance, virajes, aterrizar; daga y dejar caer roca | 9 m a pie y en vuelo. Vuelo visual sostenido no equivale al rasgo mecánico hover. |
| Cuatro zombis | Balanceo sin respiración necesaria, arrastre de pies, avance apresurado torpe, arrastrarse, caer/levantarse, golpe y fortaleza | 6 m terrestres. No vuelo/excavación naturales. Nado/trepa/salto son contextuales; vadear o caminar sumergido son alternativas de escena. Dormir/comer no son acciones habituales necesarias. |
| Gul | Marcha depredadora, acecho, avance rápido y arrastre; mordisco y garras distintos | 9 m; no copiar el arrastre pesado del zombi. El veneno, hechizo y cansancio tienen inmunidad en este perfil del PDF. |
| Dos arpías | Marcha de patas aviares, despegar, volar/virar/aterrizar, percha y canto sostenido; garras y garrote | 6 m a pie / 12 m volando. Dos actores pueden reutilizar arte; el multiataque conserva ambas acciones. |
| Micónido adulto y sus diez nombres secundarios | Marcha fibrosa, trabajo, unión, puñetazo y esporas de comprensión/auxilio/pacificación | 6 m. Los emisores de esporas siguen el cuerpo; no equivalen a vuelo. |
| Brote micónido y sus cinco nombres secundarios | Paso corto, trabajo, unión, puñetazo y comprensión/auxilio | 3 m. No hereda las esporas pacificadoras del adulto. |
| Sinensa | Marcha de líder, unión, puñetazo, esporas alucinógenas/comprensión/auxilio; coma y recuperación de escena | 9 m. El coma inicial es reversible, no su cuerpo base permanente. |
| Hongo violeta | Avance por raíces, quietud engañosa, cuatro tentáculos, volcar/colapsar y recuperar apoyo | 1,5 m. No piernas humanas ni sprint atlético; apariencia falsa exige quietud. |
| Pulpo siervo espora | Arrastre terrestre con brazos, propulsión acuática, giro nadando, golpe de tentáculos, colapso | 1,5 m terrestre / 15 m nadando. Ocho brazos. El perfil NO usa el agarre, tinta o camuflaje del pulpo vivo. |
| Serpiente de fuego | Reptar, enroscarse, avance rápido ondulante, mordisco y coletazo | 9 m terrestres. Sin patas/brazos/alas. Su fuego natural es parte del aspecto base. |
| Draco de humo | Deslizamiento a ras de suelo, elevarse, vuelo/viraje/descenso, mordisco, aliento y disipación al morir | 9 m terrestre / 9 m volando. El PDF le da desplazamiento terrestre aunque no tiene patas. Núcleo y estelas translúcidas requieren cobertura separada. |
| Estirge | Desplazamiento con seis patas, despegue, vuelo, adhesión, alimentación sostenida, desprendimiento y caída | 3 m terrestre / 12 m volando. El anclaje al anfitrión sigue su movimiento. Alimentarse no repite la estocada. |
| Oso lechuza | Marcha cuadrúpeda pesada, avance rápido, erguirse/amenazar, olfatear, garras y pico | 12 m terrestres. Las plumas no conceden vuelo. |
| Aidron | Marcha de cría, carrera, despegar/volar/aterrizar, nadar, mordisco y dos alientos; forcejeo con cadenas | 9 m terrestre/nado, 18 m volando. Cría Mediana. Restricción de cadenas desde reglas de escena. |
| Chispa Fulminante | Marcha de cría, vuelo y entrada/excavación/salida, mordisco y aliento eléctrico | 9 m terrestre / excavar 4,5 m / volar 18 m. Excavar requiere terreno permitido, no atravesar edificios por la animación. |
| Runara dragona | Paso adulto, carrera, vuelo, nado, mordisco, garras, ambos alientos y transformación | 12 m terrestre/nado, 24 m vuelo. Enorme; misma identidad que Runara humana. |

### Excepciones que no deben resolverse por un sprite genérico

Myla: pp9/31 describen daño/pérdida de alas; p44 da vuelo de 3 m al manitas genérico. Se registra la discrepancia, con **producción terrestre por defecto para Myla**. No se modifica automáticamente la ficha de partida; un permiso de vuelo requiere fuente explícita de reglas/DM. Mek y Minn son kobolds alados normales, con 9 m de vuelo, no copias del manitas.

Runara: dos formas de una identidad. Sus capacidades retenidas no se infieren de la apariencia humana. Aidron encadenado conserva identidad y anatomía: se representa la restricción de escena, sin generar otro monstruo.

No tener velocidad especial de nado/trepa NO significa prohibir siempre esas acciones. Las reglas, el terreno y una posible prueba deciden. Tener un clip llamado `swim`, `spell` o `run` tampoco concede esa acción o una velocidad. La actual arpía usa vuelo en un alias de carrera; la producción futura distinguirá el medio físico antes de elegir la animación.

## Terreno preparado para overlays

Cada clip futuro debe declarar identidad del fotograma, acción, rumbo visto, índice, hash de fuente, orientación real, inversión, pivote visual y altura de referencia erguida. La textura final determina la silueta actual. La física y la posición de la ficha no se mueven por aplicar un material o estirar el dibujo.

Para cada fase se revisarán puntos anatómicos relativos, su visibilidad, el apoyo y el orden delante/detrás. Los puntos ocultos no se inventan sobre un brazo visible. Las coordenadas de plantilla son semillas; con una pose distinta o una envolvente que cambia se requieren correcciones. Varnoth necesita la zona de prótesis derecha; el pulpo sus ocho brazos; la estirge seis patas/probóscide; el hongo cuatro tentáculos; los dragones alas, cola y cuatro apoyos. El draco de humo separa núcleo de bruma translúcida.

La auditoría registra huecos reales de los perfiles actuales: raíces/pivote explícito donde falta, cuatro anclajes de tentáculos del hongo y la zona particular de Varnoth. No se añadieron coordenadas aproximadas para dar por resuelto su ajuste. Las máscaras zonales siguen pendientes de autoría/revisión; el alfa actual se puede reutilizar para materiales sobre toda la silueta.

| Respuesta | Preparación necesaria |
| --- | --- |
| Veneno, maldición, escarcha, quemado | Material localizado sobre alfa/zonas actuales. Mismo rostro/proporciones, intensidad y retirada reversibles. Los tres últimos no crean condiciones oficiales por sí solos. |
| Petrificación / parálisis | Pose sostenida y control de avance del cuerpo; material y efecto pueden tener su propio reloj. Caída/movimiento desde reglas, no por el nombre del shader. |
| Agarrado / restringido | Pivote estable, anclajes corporales y sujeción por causa: raíces, red, cadena, hielo, manos o ligadura. Forcejeo local solo si procede. |
| Derribado / inconsciente | Caída/pose en el suelo/recuperación adaptadas a la anatomía. Apoyo del cuerpo tumbado distinto de la estatura erguida; una criatura aérea no se teletransporta al suelo. |
| Aturdido / incapacitado | Leer `canMove`, `canAct` y velocidad efectivos del sistema de reglas. No inferir inmovilidad universal entre ediciones o causas. |
| Miedo / hechizo | Mantener locomoción permitida; tensión/gesto adecuados. Restricciones de ruta y objetivos siguen en reglas. |
| Ceguera / sordera | Zona sensorial significativa para esa criatura e inmunidades. No poner ojos/oídos humanos a plantas o pulpo ciego más allá de su visión ciega. |
| Invisibilidad / ocultación | Invisibilidad compone cuerpo y equipo con percepción autorizada. Ocultación es otra condición visual y puede usar postura de sigilo. |

Orden de composición: resolver pose → textura/fotograma → pivote/anclajes → material corporal → sujeciones delante/detrás → efecto ambiental. Los iconos de condición permanecen bajo el nombre en la interfaz. Se pueden combinar efectos con prioridades y retirar cada uno sin perder el material ni la fase originales.

Las inmunidades del PDF se guardan por actor. Zombi: envenenado; gul: cansancio/envenenado/hechizado; draco de humo: envenenado; hongo violeta: asustado/cegado/ensordecido; pulpo: asustado/cegado/hechizado/paralizado. Las inmunidades a daño son otra lista. El fuego natural de la serpiente y las inmunidades elementales no son equivalentes a cualquier overlay decorativo. La previsualización artística del DM no debe aplicar estados mecánicos.

## Qué está ejecutado y qué queda preparado

- Contrato por los 37 ID y 24 perfiles: `prototypes/godot-shared/characters/motion-contracts/stormwreck-isle.json`.
- Inventario nativo ejecutado sobre la candidata instalada: ocho apariencias con locomoción registrada y 29 con reposo, sin acreditar por ello que toda dirección sea artísticamente correcta. Se conservan PNG/atlas antiguos para buscar reutilización, incluido gul.
- Pipeline fuente: admite seis fases distintas para los ciclos de Stormwreck; mantiene ocho en contratos existentes y en la política general de otras campañas. Incluye vuelo, excavación y otros movimientos en la validación, y exige fuente explícita para una capacidad concedida.
- Pruebas actuales: 26 del pipeline superadas y una prueba nativa del reproductor con seis entradas, avance en orden y vuelta a cero a 7 fps. Es una fixture en memoria recortada de un ciclo existente para probar longitud variable, no una nueva animación artística aprobada. El primer intento aplicaba el perfil antes de `_ready`, que lo reemplazaba; se corrigió la inicialización de la prueba y se conserva su log fallido aparte. No se modificó el reproductor.
- Informe navegable: `output/stormwreck-motion-20261118/index.html`. Datos completos y huecos anatómicos en `motion-audit.json`.
- Los huecos de anclajes se registran como pendientes; no están dibujados, ajustados ni aprobados por haber añadido esta matriz. El visor de estados no recibe un acabado nuevo en esta entrega.
- No se importa una nueva candidata gráfica ni se reinstalan los prototipos por este estudio. El inventario nativo corresponde a la revisión instalada `89c0a6ede6aca458e98330f8a8e52391d1ba1dd89f409ca9a43d00a75379184f`; la nueva política de producción tiene su propia validación fuente y se aplicará a las importaciones siguientes. La evidencia anterior de 296 renders sigue ligada a aquella revisión.
- Se comprobaron por hash los 296 fotogramas entregados anteriormente: sin cambios. `output/stormwreck-motion-20261118/verification.json` separa la revisión fuente de política de la candidata instalada y resume los pendientes.

## Registro completo por apariencia

| Apariencia | Perfil cinético | Velocidades de ficha | Disponibilidad nativa | Páginas PDF |
| --- | --- | --- | --- | --- |
| Arpía | harpy | caminar 6 m · volar 12 m | 8 direcciones registradas; revisión visual pendiente | 39 |
| Trinity · María Pies Ligeros | hero-rogue | caminar 7,5 m | 8 direcciones registradas; revisión visual pendiente | ficha |
| Mía | hero-cleric | caminar 7,5 m | 8 direcciones registradas; revisión visual pendiente | ficha |
| Mike | hero-wizard | caminar 9 m | 8 direcciones registradas; revisión visual pendiente | ficha |
| Agga | kobold-ground | caminar 9 m | reposo; locomoción pendiente de registrar | 8 |
| Aidron | bronze-wyrmling | caminar 9 m · nadar 9 m · volar 18 m | reposo; locomoción pendiente de registrar | 28, 34, 41 |
| Blepp | kobold-ground | caminar 9 m | reposo; locomoción pendiente de registrar | 8 |
| Serpiente de fuego | fire-snake | caminar 9 m | reposo; locomoción pendiente de registrar | 20, 47 |
| Frub | kobold-ground | caminar 9 m | reposo; locomoción pendiente de registrar | 8 |
| Draco de humo | fume-drake | caminar 9 m · volar 9 m | reposo; locomoción pendiente de registrar | 14, 20, 39 |
| Gul | ghoul | caminar 9 m | reposo; locomoción pendiente de registrar | 42 |
| Kilnip | kobold-ground | caminar 9 m | reposo; locomoción pendiente de registrar | 9 |
| Kobold renegado | kobold-ground | caminar 9 m | reposo; locomoción pendiente de registrar | 14, 15, 43 |
| Laylee | kobold-ground | caminar 9 m | reposo; locomoción pendiente de registrar | 9 |
| Mek | kobold-winged | caminar 9 m · volar 9 m | reposo; locomoción pendiente de registrar | 31 |
| Minn | kobold-winged | caminar 9 m · volar 9 m | reposo; locomoción pendiente de registrar | 31 |
| Mumpo | kobold-ground | caminar 9 m | reposo; locomoción pendiente de registrar | 9 |
| Micónido adulto | fungus-adult | caminar 6 m | reposo; locomoción pendiente de registrar | 19, 20, 45 |
| Brote micónido | fungus-sprout | caminar 3 m | reposo; locomoción pendiente de registrar | 19, 44, 45 |
| Myla | myla | caminar 9 m | reposo; locomoción pendiente de registrar | 9, 44 |
| Oso lechuza | owlbear | caminar 12 m | reposo; locomoción pendiente de registrar | 14, 46 |
| Rix | kobold-ground | caminar 9 m | reposo; locomoción pendiente de registrar | 9 |
| Runara · dragona de bronce | bronze-adult | caminar 12 m · nadar 12 m · volar 24 m | reposo; locomoción pendiente de registrar | 8, 41 |
| Runara · forma humana | runara-human | caminar 12 m | reposo; locomoción pendiente de registrar | 8, 41 |
| Sinensa | sinensa | caminar 9 m | reposo; locomoción pendiente de registrar | 20, 21, 45 |
| Chispa Fulminante | blue-wyrmling | caminar 9 m · excavar 4,5 m · volar 18 m | reposo; locomoción pendiente de registrar | 28, 32, 33, 40 |
| Pulpo siervo espora | spore-octopus | caminar 1,5 m · nadar 15 m | reposo; locomoción pendiente de registrar | 18, 46 |
| Estirge | stirge | caminar 3 m · volar 12 m | reposo; locomoción pendiente de registrar | 19, 31, 42 |
| Tarak | tarak | caminar 9 m | reposo; locomoción pendiente de registrar | 9, 47 |
| Varnoth Wender | varnoth | caminar 9 m | reposo; locomoción pendiente de registrar | 9, 48 |
| Hongo violeta | violet-fungus | caminar 1,5 m | reposo; locomoción pendiente de registrar | 19, 43 |
| Kobold alado | kobold-winged | caminar 9 m · volar 9 m | reposo; locomoción pendiente de registrar | 15, 44 |
| Zark | kobold-ground | caminar 9 m | reposo; locomoción pendiente de registrar | 9 |
| Zombi marinero 2 | zombie | caminar 6 m | 8 direcciones registradas; revisión visual pendiente | 48 |
| Zombi marinero 3 | zombie | caminar 6 m | 8 direcciones registradas; revisión visual pendiente | 48 |
| Zombi marinero 4 | zombie | caminar 6 m | 8 direcciones registradas; revisión visual pendiente | 48 |
| Zombi marinero | zombie | caminar 6 m | 8 direcciones registradas; revisión visual pendiente | 48 |

