# Pecio: auditoría y reconstrucción exterior · 8 de octubre de 2026

## Auditoría previa a la implementación

Se han analizado las **once** capturas adjuntas (la instrucción menciona diez).
Se numeran en el orden recibido. El PDF conserva su función descriptiva;
las referencias pictóricas locales conservan su función artística.

| Capturas | Defecto observado | Origen localizado | Intervención requerida |
|---|---|---|---|
| 7, 9, 10, 11 | Eslora rectangular con bordes escalonados; paredes verticales como plataforma | `wreck-runtime-v6.ts`: perfil casi paralelo; `terrain3d.ts`: casco extruido desde bordes cuadrados de cada casilla y duplicado bajo C2/C3 | Perfil naval compartido; bordes recortados geométricamente; casco curvo único con secciones hasta quilla |
| 1, 2, 5, 7 | Madera uniforme; cubiertas sin jerarquía | Material `exterior-deck` común; capas `main`, `c1-hull`, `c2`, `c3`; cubiertas de 6 cm | Cantos, baos y mamparos de cubierta elevada; tablazón y tintes coherentes por nivel |
| 2, 5, 8 | Escaleras estrechas, peldaños separados, apoyos ambiguos | `terrain.structures`, `applyStairs`, bucle de escaleras de `terrain3d.ts` | Rampa autoritativa y escalera visible con inicio/final coincidentes, contrahuellas, zancas y barandas |
| 4, 8, 9 | Rectángulos de mar bajo la escalera | Contexto de casco sin rampa C8; océano lejano detrás del hueco; ausencia de caja de escalera | Profundidad de escotilla real, revestimiento y nivel inferior visible; separación respecto a rotura C4 |
| 6, 7, 9–11 | Cofa cuadrada, escalera fina, mástil duplicado | `crowRing` raster; `c1-mast` y `crow-mast` superpuestos; escala LineSystem; `autoTraverseAfterStep` cambia instantáneamente de superficie | Plataforma circular apoyada por tornapuntas, mástil continuo, jarcia real y ascenso temporal interpolado |
| 7, 9–11 | Rocas esféricas aisladas, pecios lejanos planos | `addWreckBackdrop`, `addNavigableSeaObstacles`: polyhedra y placas rígidas | Arrecife de estratos y apoyos de encallamiento, derivados de obstáculos; fractura de popa ligada al arrecife |
| 4, 7, 9–11 | Mar intenso con bordes y cortes | Agua por casillas a −2,9 m, plano a −8,2 m y Layer en pantalla; UV de panorama y normales distintos | Océano continuo en coordenadas del mundo a una misma cota; oleaje y espuma localizada |
| 1, 3, 7 | Antorchas amarillas grandes y anillo flotante | `WorldRenderer.renderPickups`: Graphics de tamaño fijo en pantalla; marcador de acceso y selección | Recogibles a escala física; antorcha independiente sin luz; conservar solo indicadores contextuales justificados |

## Funciones que condicionan la reconstrucción

- Una sola escena `wreck-ship`, casillas de 1,5 m; posiciones individuales y foco
  del DM/proyector separados. C1–C9 y cofa mantienen sus identificadores.
- Puertas C4–C7, listón/zombis C4, trampa C6, contenedores C8, paquete C9,
  encuentros, botín y desenlace siguen siendo estados independientes.
- P01 (jarcia), P10 (cofa), P12 (escotilla), P13/P14 (rotura) y P16 (brecha
  sumergida) se preservan. Las tiradas y decisiones permanecen con el DM.
- Las rampas y sus esquinas proporcionan alturas reales de personajes/grid.
  Las casillas recortadas deben contener su punto de apoyo y usar el mismo
  contorno para renderizado, selección y movimiento.
- La cámara reutiliza el suavizado de D8; se añaden encuadres por espacio a los
  terrenos, sin cambiar las cámaras de otras escenas.
- Guardados existentes: conservar superficies y coordenadas; usar la migración
  de posiciones inválidas si un borde antiguo deja de ser transitable.
- Los cambios previos de campamentos, actores y consola DM están presentes en
  el directorio de trabajo y se preservan.

## Orden de trabajo

1. Perfil y casco, primero sin texturas y desde varios ángulos.
2. C1–C3, escaleras, huecos y cofa con navegación correspondiente.
3. Fractura de popa, trinquete roto y apoyos del encallamiento.
4. Materiales, iluminación, océano, espuma y escala de objetos.
5. Auditoría visual del exterior, recorridos y regresiones del VTT.

