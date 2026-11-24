extends SceneTree

const Directory = preload("res://scripts/retreat_resident_directory.gd")
const Conversations = preload("res://scripts/retreat_conversations.gd")
const Registry = preload("res://characters/registry.gd")

var failures: Array[String] = []
var checks := 0
var output := ""
var capture := false
var scene: Node3D
var village: Node3D
var view: Camera3D
var shots: Array[Dictionary] = []
var travel: Dictionary = {}

func _initialize() -> void:
	for arg: String in OS.get_cmdline_user_args():
		if arg.begins_with("--output="):
			output = arg.trim_prefix("--output=")
	capture = "--capture" in OS.get_cmdline_user_args()
	_run.call_deferred()

func check(ok: bool, label: String) -> void:
	checks += 1
	if not ok:
		failures.append(label)
		printerr("FAIL ", label)

func _run() -> void:
	root.size = Vector2i(1440, 810)
	scene = load("res://scenes/main.tscn").instantiate()
	root.add_child(scene)
	current_scene = scene
	await _frames(18)
	village = scene.retreat_residents
	view = scene.camera
	view.persist_preferences = false
	view.set_process(false)
	view.set_physics_process(false)
	scene.vtt_ui.clock_running = false
	check(village.residents.size() == 12 and not village.residents.has("runara-dragon"), "canonical public inhabitants")
	check(scene.party.size() == 3, "playable party does not include residents")
	check(village.routes.graph.get_point_count() > 3000, "walk network is built from actual floor and clearances")
	if village.residents.size() != 12:
		_finish()
		return
	_check_catalogue()
	await _test_encounter()
	await _test_dialogue()
	await _test_overheard()
	await _test_party_dialogue()
	if capture:
		await _capture_walk()
		await _capture_kitchen()
	else:
		Engine.time_scale = 4.0
		Engine.physics_ticks_per_second = 240
		Engine.max_physics_steps_per_frame = 32
		await _test_commute()
		await _test_phase("dusk", 155)
		await _test_phase("night", 160)
		await _test_phase("day", 155)
	_finish()

func _check_catalogue() -> void:
	for id: String in village.residents:
		var actor: PlayerToken = village.residents[id]
		var definition := Registry.character("sw-" + id)
		check(actor.is_npc and not actor.is_in_group("party_tokens"), id + " resident is independent from the party")
		check(is_equal_approx(actor.target_height, definition.heightMeters), id + " canonical appearance scale preserved")
		check(actor.char_profile.clips.idle.frames.size() == 8, id + " original idle is retained")
		_check_clip(actor, "walk", "e")
		check(Conversations.TOPICS[id].size() >= 2, id + " has choices with original dialogue")
		check(_has_ground(actor), id + " standing at initial supported station")
		if id not in ["runara", "tarak", "varnoth", "myla"]:
			check(actor.station_id.ends_with("_cell"), id + " begins indoors in daylight")
	_check_clip(village.residents.varnoth, "walk", "w")
	var gestures := {"tarak": "retreat_cook", "agga": "retreat_direct", "blepp": "retreat_watch", "kilnip": "retreat_chat"}
	for id: String in gestures:
		_check_clip(village.residents[id], gestures[id], "se")
	for key: String in Directory.ROUNDS:
		var goal: String = Directory.ROUNDS[key]
		var start: Vector3 = village._find_landing(Directory.STATIONS[key][0], 0.90)
		var stop: Vector3 = village._find_landing(Directory.STATIONS[goal][0], 0.90)
		check(start.is_finite() and stop.is_finite() and village.routes.path(start, stop).size() > 1, key + " has a physically marked local round")

func _check_clip(actor: PlayerToken, action: String, direction: String) -> void:
	var views: Dictionary = actor.char_profile.get("dir_states", {}).get(action, {})
	var clip: Dictionary = views.get(direction, {})
	var distinct := {}
	for frame: Dictionary in clip.get("frames", []):
		distinct[frame.tex.get_instance_id()] = true
	check(distinct.size() == 8, "%s %s %s decodes eight authored frames" % [actor.token_name, action, direction])

