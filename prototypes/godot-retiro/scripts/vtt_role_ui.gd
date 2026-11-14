class_name VttRoleUi
extends CanvasLayer

# Coordinador unificado de las 3 interfaces canónicas de Dungeons VTT en Godot 4:
# - player    (JUGADOR)   : apps/web/player.html + player.ts + player.css
# - dm        (DM)        : apps/web/dm.html + dm.ts + dm.css
# - projector (PROYECTOR) : apps/web/projector.html + projector.ts + projector.css

const CampaignData := preload("res://scripts/vtt_campaign_data.gd")
const ThemeKit := preload("res://scripts/vtt_ui_theme.gd")
const PlayerHud := preload("res://scripts/vtt_player_hud.gd")
const DmHud := preload("res://scripts/vtt_dm_hud.gd")
const ProjectorHud := preload("res://scripts/vtt_projector_hud.gd")

signal role_changed(new_role: String)

var ui_root: Control
var role_switcher_panel: PanelContainer
var role_buttons: Dictionary = {}

var player_hud: PlayerHud
var dm_hud: DmHud
var projector_hud: ProjectorHud

var player_root: Control
var dm_root: Control
var projector_root: Control

# Referencias al escenario
var main_ctrl: Node
var camera: Camera3D
var map_interaction: Node
var ship_env: Node
var inv_mgr: Node
var roof_ctrl: Node
var grid_node: Node3D
var tokens_by_node: Dictionary = {}

# Estado de campaña compartido entre DM, JUGADOR y PROYECTOR
var is_retreat: bool = false
var meta: Dictionary = {}
var current_role: String = "player"
var projector_ready: bool = false
var ui_active: bool = true

var actors: Array[Dictionary] = []
var enemies: Array[Dictionary] = []
var dm_requests: Array[Dictionary] = []
var selected_actor_id: String = "mia"
var selected_enemy_id: String = "harpy"
var selected_zone_id: String = "c1"

# Reloj sincronizado y clima
var clock_seconds: int = 12 * 3600
var clock_running: bool = true
var _clock_accum: float = 0.0
var _fallback_time: String = "day"
var _fallback_weather: String = "clear"
var _fallback_reduced: bool = false

# Tablero, audio y combate
var grid_enabled: bool = true
var grid_opacity: float = 0.22
var show_scene_notice: bool = true
var audio_muted: bool = false

var combat_active: bool = false
var combat_round: int = 1
var combat_turn_idx: int = 0
var combat_order: Array[Dictionary] = []

var toast_timer: float = 0.0
var save_flash_timer: float = 0.0
var _last_prompt_text: String = ""

func _ready() -> void:
	layer = 120
	process_mode = Node.PROCESS_MODE_ALWAYS
	_detect_scene_context()
	_build_ui_tree()
	map_interaction = preload("res://scripts/vtt_map_interaction.gd").new()
	map_interaction.name = "DmMapInteraction"
	add_child(map_interaction)
	set_role(current_role)
	_apply_external_ui_coordination.call_deferred()

func configure_initial(role: String, ready_projector: bool = false, active: bool = true) -> void:
	current_role = _normalize_role(role)
	projector_ready = ready_projector
	ui_active = active
	if is_inside_tree():
		visible = ui_active
		if ui_active:
			_apply_external_ui_coordination()
			set_role(current_role)

func _normalize_role(raw: String) -> String:
	var r := raw.strip_edges().to_lower()
	if r in ["dm", "master", "director"]:
		return "dm"
	if r in ["projector", "proyector", "mesa"]:
		return "projector"
	return "player"

