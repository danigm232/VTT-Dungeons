class_name CampStructure
extends RefCounted

## Canonical layout & coordinate contract for the 5 migrated VTT camp scenes.
## Consumes res://assets/data/camps-layout.json exported directly from
## campaigns/camp-rests/public/pack.ts and a1-layout.ts.

const DATA_PATH := "res://assets/data/camps-layout.json"
const TILE_METERS := 1.5
const GRID_COLS := 48
const GRID_ROWS := 22

const SCENE_PATHS := {
	"camp-a1-rooms": "res://scenes/camp_a1_rooms.tscn",
	"camp-forest-pleamar": "res://scenes/camp_forest_pleamar.tscn",
	"camp-wreck-beach": "res://scenes/camp_wreck_beach.tscn",
	"camp-cliffs-observatory": "res://scenes/camp_cliffs_observatory.tscn",
	"camp-coastal-refuge": "res://scenes/camp_coastal_refuge.tscn",
}

const SCENE_ORDER := [
	"camp-a1-rooms",
	"camp-forest-pleamar",
	"camp-wreck-beach",
	"camp-cliffs-observatory",
	"camp-coastal-refuge",
]

const LANDMARKS := {
	"spawn": {"world_pos": Vector3(18.0, 0.05, 16.5), "label": "Campamento"}
}

static var _cache: Dictionary = {}
static var _scenes_by_id: Dictionary = {}
static var _active_scene_id: String = "camp-forest-pleamar"

static func load_bundle() -> Dictionary:
	if not _cache.is_empty():
		return _cache
	if not FileAccess.file_exists(DATA_PATH):
		push_error("CampStructure: missing " + DATA_PATH)
		return {}
	var parsed = JSON.parse_string(FileAccess.get_file_as_string(DATA_PATH))
	if parsed is Dictionary:
		_cache = parsed
		_scenes_by_id.clear()
		for sc in _cache.get("scenes", []):
			if sc is Dictionary and sc.has("id"):
				_scenes_by_id[str(sc["id"])] = sc
	return _cache

static func set_active_scene_id(scene_id: String) -> void:
	if scene_id != "":
		_active_scene_id = scene_id

static func get_active_scene_id() -> String:
	return _active_scene_id

static func get_scene_def(scene_id: String) -> Dictionary:
	load_bundle()
	return _scenes_by_id.get(scene_id, {})

static func get_all_scene_defs() -> Array[Dictionary]:
	load_bundle()
	var out: Array[Dictionary] = []
	for sid in SCENE_ORDER:
		if _scenes_by_id.has(sid):
			out.append(_scenes_by_id[sid])
	return out

static func scene_path_for_id(scene_id: String) -> String:
	return SCENE_PATHS.get(scene_id, "res://scenes/camp_forest_pleamar.tscn")

static func scene_id_from_path(scene_path: String) -> String:
	for sid in SCENE_PATHS:
		if SCENE_PATHS[sid] == scene_path:
			return sid
	return _active_scene_id

static func get_a1_layout() -> Dictionary:
	load_bundle()
	return _cache.get("a1Layout", {})

static func get_forest_stream() -> Dictionary:
	load_bundle()
	return _cache.get("forestStream", {})

static func get_activities_catalog() -> Array:
	load_bundle()
	return _cache.get("activities", [])

static func tile_to_world(col: int, row: int, elevation: float = 0.0) -> Vector3:
	return Vector3((float(col) + 0.5) * TILE_METERS, elevation, (float(row) + 0.5) * TILE_METERS)

static func world_to_cell(pos: Vector3) -> Vector2i:
	return Vector2i(int(floor(pos.x / TILE_METERS)), int(floor(pos.z / TILE_METERS)))

static func _forest_stream_x_at(z: float) -> float:
	var raw: Array = get_forest_stream().get("samples", [])
	if raw.size() < 2:
		return 4.65
	for i in range(raw.size() - 1):
		var a: Dictionary = raw[i]
		var b: Dictionary = raw[i + 1]
		var za := float(a["z"]); var zb := float(b["z"])
		if (z >= za and z <= zb) or (z <= za and z >= zb):
			var t := clampf((z - za) / maxf(0.0001, zb - za), 0.0, 1.0)
			return lerpf(float(a["x"]), float(b["x"]), t)
	if z < float(raw[0]["z"]):
		return float(raw[0]["x"])
	return float(raw[raw.size() - 1]["x"])

