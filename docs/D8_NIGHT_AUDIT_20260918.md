# Auditoría D8 Night — 18 de septiembre de 2026

Estado: diagnóstico y propuesta, NO correcciones de producto. Encargo del usuario: Astra audita y define la ruta; Sol implementa por fases. Ruta ejecutable: [D8_NIGHT_SOL_ROADMAP.md](D8_NIGHT_SOL_ROADMAP.md).

## Dictamen

Conservar la arquitectura web actual y consolidar su motor compartido. D8 Night tiene un esqueleto jugable sustancial, pero no está acreditada como una partida completa y fiable. El mayor riesgo no es la calidad del mapa: son las entradas de dados, la identidad de quien responde, la conservación del estado y la fidelidad de las reglas y del módulo.

No recomiendo reescribir en otro motor, añadir otro sistema de combate/guardado ni empezar ahora una conversión general a 3D. Babylon ya está instalado y existe una prueba aislada; el tablero jugable sigue utilizando Pixi. Mantener la dirección HD-2D aprobada, separada del cierre funcional de D8.

Reutilización significa que combate, condiciones, inventario, permisos, navegación, guardado, sincronización y presentación sean comunes. Los datos y excepciones narrativas de D8 NO deben imponerse a Stormwreck.

## Qué se verificó y qué no

- Inspección de GameState/GameServer, protocolo, navegación, persistencia, clientes jugador/DM/proyector, pack privado/público, lanzadores, documentación y pruebas.
- Vitest ejecutado: **50/50**, 6 archivos. Comprobación de tipos de cliente y servidor: **PASS**. Estos resultados no prueban usabilidad ni cobertura completa de D&D.
- Reproductor adicional: `scripts/audit-d8-night-20260918.ts`; 12 observaciones ejecutadas sobre instancias independientes en memoria. Compilación aislada y ejecución terminaron con código 0. Ese cero significa «diagnóstico ejecutado», NO «producto correcto».
- PDF de aventura: inspección visual de las páginas físicas 4, 5, 7–11 y varios mapas. Aoife: revisadas las tres páginas renderizadas de Silverfarben Hotel. María: revisadas las imágenes locales de las dos páginas de nivel 1; el PDF en la antigua ruta de Downloads ya no existe. No se inventa una nueva fuente.
- Sprite v4 de la aldeana: inspección de imagen y canal alpha. Tiene 1.049.394 píxeles transparentes y 523.470 opacos; la banda exterior izquierda examinada es totalmente transparente. El damero visible en una previsualización de RGB no acredita un fondo opaco en el juego.
- No se arrancó/reinició la mesa real, no se alteraron saves, no se generó arte, no se modificó código de producción. No se hicieron en esta auditoría recorrido de navegador, móvil físico, LAN, proyector ni nuevas integraciones de procesos. Son puertas de salida obligatorias para Sol.
- El repositorio aparece mayoritariamente sin seguimiento Git. No hay una base de diferencias fiable para atribuir todos los cambios a una sola tarea. Conservar lo existente y coordinar cualquier trabajo simultáneo.

## Lo que ya existe: revisar, no reconstruir

Hay selección de campaña e independencia de carpetas de guardado; entrada DM sin contraseña configurada; elección y posesión de PJ; seis escenas D8; María y Aoife; selección/movimiento DM; turnos, iniciativa, gasto de movimiento, PG y criaturas derrotadas; declaración de ataques y peticiones de d20/daño/salvación; ataques múltiples, recargas y recursos iniciales de Aoife; revelado de rosas/espejo; gráficos de proyectiles; hoja móvil; controles de estados; acordeones DM y panel exploración; guardado versionado con checksum, escritura atómica, backup e historial; restauración mediante reemplazo y snapshot; deshacer parcial; proyector sin grid; audio y controles adicionales de DM móvil.

Existencia no equivale a cumplimiento. Por ejemplo, el test de arco prueba métodos del servidor: no pulsa un botón ni escribe un dado en un navegador.

## Hallazgos reproducidos

Todos se reproducen con el script de auditoría. Los identificadores son estables para convertirlos en tests de regresión del comportamiento correcto.

