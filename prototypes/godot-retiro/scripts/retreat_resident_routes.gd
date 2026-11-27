extends RefCounted

## Navigation for the cloister's regulars. The tactical grid is coarser than
## doorways and some stairs, so sample the floors along the actual corridors.
const STEP := 0.75
const FLOORS := [
	# The western guest bedroll is at (82, 78); include its existing floor so
	# Runara can reach it without changing furniture, collisions or movement.
	[Rect2(78.0, 78.0, 63.0, 17.25), 9.0],
	[Rect2(140.25, 91.5, 15.0, 3.0), 9.0],
	[Rect2(74.25, 54.0, 73.5, 17.25), 18.0],
	[Rect2(114.0, 52.0, 9.75, 3.0), 18.0],
	[Rect2(32.25, 62.25, 18.75, 12.0), 27.0],
	[Rect2(18.75, 108.0, 9.0, 6.0), 0.49],
	[Rect2(27.0, 108.0, 3.0, 3.0), 0.25],
	[Rect2(34.5, 105.0, 3.0, 6.0), 1.505],
	[Rect2(45.0, 102.0, 3.0, 6.0), 4.005],
	[Rect2(55.5, 99.0, 3.0, 6.0), 6.505],
	[Rect2(66.0, 91.5, 13.5, 10.5), 9.0],
]
const STAIRS := [
	[Vector3(154.5, 9.0, 92.25), Vector3(154.5, 12.0, 82.35), 1.2],
	[Vector3(154.5, 12.0, 82.35), Vector3(154.5, 12.0, 81.15), 1.2],
	[Vector3(154.5, 12.0, 81.15), Vector3(154.5, 15.0, 71.85), 1.2],
	[Vector3(154.5, 15.0, 71.85), Vector3(154.0, 15.0, 67.5), 1.15],
	[Vector3(154.0, 15.0, 67.5), Vector3(145.0, 18.0, 67.5), 1.25],
	[Vector3(76.6, 18.0, 66.0), Vector3(49.8, 27.0, 66.0), 1.55],
	[Vector3(29.5, 0.25, 109.5), Vector3(35.0, 1.505, 109.5), 1.55],
	[Vector3(37.5, 1.505, 106.5), Vector3(45.2, 4.005, 106.5), 1.55],
	[Vector3(48.0, 4.005, 103.5), Vector3(55.7, 6.505, 103.5), 1.55],
	[Vector3(58.5, 6.505, 100.5), Vector3(66.2, 9.005, 100.5), 1.55],
]
const NEIGHBORS := [Vector2i(1, 0), Vector2i(0, 1), Vector2i(1, 1), Vector2i(1, -1)]

var graph := AStar3D.new()
var _buckets: Dictionary = {}
var _space: PhysicsDirectSpaceState3D
var _clearance := PhysicsShapeQueryParameters3D.new()
var _cell_doors: Array[Vector3] = []

func build(owner: Node3D) -> void:
	graph.clear()
	_buckets.clear()
	_cell_doors.clear()
	_space = owner.get_world_3d().direct_space_state
	var body := CapsuleShape3D.new()
	body.radius = 0.29
	body.height = 1.16
	_clearance.shape = body
	_clearance.collision_mask = 1
	_clearance.margin = 0.008
	var door_bodies: Array[RID] = []
	for door in owner.get_tree().get_nodes_in_group("interactive_doors"):
		if str(door.door_id).begins_with("cell_"):
			_cell_doors.append(door.global_position)
		var blocker: CollisionShape3D = door.blocker_shape
		if is_instance_valid(blocker) and blocker.get_parent() is StaticBody3D:
			door_bodies.append(blocker.get_parent().get_rid())
	# A closed door remains a physical blocker when the resident walks.
	_clearance.exclude = door_bodies
	for floor: Array in FLOORS:
		_sample_area(floor[0], floor[1])
	for flight: Array in STAIRS:
		var a: Vector3 = flight[0]
		var b: Vector3 = flight[1]
		var xz_a := Vector2(a.x, a.z)
		var xz_b := Vector2(b.x, b.z)
		var area := Rect2(xz_a, Vector2.ZERO).expand(xz_b).grow(flight[2])
		_sample_area(area, a.y, a, b, flight[2])
	for cell: Vector2i in _buckets:
		for id: int in _buckets[cell]:
			var a := graph.get_point_position(id)
			for offset: Vector2i in NEIGHBORS:
				for other: int in _buckets.get(cell + offset, []):
					var b := graph.get_point_position(other)
					if _passable(a, b):
						graph.connect_points(id, other)

