# D&D Immersive Engine — Roadmap maestro hacia v1.0

**Archivo recomendado:** `ROADMAP_V1.md`  
**Propósito:** fuente única de verdad del proyecto para que Astra/Codex/otros modelos puedan leer, actualizar y auditar el progreso sin saltarse fases.  
**Última revisión inicial:** 2026-09-13  
**ROADMAP_REVISION:** 1  
**CURRENT_VERSION:** Alpha 0.1  
**CURRENT_STAGE:** Acceptance testing  
**NEXT_TARGET:** Alpha 0.2 — Interactive World  
**PROJECT_STATUS:** ACTIVE  
**ROADMAP_MODE:** Conservative / Reuse-first / Evidence-based

---

## 0. Reglas de uso del roadmap

Este documento manda sobre el orden de desarrollo hacia la v1.0.

### Reglas obligatorias

1. **No avanzar oficialmente de versión hasta superar su Release Gate.**
2. Un elemento solo puede marcarse como `PASS` si existe evidencia verificable.
3. Antes de implementar un bloque importante, se debe ejecutar el **OSS Reconnaissance Gate**.
4. Prioridad:
   1. errores bloqueantes;
   2. estabilidad;
   3. funcionalidad del bloque actual;
   4. mejoras visuales;
   5. funciones futuras.
5. No introducir una dependencia solo porque exista: hay que justificar que ahorra trabajo o reduce riesgo.
6. No reescribir arquitectura ya validada sin registrar el motivo.
7. Los cambios del mundo durante una partida deben seguir bajo control del DM.
8. La IA puede **proponer** y **preparar** cambios; no debe ejecutar modificaciones irreversibles sin aprobación del DM.
9. Las funciones no necesarias para alcanzar la v1.0 van al backlog posterior, salvo que desbloqueen un requisito actual.
10. Cada sesión de desarrollo debe terminar actualizando este archivo.

### Estados permitidos

- `[ ] TODO`
- `[~] EN PROGRESO`
- `[x] PASS`
- `[!] BLOQUEADO`
- `[-] APLAZADO`

### Formato mínimo de evidencia

Cada check relevante debe poder asociarse, cuando proceda, a:

```text
EVIDENCE:
- test:
- visual:
- manual:
- file:
- benchmark:
- notes:
```

---

# 1. Categorías permanentes

| Código | Categoría | Alcance |
|---|---|---|
| CORE | Motor base | servidor, escenas, grid, estado, eventos |
| NET | Red y dispositivos | móviles, proyector, sockets, reconexión, latencia |
| DM | Herramientas del DM | permisos, edición, control de escena |
| PLAYER | Experiencia jugador | móvil, movimiento, acciones autorizadas |
| WORLD | Mundo interactivo | objetos, estados, colisiones, destrucción |
| AI | Inteligencia artificial | interpretación de prompts, Codex/Astra/MCP |
| VISUAL | Gráficos | sprites, capas, iluminación, efectos |
| AUDIO | Audio | música, ambiente, SFX |
| CONTENT | Campaña | mapas, criaturas, escenas, Stormwreck Isle |
| SAVE | Persistencia | guardar/cargar campaña y estados |
| EDITOR | Creación de contenido | importación, grids, hotspots, objetos |
| RULES | Reglas D&D | resolución, SRD 2024, checks, acciones |
| QA | Pruebas | tests, dispositivos reales, FPS, regresiones |
| OSS | Open Source & Reuse | búsqueda, licencias, adopción/rechazo |
| RELEASE | Distribución | Windows, instalación, documentación, estabilidad |

---

# 2. Situación inicial registrada

## Alpha 0.1 — Base técnica

**Estado:** funcional candidata para mesa local.

### Ya implementado

