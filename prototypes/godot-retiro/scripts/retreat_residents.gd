extends Node3D

const Directory = preload("res://scripts/retreat_resident_directory.gd")
const Conversations = preload("res://scripts/retreat_conversations.gd")
const ConversationPanel = preload("res://scripts/retreat_dialogue_panel.gd")
const Routes = preload("res://scripts/retreat_resident_routes.gd")
const Routines = preload("res://scripts/retreat_routine_directory.gd")
const Featured = preload("res://scripts/retreat_characteristic_routines.gd")
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
var _blocked_waypoints: Dictionary = {}
var _partner_holds: Dictionary = {}
var _spot_reservations: Dictionary = {}
var _feature_second_stage: Dictionary = {}
var _featured_cooldowns: Dictionary = {}
var _paused_residents: Dictionary = {}
var _manual_routines: Dictionary = {}
var _meal_visits: Dictionary = {}
var _social_appointments: Dictionary = {}
var autonomy_paused := false
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
		var preferences: Dictionary = _session.get_meta("retreat_routine_preferences", {})
		autonomy_paused = bool(preferences.get("paused", false))
		_paused_residents = preferences.get("residents", {}).duplicate()
		_routine_cursor = preferences.get("cursor", {}).duplicate()
		_meal_visits = preferences.get("meals", {}).duplicate()
		_session.transition_started.connect(_save_routine_checkpoint)
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
	var checkpoint: Dictionary = _session.get_meta("retreat_routine_checkpoint", {}) if _session else {}
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
		var height := float(Featured.HEIGHTS.get(id, definition.heightMeters))
		var saved: Dictionary = checkpoint.get(id, {}) if id != "runara" or _welcomed else {}
		var default_ground: Vector3 = Directory.STATIONS[key][0]
		var spot := _find_landing(saved.get("position", default_ground), height)
		if not spot.is_finite() and not saved.is_empty():
			spot = _find_landing(default_ground, height)
		if not spot.is_finite():
			push_warning("Retreat resident " + id + " has no supported initial station: " + key)
			continue
		var body := TokenScene.instantiate() as CharacterBody3D
		body.set_script(Resident)
		var actor := body as Resident
		actor.name = "Resident_" + id.capitalize()
		actor.position = to_local(spot)
		actor.configure(id, Directory.RESIDENTS[id], view, self)
		actor.target_height = height
		if id == "runara":
			actor.welcomed = key != Directory.WELCOME
		add_child(actor)
		residents[id] = actor
		_place(actor, key, spot)
		if saved.has("heading") and spot.distance_to(saved.position) <= 1.1:
			actor.face_world_direction(saved.heading)
		_departures[id] = 3.5 + float(abs(id.hash()) % 11) * 0.54
	await get_tree().physics_frame
	if not is_inside_tree():
		return
	routes.build(self)
	routine_props.bind(self, _main, _workbench, _stove, _incense)
	for id: String in checkpoint:
		var actor: Resident = residents.get(id)
		var saved: Dictionary = checkpoint[id]
		var task := Featured.get_row(id, str(saved.get("activity", "")))
		if not is_instance_valid(actor) or task.is_empty() or not _can_reserve(id, task):
			continue
		if saved.get("manual", false):
			_manual_routines[id] = true
		elif resident_autonomy_disabled(id) or not Routines.TIME_CODE[phase] in task[1]:
			continue
		_queue_feature(id, task)
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
	dialogue.bind_context(actor, hero, _main.camera, _topic_tags_for(actor.resident_id, hero))
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

func _topic_tags_for(id: String, hero: CharacterBody3D) -> Array:
	var tags: Array = []
	for t: Array in Conversations.TOPICS.get(id, []):
		tags.append("Gesto" if t.size() >= 3 and not str(t[2]).is_empty() else "")
	var hkey := _hero_key(hero)
	if not hkey.is_empty():
		var hero_map: Dictionary = Conversations.HERO_TOPICS.get(hkey, {})
		if hero_map.has(id):
			var hero_badge := str({"mia": "Mía · Clériga", "trinity": "Trinity", "mike": "Mike · Arcano"}.get(hkey, hkey.capitalize()))
			for _t in hero_map[id]:
				tags.append(hero_badge)
	for clue_id in _discovered_clues.keys():
		if bool(_discovered_clues.get(clue_id, false)):
			var cmap: Dictionary = Conversations.CLUE_TOPICS.get(str(clue_id), {})
			if cmap.has(id):
				for _t in cmap[id]:
					tags.append("Pista")
	return tags

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
	for id in ["blepp", "tarak"]:
		var actor: Resident = residents.get(id)
		if is_instance_valid(actor):
			_cancel_order(actor)
			_departures[id] = _elapsed + 15.0
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
	dialogue.bind_context(hero, hero, _main.camera, [])
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
		if not _running_routines.is_empty() or not _routine_orders.is_empty():
			_stop_routines()
		return
	if _dining_gathering or (autonomy_paused and _manual_routines.is_empty()):
		return
	_elapsed += delta
	_next_scan -= delta
	if _next_scan > 0.0:
		return
	_next_scan = 0.3
	_finish_routines()
	_dispatch_routes()
	if not autonomy_paused:
		_update_exchanges()

