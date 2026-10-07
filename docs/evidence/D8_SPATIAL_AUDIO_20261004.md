# D8 Night — verificación de navegación, oclusión y audio

Fecha: 04/10/2026. Escenarios Babylon V41. Estado: correcciones técnicas verificadas; aceptación visual/hardware pendiente.

## Resultado

Se conserva la arquitectura, el servidor autoritativo, el terreno, el protocolo y la persistencia existentes. No se incorporan motores, paquetes ni assets externos. El compilador de geometría espacial utiliza el contrato de terreno común y puede reutilizarse en Stormwreck; las posiciones de obstáculos y apoyos son configuración exclusiva de D8.

No se alteró el arte de Cena, el contenido narrativo del módulo, los datos reales de `data/saves` ni la mesa del puerto 3000. Los cambios compartidos de animaciones/áreas persistentes de otra tarea se conservaron y se incluyeron en las pruebas, sin atribuirlos íntegramente a esta pasada.

## Existente y corregido

- Existían zonas navegables, colisión, alturas, línea de efecto y renderer. Se eliminó su divergencia: algunas zonas todavía seguían el dibujo antiguo y no los muebles/paredes efectivos, especialmente en la taberna dedicada.
- Las casillas mantienen su número pero miden exactamente 1,5 m en ambos ejes. No se inventa un segundo tablero.
- Los troncos bloquean; copas/tejados elevados no se convierten automáticamente en paredes de suelo. Barras, particiones y obstáculos físicos sí se representan. Las paredes finas bloquean aristas entre casillas aunque no cubran un centro.
- Agua/peligro quedan bloqueados salvo apoyos expresamente transitables. Se reparó el enlace puente/escaleras/umbral/interior del templo; una discontinuidad de suelo no se convierte en escalera automática.
- Spawns y encuentros usan la componente accesible del escenario. Los actores y objetivos presentes quedan alcanzables; no se exige que toda isla decorativa aislada sea transitable.
- Movimiento del jugador respeta ocupación de PNJ hostiles vivos y D8 no permite diagonales que recorten esquinas bloqueadas.
- Grid, resaltados, pies y selección usan las alturas del terreno. La selección de escaleras se prueba en ocho orientaciones de cámara.
- Guardados antiguos: marcador de grid 3, aplicado una vez. Las coordenadas v2 legales se conservan; las que ahora caen dentro de decorado sólido se recolocan en una casilla legal cercana. No cambia PG, estados, progreso o recursos por esa corrección.
- Oclusión parcial: rayos 3×6 sobre el plano real del sprite orientado a cámara, respetando anchor y tamaño. Se invalida caché al cambiar dimensiones; se mantienen únicamente los fragmentos no ocultos y se retira información cuando la cabeza queda tapada. No sustituye el sistema de visión/fog-of-war individual.
- Audio: los cambios de volumen no reinician el contador de repeticiones. Un cliente tardío entra en la posición temporal correcta, conserva solo las repeticiones restantes y no revive secuencias terminadas. Cargas obsoletas no arrancan SFX retirados.
- Elegir personaje publica inmediatamente un snapshot a los otros roles; ya no espera a la siguiente acción para que DM/proyector vean la ficha.

## Animación/VFX: alcance actual

El catálogo integrado contiene atlas transparentes, gestos y carrera direccional, transiciones de caída/incorporación y efectos por acciones. Las pruebas comprueban manifest, PNG/alpha y selección de animaciones; no certifican su calidad artística. Se corrigió documentación antigua que aún decía que estos ciclos faltaban.

Nube de niebla es un área visual persistente, hasta una hora y vinculada a concentración/guardado. No aplica automáticamente oscuridad u ocultación mecánica. Familiar, disco flotante, efectos creativos y objetos inflamables mantienen resolución guiada por DM; no se inventaron poderes o perfiles de criaturas para llenar el catálogo.

## Verificaciones

| Verificación | Resultado y alcance |
|---|---|
| Vitest completo | PASS: 319 pruebas, 37 archivos, cero fallos; JSON en `output/d8-spatial-qa/final-tests.json` |
| Tipos cliente y servidor | PASS, exit 0 |
| Builds aislados | PASS: Vite a `output/d8-spatial-qa/web` y servidor a `dist/verification-server`, exit 0; sin recompilar o cerrar la mesa real |
| Oclusión | PASS: pivotes .84/.9/1, ocho orientaciones, tres inclinaciones, máscara parcial y cambio de pose; prueba adicional de intersección con malla Babylon real mediante NullEngine |
| Terreno | PASS: seis mapas, cuadrados reales, actores/objetivos accesibles, taberna/pared fina/agua, ocupación y migración de save idempotente |
| Audio | PASS: 14 regresiones, incluyendo pausa/carga tardía, repeticiones, secuencias terminadas y pasos sin duplicados |
| Integración D8 por red | PASS: DM, dos jugadores y proyector, arco legal con d20/daño privado/idempotencia, seis escenas/cuatro objetivos/final, restore completo, diez saves y reinicio/autocarga |
| Smoke de aventura | PASS: seis mapas, configuración pública, 70 assets de audio y separación de guardados |
| Playground | PASS: VERSION 41, current idéntico a v41, unicode decodifica code, fuentes incrustadas coinciden y v40 archivado |

Las integraciones usan puertos temporales y carpetas de guardado desechables. El fixture del arco se mueve por una ruta legal antes de atacar: no se flexibiliza la regla para disparar desde el puente a través del muro.

Integración y smoke repetidos sobre la compilación final: ambos exit 0. El aviso de Vite sobre `/art/ship/loot-atlas-m5.svg` permanece como referencia resuelta en runtime de Stormwreck, no como fallo D8. Playground validado desde fuentes locales; no se publicó una nueva versión en GitHub. El lanzador normal recompila estos cambios al siguiente arranque seguro.

## Limitaciones de evidencia

La inspección del navegador alcanzó la pantalla del DM, pero el control del proyector sufrió timeouts. La alternativa de control Windows se detuvo al no poder determinar la URL del navegador con suficiente confianza; no se continuaron entradas de ordenador tras ese aviso. No hay capturas finales que certifiquen los seis mapas ni prueba de clics final en móvil.

Quedan para la pasada manual del usuario: revisar siluetas/oclusiones en cada escena, fluidez y estética de animaciones, escuchar mezcla y efectos con sonido habilitado, y medir rendimiento/legibilidad en móvil y proyector reales. Estos puntos no se marcan completados por las pruebas de geometría o la compilación. Los oclusores curvos se discretizan en cajas/aristas: la configuración es una aproximación táctica explícita, no colisión por píxel de una ilustración.

## Archivos principales de esta pasada

- `engine/shared/spatial-navigation.ts` y su prueba: compilación reutilizable de apoyos, obstáculos y terreno.
- `campaigns/one-shot/playground/d8night.config.ts`, `renderer.ts`, `VERSION` y JSON oficiales V41.
- `campaigns/one-shot/public/pack.ts`: instalación de terreno/rutas/spawns.
- `engine/client/d8-camera.ts`, `apps/web/world.ts`: alturas, picking y máscara de oclusión.
- `apps/web/audio.ts`: secuencias de audio finitas y sincronización temporal.
- `engine/server/game.ts`: ocupación, diagonales, migración y broadcast de claim.
- Pruebas `d8-camera`, `token-occlusion`, `spatial-navigation`, `d8-spatial`, `audio`, `one-shot`, `d8-completion` y `scripts/d8-combat-integration.mjs`.
- Estado, roadmap y lista de pendientes visuales actualizados. No se crea commit/PR ni se publica en GitHub en esta petición.
