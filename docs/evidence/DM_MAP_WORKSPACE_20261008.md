# Mesa DM: reajuste, selección en mapa y navegación

## Cambios locales

- Filas calculadas en el orden de las ventanas, sin columnas vacías. Se recomponen al soltar, redimensionar, cerrar, recuperar o cambiar de tamaño el escritorio. La ventana de conexiones sigue fuera de este sistema.
- Redimensionar ya no copia la altura a todas las ventanas vecinas. Se migran las alturas secundarias de las preferencias v9/v10; se conservan orden, anchos, minimizadas y cerradas. Las nuevas alturas voluntarias se guardan en v11.
- Barra principal visible, con espacio reservado. Los paneles cortos permiten continuar el desplazamiento del escritorio; auto-desplazamiento al arrastrar cerca de los bordes.
- Se elimina el selector largo de objetos y la lista de etiquetas de Exploración. «Resaltar objetos» activa marcas locales sobre el mapa, accesibles con ratón, tacto y teclado.
- Pulsar una marca o un objeto abre una roseta. Los botones reutilizan las acciones y validaciones existentes. Seleccionar no crea una previsualización: «Mover», «Separar», «Dañar» y «Romper» la preparan explícitamente; Aplicar/Cancelar se conservan.
- Iconos reutilizados del jugador, etiquetas bajo los círculos y paginación separada. La geometría comprueba círculos, etiquetas de dos líneas, centro y paginación; reduce la cantidad visible cuando no cabe. En mapas especialmente pequeños no dibuja un menú fuera de sus límites.
- Mantener pulsado muestra la descripción sin ejecutar. Escape/cerrar vuelve al mapa. El estado completo del objeto se consulta mediante una acción explícita.
- Objetos de campamento reutilizan su lógica actual; si hay varios actores elegibles, se mantiene la elección explícita del personaje en el panel existente.
- Ambiente existe solo en la barra lateral. Giro/inclinación dejan de estar dentro de otro desplegable de Cámara. Guía de escena usa secciones excluyentes; Encuentro usa tres controles directos para Información, Posición y Ficha.

## Alcance y conservación

Sin cambios a protocolo, servidor, reglas, guardados de partida, jugador o proyector. WorldRenderer solo añade un método de proyección para anclar UI local. Se conservan los cambios ajenos ya presentes en el árbol de trabajo. Sin commit ni publicación.

## Verificación

- Tipado cliente sin errores.
- Suite cliente: 46 archivos, 186 pruebas aprobadas.
- Revisión final focalizada: 23 pruebas aprobadas en tres archivos.
- Nuevas pruebas de empaquetado: relleno de filas, orden, anchos originales, recomposición sin huecos horizontales y una fila por ventana en pantallas estrechas.
- Nuevas pruebas de roseta: 850×360, 600×450, 320×330, 450×220, 320×170 y 1200×650, etiquetas separadas y dentro de límites, paginación y mapa demasiado pequeño.
- Integración de objetos del Pecio aprobada: permisos de tres roles, puerta privada, daño/rotura, caja, revisión, deshacer y timón en cuatro rotaciones.
- Compilación cliente final completada después de las correcciones de cierre de arrastre, vista estrecha y accesibilidad táctil (2159 módulos; 2 min 43 s).

## Límite de revisión visual

Se preparó una partida temporal en puerto libre y carpeta aislada, sin usar la mesa de puerto 3000. La herramienta de navegador no ofrece Chrome en esta sesión y el navegador integrado falla al adjuntar la pestaña. La apertura desde Codex queda en cola. No se atribuye una verificación visual a estas pruebas ni se presenta una captura antigua como resultado nuevo.
