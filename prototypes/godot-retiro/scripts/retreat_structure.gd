class_name RetreatStructure
extends RefCounted

# ==============================================================================
# PERFIL CANÓNICO DEL RETIRO DEL DRAGÓN (DRAGON'S REST)
# D&D 5e: Los Dragones de la Isla de las Tempestades (Capítulo 1)
# Traslado formal y exhaustivo desde la implementación de Babylon.js (Dungeons VTT)
# ==============================================================================

# Constantes de cuadrícula y escala canónicas
const TILE_METERS: float = 1.5
const GRID_COLS: int = 112
const GRID_ROWS: int = 80
const TOTAL_WIDTH_METERS: float = GRID_COLS * TILE_METERS # 168.0m
const TOTAL_DEPTH_METERS: float = GRID_ROWS * TILE_METERS # 120.0m

# Origen y traslación del campamento A1 en el plano global
const WORLD_ORIGIN := Vector2(72.0, 72.0)
const A1_TRANSLATION := Vector3(72.0, 9.0, 72.0)

# Cotas de elevación canónicas (Metros)
const ELEV_SEA: float = 0.0
const ELEV_BEACH_SHORE: float = 0.25
const ELEV_A1_PLAZA: float = 9.0
const ELEV_A2_WINCH: float = 15.0
const ELEV_A2_LIFT_LOW: float = 0.24
const ELEV_A3_DINING: float = 18.0
const ELEV_A4_LIBRARY: float = 18.0
const ELEV_UPPER_WALKWAY: float = 18.0
const ELEV_A5_TEMPLE: float = 27.0
const ELEV_ISLAND_HIGH: float = 35.5
const ELEV_OBSERVATORY: float = 37.0

