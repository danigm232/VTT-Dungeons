# Pecio: frente de cámara desde la barca

- Frente exterior único: alpha +90°, desde la borda +Z de la barca de la
  expedición. La eslora X se ve horizontal y el barco de costado.
- Q/E y gesto móvil mantienen el arco ±30° (60–120°); se conserva la
  inclinación, el encuadre centrado y las vistas de camarotes hacia sus puertas.
- El control de movimiento usa el mismo frente inicial. No cambian mapa,
  colisiones, posición de la barca ni estado de los personajes.
- Fondo y bruma se ajustan una vez al nuevo frente; siguen anclados al mundo
  y conservan la optimización de matrices y buffers estáticos.
- Una revisión de preferencia exclusiva del Pecio evita recuperar el giro
  guardado para el frente antiguo. Las preferencias de otros mapas se conservan.

Validación: 25 pruebas pasan (frente/barca real, proyección lateral de proa y
popa, encuadre, controles, giro, fondo, camarotes y cámara compartida).
Tipos del cliente y compilaciones de cliente/servidor superados.
Candidata: `runtime/prepared-wreck-boat-front-20261030`.
La orientación se ha verificado geométricamente con la posición real de la
barca; este registro no acredita una nueva inspección visual en el navegador.
