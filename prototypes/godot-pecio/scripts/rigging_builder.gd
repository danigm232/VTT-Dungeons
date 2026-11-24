class_name RiggingBuilder
extends Node3D

const WreckStructure = preload("res://scripts/wreck_structure.gd")
const PbrMaterialKit = preload("res://scripts/pbr_material_kit.gd")
const ShipGeometry = preload("res://scripts/ship_geometry.gd")

# Sistema de Arboladura, Jarcia Náutica y Velamen Dinámico Triple-A (Fase AAA-2)
# Mástil mayor de 23m, cofa (+15m), crucetas, vergas, obenques y velas rasgadas

var mat_mast: StandardMaterial3D
var mat_cofa_deck: Material
var mat_cofa_trim: StandardMaterial3D
var mat_cofa_iron: StandardMaterial3D
var mat_rope: StandardMaterial3D
var mat_harpy_nest: StandardMaterial3D
var mat_sail_cloth: ShaderMaterial

var _prebuilt: bool = false

func _ready() -> void:
	prebuild()

func prebuild() -> void:
	if _prebuilt:
		return
	_prebuilt = true
	setup_materials()
	build_main_mast_and_crow()
	# The sole broken foremast and its collisions belong to DeckDressing C2.
	build_hanging_tattered_sails()

