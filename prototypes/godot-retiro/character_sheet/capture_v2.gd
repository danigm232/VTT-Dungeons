extends SceneTree
func _initialize() -> void: _run.call_deferred()
func shot(file: String) -> void:
	await create_timer(.6).timeout
	for i in range(6): await process_frame
	await RenderingServer.frame_post_draw
	root.get_texture().get_image().save_png(ProjectSettings.globalize_path("res://../../output/godot-character-sheet-v2-20261116/").path_join(file))
func _run() -> void:
	root.size=Vector2i(1600,900); root.content_scale_size=Vector2i(1600,900)
	var scene="res://scenes/main.tscn" if FileAccess.file_exists("res://scenes/main.tscn") else "res://scenes/camp_a1_rooms.tscn"
	var main=load(scene).instantiate(); root.add_child(main)
	for i in range(16): await process_frame
	var ui=main.find_child("VttRoleUi",true,false); ui.set_role("player"); ui.clock_running=false; ui.clock_seconds=43200; ui.set_env_time("day"); ui.set_env_weather("clear")
	var panel=ui.player_hud.sheet_modal
	for id in ["mia","maria","mike"]:
		ui.selected_actor_id=id; ui.refresh_all(); ui.player_hud.open_modal("sheet")
		await shot(id+".png")
	ui.selected_actor_id="mia"; ui.refresh_all(); ui.player_hud.open_modal("inventory"); await shot("backpack.png")
	panel.select_tab("summary"); await shot("backpack-to-summary.png")
	for tab in ["combat","spells","history","edit"]:
		panel.select_tab(tab); await shot(tab+".png")
	panel.select_tab("summary"); root.size=Vector2i(1280,720); root.content_scale_size=Vector2i(1280,720); await shot("compact.png")
	root.size=Vector2i(1920,1080); root.content_scale_size=Vector2i(1920,1080); await shot("wide.png")
	root.size=Vector2i(1600,900); root.content_scale_size=Vector2i(1600,900); ui.player_hud.close_modals(); ui.set_role("dm"); ui.selected_actor_id="maria"; ui.player_hud.open_modal("sheet"); await shot("dm.png")
	print("CHARACTER SHEET V2 CAPTURE DONE"); quit()
