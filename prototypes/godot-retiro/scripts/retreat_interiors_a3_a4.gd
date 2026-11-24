@tool
class_name RetreatInteriorsA3A4
extends RefCounted

# ==============================================================================
# FASES 3 Y 4 — INTERIORES EXCAVADOS DE A3 (COMEDOR/COCINA) Y A4 (BIBLIOTECA)
# - Fase 3 (A3): Arquitectura rocosa excavada + pilastras + contrafuertes + bóveda
#   recortable, suelo diferenciado comedor/cocina, fogón con campana y chimenea,
#   caldero suspendido, isla de preparación, despensa, leñera, utensilios murales,
#   mesas de tablones de roble con vajilla asimétrica realista (cero manchas blancas)
#   y aparador monástico.
# - Fase 4 (A4): Arquitectura académica diferenciada con 6 hornacinas en arco en
#   la pared norte, suelo de losa gris-caliza, estanterías altas con libros de
#   paleta sobria medieval (cuero, verde bosque, burdeos, pergamino, sin neones)
#   en MultiMesh, 2 puestos de scriptorium detallados, mesa de cartografía insular
#   y esfera armilar / astrolabio 3D de bronce sobre pedestal tallado y alfombra.
# ==============================================================================

const Structure = preload("res://scripts/retreat_structure.gd")
const SceneEnhancer = preload("res://scripts/retreat_scene_enhancer.gd")
const UpperArch = preload("res://scripts/retreat_upper_architecture.gd")

# ------------------------------------------------------------------------------
# UTILIDADES GEOMÉTRICAS Y BATCHING MULTIMESH
# ------------------------------------------------------------------------------
static func _box(parent: Node3D, pos: Vector3, sz: Vector3, mat: Material, shadow: bool = true, node_name: String = "") -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	if not node_name.is_empty():
		mi.name = node_name
	var bm := BoxMesh.new()
	bm.size = sz
	mi.mesh = bm
	mi.material_override = mat
	mi.position = pos
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON if shadow else GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parent.add_child(mi)
	return mi

static func _cyl(parent: Node3D, pos: Vector3, radius: float, height: float, mat: Material, radial_segs: int = 12, shadow: bool = true, node_name: String = "") -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	if not node_name.is_empty():
		mi.name = node_name
	var cm := CylinderMesh.new()
	cm.top_radius = radius
	cm.bottom_radius = radius
	cm.height = height
	cm.radial_segments = radial_segs
	mi.mesh = cm
	mi.material_override = mat
	mi.position = pos
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON if shadow else GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parent.add_child(mi)
	return mi

static func _box_xf(pos: Vector3, sz: Vector3, rot: Vector3 = Vector3.ZERO) -> Transform3D:
	return Transform3D(Basis.from_euler(rot).scaled(sz), pos)

static func _emit_box_mm(parent: Node3D, batch_name: String, xfs: Array[Transform3D], mat: Material, cols: Array[Color] = [], shadow: bool = true) -> MultiMeshInstance3D:
	if xfs.is_empty():
		return null
	var bm := BoxMesh.new()
	bm.size = Vector3.ONE
	var mm := MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	mm.use_colors = (cols.size() == xfs.size())
	mm.mesh = bm
	mm.instance_count = xfs.size()
	for i in range(xfs.size()):
		mm.set_instance_transform(i, xfs[i])
		if mm.use_colors:
			mm.set_instance_color(i, cols[i])
	var mmi := MultiMeshInstance3D.new()
	mmi.name = batch_name
	mmi.multimesh = mm
	mmi.material_override = mat
	mmi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON if shadow else GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parent.add_child(mmi)
	return mmi

static func _make_tex_mat(builder: Node3D, tint: Color, rough: float, metal: float, tex_name: String, scale_uv: float = 0.35, norm_scale: float = 0.45) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = tint
	m.roughness = rough
	m.metallic = metal
	var tex: Texture2D = builder.call("_load_tex", tex_name)
	var norm: Texture2D = builder.call("_load_tex", "rock-normal-v1.png")
	if tex:
		m.albedo_texture = tex
		m.uv1_triplanar = true
		m.uv1_world_triplanar = true
		m.uv1_scale = Vector3(scale_uv, scale_uv, scale_uv)
	if norm and norm_scale > 0.0:
		m.normal_enabled = true
		m.normal_texture = norm
		m.normal_scale = norm_scale
	return m

static func _make_solid_mat(col: Color, rough: float = 0.84, metal: float = 0.0, use_vcol: bool = false) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = col
	m.roughness = rough
	m.metallic = metal
	if use_vcol:
		m.vertex_color_use_as_albedo = true
		m.vertex_color_is_srgb = true
	return m

static func _make_ring_segments(parent: Node3D, center: Vector3, radius: float, tube_r: float, segs: int, rot_euler: Vector3, mat: Material, ring_name: String) -> Node3D:
	var ring := Node3D.new()
	ring.name = ring_name
	ring.position = center
	ring.rotation = rot_euler
	parent.add_child(ring)
	var tm := TorusMesh.new()
	tm.inner_radius = maxf(0.05, radius - tube_r)
	tm.outer_radius = radius + tube_r
	tm.rings = maxi(24, segs)
	tm.ring_segments = 12
	var mi := MeshInstance3D.new()
	mi.name = "RingTorus"
	mi.mesh = tm
	mi.material_override = mat
	# TorusMesh nace en el plano XZ; rotarlo 90° en X lo alinea con el plano XY esperado por rot_euler
	mi.rotation.x = PI * 0.5
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	ring.add_child(mi)
	return ring

static func _add_wall_sconce(builder: Node3D, parent: Node3D, pos: Vector3, yaw: float, mat_iron: Material, mat_brass: Material, mat_flame: Material, add_light: bool = true, light_energy: float = 1.55, light_range: float = 9.5, light_color: Color = Color(1.0, 0.72, 0.34)) -> void:
	var sc := Node3D.new()
	sc.position = pos
	sc.rotation.y = yaw
	parent.add_child(sc)
	_box(sc, Vector3(0.0, 0.0, 0.03), Vector3(0.14, 0.34, 0.06), mat_iron, false)
	_box(sc, Vector3(0.0, -0.04, 0.14), Vector3(0.06, 0.06, 0.24), mat_iron, false)
	_cyl(sc, Vector3(0.0, 0.04, 0.23), 0.09, 0.04, mat_brass, 8, false)
	_cyl(sc, Vector3(0.0, 0.13, 0.23), 0.038, 0.14, mat_brass, 8, false)
	var flm := _cyl(sc, Vector3(0.0, 0.24, 0.23), 0.055, 0.14, mat_flame, 7, false)
	flm.add_to_group("night_flame")
	if add_light:
		var ol := OmniLight3D.new()
		ol.position = Vector3(0.0, 0.30, 0.42)
		ol.light_color = light_color
		ol.light_energy = light_energy
		ol.omni_range = light_range
		sc.add_child(ol)
		if builder.has_method("register_flame_fx"):
			builder.register_flame_fx(flm, ol, false)

