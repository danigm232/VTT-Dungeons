class_name HullBuilder
extends Node3D

const WreckStructure = preload("res://scripts/wreck_structure.gd")
const PbrMaterialKit = preload("res://scripts/pbr_material_kit.gd")
const ShipGeometry = preload("res://scripts/ship_geometry.gd")

# Generador del Casco Naval Matemático del Pecio Rosa de los Vientos
# Cumple Fase 1: Eslora 61.5m, 12 estaciones de manga, escora física 0.86°,
# cubiertas C1, C2, C3 y brecha de popa.

var mat_hull: Material
var mat_frame: StandardMaterial3D
var mat_deck: StandardMaterial3D
var mat_deck_c2: StandardMaterial3D
var mat_deck_c3: Material
var mat_oak_trim: StandardMaterial3D
var mat_iron: StandardMaterial3D
var mat_glass: StandardMaterial3D
var mat_waterlogged: StandardMaterial3D
var mat_barnacle: StandardMaterial3D
var mat_kelp: StandardMaterial3D

var _prebuilt: bool = false

func _ready() -> void:
	prebuild()

func prebuild() -> void:
	if _prebuilt:
		return
	_prebuilt = true
	setup_materials()
	build_hull()
	build_frames()
	build_c1_deck()
	build_c2_deck()
	build_c3_deck()
	build_upper_bulwarks()
	build_prow_and_bowsprit()
	build_stairs()
	build_waterline_barnacles()
	build_dripping_kelp()
	build_rust_weep_stains()

func setup_materials() -> void:
	mat_hull = PbrMaterialKit.create_hull_weathered_shader_material()
	mat_frame = PbrMaterialKit.create_wood_planks_pbr("#544938", 0.42)
	mat_deck = PbrMaterialKit.create_structural_deck_pbr()
	mat_deck.transparency = BaseMaterial3D.TRANSPARENCY_DISABLED

	mat_oak_trim = PbrMaterialKit.create_oak_furniture_pbr("#4c3c2c", 0.40)
	mat_iron = PbrMaterialKit.create_iron_pbr("#2d2c2a", 0.72, 0.42)
	mat_glass = StandardMaterial3D.new()
	mat_glass.albedo_color = Color(0.08, 0.13, 0.15, 0.78)
	mat_glass.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA_DEPTH_PRE_PASS
	mat_glass.emission_enabled = true
	mat_glass.emission = Color("#cc7626")
	mat_glass.emission_energy_multiplier = 0.24
	mat_glass.roughness = 0.08
	mat_glass.metallic = 0.18

	# Cubiertas C2 (Proa) y C3 (Popa) con soporte de recorte/fade cenital (Fase 5)
	mat_deck_c2 = mat_deck.duplicate()
	mat_deck_c2.albedo_color = mat_deck.albedo_color

	mat_deck_c3 = PbrMaterialKit.create_wreck_plank_shader_material(0.34, 0.50, 0.58, 0.0)

	# Materiales de deterioro de 50 años encallado
	mat_waterlogged = PbrMaterialKit.create_waterlogged_wood_pbr("#2c3327")
	mat_barnacle = PbrMaterialKit.create_barnacle_pbr("#c4bead")
	mat_kelp = PbrMaterialKit.create_algae_pbr("#223927")

func build_hull() -> void:
	var bands: Array[float] = [-7.10, -5.50, -4.00, -3.05, -1.50, 0.00, 0.85]
	var fullness: Array[float] = [0.18, 0.50, 0.78, 0.90, 0.97, 1.00, 1.00]
	var step_x: float = 1.5

	for side_cfg in [[-1.0, "HullStrakes"], [1.0, "HullStrakes_Front"]]:
		var side: float = side_cfg[0]
		var st = SurfaceTool.new()
		st.begin(Mesh.PRIMITIVE_TRIANGLES)
		st.set_material(mat_hull)

		for b in range(bands.size() - 1):
			var y0 = bands[b]
			var y1 = bands[b + 1]
			var f0 = fullness[b]
			var f1 = fullness[b + 1]

			var x = WreckStructure.STERN_X
			while x < WreckStructure.BOW_X:
				var next_x = min(WreckStructure.BOW_X, x + step_x)
				if x < WreckStructure.STERN_BREACH_END and next_x > WreckStructure.STERN_BREACH_END:
					next_x = WreckStructure.STERN_BREACH_END

				# Brecha canónica de popa en estribor (side == 1)
				var in_breach = (side > 0) and (x < WreckStructure.STERN_BREACH_END) and (b >= 2 and b <= 4)
				if not in_breach:
					var beam_x = WreckStructure.get_beam_at(x)
					var beam_nx = WreckStructure.get_beam_at(next_x)

					var p0 = WreckStructure.get_world_pos(x, y0, side * beam_x * f0)
					var p1 = WreckStructure.get_world_pos(next_x, y0, side * beam_nx * f0)
					var p2 = WreckStructure.get_world_pos(next_x, y1, side * beam_nx * f1)
					var p3 = WreckStructure.get_world_pos(x, y1, side * beam_x * f1)

					var uv0 = Vector2(p0.x / 4.5, p0.y / 4.5)
					var uv1 = Vector2(p1.x / 4.5, p1.y / 4.5)
					var uv2 = Vector2(p2.x / 4.5, p2.y / 4.5)
					var uv3 = Vector2(p3.x / 4.5, p3.y / 4.5)

					if side > 0:
						st.set_uv(uv0); st.add_vertex(p0)
						st.set_uv(uv1); st.add_vertex(p1)
						st.set_uv(uv2); st.add_vertex(p2)
						st.set_uv(uv0); st.add_vertex(p0)
						st.set_uv(uv2); st.add_vertex(p2)
						st.set_uv(uv3); st.add_vertex(p3)
					else:
						st.set_uv(uv0); st.add_vertex(p0)
						st.set_uv(uv2); st.add_vertex(p2)
						st.set_uv(uv1); st.add_vertex(p1)
						st.set_uv(uv0); st.add_vertex(p0)
						st.set_uv(uv3); st.add_vertex(p3)
						st.set_uv(uv2); st.add_vertex(p2)

				x = next_x

		st.generate_normals()
		st.generate_tangents()
		var mesh_inst = MeshInstance3D.new()
		mesh_inst.name = side_cfg[1]
		mesh_inst.mesh = st.commit()
		add_child(mesh_inst)

	_build_lower_hull_colliders()

	# Oclusor del núcleo bajo cubierta (se desactiva en modo lower_c8/c9)
	PbrMaterialKit.add_occluder_box(self, "HullCoreOccluder", Vector3(32.0, 1.8, 7.6), Vector3(3.0, -1.7, 0.0))

	# Espejo de popa (Transom)
	build_transom()

func _build_lower_hull_colliders() -> void:
	# Colisionadores sólidos continuos para C8 y C9 que impiden atravesar el casco bajo cubierta
	var col_root := StaticBody3D.new()
	col_root.name = "HullLowerColliders"
	add_child(col_root)

	var step_x := 2.5
	for side: float in [-1.0, 1.0]:
		var x: float = WreckStructure.STERN_X
		while x < WreckStructure.BOW_X - 0.15:
			var nx: float = minf(WreckStructure.BOW_X, x + step_x)
			var mx: float = (x + nx) * 0.5
			var is_stbd_boarding_gap: bool = (side > 0.0 and mx >= 1.4 and mx <= 4.5)
			var col_h: float = 6.3 if is_stbd_boarding_gap else 6.9
			var col_center_y: float = -3.70 if is_stbd_boarding_gap else -3.4
			var p_a := WreckStructure.get_world_pos(x, col_center_y, side * WreckStructure.get_beam_at(x) * 0.88)
			var p_b := WreckStructure.get_world_pos(nx, col_center_y, side * WreckStructure.get_beam_at(nx) * 0.88)
			var seg := p_b - p_a
			var cs := CollisionShape3D.new()
			var bx := BoxShape3D.new()
			bx.size = Vector3(seg.length() + 0.25, col_h, 0.44)
			cs.shape = bx
			cs.position = (p_a + p_b) * 0.5
			cs.rotation.y = -atan2(seg.z, seg.x)
			col_root.add_child(cs)
			x += step_x

	# Tope inferior en roda de proa (+30.75) y popa (-30.75) dejando libre la brecha P16 sumergida
	var bow_low := CollisionShape3D.new()
	var bow_bx := BoxShape3D.new()
	bow_bx.size = Vector3(0.9, 6.9, 2.2)
	bow_low.shape = bow_bx
	bow_low.position = WreckStructure.get_world_pos(WreckStructure.BOW_X - 0.2, -3.4, 0.0)
	col_root.add_child(bow_low)

	for sz in [-2.7, 2.7]:
		var stern_jamb := CollisionShape3D.new()
		var sj_bx := BoxShape3D.new()
		sj_bx.size = Vector3(0.55, 6.9, 2.4)
		stern_jamb.shape = sj_bx
		stern_jamb.position = WreckStructure.get_world_pos(WreckStructure.STERN_X + 0.1, -3.4, sz)
		col_root.add_child(stern_jamb)

