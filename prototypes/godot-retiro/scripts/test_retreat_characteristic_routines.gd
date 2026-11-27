extends SceneTree

const Featured = preload("res://scripts/retreat_characteristic_routines.gd")
const Agenda = preload("res://scripts/retreat_routine_directory.gd")
const Resident = preload("res://scripts/retreat_resident.gd")
const Facing = preload("res://sprites/sprite_facing.gd")
const Registry = preload("res://characters/registry.gd")
const COMPARED := ["AGG_01", "KIL_01", "RUN_01", "RUN_02", "TAR_01", "TAR_02", "VAR_01", "ZAR_02"]
const WORK_ROUTINES := ["VAR_01", "MYL_02", "LAY_01", "FRU_02", "ZAR_01", "RIX_02", "ZAR_02"]

var scene: Node3D
var village: Node3D
var camera: Camera3D
var checks := 0
var failures: Array[String] = []
var contacts: Dictionary = {}
var prop_checks: Dictionary = {}
var tables: Array[Dictionary] = []
var output := ""
var capture := false
var matrix := false
var journeys := false
var journeys_only := false
var selected_ids := PackedStringArray()
var legacy_reading := false
var stool_check := false
var work_review := false

func _initialize() -> void:
	for argument: String in OS.get_cmdline_user_args():
		if argument.begins_with("--output="):
			output = argument.trim_prefix("--output=")
		capture = capture or argument == "--capture"
		matrix = matrix or argument == "--matrix"
		journeys = journeys or argument == "--journeys"
		journeys_only = journeys_only or argument == "--journeys-only"
		legacy_reading = legacy_reading or argument == "--legacy-reading"
		stool_check = stool_check or argument == "--stool-check"
		work_review = work_review or argument == "--work-review"
		if argument.begins_with("--routines="):
			selected_ids = argument.trim_prefix("--routines=").split(",", false)
	root.size = Vector2i(1440, 810) if capture else Vector2i(960, 540)
	_run.call_deferred()

func expect(pass_check: bool, text: String) -> void:
	checks += 1
	if not pass_check:
		failures.append(text)
		printerr("FAIL ", text)

func _run() -> void:
	scene = load("res://scenes/main.tscn").instantiate()
	root.add_child(scene)
	current_scene = scene
	await _frames(27)
	village = scene.retreat_residents
	camera = scene.camera
	camera.set_process(false)
	camera.set_physics_process(false)
	camera.persist_preferences = false
	village.set_physics_process(false)
	scene.vtt_ui.clock_running = false
	scene.vtt_ui.hide()
	scene.layout_builder.set_cave_roofs_mode("open")
	village.routine_contacted.connect(func(_resident: String, code: String, _target: String): contacts[code] = int(contacts.get(code, 0)) + 1)
	var starts := {}
	for actor: Resident in village.residents.values():
		starts[actor.resident_id] = actor.global_position
		actor.cancel_route()
		actor.set_physics_process(false)
		if Featured.HEIGHTS.has(actor.resident_id):
			expect(is_equal_approx(actor.target_height, Featured.HEIGHTS[actor.resident_id]), actor.resident_id + " height matches the requested size")
	for hero: PlayerToken in scene.party:
		hero.set_physics_process(false)
		hero.global_position = Vector3(27.0, 0.7, 108.2)
	for id: String in ([] if journeys_only else Featured.ROWS.keys()):
		var actor: Resident = village.residents[id]
		expect(Featured.ROWS[id].size() == 2, id + " has two characteristic routines")
		for task: Array in Featured.ROWS[id]:
			if not selected_ids.is_empty() and task[0] not in selected_ids:
				continue
			await _trial(actor, task, starts[id])
			village._stop_routines()
			actor.set_physics_process(false)
			actor.global_position = starts[id]
	if not journeys_only and selected_ids.is_empty():
		await _test_dm_and_weather()
	if journeys or journeys_only:
		await _test_fishing_journey()
	var report := {"checks":checks, "failures":failures, "contacts":contacts,
		"props":prop_checks, "matrices":tables, "capture":capture, "matrix":matrix,
		"revision":Registry.data().get("revision", "")}
	print("FEATURED_ROUTINES ", JSON.stringify(report))
	if not output.is_empty():
		var file := FileAccess.open(output.path_join("native.json" if capture else "headless.json"), FileAccess.WRITE)
		if file:
			file.store_string(JSON.stringify(report, "  "))
	quit(0 if failures.is_empty() else 1)

