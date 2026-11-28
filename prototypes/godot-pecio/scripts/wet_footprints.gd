extends MultiMeshInstance3D

const CAPACITY := 24
const PUDDLE_CAPACITY := 3
const TOTAL_MARKS := CAPACITY + PUDDLE_CAPACITY
const MIN_MOISTURE := 0.14
const CLEAR_DRY_SECONDS := 23.0
const PUDDLE_DRY_SECONDS := 33.0
const UPDATE_INTERVAL := 0.10
const FloorSupport = preload("res://scripts/token_floor.gd")

static var _sole: PlaneMesh

var _moisture := PackedFloat32Array()
var _sides := PackedByteArray()
var _next := 0
var _right_foot := false
var _distance := 0.0
var _elapsed := 0.0
var _drying := 1.0
var _puddle_next := 0
var _puddle_left := 0
var _puddle_seconds := 0.0
var _puddle_wetness := 0.0
var _last_puddle_position := Vector3.INF

func _ready() -> void:
	top_level = true
	global_transform = Transform3D.IDENTITY
	cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	_moisture.resize(TOTAL_MARKS)
	_sides.resize(TOTAL_MARKS)
	set_process(false)

func set_climate(drying: float, delta: float) -> void:
	if is_processing():
		_drying += drying * delta
	if _puddle_left > 0:
		_puddle_seconds -= delta
		if _puddle_seconds <= 0.0:
			end_water_exit()

func begin_water_exit(strength: float) -> void:
	_puddle_left = PUDDLE_CAPACITY if strength >= .72 else (1 if strength > .45 else 0)
	_puddle_seconds = 2.2
	_puddle_wetness = strength
	_last_puddle_position = Vector3.INF

func end_water_exit() -> void:
	_puddle_left = 0

func record_dripping(body: CharacterBody3D, supported: bool, height: float) -> void:
	if _puddle_left == 0 or not supported:
		return
	var point := body.global_position
	if _last_puddle_position.distance_squared_to(point) < .43:
		return
	var hit := FloorSupport.support(body, point, .25, .33)
	if hit.is_empty():
		return
	var normal: Vector3 = hit.normal
	var right := Vector3.RIGHT.slide(normal).normalized()
	var scale_factor := clampf(height / 1.65, .72, 1.16) * lerpf(1.0, 3.55, _puddle_wetness)
	scale_factor *= .60 + .40 * float(_puddle_left) / PUDDLE_CAPACITY
	var axes := Basis(right * scale_factor, normal, right.cross(normal) * scale_factor)
	var strength := _puddle_wetness * (.72 + .28 * float(_puddle_left) / PUDDLE_CAPACITY)
	var landing: Vector3 = hit.position + normal * .015
	_store_mark(CAPACITY + _puddle_next, Transform3D(axes, landing), strength, _puddle_next)
	_last_puddle_position = point
	_puddle_next = (_puddle_next + 1) % PUDDLE_CAPACITY
	_puddle_left -= 1

func record_motion(body: CharacterBody3D, before: Vector3, shoe_wetness: float, can_stamp: bool, height: float) -> void:
	if not can_stamp or shoe_wetness < MIN_MOISTURE:
		_distance = 0.0
		return
	var displacement := body.global_position - before
	var travel := Vector2(displacement.x, displacement.z).length()
	if travel > 1.2:
		_distance = 0.0
		return
	if travel < 0.002:
		return
	var stride := clampf(height * 0.34, 0.37, 0.62)
	_distance += travel
	if _distance < stride:
		return
	var direction := Vector3(displacement.x, 0.0, displacement.z) / travel
	var right := direction.cross(Vector3.UP)
	var step := body.global_position - direction * minf(travel, _distance - stride + 0.12)
	step += right * height * (0.095 if _right_foot else -0.095)
	_distance = fmod(_distance, stride)
	var contact := FloorSupport.support(body, step, 0.24, 0.29)
	if contact.is_empty():
		return
	var normal: Vector3 = contact.normal
	direction = direction.slide(normal).normalized()
	right = direction.cross(normal)
	var size := clampf(height / 1.65, 0.70, 1.12)
	var axes := Basis(right * size, normal, -direction * size)
	_add_print(Transform3D(axes, contact.position + normal * 0.012), shoe_wetness)

func _add_print(placement: Transform3D, strength: float) -> void:
	_store_mark(_next, placement, strength, int(_right_foot))
	_next = (_next + 1) % CAPACITY
	_right_foot = not _right_foot

func _store_mark(slot: int, placement: Transform3D, strength: float, variant: int) -> void:
	if multimesh == null:
		if _sole == null:
			_sole = PlaneMesh.new()
			_sole.size = Vector2(0.33, 0.49)
			var material := ShaderMaterial.new()
			material.shader = preload("res://shaders/wet_footprint.gdshader")
			_sole.material = material
		multimesh = MultiMesh.new()
		multimesh.transform_format = MultiMesh.TRANSFORM_3D
		multimesh.use_custom_data = true
		multimesh.mesh = _sole
		multimesh.instance_count = TOTAL_MARKS
		multimesh.visible_instance_count = 0
		for index in TOTAL_MARKS:
			multimesh.set_instance_custom_data(index, Color(0, 0, 0, 0))
	if not is_processing():
		_elapsed = 0.0
		_drying = 0.0
		set_process(true)
	_moisture[slot] = clampf(strength, 0.0, 1.0)
	_sides[slot] = variant
	multimesh.set_instance_transform(slot, placement)
	_update_instance(slot)
	multimesh.visible_instance_count = maxi(multimesh.visible_instance_count, slot + 1)

func _process(delta: float) -> void:
	_elapsed += delta
	if _elapsed < UPDATE_INTERVAL:
		return
	var evaporation := _drying
	_drying = 0.0
	_elapsed = 0.0
	var last_active := -1
	for slot in TOTAL_MARKS:
		if _moisture[slot] <= 0.0:
			continue
		var fade := evaporation / (CLEAR_DRY_SECONDS if slot < CAPACITY else PUDDLE_DRY_SECONDS)
		_moisture[slot] = maxf(0.0, _moisture[slot] - fade)
		_update_instance(slot)
		if _moisture[slot] > 0.0:
			last_active = slot
	multimesh.visible_instance_count = last_active + 1
	if last_active < 0:
		_next = 0
		set_process(false)

func _update_instance(slot: int) -> void:
	multimesh.set_instance_custom_data(slot, Color(_moisture[slot], float(_sides[slot]) * .5, float(slot >= CAPACITY), 0))
