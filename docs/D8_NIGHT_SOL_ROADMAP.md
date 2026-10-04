# Ruta de Sol: D8 fiable, motor reutilizable para Stormwreck

**Actualización de prioridad 03/10/2026:** por petición expresa del usuario, se integra primero en el VTT el render D8 Babylon V34/V35 existente, sin esperar al cierre de todas las fases F3–F7. El alcance es un piloto jugable de representación, no una reescritura de arquitectura ni una declaración de H1 completa. F0–F2 no se reinician; F3–F7 siguen abiertos y conservan sus puertas de salida. Tras la prueba del usuario, el siguiente ciclo pedido es mejorar arquitectura reutilizable y después escenarios, texturas, iluminación y VFX.

Fecha: 2026-09-18. Ruta viva de implementación. Las fases se marcan únicamente después de superar su puerta de salida y conservar evidencia reproducible. Sustituye el orden inmediato de los encargos anteriores, no borra sus compromisos ni declara aceptada una versión.

Leer antes [auditoría y evidencias](D8_NIGHT_AUDIT_20260918.md). Sol implementa e integra; Astra revisa arquitectura y aceptación. Terra/Luna pueden preparar datos, casos y documentación acotados cuando se delegue expresamente, sin tocar en paralelo los mismos contratos. No crear tareas ni cambiar modelos automáticamente.

## Decisiones obligatorias

1. Conservar TypeScript, servidor autoritativo, protocolo, pack de campaña y persistencia existentes. Refactorizar incrementando los contratos existentes; no segundo motor/save/estado.
2. Todo mecanismo nuevo debe funcionar sin nombres María, Anteros, rosas o D8 dentro del motor compartido. Esos datos/efectos declarativos pertenecen al pack privado. Usar fixtures de otra campaña con IDs diferentes para demostrarlo.
3. Separar definiciones (ficha, rasgos, acciones, assets) de runtime (PG, condiciones, recursos, posición, progreso). UI/zoom/acordeones no van al save.
4. Ninguna prueba automatizada utiliza el puerto3000 ni `data/saves` reales. Directorios temporales propios y puertos de prueba; no borrar locks ni cerrar procesos ajenos. No regenerar dist mientras otra tarea lo usa.
5. Mantener el proyector sin cuadrícula; DM/jugador con cuadrícula. El móvil no recibe estadísticas privadas. No activar nueva contraseña DM salvo nueva orden del usuario.
6. Antes de crear sistema/asset, comprobar lo existente y alternativas open source siguiendo `OPEN_SOURCE_REVIEW.md`: encaje, licencia, mantenimiento, adaptación y decisión. Existencia gratuita no implica adopción. No introducir frameworks solo para arreglar un formulario.
7. Tiradas físicas: ataque = d20 natural y bonificador calculado; daño = suma indicada y modificador calculado; salvación/prueba = formulario explícito distinto. La CA del enemigo es privada. No llamar «CD» al dado que introduce el jugador.
8. Resoluciones no automatizadas deben aparecer como «Resolver con el DM», con resultado y consecuencias registrables. Nunca un botón aparentemente funcional que no hace nada ni una etiqueta que prometa reglas inexistentes.

## Secuencia y tamaño relativo

| Fase | Entrega | Tamaño relativo | Depende de |
|---|---|---|---|
| F0 | ✅ Completada 2026-09-19 · Base reproducible y cobertura inicial | S | — |
| F1 | ✅ Completada 2026-09-19 · Ataques y formularios fiables, por propietario | M | F0 |
| F2 | ✅ Completada 2026-09-19 · Mundo persistente, recuperación y deshacer seguros | L | F1 |
| F3 | Fichas/reglas comunes y acciones de los PJ | L | F2 |
| F4 | Criaturas, Reflejo y encuentros correctos | M–L | F3 |
| F5 | Aventura completa, progresión, terreno e interactuables | L | F4 |
| F6 | Consolas, sprites, móvil y ambiente pulidos | M | F5; arreglos bloqueantes de UX antes en F1 |
| F7 | Aceptación integral D8 + regresión Stormwreck | M | F1–F6 |
| H1 | Piloto HD-2D integrado, separado del cierre D8 | L, por definir | F7 y contrato específico aprobado |

