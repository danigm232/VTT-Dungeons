extends SceneTree

const Agenda = preload("res://scripts/retreat_routine_directory.gd")
const Resident = preload("res://scripts/retreat_resident.gd")
const Registry = preload("res://characters/registry.gd")
const Facing = preload("res://sprites/sprite_facing.gd")
const DIRECTIONS := ["s", "se", "e", "ne", "n", "nw", "w", "sw"]

var _main: Node3D
var _village: Node3D
var _camera: Camera3D
var _failures: Array[String] = []
var _contacted: Dictionary = {}
var _scheduled_contacts: Array[String] = []
var _cooperation: Array[String] = []
var _shots: Array[Dictionary] = []
var _count := 0
var _output := ""
var _capture := false

func _initialize() -> void:
	for arg: String in OS.get_cmdline_user_args():
		if arg.begins_with("--output="):
			_output = arg.trim_prefix("--output=")
	_capture = "--capture" in OS.get_cmdline_user_args()
	_run.call_deferred()

func _expect(value: bool, message: String) -> void:
	_count += 1
	if not value:
		_failures.append(message)
		printerr("FAIL ", message)

func _run() -> void:
	root.size = Vector2i(1440, 810)
	_main = load("res://scenes/main.tscn").instantiate()
	root.add_child(_main)
	current_scene = _main
	await _frames(20)
	_village = _main.retreat_residents
	_camera = _main.camera
	_camera.persist_preferences = false
	_camera.set_process(false)
	_camera.set_physics_process(false)
	_main.vtt_ui.clock_running = false
	_main.layout_builder.set_cave_roofs_mode("open")
	_village.set_physics_process(false)
	_village.routine_contacted.connect(_on_contact)
	_village.routine_shared.connect(_on_shared)
	var starts := {}
	for id: String in _village.residents:
		var actor: Resident = _village.residents[id]
		starts[id] = actor.global_position
		actor.cancel_route()
		actor.set_physics_process(false)
		_check_directions(actor)
	if _capture:
		await _capture_proof()
	else:
		for id: String in Agenda.AGENDAS:
			var actor: Resident = _village.residents[id]
			for task: Array in Agenda.AGENDAS[id]:
				var spot: Vector3 = _village._find_landing(Agenda.station(task[2])[0], actor.target_height, actor)
				_expect(spot.is_finite() and not _village.routes.path(starts[id], spot).is_empty(), id + "/" + task[0] + " support and route")
				if spot.is_finite():
					_stage(actor, task, spot)
					actor.set_physics_process(true)
					await _frames(61)
					_expect(_contacted.get(id + "/" + task[0], 0) == 1, id + "/" + task[0] + " emits contact once")
					actor.set_physics_process(false)
					_village._stop_routines()
					actor.global_position = starts[id]
			_expect(_contacted.keys().filter(func(key: String) -> bool: return key.begins_with(id + "/")).size() == 6, id + " six routines")
		await _check_cooperation()
		await _check_automatic_dispatch()
	var result := {"passed": _failures.is_empty(), "checks": _count, "contacts": _contacted.size(),
		"cooperation": _cooperation, "scheduledContacts": _scheduled_contacts, "failures": _failures, "shots": _shots,
		"catalogue": Registry.data().get("revision", "")}
	print("RETREAT_ROUTINES ", JSON.stringify(result))
	if not _output.is_empty():
		var path := _output.path_join("native-routines.json" if _capture else "headless-routines.json")
		var report := FileAccess.open(path, FileAccess.WRITE)
		if report:
			report.store_string(JSON.stringify(result, "  "))
	quit(0 if _failures.is_empty() else 1)

func _check_directions(actor: Resident) -> void:
	for direction: String in ["s", "e", "n", "w"]:
		var motion: Dictionary = actor._pick_clip_from_profile("walk", direction)
		var poses: Dictionary = actor._pick_clip_from_profile("retreat_work", direction)
		_expect(motion.get("frames", []).size() == 8, actor.resident_id + " eight steps " + direction)
		_expect(poses.get("frames", []).size() == 1, actor.resident_id + " work pose " + direction)
	for state: String in ["idle", "retreat_work"]:
		var cardinal_textures := {}
		for direction: String in DIRECTIONS:
			var clip: Dictionary = actor._pick_clip_from_profile(state, direction)
			var frames: Array = clip.get("frames", [])
			_expect(not frames.is_empty(), actor.resident_id + " clip " + state + "/" + direction)
			if direction.length() == 1 and not frames.is_empty():
				cardinal_textures[frames[0].tex.get_instance_id()] = true
		_expect(cardinal_textures.size() == 4, actor.resident_id + " distinct cardinal views for " + state)
	var h: Vector3 = actor.station_heading
	actor.face_world_direction(Vector3.BACK)
	var heading: Vector3 = actor.world_heading_for_pose(actor.facing_dir)
	var projections := {}
	for angle in [0.0, 90.0, 180.0, 270.0]:
		var focus := actor.global_position + Vector3.UP
		_camera.global_position = focus + Vector3.BACK.rotated(Vector3.UP, deg_to_rad(angle)) * 4.5 + Vector3.UP * 2.5
		_camera.look_at(focus, Vector3.UP)
		var projection := Facing.view_direction(actor, actor.facing_dir)
		projections[projection] = true
	_expect(projections.size() == 4 and actor.world_heading_for_pose(actor.facing_dir).is_equal_approx(heading),
		actor.resident_id + " camera changes the view without changing world heading")
	actor.face_world_direction(h)

