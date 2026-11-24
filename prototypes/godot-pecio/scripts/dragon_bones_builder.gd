class_name DragonBonesBuilder
extends Node3D

const PbrMaterialKit = preload("res://scripts/pbr_material_kit.gd")
const Geometry = preload("res://scripts/ship_geometry.gd")
const WreckStructure = preload("res://scripts/wreck_structure.gd")

# Reconstrucción Anatómica y Canónica de los Huesos de Clyssavar (Dragón de Oro Antiguo)
# Basado en engine/client/wreck-dragon-bones.ts y D&D 5e Cap. 3 pp. 22-27

var mat_bone_gold: Material
var mat_bone_dark: Material
var mat_socket: StandardMaterial3D

var _skull_root: Node3D
var _rib_curves_for_breach: Array[Dictionary] = []

var _prebuilt: bool = false

func _ready() -> void:
	prebuild()

func prebuild() -> void:
	if _prebuilt:
		return
	_prebuilt = true
	_rib_curves_for_breach.clear()
	setup_materials()
	build_dragon_skull()
	build_titanic_ribs()
	build_spine_vertebrae()
	build_bow_dragon_remains()
	build_bone_hull_breach_splinters()
	build_distant_skeletal_spires()

func setup_materials() -> void:
	mat_bone_gold = PbrMaterialKit.create_dragon_bone_shader_material("#d2bb86", "#4e3e26")
	mat_bone_dark = PbrMaterialKit.create_dragon_bone_shader_material("#9c8558", "#352a19")

	mat_socket = StandardMaterial3D.new()
	mat_socket.albedo_color = Color("#111514")
	mat_socket.roughness = 0.95

func build_dragon_skull() -> void:
	# Cráneo mastodóntico del Dragón de Oro posado sobre la cresta del arrecife suroeste
	_skull_root = Node3D.new()
	_skull_root.name = "GoldDragonSkull"
	_skull_root.position = Vector3(-23.2, 3.65, 15.1)
	_skull_root.rotation_degrees = Vector3(-4, 126, 12)
	add_child(_skull_root)

	var skull_inst := MeshInstance3D.new()
	skull_inst.name = "GoldDragonSkullMesh"
	skull_inst.material_override = mat_bone_gold
	_skull_root.add_child(skull_inst)

	_refine_skull_visual(skull_inst)
	skull_inst.create_trimesh_collision()

