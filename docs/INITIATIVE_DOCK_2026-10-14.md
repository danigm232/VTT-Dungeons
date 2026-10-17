# Posición de la barra de iniciativa

- Derecha, vertical, por defecto. Izquierda, vertical, y arriba, horizontal centrada, disponibles en **Configuración y opciones → Controles en pantalla → Barra de iniciativa**.
- Margen de 1,5 cm mediante unidades CSS, más la zona segura del dispositivo cuando corresponda. El tamaño físico depende del escalado de la pantalla/navegador.
- Preferencia local por dispositivo y campaña. Los ajustes antiguos o inválidos adoptan derecha; restablecer opciones también devuelve la barra a la derecha.
- Se conserva la línea sin ventana de fondo, el orden de siete posiciones y los retratos con información conocida. La altura se adapta a la pantalla; si no cabe, la lista se puede desplazar.
- El espacio seguro de la cámara se reserva junto al lado elegido, tanto en la vista 3D como en el modo 2D del jugador. No se cambia el encuadre del DM/proyector.
- Las ayudas de los retratos se abren hacia el interior de la pantalla. Se evita transformar/filtrar los contenedores para no desplazar sus ayudas de posición fija.

Verificación: 42 pruebas específicas correctas (posición, guardado, margen de referencia, encuadre, cámara, presentación y turnos); comprobación de tipos del cliente y compilación de cliente/servidor correctas.

La actualización normal del lanzador terminó durante esta revisión. Se comprobó que el archivo del jugador instalado en `dist` coincide por SHA-256 con la candidata verificada y que su CSS incluye el margen de 1,5 cm. No se reemplazó ni reinició la mesa que después quedó abierta.

Revisión visual: se añadió `scripts/initiative-layout-review.html`, que usa los estilos reales sin iniciar una partida. El navegador integrado agotó el tiempo de respuesta al navegar y al recuperar la pestaña; por ello no se da por completado el pase visual. El servidor temporal de revisión se cerró y no se tocaron partidas.
