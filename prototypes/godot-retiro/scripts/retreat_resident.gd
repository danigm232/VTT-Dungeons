extends "res://scripts/player_token.gd"

const TALK_REACH := 2.65
const MAX_RISER := 0.34

var presence_label: Label3D
var _presence_timer: float = 0.0
var resident_id := ""
var job := ""
var greeting_line := ""
var welcome_line := ""
var welcomed := false
var station_id := ""
var station_origin := Vector3.ZERO
var station_heading := Vector3.BACK
var station_action := ""
var is_player_nearby := false
var route_goal := ""
var _route := PackedVector3Array()
var _route_index := 0
var _step_scale := 1.0
var _blocked_seconds := 0.0
var _talk_target: Node3D
var _until_activity := 2.0
var _prop_cue_sent := false
var _west_walk: Dictionary = {}
var _west_idle: Dictionary = {}
var _gesture := ""
var _gesture_duration := 0.0
var _gesture_contact := 0.47
var _ground_ray := PhysicsRayQueryParameters3D.new()
var _walking_capsule := PhysicsShapeQueryParameters3D.new()
var _step_probe := KinematicCollision3D.new()
var _walked_this_frame := false
var _schedule: Node3D
var _body_view_octant := -1
var _held_camera_pose: Dictionary = {}
var _desk_study := ""
var _desk_palm_target := Vector3.INF
var _fishing_stage := ""
var _fishing_fallback := ""
var _work_prop := ""
var _lowering_poses: Dictionary = {}

func stabilize_view_octant(bearing: float) -> int:
	const STEP := PI / 4.0
	if _body_view_octant < 0 or absf(angle_difference(float(_body_view_octant) * STEP, bearing)) > STEP * 0.5 + deg_to_rad(3.0):
		_body_view_octant = posmod(roundi(bearing / STEP), 8)
	return _body_view_octant

func configure(id: String, entry: Dictionary, view: Camera3D, schedule: Node3D) -> void:
	resident_id = id
	token_name = entry.name
	job = entry.job
	greeting_line = entry.dialogue[0]
	welcome_line = entry.get("welcome", "")
	camera = view
	is_npc = true
	is_active_player = false
	has_carried_light = false
	collision_layer = 2
	collision_mask = 5
	_schedule = schedule

func _ready() -> void:
	super._ready()
	if collision and collision.shape is CapsuleShape3D:
		collision.shape.radius = minf(0.29, target_height * 0.27)
	safe_margin = 0.015
	_ground_ray.collision_mask = 1
	_ground_ray.exclude = [get_rid()]
	var clearance := CapsuleShape3D.new()
	clearance.radius = minf(0.26, target_height * 0.24)
	clearance.height = maxf(clearance.radius * 2.0, minf(1.03, target_height - 0.20))
	_walking_capsule.shape = clearance
	_walking_capsule.collision_mask = collision_mask
	_walking_capsule.exclude = [get_rid()]
	_walking_capsule.margin = 0.005
	speed = 1.9 if target_height > 1.0 else 1.65
	if resident_id in ["frub", "mumpo"]:
		speed = 2.13
	remove_from_group("party_tokens")
	add_to_group("retreat_residents")
	_build_presence_label()

func _build_presence_label() -> void:
	if presence_label != null:
		return
	presence_label = Label3D.new()
	presence_label.name = "PresenceLabel"
	presence_label.text = token_name
	presence_label.font_size = 32
	presence_label.outline_size = 7
	presence_label.pixel_size = 0.0115
	presence_label.billboard = BaseMaterial3D.BILLBOARD_FIXED_Y
	presence_label.modulate = Color(0.98, 0.91, 0.74, 0.0)
	presence_label.outline_modulate = Color(0.04, 0.07, 0.08, 0.0)
	presence_label.position = Vector3(0.0, target_height + 0.28, 0.0)
	presence_label.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	presence_label.visible = false
	add_child(presence_label)