func _refine_skull_visual(instance: MeshInstance3D) -> void:
	var shell := Geometry.begin(mat_bone_gold)
	var recess := Geometry.begin(mat_socket)

	# Bóveda craneal cerrada desde el cóndilo occipital (x=-4.1) hasta el hocico (x=+4.1)
	# Escalado mastodóntico (~1.55x respecto al boceto inicial) y con cúpula trasera sólida
	var sections: Array[Vector4] = [
		Vector4(-4.15, 0.34, 0.24, 0.28),
		Vector4(-3.70, 0.42, 0.56, 0.72),
		Vector4(-3.05, 0.58, 0.92, 1.24),
		Vector4(-2.25, 1.02, 1.26, 1.72),
		Vector4(-1.05, 1.06, 1.44, 1.68),
		Vector4(0.18, 0.78, 1.02, 1.78),
		Vector4(1.12, 0.42, 0.76, 1.44),
		Vector4(2.35, 0.20, 0.54, 0.98),
		Vector4(3.98, -0.14, 0.34, 0.48),
	]
	const RING_SIDES := 16
	var rings: Array = []
	for s_idx in range(sections.size()):
		var section := sections[s_idx]
		var ring: Array[Vector3] = []
		for k in range(RING_SIDES):
			var angle := TAU * float(k) / float(RING_SIDES)
			# Cresta nasal/sagitoparietal dorsal en la parte superior (+Y) y quilla yugal lateral
			var dorsal_ridge := maxf(0.0, sin(angle))
			var ridge_boost := pow(dorsal_ridge, 4.0) * (0.28 if s_idx in [2, 3, 4] else 0.12)
			var zygomatic := pow(absf(cos(angle)), 3.0) * (0.24 if s_idx == 5 else 0.0)
			var y := section.y + sin(angle) * (section.z + ridge_boost)
			var z := cos(angle) * (section.w + zygomatic)
			ring.append(Vector3(section.x, y, z))
		rings.append(ring)

	# Paredes externas del cráneo con normales CW hacia el exterior
	for i in range(rings.size() - 1):
		for k in range(RING_SIDES):
			var kn := (k + 1) % RING_SIDES
			if i in [4, 5] and k in [15, 0, 7, 8]:
				continue # Aberturas orbitales reales
			_emit_quad_outward(shell, rings[i][k], rings[i][kn], rings[i + 1][kn], rings[i + 1][k], float(i) * 0.2, float(k) / float(RING_SIDES))

	# Tapas cerradas con normales hacia afuera (-X en el occipucio, +X en el hocico)
	var occ_center := Vector3(sections[0].x - 0.22, sections[0].y, 0.0)
	var snout_center := Vector3(sections[sections.size() - 1].x + 0.26, sections[sections.size() - 1].y - 0.04, 0.0)
	for k in range(RING_SIDES):
		var kn := (k + 1) % RING_SIDES
		_emit_tri_uv(shell, occ_center, rings[0][k], rings[0][kn], Vector2(0.1, 0.1))
		var last_ring: Array[Vector3] = rings[rings.size() - 1]
		_emit_tri_uv(shell, snout_center, last_ring[kn], last_ring[k], Vector2(0.9, 0.9))

	# Crestas supraorbitales y pómulos acorazados + cuernos / dientes / mandíbula
	for side in [1.0, -1.0]:
		var k := 0 if side > 0 else 8
		var lo := (k + 15) % RING_SIDES
		var hi := (k + 1) % RING_SIDES
		var edge: Array[Vector3] = [
			rings[4][lo], rings[5][lo], rings[6][lo], rings[6][k],
			rings[6][hi], rings[5][hi], rings[4][hi], rings[4][k],
		]
		var orbit_center := Vector3(0.18, 0.80, side * 0.78)
		for n in range(edge.size()):
			var a := edge[n]
			var b := edge[(n + 1) % edge.size()]
			var inner_a := orbit_center + (a - orbit_center) * 0.44
			var inner_b := orbit_center + (b - orbit_center) * 0.44
			_emit_quad_outward(shell, a, b, inner_b, inner_a, float(n) * 0.15, 0.5)
			_emit_tri_uv(recess, inner_a, inner_b, orbit_center, Vector2(0.5, 0.5))

		# Arco cigomático y cresta orbital protuberante
		add_flanged_bone_tube(shell, [
			Vector3(-2.35, 1.72, side * 1.10),
			Vector3(-0.70, 1.98, side * 1.48),
			Vector3(0.65, 1.42, side * 1.62),
			Vector3(1.55, 0.85, side * 1.24),
		], 0.24, 0.20, 0.14, 0.12, 8, false, true)

		# Mandíbula inferior maciza desencajada en rugido
		add_flanged_bone_tube(shell, [
			Vector3(-2.45, -0.62, side * 2.02),
			Vector3(-1.05, -1.54, side * 1.72),
			Vector3(0.95, -2.08, side * 1.12),
			Vector3(3.38, -2.32, side * 0.30),
		], 0.30, 0.36, 0.20, 0.24, 8, true, true)

		# Colmillos superiores curvados
		for tooth_x in [3.22, 1.76, 0.20]:
			for section_i in range(sections.size() - 1):
				if tooth_x >= sections[section_i].x and tooth_x <= sections[section_i + 1].x:
					var t: float = (tooth_x - sections[section_i].x) / (sections[section_i + 1].x - sections[section_i].x)
					var section := sections[section_i].lerp(sections[section_i + 1], t)
					var base := Vector3(tooth_x, section.y - section.z * 0.68, side * section.w * 0.74)
					var mid := base + Vector3(-0.10, -0.48, -side * 0.04)
					var tip := base + Vector3(-0.24, -0.98, -side * 0.06)
					add_flanged_bone_tube(shell, [base, mid, tip], 0.24, 0.20, 0.04, 0.04, 8, false, true)
					break

		# Dientes inferiores
		for tooth_x in [0.42, 1.25, 2.15, 2.95]:
			var t: float = clampf((tooth_x - 0.95) / 2.43, 0.0, 1.0)
			var z: float = lerpf(1.12, 0.30, t) if tooth_x >= 0.95 else lerpf(1.72, 1.12, (tooth_x + 1.05) / 2.0)
			var y: float = lerpf(-2.08, -2.32, t)
			var b := Vector3(tooth_x, y + 0.10, side * z)
			add_flanged_bone_tube(shell, [b, b + Vector3(0.12, 0.72, -side * 0.03)], 0.14, 0.12, 0.03, 0.03, 7, false, true)

		# Barbillones óseos del mentón (Gold Dragon Chin Barbels)
		add_flanged_bone_tube(shell, [
			Vector3(3.05, -2.42, side * 0.46),
			Vector3(2.85, -3.15, side * 0.64),
			Vector3(2.55, -3.88, side * 0.78),
		], 0.21, 0.20, 0.04, 0.04, 8, true, true)

		# Cuernos Mayores retorcidos hacia atrás (~9.5 metros)
		add_flanged_bone_tube(shell, [
			Vector3(-1.55, 2.08, side * 0.86),
			Vector3(-3.35, 3.45, side * 1.48),
			Vector3(-6.10, 3.18, side * 2.25),
			Vector3(-8.85, 1.72, side * 2.75),
		], 0.64, 0.56, 0.09, 0.09, 10, true, true, 0.25)

		# Cuernos secundarios de la corona
		add_flanged_bone_tube(shell, [
			Vector3(-2.30, 2.25, side * 0.54),
			Vector3(-3.95, 3.75, side * 0.94),
			Vector3(-5.85, 3.35, side * 1.18),
		], 0.40, 0.36, 0.06, 0.06, 9, true, true)

	# Sínfisis del mentón uniendo ambas ramas mandibulares
	add_flanged_bone_tube(shell, [
		Vector3(3.38, -2.32, -0.32),
		Vector3(3.62, -2.38, 0.0),
		Vector3(3.38, -2.32, 0.32),
	], 0.23, 0.26, 0.23, 0.26, 8, false, false)

	# Cresta nasal serrada dorsal y espolones de corona para romper silueta en cuña
	for cr_cfg in [
		[Vector3(2.85, 0.34, 0.0), Vector3(2.45, 0.88, 0.0), 0.14],
		[Vector3(1.55, 0.80, 0.0), Vector3(1.05, 1.48, 0.0), 0.18],
		[Vector3(-0.35, 1.42, 0.0), Vector3(-1.05, 2.25, 0.0), 0.22],
		[Vector3(-1.85, 1.62, 0.0), Vector3(-2.65, 2.48, 0.0), 0.24],
	]:
		add_flanged_bone_tube(shell, [cr_cfg[0], cr_cfg[1]], cr_cfg[2], cr_cfg[2] * 0.72, 0.035, 0.035, 6, false, true, 0.25)

	# Fosas nasales talladas en la punta del hocico
	for n_side in [-1.0, 1.0]:
		var nc := Vector3(3.35, 0.08, n_side * 0.36)
		_emit_tri_uv(recess, nc + Vector3(0.24, -0.05, 0.0), nc + Vector3(-0.20, 0.14, n_side * 0.08), nc + Vector3(-0.18, -0.10, n_side * 0.10), Vector2(0.5, 0.5))

	shell.index()
	shell.generate_normals()
	shell.generate_tangents()
	instance.mesh = shell.commit()
	instance.set_meta("refined_anatomy", true)

	recess.index()
	recess.generate_normals()
	Geometry.commit(instance, "OrbitalCavities", recess)

	# Percebes y algas colgantes en la mandíbula y bases del cráneo de Clyssavar
	PbrMaterialKit.add_barnacle_cluster(_skull_root, Vector3(0.4, -1.9, 1.35), Vector3(0.2, -0.2, 1.0), 7, 0.12, 701)
	PbrMaterialKit.add_barnacle_cluster(_skull_root, Vector3(-1.4, -1.3, -1.65), Vector3(-0.2, -0.2, -1.0), 6, 0.11, 702)
	PbrMaterialKit.add_kelp_strand(_skull_root, Vector3(1.1, -1.95, 1.15), Vector3(0.0, -1.0, 0.18), 1.45, 0.22, 711)
	PbrMaterialKit.add_kelp_strand(_skull_root, Vector3(-2.2, -0.65, 1.95), Vector3(0.0, -1.0, 0.15), 1.65, 0.24, 712)

