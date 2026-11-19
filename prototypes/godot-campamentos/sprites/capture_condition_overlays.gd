extends SceneTree
const Effects = preload("res://sprites/npc_condition_visuals.gd")
const Cases = [
	["silverfarben","Silverfarben Hotel",1.65,"paralizada"],
	["rogue","Trinity",1.06,"agarrada"],
	["cleric","Mia",1.32,"envenenada"],
	["wizard","Mike",1.82,"aturdida"],
	["anteros","Anteros",1.85,"hechizada"],
	["zombie","zombie",1.95,"inconsciente"],
	["zombie-2","zombie-2",1.95,"restringida"],
	["harpy","harpy",2.2,"restringida"]
]
func _initialize() -> void: _run.call_deferred()
func _run() -> void:
	root.size=Vector2i(1280,720)
	var phase:="before"
	var folder:=ProjectSettings.globalize_path("res://../../output/npc-sprites-20261115/overlays-options-20261116")
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--phase="): phase=arg.trim_prefix("--phase=")
	DirAccess.make_dir_recursive_absolute(folder)
	var world:=Node3D.new(); root.add_child(world)
	var environment:=WorldEnvironment.new(); environment.environment=Environment.new()
	environment.environment.background_mode=Environment.BG_COLOR
	environment.environment.background_color=Color("142024")
	environment.environment.ambient_light_source=Environment.AMBIENT_SOURCE_COLOR
	environment.environment.ambient_light_energy=.85; world.add_child(environment)
	var sun:=DirectionalLight3D.new(); sun.rotation_degrees=Vector3(-45,-25,0); world.add_child(sun)
	var camera:=Camera3D.new(); world.add_child(camera)
	camera.projection=Camera3D.PROJECTION_ORTHOGONAL; camera.size=3.8
	camera.position=Vector3(0,4,10); camera.look_at(Vector3(0,.85,0)); camera.current=true
	var output: Array=[]
	for spec in Cases:
		var body=load("res://scenes/player_token.tscn").instantiate()
		body.token_name=spec[1]; body.target_height=spec[2]; body.is_npc=spec[0] in ["anteros","zombie","zombie-2","harpy"]
		body.has_carried_light=false; body.position=Vector3(0,.001,0)
		body.set_meta("stature_preserve_visual",true) # Match the preserved overlay baselines exactly.
		world.add_child(body); body.set_physics_process(false); body.is_transitioning=true
		var keys: Array=preload("res://sprites/npc_sprite_library.gd").CONDITIONS.duplicate()
		keys.append("combined"); keys.append("none")
		for style in ["mist","runes","brush"]:
			body.set_meta("condition_style_preview",style)
			for key in keys:
				var active: Array=["paralizada","hechizada","agarrada"] if key=="combined" else [] if key=="none" else [key]
				var actor: Dictionary={"conditions":active,"condition_immunities":["envenenada"] if str(spec[0]).begins_with("zombie") else []}
				Effects.sync(body,actor)
				var state: String=preload("res://sprites/npc_sprite_library.gd").condition_pose(active)
				if state.is_empty(): state="combat_idle"
				body.facing_dir="s"; body._resolve_and_apply_clip(state,"s",true)
				body.anim_frame_idx=0; body.update_sprite_frame()
				body._apply_procedural_motion(0,Vector2.ZERO,state)
				body.set_meta("condition_clock_ms",650.0)
				Effects.sync(body,actor)
				for i in range(4): await process_frame
				RenderingServer.force_draw(false); await process_frame
				var name: String=str(spec[0])+"-"+str(key)+"-"+style+".png"
				root.get_texture().get_image().save_png(folder.path_join(name))
				output.append({"actor":spec[0],"condition":key,"style":style,"file":name,"height":spec[2],"phase":phase})
		world.remove_child(body); body.free()
	FileAccess.open(folder.path_join("captures-"+phase+".json"),FileAccess.WRITE).store_string(JSON.stringify(output,"\t"))
	print("CONDITION OVERLAY CAPTURES ",phase," ",output.size()," complete")
	world.free(); quit()
