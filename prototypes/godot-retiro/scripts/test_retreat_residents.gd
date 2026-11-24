extends SceneTree

const Directory = preload("res://scripts/retreat_resident_directory.gd")
const Registry = preload("res://characters/registry.gd")
const ACTIVITIES := {
	"retreat_greet": "runara",
	"retreat_study": "runara",
	"retreat_meditate": "runara",
	"retreat_tend": "tarak",
	"retreat_masonry": "varnoth",
	"retreat_tinker": "myla",
	"retreat_incense": "rix",
	"retreat_sort": "laylee",
}

var failures: Array[String] = []
var checks := 0
var report: Dictionary = {}
var output := ""
var capture := false
var scene: Node3D
var village: Node3D
var view: Camera3D
var layouts: Dictionary = {}
var shots: Array[Dictionary] = []

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
	await _frames(12)
	village = scene.retreat_residents
	view = scene.camera
	view.persist_preferences = false
	view.set_process(false)
	view.set_physics_process(false)
	_look(Vector3(24.75, 1.0, 112), 0.0, 30.0, 6.0)
	check(village.residents.size() == Directory.RESIDENTS.size(), "Twelve canonical residents are present")
	check(not village.residents.has("runara-dragon"), "only the public identity of Runara is spawned")
	check(scene.party.size() == 3, "original player party remains selectable")
	await _opening_encounter()
	_log_stations("day")
	if village.residents.size() != Directory.RESIDENTS.size():
		_finish()
		return
	for id: String in village.residents:
		var actor: PlayerToken = village.residents[id]
		var definition := Registry.character("sw-" + id)
		check(actor.is_npc and not actor.is_active_player and is_equal_approx(actor.target_height, definition.heightMeters),
			id + " uses the registered identity and stature")
		check(actor.char_profile.clips.idle.frames.size() == 8 and not actor.is_in_group("party_tokens"),
			id + " has eight authored idle sprites")
	for action: String in ACTIVITIES:
		var actor: PlayerToken = village.residents[ACTIVITIES[action]]
		actor.play_action_animation(action)
		check(actor.active_clip_drawn_motion and actor.active_clip_frames.size() == 8, action + " loads all eight poses")
		var unique := {}
		for phase: Dictionary in actor.active_clip_frames:
			unique[phase.tex.get_instance_id()] = true
		check(unique.size() == 8, action + " contains distinct runtime textures")
		actor.play_action_animation("idle")
	for id in ["agga", "blepp", "frub", "kilnip", "laylee", "mumpo", "rix", "zark"]:
		check(village.residents[id].station_id.ends_with("_cell"), id + " stays indoors during the day")
	check(village.residents.myla.station_id == "myla_bench" and not village.residents.myla.is_jumping, "Myla works on the ground")
	check(is_instance_valid(village._workbench) and is_instance_valid(village._incense), "actual bench and altar have activity hooks")

	var hero: CharacterBody3D = scene.player
	var original_hero_position := hero.global_position
	var runara: Node3D = village.residents.runara
	hero.global_position = runara.global_position + Vector3(0, 0.01, 1.0)
	await _frames(4)
	var found: Dictionary = scene.vtt_ui._find_best_nearby_interactable()
	check(found.get("node") == runara and "Runara" in str(found.get("prompt")), "nearest HUD action can speak to Runara")
	scene.vtt_ui._sync_nearby_interaction_prompt()
	scene.vtt_ui.player_hud.interact_btn.pressed.emit()
	check(runara.welcomed and village.last_conversation.get("resident") == "runara", "real HUD button delivers the welcome")
	check(root.get_node("MapTransition").get_meta("retreat_welcomed", false), "welcome is remembered across map changes in the session")
	check(runara.current_anim == "retreat_greet", "Runara plays the authored greeting")
	await _frames(15)
	check(runara.station_id == "welcome", "Runara remains by the heroes during the conversation")
	hero.global_position += Vector3.DOWN * 3.0
	runara.refresh_proximity()
	check(not runara.is_player_nearby, "conversation cannot cross storeys")
	hero.global_position = original_hero_position
	runara._conversation_hold = 0.0
	await _frames(36)
	check(runara.station_id == "scriptorium", "Runara goes to the library off camera after the welcome")

	if capture:
		await _capture_stations()

	_look(Vector3(24.75, 1.0, 112), 0.0, 30.0, 6.0)
	for phase: String in ["dusk", "night", "day"]:
		scene.vtt_ui.set_env_time(phase)
		await _frames(32)
		_log_stations(phase)
		for id: String in village.residents:
			var actor: Node3D = village.residents[id]
			var expected: String = Directory.RESIDENTS[id].stations[["day", "dusk", "night"].find(phase)]
			check(actor.station_id == expected, "%s within its %s station (%s)" % [id, phase, expected])
		if phase == "night":
			var rix: Node3D = village.residents.rix
			rix.play_station_activity()
			await _frames(39)
			check(village._incense.emitting, "Rix triggers incense during the offering")
	var myla: Node3D = village.residents.myla
	myla.play_station_activity()
	await _frames(36)
	check(village._workbench._gear_spin_timer > 0.0, "Myla energizes the existing workbench during the gesture")
	check(not myla.is_jumping and myla.is_on_floor(), "Myla keeps planted feet during the whole gesture")
	_finish()