func build_titanic_ribs() -> void:
	# Costillas titánicas que acunan, sostienen y atraviesan el casco desde el arrecife de estribor
	var ribs_node := Node3D.new()
	ribs_node.name = "TitanicRibs"
	add_child(ribs_node)

	var st := Geometry.begin(mat_bone_gold)
	var st_dark := Geometry.begin(mat_bone_dark)

	# 10 costillas monumentales de estribor (popa y cintura): las posteriores perforan la brecha de popa (x < -19)
	# y las de cintura acunan el pantoque exterior sin invadir la cubierta transitable ni la zona del bote (x=2.5, z=14.8).
	var rib_cradle_configs := [
		{"root": Vector3(-29.2, -4.6, 15.8), "mid": Vector3(-28.4, 2.6, 12.2), "tip": Vector3(-27.2, -1.2, 6.2), "r_base": 0.84, "r_tip": 0.20},
		{"root": Vector3(-26.2, -4.5, 16.6), "mid": Vector3(-25.4, 3.1, 12.6), "tip": Vector3(-24.2, -1.0, 6.0), "r_base": 0.88, "r_tip": 0.22},
		{"root": Vector3(-23.2, -4.4, 16.8), "mid": Vector3(-22.5, 3.4, 12.8), "tip": Vector3(-21.2, -0.8, 6.4), "r_base": 0.86, "r_tip": 0.22},
		{"root": Vector3(-20.0, -4.4, 16.4), "mid": Vector3(-19.5, 3.2, 12.5), "tip": Vector3(-18.6, -0.5, 7.6), "r_base": 0.82, "r_tip": 0.20},
		{"root": Vector3(-16.8, -4.6, 15.8), "mid": Vector3(-16.2, 2.9, 12.2), "tip": Vector3(-15.5, 0.8, 9.5), "r_base": 0.78, "r_tip": 0.18},
		{"root": Vector3(-13.8, -4.8, 15.2), "mid": Vector3(-13.2, 2.5, 11.8), "tip": Vector3(-12.8, 1.3, 9.6), "r_base": 0.74, "r_tip": 0.18},
		{"root": Vector3(-10.8, -4.9, 14.6), "mid": Vector3(-10.2, 1.25, 11.4), "tip": Vector3(-10.0, -0.35, 9.6), "r_base": 0.68, "r_tip": 0.16},
		{"root": Vector3(-7.8,  -5.0, 14.0), "mid": Vector3(-7.4,  0.95, 11.0), "tip": Vector3(-7.2,  -0.55, 9.5), "r_base": 0.62, "r_tip": 0.16},
		# Contracostillas rotas mordiendo el forro exterior de babor-popa sin invadir suelo C4
		{"root": Vector3(-32.5, -4.8, -11.4), "mid": Vector3(-31.2, 1.8, -9.6), "tip": Vector3(-29.8, -0.25, -7.2), "r_base": 0.74, "r_tip": 0.18},
		{"root": Vector3(-28.5, -4.8, -11.2), "mid": Vector3(-27.6, 1.5, -10.1), "tip": Vector3(-26.8, -0.45, -8.8), "r_base": 0.66, "r_tip": 0.16},
	]
	for cfg in rib_cradle_configs:
		add_sculpted_rib_arch(st, cfg["root"], cfg["mid"], cfg["tip"], cfg["r_base"], cfg["r_tip"], 14, 10)
		_rib_curves_for_breach.append(cfg)

	# Fragmentos de esternón / placa ósea encallados en el arrecife de estribor bajo las costillas
	for sx in [-26.0, -21.0, -15.5]:
		add_flanged_bone_tube(st_dark, [
			Vector3(sx - 1.8, -2.5, 13.8),
			Vector3(sx, -1.7, 13.1),
			Vector3(sx + 1.8, -2.3, 12.6),
		], 0.62, 0.34, 0.42, 0.24, 8, true, true)

	_commit_bone_mesh(ribs_node, "TitanicRibsMesh", st)
	_commit_bone_mesh(ribs_node, "SternumPlatesMesh", st_dark)

