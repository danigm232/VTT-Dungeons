extends SceneTree
func _initialize() -> void: _run.call_deferred()
func _run() -> void:
	root.size = Vector2i(1280, 720)
	var phase := "before"
	var folder := ProjectSettings.globalize_path("res://../../output/npc-sprites-20261115")
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--phase="): phase = arg.trim_prefix("--phase=")
		if arg.begins_with("--destination="): folder = arg.trim_prefix("--destination=")
	DirAccess.make_dir_recursive_absolute(folder)
	var world := Node3D.new(); root.add_child(world)
	var environment := WorldEnvironment.new(); environment.environment = Environment.new()
	environment.environment.background_mode = Environment.BG_COLOR
	environment.environment.background_color = Color("142024")
	environment.environment.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	environment.environment.ambient_light_energy = .85
	world.add_child(environment)
	var sun := DirectionalLight3D.new(); sun.rotation_degrees = Vector3(-45,-25,0); world.add_child(sun)
	var camera := Camera3D.new(); world.add_child(camera); camera.projection = Camera3D.PROJECTION_ORTHOGONAL
	camera.size = 5; camera.position = Vector3(0,4,10); camera.look_at(Vector3(0,.8,0)); camera.current = true
	var packed: PackedScene = load("res://scenes/player_token.tscn")
	for species in ["zombie", "harpy"]:
		var token = packed.instantiate(); token.token_name = species; token.is_npc = true
		token.has_carried_light = false; token.target_height = 1.95 if species == "zombie" else 2.2
		world.add_child(token); token.set_physics_process(false)
		var states := ["attack_bite","grapple","hit","fall","stand","fortitude"] if species == "zombie" else ["fly","attack_club","song","fall"]
		for state in states:
			token.facing_dir = "e"; token._resolve_and_apply_clip(state,"e",true)
			token.anim_frame_idx = mini(4,token.active_clip_frames.size()-1); token.update_sprite_frame()
			token._apply_procedural_motion(0,Vector2.ZERO,state)
			for i in range(3): await process_frame
			RenderingServer.force_draw(false); await process_frame
			root.get_texture().get_image().save_png(folder.path_join(species+"-"+state+"-"+phase+".png"))
		if phase == "after":
			for condition in ["agarrada","paralizada","inconsciente","hechizada","asustada","envenenada"]:
				preload("res://sprites/npc_condition_visuals.gd").sync(token,{"conditions":[condition],"condition_immunities":["envenenada"] if species=="zombie" else []})
				var state: String=str(token.get_meta("npc_condition_pose",""))
				if state.is_empty(): state="combat_idle"
				token._resolve_and_apply_clip(state,"e",true)
				# Match the next runtime visual tick after the sprite bounds changed.
				preload("res://sprites/npc_condition_visuals.gd").sync(token,{"conditions":[condition],"condition_immunities":["envenenada"] if species=="zombie" else []})
				token._apply_procedural_motion(0,Vector2.ZERO,state)
				for i in range(3): await process_frame
				RenderingServer.force_draw(false); await process_frame
				root.get_texture().get_image().save_png(folder.path_join(species+"-condition-"+condition+".png"))
		world.remove_child(token); token.free()
	print("NPC CAPTURES ", phase, " complete")
	world.free(); quit()