func _log_stations(key: String) -> void:
	var snapshot: Dictionary = {}
	for id: String in village.residents:
		var actor: Node3D = village.residents[id]
		var foot := actor.global_position
		var ray := PhysicsRayQueryParameters3D.create(foot + Vector3.UP * 0.30, foot - Vector3.UP * 0.29, 1)
		var ground := actor.get_world_3d().direct_space_state.intersect_ray(ray)
		check(not ground.is_empty() and ground.normal.y > 0.75, id + " feet are supported in " + key)
		snapshot[id] = {"station": actor.station_id, "position": [foot.x, foot.y, foot.z]}
	layouts[key] = snapshot

func _opening_encounter() -> void:
	var ui: Node = scene.vtt_ui
	check(ui.enemies.size() == 3, "the official opening uses three drowned sailors")
	for id in ["zombie", "zombie-2", "zombie-3"]:
		var actor: PlayerToken = ui.combat_controller.token(id)
		check(is_instance_valid(actor) and actor.char_key == id, id + " uses its distinct existing sailor sprite")
		if not is_instance_valid(actor):
			continue
		check(not actor.visible and not actor.is_physics_processing() and actor.collision.disabled, id + " starts hidden and inactive")
		ui.toggle_enemy_revealed(id)
		await _frames(9)
		check(actor.visible and actor.is_physics_processing() and not actor.collision.disabled, id + " is revealed by the existing DM control")
		check(actor.is_on_floor() and actor.global_position.y > 0.0, id + " has floor support")
		ui.toggle_enemy_revealed(id)
		await _frames(2)
		check(not actor.visible and actor.collision.disabled, id + " hides again")
	if capture:
		ui.hide()
		scene.get_node("TacticalGridOverlay").hide()
		_look(Vector3(24.75, 0.9, 107.25), -8.0, 37.0, 9.0)
		var transform := view.global_transform
		paused = true
		await _capture("playa-encuentro-before")
		for id in ["zombie", "zombie-2", "zombie-3"]:
			ui.toggle_enemy_revealed(id)
		await _capture("playa-encuentro-after")
		for id in ["zombie", "zombie-2", "zombie-3"]:
			ui.toggle_enemy_revealed(id)
		paused = false
		check(transform.is_equal_approx(view.global_transform), "sailor reveal uses identical camera transforms")
		shots.append({"id": "playa-encuentro", "view": str(transform), "size": view.size, "near": view.near,
			"phase": village.phase, "yaw": -8.0, "pitch": 37.0})
		_look(Vector3(24.75, 1.0, 112), 0.0, 30.0, 6.0)
		ui.show()

func _look(point: Vector3, yaw: float, pitch: float, distance: float) -> void:
	view.is_overview = false
	view.focus_point = point
	view.current_yaw = yaw
	view.current_pitch = pitch
	view.current_distance = distance
	view.update_camera_transform()

func _frames(count: int) -> void:
	for n in range(count):
		await physics_frame

