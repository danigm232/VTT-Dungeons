# Acabado A2 — Casa del cabrestante

Fecha:24/10/2026. Lote A1 → A3 → A4 → A2 → A5 autorizado conjuntamente. Estado: construido, comprobado en copia aislada y publicado en3000 con el lote A1–A5. Ver informe de cierre para comprobación real de DM/proyector/guardado.

## Cambios y límites

Carpintería y apoyos de la casa; relación visual entre edificio, cadena, palé y costa con controles existentes.

La caja original estaba desligada del palé: antes permanecía a12m aunque el palé cambiase a0/12/15. Ahora los suministros ya apoyados se vinculan a su transformación, preservando su pose mundial inicial y los ejes de glTF. El encuadre amplio usa las dimensiones A2 existentes sin reducirlas al pequeño refugio interior, que excluía el palé inferior. La misma cámara incorpora la carga al alejarse, manteniendo el personaje visible, los ángulos manuales y el límite C2. La inspección cercana permanece centrada en el actor; cambia deliberadamente el máximo local de alejamiento A2, y las comparativas de contexto declaran ese cambio. A5° el límite del jugador puede impedir incluir toda la vertical simultáneamente: prevalecen personaje visible y C2. No se crea un ascensor de personajes, otra cámara ni botones DM. Las pruebas0/12/15 son casos de revisión, no nuevas reglas de uso.

CANON y base del proyecto conservados: Puerta, tejado a dos aguas, mecanismo, cadena, palé, estados y recorrido de carga. Las piezas nuevas de encaje y desgaste son **VTT_AMBIENCE**, no nuevos espacios o interacciones del canon. La orientación aprobada y las ampliaciones anteriores se conservan.

Nueva geometría modular Blender→GLB, con pivots y UV métricas, materiales existentes y metadatos del sistema O1. Visuales sin colliders, superficies nuevas ni controles DM. Navegación1142casillas/13superficies/18conexiones y escala1,5m intactas. Dados, tiempo y decisiones del DM siguen siendo manuales.

## Verificación

- 72 capturas antes y72 después: cinco inclinaciones, cinco giros, detalle/contexto y DM/jugador/proyector en focos afectados.
- 60 de61 archivos protegidos idénticos, incluidos todos los GLB previos, terreno, ensamblaje y código fuente original de las seis celdas. 1 cambio simultáneo ajeno al lote conservado y revisado: `engine/server/game.ts`, giro opcional sin movimiento; evidencia en`checks/concurrent-changes.json` de la carpeta de trabajo. No se ha restaurado ni modificado ese archivo.
- 113 mallas originales comparadas en runtime por posiciones, índices y materiales, sin cambios; 103 matrices estáticas exactamente iguales. Las10 llamas originales conservan su pulso animado dependiente del tiempo y no se comparan como estructuras estáticas; su código, geometría y materiales siguen intactos.
- 298 mallas de arquitectura/mobiliario original A3/A4/A5 comparadas por límites, roles y materiales, sin cambios. Pruebas automáticas específicas de esta fase: 30.
- Comprobaciones adicionales de accesos/ocupación: 41 registros, incluidos36encuadres de tres tallas en DM/jugador/proyector.
- GLB reimportado: 594,660 muestras corporales y28,591 puntos distintos del recorrido autoritativo de12.242pasos, sin invasiones nuevas. Son verificaciones físicas del trayecto existente, no teletransportes para una foto.
- GLB sin errores/avisos ni imágenes incrustadas: 396triángulos/47028bytes. Las piezas son propiedad de la escena y sus materiales se comparten.
- No se ejecutan baterías prolongadas ni se certifica FPS/memoria: optimización reservada para **Q1**, por instrucción expresa del usuario.

## Archivos

- `campaigns/stormwreck-isle/public/art/retreat-modules/retreat_finish_a2_runtime.glb`.
- `campaigns/stormwreck-isle/public/retreat-zone-finishes.ts` y`.json`, integrados en el propietario existente`retreat-refinement.ts`.
- Fuente`prototypes/retreat-zone-finishes-20261024/artifacts/retreat_finish_a2.blend`; generador`build_finish.py`, verificadores y capturas en la misma carpeta de trabajo/output.
- Evidencia específica en`output/retreat-finish-a2-20261024/checks/verification.json` y`evidence/`.

Carga y encuadre: `retreat-global-visuals.ts`, `retreat-camera-composition.ts`, integración en`apps/web/world.ts` y`engine/client/retreat-winch-context.test.ts`.

## Entrega

[Galería antes/después](../../output/retreat-finish-a2-20261024/index.html).

Siguiente:A5 — templo de Bahamut. Los materiales generales M1, entorno E1, luz L1 y optimización Q1 siguen siendo fases posteriores; esta entrega no declara terminado todo el Retiro.
