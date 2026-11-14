class_name DragonBonesBuilder
extends Node3D

const PbrMaterialKit = preload("res://scripts/pbr_material_kit.gd")
const Geometry = preload("res://scripts/ship_geometry.gd")

# Reconstrucción Anatómica y Canónica de los Huesos de Clyssavar (Dragón de Oro Antiguo)
# Basado estrictamente en engine/client/wreck-dragon-bones.ts y D&D 5e Cap. 3 pp. 22-27

var mat_bone_gold: StandardMaterial3D
var mat_bone_dark: StandardMaterial3D
var mat_socket: StandardMaterial3D

func _ready() -> void:
	setup_materials()
	build_dragon_skull()
	build_titanic_ribs()
	build_spine_vertebrae()

func setup_materials() -> void:
	mat_bone_gold = PbrMaterialKit.create_mineralized_bone_pbr("#c0b7a4")
	mat_bone_dark = PbrMaterialKit.create_mineralized_bone_pbr("#8a7c66")

	# Cavidades orbitales y fosas profundas
	mat_socket = StandardMaterial3D.new()
	mat_socket.albedo_color = Color("#111514")
	mat_socket.roughness = 0.95

func build_dragon_skull() -> void:
	# Cráneo completo del Dragón de Oro posado en la cresta del arrecife suroeste
	var skull_root = Node3D.new()
	skull_root.name = "GoldDragonSkull"
	skull_root.position = Vector3(-22.5, 2.2, 14.6)
	skull_root.rotation_degrees = Vector3(-10, 145, 5) # Sobre la cresta rocosa de popa mirando al mar sin invadir C3
	add_child(skull_root)

	var st = SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	st.set_material(mat_bone_gold)

	# Proporciones monumentales: 5.5 m de longitud de cabeza
	var rostrum_length = 5.2
	var skull_width = 2.4
	var skull_height = 2.0

	# Bóveda craneal superior y rostro
	var p_snout = Vector3(rostrum_length * 0.5, -0.1, 0.0)
	var p_forehead = Vector3(0.4, skull_height * 0.55, 0.0)
	var p_crest_top = Vector3(-1.2, skull_height * 0.85, 0.0)
	var p_occipital = Vector3(-2.2, 0.3, 0.0)

	for side in [-1.0, 1.0]:
		var p_orbit = Vector3(0.2, skull_height * 0.40, side * (skull_width * 0.48))
		var p_cheek = Vector3(0.8, -0.20, side * (skull_width * 0.42))
		var p_jaw_joint = Vector3(-1.6, -0.4, side * (skull_width * 0.55))

		# Fosas faciales y bóveda
		st.add_vertex(p_snout); st.add_vertex(p_forehead); st.add_vertex(p_cheek)
		st.add_vertex(p_forehead); st.add_vertex(p_crest_top); st.add_vertex(p_orbit)
		st.add_vertex(p_orbit); st.add_vertex(p_crest_top); st.add_vertex(p_occipital)
		st.add_vertex(p_cheek); st.add_vertex(p_orbit); st.add_vertex(p_jaw_joint)

		# Mandíbula inferior desencajada en rugido
		var p_chin = Vector3(rostrum_length * 0.42, -1.5, 0.0)
		var p_jaw_mid = Vector3(0.0, -1.3, side * (skull_width * 0.40))
		st.add_vertex(p_jaw_joint); st.add_vertex(p_chin); st.add_vertex(p_jaw_mid)

		# Colmillos depredadores curvados
		for tooth_x in [rostrum_length * 0.40, rostrum_length * 0.22, 0.1]:
			var tooth_base = Vector3(tooth_x, -0.22, side * (skull_width * 0.35))
			var tooth_tip = Vector3(tooth_x - 0.15, -0.95, side * (skull_width * 0.32))
			add_horn_spike(st, tooth_base, tooth_tip, 0.16, 0.03)

		# Barbillones óseos del mentón (Gold Dragon Chin Barbels)
		var barbel_base = Vector3(rostrum_length * 0.38, -1.55, side * 0.3)
		var barbel_tip = Vector3(rostrum_length * 0.32, -2.45, side * 0.5)
		add_horn_spike(st, barbel_base, barbel_tip, 0.14, 0.03)

	# Cuernos Mayores Retorcidos hacia atrás (7 metros de longitud en arco)
	for side in [-1.0, 1.0]:
		var horn_path = [
			Vector3(-1.0, skull_height * 0.70, side * 0.55),
			Vector3(-2.2, skull_height * 1.15, side * 0.95),
			Vector3(-4.0, skull_height * 1.05, side * 1.45),
			Vector3(-5.8, skull_height * 0.55, side * 1.75)
		]
		add_curved_horn(st, horn_path, 0.42, 0.06)

		# Cuernos secundarios de la corona
		var crown_path = [
			Vector3(-1.5, skull_height * 0.75, side * 0.35),
			Vector3(-2.6, skull_height * 1.25, side * 0.60),
			Vector3(-3.8, skull_height * 1.10, side * 0.75)
		]
		add_curved_horn(st, crown_path, 0.26, 0.04)

	st.generate_normals()
	var skull_inst = MeshInstance3D.new()
	skull_inst.mesh = st.commit()
	skull_inst.material_override = mat_bone_gold
	skull_root.add_child(skull_inst)
	skull_inst.create_trimesh_collision()
	# Retain the authored collision and reef anchor; refine the visible anatomy.
	_refine_skull_visual(skull_inst)

