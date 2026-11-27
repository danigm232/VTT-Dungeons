extends RefCounted
## Small scene props. Contact motion is separate from the painted bodies.

const Anchors = preload("res://characters/anchors.gd")
const Registry = preload("res://characters/registry.gd")
const Facing = preload("res://sprites/sprite_facing.gd")
const Work = preload("res://scripts/retreat_work_contacts.gd")
const WOOD := Color("#735334")
const IRON := Color("#687277")
const ROPE := Color("#aa8d62")
const CLOTH := Color("#697a70")

var _owner: Node3D
var _active: Dictionary = {}
var _delivered: Dictionary = {}
var _lowering: Dictionary = {}
var _sounds: Dictionary = {}
var _materials: Dictionary = {}

func bind(owner: Node3D) -> void:
	_owner = owner

func has_actor(id: String) -> bool:
	return _active.has(id)

func start(actor: Node3D, verb: String, target: Vector3, borrowed: Array[Node3D] = []) -> bool:
	var id: String = actor.resident_id
	if verb == "unload":
		return _unload(actor)
	release(id)
	var root := Node3D.new()
	root.name = "RoutineTool_" + id
	_owner.add_child(root)
	var state := {"actor":actor, "root":root, "verb":verb, "target":target, "elapsed":0.0, "impact":-1}
	var tool := Node3D.new()
	root.add_child(tool)
	state["tool"] = tool
	match verb:
		"fishing":
			state["pose_fallback"] = actor.current_anim if actor.current_anim != "retreat_fishing" else "retreat_work"
			state["retrieval"] = -1.0
			var length := 1.62 if actor.target_height > 1.0 else 1.18
			_segment(tool, Vector3.ZERO, Vector3.UP * length, 0.016, 0.006, WOOD)
			_segment(tool, Vector3.UP * 0.02, Vector3.UP * 0.23, 0.023, 0.022, ROPE)
			for fraction: float in [0.30, 0.58, 0.87]:
				_segment(tool, Vector3(0, length * fraction, 0), Vector3(0, length * fraction + 0.025, 0), 0.018, 0.018, IRON)
			state["tip"] = Node3D.new()
			state.tip.position.y = length
			tool.add_child(state.tip)
			state["line"] = _segment(root, Vector3.ZERO, Vector3.UP, 0.005, 0.005, ROPE)
			state["float"] = _sphere(root, Vector3.ZERO, Vector3(0.07, 0.12, 0.07), Color("#aa4f33"))
			var ring := TorusMesh.new()
			ring.inner_radius = 0.245
			ring.outer_radius = 0.256
			ring.rings = 22
			ring.ring_segments = 5
			state["ripple"] = _mesh(root, ring, Vector3.ZERO, Color("#a9bcb8"))
		"stonework", "metalwork", "woodwork":
			state["shaft"] = _segment(tool, Vector3.ZERO, Vector3.UP, 0.017, 0.014, WOOD)
			state["head"] = _segment(tool, Vector3.LEFT * 0.078, Vector3.RIGHT * 0.078, 0.035, 0.034,
				IRON if verb != "woodwork" else WOOD.darkened(0.19))
			if verb == "stonework":
				state["chisel"] = _segment(root, Vector3.ZERO, Vector3.UP, 0.009, 0.013, IRON)
		"dagger":
			_segment(tool, Vector3(0, -0.095, 0), Vector3.ZERO, 0.022, 0.018, WOOD.darkened(0.18))
			_segment(tool, Vector3(-0.05, 0, 0), Vector3(0.05, 0, 0), 0.013, 0.013, IRON)
			var blade := _segment(tool, Vector3.ZERO, Vector3.UP * 0.22, 0.034, 0.001, IRON.lightened(0.26), 4)
			blade.scale.z = 0.32
		"coin":
			_segment(tool, Vector3.DOWN * 0.004, Vector3.UP * 0.004, 0.045, 0.045, Color("#a9683e"), 18)
			_segment(tool, Vector3.UP * 0.004, Vector3.UP * 0.007, 0.034, 0.034, Color("#c58a56"), 18)
		"sweep":
			state["shaft"] = _segment(root, Vector3.ZERO, Vector3.UP, 0.017, 0.014, WOOD)
			for strand: int in 13:
				var s := (float(strand) - 6.0) / 6.0
				_segment(tool, Vector3(s * 0.025, 0.22, 0), Vector3(s * 0.14, 0.009 + s * s * 0.027, sin(s * 7.0) * 0.035), 0.013, 0.007, ROPE.lightened(0.19))
			_segment(tool, Vector3(0, 0.19, 0), Vector3(0, 0.235, 0), 0.04, 0.029, ROPE.darkened(0.31))
		"wipe":
			for fold: int in 5:
				_sphere(tool, Vector3(0, 0.012 + sin(fold) * 0.004, (float(fold) - 2.0) * 0.035),
					Vector3(0.24, 0.031, 0.096), CLOTH.lightened(float(fold % 2) * 0.08))
		"alchemy", "tea":
			var glaze := Color("#668878") if verb == "alchemy" else Color("#996249")
			_sphere(tool, Vector3(0, 0.054, 0), Vector3(0.14, 0.16, 0.14), glaze)
			_segment(tool, Vector3.UP * 0.10, Vector3.UP * 0.17, 0.027, 0.038, glaze.darkened(0.16))
			_segment(tool, Vector3(0, 0.138, 0.01), Vector3(0, 0.16, 0.083), 0.031, 0.024, glaze)
			state["stream"] = _segment(root, Vector3.ZERO, Vector3.UP, 0.009, 0.007, Color("#9ea877") if verb == "alchemy" else Color("#9a744e"))
		"carry_box":
			for x: int in 4:
				_box(tool, Vector3((float(x) - 1.5) * 0.081, 0, 0), Vector3(0.078, 0.19, 0.245), WOOD.lightened(float(x % 2) * 0.11))
			for x: float in [-0.12, 0.12]:
				_box(tool, Vector3(x, 0.009, 0), Vector3(0.035, 0.215, 0.258), WOOD.darkened(0.21))
		"carry_sack":
			_sphere(tool, Vector3.ZERO, Vector3(0.34, 0.27, 0.26), ROPE)
			_sphere(tool, Vector3(0.13, 0.08, 0.025), Vector3(0.11, 0.09, 0.085), ROPE.lightened(0.12))
			_segment(tool, Vector3(0.14, 0.055, 0.026), Vector3(0.14, 0.09, 0.026), 0.05, 0.039, ROPE.darkened(0.38))
		_:
			root.queue_free()
			return false
	_active[id] = state
	state["borrowed"] = {}
	for prop: Node3D in borrowed:
		state.borrowed[prop] = prop.visible
		prop.hide()
	if verb in ["stonework", "metalwork", "woodwork", "sweep", "wipe", "carry_box", "carry_sack"]:
		actor.set_work_prop(verb)
		actor._resolve_and_apply_clip(actor.current_anim, actor.facing_dir, false)
	if verb in ["carry_box", "carry_sack"]:
		var heading: Vector3 = actor.world_heading_for_pose(actor.facing_dir)
		state["pickup"] = _supported_point(actor, actor.global_position + heading * (actor.target_height * 0.49)) + Vector3.UP * 0.13
	_update(state)
	if verb in ["dagger", "coin", "carry_box", "carry_sack", "tea", "alchemy"]:
		_play_sound(root, "water" if verb in ["tea", "alchemy"] else "soft", tool.global_position)
	return true