func list_characteristic_routines(id: String) -> Array:
	return Featured.ROWS.get(id, [])

func routine_status(id: String) -> Dictionary:
	var actor: Resident = residents.get(id)
	if not is_instance_valid(actor):
		return {}
	var task: Array = _routine_orders.get(id, [])
	var route: String = _travel_orders.get(id, actor.route_goal)
	return {
		"activity": task[3] if not task.is_empty() else "En espera",
		"destination": route if not route.is_empty() else actor.station_id,
		"paused": autonomy_paused or _paused_residents.has(id),
		"individually_paused": _paused_residents.has(id),
		"running": _running_routines.has(id),
	}

func set_autonomy_paused(value: bool) -> void:
	autonomy_paused = value
	if value:
		_end_exchange()
		_stop_routines()
		for actor: Resident in residents.values():
			actor.cancel_route()
		_travel_orders.clear()
	_store_preferences()

func set_resident_paused(id: String, value: bool) -> void:
	if not residents.has(id):
		return
	if value:
		_paused_residents[id] = true
		_cancel_order(residents[id])
	else:
		_paused_residents.erase(id)
	_store_preferences()

func request_characteristic_routine(id: String, activity: String) -> bool:
	var actor: Resident = residents.get(id)
	var task := Featured.get_row(id, activity)
	if task.is_empty() or not is_instance_valid(actor) or actor.is_talking() or table_in_combat() or _dining_gathering:
		return false
	if not _conditions_allow(task) or not _can_reserve(id, task):
		return false
	_cancel_order(actor)
	_paused_residents.erase(id)
	_manual_routines[id] = true
	_queue_feature(id, task)
	_departures[id] = _elapsed
	_store_preferences()
	return true

func move_resident(id: String, destination: Vector3) -> bool:
	var actor: Resident = residents.get(id)
	if not is_instance_valid(actor) or actor.is_talking():
		return false
	var spot := _find_landing(destination, actor.target_height, actor)
	if not spot.is_finite():
		return false
	var route := routes.path(actor.global_position, spot)
	if route.is_empty():
		return false
	_cancel_order(actor)
	_paused_residents[id] = true
	actor.begin_route("@dm", route)
	_store_preferences()
	return true

func _store_preferences() -> void:
	if _session:
		_session.set_meta("retreat_routine_preferences", {
			"paused":autonomy_paused, "residents":_paused_residents.duplicate(), "cursor":_routine_cursor.duplicate(),
			"meals":_meal_visits.duplicate(),
		})

func _save_routine_checkpoint(_source: String, _destination: String, _spawn: String) -> void:
	var checkpoint := {}
	for id: String in residents:
		var actor: Resident = residents[id]
		var task: Array = _routine_orders.get(id, [])
		checkpoint[id] = {
			"position":actor.get_meta("pre_interact_pos", actor.global_position),
			"heading":actor.world_heading_for_pose(actor.facing_dir),
			"activity":str(task[0]) if not task.is_empty() else "",
			"manual":_manual_routines.has(id),
		}
	if _session:
		_session.set_meta("retreat_routine_checkpoint", checkpoint)
	_store_preferences()

