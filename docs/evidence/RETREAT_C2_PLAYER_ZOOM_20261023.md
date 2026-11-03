# C2 · Límite de cámara del jugador

Entrega verificada: 23/10/2026. C2 cerrada. Siguiente: O1, oclusión local.

![Antes y después](C:/Users/User/Desktop/Dungeons/output/retreat-camera-c1c2-20261023/c2-proof.jpg)

## Implementado

- Política exclusiva de dragon-rest / jugador, mediante maxStageHalfHeight y
  el controlador de zoom existente. Ningún control nuevo.
- Límite de pantalla completa equivalente a semialtura 8 m y ancho 30 m.
  El cálculo incluye el espacio ocupado por la interfaz: en 16:9 se ven como
  máximo 28,44 × 16 m; en ultrapanorámico se aplica el tope de 30 m de ancho.
- Los límites locales de acercamiento se conservan; un zoom ya válido se mantiene
  al cruzar puertas. Las nuevas órdenes manuales respetan el límite de cada estancia.
- Conjunto/Inicio vuelve al entorno del personaje. Funciona también con modo
  fijo, preferencias antiguas y cambios de ventana; el amortiguador no expone
  una vista amplia durante su transición.
- Combate del jugador conserva el mismo límite y foco local. DM y proyector
  mantienen sus encuadres anteriores; otros mapas siguen con su política.
- Es un límite de encuadre. No sustituye una futura política de revelado de secretos.

## Comprobado

- 117 pares antes/después, tres personajes, tres pantallas
  más 2560×720, interiores y exteriores, DM/jugador/proyector.
- 26 comprobaciones de modo, Conjunto, rueda, ruta compartida
  de zoom de pinza/botones, preferencias antiguas, reconexión, combate y cambio
  de tamaño. El primer fotograma también cumple el límite.
- 350 posiciones de rutas A1–A3/A4–A1, sobre conexiones reales,
  sin salto de zoom cuando el zoom elegido ya cumplía el límite.
- Los personajes completos quedan dentro de la pantalla en los perfiles comprobados.
- 86 pruebas específicas superadas, tipos cliente/servidor y
  compilación terminados. Los casos de otros mapas y los perfiles DM/proyector
  se comprueban por regresión y por igualdad del encuadre.
- Navegación: 980 casillas, 10 superficies, 15 conexiones; 1.580 pasos del recorrido
  autorizados, puertas, 13 interacciones y guardados conservados.

Las pruebas de rueda y de la ruta de pinza son sintéticas en el VTT real.
La prueba de gesto físico en un dispositivo táctil y los FPS sostenidos quedan en Q1.
Los problemas de ocultación del mobiliario ya documentados pertenecen a O1.
Durante la revisión se corrigieron dos fallos de la herramienta: una comparación
numérica sin tolerancia de redondeo y un cruce que avanzaba solo la cámara,
dejando el sprite en el punto inicial. Se repitieron las pruebas con el render
completo del personaje y sin modificar el movimiento de producción.

## Archivos

- [Política y foco del jugador](<C:/Users/User/Desktop/Dungeons/apps/web/world.ts>)
- [Dimensión del encuadre](<C:/Users/User/Desktop/Dungeons/campaigns/stormwreck-isle/public/retreat-camera-composition.ts>)
- [Pruebas C2](<C:/Users/User/Desktop/Dungeons/engine/client/retreat-player-zoom.test.ts>)
- [Aceptación y medidas](<C:/Users/User/Desktop/Dungeons/output/retreat-camera-c1c2-20261023/checks/c2-verification.json>)
- [Revisión reproducible](<C:/Users/User/Desktop/Dungeons/prototypes/retreat-camera-c1c2-20261023/review-c2.ts>)

## Rendimiento

288 medidas locales en los tres roles: 96 de pasadas separadas
y 192 alternadas en la misma sesión con cuatro bloques ABBA. Las primeras
pasadas variaban incluso en controles DM/proyector idénticos; se conservan en
los datos y se utiliza la comparación alternada para estudiar el cambio.
La tabla incluye tanto la mediana agrupada como el cambio emparejado por bloque.

| Perfil y foco | Antes, ms | Después, ms | Cambio agrupado | Cambio por bloques |
|---|---:|---:|---:|---:|
| dm · overview | 17.70 | 17.10 | -3.4 % | -0.6 % |
| dm · a1 | 13.55 | 13.70 | +1.1 % | +0.4 % |
| dm · a3 | 14.05 | 13.40 | -4.6 % | -4.5 % |
| dm · a5 | 12.50 | 12.40 | -0.8 % | -4.3 % |
| player · overview | 17.70 | 7.70 | -56.5 % | -55.0 % |
| player · a1 | 14.40 | 10.55 | -26.7 % | -31.4 % |
| player · a3 | 13.75 | 12.50 | -9.1 % | -9.4 % |
| player · a5 | 11.50 | 10.05 | -12.6 % | -14.5 % |
| projector · overview | 16.95 | 19.80 | +16.8 % | +3.0 % |
| projector · a1 | 14.65 | 16.55 | +13.0 % | +8.0 % |
| projector · a3 | 13.15 | 12.75 | -3.0 % | -1.4 % |
| projector · a5 | 14.25 | 14.75 | +3.5 % | +5.1 % |

Los detalles, p95 y llamadas de dibujo se conservan en los JSON. La cámara del
jugador muestra menos entorno, pero un encuadre cercano no garantiza reducir
el coste de cada vista: los objetos visibles también ocupan más píxeles.
En los cuatro focos de jugador medidos, la mediana agrupada baja entre el
9,1 % y el 56,5 %. DM/proyector conservan geometría, encuadres y llamadas de dibujo.
Sus medianas agrupadas todavía varían (hasta +16,8 %), mientras la comparación
por bloques queda entre −4,5 % y +8,0 %; Q1 conserva el seguimiento sostenido.
No se añaden materiales, mallas, texturas, luces o pases de render en C2.
No se certifican FPS sostenidos ni memoria residente fuera del equipo de revisión.
