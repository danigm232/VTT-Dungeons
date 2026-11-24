extends Node3D
const Cues = preload("res://combat/combat_cues.gd")
const NpcRuntime = preload("res://sprites/npc_runtime.gd")
const Conditions = preload("res://sprites/npc_condition_visuals.gd")
const Facing = preload("res://sprites/sprite_facing.gd")
var controller: Node
var pools: Dictionary={}
var clouds: Dictionary={}
var soft: GradientTexture2D
var sound: AudioStreamPlayer
var action_events: Array[Dictionary]=[]
var active_event: Dictionary={}
var action_wait:=0.0
var audio_cache: Dictionary={}
var cues: Node3D
var fallen: Dictionary = {}

func _ready() -> void:
	soft=GradientTexture2D.new(); soft.width=128; soft.height=128
	soft.fill=GradientTexture2D.FILL_RADIAL; soft.fill_from=Vector2(.5,.5); soft.fill_to=Vector2(1,.5)
	var gradient:=Gradient.new(); gradient.set_color(0,Color(1,1,1,.5)); gradient.set_color(1,Color(1,1,1,0)); soft.gradient=gradient
	sound=AudioStreamPlayer.new(); sound.volume_db=-15; add_child(sound)
	cues = Cues.new()
	cues.name = "CombatCues"
	cues.soft = soft
	add_child(cues)

func _reduced_motion() -> bool:
	var ui: Node = controller.ui
	if "preferences" in ui and is_instance_valid(ui.preferences) and ui.preferences.values.get("reducedMotion", false): return true
	if "ship_env" in ui and is_instance_valid(ui.ship_env): return bool(ui.ship_env.get("reduced_effects"))
	return "_fallback_reduced" in ui and ui._fallback_reduced

