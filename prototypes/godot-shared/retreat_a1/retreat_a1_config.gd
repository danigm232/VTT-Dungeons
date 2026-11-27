extends RefCounted

# ==============================================================================
# CONFIGURACIÓN CANÓNICA ÚNICA DEL SECTOR A1 (EL RETIRO DEL DRAGÓN <-> A1 ROOMS)
# Única fuente de verdad compartida en disco por godot-retiro y godot-campamentos.
# Cualquier ajuste de posiciones, IDs, materiales o props aquí se refleja
# automáticamente en FULL_RETREAT y en A1_CAMP sin copiar archivos.
# ==============================================================================

enum LoadProfile {
	FULL_RETREAT = 0,
	A1_CAMP = 1,
}

const TILE_METERS: float = 1.5
const ELEV_SEA: float = 0.0
const ELEV_A1_PLAZA: float = 9.0
const A1_TRANSLATION: Vector3 = Vector3(72.0, 9.0, 72.0)

# Las 6 celdas excavadas canónicas de A1 (coordenadas globales del Retiro del Dragón)
const A1_CELLS: Array[Dictionary] = [
	{
		"id": "cell_1",
		"camp_key": "cell-1",
		"room_id": 1,
		"role": "invitados",
		"label": "Celda 1",
		"rect_tiles": Rect2i(51, 55, 5, 5),
		"x0": 76.3, "x1": 85.0, "z0": 76.0, "z1": 89.1,
		"door_x": 81.75,
		"floor_rect": Rect2(76.8, 79.0, 7.6, 8.8),
		"bed_canonical_id": "a1-room-1-bed",
		"bed_node_name": "PilgrimBed_78_81",
	},
	{
		"id": "cell_2",
		"camp_key": "cell-2",
		"room_id": 2,
		"role": "tarak",
		"label": "Celda de Tarak",
		"rect_tiles": Rect2i(58, 51, 4, 9),
		"x0": 85.0, "x1": 95.2, "z0": 76.0, "z1": 89.1,
		"door_x": 90.75,
		"floor_rect": Rect2(86.2, 76.6, 7.6, 11.2),
		"bed_canonical_id": "a1-room-2-bed",
		"bed_node_name": "PilgrimBed_87_79",
	},
	{
		"id": "cell_3",
		"camp_key": "cell-3",
		"room_id": 3,
		"role": "varnoth",
		"label": "Celda de Varnoth",
		"rect_tiles": Rect2i(64, 53, 6, 7),
		"x0": 95.2, "x1": 106.5, "z0": 76.0, "z1": 89.1,
		"door_x": 101.25,
		"floor_rect": Rect2(96.4, 78.0, 8.6, 9.8),
		"bed_canonical_id": "a1-room-3-bed",
		"bed_node_name": "PilgrimBed_98_80",
	},
	{
		"id": "cell_4",
		"camp_key": "cell-4",
		"room_id": 4,
		"role": "myla",
		"label": "Taller de Myla",
		"rect_tiles": Rect2i(72, 52, 6, 8),
		"x0": 106.5, "x1": 117.8, "z0": 76.0, "z1": 89.1,
		"door_x": 111.75,
		"floor_rect": Rect2(108.2, 76.8, 8.4, 11.0),
		"bed_canonical_id": "a1-room-4-bed",
		"bed_node_name": "PilgrimBed_109_80",
	},
	{
		"id": "cell_5",
		"camp_key": "cell-5",
		"room_id": 5,
		"role": "kobolds_w",
		"label": "Kobolds Oeste",
		"rect_tiles": Rect2i(80, 51, 3, 9),
		"x0": 117.8, "x1": 126.6, "z0": 76.0, "z1": 89.1,
		"door_x": 122.25,
		"floor_rect": Rect2(119.2, 76.6, 5.8, 11.2),
		"bed_canonical_id": "a1-room-5-hammocks",
		"bed_node_name": "KoboldHammock_1200_790",
	},
	{
		"id": "cell_6",
		"camp_key": "cell-6",
		"room_id": 6,
		"role": "kobolds_e",
		"label": "Kobolds Este",
		"rect_tiles": Rect2i(85, 52, 6, 8),
		"x0": 126.6, "x1": 136.8, "z0": 76.0, "z1": 89.1,
		"door_x": 131.25,
		"floor_rect": Rect2(127.8, 76.8, 7.6, 11.0),
		"bed_canonical_id": "a1-room-6-hammocks",
		"bed_node_name": "KoboldHammock_1291_798",
	},
]

# Puntos focales canónicos de Plaza A1 (coordenadas globales del Retiro)
const PLAZA_FIRE_POS := Vector3(108.75, ELEV_A1_PLAZA, 93.75)
const ASTALAGAN_POS := Vector3(85.80, ELEV_A1_PLAZA, 93.35)
const WELL_POS := Vector3(95.60, ELEV_A1_PLAZA, 93.45)
const PERGOLA_POS := Vector3(123.5, ELEV_A1_PLAZA, 95.0)
const SUPPLY_CORNER_POS := Vector3(76.2, ELEV_A1_PLAZA, 95.65)
const BLEPP_LOOKOUT_POS := Vector3(107.4, ELEV_A1_PLAZA, 95.55)
const REFRESHMENT_TABLE_POS := Vector3(106.4, ELEV_A1_PLAZA, 89.48)
const PARAPET_BLANKET_POS := Vector3(88.8, ELEV_A1_PLAZA + 0.56, 96.76)
const FIREWOOD_STACK_POS := Vector3(111.4, ELEV_A1_PLAZA, 95.35)
const CLOISTER_BENCH_XS: Array[float] = [86.0, 95.3, 117.8]

