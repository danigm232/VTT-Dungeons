# Presentación de estados · 2026-10-12

Los estados se representan con icono y nombre debajo de la identidad en la interfaz y un efecto transparente pequeño en el mapa. Sólo Silverfarben Hotel y María / Trinity reciben nuevas poses especiales de estado. Los PNJ mantienen sus animaciones habituales y las poses de caída/derrota ya existentes, con los nuevos overlays. Se usan los mismos componentes en D8, Stormwreck y futuros mapas.

## Sprites

`engine/client/condition-sprites.ts` selecciona primero una animación `condition-<estado>` del catálogo del personaje. Si todavía no tiene ese dibujo, reutiliza una pose de sus propios PNG: daño para veneno/agarrado, defensa para restringido/paralizado, reacción para miedo, conversación para hechizado y sigilo para oculto/invisible. Conserva el recorte del atlas, su escala y su orientación. Las poses reutilizadas se mantienen y reciben un gesto suave; no repiten una animación de daño continuamente.

Trinity utiliza sus PNG completos de derribado e inconsciente; Silverfarben usa sus propias poses de suelo/derrota. Para los demás estados de estos dos jugadores se adaptan las poses de sus PNG disponibles; esto no equivale a disponer de una ilustración nueva de cada estado. La muestra identifica la procedencia de cada pose. `conditionSpriteEnabled` limita estos perfiles a `rogue` y `silverfarben-hotel`; en un futuro mapa puede configurarse `WorldRendererOptions.conditionPoseTokens` para habilitar otros personajes explícitamente.

Para sustituir una adaptación en cualquier mapa, añadir al `tokenAnimations` de su personaje un clip, por ejemplo:

```ts
'condition-envenenada': { frames: ['/art/tokens/personaje/envenenado.png'], fps: 1 }
```

Los nombres corresponden a los estados del protocolo actual: `envenenada`, `restringida` (alias antiguo `apresada`), `agarrada`, `derribada`, `asustada`, `inconsciente`, `oculta`, `invisible`, `hechizada`, `paralizada`. No se inventan nuevas reglas ni duraciones al elegir una pose.

Un ataque o desplazamiento permitido conserva su animación y su dirección; el efecto del estado permanece. Inconsciente y paralizado mantienen una pose inmóvil. Derribado utiliza reptar cuando hay movimiento permitido. Los estados simultáneos usan una pose prioritaria y combinan los efectos con menos intensidad.

## Efectos

`engine/client/condition-effects.ts` pinta atlas transparentes pequeños compartidos, con bruma, ataduras, filamentos o partículas. No usa las antiguas coronas PNG de tamaño completo. Se ajustan a la parte visible del sprite y a la escala del personaje. Las tarjetas 3D de `WorldBillboards` prueban la profundidad del escenario, sin escribir profundidad ni interceptar clics. Al retirar/caducar el estado se desactiva su capa. Los recursos se liberan con el actor/escena y el renderer.

El sistema respeta la preferencia de movimiento reducido del dispositivo. La muestra permite probarla y comparar reposo, caminar y atacar sin enviar comandos a una mesa.

Algunos PNG de sigilo de Trinity tienen fondo negro opaco. `sprite-matte.ts` elimina el negro conectado al borde al preparar la textura, conservando el PNG original. La textura y su máscara de oclusión se reutilizan; no se procesa el fondo cada fotograma.

## Revisión

Ejecutar `node scripts/conditions-preview.mjs` y abrir `http://127.0.0.1:4598/scripts/conditions-review.html`. Permite elegir los personajes de D8 y comparar todas las poses actuales. Las notas de cada recuadro distinguen el PNG propio del estado, la reutilización y la adaptación. El icono aparece bajo el nombre del recuadro; sobre la imagen sólo se dibuja el efecto.