func build_transom() -> void:
	var st = SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	st.set_material(mat_hull)

	var x = WreckStructure.STERN_X
	var beam = WreckStructure.get_beam_at(x)
	var heights: Array[float] = [-7.1, WreckStructure.STERN_BREACH_TOP, -0.5, 3.85]

	for i in range(heights.size() - 1):
		var y0 = heights[i]
		var y1 = heights[i + 1]
		var w0 = beam * (0.35 + 0.65 * float(i) / heights.size())
		var w1 = beam * (0.35 + 0.65 * float(i + 1) / heights.size())

		# La banda sumergida inferior (y < -2.78m) deja abierta físicamente la gran brecha P16 (-1.75..+1.75)
		var strips: Array = [[-w0, w0, -w1, w1]]
		if i == 0:
			var g0 := minf(1.75, w0 * 0.75)
			var g1 := minf(1.75, w1 * 0.75)
			strips = [[-w0, -g0, -w1, -g1], [g0, w0, g1, w1]]

		for s in strips:
			var p0 = WreckStructure.get_world_pos(x, y0, s[0])
			var p1 = WreckStructure.get_world_pos(x, y0, s[1])
			var p2 = WreckStructure.get_world_pos(x, y1, s[3])
			var p3 = WreckStructure.get_world_pos(x, y1, s[2])

			var uv0 = Vector2(s[0] / 3.5, y0 / 3.5)
			var uv1 = Vector2(s[1] / 3.5, y0 / 3.5)
			var uv2 = Vector2(s[3] / 3.5, y1 / 3.5)
			var uv3 = Vector2(s[2] / 3.5, y1 / 3.5)

			st.set_uv(uv0); st.add_vertex(p0)
			st.set_uv(uv1); st.add_vertex(p1)
			st.set_uv(uv2); st.add_vertex(p2)
			st.set_uv(uv0); st.add_vertex(p0)
			st.set_uv(uv2); st.add_vertex(p2)
			st.set_uv(uv3); st.add_vertex(p3)

	st.generate_normals()
	st.generate_tangents()
	var mesh_inst = MeshInstance3D.new()
	mesh_inst.name = "Transom"
	mesh_inst.mesh = st.commit()
	add_child(mesh_inst)

	# Tablones astillados irregulares enmarcando la brecha submarina P16 (manteniendo paso libre central)
	var splinters := Node3D.new()
	splinters.name = "SternBreachSplinters"
	mesh_inst.add_child(splinters)
	for sp_cfg in [
		{"pos": Vector3(x + 0.08, -2.55, -1.62), "rot": Vector3(8, 12, -20),  "size": Vector3(0.28, 1.55, 0.24)},
		{"pos": Vector3(x + 0.06, -3.55, -1.72), "rot": Vector3(-6, 15, -12), "size": Vector3(0.24, 1.25, 0.22)},
		{"pos": Vector3(x + 0.08, -2.55, 1.62),  "rot": Vector3(-8, -10, 18), "size": Vector3(0.28, 1.55, 0.24)},
		{"pos": Vector3(x + 0.06, -3.45, 1.70),  "rot": Vector3(6, -14, 12),  "size": Vector3(0.24, 1.15, 0.22)},
		{"pos": Vector3(x + 0.08, -2.76, -0.75), "rot": Vector3(12, 8, 18),   "size": Vector3(0.28, 0.34, 1.65)},
		{"pos": Vector3(x + 0.05, -2.92, -1.18), "rot": Vector3(5, -6, 14),   "size": Vector3(0.24, 0.52, 0.42)},
		{"pos": Vector3(x + 0.08, -2.78, 0.78),  "rot": Vector3(-10, -8, 14), "size": Vector3(0.28, 0.32, 1.55)},
		{"pos": Vector3(x + 0.05, -2.96, 1.15),  "rot": Vector3(-4, 7, 16),   "size": Vector3(0.24, 0.48, 0.38)},
	]:
		var sp := MeshInstance3D.new()
		var sbx := BoxMesh.new()
		sbx.size = sp_cfg["size"]
		sp.mesh = sbx
		sp.material_override = mat_oak_trim
		sp.position = WreckStructure.get_world_pos(sp_cfg["pos"].x, sp_cfg["pos"].y, sp_cfg["pos"].z)
		sp.rotation_degrees = sp_cfg["rot"]
		splinters.add_child(sp)

	# Galería acristalada de popa + coronamiento (taffrail) sobre el espejo
	var gallery = Node3D.new()
	gallery.name = "SternGallery"
	mesh_inst.add_child(gallery)

	var taffrail = MeshInstance3D.new()
	var t_box = BoxMesh.new()
	t_box.size = Vector3(0.32, 0.28, beam * 1.92)
	taffrail.mesh = t_box
	taffrail.material_override = mat_oak_trim
	taffrail.position = WreckStructure.get_world_pos(x - 0.08, 3.85, 0.0)
	gallery.add_child(taffrail)

	var mat_win_backing = StandardMaterial3D.new()
	mat_win_backing.albedo_color = Color("#1c1109")
	mat_win_backing.emission_enabled = true
	mat_win_backing.emission = Color("#592d0c")
	mat_win_backing.emission_energy_multiplier = 0.42
	mat_win_backing.roughness = 0.92

	var mat_iron_mullion = mat_iron

	# Ventanales náuticos empotrados con contravidrio oscuro cálido, marco de roble en 4 lados y cuarterones
	for win_z in [-2.05, -0.72, 0.72, 2.05]:
		# Fondo interior oscuro con tenue brasa de camarote tras el cristal
		var backing = MeshInstance3D.new()
		var bk_box = BoxMesh.new()
		bk_box.size = Vector3(0.04, 1.06, 0.88)
		backing.mesh = bk_box
		backing.material_override = mat_win_backing
		backing.position = WreckStructure.get_world_pos(x - 0.05, 1.95, win_z)
		gallery.add_child(backing)

		# Vidrio ahumado emplomado con reflejo especular náutico
		var pane = MeshInstance3D.new()
		var p_box = BoxMesh.new()
		p_box.size = Vector3(0.04, 1.04, 0.86)
		pane.mesh = p_box
		pane.material_override = mat_glass
		pane.position = WreckStructure.get_world_pos(x - 0.09, 1.95, win_z)
		gallery.add_child(pane)

		# Dintel superior y alféizar inferior saliente en roble tallado
		var lintel = MeshInstance3D.new()
		var l_box = BoxMesh.new()
		l_box.size = Vector3(0.18, 0.11, 1.06)
		lintel.mesh = l_box
		lintel.material_override = mat_oak_trim
		lintel.position = WreckStructure.get_world_pos(x - 0.14, 2.52, win_z)
		gallery.add_child(lintel)

		var sill = MeshInstance3D.new()
		var s_box = BoxMesh.new()
		s_box.size = Vector3(0.24, 0.13, 1.12)
		sill.mesh = s_box
		sill.material_override = mat_oak_trim
		sill.position = WreckStructure.get_world_pos(x - 0.16, 1.38, win_z)
		gallery.add_child(sill)

		# Jambas laterales izquierda y derecha
		for jamb_off in [-0.47, 0.47]:
			var jamb = MeshInstance3D.new()
			var j_box = BoxMesh.new()
			j_box.size = Vector3(0.16, 1.14, 0.10)
			jamb.mesh = j_box
			jamb.material_override = mat_oak_trim
			jamb.position = WreckStructure.get_world_pos(x - 0.13, 1.95, win_z + jamb_off)
			gallery.add_child(jamb)

		# Retícula interior de cuarterones de hierro forjado (3x3)
		for gz in [-0.15, 0.15]:
			var bar_v = MeshInstance3D.new()
			var bv_box = BoxMesh.new()
			bv_box.size = Vector3(0.06, 1.02, 0.04)
			bar_v.mesh = bv_box
			bar_v.material_override = mat_iron_mullion
			bar_v.position = WreckStructure.get_world_pos(x - 0.11, 1.95, win_z + gz)
			gallery.add_child(bar_v)
		for gy in [1.74, 2.16]:
			var bar_h = MeshInstance3D.new()
			var bh_box = BoxMesh.new()
			bh_box.size = Vector3(0.06, 0.04, 0.86)
			bar_h.mesh = bh_box
			bar_h.material_override = mat_iron_mullion
			bar_h.position = WreckStructure.get_world_pos(x - 0.11, gy, win_z)
			gallery.add_child(bar_h)

	# Codaste de popa + timón sumergido con herrajes de hierro integrados en el espejo
	var stern_post := MeshInstance3D.new()
	stern_post.name = "RudderPost"
	var sp_box := BoxMesh.new()
	sp_box.size = Vector3(0.36, 5.6, 0.30)
	stern_post.mesh = sp_box
	stern_post.material_override = mat_oak_trim
	stern_post.position = WreckStructure.get_world_pos(x - 0.14, -3.55, 0.0)
	mesh_inst.add_child(stern_post)

	var rudder = Node3D.new()
	rudder.name = "RudderBlade"
	rudder.position = WreckStructure.get_world_pos(x - 0.34, -3.7, 0.0)
	rudder.rotation_degrees = Vector3(0.0, 18.0, 0.0)
	mesh_inst.add_child(rudder)

	var blade = MeshInstance3D.new()
	var b_box = BoxMesh.new()
	b_box.size = Vector3(1.18, 4.9, 0.20)
	blade.mesh = b_box
	blade.material_override = mat_oak_trim
	blade.position = Vector3(-0.42, 0.0, 0.0)
	rudder.add_child(blade)

	for py in [-1.8, -0.6, 0.6, 1.8]:
		var pintle = MeshInstance3D.new()
		var pi_box = BoxMesh.new()
		pi_box.size = Vector3(1.30, 0.14, 0.26)
		pintle.mesh = pi_box
		pintle.material_override = mat_iron
		pintle.position = Vector3(-0.32, py, 0.0)
		rudder.add_child(pintle)

func build_frames() -> void:
	# Costillas estructurales de madera cada 3.0 m (separando bajo-cubierta y amuradas superiores para recorte limpio)
	var st_lower = SurfaceTool.new()
	st_lower.begin(Mesh.PRIMITIVE_TRIANGLES)
	st_lower.set_material(mat_frame)

	var st_aft_up = SurfaceTool.new()
	st_aft_up.begin(Mesh.PRIMITIVE_TRIANGLES)
	st_aft_up.set_material(mat_frame)

	var st_fore_up = SurfaceTool.new()
	st_fore_up.begin(Mesh.PRIMITIVE_TRIANGLES)
	st_fore_up.set_material(mat_frame)

	var x = WreckStructure.STERN_X + 1.5
	while x < WreckStructure.BOW_X - 1.0:
		var beam = WreckStructure.get_beam_at(x)
		var y_bottom = -6.5
		var y_deck_top = 0.8 if (x > WreckStructure.STERN_DECK_END and x < WreckStructure.BOW_DECK_START) else 3.8

		for side in [-1.0, 1.0]:
			var p_base = WreckStructure.get_world_pos(x, y_bottom, side * 0.4)
			var p_chine = WreckStructure.get_world_pos(x, -3.5, side * beam * 0.85)
			var p_main = WreckStructure.get_world_pos(x, 0.0, side * beam * 0.98)
			add_rib_segment(st_lower, p_base, p_chine, 0.32)
			add_rib_segment(st_lower, p_chine, p_main, 0.28)

			if x <= WreckStructure.STERN_DECK_END:
				add_rib_segment(st_aft_up, p_main, WreckStructure.get_world_pos(x, y_deck_top, side * beam), 0.28)
			elif x >= WreckStructure.BOW_DECK_START:
				add_rib_segment(st_fore_up, p_main, WreckStructure.get_world_pos(x, y_deck_top, side * beam), 0.28)
			else:
				add_rib_segment(st_lower, p_main, WreckStructure.get_world_pos(x, y_deck_top, side * beam), 0.28)

		# Baos transversales bajo el entarimado (y = -0.18m para no cruzar por encima del suelo de camarotes)
		var p_left = WreckStructure.get_world_pos(x, -0.18, -beam * 0.94)
		var p_right = WreckStructure.get_world_pos(x, -0.18, beam * 0.94)
		add_rib_segment(st_lower, p_left, p_right, 0.24)
		x += 3.0

	for pair in [["Frames", st_lower], ["Frames_AftUpper", st_aft_up], ["Frames_ForeUpper", st_fore_up]]:
		var st_ref: SurfaceTool = pair[1]
		st_ref.generate_normals()
		var mesh_inst = MeshInstance3D.new()
		mesh_inst.name = pair[0]
		mesh_inst.mesh = st_ref.commit()
		add_child(mesh_inst)