# ==============================================================================
# FASE 3 — A3: ARQUITECTURA EXCAVADA, COCINA FUNCIONAL Y COMEDOR MONÁSTICO
# ==============================================================================
static func build_a3_interior_architecture(builder: Node3D, a3_layers: Dictionary, a3_roof: Node3D) -> void:
	var y: float = Structure.ELEV_A3_DINING # 18.0m
	var rng := RandomNumberGenerator.new()
	rng.seed = 202611301

	var l_floor: Node3D = a3_layers.get("Floor", builder)
	var l_walls: Node3D = a3_layers.get("WallsInterior", builder)
	var l_light: Node3D = a3_layers.get("Lighting", builder)

	var mat_ashlar := UpperArch.create_weathered_ashlar_material(builder, Color("#c2b8a3"))
	var mat_ashlar_warm := UpperArch.create_weathered_ashlar_material(builder, Color("#b5aa94"))
	var mat_basalt := UpperArch.create_dark_basalt_slab_material(builder)
	var mat_kitchen_slate := _make_tex_mat(builder, Color("#9ca2a6"), 0.80, 0.03, "basalt-coastal-albedo-v1.webp", 0.34, 0.48)
	var mat_soot_apron := _make_solid_mat(Color("#2a2725"), 0.96, 0.0)
	var mat_flag_vcol := _make_tex_mat(builder, Color.WHITE, 0.85, 0.01, "ashlar-v4.webp", 0.36, 0.35)
	mat_flag_vcol.vertex_color_use_as_albedo = true
	mat_flag_vcol.vertex_color_is_srgb = true
	var mat_wood_dark: Material = builder.get("mat_wood_dark")
	var mat_iron: Material = builder.get("mat_iron")
	var mat_bronze: Material = builder.get("mat_bronze")
	var mat_flame: Material = builder.get("mat_flame")
	var plate_mesh := UpperArch.make_angular_basalt_plate_mesh(202611302)

	# 1. Suelos diferenciados: Comedor + rincón de almacenaje NE (losas cálidas variadas) vs Cocina (pizarra oscura desgastada + zona de ceniza bajo fogón)
	var flag_xfs: Array[Transform3D] = []
	var flag_cols: Array[Color] = []
	var flag_palette: Array[Color] = [Color("#bfb49d"), Color("#b4a890"), Color("#c8bda7"), Color("#a89d86")]
	for rz in range(16):
		var fz := lerpf(50.6, 64.2, float(rz) / 15.0)
		for cx in range(18):
			var fx := lerpf(113.9, 133.6, float(cx) / 17.0)
			if fx < 123.65 and fz < 55.65:
				continue
			var sw := rng.randf_range(0.96, 1.14)
			var sd := rng.randf_range(0.76, 0.90)
			flag_xfs.append(_box_xf(Vector3(fx + rng.randf_range(-0.04, 0.04), y + 0.024, fz + rng.randf_range(-0.04, 0.04)), Vector3(sw, 0.032, sd), Vector3(0.0, rng.randf_range(-0.025, 0.025), 0.0)))
			var col := flag_palette[rng.randi() % flag_palette.size()]
			if absf(fx - 117.4) < 1.6 and fz > 61.5:
				col = col.lightened(0.05) # huella sutil de tránsito desde la portada
			flag_cols.append(col)
	# Piedras de transición en el túnel de entrada a A3 (x=115.9..118.9, z=64.0..65.4)
	for ti in range(4):
		var tz := lerpf(64.25, 65.25, float(ti) / 3.0)
		flag_xfs.append(_box_xf(Vector3(117.4, y + 0.032, tz), Vector3(2.85, 0.04, 0.36)))
		flag_cols.append(Color("#cdc3ad"))
	_emit_box_mm(l_floor, "MM_A3_RefectoryFlags", flag_xfs, mat_flag_vcol, flag_cols, false)

	# Fase 6 (A3): Pavimento de cocina en losas de pizarra ajustadas con variación tonal (sustituye rectángulo plano oscuro)
	var slate_vcol := _make_tex_mat(builder, Color.WHITE, 0.80, 0.03, "basalt-coastal-albedo-v1.webp", 0.38, 0.44)
	slate_vcol.vertex_color_use_as_albedo = true
	slate_vcol.vertex_color_is_srgb = true
	var slate_xfs: Array[Transform3D] = []
	var slate_cols: Array[Color] = []
	var slate_palette: Array[Color] = [Color("#5c6368"), Color("#686f73"), Color("#52585d"), Color("#707679"), Color("#62676b")]
	for s_rz in range(6):
		var sfz := lerpf(50.25, 54.95, float(s_rz) / 5.0)
		for s_cx in range(9):
			var sfx := lerpf(114.1, 123.0, float(s_cx) / 8.0) + (0.28 if s_rz % 2 == 1 else 0.0)
			if sfx > 123.35:
				continue
			slate_xfs.append(_box_xf(Vector3(sfx + rng.randf_range(-0.03, 0.03), y + 0.030, sfz + rng.randf_range(-0.03, 0.03)), Vector3(rng.randf_range(0.96, 1.08), 0.034, rng.randf_range(0.80, 0.90)), Vector3(0.0, rng.randf_range(-0.02, 0.02), 0.0)))
			slate_cols.append(slate_palette[rng.randi() % slate_palette.size()])
	_box(l_floor, Vector3(118.55, y + 0.018, 52.6), Vector3(10.1, 0.024, 5.8), mat_kitchen_slate, false, "A3_KitchenSlateGroutBase")
	_emit_box_mm(l_floor, "MM_A3_KitchenSlateFlags", slate_xfs, slate_vcol, slate_cols, false)
	_box(l_floor, Vector3(118.55, y + 0.034, 55.52), Vector3(10.2, 0.044, 0.30), mat_ashlar, false, "A3_KitchenDividerTrim")
	_box(l_floor, Vector3(123.62, y + 0.034, 52.6), Vector3(0.30, 0.044, 5.9), mat_ashlar, false, "A3_KitchenDividerTrimE")
	_box(l_floor, Vector3(117.25, y + 0.048, 52.35), Vector3(2.8, 0.014, 1.35), mat_soot_apron, false, "A3_HearthSootApron")

	# 2. Pared trasera norte excavada en roca viva estratificada con escalonamiento orgánico y tono integrado (Fase 6 A3)
	var mat_back_basalt := _make_tex_mat(builder, Color("#686e6c"), 0.88, 0.02, "basalt-coastal-albedo-v1.webp", 0.24, 0.62)
	var mat_a3_rock_warm := UpperArch.create_weathered_ashlar_material(builder, Color("#8d928c"))
	_box(l_walls, Vector3(123.75, y + 1.72, 48.92), Vector3(21.2, 3.50, 0.65), mat_back_basalt, true, "A3_NorthRockBacking")
	var a3_rock_specs := [
		[114.8, 3.2, 4.4, 1.45, -10.0],
		[117.9, 2.9, 5.2, 1.55, 8.0],
		[121.2, 3.4, 4.8, 1.40, -14.0],
		[124.6, 3.1, 5.4, 1.60, 11.0],
		[127.8, 3.5, 4.9, 1.45, -8.0],
		[131.0, 3.0, 5.1, 1.55, 13.0],
		[133.2, 3.3, 4.1, 1.35, -9.0],
	]
	for ri in range(a3_rock_specs.size()):
		var rsp: Array = a3_rock_specs[ri]
		var r_inst := MeshInstance3D.new()
		r_inst.name = "A3_NorthRockFace_%d" % ri
		r_inst.mesh = plate_mesh
		r_inst.material_override = mat_a3_rock_warm if ri % 2 == 0 else mat_basalt
		r_inst.position = Vector3(float(rsp[0]), y - 0.18, 49.04 + sin(float(ri) * 1.9) * 0.18)
		r_inst.scale = Vector3(float(rsp[2]), float(rsp[1]), float(rsp[3]))
		r_inst.rotation_degrees = Vector3(6.0, float(rsp[4]), rng.randf_range(-3.0, 3.0))
		r_inst.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		l_walls.add_child(r_inst)
	for rj in range(6):
		var rx_mid := lerpf(116.2, 131.6, float(rj) / 5.0)
		var r_mid := MeshInstance3D.new()
		r_mid.name = "A3_NorthRockSeal_%d" % rj
		r_mid.mesh = plate_mesh
		r_mid.material_override = mat_basalt if rj % 2 == 0 else mat_a3_rock_warm
		r_mid.position = Vector3(rx_mid, y - 0.10, 48.88)
		r_mid.scale = Vector3(4.2, 3.05 + float(rj % 2) * 0.35, 1.25)
		r_mid.rotation_degrees = Vector3(4.0, rng.randf_range(-12.0, 12.0), 0.0)
		r_mid.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		l_walls.add_child(r_mid)

	# Pilastras estructurales norte y arranques de arcos fajones (emergiendo limpias de la roca de suelo a capitel)
	for px in [114.4, 121.4, 125.8, 130.0, 133.9]:
		_box(l_walls, Vector3(float(px), y + 1.55, 50.06), Vector3(0.76, 3.10, 0.92), mat_ashlar_warm)
		_box(l_walls, Vector3(float(px), y + 0.34, 50.14), Vector3(0.92, 0.68, 1.04), mat_ashlar)
		_box(l_walls, Vector3(float(px), y + 3.05, 50.18), Vector3(0.92, 0.26, 1.10), mat_ashlar)

	# 3. Tabique divisorio macizo A4/A3 (x=113.0, z=49.5..64.9, espesor real 0.82m) y muro interior Este (x=134.2) con 2 hornacinas
	_box(l_walls, Vector3(113.0, y + 1.55, 57.2), Vector3(0.84, 3.10, 15.4), mat_ashlar_warm, true, "A3_WestPartitionWall")
	_box(l_walls, Vector3(113.0, y + 0.35, 57.2), Vector3(0.96, 0.70, 15.5), mat_ashlar)
	_box(l_walls, Vector3(113.0, y + 3.16, 57.2), Vector3(0.98, 0.22, 15.5), mat_ashlar)
	for wz in [52.6, 57.4, 62.2]:
		_box(l_walls, Vector3(113.48, y + 1.55, float(wz)), Vector3(0.46, 3.10, 0.72), mat_ashlar)

	# Muro Este interior con mampostería y dos hornacinas de vajilla/provisión (x=134.25)
	_box(l_walls, Vector3(134.25, y + 1.55, 57.2), Vector3(0.76, 3.10, 15.4), mat_ashlar_warm, true, "A3_EastInteriorWall")
	for ez in [53.2, 57.6, 62.0]:
		_box(l_walls, Vector3(133.82, y + 1.55, float(ez)), Vector3(0.46, 3.10, 0.74), mat_ashlar)
		_box(l_walls, Vector3(133.76, y + 3.04, float(ez)), Vector3(0.58, 0.24, 0.86), mat_ashlar)
	# Fase 6 (A3): Repisas de madera diferenciadas en la pared este (norte: despensa/especias; sur: vajilla/cobre/lienzos)
	var mat_pot_s := _make_solid_mat(Color("#a86446"), 0.62, 0.02)
	var mat_bowl_s := _make_solid_mat(Color("#6b4c32"), 0.78, 0.0)
	var mat_linen_s := _make_solid_mat(Color("#cbbda1"), 0.92, 0.0)
	var mat_copper_s := _make_solid_mat(Color("#b87042"), 0.34, 0.74)
	var mat_herb_s := _make_solid_mat(Color("#4c643c"), 0.88, 0.0)
	for bay_idx in range(2):
		var zc := 55.4 if bay_idx == 0 else 59.8
		_box(l_walls, Vector3(133.55, y + 1.48, zc), Vector3(0.42, 0.08, 2.25), mat_wood_dark)
		_box(l_walls, Vector3(133.55, y + 2.08, zc), Vector3(0.42, 0.08, 2.25), mat_wood_dark)
		if bay_idx == 0:
			# Tramo norte: despensa de ánforas altas, especieros, ramilletes de hierbas y pila de platos
			_cyl(l_walls, Vector3(133.52, y + 1.69, zc - 0.74), 0.12, 0.34, mat_pot_s, 10, false)
			_cyl(l_walls, Vector3(133.52, y + 1.63, zc - 0.32), 0.09, 0.22, mat_herb_s, 8, false)
			_cyl(l_walls, Vector3(133.52, y + 1.60, zc + 0.04), 0.085, 0.18, mat_pot_s, 8, false)
			_cyl(l_walls, Vector3(133.52, y + 1.62, zc + 0.56), 0.16, 0.20, mat_bowl_s, 10, false)
			_cyl(l_walls, Vector3(133.52, y + 2.26, zc - 0.55), 0.11, 0.28, mat_pot_s, 10, false)
			_box(l_walls, Vector3(133.52, y + 2.22, zc + 0.15), Vector3(0.28, 0.20, 0.44), mat_bowl_s, false)
			_cyl(l_walls, Vector3(133.52, y + 2.24, zc + 0.70), 0.095, 0.24, mat_bronze, 10, false)
		else:
			# Tramo sur: olla de cobre, manteles doblados, jarra de vino y cuencos de servicio
			_cyl(l_walls, Vector3(133.52, y + 1.66, zc - 0.68), 0.16, 0.26, mat_copper_s, 12, false)
			_box(l_walls, Vector3(133.52, y + 1.60, zc - 0.05), Vector3(0.30, 0.16, 0.48), mat_linen_s, false)
			_box(l_walls, Vector3(133.52, y + 1.72, zc - 0.05), Vector3(0.26, 0.10, 0.42), mat_linen_s, false)
			_cyl(l_walls, Vector3(133.52, y + 1.68, zc + 0.62), 0.10, 0.30, mat_bronze, 10, false)
			_cyl(l_walls, Vector3(133.52, y + 2.25, zc - 0.62), 0.14, 0.22, mat_copper_s, 10, false)
			_cyl(l_walls, Vector3(133.52, y + 2.21, zc + 0.08), 0.15, 0.18, mat_bowl_s, 10, false)
			_cyl(l_walls, Vector3(133.52, y + 2.24, zc + 0.66), 0.09, 0.24, mat_pot_s, 10, false)

	# 4. Zócalo frontal sur con espesor real de caverna (y=18.0..18.88, z=64.85 — flanquea la puerta x=115.8..119.0 sin tapar mesas!)
	_box(l_walls, Vector3(114.4, y + 0.42, 64.82), Vector3(2.85, 0.84, 0.74), mat_ashlar_warm, true, "A3_FrontDadoW")
	_box(l_walls, Vector3(114.4, y + 0.87, 64.82), Vector3(2.94, 0.10, 0.84), mat_ashlar)
	_box(l_walls, Vector3(126.7, y + 0.42, 64.82), Vector3(15.2, 0.84, 0.74), mat_ashlar_warm, true, "A3_FrontDadoE")
	_box(l_walls, Vector3(126.7, y + 0.87, 64.82), Vector3(15.3, 0.10, 0.84), mat_ashlar)

	# 5. Arcos y vigas de bóveda recortables dentro de CaveRoof_a3_dining (contenidos dentro de la caverna z=49.8..63.0 para nunca asomar por la fachada exterior!)
	if a3_roof != null:
		for rx in [115.6, 121.0, 126.4, 131.6]:
			_box(a3_roof, Vector3(float(rx), y + 3.06, 56.4), Vector3(0.46, 0.34, 13.0), mat_wood_dark)
			_box(a3_roof, Vector3(float(rx), y + 3.30, 56.4), Vector3(0.62, 0.22, 13.2), mat_ashlar_warm)

	# 6. Apliques murales cálidos interiores + lámparas colgantes del refectorio (noche legible y cálida!)
	_add_wall_sconce(builder, l_light, Vector3(114.4, y + 2.15, 50.32), 0.0, mat_iron, mat_bronze, mat_flame, true, 1.45, 9.5, Color(1.0, 0.68, 0.30))
	_add_wall_sconce(builder, l_light, Vector3(125.8, y + 2.15, 50.32), 0.0, mat_iron, mat_bronze, mat_flame, true, 1.65, 11.5, Color(1.0, 0.74, 0.38))
	_add_wall_sconce(builder, l_light, Vector3(133.55, y + 2.15, 57.6), -PI * 0.5, mat_iron, mat_bronze, mat_flame, true, 1.55, 11.0, Color(1.0, 0.74, 0.38))
	# Refuerzo luminoso cálido en el ala este del comedor (sin depender solo del fogón oeste)
	var east_l := OmniLight3D.new()
	east_l.name = "A3_EastHallLight"
	east_l.position = Vector3(129.6, y + 2.55, 59.5)
	east_l.light_color = Color(1.0, 0.76, 0.42)
	east_l.light_energy = 1.65
	east_l.omni_range = 12.5
	l_light.add_child(east_l)

