extends "res://scripts/player_token.gd"

const TALK_REACH := 2.65

var resident_id := ""
var job := ""
var lines: Array = []
var welcome_line := ""
var welcomed := false
var station_id := ""
var station_origin := Vector3.ZERO
var station_heading := Vector3.BACK
var station_action := ""
var is_player_nearby := false
var _line_index := 0
var _until_activity := 2.0
var _conversation_hold := 0.0
var _prop_cue_sent := false
var _schedule: Node3D

func configure(id: String, entry: Dictionary, view: Camera3D, schedule: Node3D) -> void:
	resident_id = id
	token_name = entry.name
	job = entry.job
	lines = entry.dialogue
	welcome_line = entry.get("welcome", "")
	camera = view
	is_npc = true
	is_active_player = false
	has_carried_light = false
	collision_layer = 0
	_schedule = schedule

func _ready() -> void:
	super._ready()
	remove_from_group("party_tokens")
	add_to_group("retreat_residents")

func _load_character_profile(_resolve_src: String) -> void:
	char_key = "sw-" + resident_id
	var definition := Registry.character(char_key)
	target_height = float(definition.heightMeters)
	char_profile = Registry.profile(char_key)
	anim_clips = char_profile

func place_at_station(key: String, point: Vector3, heading: Vector3, action: String) -> void:
	station_id = key
	station_origin = point
	station_heading = heading
	station_action = action
	global_position = point
	velocity = Vector3.ZERO
	play_action_animation("idle")
	face_world_direction(heading)
	_until_activity = 0.48 + float(abs(resident_id.hash()) % 10) * 0.18
	_prop_cue_sent = false

func play_station_activity() -> bool:
	if station_action.is_empty() or not char_profile.dir_states.has(station_action):
		return false
	face_world_direction(station_heading)
	play_action_animation(station_action, 0.72)
	_prop_cue_sent = false
	return true

func _physics_process(delta: float) -> void:
	if not is_visible_in_tree():
		return
	_conversation_hold = maxf(0.0, _conversation_hold - delta)
	if _conversation_hold == 0.0 and not _schedule.table_in_combat() and global_position.distance_to(station_origin) < 0.65:
		_until_activity -= delta
		if _until_activity <= 0.0 and action_lock_timer <= 0.0:
			play_station_activity()
			_until_activity = 8.0 + float(abs(resident_id.hash()) % 8) * 0.7
	super._physics_process(delta)
	if not _prop_cue_sent and current_anim == station_action and action_lock_timer > 0.0 and anim_frame_idx >= 3:
		_prop_cue_sent = true
		_schedule.on_activity_contact(self, current_anim)

func _resolve_desired_state(input_dir: Vector2) -> String:
	var state := super._resolve_desired_state(input_dir)
	return "idle" if action_lock_timer <= 0.0 and state.begins_with("retreat_") else state

func _pick_clip_from_profile(state: String, direction: String) -> Dictionary:
	var authored: Dictionary = char_profile.get("dir_states", {}).get(state, {})
	if not authored.is_empty():
		# A station gesture has one painted view until more are authored.
		return authored.get(direction, authored.values()[0])
	return super._pick_clip_from_profile(state, direction)

func refresh_proximity() -> void:
	var hero: CharacterBody3D = _schedule.active_hero()
	is_player_nearby = false
	if not is_visible_in_tree() or not is_instance_valid(hero) or _schedule.table_in_combat():
		return
	var offset := global_position - hero.global_position
	if absf(offset.y) > 0.85 or Vector2(offset.x, offset.z).length_squared() > TALK_REACH * TALK_REACH:
		return
	var start := hero.global_position + Vector3.UP * minf(float(hero.get("target_height")) * 0.68, 1.1)
	var end := global_position + Vector3.UP * target_height * 0.68
	var ray := PhysicsRayQueryParameters3D.create(start, end, 1, [hero.get_rid(), get_rid()])
	is_player_nearby = get_world_3d().direct_space_state.intersect_ray(ray).is_empty()

func get_interaction_prompt() -> String:
	return "[T] Hablar con %s" % token_name

func interact() -> void:
	refresh_proximity()
	if not is_player_nearby:
		return
	var hero: CharacterBody3D = _schedule.active_hero()
	face_world_direction(hero.global_position - global_position)
	var greeting := not welcome_line.is_empty() and not welcomed
	if greeting:
		welcomed = true
	var line := welcome_line if greeting else str(lines[_line_index % lines.size()])
	if not greeting:
		_line_index += 1
	if greeting and char_profile.dir_states.has("retreat_greet"):
		play_action_animation("retreat_greet", 1.4)
	else:
		play_action_animation("idle")
	_conversation_hold = 5.0
	_until_activity = 2.0
	_schedule.say_line(self, line)

func can_change_station() -> bool:
	return _conversation_hold <= 0.0 and global_position.distance_to(station_origin) < 0.65