## Integración anticipada del VTT · candidata 0.3.2-dev.6 / D8 V35

**Estado: IMPLEMENTADA TÉCNICAMENTE; revisión visual/física pendiente.** Bajo la instrucción del usuario del 03/10, el renderer Babylon existente se comparte entre Playground y la mesa D8. Todas las escenas declaran `babylon-d8`; las celdas transitables se derivan en servidor desde las zonas D8, los overlays proyectan la cuadrícula/fichas sobre la escena y el cliente carga el motor específico bajo demanda. La API pública sirve sólo cámara, geometría, iluminación/ambiente visual; CANON e interacciones permanecen privadas.

Evidencia: typecheck cliente/servidor; Vitest 208/208; build Vite y servidor; smoke HTTP en servidor y guardado temporales; versión JSON Playground V35 reproducible. Migración de guardados legados a la nueva cuadrícula marcada/idempotente. Móvil, ordenador y proyector aún deben confirmar perspectiva, grid, movimiento, cambios de mapa y audio. Este avance no completa F3–F7 ni H1, y todavía no añade texturas o escenarios nuevos. Ver la entrada vigente de `PROJECT_STATE.md` y `docs/ACCEPTANCE_RESULTS.md`.

S/M/L son magnitudes comparativas, no promesas de horas, tokens ni cuotas. Reestimar al cerrar F1 con resultados reales. F0–F7 son la ruta solicitada; H1 conserva la dirección futura, no amplía este encargo a una migración completa.

## F0 — ✅ COMPLETADA — Establecer una base reproducible

Resultado y evidencia: [D8_F0_F1_RESULTS_20260919.md](evidence/D8_F0_F1_RESULTS_20260919.md). Se conservó la arquitectura, se amplió el fixture sintético ajeno a D8 y se fijó un baseline de 54 pruebas, typecheck y builds verdes.

Objetivo: saber qué se modifica y qué demuestra cada prueba.

- Inventariar trabajo local/concurrente sin reset ni commits masivos. Registrar runtime, versión del pack, baseline y ficheros afectados. Conservar cambios recientes de audio/DM móvil.
- Repetir50tests y typecheck; construir en salida de prueba cuando sea necesario. No usar un dist antiguo como evidencia del código nuevo.
- Convertir A01–A12 en regresiones con expectativas correctas. No invertir las expectativas para hacer pasar el comportamiento actual.
- Preparar fixture de dos jugadores y otro con IDs no D8; harness de tres roles y carpetas de save temporales. Reutilizar scripts existentes y ampliar los que corresponda.
- Registrar discrepancias de fuentes (rosas, Anteros, aldeanos y fichas) antes de corregir tests. Los tests actuales de escapeCD10 no son la autoridad.

Archivos principales: `engine/server/*.test.ts`, `engine/server/persistence/*.test.ts`, `scripts/*smoke*`, diagnóstico del18/09, documentación de evidencia.

Salida: instrucciones reproducibles, baseline verde existente y nuevos fallos claramente documentados/aislados hasta su fase. No entregar una suite rota sin distinguir pruebas pendientes.

## F1 — ✅ COMPLETADA — Que elegir acción y escribir dados funcione de verdad

Resultado y evidencia: [D8_F0_F1_RESULTS_20260919.md](evidence/D8_F0_F1_RESULTS_20260919.md). El servidor liga cada solicitud al propietario y etapa exactos, usa IDs distintos por fase, rechaza reenvíos inválidos, impide pasar turno con resolución pendiente y filtra la información privada. La verificación real de navegador mantuvo foco y valor durante más de diez segundos, también a 844×390.

Hallazgos: I01/I02, A01/A02/A06/A07/A12.

