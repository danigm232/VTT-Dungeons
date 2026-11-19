# GODOT VTT — AUDITORÍA, SISTEMA MODULAR DE PERSONAJES Y PIPELINE PERMANENTE DE PRODUCCIÓN

## OBJETIVO GENERAL

Audita el repositorio completo del VTT en Godot y desarrolla una arquitectura visual modular para los personajes, acompañada de un **sistema de trabajo obligatorio para crear, importar, modificar y validar cualquier recurso relacionado con personajes**.

### Contexto fundamental

Nuestro VTT utiliza escenarios tridimensionales con personajes representados mediante sprites 2D.

Ya tenemos numerosos sprites, atlas, poses y animaciones creados. Debemos aprovecharlos y, cuando sea necesario, modificarlos, segmentarlos o reconstruirlos.

Queremos resolver tres necesidades relacionadas:

1. Aplicar overlays de estado a los personajes sin crear un sprite nuevo para cada condición.
2. Permitir vestir y equipar personajes con ropa, armaduras, armas, herramientas y objetos intercambiables.
3. Establecer un pipeline de producción permanente que asegure que cualquier nuevo sprite, animación, criatura, objeto equipable o efecto sea compatible con la arquitectura del VTT.

**No queremos únicamente documentación. Debes auditar, implementar, integrar, probar y dejar funcionando este sistema dentro del proyecto.**

---

# FASE 1 — AUDITORÍA EXHAUSTIVA DEL REPOSITORIO

Inspecciona todos los recursos y sistemas relacionados con personajes.

## 1.1. Sprites existentes

Identifica:

- Personajes jugadores, NPC y criaturas.
- Sprites individuales.
- Atlas y spritesheets.
- Poses y animaciones.
- Direcciones representadas.
- Resoluciones y escalas.
- Pivotes y puntos de apoyo.
- Transparencias.
- Armas y equipamiento integrados en las imágenes.
- Elementos que ya podrían separarse o reutilizarse.
- Duplicaciones e inconsistencias.
- Archivos originales y derivados, si existen.

## 1.2. Implementación en Godot

Audita:

- Versión y renderer de Godot.
- Nodos utilizados para representar personajes.
- Orientación respecto a la cámara.
- Sistema de animaciones.
- Materiales y shaders.
- Sistema actual de estados.
- Inventario y equipamiento.
- Escenas y controladores de personajes.
- Acciones y combate.
- Guardado y carga.
- Sincronización entre jugador y DM.
- Herramientas existentes para crear e importar recursos.

No dupliques funcionalidades que ya estén implementadas correctamente.

## 1.3. Clasificación de los recursos

Clasifica los sprites:

- **A — Reutilizables:** compatibles directamente.
- **B — Adaptables:** requieren anclajes, máscaras o ajustes.
- **C — Reestructurables:** conviene separar cuerpo, ropa, accesorios o armamento.
- **D — Reconstrucción recomendable:** la estructura actual impide una modularidad visual satisfactoria.

Documenta las decisiones.

Puedes rehacer recursos cuando esté justificado, pero conserva los originales hasta verificar los nuevos.

---

# FASE 2 — ARQUITECTURA MODULAR 2.5D

Desarrolla una arquitectura reutilizable para la representación de personajes.

Cada personaje debe poder combinar:

1. Cuerpo o sprite base.
2. Animaciones.
3. Vestimenta.
4. Armaduras.
5. Armas.
6. Herramientas y objetos.
7. Accesorios delanteros y traseros.
8. Overlays corporales.
9. Elementos físicos superpuestos.

## 2.1. Tecnologías

Evalúa:

- Sprite3D y AnimatedSprite3D.
- Capas de sprites sincronizadas.
- Composición mediante SubViewport.
- Shaders espaciales.
- Máscaras y materiales.
- Rigging 2D cuando aporte ventajas.
- Objetos 3D vinculados al personaje.
- Geometría procedural.
- Soluciones híbridas.

Selecciona las opciones adecuadas según los recursos reales del proyecto.

No conviertas indiscriminadamente todos los personajes en modelos 3D o personajes esqueléticos.

## 2.2. Sistema de anclajes

Implementa un sistema reutilizable de puntos anatómicos.

Para humanoides:

- Cabeza y cuello.
- Hombros.
- Torso y espalda.
- Brazos y manos.
- Cintura y cadera.
- Rodillas.
- Tobillos y pies.

