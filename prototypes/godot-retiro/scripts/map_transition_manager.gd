extends Node

# ==============================================================================
# GESTOR PERSISTENTE DE TRANSICIONES ENTRE MAPAS (MapTransition Autoload)
# Maneja fundidos suaves, carga de escena, punto/orientación de llegada y DM.
# ==============================================================================

const MapExitScript = preload("res://scripts/map_exit.gd")

signal transition_started(from_scene: String, to_scene: String, spawn_id: String)
signal transition_completed(scene_path: String, spawn_id: String)

var pending_spawn_id: String = ""
var pending_facing: String = "n"
var pending_source_exit_id: String = ""
var pending_destination_label: String = ""
var pending_active_party_idx: int = 0
var pending_role: String = ""
var is_transitioning: bool = false
var locked_exit_ids: Dictionary = {}

var _fade_layer: CanvasLayer
var _fade_rect: ColorRect
var _fade_title: Label
var _fade_subtitle: Label
var _active_prompt_exit_id: String = ""

func _ready() -> void:
	_build_fade_overlay()

func _build_fade_overlay() -> void:
	_fade_layer = CanvasLayer.new()
	_fade_layer.name = "MapTransitionFadeLayer"
	_fade_layer.layer = 120
	add_child(_fade_layer)

	_fade_rect = ColorRect.new()
	_fade_rect.name = "FadeCurtain"
	_fade_rect.color = Color(0.03, 0.05, 0.07, 0.0)
	_fade_rect.set_anchors_preset(Control.PRESET_FULL_RECT)
	_fade_rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_fade_rect.visible = false
	_fade_layer.add_child(_fade_rect)

	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	center.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_fade_rect.add_child(center)

	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 6)
	center.add_child(vbox)

	_fade_title = Label.new()
	_fade_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_fade_title.add_theme_font_size_override("font_size", 24)
	_fade_title.add_theme_color_override("font_color", Color(0.94, 0.86, 0.66))
	vbox.add_child(_fade_title)

	_fade_subtitle = Label.new()
	_fade_subtitle.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_fade_subtitle.add_theme_font_size_override("font_size", 14)
	_fade_subtitle.add_theme_color_override("font_color", Color(0.76, 0.82, 0.86))
	vbox.add_child(_fade_subtitle)

func begin_transition(exit_node: Node, actor: Node = null) -> bool:
	if is_transitioning:
		return false
	if not is_instance_valid(exit_node):
		return false
	if exit_node.dm_locked or is_exit_locked(exit_node.exit_id):
		notify_blocked(exit_node)
		return false
	if exit_node.target_scene_path.is_empty():
		return false
	if not ResourceLoader.exists(exit_node.target_scene_path):
		push_warning("MapTransition: destino no encontrado: " + exit_node.target_scene_path)
		return false

	is_transitioning = true
	var from_scene := ""
	var cur := get_tree().current_scene
	if cur:
		from_scene = cur.scene_file_path
		if "active_party_idx" in cur:
			pending_active_party_idx = int(cur.get("active_party_idx"))
		var ui := cur.find_child("VttRoleUi", true, false)
		if ui and "current_role" in ui:
			pending_role = str(ui.get("current_role"))

	if is_instance_valid(actor):
		actor.set("is_transitioning", true)

	pending_spawn_id = exit_node.target_spawn_id
	pending_facing = exit_node.entry_facing
	pending_source_exit_id = exit_node.exit_id
	pending_destination_label = exit_node.destination_label

	transition_started.emit(from_scene, exit_node.target_scene_path, pending_spawn_id)
	_perform_scene_swap(exit_node.target_scene_path, exit_node.destination_label, exit_node.transition_mode)
	return true

func _perform_scene_swap(scene_path: String, dest_label: String, mode: String) -> void:
	var loading := get_node_or_null("/root/SkillLoading")
	if loading != null:
		if not is_instance_valid(loading.loaded_map): loading.loaded_map = get_tree().current_scene
		loading.load_map(scene_path, dest_label, "map")
		await loading.map_entered
		is_transitioning = false
		transition_completed.emit(scene_path, pending_spawn_id)
		return
	_fade_rect.visible = true
	_fade_rect.mouse_filter = Control.MOUSE_FILTER_STOP
	_fade_rect.color.a = 0.0
	_fade_title.text = dest_label if not dest_label.is_empty() else "Viajando..."
	_fade_subtitle.text = "Navegando por la ensenada..." if mode == "boat" else "Continuando el camino..."

	var tw_out := create_tween()
	tw_out.tween_property(_fade_rect, "color:a", 1.0, 0.32).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	await tw_out.finished

	var err := get_tree().change_scene_to_file(scene_path)
	if err != OK:
		push_error("MapTransition: fallo al cargar %s (err=%d)" % [scene_path, err])
		is_transitioning = false
		_fade_rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
		_fade_rect.visible = false
		return

	await get_tree().process_frame
	await get_tree().process_frame

	var tw_in := create_tween()
	tw_in.tween_property(_fade_rect, "color:a", 0.0, 0.36).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)
	await tw_in.finished

	_fade_rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_fade_rect.visible = false
	is_transitioning = false
	transition_completed.emit(scene_path, pending_spawn_id)

