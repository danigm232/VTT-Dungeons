extends RefCounted

## Short original lines based on the inhabitants in chapter 1, pp. 8–12.
## Each option is spoken by the active hero. An optional third value cues a
## gesture at the resident's workstation.
const TOPICS := {
	"runara": [
		["¿Dónde podemos descansar?", "Hay una celda libre al oeste de la plaza. También podéis dormir en el templo y acompañarnos a comer en el comedor."],
		["¿A quién representa la estatua?", "A Astalagan, un dragón de bronce que murió en estos acantilados hace siglos."],
		["¿En qué podemos ayudar?", "Tarak está preocupado por Pleamar. Varnoth y Rix vieron el último naufragio. Si miráis al norte, buscad también el pecio antiguo, el Rosa de los Vientos."],
	],
	"tarak": [
		["¿Qué estás cultivando?", "Hierbas para la mesa y para el botiquín. Ven, mira el reverso de esta hoja.", "retreat_tend"],
		["¿Qué ocurre en Pleamar?", "Los micónidos tienen un pulpo cubierto de hongos en la entrada. Quisiera saber por qué se han encerrado y conseguir algunos hongos de sombrero de corazón."],
		["¿De dónde vienen tus tatuajes?", "Hace mucho de eso. Prefiero que hablemos del jardín."],
		["¿Qué estás cocinando?", "El guiso del comedor. Cuando tiene buen fondo, basta un poco de hierba fresca.", "retreat_cook"],
	],
	"varnoth": [
		["¿En qué estás trabajando?", "El viento ha metido sal entre las piedras. Con un cepillo y tiempo podremos salvar esta pieza.", "retreat_masonry"],
		["¿Qué viste desde el templo?", "El barco viró bruscamente antes de llegar a las rocas del norte. Rix estaba aquí conmigo."],
		["¿Crees que las personas pueden cambiar?", "Sí. Lo difícil es actuar de un modo distinto cuando regresan los viejos problemas. Sentaos, me interesa lo que pensáis."],
	],
	"myla": [
		["¿Cómo funciona ese mecanismo?", "Acercaos al banco. Fijaos en lo que ocurre cuando el diente pequeño engrana con el grande.", "retreat_tinker"],
		["¿Tienes equipo para vender?", "Puedo hacerme con equipo corriente. Decidme qué buscáis y hablamos del precio."],
		["¿Qué estudias aquí?", "Ingeniería, alquimia y algo de magia. Si un montaje falla, anoto dónde cedió antes de volver a intentarlo."],
	],
	"agga": [
		["¿Cómo podemos echar una mano?", "Dejad libres los umbrales. Si Frub se ofrece a ayudar, dadle un encargo claro."],
		["¿Dónde se reúne todo el mundo?", "En el comedor cuando toca comer. Al bajar el sol mirad también por la plaza."],
	],
	"blepp": [
		["¿Qué estás vigilando?", "La bajada a la playa. Desde aquí se ve quién viene por el camino.", "retreat_watch"],
		["¿Qué tiene de especial tu daga?", "Es mi daga de la suerte. Puede pareceros corriente, pero esperad a verla salvarme el pellejo."],
	],
	"frub": [
		["¿Quieres ayudar con los recados?", "¡Sí! Puedo dar una vuelta por la plaza. ¿Alguien ha contado las cosas que faltan para la cena?"],
		["¿Qué quieres saber de nosotros?", "¿Habéis venido en barco? ¿Tiene nombre? ¿Quién os enseñó a navegar?"],
	],
	"kilnip": [
		["¿Quieres charlar un rato?", "Siempre. Empezad por donde queráis. Llevo despierta desde mucho antes del primer desayuno."],
		["¿Quién cocina hoy?", "Ojalá sea Tarak. Si sale olor a hierbas de la cocina, puede que tengamos suerte."],
	],
	"laylee": [
		["¿Me enseñas tus herramientas?", "Esta se usa para sacar la pieza sin doblar el eje. Mirad cómo la sujeto.", "retreat_sort"],
		["¿Qué haces en el taller?", "Ayudo a Myla a montar sus inventos. Me deja las herramientas de mano y ella se encarga del fuego alquímico."],
	],
	"mumpo": [
		["¿Qué haces en la plaza?", "Doy la vuelta entera, incluso paso por el mirador. Agga dice que me quede en el sendero."],
		["¿Nunca te da miedo?", "A veces. Si me quedo quieto, tengo más tiempo para pensar en ello."],
	],
	"rix": [
		["¿Cómo se hace una ofrenda?", "Dejad sitio para quien venga después. Yo me encargo del incienso junto al altar.", "retreat_incense"],
		["¿Qué pasó con el barco?", "Viró en dirección a las rocas del norte. Varnoth lo vio también. Desde aquí se apreciaba bien el cambio de rumbo."],
	],
	"zark": [
		["¿Qué estás haciendo?", "Reviso que nadie deje trastos en mitad del paso. Así que levanta ese pie, aliento de asgo."],
		["¿Dónde está el comedor?", "Por el paseo de arriba. Cuando huela bien, sigue el olor."],
	],
}

