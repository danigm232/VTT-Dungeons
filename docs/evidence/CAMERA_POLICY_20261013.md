# Cámara VTT: perfil limitado — 2026-10-13

## Cambios aplicados

- D8 y Stormwreck, incluidos Retiro, Pecio y campamentos: inclinación manual de **20° a 40°**. Entrar en un interior solicita 20° y salir solicita 40°, con interpolación. El preset se ejecuta una sola vez por transición, para conservar cambios manuales dentro de la zona.
- Giro horizontal de **−30° a +30°** respecto al frente artístico de cada mapa. Q/E y botones avanzan 15°; no hay vuelta circular en los extremos. El desplazamiento horizontal de dos dedos permite un ajuste continuo, limitado al mismo margen. Las direcciones de sprites y WASD/joystick siguen calculándose con el ángulo visible durante la transición.
- Cámara ortográfica conservada. El frente de A1 y las vistas de llegada del Retiro se mantienen; se retira el antiguo giro automático circular del Pecio. Se utiliza una clave de preferencias horizontal nueva para no interpretar las antiguas orientaciones de 45° como pasos de 15°.
- DM: R sube y F baja la inclinación en pasos de 5°. Se mantienen en el jugador. Los atajos respetan campos de texto, modificadores del navegador y los límites; no se añaden etiquetas Q/E al mapa del jugador.
- Combate: al empezar se seleccionan 40°, frente inicial y encuadre del encuentro autorizado. El zoom conserva participantes y destinos de movimiento dentro del área táctica. Se permite ajustar la inclinación y el giro; al terminar se recuperan el ángulo y zoom de exploración y sus preferencias.

## Zoom y pantallas

El límite del zoom jugable Babylon ya no es un multiplicador global 0,4–24. Se calcula el área visible en metros con los límites de la escena/espacio, la inclinación y la relación de aspecto. El acercamiento mantiene personaje completo, varias casillas próximas y el ancho de la selección del editor cuando corresponde; el alejamiento admite un margen de 12% sobre el encuadre de la zona.

El jugador conserva una altura mínima legible de su ficha y un rectángulo de foco que deja espacio para HUD/controles. «Vista de conjunto» permite ver expresamente el escenario completo. Los camarotes, cubiertas, bodega, cofa y refugios cubiertos tienen su propio encuadre. Las dimensiones de los espacios cubiertos se reutilizan para evitar recalcularlas y cambiar la escala a cada cuadro. Las restricciones se recalculan al cambiar el tamaño del lienzo, el objetivo o la zona.

DM centra su selección; jugador centra su ficha; el proyector utiliza los actores públicos del grupo en los modos de seguimiento. El zoom del proyector conserva el grupo dentro del encuadre. Rueda, pinza, botones, detalle y preferencias cargadas pasan por la misma política. Un cambio de límite desplaza el objetivo del controlador amortiguado; no desplaza fichas ni altera coordenadas de juego.

## Interiores y arte

Se elimina la excepción de cámara a 55° del Pecio. La solución para 20° es abrir la pared de la estancia ocupada y retirar sólo paredes/techos vecinos que cruzan los rayos hacia su ocupante. Los suelos y contenidos de las otras habitaciones permanecen ocultos. Se conservan geometría, colisiones y la visibilidad de juego; sólo cambia la presentación.

El Retiro identifica los interiores mediante las huellas de sus suelos canónicos, trasladadas por el origen de la escena. D8 y campamentos reutilizan las zonas cubiertas de sus renderizadores. No se han generado ilustraciones nuevas; se conservan sprites, materiales, iluminación y animaciones existentes, adaptando encuadre y oclusión.

## Verificación y evidencia

| Comprobación | Resultado |
|---|---|
| Pruebas dirigidas de política, gesto, cámara, movimiento, sprites y oclusión | **64/64** |
| Tipos cliente/servidor y visor | PASS |
| Compilación de servidor | PASS |
| Compilación final de cliente | PASS |
| Integración conectada D8 con giro firmado/fraccionario DM→proyector, mapas, assets, guardado y reinicio | PASS |
| Revisión Babylon de seis mapas D8 y siete Stormwreck | **208 comprobaciones**, cero fallos/errores registrados |
| Inclinaciones 20°/40°, tres posiciones horizontales por mapa | **78 vistas**, coordenadas conservadas |
| Camarotes C4–C7: preset 20° y ajuste manual 30° | **8/8**, cero errores registrados |
| Capturas de mapa e interiores | **38** |

La pasada de 208 comprobaciones precede al ajuste final que exige encuadre completo del grupo al proyector y a la ampliación de recortes de paredes vecinas; los interiores se volvieron a revisar después de esos cambios. Las comprobaciones de zoom comparan pose y límites de la política; no certifican legibilidad humana de cada objeto. No se ha repetido la suite completa del repositorio.

- [Pruebas dirigidas](../../output/camera-policy-20261013/tests-final.json).
- [D8: 96 comprobaciones](../../output/camera-policy-20261013/d8-policy-audit.json).
- [Stormwreck: 112 comprobaciones](../../output/camera-policy-20261013/storm-policy-audit.json).
- [Camarotes: 8 comprobaciones](../../output/camera-policy-20261013/storm-interior-audit.json).
- [C4 a 20°, frente inicial](../../output/camera-policy-20261013/storm-c4-interior-20-angle-2.png).
- [Compilación final del cliente](../../output/camera-policy-20261013/client-build-final.log).
- [Integración de red](../../output/camera-policy-20261013/network-smoke.log).

## Límites y activación

La revisión utiliza un visor local aislado con el renderizador real y fixtures públicos. La integración de red utiliza guardados temporales; la primera ejecución con el servidor compilado en un directorio que no encontraba los assets produjo un 404, y se repitió correctamente con el árbol de compilación situado a la profundidad esperada. No se ha reiniciado ni modificado el guardado de la mesa real.

No se ha probado el gesto en un móvil físico ni certificado FPS, latencia, calidad artística definitiva o un proyector físico. Hubo desconexión temporal y límites de tiempo del control del navegador; los informes del visor y las capturas se guardaron independientemente. Los servidores temporales y las pestañas de revisión se cierran al terminar.

Para activar la lógica y el nuevo intercambio de orientación en la mesa que esté abierta, guardar y usar la opción A de `INICIAR.cmd`, y recargar DM, jugador y proyector. Las pantallas antiguas no interpretan el nuevo perfil horizontal: el mensaje de orientación incluye un identificador de perfil para evitar mezclar escalas.
