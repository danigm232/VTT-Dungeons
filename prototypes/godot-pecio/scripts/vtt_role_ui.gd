class_name VttRoleUi
extends CanvasLayer

# Coordinador unificado de las 3 interfaces canónicas de Dungeons VTT en Godot 4:
# - player    (JUGADOR)   : apps/web/player.html + player.ts + player.css
# - dm        (DM)        : apps/web/dm.html + dm.ts + dm.css
# - projector (PROYECTOR) : apps/web/projector.html + projector.ts + projector.css

const CampaignData := preload("res://scripts/vtt_campaign_data.gd")
const ThemeKit := preload("res://scripts/vtt_ui_theme.gd")
const PecioWorldState := preload("res://scripts/pecio_world_state.gd")
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
var inventory_bridge
var roof_ctrl: Node
var canon_ctrl: Node
var preferences: Node
var grid_node: Node3D
var tokens_by_node: Dictionary = {}

# Estado de campaña compartido entre DM, JUGADOR y PROYECTOR
var is_retreat: bool = false
var route_scene_kind: String = ""
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
var combat_controller: Node

var toast_timer: float = 0.0
var save_flash_timer: float = 0.0
var _last_prompt_text: String = ""
var world_state: PecioWorldState
var _helm_modal: PanelContainer
var _helm_modal_ctrl: Node = null

func _ready() -> void:
	layer = 120
	process_mode = Node.PROCESS_MODE_ALWAYS
	_detect_scene_context()
	preferences=preload("res://player/player_preferences.gd").new()
	add_child(preferences); preferences.setup(self)
	_build_ui_tree()
	map_interaction = preload("res://scripts/vtt_map_interaction.gd").new()
	map_interaction.name = "DmMapInteraction"
	add_child(map_interaction)
	combat_controller=preload("res://combat/combat_controller.gd").new()
	add_child(combat_controller)
	combat_controller.setup(self)
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
		var rk = main_ctrl.get("scene_kind")
		route_scene_kind = str(rk) if rk != null else ""
		is_retreat = (main_ctrl.find_child("RetreatLayoutBuilder", true, false) != null) or (not route_scene_kind.is_empty())
		camera = main_ctrl.find_child("TacticalCamera", true, false) as Camera3D
		ship_env = main_ctrl.find_child("ShipEnvironment", true, false)
		inv_mgr = main_ctrl.find_child("InventoryManager", true, false)
		roof_ctrl = main_ctrl.find_child("RoofCutout", true, false)
		canon_ctrl = main_ctrl.find_child("PecioCanonController", true, false)
		grid_node = main_ctrl.find_child("TacticalGrid", true, false) as Node3D
		if not grid_node:
			grid_node = main_ctrl.find_child("TacticalGridOverlay", true, false) as Node3D
		for nname in [
			"PlayerToken", "RogueToken", "WizardToken",
			"HarpyToken", "HarpyToken_C2",
			"ZombieToken", "ZombieC4_A", "ZombieC4_B", "ZombieC4_C_Lvl2",
			"GhoulToken", "ZombieC8_B_Lvl2", "ZombieC8_C_Lvl2"
		]:
			var tok := main_ctrl.find_child(nname, true, false) as Node3D
			if tok:
				tokens_by_node[nname] = tok

	meta = CampaignData.get_campaign_meta(is_retreat)
	actors = CampaignData.create_default_actors()
	enemies = CampaignData.create_default_enemies(is_retreat)
	dm_requests = CampaignData.get_initial_dm_requests(is_retreat)
	selected_enemy_id = enemies[0]["id"] if not enemies.is_empty() else ""
	if not route_scene_kind.is_empty():
		selected_zone_id = "start"
	else:
		selected_zone_id = "beach" if is_retreat else "c1"
	inventory_bridge = preload("res://inventory/inventory_bridge.gd").new(self)
	if not is_retreat:
		world_state = PecioWorldState.new()
		world_state.load_state()
		_apply_harpy_world_presence(world_state.harpy_present, false)

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
	if current_role == "player" and roof_ctrl:
		roof_ctrl.lock_override_mode = false
		if roof_ctrl.has_method("check_exit_to_exterior"):
			roof_ctrl.check_exit_to_exterior()
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
		elif kev.keycode == KEY_V and current_role == "player":
			toggle_torch()
			get_viewport().set_input_as_handled()
		elif kev.keycode == KEY_U and current_role in ["player", "dm"]:
			if toggle_aquatic_depth():
				get_viewport().set_input_as_handled()

