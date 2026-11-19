class_name MainController
extends Node3D

# ==============================================================================
# CONTROLADOR PRINCIPAL - EL RETIRO DEL DRAGON 2.5D
# Coordina vista tactica, party Mia/Trinity/Mike, VTT HUD y capturas
# ==============================================================================

const Structure = preload("res://scripts/retreat_structure.gd")
const VttRoleUi = preload("res://scripts/vtt_role_ui.gd")

@onready var player: Node = get_node_or_null("PlayerToken")
@onready var camera: Node = get_node_or_null("TacticalCamera")
@onready var layout_builder: Node = get_node_or_null("RetreatLayoutBuilder")

var party: Array[Node3D] = []
var active_party_idx: int = 0

var ui_layer: CanvasLayer
var vtt_ui: VttRoleUi
var lbl_title: Label
var lbl_zone: Label
var lbl_coords: Label
var lbl_controls: Label

var _capture_path: String = ""
var _capture_suite_dir: String = ""

func _ready() -> void:
	_setup_hud()
	_collect_party()

	var initial_role: String = "player"
	var initial_projector_ready: bool = false
	var initial_camera_preset: String = ""
	for arg in OS.get_cmdline_args() + OS.get_cmdline_user_args():
		if arg.begins_with("--role="):
			initial_role = arg.trim_prefix("--role=")
		elif arg == "--projector-ready":
			initial_projector_ready = true
		elif arg.begins_with("--camera-preset="):
			initial_camera_preset = arg.trim_prefix("--camera-preset=")
		elif arg.begins_with("--capture-overview="):
			_capture_path = arg.trim_prefix("--capture-overview=")
		elif arg.begins_with("--capture-shot="):
			_capture_path = arg.trim_prefix("--capture-shot=")
		elif arg.begins_with("--capture-suite="):
			_capture_suite_dir = arg.trim_prefix("--capture-suite=")

	var mt := get_node_or_null("/root/MapTransition")
	var has_pending_spawn := mt != null and not str(mt.get("pending_spawn_id")).is_empty()
	if mt and not str(mt.get("pending_role")).is_empty() and not ("--role=" in " ".join(OS.get_cmdline_args())):
		initial_role = str(mt.get("pending_role"))

	if party.size() > 0:
		select_party_member(0, false)

	if camera and camera.has_method("apply_zone_preset") and not has_pending_spawn and not initial_camera_preset.is_empty():
		camera.apply_zone_preset(initial_camera_preset, true)

	vtt_ui = VttRoleUi.new()
	vtt_ui.name = "VttRoleUi"
	vtt_ui.configure_initial(initial_role, initial_projector_ready, true)
	add_child(vtt_ui)
	if ui_layer:
		ui_layer.visible = false

	if has_pending_spawn and mt.has_method("apply_pending_spawn"):
		mt.apply_pending_spawn(self, party, camera)

	if player:
		_update_hud(player.global_position, player.get("current_zone") if player.get("current_zone") is Dictionary else {})

	if not _capture_suite_dir.is_empty():
		call_deferred("_run_capture_suite_and_quit")
	elif not _capture_path.is_empty():
		call_deferred("_run_capture_and_quit")

func _collect_party() -> void:
	party.clear()
	for node_name in ["PlayerToken", "RogueToken", "WizardToken"]:
		var tok := get_node_or_null(node_name) as Node3D
		if tok:
			party.append(tok)
			if tok.has_signal("zone_changed"):
				var cb := Callable(self, "_on_token_zone_changed").bind(tok)
				if not tok.zone_changed.is_connected(cb):
					tok.zone_changed.connect(cb)