static func build_a3_refectory_and_kitchen(
	builder: Node3D,
	parent: Node3D,
	y: float,
	mat_oak: Material,
	mat_dark: Material,
	mat_stone: Material,
	mat_iron: Material,
	mat_brass: Material,
	mat_pot: Material,
	_mat_linen: Material,
	mat_flame: Material
) -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = 202611303

	var mat_oak_plank_a := _make_tex_mat(builder, Color("#966e46"), 0.76, 0.02, "a1-oak-v5.png", 0.55, 0.25)
	var mat_oak_plank_b := _make_tex_mat(builder, Color("#855f3b"), 0.78, 0.02, "a1-oak-v5.png", 0.55, 0.25)
	var mat_runner := _make_tex_mat(builder, Color("#9c6b47"), 0.92, 0.0, "linen.webp", 0.9, 0.0)
	var mat_ceramic := _make_solid_mat(Color("#a66346"), 0.58, 0.02)
	var mat_bowl_wood := _make_solid_mat(Color("#694a30"), 0.76, 0.0)
	var mat_bread := _make_solid_mat(Color("#c9944c"), 0.88, 0.0)
	var mat_stew := _make_solid_mat(Color("#b86b24"), 0.35, 0.04)
	var mat_sack := _make_solid_mat(Color("#b39b74"), 0.94, 0.0)
	var mat_soot := _make_solid_mat(Color("#1f1d1c"), 0.95, 0.05)
	var mat_ashlar := UpperArch.create_weathered_ashlar_material(builder, Color("#b8ae99"))
	var mat_herb := _make_solid_mat(Color("#4c643c"), 0.86, 0.0)
	var mat_copper := _make_solid_mat(Color("#b46b42"), 0.34, 0.76)

	# --------------------------------------------------------------------------
	# 3.3 DOS GRANDES MESAS DE REFECTORIO EN TABLONES DE ROBLE (CERO MANCHAS BLANCAS!)
	# --------------------------------------------------------------------------
	var table_configs := [
		{"z": 57.6, "seed": 11},
		{"z": 61.5, "seed": 29}
	]
	for tcfg in table_configs:
		var tz: float = float(tcfg["z"])
		rng.seed = int(tcfg["seed"]) * 97
		var b := Node3D.new()
		b.name = "RefectoryTable_%d" % int(tz * 10.0)
		b.position = Vector3(124.0, y, tz)
		parent.add_child(b)

		# Tablero compuesto por 4 tablones individuales de roble con juntas oscuras (sin parche blanco!)
		_box(b, Vector3(0.0, 0.74, 0.0), Vector3(7.90, 0.07, 1.18), mat_dark) # bastidor inferior
		for pl_i in range(4):
			var plz := lerpf(-0.46, 0.46, float(pl_i) / 3.0)
			var pmat: Material = mat_oak_plank_a if pl_i % 2 == 0 else mat_oak_plank_b
			_box(b, Vector3(0.0, 0.795, plz), Vector3(8.05, 0.065, 0.285), pmat)
		# Camino de mesa textil modesto en tono ocre-terracota (estrecho y sobrio, nunca blanco chillón)
		_box(b, Vector3(0.0, 0.835, 0.0), Vector3(7.10, 0.016, 0.34), mat_runner, false)

		# 3 caballetes de roble macizo con patas ensanchadas y barra travesaño central
		for dx in [-3.15, 0.0, 3.15]:
			_box(b, Vector3(float(dx), 0.38, 0.0), Vector3(0.22, 0.74, 0.98), mat_dark)
			_box(b, Vector3(float(dx), 0.06, 0.0), Vector3(0.28, 0.12, 1.16), mat_dark)
		_box(b, Vector3(0.0, 0.24, 0.0), Vector3(6.60, 0.12, 0.16), mat_dark)

		# 3 candelabros sobrios de hierro/latón a lo largo del eje central
		for cx_c in [-2.65, 0.15, 2.75]:
			_cyl(b, Vector3(float(cx_c), 0.87, rng.randf_range(-0.04, 0.04)), 0.11, 0.05, mat_iron, 10, false)
			_cyl(b, Vector3(float(cx_c), 0.95, 0.0), 0.035, 0.14, mat_brass, 8, false)
			var cf := _cyl(b, Vector3(float(cx_c), 1.05, 0.0), 0.032, 0.10, mat_flame, 7, false)
			cf.add_to_group("night_flame")

		# Vajilla asimétrica realista (cuencos de madera, platos de cerámica terracota, jarras, pan y cubiertos)
		var seat_xs := [-3.25, -2.05, -0.85, 0.55, 1.85, 3.10]
		for si in range(seat_xs.size()):
			var sx: float = float(seat_xs[si])
			for side_z in [-0.39, 0.39]:
				if rng.randf() < 0.16:
					continue # algún puesto libre natural para romper simetría rígida
				var ox := sx + rng.randf_range(-0.14, 0.14)
				var oz := float(side_z) + rng.randf_range(-0.04, 0.04)
				# Plato / cuenco hondo de madera o cerámica esmaltada
				_cyl(b, Vector3(ox, 0.842, oz), 0.14, 0.026, mat_ceramic if (si + int(side_z > 0.0)) % 2 == 0 else mat_bowl_wood, 10, false)
				if rng.randf() < 0.62:
					_cyl(b, Vector3(ox, 0.870, oz), 0.095, 0.045, mat_bowl_wood, 10, false)
					_cyl(b, Vector3(ox, 0.885, oz), 0.075, 0.02, mat_stew, 8, false)
				# Vaso de peltre/bronce ligeramente desplazado
				_cyl(b, Vector3(ox + 0.19, 0.878, oz * 0.82), 0.048, 0.10, mat_brass if si % 2 == 0 else mat_iron, 8, false)
				# Cuchara junto al plato
				_box(b, Vector3(ox - 0.18, 0.836, oz), Vector3(0.03, 0.012, 0.16), mat_iron, false)
			# Jarras de cerámica y hogazas de pan repartidas orgánicamente en el centro
			if si in [1, 4]:
				var jx := sx + rng.randf_range(-0.25, 0.35)
				var jz := rng.randf_range(-0.12, 0.14)
				_cyl(b, Vector3(jx, 0.94, jz), 0.095, 0.22, mat_pot, 10, false)
				_cyl(b, Vector3(jx, 1.07, jz), 0.055, 0.06, mat_ceramic, 10, false)
			if si in [0, 3]:
				var bx := sx + rng.randf_range(0.10, 0.45)
				_box(b, Vector3(bx, 0.852, rng.randf_range(-0.10, 0.10)), Vector3(0.32, 0.03, 0.22), mat_dark, false)
				_cyl(b, Vector3(bx, 0.895, 0.0), 0.11, 0.08, mat_bread, 10, false)

		# Bancos corridos robustos con patas, cartelas y travesaños (preservando anclajes interactivos!)
		for dz in [-0.96, 0.96]:
			_box(b, Vector3(0.0, 0.45, float(dz)), Vector3(7.35, 0.075, 0.40), mat_oak_plank_a)
			_box(b, Vector3(0.0, 0.20, float(dz)), Vector3(6.60, 0.08, 0.10), mat_dark)
			for lx in [-3.05, 0.0, 3.05]:
				_box(b, Vector3(float(lx), 0.22, float(dz)), Vector3(0.16, 0.44, 0.36), mat_dark)
			SceneEnhancer.add_box_collider(b, Vector3(0.0, 0.34, float(dz)), Vector3(7.40, 0.68, 0.44))
			var bench_anchor := Node3D.new()
			bench_anchor.position = Vector3(0.0, 0.0, float(dz))
			b.add_child(bench_anchor)
			var a3_slots: Array[Vector3] = [Vector3(-2.1, 0.49, 0.0), Vector3(0.0, 0.49, 0.0), Vector3(2.1, 0.49, 0.0)]
			SceneEnhancer._attach_seat_prop(bench_anchor, "bench", "Banco del comedor", "[T] Sentarse a la mesa", a3_slots, Vector3(0.0, 0.0, 1.0 if dz < 0.0 else -1.0), 0.23, "s" if dz < 0.0 else "n", false, 3.6)

		# Taburete ligeramente apartado en el extremo este de la mesa (detalle de uso cotidiano)
		var stool_off := Vector3(4.42, 0.0, 0.18 if tz < 60.0 else -0.22)
		_cyl(b, stool_off + Vector3(0.0, 0.44, 0.0), 0.24, 0.06, mat_oak_plank_b, 10)
		for slx in [-0.14, 0.14]:
			for slz in [-0.14, 0.14]:
				_cyl(b, stool_off + Vector3(float(slx), 0.22, float(slz)), 0.032, 0.44, mat_dark, 7)

		SceneEnhancer.add_box_collider(b, Vector3(0.0, 0.48, 0.0), Vector3(8.10, 0.96, 1.32))
		SceneEnhancer._attach_interactive_prop(b, "table", "Mesa del comedor", "[T] Examinar mesa del refectorio", Vector3.ZERO, "n", "Cuencos de caldo caliente, hogazas recién horneadas y jarras de sidra aguardan a los comensales.")

	# --------------------------------------------------------------------------
	# 3.2 COCINA MONÁSTICA FUNCIONAL (HOGAR + CAMPANA + CALDERO + ISLA + DESPENSA + LEÑERA)
	# --------------------------------------------------------------------------
	var k := Node3D.new()
	k.name = "A3_KitchenStove"
	k.position = Vector3(117.6, y, 51.05)
	k.set_meta("manually_lit", true)
	parent.add_child(k)
	# Bancada principal de sillería con cámara de fuego empotrada, hollín, cenizas y hogar vivo
	_box(k, Vector3(-1.32, 0.56, 0.0), Vector3(0.95, 1.12, 1.56), mat_ashlar)
	_box(k, Vector3(1.18, 0.56, 0.0), Vector3(1.42, 1.12, 1.56), mat_ashlar)
	_box(k, Vector3(-0.18, 0.22, 0.0), Vector3(1.46, 0.44, 1.48), mat_stone)
	_box(k, Vector3(-0.18, 0.78, -0.58), Vector3(1.52, 1.18, 0.36), mat_soot) # fondo ahumado de la cámara
	_box(k, Vector3(-0.18, 0.46, 0.06), Vector3(1.26, 0.08, 1.10), mat_soot) # lecho de cenizas
	# Leños ardientes + lecho de brasas vivas + llamas
	_box(k, Vector3(-0.18, 0.50, 0.08), Vector3(0.96, 0.04, 0.78), mat_flame, false, "A3_HearthEmberBed")
	for log_i in range(3):
		var lg := _cyl(k, Vector3(-0.18 + (float(log_i) - 1.0) * 0.24, 0.55, 0.08), 0.08, 0.72, mat_dark, 8)
		lg.rotation = Vector3(PI * 0.5, (float(log_i) - 1.0) * 0.35, 0.0)
	SceneEnhancer._build_flame_cluster(k, Vector3(-0.18, 0.63, 0.08), 0.88, mat_flame)
	# Dintel del hogar + gran campana cónica de piedra y chimenea empotrada en la roca norte
	_box(k, Vector3(-0.18, 1.44, 0.05), Vector3(2.85, 0.26, 1.56), mat_ashlar)
	_box(k, Vector3(-0.18, 1.98, -0.10), Vector3(2.42, 0.86, 1.24), mat_stone)
	_box(k, Vector3(-0.18, 2.75, -0.26), Vector3(1.88, 0.88, 0.96), mat_ashlar)
	# Barra de hierro + gancho + caldero de hierro ennegrecido con guiso humeante y cucharón
	var iron_bar := _cyl(k, Vector3(-0.18, 1.26, 0.08), 0.03, 1.45, mat_iron, 8)
	iron_bar.rotation.z = PI * 0.5
	_cyl(k, Vector3(-0.18, 1.10, 0.08), 0.025, 0.34, mat_iron, 6)
	_cyl(k, Vector3(-0.18, 0.88, 0.08), 0.38, 0.38, mat_soot, 14)
	_cyl(k, Vector3(-0.18, 1.07, 0.08), 0.40, 0.045, mat_iron, 14)
	_cyl(k, Vector3(-0.18, 1.04, 0.08), 0.34, 0.03, mat_stew, 12, false)
	# Encimera lateral derecha del hogar: olla de barro, mortero de piedra y jarro de aceite
	_box(k, Vector3(1.18, 1.15, 0.0), Vector3(1.48, 0.10, 1.62), mat_stone)
	_cyl(k, Vector3(0.86, 1.35, 0.08), 0.20, 0.32, mat_ceramic, 12)
	_cyl(k, Vector3(1.38, 1.30, 0.16), 0.14, 0.20, mat_ashlar, 10)
	_cyl(k, Vector3(1.56, 1.38, -0.22), 0.10, 0.34, mat_copper, 10)
	SceneEnhancer.add_box_collider(k, Vector3(0.0, 0.85, 0.0), Vector3(3.65, 1.70, 1.62))
	var kip := SceneEnhancer._attach_interactive_prop(k, "stove", "el fogón del refectorio", "[T] Avivar fogón y remover caldero")
	kip.interact_radius = 3.05
	kip.linked_fire_node_name = "KitchenHearthLight"

	# Leñera con troncos apilados junto al flanco oeste del hogar (fuera del fuego, x=114.95, z=51.1)
	var wood_rack := Node3D.new()
	wood_rack.name = "A3_FirewoodStack"
	wood_rack.position = Vector3(114.95, y, 51.15)
	parent.add_child(wood_rack)
	for wx in [-0.58, 0.58]:
		_box(wood_rack, Vector3(float(wx), 0.52, 0.0), Vector3(0.08, 1.04, 0.54), mat_iron)
	for row_l in range(4):
		for col_l in range(4 - (row_l % 2)):
			var lx := (float(col_l) - float(3 - (row_l % 2)) * 0.5) * 0.24
			var log_m := _cyl(wood_rack, Vector3(lx, 0.14 + float(row_l) * 0.17, 0.0), 0.085, 0.66, mat_oak_plank_b if (row_l + col_l) % 2 == 0 else mat_dark, 8)
			log_m.rotation.x = PI * 0.5
	SceneEnhancer.add_box_collider(wood_rack, Vector3(0.0, 0.45, 0.0), Vector3(1.26, 0.90, 0.72))

	# Barra mural de utensilios (sartenes de cobre, cazos y hierbas secas en muro norte x=120.0, z=50.20, libre de pilastras)
	var uten := Node3D.new()
	uten.name = "A3_WallUtensilRack"
	uten.position = Vector3(120.0, y + 1.98, 50.20)
	parent.add_child(uten)
	_box(uten, Vector3(0.0, 0.0, 0.0), Vector3(1.52, 0.08, 0.08), mat_iron, false)
	for ui in range(4):
		var ux := lerpf(-0.58, 0.58, float(ui) / 3.0)
		_box(uten, Vector3(ux, -0.14, 0.03), Vector3(0.04, 0.28, 0.03), mat_iron, false)
		if ui < 2:
			var pan := _cyl(uten, Vector3(ux, -0.36, 0.04), 0.18 - float(ui) * 0.03, 0.04, mat_copper if ui == 0 else mat_soot, 12, false)
			pan.rotation.x = PI * 0.5
		elif ui == 2:
			_cyl(uten, Vector3(ux, -0.34, 0.04), 0.09, 0.07, mat_brass, 8, false)
		else:
			_cyl(uten, Vector3(ux, -0.34, 0.05), 0.11, 0.34, mat_herb, 7, false)

	# Isla / mesa de preparación culinaria (x=118.2, z=54.05) con tabla de cortar, cuchillo, pan, verduras, mortero y balda inferior
	var prep := Node3D.new()
	prep.name = "A3_KitchenPrepIsland"
	prep.position = Vector3(118.2, y, 54.05)
	parent.add_child(prep)
	_box(prep, Vector3(0.0, 0.90, 0.0), Vector3(3.75, 0.10, 0.98), mat_oak_plank_a)
	_box(prep, Vector3(0.0, 0.30, 0.0), Vector3(3.45, 0.06, 0.78), mat_dark) # balda inferior
	for px in [-1.68, 0.0, 1.68]:
		for pz in [-0.36, 0.36]:
			_box(prep, Vector3(float(px), 0.44, float(pz)), Vector3(0.14, 0.88, 0.14), mat_dark)
	# Tabla de cortar + cuchillo de acero + verduras + hogaza + jarras
	_box(prep, Vector3(-0.92, 0.97, 0.04), Vector3(0.68, 0.04, 0.46), mat_oak)
	_box(prep, Vector3(-0.74, 1.00, 0.12), Vector3(0.28, 0.02, 0.06), mat_iron, false)
	_cyl(prep, Vector3(-1.08, 1.02, -0.04), 0.09, 0.07, mat_herb, 8, false)
	_cyl(prep, Vector3(-0.18, 1.00, -0.08), 0.16, 0.11, mat_bread, 10, false)
	_cyl(prep, Vector3(0.22, 1.00, 0.12), 0.14, 0.10, mat_bread, 10, false)
	_cyl(prep, Vector3(0.95, 1.09, -0.10), 0.13, 0.28, mat_pot, 10)
	_cyl(prep, Vector3(1.38, 1.03, 0.10), 0.15, 0.16, mat_ceramic, 10)
	# Provisiones en la balda inferior
	_cyl(prep, Vector3(-0.95, 0.48, 0.0), 0.20, 0.32, mat_pot, 10)
	_box(prep, Vector3(0.75, 0.46, 0.0), Vector3(0.58, 0.28, 0.44), mat_sack)
	SceneEnhancer.add_box_collider(prep, Vector3(0.0, 0.50, 0.0), Vector3(3.80, 1.00, 1.02))

	# Estantería de despensa en muro norte (x=123.6, z=50.55) con sacos, tinajas, quesos y cestos
	var pantry := Node3D.new()
	pantry.name = "A3_PantryShelf"
	pantry.position = Vector3(123.6, y, 50.65)
	parent.add_child(pantry)
	for psx in [-1.45, 0.0, 1.45]:
		_box(pantry, Vector3(float(psx), 1.12, 0.0), Vector3(0.14, 2.24, 0.62), mat_dark)
	for psy in [0.22, 0.88, 1.52, 2.16]:
		_box(pantry, Vector3(0.0, float(psy), 0.0), Vector3(3.05, 0.08, 0.60), mat_oak_plank_b)
	_box(pantry, Vector3(-0.85, 0.42, 0.04), Vector3(0.54, 0.34, 0.42), mat_sack)
	_box(pantry, Vector3(-0.26, 0.40, 0.04), Vector3(0.46, 0.30, 0.40), mat_sack)
	_cyl(pantry, Vector3(0.65, 0.46, 0.04), 0.22, 0.40, mat_pot, 10)
	_cyl(pantry, Vector3(1.12, 0.42, 0.06), 0.17, 0.32, mat_ceramic, 10)
	for j_i in range(5):
		var jx := lerpf(-1.12, 1.12, float(j_i) / 4.0)
		_cyl(pantry, Vector3(jx, 1.06, 0.04), 0.13, 0.28, mat_pot if j_i % 2 == 0 else mat_ceramic, 10, false)
	_cyl(pantry, Vector3(-0.68, 1.66, 0.04), 0.22, 0.18, mat_bread, 12, false) # queso/hogazas
	_box(pantry, Vector3(0.55, 1.68, 0.04), Vector3(0.52, 0.24, 0.38), mat_bowl_wood, false)
	SceneEnhancer.add_box_collider(pantry, Vector3(0.0, 1.12, 0.0), Vector3(3.12, 2.24, 0.70))

	# Rincón de almacenaje NE (barriles cinchados, caja y cestos en x=130.4..132.8, z=51.4..52.8)
	for b_cfg in [[130.6, 51.5, 0.38, 0.94, mat_dark], [131.55, 51.7, 0.36, 0.90, mat_oak_plank_b], [132.45, 52.45, 0.34, 0.84, mat_dark]]:
		var bx_b: float = float(b_cfg[0])
		var bz_b: float = float(b_cfg[1])
		var br_b: float = float(b_cfg[2])
		var bh_b: float = float(b_cfg[3])
		_cyl(parent, Vector3(bx_b, y + bh_b * 0.5, bz_b), br_b, bh_b, b_cfg[4], 12)
		for hy in [0.22, bh_b - 0.20]:
			_cyl(parent, Vector3(bx_b, y + float(hy), bz_b), br_b + 0.015, 0.045, mat_iron, 12, false)
		SceneEnhancer.add_cyl_collider(parent, Vector3(bx_b, y + bh_b * 0.5, bz_b), br_b + 0.03, bh_b + 0.06)
	_box(parent, Vector3(129.4, y + 0.34, 51.4), Vector3(0.76, 0.68, 0.68), mat_oak_plank_a)
	_box(parent, Vector3(129.4, y + 0.34, 51.4), Vector3(0.80, 0.08, 0.72), mat_iron, false)
	SceneEnhancer.add_box_collider(parent, Vector3(129.4, y + 0.36, 51.4), Vector3(0.82, 0.74, 0.74))

	# 3.4 Aparador monástico sobrio junto al muro este (x=133.15, z=58.6) con cerámica y jarras
	var cred := Node3D.new()
	cred.name = "A3_EastSideboard"
	cred.position = Vector3(133.15, y, 58.6)
	parent.add_child(cred)
	_box(cred, Vector3(0.0, 0.44, 0.0), Vector3(0.76, 0.88, 3.20), mat_dark)
	_box(cred, Vector3(0.0, 0.90, 0.0), Vector3(0.84, 0.08, 3.32), mat_oak_plank_a)
	_box(cred, Vector3(-0.02, 0.95, 0.0), Vector3(0.46, 0.016, 2.70), mat_runner, false)
	for cz_p in [-1.05, -0.35, 0.42, 1.08]:
		_cyl(cred, Vector3(0.0, 1.05, float(cz_p)), 0.14, 0.20, mat_ceramic if cz_p < 0.0 else mat_pot, 10, false)
	_cyl(cred, Vector3(0.05, 1.09, 0.02), 0.16, 0.28, mat_copper, 12, false) # tetera/samovar de cobre
	SceneEnhancer.add_box_collider(cred, Vector3(0.0, 0.50, 0.0), Vector3(0.88, 1.00, 3.36))

	# 3.5 Pulido rincón NE de servicio: carro de madera de reparto + botellero/aguamanil junto al muro este (sin bloquear pasillos!)
	var cart := Node3D.new()
	cart.name = "A3_ServingCart"
	cart.position = Vector3(127.8, y, 53.35)
	cart.rotation.y = -0.18
	parent.add_child(cart)
	_box(cart, Vector3(0.0, 0.78, 0.0), Vector3(1.42, 0.07, 0.76), mat_oak_plank_a)
	_box(cart, Vector3(0.0, 0.34, 0.0), Vector3(1.30, 0.06, 0.68), mat_dark)
	for cx_c in [-0.62, 0.62]:
		for cz_c in [-0.32, 0.32]:
			_box(cart, Vector3(float(cx_c), 0.54, float(cz_c)), Vector3(0.08, 0.56, 0.08), mat_dark)
	# Asideros traseros y 4 ruedas con llanta de hierro
	for cz_h in [-0.28, 0.28]:
		_box(cart, Vector3(-0.82, 0.84, float(cz_h)), Vector3(0.32, 0.05, 0.05), mat_dark)
	for wx_c in [-0.52, 0.52]:
		for wz_c in [-0.39, 0.39]:
			var wh := _cyl(cart, Vector3(float(wx_c), 0.20, float(wz_c)), 0.20, 0.05, mat_dark, 12)
			wh.rotation.x = PI * 0.5
			var rim := _cyl(cart, Vector3(float(wx_c), 0.20, float(wz_c)), 0.21, 0.03, mat_iron, 12, false)
			rim.rotation.x = PI * 0.5
	# Carga sobre el carro: jarro de cobre, pila de cuencos y cesto con hogazas
	_cyl(cart, Vector3(-0.36, 0.96, -0.06), 0.12, 0.28, mat_copper, 10, false)
	_cyl(cart, Vector3(0.04, 0.88, 0.08), 0.14, 0.14, mat_bowl_wood, 10, false)
	_cyl(cart, Vector3(0.42, 0.89, -0.04), 0.18, 0.15, mat_sack, 10, false)
	_cyl(cart, Vector3(0.42, 0.97, -0.04), 0.13, 0.08, mat_bread, 10, false)
	_cyl(cart, Vector3(0.0, 0.49, 0.0), 0.18, 0.24, mat_pot, 10, false)
	SceneEnhancer.add_box_collider(cart, Vector3(0.0, 0.48, 0.0), Vector3(1.56, 0.96, 0.86))

	# Botellero monástico y cuba de agua con grifo de bronce en el muro este (x=133.15, z=54.45)
	var wine := Node3D.new()
	wine.name = "A3_WineRackAndBasin"
	wine.position = Vector3(133.15, y, 54.45)
	parent.add_child(wine)
	_box(wine, Vector3(0.0, 0.62, -0.58), Vector3(0.64, 1.24, 1.18), mat_dark)
	for wy in [0.32, 0.68, 1.02]:
		_box(wine, Vector3(-0.04, float(wy), -0.58), Vector3(0.56, 0.06, 1.12), mat_oak_plank_b)
		for wz_b in [-0.90, -0.58, -0.26]:
			var keg := _cyl(wine, Vector3(-0.08, float(wy) + 0.13, float(wz_b)), 0.10, 0.44, mat_ceramic if wy < 0.8 else mat_dark, 10, false)
			keg.rotation.z = PI * 0.5
	# Pequeña pila/barril de agua fresca con grifo de latón y cubeta
	_cyl(wine, Vector3(0.0, 0.46, 0.56), 0.30, 0.72, mat_oak_plank_b, 12)
	_cyl(wine, Vector3(0.0, 0.28, 0.56), 0.315, 0.04, mat_iron, 12, false)
	_cyl(wine, Vector3(0.0, 0.68, 0.56), 0.315, 0.04, mat_iron, 12, false)
	var spig := _cyl(wine, Vector3(-0.34, 0.36, 0.56), 0.025, 0.14, mat_brass, 8, false)
	spig.rotation.z = PI * 0.5
	_cyl(wine, Vector3(-0.38, 0.14, 0.56), 0.16, 0.24, mat_bowl_wood, 10, false)
	SceneEnhancer.add_box_collider(wine, Vector3(0.0, 0.62, 0.0), Vector3(0.76, 1.26, 2.05))

