extends SceneTree
const Prefs=preload("res://player/player_preferences.gd")
var passed:=0
var failures: Array=[]
var records: Array=[]
func check(value: bool,label: String) -> void:
	if value: passed+=1
	else: failures.append(label); printerr("FAIL ",label)
func _initialize() -> void: run.call_deferred()
func run() -> void:
	root.size=Vector2i(1280,720)
	var project: String="campamentos" if FileAccess.file_exists("res://scripts/camp_structure.gd") else "retiro" if FileAccess.file_exists("res://scripts/retreat_structure.gd") else "pecio"
	var paths: Array=["res://scenes/main.tscn"]
	if project=="retiro": paths.append_array(["res://scenes/pleamar_coves.tscn","res://scenes/observatory_approach.tscn","res://scenes/pecio_cove_arrival.tscn"])
	if project=="campamentos": paths=load("res://scripts/camp_structure.gd").SCENE_PATHS.values()
	for path in paths:
		check(FileAccess.file_exists(path),"scene exists "+path)
		if not FileAccess.file_exists(path): continue
		print("PLAYER_SCENE_LOADING ",path)
		var main: Node3D=load(path).instantiate(); var camera: Camera3D=main.find_child("TacticalCamera",true,false); camera.persist_preferences=false
		root.add_child(main); current_scene=main
		for i in range(5): await process_frame
		var ui=main.find_child("VttRoleUi",true,false)
		check(ui!=null and ui.preferences!=null,"actual scene has preferences "+path)
		if ui==null: main.free(); continue
		ui.clock_running=false; ui.set_role("player")
		var prefs=ui.preferences; var original: Dictionary=prefs.values.duplicate(true)
		var grid=ui.grid_node
		for i in range(240):
			if grid and not grid.build_stats.is_empty(): break
			await process_frame
		check(grid!=null and grid.verified_cells.size()>0,"physics-verified walkable grid "+path)
		if grid:
			records.append({"scene":path,"grid":grid.build_stats.duplicate(true)})
			check(grid.navigation.size()==grid.verified_cells.size(),"navigation graph shares verified cells "+path)
			var revision: int=grid.revision
			prefs.set_value("gridRadius",35.0); prefs.set_value("gridHeightOpacity",.2); prefs.set_value("gridThickness",3)
			await process_frame
			check(grid.material.get_shader_parameter("radius_meters")==35.0 and grid.material.get_shader_parameter("other_height_opacity")==.2,"radius/elevation reach actual shader "+path)
			check(grid.revision==revision,"style changes never rebuild geometry "+path)
			var saved=ConfigFile.new(); check(saved.load(prefs.storage_path)==OK and saved.get_value("display","player").gridThickness==3,"preferences persist to disk "+path)
			ui.set_role("dm"); prefs.set_value("gridThickness",2); ui.set_role("player")
			check(prefs.values.gridThickness==3,"DM and player keep independent preferences "+path)
			ui.set_role("projector"); check(not grid.visible,"projector hides tactical grid "+path); ui.set_role("player")
		ui.player_hud.open_modal("settings"); await process_frame; await process_frame
		check(Rect2(Vector2.ZERO,ui.ui_root.get_viewport_rect().size).encloses(ui.player_hud.settings_modal.get_global_rect()),"scroll settings stay in viewport "+path)
		check(prefs.controls.size()==Prefs.DEFAULTS.size(),"every native preference has a control "+path)
		check(ui.player_hud.settings_modal.find_child("Setting_gridRadius",true,false)!=null,"actual radius slider is present "+path)
		ui.player_hud.close_modals()
		if "--capture-maps" in OS.get_cmdline_user_args():
			ui.select_player_character("mia"); camera.apply_view_state(camera.get_view_state(),true); camera.set_process(false)
			for i in range(4): await process_frame
			RenderingServer.force_draw(false); await process_frame
			var filename:=project+"-"+str(path).get_file().trim_suffix(".tscn")+"-map.png"
			root.get_texture().get_image().save_png(ProjectSettings.globalize_path("res://../../output/godot-player-audit-20261115/captures/"+filename))
			records[-1]["capture"]=filename
		var combat=ui.combat_controller
		ui.select_player_character("mike"); combat.rules.finish(); combat.choose_action("detect-magic")
		check(combat.armed.is_empty() and combat.rules.pending.get("target","")=="mike","personal spell bypasses target selection "+path)
		combat.rules.cancel(); combat.choose_action("ray-of-frost")
		check(not combat.armed.is_empty() and combat.rules.pending.is_empty(),"directed attack waits for target "+path)
		combat.armed.clear(); combat._basic("hide")
		check(combat.rules.pending.get("kind","")=="basic" and "Sin objetivo" in combat.rules.pending.get("label",""),"hide requests resolution without target "+path)
		combat.rules.cancel(); combat._basic("help"); check(combat.armed.get("target_mode","")=="ally","help still asks for ally "+path); combat.armed.clear()
		combat.wheel_open=true; combat.category=""; combat.refresh(); await process_frame
		var buttons: Array=combat.wheel.find_children("CombatIcon_*","Button",true,false)
		check(buttons.size()==4,"rose has four categories "+path)
		for button in buttons: check(button.size.x>=44 and button.size.y>=44 and Rect2(Vector2.ZERO,ui.ui_root.get_viewport_rect().size).encloses(button.get_global_rect()),"rose touch target stays visible "+path+button.name)
		var event:=InputEventKey.new(); event.keycode=KEY_ESCAPE; event.pressed=true; combat._unhandled_input(event); check(not combat.wheel_open,"Esc closes rose "+path)
		prefs.values=original; prefs.role_values.player=original.duplicate(true); prefs.save(); prefs.apply()
		main.free(); current_scene=null; await process_frame
	var result:={"project":project,"suite":"player-scenes","passed":passed,"failed":failures.size(),"errors":failures,"scenes":records}
	var output:=ProjectSettings.globalize_path("res://../../output/godot-player-audit-20261115/scenes-"+project+".json")
	FileAccess.open(output,FileAccess.WRITE).store_string(JSON.stringify(result,"\t"))
	print(JSON.stringify(result)); quit(1 if failures.size()>0 else 0)