func add_rib_segment(st: SurfaceTool, a: Vector3, b: Vector3, thickness: float) -> void:
	ShipGeometry.beam(st, a, b, thickness)

func build_c1_deck() -> void:
	var st = SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	st.set_material(mat_deck)

	var x = WreckStructure.STERN_DECK_END
	var step_x: float = 1.5
	while x < WreckStructure.BOW_DECK_START:
		var nx = min(WreckStructure.BOW_DECK_START, x + step_x)
		var b0 = WreckStructure.get_beam_at(x) - 0.2
		var b1 = WreckStructure.get_beam_at(nx) - 0.2

		# Recorte real en Cubierta C1 para la escalera física descendente a C8 (x: -1.5..4.5, z: 4.35..6.15)
		var in_stair_hole: bool = (x >= -1.51 and nx <= 4.51)
		var strips: Array = [[-b0, 4.35, -b1, 4.35], [6.15, b0, 6.15, b1]] if in_stair_hole else [[-b0, b0, -b1, b1]]
		for s in strips:
			var p0 = WreckStructure.get_world_pos(x, 0.0, s[0])
			var p1 = WreckStructure.get_world_pos(nx, 0.0, s[2])
			var p2 = WreckStructure.get_world_pos(nx, 0.0, s[3])
			var p3 = WreckStructure.get_world_pos(x, 0.0, s[1])

			st.set_uv(Vector2(p0.x/1.5, p0.z/1.5)); st.add_vertex(p0)
			st.set_uv(Vector2(p1.x/1.5, p1.z/1.5)); st.add_vertex(p1)
			st.set_uv(Vector2(p2.x/1.5, p2.z/1.5)); st.add_vertex(p2)

			st.set_uv(Vector2(p0.x/1.5, p0.z/1.5)); st.add_vertex(p0)
			st.set_uv(Vector2(p2.x/1.5, p2.z/1.5)); st.add_vertex(p2)
			st.set_uv(Vector2(p3.x/1.5, p3.z/1.5)); st.add_vertex(p3)
		x += step_x

	st.generate_normals()
	st.generate_tangents()
	var mesh = st.commit()
	var inst = MeshInstance3D.new()
	inst.name = "Deck_C1"
	inst.mesh = mesh
	add_child(inst)
	inst.create_trimesh_collision()
	ShipGeometry.slab_shell(inst, mat_frame)

	# Brazolas laterales de protección del hueco de bajada a C8 (abierto por el Oeste x = -1.5)
	for rail_cfg in [
		{"name": "C8CoamingNorth", "pos": Vector3(1.5, 0.22, 4.25), "size": Vector3(6.2, 0.44, 0.14)},
		{"name": "C8CoamingSouth", "pos": Vector3(1.5, 0.22, 6.25), "size": Vector3(6.2, 0.44, 0.14)},
		{"name": "C8CoamingEast",  "pos": Vector3(4.58, 0.22, 5.25), "size": Vector3(0.14, 0.44, 2.04)}
	]:
		var cm := MeshInstance3D.new()
		var cbx := BoxMesh.new()
		cbx.size = rail_cfg["size"]
		cm.mesh = cbx
		cm.material_override = mat_oak_trim
		cm.position = WreckStructure.get_world_pos(rail_cfg["pos"].x, rail_cfg["pos"].y, rail_cfg["pos"].z)
		inst.add_child(cm)
		PbrMaterialKit.add_box_collider(inst, "Col_" + rail_cfg["name"], rail_cfg["size"] + Vector3(0.06, 0.55, 0.06), WreckStructure.get_world_pos(rail_cfg["pos"].x, rail_cfg["pos"].y + 0.25, rail_cfg["pos"].z))

func build_c2_deck() -> void:
	# Castillo de Proa C2 (Techo de camarotes C6 y C7)
	var st = SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	st.set_material(mat_deck_c2)

	var step_x: float = 1.5
	var x = WreckStructure.BOW_DECK_START
	while x < WreckStructure.BOW_X:
		var nx = min(WreckStructure.BOW_X, x + step_x)
		var b0 = WreckStructure.get_beam_at(x) - 0.15
		var b1 = WreckStructure.get_beam_at(nx) - 0.15

		var p0 = WreckStructure.get_world_pos(x, 3.0, -b0)
		var p1 = WreckStructure.get_world_pos(nx, 3.0, -b1)
		var p2 = WreckStructure.get_world_pos(nx, 3.0, b1)
		var p3 = WreckStructure.get_world_pos(x, 3.0, b0)

		st.set_uv(Vector2(p0.x/1.5, p0.z/1.5)); st.add_vertex(p0)
		st.set_uv(Vector2(p1.x/1.5, p1.z/1.5)); st.add_vertex(p1)
		st.set_uv(Vector2(p2.x/1.5, p2.z/1.5)); st.add_vertex(p2)

		st.set_uv(Vector2(p0.x/1.5, p0.z/1.5)); st.add_vertex(p0)
		st.set_uv(Vector2(p2.x/1.5, p2.z/1.5)); st.add_vertex(p2)
		st.set_uv(Vector2(p3.x/1.5, p3.z/1.5)); st.add_vertex(p3)
		x += step_x

	st.generate_normals()
	st.generate_tangents()
	var mesh = st.commit()
	var inst = MeshInstance3D.new()
	inst.name = "Deck_C2"
	inst.mesh = mesh
	add_child(inst)
	inst.create_trimesh_collision()
	ShipGeometry.slab_shell(inst, mat_frame)
	_add_brow_balustrade(inst, "C2_BrowBalustrade", WreckStructure.BOW_DECK_START + 0.12)

func build_c3_deck() -> void:
	# Castillo de Popa C3 (Techo de camarotes C4 y C5)
	var st = SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	st.set_material(mat_deck_c3)

	var step_x: float = 1.5
	var x = WreckStructure.STERN_X
	while x < WreckStructure.STERN_DECK_END:
		var nx = min(WreckStructure.STERN_DECK_END, x + step_x)
		var b0 = WreckStructure.get_beam_at(x) - 0.15
		var b1 = WreckStructure.get_beam_at(nx) - 0.15

		var p0 = WreckStructure.get_world_pos(x, 3.0, -b0)
		var p1 = WreckStructure.get_world_pos(nx, 3.0, -b1)
		var p2 = WreckStructure.get_world_pos(nx, 3.0, b1)
		var p3 = WreckStructure.get_world_pos(x, 3.0, b0)

		st.set_uv(Vector2(p0.x/1.5, p0.z/1.5)); st.add_vertex(p0)
		st.set_uv(Vector2(p1.x/1.5, p1.z/1.5)); st.add_vertex(p1)
		st.set_uv(Vector2(p2.x/1.5, p2.z/1.5)); st.add_vertex(p2)

		st.set_uv(Vector2(p0.x/1.5, p0.z/1.5)); st.add_vertex(p0)
		st.set_uv(Vector2(p2.x/1.5, p2.z/1.5)); st.add_vertex(p2)
		st.set_uv(Vector2(p3.x/1.5, p3.z/1.5)); st.add_vertex(p3)
		x += step_x

	st.generate_normals()
	st.generate_tangents()
	var mesh = st.commit()
	var inst = MeshInstance3D.new()
	inst.name = "Deck_C3"
	inst.mesh = mesh
	add_child(inst)
	inst.create_trimesh_collision()
	ShipGeometry.slab_shell(inst, mat_frame)
	_add_brow_balustrade(inst, "C3_BrowBalustrade", WreckStructure.STERN_DECK_END - 0.12)

