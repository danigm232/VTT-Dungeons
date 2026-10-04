# Combate compartido: D8 Night y Stormwreck

Actualizado el 4 de octubre de 2026. Esta revisión distingue los controles corregidos de las reglas y fichas que todavía no están completas.

## Alcance

Motor común, consola DM de escritorio y pantalla del jugador, tanto en combate como en exploración. No se han reiniciado ni modificado las partidas del puerto 3000. D8 Night no tiene un motor de combate separado. El panel DM móvil sigue siendo principalmente un mando de ambiente/audio; las decisiones de combate se gestionan en la consola DM.

## Correcciones de esta entrega

- Cámara táctica 3D/2D: encuadre de los participantes visibles y sus destinos de movimiento, en vez de alejar siempre hasta abarcar un mapa enorme. Deja espacio para iniciativa y controles. El botón Mapa completo permite consultar todo el escenario y Ver combate vuelve al encuadre útil. Durante combate no se aplica el zoom ni el seguimiento de exploración; sus preferencias se conservan para después. No se incluyen enemigos ocultos en los límites de cámara.
- La proyección usa el lienzo completo: se corrigió la desaparición del suelo de D8 al reservar espacio para la interfaz. Suelo, fichas, marcas y selección comparten proyección. Geometría y proyección verificadas en perspectiva y ortográfica, ocho orientaciones, tres inclinaciones y cuatro proporciones de pantalla.
- Recursos del turno siempre visibles, también en el tamaño compacto: movimiento restante/máximo, acción, adicional cuando hay una opción que la permite, reacción y efectos activos. La consola DM diferencia velocidad base de movimiento disponible; no presenta una acción adicional inexistente como lista.
- Descripción común DM/jugador: tirada contra CA, salvación contra CD y atributo, daño real, coste, alcance normal/largo y concentración. Misil mágico indica impacto automático y sus tres proyectiles. Nube de niebla y otros efectos guiados no muestran daño ni bonificadores de ataque ficticios; el detalle de la selección puede leerse sin pasar el ratón.
- Rueda del jugador por categorías y páginas, con iconos, detalles al mantener pulsado 650 ms, navegación atrás/cierre y opciones no disponibles desactivadas. Los refrescos equivalentes conservan los elementos para no interrumpir una pulsación larga.
- Barra táctica persistente, retratos en iniciativa, recursos del turno, Huir y Fin de turno. La selección de arma/conjuro enseña alcance antes de elegir objetivo, aunque antes hubiera otra ficha seleccionada.
- Bandeja de selección cancelable y Escape para desarmar acciones locales. Las tiradas e iniciativa permanecen visibles aunque se cierre la rueda. Una casilla de área elegida por el DM se puede cancelar con Escape antes de confirmar su destino.
- Consola DM: orden real confirmado, retratos, movimiento en metros, selección de punto para áreas, retirada individual confirmada, cancelación de preparación y confirmación de fin del combate.
- Cancelación autoritativa: sólo el dueño o DM puede cancelar una selección antes de la primera tirada. No consume recursos ni revela al actor oculto. Después del ataque/salvación/primer proyectil confirmado no se puede borrar el daño o recuperar recursos. Deshacer del DM queda disponible para errores de mesa.
- No se puede finalizar combate, retirar a un participante ni pasar turno mientras haya una resolución pendiente. Finalizar no cura ni repone recursos ni elimina condiciones/concentración duraderas.
- Huir declara una intención, no teletransporta ni quita la ficha de iniciativa. Se usan movimiento, Correr o Destrabarse con sus costes; el DM confirma escape, rendición o cambio a persecución.
- PJ vivos a 0 PG participan para las salvaciones de muerte. La retirada conserva al siguiente actor correcto, elimina referencias tácticas y cierra el encuentro si queda menos de dos participantes.
- Secuencias: el recurso y la acción se gastan al resolver el primer ataque/proyectil; los posteriores continúan aunque ya quede cero espacios. No se puede recuperar un espacio abandonando la secuencia. Munición por ataque y recurso de conjuro una sola vez. La interfaz permite continuar la secuencia.
- El reflejo utiliza sus propios espacios copiados, no busca recursos en el PJ. La mochila del jugador no es un requisito para ataques de PNJ/reflejo: su munición física queda a criterio del DM; no se roba munición al personaje copiado.
- Un ataque de arma preparado usa una reacción y no obtiene Ataque Extra. Reacciones rechazadas antes de confirmar iniciativa o por actores ajenos al combate.
- Entradas de dado/iniciativa vacías no se convierten en cero. El DM conserva sus campos ante refrescos equivalentes.

