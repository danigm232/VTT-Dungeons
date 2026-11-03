# Auditoría visual transversal — carencias frente a referencias modernas

Fecha de cierre documental: 01/11/2026. Encargo iniciado el 30/10. Alcance: comparar evidencias disponibles y convertir las diferencias en trabajo para todos los chats. No se implementan gráficos, cambian mapas o validan dispositivos en esta entrega.

## 1. Qué se ha revisado realmente

| Evidencia nuestra | Fecha/alcance | Límite |
| --- | --- | --- |
| Cena: `output/d8-dinner-octopath-audit-20261020/refs/actual-20261020.png` y detalle del 18/10 | Distribución, materiales, muebles, luz y escala de encuadre | No demuestra el estado visual de una futura candidata de Cena |
| Retiro: `output/retreat-corrections3-20261028/evidence/opt-after-a3.png` y `opt-after-grove.png` | Capturas del pase documentado el 29/10: comedor y bosquete | No es recorrido exhaustivo A1–A5 ni comparación de todos los climas |
| Retiro: `docs/evidence/RETREAT_CORRECTIONS3_20261029.md` y roadmap revisión 19 | Documenta ampliaciones, césped, árboles, muebles, recorte y optimizaciones ya hechos | Evidencia declarada por su entrega, no pruebas repetidas en esta auditoría |
| Espejo: `output/d8-mirror-immersive-20261020/candidate-arrival.png` y evidencia del 21/10 | Cueva, hielo, ambiente y escala del personaje | No generalizar el mismo diagnóstico a todos sus focos |
| Pecio: roadmap M5/M7 y entregas/optimización recientes | Alcance de arte/función y pendientes documentales | Sin nueva matriz visual completa del Pecio; no declarar revisado su acabado actual por fotos antiguas |
| Campamentos | Contratos y evidencia local referenciada | Sin nueva inspección visual de los cinco mapas; revalidación por escena pendiente |
| Código de actores/cámara/Sylvania | Materiales sin iluminación propia, integración opcional, perfil de cámara y paleta existente | Tener un sistema no demuestra su calidad en cada escena; tampoco justifica duplicarlo |

Las referencias comerciales y su grado de revisión están en la [biblioteca moderna](../design/VISUAL_REFERENCE_LIBRARY.md). Hay cinco familias con imágenes examinadas en esta investigación y su antecedente; otras siete se han identificado mediante fuentes primarias como referencias de estudio, sin afirmar una inspección artística completa. Todo juicio de parecido es una lectura artística, no un dato interno de esos juegos.

## 2. Diagnóstico principal

El mayor desfase observado es la **coherencia de producción del arte**. En el comedor reciente del Retiro coinciden roca con textura detallada de apariencia fotográfica, muebles con formas sencillas y un personaje ilustrado más nítido/colorido. En el bosquete ya hay árboles, hierba, plantas y volumen; la mejora pendiente se centra en masas legibles, agrupación, contraste y transiciones, no en volver a crear vegetación. En Cena persisten superficies muy regulares y muebles esquemáticos en las evidencias fechadas.

Se ha avanzado en cámara, geometría, clima, profundidad y funcionalidad. Esos avances se conservan. La siguiente inversión de arte debe demostrar una pequeña familia acabada, usada en conjunto y bajo la cámara real, antes de repetirla por varios escenarios. Más texturas, mayor resolución, más partículas o un filtro no garantizan esa unidad.

## 3. Mejoras literales comunes VA-01–VA-18

### VA-01 — Una familia visual común

**Evidencia:** Retiro/comedor del 29/10, Cena del 18/10 y conjunto de recursos de escena. **Tipo:** observado en estas muestras, no diagnóstico confirmado de todos los mapas.

**Mejorar:** preparar una muestra del mismo lugar con suelo/muro, mueble, vegetación, actor y luz juntos; definir contorno, contraste y escala aparente compartidos. **Conservar:** identidades de personajes y diseño del mapa. **Aceptar cuando:** las partes parecen pertenecer a la misma escena desde cámara de juego, sin cambiar el estilo de cada una de manera independiente. **Bloque:** VIS-2. **Referencias:** REF-02/07/08.

