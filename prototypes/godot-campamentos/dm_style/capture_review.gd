extends SceneTree
func _initialize() -> void:
	_run.call_deferred()
func shot(destination: String) -> void:
	await create_timer(0.6).timeout
	for frame in range(8): await process_frame
	await RenderingServer.frame_post_draw
	var ui = root.find_child("VttRoleUi", true, false)
	var layout: Array = []
	if ui and ui.dm_hud:
		for control in ui.dm_hud.root.find_children("*", "Control", true, false):
			if control is TextureRect and str(control.name).begins_with("DmActorPortrait") or control is Label and (control.text in ["Mia", "Trinity", "Mike"] or control == ui.dm_hud.exp_zone_lbl):
				layout.append({"name":str(control.name),"text":control.text if control is Label else "portrait", "rect":str(control.get_global_rect()), "visible":control.is_visible_in_tree(), "modulate":str(control.modulate), "color":str(control.get_theme_color("font_color")), "parent":str(control.get_parent().get_path())})
		var file := FileAccess.open(destination + ".layout.json", FileAccess.WRITE)
		file.store_string(JSON.stringify(layout, "\t")); file.close()
	var status := root.get_texture().get_image().save_png(destination)
	print("DM CAPTURE ", destination, " status=", status)
func _run() -> void:
	var before := "--before" in OS.get_cmdline_user_args()
	var project: String = ProjectSettings.globalize_path("res://").trim_suffix("/").get_file().trim_prefix("godot-")
	var destination := ProjectSettings.globalize_path("res://../../output/godot-dm-style-20261115/" + project)
	DirAccess.make_dir_recursive_absolute(destination)
	var scene := "res://scenes/main.tscn" if FileAccess.file_exists("res://scenes/main.tscn") else "res://scenes/camp_a1_rooms.tscn"
	var packed = load(scene)
	if packed == null: quit(1); return
	var main = packed.instantiate()
	root.add_child(main)
	for frame in range(12): await process_frame
	var ui = main.find_child("VttRoleUi", true, false)
	if ui == null or ui.get_script() == null or ui.dm_hud == null:
		quit(1)
		return
	ui.set_role("dm")
	ui.clock_running = false
	ui.clock_seconds = 43200
	ui.set_env_time("day")
	ui.set_env_weather("clear")
	ui.refresh_all()
	var hud = ui.dm_hud
	if before:
		await shot(destination.path_join("before.png"))
		hud.drawer_tab = "climate"
		hud.drawer_open = true
		hud._rebuild_drawer()
		await shot(destination.path_join("before-climate.png"))
	else:
		for id in ["obsidian", "parchment", "astral"]:
			hud.appearance.select_style(id, false)
			hud.drawer_open = false
			hud._rebuild_drawer()
			await shot(destination.path_join(id + ".png"))
			hud.drawer_tab = "climate"
			hud.drawer_open = true
			hud._rebuild_drawer()
			await shot(destination.path_join(id + "-climate.png"))
			if "--debug-obsidian" in OS.get_cmdline_user_args(): quit(); return
		hud.drawer_tab = "settings"
		hud._rebuild_drawer()
		await shot(destination.path_join("style-picker.png"))
		hud.appearance.select_style("obsidian", false)
		hud.drawer_open = false; hud._rebuild_drawer()
		root.content_scale_size = Vector2i(1280, 720)
		root.size = Vector2i(1280, 720)
		await shot(destination.path_join("obsidian-compact.png"))
	print("DM CAPTURE DONE")
	quit()