- Conservar DOM/borradores de selector e input durante snapshots. Separar dibujo20Hz de formularios. Estado UI ligado a resolutionId/stepId, no a un nodo efímero.
- Flujo común: declarar → validar legalidad → solicitar entrada correspondiente → resolver → aplicar consecuencias/consumo una sola vez → publicar resultado. Si se requiere aprobación DM, representar explícitamente ese estado; no inventar un diálogo de CA visible al jugador.
- Servidor valida personaje propietario, etapa exacta, ID de comando, límites del dado y vigencia del mundo. Una salvación corresponde al objetivo; ataque/daño al atacante. DM opera sus criaturas en su consola.
- Idempotencia de comandos de jugador y de cada etapa; evitar doble envío y distinguir reintento de una acción nueva. Ningún reenvío de ataque puede convertirse en daño.
- Prohibir cambio de turno con resolución pendiente o proporcionar cancelación DM explícita con reglas de costes registradas.
- Rechazar vacío, NaN, fracciones y sumas imposibles. Añadir mensajes humanos para fuera de alcance, sin acción/recursos, objetivo inválido y conexión perdida.
- Filtrar eventos por audiencia, además de snapshots. No divulgar CA, fórmulas ni bonificadores enemigos accidentalmente.

Archivos: `apps/web/player.ts`, `dm.ts`, estilos actuales; `engine/shared/protocol.ts`, `engine/server/game.ts`, tests de red/UI.

Puerta de salida:

- Dos jugadores reales en navegador: María declara arco; Aoife no ve ni responde su prompt. DM recibe únicamente sus tiradas correspondientes.
- Mantener selección y escribir lentamente un valor durante al menos10seg con snapshots activos, incluido móvil horizontal. Enter/doble clic/reenvío no duplica daño.
- Fallo no pide daño; impacto sí; crítico usa fórmula correcta; impacto automático no pide d20; salvación va a quien corresponde.
- Desconexión entre ataque y daño permite retomar la misma resolución o informa cancelación, sin aplicación doble.
- Fixture con personajes de otro pack pasa el mismo contrato. Animación no aplica daño ni cambia la autoridad.

## F2 — ✅ COMPLETADA — Mundo persistente y recuperación sin pérdida

Resultado y evidencia: [D8_F2_RESULTS_20260919.md](evidence/D8_F2_RESULTS_20260919.md). Los estados y sus fuentes pertenecen ya a la entidad y sobreviven fuera del combate; el guardado conserva el perfil runtime del Reflejo, recursos validados, pendientes y mundo completo. La autocarga prueba activo, copia y anteriores sin instalar candidatos parciales; el menú ofrece el actual más nueve anteriores y deshacer se reinicia tras restaurar.

Hallazgos: A05/A08/A11, I03/I04/I06.

- Extraer las condiciones duraderas del contenedor exclusivo del combate hacia el estado de entidad existente. Un solo modelo canónico con ID, fuente, duración y mecanismo de finalización. Normalizar alias legados, conservar varios estados/fuentes compatibles.
- Extender el esquema existente con migración versionada. Conservar posiciones/superficie/orientación, PG/máximos runtime si varían, recursos, inventario, condiciones, perfil/binding de mimic, iniciativa/ronda/turno/movimiento, acción/bonus/reacción cuando se incorporen, pendientes, derrotados, objetos y progreso. Validar referencias y cantidades antes de instalar candidato completo.
- Guardado al inicio/fin de combate, escena y manual, más autosave de seguridad. Política unificada de **diez puntos recuperables únicos incluyendo el último**. Puede haber archivo técnico temporal/backup para atomicidad, pero documentar su función y no presentarlo como otro slot. Evitar que audio sin cambios borre todos los hitos.
- Autocarga busca del más reciente al anterior con checksum, esquema, campaña y validación semántica. Conservar corruptos para diagnóstico. Si ninguno sirve: recuperación explícita, jamás sobrescribirlos con una partida vacía. Una versión futura desconocida se conserva y se informa, sin migración descendente destructiva.
- Menú muestra actual + históricos, fecha/hora, escena, modo, ronda y actor de turno. Restore cambia epoch, rechaza eventos viejos y emite snapshot completo.
- Reconciliar posesiones tras reinicio/restore; recordar preferencia no secreta por campaña, revalidar sesión y disponibilidad. Si no puede recuperar, mostrar selector utilizable. Nunca restaurar credenciales guardadas.
- Unificar deshacer importante de DM/jugador: hasta20 acciones con límites de transacción claros. Reiniciar historia tras restore/nueva partida; mantener revisiones monotónicas o cambiar epoch. No revertir silenciosamente acciones ajenas posteriores.
- Cierre Windows: guardar y esperar confirmación desde canal local autorizado. Si no responde, informar riesgo; no anunciar guardado exitoso por SIGTERM ni matar procesos por número de puerto solamente.

