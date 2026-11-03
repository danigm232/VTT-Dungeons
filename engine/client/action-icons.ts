/** Original, resolution-independent UI drawings. Catalogue entries are artwork,
 * not a grant of spells, class features, or permission to perform an action. */
const motifs = {
  fog:'M3 14c-4-6 4-12 8-7 5-3 11 4 7 7M2 17h20M5 21h14M5 13h14',
  feather:'M5 21 18 5M9 17C-2 9 14 0 21 3c0 10-3 19-12 14M13 13l-1-6m4 3 4 1',
  disk:'M2 13c0-5 20-5 20 0s-20 5-20 0Zm1 5c4 3 14 3 18 0M7 21h10',
  eye:'M2 12Q12 0 22 12 12 24 2 12Zm10-4a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 1v3m0 16v3',
  familiar:'M5 11 4 3l7 5 2 0 7-5-1 8q4 11-7 11T5 11m3 2h1m6 0h1m-7 4 3 2 3-2',
  mend:'M4 3 9 8 6 12 2 10m20-7-7 7m-2 3-9 9m5-8 4 4M14 2v4m-2-2h4',
  wand:'m4 21 12-12m-9 9-3-3M17 2v4m-2-2h4m2 7v4m-2-2h4M8 3v4M6 5h4',
  missile:'M3 20 14 9m-5 12L20 10M2 14 13 3m-2 8 5-1-1-5m1 8 5-1-1-5M9 5l5-1-1-3',
  flame:'M12 2c3 6-3 7 2 10l3-5c11 16-16 23-13 6 1 3 4 3 4 3-2-5 6-9 4-14Z',
  snow:'M12 2v20M3 7l18 10M3 17 21 7M9 4l3 3 3-3m-6 16 3-3 3 3M4 10l4-1-1-4m10 14-1-4 4-1',
  bolt:'m13 1-10 13h8l-1 9 11-14h-8l0-8Z',
  shield:'m12 2 9 4v7c0 5-9 9-9 9s-9-4-9-9V6l9-4Zm-4 9 3 3 5-6',
  hand:'M6 13V5q2-3 3 0v6-8q2-3 3 0v8-7q2-3 3 0v8-5q3-2 3 1v9c-1 7-10 7-13 2l-3-5q-1-4 2-3l3 4',
  blade:'m3 21 4-4m-3-3 6 6M7 17 18 3l4-1-1 4L10 18',
  bow:'M5 2q25 10 0 20L12 12 5 2Zm2 10h15m-4-3 4 3-4 3',
  fist:'M4 13V7h4V4h4v1h4v2h4v8l-5 7H8l-5-6 1-3Zm4-6v6m4-8v8m4-6v6M5 13h8v4',
  run:'m14 3 1 1m-7 4 5-2 4 5 4 1M12 8l-3 6 5 3-1 5M9 14l-4 5H2',
  hide:'M2 12Q12 0 22 12q-3 4-7 5M9 17q-4-1-7-5M3 22 22 3M10 10l4 4',
  chain:'m10 7 3-3c7-5 12 3 6 7l-3 2M8 11l-3 2c-6 5 1 12 6 6l3-3M8 16l8-8',
  book:'M12 6Q6 1 2 5v15q5-4 10 0 5-4 10 0V5q-5-4-10 1Zm0 0v14M5 8l4 1m6 0 4-1',
  heart:'M12 21 3 12C-4 3 9-2 12 6c4-9 16-3 9 6l-9 9Z',
  skull:'M5 16C-7-2 31-2 19 16v6H5v-6Zm3-6h1m6 0h1m-5 5h2M9 19v3m6-3v3',
  portal:'M12 2a8 10 0 1 0 0 20 8 10 0 0 0 0-20Zm0 4a4 6 0 1 1 0 12M1 12h8m-3-3 3 3-3 3',
  sound:'M3 9h4l7-6v18l-7-6H3V9Zm14-2q6 5 0 10m3-13q8 8 0 16',
  moon:'M17 2C-5 0-1 28 19 21 8 21 4 7 17 2Zm2 5v6m-3-3h6',
  web:'M12 1v22M1 12h22M3 3l18 18M3 21 21 3M6 6h12v12H6V6Zm3 3h6v6H9V9Z',
  key:'M9 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10Zm3-1 10 10m-4-4 3-3m-6 0 3-3',
  potion:'M9 2h6m-5 0v7L4 18q-2 4 3 4h10q5 0 3-4l-6-9V2M7 15h10',
  hourglass:'M5 2h14M5 22h14M7 2v5l10 10v5M17 2v5 0l-10 10v5M9 19h6',
  cloud:'M4 17C-3 13 2 6 7 8 5 0 19 0 18 9c8-2 7 8 1 8H4Zm4 4h1m6 0h1',
  armor:'m8 2 4 3 4-3 6 5-4 4v11H6V11L2 7l6-5Zm0 6v10h8V8',
  orb:'M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0Zm1-4q8 9 16 0M7 19q9-7 8-16',
  target:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 5a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 0v5m0 14v5M0 12h5m14 0h5',
} as const;
type Motif = keyof typeof motifs;
type Icon = {id:string;motif:Motif;color:string;aliases:string[]};
export const ACTION_ICON_CATALOGUE: Icon[] = [];
const normal=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const add=(motif:Motif,color:string,rows:string)=>{for(const row of rows.split(';')){const [id,...aliases]=row.split('|');ACTION_ICON_CATALOGUE.push({id:id!,motif,color,aliases:[id!,...aliases].map(normal)});}};
// Includes current sheets plus artwork for wizard/arcane-trickster options,
// cantrips and spell levels 1–5. Availability still comes from the server.
add('fog','#b9d7db','fog-cloud|nube de niebla|niebla oscura;darkness|oscuridad');
add('feather','#cceeff','feather-fall|caida de pluma;fly|volar;levitate|levitar');
add('disk','#91dfe8','floating-disk|disco flotante|tensers floating disk');
add('eye','#e6c773','identify|identificar;detect-magic|detectar magia;detect-thoughts|detectar pensamientos;see-invisibility|ver invisibilidad;arcane-eye|ojo arcano;clairvoyance|clarividencia;scrying|escudrinar;true-strike|impacto certero');
add('familiar','#dcc1f0','find-familiar|encontrar familiar;conjure-minor-elementals|conjurar elementales menores;conjure-elemental|conjurar elemental;summon-undead|convocar muerto viviente;summon-fey|convocar feerico;summon-aberration|convocar aberracion;summon-construct|convocar constructo;summon-elemental|convocar elemental;summon-dragon|convocar dragon');
add('mend','#efc78a','mending|remendar;fabricate|fabricar;creation|creacion');
add('wand','#d7a5ff','prestidigitation|prestidigitacion;minor-illusion|ilusion menor;silent-image|imagen silenciosa;major-image|imagen mayor;mirror-image|imagen multiple;mislead|despistar;seeming|apariencia;magic-mouth|boca magica;nystuls-magic-aura|aura magica;programmed-illusion|ilusion programada');
add('missile','#c7afff','magic-missile|misil magico;chromatic-orb|orbe cromatico;eldritch-blast|descarga sobrenatural');
add('flame','#ffb36d','fire-bolt|proyectil de fuego;burning-hands|manos ardientes;scorching-ray|rayo abrasador;flaming-sphere|esfera de llamas;fireball|bola de fuego;fire-shield|escudo de fuego;wall-of-fire|muro de fuego;delayed-blast-fireball|bola de fuego retardada');
add('snow','#98e8ff','ray-of-frost|rayo de escarcha;ice-knife|cuchillo de hielo;sleet-storm|tormenta de aguanieve;ice-storm|tormenta de hielo;cone-of-cold|cono de frio;wall-of-ice|muro de hielo');
add('bolt','#a5d6ff','shocking-grasp|agarre electrizante;witch-bolt|rayo de hechiceria;lightning-bolt|relampago;lightning-lure|latigo de relampagos');
add('shield','#a5dbe8','shield|escudo;counterspell|contrahechizo;dispel-magic|disipar magia;protection-from-evil-and-good|proteccion contra el bien y el mal;protection-from-energy|proteccion contra la energia;resistance|resistencia;blade-ward|proteccion contra armas;stoneskin|piel petrea;globe-of-invulnerability|globo de invulnerabilidad;remove-curse|quitar maldicion;magic-circle|circulo magico');
add('hand','#d8bbff','mage-hand|mano de mago;bigbys-hand|mano de bigby;telekinesis|telequinesis;unseen-servant|sirviente invisible;hold-person|inmovilizar persona;hold-monster|inmovilizar monstruo;grapple|agarrar;shove|empujar;interact|interactuar');
add('blade','#eedbb2','dagger|daga;thrown-dagger|lanzar daga;shortsword|espada corta;longsword|espada larga;handaxe|hacha de mano;magic-weapon|arma magica;sneak-attack|ataque furtivo;attack|atacar;cloud-of-daggers|nube de dagas');
add('bow','#e7c88a','shortbow|arco corto;longbow|arco largo;crossbow|ballesta');
add('fist','#e2c7ab','unarmed|sin armas|punetazo;club|porra|garrote;mace|maza');
add('run','#a6dfba','dash|correr;cunning-action|accion astuta;disengage|destrabarse|destrabarse;dodge|esquivar;haste|acelerar;expeditious-retreat|retirada expeditiva;longstrider|zancada prodigiosa;jump|saltar|salto');
add('hide','#b3b9d8','hide|esconderse|sigilo;invisibility|invisibilidad;greater-invisibility|invisibilidad mejorada;blur|contorno borroso;disguise-self|disfrazarse;pass-without-trace|pasar sin rastro');
add('chain','#c6ceda','knock|abrir;arcane-lock|cerradura arcana;rope-trick|truco de la cuerda;web|telarana;slow|ralentizar;entangle|enredar;animate-objects|animar objetos');
add('book','#e9d4ac','comprehend-languages|comprension idiomatica;tongues|lenguas;contact-other-plane|contactar con otro plano;legend-lore|conocimiento de leyendas;study|estudiar;spells|conjuros;cantrips|trucos;ritual|rituales');
add('heart','#9ce0bd','charm-person|hechizar persona;charm-monster|hechizar monstruo;suggestion|sugestion;mass-suggestion|sugestion en masa;dominate-person|dominar persona;friends|amistad;help|ayudar;cure-wounds|curar heridas;healing-word|palabra de curacion;false-life|falsa vida;vampiric-touch|toque vampirico');
add('skull','#b3caa1','chill-touch|toque helado;ray-of-sickness|rayo nauseabundo;ray-of-enfeeblement|rayo debilitador;animate-dead|animar a los muertos;bestow-curse|lanzar maldicion;blight|marchitar;danse-macabre|danza macabra;enervation|enervacion;fear|miedo;phantasmal-killer|asesino fantasmal;phantasmal-force|fuerza fantasmal');
add('portal','#c5bbff','misty-step|paso brumoso;dimension-door|puerta dimensional;teleportation-circle|circulo de teletransportacion;banishment|destierro;blink|intermitencia;gaseous-form|forma gaseosa;passwall|pasar muro;etherealness|excursion eterea');
add('sound','#badbff','thunderwave|onda atronadora;shatter|hacer anicos;message|mensaje;sending|recado;alarm|alarma;silence|silencio;influence|influir');
add('moon','#d2caff','sleep|dormir;hypnotic-pattern|patron hipnotico;dream|sueno;catnap|siesta;confusion|confusion;hallucinatory-terrain|terreno alucinatorio');
add('potion','#b6e99c','acid-splash|salpicadura acida;poison-spray|rociada de veneno;acid-arrow|flecha acida;stinking-cloud|nube apestosa;cloudkill|nube aniquiladora;use-object|usar objeto|utilizar;drink-potion|beber pocion');
add('hourglass','#efdc97','ready|preparar;reaction|reaccion;end-turn|fin de turno|terminar turno;gentle-repose|dulce descanso;contingency|contingencia');
add('cloud','#cce1ef','gust-of-wind|rafaga de viento;wind-wall|muro de viento;control-water|controlar agua;water-breathing|respiracion acuatica;water-walk|caminar sobre el agua');
add('armor','#c4d9e7','mage-armor|armadura de mago;barkskin|piel robliza;enhance-ability|potenciar caracteristica;enlarge-reduce|agrandar reducir;alter-self|alterar el propio aspecto;polymorph|polimorfar');
add('orb','#e2d9a0','light|luz;dancing-lights|luces danzantes;daylight|luz del dia;continual-flame|llama permanente;wall-of-force|muro de fuerza;resilient-sphere|esfera elastica;wall-of-stone|muro de piedra;tiny-hut|cabana diminuta;private-sanctum|santuario privado;faithful-hound|sabueso fiel;phantom-steed|corcel fantasma;secret-chest|cofre secreto;glyph-of-warding|glifo custodio;planar-binding|ligadura de los planos;telepathic-bond|vinculo telepatico;locate-object|localizar objeto;locate-creature|localizar criatura;sculpt-spells|esculpir conjuros');
add('target','#f0dca5','search|buscar;pick-lock|forzar cerradura;disarm-trap|desactivar trampa;climb|trepar;swim|nadar;uncanny-dodge|esquiva asombrosa;steady-aim|apuntar;arcane-recovery|recuperacion arcana');
add('hand','#dfcc9e','actions|acciones;shove-action|empujon');
add('blade','#eedbb2','attacks|ataques');
add('wand','#d7a5ff','elementalism|elementalismo;color-spray|rociada de color;illusory-script|escritura ilusoria;grease|grasa;prismatic-spray|rociada prismatica');
add('moon','#d2caff','hideous-laughter|risa horrible|risa horrenda;blindness-deafness|ceguera sordera;crown-of-madness|corona de la locura;modify-memory|modificar recuerdo');
add('skull','#b3caa1','toll-the-dead|tañido por los muertos;feign-death|fingir muerte;speak-with-dead|hablar con los muertos;negative-energy-flood|torrente de energia negativa;danse-macabre-extra|danza macabra extra');
add('bolt','#a5d6ff','mind-sliver|astilla mental;thunderclap|tronido;synaptic-static|estatica sinaptica');
add('eye','#e6c773','darkvision|vision en la oscuridad;nondetection|indetectable');
add('web','#c6ceda','spider-climb|trepar cual aracnido');
add('heart','#9ce0bd','arcane-vigor|vigor arcano;life-transference|transferencia de vida');
add('flame','#ffb36d','dragons-breath|aliento de dragon;immolation|inmolacion');
add('cloud','#cce1ef','wall-of-sand|muro de arena;wall-of-water|muro de agua;tidal-wave|ola de marea;watery-sphere|esfera acuosa;control-winds|controlar vientos;storm-sphere|esfera tormentosa');
add('shield','#a5dbe8','intellect-fortress|fortaleza intelectual');

