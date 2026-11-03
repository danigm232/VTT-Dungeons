# SAL-3 · Cornisa costera del Observatorio — 26/10/2026

Estado: construida, comprobada y publicada en el VTT 3000 el26/10/2026. Entregada a revisión conceptual del usuario; aún quedan M1/E1/L1/Q1 para el acabado general.

Ramal costero abierto al mar mediante recorte del fondo decorativo y del respaldo G13, conservando los originales; hombro rocoso, vegetación baja, afloramientos y continuación escénica. Hito costero apoyado sin alterar las piedras interiores.

## Límites, canon y ambiente

Se conserva la escala de 1,5m/casilla, orientación aceptada, puerto a la derecha, A1–A5, seis celdas y todo su mobiliario. Los caminos y anclas mantienen sus coordenadas y perfiles. CANON conserva funciones y alternativas de viaje; la especie/agrupación vegetal, materiales del paisaje y afloramientos son VTT_AMBIENCE. No se automatizan pruebas, mareas ni resultados narrativos.

## Validación

- 118 pares con cámaras coincidentes, inclinaciones 5/10/15/20/25° y giros ±30/±15/0°, cerca/lejos y tres roles. Sin oclusiones añadidas en la matriz.
- 597400 muestras corporales sobre GLB reimportado; 0 raíces comprobadas en esta fase. Las muestras de los peldaños copiados se comparan con la superficie original: no se consideran nueva geometría los contactos ya existentes y coincidentes.
- Movimiento autoritativo: 12242 pasos a 42 destinos y regreso; 243 bordes exteriores bloqueados. Runtime actual: 1279 casillas/13 superficies/18 conexiones, incluida ampliación de playa autorizada en otro chat. Ninguna casilla añadida por SAL.
- Recursos: 1495→1535 mallas y 959→998 geometrías; 231 materiales, 73 texturas y 18 luces. Se reutilizan los recursos existentes. Coste bruto registrado; FPS sostenidos y memoria GPU pendientes de Q1.
- GLB: 1930440 bytes; 42 primitivas; cero imágenes nuevas; validador sin errores ni advertencias. Fuente Blender y generador en `prototypes/retreat-sal-natural-20261026/`.

## Archivos y revisión

Modelos originales conservados en disco, derivados nuevos `retreat_departure_sal2r_runtime.glb`, `sal3` y `sal4` según fase. Integración en `retreat-departure-landscape.ts/.json`, liberación de respaldos en `retreat-quick-opt.ts` y contacto costero acotado en `retreat-departure-contacts.ts` cuando corresponda. Los cambios son visuales, sin nuevos controles DM.

[Comparativas](../../output/retreat-sal3-20261026/index.html) · [Evidencia](../../output/retreat-sal3-20261026/checks/verification.json)

Cierre conjunto SAL-5 verificado y publicado. Pendiente: revisión conceptual del usuario. Los ejes rectos conservados se naturalizan por sus bordes y contexto; rediseñar su trazado exigiría otro alcance de navegación. M1/E1/L1 afinan materiales, entorno general y atmósfera después de SAL; esta entrega no pretende reproducir aún todo el acabado de la imagen de referencia.


## Cierre publicado del lote

553 pares en cuatro entregas,50 vistas funcionales de grupo/roles/cuadrícula/390×844/combate y3 regresos con recursos estables.102 pruebas en11 archivos; compilación cliente/servidor correcta. Candidata final `runtime/prepared-retreat-sal-20261026b`, activa en `dist`, servidor 3000 PID 20660.560 inputs y51 GLB compilados coinciden con las fuentes;48 modelos originales conservados. DM conectado, proyector dentro de la escena, partida guardada y once grupos semánticos preservados. No se movieron personajes reales para las fotografías ni se cambió hora/clima de la partida.

La primera comparación global abrió una pestaña estrecha y otra ancha: el VTT seleccionó distinto detalle nativo del mar. Se rechazó ese ensayo y se repitió el antes en la misma ventana. Los172 pares finales comparten malla de agua, cámara, tamaño de lienzo yDPR. La comprobación funcional adicional se hizo en escritorio y en disposición390×844. Las texturas tras los tres regresos son estables (74 wrappers en ese perfil); la matriz comparable utiliza73. No son cifras exactas deVRAM.

Inventario de la matriz:1327→1562 mallas y898→1024 geometrías;231 materiales,73 texturas y18 luces en ambos estados. Los modelos de respaldo se liberan solo tras validar su sustituto; originales en disco. Se registra el coste añadido sin prometerFPS: carga selectiva, sombras/LOD/draw calls y medición sostenida siguen enQ1.

Quedan paños de roca amplios y ejes ortogonales heredados: el trazado de movimiento se conserva y esta entrega mejora su encaje y lectura. La propuesta es una referencia de acabado; no se declara alcanzada todavía toda su naturalidad o calidad de materiales. Próxima ficha: M1, después E1/L1 yQ1.
