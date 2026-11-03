# C1 · Mar y cielo

Entrega visual y funcional comprobada: 23/10/2026. Seguimiento de coste
agregado pendiente en Q1. La intervención posterior C2 tiene informe propio.

![Antes y después](C:/Users/User/Desktop/Dungeons/output/retreat-camera-c1c2-20261023/c1-proof.jpg)

## Cambios

- Recuperado el gradiente marítimo ya definido en la fuente del entorno.
- La esfera P7 conserva su geometría. Se ha separado del padre GLB, excluido
  del congelado y configurado para acompañar a la cámara dentro del rango vigente.
- Una malla prolonga los tres lados marítimos del agua original; el lado del
  interior permanece abierto. Comparte material, textura y fase del borde.
- El agua distante se funde con el cielo mediante el alfa de los vértices existentes.
  La zona jugable permanece opaca; no se aplica niebla global ni un shader nuevo.
- Corregido el plano cercano del Retiro mediante la función que ya usa el motor.
  A 5° el borde inferior podía empezar bajo el agua; ampliar el mar no bastaba.
- Los cuatro conos provisionales se conservan desactivados. Su sustitución por
  paisaje regional conectado corresponde a E1; no se presentan como geografía oficial.
- Tras medir un coste variable, reducido el trabajo: una transformación por
  vértice del borde, actualización vinculada al oleaje nativo y franja lejana estática.
  La franja nueva queda fuera de la emisión y recepción de sombras.

## Conservación y clasificación

CANON y jugabilidad: seis celdas y muebles, ampliaciones A2–A5, 980 casillas,
10 superficies, 15 conexiones, dos puertas, 13 interacciones, guardados v3 y
dados/resolución manual conservados. Los GLB y datos de navegación no se han editado.
Las mejoras del cielo y agua son VTT_AMBIENCE; no añaden superficie transitable.

## Verificación

- 584 pares antes/después: 530 vistas de zonas y 54 de roles/pantallas.
- Cinco inclinaciones y cinco giros en el conjunto y exteriores; tres zooms
  locales exteriores, interiores A3/A4 y las seis celdas. Se revisan hojas de
  contacto y originales representativos; no se afirma revisión manual individual
  de cada fotografía a resolución completa.
- Día, noche y lluvia: 27 vistas, incluidas 390×844 y 1920×1080.
- Desviación máxima de cámara: 4.4e-16.
- Cielo sin padre y sin matriz congelada; muestras del fondo sin saturación blanca.
- Agua del desembarco ≤0,08 m en 12 muestras; oleaje exterior conservado y variable.
- 75 pruebas específicas superadas. Comprobación de tipos cliente/servidor
  y compilación del cliente completadas.
- Recorrido repetido: 1.580 pasos autorizados, 60.869 muestras físicas, dos puertas
  cerradas bloqueantes y apertura manual, 13 puntos y restauración de guardado.
- 637 archivos protegidos: únicamente tres fuentes existentes cambiadas.

## Rendimiento local

Una malla nueva; sin texturas, luces, mapas de sombra ni reflexiones adicionales.
Los cuatro conos dejan de dibujarse. 720 mediciones antes/después
alternadas, con GPU terminada y mismo encuadre. Se conserva la primera pasada,
sus casos variables y las repeticiones. Se repitieron todos los roles y focos,
con ocho bloques ABBA por combinación. La mediana de cambios emparejados por
bloque queda entre −0,6 % y +10,0 %. Al agrupar las medianas sin emparejar, cuatro
combinaciones superan el objetivo +10 % (máximo +12,7 %, +2,15 ms). Por tanto,
el objetivo agregado NO queda certificado: se conserva como seguimiento de Q1.
No se oculta esa diferencia ni se considera una prueba de FPS sostenidos.

| Perfil y foco | Antes, ms | Después, ms | Cambio agrupado | Cambio por bloques |
|---|---:|---:|---:|---:|
| dm · overview | 18.70 | 20.85 | +11.5 % | +5.7 % |
| dm · beach | 9.70 | 10.35 | +6.7 % | +9.6 % |
| dm · a1 | 15.45 | 15.80 | +2.3 % | +8.6 % |
| dm · a2 | 9.60 | 10.55 | +9.9 % | +10.0 % |
| dm · a5 | 15.25 | 16.80 | +10.2 % | +8.7 % |
| dm · room1 | 18.20 | 18.85 | +3.6 % | +0.6 % |
| player · overview | 17.50 | 17.10 | -2.3 % | -0.6 % |
| player · beach | 9.25 | 9.60 | +3.8 % | +4.9 % |
| player · a1 | 17.55 | 17.70 | +0.9 % | +0.8 % |
| player · a2 | 10.05 | 11.20 | +11.4 % | +5.5 % |
| player · a5 | 13.30 | 12.65 | -4.9 % | -0.6 % |
| player · room1 | 19.25 | 19.50 | +1.3 % | +5.9 % |
| projector · overview | 17.55 | 18.50 | +5.4 % | +4.2 % |
| projector · beach | 9.35 | 9.75 | +4.3 % | +5.2 % |
| projector · a1 | 14.60 | 16.45 | +12.7 % | +4.7 % |
| projector · a2 | 9.75 | 10.15 | +4.1 % | +0.5 % |
| projector · a5 | 15.70 | 16.35 | +4.1 % | +2.0 % |
| projector · room1 | 20.45 | 20.05 | -2.0 % | +4.0 % |

Las cifras son coste local de fotograma forzado, no FPS sostenidos de una partida.
P95, muestras completas y estimación de texturas están en los JSON. Q1 mantiene
pendientes la sesión sostenida, memoria residente y otros equipos físicos.

## Archivos

- [Entorno marítimo](<C:/Users/User/Desktop/Dungeons/campaigns/stormwreck-isle/public/retreat-refinement-coast.ts>)
- [Congelado de piezas estáticas](<C:/Users/User/Desktop/Dungeons/campaigns/stormwreck-isle/public/retreat-refinement.ts>)
- [Corrección acotada del plano cercano](<C:/Users/User/Desktop/Dungeons/apps/web/world.ts>)
- [Pruebas C1](<C:/Users/User/Desktop/Dungeons/engine/client/retreat-horizon.test.ts>)
- [Fuentes de revisión y verificadores](<C:/Users/User/Desktop/Dungeons/prototypes/retreat-camera-c1c2-20261023>)
- [Datos de aceptación](<C:/Users/User/Desktop/Dungeons/output/retreat-camera-c1c2-20261023/checks/c1-verification.json>)

Siguiente: C2, límite local de cámara del jugador. Los acabados del paisaje E1,
mar y luz L1, y oclusión O1 conservan su alcance posterior.