# ------------------------------------------------------------------------------
# 11 ZONAS CANÓNICAS DEL RETIRO DEL DRAGÓN
# ------------------------------------------------------------------------------
const ZONES: Dictionary = {
	"Z1_BEACH": {
		"id": "Z1_BEACH",
		"name": "Playa y Embarcadero",
		"surface_id": "beach",
		"elevation_min": 0.25,
		"elevation_max": 9.0,
		"cols": Vector2i(12, 48),
		"rows": Vector2i(61, 76),
		"bounds_x": Vector2(18.0, 73.5),
		"bounds_z": Vector2(91.5, 115.5),
		"description": "Llegada costera con muelle de roble, pilotes, bote amarrado, dunas de arena cálida, orilla mojada reflectante y rompeolas de basalto.",
		"role": "Llegada y desembarco de los aventureros a la Isla de las Tempestades."
	},
	"Z2_ASCENT": {
		"id": "Z2_ASCENT",
		"name": "Subida al Retiro",
		"surface_id": "beach",
		"elevation_min": 0.25,
		"elevation_max": 9.0,
		"cols": Vector2i(40, 48),
		"rows": Vector2i(61, 68),
		"bounds_x": Vector2(60.0, 73.5),
		"bounds_z": Vector2(91.5, 103.5),
		"description": "Escalera tallada en el acantilado de basalto en tres tramos continuos con bordillos de piedra, descansillos y faroles náuticos ámbar.",
		"role": "Ascensión pedestre desde la orilla hasta la terraza inferior del monasterio."
	},
	"Z3_A1_PLAZA": {
		"id": "Z3_A1_PLAZA",
		"name": "A1: Celdas y Plaza Central",
		"surface_id": "a1",
		"elevation_min": 9.0,
		"elevation_max": 9.0,
		"cols": Vector2i(49, 94),
		"rows": Vector2i(51, 65),
		"bounds_x": Vector2(73.5, 142.5),
		"bounds_z": Vector2(76.5, 99.0),
		"description": "Plaza central con hoguera comunitaria, bancos, estatua del dragón Astalagan y 6 celdas desiguales excavadas en la roca viva.",
		"role": "Alojamiento de peregrinos, vida comunitaria y encuentro con PNJ clave (Tarak, Varnoth, Myla, Kobolds)."
	},
	"Z4_A2_WINCH": {
		"id": "Z4_A2_WINCH",
		"name": "A2: Cabrestante y Almacén Marino",
		"surface_id": "a2",
		"elevation_min": 15.0,
		"elevation_max": 15.0,
		"cols": Vector2i(103, 108),
		"rows": Vector2i(43, 46),
		"bounds_x": Vector2(154.5, 163.5),
		"bounds_z": Vector2(64.5, 70.5),
		"description": "Casa de madera con mecanismo de torno, eje y tambor para izar provisiones marinas desde el mar (0.24m) hasta la cota 15m.",
		"role": "Logística del monasterio, descarga de suministros y conexión con la pasarela suspendida."
	},
	"Z5_A3_DINING": {
		"id": "Z5_A3_DINING",
		"name": "A3: Comedor y Cocina Excavados",
		"surface_id": "a3",
		"elevation_min": 18.0,
		"elevation_max": 18.0,
		"cols": Vector2i(76, 87),
		"rows": Vector2i(34, 43),
		"bounds_x": Vector2(113.7, 131.3),
		"bounds_z": Vector2(50.7, 65.3),
		"description": "Caverna excavada ampliada con gran mesa comunal, bancos de roble, cocina interior con fogón, alacena y despensa conectada.",
		"role": "Comidas comunitarias, hospitalidad monástica e interacción con los habitantes del claustro."
	},
	"Z6_A4_LIBRARY": {
		"id": "Z6_A4_LIBRARY",
		"name": "A4: Biblioteca del Retiro (Scriptorium)",
		"surface_id": "a4",
		"elevation_min": 18.0,
		"elevation_max": 18.0,
		"cols": Vector2i(57, 74),
		"rows": Vector2i(35, 43),
		"bounds_x": Vector2(86.28, 111.3),
		"bounds_z": Vector2(52.2, 65.3),
		"description": "Cámara de estudio ampliada con puerta de roble, estanterías murales, 3 exentas repletas de pergaminos antiguos, mesas y atriles.",
		"role": "Investigación académica sobre la historia de la isla, dragones y la amenaza de los no-muertos."
	},
	"Z7_GARDENS": {
		"id": "Z7_GARDENS",
		"name": "Jardines y Bosquetes",
		"surface_id": "upper",
		"elevation_min": 0.25,
		"elevation_max": 18.0,
		"cols": Vector2i(45, 62),
		"rows": Vector2i(42, 50),
		"bounds_x": Vector2(67.5, 94.5),
		"bounds_z": Vector2(63.0, 76.5),
		"description": "Terrazas ajardinadas con jardineras de piedra, praderas de lavanda, bosquetes del embarcadero, pinos marítimos y olivos.",
		"role": "Meditación, cultivo de hierbas medicinales y transición verde entre las distintas terrazas."
	},
	"Z8_A5_TEMPLE": {
		"id": "Z8_A5_TEMPLE",
		"name": "A5: Templo de Bahamut",
		"surface_id": "a5",
		"elevation_min": 27.0,
		"elevation_max": 27.0,
		"cols": Vector2i(22, 33),
		"rows": Vector2i(42, 51),
		"bounds_x": Vector2(33.4, 50.25),
		"bounds_z": Vector2(62.5, 76.8),
		"description": "Santuario ampliado al aire libre en la cima del farallón, presidido por la estatua de Bahamut, 4 columnas acanaladas, estanque y 7 canarios.",
		"role": "Sanctasanctórum de Runara, devoción a Bahamut, bendiciones y revelaciones trascendentales."
	},
	"Z9_UPPER_WALKWAY": {
		"id": "Z9_UPPER_WALKWAY",
		"name": "Paseos y Explanadas",
		"surface_id": "upper",
		"elevation_min": 15.0,
		"elevation_max": 27.0,
		"cols": Vector2i(33, 102),
		"rows": Vector2i(43, 45),
		"bounds_x": Vector2(49.5, 154.5),
		"bounds_z": Vector2(64.5, 69.0),
		"description": "Cornisa rocosa superior y paseo pavimentado que articula la comunicación horizontal entre A2, A3, A4 y la rampa hacia A5.",
		"role": "Vía principal de tránsito intermedio y mirador panorámico sobre el océano circundante."
	},
	"Z10_ISLAND_ROUTES": {
		"id": "Z10_ISLAND_ROUTES",
		"name": "Rutas hacia el Resto de la Isla",
		"surface_id": "island-observatory",
		"elevation_min": 0.25,
		"elevation_max": 37.0,
		"cols": Vector2i(2, 107),
		"rows": Vector2i(10, 75),
		"bounds_x": Vector2(3.0, 162.0),
		"bounds_z": Vector2(15.0, 114.0),
		"description": "Sendero costero de Pleamar hacia el suroeste y camino escarpado hacia el Observatorio astronómico en el sureste insular.",
		"role": "Salidas de expedición terrestre a las localizaciones de la campaña."
	},
	"Z11_GLOBAL_ENV": {
		"id": "Z11_GLOBAL_ENV",
		"name": "Entorno Global",
		"surface_id": "beach",
		"elevation_min": 0.0,
		"elevation_max": 37.0,
		"cols": Vector2i(0, 111),
		"rows": Vector2i(0, 79),
		"bounds_x": Vector2(0.0, 168.0),
		"bounds_z": Vector2(0.0, 120.0),
		"description": "Manto oceánico animado, farallones de basalto continuo, arrecife somero y telón escénico 2.5D.",
		"role": "Marco geográfico y atmósfera inmersiva global."
	}
}

