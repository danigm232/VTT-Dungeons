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
const MylaShopPanelScript := preload("res://scripts/retreat_myla_shop_panel.gd")

signal role_changed(new_role: String)

var ui_root: Control
var role_switcher_panel: PanelContainer
var role_buttons: Dictionary = {}

var player_hud: PlayerHud
var dm_hud: DmHud
var projector_hud: ProjectorHud
var _myla_shop: CanvasLayer = null
var _hero_gold: Dictionary = {"mia": 15, "trinity": 20, "mike": 25}

var player_root: Control
var dm_root: Control
var projector_root: Control
var retreat_life: Node3D

# Referencias al escenario
var main_ctrl: Node
var camera: Camera3D
var map_interaction: Node
var ship_env: Node
var inv_mgr: Node
var inventory_bridge
var roof_ctrl: Node
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
var audio_volumes: Dictionary = {"music": 65.0, "ocean": 75.0, "wind": 65.0, "rain": 80.0}

var combat_active: bool = false
var combat_round: int = 1
var combat_turn_idx: int = 0
var combat_order: Array[Dictionary] = []
var combat_controller: Node

var toast_timer: float = 0.0
var save_flash_timer: float = 0.0
var _last_prompt_text: String = ""
var _prompt_scan_accum: float = 0.0

func _ready() -> void:
	layer = 120
	process_mode = Node.PROCESS_MODE_ALWAYS
	add_to_group("vtt_role_ui")
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
		grid_node = main_ctrl.find_child("TacticalGrid", true, false) as Node3D
		if not grid_node:
			grid_node = main_ctrl.find_child("TacticalGridOverlay", true, false) as Node3D
		for nname in ["PlayerToken", "RogueToken", "WizardToken", "HarpyToken", "ZombieToken", "ZombieBeach2", "ZombieBeach3"]:
			var tok := main_ctrl.find_child(nname, true, false) as Node3D
			if tok:
				tokens_by_node[nname] = tok

	meta = CampaignData.get_campaign_meta(is_retreat)
	actors = CampaignData.create_default_actors()
	enemies = CampaignData.create_default_enemies(is_retreat)
	if tokens_by_node.has("ZombieBeach3"):
		enemies = CampaignData.create_retreat_opening_enemies()
		for enemy in enemies:
			var token: Node3D = tokens_by_node.get(enemy.node_name)
			if token:
				token.set_meta("npc_reinforcement_visible", false)
				_apply_enemy_visibility(token, false)
	dm_requests = CampaignData.get_initial_dm_requests(is_retreat)
	selected_enemy_id = enemies[0]["id"] if not enemies.is_empty() else ""
	if not route_scene_kind.is_empty():
		selected_zone_id = "start"
	else:
		selected_zone_id = "beach" if is_retreat else "c1"
	inventory_bridge = preload("res://inventory/inventory_bridge.gd").new(self)

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

func attach_retreat_conversations(village: Node3D) -> void:
	retreat_life = village
	player_root.add_child(village.dialogue)
	var party_button := Button.new()
	party_button.name = "PartyConversationButton"
	party_button.text = "Grupo"
	party_button.tooltip_text = "Conversación del grupo (Y)"
	ThemeKit.style_button(party_button, "secondary", 999, 12, 9)
	party_button.pressed.connect(village.open_party_dialogue)
	var controls := player_hud.interact_btn.get_parent()
	controls.add_child(party_button)
	controls.move_child(party_button, 0)