- [x] Servidor local Node/TypeScript.
- [x] Express + Socket.IO.
- [x] Vistas separadas para DM, Player y Projector.
- [x] PixiJS como motor de render.
- [x] Escenas básicas.
- [x] Grid táctico de 1,5 m.
- [x] Movimiento cardinal autoritativo.
- [x] Pasos de movimiento de 300 ms.
- [x] Límites y obstáculos básicos.
- [x] Cámara fija / semi-fija / seguimiento.
- [x] Reveal/hide.
- [x] Timón con resolución en mesa.
- [x] PG e inventarios privados.
- [x] Audio base con música/ambiente/SFX.
- [x] Separación de contenido privado del paquete público.
- [x] Typecheck.
- [x] Pruebas unitarias.
- [x] Build cliente y servidor.
- [x] Integración DM + proyector + múltiples jugadores.
- [x] Reconexión/controlador básica.
- [x] Pruebas visuales principales.

### Pendiente de aceptación manual

- [ ] Instalación limpia en Windows.
- [ ] Móvil físico real.
- [ ] Proyector físico real.
- [ ] Firewall/red Wi-Fi real.
- [ ] Escucha en altavoces físicos.
- [ ] Medición FPS.
- [ ] Medición de latencia p95.
- [ ] Sesión continua de al menos 10 minutos.

### Release Gate — Alpha 0.1

No declarar Alpha 0.1 cerrada hasta que:
- [ ] todas las pruebas manuales anteriores pasen;
- [ ] no existan errores bloqueantes;
- [ ] se documenten incidencias de red/dispositivos;
- [ ] se registre evidencia en `docs/ACCEPTANCE_RESULTS.md`.

---

# 3. OSS Reconnaissance Gate

**Debe ejecutarse antes de cada bloque importante.**

## Procedimiento

- [ ] Buscar soluciones open source actuales relacionadas con el bloque.
- [ ] Revisar actividad reciente del repositorio.
- [ ] Revisar licencia.
- [ ] Revisar compatibilidad con Node/TypeScript/PixiJS.
- [ ] Revisar complejidad de integración.
- [ ] Revisar mantenimiento y dependencias.
- [ ] Comparar reutilizar vs adaptar vs construir.
- [ ] Ejecutar spike/prototipo si la decisión no está clara.
- [ ] Registrar decisión.

## Clasificaciones

- `ADOPT` = usar directamente.
- `ADAPT` = reutilizar/modificar.
- `STUDY` = estudiar arquitectura/algoritmos.
- `REJECT` = no compensa.
- `DEFER` = interesante pero no para la fase actual.

## Plantilla de evaluación

```text
OSS_ID:
Nombre:
Repositorio:
Función:
Licencia:
Última actividad:
Tecnología:
Qué nos ahorra:
Coste de integración:
Riesgos:
Compatibilidad:
Decisión: ADOPT / ADAPT / STUDY / REJECT / DEFER
Motivo:
Evidencia:
```

## Candidatos iniciales a revisar

### VTT / visión / capas
- PlanarAlly — estudiar arquitectura de capas, visión, iluminación, puertas y assets.

### Reglas D&D 2024
- dnd-srd-engine — evaluar motor SRD 5.5e/2024.
- battlecast-engine — evaluar grid, colisiones, LoS, AoE, reglas y MCP.

### Entidades / objetos
- Miniplex — evaluar ECS ligero en TypeScript.
- Matter.js — evaluar solo para física puntual de objetos.

### Editor
- LDtk — evaluar como editor/importador temporal.
- Tiled — evaluar como herramienta de preparación de mapas.

### Persistencia
- SQLite + better-sqlite3 — candidato preferente.

### Audio
- Howler.js — candidato preferente.
- Kenney / OpenGameArt CC0 — biblioteca base de SFX.
- Sonniss GDC bundles — revisar licencia y utilidad para audio profesional.

### Visión / FOV
- rot.js — estudiar/usar algoritmos de FOV/LoS.

### Segmentación / inpainting
- SAM 2 — experimental.
- Inpaint Anything — experimental.
- Objetivo: “despegar” objetos inesperados del mapa.

