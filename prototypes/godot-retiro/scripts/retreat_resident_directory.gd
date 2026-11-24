extends RefCounted

## Stations are scene staging. The residents and their occupations are from
## chapter 1 of the adventure, pp. 8–12.
const WELCOME := "welcome"
const STATIONS := {
	"welcome": [Vector3(100.5, 9.0, 93.45), Vector3(0, 0, 1), "retreat_greet"],
	"scriptorium": [Vector3(106.15, 18.0, 57.8), Vector3(0.45, 0, -1), "retreat_study"],
	"runara_temple": [Vector3(44.8, 27.0, 65.25), Vector3(-0.45, 0, 1), "retreat_meditate"],
	"tarak_garden": [Vector3(93.2, 9.0, 90.9), Vector3(0.3, 0, -1), "retreat_tend"],
	"tarak_kitchen": [Vector3(122.05, 18.0, 54.8), Vector3(-1, 0, -0.45), ""],
	"tarak_cell": [Vector3(89.75, 9.0, 85.35), Vector3(-1, 0, -0.25), "retreat_tend"],
	"varnoth_temple": [Vector3(36.7, 27.0, 65.4), Vector3(1, 0, -0.25), "retreat_masonry"],
	"varnoth_library": [Vector3(102.75, 18.0, 57.4), Vector3(0.9, 0, -0.35), ""],
	"varnoth_cell": [Vector3(101, 9.0, 85.8), Vector3(-1, 0, -0.3), ""],
	"myla_bench": [Vector3(112.6, 9.0, 81.4), Vector3(0.35, 0, -1), "retreat_tinker"],
	"myla_books": [Vector3(95.3, 18.0, 57.6), Vector3(0, 0, -1), ""],
	"laylee_bench": [Vector3(114.0, 9.0, 81.05), Vector3(-0.4, 0, -1), "retreat_sort"],
	"agga_cell": [Vector3(119.9, 9.0, 85.8), Vector3(1, 0, 1), ""],
	"blepp_cell": [Vector3(121.5, 9.0, 86), Vector3(-1, 0, 1), ""],
	"frub_cell": [Vector3(124, 9.0, 83.65), Vector3(-1, 0, 0), ""],
	"kilnip_cell": [Vector3(124.75, 9.0, 86.45), Vector3(-1, 0, 0.5), ""],
	"laylee_cell": [Vector3(128.9, 9.0, 85.8), Vector3(1, 0, 0.25), ""],
	"mumpo_cell": [Vector3(130.15, 9.0, 84.15), Vector3(1, 0, 1), ""],
	"rix_cell": [Vector3(130.35, 9.0, 85.85), Vector3(0, 0, -1), ""],
	"zark_cell": [Vector3(133.85, 9.0, 85.7), Vector3(-1, 0, 0.5), ""],
	"agga_plaza": [Vector3(119, 9.0, 91.65), Vector3(1, 0, 0.7), ""],
	"blepp_lookout": [Vector3(108.4, 9.0, 91.5), Vector3(-0.7, 0, 1), ""],
	"frub_plaza": [Vector3(124.2, 9.0, 92.75), Vector3(-0.9, 0, 0.75), ""],
	"kilnip_dining": [Vector3(125.6, 18.0, 58.7), Vector3(-1, 0, 0), ""],
	"mumpo_plaza": [Vector3(128.2, 9.0, 92.0), Vector3(-1, 0, 0.65), ""],
	"rix_temple": [Vector3(42.3, 27.0, 65.55), Vector3(-0.65, 0, -1), "retreat_incense"],
	"zark_plaza": [Vector3(132.75, 9.0, 92.1), Vector3(-1, 0, 0.15), ""],
}

