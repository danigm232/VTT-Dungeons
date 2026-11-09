# Acabado de la biblioteca A4

Muestra VIS-3, VA-06, sobre la revisión 19. De REF-08 Eastward se toma la separación visual entre el mueble, los objetos de uso y las superficies de apoyo. Se conserva la distribución y se reutiliza el acabado del Retiro. [Biblioteca visual](../design/VISUAL_REFERENCE_LIBRARY.md)

En `style-sample.ts`, las primitivas `CANON_*_Bookcase_*` y `Expanded_*_Bookcase_*` adoptan roble estructural `#94816A` en lugar del roble claro `#C7B9A2` donde usaban tablones. Los materiales `Paper_And_Parchment`, `Binding_Worn_Olive`, `Binding_Worn_Ochre` y `Binding_Worn_Russet` reciben respectivamente `#938162`, `#505C48`, `#896640` y `#74443B`. Las variantes comparten sus materiales por familia y usan rugosidad PBR 0,95. Se mantienen las UV, los modelos, las colisiones y las páginas de la mesa de estudio.

La candidata `runtime/prepared-retreat-library-finish` está compilada. Pasaron 28 pruebas de materiales y recorte. El par real del visor usa la misma posición, cámara, resolución y hora diurna. La línea base desactiva únicamente la clasificación nueva de las estanterías. Se verificó la alternancia en el visor. Quedan pendientes la aceptación artística y la instalación en la mesa habitual.

[Comparación superpuesta](../../output/retreat-fixtures-20261106/biblioteca.html) · [Originales y hashes](../../output/retreat-fixtures-20261106/archivo-originales.json).
