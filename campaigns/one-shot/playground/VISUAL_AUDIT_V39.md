# Templo — pasada artística V39

## Alcance

Mejora del templo nativo de Babylon, tomando la composición y el contraste cálido/frío de `source/temple-original.png` como referencia. No se utiliza la ilustración como fondo. No se cambia CANON, combate, guardados ni la cuadrícula lógica.

## Correcciones de raíz

- Alfombras y sombras/luz de contacto sobre la cota real de la nave (0,28), no enterradas bajo el pavimento.
- Vidrieras y materiales artísticos protegidos frente a los pases genéricos de piedra y emisión.
- UV de piedra calculadas en unidades del mundo: desaparece la textura estirada entre paredes largas y piezas pequeñas.
- Orientación inicial desde la entrada, no desde detrás del altar.
- Asignación de luces locales por proximidad a cada malla, conservando el presupuesto de ocho luces por material.
- Sombras PCF del templo con profundidad acotada; mapa estático reutilizado mientras no cambia el escenario.

## Trabajo artístico

- Muros de piedra fría, cornisa, ménsulas y restos de cubierta solo en el perímetro.
- Ocho vidrieras con alpha real, tracería, rosetón y arcos de dovelas.
- Columnas acanaladas, capiteles y cuatro arcos en las naves laterales; ninguna cubierta tapa el tablero.
- Retablo con arco apuntado, dorados y estatua alada en lugar del bloque anterior.
- Tapices bordados, alfombras ornamentadas, mantel y paños de mesa.
- Medallón de suelo, velas votivas, hiedra, rosas y pequeños restos junto a las paredes.
- Follaje con silueta recortada en lugar de tres esferas; bosque posterior fuera de los límites jugables.
- Luz fría exterior y de vidrieras, luz cálida de altar/mesa, haces sutiles y VFX existentes conservados.

## Reutilización y ciclo de vida

Se reutilizan los builders y el ciclo de carga existentes. El helper de arco y la protección de materiales se pueden reutilizar en futuras escenas. Las nuevas texturas son procedurales, compartidas por mapa, sin descargas, licencias externas ni dependencias nuevas. Geometría decorativa estática agrupada por material; materiales y texturas locales se liberan al cambiar de mapa.

## Verificación

- Revisión mediante imágenes del renderer real en Chrome, con vistas de conjunto e interior.
- Materiales del templo preparados y cero texturas pendientes.
- Suelo receptor de sombras; 112 emisores y variante de shader con sombras comprobados.
- Tres ciclos de seis escenas: todas preparadas; conteo de materiales/texturas estable entre los ciclos segundo y tercero.
- Veinte pruebas de la aventura aprobadas en la última ejecución, incluida una nueva protección del templo, su acceso y el bosque fuera del tablero. Una ejecución intermedia falló en Misil mágico mientras se modificaba combate fuera de esta pasada; la ejecución final completa pasó sin modificar ese código aquí.
- TypeScript del cliente aprobado. El servidor aprobó una comprobación intermedia; la comprobación final detecta un cambio concurrente fuera del templo: `game.ts:1088`, TS2741, falta `sequences` en el objeto de combate. No se modifica ni se sobrescribe ese código en esta pasada.
- Compilación de producción aprobada. Persiste el aviso anterior del recurso `/art/ship/loot-atlas-m5.svg`, ajeno al templo.
- Payload V39, fuentes incrustadas, UTF-8/base64, snapshot activo único y archivo de V38 verificados.

Capturas de la escena realmente renderizada: [interior](qa/v39/temple-interior.png) y [conjunto](qa/v39/temple-conjunto.png).

## Límites

Es una mejora de dirección HD-2D, no una equivalencia con el acabado artístico de Octopath Traveler. Las formas de mobiliario/estatua siguen siendo estilizadas y procedurales. Las pruebas de navegador concurrentes con compilaciones no sirven como benchmark; falta medir el rendimiento en los móviles/proyector reales. La puesta en marcha completa debe esperar a resolver el error de servidor indicado arriba. No se reinició ni se alteró la mesa activa para esta auditoría.