func set_role(new_role: String) -> void:
	current_role = _normalize_role(new_role)
	if camera and camera.has_method("set_view_role"): camera.set_view_role(current_role)
	if current_role != "player":
		if is_instance_valid(retreat_life):
			retreat_life.close_conversation()
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
	var Prefs = preload("res://player/player_preferences.gd")
	if Prefs.is_capturing_key():
		return
	if event is InputEventKey and event.is_pressed() and not event.is_echo() and not event.ctrl_pressed and not event.alt_pressed:
		var kev := event as InputEventKey
		var kc := kev.keycode
		if Prefs.matches_key("role_player", kc):
			set_role("player")
			get_viewport().set_input_as_handled()
		elif Prefs.matches_key("role_dm", kc):
			set_role("dm")
			get_viewport().set_input_as_handled()
		elif Prefs.matches_key("role_projector", kc):
			set_role("projector")
			get_viewport().set_input_as_handled()
		elif Prefs.matches_key("fullscreen", kc):
			var mode := DisplayServer.window_get_mode()
			if mode == DisplayServer.WINDOW_MODE_FULLSCREEN:
				DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_WINDOWED)
			else:
				DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_FULLSCREEN)
			get_viewport().set_input_as_handled()
		elif kc == KEY_ESCAPE and current_role == "player" and player_hud:
			if is_instance_valid(retreat_life) and retreat_life.has_open_dialogue():
				retreat_life.close_conversation()
				get_viewport().set_input_as_handled()
				return
			player_hud.close_modals()
			player_hud.toggle_exploration_menu(false)
		elif (Prefs.matches_key("inventory", kc) or kc == KEY_B) and current_role == "player" and player_hud:
			if player_hud.inventory_modal.visible:
				player_hud.close_modals()
			else:
				player_hud.open_modal("inventory")
			get_viewport().set_input_as_handled()
		elif Prefs.matches_key("torch", kc) and current_role == "player":
			toggle_torch()
			get_viewport().set_input_as_handled()
		elif Prefs.matches_key("interact", kc) and current_role == "player":
			trigger_nearby_interaction()
			get_viewport().set_input_as_handled()
		elif Prefs.matches_key("dive_toggle", kc) and current_role in ["player", "dm"]:
			if toggle_aquatic_depth():
				get_viewport().set_input_as_handled()
		elif Prefs.matches_key("party_chat", kc) and current_role == "player" and is_instance_valid(retreat_life):
			retreat_life.open_party_dialogue()
			get_viewport().set_input_as_handled()

func toggle_aquatic_depth() -> bool:
	var tok := get_active_token_node()
	if not tok or not tok.has_method("toggle_dive") or not tok.toggle_dive():
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
				if body and not bool(body.get("is_npc")) and body.has_method("_update_aquatic_breath"):
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

	# Sincronizar prompt interactivo (asientos, camas, puertas A1, pozo, hogueras, cofres, salidas e InventoryManager)
	_prompt_scan_accum += delta
	if _prompt_scan_accum >= 0.09:
		_prompt_scan_accum = 0.0
		_sync_nearby_interaction_prompt()

	if player_hud and current_role == "player":
		player_hud.refresh_aquatic_status(get_active_token_node())

	# Sincronizar zona actual según personaje activo (tanto en Retiro como en Pecio)
	if is_retreat and player_root.visible:
		var rtok := get_active_token_node()
		if rtok and rtok.get("current_zone") is Dictionary:
			var cz: Dictionary = rtok.get("current_zone")
			var rz_label := str(cz.get("name", cz.get("label", "")))
			if not rz_label.is_empty() and player_hud and player_hud.scene_notice_lbl.text != rz_label:
				player_hud.scene_notice_lbl.text = rz_label
	elif not is_retreat and camera and camera.has_method("detect_wreck_zone"):
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
	if is_instance_valid(retreat_life):
		retreat_life.synchronize_clock(clock_seconds)
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

func sync_selected_actor_from_party_index(idx: int) -> void:
	if idx < 0 or idx >= actors.size():
		return
	var target_id: String = str(actors[idx].get("id", ""))
	if target_id.is_empty() or target_id == selected_actor_id:
		return
	selected_actor_id = target_id
	_last_prompt_text = "__refresh__"
	_sync_nearby_interaction_prompt()
	refresh_all()

func select_player_character(actor_id: String) -> void:
	for i in range(actors.size()):
		if actors[i]["id"] == actor_id:
			selected_actor_id = actor_id
			if main_ctrl and main_ctrl.has_method("select_party_member"):
				main_ctrl.select_party_member(i)
			_last_prompt_text = "__refresh__"
			_sync_nearby_interaction_prompt()
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

func _retreat_layout_builder() -> Node:
	return main_ctrl.find_child("RetreatLayoutBuilder", true, false) if is_instance_valid(main_ctrl) else null

func is_retreat_zombie_reappearance_active() -> bool:
	var lb := _retreat_layout_builder()
	return lb != null and lb.has_method("is_zombie_reappearance_active") and bool(lb.call("is_zombie_reappearance_active"))