func _trial(actor: Resident, task: Array, start: Vector3) -> void:
	var code: String = task[0]
	var where := Agenda.station(task[2])
	var spot: Vector3 = village._find_landing(where[0], actor.target_height, actor)
	expect(spot.is_finite(), code + " has supported footing")
	if not spot.is_finite():
		return
	if legacy_reading and code == "RUN_02":
		actor.char_profile.dir_states.erase("retreat_desk_read")
	var path: PackedVector3Array = village.routes.path(start, spot)
	expect(not path.is_empty(), code + " has a traversable approach from " + str(start) + " to " + str(spot))
	expect(village.routine_props.can_reach(_at_station(actor, task[2], spot), task[5]), code + " can reach the live prop")
	if capture and code in COMPARED:
		var focus := spot
		if code == "KIL_01":
			focus = spot.lerp(village.routine_props.anchor(task[5]), 0.44)
		if code == "RUN_02":
			focus = Vector3(105.35, 18.02, 61.50)
		var yaw := 74.0 if code == "KIL_01" else (15.0 if code == "RUN_02" else 0.0)
		_view(focus, yaw, 35.0 if code == "KIL_01" else 25.0)
		await _frames(3)
		_save(code + "-antes")
	village._queue_feature(actor.resident_id, task)
	village._begin_routine_at_station(actor)
	actor.set_physics_process(true)
	for frame: int in 440:
		if not village.is_routine_running(actor) or contacts.has(code):
			break
		await physics_frame
	expect(contacts.has(code), code + " reached a contact in the live scene")
	if code == "RUN_02" and actor.has_seated_study():
		var stool: Node3D = village.routine_props.targets["RetreatEastDeskSeat"]
		var slot: Vector3 = stool._compute_seat_slots_world(stool.get_parent())[0]
		expect(actor.is_sitting and actor.global_position.is_equal_approx(slot), "Runara sits on the native A4 stool pivot")
		if stool_check:
			expect(is_equal_approx(actor._seat_drape_radius, 0.27), "Runara reads the radius of the occupied stool")
			var inside := slot + Vector3.FORWARD * 0.10 + Vector3.DOWN * 0.22
			var draped: Vector3 = actor._seat_surface._drape_around_stool(camera, inside, slot, actor._seat_feet.y, actor._seat_drape_radius)
			expect(draped.distance_to(camera.global_position) < inside.distance_to(camera.global_position) - 0.1,
				"The cloth moves in front of the wooden support in the rear view")
			expect(camera.unproject_position(draped).distance_to(camera.unproject_position(inside)) < 0.02,
				"The support correction keeps the projected garment point")
		expect(actor.world_heading_for_pose(actor.facing_dir).dot(Vector3.FORWARD) > 0.99, "Runara faces the desk, independently of the camera")
		var hero: PlayerToken = scene.party[0]
		expect(not stool.try_attach_seat(hero), "The player cannot occupy Runara's stool at the same time")
	if code in ["TAR_02", "BLE_01"]:
		await _fishing_art(actor, code, spot)
	if code == "KIL_01":
		var held: Dictionary = actor._pick_clip_from_profile("rest_on_prop", actor.facing_dir)
		expect(held.get("modular_definition", "") == "sw-kilnip-rest-awake", "Kilnip uses the specific awake pose")
		var surface := actor.get_node_or_null("RestingCharacterSurface/RestBlanket") as MeshInstance3D
		expect(is_instance_valid(surface) and surface.is_visible_in_tree(), "Kilnip retains the physical blanket")
	if code == "MYL_01":
		var walk: Dictionary = actor._pick_clip_from_profile("walk", "w")
		expect(walk.get("modular_definition", "") == "sw-myla-walk-left" and not walk.get("flip_h", false), "Myla's left profile is painted for her damaged wings")
	if capture and code in COMPARED:
		await _frames(30)
		_save(code + "-despues")
	if work_review and code in WORK_ROUTINES:
		await _capture_work(actor, code, spot)
	if matrix and contacts.has(code):
		await _matrix(actor, code, spot)
	if code == "RUN_02" and actor.has_seated_study():
		village._elapsed = float(village._running_routines.runara.read_started) + 3.55
		village._finish_routines()
		expect(actor._desk_study == "retreat_desk_turn", "Reading switches to its independent hand pose")
		if capture:
			_view(Vector3(105.35, 18.02, 61.50), 15.0, 25.0)
			await _frames(3)
			_save(code + "-gesto")
			if matrix and stool_check:
				await _matrix(actor, code + "-gesto", spot)
	if code in Featured.TOURS and village.is_routine_running(actor):
		var running: Dictionary = village._running_routines[actor.resident_id]
		village._elapsed = float(running.until)
		village._finish_routines()
		var next: Array = village._routine_orders.get(actor.resident_id, [])
		expect(not next.is_empty(), code + " queues follow-up")
		if not next.is_empty():
			var next_station := Agenda.station(next[2])
			var end: Vector3 = village._find_landing(next_station[0], actor.target_height, actor)
			var follow_route: PackedVector3Array = village.routes.path(spot, end) if end.is_finite() else PackedVector3Array()
			expect(not follow_route.is_empty(), code + " follow-up has a physical route")
			if end.is_finite():
				if work_review and code in ["FRU_02", "ZAR_01"] and not follow_route.is_empty():
					await _carry_to_destination(actor, code, next[2], follow_route)
				else:
					_at_station(actor, next[2], end)
					village._begin_routine_at_station(actor)
					for frame: int in 280:
						if int(contacts.get(code, 0)) > 1 or not village.is_routine_running(actor):
							break
						await physics_frame
				expect(int(contacts.get(code, 0)) == 2, code + " completes the follow-up contact")
	actor.set_physics_process(false)
	village._cancel_order(actor)
	if work_review and code == "VAR_01":
		var kit: Node3D = village.routine_props.targets["DressedAshlarBlock"].get_parent()
		for prop_name: String in ["MasonMalletHead", "MasonMalletHandle", "MasonChisel"]:
			var prop := kit.get_node_or_null(prop_name) as Node3D
			expect(is_instance_valid(prop) and prop.visible, prop_name + " returns to the masonry kit")
	if code == "RUN_02" and actor.has_seated_study():
		expect(not actor.is_sitting and actor.global_position.distance_to(spot) < 0.08, "Interrupting reading releases the stool and returns to supported ground")
		if stool_check:
			expect(is_zero_approx(actor._seat_drape_radius), "Leaving the stool also clears the drape support")
	expect(not village.routine_props.tools.has_actor(actor.resident_id), code + " releases carried tools on cancellation")
	expect(not village._spot_reservations.values().has(actor.resident_id), code + " releases reserved work area")