# ==============================================================================
# FASE 4 — A4: ARQUITECTURA DE BIBLIOTECA, ESTANTERÍAS SOBRIAS, SCRIPTORIUM Y ASTROLABIO
# ==============================================================================
static func build_a4_interior_architecture(builder: Node3D, a4_layers: Dictionary, a4_roof: Node3D) -> void:
	var y: float = Structure.ELEV_A4_LIBRARY # 18.0m
	var rng := RandomNumberGenerator.new()
	rng.seed = 202611401

	var l_floor: Node3D = a4_layers.get("Floor", builder)
	var l_walls: Node3D = a4_layers.get("WallsInterior", builder)
	var l_light: Node3D = a4_layers.get("Lighting", builder)

	var mat_limestone := UpperArch.create_weathered_ashlar_material(builder, Color("#c4bea9"))
	var mat_limestone_trim := UpperArch.create_weathered_ashlar_material(builder, Color("#b2ac9a"))
	var mat_basalt := UpperArch.create_dark_basalt_slab_material(builder)
	var mat_lib_slab := _make_tex_mat(builder, Color.WHITE, 0.78, 0.02, "limestone-v3.webp", 0.34, 0.30)
	mat_lib_slab.vertex_color_use_as_albedo = true
	mat_lib_slab.vertex_color_is_srgb = true
	var mat_wood_dark: Material = builder.get("mat_wood_dark")
	var mat_iron: Material = builder.get("mat_iron")
	var mat_bronze: Material = builder.get("mat_bronze")
	var mat_flame: Material = builder.get("mat_flame")
	var plate_mesh := UpperArch.make_angular_basalt_plate_mesh(202611402)

	# 1. Suelo diferenciado de biblioteca: losas talladas de caliza gris-marfil más serenas con cenefa perimetral
	var slab_xfs: Array[Transform3D] = []
	var slab_cols: Array[Color] = []
	var lib_palette: Array[Color] = [Color("#a8a296"), Color("#9e988c"), Color("#b2aba0"), Color("#948f85")]
	for rz in range(12):
		var fz := lerpf(50.8, 64.2, float(rz) / 11.0)
		for cx in range(22):
			var fx := lerpf(84.8, 111.9, float(cx) / 21.0)
			var is_border := (rz == 0 or rz == 11 or cx == 0 or cx == 21)
			slab_xfs.append(_box_xf(Vector3(fx, y + 0.026, fz), Vector3(1.22, 0.034, 1.12)))
			slab_cols.append(Color("#878279") if is_border else lib_palette[(rz * 3 + cx * 5) % lib_palette.size()])
	# Umbral tallado en la embocadura del arco de entrada A4 (x=101.3..104.2, z=64.0..65.4)
	for ti in range(4):
		var tz := lerpf(64.25, 65.25, float(ti) / 3.0)
		slab_xfs.append(_box_xf(Vector3(102.75, y + 0.034, tz), Vector3(2.85, 0.04, 0.36)))
		slab_cols.append(Color("#c4bca6"))
	_emit_box_mm(l_floor, "MM_A4_ScholarFloor", slab_xfs, mat_lib_slab, slab_cols, false)

	# 2. Pared norte excavada en roca con 6 nichos arquitectónicos enmarcados por pilastras de caliza (z=49.5..50.6)
	for ri in range(9):
		var rx := lerpf(85.2, 111.4, float(ri) / 8.0)
		var r_inst := MeshInstance3D.new()
		r_inst.name = "A4_NorthRockWall_%d" % ri
		r_inst.mesh = plate_mesh
		r_inst.material_override = mat_basalt
		r_inst.position = Vector3(rx, y - 0.15, 49.55 + sin(float(ri) * 1.5) * 0.18)
		r_inst.scale = Vector3(3.8, 3.65 + (0.25 if ri % 2 == 0 else 0.0), 1.55)
		r_inst.rotation_degrees = Vector3(4.0, rng.randf_range(-10.0, 10.0), 0.0)
		r_inst.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		l_walls.add_child(r_inst)

	# 7 pilastras talladas en caliza con zócalo, fuste, capitel y dintel corrido enmarcando los 6 nichos de las estanterías norte
	var pilaster_xs := [85.2, 89.5, 93.8, 98.1, 102.4, 106.7, 111.0]
	for pi in range(pilaster_xs.size()):
		var px := float(pilaster_xs[pi])
		_box(l_walls, Vector3(px, y + 1.55, 50.35), Vector3(0.58, 3.10, 0.92), mat_limestone_trim)
		_box(l_walls, Vector3(px, y + 0.24, 50.42), Vector3(0.72, 0.48, 1.04), mat_limestone)
		_box(l_walls, Vector3(px, y + 2.98, 50.42), Vector3(0.74, 0.22, 1.06), mat_limestone)
		# Aplique de latón cálido en pilastras alternas iluminando los tomos de noche
		if pi in [1, 3, 5]:
			_add_wall_sconce(builder, l_light, Vector3(px, y + 2.18, 50.84), 0.0, mat_iron, mat_bronze, mat_flame, true, 1.45, 10.5, Color(1.0, 0.78, 0.44))
	# Cornisa corrida superior sobre los 6 nichos de biblioteca + ceja geológica continua y orgánica (Fase 6 A4: elimina cuñas oscuras repetitivas)
	_box(l_walls, Vector3(98.1, y + 3.16, 50.38), Vector3(26.6, 0.24, 0.96), mat_limestone)
	var mat_brow_stone := UpperArch.create_weathered_ashlar_material(builder, Color("#999787"))
	for cap_i in range(11):
		var crx := lerpf(85.4, 110.8, float(cap_i) / 10.0) + rng.randf_range(-0.22, 0.22)
		var rcap := MeshInstance3D.new()
		rcap.name = "A4_NorthCorniceRockBrow_%d" % cap_i
		rcap.mesh = plate_mesh
		rcap.material_override = mat_brow_stone if cap_i % 2 == 0 else mat_limestone_trim
		rcap.position = Vector3(crx, y + 3.10 + sin(float(cap_i) * 1.4) * 0.06, 49.78 + rng.randf_range(-0.10, 0.08))
		rcap.scale = Vector3(rng.randf_range(3.2, 4.4), rng.randf_range(0.46, 0.74), rng.randf_range(1.25, 1.55))
		rcap.rotation_degrees = Vector3(4.0, rng.randf_range(-10.0, 10.0), rng.randf_range(-3.0, 3.0))
		rcap.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		l_walls.add_child(rcap)

	# 3. Pared interior Oeste (x=84.05) con refuerzo de sillería y hornacina de lectura + zócalo frontal sur macizo (z=64.82)
	_box(l_walls, Vector3(84.05, y + 1.55, 57.3), Vector3(0.76, 3.10, 15.2), mat_limestone_trim, true, "A4_WestInteriorWall")
	for wz in [53.2, 57.6, 62.0]:
		_box(l_walls, Vector3(84.48, y + 1.55, float(wz)), Vector3(0.42, 3.10, 0.68), mat_limestone)
	_add_wall_sconce(builder, l_light, Vector3(84.72, y + 2.15, 57.6), PI * 0.5, mat_iron, mat_bronze, mat_flame, true, 1.45, 10.5, Color(1.0, 0.78, 0.44))

	# Zócalo frontal sur macizo (espesor real 0.74m, altura 0.88m -> no oculta mesas ni personajes en cutaway!)
	_box(l_walls, Vector3(92.45, y + 0.42, 64.82), Vector3(17.1, 0.84, 0.74), mat_limestone_trim, true, "A4_FrontDadoW")
	_box(l_walls, Vector3(92.45, y + 0.87, 64.82), Vector3(17.2, 0.10, 0.84), mat_limestone)
	_box(l_walls, Vector3(108.55, y + 0.42, 64.82), Vector3(8.5, 0.84, 0.74), mat_limestone_trim, true, "A4_FrontDadoE")
	_box(l_walls, Vector3(108.55, y + 0.87, 64.82), Vector3(8.6, 0.10, 0.84), mat_limestone)

	# 4. Arcos fajones de bóveda en CaveRoof_a4_library (contenidos dentro de la caverna z=49.8..63.0 para nunca asomar por la fachada exterior!)
	if a4_roof != null:
		for rx in [89.5, 95.8, 102.4, 108.4]:
			_box(a4_roof, Vector3(float(rx), y + 3.12, 56.4), Vector3(0.52, 0.32, 13.0), mat_limestone)
			_box(a4_roof, Vector3(float(rx), y + 2.98, 56.4), Vector3(0.32, 0.18, 12.8), mat_wood_dark)

	# 5. Iluminación focal de lectura y estudio (mesas de scriptorium + cartografía + rincón oeste)
	for lcfg in [
		["A4_DeskLight_W", Vector3(92.5, y + 2.05, 60.85), Color(1.0, 0.80, 0.46), 1.65, 9.5],
		["A4_DeskLight_E", Vector3(105.3, y + 2.05, 60.85), Color(1.0, 0.80, 0.46), 1.65, 9.5],
		["A4_CartographyLight", Vector3(109.2, y + 2.15, 57.8), Color(1.0, 0.76, 0.40), 1.85, 10.5],
		["A4_WestAlcoveLight", Vector3(87.6, y + 2.25, 55.8), Color(1.0, 0.78, 0.46), 1.55, 10.5]
	]:
		var ol := OmniLight3D.new()
		ol.name = str(lcfg[0])
		ol.position = lcfg[1]
		ol.light_color = lcfg[2]
		ol.light_energy = float(lcfg[3])
		ol.omni_range = float(lcfg[4])
		l_light.add_child(ol)