func _refine_skull_visual(instance: MeshInstance3D) -> void:
	var shell := Geometry.begin(mat_bone_gold)
	var recess := Geometry.begin(mat_socket)
	var sections := [
		Vector4(-2.2, 0.32, 0.55, 0.75), Vector4(-1.6, 0.68, 0.83, 1.12),
		Vector4(-0.7, 0.70, 0.95, 1.05), Vector4(0.1, 0.50, 0.65, 1.15),
		Vector4(0.7, 0.27, 0.48, 0.95), Vector4(1.5, 0.13, 0.35, 0.65),
		Vector4(2.6, -0.10, 0.24, 0.32),
	]
	var rings: Array = []
	for section: Vector4 in sections:
		var ring: Array[Vector3] = []
		for k in range(16):
			var angle := TAU * float(k) / 16.0
			ring.append(Vector3(section.x, section.y + sin(angle) * section.z, cos(angle) * section.w))
		rings.append(ring)
	for i in range(rings.size() - 1):
		for k in range(16):
			if i in [2, 3] and k in [15, 0, 7, 8]:
				continue # Real openings into recessed orbital bowls.
			Geometry.quad(shell, rings[i][k], rings[i + 1][k], rings[i + 1][(k + 1) % 16], rings[i][(k + 1) % 16])
	for end in [0, rings.size() - 1]:
		var center := Vector3(sections[end].x, sections[end].y, 0)
		for k in range(16):
			var corners: Array = [center, rings[end][(k + 1) % 16], rings[end][k]] if end == 0 else [center, rings[end][k], rings[end][(k + 1) % 16]]
			for p: Vector3 in corners:
				shell.set_uv(Vector2(p.x, p.y))
				shell.add_vertex(p)
	for side in [1.0, -1.0]:
		var k := 0 if side > 0 else 8
		var lo := (k + 15) % 16
		var hi := (k + 1) % 16
		var edge: Array[Vector3] = [rings[2][lo], rings[3][lo], rings[4][lo], rings[4][k], rings[4][hi], rings[3][hi], rings[2][hi], rings[2][k]]
		var center := Vector3(0.1, 0.52, side * 0.52)
		for n in range(edge.size()):
			var a := edge[n]
			var b := edge[(n + 1) % edge.size()]
			var inner_a := center + (a - center) * 0.48
			var inner_b := center + (b - center) * 0.48
			Geometry.quad(shell, a, b, inner_b, inner_a)
			for p in [inner_a, inner_b, center]:
				recess.set_uv(Vector2(p.x, p.y))
				recess.add_vertex(p)
		# Two connected mandibular rami, retaining the original dislocated pose.
		Geometry.tube(shell, [Vector3(-1.6, -0.4, side * 1.32), Vector3(-0.7, -1.0, side * 1.1), Vector3(0.6, -1.35, side * 0.72), Vector3(2.18, -1.5, side * 0.18)], 0.14, 8)
		for tooth_x in [2.08, 1.14, 0.1]:
			for section_i in range(sections.size() - 1):
				if tooth_x >= sections[section_i].x and tooth_x <= sections[section_i + 1].x:
					var t: float = (tooth_x - sections[section_i].x) / (sections[section_i + 1].x - sections[section_i].x)
					var section: Vector4 = sections[section_i].lerp(sections[section_i + 1], t)
					var base := Vector3(tooth_x, section.y - section.z * 0.685, side * section.w * 0.728)
					add_horn_spike(shell, base, base + Vector3(-0.15, -0.62, -side * 0.04), 0.16, 0.03)
					break
		for tooth_x in [0.25, 0.8, 1.35]:
			var t: float = clampf((tooth_x - 0.6) / 1.58, 0, 1)
			var z: float = lerpf(0.72, 0.18, t) if tooth_x >= 0.6 else lerpf(1.1, 0.72, (tooth_x + 0.7) / 1.3)
			var y: float = lerpf(-1.35, -1.5, t)
			add_horn_spike(shell, Vector3(tooth_x, y, side * z), Vector3(tooth_x + 0.08, y + 0.48, side * z), 0.09, 0.02)
		add_horn_spike(shell, Vector3(1.97, -1.55, side * 0.3), Vector3(1.66, -2.45, side * 0.5), 0.14, 0.03)
		add_curved_horn(shell, [Vector3(-1, 1.4, side * 0.55), Vector3(-2.2, 2.3, side * 0.95), Vector3(-4, 2.1, side * 1.45), Vector3(-5.8, 1.1, side * 1.75)], 0.42, 0.06)
		add_curved_horn(shell, [Vector3(-1.5, 1.5, side * 0.35), Vector3(-2.6, 2.5, side * 0.6), Vector3(-3.8, 2.2, side * 0.75)], 0.26, 0.04)
	Geometry.tube(shell, [Vector3(2.18, -1.5, -0.18), Vector3(2.3, -1.52, 0), Vector3(2.18, -1.5, 0.18)], 0.13, 8)
	shell.generate_normals()
	shell.generate_tangents()
	instance.mesh = shell.commit()
	instance.set_meta("refined_anatomy", true)
	Geometry.commit(instance, "OrbitalCavities", recess)