func _unload(actor: Node3D) -> bool:
	var id: String = actor.resident_id
	if not _active.has(id):
		return false
	var state: Dictionary = _active[id]
	var prior: Node3D = _delivered.get(id)
	if is_instance_valid(prior):
		prior.queue_free()
	_delivered.erase(id)
	var tool: Node3D = state.tool
	var proposed: Vector3 = actor.global_position + actor.world_heading_for_pose(actor.facing_dir) * 0.34
	var to := _supported_point(actor, proposed) + Vector3.UP * (0.11 if state.verb == "carry_box" else 0.13)
	_active.erase(id)
	actor.set_work_prop("unload")
	actor._resolve_and_apply_clip(actor.current_anim, actor.facing_dir, false)
	var ease := _owner.create_tween().set_trans(Tween.TRANS_SINE)
	_lowering[id] = {"tween":ease, "root":state.root, "actor":actor}
	ease.tween_property(tool, "global_position", to, maxf(0.35, actor.action_lock_timer))
	ease.finished.connect(func():
		_lowering.erase(id)
		_delivered[id] = state.root
		if is_instance_valid(actor):
			actor.set_work_prop("")
		_play_sound(state.root, "soft", to))
	return true

func tick(delta: float) -> void:
	for state: Dictionary in _active.values():
		state.elapsed += delta
		_update(state)