### IA / integración
- Codex CLI — candidato principal para integración con cuenta ChatGPT.
- MCP TypeScript SDK — candidato para exponer herramientas del VTT a modelos.
- Ollama — fallback local/sin API.

---

# 4. Roadmap de versiones

---

## Alpha 0.2 — Interactive World

**Objetivo:** el mapa deja de ser solo una imagen y empieza a contener entidades/objetos con estado.

### OSS Gate específico
- [ ] Auditar PlanarAlly.
- [ ] Auditar Miniplex.
- [ ] Auditar Matter.js.
- [ ] Decidir ECS propio vs Miniplex.
- [ ] Decidir física puntual propia vs Matter.js.

### WORLD — Entidades
- [ ] Modelo genérico de entidad.
- [ ] ID persistente por entidad.
- [ ] Posición.
- [ ] Tamaño.
- [ ] Rotación.
- [ ] Relación con el grid.
- [ ] Soporte para ocupar múltiples casillas.
- [ ] Profundidad/capa.
- [ ] Hitbox/collider.
- [ ] Propiedades semánticas.
- [ ] Estado estructural.
- [ ] Estado funcional.
- [ ] Efectos superpuestos.

### WORLD — Estados mínimos
- [ ] normal.
- [ ] abierto.
- [ ] cerrado.
- [ ] movido.
- [ ] separado.
- [ ] dañado.
- [ ] destruido.
- [ ] bloqueado.

### WORLD — Estados extendidos
- [ ] ardiendo.
- [ ] mojado.
- [ ] congelado.
- [ ] corroído.

### DM — Control de objetos
- [ ] Seleccionar objeto.
- [ ] Mover.
- [ ] Rotar.
- [ ] Abrir/cerrar.
- [ ] Separar/desmontar.
- [ ] Dañar.
- [ ] Destruir.
- [ ] Editar propiedades.
- [ ] Cambiar colisión según estado.

### VISUAL — Integración
- [ ] Hotspot invisible para objetos integrados en el fondo.
- [ ] Evitar duplicados visuales.
- [ ] Fondo limpio cuando un objeto se separa.
- [ ] Sprite alineado con la ilustración.
- [ ] Respeto de escala/perspectiva.
- [ ] Oclusión/profundidad.
- [ ] Sombra de contacto en objetos movidos.

### Caso de prueba obligatorio 0.2
- [ ] Timón inicialmente integrado visualmente.
- [ ] DM lo selecciona.
- [ ] DM lo arranca.
- [ ] El timón pasa a entidad independiente.
- [ ] El fondo revela el soporte sin duplicación.
- [ ] El timón se mueve/rota.
- [ ] Puede colocarse bloqueando una zona.
- [ ] La colisión responde al nuevo estado.
- [ ] Todos los clientes ven el mismo resultado.

### Release Gate — Alpha 0.2
- [ ] Caso del timón PASS.
- [ ] Puerta abierta/cerrada PASS.
- [ ] Caja movible PASS.
- [ ] Objeto destruible PASS.
- [ ] Sin desincronización DM/Player/Projector.
- [ ] Sin regresión del movimiento actual.

---

## Alpha 0.3 — Persistent World

**Objetivo:** todo cambio del mundo sobrevive al reinicio.

### OSS Gate específico
- [ ] Auditar SQLite.
- [ ] Auditar better-sqlite3.
- [ ] Definir esquema mínimo.
- [ ] Definir migraciones/versionado.

### SAVE
- [ ] Guardar campaña.
- [ ] Guardar escena.
- [ ] Guardar posición de PJ.
- [ ] Guardar posición de criaturas.
- [ ] Guardar posición de objetos.
- [ ] Guardar estados de objetos.
- [ ] Guardar objetos destruidos.
- [ ] Guardar objetos movidos.
- [ ] Guardar PG.
- [ ] Guardar inventarios.
- [ ] Guardar reveal/hide.
- [ ] Guardar escena actual.
- [ ] Cargar automáticamente.
- [ ] Backups básicos.
- [ ] Recuperación ante archivo corrupto.

