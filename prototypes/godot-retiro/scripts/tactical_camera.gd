class_name TacticalCamera
extends "res://scripts/vtt_camera_base.gd"

const Structure = preload("res://scripts/retreat_structure.gd")
const ROOM_RECTS = [Rect2i(51,55,5,5),Rect2i(58,51,4,9),Rect2i(64,53,6,7),Rect2i(72,52,6,8),Rect2i(80,51,3,9),Rect2i(85,52,6,8)]
var current_preset_key: String = "overview"

func _init() -> void:
	min_distance = 6.0; max_distance = 160.0; default_distance = 24.0
	detail_key_enabled = false # G remains the existing winch control in this map.

func _ready() -> void:
	super._ready()

func _build_overview_envelope_points() -> void:
	_overview_points.clear()
	for x in [0.0,168.0]:
		for y in [0.0,38.0]:
			for z in [0.0,120.0]: _overview_points.append(Vector3(x,y,z))

func detect_wreck_zone(point: Vector3) -> String:
	# Route scenes reuse this camera, but have their own local coordinates.
	if get_parent().get("scene_kind") != null: return "exterior"
	var cell := Structure.world_to_cell(point)
	if absf(point.y-9.0)<3.0:
		for i in range(ROOM_RECTS.size()):
			if ROOM_RECTS[i].has_point(cell): return "room-"+str(i+1)
	for key in ["Z4_A2_WINCH","Z5_A3_DINING","Z6_A4_LIBRARY"]:
		var zone: Dictionary = Structure.ZONES.get(key,{})
		if zone.is_empty(): continue
		var bx: Vector2 = zone["bounds_x"]
		var bz: Vector2 = zone["bounds_z"]
		if point.x>=bx.x and point.x<=bx.y and point.z>=bz.x and point.z<=bz.y and absf(point.y-float(zone["elevation_min"]))<3.0:
			return str(zone["surface_id"])
	return "exterior"

func is_interior_zone(zone: String) -> bool:
	return zone.begins_with("room-") or zone in ["a2","a3","a4"]

func calculate_zone_follow_target(point: Vector3, _zone: String = "") -> Vector3:
	return point + Vector3.UP * 0.9

func get_zone_zoom_limits(zone: String) -> Vector2:
	if is_interior_zone(zone): return Vector2(6.0,36.0)
	return Vector2(6.0,90.0)

func get_player_max_distance(zone_id: String = "") -> float:
	var z := zone_id if zone_id != "" else current_zone_id
	if is_interior_zone(z):
		return 30.0
	var parent_node := get_parent()
	if parent_node and parent_node.get("scene_kind") != null:
		return 32.0
	return 44.0

func get_world_visual_bounds() -> Rect2:
	var parent_node := get_parent()
	if not parent_node:
		return Rect2()
	if parent_node.get("scene_kind") != null:
		return Rect2(-264.0, -264.0, 528.0, 528.0)
	if parent_node.find_child("RetreatLayoutBuilder", true, false) != null:
		return Rect2(-340.0, -310.0, 848.0, 756.0)
	return Rect2()

func clamp_navigation_point(point: Vector3) -> Vector3:
	var scene_root := get_tree().current_scene if get_tree() else null
	if scene_root and scene_root.has_meta("map_bounds_xz"):
		var b: Rect2 = scene_root.get_meta("map_bounds_xz")
		return Vector3(clampf(point.x, b.position.x, b.position.x + b.size.x), point.y, clampf(point.z, b.position.y, b.position.y + b.size.y))
	return Vector3(clampf(point.x,-18.0,167.5),point.y,clampf(point.z,0.5,146.5))


func apply_zone_preset(key: String,instant: bool = false) -> void:
	if not Structure.CAMERA_PRESETS.has(key): return
	current_preset_key = key
	var preset: Dictionary = Structure.CAMERA_PRESETS[key]
	is_overview = key == "overview"
	is_following = false
	target_focus = preset["target"]
	if not is_overview: _apply_zone_boundary_transition(is_interior_zone(detect_wreck_zone(target_focus)),detect_wreck_zone(target_focus))
	var zb := _effective_zoom_bounds(current_zone_id)
	target_distance = clampf(float(preset["ortho_half"])/tan(deg_to_rad(fov*0.5)),zb.x,zb.y)
	if instant:
		focus_point = target_focus; current_distance = target_distance; current_pitch = target_pitch
		update_camera_transform()