func _process(delta: float) -> void:
	if controller==null: return
	_advance_actions(delta)
	var reduced := _reduced_motion()
	for id in pools.keys():
		if not is_instance_valid(controller.token(id)):
			pools[id].queue_free()
			pools.erase(id)
			fallen.erase(id)
	for id in controller.rules.actors:
		var actor: Dictionary=controller.rules.actors[id]
		var body: Node3D=controller.token(id)
		if body==null: continue
		Conditions.sync(body, actor, {"reduced_motion": reduced})
		var waiting: bool = (controller.rules.pending.get("kind","")=="fortitude" and controller.rules.pending.get("owner","")==id) or controller.rules.followups.any(func(followup): return followup.get("kind","")=="fortitude" and followup.get("owner","")==id)
		if waiting and body.char_profile.get("npc_species","")=="zombie": body.set_meta("npc_fortitude_seen",true)
		if has_pending_visual(str(id)): continue
		if not waiting and body.has_meta("npc_fortitude_seen"):
			body.remove_meta("npc_fortitude_seen")
			if not actor.defeated and not body.has_meta("npc_collapsing"): body.play_action_animation("fortitude",.8)
		if waiting:
			if body.char_profile.has("npc_species"): NpcRuntime.collapse(body, delta)
			continue
		if not actor.defeated and body.has_meta("npc_collapsing"):
			NpcRuntime.recover(body)
		if not controller.rules.sequence.is_empty() and controller.rules.visual_queue.any(func(event): return event.get("target","")==id): continue
		if actor.defeated:
			if body.char_profile.has("npc_species"):
				NpcRuntime.collapse(body, delta)
			else:
				if not fallen.has(id):
					var fall_duration := 0.0
					if _has_pose(body, "fall") and not reduced and body.is_visible_in_tree():
						body.play_action_animation("fall", .45)
						fall_duration = body.action_lock_timer
					else: body.play_action_animation("defeated")
					fallen[id] = {"body": body, "physics": body.is_physics_processing(), "collision": body.collision.disabled if body.collision else false, "fall_remaining": fall_duration}
					body.is_defeated = true
					body.set_physics_process(false)
					if body.collision: body.collision.set_deferred("disabled", true)
				var fall: Dictionary = fallen[id]
				if fall.fall_remaining > 0.0:
					if body.has_method("process_frame_animation"): body.process_frame_animation(delta)
					else: body._process_frame_animation(delta)
					fall.fall_remaining = maxf(0.0, float(fall.fall_remaining) - delta)
					if fall.fall_remaining == 0.0: body.play_action_animation("defeated")
				body._apply_procedural_motion(0, Vector2.ZERO, "fall" if fall.fall_remaining > 0.0 else "defeated")
			if not pools.has(id):
				var mesh:=MeshInstance3D.new(); var plane:=PlaneMesh.new(); plane.size=Vector2(2.2,1.5) if body.target_height>1.8 else Vector2(1.6,1.1); mesh.mesh=plane
				var material:=StandardMaterial3D.new(); material.transparency=BaseMaterial3D.TRANSPARENCY_ALPHA
				material.albedo_texture=soft; material.albedo_color=Color("8b242e") if actor.get("defeat_style","")=="blood" else Color("7ba5cc")
				material.shading_mode=BaseMaterial3D.SHADING_MODE_UNSHADED; mesh.material_override=material; mesh.cast_shadow=GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
				add_child(mesh); pools[id]=mesh
			pools[id].material_override.albedo_color=Color("8b242e") if actor.get("defeat_style","")=="blood" else Color("7ba5cc")
			var ground_basis: Basis = body.get_parent().global_basis
			pools[id].global_transform = Transform3D(ground_basis, body.global_position + ground_basis.y.normalized() * .025)
			pools[id].visible = body.is_visible_in_tree()
		elif pools.has(id):
			pools[id].queue_free(); pools.erase(id)
			if fallen.has(id):
				var previous: Dictionary = fallen[id]
				fallen.erase(id)
				if previous.body != body: continue
				body.play_action_animation("idle")
				body._apply_procedural_motion(0.0, Vector2.ZERO, "idle")
				body.set_physics_process(body.is_visible_in_tree() and previous.physics)
				if body.collision: body.collision.set_deferred("disabled", previous.collision or not body.is_visible_in_tree())
				if body.is_physics_processing() and not reduced and _has_pose(body, "stand"): body.play_action_animation("stand", .45)
	var ids: Array=[]
	for effect in controller.rules.effects:
		if effect.kind!="fog": continue
		var id: String=effect.actor; ids.append(id)
		if not clouds.has(id):
			var root:=Node3D.new(); root.name="FogVolume_"+id; add_child(root)
			for i in range(18):
				var puff:=Sprite3D.new(); puff.texture=soft; puff.billboard=BaseMaterial3D.BILLBOARD_ENABLED
				puff.modulate=Color(.50,.60,.66,.24 if i<4 else .42)
				puff.no_depth_test=false
				var angle:=i*2.39996323; var spread:=sqrt((i+.5)/18.0)*4.6
				puff.pixel_size=2.0*(6.0-spread)/128.0
				puff.position=Vector3(cos(angle)*spread,.45+.85*(1-spread/6.0),sin(angle)*spread)
				root.add_child(puff)
			clouds[id]=root
		clouds[id].global_position=effect.point
		for puff in clouds[id].get_children():
			var phase: float = puff.get_index() * 2.39996323
			var breath := 1.0 if reduced else 1.0 + .07 * sin(Time.get_ticks_msec() * .0008 + phase)
			puff.scale = Vector3(1.0, .62 * breath, 1.0)
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
	if not is_instance_valid(actor) or not actor.is_visible_in_tree(): return 0.0
	if target and not target.is_visible_in_tree(): target = null
	if target and target != actor:
		var direction: Vector3=target.global_position-actor.global_position
		if Vector2(direction.x,direction.z).length_squared()>.0001: actor.facing_dir=actor._dir_from_vector(Vector2(direction.x,direction.z))
	elif event.has("point") and str(event.get("target", "")).is_empty():
		var direction: Vector3=event.point-actor.global_position
		if Vector2(direction.x,direction.z).length_squared()>.0001: actor.facing_dir=actor._dir_from_vector(Vector2(direction.x,direction.z))
	var action: Dictionary=event.action
	var animation: String=action.get("animationType","melee")
	var view_dir: String = Facing.view_direction(actor, actor.facing_dir)
	var pose := pose_for(actor, action, view_dir)
	var clip: Dictionary=actor._pick_clip_from_profile(pose,view_dir)
	var duration:=clampf(clip.get("frames",[]).size()/maxf(1,float(clip.get("fps",8))),.65,2.0)
	actor.play_action_animation(pose,duration)
	duration = maxf(duration, float(actor.action_lock_timer))
	var reduced := _reduced_motion()
	var projectile: bool = is_instance_valid(target) and target != actor and cues.has_projectile(animation) and action.id not in ["burning-hands", "sacred-flame"]
	var release := clampf(duration * .38, .12, .62)
	var flight := 0.0
	if projectile and not reduced: flight = clampf(actor.global_position.distance_to(target.global_position) / 22.0, .16, .36)
	if (projectile or animation in ["spell", "fireProjectile", "magicalProjectile", "radiantArrow"]) and actor.action_vfx_sprite:
		actor.vfx_timer = 0.0
		actor.action_vfx_sprite.hide()
	var sequence_tween := create_tween()
	sequence_tween.tween_interval(release)
	sequence_tween.tween_callback(func():
		if not is_instance_valid(actor) or not actor.is_visible_in_tree(): return
		cues.area(action, actor, event.get("point", actor.global_position), reduced)
		var contact := func(): _contact(event, actor, target, pose, reduced)
		if projectile and is_instance_valid(target) and target.is_visible_in_tree():
			var start := _body_center(actor)
			var finish := _body_center(target)
			if not event.get("hit", false) and event.get("kind", "") != "blocked":
				var side := (finish - start).cross(Vector3.UP).normalized()
				finish += side * .48 + Vector3.UP * .12
			cues.launch(action, start, finish, flight, reduced, contact)
		else: contact.call()
	)
	var path: String=_audio_path(action,pose)
	if FileAccess.file_exists(path) and not controller.ui.audio_muted:
		sound.stream=_audio_stream(path)
		if sound.stream: sound.play()
	return maxf(duration, release + flight + .34)

