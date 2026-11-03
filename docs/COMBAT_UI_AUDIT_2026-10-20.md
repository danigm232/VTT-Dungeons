# Combate: niebla, iniciativa, anclajes e iconos

## Cambios

- La niebla compartida deja de estirar `d8-night-vfx-fog-smoke.png`. Se dibujan lóbulos translúcidos de borde suave, distribuidos sobre el radio en metros y reproyectados en la superficie del mapa. Se conservan duración, concentración, expiración y limpieza. Sin nuevas imágenes ni descargas.
- Iniciativa arriba y centrada, con el margen existente de 1,5 cm. Migración de las preferencias antiguas una sola vez al formato 2; los cambios posteriores a izquierda/derecha siguen respetándose. La cámara reserva el mismo espacio que ocupa la barra.
- Indicadores de actores nativos proyectados desde su anclaje real, no desde otra aproximación a su casilla. Incluye asientos, saltos, desniveles y pedestal. La altura D8 admite la superficie explícita del actor. Las casillas ocupadas se contornean al entrar en combate o preparar una acción en exploración.
- Catálogo compartido de 247 identidades gráficas para acciones, armas, trucos y conjuros: motivos SVG originales, colores y marcas individuales. Integrado en rueda y listas del jugador. Las nueve entradas confirmadas de Silverfarben son distintas; misma identidad dentro y fuera de combate.

## Alcance de las fichas

Trinity es la ficha `maria`. Silverfarben es `aoife`. Mike tiene una referencia al libro de conjuros, pero no un repertorio concreto configurado en la semilla de Stormwreck. El catálogo gráfico cubre opciones futuras, incluidos conjuros de niveles 1–5, pero NO añade conjuros, niveles, espacios, subclases ni acciones a ninguna ficha. El repertorio efectivo continúa viniendo del servidor/DM.

Referencia para distinguir repertorio preparado de catálogo: [Reglas gratuitas 2024: conjuros](https://www.dndbeyond.com/sources/dnd/br-2024/spells/). Los dibujos son originales, no reproducciones de ilustraciones oficiales.

## Comprobaciones

- Pruebas específicas de niebla, migración, iconos y cuadrícula. Matriz matemática de casilla → pies → proyección → selección con tres mapas, cuatro inclinaciones, tres giros y dos zooms; incluye la proyección desplazada por el HUD.
- Tipado cliente y compilación completa de candidata correctos.
- Integración aislada D8 correcta: DM, dos jugadores y proyector; iniciativa física, dados privados, daño, reintentos sin duplicados y retirada.
- La auditoría general inicial se registra en `runtime/combat-ui-audit-20261020.json`: 880/892 pruebas correctas. Se actualizaron los simuladores de dibujo/carga que habían quedado incompletos; no se relajaron las comprobaciones de cadáveres ni de recuperación de escena.
- Continuación del 21 de octubre: 79/79 pruebas de combate, rueda, iconos, niebla, cuadrícula, cadáveres y carga de escenas correctas (`runtime/combat-ui-targeted-20261021.json`). Integración aislada repetida correctamente con la nueva compilación.
- La auditoría general NO queda totalmente verde. Fuera de esta entrega siguen pendientes las expectativas de entrada de tienda, extensión antigua de filas, sello cerrado/bloqueado y número de criaturas migradas. La prueba exhaustiva de límites de cámara en todas las casillas de la cueva vuelve a superar 60 segundos; no se ha dado por aprobada ni aumentado su límite para ocultarlo (`runtime/combat-camera-boundary-20261021.json`).
- La verificación VISUAL sigue pendiente: el navegador integrado se queda en `about:blank` al navegar y la recuperación también agota el tiempo. No se ha sustituido esa comprobación por una afirmación de resultado visual.

## Entrega y seguridad

INSTALADA el 21 de octubre en `dist`, mediante la candidata `runtime/prepared-combat-ui-20261021` (la del día 20 se conserva como evidencia). El día 20 se respetó el bloqueo de la mesa abierta. El 21 se comprobó su cierre antes de instalar. No se reinició el servidor, no se forzó el bloqueo ni se tocaron guardados. El instalador conservó la versión anterior recuperable en `runtime/previous-build-*`. Antes de instalar se comprobó que el módulo compilado `scene-load-recovery-CIRu0lbE.js` incluyera el último filtro de visibilidad de los indicadores.

Vista aislada opcional: `node node_modules/tsx/dist/cli.mjs scripts/combat-ui-review-server.mjs`, después `http://127.0.0.1:5189/scripts/combat-ui-review.html`. Usa instantáneas de prueba existentes; no se conecta a la mesa ni guarda cambios de juego.