### VA-02 — Color y jerarquía por bioma

**Evidencia:** relleno relativamente gris de Cena y contraste actor/roca en comedor. Hay paleta Sylvania existente. **Tipo:** observado más sistema reutilizable.

**Mejorar:** ordenar color de suelo, arquitectura, vegetación, sombra y acentos; conservar colores propios bajo luz cálida/fría. **Conservar:** costa volcánica y referencias aprobadas del Retiro, calidez de Cena y frío del Espejo. **Aceptar cuando:** el grupo se identifica sin saturarlo artificialmente y las superficies conservan matices en día/noche. **Bloque:** VIS-2/4. **Referencias:** REF-01/02/07.

### VA-03 — Escala aparente del dibujo y detalle

**Evidencia:** mueble geométrico, roca muy texturada y personaje ilustrado del comedor. **Tipo:** observado.

**Mejorar:** calibrar textura/UV, tamaño de motivos, bordes y contraste a zoom medio y varios giros; usar detalle grande/medio/pequeño con jerarquía. **Conservar:** escala física de 1,5 m y dimensiones de objetos. **Aceptar cuando:** no conviven vetas gigantes, piedra ruidosa y caras de detalle incompatible; alejar no produce parpadeo dominante. **Bloque:** VIS-2/3. **Referencias:** REF-02/07, REF-09 como estudio secundario.

### VA-04 — Suelo menos repetido y con zonas tranquilas

**Evidencia:** adoquín extenso de Cena; repetición visible en pavimentos y bases de las muestras. **Tipo:** observado en muestras.

**Mejorar:** variantes compatibles y manchas agrupadas por uso/material; reservar superficies calmadas junto a caminos y actores. **Conservar:** celdas, apoyos, trazados y grid configurable. **Aceptar cuando:** el terreno se lee como lugar continuo, sin baldosas de textura dominantes ni ruido en toda la pantalla. **Bloque:** VIS-3. **Referencias:** REF-02/07/09.

### VA-05 — Materiales de arquitectura con identidad

**Evidencia:** muros/cubierta sencillos de Cena y roca de apariencia fotográfica en Retiro. **Tipo:** observado; no pide retirar la piedra construida.

**Mejorar:** adecuar piedra, revoco, madera, teja y tela a una misma familia; usar relieve contenido y silueta donde se note. PBR puede iluminar materiales estilizados; no es una orden de sustituir el motor. **Conservar:** mallas, plantas, alturas y estructuras aprobadas. **Aceptar cuando:** cada material se reconoce sin foto-textura discordante o volumen exagerado. **Bloque:** VIS-3. **Referencias:** REF-02/07; REF-06 como contraste pendiente de estudio visual.

### VA-06 — Muebles construidos y usados

**Evidencia:** sillas en L/bloque de Cena y mesas/bancos simples de comedor. **Tipo:** observado.

**Mejorar:** espesor, patas, uniones, huecos y respaldos de piezas existentes, más pequeños conjuntos cotidianos legibles. **Conservar:** posiciones/huellas vigentes, cantidad y función; también recolocaciones ya autorizadas del Retiro. **Aceptar cuando:** se identifica construcción y uso desde varios giros, sin tapar al ocupante o acumular objetos arbitrarios. **Bloque:** VIS-3. **Referencias:** REF-02/08.

### VA-07 — Contactos entre elementos

**Evidencia:** cortes de parches y encuentros de suelo/muebles en las muestras; parte de los contactos ya se ha refinado. **Tipo:** observado y por revalidar según zona.

**Mejorar:** juntas, desgaste, apoyos, borde de camino, pie de muro y origen de plantas. **Conservar:** altura y física; no esconder errores subiendo el suelo o enterrando patas. **Aceptar cuando:** las piezas dejan de parecer colocadas de forma independiente, sin barreras visuales falsas o solapamiento que parpadea. **Bloque:** VIS-3/4. **Referencias:** REF-02/07/08.

### VA-08 — Césped y sotobosque agrupados

