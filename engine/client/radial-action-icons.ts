/** Player action-wheel glyphs. Match specific actions before generic weapons. */
export function radialActionGlyph(key: string, label: string) {
  const text = `${key} ${label}`.toLocaleLowerCase('es');
  if (/categor|cerca de ti|acciones/.test(text)) return '✋';
  if (/ataques/.test(text)) return '⚔';
  if (/trucos/.test(text)) return '🪄';
  if (/conjuros/.test(text)) return '📖';
  if (/puerta|abrir|cerrar/.test(text)) return '🚪';
  if (/sentar|silla|sofá|levantarte/.test(text)) return '🪑';
  if (/leer|cartel/.test(text)) return '📜';
  if (/talk|hablar/.test(text)) return '💬';
  if (/influence|influir/.test(text)) return '✦';
  if (/help|ayudar/.test(text)) return '🤝';
  if (/hide|esconder|sigilo/.test(text)) return '◉̸';
  if (/search|buscar/.test(text)) return '⌕';
  if (/study|estudiar/.test(text)) return '✧';
  if (/fire|fuego|llama|hoguer/.test(text)) return '🔥';
  if (/potion|poción|curación/.test(text)) return '🧪';
  if (/shield|escudo|reacción/.test(text)) return '🛡';
  if (/lock|cerradura/.test(text)) return '⚿';
  if (/trap|trampa/.test(text)) return '⚠';
  if (/climb|trepar/.test(text)) return '↗';
  if (/swim|nadar/.test(text)) return '≋';
  if (/jump|saltar/.test(text)) return '⤴';
  if (/bow|arco/.test(text)) return '🏹';
  if (/sin armas|unarmed|puñetazo|puño/.test(text)) return '✊';
  if (/dagger|daga|sword|espada|hacha|arma|golpe/.test(text)) return '🗡';
  if (/use-object|utilizar|objeto|herramienta/.test(text)) return '⚒';
  if (/dash|correr/.test(text)) return '➤';
  if (/dodge|esquivar/.test(text)) return '↝';
  if (/spell|conjuro|magic|magia|proyectil|misil|ritual|hechizo/.test(text)) return '✦';
  return '✧';
}
