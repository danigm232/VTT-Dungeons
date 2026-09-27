# Roadmap compartido Dani + Fer — producción de campañas y evolución del VTT

**Versión del plan:** 1.0 · **Fecha:** 27/09/2026 · **Estado:** hoja de ruta conjunta propuesta, pendiente de ejecutar sus nuevos hitos.  
**Repositorio:** VTT-Dungeons · **Responsables:** Dani (campañas y aceptación jugable) y Fer (plataforma y capacidades compartidas).

> Objetivo: Dani puede crear y terminar campañas reales con Codex mientras Fer mejora el sistema de creación. Ambos trabajan en paralelo; cada incremento de Fer debe ser adoptable, verificable y útil para Dani, sin interrumpir la campaña ni comprometer guardados. Los problemas reales de Dani alimentan el backlog de Fer.

## 0. Documentos de referencia y precedencia

Este documento **coordina** dos líneas de trabajo. No sustituye el roadmap de la campaña ni reabre decisiones técnicas ya aprobadas.

| Documento | Autoridad |
|---|---|
| [ROADMAP_V1.md](ROADMAP_V1.md) | Hitos M0–M7, decisiones y criterios del Pecio; fuente de verdad de la planificación específica de Dani. |
| [PROJECT_STATE.md](PROJECT_STATE.md) | Estado observado más reciente del código, versión, incidencias y evidencia. Prevalece sobre cifras históricas del roadmap. |
| [Guion M6/M7](campaigns/stormwreck-isle/private/m5/M6_M7_PHYSICAL_PLAYTEST_20260925.md) | Procedimiento de validación física del Pecio; no sustituirlo por pruebas simuladas. |
| [Plan M5 de recursos](campaigns/stormwreck-isle/private/m5/M5_ASSET_COVERAGE_PLAN_20260925.md) | Cobertura de arte y sus criterios de aceptación separados de la lógica. |
| [Dirección HD-2D](docs/HD2D_DIRECTION.md) y [reutilización](docs/OPEN_SOURCE_REVIEW.md) | Arquitectura, experiencia de mesa, procedencia, licencias y evaluación antes de incorporar dependencias. |
| **Este roadmap** | Propiedad de tareas, dependencias entre los dos, entregas de Fer, integración, gates y métricas compartidas. |

**Fotografía de partida (no un resultado de esta propuesta):** PROJECT_STATE registra, a 26/09, la candidata de aplicación 0.3.2-dev.5 con 186/186 pruebas automatizadas y builds verificados en el alcance descrito. La última versión aceptada operativamente es Alpha 0.2.0 RC2. El Pecio conserva una candidata visual M5 y técnica M6; faltan aceptación visual de M5 y ensayo/aceptación física M7. Retiro del Dragón y cinco campamentos están integrados en stormwreck-isle; D8 Night tiene un slot privado separado. Releer PROJECT_STATE al comenzar cada ciclo: no convertir esta fotografía en un estado permanente.

**Límites consolidados:** C1–C9, la cofa y el mar son un solo mapa lógico wreck-ship con superficies y alturas conectadas. Una mejora de arte no altera a escondidas geometría, casillas, colisiones ni rutas. Los dados físicos, la intención del jugador y el arbitraje del DM siguen fuera de la automatización; el VTT automatiza ambientación y movimientos evidentes, pero pide confirmación ante una bifurcación narrativa. CANON y VTT_AMBIENCE permanecen separados.

## 1. Responsabilidad y capacidad de decisión