func _add_brow_balustrade(parent_deck: Node3D, rail_name: String, bx: float) -> void:
	# Balaustrada completa y cenefa de canto macizo hacia el combés (deja libres las escaleras en z = ±3.5)
	var brow = Node3D.new()
	brow.name = rail_name
	parent_deck.add_child(brow)

	var mat_rail := PbrMaterialKit.create_wet_wreck_wood_pbr("#39433b", 0.38, 0.62, 0.36) if rail_name == "C3_BrowBalustrade" else mat_oak_trim
	var max_b := WreckStructure.get_beam_at(bx) - 0.35
	# Cenefa frontal continua de canto de cubierta (0.26m grosor visual bajo el entarimado superior)
	var fascia := MeshInstance3D.new()
	var f_box := BoxMesh.new()
	f_box.size = Vector3(0.24, 0.26, max_b * 2.0)
	fascia.mesh = f_box
	fascia.material_override = mat_rail if rail_name == "C3_BrowBalustrade" else mat_frame
	fascia.position = WreckStructure.get_world_pos(bx, 2.88, 0.0)
	brow.add_child(fascia)

	var segments: Array[Vector2] = [
		Vector2(-max_b, -4.75),
		Vector2(-2.10, 2.10),
		Vector2(4.75, max_b),
	]
	for idx_s in range(segments.size()):
		var seg := segments[idx_s]
		var z0 := seg.x
		var z1 := seg.y
		var span := z1 - z0
		if span < 0.3:
			continue
		var mid_z := (z0 + z1) * 0.5
		var top_rail = MeshInstance3D.new()
		var r_box = BoxMesh.new()
		r_box.size = Vector3(0.16, 0.12, span)
		top_rail.mesh = r_box
		top_rail.material_override = mat_rail
		top_rail.position = WreckStructure.get_world_pos(bx, 3.82, mid_z)
		brow.add_child(top_rail)

		var posts := maxi(2, int(round(span / 0.75)))
		for i in range(posts + 1):
			var pz := lerpf(z0, z1, float(i) / float(posts))
			var bal = MeshInstance3D.new()
			var b_box = BoxMesh.new()
			b_box.size = Vector3(0.10, 0.80, 0.10)
			bal.mesh = b_box
			bal.material_override = mat_rail
			bal.position = WreckStructure.get_world_pos(bx, 3.40, pz)
			brow.add_child(bal)
			if rail_name == "C3_BrowBalustrade":
				PbrMaterialKit.add_contact_ao_disc(brow, WreckStructure.get_world_pos(bx, 3.012, pz), 0.18, 0.18, 0.52)

		PbrMaterialKit.add_box_collider(brow, "Col_BrowSeg_%d" % idx_s, Vector3(0.28, 1.2, span), WreckStructure.get_world_pos(bx, 3.55, mid_z))

func build_upper_bulwarks() -> void:
	# Completa la obra muerta exterior (0.85..3.85 m) y bordas navegables de C1, C2 y C3.
	# Separada estrictamente en Port (-Z) y Front (+Z) para recortes de RoofCutoutController.
	_build_upper_hull_side("Hull_Upper_Aft_Port", WreckStructure.STERN_X, WreckStructure.STERN_DECK_END, -1.0)
	_build_upper_hull_side("Hull_Upper_Aft_Front", WreckStructure.STERN_X, WreckStructure.STERN_DECK_END, 1.0)
	_build_upper_hull_side("Hull_Upper_Fore_Port", WreckStructure.BOW_DECK_START, WreckStructure.BOW_X, -1.0)
	_build_upper_hull_side("Hull_Upper_Fore_Front", WreckStructure.BOW_DECK_START, WreckStructure.BOW_X, 1.0)

	_build_waist_bulwark("Bulwark_Waist_Port", -1.0)
	_build_waist_bulwark("Bulwark_Waist_Front", 1.0)
	_build_chainwales("Chainwales_Port", -1.0)
	_build_chainwales("Chainwales_Front", 1.0)
	_build_boarding_ladder()
	_build_gunwale_colliders()

func _build_chainwales(node_name: String, side: float) -> void:
	# Mesas de guarnición exteriores para tensar los obenques de los 3 palos
	var root := Node3D.new()
	root.name = node_name
	add_child(root)
	for cw_cfg in [
		{"name": "Chainwale_Aft",  "x": -18.5, "y": 1.75, "len": 3.4},
		{"name": "Chainwale_Main", "x": -0.5,  "y": 0.45, "len": 4.4},
		{"name": "Chainwale_Fore", "x": 19.5,  "y": 1.85, "len": 3.2},
	]:
		var cx: float = cw_cfg["x"]
		var beam := WreckStructure.get_beam_at(cx)
		var plank := MeshInstance3D.new()
		plank.name = cw_cfg["name"]
		var pbx := BoxMesh.new()
		pbx.size = Vector3(cw_cfg["len"], 0.16, 0.85)
		plank.mesh = pbx
		plank.material_override = mat_oak_trim
		plank.position = WreckStructure.get_world_pos(cx, cw_cfg["y"], side * (beam + 0.36))
		root.add_child(plank)

func _build_boarding_ladder() -> void:
	# Escala náutica de gato (cuerda y barrotes de roble en P01) pegada al costado de estribor
	var b_mid := WreckStructure.get_beam_at(3.0)
	var ladder_node := Node3D.new()
	ladder_node.name = "SideBoardingLadder"
	add_child(ladder_node)

	var mat_rope := PbrMaterialKit.create_rope_cable_pbr("#6d5e45")
	var rope_st := ShipGeometry.begin(mat_rope)
	var rung_st := ShipGeometry.begin(mat_oak_trim)

	var x_left := 2.60
	var x_right := 3.40
	var rungs_y := [-0.08, -0.40, -0.72, -1.04, -1.36]

	for rx in [x_left, x_right]:
		var side_pts: Array[Vector3] = [
			WreckStructure.get_world_pos(rx, 0.22, b_mid - 0.20),
			WreckStructure.get_world_pos(rx, 0.10, b_mid + 0.02),
			WreckStructure.get_world_pos(rx, -0.35, b_mid + 0.10),
			WreckStructure.get_world_pos(rx, -0.95, b_mid * 0.985 + 0.12),
			WreckStructure.get_world_pos(rx, -1.46, b_mid * 0.97 + 0.12),
		]
		ShipGeometry.tube(rope_st, side_pts, 0.028, 6)

	for ry in rungs_y:
		var t: float = clampf((-ry) / 1.50, 0.0, 1.0)
		var rz: float = lerpf(b_mid + 0.07, b_mid * 0.97 + 0.12, t)
		var p_l := WreckStructure.get_world_pos(x_left - 0.04, ry, rz)
		var p_r := WreckStructure.get_world_pos(x_right + 0.04, ry, rz)
		ShipGeometry.tube(rung_st, [p_l, p_r], 0.030, 8)
		for kx in [x_left, x_right]:
			var knot := MeshInstance3D.new()
			var k_cyl := CylinderMesh.new()
			k_cyl.top_radius = 0.044; k_cyl.bottom_radius = 0.044; k_cyl.height = 0.07
			knot.mesh = k_cyl
			knot.material_override = mat_rope
			knot.position = WreckStructure.get_world_pos(kx, ry, rz)
			knot.rotation_degrees.z = 90.0
			ladder_node.add_child(knot)

	var mesh_inst := ShipGeometry.commit(ladder_node, "SideBoardingLadder_Mesh", rope_st)
	mesh_inst.name = "SideBoardingLadder_Mesh"
	ShipGeometry.commit(ladder_node, "SideBoardingLadder_Rungs", rung_st)

	# Cornamusas dobles en las jambas de la abertura de abordaje
	for cx in [1.45, 4.45]:
		var cleat := MeshInstance3D.new()
		var c_box := BoxMesh.new()
		c_box.size = Vector3(0.42, 0.14, 0.20)
		cleat.mesh = c_box
		cleat.material_override = mat_oak_trim
		cleat.position = WreckStructure.get_world_pos(cx, 1.02, WreckStructure.get_beam_at(cx) - 0.04)
		ladder_node.add_child(cleat)

	# Rampa física invisible de pendiente suave (~45° global) + umbral horizontal que supera el borde de Deck_C1
	var x_left_r := 2.00
	var x_right_r := 4.00
	var y0 := 0.06
	var y1 := -2.25
	var z0 := b_mid + 0.25
	var z1 := b_mid + 3.45
	var z_in := b_mid - 1.50
	var thick := 0.45
	var sb := StaticBody3D.new()
	sb.name = "SideBoardingLadder_Ramp"
	var cs := CollisionShape3D.new()
	var cv := ConvexPolygonShape3D.new()
	cv.points = PackedVector3Array([
		WreckStructure.get_world_pos(x_left_r, y0, z0),
		WreckStructure.get_world_pos(x_right_r, y0, z0),
		WreckStructure.get_world_pos(x_right_r, y1, z1),
		WreckStructure.get_world_pos(x_left_r, y1, z1),
		WreckStructure.get_world_pos(x_left_r, y0 - thick, z0),
		WreckStructure.get_world_pos(x_right_r, y0 - thick, z0),
		WreckStructure.get_world_pos(x_right_r, y1 - thick, z1),
		WreckStructure.get_world_pos(x_left_r, y1 - thick, z1),
	])
	cs.shape = cv
	sb.add_child(cs)
	var cs_top := CollisionShape3D.new()
	var cv_top := ConvexPolygonShape3D.new()
	cv_top.points = PackedVector3Array([
		WreckStructure.get_world_pos(x_left_r, 0.01, z_in),
		WreckStructure.get_world_pos(x_right_r, 0.01, z_in),
		WreckStructure.get_world_pos(x_right_r, y0, z0),
		WreckStructure.get_world_pos(x_left_r, y0, z0),
		WreckStructure.get_world_pos(x_left_r, -thick, z_in),
		WreckStructure.get_world_pos(x_right_r, -thick, z_in),
		WreckStructure.get_world_pos(x_right_r, y0 - thick, z0),
		WreckStructure.get_world_pos(x_left_r, y0 - thick, z0),
	])
	cs_top.shape = cv_top
	sb.add_child(cs_top)
	ladder_node.add_child(sb)