static func _forest_stream_half_width(z: float) -> float:
	return 1.92 + sin(z * 0.37) * 0.26 + cos(z * 0.71) * 0.12

static func is_on_forest_bridge(pos: Vector3) -> bool:
	var bx := _forest_stream_x_at(17.0)
	var span_half := _forest_stream_half_width(17.0) + 0.72
	# Match plank corridor & stone abutments cleanly; if character is elevated atop bridge/ramps (y>=0.04) give full deck margin
	if pos.y >= 0.04 and absf(pos.z - 17.0) <= 1.05 and absf(pos.x - bx) <= span_half + 0.45:
		return true
	return absf(pos.z - 17.0) <= 0.86 and absf(pos.x - bx) <= span_half + 0.12

static func is_water_at(pos: Vector3, scene_def: Dictionary) -> bool:
	var sid := str(scene_def.get("id", ""))
	if sid == "camp-forest-pleamar":
		if is_on_forest_bridge(pos):
			return false
		# Walking high above river surface means traversing bridge/abutment, never stepping in water
		if pos.y >= 0.06:
			return false
		var sx := _forest_stream_x_at(pos.z)
		var hw := _forest_stream_half_width(pos.z)
		if absf(pos.x - sx) <= hw:
			return true
		return false
	var cell := world_to_cell(pos)
	for entry in scene_def.get("walkable", []):
		if int(entry.get("col", -999)) == cell.x and int(entry.get("row", -999)) == cell.y:
			return str(entry.get("medium", "solid")) == "water" or str(entry.get("materialId", "")) == "water"
	return false

static func is_shallow_water_at(pos: Vector3, scene_def: Dictionary) -> bool:
	var sid := str(scene_def.get("id", ""))
	if sid == "camp-forest-pleamar":
		return is_water_at(pos, scene_def)
	if sid == "camp-coastal-refuge" and pos.z < 22.5:
		return is_water_at(pos, scene_def)
	return false

static func get_map_center(scene_def: Dictionary) -> Vector3:
	var cols := int(scene_def.get("cols", 25))
	var rows := int(scene_def.get("rows", 22))
	return Vector3(float(cols) * TILE_METERS * 0.5, 0.0, float(rows) * TILE_METERS * 0.5)

static func get_map_bounds(scene_def: Dictionary) -> Rect2:
	var cols := int(scene_def.get("cols", 25))
	var rows := int(scene_def.get("rows", 22))
	return Rect2(0.25, 0.25, float(cols) * TILE_METERS - 0.5, float(rows) * TILE_METERS - 0.5)

static func is_in_tent(pos: Vector3, scene_def: Dictionary) -> Dictionary:
	var points: Array = scene_def.get("interactionPoints", [])
	for pt in points:
		if str(pt.get("kind", "")) == "tent":
			var cx := (float(pt.get("col", 0)) + 0.5) * TILE_METERS
			var cz := (float(pt.get("row", 0)) + 0.5) * TILE_METERS
			if absf(pos.x - cx) <= 1.85 and absf(pos.z - cz) <= 1.55:
				return pt
	return {}

static func get_a1_room_at(pos: Vector3) -> Dictionary:
	var a1 := get_a1_layout()
	var cell := world_to_cell(pos)
	for rm in a1.get("rooms", []):
		for rc in rm.get("cells", []):
			if int(rc["col"]) == cell.x and int(rc["row"]) == cell.y:
				return rm
	return {}

