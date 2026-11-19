extends Node

# ==============================================================================
# GESTOR PERSISTENTE DE TRANSICIONES ENTRE MAPAS (MapTransition Autoload)
# Maneja fundidos suaves, carga de escena, punto/orientación de llegada y DM.
# ==============================================================================

const MapExitScript = preload("res://scripts/map_exit.gd")
const ThemeKit = preload("res://scripts/vtt_ui_theme.gd")

signal transition_started(from_scene: String, to_scene: String, spawn_id: String)
signal transition_completed(scene_path: String, spawn_id: String)
signal exit_sign_visibility_changed(exit_id: String, visible: bool)
signal tide_state_changed(new_tide: String)

var pending_spawn_id: String = ""
var pending_facing: String = "n"
var pending_source_exit_id: String = ""
var pending_destination_label: String = ""
var pending_active_party_idx: int = 0
var pending_role: String = ""
var is_transitioning: bool = false
var locked_exit_ids: Dictionary = {}
var tide_state: String = "low"

var _fade_layer: CanvasLayer
var _fade_rect: ColorRect
var _fade_title: Label
var _fade_subtitle: Label
var _active_prompt_exit_id: String = ""

var _sign_layer: CanvasLayer
var _sign_overlay: ColorRect
var _sign_bg_tex: TextureRect
var _sign_pad: Control
var _sign_text_box: VBoxContainer
var _sign_eyebrow_lbl: Label
var _sign_title_lbl: Label
var _sign_subtitle_lbl: Label
var _sign_confirm_btn: Button
var _sign_alt_btn: Button
var _sign_cancel_btn: Button
var _sign_exit_ref: WeakRef = null

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	_build_fade_overlay()
	_build_exit_sign_overlay()

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
	_fade_title.add_theme_font_override("font", ThemeKit.get_title_font())
	_fade_title.add_theme_font_size_override("font_size", 26)
	_fade_title.add_theme_color_override("font_color", Color(0.94, 0.86, 0.66))
	vbox.add_child(_fade_title)

	_fade_subtitle = Label.new()
	_fade_subtitle.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_fade_subtitle.add_theme_font_override("font", ThemeKit.get_body_font())
	_fade_subtitle.add_theme_font_size_override("font_size", 16)
	_fade_subtitle.add_theme_color_override("font_color", Color(0.76, 0.82, 0.86))
	vbox.add_child(_fade_subtitle)