El diagnóstico anterior no acredita por sí solo la reconstrucción. El resultado
ejecutado se documenta a continuación, sin confundirlo con aceptación del usuario.

## Entrega integrada · 9 de octubre de 2026

Alcance ampliado por el usuario: acabado de **C1–C9, cofa y entorno**, no solo
las cubiertas superiores. Sigue existiendo una única escena `wreck-ship`.
No se han reiniciado la mesa real ni sus guardados.

### Reconstrucción y separación de sistemas

- `wreck-structure.ts`: perfil compartido de 66 × 22 m, proa afinada, popa
  ancha y recorte poligonal de las casillas. C2/C3 usan contornos dañados
  también en la navegación; los centros válidos quedan dentro de su suelo.
- `wreck-exterior.ts`: casco por secciones hasta la quilla, cantos y mamparos
  de cubiertas a +3 m, cuatro escaleras exteriores construidas a partir de
  las mismas rampas, descenso a C8, jarcia de abordaje, mástil único de 23 m
  y cofa circular a 15 m con tornapuntas, escala y nido de ramas.
- Daños asimétricos: fractura de popa, costillas expuestas, extremos astillados,
  barandillas y cantos arrancados, mástiles rotos. El trinquete de C2 se apoya
  en el arrecife, no queda suspendido por encima. Sus colisiones se actualizan.
- `wreck-ocean.ts`: un océano continuo en coordenadas del mundo, oleaje y
  espuma animados, plataformas submarinas coloreadas desde las huellas reales
  de arrecife, roca irregular, huesos erosionados y otros restos de pecios.
  Se retiran la Layer de agua en pantalla y las aguas azules por casillas.
- `wreck-interior.ts`: revestimiento curvo, cuadernas y rodillas de apoyo de
  C8/C9, algas, peces, abertura real C4/C8 y suelo inferior visible. C8 conserva
  el gradiente canónico de 15–45 cm; C9 usa cáusticas bajo agua y luz portada.
- `wreck-materials.ts`: relieve compartido de juntas y veta salina; no otra
  imagen de mapa. Se reutilizan las texturas ilustradas existentes. Tejido,
  roturas y tablazón de techos son geometría/materiales independientes.
- Mobiliario y recogibles separados: escritorio con tres patas y brújula
  recogible, estantería rota, cama vencida, mostrador vacío, esqueleto sin
  cabeza, seis literas a escala adulta, pertenencias/retrato, mesa larga y
  sillas podridas, vajilla en el suelo, cajas, barriles y cofre reforzado.
  No se inventan recipientes de cocina ni se hornea el botín en un mueble.
- Barca: casco abierto, suelo opaco, costillas, bancos, remos y lavado de agua
  en 3D; permanece fuera del casco del pecio. Las antorchas son objetos
  pequeños de madera y envoltura quemada, **sin crear una luz**.

### Cámara, movimiento y visibilidad

`camera-space.ts` separa encuadres por espacio del interpolador compartido.
El foco sigue la altura real de la ficha; C2/C3, cofa, camarotes y niveles bajos
tienen tamaño de encuadre propio. Cambiar el foco del DM no mueve personajes.

Solo se abre el techo de la estancia ocupada. Al girar se retira su mamparo y
hoja de puerta delanteros conservando el marco; el mástil/aparejo exterior se
recorta durante el encuadre interior. El mobiliario que cruza los rayos de
visión del ocupante se atenúa y se restaura al salir o girar. No cambia su
estado, alcance o colisión. C8/C9 no muestran objetos de la otra planta.

El servidor temporiza el ascenso **y descenso** de P10 (10 s hasta la cofa) y
P01 (jarcia de abordaje); el cliente interpola esa misma trayectoria. No se
resuelven escaleras mediante un cambio instantáneo de posición. Los accesos
por agujero/escotilla mantienen su arbitraje original, no se automatizan dados.
La migración recoloca únicamente posiciones antiguas ahora inválidas por la
nueva silueta o literas, conservando plantas y posiciones válidas del resto.

### Contraste con las capturas originales

