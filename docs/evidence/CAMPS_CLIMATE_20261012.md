# Campamentos · camino, reloj y climatología V1.4.8

12 de octubre de 2026. Respuesta a las siete peticiones de esta revisión.

## Cambios

| Petición | Resultado |
| --- | --- |
| Continuidad del camino | Pavimento y firme continúan más de 100 m hacia ambos extremos. Vallas con cuerda marcan el límite de la cuadrícula existente. La continuación es visual y no abre transiciones con otros mapas. |
| Postes, cuerda y plantas | Cuerda con caída entre postes apoyados en roca. Grupos de hierbas y arbustos con tamaños, huecos y posiciones diferentes, conservando las parcelas canónicas. |
| Reloj | Cerrar diálogos nativos con Escape libera la pausa. Fijar una hora anterior conserva el clima acumulado y vuelve a anclar su evolución. Los descansos rápidos quedan bloqueados durante un descanso guiado pendiente o combate; vuelven al confirmar el resultado. La etiqueta diurna sigue el reloj. |
| Climatología | Panel «Clima y reloj» en barra lateral del DM y consola móvil. Mismos comandos para lluvia/nieve en tres intensidades, viento, temperatura, niebla y oleaje. La inundación sigue separada y queda en ajustes avanzados. |
| Celdas | Desde el frente se revelan fachada y techo y permanecen los laterales y las particiones rocosas. Desde ángulos laterales sólo se recorta la pared que oculta al ocupante. La cama de Tarak se separa 24 cm de la pared y dos escritorios 20 cm, conservando casillas e interacciones. Entradas, cuatro camas y ocho hamacas conservadas y comprobadas. |
| Astalagan | Escultura con hocico largo, mandíbula, ojos tallados, cejas, cuernos curvos, garras, escamas pectorales, cresta, alas plegadas y cola curvada. Textura de piedra y relieve; velas y luz cálida orientadas hacia la estatua. |
| Auditoría | Olas, espuma y spray responden a intensidad; permanece el mar nueve metros debajo de A1. Viento fuerte dispersa niebla; lluvia intensa/viento fuerte apagan las llamas expuestas. Salpicaduras reutilizan las gotas y no añaden partículas. Tormentas atenúan el cielo y producen destellos breves sincronizados mediante la marca temporal del servidor, desactivados con movimiento reducido. |

## Reglas y decisiones del DM

Se consultó el resumen local de reglas v5.5 y las reglas oficiales de 2024.
El control «Aplicar viento a armas a distancia» activa desventaja en campamentos
para ataques con armas expuestas a viento fuerte; respeta ventaja/desventaja,
protección de celdas/tiendas y ataques mágicos. El terreno difícil por nieve
no penaliza las celdas ni el suelo protegido de las tiendas. Los avisos guían Percepción,
visibilidad, frío/calor extremos y natación. Las tiradas, el agotamiento y
los beneficios del descanso siguen siendo decisiones de la mesa.

- [Reglas oficiales: efectos ambientales](https://www.dndbeyond.com/sources/dnd/br-2024/dms-toolbox#EnvironmentalEffects).
- [SRD 5.2.1: visión y entorno](https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf).
- El umbral de nieve de 15 cm y las intensidades porcentuales son adaptaciones
  del VTT. No existe una CD universal por oleaje.
- La niebla y el agua acumulada evolucionan según tiempo de campaña; las
  animaciones siguen el tiempo visual. Cambiar oleaje no eleva la inundación.

## Fallos adicionales encontrados

La selección de sonido confundía el prefijo «stormwreck» con una pista de
«storm», pudiendo asignar océano a lluvia. Se buscan nombres específicos de
lluvia y tormenta. La interfaz real permitió reproducir el fallo.

La primera compilación de prueba contenía una versión de la capa compartida
RainAccumulation que accedía a la definición durante la construcción del
plugin. Bloqueaba el render y dejaba la iluminación inicial. La fuente
compartida corregida se incorpora en la compilación final y se comprueba
con el programa completo, además del visor artístico.

## Archivos principales

- `campaigns/camp-rests/public/a1-visuals.ts`, nuevo `a1-dragon-statue.ts`:
  camino, vallas, cuerda, plantas, cutaways, estatua y velas.
- `engine/client/coastal-backdrop.ts`, `campaigns/camp-rests/public/camp-atmosphere.ts`,
  `outdoor-visuals.ts`, `camp-fire.ts`: oleaje y respuesta de luces/fuegos.
- `engine/shared/weather.ts`, `game-time.ts`, `protocol.ts`,
  `engine/server/game.ts`, `engine/server/persistence/schema.ts`: reglas,
  reloj, audio y persistencia.
- `engine/client/weather-console.ts`, `world-weather.ts`, `game-clock-overlay.ts`:
  controles comunes, salpicaduras y lectura para jugadores/proyector.
- `apps/web/dm.html`, `dm.ts`, `dm-time.css`, `dm-mobile.html`, `dm-mobile.ts`:
  paneles, disposición móvil y novedades V1.4.8.
- Pruebas y evidencias: `a1-climate-polish.test.ts`, `weather.test.ts`,
  regresiones de reloj/campamentos, `scripts/camps-review.*`,
  `camps-capture-integrity.mjs`, nuevo `camps-climate-evidence.mjs`.

## Comprobaciones

- Suite dirigida: 132/132 pruebas, con salida correcta del proceso.
- Revisión adicional del plugin de lluvia, reloj y reglas: 13/13 pruebas.
- Comprobación final de iluminación, lluvia, reloj y reglas: 96/96 pruebas,
  con salida correcta del proceso; incluye destellos sincronizados y
  movimiento reducido sin flashes.
- Revisión final del servidor y costes de nieve protegidos: 70/70 pruebas.
- Revisión tras el ajuste final del mobiliario: 23/23 pruebas; compilación del cliente completada.
- Recorrido conectado: cinco campamentos, tres jugadores y proyector,
  705 pasos y 120 interacciones. Descanso, colisiones, guardado y reconexión;
  PG sin beneficios automáticos.
- Visor: 80 vistas exteriores de día/noche, ocho ángulos por fase y escenario,
  todas con recursos preparados; 30 interiores y detalles adicionales.
- Consola móvil a 390 × 844: pausa, hora, lluvia intensa, oleaje y reglas.
  Interfaz de escritorio: novedades y panel lateral «Clima y reloj». Cerrar las
  novedades con Escape pausa/reanuda ambos relojes. A1 comprobada de noche y
  al fijar mediodía, con lluvia intensa y charcos tras diez minutos de campaña;
  sonido «Lluvia costera» correcto y sin errores de render en esa revisión.
  Los otros cuatro campamentos se abren también en el programa completo.
  El secado a temperatura alta elimina los charcos; la candidata vuelve a A1
  con noche despejada, temperatura normal y oleaje de escena.

## Entrega y límites

La candidata abre en [DM](http://127.0.0.1:4494/dm),
[consola móvil](http://127.0.0.1:4494/dm-mobile) y
[galería](http://127.0.0.1:4492/evidence/gallery.html), en este ordenador.
La mesa del puerto 3000 conserva su proceso y su partida.

Se conservan los presupuestos de mallas y partículas, la caché de sombras y
los perfiles compactos. Las capturas/mediciones del visor son comprobaciones
breves de este equipo. Rendimiento térmico y escucha prolongada en dispositivos
móviles/proyector físicos quedan pendientes. No hace falta cambiar de modelo
para esta revisión.