**Evidencia:** bosquete reciente con muchas briznas pequeñas; la vegetación ya existe. **Tipo:** observado.

**Mejorar:** alternar fondo tranquilo, grupos de briznas, plantas reconocibles y bordes irregulares coherentes con roca/camino; conservar textura y recursos útiles. **Conservar:** bioma mediterráneo elegido, claro y corredores actuales. **Aceptar cuando:** el suelo tiene masas legibles y transiciones naturales sin exigir dibujar más briznas en cada centímetro. **Bloque:** VIS-3. **Referencias:** REF-02/07; REF-05/12 como estudio secundario.

### VA-09 — Árboles por masas, ramas y huecos

**Evidencia:** Cena tiene copas básicas; el Retiro ya incorporó pinos/olivos y hojas con volumen. **Tipo:** observado/documentado, distinto estado por escena.

**Mejorar:** afinar siluetas, masa de copa, huecos, tonos y unión con tronco; reducir lectura de hojas aisladas o bolas donde persista. **Conservar:** especies, envolventes y posiciones vigentes, incluyendo ampliaciones aprobadas. **Aceptar cuando:** árboles cercanos/lejanos se leen como vegetación coherente y no invaden rutas; oclusión sigue funcionando. **Bloque:** VIS-3. **Referencias:** REF-02/07.

### VA-10 — Personajes integrados en la luz

**Evidencia:** contraste en las muestras y ruta opcional de luz local conectada a Espejo en `apps/web/world.ts`. **Tipo:** observado/código; revalidar por renderer antes de ampliar.

**Mejorar:** usar la integración existente donde corresponda para responder a fuentes locales, relleno y estado sin perder identidad o caras. **Conservar:** atlas recientes, animaciones, pivotes y transparencia; no reemplazar dibujos automáticamente. **Aceptar cuando:** actor, silla y suelo comparten ambiente y contacto sin volver al personaje negro o luminoso por sí mismo. **Bloque:** VIS-4. **Referencias:** REF-01/07; REF-06 como contraste técnico.

### VA-11 — Fuentes y sombras que expliquen la forma

**Evidencia:** las escenas ya tienen luces/sombras; falta una comparación uniforme de su lectura artística. **Tipo:** verificación requerida, no ausencia de iluminación.

**Mejorar:** dirección natural, relleno, alcance de fuentes, sombras proyectadas y de contacto; revisar emisivos apagados y puertas. **Conservar:** reloj, clima, estados DM y ubicación de luces canónicas. **Aceptar cuando:** se reconoce el origen de luz sin atraviesos de muros, superficies lavadas o ausencia de contacto; proyector conserva lectura. **Bloque:** VIS-2/4. **Referencias:** REF-01/02/07.

### VA-12 — Contraste y profundidad sin recurrir a filtros

**Evidencia:** composiciones de Cena/Espejo muestran grandes zonas de valor parecido; no todos sus focos están auditados. **Tipo:** observado en encuadres concretos.

**Mejorar:** separar planos con luz, tono, material y silueta antes de blur/bloom. **Conservar:** oscuridad/frío narrativos y detalle táctico. **Aceptar cuando:** se identifican grupo y respaldo con los posprocesos opcionales apagados, sin tintar toda la pantalla o quemar ventanas. **Bloque:** VIS-4. **Referencias:** REF-01/07.

### VA-13 — Primer plano, respaldo y distancia

**Evidencia:** hay capas y geometría actuales; en llegada de Cena y Espejo todavía dominan planos extensos en las fotos base. **Tipo:** observado en muestras, revalidar el encuadre actual.

**Mejorar:** composición de las capas existentes y primeros planos parciales, continuidad del entorno y contraste de distancia. **Conservar:** planta y geografía; no añadir edificios o montañas ajenos para llenar la foto. **Aceptar cuando:** el mundo se siente delante/alrededor/detrás del grupo en varios puntos y giros, con recursos anclados al mundo. **Bloque:** VIS-2/4. **Referencias:** REF-01/02/07; REF-04 como estudio secundario.

### VA-14 — Cámara y recorte al servicio de jugar