func begin_fishing_retrieval(id: String) -> bool:
	var state: Dictionary = _active.get(id, {})
	if state.get("verb") != "fishing":
		return false
	state.retrieval = float(state.elapsed)
	_update(state)
	return true

func _update(state: Dictionary) -> void:
	var actor: Node3D = state.actor
	if not is_instance_valid(actor):
		return
	var t: float = state.elapsed
	var fwd: Vector3 = actor.world_heading_for_pose(actor.facing_dir)
	var side := Vector3.UP.cross(fwd)
	var p := actor.global_position
	var h: float = actor.target_height
	var tool: Node3D = state.tool
	var anatomy: Dictionary = Registry.character("sw-" + str(actor.resident_id))
	var points := Anchors.points(actor, anatomy)
	var uv: Array = points.get("hand_right", [0.70, 0.59])
	var authored: Vector3 = actor.to_global(Anchors.local_point(actor, Vector2(uv[0], uv[1])))
	var lateral := clampf((authored - p).dot(side), -h * 0.24, h * 0.24)
	var grip := Vector3(p.x, clampf(authored.y, p.y + h * 0.38, p.y + h * 0.72), p.z) + fwd * (h * 0.21) + side * lateral
	var verb: String = state.verb
	tool.global_position = grip
	tool.global_basis = Basis(side, Vector3.UP, fwd)
	match verb:
		"fishing":
			_update_fishing(state)
		"stonework", "metalwork", "woodwork":
			_update_hammer(state, Work.hands(actor), fwd)
		"dagger", "coin":
			tool.global_position += Vector3.UP * (0.18 * sin(clampf(t / 1.6, 0.0, 1.0) * PI))
			tool.rotate_y(t * (2.1 if verb == "coin" else 0.8))
			tool.rotate_x(0.59)
		"sweep":
			_update_broom(state, Work.hands(actor), fwd, side)
		"wipe":
			var center: Vector3 = state.target
			var pass_depth := sin(actor.work_gesture_progress() * PI) * 0.11
			tool.global_position = center + fwd * pass_depth
		"tea", "alchemy":
			var cup: Vector3 = state.target
			var tilt := smoothstep(0.0, 0.43, t) * (1.0 - smoothstep(1.25, 1.9, t))
			tool.global_position = cup + Vector3.UP * (0.19 + 0.08 * tilt) - fwd * 0.11
			tool.rotate_x(-tilt * 0.73)
			state.stream.visible = tilt > 0.64
			if state.stream.visible:
				_set_line(state.stream, tool.to_global(Vector3(0, 0.16, 0.08)), cup + Vector3.UP * 0.045)
			if tilt > 0.8 and state.impact < 0:
				state.impact = 0
				_motes(state.root, cup + Vector3.UP * 0.06, Color("#b2ccc2"))
		"carry_box", "carry_sack":
			var lifted := smoothstep(0.03, 0.90, actor.work_gesture_progress())
			var floor_grip: Vector3 = state.pickup
			var hands := Work.hands(actor)
			var palm := (hands[0] + hands[1]) * 0.5
			var carry_grip := Vector3(p.x, clampf(palm.y - 0.035, p.y + h * 0.42, p.y + h * 0.62), p.z)
			carry_grip += fwd * (h * 0.36 + 0.09)
			tool.global_position = floor_grip.lerp(carry_grip, lifted)