func _update_presence_label(delta: float) -> void:
	if presence_label == null:
		return
	_presence_timer += delta
	if _presence_timer < 0.12:
		return
	_presence_timer = 0.0
	if not is_visible_in_tree() or is_talking() or (is_instance_valid(_schedule) and _schedule.dialogue != null and _schedule.dialogue.panel.visible):
		presence_label.visible = false
		return
	var target_alpha := 0.0
	var hero: Node3D = _schedule.active_hero() if is_instance_valid(_schedule) and _schedule.has_method("active_hero") else null
	var ref_pos: Vector3 = hero.global_position if is_instance_valid(hero) else global_position
	var cam := camera if camera else (get_viewport().get_camera_3d() if get_viewport() else null)
	if is_instance_valid(hero):
		var d_hero := global_position.distance_to(ref_pos)
		if d_hero <= 22.0:
			target_alpha = clampf((22.0 - d_hero) / 5.5, 0.0, 0.95)
	if is_instance_valid(cam):
		if cam.projection == Camera3D.PROJECTION_ORTHOGONAL:
			if cam.size > 42.0:
				target_alpha = 0.0
		else:
			var cam_dist: float = cam.global_position.distance_to(global_position)
			if cam_dist > 72.0:
				target_alpha = 0.0
	if target_alpha <= 0.04:
		presence_label.visible = false
		return
	presence_label.visible = true
	presence_label.modulate.a = target_alpha
	presence_label.outline_modulate.a = target_alpha * 0.94
	presence_label.position.y = target_height * current_height_scale + 0.28

func _load_character_profile(_resolve_src: String) -> void:
	const Featured = preload("res://scripts/retreat_characteristic_routines.gd")
	char_key = "sw-" + resident_id
	var definition := Registry.character(char_key)
	target_height = float(Featured.HEIGHTS.get(resident_id, definition.heightMeters))
	char_profile = Registry.profile(char_key)
	anim_clips = char_profile
	for direction: String in char_profile.get("dir_states", {}).get("retreat_carry_lift", {}):
		var raised: Dictionary = char_profile.dir_states.retreat_carry_lift[direction]
		var lowered := raised.duplicate()
		lowered.frames = raised.frames.duplicate()
		lowered.frames.reverse()
		_lowering_poses[direction] = lowered
	var walk: Dictionary = char_profile.get("dir_states", {}).get("walk", {})
	if walk.has("e") and resident_id not in ["varnoth", "myla"]:
		_west_walk = walk.e.duplicate()
		_west_walk.flip_h = true
	if resident_id not in ["varnoth", "myla"] and char_profile.get("dir_idle", {}).has("se"):
		_west_idle = char_profile.dir_idle.se.duplicate()
		_west_idle.flip_h = true

func place_at_station(key: String, point: Vector3, heading: Vector3, action: String, spawn := true) -> void:
	station_id = key
	station_origin = point
	station_heading = heading
	station_action = action
	if spawn:
		global_position = point
	velocity = Vector3.ZERO
	play_action_animation("idle")
	face_world_direction(heading)
	_until_activity = 0.48 + float(abs(resident_id.hash()) % 10) * 0.18
	_prop_cue_sent = false
	_gesture = ""

func play_station_activity(requested := "") -> bool:
	if station_action.is_empty() or not route_goal.is_empty():
		return false
	if not requested.is_empty() and station_action != requested:
		return false
	face_world_direction(station_heading)
	return play_gesture(station_action)

func play_gesture(action: String, duration := 0.0, contact := 0.47) -> bool:
	var views: Dictionary = char_profile.dir_states.get(action, {})
	if views.is_empty():
		return false
	var clip: Dictionary = views.values()[0]
	_gesture = action
	_gesture_duration = maxf(duration, float(clip.frames.size()) / float(clip.fps))
	_gesture_contact = contact
	_prop_cue_sent = false
	play_action_animation(action, _gesture_duration)
	return true

func has_seated_study() -> bool:
	return not char_profile.dir_states.get("retreat_desk_read", {}).is_empty()

func set_seated_study(action: String, book_contact := Vector3.INF) -> void:
	if book_contact.is_finite() or action.is_empty():
		_desk_palm_target = book_contact
	if _desk_study == action:
		return
	_desk_study = action
	_held_camera_pose = {}
	if not action.is_empty():
		_resolve_and_apply_clip("sit_on_prop", facing_dir, true)
		_apply_procedural_motion(0.0, Vector2.ZERO, "sit_on_prop")

