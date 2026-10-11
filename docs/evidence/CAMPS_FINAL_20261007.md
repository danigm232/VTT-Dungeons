# Campamentos · entrega V1.3 / V1.4 — 2026-10-07

## Alcance y auditoría

Las cinco escenas existentes se mantienen dentro de Stormwreck y como módulo
fuente autónomo. Se reutilizan escenas, roster, cámaras, grid de 1,5 m, terreno
autoritativo, proximidad, propiedad de personajes, asientos, Howler y guardado.
No se modificó la geometría del Retiro principal ni se conectaron mapas nuevos.
Los cuatro exteriores siguen siendo VTT_AMBIENCE: el DM decide su seguridad.

A1 conserva seis plantas diferentes y su orden canónico: libre, Tarak, Varnoth,
Myla y dos celdas con ocho hamacas. Conserva plaza, Astalagan, entradas y jardín.
La hoguera de la plaza es una adición visual solicitada; no se presenta como canon.

## Trabajo realizado

| Zona | Acabado |
| --- | --- |
| A1 | Roca y superficies a escala métrica, normales suavizadas y UV por cara, acantilado conservado al girar desde el exterior, juntas entre celdas, cubiertas irregulares selladas, interiores ocultos al salir, antorchas y velas limitadas a su celda, luz cálida, humo y rompiente localizada. |
| Bosque | Árboles con copas ilustradas en el espacio 3D, sotobosque y helechos, suelo y arroyo texturados, niebla legible, copas animadas, partículas y dos animales con locomoción desde su aparición. |
| Pecio | Suelo costero continuo sin agujeros, costa conectada al terreno interior, rocas erosionadas, tiendas cosidas, restos y bote 3D, viento, agua deformable, espuma y salpicaduras alineadas con el borde curvo real. |
| Observatorio | Meseta de roca, basalto, cristales, aurora oscura en geometría 3D, nubes móviles, destellos ambientales, viento y truenos lejanos. |
| Refugio | Abrigo rocoso con estratos, trepadoras y vegetación de tamaños distintos, pozas redondeadas con ondas, goteos, niebla húmeda, oleaje y audio amortiguados. |

Los exteriores tienen tres tiendas amplias cerradas y diferenciadas, con
colchonetas, equipo personal y baúles de Mike, Mia y Trinity. Sólo se retira la
cubierta de la tienda ocupada. El baúl abre su tapa y conserva su estado; el
asiento utiliza el sistema existente y una pose sentada del personaje.

La pasada final añade desgaste de suelo mediante color continuo y capas con
bordes difuminados, piedras encastradas de 2,5 cm y especies agrupadas sin un
anillo uniforme. Los detalles nuevos permanecen decorativos y conservan las
colisiones existentes. El terreno autoritativo también recibe las sombras;
antes tapaba las del fondo continuo. Hay leña, recipientes y mantas junto a
los puntos existentes, sin ocupar nuevos pasillos con objetos altos.

El DM usa el resaltado discreto y selecciona puntos en el mapa; las acciones
pertenecen a los jugadores. El descanso normal requiere preparar, tres avances
y confirmar: cinco acciones. Las interrupciones son opcionales. No se aplican
beneficios ni se generan encuentros, decisiones narrativas o tiradas.

## Verificación

- Suite general: **469/469**, 61 archivos, duración registrada 204,16 s (junto a la compilación).
- Suite específica: **15/15**, repetida después de ajustar geometría y efectos; última ejecución 26,24 s.
- Tipos cliente y servidor, compilación de producción: correctos.
- Integración conectada: DM + proyector + Mike/Mia/Trinity sobre servidor aislado.

| Escena | Pasos reales | Acciones comprobadas |
| --- | ---: | ---: |
| A1 | 160 | 10 |
| Bosque | 82 | 7 |
| Pecio | 87 | 7 |
| Observatorio | 112 | 7 |
| Refugio | 113 | 7 |
| Total | **554** | **38** |

Comprobados obstáculos y límites, propiedad de baúles, sentarse/levantarse,
los cinco cambios de escena recibidos por los clientes, todas las fases del
descanso, interrupción/reanudación y PG intactos. Guardado y arranque posterior
conservan escenario, asiento, descanso y baúl; reconexión correcta. Las 17
solicitudes de audio y sprites devolvieron 200.

La revisión en navegador registra los fotogramas normales del motor Babylon, sin forzar renders fuera de su ciclo. Se esperan 24 fotogramas al girar y 36 al abrir un interior; la codificación de la PNG mantiene detenido el siguiente fotograma para conservar una imagen completa. Las capturas y métricas
se guardan en `output/camps-final/`; `visual-report.json` registra vistas,
preparación de recursos, mallas, vértices, llamadas de dibujo, partículas,
GPU y tiempo de envío del render. Este último dato **no equivale a FPS**.
`playability.json` registra la integración completa. La galería incluye las 18
vistas interiores y comparaciones reales de A1, bosque, playa y Observatorio.
El antes de A1 es el prototipo conservado en
`output/a1-review/before-matched-v4.png`, copiado sin modificar. Las otras tres
son capturas anteriores conservadas en la carpeta de esta revisión.

