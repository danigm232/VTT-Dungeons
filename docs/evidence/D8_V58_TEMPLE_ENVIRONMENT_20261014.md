# D8 V58 - entorno decorativo del Templo de Sylvania

14 de octubre de 2026. Trabajo local, sin publicación en GitHub. Estado remoto consultado al iniciar: V49. Base local validada: V57.

## Alcance y canon

Se conserva exactamente `MAP`, `CANON`, aparición y cámara de V57 en las seis escenas; las configuraciones completas de las otras cinco escenas no cambian. No se reconstruyen el Templo, sus muros, cubiertas, mobiliario, puertas o cuadrícula. Sus 78 colisiones, 18 piezas de cubierta y dos habitaciones continúan presentes. El cambio del renderizador se limita a decoración del Templo y a su presentación de luz.

Fuente consultada visualmente: `campaigns/one-shot/source/adventure.pdf`, metadatos D8 Night v4.1, páginas físicas 3, 4 y 10. El texto del PDF está trazado como gráficos y no se extrae correctamente; se renderizan esas páginas para leerlas. Canon: aldea de Sylvania, burbuja temporal a las ocho de la tarde, sol sin ponerse y rayos anaranjados; los finales permiten que el atardecer avance. Las ubicaciones y variantes de casas, veredas, arbustos y colinas son **VTT_AMBIENCE**, no nuevos lugares o encuentros canónicos. No se añade puerto, ciudad nueva, interacción o colisión.

## Fases y validaciones

1. **Entorno cercano.** Veredas que prolongan los caminos existentes después del límite ampliado de la cuadrícula; continuaciones de suelo con las mismas coordenadas UV y material final, relieve suave fuera del tablero, 24 arbustos y 24 piedras agrupados. La comparación con V57 y las pruebas de navegación/cámara pasan antes de continuar. Primera construcción: 61 piezas decorativas, cero invasiones del área jugable.
2. **Vecindario.** Ocho casas con revoco cálido, madera, tejados cerrados, chimeneas y cercados. Se reutilizan los constructores de casas y caminos, omitiendo los detalles traseros que no se ven; no hay interiores. Rayos comprueban ambos extremos de los tejados y se valida la capa apagada/encendida antes de continuar.
3. **Distancia.** Treinta y dos casas simplificadas, ochenta árboles y catorce colinas suaves en cinco lotes de instancias. Se retira el antiguo anillo de árboles de 360 grados del Templo, no de otras escenas. Distribución en el sector posterior visible, sin aumentar mapas de sombra ni luces. Validación de geometría, colocación y soporte de instancias en el runtime real del VTT.
4. **Horizonte.** Se retira `templeVillageBackdrop`; se sustituye por un ciclorama curvo de 200 grados en espacio 3D, continuo, sin billboard ni bordes de imagen. El vecindario y las siluetas distantes aportan el paisaje rural delante de sus bandas de color. Rayos comprueban continuidad en los giros permitidos y a distintas alturas. El PNG anterior se conserva para los snapshots históricos, pero ya no se incrusta en el paquete activo.
5. **Atmósfera.** Bruma tenue solo en la distancia y sombras de contacto para las ocho casas. Luz de atardecer retenida visualmente durante el bucle, sin pausar el reloj, duraciones o acumulación climática. Al confirmar un final mediante la lógica existente del DM, se publica únicamente un indicador de liberación al Templo y se vuelve a respetar el perfil horario. No se elige un final ni se cambia la historia automáticamente. Se conservan los efectos ambientales existentes y no se añaden sonidos de aves.
6. **Auditoría y optimización.** Agrupación por material y sector, conservando raíces separadas para depuración. Las 504 piezas decorativas originales quedan en 99 mallas finales, sin quitar geometría visible. Cero invasiones, decoraciones interactivas o nuevas colisiones. Se preserva el presupuesto de sombras tácticas.

Las cinco capas pueden activarse en `VTT_AMBIENCE.templeEnvironment.layers` o mediante `scene.metadata.d8Vtt.templeEnvironment.setLayer(id, enabled)`, con los identificadores `near`, `village`, `distant`, `panorama` y `atmosphere`. La ocultación se comprueba también después de agrupar las mallas. `phase` permite construir progresivamente las capas para revisión.

## Resultado de pruebas

- Comparación automática del estado jugable y de las cinco escenas ajenas con el snapshot V57: sin diferencias.
- Auditoría de las seis escenas con Babylon NullEngine: aprobada; Café y Fritz mantienen las correcciones V57. Templo final: 1009 mallas totales, 40 luces locales, tres mapas de sombras, 48 sombras de contacto existentes y ocho nuevas para el vecindario.
- Nueve combinaciones de vertical 20/30/40 grados y horizontal -30/0/+30, en 16:9 y 9:16. Incluye el encuadre de combate de 40 grados. Muestreo de rayos hacia cuadrícula y personajes: sin obstrucción nueva. Muestreo de bordes/centro de viewport: sin huecos en las posiciones comprobadas. No equivale a una comparación de capturas.
- Geometría decorativa final: 37 291 vértices de prototipos/lotes, aproximadamente 1 702 656 bytes de buffers geométricos y de instancias. Es una estimación de buffers, **no memoria GPU total**. No se declaran FPS ni draw calls medidos por NullEngine.
- Suite ampliada final: **251 de 251 pruebas aprobadas en 41 archivos**, registrada en `runtime/d8-v58-regressions.json`. Tipos de cliente y servidor aprobados. Cliente compilado en 2 min 2 s; servidor recompilado después de corregir la configuración pública.
- Paquete generado exacto, imports resueltos, base64 UTF-8 correcto, V57 archivada y V58 única activa. JSON activo: 1 066 348 bytes frente a 7 230 767 bytes de V57, principalmente por retirar la imagen ya no utilizada.

La comprobación del servicio detecta y corrige una omisión en el filtro público: las capas estaban en la fuente, pero inicialmente no viajaban en `/api/d8/renderer-config`. Se añade una prueba dedicada y la auditoría final construye la escena con la configuración **pública** y el runtime **real** del VTT. Solo se publica la configuración visual; CANON y datos de interacciones privadas permanecen excluidos.

## Entrega local y límites

Compilación independiente en `runtime/d8-v58-web` y `runtime/d8-v58-server`, para no depender de archivos que otra campaña recompila. No se reinicia ni modifica ninguna mesa de Stormwreck. Se conserva el slot existente de D8, sin nueva partida ni borrado.

Servicio final activo en `http://127.0.0.1:3001/dm`. Verificación HTTP: V58, fase 5 y las cinco capas presentes en la configuración pública, sin CANON; campaña `d8-night-private`, renderizador final disponible. Guardado `ready`, sin cambios pendientes ni errores, generación 878 en la comprobación. Registro de errores de inicio vacío. Se negocia el cierre seguro de la instancia anterior de D8, que confirma guardado y desbloqueo antes de arrancar la corrección final. No se abre el navegador automáticamente ni se modifica el slot de Stormwreck.

**La aceptación visual con GPU está pendiente.** El rechazo anterior del navegador impide la inspección de la escena por otra superficie o automatización. No se generan capturas antes/después, no se mide FPS, draw calls reales o memoria GPU y no se certifica el acabado artístico desde todos los puntos posibles. Los límites de cámara existentes no se modifican. No se sortea ese bloqueo mediante otro navegador, CDP o captura indirecta.