func build_titanic_ribs() -> void:
	# Costillas titánicas que acunan y sostienen el casco en el arrecife de estribor
	# Conforme al lore canónico ("sostenido en los huesos antiguos que rompieron el casco")
	var ribs_node = Node3D.new()
	ribs_node.name = "TitanicRibs"
	add_child(ribs_node)

	var st = SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	st.set_material(mat_bone_gold)

	# Costillas que emergen del lecho rocoso (y = -4.5 a -5.5, z = 12 a 15)
	# y se curvan hacia arriba abrazando la quilla y el pantoque de estribor (y = -2.5 a 0.2, z = 8.5 a 10.5)
	var rib_cradle_configs = [
		{"x": -25.0, "root": Vector3(-25.0, -4.5, 14.5), "tip": Vector3(-24.5, -0.8, 8.8), "arch_y": 1.2, "radius": 0.45},
		{"x": -21.5, "root": Vector3(-21.5, -4.2, 15.0), "tip": Vector3(-21.0, -0.4, 9.2), "arch_y": 1.6, "radius": 0.48},
		{"x": -18.0, "root": Vector3(-18.0, -4.4, 14.8), "tip": Vector3(-17.5, -0.2, 9.4), "arch_y": 1.8, "radius": 0.50},
		{"x": -14.5, "root": Vector3(-14.5, -4.6, 14.2), "tip": Vector3(-14.0, -0.5, 9.2), "arch_y": 1.5, "radius": 0.46},
		{"x": -11.0, "root": Vector3(-11.0, -4.8, 13.5), "tip": Vector3(-10.5, -1.0, 8.8), "arch_y": 1.0, "radius": 0.42},
		{"x": -7.5,  "root": Vector3(-7.5,  -5.0, 13.0), "tip": Vector3(-7.0,  -1.5, 8.2), "arch_y": 0.5, "radius": 0.38}
	]

	for cfg in rib_cradle_configs:
		var root: Vector3 = cfg["root"]
		var tip: Vector3 = cfg["tip"]
		var arch_y: float = cfg["arch_y"]
		var rad: float = cfg["radius"]

		var pts: Array = []
		var steps = 14
		for i in range(steps + 1):
			var t = float(i) / steps
			var u = 1.0 - t
			var p = root * (u * u) + Vector3((root.x + tip.x) * 0.5, arch_y, (root.z + tip.z) * 0.5 + 1.2) * (2.0 * u * t) + tip * (t * t)
			pts.append(p)
		add_curved_horn(st, pts, rad, 0.08)

	# Costillas de proa en el arrecife norte (bajo el trinquete caído)
	for rx in [23.0, 26.5, 29.0]:
		var bow_pts: Array = []
		var b_root = Vector3(rx, -4.5, -10.5)
		var b_tip = Vector3(rx - 1.2, -0.8, -6.8)
		for i in range(11):
			var t = float(i) / 10.0
			var u = 1.0 - t
			var p = b_root * (u * u) + Vector3(rx, 0.2, -9.2) * (2.0 * u * t) + b_tip * (t * t)
			bow_pts.append(p)
		add_curved_horn(st, bow_pts, 0.35, 0.06)

	st.generate_normals()
	var ribs_inst = MeshInstance3D.new()
	ribs_inst.mesh = st.commit()
	ribs_inst.material_override = mat_bone_gold
	ribs_node.add_child(ribs_inst)
	ribs_inst.create_trimesh_collision()