Resultado final: **80/80 vistas exteriores con recursos listos**, ocho ángulos
de día y ocho de noche por escena, más **18 interiores**. Las 98 capturas PNG
se conservaron y se comprobó su integridad (CRC y descompresión de píxeles,
`capture-integrity.json`). Sin errores de consola en la
revisión final del visor. Equipo registrado: Intel UHD, WebGL 2 sobre ANGLE/D3D11.

| Escena | Mallas totales | Vértices | Máx. llamadas de dibujo | Envío del render CPU (ms, muestras) |
| --- | ---: | ---: | ---: | ---: |
| A1 | 116 | 353993 | 90 | 4,3–14,6 |
| Bosque, incluida fauna | 174 | 197385 | 162 | 8,4–15,5 |
| Pecio | 138 | 85597 | 148 | 6,8–30,2 |
| Observatorio | 144 | 88788 | 149 | 4,2–13,3 |
| Refugio | 146 | 124770 | 161 | 4,9–13,2 |

La primera pasada registró un pico puntual de 428 ms en el bosque. Se conserva
en `visual-report-first-pass.json`; se repitió la captura tras cerrar los visores
duplicados, con el rango indicado en la tabla. Son muestras de trabajo CPU por
fotograma durante revisión, no un benchmark sostenido de FPS ni de móviles.

En el VTT completo se comprobó la selección de escena, elección de Mike,
entrada al proyector y menú contextual. La partida real del puerto 3000 se
conservó; la revisión jugable utiliza otro puerto y otro directorio privado.

Interfaz de jugador comprobada a **390 × 844** y **844 × 390**: elección de Mia,
escenario, joystick y rueda de acciones visibles; sin desbordamiento horizontal.
Esta emulación comprueba disposición y entrada, no acredita FPS en un teléfono.

## Optimización y componentes reutilizables

- Lotes de geometría estática; interiores A1 cerrados omiten muebles y suelos.
- Menos de 128 mallas estáticas en A1 y 160 en cada exterior. La fauna es
  adicional y se carga sólo en el bosque.
- Sombras almacenadas y glow a 1/4 en PC; sin estos pases en compacto.
- Partículas de capacidad finita, textura compartida, menos emisión en móvil.
- Agua a 12 Hz en compacto / 20 Hz en escritorio; reducción de subdivisiones.
- Movimiento reducido atenúa efectos y desactiva los destellos.
- `diorama-kit.ts` aporta roca orgánica, materiales, luz y sombra de contacto;
  `camp-atmosphere.ts` aporta mar, rompiente y partículas.

No se añaden dependencias. Se reutilizan Babylon.js, los materiales existentes,
el atlas vegetal y los dos GLB Quaternius CC0 aportados por el usuario.
Los nuevos sonidos son síntesis original; las tres poses sentadas se generaron
mediante ImageGen integrado, conservando los personajes existentes.
Prompts, modo integrado, procedencia y rutas: [poses sentadas](../../campaigns/camp-rests/public/art/camp-seated-v1/README.md). Procedencia de sonido: [audio original](../../campaigns/camp-rests/public/audio/camp-final-v1/README.md).

## Archivos afectados

- `campaigns/camp-rests/public/{a1-visuals,outdoor-visuals,camp-atmosphere,visuals,forest-fauna,pack}.ts`.
- `engine/client/{diorama-kit,coastal-backdrop}.ts`.
- `engine/server/{game,camp-rest.test}.ts`.
- `apps/web/{player,dm}.ts` y `apps/web/dm.html` (novedades V1.4.4).
- `scripts/camps-{review,review-server,playability,gallery,preview}.*`.
- `scripts/generate-camp-audio.mjs` y nuevos recursos en `public/art/camp-seated-v1`
  y `public/audio/camp-final-v1`.
- README del módulo y este informe.

## Cómo verlo

- Galería: `http://127.0.0.1:4482/evidence/gallery.html`.
- Visor: `http://127.0.0.1:4482/scripts/camps-review.html`.
- VTT de revisión: `http://127.0.0.1:4485/dm`; jugador `/player` y proyector `/projector`.
- El inicio normal con `INICIAR.cmd` compila los cambios para la mesa habitual
  cuando el puerto esté libre.

## Límites y siguiente trabajo

Las comprobaciones anteriores acreditan la implementación y los recorridos
ensayados. No garantizan ausencia de todo error ni equivalencia artística
exacta a las referencias. La aceptación visual y auditiva final del usuario y
la medición en móvil/proyector físicos siguen siendo pruebas de esos equipos.
No quedan beneficios de descanso o transiciones por implementar: están
deliberadamente bajo arbitraje del DM o fuera de este encargo.

Siguiente trabajo recomendado: una sesión de mesa en los dispositivos finales
y ajustes de volumen/contraste según el proyector. Para esos ajustes acotados
mi recomendación es continuar con Luna Max. Para otra intervención extensa en
arquitectura, render y red elegiría GPT-6.1 Sol o Astra. Es una recomendación
para este proyecto, apoyada en la [guía oficial de modelos](https://learn.chatgpt.com/docs/models),
que distingue tareas acotadas de flujos complejos; no es una comparación
de rendimiento realizada entre modelos en este repositorio.