Adapta los perfiles para cuadrúpedos, criaturas aladas, serpentinas y demás anatomías existentes.

Los anclajes deben:

- Utilizar coordenadas relativas.
- Adaptarse a la escala.
- Sincronizarse con poses y animaciones.
- Admitir correcciones por fotograma.
- Poder editarse desde herramientas del proyecto.
- Reutilizarse entre personajes compatibles.

---

# FASE 3 — OVERLAYS CORPORALES

Implementa efectos visuales mediante shaders, materiales, máscaras y otros recursos reutilizables.

### Estados iniciales

**Envenenado**
- Venas tóxicas.
- Manchas verdosas.
- Coloración enfermiza localizada.

**Petrificado**
- Textura mineral.
- Grietas.
- Desaturación.
- Conservación de la silueta.

**Escarchado**
- Cristales superficiales.
- Bordes congelados.
- Coloración fría.

**Quemado**
- Carbonización.
- Hollín.
- Grietas incandescentes sutiles.

**Maldito**
- Corrupción oscura.
- Venas negras.
- Marcas arcanas.

**Invisible**
- Transparencia.
- Distorsión.
- Contorno refractivo configurable.

### Requisitos

Los overlays deben:

- Adaptarse a distintos sprites.
- Respetar las animaciones.
- Funcionar con equipamiento.
- Permitir intensidades configurables.
- Combinarse mediante prioridades visuales.
- Evitar efectos excesivamente llamativos.
- Mantener legibilidad a diferentes niveles de zoom.
- Activarse y desactivarse dinámicamente.

No utilices un simple tinte uniforme como solución general.

---

# FASE 4 — ELEMENTOS FÍSICOS SUPERPUESTOS

Desarrolla un sistema para representar elementos que sujetan o cubren parcialmente al personaje.

### Biblioteca inicial

1. Raíces.
2. Telarañas.
3. Cadenas.
4. Hielo inmovilizador.
5. Manos y agarres espectrales.
6. Ataduras arcanas.

Utiliza geometría procedural, curvas, mallas, elementos 2D o componentes reutilizables según corresponda.

### Requisitos

- Adaptación a los anclajes del personaje.
- Escala y orientación correctas.
- Capas delanteras y traseras cuando sean necesarias.
- Seguimiento de poses y animaciones compatibles.
- Variaciones de intensidad y cobertura.
- Materiales reutilizables.
- Activación y desactivación dinámica.

Separa la condición mecánica de su representación visual.

Por ejemplo, la condición `Restringido` puede representarse mediante raíces, cadenas, hielo o telarañas según la causa.

No crees un sprite completo diferente para cada combinación.

---

# FASE 5 — EQUIPAMIENTO Y VESTIMENTA MODULAR

Implementa la capacidad de modificar dinámicamente la apariencia del personaje.

### Elementos equipables

- Cascos y capuchas.
- Ropa y túnicas.
- Armaduras.
- Hombreras.
- Guantes.
- Botas.
- Capas.
- Mochilas.
- Cinturones.
- Bolsas.
- Armas.
- Escudos.
- Herramientas.
- Objetos sostenidos.

### Funcionamiento

Cada elemento debe poder:

- Vincularse a una ranura visual.
- Utilizar los anclajes anatómicos.
- Adaptarse a las poses compatibles.
- Mantener una escala coherente.
- Aparecer delante o detrás del personaje.
- Ocultar correctamente las partes del equipo sustituido.
- Reutilizarse entre personajes compatibles.
- Actualizarse al equiparlo o retirarlo.
- Guardarse y recuperarse con el personaje.

Si un sprite ya tiene una armadura dibujada, determina si debe crearse una máscara, separar la pieza o reconstruir el recurso.

No superpongas simplemente una armadura nueva sobre otra existente.

### Integración

Conecta el sistema visual con el inventario y las acciones del juego.

Mantén compatibilidad con el combate y con la sincronización de los participantes.

---

# FASE 6 — PIPELINE PERMANENTE Y OBLIGATORIO DE PRODUCCIÓN DE PERSONAJES

**Esta fase es fundamental y debe implementarse como infraestructura permanente del proyecto.**

Quiero que cualquier recurso relacionado con personajes siga un proceso de producción estandarizado, verificable y parcialmente automatizado.