func toggle_retreat_zombie_reappearance() -> void:
	var lb := _retreat_layout_builder()
	if lb == null or not lb.has_method("set_zombie_reappearance_active"):
		return
	var next_state := not is_retreat_zombie_reappearance_active()
	lb.call("set_zombie_reappearance_active", next_state)
	for e in enemies:
		var eid := str(e.get("id", ""))
		if eid.begins_with("zombie"):
			e["revealed"] = next_state
			var tok: Node3D = tokens_by_node.get(e.get("node_name", ""), null)
			if tok:
				_apply_enemy_visibility(tok, next_state)
	if is_instance_valid(retreat_life) and retreat_life.has_method("trigger_zombie_alarm"):
		retreat_life.call("trigger_zombie_alarm", next_state)
	notify_mesa("🎣 Reaparición de zombis activada: aparejos de pesca tirados en el camino bajo, Blepp y Tarak dan la voz de alarma en Z2 y 3 marineros ahogados emergen en la orilla." if next_state else "🎣 Escena de reaparición de zombis ocultada.")
	refresh_all()

func is_retreat_dining_gathering_active() -> bool:
	return is_instance_valid(retreat_life) and retreat_life.has_method("is_dining_gathering_active") and bool(retreat_life.call("is_dining_gathering_active"))

func toggle_retreat_dining_gathering() -> void:
	if not is_instance_valid(retreat_life) or not retreat_life.has_method("set_dining_gathering_active"):
		return
	var next_state := not is_retreat_dining_gathering_active()
	retreat_life.call("set_dining_gathering_active", next_state)
	notify_mesa("🍲 Comida comunitaria en A3: Runara preside la cabecera y los residentes se reúnen en el Salón de la Comunidad." if next_state else "🍲 Los residentes regresan a sus rutinas habituales por el claustro.")
	refresh_all()

func get_active_hero_display_name() -> String:
	var a := get_active_actor()
	return str(a.get("name", selected_actor_id.capitalize()))

func get_active_hero_gold() -> int:
	var key := selected_actor_id if not selected_actor_id.is_empty() else "mia"
	return int(_hero_gold.get(key, 15))

func open_myla_shop() -> void:
	if not is_instance_valid(_myla_shop):
		_myla_shop = MylaShopPanelScript.new()
		_myla_shop.name = "RetreatMylaShopPanel"
		add_child(_myla_shop)
		_myla_shop.call("setup", self)
	_myla_shop.call("open_shop")

func purchase_myla_item(spec: Dictionary) -> Dictionary:
	var key := selected_actor_id if not selected_actor_id.is_empty() else "mia"
	var price := int(spec.get("price_gp", 0))
	var cur_gold := get_active_hero_gold()
	if cur_gold < price:
		var deny := "Oro insuficiente (%d po disponibles; cuesta %d po)." % [cur_gold, price]
		notify_mesa("🪙 " + deny)
		return {"ok": false, "message": deny}
	_hero_gold[key] = cur_gold - price
	var item_id := str(spec.get("id", "equipo_myla"))
	var item_name := str(spec.get("name", "Equipo de Myla"))
	var qty := maxi(1, int(spec.get("qty", 1)))
	var desc := str(spec.get("desc", "Equipo adquirido en el taller de Myla (Celda 4)."))
	add_inventory_item(item_id, qty, item_name)
	var inv := get_inventory_items()
	if inv.has(item_id) and inv[item_id] is Dictionary:
		inv[item_id]["desc"] = desc
		if item_id == "pocion_curacion":
			inv[item_id]["healing_range"] = [4, 10]
	if player_hud and player_hud.inventory_modal and player_hud.inventory_modal.visible:
		player_hud.inventory_modal.refresh_view()
	var msg := "Comprado: %s (×%d) por %d po. Restan %d po en la bolsa de %s." % [item_name, qty, price, int(_hero_gold[key]), get_active_hero_display_name()]
	notify_mesa("🛠️ " + msg)
	refresh_all()
	return {"ok": true, "message": msg, "gold": int(_hero_gold[key])}

func grant_canonical_quest_reward(reward_id: String) -> bool:
	var hero := get_active_hero_display_name()
	if reward_id == "tarak_potions":
		add_inventory_item("pocion_curacion", 2, "Poción de curación (Tarak)")
		var inv := get_inventory_items()
		if inv.has("pocion_curacion") and inv["pocion_curacion"] is Dictionary:
			inv["pocion_curacion"]["desc"] = "Recompensa de Tarak tras despejar las Cavernas de Pleamar. Restaura 2d4 + 2 PG."
			inv["pocion_curacion"]["healing_range"] = [4, 10]
		if player_hud and player_hud.inventory_modal and player_hud.inventory_modal.visible:
			player_hud.inventory_modal.refresh_view()
		notify_mesa("🧪 Tarak entrega 2 Pociones de curación a %s (añadidas a la mochila)." % hero)
		refresh_all()
		return true
	elif reward_id == "moonstone_key":
		add_inventory_item("llave_piedra_lunar", 1, "Llave de piedra lunar")
		var inv2 := get_inventory_items()
		if inv2.has("llave_piedra_lunar") and inv2["llave_piedra_lunar"] is Dictionary:
			inv2["llave_piedra_lunar"]["desc"] = "Llave tallada en piedra lunar confiada por Runara para acceder al Observatorio del Acantilado (Canon PDF p. 13)."
		if player_hud and player_hud.inventory_modal and player_hud.inventory_modal.visible:
			player_hud.inventory_modal.refresh_view()
		notify_mesa("🔑 Runara entrega la Llave de piedra lunar a %s (añadida a la mochila)." % hero)
		refresh_all()
		return true
	return false