func _test_encounter() -> void:
	var ui: Node = scene.vtt_ui
	check(ui.enemies.size() == 3, "three sailors remain in the beach encounter")
	for id in ["zombie", "zombie-2", "zombie-3"]:
		var actor: PlayerToken = ui.combat_controller.token(id)
		check(not actor.visible and not actor.is_physics_processing() and actor.collision.disabled, id + " remains hidden")
		ui.toggle_enemy_revealed(id)
		await _frames(9)
		check(actor.visible and actor.is_physics_processing() and not actor.collision.disabled and _has_ground(actor), id + " is correctly revealed")
		ui.toggle_enemy_revealed(id)

func _test_dialogue() -> void:
	var hero: PlayerToken = scene.player
	var runara: Node3D = village.residents.runara
	var spot := runara.global_position
	hero.global_position = spot + Vector3(0, 0.02, 1.0)
	_look(spot + Vector3.UP * 0.65, 8, 39, 9.0)
	await _frames(5)
	var found: Dictionary = scene.vtt_ui._find_best_nearby_interactable()
	check(found.get("node") == runara and "Hablar con Runara" in found.get("prompt", ""), "proximity prompt targets Runara")
	if capture:
		await _before("conversacion-runara")
	scene.vtt_ui.player_hud.interact_btn.pressed.emit()
	check(village.has_open_dialogue() and runara.is_talking() and runara.welcomed, "real HUD button opens and holds a conversation")
	check(runara.current_anim == "retreat_greet", "first welcome keeps its eight-frame greeting")
	check(root.get_node("MapTransition").get_meta("retreat_welcomed", false), "welcome remembered in the current session")
	check(hero.get_meta("retreat_dialogue_open", false), "hero movement is held while making a choice")
	village.dialogue.choices.get_child(1).pressed.emit()
	check("Astalagan" in village.last_conversation.get("text", "") and village.dialogue.transcript.get_child_count() == 3, "choice adds both sides of the conversation")
	if capture:
		await _after("conversacion-runara")
	await _frames(16)
	var panel: Rect2 = village.dialogue.panel.get_global_rect()
	var options: Rect2 = village.dialogue.choices.get_global_rect()
	check(panel.size.x >= 500.0 and panel.position.y >= 60.0 and panel.end.y <= village.dialogue.size.y
		and options.end.y < panel.end.y, "the conversation and its choices fit the viewport")
	check(runara.global_position.distance_to(spot) < 0.35, "resident does not walk away mid-conversation")
	hero.global_position += Vector3.DOWN * 3.0
	runara.refresh_proximity()
	check(not runara.is_player_nearby, "speaking cannot cross storeys")
	await _frames(3)
	check(not village.has_open_dialogue() and not hero.has_meta("retreat_dialogue_open"), "leaving reach releases the hero and resident")
	hero.global_position = Vector3(24.75, 0.6, 109)

func _test_overheard() -> void:
	var hero: PlayerToken = scene.player
	var blepp: Node3D = village.residents.blepp
	var kilnip: Node3D = village.residents.kilnip
	scene.layout_builder.set_cave_roofs_mode("open")
	var focus := (blepp.global_position + kilnip.global_position) * 0.5
	hero.global_position = Vector3(122.625, 9.07, 85.575)
	_look(focus + Vector3.UP * 0.55, -9, 42, 6.3)
	view.near = view.global_position.distance_to(view.focus_point) - 4.0
	check(await _wait_for(func(): return village.last_overheard.get("id") == "daga", 7), "Blepp and Kilnip speak if a hero can hear them")
	check(blepp.is_talking() and kilnip.is_talking(), "both NPCs pause their tasks during the exchange")
	check(await _wait_for(func(): return village.last_overheard.get("speaker") == "kilnip", 7), "the other NPC takes the next line")
	if capture and not village._exchange.is_empty():
		await _before("charla-kobolds", village.dialogue.caption)
		await _after("charla-kobolds", village.dialogue.caption)
	hero.global_position = Vector3(24.75, 0.6, 109)
	view.near = 0.1
	await _frames(32)
	check(village._exchange.is_empty(), "caption ends on leaving hearing range")

