extends SceneTree
var checks:=0
var failures: Array=[]
func check(ok: bool,label: String) -> void:
	checks+=1
	if not ok: failures.append(label); printerr("NPC REGRESSION FAIL ",label)
func _initialize() -> void: _run.call_deferred()
func _run() -> void:
	var runtime=load("res://sprites/npc_runtime.gd")
	var conditions=load("res://sprites/npc_condition_visuals.gd")
	var facing=load("res://sprites/sprite_facing.gd")
	var world:=Node3D.new(); root.add_child(world)
	var camera:=Camera3D.new(); world.add_child(camera); camera.current=true
	camera.position=Vector3(0,4,10); camera.look_at(Vector3(0,.8,0))
	var fixture=preload("res://sprites/npc_test_controller.gd").new(); world.add_child(fixture)
	fixture.ui=preload("res://sprites/npc_test_ui.gd").new(); world.add_child(fixture.ui)
	var catalogue=load("res://scripts/character_sprite_catalog.gd")
	var initial_legacy_images: int=catalogue._raw_img_cache.size()
	for key in ["harpy","zombie","zombie-2","harpy-2"]:
		var body=load("res://scenes/player_token.tscn").instantiate()
		body.token_name=key; body.is_npc=true; body.has_carried_light=false
		body.position=Vector3(0,.5,0) # Do not invoke the camp's intentional zero-position spawn.
		world.add_child(body); body.set_physics_process(false); body.is_transitioning=true
		fixture.bodies[key]=body; fixture.rules.register({"id":key,"kind":"enemy","name":key,"hp":22,"hp_max":22})
	check(catalogue._raw_img_cache.size()==initial_legacy_images,"current NPCs do not decode unused legacy collages")
	var harpy: Node3D=fixture.bodies.harpy
	var zombie: Node3D=fixture.bodies.zombie; zombie.position.x=3
	var visuals=load("res://combat/combat_visuals.gd").new(); visuals.controller=fixture; world.add_child(visuals); visuals.set_process(false)
	visuals.play({"type":"action","actor":"harpy","target":"zombie","action":{"id":"harpy-claws","animationType":"melee"},"hit":false,"amount":0})
	visuals.play({"type":"action","actor":"harpy","target":"zombie","action":{"id":"harpy-club","animationType":"melee"},"hit":false,"amount":0})
	check(harpy.current_anim=="attack","multiattack starts with claws, not overwritten by club")
	visuals._process(.4); check(harpy.current_anim=="attack","first animation can reach contact")
	visuals._process(.5); check(harpy.current_anim=="attack_club","club follows completed claws")
	visuals._process(1); check(not visuals.has_pending_visual("harpy"),"completed sequence releases actor")
	check(visuals._audio_path({"id":"harpy-song"},"song").ends_with("harpy-song.ogg"),"song has its own cue")
	check(visuals._audio_path({"id":"zombie-bite"},"attack_bite").ends_with("zombie-groan.wav"),"bite does not use sword sound")
	check(visuals._audio_stream(visuals._audio_path({"id":"harpy-song"},"song"))!=null,"song stream loads")
	check(visuals._audio_stream(visuals._audio_path({"id":"zombie-bite"},"attack_bite"))!=null,"zombie stream loads")
	for yaw in [-30.0,0.0,30.0]:
		camera.position=Vector3(sin(deg_to_rad(yaw))*10,4,cos(deg_to_rad(yaw))*10); camera.look_at(Vector3(0,.8,0))
		var dirs: Array=["n","ne","e","se","s","sw","w","nw"]
		for i in range(dirs.size()):
			var wanted: String=dirs[posmod(i+(1 if yaw>0 else -1 if yaw<0 else 0),8)]
			check(facing.view_direction(harpy,dirs[i])==wanted,"view direction "+str(yaw)+" "+dirs[i])
			harpy.facing_dir=dirs[i]; harpy._resolve_and_apply_clip("attack",dirs[i],true)
			check(harpy.sprite.texture.region==harpy.char_profile.dir_attack[wanted].frames[0].tex.region,"runtime chooses camera-relative attack "+wanted)
			check(harpy.facing_dir==dirs[i],"camera preserves canonical heading")
	camera.position=Vector3(5,4,8.660254); camera.look_at(Vector3(0,.8,0))
	harpy.facing_dir="n"; harpy._resolve_and_apply_clip("condition_paralizada","n",true)
	check(harpy.sprite.texture.atlas==harpy.char_profile.dir_idle.ne.frames[0].tex.atlas and harpy.sprite.texture.region==harpy.char_profile.dir_idle.ne.frames[0].tex.region,"frozen pose keeps its direction relative to camera")
	camera.position=Vector3(0,4,10); camera.look_at(Vector3(0,.8,0))
	harpy.facing_dir="n"
	visuals.play({"type":"action","actor":"harpy","target":"harpy","action":{"id":"self-effect","magical":true,"healing":true},"hit":false,"amount":0})
	check(harpy.facing_dir=="n","self effect does not rotate actor east")
	check(harpy.current_anim=="spell","self healing does not replace the caster's animation with rest")
	visuals._process(2)
	visuals.play({"type":"action","actor":"harpy","target":"","point":Vector3(0,0,-5),"action":{"id":"harpy-song","magical":true},"hit":false,"amount":0})
	check(harpy.facing_dir=="n","point action faces selected area")
	visuals._process(2)
	conditions.sync(zombie,{"conditions":["derribada"]})
	check(zombie._resolve_desired_state(Vector2.RIGHT)=="crawl","prone movement uses alternating crawl")
	conditions.sync(zombie,{"conditions":["derribada","inconsciente"]})
	check(zombie._resolve_desired_state(Vector2.RIGHT)=="condition_inconsciente","unconscious actor cannot switch to crawl")
	conditions.sync(zombie,{"conditions":[]})
	zombie._resolve_and_apply_clip("condition_inconsciente","s",true)
	conditions.sync(zombie,{"conditions":["inconsciente"]})
	var accent: Sprite3D=zombie.get_node("NpcConditionAccent")
	check(accent.position.y<zombie.target_height*.25,"lying condition stays on the body, not over its head")
	check(accent.scale.x>accent.scale.y,"lying accent follows a horizontal silhouette")
	zombie._resolve_and_apply_clip("idle","s",true)
	conditions.sync(zombie,{"conditions":["agarrada"]})
	check(accent.position.y>zombie.target_height*.4,"standing accent returns to torso height")
	conditions.sync(zombie,{"conditions":[]})
	zombie.play_action_animation("idle"); zombie.facing_dir="w"
	zombie._process_npc_ambience(20)
	check(zombie.current_anim=="idle" and zombie.facing_dir=="w","ambient timer cannot turn idle NPC")
	harpy.play_action_animation("idle"); harpy._process_npc_ambience(6)
	check(harpy.current_anim=="idle","grounded harpy cannot fly from idle timer")
	harpy.play_action_animation("song",.8); harpy.action_lock_timer=0; harpy.action_anim_name=""
	check(harpy._resolve_desired_state(Vector2.ZERO)=="idle","completed song returns to last heading")
	var second: Node3D=fixture.bodies["harpy-2"]
	second.set_meta("npc_reinforcement_visible",false); second.hide()
	runtime.collapse(second,1); runtime.recover(second)
	await process_frame
	check(not second.is_physics_processing() and second.collision.disabled,"hidden recovery stays nonblocking")
	fixture.rules.actors["harpy-2"].defeated=true
	visuals._process(.1)
	fixture.rules.actors["harpy-2"].defeated=false
	visuals._process(.1); await process_frame
	check(not second.is_physics_processing() and second.collision.disabled,"pool cleanup cannot activate hidden corpse")
	second.show(); conditions.sync(second,fixture.rules.actors["harpy-2"]); await process_frame
	check(second.is_physics_processing() and not second.collision.disabled,"revealed live reinforcement regains controls")
	second.hide(); conditions.sync(second,fixture.rules.actors["harpy-2"]); await process_frame
	check(not second.is_physics_processing() and second.collision.disabled,"hiding again disables collision")
	visuals.play({"type":"action","actor":"harpy","target":"zombie","action":{"id":"harpy-claws"},"hit":false,"amount":0})
	fixture.rules.pending={"kind":"fortitude","owner":"zombie"}; visuals._process(.1)
	fixture.rules.pending.clear(); fixture.rules.actors.zombie.hp=1; visuals._process(2)
	check(zombie.current_anim=="fortitude" and not zombie.is_defeated,"fast fortitude save still plays recovery after hit")
	var variant: Node3D=fixture.bodies["zombie-2"]
	check(not variant.char_profile.clips.has("swim"),"variant cannot inherit another sailor's swimming clothes")
	print("NPC REGRESSIONS ",checks," checks; ",failures.size()," failures")
	var folder:=ProjectSettings.globalize_path("res://../../output/npc-sprites-audit-20261116")
	DirAccess.make_dir_recursive_absolute(folder)
	var project:=str(ProjectSettings.get_setting("application/config/name","native")).to_lower().replace(" ","-")
	FileAccess.open(folder.path_join("regressions-"+project+".json"),FileAccess.WRITE).store_string(JSON.stringify({"checks":checks,"failures":failures,"project":project},"\t"))
	world.free(); quit(0 if failures.is_empty() else 1)