# ------------------------------------------------------------------------------
# 13 SUPERFICIES TRANSITABLES CANÓNICAS (EXPANDIDAS BABYLON R3 + FOREST + TEMPLE)
# ------------------------------------------------------------------------------
const SURFACES: Dictionary = {
	"beach": {
		"id": "beach",
		"elevation": 0.25,
		"elevation_max": 9.0,
		"tiles_count": 223,
		"material": "pbr_beach_sand"
	},
	"a1": {
		"id": "a1",
		"elevation": 9.0,
		"elevation_max": 9.0,
		"tiles_count": 410,
		"material": "plaza_limestone"
	},
	"cliff": {
		"id": "cliff",
		"elevation": 9.0,
		"elevation_max": 15.0,
		"tiles_count": 48,
		"material": "basalt_rock"
	},
	"a2": {
		"id": "a2",
		"elevation": 15.0,
		"elevation_max": 15.0,
		"tiles_count": 15,
		"material": "oak_wood"
	},
	"upper": {
		"id": "upper",
		"elevation": 15.0,
		"elevation_max": 27.0,
		"tiles_count": 442,
		"material": "ashlar_stone"
	},
	"a3": {
		"id": "a3",
		"elevation": 18.0,
		"elevation_max": 18.0,
		"tiles_count": 61,
		"material": "carved_cliff"
	},
	"a4": {
		"id": "a4",
		"elevation": 18.0,
		"elevation_max": 18.0,
		"tiles_count": 113,
		"material": "carved_cliff"
	},
	"a5": {
		"id": "a5",
		"elevation": 27.0,
		"elevation_max": 27.0,
		"tiles_count": 87,
		"material": "sacred_limestone"
	},
	"pleamar": {
		"id": "pleamar",
		"elevation": 0.25,
		"elevation_max": 0.25,
		"tiles_count": 18,
		"material": "coastal_sand"
	},
	"observatorio": {
		"id": "observatorio",
		"elevation": 18.0,
		"elevation_max": 18.0,
		"tiles_count": 20,
		"material": "mountain_path"
	},
	"island-pleamar-low": {
		"id": "island-pleamar-low",
		"elevation": 0.25,
		"elevation_max": 0.59,
		"tiles_count": 30,
		"material": "coastal_sand"
	},
	"island-pleamar-high": {
		"id": "island-pleamar-high",
		"elevation": 21.25,
		"elevation_max": 35.5,
		"tiles_count": 50,
		"material": "mountain_rock"
	},
	"island-observatory": {
		"id": "island-observatory",
		"elevation": 18.0,
		"elevation_max": 37.0,
		"tiles_count": 82,
		"material": "highland_path"
	}
}

