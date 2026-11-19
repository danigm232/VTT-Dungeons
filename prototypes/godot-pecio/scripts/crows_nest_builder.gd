class_name CrowsNestBuilder
extends RefCounted

# Constructor modular del Nido de la Arpía en la Cofa (Zona C1 / C10, +15 m)
# Bloques A, B y C integrados:
# - Bloque A (Pasos 1-4): entramado orgánico denso (85-95% cobertura), volumen 3D,
#   integración entre barrotes y mástil central, tonos naturales de madera/paja.
# - Bloque B (Pasos 5-7): restos de presas integrados, 5 tesoros canónicos del PDF
#   medio ocultos sin resplandor mágico y percha de contacto para la arpía.
# - Bloque C (Pasos 8-10): biblioteca reutilizable, MultiMeshInstance3D y materiales
#   compartidos con viento, flexión de aterrizaje y atenuación de oclusión en cámara.

const PbrMaterialKit = preload("res://scripts/pbr_material_kit.gd")
const ShipGeometry = preload("res://scripts/ship_geometry.gd")
const InteractiveProp = preload("res://scripts/interactive_prop.gd")
const NestAmbianceController = preload("res://scripts/nest_ambiance_controller.gd")

const SHADER_NEST_SWAY = preload("res://shaders/nest_wind_sway.gdshader")

const NEST_CENTER := Vector3(0.35, 15.02, -0.48)
const CLIMB_NOTCH_RAD := 1.18 # Centro de entrada por escala P10 (~67.5 deg, +X/+Z)
const HARPY_REST_OFFSET := Vector3(-1.20, 0.0, -0.57)

static func nest_surface_height(dx: float, dz: float) -> float:
	var r := sqrt(dx * dx + dz * dz)
	var a := atan2(dz, dx)
	var diff_notch := atan2(sin(a - CLIMB_NOTCH_RAD), cos(a - CLIMB_NOTCH_RAD))
	var notch_clear := 1.0 - exp(-pow(diff_notch / 0.48, 3.0))

	var bowl_rim := clampf((r - 1.05) / 1.65, 0.0, 1.0)
	var rim_height := (0.46 + 0.10 * sin(a * 4.0 + 0.6) + 0.05 * cos(a * 7.0 - 0.8)) * pow(bowl_rim, 1.32)
	var mast_mound := 0.15 * exp(-pow((r - 0.56) / 0.34, 2.0))

	# Punto de descanso habitual de la arpía: hondonada firme a cota ~0.09 m para sus garras
	var dist_harpy := Vector2(dx - HARPY_REST_OFFSET.x, dz - HARPY_REST_OFFSET.z).length()
	var rest_hollow := -0.025 * exp(-pow(dist_harpy / 0.65, 2.0))

	var ripple := 0.026 * sin(dx * 2.6 + 0.4) * cos(dz * 2.4 - 0.3)
	var base := 0.072 + mast_mound + ripple + rest_hollow
	return maxf(0.015, (base + rim_height) * lerpf(0.18, 1.0, notch_clear))

static func _make_uv_bark_material(base_hex: String, rough: float = 0.88) -> StandardMaterial3D:
	var mat := PbrMaterialKit.create_oak_furniture_pbr(base_hex, 1.0)
	mat.uv1_triplanar = false
	mat.uv1_scale = Vector3(1.0, 1.0, 1.0)
	mat.roughness = rough
	mat.metallic_specular = 0.10
	mat.normal_scale = 0.85
	mat.ao_light_affect = 0.55
	return mat

static func _make_wind_sway_material(tint_hex: String, rough: float = 0.94, wind_amp: float = 0.016) -> ShaderMaterial:
	var smat := ShaderMaterial.new()
	smat.shader = SHADER_NEST_SWAY
	smat.set_shader_parameter("albedo_tex", PbrMaterialKit.TEX_OAK)
	smat.set_shader_parameter("tint_color", Color(tint_hex))
	smat.set_shader_parameter("roughness_val", rough)
	smat.set_shader_parameter("wind_speed", 1.65)
	smat.set_shader_parameter("wind_amp", wind_amp)
	smat.set_shader_parameter("landing_flex", 0.0)
	smat.set_shader_parameter("occlusion_alpha", 1.0)
	return smat

