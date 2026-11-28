class_name MainController
extends Node3D

const PlayerToken = preload("res://scripts/player_token.gd")
const TacticalCamera = preload("res://scripts/tactical_camera.gd")
const InteractiveDoor = preload("res://scripts/interactive_door.gd")
const InventoryManager = preload("res://scripts/inventory_manager.gd")
const VttRoleUi = preload("res://scripts/vtt_role_ui.gd")

@onready var camera: Camera3D = $TacticalCamera
@onready var ship_vessel: Node3D = find_child("ShipVessel")
@onready var ocean_water: MeshInstance3D = $OceanWater
@onready var reefs: Node3D = $Reefs
@onready var dragon_bones: Node3D = $DragonBones
@onready var inventory_mgr: Node = find_child("InventoryManager")

var player_token: CharacterBody3D
var rogue_token: CharacterBody3D
var wizard_token: CharacterBody3D
var harpy_token: CharacterBody3D
var zombie_token: CharacterBody3D

var party: Array[CharacterBody3D] = []
var active_party_index: int = 0
var vtt_ui: VttRoleUi
var canon_ctrl: Node
var _ui_capture_step: int = 0

var capture_timer: float = 0.5
var frame_count: int = 0
var mode: String = "normal"

func _ready() -> void:
	player_token = find_child("PlayerToken") as CharacterBody3D
	rogue_token = find_child("RogueToken") as CharacterBody3D
	wizard_token = find_child("WizardToken") as CharacterBody3D
	harpy_token = find_child("HarpyToken") as CharacterBody3D
	zombie_token = find_child("ZombieToken") as CharacterBody3D

	_spawn_canonical_pecio_creatures()

	if player_token and rogue_token and wizard_token:
		party = [player_token, rogue_token, wizard_token]
		select_party_member(0)

	var initial_role: String = "player"
	var initial_projector_ready: bool = false
	var has_audit_flag: bool = false

	var args = OS.get_cmdline_args() + OS.get_cmdline_user_args()
	for arg in args:
		if arg.begins_with("--role="):
			initial_role = arg.trim_prefix("--role=")
		elif arg == "--projector-ready":
			initial_projector_ready = true
		elif arg == "--capture-ui-roles":
			mode = "capture_ui_roles"
		elif arg.begins_with("--audit-"):
			has_audit_flag = true
		elif arg.begins_with("--capture-zone-"):
			mode = "zone_" + arg.substr(15).replace("-", "_")
		elif arg == "--capture-final-overview-before":
			mode = "final_overview_before"
		elif arg == "--capture-final-overview-after":
			mode = "final_overview_after"
		elif arg == "--capture-foundations-after":
			mode = "foundations_after"
		elif arg == "--capture-tactical-tokens":
			mode = "tactical_tokens"
		elif arg == "--capture-tactical-maria":
			mode = "tactical_maria"
		elif arg == "--capture-tactical-orbit":
			mode = "tactical_orbit"
		elif arg == "--capture-cofa-harpy":
			mode = "cofa_harpy"
		elif arg == "--capture-ship-tilt":
			mode = "ship_tilt"
		elif arg == "--capture-doors-open":
			mode = "doors_open"
		elif arg == "--capture-doors-closed":
			mode = "doors_closed"
		elif arg == "--capture-inventory-backpack":
			mode = "inventory_backpack"
		elif arg == "--capture-cofa-climb":
			mode = "cofa_climb"
		elif arg == "--capture-zone-c10-crowsnest":
			mode = "zone_c10_crowsnest"
		elif arg == "--capture-cutout-interior-tilt":
			mode = "cutout_interior_tilt"
		elif arg == "--capture-ocean-breakers":
			mode = "ocean_breakers"
		elif arg == "--capture-stairs-navigation":
			mode = "stairs_navigation"
		elif arg == "--capture-camera-overview":
			mode = "camera_overview"
		elif arg == "--capture-animations-showcase":
			mode = "animations_showcase"
		elif arg == "--capture-swim-rowboat":
			mode = "swim_rowboat"

	var enable_vtt_ui: bool = (not has_audit_flag) and (mode == "normal" or mode == "capture_ui_roles")
	vtt_ui = VttRoleUi.new()
	vtt_ui.name = "VttRoleUi"
	vtt_ui.configure_initial(initial_role, initial_projector_ready, enable_vtt_ui)
	add_child(vtt_ui)

	canon_ctrl = preload("res://scripts/pecio_canon_controller.gd").new()
	canon_ctrl.name = "PecioCanonController"
	add_child(canon_ctrl)
	if vtt_ui:
		vtt_ui.set("canon_ctrl", canon_ctrl)

	# Según el PDF (pág. 23), en partida normal nueva la arpía comienza fuera cazando
	if mode == "normal" and not has_audit_flag and DisplayServer.get_name() != "headless" and vtt_ui.world_state:
		if not FileAccess.file_exists("user://pecio-world-state.v1.cfg"):
			vtt_ui._apply_harpy_world_presence(false, false)

	setup_view_mode()

