# Limpieza de la carpeta — 20 de octubre de 2026

Por petición del usuario se retiró material antiguo innecesario conservando al
menos los últimos siete días. Se protegió **todo lo creado o modificado desde
el 13/10/2026 a las 00:00, hora de Madrid**, incluso si solo un descendiente
de una carpeta compilada era reciente.

## Resultado ejecutado

**12.778 archivos retirados en 1.285 destinos, 5.286.632.158 bytes
(5,29 GB / 4,92 GiB), sin errores de borrado.**

| Tipo | Destinos | Tamaño aproximado |
|---|---:|---:|
| Respaldos intermedios sustituidos | 13 | 3.580,6 MiB |
| Capturas antiguas sin referencias | 1.214 | 948,4 MiB |
| Clientes y servidores compilados de prueba | 47 | 207,1 MiB |
| Candidatas o visores temporales | 2 | 243,0 MiB |
| Caché regenerable | 1 | 30,8 MiB |
| Registros y antiguo instalador de Node ya instalado | 8 | 31,7 MiB |

Se conservan los ZIP de Alpha 0.1.1 RC4, Alpha 0.2.0 RC2 final,
Alpha 0.2.1 RC1, Alpha 0.3.0 DEV1, Pecio r32 completo y los parches posteriores
r33–r36. Se comprobó el índice de los cinco hitos principales y se registraron
sus SHA-256. Los recursos de los cinco respaldos grandes sustituidos tienen
correspondencia por ruta en los hitos retenidos o en el proyecto actual.

No se reorganizaron rutas de fuentes, recursos ni documentos existentes. Se
añadieron un mapa de carpetas y guías de acceso a respaldos y galerías. Los
originales del usuario, prototipos, Blender, dependencias, historial Git,
guardados y distribución instalada se conservaron.

## Comprobaciones realizadas

- **60.312 archivos recientes registrados antes de limpiar: cero ausentes.**
- **3.009 archivos de `apps/`, `engine/` y `campaigns/`: mismos SHA-256**
  al finalizar el borrado. Esta comparación corresponde a ese momento; otros
  chats pueden continuar trabajando después.
- **26 comprobaciones aisladas del mantenimiento correctas**, ejecutadas con
  Windows PowerShell: límites del proyecto, fuentes, archivos versionados,
  procesos con rutas absolutas y relativas, junctions, descendientes recientes,
  referencias de imágenes, originales de arte, cambios entre plan y borrado,
  carpetas vacías y repetición de la operación.
- Revisión posterior sin aplicar: **0 bytes adicionales propuestos**.
- Comprobación adicional de los tres JSON de revisión de más de 16 MiB:
  ninguna captura individual retirada figuraba como referencia. Las
  coincidencias con nombres de recursos de la candidata temporal eliminada
  correspondían a copias; los originales permanecen en `campaigns/`.
- Los procesos de la mesa y las candidatas continuaron abiertos. `/dm`,
  `/player`, `/projector` y `/api/info` en el puerto 3000 respondieron **200**.

No se ejecutó una nueva aceptación de mapas, móvil o audio: las comprobaciones
anteriores validan la limpieza y la disponibilidad de las páginas.

## Registros y mantenimiento posterior

Registros locales, excluidos de Git:

- `backups/maintenance-reports/20261020-105322-258/plan.json`
- `backups/maintenance-reports/20261020-105322-258/journal.ndjson`
- `backups/maintenance-reports/20261020-105322-258/result.json`
- `backups/maintenance-reports/audit-20261020/verification.json`
- `backups/maintenance-reports/audit-20261020/kept-backups.json`
- `backups/maintenance-reports/audit-20261020/large-reference-check.json`

El diario conserva la relación de cada archivo antes del borrado y su
confirmación. Es un registro, no una copia del contenido eliminado.

**`MANTENIMIENTO.cmd`** permite revisar o repetir la limpieza. Primero calcula
el plan y antes de cada borrado vuelve a comprobar los límites, las fechas,
los archivos versionados y las rutas explícitas de los procesos. Los originales
de arte dentro de `output/` se excluyen; solo se consideran capturas de áreas
de auditoría reconocidas. El plazo mínimo es siete días y se puede ampliar.

[Guía y criterios de mantenimiento](../WORKSPACE_MAINTENANCE.md).