export function actionIcon(key:string,label:string) {
  const name=normal(label.split('·')[0]??label),id=normal(key).replace(/-exploration$/,'');
  // Exact ids/names first: "Lanzar daga" must not inherit the melee icon.
  const icon=ACTION_ICON_CATALOGUE.find(icon=>icon.aliases.includes(id)||icon.aliases.includes(name))
    ??ACTION_ICON_CATALOGUE.find(icon=>icon.aliases.some(alias=>alias.length>4&&name.includes(alias)));
  const identity=icon?.id??(id&&id!=='combat-action'&&id!=='exploration-action'?id:name);
  let hash=2166136261;for(const c of identity)hash=Math.imul(hash^c.charCodeAt(0),16777619)>>>0;
  const motif=icon?.motif??(/daga|espada|hacha/.test(name)?'blade':/arco|ballesta/.test(name)?'bow':'book');
  // A small individual rune distinguishes spells sharing a meaningful motif.
  // No label/user content is interpolated into SVG markup.
  const code=icon?ACTION_ICON_CATALOGUE.indexOf(icon)+1:hash;
  const rune=Array.from({length:8},(_,i)=>(code&(1<<i))?`<path d="M${2.2+i*2.8} 25v2"/>`:'').join('');
  return {id:identity,color:icon?.color??'#e8dbb6',svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 28" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${motifs[motif]}"/>${rune}</svg>`};
}
