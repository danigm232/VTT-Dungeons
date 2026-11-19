extends SceneTree
func _initialize() -> void: _run.call_deferred()
func _run() -> void:
	root.size=Vector2i(1280,720)
	var phase:="before"
	for argument in OS.get_cmdline_user_args():
		if argument.begins_with("--phase="): phase=argument.trim_prefix("--phase=")
	var world:=Node3D.new(); root.add_child(world)
	var env:=WorldEnvironment.new(); env.environment=Environment.new()
	env.environment.background_mode=Environment.BG_COLOR; env.environment.background_color=Color("142024")
	env.environment.ambient_light_source=Environment.AMBIENT_SOURCE_COLOR; env.environment.ambient_light_energy=.85; world.add_child(env)
	var sun:=DirectionalLight3D.new(); sun.rotation_degrees=Vector3(-45,-25,0); world.add_child(sun)
	var camera:=Camera3D.new(); world.add_child(camera); camera.projection=Camera3D.PROJECTION_ORTHOGONAL
	camera.size=5; camera.position=Vector3(0,4,10); camera.look_at(Vector3(0,.8,0)); camera.current=true
	var controller=preload("res://sprites/npc_test_controller.gd").new(); world.add_child(controller)
	controller.ui=preload("res://sprites/npc_test_ui.gd").new(); world.add_child(controller.ui)
	var body=load("res://scenes/player_token.tscn").instantiate()
	body.token_name="Harpy"; body.is_npc=true; body.has_carried_light=false; body.target_height=2.2
	world.add_child(body); body.set_physics_process(false); body.facing_dir="e"
	controller.bodies["harpy"]=body
	controller.rules.register({"id":"harpy","kind":"enemy","name":"Arpía"})
	var visuals=load("res://combat/combat_visuals.gd").new(); visuals.controller=controller; world.add_child(visuals); visuals.set_process(false)
	for id in ["harpy-claws","harpy-club"]:
		visuals.play({"type":"action","actor":"harpy","target":"","action":{"id":id,"animationType":"melee"},"hit":false,"amount":0})
	body.process_frame_animation(.21); body._apply_procedural_motion(.21,Vector2.ZERO,body.current_anim)
	for i in range(4): await process_frame
	RenderingServer.force_draw(false); await process_frame
	var folder:=ProjectSettings.globalize_path("res://../../output/npc-sprites-audit-20261116")
	DirAccess.make_dir_recursive_absolute(folder)
	root.get_texture().get_image().save_png(folder.path_join("multiattack-"+phase+".png"))
	print("NPC AUDIT CAPTURE ",phase," pose=",body.current_anim," frame=",body.anim_frame_idx)
	world.free(); quit()