static func build_a4_library_and_scriptorium(
	builder: Node3D,
	parent: Node3D,
	y: float,
	mat_dark: Material,
	mat_oak: Material,
	mat_paper: Material,
	mat_brass: Material,
	mat_gold: Material,
	mat_flame: Material,
	_mat_blue: Material,
	_mat_red: Material,
	_mat_green: Material
) -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = 202611405

	# Paleta sobria de biblioteca monástica (cuero curtido, burdeos envejecido, verde bosque, azul pizarra, pergamino)
	var mat_walnut := _make_tex_mat(builder, Color("#4e3623"), 0.76, 0.02, "a1-oak-v5.png", 0.50, 0.25)
	var mat_aged_oak := _make_tex_mat(builder, Color("#7d5b3b"), 0.78, 0.02, "a1-oak-v5.png", 0.55, 0.25)
	var mat_iron: Material = builder.get("mat_iron")
	var mat_limestone := UpperArch.create_weathered_ashlar_material(builder, Color("#c2bca6"))
	var mat_rug_indigo := _make_tex_mat(builder, Color("#2a3d4e"), 0.94, 0.0, "wool-carpet.webp", 0.55, 0.0)
	var mat_rug_crimson := _make_tex_mat(builder, Color("#6b302b"), 0.94, 0.0, "wool-carpet.webp", 0.65, 0.0)
	var mat_rug_gold := _make_tex_mat(builder, Color("#9e7d45"), 0.90, 0.04, "linen.webp", 0.85, 0.0)
	var mat_ink := _make_solid_mat(Color("#15171c"), 0.32, 0.10)
	var mat_map_sea := _make_solid_mat(Color("#4f747e"), 0.88, 0.0)
	var mat_map_land := _make_solid_mat(Color("#bfa77e"), 0.90, 0.0)
	var mat_book_vcol := _make_solid_mat(Color.WHITE, 0.82, 0.03, true)
	var book_palette: Array[Color] = [
		Color("#5a2924"), # cuero burdeos envejecido
		Color("#324536"), # verde bosque oscuro
		Color("#684a31"), # cuero castaño curtido
		Color("#2e3c4c"), # azul pizarra apagado
		Color("#9d8762"), # pergamino viejo
		Color("#745836"), # ocre oscuro encuadernado
		Color("#463529"), # nogal oscuro
	]

	# --------------------------------------------------------------------------
	# 4.4 ALFOMBRA TEJIDA + ASTROLABIO / ESFERA ARMILAR 3D SOBRE PEDESTAL (EJE CENTRAL A4)
	# --------------------------------------------------------------------------
	var rug_root := Node3D.new()
	rug_root.name = "A4_ScholarlyRug"
	rug_root.position = Vector3(98.4, y, 57.6)
	parent.add_child(rug_root)
	_box(rug_root, Vector3(0.0, 0.044, 0.0), Vector3(6.85, 0.022, 3.45), mat_rug_gold, false)
	_box(rug_root, Vector3(0.0, 0.052, 0.0), Vector3(6.48, 0.020, 3.08), mat_rug_crimson, false)
	_box(rug_root, Vector3(0.0, 0.059, 0.0), Vector3(5.96, 0.018, 2.58), mat_rug_indigo, false)
	_box(rug_root, Vector3(0.0, 0.064, 0.0), Vector3(2.20, 0.014, 2.20), mat_rug_gold, false)
	_box(rug_root, Vector3(0.0, 0.068, 0.0), Vector3(1.94, 0.012, 1.94), mat_rug_indigo, false)
	# Flecos en ambos extremos de la alfombra
	for fx_s in [-3.48, 3.48]:
		_box(rug_root, Vector3(float(fx_s), 0.038, 0.0), Vector3(0.14, 0.010, 3.32), mat_paper, false)

	var astro := Node3D.new()
	astro.name = "A4_ArmillaryAstrolabe"
	astro.position = Vector3(98.4, y, 57.6)
	parent.add_child(astro)
	# Pedestal octogonal escalonado de caliza + columna acanalada de nogal con placa de bronce
	_cyl(astro, Vector3(0.0, 0.12, 0.0), 0.72, 0.24, mat_limestone, 8)
	_cyl(astro, Vector3(0.0, 0.30, 0.0), 0.56, 0.14, mat_limestone, 8)
	_cyl(astro, Vector3(0.0, 0.76, 0.0), 0.30, 0.80, mat_walnut, 12)
	_cyl(astro, Vector3(0.0, 1.18, 0.0), 0.44, 0.10, mat_limestone, 8)
	_cyl(astro, Vector3(0.0, 1.24, 0.0), 0.48, 0.04, mat_brass, 16)
	# Anillo horizontal graduado + 4 brazos curvos de soporte
	_make_ring_segments(astro, Vector3(0.0, 1.72, 0.0), 0.58, 0.028, 24, Vector3(PI * 0.5, 0.0, 0.0), mat_brass, "HorizonRing")
	for arm_i in range(4):
		var aang := (float(arm_i) / 4.0) * TAU + PI * 0.25
		var arm := _box(astro, Vector3(cos(aang) * 0.34, 1.48, sin(aang) * 0.34), Vector3(0.05, 0.54, 0.05), mat_brass)
		arm.rotation = Vector3(sin(aang) * 0.58, 0.0, -cos(aang) * 0.58)
	# 3 Aros armilares inclinados (meridiano, eclíptica y coluro) + eje polar con aguja y esfera solar dorada
	_make_ring_segments(astro, Vector3(0.0, 1.74, 0.0), 0.52, 0.024, 24, Vector3(0.0, 0.35, 0.0), mat_gold, "MeridianRing")
	_make_ring_segments(astro, Vector3(0.0, 1.74, 0.0), 0.46, 0.022, 22, Vector3(0.42, 1.25, 0.22), mat_brass, "EclipticRing")
	_make_ring_segments(astro, Vector3(0.0, 1.74, 0.0), 0.39, 0.018, 20, Vector3(-0.55, -0.45, 0.65), mat_gold, "InnerRing")
	var axis_rod := _cyl(astro, Vector3(0.0, 1.74, 0.0), 0.020, 1.26, mat_iron, 8)
	axis_rod.rotation = Vector3(0.38, 0.35, 0.0)
	_cyl(astro, Vector3(0.0, 1.74, 0.0), 0.11, 0.18, mat_gold, 12) # orbe central
	SceneEnhancer.add_cyl_collider(astro, Vector3(0.0, 0.85, 0.0), 0.66, 1.70)
	SceneEnhancer.tag_camera_occluder(astro)
	SceneEnhancer._attach_interactive_prop(astro, "shrine", "Astrolabio del Observatorio", "[T] Examinar esfera armilar", Vector3.ZERO, "n", "Los aros de bronce señalan las constelaciones visibles desde el Observatorio oriental de la isla.")

	# --------------------------------------------------------------------------
	# 4.2 ESTANTERÍAS REDISEÑADAS CON LIBROS SOBRIOS EN MULTIMESH (6 EN NICHOS NORTE + 3 ISLAS)
	# --------------------------------------------------------------------------
	var book_xfs: Array[Transform3D] = []
	var book_cols: Array[Color] = []
	var scroll_xfs: Array[Transform3D] = []
	var scroll_cols: Array[Color] = []

	# 6 Estanterías monumentales alojadas limpiamente dentro de los 6 nichos tallados del muro norte (z=50.95)
	# Fase 6 (A4): alturas ligeramente variadas y remates eruditos únicos por nicho (rompe repetición de cajita de latón)
	var north_niche_xs := [87.35, 91.65, 95.95, 100.25, 104.55, 108.85]
	var north_niche_hs := [2.46, 2.58, 2.50, 2.56, 2.44, 2.52]
	for ni in range(north_niche_xs.size()):
		_build_scholar_bookcase(
			parent, Vector3(float(north_niche_xs[ni]), y, 50.95), 0.0, 3.35, float(north_niche_hs[ni]), false,
			mat_walnut, mat_aged_oak, mat_brass, mat_iron,
			book_xfs, book_cols, scroll_xfs, scroll_cols, book_palette, rng, ni
		)

	# 3 Estanterías-isla de lectura abiertas a dos caras (x=89.6, 94.4, 103.8, z=56.5 — sin atravesar muros ni tapar el astrolabio!)
	var island_xs := [89.4, 94.1, 103.9]
	for i_idx in range(island_xs.size()):
		_build_scholar_bookcase(
			parent, Vector3(float(island_xs[i_idx]), y, 56.5), PI * 0.5, 2.75, 2.00 + float(i_idx % 2) * 0.08, true,
			mat_walnut, mat_aged_oak, mat_brass, mat_iron,
			book_xfs, book_cols, scroll_xfs, scroll_cols, book_palette, rng, 10 + i_idx
		)

	# Estantería baja de archivos en el rincón oeste (x=85.15, z=59.6)
	_build_scholar_bookcase(
		parent, Vector3(85.15, y, 59.6), PI * 0.5, 2.50, 1.92, false,
		mat_walnut, mat_aged_oak, mat_brass, mat_iron,
		book_xfs, book_cols, scroll_xfs, scroll_cols, book_palette, rng, 20
	)

	_emit_box_mm(parent, "MM_A4_ScholarlyBooks", book_xfs, mat_book_vcol, book_cols, false)
	_emit_box_mm(parent, "MM_A4_ParchmentScrolls", scroll_xfs, mat_book_vcol, scroll_cols, false)

	# --------------------------------------------------------------------------
	# 4.3 DOS PUESTOS DE SCRIPTORIUM DIFERENCIADOS + MESA DE CARTOGRAFÍA INSULAR
	# --------------------------------------------------------------------------
	_build_scriptorium_desk(parent, Vector3(92.5, y, 60.85), 0.0, true, mat_aged_oak, mat_walnut, mat_paper, mat_brass, mat_iron, mat_ink, mat_flame, mat_rug_crimson)
	_build_scriptorium_desk(parent, Vector3(105.3, y, 60.85), 0.0, false, mat_aged_oak, mat_walnut, mat_paper, mat_brass, mat_iron, mat_ink, mat_flame, mat_rug_indigo)

	# Mesa de cartografía insular en el ala este (x=109.2, z=57.6 — preserva prop interactivo!)
	var map_tbl := Node3D.new()
	map_tbl.name = "A4_CartographyTable"
	map_tbl.position = Vector3(109.2, y, 57.6)
	parent.add_child(map_tbl)
	_box(map_tbl, Vector3(0.0, 0.78, 0.0), Vector3(1.88, 0.09, 3.05), mat_aged_oak)
	_box(map_tbl, Vector3(0.0, 0.62, 0.0), Vector3(1.66, 0.24, 2.82), mat_walnut) # cajonera de cartas
	_box(map_tbl, Vector3(0.0, 0.24, 0.0), Vector3(1.58, 0.06, 2.66), mat_walnut) # estante inferior con tubos
	for lx in [-0.78, 0.78]:
		for lz in [-1.32, 1.32]:
			_box(map_tbl, Vector3(float(lx), 0.39, float(lz)), Vector3(0.14, 0.78, 0.14), mat_walnut)
	for pull_z in [-0.75, 0.0, 0.75]:
		_box(map_tbl, Vector3(-0.84, 0.62, float(pull_z)), Vector3(0.04, 0.05, 0.18), mat_brass, false)
	# Gran carta náutica insular desplegada con relieve de costa/isla + bordes enrollados y pesas de piedra
	_box(map_tbl, Vector3(-0.04, 0.835, 0.0), Vector3(1.32, 0.018, 2.18), mat_paper, false)
	_box(map_tbl, Vector3(-0.04, 0.846, 0.0), Vector3(1.16, 0.008, 1.98), mat_map_sea, false)
	var island_m := _box(map_tbl, Vector3(-0.02, 0.854, -0.05), Vector3(0.68, 0.010, 1.12), mat_map_land, false)
	island_m.rotation.y = 0.24
	# Relieve montañoso insular, rosa de los vientos de bronce y hitos de ruta sobre la carta
	var ridge_m := _box(map_tbl, Vector3(-0.04, 0.864, -0.10), Vector3(0.26, 0.014, 0.62), mat_aged_oak, false)
	ridge_m.rotation.y = 0.24
	_cyl(map_tbl, Vector3(-0.42, 0.858, 0.62), 0.11, 0.012, mat_brass, 12, false)
	for pin_p in [Vector3(-0.08, 0.872, -0.35), Vector3(0.06, 0.872, 0.16), Vector3(-0.14, 0.872, 0.34)]:
		_cyl(map_tbl, pin_p, 0.026, 0.045, mat_rug_crimson, 8, false)
	for rz_m in [-1.09, 1.09]:
		var roll := _cyl(map_tbl, Vector3(-0.04, 0.86, float(rz_m)), 0.045, 1.34, mat_paper, 8, false)
		roll.rotation.z = PI * 0.5
	# Instrumentos de medición: compás de puntas de bronce, regla, diario rojo de expedición y lámpara de mesa
	var comp_a := _box(map_tbl, Vector3(0.44, 0.85, -0.62), Vector3(0.03, 0.02, 0.30), mat_brass, false)
	comp_a.rotation.y = 0.25
	var comp_b := _box(map_tbl, Vector3(0.50, 0.85, -0.62), Vector3(0.03, 0.02, 0.30), mat_brass, false)
	comp_b.rotation.y = -0.25
	_box(map_tbl, Vector3(0.45, 0.88, 0.72), Vector3(0.40, 0.09, 0.52), mat_rug_crimson, false)
	_box(map_tbl, Vector3(0.45, 0.88, 0.72), Vector3(0.36, 0.06, 0.48), mat_paper, false)
	# Lámpara de bronce con llama cálida
	_cyl(map_tbl, Vector3(-0.46, 0.90, -0.82), 0.11, 0.14, mat_brass, 10, false)
	var ml_f := _cyl(map_tbl, Vector3(-0.46, 1.03, -0.82), 0.045, 0.14, mat_flame, 8, false)
	ml_f.add_to_group("night_flame")
	# Tubos de mapas enrollados en la balda inferior
	for tub_i in range(4):
		var tub := _cyl(map_tbl, Vector3(-0.35 + float(tub_i) * 0.22, 0.32, 0.0), 0.065, 1.85, mat_paper if tub_i % 2 == 0 else mat_oak, 8, false)
		tub.rotation.x = PI * 0.5
	SceneEnhancer.add_box_collider(map_tbl, Vector3(0.0, 0.50, 0.0), Vector3(1.94, 1.00, 3.12))
	SceneEnhancer._attach_interactive_prop(map_tbl, "table", "Mesa de cartografía", "[T] Examinar mapa insular", Vector3.ZERO, "w", "Cartas náuticas detallan el Retiro, Pleamar y el Observatorio de la isla.")

	# Pequeña pila de códices y cofre de manuscritos en el rincón oeste (x=87.4, z=61.4)
	_box(parent, Vector3(87.2, y + 0.28, 61.8), Vector3(0.95, 0.56, 0.62), mat_walnut)
	_box(parent, Vector3(87.2, y + 0.28, 61.8), Vector3(0.98, 0.08, 0.66), mat_iron, false)
	_box(parent, Vector3(87.2, y + 0.60, 61.8), Vector3(0.38, 0.07, 0.28), mat_rug_crimson, false)
	var top_b := _box(parent, Vector3(87.22, y + 0.66, 61.78), Vector3(0.32, 0.06, 0.24), mat_paper, false)
	top_b.rotation.y = 0.28
	SceneEnhancer.add_box_collider(parent, Vector3(87.2, y + 0.32, 61.8), Vector3(1.00, 0.66, 0.68))

