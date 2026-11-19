extends RefCounted
const Registry=preload("res://characters/registry.gd")
const Runtime=preload("res://characters/visual_runtime.gd")
static func create(parent: Node,with_floor: bool=false) -> Dictionary:
	var world:=Node3D.new(); world.name="CharacterReviewStage"; parent.add_child(world)
	var env:=WorldEnvironment.new(); env.environment=Environment.new(); env.environment.background_mode=Environment.BG_COLOR; env.environment.background_color=Color("142024"); env.environment.ambient_light_source=Environment.AMBIENT_SOURCE_COLOR; env.environment.ambient_light_energy=.85; world.add_child(env)
	var sun:=DirectionalLight3D.new(); sun.rotation_degrees=Vector3(-45,-25,0); sun.light_energy=.8; world.add_child(sun)
	var camera:=Camera3D.new(); world.add_child(camera); camera.projection=Camera3D.PROJECTION_ORTHOGONAL; camera.size=3.7; camera.position=Vector3(0,4,10); camera.look_at(Vector3(0,.9,0)); camera.current=true
	if with_floor:
		var floor:=MeshInstance3D.new(); var plane:=PlaneMesh.new(); plane.size=Vector2(8,8); floor.mesh=plane; floor.position.y=-.035
		var material:=StandardMaterial3D.new(); material.albedo_color=Color("3e4943"); material.roughness=.92; floor.material_override=material; world.add_child(floor)
	return {"world":world,"camera":camera}
static func actor(world: Node3D,id: String) -> Node3D:
	var d:=Registry.character(id)
	var body=load("res://scenes/player_token.tscn").instantiate(); body.token_name=d.get("name",id)
	if d.has("heightMeters"): body.target_height=float(d.heightMeters)
	else: body.target_height=float(preload("res://sprites/character_stature.gd").data().profiles.get(d.get("statureRef",""),{}).get("meters",1.8))
	body.has_carried_light=false; body.position=Vector3(0,.001,0); body.is_npc=id=="cow" or id=="anteros"
	if d.source.kind=="individual-frames": body.set_meta("stature_preserve_visual",true)
	world.add_child(body); body.set_physics_process(false); body.is_transitioning=true
	body.char_key=str(d.source.get("key",id)); body.char_profile=Registry.profile(id)
	body._resolve_and_apply_clip("idle","s",true); body._apply_procedural_motion(0,Vector2.ZERO,"idle")
	Runtime.attach(body,id,true); return body
static func pose(body: Node3D,state: String="idle",direction: String="s",index: int=0) -> void:
	var visual=body.get_node("CharacterVisual")
	body.facing_dir=direction; body._resolve_and_apply_clip(visual.animation_for(state),direction,true)
	body.anim_frame_idx=mini(index,body.active_clip_frames.size()-1); body.update_sprite_frame(); body._apply_procedural_motion(0,Vector2.ZERO,state)
	visual.sync_render()