func toggle_aquatic_depth() -> bool:
	var tok := get_active_token_node()
	if not tok is PlayerToken or not tok.toggle_dive():
		return false
	return true

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
			if combat_controller: combat_controller.rules.advance_time(whole)
			for body in tokens_by_node.values():
				if body is PlayerToken and not body.is_npc:
					body._update_aquatic_breath(float(whole))
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

	if player_hud and current_role == "player":
		player_hud.refresh_aquatic_status(get_active_token_node())

	# Sincronizar zona actual según personaje activo en Pecio
	if not is_retreat and camera and camera.has_method("detect_wreck_zone"):
		var tok := get_active_token_node()
		if tok and player_root.visible:
			var detected: String = camera.detect_wreck_zone(tok.global_position)
			var norm_z := "c1" if detected == "main" else detected
			if norm_z != "" and norm_z != selected_zone_id:
				selected_zone_id = norm_z
			if player_hud:
				var label := "Mar abierto" if tok is PlayerToken and tok.in_open_ocean else get_current_zone_display()
				if player_hud.scene_notice_lbl.text != label:
					player_hud.scene_notice_lbl.text = label

func _enforce_role_board_rules() -> void:
	if not grid_node and main_ctrl:
		grid_node = main_ctrl.find_child("TacticalGrid", true, false) as Node3D
		if not grid_node:
			grid_node = main_ctrl.find_child("TacticalGridOverlay", true, false) as Node3D
	if grid_node:
		var should_show: bool = current_role != "projector" if grid_node.has_method("apply_preferences") else (current_role != "projector" and grid_enabled)
		if grid_node.visible != should_show:
			grid_node.visible = should_show

	for tok in tokens_by_node.values():
		if tok and "selection_ring" in tok and tok.selection_ring:
			var is_act := bool(tok.get("is_active_player"))
			var is_npc := bool(tok.get("is_npc"))
			var want_ring: bool = (current_role != "projector") and is_act and not is_npc and (preferences==null or preferences.values.showMovementHints)
			if tok.selection_ring.visible != want_ring:
				tok.selection_ring.visible = want_ring

func _sync_grid_and_rings() -> void:
	_enforce_role_board_rules()
	if grid_node and grid_node.has_method("apply_preferences") and preferences:
		var body:=get_active_token_node()
		if body: grid_node.apply_preferences(preferences.values,body.global_position)

func set_grid_enabled(enabled: bool) -> void:
	if preferences: preferences.set_value("showGrid",enabled)
	else: grid_enabled=enabled; _sync_grid_and_rings()

func set_grid_opacity(alpha: float) -> void:
	if preferences: preferences.set_value("gridOpacity",alpha)
	else: grid_opacity=clampf(alpha,.06,.7); _sync_grid_and_rings()

func refresh_all() -> void:
	if player_hud: player_hud.refresh()
	if dm_hud: dm_hud.refresh()
	if projector_hud: projector_hud.refresh()
	if combat_controller: combat_controller.refresh()

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
	if combat_controller:
		if delta_hp<0: combat_controller.rules.damage(actor_id,-delta_hp,"")
		else: combat_controller.rules.heal(actor_id,delta_hp)
		if combat_controller.rules.pending.is_empty(): combat_controller.rules._next_followup()
		combat_controller.rules._auto_end()
		refresh_all()
		return
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
	if combat_controller:
		if delta_hp<0: combat_controller.rules.damage(enemy_id,-delta_hp,"")
		else: combat_controller.rules.heal(enemy_id,delta_hp)
		if combat_controller.rules.pending.is_empty(): combat_controller.rules._next_followup()
		combat_controller.rules._auto_end()
		refresh_all()
		return
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
				if enemy_id == "harpy" and world_state:
					tok.set_meta("adventure_present", e["revealed"])
					world_state.set_harpy_present(e["revealed"])
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
	if combat_controller and anim_name in ["attack","spell","cast"]:
		combat_controller.enemy_action(enemy_id)
		return
	for e in enemies:
		if e["id"] == enemy_id:
			var tok: Node3D = tokens_by_node.get(e.get("node_name", ""), null)
			if tok and tok.has_method("play_action_animation"):
				tok.play_action_animation(anim_name)
			notify_mesa("%s ejecuta: %s" % [e["name"], anim_name])
			return

