class_name RiggingBuilder
extends Node3D

const WreckStructure = preload("res://scripts/wreck_structure.gd")
const PbrMaterialKit = preload("res://scripts/pbr_material_kit.gd")
const ShipGeometry = preload("res://scripts/ship_geometry.gd")

# Sistema de Arboladura, Jarcia Náutica y Velamen Dinámico Triple-A (Fase AAA-2)
# Mástil mayor de 23m, cofa (+15m), crucetas, vergas, obenques y velas rasgadas

var mat_mast: StandardMaterial3D
var mat_rope: StandardMaterial3D
var mat_harpy_nest: StandardMaterial3D
var mat_sail_cloth: ShaderMaterial

func _ready() -> void:
	setup_materials()
	build_main_mast_and_crow()
	# The sole broken foremast and its collisions belong to DeckDressing C2.
	build_hanging_tattered_sails()

func setup_materials() -> void:
	mat_mast = PbrMaterialKit.create_wood_planks_pbr("#5a4c3e", 0.25)

	mat_rope = StandardMaterial3D.new()
	mat_rope.albedo_color = Color("#3e3427")
	mat_rope.roughness = 0.92
	mat_rope.cull_mode = BaseMaterial3D.CULL_DISABLED

	mat_harpy_nest = PbrMaterialKit.create_wood_planks_pbr("#4a3b2c", 0.4)

	# Shader de viento dinámico para el velamen roto
	var shader = preload("res://shaders/cloth_sail.gdshader")
	mat_sail_cloth = ShaderMaterial.new()
	mat_sail_cloth.shader = shader
	mat_sail_cloth.set_shader_parameter("albedo_color", Color(0.48, 0.44, 0.37, 1.0))
	mat_sail_cloth.set_shader_parameter("dirt_color", Color(0.22, 0.18, 0.13, 1.0))
	mat_sail_cloth.set_shader_parameter("wind_speed", 2.1)
	mat_sail_cloth.set_shader_parameter("wind_amplitude", 0.18)
	mat_sail_cloth.set_shader_parameter("tear_flutter", 0.35)

func build_main_mast_and_crow() -> void:
	var mast_node = Node3D.new()
	mast_node.name = "MainMastRigging"
	add_child(mast_node)

	# 1. Columna del mástil mayor de pino (de y=-6.5 a y=+16.5m, inclinado 1.5° hacia babor)
	var mast_mesh = CylinderMesh.new()
	mast_mesh.top_radius = 0.36
	mast_mesh.bottom_radius = 0.62
	mast_mesh.height = 23.0
	mast_mesh.radial_segments = 12

	var mast_inst = MeshInstance3D.new()
	mast_inst.name = "MainMastSpar"
	mast_inst.mesh = mast_mesh
	mast_inst.material_override = mat_mast
	mast_inst.position = Vector3(0.35, 5.0, -0.48)
	mast_inst.rotation_degrees = Vector3(1.5, 0, -1.2) # Inclinación física de escora
	mast_node.add_child(mast_inst)
	mast_inst.create_trimesh_collision()

	# 2. Verga mayor transversal a y = 11.5m
	var yard_mesh = CylinderMesh.new()
	yard_mesh.top_radius = 0.14
	yard_mesh.bottom_radius = 0.22
	yard_mesh.height = 14.5
	yard_mesh.radial_segments = 10

	var yard_inst = MeshInstance3D.new()
	yard_inst.name = "MainYard"
	yard_inst.mesh = yard_mesh
	yard_inst.material_override = mat_mast
	yard_inst.position = Vector3(0.35, 11.5, -0.48)
	yard_inst.rotation_degrees = Vector3(90, 0, 0)
	mast_node.add_child(yard_inst)

	# Verga superior (gavia) a y = 14.2m
	var top_yard_mesh = CylinderMesh.new()
	top_yard_mesh.top_radius = 0.10
	top_yard_mesh.bottom_radius = 0.16
	top_yard_mesh.height = 9.5
	top_yard_mesh.radial_segments = 8

	var top_yard = MeshInstance3D.new()
	top_yard.name = "TopYard"
	top_yard.mesh = top_yard_mesh
	top_yard.material_override = mat_mast
	top_yard.position = Vector3(0.35, 14.2, -0.48)
	top_yard.rotation_degrees = Vector3(90, 0, 0)
	mast_node.add_child(top_yard)

	# 3. La Cofa del Vigía (+15 m) con barandilla de tablones y nido de harpías
	build_crows_nest(mast_node, Vector3(0.35, WreckStructure.CROW_HEIGHT, -0.48))

	# 4. Escalas de cuerda (flechastes) laterales de subida P10
	build_shrouds_and_ratlines(mast_node)