func _build_upper_hull_side(node_name: String, x_start: float, x_end: float, side: float) -> void:
	var root = Node3D.new()
	root.name = node_name
	add_child(root)

	var st = SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	st.set_material(mat_hull)

	var bands: Array[float] = [0.85, 1.95, 3.00, 3.85]
	var step_x := 1.5
	for b in range(bands.size() - 1):
		var y0 := bands[b]
		var y1 := bands[b + 1]
		var x := x_start
		while x < x_end - 0.001:
			var nx: float = minf(x_end, x + step_x)
			var bx := WreckStructure.get_beam_at(x)
			var bnx := WreckStructure.get_beam_at(nx)

			var p0 := WreckStructure.get_world_pos(x, y0, side * bx)
			var p1 := WreckStructure.get_world_pos(nx, y0, side * bnx)
			var p2 := WreckStructure.get_world_pos(nx, y1, side * bnx)
			var p3 := WreckStructure.get_world_pos(x, y1, side * bx)

			var uv0 := Vector2(p0.x / 4.5, p0.y / 4.5)
			var uv1 := Vector2(p1.x / 4.5, p1.y / 4.5)
			var uv2 := Vector2(p2.x / 4.5, p2.y / 4.5)
			var uv3 := Vector2(p3.x / 4.5, p3.y / 4.5)

			if side > 0.0:
				st.set_uv(uv0); st.add_vertex(p0); st.set_uv(uv1); st.add_vertex(p1); st.set_uv(uv2); st.add_vertex(p2)
				st.set_uv(uv0); st.add_vertex(p0); st.set_uv(uv2); st.add_vertex(p2); st.set_uv(uv3); st.add_vertex(p3)
			else:
				st.set_uv(uv0); st.add_vertex(p0); st.set_uv(uv2); st.add_vertex(p2); st.set_uv(uv1); st.add_vertex(p1)
				st.set_uv(uv0); st.add_vertex(p0); st.set_uv(uv3); st.add_vertex(p3); st.set_uv(uv2); st.add_vertex(p2)
			x += step_x

	st.generate_normals()
	st.generate_tangents()
	var side_mesh := MeshInstance3D.new()
	side_mesh.name = node_name + "_Mesh"
	side_mesh.mesh = st.commit()
	root.add_child(side_mesh)

	# Regala superior de roble (cap-rail) a lo largo de C2/C3
	var xr := x_start
	while xr < x_end - 0.1:
		var nr: float = minf(x_end, xr + 3.0)
		var mx := (xr + nr) * 0.5
		var p_a := WreckStructure.get_world_pos(xr, 3.88, side * WreckStructure.get_beam_at(xr))
		var p_b := WreckStructure.get_world_pos(nr, 3.88, side * WreckStructure.get_beam_at(nr))
		var seg_vec := p_b - p_a
		var cap := MeshInstance3D.new()
		var c_box := BoxMesh.new()
		c_box.size = Vector3(seg_vec.length() + 0.08, 0.14, 0.28)
		cap.mesh = c_box
		cap.material_override = mat_oak_trim
		cap.position = (p_a + p_b) * 0.5
		cap.rotation.y = -atan2(seg_vec.z, seg_vec.x)
		root.add_child(cap)
		if xr > x_start + 0.2:
			var post := MeshInstance3D.new()
			var p_box := BoxMesh.new()
			p_box.size = Vector3(0.14, 0.88, 0.20)
			post.mesh = p_box
			post.material_override = mat_frame
			post.position = WreckStructure.get_world_pos(mx, 3.42, side * (WreckStructure.get_beam_at(mx) - 0.08))
			root.add_child(post)
		elif absf(x_start - WreckStructure.STERN_X) < 0.2:
			# Poste de esquina en unión de espejo de popa con amurada (evita muesca abierta)
			var corner_post := MeshInstance3D.new()
			var cp_box := BoxMesh.new()
			cp_box.size = Vector3(0.24, 0.94, 0.26)
			corner_post.mesh = cp_box
			corner_post.material_override = mat_oak_trim
			corner_post.position = WreckStructure.get_world_pos(WreckStructure.STERN_X + 0.08, 3.45, side * (WreckStructure.get_beam_at(WreckStructure.STERN_X + 0.08) - 0.04))
			root.add_child(corner_post)
		xr += 3.0

func _build_waist_bulwark(node_name: String, side: float) -> void:
	var root := Node3D.new()
	root.name = node_name
	add_child(root)

	var x := WreckStructure.STERN_DECK_END
	while x < WreckStructure.BOW_DECK_START - 0.1:
		var nx: float = minf(WreckStructure.BOW_DECK_START, x + 3.0)
		# Abertura canónica de abordaje en estribor (x ~ 1.5..4.5) frente al bote de remos
		if side > 0.0 and x >= 1.4 and x < 4.4:
			x += 3.0
			continue
		var p_a := WreckStructure.get_world_pos(x, 0.92, side * (WreckStructure.get_beam_at(x) - 0.05))
		var p_b := WreckStructure.get_world_pos(nx, 0.92, side * (WreckStructure.get_beam_at(nx) - 0.05))
		var seg := p_b - p_a
		var rail := MeshInstance3D.new()
		var r_box := BoxMesh.new()
		r_box.size = Vector3(seg.length() + 0.06, 0.14, 0.28)
		rail.mesh = r_box
		rail.material_override = mat_oak_trim
		rail.position = (p_a + p_b) * 0.5
		rail.rotation.y = -atan2(seg.z, seg.x)
		root.add_child(rail)

		var timber := MeshInstance3D.new()
		var t_box := BoxMesh.new()
		t_box.size = Vector3(0.16, 0.92, 0.20)
		timber.mesh = t_box
		timber.material_override = mat_frame
		timber.position = WreckStructure.get_world_pos(x + 1.5, 0.45, side * (WreckStructure.get_beam_at(x + 1.5) - 0.10))
		root.add_child(timber)
		x += 3.0

func _build_gunwale_colliders() -> void:
	# Colisionadores físicos perimetrales gruesos (dejan libre el paso de abordaje al bote y proa rota)
	var col_root := StaticBody3D.new()
	col_root.name = "GunwaleColliders"
	add_child(col_root)

	var step_x := 3.0
	for side in [-1.0, 1.0]:
		var x := WreckStructure.STERN_X
		while x < WreckStructure.BOW_X - 0.2:
			var nx: float = minf(WreckStructure.BOW_X, x + step_x)
			var mx := (x + nx) * 0.5
			# Huecos intencionales para caer/nadar hacia el bote (x=1.5..4.5 estribor) o trinquete caído (x>26.0 babor)
			if (side > 0.0 and mx >= 1.5 and mx <= 4.5) or (side < 0.0 and mx >= 26.0):
				x += step_x
				continue
			var is_upper := (mx <= WreckStructure.STERN_DECK_END or mx >= WreckStructure.BOW_DECK_START)
			var top_y := 4.4 if is_upper else 1.55
			var bot_y := -0.2
			var h := top_y - bot_y
			var p_a := WreckStructure.get_world_pos(x, (top_y + bot_y) * 0.5, side * (WreckStructure.get_beam_at(x) + 0.06))
			var p_b := WreckStructure.get_world_pos(nx, (top_y + bot_y) * 0.5, side * (WreckStructure.get_beam_at(nx) + 0.06))
			var seg := p_b - p_a
			var cs := CollisionShape3D.new()
			var bx := BoxShape3D.new()
			bx.size = Vector3(seg.length() + 0.28, h, 0.44)
			cs.shape = bx
			cs.position = (p_a + p_b) * 0.5
			cs.rotation.y = -atan2(seg.z, seg.x)
			col_root.add_child(cs)
			x += step_x

	# Topes en espejo de popa (-30.65) y tajamar de proa (30.65)
	var stern_cs := CollisionShape3D.new()
	var stern_box := BoxShape3D.new()
	stern_box.size = Vector3(0.50, 5.2, WreckStructure.get_beam_at(WreckStructure.STERN_X) * 2.1)
	stern_cs.shape = stern_box
	stern_cs.position = WreckStructure.get_world_pos(WreckStructure.STERN_X - 0.15, 2.2, 0.0)
	col_root.add_child(stern_cs)

	var bow_cs := CollisionShape3D.new()
	var bow_box := BoxShape3D.new()
	bow_box.size = Vector3(0.85, 5.2, 1.8)
	bow_cs.shape = bow_box
	bow_cs.position = WreckStructure.get_world_pos(WreckStructure.BOW_X - 0.15, 2.4, 0.0)
	col_root.add_child(bow_cs)