# ------------------------------------------------------------------------------
# 6 CELDAS DE PEREGRINOS EN A1 (CANON OFICIAL)
# ------------------------------------------------------------------------------
const A1_ROOMS: Array[Dictionary] = [
	{
		"id": 1,
		"role": "free",
		"label": "Habitación libre",
		"global_entry": Vector2i(54, 57),
		"global_interaction": Vector2i(53, 56),
		"furniture": [
			{"kind": "bed", "pos": Vector2i(52, 54)},
			{"kind": "nightstand", "pos": Vector2i(53, 53)},
			{"kind": "desk", "pos": Vector2i(55, 54)},
			{"kind": "chair", "pos": Vector2i(55, 55)}
		]
	},
	{
		"id": 2,
		"role": "tarak",
		"label": "Celda de Tarak",
		"global_entry": Vector2i(60, 57),
		"global_interaction": Vector2i(59, 55),
		"furniture": [
			{"kind": "bed", "pos": Vector2i(58, 51)},
			{"kind": "nightstand", "pos": Vector2i(59, 50)},
			{"kind": "desk", "pos": Vector2i(61, 54)},
			{"kind": "chair", "pos": Vector2i(61, 55)}
		]
	},
	{
		"id": 3,
		"role": "varnoth",
		"label": "Celda de Varnoth",
		"global_entry": Vector2i(67, 57),
		"global_interaction": Vector2i(66, 55),
		"furniture": [
			{"kind": "bed", "pos": Vector2i(65, 53)},
			{"kind": "nightstand", "pos": Vector2i(66, 52)},
			{"kind": "desk", "pos": Vector2i(68, 52)},
			{"kind": "chair", "pos": Vector2i(68, 53)}
		]
	},
	{
		"id": 4,
		"role": "myla",
		"label": "Celda de Myla (Taller)",
		"global_entry": Vector2i(74, 57),
		"global_interaction": Vector2i(74, 55),
		"furniture": [
			{"kind": "bed", "pos": Vector2i(73, 52)},
			{"kind": "nightstand", "pos": Vector2i(74, 51)},
			{"kind": "desk", "pos": Vector2i(76, 54)},
			{"kind": "chair", "pos": Vector2i(76, 55)},
			{"kind": "tools", "pos": Vector2i(75, 50)}
		]
	},
	{
		"id": 5,
		"role": "kobolds-west",
		"label": "Celda de kobolds oeste",
		"global_entry": Vector2i(81, 57),
		"global_interaction": Vector2i(81, 55),
		"furniture": [
			{"kind": "hammock", "pos": Vector2i(80, 51)},
			{"kind": "hammock", "pos": Vector2i(82, 51)},
			{"kind": "hammock", "pos": Vector2i(80, 53)},
			{"kind": "hammock", "pos": Vector2i(82, 53)}
		]
	},
	{
		"id": 6,
		"role": "kobolds-east",
		"label": "Celda de kobolds este",
		"global_entry": Vector2i(87, 57),
		"global_interaction": Vector2i(87, 55),
		"furniture": [
			{"kind": "hammock", "pos": Vector2i(86, 51)},
			{"kind": "hammock", "pos": Vector2i(89, 51)},
			{"kind": "hammock", "pos": Vector2i(86, 53)},
			{"kind": "hammock", "pos": Vector2i(89, 53)}
		]
	}
]

