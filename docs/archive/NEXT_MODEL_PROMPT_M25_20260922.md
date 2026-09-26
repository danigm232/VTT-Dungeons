# Próximo encargo — Sol High, M2.5: recuperación visual del Pecio

Preparado el 22/09/2026 tras una revisión visual del usuario. Trabaja en `C:\Users\User\Desktop\Dungeons`. No uses subagentes ni cambies el modelo automáticamente. Objetivo único: recuperar la composición visible del Pecio y preparar fondos HD-2D de calidad acorde con el estándar fijado por el usuario. **No prepares actores M3, no programes encuentros, reglas, IA, botín, canto, parálisis ni triggers narrativos.**

## Situación real que debes corregir

- Hay una primera tanda de estudios pictóricos A–D y cuatro extensiones 3:2 **privadas, no integradas** en `campaigns/stormwreck-isle/private/m25/`; lee entero `ART_WORKLOG.md` antes de regenerar nada. Se probaron provisionalmente en DM con grid y guardado aislados: A dibuja vacío bajo casillas transitables, C/D tienen huecos desplazados y B conserva accesos ambiguos. Por ello se retiraron de runtime; no deben asignarse directamente como backgrounds de juego. ImageGen no acepta directamente los SVG maestros, así que prepara una referencia raster autorizada o composición con máscaras geométricas exactas. No repetir la fase de moodboard como si no existiera: corregir geometría y cámara, probar fichas/clics y jugador/proyector.
- Candidata técnica `0.3.2-dev.2`, protocolo19 y SaveV1/campaignStateVersion1. M1/M2 preservan recorridos A–D, P01–P16 y estados C4/C6/C8/C9; no se deben rediseñar ni romper.
- La primera presentación Babylon de A–D ocultaba el `background` Pixi y sólo dejaba una malla inclinada de tiles planos. Técnicamente probaba superficies, pero es una regresión de producto: no muestra el Pecio.
- Mientras se corrige, A–D usan presentación Pixi para mostrar las capas tácticas, fichas y objetos alineados. `terrain` Babylon queda como dato de superficie/altura/puertos, no se borra ni se falsifica.
- Copia recuperable vigente: `backups/pecio-m25-0.3.2-dev2-20260922.zip`, SHA-256 `B8E6129D78322E4157BBA3920040D0216F8C66949430A65776D3EFF9404CF96B`; contiene material privado y no debe publicarse.
- La cubierta antigua `public/art/objects-v3/wreck-deck-clean-v3.png` tiene el nivel pictórico deseado, pero usa otra retícula (32×21) y no sustituye los mapas maestros 28×18 A–D. No la estires ni la asignes arbitrariamente a una planta.

## Dirección visual obligatoria

Lee entero `docs/PECIO_VISUAL_STANDARD_20260922.md`, `docs/HD2D_DIRECTION.md`, `campaigns/stormwreck-isle/private/PECIO_SPATIAL_PLAN.md` y `private/m1a/pecio-master.json` antes de tocar arte o renderer. Las seis imágenes de referencia se encuentran en `C:\Users\User\Desktop\Dungeons\OneDrive_1_12-9-2026\Referencias estilo`; hashes y límites están en el estándar. Son referencia de estilo, no assets reutilizables ni plantillas de UI.

El objetivo es un mapa táctico HD-2D ilustrado, cenital-oblicuo suave y estable: casco/madera/barandillas/mástiles/cuerdas/agua/espuma/rocas/escombros con materia y profundidad; luz cálida puntual sobre ambiente marino frío; cuadrícula 1,5m tenue por encima; tokens anclados por sus pies. No una plataforma isométrica vacía, no un SVG esquemático como acabado y no texto, logotipo, paneles o personajes copiados de la referencia.

## Trabajo

1. Verifica primero que A–D enseñan el fondo, grid, ficha y props en DM/jugador/proyector, y que clics, puertos y coordenadas siguen alineados. Esta es una corrección visible inmediata, no aceptación final.
2. Mantén un solo plano maestro 28×18. Para cada fondo final A/B/C/D, prepara una ficha de composición: borde de casco, suelos, muros/oclusores fijos, agua, huecos, escaleras y anclas. C4/C8/C9 permanecen alineados en (5,6); P01–P16 nunca se desplazan para acomodar una imagen bonita.
3. Produce arte raster nuevo o editado sólo mediante el flujo de generación/edición autorizado y con revisión visual de cada resultado. No sustituyas esto con un SVG minimalista. Conserva fuente, prompt, hash, licencia/procedencia, resolución y relación con el mapa maestro en manifiesto privado.
4. No hornees en los fondos puerta/listón, tablón/trampa, cajas, cofre/paquete, rueda, tesoro, criaturas, textos secretos, botín ni posiciones de encuentro. Todos son entidades runtime existentes.
5. Antes de reactivar Babylon para una planta, implementa y prueba la composición completa: fondo HD-2D, cámara estable equivalente, cuadrícula, props y sprites proyectados/anclados de forma coherente. Si Babylon no muestra esa composición mejor que Pixi, conservar Pixi para esa planta: el motor no es un objetivo visual por sí mismo.
6. Documenta qué se vio realmente en navegador y qué requiere decisión física del usuario (legibilidad a distancia, móvil, proyector, FPS y perspectiva). No declares aceptación.

## Criterios de salida

- Ninguna vista de A–D deja una malla o lienzo vacío donde debería estar el mapa.
- Fondo, grid y fichas comparten coordenadas en las cuatro plantas; C4/C6/C8/C9 siguen siendo objetos runtime y sus secretos no llegan antes de autorización.
- Cada fondo final cumple el estándar pictórico y la cámara no se siente más inclinada que las referencias ni oculta el espacio táctico.
- Pruebas de tipos, regresión y build pasan cuando se cambie runtime; navegador local de DM/jugador/proyector sin errores. Prueba física se registra por separado.
- Se deja un único relevo para **Terra High, M3a** sólo cuando el estándar visual esté probado: preparar ciclos zombi/arpía/gul sin tocar mapas ni encuentros.