func _build_exit_sign_overlay() -> void:
	_sign_layer = CanvasLayer.new()
	_sign_layer.name = "MapExitSignLayer"
	_sign_layer.layer = 115
	add_child(_sign_layer)

	_sign_overlay = ColorRect.new()
	_sign_overlay.name = "MapExitSignOverlay"
	_sign_overlay.set_anchors_preset(Control.PRESET_FULL_RECT)
	_sign_overlay.color = Color(0.015, 0.03, 0.04, 0.56)
	_sign_overlay.mouse_filter = Control.MOUSE_FILTER_STOP
	_sign_overlay.visible = false
	_sign_layer.add_child(_sign_overlay)

	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	_sign_overlay.add_child(center)

	var col := VBoxContainer.new()
	col.add_theme_constant_override("separation", 14)
	col.alignment = BoxContainer.ALIGNMENT_CENTER
	center.add_child(col)

	var board_wrap := Control.new()
	board_wrap.name = "SignBoardCanvas"
	board_wrap.custom_minimum_size = Vector2(720, 360)
	col.add_child(board_wrap)

	_sign_bg_tex = TextureRect.new()
	_sign_bg_tex.name = "SignBoardTexture"
	_sign_bg_tex.set_anchors_preset(Control.PRESET_FULL_RECT)
	_sign_bg_tex.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	_sign_bg_tex.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	_sign_bg_tex.texture = ThemeKit.load_ui_texture(ThemeKit.SIGN_DRAGON_PLAQUE_PATH)
	board_wrap.add_child(_sign_bg_tex)

	var pad := Control.new()
	pad.name = "SignBoardTextPad"
	pad.set_anchors_preset(Control.PRESET_FULL_RECT)
	pad.offset_left = 96
	pad.offset_right = -96
	pad.offset_top = 128
	pad.offset_bottom = -44
	board_wrap.add_child(pad)
	_sign_pad = pad

	_sign_text_box = VBoxContainer.new()
	_sign_text_box.set_anchors_preset(Control.PRESET_FULL_RECT)
	_sign_text_box.alignment = BoxContainer.ALIGNMENT_CENTER
	_sign_text_box.add_theme_constant_override("separation", 6)
	pad.add_child(_sign_text_box)

	_sign_eyebrow_lbl = Label.new()
	_sign_eyebrow_lbl.name = "SignEyebrow"
	_sign_eyebrow_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_sign_eyebrow_lbl.add_theme_font_override("font", ThemeKit.get_title_font())
	_sign_eyebrow_lbl.add_theme_font_size_override("font_size", 11)
	_sign_eyebrow_lbl.add_theme_color_override("font_color", Color("#edd18a"))
	_sign_eyebrow_lbl.add_theme_color_override("font_shadow_color", Color(0.08, 0.04, 0.02, 0.92))
	_sign_eyebrow_lbl.add_theme_constant_override("shadow_offset_x", 1)
	_sign_eyebrow_lbl.add_theme_constant_override("shadow_offset_y", 2)
	_sign_text_box.add_child(_sign_eyebrow_lbl)

	_sign_title_lbl = Label.new()
	_sign_title_lbl.name = "SignDestinationTitle"
	_sign_title_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_sign_title_lbl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_sign_title_lbl.add_theme_font_override("font", ThemeKit.get_title_font())
	_sign_title_lbl.add_theme_font_size_override("font_size", 28)
	_sign_title_lbl.add_theme_color_override("font_color", Color("#fff4dc"))
	_sign_title_lbl.add_theme_color_override("font_shadow_color", Color(0.08, 0.03, 0.01, 0.96))
	_sign_title_lbl.add_theme_constant_override("shadow_offset_x", 2)
	_sign_title_lbl.add_theme_constant_override("shadow_offset_y", 3)
	_sign_title_lbl.add_theme_constant_override("outline_size", 4)
	_sign_title_lbl.add_theme_color_override("font_outline_color", Color(0.10, 0.05, 0.02, 0.92))
	_sign_text_box.add_child(_sign_title_lbl)

	_sign_subtitle_lbl = Label.new()
	_sign_subtitle_lbl.name = "SignNarrativeText"
	_sign_subtitle_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_sign_subtitle_lbl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_sign_subtitle_lbl.add_theme_font_override("font", ThemeKit.get_body_font())
	_sign_subtitle_lbl.add_theme_font_size_override("font_size", 16)
	_sign_subtitle_lbl.add_theme_color_override("font_color", Color("#f2e0be"))
	_sign_subtitle_lbl.add_theme_color_override("font_shadow_color", Color(0.07, 0.03, 0.01, 0.92))
	_sign_subtitle_lbl.add_theme_constant_override("shadow_offset_x", 1)
	_sign_subtitle_lbl.add_theme_constant_override("shadow_offset_y", 2)
	_sign_text_box.add_child(_sign_subtitle_lbl)

	var btn_bar := HBoxContainer.new()
	btn_bar.alignment = BoxContainer.ALIGNMENT_CENTER
	btn_bar.add_theme_constant_override("separation", 14)
	col.add_child(btn_bar)

	_sign_confirm_btn = Button.new()
	_sign_confirm_btn.name = "SignConfirmButton"
	_sign_confirm_btn.text = "Continuar hacia este lugar [T]"
	ThemeKit.style_button(_sign_confirm_btn, "primary", 10, 18, 9)
	_sign_confirm_btn.add_theme_font_size_override("font_size", 16)
	_sign_confirm_btn.pressed.connect(_confirm_exit_sign)
	btn_bar.add_child(_sign_confirm_btn)

	_sign_alt_btn = Button.new()
	_sign_alt_btn.name = "SignAltButton"
	_sign_alt_btn.text = "Navegar a Pleamar (por mar) [M]"
	ThemeKit.style_button(_sign_alt_btn, "secondary", 10, 16, 9)
	_sign_alt_btn.add_theme_font_size_override("font_size", 16)
	_sign_alt_btn.visible = false
	_sign_alt_btn.pressed.connect(func(): _confirm_extra_sign(0))
	btn_bar.add_child(_sign_alt_btn)

	_sign_cancel_btn = Button.new()
	_sign_cancel_btn.name = "SignCancelButton"
	_sign_cancel_btn.text = "Permanecer aquí [Esc]"
	ThemeKit.style_button(_sign_cancel_btn, "secondary", 10, 16, 9)
	_sign_cancel_btn.add_theme_font_size_override("font_size", 16)
	_sign_cancel_btn.pressed.connect(func(): dismiss_exit_sign(true))
	btn_bar.add_child(_sign_cancel_btn)