| Problema | Resultado observado |
|---|---|
| A: rectángulo con recortes cuadrados | Proa estrecha, popa y casco curvo identificables desde arriba, ocho orientaciones y pase sin texturas |
| B: plataformas sin altura | Cantos, mamparos y sombras muestran C1, C2/C3 y cofa; techos independientes |
| C: escaleras depositadas | Peldaños, zancas, apoyos y barandas enlazan las rampas reales; recorrido del servidor comprobado |
| D: agua rectangular | Abertura C4/C8 con profundidad y astillas; la pieza azul de C1 era el marcador de escotilla y se sustituye por tapa de madera, marco, bisagras y anilla |
| E: barco intacto/simétrico | Daño concentrado en popa encallada, borda/trinquete de proa roto y brecha sumergida real; no se colocan obstáculos de escombro sobre rutas libres |
| F: mar por placas/rocas bloque | Shader continuo, oleaje suave, espuma fragmentada y roca en secciones irregulares; no aparece un borde de cartulina al rotar |
| G: escala/indicadores | Literas, mesa y recogibles a escala de metros; bote opaco en el agua; no hay antorchas gigantes en pantalla |
| H: plataforma y acceso de cofa | Círculo sostenido por mástil/tornapuntas, jarcia, nido y escalada temporizada visible |

No se declara paridad pictórica con `wreck-deck.png` ni calidad de producción de
Octopath. La reconstrucción resuelve geometría, cobertura y continuidad; la
aprobación del acabado artístico sigue siendo independiente.

### Evidencia ejecutada

- Tipos cliente/servidor y compilaciones de producción superados.
- Pruebas estructurales, canon, puertas, migración, navegación y recogibles
  superadas; el resultado de la última suite general figura en el roadmap.
- `scripts/wreck-playability.mjs`: **202 pasos reales**, dos jugadores y
  proyector por Socket.IO; C1–C9, cuatro puertas abiertas por el jugador,
  posiciones separadas, privacidad entre plantas, foco del proyector, P10
  temporal, guardado y reinicio. Datos temporales ajenos a la mesa real.
  La prueba espera el snapshot de foco efectivo, no presume que 100 ms basten.
- Navegador Babylon/WebGL: **26 capturas estáticas**, cenital, sin texturas,
  ocho orientaciones exteriores, detalle de cada zona, cuatro camarotes por
  ambos lados, C9 sin luz y exterior nocturno con/sin luz. Informe con
  **19 muestras de diagnóstico, 0 errores** y recursos listos.
- Se reproduce además la grabación de los snapshots de la prueba de red,
  identificada explícitamente como grabación, no como dos jugadores activos
  dentro del visor. Se guardan vistas de sus plantas y del ascenso.

Informes y capturas reproducibles en
[`output/pecio-rebuild-20261008`](../../output/pecio-rebuild-20261008):
`visual-audit.json`, `playability.json`, `navigation-replay.json` y `wreck-*.png`.
Visor local: `scripts/wreck-review.html`, servido por su configuración aislada.

### Rendimiento y límites

La medición corta final fuerza 24 redibujados y espera a la GPU a 899 × 616:
C1 mediana **19,5 ms**, p95 **23,4 ms**; C4 **13,7 / 17,6 ms**;
C8 **5 / 6,2 ms**; C9 **5 / 5,7 ms**. No equivale a FPS sostenidos ni acredita
el objetivo de 60 fps del proyector. Se mantiene el agrupado por material,
planta y habitación para que el recorte no rompa las superficies.

La build sigue avisando de chunks grandes (Pixi ~557 kB, carga/escena ~591 kB,
loaders Babylon ~1.862 kB). No se certifican teléfono/proyector físicos, Wi-Fi,
audio escuchado ni una partida de 30 minutos. La cofa centrada y la escala
ampliada siguen siendo adaptaciones ya adoptadas al grid, no una reproducción
literal de la cofa inclinada sobre el agua descrita en el PDF.

Procedencia: se reutiliza Babylon.js 9.26.0 ya fijado y sus API de mallas,
shaders, texturas, iluminación y sombras. **Sin dependencia ni descarga nueva**.
Canon revisado con la habilidad PDF; observación real con computer-use.
No se utiliza generación de una ilustración completa como suelo jugable.

Para cargar en la mesa habitual, abrir `INICIAR.cmd`, elegir Stormwreck y, si
ya hay una mesa de esa campaña, usar **[A] Actualizar esta mesa**. El lanzador
guarda/reinicia y recompila; este trabajo no ha cerrado la partida del usuario.
