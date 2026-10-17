# Auditoría de guardado, carga y actualización — 2026-10-13

Alcance: persistencia compartida de Stormwreck/campamentos y D8; cierre desde
Windows, restauración de copias y compatibilidad tras mejoras. No se reinició
la mesa real del puerto 3000 ni se modificaron sus guardados. No se incorporaron
dependencias ni recursos externos. Las demás mejoras visuales de D8 se están
trabajando en otra sesión y no forman parte de esta auditoría.

## Fallos corregidos

- El lanzador podía terminar a la fuerza una mesa que no confirmaba su guardado.
  Ahora negocia la capacidad de cierre y exige una confirmación después de
  escribir en disco. Si falla, conserva memoria, bloqueo y servidor; se puede
  exportar o reintentar. Un servidor antiguo exige un primer cierre manual.
- El cierre podía omitir segundos de reloj, clima y reproducción porque no
  cambiaba la revisión de juego; también omitía reintentar un error anterior.
  Ahora compara el estado durable y vacía la cola antes de liberar el escritor.
  Las acciones nuevas quedan bloqueadas durante ese cierre.
- Algunas migraciones de escena/geometría no provocaban una escritura inmediata;
  importar una partida podía volver a guardar su payload antiguo. Se detectan
  los cambios, se archivan originales y se escribe la candidata ya adaptada.
- Un active antiguo podía desplazar un historial más reciente. Se elige la copia
  válida más nueva por generación; la recuperación automática se comunica al DM.
- El reloj llenaba los diez puntos de historial en una mesa inactiva. Ahora sus
  copias actualizan active/backup conservando los puntos útiles de juego.
- Una versión anterior podía reinterpretar geometría de un save futuro y volver
  a escribirla con su versión antigua. Se rechazan versiones futuras de campaña,
  rejilla y layout de actores; no se reemplaza la partida por un backup antiguo.
- La actualización reemplazaba archivos activos o cerraba la mesa antes de saber
  si compilaba. Ahora prepara y comprueba el cliente y servidor por separado,
  instala sólo tras cierre confirmado y conserva la compilación anterior. Un
  fallo del segundo movimiento restaura la carpeta anterior si el disco permite
  ese movimiento. INSTALAR bloquea la sustitución de dependencias con mesas vivas.
- Jugador y proyector podían conservar código/catálogo de mapas anteriores al
  reinicio. Ahora recargan tras reconectar a un servidor nuevo; una reconexión
  Wi-Fi al mismo servidor y una restauración del DM no fuerzan esa recarga.
  HTML/catálogo no se cachean; arte y audio con nombres fijos se revalidan.
- La integración D8 detectó descargas HTTP de imágenes/audio pendientes que
  impedían terminar el proceso aunque el guardado ya había finalizado. Tras
  confirmarlo, el cierre termina también esas conexiones antes del reinicio.

## Compatibilidad y límites

Se mantiene el formato de sobre 1; no se exige migración global nueva. Los
campos opcionales de reloj/clima y las migraciones explícitas ya existentes
conservan PG, inventario, progreso y objetos. No se pueden convertir de forma
genérica futuros cambios de IDs, geometría, semillas o reglas: cada cambio
persistente necesita su migración o aumentar la versión incompatible adecuada.

El cierre confirmado protege actualizaciones ordenadas. Cortar alimentación,
matar un proceso o cerrar a la fuerza su ventana puede perder los cambios aún
pendientes; active, backup, historial y archivos privados de recuperación
permiten volver a un punto confirmado, sin prometer recuperación de RAM perdida.
Los ajustes de interfaz siguen en el navegador/dispositivo; una copia de partida
no los exporta y borrar los datos del navegador los elimina.

## Verificación

- Vitest dirigido: **48/48 PASS**, cinco archivos: persistencia 20, protección de
  actualización 10, reloj 8, avisos DM 7 y recarga de clientes 3.
- Pruebas del lanzador/instalación: **6/6 PASS** en Windows con carpetas temporales:
  negociación con servidor antiguo, error final, confirmación válida, instalación,
  rollback del intercambio y rechazo de escritor vivo de otra campaña.
- Integración HTTP/socket Stormwreck: **PASS** en candidata compilada aislada:
  permisos, guardado/carga, solicitudes duplicadas, comandos de runtime antiguo,
  corrupción y fallback, fallo final que mantiene la mesa y progreso al reiniciar.
- Integración HTTP/socket D8: **PASS**, seis mapas, configuración sanitizada,
  tokens y animaciones, 71 assets de audio, revalidación de caché, orientación
  compartida de cámara y cierre/reinicio conservando personajes, escena y objetos.
  La repetición tras cerrar las descargas HTTP ya termina con código 0; la prueba
  Stormwreck se repitió tras esa corrección y también pasa.
- Compilación aislada verificada: **PASS**, chequeo del cliente, Vite con 2.214
  módulos y TypeScript del servidor. Candidata en
  `runtime/prepared-save-audit-checked-20261013/`; `dist` activo intacto.
- La primera compilación aislada completó cliente y servidor. Al activar el nuevo
  chequeo previo se rechazó correctamente una candidata mientras la sesión D8
  estaba a mitad de modificar sus tipos; no se reemplazó la versión activa.

Las pruebas físicas siguientes siguen pendientes:

1. Guardar/exportar desde la mesa habitual, cerrarla manualmente una vez y abrir
   INICIAR con el nuevo contrato de cierre.
2. Cambiar PG, inventario, escena y clima; usar A y comprobarlos tras reinicio.
3. En Pixel 9a y proyector, comprobar recarga, personaje recordado, cuadrícula y
   paneles conservados; preparar audio si lo solicita el navegador.
4. Cancelar y confirmar una restauración desde la interfaz DM y revisar el aviso
   cuando se recupera un respaldo. No provocar fallos de disco en una partida real.
