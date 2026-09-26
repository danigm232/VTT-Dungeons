# Estándar visual vinculante — Pecio Maldito

Registrado el 22/09/2026 por indicación del usuario; aclarado el 25/09/2026. Este es el estándar visual obligatorio para la fase de arte, no una especificación de mapas separados. El runtime vigente es una escena Babylon continua `wreck-ship` con C1–C9, cofa, agua y varias alturas. La maqueta greybox es deliberadamente provisional y **no** es una entrega artística aceptable.

## Referencias de origen

Las referencias permanecen en `C:\Users\User\Desktop\Dungeons\OneDrive_1_12-9-2026\Referencias estilo`; son dirección de arte, no recursos que puedan copiarse como fondos ni como interfaz. Se inspeccionaron seis composiciones distintas (una duplicada bajo otro nombre): pecio diurno, pecio nocturno/tormenta, interior de ruinas, costa y campamento.

| Archivo | SHA-256 |
|---|---|
| `Imagen de Codex 22 sept 2026, 16_17_03-4.png` | `78B2A5767E5C786A9A2BE1048B6C7BEDC0D4FC2FA56892D1F0A594E51186817C` |
| `Imagen de Codex 22 sept 2026, 16_16_55-2.png` | `1699F275F07E8CDC97262F6E231D09508A199BC7B33E7F1DFF1732644B853B20` |
| `Imagen de Codex 22 sept 2026, 16_16_36-4.png` | `7330CB6922CD4BE420F30383DEA33B7256315BC3DA9C1B20EA10FB97184B30E5` |
| `Imagen de Codex 12 sept 2026, 22_44_18.png` | `A261E1555BD967B0F8E7C4E9331C22214A91C3B0ECF3197CB8FE5975B0296596` |
| `Imagen de Codex 12 sept 2026, 22_44_12.png` | `CC68DA32C7411A8CC2874C74AF88F1EB26E169DCE1950F619EA12FF5A9D4F690` |
| `Imagen de Codex 12 sept 2026, 22_43_52.png` | `450DB7EE50674C196A804C3B39A5D9779D8A13F1B9B215C7C19A8FE0456FEC6E` |

El fondo existente [wreck-deck-clean-v3.png](../campaigns/stormwreck-isle/public/art/objects-v3/wreck-deck-clean-v3.png) es una referencia local de calidad pictórica, cámara y composición. No se puede poner como una sola imagen sobre la malla actual: su retícula 32×21 no coincide con el terreno común 56×32 y no representa C1–C9, la cofa, los huecos o las alturas. Se deben reutilizar o recrear elementos como capas/modulares sujetos a coordenadas aprobadas.

## Lo que debe verse

1. Cámara ortográfica 3/4 suave y estable, con inclinación suficiente para leer cubierta, casco, mástil y desniveles; no cenital plana. Sin giro libre ni perspectiva que desacople grid, fichas, puertas o clics. El giro discreto permitido debe conservar controles y cámara en sincronía.
2. Entorno HD-2D ilustrado: casco con volumen y desgaste, tablones irregulares, barandillas, mástiles, cuerda, cajas, agua, espuma, rocas, restos y vegetación cuando corresponda. La cuadrícula de 1,5 m es fina, translúcida y está sobre el mapa; nunca sustituye el mapa.
3. Luz de narración: mar y cielo fríos; faroles, fuego y superficies útiles con luz cálida. Día/noche, C8 húmeda y C9 sumergida son variantes de iluminación/ambiente, no filtros planos que oculten la lectura.
4. Profundidad legible: objetos y fichas se anclan por los pies; muros/mástiles pueden ocluir visualmente sin alterar datos autorizados. Ningún tesoro, criatura, texto secreto, paquete, puerta mutable o trampa se hornea en el fondo.
5. UI discreta: selección, movimiento, alcance, vida y condiciones son overlays claros y temporales. No copiar los títulos, logotipos, textos ni marcos de las imágenes de referencia.

## Base vigente y condiciones de la entrega visual

La base actual es Babylon, un solo mapa lógico 56×32 y superficies compartidas: `main`, `c2`, `c3`, `crow`, `lower-deck`, `hold-air` y `sea` entre otras auxiliares. Las cámaras de DM/proyector y de cada jugador pueden enmarcar alturas distintas sin mover personajes ni convertirlas en mapas o pantallas narrativas separadas. Los meshes de agua, casco, grid, colisiones y puertas son componentes runtime, no fondos planos.

La fase artística se inicia solo después de aceptar el gate de geometría/cámara. Debe producir texturas, objetos y oclusores independientes, organizados por superficie dentro del mapa único, con las anclas y conexiones P01–P19 sin alteración. No producir cuatro fondos/mapas A–D ni hornear criaturas, puertas mutables, tesoros, trampas, textos secretos o talismán. Una prueba debe comprobar cámara, cuadrícula, alturas, pasos, perspectiva de escaleras, personajes delante/detrás de oclusores y foco DM/proyector.

El ambiente de la fase siguiente incluye oleaje/espuma, brisa, velas/cuerdas, agua poco profunda en C8, inmersión oscura en C9 y antorchas apagadas como objetos recogibles. Los efectos son capas automáticas y no alteran suelo, visibilidad autorizada, movimiento ni colisiones. Las acciones del DM y los estados secretos siguen en servidor.