func _at_station(actor: Resident, key: String, spot: Vector3) -> Resident:
	village._place(actor, key, spot)
	return actor

func _carry_to_destination(actor: Resident, code: String, destination: String, route: PackedVector3Array) -> void:
	var start := actor.global_position
	var last := start
	var max_step := 0.0
	var carrying := false
	var photo := false
	actor.begin_route(destination, route)
	actor.set_physics_process(true)
	for _frame: int in 960:
		await physics_frame
		max_step = maxf(max_step, last.distance_to(actor.global_position))
		last = actor.global_position
		var has_load: bool = village.routine_props.tools.has_actor(actor.resident_id)
		if has_load and start.distance_to(last) > 0.6:
			carrying = true
			if capture and not photo:
				photo = true
				var heading := actor.world_heading_for_pose(actor.facing_dir)
				_view(last, 15.0, 25.0)
				expect(actor.world_heading_for_pose(actor.facing_dir).is_equal_approx(heading), code + " camera does not change the route heading")
				await RenderingServer.frame_post_draw
				_save(code + "-traslado")
		if int(contacts.get(code, 0)) > 1:
			break
		if actor.route_goal.is_empty() and not village.is_routine_running(actor):
			break
	expect(carrying and max_step < 0.30, code + " carries the live load while travelling continuously")
	var tools = village.routine_props.tools
	if capture and tools._lowering.has(actor.resident_id):
		_view(actor.global_position, 15.0, 25.0)
		await _frames(24)
		_save(code + "-descarga")
	for _frame: int in 210:
		if not tools._lowering.has(actor.resident_id):
			break
		await physics_frame
	var released: Dictionary = tools._delivered
	expect(released.has(actor.resident_id), code + " unloads the same live prop at its destination")