Archivos: `persistence/{schema,codec,store,coordinator}.ts`, GameState/GameServer, API servidor, clientes y lanzadores/scripts de cierre.

Puerta de salida:

- Ronda2, PG reducidos, estado con fuente, enemigos movidos, objetivo/objeto cambiado, recursos gastados y tirada pendiente: guardar, modificar, cargar y comparar todo el mundo. Repetir tras reinicio del servidor aislado.
- Condición vigente sobrevive al fin de combate y cambio de escena cuando su regla no la termina; derrotados no reaparecen solos.
- Once guardados => diez puntos de carga; el último figura en menú. Último corrupto, último semánticamente inválido, solo históricos, carpeta vacía y todos corruptos tienen pruebas distintas.
- Deshacer no cruza restore/nueva partida ni deja dirty/revisión incoherentes. Dos campañas no leen ni pisan sus saves.
- Cierre/reapertura Windows probado con proceso hijo de prueba, no la mesa del usuario.

## F3 — Fichas y reglas reutilizables, sin reglas inventadas

Hallazgos: A03/A04, I03/I05 y revisión de fichas.

- Completar María nivel1 y Aoife desde sus fuentes: transcripción privada trazable más proyección estructurada de atributos, habilidades, TS, rasgos, equipo/cantidades/dinero, recursos y conjuros. No sustituir PG/inventario de una partida existente por los valores iniciales corregidos.
- Diferenciar reglas2024 generales, ficha legada y adaptación de mesa. Documentar lo no decidido: preparados de Aoife, variante de importación y puntos ambiguos. No convertir automáticamente especie/trasfondo ni conceder rasgos de niveles superiores.
- Ataque furtivo por rasgo y propiedades de arma, no nombre. Ventaja/desventaja con razones y cancelación; capacidad de actuar, alcance normal/largo, relaciones aliado/enemigo, crítico, resistencia/inmunidad y condiciones pertinentes.
- Añadir economía acción/acción adicional/reacción, movimiento y sus reinicios. Ofrecer las acciones básicas pertinentes con ayuda y resolución: atacar, correr, destrabarse, esquivar, ayudar, esconderse, preparar, usar objeto y sin armas; no dar Acción Astuta a María nivel1.
- Daga arrojada, munición/recuperación con política visible, ataque sin armas y todos los ataques actuales; costes y rasgos disponibles. Unarma/light/Nick/maestrías solo si la ficha/clase importada realmente los concede.
- Aoife: diferenciar conocidos/preparados/rituales; espacios, recuperación, concentración, objetivos múltiples de Misil mágico y reacciones de Caída de pluma. Para efectos situacionales no automatizados, resolución DM guiada con estado/consecuencia persistente; nunca falsear un hechizo como daño genérico.
- Fuente/fin de condiciones, levantarse/arrastrarse, ceroPG, inconsciencia, estabilización/salvaciones de muerte y curación. Excepción de bucle temporal D8 no forma parte de la regla universal de muerte.

Archivos: tipos de campaña/protocolo existentes, motor de resolución (extraer módulo desde GameState si simplifica), `campaigns/one-shot/server.ts`, hoja móvil/DM y tests.

Puerta de salida: matriz por acción de cada PJ con legalidad, entrada, fórmula, coste y consecuencia; casos de ventaja+desventaja, incapacidad, resistencias y fin de efecto; tests con mismo rasgo en un PJ cuyo ID no sea maria. Separar soporte automático, guiado y pendiente. No afirmar «D&D5.5 completo».

## F4 — Monstruos y Reflejo fieles a la aventura

Hallazgos: A08–A10 y tabla de discrepancias de fuente.