func _capture_stations() -> void:
	scene.vtt_ui.hide()
	scene.get_node("TacticalGridOverlay").hide()
	scene.layout_builder.set_cave_roofs_mode("open")
	var runara: Node3D = village.residents.runara
	var welcome: Array = Directory.STATIONS.welcome
	var scriptorium: Array = Directory.STATIONS.scriptorium
	var herb: Node3D = village.residents.tarak
	var myla: Node3D = village.residents.myla
	var laylee: Node3D = village.residents.laylee
	var varnoth: Node3D = village.residents.varnoth
	var rix: Node3D = village.residents.rix
	var coords: Vector3 = runara.global_position
	runara.place_at_station("welcome", welcome[0], welcome[1], welcome[2])
	await _pair("a1-bienvenida", runara.global_position + Vector3.UP * 0.7, 8, 43, 6.5, [runara])
	runara.place_at_station("scriptorium", coords, scriptorium[1], scriptorium[2])
	await _pair("a4-escritura", runara.global_position + Vector3.UP * 0.7, 10, 51, 6.0, [runara])
	await _pair("a1-herbolario", herb.global_position + Vector3.UP * 0.72, 5, 47, 6.0, [herb])
	var bench_station: Array = Directory.STATIONS.laylee_bench
	var laylee_original: Vector3 = laylee.global_position
	var fit: Vector3 = village._find_landing(bench_station[0], laylee.target_height)
	if fit.is_finite():
		laylee.place_at_station("laylee_bench", fit, bench_station[1], bench_station[2])
	await _pair("a1-taller", myla.global_position + Vector3(0.42, 0.49, -0.15), 10, 39, 6.0, [myla, laylee])
	var cell_station: Array = Directory.STATIONS.laylee_cell
	laylee.place_at_station("laylee_cell", laylee_original, cell_station[1], cell_station[2])
	await _pair("a5-mantenimiento", varnoth.global_position + Vector3.UP * 0.7, 12, 44, 6.0, [varnoth])
	var altar_station: Array = Directory.STATIONS.rix_temple
	var rix_original: Vector3 = rix.global_position
	fit = village._find_landing(altar_station[0], rix.target_height)
	if fit.is_finite():
		rix.place_at_station("rix_temple", fit, altar_station[1], altar_station[2])
	scene.vtt_ui.set_env_time("dusk")
	village._pending.clear()
	await _pair("a5-ofrenda", rix.global_position + Vector3.UP * 0.58, 10, 49, 6.0, [rix])
	var rix_cell: Array = Directory.STATIONS.rix_cell
	rix.place_at_station("rix_cell", rix_original, rix_cell[1], rix_cell[2])
	scene.vtt_ui.set_env_time("day")
	village._pending.clear()
	await _pair("a1-celda-oeste", Vector3(122.4, 9.63, 85.0), -5, 47, 7.2,
		[village.residents.agga, village.residents.blepp, village.residents.frub, village.residents.kilnip])
	await _pair("a1-celda-este", Vector3(131.3, 9.6, 85.2), -8, 47, 7.2,
		[village.residents.laylee, village.residents.mumpo, village.residents.rix, village.residents.zark])

func _pair(id: String, point: Vector3, yaw: float, pitch: float, distance: float, actors: Array) -> void:
	_look(point, yaw, pitch, distance)
	view.near = view.global_position.distance_to(view.focus_point) - 4.0
	for actor in actors:
		if actor.station_action.is_empty():
			actor.play_action_animation("idle")
			check(actor.active_clip_frames.size() == 8, actor.token_name + " uses its full idle cycle")
		else:
			check(actor.play_station_activity(), id + " plays the scene gesture")
		actor.anim_frame_idx = 3
		actor.update_sprite_frame()
		actor.set_physics_process(false)
	var transform := view.global_transform
	paused = true
	village.hide()
	await _capture(id + "-before")
	village.show()
	await _capture(id + "-after")
	paused = false
	check(transform.is_equal_approx(view.global_transform), id + " uses identical camera transforms")
	shots.append({"id": id, "view": str(transform), "size": view.size, "near": view.near,
		"phase": village.phase, "yaw": yaw, "pitch": pitch})
	for actor in actors:
		actor.set_physics_process(true)

func _capture(id: String) -> void:
	await RenderingServer.frame_post_draw
	check(root.get_texture().get_image().save_png(output.path_join(id + ".png")) == OK, "saved " + id)

func _finish() -> void:
	report = {"passed": failures.is_empty(), "checks": checks, "failures": failures, "stations": layouts,
		"shots": shots, "catalogue": Registry.data().get("revision", "")}
	if not output.is_empty():
		var filename := "native-proof.json" if capture else "headless-proof.json"
		var file := FileAccess.open(output.path_join(filename), FileAccess.WRITE)
		if file:
			file.store_string(JSON.stringify(report, "\t"))
	print("RETREAT_RESIDENTS_PASS=", checks - failures.size(), " FAIL=", failures.size())
	quit(0 if failures.is_empty() else 1)
