# Auditoría DM: cámara, roseta y descanso pendiente

## Causas verificadas

- La geometría de la roseta probaba primero dos semicírculos cuyo centro estaba fijado al borde del mapa; ignoraba la posición del objeto.
- El historial de actividades y el descanso compartían un único registro global. Un descanso activo en otra escena bloqueaba incluso sentarse o abrir el baúl; quitar solamente esa validación habría sobrescrito el descanso.
- Comprobación de solo lectura en la mesa de puerto 3000: el mapa mostraba «02 · Bosque camino a Pleamar» y el panel indicaba descanso activo en «01 · Habitaciones A1». No se ha finalizado ni alterado esa partida.

## Correcciones

- Cámara sin los desplegables de modo/foco: tres botones de movimiento, fichas visuales para elegir el foco y grupos compactos de encuadre, giro e inclinación. Se mantienen cuadrícula, compartir giro, detalle y restablecer.
- Roseta centrada en el objeto, con proyección actualizada al mover/girar la cámara. Los objetos de varias casillas usan el centro de su huella. Anillos/arcos adaptativos, como máximo cuatro acciones en esquinas, reducción y paginación cuando falta espacio. Etiquetas bajo cada acción, dentro del mapa y sin colisiones.
- Cerrar y paginación permanecen accesibles cerca de los bordes; solo se desplazan esos controles cuando es necesario, no el origen de las conexiones al objeto.
- Iconos de actividad identifican manos al calor, comida, hoguera, lecho, estudio, oración, vigilancia, herramientas y baúl. Las acciones no disponibles conservan etiquetas legibles y permiten consultar el motivo sin ejecutar comandos.
- Historial acotado por campamento, independiente del único descanso activo. Usar otro campamento conserva fase, interrupciones y resultado del descanso pendiente. Se conserva también el estado de los baúles entre escenas y al guardar/restaurar.
- Guardados anteriores compatibles: el nuevo campo opcional se inicializa desde el historial existente; se rechazan referencias desconocidas y campamentos duplicados. No se otorgan PG, recursos ni beneficios de descanso.
- El aviso identifica la escena del descanso y ofrece «Volver al descanso pendiente». Cambiar el mapa no completa un descanso ni autoriza dos simultáneos.

## Verificación

- Tipado cliente y servidor sin errores.
- Pruebas de roseta: 16; presentaciones DM: 6; reajuste de mesa: 9; actividades: 7; descansos: 15; persistencia: 20. Todas aprobadas antes de la revisión final.
- Regresión cruzada: preparar en bosque, abrir/cerrar un baúl en playa, guardar y restaurar sin perder el descanso; sigue bloqueándose un segundo descanso simultáneo.
- Revisión en Chrome sobre una partida temporal aislada (puerto libre y datos temporales): cámara sin selectores visibles de modo/foco; roseta alrededor de la hoguera; aviso de descanso en otro campamento y navegación de vuelta funcionando.
- Compilación final aprobada: 2165 módulos, 4 min 48 s. Las 73 pruebas de las seis suites citadas están aprobadas, incluida la regresión de finalizar el descanso anterior y preparar otro sin perder el historial del baúl.
- Comprobación visual final: los botones «Seguir» y «Trinity» cambian el modo/foco. Tras girar con Q, la roseta sigue abierta y su centro queda a menos de 1 px de la marca de la hoguera. Pulsar «Calentarte las manos» sin actor cercano muestra el motivo, sin ejecutar la actividad.
- Capturas nuevas: `DM_CAMERA_COMPACT_20261008.png` y `DM_OBJECT_ROSETTE_20261008.png` en esta carpeta. La habilidad de control del navegador permitió detectar el exceso de altura de la primera versión y reducir el panel a dos filas en escritorio.
- Se conserva el árbol de trabajo ajeno. No se publican cambios ni se reinicia el servidor de la partida real.

## Activación

El servidor ya abierto conserva la lógica anterior en memoria. Para activar también la corrección del descanso hace falta cerrar/reabrir el servidor mediante su flujo normal de guardado y recargar la mesa. No basta recargar únicamente la página para actualizar el servidor.
