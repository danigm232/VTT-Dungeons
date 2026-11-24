extends SceneTree
var checks := 0
var failures: Array = []
func check(ok: bool,label: String) -> void:
	checks += 1
	if not ok: failures.append(label); printerr("NPC FAIL ",label)
func _initialize() -> void: _run.call_deferred()
func _run() -> void:
	var catalogue = load("res://scripts/character_sprite_catalog.gd")
	var npc = load("res://sprites/npc_sprite_library.gd")
	var visuals = load("res://sprites/npc_condition_visuals.gd")
	var runtime = load("res://sprites/npc_runtime.gd")
	var packed: PackedScene = load("res://scenes/player_token.tscn")
	var species := ["zombie","zombie-2","zombie-3","zombie-4","harpy"]
	if "--species=zombie" in OS.get_cmdline_user_args(): species.pop_back()
	var world := Node3D.new(); root.add_child(world)
	for key in species:
		var profile: Dictionary = catalogue.get_character_clips(key)
		check(profile.has("npc_species"),key+" active NPC library")
		for bucket in ["dir_walk","dir_run","dir_attack"]:
			for direction in catalogue.DIRS:
				var clip: Dictionary = profile.get(bucket,{}).get(direction,{})
				check(clip.get("frames",[]).size()==8,key+" eight "+bucket+" "+direction)
				var hashes := {}
				for frame in clip.get("frames",[]):
					var context := HashingContext.new(); context.start(HashingContext.HASH_SHA256)
					context.update(frame.tex.get_image().get_data()); hashes[context.finish().hex_encode()]=true
				check(hashes.size()==8,key+" unique "+bucket+" "+direction)
		var states: Array = npc.ZOMBIE_ROWS if key.begins_with("zombie") else npc.HARPY_ROWS
		for state in states: check(profile.clips.get(state,{}).get("frames",[]).size()==8,key+" complete "+state)
		var body = packed.instantiate(); body.token_name=key; body.is_npc=true; body.has_carried_light=false
		world.add_child(body); body.set_physics_process(false)
		for condition in npc.CONDITIONS:
			visuals.sync(body,{"conditions":[condition],"condition_immunities":[],"defeated":false})
			var expected: String = npc.condition_pose([condition])
			check(body.get_meta("npc_condition_pose","")==expected,key+" condition "+condition)
			if not expected.is_empty(): check(body._resolve_desired_state(Vector2.ZERO)==expected,key+" pose "+condition)
		visuals.sync(body,{"conditions":["envenenada"],"condition_immunities":["envenenada"]})
		var appearance := body.get_node("CharacterVisual")
		check(not appearance.rule_effects.has("poisoned") and not appearance.surface.visible,key+" immunity clears the active modular overlay")
		visuals.sync(body,{"conditions":["invisible"]})
		check(body.sprite.modulate.a<.3,key+" invisible subdued")
		visuals.sync(body,{"conditions":[]})
		check(is_equal_approx(body.sprite.modulate.a,1.0),key+" cleared invisibility")
		body._resolve_and_apply_clip("condition_derribada","s",true)
		check(body._resolve_desired_state(Vector2.ZERO)=="idle",key+" cleared condition returns to rest")
		runtime.collapse(body,.11)
		check(body.anim_frame_idx>0 and body.is_defeated,key+" collapse advances while frozen")
		runtime.collapse(body,2.0)
		check(body.anim_frame_idx==7,key+" corpse holds last pose")
		runtime.recover(body)
		check(not body.is_defeated and body.active_clip_frames.size()==8,key+" recovery restores living animation")
		body.set_physics_process(false)
		body.free()
		print("NPC PROFILE ",key," complete")
	check(npc.action_pose({"id":"zombie-bite"})=="attack_bite","bite route")
	check(npc.action_pose({"id":"zombie-grapple"})=="grapple","grapple route")
	check(npc.action_pose({"id":"harpy-club"})=="attack_club","club route")
	check(npc.action_pose({"id":"harpy-song"})=="song","song route")
	var actions: Array = load("res://combat/combat_catalogue.gd").actions("zombie")
	for id in ["zombie-slam","zombie-bite","zombie-grapple"]: check(actions.any(func(a): return a.id==id),"campaign attack "+id)
	print("NPC CONTRACT ",checks," checks; ",failures.size()," failures")
	var directory:=ProjectSettings.globalize_path("res://../../output/npc-sprites-20261115")
	DirAccess.make_dir_recursive_absolute(directory)
	var project:=str(ProjectSettings.get_setting("application/config/name","native")).to_lower().replace(" ","-")
	FileAccess.open(directory.path_join("tests-"+project+".json"),FileAccess.WRITE).store_string(JSON.stringify({"checks":checks,"failures":failures,"project":project,"species":species},"\t"))
	world.free(); quit(0 if failures.is_empty() else 1)
