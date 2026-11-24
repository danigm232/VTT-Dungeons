extends SceneTree
const Effects = preload("res://sprites/npc_condition_visuals.gd")
const Art = preload("res://sprites/condition_overlay_library.gd")
const VisualRuntime = preload("res://characters/visual_runtime.gd")
var checks:=0
var failures: Array=[]
func check(ok: bool,label: String) -> void:
	checks+=1
	if not ok: failures.append(label); printerr("CONDITION FAIL ",label)
func _initialize() -> void: _run.call_deferred()
func _run() -> void:
	var world:=Node3D.new(); root.add_child(world)
	var camera:=Camera3D.new(); world.add_child(camera); camera.current=true
	camera.position=Vector3(0,4,10); camera.look_at(Vector3(0,.85,0))
	for spec in preload("res://sprites/capture_condition_overlays.gd").Cases:
		var body=load("res://scenes/player_token.tscn").instantiate()
		body.token_name=spec[1]; body.target_height=spec[2]; body.has_carried_light=false
		body.position=Vector3(1,.01,1); world.add_child(body)
		body.is_transitioning=true; body.set_physics_process(false)
		var initial: Vector3=body.position
		for key in preload("res://sprites/npc_sprite_library.gd").CONDITIONS:
			var actor: Dictionary={"conditions":[key]}
			var original:=JSON.stringify(actor)
			Effects.sync(body,actor)
			check(JSON.stringify(actor)==original,"visual does not mutate rules "+str(spec[0])+" "+key)
			var visual: Node3D=body.get_node("CharacterVisual")
			var canonical: String=Art.active(actor)[0]
			var effect_id: String=VisualRuntime.CONDITION_EFFECTS.get(canonical,"")
			if effect_id.is_empty():
				check(visual.binding.visible and visual.binding.instance_node.multimesh.instance_count>0,"physical restraint has an anchored binding "+key)
			else:
				check(visual.surface.visible and visual.surface.normalized.size()==1 and visual.surface.normalized.has(effect_id),"condition represented once "+str(spec[0])+" "+key)
				check(visual.surface.last_texture==body.sprite.texture,"overlay uses the active frame alpha "+key)
			check(body.position==initial,"visual preserves placement "+key)
		Effects.sync(body,{"conditions":["agarrada","hechizada","paralizada"]})
		var visual: Node3D=body.get_node("CharacterVisual")
		check(visual.binding.visible and visual.surface.normalized.size()==2,"combined binding and silhouette treatments remain visible "+str(spec[0]))
		var combined: Dictionary=visual.surface.normalized.duplicate()
		Effects.sync(body,{"conditions":["paralizada","agarrada","hechizada"]})
		check(combined==visual.surface.normalized and visual.binding.visible,"visual priority independent of insertion order")
		Effects.sync(body,{"conditions":["apresada","restringida"]})
		check(visual.binding.visible and visual.surface.normalized.is_empty(),"legacy restraint aliases share one binding")
		Effects.sync(body,{"conditions":["envenenada"],"condition_immunities":["envenenada"]})
		check(not visual.surface.visible and not visual.binding.visible,"immunity prevents false condition")
		Effects.sync(body,{"conditions":["invisible","petrificada"]})
		check(body.sprite.modulate.a<.3 and visual.surface.normalized.has("petrified"),"invisibility opacity retained alongside petrification")
		Effects.sync(body,{"conditions":[]})
		check(is_equal_approx(body.sprite.modulate.a,1.0) and not visual.surface.visible and not visual.binding.visible,"clearing all restores appearance")
		body.set_meta("character_visual_clock",800.0)
		Effects.sync(body,{"conditions":["envenenada"]},{"reduced_motion":true})
		check(is_zero_approx(visual.surface.material.get_shader_parameter("clock")),"reduced motion freezes the effect")
		Effects.sync(body,{"conditions":["envenenada"]})
		check(is_equal_approx(visual.surface.material.get_shader_parameter("clock"),.8),"normal motion follows shared phase")
		var rig:=Art.rig(body)
		check(not rig.is_empty(),"character has retarget profile "+str(spec[0]))
		body.set_meta("sprite_silhouette_size",Vector2(1.4,.24))
		body.sprite.position.y=body.target_height*body.current_height_scale*(.5+body.current_floor_offset)
		var lying:=Art.placement(body,"inconsciente")
		check(lying.position.y<body.target_height*.25 and lying.scale.x>lying.scale.y,"lying accent follows body")
		world.remove_child(body); body.free()
	var trinity: Dictionary=Art.data().rigs.rogue
	var harpy: Dictionary=Art.data().rigs.harpy
	check(trinity.head_width>harpy.head_width and harpy.torso_width<Art.data().rigs.humanoid.torso_width,"small hero and winged torso have distinct rigs")
	check(Art.texture("envenenada",0).get_image().get_data()!=Art.texture("envenenada",3).get_image().get_data(),"animated poison phases differ")
	check(Art.texture("envenenada",0)==Art.texture("envenenada",0),"vector texture is cached")
	for key in Art.data().art:
		for style in Art.data().styles:
			check(Art.texture(key,0,style)!=null,"every condition has all three treatments "+key+" "+style)
	check(Art.texture("envenenada",0,"mist").get_image().get_data()!=Art.texture("envenenada",0,"runes").get_image().get_data(),"options are different artwork, not only labels")
	check(Art.active({"conditions":["restringida"],"condition_immunities":["apresada"]}).is_empty(),"legacy immunity aliases are symmetric")
	var stature=preload("res://sprites/character_stature.gd")
	for key in stature.data().profiles:
		var body=load("res://scenes/player_token.tscn").instantiate()
		body.token_name=key; body.target_height=1.95; body.position=Vector3(1,.01,1); body.has_carried_light=false
		world.add_child(body); body.set_physics_process(false); body.is_transitioning=true
		check(is_equal_approx(body.target_height,float(stature.data().profiles[key].meters)),"same campaign stature across native maps "+key)
		var saved: Vector3=body.position
		body.target_height=1.46; stature.apply(body,key)
		check(is_equal_approx(body.target_height,1.46) and body.position==saved,"explicit custom stature and placement preserved")
		body.target_height=1.95; body.set_meta("stature_preserve_visual",true); stature.apply(body,key)
		check(is_equal_approx(body.target_height,1.95),"comparison fixture can preserve historical scale")
		body.free()
	var folder:=ProjectSettings.globalize_path("res://../../output/npc-sprites-20261115/overlays-options-20261116")
	DirAccess.make_dir_recursive_absolute(folder)
	var project:=str(ProjectSettings.get_setting("application/config/name","native")).to_lower().replace(" ","-")
	FileAccess.open(folder.path_join("tests-"+project+".json"),FileAccess.WRITE).store_string(JSON.stringify({"project":project,"checks":checks,"failures":failures},"\t"))
	print("CONDITION OVERLAYS ",checks," checks; ",failures.size()," failures")
	world.free(); quit(0 if failures.is_empty() else 1)
