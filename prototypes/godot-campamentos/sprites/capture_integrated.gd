extends SceneTree
## Current adventure scene and actors; review output only, no save is written.
func _initialize() -> void:
	_run.call_deferred()

func _run() -> void:
	root.size = Vector2i(1600, 900)
	var destination := ProjectSettings.globalize_path("res://../../output/sprite-audit-20261115/pecio")
	for argument in OS.get_cmdline_user_args():
		if argument.begins_with("--destination="): destination = argument.trim_prefix("--destination=")
	DirAccess.make_dir_recursive_absolute(destination)
	var main: Node3D = load("res://scenes/main.tscn").instantiate()
	var camera: Camera3D = main.find_child("TacticalCamera", true, false)
	camera.persist_preferences = false
	root.add_child(main)
	current_scene = main
	for index in range(8): await process_frame
	var ui = main.find_child("VttRoleUi", true, false)
	if ui:
		ui.clock_running = false
		ui.audio_muted = true
		ui.set_role("dm")
	for name in ["PlayerToken", "RogueToken", "WizardToken", "ZombieToken", "HarpyToken"]:
		var actor = main.find_child(name, true, false)
		if actor: actor.set_physics_process(false)
	var vessel := main.find_child("ShipVessel", true, false) as Node3D
	if vessel: vessel.set_process(false)
	camera.set_process(false)
	camera.projection = Camera3D.PROJECTION_ORTHOGONAL
	camera.size = 8
	for name in ["PlayerToken", "RogueToken"]:
		var actor = main.find_child(name, true, false)
		if actor == null: continue
		var target: Vector3 = actor.global_position + Vector3.UP * .8
		camera.global_position = target + Vector3(0, 5.5, 12)
		camera.look_at(target)
		actor.facing_dir = "e"
		actor._resolve_and_apply_clip("run", "e", true)
		actor.anim_frame_idx = 3
		actor.update_sprite_frame()
		actor._apply_procedural_motion(0, Vector2.RIGHT, "run")
		for index in range(6): await process_frame
		RenderingServer.force_draw(false)
		await process_frame
		root.get_texture().get_image().save_png(destination.path_join("integrated-" + name.to_lower() + ".png"))
	print("SPRITES INTEGRATED CAPTURES complete")
	main.free()
	quit()