| ID | Resultado real | Impacto / destino |
|---|---|---|
| A01 | María declara daga y tanto María como Aoife reciben el prompt cuyo actor es María | Confusión y permiso por rol, no por personaje. F1 |
| A02 | Ataque y daño conservan el mismo promptId; tras un impacto se acepta otro valor con ese ID como daño | El servidor tampoco contrasta tipo de comando con etapa pendiente. Reenvíos o peticiones de otra etapa pueden resolver algo distinto. F1 |
| A03 | María inconsciente puede declarar daga: `ROLL_REQUIRED` | Estado informativo sin prohibición real de actuar. F3 |
| A04 | Atacante envenenada + objetivo restringido produce desventaja | No cancela ventaja/desventaja. F3 |
| A05 | Al terminar combate desaparece envenenada; save tiene combat=null y ninguna condición persistente de María | Pérdida de consecuencias. F2 |
| A06 | Se permite avanzar turno con daño pendiente; pending desaparece y actionUsed sigue false | Resolución incompleta y costes incoherentes. F1 |
| A07 | Se acepta 0 como suma de un d4 de daño | Validación solo del máximo; un campo vacío se convierte en 0 en el cliente. F1 |
| A08 | Reflejo antes: María, token rogue, máximo6 y tres ataques. Tras restore: Reflejo de hielo, token reflection, máximo7 y ataques vacíos | Save no conserva la identidad ni el perfil copiado. F2/F4 |
| A09 | Volver a preparar un reflejo con 1 PG lo cura a6 | Revelar/preparar no es idempotente. F4 |
| A10 | Reflejo de Aoife con Misil mágico devuelve `RESOURCE_DEPLETED` | Ataques copiados, recursos no copiados ni definidos para criaturas. F4 |
| A11 | Save con 99 espacios actuales y máximo2 se restaura sin rechazo | Falta validación semántica del estado. F2 |
| A12 | Evento público de fallo de Anteros incluye +5 y 1d8+2 | Se ocultan estadísticas en DTO, pero se filtran en textos de eventos. F1 |

El script invoca métodos del motor: A02 demuestra el hueco en la API interna, y la lectura de `handlePlayerCombat` confirma que el transporte no valida la etapa antes de llamarla. Sol debe demostrar el cierre también con dos clientes Socket.IO.

## Hallazgos por inspección del código

### I01. Formulario inestable: causa probable del «no pasa nada»

`apps/web/player.ts:renderTargetMenu` ejecuta `replaceChildren()` y recrea select, input y botones. Se llama con cada world:snapshot; `engine/server/game.ts` emite snapshots a 20 Hz. Se pierden selección, foco y valor escrito. Es un defecto del camino de renderizado, aunque falta repetirlo en navegador en esta auditoría. No basta añadir otro botón o ralentizar todo el mundo.

Guardar borradores de UI por resolución/etapa, actualizar controles existentes y separar frecuencia del mundo de frecuencia del formulario. Auditar también los reconstruidos de DM.

### I02. Propiedad, repeticiones y resolución

`combatPromptFor('player')` filtra por rol; `submitCombatRoll` no recibe identidad del PJ ni etapa esperada. `handlePlayerCombat` comprueba que el socket posee un personaje, no que posea el actor de la tirada. No utiliza el registro de comandos procesados del DM. También falta una política explícita para cancelar o cambiar escena/turno durante una resolución.

El jugador introduce su dado natural o suma de daño, NO elige la CA del enemigo ni una «CD de ataque». El servidor compara contra la CA privada. Una salvación y un impacto automático siguen flujos distintos; no todas las acciones piden d20 y daño.

### I03. Condiciones y datos incompletos

Las condiciones pertenecen a `CombatState`; `emptyCombat()` las elimina. La fuente existe parcialmente, pero no llega completa a la hoja móvil ni incluye duración general. `apresada` y `restringida` representan prácticamente el mismo estado; las raíces visuales solo reaccionan a una de las dos. No crear un tercer sistema.

La hoja tiene textos fijos: CD11 para liberarse y Valiente para todos. No obtiene esas ventajas del personaje/fuente. Los puntos visuales se limitan a tres. Derribada/inconsciente dibujan una elipse pero el cuerpo no se tumba, y sigue la oscilación del sprite. El símbolo de miedo puede ocupar la franja de puntos.

El reglamento exige una evaluación conjunta de condiciones, incapacidad y fuentes. No basta que la etiqueta diga «no puedes actuar». Faltan tratamiento completo de resistencia/inmunidad, concentración, muerte/estabilización y movimiento alterado. Oculta con alpha reducido NO es percepción individual segura.

### I04. Guardado, autocarga y deshacer

