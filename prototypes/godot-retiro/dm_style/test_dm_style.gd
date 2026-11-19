extends SceneTree
const Palette = preload("res://dm_style/palette.gd")
var passed := 0
var failures: Array[String] = []
func _initialize() -> void: _run.call_deferred()
func check(ok: bool, message: String) -> void:
	if ok: passed += 1
	else: failures.append(message); printerr("FAIL ", message)
func settle() -> void:
	for frame in range(5): await process_frame
func _run() -> void:
	var scene := "res://scenes/main.tscn" if FileAccess.file_exists("res://scenes/main.tscn") else "res://scenes/camp_a1_rooms.tscn"
	var packed = load(scene)
	if packed == null: quit(1); return
	var main = packed.instantiate()
	root.add_child(main)
	await settle()
	var ui = main.find_child("VttRoleUi", true, false)
	if ui == null or ui.get_script() == null or ui.dm_hud == null: quit(1); return
	ui.set_role("player"); await settle()
	var player_color: Color = ui.player_hud.identity_btn.get_theme_color("font_color")
	var shared := ui.role_switcher_panel.get_child(0).get_child(0) as Button
	var original_style: StyleBox = shared.get_theme_stylebox("normal")
	ui.set_role("dm"); await settle()
	var hud = ui.dm_hud
	check(Palette.IDS.size() == 3, "Three real visual directions available")
	check(hud.win_combat.get_parent() == hud.win_exploration.get_parent(), "Narrative and combat share the left column")
	check(hud.win_players.get_parent() == hud.win_encounter.get_parent(), "Players and NPC share the right column")
	var tools = hud.root.find_child("CombatDmTools", true, false)
	check(tools != null and tools.get_child_count() >= 8, "All original combat tools retained")
	var shelf = hud.root.find_child("DmCombatToolShelf", true, false)
	check(shelf != null and not shelf.visible, "Secondary combat controls folded by default")
	hud.root.find_child("DmCombatToolsToggle", true, false).pressed.emit()
	check(shelf.visible, "Combat controls expand through real button")
	hud.root.find_child("DmCombatToolsToggle", true, false).pressed.emit()
	for actor in ui.actors:
		var portrait = hud.players_list_box.find_child("DmActorPortrait_" + str(actor.id), true, false)
		check(portrait != null and portrait.texture != null, "Live RPG portrait for " + str(actor.id))
		check(portrait.size.x >= 40 and portrait.size.y >= 40, "Portrait retains visible layout size")
		var health = hud.players_list_box.find_child("DmHealth_" + str(actor.id), true, false)
		check(health != null and is_equal_approx(health.value, 100.0 * float(actor.hp) / actor.hp_max), "Health bar follows canonical actor data")
	var original_hp: int = ui.actors[0].hp
	var stable_card = hud.players_list_box.find_child("DmActorCard_mia", true, false)
	ui.refresh_all(); await settle()
	check(is_instance_valid(stable_card) and stable_card == hud.players_list_box.find_child("DmActorCard_mia", true, false), "Clock/status refresh preserves the same rendered portraits")
	var card = hud.players_list_box.find_child("DmActorCard_mia", true, false)
	for button in card.find_children("*", "Button", true, false):
		if button.text == "-1": button.pressed.emit(); break
	await settle()
	check(ui.actors[0].hp == original_hp - 1, "Restyled damage button retains original action")
	ui.apply_hp_delta("mia", 1); await settle()
	check(ui.actors[0].hp == original_hp, "Health restored through existing controller")
	for id in Palette.IDS:
		hud.appearance.select_style(id, false); await settle()
		check(hud.win_players.get_theme_stylebox("panel") is StyleBoxFlat and hud.win_players.has_node("_DmEngraving"), id + " combines stable panel background and RPG engraving")
		check(hud.win_players.get_meta("dm_skin") == id, id + " applies to actual DM window")
		hud.drawer_open = true; hud.drawer_tab = "settings"; hud._rebuild_drawer(); await settle()
		check(hud.drawer_panel.get_index() > hud.map_tools_bar.get_parent().get_index(), "Style drawer displays above scene controls")
		for candidate in Palette.IDS: check(hud.drawer_body.find_child("DmStyle_" + candidate, true, false) != null, "Style choice button: " + candidate)
		hud.drawer_tab = "climate"; hud._rebuild_drawer(); await settle()
		check(hud.clock_readout_lbl != null and hud.clock_readout_lbl.text.begins_with("Día"), "Climate clock remains present")
		check(not hud.drawer_panel.find_children("*", "Button", true, false).is_empty(), "Climate controls remain interactive")
		ui.set_role("player"); await settle()
		check(ui.player_hud.identity_btn.get_theme_color("font_color").is_equal_approx(player_color), "DM palette never recolours player HUD")
		check(not shared.has_meta("dm_skin"), "Shared role controls restored on leaving DM")
		check(not ui.combat_controller.dialog.has_node("_DmEngraving"), "DM ornaments removed from shared player combat dialogs")
		check(ui.role_buttons.player.get_theme_stylebox("normal").border_color.is_equal_approx(ui.ThemeKit.COL_GOLD_BRIGHT), "Player role stays highlighted after theme restoration")
		check(shared.get_theme_stylebox("normal") is StyleBoxFlat, "Original shared control material restored")
		ui.set_role("dm"); await settle()
	hud.appearance.select_style("obsidian", true); await settle()
	var preferences := ConfigFile.new(); preferences.load("user://dm-appearance.cfg")
	check(preferences.get_value("appearance", "style", "") == "obsidian", "Style preference persists locally")
	hud.appearance.select_style("invalid", false)
	check(hud.appearance.style_id == "obsidian", "Unknown style never breaks the console")
	hud.drawer_open = false; hud._rebuild_drawer()
	for preset in ["balanced", "story", "combat", "overview"]:
		hud.apply_layout_preset(preset); await settle()
		check(not hud.root.find_child("DmBottomDock", true, false).get_children().is_empty(), "Dock remains usable in " + preset)
	print("DM STYLE ", passed, " PASS / ", failures.size(), " FAIL")
	main.queue_free(); await process_frame
	quit(0 if failures.is_empty() else 1)