func _unhandled_input(event: InputEvent) -> void:
	if not _sign_overlay or not _sign_overlay.visible:
		return
	if event is InputEventKey and event.is_pressed() and not event.is_echo():
		var ek := event as InputEventKey
		if ek.keycode == KEY_ESCAPE:
			dismiss_exit_sign(true)
			get_viewport().set_input_as_handled()
		elif ek.keycode in [KEY_ENTER, KEY_KP_ENTER, KEY_T]:
			_confirm_exit_sign()
			get_viewport().set_input_as_handled()
		elif ek.keycode == KEY_M and _sign_alt_btn and _sign_alt_btn.visible and not _sign_alt_btn.disabled:
			_confirm_extra_sign(0)
			get_viewport().set_input_as_handled()

func set_tide_state(new_tide: String) -> void:
	var clean := new_tide if new_tide in ["low", "rising", "high"] else "low"
	if tide_state == clean:
		return
	tide_state = clean
	tide_state_changed.emit(tide_state)

func get_tide_label() -> String:
	match tide_state:
		"high":
			return "Marea alta"
		"rising":
			return "Marea creciente"
		_:
			return "Marea baja"

func is_low_tide_blocked() -> bool:
	return tide_state == "high"

func begin_extra_transition(exit_node: Node, route_cfg: Dictionary, actor: Node = null) -> bool:
	hide_exit_sign()
	if is_transitioning:
		return false
	if not is_instance_valid(exit_node):
		return false
	if bool(exit_node.get("dm_locked")) or is_exit_locked(str(exit_node.get("exit_id"))):
		notify_blocked(exit_node)
		return false
	if bool(route_cfg.get("requires_low_tide", false)) and is_low_tide_blocked():
		notify_tide_blocked(exit_node)
		return false
	var target_path := str(route_cfg.get("scene_path", ""))
	if target_path.is_empty() or not ResourceLoader.exists(target_path):
		push_warning("MapTransition: destino alternativo no encontrado: " + target_path)
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

	pending_spawn_id = str(route_cfg.get("spawn_id", "from_pleamar_sea"))
	pending_facing = str(route_cfg.get("facing", "sw"))
	pending_source_exit_id = str(exit_node.get("exit_id"))
	pending_destination_label = str(route_cfg.get("label", "Cuevas de Pleamar (por mar)"))
	var extra_mode := str(route_cfg.get("mode", exit_node.get("transition_mode")))

	transition_started.emit(from_scene, target_path, pending_spawn_id)
	_perform_scene_swap(target_path, pending_destination_label, extra_mode)
	return true

func begin_transition(exit_node: Node, actor: Node = null) -> bool:
	hide_exit_sign()
	if is_transitioning:
		return false
	if not is_instance_valid(exit_node):
		return false
	if exit_node.dm_locked or is_exit_locked(exit_node.exit_id):
		notify_blocked(exit_node)
		return false
	if str(exit_node.get("exit_id")) == "pleamar-low" and is_low_tide_blocked():
		notify_tide_blocked(exit_node)
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
			var ptxt := str(exit_node.get_prompt_text())
			ph.set_interaction_prompt(ptxt, true)
			if "_last_prompt_text" in ui:
				ui._last_prompt_text = ptxt

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
		if "_last_prompt_text" in ui:
			ui._last_prompt_text = "__refresh__"
		if ui.has_method("_sync_nearby_interaction_prompt"):
			ui.call("_sync_nearby_interaction_prompt")
		elif ph and ph.has_method("set_interaction_prompt"):
			ph.set_interaction_prompt("", false)