func setup_materials() -> void:
	mat_mast = PbrMaterialKit.create_wet_wreck_wood_pbr("#444f43", 0.28, 0.70, 0.28)
	mat_cofa_deck = PbrMaterialKit.create_wreck_plank_shader_material(0.30, 0.45, 0.30, 2.86)
	mat_cofa_trim = PbrMaterialKit.create_oak_furniture_pbr("#594735", 0.38)
	mat_cofa_trim.roughness = 0.76
	mat_cofa_iron = PbrMaterialKit.create_iron_pbr("#2b2e2f", 0.56, 0.78)

	mat_rope = PbrMaterialKit.create_rope_cable_pbr("#66563d")

	mat_harpy_nest = PbrMaterialKit.create_wet_wreck_wood_pbr("#3a3224", 0.42, 0.85, 0.16)

	# Shader de viento dinámico para el velamen roto (lona envejecida por salitre y sol)
	var shader = preload("res://shaders/cloth_sail.gdshader")
	mat_sail_cloth = ShaderMaterial.new()
	mat_sail_cloth.shader = shader
	mat_sail_cloth.set_shader_parameter("albedo_color", Color(0.66, 0.61, 0.50, 1.0))
	mat_sail_cloth.set_shader_parameter("dirt_color", Color(0.24, 0.23, 0.17, 1.0))
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

	# Amantillos (yardarm lifts) desde el tope del palo mayor hasta los penoles de ambas vergas
	var lift_st := ShipGeometry.begin(mat_rope)
	var mast_cap := Vector3(0.35, 16.05, -0.48)
	for side_l in [-1.0, 1.0]:
		ShipGeometry.tube(lift_st, [mast_cap, Vector3(0.35, 11.55, -0.48 + side_l * 6.8)], 0.024, 5)
		ShipGeometry.tube(lift_st, [Vector3(0.35, 15.85, -0.48), Vector3(0.35, 14.24, -0.48 + side_l * 4.4)], 0.020, 5)
	ShipGeometry.commit(mast_node, "YardarmLifts", lift_st)

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
	var segments = 24

	# Plataforma de tablas claras de la cofa con UVs reales para resaltar veta y junta
	var st = SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	st.set_material(mat_cofa_deck)

	for i in range(segments):
		var a0 = float(i) / segments * TAU
		var a1 = float(i + 1) / segments * TAU
		var p0 = Vector3(0, 0, 0)
		var p1 = Vector3(cos(a0) * radius, 0, sin(a0) * radius)
		var p2 = Vector3(cos(a1) * radius, 0, sin(a1) * radius)
		st.set_uv(Vector2(0.0, 0.0)); st.add_vertex(p0)
		st.set_uv(Vector2(p1.x / 1.5, p1.z / 1.5)); st.add_vertex(p1)
		st.set_uv(Vector2(p2.x / 1.5, p2.z / 1.5)); st.add_vertex(p2)

	st.generate_normals()
	st.generate_tangents()
	var floor_inst = MeshInstance3D.new()
	floor_inst.name = "CrowsNestFloor"
	floor_inst.mesh = st.commit()
	crow_node.add_child(floor_inst)
	floor_inst.create_trimesh_collision()
	ShipGeometry.slab_shell(floor_inst, mat_cofa_trim, 0.18)

	# Brazola perimetral envejecida + candeleros de roble irregulares (deja la entrada i=2,3 libre sin atravesar)
	var coam_st := ShipGeometry.begin(mat_cofa_trim)
	var iron_st := ShipGeometry.begin(mat_cofa_iron)
	var futtock_st := ShipGeometry.begin(mat_rope)
	var basket_segs := 16
	var coaming_h := 0.34
	var rail_col_body := StaticBody3D.new()
	rail_col_body.name = "CrowsNestGuardrailCol"
	crow_node.add_child(rail_col_body)

	for i in range(basket_segs):
		var a0 := float(i) / basket_segs * TAU
		var a1 := float(i + 1) / basket_segs * TAU
		var is_climb_gap := (i == 2 or i == 3)
		var warp0 := sin(float(i) * 2.3) * 0.035
		var warp1 := sin(float((i + 1) % basket_segs) * 2.3) * 0.035
		var b0 := Vector3(cos(a0) * (radius + warp0), 0.0, sin(a0) * (radius + warp0))
		var b1 := Vector3(cos(a1) * (radius + warp1), 0.0, sin(a1) * (radius + warp1))
		if not is_climb_gap:
			ShipGeometry.beam(coam_st, b0 + Vector3(0, coaming_h * 0.5, 0), b1 + Vector3(0, coaming_h * 0.5, 0), 0.11, coaming_h)
			ShipGeometry.beam(iron_st, b0 + Vector3(0, coaming_h + 0.02, 0), b1 + Vector3(0, coaming_h + 0.02, 0), 0.125, 0.05)
			# Tramo intermedio desgastado en madera antigua bajo la barandilla superior
			ShipGeometry.beam(coam_st, b0 + Vector3(0, 0.64, 0), b1 + Vector3(0, 0.64, 0), 0.065, 0.055)
			# Colisión perimetral por tramo que deja abierto el hueco de la escala de cuerda
			var mid_seg := (b0 + b1) * 0.5
			var seg_len := b0.distance_to(b1)
			var cs := CollisionShape3D.new()
			var rbox := BoxShape3D.new()
			rbox.size = Vector3(seg_len + 0.06, 1.05, 0.22)
			cs.shape = rbox
			cs.position = Vector3(mid_seg.x, 0.52, mid_seg.z)
			cs.rotation.y = -atan2(b1.z - b0.z, b1.x - b0.x)
			rail_col_body.add_child(cs)
		if i != 3:
			var post_tilt := Vector3(sin(float(i) * 1.9) * 0.04, 0.0, cos(float(i) * 2.7) * 0.04)
			var post_b := Vector3(cos(a0) * (radius - 0.02), 0.0, sin(a0) * (radius - 0.02))
			ShipGeometry.beam(coam_st, post_b, post_b + post_tilt + Vector3(0, 0.96, 0), 0.105, 0.105)
			# Amarres de cuerda en postes seleccionados (estilo náutico antiguo)
			if i == 2 or i == 4 or i % 3 == 0:
				var wrap_y := 0.84
				var pw := post_b + post_tilt * 0.85 + Vector3(0, wrap_y, 0)
				ShipGeometry.tube(futtock_st, [
					pw + Vector3(0.075, -0.04, 0.0), pw + Vector3(0.0, -0.02, 0.075),
					pw + Vector3(-0.075, 0.0, 0.0), pw + Vector3(0.0, 0.02, -0.075),
					pw + Vector3(0.075, 0.04, 0.0)
				], 0.022, 5)
		if i % 2 == 0:
			var f_top := Vector3(cos(a0) * 2.52, -0.10, sin(a0) * 2.52)
			var f_bot := Vector3(cos(a0) * 0.46, -2.15, sin(a0) * 0.46)
			ShipGeometry.tube(futtock_st, [f_bot, f_top], 0.032, 6)

	# Crucetas y curvas estructurales inferiores bajo la cofa + cuerdas tensadas al mástil
	for cz in [-0.46, 0.46]:
		ShipGeometry.beam(coam_st, Vector3(-1.35, -0.26, cz), Vector3(1.35, -0.26, cz), 0.16, 0.18)
	for cx in [-0.62, 0.62]:
		ShipGeometry.beam(coam_st, Vector3(cx, -0.34, -1.75), Vector3(cx, -0.34, 1.75), 0.14, 0.16)
	for brace_idx in range(4):
		var ba := float(brace_idx) * PI * 0.5 + 0.38
		ShipGeometry.beam(coam_st, Vector3(cos(ba) * 0.44, -1.45, sin(ba) * 0.44), Vector3(cos(ba) * 2.15, -0.24, sin(ba) * 2.15), 0.13, 0.14)
	# Trincas pesadas de cuerda abrazando la garganta inferior del palo bajo las crucetas
	for col_y in [-0.45, -1.42]:
		var throat_ring: Array[Vector3] = []
		var r_c := 0.45 if col_y > -1.0 else 0.47
		for k in range(18):
			var ka := float(k) / 14.0 * TAU * 2.2
			throat_ring.append(Vector3(cos(ka) * r_c, col_y + float(k) * 0.015, sin(ka) * r_c))
		ShipGeometry.tube(futtock_st, throat_ring, 0.034, 6)

	ShipGeometry.commit(crow_node, "CrowsNestBulwark", coam_st)
	ShipGeometry.commit(crow_node, "CrowsNestIronBands", iron_st)
	ShipGeometry.commit(crow_node, "CrowsNestFuttockShrouds", futtock_st)

	# Encuentro estructural mástil-plataforma (taco/fogonadura octogonal, zunchos ajustados y amarres reales; sin aros flotantes)
	var collar := MeshInstance3D.new()
	collar.name = "MastFloorCollar"
	var col_cyl := CylinderMesh.new()
	col_cyl.top_radius = 0.45
	col_cyl.bottom_radius = 0.56
	col_cyl.height = 0.42
	col_cyl.radial_segments = 8
	collar.mesh = col_cyl
	collar.material_override = mat_cofa_trim
	collar.position = Vector3(0.0, 0.16, 0.0)
	crow_node.add_child(collar)

	var center_rope_st := ShipGeometry.begin(mat_rope)
	for band_y in [0.36, 0.88]:
		var b_pts: Array[Vector3] = []
		var br := 0.43 if band_y < 0.6 else 0.39
		for k in range(20):
			var ka := float(k) / 15.0 * TAU * 2.0
			b_pts.append(Vector3(cos(ka) * br, band_y + float(k) * 0.012, sin(ka) * br))
		ShipGeometry.tube(center_rope_st, b_pts, 0.028, 6)
	ShipGeometry.commit(crow_node, "MastBaseLashing", center_rope_st)
	PbrMaterialKit.add_contact_ao_disc(crow_node, Vector3(0.0, 0.014, 0.0), 0.78, 0.78, 0.68, 0.0)

	# Banda de hierro ceñida al penol del palo y ménsula angular de roble para el farol de vigía
	var mast_band := MeshInstance3D.new()
	var mb_cyl := CylinderMesh.new()
	mb_cyl.top_radius = 0.385; mb_cyl.bottom_radius = 0.395; mb_cyl.height = 0.10; mb_cyl.radial_segments = 12
	mast_band.mesh = mb_cyl
	mast_band.material_override = mat_cofa_iron
	mast_band.position = Vector3(0.0, 1.38, 0.0)
	crow_node.add_child(mast_band)

	var arm_st := ShipGeometry.begin(mat_cofa_trim)
	ShipGeometry.beam(arm_st, Vector3(0.28, 1.38, 0.0), Vector3(0.78, 1.38, 0.0), 0.085, 0.085)
	ShipGeometry.beam(arm_st, Vector3(0.30, 1.02, 0.0), Vector3(0.68, 1.36, 0.0), 0.070, 0.070)
	ShipGeometry.commit(crow_node, "LanternCraneArm", arm_st)

	# Remate irregular y astillado del penol del palo mayor (cubre completamente la tapa plana del cilindro desde arriba)
	var mat_cap_end := PbrMaterialKit.create_wood_shaving_pbr("#6d5d43")
	var cap_splinter_st := ShipGeometry.begin(mat_cap_end)
	var cap_specs := [
		[0.15, 0.33, 1.66, 0.17, 0.13], [0.85, 0.31, 1.58, 0.16, 0.12], [1.65, 0.34, 1.72, 0.17, 0.13],
		[2.35, 0.30, 1.60, 0.15, 0.12], [3.10, 0.33, 1.64, 0.16, 0.12], [3.95, 0.32, 1.69, 0.17, 0.13],
		[4.75, 0.31, 1.57, 0.15, 0.12], [5.50, 0.33, 1.65, 0.16, 0.12],
		[0.50, 0.14, 1.62, 0.22, 0.18], [2.60, 0.13, 1.59, 0.22, 0.18], [4.40, 0.12, 1.61, 0.21, 0.17],
		[1.25, 0.22, 1.54, 0.20, 0.16], [3.55, 0.21, 1.55, 0.20, 0.16], [5.10, 0.22, 1.54, 0.20, 0.16],
	]
	for cs in cap_specs:
		var sa: float = cs[0]
		var rad: float = cs[1]
		var top_y: float = cs[2]
		var w: float = cs[3]
		var d: float = cs[4]
		ShipGeometry.beam(cap_splinter_st, Vector3(cos(sa) * rad, 1.40, sin(sa) * rad), Vector3(cos(sa) * (rad * 0.56), top_y, sin(sa) * (rad * 0.56)), w, d, 0.48)
	ShipGeometry.commit(crow_node, "MastHeadSplitCap", cap_splinter_st)

	# Algas, salitre y percebes sutiles SOLO en puntos húmedos expuestos exteriores y garganta inferior (sin cubrir el nido seco)
	PbrMaterialKit.add_barnacle_cluster(crow_node, Vector3(-2.82, -0.10, -0.35), Vector3(-1.0, -0.15, 0.0), 6, 0.040, 501)
	PbrMaterialKit.add_barnacle_cluster(crow_node, Vector3(0.45, -0.12, 2.80), Vector3(0.0, -0.15, 1.0), 6, 0.038, 502)
	PbrMaterialKit.add_barnacle_cluster(crow_node, Vector3(-0.36, -0.68, -0.22), Vector3(-0.8, 0.0, -0.5), 5, 0.036, 503)
	PbrMaterialKit.add_kelp_strand(crow_node, Vector3(-2.82, 0.22, 0.65), Vector3(-0.18, -1.0, 0.05), 0.56, 0.085, 511)
	PbrMaterialKit.add_kelp_strand(crow_node, Vector3(1.85, 0.25, -2.18), Vector3(0.10, -1.0, -0.15), 0.52, 0.080, 512)
	PbrMaterialKit.add_kelp_strand(crow_node, Vector3(-0.42, -0.36, 0.42), Vector3(-0.08, -1.0, 0.12), 0.48, 0.075, 513)

	# Pescante de hierro en la cabeza del palo con farol de vigía cálido + relleno celeste suave
	var lantern_arm := MeshInstance3D.new()
	var la_box := BoxMesh.new()
	la_box.size = Vector3(0.18, 0.05, 0.06)
	lantern_arm.mesh = la_box
	lantern_arm.material_override = mat_cofa_iron
	lantern_arm.position = Vector3(0.74, 1.38, 0.0)
	crow_node.add_child(lantern_arm)

	var lan_glass := MeshInstance3D.new()
	var lg_cyl := CylinderMesh.new()
	lg_cyl.top_radius = 0.09; lg_cyl.bottom_radius = 0.07; lg_cyl.height = 0.22
	lan_glass.mesh = lg_cyl
	var mat_lan := StandardMaterial3D.new()
	mat_lan.albedo_color = Color("#ffd592")
	mat_lan.emission_enabled = true
	mat_lan.emission = Color("#ffaa3c")
	mat_lan.emission_energy_multiplier = 2.4
	lan_glass.material_override = mat_lan
	lan_glass.position = Vector3(0.76, 1.20, 0.0)
	crow_node.add_child(lan_glass)

	var lan_cap := MeshInstance3D.new()
	var lc_cyl := CylinderMesh.new()
	lc_cyl.top_radius = 0.03; lc_cyl.bottom_radius = 0.13; lc_cyl.height = 0.10
	lan_cap.mesh = lc_cyl
	lan_cap.material_override = mat_cofa_iron
	lan_cap.position = Vector3(0.76, 1.34, 0.0)
	crow_node.add_child(lan_cap)

	var cofa_warm := OmniLight3D.new()
	cofa_warm.name = "Cofa_LookoutLanternLight"
	cofa_warm.position = Vector3(0.76, 1.15, 0.0)
	cofa_warm.light_color = Color("#ffe0ad")
	cofa_warm.light_energy = 0.78
	cofa_warm.omni_range = 6.2
	cofa_warm.shadow_enabled = false
	crow_node.add_child(cofa_warm)

	var cofa_sky := OmniLight3D.new()
	cofa_sky.name = "Cofa_SkyFill"
	cofa_sky.position = Vector3(-0.35, 2.35, 0.55)
	cofa_sky.light_color = Color("#c8deec")
	cofa_sky.light_energy = 0.85
	cofa_sky.omni_range = 8.5
	cofa_sky.shadow_enabled = false
	crow_node.add_child(cofa_sky)

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
			rope_inst.look_at_from_position((p_deck + p_top) * 0.5, p_top, Vector3.UP)
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

	# Escala de cuerda colgante de 15 m desde cubierta C1 directamente hasta la muesca exterior de entrada P10
	var ladder_rope_st := ShipGeometry.begin(mat_rope)
	var ladder_rung_st := ShipGeometry.begin(mat_cofa_trim)
	var notch_ang := 3.0 / 16.0 * TAU # Centro entre i=2 y i=3 (67.5°)
	var notch_x := 0.35 + cos(notch_ang) * 2.84
	var notch_z := -0.48 + sin(notch_ang) * 2.84
	var bot_center := WreckStructure.get_world_pos(1.12, 0.06, 0.65)
	var top_center := Vector3(notch_x, WreckStructure.CROW_HEIGHT + 0.04, notch_z)
	var rung_dir := Vector3(-sin(notch_ang), 0.0, cos(notch_ang)).normalized() * 0.34
	var l_segs := 34
	for side_sgn: float in [-1.0, 1.0]:
		var s_path: Array[Vector3] = []
		for k in range(l_segs + 1):
			var t := float(k) / float(l_segs)
			var p := bot_center.lerp(top_center, t) + rung_dir * side_sgn
			p.z += sin(t * PI) * 0.14
			p.x += sin(t * PI) * 0.08
			s_path.append(p)
		ShipGeometry.tube(ladder_rope_st, s_path, 0.030, 6)
	for k in range(1, l_segs):
		var t := float(k) / float(l_segs)
		var pc := bot_center.lerp(top_center, t)
		pc.z += sin(t * PI) * 0.14
		pc.x += sin(t * PI) * 0.08
		ShipGeometry.beam(ladder_rung_st, pc - rung_dir * 1.12, pc + rung_dir * 1.12, 0.046, 0.042)
	ShipGeometry.commit(parent, "CrowsNestRopeLadder_Ropes", ladder_rope_st)
	ShipGeometry.commit(parent, "CrowsNestRopeLadder_Rungs", ladder_rung_st)

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
