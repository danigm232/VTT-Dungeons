# Orden y mantenimiento de la carpeta

**Los archivos necesarios para funcionar se conservan siempre, tengan la
antigüedad que tengan.** El plazo de siete días se aplica únicamente a copias
intermedias, auditorías y residuos prescindibles.

La limpieza conserva **al menos los últimos siete días completos**, contando la
fecha de creación y la de modificación. Una carpeta generada se conserva entera
si algún descendiente es reciente. Los originales y fuentes tienen prioridad
sobre el ahorro de espacio.

## Dónde está cada cosa

| Carpeta | Contenido y tratamiento |
|---|---|
| `apps/`, `engine/`, `campaigns/` | Aplicación, motor, campañas y recursos. Se conservan. |
| `docs/` | Instrucciones vigentes, diseño y evidencias; `docs/archive/` contiene documentación histórica. |
| `data/` | Guardados y recuperación. No se limpia con esta herramienta. |
| `dist/` | Aplicación instalada; puede estar usando el servidor abierto. Se conserva. |
| `runtime/` | Candidatas y compilaciones de revisión. Preparaciones antiguas se pueden retirar; se conservan al menos dos compilaciones anteriores y todas las recientes. |
| `output/` | Capturas, galerías, informes y compilaciones de auditoría. Se conservan las capturas enlazadas y todos los resultados recientes. |
| `backups/` | Hitos recuperables. El registro de mantenimiento está en `backups/maintenance-reports/`. |
| `tmp/` | Pruebas y herramientas locales. Solo se retiran compilaciones reconocidas, registros antiguos y el instalador de Node identificado si Node ya está instalado. |
| `prototypes/` | Fuentes de prototipos y trabajos de Blender. Se conservan. |
| `Imagenes VTT/`, `OneDrive_1_12-9-2026/`, `Reglamento/` | Material original y referencias del usuario. Se conservan. |
| `.git/`, `node_modules/` | Historial y dependencias. Se conservan. |

## Cómo repetir la limpieza

Abre **`MANTENIMIENTO.cmd`** en la raíz:

- **V** muestra la limpieza propuesta sin borrar.
- **L** revisa de nuevo y limpia los residuos permitidos.
- **S** sale.

El mantenimiento no reinicia las mesas. Revisa los procesos abiertos antes de
retirar archivos y excluye sus rutas explícitas. Revalida antigüedad, límites,
enlaces y archivos versionados antes de cada borrado. Las fuentes, los guardados
y la distribución activa quedan fuera de las carpetas permitidas.

Si hay una mesa o servidor de revisión abierto, aplaza además la retirada de
carpetas compiladas y cachés completos. Así también protege las compilaciones
seleccionadas mediante variables de entorno, que no aparecen en la línea de
comandos. Las fechas nunca bastan por sí solas para declarar algo prescindible.

Los informes se guardan con fecha en `backups/maintenance-reports/`: `plan.json`
contiene la propuesta, `journal.ndjson` registra los archivos antes del borrado
y su confirmación, y `result.json` resume lo eliminado y cualquier error.

Para conservar más tiempo, por ejemplo treinta días:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/maintain-workspace.ps1 -KeepDays 30
```

Añadir `-Apply` aplica esa propuesta. La herramienta rechaza plazos inferiores a
siete días. No se ejecuta automáticamente al iniciar ni actualizar la mesa.

## Criterios de conservación

- Las compilaciones antiguas se identifican por su estructura de cliente o
  servidor, no únicamente por llamarse «viejas» o estar en una carpeta temporal.
- Las capturas antiguas de áreas de auditoría reconocidas solo se retiran si no tienen referencias literales en
  documentación, galerías, scripts o datos de revisión. Se mantienen nombres
  ambiguos, carpetas de originales/arte y coincidencias conservadoras por nombre de archivo. Los scripts que
  generaban capturas históricas podrán regenerarlas cuando se vuelvan a usar.
- Los resultados numéricos y los informes históricos se conservan. Sus menciones
  a compilaciones retiradas describen lo ejecutado en aquella fecha; no implican
  que ese ejecutable de prueba siga instalado.
- Los respaldos intermedios de septiembre retirados están enumerados
  expresamente en el script. No se eliminan respaldos nuevos por una regla
  genérica de antigüedad. Los cinco hitos retenidos deben existir y sus ZIP
  deben tener un índice legible antes de retirar los intermedios.
- Se conservan Alpha 0.1.1 RC4, Alpha 0.2.0 RC2 final, Alpha 0.2.1 RC1,
  Alpha 0.3.0 DEV1, Pecio r32 completo y los parches posteriores r33–r36.
- La limpieza no hace seguimiento de enlaces ni junctions ni cambia rutas de
  recursos o documentos. Los destinos se resuelven dentro del proyecto antes
  de borrar con operaciones nativas de PowerShell.

Las comprobaciones aisladas de la herramienta se ejecutan con:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/maintain-workspace.test.ps1
```

Estas comprobaciones validan el mantenimiento, no sustituyen las pruebas de la
mesa, los mapas o los dispositivos físicos.