### Caso de prueba obligatorio 0.3
1. Romper puerta.
2. Mover caja.
3. Arrancar timón.
4. Cerrar servidor.
5. Reiniciar.
6. Verificar que todo permanece igual.

### Release Gate — Alpha 0.3
- [ ] Persistencia completa del caso anterior.
- [ ] Cero pérdida de estado conocida.
- [ ] Migración/versionado documentados.

---

## Alpha 0.4 — Map & Scene Editor

**Objetivo:** crear contenido sin programar.

### OSS Gate específico
- [ ] Auditar LDtk.
- [ ] Auditar Tiled.
- [ ] Decidir editor externo temporal vs editor propio.
- [ ] Definir formato de manifiesto de escena.

### EDITOR
- [ ] Importar imagen.
- [ ] Definir grid.
- [ ] Definir escala.
- [ ] Definir bounds.
- [ ] Marcar colisiones.
- [ ] Marcar zonas.
- [ ] Colocar spawn.
- [ ] Añadir hotspots.
- [ ] Añadir entidades.
- [ ] Añadir puertas.
- [ ] Añadir zonas rompibles.
- [ ] Añadir criaturas.
- [ ] Configurar audio.
- [ ] Configurar iluminación base.
- [ ] Exportar manifiesto de escena.
- [ ] Reabrir y editar escena.

### Release Gate — Alpha 0.4
- [ ] Crear una escena nueva sin tocar código.
- [ ] Importarla al VTT.
- [ ] Jugarla con DM/Player/Projector.
- [ ] Guardar cambios.

---

## Alpha 0.5 — AI World Editing

**Objetivo:** el DM describe cambios en lenguaje natural y la IA los traduce a operaciones del motor.

### OSS Gate específico
- [ ] Auditar Codex CLI.
- [ ] Auditar MCP TypeScript SDK.
- [ ] Auditar Ollama como fallback.
- [ ] Definir contrato JSON de acciones.
- [ ] Definir sandbox de operaciones permitidas.

### AI — Interfaz
- [ ] Botón `Editar con IA`.
- [ ] Prompt del DM.
- [ ] Contexto automático del objeto seleccionado.
- [ ] Contexto del estado relevante de la escena.
- [ ] Respuesta estructurada.
- [ ] Validación contra esquema.
- [ ] Preview.
- [ ] Aplicar.
- [ ] Cancelar.
- [ ] Log de acción.

### AI — Primitivas iniciales
- [ ] move.
- [ ] rotate.
- [ ] detach.
- [ ] attach.
- [ ] open.
- [ ] close.
- [ ] damage.
- [ ] destroy.
- [ ] ignite.
- [ ] extinguish.
- [ ] freeze.
- [ ] block.
- [ ] unblock.
- [ ] changeCollision.
- [ ] addDebris.
- [ ] addParticles.
- [ ] addLight.
- [ ] playSFX.

### Seguridad
- [ ] La IA no ejecuta directamente cambios irreversibles.
- [ ] Toda propuesta pasa por validación.
- [ ] El DM aprueba el cambio.
- [ ] Operaciones fuera del contrato se rechazan.
- [ ] Fallback manual siempre disponible.

### Caso de prueba obligatorio 0.5
DM selecciona una caja y escribe:
> "Préndele fuego y haz que emita humo."

Esperado:
- propuesta estructurada;
- preview;
- aprobación;
- fuego/humo/SFX/estado;
- persistencia.

### Release Gate — Alpha 0.5
- [ ] 10 prompts diferentes resueltos con primitivas existentes.
- [ ] Ninguna modificación de código necesaria para esos prompts.
- [ ] Ninguna ejecución no autorizada.

---

## Alpha 0.6 — D&D Action Resolution

**Objetivo:** conectar la libertad de D&D con el mundo interactivo sin convertirlo en videojuego de botones.