static func _build_scholar_bookcase(
	parent: Node3D,
	pos: Vector3,
	yaw: float,
	width: float,
	height: float,
	is_island: bool,
	mat_frame: Material,
	mat_shelf: Material,
	mat_brass: Material,
	mat_iron: Material,
	book_xfs: Array[Transform3D],
	book_cols: Array[Color],
	scroll_xfs: Array[Transform3D],
	scroll_cols: Array[Color],
	book_palette: Array[Color],
	rng: RandomNumberGenerator,
	variant_idx: int = 0
) -> void:
	var sh := Node3D.new()
	sh.position = pos
	sh.rotation.y = yaw
	parent.add_child(sh)

	var depth := 0.58 if not is_island else 0.62
	# Zócalo moldurado, montantes con pilastras, panel trasero y cornisa superior escalonada
	_box(sh, Vector3(0.0, 0.11, 0.0), Vector3(width + 0.08, 0.22, depth + 0.06), mat_frame)
	for sx in [-width * 0.47, width * 0.47]:
		_box(sh, Vector3(float(sx), height * 0.5, 0.0), Vector3(0.16, height, depth), mat_frame)
	if width > 2.9:
		_box(sh, Vector3(0.0, height * 0.5, 0.0), Vector3(0.10, height - 0.24, depth - 0.06), mat_frame) # montante divisor central
	_box(sh, Vector3(0.0, height - 0.10, 0.02), Vector3(width + 0.14, 0.14, depth + 0.10), mat_frame)
	_box(sh, Vector3(0.0, height - 0.02, 0.03), Vector3(width + 0.22, 0.07, depth + 0.16), mat_frame)
	if not is_island:
		_box(sh, Vector3(0.0, height * 0.5, -depth * 0.44), Vector3(width - 0.10, height - 0.18, 0.07), mat_frame)

	var shelf_count := 4 if height > 2.25 else 3
	var shelf_step := (height - 0.56) / float(shelf_count)
	var bas_sh := Basis.from_euler(Vector3(0.0, yaw, 0.0))

	for row_i in range(shelf_count):
		var sy := 0.28 + float(row_i) * shelf_step
		var thick := 0.065 if row_i == 0 else 0.052
		_box(sh, Vector3(0.0, sy, 0.0), Vector3(width - 0.16, thick, depth - 0.06), mat_shelf)
		# Poblar la balda con libros de altura/grosor variados, inclinados, apilados, pergaminos y huecos naturales
		var cursor := -width * 0.43
		var max_x := width * 0.43
		while cursor < max_x - 0.12:
			if width > 2.9 and absf(cursor) < 0.09:
				cursor += 0.14
				continue
			var roll_r := rng.randf()
			if roll_r < 0.14:
				# Pequeño hueco vacío natural
				cursor += rng.randf_range(0.14, 0.28)
				continue
			elif roll_r < 0.24:
				# Pergaminos enrollados apilados horizontalmente
				var sc_w := 0.24
				for sr in range(2):
					var local_p := Vector3(cursor + sc_w * 0.5, sy + thick * 0.5 + 0.055 + float(sr) * 0.085, 0.06 if not is_island else 0.0)
					var wpos := pos + bas_sh * local_p
					var sbas := bas_sh * Basis.IDENTITY.scaled(Vector3(sc_w, 0.075, 0.30))
					scroll_xfs.append(Transform3D(sbas, wpos))
					scroll_cols.append(Color("#c4b189") if sr == 0 else Color("#b59f76"))
				cursor += sc_w + 0.05
			elif roll_r < 0.34 and cursor < max_x - 0.32:
				# Pila horizontal de 2-3 códices grandes
				var stack_w := rng.randf_range(0.24, 0.32)
				var stack_n := rng.randi_range(2, 3)
				for stk in range(stack_n):
					var local_p := Vector3(cursor + stack_w * 0.5, sy + thick * 0.5 + 0.038 + float(stk) * 0.072, 0.05 if not is_island else 0.0)
					var wpos := pos + bas_sh * local_p
					var bbas := bas_sh * Basis.from_euler(Vector3(0.0, rng.randf_range(-0.10, 0.10), 0.0)).scaled(Vector3(stack_w, 0.065, 0.32))
					book_xfs.append(Transform3D(bbas, wpos))
					book_cols.append(book_palette[rng.randi() % book_palette.size()])
				cursor += stack_w + 0.05
			else:
				# Libro vertical (o ligeramente inclinado al final de un grupo)
				var bw := rng.randf_range(0.055, 0.105)
				var bh := rng.randf_range(0.24, minf(0.39, shelf_step - 0.12))
				var bd := rng.randf_range(0.26, 0.36) if not is_island else rng.randf_range(0.38, 0.46)
				var tilt := rng.randf_range(-0.16, 0.16) if rng.randf() < 0.14 else 0.0
				var local_p := Vector3(cursor + bw * 0.5, sy + thick * 0.5 + bh * 0.5, (0.06 if not is_island else 0.0) + rng.randf_range(-0.02, 0.02))
				var wpos := pos + bas_sh * local_p
				var bbas := bas_sh * Basis.from_euler(Vector3(0.0, 0.0, tilt)).scaled(Vector3(bw, bh, bd))
				book_xfs.append(Transform3D(bbas, wpos))
				var c := book_palette[rng.randi() % book_palette.size()]
				if rng.randf() < 0.30:
					c = c.darkened(0.10)
				book_cols.append(c)
				cursor += bw + (0.045 if absf(tilt) > 0.05 else 0.008)

	# Fase 6 (A4): Pieza singular diferente sobre cada cornisa (elimina repetición de caja de latón idéntica)
	var v_mod := variant_idx % 6
	if v_mod == 0:
		# Pila de códices de cuero + candelero de bronce a la izquierda
		_box(sh, Vector3(-width * 0.24, height + 0.06, 0.04), Vector3(0.38, 0.08, 0.28), mat_shelf, false)
		var cb2 := _box(sh, Vector3(-width * 0.22, height + 0.13, 0.04), Vector3(0.32, 0.07, 0.24), mat_frame, false)
		cb2.rotation.y = 0.22
		_cyl(sh, Vector3(width * 0.28, height + 0.12, 0.04), 0.08, 0.22, mat_brass, 8, false)
	elif v_mod == 1:
		# Mini-esfera armilar de bronce sobre peana central
		_cyl(sh, Vector3(0.08, height + 0.06, 0.05), 0.14, 0.10, mat_frame, 8, false)
		_cyl(sh, Vector3(0.08, height + 0.24, 0.05), 0.17, 0.04, mat_brass, 12, false)
		var orb_r := _cyl(sh, Vector3(0.08, height + 0.24, 0.05), 0.16, 0.035, mat_brass, 12, false)
		orb_r.rotation.x = PI * 0.5
	elif v_mod == 2:
		# Atril horizontal con 2 pergaminos enrollados y tarro de sellos
		for s_k in range(2):
			var scr := _cyl(sh, Vector3(-width * 0.14 + float(s_k) * 0.14, height + 0.07, 0.06), 0.055, 0.36, mat_shelf, 8, false)
			scr.rotation.x = PI * 0.5
		_cyl(sh, Vector3(width * 0.26, height + 0.11, 0.04), 0.10, 0.20, mat_iron, 10, false)
	elif v_mod == 3:
		# Reloj de arena en bronce + cofre pequeño desplazado
		_cyl(sh, Vector3(-width * 0.20, height + 0.14, 0.05), 0.08, 0.26, mat_brass, 8, false)
		_box(sh, Vector3(width * 0.18, height + 0.09, 0.04), Vector3(0.36, 0.15, 0.24), mat_frame, false)
		_box(sh, Vector3(width * 0.18, height + 0.09, 0.04), Vector3(0.38, 0.04, 0.26), mat_iron, false)
	elif v_mod == 4:
		# Códices inclinados con sujetalibros de hierro en el tercio izquierdo
		for t_k in range(3):
			var tm_b := _box(sh, Vector3(-width * 0.26 + float(t_k) * 0.08, height + 0.14, 0.04), Vector3(0.06, 0.26, 0.22), mat_shelf if t_k % 2 == 0 else mat_frame, false)
			tm_b.rotation.z = -0.14 if t_k == 2 else 0.0
	else:
		# Tubo porta-mapas horizontal + urna de bronce a la derecha
		var mtub := _cyl(sh, Vector3(-width * 0.12, height + 0.07, 0.06), 0.065, 0.52, mat_frame, 8, false)
		mtub.rotation.z = PI * 0.5
		_cyl(sh, Vector3(width * 0.24, height + 0.14, 0.05), 0.11, 0.26, mat_brass, 10, false)
	_box(sh, Vector3(-width * 0.47, height - 0.16, depth * 0.50), Vector3(0.14, 0.10, 0.03), mat_iron, false)
	_box(sh, Vector3(width * 0.47, height - 0.16, depth * 0.50), Vector3(0.14, 0.10, 0.03), mat_iron, false)

	SceneEnhancer.add_box_collider(sh, Vector3(0.0, height * 0.5, 0.0), Vector3(width + 0.12, height, depth + 0.12))
	SceneEnhancer.tag_camera_occluder(sh)
	SceneEnhancer._attach_interactive_prop(sh, "bookshelf", "Estantería del Scriptorium", "[T] Consultar estantería")

