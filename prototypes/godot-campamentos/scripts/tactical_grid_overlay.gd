class_name TacticalGridOverlay
extends "res://player/walkable_grid.gd"
var show_grid := true
var outdoor_subtle_sage := false

func build_for_scene(scene_def: Dictionary) -> void:
	outdoor_subtle_sage = str(scene_def.get("id", "")) != "camp-a1-rooms"
	var source: Array = []
	for cell in scene_def.get("walkable", []):
		source.append(square(int(cell.col), int(cell.row)))
	configure(source)

func _rebuild(version: int) -> void:
	await super._rebuild(version)
	if outdoor_subtle_sage and material:
		material.set_shader_parameter("opacity", 0.095)
		material.set_shader_parameter("thickness", 0.56)
		material.set_shader_parameter("contrast_mode", false)
		material.set_shader_parameter("line_color", Color("#9ca696"))

func apply_preferences(prefs: Dictionary, focus: Vector3) -> void:
	super.apply_preferences(prefs, focus)
	if outdoor_subtle_sage and material:
		var base_op := float(prefs.get("gridOpacity", 0.22)) if prefs.get("showGrid", true) else 0.0
		material.set_shader_parameter("opacity", clampf(base_op * 0.44, 0.0, 0.22))
		material.set_shader_parameter("thickness", 0.56)
		material.set_shader_parameter("contrast_mode", false)
		material.set_shader_parameter("line_color", Color("#9ca696"))

func set_grid_visible(value: bool) -> void: show_grid = value; visible = value
func set_grid_opacity(value: float) -> void:
	if material:
		material.set_shader_parameter("opacity", clampf(value * 0.44, 0.0, 0.22) if outdoor_subtle_sage else value)