func perform_player_combat_action(action_label: String, anim_name: String) -> void:
	if combat_controller:
		combat_controller.legacy_action(action_label)
		return
	var tok := get_active_token_node()
	if tok and tok.has_method("play_action_animation"):
		tok.play_action_animation(anim_name)
	var a := get_active_actor()
	notify_mesa("%s usa %s" % [a.get("name", "Héroe"), action_label])

func perform_player_exploration_action(act: Dictionary) -> void:
	if combat_controller and combat_active:
		combat_controller._basic("search" if str(act.get("label","")).to_lower().contains("buscar") else "improvise")
		return
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
			if succeeded:
				for actor in actors:
					if actor.name==req.get("actor",""):
						var body: Node3D=tokens_by_node.get(actor.get("node_name",""),null)
						if body: body.play_action_animation("interact")
			notify_mesa("%s · %s: %s" % [req["actor"], req["action"], "SUPERA ✓" if succeeded else "FALLA ✕"])
			refresh_all()
			return

func trigger_nearby_interaction() -> void:
	if not main_ctrl:
		return
	var active_tok := get_active_token_node()
	if active_tok and active_tok.get("in_boat") == true:
		var boat := active_tok.get("current_boat") as Node3D
		if boat and boat.has_method("interact"):
			boat.interact()
			return
	var candidates: Array[Node3D] = []
	for node in main_ctrl.find_children("*", "Node3D", true, false):
		if node.get("is_player_nearby") == true:
			candidates.append(node)
	if candidates.is_empty():
		return
	if active_tok:
		candidates.sort_custom(func(a: Node3D, b: Node3D) -> bool:
			return active_tok.global_position.distance_squared_to(a.global_position) < active_tok.global_position.distance_squared_to(b.global_position)
		)
	for node in candidates:
		if node.has_method("interact_or_toggle"):
			node.interact_or_toggle()
			return
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
	if combat_controller: combat_controller.show_roster()
func next_combat_turn() -> void:
	if combat_controller: combat_controller.next_turn()
func end_combat() -> void:
	if combat_controller: combat_controller.end_combat()
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
	if combat_controller: combat_controller.rules.advance_time(secs)
	refresh_all()

# --- Zonas y Cámara ---
func get_zones_list() -> Array[Dictionary]:
	if not route_scene_kind.is_empty():
		return CampaignData.get_route_zones(route_scene_kind)
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
	if not route_scene_kind.is_empty():
		if camera:
			if z.get("overview", false) and camera.has_method("set_overview_mode"):
				camera.set_overview_mode(true)
			else:
				if "is_overview" in camera: camera.is_overview = false
				if "is_following" in camera: camera.is_following = false
				if "target_focus" in camera: camera.target_focus = z.get("focus", Vector3.ZERO)
				if "target_distance" in camera: camera.target_distance = float(z.get("distance", 18.0))
	elif is_retreat:
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

# --- Control DM de Mapas y Posición de Jugadores ---
func get_campaign_maps() -> Array[Dictionary]:
	return CampaignData.get_campaign_maps()

func get_current_project_key() -> String:
	if is_retreat or str(ProjectSettings.get_setting("application/config/name", "")).contains("Retiro"):
		return "retiro"
	return "pecio"