| Ámbito | Dani: propietario de campaña | Fer: propietario de plataforma | Acuerdo necesario |
|---|---|---|---|
| Prioridad narrativa, capítulos, CD, finales y coherencia con el PDF | Decide, implementa y acepta | Consulta requisitos; no altera canon | Si la herramienta no puede representar una escena correctamente. |
| Mapas, placements, sprites y ambientes específicos | Autor y aceptación artística/jugable | Proporciona formatos, importación y capacidades reutilizables | Si aparece una necesidad transversal. |
| Motor, red, permisos, persistencia y contratos comunes | Consumidor y probador de regresiones | Diseña, implementa y publica | Antes de romper una API o cambiar saves usados por Dani. |
| Herramientas de escenas, librería VFX/SFX y pipeline de assets | Aporta casos reales y prueba facilidad de uso | Implementa una solución genérica cuando esté justificada | Alcance mínimo y criterio de aceptación. |
| Bugs en código compartido | Reproduce; puede preparar parche urgente en rama aislada | Integra la corrección y pruebas permanentes | Si afecta a la partida o al avance de M7. |
| Lanzamiento de versión del sistema | Decide cuándo adoptarla en su campaña | Publica candidata, compatibilidad y migración | Antes de actualizar la instalación/saves reales. |
| Resultado en dispositivos físicos y experiencia del DM | Valida y acepta en el hardware disponible | Prepara guion y corrige problemas reproducibles | No declarar aceptación sin observación de Dani. |

**Regla de propiedad:** Dani puede programar con Codex una necesidad propia; eso no obliga a Fer a absorberla. Si se repite en otra escena/campaña o resuelve una capacidad general, se abre una incidencia de extracción con ejemplo mínimo y Fer decide la API común, coordinándola con Dani. Fer nunca reescribe archivos específicos de campaña como atajo para arreglar el motor sin un acuerdo registrado.

**No bloquear por calendario:** Dani sigue trabajando sobre una versión conocida mientras Fer prepara otra. Si necesita una capacidad todavía no publicada, puede usar una configuración o adaptador local acotado y registrarlo como provisional; no duplicar un subsistema completo ni fusionarlo silenciosamente con el motor.

## 2. Dos líneas de trabajo y sus hitos

La secuencia siguiente es **por gates**, no por semanas inventadas. D y F avanzan en paralelo; INT es una adopción conjunta. Una fase posterior puede empezar en su ámbito si no consume una interfaz aún inestable.

| Ciclo | Dani — entregable de campaña | Fer — entregable universal | Punto conjunto de integración |
|---|---|---|---|
| **C0. Alinear, sin reescribir** | **D0:** comprobar M5/M6/M7 vigentes, identificar bloqueos y ejemplos reproducibles del Pecio. | **F0:** auditar módulos y dependencias reales, enumerar qué se reutiliza y qué acoplamiento impide extraer campañas. | **INT0:** inventario común y primera mejora de bajo riesgo con dueño y prueba definidos. |
| **C1. Terminar Pecio + primera entrega** | **D1:** aceptación visual M5 y playtest M7 según el guion; corregir incidencias observadas, conservar M6. | **F1:** contratos/compatibilidad, regresiones de motor y primer cambio universal pequeño; ningún refactor masivo. | **INT1:** Dani adopta la versión de Fer en un slot temporal y confirma que Pecio y guardado siguen funcionando. |
| **C2. Producción de escenas más rápida** | **D2:** avanzar en Cuevas de Pleamar usando el contenido canónico y las herramientas ya disponibles. | **F2:** plantilla y validador de escenas a partir de un patrón repetido observado; evitar un editor general prematuro. | **INT2:** una escena real de Pleamar usa la herramienta sin parche específico en el motor. |
| **C3. Biblioteca de ambiente y assets** | **D3:** producir los assets/ambientes restantes de Pleamar y empezar el Observatorio cuando su alcance esté documentado. | **F3:** mejorar el pipeline y la biblioteca reutilizable de animaciones, sprites, sonido y VFX según la fricción medida por Dani. | **INT3:** reutilizar un efecto/plantilla o familia de assets en al menos dos localizaciones sin duplicar su implementación. |
| **C4. Generación repetible** | **D4:** integrar y probar los capítulos de Stormwreck; realizar un piloto acotado con D8 Night sin mezclar datos. | **F4:** plantilla de campaña, asistentes de importación/configuración, validación y empaquetado reproducible. | **INT4:** crear un módulo de campaña piloto desde la plantilla, ejecutar pruebas y verificar aislamiento de secretos, assets y saves. |

**Trabajo continuo FQ:** Fer mantiene pruebas de permisos/privacidad, contratos de escena, migraciones y rendimiento; Dani aporta pruebas jugables y fallos reales. El control de calidad no es una fase que se deja para el final.