# ------------------------------------------------------------------------------
# 16 LANDMARKS Y PNJ CANÓNICOS
# ------------------------------------------------------------------------------
const LANDMARKS: Dictionary = {
	"spawn": {
		"id": "spawn",
		"surface": "beach",
		"cell": Vector2i(16, 74),
		"world_pos": Vector3(24.75, 0.25, 111.75),
		"label": "Llegada de los Aventureros"
	},
	"boat": {
		"id": "boat",
		"surface": "beach",
		"cell": Vector2i(13, 75),
		"world_pos": Vector3(20.25, 0.25, 113.25),
		"label": "Bote de remos amarrado"
	},
	"pleamar": {
		"id": "pleamar",
		"surface": "pleamar",
		"cell": Vector2i(3, 74),
		"world_pos": Vector3(5.25, 0.25, 111.75),
		"label": "Sendero de Pleamar"
	},
	"observatorio": {
		"id": "observatorio",
		"surface": "observatorio",
		"cell": Vector2i(93, 33),
		"world_pos": Vector3(140.25, 18.0, 50.25),
		"label": "Sendero al Observatorio"
	},
	"a2-door": {
		"id": "a2-door",
		"surface": "a2",
		"cell": Vector2i(105, 45),
		"world_pos": Vector3(158.25, 15.0, 68.25),
		"label": "Puerta del Cabrestante"
	},
	"winch": {
		"id": "winch",
		"surface": "a2",
		"cell": Vector2i(107, 45),
		"world_pos": Vector3(161.25, 15.0, 68.25),
		"label": "Mecanismo del Cabrestante"
	},
	"community": {
		"id": "community",
		"surface": "a3",
		"cell": Vector2i(79, 40),
		"world_pos": Vector3(119.25, 18.0, 60.75),
		"label": "Mesa Comunal (Comedor A3)"
	},
	"library": {
		"id": "library",
		"surface": "a4",
		"cell": Vector2i(68, 39),
		"world_pos": Vector3(102.75, 18.0, 59.25),
		"label": "Estanterías de la Biblioteca A4"
	},
	"a4-door": {
		"id": "a4-door",
		"surface": "a4",
		"cell": Vector2i(68, 42),
		"world_pos": Vector3(102.75, 18.0, 63.75),
		"label": "Puerta de la Biblioteca"
	},
	"temple": {
		"id": "temple",
		"surface": "a5",
		"cell": Vector2i(27, 43),
		"world_pos": Vector3(41.25, 27.0, 65.25),
		"label": "Templo de Bahamut A5"
	},
	"runara": {
		"id": "runara",
		"surface": "a5",
		"cell": Vector2i(29, 43),
		"world_pos": Vector3(44.25, 27.0, 65.25),
		"label": "Runara (Líder del claustro)"
	},
	"tarak": {
		"id": "tarak",
		"surface": "a1",
		"cell": Vector2i(59, 57),
		"world_pos": Vector3(89.25, 9.0, 86.25),
		"label": "Tarak (Monje herborista)"
	},
	"varnoth": {
		"id": "varnoth",
		"surface": "a1",
		"cell": Vector2i(66, 57),
		"world_pos": Vector3(99.75, 9.0, 86.25),
		"label": "Varnoth (Comandante retirada)"
	},
	"myla": {
		"id": "myla",
		"surface": "a1",
		"cell": Vector2i(74, 57),
		"world_pos": Vector3(111.75, 9.0, 86.25),
		"label": "Myla (Erudita y artesana)"
	},
	"kobold-west": {
		"id": "kobold-west",
		"surface": "a1",
		"cell": Vector2i(81, 57),
		"world_pos": Vector3(122.25, 9.0, 86.25),
		"label": "Kobolds oeste (Ruk y cuadrilla)"
	},
	"kobold-east": {
		"id": "kobold-east",
		"surface": "a1",
		"cell": Vector2i(87, 57),
		"world_pos": Vector3(131.25, 9.0, 86.25),
		"label": "Kobolds este (Meepo y aprendices)"
	}
}

