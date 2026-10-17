# D8 V53 — pasada de acabado en fuentes

Informe histórico. La entrega posterior y sus límites de verificación están en [D8 V54](D8_V54_CORRECTIONS_20261013.md).

13 de octubre de 2026. Estado local V53; GitHub main sigue en V49 según lectura directa al iniciar esta pasada. No se ha publicado, reiniciado la partida ni cambiado el guardado.

## Cambios realizados

Esta pasada continúa V52. Se corrigieron cuatro defectos concretos encontrados al inspeccionar las fuentes reales:

1. **Casas decorativas sin extremos cerrados.** Los faldones y la cumbrera usaban alturas fijas, aunque variaba la anchura de cada casa. Ahora el alero, la pendiente y la cumbrera derivan de una misma geometría; los dos extremos llevan frontones volumétricos, en el revoco de la fachada, y remates de alero. Las casas mantienen tamaño, posición y colisiones anteriores.
2. **Ventanas traseras del Café con decoración persistente tras romperlas.** Su cristal y cinco listones interiores se construían como decoración sin asociación a la ventana interactiva. Ahora pertenecen al mismo objeto que controla la rotura/apertura y desaparecen con él. Se conservan los marcos exteriores y alféizares.
3. **Vestíbulo del templo abierto por los laterales.** Los muros laterales llegaban a 2,7 m, pero el alero estaba a 5,6 m. Se cierra ese espacio en piedra, sin cambiar el paso ni fundir vestíbulo y nave. La banda superior de nave solapa ligeramente las coronaciones para eliminar una junta de 1,5 cm.
4. **Haces azules pese al atardecer cálido.** Aunque la luz principal ya era cálida, las luces de ventana, manchas de suelo y haces todavía tenían valores azules. Ahora son dorados/ámbar y menos intensos; reciben la intensidad solar del reloj y se apagan por la noche. Se retiran los discos de luz artificial asociados a esos haces naturales. Los frontones del templo son piedra, no madera; además tienen grosor y no alteran el descarte de caras de otros materiales.

No se modificaron reglas, tiradas, PNJ, rutas de movimiento, inventarios ni bonos de V52. No se regeneraron imágenes ni se reemplazaron los sprites ya incorporados. Tampoco se cambiaron colores globales a ciegas: el ajuste se concentra en materiales/luces que contradicen el acabado solicitado.

## Validación

- 29 archivos / 247 pruebas aprobadas sobre la versión final V53.
- Comprobación de tipos de cliente/servidor aprobada; servidor recompilado con el número V53.
- Compilación de producción del cliente aprobada: 1 min 9 s.
- `playground_current.json` idéntico a `playground_v53.json`; contenido de fuentes y dependencias idéntico al paquete generado. V52 archivada en `historico/`; no se editaron JSON a mano.
- Construcción de las seis escenas reales con Babylon NullEngine aprobada. Esta comprobación no usa navegador ni GPU.
- Rayos geométricos comprueban el cierre de los dos extremos de cada casa decorativa, incluso tras agrupar geometría. También comprueban los dos laterales superiores del vestíbulo.
- Los siete conjuntos de cristales/listones se ocultan al destruir su ventana y reaparecen al restaurar un estado intacto. Las tres ventanas traseras registran sus cinco listones cada una.
- El templo mantiene nave y vestíbulo separados; tres luces solares y seis haces/manchas son cálidos, se apagan de noche y vuelven al atardecer.
- Tejados visibles fuera y ocultos en su habitación; cero límites geométricos no finitos, referencias eliminadas en iluminación o vigas auditadas sin habitación.

| Escena | Mallas finales | Luces locales | Mapas de sombras | Sombras de contacto |
|---|---:|---:|---:|---:|
| Café | 700 | 35 | 3 | 22 |
| Templo | 914 | 37 | 3 | 48 |
| Cena | 650 | 9 | 2 | 11 |
| Fritz | 722 | 9 | 3 | 9 |
| Mercado | 1064 | 24 | 3 | 19 |
| Espejo | 395 | 15 | 3 | 15 |

## Lo que no está cerrado

El usuario autorizó usar Computer Use/abrir el VTT y no puede proporcionar capturas nuevas ahora. Esa autorización no elimina el bloqueo previo del navegador ni permite eludirlo con otra herramienta, navegador o superficie. No se ha accedido a la página bloqueada por una vía alternativa.

No hay capturas de V53, revisión artística real dentro del VTT, escucha integral ni medición de FPS/memoria. Por ello esta pasada **no certifica el acabado visual como terminado**. Siguen pendientes la composición desde todos los ángulos, alineación mano/cuerda, oclusión de sprites, balance de sombras y comodidad de la mochila móvil. Los efectos de tos/sollozo/carraspeo siguen pendientes de una descarga autorizada; no fueron sustituidos por archivos con licencia inventada.

El detalle de V52 y la trazabilidad de su arte se conservan en [D8_V52_CORRECTIONS_20261013.md](D8_V52_CORRECTIONS_20261013.md) y [D8_V52_ASSET_PROMPTS.md](D8_V52_ASSET_PROMPTS.md). Para activar V53 en una partida que ya estaba abierta, habrá que recargar los clientes y reiniciar el servidor conservando el guardado. Esta pasada no interrumpió la sesión activa.