func _capture_work(actor: Resident, code: String, spot: Vector3) -> void:
	var tools = village.routine_props.tools
	expect(tools.has_actor(actor.resident_id), code + " engages its live prop")
	if not tools.has_actor(actor.resident_id):
		return
	actor.set_physics_process(false)
	village.set_process(false)
	var focus := spot.lerp(village.routine_props.anchor("RetreatWipeEdge"), 0.22) if code == "ZAR_02" else spot
	_view(focus, 15.0, 25.0)
	actor._resolve_and_apply_clip(actor.current_anim, actor.facing_dir, false)
	actor.action_lock_timer = actor._gesture_duration * 0.43
	actor.anim_frame_idx = mini(4, actor.active_clip_frames.size() - 1)
	actor.update_sprite_frame()
	actor._apply_procedural_motion(0.0, Vector2.ZERO, actor.current_anim)
	var state: Dictionary = tools._active[actor.resident_id]
	state.elapsed = 0.40
	tools.tick(0.0)
	var tool: Node3D = state.tool
	expect(tool.global_position.is_finite(), code + " keeps the live prop at a finite contact")
	if code in ["VAR_01", "MYL_02", "LAY_01"] and state.has("head"):
		var head: Vector3 = state.head.global_position
		expect(state.impact >= 0, code + " strikes its registered workpiece (head %s, surface %s)" % [head, state.target])
		var point: Vector3 = state.target
		var to_piece := point - actor.global_position
		to_piece.y = 0.0
		expect(actor.world_heading_for_pose(actor.facing_dir).dot(to_piece.normalized()) > 0.999,
			code + " faces the physical piece instead of the camera")
	if code == "VAR_01" and state.has("borrowed"):
		expect(state.borrowed.size() == 3 and state.borrowed.keys().all(func(prop: Node3D) -> bool: return not prop.visible),
			"Varnoth temporarily removes the original tools from their resting place")
	if code == "ZAR_02":
		expect(absf(tool.global_position.y - state.target.y) < 0.006, "the cloth stays on the rim of the table")
		expect(spot.y > 18.12, "Zark stands on the physical cleaning step")
		expect(actor._pick_clip_from_profile("retreat_tidy", "e").get("modular_definition", "") == "sw-zark-retreat-wipe-e",
			"Zark uses the dedicated cleaning cycle")
	if code == "RIX_02":
		expect(absf(tool.global_position.y - spot.y) < 0.11, "the bristles use the actual floor height")
		var sweep: Dictionary = actor._pick_clip_from_profile("retreat_work", "n")
		expect(sweep.get("frames", []).size() == 6, "Rix has six authored sweeping phases")
	if code in ["FRU_02", "ZAR_01"]:
		var carry: Dictionary = actor._pick_clip_from_profile("walk", "n")
		expect(str(carry.get("modular_definition", "")).ends_with("-retreat-carry-n") and carry.get("frames", []).size() == 8,
			code + " selects eight authored carrying frames during rearward movement")
		var side := "w" if code == "FRU_02" else "e"
		var lateral: Dictionary = actor._pick_clip_from_profile("walk", side)
		expect(str(lateral.get("modular_definition", "")).ends_with("-retreat-carry-" + side) and lateral.get("frames", []).size() == 8,
			code + " selects eight authored carrying frames on its main lateral route")
		var lifted: Dictionary = actor._pick_clip_from_profile(actor.current_anim, side)
		expect(str(lifted.get("modular_definition", "")).ends_with("-retreat-lift-" + side) and lifted.get("frames", []).size() == 8,
			code + " selects a dedicated crouch and rise when picking up the load")
	if capture:
		if code == "ZAR_02":
			await _capture_old_wiping(actor, tool, state.target)
			tools.tick(0.0)
		await _frames(3)
		_save(code + "-trabajo")
	village.set_process(true)
	actor.set_physics_process(true)

