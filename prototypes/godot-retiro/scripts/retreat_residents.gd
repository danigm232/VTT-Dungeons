extends Node3D

const Directory = preload("res://scripts/retreat_resident_directory.gd")
const Conversations = preload("res://scripts/retreat_conversations.gd")
const ConversationPanel = preload("res://scripts/retreat_dialogue_panel.gd")
const Routes = preload("res://scripts/retreat_resident_routes.gd")
const Routines = preload("res://scripts/retreat_routine_directory.gd")
const RoutineProps = preload("res://scripts/retreat_routine_props.gd")
const Resident = preload("res://scripts/retreat_resident.gd")
const TokenScene = preload("res://scenes/player_token.tscn")
const Registry = preload("res://characters/registry.gd")
const CLOCK_PHASES := ["day", "dusk", "night"]
const HEARING_REACH := 7.0
const EXCHANGE_REACH := 5.5
const COMPANIONS := {
	"runara/offerings": "rix", "tarak/serve": "kilnip",
	"varnoth/debate": "myla", "myla/lesson": "laylee", "agga/brief": "frub",
	"blepp/listen": "kilnip", "frub/ask": "agga", "kilnip/blepp": "blepp",
	"laylee/assist": "myla", "mumpo/dare": "zark", "rix/prepare": "runara",
	"zark/reply": "mumpo",
}
const LANDING_OFFSETS := [
	Vector2.ZERO, Vector2(0.5, 0), Vector2(-0.5, 0), Vector2(0, 0.5), Vector2(0, -0.5),
	Vector2(0.65, 0.65), Vector2(-0.65, 0.65), Vector2(0.65, -0.65), Vector2(-0.65, -0.65),
	Vector2(1.0, 0), Vector2(-1.0, 0), Vector2(0, 1.0), Vector2(0, -1.0),
]

signal routine_contacted(resident_id: String, task_id: String, target_id: String)
signal routine_shared(resident_id: String, task_id: String, partner_id: String)

var residents: Dictionary = {}
var phase := "day"
var last_conversation: Dictionary = {}
var last_overheard: Dictionary = {}
var routes := Routes.new()
var dialogue: ConversationPanel
var routine_props := RoutineProps.new()
var _next_scan := 0.0
var _elapsed := 0.0
var _departures: Dictionary = {}
var _travel_orders: Dictionary = {}
var _routine_orders: Dictionary = {}
var _routine_cursor: Dictionary = {}
var _running_routines: Dictionary = {}
var _blocked_routines: Dictionary = {}
var _partner_holds: Dictionary = {}
var _talking_to: Resident
var _speaking_hero: CharacterBody3D
var _party_lines: Array = []
var _attitudes: Dictionary = {}
var _discovered_clues: Dictionary = {}
var _dining_gathering: bool = false
var _exchange: Dictionary = {}
var _exchange_index := 0
var _exchange_until := 0.0
var _exchange_cooldowns: Dictionary = {}
var _workbench: Node
var _incense: GPUParticles3D
var _stove: Node3D
var _stew: GPUParticles3D
var _main: Node3D
var _session: Node
var _welcomed := false

func _ready() -> void:
	_main = get_parent() as Node3D
	_session = get_node_or_null("/root/MapTransition")
	_welcomed = _session != null and bool(_session.get_meta("retreat_welcomed", false))
	if _session:
		_party_lines = _session.get_meta("retreat_party_lines", [])
		_attitudes = _session.get_meta("retreat_attitudes", {})
		_discovered_clues = _session.get_meta("retreat_discovered_clues", {})
	phase = _phase_for_clock(_main.vtt_ui.clock_seconds)
	dialogue = ConversationPanel.new()
	dialogue.finished.connect(close_conversation)
	dialogue.choice_selected.connect(choose_topic)
	dialogue.party_spoke.connect(_send_party_line)
	_main.vtt_ui.attach_retreat_conversations(self)
	add_to_group("time_of_day_listener")
	set_physics_process(false)
	_spawn_residents.call_deferred()

