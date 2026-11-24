extends "res://scripts/player_token.gd"

const TALK_REACH := 2.65
const MAX_RISER := 0.34

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
	collision_layer = 0
	_schedule = schedule

func _ready() -> void:
	super._ready()
	if collision and collision.shape is CapsuleShape3D:
		collision.shape.radius = minf(0.29, target_height * 0.27)
	safe_margin = 0.015
	_ground_ray.collision_mask = collision_mask
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

func _load_character_profile(_resolve_src: String) -> void:
	char_key = "sw-" + resident_id
	var definition := Registry.character(char_key)
	target_height = float(definition.heightMeters)
	char_profile = Registry.profile(char_key)
	anim_clips = char_profile
	var walk: Dictionary = char_profile.get("dir_states", {}).get("walk", {})
	if walk.has("e") and resident_id != "varnoth":
		_west_walk = walk.e.duplicate()
		_west_walk.flip_h = true
	if resident_id != "varnoth" and char_profile.get("dir_idle", {}).has("se"):
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
	var available: bool = not is_talking() and not _schedule.table_in_combat()
	input_override = Vector2.ZERO
	if available and not route_goal.is_empty():
		input_override = _route_input(delta)
	elif available and not _schedule.is_routine_running(self) and global_position.distance_to(station_origin) < 0.65:
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
	if not _prop_cue_sent and current_anim == _gesture and action_lock_timer > 0.0 and (
		_gesture_duration - action_lock_timer >= _gesture_duration * _gesture_contact
	):
		_prop_cue_sent = true
		_schedule.on_activity_contact(self, current_anim)

func _move_character_body(delta: float) -> void:
	var stride := Vector3(velocity.x, 0, velocity.z) * delta
	var before := global_position
	if _route_index < _route.size() and _route[_route_index].y > before.y + 0.045:
		_step_over_riser(stride)
	move_and_slide()
	if (global_position - before).dot(stride.normalized()) > stride.length() * 0.13:
		_walked_this_frame = true
		return
	# Test the toe clearance only when the regular ground movement snags.
	var next := global_position + stride
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
	cancel_route()
	_schedule.on_route_blocked(self, goal)

func _resolve_desired_state(input_dir: Vector2) -> String:
	var state := super._resolve_desired_state(input_dir)
	return "idle" if action_lock_timer <= 0.0 and not _walked_this_frame else state

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
		if authored.has("se") and direction in ["s", "se", "e"]:
			return authored.se
		var work := _in_view(states.get("retreat_work", {}), direction)
		if not work.is_empty():
			return work
		return authored.values()[0]
	return super._pick_clip_from_profile(state, direction)

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
