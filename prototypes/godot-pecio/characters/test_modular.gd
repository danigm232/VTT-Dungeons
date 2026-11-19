extends SceneTree
const Runtime=preload("res://characters/visual_runtime.gd")
const Registry=preload("res://characters/registry.gd")
const Anchors=preload("res://characters/anchors.gd")
var checks:=0
var failures: Array=[]
func check(ok: bool,label: String) -> void:
	checks+=1
	if not ok: failures.append(label); printerr("MODULAR FAIL ",label)
func _initialize() -> void: _run.call_deferred()
func _run() -> void:
	var world:=Node3D.new(); root.add_child(world)
	var camera:=Camera3D.new(); world.add_child(camera); camera.current=true; camera.position=Vector3(0,4,10); camera.look_at(Vector3(0,.9,0))
	var bodies: Array=[]
	for id in ["mike","anteros","cow"]:
		var body=load("res://scenes/player_token.tscn").instantiate(); body.token_name="Mike" if id=="mike" else "Anteros" if id=="anteros" else "Mia"; body.target_height=1.8 if id=="mike" else 2.1 if id=="anteros" else 1.35; body.has_carried_light=false; body.position=Vector3(1,.001,1)
		world.add_child(body); body.set_physics_process(false); body.is_transitioning=true
		if id=="cow": body.char_key="cow"; body.char_profile=Registry.profile(id)
		body._resolve_and_apply_clip("idle","s",true); body._apply_procedural_motion(0,Vector2.ZERO,"idle")
		var visual=Runtime.attach(body,id,true)
		bodies.append(body)
		check(visual!=null and visual.definition.id==id,"actual source registered "+id)
		check(visual.equip("main_hand","shared-sword").ok==(id!="cow"),"shared sword compatibility "+id)
		check(visual.equip("head","steel-helmet").ok==(id!="cow"),"helmet compatibility "+id)
		check(visual.equip("armor","leather-armor").ok==(id!="cow"),"outer armour compatibility "+id)
		check(visual.equip("off_hand","round-shield").ok==(id=="anteros"),"baked book cannot be replaced by shield without mask")
		check(visual.equip("back","traveller-pack").ok==(id!="anteros"),"baked cape cannot be replaced by pack without mask")
		for effect in ["poisoned","petrified","frosted","burned","cursed","invisible"]:
			check(visual.set_effect(effect,.8),"body effect registered "+effect)
			visual.sync_render(); check(visual.surface.bits()>0,"body effect active "+effect)
			visual.set_effect(effect,0)
		check(is_equal_approx(body.sprite.modulate.a,1),"invisibility clears on body and held items")
		for kind in ["roots","webs","chains","binding-ice","spectral-grasp","arcane-bindings"]:
			check(visual.set_binding(kind),"binding registered "+kind)
			visual.sync_render(); check(visual.binding.instance_node.multimesh.instance_count>0,"physical representation exists "+id+" "+kind)
		visual.set_binding("roots"); visual.set_effect("poisoned",.6); visual.set_effect("petrified",.5)
		visual.sync_render(); var rebuilds: int=visual.binding.rebuild_count; visual.sync_render()
		check(visual.binding.rebuild_count==rebuilds,"unchanged pose reuses physical binding geometry "+id)
		for state in ["idle","walk","run","attack"]:
			body._resolve_and_apply_clip(visual.animation_for(state),"s",true)
			for index in range(body.active_clip_frames.size()):
				body.anim_frame_idx=index; body.update_sprite_frame(); body._apply_procedural_motion(0,Vector2.ZERO,state); visual.sync_render()
				check(visual.surface.last_texture==body.sprite.texture,"surface follows frame "+id+" "+state)
				var points:=Anchors.resolved(body,visual.definition)
				for slot in visual.equipment.equipped:
					var node: Node3D=visual.equipment.nodes[slot]
					var anchor_point: Vector3=points[str(node.get_meta("visual_anchor"))]
					check(node.position.distance_to(anchor_point)<body.target_height*.30,"equipment tracks anatomical anchor "+slot)
		var snapshot: Dictionary=visual.state()
		var wire: Dictionary=JSON.parse_string(JSON.stringify(snapshot))
		check(visual.apply_state(wire),"appearance round trip accepts canonical JSON")
		check(visual.equipment.equipped==snapshot.equipment,"equipment restored")
		var bad: Dictionary=wire.duplicate(true); bad.corrections={"idle:s:0":{"head":[22,3]}}
		check(not visual.apply_state(bad),"invalid remote/editor anchor rejected")
		bad=wire.duplicate(true); bad.equipment={"main_hand":"missing-asset"}
		check(not visual.apply_state(bad),"unregistered equipment rejected before mutation")
		check(visual.equipment.equipped==snapshot.equipment,"failed state application preserves existing appearance")
		visual.extra_effects.clear(); visual.rule_effects.clear(); visual.set_binding(""); visual.sync_render()
		check(not visual.surface.visible and not visual.binding.visible,"states clear without leftovers")
	check(bodies[0].collision.shape!=bodies[1].collision.shape,"characters own independent collision shapes")
	check(is_equal_approx(bodies[0].collision.shape.height,bodies[0].target_height*.95),"other character did not resize Mike collision")
	var seed: Dictionary=Registry.data().overlays.poisoned.duplicate(true); seed.shaderEffect="poisoned"
	Registry.data().overlays["test-poison-alias"]=seed
	var sample=bodies[0].get_node("CharacterVisual"); sample.extra_effects.clear(); sample.set_effect("test-poison-alias",.4); sample.sync_render()
	check(sample.surface.bits()==1 and is_equal_approx(sample.surface.weights_a().x,.4),"new overlay data can reuse a tested shader primitive")
	sample.set_effect("test-poison-alias",0); Registry.data().overlays.erase("test-poison-alias")
	var animation: Dictionary={"id":"pivot-fixture","character":"mike","anatomy":"humanoid-tall","action":"test_pivot","direction":"s","fps":3,"referenceHeight":200,"runtimeFrames":[{"file":Registry.data().characters.cow.source.frames[0],"pivot":[.2,.9]}]}
	Registry.data().animations["pivot-fixture"]=animation
	var adapted: Dictionary=Registry.with_animations(bodies[0].char_profile.duplicate(true),Registry.character("mike"))
	check(adapted.dir_states.test_pivot.s.frames.size()==1,"structured animation imports real PNG through the native profile adapter")
	check(is_equal_approx(adapted.dir_states.test_pivot.s.frames[0].floor_offset,-.1),"explicit frame pivot is retained without changing standing scale")
	Registry.data().animations.erase("pivot-fixture")
	var folder:=ProjectSettings.globalize_path("res://../../output/character-modular-20261116")
	var project:=str(ProjectSettings.get_setting("application/config/name","native")).to_lower().replace(" ","-")
	FileAccess.open(folder.path_join("tests-"+project+".json"),FileAccess.WRITE).store_string(JSON.stringify({"checks":checks,"failures":failures,"project":project},"\t"))
	print("MODULAR RUNTIME ",checks," checks; ",failures.size()," failures")
	world.free(); quit(0 if failures.is_empty() else 1)