func build_spine_vertebrae() -> void:
	# Columna vertebral articulada a lo largo del arrecife suroeste
	var spine_node = Node3D.new()
	spine_node.name = "VertebraeSpine"
	add_child(spine_node)

	var st = SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	st.set_material(mat_bone_gold)

	var vx = -26.0
	while vx > -38.0:
		var vert_pos = Vector3(vx, -2.0 + sin(vx * 0.35) * 0.8, 13.0 + cos(vx * 0.28) * 1.8)
		add_vertebra(st, vert_pos, 1.8)
		vx -= 2.2

	st.generate_normals()
	var spine_inst = MeshInstance3D.new()
	spine_inst.mesh = st.commit()
	spine_inst.material_override = mat_bone_gold
	spine_node.add_child(spine_inst)
	spine_inst.create_trimesh_collision()

func add_curved_horn(st: SurfaceTool, points: Array, r_base: float, r_tip: float) -> void:
	var num_pts = points.size()
	for i in range(num_pts - 1):
		var p0 = points[i]
		var p1 = points[i + 1]
		var t0 = float(i) / (num_pts - 1)
		var t1 = float(i + 1) / (num_pts - 1)
		var r0 = lerp(r_base, r_tip, t0)
		var r1 = lerp(r_base, r_tip, t1)

		var dir = (p1 - p0).normalized()
		var side = dir.cross(Vector3.UP).normalized()
		if side.length_squared() < 0.01:
			side = Vector3.RIGHT
		var up = side.cross(dir).normalized()

		var segments = 10
		for s in range(segments):
			var a0 = float(s) / segments * TAU
			var a1 = float(s + 1) / segments * TAU

			var c0_0 = p0 + (side * cos(a0) + up * sin(a0)) * r0
			var c0_1 = p0 + (side * cos(a1) + up * sin(a1)) * r0
			var c1_0 = p1 + (side * cos(a0) + up * sin(a0)) * r1
			var c1_1 = p1 + (side * cos(a1) + up * sin(a1)) * r1

			st.add_vertex(c0_0)
			st.add_vertex(c0_1)
			st.add_vertex(c1_1)

			st.add_vertex(c0_0)
			st.add_vertex(c1_1)
			st.add_vertex(c1_0)

func add_horn_spike(st: SurfaceTool, base: Vector3, tip: Vector3, r_base: float, r_tip: float) -> void:
	add_curved_horn(st, [base, tip], r_base, r_tip)

func add_vertebra(st: SurfaceTool, pos: Vector3, size: float) -> void:
	# Cuerpo vertebral con proceso espinoso dorsal masivo
	var r = size * 0.5
	var p_top = pos + Vector3(0, size * 1.2, 0)
	var p_left = pos + Vector3(0, 0, -r)
	var p_right = pos + Vector3(0, 0, r)
	var p_front = pos + Vector3(r * 0.8, 0, 0)
	var p_back = pos + Vector3(-r * 0.8, 0, 0)

	st.add_vertex(pos); st.add_vertex(p_front); st.add_vertex(p_top)
	st.add_vertex(pos); st.add_vertex(p_top); st.add_vertex(p_back)
	st.add_vertex(pos); st.add_vertex(p_left); st.add_vertex(p_top)
	st.add_vertex(pos); st.add_vertex(p_top); st.add_vertex(p_right)
