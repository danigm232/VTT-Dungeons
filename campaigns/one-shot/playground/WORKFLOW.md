# D8 Night Playground — procedimiento de trabajo

Este documento define **cómo debe trabajar cualquier chat/agente** sobre esta carpeta.

> Regla principal: **no confiar en el historial del chat para saber la versión actual**. Antes de hacer cambios, leer siempre el estado real de GitHub.

## 1. Carpeta de trabajo

Repositorio:

`danigm232/VTT-Dungeons`

Ruta:

`campaigns/one-shot/playground/`

## 2. Fuente maestra

Solo son fuente maestra:

- `index.ts` — punto de entrada Babylon Playground.
- `renderer.ts` — motor, builders, render, VFX e interacción ambiental; también lo usa el VTT.
- `d8night.config.ts` — configuración de mapas, `CANON`, `VTT_AMBIENCE`, navegación y composición.
- `VERSION` — número activo.
- `generate-playground-json.mjs` — generador oficial.

Los archivos `playground_*.json` son **artefactos generados**. No deben editarse como fuente.

## 3. Arranque obligatorio de cualquier sesión

Antes de modificar nada:

1. Leer `VERSION`.
2. Leer `D8_VERSION` en `d8night.config.ts`.
3. Comprobar que ambos representan la misma versión.
4. Leer `playground_current.json`.
5. Localizar `playground_vN.json` para la versión activa.
6. Confirmar que `playground_current.json` y `playground_vN.json` son byte a byte idénticos.
7. Decodificar/validar el payload:
   - `payload.code`;
   - `payload.unicode`;
   - `payload.unicode === base64(UTF-8(payload.code))`.
8. Confirmar que `index.ts`, `renderer.ts` y `d8night.config.ts` incrustados en el payload coinciden exactamente con sus fuentes.
9. Revisar `historico/` y confirmar que la versión anterior está archivada.

Si algo no coincide, **corregir primero el versionado/generación y después tocar el mapa**.

## 4. Archivo que usa Babylon

Para pruebas manuales cargar siempre:

`playground_current.json`

`playground_vN.json` es el snapshot numerado de esa misma build.

Nunca elegir entre dos snapshots "a ojo". Si existen dos versiones activas en la raíz, hay un problema de publicación que debe corregirse.

## 5. Flujo de modificación

Para una nueva versión:

1. Auditar el mapa actual en las fuentes reales.
2. Identificar la causa del problema antes de añadir más geometría.
3. Modificar `renderer.ts` y/o `d8night.config.ts`; mantener `index.ts` como el wrapper de Playground.
4. Incrementar `VERSION`.
5. Cambiar `D8_VERSION` al mismo valor.
6. Generar los JSON con `generate-playground-json.mjs`.
7. Verificar:
   - `current == vN`;
   - `code == decoded(unicode)`;
   - fuentes incrustadas == fuentes reales;
   - versión anterior en `historico/`;
   - solo la versión activa numerada permanece en la raíz.
8. El usuario prueba `playground_current.json` en Babylon.
9. Auditar las capturas y corregir sobre esa versión.

Los cambios solo de documentación (`README.md`, este archivo, notas) **no requieren subir VERSION**.

## 6. Disciplina al escribir en GitHub

- Leer el SHA fresco del archivo justo antes de actualizarlo.
- Si GitHub devuelve 409, SHA inválido o una operación parcial:
  1. no asumir qué se guardó;
  2. volver a leer el estado real de `main`;
  3. continuar desde ese estado.
- No sobrescribir usando un SHA antiguo.
- Tras varias escrituras, volver a leer los archivos importantes y auditar el resultado final.

## 7. Si no se puede ejecutar el generador

El generador oficial sigue siendo la referencia.

Solo como fallback, si el entorno conectado a GitHub no puede ejecutar Node, se puede reconstruir el JSON **reproduciendo exactamente** `generate-playground-json.mjs` desde las fuentes más recientes. Después son obligatorias todas estas validaciones:

- mismo manifest;
- mismo `payload.code`;
- `payload.unicode = base64 UTF-8(payload.code)`;
- `current` y snapshot numerado idénticos;
   - `index.ts`, `renderer.ts` y `d8night.config.ts` incrustados idénticos a sus fuentes.

Nunca parchear a mano un JSON generado.

## 8. CANON y VTT_AMBIENCE

Mantener siempre separados:

### CANON

Contenido narrativo/mecánico respaldado por la aventura.

No alterar:
- consecuencias;
- CD;
- estructura narrativa;
- objetos o criaturas canónicas;
- decisiones relevantes del DM.