### C0 — primer incremento que debe comenzar ahora

**D0 — Dani (responsable y ejecutor con Codex).** Revisar el estado efectivo de M5/M7 contra ROADMAP_V1, PROJECT_STATE y el guion físico; separar (a) defectos de campaña/arte, (b) defectos del motor y (c) mejoras reutilizables. Mantener el siguiente trabajo del Pecio sin rehacer M0–M4. Entregar hasta cinco necesidades priorizadas, cada una con escena afectada, pasos de reproducción, alternativa actual, efecto sobre el DM y criterio de cierre. La aceptación de M5 y M7 es una tarea de Dani, no un PASS inferido por Codex.

**F0 — Fer (responsable y ejecutor con Codex).** Leer arquitectura y código existente en engine/, apps/, campaigns/, scripts/ y docs/; identificar fronteras y pruebas ya presentes antes de proponer carpetas o motores nuevos. Trazar las dependencias reales entre el motor y Stormwreck/D8, el modelo de escena, assets, seguridad, red y save. Registrar una matriz de componentes: REUTILIZAR / EXTRAER MÁS TARDE / FALTA / NO HACER AHORA, con la razón y al menos un consumidor real para cada propuesta. Elegir una primera PR pequeña, reversible y verificable sin cambiar canon ni estado público.

**INT0 — salida obligatoria:** inventario compartido versionado, hasta tres necesidades del primer ciclo aceptadas por ambos, un primer ticket de Fer y contrato de prueba adoptable por Dani. La auditoría no autoriza de por sí una reestructuración del repositorio.

### C1 — M5/M7 de Dani y contrato inicial de Fer

**D1:** mantener la candidata M6, revisar los assets y la composición de M5 frente a las referencias visuales aprobadas, y completar el ensayo físico M7 en copia de prueba: teclado/cámara, barca y dos abordajes, superficies C1–C9/cofa, dos PJ, foco DM, móvil vertical/horizontal, proyector, audio escuchado, recarga y 30 minutos de uso. Registrar dispositivo, navegador, resolución, red, incidencias y FPS solamente si se midieron. Corrige los fallos reproducibles, no los que solo se presumen. **Gate D1:** M5 visual y M7 físico aceptados expresamente o declarados pendientes con causas; el cierre técnico anterior no se vuelve a contar como aceptación.

**F1:** congelar documentalmente una interfaz mínima de escena y compatibilidad de campañas; definir qué cambios exigen migración de datos, qué datos son privados y cómo hacer regresión con una campaña sintética más Stormwreck. Implementar solo un incremento compartido de alto valor procedente de INT0, con prueba automatizada, guía y reversión. **Gate F1:** PR pequeña con pruebas pertinentes, typecheck y build; evidencias de aislamiento, compatibilidad y alcance documentadas. No reetiquetar una DEV como versión aceptada.

**INT1:** Dani integra la mejora de Fer primero en rama/copia temporal y ejecuta un recorrido representativo del Pecio, sin tocar la mesa en curso ni sus guardados. Si hay regresión, vuelve a su versión fijada y abre ticket reproducible; Fer corrige o prepara una migración. **Gate INT1:** primera entrega reutilizable adoptada y documentada, o incidencia bloqueante abierta; no se presume éxito por estar fusionada en main.

### C2 — Pleamar y sistema mínimo de escenas

**D2:** seleccionar una escena de Pleamar que obligue a configurar localización, NPC, objetos, interacción, posibles pruebas/CD y ramas; mantener el PDF como autoridad del contenido. Construir primero con herramientas existentes, registrar el trabajo repetitivo y documentar una segunda escena comparable. **Gate D2:** escena recorrible y reproducible por Codex desde sus datos; el DM conserva las decisiones y el contenido privado no aparece en jugador/proyector.

**F2:** con esas dos escenas, elaborar una plantilla declarativa mínima y validadores: identificadores estables, referencias a assets, superficies/rutas, triggers, estado inicial, interacciones, transiciones y vistas privadas/públicas. No prometer extracción íntegra automática del PDF ni construir un editor 3D general. Mantener compatibilidad con las escenas existentes. **Gate F2:** un caso sintético y dos escenas reales usan el mismo contrato; pruebas negativas para IDs ausentes, transición imposible y filtración de secreto.