func _test_party_dialogue() -> void:
	var ui: Node = scene.vtt_ui
	var group_button := ui.player_root.find_child("PartyConversationButton", true, false) as Button
	check(is_instance_valid(group_button), "party chat has a visible control")
	if capture:
		_look(Vector3(24.75, 0.6, 109), 2, 39, 9)
	group_button.pressed.emit()
	var first := str(scene.player.token_name)
	village.dialogue.message.text_submitted.emit("¿Exploramos primero la biblioteca?")
	scene.select_party_member(1, false)
	await _frames(2)
	check(not village.has_open_dialogue(), "changing character closes the previous speaker's dialogue")
	group_button.pressed.emit()
	var next := str(scene.player.token_name)
	village.dialogue.message.text_submitted.emit("Voy contigo.")
	check(village._party_lines.size() == 2 and first != next and village._party_lines[1].speaker == next,
		"two heroes can speak in the same local conversation")
	check(root.get_node("MapTransition").get_meta("retreat_party_lines", []).size() == 2,
		"party lines remembered in the running session")
	if capture:
		await _before("conversacion-grupo", village.dialogue.panel)
		await _after("conversacion-grupo", village.dialogue.panel)
	ui.set_role("dm")
	check(not village.has_open_dialogue() and not scene.player.has_meta("retreat_dialogue_open"), "role switch releases dialogue controls")
	ui.set_role("player")
	scene.select_party_member(0, false)
	scene.player.global_position = Vector3(24.75, 0.6, 109)

func _test_commute() -> void:
	var runara: PlayerToken = village.residents.runara
	var gate: Node3D = get_nodes_in_group("interactive_doors").filter(func(door): return door.door_id == "a4_library")[0]
	gate.set_open(false, false)
	check(await _wait_for(func(): return not runara.route_goal.is_empty(), 8), "Runara starts her route after the welcome")
	check(await _wait_for(func(): return runara.current_anim == "walk", 2), "walking triggers the authored walk")
	var stopped := runara.global_position
	scene.vtt_ui.combat_active = true
	await _frames(40)
	check(runara.global_position.distance_to(stopped) < 0.15, "ambient walking yields to combat")
	scene.vtt_ui.combat_active = false
	var max_step := 0.0
	var min_y := runara.global_position.y
	var height_bands := {}
	var at_door := false
	for i in range(12600):
		var previous := runara.global_position
		await physics_frame
		var current := runara.global_position
		max_step = maxf(max_step, Vector2(current.x - previous.x, current.z - previous.z).length())
		height_bands[floori(current.y)] = true
		if current.y > 17.8 and absf(current.x - gate.global_position.x) < 1.8 and absf(current.z - gate.global_position.z) < 1.4:
			at_door = true
			break
	check(at_door and height_bands.size() >= 6 and min_y < 10, "Runara physically walks up the staircases to A4")
	await _frames(210)
	check(runara.station_id != "scriptorium" and runara.global_position.z > gate.global_position.z - 0.12,
		"the library door remains a real obstacle")
	gate.set_open(true, false)
	check(await _wait_for(func(): return runara.station_id == "scriptorium", 22), "Runara resumes through the opened door")
	check(max_step < 0.22 and _has_ground(runara), "journey is continuous and finishes grounded")
	travel["welcome_to_library"] = {"max_horizontal_meters_per_tick": max_step, "elevation_bands": height_bands.keys()}

func _test_phase(next: String, seconds: int) -> void:
	scene.vtt_ui.set_env_time(next)
	var target_index := ["day", "dusk", "night"].find(next)
	var reached := {}
	var cooked := false
	var made_steam := false
	for tick in range(seconds * 60):
		for id: String in village.residents:
			var actor: PlayerToken = village.residents[id]
			if not reached.has(id) and actor.station_id == Directory.RESIDENTS[id].stations[target_index]:
				reached[id] = actor.global_position
		if next == "dusk":
			var tarak: PlayerToken = village.residents.tarak
			cooked = cooked or (tarak.current_anim == "retreat_cook" and tarak.station_id == "tarak_kitchen")
			made_steam = made_steam or (is_instance_valid(village._stew) and village._stew.emitting)
		if reached.size() == village.residents.size() and (next != "dusk" or (cooked and made_steam)):
			break
		await physics_frame
	for id: String in village.residents:
		var actor: PlayerToken = village.residents[id]
		check(reached.has(id), "%s reaches %s during %s; at %s / %s (%s)" % [
			id, Directory.RESIDENTS[id].stations[target_index], next, actor.station_id, actor.route_goal, actor.global_position])
		check(_has_ground(actor), id + " keeps floor support in " + next)
	travel[next] = reached.size()
	if next == "dusk":
		check(cooked, "Tarak spontaneously uses the herb sprinkling animation in the kitchen")
		check(made_steam, "the stove gives off steam with the cooking gesture")