- Perfiles correctos de Anteros, rosas y aldeanos; incluir salvaciones/rasgos necesarios y acciones adicionales. Corregir fuente y prueba juntas: recarga6, daño fijo1 de espina, liberaciónCD11. No compensar una discrepancia mediante un nerf silencioso.
- Instancias separadas de definición: permitir número de rosas elegido por DM y PNJ movibles sobre grid. Identidad de Anteros compartida entre sus apariciones, sin duplicar PG/progreso por escena si es la misma criatura.
- Mimic genérico con `mimicOfPlayerId` o equivalente; objetivo elegido por DM cuando haya varios PJ, copia de forma base/perfil inicial y recursos propios según política documentada; PG75% con redondeo/base declarados. No refleja estados actuales ni curas futuras del original.
- Revelar construye una vez y no cura; en exploración ya usa el sprite copiado con efecto helado. Guardar/restaurar conserva identidad, ataques y estado independiente.
- Política del módulo de imitación y orden después del original, sin abrir ataques libres contradictorios. Mostrar al DM acción a imitar y resolver excepciones si no hay objetivo/alcance/recursos. Salida pacífica y resolución por espejo/hielo registradas.
- Recarga una vez cuando corresponde, sin permitir repetir d6 hasta éxito. Secuencias de multiataque con objetivos según texto (seis flechas de Anteros al mismo objetivo), interrupción y costes coherentes.

Puerta de salida: reflejos de María y Aoife probados antes de combate, durante, tras restore y con sus estados distintos; ataques de cada monstruo con dos jugadores y DM; ninguna referencia a nombres particulares en el evaluador común.

## F5 — Recorrido de aventura, progreso y mapa coherentes

- Modelo pequeño y tipado de objetivos, decisiones/resultados, puntuaciones, inventario de misión y disparadores en el pack. Motor común lo valida/guarda, consola común lo presenta. Nada de sumar flags D8 a Stormwreck.
- Las seis escenas muestran objetivo real, personajes relevantes, objetos, acciones y progreso solo DM. Vino/rosa/filete-o-vaca/espejo y vuelta al templo; espejo al final según fuente. Atajo DM permitido con aviso, no bloqueo irreversible.
- Puntos hacia finales a partir de decisiones registradas y reversibles, evitando duplicación al reentrar; empate lo decide DM con explicación. Excepciones de rechazo/derrota documentadas y confirmadas, con checkpoint previo.
- Revisar fuentes/mapas y máscaras de las seis escenas: paredes, puertas/pasos, mobiliario, spawns y accesibilidad. Colisión, línea de efecto/visión, coste de terreno y peligro son datos distintos. No bloquear todas las sombras ni interpretar automáticamente un dibujo como verdad mecánica.
- Implementar paredes/línea de efecto mínima reutilizando navegación y geometría; cerrar exploit de disparar a través de muros. Hielo difícil/frágil con zonas explícitas y consecuencias guiadas/aprobadas por DM. Futuras superficies3D consumen el mismo contrato lógico, sin forzar migración gráfica ahora.
- Inventario/objetos recogidos y decisiones sincronizados. Reutilizar puertas/objetos existentes cuando encajen; mecanismos para cualquier campaña, configuración solo D8.
- Actualizar guía DM y matriz del módulo: ya no son tres PJ provisionales ni PNJ meramente decorativos. Balance para María sola o María+Aoife se registra como adaptación, no se cambia automáticamente.

Puerta de salida: recorrido completo y persistido para cada tipo de desenlace, empates, retorno a escena, salida pacífica del espejo y derrota. Pruebas de paredes/spawns por escena; Stormwreck conserva timón/puertas sin controles de vino/rosas.

## F6 — Presentación y manejo sin saturar