func _spawn_canonical_pecio_creatures() -> void:
	if not ship_vessel:
		return
	var tok_scene := load("res://scenes/player_token.tscn") as PackedScene
	var zombie_tex := load("res://assets/tokens/zombie-rest-v1.png") as Texture2D
	var harpy_tex := load("res://assets/tokens/harpy-rest-v1.png") as Texture2D
	if not tok_scene:
		return
	# Criaturas canónicas del PDF Cap. 3 (pp. 24-27): Zombis C4 (2 niv.1 + 1 niv.2), Gul C8, refuerzos C8 niv.2 y 2ª Arpía C2 niv.2
	var specs := [
		{"name": "ZombieC4_A",      "title": "Zombi C4 (1)",      "pos": Vector3(-19.5, 0.1, -3.4),  "tex": zombie_tex, "h": 1.92, "lvl": 1, "tint": Color(0.95, 1.0, 0.94), "codex": ""},
		{"name": "ZombieC4_B",      "title": "Zombi C4 (2)",      "pos": Vector3(-23.2, 0.1, -2.9),  "tex": zombie_tex, "h": 1.88, "lvl": 1, "tint": Color(0.90, 0.96, 0.90), "codex": ""},
		{"name": "ZombieC4_C_Lvl2", "title": "Zombi C4 (Niv.2)",  "pos": Vector3(-20.8, 0.1, -5.2),  "tex": zombie_tex, "h": 1.94, "lvl": 2, "tint": Color(0.86, 0.93, 0.88), "codex": ""},
		{"name": "GhoulToken",      "title": "Gul de la Sentina", "pos": Vector3(-17.8, -3.1, -0.4), "tex": null, "h": 1.75, "lvl": 1, "tint": Color.WHITE, "codex": ""},
		{"name": "ZombieC8_B_Lvl2", "title": "Zombi C8 (Niv.2)",  "pos": Vector3(-16.2, -3.1, 2.2),  "tex": zombie_tex, "h": 1.90, "lvl": 2, "tint": Color(0.88, 0.95, 0.90), "codex": ""},
		{"name": "ZombieC8_C_Lvl2", "title": "Zombi C8 (3)",      "pos": Vector3(-12.2, -3.1, -1.6), "tex": zombie_tex, "h": 1.92, "lvl": 2, "tint": Color(0.86, 0.92, 0.88), "codex": ""},
		{"name": "HarpyToken_C2",   "title": "Arpía C2 (Niv.2)",  "pos": Vector3(19.2, 3.05, -1.5),  "tex": harpy_tex,  "h": 1.70, "lvl": 2, "tint": Color(1.0, 0.92, 0.88), "codex": ""},
	]
	for sp in specs:
		if ship_vessel.get_node_or_null(str(sp["name"])) != null:
			continue
		var tok := tok_scene.instantiate() as CharacterBody3D
		tok.name = str(sp["name"])
		tok.position = sp["pos"]
		tok.set("token_name", str(sp["title"]))
		tok.set("token_texture", sp["tex"])
		tok.set("target_height", float(sp["h"]))
		tok.set("is_npc", true)
		tok.set("is_active_player", false)
		tok.set_meta("min_party_level", int(sp["lvl"]))
		tok.set_meta("adventure_present", int(sp["lvl"]) <= 1)
		tok.set_meta("base_spawn_pos", sp["pos"])
		if str(sp["codex"]) != "":
			tok.set_meta("needs_codex_sprites", str(sp["codex"]))
		ship_vessel.add_child(tok)
		var spr := tok.get_node_or_null("Sprite3D") as Sprite3D
		if spr:
			spr.modulate = sp["tint"]
		if int(sp["lvl"]) > 1:
			tok.visible = false
		if tok.name == "HarpyToken_C2":
			tok.set_meta("npc_reinforcement_visible", false)
			tok.set_physics_process(false)
			tok.get_node("CollisionShape3D").set_deferred("disabled", true)