static func build_materials() -> Dictionary:
	var mats := {}
	# Ramas: 4 tonos compartidos + 1 material con dither de oclusión para ramas altas del borde frontal
	mats["bark_dark"] = _make_uv_bark_material("#4f4539", 0.92)
	mats["bark_grey"] = _make_uv_bark_material("#786d5e", 0.90)
	mats["bark_warm"] = _make_uv_bark_material("#6b5c49", 0.89)
	mats["bark_moss"] = _make_uv_bark_material("#566047", 0.90)
	mats["bark_front_fade"] = _make_wind_sway_material("#695a48", 0.90, 0.004)

	var bed_dark := PbrMaterialKit.create_oak_furniture_pbr("#483e32", 0.65)
	bed_dark.roughness = 0.96
	bed_dark.metallic_specular = 0.04
	mats["bed_dark"] = bed_dark

	# Paja, plumas, virutas y telas (compartidos)
	mats["straw_gold"] = _make_wind_sway_material("#a88c56", 0.95, 0.018)
	mats["straw_pale"] = _make_wind_sway_material("#c4ae78", 0.93, 0.020)

	var shaving_oak := PbrMaterialKit.create_wood_shaving_pbr("#a38e61")
	shaving_oak.uv1_triplanar = false
	shaving_oak.roughness = 0.91
	shaving_oak.metallic_specular = 0.05
	mats["shaving_oak"] = shaving_oak

	var sail_rag := PbrMaterialKit.create_moldy_cloth_pbr("#8f8772")
	sail_rag.roughness = 0.95
	var cloth_red := PbrMaterialKit.create_moldy_cloth_pbr("#6d3a2f")
	cloth_red.roughness = 0.95
	var rope_scrap := PbrMaterialKit.create_rope_cable_pbr("#6b5d47")

	var bone_mat := PbrMaterialKit.create_mineralized_bone_pbr("#bcb299")
	bone_mat.roughness = 0.90
	bone_mat.metallic_specular = 0.08
	var socket_dark := PbrMaterialKit.create_iron_pbr("#1a1613", 0.15, 0.95)

	var feather_rust := _make_wind_sway_material("#804930", 0.88, 0.022)
	var feather_dark := _make_wind_sway_material("#4f524a", 0.90, 0.022)
	var feather_pale := _make_wind_sway_material("#bfb398", 0.88, 0.024)

	var hair_dark := PbrMaterialKit.create_moldy_cloth_pbr("#28211b")
	hair_dark.roughness = 0.96
	var hair_grey := PbrMaterialKit.create_moldy_cloth_pbr("#59534b")
	hair_grey.roughness = 0.95

	# Tesoros metálicos/minerales con reflejo natural sutil (sin brillo mágico constante)
	var gold_mat := StandardMaterial3D.new()
	gold_mat.albedo_color = Color("#b89134")
	gold_mat.metallic = 0.86
	gold_mat.roughness = 0.24
	gold_mat.metallic_specular = 0.72

	var tiger_mat := StandardMaterial3D.new()
	tiger_mat.albedo_color = Color("#965d1e")
	tiger_mat.roughness = 0.22
	tiger_mat.metallic_specular = 0.68

	var bloodstone_mat := StandardMaterial3D.new()
	bloodstone_mat.albedo_color = Color("#244a34")
	bloodstone_mat.roughness = 0.20
	bloodstone_mat.metallic_specular = 0.65

	mats["sail_rag"] = sail_rag
	mats["cloth_red"] = cloth_red
	mats["rope_scrap"] = rope_scrap
	mats["bone"] = bone_mat
	mats["socket_dark"] = socket_dark
	mats["feather_rust"] = feather_rust
	mats["feather_dark"] = feather_dark
	mats["feather_pale"] = feather_pale
	mats["hair_dark"] = hair_dark
	mats["hair_grey"] = hair_grey
	mats["gold_treasure"] = gold_mat
	mats["tiger_eye"] = tiger_mat
	mats["bloodstone"] = bloodstone_mat
	return mats

# Biblioteca reutilizable de mallas de ramas (Paso 10.1)
static func _create_branch_library() -> Array[ArrayMesh]:
	var lib: Array[ArrayMesh] = []
	var specs := [
		[1.46, 0.048, 0.024, 0.16, 0.05, 0.64, 0.34, 0.44, 101],
		[1.24, 0.036, 0.015, 0.14, 0.04, 0.56, 0.30, -0.48, 202],
		[1.10, 0.028, 0.012, 0.20, 0.06, 0.46, 0.26, 0.56, 303],
		[0.84, 0.030, 0.011, 0.08, 0.04, 0.62, 0.22, -0.40, 404],
		[0.72, 0.016, 0.006, 0.11, 0.03, 0.50, 0.22, 0.48, 505],
	]
	var dummy_mat := StandardMaterial3D.new()
	for s_idx in range(specs.size()):
		var sp: Array = specs[s_idx]
		var rng := RandomNumberGenerator.new()
		rng.seed = int(sp[8])
		var length: float = float(sp[0])
		var r0: float = float(sp[1])
		var r1: float = float(sp[2])
		var bx: float = float(sp[3])
		var by: float = float(sp[4])
		var fork_t: float = float(sp[5])
		var fork_len: float = float(sp[6])
		var fork_ang: float = float(sp[7])

		var st := ShipGeometry.begin(dummy_mat)
		var segs := 6
		var spine: Array[Vector3] = []
		var radii: Array[float] = []
		for k in range(segs + 1):
			var t := float(k) / float(segs)
			var z_p := (t - 0.5) * length
			var x_p := sin(t * PI * 1.15) * bx + rng.randf_range(-0.018, 0.018)
			var y_p := sin(t * PI) * by + (t - 0.5) * rng.randf_range(-0.015, 0.015)
			spine.append(Vector3(x_p, y_p, z_p))
			radii.append(lerpf(r0, r1, t))
		_tapered_tube(st, spine, radii, 6, length)

		var fork_idx := clampi(int(round(fork_t * float(segs))), 1, segs - 1)
		var f_start: Vector3 = spine[fork_idx]
		var f_mid: Vector3 = f_start + Vector3(sin(fork_ang) * fork_len * 0.55, by * 0.42, cos(fork_ang) * fork_len * 0.55)
		var f_end: Vector3 = f_mid + Vector3(sin(fork_ang * 1.2) * fork_len * 0.50, by * 0.55, cos(fork_ang) * fork_len * 0.45)
		_tapered_tube(st, [f_start, f_mid, f_end], [radii[fork_idx] * 0.72, r1 * 0.88, r1 * 0.44], 5, fork_len)

		st.generate_normals()
		st.generate_tangents()
		lib.append(st.commit())
	return lib

static func _create_straw_sweep_mesh() -> ArrayMesh:
	var st := ShipGeometry.begin(StandardMaterial3D.new())
	for i in range(6):
		var spread := (float(i) - 2.5) * 0.12
		var dir := Vector3(sin(spread), 0.0, cos(spread))
		var side := Vector3(dir.z, 0.0, -dir.x)
		var blen := 0.34 + fmod(float(i) * 0.09, 0.14)
		var arch := 0.032 + fmod(float(i) * 0.018, 0.025)
		var offset := Vector3((float(i) - 2.5) * 0.018, 0.0, -0.14 + float(i % 2) * 0.04)
		var p0 := offset
		var p1 := offset + dir * (blen * 0.52) + Vector3(sin(float(i)) * 0.02, arch, 0.0)
		var p2 := offset + dir * blen + Vector3(sin(float(i) + 1.0) * 0.04, arch * 0.25, 0.0)
		var w0 := 0.011
		var w1 := 0.007
		st.set_uv(Vector2(0.0, 0.0)); st.add_vertex(p0 - side * w0)
		st.set_uv(Vector2(1.0, 0.0)); st.add_vertex(p0 + side * w0)
		st.set_uv(Vector2(1.0, 0.55)); st.add_vertex(p1 + side * w1)
		st.set_uv(Vector2(0.0, 0.0)); st.add_vertex(p0 - side * w0)
		st.set_uv(Vector2(1.0, 0.55)); st.add_vertex(p1 + side * w1)
		st.set_uv(Vector2(0.0, 0.55)); st.add_vertex(p1 - side * w1)

		st.set_uv(Vector2(0.0, 0.55)); st.add_vertex(p1 - side * w1)
		st.set_uv(Vector2(1.0, 0.55)); st.add_vertex(p1 + side * w1)
		st.set_uv(Vector2(0.5, 1.0)); st.add_vertex(p2)
	st.generate_normals()
	return st.commit()

