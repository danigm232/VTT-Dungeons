# D8 Night — pasada visual V38

Fecha: 2026-10-03. Trabajo realizado sobre la copia local V37; GitHub seguía en V34 al iniciar la revisión. No se ha publicado ni sobrescrito el remoto.

## Alcance y resultado

Los seis mapas siguen siendo geometría nativa de Babylon. Las referencias no se usan como fondos de juego. Se conservan CANON, navegación, encuentros y reglas; esta pasada afecta a materiales, geometría ambiental, luz y efectos. El renderer sigue compartido entre el VTT y el Playground.

| Mapa | Cambios principales |
| --- | --- |
| Taberna | Restauración de barra, mesas y paredes invisibles; piedra con juntas menos agresivas; madera menos naranja; remates de muros, fragmentos de alero y detalles en mesas. |
| Templo | Pavimento de piedra más fino, césped menos saturado, normales alineadas con las texturas, tejidos en banderas y movimiento ambiental sin congelación. Se conserva puente → escaleras → acceso. |
| Cena | Casa visible y amueblada; cumbrera longitudinal y pendientes de tejado coherentes; molduras y aleros; mesa, alfombra, aparador y hogar ambiental; eliminación de un pozo duplicado superpuesto. |
| Jardín | Bordes de parterres y labios de nieve; faroles de piedra con marcos abiertos; bases de terreno con volumen; agrupación de pinos y detalles estáticos. |
| Mercado | Adoquines más pequeños; tejidos, mostradores con paneles y cajas de exposición; toldos animados; faroles con marcos abiertos; contraste frío/cálido. |
| Espejo | Bordes de hielo más altos y bancos helados; lago irregular oscuro visible desde la cámara; ondas horizontales y superficies con relieve. |

## Causas corregidas

- `DynamicTexture.clone()` genera un canvas vacío: al clonar los materiales para la legibilidad o el pulido quedaban texturas sin preparar y desaparecía la geometría. El clon ahora conserva las texturas de la escena y libera las copias vacías. El cambio de mapa dispone los materiales, no las superficies compartidas.
- Los mapas de normales no siempre repetían con la misma escala que su textura de color; ahora heredan esa escala.
- Pozos, ondas, aro del patio y arañas de techo tenían toros horizontales girados 90°; se ha corregido su orientación. El marco vertical del espejo conserva su giro.
- La optimización congelaba los toldos. Los elementos animados llevan una marca explícita y quedan fuera de la congelación; también se ha añadido un balanceo discreto a las banderas.
- Las carcasas sólidas de los faroles encerraban su vidrio luminoso. Ahora tienen postes/marcos y tapas independientes.
- El lago irregular del Espejo se descartaba por orientación de caras. Su agua y brillo se renderizan por ambos lados y vuelven a ser visibles.
- La luz direccional de sombras tiene prioridad dentro del presupuesto de luces del material.

## Coste de renderizado

Se conserva FXAA y se elimina el MSAA 4x adicional de las superficies HDR. SSAO usa menor resolución y ocho muestras; las sombras se actualizan cada dos frames. Se agrupan más piezas estáticas por nombre/material, también en la taberna, sin incluir toldos, estados o efectos animados.

Ejemplos de reducción de mallas en la vista de auditoría: taberna 215 → 157; jardín 696 → 378. Los FPS durante las capturas varían con el foco del navegador y las compilaciones simultáneas; no se presentan como un benchmark ni como una garantía para móviles.

## Comprobaciones

- Revisión por captura de los seis escenarios en Chrome/WebGL2, con postprocesado real activado.
- Tres vueltas por los seis mapas: materiales y texturas preparados; comparación de recursos entre la segunda y tercera vuelta sin crecimiento. La primera vuelta calienta la caché de suelos.
- 19/19 pruebas de `engine/server/one-shot.test.ts` aprobadas.
- Comprobación de tipos del cliente aprobada.
- Build de producción del cliente aprobada sobre las fuentes finales. Conserva el aviso preexistente de `/art/ship/loot-atlas-m5.svg`, ajeno a los mapas D8.
- Compilación del servidor aprobada en la comprobación final. Una ejecución anterior detectó dos errores en `camp-rests/public/a1-visuals.ts`; ese archivo no se modificó en esta pasada.
- V38 generada por el generador oficial; V37 archivada; snapshot actual y numerado idénticos; fuentes incrustadas y base64 verificados.

## Repetir la auditoría

La página `visual-preview.html` es una herramienta local de diagnóstico, no otra implementación del juego. Importa el renderer y la configuración reales. Con Vite servido desde la raíz del repositorio, abrir `/campaigns/one-shot/playground/visual-preview.html`.

- Seleccionar un mapa para verlo completo.
- «Comprobar» revisa preparación de materiales y texturas.
- «Probar cambios de escena» hace tres ciclos y detecta crecimiento de recursos.
- «Guardar imagen» descarga el canvas renderizado. La cámara de vista completa de esta herramienta no modifica la cámara de la partida.

No se ha instalado ninguna dependencia ni importado assets externos. Las capturas de esta revisión están en Descargas como `d8-<mapa>-V38.png`.

Archivos de esta pasada: `renderer.ts`, `d8night.config.ts`, `VERSION`, `engine/server/one-shot.test.ts`, JSON generados V38/actual, archivo histórico V37, `visual-preview.html` y este informe. Se han preservado los cambios preexistentes del workspace.

## Límites

Esta es una pasada de mejora, no una afirmación de calidad artística final. No sustituye pruebas de rendimiento en los móviles y el proyector reales, ni una sesión de juego completa. Los techos se mantienen recortados para que no oculten el tablero. No se han reiniciado mesas activas ni alterado guardados.

Para ver la configuración V38 en una mesa ya abierta, cerrar/reabrir el programa de forma normal y recargar sus clientes; el proceso actual mantiene la configuración que cargó al arrancar.
