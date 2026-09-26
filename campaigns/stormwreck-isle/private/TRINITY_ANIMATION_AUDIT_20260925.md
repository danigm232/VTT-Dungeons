# Auditoría de animación de Trinity — 25/09/2026

## Integrado

- Reposo normal y reposo de combate.
- Caminar y correr según rumbo. Los atlas direccionales se recortan en runtime en cuatro frames por secuencia; las vistas opuestas se reflejan horizontalmente para cubrir ocho orientaciones.
- Ataque de daga direccional y ataque con arco o daga arrojadiza al ejecutar una acción de combate con esa etiqueta/tipo visual.
- El proyectil de arco/daga mantiene el VFX de vuelo del combate y ahora dispara también la pose correspondiente.
- Reacción al impacto, caída/derribado, arrastre y estado inconsciente. La animación inconsciente no representa muerte confirmada.
- Gesto de conversación/interacción, sigilo, búsqueda/estudio, escalada, natación y salto. Escalada/natación/salto son propuestas al DM; no teletransportan ni sortean el terreno.
- Todas las acciones básicas disponibles en combate ya disparan una pose registrada: Correr usa carrera direccional; Destrabarse un paso según rumbo; Esquivar el ciclo agachado de sigilo; Ayudar/Influir/Utilizar el gesto de interacción; Esconderse/Sigilo el ciclo furtivo; Buscar/Estudiar una inspección; Preparar postura de combate. Acción mágica usa el gesto de activación porque Trinity no tiene conjuros en la ficha.
- El Ataque furtivo exitoso añade un destello de dos cuadros del arte original al impacto; sólo aparece cuando el motor confirma impacto.
- Los botones manuales «Gestos de PNJ» excluyen ahora las ocho variantes direccionales y muestran los gestos de ataque/arco/lanzamiento sin duplicar botones por frame o rumbo.

## Selección incorporada

51 PNG nuevos, tomados sin modificar de `Imagenes VTT/Maria pies ligeros/` y copiados a `campaigns/stormwreck-isle/public/art/m3/trinity/`: los 30 originales de la primera pasada y otros 21 de interacción, sigilo, escalada, natación, salto y Ataque furtivo. La carpeta servida pasa de 14 a 65 PNG. Los atlas de movimiento/daga son 1254×1254; cada celda visual se toma de un rectángulo de 313×580 px, dejando fuera las etiquetas del compuesto. Procedencia adicional: `M3_ASSET_PROVENANCE_20260923.md`.

## Pendiente para otra pasada

- El sigilo está conectado a la acción de petición; queda pendiente el desplazamiento sigiloso persistente y sus variantes direccionales.
- Salto, escalada y natación ya tienen botones/gestos para pedir arbitraje al DM, pero no física, desplazamiento automático ni transiciones de mapa.
- El gesto de interacción está conectado a Hablar/Ayudar/Influir/Utilizar, y Buscar/Estudiar lo reutilizan; no se inventan consecuencias ni CDs.
- Incorporar direcciones específicas para arco/daga arrojadiza si la carpeta fuente incluye vistas adicionales; por ahora se refleja horizontalmente y se conserva la orientación del arte para los demás rumbos.
- La carpeta solo trae una secuencia frontal/lateral para arco y daga arrojadiza, no ocho atlas direccionales como caminar/correr/daga cuerpo a cuerpo. Se conserva el espejo horizontal para esos ataques; la pose no puede orientarse con fidelidad en los ocho rumbos hasta tener arte direccional.
- Distinguir muerte confirmada de inconsciencia en el estado público del personaje antes de usar el arte `maria_muerta.png`.
- Hacer QA visual dentro del mapa con las ocho orientaciones y cada secuencia cuando se ejecute el cliente local.

El perfil de Ataque furtivo existente se representa también con su VFX sólo en un impacto confirmado. El arco consume una flecha y la daga arrojada consume una daga al resolverse el ataque. Las pruebas verifican estados y existencia de cada PNG empleado por las acciones y rumbos direccionales.