static func _create_shaving_cluster_mesh() -> ArrayMesh:
	var st := ShipGeometry.begin(StandardMaterial3D.new())
	for i in range(4):
		var a := float(i) * 1.57 + 0.2
		var dir := Vector3(cos(a), 0.0, sin(a))
		var side := Vector3(-dir.z, 0.0, dir.x)
		var o := Vector3(cos(a + 0.9) * 0.06, float(i % 2) * 0.006, sin(a + 0.9) * 0.06)
		var p0 := o - dir * 0.06
		var p1 := o + Vector3(0.0, 0.018, 0.0)
		var p2 := o + dir * 0.075 + side * 0.025 + Vector3(0.0, 0.004, 0.0)
		ShipGeometry.quad(st, p0 - side * 0.015, p0 + side * 0.015, p1 + side * 0.012, p1 - side * 0.012)
		ShipGeometry.quad(st, p1 - side * 0.012, p1 + side * 0.012, p2 + side * 0.003, p2 - side * 0.003)
	st.generate_normals()
	return st.commit()

static func _create_bone_mesh() -> ArrayMesh:
	# Malla ligera de hueso con epífisis ensanchadas en los extremos
	var st := ShipGeometry.begin(StandardMaterial3D.new())
	_tapered_tube(st, [
		Vector3(0.0, 0.0, -0.18), Vector3(0.0, 0.004, -0.10),
		Vector3(0.0, 0.008, 0.0), Vector3(0.0, 0.004, 0.10), Vector3(0.0, 0.0, 0.18)
	], [0.032, 0.018, 0.016, 0.019, 0.034], 6, 0.36)
	st.generate_normals()
	return st.commit()

static func _create_feather_mesh() -> ArrayMesh:
	# Pluma estilizada de ave/arpía con cañón central y barbillas inclinadas
	var st := ShipGeometry.begin(StandardMaterial3D.new())
	var pts := [Vector3(0, 0, 0), Vector3(0.008, 0.012, 0.14), Vector3(0.015, 0.005, 0.28)]
	var widths := [0.008, 0.036, 0.010]
	for i in range(2):
		var w0: float = widths[i]
		var w1: float = widths[i + 1]
		var p0: Vector3 = pts[i]
		var p1: Vector3 = pts[i + 1]
		var v0 := float(i) * 0.5
		var v1 := float(i + 1) * 0.5
		st.set_uv(Vector2(0.0, v0)); st.add_vertex(p0 - Vector3(w0, 0, 0))
		st.set_uv(Vector2(1.0, v0)); st.add_vertex(p0 + Vector3(w0, 0, 0))
		st.set_uv(Vector2(1.0, v1)); st.add_vertex(p1 + Vector3(w1, 0, 0))
		st.set_uv(Vector2(0.0, v0)); st.add_vertex(p0 - Vector3(w0, 0, 0))
		st.set_uv(Vector2(1.0, v1)); st.add_vertex(p1 + Vector3(w1, 0, 0))
		st.set_uv(Vector2(0.0, v1)); st.add_vertex(p1 - Vector3(w1, 0, 0))
	st.generate_normals()
	return st.commit()

static func _tapered_tube(st: SurfaceTool, path: Array[Vector3], radii: Array[float], sides: int, length_scale: float) -> void:
	var rings: Array = []
	for i in range(path.size()):
		var axis := (path[mini(i + 1, path.size() - 1)] - path[maxi(0, i - 1)]).normalized()
		if axis.length_squared() < 0.0001:
			axis = Vector3.FORWARD
		var reference := Vector3.UP if absf(axis.dot(Vector3.UP)) < 0.92 else Vector3.RIGHT
		var u := axis.cross(reference).normalized()
		var v := u.cross(axis).normalized()
		var rad := radii[mini(i, radii.size() - 1)]
		var ring: Array[Vector3] = []
		for k in range(sides):
			var ang := TAU * float(k) / float(sides)
			ring.append(path[i] + rad * (u * cos(ang) + v * sin(ang)))
		rings.append(ring)
	var n_seg := maxi(1, rings.size() - 1)
	for i in range(n_seg):
		var v0 := (float(i) / float(n_seg)) * length_scale * 1.4
		var v1 := (float(i + 1) / float(n_seg)) * length_scale * 1.4
		for k in range(sides):
			var kn := (k + 1) % sides
			var u0 := float(k) / float(sides)
			var u1 := float(k + 1) / float(sides)
			var a: Vector3 = rings[i][k]
			var b: Vector3 = rings[i + 1][k]
			var c: Vector3 = rings[i + 1][kn]
			var d: Vector3 = rings[i][kn]
			st.set_uv(Vector2(u0, v0)); st.add_vertex(a)
			st.set_uv(Vector2(u0, v1)); st.add_vertex(b)
			st.set_uv(Vector2(u1, v1)); st.add_vertex(c)
			st.set_uv(Vector2(u0, v0)); st.add_vertex(a)
			st.set_uv(Vector2(u1, v1)); st.add_vertex(c)
			st.set_uv(Vector2(u1, v0)); st.add_vertex(d)
	for end in [0, path.size() - 1]:
		for k in range(sides):
			var corners: Array = [path[end], rings[end][(k + 1) % sides], rings[end][k]] if end == 0 else [path[end], rings[end][k], rings[end][(k + 1) % sides]]
			for vx: Vector3 in corners:
				st.set_uv(Vector2(vx.x * 2.0, vx.z * 2.0))
				st.add_vertex(vx)