## Day, dusk and night. Each entry is a single resident with its own identity.
const RESIDENTS := {
	"runara": {
		"name": "Runara", "job": "Guía del claustro", "stations": ["scriptorium", "runara_temple", "runara_temple"],
		"welcome": "Bienvenidos. Podéis comer con nosotros y descansar en la celda libre o en el templo.",
		"dialogue": [
			"Aquí buscamos una vida en paz. ¿Qué os ha traído a la isla?",
			"La biblioteca guarda relatos de la isla. Si tenéis preguntas, podemos consultarlos.",
			"La estatua de la plaza representa a Astalagan, un dragón de bronce.",
		],
	},
	"tarak": {
		"name": "Tarak", "job": "Jardinero y herbolario", "stations": ["tarak_garden", "tarak_kitchen", "tarak_cell"],
		"dialogue": [
			"Cuido las hierbas y verduras del claustro. Si queréis, os enseño a distinguir las hojas.",
			"Me preocupan los micónidos de Pleamar. Hace tiempo que no puedo ir a buscar sus hongos de corazón.",
		],
	},
	"varnoth": {
		"name": "Varnoth Wender", "job": "Mantenimiento del templo", "stations": ["varnoth_temple", "varnoth_library", "varnoth_cell"],
		"dialogue": [
			"El templo se conserva con paciencia. Lo mismo diría de una segunda oportunidad.",
			"Vi cómo un barco cambió de rumbo y se estrelló al norte. Rix también lo vio.",
		],
	},
	"myla": {
		"name": "Myla", "job": "Manitas y comerciante", "stations": ["myla_bench", "myla_books", "myla_bench"],
		"dialogue": [
			"Un diente mal ajustado y todo el mecanismo se atasca. ¿Venís a buscar equipo?",
			"También estudio alquimia y magia. Si queréis ver mis herramientas, hablemos en el taller.",
		],
	},
	"agga": {
		"name": "Agga", "job": "Organiza a los kobolds", "stations": ["agga_cell", "agga_plaza", "agga_plaza"],
		"dialogue": ["Podéis quedaros. Respetad el claustro y tendremos pocas palabras que cruzar."],
	},
	"blepp": {
		"name": "Blepp", "job": "Vigila por precaución", "stations": ["blepp_cell", "blepp_lookout", "blepp_lookout"],
		"dialogue": ["Yo siempre miro dos veces antes de bajar a la playa. Eso, y mi daga de la suerte, me han salvado."],
	},
	"frub": {
		"name": "Frub", "job": "Busca en qué ayudar", "stations": ["frub_cell", "frub_plaza", "frub_plaza"],
		"dialogue": ["¿De dónde venís? ¿Qué hay ahí abajo? Si necesitáis ayuda con algo, puedo empezar ya."],
	},
	"kilnip": {
		"name": "Kilnip", "job": "Conversadora del claustro", "stations": ["kilnip_cell", "kilnip_dining", "kilnip_dining"],
		"dialogue": ["Llevo casi todo el día despierta. Anda, contadme algo mientras esperamos la cena."],
	},
	"laylee": {
		"name": "Laylee", "job": "Ayudante de Myla", "stations": ["laylee_cell", "laylee_bench", "laylee_bench"],
		"dialogue": ["Ayudo a Myla con los montajes. Desde aquel percance me encargo de las herramientas frías."],
	},
	"mumpo": {
		"name": "Mumpo", "job": "Kobold intrépido", "stations": ["mumpo_cell", "mumpo_plaza", "mumpo_plaza"],
		"dialogue": ["¿Ir hasta el borde del camino? Yo iría. Es más, me atrevería aunque Agga estuviera mirando."],
	},
	"rix": {
		"name": "Rix", "job": "Cuida el templo con Runara", "stations": ["rix_cell", "rix_temple", "rix_temple"],
		"dialogue": [
			"Cuido las ofrendas del templo. Podéis entrar si venís en paz.",
			"Desde aquí vi a un barco virar hacia las rocas del norte. Preguntad también a Varnoth.",
		],
	},
	"zark": {
		"name": "Zark", "job": "Habitante del claustro", "stations": ["zark_cell", "zark_plaza", "zark_plaza"],
		"dialogue": ["¿Otra visita? Limpiad las botas, aliento de asgo, que alguien tendrá que barrer después."],
	},
}
