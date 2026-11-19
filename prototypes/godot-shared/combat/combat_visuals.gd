extends Node3D
var controller: Node
var pools: Dictionary={}
var clouds: Dictionary={}
var soft: GradientTexture2D
var sound: AudioStreamPlayer
var action_events: Array[Dictionary]=[]
var active_event: Dictionary={}
var action_wait:=0.0
var audio_cache: Dictionary={}

func _ready() -> void:
	soft=GradientTexture2D.new(); soft.width=128; soft.height=128
	soft.fill=GradientTexture2D.FILL_RADIAL; soft.fill_from=Vector2(.5,.5); soft.fill_to=Vector2(1,.5)
	var gradient:=Gradient.new(); gradient.set_color(0,Color(1,1,1,.5)); gradient.set_color(1,Color(1,1,1,0)); soft.gradient=gradient
	sound=AudioStreamPlayer.new(); sound.volume_db=-15; add_child(sound)

func _process(delta: float) -> void:
	if controller==null: return
	_advance_actions(delta)
	for id in controller.rules.actors:
		var actor: Dictionary=controller.rules.actors[id]
		var body: Node3D=controller.token(id)
		if body==null: continue
		var reduced_conditions: bool=bool(controller.ui.preferences.values.get("reducedMotion",false)) if controller.ui and "preferences" in controller.ui and controller.ui.preferences else false
		preload("res://sprites/npc_condition_visuals.gd").sync(body,actor,{"reduced_motion":reduced_conditions})
		var waiting: bool = (controller.rules.pending.get("kind","")=="fortitude" and controller.rules.pending.get("owner","")==id) or controller.rules.followups.any(func(followup): return followup.get("kind","")=="fortitude" and followup.get("owner","")==id)
		if waiting and body.char_profile.get("npc_species","")=="zombie": body.set_meta("npc_fortitude_seen",true)
		if has_pending_visual(str(id)): continue
		if not waiting and body.has_meta("npc_fortitude_seen"):
			body.remove_meta("npc_fortitude_seen")
			if not actor.defeated and not body.has_meta("npc_collapsing"): body.play_action_animation("fortitude",.8)
		if waiting:
			if body.char_profile.has("npc_species"): preload("res://sprites/npc_runtime.gd").collapse(body,delta)
			continue
		if not actor.defeated and body.has_meta("npc_collapsing"):
			preload("res://sprites/npc_runtime.gd").recover(body)
		if not controller.rules.sequence.is_empty() and controller.rules.visual_queue.any(func(event): return event.get("target","")==id): continue
		if actor.defeated:
			if body.char_profile.has("npc_species"):
				preload("res://sprites/npc_runtime.gd").collapse(body,delta)
			else:
				if not body.get("is_defeated"): body.play_action_animation("defeated")
				body._apply_procedural_motion(0,Vector2.ZERO,"defeated")
			body.set_physics_process(false)
			if body.get("collision"): body.collision.set_deferred("disabled",true)
			if not pools.has(id):
				var mesh:=MeshInstance3D.new(); var plane:=PlaneMesh.new(); plane.size=Vector2(2.2,1.5) if body.target_height>1.8 else Vector2(1.6,1.1); mesh.mesh=plane
				var material:=StandardMaterial3D.new(); material.transparency=BaseMaterial3D.TRANSPARENCY_ALPHA
				material.albedo_texture=soft; material.albedo_color=Color("8b242e") if actor.get("defeat_style","")=="blood" else Color("7ba5cc")
				material.shading_mode=BaseMaterial3D.SHADING_MODE_UNSHADED; mesh.material_override=material; mesh.cast_shadow=GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
				add_child(mesh); pools[id]=mesh
			pools[id].material_override.albedo_color=Color("8b242e") if actor.get("defeat_style","")=="blood" else Color("7ba5cc")
			pools[id].global_transform=Transform3D(body.get_parent().global_basis,body.global_position+Vector3.UP*.025)
		elif pools.has(id):
			pools[id].queue_free(); pools.erase(id)
			if not body.char_profile.has("npc_species"):
				body.play_action_animation("idle")
				body.set_physics_process(true)
				if body.get("collision"): body.collision.set_deferred("disabled",false)
	var ids: Array=[]
	for effect in controller.rules.effects:
		if effect.kind!="fog": continue
		var id: String=effect.actor; ids.append(id)
		if not clouds.has(id):
			var root:=Node3D.new(); root.name="FogVolume_"+id; add_child(root)
			for i in range(18):
				var puff:=Sprite3D.new(); puff.texture=soft; puff.billboard=BaseMaterial3D.BILLBOARD_ENABLED
				puff.modulate=Color(.7,.78,.82,.7); puff.no_depth_test=false
				var angle:=i*2.39996323; var spread:=sqrt((i+.5)/18.0)*4.6
				puff.pixel_size=2.0*(6.0-spread)/128.0
				puff.position=Vector3(cos(angle)*spread,1.0+1.3*(1-spread/6.0),sin(angle)*spread)
				root.add_child(puff)
			clouds[id]=root
		clouds[id].global_position=effect.point
		var reduced: bool=controller.ui.preferences.values.reducedMotion or (bool(controller.ui.ship_env.get("reduced_effects")) if controller.ui.ship_env else controller.ui._fallback_reduced)
		for puff in clouds[id].get_children(): puff.scale=Vector3.ONE*(.9 if reduced else .85+.12*sin(Time.get_ticks_msec()*.0005+puff.get_index()))
	for id in clouds.keys():
		if id not in ids: clouds[id].queue_free(); clouds.erase(id)