static func get_zone_at(pos: Vector3, scene_id: String = "") -> Dictionary:
	var sid := scene_id if scene_id != "" else _active_scene_id
	var scene_def := get_scene_def(sid)
	if scene_def.is_empty():
		return {"id": "camp", "label": "Campamento", "elevation_min": 0.0, "is_interior": false}

	if sid == "camp-a1-rooms":
		var rm := get_a1_room_at(pos)
		if not rm.is_empty():
			return {
				"id": str(rm.get("key", "cell-%s" % str(rm.get("id", "1")))),
				"label": "A1 · " + str(rm.get("label", "Habitación")),
				"elevation_min": 0.0,
				"is_interior": true,
			}
		var col := int(floor(pos.x / TILE_METERS))
		if col >= 32:
			return {"id": "cliff_east", "label": "A1 · Mirador y acantilado oeste/este", "elevation_min": 0.0, "is_interior": false}
		return {"id": "plaza", "label": "A1 · Plaza y altar de Astalagan", "elevation_min": 0.0, "is_interior": false}

	var tent := is_in_tent(pos, scene_def)
	if not tent.is_empty():
		return {
			"id": str(tent.get("id", "tent")),
			"label": str(tent.get("label", "Tienda")),
			"elevation_min": 0.0,
			# Outdoor open tarps are NOT closed interiors (must keep camera tilt & roof steady!)
			"is_interior": false,
		}

	for pt in scene_def.get("interactionPoints", []):
		if str(pt.get("kind", "")) == "fire":
			var fp := tile_to_world(int(pt["col"]), int(pt["row"]), 0.0)
			if pos.distance_to(fp) <= 3.6:
				return {"id": "hearth", "label": str(pt.get("label", "Hoguera")), "elevation_min": 0.0, "is_interior": false}

	return {
		"id": sid,
		"label": str(scene_def.get("title", "Campamento")),
		"elevation_min": 0.0,
		"is_interior": false,
	}

static func get_zones_for_scene(scene_def: Dictionary) -> Array[Dictionary]:
	var sid := str(scene_def.get("id", ""))
	var center := get_map_center(scene_def)
	var zones: Array[Dictionary] = [
		{
			"id": "overview",
			"code": "GEN",
			"label": "Vista general · Claro del campamento",
			"focus": center,
			"distance": 42.0 if sid == "camp-a1-rooms" else 34.0,
			"overview": true,
			"is_interior": false,
			"note": str(scene_def.get("safetyNotice", "")),
		}
	]

	if sid == "camp-a1-rooms":
		var a1 := get_a1_layout()
		var sc: Dictionary = a1.get("statueCell", {"col": 23, "row": 15})
		var fc: Dictionary = a1.get("fireCell", {"col": 23, "row": 18})
		zones.append({
			"id": "plaza",
			"code": "PLZ",
			"label": "Plaza de Astalagan y hoguera",
			"focus": tile_to_world(int(sc.get("col", 23)), int(fc.get("row", 16)), 0.0),
			"distance": 20.0,
			"overview": false,
			"is_interior": false,
			"note": "Estatua de bronce de Astalagan con velas votivas, altar y fogata de plaza.",
		})
		for rm in a1.get("rooms", []):
			var rc := int((int(rm["colMin"]) + int(rm["colMax"])) / 2)
			var rr := int((int(rm["rowMin"]) + int(rm["rowMax"])) / 2)
			var rkey := str(rm.get("key", "cell-%s" % str(rm.get("id", "1"))))
			zones.append({
				"id": rkey,
				"code": "H" + str(rm.get("id", "")),
				"label": "%s (%s)" % [str(rm["label"]), str(rm.get("occupant", ""))],
				"focus": tile_to_world(rc, rr, 0.0),
				"distance": 13.5,
				"overview": false,
				"is_interior": true,
				"note": "Celda excavada %s · techo cutaway automático al entrar." % str(rm["label"]),
			})
		return zones

	for pt in scene_def.get("interactionPoints", []):
		var kind := str(pt.get("kind", ""))
		if kind in ["fire", "tent", "guard", "personal"]:
			if kind == "personal":
				continue
			zones.append({
				"id": str(pt["id"]),
				"code": kind.to_upper().substr(0, 3),
				"label": str(pt["label"]),
				"focus": tile_to_world(int(pt["col"]), int(pt["row"]), 0.0),
				"distance": 13.0 if kind == "tent" else 16.5,
				"overview": false,
				"is_interior": kind == "tent",
				"note": str(pt.get("description", "")),
			})
	return zones