**INT2:** comparar tiempo de configuración y pasos manuales de la escena nueva frente a la anterior, registrando contexto y diferencias. Si la plantilla no ahorra trabajo real, corregirla antes de extenderla al Observatorio.

### C3 — recursos reutilizables antes de generar más

**D3:** completar recursos necesarios según escenas reales, con manifest de procedencia, licencias, referencia visual canónica, nombres, escala, pivote y frames útiles; reutilizar biblioteca y Drive antes de solicitar generación. Enumerar casos donde música, viento, lluvia, oleaje, iluminación y animaciones requieren demasiadas operaciones. Producir solo las poses/efectos usados por la aventura.

**F3:** extender lo instalado, prioritariamente Babylon y el sistema actual de audio, con presets configurables, entrada/salida de ambiente, triggers autorizados, importación de hojas de sprites, validación de dimensiones/alpha y herramientas para ver ciclos y anclas. No generar assets específicos de la campaña ni adquirir librerías nuevas sin superar el gate de reutilización. **Gate F3:** preset y pipeline documentados, prueba con dos escenas distintas, sin alterar geometría ni revelar secretos; coste visual y de rendimiento observado, no supuesto.

**INT3:** Dani incorpora un recurso común y registra ahorro real de tareas, intervenciones del DM y comportamiento en proyector/móvil; la aprobación del arte sigue siendo específica de cada campaña.

### C4 — de una campaña terminada a un generador práctico

**D4:** integrar capítulos pendientes de Stormwreck cuando los gates previos lo permitan y revisar la continuidad del guardado, viajes, narrativa y recursos. Usar D8 Night solo como piloto de reutilización acotado; sus F3–F7 permanecen como ruta independiente y no bloquean el Pecio.

**F4:** preparar un comando o plantilla documentada que cree la estructura de una campaña, manifiestos de escenas/recursos, configuración de guardado aislado, checklists de permisos, pruebas sintéticas y guía para Codex. Nada de copiar contenido privado ni prometer una aventura completa a partir de un PDF. **Gate F4:** crear desde cero un pequeño módulo de prueba, arrancarlo en DM/jugador/proyector y demostrar que sus secretos/saves no cruzan a Stormwreck ni D8.

**INT4:** Dani o un Codex que no haya escrito el generador sigue la guía sin pasos implícitos y anota bloqueos reales; Fer cierra los bloqueos genéricos y publica versión compatible.

## 3. Dependencias: qué espera cada uno y qué no

| Necesidad | Puede avanzar Dani sin Fer | Entrega de Fer que acelera | Regla de bloqueo |
|---|---|---|---|
| M5/M7 Pecio | Sí: arte, QA, correcciones de campaña y pruebas físicas. | F1 reduce riesgos de regresión y empaquetado. | No retrasar M7 por esperar F2–F4. |
| Pleamar | Sí: análisis canónico, greybox y primera escena. | F2 simplifica la segunda y siguientes escenas. | Congelar temporalmente el contrato de datos si se usa en una escena activa. |
| Observatorio | Sí: análisis y assets específicos cuando Dani lo priorice. | F2/F3 permiten reutilizar escenas, ciclos y efectos. | No convertir F2 o F3 en prerequisito absoluto del análisis narrativo. |
| D8 Night | Sí: camino propio, slot separado. | F1–F4 deben ser agnósticos de campaña. | No mezclar dependencias, notas privadas ni guardados. |
| Cambio de save/red/permisos | Solo prototipos aislados en rama de campaña. | Fer posee contrato, migración, tests y release notes. | Requiere revisión conjunta y backup antes de adopción. |

**Ruta crítica conjunta:** C0 inventario → F1 primera entrega y D1 M5/M7 en paralelo → INT1 adopción segura → D2 primer caso Pleamar → F2 plantilla probada con ese caso → INT2 → recursos F3/D3 por necesidades demostradas → F4/INT4. La línea D1 no depende de F2/F3/F4.

## 4. Contrato técnico y restricciones para cualquier mejora compartida

