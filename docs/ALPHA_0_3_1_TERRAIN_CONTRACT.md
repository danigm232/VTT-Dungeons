# Alpha 0.3.1 — contrato de integración 3D (preparatorio, no RC)

Estado 2026-09-16: dirección Babylon.js aprobada y `@babylonjs/core` 9.26.0 está fijado en package/lockfile. `engine/shared/terrain.ts`, `terrain-fixture.ts` y `engine/client/terrain3d.ts` forman una prueba aislada: con `NullEngine` construye relieve, grid proyectado, oclusores, luz y cámara. Todavía no aparecen en `/api/campaign`, sockets, saves ni las pantallas del VTT. Ninguna prueba de este archivo acredita una escena 3D jugable.

## Alcance y topología

Una escena sintética 6×3 de casillas D&D de 1,5 m tiene `ground` y `bridge`. En (3,1) existen simultáneamente suelo a 0 m y puente a 2,5 m. La posición lógica es **(sceneId,surfaceId,col,row)**, nunca sólo (col,row). Dos tiles de rampa enlazan 0→1,25→2,5 m; una transición explícita conecta el suelo con el comienzo de la rampa. Casillas vecinas en la misma superficie sólo se conectan si sus bordes tienen desnivel≤0,5 m; rampa entre superficies exige bordes coincidentes≤0,1 m. Debajo del puente no hay enlace implícito con la casilla de arriba. Una altura visual no concede movimiento ni permiso de visión.

Cada tile tiene cuatro alturas de esquina NW/NE/SE/SW. El grid se dibuja muestreando las mismas alturas que la malla, ligeramente por encima para evitar z-fighting; selección y pies usan la misma función de altura. Las escaleras preparadas requieren escalones/ciclo de sprite específico: una imagen estática no promete IK. Pilares y arcos se representan como geometría que ocluye delante/detrás según profundidad, no como sombreado de una imagen plana. Ocultación *visual* no equivale a niebla ni autorización de percepción individual; esta última sigue en0.7.

La escena contiene una lámpara dinámica y lluvia ligera reutilizable. Los datos describen intención, no importan motores de partículas ni texturas externas automáticamente. Puerta, caja, preview privado, colisiones, undo, DM, jugadores, proyector, audio y save deben conservar el mismo servidor autoritativo. La escena sintética no se publica como alternativa aislada al VTT.

## Versión y transición de datos

Alpha0.3 permanece en campaña pública schemaVersion2, PROTOCOL_VERSION4, campaignStateVersion1 y SaveV1. Su backup se conserva separado. Para0.3.1 se propone campaña pública schemaVersion3 y protocolo5: cada escena declara si usa mapa2D legado o terreno3D; los tipos3D añaden superficies, conexiones, materiales y recursos locales, sin forzar al usuario a crear geometría en un editor externo. Entidades y props llevan surfaceId; toda navegación/reserva/colisión y selección emplea el nodo de cuatro campos. No reutilizar grid48 como escala física: el tile físico es1,5 m y la cámara proyecta la escena.

Agregar la nueva escena cambia el conjunto exacto de escenas persistidas y los objetos3D requieren superficie propia. Por tanto, subir **campaignStateVersion2** y formato de save2; migración0.3→0.3.1 pura: archivar SaveV1 original, mantener sin cambios escenas/PG/audio/objetos antiguos y añadir estado inicial de la escena nueva. Objetos antiguos reciben la única superficie de su escena; los nuevos guardan `surfaceId` explícito. Si un ID antiguo, capacidad, celda o superficie no tiene equivalencia única, rechazar incompatibilidad y ofrecer exportación/backup, nunca poner un valor por defecto silencioso ni sobrescribir active. Primero tests de migración/hidratación, después integrar el renderizador.

## Orden de implementación y gate

1. Aceptar físicamente0.3 y conservar copia de código/build/saves. Mantener la versión exacta ya instalada de `@babylonjs/core` con lockfile y avisos Apache-2.0; evaluar licencia de modelos/texturas por separado.
2. Cerrar esquema3/save2/protocolo5 y migración; validar ruta bajo/sobre puente y dos actores en la misma casilla plana con superficies distintas. Rechazar acciones con epoch/superficie antiguos.
3. Integrar Babylon en **una** escena sintética con cámara ortográfica, sprites2D a pie de suelo, rampa, bridge/underpass, grid proyectado, oclusor real, puerta/caja manipulables, luz y lluvia. Las escenas0.3 continúan jugables con adaptador temporal Pixi, no una segunda plataforma permanente.
4. Probar dos jugadores+DM+proyector, restore/undo/cancelar, reconexión y 30min físicos. Medir 60fps1080p proyector y 30fps en móviles de referencia; bajar calidad móvil sin ampliar datos o permisos.

No incluye editor3D general, importación automática de PDF, visión privada de elfo ni IA que ejecuta órdenes libres. El one-shot del usuario se estudia después de este tramo para escoger qué escena/materiales conviene preparar; su contenido no cambia por sí solo los contratos del motor.
