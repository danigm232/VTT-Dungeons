# Estados: indicadores, duración y control del DM

## Cambios

- Un solo indicador vectorial por condición, con prioridad y contador cuando hay más de cuatro. Se retiran los PNG superpuestos de cuerpo completo, las manchas de color y los puntos redundantes. Los archivos originales no se borran.
- Los indicadores siguen el zoom y los desplazamientos de la animación, con tamaño de lectura acotado. En los escenarios 3D se comprueba la ocultación de la cabeza; los estados no se muestran a través de las paredes. No se realizan comprobaciones adicionales para actores sin estados.
- Jugadores, PNJ y criatura entregan sus estados y orígenes al DM incluso fuera de combate. En la ventana de jugadores hay retirada directa y acceso a «Ficha y estados». El panel de la ficha permanece actualizado sin reconstruir el formulario durante el movimiento.
- El DM puede quitar un estado o aplicar/actualizar su duración en rondas, segundos, minutos u horas. También puede elegir inicio/final del turno del afectado. Hasta retirarlo conserva las reglas del origen, pero elimina el temporizador.
- Los estados temporales conservan el tiempo restante al iniciar, terminar o abandonar un combate. Las rondas equivalen a seis segundos; las duraciones genéricas empiezan a contar desde la posición de iniciativa donde se aplicaron, no desde un cambio de ronda parcial. Esperar una tirada no consume la duración de los participantes.
- Fuera de combate se cuenta tiempo mientras funciona la mesa. Los personajes ajenos al combate conservan su reloj de exploración. Guardar/cargar conserva el tiempo pendiente y no cuenta las horas durante las que la mesa estuvo cerrada.
- Los ataques con salvación admiten duración declarada por su efecto. Se mantiene la liberación por CD y por derrota del origen. No se inventa una duración común para venenos, miedo, agarres o encantamientos sin una definición concreta.
- La inconsciencia por 0 PG tiene un origen independiente y no caduca. Recuperar PG elimina ese origen, pero no borra otro efecto independiente, como sueño. Quitar estados desde el DM nunca modifica los PG. Caer a 0 PG deja al personaje derribado.

## Criterio de reglas

La duración viene del efecto que impone la condición, no del nombre de la condición. Derribado termina al levantarse, por ejemplo; una restricción puede requerir escapar, y la inconsciencia por 0 PG no funciona como un veneno de un minuto. Referencias oficiales: [Reglas básicas 2024: jugar](https://www.dndbeyond.com/sources/dnd/br-2024/playing-the-game), [glosario de reglas](https://www.dndbeyond.com/sources/dnd/br-2024/rules-glossary/).

Las condiciones antiguas sin duración fiable permanecen hasta que el DM las retire o programe su duración en la ficha. No se sustituye por suposición el reglamento de los monstruos originales de una aventura.

## Verificación y uso

- 139 pruebas aprobadas de relojes, comandos DM, salvaciones, orígenes múltiples, inmunidades, inconsciencia, cambios de combate, guardados y ocultación.
- Comprobación de tipos del cliente y del servidor aprobada; las comprobaciones adicionales de ocultación también pasan tras separar las cachés de cuerpo y estados.
- Compilación de producción comprobada en una salida aislada, sin reiniciar la mesa activa.
- Revisión visual aislada disponible mediante `node scripts/conditions-preview.mjs` y `/scripts/conditions-review.html`. El navegador automatizado devolvió errores de navegación CDP tanto en el navegador integrado como en Chrome; no se afirma aprobación visual de la interfaz real.
- Para incorporar los cambios a la mesa habitual: ejecutar INICIAR.cmd y elegir A (actualizar, guardar y reiniciar), después volver a cargar DM/jugadores.

Se han preservado los cambios de escenarios y demás trabajos paralelos. La comprobación final detectó que el renderizador paralelo de campamentos ya leía `WorldSnapshot.campActivity`; se añadió únicamente la declaración opcional que faltaba en su contrato, sin cambiar el comportamiento de los campamentos. No se modifica ni se elimina ningún guardado de la mesa real.
