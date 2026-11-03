# Pecio — centro de cámara y segunda optimización

## Cámara

El botón «Conjunto» descarta el desplazamiento anterior y la navegación local
del DM. El encuadre se deriva de la silueta naval, las cubiertas, la quilla y
el mástil, sin incluir el océano o el fondo. El punto medio de sus extremos
proyectados queda centrado en ambos ejes. La escala de conjunto se calcula
para el arco completo permitido, por lo que no oscila al girar horizontalmente.

El modo semi-fijo sigue el eje longitudinal de cada cubierta (C1, proa y popa)
en vez de tomar el centro de la cuadrícula de agua. En una pantalla estrecha
cede al seguimiento del personaje si centrar sobre la quilla lo dejaría fuera
del margen visible. Se conservan inclinación manual, giro ±30°, cámara propia,
vista compartida, cámara de combate y encuadres de interiores/cofa.

La vista de conjunto tampoco hereda la orientación de C6/C7, el corte de un
camarote ni la oscuridad submarina de un personaje que permanezca en C9.
La corrección del plano cercano ya disponible para ortografía se reutiliza
en el Pecio para evitar recortes de agua en una pantalla vertical con poca
inclinación. La vista cenital del inspector sigue funcionando.

## Trabajo de carga y de cada fotograma

- Los perfiles de las zonas son datos compartidos, no objetos reconstruidos
  en cada actualización de cámara. Los límites de conjunto se cachean por
  inclinación y proporción de pantalla.
- El nido acumula las superficies de paja, telas y virutas antes de crear los
  meshes finales. Las creaciones de meshes durante su construcción pasan de
  **3.107 a 449**. Se conservan los siete lotes, los vértices, los índices,
  límites, texturas, cinco tesoros, casillas y acceso P10.
- Las distancias de seguridad del nido usan segmentos precalculados, sin
  crear una matriz de distancias ni varias raíces por cada consulta. Se
  verifica equivalencia numérica con el cálculo anterior.
- Los nueve peces, dieciocho burbujas y el agua interior comparten **un
  callback en vez de 28**. Los niveles ocultos no actualizan animaciones ni
  buscan luces. Al entrar se toma la fase temporal actual; las trayectorias
  y las fuentes de luz conservan las fórmulas anteriores.

## Comprobaciones

- Pruebas de encuadre para aspectos 0,5, 1, 16/9 y 2,4; inclinaciones de 5–25°
  y cenital de inspección; giro horizontal completo entre −75° y −15°.
- Regresiones de cámara compartida, navegación del DM, cámara D8, estructura
  del Pecio, nido, tesoros y accesos.
- Pruebas de visibilidad, tiempo absoluto y luces de la animación interior.
- Comparación del nido antes/después en
  `output/pecio-camera-optimization-20261029/`.
- `nest-triangle-comparison.json`: coincide el contenido de triángulos, UV y
  colores por material con tolerancia de 0,0001 m en las posiciones. En esa
  única pareja de mediciones con NullEngine, la construcción anterior tardó
  1.991 ms y la nueva 909 ms. No es una medida de FPS ni del arranque completo.
- Se superaron las 37 pruebas conjuntas de cámara, navegación, estructura,
  nido y animación interior; después se añadió y superó la prueba numérica
  de distancias del nido (5 pruebas en ese archivo).

El visor de navegador volvió a quedar sin respuesta. No se ha podido hacer
una captura nueva ni medir FPS/GPU; las verificaciones de cámara son de
proyección geométrica y regresión de código, no una inspección visual.

La candidata completa es `runtime/prepared-wreck-camera-v2-20261029`: tipos
del cliente, compilación final Vite y compilación del servidor superadas.
Se verificó que el bundle incluye el encuadre y la optimización finales.
La mesa activa
conserva su versión hasta actualizarla mediante el inicio seguro existente.