func _update_hammer(state: Dictionary, hands: Array[Vector3], forward: Vector3) -> void:
	var tool: Node3D = state.tool
	var progress: float = state.actor.work_gesture_progress()
	var is_stone: bool = state.verb == "stonework"
	var surface: Vector3 = state.target
	var contact := surface + Vector3.UP * 0.035
	if is_stone:
		var chisel_grip := _grip_towards_surface(state.actor, hands[1], surface)
		var bracing := chisel_grip - surface
		var chisel_axis := bracing.normalized().lerp(Vector3.UP, 0.33).normalized()
		contact = surface + chisel_axis * clampf(bracing.length() + 0.04, 0.22, 0.48)
		_set_line(state.chisel, surface, contact)
	var swing := smoothstep(0.36, 0.55, progress) * (1.0 - smoothstep(0.64, 0.86, progress))
	var grip := _grip_towards_surface(state.actor, hands[0], contact)
	var reach := contact - grip
	var lifted := (forward * 0.32 + Vector3.UP * 0.95).normalized()
	var axis := lifted.lerp(reach.normalized(), swing).normalized()
	var length := lerpf(0.32 if is_stone else 0.22, clampf(reach.length(), 0.13, 0.75 if is_stone else 0.42), swing)
	tool.global_position = grip
	_align_up(tool, axis)
	var head := grip + axis * length
	state.head.global_position = head
	_set_line(state.shaft, grip - axis * 0.035, head)
	if swing >= 0.86 and head.distance_to(contact) < 0.09 and state.impact < 0:
		state.impact = 0
		_play_sound(state.root, "soft" if state.verb == "woodwork" else "metal", surface)
		_motes(state.root, surface, Color("#edba66") if state.verb == "metalwork" else Color("#c1a98a"))

func _grip_towards_surface(actor: Node3D, grip: Vector3, contact: Vector3) -> Vector3:
	# Set depth separately so the object stays over the authored hand in the camera.
	var view := actor.get_viewport().get_camera_3d()
	if not view:
		return grip
	var ray := view.project_ray_normal(view.unproject_position(grip))
	return grip + ray * clampf((contact - grip).dot(ray), -0.08, actor.target_height * 0.45)

func _update_broom(state: Dictionary, hands: Array[Vector3], forward: Vector3, side: Vector3) -> void:
	var actor: Node3D = state.actor
	var progress: float = actor.work_gesture_progress()
	var sway := -cos(progress * TAU)
	var floor_point := _supported_point(actor, actor.global_position + forward * 0.44 + side * sway * 0.27)
	var grip := _grip_towards_surface(actor, hands[0], floor_point + Vector3.UP * actor.target_height * 0.60)
	var support := hands[1] + (grip - hands[0])
	var handle := grip - floor_point
	var onto_handle := floor_point + handle * clampf((support - floor_point).dot(handle) / maxf(handle.length_squared(), 0.001), 0.0, 1.0)
	grip += (support - onto_handle).limit_length(0.06) * 0.5
	var axis := (grip - floor_point).normalized()
	var tool: Node3D = state.tool
	tool.global_position = floor_point
	_align_up(tool, axis.slerp(Vector3.UP, 0.42))
	_set_line(state.shaft, tool.to_global(Vector3.UP * 0.19), grip + axis * 0.15)
	var pass_id := floori(progress * 2.0)
	if absf(sway) > 0.8 and pass_id != state.impact:
		state.impact = pass_id
		_play_sound(state.root, "brush", floor_point)
		_motes(state.root, floor_point + Vector3.UP * 0.04, Color("#a39476"))

func _supported_point(actor: Node3D, point: Vector3) -> Vector3:
	var query := PhysicsRayQueryParameters3D.create(point + Vector3.UP * 0.32, point - Vector3.UP * 0.53, 1)
	var hit := actor.get_world_3d().direct_space_state.intersect_ray(query)
	return hit.position + Vector3.UP * 0.008 if not hit.is_empty() and hit.normal.y > 0.6 else Vector3(point.x, actor.global_position.y - 0.055, point.z)