func apply_pending_spawn(scene_root: Node, party: Array[Node3D], cam: Node = null) -> bool:
	sync_locks_in_scene(scene_root)
	if pending_spawn_id.is_empty():
		return false

	var spawn_node := find_spawn_point(scene_root, pending_spawn_id)
	if not spawn_node:
		push_warning("MapTransition: SpawnPoint '%s' no encontrado en %s" % [pending_spawn_id, scene_root.name])
		pending_spawn_id = ""
		return false

	var base_pos: Vector3 = spawn_node.global_position
	var fwd := -spawn_node.global_transform.basis.z
	fwd.y = 0.0
	if fwd.length_squared() < 0.001:
		fwd = Vector3(0.0, 0.0, -1.0)
	fwd = fwd.normalized()
	var right := Vector3(-fwd.z, 0.0, fwd.x)

	var offsets := [Vector3.ZERO, -fwd * 1.45 - right * 0.9, -fwd * 1.45 + right * 0.9]
	for i in range(party.size()):
		var tok := party[i]
		if not is_instance_valid(tok):
			continue
		var off: Vector3 = offsets[mini(i, offsets.size() - 1)]
		tok.global_position = base_pos + off + Vector3(0.0, 0.08, 0.0)
		tok.set("velocity", Vector3.ZERO)
		tok.set("is_transitioning", false)
		if not pending_facing.is_empty():
			tok.set("facing_dir", pending_facing)

	# Evitar re-activación instantánea del MapExit cercano al punto de aparición
	for exit_node in get_scene_exits(scene_root):
		if exit_node.global_position.distance_to(base_pos) <= exit_node.trigger_radius + 2.8:
			exit_node.suppress_until_exit()

	var focus_tok: Node3D = party[clampi(pending_active_party_idx, 0, maxi(0, party.size() - 1))] if not party.is_empty() else null
	if cam and is_instance_valid(focus_tok):
		if cam.has_method("set_target_character"):
			cam.set_target_character(focus_tok)
		else:
			cam.set("target", focus_tok)
		cam.set("target_focus", focus_tok.global_position + Vector3(0.0, 0.9, 0.0))
		cam.set("focus_point", focus_tok.global_position + Vector3(0.0, 0.9, 0.0))
		if cam.has_method("update_camera_transform"):
			cam.update_camera_transform()

	pending_spawn_id = ""
	pending_source_exit_id = ""
	return true

func find_spawn_point(scene_root: Node, spawn_id: String) -> Node3D:
	if not scene_root or spawn_id.is_empty():
		return null
	var exact := scene_root.find_child("Spawn_" + spawn_id, true, false) as Node3D
	if exact:
		return exact
	for node in scene_root.find_children("*", "Node3D", true, false):
		if node.has_meta("spawn_id") and str(node.get_meta("spawn_id")) == spawn_id:
			return node as Node3D
	return null

func get_scene_exits(scene_root: Node = null) -> Array:
	var root := scene_root if scene_root else get_tree().current_scene
	var result: Array = []
	if not root:
		return result
	for node in root.find_children("*", "Node3D", true, false):
		if node is MapExitScript:
			result.append(node)
	return result

func sync_locks_in_scene(scene_root: Node = null) -> void:
	for ex in get_scene_exits(scene_root):
		if locked_exit_ids.has(ex.exit_id):
			ex.set_dm_locked(bool(locked_exit_ids[ex.exit_id]))

func set_exit_locked(exit_id: String, locked: bool, scene_root: Node = null) -> void:
	locked_exit_ids[exit_id] = locked
	for ex in get_scene_exits(scene_root):
		if ex.exit_id == exit_id:
			ex.set_dm_locked(locked)

func is_exit_locked(exit_id: String) -> bool:
	return bool(locked_exit_ids.get(exit_id, false))

func dm_highlight_all(enabled: bool, scene_root: Node = null) -> void:
	for ex in get_scene_exits(scene_root):
		ex.set_dm_highlighted(enabled)

func show_exit_prompt(exit_node: Node) -> void:
	_active_prompt_exit_id = str(exit_node.get("exit_id"))
	var cur := get_tree().current_scene
	if not cur:
		return
	var ui := cur.find_child("VttRoleUi", true, false)
	if ui and ui.get("player_hud") != null:
		var ph = ui.get("player_hud")
		if ph and ph.has_method("set_interaction_prompt"):
			ph.set_interaction_prompt(exit_node.get_prompt_text(), true)

func hide_exit_prompt(exit_node: Node) -> void:
	if _active_prompt_exit_id != str(exit_node.get("exit_id")):
		return
	_active_prompt_exit_id = ""
	var cur := get_tree().current_scene
	if not cur:
		return
	var ui := cur.find_child("VttRoleUi", true, false)
	if ui and ui.get("player_hud") != null:
		var ph = ui.get("player_hud")
		if ph and ph.has_method("set_interaction_prompt"):
			ph.set_interaction_prompt("", false)

func notify_blocked(exit_node: Node) -> void:
	var cur := get_tree().current_scene
	if not cur:
		return
	var ui := cur.find_child("VttRoleUi", true, false)
	if ui and ui.has_method("notify_mesa"):
		ui.notify_mesa("Paso bloqueado por el DM: %s" % str(exit_node.get("display_name")))
