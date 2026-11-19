extends SceneTree
func _initialize() -> void: _run.call_deferred()
func _run() -> void:
	var inspector=load("res://characters/inspector.gd").new(); root.add_child(inspector)
	for i in range(3): await process_frame
	for id in ["mike","anteros","cow"]:
		inspector.select_actor(id); inspector.pose()
		for i in range(2): await process_frame
		assert(inspector.body.active_clip_frames.size()>0)
	inspector.select_actor("mike"); inspector.visual.set_effect("poisoned",.7)
	for control in inspector.state_controls:
		if control.get_meta("effect")=="poisoned": control.set_pressed_no_signal(true)
	inspector.animation="walk"; inspector.frame_index=3; inspector.pose()
	var points: Dictionary=preload("res://characters/anchors.gd").resolved(inspector.body,inspector.visual.definition)
	var screen: Vector2=inspector.stage.camera.unproject_position(inspector.body.to_global(points.head))
	var click:=InputEventMouseButton.new(); click.button_index=MOUSE_BUTTON_LEFT; click.pressed=true; click.position=screen; inspector._input(click)
	var move:=InputEventMouseMotion.new(); move.position=screen+Vector2(5,3); inspector._input(move)
	assert(not inspector.visual.corrections.is_empty(),"dragging edits a relative anchor on the exact current frame")
	inspector.visual.corrections.clear(); inspector.dragging=false
	for i in range(3): await process_frame
	await RenderingServer.frame_post_draw
	root.get_texture().get_image().save_png(ProjectSettings.globalize_path("res://../../output/character-modular-20261116/inspector-proof.png"))
	print("INSPECTOR PROOF: three actors, effect, frame controls rendered; equipment phase deferred by user")
	inspector.free(); quit()