static func _emit_multimesh_batch(parent: Node3D, node_name: String, mesh: Mesh, mat: Material, transforms: Array[Transform3D], cast_shadows: bool = true) -> MultiMeshInstance3D:
	var mm := MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	mm.mesh = mesh
	mm.instance_count = transforms.size()
	for i in range(transforms.size()):
		mm.set_instance_transform(i, transforms[i])
	var mmi := MultiMeshInstance3D.new()
	mmi.name = node_name
	mmi.multimesh = mm
	mmi.material_override = mat
	mmi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON if cast_shadows else GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parent.add_child(mmi)
	return mmi

static func _build_continuous_base_layer(parent: Node3D, mats: Dictionary) -> void:
	var bed_st := ShipGeometry.begin(mats["bed_dark"])
	var sectors := 56
	var rings := 12
	var r_inner_base := 0.44
	var r_outer_max := 2.82
	var pts: Array = []
	for r_i in range(rings + 1):
		var t := float(r_i) / float(rings)
		var ring_pts: Array[Vector3] = []
		for s in range(sectors + 1):
			var a := float(s) / float(sectors) * TAU
			var r := lerpf(r_inner_base, r_outer_max, t)
			var dx := cos(a) * r
			var dz := sin(a) * r
			var h := nest_surface_height(dx, dz)

			var diff_notch := atan2(sin(a - CLIMB_NOTCH_RAD), cos(a - CLIMB_NOTCH_RAD))
			var notch_feather := smoothstep(0.24, 0.50, absf(diff_notch))
			if r > 1.48:
				h = lerpf(-0.025, h, notch_feather)
			var peep := exp(-pow(Vector2(dx - 0.10, dz - 0.95).length() / 0.34, 2.0)) \
				+ exp(-pow(Vector2(dx + 0.92, dz - 0.62).length() / 0.28, 2.0))
			if peep > 0.65 and r > 0.62 and r < 1.56:
				h = lerpf(h, -0.020, clampf((peep - 0.65) * 3.0, 0.0, 1.0))
			ring_pts.append(NEST_CENTER + Vector3(dx, h, dz))
		pts.append(ring_pts)

	for r_i in range(rings):
		for s in range(sectors):
			var a: Vector3 = pts[r_i][s]
			var b: Vector3 = pts[r_i][s + 1]
			var c: Vector3 = pts[r_i + 1][s + 1]
			var d: Vector3 = pts[r_i + 1][s]
			ShipGeometry.quad(bed_st, a, d, c, b)
	ShipGeometry.commit(parent, "NestFibreBowl", bed_st)

static func _populate_woven_branches(parent: Node3D, branch_lib: Array[ArrayMesh], mats: Dictionary, ambiance: NestAmbianceController) -> void:
	var tone_keys: Array[String] = ["bark_dark", "bark_grey", "bark_warm", "bark_moss"]
	var buckets: Dictionary = {}
	for v_idx in range(branch_lib.size()):
		for t_key in tone_keys:
			buckets["%d_%s" % [v_idx, t_key]] = [] as Array[Transform3D]
	var front_rim_xforms: Array[Transform3D] = []

	var rng := RandomNumberGenerator.new()
	rng.seed = 20261119

	# A) Gran canasta exterior densa en capas apiladas (r = 1.64..2.52)
	for i in range(185):
		var a := float(i) * 0.6180339 * TAU + rng.randf_range(-0.14, 0.14)
		var diff_notch := atan2(sin(a - CLIMB_NOTCH_RAD), cos(a - CLIMB_NOTCH_RAD))
		if absf(diff_notch) < 0.44:
			continue
		var r := rng.randf_range(1.64, 2.52)
		var dx := cos(a) * r
		var dz := sin(a) * r
		var layer_lift := (float(i % 4) * 0.065) + rng.randf_range(-0.01, 0.09)
		var base_h := maxf(nest_surface_height(dx, dz) + layer_lift, 0.40 if r > 2.34 else 0.08)
		var yaw := a + PI * 0.5 + (1.0 if i % 2 == 0 else -1.0) * rng.randf_range(0.26, 0.94)
		var pitch := rng.randf_range(-0.20, 0.26)
		var roll := rng.randf_range(-0.45, 0.45)
		var sc := Vector3(rng.randf_range(0.85, 1.24), rng.randf_range(0.84, 1.20), rng.randf_range(0.82, 1.18))
		var v_idx := i % 4
		var t_key := "bark_moss" if (r > 2.34 and i % 4 == 0) else tone_keys[i % 3]
		buckets["%d_%s" % [v_idx, t_key]].append(
			Transform3D(Basis.from_euler(Vector3(pitch, -yaw, roll)).scaled(sc), NEST_CENTER + Vector3(dx, base_h, dz))
		)

	# B) Entramado denso interior atravesando toda la superficie y apoyado en el mástil
	for i in range(185):
		var a := float(i) * 2.39996 + rng.randf_range(-0.18, 0.18)
		var r := sqrt(rng.randf_range(0.12, 0.92)) * 1.85
		if r < 0.48:
			r = rng.randf_range(0.49, 0.80)
		var diff_notch := atan2(sin(a - CLIMB_NOTCH_RAD), cos(a - CLIMB_NOTCH_RAD))
		if absf(diff_notch) < 0.45 and r > 1.15:
			continue
		var dx := cos(a) * r
		var dz := sin(a) * r
		if Vector2(dx - 0.85, dz - 0.88).length() < 0.46:
			continue
		var base_h := nest_surface_height(dx, dz) + rng.randf_range(-0.005, 0.055) + (0.055 if i % 4 == 0 else 0.0)
		var yaw := a + PI * 0.5 + rng.randf_range(-1.15, 1.15)
		var pitch := rng.randf_range(-0.12, 0.16)
		if r < 0.84 and i % 2 == 0:
			yaw = atan2(dz, dx)
			pitch = rng.randf_range(0.24, 0.46)
			base_h += 0.07
		var v_idx := 1 + (i % 4)
		var t_key := tone_keys[(i + 1) % 3]
		var s_val := rng.randf_range(0.68, 1.06)
		var sc := Vector3(s_val, s_val * rng.randf_range(0.85, 1.15), s_val * rng.randf_range(0.75, 1.12))
		buckets["%d_%s" % [v_idx, t_key]].append(
			Transform3D(Basis.from_euler(Vector3(pitch, -yaw, rng.randf_range(-0.4, 0.4))).scaled(sc), NEST_CENTER + Vector3(dx, base_h, dz))
		)

	# C) Ramas entretejidas entre barrotes por encima de la brazola (y >= 0.46..0.74)
	# El sector frontal hacia cámara se separa para atenuar su visibilidad si tapa un sprite 2D (Paso 9.5)
	var basket_segs := 16
	for s_i in range(basket_segs):
		if s_i == 2 or s_i == 3:
			continue
		var a0 := (float(s_i) + 0.18) / float(basket_segs) * TAU
		var a1 := (float(s_i) + 0.82) / float(basket_segs) * TAU
		for k in range(2):
			var am := lerpf(a0, a1, 0.30 + float(k) * 0.42)
			var dx := cos(am) * 2.66
			var dz := sin(am) * 2.66
			var h := rng.randf_range(0.46, 0.74)
			var yaw := am + PI * 0.5 + rng.randf_range(-0.20, 0.20)
			var pitch := rng.randf_range(-0.14, 0.18)
			var sc := Vector3(0.76, 0.76, rng.randf_range(0.74, 0.96))
			var xf := Transform3D(Basis.from_euler(Vector3(pitch, -yaw, rng.randf_range(-0.35, 0.35))).scaled(sc), NEST_CENTER + Vector3(dx, h, dz))
			if s_i <= 1 or s_i >= 14:
				front_rim_xforms.append(xf)
			else:
				var v_idx := 2 if k == 0 else 4
				var t_key := "bark_moss" if s_i % 3 == 0 else tone_keys[s_i % 3]
				buckets["%d_%s" % [v_idx, t_key]].append(xf)

	var first_twig_group: MultiMeshInstance3D = null
	for v_idx in range(branch_lib.size()):
		for t_key in tone_keys:
			var arr: Array[Transform3D] = buckets["%d_%s" % [v_idx, t_key]]
			if arr.is_empty():
				continue
			var mm_name := "NestWovenTwigs" if first_twig_group == null else ("NestBranches_%d_%s" % [v_idx, t_key])
			var mmi := _emit_multimesh_batch(parent, mm_name, branch_lib[v_idx], mats[t_key], arr, v_idx <= 2)
			if first_twig_group == null:
				first_twig_group = mmi
			if v_idx == 2 and t_key == "bark_warm" and ambiance:
				ambiance.flex_branch_nodes.append(mmi)

	if not front_rim_xforms.is_empty():
		var front_mmi := _emit_multimesh_batch(parent, "NestFrontRimBranches", branch_lib[2], mats["bark_front_fade"], front_rim_xforms, false)
		if ambiance:
			ambiance.front_rim_nodes.append(front_mmi)