1. **No reconstruir lo que ya existe.** Inspeccionar componente actual, alternativas instaladas y fuente autorizada de assets. Registrar estudio/licencia en docs/OPEN_SOURCE_REVIEW.md cuando corresponda.
2. **Un motor, campañas inyectadas.** Conservar la separación de engine/ y apps/ respecto de los IDs y contenido de campaigns/; usar contratos públicos validados y composición privada en servidor. No es necesario crear carpetas nuevas ni migrar a otra arquitectura si la auditoría no lo justifica.
3. **Identidad y versiones.** Contratos compartidos con versiones identificables; cambios compatibles se documentan, cambios incompatibles necesitan estrategia de migración o adaptador. No romper guardados antiguos ni afirmar que revertir código revierte automáticamente datos migrados.
4. **Privacidad y autorización.** Notas DM, perfiles ocultos, botín no revelado, condiciones de aparición y archivos fuente privados no se sirven a jugador/proyector. Cada nuevo campo público, trigger y acción requiere una prueba de permiso.
5. **Juego de mesa, no videojuego.** Ningún lanzamiento automático de dados, éxito/fallo automático, IA que decide por jugadores ni transición narrativa irreversible sin confirmación del DM. Priorizar 2–5 interacciones del DM por escena fuera de combate/tiradas.
6. **CANON frente a VTT_AMBIENCE.** Reglas, hechos y consecuencias de la aventura no pueden mezclarse con lluvia, cámara, iluminación, animaciones o ambientación generada. En una escena nueva, referenciar PDF y páginas solo cuando estén verificadas.
7. **Assets auditables.** Referencia visual obligatoria si hay imagen aprobada, derechos y origen registrados, nombres coherentes y assets separados del suelo. Mantener escala/cámara/pivote entre frames; no simular resolución mediante ampliaciones.
8. **Validación auténtica.** Pruebas unitarias e integraciones en puerto libre y directorio temporal, builds/typechecks y QA navegador. Los resultados de hardware real y aceptación visual quedan separados; no marcar PASS sin ejecutarlos.
9. **Sin interferir con la mesa.** No iniciar/reiniciar servidor habitual, ocupar el puerto 3000, editar data/saves ni restaurar partidas reales en tareas de Codex. Conservar las copias y etiquetas de versiones aceptadas.
10. **Superficie mínima de cambio.** Cada PR debe tener un objetivo y archivos delimitados. Evitar modificar en la misma PR engine, campañas y formato de save salvo que una migración explícita lo exija.

**Propuesta de interfaz de escenas (F2; todavía no es un esquema implementado):** sceneId, campaignId, surfaces, assetRefs, initialState, triggers, interactions, transitions, dmPrivate y publicPresentation; cada trigger indica qué automatiza el VTT, qué decisión espera del DM y qué estado persiste. Fer define nombres y tipos finales tras F0; Dani aporta dos fixtures reales antes de congelarlos.

## 5. Flujo GitHub + Codex que evita pisarse