func build_spine_vertebrae() -> void:
	# Cuello cervical conectado al occipucio del cráneo y columna vertebral ondulante por todo el arrecife de popa
	var spine_node := Node3D.new()
	spine_node.name = "VertebraeSpine"
	add_child(spine_node)

	var st_gold := Geometry.begin(mat_bone_gold)
	var st_dark := Geometry.begin(mat_bone_dark)

	# Punto anatómico exacto del cóndilo occipital en espacio mundo para soldar el cuello al cráneo
	var neck_anchor := _skull_root.transform * Vector3(-3.65, 0.36, 0.0)
	var spine_curve := _sample_catmull([
		neck_anchor,
		neck_anchor + Vector3(0.75, -0.55, 1.15),
		Vector3(-20.4, 1.10, 18.0),
		Vector3(-24.8, -0.45, 17.8),
		Vector3(-29.8, -1.65, 16.0),
		Vector3(-34.8, 0.65, 13.8),
		Vector3(-39.8, -1.45, 11.4),
		Vector3(-44.8, 0.15, 8.6),
		Vector3(-50.0, -3.40, 5.2),
	], 24)

	# Núcleo espinal articulado que se estrecha hacia la cola y se sumerge en las olas
	add_flanged_bone_tube(st_dark, spine_curve, 0.86, 0.78, 0.30, 0.28, 10, true, true, 0.08)

	for i in range(spine_curve.size() - 1):
		var pos := spine_curve[i]
		var fwd := (spine_curve[mini(i + 1, spine_curve.size() - 1)] - spine_curve[maxi(0, i - 1)]).normalized()
		var t := float(i) / float(spine_curve.size() - 1)
		var v_size := lerpf(2.25, 1.15, t)
		add_vertebra_segment(st_gold, pos, fwd, v_size)

	_commit_bone_mesh(spine_node, "CervicalNeckAndSpine", st_gold)
	_commit_bone_mesh(spine_node, "SpineCentrumCore", st_dark)

func build_bow_dragon_remains() -> void:
	# Segundo foco óseo mastodóntico en proa (arrecife norte bajo el trinquete/bauprés y costado estribor de proa)
	var bow_node := Node3D.new()
	bow_node.name = "BowDragonRemains"
	add_child(bow_node)

	var st_gold := Geometry.begin(mat_bone_gold)
	var st_dark := Geometry.begin(mat_bone_dark)

	# 5 enormes costillas pectorales sobresaliendo sobre el arrecife norte y rozando la amura de babor
	for idx in range(5):
		var rx := 18.5 + float(idx) * 3.5
		var root := Vector3(rx, -4.8, -14.8 - sin(float(idx) * 0.7) * 1.2)
		var mid := Vector3(rx - 0.6, 2.7 + (0.7 if idx == 2 else 0.0), -11.4)
		var tip := Vector3(rx - 1.5, -0.3 + (0.9 if idx in [1, 2] else 0.0), -6.4)
		var r_base := 0.78 - float(idx) * 0.05
		add_sculpted_rib_arch(st_gold, root, mid, tip, r_base, 0.18, 12, 10)
		_rib_curves_for_breach.append({"root": root, "mid": mid, "tip": tip, "r_base": r_base, "r_tip": 0.18})

	# 3 grandes costillas de estribor en proa mordiendo la amura exterior sin invadir C7 ni al bote
	for s_idx in range(3):
		var sx := 17.5 + float(s_idx) * 3.8
		var outer_beam := WreckStructure.get_beam_at(sx)
		var s_root := Vector3(sx, -4.9, outer_beam + 3.6)
		var s_mid := Vector3(sx - 0.3, 1.85, outer_beam + 1.05)
		var s_tip := Vector3(sx - 0.6, -0.15, outer_beam - 0.18)
		add_sculpted_rib_arch(st_gold, s_root, s_mid, s_tip, 0.70, 0.16, 12, 10)
		_rib_curves_for_breach.append({"root": s_root, "mid": s_mid, "tip": s_tip, "r_base": 0.70, "r_tip": 0.16})

	# Esqueleto de ala colosal de dragón con cóndilos articulares y falanges arqueadas
	var shoulder := Vector3(26.5, -1.2, -12.6)
	var elbow := Vector3(30.4, 2.3, -14.2)
	var wrist := Vector3(32.8, 4.2, -11.8)
	add_flanged_bone_tube(st_dark, [shoulder, elbow, wrist], 0.82, 0.68, 0.56, 0.48, 10, true, true)
	# Cóndilo grueso de la muñeca alar
	add_flanged_bone_tube(st_gold, [wrist - Vector3(0.45, 0.15, 0.25), wrist + Vector3(0.45, 0.15, -0.25)], 0.78, 0.68, 0.68, 0.58, 10, true, true)

	var finger_tips: Array[Vector3] = [
		Vector3(39.0, 2.4, -8.8),
		Vector3(37.8, 0.8, -13.4),
		Vector3(35.0, -0.2, -17.2),
		Vector3(30.2, 0.2, -18.8),
	]
	for f_i in range(finger_tips.size()):
		var f_tip: Vector3 = finger_tips[f_i]
		var f_p1 := wrist.lerp(f_tip, 0.28) + Vector3(0.0, 0.85, 0.0)
		var f_p2 := wrist.lerp(f_tip, 0.65) + Vector3(0.0, 0.72, 0.0)
		var spar_pts := _sample_catmull([wrist, f_p1, f_p2, f_tip], 8)
		add_flanged_bone_tube(st_gold, spar_pts, 0.36 - float(f_i) * 0.03, 0.26, 0.06, 0.05, 8, true, true, 0.20)

	_commit_bone_mesh(bow_node, "BowRibsAndWingMesh", st_gold)
	_commit_bone_mesh(bow_node, "BowWingJointMesh", st_dark)