func play(event: Dictionary) -> void:
	if event.get("type","")!="action": return
	action_events.append(event.duplicate(true))
	if active_event.is_empty(): _advance_actions(0.0)

func _advance_actions(delta: float) -> void:
	action_wait=maxf(0.0,action_wait-delta)
	if action_wait>0.0: return
	active_event={}
	while not action_events.is_empty():
		var event: Dictionary=action_events.pop_front()
		var duration:=_play_now(event)
		if duration<=0.0: continue
		active_event=event; action_wait=duration+.06
		break

func has_pending_visual(id: String) -> bool:
	if not active_event.is_empty() and id in [str(active_event.get("actor","")),str(active_event.get("target",""))]: return true
	return action_events.any(func(event): return id in [str(event.get("actor","")),str(event.get("target",""))])

func _audio_path(action: Dictionary, pose: String) -> String:
	if action.get("id","")=="harpy-song" or pose=="song": return "res://sprites/audio/harpy-song.ogg"
	if str(action.get("id","")).begins_with("zombie-"): return "res://sprites/audio/zombie-groan.wav"
	return "res://combat/audio/"+("spell.ogg" if action.get("magical",false) or pose.begins_with("spell") else "weapon.ogg")

func _audio_stream(path: String) -> AudioStream:
	if not audio_cache.has(path):
		audio_cache[path]=AudioStreamWAV.load_from_file(ProjectSettings.globalize_path(path)) if path.ends_with(".wav") else AudioStreamOggVorbis.load_from_file(ProjectSettings.globalize_path(path))
	return audio_cache[path]

func _play_now(event: Dictionary) -> float:
	if event.get("type","")!="action": return 0.0
	var actor: Node3D=controller.token(str(event.actor)); var target: Node3D=controller.token(str(event.target))
	if not is_instance_valid(actor): return 0.0
	if target:
		var direction: Vector3=target.global_position-actor.global_position
		if Vector2(direction.x,direction.z).length_squared()>.0001: actor.facing_dir=actor._dir_from_vector(Vector2(direction.x,direction.z))
	elif event.has("point"):
		var direction: Vector3=event.point-actor.global_position
		if Vector2(direction.x,direction.z).length_squared()>.0001: actor.facing_dir=actor._dir_from_vector(Vector2(direction.x,direction.z))
	var action: Dictionary=event.action
	var animation: String=action.get("animationType","melee")
	var pose: String="attack_arrow" if animation in ["arrow","radiantArrow"] else "attack_throw" if animation=="thrownWeapon" else "spell" if action.get("magical",false) or animation in ["spell","fireProjectile","magicalProjectile"] else "attack"
	if str(action.id).ends_with("unarmed") and not actor.char_profile.get("dir_states",{}).get("attack_unarmed",{}).is_empty(): pose="attack_unarmed"
	if str(action.id).begins_with("fog-cloud"): pose="spell_fog"
	if action.id=="feather-fall": pose="spell_feather"
	var npc_pose: String=preload("res://sprites/npc_sprite_library.gd").action_pose(action)
	if not npc_pose.is_empty() and actor.char_profile.has("npc_species"): pose=npc_pose
	var view_dir: String=preload("res://sprites/sprite_facing.gd").view_direction(actor,actor.facing_dir)
	var clip: Dictionary=actor._pick_clip_from_profile(pose,view_dir)
	var duration:=clampf(clip.get("frames",[]).size()/maxf(1,float(clip.get("fps",8))),.65,2.0)
	actor.play_action_animation(pose,duration)
	if target and action.get("healing",false):
		var glow:=Sprite3D.new(); glow.texture=soft; glow.billboard=BaseMaterial3D.BILLBOARD_ENABLED
		glow.pixel_size=.014; glow.modulate=Color(.35,1,.6,.65); target.add_child(glow); glow.position=Vector3.UP*target.target_height*.5
		var heal_tween:=create_tween(); heal_tween.tween_property(glow,"modulate:a",0.0,.75); heal_tween.tween_callback(glow.queue_free)
		if target!=actor: target.play_action_animation("combat_idle",.6)
	if target and event.get("hit",false) and int(event.get("amount",0))>0 and not action.get("healing",false):
		var tween:=create_tween(); tween.tween_interval(duration*.5)
		tween.tween_callback(func():
			if is_instance_valid(target) and not target.is_defeated: target.play_action_animation("hit_fire" if action.get("damageType","")=="fuego" else "hit_arcane" if pose.begins_with("spell") else "hit_physical",.45)
		)
	var path: String=_audio_path(action,pose)
	if FileAccess.file_exists(path) and not controller.ui.audio_muted:
		sound.stream=_audio_stream(path)
		if sound.stream: sound.play()
	if target and animation in ["arrow","radiantArrow","thrownWeapon","fireProjectile","magicalProjectile"]:
		var projectile:=MeshInstance3D.new(); var mesh:=SphereMesh.new(); mesh.radius=.085; mesh.height=.17; projectile.mesh=mesh
		var mat:=StandardMaterial3D.new(); mat.albedo_color=Color("ff9b5a") if animation=="fireProjectile" else Color("a8c6ff"); mat.shading_mode=BaseMaterial3D.SHADING_MODE_UNSHADED; projectile.material_override=mat
		add_child(projectile); projectile.global_position=actor.global_position+Vector3.UP
		var tween:=create_tween(); tween.tween_property(projectile,"global_position",target.global_position+Vector3.UP,.24); tween.tween_callback(projectile.queue_free)

	return maxf(duration,float(actor.action_lock_timer))
