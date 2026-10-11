# Mochila e inventario RPG — auditoría 2026-10-11

## Implementado

- Mochila del jugador: cuadrícula RPG, iconos SVG reutilizables y arte de botín existente cuando corresponde; detalle, cantidades, búsqueda sin dependencia de tildes, filtros y ordenación sin alterar el orden guardado.
- Monedero: suma únicamente entradas de monedas (`23 po`, `5 pp`), nunca el precio de una joya ni de una botella. No se inventan rareza, peso, ranuras equipadas ni bonificaciones.
- Edición solo al pulsar **Editar mochila**. Campos de nombre/descripción y cantidad; añadir/retirar son cambios de borrador hasta **Guardar cambios**. Cerrar con cambios pide conservar o descartar. No se sobrescribe un borrador por una actualización de la partida.
- Guardado protegido por el inventario original: si se gastó munición o llegó botín mientras editabas, el servidor rechaza el reemplazo obsoleto. El borrador permanece y permite descartarlo y recargar explícitamente.
- Usos rápidos fuera de combate: consumen una unidad mediante una operación atómica del servidor. Validación del propietario, objeto e índice; reintentos del mismo identificador no duplican consumos. El cliente espera confirmación y permite reenviar la misma operación si falta la respuesta.
- Antorchas: separar una encendida del stock, publicar inmediatamente su luz y conservarla en el guardado. Apagar retira la fuente usada; no recupera una antorcha nueva. El DM sigue controlando la fuente de fuego y duración: no se ha añadido un reloj de combustible.
- Combate: la mochila muestra un acceso a las acciones, no concede usos libres ni curación automática. Las dagas arrojadas y flechas continúan gastándose en el motor de ataques; las existencias a cero ya no se consideran munición. Encender mediante la acción existente ahora deja también la antorcha encendida que produce luz.
- Los límites de edición coinciden con los guardados existentes: 100 entradas de hasta 200 caracteres. Son límites de registro, no capacidad física de una mochila.
- Se conserva `inventory: string[]` en los guardados. No hay migración destructiva ni cambios en los guardados reales de la mesa.

## Arquitectura reutilizable

- `engine/shared/inventory.ts`: interpretación, categorías, monedero y operaciones sobre cantidades. Conserva descripciones originales cuando no se editan.
- `engine/client/inventory-icons.ts`: iconos locales de resolución independiente.
- `apps/web/ui/inventory.ts` y `apps/web/inventory.css`: panel reutilizable, separado del mapa/HUD y de la hoja.
- `player:inventory`: edición explícita, con `expectedItems` opcional para clientes anteriores.
- `player:inventory-use`: consumo, encendido y apagado; nunca reemplaza toda la mochila desde el cliente.

## Verificación y límites

Las 48 pruebas de inventario, luz y aventura D8 pasaron; también las 3 pruebas del contrato de la interfaz (controles, iconos y conexión del uso atómico). Incluyen interpretación, cantidades, antorchas, moneda, búsqueda, validación, propietario, doble envío, conflicto, restauración y economía de combate en `engine/shared/inventory.test.ts`, `engine/shared/carried-light.test.ts`, `engine/server/inventory.test.ts` y `engine/client/inventory-ui.test.ts`. La suite de la aventura D8 también conserva el gasto de dagas y antorchas.

La revisión general obtuvo 565/567 pruebas correctas. Una prueba antigua de `d8-v48` espera que la puerta del café empiece abierta, pero la definición actual la inicia cerrada. La prueba de animación de campamentos agotó el tiempo durante la ejecución paralela; al repetirla con dos trabajadores pasó. No se cambiaron puertas ni animaciones para silenciar esos resultados.

La compilación de cliente y las comprobaciones de tipos de cliente/servidor pasaron. La revisión visual automatizada quedó pendiente porque Chrome y el navegador integrado no respondieron a la navegación/captura. No se afirma que se haya validado visualmente el resultado.

Vista de revisión ligera (misma plantilla y componente, sin cargar el mapa 3D ni guardar una partida): `scripts/inventory-rpg-review.html`. Puede servirse con `scripts/inventory-rpg-preview.mjs` y abrirse en `http://127.0.0.1:4598/scripts/inventory-rpg-review.html`. Los datos de esa vista son ficticios; sus operaciones están claramente separadas del servidor real.

Para ver la versión en la mesa habitual, volver a iniciar con `INICIAR.cmd`, que recompila interfaz y servidor. No se reinició automáticamente el servidor de la partida abierta.

## Futuras ampliaciones (no implementadas)

Equipamiento con ranuras reales, transferencias entre jugadores, peso/capacidad, propiedades y efectos de objetos estructurados, y efectos automáticos de pociones necesitan datos y reglas persistentes propios; no deben deducirse de un nombre de objeto. La mochila del DM en la hoja sigue siendo una consulta de inventario, no una segunda superficie de edición nueva.