## Reglas y decisiones de mesa

Referencia: [reglas básicas 2024, Playing the Game](https://www.dndbeyond.com/sources/dnd/br-2024/playing-the-game) y [Rules Glossary](https://www.dndbeyond.com/sources/dnd/br-2024/rules-glossary). La inspiración de Baldur’s Gate es visual y de flujo, no sustituye las reglas de 2024.

Cada implicado tira físicamente iniciativa; el jugador registra la suya, el DM la de PNJ y decide los empates antes de empezar. La sorpresa implica desventaja en iniciativa. El turno conserva movimiento, acción y, cuando un rasgo lo permite, acción adicional; la reacción se recupera al comienzo del siguiente turno propio. Correr añade velocidad, Destrabarse evita oportunidades y el ataque/salvación usa la CA/CD correspondiente. Las hostilidades cesan por decisión del DM, no por una distancia de huida inventada por el programa.

Esto no convierte el VTT en una automatización completa del reglamento. Línea de visión, cobertura, condiciones previas para esconderse, desencadenantes de reacciones/preparación, preparación específica de conjuros y efectos guiados siguen requiriendo adjudicación del DM. No se han agregado todas las dotes, conjuros o rasgos posibles ni reemplazado las fichas de campaña. Los retratos no deben proporcionar información que el servidor no haya autorizado para ese jugador.

## Verificación

- TypeScript cliente/servidor: PASS.
- Cliente y servidor compilados: PASS.
- Suite completa final del 4 de octubre: **245/247 aprobadas**, sin errores no gestionados. Dos fallos pendientes: `one-shot.test.ts`, coordenadas esperadas de la animación de PNJ frente a los atlas actuales; `wreck-m3.test.ts`, catálogo anónimo que contiene `ghoul` en una URL de audio público. No se han cambiado esos atlas ni ese catálogo en esta entrega. La ejecución anterior detectó además tres fallos de una preparación de pruebas del cargador de escenas que no inicializaba el nuevo conjunto de actores. Se corrigió esa preparación (sin cambiar el cargador real) y sus cuatro pruebas pasan.
- Pruebas de ciclo de combate, cancelación, recursos, reacción preparada y cámara: PASS dentro de la suite.
- Última ejecución específica: 79/79 (motor común, cámara/proyección, presentación de acciones y recuperación del cargador de escenas). La ejecución anterior de motor, D8 y presentación/cámara fue 97/97; la suite actual de D8 contiene además la discrepancia de atlas indicada, que no se debe ocultar sustituyendo la expectativa por los números nuevos sin revisar el arte.
- Integración general Stormwreck: PASS (conexiones, permisos, movimiento, objetos, efectos duraderos y guardado).
- Integración D8 con dos propietarios, iniciativa manual, tiradas privadas, cancelación, bloqueo de fin con tirada pendiente y retirada confirmada: PASS. Instancia efímera, sin guardados del usuario.
- Comprobación visual en el navegador integrado de Codex, mesas aisladas: D8 en 3096 (750 × 750) y Stormwreck en 3097 (1280 × 720). Suelo/fichas visibles, ambos combatientes encuadrados, barra con iconos, recursos persistentes y retratos. Stormwreck inicia sólo después de registrar los totales manuales de jugador/PNJ y confirmar el orden. D8 muestra correctamente Nube de niebla, su alcance y cancelación sin gasto; Correr con una pulsación pasa de 7,5 a 15 m, acción 1/1 → 0/1 y reacción 1/1 conservada. Mapa completo/Ver combate funciona. Evidencias: `combat-priorities-d8-2026-10-04.jpg` y `combat-priorities-stormwreck-2026-10-04.jpg`. La comprobación anterior también cubrió cambio a turno PNJ y final confirmado con regreso a exploración sin curación.
- Para este reintento se corrigió el arranque de la instancia de prueba: importar el servidor compilado con `node -e` sin indicar su ruta principal hacía resolver mal la carpeta web. No fue necesario modificar el servidor de la aplicación. DM/jugador/API responden HTTP 200.
- Resueltos los hallazgos anteriores: encuadre pequeño por mostrar siempre el mapa entero, daño ficticio de Nube de niebla y recursos ocultos en el tamaño compacto.
- Pendiente comprobación en móvil físico, pulsación larga táctil y proyector. El ajuste de viewport del navegador de Codex no cambió el tamaño real (siguió en 1280 × 720 al solicitar 390 × 844); no se presenta como una prueba móvil aprobada. La geometría sí tiene pruebas a 390 × 844 y 844 × 390.
- Última compilación comprobada desde el navegador: consola DM de Stormwreck con recursos del PNJ, ataque contra CA 12, alcance 1,5 m y selección cancelable sin gasto. Cambio a turno PNJ y final con confirmación del DM; el jugador vuelve a exploración con 8/8 PG. Evidencia adicional: `combat-priorities-dm-2026-10-04.jpg`.

## Mejoras siguientes, por prioridad

1. **Preparar un conjuro, no sólo un ataque de arma.** Falta elegir conjuro y desencadenante al preparar, gastar el espacio y empezar concentración en ese momento, conservarlo hasta la reacción y perderlo si no se libera antes del siguiente turno. La preparación genérica actual no implementa ese ciclo; no debe confundirse con automatización fiel de las reglas 2024.
2. **Fichas incompletas de Stormwreck.** Mike y Mia tienen nombres de equipo/conjuros, pero no perfiles completos de ataques, atributos, conjuros preparados ni espacios. El motor utiliza un ataque básico provisional (+0, 1d4, sin alcance) cuando faltan esos datos. La nueva interfaz expone esa carencia; no la corrige por sí sola. Hay que transcribir las fichas verificadas y sustituir esos perfiles provisionales, incluyendo las decisiones de preparación de sus jugadores. No se han inventado datos ni cambiado las fichas en esta revisión.
3. **Reacciones con desencadenante y elección clara.** Un cuadro breve para usar/omitir, coste y efecto; ampliar la preparación al movimiento y a desencadenantes declarados, conservando decisión del DM donde la ficción no sea automatizable.
4. **Salvaciones con daño.** Completar el flujo general de daño al fallar/mitad al superar cuando lo indique el conjuro. Los efectos de condición modelados no equivalen a cubrir todos los conjuros con salvación.
5. **Previsión antes de confirmar.** Ruta y coste incluyendo terreno difícil, salida de alcance que provoca oportunidad, cobertura, línea de visión y razón de ventaja/desventaja. Mostrar sólo datos autorizados; no convertir un retrato en una revelación de la ficha secreta.
6. **Efectos persistentes en el mapa.** Áreas como niebla deben conservarse hasta acabar duración/concentración, no sólo tener una señal visual breve. Mejorar historial de resolución y conocimiento investigado de PNJ controlado por el DM.

Inspiración: [Baldur’s Gate 3, Patch 2](https://www.baldursgate3.game/news/patch-2-now-live_89), por claridad de reacciones y registro de combate; [Patch 4](https://baldursgate3.game/news/patch-4-now-live_96), por omitir reacciones de forma explícita. [Solasta, Ready Your Action](https://www.solasta-game.com/news/221-dev-update-22-ready-your-action) sirve de referencia adicional para preparación y adjudicación de desencadenantes. Son referencias de interacción, no autoridad para alterar D&D 2024.

## Cargar y probar en la mesa

Reiniciar con `INICIAR.cmd`, elegir D8 Night y recargar jugador/DM. El lanzador reconstruye ambos lados y gestiona el guardado antes de reiniciar el servidor existente.

1. En exploración abrir la rueda, entrar/salir de categorías y mantener un icono pulsado. Seleccionar arco: debe aparecer el alcance antes de elegir una ficha.
2. Iniciar combate desde DM o mediante una acción hostil. No debe haber turno hasta registrar todas las iniciativas y confirmar el orden.
3. En cámara semi-fija/seguimiento y con zoom previo alto: al entrar en combate deben encuadrarse todos los participantes visibles. Consultar Mapa completo y volver con Ver combate. Al terminar se recuperan las preferencias de exploración.
4. Elegir ataque, cancelar antes de tirar y comprobar que no consume acción/recurso. Confirmar d20: después no debe permitirse cancelar el daño ni finalizar el encuentro pendiente.
5. Usar Correr con una pulsación; comprobar movimiento añadido y acción gastada. Destrabarse impide oportunidad. Sin Destrabarse debe solicitarse reacción antes de completar la salida del alcance.
6. Declarar huida, moverse y confirmar retirada desde DM sólo cuando esté fuera de peligro. Comprobar siguiente turno y fin si el enfrentamiento ha cesado.
7. Gastar el último espacio de Misil mágico: debe gastarse con el primer dardo y permitir completar los otros dos sin un segundo gasto.