func _unhandled_input(event: InputEvent) -> void:
	var Prefs = preload("res://player/player_preferences.gd")
	if Prefs.is_capturing_key():
		return
	if event is InputEventKey and event.is_pressed() and not event.is_echo() and not event.ctrl_pressed and not event.alt_pressed:
		var kc := (event as InputEventKey).keycode
		if Prefs.matches_key("party_1", kc):
			select_party_member(0)
			get_viewport().set_input_as_handled()
		elif Prefs.matches_key("party_2", kc):
			select_party_member(1)
			get_viewport().set_input_as_handled()
		elif Prefs.matches_key("party_3", kc):
			select_party_member(2)
			get_viewport().set_input_as_handled()
		elif Prefs.matches_key("party_next", kc):
			var next_idx = (active_party_index + 1) % party.size()
			select_party_member(next_idx)
			get_viewport().set_input_as_handled()

func select_party_member(idx: int) -> void:
	if idx < 0 or idx >= party.size():
		return
	active_party_index = idx
	for i in range(party.size()):
		var tok = party[i] as PlayerToken
		if tok:
			tok.set_active(i == active_party_index)
	if camera is TacticalCamera and active_party_index < party.size():
		camera.set_target_character(party[active_party_index])
	if vtt_ui:
		var role_ids := ["mia", "maria", "mike"]
		if idx >= 0 and idx < role_ids.size() and vtt_ui.selected_actor_id != role_ids[idx]:
			vtt_ui.selected_actor_id = role_ids[idx]
			vtt_ui.refresh_all()