static func _populate_straw_and_shavings(parent: Node3D, mats: Dictionary, ambiance: NestAmbianceController) -> void:
	var straw_mesh := _create_straw_sweep_mesh()
	var shaving_mesh := _create_shaving_cluster_mesh()
	var rng := RandomNumberGenerator.new()
	rng.seed = 404119

	var gold_xforms: Array[Transform3D] = []
	var pale_xforms: Array[Transform3D] = []
	var shav_xforms: Array[Transform3D] = []

	for i in range(230):
		var a := float(i) * 2.39996 + rng.randf_range(-0.14, 0.14)
		var r := lerpf(0.46, 2.52, sqrt(fmod(float(i) * 0.381966, 1.0)))
		var diff_notch := atan2(sin(a - CLIMB_NOTCH_RAD), cos(a - CLIMB_NOTCH_RAD))
		if absf(diff_notch) < 0.44 and r > 1.20:
			continue
		var dx := cos(a) * r
		var dz := sin(a) * r
		if Vector2(dx - 0.85, dz - 0.88).length() < 0.46:
			continue
		var dy := nest_surface_height(dx, dz) + rng.randf_range(-0.004, 0.042)
		if r > 2.10:
			dy += rng.randf_range(0.02, 0.07)
		var flow_yaw := a + PI * 0.5 + rng.randf_range(-1.25, 1.25)
		var pitch := rng.randf_range(-0.14, 0.18)
		var sc_v := rng.randf_range(0.85, 1.38)
		var xf := Transform3D(Basis.from_euler(Vector3(pitch, -flow_yaw, rng.randf_range(-0.22, 0.22))).scaled(Vector3(sc_v, sc_v * rng.randf_range(0.8, 1.2), sc_v * rng.randf_range(0.85, 1.25))), NEST_CENTER + Vector3(dx, dy, dz))
		if i % 3 == 0:
			pale_xforms.append(xf)
		else:
			gold_xforms.append(xf)

	for i in range(110):
		var a := float(i) * 1.6180339 * TAU + rng.randf_range(-0.12, 0.12)
		var r := rng.randf_range(0.62, 2.48)
		var diff_notch := atan2(sin(a - CLIMB_NOTCH_RAD), cos(a - CLIMB_NOTCH_RAD))
		if absf(diff_notch) < 0.40 and r > 1.25:
			continue
		var dx := cos(a) * r
		var dz := sin(a) * r
		var dy := nest_surface_height(dx, dz) + 0.014
		var s_xz := rng.randf_range(0.85, 1.35)
		var xf := Transform3D(Basis.from_euler(Vector3(rng.randf_range(-0.10, 0.10), rng.randf_range(0.0, TAU), rng.randf_range(-0.10, 0.10))).scaled(Vector3(s_xz, rng.randf_range(0.8, 1.25), s_xz)), NEST_CENTER + Vector3(dx, dy, dz))
		shav_xforms.append(xf)

	_emit_multimesh_batch(parent, "NestStrawBundles", straw_mesh, mats["straw_gold"], gold_xforms, false)
	_emit_multimesh_batch(parent, "NestDryGrassBase", straw_mesh, mats["straw_pale"], pale_xforms, false)
	_emit_multimesh_batch(parent, "NestWoodShavings", shaving_mesh, mats["shaving_oak"], shav_xforms, false)
	if ambiance:
		ambiance.sway_materials.append(mats["straw_gold"])
		ambiance.sway_materials.append(mats["straw_pale"])