func _update_fishing(state: Dictionary) -> void:
	const WINDUP := 0.36
	const SPLASH := 1.02
	var t: float = state.elapsed
	var retrieving: bool = state.retrieval >= 0.0
	var recovery := smoothstep(0.0, 0.86, t - float(state.retrieval)) if retrieving else 0.0
	var stage := "retrieve" if retrieving else ("prepare" if t < WINDUP else ("cast" if t < SPLASH else "wait"))
	var actor: Node3D = state.actor
	actor.show_fishing_stage(stage, state.pose_fallback)
	var cast_at := Vector3(16.45, 0.027, 115.15) if actor.resident_id == "tarak" else Vector3(27.38, 0.027, 115.13)
	var heading := actor.global_position.direction_to(Vector3(cast_at.x, actor.global_position.y, cast_at.z))
	var cast := smoothstep(WINDUP, SPLASH, t)
	var rod_pitch := lerpf(1.72, 0.24, cast) + recovery * 0.96
	var tool: Node3D = state.tool
	var axis := (Vector3.UP * sin(rod_pitch) + heading * cos(rod_pitch)).normalized()
	tool.global_position = _fishing_grip(actor) - axis * 0.09
	_align_up(tool, axis)
	var tip: Vector3 = state.tip.global_position
	var slack := tip - Vector3.UP * 0.27
	var away := slack.lerp(cast_at, cast * (1.0 - recovery))
	away.y += sin(t * 3.4) * 0.012 * cast
	_set_line(state.line, tip, away)
	state.float.global_position = away
	state.ripple.visible = t >= SPLASH and not retrieving
	state.ripple.global_position = cast_at - Vector3.UP * 0.018
	state.ripple.scale = Vector3.ONE * (0.66 + fposmod(t - SPLASH, 1.5) * 0.34)
	if t >= SPLASH and state.impact < 0:
		state.impact = 0
		_play_sound(state.root, "water", cast_at)

func _fishing_grip(actor: Node3D) -> Vector3:
	var authored: Vector2 = actor.fishing_hand_contact()
	if authored.is_finite():
		return actor.to_global(Anchors.local_point(actor, authored, 0.014))
	var direction := Facing.view_direction(actor, actor.facing_dir)
	var hooks := {"w":Vector2(0.23, 0.442), "e":Vector2(0.76, 0.525)}
	if actor.resident_id == "blepp":
		hooks = {"w":Vector2(0.24, 0.51), "e":Vector2(0.71, 0.51)}
	var side: String = "w" if direction in ["w", "sw", "nw"] else ("e" if direction in ["e", "se", "ne"] else "")
	var uv: Vector2 = hooks.get(side, Vector2(0.67, 0.47))
	return actor.to_global(Anchors.local_point(actor, uv, 0.014))

func release(id: String) -> void:
	if _lowering.has(id):
		var pending: Dictionary = _lowering[id]
		_lowering.erase(id)
		pending.tween.kill()
		if is_instance_valid(pending.actor):
			pending.actor.set_work_prop("")
		pending.root.queue_free()
	if _active.has(id):
		var state: Dictionary = _active[id]
		if state.verb == "fishing" and is_instance_valid(state.actor):
			state.actor.show_fishing_stage("", "")
		if is_instance_valid(state.actor):
			state.actor.set_work_prop("")
		for prop: Node3D in state.borrowed:
			if is_instance_valid(prop):
				prop.visible = state.borrowed[prop]
		state.root.queue_free()
		_active.erase(id)

func stop_all() -> void:
	for id: String in _active.keys():
		release(id)
	for id: String in _lowering.keys():
		release(id)

func _align_up(node: Node3D, up: Vector3) -> void:
	var y := up.normalized()
	var reference := Vector3.RIGHT if absf(y.dot(Vector3.RIGHT)) < 0.93 else Vector3.FORWARD
	var z := reference.cross(y).normalized()
	node.global_basis = Basis(y.cross(z).normalized(), y, z)

