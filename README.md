# D&D Immersive Engine

Última versión aceptada operativamente por el usuario: **Alpha 0.2.0 RC2**. Esta carpeta contiene una versión DEV que todavía no es una RC aceptada. La campaña **Los Dragones de la Isla de las Tempestades** reúne el Retiro del Dragón, el mapa continuo del Rosa de los Vientos (C1–C9 y cofa) y cinco mapas de campamento/descanso. Todos se cargan desde el mismo guardado `stormwreck-isle` y se distinguen en categorías de la consola DM. **D8 Night** sigue siendo una campaña privada separada. El aspecto y la fluidez en los dispositivos de mesa aún requieren aceptación; consulta [ROADMAP_V1.md](ROADMAP_V1.md) y el histórico de [PROJECT_STATE.md](PROJECT_STATE.md).

La mesa presencial para Windows permite al DM controlar la escena, al proyector mostrar el mapa público y a cada jugador mover su ficha desde un móvil de la misma red. La consola agrupa los mapas de la aventura y los campamentos; al seleccionar otra localización el DM cambia la escena para el grupo. Las tiradas, turnos y decisiones siguen en la mesa.

## Roadmap compartido Dani + Fer

La coordinación entre **Dani (campañas)** y **Fer (plataforma y generador de campañas)** está en [ROADMAP_COMPARTIDO_DANI_FER.md](ROADMAP_COMPARTIDO_DANI_FER.md). Complementa, sin sustituir, el roadmap del Pecio [ROADMAP_V1.md](ROADMAP_V1.md). Incluye ciclos de trabajo paralelos, dependencias, criterios de aceptación y adopción segura de mejoras compartidas.

Los encargos iniciales para sus sesiones separadas de Codex son [Dani / D0](docs/CODEX_DANI_NEXT.md) y [Fer / F0](docs/CODEX_FER_NEXT.md). El relevo [NEXT_MODEL_PROMPT.md](docs/NEXT_MODEL_PROMPT.md) permanece orientado al Pecio y no debe sobrescribirse entre ambos agentes.

## Ejecutar en Windows

La persistencia está implementada y probada automáticamente; no sustituye la aceptación de [puerta, móvil y servidor de mesa](docs/ALPHA_0_3_ACCEPTANCE_PLAN.md). Para actualizar mientras juegas, vuelve a abrir `INICIAR.cmd`, elige la misma campaña y pulsa **A**. Primero comprueba y compila una candidata en una carpeta separada mientras la mesa anterior sigue abierta. Sólo después solicita guardar y cerrar: si falla el guardado, cancela la actualización y conserva la mesa. Instala la candidata al confirmar el cierre; si falla el intercambio de carpetas, intenta restaurar la compilación anterior, que queda conservada en `runtime`. No cierres las pestañas; jugador y proyector recargan la aplicación al reconectar con el servidor nuevo. El proyector puede pedir que prepares el audio otra vez. Los assets con nombres fijos se revalidan para recoger cambios de texturas y sonido. Si Windows recicló el PID de un bloqueo antiguo, el lanzador archiva sólo ese bloqueo en `recovery`; no termina un proceso ajeno que ocupa el puerto.

**Primera actualización desde un servidor anterior al cierre confirmado:** pulsa «Guardar ahora» en DM, espera la confirmación, exporta una copia privada y cierra esa mesa manualmente. Después abre `INICIAR.cmd`. El nuevo lanzador rechaza el cierre automático de servidores antiguos porque no pueden confirmar que el último guardado terminó correctamente. `INSTALAR.cmd` también exige cerrar las mesas antes de sustituir dependencias.

Estos pasos ejecutan la versión DEV de la carpeta actual. Antes de actualizar una instalación anterior, exporta y guarda una copia privada fuera del programa.