func _spawn_residents() -> void:
	while is_inside_tree() and not can_process():
		await get_tree().physics_frame
	await get_tree().physics_frame
	await get_tree().physics_frame
	if not is_inside_tree():
		return
	var view: Camera3D = _main.camera
	var bench := _main.find_child("MylaTinkerWorkbench", true, false)
	if bench:
		_workbench = bench.get_node_or_null("Interactive_Workbench")
	var altar := _main.find_child("BahamutOfferingAltar", true, false) as Node3D
	if altar:
		_incense = _build_vapor(altar, "ResidentIncense", Vector3(-0.34, 0.95, 0.08), Color(0.78, 0.77, 0.73, 0.46))
	for stove in _main.find_children("A3_KitchenStove", "Node3D", true, false):
		if stove.has_meta("manually_lit"):
			_stove = stove
			_stew = _build_vapor(_stove, "ResidentStewSteam", Vector3(-0.18, 1.09, 0.08), Color(0.88, 0.86, 0.82, 0.52))
			break
	for id: String in Directory.RESIDENTS:
		var definition := Registry.character("sw-" + id)
		if definition.is_empty():
			push_warning("Missing Retreat character: " + id)
			continue
		var key := _station_for(id)
		var spot := _find_landing(Directory.STATIONS[key][0], float(definition.heightMeters))
		if not spot.is_finite():
			push_warning("Retreat resident " + id + " has no supported initial station: " + key)
			continue
		var body := TokenScene.instantiate() as CharacterBody3D
		body.set_script(Resident)
		var actor := body as Resident
		actor.name = "Resident_" + id.capitalize()
		actor.position = to_local(spot)
		actor.configure(id, Directory.RESIDENTS[id], view, self)
		if id == "runara":
			actor.welcomed = key != Directory.WELCOME
		add_child(actor)
		residents[id] = actor
		_place(actor, key, spot)
		_departures[id] = 3.5 + float(abs(id.hash()) % 11) * 0.54
	await get_tree().physics_frame
	if not is_inside_tree():
		return
	routes.build(self)
	routine_props.bind(self, _main, _workbench, _stove, _incense)
	set_physics_process(true)

func active_hero() -> CharacterBody3D:
	if is_instance_valid(_main.vtt_ui):
		return _main.vtt_ui.get_active_token_node() as CharacterBody3D
	return _main.player as CharacterBody3D

func table_in_combat() -> bool:
	return is_instance_valid(_main.vtt_ui) and _main.vtt_ui.combat_active

func begin_conversation(actor: Resident) -> void:
	var hero := active_hero()
	if not _can_open_dialogue(hero) or not actor.can_be_heard_by(hero, Resident.TALK_REACH):
		return
	_lock_dialogue(hero)
	for lead: String in _partner_holds.keys():
		if _partner_holds[lead] == actor.resident_id:
			_release_companion(lead)
	_interrupt_routine(actor, true)
	_talking_to = actor
	actor.look_at_speaker(hero)
	hero.face_world_direction(actor.global_position - hero.global_position)
	var line := actor.greeting_line
	if actor.resident_id == "runara" and not _welcomed:
		line = actor.welcome_line
		actor.welcomed = true
		_welcomed = true
		if _session:
			_session.set_meta("retreat_welcomed", true)
		actor.play_action_animation("retreat_greet", 1.4)
		_travel_orders.runara = _station_for("runara")
		_departures.runara = _elapsed + 2.0
	elif int(_attitudes.get("tarak", 0)) >= 2 and actor.resident_id == "tarak":
		line = "Si habéis venido por el jardín, preguntad. Lo demás es asunto mío."
	elif bool(_attitudes.get(actor.resident_id, false)) and actor.resident_id in ["varnoth", "agga"]:
		line = "Me alegra que hayáis vuelto."
	if actor.resident_id == "kilnip":
		actor.play_gesture("retreat_chat")
	last_conversation = {"resident": actor.resident_id, "text": line}
	var activity := str(Directory.ACTIVITIES.get(actor.station_id, actor.job))
	if _routine_orders.has(actor.resident_id):
		activity = _routine_orders[actor.resident_id][3]
	if not actor.route_goal.is_empty():
		activity = "En camino"
	dialogue.open_lines(actor.token_name, activity, [{"speaker": actor.token_name, "text": line}],
		_topics_for(actor.resident_id, hero))

func _hero_key(hero: CharacterBody3D) -> String:
	if not is_instance_valid(hero):
		return ""
	var n := str(hero.name).to_lower()
	var tn := str(hero.get("token_name")).to_lower()
	if "rogue" in n or "trinity" in tn or "maria" in tn or "maría" in tn:
		return "trinity"
	if "wizard" in n or "mike" in tn:
		return "mike"
	if "player" in n or "mia" in tn:
		return "mia"
	return ""