func get_current_map_id() -> String:
	if get_current_project_key() == "pecio":
		return "pecio_main"
	if not route_scene_kind.is_empty():
		match route_scene_kind:
			"pleamar_coves": return "retiro_pleamar"
			"observatory_approach": return "retiro_observatory"
			"pecio_cove_arrival": return "retiro_pecio_cove"
	var sp := ""
	if main_ctrl and not main_ctrl.scene_file_path.is_empty():
		sp = main_ctrl.scene_file_path
	elif get_tree() and get_tree().current_scene:
		sp = get_tree().current_scene.scene_file_path
	for m in get_campaign_maps():
		if m["project"] == "retiro" and m["scene_path"] == sp:
			return m["id"]
	return "retiro_main"

func resolve_sibling_project_dir(target_project_dir: String) -> String:
	var here := ProjectSettings.globalize_path("res://").rstrip("/\\")
	return here.get_base_dir().path_join(target_project_dir).simplify_path()

func dm_change_map(map_id: String, dry_run: bool = false) -> Dictionary:
	var target: Dictionary = {}
	for m in get_campaign_maps():
		if m["id"] == map_id:
			target = m
			break
	if target.is_empty():
		notify_mesa("Mapa no encontrado: %s" % map_id)
		return {"ok": false, "reason": "not_found"}
	if map_id == get_current_map_id():
		notify_mesa("Ya estás en %s" % target["label"])
		return {"ok": true, "mode": "already", "map": target}

	var cur_proj := get_current_project_key()
	if target["project"] == cur_proj:
		var mt := get_node_or_null("/root/MapTransition")
		if mt:
			mt.set("pending_spawn_id", "")
			mt.set("pending_role", current_role)
			mt.set("is_transitioning", false)
		notify_mesa("Cambiando a %s…" % target["label"])
		if not dry_run:
			var sl := get_node_or_null("/root/SkillLoading")
			if sl and sl.has_method("load_map"):
				sl.load_map(target["scene_path"], target["label"], "dm_switch")
			else:
				get_tree().change_scene_to_file.call_deferred(target["scene_path"])
		return {"ok": true, "mode": "in_project", "scene_path": target["scene_path"], "map": target}

	var sibling_dir := resolve_sibling_project_dir(target["project_dir"])
	if not DirAccess.dir_exists_absolute(sibling_dir):
		notify_mesa("No se encontró el proyecto hermano: %s" % sibling_dir)
		return {"ok": false, "reason": "missing_project_dir", "project_dir": sibling_dir}

	var launch_args := [
		"--path", sibling_dir,
		"--",
		"--role=" + current_role,
		"--scene=" + target["scene_path"],
		"--destination=" + target["label"]
	]
	if target.has("camp_id"):
		launch_args.append("--camp=" + str(target["camp_id"]))
	notify_mesa("Abriendo %s…" % target["label"])
	if not dry_run:
		var exe := OS.get_executable_path()
		var pid := OS.create_process(exe, PackedStringArray(launch_args))
		if pid <= 0:
			notify_mesa("No se pudo iniciar %s" % target["label"])
			return {"ok": false, "reason": "spawn_failed", "project_dir": sibling_dir, "args": launch_args}
		get_tree().create_timer(0.15).timeout.connect(func(): get_tree().quit(0))
	return {"ok": true, "mode": "cross_project", "project_dir": sibling_dir, "args": launch_args, "map": target}

func get_party_tokens() -> Array[CharacterBody3D]:
	var out: Array[CharacterBody3D] = []
	for nname in ["PlayerToken", "RogueToken", "WizardToken"]:
		var tok = tokens_by_node.get(nname)
		if is_instance_valid(tok) and tok is CharacterBody3D:
			out.append(tok as CharacterBody3D)
	return out

func get_dm_anchor_point() -> Vector3:
	var z := get_selected_zone()
	if camera and not bool(camera.get("is_overview")):
		var tf = camera.get("target_focus")
		if tf is Vector3 and (tf as Vector3).length_squared() > 0.0001:
			return tf as Vector3
		var fp = camera.get("focus_point")
		if fp is Vector3 and (fp as Vector3).length_squared() > 0.0001:
			return fp as Vector3
	return z.get("warp", z.get("focus", Vector3.ZERO))

