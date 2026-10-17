# D8 V59 — oclusión continua entre estancias del Templo

14 de octubre de 2026. Cambio local; no publicado en GitHub.

## Causa y corrección

Las piezas de fachada del vestíbulo se etiquetan como parte de esa estancia. Al cruzar a la nave, el corte de paredes solo atendía a la estancia activa y restauraba la fachada exterior delante de la cámara. En `campaigns/one-shot/playground/renderer.ts`, las paredes de envolvente de la nave y el vestíbulo comparten ahora el corte mientras el foco esté dentro de cualquiera de las dos estancias. El cambio se limita al Templo. La ocultación de cubiertas sigue siendo independiente y conserva su comportamiento por estancia; al salir, las fachadas recuperan su opacidad.

La auditoría en `scripts/d8-renderer-audit.ts` comprueba el cruce nave→vestíbulo y vestíbulo→nave, la restauración exterior y el estado de las cubiertas.

## Validación

- Babylon NullEngine: auditoría aprobada. Templo: dos estancias, 18 piezas de cubierta, 78 colisiones, 40 luces locales, tres mapas de sombra, cero límites inválidos y cero elementos suspendidos sin cubrir.
- Paquete Playground V59 generado: payload UTF-8/base64 íntegro, `playground_current.json` idéntico a `playground_v59.json`, fuentes incrustadas coincidentes, imports resueltos y V58 archivada.
- Compilación aislada del VTT aprobada: comprobación TypeScript del cliente, compilación web y TypeScript del servidor.
- No se hizo una inspección visual con GPU ni se generaron capturas; la auditoría NullEngine verifica el estado lógico de la oclusión, no la presentación final en pantalla.

## Activación

La candidata compilada está en `runtime/prepared-v59-temple-cutaway-20261014`. No se sustituyó `dist`: el bloqueo de escritura activo pertenece a otra mesa. El JSON V59 de Playground sí está generado y listo para abrir manualmente.