func build_prow_and_bowsprit() -> void:
	# Tajamar de proa (BowBeakhead) y palo bauprés completo con botavaras y estays
	var beak := Node3D.new()
	beak.name = "BowBeakhead"
	add_child(beak)

	var cutwater := MeshInstance3D.new()
	var cw_box := BoxMesh.new()
	cw_box.size = Vector3(3.8, 1.4, 0.56)
	cutwater.mesh = cw_box
	cutwater.material_override = mat_oak_trim
	cutwater.position = Vector3(31.2, 1.8, 0.0)
	cutwater.rotation_degrees = Vector3(0.0, 0.0, 56.0)
	beak.add_child(cutwater)

	var lower_stem := MeshInstance3D.new()
	var ls_box := BoxMesh.new()
	ls_box.size = Vector3(2.8, 5.8, 0.52)
	lower_stem.mesh = ls_box
	lower_stem.material_override = mat_hull
	lower_stem.position = Vector3(30.3, -2.0, 0.0)
	lower_stem.rotation_degrees = Vector3(0.0, 0.0, 14.0)
	beak.add_child(lower_stem)

	# Cachetes / curvas de brazal del tajamar (trailboard cheeks) en roble tallado
	for cheek_side in [-1.0, 1.0]:
		var cheek := MeshInstance3D.new()
		var ck_box := BoxMesh.new()
		ck_box.size = Vector3(2.85, 0.26, 0.10)
		cheek.mesh = ck_box
		cheek.material_override = mat_oak_trim
		cheek.position = Vector3(31.25, 2.38, cheek_side * 0.31)
		cheek.rotation_degrees = Vector3(cheek_side * -8.0, cheek_side * 12.0, 42.0)
		beak.add_child(cheek)

	# Mascarón de proa esculpido en bronce bruñido (busto de dragón heráldico, no cono simple)
	var mat_figurehead := PbrMaterialKit.create_aged_copper_pbr("#b88e3e")
	mat_figurehead.metallic = 0.72
	mat_figurehead.roughness = 0.36
	var fh_root := Node3D.new()
	fh_root.name = "DragonFigureheadSculpt"
	fh_root.position = Vector3(33.05, 3.05, 0.0)
	beak.add_child(fh_root)

	var fh_chest := MeshInstance3D.new()
	var fc_cyl := CylinderMesh.new()
	fc_cyl.top_radius = 0.22; fc_cyl.bottom_radius = 0.34; fc_cyl.height = 0.85; fc_cyl.radial_segments = 8
	fh_chest.mesh = fc_cyl
	fh_chest.material_override = mat_figurehead
	fh_chest.position = Vector3(-0.12, -0.10, 0.0)
	fh_chest.rotation_degrees = Vector3(0.0, 0.0, -48.0)
	fh_root.add_child(fh_chest)

	var fh_neck := MeshInstance3D.new()
	var fn_cyl := CylinderMesh.new()
	fn_cyl.top_radius = 0.14; fn_cyl.bottom_radius = 0.22; fn_cyl.height = 0.68; fn_cyl.radial_segments = 8
	fh_neck.mesh = fn_cyl
	fh_neck.material_override = mat_figurehead
	fh_neck.position = Vector3(0.30, 0.24, 0.0)
	fh_neck.rotation_degrees = Vector3(0.0, 0.0, -32.0)
	fh_root.add_child(fh_neck)

	var fh_snout := MeshInstance3D.new()
	var fs_box := BoxMesh.new()
	fs_box.size = Vector3(0.56, 0.20, 0.24)
	fh_snout.mesh = fs_box
	fh_snout.material_override = mat_figurehead
	fh_snout.position = Vector3(0.62, 0.44, 0.0)
	fh_snout.rotation_degrees = Vector3(0.0, 0.0, -10.0)
	fh_root.add_child(fh_snout)

	var fh_jaw := MeshInstance3D.new()
	var fj_box := BoxMesh.new()
	fj_box.size = Vector3(0.42, 0.10, 0.18)
	fh_jaw.mesh = fj_box
	fh_jaw.material_override = mat_figurehead
	fh_jaw.position = Vector3(0.56, 0.27, 0.0)
	fh_jaw.rotation_degrees = Vector3(0.0, 0.0, 18.0)
	fh_root.add_child(fh_jaw)

	for h_side in [-1.0, 1.0]:
		var horn := MeshInstance3D.new()
		var hn_cyl := CylinderMesh.new()
		hn_cyl.top_radius = 0.015; hn_cyl.bottom_radius = 0.055; hn_cyl.height = 0.48
		horn.mesh = hn_cyl
		horn.material_override = mat_figurehead
		horn.position = Vector3(0.26, 0.56, h_side * 0.14)
		horn.rotation_degrees = Vector3(h_side * -22.0, 0.0, 42.0)
		fh_root.add_child(horn)

	# Palo bauprés principal
	var bsprit_root := Node3D.new()
	bsprit_root.name = "Bowsprit"
	add_child(bsprit_root)

	var p_base := Vector3(28.2, 3.25, 0.0)
	var p_tip := Vector3(38.5, 7.60, 0.0)
	var spar_vec := p_tip - p_base
	var spar_len := spar_vec.length()
	var y_dir := spar_vec.normalized()
	var z_dir := Vector3.BACK
	var x_dir := y_dir.cross(z_dir).normalized()

	var spar := MeshInstance3D.new()
	var s_cyl := CylinderMesh.new()
	s_cyl.top_radius = 0.16
	s_cyl.bottom_radius = 0.34
	s_cyl.height = spar_len
	spar.mesh = s_cyl
	spar.material_override = mat_oak_trim
	spar.transform = Transform3D(Basis(x_dir, y_dir, z_dir), (p_base + p_tip) * 0.5)
	bsprit_root.add_child(spar)

	# Sunchos metálicos y moco del bauprés (dolphin striker)
	for t in [0.22, 0.48, 0.72, 0.92]:
		var band := MeshInstance3D.new()
		var b_cyl := CylinderMesh.new()
		var r_band := lerpf(0.35, 0.17, t)
		b_cyl.top_radius = r_band
		b_cyl.bottom_radius = r_band
		b_cyl.height = 0.16
		band.mesh = b_cyl
		band.material_override = mat_iron
		band.transform = Transform3D(Basis(x_dir, y_dir, z_dir), p_base.lerp(p_tip, t))
		bsprit_root.add_child(band)

	var striker := MeshInstance3D.new()
	var st_cyl := CylinderMesh.new()
	st_cyl.top_radius = 0.07
	st_cyl.bottom_radius = 0.04
	st_cyl.height = 1.85
	striker.mesh = st_cyl
	striker.material_override = mat_oak_trim
	striker.position = Vector3(33.3, 4.45, 0.0)
	striker.rotation_degrees = Vector3(0.0, 0.0, 8.0)
	bsprit_root.add_child(striker)

	# Estays de proa (bobstay y jibstays)
	var mat_stay := PbrMaterialKit.create_rope_cable_pbr("#5c4e38")
	for pair in [[p_tip, Vector3(32.5, 2.2, 0.0)], [p_base.lerp(p_tip, 0.65), Vector3(29.0, 3.45, -1.1)], [p_base.lerp(p_tip, 0.65), Vector3(29.0, 3.45, 1.1)]]:
		var a: Vector3 = pair[0]
		var b: Vector3 = pair[1]
		var v := b - a
		var sd := v.normalized()
		var sx := Vector3.UP.cross(sd).normalized()
		if sx.length_squared() < 0.01:
			sx = Vector3.RIGHT
		var sz := sx.cross(sd).normalized()
		var rope := MeshInstance3D.new()
		var r_cyl := CylinderMesh.new()
		r_cyl.top_radius = 0.035
		r_cyl.bottom_radius = 0.035
		r_cyl.height = v.length()
		rope.mesh = r_cyl
		rope.material_override = mat_stay
		rope.transform = Transform3D(Basis(sx, sd, sz), (a + b) * 0.5)
		bsprit_root.add_child(rope)

func build_stairs() -> void:
	# Escaleras canónicas P02/P03 (proa) y P04/P05 (popa)
	# 1. Malla visual arquitectónica con 12 escalones macizos, zancas laterales, postes y pasamanos
	var st_steps = SurfaceTool.new()
	st_steps.begin(Mesh.PRIMITIVE_TRIANGLES)
	st_steps.set_material(mat_deck)

	var st_trim = SurfaceTool.new()
	st_trim.begin(Mesh.PRIMITIVE_TRIANGLES)
	st_trim.set_material(mat_frame)

	for end_x in [[10.3, 13.6], [-10.3, -13.6]]:
		for side in [-1.0, 1.0]:
			_add_stair_flight(st_steps, st_trim, end_x[0], end_x[1], side * 3.5)

	st_steps.generate_normals()
	var mesh_steps = MeshInstance3D.new()
	mesh_steps.name = "Stairs"
	mesh_steps.mesh = st_steps.commit()
	add_child(mesh_steps)

	st_trim.generate_normals()
	var mesh_trim = MeshInstance3D.new()
	mesh_trim.name = "StairStringers"
	mesh_trim.mesh = st_trim.commit()
	add_child(mesh_trim)

	# 2. Rampas de colisión suaves (StaticBody3D con rampas y bisel de desembarco)
	# Permiten caminar de forma fluida (WASD) sin tropiezos ni aristas verticales en el umbral
	create_stair_ramp_collider(10.2, 13.5, 14.2, -0.02, 3.01, 3.00, -3.5, 0.85) # Proa Babor
	create_stair_ramp_collider(10.2, 13.5, 14.2, -0.02, 3.01, 3.00, 3.5, 0.85)  # Proa Estribor
	create_stair_ramp_collider(-10.2, -13.5, -14.2, -0.02, 3.01, 3.00, -3.5, 0.85) # Popa Babor
	create_stair_ramp_collider(-10.2, -13.5, -14.2, -0.02, 3.01, 3.00, 3.5, 0.85)  # Popa Estribor

	# Escalera física descendente C1 -> Cubierta Inundada C8 (x: -1.5 -> +4.5, z = 5.25)
	build_physical_stair_flight(self, "Stairs_C1_C8", -1.5, 4.5, 0.0, -3.28, 5.25, 0.72, 16, mat_deck, mat_frame)

static func build_physical_stair_flight(parent: Node3D, node_name: String, x_start: float, x_end: float, y_start: float, y_end: float, z: float, half_w: float, num_steps: int, m_steps: Material, m_trim: Material, create_collider: bool = true) -> Node3D:
	var root := Node3D.new()
	root.name = node_name
	parent.add_child(root)

	var st_steps := SurfaceTool.new()
	st_steps.begin(Mesh.PRIMITIVE_TRIANGLES)
	st_steps.set_material(m_steps)

	var st_trim := SurfaceTool.new()
	st_trim.begin(Mesh.PRIMITIVE_TRIANGLES)
	st_trim.set_material(m_trim)

	for i in range(num_steps):
		var t0 := float(i) / float(num_steps)
		var t1 := float(i + 1) / float(num_steps)
		var x0 := lerpf(x_start, x_end, t0)
		var x1 := lerpf(x_start, x_end, t1)
		var y0 := lerpf(y_start, y_end, t0)
		var y1 := lerpf(y_start, y_end, t1)
		var y_tread := maxf(y0, y1) if y_end >= y_start else lerpf(y_start, y_end, (t0 + t1) * 0.5)

		var p0 := WreckStructure.get_world_pos(x0, y_tread, z - half_w)
		var p1 := WreckStructure.get_world_pos(x1, y_tread, z - half_w)
		var p2 := WreckStructure.get_world_pos(x1, y_tread, z + half_w)
		var p3 := WreckStructure.get_world_pos(x0, y_tread, z + half_w)
		_add_double_quad_static(st_steps, p0, p1, p2, p3, Vector2(0, 0), Vector2(1, 1))

		var r0 := WreckStructure.get_world_pos(x0, y0, z - half_w)
		var r1 := WreckStructure.get_world_pos(x0, y0, z + half_w)
		_add_double_quad_static(st_steps, r0, r1, p3, p0, Vector2(0, 0), Vector2(1, 0.5))

	for edge_sign: float in [-1.0, 1.0]:
		var ze: float = z + edge_sign * (half_w + 0.05)
		_add_beam_static(st_trim, x_start, y_start - 0.12, x_end, y_end - 0.12, ze, 0.10, 0.34)
		_add_beam_static(st_trim, x_start, y_start + 0.84, x_end, y_end + 0.84, ze, 0.07, 0.08)

	st_steps.generate_normals()
	var m_st := MeshInstance3D.new()
	m_st.name = node_name + "_Steps"
	m_st.mesh = st_steps.commit()
	root.add_child(m_st)

	st_trim.generate_normals()
	var m_tr := MeshInstance3D.new()
	m_tr.name = node_name + "_Trim"
	m_tr.mesh = st_trim.commit()
	root.add_child(m_tr)

	if create_collider:
		# Rampa física suave + meseta de desembarco superior para superar el canto del hueco sin atascos
		var sb := StaticBody3D.new()
		sb.name = node_name + "_Ramp"
		var hi_at_start := y_start >= y_end
		var x_hi := x_start if hi_at_start else x_end
		var y_hi := y_start if hi_at_start else y_end
		var x_lo := x_end if hi_at_start else x_start
		var y_lo := y_end if hi_at_start else y_start
		var dir_to_hi := 1.0 if x_hi >= x_lo else -1.0
		var x_bot := x_lo - dir_to_hi * 0.45
		var x_land := x_hi + dir_to_hi * 0.75
		var hw_col := half_w + 0.08

		var col_incline := CollisionShape3D.new()
		var cv := ConvexPolygonShape3D.new()
		cv.points = PackedVector3Array([
			WreckStructure.get_world_pos(x_bot, y_lo - 0.02, z - hw_col),
			WreckStructure.get_world_pos(x_bot, y_lo - 0.02, z + hw_col),
			WreckStructure.get_world_pos(x_hi,  y_hi + 0.03, z + hw_col),
			WreckStructure.get_world_pos(x_hi,  y_hi + 0.03, z - hw_col),
			WreckStructure.get_world_pos(x_bot, y_lo - 0.50, z - hw_col),
			WreckStructure.get_world_pos(x_bot, y_lo - 0.50, z + hw_col),
			WreckStructure.get_world_pos(x_hi,  y_hi - 0.45, z + hw_col),
			WreckStructure.get_world_pos(x_hi,  y_hi - 0.45, z - hw_col),
		])
		col_incline.shape = cv
		sb.add_child(col_incline)

		var col_landing := CollisionShape3D.new()
		var cv_top := ConvexPolygonShape3D.new()
		cv_top.points = PackedVector3Array([
			WreckStructure.get_world_pos(x_hi,   y_hi + 0.03, z - hw_col),
			WreckStructure.get_world_pos(x_hi,   y_hi + 0.03, z + hw_col),
			WreckStructure.get_world_pos(x_land, y_hi + 0.00, z + hw_col),
			WreckStructure.get_world_pos(x_land, y_hi + 0.00, z - hw_col),
			WreckStructure.get_world_pos(x_hi,   y_hi - 0.45, z - hw_col),
			WreckStructure.get_world_pos(x_hi,   y_hi - 0.45, z + hw_col),
			WreckStructure.get_world_pos(x_land, y_hi - 0.45, z + hw_col),
			WreckStructure.get_world_pos(x_land, y_hi - 0.45, z - hw_col),
		])
		col_landing.shape = cv_top
		sb.add_child(col_landing)
		root.add_child(sb)
	return root

