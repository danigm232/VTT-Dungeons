class_name WreckStructure
extends RefCounted

# Perfil canónico del Pecio Rosa de los Vientos (D&D 5e - Capítulo 3)
# Basado estrictamente en engine/shared/wreck-structure.ts

const PLAN_SCALE: float = 41.0 / 42.0
const TILE_METERS: float = 1.5
const LENGTH: float = 61.5
const STERN_X: float = -30.75
const BOW_X: float = 30.75
const LIST_SLOPE: float = 0.015 # 0.86 grados de escora constante hacia babor/estribor

const MAIN_HEIGHT: float = 0.0
const UPPER_HEIGHT: float = 3.0
const SEA_HEIGHT: float = -3.05
const C8_FLOOD_START := -29.0
const C8_FLOOD_END := 26.5
const C8_FLOOD_BEAM := 0.95
const KEEL_HEIGHT: float = -7.10
const STERN_BREACH_TOP: float = -2.78
const STERN_DECK_END: float = -13.5
const BOW_DECK_START: float = 13.5
const CROW_HEIGHT: float = 15.0
const CROW_RADIUS: float = 2.9

const STERN_BREACH_END: float = -24.0 # Límite de la gran rotura en popa

# Estaciones de manga a lo largo de la eslora (X, Semimanga Z)
static var stations: Array[Vector2] = []

static func _static_init() -> void:
	var raw_stations: Array = [
		Vector2(-31.5, 4.2),
		Vector2(-30.0, 6.35),
		Vector2(-27.0, 8.8),
		Vector2(-22.0, 10.1),
		Vector2(-18.0, 10.5),
		Vector2(0.0, 10.55),
		Vector2(14.0, 10.5),
		Vector2(20.0, 10.3),
		Vector2(24.0, 8.4),
		Vector2(28.0, 5.2),
		Vector2(30.0, 2.4),
		Vector2(31.5, 0.12)
	]
	stations.clear()
	for p in raw_stations:
		stations.append(Vector2(p.x * PLAN_SCALE, p.y * PLAN_SCALE))

static func get_beam_at(x: float) -> float:
	if stations.is_empty():
		_static_init()
	if x < STERN_X or x > BOW_X:
		return 0.0
	for i in range(1, stations.size()):
		var a = stations[i - 1]
		var b = stations[i]
		if x <= b.x:
			return a.y + (b.y - a.y) * (x - a.x) / (b.x - a.x)
	return stations[-1].y

static func get_list_height(z: float) -> float:
	return z * LIST_SLOPE

static func get_world_pos(x: float, y: float, z: float) -> Vector3:
	# Y se ajusta con la inclinación real por escora
	return Vector3(x, y + get_list_height(z), z)