static func _build_mast_rail_integration(parent: Node3D, mats: Dictionary) -> void:
	var root_st := ShipGeometry.begin(mats["bark_dark"])
	var rope_st := ShipGeometry.begin(mats["rope_scrap"])
	var rag_st := ShipGeometry.begin(mats["sail_rag"])

	for p_i in [0, 4, 6, 9, 12, 14]:
		var a := float(p_i) / 16.0 * TAU
		var p_post := NEST_CENTER + Vector3(cos(a) * 2.84, 0.0, sin(a) * 2.84)
		var spiral: Array[Vector3] = []
		for k in range(10):
			var t := float(k) / 9.0
			var ka := a + t * TAU * 1.4
			var kr := 0.125 + sin(t * PI) * 0.025
			spiral.append(p_post + Vector3(cos(ka) * kr, lerpf(0.20, 0.72, t), sin(ka) * kr))
		ShipGeometry.tube(root_st, spiral, 0.017, 5)

	for r_i in range(4):
		var start_a := float(r_i) * 1.55 + 2.1
		var r_path: Array[Vector3] = []
		for k in range(8):
			var t := float(k) / 7.0
			var a := start_a + t * 0.75
			var rad := lerpf(0.60 if r_i == 0 else 1.70, 2.74, sin(t * PI * 0.75))
			var dx := cos(a) * rad
			var dz := sin(a) * rad
			r_path.append(NEST_CENTER + Vector3(dx, nest_surface_height(dx, dz) + 0.05 + sin(t * PI) * 0.06, dz))
		ShipGeometry.tube(rope_st, r_path, 0.023, 5)

	var rag_angles := [-0.42, 2.25, 3.68, -1.78, 5.25]
	for idx in range(rag_angles.size()):
		var ang: float = rag_angles[idx]
		var out := Vector3(cos(ang), 0.0, sin(ang))
		var tang := Vector3(-sin(ang), 0.0, cos(ang))
		var dx_in := out.x * 1.88
		var dz_in := out.z * 1.88
		var p_in := NEST_CENTER + Vector3(dx_in, nest_surface_height(dx_in, dz_in) + 0.03, dz_in)
		var p_rim := NEST_CENTER + out * 2.82 + Vector3(0.0, 0.66 if idx % 2 == 0 else 0.80, 0.0)
		var p_hang := NEST_CENTER + out * 2.98 + Vector3(0.0, 0.28 if idx % 2 == 0 else 0.40, 0.0)
		var w := 0.28
		ShipGeometry.quad(rag_st, p_in - tang * w * 0.48, p_in + tang * w * 0.48, p_rim + tang * w * 0.56, p_rim - tang * w * 0.40)
		ShipGeometry.quad(rag_st, p_rim - tang * w * 0.40, p_rim + tang * w * 0.56, p_hang + tang * w * 0.14, p_hang - tang * w * 0.34)

	ShipGeometry.commit(parent, "NestPostVineWraps", root_st)
	ShipGeometry.commit(parent, "NestRopeScraps", rope_st)
	ShipGeometry.commit(parent, "NestSailRags", rag_st)

static func _add_crevice_contact_shadows(parent: Node3D) -> void:
	PbrMaterialKit.add_contact_ao_disc(parent, NEST_CENTER + Vector3(0.0, 0.04, 0.0), 0.90, 0.90, 0.58, 0.0)
	PbrMaterialKit.add_contact_ao_disc(parent, NEST_CENTER + HARPY_REST_OFFSET + Vector3(0.0, 0.04, 0.0), 0.70, 0.65, 0.44, 0.0)
	for i in range(10):
		var a := float(i) / 10.0 * TAU + 0.22
		if absf(atan2(sin(a - CLIMB_NOTCH_RAD), cos(a - CLIMB_NOTCH_RAD))) < 0.45:
			continue
		var r := 2.15 + (float(i % 2) * 0.22)
		var dx := cos(a) * r
		var dz := sin(a) * r
		PbrMaterialKit.add_contact_ao_disc(parent, NEST_CENTER + Vector3(dx, maxf(0.04, nest_surface_height(dx, dz) - 0.14), dz), 0.55, 0.50, 0.38, 0.0)

static func _build_weathered_skull(parent: Node3D, pos: Vector3, yaw_deg: float, bone_mat: Material, socket_mat: Material) -> void:
	var sk := Node3D.new()
	sk.position = pos
	sk.rotation_degrees = Vector3(-16.0, yaw_deg, 12.0)
	parent.add_child(sk)
	var cranium := MeshInstance3D.new()
	var cr_s := SphereMesh.new()
	cr_s.radius = 0.125; cr_s.height = 0.22; cr_s.radial_segments = 10; cr_s.rings = 6
	cranium.mesh = cr_s
	cranium.material_override = bone_mat
	cranium.scale = Vector3(0.86, 0.88, 1.06)
	sk.add_child(cranium)
	var jaw := MeshInstance3D.new()
	var jw_b := BoxMesh.new()
	jw_b.size = Vector3(0.092, 0.045, 0.11)
	jaw.mesh = jw_b
	jaw.material_override = bone_mat
	jaw.position = Vector3(0.0, -0.060, 0.065)
	sk.add_child(jaw)
	for sx: float in [-0.040, 0.040]:
		var eye := MeshInstance3D.new()
		var ey_s := SphereMesh.new()
		ey_s.radius = 0.028; ey_s.height = 0.044
		eye.mesh = ey_s
		eye.material_override = socket_dark_or(socket_mat)
		eye.position = Vector3(sx, -0.008, 0.102)
		eye.scale = Vector3(1.0, 0.95, 0.45)
		sk.add_child(eye)
	PbrMaterialKit.add_contact_ao_disc(parent, Vector3(pos.x, pos.y - 0.04, pos.z), 0.22, 0.22, 0.52, 0.0)

static func socket_dark_or(mat: Material) -> Material:
	return mat

