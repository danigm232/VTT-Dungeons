# Retiro del Dragón — Q0, primera pasada de optimización

Trabajo del25/10/2026; revisión final y cierre del26/10/2026. Entregada y publicada en el puerto3000. Q1 conserva la optimización profunda. [Galería](../../output/retreat-quick-opt-20261025/index.html) · [Pruebas](../../output/retreat-quick-opt-20261025/checks/verification.json) · [Roadmap](../audits/RETREAT_TECHNICAL_ROADMAP_20261023.md).

## Cambios

- Liberadas del runtime dos mallas de presentación ya sustituidas y desactivadas: G2_Backland_Connected_Volcanic_Island y SAL1_Backland_Presentation. Primero se cargan y validan los relevos; un error conserva el respaldo válido. Los GLB originales siguen intactos en disco. No se libera material o textura compartidos. Se retiran solo referencias a esas mallas de las listas de luces/sombras.
- Agua y espuma reutilizan arrays de posiciones, colores y normales. Las fórmulas, frecuencia visible de24Hz, escala, texturas, materiales y geometría se conservan.
- La espuma pausa su deformación cuando queda fuera de todas las cámaras activas, independientemente del mar. El mar también admite pausa si no contribuye a ninguna vista. Se incluye el agua lejana y los render targets; no se deduce que la roca tape toda el agua. Al reaparecer se calcula directamente el tiempo actual.
- Las búsquedas de descendientes de mobiliario, muros y cubiertas se almacenan después de terminar la carga. Antes de completar las importaciones siguen consultándose. Los actores y proxies temporales de oclusión no usan ese caché.
- Se conservó la ampliación de playa solicitada en «Jugador y PNJ». Se valida el JSON con el esquema antes de pasarlo al helper existente, resolviendo su error de tipos. La prueba exige que cada registro original siga idéntico y en orden, admite las altas posteriores y rechaza duplicados. No se cambió la lógica de esa ampliación.

## Conservación y pruebas

104pruebas en11archivos correctas, tipos cliente y compilación cliente/servidor correctos. Siete pruebas específicas cubren liberación selectiva, geometría/materiales compartidos, respaldo en fallo, cargas asíncronas, cámaras secundarias, render targets, agua lejana, espuma independiente y reaparición sin desfase.

35parejas de imágenes con la misma pose, resolución1280×720 yDPR1,125: A1–A5, celda, puerto, cornisa dePleamar, subida/bifurcación/interior/costa delObservatorio, ángulos5°/25°, giros±30° y rolesDM/jugador/proyector. Geometría estática, posiciones, materiales y visibilidad cotejados; se exceptúan solo bounds/matrices animados de agua y llamas. Luces, tamaños de mapas de sombras y sus emisores activos coinciden. No se baja calidad, resolución, vegetación, iluminación o sombras.

Tres salidas/regresos estables en mallas/geometrías/materiales/texturas/luces y sin errores. Navegación, colisiones, puertas, palé, viajes manuales y dados físicos conservados. Los archivos de navegación y todos los GLB protegidos permanecen idénticos. La ampliación ajena ya estaba presente antes de esta pasada; no atribuir sus casillas aQ0 ni comparar el total runtime ampliado con el antiguo1142 como si fuera una regresión de optimización.

Candidata `runtime/prepared-retreat-quick-opt-20261025c`, cierre/activación seguros y compilación anterior conservada. DM/proyector3000 y once grupos protegidos del guardado verificados. Las fotografías diurnas son de copia aislada; no se movieron PJ/PNJ reales ni se alteró hora/clima para las fotos.

## Recursos y rendimiento breve

Mallas1329→1327; geometrías900→898; materiales231→231; texturas73→73; luces18→18 en el encuadre comparado. Se descargan8810triángulos de respaldos que ya no se dibujaban, aproximadamente724920bytes nominales de buffers. Esto no mide la RAM/VRAM total ni implica una reducción de draw calls: las mallas ya estaban desactivadas. Los tres regresos estabilizan los mismos recuentos entre sí.

| Encuadre | Antes | Después | Cambio de tiempo por fotograma |
|---|---:|---:|---:|
| dm · overview | 40,95 ms | 38,20 ms | No concluyente |
| player · a4 | 35,15 ms | 31,00 ms | -11,81 % |
| player · sal2-end | 24,30 ms | 21,85 ms | -10,08 % |

Método: dos muestras breves calentadas por estado y encuadre,24fotogramas medidos por muestra, render forzado con finalizaciónGPU. Los draw calls de biblioteca/sendero coinciden. En la panorámica el último fotograma tuvo712/1225llamadas en el control y712en ambos ensayos nuevos, con las mismas970mallas activas y sombras configuradas igual. Es compatible con un refresco de sombras en distinto momento, pero no permite atribuir una mejora deFPS panorámicos; se conservan los tiempos sin una conclusión de ganancia. Es un diagnóstico de coste en laGPUIntelUHD, no una certificación deFPS sostenidos. Los valores equivalentes1000/ms se guardan como referencia técnica, sin presentarlos comoFPS reales del servidor.

Los primeros ensayos están preservados en drafts/initial-costs. Se corrigió una invalidación innecesaria de matrices de cámara y se separó la pausa de espuma, que el gran volumen del mar impedía aprovechar. La comparativa final usa before2/3 yafter3/4, sin compilación concurrente durante la medición. Q1 tratará partición del agua, oclusión por terreno, carga selectiva sin importar primero los respaldos, coste de sombras y mediciones prolongadas. Esta pasada descarga respaldos después de validar sus sustitutos; no afirma haber completado streaming por sectores.

## Archivos

Detalle deCPU: actualización del Retiro14,85→13,90ms enbiblioteca y14,15→12,25ms enel sendero; panorámica11,65→13,45ms. No atribuir una ganancia general a la panorámica. La matriz final registra646actualizaciones de espuma omitidas; el mar siguió elegible por su gran volumen. Las cifras son muestras breves de diagnóstico.

- Modificados: engine/client/coastal-backdrop.ts; campaigns/camp-rests/public/a1-visuals.ts; campaigns/stormwreck-isle/public/retreat-global-visuals.ts yretreat-refinement.ts.
- Añadidos: engine/client/coastal-animation-visibility.ts; campaigns/stormwreck-isle/public/retreat-quick-opt.ts; engine/client/retreat-quick-opt.test.ts.
- Compatibilidad con cambio ajeno autorizado: retreat-runtime.ts yengine/server/retreat-island-navigation.test.ts.
- Baselines, visor, pruebas y registro de publicación: prototypes/retreat-quick-opt-20261025/. Ningún GLB o archivo de iluminación/sombras editado.

## Siguiente

Retomar la revisión conceptual deSAL-2: los14pinos actuales no completan todavía la sensación de bosque de la referencia. Revisar lectura de vegetación/relieve antes de avanzar aSAL-3. No se añadió vegetación duranteQ0. DespuésSAL-3 costa, SAL-4 calas ySAL-5 integración; M1/E1/L1 yQ1 al final. No iniciar otra fase automáticamente.
