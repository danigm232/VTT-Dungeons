# D8 Night · revisión integral final · 05/10/2026

## Alcance y criterio

Revisión del proyecto real sobre la arquitectura compartida TypeScript/Babylon/Pixi, sin sustituir tableros por imágenes ni reconstruir estados/guardados. Trabajo previo y cambios concurrentes preservados. No commit/push ni reinicio de la mesa habitual. Esta evidencia distingue cierre técnico del MVP, arbitraje presencial y aceptación artística/física.

## Correcciones de esta pasada

1. El cierre automático por derrota perdía el último impacto y su animación. Se conserva el evento final completo al cerrar combate, con texto público separado del privado y motivo de fin añadido. La privacidad incluye acciones del DM cuyo nombre contiene fórmulas internas.
2. Una criatura derrotada sale inmediatamente del mundo autoritativo. Su visual ya presente se conserva 900 ms para caída/desvanecimiento; no se inventan entidades ni blancos seleccionables. Cambio de escena, carga o restauración cancelan ese retiro visual; deshacer puede recuperar legítimamente la entidad.
3. La consola DM presentaba conexiones/QR y herramientas de desarrollo antes del tablero. La distribución recomendada sitúa tablero y consola contextual primero; pruebas de animación quedan cerradas y recuperables. QR y orientación de cámara son plegables. No se reemplaza una disposición guardada del usuario.
4. La primera carga mostraba únicamente un fondo vacío. El mundo presenta un aviso mientras prepara el escenario y muestra error de carga; DM, jugador y proyector comparten programación de reintentos acotada, cancelada al restaurar/reconectar. No quedan promesas de carga rechazadas sin capturar en DM/proyector.
5. En combate, iniciativa tapaba el desplegable personal: un clic de hoja podía terminar en el retrato de iniciativa. Corregido el orden de capas para permitir hoja, mochila y configuración.
6. Las ayudas de estados ya no inventan CD 11 para todas las ataduras: leen la CD del efecto real. Valiente solo se menciona si la ficha tiene ese rasgo; salvaciones contra muerte solo con 0 PG, no por cualquier inconsciencia. Apresada/Restringida incluyen la desventaja en TS Destreza. Se conserva un único sistema de condiciones autoritativas; referencia: [glosario oficial 2024](https://www.dndbeyond.com/sources/dnd/br-2024/rules-glossary/).
7. El resumen de salto ocupa una fila completa en la hoja móvil, en lugar de una columna estrecha muy alta. La confirmación de restaurar diferencia una partida nueva de cargar: cargar conserva propietarios y no obliga a elegir personaje de nuevo.

## Auditoría por categoría

| Categoría | Evidencia / resultado | Límite real |
|---|---|---|
| Escenarios/texturas/atmósfera | Seis mapas Babylon nativos, fondos 3D y barrio medieval existentes; última inspección en aplicación de las seis escenas, más auditoría previa de 144 vistas en ocho giros/tres inclinaciones sin errores | Aprobación artística no automática; no se modificó nuevamente el arte en esta pasada |
| Grid/alturas/oclusión | Pruebas de navegación y paredes, índice de oclusores, billboards y cámara; apoyos y grid corregidos en la pasada anterior | No certifica cada posición posible ni FPS sostenidos |
| Personajes/transparencia | Aldeana y Silverfarben inspeccionadas como assets reales sin damero; 13 tipos cubren catálogo general, 24 atlas nuevos validan alpha/recortes/pivote | Gestos reutilizados se identifican; no todos tienen dibujo exclusivo |
| Animación/VFX | Movimiento/carrera/caída/levantarse, estados compatibles, Reflejo genérico independiente, efectos/ataques y último impacto | Algunos efectos creativos/conjuros se resuelven con DM; no simulación universal |
| Audio/SFX/música | 70 archivos disponibles, referencias saneadas y pruebas de bucles/mezclador/persistencia/sincronización | No equivale a escucha artística ni prueba de altavoces físicos |
| Hoja/inventario/estados | Fichas importadas, datos privados y estados activos; mochila y recursos permanecen en estado del juego | Preparados y conversión 2024 requieren decisión de la mesa |
| Combate/DM/jugador | Formularios por propietario, natural/modificador una vez, CA privada, economía/condiciones y legalidad en servidor; UX real de arco probada | Light/offhand/Nick/maestrías y otros contextos siguen guiados, no se inventan capacidades |
| Aventura/interactuables | Seis escenas, cuatro objetivos, tres finales, encuentros d6/d10, rutas de barrio, decisiones y notas DM persistentes | Vuelo, hielo frágil/caída/bucle necesitan DM; ruta de Cena decorativa |
| Guardado/carga/deshacer | Diez puntos, checksum/esquema, autocarga y fallback, restauración por snapshot completo, propietarios conservados; historial hasta 20 | No guardar UI ni credenciales; hardware real pendiente |
| Menús/reconexión | Selección de PJ solo al entrar, retorno a María tras recarga; nuevos avisos de carga y recuperación compartida | Cargar una mesa vieja exige actualizar servidor, no solo navegador |

## Pruebas

- Suite completa de cliente/servidor y campañas: **360/360, cero fallos**, en `output/d8-final-audit/final-tests.json`; no se aceptaron expectativas falsas para hacerla pasar. Se corrigió una prueba histórica que esperaba combatientes activos tras el cierre automático y se añadió regresión de privacidad del impacto.
- Tipos cliente/servidor y builds aislados de producción.
- `d8-combat-integration.mjs`: PASS en servidor real aislado; DM/dos jugadores/proyector, dados privados e idempotencia, retirada, seis escenas/cuatro objetivos/final, restore completo, propietarios conservados, diez saves y reinicio/autocarga.
- `one-shot-smoke.mjs`: PASS; seis mapas, configuración Babylon pública saneada, tokens, 70 audios, giro compartido, datos separados.
- `run-integration.mjs`: PASS en Stormwreck; dos jugadores, barca, escaleras, timón, objetos, arpía, maldición/sueño/nivel y desaparición del pecio. No se desarrolló nuevo contenido de Stormwreck.
- Navegador real: selección María, recarga/reconexión, revelado de una rosa desde exploración, iniciativas 18/5, confirmación de orden, arco → objetivo → d20 natural 15 → suma de daño 5, resultado 8 PG y rosa 14/22. Ninguna CA enemiga en formulario del jugador. Tamaños móvil vertical/horizontal emulados, no dispositivos físicos.
- Restauración real desde archivo exportado: escena Jardín, combate ronda 1, iniciativas 18/5, María 9 PG/envenenada y acción gastada restituidos. Después, terminar combate y cambiar a Café conserva las consecuencias; recargar retorna a María sin nuevo selector. Proyector entra sin cuadrícula. Hojas/menús revisados con medidas DOM efectivas **390×844 y 844×390**; ninguna de estas capturas se presenta como dispositivo físico.
- Última pasada en aplicación: Templo, Jardín, Café, Mercado, Espejo y Cena cargados con consola contextual correspondiente. Capturas asentadas (sin aviso de preparación) guardadas; registros de error del navegador vacíos al terminar. Una consulta durante preparación del Templo agotó el tiempo de inspección: se volvió a observar el estado ya preparado, no se tomó ese intento como prueba de carga completa. No se midieron tiempos/FPS de forma reproducible.

Capturas finales: [consola DM](../../output/d8-final-audit/dm-layout-final.jpg), [hoja vertical](../../output/d8-final-audit/player-states-portrait-final.jpg), [tablero horizontal](../../output/d8-final-audit/player-landscape-final.jpg), [proyector Café](../../output/d8-final-audit/projector-cafe-final.jpg). La auditoría visual de los seis mapas y 144 vistas pertenece a la pasada anterior en `output/camera-2-5d/backdrop-v43/`; no se afirma haber repetido esas 144 vistas aquí.

Escenas de esta última pasada: [Templo](../../output/d8-final-audit/scene-temple-final.jpg), [Jardín](../../output/d8-final-audit/scene-garden-final.jpg), [Mercado](../../output/d8-final-audit/scene-market-final.jpg), [Espejo](../../output/d8-final-audit/scene-mirror-final.jpg), [Cena](../../output/d8-final-audit/scene-dinner-final.jpg); Café aparece en las capturas de consola/proyector.

Compilación servidor de prueba: `dist/d8-final-audit-server`; clientes finales: `output/d8-final-audit/web-complete`. El navegador de revisión sirvió una copia de este build en `web-release`. Los scripts reciben `DUNGEONS_SERVER_BUILD` y `DUNGEONS_WEB_DIR` absoluto; `run-integration.mjs` se corrigió para respetar también el directorio de servidor indicado y se volvió a ejecutar Stormwreck contra ese build. `scripts/review-session.mjs` abre puerto libre y carpeta temporal propia; usar terminal interactivo para poder cerrarlo con `quit`.

## Archivos de esta pasada

- `engine/server/game.ts`, `game.test.ts`: cierre/eventos/privacidad y regresiones.
- `apps/web/world.ts`, `common.css`: visual breve de derrotados y aviso de carga.
- `apps/web/dm.ts`, `dm.html`, `dm.css`: distribución y controles compactos; recuperación.
- `apps/web/player.ts`, `player.css`, `projector.ts`: recuperación compartida y acceso personal en combate.
- `engine/client/dm-workspace.ts`, `.test.ts`, `world-defeat.test.ts`, `scene-load-recovery.ts`, `.test.ts`: mecanismos compartidos y pruebas.
- `engine/client/condition-presentation.ts`, `.test.ts`: ayudas vinculadas a origen/CD/rasgos/PG reales, sin duplicar reglas de servidor.
- `scripts/review-session.mjs`, `run-integration.mjs`: entorno aislado de revisión manual y elección del build correcto en integración.
- Roadmap/estado/guía/matriz de encuentros/revisión open source y este informe: actualizar límites y retirar referencias obsoletas a placeholder y clips aún inexistentes.

## Qué falta para el visto bueno de mesa

Aceptación visual del DM en los seis escenarios, escucha de música/SFX y sesión en móvil/proyector reales. Las aspiraciones de automatización universal 2024 no forman parte del cierre técnico obtenido y siguen trazables en el roadmap. No se promete «cero errores posibles», no se eligen preparados ni se convierte una ficha sin acuerdo. Abrir el lanzador habitual y actualizar/reiniciar cuando no haya sesión activa; adoptar Distribución recomendada si se conserva una disposición antigua.