func _detect_scene_context() -> void:
	main_ctrl = get_parent()
	if not main_ctrl:
		main_ctrl = get_tree().root.find_child("Main", true, false)
	if main_ctrl:
		is_retreat = main_ctrl.find_child("RetreatLayoutBuilder", true, false) != null
		camera = main_ctrl.find_child("TacticalCamera", true, false) as Camera3D
		ship_env = main_ctrl.find_child("ShipEnvironment", true, false)
		inv_mgr = main_ctrl.find_child("InventoryManager", true, false)
		roof_ctrl = main_ctrl.find_child("RoofCutout", true, false)
		grid_node = main_ctrl.find_child("TacticalGrid", true, false) as Node3D
		if not grid_node:
			grid_node = main_ctrl.find_child("TacticalGridOverlay", true, false) as Node3D
		for nname in ["PlayerToken", "RogueToken", "WizardToken", "HarpyToken", "ZombieToken"]:
			var tok := main_ctrl.find_child(nname, true, false) as Node3D
			if tok:
				tokens_by_node[nname] = tok

	meta = CampaignData.get_campaign_meta(is_retreat)
	actors = CampaignData.create_default_actors()
	enemies = CampaignData.create_default_enemies(is_retreat)
	dm_requests = CampaignData.get_initial_dm_requests(is_retreat)
	selected_enemy_id = enemies[0]["id"] if not enemies.is_empty() else ""
	selected_zone_id = "beach" if is_retreat else "c1"

	_apply_external_ui_coordination()

func _apply_external_ui_coordination() -> void:
	if inv_mgr and inv_mgr.has_method("set_external_ui_managed"):
		inv_mgr.set_external_ui_managed(ui_active)
	if ship_env and ship_env.has_method("set_external_ui_managed"):
		ship_env.set_external_ui_managed(ui_active)

func _build_ui_tree() -> void:
	ui_root = Control.new()
	ui_root.name = "VttUiRoot"
	ui_root.set_anchors_preset(Control.PRESET_FULL_RECT)
	ui_root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(ui_root)

	player_hud = PlayerHud.new(self)
	player_root = player_hud.build(ui_root)

	dm_hud = DmHud.new(self)
	dm_root = dm_hud.build(ui_root)

	projector_hud = ProjectorHud.new(self)
	projector_root = projector_hud.build(ui_root)

	_build_role_switcher()
	visible = ui_active

func _build_role_switcher() -> void:
	role_switcher_panel = ThemeKit.make_pill_panel(ThemeKit.COL_BORDER, Color(0.03, 0.075, 0.09, 0.94))
	role_switcher_panel.name = "RoleSwitcherBar"
	ui_root.add_child(role_switcher_panel)

	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 4)
	role_switcher_panel.add_child(row)

	for r in [["player", "JUGADOR · F1"], ["dm", "DM · F2"], ["projector", "PROYECTOR · F3"]]:
		var b := Button.new()
		b.name = "RoleBtn_" + r[0]
		b.text = r[1]
		ThemeKit.style_button(b, "pill", 999, 10, 4)
		b.pressed.connect(func(): set_role(r[0]))
		row.add_child(b)
		role_buttons[r[0]] = b

func set_role(new_role: String) -> void:
	current_role = _normalize_role(new_role)
	if camera and camera.has_method("set_view_role"): camera.set_view_role(current_role)
	if current_role != "player":
		_clear_joystick()

	if player_root: player_root.visible = (current_role == "player")
	if dm_root: dm_root.visible = (current_role == "dm")
	if projector_root: projector_root.visible = (current_role == "projector")

	_position_role_switcher()
	for r in role_buttons.keys():
		ThemeKit.style_button(role_buttons[r], "pill_active" if r == current_role else "pill", 999, 10, 4)

	_sync_grid_and_rings()
	refresh_all()
	emit_signal("role_changed", current_role)