# Ajustes artísticos canónicos compartidos (cualquier cambio se refleja en FULL_RETREAT y A1_CAMP)
static var STYLE_TUNING: Dictionary = {
	"bench_rug_main": Color("#7c4d3e"),
	"bench_rug_border": Color("#bfa072"),
	"bench_rug_offset_z": 0.56,
	"bench_rug_size": Vector2(2.15, 1.05),
	"door_mat_main": Color("#6e4c3a"),
	"door_mat_border": Color("#b79668"),
	"door_mat_size": Vector2(1.52, 0.86),
	"door_lantern_energy": 0.88,
	"door_lantern_range": 5.4,
	"door_lantern_color": Color("#ffba6a"),
	"plaza_bench_runner_a": Color("#eadcc7"),
	"plaza_bench_runner_b": Color("#c88a36"),
	"well_lantern_energy": 1.65,
	"parapet_lantern_energy": 1.15,
	"portal_torch_energy": 1.65,
	"version": "canonical-a1-v1",
}

# 14 jardineras pétreas canónicas del borde sur de Plaza A1 (coordenadas exactas de El Retiro del Dragón, Z=98.55, Y=9.00..9.56)
const A1_SOUTH_RIM_TROUGHS: Array[Array] = [
	[76.00, 1.70], [80.00, 1.86], [84.50, 2.02], [89.00, 1.70],
	[93.50, 1.86], [98.00, 2.02], [102.50, 1.70], [107.00, 1.86],
	[115.50, 2.02], [120.00, 1.70], [124.50, 1.86], [129.00, 2.02],
	[133.50, 1.70], [138.00, 1.86],
]

# Envolvente de contexto visual inmediato permitido en modo A1_CAMP (coordenadas globales del Retiro)
# Cubre la plaza A1 (x=72..144, z=75..99), el acantilado marino sur hasta el agua (z<=126),
# los hombros rocosos oeste/este (x=42..172) y la corona de acantilado inmediata detrás (z>=54, y<=25.5)
# sin instanciar A2, A3, A4, A5, muelle, playa oeste, escaleras superiores ni bosque de montaña.
const A1_CAMP_CLIP_MIN := Vector3(44.0, -6.0, 56.0)
const A1_CAMP_CLIP_MAX := Vector3(170.0, 25.5, 126.0)

# Prefijos de mallas estrictamente excluidos en modo A1_CAMP (nunca se instancian ni colisionan)
const A1_CAMP_FORBIDDEN_PREFIXES: Array[String] = [
	"a2__", "a2fin__",
	"a3__", "a3fin__",
	"a4__", "a4fin__",
	"a5__", "a5fin__",
	"shore__", "conn__",
	"r2ext__", "r3shoulder__", "r3paths__",
	"sal2__", "sal2r__",
	"v5coast__v2_", "v5coast__v5_", "v5coast__v4_",
	"p5__", "v4__",
	"r3land__",
	"geo14__",
]

# Cierres físicos y visuales exclusivos del modo A1_CAMP (nunca creados en FULL_RETREAT)
const A1_CAMP_CLOSURES: Dictionary = {
	"west": {
		"name": "A1CampClosure_West",
		"x": 73.15,
		"z_north": 90.65,
		"z_south": 96.45,
		"wing_north_z": 88.80,
		"wing_south_z": 97.15,
		"y": ELEV_A1_PLAZA,
		"facing_sign": 1.0,
		"label": "Verja oeste hacia la bajada de la playa",
	},
	"east": {
		"name": "A1CampClosure_East",
		"x": 140.95,
		"z_north": 90.20,
		"z_south": 95.85,
		"wing_north_z": 88.50,
		"wing_south_z": 96.95,
		"y": ELEV_A1_PLAZA,
		"facing_sign": -1.0,
		"label": "Verja este hacia el sendero del acantilado",
	},
}

# Nodos que pertenecen a sectores externos al A1 y NO deben existir en modo A1_CAMP
const FORBIDDEN_OUTER_NODES_IN_CAMP: Array[String] = [
	"A2_WinchAssembly",
	"A3_DiningHall",
	"A4_Library",
	"A5_Temple",
	"Staircases",
	"CoastalPierAndBeach",
	"LushMountainForest",
	"Landmarks",
	"MapTransitionPaths",
	"A3_Refectory_Furniture",
	"A4_Scriptorium_Furniture",
	"UpperWalkway_Furniture",
	"UpperWalkway_Lanterns",
	"CaveRoof_a3_dining",
	"CaveRoof_a4_library",
	"Surface_Beach",
	"Surface_A2_WinchDeck",
	"Surface_UpperWalkway",
	"Surface_A3_DiningFloor",
	"Surface_A4_LibraryFloor",
	"Surface_A5_TemplePlatform",
	"Surface_PleamarTrail",
	"Surface_ObservatoryTrail",
	"Surface_IslandPleamarLow",
	"Surface_IslandPleamarHigh",
	"Surface_IslandObservatory",
	"BabylonLandscapeR3",
]

static func get_cell_by_id(cell_id: String) -> Dictionary:
	for c in A1_CELLS:
		if str(c["id"]) == cell_id or str(c["camp_key"]) == cell_id:
			return c
	return {}