func _eval_rib_quad(root: Vector3, mid: Vector3, tip: Vector3, t: float) -> Vector3:
	var u := 1.0 - t
	return (u * u) * root + (2.0 * u * t) * mid + (t * t) * tip

func _append_plank_breach(st_oak: SurfaceTool, st_dark: SurfaceTool, hit_x: float, deck_y: float, side: float, rib_r: float, seed_idx: int) -> void:
	var beam_here := WreckStructure.get_beam_at(hit_x)
	var z_skin := side * (beam_here + 0.05)
	var skin_pos := WreckStructure.get_world_pos(hit_x, deck_y, z_skin)
	var d_beam := (WreckStructure.get_beam_at(clampf(hit_x + 0.5, WreckStructure.STERN_X + 0.2, WreckStructure.BOW_X - 0.2)) - WreckStructure.get_beam_at(clampf(hit_x - 0.5, WreckStructure.STERN_X + 0.2, WreckStructure.BOW_X - 0.2)))
	var tan_x := Vector3(1.0, 0.0, side * d_beam).normalized()
	var outward := Vector3(-side * d_beam, 0.10, side).normalized()
	var up_v := Vector3(0.0, 1.0, 0.0)

	var hole_w := clampf(rib_r * 1.60, 0.42, 0.88)
	var hole_h := clampf(rib_r * 1.35, 0.34, 0.72)

	# 1. Grieta oscura de madera aplastada y cavidad desgarrada rodeando la perforación en el forro y la borda
	for v_sign: float in [-1.0, 1.0]:
		var seam_a := skin_pos - tan_x * (hole_w * 1.45) + up_v * (v_sign * hole_h) - outward * 0.03
		var seam_b := skin_pos + tan_x * (hole_w * 1.45) + up_v * (v_sign * hole_h) - outward * 0.03
		Geometry.beam(st_dark, seam_a, seam_b, 0.18, 0.13, 0.88)
	for h_sign: float in [-1.0, 1.0]:
		var jamb_a := skin_pos + tan_x * (h_sign * hole_w * 1.02) - up_v * (hole_h * 1.10) - outward * 0.02
		var jamb_b := skin_pos + tan_x * (h_sign * hole_w * 1.02) + up_v * (hole_h * 1.10) + outward * 0.06
		Geometry.beam(st_dark, jamb_a, jamb_b, 0.16, 0.11, 0.80)
	# Grietas longitudinales propagándose por las tracas adyacentes
	for cr_sign: float in [-1.0, 1.0]:
		var cr0 := skin_pos + tan_x * (cr_sign * hole_w * 0.95) + up_v * (cr_sign * 0.18) + outward * 0.02
		var cr1 := skin_pos + tan_x * (cr_sign * (hole_w * 2.25)) + up_v * (cr_sign * 0.30) + outward * 0.01
		Geometry.beam(st_dark, cr0, cr1, 0.07, 0.05, 0.35)

	# 2. Tracas reales de roble resquebrajadas y levantadas hacia fuera y hacia dentro (cara exterior + interior visible desde C1)
	var plank_configs := [
		{"dx": -1.0, "dy":  0.62, "len": 1.15, "tilt":  0.24, "peel":  0.34, "w": 0.17},
		{"dx":  1.0, "dy":  0.50, "len": 1.08, "tilt": -0.28, "peel":  0.30, "w": 0.16},
		{"dx": -1.0, "dy": -0.34, "len": 1.18, "tilt": -0.20, "peel":  0.36, "w": 0.18},
		{"dx":  1.0, "dy": -0.48, "len": 1.04, "tilt":  0.26, "peel":  0.28, "w": 0.16},
		# Astillas empujadas hacia el interior de cubierta para que al mirar desde C1 se vea el desgarro real
		{"dx": -0.85, "dy":  0.30, "len": 0.92, "tilt":  0.18, "peel": -0.40, "w": 0.15},
		{"dx":  0.85, "dy": -0.22, "len": 0.90, "tilt": -0.22, "peel": -0.38, "w": 0.15},
	]
	for p_i in range(plank_configs.size()):
		var pc: Dictionary = plank_configs[p_i]
		var dx := float(pc["dx"])
		var dy := float(pc["dy"])
		var plen := float(pc["len"])
		var tilt := float(pc["tilt"])
		var peel := float(pc["peel"])
		var jitter := sin(float(seed_idx * 5 + p_i * 3)) * 0.08
		var pk0: Vector3 = skin_pos + tan_x * (dx * hole_w * 1.42) + up_v * (dy * hole_h + jitter) - outward * 0.02
		var pk1: Vector3 = skin_pos + tan_x * (dx * (hole_w * 0.30 - plen * 0.25)) + up_v * (dy * hole_h + tilt * 0.42 + jitter) + outward * (peel + signf(peel) * absf(jitter))
		Geometry.beam(st_oak, pk0, pk1, float(pc["w"]), 0.052, 0.20)