func _position_role_switcher() -> void:
	if not role_switcher_panel:
		return
	if current_role == "projector":
		role_switcher_panel.set_anchors_preset(Control.PRESET_BOTTOM_RIGHT)
		role_switcher_panel.grow_horizontal = Control.GROW_DIRECTION_BEGIN
		role_switcher_panel.grow_vertical = Control.GROW_DIRECTION_BEGIN
		role_switcher_panel.offset_left = -384
		role_switcher_panel.offset_top = -54
		role_switcher_panel.offset_right = -18
		role_switcher_panel.offset_bottom = -16
		role_switcher_panel.modulate = Color(1, 1, 1, 0.78)
		role_switcher_panel.visible = projector_ready
	else:
		role_switcher_panel.set_anchors_preset(Control.PRESET_CENTER_TOP)
		role_switcher_panel.grow_horizontal = Control.GROW_DIRECTION_BOTH
		role_switcher_panel.grow_vertical = Control.GROW_DIRECTION_END
		role_switcher_panel.offset_left = -185
		role_switcher_panel.offset_top = 8
		role_switcher_panel.offset_right = 185
		role_switcher_panel.offset_bottom = 44
		role_switcher_panel.modulate = Color(1, 1, 1, 1)
		role_switcher_panel.visible = true

func _clear_joystick() -> void:
	if player_hud and player_hud.joystick:
		player_hud.joystick.reset_stick()
	set_virtual_joystick_vector(Vector2.ZERO)

func set_virtual_joystick_vector(dir: Vector2) -> void:
	var tok := get_active_token_node()
	if tok and "input_override" in tok:
		tok.input_override = dir

func dismiss_projector_prepare() -> void:
	projector_ready = true
	_position_role_switcher()
	refresh_all()

func _unhandled_input(event: InputEvent) -> void:
	if not ui_active:
		return
	if event is InputEventKey and event.is_pressed() and not event.is_echo() and not event.ctrl_pressed and not event.alt_pressed:
		var kev := event as InputEventKey
		if kev.keycode == KEY_F1:
			set_role("player")
			get_viewport().set_input_as_handled()
		elif kev.keycode == KEY_F2:
			set_role("dm")
			get_viewport().set_input_as_handled()
		elif kev.keycode == KEY_F3:
			set_role("projector")
			get_viewport().set_input_as_handled()
		elif kev.keycode == KEY_F11:
			var mode := DisplayServer.window_get_mode()
			if mode == DisplayServer.WINDOW_MODE_FULLSCREEN:
				DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_WINDOWED)
			else:
				DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_FULLSCREEN)
			get_viewport().set_input_as_handled()
		elif kev.keycode == KEY_ESCAPE and current_role == "player" and player_hud:
			player_hud.close_modals()
			player_hud.toggle_exploration_menu(false)
		elif (kev.keycode == KEY_I or kev.keycode == KEY_B) and current_role == "player" and player_hud:
			if player_hud.inventory_modal.visible:
				player_hud.close_modals()
			else:
				player_hud.open_modal("inventory")
			get_viewport().set_input_as_handled()

func _process(delta: float) -> void:
	if not ui_active:
		return

	# Reloj sincronizado (en pausa durante combate)
	if clock_running and not combat_active:
		_clock_accum += delta
		if _clock_accum >= 1.0:
			var whole := int(_clock_accum)
			_clock_accum -= float(whole)
			clock_seconds += whole
			_refresh_clock_only()

	if toast_timer > 0.0:
		toast_timer -= delta
		if toast_timer <= 0.0 and player_hud:
			player_hud.show_toast("")

	if save_flash_timer > 0.0:
		save_flash_timer -= delta
		if save_flash_timer <= 0.0 and projector_hud:
			projector_hud.refresh()

	# Proyector SIEMPRE oculta cuadrícula y anillos de selección aunque RoofCutout cambie de zona
	_enforce_role_board_rules()

	# Sincronizar prompt de InventoryManager con el botón de interacción de Jugador
	if inv_mgr and "prompt_text" in inv_mgr:
		var p_txt: String = str(inv_mgr.prompt_text)
		if p_txt != _last_prompt_text:
			_last_prompt_text = p_txt
			if player_hud:
				player_hud.set_interaction_prompt(p_txt, p_txt != "")

	# Sincronizar zona actual según personaje activo en Pecio
	if not is_retreat and camera and camera.has_method("detect_wreck_zone"):
		var tok := get_active_token_node()
		if tok:
			var detected: String = camera.detect_wreck_zone(tok.global_position)
			var norm_z := "c1" if detected == "main" else detected
			if norm_z != "" and norm_z != selected_zone_id and player_root.visible:
				selected_zone_id = norm_z
				if player_hud:
					player_hud.scene_notice_lbl.text = get_current_zone_display()