- `SaveStore.open` prueba active y backup; un backup válido conduce a recuperación manual. No recorre los diez históricos para autocargar. Si solo quedan históricos, puede declarar una partida nueva.
- Si el JSON/checksum es válido pero las referencias son incompatibles, `PersistenceCoordinator.open` tampoco busca el siguiente candidato semánticamente válido.
- El historial guarda versiones anteriores de active y retiene diez, además de active y backup. La lista no incluye la versión actual: no son diez puntos de restauración únicos incluyendo el último, como se pidió.
- Autosaves por movimiento y audio pueden desplazar rápidamente hitos de combate/escena. Hace falta política de retención, no una segunda persistencia.
- `captureDurable` conserva bastante mundo, pero pierde perfil dinámico/mimic y condiciones fuera de combate. Máximos y definiciones dependen de seeds actuales. Distinguir definición versionada de cambios de runtime.
- `gameplayUndo` registra acciones DM, no las del jugador. Reponer snapshots antiguos puede deshacer cambios ajenos posteriores. `restoreDurable` reinicia stateRevision y sceneEpoch; el undo los incrementa desde esa base, sin monotonicidad. `installState` no vacía gameplayUndo: riesgo de deshacer a una línea temporal anterior tras cargar o iniciar otra partida.
- El restore ya emite snapshot completo, algo a conservar. Libera sesiones y pide volver a elegir; falta una recuperación segura del personaje previo cuando sigue disponible, sin guardar credenciales en el save ni robar una posesión vigente.

### I05. Navegación y reglas compartidas

Alcance se mide sobre grid, pero el ataque no comprueba paredes/línea de efecto/cobertura. Movimiento usa coste de una casilla; no implementa el terreno difícil del espejo ni levantarse/arrastrarse. La hostilidad se infiere de player vs no-player: un PNJ aliado puede causar desventaja como si fuera enemigo.

Furtivo depende de `attackerId === 'maria'`, espinas de `id.startsWith('rose-')`, progreso de flags D8 dentro de GameState y objetivos D8 dentro de `dm.ts`. Esa es la principal deuda de reutilización. Sustituir nombres especiales por rasgos, relaciones y datos de campaña tipados, sin construir un lenguaje genérico de scripting ahora.

### I06. Lanzador Windows