### OSS Gate específico
- [ ] Auditar dnd-srd-engine.
- [ ] Auditar battlecast-engine.
- [ ] Revisar SRD 2024 aplicable.
- [ ] Decidir qué reglas integrar y cuáles dejar en mesa.

### RULES / DM
Flujo objetivo:

```text
Jugador declara intención
→ DM decide: automático / tirada / imposible
→ DM fija regla/CD si procede
→ jugador tira en mesa
→ DM marca éxito/fracaso
→ VTT ejecuta consecuencia
```

### Requisitos
- [ ] El jugador no manipula libremente objetos del mundo.
- [ ] El DM ve herramientas completas.
- [ ] El jugador puede declarar intención.
- [ ] El DM puede asignar tirada/CD.
- [ ] El DM puede marcar éxito/fracaso.
- [ ] El DM aplica consecuencia.
- [ ] El DM puede conceder permiso temporal a un jugador.
- [ ] El permiso temporal solo afecta al objeto autorizado.
- [ ] El permiso se revoca al finalizar.

### Release Gate — Alpha 0.6
- [ ] Caso “arrancar timón” completo.
- [ ] Caso “empujar caja”.
- [ ] Caso “romper puerta”.
- [ ] Caso “saltar obstáculo”.
- [ ] El DM mantiene control total.

---

## Alpha 0.7 — Immersive Audio

**Objetivo:** audio contextual real en tres capas.

### OSS Gate específico
- [ ] Auditar Howler.js.
- [ ] Revisar Kenney.
- [ ] Revisar OpenGameArt CC0.
- [ ] Revisar Sonniss y licencia.
- [ ] Definir pipeline de normalización/precarga.

### AUDIO — Capas
- [ ] Música.
- [ ] Ambiente.
- [ ] SFX.

### AUDIO — Funciones
- [ ] Música por escena.
- [ ] Ambiente por escena.
- [ ] SFX por evento.
- [ ] Crossfade.
- [ ] Volumen independiente.
- [ ] Ducking opcional.
- [ ] Precarga.
- [ ] Audio en proyector.
- [ ] Audio controlado por DM.
- [ ] Eventos de objeto → SFX.
- [ ] Eventos de combate → SFX.
- [ ] Eventos ambientales → SFX.

### Release Gate — Alpha 0.7
- [ ] Una escena completa con música + ambiente + SFX.
- [ ] Sin cortes notorios.
- [ ] Latencia de SFX aceptable.
- [ ] Volúmenes independientes funcionales.

---

## Alpha 0.8 — Advanced Visual Systems

**Objetivo:** mejorar lectura, inmersión y estados visuales.

### OSS Gate específico
- [ ] Auditar PlanarAlly para visión/iluminación.
- [ ] Auditar rot.js para FOV/LoS.
- [ ] Decidir implementación propia vs adaptación.

### VISUAL
- [ ] Niebla de guerra.
- [ ] Visión por jugador.
- [ ] Línea de visión.
- [ ] Iluminación.
- [ ] Fuego.
- [ ] Humo.
- [ ] Lluvia.
- [ ] Agua.
- [ ] Marcadores.
- [ ] Áreas de hechizos.
- [ ] Estados visuales de token.
- [ ] Elevación/altura básica.

### Release Gate — Alpha 0.8
- [ ] Escena interior con visión/iluminación.
- [ ] Escena exterior con clima/ambiente.
- [ ] Sin degradación grave de FPS.

---

## Alpha 0.9 — Stormwreck Isle Complete

**Objetivo:** jugar la campaña completa en el sistema.

### CONTENT
- [ ] Retiro del Dragón.
- [ ] Cuevas de Pleamar.
- [ ] Rosa de los Vientos / pecio.
- [ ] Observatorio del Acantilado.
- [ ] Transiciones.
- [ ] Encuentros.
- [ ] Criaturas.
- [ ] PNJ.
- [ ] Objetos importantes.
- [ ] Audio contextual.
- [ ] Iluminación.
- [ ] Estados relevantes.
- [ ] Secrets / reveal.
- [ ] Preparación de sesión.
- [ ] Reanudación entre sesiones.

