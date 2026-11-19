extends SceneTree
const Stage=preload("res://characters/review_stage.gd")
func _initialize() -> void: _run.call_deferred()
func _run() -> void:
	root.size=Vector2i(1280,720)
	var stage:=Stage.create(root)
	var folder:=ProjectSettings.globalize_path("res://../../output/character-modular-20261116")
	DirAccess.make_dir_recursive_absolute(folder)
	var originals: Array=[]
	for id in ["mike","anteros","cow"]:
		var body=Stage.actor(stage.world,id)
		var visual=body.get_node("CharacterVisual")
		body.set_meta("character_visual_clock",650.0)
		var cases: Array=["base","poisoned","petrified","frosted","burned","cursed","invisible","paralysed","charmed","frightened","blinded","deafened","stunned","unconscious","exhaustion","incapacitated","prone","hidden","roots","webs","chains","binding-ice","spectral-grasp","arcane-bindings","variant"]
		if id!="cow" and "--equipment-preview" in OS.get_cmdline_user_args(): cases.append_array(["helmet","armor","sword","equipped","equipped-poisoned","equipped-petrified"])
		for example in cases:
			for slot in visual.equipment.equipped.keys(): visual.equip(slot,"")
			visual.extra_effects.clear(); visual.set_binding("")
			if preload("res://characters/registry.gd").data().overlays.has(example): visual.set_effect(example,1)
			elif example in ["roots","webs","chains","binding-ice","spectral-grasp","arcane-bindings"]: visual.set_binding(example)
			if example=="helmet" or example.begins_with("equipped"): visual.equip("head","steel-helmet")
			if example=="armor" or example.begins_with("equipped"): visual.equip("armor","leather-armor")
			if example=="sword" or example.begins_with("equipped"): visual.equip("main_hand","shared-sword")
			if example.begins_with("equipped"):
				visual.equip("back","traveller-pack") if id=="mike" else visual.equip("off_hand","round-shield")
				if example=="equipped-poisoned": visual.set_effect("poisoned",1)
				if example=="equipped-petrified": visual.set_effect("petrified",1)
			Stage.pose(body)
			if example=="variant" and id=="mike": visual.apply_variant("mike-arcane-patina")
			for i in range(4): await process_frame
			RenderingServer.force_draw(false); await process_frame
			var file: String=id+"-"+example+".png"
			root.get_texture().get_image().save_png(folder.path_join(file))
			originals.append({"actor":id,"case":example,"file":file,"camera":[0,4,10],"target":[0,.9,0],"orthographicSize":3.7,"clockMs":650,"appearance":visual.state(),"revision":preload("res://characters/registry.gd").data().revision})
		if id!="cow":
			for state in ["walk","attack"]:
				for dir in ["s","e","n","w"]:
					for index in [0,2,4,6]:
						Stage.pose(body,state,dir,index)
						for i in range(2): await process_frame
						RenderingServer.force_draw(false); await process_frame
						var file: String=id+"-"+state+"-"+dir+"-"+str(index)+".png"
						root.get_texture().get_image().save_png(folder.path_join(file))
						originals.append({"actor":id,"case":"animation","animation":state,"direction":dir,"requestedFrame":index,"actualFrame":body.anim_frame_idx,"file":file,"camera":[0,4,10],"target":[0,.9,0],"orthographicSize":3.7,"clockMs":650,"appearance":visual.state(),"revision":preload("res://characters/registry.gd").data().revision})
		stage.world.remove_child(body); body.free()
	FileAccess.open(folder.path_join("modular-captures.json"),FileAccess.WRITE).store_string(JSON.stringify(originals,"\t"))
	print("MODULAR CAPTURES ",originals.size()," native condition/animation samples complete; clothing deferred")
	stage.world.free(); quit()
