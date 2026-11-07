import { type SkillMicroScene } from '../../../engine/client/skill-micro-scene';

export const skillMicroScenes: readonly SkillMicroScene[] = [
  {
    id: "acrobatics",
    name: "Acrobacias",
    ability: "dex",
    defaultDC: 12,
    terrain: "chasm",
    prompt: "Cruza la cuerda sin perder el equilibrio.",
    description: "Se utiliza para mantener el equilibrio en situaciones difíciles o realizar movimientos acrobáticos, como atravesar una superficie estrecha sin caer.",
    actor: {"x":164,"y":202},
    ambientAnimation: "idle_prepare",
    preparationAnimation: "idle_prepare",
    recoveryAnimation: "idle_balance",
    successAnimation: {
      animation: "jump",
      caption: "Salta a la cuerda, avanza paso a paso y aterriza al otro lado.",
      actor: [[0,{}], [0.12,{"x":24,"y":-45}], [0.23,{"x":54,"y":-33}], [0.37,{"x":112,"y":-32}], [0.51,{"x":170,"y":-32}], [0.65,{"x":228,"y":-32}], [0.76,{"x":274,"y":-58}], [0.88,{"x":310,"y":-37}], [1,{"x":336}]],
      beats: [[0.23,"walk_loop"], [0.7,"jump"], [0.94,"idle_breath"]],
      settledAnimation: "idle_breath"
    },
    failureAnimation: {
      animation: "jump",
      caption: "Salta a la cuerda, pierde el apoyo y queda colgando de ella.",
      actor: [[0,{}], [0.12,{"x":24,"y":-45}], [0.23,{"x":54,"y":-33}], [0.4,{"x":104,"y":-32}], [0.54,{"x":128,"y":-24}], [0.68,{"x":133,"y":43}], [1,{"x":133,"y":43}]],
      beats: [[0.23,"walk_loop"], [0.52,"slip"], [0.67,"hang"]],
      settledAnimation: "hang"
    },
    props: [
      {"id":"takeoff","art":"ledge-left","x":196,"y":202},
      {"id":"landing","art":"ledge-right","x":453,"y":202},
      {
        id: "tightrope",
        art: "rope",
        x: 324,
        y: 169,
        failure: [[0,{}], [0.49,{"cue":-0.85}], [0.73,{"cue":-0.77}], [1,{}]]
      }
    ]
  },
  {
    id: "athletics",
    name: "Atletismo",
    ability: "str",
    defaultDC: 12,
    terrain: "chasm",
    prompt: "Salta la grieta y aterriza al otro lado.",
    description: "Sirve para realizar esfuerzos físicos exigentes, como saltar más lejos de lo normal, nadar en aguas turbulentas o superar obstáculos mediante la fuerza.",
    actor: {
      x: 116,
      y: 202,
      ambient: [[0,{}]]
    },
    ambientAnimation: "run_loop",
    preparationAnimation: "idle_prepare",
    recoveryAnimation: "idle_breath",
    successAnimation: {
      animation: "run_loop",
      beats: [[0.16,"jump"], [0.9,"idle_breath"]],
      caption: "Salta la grieta y aterriza al otro lado.",
      actor: [[0,{}], [0.16,{"x":77}], [0.52,{"x":208,"y":-79}], [0.88,{"x":350}], [1,{"x":369}]],
      settledAnimation: "idle_breath"
    },
    failureAnimation: {
      animation: "run_loop",
      caption: "El salto se queda corto y cae entre la bruma de la grieta.",
      actor: [[0,{}], [0.16,{"x":77}], [0.4,{"x":184,"y":-72}], [0.59,{"x":270,"y":-30}], [0.74,{"x":305,"y":30}], [0.9,{"x":305,"y":120}], [1,{"x":305,"y":136,"opacity":0}]],
      beats: [[0.16,"jump"], [0.58,"slip"]],
      settledAnimation: "slip"
    },
    props: [
      {
        id: "takeoff",
        art: "ledge-left",
        x: 196,
        y: 202,
        ambient: [[0,{"cue":1}]],
        success: [[0,{}]],
        failure: [[0,{}]]
      },
      {"id":"landing","art":"ledge-right","x":453,"y":202},
      {
        id: "fall-mist",
        art: "fall-mist",
        x: 421,
        y: 238,
        front: true,
        ambient: [[0,{"opacity":0}]],
        failure: [[0,{"opacity":0}], [0.7,{"opacity":0}], [0.91,{"opacity":0.7}], [1,{"opacity":0.65}]]
      }
    ]
  },
  {
    id: "arcana",
    name: "Conocimiento arcano",
    ability: "int",
    defaultDC: 12,
    prompt: "Identifica la runa del cristal.",
    description: "Permite recordar información sobre conjuros, objetos mágicos y planos de existencia, ayudando a reconocer elementos relacionados con la magia.",
    actor: {
      x: 234,
      y: 202,
      ambient: [[0,{}]]
    },
    ambientAnimation: "idle_inspect",
    preparationAnimation: "idle_listen",
    recoveryAnimation: "idle_breath",
    successAnimation: {
      animation: "point",
      caption: "Identifica la runa y el cristal se ilumina.",
      actor: [[0,{}], [1,{}]],
      settledAnimation: "idle_breath"
    },
    failureAnimation: {
      animation: "idle_inspect",
      caption: "Confunde la runa y el cristal suelta humo.",
      actor: [[0,{}], [1,{}]],
      settledAnimation: "idle_breath"
    },
    props: [
      {
        id: "crystal",
        art: "crystal",
        x: 375,
        y: 118,
        ambient: [[0,{"y":-3,"tilt":-0.08}], [0.5,{"y":5,"tilt":0.1}], [1,{"y":-3,"tilt":-0.08}]],
        success: [[0,{}], [0.43,{"y":-7,"cue":1}], [1,{"y":-7,"cue":0.75}]],
        failure: [[0,{}], [0.48,{"tilt":0.25,"cue":0.8}], [0.65,{"tilt":-0.2}], [1,{"tilt":0.03}]]
      },
      {
        id: "smoke",
        art: "smoke",
        x: 367,
        y: 113,
        front: true,
        ambient: [[0,{"opacity":0}]],
        failure: [[0,{"opacity":0}], [0.43,{"opacity":0,"scale":0.2}], [0.65,{"opacity":0.9,"x":-43,"y":-19}], [1,{"opacity":0,"x":-84,"y":-35,"scale":1.55}]]
      }
    ]
  },
  {
    id: "persuasion",
    name: "Persuasión",
    ability: "cha",
    defaultDC: 12,
    prompt: "Convence al comerciante con buenos argumentos.",
    description: "Se utiliza para convencer a alguien mediante argumentos sinceros, diplomacia y amabilidad, buscando acuerdos sin amenazas ni engaños.",
    actor: {
      x: 267,
      y: 202,
      ambient: [[0,{}]]
    },
    ambientAnimation: "idle_talk",
    preparationAnimation: "idle_listen",
    recoveryAnimation: "idle_breath",
    successAnimation: {
      animation: "reach",
      caption: "El comerciante asiente y ambos estrechan la mano.",
      actor: [[0,{}], [0.2,{"x":18}], [1,{"x":18}]],
      settledAnimation: "reach",
      beats: [[0,"walk_loop"], [0.22,"reach"]]
    },
    failureAnimation: {
      animation: "idle_talk",
      caption: "El comerciante cruza los brazos y rechaza el acuerdo.",
      actor: [[0,{}], [1,{}]],
      settledAnimation: "idle_breath"
    },
    props: [
      {
        id: "merchant",
        art: "merchant",
        x: 367,
        y: 202,
        ambient: [[0,{}], [0.35,{}], [0.75,{}], [1,{}]],
        success: [[0,{}], [0.43,{"cue":1}], [1,{"cue":1}]],
        failure: [[0,{}], [0.4,{"cue":-0.6}], [0.56,{"cue":-1}], [0.73,{"cue":-1}], [1,{"cue":-1}]]
      },
      {"id":"table","art":"table","x":440,"y":202}
    ]
  },
  {
    id: "deception",
    name: "Engaño",
    ability: "cha",
    defaultDC: 12,
    prompt: "Haz que el guardia crea tu historia.",
    description: "Se utiliza para mentir de manera convincente, ocultar intenciones o conseguir que otras personas crean una identidad o historia falsa.",
    actor: {
      x: 240,
      y: 202,
      ambient: [[0,{}]]
    },
    ambientAnimation: "idle_talk",
    preparationAnimation: "idle_listen",
    recoveryAnimation: "idle_breath",
    successAnimation: {
      animation: "idle_talk",
      caption: "El guardia cree la historia y le abre el paso.",
      actor: [[0,{}], [1,{}]],
      settledAnimation: "idle_talk"
    },
    failureAnimation: {
      animation: "idle_talk",
      caption: "El sombrero se tuerce y el guardia señala el disfraz con sospecha.",
      actor: [[0,{}], [1,{}]],
      settledAnimation: "idle_talk"
    },
    props: [
      {
        id: "gate-guard",
        art: "guard",
        x: 396,
        y: 202,
        success: [[0,{}], [0.5,{"cue":1}], [1,{"cue":1}]],
        failure: [[0,{}], [0.56,{"x":-13,"cue":-1}], [1,{"x":-13,"cue":-1}]]
      }
    ]
  },
  {
    id: "history",
    name: "Historia",
    ability: "int",
    defaultDC: 12,
    prompt: "Reconoce el emblema del escudo antiguo.",
    description: "Ayuda a recordar acontecimientos históricos, civilizaciones, personajes importantes y símbolos del pasado que pueden explicar lugares u objetos antiguos.",
    actor: {
      x: 251,
      y: 202,
      ambient: [[0,{}]]
    },
    ambientAnimation: "idle_read",
    preparationAnimation: "idle_inspect",
    recoveryAnimation: "idle_read",
    successAnimation: {
      animation: "point",
      caption: "Reconoce el emblema y señala el símbolo.",
      actor: [[0,{}], [1,{}]],
      settledAnimation: "idle_read"
    },
    failureAnimation: {
      animation: "idle_read",
      caption: "Confunde el emblema y vuelve al pergamino.",
      actor: [[0,{}], [1,{}]],
      settledAnimation: "idle_read"
    },
    props: [
      {
        id: "old-heraldry",
        art: "heraldry",
        x: 395,
        y: 202,
        success: [[0,{}], [0.63,{"cue":1}], [1,{"cue":1}]]
      }
    ]
  },
  {
    id: "performance",
    name: "Interpretación",
    ability: "cha",
    defaultDC: 12,
    sound: "instrument",
    prompt: "Toca una melodía que cautive al público.",
    description: "Se utiliza para entretener mediante música, baile, teatro o narración, buscando captar la atención del público con una actuación.",
    actor: {
      x: 270,
      y: 202,
      ambient: [[0,{}]]
    },
    ambientAnimation: "idle_play",
    preparationAnimation: "idle_prepare",
    recoveryAnimation: "idle_play",
    successAnimation: {
      animation: "idle_play",
      caption: "La melodía gana fuerza y llegan los aplausos.",
      actor: [[0,{}], [1,{}]],
      settledAnimation: "idle_play"
    },
    failureAnimation: {
      animation: "idle_play",
      caption: "Desafina y una nota torcida cae al suelo.",
      actor: [[0,{}], [1,{}]],
      settledAnimation: "idle_play"
    },
    props: [
      {
        id: "music-notes",
        art: "notes",
        x: 320,
        y: 113,
        ambient: [[0,{"opacity":0}], [0.45,{"opacity":0.65,"x":18,"y":-19}], [1,{"opacity":0,"x":43,"y":-34}]],
        success: [[0,{"opacity":0}], [0.28,{"opacity":1,"cue":1}], [0.74,{"x":31,"y":-27,"cue":1}], [1,{"opacity":0,"x":49,"y":-40,"cue":1}]],
        failure: [[0,{"opacity":0}], [0.38,{"cue":-1,"tilt":-0.3}], [0.65,{"x":27,"y":60,"tilt":1.6,"cue":-1}], [1,{"x":37,"y":90,"tilt":2.2,"cue":-1}]]
      },
      {
        id: "audience-left",
        art: "audience",
        x: 397,
        y: 202,
        ambient: [[0,{}]],
        success: [[0,{}], [0.45,{"cue":1}], [1,{"cue":1}]],
        failure: [[0,{}], [0.5,{"cue":-1}], [1,{"cue":-1}]]
      }
    ]
  },
  {
    id: "intimidation",
    name: "Intimidación",
    ability: "cha",
    defaultDC: 12,
    prompt: "Haz retroceder al bandido con tu sola presencia.",
    description: "Sirve para influir en alguien mediante amenazas, gestos intimidantes o una presencia imponente, intentando que ceda sin necesidad de combatir.",
    actor: {
      x: 255,
      y: 202,
      ambient: [[0,{}]]
    },
    ambientAnimation: "idle_brace",
    preparationAnimation: "idle_prepare",
    recoveryAnimation: "idle_breath",
    successAnimation: {
      animation: "idle_brace",
      caption: "Se impone con su postura y el bandido huye.",
      actor: [[0,{}], [1,{}]],
      settledAnimation: "idle_breath"
    },
    failureAnimation: {
      animation: "idle_brace",
      caption: "El bandido se ríe del intento de asustarlo.",
      actor: [[0,{}], [1,{}]],
      settledAnimation: "idle_breath"
    },
    props: [
      {
        id: "bandit",
        art: "bandit",
        x: 384,
        y: 202,
        ambient: [[0,{}], [0.53,{}], [1,{}]],
        success: [[0,{}], [0.44,{"x":17,"cue":0.66}], [0.72,{"x":97,"cue":0.85}], [1,{"x":230,"opacity":0}]],
        failure: [[0,{}], [0.38,{"cue":-0.55}], [0.56,{"cue":-0.8}], [0.76,{"cue":-0.8}], [1,{"cue":-0.8}]]
      },
      {
        id: "bandit-laugh",
        art: "laughter",
        x: 393,
        y: 72,
        front: true,
        ambient: [[0,{"opacity":0}]],
        failure: [[0,{"opacity":0}], [0.4,{"opacity":0}], [0.65,{"opacity":1}], [1,{"opacity":1}]]
      }
    ]
  },
  {
    id: "investigation",
    name: "Investigación",
    ability: "int",
    defaultDC: 12,
    prompt: "Descubre qué palanca abre el mecanismo.",
    description: "Permite examinar pistas, relacionar indicios y deducir cómo funcionan mecanismos u objetos cuando la respuesta no resulta evidente.",
    actor: {
      x: 291,
      y: 202,
      ambient: [[0,{}]]
    },
    ambientAnimation: "idle_inspect",
    preparationAnimation: "idle_listen",
    recoveryAnimation: "idle_inspect",
    successAnimation: {
      animation: "hand_interact",
      caption: "Acciona la palanca correcta y el mecanismo se abre.",
      actor: [[0,{}], [0.23,{"x":22}], [1,{"x":22}]],
      settledAnimation: "idle_inspect",
      beats: [[0,"walk_loop"], [0.25,"hand_interact"]]
    },
    failureAnimation: {
      animation: "hand_interact",
      caption: "Mueve la palanca equivocada y sale disparado un muelle.",
      actor: [[0,{}], [0.23,{"x":22}], [0.6,{"x":22}], [1,{"x":22}]],
      settledAnimation: "idle_inspect",
      beats: [[0,"walk_loop"], [0.25,"hand_interact"], [0.6,"idle_breath"]]
    },
    props: [
      {
        id: "lever-box",
        art: "mechanism",
        x: 376,
        y: 202,
        success: [[0,{}], [0.44,{}], [0.72,{"cue":1}], [1,{"cue":1}]],
        failure: [[0,{}], [0.36,{}], [0.51,{"cue":-0.86}], [1,{"cue":-0.12}]]
      },
      {
        id: "released-spring",
        art: "spring",
        x: 379,
        y: 153,
        ambient: [[0,{"opacity":0}]],
        front: true,
        failure: [[0,{"opacity":0}], [0.44,{"opacity":0}], [0.64,{"x":-40,"y":-37,"tilt":-0.8}], [1,{"x":-116,"y":42,"tilt":-2.1}]]
      }
    ]
  },
  {
    id: "sleight-of-hand",
    name: "Juego de manos",
    ability: "dex",
    defaultDC: 12,
    prompt: "Haz desaparecer la moneda de tus manos.",
    description: "Se utiliza para manipular objetos discretamente, ocultar pequeñas cosas o realizar movimientos rápidos con las manos sin llamar la atención.",
    actor: {
      x: 272,
      y: 202,
      ambient: [[0,{}]]
    },
    ambientAnimation: "hand_interact",
    preparationAnimation: "idle_prepare",
    recoveryAnimation: "idle_breath",
    successAnimation: {
      animation: "hand_interact",
      caption: "Oculta la moneda y la muestra detrás de la oreja.",
      actor: [[0,{}], [1,{}]],
      settledAnimation: "idle_breath"
    },
    failureAnimation: {
      animation: "reach",
      caption: "La moneda resbala, rebota en el suelo y se escapa rodando.",
      actor: [[0,{}], [1,{}]],
      settledAnimation: "idle_breath"
    },
    props: [
      {"id":"coin-table","art":"table","x":381,"y":203},
      {
        id: "dropped-coin",
        art: "coin-roll",
        x: 305,
        y: 147,
        front: true,
        ambient: [[0,{"opacity":0}]],
        failure: [[0,{"opacity":0}], [0.36,{"opacity":0}], [0.39,{"opacity":1}], [0.5,{"x":24,"y":30,"tilt":2}], [0.56,{"x":44,"y":56,"tilt":4}], [0.65,{"x":79,"y":47,"tilt":6}], [0.74,{"x":116,"y":56,"tilt":9}], [1,{"x":390,"y":56,"tilt":24,"opacity":0}]]
      }
    ]
  },
  {
    id: "medicine",
    name: "Medicina",
    ability: "wis",
    defaultDC: 12,
    prompt: "Examina la herida y venda al compañero.",
    description: "Ayuda a diagnosticar enfermedades, examinar heridas de un compañero o identificar posibles causas de una muerte reciente mediante conocimientos médicos.",
    actor: {
      x: 310,
      y: 202,
      ambient: [[0,{}]]
    },
    ambientAnimation: "idle_inspect",
    preparationAnimation: "idle_prepare",
    recoveryAnimation: "idle_breath",
    successAnimation: {
      animation: "hand_interact",
      caption: "Examina la herida y coloca bien el vendaje.",
      actor: [[0,{}], [1,{}]],
      settledAnimation: "hand_interact"
    },
    failureAnimation: {
      animation: "hand_interact",
      caption: "Intenta vendar el brazo y se enreda con la venda.",
      actor: [[0,{}], [1,{}]],
      settledAnimation: "hand_interact"
    },
    props: [
      {
        id: "seated-companion",
        art: "patient",
        x: 384,
        y: 202,
        ambient: [[0,{"cue":0}]],
        success: [[0,{}], [0.7,{"cue":1}], [1,{"cue":1}]],
        failure: [[0,{"cue":0.75}], [0.7,{"cue":-1}], [1,{"cue":-1}]]
      }
    ]
  },
  {
    id: "nature",
    name: "Naturaleza",
    ability: "int",
    defaultDC: 12,
    prompt: "Identifica la planta por sus hojas.",
    description: "Permite recordar conocimientos sobre animales, plantas, terrenos y fenómenos climáticos para reconocer especies y comprender el entorno natural.",
    actor: {
      x: 294,
      y: 202,
      ambient: [[0,{}]]
    },
    ambientAnimation: "idle_crouch",
    preparationAnimation: "idle_crouch",
    recoveryAnimation: "idle_crouch",
    successAnimation: {
      animation: "point",
      caption: "Reconoce la especie y señala la planta correcta.",
      actor: [[0,{}], [0.22,{"x":20}], [1,{"x":20}]],
      settledAnimation: "idle_crouch",
      beats: [[0,"sneak_loop"], [0.25,"hand_interact"]]
    },
    failureAnimation: {
      animation: "idle_crouch",
      caption: "Se acerca a la otra planta y las esporas le hacen estornudar.",
      actor: [[0,{}], [0.23,{"x":28}], [1,{"x":28}]],
      settledAnimation: "slip",
      beats: [[0,"sneak_loop"], [0.24,"hand_interact"], [0.53,"slip"]]
    },
    props: [
      {
        id: "narrow-leaves",
        art: "plant-narrow",
        x: 347,
        y: 203,
        success: [[0,{}], [0.39,{}], [0.5,{"cue":1}], [0.7,{"cue":0.5}], [1,{"cue":0.3}]],
        failure: [[0,{}], [0.36,{}], [0.5,{"cue":1}], [0.68,{"cue":0.6}], [1,{"cue":0.35}]]
      },
      {
        id: "broad-leaves",
        art: "plant-broad",
        x: 365,
        y: 203,
        success: [[0,{}], [0.39,{}], [0.5,{"cue":1}], [0.7,{"cue":0.5}], [1,{"cue":0.3}]],
        failure: [[0,{}], [0.36,{}], [0.5,{"cue":1}], [0.68,{"cue":0.6}], [1,{"cue":0.35}]]
      },
      {
        id: "plant-spores",
        art: "spores",
        x: 365,
        y: 171,
        ambient: [[0,{"opacity":0}]],
        front: true,
        failure: [[0,{"opacity":0}], [0.42,{"opacity":0}], [0.64,{"x":-55,"y":-9}], [1,{"opacity":0,"x":-133,"y":-38}]]
      },
      {
        id: "plant-cluster-back",
        art: "plant-narrow",
        x: 407,
        y: 204,
        ambient: [[0,{"scale":0.67}]]
      },
      {
        id: "plant-cluster-side",
        art: "plant-broad",
        x: 429,
        y: 204,
        ambient: [[0,{"scale":0.5}]]
      }
    ]
  },
  {
    id: "perception",
    name: "Percepción",
    ability: "wis",
    defaultDC: 12,
    prompt: "Escucha y localiza la lechuza oculta.",
    description: "Sirve para detectar sonidos, movimientos y detalles difíciles de percibir utilizando la vista, el oído y los demás sentidos.",
    actor: {
      x: 235,
      y: 202,
      ambient: [[0,{}]]
    },
    ambientAnimation: "idle_listen",
    preparationAnimation: "idle_listen",
    recoveryAnimation: "idle_breath",
    successAnimation: {
      animation: "point",
      caption: "Oye el ruido, se gira y descubre la lechuza.",
      actor: [[0,{}], [1,{}]],
      settledAnimation: "idle_breath"
    },
    failureAnimation: {
      animation: "idle_listen_away",
      caption: "Mira hacia otro lado mientras la lechuza escapa por detrás.",
      actor: [[0,{}], [1,{}]],
      settledAnimation: "idle_breath"
    },
    props: [
      {
        id: "hiding-bush",
        art: "bush",
        x: 392,
        y: 203,
        front: true,
        ambient: [[0,{}], [0.4,{}], [0.5,{"cue":0.5}], [0.65,{}], [1,{}]]
      },
      {
        id: "hidden-owl",
        art: "owl",
        x: 393,
        y: 178,
        ambient: [[0,{"opacity":0}]],
        success: [[0,{"opacity":0}], [0.33,{"opacity":0}], [0.56,{"y":-38,"cue":0.5}], [1,{"y":-40}]],
        failure: [[0,{"opacity":0}], [0.31,{"opacity":0}], [0.54,{"x":-30,"y":-63,"cue":1}], [0.78,{"x":-150,"y":-118,"cue":1}], [1,{"x":-298,"y":-151,"cue":1,"opacity":0}]]
      }
    ]
  },
  {
    id: "insight",
    name: "Perspicacia",
    ability: "wis",
    defaultDC: 12,
    prompt: "Observa qué podría inquietar al viajero.",
    description: "Ayuda a interpretar gestos, emociones y comportamientos para comprender las posibles intenciones de otras personas durante una conversación.",
    actor: {
      x: 251,
      y: 202,
      ambient: [[0,{}]]
    },
    ambientAnimation: "idle_listen",
    preparationAnimation: "idle_listen",
    recoveryAnimation: "idle_breath",
    successAnimation: {
      animation: "idle_talk",
      caption: "Percibe la inquietud y responde con comprensión.",
      actor: [[0,{}], [1,{}]],
      settledAnimation: "idle_breath"
    },
    failureAnimation: {
      animation: "idle_talk",
      caption: "Pasa por alto la inquietud y sonríe despreocupado.",
      actor: [[0,{}], [1,{}]],
      settledAnimation: "idle_breath"
    },
    props: [
      {
        id: "worried-traveler",
        art: "traveler",
        x: 382,
        y: 202,
        ambient: [[0,{"cue":-0.38}], [0.39,{"cue":-0.67}], [0.78,{"cue":-0.43}], [1,{"cue":-0.38}]],
        success: [[0,{"cue":-0.38}], [0.57,{"cue":-0.1}], [1,{"cue":0.12}]],
        failure: [[0,{"cue":-0.38}], [0.46,{"cue":-0.57}], [1,{"cue":-0.9}]]
      }
    ]
  },
  {
    id: "religion",
    name: "Religión",
    ability: "int",
    defaultDC: 12,
    prompt: "Identifica el símbolo del altar.",
    description: "Permite recordar conocimientos sobre dioses, símbolos sagrados, rituales y tradiciones religiosas para comprender ceremonias y lugares de culto.",
    actor: {
      x: 252,
      y: 202,
      ambient: [[0,{}]]
    },
    ambientAnimation: "idle_read",
    preparationAnimation: "idle_listen",
    recoveryAnimation: "idle_read",
    successAnimation: {
      animation: "idle_breath",
      caption: "Reconoce el símbolo y se inclina con respeto.",
      actor: [[0,{}], [1,{}]],
      settledAnimation: "idle_read"
    },
    failureAnimation: {
      animation: "idle_read",
      caption: "Pasa páginas, gira el libro y sigue sin reconocerlo.",
      actor: [[0,{}], [1,{}]],
      settledAnimation: "idle_read"
    },
    props: [
      {"id":"shrine","art":"altar","x":391,"y":202}
    ]
  },
  {
    id: "stealth",
    name: "Sigilo",
    ability: "dex",
    defaultDC: 12,
    prompt: "Pasa detrás del guardia sin hacer ruido.",
    description: "Se usa para esconderse, caminar silenciosamente y evitar ser detectado cuando una criatura podría ver u oír al personaje.",
    actor: {
      x: 187,
      y: 202,
      ambient: [[0,{}], [0.46,{"x":26}], [0.51,{"x":26,"facing":-1}], [0.97,{"facing":-1}], [1,{}]]
    },
    ambientAnimation: "sneak_loop",
    preparationAnimation: "idle_crouch",
    recoveryAnimation: "idle_crouch",
    successAnimation: {
      animation: "sneak_loop",
      caption: "Pasa detrás del guardia sin que lo advierta.",
      actor: [[0,{}], [1,{"x":302}]],
      settledAnimation: "idle_crouch"
    },
    failureAnimation: {
      animation: "sneak_loop",
      caption: "Pisa la piedra y el guardia se vuelve al instante.",
      actor: [[0,{}], [0.42,{"x":117}], [1,{"x":117}]],
      settledAnimation: "idle_crouch",
      beats: [[0.46,"idle_crouch"]]
    },
    props: [
      {
        id: "loose-stone",
        art: "pebble",
        x: 307,
        y: 201,
        failure: [[0,{}], [0.42,{}], [0.59,{"x":9,"tilt":0.4}], [1,{"x":13,"tilt":0.6}]]
      },
      {
        id: "sleepy-guard",
        art: "sleepy-guard",
        x: 386,
        y: 202,
        front: true,
        ambient: [[0,{"cue":-1,"facing":-1}]],
        failure: [[0,{"cue":-1,"facing":-1}], [0.42,{"cue":-1,"facing":-1}], [0.62,{"cue":0.64}], [1,{"cue":0.75}]]
      },
      {
        id: "stone-noise",
        art: "sound",
        x: 319,
        y: 190,
        ambient: [[0,{"opacity":0}]],
        front: true,
        failure: [[0,{"opacity":0}], [0.42,{"opacity":0}], [0.53,{}], [0.8,{"y":-15,"opacity":0}], [1,{"opacity":0}]]
      }
    ]
  },
  {
    id: "survival",
    name: "Supervivencia",
    ability: "wis",
    defaultDC: 12,
    prompt: "Distingue el rastro correcto y síguelo.",
    description: "Ayuda a seguir huellas, encontrar caminos seguros, conseguir alimento y reconocer peligros naturales mientras se exploran territorios desconocidos.",
    actor: {
      x: 210,
      y: 202,
      ambient: [[0,{}]]
    },
    ambientAnimation: "idle_crouch",
    preparationAnimation: "idle_listen",
    recoveryAnimation: "idle_crouch",
    successAnimation: {
      animation: "walk_loop",
      caption: "Distingue el rastro correcto y empieza a seguirlo.",
      actor: [[0,{}], [0.2,{}], [1,{"x":251}]],
      settledAnimation: "idle_listen",
      beats: [[0,"idle_crouch"], [0.2,"walk_loop"]]
    },
    failureAnimation: {
      animation: "walk_loop",
      caption: "Sigue el rastro equivocado y acaba en el mismo sitio.",
      actor: [[0,{}], [0.15,{}], [0.5,{"x":126}], [0.58,{"x":126,"facing":-1}], [1,{"facing":-1}]],
      settledAnimation: "idle_crouch",
      beats: [[0,"idle_crouch"], [0.15,"walk_loop"], [0.95,"idle_crouch"]]
    },
    props: [
      {
        id: "boot-trail",
        art: "tracks-boot",
        x: 279,
        y: 210,
        success: [[0,{}], [0.45,{"cue":0.7}], [1,{"cue":0.8}]]
      },
      {
        id: "paw-trail",
        art: "tracks-paw",
        x: 270,
        y: 214,
        failure: [[0,{}], [0.36,{"cue":0.7}], [0.77,{}], [1,{}]]
      },
      {
        id: "trail-marker",
        art: "sign",
        x: 428,
        y: 202,
        success: [[0,{}], [0.56,{"cue":0.8}], [1,{"cue":0.8}]]
      }
    ]
  },
  {
    id: "animal-handling",
    name: "Trato con animales",
    ability: "wis",
    defaultDC: 12,
    prompt: "Calma al caballo antes de acercarte.",
    description: "Se utiliza para tranquilizar, guiar o adiestrar animales, como calmar a un caballo nervioso para que permita acercarse.",
    actor: {
      x: 268,
      y: 202,
      ambient: [[0,{}]]
    },
    ambientAnimation: "idle_reach",
    preparationAnimation: "idle_listen",
    recoveryAnimation: "idle_breath",
    successAnimation: {
      animation: "reach",
      caption: "El caballo se calma, baja la cabeza y acepta una caricia.",
      actor: [[0,{}], [0.22,{"x":15}], [1,{"x":15}]],
      settledAnimation: "reach",
      beats: [[0,"walk_loop"], [0.23,"reach"]]
    },
    failureAnimation: {
      animation: "reach",
      caption: "El caballo le empuja con el hocico y retrocede sorprendido.",
      actor: [[0,{}], [0.25,{"x":15}], [0.58,{"x":15}], [0.8,{"x":-5}], [1,{"x":-5}]],
      settledAnimation: "idle_breath",
      beats: [[0,"walk_loop"], [0.25,"reach"], [0.57,"slip"]]
    },
    props: [
      {
        id: "nervous-horse",
        art: "horse",
        x: 395,
        y: 203,
        ambient: [[0,{}]],
        success: [[0,{}], [0.35,{"cue":0.4}], [0.6,{"cue":1}], [1,{"cue":1}]],
        failure: [[0,{}], [0.36,{"cue":0.35}], [0.57,{"cue":-1}], [0.8,{"cue":-1}], [1,{"cue":-0.5}]]
      }
    ]
  }
];