func pose_for(actor: Node3D, action: Dictionary, view: String) -> String:
	var animation := str(action.get("animationType", "melee"))
	var pose := "attack"
	if animation in ["arrow", "radiantArrow"]: pose = "attack_arrow"
	elif animation == "thrownWeapon": pose = "attack_throw"
	elif action.get("magical", false) or animation in ["spell", "fireProjectile", "magicalProjectile"]: pose = "spell"
	if str(action.id).ends_with("unarmed") and _has_pose(actor, "attack_unarmed"): pose = "attack_unarmed"
	if str(action.id).begins_with("fog-cloud"): pose = "spell_fog"
	if action.id == "feather-fall": pose = "spell_feather"
	var npc_pose: String = preload("res://sprites/npc_sprite_library.gd").action_pose(action)
	if not npc_pose.is_empty() and actor.char_profile.has("npc_species"): pose = npc_pose
	return _fallback_pose(actor, pose, view)

func _has_pose(actor: Node3D, pose: String) -> bool:
	var authored: Dictionary = actor.char_profile.get("clips", {}).get(pose, {})
	var directional: Dictionary = actor.char_profile.get("dir_states", {}).get(pose, {})
	return not authored.get("frames", []).is_empty() or not directional.is_empty()

func _fallback_pose(actor: Node3D, pose: String, view: String) -> String:
	if _has_pose(actor, pose): return pose
	if pose.begins_with("attack"):
		if actor.char_profile.get("dir_attack", {}).has(view): return "attack"
		return "attack" if _has_pose(actor, "attack") else "interact"
	if pose.begins_with("spell"): return "spell" if _has_pose(actor, "spell") else "interact"
	if pose.begins_with("hit"): return "hit"
	return pose

func _body_center(body: Node3D) -> Vector3:
	return body.global_position + Vector3.UP * body.target_height * .6

func _contact(event: Dictionary, actor: Node3D, target: Node3D, pose: String, reduced: bool) -> void:
	if not is_instance_valid(target) or not target.is_visible_in_tree(): return
	var action: Dictionary = event.action
	var center := _body_center(target)
	var color: Color = cues.color_for(action)
	if event.get("kind", "") == "blocked" or action.id in ["shield", "shield-of-faith"]:
		cues.flash(center, Color("88c8ff") if event.get("kind", "") == "blocked" else color, 1.35, reduced, "CombatWard")
		return
	if not event.get("hit", false): return
	if action.get("healing", false):
		cues.flash(center, color, 1.65, reduced, "CombatHealing")
	elif int(event.get("amount", 0)) > 0 and action.get("damageType", "") not in controller.rules.actors.get(str(event.target), {}).get("immunities", []):
		cues.flash(center, color, .95, reduced, "CombatImpact")
		if target != actor and not target.is_defeated:
			var hit_pose := "hit_fire" if action.get("damageType", "") == "fuego" else "hit_arcane" if action.get("magical", false) or pose.begins_with("spell") else "hit_physical"
			target.play_action_animation(_fallback_pose(target, hit_pose, target.facing_dir), .45)
	elif action.id in ["bless", "feather-fall"]:
		cues.flash(center, color, 1.25, reduced, "CombatBoon")