func _seat_hand_target() -> Vector3:
	if not _desk_palm_target.is_finite():
		return Vector3.INF
	return _desk_palm_target + Vector3.UP * (0.12 if _desk_study.ends_with("_turn") else 0.0)

func show_fishing_stage(stage: String, fallback: String) -> void:
	if _fishing_stage == stage and _fishing_fallback == fallback:
		if not stage.is_empty():
			var old_texture := sprite.texture
			_resolve_and_apply_clip("retreat_fishing", facing_dir, false)
			if sprite.texture != old_texture:
				_apply_procedural_motion(0.0, Vector2.ZERO, "retreat_fishing")
		return
	_fishing_stage = stage
	_fishing_fallback = fallback
	if not stage.is_empty():
		_process_pose_visuals(0.0, Vector2.ZERO, "retreat_fishing")

func fishing_hand_contact() -> Vector2:
	if active_clip_frames.is_empty():
		return Vector2.INF
	var frame: Dictionary = active_clip_frames[clampi(anim_frame_idx, 0, active_clip_frames.size() - 1)]
	return frame.get("tool_grip", Vector2.INF)

func set_work_prop(verb: String) -> void:
	_work_prop = verb

func work_gesture_progress() -> float:
	return clampf(1.0 - action_lock_timer / maxf(_gesture_duration, 0.01), 0.0, 1.0)

func _work_clip(state: String, direction: String, states: Dictionary, authored: Dictionary) -> Dictionary:
	if state in ["retreat_fetch", "retreat_tidy"] and _work_prop in ["carry_box", "carry_sack", "unload"]:
		var profile_side := "w" if resident_id == "frub" else "e"
		var close_views := ["w", "sw", "nw"] if profile_side == "w" else ["e", "se", "ne"]
		if direction in close_views:
			var lift: Dictionary = _lowering_poses if _work_prop == "unload" else states.get("retreat_carry_lift", {})
			return lift.get(profile_side, {})
	if state == "walk" and _work_prop in ["carry_box", "carry_sack"]:
		var carry: Dictionary = states.get("retreat_carry_walk", {})
		return _in_view(carry, direction)
	if state == "retreat_work" and _work_prop == "sweep" and direction in ["n", "ne", "nw"]:
		return states.get("retreat_sweep", {}).get("n", {})
	if state == "retreat_tidy" and _work_prop == "wipe" and direction in ["e", "se", "ne"]:
		return states.get("retreat_wipe", {}).get("e", {})
	if state in ["retreat_masonry", "retreat_tinker", "retreat_sort"] and _work_prop in ["stonework", "metalwork", "woodwork"]:
		if direction in ["n", "ne", "nw"] and authored.has("n"):
			return states.get("retreat_" + _work_prop, {}).get("n", authored.n)
		return _in_view(states.get("retreat_work", {}), direction)
	return {}

func begin_route(key: String, waypoints: PackedVector3Array) -> void:
	route_goal = key
	_route = waypoints
	_route_index = 0
	_blocked_seconds = 0.0
	play_action_animation("idle")

func cancel_route() -> void:
	route_goal = ""
	input_override = Vector2.ZERO
	_route.clear()

func is_talking() -> bool:
	return is_instance_valid(_talk_target)

func look_at_speaker(other: Node3D, keep_action := false) -> void:
	_talk_target = other
	input_override = Vector2.ZERO
	if not keep_action:
		play_action_animation("idle")
	face_world_direction(other.global_position - global_position)

func stop_talking() -> void:
	_talk_target = null
	_until_activity = 2.5

func _route_input(delta: float) -> Vector2:
	while _route_index < _route.size():
		var target := _route[_route_index]
		var offset := Vector2(target.x - global_position.x, target.z - global_position.z)
		if offset.length_squared() > 0.11 * 0.11:
			_step_scale = minf(1.0, offset.length() / maxf(speed * delta, 0.001))
			return offset.normalized()
		if absf(target.y - global_position.y) > 0.55:
			_stop_blocked_route()
			return Vector2.ZERO
		_route_index += 1
	if _route_index >= _route.size():
		var reached := route_goal
		cancel_route()
		_schedule.on_station_reached(self, reached)
	return Vector2.ZERO