func show_exit_sign(exit_node: Node) -> void:
	if not is_instance_valid(exit_node) or not _sign_overlay:
		return
	_sign_exit_ref = weakref(exit_node)
	var eid := str(exit_node.get("exit_id"))
	var locked := bool(exit_node.get("dm_locked")) or is_exit_locked(eid)
	var dest := str(exit_node.get("destination_label"))
	if dest.is_empty():
		dest = str(exit_node.get("display_name"))
	var mode := str(exit_node.get("transition_mode"))
	var style := str(exit_node.get("signpost_style")) if exit_node.get("signpost_style") != null else "auto"

	var tex_path := ThemeKit.SIGN_DRAGON_PLAQUE_PATH
	var is_ropes := (style == "hanging_ropes" or (style == "auto" and mode == "boat"))
	if is_ropes:
		tex_path = ThemeKit.SIGN_HANGING_ROPES_PATH
	if _sign_pad:
		if is_ropes:
			_sign_pad.offset_left = 152
			_sign_pad.offset_right = -152
			_sign_pad.offset_top = 122
			_sign_pad.offset_bottom = -84
		else:
			_sign_pad.offset_left = 104
			_sign_pad.offset_right = -104
			_sign_pad.offset_top = 134
			_sign_pad.offset_bottom = -48
	var tex := ThemeKit.load_ui_texture(tex_path)
	if tex and _sign_bg_tex:
		_sign_bg_tex.texture = tex

	var tide_blocked := (eid == "pleamar-low" and is_low_tide_blocked())
	if locked:
		_sign_eyebrow_lbl.text = "PASO CERRADO POR EL DIRECTOR DE JUEGO"
		_sign_eyebrow_lbl.add_theme_color_override("font_color", Color("#f28b82"))
	elif tide_blocked:
		_sign_eyebrow_lbl.text = "MAREA ALTA · PASO COSTERO BAJO ANEGADO"
		_sign_eyebrow_lbl.add_theme_color_override("font_color", Color("#f28b82"))
	elif eid == "pleamar-low":
		_sign_eyebrow_lbl.text = "CAMINO A PLEAMAR · " + get_tide_label().to_upper()
		_sign_eyebrow_lbl.add_theme_color_override("font_color", Color("#edd18a"))
	elif mode == "boat":
		_sign_eyebrow_lbl.text = "EMBARCADERO · TRAVESÍA EN BOTE"
		_sign_eyebrow_lbl.add_theme_color_override("font_color", Color("#edd18a"))
	else:
		_sign_eyebrow_lbl.text = "LETRERO DE CAMINO · HACIA EL DESTINO"
		_sign_eyebrow_lbl.add_theme_color_override("font_color", Color("#edd18a"))

	_sign_title_lbl.text = dest
	_sign_title_lbl.add_theme_font_size_override("font_size", 22 if dest.length() > 24 else 27)

	var sub := str(exit_node.get("sign_subtitle")) if exit_node.get("sign_subtitle") != null else ""
	if tide_blocked:
		sub = "La marea alta cubre el bajío occidental y anega la senda costera baja. Toma la senda alta del collado o zarpa en el bote hacia Pleamar."
	elif sub.is_empty():
		if locked:
			sub = "El paso hacia %s permanece cerrado hasta nuevo aviso del DM." % dest
		elif mode == "boat":
			sub = "El bote aguarda junto a los pilotes para navegar hacia %s." % dest
		else:
			sub = "%s · ¿Deseas continuar hacia %s?" % [str(exit_node.get("display_name")), dest]
	_sign_subtitle_lbl.text = sub

	var extra_raw = exit_node.get("extra_routes")
	var has_extra := (extra_raw is Array) and not (extra_raw as Array).is_empty()
	var custom_primary := str(exit_node.get("primary_button_text")) if exit_node.get("primary_button_text") != null else ""
	_sign_confirm_btn.disabled = locked or tide_blocked
	if has_extra:
		var first_extra: Dictionary = (extra_raw as Array)[0]
		if locked:
			_sign_confirm_btn.text = "Paso cerrado por el DM"
		elif tide_blocked:
			_sign_confirm_btn.text = "Paso bajo anegado por marea alta"
		elif not custom_primary.is_empty():
			_sign_confirm_btn.text = custom_primary
		elif mode == "boat":
			_sign_confirm_btn.text = "Zarpar hacia El Pecio [T]"
		else:
			_sign_confirm_btn.text = "Continuar hacia allí [T]"
		if _sign_alt_btn:
			var alt_tide_blocked := bool(first_extra.get("requires_low_tide", false)) and is_low_tide_blocked()
			_sign_alt_btn.visible = true
			_sign_alt_btn.disabled = locked or alt_tide_blocked
			_sign_alt_btn.text = "Paso cerrado por el DM" if locked else str(first_extra.get("button_text", "Ruta alternativa [M]"))
	else:
		if locked:
			_sign_confirm_btn.text = "Paso cerrado por el DM"
		elif not custom_primary.is_empty():
			_sign_confirm_btn.text = custom_primary
		else:
			_sign_confirm_btn.text = "Embarcar hacia allí [T]" if mode == "boat" else "Continuar hacia allí [T]"
		if _sign_alt_btn:
			_sign_alt_btn.visible = false
	_sign_overlay.visible = true
	_sign_overlay.modulate.a = 0.0
	create_tween().tween_property(_sign_overlay, "modulate:a", 1.0, 0.16).set_trans(Tween.TRANS_SINE)
	exit_sign_visibility_changed.emit(eid, true)

