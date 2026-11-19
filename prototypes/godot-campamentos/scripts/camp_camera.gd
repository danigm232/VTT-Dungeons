class_name TacticalCamera
extends "res://scripts/vtt_camera_base.gd"

## 2.5D canonical orthographic/perspective camera contract for all 5 campamentos.
## Implements Q/E +-30 deg orbit, F/R 5..25 deg tilt, 10 deg interior / 25 deg
## exterior auto-tilt across A1 excavated cells and outdoor tents, and DM presets.

const Structure = preload("res://scripts/camp_structure.gd")

var scene_id: String = "camp-forest-pleamar"
var scene_def: Dictionary = {}
var current_preset_key: String = "overview"

func _init() -> void:
	min_distance = 6.0
	max_distance = 120.0
	default_distance = 22.0
	detail_key_enabled = true

func _ready() -> void:
	super._ready()

func configure_for_scene(sdef: Dictionary) -> void:
	scene_def = sdef
	scene_id = str(sdef.get("id", "camp-forest-pleamar"))
	_build_overview_envelope_points()
	var center := Structure.get_map_center(sdef)
	target_focus = center + Vector3.UP * 0.9
	focus_point = target_focus
	is_overview = false
	target_distance = 24.0 if scene_id == "camp-a1-rooms" else 20.0
	current_distance = target_distance
	_apply_zone_boundary_transition(false, "exterior")
	current_pitch = target_pitch
	update_camera_transform()

func _build_overview_envelope_points() -> void:
	_overview_points.clear()
	var cols := float(scene_def.get("cols", 25))
	var rows := float(scene_def.get("rows", 22))
	var wx := cols * Structure.TILE_METERS
	var wz := rows * Structure.TILE_METERS
	for x in [0.0, wx]:
		for y in [0.0, 5.0]:
			for z in [0.0, wz]:
				_overview_points.append(Vector3(x, y, z))

func detect_wreck_zone(point: Vector3) -> String:
	var z := Structure.get_zone_at(point, scene_id)
	if bool(z.get("is_interior", false)):
		return str(z.get("id", "interior"))
	return "exterior"

func is_interior_zone(zone: String) -> bool:
	return zone != "exterior" and zone != "plaza" and zone != ""

func calculate_zone_follow_target(point: Vector3, _zone: String = "") -> Vector3:
	return point + Vector3.UP * 0.9

func get_zone_zoom_limits(zone: String) -> Vector2:
	if is_interior_zone(zone):
		return Vector2(6.0, 32.0)
	return Vector2(6.0, 75.0)

func clamp_navigation_point(point: Vector3) -> Vector3:
	var b := Structure.get_map_bounds(scene_def)
	return Vector3(
		clampf(point.x, b.position.x, b.position.x + b.size.x),
		point.y,
		clampf(point.z, b.position.y, b.position.y + b.size.y)
	)

func apply_zone_preset(key: String, instant: bool = false) -> void:
	current_preset_key = key
	var zones := Structure.get_zones_for_scene(scene_def)
	for z in zones:
		if str(z.get("id", "")) == key:
			is_overview = bool(z.get("overview", false))
			is_following = false
			var f: Vector3 = z.get("focus", Structure.get_map_center(scene_def))
			target_focus = f + Vector3.UP * 0.9
			var interior := bool(z.get("is_interior", false))
			_apply_zone_boundary_transition(interior, key if interior else "exterior")
			target_distance = clampf(float(z.get("distance", 20.0)), min_distance, max_distance)
			if instant:
				focus_point = target_focus
				current_distance = target_distance
				current_pitch = target_pitch
				update_camera_transform()
			return
