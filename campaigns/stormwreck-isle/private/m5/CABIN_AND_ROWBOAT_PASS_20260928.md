# Pase M5 · camarotes, barca y luz portátil

## Corrección tras capturas del usuario · 28/09/2026

- El icono vertical de la antorcha apagada se sustituye por una antorcha corta tumbada sobre la cubierta, con madera, ligaduras y cabeza ennegrecida. Se coloca a un lado y por debajo de la ficha, sin llama ni emisión de luz.
- La celda marítima del bote sigue junto al punto de embarque por compatibilidad con movimiento, pasajeros y partidas guardadas. Solo su malla visual se aparta del casco del pecio hasta que la longitud y anchura completas del bote no lo atraviesan. El suelo visible de la bañera incorpora tablas opacas ajustadas a la forma del casco.
- Los techos independientes de C4–C7 alcanzan los ejes de sus mamparos, ya sin el hueco de media casilla; un marco de madera cierra visualmente cada cubierta. Al entrar, techo y marco de esa estancia se retiran juntos, sin revelar las demás.
- El jugador recibe una interacción contextual en las puertas adyacentes. C4 requiere primero retirar el listón y después abrir; las demás pueden abrirse y cerrarse. El servidor comprueba proximidad, planta, combate y ocupación al cerrar, y guarda el mismo estado de puerta compartido con DM/proyector.
- Comprobación: 198/198 pruebas de la suite y tipos cliente/servidor pasan; build web pasa. En navegador aislado, el botón junto a C6 cambió de «Abrir» a «Cerrar» tras pulsarlo y el techo cerrado se inspeccionó desde fuera. Esta prueba no sustituye la validación visual del usuario ni la prueba física M7.

28/09/2026. El capítulo 3 del PDF se usa como fuente descriptiva del pecio, no como plantilla de arte. Las referencias visuales locales siguen definiendo perspectiva y acabado. Este pase no cambia casillas, rutas, alturas ni autorizaciones del servidor.

## Contraste por camarote

| Zona | Rasgos descritos en la aventura | Representación y límite |
|---|---|---|
| C4, camarote del capitán | Dos zombis, estante derrumbado con libros y pergaminos, escritorio pulido de tres patas con brújula decorativa, cama hundida junto al agujero; herramientas, daga y monedas. | El escritorio tiene tres patas; la habitación conserva mobiliario y botín independientes. Los zombis y objetos descubiertos solo se ven al entrar, además de las reglas existentes del encuentro y del botín. |
| C5, cocina | Esqueleto sin cabeza y cangrejos inofensivos entre restos de cocina. | Cangrejos decorativos no seleccionables; se mantiene el esqueleto y el paso jugable. |
| C6, camarote de tripulación | Seis literas, efectos personales dispersos, retrato desvaído de Aleitha (marinera de pelo oscuro) y Brastos (mercader rubio), inscripción «Aleitha y Brastos: juntos para siempre»; tablón/trampa y escondite. | Retrato pintado como plano independiente, placa con la inscripción exacta generada en código, pertenencias; la trampa y el tesoro permanecen en su lógica persistente y no se revelan por el arte. |
| C7, comedor | Mesa larga, sillas podridas, vajilla y cristalería rotas. | Fragmentos decorativos y mobiliario existente, sin inventar encuentros, pistas o botín. |

Las cuatro puertas giran visualmente para coincidir con el eje norte-sur del mamparo. El volumen de los tabiques se estrecha y solapa ligeramente en las juntas; listones horizontales y materiales de tablón húmedo sustituyen la lectura de bloques de piedra. Cada estancia posee su propio techo de ocultación: desde fuera no se ven sus muebles ni personajes. Al entrar se oculta solo el techo de esa habitación. Una capa de oscuridad interior permanece si nadie en ella lleva una fuente encendida. El mapa lógico único C1–C9/cofa no se divide.

## Barca y luz

La barca visible es una malla Babylon abierta de casco afilado, bordas, cuadernas, bancos y dos remos. Sigue la posición, orientación y oscilación del bote gobernado por el servidor; no tiene nueva colisión ni altera el embarque/nado. Reemplaza al icono plano solo mientras esta representación 3D esté disponible. La revisión en navegador encontró que el actor de agua no llegaba a snapshots de C1/C2/C3/cofa: ahora se incluye solo para esas vistas exteriores, nunca en C8/C9. Una prueba del runtime vigila ambos casos.

Una `Antorcha` o `Antorchas ×N` no emite luz al recogerse. La mochila permite pasar una unidad a `Antorcha encendida` y apagarla; el DM arbitra medios de ignición y duración. También se reconoce una linterna explícitamente encendida o luz mágica; el estado se transmite como un radio público y produce una luz cálida junto al personaje. No se añaden llamas permanentes al barco. La luz solar exterior y la oscuridad de las plantas inferiores son independientes.

## Evidencia y pendientes

- 49/49 pruebas dirigidas: cabinas, puertas/props, barca, luz y runtime C1–C9; repetida la regresión del barco tras corregir el snapshot. Tipos cliente/servidor y builds web/servidor pasan.
- Navegador en instancia aislada `127.0.0.1:4470`: los techos impiden ver los camarotes desde cubierta; mochila comprobada con antorcha apagada, encendida y de nuevo apagada. La partida real no se modificó.
- No se ha certificado con una partida física la entrada a cada habitación, los ángulos de todos los marcos, ni el FPS en móvil/proyector. M5 permanece candidato visual, no aprobado.
- Continúan las seis entregas del plan: silueta del casco/proa y zonas de arrecife, cofa, resto de interiores, iluminación global y evaluación con el usuario. Ninguna pieza visual puede alterar silenciosamente el greybox.

Recurso nuevo `public/art/ship/c6-aleitha-brastos-portrait-art10.png`: generado con ImageGen integrada, modo `stylized-concept`; sin imagen de referencia binaria, sin texto incrustado. Prompt final literal:

> Use case: stylized-concept. Asset type: small in-world painted portrait texture for a Babylon.js 2.5D dark-fantasy shipwreck cabin, not a full scene. Primary request: an old painted portrait of a young couple smiling and embracing: Aleitha, a dark-haired woman wearing a sailor's uniform, and Brastos, a blond man in elegant merchant clothing. Style/medium: richly hand-painted fantasy illustration with believable oil-painted faces and fabric, aged by about forty years of salt moisture; faded pigment, minor water damage and patina, still clearly readable as a loving couple. Composition: centered waist-up couple, flat frontal framed-portrait view, portrait fills the square image with no wall or background room. Lighting/mood: sombre maritime mood, muted umber, olive, teal, ivory. Constraints: exactly two people, no modern clothing, no symbols, no writing or lettering (the exact inscription will be added separately in code), no watermark.