func setup_view_mode() -> void:
	if mode != "normal" and mode != "capture_ui_roles":
		if camera is TacticalCamera:
			camera.set_process(false)
			camera.set_process_unhandled_input(false)

	if mode == "ship_tilt" or mode == "foundations_after":
		# Vista broadside canónica a 25° de elevación mostrando la escora de 10° del barco sobre los huesos de dragón
		camera.position = Vector3(0, 24, 34)
		camera.rotation_degrees = Vector3(-32, 0, 0)
		camera.fov = 42.0
	elif mode == "tactical_tokens":
		var focus = Vector3(0.5, 0.8, 1.7)
		var pitch_rad = deg_to_rad(25.0)
		var dist = 12.0
		camera.position = focus + Vector3(0.0, sin(pitch_rad) * dist, cos(pitch_rad) * dist)
		camera.look_at(focus, Vector3.UP)
		camera.fov = 34.0
		select_party_member(0)
	elif mode == "tactical_maria":
		select_party_member(1)
		var focus = Vector3(-2.0, 0.8, 2.2)
		var pitch_rad = deg_to_rad(25.0)
		var dist = 9.5
		camera.position = focus + Vector3(0.0, sin(pitch_rad) * dist, cos(pitch_rad) * dist)
		camera.look_at(focus, Vector3.UP)
		camera.fov = 32.0
	elif mode == "tactical_orbit":
		var rad_orbit = deg_to_rad(-15.0)
		var dist = 18.0
		var pitch_rad = deg_to_rad(25.0)
		camera.position = Vector3(sin(rad_orbit) * cos(pitch_rad) * dist, sin(pitch_rad) * dist + 1.2, cos(rad_orbit) * cos(pitch_rad) * dist)
		camera.look_at(Vector3(0, 1.2, 0), Vector3.UP)
		camera.fov = 38.0
		select_party_member(0)
	elif mode == "cofa_harpy":
		camera.position = Vector3(0.35, 19.5, 9.5)
		camera.look_at(Vector3(0.35, 15.2, -0.48), Vector3.UP)
		camera.fov = 36.0
	elif mode == "doors_open" or mode == "doors_closed":
		# Vista centrada en la puerta del camarote del capitán (C4)
		var door = find_child("DoorC4") as InteractiveDoor
		if door:
			door.is_open = (mode == "doors_open")
			door.update_door_state(true)
		camera.position = Vector3(-10.2, 2.8, -3.8)
		camera.look_at(Vector3(-14.0, 1.3, -1.5), Vector3.UP)
		camera.fov = 38.0
		select_party_member(1)
		if rogue_token:
			rogue_token.position = Vector3(-12.2, 0.1, -1.8)
	elif mode == "zone_c1_main":
		# Vista táctica de C1: Escotilla, bancada de cabillas, pilas de cajas y barriles
		camera.position = Vector3(0.0, 13.0, 15.5)
		camera.look_at(Vector3(0.0, 0.4, 0.0), Vector3.UP)
		camera.fov = 36.0
		select_party_member(0)
	elif mode == "zone_c2_forecastle":
		# Vista de C2: Balista naval, cañón, molinete de ancla y palo caído
		camera.position = Vector3(17.5, 9.0, 7.5)
		camera.look_at(Vector3(23.5, 3.2, 0.0), Vector3.UP)
		camera.fov = 34.0
		select_party_member(2)
	elif mode == "zone_c3_poop":
		# Vista de C3: Timón de 8 radios, bitácora de latón y farol de popa
		camera.position = Vector3(-17.0, 9.0, 6.5)
		camera.look_at(Vector3(-22.5, 3.2, 0.0), Vector3.UP)
		camera.fov = 34.0
		select_party_member(0)
	elif mode == "zone_c4_captain":
		var roof_ctrl = find_child("RoofCutout", true, false)
		if roof_ctrl:
			roof_ctrl.set_interior_mode("aft_c4_port", true)
		var door = find_child("DoorC4") as InteractiveDoor
		if door:
			door.is_open = true
			door.update_door_state(true)
		camera.position = Vector3(-13.8, 4.8, -0.5)
		camera.look_at(Vector3(-18.2, 0.6, -3.8), Vector3.UP)
		camera.fov = 38.0
		select_party_member(1)
		if rogue_token:
			rogue_token.position = Vector3(-15.5, 0.1, -3.6)
	elif mode == "zone_c5_galley":
		var roof_ctrl = find_child("RoofCutout", true, false)
		if roof_ctrl:
			roof_ctrl.set_interior_mode("aft_c5_stbd", true)
		var door = find_child("DoorC5") as InteractiveDoor
		if door:
			door.is_open = true
			door.update_door_state(true)
		camera.position = Vector3(-13.8, 4.8, 0.5)
		camera.look_at(Vector3(-18.0, 0.6, 3.8), Vector3.UP)
		camera.fov = 38.0
		select_party_member(1)
		if rogue_token:
			rogue_token.position = Vector3(-15.5, 0.1, 2.8)
	elif mode == "zone_c6_crew":
		var roof_ctrl = find_child("RoofCutout", true, false)
		if roof_ctrl:
			roof_ctrl.set_interior_mode("fore_c6_port", true)
		var door = find_child("DoorC6") as InteractiveDoor
		if door:
			door.is_open = true
			door.update_door_state(true)
		camera.position = Vector3(14.0, 4.4, -0.8)
		camera.look_at(Vector3(18.5, 0.6, -4.0), Vector3.UP)
		camera.fov = 42.0
		select_party_member(1)
		if rogue_token:
			rogue_token.position = Vector3(17.5, 0.1, -2.5)
	elif mode == "zone_c7_mess":
		var roof_ctrl = find_child("RoofCutout", true, false)
		if roof_ctrl:
			roof_ctrl.set_interior_mode("fore_c7_stbd", true)
		var door = find_child("DoorC7") as InteractiveDoor
		if door:
			door.is_open = true
			door.update_door_state(true)
		camera.position = Vector3(14.0, 4.6, 0.8)
		camera.look_at(Vector3(18.5, 0.6, 3.8), Vector3.UP)
		camera.fov = 40.0
		select_party_member(0)
		if player_token:
			player_token.position = Vector3(15.5, 0.1, 3.0)
	elif mode == "zone_c8_bilge":
		var roof_ctrl = find_child("RoofCutout", true, false)
		if roof_ctrl:
			roof_ctrl.set_interior_mode("lower_c8_bilge", true)
		select_party_member(0)
		if player_token:
			player_token.position = Vector3(2.2, -3.25, 4.5)
		camera.position = Vector3(-1.5, 5.5, 13.5)
		camera.look_at(Vector3(-4.0, -3.1, 1.0), Vector3.UP)
		camera.fov = 44.0
	elif mode == "zone_c9_hold":
		var roof_ctrl = find_child("RoofCutout", true, false)
		if roof_ctrl:
			roof_ctrl.set_interior_mode("lower_c9_hold", true)
		var ocean = find_child("OceanWater", true, false)
		if ocean: ocean.visible = false
		select_party_member(0)
		if player_token:
			player_token.position = Vector3(-15.5, -6.1, -1.8)
		camera.position = Vector3(-9.0, 2.2, 11.5)
		camera.look_at(Vector3(-17.5, -5.4, -1.5), Vector3.UP)
		camera.fov = 44.0
	elif mode == "swim_rowboat":
		select_party_member(0)
		var boat := find_child("Rowboat", true, false)
		if boat and boat.has_method("board"):
			for tok in [player_token, rogue_token, wizard_token]:
				if tok:
					tok.global_position = Vector3(2.5, -2.6, 15.6)
					boat.board(tok)
		camera.position = Vector3(3.6, 1.8, 22.8)
		camera.look_at(Vector3(2.5, -2.35, 15.6), Vector3.UP)
		camera.fov = 38.0
	elif mode == "zone_c10_crowsnest":
		# Vista de C10: Cofa a +15.2m con nido de arpía, tesoros y escala de obenques
		select_party_member(1)
		if rogue_token:
			rogue_token.position = Vector3(0.1, 15.2, -0.2)
		camera.position = Vector3(0.35, 18.2, 7.5)
		camera.look_at(Vector3(0.35, 15.2, -0.48), Vector3.UP)
		camera.fov = 38.0
	elif mode == "inventory_backpack":
		# Vista táctica mostrando la mochila abierta, la antorcha viva encendida y los objetos recogidos
		if inventory_mgr:
			inventory_mgr.toggle_torch()
			inventory_mgr.is_backpack_open = true
			if inventory_mgr.backpack_panel:
				inventory_mgr.backpack_panel.visible = true
				inventory_mgr.refresh_backpack_ui()
		var focus = Vector3(1.5, 0.8, 1.2)
		var pitch_rad = deg_to_rad(25.0)
		var dist = 10.5
		camera.position = focus + Vector3(0.0, sin(pitch_rad) * dist, cos(pitch_rad) * dist)
		camera.look_at(focus, Vector3.UP)
		camera.fov = 34.0
		select_party_member(0)
	elif mode == "cofa_climb":
		# Vista en la cofa mostrando a Maria tras subir la escala de obenques con la arpía y los tesoros
		select_party_member(1)
		if rogue_token:
			rogue_token.position = Vector3(0.1, 15.2, -0.2)
			var tok = rogue_token as PlayerToken
			if tok:
				tok.play_action_animation("idle")
		camera.position = Vector3(0.35, 18.2, 7.5)
		camera.look_at(Vector3(0.35, 15.2, -0.48), Vector3.UP)
		camera.fov = 36.0
	elif mode == "cutout_interior_tilt":
		# Demostración del recorte cenital dinámico y cambio de inclinación cenital a 14.0° canónicos
		var roof_ctrl = find_child("RoofCutout", true, false)
		if roof_ctrl:
			roof_ctrl.set_interior_mode("aft_c4_port", true)
		select_party_member(1)
		if rogue_token:
			rogue_token.position = Vector3(-15.6, 0.1, -3.8)
		var focus = Vector3(-17.0, 0.75, -3.8)
		var pitch_rad = deg_to_rad(14.0) # Inclinación interior de 14.0° canónicos
		var dist = 5.2
		camera.position = focus + Vector3(0.0, sin(pitch_rad) * dist, cos(pitch_rad) * dist)
		camera.look_at(focus, Vector3.UP)
		camera.fov = 40.0
		if inventory_mgr:
			inventory_mgr.show_prompt("[T] Examinar Carta Náutica de la Costa de la Espada")
	elif mode == "ocean_breakers":
		# Vista del rompiente de olas, espuma de contacto dinámica contra el arrecife de basalto, casco y bote
		var focus = Vector3(-18.0, -1.8, 12.0)
		var pitch_rad = deg_to_rad(22.0)
		var dist = 22.0
		camera.position = focus + Vector3(4.0, sin(pitch_rad) * dist, cos(pitch_rad) * dist)
		camera.look_at(focus, Vector3.UP)
		camera.fov = 40.0
	elif mode == "stairs_navigation":
		# Vista táctica enfocando las escaleras habilitadas de proa con glifos interactivos y token subiendo
		select_party_member(0)
		if player_token:
			player_token.position = Vector3(11.8, 1.6, 3.5) # A mitad de escalera ascendiendo
		var focus = Vector3(12.0, 1.8, 3.5)
		var pitch_rad = deg_to_rad(24.0)
		var dist = 11.5
		camera.position = focus + Vector3(0.0, sin(pitch_rad) * dist, cos(pitch_rad) * dist)
		camera.look_at(focus, Vector3.UP)
		camera.fov = 36.0
	elif mode == "camera_overview":
		if camera is TacticalCamera:
			var tc := camera as TacticalCamera
			tc.set_overview_mode(true)
			tc.focus_point = tc.target_focus
			tc.current_distance = tc.target_distance
			tc.current_pitch = tc.target_pitch
			tc.current_yaw = tc.target_yaw
			tc.update_camera_transform()
	elif mode == "animations_showcase":
		# Escaparate directo de los 3 héroes con recortes alfa, rumbos 8-dir y poses de acción
		if player_token is PlayerToken:
			var cl := player_token as PlayerToken
			cl.position = Vector3(-1.4, 0.1, 1.8)
			cl.facing_dir = "se"
			cl.play_action_animation("attack", 2.0)
		if rogue_token is PlayerToken:
			var mg := rogue_token as PlayerToken
			mg.position = Vector3(0.4, 0.1, 2.2)
			mg.facing_dir = "sw"
			mg.play_action_animation("attack", 2.0)
		if wizard_token is PlayerToken:
			var wz := wizard_token as PlayerToken
			wz.position = Vector3(2.2, 0.1, 1.5)
			wz.play_action_animation("sit")
		select_party_member(1)
		var focus := Vector3(0.4, 0.9, 1.8)
		var pitch_rad := deg_to_rad(24.0)
		var dist := 7.2
		camera.position = focus + Vector3(0.0, sin(pitch_rad) * dist, cos(pitch_rad) * dist)
		camera.look_at(focus, Vector3.UP)
		camera.fov = 34.0