static func _build_block_b_prey_and_feathers(parent: Node3D, mats: Dictionary, ambiance: NestAmbianceController) -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = 505119

	# 5.7 Dos cráneos destacados semienterrados entre las ramas (nunca saturados)
	var sk1_dx := -1.80; var sk1_dz := 0.82
	var sk2_dx := 1.48; var sk2_dz := -1.68
	_build_weathered_skull(parent, NEST_CENTER + Vector3(sk1_dx, nest_surface_height(sk1_dx, sk1_dz) + 0.068, sk1_dz), 38.0, mats["bone"], mats["socket_dark"])
	_build_weathered_skull(parent, NEST_CENTER + Vector3(sk2_dx, nest_surface_height(sk2_dx, sk2_dz) + 0.075, sk2_dz), -112.0, mats["bone"], mats["socket_dark"])

	# 5.1 & 5.2 Huesos pequeños y huesos largos semienterrados e inclinados dentro del entramado
	var bone_mesh := _create_bone_mesh()
	var bone_xforms: Array[Transform3D] = []
	for i in range(24):
		var a := float(i) * 2.15 + 0.42
		var diff_notch := atan2(sin(a - CLIMB_NOTCH_RAD), cos(a - CLIMB_NOTCH_RAD))
		if absf(diff_notch) < 0.45:
			continue
		var r := rng.randf_range(0.88, 2.38)
		var dx := cos(a) * r
		var dz := sin(a) * r
		# Semienterrado: parte asoma entre las ramas sin flotar encima ni quedar sepultado por completo
		var h := nest_surface_height(dx, dz) + (0.032 if i < 8 else 0.018)
		var is_long := (i < 6)
		var sc_l := rng.randf_range(1.05, 1.38) if is_long else rng.randf_range(0.45, 0.82)
		var sc_w := rng.randf_range(0.82, 1.15) if is_long else rng.randf_range(0.55, 0.85)
		var rot := Vector3(rng.randf_range(-0.34, 0.34), rng.randf_range(0.0, TAU), rng.randf_range(-0.25, 0.25))
		bone_xforms.append(Transform3D(Basis.from_euler(rot).scaled(Vector3(sc_w, sc_w, sc_l)), NEST_CENTER + Vector3(dx, h, dz)))
	_emit_multimesh_batch(parent, "NestBones", bone_mesh, mats["bone"], bone_xforms, false)

	# 5.3 Plumas de diferentes tamaños y tonalidades (rojizo arpía, pizarra y crema) dentro del nido
	var feather_mesh := _create_feather_mesh()
	var f_rust: Array[Transform3D] = []
	var f_dark: Array[Transform3D] = []
	var f_pale: Array[Transform3D] = []
	for i in range(52):
		var a := float(i) * 2.39996 + rng.randf_range(-0.18, 0.18)
		var diff_notch := atan2(sin(a - CLIMB_NOTCH_RAD), cos(a - CLIMB_NOTCH_RAD))
		if absf(diff_notch) < 0.46:
			continue
		var r := rng.randf_range(0.82, 2.52)
		var dx := cos(a) * r
		var dz := sin(a) * r
		var h := nest_surface_height(dx, dz) + rng.randf_range(0.018, 0.065)
		if r > 2.15:
			h += rng.randf_range(0.04, 0.14)
		var sc_f := rng.randf_range(0.68, 1.42)
		var rot := Vector3(rng.randf_range(-0.24, 0.28), rng.randf_range(0.0, TAU), rng.randf_range(-0.22, 0.22))
		var xf := Transform3D(Basis.from_euler(rot).scaled(Vector3(sc_f, sc_f, sc_f)), NEST_CENTER + Vector3(dx, h, dz))
		if i % 3 == 0:
			f_rust.append(xf)
		elif i % 3 == 1:
			f_dark.append(xf)
		else:
			f_pale.append(xf)

	_emit_multimesh_batch(parent, "NestFeathersDark", feather_mesh, mats["feather_dark"], f_dark, false)
	_emit_multimesh_batch(parent, "NestFeathersRust", feather_mesh, mats["feather_rust"], f_rust, false)
	_emit_multimesh_batch(parent, "NestFeathersPale", feather_mesh, mats["feather_pale"], f_pale, false)
	if ambiance:
		ambiance.sway_materials.append(mats["feather_dark"])
		ambiance.sway_materials.append(mats["feather_rust"])
		ambiance.sway_materials.append(mats["feather_pale"])

	# 5.4 Mechones de pelo atrapados y enganchados entre ramas y barrotes
	var hair_st := ShipGeometry.begin(mats["hair_dark"])
	var hair_g_st := ShipGeometry.begin(mats["hair_grey"])
	for i in range(18):
		var a := float(i) * 1.97 + 0.35
		var diff_notch := atan2(sin(a - CLIMB_NOTCH_RAD), cos(a - CLIMB_NOTCH_RAD))
		if absf(diff_notch) < 0.45:
			continue
		var r := rng.randf_range(1.42, 2.65)
		var dx := cos(a) * r
		var dz := sin(a) * r
		var h := nest_surface_height(dx, dz) + rng.randf_range(0.04, 0.12)
		var base := NEST_CENTER + Vector3(dx, h, dz)
		var target_h := hair_st if i % 3 != 0 else hair_g_st
		ShipGeometry.tube(target_h, [
			base,
			base + Vector3(cos(a + 0.8) * 0.12, 0.032, sin(a + 0.8) * 0.12),
			base + Vector3(cos(a + 1.5) * 0.22, -0.01, sin(a + 1.5) * 0.22),
		], 0.0085, 4)
	ShipGeometry.commit(parent, "NestHairTufts", hair_st)
	ShipGeometry.commit(parent, "NestHairWispsGrey", hair_g_st)

	# 5.5 & 5.6 Fragmentos dispersos de telas y prendas deterioradas enganchados en las ramas
	var cloth_r_st := ShipGeometry.begin(mats["cloth_red"])
	for i in range(6):
		var a := float(i) * 1.08 + 2.05
		var diff_notch := atan2(sin(a - CLIMB_NOTCH_RAD), cos(a - CLIMB_NOTCH_RAD))
		if absf(diff_notch) < 0.48:
			continue
		var r := rng.randf_range(1.48, 2.48)
		var dx := cos(a) * r
		var dz := sin(a) * r
		var p := NEST_CENTER + Vector3(dx, nest_surface_height(dx, dz) + 0.04, dz)
		var d1 := Vector3(cos(a + 0.4) * 0.19, 0.035, sin(a + 0.4) * 0.19)
		var d2 := Vector3(-sin(a + 0.4) * 0.12, -0.025, cos(a + 0.4) * 0.12)
		ShipGeometry.quad(cloth_r_st, p - d1, p + d1 * 0.6 - d2, p + d1 + d2, p - d1 * 0.4 + d2 * 1.1)
	ShipGeometry.commit(parent, "NestPreyClothScraps", cloth_r_st)

