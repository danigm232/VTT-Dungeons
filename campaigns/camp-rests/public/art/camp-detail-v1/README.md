# Campamentos · materiales y vegetación de detalle

Creado el 11 de octubre de 2026 con ImageGen para esta revisión de las cinco
escenas existentes. Imágenes nuevas; los archivos PNG se copiaron sin alterar
desde el resultado del generador. No contienen geometría canónica, personajes
ni colisiones y no sustituyen el mapa por una imagen de fondo.

## Recursos

| Archivo | Uso |
| --- | --- |
| `foliage-atlas.png` | Atlas RGBA con cuatro grupos: arbusto, helechos/hierba, hiedra y flores. Tarjetas cruzadas colocadas en el espacio 3D, con variaciones de color y escala. |
| `coastal-rock.png` | Color de roca litoral estratificada. UV por cara o por metros; normales y manchas generadas por Babylon complementan el color. |

Los mismos dos archivos se reutilizan entre escenas y quedan en la caché del
navegador. Los materiales añaden cuatro normales compartidas de 128 × 128,
para roca, madera, tela y agua, más una máscara celular de espuma de 128 × 128.
No hay texturas de reflexión adicionales ni un observador por objeto.

## Especificaciones de generación

**Vegetación:** atlas botánico ilustrado para un diorama HD-2D de fantasía,
fondo transparente y cuatro cuadrantes con margen. Superior izquierdo:
arbusto frondoso verde esmeralda y oliva con puntas doradas. Superior derecho:
helechos y hierbas de verde salvia. Inferior izquierdo: hiedra y trepadoras.
Inferior derecho: flores silvestres pequeñas amarillas y malvas. Cada grupo
aislado, sin suelo, mobiliario, texto ni sombra de fondo; luz suave y pincelada
detallada, adecuada a tarjetas de vegetación dentro de Babylon.

**Roca:** textura de color de roca costera natural, pensada para repetición,
gris cálido, salvia y topo, estratos irregulares, grietas, poros, erosión salina
y musgo discreto. Vista frontal y luz neutra sin sombras direccionales fuertes;
sin paisaje, objetos, agua, texto ni perspectiva. El relieve y las sombras se
calculan en la geometría real del juego. La repetición se comprobó en el render;
no se afirma continuidad matemática perfecta de los bordes del PNG.

## Procedencia

- Foliage: resultado `exec-a07592be-d8a2-4eca-92a1-ecd0d582b5c2.png`.
- Rock: resultado `exec-94d3386a-359b-4260-85e5-11b6d594b032.png`.
- Originales en la carpeta de imágenes generadas de esta conversación.
- Uso exclusivo como `VTT_AMBIENCE`; la distribución de A1 procede del mapa
  oficial y permanece en `a1-layout.ts`.