- **Rama principal actual:** main es la rama del repositorio, no equivale por sí sola a una RC aceptada por el usuario. La referencia de recuperación aceptada se conserva por separado.
- **Árboles de trabajo:** usar worktrees distintos y ramas distintas para las dos sesiones de Codex, por ejemplo dani/pecio-m7 y fer/contratos-escena. No compartir directorio de compilación ni carpeta de datos de QA si trabajan a la vez.
- **Áreas de propiedad:** Dani lidera campaigns/stormwreck-isle y contenido de campaña; Fer lidera engine, contratos transversales y utilidades genéricas. apps y scripts de integración pueden requerir revisión cruzada. Los nombres concretos se ratifican en F0 sin mover carpetas preventivamente.
- **PR de Fer:** debe indicar consumidor real, alternativa reutilizada, API/contrato antes/después, compatibilidad de saves, pruebas realizadas y su alcance, guía de adopción y plan de reversión. Pedir revisión de Dani cuando cambie la experiencia del DM o su campaña.
- **PR de Dani:** identifica escena/capítulo, fuente canónica y límites de VTT_AMBIENCE, recursos y procedencia, nuevas dependencias, recorrido funcional y necesidades genéricas encontradas. No introducir APIs compartidas sin pasar por la rama/revisión de Fer.
- **Primero test y adopción aislada:** la PR común se prueba sobre campaña sintética y un escenario real de Stormwreck en un puerto/datos temporales. Solo después de fusionarse y documentarse, Dani actualiza su worktree cuando le convenga. Si hay cambio rompedor, feature flag/adaptador o ventana de integración acordada.
- **Incidencias con dueño único:** tipo campaign/engine/integration; urgencia blocker/normal/later; estados backlog → ready → in progress → review → integrated → accepted. Integrated significa que el código entró; accepted exige el gate del consumidor pertinente.
- **Acuerdos de sincronización:** al inicio de cada ciclo, escoger una necesidad real que se vuelva común; al cerrar cada PR, Fer documenta interfaz y Dani responde con prueba de adopción, fallo reproducible o motivo de aplazamiento. Resolver cambios de contrato antes de que Codex edite ambos lados.
- **Dos relevos separados:** los encargos iniciales para ambos agentes están en docs/CODEX_DANI_NEXT.md y docs/CODEX_FER_NEXT.md. El docs/NEXT_MODEL_PROMPT.md preexistente es un relevo histórico/operativo del Pecio y no debe convertirse en documento que Fer y Dani sobrescriben simultáneamente.

### Plantilla mínima para una incidencia de mejora

**Problema observado:** escena y pasos de reproducción; **impacto:** minutos o intervenciones perdidas, bug o limitación; **ámbito:** campaña o transversal; **solución actual:** si existe; **contrato solicitado:** entrada/salida, privacidad y estado; **criterio de aceptación:** comportamiento observable, pruebas automáticas y, si procede, hardware/arte; **dependencias:** tickets/PR; **responsable:** Dani o Fer; **prioridad:** blocker / normal / later.

**Decisión de extracción:** un bug universal o código realmente repetido en dos escenas/campañas justifica estudiar un módulo compartido; una necesidad singular permanece en la campaña salvo que ambos acuerden lo contrario. No abstraer por anticipación.

## 6. Gates de calidad y definición de «terminado»

| Gate | Responsable principal | Evidencia mínima |
|---|---|---|
| **G0 — Diseño y alcance** | Autor de la tarea | Caso real, requisitos, superficie de cambio, fuente/licencia, dependencias y dueño. |
| **G1 — Contrato** | Fer si cambia motor; Dani si solo campaña | Esquema/acciones/privacidad/compatibilidad y consecuencias para saves; review cruzada si corresponde. |
| **G2 — Técnica** | Implementador | Pruebas nuevas y de regresión relevantes, typecheck, build e integración en datos/puertos temporales. Conservar tests existentes. |
| **G3 — Adopción real** | Dani | Recorrido desde una campaña real, sin modificar su mesa o progreso; comparación antes/después y rollback conocido. |
| **G4 — Experiencia** | Dani | Para M5: aprobación visual explícita. Para M7: prueba física documentada; no sustituir por capturas, emulación o un contador de unit tests. |
| **G5 — Publicación** | Fer para motor; Dani para campaña | Commit/PR/versiones identificables, notas, migración si existe, guía reproducible y estado actualizado. |

Un hito puede estar **técnicamente integrado**, **adoptado en prueba** o **aceptado para partida**: no son sinónimos. Si falta evidencia se escribe PENDIENTE, no PASS. Si una puerta, luz, sprite o mapa puede afectar a navegación, ejecutar sus regresiones aunque el cambio se presente como arte.

**Comandos de referencia ya documentados en README** (no afirmar que se han ejecutado en esta entrega documental): corepack pnpm test, corepack pnpm build, node scripts/audit-baseline.mjs, node scripts/run-integration.mjs y node scripts/run-object-integration.mjs. Cada PR escoge los adicionales pertinentes; guardar comando, fecha, versión y resultado. En M7 seguir el guion de campaña y separar medición de FPS de impresión de fluidez.

## 7. Cuadro de seguimiento y prueba de valor

Registrar en una tabla breve por ciclo (issue o nota de integración) el **antes**, **después** y la evidencia. No inventar porcentajes de productividad.

