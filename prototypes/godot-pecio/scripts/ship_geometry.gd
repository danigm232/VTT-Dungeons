class_name ShipGeometry
extends RefCounted

# Closed, UV-mapped joinery shared by the existing builders. Visual only.
static func quad(st: SurfaceTool, a: Vector3, b: Vector3, c: Vector3, d: Vector3) -> void:
	var u := a.distance_to(b)
	var v := b.distance_to(c)
	for corner in [[a, Vector2(0, 0)], [b, Vector2(u, 0)], [c, Vector2(u, v)], [a, Vector2(0, 0)], [c, Vector2(u, v)], [d, Vector2(0, v)]]:
		st.set_uv(corner[1])
		st.add_vertex(corner[0])

static func beam(st: SurfaceTool, a: Vector3, b: Vector3, width: float, depth: float = -1.0, tip_scale: float = 1.0) -> void:
	if a.distance_squared_to(b) < 0.000001:
		return
	var axis := (b - a).normalized()
	var reference := Vector3.UP if absf(axis.dot(Vector3.UP)) < 0.95 else Vector3.FORWARD
	var across := axis.cross(reference).normalized() * width * 0.5
	var face := across.normalized().cross(axis) * (width if depth < 0.0 else depth) * 0.5
	var ring_a: Array[Vector3] = [a - across - face, a + across - face, a + across + face, a - across + face]
	var ring_b: Array[Vector3] = [b - (across + face) * tip_scale, b + (across - face) * tip_scale, b + (across + face) * tip_scale, b + (-across + face) * tip_scale]
	for i in range(4):
		quad(st, ring_a[i], ring_b[i], ring_b[(i + 1) % 4], ring_a[(i + 1) % 4])
	quad(st, ring_a[0], ring_a[1], ring_a[2], ring_a[3])
	quad(st, ring_b[3], ring_b[2], ring_b[1], ring_b[0])

static func begin(material: Material) -> SurfaceTool:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	st.set_material(material)
	return st

static func tube(st: SurfaceTool, path: Array[Vector3], radius: float, sides: int = 6) -> void:
	var rings: Array = []
	for i in range(path.size()):
		var axis := (path[mini(i + 1, path.size() - 1)] - path[maxi(0, i - 1)]).normalized()
		var reference := Vector3.UP if absf(axis.dot(Vector3.UP)) < 0.95 else Vector3.RIGHT
		var u := axis.cross(reference).normalized()
		var v := u.cross(axis).normalized()
		var ring: Array[Vector3] = []
		for k in range(sides):
			var angle := TAU * float(k) / float(sides)
			ring.append(path[i] + radius * (u * cos(angle) + v * sin(angle)))
		rings.append(ring)
	for i in range(rings.size() - 1):
		for k in range(sides):
			quad(st, rings[i][k], rings[i + 1][k], rings[i + 1][(k + 1) % sides], rings[i][(k + 1) % sides])
	for end in [0, path.size() - 1]:
		for k in range(sides):
			var corners: Array = [path[end], rings[end][(k + 1) % sides], rings[end][k]] if end == 0 else [path[end], rings[end][k], rings[end][(k + 1) % sides]]
			for vertex: Vector3 in corners:
				st.set_uv(Vector2(vertex.x, vertex.z))
				st.add_vertex(vertex)

static func commit(parent: Node3D, node_name: String, st: SurfaceTool) -> MeshInstance3D:
	st.generate_normals()
	st.generate_tangents()
	var mi := MeshInstance3D.new()
	mi.name = node_name
	mi.mesh = st.commit()
	parent.add_child(mi)
	return mi

# Extrude only the boundary edges and underside, keeping top vertices/collisions
# exactly as authored, including P13 and both descending stair openings.
static func slab_shell(top: MeshInstance3D, material: Material, thickness: float = 0.18) -> void:
	var st := begin(material)
	var edges: Dictionary = {}
	var drop := Vector3.DOWN * thickness
	for surface in range(top.mesh.get_surface_count()):
		var arrays := top.mesh.surface_get_arrays(surface)
		var vertices: PackedVector3Array = arrays[Mesh.ARRAY_VERTEX]
		var indices := PackedInt32Array()
		if arrays[Mesh.ARRAY_INDEX] != null:
			indices = arrays[Mesh.ARRAY_INDEX]
		if indices.is_empty():
			for n in range(vertices.size()):
				indices.append(n)
		for i in range(0, indices.size(), 3):
			var a := vertices[indices[i]]
			var b := vertices[indices[i + 1]]
			var c := vertices[indices[i + 2]]
			for p in [c + drop, b + drop, a + drop]:
				st.set_uv(Vector2(p.x, p.z))
				st.add_vertex(p)
			for pair in [[a, b], [b, c], [c, a]]:
				var key_a := str(pair[0].snapped(Vector3.ONE * 0.0001))
				var key_b := str(pair[1].snapped(Vector3.ONE * 0.0001))
				var key := key_a + "|" + key_b if key_a < key_b else key_b + "|" + key_a
				if edges.has(key):
					edges[key][2] += 1
				else:
					edges[key] = [pair[0], pair[1], 1]
	# The authored decks contain T junctions at stair apertures. Split collinear
	# boundary edges before cancelling, or an internal edge becomes a false wall.
	var candidates: Array = []
	var endpoints: Dictionary = {}
	for edge in edges.values():
		if edge[2] == 1:
			candidates.append(edge)
			endpoints[edge[0].snapped(Vector3.ONE * 0.0001)] = edge[0]
			endpoints[edge[1].snapped(Vector3.ONE * 0.0001)] = edge[1]
	var atomic_edges: Dictionary = {}
	for edge in candidates:
		var a: Vector3 = edge[0]
		var span: Vector3 = edge[1] - a
		var stops: Array[float] = [0.0, 1.0]
		for vertex: Vector3 in endpoints.values():
			var t := (vertex - a).dot(span) / maxf(span.length_squared(), 0.000001)
			if t > 0.00001 and t < 0.99999 and (a + span * t).distance_squared_to(vertex) < 0.0000001:
				stops.append(t)
		stops.sort()
		for i in range(stops.size() - 1):
			if stops[i + 1] - stops[i] < 0.00001:
				continue
			var p := a + span * stops[i]
			var q := a + span * stops[i + 1]
			var p_key := str(p.snapped(Vector3.ONE * 0.0001))
			var q_key := str(q.snapped(Vector3.ONE * 0.0001))
			var key := p_key + "|" + q_key if p_key < q_key else q_key + "|" + p_key
			if atomic_edges.has(key):
				atomic_edges[key][2] += 1
			else:
				atomic_edges[key] = [p, q, 1]
	for edge in atomic_edges.values():
		if edge[2] == 1:
			quad(st, edge[1], edge[0], edge[0] + drop, edge[1] + drop)
	var shell := commit(top, "ConstructionShell", st)
	shell.set_meta("visual_only", true)
	shell.set_meta("thickness_m", thickness)
