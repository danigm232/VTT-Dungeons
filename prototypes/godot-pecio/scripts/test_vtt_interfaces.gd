extends SceneTree

var passed: int = 0
var failures: Array[String] = []

func _initialize() -> void:
	_run.call_deferred()

func check(condition: bool, message: String) -> void:
	if condition:
		passed += 1
	else:
		failures.append(message)
		printerr("FAIL ", message)

func _run() -> void:
	var main := load("res://scenes/main.tscn").instantiate() as Node3D
	root.add_child(main)
	await process_frame
	await process_frame
	await process_frame

	var ui := main.find_child("VttRoleUi", true, false)
	check(ui != null, "VttRoleUi attached to Main scene")
	if ui == null:
		quit(1)
		return

	var env := main.find_child("ShipEnvironment", true, false)
	var roof := main.find_child("RoofCutout", true, false)
	var tgrid := main.find_child("TacticalGrid", true, false) as Node3D
	var harpy_tok := main.find_child("HarpyToken", true, false) as Node3D

	# --- 1. INTERFAZ JUGADOR ---
	ui.set_role("player")
	await process_frame
	check(ui.player_root.visible and not ui.dm_root.visible and not ui.projector_root.visible, "Player role toggles visibility correctly")

	ui.select_player_character("maria")
	check(main.active_party_index == 1 and main.rogue_token.is_active_player and not main.player_token.is_active_player, "Player chooser switches to Trinity (RogueToken)")
	check(ui.player_hud.identity_btn.text.begins_with("Trinity"), "Identity button reflects Trinity")

	ui.select_player_character("mike")
	check(main.active_party_index == 2 and main.wizard_token.is_active_player, "Player chooser switches to Mike (WizardToken)")

	ui.select_player_character("mia")
	check(main.active_party_index == 0 and main.player_token.is_active_player, "Player chooser switches back to Mia (PlayerToken)")

	ui.apply_hp_delta("mia", -4)
	check(ui.get_active_actor()["hp"] == 7, "HP damage reduces Mia HP from 11 to 7")
	ui.apply_hp_delta("mia", 2)
	check(ui.get_active_actor()["hp"] == 9, "HP healing raises Mia HP from 7 to 9")
	ui.apply_hp_delta("mia", 50)
	check(ui.get_active_actor()["hp"] == 11, "HP healing clamps to max HP (11)")

	for m in ["sheet", "inventory", "hp", "settings", "join"]:
		ui.player_hud.open_modal(m)
		check(ui.player_hud.modal_backdrop.visible, "Player modal opens: " + m)
	ui.player_hud.close_modals()
	check(not ui.player_hud.modal_backdrop.visible, "Player modals close cleanly")

	# Joystick virtual
	ui.player_hud.joystick.set_programmatic_vector(Vector2(0.8, -0.6))
	check(main.player_token.input_override.length() > 0.5, "Virtual joystick writes input_override on active player token")
	ui.player_hud.joystick.reset_stick()
	check(main.player_token.input_override.length() < 0.01, "Resetting joystick clears input_override")

	var req_before: int = ui.dm_requests.size()
	ui.perform_player_exploration_action({"label": "Buscar pistas", "detail": "Percepción CD 12", "anim": "interact"})
	check(ui.dm_requests.size() == req_before + 1, "Exploration action creates DM request")

	# --- 2. INTERFAZ DM ---
	ui.set_role("dm")
	await process_frame
	check(ui.dm_root.visible and not ui.player_root.visible and not ui.projector_root.visible, "DM role toggles visibility correctly")
	check(ui.dm_hud.exp_zone_lbl != null and ui.dm_hud.players_list_box != null and ui.dm_hud.players_list_box.get_child_count() == 3, "DM workspace windows populated cleanly")
	ui.dm_hud._active_map_tab = "camera"
	ui.dm_hud._rebuild_map_pop()
	await process_frame
	var cam = ui.camera
	cam.set_process(false)
	for button in ui.dm_hud.map_tools_pop_body.find_children("*","Button",true,false):
		if button.text == "↓ F":
			cam.target_pitch = 15
			button.button_down.emit(); button.button_up.emit()
			check(is_equal_approx(cam.target_pitch,10),"DM down button lowers tilt")
		elif button.text == "↑ R":
			cam.target_pitch = 15
			button.button_down.emit(); cam._advance_tilt_hold(437); button.button_up.emit()
			check(is_equal_approx(cam.target_pitch,17.57),"DM up button holds continuous tilt")
		elif button.text == "Fija":
			button.pressed.emit()
			check(not cam.is_following,"fixed camera button")
		elif button.text == "Por zonas":
			button.pressed.emit()
			check(cam.follow_mode=="semiFixed","zone camera button")
		elif button.text == "Seguir":
			button.pressed.emit()
			check(cam.is_following,"follow camera button")
	for toggle in ui.dm_hud.map_tools_pop_body.find_children("*","CheckButton",true,false):
		if toggle.text == "Compartir cámara con la mesa":
			toggle.button_pressed = true
			check(cam.share_camera,"share camera checkbox")
			toggle.button_pressed = false
	cam.set_process(true)

	ui.set_env_time("night")
	ui.set_env_weather("storm")
	ui.set_env_reduced_effects(true)
	check(env.time_of_day == "night" and env.weather == "storm" and env.reduced_effects == true, "DM climate controls drive ShipEnvironment live")

	var prev_clock: int = ui.clock_seconds
	ui.advance_clock_seconds(3600)
	check(ui.clock_seconds == prev_clock + 3600, "DM short rest advances campaign clock +1 hour")

	ui.focus_zone("c4")
	check(roof.current_interior_state == "aft_c4_port", "DM zone focus C4 triggers aft_c4_port cutout")
	ui.focus_zone("exterior")
	check(roof.current_interior_state == "exterior", "DM exterior reset restores exterior cutout")

	ui.toggle_enemy_revealed("harpy")
	check(harpy_tok.visible == false, "DM hides HarpyToken on table")
	ui.toggle_enemy_revealed("harpy")
	check(harpy_tok.visible == true, "DM reveals HarpyToken on table")

	var first_req_id: String = ui.dm_requests[0]["id"]
	ui.resolve_dm_request(first_req_id, true)
	check(ui.dm_requests.size() == req_before, "DM resolves request cleanly")

	# Combate en DM
	ui.start_combat()
	check(ui.combat_active and ui.combat_order.size() >= 4, "DM start_combat rolls initiative for party and revealed enemies")
	ui.next_combat_turn()
	check(ui.combat_turn_idx == 1, "DM next_combat_turn advances initiative pointer")

	# --- 3. INTERFAZ PROYECTOR ---
	ui.projector_ready = false
	ui.set_role("projector")
	await process_frame
	check(ui.projector_root.visible and not ui.dm_root.visible and not ui.player_root.visible, "Projector role toggles visibility correctly")
	check(ui.projector_hud.prepare_overlay.visible, "Projector prepare screen '#prepare' shown initially")
	ui.dismiss_projector_prepare()
	check(not ui.projector_hud.prepare_overlay.visible, "Clicking Entrar al Proyector hides prepare overlay")

	# Verificar ocultación estricta de cuadrícula y anillo en Proyector
	check(not tgrid.visible, "Projector hides TacticalGrid strictly")
	check(not main.player_token.selection_ring.visible, "Projector hides active player selection ring")
	check(ui.projector_hud.combat_banner.visible, "Projector combat banner visible during active combat")

	ui.end_combat()
	check(not ui.combat_active and not ui.projector_hud.combat_banner.visible, "Projector combat banner hides when combat ends")

	# Volver a DM restaura grid si grid_enabled == true
	ui.set_role("dm")
	await process_frame
	check(tgrid.visible, "Returning from Projector to DM restores TacticalGrid")

	print("VTT INTERFACES TESTS: ", passed, " PASS / ", failures.size(), " FAIL")
	main.free()
	quit(0 if failures.is_empty() else 1)
