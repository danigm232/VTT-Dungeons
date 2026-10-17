# Auditoría de mesa DM y guardado · 17/10/2026

## Cambios

- Encaje por alturas reales, con subfilas bajo paneles pequeños o plegados. Las proporciones solicitadas se conservan al cambiar el tamaño de pantalla.
- Cuadrícula de 60 divisiones: admite cinco ventanas compactas en una misma fila si tienen anchura suficiente. Las guías y fichas reciben más ancho que los controles breves.
- Cuatro disposiciones revisadas: Mapa y relato, Lectura cómoda, Control táctico y Vista general. Aplicarlas restaura los paneles minimizados y elimina alturas manuales anteriores.
- Ampliar ocupa una fila completa; restaurar recupera el ancho solicitado sin modificar el orden. Plegar conserva la cabecera y deja espacio debajo; cerrar retira el panel y permite recuperarlo.
- La rueda y el trackpad desplazan la mesa también sobre el mapa. Los paneles de texto con recorrido disponible conservan su desplazamiento local; al llegar al límite continúa la mesa. Ctrl + rueda conserva el zoom del mapa.
- El selector de escena, la cámara y las marcas de objetos están reunidos en Herramientas. El panel es superpuesto y no reduce el mapa. Se elimina el antiguo botón Mapa sin función.
- Cabecera y conexiones más compactas; Guardar, Nueva partida y Cargar partida comparten una fila en escritorio.
- Barra inferior flotante: aparece cerca del borde, se oculta tras 2,6 s y permanece visible con el cursor o el foco dentro. Nuevas solicitudes y avisos de combate/guardado la muestran y activan el rebote. Se respeta movimiento reducido.

## Guardado

Se detectaron guardados tras 1 s de inactividad, un máximo de espera de solo 5 s, otra comprobación cada 30 s y copias inmediatas al cambiar el foco de cámara.

- Cambios normales: 45 s de inactividad, con un máximo de espera de 3 min durante actividad continua.
- Cambio real de escena, inicio/final de combate y decisiones narrativas: copia inmediata.
- Avance pasivo del reloj: no más de una copia cada 5 min; no adelanta un guardado normal pendiente.
- Eventos automáticos en cola de una revisión ya guardada no crean otra generación ni otra animación.
- Los guardados manuales siguen siendo explícitos y permanentes. Se mantienen diez copias automáticas y las cinco entradas más recientes en el diálogo de carga.
- El cierre sigue confirmando los segundos, el clima y el audio pendientes antes de soltar el archivo de partida.

## Verificación

- 42 pruebas aprobadas: 10 de encaje y disposiciones, 32 de persistencia y recuperación.
- Chequeos de tipos de cliente/servidor y compilación completa aprobados. Tras los ajustes finales del cliente se repitieron su chequeo y las 10 pruebas de disposiciones.
- Prueba de navegador con servidor y carpeta de datos temporales, separados de las partidas del usuario.
- Las cuatro disposiciones presentaron cero solapamientos y cero paneles minimizados tras aplicarlas.
- Ventana plegada: altura de 40 px, con otro panel colocado inmediatamente debajo, dejando 12 px de separación.
- Ampliar/restaurar mantuvo el orden y recuperó el ancho anterior.
- Rueda sobre el mapa: el desplazamiento principal pasó de 0 a 25,78 px, el límite disponible en aquella disposición.
- Abrir Herramientas mantuvo el mapa en 654 px de alto antes y después. Los controles de cámara se comprobaron en una sola columna interna.
- Barra inferior comprobada oculta en reposo y visible con foco en sus pestañas.
- Conexiones en ventana estrecha: 636 px de ancho disponible y 636 px de contenido, sin desbordamiento horizontal; Guardar, Nueva partida y Cargar partida comparten una fila.
- Compilación final instalada mediante el intercambio seguro de versiones; la compilación anterior se conserva en `runtime`. El servidor temporal de revisión se cerró confirmando su guardado.

Captura de detalle en una ventana estrecha: [herramientas del mapa](DM_MAP_TOOLS_20261017.png).
Captura en reposo, con la barra inferior oculta: [mesa privada](DM_WORKSPACE_DOCK_20261017.png).
