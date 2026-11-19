extends SceneTree
var records: Array=[]
var phase: String="before"
var folder: String
var project: String
func _initialize() -> void: run.call_deferred()
func shot(label: String,camera: Camera3D) -> void:
	# Complete the opening tween even when the campaign clock is frozen.
	for i in range(24): await process_frame
	RenderingServer.force_draw(false); await process_frame
	var filename:=project+"-"+label+"-"+phase+".png"
	root.get_texture().get_image().save_png(folder.path_join(filename))
	records.append({"image":filename,"camera":str(camera.global_transform),"size":camera.size,"pixels":[root.size.x,root.size.y],"phase":phase,"sample":label})
func run() -> void:
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--phase="): phase=arg.trim_prefix("--phase=")
	root.size=Vector2i(1280,720)
	project="campamentos" if FileAccess.file_exists("res://scripts/camp_structure.gd") else "retiro" if FileAccess.file_exists("res://scripts/retreat_structure.gd") else "pecio"
	var scene_path: String="res://scenes/camp_forest_pleamar.tscn" if project=="campamentos" else "res://scenes/main.tscn"
	if project=="campamentos": scene_path=load("res://scripts/camp_structure.gd").scene_path_for_id("camp-forest-pleamar")
	var main: Node3D=load(scene_path).instantiate()
	var camera: Camera3D=main.find_child("TacticalCamera",true,false)
	camera.persist_preferences=false
	root.add_child(main); current_scene=main
	for i in range(6): await process_frame
	var ui=main.find_child("VttRoleUi",true,false)
	if phase=="after":
		for i in range(240):
			if ui.grid_node and not ui.grid_node.build_stats.is_empty(): break
			await process_frame
	ui.clock_running=false; ui.audio_muted=true; ui.select_player_character("mike"); ui.set_role("player")
	if phase=="after":
		ui.preferences.values=ui.preferences.DEFAULTS.duplicate(true); ui.preferences.role_values.player=ui.preferences.values.duplicate(true); ui.preferences.apply()
	for body in ui.tokens_by_node.values(): body.set_physics_process(false)
	var combat=ui.combat_controller
	combat.rules.start(["mike","mia"]); combat.rules.submit_initiative("mike",20); combat.rules.submit_initiative("mia",10)
	combat.wheel_open=true; combat.category=""; combat.refresh()
	camera.apply_view_state(camera.get_view_state(),true); camera.set_process(false)
	if phase=="after":
		var previous=JSON.parse_string(FileAccess.get_file_as_string("res://../../output/godot-player-audit-20261115/captures/"+project+"-before.json"))[0]
		var regex:=RegEx.new(); regex.compile("-?[0-9]+(?:\\.[0-9]+)?")
		var n: Array=[]
		for match_number in regex.search_all(previous.camera): n.append(float(match_number.get_string()))
		camera.global_transform=Transform3D(Basis(Vector3(n[0],n[1],n[2]),Vector3(n[3],n[4],n[5]),Vector3(n[6],n[7],n[8])),Vector3(n[9],n[10],n[11])); camera.size=previous.size
	Engine.time_scale=0
	folder=ProjectSettings.globalize_path("res://../../output/godot-player-audit-20261115/captures"); DirAccess.make_dir_recursive_absolute(folder)
	await shot("radial",camera)
	combat.category="spells"; combat.refresh(); await shot("spells",camera)
	combat.wheel_open=false; combat.refresh(); ui.player_hud.open_modal("settings"); await shot("settings",camera)
	ui.player_hud.close_modals(); combat.rules.finish(); combat.refresh(); await shot("grid",camera)
	FileAccess.open(folder.path_join(project+"-"+phase+".json"),FileAccess.WRITE).store_string(JSON.stringify(records,"\t"))
	Engine.time_scale=1; main.free(); print("PLAYER AUDIT CAPTURES ",project," ",phase," ",records.size()); quit()
