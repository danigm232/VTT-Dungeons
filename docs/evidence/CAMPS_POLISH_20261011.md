# Campamentos · mobiliario, vida y sombras V1.4.7

12 de octubre de 2026. Revisión de las doce peticiones sobre los cinco
campamentos independientes. La geometría del Retiro principal queda fuera
de esta entrega.

## Cambios

| Petición | Resultado |
| --- | --- |
| Muebles superpuestos | Distribución de los muebles básicos y decorativos de las seis celdas. Escritorios, sillas, herramientas y estanterías junto al perímetro; entradas libres. Se mantienen los identificadores de interacción. |
| Astalagan | Dragón orientado al mar, material de piedra con textura, relieve y variación de color. Cinco velas físicas con llama animada y luz cálida acotada durante la noche. |
| Corte del mapa A1 | Continuación visual de roca, costa y plataforma hasta fuera del encuadre y límites normales de cámara. No añade conexiones con otros mapas. |
| Postes flotantes | Recolocados según el borde real de la plaza; bases de roca apoyadas en el acantilado. |
| Tiendas y terreno | Lona de suelo ajustada a la tienda, collar de terreno con transparencia gradual y textura acorde a cada entorno. |
| Cristales | Textura y relieve de roca, color mineral y luces azules de intensidad 0,16 y alcance máximo de 3,8 metros. |
| Animaciones de ciervos | Corregida la eliminación de clips durante el recorrido de una lista que cambiaba al eliminarlos. Walk, Gallop, Idle, Idle_2, Idle_Headlow y Eating se conservan. Pose y desplazamiento comparten reloj desde el primer instante del acceso. Rutas fuera de la cuadrícula. |
| Vida ambiental | Aves lejanas e insectos ocasionales, con entrada/salida gradual, variación diurna/nocturna y respeto a movimiento reducido. Dos mallas pequeñas por escena. |
| Contactos | Más definición bajo muebles y objetos, sombras estáticas de contacto y sombras reales de luz. |
| Fuentes de luz | Puestos de guardia ahora incluyen una luz real; fuentes de interiores limitadas a la habitación o tienda correspondiente. Luces cálidas apagadas de día. |
| Sombras de tiendas | La tela fina participa en el mapa de sombras; su sombra de contacto permanece al ocultar el interior. |
| Sombras de personajes | Proyección básica dinámica según dirección, intensidad y alcance de la luz dominante. Las fuentes excluidas de la celda no influyen. Comparte la máscara de contacto cargada y no modifica la dirección del sol. |

## Archivos principales

- `campaigns/camp-rests/public/a1-layout.ts`, `a1-visuals.ts`: mobiliario, estatua y continuación visual.
- `campaigns/camp-rests/public/outdoor-visuals.ts`, `camp-surface-effects.ts`, `camp-detail-kit.ts`: terreno de tiendas, cristales, luces, sombras y relieve irregular.
- `campaigns/camp-rests/public/forest-fauna.ts`, `camp-life.ts`: animación de animales y vida ocasional.
- `engine/client/actor-shadow.ts`, `world-billboards.ts`, `apps/web/world.ts`: proyección de sombras en campamentos.
- `apps/web/dm.html`, `dm.ts`: novedades V1.4.7 al iniciar.
- Pruebas y visor: `camp-polish.test.ts`, `world-billboards.test.ts`, `scripts/camps-review.*`, `actors-camp-playability.mjs`.

## Comprobaciones

- 70/70 pruebas dirigidas, más 12/12 comprobaciones repetidas de sombras, distribución y fauna después del último ajuste.
- Prueba conectada con DM, tres jugadores y proyector: 680 pasos y 120 interacciones. Colisiones, descanso con interrupción, guardado y reconexión correctos; PG sin cambios automáticos.
- Tipos de producción del cliente, del visor y compilaciones de cliente/servidor.
- 112 capturas reales de Babylon: 80 vistas de día/noche, ocho ángulos, 30 interiores y dos detalles de Astalagan. Las 80 muestras tienen los recursos preparados. Registro en `output/camps-polish-20261011` y galería `gallery.html`.

El relieve de piedra utiliza grano irregular sin las bandas diagonales del patrón
anterior. Se retiran las capas artificiales de resplandor en exteriores para
que la luz real produzca la iluminación.

Las comprobaciones de producción y del visor pasan sobre la versión compilada
de esta entrega. Una comprobación posterior de todo el espacio de trabajo detectó
cambios concurrentes con errores de tipos fuera de los campamentos: variables
repetidas en `engine/client/ship-rowboat3d.ts` y un campo de portal en
`engine/server/game.ts`. Esos archivos están siendo desarrollados por separado
y no se corrigen en esta entrega. La revisión V1.4.7 usa su compilación guardada.

La revisión abre en `http://127.0.0.1:4490/dm` y la galería en
`http://127.0.0.1:4488/evidence/gallery.html`, en este equipo. Novedades
V1.4.7 y entrada en A1 comprobadas en la interfaz compilada, sin errores
de consola durante esa entrada.

## Rendimiento y límites

Se conservan los presupuestos de geometría, el perfil compacto y las sombras
con caché. Un mapa de sombras del sol/luna y uno de la fuente local más cercana;
no se añaden mapas de sombra a cada vela. La proyección del personaje es una
sombra simplificada sobre el suelo, no una silueta física detallada sobre paredes.
La continuación del acantilado es VTT_AMBIENCE; no amplía el espacio transitable.

Las mediciones breves del visor documentan este equipo y sus dimensiones de
vista. La prueba prolongada en móvil y proyector físicos sigue recomendada.
No se necesita cambiar de modelo para aplicar o comprobar esta entrega.