func select_party_member(idx: int, focus_camera: bool = true) -> void:
	if party.is_empty():
		return
	active_party_idx = wrapi(idx, 0, party.size())
	for i in range(party.size()):
		var member := party[i]
		if member.has_method("set_active"):
			member.set_active(i == active_party_idx)
	player = party[active_party_idx]
	if camera:
		camera.set("target", player)
		if focus_camera and camera.has_method("set_target_character"):
			camera.set_target_character(player)
	var z: Dictionary = player.get("current_zone") if player.get("current_zone") is Dictionary else Structure.get_zone_at(player.global_position)
	_update_hud(player.global_position, z)
	if vtt_ui and vtt_ui.has_method("sync_selected_actor_from_party_index"):
		vtt_ui.call("sync_selected_actor_from_party_index", active_party_idx)

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.is_pressed() and not event.is_echo():
		var ek := event as InputEventKey
		if ek.ctrl_pressed or ek.alt_pressed or ek.meta_pressed:
			return
		match ek.keycode:
			KEY_1:
				select_party_member(0)
				get_viewport().set_input_as_handled()
			KEY_2:
				select_party_member(1)
				get_viewport().set_input_as_handled()
			KEY_3:
				select_party_member(2)
				get_viewport().set_input_as_handled()
			KEY_TAB:
				select_party_member(active_party_idx + 1)
				get_viewport().set_input_as_handled()
			KEY_G:
				if layout_builder and layout_builder.has_method("toggle_winch_lever"):
					layout_builder.toggle_winch_lever()
				get_viewport().set_input_as_handled()

func _setup_hud() -> void:
	ui_layer = CanvasLayer.new()
	ui_layer.name = "RetreatLegacyHud"
	ui_layer.layer = 5
	add_child(ui_layer)

	var panel := PanelContainer.new()
	panel.position = Vector2(14, 14)
	ui_layer.add_child(panel)

	var vbox := VBoxContainer.new()
	panel.add_child(vbox)

	lbl_title = Label.new()
	lbl_title.text = "EL RETIRO DEL DRAGON"
	vbox.add_child(lbl_title)

	lbl_zone = Label.new()
	lbl_zone.text = "Zona: Vista general"
	vbox.add_child(lbl_zone)

	lbl_coords = Label.new()
	lbl_coords.text = "Pos: (0.0, 0.0, 0.0)"
	vbox.add_child(lbl_coords)

	lbl_controls = Label.new()
	lbl_controls.text = "1/2/3/Tab Party | WASD Mover | Q/E Orbitar | Rueda Zoom | F/R Inclinacion | O Panoramica | Inicio Restablecer"
	vbox.add_child(lbl_controls)

func _on_token_zone_changed(new_zone: Dictionary, token: Node3D) -> void:
	if token == player:
		_update_hud(token.global_position, new_zone)

func _on_player_zone_changed(new_zone: Dictionary) -> void:
	if player:
		_update_hud(player.global_position, new_zone)

func _update_hud(world_pos: Vector3, zone: Dictionary) -> void:
	if lbl_zone:
		lbl_zone.text = "Zona: %s (y=%.2fm)" % [zone.get("name", "Playa"), world_pos.y]
	if lbl_coords:
		var cell := Structure.world_to_cell(world_pos)
		lbl_coords.text = "Celda (%d, %d) | Mundo (%.1f, %.1f, %.1f)" % [cell.x, cell.y, world_pos.x, world_pos.y, world_pos.z]

func _run_capture_and_quit() -> void:
	for _i in range(6):
		await get_tree().process_frame
	var img := get_viewport().get_texture().get_image()
	if img:
		var abs_path := _capture_path
		if _capture_path.begins_with("res://") or _capture_path.begins_with("user://"):
			abs_path = ProjectSettings.globalize_path(_capture_path)
		var parent_dir := abs_path.get_base_dir()
		if not parent_dir.is_empty():
			DirAccess.make_dir_recursive_absolute(parent_dir)
		var err := img.save_png(abs_path)
		print("CAPTURE_SAVED=", abs_path, " ERR=", err)
	get_tree().quit()

func _run_capture_suite_and_quit() -> void:
	var abs_dir := _capture_suite_dir
	if _capture_suite_dir.begins_with("res://") or _capture_suite_dir.begins_with("user://"):
		abs_dir = ProjectSettings.globalize_path(_capture_suite_dir)
	DirAccess.make_dir_recursive_absolute(abs_dir)
	var presets := ["overview", "beach", "a1", "a2", "caves", "a5"]
	for preset in presets:
		if camera and camera.has_method("apply_zone_preset"):
			camera.apply_zone_preset(preset, true)
		for _i in range(4):
			await get_tree().process_frame
		var img := get_viewport().get_texture().get_image()
		if img:
			var out_path := abs_dir.path_join("retiro-" + preset + ".png")
			var err := img.save_png(out_path)
			print("CAPTURE_SAVED=", out_path, " ERR=", err)
	get_tree().quit()