func _topics_for(id: String, hero: CharacterBody3D) -> Array:
	var out: Array = []
	out.append_array(Conversations.TOPICS.get(id, []))
	var hkey := _hero_key(hero)
	if not hkey.is_empty():
		var hero_map: Dictionary = Conversations.HERO_TOPICS.get(hkey, {})
		if hero_map.has(id):
			out.append_array(hero_map[id])
	for clue_id in _discovered_clues.keys():
		if bool(_discovered_clues.get(clue_id, false)):
			var cmap: Dictionary = Conversations.CLUE_TOPICS.get(str(clue_id), {})
			if cmap.has(id):
				out.append_array(cmap[id])
	return out

func record_discovered_clue(clue_id: String) -> void:
	if clue_id.is_empty():
		return
	_discovered_clues[clue_id] = true
	if _session:
		_session.set_meta("retreat_discovered_clues", _discovered_clues)

func has_discovered_clue(clue_id: String) -> bool:
	return bool(_discovered_clues.get(clue_id, false))

func is_dining_gathering_active() -> bool:
	return _dining_gathering

func set_dining_gathering_active(active: bool) -> bool:
	_dining_gathering = active
	_end_exchange()
	_stop_routines()
	var meal_spots := {
		"runara": [Vector3(128.25, 18.0, 61.50), Vector3(-1, 0, 0), ""],
		"tarak": [Vector3(117.15, 18.0, 52.55), Vector3(0.25, 0, 1), "retreat_cook"],
		"varnoth": [Vector3(121.6, 18.0, 59.55), Vector3(1, 0, 0), ""],
		"myla": [Vector3(123.6, 18.0, 59.55), Vector3(0.8, 0, 0.3), ""],
		"kilnip": [Vector3(125.6, 18.0, 59.15), Vector3(-1, 0, 0), ""],
		"laylee": [Vector3(120.2, 18.0, 59.45), Vector3(1, 0, 0.2), ""],
		"agga": [Vector3(118.9, 18.0, 61.85), Vector3(1, 0, -0.3), ""],
		"frub": [Vector3(126.9, 18.0, 59.45), Vector3(-0.6, 0, 0.4), ""],
	}
	for id: String in residents:
		var actor: Resident = residents[id]
		if not is_instance_valid(actor):
			continue
		actor.cancel_route()
		if _dining_gathering and meal_spots.has(id):
			var cfg: Array = meal_spots[id]
			var spot := _find_landing(cfg[0], actor.target_height, actor)
			if spot.is_finite():
				actor.place_at_station("dining_meal_" + id, spot, cfg[1], cfg[2], true)
		else:
			var key := _station_for(id)
			var spot := _find_landing(Directory.STATIONS[key][0], actor.target_height, actor)
			if spot.is_finite():
				_place(actor, key, spot, true)
	return _dining_gathering

func trigger_zombie_alarm(active: bool) -> void:
	if not active:
		return
	var blepp: Resident = residents.get("blepp")
	if is_instance_valid(blepp):
		blepp.cancel_route()
		var bspot := _find_landing(Vector3(73.2, 9.0, 96.4), blepp.target_height, blepp)
		if bspot.is_finite():
			blepp.place_at_station("blepp_alarm", bspot, Vector3(-1, 0, 0.35), "retreat_watch", true)
	var tarak: Resident = residents.get("tarak")
	if is_instance_valid(tarak):
		tarak.cancel_route()
		var tspot := _find_landing(Vector3(76.4, 9.0, 95.8), tarak.target_height, tarak)
		if tspot.is_finite():
			tarak.place_at_station("tarak_alarm", tspot, Vector3(-1, 0, 0.2), "", true)
	if is_instance_valid(_main) and _main.vtt_ui and _main.vtt_ui.has_method("notify_mesa"):
		_main.vtt_ui.notify_mesa("Blepp corre desde las escaleras Z2: «¡Tarak, viajeros! ¡Los marineros ahogados han vuelto a la playa, dejamos las cañas tiradas al subir!»")