static func _build_block_b_treasures(parent: Node3D, mats: Dictionary) -> void:
	# 6.1-6.4 Los 5 objetos exactos del PDF escondidos parcialmente entre ramas y fibras, sin aura mágica
	var tr_root := Node3D.new()
	tr_root.name = "NestTreasures_C10"
	parent.add_child(tr_root)

	# 1. Pulsera pequeña de oro (25 po) medio oculta bajo ramas en el lado norte-este
	var brac_dx := 1.32; var brac_dz := -1.28
	var brac := MeshInstance3D.new()
	brac.name = "Treasure_GoldBracelet"
	var bt := TorusMesh.new()
	bt.inner_radius = 0.038; bt.outer_radius = 0.056; bt.rings = 14; bt.ring_segments = 8
	brac.mesh = bt
	brac.material_override = mats["gold_treasure"]
	brac.position = NEST_CENTER + Vector3(brac_dx, nest_surface_height(brac_dx, brac_dz) + 0.038, brac_dz)
	brac.rotation_degrees = Vector3(24.0, 18.0, -14.0)
	tr_root.add_child(brac)

	# 2. Pendiente único de oro (25 po) enganchado en una rama del borde norte
	var ear_dx := -0.22; var ear_dz := -2.05
	var ear := MeshInstance3D.new()
	ear.name = "Treasure_GoldEarring"
	var et := TorusMesh.new()
	et.inner_radius = 0.016; et.outer_radius = 0.028; et.rings = 12; et.ring_segments = 6
	ear.mesh = et
	ear.material_override = mats["gold_treasure"]
	ear.position = NEST_CENTER + Vector3(ear_dx, nest_surface_height(ear_dx, ear_dz) + 0.098, ear_dz)
	ear.rotation_degrees = Vector3(78.0, 35.0, 12.0)
	tr_root.add_child(ear)

	# 3 y 4. Dos gemas pequeñas de ojo de tigre (10 po cada una) parcialmente enterradas en fibra/paja
	for tg_idx in range(2):
		var t_pos := Vector2(1.68, -0.42) if tg_idx == 0 else Vector2(-1.02, 1.38)
		var gem := MeshInstance3D.new()
		gem.name = "Treasure_TigerEye_%d" % (tg_idx + 1)
		var gs := SphereMesh.new()
		gs.radius = 0.028; gs.height = 0.026
		gem.mesh = gs
		gem.material_override = mats["tiger_eye"]
		gem.position = NEST_CENTER + Vector3(t_pos.x, nest_surface_height(t_pos.x, t_pos.y) + 0.016, t_pos.y)
		gem.rotation_degrees = Vector3(12.0, float(tg_idx) * 48.0, -8.0)
		tr_root.add_child(gem)

	# 5. Una gema de heliotropo (50 po) semioculta cerca del hueco de descanso
	var h_dx := -1.38; var h_dz := -1.32
	var blood := MeshInstance3D.new()
	blood.name = "Treasure_Heliotrope"
	var bc := CylinderMesh.new()
	bc.top_radius = 0.020; bc.bottom_radius = 0.036; bc.height = 0.032; bc.radial_segments = 6
	blood.mesh = bc
	blood.material_override = mats["bloodstone"]
	blood.position = NEST_CENTER + Vector3(h_dx, nest_surface_height(h_dx, h_dz) + 0.018, h_dz)
	blood.rotation_degrees = Vector3(8.0, 26.0, 14.0)
	tr_root.add_child(blood)

static func build_complete_nest(parent: Node3D, mats: Dictionary, scene_tree_owner: Node) -> NestAmbianceController:
	var ambiance := NestAmbianceController.new()
	ambiance.name = "NestAmbianceController"
	parent.add_child(ambiance)

	# Bloque A (Pasos 1-4): Estructura orgánica del nido (85-95% cobertura)
	_build_continuous_base_layer(parent, mats)
	var branch_lib := _create_branch_library()
	_populate_woven_branches(parent, branch_lib, mats, ambiance)
	_populate_straw_and_shavings(parent, mats, ambiance)
	_build_mast_rail_integration(parent, mats)
	_add_crevice_contact_shadows(parent)

	# Bloque B (Pasos 5-7): Restos de presas, plumas, telas, 5 tesoros ocultos y registro sin duplicar
	_build_block_b_prey_and_feathers(parent, mats, ambiance)
	_build_block_b_treasures(parent, mats)

	var prop_nest := InteractiveProp.new()
	prop_nest.name = "PropHarpyNestC10"
	prop_nest.prop_id = "c10_nest"
	prop_nest.prompt_text = "Registrar nido"
	prop_nest.inspection_message = "Rebuscas entre el denso entramado de ramas, virutas, hierba seca y restos."
	prop_nest.position = Vector3(0.35, 15.22, -0.48)
	prop_nest.interaction_radius = 2.7
	prop_nest.prop_interacted.connect(func():
		ambiance.play_nest_rustle()
		var ui := scene_tree_owner.get_tree().root.find_child("VttRoleUi", true, false)
		if ui and ui.has_method("loot_c10_nest"):
			var res: Dictionary = ui.loot_c10_nest()
			if bool(res.get("already_looted", false)):
				prop_nest.inspection_message = "El nido ya fue registrado: solo quedan ramas, paja, plumas y huesos viejos."
				var inv := scene_tree_owner.get_tree().root.find_child("InventoryManager", true, false)
				if inv and inv.has_method("show_notification"):
					inv.show_notification(prop_nest.inspection_message)
			else:
				prop_nest.prompt_text = "Examinar nido (registrado)"
				prop_nest.inspection_message = "Hallaste el tesoro escondido: pulsera de oro (25 po), pendiente de oro (25 po), 2 gemas ojo de tigre (10 po c/u) y 1 heliotropo (50 po)."
	)
	parent.add_child(prop_nest)
	return ambiance