func bring_actor_here(actor_id: String) -> bool:
	return teleport_actor_to_point(actor_id, get_dm_anchor_point(), true)

func bring_party_here() -> int:
	return teleport_party_to_point(get_dm_anchor_point(), true)

func teleport_actor_to_point(actor_id: String, point: Vector3, snap_to_floor: bool = true) -> bool:
	var actor: Dictionary = {}
	for a in actors:
		if a["id"] == actor_id:
			actor = a
			break
	if actor.is_empty():
		return false
	var tok = tokens_by_node.get(actor.get("node_name", "")) as CharacterBody3D
	if not is_instance_valid(tok):
		return false
	if map_interaction and map_interaction.has_method("teleport_token"):
		var ok: bool = map_interaction.teleport_token(tok, point, snap_to_floor)
		if ok:
			notify_mesa("%s trasladado · Ctrl+Z para deshacer" % actor["name"])
		return ok
	return false

func teleport_party_to_point(point: Vector3, snap_to_floor: bool = true) -> int:
	var party_toks := get_party_tokens()
	if party_toks.is_empty() or not map_interaction or not map_interaction.has_method("teleport_party"):
		return 0
	var moved: int = map_interaction.teleport_party(party_toks, point, snap_to_floor)
	if moved > 0:
		notify_mesa("Grupo trasladado (%d fichas) · Ctrl+Z para deshacer" % moved)
	return moved

func teleport_actor_to_zone(actor_id: String, zone_id: String) -> bool:
	focus_zone(zone_id)
	var z := get_selected_zone()
	var pt: Vector3 = z.get("warp", z.get("focus", Vector3.ZERO))
	return teleport_actor_to_point(actor_id, pt, true)

func teleport_party_to_zone(zone_id: String) -> int:
	focus_zone(zone_id)
	var z := get_selected_zone()
	var pt: Vector3 = z.get("warp", z.get("focus", Vector3.ZERO))
	return teleport_party_to_point(pt, true)

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
	return inventory_bridge.items() if inventory_bridge else {}

func is_torch_lit() -> bool:
	var tok := get_active_token_node()
	if tok and "is_torch_lit" in tok:
		return bool(tok.is_torch_lit)
	return false

func toggle_torch() -> void:
	if inventory_bridge:
		inventory_bridge.toggle_torch()
		if player_hud.inventory_modal.visible:
			player_hud.inventory_modal.refresh_view()
	refresh_all()

func add_inventory_item(id: String, qty: int, display_name: String) -> void:
	if inventory_bridge:
		inventory_bridge.add_item(id, qty, display_name)

func notify_mesa(msg: String) -> void:
	toast_timer = 4.8
	if player_hud:
		player_hud.show_toast(msg)
	if inv_mgr and inv_mgr.has_method("show_notification") and current_role != "projector" and not inv_mgr.external_ui_managed:
		inv_mgr.show_notification(msg)

func show_external_toast(msg: String) -> void:
	if msg == "":
		return
	toast_timer = 4.8
	if player_hud:
		player_hud.show_toast(msg)

func open_c6_portrait_modal() -> void:
	var c := get_canon_ctrl()
	if c and c.has_method("open_c6_portrait_modal"):
		c.open_c6_portrait_modal()

func trigger_save_flash() -> void:
	save_flash_timer = 2.6
	if world_state:
		world_state.save_state()
	notify_mesa("Partida sincronizada y guardada")
	if projector_hud:
		projector_hud.refresh()

func get_helm_controller() -> Node:
	if not main_ctrl:
		return null
	return main_ctrl.find_child("PropWheelC3", true, false)

func get_canon_ctrl() -> Node:
	if is_instance_valid(canon_ctrl):
		return canon_ctrl
	if main_ctrl:
		canon_ctrl = main_ctrl.find_child("PecioCanonController", true, false)
	return canon_ctrl