func _capture_old_wiping(actor: Resident, tool: Node3D, rim: Vector3) -> void:
	# The previous gesture and cloth offset are replayed in the same fixed camera.
	var step := scene.find_child("RetreatZarkCleaningStep", true, false) as Node3D
	if not is_instance_valid(step):
		return
	var foothold := actor.global_position
	var right := Vector3.UP.cross(actor.world_heading_for_pose(actor.facing_dir))
	step.hide()
	actor.global_position -= Vector3.UP * 0.135
	actor.set_work_prop("")
	actor._process_pose_visuals(0.0, Vector2.ZERO, "retreat_tidy")
	tool.global_position = rim - Vector3(0.01, 0.065, 0.0) + right * (sin(0.40 * 5.0) * 0.18 - 0.20)
	await _frames(3)
	_save("ZAR_02-pano-antes")
	step.show()
	actor.global_position = foothold
	actor.set_work_prop("wipe")
	actor._process_pose_visuals(0.0, Vector2.ZERO, "retreat_tidy")

func _fishing_art(actor: Resident, code: String, spot: Vector3) -> void:
	var tools = village.routine_props.tools
	if not tools.has_actor(actor.resident_id):
		return
	village.set_process(false)
	var state: Dictionary = tools._active[actor.resident_id]
	var observed := {}
	for stage: String in ["prepare", "cast", "wait", "retrieve"]:
		state.elapsed = {"prepare":0.18, "cast":0.64, "wait":2.10, "retrieve":2.10}[stage]
		if stage == "retrieve":
			tools.begin_fishing_retrieval(actor.resident_id)
			state.elapsed += 0.48
		if capture:
			_view(spot, 0.0, 25.0)
		tools.tick(0.0)
		var direction: String = Facing.view_direction(actor, actor.facing_dir)
		var pose: Dictionary = actor._pick_clip_from_profile("retreat_fishing", direction)
		observed[pose.get("modular_definition", direction)] = true
		expect(actor._fishing_stage == stage, code + " follows the " + stage + " phase")
		if capture:
			await _frames(2)
			_save(code + "-" + stage)
		if stage == "wait":
			expect(state.ripple.visible and state.float.global_position.y < 0.06, code + " reaches water during the wait")
		if stage == "retrieve":
			expect(not state.ripple.visible and state.float.global_position.y > 0.13, code + " retrieves the float off the water")
		if str(pose.get("modular_definition", "")).contains("-fishing-"):
			expect(actor.fishing_hand_contact().is_finite(), code + " uses a registered grip in " + stage)
			if capture:
				var axis: Vector3 = state.tool.global_basis.y
				var handle: Vector3 = state.tool.global_position + axis * 0.09
				var actual: Vector3 = tools._fishing_grip(actor)
				expect(handle.distance_to(actual) < 0.06, code + " handle follows the painted grip in " + stage)
	if capture:
		expect(observed.size() == 4, code + " selects its four new poses")
	state.retrieval = -1.0
	state.elapsed = 2.2
	tools.tick(0.0)
	village.set_process(true)