### QA
- [ ] Sesión real 1.
- [ ] Sesión real 2.
- [ ] Sesión real 3.
- [ ] Sesión real 4 o campaña terminada.
- [ ] Registro de incidencias.
- [ ] Corrección de bloqueantes.

### Release Gate — Alpha 0.9
- [ ] Campaña jugable de principio a fin.
- [ ] Persistencia entre sesiones.
- [ ] Sin necesidad de modificar código durante la partida.
- [ ] Sin errores bloqueantes conocidos.

---

# 5. Beta 0.9.x — Stabilization

**Objetivo:** dejar de añadir grandes funciones y estabilizar.

### Regla principal
Durante Beta no se añaden grandes features salvo que sean necesarias para corregir un bloqueo crítico de v1.0.

### QA
- [ ] Instalación limpia repetible.
- [ ] Reconexión robusta.
- [ ] Móvil Android.
- [ ] Móvil iOS si está disponible.
- [ ] Distintas resoluciones.
- [ ] Proyector/TV.
- [ ] Wi-Fi doméstica.
- [ ] Wi-Fi con latencia peor.
- [ ] Sesión 2 h.
- [ ] Sesión 4 h.
- [ ] Reinicio inesperado.
- [ ] Recuperación de sesión.
- [ ] Carga de campaña.
- [ ] Backup.
- [ ] Regresión completa.

### Rendimiento
- [ ] FPS objetivo definido.
- [ ] Latencia p50 definida.
- [ ] Latencia p95 definida.
- [ ] Consumo de memoria revisado.
- [ ] Precarga de assets revisada.
- [ ] Audio revisado.

---

# 6. Version 1.0 — Definition of Done

La v1.0 significa:

> Un DM instala el programa en Windows, abre una campaña, los jugadores entran desde sus móviles, el proyector muestra el mundo, se puede jugar una campaña completa durante múltiples sesiones, manipular el escenario, guardar todos los cambios y continuar otro día sin utilizar herramientas de desarrollo.

## Obligatorio

### CORE
- [ ] Motor estable.
- [ ] Escenas estables.
- [ ] Grid estable.
- [ ] Entidades estables.

### NET
- [ ] DM estable.
- [ ] Player estable.
- [ ] Projector estable.
- [ ] Reconexión estable.

### WORLD
- [ ] Objetos con estado.
- [ ] Colisiones dinámicas.
- [ ] Movimiento de objetos.
- [ ] Destrucción/transformación.

### DM
- [ ] Control total del mundo.
- [ ] Edición manual.
- [ ] Edición asistida por IA.

### PLAYER
- [ ] Movimiento propio.
- [ ] Interacciones únicamente autorizadas.

### SAVE
- [ ] Guardado.
- [ ] Carga.
- [ ] Backups.
- [ ] Persistencia multisesión.

### EDITOR
- [ ] Crear/importar escena sin programar.

### AUDIO
- [ ] Música.
- [ ] Ambiente.
- [ ] SFX.

### VISUAL
- [ ] Fog/visión suficiente.
- [ ] Iluminación suficiente.
- [ ] Estados visuales suficientes.

### AI
- [ ] Prompt del DM → propuesta estructurada.
- [ ] Validación.
- [ ] Preview.
- [ ] Aprobación.
- [ ] Ejecución.

### CONTENT
- [ ] Stormwreck Isle completa y probada.

### RELEASE
- [ ] Instalador/flujo de instalación estable.
- [ ] Documentación.
- [ ] Cero errores bloqueantes.
- [ ] Pruebas reales multisesión superadas.

Cuando todo esté cumplido:

```text
CURRENT_VERSION: 1.0
CURRENT_STAGE: RELEASE
PROJECT_STATUS: STABLE
```

