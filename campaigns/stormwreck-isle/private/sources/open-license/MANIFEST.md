# Fuentes abiertas para el Pecio

Descargado el 22 de septiembre de 2026 para evaluar recursos gratuitos de licencia abierta que puedan ayudar a construir el capítulo 3. Esta carpeta es privada y de evaluación: no se sirve desde `public/`, no cambia el contenido de la aventura y no convierte ninguna fuente en un asset integrado.

Todos los recursos de este manifiesto tienen licencia CC0 confirmada en su página de origen. Aun así, cada uso posterior deberá crear un derivado deliberado, anotar su fuente y pasar una revisión de escala, ancla, estilo y rendimiento. No sustituir assets aprobados del usuario por estos recursos automáticamente.

## Material descargado

| Fuente | Licencia | Archivo conservado | SHA 256 | Posible uso para el pecio | Estado |
| --- | --- | --- | --- | --- | --- |
| [Kenney Pirate Pack](https://kenney.nl/assets/pirate-pack) | CC0 | `kenney/kenney_pirate-pack.zip` | `91a0a43446910357e38b877971a94c06e6b3d9d28c035e51c107a1731e84f76a` | 190 recursos 2D, incluidos casco, cañón, mástil, velas, cubierta, maderas, nido y spritesheets. Es estilo cartoon brillante, así que sirve para estudios y prototipos de C1–C9, no como arte final sin adaptación visual. | STUDY |
| [Kenney Particle Pack](https://kenney.nl/assets/particle-pack) | CC0 | `kenney/kenney_particle-pack.zip` | `b631d4b07f7002549fdcf155f01141ad482f79f3440e4e301eed49ce5f1d8958` | 80 efectos 2D; emplear solo las copias de `PNG (Transparent)` para prototipar salpicaduras, impactos, dardos y aura. Requiere tinte y composición para evitar el acabado blanco de biblioteca. | STUDY |
| [Kenney RPG Audio](https://kenney.nl/assets/rpg-audio) | CC0 | `kenney/kenney_rpg-audio.zip` | `6dbeaf8544da958d8f2adcb4a4a4b76c1ade34a05f8ab9edccd327da7375f38b` | 50 sonidos; candidatos para libro, monedas, cajones, puerta, bisagras y crujidos. | STUDY |
| [Kenney Pirate Kit](https://kenney.nl/assets/pirate-kit) | CC0 | `kenney/kenney_pirate-kit.zip` | `667ed2caf92954ddb98f7b7cede831fe99ab75063c26b25e23d32715bee9c943` | Kit 3D de 70 modelos con animación; posible referencia o fuente de derivado para barco, cofa y cubierta. | STUDY |
| [Kenney Watercraft Kit](https://kenney.nl/assets/watercraft-kit) | CC0 | `kenney/kenney_watercraft-pack.zip` | `cd1470c1cf441c7f46d0944ae6d0d897242365dc97677c5079b3238965d659f3` | 45 modelos 3D de embarcaciones, carga y rampas; candidato para aproximación, bote y composición exterior. | STUDY |
| [Dungeon Assets de vlandemart](https://opengameart.org/content/dungeon-assets) | CC0 | `opengameart/Dungeon.zip` | `3a60053ea009a7a51d433c076b0e45d9401de6bab26a8ac48422bc01f8f958a7` | Modelos low-poly de interior; posible base para mesa, literas, cocina y dressing tras una adaptación de estilo. | STUDY |
| [Modular Dungeon 2](https://opengameart.org/content/modular-dungeon-2-3d-models) | CC0 | `opengameart/dungeon_collection_2.zip` | `523de9cb06852f96b0dc4425b4438cf624e2dcef546b0c7fd936f0eebf25468a` | Modelos modulares de puertas, cajas, barriles, escalones y elementos de mazmorra; candidato técnico, no dirección visual. | STUDY |
| [Simple Generic Ship](https://opengameart.org/content/simple-generic-ship) | CC0 | `opengameart/ship_wood_CC0.png` | `27336aaa61de48903bfc0a6dc3e920cb3aa9777b4261f2a1b367f60238b772f1` | Referencia mínima de silueta; no usar como asset final por su resolución y estilo. | REFERENCE ONLY |
| [Poly Haven Old Wood Floor](https://polyhaven.com/a/old_wood_floor) | CC0 | `polyhaven/old_wood_floor_diff_1k.png` | `e46ea9f3d88b826004a3e75a061c53cbfd4fb6ad401578b4395a48a3e6e129fe` | Textura de madera de cubierta envejecida para material o referencia de color. | STUDY |
| [Poly Haven Rough Wood](https://polyhaven.com/a/rough_wood) | CC0 | `polyhaven/rough_wood_diff_1k.png` | `28d3e4ec2307aa739feddd10532eb8c460f02f434dd327bbc4e663d454fb61bc` | Textura de madera erosionada para mástil, brechas, escalones y restos. | STUDY |

Los ZIP se mantienen intactos y se extrajeron en carpetas hermanas únicamente para inspección. Sus archivos `License.txt` originales se conservan en los cuatro paquetes de Kenney. Los dos recursos de Poly Haven son los mapas difusos de 1K, no paquetes PBR completos.

La revisión visual inicial confirma tres cosas: el kit 2D naval de Kenney tiene contenido útil pero no comparte el acabado HD-2D del proyecto; el Particle Pack sí aporta siluetas alfa limpias, aunque su color requiere tratamiento; y `old_wood_floor_diff_1k.png` encaja como textura/material de cubierta envejecida, no como una capa de mapa terminada.

## Aplicación recomendada al capítulo 3

1. Tomar primero las capas y anclas propias de M1a como geometría de escena.
2. Elegir solo los recursos que resuelvan una necesidad concreta: 2D pirate para prototipo de cubierta; partículas transparentes para F1–F6; audio RPG para interacción; modelos 3D y texturas solo si el renderizador los aprovecha.
3. Crear en la campaña una copia derivada con nombre estable, tamaño objetivo, ancla, huella y registro de procedencia. Nunca exponer estas carpetas de fuentes como rutas de runtime.
4. Probar visualmente el derivado contra la cámara HD-2D antes de aprobarlo. Una licencia abierta no garantiza que el estilo, la escala ni la lectura sean adecuados.

## Exclusiones deliberadas

- No se descargaron mapas, ilustraciones, PDFs ni cualquier otro material oficial de la aventura.
- No se añadieron los recursos a `public/` ni se modificaron mapas, escenas, código, guardados o manifiestos de runtime.
- La búsqueda queda acotada a estos diez recursos CC0 de alta relevancia; ampliar el catálogo solo para una necesidad concreta evita acumular archivos que no se usarán.
