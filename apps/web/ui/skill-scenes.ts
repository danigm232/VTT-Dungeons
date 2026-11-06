import { defaultSkillDC, type SkillMicroScene, type Track } from '../../../engine/client/skill-micro-scene';

const hidden: Track = [[0, { opacity: 0 }]];
const reveal: Track = [[0, { opacity: 0 }], [.42, { opacity: 0 }], [.65, { opacity: 1 }], [1, { opacity: 1 }]];
const point: Track = [[0, {}], [.52, { x: 14, tilt: .085 }], [1, { x: 12, tilt: .07 }]];

export const skillMicroScenes: readonly SkillMicroScene[] = [
  {
    id: 'acrobatics', name: 'Acrobacias', ability: 'dex', defaultDC: defaultSkillDC,
    description: 'Se utiliza para mantener el equilibrio en situaciones difíciles o realizar movimientos acrobáticos, como atravesar una superficie estrecha sin caer.',
    actor: { x: 218, y: 173, ambient: [[0, {}], [.3, { x: 5, tilt: .055 }], [.68, { x: 1, tilt: -.064 }], [1, {}]] },
    ambientAnimation: 'idle_balance', preparationAnimation: 'idle_balance', recoveryAnimation: 'idle_balance',
    successAnimation: { animation: 'idle_balance', beats: [[.65, 'jump'], [.94, 'idle_breath']], caption: 'Cruza la cuerda, hace una pirueta y aterriza.', actor: [
      [0, {}], [.28, { x: 76, y: 3, tilt: .07 }], [.58, { x: 199, y: -1 }],
      [.73, { x: 231, y: -35, tilt: 1.5 }], [.85, { x: 260, y: -21, tilt: 5.6 }], [1, { x: 282, y: 29, tilt: 2 * Math.PI }]
    ] },
    failureAnimation: { animation: 'slip', beats: [[.42, 'hang'], [.77, 'climb']], caption: 'Resbala, se queda colgando y se reincorpora.', actor: [
      [0, {}], [.25, { x: 33, y: 4, tilt: .26 }], [.48, { x: 44, y: 60, tilt: -.36 }],
      [.74, { x: 46, y: 61, tilt: -.28 }], [1, { x: 25, y: 4 }]
    ] },
    props: [{ id: 'tightrope', art: 'rope', x: 320, y: 169,
      failure: [[0, {}], [.49, { cue: -.85 }], [.73, { cue: -.77 }], [1, {}]] }]
  },
  {
    id: 'athletics', name: 'Atletismo', ability: 'str', defaultDC: defaultSkillDC, ground: false,
    description: 'Sirve para realizar esfuerzos físicos exigentes, como saltar más lejos de lo normal, nadar en aguas turbulentas o superar obstáculos mediante la fuerza.',
    actor: { x: 183, y: 202 }, ambientAnimation: 'run_loop', preparationAnimation: 'idle_prepare', recoveryAnimation: 'idle_breath',
    successAnimation: { animation: 'run_loop', beats: [[.16, 'jump'], [.9, 'idle_breath']], caption: 'Salta la grieta y aterriza al otro lado.', actor: [
      [0, {}], [.16, { x: 73 }], [.55, { x: 180, y: -75 }], [.88, { x: 264 }], [1, { x: 277 }]
    ] },
    failureAnimation: { animation: 'run_loop', beats: [[.16, 'jump'], [.62, 'hang'], [.8, 'climb'], [.98, 'idle_breath']],
      caption: 'Se queda corto, se agarra al borde y consigue subir.', actor: [
      [0, {}], [.16, { x: 68 }], [.45, { x: 156, y: -55 }], [.66, { x: 215, y: 43, tilt: -.12 }],
      [.8, { x: 218, y: 41, tilt: -.12 }], [1, { x: 251 }]
    ] },
    props: [
      { id: 'takeoff', art: 'ledge-left', x: 256, y: 202, ambient: [[0, { cue: 1 }]], success: [[0, {}]], failure: [[0, {}]] },
      { id: 'landing', art: 'ledge-right', x: 410, y: 202 },
      { id: 'stride-dust', art: 'dust', x: 167, y: 196, ambient: [[0, { opacity: 0 }], [.2, { x: -13, opacity: .75 }], [.8, { x: -52, opacity: 0 }], [1, { opacity: 0 }]] }
    ]
  },
  {
    id: 'arcana', name: 'Conocimiento arcano', ability: 'int', defaultDC: defaultSkillDC,
    description: 'Permite recordar información sobre conjuros, objetos mágicos y planos de existencia, ayudando a reconocer elementos relacionados con la magia.',
    actor: { x: 234, y: 202, ambient: [[0, {}], [.33, { tilt: -.03 }], [.64, { tilt: .04, x: 3 }], [1, {}]] },
    ambientAnimation: 'idle_inspect', preparationAnimation: 'idle_listen', recoveryAnimation: 'idle_breath',
    successAnimation: { animation: 'point', caption: 'Identifica la runa y el cristal se ilumina.', actor: [[0, {}], [.55, { x: 13, tilt: .08 }], [1, { x: 9 }]] },
    failureAnimation: { animation: 'idle_inspect', caption: 'Confunde la runa y el cristal suelta humo.', actor: [[0, {}], [.38, { x: 11, tilt: .07 }], [.61, { x: -13, tilt: -.15 }], [1, { x: -6 }]] },
    props: [
      { id: 'crystal', art: 'crystal', x: 375, y: 118,
        ambient: [[0, { y: -3, tilt: -.08 }], [.5, { y: 5, tilt: .1 }], [1, { y: -3, tilt: -.08 }]],
        success: [[0, {}], [.43, { y: -7, cue: 1 }], [1, { y: -7, cue: .75 }]],
        failure: [[0, {}], [.48, { tilt: .25, cue: .8 }], [.65, { tilt: -.2 }], [1, { tilt: .03 }]] },
      { id: 'smoke', art: 'smoke', x: 367, y: 113, front: true, ambient: [[0, { opacity: 0 }]],
        failure: [[0, { opacity: 0 }], [.43, { opacity: 0, scale: .2 }], [.65, { opacity: .9, x: -43, y: -19 }], [1, { opacity: 0, x: -84, y: -35, scale: 1.55 }]] }
    ]
  },
  {
    id: 'persuasion', name: 'Persuasión', ability: 'cha', defaultDC: defaultSkillDC,
    description: 'Se utiliza para convencer a alguien mediante argumentos sinceros, diplomacia y amabilidad, buscando acuerdos sin amenazas ni engaños.',
    actor: { x: 232, y: 202 }, ambientAnimation: 'idle_talk', preparationAnimation: 'idle_listen', recoveryAnimation: 'idle_breath',
    successAnimation: { animation: 'reach', caption: 'El comerciante asiente y ambos estrechan la mano.', actor: [[0, {}], [.64, { x: 56, tilt: .07 }], [1, { x: 56, tilt: .05 }]] },
    failureAnimation: { animation: 'idle_talk', caption: 'El comerciante cruza los brazos y rechaza el acuerdo.', actor: [[0, {}], [.44, { x: 9 }], [1, { x: -6, tilt: -.08 }]] },
    props: [
      { id: 'merchant', art: 'merchant', x: 409, y: 202,
        ambient: [[0, {}], [.35, { tilt: .035 }], [.75, { tilt: -.025 }], [1, {}]],
        success: [[0, {}], [.3, { tilt: .07, cue: .45 }], [.65, { x: -52, cue: 1 }], [1, { x: -52, cue: 1 }]],
        failure: [[0, {}], [.4, { tilt: -.055, cue: -.6 }], [.56, { tilt: .055, cue: -1 }], [.73, { tilt: -.04, cue: -1 }], [1, { cue: -1 }]] },
      { id: 'table', art: 'table', x: 315, y: 205 }
    ]
  },
  {
    id: 'deception', name: 'Engaño', ability: 'cha', defaultDC: defaultSkillDC,
    description: 'Se utiliza para mentir de manera convincente, ocultar intenciones o conseguir que otras personas crean una identidad o historia falsa.',
    actor: { x: 240, y: 202 }, ambientAnimation: 'idle_talk', preparationAnimation: 'idle_listen', recoveryAnimation: 'idle_breath',
    successAnimation: { animation: 'walk_loop', caption: 'El guardia se cree la historia y le deja pasar.', actor: [[0, {}], [.35, {}], [1, { x: 184 }]] },
    failureAnimation: { animation: 'idle_talk', caption: 'El bigote se cae y el guardia sospecha.', actor: [[0, {}], [.4, { tilt: .06 }], [.68, { x: -11, tilt: -.13 }], [1, { x: -9 }]] },
    props: [
      { id: 'gate-guard', art: 'guard', x: 396, y: 202,
        success: [[0, {}], [.42, { x: 57, y: -14, scale: .87 }], [1, { x: 58, y: -14, scale: .87 }]],
        failure: [[0, {}], [.56, { x: -13, tilt: .04, cue: .95 }], [1, { x: -13, cue: .95 }]] },
      { id: 'false-moustache', art: 'disguise', x: 9, y: 7, anchor: 'head', front: true,
        ambient: [[0, { scale: .62 }], [.42, { y: 2, tilt: .12, scale: .62 }], [1, { scale: .62 }]],
        failure: [[0, { scale: .62 }], [.34, { scale: .62 }], [.66, { x: 30, y: 38, tilt: 1.8, scale: .62 }], [1, { x: 39, y: 47, tilt: 2.1, scale: .62 }]] }
    ]
  },
  {
    id: 'history', name: 'Historia', ability: 'int', defaultDC: defaultSkillDC,
    description: 'Ayuda a recordar acontecimientos históricos, civilizaciones, personajes importantes y símbolos del pasado que pueden explicar lugares u objetos antiguos.',
    actor: { x: 251, y: 202, ambient: [[0, {}], [.5, { tilt: .035 }], [1, {}]] },
    ambientAnimation: 'idle_read', preparationAnimation: 'idle_inspect', recoveryAnimation: 'idle_read',
    successAnimation: { animation: 'point', caption: 'Reconoce el emblema y señala el símbolo.', actor: point },
    failureAnimation: { animation: 'idle_read', caption: 'Confunde el emblema y vuelve al pergamino.', actor: [[0, {}], [.35, { tilt: .11 }], [.75, { tilt: -.11 }], [1, { tilt: .04 }]] },
    props: [
      { id: 'old-heraldry', art: 'heraldry', x: 395, y: 144, success: [[0, {}], [.63, { cue: 1 }], [1, { cue: 1 }]] },
      { id: 'research-scroll', art: 'scroll', x: 22, y: 0, anchor: 'hand', front: true,
        ambient: [[0, { scale: .72 }], [.48, { y: -7, tilt: -.13, scale: .72 }], [1, { scale: .72 }]],
        failure: [[0, { scale: .72 }], [.48, { y: -16, tilt: -.23, scale: .72 }], [1, { y: -6, tilt: .3, scale: .72 }]] }
    ]
  },
  {
    id: 'performance', name: 'Interpretación', ability: 'cha', defaultDC: defaultSkillDC, sound: 'instrument',
    description: 'Se utiliza para entretener mediante música, baile, teatro o narración, buscando captar la atención del público con una actuación.',
    actor: { x: 278, y: 202, ambient: [[0, {}], [.27, { tilt: .038 }], [.72, { tilt: -.033 }], [1, {}]] },
    ambientAnimation: 'idle_play', preparationAnimation: 'idle_prepare', recoveryAnimation: 'idle_play',
    successAnimation: { animation: 'idle_play', caption: 'La melodía gana fuerza y llegan los aplausos.', actor: [[0, {}], [.42, { tilt: .08 }], [.7, { tilt: -.07 }], [1, {}]] },
    failureAnimation: { animation: 'idle_play', caption: 'Desafina y una nota torcida cae al suelo.', actor: [[0, {}], [.46, { tilt: .09 }], [.62, { tilt: -.12, x: -8 }], [1, {}]] },
    props: [
      { id: 'practice-lute', art: 'lute', x: 17, y: 1, anchor: 'hand', front: true, success: [[0, {}], [.6, { cue: 1 }], [1, { cue: 1 }]] },
      { id: 'music-notes', art: 'notes', x: 320, y: 113, ambient: [[0, { opacity: 0 }], [.45, { opacity: .65, x: 18, y: -19 }], [1, { opacity: 0, x: 43, y: -34 }]],
        success: [[0, { opacity: 0 }], [.28, { opacity: 1, cue: 1 }], [.74, { x: 31, y: -27, cue: 1 }], [1, { opacity: 0, x: 49, y: -40, cue: 1 }]],
        failure: [[0, { opacity: 0 }], [.38, { cue: -1, tilt: -.3 }], [.65, { x: 27, y: 60, tilt: 1.6, cue: -1 }], [1, { x: 37, y: 90, tilt: 2.2, cue: -1 }]] },
      { id: 'applause', art: 'applause', x: 418, y: 151, ambient: hidden, success: reveal }
    ]
  },
  {
    id: 'intimidation', name: 'Intimidación', ability: 'cha', defaultDC: defaultSkillDC,
    description: 'Sirve para influir en alguien mediante amenazas, gestos intimidantes o una presencia imponente, intentando que ceda sin necesidad de combatir.',
    actor: { x: 255, y: 202, ambient: [[0, {}], [.5, { tilt: -.03 }], [1, {}]] },
    ambientAnimation: 'idle_brace', preparationAnimation: 'idle_prepare', recoveryAnimation: 'idle_breath',
    successAnimation: { animation: 'idle_brace', caption: 'Se impone con su postura y el bandido huye.', actor: [[0, {}], [.45, { x: 34, tilt: .12 }], [1, { x: 27, tilt: .03 }]] },
    failureAnimation: { animation: 'idle_brace', caption: 'El bandido se ríe del intento de asustarlo.', actor: [[0, {}], [.45, { x: 17, tilt: .12 }], [1, { x: -4, tilt: -.11 }]] },
    props: [{ id: 'bandit', art: 'bandit', x: 384, y: 202,
      ambient: [[0, {}], [.53, { tilt: .035 }], [1, {}]],
      success: [[0, {}], [.44, { x: 17, tilt: -.17, facing: -1, cue: .66 }], [.72, { x: 97, y: -5, tilt: -.14, facing: -1, cue: .85 }], [1, { x: 230, opacity: 0, facing: -1 }]],
      failure: [[0, {}], [.38, { tilt: .13, cue: -.55 }], [.56, { y: -5, cue: -.8 }], [.76, { tilt: .12, cue: -.8 }], [1, { cue: -.8 }]] }]
  },
  {
    id: 'investigation', name: 'Investigación', ability: 'int', defaultDC: defaultSkillDC,
    description: 'Permite examinar pistas, relacionar indicios y deducir cómo funcionan mecanismos u objetos cuando la respuesta no resulta evidente.',
    actor: { x: 254, y: 202, ambient: [[0, { tilt: .04 }], [.5, { tilt: .09 }], [1, { tilt: .04 }]] },
    ambientAnimation: 'idle_inspect', preparationAnimation: 'idle_listen', recoveryAnimation: 'idle_inspect',
    successAnimation: { animation: 'hand_interact', caption: 'Acciona la palanca correcta y el mecanismo se abre.', actor: [[0, { tilt: .04 }], [.47, { x: 46, tilt: .10 }], [1, { x: 30, tilt: .045 }]] },
    failureAnimation: { animation: 'hand_interact', caption: 'Mueve la palanca equivocada y sale disparado un muelle.', actor: [[0, { tilt: .04 }], [.43, { x: 43, tilt: .1 }], [.65, { x: -12, tilt: -.14 }], [1, { x: -6 }]] },
    props: [
      { id: 'lever-box', art: 'mechanism', x: 375, y: 202,
        success: [[0, {}], [.44, {}], [.72, { cue: 1 }], [1, { cue: 1 }]],
        failure: [[0, {}], [.36, {}], [.51, { cue: -.86 }], [1, { cue: -.12 }]] },
      { id: 'released-spring', art: 'spring', x: 376, y: 154, ambient: hidden, front: true,
        failure: [[0, { opacity: 0 }], [.44, { opacity: 0 }], [.64, { x: -40, y: -37, tilt: -.8 }], [1, { x: -116, y: 42, tilt: -2.1 }]] }
    ]
  },
  {
    id: 'sleight-of-hand', name: 'Juego de manos', ability: 'dex', defaultDC: defaultSkillDC,
    description: 'Se utiliza para manipular objetos discretamente, ocultar pequeñas cosas o realizar movimientos rápidos con las manos sin llamar la atención.',
    actor: { x: 267, y: 202 }, ambientAnimation: 'hand_interact', preparationAnimation: 'idle_prepare', recoveryAnimation: 'idle_breath',
    successAnimation: { animation: 'hand_interact', caption: 'Oculta la moneda y la muestra detrás de la oreja.', actor: [[0, {}], [.55, { tilt: .04 }], [1, { tilt: -.04 }]] },
    failureAnimation: { animation: 'reach', caption: 'Se le escapa la moneda y rueda fuera de escena.', actor: [[0, {}], [.4, { tilt: .06 }], [.75, { x: 16, tilt: .15 }], [1, { x: 10 }]] },
    props: [
      { id: 'coin-table', art: 'table', x: 341, y: 203 },
      { id: 'practice-coin', art: 'coin', x: 20, y: -2, anchor: 'hand', front: true,
        ambient: [[0, {}], [.5, { x: 22, y: -6, tilt: .52 }], [1, {}]],
        success: [[0, {}], [.28, { opacity: 0 }], [1, { opacity: 0 }]],
        failure: [[0, {}], [.31, { x: 21, y: 6, tilt: .6 }], [.58, { x: 88, y: 39, tilt: 2 }], [1, { x: 365, y: 38, tilt: 7, opacity: 0 }]] },
      { id: 'coin-reveal', art: 'coin', x: -6, y: -5, anchor: 'head', front: true, ambient: hidden,
        success: [[0, { opacity: 0 }], [.52, { opacity: 0 }], [.66, { opacity: 1, cue: 1 }], [1, { opacity: 1, cue: 1 }]] }
    ]
  },
  {
    id: 'medicine', name: 'Medicina', ability: 'wis', defaultDC: defaultSkillDC,
    description: 'Ayuda a diagnosticar enfermedades, examinar heridas de un compañero o identificar posibles causas de una muerte reciente mediante conocimientos médicos.',
    actor: { x: 256, y: 202, ambient: [[0, { tilt: .03 }], [.56, { tilt: .11 }], [1, { tilt: .03 }]] },
    ambientAnimation: 'idle_inspect', preparationAnimation: 'idle_prepare', recoveryAnimation: 'idle_breath',
    successAnimation: { animation: 'hand_interact', caption: 'Examina la herida y coloca bien el vendaje.', actor: [[0, {}], [.64, { x: 32, tilt: .11 }], [1, { x: 28, tilt: .06 }]] },
    failureAnimation: { animation: 'hand_interact', caption: 'Intenta vendar el brazo y se enreda con la venda.', actor: [[0, {}], [.46, { x: 19, tilt: .09 }], [.75, { x: -7, tilt: -.16 }], [1, { x: -8, tilt: -.07 }]] },
    props: [
      { id: 'seated-companion', art: 'patient', x: 386, y: 202, ambient: [[0, { cue: .75 }]], success: [[0, { cue: .75 }], [1, { cue: .87 }]] },
      { id: 'bandage-roll', art: 'bandage', x: 18, y: 4, anchor: 'hand', front: true,
        ambient: [[0, { scale: .75 }], [.5, { tilt: -.22, scale: .75 }], [1, { scale: .75 }]],
        success: [[0, { scale: .75 }], [.62, { opacity: 0 }], [1, { opacity: 0 }]], failure: [[0, { scale: .75 }], [.54, { opacity: 0 }], [1, { opacity: 0 }]] },
      { id: 'applied-bandage', art: 'bandage', x: 345, y: 145, front: true, ambient: hidden,
        success: [[0, { opacity: 0 }], [.53, { opacity: 0 }], [.71, { scale: .68, cue: 1 }], [1, { scale: .68, cue: 1 }]] },
      { id: 'bandage-tangle', art: 'tangle', x: 1, y: 1, anchor: 'hand', front: true, ambient: hidden, failure: reveal }
    ]
  },
  {
    id: 'nature', name: 'Naturaleza', ability: 'int', defaultDC: defaultSkillDC,
    description: 'Permite recordar conocimientos sobre animales, plantas, terrenos y fenómenos climáticos para reconocer especies y comprender el entorno natural.',
    actor: { x: 252, y: 202, ambient: [[0, { tilt: .045 }], [.5, { tilt: .1 }], [1, { tilt: .045 }]] },
    ambientAnimation: 'idle_crouch', preparationAnimation: 'idle_inspect', recoveryAnimation: 'idle_crouch',
    successAnimation: { animation: 'point', caption: 'Reconoce la especie y señala la planta correcta.', actor: [[0, { tilt: .045 }], [.56, { x: 36, tilt: .12 }], [1, { x: 32, tilt: .07 }]] },
    failureAnimation: { animation: 'idle_crouch', caption: 'Se acerca a la otra planta y las esporas le hacen estornudar.', actor: [[0, { tilt: .045 }], [.39, { x: 45, tilt: .15 }], [.65, { x: -11, tilt: -.18 }], [.83, { x: -2, tilt: .08 }], [1, {}]] },
    props: [
      { id: 'narrow-leaves', art: 'plant-narrow', x: 359, y: 203, success: [[0, {}], [.58, { cue: .9 }], [1, { cue: .85 }]] },
      { id: 'broad-leaves', art: 'plant-broad', x: 411, y: 203 },
      { id: 'plant-spores', art: 'spores', x: 406, y: 160, ambient: hidden, front: true,
        failure: [[0, { opacity: 0 }], [.42, { opacity: 0 }], [.64, { x: -55, y: -9 }], [1, { opacity: 0, x: -133, y: -38 }]] }
    ]
  },
  {
    id: 'perception', name: 'Percepción', ability: 'wis', defaultDC: defaultSkillDC,
    description: 'Sirve para detectar sonidos, movimientos y detalles difíciles de percibir utilizando la vista, el oído y los demás sentidos.',
    actor: { x: 235, y: 202, ambient: [[0, {}], [.35, { tilt: -.047 }], [.74, { tilt: .04 }], [1, {}]] },
    ambientAnimation: 'idle_listen', preparationAnimation: 'idle_listen', recoveryAnimation: 'idle_breath',
    successAnimation: { animation: 'point', caption: 'Oye el ruido, se gira y descubre la lechuza.', actor: point },
    failureAnimation: { animation: 'idle_listen_away', caption: 'Mira hacia otro lado mientras la lechuza escapa por detrás.', actor: [[0, {}], [.54, { tilt: -.08 }], [1, { x: -9 }]] },
    props: [
      { id: 'hiding-bush', art: 'bush', x: 392, y: 203, front: true,
        ambient: [[0, {}], [.4, {}], [.5, { cue: .5 }], [.65, {}], [1, {}]] },
      { id: 'hidden-owl', art: 'owl', x: 393, y: 178, ambient: hidden,
        success: [[0, { opacity: 0 }], [.33, { opacity: 0 }], [.56, { y: -38, cue: .5 }], [1, { y: -40 }]],
        failure: [[0, { opacity: 0 }], [.31, { opacity: 0 }], [.54, { x: -30, y: -63, cue: 1 }], [.78, { x: -150, y: -118, cue: 1 }], [1, { x: -298, y: -151, cue: 1, opacity: 0 }]] }
    ]
  },
  {
    id: 'insight', name: 'Perspicacia', ability: 'wis', defaultDC: defaultSkillDC,
    description: 'Ayuda a interpretar gestos, emociones y comportamientos para comprender las posibles intenciones de otras personas durante una conversación.',
    actor: { x: 251, y: 202 }, ambientAnimation: 'idle_listen', preparationAnimation: 'idle_listen', recoveryAnimation: 'idle_breath',
    successAnimation: { animation: 'idle_talk', caption: 'Percibe la inquietud y responde con comprensión.', actor: [[0, {}], [.44, { tilt: .08 }], [.7, { tilt: .02 }], [1, { x: 12, tilt: .045 }]] },
    failureAnimation: { animation: 'idle_talk', caption: 'Pasa por alto la inquietud y sonríe despreocupado.', actor: [[0, {}], [.49, { tilt: -.055 }], [.72, { tilt: .045 }], [1, {}]] },
    props: [{ id: 'worried-traveler', art: 'traveler', x: 382, y: 202,
      ambient: [[0, { cue: -.38 }], [.39, { tilt: -.03, cue: -.67 }], [.78, { tilt: .027, cue: -.43 }], [1, { cue: -.38 }]],
      success: [[0, { cue: -.38 }], [.57, { tilt: .027, cue: -.1 }], [1, { cue: .12 }]],
      failure: [[0, { cue: -.38 }], [.46, { tilt: -.06, cue: -.57 }], [1, { tilt: -.045, cue: -.9 }]] }]
  },
  {
    id: 'religion', name: 'Religión', ability: 'int', defaultDC: defaultSkillDC,
    description: 'Permite recordar conocimientos sobre dioses, símbolos sagrados, rituales y tradiciones religiosas para comprender ceremonias y lugares de culto.',
    actor: { x: 252, y: 202, ambient: [[0, {}], [.52, { tilt: .05 }], [1, {}]] },
    ambientAnimation: 'idle_read', preparationAnimation: 'idle_listen', recoveryAnimation: 'idle_read',
    successAnimation: { animation: 'idle_breath', caption: 'Reconoce el símbolo y se inclina con respeto.', actor: [[0, {}], [.47, { tilt: .17 }], [.75, { tilt: .16 }], [1, { tilt: .035 }]] },
    failureAnimation: { animation: 'idle_read', caption: 'Pasa páginas, gira el libro y sigue sin reconocerlo.', actor: [[0, {}], [.56, { tilt: .09 }], [.87, { tilt: -.06 }], [1, {}]] },
    props: [
      { id: 'shrine', art: 'altar', x: 391, y: 202 },
      { id: 'ritual-book', art: 'book', x: 20, y: 0, anchor: 'hand', front: true,
        ambient: [[0, { scale: .73 }], [.37, { cue: .9, scale: .73 }], [.66, { cue: .15, scale: .73 }], [1, { scale: .73 }]],
        success: [[0, { scale: .73 }], [.55, { y: 14, tilt: .17, scale: .73 }], [1, { y: 10, scale: .73 }]],
        failure: [[0, { scale: .73 }], [.22, { cue: 1, scale: .73 }], [.38, { cue: 0, scale: .73 }], [.53, { cue: 1, scale: .73 }], [1, { tilt: 2.88, scale: .73 }]] }
    ]
  },
  {
    id: 'stealth', name: 'Sigilo', ability: 'dex', defaultDC: defaultSkillDC,
    description: 'Se usa para esconderse, caminar silenciosamente y evitar ser detectado cuando una criatura podría ver u oír al personaje.',
    actor: { x: 187, y: 202, ambient: [[0, {}], [.58, { x: 43 }], [.71, { x: 43 }], [1, {}]] },
    ambientAnimation: 'sneak_loop', preparationAnimation: 'idle_crouch', recoveryAnimation: 'idle_crouch',
    successAnimation: { animation: 'sneak_loop', caption: 'Pasa detrás del guardia sin que lo advierta.', actor: [[0, {}], [.35, { x: 102, y: -7, scale: .94 }], [.63, { x: 189, y: -14, scale: .89 }], [1, { x: 302 }]] },
    failureAnimation: { animation: 'sneak_loop', caption: 'Pisa la piedra y el guardia se vuelve al instante.', actor: [[0, {}], [.42, { x: 117 }], [.57, { x: 115, y: -6, tilt: -.12 }], [1, { x: 105, tilt: -.04 }]] },
    props: [
      { id: 'loose-stone', art: 'pebble', x: 307, y: 201, failure: [[0, {}], [.42, {}], [.68, { x: 20, y: -4, tilt: .43 }], [1, { x: 29, tilt: .66 }]] },
      { id: 'sleepy-guard', art: 'guard', x: 386, y: 202, front: true, ambient: [[0, { cue: -1, tilt: -.04, facing: -1 }]],
        failure: [[0, { cue: -1, tilt: -.04, facing: -1 }], [.42, { cue: -1, tilt: -.04, facing: -1 }], [.62, { cue: .64, tilt: .06 }], [1, { cue: .75 }]] },
      { id: 'stone-noise', art: 'sound', x: 319, y: 190, ambient: hidden, front: true,
        failure: [[0, { opacity: 0 }], [.42, { opacity: 0 }], [.53, {}], [.8, { y: -15, opacity: 0 }], [1, { opacity: 0 }]] }
    ]
  },
  {
    id: 'survival', name: 'Supervivencia', ability: 'wis', defaultDC: defaultSkillDC,
    description: 'Ayuda a seguir huellas, encontrar caminos seguros, conseguir alimento y reconocer peligros naturales mientras se exploran territorios desconocidos.',
    actor: { x: 210, y: 200, ambient: [[0, { tilt: .09 }], [.48, { tilt: -.03 }], [.78, { tilt: .12 }], [1, { tilt: .09 }]] },
    ambientAnimation: 'idle_crouch', preparationAnimation: 'idle_listen', recoveryAnimation: 'idle_crouch',
    successAnimation: { animation: 'walk_loop', caption: 'Distingue el rastro correcto y empieza a seguirlo.', actor: [[0, { tilt: .09 }], [.18, {}], [.58, { x: 126, y: -5 }], [1, { x: 251, y: -15 }]] },
    failureAnimation: { animation: 'walk_loop', caption: 'Sigue el rastro equivocado y acaba en el mismo sitio.', actor: [[0, { tilt: .09 }], [.37, { x: 126, y: 24 }], [.54, { x: 144, y: 5, tilt: -.13, facing: -1 }], [.76, { x: 84, y: -11, facing: -1 }], [1, { tilt: .09, facing: -1 }]] },
    props: [
      { id: 'boot-trail', art: 'tracks-boot', x: 279, y: 197, success: [[0, {}], [.45, { cue: .7 }], [1, { cue: .8 }]] },
      { id: 'paw-trail', art: 'tracks-paw', x: 270, y: 210, failure: [[0, {}], [.36, { cue: .7 }], [.77, {}], [1, {}]] },
      { id: 'trail-marker', art: 'sign', x: 428, y: 198, success: [[0, {}], [.56, { cue: .8 }], [1, { cue: .8 }]] }
    ]
  },
  {
    id: 'animal-handling', name: 'Trato con animales', ability: 'wis', defaultDC: defaultSkillDC,
    description: 'Se utiliza para tranquilizar, guiar o adiestrar animales, como calmar a un caballo nervioso para que permita acercarse.',
    actor: { x: 217, y: 202, ambient: [[0, {}], [.61, { x: 8, tilt: .075 }], [1, {}]] },
    ambientAnimation: 'idle_reach', preparationAnimation: 'idle_listen', recoveryAnimation: 'idle_breath',
    successAnimation: { animation: 'reach', caption: 'El caballo se calma, baja la cabeza y acepta una caricia.', actor: [[0, {}], [.53, { x: 45, tilt: .08 }], [.75, { x: 48, tilt: .05 }], [1, { x: 46, tilt: .07 }]] },
    failureAnimation: { animation: 'reach', caption: 'El caballo le empuja con el hocico y retrocede sorprendido.', actor: [[0, {}], [.37, { x: 32, tilt: .08 }], [.58, { x: -18, y: -4, tilt: -.17 }], [1, { x: -21, tilt: -.04 }]] },
    props: [{ id: 'nervous-horse', art: 'horse', x: 415, y: 203,
      ambient: [[0, {}], [.48, { x: 5, tilt: .018, cue: -.15 }], [1, {}]],
      success: [[0, {}], [.55, { x: -21, cue: 1 }], [1, { x: -23, cue: .88 }]],
      failure: [[0, {}], [.46, { x: -57, tilt: -.04, cue: .73 }], [.7, { x: -17, cue: -.15 }], [1, {}]] }]
  }
];