func choose_topic(index: int) -> void:
	if not is_instance_valid(_talking_to) or not _dialogue_is_valid():
		close_conversation()
		return
	var id := _talking_to.resident_id
	var topics: Array = _topics_for(id, _speaking_hero)
	if index < 0 or index >= topics.size():
		return
	var choice: Array = topics[index]
	var answer: String = choice[1]
	if id == "tarak" and index == 2:
		var pressure := mini(2, int(_attitudes.get(id, 0)) + 1)
		_attitudes[id] = pressure
		if pressure == 2:
			answer = "Ya os he dicho cuanto pensaba decir. Dejadme trabajar."
	elif (id == "varnoth" and index == 2) or (id == "agga" and index == 0):
		_attitudes[id] = true
	if _session:
		_session.set_meta("retreat_attitudes", _attitudes)
	if choice.size() >= 3 and not _talking_to.play_station_activity(choice[2]):
		answer = "Os lo enseño cuando vuelva a mi puesto."
	elif id == "kilnip":
		_talking_to.play_gesture("retreat_chat")
	dialogue.append_line(_speaking_hero.token_name, choice[0], true)
	dialogue.append_line(_talking_to.token_name, answer, false)
	last_conversation = {"resident": id, "text": answer, "topic": choice[0]}

func open_party_dialogue() -> void:
	var hero := active_hero()
	if not _can_open_dialogue(hero):
		return
	_lock_dialogue(hero)
	dialogue.open_lines("Conversación del grupo", "Habla como %s" % hero.token_name, _party_lines, [], true)

func _send_party_line(line: String) -> void:
	if not dialogue.party_mode or not _dialogue_is_valid():
		return
	var entry := {"speaker": _speaking_hero.token_name, "text": line, "hero": true}
	_party_lines.append(entry)
	if _party_lines.size() > 36:
		_party_lines.pop_front()
	if _session:
		_session.set_meta("retreat_party_lines", _party_lines)
	dialogue.append_line(entry.speaker, entry.text, true)

func _can_open_dialogue(hero: CharacterBody3D) -> bool:
	var ui = _main.vtt_ui
	return (
		is_instance_valid(hero) and ui.current_role == "player" and not table_in_combat()
		and not ui.player_hud.modal_backdrop.visible
	)

func _lock_dialogue(hero: CharacterBody3D) -> void:
	close_conversation()
	_end_exchange()
	_speaking_hero = hero
	hero.set_meta("retreat_dialogue_open", true)
	_main.vtt_ui._clear_joystick()
	_main.vtt_ui.player_hud.toggle_exploration_menu(false)

func _dialogue_is_valid() -> bool:
	return (
		is_instance_valid(_speaking_hero) and _speaking_hero == active_hero() and _can_open_dialogue(_speaking_hero)
		and (not is_instance_valid(_talking_to) or _talking_to.can_be_heard_by(_speaking_hero, Resident.TALK_REACH + 0.2))
	)

func close_conversation() -> void:
	if is_instance_valid(_speaking_hero):
		_speaking_hero.remove_meta("retreat_dialogue_open")
		_speaking_hero = null
	if is_instance_valid(_talking_to):
		_talking_to.stop_talking()
		_talking_to = null
	if is_instance_valid(dialogue):
		dialogue.close()

func has_open_dialogue() -> bool:
	return is_instance_valid(dialogue) and dialogue.panel.visible

func synchronize_clock(clock: int) -> void:
	var next := _phase_for_clock(clock)
	if next != phase:
		set_time_of_day(next)
		var env: Node = _main.vtt_ui.ship_env
		if is_instance_valid(env):
			env.set_time_of_day(next)

func set_time_of_day(next_phase: String) -> void:
	if next_phase not in CLOCK_PHASES or phase == next_phase:
		return
	phase = next_phase
	_end_exchange()
	_stop_routines()
	for id: String in residents:
		var actor: Resident = residents[id]
		actor.cancel_route()
		_travel_orders[id] = _station_for(id)
		_departures[id] = _elapsed + 0.3 + float(abs(id.hash()) % 11) * 0.22

static func _phase_for_clock(clock: int) -> String:
	var hour := posmod(clock, 86400) / 3600.0
	if hour < 6.0 or hour >= 21.0:
		return "night"
	return "dusk" if hour >= 18.0 else "day"

func _station_for(id: String) -> String:
	if id == "runara" and not _welcomed:
		return Directory.WELCOME
	return Directory.RESIDENTS[id].stations[CLOCK_PHASES.find(phase)]

