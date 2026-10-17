# D8 V54 — correcciones de las últimas capturas

Informe histórico: la última petición sustituye los paños lisos por vidrieras en [V55](D8_V55_STAINED_GLASS_20261013.md). El resto de correcciones se conserva.

13 de octubre de 2026. Continúa V53. La versión remota consultada al iniciar seguía en V49; esta entrega es local y no se ha publicado en GitHub.

## Trazabilidad de las doce peticiones

| Petición | Cambio aplicado | Comprobación |
|---|---|---|
| Templo: cerrar la rendija con cristal | Siete paños transparentes de fachada y laterales, alpha 0,14, con remates finos. Se retiran los cierres opacos superiores de fachada. | Rayos de cierre y material real en las mallas; el cristal no tapa los tokens. |
| Templo: el primer techo tapa la segunda habitación | La nave oculta también el techo del vestíbulo. Entrar solo en el vestíbulo no revela la nave. | Las dos direcciones de transición se comprueban por separado. |
| Templo: estrellitas al conceder Inspiración | Ocho estrellas doradas siguen al personaje y se disuelven en 1,8 s. Módulo reutilizable en `engine/client/reward-effects.ts`, conectado a DM, jugador y proyector. | El evento solo se emite al conceder la recompensa; rechazo, cancelación y repetición no lo emiten. No altera reglas ni dados. |
| Fritz: farola flotante y estructura extraña | Poste visible de 19 cm, pie de piedra y retirada del arco ruinoso junto al paso. | Soporte conservado tras agrupar geometría; obstáculos derivados de la configuración actualizada. |
| Fritz: casa sin techo | La visibilidad del edificio se decide con la posición real del personaje, no con el punto al que mira la cámara. | Cubierta y puerta visibles en el exterior y en el punto de aparición; ocultación interior comprobada. |
| Fritz: árboles sin hojas/ramas | Cuatro abetos con doce copas opacas y ramificación, conservando la nieve decorativa. | Doce copas habilitadas después del agrupado. |
| Café: los clientes no regresan | Tras llegar a una ventana rota miran durante 10 s y regresan a su posición y orientación anteriores. Al volver a su asiento recuperan la animación de beber. | Las siete ventanas, guardado/restauración, una posición personalizada por DM y notas antiguas malformadas. |
| Café: atravesar la puerta cerrada | Barrera autoritativa ajustada al ancho y orientación del vano, también en diagonales. | Todos los cruces de casilla se bloquean en ambos sentidos; abrir la puerta permite pasar. |
| Café: cubierta y marcos abiertos | Se conserva la envolvente completa y los frontones de V53. La corrección del foco real evita ocultar cubiertas por desplazar la cámara al interior mientras el personaje sigue fuera. | Cubiertas visibles fuera, invisibles dentro, marcos/hojas opacos y cierres geométricos. |
| Café: suelos azules bajo casas | Se retiran las losas laterales azul-verdosas y se utiliza la continuidad del pavimento cálido del pueblo; bordes decorativos en tierra ocre. | No queda la losa lateral antigua. No cambian las colisiones de las casas. |
| Café: caballo | Las 32 poses conservan una altura lógica común de 96 px y su proporción, para representar la altura prevista de 1,45 m. Se sube el agua del abrevadero bajo su borde. | Ocho direcciones y cuatro cuadros, proporción de recorte y escala lógica; no se ha generado arte nuevo. |
| Café: llamas ausentes | Catorce lenguas de fuego elevadas sobre la base de la chimenea y adelantadas hacia la boca, con pulso/luz existentes. | Llamas habilitadas, visibles y con altura por encima del hogar. |

## Corrección adicional de la auditoría

Los indicadores de estado de un token también se ocultan cuando la parte superior del personaje queda tapada; se recuperan cuando vuelve a verse. Se mantienen los indicadores visibles de una cabeza descubierta y la máscara parcial del cuerpo. Las pruebas compartidas se actualizaron para representar el reloj/cámara interior actuales, los ciclos de locomoción de ocho cuadros y las condiciones reales de un salto (no saltar a la propia casilla ni asumir carrera sin haberla realizado).

## Auditoría de geometría y ambiente

Las seis escenas reales se construyen con Babylon NullEngine. **No son capturas ni una revisión visual con GPU.** No aparecen límites no finitos, luces referenciando mallas eliminadas, tejados ocultos desde fuera ni piezas superiores auditadas sin habitación.

| Escena | Mallas | Luces locales | Mapas de sombras | Sombras de contacto |
|---|---:|---:|---:|---:|
| Café | 698 | 35 | 3 | 22 |
| Templo | 933 | 37 | 3 | 48 |
| Cena | 656 | 9 | 2 | 11 |
| Fritz | 738 | 9 | 3 | 9 |
| Mercado | 1076 | 24 | 3 | 19 |
| Espejo | 395 | 15 | 3 | 15 |

También se comprueban las siete ventanas al romper/restaurar, iluminación solar cálida apagada de noche, ausencia de alfombras coplanares cruzadas y entrada interior a 25° con órbita manual conservada y restauración al salir.

## Entrega y comprobaciones

- V54, `playground_current.json` y `playground_v54.json` idénticos; fuentes incrustadas exactas, base64 UTF-8 válido e imports compartidos resueltos. V53 archivada.
- 31 archivos / 257 pruebas de D8, inventario, saltos, iluminación/oclusión, audio, reloj, protocolo y recompensas aprobadas.
- Tipos de cliente/servidor y compilación de producción aprobados. La ampliación global aprobó 745 de 746 pruebas; la única prueba restante era una declaración antigua de salto sin destino válido. Tras actualizar su preparación, las 71 pruebas de los dos archivos de campaña aprobadas. La comprobación global de la entrega posterior se registra en V55.
- Se activó V54 con una mesa nueva, guardado confirmado y cierre seguro para recompilar. El usuario autoriza descartar partidas de prueba: la nueva mesa ocupa la ubicación predeterminada `data/saves/d8-night-private`; el slot anterior completo se conserva en `data/manual-backups/d8-before-v54-20261013-b3fddcf6`. No se borraron partidas ni se modificó el slot de Stormwreck.

## Límite de aceptación visual

Las últimas nueve capturas del usuario se usaron como referencias de defectos, no como capturas de aceptación de V54. No se ha sorteado el rechazo explícito del navegador a la página de revisión mediante otra superficie, automatización o navegador. Esta entrega no certifica composición desde todos los ángulos, contacto artístico hocico/agua, alineación mano/cuerda, FPS, memoria GPU o escucha integral. Los efectos de tos/sollozo/carraspeo pendientes de V52 no se han descargado por una vía alternativa al bloqueo anterior.

Las páginas ya abiertas necesitan una recarga completa para cargar el cliente compilado nuevo; cambiar de escena no sustituye el código que una pestaña conserva en memoria.

Historial: [V53](D8_V53_VISUAL_POLISH_20261013.md), [V52](D8_V52_CORRECTIONS_20261013.md), [arte V52](D8_V52_ASSET_PROMPTS.md).
