extends RefCounted
## Additional routines use the same order and contact protocol as the cloister agenda.

const STATIONS := {
	"fish_tarak": [Vector3(19.70, 0.49, 113.10), Vector3(-1, 0, 0.57)],
	"fish_blepp": [Vector3(24.12, 0.49, 113.17), Vector3(1, 0, 0.60)],
	"varnoth_work": [Vector3(35.02, 27, 67.27), Vector3(0.4, 0, -0.7)],
	"myla_work": [Vector3(112.82, 9, 80.68), Vector3(0, 0, -1)],
	"pantry_round": [Vector3(123.72, 18, 52.25), Vector3(0, 0, -1)],
	"garden_second": [Vector3(79.45, 9, 90.34), Vector3(0, 0, -1)],
	"blepp_peg": [Vector3(119.83, 9, 86.35), Vector3(-1, 0, 0.15)],
	"mumpo_coin": [Vector3(133.95, 9, 80.25), Vector3(1, 0, -0.4)],
	"frub_pickup": [Vector3(115.60, 9, 82.55), Vector3.LEFT],
	"frub_drop": [Vector3(112.95, 9, 84.45), Vector3(-1, 0, -0.2)],
	"zark_pickup": [Vector3(128.60, 9, 85.24), Vector3.RIGHT],
	"zark_drop": [Vector3(132.95, 9, 87.20), Vector3.RIGHT],
	"kilnip_tea": [Vector3(116.09, 18, 54.25), Vector3(1, 0, 0)],
	"rix_sweep": [Vector3(46.12, 27, 66.75), Vector3(-0.5, 0, -1)],
	"laylee_wood": [Vector3(113.83, 9, 80.73), Vector3(0, 0, -1)],
	"zark_wipe": [Vector3(119.68, 18, 57.75), Vector3(1, 0, 0)],
}

# The final fields declare the object and contact adapter. Painted character
# motion remains owned by the existing directional animation library.
const ROWS := {
	"runara": [
		["RUN_01", "DEN", "runara_temple", "Medita ante Bahamut", "retreat_meditate_seated", "@altar", "observe"],
		["RUN_02", "D", "desk_east", "Lee un manuscrito", "retreat_study", "RetreatEastFolio", "page"],
	],
	"tarak": [
		["TAR_01", "D", "watering", "Riega las parcelas", "retreat_water", "RetreatWateringCan", "water"],
		["TAR_02", "EN", "fish_tarak", "Pesca al extremo del muelle", "retreat_water", "", "fishing"],
	],
	"varnoth": [
		["VAR_01", "D", "varnoth_work", "Repara un sillar del templo", "retreat_masonry", "DressedAshlarBlock", "stonework"],
		["VAR_02", "D", "varnoth_portico", "Inspecciona la piedra y las juntas", "idle", "", "observe"],
	],
	"myla": [
		["MYL_01", "DN", "myla_bench", "Vierte una mezcla en el alambique", "retreat_tinker", "RetreatAlembic", "alchemy"],
		["MYL_02", "DN", "myla_work", "Fabrica un componente del engranaje", "retreat_tinker", "@workbench", "metalwork"],
	],
	"agga": [
		["AGG_01", "EN", "agga_plaza", "Organiza el siguiente recado", "retreat_direct", "", "social"],
		["AGG_02", "DN", "pantry_round", "Revisa las provisiones de cocina", "retreat_work", "A3_PantryShelf", "observe"],
	],
	"blepp": [
		["BLE_01", "EN", "fish_blepp", "Pesca junto a Tarak", "retreat_watch", "", "fishing"],
		["BLE_02", "DN", "blepp_peg", "Examina su daga de la suerte", "retreat_work", "BleppDaggerPeg", "dagger"],
	],
	"frub": [
		["FRU_01", "DN", "workshop_plans", "Curiosea en el taller", "idle", "RetreatWorkshopPaper", "observe"],
		["FRU_02", "DN", "frub_pickup", "Lleva herramientas al banco", "retreat_fetch", "", "carry_box"],
	],
	"kilnip": [
		["KIL_01", "D", "hammock_west", "Reposa en su hamaca", "rest_on_prop", "RetreatHammockWestCloth", "doze"],
		["KIL_02", "DN", "kilnip_tea", "Prepara una infusión", "retreat_work", "RetreatTeaCup", "tea"],
	],
	"laylee": [
		["LAY_01", "DN", "laylee_wood", "Trabaja una pieza de madera", "retreat_sort", "RetreatLayleeWorkpiece", "woodwork"],
		["LAY_02", "DN", "workshop_plans", "Consulta el plano del banco", "retreat_work", "RetreatWorkshopPaper", "roll"],
	],
	"mumpo": [
		["MUM_01", "DN", "mumpo_coin", "Juega con una moneda de cobre", "retreat_work", "MumpoHiddenCoin", "coin"],
		["MUM_02", "EN", "mumpo_walk", "Explora el sendero del acantilado", "retreat_scout", "", "observe"],
	],
	"rix": [
		["RIX_01", "EN", "rix_temple", "Reza ante Bahamut", "retreat_pray", "@altar", "observe"],
		["RIX_02", "N", "rix_sweep", "Barre el paso del templo", "retreat_work", "", "sweep"],
	],
	"zark": [
		["ZAR_01", "DN", "zark_pickup", "Traslada un saco de suministros", "retreat_tidy", "", "carry_sack"],
		["ZAR_02", "DN", "zark_wipe", "Limpia el borde de la mesa del comedor", "retreat_tidy", "RetreatWipeEdge", "wipe"],
	],
}