func _enforce_role_board_rules() -> void:
	if not grid_node and main_ctrl:
		grid_node = main_ctrl.find_child("TacticalGrid", true, false) as Node3D
		if not grid_node:
			grid_node = main_ctrl.find_child("TacticalGridOverlay", true, false) as Node3D
	if grid_node:
		var should_show := false if current_role == "projector" else grid_enabled
		if grid_node.visible != should_show:
			grid_node.visible = should_show

	for tok in tokens_by_node.values():
		if tok and "selection_ring" in tok and tok.selection_ring:
			var is_act := bool(tok.get("is_active_player"))
			var is_npc := bool(tok.get("is_npc"))
			var want_ring := (current_role != "projector") and is_act and not is_npc
			if tok.selection_ring.visible != want_ring:
				tok.selection_ring.visible = want_ring

func _sync_grid_and_rings() -> void:
	_enforce_role_board_rules()
	if grid_node:
		for mat_prop in ["mat_grid_upper", "mat_grid_lower"]:
			var m = grid_node.get(mat_prop)
			if m is StandardMaterial3D:
				m.albedo_color.a = grid_opacity

func set_grid_enabled(enabled: bool) -> void:
	grid_enabled = enabled
	_sync_grid_and_rings()

func set_grid_opacity(alpha: float) -> void:
	grid_opacity = clampf(alpha, 0.05, 0.65)
	_sync_grid_and_rings()

func refresh_all() -> void:
	if player_hud: player_hud.refresh()
	if dm_hud: dm_hud.refresh()
	if projector_hud: projector_hud.refresh()

func _refresh_clock_only() -> void:
	var clock_info := CampaignData.format_clock_day_time(clock_seconds)
	if player_hud and player_hud.clock_time_lbl:
		player_hud.clock_time_lbl.text = clock_info["day_label"]
	if projector_hud and projector_hud.clock_time_lbl:
		projector_hud.clock_time_lbl.text = clock_info["day_label"]
	if dm_hud and dm_hud.clock_readout_lbl and is_instance_valid(dm_hud.clock_readout_lbl):
		dm_hud.clock_readout_lbl.text = clock_info["day_label"]

func get_active_actor() -> Dictionary:
	for a in actors:
		if a["id"] == selected_actor_id:
			return a
	return actors[0] if not actors.is_empty() else {}

func get_selected_enemy() -> Dictionary:
	for e in enemies:
		if e["id"] == selected_enemy_id:
			return e
	return enemies[0] if not enemies.is_empty() else {}

func get_active_token_node() -> Node3D:
	var a := get_active_actor()
	var nname: String = a.get("node_name", "PlayerToken")
	if tokens_by_node.has(nname):
		return tokens_by_node[nname]
	return tokens_by_node.get("PlayerToken", null)

func select_player_character(actor_id: String) -> void:
	for i in range(actors.size()):
		if actors[i]["id"] == actor_id:
			selected_actor_id = actor_id
			if main_ctrl and main_ctrl.has_method("select_party_member"):
				main_ctrl.select_party_member(i)
			notify_mesa("Personaje activo: %s" % actors[i]["name"])
			refresh_all()
			return

func apply_hp_delta(actor_id: String, delta_hp: int) -> void:
	for a in actors:
		if a["id"] == actor_id:
			a["hp"] = clampi(int(a["hp"]) + delta_hp, 0, int(a["hp_max"]))
			var tok: Node3D = tokens_by_node.get(a.get("node_name", ""), null)
			if tok and tok.has_method("play_action_animation"):
				if delta_hp < 0:
					tok.play_action_animation("hit")
				if int(a["hp"]) <= 0:
					tok.play_action_animation("defeated")
			refresh_all()
			return