static func _add_double_quad_static(st: SurfaceTool, a: Vector3, b: Vector3, c: Vector3, d: Vector3, uv_min: Vector2, uv_max: Vector2) -> void:
	var uv0 := uv_min; var uv1 := Vector2(uv_max.x, uv_min.y); var uv2 := uv_max; var uv3 := Vector2(uv_min.x, uv_max.y)
	st.set_uv(uv0); st.add_vertex(a); st.set_uv(uv1); st.add_vertex(b); st.set_uv(uv2); st.add_vertex(c)
	st.set_uv(uv0); st.add_vertex(a); st.set_uv(uv2); st.add_vertex(c); st.set_uv(uv3); st.add_vertex(d)
	st.set_uv(uv0); st.add_vertex(a); st.set_uv(uv2); st.add_vertex(c); st.set_uv(uv1); st.add_vertex(b)
	st.set_uv(uv0); st.add_vertex(a); st.set_uv(uv3); st.add_vertex(d); st.set_uv(uv2); st.add_vertex(c)

static func _add_beam_static(st: SurfaceTool, x0: float, y0: float, x1: float, y1: float, z: float, thickness_z: float, height_y: float) -> void:
	var hz := thickness_z * 0.5
	var a0 := WreckStructure.get_world_pos(x0, y0, z - hz); var b0 := WreckStructure.get_world_pos(x1, y1, z - hz)
	var b1 := WreckStructure.get_world_pos(x1, y1 + height_y, z - hz); var a1 := WreckStructure.get_world_pos(x0, y0 + height_y, z - hz)
	var c0 := WreckStructure.get_world_pos(x0, y0, z + hz); var d0 := WreckStructure.get_world_pos(x1, y1, z + hz)
	var d1 := WreckStructure.get_world_pos(x1, y1 + height_y, z + hz); var c1 := WreckStructure.get_world_pos(x0, y0 + height_y, z + hz)
	_add_double_quad_static(st, a0, b0, b1, a1, Vector2(0, 0), Vector2(2, 1))
	_add_double_quad_static(st, c0, d0, d1, c1, Vector2(0, 0), Vector2(2, 1))
	_add_double_quad_static(st, a1, b1, d1, c1, Vector2(0, 0), Vector2(2, 0.3))
	_add_double_quad_static(st, a0, b0, d0, c0, Vector2(0, 0), Vector2(2, 0.3))

func _add_stair_flight(st_steps: SurfaceTool, st_trim: SurfaceTool, x_start: float, x_end: float, z: float) -> void:
	var num_steps = 12
	var w = 0.75 # Semiancho de escalera (ancho total 1.5m)

	for i in range(num_steps):
		var t0 = float(i) / num_steps
		var t1 = float(i + 1) / num_steps
		var x0 = lerp(x_start, x_end, t0)
		var x1 = lerp(x_start, x_end, t1)
		var y0 = lerp(0.0, 3.0, t0)
		var y1 = lerp(0.0, 3.0, t1)

		var p0 = WreckStructure.get_world_pos(x0, y1, z - w)
		var p1 = WreckStructure.get_world_pos(x1, y1, z - w)
		var p2 = WreckStructure.get_world_pos(x1, y1, z + w)
		var p3 = WreckStructure.get_world_pos(x0, y1, z + w)
		_add_double_quad(st_steps, p0, p1, p2, p3, Vector2(x0 / 1.5, (z - w) / 1.5), Vector2(x1 / 1.5, (z + w) / 1.5))

		# Contrahuella vertical sólida (orientación doble para evitar huecos desde ángulos laterales)
		var r0 = WreckStructure.get_world_pos(x0, y0, z - w)
		var r1 = WreckStructure.get_world_pos(x0, y0, z + w)
		_add_double_quad(st_steps, r0, r1, p3, p0, Vector2(x0 / 1.5, y0 / 1.5), Vector2((z + w) / 1.5, y1 / 1.5))

	# Zancas laterales inclinadas (vigas portantes bajo los peldaños) y pasamanos de roble
	for edge_sign in [-1.0, 1.0]:
		var ze = z + edge_sign * (w + 0.05)
		_add_inclined_beam(st_trim, x_start, -0.05, x_end, 2.85, ze, 0.10, 0.34)
		_add_inclined_beam(st_trim, x_start, 0.88, x_end, 3.88, ze, 0.07, 0.08)

		# Postes verticales de arranque y desembarco (Newel posts)
		for post_pt in [[x_start, 0.0, 0.96], [lerp(x_start, x_end, 0.5), 1.5, 2.46], [x_end, 3.0, 3.96]]:
			_add_vertical_post(st_trim, post_pt[0], post_pt[1], post_pt[2], ze, 0.09)

func _add_double_quad(st: SurfaceTool, a: Vector3, b: Vector3, c: Vector3, d: Vector3, uv_min: Vector2, uv_max: Vector2) -> void:
	var uv0 = uv_min
	var uv1 = Vector2(uv_max.x, uv_min.y)
	var uv2 = uv_max
	var uv3 = Vector2(uv_min.x, uv_max.y)
	st.set_uv(uv0); st.add_vertex(a); st.set_uv(uv1); st.add_vertex(b); st.set_uv(uv2); st.add_vertex(c)
	st.set_uv(uv0); st.add_vertex(a); st.set_uv(uv2); st.add_vertex(c); st.set_uv(uv3); st.add_vertex(d)
	st.set_uv(uv0); st.add_vertex(a); st.set_uv(uv2); st.add_vertex(c); st.set_uv(uv1); st.add_vertex(b)
	st.set_uv(uv0); st.add_vertex(a); st.set_uv(uv3); st.add_vertex(d); st.set_uv(uv2); st.add_vertex(c)

func _add_inclined_beam(st: SurfaceTool, x0: float, y0: float, x1: float, y1: float, z: float, thickness_z: float, height_y: float) -> void:
	var hz = thickness_z * 0.5
	var a0 = WreckStructure.get_world_pos(x0, y0, z - hz)
	var b0 = WreckStructure.get_world_pos(x1, y1, z - hz)
	var b1 = WreckStructure.get_world_pos(x1, y1 + height_y, z - hz)
	var a1 = WreckStructure.get_world_pos(x0, y0 + height_y, z - hz)
	var c0 = WreckStructure.get_world_pos(x0, y0, z + hz)
	var d0 = WreckStructure.get_world_pos(x1, y1, z + hz)
	var d1 = WreckStructure.get_world_pos(x1, y1 + height_y, z + hz)
	var c1 = WreckStructure.get_world_pos(x0, y0 + height_y, z + hz)
	_add_double_quad(st, a0, b0, b1, a1, Vector2(0, 0), Vector2(2, 1))
	_add_double_quad(st, c0, d0, d1, c1, Vector2(0, 0), Vector2(2, 1))
	_add_double_quad(st, a1, b1, d1, c1, Vector2(0, 0), Vector2(2, 0.3))
	_add_double_quad(st, a0, b0, d0, c0, Vector2(0, 0), Vector2(2, 0.3))

func _add_vertical_post(st: SurfaceTool, x: float, y0: float, y1: float, z: float, width: float) -> void:
	var hw = width * 0.5
	for face_z in [-hw, hw]:
		var p0 = WreckStructure.get_world_pos(x - hw, y0, z + face_z)
		var p1 = WreckStructure.get_world_pos(x + hw, y0, z + face_z)
		var p2 = WreckStructure.get_world_pos(x + hw, y1, z + face_z)
		var p3 = WreckStructure.get_world_pos(x - hw, y1, z + face_z)
		_add_double_quad(st, p0, p1, p2, p3, Vector2(0, 0), Vector2(0.5, 1))
	for face_x in [-hw, hw]:
		var p0 = WreckStructure.get_world_pos(x + face_x, y0, z - hw)
		var p1 = WreckStructure.get_world_pos(x + face_x, y0, z + hw)
		var p2 = WreckStructure.get_world_pos(x + face_x, y1, z + hw)
		var p3 = WreckStructure.get_world_pos(x + face_x, y1, z - hw)
		_add_double_quad(st, p0, p1, p2, p3, Vector2(0, 0), Vector2(0.5, 1))