func build_bone_hull_breach_splinters() -> void:
	# Impacto físico real de los huesos perforando el casco: tablones de roble levantados y
	# collarines oscuros de fractura anclados exactamente sobre el forro exterior del casco.
	var breach_node := Node3D.new()
	breach_node.name = "BoneHullBreachSplinters"
	add_child(breach_node)

	var mat_splinter: StandardMaterial3D = PbrMaterialKit.create_oak_furniture_pbr("#6d5235")
	mat_splinter.roughness = 0.92
	var mat_fracture: StandardMaterial3D = PbrMaterialKit.create_weathered_hull_pbr("#1d130c")
	mat_fracture.roughness = 0.98

	var zones := {
		"Hull": {
			"oak": Geometry.begin(mat_splinter),
			"dark": Geometry.begin(mat_fracture),
			"node_name": "BreachSplinters_Hull",
			"count": 0,
		},
		"AftFront": {
			"oak": Geometry.begin(mat_splinter),
			"dark": Geometry.begin(mat_fracture),
			"node_name": "BreachSplinters_AftFront",
			"count": 0,
		},
		"ForeFront": {
			"oak": Geometry.begin(mat_splinter),
			"dark": Geometry.begin(mat_fracture),
			"node_name": "BreachSplinters_ForeFront",
			"count": 0,
		},
	}

	for rib_idx in range(_rib_curves_for_breach.size()):
		var cfg: Dictionary = _rib_curves_for_breach[rib_idx]
		var r0: Vector3 = cfg["root"]
		var r1: Vector3 = cfg["mid"]
		var r2: Vector3 = cfg["tip"]
		var rb: float = float(cfg["r_base"])
		var rt: float = float(cfg["r_tip"])

		var prev_p := _eval_rib_quad(r0, r1, r2, 0.0)
		var prev_margin := absf(prev_p.z) - WreckStructure.get_beam_at(clampf(prev_p.x, WreckStructure.STERN_X, WreckStructure.BOW_X))
		var hit_found := false
		var closest_margin := 999.0
		var closest_t := 0.5
		for s in range(1, 29):
			var t := float(s) / 28.0
			var cur_p := _eval_rib_quad(r0, r1, r2, t)
			var cur_beam := WreckStructure.get_beam_at(cur_p.x)
			var cur_margin := absf(cur_p.z) - cur_beam
			if cur_beam > 1.5 and absf(cur_margin) < closest_margin:
				closest_margin = absf(cur_margin)
				closest_t = t
			if prev_margin > 0.0 and cur_margin <= 0.0 and cur_beam > 1.5:
				var alpha := prev_margin / maxf(0.0001, prev_margin - cur_margin)
				var t_hit := lerpf(float(s - 1) / 28.0, t, alpha)
				var hit_p := _eval_rib_quad(r0, r1, r2, t_hit)
				var side := 1.0 if hit_p.z >= 0.0 else -1.0
				var deck_y := hit_p.y - WreckStructure.get_list_height(hit_p.z)
				var wall_top := 4.15 if absf(hit_p.x) >= 13.5 else 1.55
				if deck_y >= -3.2 and deck_y <= wall_top:
					var rib_r := lerpf(rb, rt, t_hit)
					var zone_key := "Hull"
					if side > 0.0 and deck_y > 0.05:
						if hit_p.x >= -26.5 and hit_p.x <= -13.5:
							zone_key = "AftFront"
						elif hit_p.x >= 13.5:
							zone_key = "ForeFront"
					var zd: Dictionary = zones[zone_key]
					_append_plank_breach(zd["oak"], zd["dark"], hit_p.x, clampf(deck_y, -2.8, wall_top - 0.15), side, rib_r, rib_idx)
					zd["count"] = int(zd["count"]) + 1
					hit_found = true
				break
			prev_p = cur_p
			prev_margin = cur_margin
		# También marcar desgarros en costillas que muerden/rozan el borde de la amurada (<= 0.55 m)
		if not hit_found and closest_margin <= 0.55:
			var cp := _eval_rib_quad(r0, r1, r2, closest_t)
			var side_c := 1.0 if cp.z >= 0.0 else -1.0
			var deck_yc := cp.y - WreckStructure.get_list_height(cp.z)
			var wall_top_c := 4.15 if absf(cp.x) >= 13.5 else 1.55
			if deck_yc >= -3.0 and deck_yc <= wall_top_c:
				var rib_rc := lerpf(rb, rt, closest_t)
				var zkc := "Hull"
				if side_c > 0.0 and deck_yc > 0.05:
					if cp.x >= -26.5 and cp.x <= -13.5:
						zkc = "AftFront"
					elif cp.x >= 13.5:
						zkc = "ForeFront"
				var zdc: Dictionary = zones[zkc]
				_append_plank_breach(zdc["oak"], zdc["dark"], cp.x, clampf(deck_yc, -2.8, wall_top_c - 0.15), side_c, rib_rc, rib_idx + 40)
				zdc["count"] = int(zdc["count"]) + 1

	for zk: String in zones.keys():
		var zd: Dictionary = zones[zk]
		if int(zd["count"]) == 0:
			continue
		var znode := Node3D.new()
		znode.name = zd["node_name"]
		breach_node.add_child(znode)
		var mi_splinters := _commit_bone_mesh(znode, zd["node_name"] + "_Oak", zd["oak"])
		mi_splinters.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		var mi_bruise := _commit_bone_mesh(znode, zd["node_name"] + "_Bruise", zd["dark"])
		mi_bruise.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON

