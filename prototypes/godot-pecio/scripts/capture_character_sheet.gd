extends SceneTree
func _initialize() -> void: _run.call_deferred()
func _run() -> void:
	root.size=Vector2i(1600,1000); root.content_scale_size=Vector2i(1600,1000)
	var main=load("res://scenes/main.tscn").instantiate(); root.add_child(main)
	for i in range(16): await process_frame
	var ui=main.find_child("VttRoleUi",true,false)
	ui.set_role("player"); ui.clock_running=false; ui.clock_seconds=43200
	ui.set_env_time("day"); ui.set_env_weather("clear"); ui.refresh_all()
	var before="--before" in OS.get_cmdline_user_args()
	var destination=ProjectSettings.globalize_path("res://../../output/godot-character-sheet-20261116")
	for id in (["mia"] if before else ["mia","maria","mike"]):
		ui.selected_actor_id=id; ui.refresh_all(); ui.player_hud.open_modal("sheet")
		await create_timer(1.2).timeout
		for i in range(8): await process_frame
		await RenderingServer.frame_post_draw
		root.get_texture().get_image().save_png(destination.path_join(("before" if before else id)+".png"))
	if not before:
		ui.selected_actor_id="mia"; ui.refresh_all(); ui.player_hud.open_modal("sheet")
		var panel=ui.player_hud.sheet_modal
		for tab in ["combat","spells","history","edit"]:
			panel.select_tab(tab); await create_timer(.6).timeout
			await RenderingServer.frame_post_draw
			root.get_texture().get_image().save_png(destination.path_join("mia-"+tab+".png"))
		panel.select_tab("summary"); await create_timer(.5).timeout
		panel.show_action(ui.combat_controller.rules.action_for("mia","mace"))
		await create_timer(.6).timeout; await RenderingServer.frame_post_draw
		root.get_texture().get_image().save_png(destination.path_join("action-detail.png"))
		panel.detail.hide(); root.size=Vector2i(1280,720); root.content_scale_size=Vector2i(1280,720)
		await create_timer(.8).timeout; await RenderingServer.frame_post_draw
		root.get_texture().get_image().save_png(destination.path_join("compact.png"))
		root.size=Vector2i(1920,1080); root.content_scale_size=Vector2i(1920,1080)
		await create_timer(.8).timeout; await RenderingServer.frame_post_draw
		root.get_texture().get_image().save_png(destination.path_join("wide.png"))
		root.size=Vector2i(900,1200); root.content_scale_size=Vector2i(900,1200)
		await create_timer(.8).timeout; await RenderingServer.frame_post_draw
		root.get_texture().get_image().save_png(destination.path_join("narrow.png"))
		root.size=Vector2i(1600,1000); root.content_scale_size=Vector2i(1600,1000)
		ui.player_hud.close_modals(); ui.set_role("dm"); ui.selected_actor_id="maria"; ui.player_hud.open_modal("sheet")
		await create_timer(.8).timeout; await RenderingServer.frame_post_draw
		root.get_texture().get_image().save_png(destination.path_join("dm-sheet.png"))
		ui.player_hud.close_modals(); ui.set_role("player"); ui.player_hud.open_modal("inventory")
		await create_timer(.8).timeout; await RenderingServer.frame_post_draw
		root.get_texture().get_image().save_png(destination.path_join("independent-backpack.png"))
	print("CHARACTER SHEET CAPTURE DONE"); quit()
