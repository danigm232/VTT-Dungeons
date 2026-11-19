extends SceneTree
var phase:="before"
var folder: String
var records: Array=[]
var legacy: Node
var legacy_overlay: Control
var current_overlay: Control
var combat: Node
func _initialize() -> void: run.call_deferred()
func shot(label: String,camera: Camera3D) -> void:
	for i in range(24): await process_frame
	RenderingServer.force_draw(false); await process_frame
	var filename:=label+"-"+phase+".png"
	root.get_texture().get_image().save_png(folder.path_join(filename))
	records.append({"image":filename,"phase":phase,"sample":label,"camera":str(camera.global_transform),"size":camera.size,"pixels":[root.size.x,root.size.y],"party":combat.positions.duplicate(true)})
func pair(label: String,camera: Camera3D) -> void:
	phase="before"
	legacy.armed=combat.armed.duplicate(true); legacy.category=combat.category; legacy.page=combat.page; legacy.wheel_open=combat.wheel_open
	combat.action_tray.hide(); current_overlay.set_process(false); current_overlay.hide(); legacy_overlay.set_process(true)
	legacy._refresh_wheel()
	if not legacy.armed.is_empty(): legacy._target_controls(); combat._layout()
	await shot(label,camera)
	phase="after"
	legacy_overlay.set_process(false); legacy_overlay.hide(); current_overlay.set_process(true); combat.refresh()
	await shot(label,camera)
func run() -> void:
	root.size=Vector2i(1280,720)
	folder=ProjectSettings.globalize_path("res://../../output/godot-combat-direct-20261115/captures"); DirAccess.make_dir_recursive_absolute(folder)
	var main: Node3D=load("res://scenes/camp_forest_pleamar.tscn").instantiate()
	var camera: Camera3D=main.find_child("TacticalCamera",true,false); camera.persist_preferences=false
	root.add_child(main); current_scene=main
	for i in range(6): await process_frame
	var ui=main.find_child("VttRoleUi",true,false)
	for i in range(240):
		if not ui.grid_node.build_stats.is_empty(): break
		await process_frame
	ui.clock_running=false; ui.preferences.values=ui.preferences.DEFAULTS.duplicate(true); ui.preferences.apply(); ui.set_role("player"); ui.select_player_character("mia")
	for body in ui.tokens_by_node.values(): body.set_physics_process(false)
	combat=ui.combat_controller; combat.set_process(false)
	current_overlay=combat.layer.get_child(0)
	legacy=load("res://review/before_controller.gd").new(); ui.add_child(legacy); legacy.set_process(false)
	for key in ["ui","rules","layer","wheel","prompt","dialog","hint","budget","timeline"]: legacy.set(key,combat.get(key))
	legacy_overlay=load("res://review/before_overlay.gd").new(); legacy_overlay.controller=legacy; combat.layer.add_child(legacy_overlay); combat.layer.move_child(legacy_overlay,0)
	combat.rules.start(["mia","mike"]); combat.rules.submit_initiative("mia",20); combat.rules.submit_initiative("mike",10)
	camera.apply_view_state(camera.get_view_state(),true); camera.set_process(false); Engine.time_scale=0
	combat.category=""; combat.wheel_open=true; combat.refresh(); await pair("right-wheel",camera)
	combat.category="weapons"; combat.wheel_open=true; combat.choose_action("mace"); await pair("mace-selected",camera)
	combat.armed.clear(); combat.rules.cancel(); ui.select_player_character("mike"); combat.rules.next_turn("mia")
	combat.category="spells"; combat.wheel_open=true; combat.choose_action("burning-hands"); combat.update_preview_point(combat.token("mike").global_position+Vector3(-3,0,1))
	await pair("area-selected",camera)
	combat.armed.clear(); combat.rules.cancel(); ui.preferences.set_value("actionX",.01); ui.preferences.set_value("actionY",0); combat.category=""; combat.wheel_open=true; combat.refresh(); await process_frame; combat.refresh(); await pair("left-wheel",camera)
	for selected_phase in ["before","after"]:
		FileAccess.open(folder.path_join(selected_phase+".json"),FileAccess.WRITE).store_string(JSON.stringify(records.filter(func(entry): return entry.phase==selected_phase),"\t"))
	Engine.time_scale=1; main.free(); print("DIRECT ACTION CAPTURES same-scene 8"); quit()
