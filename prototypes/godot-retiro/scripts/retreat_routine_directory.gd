extends RefCounted

## Original daily staging based on chapter 1, pp. 8–12. The time codes are
## D (day), E (dusk), N (night). Empty effect means a gesture or lookout duty.
const TIME_CODE := {"day": "D", "dusk": "E", "night": "N"}
const WORK := "retreat_work"

# Each point is an approach on the current floor. The activity still faces
# its prop's actual world position rather than a heading baked into the image.
const SITES := {
	"desk_east": [Vector3(106.15, 18, 61.45), Vector3(-1, 0, -1)],
	"desk_west": [Vector3(91.55, 18, 61.15), Vector3(1, 0, -0.1)],
	"chart": [Vector3(107.65, 18, 57.8), Vector3(1, 0, 0)],
	"armillary": [Vector3(97.1, 18, 58.35), Vector3(1, 0, -0.3)],
	"offering_e": [Vector3(44.1, 27, 69.2), Vector3(-1, 0, 0)],
	"offering_n": [Vector3(42.45, 27, 68.2), Vector3(0, 0, 1)],
	"canaries": [Vector3(42.3, 27, 66.3), Vector3(0, 0, 1)],
	"shrine_cell": [Vector3(130.8, 9, 79.85), Vector3(0, 0, -1)],
	"herb_shelf": [Vector3(88.55, 9, 83.65), Vector3(-1, 0, 0)],
	"watering": [Vector3(93.45, 9, 90.3), Vector3(0, 0, -1)],
	"well": [Vector3(96.85, 9, 93.25), Vector3(-1, 0, 0)],
	"shield": [Vector3(98.95, 9, 84.25), Vector3(-1, 0, 0)],
	"east_dinner": [Vector3(128.45, 18, 57.85), Vector3(-1, 0, 0)],
	"west_dinner": [Vector3(119.45, 18, 57.75), Vector3(1, 0, 0)],
	"refreshments": [Vector3(106.6, 9, 90.53), Vector3(0, 0, -1)],
	"firewood": [Vector3(111.45, 9, 94.02), Vector3(0, 0, 1)],
	"refreshments_alt": [Vector3(105.55, 9, 90.34), Vector3(1, 0, -1)],
	"workshop_plans": [Vector3(114.45, 9, 84.25), Vector3(-1, 0, -1)],
	"hammock_west": [Vector3(121.35, 9, 82.9), Vector3(-1, 0, -1)],
	"hammock_west2": [Vector3(123.4, 9, 82.35), Vector3(-1, 0, 0)],
	"hammock_east": [Vector3(133.55, 9, 82.55), Vector3(-1, 0, 0)],
	"hammock_east2": [Vector3(131.05, 9, 82.25), Vector3(-1, 0, 0)],
	"east_chest": [Vector3(132.6, 9, 85.85), Vector3(0, 0, -1)],
	"east_rail": [Vector3(137.3, 9, 93.2), Vector3(0.5, 0, 1)],
}

## The stations belong to the existing A1 furniture. The guest bed is shared;
## Runara only uses the north mat for a brief rest if it is unoccupied.
const NIGHT_REST := {
	"runara": ["GuestBedroll_82_78", Vector3(81.38, 9, 79.12)],
	"tarak": ["PilgrimBed_87_79", Vector3(89.02, 9, 79.72)],
	"varnoth": ["PilgrimBed_98_80", Vector3(99.35, 9, 81.32)],
	"myla": ["PilgrimBed_109_80", Vector3(110.54, 9, 81.34)],
	"agga": ["KoboldHammock_1200_790", Vector3(121.31, 9, 79.80)],
	"blepp": ["KoboldHammock_1225_790", Vector3(123.52, 9, 79.85)],
	"frub": ["KoboldHammock_1225_820", Vector3(123.40, 9, 82.35)],
	"kilnip": ["KoboldHammock_1200_820", Vector3(121.35, 9, 82.9)],
	"laylee": ["KoboldHammock_1291_798", Vector3(130.63, 9, 79.90)],
	"mumpo": ["KoboldHammock_1323_798", Vector3(133.61, 9, 79.87)],
	"rix": ["KoboldHammock_1291_825", Vector3(131.05, 9, 82.25)],
	"zark": ["KoboldHammock_1323_825", Vector3(133.55, 9, 82.55)],
}

