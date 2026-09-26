# M2.5 — producción pictórica del Pecio (22–23/09/2026)

Estado actual: **cuatro fondos raster integrados técnicamente** en A–D, sin aceptación física del usuario. El bloque inferior conserva el historial de la primera tanda rechazada; no describe ya el runtime vigente. El plano vinculante sigue en `private/m1a/pecio-master.json` (28×18, 64 px/casilla, origen, puertos y casco compartidos). La mesa habitual y su guardado no se utilizaron en QA; se probó otra instancia con datos aislados.

## Entrega raster integrada · 23/09

Los cuatro fondos finales de trabajo están en `public/art/m25/` y se asignan en `public/wreck-runtime.ts`. Las guías rasterizadas del maestro, los SVG de composición y dos imágenes fuente quedaron en `private/m25/production-sources/`, fuera del servidor estático. Se partió de guías 1536×1024 derivadas de la geometría M1a y se generaron nuevos mapas mediante ImageGen; B recibió además un ajuste vertical determinista con `main-final.svg` para alinear mejor las puertas y el agujero. Los fondos no contienen fichas, puertas móviles, listón, tablón/trampa, contenedores ni cofre.

| Planta | Fondo servido | SHA-256 |
|---|---|---|
| A · superiores | `wreck-upper-m25.png` | `B30F0ABCDCE3D7F2658C219FF122D2328EDC9B0C4647238DAE40D668BF773C2F` |
| B · principal | `wreck-main-m25.png` | `1963F17F87E7CD5C26B96062139F756C1093B61723A1A5D580FE7AB18F289C07` |
| C · inferior | `wreck-lower-m25.png` | `5C7B0DF0DB9B6B4519E9A6DA636C5A4D33A56587A246C3C58970EF157D6277F2` |
| D · bodega | `wreck-hold-m25.png` | `5A1509F3205FB08CA90183E6FF6551CE68662DCD12544CDC0B582A35A470493A` |

Resolución: 1536×1024, escalada con la cuadrícula 28×18 en el renderer. Los prompts precisos de la segunda pasada no se conservaron íntegros en el manifiesto; no se afirma cumplimiento documental de ese criterio. Dirección aplicada: mismo casco y cámara oblicua suave, dos plataformas separadas y cofa aislada en A, cuatro accesos y mástil en B, inundación somera y hueco en C, bodega oscura y brecha de popa en D, mar frío y luces cálidas puntuales, sin secretos ni mutables. Son obras generadas para este proyecto, no CC0 ni arte oficial.

QA en navegador local aislado: se vieron A–D con retícula en DM; B con puerta/listón y tablón runtime, C con tres contenedores, D con cofre, A con dos zonas altas. Se vieron A, B y C con Trinity y arpía/zombi/gul revelados respectivamente en jugador; el gul dio un paso sin perder su imagen. D se comprobó en jugador y proyector (sin retícula). La ocultación/reaparición de arpía actualiza la consola DM sin recarga. Build cliente y servidor, tipos y 104/104 pruebas PASS el 23/09; parálisis DM/jugador comprobada después de la compilación final. Faltan verificación física en pantalla/proyector real, FPS, legibilidad móvil y aprobación artística del usuario. La presentación sigue en Pixi, con un achatamiento vertical 0,82 para A–D; Babylon permanece como geometría de terreno, no se declara una cámara 3D real. Tampoco se afirma paridad de detalle, composición o cámara con `wreck-deck.png`.

## Procedencia y uso

Imágenes nuevas generadas/extendidas mediante la herramienta ImageGen de OpenAI el 22/09/2026, a partir de las referencias visuales aportadas por el usuario (especialmente `Imagen de Codex 22 sept 2026, 16_16_36-4.png`) y de la geometría M1b. La imagen antigua `wreck-deck-clean-v3.png` y la captura esquemática de B se usaron sólo como guías en el primer boceto. No se copiaron como fondo final. No declarar estos archivos CC0 ni atribuirles licencias de terceros. Las entradas son borradores de producción de este proyecto; verificar derechos/condiciones antes de redistribuir.