func _physics_process(delta: float) -> void:
	if has_open_dialogue() and not _dialogue_is_valid():
		close_conversation()
	if table_in_combat():
		_end_exchange()
		if not _running_routines.is_empty():
			_stop_routines()
		return
	_elapsed += delta
	_next_scan -= delta
	if _next_scan > 0.0:
		return
	_next_scan = 0.3
	_finish_routines()
	_dispatch_routes()
	_update_exchanges()

func _dispatch_routes() -> void:
	for id: String in residents:
		var actor: Resident = residents[id]
		if actor.is_talking() or is_routine_running(actor) or not actor.route_goal.is_empty() or _elapsed < float(_departures[id]):
			continue
		var key := str(_travel_orders.get(id, ""))
		if key.is_empty():
			if id == "runara" and not _welcomed:
				continue
			var options := Routines.for_phase(id, phase)
			if options.is_empty():
				continue
			var cursor_key := id + "/" + phase
			var index := int(_routine_cursor.get(cursor_key, 0))
			var task: Array = options[index % options.size()]
			_routine_cursor[cursor_key] = index + 1
			_routine_orders[id] = task
			key = task[2]
			_travel_orders[id] = key
		if key == actor.station_id and actor.global_position.distance_to(actor.station_origin) < 0.45:
			_travel_orders.erase(id)
			_begin_routine_at_station(actor)
			continue
		if actor.action_lock_timer > 0.0:
			continue
		var station := Routines.station(key)
		var spot := _find_landing(station[0], actor.target_height, actor)
		_departures[id] = _elapsed + 4.0
		if not spot.is_finite():
			_routine_route_failure(actor)
			continue
		var route := routes.path(actor.global_position, spot)
		if route.is_empty():
			_routine_route_failure(actor)
			continue
		_travel_orders[id] = key
		actor.begin_route(key, route)

func on_station_reached(actor: Resident, key: String) -> void:
	_place(actor, key, actor.global_position, false)
	_travel_orders.erase(actor.resident_id)
	_begin_routine_at_station(actor)

func on_route_blocked(actor: Resident, key: String) -> void:
	_travel_orders[actor.resident_id] = key
	_departures[actor.resident_id] = _elapsed + 3.0
	_routine_route_failure(actor)

func _round_pause(id: String) -> float:
	return 6.5 + float(abs(id.hash()) % 7) * 0.72

func _place(actor: Resident, key: String, spot: Vector3, spawn := true) -> void:
	var station := Routines.station(key)
	actor.place_at_station(key, spot, station[1], station[2], spawn)

func is_routine_running(actor: Resident) -> bool:
	return _running_routines.has(actor.resident_id)

func _begin_routine_at_station(actor: Resident) -> void:
	var id := actor.resident_id
	_departures[id] = _elapsed + _round_pause(id)
	_blocked_routines.erase(id)
	var task: Array = _routine_orders.get(id, [])
	if task.is_empty() or not routine_props.can_reach(actor, task[5]):
		_routine_orders.erase(id)
		return
	var prop_at := routine_props.anchor(task[5])
	actor.face_world_direction(prop_at - actor.global_position if prop_at.is_finite() else actor.station_heading)
	var duration := 2.1 if task[6] in ["draw", "water", "cloth"] else 1.65
	if not actor.play_gesture(task[4], duration, 0.42):
		_routine_orders.erase(id)
		return
	_running_routines[id] = {"task": task, "until": _elapsed + duration + 0.38, "contact": false}
	_departures[id] = _elapsed + duration + _round_pause(id)
	_invite_companion(actor, task)

func _invite_companion(actor: Resident, task: Array) -> void:
	var companion_id: String = COMPANIONS.get(actor.resident_id + "/" + str(task[0]), "")
	var ally: Resident = residents.get(companion_id)
	if not is_instance_valid(ally) or ally.is_talking() or is_routine_running(ally) or not ally.route_goal.is_empty():
		return
	if not actor.can_be_heard_by(ally, 3.55):
		return
	ally.look_at_speaker(actor)
	ally.play_gesture("retreat_work", 1.3)
	_partner_holds[actor.resident_id] = companion_id
	routine_shared.emit(actor.resident_id, task[0], companion_id)
	if str(task[5]).is_empty():
		actor.face_world_direction(ally.global_position - actor.global_position)

func _release_companion(id: String) -> void:
	if _partner_holds.has(id):
		var ally: Resident = residents.get(_partner_holds[id])
		_partner_holds.erase(id)
		if is_instance_valid(ally):
			ally.stop_talking()