## Ganchos personales del módulo (pp. 12–13 y 47) añadidos al final según el PJ activo.
const HERO_TOPICS := {
	"mia": {
		"runara": [
			["He soñado con una sombra de muerte en esta isla.", "Los no muertos de la orilla nacen de un viejo dolor en el pecio del norte, el Rosa de los Vientos. Si queréis darle descanso, mirad también el cementerio del acantilado noroeste donde yace Brastos."],
		],
		"varnoth": [
			["¿Qué sabes del cementerio del acantilado noroeste?", "Subiendo al oeste del templo de Bahamut hay unas pocas lápidas de madera cubiertas de flores blancas. Allí reposa Brastos, marido de la capitana del Rosa de los Vientos."],
		],
	},
	"trinity": {
		"tarak": [
			["[Criminal] Reconozco el nudo dorado en tu cuello: el Cadalso Dorado.", "Tarak baja la voz y aparta la mirada hacia el huerto: «Dejé atrás el veneno y al gremio tras un encargo que acabó en tragedia. Busco redención aquí; si perseguís viejos botines, no los encontraréis en mis macetas.»"],
		],
		"runara": [
			["¿Conoces el gremio del Cadalso Dorado?", "El claustro acoge a quien busca dejar atrás su pasado. Si un hermano guarda viejas heridas, prefiero que sea él quien decida contarlas."],
		],
	},
	"mike": {
		"runara": [
			["Traigo una carta sobre el Observatorio oriental de la isla.", "El Observatorio guarda recuerdos muy peligrosos. Ayudad antes al claustro en Pleamar o en el pecio del norte; cuando sepamos que podemos confiar en vosotros, os daré la llave de piedra lunar."],
		],
		"myla": [
			["¿Has estudiado el Observatorio al este?", "Consulto su astrolabio en la biblioteca siempre que puedo, pero el acceso exige la llave de piedra lunar que custodia Runara."],
		],
	},
}

## Temas desbloqueados al descubrir secretos e indicios físicos del Retiro (añadidos al final sin alterar índices previos).
const CLUE_TOPICS := {
	"tarak_daggers": {
		"tarak": [
			["Encontré tres dagas escondidas bajo el suelo de tu celda.", "Tarak guarda silencio un instante antes de suspirar: «Eran de otra vida, cuando servía al Cadalso Dorado. No pienso volver a empuñarlas, pero no os haré mentir: mantened esto entre nosotros.»"],
		],
	},
	"varnoth_sword": {
		"varnoth": [
			["Vi una espada corta desgastada bajo tu colchón.", "Varnoth esboza una sonrisa severa: «Viejas costumbres de capitana mercenaria. Aquí solo manejo mazo y cincel, aunque una veterana nunca olvida del todo cómo defender su hogar.»"],
		],
	},
	"brastos_grave": {
		"runara": [
			["Visitamos la tumba de Brastos en el acantilado noroeste.", "Runara inclina la cabeza con tristeza: «Brastos llegó moribundo tras el naufragio. Si ayudáis a su esposa Aleitha a descansar en el Rosa de los Vientos, la isla entera os lo agradecerá.»"],
		],
	},
	"laylee_scorch": {
		"laylee": [
			["¿Esa marca de hollín en la cocina es tuya?", "Laylee esconde las garras tras la espalda: «¡Fue solo un experimento pequeño con aceite! Myla me quitó el mechero, pero juro que la olla quedó casi intacta.»"],
		],
		"myla": [
			["Leímos tu tablilla de advertencia sobre Laylee en A3.", "Myla niega con la cabeza medio divertida: «Bastó distraerme un minuto para que Laylee intentase destilar aceite de lámpara junto al fogón. Desde entonces le cuento hasta las cerillas.»"],
		],
	},
}

## Exchanges require clear sight and a nearby audience, and play one line at
## a time while both speakers stop and face one another.
const EXCHANGES := [
	{"id": "daga", "phases": ["day"], "pair": ["blepp", "kilnip"], "lines": [
		"Mi daga me avisa cuando viene el peligro.",
		"¿Puede avisarme cuando consiga dormir tres horas seguidas?",
		"Eso se lo puedes pedir a la cena.",
	]},
	{"id": "recados", "phases": ["dusk", "night"], "pair": ["agga", "frub"], "lines": [
		"Frub, comprueba que el paso al comedor esté libre.",
		"¿Y el que baja al muelle? ¿Y el lado de la estatua?",
		"Empieza por el comedor.",
	]},
	{"id": "cena", "phases": ["dusk"], "pair": ["tarak", "kilnip"], "lines": [
		"Cuando estén las hierbas, podemos poner la mesa.",
		"Te guardo un sitio. ¿Queda algo que pueda cortar mientras hablamos?",
		"Un poco de pan nos vendría bien.",
	]},
	{"id": "biblioteca", "phases": ["dusk"], "pair": ["varnoth", "myla"], "lines": [
		"Deja el libro abierto, Myla. Aún estoy mirando el dibujo.",
		"Si encuentro la medida de la rueda, por fin sabré por qué se atasca la mía.",
		"Primero el dibujo. Luego lo probamos en el taller.",
	]},
	{"id": "ofrenda", "phases": ["dusk", "night"], "pair": ["runara", "rix"], "lines": [
		"Gracias por preparar el altar, Rix. Hoy vendrán viajeros.",
		"He dejado sitio para todos. La última ofrenda fue un éxito de incienso.",
		"Guardemos una brasa por si llegan tarde.",
	]},
	{"id": "taller", "phases": ["night"], "pair": ["myla", "laylee"], "lines": [
		"Prueba el engranaje pequeño. El grande está bien ajustado.",
		"Lo haré con las pinzas. El brasero te lo dejo a ti.",
		"De acuerdo. Sujétalo mientras compruebo el eje.",
	]},
	{"id": "mirador", "phases": ["dusk", "night"], "pair": ["mumpo", "zark"], "lines": [
		"¿Ves aquel extremo del camino? Llegaría antes que tú.",
		"Llegarías antes al cubo de la escoba. Deja de ponerte en medio.",
		"Entonces acabemos la ronda primero.",
	]},
]