func _physics_process(delta: float) -> void:
	if not is_visible_in_tree():
		return
	var available: bool = not is_talking() and (route_goal == "@dm" or not _schedule.table_in_combat())
	input_override = Vector2.ZERO
	if available and not route_goal.is_empty():
		input_override = _route_input(delta)
	elif available and not _schedule.resident_autonomy_disabled(resident_id) and not _schedule.is_routine_running(self) and global_position.distance_to(station_origin) < 0.65:
		_until_activity -= delta
		if _until_activity <= 0.0 and action_lock_timer <= 0.0:
			play_station_activity()
			_until_activity = 8.0 + float(abs(resident_id.hash()) % 8) * 0.7
	elif is_talking() and action_lock_timer <= 0.0:
		face_world_direction(_talk_target.global_position - global_position)
	var before := global_position
	var moving := not input_override.is_zero_approx()
	_walked_this_frame = false
	super._physics_process(delta)
	if moving:
		var step := Vector2(global_position.x - before.x, global_position.z - before.z).dot(input_override)
		_blocked_seconds = _blocked_seconds + delta if step < delta * 0.17 else 0.0
		if _blocked_seconds > 1.7:
			_stop_blocked_route()
	_update_presence_label(delta)
	if not _prop_cue_sent and current_anim == _gesture and action_lock_timer > 0.0 and (
		_gesture_duration - action_lock_timer >= _gesture_duration * _gesture_contact
	):
		_prop_cue_sent = true
		_schedule.on_activity_contact(self, current_anim)

func _crosses_closed_door(from_pos: Vector3, to_pos: Vector3) -> bool:
	var tree := get_tree()
	if not tree:
		return false
	for node in tree.get_nodes_in_group("interactive_doors"):
		if not is_instance_valid(node) or bool(node.get("is_open")):
			continue
		var col_shape := node.get("blocker_shape") as CollisionShape3D
		if not is_instance_valid(col_shape) or col_shape.disabled or not (col_shape.shape is BoxShape3D):
			continue
		var box_sz := (col_shape.shape as BoxShape3D).size
		var inv := col_shape.global_transform.affine_inverse()
		var p0 := inv * from_pos
		var p1 := inv * to_pos
		var half_x := box_sz.x * 0.5 + 0.24
		var half_z := box_sz.z * 0.5 + 0.24
		if absf(p0.y) > box_sz.y + 0.5:
			continue
		if minf(p0.x, p1.x) <= half_x and maxf(p0.x, p1.x) >= -half_x:
			var crosses_plane := (p0.z * p1.z <= 0.0) and (minf(p0.z, p1.z) <= half_z and maxf(p0.z, p1.z) >= -half_z)
			var enters_slab := (absf(p1.z) <= half_z and absf(p1.z) < absf(p0.z) - 0.0005)
			if crosses_plane or enters_slab:
				return true
	return false

func _move_character_body(delta: float) -> void:
	var stride := Vector3(velocity.x, 0, velocity.z) * delta
	var before := global_position
	if _crosses_closed_door(before, before + stride):
		velocity.x = 0.0
		velocity.z = 0.0
		return
	if _route_index < _route.size() and _route[_route_index].y > before.y + 0.045:
		_step_over_riser(stride)
	move_and_slide()
	if (global_position - before).dot(stride.normalized()) > stride.length() * 0.13:
		_walked_this_frame = true
		return
	# Test the toe clearance only when the regular ground movement snags.
	var next := global_position + stride
	if _crosses_closed_door(before, next):
		return
	_ground_ray.from = next + Vector3.UP * MAX_RISER
	_ground_ray.to = next - Vector3.UP * 0.43
	var space := get_world_3d().direct_space_state
	var support := space.intersect_ray(_ground_ray)
	if support.is_empty() or support.normal.y < 0.68:
		return
	next.y = float(support.position.y) + 0.017
	# Sweep above the toe clearance used by the route graph. The ray follows
	# the real tread while this volume respects walls, furniture and live doors.
	var clearance_height := float(_walking_capsule.shape.height) * 0.5 + 0.27
	_walking_capsule.transform.origin = global_position + Vector3.UP * clearance_height
	_walking_capsule.motion = next - global_position
	var sweep := space.cast_motion(_walking_capsule)
	if sweep.size() != 2 or sweep[0] < 0.99:
		return
	_walking_capsule.transform.origin = next + Vector3.UP * clearance_height
	_walking_capsule.motion = Vector3.ZERO
	if not space.intersect_shape(_walking_capsule, 1).is_empty():
		return
	global_position = next
	_walked_this_frame = true