func _hide_all_meshes_except(node: Node, whitelist: Array) -> void:
	var keep = false
	for w in whitelist:
		if w in node.name:
			keep = true
			break
	if node is VisualInstance3D and not keep:
		# Comprobamos ancestros
		var p = node.get_parent()
		var parent_keep = false
		while p:
			for w in whitelist:
				if w in p.name:
					parent_keep = true
					break
			if parent_keep: break
			p = p.get_parent()
		if not parent_keep:
			node.visible = false
	for child in node.get_children():
		_hide_all_meshes_except(child, whitelist)

func _debug_print_tree(node: Node, indent: String) -> void:
	if node is MeshInstance3D:
		print("TREE: ", indent, node.name, " pos=", node.global_position, " vis=", node.visible)
	for child in node.get_children():
		_debug_print_tree(child, indent + "  ")

func _process(delta: float) -> void:
	if mode == "capture_ui_roles":
		_step_ui_roles_capture()
		return
	if mode != "normal":
		capture_timer -= delta
		frame_count += 1
		if capture_timer <= 0.0 and frame_count >= 18:
			var img = get_viewport().get_texture().get_image()
			var filename = ""
			if mode == "tactical_tokens":
				filename = "res://../../output/godot-pecio-foundations/tokens-tactical-after.png"
			elif mode == "tactical_maria":
				filename = "res://../../output/godot-pecio-foundations/tokens-maria-active.png"
			elif mode == "tactical_orbit":
				filename = "res://../../output/godot-pecio-foundations/camera-orbit-step.png"
			elif mode == "cofa_harpy":
				filename = "res://../../output/godot-pecio-foundations/cofa-harpy.png"
			elif mode == "ship_tilt" or mode == "foundations_after":
				filename = "res://../../output/godot-pecio-foundations/foundations-after.png"
			elif mode == "doors_open":
				filename = "res://../../output/godot-pecio-foundations/doors-open.png"
			elif mode == "doors_closed":
				filename = "res://../../output/godot-pecio-foundations/doors-closed.png"
			elif mode == "inventory_backpack":
				filename = "res://../../output/godot-pecio-foundations/inventory-backpack.png"
			elif mode == "cofa_climb":
				filename = "res://../../output/godot-pecio-foundations/cofa-climb.png"
			elif mode == "zone_c1_main":
				filename = "res://../../output/godot-pecio-foundations/zone-c1-main.png"
			elif mode == "zone_c2_forecastle":
				filename = "res://../../output/godot-pecio-foundations/zone-c2-forecastle.png"
			elif mode == "zone_c3_poop":
				filename = "res://../../output/godot-pecio-foundations/zone-c3-poop.png"
			elif mode == "zone_c4_captain":
				filename = "res://../../output/godot-pecio-foundations/zone-c4-captain.png"
			elif mode == "zone_c5_galley":
				filename = "res://../../output/godot-pecio-foundations/zone-c5-galley.png"
			elif mode == "zone_c6_crew":
				filename = "res://../../output/godot-pecio-foundations/zone-c6-crew.png"
			elif mode == "zone_c7_mess":
				filename = "res://../../output/godot-pecio-foundations/zone-c7-mess.png"
			elif mode == "zone_c8_bilge":
				filename = "res://../../output/godot-pecio-foundations/zone-c8-bilge.png"
			elif mode == "zone_c9_hold":
				filename = "res://../../output/godot-pecio-foundations/zone-c9-hold.png"
			elif mode == "zone_c10_crowsnest":
				filename = "res://../../output/godot-pecio-foundations/zone-c10-crowsnest.png"
			elif mode == "cutout_interior_tilt":
				filename = "res://../../output/godot-pecio-foundations/cutout-interior-tilt.png"
			elif mode == "ocean_breakers":
				filename = "res://../../output/godot-pecio-foundations/ocean-breakers.png"
			elif mode == "stairs_navigation":
				filename = "res://../../output/godot-pecio-foundations/stairs-navigation.png"
			elif mode == "camera_overview":
				filename = "res://../../output/godot-pecio-foundations/camera-overview-parity.png"
			elif mode == "animations_showcase":
				filename = "res://../../output/godot-pecio-foundations/player-animations-showcase.png"
			elif mode == "swim_rowboat":
				filename = "res://../../output/godot-pecio-foundations/swim-rowboat.png"

			if filename != "":
				var global_path = ProjectSettings.globalize_path(filename)
				img.save_png(global_path)
				print("CAPTURADA_IMAGEN_AAA: ", global_path)
			get_tree().quit(0)