### VTT_AMBIENCE

Puede añadir:
- geometría de soporte;
- materiales;
- iluminación;
- VFX;
- SFX/música;
- vegetación;
- props ambientales;
- cámara;
- partículas;
- animaciones ambientales.

No debe cambiar la historia.

## 9. Dirección visual

El objetivo es un **VTT 2.5D/isométrico nativo de Babylon**, no un fondo PNG pegado.

Prioridades:

- lectura táctica clara;
- suelo visible;
- arquitectura legible;
- materiales diferenciados;
- profundidad mediante luz, sombra y AO;
- props suficientes, no ruido;
- VFX sutiles;
- buen rendimiento.

Las imágenes de referencia sirven para composición, densidad, paleta y atmósfera. No deben convertirse automáticamente en fondos de escena.

## 10. Cómo auditar capturas

Cuando el usuario entregue capturas:

1. Comparar lo que realmente se ve con el objetivo.
2. Separar:
   - error técnico;
   - error de composición;
   - error de material;
   - error de cámara;
   - falta de contenido;
   - exceso de contenido.
3. Buscar primero la **causa raíz**.
4. No añadir props para esconder un fallo estructural.
5. Mantener lo que ya funciona.
6. Si una versión introduce una regresión, corregirla antes de continuar.

## 11. Regla de complejidad

Antes de añadir más sistemas:

- reutilizar builders existentes;
- evitar un builder casi idéntico por versión;
- evitar nombres de versiones antiguas en meshes/materiales activos cuando generen confusión;
- no duplicar la misma escena en config y código sin documentarlo.

## 12. Excepción actual: TABERNA

El mapa cuyo id es `cafe` se muestra como **TABERNA** y actualmente usa:

`renderMode: "tavern_v34"`

Su render pasa por `buildTavernV34(c)` y **no por el flujo genérico `c.MAP.objects.forEach(asset)`**.

Consecuencia importante:

- `MAP.objects` conserva datos de diseño/navegación y parte de la intención de la escena;
- la geometría efectiva de la taberna se construye en `buildTavernV34`;
- cualquier cambio visual de la taberna debe auditar ambos sitios y mantenerlos coherentes.

En V34:
- no hay piscinas interiores;
- el agua interior fue retirada;
- existe un abrevadero exterior para monturas;
- hay poste de amarre, heno y patio exterior.

Si en el futuro se elimina este renderMode dedicado, migrar la geometría a un único sistema y borrar esta excepción.

## 13. Temple

Temple usa el flujo genérico de assets.

Al modificarlo:

- conservar puente → escaleras → acceso → recinto;
- mantener los muros como cutaway legible para cámara isométrica;
- no volver a introducir bandas/listones que crucen visualmente el mapa;
- evitar rejillas geométricas agresivas en el suelo;
- usar materiales de piedra para la lectura del pavimento;
- conservar claridad de movimiento pese al mobiliario.

## 14. Principios del VTT

D&D sigue siendo juego de mesa:

- no tirar dados automáticamente;
- no decidir éxito/fallo automáticamente;
- no interpretar la intención del jugador;
- el DM confirma bifurcaciones importantes.

El VTT sí puede automatizar ambiente, luces, VFX, idle, cambios evidentes y presentación.

Objetivo normal: **2–5 interacciones del DM por escena**, aparte de combate y tiradas.

## 15. Checklist final obligatorio

Antes de decir que una versión está terminada:

- [ ] `VERSION = N`
- [ ] `D8_VERSION = "VN"`
- [ ] fuentes sin referencias funcionales accidentales a la versión anterior
- [ ] llaves/estructura de TS coherentes
- [ ] `playground_current.json == playground_vN.json`
- [ ] `payload.code == decoded(payload.unicode)`
- [ ] wrapper y `renderer.ts` incrustados == fuentes actuales
- [ ] versión anterior archivada
- [ ] versión activa única en raíz
- [ ] mapa objetivo carga según su renderMode
- [ ] suelo visible
- [ ] cámara correcta
- [ ] navegación/interacciones no rotas
- [ ] no se ha convertido el VTT en un videojuego automático

## 16. Regla para chats futuros

Si el usuario dice "continúa", "audita", "siguiente versión" o similar:

**primero leer GitHub y este documento; después actuar.**

No pedir al usuario que copie `index.ts` o `d8night.config.ts` si el conector de GitHub está disponible.
No devolver un prompt cuando el usuario ha pedido ejecutar directamente los cambios.
