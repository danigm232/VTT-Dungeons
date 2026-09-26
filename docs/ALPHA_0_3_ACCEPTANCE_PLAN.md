# Aceptación conjunta Alpha 0.3 — puerta + persistencia

2026-09-15. Plan de pruebas, **no resultados**. Sol ejecuta automatización/navegador y entrega candidata; usuario verifica físicamente al final. No se exige otra pasada física intermedia 0.2.1. Estados y contratos: `ALPHA_0_3_PERSISTENCE_CONTRACT.md`, `ALPHA_0_2_1_DOOR_VISUAL_CONTRACT.md`.

## Matriz técnica obligatoria

| ID | Caso | Resultado exigido / evidencia |
|---|---|---|
| P01 | Round-trip completo en todas las escenas | Timón detached/giro/daño, puerta locked y destruida en casos separados, caja transformada; PG/inventario, criatura visible/oculta/fuera de escena, cámara, ambiente y cinco canales audio. Guardar, parar proceso, iniciar proceso nuevo, comparar payload canónico salvo avance de offset expresamente medido |
| P02 | Guardar durante paso y giro bloqueado | Cargar en destino comprometido y facing final, quieto, sin paso/origen/input; no pierde orientación si intentó andar contra pared |
| P03 | Ephemeral/undo | Reinicio y restore liberan claims, controladores, solicitudes, previews, undo y projectorReady; no SFX/replay; roster disponible; sesiones viejas no toman control automáticamente |
| P04 | Concurrencia/auto | Dos manuales+autosave+movimiento continuo: un escritor, debounce1s/max5s, ninguna pérdida silenciosa; snapshot A termina con dirty si B cambió. Audio solo tiene checkpoint≤30s |
| P05 | Caída real de proceso | Terminación del servidor HIJO antes/después de sync, backup y rename; nuevo proceso carga checkpoint comprometido o recovery explícito. Temporal más nuevo no desplaza active. Recuperar lock según política local; jamás matar mesa del usuario |
| P06 | Fallos de disco inyectados | EPERM/EACCES/EBUSY transitorios y permanentes, ENOSPC/EIO/EROFS en open/write/sync/backup/rename/readback. Reintentos acotados, último archivo válido preservado, mensaje error, memoria jugable y exportable |
| P07 | Migración e incompatibilidad | Fixture0→1 conserva todo excepto camera default; idempotente; checksum válido antes/después; original archivado. Futuro/campaña/stateVersion incompatibles bloquean autosave, sin fallback destructivo |
| P08 | Privacidad/entrada hostil | No secrets vía público/estáticos/errores/logs. Player/Projector/anónimo sin API privada. Origin/CSRF ausentes o ajenos, cuerpos>4MiB, claves duplicadas, prototype pollution, inventario con HTML, IDs/path traversal rechazados o mostrados como texto sin ejecutar |
| P09 | Restore dos fases | Cancelar no muta; TTL/token repetido/otro DM/CAS cambiado/BUSY rechazan. Backup previo incluye memoria sin guardar. Fallo antes de commit mantiene memoria; respuesta perdida tras commit no repite operación |
| P10 | Windows y locks | Ruta con espacios/acentos; directorio sin permisos; Node mínimo y lanzadores; dos procesos distintos puertos mismo DATA_DIR rechazan segundo; lock huérfano requiere recuperación explícita; symlink/junction/estáticos rechazados |
| P11 | Red durante restore | Dos DM, dos players, projector; mensajes viejos hp/audio/sfx/claim/input/ready/objetos y cargas antiguas se rechazan por epoch. Reconexión ve snapshot completo actual sin hoja ni control viejo |
| P12 | Hidratación global | IDs faltantes/duplicados, celda fuera de terreno, tipo/capacidad ilegal, objetos superpuestos, attached+destroyed, PG excesivo: rechazo entero. Actor sobre restos/puerta abierta, puerta destruida con state privado locked y criatura oculta bajo objeto legal: round-trip permitido; puerta rota se publica open sin filtrar locked |
| P13 | Recuperación | Active truncado/backup válido, ambos corruptos, sólo temporal, vacío real y active futuro. No semilla silenciosa. Preservación falla→abortar restore/new. Backup inspeccionable sólo DM |
| P14 | Shutdown/estado visible | Cierre normal flush final y recuperable; timeout10s informa fallo. SAVED incluye generación real; error y dirty no se ocultan por ACK APPLIED o snapshot nuevo |
| P15 | Regresión y arte | Tests anteriores actualizados a protocolo4 sin rebajar assertions; typecheck/build, audits/integraciones; D01–D05 con capturas a escala real y consola limpia. D06 queda al usuario |

