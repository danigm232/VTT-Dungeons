extends SceneTree
func _initialize() -> void:
	_run.call_deferred()
func _run() -> void:
	var destination := "res://../../output/godot-inventory-20261115/" + str(ProjectSettings.get_setting("application/config/name")).validate_filename()
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--capture-dir="): destination = arg.trim_prefix("--capture-dir=").strip_edges().trim_prefix('"').trim_suffix('"')
	DirAccess.make_dir_recursive_absolute(destination)
	var main = load("res://scenes/main.tscn").instantiate()
	root.add_child(main)
	for frame in range(20): await process_frame
	var ui = main.find_child("VttRoleUi", true, false)
	if ui == null or ui.get_script() == null or ui.player_hud == null:
		quit(1)
		return
	ui.set_role("player")
	for id in ["mia", "maria", "mike"]:
		ui.select_player_character(id)
		ui.player_hud.open_modal("inventory")
		for frame in range(12): await process_frame
		await RenderingServer.frame_post_draw
		var result := root.get_texture().get_image().save_png(destination.path_join(id + ".png"))
		print("CAPTURE ", id, " ", result, " panel=", ui.player_hud.inventory_modal.get_global_rect())
		ui.player_hud.close_modals()
	# Render actual engine textures as a contact sheet, without modifying sources.
	ui.player_root.visible = false
	var canvas := CanvasLayer.new()
	root.add_child(canvas)
	var background := ColorRect.new()
	background.color = Color("#172425")
	background.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	canvas.add_child(background)
	var sheet := GridContainer.new()
	sheet.position = Vector2(20, 20)
	sheet.columns = 8
	canvas.add_child(sheet)
	for hero in ["cleric", "rogue", "wizard"]:
		var data: Dictionary = load("res://inventory/sprite_library.gd").profile(hero)
		for frame in data.clips.backpack_take.frames:
			var texture := TextureRect.new()
			texture.texture = frame.tex
			texture.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
			texture.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
			texture.custom_minimum_size = Vector2(150, 150)
			sheet.add_child(texture)
	for frame in range(4): await process_frame
	await RenderingServer.frame_post_draw
	root.get_texture().get_image().save_png(destination.path_join("take-poses.png"))
	print("CAPTURE DONE ", destination)
	quit()