func is_retreat_runara_revelation_active() -> bool:
	var lb := _retreat_layout_builder()
	return lb != null and lb.has_method("is_runara_revelation_active") and bool(lb.call("is_runara_revelation_active"))

func toggle_retreat_runara_revelation() -> void:
	var lb := _retreat_layout_builder()
	if lb == null or not lb.has_method("set_runara_revelation_active"):
		return
	var next_state := not is_retreat_runara_revelation_active()
	lb.call("set_runara_revelation_active", next_state)
	notify_mesa("🐉 Revelación en el Templo A5: el santuario resplandece con el aura de bronce de Runara y la llave de piedra lunar aguarda en el altar." if next_state else "🐉 Efecto de revelación dracónica en A5 desactivado.")
	refresh_all()

func toggle_enemy_revealed(enemy_id: String) -> void:
	for e in enemies:
		if e["id"] == enemy_id:
			e["revealed"] = not bool(e["revealed"])
			var tok: Node3D = tokens_by_node.get(e.get("node_name", ""), null)
			if tok:
				_apply_enemy_visibility(tok, bool(e["revealed"]))
			refresh_all()
			return

func _apply_enemy_visibility(token: Node3D, shown: bool) -> void:
	token.visible = shown
	if token.has_meta("npc_reinforcement_visible"):
		token.set_meta("npc_reinforcement_visible", shown)
		var active := shown and not bool(token.get("is_defeated"))
		token.set_physics_process(active)
		var collider: CollisionShape3D = token.get("collision")
		if collider:
			collider.set_deferred("disabled", not active)

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
	var tok := get_active_token_node()
	var anim_id := str(act.get("anim", "interact"))
	if is_instance_valid(tok):
		if anim_id == "stealth" and tok.has_method("set_stance"):
			tok.set_stance("stealth")
		elif anim_id == "sit" and tok.has_method("set_stance"):
			tok.set_stance("sit")
		elif anim_id == "prone" and tok.has_method("set_stance"):
			tok.set_stance("prone")
		elif tok.has_method("play_action_animation"):
			tok.play_action_animation(anim_id, 0.72)
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

func _find_best_nearby_interactable() -> Dictionary:
	var active_tok := get_active_token_node()
	if is_instance_valid(active_tok) and active_tok.has_method("is_resting_on_prop") and bool(active_tok.call("is_resting_on_prop")):
		var is_bed := not str(active_tok.get("resting_on")).is_empty()
		return {
			"kind": "stand",
			"node": null,
			"prompt": "[T] Levantarse de la cama" if is_bed else "[T] Levantarse del asiento"
		}
	var best_node: Node3D = null
	var best_dist := 1e9
	var candidates: Array = []
	if get_tree():
		for grp in ["interactive_doors", "interactive_props", "map_exits", "retreat_residents"]:
			for n in get_tree().get_nodes_in_group(grp):
				if n is Node3D and not candidates.has(n):
					candidates.append(n)
	if candidates.is_empty() and main_ctrl:
		for node in main_ctrl.find_children("*", "Node3D", true, false):
			if node.get("is_player_nearby") == true:
				candidates.append(node)
	for node in candidates:
		if not is_instance_valid(node):
			continue
		if node.has_method("refresh_proximity"):
			node.call("refresh_proximity")
		if node.get("is_player_nearby") != true:
			continue
		var n3 := node as Node3D
		var d := Vector2(active_tok.global_position.x - n3.global_position.x, active_tok.global_position.z - n3.global_position.z).length_squared() if is_instance_valid(active_tok) else 0.0
		if best_node == null or d < best_dist:
			best_node = n3
			best_dist = d
	if best_node != null:
		var prompt := ""
		if best_node.has_method("get_interaction_prompt"):
			prompt = str(best_node.call("get_interaction_prompt"))
		elif best_node.has_method("get_prompt_text"):
			prompt = str(best_node.call("get_prompt_text"))
		else:
			prompt = "[T] Interactuar"
		return {"kind": "node", "node": best_node, "prompt": prompt}
	if inv_mgr and "prompt_text" in inv_mgr and not str(inv_mgr.prompt_text).is_empty():
		return {"kind": "inv", "node": null, "prompt": str(inv_mgr.prompt_text)}
	return {"kind": "none", "node": null, "prompt": ""}

