extends Node3D

const Directory = preload("res://scripts/retreat_resident_directory.gd")
const Resident = preload("res://scripts/retreat_resident.gd")
const TokenScene = preload("res://scenes/player_token.tscn")
const Registry = preload("res://characters/registry.gd")
const CLOCK_PHASES := ["day", "dusk", "night"]
const LANDING_OFFSETS := [
	Vector2.ZERO, Vector2(0.5, 0), Vector2(-0.5, 0), Vector2(0, 0.5), Vector2(0, -0.5),
	Vector2(0.65, 0.65), Vector2(-0.65, 0.65), Vector2(0.65, -0.65), Vector2(-0.65, -0.65),
	Vector2(1.0, 0), Vector2(-1.0, 0), Vector2(0, 1.0), Vector2(0, -1.0),
]

var residents: Dictionary = {}
var phase := "day"
var last_conversation: Dictionary = {}
var _next_scan := 0.0
var _pending: Dictionary = {}
var _workbench: Node
var _incense: GPUParticles3D
var _main: Node3D
var _session: Node
var _welcomed := false

func _ready() -> void:
	_main = get_parent() as Node3D
	_session = get_node_or_null("/root/MapTransition")
	_welcomed = _session != null and bool(_session.get_meta("retreat_welcomed", false))
	add_to_group("time_of_day_listener")
	set_physics_process(false)
	_spawn_residents.call_deferred()

func _spawn_residents() -> void:
	await get_tree().physics_frame
	if not is_inside_tree():
		return
	var view: Camera3D = _main.camera
	var bench := _main.find_child("MylaTinkerWorkbench", true, false)
	if bench:
		_workbench = bench.get_node_or_null("Interactive_Workbench")
	var altar := _main.find_child("BahamutOfferingAltar", true, false) as Node3D
	if altar:
		_incense = _build_incense(altar)
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
	set_physics_process(true)

func active_hero() -> CharacterBody3D:
	if is_instance_valid(_main.vtt_ui):
		return _main.vtt_ui.get_active_token_node() as CharacterBody3D
	return _main.player as CharacterBody3D

func table_in_combat() -> bool:
	return is_instance_valid(_main.vtt_ui) and _main.vtt_ui.combat_active

func say_line(actor: Resident, line: String) -> void:
	last_conversation = {"resident": actor.resident_id, "text": line}
	if is_instance_valid(_main.vtt_ui):
		_main.vtt_ui.notify_mesa("%s · %s" % [actor.token_name, line])
	if actor.resident_id == "runara" and actor.welcomed:
		_welcomed = true
		if _session:
			_session.set_meta("retreat_welcomed", true)
		_pending[actor.resident_id] = _station_for(actor.resident_id)

func set_time_of_day(next_phase: String) -> void:
	if next_phase not in CLOCK_PHASES:
		return
	phase = next_phase
	for id: String in residents:
		_pending[id] = _station_for(id)

func _station_for(id: String) -> String:
	if id == "runara" and not _welcomed:
		return Directory.WELCOME
	return Directory.RESIDENTS[id].stations[CLOCK_PHASES.find(phase)]

func _physics_process(delta: float) -> void:
	_next_scan -= delta
	if _next_scan > 0.0 or _pending.is_empty() or table_in_combat():
		return
	_next_scan = 0.4
	for id: String in _pending.keys():
		var actor: Resident = residents[id]
		var key: String = _pending[id]
		if actor.station_id == key:
			_pending.erase(id)
			continue
		var desired: Vector3 = Directory.STATIONS[key][0]
		if not actor.can_change_station() or _observed(actor.global_position) or _observed(desired):
			continue
		var spot := _find_landing(desired, actor.target_height)
		if not spot.is_finite():
			push_warning("No clear floor for Retreat station: " + key)
		else:
			_place(actor, key, spot)
		_pending.erase(id)

func _observed(point: Vector3) -> bool:
	var avatar := active_hero()
	var view: Camera3D = _main.camera
	return (is_instance_valid(avatar) and avatar.global_position.distance_to(point) < 4.0) or (
		is_instance_valid(view) and view.is_position_in_frustum(point + Vector3.UP * 0.55)
	)

func _place(actor: Resident, key: String, spot: Vector3) -> void:
	var station: Array = Directory.STATIONS[key]
	actor.place_at_station(key, spot, station[1], station[2])

func _find_landing(proposed: Vector3, height: float) -> Vector3:
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
		if residents.values().any(func(actor: Resident) -> bool: return actor.global_position.distance_to(foot) < 0.76):
			continue
		return foot
	return Vector3.INF

func on_activity_contact(actor: Resident, action: String) -> void:
	if action == "retreat_tinker" and actor.station_id == "myla_bench" and is_instance_valid(_workbench):
		_workbench.spin_workbench_gear()
	elif action == "retreat_incense" and actor.station_id == "rix_temple" and is_instance_valid(_incense):
		if not _main.vtt_ui or not _main.vtt_ui.get_env_reduced_effects():
			_incense.restart()
			_incense.emitting = true

func _build_incense(altar: Node3D) -> GPUParticles3D:
	var particles := GPUParticles3D.new()
	particles.name = "ResidentIncense"
	particles.position = Vector3(-0.34, 0.95, 0.08)
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
	edge.gradient.set_color(0, Color(0.78, 0.77, 0.73, 0.46))
	edge.gradient.set_color(1, Color(0.78, 0.77, 0.73, 0.0))
	edge.fill = GradientTexture2D.FILL_RADIAL
	edge.fill_from = Vector2(0.5, 0.5)
	edge.fill_to = Vector2(1.0, 0.5)
	material.albedo_texture = edge
	puff.material = material
	particles.draw_pass_1 = puff
	altar.add_child(particles)
	return particles