func _finish_routines() -> void:
	for id: String in _running_routines.keys():
		if _elapsed >= float(_running_routines[id].until):
			_running_routines.erase(id)
			_routine_orders.erase(id)
			_release_companion(id)

func _interrupt_routine(actor: Resident, retry: bool) -> void:
	var id := actor.resident_id
	if not _running_routines.has(id):
		return
	var task: Dictionary = _running_routines[id]
	_running_routines.erase(id)
	_release_companion(id)
	if retry and not task.contact:
		_travel_orders[id] = actor.station_id
	else:
		_routine_orders.erase(id)

func _stop_routines() -> void:
	for id: String in _running_routines.keys():
		if is_instance_valid(residents.get(id)):
			residents[id].play_action_animation("idle")
		_release_companion(id)
	_running_routines.clear()
	for id: String in _routine_orders:
		_travel_orders.erase(id)
	_routine_orders.clear()
	_blocked_routines.clear()
	routine_props.stop_all()

func _routine_route_failure(actor: Resident) -> void:
	var id := actor.resident_id
	if not _routine_orders.has(id):
		return
	var failures := int(_blocked_routines.get(id, 0)) + 1
	if failures < 3:
		_blocked_routines[id] = failures
		return
	_routine_orders.erase(id)
	_travel_orders.erase(id)
	_blocked_routines.erase(id)

func _find_landing(proposed: Vector3, height: float, actor_to_exclude: Resident = null) -> Vector3:
	var space := get_world_3d().direct_space_state
	var footprint := CapsuleShape3D.new()
	footprint.height = height * 0.91
	footprint.radius = minf(0.29, height * 0.25)
	var clearance := PhysicsShapeQueryParameters3D.new()
	clearance.shape = footprint
	clearance.collision_mask = 1
	for offset: Vector2 in LANDING_OFFSETS:
		var center := proposed + Vector3(offset.x, 0.0, offset.y)
		var ray := PhysicsRayQueryParameters3D.create(center + Vector3.UP * 0.42, center - Vector3.UP * 0.55, 1)
		var floor_hit := space.intersect_ray(ray)
		if floor_hit.is_empty() or floor_hit.normal.y < 0.75:
			continue
		var foot: Vector3 = floor_hit.position + Vector3.UP * 0.055
		clearance.transform = Transform3D(Basis.IDENTITY, foot + Vector3.UP * (footprint.height * 0.5))
		if not space.intersect_shape(clearance, 1).is_empty():
			continue
		if residents.values().any(func(actor: Resident) -> bool: return actor != actor_to_exclude and actor.global_position.distance_to(foot) < 0.76):
			continue
		return foot
	return Vector3.INF

func _update_exchanges() -> void:
	if has_open_dialogue():
		return
	var hero := active_hero()
	if not _exchange.is_empty():
		var source: Resident = _exchange_speaker(_exchange_index)
		if not source.can_be_heard_by(hero, HEARING_REACH):
			_end_exchange()
		elif _elapsed >= _exchange_until:
			_exchange_index += 1
			if _exchange_index >= _exchange.lines.size():
				_end_exchange()
			else:
				_speak_exchange_line()
		return
	for candidate: Dictionary in Conversations.EXCHANGES:
		if phase not in candidate.phases or _elapsed < float(_exchange_cooldowns.get(candidate.id, 2.0)):
			continue
		var first: Resident = residents.get(candidate.pair[0])
		var second: Resident = residents.get(candidate.pair[1])
		if not is_instance_valid(first) or not is_instance_valid(second):
			continue
		if not first.route_goal.is_empty() or not second.route_goal.is_empty() or first.is_talking() or second.is_talking():
			continue
		if is_routine_running(first) or is_routine_running(second):
			continue
		if not first.can_be_heard_by(second, EXCHANGE_REACH):
			continue
		if not first.can_be_heard_by(hero, HEARING_REACH) or not second.can_be_heard_by(hero, HEARING_REACH):
			continue
		_exchange = candidate
		_exchange_index = 0
		first.look_at_speaker(second)
		second.look_at_speaker(first)
		_speak_exchange_line()
		break

func _exchange_speaker(index: int) -> Resident:
	return residents[_exchange.pair[index % 2]]