func create_stair_ramp_collider(x_start: float, x_deck: float, x_land: float, y_start: float, y_top: float, y_deck: float, z: float, w: float) -> void:
	var sb = StaticBody3D.new()
	sb.name = "StairRamp_%.1f_%.1f" % [x_start, z]

	var col = CollisionShape3D.new()
	var concave = ConcavePolygonShape3D.new()
	concave.backface_collision = true

	# Puntos superiores (superficie de pisada continua sin costuras internas)
	var p0 = WreckStructure.get_world_pos(x_start, y_start, z - w)
	var p1 = WreckStructure.get_world_pos(x_start, y_start, z + w)
	var p2 = WreckStructure.get_world_pos(x_deck, y_top, z + w)
	var p3 = WreckStructure.get_world_pos(x_deck, y_top, z - w)
	var p4 = WreckStructure.get_world_pos(x_land, y_deck, z + w)
	var p5 = WreckStructure.get_world_pos(x_land, y_deck, z - w)

	# Puntos inferiores (espesor físico de 0.45m para soporte e integridad)
	var b0 = WreckStructure.get_world_pos(x_start, y_start - 0.45, z - w)
	var b1 = WreckStructure.get_world_pos(x_start, y_start - 0.45, z + w)
	var b2 = WreckStructure.get_world_pos(x_deck, y_top - 0.45, z + w)
	var b3 = WreckStructure.get_world_pos(x_deck, y_top - 0.45, z - w)
	var b4 = WreckStructure.get_world_pos(x_land, y_deck - 0.45, z + w)
	var b5 = WreckStructure.get_world_pos(x_land, y_deck - 0.45, z - w)

	var faces = PackedVector3Array()

	# Función auxiliar para añadir quads con orientación hacia el vector normal esperado
	var add_quad = func(qa: Vector3, qb: Vector3, qc: Vector3, qd: Vector3, exp_n: Vector3) -> void:
		var n1 = (qb - qa).cross(qc - qa)
		if n1.dot(exp_n) >= 0.0:
			faces.append(qa); faces.append(qb); faces.append(qc)
		else:
			faces.append(qa); faces.append(qc); faces.append(qb)
		var n2 = (qc - qa).cross(qd - qa)
		if n2.dot(exp_n) >= 0.0:
			faces.append(qa); faces.append(qc); faces.append(qd)
		else:
			faces.append(qa); faces.append(qd); faces.append(qc)

	# 1. Rampa inclinada superior (hacia arriba)
	add_quad.call(p0, p1, p2, p3, Vector3.UP)
	# 2. Desembarco superior (hacia arriba)
	add_quad.call(p3, p2, p4, p5, Vector3.UP)

	# 3. Rampa inclinada inferior (hacia abajo)
	add_quad.call(b0, b3, b2, b1, Vector3.DOWN)
	# 4. Desembarco inferior (hacia abajo)
	add_quad.call(b3, b5, b4, b2, Vector3.DOWN)

	# 5. Costado izquierdo (z - w)
	var n_left = WreckStructure.get_world_pos(x_start, y_start, z - w - 1.0) - p0
	add_quad.call(p0, p3, b3, b0, n_left)
	add_quad.call(p3, p5, b5, b3, n_left)

	# 6. Costado derecho (z + w)
	var n_right = WreckStructure.get_world_pos(x_start, y_start, z + w + 1.0) - p1
	add_quad.call(p1, b1, b2, p2, n_right)
	add_quad.call(p2, b2, b4, p4, n_right)

	# 7. Tapa de inicio (x_start)
	var dir_start = WreckStructure.get_world_pos(x_start - (x_deck - x_start), y_start, z) - p0
	add_quad.call(p0, b0, b1, p1, dir_start)

	# 8. Tapa de fin (x_land)
	var dir_land = WreckStructure.get_world_pos(x_land + (x_land - x_deck), y_deck, z) - p5
	add_quad.call(p5, p4, b4, b5, dir_land)

	concave.set_faces(faces)
	col.shape = concave
	sb.add_child(col)
	add_child(sb)

func build_waterline_barnacles() -> void:
	# Costras calcáreas acumuladas durante 50 años en babor y estribor (separadas para recorte)
	for side_cfg in [[-1.0, "WaterlineBarnacles_Port"], [1.0, "WaterlineBarnacles_Front"]]:
		var side: float = side_cfg[0]
		var st = SurfaceTool.new()
		st.begin(Mesh.PRIMITIVE_TRIANGLES)
		st.set_material(mat_barnacle)

		var x = -26.0
		while x <= 26.0:
			var beam = WreckStructure.get_beam_at(x) * 0.985
			for c in range(4):
				var cx = x + (float(c) - 1.5) * 0.32
				var cy = -2.7 + sin(cx * 1.7) * 0.45
				var cz = side * (beam + 0.04)
				var center = WreckStructure.get_world_pos(cx, cy, cz)
				var rad = 0.08 + (c % 3) * 0.03
				var h = 0.10 + (c % 2) * 0.05
				var tip = center + Vector3(0, 0.15, side).normalized() * h
				var segs = 6
				for s in range(segs):
					var a0 = float(s) / segs * TAU
					var a1 = float(s + 1) / segs * TAU
					var p0 = center + Vector3(cos(a0) * rad, sin(a0) * rad, 0)
					var p1 = center + Vector3(cos(a1) * rad, sin(a1) * rad, 0)
					st.set_uv(Vector2(float(s) / segs, 0.0)); st.add_vertex(p0)
					st.set_uv(Vector2(float(s + 1) / segs, 0.0)); st.add_vertex(p1)
					st.set_uv(Vector2((float(s) + 0.5) / segs, 1.0)); st.add_vertex(tip)
			x += 1.8

		st.generate_normals()
		var barnacles_inst = MeshInstance3D.new()
		barnacles_inst.name = side_cfg[1]
		barnacles_inst.mesh = st.commit()
		add_child(barnacles_inst)

func build_dripping_kelp() -> void:
	# Sargazos y algas marinas en popa/estribor (separadas para no flotar sobre corte bajo)
	var st_port = SurfaceTool.new()
	st_port.begin(Mesh.PRIMITIVE_TRIANGLES)
	st_port.set_material(mat_kelp)
	for i in range(6):
		var tx = -28.2
		var tz = lerp(-2.5, 2.5, float(i) / 5.0)
		add_kelp_ribbon(st_port, Vector3(tx, -1.5, tz), Vector3(tx + 0.15, -3.6 - randf_range(0.1, 0.5), tz), 0.09)
	st_port.generate_normals()
	var kp = MeshInstance3D.new(); kp.name = "DrippingKelp_Port"; kp.mesh = st_port.commit(); add_child(kp)

	var st_front = SurfaceTool.new()
	st_front.begin(Mesh.PRIMITIVE_TRIANGLES)
	st_front.set_material(mat_kelp)
	for i in range(12):
		var kx = lerp(-23.0, -15.0, float(i) / 11.0)
		var kz = WreckStructure.get_beam_at(kx) * 0.95
		add_kelp_ribbon(st_front, Vector3(kx, -1.2 + sin(kx * 2.0) * 0.3, kz), Vector3(kx + randf_range(-0.15, 0.15), -3.4 - randf_range(0.2, 0.6), kz + 0.12), 0.10)
	st_front.generate_normals()
	var kf = MeshInstance3D.new(); kf.name = "DrippingKelp_Front"; kf.mesh = st_front.commit(); add_child(kf)

func add_kelp_ribbon(st: SurfaceTool, top: Vector3, bot: Vector3, width: float) -> void:
	var steps = 4
	for i in range(steps):
		var t0 = float(i) / steps
		var t1 = float(i + 1) / steps
		var p0 = top.lerp(bot, t0)
		var p1 = top.lerp(bot, t1)

		# Curvatura orgánica por gravedad y movimiento del mar
		p0.z += sin(t0 * PI) * 0.12
		p1.z += sin(t1 * PI) * 0.12

		var side = Vector3(width * 0.5 * (1.0 - t0 * 0.4), 0, 0)
		var v0 = p0 - side
		var v1 = p0 + side
		var v2 = p1 + side
		var v3 = p1 - side

		st.set_uv(Vector2(0.0, t0)); st.add_vertex(v0)
		st.set_uv(Vector2(1.0, t0)); st.add_vertex(v1)
		st.set_uv(Vector2(1.0, t1)); st.add_vertex(v2)

		st.set_uv(Vector2(0.0, t0)); st.add_vertex(v0)
		st.set_uv(Vector2(1.0, t1)); st.add_vertex(v2)
		st.set_uv(Vector2(0.0, t1)); st.add_vertex(v3)

func build_rust_weep_stains() -> void:
	# Escorrentías de óxido vertical separadas en babor y estribor
	for side_cfg in [[-1.0, "HullRustStains_Port"], [1.0, "HullRustStains_Front"]]:
		var side: float = side_cfg[0]
		var stain_root = Node3D.new()
		stain_root.name = side_cfg[1]
		add_child(stain_root)

		for cx in [-19.0, -1.5, 18.0]:
			var beam = WreckStructure.get_beam_at(cx) * 0.99
			var stain = PbrMaterialKit.create_rust_stain_mesh(0.75, 1.55, 0.34)
			stain.position = WreckStructure.get_world_pos(cx, -0.55, side * (beam + 0.015))
			stain.rotation_degrees = Vector3(0, 0 if side > 0 else 180, 90)
			stain_root.add_child(stain)

		var bow_beam = WreckStructure.get_beam_at(28.0) * 0.98
		var hawse_stain = PbrMaterialKit.create_rust_stain_mesh(0.65, 1.45, 0.38)
		hawse_stain.position = WreckStructure.get_world_pos(28.0, 1.2, side * (bow_beam + 0.015))
		hawse_stain.rotation_degrees = Vector3(0, 0 if side > 0 else 180, 90)
		stain_root.add_child(hawse_stain)
