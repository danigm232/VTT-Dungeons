# Combate: interfaz, sprites y cancelación · 14/10/2026

## Cambios aplicados

- Línea de iniciativa sin ventana, sin desenfoque del fondo y sin tarjetas individuales: actual, tres siguientes y tres posiciones de previsión. Separación visual entre ambos grupos; ronda en una sola línea; retratos con información conocida al pasar el ratón o mantener pulsado. Se eliminaron las reglas antiguas que comprimían el roster y superponían «previsión».
- Rueda con capacidad estable: cuatro iconos en esquinas y ocho en laterales. El tamaño del texto ya no reduce la capacidad a un icono por página. En pantallas estrechas se priorizan los iconos, se mantienen sus ayudas y se utilizan dos arcos. Última distribución compacta para alturas especialmente cortas; nunca se apilan todos en el origen. La paginación conserva todos los elementos y se reajusta al cambiar el tamaño de pantalla.
- Caídos: se conserva la ilustración tumbada, con altura y ligera profundidad en 2.5D. Ya no se proyecta otra vez toda la imagen sobre el suelo, lo que la convertía en una pegatina. La parte inferior permanece apoyada y el overlay de sangre/inconsciencia queda debajo; desaparece al recuperarse.
- Zoom manual de combate hasta un 35% más cercano, sujeto a conservar una escala mínima útil. Se mantiene el encuadre automático al entrar y el límite estricto de la vista completa/proyector.
- Dieciséis secuencias específicas (64 fotogramas) para Trinity y Silverfarben. Se han mantenido los originales y el estilo de sus referencias. [Referencias, archivos y prompts](COMBAT_SPRITE_PROMPTS_2026-10-14.md).
- Reacciones del receptor diferenciadas por golpe físico, fuego y magia arcana. La caída sigue prevaleciendo al quedar derrotado. Los PNJ y Stormwreck conservan sus propias animaciones de reserva; la auditoría las señala como reutilizadas, no como dibujos nuevos.
- Silverfarben usa gestos distintos para Nube de niebla y Caída de pluma, también fuera de combate cuando procede. No se han otorgado poderes nuevos a ninguna ficha.

## Ventanas de dados y Cancelar

La selección/acción pendiente, la iniciativa y los dados tienen un solo propietario visual. Mientras se pide iniciativa o una tirada no se muestra la tarjeta flotante de ataque ni la rueda.

«Cancelar» aparece dentro de la propia ventana de iniciativa/dados si la acción todavía admite cancelación. Se eliminó el botón de minimizar de las ventanas obligatorias. Cancelar un ataque inicial no cancela el combate ni borra una iniciativa ya registrada; tampoco consume acciones ni recursos. Una tirada ya confirmada no se puede borrar para evitar sus consecuencias. Los cambios de estado de la cancelación invalidan también la caché visual de la ventana.

## Verificación

- Comprobación de tipos del cliente y compilación de cliente/servidor.
- Pruebas de geometría de la rueda en esquinas y laterales a 320×568, 390×844, 844×390 y 1680×900; colisiones con navegación y límites de pantalla.
- Pruebas de paginación, línea de turnos, zoom, anclaje y altura de los caídos.
- Auditoría de las dos fichas reales: sin secuencias ausentes; verificación de recortes, alfa, cuatro fotogramas por secuencia y ausencia de gestos genéricos en las acciones mejoradas.
- Comprobación de las acciones básicas de los PNJ de D8 y de Trinity en Stormwreck. Se detectaron y corrigieron las compatibilidades de Ayudar/Influir al introducir nombres semánticos nuevos.
- Prueba específica de ataque inicial cancelado mientras se espera iniciativa: conserva combate, total registrado y recursos. Pruebas de cancelación antes/después de confirmar dados y de propietario único de ventana.
- Integración real de servidor con DM, dos jugadores y proyector: PASS. Iniciativa física, tiradas privadas, daño, reintentos idempotentes y retirada.

Resultados reproducibles: `runtime/combat-tests-20261014.json`, `runtime/combat-cancel-tests-20261014.json` y `runtime/combat-integration-20261014.log`.

Resultado final: suite completa **786/786**; comprobación específica adicional **76/76**, incluida la regresión nueva de cancelar durante iniciativa; integración PASS. Los conjuntos específicos se solapan con la suite general: no se presentan como 862 pruebas distintas.

La versión final se instaló en `dist` después de comprobar que no había una mesa escribiendo guardados. La compilación anterior permanece recuperable en `runtime/previous-build-17650bd3-a1e8-4d40-b416-01b8374dc3ec`. No se borraron partidas ni originales de arte.

## Comprobación visual y límites

Se abrió la versión aislada en el navegador de Codex y se entró con Silverfarben. Se corrigió además el directorio de recursos de la herramienta de revisión para permitir probar compilaciones preparadas sin servir archivos inexistentes. Después el navegador integrado dejó de estar disponible y la conexión alternativa de Chrome agotó sus tiempos de respuesta. **No se da por completada una revisión visual de la línea/rueda durante el combate ni de la última corrección de Cancelar.** La distribución y la cancelación sí están cubiertas por pruebas automáticas; queda pendiente el pase visual final en una sesión estable.

Las pruebas utilizaron carpetas temporales y puertos independientes. No se reinició una mesa abierta ni se modificaron guardados de la partida para realizar duelos.
