extends SceneTree

# Current integrated scene captures, not before/after art comparisons.
func _initialize() -> void: run.call_deferred()
func run() -> void:
	root.size = Vector2i(1280,720)
	print("CAPTURE loading scene")
	var scene := load("res://scenes/main.tscn").instantiate() as Node3D
	scene.find_child("TacticalCamera",true,false).persist_preferences = false
	root.add_child(scene); current_scene = scene
	print("CAPTURE scene ready")
	for _i in range(3): await process_frame
	var camera := scene.find_child("TacticalCamera",true,false) as Camera3D
	var ui := scene.find_child("VttRoleUi",true,false)
	var hero := scene.find_child("PlayerToken",true,false) as Node3D
	camera.persist_preferences = false
	for token in scene.find_children("*","CharacterBody3D",true,false): token.set_physics_process(false)
	var retreat := FileAccess.file_exists("res://scripts/retreat_structure.gd")
	var project := "retiro" if retreat else "pecio"
	var folder := ProjectSettings.globalize_path("res://../../output/godot-cameras-20261114/captures")
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--camera-capture-dir="): folder = arg.trim_prefix("--camera-capture-dir=")
	DirAccess.make_dir_recursive_absolute(folder)
	var records: Array = []
	var shots: Array = [["player-25",Vector3(106,9.1,90) if retreat else Vector3(2.5,0.12,1.2),25.0,0.0,"player"], ["player-5",Vector3(106,9.1,90) if retreat else Vector3(2.5,0.12,1.2),5.0,1.0,"player"], ["dm-interior",Vector3(122,18.1,58) if retreat else Vector3(-20,0.1,-4),10.0,0.0,"dm"], ["dm-controls",Vector3(106,9.1,90) if retreat else Vector3(2.5,0.12,1.2),12.7,-1.0,"dm"]]
	for shot in shots:
		ui.set_role(shot[4])
		if shot[4]=="player":
			hero.global_position = shot[1]; camera.set_target_character(hero)
		else: camera.explore_point(shot[1])
		var zone: String = camera.detect_wreck_zone(shot[1])
		camera.set_interior_cutout(camera.is_interior_zone(zone),10.0,zone)
		camera.target_pitch = shot[2]; camera.orbit_step = shot[3]; camera._recompute_target_yaw()
		camera.target_distance = 14.0 if retreat else 13.0
		if shot[0]=="dm-controls":
			ui.dm_hud._active_map_tab = "camera"
			ui.dm_hud._rebuild_map_pop()
			ui.dm_hud.map_tools_pop.visible = true
		camera.apply_view_state(camera.get_view_state(),true)
		print("CAPTURE drawing ",shot[0])
		for _i in range(4): await process_frame
		RenderingServer.force_draw(false)
		await process_frame
		var image := root.get_texture().get_image()
		image.save_png(folder.path_join(project+"-"+shot[0]+".png"))
		records.append({"shot":shot[0],"pitch":camera.current_pitch,"yaw":camera.current_yaw,"zoom":camera.current_distance,"focus":str(camera.focus_point),"projection":camera.projection,"role":ui.current_role})
	FileAccess.open(folder.path_join(project+"-frames.json"),FileAccess.WRITE).store_string(JSON.stringify(records,"\t"))
	print("INTEGRATED CAMERA CAPTURES: ",project," ",records.size())
	quit()