## ID, time, approach, visible activity, actor animation, object ID, reaction.
const AGENDAS := {
	"runara": [
		["read", "D", "desk_east", "Consulta el códice del claustro", "retreat_study", "RetreatEastFolio", "page"],
		["copy", "D", "desk_west", "Copia una nota en el scriptorium", "retreat_study", "RetreatScribeQuill", "write"],
		["chart", "D", "chart", "Revisa la carta de la isla", WORK, "RetreatMapScroll", "roll"],
		["meditate", "EN", "runara_temple", "Medita junto al altar", "retreat_meditate", "", ""],
		["canaries", "E", "canaries", "Llama a los canarios del templo", WORK, "@canaries", "birds"],
		["offerings", "N", "offering_e", "Ordena las ofrendas del claustro", WORK, "OfferingBowl", "slide"],
	],
	"tarak": [
		["seedlings", "D", "tarak_seedlings", "Examina los brotes y las hojas", "retreat_tend", "", ""],
		["water", "D", "watering", "Riega las hierbas del claustro", "retreat_water", "RetreatWateringCan", "water"],
		["draw", "D", "well", "Saca agua fresca para el jardín", WORK, "@well", "draw"],
		["cook", "E", "tarak_kitchen", "Añade hierbas al guiso", "retreat_cook", "@stove", "simmer"],
		["serve", "E", "east_dinner", "Sirve un cuenco de guiso", WORK, "RetreatSoupBowl", "serve"],
		["dry", "N", "herb_shelf", "Clasifica hierbas en su estante", "retreat_tend", "RetreatHerbBundle", "inspect"],
	],
	"varnoth": [
		["brush", "D", "varnoth_temple", "Limpia la piedra del templo", "retreat_masonry", "", ""],
		["inspect", "D", "varnoth_portico", "Comprueba las juntas del pórtico", WORK, "", ""],
		["canaries", "D", "canaries", "Se aparta para dejar posarse a las aves", WORK, "@canaries", "birds"],
		["history", "E", "desk_west", "Relee un pasaje de historia", WORK, "RetreatWestFolio", "page"],
		["debate", "E", "varnoth_aisle", "Se detiene a comentar una lectura", WORK, "", ""],
		["shield", "N", "shield", "Limpia el escudo que guarda en la celda", WORK, "RetreatRackShield", "polish"],
	],
	"myla": [
		["gear", "DN", "myla_bench", "Comprueba el engranaje del taller", "retreat_tinker", "@workbench", "gear"],
		["alembic", "D", "myla_bench", "Comprueba el cierre del alambique", WORK, "RetreatAlembic", "tilt"],
		["parts", "DN", "myla_bench", "Separa las piezas de repuesto", WORK, "RetreatPartsTray", "sort"],
		["drawing", "E", "chart", "Estudia un dibujo de la biblioteca", WORK, "RetreatMapScroll", "roll"],
		["rings", "E", "armillary", "Mide un ángulo con el astrolabio", WORK, "MeridianRing", "turn"],
		["lesson", "N", "myla_bench", "Demuestra un montaje a Laylee", "retreat_tinker", "RetreatPartsTray", "slide"],
	],
	"agga": [
		["hammock", "D", "hammock_west", "Tensa la lona de la hamaca común", WORK, "RetreatHammockWestCloth", "cloth"],
		["brief", "DEN", "agga_plaza", "Reparte los recados del día en la plaza", "retreat_direct", "", ""],
		["passage", "DEN", "agga_doorway", "Comprueba que el umbral quede libre", WORK, "", ""],
		["rations", "D", "agga_cell", "Revisa los víveres con la celda en calma", WORK, "", ""],
		["pitcher", "E", "refreshments", "Deja preparada la jarra común", WORK, "RetreatRefreshmentJug", "tilt"],
		["dishes", "N", "refreshments", "Cuenta los vasos de la plaza", WORK, "RetreatRefreshmentCup", "sort"],
	],
	"blepp": [
		["listen", "D", "blepp_cell", "Escucha ruidos al otro lado de la celda", "retreat_watch", "", ""],
		["beach", "DEN", "blepp_lookout", "Vigila el descenso hacia la playa", "retreat_watch", "", ""],
		["cords", "D", "hammock_west2", "Prueba la tensión de la hamaca", WORK, "RetreatHammockWest2Cloth", "cloth"],
		["patrol", "DEN", "blepp_path", "Se acerca al borde del camino y mira la marea", "retreat_watch", "", ""],
		["rope", "N", "well", "Comprueba la cuerda del pozo", WORK, "@well", "draw"],
		["fishing", "E", "refreshments_alt", "Revisa el cesto antes de bajar a pescar", WORK, "RetreatRefreshmentBasket", "inspect"],
	],
	"frub": [
		["cloth", "D", "hammock_west2", "Acomoda la lona de la hamaca", WORK, "RetreatHammockWest2Cloth", "cloth"],
		["ask", "DE", "frub_errands", "Pregunta a Agga por el siguiente recado", WORK, "", ""],
		["cup", "DEN", "refreshments_alt", "Devuelve un vaso a la mesa", "retreat_fetch", "RetreatRefreshmentCup", "slide"],
		["water", "N", "well", "Sube un cubo de agua", WORK, "@well", "draw"],
		["wood", "E", "firewood", "Alinea un leño en la pila", WORK, "RetreatFirewoodBillet", "slide"],
		["supply", "N", "laylee_parts", "Revisa si quedan suministros para el taller", WORK, "RetreatWorkshopPaper", "inspect"],
	],
	"kilnip": [
		["quiet", "D", "hammock_west", "Hace una siesta en la hamaca", WORK, "RetreatHammockWestCloth", "doze"],
		["blepp", "D", "kilnip_cell", "Hace compañía a Blepp en la celda", "retreat_chat", "", ""],
		["stretch", "DN", "kilnip_entrance", "Se despeja un momento en el umbral", "retreat_chat", "", ""],
		["dinner", "E", "east_dinner", "Prueba el guiso y comenta la cena", "retreat_chat", "RetreatSoupBowl", "taste"],
		["bread", "E", "west_dinner", "Acerca el pan a un comensal", WORK, "RetreatDinnerBread", "slide"],
		["pour", "N", "west_dinner", "Sirve un poco de bebida", WORK, "RetreatDinnerCup", "tilt"],
	],
	"laylee": [
		["cloth", "D", "hammock_east2", "Tensa su hamaca antes de salir", WORK, "RetreatHammockEast2Cloth", "cloth"],
		["sort", "E", "laylee_bench", "Limpia una herramienta de mano", "retreat_sort", "RetreatColdTool", "polish"],
		["bench", "E", "laylee_bench", "Prueba el engranaje frío", WORK, "@workbench", "gear"],
		["measure", "N", "workshop_plans", "Extiende un plano para tomar medidas", WORK, "RetreatWorkshopPaper", "roll"],
		["check", "N", "laylee_bench", "Cuenta las piezas del montaje", WORK, "RetreatPartsTray", "sort"],
		["assist", "N", "laylee_parts", "Se prepara para ayudar a Myla", "retreat_sort", "RetreatWorkshopPaper", "inspect"],
	],
	"mumpo": [
		["hammock", "D", "hammock_east2", "Endereza la lona de su hamaca", WORK, "RetreatHammockEast2Cloth", "cloth"],
		["coast", "DE", "mumpo_walk", "Se asoma al mirador del camino", "retreat_scout", "", ""],
		["round", "DEN", "east_rail", "Recorre el tramo este de la galería", "retreat_scout", "", ""],
		["crate", "D", "east_chest", "Comprueba el cierre de un baúl", WORK, "@east_chest", "chest"],
		["dare", "N", "mumpo_plaza", "Retoma su discusión con Zark en la plaza", WORK, "", ""],
		["crank", "N", "well", "Prueba cuánto pesa el torno del pozo", WORK, "@well", "draw"],
	],
	"rix": [
		["cell_shrine", "D", "shrine_cell", "Alinea la vasija del altar de la celda", WORK, "RetreatCellVessel", "slide"],
		["pious", "DEN", "rix_portico", "Revisa el paso junto al pórtico del templo", WORK, "", ""],
		["incense", "EN", "offering_n", "Ofrece incienso en el altar", "retreat_incense", "@incense", "incense"],
		["prepare", "E", "offering_e", "Acomoda el cuenco de ofrendas", WORK, "OfferingBowl", "slide"],
		["devotion", "N", "rix_temple", "Hace una pausa de recogimiento", "retreat_pray", "", ""],
		["birds", "N", "canaries", "Llama en voz baja a los canarios", WORK, "@canaries", "birds"],
	],
	"zark": [
		["cloth", "D", "hammock_east", "Sacude la lona de su hamaca", WORK, "RetreatHammockEastCloth", "cloth"],
		["threshold", "DEN", "zark_threshold", "Inspecciona el umbral junto a la plaza", WORK, "", ""],
		["check", "D", "east_chest", "Revisa el cierre del baúl de la celda", WORK, "@east_chest", "chest"],
		["cup", "E", "refreshments_alt", "Aparta un vaso que estorba", "retreat_tidy", "RetreatRefreshmentCup", "slide"],
		["jug", "N", "refreshments", "Coloca la jarra en su sitio", "retreat_tidy", "RetreatRefreshmentJug", "sort"],
		["reply", "N", "zark_plaza", "Vuelve a discutir con Mumpo en la plaza", WORK, "", ""],
	],
}

static func for_phase(id: String, phase: String) -> Array:
	var code: String = TIME_CODE[phase]
	var tasks: Array = AGENDAS[id].filter(func(row: Array) -> bool: return code in row[1])
	if phase == "night" and NIGHT_REST.has(id):
		tasks.append(["night_rest", "N", "@rest/" + id, "Descansa bajo su manta", "rest_on_prop", "@rest/" + id, "doze"])
	return tasks

static func station(key: String) -> Array:
	const Directory = preload("res://scripts/retreat_resident_directory.gd")
	if key.begins_with("@rest/"):
		return [NIGHT_REST[key.trim_prefix("@rest/")][1], Vector3.FORWARD, ""]
	if SITES.has(key):
		var site: Array = SITES[key]
		return [site[0], site[1], ""]
	return Directory.STATIONS[key]