1. Instala Node.js 24.21.0 o posterior de la rama 24 desde [nodejs.org](https://nodejs.org/). Los lanzadores rechazan expresamente el runtime privado de Codex, porque Windows no puede usarlo al abrir el juego con doble clic.
2. Haz doble clic en `INSTALAR.cmd` una vez para instalar las dependencias fijadas por `pnpm-lock.yaml` y generar el audio original. No necesita abrir un puerto del router ni cambiar el firewall automáticamente.
3. Haz doble clic en `INICIAR.cmd` y elige **Los Dragones de la Isla de las Tempestades** (incluye aventura y campamentos) o **D8 Night**. Antes de abrir el servidor, compila los archivos más recientes. En la consola DM, el selector separa «Aventura» de «Campamentos y descansos». La consola muestra las direcciones locales; el panel del DM se abre sin contraseña hasta nuevo aviso.
4. Abre `/dm` en el PC, inicia el proyector en `/projector` con el botón de preparación de audio y comparte el QR de `/player` con los móviles.

Si Windows pregunta por el firewall, permite redes privadas para Node.js. Todos los dispositivos deben estar en la misma Wi-Fi; una red de invitados o el aislamiento de clientes puede impedir la conexión. El servidor escucha en el puerto 3000 por defecto; se puede cambiar con `PORT=3124` desde una consola antes de ejecutar `node dist/server/apps/server/index.js`. Por defecto no hay contraseña de DM. Si más adelante quieres recuperarla, define `DM_PASSWORD` antes de arrancar: la pantalla de clave reaparecerá automáticamente.

Para desarrollo, los comandos equivalentes son:

Cierra las mesas antes de instalar dependencias o compilar directamente con
estos comandos; para actualizar una mesa abierta usa **A** en `INICIAR.cmd`.

```powershell
corepack pnpm install --frozen-lockfile
corepack pnpm build
node dist/server/apps/server/index.js
```

## Reloj y clima de campaña

La consola DM muestra el reloj compartido con jugadores y proyector. En exploración avanza 1:1; se pausa durante decisiones modales y combate, y el DM puede pausar, adelantar o fijar la hora. Al cerrar cada asalto avanza seis segundos. Los botones de descanso solo adelantan el tiempo: el DM mantiene las decisiones de reglas, dados y recursos. El descanso guiado del campamento ya añade ocho horas al completarse.

Los controles del tiempo atmosférico regulan precipitación, temperatura, niebla e inundación. La nieve se acumula según su intensidad y el terreno solo pasa a ser difícil cuando alcanza 15 cm y el DM activa esa regla. El reloj y el clima se guardan con la campaña, sin contar el tiempo que el servidor permanece apagado. Detalles y límites de aceptación: [Reloj y clima](docs/GAME_CLOCK_AND_CLIMATE.md).

Las pruebas automatizadas se ejecutan con `corepack pnpm test`, `node scripts/audit-baseline.mjs`, `node scripts/audit-alpha02.mjs`, `node scripts/run-integration.mjs`, `node scripts/run-object-integration.mjs`, `node scripts/alpha03-smoke.mjs` y `node scripts/audit-alpha021.mjs`. Las integraciones crean servidores temporales en loopback y puertos libres; nunca usan la mesa abierta en 3000.

## One-shot D8 Night

El selector inicial de `INICIAR.cmd` abre una de las campañas disponibles. `INICIAR-ONE-SHOT.cmd` se conserva como atajo para D8 Night. Esa campaña usa un slot separado (`d8-night-private`), por lo que guardar/restaurar ahí no mezcla la partida con Stormwreck ni sus campamentos. Es una preparación DEV: el módulo fuente se diseñó para una persona jugadora y un DM; este pack usa de forma provisional los tres personajes existentes, sin balance de encuentro terminado. La guía del DM está en `campaigns/one-shot/private/DM_RUNBOOK.md`. No redistribuyas el PDF, mapas ni assets de esa campaña.

## Guardar, exportar y recuperar en DEV1

En DM, «Guardar ahora» confirma una generación de disco; el guardado automático reúne cambios cercanos. El reloj en marcha recibe una copia cada 30 segundos sin llenar el historial con puntos sin avance de juego; al cerrar se guardan también los últimos segundos, el clima y el audio. «Exportar copia privada» descarga el estado actual aunque aún esté pendiente de disco: guarda ese JSON fuera del programa y no lo compartas con jugadores. «Restaurar copia» primero valida y muestra campaña, escena, fecha y avisos de adaptación; Cancelar no cambia nada. Confirmar archiva el mundo anterior y escribe el estado adaptado a la versión actual. Se conservan los personajes de los navegadores conectados que siguen existiendo; tras un reinicio cada navegador intenta recuperar su personaje recordado si está libre. No se guardan credenciales ni conexiones en el archivo. El historial Deshacer y los controles en curso se limpian deliberadamente.

Los checkpoints locales están en `data/saves/stormwreck-isle/` por defecto, fuera de las rutas web y excluidos de Git. `DUNGEONS_DATA_DIR` admite una ruta **absoluta** alternativa; no apuntes a `dist`, `art` ni a una carpeta compartida pública. No edites ni borres `active.json`, `active.bak.json` o los temporales para «arreglar» una partida: el DM puede inspeccionar evidencias privadas y previsualizar el backup cuando el servidor indica recuperación. Exporta una copia antes de actualizar; la versión 0.2.1 no entiende este save y un rollback de código no convierte automáticamente los datos.

Las mejoras de imagen y presentación suelen conservar compatibilidad. Los cambios de formato, identificadores, geometría o reglas persistidas requieren una migración y pruebas: no basta con compilar. Las adaptaciones existentes conservan una copia del original; si se recupera automáticamente un respaldo, el DM ve un aviso para revisar el avance. Un guardado de formato, estado de campaña o geometría posterior al VTT instalado bloquea la carga automática y mantiene sus archivos. [Auditoría de guardado y actualización](docs/evidence/SAVE_UPDATE_AUDIT_20261013.md).

Si aparece un bloqueo `writer.lock` después de un cierre forzado, comprueba que no hay otro servidor usando esa misma carpeta. El comando local `node scripts/recover-writer-lock.mjs "RUTA_ABSOLUTA_DEL_SLOT"` sólo informa; con `--confirm` archiva únicamente un bloqueo cuyo PID ya no existe, nunca borra la partida. No lo ejecutes contra una instancia viva. En DEV1 todo este recorrido fue probado en carpetas temporales; la aceptación física sigue pendiente.

## Base histórica Alpha 0.2.1

RC1 conserva Alpha 0.2.0 y unifica timón, puerta y caja como objetos preparados por escena. Sus cambios se validan en servidor, se publican sólo al aplicar y admiten daño, destrucción y deshacer sujeto a ocupación. Los restos son atravesables por personajes, pero reservan su lugar frente a otros objetos. El bloqueo de puerta sigue siendo secreto del DM.

La automatización y el navegador no sustituyen la prueba de móvil/proyector/audio físicos. [docs/ALPHA_0_2_1_PHYSICAL_CHECK.md](docs/ALPHA_0_2_1_PHYSICAL_CHECK.md) contiene el recorrido concreto; [docs/ACCEPTANCE_RESULTS.md](docs/ACCEPTANCE_RESULTS.md) distingue evidencia técnica y hardware pendiente.

Antes de crear o incorporar un componente o recurso nuevo, aplica también el gate de reutilización de [ROADMAP_V1.md](ROADMAP_V1.md) y registra la decisión en [docs/OPEN_SOURCE_REVIEW.md](docs/OPEN_SOURCE_REVIEW.md): estudiar no implica adoptar. Los PDF y las notas de campaña privadas permanecen fuera del servidor web y no se redistribuyen.