func _meal_order(id: String) -> Array:
	var clock: int = _main.vtt_ui.clock_seconds
	var second := posmod(clock, 86400)
	for moment: Array in [[8, "Desayuna"], [13, "Come"], [19, "Cena"]]:
		var time: int = int(moment[0]) * 3600
		if second < time or second >= time + 720:
			continue
		var meal_key := "meal/%s/%s" % [floori(float(clock) / 86400.0), moment[0]]
		if _meal_visits.get(id, "") == meal_key:
			return []
		var options := [
			[meal_key, "", "east_dinner", str(moment[1]) + " en el comedor", "retreat_work", "RetreatSoupBowl", "taste"],
			[meal_key, "", "west_dinner", str(moment[1]) + " en el comedor", "retreat_work", "RetreatDinnerBread", "inspect"],
		]
		if id == "tarak":
			options = [[meal_key, "", "tarak_kitchen", "Prepara la comida comunitaria", "retreat_cook", "@stove", "simmer"]]
		for task: Array in options:
			if _can_reserve(id, task):
				_meal_visits[id] = meal_key
				_store_preferences()
				return task
	return []

func _can_reserve(id: String, task: Array) -> bool:
	var station_key := str(task[2])
	var object_key := str(task[5])
	return _spot_reservations.get(station_key, id) == id and (object_key.is_empty() or str(task[6]) == "observe" or _spot_reservations.get(object_key, id) == id)

func _conditions_allow(task: Array) -> bool:
	if task[6] == "fishing" and _main.vtt_ui.is_retreat_zombie_reappearance_active():
		return false
	return Featured.allows(task, _main.vtt_ui.get_env_weather())

func activity_spot(task: Array) -> Dictionary:
	const Structure = preload("res://scripts/retreat_structure.gd")
	var key := str(task[2])
	var station := Routines.station(key)
	var point := routine_props.anchor(task[5])
	var next: Array = Featured.TOURS.get(task[0], [])
	return {
		"id":key, "zone":Structure.get_zone_at(station[0]), "approach":station[0], "heading":station[1],
		"contact":point, "family":Featured.family(task), "furniture":task[5], "capacity":1,
		"reserved_by":_spot_reservations.get(key, ""), "hours":task[1], "available":_conditions_allow(task),
		"exit":station[0], "next":next[0] if not next.is_empty() else "",
	}

func _queue_feature(id: String, task: Array) -> void:
	_spot_reservations[str(task[2])] = id
	if not str(task[5]).is_empty() and str(task[6]) != "observe":
		_spot_reservations[str(task[5])] = id
	_routine_orders[id] = task
	_travel_orders[id] = task[2]

func _release_reservation(id: String) -> void:
	for key: String in _spot_reservations.keys():
		if _spot_reservations[key] == id:
			_spot_reservations.erase(key)

func _cancel_order(actor: Resident) -> void:
	var id := actor.resident_id
	_interrupt_routine(actor, false)
	actor.cancel_route()
	actor.play_action_animation("idle")
	_routine_orders.erase(id)
	_travel_orders.erase(id)
	_feature_second_stage.erase(id)
	_manual_routines.erase(id)
	_social_appointments.erase(id)
	_release_reservation(id)
	routine_props.release_actor(id)

func _pick_routine(id: String, options: Array) -> Array:
	var cursor_key := id + "/" + phase
	var index := int(_routine_cursor.get(cursor_key, 0))
	for offset: int in options.size():
		var task: Array = options[(index + offset) % options.size()]
		if not _conditions_allow(task) or not _can_reserve(id, task) or _elapsed < float(_featured_cooldowns.get(task[0], 0.0)):
			continue
		_routine_cursor[cursor_key] = index + offset + 1
		_store_preferences()
		return task
	return []

func _is_feature(id: String, task: Array) -> bool:
	return not task.is_empty() and (str(task[0]).begins_with("meal/") or not Featured.get_row(id, task[0]).is_empty())

