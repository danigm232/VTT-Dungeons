# Acabado A4 — Biblioteca y puerta

Fecha:24/10/2026. Lote A1 → A3 → A4 → A2 → A5 autorizado conjuntamente. Estado: construido, comprobado en copia aislada y publicado en3000 con el lote A1–A5. Ver informe de cierre para comprobación real de DM/proyector/guardado.

## Cambios y límites

Encajes del vano y lectura de roble/hierro; ocultación coherente del mueble completo que cruza la vista del personaje.

Se corrigieron dos causas verificadas a5°: los rayos alcanzaban solo algunas primitivas del estante y los materiales glTF OPAQUE ignoraban la transparencia por malla. O1 atenúa coherentemente las partes del mismo mueble y permite el modo automático temporal de esos materiales; restaura su modo exacto antes de la siguiente actualización/al salir. Las piezas no atenuadas siguen opacas. No se clonan materiales o texturas ni se retiran libros. La toma fallida y el control previo se conservan en drafts/opaque-gltf-materials. El relleno existente A4 pasa de0,24 a0,32.

CANON y base del proyecto conservados: Libros, estantes, mesa, bancos, atriles, lámparas, hoja/eje de puerta y circulación. Las piezas nuevas de encaje y desgaste son **VTT_AMBIENCE**, no nuevos espacios o interacciones del canon. La orientación aprobada y las ampliaciones anteriores se conservan.

Nueva geometría modular Blender→GLB, con pivots y UV métricas, materiales existentes y metadatos del sistema O1. Visuales sin colliders, superficies nuevas ni controles DM. Navegación1142casillas/13superficies/18conexiones y escala1,5m intactas. Dados, tiempo y decisiones del DM siguen siendo manuales.

## Verificación

- 103 capturas antes y103 después: cinco inclinaciones, cinco giros, detalle/contexto y DM/jugador/proyector en focos afectados.
- 60 de61 archivos protegidos idénticos, incluidos todos los GLB previos, terreno, ensamblaje y código fuente original de las seis celdas. 1 cambio simultáneo ajeno al lote conservado y revisado: `engine/server/game.ts`, giro opcional sin movimiento; evidencia en`checks/concurrent-changes.json` de la carpeta de trabajo. No se ha restaurado ni modificado ese archivo.
- 113 mallas originales comparadas en runtime por posiciones, índices y materiales, sin cambios; 103 matrices estáticas exactamente iguales. Las10 llamas originales conservan su pulso animado dependiente del tiempo y no se comparan como estructuras estáticas; su código, geometría y materiales siguen intactos.
- 298 mallas de arquitectura/mobiliario original A3/A4/A5 comparadas por límites, roles y materiales, sin cambios. Pruebas automáticas específicas de esta fase: 30.
- Comprobaciones adicionales de accesos/ocupación: 38 registros, incluidos36encuadres de tres tallas en DM/jugador/proyector.
- GLB reimportado: 594,660 muestras corporales y28,591 puntos distintos del recorrido autoritativo de12.242pasos, sin invasiones nuevas. Son verificaciones físicas del trayecto existente, no teletransportes para una foto.
- GLB sin errores/avisos ni imágenes incrustadas: 312triángulos/38688bytes. Las piezas son propiedad de la escena y sus materiales se comparten.
- No se ejecutan baterías prolongadas ni se certifica FPS/memoria: optimización reservada para **Q1**, por instrucción expresa del usuario.

## Archivos

- `campaigns/stormwreck-isle/public/art/retreat-modules/retreat_finish_a4_runtime.glb`.
- `campaigns/stormwreck-isle/public/retreat-zone-finishes.ts` y`.json`, integrados en el propietario existente`retreat-refinement.ts`.
- Fuente`prototypes/retreat-zone-finishes-20261024/artifacts/retreat_finish_a4.blend`; generador`build_finish.py`, verificadores y capturas en la misma carpeta de trabajo/output.
- Evidencia específica en`output/retreat-finish-a4-20261024/checks/verification.json` y`evidence/`.

Ocultación: `campaigns/stormwreck-isle/public/retreat-local-occlusion.ts`, integración en`retreat-global-visuals.ts` y pruebas`engine/client/retreat-local-occlusion.test.ts`.

## Entrega

[Galería antes/después](../../output/retreat-finish-a4-20261024/index.html).

Siguiente:A2 — casa del cabrestante. Los materiales generales M1, entorno E1, luz L1 y optimización Q1 siguen siendo fases posteriores; esta entrega no declara terminado todo el Retiro.