| Plano | Boceto panorámico 2022×778 (SHA-256) | Extensión 1536×1024 (SHA-256) |
|---|---|---|
| A · superiores | `concepts/wreck-upper-concept-01.png` · `CC9B2D361600F9DD2BC5DCA68BA1C5D61FD00D549A5520E866DBCD57D383343F` | `concepts/wreck-upper-canvas-01.png` · `2B7F3BECE030B394D6B8B1C9C1F1FAE86B4A1E3909B6FFF9B6861BBDBBC1FF82` |
| B · principal | `concepts/wreck-main-concept-02.png` · `8C045D3A52D430F8EE36168C8C8CB93F8C8C6C441F73BCA18C523A4158F93F6C` | `concepts/wreck-main-canvas-01.png` · `CA7936E0E8C8B736BA9C37E08AAA6FE71772DDE0DB0C5AD0434F3C4243CD2D70` |
| C · inferior | `concepts/wreck-lower-concept-01.png` · `836656AEE6B0E0888F31EA0A2CAD6FEE8EEA694BEE94579C9DA26F84155F39B7` | `concepts/wreck-lower-canvas-01.png` · `789D084784BFC721BA3F45E7482E791912E85137160659E6A1E05CD80DAEA62E` |
| D · bodega | `concepts/wreck-hold-concept-01.png` · `621A50877335D26C2D7EFC1BDC36CE7D6D30F4FB5AA112B5E771407E9C874472` | `concepts/wreck-hold-canvas-01.png` · `269E79E433FB56F71080BB17AF52770FB87542646B2E46E0BF3B9AC6DBA816C0` |

Ancestro de B: `concepts/wreck-main-concept-01.png`, 2022×778, SHA-256 `108D443F64C405B4354B0A88C32BF980476D2705FC1E74C3D6B0201097D543D9`. Su prompt exacto no quedó preservado; pedía casco común, cuatro camarotes, abertura central y acabado HD-2D según las tres referencias. Por ello **ninguno de estos bocetos cumple aún el requisito de manifiesto final**; para producción final debe rehacerse B con prompt completo registrado y regenerarse o derivarse coherentemente la familia.

## Composición que debe gobernar la siguiente pasada

| Plano | Casco/suelo/agua | Oclusores y huecos fijos | Anclas y exclusiones |
|---|---|---|---|
| A | Plataformas elevadas C3 a la izquierda y C2 a la derecha, mar/exterior alrededor; vacío central **no transitable**. | Cuatro escaleras P02–P05; cofa aislada sobre mástil, acceso P10; no puente central. | Montura de rueda C3 (6,9) sin rueda; balista arruinada fija en C2. No tesoro, arpías ni bote mutable horneados. |
| B | Cubierta principal continua C1 con camarotes C4/C5 a izquierda y C6/C7 a derecha; mismos bordes de casco. | Cuatro accesos desde C1 en P06–P09; escotilla/escalera P11/P12; agujero C4 en (5,6); base del mástil C1 en (14,9). | Puerta/listón C4, tablón C6, botín, rueda, criaturas y textos secretos siempre runtime. |
| C | Una cubierta C8, agua somera de 15–45 cm y terreno difícil; no compartimentos nuevos. | Agujero (5,6) alineado con B/D; escalera P11/P15 y bajada P14; soportes fijos sin cerrar rutas. | Tres contenedores C8, zombis y gul runtime; no cajas saqueables pintadas. |
| D | Bodega C9 sumergida, sin sol y con suelos/escombros legibles. | Agujero (5,6); acceso P15; brecha submarina de popa P16 en (1,10–11). | Cofre/paquete/botín/actores runtime; no cofre ni fuentes de luz inventadas en imagen. |

## QA visual y bloqueos reales

- Las cuatro extensiones 1536×1024 poseen un idioma visual común. Se vieron en navegador **sólo en DM** con grid en instancia local aislada (puerto 3100, guardado de QA separado) el 22/09. No se probaron fichas/clics ni jugador/proyector. **No son fondos finales**.
- La generación conserva la silueta general, pero falla el gate geométrico: A deja casillas transitables C2/C3 sobre el vacío ilustrado cerca de los bordes interiores; C presenta la abertura central demasiado alta respecto al acceso; D dibuja el agujero izquierdo desplazado y la abertura central no es inequívoca. B tiene accesos de camarotes ambiguos. La cámara del runtime sigue siendo Pixi casi cenital (`scaleY=0.92*scaleX`), aunque la pintura sugiera algo de volumen. El master y los puertos tienen prioridad sobre la ilustración.
- La extensión vertical a 3:2 es un paso de composición; aún no es el lienzo maestro 1792×1152. La correspondencia propuesta para QA es escala uniforme `1792/1536`, recortando ~22 px arriba y abajo. No aplicar al runtime sin aprobar visualmente todas las anclas y recorridos.
- `wreck-main-qa.svg` es una superposición privada de prueba con casco, retícula y anclas. La revisión por navegador de archivo local fue bloqueada por la política de seguridad del navegador; no se intentó sortearla. No se declara inspección superpuesta realizada.
- La herramienta de generación no acepta el SVG maestro como imagen de referencia (`unsupported image/svg+xml`). Una nueva pasada tendrá que partir de una referencia raster del plano obtenida por un flujo permitido, o componer las superficies con máscaras geométricas exactas; una descripción textual sola no certifica las casillas.
- Se conectaron provisionalmente copias públicas A–D y se revisaron en DM con una instancia de QA aislada. Al confirmar desalineaciones se retiraron del runtime y se eliminaron esas cuatro copias públicas; los originales privados permanecen intactos. `wreck-runtime.ts` conserva los fondos SVG M1b y no hay cambio de versión publicada. La mesa de producción ya abierta y su guardado no se tocaron.
- El arranque ordinario del sandbox dio `uv_os_get_passwd returned ENOMEM`; se resolvió para QA con una instancia local aislada fuera de ese sandbox. La compilación de Vite quedó detenida en `transforming` y se interrumpió; build no aprobado. `npm run typecheck` PASS; `npm test` PASS 98/98 después de corregir en `game.test.ts` el `io.close()` asíncrono sobre un servidor sintético que nunca escuchaba. La primera corrida pasó las 98 aserciones pero terminó con ese rechazo no manejado.
- Necesario antes de publicar: corregir/renderizar sobre el plano exacto, certificar P01–P16 y C4/C6/C8/C9, verificar DM/jugador/proyector en navegador, luego prueba física separada. Conservar Pixi temporal mientras esa validación falte.