func _dispatch_routes() -> void:
	for id: String in residents:
		var actor: Resident = residents[id]
		if autonomy_paused and not _manual_routines.has(id):
			continue
		if _paused_residents.has(id) or actor.is_talking() or is_routine_running(actor) or not actor.route_goal.is_empty() or _elapsed < float(_departures[id]):
			continue
		var key := str(_travel_orders.get(id, ""))
		if key.is_empty():
			if id == "runara" and not _welcomed:
				continue
			var options := Routines.for_phase(id, phase)
			if options.is_empty():
				continue
			var task := _meal_order(id)
			if task.is_empty():
				task = _pick_routine(id, options)
			if task.is_empty():
				continue
			_queue_feature(id, task)
			if _is_feature(id, task):
				_invite_feature_partner(id, task)
			key = task[2]
			_travel_orders[id] = key
		if key == actor.station_id and actor.global_position.distance_to(actor.station_origin) < 0.45:
			_travel_orders.erase(id)
			_begin_routine_at_station(actor)
			continue
		if actor.action_lock_timer > 0.0:
			continue
		var station := Routines.station(key)
		var destination: Vector3 = station[0]
		var order: Array = _routine_orders.get(id, [])
		if not order.is_empty() and order[0] == "AGG_01":
			var partner := _plan_agga_conversation(actor, destination)
			if not is_instance_valid(partner):
				_cancel_order(actor)
				_departures[id] = _elapsed + 3.0
				continue
			var direction := actor.global_position - partner.global_position
			direction.y = 0.0
			destination = partner.global_position + (direction.normalized() if direction.length() > 0.2 else Vector3.FORWARD) * 1.3
		var spot := _find_landing(destination, actor.target_height, actor)
		_departures[id] = _elapsed + 4.0
		if not spot.is_finite():
			_routine_route_failure(actor)
			continue
		var avoid: PackedVector3Array = _blocked_waypoints.get(id, PackedVector3Array())
		var route := routes.path(actor.global_position, spot, avoid)
		if route.is_empty():
			_routine_route_failure(actor)
			continue
		_travel_orders[id] = key
		actor.begin_route(key, route)

func _plan_agga_conversation(actor: Resident, around: Vector3) -> Resident:
	var nearest: Resident
	var distance := 13.0
	for id: String in ["frub", "blepp", "zark", "mumpo"]:
		var other: Resident = residents.get(id)
		if not is_instance_valid(other) or resident_autonomy_disabled(id) or other.is_talking() or not other.route_goal.is_empty() or _routine_orders.has(id):
			continue
		var offset := other.global_position - around
		if absf(offset.y) > 0.8 or offset.length() >= distance:
			continue
		var route := routes.path(actor.global_position, other.global_position)
		if route.is_empty():
			continue
		nearest = other
		distance = offset.length()
	if nearest:
		_social_appointments[actor.resident_id] = nearest.resident_id
		_departures[nearest.resident_id] = maxf(float(_departures[nearest.resident_id]), _elapsed + 8.0 + actor.global_position.distance_to(nearest.global_position) / actor.speed)
	return nearest

func on_station_reached(actor: Resident, key: String) -> void:
	_blocked_waypoints.erase(actor.resident_id)
	if key == "@dm":
		actor.station_origin = actor.global_position
		return
	_place(actor, key, actor.global_position, false)
	_travel_orders.erase(actor.resident_id)
	_begin_routine_at_station(actor)

func on_route_blocked(actor: Resident, key: String, obstacle := Vector3.INF) -> void:
	if key == "@dm":
		return
	if obstacle.is_finite():
		var memory: PackedVector3Array = _blocked_waypoints.get(actor.resident_id, PackedVector3Array())
		if not memory.has(obstacle):
			memory.append(obstacle)
			_blocked_waypoints[actor.resident_id] = memory
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

func holds_routine_pose(actor: Resident) -> bool:
	var current: Dictionary = _running_routines.get(actor.resident_id, {})
	return not current.is_empty() and current.task[6] == "fishing"

func resident_autonomy_disabled(id: String) -> bool:
	return autonomy_paused or _paused_residents.has(id)

func _invite_feature_partner(id: String, task: Array) -> void:
	var pair: Array = Featured.PARTNERS.get(task[0], [])
	if pair.is_empty():
		return
	var other_id: String = pair[0]
	var ally: Resident = residents.get(other_id)
	var other := Featured.get_row(other_id, pair[1])
	if not is_instance_valid(ally) or (other_id == "runara" and not _welcomed) or ally.is_talking() or resident_autonomy_disabled(other_id):
		return
	if is_routine_running(ally) or not ally.route_goal.is_empty() or _routine_orders.has(other_id):
		return
	if not Routines.TIME_CODE[phase] in other[1] or not _conditions_allow(other) or not _can_reserve(other_id, other) or _elapsed < float(_featured_cooldowns.get(other[0], 0.0)):
		return
	_queue_feature(other_id, other)
	_departures[other_id] = _elapsed + 0.76
	routine_shared.emit(id, task[0], other_id)