func _step_over_riser(stride: Vector3) -> void:
	# At the landings, the flat slab sits above the continuous stair ramp.
	# Only step up if all three sweeps fit and the next tread offers support.
	var forward := stride + stride.normalized() * 0.065
	var start := global_transform
	if not test_move(start, forward, _step_probe, 0.005) or _step_probe.get_normal().y > 0.65:
		return
	var lift := Vector3.UP * MAX_RISER
	var raised := start.translated(lift)
	if test_move(start, lift, _step_probe, 0.005) or test_move(raised, forward, _step_probe, 0.005):
		return
	if not test_move(raised.translated(forward), -lift, _step_probe, 0.005):
		return
	var rise := MAX_RISER + _step_probe.get_travel().y
	if rise > 0.035 and _step_probe.get_normal().y > 0.68:
		global_position.y += rise + 0.009

func _stop_blocked_route() -> void:
	var goal := route_goal
	var obstacle := _route[_route_index] if _route_index < _route.size() else Vector3.INF
	cancel_route()
	_schedule.on_route_blocked(self, goal, obstacle)

func _resolve_desired_state(input_dir: Vector2) -> String:
	if is_sitting and not _desk_study.is_empty():
		return "sit_on_prop"
	if not _fishing_stage.is_empty():
		return "retreat_fishing"
	var state := super._resolve_desired_state(input_dir)
	if state == "rest_on_prop":
		return state
	if state == "idle" and not _walked_this_frame and not _gesture.is_empty() and _schedule.holds_routine_pose(self):
		return _gesture
	return "idle" if action_lock_timer <= 0.0 and not _walked_this_frame else state

func _needs_direction_refresh(state: String) -> bool:
	return state == "retreat_fishing" or (state == "sit_on_prop" and not _desk_study.is_empty()) or super._needs_direction_refresh(state)

func _process_frame_animation(delta: float) -> void:
	if action_lock_timer <= 0.0 or current_anim != _gesture:
		super._process_frame_animation(delta)
		return
	if active_clip_frames.size() <= 1:
		return
	# Use the same phase for the changing camera view, the gesture and contact.
	var phase := 1.0 - action_lock_timer / _gesture_duration
	var frame := clampi(floori(phase * active_clip_frames.size()), 0, active_clip_frames.size() - 1)
	if frame != anim_frame_idx:
		anim_frame_idx = frame
		update_sprite_frame()

func _set_movement_facing(input_dir: Vector2) -> void:
	face_world_direction(Vector3(input_dir.x, 0, input_dir.y))

func _camera_relative_dir(input_dir: Vector2) -> Vector3:
	return Vector3(input_dir.x, 0, input_dir.y) * _step_scale

