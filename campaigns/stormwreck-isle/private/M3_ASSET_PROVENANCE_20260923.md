# M3 · procedencia de criaturas (23/09/2026)

Uso: VTT privado del usuario. No se declara CC0 ni derecho de redistribución pública; completar la licencia de los originales antes de publicar el proyecto. Los nombres originales de archivos se conservan para trazabilidad, aunque el personaje antes llamado María se presenta en juego como **Trinity** y conserva el ID de guardado `maria`.

| Destino servido | Fuente local del usuario | Selección | Base SHA-256 |
|---|---|---:|---|
| `public/art/m3/trinity/` | `Imagenes VTT/Maria pies ligeros/` | 14 PNG: base, idle, caminar, ataque de daga | `FC03BE28AA2F61CE87CBC7ECF54E1042E95F8A43B73290C08EF4B8D5F3E26D69` |
| `public/art/m3/zombie/` | `Imagenes VTT/DnD VTT/Zombie 1/` | 14 PNG: base, idle, caminar, ataque, hit, muerto | `3D469EF5271CEC78CE309032BC43355E88E058E1AE30B1B65D361CE3866205EF` |
| `public/art/m3/harpy/` | `Imagenes VTT/Arpias/Arpía 3/` | 18 PNG: base, idle de suelo, caminar, volar, garra, hit, muerta | `164C07AD54850873C7C2B5BA5D5F39FF80FA07BCDC22FF103996B0EDA274FFBC` |
| `public/art/m3/ghoul/` | `Imagenes VTT/Ghoul/` | 6 PNG: base, idle, atlas caminar/ataque, hit, muerto | `536C41BCC7ED18927A0B5F22330E1C9D30E8EFF3E5440385BA9CF21FC5912C32` |

Ampliación Trinity del 25/09/2026: se revisó la carpeta local completa `Imagenes VTT/Maria pies ligeros/` y se contrastó la selección con la carpeta de Drive proporcionada por el usuario; los nombres y tamaños de los archivos elegidos coinciden. Se añadieron primero 30 PNG al runtime para caminar/correr/ataque, arco, daga arrojadiza, impactos, caída y arrastre. En la pasada de acciones se copiaron 21 PNG adicionales, sin modificar: cuatro de interacción, cuatro de sigilo, cuatro de escalada, cuatro de natación, tres de salto y dos del efecto de Ataque furtivo. La carpeta pasa así a 65 PNG. Los atlas 4×2 se recortan por rectángulos de frame durante el render (313×580 px; se omite el rótulo inferior), conservando originales y sin exportar duplicados. No se generan poses nuevas.

La fuente original contiene más material que el juego todavía no consume. Ver `TRINITY_ANIMATION_AUDIT_20260925.md` para la cobertura ya conectada y las secuencias pendientes.

La base del gul de Drive (`ghoul_base.png`, ID `1B1pPagfhkd4p7MrO4Nua2ZGQeZg9L-JM` en carpeta `1ggXiJH5zckhZ7ME01H56Hd7j-t6n3euC`) se descargó y comparó con `Imagenes VTT/Ghoul/ghoul_base.png`: hash idéntico. Se usó por tanto el mismo original local. Los atlas del gul son 1254×1254; el runtime recorta cuatro fotogramas horizontales de 313 px de ancho, sin generar poses nuevas. Los archivos no usados permanecen en el origen del usuario y no se sirven por el VTT.

Los perfiles de zombi, gul y arpía se basan en Basic Rules 2014 y se mantienen en `private/m3-actors.ts`. El canto, la parálisis y la Fortaleza de no muerto conservan arbitraje de mesa del DM; no se atribuyen al arte ni a una IA automática.
