extends SceneTree
## Same native PlayerToken, light, camera and positions in both captures. The
## neutral review stage is labelled as a fixture, never as an adventure map.
var destination: String
var phase := "before"
var tokens: Array = []

func _initialize() -> void:
	_run.call_deferred()

func _shot(label: String) -> void:
	for index in range(3): await process_frame
	RenderingServer.force_draw(false)
	await process_frame
	root.get_texture().get_image().save_png(destination.path_join(label + "-" + phase + ".png"))

func _run() -> void:
	root.size = Vector2i(1600, 900)
	destination = ProjectSettings.globalize_path("res://../../output/sprite-audit-20261115/pecio")
	for argument in OS.get_cmdline_user_args():
		if argument.begins_with("--phase="): phase = argument.trim_prefix("--phase=")
		if argument.begins_with("--destination="): destination = argument.trim_prefix("--destination=")
	DirAccess.make_dir_recursive_absolute(destination)
	var stage := Node3D.new()
	root.add_child(stage)
	var world := WorldEnvironment.new()
	world.environment = Environment.new()
	world.environment.background_mode = Environment.BG_COLOR
	world.environment.background_color = Color("142024")
	world.environment.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	world.environment.ambient_light_color = Color("b6cad2")
	world.environment.ambient_light_energy = .8
	stage.add_child(world)
	var light := DirectionalLight3D.new()
	light.rotation_degrees = Vector3(-48, -32, 0)
	light.light_energy = 1.1
	stage.add_child(light)
	var floor_mesh := MeshInstance3D.new()
	var plane := PlaneMesh.new()
	plane.size = Vector2(18, 9)
	floor_mesh.mesh = plane
	var material := StandardMaterial3D.new()
	material.albedo_color = Color("3c4843")
	floor_mesh.material_override = material
	stage.add_child(floor_mesh)
	var camera := Camera3D.new()
	camera.projection = Camera3D.PROJECTION_ORTHOGONAL
	camera.size = 13.5
	stage.add_child(camera)
	camera.position = Vector3(0, 7, 19)
	camera.look_at(Vector3(0, .65, 0))
	camera.current = true
	var packed: PackedScene = load("res://scenes/player_token.tscn")
	var labels := ["Mía", "Trinity", "Mike", "Silverfarben Hotel", "Zombi"]
	for index in range(5):
		var token = packed.instantiate()
		token.token_name = ["Cleric", "Rogue", "Wizard", "Silverfarben", "Zombie"][index]
		token.target_height = [1.65, 1.75, 1.95, 1.8, 1.95][index]
		token.has_carried_light = false
		token.is_npc = index == 4
		token.position = Vector3((index - 2) * 2.45, 0, 0)
		stage.add_child(token)
		token.set_physics_process(false)
		tokens.append(token)
		var label := Label3D.new()
		label.text = labels[index]
		label.position = token.position + Vector3(0, -.22, .25)
		label.font_size = 36
		label.pixel_size = .005
		label.billboard = BaseMaterial3D.BILLBOARD_ENABLED
		stage.add_child(label)
	var canvas := CanvasLayer.new()
	root.add_child(canvas)
	var heading := Label.new()
	heading.position = Vector2(35, 28)
	heading.add_theme_font_size_override("font_size", 24)
	heading.text = "Revisión de sprites · escenario neutro · mismos actores, cámara y luz"
	canvas.add_child(heading)
	for direction in ["n", "e", "s", "w"]:
		heading.text = "Caminar · " + direction.to_upper() + " · escenario neutro de revisión"
		for token in tokens:
			token.facing_dir = direction
			token._resolve_and_apply_clip("walk", direction, true)
			token.anim_frame_idx = mini(4, token.active_clip_frames.size() - 1)
			token.update_sprite_frame()
			token._apply_procedural_motion(0, Vector2.ZERO, "walk")
		await _shot("walk-" + direction)
	for state in ["climb", "swim", "crawl", "jump"]:
		heading.text = state + " · escenario neutro de revisión"
		for token in tokens:
			token.facing_dir = "e"
			token._resolve_and_apply_clip(state, "e", true)
			token.anim_frame_idx = mini(4, token.active_clip_frames.size() - 1)
			token.update_sprite_frame()
			token._apply_procedural_motion(0, Vector2.ZERO, state)
		await _shot(state)
	print("SPRITE CAPTURES ", phase, " complete")
	stage.free()
	quit()