func set_party_level(lvl: int) -> void:
	var c := get_canon_ctrl()
	if c and c.has_method("apply_party_level"):
		c.apply_party_level(lvl, true)
	refresh_all()

func set_strict_canon_mode(enabled: bool) -> void:
	var c := get_canon_ctrl()
	if c and c.has_method("apply_strict_canon_mode"):
		c.apply_strict_canon_mode(enabled, true)
	refresh_all()

func open_ship_rest_modal() -> void:
	var c := get_canon_ctrl()
	if c and c.has_method("open_ship_rest_modal"):
		c.open_ship_rest_modal()

func open_logbook_and_talisman_modal() -> void:
	var c := get_canon_ctrl()
	if c and c.has_method("open_logbook_and_talisman_modal"):
		c.open_logbook_and_talisman_modal()

func trigger_harpy_return(reason: String = "Decisión del DM") -> void:
	var c := get_canon_ctrl()
	if c and c.has_method("trigger_harpy_return"):
		c.trigger_harpy_return(reason)
	refresh_all()

func resolve_harpy(resolution: String) -> void:
	var c := get_canon_ctrl()
	if c and c.has_method("resolve_harpy"):
		c.resolve_harpy(resolution)
	refresh_all()

func set_all_lanterns(lit: bool) -> void:
	var c := get_canon_ctrl()
	if c and c.has_method("set_all_lanterns"):
		c.set_all_lanterns(lit)
	refresh_all()

func set_harpy_present(present: bool) -> void:
	_apply_harpy_world_presence(present, true)
	refresh_all()

func _apply_harpy_world_presence(present: bool, save_flag: bool) -> void:
	if world_state:
		if save_flag:
			world_state.set_harpy_present(present)
		else:
			world_state.harpy_present = present
	for e in enemies:
		if e["id"] == "harpy":
			e["revealed"] = present
	var tok: Node3D = tokens_by_node.get("HarpyToken", null)
	if tok:
		var was_visible := tok.visible
		tok.set_meta("adventure_present", present)
		tok.visible = present
		if present:
			# Garantiza que sus garras contacten firmemente el punto de descanso del nido
			tok.position.y = maxf(tok.position.y, 15.105)
			if not was_visible and is_inside_tree():
				var nest_amb := get_tree().root.find_child("NestAmbianceController", true, false)
				animate_harpy_arrival(tok, nest_amb)

func animate_harpy_arrival(tok: Node3D, nest: Node = null) -> void:
	if not is_instance_valid(tok) or tok.get("is_defeated"):
		return
	var arrival := int(tok.get_meta("harpy_arrival", 0)) + 1
	tok.set_meta("harpy_arrival", arrival)
	var view: String = preload("res://sprites/sprite_facing.gd").view_direction(tok, str(tok.get("facing_dir")))
	var turn: Dictionary = tok._pick_clip_from_profile("flight_turn", view)
	var turn_time := float(turn.get("frames", []).size()) / maxf(1.0, float(turn.get("fps", 12.0)))
	tok.play_action_animation("flight_turn", turn_time + 0.16)
	await get_tree().create_timer(turn_time).timeout
	if not _harpy_arrival_is_current(tok, arrival, "flight_turn"):
		return
	tok.play_action_animation("land", 0.8)
	if is_instance_valid(nest) and nest.has_method("play_harpy_landing"):
		tok.queue_harpy_perch_contact(nest)

func _harpy_arrival_is_current(tok: Node3D, arrival: int, phase: String) -> bool:
	return is_instance_valid(tok) and tok.is_visible_in_tree() and not tok.get("is_defeated") \
		and int(tok.get_meta("harpy_arrival", 0)) == arrival and tok.get("action_anim_name") == phase

