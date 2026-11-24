extends SceneTree
const Surface=preload("res://characters/body_surface.gd")
const Registry=preload("res://characters/registry.gd")
var checks:=0
var failures: Array=[]
func check(ok: bool,label: String) -> void:
	checks+=1
	if not ok: failures.append(label); printerr("MODULAR SURFACE FAIL ",label)
func _initialize() -> void: _run.call_deferred()
func _run() -> void:
	root.size=Vector2i(1280,720)
	var world:=Node3D.new(); root.add_child(world)
	var env:=WorldEnvironment.new(); env.environment=Environment.new(); env.environment.background_mode=Environment.BG_COLOR; env.environment.background_color=Color("142024"); env.environment.ambient_light_source=Environment.AMBIENT_SOURCE_COLOR; env.environment.ambient_light_energy=.85; world.add_child(env)
	var camera:=Camera3D.new(); world.add_child(camera); camera.projection=Camera3D.PROJECTION_ORTHOGONAL; camera.size=3.7; camera.position=Vector3(0,4,10); camera.look_at(Vector3(0,.9,0)); camera.current=true
	var capture:=DisplayServer.get_name()!="headless"
	var folder:=ProjectSettings.globalize_path("res://../../output/character-modular-20261116")
	DirAccess.make_dir_recursive_absolute(folder)
	for id in ["mike","anteros","cow"]:
		var definition:=Registry.character(id)
		var body=load("res://scenes/player_token.tscn").instantiate(); body.token_name="Mike" if id=="mike" else "Anteros" if id=="anteros" else "Mia"; body.target_height=1.8 if id=="mike" else 2.1 if id=="anteros" else 1.35; body.has_carried_light=false; body.position=Vector3(0,.001,0)
		world.add_child(body); body.set_physics_process(false); body.is_transitioning=true
		if id=="cow": body.char_key="cow"; body.char_profile=Registry.profile(id)
		body._resolve_and_apply_clip("idle","s",true); body._apply_procedural_motion(0,Vector2.ZERO,"idle")
		var surface=Surface.new(); surface.body=body; body.add_child(surface)
		for effect in ["poisoned","petrified","frosted","burned","cursed","invisible"]:
			surface.effects={effect:.9}; surface.intensity=.95; body.set_meta("character_visual_clock",650.0); surface.follow()
			check(surface.visible and surface.last_texture==body.sprite.texture,"current frame bound "+id+" "+effect)
			check(surface.material.get_shader_parameter("effect_bits")>0,"effect declared "+effect)
			if capture:
				for i in range(3): await process_frame
				RenderingServer.force_draw(false); await process_frame
				root.get_texture().get_image().save_png(folder.path_join("surface-"+id+"-"+effect+".png"))
		for state in ["idle","walk","run","attack"]:
			body._resolve_and_apply_clip(state,"e",true)
			for index in range(body.active_clip_frames.size()):
				body.anim_frame_idx=index; body.update_sprite_frame(); body._apply_procedural_motion(0,Vector2.ZERO,state); surface.follow()
				check(surface.transform.origin.distance_to(body.sprite.transform.origin)<.02,"effect follows the rendered pivot "+id+" "+state)
				check(surface.last_texture==body.sprite.texture,"effect follows animation texture "+id+" "+state)
				check(surface.material.get_shader_parameter("flip_h")==body.sprite.flip_h,"effect follows mirrored view")
		surface.effects={}; surface.follow(); check(not surface.visible,"clearing state clears surface "+id)
		world.remove_child(body); body.free()
	print("MODULAR SURFACE ",checks," checks; ",failures.size()," failures")
	FileAccess.open(folder.path_join("surface-tests.json"),FileAccess.WRITE).store_string(JSON.stringify({"checks":checks,"failures":failures},"\t"))
	world.free(); quit(0 if failures.is_empty() else 1)
