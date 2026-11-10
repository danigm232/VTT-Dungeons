export type SkillLoreCategory = 'habilidad' | 'historia' | 'monstruos';

export type SkillLoreEntry = {
  habilidad: string;
  historia: string;
  monstruos: string;
};

export const skillLoreDatabase: Record<string, SkillLoreEntry> = {
  acrobatics: {
    habilidad: 'Acrobacias (Destreza): Permite mantener el equilibrio en salientes estrechos, cornisas de hielo y superficies resbaladizas, o amortiguar caídas.',
    historia: 'Los acantilados de basalto del Retiro del Dragón son escarpados y están cubiertos de salitre marino; un paso en falso puede precipitarte al oleaje.',
    monstruos: 'Zombis Náufragos: Su paso es torpe y pesado. Usar el terreno elevado y desniveles estrechos impide que te rodeen en número.'
  },
  athletics: {
    habilidad: 'Atletismo (Fuerza): Rige los esfuerzos físicos extremos: trepar riscos, nadar contra corrientes impetuosas, saltar grietas o empujar enemigos.',
    historia: 'El pecio de la Rosa de los Vientos se partió contra el arrecife; solo los nadadores con una fuerza tenaz logran salir del agua sin golpearse contra las rocas.',
    monstruos: 'Zombis Ahogados: Aunque lentos, tienen un agarre férreo. Emplea la fuerza atlética para zafarte de sus garras antes de que te arrastren.'
  },
  arcana: {
    habilidad: 'Conocimiento Arcano (Inteligencia): Permite recordar información sobre conjuros, objetos mágicos, planos de existencia y misterios sobrenaturales.',
    historia: 'La Isla de las Tempestades nació del choque entre titánicos dragones de leyenda. Una débil resonancia de magia ancestral aún palpita en sus cavernas.',
    monstruos: 'Mefits de Humo y Vapor: Seres elementales del fuego y el agua. Al ser destruidos explotan en una ráfaga abrasadora; atácalos a distancia.'
  },
  history: {
    habilidad: 'Historia (Inteligencia): Te ayuda a recordar hechos del pasado, civilizaciones caídas, linajes legendarios, guerras y el significado de viejos emblemas.',
    historia: 'El claustro del Retiro del Dragón fue fundado como un refugio sagrado para buscar la sabiduría y la paz entre forasteros de todos los orígenes.',
    monstruos: 'Marineros Caídos: Las almas de los barcos naufragados a veces quedan atrapadas por maldiciones. Conocer sus ritos mortuorios alivia su inquietud.'
  },
  investigation: {
    habilidad: 'Investigación (Inteligencia): Permite deducir la función de mecanismos, hallar compartimentos ocultos y descifrar enigmas a partir de pistas sutiles.',
    historia: 'Bajo las cubiertas anegadas del navío naufragado se esconden diarios de navegación y cofres protegidos con cerrojos ingeniosos.',
    monstruos: 'Mefits Camuflados: Se confunden con las fumarolas calientes de las grietas. Un examen atento del vapor delata su presencia antes de una emboscada.'
  },
  nature: {
    habilidad: 'Naturaleza (Inteligencia): Evalúa tu conocimiento sobre fauna, flora, ciclos climáticos, terrenos volcánicos y criaturas del mundo natural.',
    historia: 'La tierra volcánica de la isla alimenta especies vegetales únicas; ciertas algas y musgos costeros poseen extraordinarias propiedades curativas.',
    monstruos: 'Micónidos y Hongos: Criaturas pacíficas si no se profana su hábitat. Se comunican mediante esporas flotantes en lugar de palabras.'
  },
  religion: {
    habilidad: 'Religión (Inteligencia): Proporciona conocimiento sobre dioses, ritos sagrados, símbolos divinos, planos celestiales y la naturaleza de los no-muertos.',
    historia: 'La Anciana Runara y los residentes del santuario veneran a Bahamut, el Dragón de Platino de la compasión, la rectitud y la justicia.',
    monstruos: 'Firmeza Zombi: Los no-muertos pueden resistir un golpe fatal gracias a su oscura tenacidad, pero el daño radiante anula esta facultad por completo.'
  },
  animal_handling: {
    habilidad: 'Trato con Animales (Sabiduría): Ayuda a calmar a una bestia asustada, intuir sus intenciones o evitar que una montura entre en pánico.',
    historia: 'Las aves marinas anidan en los riscos de basalto; con calma y algo de pescado fresco no representan peligro para los exploradores respetuosos.',
    monstruos: 'Carroñeros de Costa: Pequeñas criaturas y gaviotas hambrientas rondan los restos del pecio; defenderán con furia sus presas si te acercas demasiado.'
  },
  insight: {
    habilidad: 'Intuición (Sabiduría): Permite calibrar el lenguaje corporal, las vacilaciones y el tono de voz para descubrir intenciones sinceras u ocultas.',
    historia: 'En el Retiro del Dragón se valora la paz y la honestidad. Escuchar con atención a sus habitantes revela las inquietudes que callan.',
    monstruos: 'Kobolds Vigilantes: Criaturas tímidas y desconfiadas. Interpretar sus miradas nerviosas ayuda a saber si huyen despavoridas o preparan una treta.'
  },
  medicine: {
    habilidad: 'Medicina (Sabiduría): Permite diagnosticar enfermedades, tratar heridas y estabilizar a un compañero agonizante a 0 PG con una prueba de CD 10.',
    historia: 'El dispensario del santuario ofrece cataplasmas y ungüentos a los náufragos que alcanzan exhaustos las orillas de la isla.',
    monstruos: 'Esporas Alucinógenas: Ciertas criaturas liberan toxinas que nublan la mente. Cubrirse nariz y boca con un paño húmedo reduce el riesgo de contagio.'
  },
  perception: {
    habilidad: 'Percepción (Sabiduría): Determina lo que puedes ver, escuchar o percibir con tus sentidos: susurros lejanos, trampas ocultas o enemigos al acecho.',
    historia: 'El rugido de la resaca contra las rocas ensordece los acantilados; aguzar la vista entre la bruma es indispensable para no perder el rumbo.',
    monstruos: 'Acechadores en el Agua: Los zombis del pecio aguardan inmóviles bajo el agua turbia; presta atención a las burbujas y al chapoteo irregular.'
  },
  survival: {
    habilidad: 'Supervivencia (Sabiduría): Esencial para rastrear huellas en arena o barro, orientarse en la niebla, pronosticar el clima y hallar agua potable.',
    historia: 'El tiempo en la Isla de las Tempestades es voluble: una mañana soleada puede convertirse rápidamente en una borrasca con vientos cortantes.',
    monstruos: 'Rastros de Ceniza: Los mefits dejan trazas de azufre y ceniza en la piedra volcánica. Detectar sus marcas permite rodear sus madrigueras sin peligro.'
  },
  deception: {
    habilidad: 'Engaño (Carisma): Mide tu capacidad para ocultar la verdad con palabras o gestos convincentes, fabricar una coartada o despistar a oponentes.',
    historia: 'En un refugio de puertas abiertas como el santuario, la mentira genera rechazo, pero ante enemigos hostiles una buena farsa salva vidas.',
    monstruos: 'Jerarquía Kobold: Los kobolds respetan y temen a los dragones; simular la autoridad de un emisario dracónico puede desconcertarlos temporalmente.'
  },
  intimidation: {
    habilidad: 'Intimidación (Carisma): Permite disuadir a otros de iniciar una pelea o forzar una tregua mediante una demostración contundente de presencia y valor.',
    historia: 'La presencia de la Anciana Runara impone una reverencia natural sin alzar la voz; en el claustro, los aspavientos agresivos son mal vistos.',
    monstruos: 'Cobardía en Desventaja: Los esbirros menores rehúyen el combate si ven caer a su líder o si se enfrentan a un rugido o fulgor llameante intimidatorio.'
  },
  performance: {
    habilidad: 'Actuación (Carisma): Deleita al público mediante música, narración oral o poesía, levantando la moral de tus compañeros durante los descansos.',
    historia: 'Al caer la noche sobre el campamento del claustro, los relatos de viajes antiguos alrededor de las hogueras reconfortan a los recién llegados.',
    monstruos: 'Vibraciones y Armonía: Ciertas criaturas del sotobosque marino se apaciguan ante tonos melódicos suaves, evitando un enfrentamiento innecesario.'
  },
  persuasion: {
    habilidad: 'Persuasión (Carisma): Ayuda a negociar acuerdos justos, mediar en desacuerdos y convencer a aliados potenciales mediante la razón y la empatía.',
    historia: 'La paciencia y el respeto hacia las costumbres del santuario facilitan el apoyo de sus clérigos y la provisión de suministros de viaje.',
    monstruos: 'Diplomacia con Kobolds: Aunque recelosos de los forasteros armados, responderán amistosamente si les ofreces baratijas brillantes o comida.'
  },
  sleight_of_hand: {
    habilidad: 'Juego de Manos (Destreza): Permite manipular objetos discretamente, escamotear pequeñas piezas o forzar cerraduras delicadas con sigilo.',
    historia: 'Los cerrojos de las arcas del naufragio están oxidados; un toque delicado evita que la ganzúa se parta en el tambor de la cerradura.',
    monstruos: 'Objetos en Cadáveres: Los náufragos conservan a veces llaves de latón en sus cinturones; unos dedos ágiles pueden sustraerlas sin alertarlos.'
  },
  stealth: {
    habilidad: 'Sigilo (Destreza): Te permite pasar inadvertido a la vista y el oído, aprovechando las sombras, la niebla o la cobertura del entorno.',
    historia: 'Las brumas espesas del amanecer ofrecen un camuflaje ideal para deslizarse entre las rocas de la playa sin llamar la atención desde lo alto.',
    monstruos: 'Baja Percepción Zombi: La percepción pasiva de los no-muertos es reducida. Avanzar sigilosamente te permite sorprenderlos con ataques con ventaja.'
  }
};

export function getSkillLore(skillId: string): SkillLoreEntry {
  return skillLoreDatabase[skillId] ?? {
    habilidad: 'Aprovecha las habilidades de tu personaje para superar obstáculos de exploración e interactuar con el entorno.',
    historia: 'La Isla de las Tempestades guarda incontables secretos de la era de los dragones esperando a ser descubiertos.',
    monstruos: 'Estudia los movimientos de las criaturas antes de entrar en combate para explotar sus debilidades.'
  };
}