func apply_enemy_hp_delta(enemy_id: String, delta_hp: int) -> void:
	for e in enemies:
		if e["id"] == enemy_id:
			e["hp"] = clampi(int(e["hp"]) + delta_hp, 0, int(e["hp_max"]))
			var tok: Node3D = tokens_by_node.get(e.get("node_name", ""), null)
			if tok and tok.has_method("play_action_animation") and delta_hp < 0:
				tok.play_action_animation("hit")
			refresh_all()
			return

func toggle_enemy_revealed(enemy_id: String) -> void:
	for e in enemies:
		if e["id"] == enemy_id:
			e["revealed"] = not bool(e["revealed"])
			var tok: Node3D = tokens_by_node.get(e.get("node_name", ""), null)
			if tok:
				tok.visible = e["revealed"]
			refresh_all()
			return

func focus_enemy_token(enemy_id: String) -> void:
	for e in enemies:
		if e["id"] == enemy_id:
			var tok: Node3D = tokens_by_node.get(e.get("node_name", ""), null)
			if tok and camera:
				if camera.has_method("set_target_character"):
					camera.set_target_character(tok)
				if "is_overview" in camera:
					camera.is_overview = false
			return

func play_enemy_animation(enemy_id: String, anim_name: String) -> void:
	for e in enemies:
		if e["id"] == enemy_id:
			var tok: Node3D = tokens_by_node.get(e.get("node_name", ""), null)
			if tok and tok.has_method("play_action_animation"):
				tok.play_action_animation(anim_name)
			notify_mesa("%s ejecuta: %s" % [e["name"], anim_name])
			return

func perform_player_combat_action(action_label: String, anim_name: String) -> void:
	var tok := get_active_token_node()
	if tok and tok.has_method("play_action_animation"):
		tok.play_action_animation(anim_name)
	var a := get_active_actor()
	notify_mesa("%s usa %s" % [a.get("name", "Héroe"), action_label])

func perform_player_exploration_action(act: Dictionary) -> void:
	var tok := get_active_token_node()
	if tok and tok.has_method("play_action_animation"):
		tok.play_action_animation(str(act.get("anim", "interact")))
	var a := get_active_actor()
	dm_requests.insert(0, {
		"id": "req_%d" % Time.get_ticks_msec(),
		"actor": a.get("name", "Héroe"),
		"action": act.get("label", "Acción"),
		"skill": act.get("detail", "Prueba de habilidad"),
		"zone": get_current_zone_display()
	})
	notify_mesa("Solicitud enviada al DM: %s" % act.get("label", ""))
	refresh_all()

func resolve_dm_request(req_id: String, succeeded: bool) -> void:
	for i in range(dm_requests.size()):
		if dm_requests[i]["id"] == req_id:
			var req := dm_requests[i]
			dm_requests.remove_at(i)
			notify_mesa("%s · %s: %s" % [req["actor"], req["action"], "SUPERA ✓" if succeeded else "FALLA ✕"])
			refresh_all()
			return

func trigger_nearby_interaction() -> void:
	if not main_ctrl:
		return
	for node in main_ctrl.find_children("*", "Node3D", true, false):
		if node.get("is_player_nearby") == true:
			if node.has_method("toggle_door"):
				node.toggle_door()
				return
			if node.has_method("execute_transition"):
				node.execute_transition()
				return
			if node.has_method("collect"):
				node.collect()
				return
			if node.has_method("interact"):
				node.interact()
				return

# --- Combate e iniciativa ---
func start_combat() -> void:
	combat_order.clear()
	var rng := RandomNumberGenerator.new()
	rng.randomize()
	for a in actors:
		var roll := rng.randi_range(1, 20) + int(a.get("initiative_bonus", 0))
		combat_order.append({"id": a["id"], "name": a["name"], "kind": "player", "init": roll, "color": a["color"]})
	for e in enemies:
		if e.get("revealed", true):
			var roll := rng.randi_range(1, 20) + int(e.get("initiative_bonus", 0))
			combat_order.append({"id": e["id"], "name": e["name"], "kind": "enemy", "init": roll, "color": e["color"]})
	combat_order.sort_custom(func(x, y): return int(x["init"]) > int(y["init"]))
	combat_active = true
	if camera and not camera.is_combat_group_mode: camera.toggle_combat_group_view()
	combat_round = 1
	combat_turn_idx = 0
	notify_mesa("⚔ ¡Comienza el combate! Ronda 1")
	refresh_all()