El pipeline no debe limitarse a un documento de recomendaciones.

Debe existir como un conjunto de herramientas, validaciones, plantillas, estructuras de datos y procedimientos integrados en el repositorio y, cuando corresponda, en el editor Godot.

Debe aplicarse siempre que se quiera:

- Crear un personaje nuevo.
- Crear una criatura.
- Crear o modificar un sprite.
- Crear un spritesheet.
- Añadir una animación.
- Añadir una pose.
- Crear una nueva dirección visual.
- Modificar una anatomía.
- Crear ropa o armaduras.
- Crear armas, escudos u objetos equipables.
- Crear o modificar overlays.
- Incorporar materiales, shaders o efectos al personaje.
- Importar recursos gráficos externos.
- Modificar recursos existentes que afecten al personaje.

## 6.1. Paso 1 — Definición del recurso

Antes de generar o modificar un recurso debe existir una definición estructurada.

Debe identificar:

- Identificador único.
- Nombre.
- Categoría.
- Personaje o familia compatible.
- Perfil anatómico.
- Estilo visual.
- Tamaño y escala previstos.
- Orientación.
- Poses necesarias.
- Animaciones necesarias.
- Equipamiento compatible.
- Estados visuales compatibles.
- Dependencias con otros recursos.
- Relación con el sistema de combate, cuando corresponda.

Las definiciones deben utilizar un formato estructurado compatible con Godot, preferentemente Resource, JSON u otro formato ya utilizado por el proyecto.

No dupliques información que ya exista en otras definiciones oficiales.

**El objetivo es disponer de una fuente de datos coherente para cada personaje y sus recursos.**

## 6.2. Paso 2 — Selección de plantilla

Antes de crear un sprite nuevo, el sistema debe buscar:

1. Personajes base reutilizables.
2. Perfiles anatómicos existentes.
3. Animaciones compatibles.
4. Equipamiento reutilizable.
5. Materiales y shaders existentes.
6. Overlays ya implementados.
7. Recursos que puedan adaptarse mediante máscaras o anclajes.

No debe crearse un recurso completamente nuevo cuando otro pueda reutilizarse de manera convincente.

Implementa plantillas para las principales familias anatómicas reales del proyecto.

La plantilla debe proporcionar las configuraciones predeterminadas necesarias, sin impedir excepciones justificadas.

## 6.3. Paso 3 — Producción del recurso

Estandariza la creación de sprites y animaciones.

### Sprites

Determina y documenta:

- Resoluciones de referencia según categoría.
- Escala visual.
- Proporciones.
- Transparencia.
- Márgenes.
- Pivote.
- Orientación.
- Tratamiento de contornos.
- Paleta y materiales.
- Coherencia de iluminación.
- Organización de capas.
- Exportación.

No fuerces una única resolución para criaturas de tamaños radicalmente diferentes.

### Animaciones

Establece:

- Nombres normalizados.
- Estados de animación.
- Fotogramas por acción.
- Velocidad de reproducción.
- Fotograma inicial.
- Transiciones.
- Pivotes consistentes.
- Anclajes sincronizados.
- Eventos de animación cuando proceda.
- Poses de referencia.

Una nueva animación debe declarar su compatibilidad con el equipamiento, los overlays y la anatomía.

No generes automáticamente animaciones innecesarias solo para completar una lista.

### Equipamiento

Los objetos visuales nuevos deberán declarar:

- Ranura.
- Punto de anclaje.
- Perfiles compatibles.
- Escala.
- Pivote.
- Orden de renderizado.
- Variaciones por pose cuando sean necesarias.
- Máscaras y zonas de ocultación.
- Comportamiento durante las animaciones.

### Overlays

Los efectos nuevos deberán declarar:

- Tipo de efecto.
- Parámetros.
- Materiales.
- Zona de aplicación.
- Requisitos de anclaje.
- Prioridad visual.
- Compatibilidades.
- Comportamiento durante animaciones.
- Condición de activación y desactivación.

## 6.4. Paso 4 — Estructura de archivos y nomenclatura

Audita la organización actual y establece convenciones coherentes.

Los recursos relacionados deben poder localizarse fácilmente.

La estructura debe distinguir conceptualmente:

- Definiciones de personajes.
- Sprites base.
- Animaciones.
- Perfiles anatómicos.
- Anclajes.
- Equipamiento.
- Materiales.
- Shaders.
- Overlays.
- Recursos originales.
- Recursos derivados.
- Escenas de pruebas.