**Evidencia:** recorte amplio del interior de Cena; el Retiro y Espejo ya tienen refinamientos posteriores. **Tipo:** observado históricamente y por revalidar.

**Mejorar:** recortar solo lo que impida ver personaje/objetivo, conservando marcos, grosor y estructura; verificar escala de personaje/zoom y límites al seguir. **Conservar:** orientación estable de movimiento, selección, preferencias y perfil de cámara vigente. **Aceptar cuando:** recorrer y girar conserva cuerpo/acción visibles sin borrar la identidad del edificio o descubrir vacío. **Bloque:** VIS-4. **Referencias:** REF-01/03; REF-04/10 como estudio secundario.

### VA-15 — Costa y agua dentro de la familia visual

**Evidencia:** mar/terreno en bosquete; documentos de costa, reflejos y espuma ya implementados. **Tipo:** observación parcial, no auditoría completa de Pecio/Retiro.

**Mejorar:** coherencia de color/escala entre roca, tierra, vegetación y agua; contactos, profundidad y espuma localizada. **Conservar:** océano nativo, oleaje, barca, física, rutas y contactos ya hechos. **Aceptar cuando:** la orilla no parece un recorte de materiales distintos y los efectos no ocultan apoyos/puertos; comprobar movimiento real. **Bloque:** VIS-3/4. **Referencias:** REF-07; REF-05 como estudio secundario.

### VA-16 — Ambiente, estados y sonido contenidos

**Evidencia:** Espejo ya tiene bruma/audio y salida; Cena tiene estados y catálogo. **Tipo:** sistema existente más verificación artística pendiente.

**Mejorar:** posición y profundidad de humo/partículas, viento leve y transiciones de luz/audio; comparar con efectos apagados. **Conservar:** finales, reloj, clima, movimiento reducido, salida de audio y voz del DM. **Aceptar cuando:** el efecto tiene fuente y función, se revierte correctamente y no se duplica entre clientes; haces/DoF/bloom pueden omitirse con motivo. **Bloque:** VIS-5. **Referencias:** REF-01/02/07/08.

### VA-17 — Acabado dentro de la aplicación y coste controlado

**Evidencia:** modo integrado y visor usan perfiles distintos; existen optimizaciones locales y deuda de rendimiento documentada. **Tipo:** código/documentos, sin nueva sesión de rendimiento.

**Mejorar:** probar el resultado real en DM/jugador/proyector y respetar perfiles; compartir atlas/materiales y liberar recursos. **Conservar:** calidad principal y orden local de Q1. **Aceptar cuando:** la mejora se ve en la mesa integrada y el perfil bajo conserva composición/luz; presentar medidas pertinentes y pendientes sin inventar FPS ni repetir certificaciones prolongadas fuera de su fase. **Bloque:** VIS-1/6. **Referencias:** criterios propios del VTT, no rendimiento atribuido a juegos comerciales.

### VA-18 — Evidencia de calidad, no cierre por existencia

**Evidencia:** abundan entregas técnicamente verificadas con aceptación artística/física aún pendiente. **Tipo:** documental.

**Mejorar:** antes/después equivalente, muestra con/sin efectos y vídeo breve de recorrido, más estado de cada VA/Cxx y fuente de recursos. **Conservar:** datos reales y decisiones del usuario; no generar un después ficticio o reetiquetar capturas antiguas. **Aceptar cuando:** se ve qué mejoró y puede arrancarse una candidata funcional; pruebas automáticas, revisión visual, aprobación y hardware quedan separadas. **Bloque:** VIS-6.

## 4. Lo que no acredita esta entrega

No son 18 fallos globales reproducidos, ni 12 juegos inspeccionados de principio a fin. No hay assets nuevos del juego, nueva integración, sesión física, benchmark, cambio de versión o aprobación artística. Se han buscado fuentes primarias, examinado referencias seleccionadas y evidencias nuestras, definido criterios y conectado su ejecución al roadmap. La siguiente acción se toma del alcance local autorizado y del [roadmap visual](../VISUAL_ROADMAP.md).