func _pick_clip_from_profile(state: String, direction: String) -> Dictionary:
	var states: Dictionary = char_profile.get("dir_states", {})
	var authored: Dictionary = states.get(state, {})
	if not _work_prop.is_empty():
		var working := _work_clip(state, direction, states, authored)
		if not working.is_empty():
			return working
	if state == "retreat_fishing":
		const Facing = preload("res://sprites/sprite_facing.gd")
		var phase: Dictionary = states.get("retreat_fish_" + _fishing_stage, {})
		var close_profile := phase.get("w" if resident_id == "tarak" else "e", {}) as Dictionary
		if not close_profile.is_empty():
			var bearing := Facing.view_bearing(self, facing_dir)
			if absf(angle_difference(bearing, float(close_profile.view_bearing))) <= deg_to_rad(38.0):
				return close_profile
		return _pick_clip_from_profile(_fishing_fallback if not _fishing_fallback.is_empty() else "idle", direction)
	if state == "rest_on_prop" and bool(get_meta("awake_rest", false)) and states.get("rest_awake", {}).has("s"):
		return states.rest_awake.s
	if state == "rest_on_prop" and authored.has("s"):
		return authored.s
	if state == "retreat_meditate_seated" and not authored.is_empty():
		return _nearest_activity_view(authored)
	if state == "sit_on_prop" and not _desk_study.is_empty():
		var study: Dictionary = states.get(_desk_study, states.get("retreat_desk_read", {}))
		if not study.is_empty():
			return _nearest_activity_view(study)
	_held_camera_pose = {}
	if state == "walk" and not authored.is_empty():
		if authored.has(direction):
			return authored[direction]
		if direction in ["ne", "nw"] and authored.has("n"):
			return authored.n
		if direction in ["w", "sw", "nw"]:
			if authored.has("w"):
				return authored.w
			if not _west_walk.is_empty():
				return _west_walk
		return authored.get("e", authored.values()[0])
	if state == "idle":
		if direction == "se":
			return super._pick_clip_from_profile(state, direction)
		if direction == "sw" and not _west_idle.is_empty():
			return _west_idle
		var stances: Dictionary = states.get("retreat_stance", {})
		var stance := _in_view(stances, direction)
		if not stance.is_empty():
			return stance
	if not authored.is_empty():
		if authored.has(direction):
			return authored[direction]
		if direction in ["ne", "nw"] and authored.has("n"):
			return authored.n
		if authored.has("se") and direction in ["s", "se", "e"]:
			return authored.se
		var work := _in_view(states.get("retreat_work", {}), direction)
		if not work.is_empty():
			return work
		return authored.values()[0]
	return super._pick_clip_from_profile(state, direction)

func _nearest_activity_view(views: Dictionary) -> Dictionary:
	const Facing = preload("res://sprites/sprite_facing.gd")
	var bearing := Facing.view_bearing(self, facing_dir)
	var closest: Dictionary = {}
	var error := INF
	for pose: Dictionary in views.values():
		if not pose.has("view_bearing"):
			continue
		var difference := absf(angle_difference(bearing, float(pose.view_bearing)))
		if difference < error:
			closest = pose
			error = difference
	if not _held_camera_pose.is_empty() and absf(angle_difference(bearing, float(_held_camera_pose.view_bearing))) <= error + deg_to_rad(2.5):
		return _held_camera_pose
	_held_camera_pose = closest
	return closest if not closest.is_empty() else views.values()[0]

func _apply_procedural_motion(delta: float, input_dir: Vector2, state: String) -> void:
	super._apply_procedural_motion(delta, input_dir, state)
	if state == "retreat_meditate_seated" and is_instance_valid(sprite) and not _schedule.get_parent().vtt_ui.get_env_reduced_effects():
		var breath := sin(idle_breath_time * 1.65) * 0.007
		sprite.scale.y *= 1.0 + breath
		sprite.position.y += target_height * current_height_scale * (0.5 + current_floor_offset) * breath

func _in_view(clips: Dictionary, direction: String) -> Dictionary:
	const NEAREST := {"ne": "n", "nw": "n", "se": "e", "sw": "w"}
	return clips.get(direction, clips.get(NEAREST.get(direction, ""), {}))

func refresh_proximity() -> void:
	var hero: CharacterBody3D = _schedule.active_hero()
	is_player_nearby = not _schedule.table_in_combat() and can_be_heard_by(hero, TALK_REACH)

func can_be_heard_by(listener: Node3D, reach: float) -> bool:
	if not is_visible_in_tree() or not is_instance_valid(listener):
		return false
	var offset := global_position - listener.global_position
	if absf(offset.y) > 0.85 or Vector2(offset.x, offset.z).length_squared() > reach * reach:
		return false
	var start := listener.global_position + Vector3.UP * minf(float(listener.get("target_height")) * 0.68, 1.1)
	var end := global_position + Vector3.UP * target_height * 0.68
	var ray := PhysicsRayQueryParameters3D.create(start, end, 1, [listener.get_rid(), get_rid()])
	return get_world_3d().direct_space_state.intersect_ray(ray).is_empty()

func get_interaction_prompt() -> String:
	return "[T] Hablar con %s" % token_name

func interact() -> void:
	refresh_proximity()
	if is_player_nearby:
		_schedule.begin_conversation(self)
