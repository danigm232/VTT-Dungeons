# Fer — línea base técnica y gate de compatibilidad

Fecha: 2026-09-27. Rama local: `fer/f0-architecture`. Código ejecutado: `dbadd77`, sin cambios de runtime; documentación F0 local adicional. Aplicación: `0.3.2-dev.5`.

## Resultado

**Línea base técnica PASS en este equipo.** Suite: 189 pruebas / 17 archivos; tipos, build y cuatro integraciones terminan con código 0. Esto no acredita aceptación de Dani, M5 visual, M7 físico, FPS ni audio escuchado.

Entorno: Windows x64, Node 24.21.0, pnpm 11.19.0 gestionado por Corepack. Node 20 fue actualizado previamente por petición de Fer. Instalación con `--frozen-lockfile`; package.json y pnpm-lock.yaml permanecen sin modificaciones.

| Comando ejecutado | Resultado observado | Alcance |
|---|---|---|
| `corepack pnpm install --frozen-lockfile` | PASS, 252 paquetes | Dependencias fijadas; esbuild completó postinstall. |
| `corepack pnpm test` | PASS, 189/189, 17 archivos; 12,02 s | Motor, fixtures sintéticas, campañas, terreno, render con NullEngine, objetos y persistencia. |
| `corepack pnpm typecheck` | PASS | TypeScript de cliente y servidor. |
| `corepack pnpm build` | PASS | Audio original, cliente Vite y servidor TypeScript. |
| `node scripts/run-integration.mjs` | PASS | HTTP privado, roles, dos jugadores, llegada/salida, superficies, objetos y cierre de capítulo. |
| `node scripts/run-object-integration.mjs` | PASS | Puerta privada, tres roles, daño/rotura, caja, revisión, deshacer y timón. |
| `node scripts/alpha03-smoke.mjs` | PASS | Acceso privado, guardado idempotente, preview/restore, rechazo de comandos antiguos, reinicio y recuperación. |
| `node scripts/one-shot-smoke.mjs` | PASS | Selección D8, seis mapas, recursos de personajes, guardado privado y directorio aislado. |

La descarga inicial de Corepack falló por la cadena de certificados. Se resolvió en el proceso de instalación con `$env:NODE_USE_SYSTEM_CA='1'`, usando el almacén de confianza de Windows. No se desactivó TLS ni se modificó una configuración global de certificados. El primer intento dentro del aislamiento tampoco podía escribir la caché de Corepack; la instalación se realizó con permisos del usuario fuera de ese aislamiento.

## Aislamiento y límites

Los runners se inspeccionaron antes de ejecutarlos: usan loopback, puertos libres y directorios creados en TEMP. No se abrió el puerto habitual 3000 ni se alteró una partida real. Las cuatro integraciones se ejecutaron en paralelo, cada una con datos y puerto propios. Todos los procesos de comando terminaron con código 0.

La compilación regenera ocho WAV mediante el script existente. La comprobación posterior de Git no encontró cambios en campañas, package.json o pnpm-lock.yaml. Dependencias y dist quedan ignorados por Git.

Vite avisó que `/art/ship/loot-atlas-m5.svg` se resolverá en runtime. El archivo existe bajo `campaigns/stormwreck-isle/public/art/ship/`; `/art` se sirve desde esa carpeta en el servidor. No se ejecutó aquí una inspección visual ni una petición dedicada a esa URL: no se clasifica el aviso como recurso roto ni se certifica su apariencia.

Tamaños observados: `world` 154,00 kB, `pixi-vendor` 557,44 kB y `babylon-vendor` 1.836,72 kB antes de gzip. Vite ya separa vendors. No reutilizar el tamaño histórico de world como si describiera este build. Tamaño de descarga no equivale a FPS o latencia.

## Cobertura que ya podemos reutilizar

| Necesidad de FER-F1-001 | Evidencia ahora ejecutada | Decisión |
|---|---|---|
| Campaña sintética independiente | `engine/server/game.test.ts`: arranque sin encuentro, privacidad por propietario, movimiento, objetos y restauración de combate | Ya existe; no crear otro fixture por defecto. |
| Validación de contratos | Tests de bundles incoherentes en game.test.ts; superficies/transiciones en terrain.test.ts | Reutilizar. Un nuevo rechazo solo requiere test si se demuestra una laguna concreta. |
| Estado durable y recuperación | `engine/server/persistence/persistence.test.ts` y alpha03-smoke.mjs | Cubierto para los escenarios ejercitados; no supone prueba de toda migración posible. |
| Campaña distinta de Stormwreck | one-shot.test.ts y one-shot-smoke.mjs | D8 compila, conserva compatibilidad heredada y arranca con slot separado. |
| Adopción real de Dani | Ninguna observación nueva recibida | PENDIENTE INT0/INT1 y recorrido de Dani; los tests no lo sustituyen. |

La hipótesis de que hacía falta crear pruebas sintéticas desde cero queda descartada. La primera entrega puede ser una receta versionada de comprobación y, después, solo la regresión adicional que exija el ticket compartido. No añadir tests redundantes para justificar una PR ni mover código para fabricar una necesidad.

## Receta para repetir el gate

En una copia aislada, con Node compatible y dependencias instaladas:

```powershell
corepack pnpm test
corepack pnpm typecheck
corepack pnpm build
node scripts/run-integration.mjs
node scripts/run-object-integration.mjs
node scripts/alpha03-smoke.mjs
node scripts/one-shot-smoke.mjs
```

Comprobar el código de salida después de cada comando: detenerse ante un fallo, conservar evidencia y distinguir regresión nueva de fallo previo. Build debe preceder a los scripts que importan dist. No ejecutar `integration-test.mjs` directamente contra una mesa existente: usar el runner que prepara el entorno temporal. Si cambia un runner, volver a revisar su aislamiento.

Esta es la línea base inicial amplia, no una obligación de repetir todo tras cada edición documental. Las próximas PR elegirán pruebas por superficie afectada y conservarán la regresión de los consumidores reales.

## Siguiente paso y estado de coordinación

- Fer: contrastar FER-F1-001 con las necesidades de D0 y delimitar la primera mejora que ahorre trabajo a Dani. Contrato propuesto en [F0](FER_F0_ARCHITECTURE_20260927.md).
- Dani: aportar problema reproducible y recorrido de adopción, sin detener M5/M7 para esperar herramientas futuras.
- No se modificó runtime, no se incorporaron dependencias nuevas al manifiesto ni se aprobaron INT0/INT1.
- La publicación usa la identidad local `Fer (hlwn)` y el correo privado de GitHub derivado del identificador público de la cuenta autenticada `hallow77n`; no cambia la configuración global de Git.

Relevo recomendado: Sol High para el incremento acotado una vez definido; sin cambio automático de modelo. El entorno y la línea base ya están preparados, por lo que no deben repetirse instalación y auditoría completas sin un motivo nuevo.
