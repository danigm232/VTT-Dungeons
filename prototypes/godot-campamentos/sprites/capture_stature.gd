extends SceneTree
func _initialize() -> void: _run.call_deferred()
func _run() -> void:
	root.size=Vector2i(1280,720)
	var phase:="before"
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--phase="): phase=arg.trim_prefix("--phase=")
	var folder:=ProjectSettings.globalize_path("res://../../output/npc-sprites-20261115/overlays-options-20261116")
	var world:=Node3D.new(); root.add_child(world)
	var env:=WorldEnvironment.new(); env.environment=Environment.new(); env.environment.background_mode=Environment.BG_COLOR
	env.environment.background_color=Color("142024"); env.environment.ambient_light_source=Environment.AMBIENT_SOURCE_COLOR; env.environment.ambient_light_energy=.85; world.add_child(env)
	var sun:=DirectionalLight3D.new(); sun.rotation_degrees=Vector3(-45,-25,0); world.add_child(sun)
	var camera:=Camera3D.new(); world.add_child(camera); camera.projection=Camera3D.PROJECTION_ORTHOGONAL
	camera.size=6.5; camera.position=Vector3(0,4,14); camera.look_at(Vector3(0,.9,0)); camera.current=true
	var source=load("res://scenes/main.tscn").instantiate()
	var specs: Array=[["PlayerToken","Mía"],["RogueToken","Trinity"],["WizardToken","Mike"],["ZombieToken","Zombi"],["HarpyToken","Arpía"]]
	var heights: Array=[]
	for i in range(specs.size()):
		var body=source.find_child(specs[i][0],true,false)
		if body==null: continue
		body.owner=null; body.get_parent().remove_child(body); body.position=Vector3((i-2)*2.0,.001,0); body.has_carried_light=false
		world.add_child(body); body.set_physics_process(false); body.is_transitioning=true
		body._resolve_and_apply_clip("idle","s",true); body._apply_procedural_motion(0,Vector2.ZERO,"idle")
		var label:=Label3D.new(); label.text=str(specs[i][1])+"\n"+str(snappedf(body.target_height,.01))+" m"
		label.position=Vector3(body.position.x,-.37,.02); label.pixel_size=.006; label.font_size=28
		label.billboard=BaseMaterial3D.BILLBOARD_ENABLED; world.add_child(label)
		heights.append({"id":body.char_key,"height":body.target_height})
	var grid:=ImmediateMesh.new(); var lines:=MeshInstance3D.new(); lines.mesh=grid
	var mat:=StandardMaterial3D.new(); mat.shading_mode=BaseMaterial3D.SHADING_MODE_UNSHADED; mat.albedo_color=Color("435b57")
	grid.surface_begin(Mesh.PRIMITIVE_LINES,mat)
	for i in range(-4,5):
		grid.surface_add_vertex(Vector3(i*1.5,0,-1.5)); grid.surface_add_vertex(Vector3(i*1.5,0,1.5))
	for z in [-1.5,0.0,1.5]: grid.surface_add_vertex(Vector3(-6,0,z)); grid.surface_add_vertex(Vector3(6,0,z))
	grid.surface_end(); world.add_child(lines)
	for i in range(8): await process_frame
	RenderingServer.force_draw(false); await process_frame
	root.get_texture().get_image().save_png(folder.path_join("stature-"+phase+".png"))
	FileAccess.open(folder.path_join("stature-"+phase+".json"),FileAccess.WRITE).store_string(JSON.stringify(heights,"\t"))
	print("STATURE CAPTURE ",phase," ",heights)
	source.free(); world.free(); quit()
