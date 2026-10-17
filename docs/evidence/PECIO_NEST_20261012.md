# Rosa de los Vientos: cofa y nido de la arpía

Fecha: 2026-10-12. Alcance limitado a la cofa, el nido y su acceso P10.
No se reconstruyeron casco, cubiertas, camarotes, océano ni otras escenas.

## Referencia y auditoría

Se revisó la página 23 completa del PDF de la aventura. La canasta contiene
virutas, hierba seca, jirones de vela, huesos, pelo y baratijas. Las cinco piezas
recogibles siguen siendo la pulsera de 25 po, el pendiente de 25 po, dos ojos
de tigre de 10 po y el heliotropo de 50 po. No hay botín nuevo ni duplicado.

El nido anterior tenía una cama casi plana, tubos muy finos y materiales sin
relieve; la limitación de altura aplanaba todo el interior. La cofa tenía sus
barandillas atravesando el borde del nido. El encuadre seguía al ocupante del
extremo y recortaba la canasta al acercarse desde varias orientaciones.

## Implementación

- Cuenco continuo con faldón grueso, borde asimétrico y ramas curvadas,
  entrelazadas, bifurcadas y ahusadas. Espesor vertical superior a un metro.
- Hierba en haces de hojas plegadas, virutas curvas, lona con pliegues,
  desgarrones y perforaciones; restos óseos, pelo y plumas volumétricas.
- Texturas de color y relieve para corteza, fibras y lona; hueso erosionado.
  Oscurecimiento de contacto y suciedad integrados. Sin luces nuevas.
- Siete lotes de geometría, menos de 65 000 vértices, sin actualización
  geométrica por fotograma y sin colisiones decorativas nuevas.
- Apertura alrededor de la posición real del mástil inclinado. Entrada
  despejada según la posición de la escala de cuerda, no solo su casilla.
- Fascia estrecha de la cofa ampliada 16 cm para apoyar la barandilla fuera
  del tejido, manteniendo intactas las diez casillas y su altura de 15 m.
- Tesoro parcialmente cubierto por lona. Desplazamientos visuales dentro de
  las casillas originales; IDs, alcance, inventario y guardado autoritativos.
- Encuadre horizontal centrado en la cofa, con la amortiguación, giro y zoom
  existentes. No cambia el comportamiento de otras cubiertas o mapas.

## Correcciones detectadas durante la ejecución

1. Se corrigieron los atributos de vértices incompatibles al combinar tela
   coloreada y ramas en lotes de Babylon.
2. Se corrigió el orden de los triángulos del lecho para que sus normales
   apunten hacia arriba incluso después de combinar la geometría.
3. Se redujo la superficie de lona y se sustituyeron los tubos de hierba por
   hojas volumétricas, evitando repetir el campo de líneas amarillas.
4. El recorrido conectado descubrió un descenso involuntario al volver a
   pisar P10. Ahora se puede explorar esa casilla sin abandonar la cofa.
   En Exploración aparece la acción **Bajar de la cofa**, sin CD y con
   descenso visible de 10 segundos. El DM conserva el portal de retorno.
   La CD 10 de subida sigue siendo la adaptación opcional preexistente,
   no una regla que figure en el PDF. No se añadieron caídas ni daño.

## Comprobaciones superadas

- Comprobación de tipos del cliente y compilación del servidor.
- Compilación de producción del cliente: 2209 módulos, completada en 1m 37s.
- **62/62 pruebas** de nido, reconstrucción, acceso y lógica del pecio.
- Pruebas de triángulos mediante rayos sobre las diez casillas y sus márgenes:
  el tejido no oculta los pies ni bloquea las rutas del personaje.
- Servidor aislado con dos jugadores y proyector: **44 pasos**, visita a las
  diez casillas, recogida de las cinco piezas, descenso voluntario por el
  jugador, guardado, reinicio y recuperación del botín y las posiciones.
- Reproducción visual de los pasos reales, incluida la subida gradual de
  15 m. No se reinició ni modificó la mesa real.

## Revisión visual real

Se inspeccionaron las **19 capturas** del navegador Babylon: ocho cercanas,
ocho alejadas, cenital, nido saqueado y noche con luz portada. Todas registran
recursos listos y cero errores. Se corrigieron los defectos observados y se
repitió la captura. La cofa permanece entera en el encuadre y el personaje
es visible en las ocho orientaciones; desaparece el botín recogido, no el nido.

Antes: `output/pecio-rain-detail-20261012/wreck-crow-angle-3.png`.
Después: `output/pecio-nest-20261012/wreck-nest-close-3.png`.

Evidencias finales en `output/pecio-nest-20261012/`:

- `final-regression-tests.json`: 62 pruebas superadas.
- `nest-tests.json`: geometría, normales, rutas y contenido canónico.
- `climb-smoke.json` y `climb-smoke-replay.json`: recorrido conectado final.
- `visual-audit.json`: 19 vistas listas sin errores.
- `wreck-nest-close-0.png` a `wreck-nest-close-7.png`.
- `wreck-nest-far-0.png` a `wreck-nest-far-7.png`.
- `wreck-nest-top.png`, `wreck-nest-looted.png`, `wreck-nest-night-lamp.png`.
- `wreck-walk-climb-middle.png`, `wreck-walk-crow.png`: escalada reproducida.

`navigation-failure.json` conserva el primer fallo de descenso automático
como historial de auditoría; `climb-smoke.json` contiene la prueba corregida.

## Límites

La revisión corresponde al visor aislado del navegador, no a una certificación
en todos los teléfonos y proyectores físicos. No se declara terminado el arte
del resto del pecio ni M5 completo. Para cargar el nuevo comportamiento de
descenso en una mesa que ya estaba abierta hay que reabrir el programa.
