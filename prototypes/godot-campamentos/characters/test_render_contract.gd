extends SceneTree
const Stage=preload("res://characters/review_stage.gd")
var checks:=0
var failures: Array=[]
func check(ok: bool,label: String) -> void:
	checks+=1
	if not ok: failures.append(label); printerr("RENDER FAIL ",label)
func _initialize() -> void: _run.call_deferred()
func capture() -> Image:
	for i in range(3): await process_frame
	await RenderingServer.frame_post_draw
	return root.get_texture().get_image()
func _run() -> void:
	root.size=Vector2i(1280,720)
	var stage:=Stage.create(root); var body=Stage.actor(stage.world,"mike"); var visual=body.get_node("CharacterVisual")
	var blocker:=MeshInstance3D.new(); var mesh:=BoxMesh.new(); mesh.size=Vector3(.8,2.9,.12); blocker.mesh=mesh; blocker.position=Vector3(.35,1.1,.45)
	var material:=StandardMaterial3D.new(); material.shading_mode=BaseMaterial3D.SHADING_MODE_UNSHADED; material.albedo_color=Color("803827"); blocker.material_override=material; stage.world.add_child(blocker)
	var before: Image=await capture(); visual.set_effect("poisoned",1); var after: Image=await capture()
	var tested:=0; var leaked:=0
	for y in range(80,650,2):
		for x in range(420,900,2):
			var reference: Color=before.get_pixel(x,y)
			if reference.r>.45 and reference.r<.56 and reference.g>.18 and reference.g<.26 and reference.b<.2:
				tested+=1; var value: Color=after.get_pixel(x,y)
				if absf(reference.r-value.r)+absf(reference.g-value.g)+absf(reference.b-value.b)>.04: leaked+=1
	check(tested>1000,"occlusion test covers actual rendered foreground pixels")
	check(leaked<tested*.002,"state shader stays behind a nearer world object")
	var folder:=ProjectSettings.globalize_path("res://../../output/character-modular-20261116")
	before.save_png(folder.path_join("occlusion-before.png")); after.save_png(folder.path_join("occlusion-after.png"))
	blocker.hide()
	for id in ["mike","anteros","cow"]:
		stage.world.remove_child(body); body.free(); body=Stage.actor(stage.world,id); visual=body.get_node("CharacterVisual")
		for effect in preload("res://characters/registry.gd").data().overlays:
			visual.extra_effects.clear(); visual.set_effect(effect,.35); visual.sync_render()
			var low: Vector4=visual.surface.material.get_shader_parameter("weights_a")
			visual.set_effect(effect,1); visual.sync_render()
			check(visual.surface.last_texture==body.sprite.texture and visual.surface.visible,id+" "+effect+" binds current alpha source")
			if effect=="poisoned": check(low.x<visual.surface.material.get_shader_parameter("weights_a").x,"per-state intensity is distinct from global opacity")
		visual.extra_effects.clear(); visual.set_effect("poisoned",1); visual.set_effect("petrified",1)
		for zoom in [2.8,5.0]:
			stage.camera.size=zoom
			for angle in [-30,30]:
				stage.camera.position=Vector3(sin(deg_to_rad(angle))*10,4,cos(deg_to_rad(angle))*10); stage.camera.look_at(Vector3(0,.9,0))
				for dir in ["n","ne","e","se","s","sw","w","nw"]:
					Stage.pose(body,"walk" if id!="cow" else "idle",dir,3)
					check(visual.surface.last_texture==body.sprite.texture and visual.surface.layers==body.sprite.layers,"camera/zoom/frame alignment "+id+" "+dir)
	var report: Dictionary={"revision":preload("res://characters/registry.gd").data().revision,"checks":checks,"failures":failures,"occlusionPixels":tested,"leakedPixels":leaked,"scope":"native GPU occlusion, 17 states, 3 source bodies, eight directions, two camera angles and zooms"}
	FileAccess.open(folder.path_join("render-contract.json"),FileAccess.WRITE).store_string(JSON.stringify(report,"\t"))
	print("RENDER CONTRACT ",checks," checks; ",failures.size()," failures; occlusion ",leaked,"/",tested)
	stage.world.free(); quit(0 if failures.is_empty() else 1)