No reorganices masivamente el repositorio sin un sistema de migración seguro.

Mantén referencias estables y evita romper rutas utilizadas por las escenas existentes.

Normaliza los nombres de recursos, animaciones, ranuras y anclajes.

## 6.5. Paso 5 — Importación automatizada

Desarrolla herramientas para incorporar nuevos recursos a Godot.

Según la arquitectura escogida, deberían facilitar:

- Importación de imágenes.
- Lectura de definiciones.
- Preparación de spritesheets.
- Configuración de animaciones.
- Asignación de pivotes.
- Aplicación de perfiles anatómicos.
- Creación de anclajes iniciales.
- Asociación de materiales.
- Creación de recursos de equipamiento.
- Registro en la biblioteca de personajes.
- Generación de vistas previas.

No es necesario automatizar decisiones artísticas que requieran supervisión humana.

El objetivo es evitar tareas repetitivas y errores manuales.

Cuando sea razonable, incorpora herramientas accesibles desde el editor de Godot.

## 6.6. Paso 6 — Validación técnica obligatoria

Implementa validadores automáticos.

Deben comprobar, en función de cada tipo de recurso:

- Archivos existentes y rutas válidas.
- Identificadores únicos.
- Formatos compatibles.
- Transparencias.
- Dimensiones.
- Estructura de spritesheets.
- Coherencia de fotogramas.
- Pivotes.
- Escalas.
- Anclajes requeridos.
- Sincronización de animaciones.
- Compatibilidad con equipamiento.
- Materiales y shaders.
- Orden de capas.
- Referencias y dependencias.
- Posibles recursos duplicados.
- Integridad de las definiciones.

Las comprobaciones deben distinguir entre errores bloqueantes y advertencias.

No impongas anclajes de manos a criaturas que no tengan manos ni obligues a crear animaciones que no se utilicen.

Las reglas deben adaptarse a cada categoría.

Integra las comprobaciones en la importación y, si el entorno lo permite, en pruebas de repositorio o CI.

**Un recurso nuevo no debe incorporarse a la biblioteca de producción si presenta errores bloqueantes.**

## 6.7. Paso 7 — Validación visual

La validación técnica no es suficiente.

Implementa una escena de inspección visual reutilizable que permita:

- Seleccionar cualquier personaje.
- Mostrar su sprite base.
- Reproducir animaciones.
- Visualizar anclajes.
- Mostrar sus capas.
- Equipar objetos compatibles.
- Activar overlays.
- Superponer varios efectos.
- Cambiar orientación cuando corresponda.
- Cambiar zoom.
- Visualizar el personaje en un escenario representativo.
- Comparar recursos originales y nuevos.

Comprueba especialmente:

- Que las armas no se separen de las manos.
- Que los cascos no floten.
- Que las armaduras no se desplacen respecto al cuerpo.
- Que las raíces y cadenas no atraviesen visualmente zonas incorrectas.
- Que los efectos mantengan la silueta reconocible.
- Que las animaciones sean fluidas.
- Que el sprite no cambie de escala inesperadamente.
- Que el orden de dibujo sea correcto.

Cuando sea viable, genera capturas comparativas y pruebas de regresión visual.

La aprobación visual debe formar parte del proceso de incorporación de recursos.

## 6.8. Paso 8 — Integración con el juego

Una vez validado el recurso:

- Regístralo en el sistema de personajes.
- Conéctalo con las animaciones disponibles.
- Verifica los estados visuales.
- Verifica el equipamiento.
- Comprueba su representación en el mapa.
- Comprueba la interacción con la cámara.
- Comprueba guardado y carga cuando corresponda.
- Comprueba la integración con el DM y los jugadores.
- Verifica que no rompe recursos existentes.

No debe ser necesario editar numerosos scripts manualmente cada vez que se añade un nuevo personaje.

Prioriza definiciones de datos, registros reutilizables y mecanismos de incorporación centralizados.

## 6.9. Paso 9 — Documentación y trazabilidad

Cada recurso debe disponer de información suficiente para conocer:

- Qué representa.
- De qué recurso procede.
- Qué perfil utiliza.
- Qué animaciones admite.
- Qué equipamiento es compatible.
- Qué overlays admite.
- Qué limitaciones tiene.
- Cuándo fue modificado.
- Qué validaciones ha superado.

