# Espejo · caverna helada

Audio original sintetizado con `scripts/generate-mirror-cave-audio.mjs`, iniciado el 20 y verificado el 21/10/2026. Sin muestras externas ni descargas. La síntesis de gotas adapta la idea del generador original de goteos del abrigo de este proyecto (`scripts/generate-camp-audio.mjs`). No se declara CC0 ni audio oficial de Octopath.

- `chamber-air.wav`: rumor grave de interior, 34,5 s, bucle con unión cruzada.
- `cave-drop-a.wav` / `cave-drop-b.wav`: una gota y sus ecos suaves, 2,8 s, dos tonos.
- `ice-settle.wav`: asentamiento breve de hielo, 3,6 s.

PCM mono, 22050 Hz, 16 bits. Medidas de pico/RMS en `analysis.json`. Música a 0,13 y rumor a 0,14. Una incidencia cada 32–58 s, con selección ponderada 5:1 entre gotas y crujido; una gota concreta puede tardar más si se elige el crujido. Ganancias de gotas 0,14–0,16 y crujido 0,085. Pausado en combate, activación del espejo, salida por la galería, silencio de mezclador, desconexión y cambio de mapa. Se conserva la salida de audio seleccionada por la mesa.

La grabación del navegador y las medidas no sustituyen la escucha física con las voces y el altavoz del proyector.
