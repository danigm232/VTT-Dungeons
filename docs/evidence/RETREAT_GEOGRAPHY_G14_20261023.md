# Retiro del Dragón · G1.4 · costa baja y desembarco

23/10/2026. Entrega parcial verificada y cierre del grupo geográfico G1.
Base: G1.3, las ampliaciones A2–A5 y las seis celdas originales.

## Modificaciones

Tres piezas bajas reutilizan los contornos nativos: faldón costero de Pleamar,
talud basal del acceso escalonado y unión del banco junto al desembarco.
Se conserva todo el suelo anterior. Los remates descienden bajo el agua y
comparten el basalto del proyecto.

Se recorta una reserva marina en las piezas nuevas: X 18,9–23,3 / Z 112,25–120 m,
alrededor de la barca y la parte exterior del muelle. Son cotas de protección
del VTT, sin atribución al mapa oficial.

El gráfico duplicado de barca se sustituye por el indicador de sitio existente.
La embarcación 3D permanece. El actor travel-pecio-boat conserva ID, etiqueta,
casilla, superficie e interacción; el puerto al pecio mantiene sus condiciones.
La llegada sigue adjudicada por el DM.

**CANON:** desembarco, embarcación, caminos, zombis y viajes conservados.
**VTT_AMBIENCE:** taludes, remates de basalto y presentación del punto de viaje.
Referencia visual: [NPS · Rocky Coast Landforms](https://www.nps.gov/articles/rocky-coast-landforms.htm),
consultada el 23/10/2026. Inspira solo el encuentro de roca y agua.

## Conservación

- 985 mallas previas idénticas en geometría, matrices, materiales y UV,
  incluidas las 128 de A1, seis celdas, muebles y ampliaciones.
- 980 casillas, diez superficies, 15 conexiones y escala de 1,5 m intactas.
- Reserva comprobada en 3D para cada casilla y una banda horizontal de 0,60 m:
  al menos **0,14 m bajo el suelo**. El talud puede ocupar
  una proyección horizontal existente sin entrar en el volumen del personaje.
- 288 muestras de agua bajo barca y muelle libres de la geometría nueva.
- Mismas dos puertas, 13 interacciones, tres zombis privados y tres viajes.
- Sin nuevos colliders, texturas, luces, mapas de sombra ni controles del DM.
- Cuadrícula independiente de la navegación; dados y decisiones manuales.

## Pruebas

| Comprobación | Resultado |
|---|---|
| Retiro, movimiento, terreno y cámaras | 69/69 aprobadas |
| Pasos del movimiento autoritativo | 1.580 |
| Muestras físicas | 60.869, sin colisiones |
| Posiciones contra triángulos reales nuevos | 5.456, sin colisiones |
| Partidas anteriores, puertas e interacciones | Conservadas |
| Zombis privados: PV, posición y ocultación | 3/3 conservados |
| Puerto al pecio y salidas terrestres | Definiciones intactas |
| GLB de referencia y ejecución | 0 errores, 0 advertencias |
| Tres mallas | Cerradas, sin degenerados, duplicados ni aristas no-manifold |
| Tipos de cliente y servidor | Correctos |
| Compilación aislada del cliente | Correcta |
| Matriz de cámaras | 250 pares, cinco inclinaciones y cinco giros, tres zooms locales |
| Seis celdas | 30 pares, misma visibilidad de muebles |
| Puerto y cuadrícula | 18 pares: DM/jugador/proyector, cuadrícula sí/no, giros −30/0/+30° |
| Barcas después | Un modelo 3D e indicador de viaje conservado |
| Nuevas oclusiones corporales comprobadas | Ninguna |
| Diferencia de cámara antes/después | 0 |

Se guardan **596 fotografías** con mismo actor, tiempo, clima y cámara.
Los datos de navegación y las partidas actuales siguen en su versión 3.

## Recursos y rendimiento local

G1.4: **tres mallas, 1.160 triángulos y 177.504 bytes**.
Total G1: **seis mallas, 12.088 triángulos y 1.232.188 bytes**
(1.175 MiB), dentro de 18 mallas / 24.000 triángulos / 1,5 MiB.

Medición a 1280 × 720 en Intel UHD local: 24 renderizados con finalización de GPU
tras ocho de calentamiento. Matriz inicial de 144 mediciones ABBA y repetición
de costa/proyector de 64 mediciones ABBA/BAAB, 16 por estado y vista.

| Rol | Vista | Mediana antes → después (ms) | Cambio | p95 antes → después (ms) |
|---|---|---|---|---|
| dm | overview | 20,00 → 20,20 | +1.0 % | 22,95 → 22,75 |
| dm | beach | 9,20 → 9,35 | +1.6 % | 13,70 → 13,05 |
| dm | pleamar | 8,95 → 8,85 | -1.1 % | 11,70 → 11,90 |
| dm | approach | 10,75 → 10,70 | -0.5 % | 16,00 → 15,05 |
| dm | a1 | 16,00 → 13,60 | -15.0 % | 57,00 → 55,50 |
| dm | a5 | 15,35 → 14,15 | -7.8 % | 21,75 → 20,60 |
| player | overview | 18,65 → 18,60 | -0.3 % | 22,05 → 22,70 |
| player | beach | 9,65 → 10,10 | +4.7 % | 12,85 → 13,55 |
| player | pleamar | 9,00 → 9,25 | +2.8 % | 11,75 → 12,00 |
| player | approach | 11,45 → 11,70 | +2.2 % | 15,05 → 15,05 |
| player | a1 | 14,35 → 15,90 | +10.8 % | 53,65 → 71,55 |
| player | a5 | 10,90 → 11,40 | +4.6 % | 17,00 → 17,15 |
| projector | overview | 20,20 → 19,05 | -5.7 % | 22,65 → 22,40 |
| projector | beach | 8,80 → 9,05 | +2.8 % | 15,20 → 12,70 |
| projector | pleamar | 8,85 → 8,85 | +0.0 % | 11,80 → 12,10 |
| projector | approach | 8,85 → 9,45 | +6.8 % | 14,15 → 14,85 |
| projector | a1 | 14,65 → 15,05 | +2.7 % | 37,00 → 47,45 |
| projector | a5 | 15,40 → 17,05 | +10.7 % | 27,35 → 41,80 |

Repetición de las vistas principales:

| Rol | Vista | Mediana antes → después (ms) | Cambio | p95 antes → después (ms) |
|---|---|---|---|---|
| projector | beach | 8,85 → 9,10 | +2.8 % | 13,20 → 13,50 |
| projector | pleamar | 8,75 → 9,15 | +4.6 % | 11,95 → 12,30 |

Repetición adicional de casos atípicos:

| Rol | Vista | Mediana antes → después (ms) | Cambio | p95 antes → después (ms) |
|---|---|---|---|---|
| player | a1 | 18,20 → 18,05 | -0.8 % | 58,90 → 52,55 |
| projector | a5 | 16,55 → 17,70 | +6.9 % | 45,50 → 48,60 |

Se conservan los resultados iniciales. Cámaras idénticas por caso; activar la
mejora no aumenta texturas ni memoria estimada. Los tiempos tienen dispersión.
Q1 revisará FPS sostenidos, memoria residente y otras resoluciones/equipos.

## Archivos y evidencias

- [Galería antes/después](<C:/Users/User/Desktop/Dungeons/output/retreat-geography-g14-20261023/index.html>).
- [Verificación funcional](<C:/Users/User/Desktop/Dungeons/output/retreat-geography-g14-20261023/checks/phase-verification.json>).
- [Comparación y medidas](<C:/Users/User/Desktop/Dungeons/output/retreat-geography-g14-20261023/checks/visual-performance-verification.json>).
- campaigns/stormwreck-isle/public/retreat-refinement.ts: mismo cargador, etapa 4.
- campaigns/stormwreck-isle/public/retreat-geography.json: registro de las piezas.
- campaigns/stormwreck-isle/public/retreat-runtime.ts: indicador de sitio para el punto de barca.
- campaigns/stormwreck-isle/public/art/retreat-modules/retreat_geography_g14_runtime.glb: tres taludes.
- prototypes/retreat-geography-g14-20261023/artifacts/retreat_geography_g14.blend: fuente nativa acumulada.
- prototypes/retreat-geography-g14-20261023/: plan, construcción, validadores y visor.
- runtime/retreat-geography-g14-20261023/client/: compilación aislada.

Solo cambian tres de los 385 archivos previos protegidos: configuración/carga
y presentación del punto de barca. Modelos previos, navegación y estados intactos.
El verificador normaliza los campos opcionales igual que su serialización JSON;
se corrigió esa comparación de prueba sin tocar los datos del juego.

## Pendientes y siguiente

G1 queda cerrado en continuidad geográfica. Siguen C1 (mar/cielo a ángulos
rasantes), C2 (límite de zoom), O1 (ocultación), acabados por zona, M1 (basalto
y pavimento), vegetación y luz. La carga fija observada en la prueba aislada
del palé aparece igual antes/después de G1.3 y está registrada para A2.

**Siguiente tarea: C1, cerrar mar y cielo. Después C2, aplicar el límite de
alejamiento del jugador ya estudiado.**
