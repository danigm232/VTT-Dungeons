# Alcance y aceptación de Alpha 0.1

Actualizado 2026-09-13. Este alcance se implementa con [TACTICAL_PIXEL_SPEC.md](TACTICAL_PIXEL_SPEC.md). La corrección del usuario exige sprites pixel art, grid permanente y movimiento real por casillas; la candidata Alpha 0.1 los incorpora. La evidencia y los límites restantes están en [ACCEPTANCE_RESULTS.md](ACCEPTANCE_RESULTS.md).

## Demostración cerrada

Dos escenas pequeñas del mismo pecio: `wreck-approach` (presentación exterior, jugadores en bote/posición de espera sin navegación) y `wreck-deck` (explorable C1, C2 y C3). La primera reutiliza geometría del pecio con encuadre exterior; no crear navegación naval. La segunda es el núcleo jugable. Cambiar entre ambas prueba carga, sincronización y spawns sin desarrollar otro capítulo. Controles de aproximación indican espera; al pasar a cubierta se habilitan.

Representar casco varado sobre rocas y huesos, madera húmeda oscura, algas/percebes, velas/jarcias, mástiles diferenciados, cofa, barandillas rotas, balista inútil y timón. Océano y espuma animados. Pixel art detallado por capas con sprites de aventureros y caminar/idle reconocibles; cuadrícula permanente integrada. El diorama low-poly y los cuadrados planos de colores no satisfacen la nueva referencia.

Interacción principal: timón C3. Una celda autorizada adyacente, en misma superficie y sin paso pendiente, habilita INTERACTUAR. Servidor genera solicitud al DM y confirmación privada neutra. DM narra y resuelve dados físicos. Control DM para marcar timón sujetado/caído e impacto. Reintento no duplica. No otorgar botín ni tirar salvación automáticamente. C4–C7 y descenso C8/C9 fuera, con accesos representados; restricción técnica en notas DM, sin inventar puertas selladas oficiales. El umbral continuo anterior de 1,8 m se sustituye por interactionCells de v2.

Criatura: arpía inicialmente ausente, revelable/ocultable y reposicionable por DM sobre cubierta. Aparición manual al momento elegido, con recordatorio privado del disparador oficial. No introducir zombi en C1 como si fuera el encuentro oficial. No combatir ni alterar PG automáticamente.

## Interfaces

- DM: autenticación, IP/QR de jugadores, enlace proyector, lista de sesiones/personajes, escena, revelar/ocultar, seleccionar y reposicionar personaje/criatura/prop movible con validación, PG editables, modos/foco de cámara, clima, música y capas independientes, tres SFX, peticiones de interacción y resolución, estado de audio/proyector.
- Player móvil: entrar con personaje disponible, nombre/PG propios, inventario básico, joystick grande, botón interactuar y confirmación. Portrait y landscape, safe areas, controles de al menos 48 px. Vista propia ligera del mundo si rendimiento lo permite; usar mismo estado público. WASD/flechas desde PC, impedir scroll durante control; escribir nombre no debe mover.
- Projector: battlemap limpio a 16:9 con grid visible, gesto inicial para preparar audio/pantalla completa; sin herramientas, secretos, nombres de encuentros ocultos ni inventarios. Panel inicial desaparece. Sólo criaturas reveladas.

## Secuencia de trabajo de Sol

1. Instalar stack con lockfile, crear lanzamiento Windows y separar bundles/datos públicos y privados.
2. Validar flujo servidor con DM, dos jugadores y projector, ownership, reconexión y snapshots.
3. Implementar movimiento/collision/input/cámaras y dos escenas mínimas con geometría final acotada.
4. Añadir personajes y props visuales, interacción, revelación y reposicionamiento.
5. Generar/seleccionar audio propio/CC0, mezclar capas y SFX, controlar desde DM.
6. Probar integración y UI reales, corregir fallos; entregar instrucciones y actualizar estado. No detenerse con un plan ni sólo un build exitoso.

## Puertas de aceptación (registrar PASS/FAIL/NO PROBADO con evidencia)

| Área | Prueba |
|---|---|
| Inicio Windows | Ejecutar instalación y luego INICIAR.cmd; tres rutas responden, IP correcta visible, rutas con espacios soportadas. Segundo arranque comunica puerto ocupado claramente. |
| Mesa completa | DM, proyector y dos jugadores en sesiones de navegador independientes. Mover A y B simultáneamente y confirmar posiciones en projector. |
| Ownership | A no mueve B ni invoca reveal/cámara/audio/PG; cambiar id, rol URL o payload no autoriza. Reclamo simultáneo de personaje no crea dos dueños. |
| Secretos | Inspeccionar payloads públicos, respuestas HTTP y build: criatura oculta, notas y datos privados de otros personajes ausentes. Rutas a PDFs/private/ y traversal denegados. |
| Movimiento | Pasos cardinales por celdas: tap mueve una, mantener repite, sin diagonales iniciales. No atravesar mástil, obstáculos, casco, huecos ni desniveles sin escalera. Validar teletransporte. Al soltar/blur/desconectar, terminar sólo paso aceptado y no iniciar otro; escena nueva cancela también animación vieja. |
| Interacción | Sólo próxima y en escena/superficie válida; aviso DM y confirmación a propietario; resolver en DM. Reintentar no duplica y cambiar escena invalida pendientes. |
| Revelación | DM revela, aparece; oculta, desaparece; cliente nuevo/reconectado recibe estado correcto. |
| Escena y cámara | Cambio durante movimiento detiene inputs antiguos y deja todos en spawns; probar fija, semi-fija y follow. Personaje visible sin manipular cámara constantemente. |
| Audio | Gesto inicial real, música audible y loop, océano+viento simultáneos, volumen independiente y fade; tres SFX distintos audibles. Sin duplicación en móviles/DM. Entrada tardía no repite SFX. |
| Inventario/PG | Datos reales verificados o placeholder explícito; sólo su ficha; DM puede ajustar PG. Inventario abre/cierra sin perder control ni mostrar datos ajenos. |
| Calidad visual | Captura 1920x1080 y móvil ~390x844: barco reconocible y coherente, sin clipping/controles tapados; caminar visible y mar animado. |
| LAN física | Usuario entra desde móvil real en mismo Wi-Fi y mueve personaje proyectado. Si no se dispone de hardware, anotar NO PROBADO; emulación no certifica esta fila. |
| Rendimiento | Medir latencia y FPS en hardware disponible, cinco clientes simulados, sesión de al menos 10 min; objetivo 60 FPS PC, aceptable >=30, p95 input->snapshot/render <200 ms LAN. No inventar medición física a partir de test local. |

Automatizar pruebas útiles de autorización, filtrado, colisiones, timeout, reconexión e idempotencia; usar Vitest y socket.io-client, Playwright si disponible para flujo real. No añadir pruebas que sólo reflejen CSS ni mantener fake servidor para certificar sincronización. Realizar escucha además de verificar existencia de WAV. Si falta verificación física, entregar candidata funcional con esa limitación explícita; no marcar ciclo como finalizado en hardware del usuario.

Alpha 0.2: C4/C8/C9, guardado versionado, asignación de fichas más completa, más recursos animados, iluminación/niebla de juego, mensajes privados y packs adicionales; priorizar después de la prueba de mesa.
