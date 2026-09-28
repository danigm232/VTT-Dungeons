# Campamentos y descansos · escenas de Stormwreck

Este paquete fuente aporta cinco escenas de descanso que ahora se integran en la campaña **Los Dragones de la Isla de las Tempestades**. Comparten el roster, el ambiente, el sistema de descanso y el slot de guardado `stormwreck-isle`; no son una campaña aparte. La escena A1 contiene solo sus seis habitaciones; no incorpora el monasterio.

## Escenas

| Escena | Contenido |
| --- | --- |
| Habitaciones A1 | Seis celdas en una sola línea, con entradas abiertas al camino. Las cuatro primeras tienen cama y mobiliario; las dos últimas ofrecen ocho hamacas para los kobolds. Es una representación autónoma, sin el resto del monasterio. |
| Bosque camino a Pleamar | Claro, tres tiendas amplias asignadas a los personajes, arroyo, vegetación y niebla. Dos animales Quaternius CC0 cruzan ocasionalmente la arboleda del fondo; no son tokens ni interactuables. |
| Playa del pecio | Costa rocosa, rompiente, restos y bote; separada del mapa del pecio, con tiendas dentro del abrigo rocoso. |
| Acantilados del Observatorio | Meseta de basalto, tiendas al abrigo de las rocas, fuego, cristales y aurora arcana. |
| Refugio costero de Pleamar | Abrigo rocoso, tiendas, hoguera y pozas; no es B6. |

Los cuatro campamentos exteriores están marcados `VTT_AMBIENCE`: el DM decide si el lugar permite descansar. Esa decisión no se infiere del mapa.

## Uso

Inicia [INICIAR.cmd](../../INICIAR.cmd) y elige **Los Dragones de la Isla de las Tempestades**. En la consola DM, abre «Escena, cámara y mapa» y elige la categoría **Campamentos y descansos**. Los cinco mapas conservan sus límites, movimiento, cuadrícula de 1,5 m, colisiones, tokens y cámaras; cambiar de mapa desde ese selector mueve al grupo a los puntos de aparición de la localización elegida.

El valor heredado `DUNGEONS_CAMPAIGN=camp-rests` se acepta como alias de arranque de Stormwreck. Los guardados antiguos que sigan en `data/saves/camp-rests/` no se borran ni se mezclan automáticamente; el nuevo juego unificado guarda en `data/saves/stormwreck-isle/`.

La consola del DM prepara el descanso, lo avanza por llegada, anochecer, noche y amanecer, registra interrupciones y deja al DM confirmar si termina. No lanza dados, decide encuentros ni restaura puntos de golpe o recursos. Los personajes realizan sus propias interacciones desde el panel «A tu alrededor» al acercarse a camas, tiendas, baúles, objetos personales, hogueras, asientos o puestos de guardia.

En cada campamento exterior, Mike tiene un atril y libro de conjuros, Mia un rincón de oración y Trinity un estuche de herramientas. Sus acciones describen el uso, pero no modifican automáticamente inventario, pruebas, conjuros ni beneficios de descanso. Cada personaje solo puede abrir su propio baúl.

## Entregas y verificación

**V1.3:** escenas navegables, puertas y obstáculos con colisión, puntos interactivos por proximidad y estado del descanso persistente.

**V1.4:** A1 mantiene luz cálida; las escenas exteriores pasan gradualmente de llegada a noche y amanecer. El bosque suma niebla variable, movimiento localizado de copas y helechos, y sombras geométricas ligeras. La playa gana oleaje y espuma más rápidos; el observatorio anima aurora, nubes y destellos; el refugio anima pozas y goteos. Los perfiles de audio existentes se activan al cambiar de escena: bosque nocturno, mar y viento, truenos lejanos y oleaje amortiguado. Si el dispositivo pide movimiento reducido, se apagan los destellos y se atenúan las animaciones.

La fauna del bosque se carga bajo demanda al abrir esa escena. Alterna ciervo y venado en breves apariciones separadas, siempre en la línea arbolada al fondo; usa Idle, Idle_Headlow y Walk. No afecta a colisiones, interacciones, combate ni al estado del descanso. Procedencia y archivos CC0: `public/art/forest-fauna-v1/README.md`.

El decorado se carga de forma diferida, agrupa geometría estática, evita mapas de sombra en tiempo real y mantiene menos de 128 mallas por escena. La deformación del agua se limita a unas 22 actualizaciones por segundo. En pantallas compactas/táctiles la escala de render del terreno pasa a 1,35; PC y proyector conservan escala 1. El bloque independiente de ambientación es de 35,8 kB (12,48 kB comprimido); el bloque compartido `world` mide 1,62 MB (425,75 kB comprimido).

Verificación automatizada: 153/153 pruebas, tipos cliente y servidor, compilación de producción del cliente, las cinco escenas construidas y animadas en Babylon NullEngine, y presupuesto de mallas por escena. La compilación advierte que el bloque compartido `world` supera 500 kB, aunque los efectos de campamento siguen en un bloque diferido. No se hizo una inspección visual en pantalla, teléfono o proyector físicos; el ajuste final de presentación queda pendiente de una revisión manual.