func next_combat_turn() -> void:
	if not combat_active or combat_order.is_empty():
		return
	combat_turn_idx += 1
	if combat_turn_idx >= combat_order.size():
		combat_turn_idx = 0
		combat_round += 1
		clock_seconds += 6
	var cur := get_current_combatant()
	if cur.get("kind", "") == "player":
		select_player_character(cur.get("id", "mia"))
	refresh_all()

func end_combat() -> void:
	combat_active = false
	if camera: camera.end_combat_framing()
	combat_order.clear()
	combat_turn_idx = 0
	combat_round = 1
	notify_mesa("Fin del combate · Volviendo a Exploración")
	refresh_all()

func get_current_combatant() -> Dictionary:
	if not combat_active or combat_order.is_empty():
		return {}
	return combat_order[clampi(combat_turn_idx, 0, combat_order.size() - 1)]

# --- Clima, Hora y Reloj ---
func get_env_time() -> String:
	if ship_env and "time_of_day" in ship_env:
		return str(ship_env.time_of_day)
	return _fallback_time

func get_env_weather() -> String:
	if ship_env and "weather" in ship_env:
		return str(ship_env.weather)
	return _fallback_weather

func get_env_reduced_effects() -> bool:
	if ship_env and "reduced_effects" in ship_env:
		return bool(ship_env.reduced_effects)
	return _fallback_reduced

func set_env_time(t: String) -> void:
	_fallback_time = t
	if ship_env and ship_env.has_method("set_time_of_day"):
		ship_env.set_time_of_day(t)
	var day_idx := int(clock_seconds / 86400)
	match t:
		"day": clock_seconds = day_idx * 86400 + 12 * 3600
		"dusk": clock_seconds = day_idx * 86400 + 18 * 3600 + 30 * 60
		"night": clock_seconds = day_idx * 86400 + 22 * 3600 + 15 * 60
	refresh_all()

func set_env_weather(w: String) -> void:
	_fallback_weather = w
	if ship_env and ship_env.has_method("set_weather"):
		ship_env.set_weather(w)
	refresh_all()

func set_env_reduced_effects(v: bool) -> void:
	_fallback_reduced = v
	if ship_env and ship_env.has_method("set_reduced_effects"):
		ship_env.set_reduced_effects(v)
	refresh_all()

func advance_clock_seconds(secs: int) -> void:
	clock_seconds += secs
	refresh_all()

# --- Zonas y Cámara ---
func get_zones_list() -> Array[Dictionary]:
	return CampaignData.get_retreat_zones() if is_retreat else CampaignData.get_pecio_zones()

func get_selected_zone() -> Dictionary:
	for z in get_zones_list():
		if z["id"] == selected_zone_id:
			return z
	return get_zones_list()[0]

func get_current_zone_display() -> String:
	if is_retreat:
		return get_selected_zone().get("label", "Playa y Embarcadero")
	return CampaignData.get_pecio_zone_label(selected_zone_id)

func focus_zone(zone_id: String) -> void:
	selected_zone_id = zone_id
	var z := get_selected_zone()
	if is_retreat:
		if camera and camera.has_method("apply_zone_preset"):
			camera.apply_zone_preset(z.get("preset", "beach"))
	else:
		if roof_ctrl and roof_ctrl.has_method("set_interior_mode"):
			var cutout: String = z.get("cutout", "exterior")
			roof_ctrl.lock_override_mode = (cutout != "exterior")
			roof_ctrl.set_interior_mode(cutout, cutout != "exterior")
		if camera:
			if z.get("overview", false) and camera.has_method("set_overview_mode"):
				camera.set_overview_mode(true)
			else:
				if "is_overview" in camera: camera.is_overview = false
				if "is_following" in camera: camera.is_following = false
				if "target_focus" in camera: camera.target_focus = z.get("focus", Vector3.ZERO)
				if "target_distance" in camera: camera.target_distance = float(z.get("distance", 16.0))
	_enforce_role_board_rules()
	refresh_all()