Todos los tests usan directorio temporal propio, puerto libre y HOST=127.0.0.1. Probar el formato con bundle sintético Y campaña real inyectada. Test unitario de codec no demuestra reinicio; mock de rename no demuestra reemplazo Windows. No ampliar privilegios de firewall ni abrir puertos del router.

P12 incluye la guarda de reveal descrita en el contrato: criatura oculta debajo de una caja puede guardarse, pero mostrarla se rechaza sólo al DM hasta recolocarla en suelo sin objeto sólido; sin filtración previa ni desplazamiento automático. Incluir puerta rota que conserva locked privado: round-trip exacto y público open.

## Entrega de Sol

1. Implementar ambos contratos íntegros en una candidata identificada `0.3.0-rc.1` (o RC posterior si ese nombre ya existe). Código, pack y build coincidentes; sin pendientes funcionales escondidos tras botones.
2. Tabla de resultados P01–P15/D01–D06 con fecha, versión, comando/pasos, evidencia y límite; no rellenar PASS por existir test. Fallos reales se corrigen dentro de Sol.
3. Backup de código/build/assets/documentación con nombre nuevo y SHA256. Excluir data y archivos privados personales; copia de partida separada, sólo privada. Conservar los ZIP RC2/RC1 originales.
4. README e instrucciones de guardado/restauración, carpeta de datos, copia antes de actualización y recovery lock. No instruir al usuario a borrar `data` ni a sobrescribir su última copia.
5. Entregar al usuario la siguiente checklist, adaptada a etiquetas finales; no pedirla antes de terminar. No cambiar de modelo automáticamente.

## Checklist física final para el usuario (aún no ejecutarla)

- Inicia la nueva candidata y comprueba que DM indica 0.3. Abre jugador y proyector; elige personajes y prepara audio.
- En sala de objetos, abre/cierra la puerta: misma bisagra, tabique y perspectiva vista desde arriba; abierta deja paso, cerrada no, no cierra encima de alguien. Dañada y rota mantienen estilo; rota deja cruzar.
- Mueve/gira caja, separa/gira timón y cambia PG. Cambia de escena y vuelve: objetos siguen como los dejaste. No tiene que aparecer otra rueda.
- Guarda ahora y espera “Guardado”. Cierra normalmente el servidor; inicia otra vez. Reelige personajes y comprueba escena, posiciones, PG/mochila, objetos, criatura según DM, cámara y ambiente. Prepara el audio si lo solicita. Deshacer anterior está vacío por diseño.
- Exporta una copia privada. Haz un cambio; abre Restaurar, comprueba el resumen y cancela: el cambio continúa. Vuelve a restaurar y confirma: vuelve la copia, solicita reasignación y no ejecuta acciones viejas. Conserva el archivo fuera de la carpeta del programa; no compartirlo públicamente.
- Móvil vertical y horizontal: joystick, soltar, mochila, reconectar, rojo en destino ocupado y Escape/cancelar desde DM sin dejar huella. Puerta y controles legibles. El verde de destino válido se comprueba si no se había identificado claramente.
- Indica si el soporte del timón está realmente fuera de su casilla, señalándolo en captura; no hace falta adivinar coordenadas. No repetir pruebas destructivas de disco ni apagado forzado: corresponden a servidores de ensayo de Sol.

La confirmación de rojo/Escape recibida el15/09 ya se registra como PASS físico de esos subcasos en RC1. No convertirla en PASS de todas las orientaciones, destino verde, teléfonos o nueva puerta.