## Prompts de las extensiones 3:2 (literal)

### A

> OUTPAINT this existing wide hand-painted UPPER DECK ship battle map to a NEW 3:2 LANDSCAPE canvas. Preserve its entire two separated raised platforms, central open void, isolated crow's-nest mast, all four stair landings, ruined right ballista and left empty wheel mount AS-IS, no crop, no ship distortion, no camera change, no extra walkable bridge. Scale the original uniformly. Extend only the environment ABOVE and BELOW with matching detailed cold teal sea, white foam, black rocks, bleached rib bones and broken floating timbers, seamlessly continuing the existing surroundings. Ship should be centered horizontally and occupy roughly 92% of new canvas width and middle 46% of height, leaving broad sea margins above and below, for 28x18 tactical canvas. No text, UI, tokens, grid, treasure, creatures, chests, boxes, wheel, or extra rooms. Gentle near-overhead 3/4 and rich painterly HD-2D quality. Choose landscape 3:2 output.

### B

> OUTPAINT this existing wide 2022x778 hand-painted main-deck ship battle map to a NEW 3:2 LANDSCAPE canvas. Preserve the entire existing ship and all its details AS-IS with no crop, no distortion, no camera angle change, no extra rooms or objects; scale the original uniformly so the hull retains its proportions. Extend only the environment ABOVE and BELOW with matching detailed cold teal sea, white foam, black rocks and bleached bones, seamlessly continuing the existing shoreline. The ship should be centered horizontally and occupy roughly 92% of the new canvas width but only the middle 46% of its height, leaving broad visible sea margin above and below, analogous to a 28 columns by 18 rows tactical canvas. Keep four side cabins, central walkway, center open hatch and mast base. Ensure no new text, UI, tokens, grid, doors, treasure, crates, creatures or wheel. This is a 3:2 full-map composition, not the original panoramic strip. If aspect output choices exist, choose landscape 3:2. Rich detailed painterly HD-2D, gentle near-overhead 3/4.

### C

> OUTPAINT this existing wide hand-painted LOWER INTERIOR DECK C8 battle map to a NEW 3:2 LANDSCAPE canvas, SAME tactical datum. Preserve the entire existing flooded hull and all interior wood details AS-IS, no crop, no ship distortion, no camera change, no extra compartments or cargo. Scale the original uniformly, center horizontally, hull occupies about 92% of new canvas width and middle 46% of height. Extend only above and below with matching very dark flooded interior negative space: shadowed ceiling timbers and water-stained wood above; dark lower hull and cold blue-black water below, seamlessly matching the original. No sea/sky/horizon outside the hold. Keep shallow floodwater readable, central open stair shaft, supports and open walkways. No text, UI, tokens, grid, boxes, crates, barrels, chests, loot, creatures, doors or treasure. Gentle near-overhead 3/4 hand-painted HD-2D. Choose landscape 3:2 output.

### D

> OUTPAINT this existing wide hand-painted FULLY SUBMERGED HOLD C9 ship battle map to a NEW 3:2 LANDSCAPE canvas, SAME tactical datum. Preserve the entire existing dark underwater ruined hull, jagged LEFT stern breach, central open shaft and all interior timbers AS-IS, no crop, no ship distortion, no camera change, no chest or extra compartments. Scale original uniformly, center horizontally, hull occupies about 92% of new canvas width and middle 46% of height. Extend only above and below with matching murky cold blue-black seawater, silhouettes of rock and submerged wreck timbers, silt and faint particles, seamlessly continuing the original. NO sunlight, lantern glow or bright magic; DM can still read walkable/swimmable surfaces. No sky, horizon, text, UI, tokens, grid, loot, chests, treasure, packages, books, boxes, creatures or new doors. Gentle near-overhead 3/4, rich painterly HD-2D. Choose landscape 3:2 output.