func cam_orbit(dir: int) -> void:
	if not camera: return
	if camera.has_method("step_orbit"):
		camera.step_orbit(dir)
	elif "target_yaw" in camera:
		camera.target_yaw += float(dir) * 45.0

func cam_tilt(dir: int) -> void:
	if not camera: return
	if camera.has_method("step_tilt"):
		camera.step_tilt(dir)
	elif "target_pitch" in camera:
		camera.target_pitch = clampf(camera.target_pitch + float(dir) * 5.0, 5.0, 65.0)

func cam_detail() -> void:
	if not camera: return
	if camera.has_method("frame_actor_detail"):
		camera.frame_actor_detail()
	elif "target_distance" in camera:
		camera.target_distance = 10.0

func cam_overview_toggle() -> void:
	if not camera: return
	if camera.has_method("set_overview_mode"):
		camera.set_overview_mode(not bool(camera.get("is_overview")))
	elif camera.has_method("apply_zone_preset"):
		camera.apply_zone_preset("overview")

func cam_reset() -> void:
	if not camera: return
	if camera.has_method("reset_camera_view"):
		camera.reset_camera_view()
	elif "follow_target" in camera:
		camera.follow_target = true

func get_scene_doors() -> Array:
	if not main_ctrl:
		return []
	var out: Array = []
	for d in main_ctrl.find_children("Door*", "Node3D", true, false):
		if d.has_method("toggle_door"):
			out.append(d)
	return out

# --- Inventario / Antorcha / Mensajes ---
func get_inventory_items() -> Dictionary:
	if inv_mgr and "items" in inv_mgr:
		return inv_mgr.items
	return {}

func is_torch_lit() -> bool:
	var tok := get_active_token_node()
	if tok and "is_torch_lit" in tok:
		return bool(tok.is_torch_lit)
	return false

func toggle_torch() -> void:
	if inv_mgr and inv_mgr.has_method("toggle_torch"):
		inv_mgr.toggle_torch()
	refresh_all()

func add_inventory_item(id: String, qty: int, display_name: String) -> void:
	if inv_mgr and inv_mgr.has_method("add_item"):
		inv_mgr.add_item(id, qty, display_name)

func notify_mesa(msg: String) -> void:
	toast_timer = 3.2
	if player_hud:
		player_hud.show_toast(msg)
	if inv_mgr and inv_mgr.has_method("show_notification") and current_role != "projector":
		inv_mgr.show_notification(msg)

func trigger_save_flash() -> void:
	save_flash_timer = 2.6
	notify_mesa("Partida sincronizada y guardada")
	if projector_hud:
		projector_hud.refresh()

func get_scene_exits() -> Array:
	var mt := get_node_or_null("/root/MapTransition")
	if mt and mt.has_method("get_scene_exits"):
		return mt.get_scene_exits(get_tree().current_scene)
	return []

func travel_to_exit(exit_id: String) -> bool:
	for ex in get_scene_exits():
		if str(ex.get("exit_id")) == exit_id and ex.has_method("execute_transition"):
			return ex.execute_transition()
	return false

func toggle_exit_lock(exit_id: String) -> bool:
	for ex in get_scene_exits():
		if str(ex.get("exit_id")) == exit_id:
			var next_state := not bool(ex.get("dm_locked"))
			if ex.has_method("set_dm_locked"):
				ex.set_dm_locked(next_state)
			else:
				ex.set("dm_locked", next_state)
			return next_state
	return false

func set_dm_exits_highlighted(enabled: bool) -> void:
	var mt := get_node_or_null("/root/MapTransition")
	if mt and mt.has_method("dm_highlight_all"):
		mt.dm_highlight_all(enabled, get_tree().current_scene)
