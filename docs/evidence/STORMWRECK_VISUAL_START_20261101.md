# Retiro y Pecio · inicio del acabado visual compartido

01/11/2026. El usuario elige empezar por Retiro del Dragón y el Pecio Rosa de los Vientos. Entrada de planificación: [roadmap maestro](../../ROADMAP_V1.md). Se mantienen la revisión técnica 19 del Retiro, sus referencias aprobadas y los contratos M5/M7 del Pecio. Cena pasa a trabajo posterior sin perder su encargo.

## Primera subentrega: personajes y luz, VA-10/11

Base: los sprites nativos son materiales sin iluminación. Existía un muestreador local conectado al Espejo; Retiro/Pecio no lo usaban. Además, la imagen emisiva sumada al color emisivo anulaba buena parte de una multiplicación de color. La nueva modalidad usa una sola imagen de albedo para estos dos mapas. Espejo y las demás escenas mantienen su modalidad anterior.

`campaigns/stormwreck-isle/public/actor-light.ts` calcula una adaptación pictórica a partir de las intensidades/colores vivos del sol, ambiente, fuegos, velas, rellenos interiores y antorchas que ya posee cada mapa. No es un sistema de GI ni de luz por píxel sobre anatomía. La silueta conserva un mínimo de legibilidad; la visibilidad sigue perteneciendo al VTT existente.

- Retiro: distingue exterior, seis celdas trasladadas y salas A2/A3/A4. Reutiliza los rellenos interiores existentes; no añade lámparas ni fuentes narrativas.
- Pecio: separa C4–C7, plantas inferiores y cubierta exterior. Una antorcha se apaga al apagar su fuente y no colorea otro camarote ni la cubierta superior. No inventa brillo para C9.
- Mantiene atlas, animación, tintes de estados, transparencia, pivote de pies, selección y cámara. No edita geometría, colisiones, terreno, reglas, guardados o WASD.
- Sin recursos comerciales nuevos, generación de imágenes, dependencias, mapas de sombra o texturas adicionales. Código propio; referencias Octopath/II para integración luz/personaje, sin copiar recursos. No se modifica el comportamiento del Espejo.

## Evidencias y estado

Revisión reproducible en `prototypes/stormwreck-light-sample-20261101/`: ejecutar Vite con su `vite.config.mjs` y abrir `/review.html`. Usa el `WorldRenderer` actual y snapshots públicos sintéticos. El botón guarda pares con la misma escena, posición, cámara a 15°, hora, grid y recursos, alternando únicamente la adaptación de color. La animación ambiental sigue viva: no equivale a una comparación píxel a píxel de todo el paisaje.

Salida en [galería de comparativas](../../output/stormwreck-light-sample-20261101/index.html). Resultados de esta subentrega:

| Comprobación | Resultado y límite |
| --- | --- |
| Pruebas automatizadas dirigidas | 25 aprobadas en cuatro archivos: luz regional, billboards, tintes/estados y carga de escenas. Incluye apagado/distancia/camarote/planta, celdas trasladadas y ausencia de recursos gráficos nuevos en el muestreador. |
| Tipos de cliente | `tsc -p tsconfig.client.json --noEmit`, correcto. |
| Compilación aislada de cliente | Correcta en `runtime/stormwreck-light-sample-20261101/web`; no se sustituye la distribución habitual. |
| Retiro integrado | Seis pares: plaza, comedor y biblioteca, día/noche. Cámara de 15° y zoom medio comparable. |
| Pecio integrado | Cuatro pares: cubierta y C4, día/noche. C4 con antorcha portada; cubierta sin antorcha. |
| Comparabilidad | 10 pares/20 imágenes, pose de cámara y recuentos de mallas/luces/texturas iguales dentro de cada par. Validación sin incidencias; no implica igualdad píxel a píxel del ambiente animado. |
| Modos de rol | Seis comprobaciones del mismo renderizador: DM/jugador/proyector en ambos mapas, incluyendo retirada de la antorcha y grid visible/oculto. Sin errores; no son tres interfaces completas ni sesiones de red. |
| Inspección visual | Revisadas capturas del comedor y Pecio: cambio visible de tono/atenuación, sin cambiar escenario o pie de apoyo. La coherencia artística final no se acredita por estas diez posiciones. |

La revisión visual detectó una primera implementación cuya atenuación quedaba lavada por la imagen emisiva adicional. Se corrigió con una modalidad de albedo optativa solo para Retiro/Pecio y se repitieron las capturas. Las imágenes y JSON actuales corresponden a esa corrección. El material heredado de Espejo/otras escenas permanece cubierto por regresión y no se activa la nueva modalidad en ellas.

Datos legibles en `dragon-rest-comparison.json`, `wreck-ship-comparison.json` y `validation.json`, dentro de la galería. No constituyen aprobación del usuario, ensayo de red o pruebas de móvil/proyector físicos, escucha, FPS o memoria GPU total. No se reinicia/publica la mesa habitual ni se modifica una partida real.

## Continuación del mismo alcance

1. Retiro: muestra de comedor/umbral con escala de detalle común entre basalto, suelo, mesa/bancos, personaje y vegetación contigua; preservar todas las ampliaciones de revisión 19.
2. Pecio: muestra C1/C3 y un camarote con madera húmeda, herrajes, cabos, contacto y mar, conservando casco, cubiertas, rutas, botín y estado.
3. Extender las familias revisadas por zonas y afinar profundidad/primer plano, sombras/contactos y atmósfera. No añadir filtros para ocultar incoherencias de materiales.
4. Validar cada candidata jugable; mantener la aceptación M5, el ensayo físico M7 y Q1 del Retiro como estados separados.

Esto inicia la mejora: no cierra VIS-2/3/4 ni declara terminado el parecido con las referencias.
