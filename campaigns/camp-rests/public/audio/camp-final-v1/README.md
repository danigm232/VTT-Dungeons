# Ambiente costero y truenos

Dos loops originales sintetizados con Node.js; no contienen muestras externas:

- sheltered-drips.wav: gotas y resonancia del abrigo rocoso.
- distant-thunder.wav: ruido filtrado y envolventes lentas de truenos lejanos.

PCM mono, 22050 Hz, 32 segundos. Regeneración:

    node scripts/generate-camp-audio.mjs

El mezclador Howler y la sincronización DM/proyector existentes se conservan.
Los loops se combinan con mar, viento, fuego y ambientes ya disponibles.