func _test_dm_and_weather() -> void:
	village.set_autonomy_paused(true)
	expect(village.request_characteristic_routine("myla", "MYL_01"), "DM can request a routine while autoplay is paused")
	expect(village.routine_status("myla").activity.begins_with("Vierte"), "DM sees pending activity")
	expect(not village.request_characteristic_routine("tarak", "MYL_01"), "DM cannot assign another actor's routine")
	village.set_resident_paused("myla", true)
	expect(not village._routine_orders.has("myla") and not village._spot_reservations.values().has("myla"), "pausing cancels route and clears reservations")
	expect(not Featured.allows(Featured.get_row("tarak", "TAR_01"), "rain"), "rain suspends watering")
	expect(not Featured.allows(Featured.get_row("blepp", "BLE_01"), "storm"), "storms suspend fishing")
	expect(Featured.allows(Featured.get_row("laylee", "LAY_01"), "storm"), "workshop remains usable in storms")
	village.set_autonomy_paused(false)
	village.set_resident_paused("myla", false)
	expect(not village.routine_status("myla").paused, "DM can return the resident to autoplay")
	for hour: int in [8, 13, 19]:
		scene.vtt_ui.clock_seconds = hour * 3600
		expect(not village._meal_order("agga").is_empty(), "community meal opens at hour %s" % hour)
		expect(village._meal_order("agga").is_empty(), "meal is scheduled once per resident at hour %s" % hour)
	expect(Agenda.for_phase("runara", "night").all(func(row: Array): return row[0] != "night_rest"), "Runara has no automatic sleep in the guest quarters")

func _test_fishing_journey() -> void:
	var tarak: Resident = village.residents.tarak
	var blepp: Resident = village.residents.blepp
	contacts.erase("TAR_02")
	contacts.erase("BLE_01")
	village.set_autonomy_paused(true)
	expect(village.request_characteristic_routine("tarak", "TAR_02"), "Tarak's route can be requested in the native DM flow")
	expect(village.request_characteristic_routine("blepp", "BLE_01"), "Blepp reserves a separate fishing point")
	tarak.set_physics_process(true)
	blepp.set_physics_process(true)
	village.set_physics_process(true)
	var last := tarak.global_position
	var max_step := 0.0
	var overlap := false
	var travelled_down := false
	for frames: int in 8300:
		await physics_frame
		if journeys_only and frames % 450 == 0:
			print("JOURNEY ", frames, " ", str(tarak.global_position), " ", str(blepp.global_position), " ", blepp.route_goal, " ", blepp._route_index, " ", blepp._route.size(), " ", str(village._blocked_routines.get("blepp", 0)))
		var next := tarak.global_position
		max_step = maxf(max_step, next.distance_to(last))
		last = next
		travelled_down = travelled_down or (next.y > 2.0 and next.y < 7.0)
		overlap = village.routine_props.tools.has_actor("tarak") and village.routine_props.tools.has_actor("blepp")
		if overlap:
			break
	expect(travelled_down and max_step < 0.45, "Tarak descends the existing stairs continuously")
	expect(contacts.has("TAR_02") and contacts.has("BLE_01"), "both fishermen walk to the actual shore stations")
	expect(overlap, "Tarak and Blepp have overlapping fishing shifts on separate points")
	if overlap:
		village.routine_props.tools.tick(1.2)
		var tarak_tool: Dictionary = village.routine_props.tools._active.tarak
		var blepp_tool: Dictionary = village.routine_props.tools._active.blepp
		var first: Vector3 = tarak_tool.float.global_position
		var second: Vector3 = blepp_tool.float.global_position
		expect(first.x < 18.65 and second.x > 25.2, "fishing lines end in water on opposite sides, clear of the moored boat")
		village.set_resident_paused("tarak", true)
		expect(not village.routine_props.tools.has_actor("tarak"), "interrupting one fisherman frees only their gear")
		expect(village.routine_props.tools.has_actor("blepp"), "other fisherman can keep working")
	village.set_autonomy_paused(false)
	village._stop_routines()
	village.set_physics_process(false)