func _speak_exchange_line() -> void:
	var actor := _exchange_speaker(_exchange_index)
	if actor.resident_id == "kilnip":
		actor.play_gesture("retreat_chat")
	elif actor.resident_id == "agga":
		actor.play_gesture("retreat_direct")
	var words: String = _exchange.lines[_exchange_index]
	last_overheard = {"id": _exchange.id, "speaker": actor.resident_id, "text": words}
	_exchange_until = _elapsed + clampf(words.length() * 0.038 + 1.55, 2.6, 5.4)

func _end_exchange() -> void:
	if not _exchange.is_empty():
		for id: String in _exchange.pair:
			var actor: Resident = residents.get(id)
			if is_instance_valid(actor):
				actor.stop_talking()
		_exchange_cooldowns[_exchange.id] = _elapsed + (55.0 if _exchange_index >= 2 else 6.0)
		_exchange = {}
	if is_instance_valid(dialogue):
		dialogue.caption.hide()

func _process(_delta: float) -> void:
	if _exchange.is_empty() or not is_instance_valid(dialogue) or not dialogue.is_visible_in_tree():
		return
	dialogue.display_caption(_exchange_speaker(_exchange_index), _exchange.lines[_exchange_index], _main.camera)

func on_activity_contact(actor: Resident, action: String) -> void:
	if is_routine_running(actor):
		var running: Dictionary = _running_routines[actor.resident_id]
		var task: Array = running.task
		if not running.contact and routine_props.react(actor, task[5], task[6]):
			running.contact = true
			routine_contacted.emit(actor.resident_id, task[0], task[5])
		return
	if action == "retreat_tinker" and actor.station_id == "myla_bench" and is_instance_valid(_workbench):
		_workbench.spin_workbench_gear()
	elif action == "retreat_incense" and actor.station_id == "rix_temple" and is_instance_valid(_incense):
		if not _main.vtt_ui or not _main.vtt_ui.get_env_reduced_effects():
			_incense.restart()
			_incense.emitting = true
	elif action == "retreat_cook" and actor.station_id == "tarak_kitchen" and is_instance_valid(_stew):
		if _stove.get_meta("manually_lit", false) and not _main.vtt_ui.get_env_reduced_effects():
			_stew.restart()
			_stew.emitting = true

func play_routine_vapor(verb: String) -> bool:
	var vapor := _incense if verb == "incense" else _stew
	if not is_instance_valid(vapor):
		return false
	if not _main.vtt_ui.get_env_reduced_effects() and (verb == "incense" or _stove.get_meta("manually_lit", false)):
		vapor.restart()
		vapor.emitting = true
	return true

func _build_vapor(parent: Node3D, node_name: String, origin: Vector3, color: Color) -> GPUParticles3D:
	var particles := GPUParticles3D.new()
	particles.name = node_name
	particles.position = origin
	particles.amount = 9
	particles.lifetime = 3.0
	particles.one_shot = true
	particles.explosiveness = 0.18
	particles.local_coords = false
	particles.emitting = false
	var movement := ParticleProcessMaterial.new()
	movement.direction = Vector3.UP
	movement.spread = 11.0
	movement.gravity = Vector3(0.045, 0.05, 0.015)
	movement.initial_velocity_min = 0.12
	movement.initial_velocity_max = 0.23
	movement.scale_min = 0.6
	movement.scale_max = 1.45
	var fade := GradientTexture1D.new()
	fade.gradient = Gradient.new()
	fade.gradient.offsets = PackedFloat32Array([0.0, 0.24, 1.0])
	fade.gradient.colors = PackedColorArray([Color(1, 1, 1, 0.0), Color(1, 1, 1, 0.48), Color(1, 1, 1, 0.0)])
	movement.color_ramp = fade
	particles.process_material = movement

	var puff := QuadMesh.new()
	puff.size = Vector2(0.18, 0.24)
	var material := StandardMaterial3D.new()
	material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	material.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	material.billboard_mode = BaseMaterial3D.BILLBOARD_PARTICLES
	material.vertex_color_use_as_albedo = true
	var edge := GradientTexture2D.new()
	edge.gradient = Gradient.new()
	edge.gradient.set_color(0, color)
	edge.gradient.set_color(1, Color(color, 0.0))
	edge.fill = GradientTexture2D.FILL_RADIAL
	edge.fill_from = Vector2(0.5, 0.5)
	edge.fill_to = Vector2(1.0, 0.5)
	material.albedo_texture = edge
	puff.material = material
	particles.draw_pass_1 = puff
	parent.add_child(particles)
	return particles
