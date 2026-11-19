extends SceneTree
const Registry=preload("res://characters/registry.gd")
const Service=preload("res://characters/character_service.gd")
class Controller:
	extends Node
	var bodies: Dictionary={}
	func token(id: String) -> Node3D: return bodies.get(id)
func _initialize() -> void: _run.call_deferred()
func _run() -> void:
	Registry.inspect_candidate()
	var controller:=Controller.new(); root.add_child(controller)
	var service:=Service.new(); root.add_child(service); service.set_process(false); service.controller=controller
	var checked:=0
	for id in ["mike","mia","maria","harpy","zombie","zombie-2","zombie-3","zombie-4","sw-runara","sw-fire-snake"]:
		var definition:=Registry.character(id)
		var body=load("res://scenes/player_token.tscn").instantiate()
		body.token_name=definition.name; body.has_carried_light=false; body.position=Vector3(2,0,3); body.facing_dir="se" if id in ["mike","mia","maria"] else "s"
		root.add_child(body); body.set_physics_process(false); body.is_transitioning=true
		if definition.source.kind=="legacy-profile":
			body.char_key=str(definition.source.key)
			body.char_profile=load("res://scripts/character_sprite_catalog.gd").get_character_clips(body.char_key)
		controller.bodies[id]=body
		var position_before: Vector3=body.position; var height_before: float=body.target_height
		var walk_before: int=body.char_profile.get("dir_walk",{}).size()
		service.actor(id)
		assert(body.active_clip_frames.size()==8,id+": actor service must apply all eight idle phases immediately")
		assert(body.position==position_before and body.target_height==height_before,id+": appearance must preserve position and game-owned stature")
		if definition.source.kind=="legacy-profile": assert(body.char_profile.get("dir_walk",{}).size()==walk_before,id+": retain existing movement directions")
		else: assert(body.char_profile.get("individual_source",false),id+": use the actual registered NPC body")
		if id=="harpy" or id.begins_with("zombie") or id.begins_with("sw-"):
			var idle_texture: Texture2D=body.active_clip_frames[0].tex
			body.process_frame_animation(3.0/body.active_clip_fps+.00001)
			var ambient_phase: int=body.anim_frame_idx
			body._resolve_and_apply_clip("combat_idle","s",true)
			assert(body.active_clip_frames.size()==8 and body.active_clip_frames[0].tex==idle_texture,id+": ambient idle changes must keep the registered stance")
			assert(body.anim_frame_idx==ambient_phase,id+": ambient state transition must preserve breathing phase")
			body._resolve_and_apply_clip("idle","s",true)
			assert(body.anim_frame_idx==ambient_phase,id+": returning to idle must preserve breathing phase")
		body.process_frame_animation(3.0/body.active_clip_fps+.00001); var phase: int=body.anim_frame_idx
		service.actor(id); assert(body.anim_frame_idx==phase,id+": repeated access must not reset the animation")
		controller.bodies.erase(id); root.remove_child(body); body.free(); checked+=1
	service.free(); controller.free()
	print("STORMWRECK SERVICE ",checked," actors: immediate idle, actual body, preserved pose/scale/locomotion and idempotent access")
	quit()
