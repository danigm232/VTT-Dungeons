# Inclinación continua y preferencia por escena

## Comportamiento

El intervalo sigue siendo 5°–25°. El gesto de dos dedos conserva cualquier valor intermedio, sin redondearlo a un paso. Las teclas F/R y los botones del DM permiten:

- Toque corto: siguiente marca de 5° (5, 10, 15, 20, 25).
- Mantener: movimiento continuo, con una pausa breve al atravesar cada marca.
- Soltar: conservar el ángulo exacto alcanzado, incluido un valor entre marcas.

Cada escena conserva su inclinación. Se recupera tanto de memoria como del almacenamiento del navegador al recrear la pantalla. También se recuerda si el personaje estaba dentro o fuera, para reconocer un cambio de zona tras una reconexión. Los valores anteriores sin esta información se conservan al migrar.

La única automatización vertical es el cambio de interior/exterior: 10° al entrar y 25° al salir. El Espejo siempre se clasifica como interior. Cambiar de combate o recibir otra cámara compartida desde DM no sobrescribe la inclinación elegida por el jugador. El proyector sigue recibiendo la inclinación compartida del DM.

Durante una carga no se reclasifica la zona usando entidades de la escena anterior. Si todavía falta la posición del jugador, se espera a disponer de ella.

## Comprobación

- Comprobación de tipos del cliente y compilación del servidor correctas.
- 62 pruebas correctas en nueve archivos, ejecutadas con un solo trabajador para evitar presión de memoria durante la matriz geométrica.
- La matriz recorre las 399 casillas del Espejo, con dos tamaños de pantalla, dos escalas, tres giros y ocho inclinaciones, incluidas 7,35°, 12,6° y 22,5°: 38.304 combinaciones. Comprueba figura visible, recorte del escenario y escala constante.
- Un servidor aislado retransmitió ocho inclinaciones, incluidos valores intermedios, a jugador y proyector conservando el encuadre.
- Revisión visual: inicio del Espejo sin preferencia a 10°; selección de 7,35°; recreación completa de la pantalla y entrada/salida de combate manteniendo 7,35°. Inclinación renderizada: 7,349999999999994°, diferencia numérica normal.
- Sin errores de consola en la revisión visual. Los gestos de móvil se verifican mediante sus cálculos; no se acredita una prueba física sobre un teléfono.

Evidencia en `output/camera-continuous-20261020/evidence/`:

- `tests.json`
- `shared-angles.json`
- `candidate-continuous-restored.json`
- `candidate-continuous-combat.json`
- `player-7-35-restored.jpg`

## Distribución

Cliente Vite compilado y activado en `dist/web`. La versión anterior se conserva en `output/camera-continuous-20261020/previous-web`. Se copiaron los recursos antes de las entradas HTML y se conservaron los recursos antiguos para las pestañas abiertas.

El servidor se cerró mediante el mecanismo existente de guardado confirmado y se actualizó únicamente su módulo de perfil vertical. Se restauró la generación 2397 en `mirror`, pasando del PID 17840 al 804. La escena, la configuración de cámara, las casillas de los personajes, puntos de vida, inventarios, recursos y estado de combate coinciden con el guardado final.

Las cuatro entradas `/dm`, `/dm-mobile`, `/player` y `/projector` devolvieron HTTP 200 con el HTML exacto de la compilación. También coincide el código de cámara servido y el perfil del servidor con los archivos preparados. Resultado en `evidence/published.json`.

Se cerraron la pestaña y los servidores aislados propios de esta comprobación. Las pantallas abiertas deben recargarse para utilizar el cliente nuevo.
