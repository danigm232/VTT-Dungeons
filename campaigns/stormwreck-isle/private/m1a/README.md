# M1a — Atlas maestro del Pecio

Entrega interna de Terra, 22/09/2026. No se sirve desde `public/` ni declara escenas jugables. La fuente de verdad es `pecio-master.json`; las capas SVG son material de integración editable, no capturas del mapa oficial ni fondos aplanados.

## Contrato espacial

- Sistema común: 28 × 18 casillas, 1,5 m/casilla, 64 px/casilla. Norte arriba, proa a la derecha, popa a la izquierda. El origen visual y las coordenadas de casco son comunes a A–D.
- A (`wreck-upper`): C2, C3, cofa y exterior, en superficies separadas; el vacío central nunca se convierte en suelo.
- B (`wreck-main`): C1 y C4–C7 en la misma planta. Las puertas apuntan a C1, no entre camarotes.
- C (`wreck-lower`): C8; agua de 0,15 m a estribor/sur y 0,45 m a babor/norte, todo terreno difícil.
- D (`wreck-hold`): C9 sumergida; sólo los puertos P14–P16 definen respiración, escalera o nado.

## Capas y vista previa

Cada `layers/<map>.svg` contiene grupos aislables `floor`, `static-occluders` y `water-mask`. No contiene retícula, fichas, criaturas, puertas, timón, cofres, cajas, tablón ni tesoro. `previews/<map>-grid.svg` es una capa de QA privada: la cuadrícula y los puertos no se hornean en el arte.

Las SVG utilizan únicamente formas y texturas procedurales propias de esta entrega. Al integrarlas, Sol puede rasterizarlas, convertirlas a materiales Babylon o sustituir partes por recursos aprobados, sin perder geometría ni anclas.

## Lectura para M1b

1. Importar `pecio-master.json` como referencia de datos, no como schema de red.
2. Mantener `mapId`, `zoneId`, `surfaceId` y `portId` estables. Resolver `point` a celda en runtime y validar ocupación/permisos allí.
3. Copiar al área pública sólo las capas autorizadas para la vista y nunca los SVG de previsualización, este README, puertos secretos ni manifiestos de Drive.
4. No reutilizar el viejo `32×21` como geometría; se conserva únicamente para la regresión de la cubierta vigente.