const TOURS := {
	"TAR_01": ["garden_second", "RetreatWateringCanSecondary", "water"],
	"VAR_02": ["varnoth_temple", "", "observe"],
	"FRU_01": ["laylee_parts", "RetreatWorkshopPaper", "observe"],
	"MUM_02": ["east_rail", "", "observe"],
	"FRU_02": ["frub_drop", "", "unload"],
	"ZAR_01": ["zark_drop", "", "unload"],
}
const PARTNERS := {
	"TAR_02": ["blepp", "BLE_01"], "BLE_01": ["tarak", "TAR_02"],
	"MYL_02": ["laylee", "LAY_01"], "LAY_01": ["myla", "MYL_02"],
	"RUN_01": ["rix", "RIX_01"], "RIX_01": ["runara", "RUN_01"],
	"FRU_02": ["zark", "ZAR_01"], "ZAR_01": ["frub", "FRU_02"],
}
const DURATIONS := {
	"doze": [7.0, 11.0], "observe": [2.8, 5.5], "social": [4.4, 5.6],
	"fishing": [8.4, 12.0], "sweep": [4.6, 5.8], "unload": [1.0, 1.3],
}
const HEIGHTS := {
	"agga": 0.85, "blepp": 0.72, "frub": 0.65, "kilnip": 0.74, "laylee": 0.78,
	"mumpo": 0.70, "myla": 0.80, "rix": 0.76, "zark": 0.90,
}

static func get_row(actor: String, activity: String) -> Array:
	for row: Array in ROWS.get(actor, []):
		if row[0] == activity:
			return row
	return []

static func duration(task: Array, variation: float) -> float:
	var span: Array = DURATIONS.get(task[6], [2.6, 3.8])
	return lerpf(span[0], span[1], variation)

static func allows(task: Array, weather: String) -> bool:
	if task[6] == "water":
		return weather not in ["rain", "storm"]
	match task[0]:
		"TAR_02", "BLE_01": return weather != "storm"
	return true

static func family(task: Array) -> String:
	match task[0]:
		"RUN_01", "RIX_01": return "meditation"
		"RUN_02", "LAY_02": return "study"
		"TAR_01", "MYL_01", "KIL_02": return "pour_liquid"
		"TAR_02", "BLE_01": return "fishing"
		"VAR_01", "MYL_02", "LAY_01": return "hammering"
		"AGG_02", "BLE_02", "MUM_01": return "inspect_object"
		"FRU_02", "ZAR_01": return "carry_walk"
		"RIX_02": return "sweeping"
		"ZAR_02": return "wiping"
		"AGG_01": return "social"
		"KIL_01": return "resting"
	return "locomotion"