---

# 7. Investigación experimental posterior a v1.0

Estas funciones no bloquean v1.0.

## Objetos inesperados desde una imagen
- [ ] SAM 2.
- [ ] Inpaint Anything.
- [ ] Seleccionar una parte arbitraria del mapa.
- [ ] Segmentar.
- [ ] Crear clean plate.
- [ ] Crear sprite.
- [ ] Convertirlo en entidad.
- [ ] Validar calidad visual/tiempo de respuesta.

## IA avanzada
- [ ] PNJ IA.
- [ ] Memoria de PNJ.
- [ ] Voces.
- [ ] Dirección musical automática.
- [ ] Generación automática de escenas.
- [ ] Preparación automática de aventuras.

## Física avanzada
- [ ] Objetos rodantes.
- [ ] Caídas.
- [ ] Escombros.
- [ ] Cadenas simples de física.

---

# 8. Backlog post-1.0

Ejemplo inicial:

```text
1.1 — NPC AI
1.2 — Scene generation
1.3 — Advanced physics
1.4 — Voices
1.5 — Campaign importer
2.0 — Major architecture/features if justified
```

Este backlog debe revisarse solo cuando la v1.0 esté estable.

---

# 9. Plantilla obligatoria de cierre de cada sesión de Astra

Al terminar cualquier bloque de trabajo, actualizar:

```text
## DEVELOPMENT LOG ENTRY

DATE:
MODEL:
ROADMAP_REVISION_BEFORE:
VERSION_BEFORE:
TARGET_BLOCK:

WORK_COMPLETED:
-

CHECKS_CHANGED:
- [ ] → [x]

EVIDENCE:
-

TESTS:
-

REGRESSIONS:
-

BLOCKERS:
-

OSS_REVIEW:
-

DECISIONS:
-

FILES_CHANGED:
-

NEXT_RECOMMENDED_STEP:

VERSION_AFTER:
CURRENT_STAGE_AFTER:
ROADMAP_REVISION_AFTER:
```

---

# 10. Regla de revisión del propio roadmap

Astra o cualquier modelo puede proponer rehacer el roadmap, pero no debe hacerlo silenciosamente.

Debe crear una propuesta:

```text
ROADMAP_CHANGE_PROPOSAL

Motivo:
Qué ha cambiado:
Qué fase queda afectada:
Qué se elimina:
Qué se añade:
Impacto:
Riesgo:
¿Rompe compatibilidad?:
Nueva secuencia propuesta:
```

Solo después de aprobarla se incrementa:

```text
ROADMAP_REVISION: N + 1
```

---

# 11. Estado inicial de mantenimiento

```text
ROADMAP_REVISION: 1
CURRENT_VERSION: Alpha 0.1
CURRENT_STAGE: Acceptance testing
NEXT_TARGET: Alpha 0.2 — Interactive World
NEXT_REQUIRED_ACTION:
Completar aceptación manual de Alpha 0.1 antes de declarar oficialmente el inicio de Alpha 0.2.
```

---

# 12. Principios de producto

1. **DM first.** El DM es el árbitro y conserva el control.
2. **Table first.** Dados, decisiones e interpretación siguen teniendo sentido en mesa.
3. **World, not videogame.** El VTT representa un mundo flexible, no una lista de botones predeterminados.
4. **Reuse first.** Buscar antes de construir.
5. **Evidence before progress.** No marcar una fase como completada sin evidencia.
6. **Conservative releases.** Una capa sólida antes de la siguiente.
7. **Visual continuity.** Los objetos interactivos deben parecer parte natural de la ilustración.
8. **AI as assistant.** La IA interpreta y propone; el DM aprueba.
9. **Offline/local where practical.** La mesa debe seguir siendo robusta con infraestructura mínima.
10. **No unnecessary complexity.** No añadir sistemas que no aporten a la experiencia presencial o a la v1.0.

