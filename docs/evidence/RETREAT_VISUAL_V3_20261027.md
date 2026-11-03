# V3 · Templo y puente · 27/10/2026

Estado: validación aislada completada; publicación conjunta con V4 autorizada.

## Resultado

- Derivado del templo ampliado existente. Ancho 12 → 13,5 m; fondo 13,5 m; superficie 162 → 182,25 m². Suelo conservado a 27 m. No se repite el aumento anterior del 100 %.
- Cuatro columnas del perímetro, altura 4,7182 → 6,2 m, sección un 10 % mayor. Se retiran las cuatro centrales. Muro norte excavado y tres puntales arqueados conservados y ajustados al ancho.
- Cubierta canónica de madera y entramado dentro del mismo GLB de techo: ocultación conjunta al ocupar A5 y restauración exterior. Remates antiguos de las ocho posiciones desactivados solo al cargar el derivado.
- Anciano de Bahamut con rostro, nariz, barba, manos abiertas y túnica plegada; siete aves con pico, alas y cola. Pedestal original y ofrendas conservados. Piedra clara cálida, sin dibujo de baldosas sobre la escultura; mapas compartidos de relieve/rugosidad, misma iluminación.
- Puente de madera 3 → 3,75 m: quince tablones, unión gradual con la cabeza de la escalera existente. No cambia el identificador de acceso.

CANON: anciano amable, siete canarios, templo abierto, cubierta de madera, muro excavado y soportes. VTT_AMBIENCE/adaptación autorizada: dimensiones, cuatro soportes de perímetro, acabado clásico, escultura más legible y puente más largo.

## Navegación y conservación

Solo A5 se adapta a la geometría autorizada: 72 direcciones anteriores conservadas y 17 añadidas en la terraza ensanchada, 89 en total. 155 conexiones físicas y tres bordes bloqueados, todos los centros alcanzables desde el acceso. Muestreo con radio corporal de 0,30 m frente a columnas, pedestal y muro. No hay cambios en las demás superficies, puertas, puertos o resultados narrativos. Escala de 1,5 m/casilla; el mapa completo suma 1.349 casillas.

El JSON original de terreno y los 176 GLB previos permanecen intactos. El adaptador de A5 reutiliza el movimiento y el formato de terreno existentes. Se actualiza únicamente la lista de obstáculos A5 del registro físico; las seis celdas conservan sus 71 piezas estáticas exactas.

## Pruebas

- 162 vistas (seis posiciones, tres inclinaciones, tres giros y tres roles), cero errores.
- 2.262 muestras sobre mallas reales de suelo; ocultación/restauración de las siete piezas de techo y cuadrícula independiente de navegación.
- Diez pruebas de templo, bosque y rutas insulares aprobadas; 310 pasos dirigidos de A5. Auditoría general adicional: 1.578 pasos, 62.945 muestras físicas y trece puntos de interacción, puertas cerradas/abiertas y guardado compatible.
- Typecheck cliente aprobado. Se usan tolerancias métricas en la comparación de extremos flotantes de caminos; no se relajan las pruebas de colisión.

Evidencia: `output/retreat-v2-v4-20261027/evidence/v3-before-*.png`, `v3-after-*.png`, `v3-hardware.json`, `v3-after-matrix.json`; modelo, navegación y conservación en `prototypes/retreat-v2-v4-20261027/checks/v3-*.json`.

Impacto: geometría escultórica y de puente sustituida, cuatro columnas menos, un material PBR compartido adicional para piedra esculpida; 18 luces, sin luces ni mapas de sombras nuevos. No equivale a una medición sostenida de FPS. La auditoría de rendimiento completa sigue pospuesta hasta resolver V5.

Siguiente: V4. Agua, bote y parcela costera continúan pendientes en V5.