func hide_exit_sign(exit_node: Node = null) -> void:
	if not _sign_overlay or not _sign_overlay.visible:
		if exit_node == null:
			_sign_exit_ref = null
		return
	if exit_node != null and _sign_exit_ref != null:
		var cur_ex = _sign_exit_ref.get_ref()
		if cur_ex != null and cur_ex != exit_node:
			return
	var closed_id := ""
	if _sign_exit_ref != null and is_instance_valid(_sign_exit_ref.get_ref()):
		closed_id = str(_sign_exit_ref.get_ref().get("exit_id"))
	_sign_overlay.visible = false
	_sign_exit_ref = null
	exit_sign_visibility_changed.emit(closed_id, false)

func dismiss_exit_sign(suppress_until_leave: bool = true) -> void:
	var ex = _sign_exit_ref.get_ref() if _sign_exit_ref != null else null
	if suppress_until_leave and is_instance_valid(ex) and ex.has_method("suppress_until_exit"):
		ex.suppress_until_exit()
	hide_exit_sign()

func _confirm_exit_sign() -> void:
	var ex = _sign_exit_ref.get_ref() if _sign_exit_ref != null else null
	if not is_instance_valid(ex):
		hide_exit_sign()
		return
	hide_exit_sign()
	if ex.has_method("execute_transition"):
		ex.execute_transition()

func _confirm_extra_sign(idx: int = 0) -> void:
	var ex = _sign_exit_ref.get_ref() if _sign_exit_ref != null else null
	if not is_instance_valid(ex):
		hide_exit_sign()
		return
	hide_exit_sign()
	if ex.has_method("execute_extra_transition"):
		ex.execute_extra_transition(idx)

func is_exit_sign_visible() -> bool:
	return _sign_overlay != null and _sign_overlay.visible

func notify_blocked(exit_node: Node) -> void:
	var cur := get_tree().current_scene
	if not cur:
		return
	var ui := cur.find_child("VttRoleUi", true, false)
	if ui and ui.has_method("notify_mesa"):
		ui.notify_mesa("Paso bloqueado por el DM: %s" % str(exit_node.get("display_name")))

func notify_tide_blocked(exit_node: Node) -> void:
	var cur := get_tree().current_scene
	if not cur:
		return
	var ui := cur.find_child("VttRoleUi", true, false)
	if ui and ui.has_method("notify_mesa"):
		ui.notify_mesa("Marea alta: %s queda anegado. Usa la senda alta o el bote." % str(exit_node.get("display_name")))
