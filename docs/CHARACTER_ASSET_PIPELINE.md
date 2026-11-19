# Pipeline oficial de recursos de personajes

Aplica a personajes, criaturas, sprites, atlas, poses, animaciones, anatomías, anclajes, ropa, armaduras, armas, objetos sostenidos, máscaras, overlays, restricciones y sus materiales. Fuente de instrucciones: [encargo del usuario](evidence/CHARACTER_MODULAR_REQUEST_20261116.md). Estado efectivo, pruebas y límites: [ficha de implementación](evidence/CHARACTER_MODULAR_20261116.md). Este documento es una norma de producción, no otro roadmap.

## Fuente y conservación

Las fuentes del sistema modular están en `prototypes/godot-shared/characters/`. Las fuentes anteriores de sprites, combate e inventario conservan sus rutas. Las carpetas de los tres proyectos Godot son copias instaladas: no editar recursos derivados allí para simular una corrección de la fuente.

No sustituir originales. Registrar fuente, derivado, hash y operación. El inventario automático se regenera mediante `node scripts/audit-character-repository.mjs`; las copias instaladas con el mismo hash no se eliminan automáticamente. Las envolventes de una pose agachada o tumbada no son una nueva estatura.

## Flujo obligatorio

1. Consultar inventario, definición, atlas/reproductor actuales y perfil anatómico. Buscar reutilización con `node scripts/character-pipeline.mjs reuse --query TEXTO`.
2. Crear o modificar una definición de categoría en `characters/definitions/` antes de producir arte. Plantillas: `node scripts/character-pipeline.mjs templates`; creación: `node scripts/character-pipeline.mjs create --id ID --kind character --template humanoid-tall`.
3. Declarar anatomía, escala/pivote, direcciones y acciones necesarias, compatibilidades, equipo ya pintado, dependencias y requisitos de revisión. Referenciar el catálogo existente; no duplicar estadísticas, fichas o toda la lista de fotogramas de un atlas ya registrado.
4. Producir o adaptar solo lo necesario. Mantener identidad y proporciones, transparencia, márgenes y apoyo. Por instrucción explícita del 18/11/2026, los ciclos nuevos de **Stormwreck admiten seis imágenes distintas como mínimo, con ocho como objetivo y más cuando haga falta**. Es número de fotogramas, independiente de los fps de reproducción; las poses sostenidas no necesitan seis dibujos. Los contratos existentes de ocho fases se conservan. El mínimo general de las demás campañas sigue vigente. Consultar `characters/motion-contracts/stormwreck-isle.json`: una anatomía o un clip de sustitución no conceden vuelo, nado especial ni excavación. No inventar acciones para llenar una plantilla. Un recurso histórico sin migrar conserva un adaptador y su limitación identificada, no una aprobación nueva.
5. Ejecutar `node scripts/character-pipeline.mjs validate` y las comprobaciones de imagen/reproductor pertinentes. Errores son bloqueantes; advertencias son limitaciones que deben mantenerse visibles. No se exigen manos a una anatomía sin manos.
6. Importar a inspección con `node scripts/character-pipeline.mjs import`. El importador valida antes de copiar originales o escribir el catálogo candidato. Esta operación no acredita revisión visual ni promoción.
7. Revisar en el inspector nativo: animaciones y rumbos usados, cambios de pierna/mano, anclajes por fotograma, ropa/equipo, varios estados, retirada, zoom y oclusión. Los puntos de plantilla son semillas; corregirlos y registrar las excepciones antes de afirmar compatibilidad. Las comparativas usan el componente de superposición común, misma cámara/resolución/estado y originales con hash.
8. Integrar mediante el registro central, probar en la escena, inventario y acciones vigentes; comprobar persistencia y el canal de sincronización que realmente exista. No afirmar guardado de campaña o multijugador completo por una prueba local de apariencia.
9. Con evidencia técnica y revisión visual de la revisión exacta, promover con `node scripts/character-pipeline.mjs import --promote --review RUTA_JSON`. El informe exige revisión coincidente, técnica superada, visual revisada y archivos de evidencia existentes. La aceptación artística del usuario y las pruebas físicas se registran aparte y nunca se infieren de una suite verde.

## Reglas de compatibilidad

Un personaje identifica `embeddedSlots`: equipo o ropa incluidos en el dibujo. Cambiar esa ranura exige una máscara de reemplazo revisada, una capa separada o una base reconstruida. Nunca colocar otra armadura encima de una armadura pintada y darla por sustituida. Una coraza exterior puede ser compatible con un cuerpo vestido de tela si esa compatibilidad se declara y se revisa.

Cada elemento equipable declara ranura, anclaje, perfiles, escala relativa, pivote, orden delante/detrás y comportamiento en las acciones permitidas. Un elemento sin manos no recibe un arma de mano por adaptar su tamaño. Una pose incompatible debe rechazarse o usar una alternativa declarada; nunca esconder silenciosamente un error de compatibilidad.

Los overlays corporales siguen la silueta del fotograma. Los elementos físicos siguen anclajes y admiten partes delante/detrás. Efecto visual, causa de una restricción y condición mecánica son conceptos distintos: raíces, cadenas o hielo pueden ilustrar la misma condición sin crear reglas nuevas.

En Stormwreck, priorizar láminas de un solo ciclo de 4 × 2 o fotogramas individuales para poses que pierdan detalle en las láminas densas. Medir la altura visible real del original antes de extraer. Un lienzo grande con mucho margen o un recorte ampliado conserva la resolución efectiva de la figura que contiene. Revisar al zoom de juego y en ampliación los bordes, el rostro y los apoyos. Para alas, colas y extremidades extendidas estudiar el espacio de cada pose antes de empaquetar los fotogramas. [Ejemplo validado de marcha y vuelo](evidence/NPC_SPRITES_20261116.md#nitidez-de-la-marcha-y-el-vuelo).

## Validación y trazabilidad

Validación estructural y pruebas negativas: `node --test scripts/test-character-pipeline.mjs`. CI: `.github/workflows/character-assets.yml` valida definiciones y errores de importación; no se declara ejecutado el CI remoto por haber creado el archivo.

Las dimensiones de cabecera, el canal alfa y la existencia de archivos son comprobaciones distintas de la transparencia real y del resultado artístico. La validación nativa debe decodificar los recursos importados y compilar materiales. Un informe de revisión debe acreditar los comandos y capturas de la candidata actual. La ficha de implementación identifica qué herramientas están construidas y ejecutadas; no usar documentación de herramientas previstas como prueba de implementación.

No regenerar definiciones iniciales para sobrescribir ajustes manuales: el inicializador conserva archivos existentes. Cambiar definición o fuente invalida una revisión anterior de otra revisión. Conservar adaptadores antiguos hasta que la sustitución esté comprobada; no hacer una reorganización masiva del repositorio.