func build_distant_skeletal_spires() -> void:
	# Restos distantes del esqueleto descomunal emergiendo de escollos exteriores
	var distant_node := Node3D.new()
	distant_node.name = "DistantSkeletalSpires"
	add_child(distant_node)

	var st := Geometry.begin(mat_bone_dark)

	# Escollo noroeste (babor-popa lejano): arco caudal emergiendo en cresta y hundiéndose bajo las olas
	var nw_spine := _sample_catmull([
		Vector3(-37.5, -4.2, -15.5),
		Vector3(-32.8, 0.2, -17.0),
		Vector3(-27.2, 1.9, -16.0),
		Vector3(-23.0, -3.8, -14.6),
	], 12)
	add_flanged_bone_tube(st, nw_spine, 0.64, 0.54, 0.20, 0.18, 10, true, true, 0.08)
	for i in range(2, nw_spine.size() - 2, 2):
		var fwd := (nw_spine[i + 1] - nw_spine[i - 1]).normalized()
		add_vertebra_segment(st, nw_spine[i], fwd, 1.55)

	# Escollo sureste (estribor-proa lejano, muy lejos de la ruta del bote)
	var se_configs := [
		[Vector3(24.5, -4.6, 19.8), Vector3(26.2, 2.4, 18.4), Vector3(28.5, -1.2, 16.6)],
		[Vector3(28.5, -4.6, 20.6), Vector3(30.4, 2.0, 19.2), Vector3(32.5, -1.5, 17.4)],
	]
	for tri in se_configs:
		add_sculpted_rib_arch(st, tri[0], tri[1], tri[2], 0.68, 0.16, 10, 8)

	_commit_bone_mesh(distant_node, "DistantSpiresMesh", st)

static func add_sculpted_rib_arch(st: SurfaceTool, root: Vector3, mid: Vector3, tip: Vector3, r_base: float, r_tip: float, steps: int = 12, sides: int = 10) -> void:
	var pts: Array[Vector3] = []
	for i in range(steps + 1):
		var t := float(i) / float(steps)
		var u := 1.0 - t
		pts.append(root * (u * u) + mid * (2.0 * u * t) + tip * (t * t))
	add_flanged_bone_tube(st, pts, r_base, r_base * 0.72, r_tip, r_tip * 0.78, sides, true, true)

