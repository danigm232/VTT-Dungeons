import type { AdventureDefinition } from '../../engine/shared/adventure.js';

/** DM-only summaries of the user's private module (physical pages 4–10).
 * This is pack data; the shared evaluator knows no D8 names or endings. */
export const d8Adventure: AdventureDefinition = {
  sceneGuidance: {
    temple: ['Rosa, vino y filete o vaca: cualquier orden; devuelve cada componente al templo. El espejo se busca al final.', 'Antes de comenzar el día, pulsa Guardar y conserva un punto de carga o una exportación. Si la derrota o abandonar el pueblo activa el bucle temporal, carga ese punto; usa Nueva partida solo si quieres reiniciar todo, tras confirmarlo. No hay reinicio destructivo automático ni es una regla general de muerte.', 'Si rechaza la misión: Anteros ataca durante tres rondas. Si sobrevive, registra el final 3 con motivo de excepción.'],
    garden: ['Revela tantas rosas como indique el d6 físico. Tocarlas directamente causa 1 perforante; un ataque con arma no equivale a tocarlas. Enredar termina al destruir su rosa de origen.'],
    cafe: ['Si provoca una pelea, introduce el d10 físico para revelar parroquianos hostiles. Los tres PNJ de conversación no se vuelven hostiles automáticamente.'],
    market: ['El componente puede ser filete o vaca viva. Registra diagnóstico y poción, compra o robo según la decisión de la mesa.'],
    mirror: ['El hielo blanco cuesta el doble de movimiento; el azul es frágil. El DM identifica la zona peligrosa antes de aplicar sus consecuencias, no por el color de una sombra.', 'Si queda derribada en hielo frágil: TS Destreza CD 15 para no caer a través. Inconsciente: falla automáticamente. El DM resuelve caída, Caída de pluma y posible bucle temporal; no se inventa daño genérico.', 'El Reflejo no ataca primero: imita la acción del original inmediatamente después. Si no puede imitarla legalmente, resuelve la excepción con el DM.'],
    dinner: ['El final se deriva de los cuatro resultados. En empate, el DM elige y registra el motivo; rechazar la misión requiere excepción justificada.']
  },
  endings: [{ id: 'ending1', label: 'Final 1 · Servicio y comunidad' }, { id: 'ending2', label: 'Final 2 · Aceptar la imperfección' }, { id: 'ending3', label: 'Final 3 · Crueldad y soledad' }],
  objectives: [
    { id: 'rose', sceneId: 'garden', label: 'Conseguir la rosa y abandonar el jardín', item: 'Rosa de Fritz', requires: [], choices: [
      { id: 'peace', label: 'Fritz entrega un retoño sin violencia', endingId: 'ending1' },
      { id: 'protect', label: 'Vencer las flores o proteger a Fritz', endingId: 'ending2' },
      { id: 'attack', label: 'Atacar sin escuchar y marcharse con una rosa', endingId: 'ending3' }] },
    { id: 'wine', sceneId: 'cafe', label: 'Conseguir una botella del Café y salir', item: 'Vino del Café', requires: [], choices: [
      { id: 'unseen', label: 'Entrar y salir sin ser vista', endingId: 'ending1' },
      { id: 'one', label: 'Molestar a un solo parroquiano', endingId: 'ending2' },
      { id: 'brawl', label: 'Luchar con varios parroquianos', endingId: 'ending3' }] },
    { id: 'steak', sceneId: 'market', label: 'Conseguir el filete o llevar la vaca viva', item: 'Filete o vaca viva', requires: [], choices: [
      { id: 'heal', label: 'Diagnosticar al padre y dar una poción', endingId: 'ending1' },
      { id: 'buy', label: 'Comprar la vaca o el filete', endingId: 'ending2' },
      { id: 'steal', label: 'Robar la vaca a los niños', endingId: 'ending3' }] },
    { id: 'mirror', sceneId: 'mirror', label: 'Resolver el reflejo y recoger el espejo', item: 'Espejo de plata', requires: ['rose', 'wine', 'steak'], choices: [
      { id: 'peace', label: 'Bajar el arma y resolver pacíficamente', endingId: 'ending1' },
      { id: 'combat', label: 'Derrotar al reflejo en combate', endingId: 'ending2' },
      { id: 'break', label: 'Vencer rompiendo hielo o dañando el espejo', endingId: 'ending3' }] }
  ]
};