func build_crows_nest(parent: Node3D, pos: Vector3) -> void:
	var crow_node = Node3D.new()
	crow_node.name = "CrowsNest_P10"
	crow_node.position = pos
	parent.add_child(crow_node)

	var radius = 2.86
	var segments = 16

	# Suelo circular de tablas de madera
	var st = SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	st.set_material(mat_mast)

	for i in range(segments):
		var a0 = float(i) / segments * TAU
		var a1 = float(i + 1) / segments * TAU
		var p0 = Vector3(0, 0, 0)
		var p1 = Vector3(cos(a0) * radius, 0, sin(a0) * radius)
		var p2 = Vector3(cos(a1) * radius, 0, sin(a1) * radius)
		st.add_vertex(p0); st.add_vertex(p1); st.add_vertex(p2)

	st.generate_normals()
	var floor_inst = MeshInstance3D.new()
	floor_inst.name = "CrowsNestFloor"
	floor_inst.mesh = st.commit()
	crow_node.add_child(floor_inst)
	floor_inst.create_trimesh_collision()
	ShipGeometry.slab_shell(floor_inst, mat_mast, 0.18)

	# Cesta perimetral de tablones y barandilla (no un donut liso)
	var rail_st = SurfaceTool.new()
	rail_st.begin(Mesh.PRIMITIVE_TRIANGLES)
	rail_st.set_material(mat_mast)

	var rim_h = 0.95
	for i in range(segments):
		var a0 = float(i) / segments * TAU
		var a1 = float(i + 1) / segments * TAU
		var b0 = Vector3(cos(a0) * radius, 0, sin(a0) * radius)
		var b1 = Vector3(cos(a1) * radius, 0, sin(a1) * radius)
		var t0 = Vector3(cos(a0) * radius, rim_h, sin(a0) * radius)
		var t1 = Vector3(cos(a1) * radius, rim_h, sin(a1) * radius)

		# Tablón exterior de la cesta
		rail_st.add_vertex(b0); rail_st.add_vertex(t0); rail_st.add_vertex(t1)
		rail_st.add_vertex(b0); rail_st.add_vertex(t1); rail_st.add_vertex(b1)

	rail_st.generate_normals()
	var rail_inst = MeshInstance3D.new()
	rail_inst.mesh = rail_st.commit()
	crow_node.add_child(rail_inst)

	# Nido de harpías interior (ramas cruzadas, huesos y telas)
	var nest_st = SurfaceTool.new()
	nest_st.begin(Mesh.PRIMITIVE_TRIANGLES)
	nest_st.set_material(mat_harpy_nest)

	for b_idx in range(12):
		var a = float(b_idx) / 12 * TAU
		var r_in = 0.7 + fmod(b_idx * 0.3, 0.4)
		var r_out = 2.2 + fmod(b_idx * 0.5, 0.5)
		var p_start = Vector3(cos(a) * r_in, 0.08, sin(a) * r_in)
		var p_end = Vector3(cos(a + 0.8) * r_out, 0.35, sin(a + 0.8) * r_out)
		var p_w = Vector3(-sin(a) * 0.12, 0, cos(a) * 0.12)

		nest_st.add_vertex(p_start - p_w); nest_st.add_vertex(p_end - p_w); nest_st.add_vertex(p_end + p_w)
		nest_st.add_vertex(p_start - p_w); nest_st.add_vertex(p_end + p_w); nest_st.add_vertex(p_start + p_w)

	nest_st.generate_normals()
	var nest_mesh_inst = MeshInstance3D.new()
	nest_mesh_inst.mesh = nest_st.commit()
	crow_node.add_child(nest_mesh_inst)