func _begin_routine_at_station(actor: Resident) -> void:
	var id := actor.resident_id
	_departures[id] = _elapsed + _round_pause(id)
	_blocked_routines.erase(id)
	var task: Array = _routine_orders.get(id, [])
	if task.is_empty() or not _conditions_allow(task) or not routine_props.can_reach(actor, task[5]):
		_cancel_order(actor)
		return
	var prop_at := routine_props.working_anchor(task[5], task[6])
	actor.face_world_direction(prop_at - actor.global_position if prop_at.is_finite() else actor.station_heading)
	if task[6] == "doze":
		if task[0] == "KIL_01":
			actor.set_meta("awake_rest", true)
		if routine_props.try_rest(actor, task[5]):
			var duration := 8.0
			_running_routines[id] = {"task": task, "until": _elapsed + duration, "contact": true}
			_departures[id] = _elapsed + duration + _round_pause(id)
			routine_contacted.emit(id, task[0], task[5])
		else:
			if actor.has_meta("awake_rest"):
				actor.remove_meta("awake_rest")
			_routine_orders.erase(id)
			_manual_routines.erase(id)
			_release_reservation(id)
		return
	var duration := 2.1 if task[6] in ["draw", "water", "cloth"] else 1.65
	if _is_feature(id, task):
		duration = Featured.duration(task, fposmod(float(str(task[0]).hash() % 169) * 0.01 + _elapsed * 0.047, 1.0))
	if task[0] == "RUN_02" and actor.has_seated_study():
		if not routine_props.try_desk_seat(actor):
			_cancel_order(actor)
			return
		actor.set_seated_study("retreat_desk_read", routine_props.desk_book_contact(task[5]))
		_running_routines[id] = {"task": task, "until": _elapsed + 7.2, "contact": true, "read_started": _elapsed}
		_departures[id] = _elapsed + 7.2 + _round_pause(id)
		routine_contacted.emit(id, task[0], task[5])
		return
	var idle_task: bool = task[4] == "idle"
	if not idle_task and not actor.play_gesture(task[4], duration, 0.28 if task[6] in ["fishing", "sweep"] else 0.42):
		_routine_orders.erase(id)
		_release_reservation(id)
		return
	if idle_task:
		actor.play_action_animation("idle")
	if task[6] == "unload":
		duration = actor.action_lock_timer
	_running_routines[id] = {"task": task, "until": _elapsed + duration + 0.38, "contact": false}
	if task[6] == "fishing":
		_running_routines[id]["wait_until"] = _elapsed + duration + 36.0
	_departures[id] = _elapsed + duration + _round_pause(id)
	if idle_task or task[6] in ["fishing", "stonework", "metalwork", "woodwork", "sweep", "wipe", "carry_box", "carry_sack", "unload"]:
		on_activity_contact(actor, task[4])
	_invite_companion(actor, task)

func _invite_companion(actor: Resident, task: Array) -> void:
	var companion_id: String = COMPANIONS.get(actor.resident_id + "/" + str(task[0]), "")
	if task[0] == "AGG_01":
		var chosen: String = _social_appointments.get(actor.resident_id, "")
		var candidates := [chosen] if not chosen.is_empty() else ["frub", "blepp", "zark"]
		for id: String in candidates:
			var nearby: Resident = residents.get(id)
			if is_instance_valid(nearby) and not resident_autonomy_disabled(id) and not nearby.is_talking() and not is_routine_running(nearby) and nearby.route_goal.is_empty() and actor.can_be_heard_by(nearby, 3.55):
				companion_id = id
				break
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
	if task[0] == "AGG_01" and _exchange.is_empty() and actor.can_be_heard_by(active_hero(), HEARING_REACH):
		_exchange = {"id":"agga_errand", "pair":[actor.resident_id, companion_id],
			"lines":["Revisa qué falta en el taller antes de bajar al muelle.", "Me paso por allí cuando termine."]}
		_exchange_index = 0
		_speak_exchange_line()

func _release_companion(id: String) -> void:
	if _partner_holds.has(id):
		var ally: Resident = residents.get(_partner_holds[id])
		_partner_holds.erase(id)
		if is_instance_valid(ally):
			ally.stop_talking()