func _sample_area(area: Rect2, height: float, a := Vector3.ZERO, b := Vector3.ZERO, width := 0.0) -> void:
	var line := Vector2(b.x - a.x, b.z - a.z)
	for x in range(ceili(area.position.x / STEP), floori(area.end.x / STEP) + 1):
		for z in range(ceili(area.position.y / STEP), floori(area.end.y / STEP) + 1):
			var p := Vector3(x * STEP, height, z * STEP)
			if width > 0.0:
				var relative := Vector2(p.x - a.x, p.z - a.z)
				var fraction := clampf(relative.dot(line) / line.length_squared(), 0.0, 1.0)
				if relative.distance_to(line * fraction) > width:
					continue
				p.y = lerpf(a.y, b.y, fraction)
			p = _floor_at(p)
			if not p.is_finite() or not _free(p):
				continue
			var key := Vector2i(x, z)
			var slot: Array = _buckets.get(key, [])
			if slot.any(func(id: int) -> bool: return absf(graph.get_point_position(id).y - p.y) < 0.42):
				continue
			var id := graph.get_available_point_id()
			graph.add_point(id, p)
			slot.append(id)
			_buckets[key] = slot

func _floor_at(point: Vector3) -> Vector3:
	var ray := PhysicsRayQueryParameters3D.create(point + Vector3.UP * 0.44, point - Vector3.UP * 0.51, 1, _clearance.exclude)
	var hit := _space.intersect_ray(ray)
	return hit.position if not hit.is_empty() and hit.normal.y >= 0.69 else Vector3.INF

func _free(foot: Vector3) -> bool:
	_clearance.transform.origin = foot + Vector3.UP * 0.76
	_clearance.motion = Vector3.ZERO
	return _space.intersect_shape(_clearance, 1).is_empty()

func _passable(a: Vector3, b: Vector3) -> bool:
	if absf(a.y - b.y) > 0.47 or not _is_centered_at_cell_door(a, b) or not _floor_at(a.lerp(b, 0.5)).is_finite():
		return false
	_clearance.transform.origin = a + Vector3.UP * 0.76
	_clearance.motion = b - a
	var sweep := _space.cast_motion(_clearance)
	return sweep.size() == 2 and sweep[0] >= 0.99

func _is_centered_at_cell_door(a: Vector3, b: Vector3) -> bool:
	if _cell_doors.is_empty() or absf(a.y - 9.0) > 0.45 or is_equal_approx(a.z, b.z):
		return true
	var wall_z := _cell_doors[0].z
	if minf(a.z, b.z) >= wall_z or maxf(a.z, b.z) < wall_z:
		return true
	var crossing := lerpf(a.x, b.x, (wall_z - a.z) / (b.z - a.z))
	if crossing < _cell_doors[0].x - 1.7 or crossing > _cell_doors.back().x + 4.0:
		return true
	return _cell_doors.any(func(door: Vector3) -> bool: return absf(crossing - door.x) <= 0.43)

func path(from: Vector3, to: Vector3, avoid := PackedVector3Array()) -> PackedVector3Array:
	var disabled: Array[int] = []
	for point: Vector3 in avoid:
		var key := Vector2i(roundi(point.x / STEP), roundi(point.z / STEP))
		for id: int in _buckets.get(key, []):
			if not graph.is_point_disabled(id) and absf(graph.get_point_position(id).y - point.y) < 0.40:
				graph.set_point_disabled(id)
				disabled.append(id)
	var start := _entrance(from)
	var finish := _entrance(to)
	var points := graph.get_point_path(start, finish) if start >= 0 and finish >= 0 else PackedVector3Array()
	for id: int in disabled:
		graph.set_point_disabled(id, false)
	if not points.is_empty():
		points.append(to)
	return points

func _entrance(world: Vector3) -> int:
	var center := Vector2i(roundi(world.x / STEP), roundi(world.z / STEP))
	var best := -1
	var range_sq := 2.2 * 2.2
	for x in range(-3, 4):
		for z in range(-3, 4):
			for id: int in _buckets.get(center + Vector2i(x, z), []):
				if graph.is_point_disabled(id):
					continue
				var p := graph.get_point_position(id)
				var d := p.distance_squared_to(world)
				if d < range_sq and not graph.get_point_connections(id).is_empty() and _passable(world, p):
					best = id
					range_sq = d
	return best