func _view(spot: Vector3, yaw: float, pitch: float) -> void:
	camera.is_overview = false
	camera.focus_point = spot + Vector3.UP * 0.65
	camera.current_yaw = yaw
	camera.current_pitch = pitch
	camera.current_distance = 4.9
	camera.update_camera_transform()
	camera.near = maxf(0.05, camera.global_position.distance_to(camera.focus_point) - 2.15)

func _matrix(actor: Resident, code: String, spot: Vector3) -> void:
	actor.set_physics_process(false)
	village.set_process(false)
	var atlas := Image.create(1600, 900, false, Image.FORMAT_RGB8)
	var h := actor.world_heading_for_pose(actor.facing_dir)
	var body_direction := actor.facing_dir
	var lock := actor.action_lock_timer
	var sample := 0
	var views: Dictionary = {}
	var tools = village.routine_props.tools
	var state: Dictionary = tools._active.get(actor.resident_id, {})
	var fixed_tool_point := Vector3.INF
	var tool_drift := 0.0
	for pitch: float in [25, 20, 15, 10, 5]:
		for yaw: float in [-30, -15, 0, 15, 30]:
			_view(spot, yaw, pitch)
			var dir := Facing.view_direction(actor, actor.facing_dir)
			actor._resolve_and_apply_clip(actor.current_anim, actor.facing_dir, false)
			actor._process_frame_animation(0.0)
			tools.tick(0.0)
			if state.get("verb") in ["sweep", "wipe"]:
				var tool_point: Vector3 = state.tool.global_position
				if not fixed_tool_point.is_finite():
					fixed_tool_point = tool_point
				tool_drift = maxf(tool_drift, fixed_tool_point.distance_to(tool_point))
			var pose: Dictionary = actor._pick_clip_from_profile(actor.current_anim, dir)
			views[pose.get("modular_definition", dir)] = true
			await RenderingServer.frame_post_draw
			var image := root.get_texture().get_image()
			image.convert(Image.FORMAT_RGB8)
			image.resize(320, 180, Image.INTERPOLATE_LANCZOS)
			atlas.blit_rect(image, Rect2i(0, 0, 320, 180), Vector2i(sample % 5 * 320, floori(sample / 5.0) * 180))
			sample += 1
	expect(actor.facing_dir == body_direction and actor.world_heading_for_pose(actor.facing_dir).is_equal_approx(h), code + " body heading unchanged across matrix")
	expect(is_equal_approx(lock, actor.action_lock_timer), code + " camera does not restart the gesture")
	if fixed_tool_point.is_finite():
		expect(tool_drift < 0.002, code + " horizontal camera keeps the scene contact fixed")
	if code == "RUN_01" or (code.begins_with("RUN_02") and actor.has_seated_study()):
		expect(views.size() == 5, code + " reaches all five seated views")
	expect(atlas.save_png(output.path_join(code + "-matriz.png")) == OK, code + " matrix saved")
	tables.append({"id":code, "views":views.keys(), "samples":sample})
	actor.set_physics_process(true)
	village.set_process(true)

func _save(name: String) -> void:
	if not output.is_empty():
		expect(root.get_texture().get_image().save_png(output.path_join(name + ".png")) == OK, "captured " + name)

func _frames(total: int) -> void:
	for tick: int in total:
		await physics_frame
	if capture or matrix:
		await RenderingServer.frame_post_draw