func build_shrouds_and_ratlines(parent: Node3D) -> void:
	# Obenques principales con grosor real visibles desde cámara táctica
	for side in [-1.0, 1.0]:
		var deck_z = side * (WreckStructure.get_beam_at(-0.5) + 0.36)
		var num_ropes = 4
		for i in range(num_ropes):
			var deck_x = lerp(-2.0, 1.0, float(i) / (num_ropes - 1))
			var p_deck = WreckStructure.get_world_pos(deck_x, 0.85, deck_z)
			var p_top = Vector3(0.35, 14.8, side * 0.9)

			var dir = p_top - p_deck
			var rope_cyl = CylinderMesh.new()
			rope_cyl.top_radius = 0.035
			rope_cyl.bottom_radius = 0.045
			rope_cyl.height = dir.length()
			rope_cyl.radial_segments = 6

			var rope_inst = MeshInstance3D.new()
			rope_inst.mesh = rope_cyl
			rope_inst.material_override = mat_rope
			parent.add_child(rope_inst)
			rope_inst.position = (p_deck + p_top) * 0.5
			rope_inst.look_at(p_top, Vector3.UP)
			rope_inst.rotate_object_local(Vector3.RIGHT, deg_to_rad(90))

		# Flechastes (peldaños de escala)
		for r in range(14):
			var t = float(r + 1) / 16.0
			var y = lerp(0.85 + WreckStructure.get_list_height(deck_z), 14.8, t)
			var z = lerp(deck_z, side * 0.9, t)
			var x0 = lerp(-2.0, 0.35, t)
			var x1 = lerp(1.0, 0.35, t)

			var rung = CylinderMesh.new()
			rung.top_radius = 0.02
			rung.bottom_radius = 0.02
			rung.height = abs(x1 - x0)
			rung.radial_segments = 4

			var rung_inst = MeshInstance3D.new()
			rung_inst.mesh = rung
			rung_inst.material_override = mat_rope
			rung_inst.position = Vector3((x0 + x1) * 0.5, y, z)
			rung_inst.rotation_degrees = Vector3(0, 0, 90)
			parent.add_child(rung_inst)

func build_fallen_foremast() -> void:
	# Mástil trinquete partido en proa que descansa sobre el arrecife
	var fore_node = Node3D.new()
	fore_node.name = "FallenForemast"
	add_child(fore_node)

	var stump = MeshInstance3D.new()
	var cyl = CylinderMesh.new()
	cyl.top_radius = 0.42
	cyl.bottom_radius = 0.55
	cyl.height = 3.8
	cyl.radial_segments = 10
	stump.mesh = cyl
	stump.material_override = mat_mast
	stump.position = Vector3(18.5, 4.8, 0.0)
	fore_node.add_child(stump)
	stump.create_trimesh_collision()

	var fallen = MeshInstance3D.new()
	var f_cyl = CylinderMesh.new()
	f_cyl.top_radius = 0.28
	f_cyl.bottom_radius = 0.42
	f_cyl.height = 14.0
	f_cyl.radial_segments = 10
	fallen.mesh = f_cyl
	fallen.material_override = mat_mast
	fallen.position = Vector3(23.5, 2.2, -4.5)
	fallen.rotation_degrees = Vector3(28, -35, 45) # Caído sobre el arrecife
	fore_node.add_child(fallen)
	fallen.create_trimesh_collision()

func build_hanging_tattered_sails() -> void:
	# Velamen roto y rasgado colgando de la verga mayor
	var sails_node = Node3D.new()
	sails_node.name = "TatteredSails"
	add_child(sails_node)

	var sail_patches = [
		{"pos": Vector3(0.35, 9.8, -4.5), "size": Vector2(4.5, 3.2), "rot": Vector3(0, 0, -5)},
		{"pos": Vector3(0.35, 9.5, 3.8), "size": Vector2(4.8, 3.6), "rot": Vector3(0, 0, 8)},
		{"pos": Vector3(0.35, 12.8, -2.0), "size": Vector2(3.2, 2.4), "rot": Vector3(0, 0, -3)}
	]

	for s in sail_patches:
		var sail_mesh = PlaneMesh.new()
		sail_mesh.size = s["size"]
		sail_mesh.subdivide_width = 16
		sail_mesh.subdivide_depth = 16

		var sail_inst = MeshInstance3D.new()
		sail_inst.mesh = sail_mesh
		sail_inst.material_override = mat_sail_cloth
		sail_inst.position = s["pos"]
		sail_inst.name = "SailPatch_%d" % sails_node.get_child_count()
		sail_inst.rotation_degrees = Vector3(90, 90, 0)
		sails_node.add_child(sail_inst)
