extends SceneTree
func _initialize() -> void: _run.call_deferred()
func _run() -> void:
	root.size=Vector2i(1600,900)
	var folder:=ProjectSettings.globalize_path("res://../../output/npc-sprites-20261115")
	var main: Node3D=load("res://scenes/main.tscn").instantiate()
	var camera: Camera3D=main.find_child("TacticalCamera",true,false)
	camera.persist_preferences=false
	root.add_child(main); current_scene=main
	for i in range(12): await process_frame
	var ui=main.find_child("VttRoleUi",true,false)
	ui.clock_running=false; ui.audio_muted=true; ui.set_role("dm")
	var combat=ui.combat_controller
	if not combat.rules.actors.has("harpy_c2_lvl2") or combat.token("harpy_c2_lvl2").visible:
		push_error("Optional harpy must exist independently and start hidden"); quit(1); return
	if not combat.token("harpy_c2_lvl2").collision.disabled or combat.token("harpy_c2_lvl2").is_physics_processing():
		push_error("Hidden reinforcement must not block movement"); quit(1); return
	var profile: Dictionary=load("res://combat/combat_catalogue.gd").profile("harpy_c2_lvl2")
	if profile.get("ruleTraits",{}).get("flightMeters",0)!=12:
		push_error("Second harpy lost her flight profile"); quit(1); return
	combat.rules.add_condition("harpy","agarrada")
	if "agarrada" in combat.rules.actors["harpy_c2_lvl2"].conditions:
		push_error("Harpy conditions were incorrectly shared"); quit(1); return
	combat.rules.actors.harpy.conditions.clear()
	var untouched_hp: int=combat.rules.actors["harpy_c2_lvl2"].hp
	combat.rules.actors.harpy.hp-=1
	if combat.rules.actors["harpy_c2_lvl2"].hp!=untouched_hp:
		push_error("Harpy HP was incorrectly shared"); quit(1); return
	combat.rules.actors.harpy.hp+=1
	for body in ui.tokens_by_node.values(): body.set_physics_process(false)
	combat.set_process(false); combat.visuals.set_process(false)
	var vessel=main.find_child("ShipVessel",true,false)
	if vessel: vessel.set_process(false)
	camera.set_process(false); camera.projection=Camera3D.PROJECTION_ORTHOGONAL; camera.size=7
	for id in ["zombie","harpy","harpy_c2_lvl2"]:
		var body: Node3D=combat.token(id)
		body.visible=true # Review only; no campaign save is written.
		var target:=body.global_position+Vector3.UP*.8
		camera.global_position=target+Vector3(0,3.5,9); camera.look_at(target)
		body._resolve_and_apply_clip("attack_bite" if id=="zombie" else "attack_club","e",true)
		body.anim_frame_idx=4; body.update_sprite_frame(); body._apply_procedural_motion(0,Vector2.ZERO,body.current_anim)
		for i in range(6): await process_frame
		RenderingServer.force_draw(false); await process_frame
		root.get_texture().get_image().save_png(folder.path_join("integrated-"+("harpy-2" if id=="harpy_c2_lvl2" else id)+".png"))
	print("NPC INTEGRATED: two independent harpies, hidden reinforcement, original positions; captures complete")
	main.free(); quit()