- Conservar/afinar acordeones existentes: un combatiente elegido/actual, resumen compacto y estados desplegables. Exploración y combate muestran controles propios. Mantener selección y WASD del DM dentro/fuera de combate, sin capturar teclas al escribir en inputs y sin joystick DM.
- Hoja: solo estados activos con origen/efectos/duración/escape verdaderos, leyenda plegable; no siete filas de «no». Recursos y ataques legibles.
- Auditar catálogo completo: URL efectiva/versionado, alpha real, escala, lienzo, pivote/pies y manifest. Aldeana v4 ya tiene alpha: comprobar red/cache/render antes de otra edición. Aoife continúa sin imagen nueva hasta el paso aprobado; placeholder claramente identificado.
- Capas compatibles de estado y prioridad visual inconsciente>derribada; cuerpo tumbado cuando proceda e inconsciente sin animación activa. Usar assets compatibles o efectos de render adecuados; no generar combinaciones exponenciales. Puntos para todos los estados con layout que no colisione.
- BarraPG sobre puntos sobre sprite, márgenes estables al zoom/variante. Jugador/proyector no ven PG/CA exactos de enemigos. Comprobar escala y selección en escenas distintas.
- Ambiente por pack y escena, reutilizando audio/efectos existentes. Preservar controles recientes de volumen/intensidad/DM móvil; no tormenta o timón de Stormwreck por defecto en D8. Animaciones ambientales discretas con presupuesto de rendimiento, sin convertir el tablero en otra aplicación.
- Móvil vertical/horizontal, teclado virtual y safe areas: mapa primero, acciones compactas, foco estable. Proyector sin grid y sin controles/secretos DM.

Puerta de salida: capturas y recorrido funcional DM escritorio, jugador vertical/horizontal, proyector; comprobación de aldeana y todos los estados; audio sin autoplay roto, duplicado o saltos tras reconectar. Indicar qué se emuló y qué se probó físicamente.

## F7 — Aceptación de ambas campañas

No cerrar por compilación. Ejecutar y guardar evidencia de:

1. Arranque, elección campaña, DM automático, unión de uno/dos PJ, salida y vuelta del navegador.
2. Las seis escenas, PNJ seleccionables/movibles, colisiones y objetivos sin controles ajenos.
3. Arco/daga/automático/salvación/multiataque/recarga/condición/reacción con dados físicos introducidos en la pantalla correcta.
4. Fin combate conservando PG/estados/derrotados, nuevo combate, progreso y final.
5. Matriz restore de F2, exactamente diez puntos, corrupción, reinicio y deshacer; dos clientes reciben snapshot consistente sin recargar.
6. Doble clic, comando viejo, propietario incorrecto, red intermitente, pendiente al guardar y cerrar Windows de prueba.
7. Stormwreck: campañas/saves separados, entrada PJ, movimiento, escena, timón, puertas, criatura, audio, persistencia y restauración; sin progresión D8. Misma suite común con fixtures de ambos packs.
8. Tipos, tests unitarios/integración, build y QA navegador. Móvil físico/proyector del usuario se distinguen de emulación; si no están disponibles, cerrar solo lo acreditado y dejar aceptación física pendiente explícita.

Entrega: informe por fase con archivos, comando, exit code, resultado, limitaciones y evidencias. Lista de soporte de reglas/efectos y manuales guiados; ruta de reproducción para cualquier pendiente. Cero fallos críticos abiertos para declarar D8 candidata jugable; sin afirmar versión1 ni RC aceptada por el usuario.

## H1 — HD-2D después de la fiabilidad

Mantener Babylon aprobado, no instalar otro motor. Piloto de una escena pequeña con sprites2D, suelo3D, cuadrícula lógica/proyectada, alturas/oclusores, luz y partículas. Adaptador de render consume snapshots/terreno del mismo servidor; ninguna regla depende de Pixi/Babylon. Medir integración, rendimiento móvil y coste artístico antes de convertir todas las escenas. Percepción individual, visión en oscuridad y generación desde PDF/IA necesitan contratos propios: no son funciones ya resueltas por un shader o por importar assets.

## Instrucción de inicio para Sol

Continúa con F0 y F1 de esta ruta; lee la auditoría del18/09 y verifica que el código no cambió después. No rehagas sistemas existentes ni uses saves reales para pruebas. Implementa, reproduce con navegador y dos jugadores, y documenta resultados antes de avanzar a F2. Sigue las dependencias hasta F7 sin pedir confirmación por cada paso seguro. Detente únicamente por decisiones de usuario realmente necesarias, conservando lo ya validado. No presentes la ejecución del diagnóstico como tests del producto pasando ni declares completo un flujo solo porque compile.