func _finish_routines() -> void:
	for id: String in _running_routines.keys():
		var running: Dictionary = _running_routines[id]
		var task: Array = running.task
		if not _conditions_allow(task):
			_cancel_order(residents[id])
			_departures[id] = _elapsed + 1.5
			continue
		if running.has("read_started"):
			var read_time := _elapsed - float(running.read_started)
			residents[id].set_seated_study("retreat_desk_turn" if read_time >= 3.3 and read_time < 3.85 else "retreat_desk_read")
		if _elapsed >= float(running.until):
			if _wait_for_fishing_partner(running, task):
				continue
			if task[6] == "fishing" and not running.has("retrieving") and routine_props.tools.begin_fishing_retrieval(id):
				running["retrieving"] = true
				running["until"] = _elapsed + 0.95
				continue
			_release_routine_rest(id)
			_running_routines.erase(id)
			_release_companion(id)
			_release_reservation(id)
			var next: Array = Featured.TOURS.get(task[0], [])
			if running.contact and not next.is_empty() and not _feature_second_stage.has(id):
				var followup := task.duplicate()
				followup[2] = next[0]
				followup[5] = next[1]
				followup[6] = next[2]
				if _can_reserve(id, followup):
					_feature_second_stage[id] = true
					_queue_feature(id, followup)
					_departures[id] = _elapsed + 0.12
					continue
			_feature_second_stage.erase(id)
			_manual_routines.erase(id)
			_social_appointments.erase(id)
			routine_props.release_actor(id)
			if _is_feature(id, task):
				_featured_cooldowns[task[0]] = _elapsed + 32.0
			_routine_orders.erase(id)

func _wait_for_fishing_partner(running: Dictionary, task: Array) -> bool:
	if task[6] != "fishing" or not running.contact or running.has("retrieving") or _elapsed >= float(running.get("wait_until", 0.0)):
		return false
	var pair: Array = Featured.PARTNERS[task[0]]
	var other: Array = _routine_orders.get(pair[0], [])
	if other.is_empty() or other[0] != pair[1]:
		return false
	var partner: Dictionary = _running_routines.get(pair[0], {})
	return partner.is_empty() or not partner.contact

func _interrupt_routine(actor: Resident, retry: bool) -> void:
	var id := actor.resident_id
	if not _running_routines.has(id):
		if retry and _feature_second_stage.has(id) and routine_props.tools.has_actor(id):
			var interrupted: Array = _routine_orders.get(id, [])
			var restart := Featured.get_row(id, interrupted[0]) if not interrupted.is_empty() else []
			routine_props.release_actor(id)
			actor.cancel_route()
			_routine_orders.erase(id)
			_travel_orders.erase(id)
			_feature_second_stage.erase(id)
			_release_reservation(id)
			if not restart.is_empty() and _can_reserve(id, restart):
				_queue_feature(id, restart)
		return
	var task: Dictionary = _running_routines[id]
	_release_routine_rest(id)
	_running_routines.erase(id)
	_release_companion(id)
	routine_props.stop_target(task.task[5])
	routine_props.release_actor(id)
	if task.task[6] in ["incense", "simmer"]:
		var vapor := _incense if task.task[6] == "incense" else _stew
		if is_instance_valid(vapor):
			vapor.emitting = false
	if retry and not task.contact:
		_travel_orders[id] = actor.station_id
	else:
		_routine_orders.erase(id)
		_feature_second_stage.erase(id)
		_manual_routines.erase(id)
		_social_appointments.erase(id)
		_release_reservation(id)

func _release_routine_rest(id: String) -> void:
	var actor: Resident = residents.get(id)
	if is_instance_valid(actor) and not actor._desk_study.is_empty():
		actor.set_seated_study("")
		actor.stand_from_seat()
	if is_instance_valid(actor) and not actor.resting_on.is_empty():
		actor.stand_from_bed()
		if actor.has_meta("awake_rest"):
			actor.remove_meta("awake_rest")

func _stop_routines() -> void:
	for id: String in _running_routines.keys():
		_release_routine_rest(id)
		if is_instance_valid(residents.get(id)):
			residents[id].play_action_animation("idle")
		_release_companion(id)
	_running_routines.clear()
	for id: String in _routine_orders:
		_travel_orders.erase(id)
		if residents.has(id):
			residents[id].cancel_route()
	_routine_orders.clear()
	_blocked_routines.clear()
	_blocked_waypoints.clear()
	_spot_reservations.clear()
	_feature_second_stage.clear()
	_manual_routines.clear()
	_social_appointments.clear()
	routine_props.stop_all()
	for vapor: GPUParticles3D in [_incense, _stew]:
		if is_instance_valid(vapor):
			vapor.emitting = false

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
	_blocked_waypoints.erase(id)
	_feature_second_stage.erase(id)
	_manual_routines.erase(id)
	_social_appointments.erase(id)
	_release_reservation(id)
	routine_props.release_actor(id)

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

func _process(delta: float) -> void:
	routine_props.tools.tick(delta)
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
