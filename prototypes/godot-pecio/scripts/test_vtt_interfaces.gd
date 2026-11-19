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

	# Control DM de mapas de campaña y traslado de jugadores a cualquier zona/punto
	var camp_maps: Array = ui.get_campaign_maps()
	check(camp_maps.size() == 10 and ui.get_current_map_id() == "pecio_main", "DM lists all 10 campaign maps (Pecio + Retiro + 5 Campamentos) and detects pecio_main")
	ui.dm_hud._active_map_tab = "scene"
	ui.dm_hud._rebuild_map_pop()
	await process_frame
	check(ui.dm_hud.map_tools_pop_body.find_child("DmMapBtn_retiro_pleamar", true, false) != null, "DM Escena/Zona exposes cross-project Retiro map buttons")
	check(ui.dm_hud.map_tools_pop_body.find_child("DmMapBtn_camp-coastal-refuge", true, false) != null, "DM Escena/Zona exposes cross-project Campamentos map buttons")
	check(ui.dm_hud.map_tools_pop_body.find_child("DmZoneWarpBtn_c4", true, false) != null, "DM Escena/Zona exposes zone warp buttons")
	var dry_cross: Dictionary = ui.dm_change_map("retiro_pleamar", true)
	check(dry_cross.get("ok", false) and dry_cross.get("mode", "") == "cross_project" and DirAccess.dir_exists_absolute(str(dry_cross.get("project_dir", ""))), "DM cross-project map change resolves sibling godot-retiro and --scene arg")
	var dry_camp: Dictionary = ui.dm_change_map("camp-coastal-refuge", true)
	check(dry_camp.get("ok", false) and dry_camp.get("mode", "") == "cross_project" and "--camp=camp-coastal-refuge" in dry_camp.get("args", []), "DM cross-project map change resolves sibling godot-campamentos and --camp arg")

	var orig_mia: Vector3 = main.player_token.global_position
	var orig_maria: Vector3 = main.rogue_token.global_position
	var moved_c4: int = ui.teleport_party_to_zone("c4")
	check(moved_c4 == 3 and roof.current_interior_state == "aft_c4_port", "DM teleport_party_to_zone(c4) moves all 3 tokens and opens C4 cutout")
	check(main.player_token.global_position.x < -14.0 and main.player_token.global_position.y > -0.5 and main.player_token.global_position.y < 2.5, "Mia lands cleanly inside C4 cabin elevation")
	check(main.rogue_token.global_position.x < -14.0 and main.rogue_token.global_position.distance_to(main.player_token.global_position) > 0.5, "Trinity follows in formation near Mia inside C4")

	ui.map_interaction._undo_place()
	check(main.player_token.global_position.distance_to(orig_mia) < 0.05 and main.rogue_token.global_position.distance_to(orig_maria) < 0.05, "Ctrl+Z batch undo restores entire party positions")

	var moved_c10: bool = ui.teleport_actor_to_zone("mia", "c10")
	check(moved_c10 and main.player_token.global_position.y > 14.0, "DM teleport_actor_to_zone(mia, c10) places Mia on C10 crow's nest")
	ui.map_interaction._undo_place()

	ui.map_interaction.anchor = Vector3(2.0, 0.2, 1.0)
	ui.map_interaction._open_menu(Vector2(300, 300))
	var has_bring_one := false
	var has_bring_all := false
	for idx in range(ui.map_interaction.menu.item_count):
		var item_txt: String = str(ui.map_interaction.menu.get_item_text(idx))
		if item_txt.begins_with("Traer a ") and item_txt.ends_with("aquí"):
			has_bring_one = true
		elif item_txt == "Traer todo el grupo aquí":
			has_bring_all = true
	ui.map_interaction.menu.hide()
	check(has_bring_one and has_bring_all, "DM right-click menu offers direct bring-player and bring-party options without preselection")
	ui.focus_zone("exterior")

	ui.toggle_enemy_revealed("harpy")
	check(harpy_tok.visible == false, "DM hides HarpyToken on table")
	ui.toggle_enemy_revealed("harpy")
	check(harpy_tok.visible == true, "DM reveals HarpyToken on table")

	var first_req_id: String = ui.dm_requests[0]["id"]
	ui.resolve_dm_request(first_req_id, true)
	check(ui.dm_requests.size() == req_before, "DM resolves request cleanly")

	# Combate en DM
	ui.start_combat()
	check(ui.combat_controller.dialog.visible and not ui.combat_active,"DM selects participants before physical initiative")
	ui.combat_controller.rules.start(["mia","maria","mike","harpy"])
	check(ui.combat_controller.rules.initiative_pending,"all initiative values remain pending")
	for entry in [["mia",18],["maria",15],["mike",11],["harpy",7]]: ui.combat_controller.rules.submit_initiative(entry[0],entry[1])
	ui.combat_controller.dialog.hide()
	check(ui.combat_active and ui.combat_order.size()==4,"initiative is ordered only after all physical totals")
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

	ui.set_role("dm")
	ui.end_combat()
	ui.set_role("projector")
	check(not ui.combat_active and not ui.projector_hud.combat_banner.visible, "Projector combat banner hides when combat ends")

	# Volver a DM restaura grid si grid_enabled == true
	ui.set_role("dm")
	await process_frame
	check(tgrid.visible, "Returning from Projector to DM restores TacticalGrid")

	print("VTT INTERFACES TESTS: ", passed, " PASS / ", failures.size(), " FAIL")
	main.free()
	quit(0 if failures.is_empty() else 1)