`scripts/close-table-on-port.mjs` vincula el PID con lock/puerto antes de cerrar: preservar esa cautela. Pero su comentario promete flush con SIGTERM. En Windows el envío de SIGTERM mediante process.kill termina incondicionalmente el proceso; no garantiza ejecutar el manejador de guardado. Necesita petición local autenticada de guardar/cerrar y confirmación de cierre, no matar todos los procesos del puerto. No se provocó ese cierre en la mesa real. [Documentación oficial Node: señales](https://nodejs.org/api/process.html#signal-events).

### I07. Consolas y visuales

Los acordeones y selección compacta ya existen. No hay que sustituirlos por otra consola; hay que conservar aperturas/borradores y comprobar su usabilidad. Exploración muestra siempre «Progreso D8 Night», incluso para otra campaña. Café dice «buscar pistas», no el objetivo de obtener el vino. No hay interactuables D8 modelados: las escenas tienen props vacíos y el progreso son checks manuales.

La transparencia real del asset de aldeana v4 queda acreditada, NO el resultado final en navegador ni el resto del catálogo. Verificar URL efectiva, caché, build servido, alpha y contornos antes de producir v5. La barra de PG ya se posiciona sobre el sprite; falta demostrar separación estable con todos los estados/zoom y no darlo por roto solo por capturas históricas.

Mapas con máscaras de movimiento manuales y sprites ordenados por posición no equivalen a escenarios 3D con oclusión geométrica. Grid del proyector ya desactivado; conservarlo. Audio usa recursos provisionales de tormenta/barco: la selección ambiental por campaña debe ser datos, no ramas D8 en el reproductor.

## Contraste con fuentes de campaña y fichas

Fuente privada D8: [adventure.pdf](../campaigns/one-shot/source/adventure.pdf), páginas físicas 4–11 (el número impreso puede diferir). El pack es adaptación privada; no publicar el PDF ni su contenido en el bundle del jugador.

| Elemento | Fuente revisada | Implementación / corrección a encargar |
|---|---|---|
| Rosas | Revelado de 1d6; ataque de espina daño fijo1; Enredar y liberación CD11 | Solo dos seeds, ataque1d4+1 y escapeDc10. Los tests actuales afianzan CD10 equivocada. Corregir datos y pruebas; selección del número por DM, no balance automático |
| Espinas | Efecto al tocar la rosa | Código aplica daño por cualquier ataque, incluso proyectil, y lo condiciona al PG posterior. Definir disparador de contacto, no prefijo de ID |
| Anteros | Flechas radiantes recarga6; inmunidad a envenenamiento y resistencia mágica; vuelo | Código recarga4–6 y sin esos rasgos funcionales. No hace falta inventar vuelo3D para registrar/moderar su movimiento |
| Aldeanos | Perfil propio: 4PG, ataque sin armas y ataque adicional | PNJ sin perfil caen en10PG/ataque improvisado1d4 y no son combatientes habilitados por defecto |
| Reflejo | Copia estadísticas, 75%PG, no ataca primero, imita acciones; posible salida pacífica | Copia parcial, iniciativa restada1 no garantiza adyacencia con varios PJ; acciones libres y sin resolución pacífica persistente |
| Espejo | Hielo frágil, terreno difícil, caídas y alternativas sobre espejo/hielo | Grid genérico, sin zonas con consecuencias. No deducirlas automáticamente de colores de un mapa generado |
| Progreso/final | Cuatro objetivos y puntuación por decisiones; prevalece el final con más puntos | Siete booleanos, tres finales seleccionables a la vez, sin historial ni puntuaciones. Empates no definidos en la página revisada: intervención DM documentada |
| Inicio/reinicio | Excepción narrativa ante derrota/rechazo | No implementar un reinicio destructivo común a todas las campañas; debe ser efecto D8 con confirmación y checkpoint |

Aoife, fuente [Silverfarben Hotel.pdf](<C:/Users/User/Downloads/Silverfarben Hotel.pdf>): maga nivel1, especie/rasgos heredados. El PDF muestra7PG actuales/8máximos; el seed arranca8/8. El código añade armadura de cuero que no figura en su inventario, omite parte de habilidades/rasgos y condensa el trasfondo. La hoja presenta ataque sin armas que no está disponible entre acciones. Los conjuros conocidos no equivalen a preparados: registrar esa distinción sin inventar la elección. Misil mágico está restringido a un solo objetivo y otros conjuros solo son texto; registrar resolución manual explícita o implementar sus consecuencias, no fingir soporte completo.

María: imágenes conservadas `tmp/pdfs/maria-1.png` y `maria-2.png`; lectura secundaria hasta recuperar el PDF. El nivel1 sí muestra9PG, CA14, velocidad7,5m y ataques base actuales. Falta alcance largo18m de la daga arrojada, características/habilidades/salvaciones estructuradas, Pericia/Jerga de ladrones, parte de mochila y15po, y el trasfondo completo. No habilitar Acción Astuta de nivel2 ni rasgos de nivel3 porque aparezcan en la segunda página.

Ambas fichas contienen material previo a2024. Mantener los valores aportados y etiquetar procedencia/compatibilidad; no convertir especie, clase o trasfondo silenciosamente. Aplicar reglas generales2024 con excepciones de ficha/módulo documentadas. Los PG anotados en una ficha no deben sobrescribir una partida ya guardada.

## Fuentes comunes verificadas

Los ataques comparan tirada con CA; algunas acciones exigen salvación y otras no tirada de ataque. Ventaja y desventaja simultáneas se neutralizan. No todas las acciones ni todos los efectos usan el mismo formulario. [Reglas básicas2024: jugar](https://www.dndbeyond.com/sources/dnd/br-2024/playing-the-game).

Las condiciones tienen consecuencias mecánicas y fuentes: por ejemplo, agarrada altera ataques contra terceros y asustada depende de la fuente. Ocultación no se reduce a transparencia visual. [Glosario oficial2024](https://www.dndbeyond.com/sources/dnd/br-2024/rules-glossary).

Para datos reutilizables, estudiar el [SRD5.2.1 oficial](https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf) y sus atribuciones. No asumir que todo el Manual del Jugador, el módulo o cualquier implementación de terceros sean redistribuibles. No se incorporó dependencia nueva en esta auditoría.

## Cómo reproducir las observaciones sin tocar la mesa

Desde la raíz, usando Node24 instalado:

```powershell
& 'C:\Program Files\nodejs\node.exe' node_modules/typescript/bin/tsc scripts/audit-d8-night-20260918.ts --target ES2022 --module NodeNext --moduleResolution NodeNext --skipLibCheck --esModuleInterop --strict --rootDir . --outDir tmp/d8-audit-20260918
& 'C:\Program Files\nodejs\node.exe' tmp/d8-audit-20260918/scripts/audit-d8-night-20260918.js
```

El intento con tsx falló por `uv_os_get_passwd/ENOMEM` en el entorno restringido; la compilación aislada evita esa limitación sin cambiar dependencias ni sobrescribir dist. La primera compilación del diagnóstico señaló acceso a un método privado; se corrigió usando publicSnapshot y se repitió con éxito.

## Límites y pendientes de validación

No hay base para asignar un porcentaje global de finalización ni una fecha fiable solo con50tests. Faltan pruebas reales de entrada lenta de dados, dos jugadores, reconexión, conflictos de posesión, paredes, todas las escenas, restauración/rotación/corrupción y cierre Windows. Los demás sprites, balance para dos PJ, audio físico, visibilidad individual y compatibilidad exacta de todos los rasgos requieren comprobación. La ruta siguiente separa esas tareas de los fallos ya demostrados.