func _step_ui_roles_capture() -> void:
	frame_count += 1
	var out_dir := ProjectSettings.globalize_path("res://../../docs/evidence/captures/pecio-godot-20261114")
	DirAccess.make_dir_recursive_absolute(out_dir)

	if frame_count == 18:
		vtt_ui.set_role("player")
	elif frame_count == 26:
		var img := get_viewport().get_texture().get_image()
		var p := out_dir.path_join("ui-player.png")
		img.save_png(p)
		print("CAPTURADA_UI_ROL: ", p)
		vtt_ui.set_role("dm")
	elif frame_count == 34:
		var img := get_viewport().get_texture().get_image()
		var p := out_dir.path_join("ui-dm.png")
		img.save_png(p)
		print("CAPTURADA_UI_ROL: ", p)
		vtt_ui.projector_ready = false
		vtt_ui.set_role("projector")
	elif frame_count == 42:
		var img := get_viewport().get_texture().get_image()
		var p := out_dir.path_join("ui-projector-prepare.png")
		img.save_png(p)
		print("CAPTURADA_UI_ROL: ", p)
		vtt_ui.dismiss_projector_prepare()
		vtt_ui.start_combat()
	elif frame_count == 50:
		var img := get_viewport().get_texture().get_image()
		var p := out_dir.path_join("ui-projector.png")
		img.save_png(p)
		print("CAPTURADA_UI_ROL: ", p)
		get_tree().quit(0)