func _set_line(line: MeshInstance3D, start_at: Vector3, end_at: Vector3) -> void:
	line.global_position = (start_at + end_at) * 0.5
	var direction := end_at - start_at
	if direction.length_squared() > 0.00001:
		_align_up(line, direction)
		line.scale.y = direction.length()

func _motes(parent: Node3D, at: Vector3, tint: Color) -> void:
	if _owner.get_parent().vtt_ui.get_env_reduced_effects():
		return
	var particles := CPUParticles3D.new()
	particles.amount = 6
	particles.lifetime = 0.38
	particles.one_shot = true
	particles.explosiveness = 0.96
	particles.direction = Vector3.UP
	particles.spread = 52.0
	particles.gravity = Vector3.DOWN * 0.24
	particles.initial_velocity_min = 0.15
	particles.initial_velocity_max = 0.54
	particles.color = tint
	var dust := SphereMesh.new()
	dust.radius = 0.016
	dust.height = 0.032
	dust.radial_segments = 5
	dust.rings = 3
	particles.mesh = dust
	parent.add_child(particles)
	particles.global_position = at
	particles.finished.connect(particles.queue_free)
	particles.emitting = true

func _play_sound(parent: Node3D, kind: String, at: Vector3) -> void:
	if DisplayServer.get_name() == "headless" or AudioServer.get_driver_name() == "Dummy":
		return
	if not _sounds.has(kind):
		var samples := PackedByteArray()
		samples.resize(4000)
		for i: int in 2000:
			var t := float(i) / 22050.0
			var frequency := 990.0 if kind == "metal" else 190.0
			var ring := sin(t * frequency * TAU) * 0.6 + sin(t * frequency * 1.36 * TAU) * 0.25
			var noise := sin(float(i * 53 % 173) * 1.51)
			var mix := ring if kind in ["metal", "soft"] else noise * 0.71 + ring * 0.28
			samples.encode_s16(i * 2, roundi(mix * exp(-t * 46.0) * 2900.0))
		var stream := AudioStreamWAV.new()
		stream.format = AudioStreamWAV.FORMAT_16_BITS
		stream.mix_rate = 22050
		stream.data = samples
		_sounds[kind] = stream
	var player := AudioStreamPlayer3D.new()
	player.stream = _sounds[kind]
	player.max_distance = 9.0
	parent.add_child(player)
	player.global_position = at
	player.finished.connect(player.queue_free)
	player.play()

func _segment(parent: Node3D, a: Vector3, b: Vector3, base: float, top: float, tint: Color, sides := 9) -> MeshInstance3D:
	var cylinder := CylinderMesh.new()
	cylinder.bottom_radius = base
	cylinder.top_radius = top
	cylinder.height = a.distance_to(b)
	cylinder.radial_segments = sides
	var part := _mesh(parent, cylinder, (a + b) * 0.5, tint)
	var y := (b - a).normalized()
	var axis := Vector3.RIGHT if absf(y.dot(Vector3.RIGHT)) < 0.93 else Vector3.FORWARD
	var z := axis.cross(y).normalized()
	part.basis = Basis(y.cross(z).normalized(), y, z)
	return part

func _sphere(parent: Node3D, at: Vector3, size: Vector3, tint: Color) -> MeshInstance3D:
	var sphere := SphereMesh.new()
	sphere.radial_segments = 14
	sphere.rings = 8
	var part := _mesh(parent, sphere, at, tint)
	part.scale = size
	return part

func _box(parent: Node3D, at: Vector3, size: Vector3, tint: Color) -> void:
	var box := BoxMesh.new()
	box.size = size
	_mesh(parent, box, at, tint)

func _mesh(parent: Node3D, mesh: Mesh, at: Vector3, tint: Color) -> MeshInstance3D:
	var part := MeshInstance3D.new()
	part.mesh = mesh
	part.position = at
	if not _materials.has(tint):
		var material := StandardMaterial3D.new()
		material.albedo_color = tint
		material.roughness = 0.83
		_materials[tint] = material
	part.material_override = _materials[tint]
	parent.add_child(part)
	return part