func loot_c10_nest() -> Dictionary:
	if world_state and not world_state.mark_c10_nest_looted():
		return {"already_looted": true, "items": []}
	var treasures := [
		["gold_bracelet_c10", 1, "Pulsera pequeña de oro (25 po)"],
		["gold_earring_c10", 1, "Pendiente único de oro (25 po)"],
		["tiger_eye_gem_c10", 2, "Gema ojo de tigre (10 po c/u)"],
		["bloodstone_gem_c10", 1, "Gema de heliotropo (50 po)"],
	]
	for tr in treasures:
		add_inventory_item(str(tr[0]), int(tr[1]), str(tr[2]))
	var pick := main_ctrl.find_child("PickupGemsCofa", true, false) as Node3D if main_ctrl else null
	if pick:
		if pick.has_method("mark_collected_silent"):
			pick.mark_collected_silent()
		else:
			pick.visible = false
	var nt_node := main_ctrl.find_child("NestTreasures_C10", true, false) as Node3D if main_ctrl else null
	if nt_node:
		nt_node.visible = false
	var prop_nest := main_ctrl.find_child("PropHarpyNestC10", true, false) if main_ctrl else null
	if prop_nest:
		prop_nest.prompt_text = "Examinar nido (registrado)"
	notify_mesa("¡Nido de la arpía registrado! Hallados: pulsera de oro (25 po), pendiente de oro (25 po), 2 gemas ojo de tigre (10 po c/u) y 1 heliotropo (50 po).")
	refresh_all()
	return {"already_looted": false, "items": treasures}

func show_helm_interaction_modal(ctrl: Node) -> void:
	if not ui_root or not ctrl:
		return
	_helm_modal_ctrl = ctrl
	if not _helm_modal:
		_helm_modal = ThemeKit.make_window_panel(ThemeKit.COL_GOLD, 16)
		_helm_modal.name = "HelmChoiceModal"
		_helm_modal.set_anchors_preset(Control.PRESET_CENTER)
		_helm_modal.offset_left = -210
		_helm_modal.offset_top = -115
		_helm_modal.offset_right = 210
		_helm_modal.offset_bottom = 115
		ui_root.add_child(_helm_modal)

		var vb := VBoxContainer.new()
		vb.name = "ModalBody"
		vb.add_theme_constant_override("separation", 10)
		_helm_modal.add_child(vb)

		var title := ThemeKit.make_label("TIMÓN DEL PECIO · «Rosa de los Vientos»", 16, ThemeKit.COL_HEADING)
		vb.add_child(title)
		var desc := ThemeKit.make_label("La rueda está torcida y casi desencajada del eje oxidado. Puedes inspeccionarla sin tocarla o intentar girarla (Salvación DES CD 10 para atraparla).", 13, ThemeKit.COL_INK)
		desc.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		vb.add_child(desc)

		var btn_row := HBoxContainer.new()
		btn_row.add_theme_constant_override("separation", 8)
		vb.add_child(btn_row)

		var b_exam := Button.new()
		b_exam.name = "HelmBtnExamine"
		b_exam.text = "Examinar sin mover"
		b_exam.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		ThemeKit.style_button(b_exam, "secondary", 8, 10, 6)
		b_exam.pressed.connect(func():
			_helm_modal.visible = false
			if is_instance_valid(_helm_modal_ctrl) and _helm_modal_ctrl.has_method("examine_helm"):
				_helm_modal_ctrl.examine_helm()
		)
		btn_row.add_child(b_exam)

		var b_turn := Button.new()
		b_turn.name = "HelmBtnTurn"
		b_turn.text = "Intentar girar (DES CD 10)"
		b_turn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		ThemeKit.style_button(b_turn, "primary", 8, 10, 6)
		b_turn.pressed.connect(func():
			_helm_modal.visible = false
			if is_instance_valid(_helm_modal_ctrl) and _helm_modal_ctrl.has_method("attempt_turn_helm"):
				_helm_modal_ctrl.attempt_turn_helm()
		)
		btn_row.add_child(b_turn)

		var b_close := Button.new()
		b_close.text = "Cerrar"
		ThemeKit.style_button(b_close, "ghost", 6, 8, 4)
		b_close.pressed.connect(func(): _helm_modal.visible = false)
		vb.add_child(b_close)

	_helm_modal.visible = true
	ui_root.move_child(_helm_modal, ui_root.get_child_count() - 1)