static func _build_scriptorium_desk(
	parent: Node3D,
	pos: Vector3,
	yaw: float,
	has_sloped_lectern: bool,
	mat_oak: Material,
	mat_walnut: Material,
	mat_paper: Material,
	mat_brass: Material,
	mat_iron: Material,
	mat_ink: Material,
	mat_flame: Material,
	mat_cover: Material
) -> void:
	var d := Node3D.new()
	d.name = "ScriptoriumDesk_%s" % ("W" if has_sloped_lectern else "E")
	d.position = pos
	d.rotation.y = yaw
	parent.add_child(d)

	# Mesa sólida de escriba con tablero grueso, travesaño y patas torneadas
	_box(d, Vector3(0.0, 0.78, 0.0), Vector3(1.72, 0.085, 0.92), mat_oak)
	for lx in [-0.74, 0.74]:
		_box(d, Vector3(float(lx), 0.39, 0.0), Vector3(0.14, 0.78, 0.76), mat_walnut)
	_box(d, Vector3(0.0, 0.22, -0.10), Vector3(1.48, 0.10, 0.12), mat_walnut)

	if has_sloped_lectern:
		# Atril inclinado de copista con manuscrito abierto, tintero, pluma, regla y pila de referencia
		var slope := _box(d, Vector3(-0.14, 0.90, -0.02), Vector3(0.76, 0.05, 0.56), mat_walnut)
		slope.rotation.x = 0.26
		var ms_l := _box(d, Vector3(-0.30, 0.94, -0.01), Vector3(0.28, 0.02, 0.42), mat_paper, false)
		ms_l.rotation.x = 0.26
		var ms_r := _box(d, Vector3(0.02, 0.94, -0.01), Vector3(0.28, 0.02, 0.42), mat_paper, false)
		ms_r.rotation.x = 0.26
		# Tintero de hierro + mancha de tinta + pluma blanca
		_cyl(d, Vector3(0.42, 0.85, -0.14), 0.048, 0.06, mat_ink, 8, false)
		var quill := _cyl(d, Vector3(0.45, 0.96, -0.14), 0.014, 0.24, mat_paper, 6, false)
		quill.rotation.z = -0.36
		_box(d, Vector3(0.46, 0.835, 0.14), Vector3(0.32, 0.015, 0.045), mat_brass, false) # regla
		_box(d, Vector3(-0.64, 0.86, 0.14), Vector3(0.28, 0.06, 0.22), mat_cover, false)
		_box(d, Vector3(-0.62, 0.92, 0.12), Vector3(0.24, 0.05, 0.19), mat_paper, false)
	else:
		# Puesto de estudio con códice abierto sobre soporte, pergaminos desenrollados, estuche y cuchillo de escriba
		_box(d, Vector3(-0.12, 0.835, 0.06), Vector3(0.64, 0.016, 0.44), mat_paper, false)
		var sc_a := _cyl(d, Vector3(-0.44, 0.86, 0.06), 0.04, 0.46, mat_paper, 8, false)
		sc_a.rotation.x = PI * 0.5
		_box(d, Vector3(0.44, 0.87, -0.14), Vector3(0.38, 0.09, 0.28), mat_cover, false)
		_box(d, Vector3(0.44, 0.87, -0.14), Vector3(0.35, 0.06, 0.25), mat_paper, false)
		_box(d, Vector3(0.42, 0.835, 0.20), Vector3(0.22, 0.015, 0.035), mat_iron, false) # cuchillo de escriba
		_box(d, Vector3(-0.62, 0.89, -0.18), Vector3(0.30, 0.14, 0.24), mat_walnut, false) # cajita de sellos

	# Fase 6 (A4): Lámpara erudita de lectura en latón con pantalla cálida en ambos escritorios
	var c_x := 0.58 if has_sloped_lectern else -0.58
	_cyl(d, Vector3(c_x, 0.84, -0.24), 0.10, 0.04, mat_brass, 10, false)
	_cyl(d, Vector3(c_x, 1.00, -0.24), 0.025, 0.30, mat_brass, 8, false)
	var shade_m := CylinderMesh.new()
	shade_m.top_radius = 0.075
	shade_m.bottom_radius = 0.155
	shade_m.height = 0.12
	shade_m.radial_segments = 12
	var shade_i := MeshInstance3D.new()
	shade_i.name = "ReadingLampShade"
	shade_i.mesh = shade_m
	shade_i.material_override = mat_brass
	shade_i.position = Vector3(c_x, 1.15, -0.24)
	d.add_child(shade_i)
	var flm := _cyl(d, Vector3(c_x, 1.06, -0.24), 0.042, 0.10, mat_flame, 8, false)
	flm.add_to_group("night_flame")

	# Taburete de escriba robusto con patas abiertas y travesaños (preserva interacción de asiento!)
	_cyl(d, Vector3(0.0, 0.46, 0.78), 0.27, 0.065, mat_oak, 10)
	for sx in [-0.17, 0.17]:
		for sz in [0.61, 0.95]:
			var s_leg := _cyl(d, Vector3(float(sx), 0.22, float(sz)), 0.036, 0.44, mat_walnut, 7)
			s_leg.rotation = Vector3((float(sz) - 0.78) * 0.34, 0.0, -float(sx) * 0.34)
	_box(d, Vector3(0.0, 0.16, 0.62), Vector3(0.32, 0.035, 0.035), mat_walnut, false)
	_box(d, Vector3(0.0, 0.16, 0.94), Vector3(0.32, 0.035, 0.035), mat_walnut, false)

	SceneEnhancer.add_box_collider(d, Vector3(0.0, 0.50, 0.0), Vector3(1.76, 1.00, 0.96))
	SceneEnhancer.add_box_collider(d, Vector3(0.0, 0.32, 0.78), Vector3(0.56, 0.64, 0.56))
	SceneEnhancer._attach_interactive_prop(d, "table", "Puesto del Scriptorium", "[T] Examinar manuscritos", Vector3.ZERO, "n", "Manuscritos iluminados, tinta fresca y notas sobre la historia dracónica de la isla.")
	var chair_anchor := Node3D.new()
	chair_anchor.name = "DeskChairAnchor"
	chair_anchor.position = Vector3(0.0, 0.0, 0.78)
	d.add_child(chair_anchor)
	var stool_slots: Array[Vector3] = [Vector3(0.0, 0.495, 0.0)]
	SceneEnhancer._attach_seat_prop(chair_anchor, "chair", "Taburete de escriba", "[T] Sentarse a estudiar", stool_slots, Vector3(0.0, 0.0, -1.0), 0.26, "n", false, 2.25)

