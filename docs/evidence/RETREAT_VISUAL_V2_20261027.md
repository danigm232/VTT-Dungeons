# V2 · Biblioteca y jardín · 27/10/2026

Estado: validación aislada completada; publicación conjunta con V3/V4 autorizada por el usuario. Continuación hasta V4, sin pausa de aprobación intermedia.

## Cambios

- Derivado del Blender ampliado existente: 20 estanterías, mismas huellas, altura de 1,93 m a aproximadamente 2,28–2,38 m, volúmenes de alturas y encuadernaciones variables y huecos de uso. Se conservan las tres estanterías independientes, mesa, dos bancos, instrumentos y puerta de roble/hierro.
- Pared oeste (derecha en cámara frontal): 0,30 → 0,75 m hacia el exterior. Cara interior y circulación iguales.
- Jardín en la parcela occidental X79,35–85,8 / Z53,35–63,25 m, con suelo vegetal adaptado a alturas medidas, tres árboles, hierba y flores. Ningún nuevo interactivo o obstáculo.
- Se usa el importador, los materiales compartidos y la oclusión vigente. Derivados nuevos; fuentes originales conservadas en disco.

CANON: función y composición de A4 según aventura oficial, capítulo 1, pp. 6–12. VTT_AMBIENCE: proporciones del mobiliario, encuadernaciones, refuerzo exterior y jardín. No se automatizan decisiones o pruebas.

## Evidencia

`output/retreat-v2-v4-20261027/evidence/v2-before-*.png` y `v2-after-*.png`: doce parejas en idéntica cámara. Manifiesto de modelo y verificación en `prototypes/retreat-v2-v4-20261027/checks/v2-model.json` y `v2-verified.json`.

162 encuadres (seis posiciones × tres alturas × tres giros × DM/jugador/proyector), sin fallo de preparación o personaje fuera de pantalla. 22 pruebas de oclusión e integración aprobadas; typecheck cliente aprobado. Las 71 piezas estáticas de las celdas conservan geometría y matrices exactas. Los 176 GLB previos conservan SHA-256.

Navegación, coordenadas, luces y sombras conservadas. El jardín añade geometría y cuatro materiales simples de vegetación; no se presenta como una mejora de FPS. Medición sostenida del mapa completo reservada para después de V5.

Corregido durante revisión: libros inicialmente demasiado uniformes por vértices separados de importación; jardín inicialmente representado por bultos de vegetación. Se agrupan los vértices coincidentes de cada volumen y se construyen hojas/briznas y suelo continuo.

Siguiente fase: V3, templo y puente. Agua y barco siguen pendientes en V5.