static func add_flanged_bone_tube(st: SurfaceTool, points: Array[Vector3], rx_base: float, ry_base: float, rx_tip: float, ry_tip: float, sides: int = 10, cap_start: bool = true, cap_end: bool = true, ridge_boost: float = 0.14) -> void:
	if points.size() < 2:
		return
	var rings: Array = []
	var prev_side := Vector3.ZERO
	for i in range(points.size()):
		var t := float(i) / float(points.size() - 1)
		var dir: Vector3
		if i == 0:
			dir = (points[1] - points[0]).normalized()
		elif i == points.size() - 1:
			dir = (points[i] - points[i - 1]).normalized()
		else:
			dir = (points[i + 1] - points[i - 1]).normalized()
		if dir.length_squared() < 0.0001:
			dir = Vector3.RIGHT

		var side: Vector3
		if prev_side.length_squared() > 0.1:
			side = (prev_side - dir * prev_side.dot(dir)).normalized()
		if side.length_squared() < 0.01:
			var ref := Vector3.UP if absf(dir.dot(Vector3.UP)) < 0.94 else Vector3.RIGHT
			side = dir.cross(ref).normalized()
		prev_side = side
		var up := side.cross(dir).normalized()

		var rx := lerpf(rx_base, rx_tip, t)
		var ry := lerpf(ry_base, ry_tip, t)
		var ring: Array[Vector3] = []
		for k in range(sides):
			var angle := TAU * float(k) / float(sides)
			# Perfil óseo ligeramente aquillado en dorsal/ventral para silueta orgánica
			var keel := 1.0 + ridge_boost * maxf(0.0, absf(sin(angle)) - 0.5)
			ring.append(points[i] + side * (cos(angle) * rx) + up * (sin(angle) * ry * keel))
		rings.append(ring)

	for i in range(rings.size() - 1):
		for k in range(sides):
			var kn := (k + 1) % sides
			_emit_quad_outward(st, rings[i][k], rings[i][kn], rings[i + 1][kn], rings[i + 1][k], float(i) / float(rings.size() - 1), float(k) / float(sides))

	if cap_start:
		var c0 := points[0]
		for k in range(sides):
			_emit_tri_uv(st, c0, rings[0][k], rings[0][(k + 1) % sides], Vector2(0.0, float(k) / float(sides)))
	if cap_end:
		var clast := points[points.size() - 1]
		var rlast: Array[Vector3] = rings[rings.size() - 1]
		for k in range(sides):
			_emit_tri_uv(st, clast, rlast[(k + 1) % sides], rlast[k], Vector2(1.0, float(k) / float(sides)))

static func add_vertebra_segment(st: SurfaceTool, pos: Vector3, forward: Vector3, size: float) -> void:
	var fwd := forward.normalized() if forward.length_squared() > 0.001 else Vector3.RIGHT
	var side := fwd.cross(Vector3.UP).normalized()
	if side.length_squared() < 0.01:
		side = Vector3.FORWARD
	var up := side.cross(fwd).normalized()

	# Anillo articular vertebral en reloj de arena (epífisis ensanchadas)
	add_flanged_bone_tube(st, [
		pos - fwd * (size * 0.26),
		pos,
		pos + fwd * (size * 0.26),
	], size * 0.44, size * 0.40, size * 0.42, size * 0.38, 10, true, true, 0.12)

	# Proceso espinoso dorsal ancho y curvado hacia atrás como vela fósil
	add_flanged_bone_tube(st, [
		pos + up * (size * 0.22),
		pos + up * (size * 0.92) - fwd * (size * 0.24),
		pos + up * (size * 1.48) - fwd * (size * 0.62),
	], size * 0.24, size * 0.12, size * 0.04, 0.04, 7, false, true, 0.28)

	# Procesos transversos arqueados hacia abajo como raíces costales
	for s in [-1.0, 1.0]:
		add_flanged_bone_tube(st, [
			pos,
			pos + side * (s * size * 0.42) - up * (size * 0.10),
			pos + side * (s * size * 0.68) - up * (size * 0.46) - fwd * (size * 0.14),
		], size * 0.16, size * 0.12, size * 0.04, 0.04, 6, false, true)

static func _emit_quad_outward(st: SurfaceTool, c00: Vector3, c01: Vector3, c11: Vector3, c10: Vector3, u0: float, v0: float) -> void:
	_emit_tri_uv(st, c00, c01, c11, Vector2(u0, v0))
	_emit_tri_uv(st, c00, c11, c10, Vector2(u0 + 0.1, v0 + 0.1))

static func _emit_tri_uv(st: SurfaceTool, a: Vector3, b: Vector3, c: Vector3, uv_base: Vector2) -> void:
	st.set_uv(uv_base)
	st.add_vertex(a)
	st.set_uv(uv_base + Vector2(0.15, 0.0))
	st.add_vertex(b)
	st.set_uv(uv_base + Vector2(0.15, 0.15))
	st.add_vertex(c)

static func _sample_catmull(pts: Array[Vector3], total_samples: int) -> Array[Vector3]:
	var out: Array[Vector3] = []
	if pts.size() < 2:
		return pts
	for s in range(total_samples + 1):
		var u := float(s) / float(total_samples) * float(pts.size() - 1)
		var i := clampi(int(floor(u)), 0, pts.size() - 2)
		var t := u - float(i)
		var p0 := pts[maxi(0, i - 1)]
		var p1 := pts[i]
		var p2 := pts[i + 1]
		var p3 := pts[mini(pts.size() - 1, i + 2)]
		var t2 := t * t
		var t3 := t2 * t
		var p := 0.5 * (
			(2.0 * p1)
			+ (-p0 + p2) * t
			+ (2.0 * p0 - 5.0 * p1 + 4.0 * p2 - p3) * t2
			+ (-p0 + 3.0 * p1 - 3.0 * p2 + p3) * t3
		)
		out.append(p)
	return out

static func _commit_bone_mesh(parent: Node3D, node_name: String, st: SurfaceTool) -> MeshInstance3D:
	st.index()
	st.generate_normals()
	st.generate_tangents()
	var mi := MeshInstance3D.new()
	mi.name = node_name
	mi.mesh = st.commit()
	parent.add_child(mi)
	mi.create_trimesh_collision()
	return mi