Evita documentación manual redundante.

Genera automáticamente los datos que puedan obtenerse del proyecto.

Mantén un registro de excepciones justificadas cuando un recurso no pueda seguir alguna regla general.

---

# FASE 7 — HERRAMIENTAS PERMANENTES DEL PIPELINE

Implementa las herramientas necesarias para que el flujo anterior no dependa exclusivamente de que Codex recuerde las instrucciones.

## 7.1. Documentación normativa

Crea un documento de referencia dentro del repositorio, por ejemplo:

`docs/CHARACTER_ASSET_PIPELINE.md`

Debe explicar el proceso oficial de creación, modificación, importación y validación.

Incluye instrucciones claras para futuros desarrolladores y agentes de programación.

## 7.2. Instrucciones para agentes

Integra estas reglas en el sistema de instrucciones de desarrollo que ya utilice el repositorio, como `AGENTS.md` si procede.

Cualquier agente que trabaje en personajes debe:

1. Consultar las definiciones y recursos existentes.
2. Identificar el perfil anatómico.
3. Reutilizar recursos compatibles.
4. Crear o modificar el recurso.
5. Ejecutar las validaciones.
6. Comprobarlo visualmente.
7. Integrarlo sin romper el proyecto.
8. Documentar los cambios y excepciones.

No debe saltarse este proceso para generar rápidamente nuevos sprites.

## 7.3. Herramientas del editor

Desarrolla, reutiliza o amplía herramientas de Godot para:

- Crear personajes desde plantillas.
- Editar anclajes.
- Inspeccionar animaciones.
- Asignar equipamiento.
- Inspeccionar capas.
- Aplicar overlays.
- Ejecutar validaciones.
- Mostrar errores y advertencias.

Evita herramientas duplicadas si el proyecto ya cuenta con soluciones similares.

## 7.4. Validadores ejecutables

Implementa pruebas y validadores reutilizables que puedan ejecutarse después de añadir o modificar recursos.

Deben producir resultados verificables y mensajes de error claros.

Si se dispone de un proceso de integración continua, incorpora las validaciones necesarias.

No declares una prueba superada si no ha podido ejecutarse.

## 7.5. Plantillas de creación

Prepara plantillas reutilizables para:

- Personajes humanoides.
- Criaturas no humanoides según los perfiles existentes.
- Animaciones.
- Equipamiento visual.
- Objetos sostenidos.
- Overlays corporales.
- Elementos físicos superpuestos.

Cada plantilla debe contener los campos y configuraciones requeridos por su categoría.

---

# FASE 8 — ADAPTACIÓN DE LOS SPRITES EXISTENTES

Después de implementar el sistema de producción, migra progresivamente los recursos actuales.

Para cada recurso:

1. Identifica su estado.
2. Clasifícalo.
3. Selecciona el perfil anatómico.
4. Corrige pivotes y escalas.
5. Añade anclajes necesarios.
6. Separa elementos cuando resulte útil.
7. Configura máscaras y capas.
8. Verifica animaciones.
9. Comprueba compatibilidad con overlays.
10. Comprueba compatibilidad con equipamiento.
11. Ejecuta las validaciones.
12. Registra el resultado.

No reconstruyas toda la biblioteca por defecto.

Prioriza personajes jugadores, NPC recurrentes y criaturas relevantes para las partidas.

Los recursos antiguos que todavía no se hayan migrado deben seguir funcionando mediante mecanismos de compatibilidad.

---

# FASE 9 — PRIMERA IMPLEMENTACIÓN FUNCIONAL

No te limites a definir la arquitectura.

Implementa un primer recorrido completo del pipeline utilizando recursos reales del repositorio.

### Personajes

Selecciona:

- Dos humanoides visualmente diferentes.
- Una criatura no humanoide.

### Equipamiento

Implementa como mínimo:

- Un casco.
- Una armadura.
- Un arma.
- Un escudo o herramienta.
- Un objeto de espalda o cintura.

### Overlays

Implementa:

- Envenenado.
- Petrificado.
- Restricción mediante raíces.

### Escena de pruebas

Crea una escena funcional donde podamos:

- Cambiar de personaje.
- Cambiar de equipamiento.
- Activar y desactivar estados.
- Ajustar intensidades.
- Reproducir animaciones.
- Visualizar anclajes.
- Comparar resultados visuales.
- Comprobar compatibilidad entre equipo y estados.

