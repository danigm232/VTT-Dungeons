# D8 V61 — Hora controlada por el DM y golden hour

## Cambio solicitado

La consola DM ya permite elegir la hora. V61 elimina la retención ambiental automática del atardecer introducida en V60, sin añadir otro control ni modificar el reloj, duraciones, climatología, partidas, reglas o decisiones narrativas. En automático se utiliza el perfil del reloj; los cambios explícitos del DM siguen funcionando. Se conserva el final oscuro confirmado por el DM cuando no hay una selección explícita de hora.

## Iluminación

- Templo, Café, Mercado, Fritz y Cena comparten el mismo tratamiento del cielo y de la luz natural.
- Atardecer: sol dorado a 15°; relleno azulado suave y rebote oscuro frío, separados de la luz solar. Las sombras proyectadas se alargan y su caché se invalida al cambiar la dirección del sol.
- La luz de las ventanas y vidrieras conserva su patrón y color y recibe una curva de intensidad más legible durante la golden hour. De noche, el sol y la luz solar interior se apagan; las luces locales mantienen sus controles existentes.
- Día, noche y amanecer recolorean también el panorama existente y su bruma, sin añadir geometría, luces ni mapas de sombra. El Espejo conserva su tratamiento de cueva.
- No se cambian zonas jugables, cámara, cubiertas, colisiones, mobiliario, PNJ ni interacciones.

## Validación

- 61 pruebas aprobadas en 11 archivos, incluidos reloj, controles de hora, presentación, navegación, cámara, asientos y mecánicas del Café.
- Auditoría con el runtime Babylon realmente incrustado y NullEngine: 180 encuadres en los cinco escenarios, formato horizontal/vertical, inclinaciones 15°–40° y giros −30°/0°/+30°; sin fallos de continuidad o intrusión de capas.
- 20 comprobaciones de hora: día, atardecer, noche y amanecer en cada escenario. Cielo idéntico entre mapas en cada fase; sol a 15° durante el atardecer, sol apagado de noche y separación de luz dorada/relleno frío verificada.
- Auditoría de cubiertas, puertas, ventanas, luces y transición interior/exterior en los seis mapas, más el movimiento de cámara del modo independiente: aprobada.
- Paquete V61 generado con el generador oficial, fuentes incrustadas exactas, `current` idéntico a `v61` y V60 archivada.

Evidencia de los cinco escenarios: `runtime/d8-v61-sylvania-{cafe,market,garden,dinner,temple}.json`.

La auditoría anterior es técnica: no equivale a capturas con GPU ni confirma FPS, draw calls reales o percepción visual final. La inspección visual con navegador sigue pendiente por la restricción de acceso indicada anteriormente.

## Versión servida

Compilación cliente/servidor aprobada en `runtime/prepared-v61-golden-hour-20261014-r2`. Se reinició solamente el servicio D8 de prueba del puerto 3001; no se sustituyó el `dist` general del proyecto. Verificado: `/dm` y el nuevo archivo del renderizador devuelven HTTP 200; `/api/d8/renderer-config` publica V61 y `/api/campaign` identifica `d8-night-private`. Registro de errores del servicio vacío. Abrir o recargar `http://127.0.0.1:3001/dm` para recibir esta versión.