# ==============================================================================
# FASE 5 — PASEO SUPERIOR, JARDINES Z7 Y FAROLES MONÁSTICOS DE PEDESTAL
# ==============================================================================
static func _build_stone_pedestal_lantern(
	builder: Node3D,
	parent: Node3D,
	lantern_name: String,
	pos: Vector3,
	mat_stone: Material,
	mat_iron: Material,
	mat_brass: Material,
	mat_flame: Material,
	light_energy: float = 2.05,
	light_range: float = 13.5
) -> Node3D:
	var ln := Node3D.new()
	ln.name = lantern_name
	ln.position = pos
	parent.add_child(ln)
	# Pedestal escalonado de caliza tallada
	_box(ln, Vector3(0.0, 0.14, 0.0), Vector3(0.76, 0.28, 0.76), mat_stone)
	_box(ln, Vector3(0.0, 0.36, 0.0), Vector3(0.58, 0.18, 0.58), mat_stone)
	_cyl(ln, Vector3(0.0, 0.96, 0.0), 0.18, 1.06, mat_stone, 8)
	_box(ln, Vector3(0.0, 1.54, 0.0), Vector3(0.46, 0.12, 0.46), mat_stone)
	# Collar de bronce y jaula de farol de hierro forjado
	_cyl(ln, Vector3(0.0, 1.64, 0.0), 0.16, 0.08, mat_brass, 8, false)
	for cx in [-0.14, 0.14]:
		for cz in [-0.14, 0.14]:
			_box(ln, Vector3(float(cx), 1.88, float(cz)), Vector3(0.035, 0.44, 0.035), mat_iron, false)
	_box(ln, Vector3(0.0, 2.13, 0.0), Vector3(0.42, 0.07, 0.42), mat_iron, false)
	_box(ln, Vector3(0.0, 2.21, 0.0), Vector3(0.28, 0.10, 0.28), mat_iron, false)
	_cyl(ln, Vector3(0.0, 2.31, 0.0), 0.04, 0.12, mat_brass, 8, false)
	# Núcleo luminoso cálido + OmniLight3D nocturna/atardecer
	var flm := _cyl(ln, Vector3(0.0, 1.88, 0.0), 0.095, 0.28, mat_flame, 8, false)
	flm.add_to_group("night_flame")
	var ol := OmniLight3D.new()
	ol.name = lantern_name + "_Light"
	ol.position = Vector3(0.0, 2.02, 0.0)
	ol.light_color = Color(1.0, 0.75, 0.38)
	ol.light_energy = light_energy
	ol.omni_range = light_range
	ln.add_child(ol)
	if builder.has_method("register_flame_fx"):
		builder.register_flame_fx(flm, ol, false)
	SceneEnhancer.add_cyl_collider(ln, Vector3(0.0, 1.0, 0.0), 0.38, 2.0)
	return ln

static func build_paseo_and_z7_enhancements(builder: Node3D, parent: Node3D, lanterns_parent: Node3D) -> void:
	var y: float = Structure.ELEV_A3_DINING # 18.0m
	var rng := RandomNumberGenerator.new()
	rng.seed = 202611501

	var mat_ashlar := UpperArch.create_weathered_ashlar_material(builder, Color("#c3b9a4"))
	var mat_ashlar_dark := UpperArch.create_weathered_ashlar_material(builder, Color("#9e9686"))
	var mat_basalt := UpperArch.create_dark_basalt_slab_material(builder)
	var mat_paseo_vcol := _make_tex_mat(builder, Color.WHITE, 0.86, 0.01, "ashlar-v4.webp", 0.32, 0.36)
	mat_paseo_vcol.vertex_color_use_as_albedo = true
	mat_paseo_vcol.vertex_color_is_srgb = true
	var mat_iron: Material = builder.get("mat_iron")
	var mat_bronze: Material = builder.get("mat_bronze")
	var mat_flame: Material = builder.get("mat_flame")
	var mat_moss := _make_solid_mat(Color("#475a38"), 0.92, 0.0)
	var plate_mesh := UpperArch.make_angular_basalt_plate_mesh(202611502)

	# 5.1 Pavimento variado en MultiMesh a lo largo del Paseo Superior (rompe repetición uniforme de Babylon sin alterar altura de paso)
	var flag_xfs: Array[Transform3D] = []
	var flag_cols: Array[Color] = []
	var paseo_tones: Array[Color] = [
		Color("#b8ae99"), Color("#aea490"), Color("#c3b9a4"), Color("#a39a87"), Color("#bdb39e")
	]
	for rz in range(5):
		var fz := lerpf(66.25, 70.95, float(rz) / 4.0)
		var cols_n := 46
		for cx in range(cols_n):
			var fx := lerpf(77.2, 144.6, float(cx) / float(cols_n - 1)) + (0.45 if rz % 2 == 1 else 0.0)
			if fx > 145.0:
				continue
			# Reservar las alfombras talladas de entrada de A4 y A3 para dar jerarquía a las portadas
			if rz == 0 and (absf(fx - 102.75) < 2.25 or absf(fx - 117.4) < 2.25):
				continue
			var sw := rng.randf_range(1.18, 1.46)
			var sd := rng.randf_range(0.84, 1.02)
			var yaw_j := rng.randf_range(-0.03, 0.03)
			flag_xfs.append(_box_xf(Vector3(fx + rng.randf_range(-0.05, 0.05), y + 0.017, fz + rng.randf_range(-0.04, 0.04)), Vector3(sw, 0.030, sd), Vector3(0.0, yaw_j, 0.0)))
			var c := paseo_tones[rng.randi() % paseo_tones.size()]
			if rz == 2 or rz == 1:
				c = c.lightened(0.04) # banda central más pulida por el tránsito
			elif rz == 4:
				c = c.darkened(0.07) # borde sur junto a las jardineras más sombreado/húmedo
			flag_cols.append(c)

	# Delantales de acceso tallados delante de las portadas de A4 (x=102.75) y A3 (x=117.4)
	for portal_x in [102.75, 117.4]:
		var px := float(portal_x)
		for row_a in range(3):
			var az := 65.58 + float(row_a) * 0.56
			var aw := 3.70 if row_a == 0 else (4.10 if row_a == 1 else 4.35)
			flag_xfs.append(_box_xf(Vector3(px, y + 0.025, az), Vector3(aw, 0.038, 0.50)))
			flag_cols.append(Color("#cdc4af") if row_a == 0 else Color("#c2b8a2"))

	# Bordillo de drenaje norte pegado al zócalo de fachada (respetando portadas de A4 y A3)
	for curb_seg in [[84.0, 99.6], [105.9, 114.2], [120.6, 134.8]]:
		var x0 := float(curb_seg[0])
		var x1 := float(curb_seg[1])
		flag_xfs.append(_box_xf(Vector3((x0 + x1) * 0.5, y + 0.045, 65.45), Vector3(x1 - x0, 0.075, 0.24)))
		flag_cols.append(Color("#999181"))
	# Musgo sutil en las juntas del borde sur del Paseo Superior
	for mx_i in range(18):
		var mx := lerpf(78.5, 143.5, float(mx_i) / 17.0) + rng.randf_range(-0.4, 0.4)
		_box(parent, Vector3(mx, y + 0.03, 71.36), Vector3(rng.randf_range(0.35, 0.75), 0.03, 0.22), mat_moss, false)

	_emit_box_mm(parent, "MM_PaseoVariedFlags", flag_xfs, mat_paseo_vcol, flag_cols, false)

	# 5.4 Jardines Z7 (x=73.5..83.2, z=54.5..64.6): sendero de losas por el acceso este despejado hacia el banco de piedra
	var z7_step_xfs: Array[Transform3D] = []
	var z7_step_cols: Array[Color] = []
	var step_pts := [
		Vector2(81.0, 65.2), Vector2(81.0, 64.3), Vector2(80.8, 63.4), Vector2(80.5, 62.5),
		Vector2(80.1, 61.6), Vector2(79.6, 60.6), Vector2(79.2, 59.6)
	]
	for sp_i in range(step_pts.size()):
		var sp: Vector2 = step_pts[sp_i]
		var sw_z := rng.randf_range(0.78, 1.02)
		var sd_z := rng.randf_range(0.56, 0.74)
		z7_step_xfs.append(_box_xf(Vector3(sp.x, y + 0.022, sp.y), Vector3(sw_z, 0.036, sd_z), Vector3(0.0, rng.randf_range(-0.18, 0.18), 0.0)))
		z7_step_cols.append(paseo_tones[sp_i % paseo_tones.size()])
	_emit_box_mm(parent, "MM_Z7SteppingPath", z7_step_xfs, mat_paseo_vcol, z7_step_cols, false)

	# Banco curvo / de piedra tallada en Jardines Z7 mirando hacia los macizos de lavanda
	var z7_bench := Node3D.new()
	z7_bench.name = "Z7_GardenStoneBench"
	z7_bench.position = Vector3(82.05, y, 62.55)
	z7_bench.rotation.y = -0.62
	parent.add_child(z7_bench)
	_box(z7_bench, Vector3(0.0, 0.44, 0.0), Vector3(1.85, 0.12, 0.56), mat_ashlar)
	_box(z7_bench, Vector3(-0.68, 0.20, 0.0), Vector3(0.28, 0.40, 0.48), mat_ashlar_dark)
	_box(z7_bench, Vector3(0.68, 0.20, 0.0), Vector3(0.28, 0.40, 0.48), mat_ashlar_dark)
	SceneEnhancer.add_box_collider(z7_bench, Vector3(0.0, 0.30, 0.0), Vector3(1.90, 0.60, 0.60))
	var z7_slots: Array[Vector3] = [Vector3(-0.45, 0.51, 0.0), Vector3(0.45, 0.51, 0.0)]
	SceneEnhancer._attach_seat_prop(z7_bench, "bench", "Banco del Jardín Z7", "[T] Sentarse en el jardín", z7_slots, Vector3(0.0, 0.0, -1.0), 0.24, "w", false, 2.5)

	# Peñascos naturales integrando el borde de Z7 con la montaña
	for bspec in [
		[Vector3(75.3, y - 0.15, 59.6), Vector3(1.45, 1.15, 1.35), 22.0],
		[Vector3(76.1, y - 0.15, 55.8), Vector3(1.65, 1.30, 1.40), -35.0],
		[Vector3(82.4, y - 0.15, 55.2), Vector3(1.25, 1.05, 1.15), 48.0]
	]:
		var rock := MeshInstance3D.new()
		rock.mesh = plate_mesh
		rock.material_override = mat_basalt
		rock.position = bspec[0]
		rock.scale = bspec[1]
		rock.rotation_degrees.y = float(bspec[2])
		rock.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		parent.add_child(rock)

	# 5.2 y 6.3 Faroles de pedestal en piedra tallada (2 miradores en Paseo + divisoria A4/A3 + entrada Jardines Z7 despejada)
	_build_stone_pedestal_lantern(builder, lanterns_parent, "PaseoWestLantern", Vector3(78.0, y, 71.62), mat_ashlar, mat_iron, mat_bronze, mat_flame, 2.15, 14.5)
	_build_stone_pedestal_lantern(builder, lanterns_parent, "PaseoMidLantern", Vector3(110.8, y, 65.92), mat_ashlar, mat_iron, mat_bronze, mat_flame, 1.95, 13.5)
	_build_stone_pedestal_lantern(builder, lanterns_parent, "PaseoEastLantern", Vector3(136.5, y, 71.62), mat_ashlar, mat_iron, mat_bronze, mat_flame, 2.15, 14.5)
	_build_stone_pedestal_lantern(builder, lanterns_parent, "Z7GardenLantern", Vector3(82.35, y, 64.45), mat_ashlar, mat_iron, mat_bronze, mat_flame, 2.25, 14.5)

