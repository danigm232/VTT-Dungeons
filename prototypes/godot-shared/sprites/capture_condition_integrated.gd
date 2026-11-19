extends SceneTree
func _initialize() -> void: _run.call_deferred()
func _run() -> void:
	root.size=Vector2i(1600,900)
	var folder:=ProjectSettings.globalize_path("res://../../output/npc-sprites-20261115/overlays-options-20261116")
	var main: Node3D=load("res://scenes/main.tscn").instantiate()
	var camera: Camera3D=main.find_child("TacticalCamera",true,false); camera.persist_preferences=false
	root.add_child(main); current_scene=main
	for i in range(12): await process_frame
	var ui=main.find_child("VttRoleUi",true,false); ui.clock_running=false; ui.audio_muted=true; ui.set_role("dm")
	var combat=ui.combat_controller
	for body in ui.tokens_by_node.values(): body.set_physics_process(false)
	combat.set_process(false); combat.visuals.set_process(false)
	var vessel=main.find_child("ShipVessel",true,false)
	if vessel: vessel.set_process(false)
	camera.set_process(false); camera.projection=Camera3D.PROJECTION_ORTHOGONAL; camera.size=5.5
	for spec in [["mia","envenenada"],["harpy","hechizada"],["zombie","restringida"]]:
		var body: Node3D=combat.token(spec[0])
		combat.rules.actors[spec[0]].conditions=[spec[1]]
		body._resolve_and_apply_clip("idle","s",true); body._apply_procedural_motion(0,Vector2.ZERO,"idle")
		body.set_meta("condition_clock_ms",650.0)
		preload("res://sprites/npc_condition_visuals.gd").sync(body,combat.rules.actors[spec[0]])
		var target: Vector3=body.global_position+Vector3.UP*body.target_height*.45
		camera.global_position=target+Vector3(0,3.5,9); camera.look_at(target)
		for i in range(5): await process_frame
		RenderingServer.force_draw(false); await process_frame
		root.get_texture().get_image().save_png(folder.path_join("map-"+spec[0]+".png"))
	preload("res://sprites/condition_overlay_picker.gd").open(combat)
	var who: OptionButton=combat.dialog.find_child("ConditionActorChoice",true,false)
	var choice: OptionButton=combat.dialog.find_child("ConditionStyleChoice",true,false)
	var expected:=0
	for id in combat.rules.actors:
		var body: Node3D=combat.token(id)
		if body and body.is_visible_in_tree(): expected+=1
	if who==null or choice==null or who.item_count!=expected or choice.item_count!=4:
		push_error("Condition picker must expose three styles + recommendation, visible actors only"); quit(1); return
	if combat.token("harpy-2").visible:
		push_error("Condition preview revealed hidden reinforcement"); quit(1); return
	choice.select(2); choice.item_selected.emit(2)
	var first: Node3D
	for id in combat.rules.actors:
		var body: Node3D=combat.token(id)
		if body and body.is_visible_in_tree(): first=body; break
	if preload("res://sprites/condition_overlay_library.gd").selected_style(first)!="runes":
		push_error("Per-actor condition choice did not persist"); quit(1); return
	for i in range(5): await process_frame
	RenderingServer.force_draw(false); await process_frame
	root.get_texture().get_image().save_png(folder.path_join("dm-condition-picker.png"))
	print("CONDITION INTEGRATED: three real map captures; picker visible actors only; three choices + auto; per-actor persistence; hidden reinforcement retained")
	main.free(); quit()