# ------------------------------------------------------------------------------
# AJUSTES DE CÁMARA TÁCTICA 2.5D (PARIDAD CON RETREAT_ZONE_VIEWS DE BABYLON)
# ------------------------------------------------------------------------------
const CAMERA_PRESETS: Dictionary = {
	"overview": {
		"target": Vector3(88.0, 14.0, 74.0),
		"ortho_half": 46.0,
		"size": Vector3(178.0, 38.0, 92.0),
		"pitch": 27.0,
		"yaw": 0.0
	},
	"beach": {
		"target": Vector3(17.5, 1.5, 108.0),
		"ortho_half": 18.0,
		"size": Vector3(44.0, 16.0, 30.0),
		"pitch": 25.0,
		"yaw": 0.0
	},
	"a1": {
		"target": Vector3(106.0, 9.5, 89.0),
		"ortho_half": 38.0,
		"size": Vector3(36.0, 12.0, 24.0),
		"pitch": 25.0,
		"yaw": 0.0
	},
	"a2": {
		"target": Vector3(160.8, 11.2, 70.5),
		"ortho_half": 11.5,
		"size": Vector3(20.0, 18.0, 20.0),
		"pitch": 24.0,
		"yaw": -12.0
	},
	"a3": {
		"target": Vector3(122.0, 18.5, 58.0),
		"ortho_half": 9.5,
		"size": Vector3(18.0, 5.0, 15.0),
		"pitch": 26.0,
		"yaw": 0.0
	},
	"a4": {
		"target": Vector3(99.0, 18.5, 58.0),
		"ortho_half": 10.5,
		"size": Vector3(25.0, 5.0, 14.0),
		"pitch": 26.0,
		"yaw": 0.0
	},
	"a5": {
		"target": Vector3(41.5, 27.5, 68.5),
		"ortho_half": 9.5,
		"size": Vector3(20.0, 8.0, 16.0),
		"pitch": 24.0,
		"yaw": 0.0
	},
	"caves": {
		"target": Vector3(109.0, 19.0, 58.5),
		"ortho_half": 24.0,
		"size": Vector3(46.0, 10.0, 22.0),
		"pitch": 27.0,
		"yaw": 0.0
	}
}

# ------------------------------------------------------------------------------
# FUNCIONES DE CONVERSIÓN Y CONSULTA ESPACIAL
# ------------------------------------------------------------------------------
static func cell_to_world(col: int, row: int, elevation: float = 0.0) -> Vector3:
	var x = (float(col) + 0.5) * TILE_METERS
	var z = (float(row) + 0.5) * TILE_METERS
	return Vector3(x, elevation, z)

static func world_to_cell(pos: Vector3) -> Vector2i:
	var col = int(floor(pos.x / TILE_METERS))
	var row = int(floor(pos.z / TILE_METERS))
	return Vector2i(col, row)

static func get_zone_at(pos: Vector3) -> Dictionary:
	var cell := world_to_cell(pos)
	for zone_id in ZONES.keys():
		var z: Dictionary = ZONES[zone_id]
		var cols: Vector2i = z["cols"]
		var rows: Vector2i = z["rows"]
		if cell.x >= cols.x and cell.x <= cols.y and cell.y >= rows.x and cell.y <= rows.y:
			return z
	return ZONES["Z11_GLOBAL_ENV"]

static func get_canonical_elevation(surface_id: String) -> float:
	if SURFACES.has(surface_id):
		return float(SURFACES[surface_id]["elevation"])
	return 0.0

static func get_camera_preset_for_zone(zone_id: String) -> Dictionary:
	match zone_id:
		"Z1_BEACH", "Z2_ASCENT":
			return CAMERA_PRESETS["beach"]
		"Z3_A1_PLAZA":
			return CAMERA_PRESETS["a1"]
		"Z4_A2_WINCH":
			return CAMERA_PRESETS["a2"]
		"Z5_A3_DINING":
			return CAMERA_PRESETS["a3"]
		"Z6_A4_LIBRARY":
			return CAMERA_PRESETS["a4"]
		"Z8_A5_TEMPLE":
			return CAMERA_PRESETS["a5"]
		_:
			return CAMERA_PRESETS["overview"]
