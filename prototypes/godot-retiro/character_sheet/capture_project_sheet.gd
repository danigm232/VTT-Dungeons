extends SceneTree
func _initialize() -> void: _run.call_deferred()
func _run() -> void:
	root.size=Vector2i(1600,900); root.content_scale_size=Vector2i(1600,900)
	var scene="res://scenes/main.tscn" if FileAccess.file_exists("res://scenes/main.tscn") else "res://scenes/camp_a1_rooms.tscn"
	var main=load(scene).instantiate(); root.add_child(main)
	for i in range(16): await process_frame
	var ui=main.find_child("VttRoleUi",true,false)
	ui.set_role("player"); ui.clock_running=false; ui.clock_seconds=43200; ui.set_env_time("day"); ui.set_env_weather("clear"); ui.selected_actor_id="mia"; ui.refresh_all(); ui.player_hud.open_modal("sheet")
	await create_timer(1.5).timeout
	await RenderingServer.frame_post_draw
	var project=ProjectSettings.globalize_path("res://").trim_suffix("/").get_file().trim_prefix("godot-")
	var destination=ProjectSettings.globalize_path("res://../../output/godot-character-sheet-20261116/")
	root.get_texture().get_image().save_png(destination.path_join(project+"-native.png"))
	var body=ui.get_active_token_node(); var mirror=ui.player_hud.sheet_modal.actor_view
	var file=FileAccess.open(destination.path_join(project+"-render.json"),FileAccess.WRITE)
	file.store_string(JSON.stringify({"scene":scene,"actor":"mia","resolution":[1600,900],"world_idle_phase":body.idle_breath_time,"source_texture_instance":body.sprite.texture.get_instance_id(),"preview_texture_instance":mirror.mirrors[body.sprite].texture.get_instance_id(),"source_animation":body.current_anim,"source_facing":body.facing_dir,"read_only_preview":true},"\t")); file.close()
	print("CHARACTER SHEET PROJECT CAPTURE ",project); quit()