### Prueba completa del pipeline

Realiza también esta prueba:

**Crea un nuevo recurso de personaje o una variante visual a través del pipeline recién implementado.**

Debe pasar por:

Definición → Plantilla → Producción → Importación → Validación técnica → Validación visual → Integración.

Verifica que la infraestructura realmente funciona de principio a fin.

No consideres completado el pipeline simplemente porque existan archivos de documentación o scripts sin ejecutar.

---

# FASE 10 — CALIDAD, INTEGRACIÓN Y RENDIMIENTO

Comprueba:

- Compatibilidad con el sistema de grid.
- Movimiento de personajes.
- Animaciones.
- Combate.
- Inventario.
- Estados.
- Selección de personajes.
- Interfaz de jugador y DM.
- Cámaras.
- Colisiones.
- Transparencias.
- Orden de renderizado.
- Guardado y carga.
- Sincronización multijugador.
- Rendimiento con múltiples personajes.

Evita añadir un SubViewport por personaje si supone un coste excesivo.

Utiliza optimizaciones, caché o composición alternativa cuando resulte conveniente.

No sacrifiques coherencia visual para conseguir una modularidad aparentemente completa.

---

# FASE 11 — CRITERIOS DE ACEPTACIÓN

El trabajo debe alcanzar estos resultados:

### Arquitectura

- Existe un sistema visual modular integrado en Godot.
- Los personajes siguen siendo representaciones 2D dentro del entorno 3D.
- Los sprites existentes mantienen compatibilidad o disponen de una ruta de migración.
- La arquitectura permite combinar cuerpo, equipo y estados.

### Equipamiento

- Dos personajes compatibles pueden compartir un recurso de arma.
- Se puede cambiar un casco.
- Se puede equipar y retirar una armadura.
- Los objetos siguen correctamente las animaciones probadas.

### Estados

- Un personaje puede petrificarse sin generar un sprite nuevo.
- El veneno puede aplicarse a varios personajes.
- Las raíces pueden sujetar visualmente una criatura.
- El equipamiento y los estados pueden coexistir.

### Pipeline permanente

- Existe un proceso oficial documentado.
- Existen definiciones estructuradas.
- Existen plantillas reutilizables.
- Existen herramientas de importación o creación.
- Existen validaciones ejecutables.
- Existe una escena de inspección.
- Los errores bloqueantes impiden incorporar recursos nuevos al flujo de producción.
- Se ha creado o modificado un recurso real siguiendo el pipeline completo.
- Las instrucciones de desarrollo obligan a utilizarlo en futuros trabajos relacionados con personajes.

---

# ENTREGABLES

Entrega:

1. Auditoría del repositorio.
2. Inventario de sprites, poses y animaciones.
3. Clasificación de recursos.
4. Arquitectura modular implementada.
5. Sistema de perfiles anatómicos y anclajes.
6. Sistema de equipamiento.
7. Biblioteca inicial de overlays corporales.
8. Biblioteca inicial de elementos físicos.
9. Herramientas del pipeline de producción.
10. Plantillas y definiciones de recursos.
11. Validadores automáticos.
12. Escena de inspección y pruebas.
13. Documentación oficial del pipeline.
14. Integración de las reglas en las instrucciones de los agentes.
15. Comparativas visuales.
16. Resultados de pruebas de integración y rendimiento.
17. Informe de modificaciones y problemas pendientes.
18. Plan de migración del resto de personajes.

---

# INSTRUCCIÓN FINAL

**El objetivo no es únicamente mejorar los personajes actuales. Es construir un sistema sostenible para todos los personajes futuros.**

A partir de esta implementación, la creación de un personaje, sprite, animación, arma, armadura, objeto equipable u overlay deberá seguir el pipeline oficial.

El pipeline debe estar respaldado por herramientas y validaciones, no depender solamente de instrucciones escritas.

No generes recursos incompatibles con la arquitectura modular.

No reconstruyas recursos existentes innecesariamente.

No declares implementadas funciones que no hayas comprobado.

Trabaja por fases, realiza cambios reales y verificables y conserva la funcionalidad del VTT.

**Empieza por auditar el repositorio. Utiliza los resultados de esa auditoría para implementar el sistema modular y el pipeline de producción permanente.**