func _stage(actor: Resident, task: Array, spot: Vector3) -> void:
	_village._place(actor, task[2], spot)
	_village._routine_orders[actor.resident_id] = task
	_village._begin_routine_at_station(actor)

func _check_cooperation() -> void:
	var myla: Resident = _village.residents.myla
	var laylee: Resident = _village.residents.laylee
	var task: Array = Agenda.AGENDAS.myla[5]
	var stop: Vector3 = _village._find_landing(Agenda.station(task[2])[0], myla.target_height, myla)
	var ally: Vector3 = _village._find_landing(stop + Vector3(1.0, 0, 0.4), laylee.target_height, laylee)
	if not stop.is_finite() or not ally.is_finite():
		_expect(false, "shared workshop has both landing spots")
		return
	laylee.global_position = ally
	_stage(myla, task, stop)
	_expect("myla/lesson/laylee" in _cooperation and laylee.is_talking(), "Laylee takes part in Myla's demonstration")
	_village._stop_routines()
	_expect(not laylee.is_talking(), "stopping a task releases the partner")

func _check_automatic_dispatch() -> void:
	var myla: Resident = _village.residents.myla
	var station := Agenda.station("myla_bench")
	var spot: Vector3 = _village._find_landing(station[0], myla.target_height, myla)
	if not spot.is_finite():
		_expect(false, "Myla has a supported workshop station")
		return
	_village._place(myla, "myla_bench", spot)
	_village._travel_orders.erase("myla")
	_village._routine_cursor.erase("myla/day")
	_village.phase = "day"
	for id: String in _village.residents:
		_village._departures[id] = _village._elapsed if id == "myla" else INF
	_village.routine_contacted.connect(func(id: String, task: String, _target: String):
		if id == "myla":
			_scheduled_contacts.append(task))
	myla.set_physics_process(true)
	_village.set_physics_process(true)
	for tick in range(1050):
		await physics_frame
		if _scheduled_contacts.size() >= 2:
			break
	_expect(_scheduled_contacts == ["gear", "alembic"], "the live clock dispatches and advances Myla's routines")
	_village.set_physics_process(false)
	myla.set_physics_process(false)
	_village._stop_routines()

func _capture_proof() -> void:
	_main.vtt_ui.hide()
	_camera.make_current()
	for token: PlayerToken in _main.party:
		token.set_physics_process(false)
		token.global_position = Vector3(24.75, 0.6, 109)
	for resident_id: String in ["tarak", "runara"]:
		var actor: Resident = _village.residents[resident_id]
		var task: Array = Agenda.AGENDAS[resident_id][1 if resident_id == "tarak" else 0]
		var spot: Vector3 = _village._find_landing(Agenda.station(task[2])[0], actor.target_height, actor)
		_expect(spot.is_finite(), resident_id + " valid camera sample station")
		if not spot.is_finite():
			continue
		await _capture_task(actor, task, spot, false)
		await _capture_task(actor, task, spot, true)

func _capture_task(actor: Resident, task: Array, spot: Vector3, rear: bool) -> void:
	var target: Vector3 = _village.routine_props.anchor(task[5])
	var heading := target - spot
	var focus := spot.lerp(target, 0.28)
	focus.y = spot.y + 0.86
	var yaw := rad_to_deg(atan2(heading.x, heading.z)) + (167.0 if rear else -29.0)
	_camera.is_overview = false
	_camera.focus_point = focus
	_camera.current_yaw = yaw
	_camera.current_pitch = 36.0
	_camera.current_distance = 5.0
	_camera.update_camera_transform()
	var foreground := 1.25 if actor.resident_id == "tarak" and not rear else 2.65
	_camera.near = _camera.global_position.distance_to(focus) - foreground
	_village._place(actor, task[2], spot)
	actor.face_world_direction(heading)
	actor.set_physics_process(true)
	await _frames(4)
	var id := actor.resident_id + ("-espalda" if rear else "-frente")
	var camera_transform := _camera.global_transform
	var angle := Facing.view_direction(actor, actor.facing_dir)
	_shot(id + "-before")
	_stage(actor, task, spot)
	await _frames(87 if task[6] == "water" else 60)
	_shot(id + "-after")
	_expect(camera_transform.is_equal_approx(_camera.global_transform), id + " camera unchanged between shots")
	_expect(_village._running_routines.get(actor.resident_id, {}).get("contact", false), id + " visible task reached contact")
	_expect(angle == ("n" if rear else "se"), id + " agrees with the view in the caption")
	_shots.append({"id": id, "poseDirection": angle, "camera": str(camera_transform)})
	actor.set_physics_process(false)
	_village._stop_routines()

func _shot(id: String) -> void:
	if not _output.is_empty():
		_expect(root.get_texture().get_image().save_png(_output.path_join(id + ".png")) == OK, "saved " + id)

func _on_contact(id: String, task: String, _target: String) -> void:
	var key := id + "/" + task
	_contacted[key] = _contacted.get(key, 0) + 1

func _on_shared(id: String, task: String, partner: String) -> void:
	_cooperation.append("%s/%s/%s" % [id, task, partner])

func _frames(amount: int) -> void:
	for i in amount:
		await physics_frame
	if _capture:
		await RenderingServer.frame_post_draw