func _sync_nearby_interaction_prompt() -> void:
	if not player_hud:
		return
	if is_instance_valid(retreat_life) and retreat_life.has_open_dialogue():
		if _last_prompt_text != "":
			_last_prompt_text = ""
			player_hud.set_interaction_prompt("", false)
		return
	var found := _find_best_nearby_interactable()
	var p_txt: String = str(found.get("prompt", ""))
	if p_txt != _last_prompt_text:
		_last_prompt_text = p_txt
		player_hud.set_interaction_prompt(p_txt, p_txt != "")

func trigger_nearby_interaction() -> void:
	if not main_ctrl:
		return
	if is_instance_valid(retreat_life) and retreat_life.has_open_dialogue():
		retreat_life.close_conversation()
		_sync_nearby_interaction_prompt()
		return
	var active_tok := get_active_token_node()
	var found := _find_best_nearby_interactable()
	var kind: String = str(found.get("kind", "none"))
	if kind == "stand" and is_instance_valid(active_tok):
		if active_tok.has_method("stand_from_bed"):
			active_tok.stand_from_bed()
		elif active_tok.has_method("play_action_animation"):
			active_tok.play_action_animation("idle")
		var actor_n := String(active_tok.get("token_name")) if active_tok.get("token_name") != null else "Aventurero"
		notify_mesa("%s se levanta." % actor_n)
		_last_prompt_text = "__refresh__"
		_sync_nearby_interaction_prompt()
		return
	var best_node: Node3D = found.get("node", null) as Node3D
	if best_node == null:
		return
	if best_node.has_method("toggle_door"):
		best_node.toggle_door()
	elif best_node.has_method("execute_transition"):
		best_node.execute_transition()
	elif best_node.has_method("collect"):
		best_node.collect()
	elif best_node.has_method("interact"):
		best_node.interact()
	_last_prompt_text = "__refresh__"
	_sync_nearby_interaction_prompt()

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
	if get_tree():
		for listener in get_tree().get_nodes_in_group("time_of_day_listener"):
			if listener.has_method("set_time_of_day"):
				listener.set_time_of_day(t)
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
	if get_tree():
		for listener in get_tree().get_nodes_in_group("weather_listener"):
			if listener.has_method("set_weather"):
				listener.set_weather(w)
	refresh_all()

func set_env_reduced_effects(v: bool) -> void:
	_fallback_reduced = v
	if ship_env and ship_env.has_method("set_reduced_effects"):
		ship_env.set_reduced_effects(v)
	if get_tree():
		for listener in get_tree().get_nodes_in_group("weather_listener"):
			if listener.has_method("set_reduced_effects"):
				listener.set_reduced_effects(v)
	refresh_all()

func set_audio_channel_volume(channel_id: String, value_0_100: float) -> void:
	audio_volumes[channel_id] = clampf(value_0_100, 0.0, 100.0)
	if get_tree():
		for listener in get_tree().get_nodes_in_group("weather_listener"):
			if listener.has_method("set_channel_volume"):
				listener.set_channel_volume(channel_id, audio_volumes[channel_id])

func play_dm_sfx(sfx_id: String) -> void:
	if get_tree():
		for listener in get_tree().get_nodes_in_group("weather_listener"):
			if listener.has_method("play_dm_sfx"):
				listener.play_dm_sfx(sfx_id)
	notify_mesa("♪ Efecto sonoro en mesa: " + sfx_id)

func advance_clock_seconds(secs: int) -> void:
	clock_seconds += secs
	if combat_controller: combat_controller.rules.advance_time(secs)
	if is_instance_valid(retreat_life):
		retreat_life.synchronize_clock(clock_seconds)
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
	if get_tree():
		for d in get_tree().get_nodes_in_group("interactive_doors"):
			if is_instance_valid(d) and d.has_method("toggle_door") and not out.has(d):
				out.append(d)
	for d in main_ctrl.find_children("*Door*", "Node3D", true, false):
		if d.has_method("toggle_door") and not out.has(d):
			out.append(d)
	out.sort_custom(func(a, b): return str(a.name) < str(b.name))
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