| Indicador | Línea base en INT0/primera escena | Señal de mejora |
|---|---|---|
| Tiempo para configurar una escena comparable | Cronometrar preparación y correcciones, especificando complejidad. | Menos tiempo sin reducir fidelidad ni funciones. |
| Repetición de código y configuración | Contar duplicados y pasos manuales similares. | Menos duplicación en el segundo uso. |
| Interacciones DM fuera de combate/dados | Contar operaciones realmente necesarias en el recorrido. | Cerca de 2–5 por escena cuando el diseño lo permita. |
| Regresiones | Incidencias por integración y pruebas afectadas. | Cambios compartidos adoptados sin romper Pecio, save ni D8. |
| Reutilización efectiva | Citar módulo, versión, escenas y esfuerzo de adaptación. | Al menos dos consumidores reales en INT3; un piloto independiente en INT4. |
| UX/rendimiento físico | Solo mediciones del dispositivo y reproducción explícita. | Comparación en el mismo dispositivo/escena; no declarar objetivos FPS sin datos. |

**Definición de éxito de la colaboración:** no es que Fer produzca muchas librerías o que Dani genere muchos assets; es que una funcionalidad común pasa por F → PR → QA → adopción por Dani → segunda reutilización, conservando seguridad, jugabilidad y trabajo ya aceptado.

## 8. Riesgos, prioridades y límites de alcance

| Riesgo | Prevención y responsable |
|---|---|
| Fer reforma todo el proyecto mientras Dani juega/desarrolla | F0 inventario primero, F1 pequeña PR y migraciones posteriores justificadas; worktrees separados. |
| Dani programa una segunda versión de una herramienta ya existente | Buscar implementación primero; si urge, adaptador local temporal y ticket a Fer. |
| Cambio compartido rompe una campaña o su save | Tests sintéticos + Stormwreck + migración/rollback + adopción en copia; nunca tocar slot real. |
| La biblioteca visual genera más trabajo del que ahorra | F3 solo responde a fricción real de dos escenas; medir el segundo uso. |
| Calidad técnica sustituye aceptación humana | Gates visual, físico y de experiencia explícitos, con estado PENDIENTE hasta observación. |
| Se filtran PDF, notas, mapas o pistas | Revisión de derechos, rutas estáticas y snapshots DM/player/proyector; no copiar fuentes privadas en documentación pública. |
| Se confunden las prioridades entre Pecio, Pleamar y D8 | ROADMAP_V1 sigue mandando sobre M5–M7; Dani decide su siguiente campaña; D8 no condiciona cerrar Pecio. |

**Fuera del alcance de esta versión de roadmap:** reemplazar Babylon, convertir todo el VTT en videojuego, crear IA con autoridad narrativa, prometer importación fiel de cualquier PDF, aceptar el arte sin Dani, comprometer plazos sin medición o desplegar automáticamente cambios no probados en una mesa real.

## 9. Primera acción concreta y relevo

1. **Dani / D0:** iniciar el encargo de docs/CODEX_DANI_NEXT.md, sin abandonar M5/M7. Salida: necesidades reales clasificadas y registro de aceptación física/visual cuando se realice.
2. **Fer / F0:** iniciar en su worktree docs/CODEX_FER_NEXT.md. Salida: mapa de módulos, primer contrato y PR pequeña con tests/procedimiento de adopción.
3. **INT0:** escoger juntos la primera mejora transversal a partir del Pecio; abrir issue con dueño y criterio verificable. No crear automáticamente un calendario largo de issues especulativas.
4. **INT1:** Fer fusiona una entrega segura; Dani la ensaya en copia temporal del Pecio y registra beneficio o incidencia. Solo entonces tomar el siguiente bloque.

**Regla de mantenimiento:** Dani mantiene el avance real de campaña en ROADMAP_V1/PROJECT_STATE; Fer actualiza en este documento solo los hitos de coordinación y su backlog real. Revisar este roadmap al terminar cada INT, evitando que una fecha antigua parezca estado actual. Mantener los encargos de Codex separados y nombrar el siguiente responsable/modelo recomendado tras cada bloque, sin cambiar de modelo automáticamente.