func _capture_kitchen() -> void:
	var tarak: PlayerToken = village.residents.tarak
	var station: Array = Directory.STATIONS.tarak_kitchen
	var point: Vector3 = village._find_landing(station[0], tarak.target_height, tarak)
	check(point.is_finite(), "kitchen capture has support next to the existing stove")
	if not point.is_finite():
		return
	village.set_physics_process(false)
	tarak.cancel_route()
	tarak.place_at_station("tarak_kitchen", point, station[1], station[2])
	scene.vtt_ui.hide()
	_look(point + Vector3(0.15, 0.6, -0.36), 16, 42, 6.5)
	view.near = view.global_position.distance_to(view.focus_point) - 3.9
	await _frames(5)
	await _before("cocina-tarak")
	tarak.play_station_activity()
	tarak.anim_frame_idx = 4
	tarak.update_sprite_frame()
	# This frame is the actual herb contact pose. Steam runs during ordinary gameplay.
	await _after("cocina-tarak")

func _capture_walk() -> void:
	var runara: PlayerToken = village.residents.runara
	var walking := await _wait_for(func(): return runara.current_anim == "walk", 7)
	check(walking, "walk is visible in the native renderer")
	if not walking:
		return
	scene.vtt_ui.hide()
	_look(runara.global_position + Vector3.UP * 0.61, -12, 37, 6.1)
	var heading := runara.facing_dir
	paused = true
	runara.play_action_animation("idle")
	await _before("marcha-runara")
	runara._resolve_and_apply_clip("walk", heading, true)
	runara.anim_frame_idx = 4
	runara.update_sprite_frame()
	await _after("marcha-runara")

func _has_ground(actor: PlayerToken) -> bool:
	var foot := actor.global_position
	var hit := actor.get_world_3d().direct_space_state.intersect_ray(
		PhysicsRayQueryParameters3D.create(foot + Vector3.UP * 0.31, foot - Vector3.UP * 0.25, 1))
	return not hit.is_empty() and hit.normal.y > 0.65

func _wait_for(predicate: Callable, seconds: int) -> bool:
	for n in range(seconds * 60):
		if predicate.call():
			return true
		await physics_frame
	return false

func _frames(count: int) -> void:
	for n in range(count):
		await physics_frame

func _look(point: Vector3, yaw: float, pitch: float, distance: float) -> void:
	view.is_overview = false
	view.focus_point = point
	view.current_yaw = yaw
	view.current_pitch = pitch
	view.current_distance = distance
	view.update_camera_transform()

func _before(id: String, hidden: Control = null) -> void:
	paused = true
	if hidden:
		hidden.hide()
	# Allow container geometry and scroll extent to settle.
	await RenderingServer.frame_post_draw
	await _capture(id + "-before")
	shots.append({"id": id, "transform": str(view.global_transform), "near": view.near, "size": view.size})

func _after(id: String, shown: Control = null) -> void:
	if shown:
		shown.show()
	await RenderingServer.frame_post_draw
	await _capture(id + "-after")
	check(shots.back().transform == str(view.global_transform), id + " has identical camera transforms")
	paused = false

func _capture(id: String) -> void:
	await RenderingServer.frame_post_draw
	check(root.get_texture().get_image().save_png(output.path_join(id + ".png")) == OK, "saved " + id)

func _finish() -> void:
	var report := {"passed": failures.is_empty(), "checks": checks, "failures": failures, "travel": travel,
		"shots": shots, "catalogue": Registry.data().get("revision", "")}
	if not output.is_empty():
		var filename := "native-proof.json" if capture else "headless-proof.json"
		var file := FileAccess.open(output.path_join(filename), FileAccess.WRITE)
		if file:
			file.store_string(JSON.stringify(report, "\t"))
	print("RETREAT_RESIDENTS_PASS=", checks - failures.size(), " FAIL=", failures.size())
	quit(0 if failures.is_empty() else 1)
