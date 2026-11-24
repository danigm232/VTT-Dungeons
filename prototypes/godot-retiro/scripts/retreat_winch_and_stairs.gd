@tool
class_name RetreatWinchAndStairs
extends RefCounted

# ==============================================================================
# FASE 2 — A2 CABRESTANTE, CASETA, ACANTILADO Y REPARACIÓN INTEGRAL DE ESCALERAS
# - Reconstrucción completa de A2 (carpintería portante, tejado completo sin
#   huecos, cierre hermético de la esquina SO, recorte limpio sin muros oclusores)
# - Maquinaria creíble y animada del cabrestante (tambor con cable enrollado,
#   engranaje de trinquete + trinquete unido a la palanca, cabrestante manual,
#   pescante reforzado, poleas interior y exterior, recorrido continuo sin clipping,
#   plataforma colgante con eslinga de 4 puntos y carga)
# - Acantilado basáltico fracturado por estratos, línea de marea húmeda, escollos
#   y espuma costera + iluminación nocturna coherente
# - Reconstrucción de escaleras: Acantilado Este A1<->A2, barandillas estrictamente
#   perimetrales en Z2 (Playa->A1), puente Paseo->A5 sin huecos ni rayas cebra y
#   escalones de montaña macizos
# ==============================================================================

const Structure = preload("res://scripts/retreat_structure.gd")
const SceneEnhancer = preload("res://scripts/retreat_scene_enhancer.gd")
const UpperArch = preload("res://scripts/retreat_upper_architecture.gd")
const InteractiveDoorScript = preload("res://scripts/interactive_door.gd")

# ------------------------------------------------------------------------------
# UTILIDADES GEOMÉTRICAS Y DE MATERIALES
# ------------------------------------------------------------------------------
static func _box(parent: Node3D, box_name: String, pos: Vector3, sz: Vector3, mat: Material, shadow: bool = true) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	mi.name = box_name
	var bm := BoxMesh.new()
	bm.size = sz
	mi.mesh = bm
	mi.material_override = mat
	mi.position = pos
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON if shadow else GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parent.add_child(mi)
	return mi

static func _cyl(parent: Node3D, cyl_name: String, pos: Vector3, radius: float, height: float, mat: Material, radial_segs: int = 12, shadow: bool = true) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	mi.name = cyl_name
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

static func _make_segment(parent: Node3D, seg_name: String, a: Vector3, b: Vector3, radius: float, mat: Material, radial_segs: int = 8, shadow: bool = false) -> MeshInstance3D:
	var vec := b - a
	var length := vec.length()
	if length < 0.01:
		return null
	var mi := _cyl(parent, seg_name, (a + b) * 0.5, radius, length + radius * 0.65, mat, radial_segs, shadow)
	var dir := vec / length
	var ref := Vector3.FORWARD if absf(dir.y) > 0.92 else Vector3.UP
	var x_ax := ref.cross(dir).normalized()
	var z_ax := x_ax.cross(dir).normalized()
	mi.transform = Transform3D(Basis(x_ax, dir, z_ax), (a + b) * 0.5)
	return mi

static func _make_catenary(parent: Node3D, rope_name: String, a: Vector3, b: Vector3, sag: float, radius: float, segs: int, mat: Material) -> void:
	var xfs: Array[Transform3D] = []
	_append_catenary_xfs(xfs, a, b, sag, radius, segs)
	_emit_cyl_mm(parent, rope_name, xfs, mat, 7, false)

static func _box_xf(pos: Vector3, sz: Vector3, yaw: float = 0.0) -> Transform3D:
	return Transform3D(Basis.from_euler(Vector3(0.0, yaw, 0.0)) * Basis.from_scale(sz), pos)

static func _cyl_xf(pos: Vector3, radius: float, height: float) -> Transform3D:
	return Transform3D(Basis.IDENTITY.scaled(Vector3(radius, height, radius)), pos)

static func _append_segment_xf(xfs: Array[Transform3D], a: Vector3, b: Vector3, radius: float) -> void:
	var vec := b - a
	var length := vec.length()
	if length < 0.01:
		return
	var dir := vec / length
	var ref := Vector3.FORWARD if absf(dir.y) > 0.92 else Vector3.UP
	var x_ax := ref.cross(dir).normalized()
	var z_ax := x_ax.cross(dir).normalized()
	var bas := Basis(x_ax * radius, dir * (length + radius * 0.65), z_ax * radius)
	xfs.append(Transform3D(bas, (a + b) * 0.5))

static func _append_catenary_xfs(xfs: Array[Transform3D], a: Vector3, b: Vector3, sag: float, radius: float, segs: int) -> void:
	var n_segs := maxi(2, segs)
	var pts: Array[Vector3] = []
	for i in range(n_segs + 1):
		var t := float(i) / float(n_segs)
		var p := a.lerp(b, t)
		p.y -= 4.0 * sag * t * (1.0 - t)
		pts.append(p)
	for i in range(n_segs):
		_append_segment_xf(xfs, pts[i], pts[i + 1], radius)

static func _emit_box_mm(parent: Node3D, batch_name: String, xfs: Array[Transform3D], mat: Material, shadow: bool = true) -> MultiMeshInstance3D:
	if xfs.is_empty():
		return null
	var bm := BoxMesh.new()
	bm.size = Vector3.ONE
	var mm := MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	mm.mesh = bm
	mm.instance_count = xfs.size()
	for i in range(xfs.size()):
		mm.set_instance_transform(i, xfs[i])
	var mmi := MultiMeshInstance3D.new()
	mmi.name = batch_name
	mmi.multimesh = mm
	mmi.material_override = mat
	mmi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON if shadow else GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parent.add_child(mmi)
	return mmi

static func _emit_cyl_mm(parent: Node3D, batch_name: String, xfs: Array[Transform3D], mat: Material, radial_segs: int = 8, shadow: bool = true) -> MultiMeshInstance3D:
	if xfs.is_empty():
		return null
	var cm := CylinderMesh.new()
	cm.top_radius = 1.0
	cm.bottom_radius = 1.0
	cm.height = 1.0
	cm.radial_segments = radial_segs
	var mm := MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	mm.mesh = cm
	mm.instance_count = xfs.size()
	for i in range(xfs.size()):
		mm.set_instance_transform(i, xfs[i])
	var mmi := MultiMeshInstance3D.new()
	mmi.name = batch_name
	mmi.multimesh = mm
	mmi.material_override = mat
	mmi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON if shadow else GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parent.add_child(mmi)
	return mmi

static func _make_gable_triangle_mesh(span_z: float, ridge_h: float, thickness_x: float) -> ArrayMesh:
	# Prisma triangular exacto en YZ de grosor thickness_x en X (cierra el hastial sin ningún hueco)
	var hz := span_z * 0.5
	var hx := thickness_x * 0.5
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	st.set_smooth_group(-1)
	var a0 := Vector3(-hx, 0.0, -hz)
	var b0 := Vector3(-hx, 0.0, hz)
	var c0 := Vector3(-hx, ridge_h, 0.0)
	var a1 := Vector3(hx, 0.0, -hz)
	var b1 := Vector3(hx, 0.0, hz)
	var c1 := Vector3(hx, ridge_h, 0.0)
	# Cara -X
	st.set_uv(Vector2(0.0, 0.0)); st.add_vertex(a0)
	st.set_uv(Vector2(1.0, 0.0)); st.add_vertex(b0)
	st.set_uv(Vector2(0.5, 1.0)); st.add_vertex(c0)
	# Cara +X
	st.set_uv(Vector2(0.0, 0.0)); st.add_vertex(b1)
	st.set_uv(Vector2(1.0, 0.0)); st.add_vertex(a1)
	st.set_uv(Vector2(0.5, 1.0)); st.add_vertex(c1)
	# Base inferior
	_st_quad(st, a0, a1, b1, b0)
	# Faldón norte
	_st_quad(st, a1, a0, c0, c1)
	# Faldón sur
	_st_quad(st, b0, b1, c1, c0)
	st.generate_normals()
	return st.commit()

static func _st_quad(st: SurfaceTool, p0: Vector3, p1: Vector3, p2: Vector3, p3: Vector3) -> void:
	st.set_uv(Vector2(0.0, 0.0)); st.add_vertex(p0)
	st.set_uv(Vector2(1.0, 0.0)); st.add_vertex(p1)
	st.set_uv(Vector2(1.0, 1.0)); st.add_vertex(p2)
	st.set_uv(Vector2(0.0, 0.0)); st.add_vertex(p0)
	st.set_uv(Vector2(1.0, 1.0)); st.add_vertex(p2)
	st.set_uv(Vector2(0.0, 1.0)); st.add_vertex(p3)

static func _make_foam_collar_mesh(inner_r: float, outer_r: float, seed_val: int) -> ArrayMesh:
	var rng := RandomNumberGenerator.new()
	rng.seed = seed_val
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var segs := 20
	var inner_pts: Array[Vector3] = []
	var outer_pts: Array[Vector3] = []
	for i in range(segs):
		var ang := (float(i) / float(segs)) * TAU
		var wobble := 1.0 + 0.16 * sin(ang * 3.0 + float(seed_val)) + rng.randf_range(-0.08, 0.08)
		var ri := inner_r * (0.94 + 0.08 * cos(ang * 2.0))
		var ro := outer_r * wobble
		inner_pts.append(Vector3(cos(ang) * ri, 0.0, sin(ang) * ri))
		outer_pts.append(Vector3(cos(ang) * ro, 0.0, sin(ang) * ro))
	for i in range(segs):
		var ni := (i + 1) % segs
		var c_in := Color(0.86, 0.92, 0.96, 0.24)
		var c_out := Color(0.78, 0.88, 0.94, 0.0)
		st.set_color(c_in); st.add_vertex(inner_pts[i])
		st.set_color(c_out); st.add_vertex(outer_pts[i])
		st.set_color(c_out); st.add_vertex(outer_pts[ni])
		st.set_color(c_in); st.add_vertex(inner_pts[i])
		st.set_color(c_out); st.add_vertex(outer_pts[ni])
		st.set_color(c_in); st.add_vertex(inner_pts[ni])
	st.generate_normals()
	return st.commit()

static func _make_foam_mat() -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = Color(0.86, 0.90, 0.92, 0.36)
	m.vertex_color_use_as_albedo = true
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	m.depth_draw_mode = BaseMaterial3D.DEPTH_DRAW_DISABLED
	m.cull_mode = BaseMaterial3D.CULL_DISABLED
	m.roughness = 0.78
	m.metallic_specular = 0.12
	return m

static func _make_basalt_mat(builder: Node3D, tint: Color, roughness_v: float = 0.86) -> StandardMaterial3D:
	var tex_basalt: Texture2D = builder.call("_load_tex", "basalt-coastal-albedo-v1.webp")
	if tex_basalt == null:
		tex_basalt = builder.call("_load_tex", "a1-cliff-rugged-v8.jpg")
	var tex_norm: Texture2D = builder.call("_load_tex", "rock-normal-v1.png")
	var m := StandardMaterial3D.new()
	m.albedo_color = tint
	m.roughness = roughness_v
	m.metallic = 0.02
	if tex_basalt:
		m.albedo_texture = tex_basalt
		m.uv1_triplanar = true
		m.uv1_world_triplanar = true
		m.uv1_scale = Vector3(0.18, 0.18, 0.18)
	if tex_norm:
		m.normal_enabled = true
		m.normal_texture = tex_norm
		m.normal_scale = 0.78
	return m

static func _make_wet_basalt_mat(builder: Node3D) -> StandardMaterial3D:
	var m := _make_basalt_mat(builder, Color("#4a555c"), 0.34)
	m.metallic = 0.04
	return m

static func _make_rope_mat(builder: Node3D) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = Color("#b89c6a")
	m.roughness = 0.90
	m.metallic = 0.0
	var tex_oak: Texture2D = builder.call("_load_tex", "a1-oak-v5.png")
	if tex_oak:
		m.albedo_texture = tex_oak
		m.uv1_triplanar = true
		m.uv1_scale = Vector3(1.6, 1.6, 1.6)
	return m

static func _make_shingle_mat(builder: Node3D, tint: Color) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = tint
	m.roughness = 0.86
	m.metallic = 0.02
	var tex_oak: Texture2D = builder.call("_load_tex", "a1-oak-v5.png")
	if tex_oak:
		m.albedo_texture = tex_oak
		m.uv1_triplanar = true
		m.uv1_scale = Vector3(0.45, 0.45, 0.45)
	return m

# ==============================================================================
# 1. FASE 2 — COMPLEJO COMPLETO DEL CABRESTANTE A2 (CASETA + MÁQUINA + ACANTILADO)
# ==============================================================================
static func build_a2_winch_complex(builder: Node3D) -> Dictionary:
	var a2_node := Node3D.new()
	a2_node.name = "A2_WinchAssembly"
	builder.add_child(a2_node)

	var layers := UpperArch.ensure_zone_layer_groups(a2_node, "A2")
	var l_floor: Node3D = layers["Floor"]
	var l_walls: Node3D = layers["WallsInterior"]
	var l_rock: Node3D = layers["ExteriorRock"]
	var l_facade: Node3D = layers["Facade"]
	var l_furn: Node3D = layers["Furniture"]
	var l_light: Node3D = layers["Lighting"]
	var l_decor: Node3D = layers["Decor"]

	var y: float = Structure.ELEV_A2_WINCH # 15.0m
	var rng := RandomNumberGenerator.new()
	rng.seed = 202611228

	# Materiales armonizados de carpintería naval/monástica, sillería y basalto volcánico
	var mat_wood: Material = builder.get("mat_wood")
	var mat_wood_dark: Material = builder.get("mat_wood_dark")
	var mat_iron: Material = builder.get("mat_iron")
	var mat_bronze: Material = builder.get("mat_bronze")
	var mat_gold: Material = builder.get("mat_gold")
	var mat_flame: Material = builder.get("mat_flame")
	var mat_cloth: Material = builder.get("mat_cloth_warm")
	var mat_ashlar := UpperArch.create_weathered_ashlar_material(builder, Color("#c0b8a4"))
	var mat_ashlar_b := UpperArch.create_weathered_ashlar_material(builder, Color("#afa692"))
	var mat_basalt_carved := _make_basalt_mat(builder, Color("#9ca6aa"), 0.86)
	var mat_basalt_dark := _make_basalt_mat(builder, Color("#849096"), 0.88)
	var mat_basalt_slab := UpperArch.create_dark_basalt_slab_material(builder)
	var mat_wet_basalt := _make_wet_basalt_mat(builder)
	var mat_rope := _make_rope_mat(builder)
	var mat_shingle_a := _make_shingle_mat(builder, Color("#654b35"))
	var mat_shingle_b := _make_shingle_mat(builder, Color("#5b422e"))
	var mat_plank_wall := _make_shingle_mat(builder, Color("#8e6c49"))
	var mat_deck_plank := _make_shingle_mat(builder, Color("#826345"))
	var mat_deck_plank_b := _make_shingle_mat(builder, Color("#76593d"))
	var mat_sack := StandardMaterial3D.new()
	mat_sack.albedo_color = Color("#b59c72")
	mat_sack.roughness = 0.92
	var mat_foam := _make_foam_mat()
	var plate_mesh := UpperArch.make_angular_basalt_plate_mesh(202611229)

	# Límites arquitectónicos limpios de la caseta:
	# - Porche/rellano exterior común (EastStairs + Paseo->A2 + entrada A2): x=153.0..156.10, z=65.4..72.2
	# - Caseta cerrada hermética sin huecos (esquina SO 100% cerrada!): x=156.10..166.00, z=63.05..70.65
	var x_w := 156.10
	var x_e := 166.00
	var z_n := 63.05
	var z_s := 70.65
	var x_mid := (x_w + x_e) * 0.5 # 161.05
	var z_mid := (z_n + z_s) * 0.5 # 66.85
	var house_w := x_e - x_w       # 9.90m
	var house_d := z_s - z_n       # 7.60m
	var wall_top := y + 3.68       # 18.68m
	var dado_h := 0.78             # 15.0..15.78m siempre visible

	# --------------------------------------------------------------------------
	# A. NODO ESTRUCTURAL PRINCIPAL (SIEMPRE VISIBLE + COLISIONES + PUERTA)
	# --------------------------------------------------------------------------
	var wh := Node3D.new()
	wh.name = "A2_WinchHouseStructure"
	a2_node.add_child(wh)

	# 1. Terraza exterior de sillería (porche de confluencia Paseo->A2 + Escalera Este + Puerta A2)
	_box(l_floor, "A2_WestEntryStoneDeck", Vector3(154.55, y - 0.16, 68.70), Vector3(3.30, 0.34, 6.80), mat_ashlar_b)
	for row_i in range(6):
		for col_i in range(3):
			var sx := lerpf(153.35, 155.55, float(col_i) / 2.0) + rng.randf_range(-0.04, 0.04)
			var sz := lerpf(65.95, 71.55, float(row_i) / 5.0) + rng.randf_range(-0.04, 0.04)
			var flg := _box(l_floor, "A2_PorchSlab_%d_%d" % [row_i, col_i], Vector3(sx, y + 0.014, sz), Vector3(0.92, 0.04, 0.94), mat_ashlar if (row_i + col_i) % 2 == 0 else mat_ashlar_b, false)
			flg.rotation.y = rng.randf_range(-0.025, 0.025)
	# Cimentación pétrea bajo el porche oeste
	_box(l_rock, "A2_PorchPlinthCore", Vector3(154.55, y * 0.5 - 0.55, 68.70), Vector3(3.15, y - 0.65, 6.45), mat_basalt_carved)

	# 2. Cubierta de roble interior entablada + vigas durmientes y faldón de borde
	_box(wh, "WinchExpandedDeck", Vector3(x_mid, y - 0.16, z_mid), Vector3(house_w + 0.55, 0.32, house_d + 0.55), mat_wood_dark)
	# Tablas visibles del suelo interior (dirección E-O) con variación suave de roble
	var plank_rows := 14
	for pi in range(plank_rows):
		var pz := lerpf(z_n + 0.36, z_s - 0.36, float(pi) / float(plank_rows - 1))
		var pmat: Material = mat_deck_plank if pi % 2 == 0 else mat_deck_plank_b
		_box(l_floor, "A2_DeckPlank_%d" % pi, Vector3(x_mid, y + 0.015, pz), Vector3(house_w - 0.38, 0.04, 0.48), pmat, false)
	# Umbral de piedra caliza bajo la puerta doble oeste
	_box(l_floor, "A2_DoorThreshold", Vector3(x_w, y + 0.03, 67.55), Vector3(0.68, 0.08, 3.05), mat_ashlar, false)
	# Bordillo de madera de seguridad y tope en el vano de carga sur-este (x=160.85..165.85)
	_box(l_floor, "A2_CargoBaySafetyCurb", Vector3(163.35, y + 0.14, z_s - 0.06), Vector3(4.90, 0.28, 0.34), mat_wood_dark)
	for b_x in [161.35, 165.35]:
		_cyl(l_floor, "A2_CargoBollard_%d" % int(b_x * 10.0), Vector3(float(b_x), y + 0.34, z_s - 0.12), 0.13, 0.68, mat_wood_dark, 10)
		_cyl(l_floor, "A2_CargoBollardCap_%d" % int(b_x * 10.0), Vector3(float(b_x), y + 0.69, z_s - 0.12), 0.145, 0.06, mat_iron, 10)

	# 3. Basamento / núcleo de acantilado bajo la caseta + contrafuertes y estratos basálticos (Fase 2.3)
	_box(wh, "WinchStonePlinth", Vector3(x_mid, y * 0.5 - 0.60, z_mid), Vector3(house_w - 0.25, y - 0.60, house_d - 0.30), mat_basalt_carved)
	_build_a2_cliff_and_coast(a2_node, l_rock, y, x_w, x_e, z_n, z_s, mat_ashlar, mat_ashlar_b, mat_basalt_carved, mat_basalt_slab, mat_wet_basalt, mat_wood_dark, mat_foam, plate_mesh, rng)

	# 4. Zócalo de sillería continuo en las 4 fachadas (SIEMPRE visible; cierra herméticamente la esquina SO!)
	# Norte (completo)
	_box(wh, "WinchWallNorthBase", Vector3(x_mid, y + dado_h * 0.5, z_n), Vector3(house_w + 0.24, dado_h, 0.44), mat_ashlar_b)
	_box(l_walls, "WinchWallNorthDadoCap", Vector3(x_mid, y + dado_h + 0.04, z_n), Vector3(house_w + 0.32, 0.10, 0.50), mat_ashlar)
	# Este (completo)
	_box(wh, "WinchWallEastBase", Vector3(x_e, y + dado_h * 0.5, z_mid), Vector3(0.44, dado_h, house_d + 0.24), mat_ashlar_b)
	_box(l_walls, "WinchWallEastDadoCap", Vector3(x_e, y + dado_h + 0.04, z_mid), Vector3(0.50, 0.10, house_d + 0.32), mat_ashlar)
	# Sur (tramo cerrado x=156.00..161.00 con zócalo completo -> CERO HUECO EN ESQUINA SO!, tramo de carga 161.00..166.10 con murete bajo 0.42m)
	_box(wh, "WinchWallSouthBase", Vector3(158.48, y + dado_h * 0.5, z_s), Vector3(4.96, dado_h, 0.44), mat_ashlar_b)
	_box(l_facade, "WinchWallSouthDadoCap", Vector3(158.48, y + dado_h + 0.04, z_s), Vector3(5.06, 0.10, 0.50), mat_ashlar)
	_box(wh, "WinchWallSouthCargoSill", Vector3(163.52, y + 0.24, z_s), Vector3(5.16, 0.48, 0.46), mat_ashlar_b)
	# Oeste (flancos norte y sur de la puerta doble, cerrando exactamente en z_n y z_s con sillares esquineros)
	_box(wh, "WinchWallWestBaseN", Vector3(x_w, y + dado_h * 0.5, 64.58), Vector3(0.44, dado_h, 3.16), mat_ashlar_b)
	_box(wh, "WinchWallWestBaseS", Vector3(x_w, y + dado_h * 0.5, 69.82), Vector3(0.44, dado_h, 1.84), mat_ashlar_b)
	# Sillares de esquina (quoins) reforzando las 4 esquinas exteriores en toda la altura del zócalo
	for corner in [Vector2(x_w, z_n), Vector2(x_e, z_n), Vector2(x_w, z_s), Vector2(x_e, z_s)]:
		_box(l_facade, "A2_CornerQuoin_%d_%d" % [int(corner.x), int(corner.y)], Vector3(corner.x, y + dado_h * 0.54, corner.y), Vector3(0.58, dado_h + 0.10, 0.58), mat_ashlar)

	# 5. Muro Norte completo (siempre visible como telón arquitectónico de fondo en cutaway!)
	_box(wh, "WinchWallNorthTimber", Vector3(x_mid, y + 2.26, z_n), Vector3(house_w - 0.10, 2.86, 0.28), mat_plank_wall)
	for px in [x_w, 158.55, 160.95, 163.50, x_e]:
		_box(l_walls, "WinchNorthPost_%d" % int(px * 10.0), Vector3(float(px), y + 1.84, z_n), Vector3(0.32, 3.68, 0.38), mat_wood_dark)
	_box(l_walls, "WinchNorthWallPlate", Vector3(x_mid, wall_top - 0.14, z_n), Vector3(house_w + 0.30, 0.28, 0.40), mat_wood_dark)
	_box(l_walls, "WinchNorthMidRail", Vector3(x_mid, y + 2.15, z_n + 0.04), Vector3(house_w - 0.12, 0.18, 0.34), mat_wood_dark)
	# Tornapuntas diagonales en entramado norte
	for brace_x in [157.3, 164.7]:
		var nb := _box(l_walls, "WinchNorthBrace_%d" % int(brace_x * 10.0), Vector3(float(brace_x), y + 2.95, z_n + 0.06), Vector3(0.16, 1.55, 0.16), mat_wood_dark)
		nb.rotation.z = 0.62 if brace_x < x_mid else -0.62
	# Repisa interior de herramientas en muro norte (poblada con polea de repuesto, aceitera, maza, grilletes y cabo colgado)
	_box(l_walls, "WinchNorthToolShelf", Vector3(159.75, y + 1.92, z_n + 0.34), Vector3(2.15, 0.10, 0.44), mat_wood)
	for sh_x in [158.9, 160.6]:
		_box(l_walls, "WinchShelfCorbel_%d" % int(sh_x * 10.0), Vector3(float(sh_x), y + 1.72, z_n + 0.28), Vector3(0.10, 0.32, 0.32), mat_wood_dark)
	# Utillaje sobre la repisa norte de A2 (Fase 6)
	_cyl(l_decor, "WinchShelfSparePulley", Vector3(158.98, y + 2.09, z_n + 0.34), 0.14, 0.16, mat_iron, 12, false)
	_cyl(l_decor, "WinchShelfOilCan", Vector3(159.45, y + 2.09, z_n + 0.32), 0.085, 0.24, mat_bronze, 10, false)
	_box(l_decor, "WinchShelfMalletHead", Vector3(159.95, y + 2.04, z_n + 0.36), Vector3(0.24, 0.13, 0.13), mat_wood_dark, false)
	_box(l_decor, "WinchShelfMalletHandle", Vector3(160.20, y + 2.02, z_n + 0.36), Vector3(0.36, 0.045, 0.045), mat_wood, false)
	_box(l_decor, "WinchShelfTallowBox", Vector3(160.56, y + 2.07, z_n + 0.33), Vector3(0.32, 0.19, 0.26), mat_wood_dark, false)
	# Cabo enrollado colgado de una clavija en el paño oeste del muro norte
	_box(l_decor, "WinchWallRopePeg", Vector3(157.45, y + 2.05, z_n + 0.22), Vector3(0.08, 0.08, 0.22), mat_wood_dark, false)
	var wall_rope := MeshInstance3D.new()
	wall_rope.name = "WinchWallHangingRopeCoil"
	var wrt := TorusMesh.new()
	wrt.inner_radius = 0.20
	wrt.outer_radius = 0.31
	wrt.rings = 14
	wrt.ring_segments = 8
	wall_rope.mesh = wrt
	wall_rope.material_override = mat_rope
	wall_rope.position = Vector3(157.45, y + 1.84, z_n + 0.26)
	wall_rope.rotation.x = PI * 0.5
	l_decor.add_child(wall_rope)

	# 6. Muro Este completo con gran ventana marina panorámica y contraventanas abiertas (siempre visible)
	_box(wh, "WinchWallEastN", Vector3(x_e, y + 2.26, 64.18), Vector3(0.28, 2.86, 2.28), mat_plank_wall)
	_box(wh, "WinchWallEastS", Vector3(x_e, y + 2.26, 69.52), Vector3(0.28, 2.86, 2.28), mat_plank_wall)
	_box(wh, "WinchWallEastHeader", Vector3(x_e, y + 3.28, z_mid), Vector3(0.32, 0.84, 3.26), mat_wood_dark)
	_box(l_facade, "WinchWallEastSill", Vector3(x_e + 0.06, y + 1.24, z_mid), Vector3(0.46, 0.16, 3.32), mat_wood_dark)
	_box(wh, "WinchWallEastSpandrel", Vector3(x_e, y + 0.98, z_mid), Vector3(0.28, 0.44, 3.26), mat_plank_wall)
	for ez in [65.30, 68.40]:
		_box(l_facade, "WinchEastWinPost_%d" % int(ez * 10.0), Vector3(x_e, y + 2.25, float(ez)), Vector3(0.36, 2.90, 0.24), mat_wood_dark)
		# Contraventanas de madera abiertas al exterior con herrajes
		var s_off := -0.54 if ez < z_mid else 0.54
		_box(l_facade, "WinchEastShutter_%d" % int(ez * 10.0), Vector3(x_e + 0.22, y + 2.08, float(ez) + s_off), Vector3(0.08, 1.56, 0.86), mat_wood)
		_box(l_facade, "WinchEastShutterStrap_%d" % int(ez * 10.0), Vector3(x_e + 0.27, y + 2.08, float(ez) + s_off), Vector3(0.03, 0.10, 0.80), mat_iron)
	_box(l_facade, "WinchEastWinMullion", Vector3(x_e, y + 2.08, z_mid), Vector3(0.14, 1.62, 0.14), mat_wood_dark)
	_box(l_walls, "WinchEastWallPlate", Vector3(x_e, wall_top - 0.14, z_mid), Vector3(0.40, 0.28, house_d + 0.30), mat_wood_dark)
	# Pilares esquineros Este (siempre visibles)
	_box(l_walls, "WinchEastPillarSE", Vector3(x_e, y + 1.84, z_s), Vector3(0.36, 3.68, 0.36), mat_wood_dark)

	# 7. Colisiones físicas permanentes de los 4 muros (activas incluso cuando el recorte visual abre el techo/muros)
	SceneEnhancer.add_box_collider(wh, Vector3(x_mid, y + 1.85, z_n), Vector3(house_w + 0.30, 3.7, 0.52))
	SceneEnhancer.add_box_collider(wh, Vector3(x_e, y + 1.85, z_mid), Vector3(0.52, 3.7, house_d + 0.30))
	SceneEnhancer.add_box_collider(wh, Vector3(x_mid, y + 1.85, z_s), Vector3(house_w + 0.30, 3.7, 0.52))
	SceneEnhancer.add_box_collider(wh, Vector3(x_w, y + 1.85, 64.58), Vector3(0.52, 3.7, 3.10))
	SceneEnhancer.add_box_collider(wh, Vector3(x_w, y + 1.85, 69.82), Vector3(0.52, 3.7, 1.80))

	# 8. Puerta doble de roble interactiva (Door_A2_Winch) en el nuevo muro Oeste (x_w=156.10, z=67.55)
	var a2_door := InteractiveDoorScript.new()
	a2_door.name = "Door_A2_Winch"
	a2_door.door_id = "a2_winch"
	a2_door.door_title = "Puerta del Cabrestante (A2)"
	a2_door.is_open = true
	a2_door.open_angle_rad = 1.30
	a2_door.interact_radius = 2.95
	a2_door.position = Vector3(x_w, y, 67.55)
	a2_door.rotation.y = -PI * 0.5
	wh.add_child(a2_door)
	var a2_leaf_w := 1.32
	var a2_leaf_h := 2.74
	var a2_left_piv := Node3D.new()
	a2_left_piv.name = "LeftLeafPivot"
	a2_left_piv.position = Vector3(-1.34, 0.0, 0.0)
	a2_door.add_child(a2_left_piv)
	var a2_right_piv := Node3D.new()
	a2_right_piv.name = "RightLeafPivot"
	a2_right_piv.position = Vector3(1.34, 0.0, 0.0)
	a2_door.add_child(a2_right_piv)
	for leaf_cfg in [[a2_left_piv, 1.0, "Left"], [a2_right_piv, -1.0, "Right"]]:
		var piv: Node3D = leaf_cfg[0]
		var sgn: float = float(leaf_cfg[1])
		var tag: String = str(leaf_cfg[2])
		var cx_l := sgn * (a2_leaf_w * 0.5)
		_box(piv, "WinchOakLeaf_%s" % tag, Vector3(cx_l, a2_leaf_h * 0.5, 0.0), Vector3(a2_leaf_w, a2_leaf_h, 0.11), mat_wood)
		for rail_y in [0.22, 1.36, 2.50]:
			_box(piv, "WinchRail_%s_%d" % [tag, int(rail_y * 10.0)], Vector3(cx_l, float(rail_y), 0.064), Vector3(a2_leaf_w - 0.06, 0.14, 0.025), mat_wood_dark, false)
		for band_y in [0.46, 1.38, 2.28]:
			_box(piv, "WinchStrap_%s_%d" % [tag, int(band_y * 10.0)], Vector3(cx_l, float(band_y), 0.0), Vector3(a2_leaf_w - 0.08, 0.085, 0.14), mat_iron)
		_cyl(piv, "WinchRing_%s" % tag, Vector3(sgn * (a2_leaf_w - 0.22), 1.24, 0.08), 0.065, 0.05, mat_bronze, 10, false)
		_cyl(piv, "WinchRingIn_%s" % tag, Vector3(sgn * (a2_leaf_w - 0.22), 1.24, -0.08), 0.065, 0.05, mat_bronze, 10, false)
	var a2_blocker_body := StaticBody3D.new()
	a2_blocker_body.name = "DoorBlockerBody"
	a2_door.add_child(a2_blocker_body)
	var a2_blocker_col := CollisionShape3D.new()
	var a2_blocker_box := BoxShape3D.new()
	a2_blocker_box.size = Vector3(2.70, 2.75, 0.36)
	a2_blocker_col.shape = a2_blocker_box
	a2_blocker_col.position = Vector3(0.0, 1.38, 0.0)
	a2_blocker_body.add_child(a2_blocker_col)
	a2_door.left_pivot = a2_left_piv
	a2_door.right_pivot = a2_right_piv
	a2_door.blocker_shape = a2_blocker_col
	a2_door.set_open(true, false)

	# --------------------------------------------------------------------------
	# B. MUROS FRONTALES RECORTABLES (A2_WinchCutawayWalls — 100% SÓLIDOS POR FUERA,
	#    OCULTOS LIMPIAMENTE AL ENTRAR PARA VER TODO EL CABRESTANTE SIN OCLUSIÓN!)
	# --------------------------------------------------------------------------
	var wh_cut := Node3D.new()
	wh_cut.name = "A2_WinchCutawayWalls"
	a2_node.add_child(wh_cut)

	# B1. Muro Sur superior (x=156.10..160.95 cerrado con entramado + ventana, x=160.95..166.00 arcada abierta del pescante)
	_box(wh_cut, "WinchSouthCornerPostSW", Vector3(x_w, y + 2.26, z_s), Vector3(0.36, 2.94, 0.36), mat_wood_dark)
	_box(wh_cut, "WinchSouthMidPost", Vector3(160.95, y + 2.26, z_s), Vector3(0.36, 2.94, 0.36), mat_wood_dark)
	_box(wh_cut, "WinchSouthWallPlate", Vector3(x_mid, wall_top - 0.14, z_s), Vector3(house_w + 0.30, 0.28, 0.42), mat_wood_dark)
	# Paño cerrado oeste del muro sur (x=156.10..160.95) con ventanuco enmarcado y contraventanas
	_box(wh_cut, "WinchWallSouthW_Lower", Vector3(158.52, y + 1.18, z_s), Vector3(4.78, 0.84, 0.28), mat_plank_wall)
	_box(wh_cut, "WinchWallSouthW_Left", Vector3(156.92, y + 2.15, z_s), Vector3(1.56, 1.38, 0.28), mat_plank_wall)
	_box(wh_cut, "WinchWallSouthW_Right", Vector3(160.12, y + 2.15, z_s), Vector3(1.56, 1.38, 0.28), mat_plank_wall)
	_box(wh_cut, "WinchWallSouthW_Top", Vector3(158.52, y + 3.22, z_s), Vector3(4.78, 0.90, 0.28), mat_plank_wall)
	_box(wh_cut, "WinchSouthWinSill", Vector3(158.52, y + 1.56, z_s + 0.08), Vector3(1.88, 0.14, 0.42), mat_wood_dark)
	_box(wh_cut, "WinchSouthWinHead", Vector3(158.52, y + 2.82, z_s + 0.06), Vector3(1.88, 0.16, 0.38), mat_wood_dark)
	for sw_x in [157.68, 159.36]:
		_box(wh_cut, "WinchSouthWinJamb_%d" % int(sw_x * 10.0), Vector3(float(sw_x), y + 2.18, z_s + 0.04), Vector3(0.16, 1.30, 0.34), mat_wood_dark)
	_box(wh_cut, "WinchSouthWinBarV", Vector3(158.52, y + 2.18, z_s + 0.02), Vector3(0.10, 1.24, 0.12), mat_wood_dark)
	# Tornapuntas exteriores en la esquina SO
	var sw_brace := _box(wh_cut, "WinchSouthSWBrace", Vector3(156.78, y + 3.04, z_s + 0.06), Vector3(0.16, 1.30, 0.18), mat_wood_dark)
	sw_brace.rotation.z = 0.68
	# Dintel y tornapuntas de la gran bahía de carga del cabrestante (x=160.95..166.00)
	_box(wh_cut, "WinchWallSouthHeader", Vector3(163.48, y + 3.30, z_s), Vector3(5.12, 0.62, 0.36), mat_wood_dark)
	for cb_s in [-1.0, 1.0]:
		var kb := _box(wh_cut, "WinchCargoBayBrace_%s" % ("W" if cb_s < 0.0 else "E"), Vector3(163.48 + float(cb_s) * 2.02, y + 2.72, z_s), Vector3(0.20, 1.25, 0.24), mat_wood_dark)
		kb.rotation.z = float(cb_s) * 0.64

	# B2. Muro Oeste superior (x_w=156.10 — completamente cerrado alrededor y encima de la puerta doble!)
	_box(wh_cut, "WinchWallWestUpperN", Vector3(x_w, y + 2.26, 64.58), Vector3(0.30, 2.94, 3.02), mat_plank_wall)
	_box(wh_cut, "WinchWallWestUpperS", Vector3(x_w, y + 2.26, 69.82), Vector3(0.30, 2.94, 1.66), mat_plank_wall)
	_box(wh_cut, "WinchDoorFrameN", Vector3(x_w, y + 1.54, 66.12), Vector3(0.46, 3.08, 0.24), mat_wood_dark)
	_box(wh_cut, "WinchDoorFrameS", Vector3(x_w, y + 1.54, 68.98), Vector3(0.46, 3.08, 0.24), mat_wood_dark)
	_box(wh_cut, "WinchDoorLintel", Vector3(x_w, y + 2.98, 67.55), Vector3(0.50, 0.36, 3.32), mat_wood_dark)
	_box(wh_cut, "WinchDoorOverTransom", Vector3(x_w, y + 3.44, 67.55), Vector3(0.32, 0.64, 3.16), mat_plank_wall)
	_box(wh_cut, "WinchWestWallPlate", Vector3(x_w, wall_top - 0.14, z_mid), Vector3(0.42, 0.28, house_d + 0.30), mat_wood_dark)
	for w_br in [-1.0, 1.0]:
		var wb := _box(wh_cut, "WinchWestDoorBrace_%s" % ("N" if w_br < 0.0 else "S"), Vector3(x_w - 0.06, y + 2.45, 67.55 + float(w_br) * 1.18), Vector3(0.14, 0.78, 0.16), mat_wood_dark)
		wb.rotation.x = float(w_br) * 0.65
	# Herrajes de refuerzo en el dintel exterior oeste
	for st_z in [66.35, 68.75]:
		_box(wh_cut, "WinchLintelIron_%d" % int(st_z * 10.0), Vector3(x_w - 0.26, y + 2.98, float(st_z)), Vector3(0.05, 0.32, 0.14), mat_iron)

	# --------------------------------------------------------------------------
	# C. TEJADO A DOS AGUAS COMPLETO CON TEJAS DE MADERA, ALEROS Y HASTIALES CERRADOS (A2_WinchRoof)
	# --------------------------------------------------------------------------
	var wh_roof := Node3D.new()
	wh_roof.name = "A2_WinchRoof"
	a2_node.add_child(wh_roof)

	var ridge_rise := 2.02
	var slope_run := house_d * 0.5 + 0.92 # 4.72m por vertiente (generosos aleros!)
	var slope_pitch := atan2(ridge_rise, house_d * 0.5) # ~0.488 rad (28°)
	var slope_len := sqrt(slope_run * slope_run + (slope_run * tan(slope_pitch)) * (slope_run * tan(slope_pitch)))
	var roof_span_x := house_w + 1.48 # 11.38m (alero protector sobre puerta oeste y muro este)
	var ridge_y := wall_top + ridge_rise # 20.70m

	# Hastiales triangulares macizos en Oeste y Este (sellan 100% el encuentro muro-cubierta sin rendijas!)
	var gable_mesh := _make_gable_triangle_mesh(house_d + 0.18, ridge_rise + 0.06, 0.30)
	for g_cfg in [[x_w, "West"], [x_e, "East"]]:
		var gx: float = float(g_cfg[0])
		var gtag: String = str(g_cfg[1])
		var gm := MeshInstance3D.new()
		gm.name = "WinchGable_%s" % gtag
		gm.mesh = gable_mesh
		gm.material_override = mat_plank_wall
		gm.position = Vector3(gx, wall_top - 0.06, z_mid)
		gm.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		wh_roof.add_child(gm)
		# Pendolón y cercha decorativa exterior en el hastial
		var gx_out := gx + (-0.18 if gtag == "West" else 0.18)
		_box(wh_roof, "WinchGableKingPost_%s" % gtag, Vector3(gx_out, wall_top + ridge_rise * 0.48, z_mid), Vector3(0.14, ridge_rise * 0.96, 0.20), mat_wood_dark)
		_box(wh_roof, "WinchGableTieBeam_%s" % gtag, Vector3(gx_out, wall_top + 0.02, z_mid), Vector3(0.18, 0.22, house_d + 0.16), mat_wood_dark)
		for gs in [-1.0, 1.0]:
			var g_strut := _box(wh_roof, "WinchGableStrut_%s_%d" % [gtag, int(gs)], Vector3(gx_out, wall_top + 0.68, z_mid + float(gs) * 1.15), Vector3(0.12, 1.25, 0.14), mat_wood_dark)
			g_strut.rotation.x = float(gs) * 0.85

	# Faldones norte y sur con tablero base sellado, 7 hiladas de tejas solapadas y pares/canecillos salientes
	for side_z in [-1.0, 1.0]:
		var sgn := float(side_z)
		var stag := "N" if sgn < 0.0 else "S"
		var mid_dist := slope_run * 0.48
		var mid_y := ridge_y - mid_dist * tan(slope_pitch)
		var mid_z := z_mid + sgn * mid_dist
		# Tablero macizo bajo las tejas
		var deck := _box(wh_roof, "WinchRoofDeck_%s" % stag, Vector3(x_mid, mid_y - 0.08, mid_z), Vector3(roof_span_x, 0.16, slope_len), mat_wood_dark)
		deck.rotation.x = sgn * slope_pitch
		# 7 hiladas de tejas/ripias solapadas de madera curada
		var courses := 7
		var course_d := (slope_len / float(courses)) * 1.18
		for ci in range(courses):
			var ct := (float(ci) + 0.5) / float(courses)
			var c_dist := ct * slope_run
			var cy := ridge_y - c_dist * tan(slope_pitch) + 0.06 + (0.015 if ci % 2 == 0 else 0.0)
			var cz := z_mid + sgn * c_dist
			var cmat: Material = mat_shingle_a if ci % 2 == 0 else mat_shingle_b
			var course := _box(wh_roof, "WinchShingle_%s_%d" % [stag, ci], Vector3(x_mid, cy, cz), Vector3(roof_span_x + 0.08, 0.085, course_d), cmat)
			course.rotation.x = sgn * (slope_pitch - 0.03)
		# 9 pares/vigas de cubierta sobresaliendo en los aleros
		for ri in range(9):
			var rx := lerpf(x_w - 0.55, x_e + 0.55, float(ri) / 8.0)
			var rafter := _box(wh_roof, "WinchRafter_%s_%d" % [stag, ri], Vector3(rx, mid_y - 0.16, mid_z), Vector3(0.16, 0.22, slope_len + 0.24), mat_wood_dark)
			rafter.rotation.x = sgn * slope_pitch
		# Fascia / tabla de alero frontal
		var eave_z := z_mid + sgn * (slope_run + 0.02)
		var eave_y := ridge_y - slope_run * tan(slope_pitch) - 0.04
		_box(wh_roof, "WinchEaveFascia_%s" % stag, Vector3(x_mid, eave_y, eave_z), Vector3(roof_span_x + 0.12, 0.22, 0.12), mat_wood_dark)
	# Caballete / cumbrera maciza con remate de madera y veleta de hierro forjado al oeste
	_box(wh_roof, "WinchRoofRidge", Vector3(x_mid, ridge_y + 0.12, z_mid), Vector3(roof_span_x + 0.26, 0.28, 0.38), mat_wood_dark)
	_box(wh_roof, "WinchRoofRidgeCap", Vector3(x_mid, ridge_y + 0.28, z_mid), Vector3(roof_span_x + 0.34, 0.10, 0.46), mat_shingle_b)
	_cyl(wh_roof, "WinchFinialPole", Vector3(x_w - 0.42, ridge_y + 0.68, z_mid), 0.035, 0.88, mat_iron, 8)
	_box(wh_roof, "WinchWeatherVane", Vector3(x_w - 0.42, ridge_y + 0.96, z_mid + 0.12), Vector3(0.04, 0.20, 0.54), mat_bronze)

	# --------------------------------------------------------------------------
	# D. FASE 2.2 — MAQUINARIA CREÍBLE Y ANIMADA DEL CABRESTANTE
	# --------------------------------------------------------------------------
	var mech := Node3D.new()
	mech.name = "A2_WinchMechanism"
	a2_node.add_child(mech)

	var drum_x := 163.00
	var drum_y := y + 1.32 # 16.32m
	var drum_z := 66.18

	# 1. Bancada y caballetes en A de roble grueso anclados con pletinas de hierro
	for side_x in [-1.45, 1.45]:
		var sx := drum_x + float(side_x)
		var stag := "W" if side_x < 0.0 else "E"
		_box(mech, "WinchBaseSkid_%s" % stag, Vector3(sx, y + 0.11, drum_z), Vector3(0.32, 0.22, 2.38), mat_wood_dark)
		for leg_s in [-1.0, 1.0]:
			var leg := _box(mech, "WinchAFrameLeg_%s_%d" % [stag, int(leg_s)], Vector3(sx, y + 0.78, drum_z + float(leg_s) * 0.44), Vector3(0.24, 1.42, 0.22), mat_wood_dark)
			leg.rotation.x = -float(leg_s) * 0.34
		_box(mech, "WinchAFrameCap_%s" % stag, Vector3(sx, drum_y - 0.06, drum_z), Vector3(0.30, 0.24, 0.54), mat_wood)
		# Chumacera / cojinete de hierro fundido sobre el caballete
		_box(mech, "WinchPillowBlock_%s" % stag, Vector3(sx, drum_y + 0.06, drum_z), Vector3(0.26, 0.22, 0.34), mat_iron)
		# Pletinas de anclaje al suelo
		for bolt_z in [-0.96, 0.96]:
			_box(mech, "WinchFloorBracket_%s_%d" % [stag, int(bolt_z * 10.0)], Vector3(sx, y + 0.05, drum_z + float(bolt_z)), Vector3(0.46, 0.10, 0.22), mat_iron)
	# Travesaño inferior de unión entre caballetes
	_box(mech, "WinchTieBeamLower", Vector3(drum_x, y + 0.48, drum_z - 0.65), Vector3(3.12, 0.18, 0.20), mat_wood_dark)
	_box(mech, "WinchTieBeamFront", Vector3(drum_x, y + 0.48, drum_z + 0.65), Vector3(3.12, 0.18, 0.20), mat_wood_dark)

	# 2. Tambor giratorio del cabrestante con cable enrollado, rueda de manivela y engranaje de trinquete
	var drum_pivot := Node3D.new()
	drum_pivot.name = "WinchDrumPivot"
	drum_pivot.position = Vector3(drum_x, drum_y, drum_z)
	mech.add_child(drum_pivot)

	# Eje central de hierro forjado (eje X -> rotar cilindro 90° en Z)
	var main_axle := _cyl(drum_pivot, "WinchMainAxle", Vector3.ZERO, 0.09, 3.85, mat_iron, 12)
	main_axle.rotation.z = PI * 0.5
	# Cilindro de madera del tambor
	var barrel := _cyl(drum_pivot, "WinchWoodDrum", Vector3.ZERO, 0.40, 2.38, mat_wood, 16)
	barrel.rotation.z = PI * 0.5
	# Bridas / discos laterales de madera reforzada con aros de hierro
	for fl_x in [-1.18, 1.18]:
		var fl_disc := _cyl(drum_pivot, "WinchDrumFlange_%d" % int(fl_x * 10.0), Vector3(float(fl_x), 0.0, 0.0), 0.66, 0.11, mat_wood_dark, 16)
		fl_disc.rotation.z = PI * 0.5
		var fl_ring := _cyl(drum_pivot, "WinchDrumRim_%d" % int(fl_x * 10.0), Vector3(float(fl_x), 0.0, 0.0), 0.68, 0.05, mat_iron, 16)
		fl_ring.rotation.z = PI * 0.5
	# 14 vueltas visibles de cable grueso de cáñamo enrolladas en el tambor
	for coil_i in range(14):
		var cx := lerpf(-1.02, 1.02, float(coil_i) / 13.0)
		var coil := _cyl(drum_pivot, "WinchRopeCoil_%d" % coil_i, Vector3(cx, 0.0, 0.0), 0.465 + (0.014 if coil_i % 2 == 0 else 0.0), 0.115, mat_rope, 14, false)
		coil.rotation.z = PI * 0.5
	# Engranaje de trinquete de hierro (12 dientes radiales) en el costado oeste del tambor
	var ratch_x := -1.28
	var ratch_hub := _cyl(drum_pivot, "WinchRatchetWheel", Vector3(ratch_x, 0.0, 0.0), 0.46, 0.09, mat_iron, 14)
	ratch_hub.rotation.z = PI * 0.5
	for ti in range(12):
		var tang := (float(ti) / 12.0) * TAU
		var tooth := _box(drum_pivot, "WinchRatchetTooth_%d" % ti, Vector3(ratch_x, sin(tang) * 0.49, cos(tang) * 0.49), Vector3(0.08, 0.12, 0.10), mat_bronze, false)
		tooth.rotation.x = -tang + 0.35
	# Gran rueda manual de radios + manivelas de giro en el extremo oeste (x=-1.82) y este (+1.78)
	var wheel_x := -1.80
	for sp_i in range(6):
		var sang := (float(sp_i) / 6.0) * PI
		var spoke := _box(drum_pivot, "WinchCapstanSpoke_%d" % sp_i, Vector3(wheel_x, 0.0, 0.0), Vector3(0.09, 1.56, 0.10), mat_wood_dark)
		spoke.rotation.x = sang
	var wheel_rim := _cyl(drum_pivot, "WinchCapstanHub", Vector3(wheel_x, 0.0, 0.0), 0.22, 0.14, mat_iron, 12)
	wheel_rim.rotation.z = PI * 0.5
	# Manivela de hierro + empuñadura de madera en ambos extremos
	_box(drum_pivot, "WinchCrankArmW", Vector3(wheel_x - 0.12, 0.34, 0.0), Vector3(0.08, 0.68, 0.10), mat_iron)
	var grip_w := _cyl(drum_pivot, "WinchCrankGripW", Vector3(wheel_x - 0.34, 0.64, 0.0), 0.055, 0.38, mat_wood, 10)
	grip_w.rotation.z = PI * 0.5
	_box(drum_pivot, "WinchCrankArmE", Vector3(1.80, -0.34, 0.0), Vector3(0.08, 0.68, 0.10), mat_iron)
	var grip_e := _cyl(drum_pivot, "WinchCrankGripE", Vector3(1.98, -0.64, 0.0), 0.055, 0.38, mat_wood, 10)
	grip_e.rotation.z = PI * 0.5

	# Uñeta / trinquete de freno montado sobre el caballete oeste y unido mediante varilla de piso a WinchLeverAssembly
	_box(mech, "WinchBrakePawl", Vector3(drum_x - 1.28, drum_y + 0.44, drum_z + 0.32), Vector3(0.10, 0.12, 0.58), mat_bronze)
	_make_segment(mech, "WinchLeverLinkRod", Vector3(160.15, y + 0.16, 67.45), Vector3(drum_x - 1.32, y + 0.22, drum_z + 0.55), 0.032, mat_iron, 8, false)
	SceneEnhancer.add_box_collider(mech, Vector3(drum_x, y + 0.95, drum_z), Vector3(3.45, 1.90, 2.05))
	var mech_anchor := Node3D.new()
	mech_anchor.name = "WinchMechanismInteractAnchor"
	mech_anchor.position = Vector3(drum_x, y, drum_z)
	mech.add_child(mech_anchor)
	var mech_ip := SceneEnhancer._attach_interactive_prop(mech_anchor, "winch", "Torno y manivela de A2", "[T] Accionar torno del cabrestante", Vector3.ZERO, "e", "Haces girar la manivela del torno de A2: el cable de cáñamo se enrolla en el tambor y mueve el montacargas costero.")
	mech_ip.interact_radius = 2.85

	# 3. Palanca interactiva de retención del cabrestante (WinchLeverAssembly — preserva nombre, posición y acción [T]/[G])
	var lever_asm := Node3D.new()
	lever_asm.name = "WinchLeverAssembly"
	lever_asm.position = Vector3(160.07, y, 67.62)
	a2_node.add_child(lever_asm)
	SceneEnhancer.add_box_collider(lever_asm, Vector3(0.0, 0.45, 0.0), Vector3(0.52, 0.90, 0.62))
	SceneEnhancer.tag_camera_occluder(lever_asm)

	_box(lever_asm, "LeverPedestal", Vector3(0.0, 0.16, 0.0), Vector3(0.50, 0.32, 0.62), mat_iron)
	_box(lever_asm, "LeverHousing", Vector3(0.0, 0.38, 0.0), Vector3(0.32, 0.24, 0.44), mat_bronze)
	_box(lever_asm, "LeverQuadrant", Vector3(0.16, 0.52, 0.0), Vector3(0.05, 0.22, 0.48), mat_iron)

	var lever_pivot := Node3D.new()
	lever_pivot.name = "WinchLeverArm"
	lever_pivot.position = Vector3(0.0, 0.44, 0.0)
	lever_pivot.rotation_degrees.x = -22.0
	lever_asm.add_child(lever_pivot)

	_cyl(lever_pivot, "LeverRod", Vector3(0.0, 0.62, 0.0), 0.048, 1.24, mat_bronze, 10)
	var grip_mat := StandardMaterial3D.new()
	grip_mat.albedo_color = Color("#a83828")
	grip_mat.roughness = 0.48
	grip_mat.metallic = 0.15
	_cyl(lever_pivot, "LeverGrip", Vector3(0.0, 1.22, 0.0), 0.078, 0.34, grip_mat, 10)
	_cyl(lever_pivot, "LeverPommel", Vector3(0.0, 1.42, 0.0), 0.092, 0.09, mat_gold, 10)

	var lever_lbl := Label3D.new()
	lever_lbl.name = "WinchLeverLabel"
	lever_lbl.text = "Palanca [G]"
	lever_lbl.font_size = 18
	lever_lbl.pixel_size = 0.015
	lever_lbl.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	lever_lbl.position = Vector3(-0.38, 2.32, -0.35)
	lever_lbl.modulate = Color(1.0, 0.90, 0.56)
	lever_lbl.visible = false
	lever_asm.add_child(lever_lbl)
	SceneEnhancer._attach_interactive_prop(lever_asm, "winch", "Palanca del cabrestante", "[T] Accionar palanca del cabrestante", Vector3.ZERO, "e", "Accionas la palanca de bronce y el cabrestante pone en marcha el montacargas del acantilado.")

	# 4. Pescante superior de carga (WinchCraneJib) saliendo limpiamente por el vano SE hacia el mar (x=163.20, z=63.2..72.45)
	var jib_x := 163.20
	var jib_y := y + 2.74 # 17.74m (pasa claramente por debajo del dintel de carga y=18.0m!)
	var crane_beam := _box(a2_node, "WinchCraneJib", Vector3(jib_x, jib_y, 67.85), Vector3(0.36, 0.40, 9.30), mat_wood_dark)
	# Zunchos de hierro abrazando la viga del pescante
	for jb_z in [64.2, 66.4, 70.6, 72.1]:
		_box(mech, "WinchJibStrap_%d" % int(jb_z * 10.0), Vector3(jib_x, jib_y, float(jb_z)), Vector3(0.41, 0.44, 0.14), mat_iron)
	# Puntal interior desde el muro norte y gran jabalcón exterior apoyado en la ménsula del acantilado
	var crane_brace_in := _box(a2_node, "WinchCraneBraceIn", Vector3(jib_x, jib_y - 0.72, 64.15), Vector3(0.24, 0.24, 2.15), mat_wood)
	crane_brace_in.rotation.x = -0.62
	var crane_brace := _box(a2_node, "WinchCraneBrace", Vector3(jib_x, y + 1.55, 71.15), Vector3(0.26, 0.26, 2.55), mat_wood)
	crane_brace.rotation.x = 0.88
	# Ménsula de soporte en la pared de carga bajo el jabalcón exterior
	_box(l_facade, "WinchJibCliffCorbel", Vector3(jib_x, y - 0.15, 70.65), Vector3(0.62, 1.35, 0.78), mat_ashlar)

	# 5. Polea guía interior (sobre el tambor) y polea principal exterior (punta del pescante sobre el acantilado)
	var guide_pulley_pos := Vector3(jib_x, jib_y - 0.38, 66.45)
	var head_pulley_pos := Vector3(jib_x, jib_y - 0.38, 72.10)
	for p_cfg in [[guide_pulley_pos, "Guide"], [head_pulley_pos, "Head"]]:
		var ppos: Vector3 = p_cfg[0]
		var ptag: String = str(p_cfg[1])
		# Horquilla/armadura fija de hierro colgada bajo el pescante
		_box(mech, "WinchPulleyClevis_%s_W" % ptag, ppos + Vector3(-0.14, 0.12, 0.0), Vector3(0.05, 0.54, 0.26), mat_iron)
		_box(mech, "WinchPulleyClevis_%s_E" % ptag, ppos + Vector3(0.14, 0.12, 0.0), Vector3(0.05, 0.54, 0.26), mat_iron)
		var ax := _cyl(mech, "WinchPulleyAxle_%s" % ptag, ppos, 0.045, 0.36, mat_bronze, 10)
		ax.rotation.z = PI * 0.5

	var guide_pulley_pivot := Node3D.new()
	guide_pulley_pivot.name = "WinchGuidePulleyPivot"
	guide_pulley_pivot.position = guide_pulley_pos
	mech.add_child(guide_pulley_pivot)
	var gp_wheel := _cyl(guide_pulley_pivot, "WinchGuidePulleyWheel", Vector3.ZERO, 0.24, 0.14, mat_iron, 14)
	gp_wheel.rotation.z = PI * 0.5
	_box(guide_pulley_pivot, "WinchGuideSpoke", Vector3.ZERO, Vector3(0.16, 0.42, 0.06), mat_bronze, false)

	var head_pulley_pivot := Node3D.new()
	head_pulley_pivot.name = "WinchPulleyPivot"
	head_pulley_pivot.position = head_pulley_pos
	a2_node.add_child(head_pulley_pivot)
	var hp_wheel := _cyl(head_pulley_pivot, "WinchPulleyWheel", Vector3.ZERO, 0.28, 0.16, mat_iron, 16)
	hp_wheel.rotation.z = PI * 0.5
	_box(head_pulley_pivot, "WinchPulleySpokeA", Vector3.ZERO, Vector3(0.18, 0.48, 0.06), mat_bronze, false)
	_box(head_pulley_pivot, "WinchPulleySpokeB", Vector3.ZERO, Vector3(0.18, 0.06, 0.48), mat_bronze, false)

	# 6. Recorrido continuo del cable de cáñamo SIN clipping por muros:
	#    Tramo 1: tambor -> polea guía interior
	_make_segment(mech, "WinchRopeRun_DrumToGuide", Vector3(jib_x, drum_y + 0.42, drum_z + 0.12), guide_pulley_pos + Vector3(0.0, 0.08, -0.18), 0.038, mat_rope, 8, false)
	#    Tramo 2: polea guía interior -> polea principal exterior (bajo el pescante, cruzando la bahía abierta)
	_make_segment(mech, "WinchRopeRun_GuideToHead", guide_pulley_pos + Vector3(0.0, 0.22, 0.0), head_pulley_pos + Vector3(0.0, 0.22, 0.0), 0.038, mat_rope, 8, false)
	#    Tramo 3 (animado): polea principal exterior -> argolla superior de la eslinga de 4 puntos de WinchLivePallet
	var cable_mesh := _cyl(a2_node, "WinchLiveCable", Vector3(jib_x, 14.8, 72.10), 0.038, 1.0, mat_rope, 10)

	# 7. Plataforma colgante reforzada con eslinga de 4 puntos y carga monástica (WinchLivePallet)
	var pallet_rig := Node3D.new()
	pallet_rig.name = "WinchLivePallet"
	pallet_rig.position = Vector3(jib_x, 12.2, 72.10)
	a2_node.add_child(pallet_rig)

	_box(pallet_rig, "LivePalletDeck", Vector3(0.0, 0.0, 0.0), Vector3(2.04, 0.16, 1.62), mat_wood)
	for skid_x in [-0.78, 0.0, 0.78]:
		_box(pallet_rig, "LivePalletSkid_%d" % int((skid_x + 1.0) * 10.0), Vector3(float(skid_x), -0.12, 0.0), Vector3(0.16, 0.12, 1.58), mat_wood_dark)
	# Barandilla baja de contención de carga y argollas en las 4 esquinas
	for rail_z in [-0.78, 0.78]:
		_box(pallet_rig, "LivePalletCurbZ_%d" % int((rail_z + 1.0) * 10.0), Vector3(0.0, 0.12, float(rail_z)), Vector3(2.04, 0.10, 0.09), mat_wood_dark)
	var ring_top := Vector3(0.0, 1.48, 0.0)
	_cyl(pallet_rig, "LivePalletCollectorRing", ring_top, 0.11, 0.06, mat_iron, 12)
	for c_pt in [Vector3(-0.92, 0.12, -0.72), Vector3(0.92, 0.12, -0.72), Vector3(-0.92, 0.12, 0.72), Vector3(0.92, 0.12, 0.72)]:
		_box(pallet_rig, "LivePalletCornerIron_%d_%d" % [int(c_pt.x * 10.0), int(c_pt.z * 10.0)], c_pt, Vector3(0.14, 0.14, 0.14), mat_iron, false)
		_make_segment(pallet_rig, "LivePalletSling_%d_%d" % [int(c_pt.x * 10.0), int(c_pt.z * 10.0)], c_pt, ring_top, 0.026, mat_rope, 6, false)
	# Carga amarrada: caja reforzada con flejes + barril con aros de hierro + saco de grano
	_box(pallet_rig, "LivePalletCrateA", Vector3(-0.36, 0.38, 0.06), Vector3(0.74, 0.60, 0.70), mat_wood_dark)
	_box(pallet_rig, "LivePalletCrateBand", Vector3(-0.36, 0.38, 0.06), Vector3(0.78, 0.10, 0.74), mat_iron, false)
	_cyl(pallet_rig, "LivePalletBarrel", Vector3(0.46, 0.36, -0.14), 0.25, 0.56, mat_wood, 12)
	for hoop_y in [0.18, 0.52]:
		_cyl(pallet_rig, "LivePalletBarrelHoop_%d" % int(hoop_y * 10.0), Vector3(0.46, float(hoop_y), -0.14), 0.265, 0.04, mat_iron, 12, false)
	var sack := _box(pallet_rig, "LivePalletGrainSack", Vector3(0.36, 0.24, 0.38), Vector3(0.48, 0.32, 0.36), mat_sack)
	sack.rotation.y = 0.28

	# 8. Pertrechos operativos de almacén dentro de A2 (cajas, barriles, rollo de cabo, mesa de registro)
	_box(a2_node, "WinchDeckCrate", Vector3(157.8, y + 0.34, 64.35), Vector3(0.78, 0.68, 0.78), mat_wood_dark)
	_box(l_decor, "WinchDeckCrateBand", Vector3(157.8, y + 0.34, 64.35), Vector3(0.82, 0.09, 0.82), mat_iron, false)
	SceneEnhancer.add_box_collider(a2_node, Vector3(157.8, y + 0.38, 64.35), Vector3(0.82, 0.76, 0.82))
	_box(l_furn, "WinchDeckCrateSmall", Vector3(157.75, y + 0.90, 64.38), Vector3(0.52, 0.44, 0.52), mat_wood)
	_cyl(a2_node, "WinchDeckBarrel", Vector3(158.90, y + 0.38, 64.25), 0.28, 0.76, mat_wood, 12)
	for hy in [0.18, 0.58]:
		_cyl(l_decor, "WinchDeckBarrelHoop_%d" % int(hy * 10.0), Vector3(158.90, y + float(hy), 64.25), 0.295, 0.045, mat_iron, 12, false)
	SceneEnhancer.add_cyl_collider(a2_node, Vector3(158.90, y + 0.42, 64.25), 0.32, 0.84)
	_cyl(l_furn, "WinchDeckBarrelB", Vector3(159.58, y + 0.36, 64.15), 0.26, 0.72, mat_wood_dark, 12)
	SceneEnhancer.add_cyl_collider(l_furn, Vector3(159.58, y + 0.40, 64.15), 0.30, 0.80)
	# Rollo grande de cabo de repuesto junto al muro sur (x=158.4, z=69.55)
	for ci_r in range(3):
		_cyl(l_decor, "WinchSpareRopeCoil_%d" % ci_r, Vector3(158.35, y + 0.08 + float(ci_r) * 0.11, 69.55), 0.44 - float(ci_r) * 0.03, 0.10, mat_rope, 14, false)
	_box(l_decor, "WinchFloorSacks", Vector3(157.15, y + 0.18, 69.65), Vector3(0.62, 0.34, 0.46), mat_sack)
	# Mesa de inventario / cuaderno de cargas junto al rincón NE (x=164.9, z=63.95)
	_box(l_furn, "WinchTallyDeskTop", Vector3(164.85, y + 0.82, 63.95), Vector3(1.42, 0.09, 0.74), mat_wood)
	for lx in [-0.62, 0.62]:
		for lz in [-0.30, 0.30]:
			_box(l_furn, "WinchDeskLeg_%d_%d" % [int((lx + 1.0) * 10.0), int((lz + 1.0) * 10.0)], Vector3(164.85 + float(lx), y + 0.40, 63.95 + float(lz)), Vector3(0.10, 0.80, 0.10), mat_wood_dark)
	_box(l_decor, "WinchLedgerBook", Vector3(164.75, y + 0.89, 63.95), Vector3(0.38, 0.06, 0.28), mat_cloth, false)
	SceneEnhancer.add_box_collider(l_furn, Vector3(164.85, y + 0.45, 63.95), Vector3(1.48, 0.90, 0.80))

	# --------------------------------------------------------------------------
	# E. FASE 2.3 — ILUMINACIÓN NOCTURNA COHERENTE DE A2 (INTERIOR + GRÚA + PUERTA)
	# --------------------------------------------------------------------------
	# 1. Farol colgante principal sobre el mecanismo y la palanca (A2_WinchLight)
	var int_lan := Node3D.new()
	int_lan.name = "A2_InteriorHoistLantern"
	int_lan.position = Vector3(161.20, y + 2.65, 66.95)
	l_light.add_child(int_lan)
	_cyl(int_lan, "Chain", Vector3(0.0, 0.42, 0.0), 0.022, 0.84, mat_iron, 6, false)
	_box(int_lan, "Cage", Vector3(0.0, 0.0, 0.0), Vector3(0.28, 0.34, 0.28), mat_iron, false)
	var int_flm := _box(int_lan, "Flame", Vector3(0.0, 0.0, 0.0), Vector3(0.18, 0.24, 0.18), mat_flame, false)
	int_flm.add_to_group("night_flame")
	var l := OmniLight3D.new()
	l.name = "A2_WinchLight"
	l.position = Vector3(161.20, y + 2.52, 66.95)
	l.light_color = Color(1.0, 0.76, 0.42)
	l.light_energy = 2.45
	l.omni_range = 13.5
	a2_node.add_child(l)
	if builder.has_method("register_flame_fx"):
		builder.register_flame_fx(int_flm, l, false)

	# 2. Farol de tormenta colgado en la punta del pescante iluminando la plataforma y el acantilado
	var jib_lan := Node3D.new()
	jib_lan.name = "A2_JibStormLantern"
	jib_lan.position = Vector3(jib_x, jib_y - 0.65, 71.35)
	l_light.add_child(jib_lan)
	_cyl(jib_lan, "Hook", Vector3(0.0, 0.28, 0.0), 0.024, 0.56, mat_iron, 6, false)
	_box(jib_lan, "Cage", Vector3(0.0, 0.0, 0.0), Vector3(0.26, 0.32, 0.26), mat_iron, false)
	var jib_flm := _box(jib_lan, "Flame", Vector3(0.0, 0.0, 0.0), Vector3(0.17, 0.22, 0.17), mat_flame, false)
	jib_flm.add_to_group("night_flame")
	var jib_light := OmniLight3D.new()
	jib_light.name = "A2_JibLanternLight"
	jib_light.position = Vector3(jib_x, jib_y - 0.80, 71.55)
	jib_light.light_color = Color(1.0, 0.70, 0.34)
	jib_light.light_energy = 2.25
	jib_light.omni_range = 15.5
	l_light.add_child(jib_light)
	if builder.has_method("register_flame_fx"):
		builder.register_flame_fx(jib_flm, jib_light, false)

	# 3. Farol nocturno en la jamba norte de la puerta oeste (ilumina la confluencia de escaleras y porche)
	_box(l_facade, "WinchDoorLanternArm", Vector3(x_w - 0.24, y + 2.38, 65.98), Vector3(0.38, 0.08, 0.08), mat_iron, false)
	_box(l_facade, "WinchDoorLanternHood", Vector3(x_w - 0.42, y + 2.36, 65.98), Vector3(0.24, 0.07, 0.24), mat_iron, false)
	var wh_flame := _cyl(l_facade, "WinchDoorLanternFlame", Vector3(x_w - 0.42, y + 2.22, 65.98), 0.075, 0.18, mat_flame, 8, false)
	wh_flame.add_to_group("night_flame")
	var wh_light := OmniLight3D.new()
	wh_light.name = "WinchDoorLanternLight"
	wh_light.position = Vector3(x_w - 0.55, y + 2.28, 65.98)
	wh_light.light_color = Color(1.0, 0.68, 0.30)
	wh_light.light_energy = 1.85
	wh_light.omni_range = 10.5
	l_light.add_child(wh_light)
	if builder.has_method("register_flame_fx"):
		builder.register_flame_fx(wh_flame, wh_light, false)

	# 4. Luz de relleno costera / reflejo marino sobre el acantilado inferior y escollos (evita sombras aplastadas a negro)
	var sea_light := OmniLight3D.new()
	sea_light.name = "A2_SeaViewLight"
	sea_light.position = Vector3(163.8, 6.8, 74.8)
	sea_light.light_color = Color(0.68, 0.84, 0.98)
	sea_light.light_energy = 1.65
	sea_light.omni_range = 24.0
	a2_node.add_child(sea_light)
	var east_bounce := OmniLight3D.new()
	east_bounce.name = "EastCliffBounceLight"
	east_bounce.position = Vector3(162.5, 5.8, 87.5)
	east_bounce.light_color = Color(0.62, 0.80, 0.94)
	east_bounce.light_energy = 1.35
	east_bounce.omni_range = 22.0
	a2_node.add_child(east_bounce)

	# 5. 7 escollos marinos esculpidos en basalto con zócalo húmedo y coronas suaves de espuma (WinchSeaRocks)
	var sea_rocks_node := Node3D.new()
	sea_rocks_node.name = "WinchSeaRocks"
	a2_node.add_child(sea_rocks_node)

	var rocks_spec := [
		[164.6, 0.25, 74.8, 3.3, 3.2, 2.5, 0.18],
		[167.0, 0.50, 77.5, 4.2, 4.5, 3.6, -0.34],
		[163.8, 0.00, 81.3, 2.3, 2.3, 2.5, 0.68],
		[166.9, 0.50, 84.7, 5.0, 4.4, 3.3, 0.21],
		[163.1, -0.10, 90.2, 3.1, 2.8, 2.8, -0.56],
		[168.0, 0.40, 93.2, 3.9, 4.0, 3.7, 0.50],
		[163.8, -0.10, 97.6, 3.0, 2.4, 2.8, -0.22]
	]
	for idx in range(rocks_spec.size()):
		var sp: Array = rocks_spec[idx]
		var top_y := float(sp[1]) + float(sp[4]) * 0.24
		var rock_h := top_y + 1.85
		var r_wrap := Node3D.new()
		r_wrap.name = "SeaOutcropWrap_%d" % idx
		r_wrap.position = Vector3(float(sp[0]), -1.85, float(sp[2]))
		r_wrap.rotation.y = float(sp[6])
		sea_rocks_node.add_child(r_wrap)

		var r_inst := MeshInstance3D.new()
		r_inst.name = "SeaOutcrop_%d" % idx
		r_inst.mesh = SceneEnhancer.make_basalt_outcrop_mesh(110 + idx * 13)
		r_inst.material_override = mat_basalt_carved if idx % 2 == 0 else mat_basalt_dark
		r_inst.scale = Vector3(float(sp[3]) * 0.85, rock_h, float(sp[5]) * 0.85)
		r_inst.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		r_wrap.add_child(r_inst)

		# Faldón basáltico oscuro mojado a ras de marea
		var wet_inst := MeshInstance3D.new()
		wet_inst.name = "SeaOutcropWet_%d" % idx
		wet_inst.mesh = plate_mesh
		wet_inst.material_override = mat_wet_basalt
		wet_inst.position = Vector3(0.0, 1.45, 0.0)
		wet_inst.scale = Vector3(float(sp[3]) * 0.96, 1.35, float(sp[5]) * 0.96)
		wet_inst.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		r_wrap.add_child(wet_inst)

		# Corona sutil de espuma costera alrededor del escollo (sincronizada con la altura de marea)
		var foam_r := maxf(float(sp[3]), float(sp[5])) * 0.42
		var foam_inst := MeshInstance3D.new()
		foam_inst.name = "SeaOutcropFoam_%d" % idx
		foam_inst.mesh = _make_foam_collar_mesh(foam_r * 0.72, foam_r * 1.42, 700 + idx * 19)
		foam_inst.material_override = mat_foam
		foam_inst.position = Vector3(0.0, 1.88, 0.0)
		foam_inst.set_meta("base_y", 1.88)
		foam_inst.add_to_group("tide_foam")
		foam_inst.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		r_wrap.add_child(foam_inst)

		SceneEnhancer.add_cyl_collider(r_wrap, Vector3(0.0, rock_h * 0.5, 0.0), minf(float(sp[3]), float(sp[5])) * 0.34, rock_h)
		SceneEnhancer.tag_camera_occluder(r_wrap)

	return {
		"lever_pivot": lever_pivot,
		"pallet_rig": pallet_rig,
		"cable_mesh": cable_mesh,
		"drum_pivot": drum_pivot,
		"head_pulley_pivot": head_pulley_pivot,
		"guide_pulley_pivot": guide_pulley_pivot,
		"cutaway_walls": wh_cut
	}

# ------------------------------------------------------------------------------
# FASE 2.3 — REVESTIMIENTO ESTRATIFICADO DEL ACANTILADO Y LÍNEA DE MAREA EN A2
# ------------------------------------------------------------------------------
static func _build_a2_cliff_and_coast(
	_a2_node: Node3D,
	l_rock: Node3D,
	y: float,
	x_w: float,
	x_e: float,
	z_n: float,
	z_s: float,
	mat_ashlar: Material,
	mat_ashlar_b: Material,
	mat_basalt_carved: Material,
	mat_basalt_dark: Material,
	mat_wet_basalt: Material,
	mat_wood_dark: Material,
	mat_foam: Material,
	plate_mesh: Mesh,
	rng: RandomNumberGenerator
) -> void:
	# 1. Contrafuertes de mampostería tallada + jabalcones de roble bajo la cubierta del almacén (y=11.0..15.0)
	for bx in [156.45, 159.45, 162.45, 165.55]:
		var pier := _box(l_rock, "A2_SouthMasonryPier_%d" % int(bx * 10.0), Vector3(float(bx), y - 2.15, z_s + 0.12), Vector3(0.96, 4.10, 0.88), mat_ashlar_b)
		_box(l_rock, "A2_SouthPierCap_%d" % int(bx * 10.0), Vector3(float(bx), y - 0.16, z_s + 0.16), Vector3(1.12, 0.24, 1.04), mat_ashlar)
		var corb := _box(l_rock, "A2_SouthTimberCorbel_%d" % int(bx * 10.0), Vector3(float(bx), y - 0.58, z_s + 0.36), Vector3(0.24, 0.82, 0.24), mat_wood_dark)
		corb.rotation.x = 0.58
		pier.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON

	for ez in [64.2, 66.85, 69.5]:
		_box(l_rock, "A2_EastMasonryPier_%d" % int(ez * 10.0), Vector3(x_e + 0.12, y - 2.15, float(ez)), Vector3(0.88, 4.10, 0.96), mat_ashlar_b)
		_box(l_rock, "A2_EastPierCap_%d" % int(ez * 10.0), Vector3(x_e + 0.16, y - 0.16, float(ez)), Vector3(1.04, 0.24, 1.12), mat_ashlar)

	# Fase 6 (A2): Pilar de mampostería y hombro basáltico sellando la grieta triangular oscura bajo el encuentro Paseo->A2 y Escalera Este (captura 08)
	_box(l_rock, "A2_WestLandingCornerPier", Vector3(153.25, y - 2.10, 70.65), Vector3(2.55, 4.25, 2.75), mat_ashlar_b)
	_box(l_rock, "A2_WestLandingCornerCap", Vector3(153.25, y - 0.10, 70.65), Vector3(2.72, 0.22, 2.90), mat_ashlar)
	var corner_crag := MeshInstance3D.new()
	corner_crag.name = "A2_WestLandingRockShoulder"
	corner_crag.mesh = plate_mesh
	corner_crag.material_override = mat_basalt_carved
	corner_crag.position = Vector3(151.85, y - 3.65, 71.15)
	corner_crag.scale = Vector3(4.6, 4.2, 4.2)
	corner_crag.rotation_degrees = Vector3(4.0, -18.0, -4.0)
	corner_crag.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	l_rock.add_child(corner_crag)

	# Fase 6 (A2): Bloques de basalto y matorral costero suavizando la línea diagonal brusca pradera->acantilado al NO de A2 (x=147..155, z=55..64)
	var nw_seam_rocks := [
		[Vector3(148.4, 16.4, 62.4), Vector3(3.6, 2.2, 3.2), Vector3(4.0, 22.0, -4.0)],
		[Vector3(150.2, 16.6, 60.2), Vector3(4.0, 2.4, 3.4), Vector3(3.0, -16.0, -5.0)],
		[Vector3(152.0, 16.3, 58.2), Vector3(4.2, 2.6, 3.6), Vector3(5.0, 28.0, -4.0)],
		[Vector3(153.6, 15.8, 61.8), Vector3(3.8, 2.5, 3.2), Vector3(4.0, -24.0, -3.0)],
		[Vector3(154.6, 15.4, 63.4), Vector3(3.4, 2.3, 3.0), Vector3(3.0, 14.0, -4.0)],
		[Vector3(153.8, 16.2, 56.2), Vector3(4.4, 2.8, 3.8), Vector3(5.0, -12.0, -5.0)],
	]
	for nwi in range(nw_seam_rocks.size()):
		var nsp: Array = nw_seam_rocks[nwi]
		var nsr := MeshInstance3D.new()
		nsr.name = "A2_NWSeamBoulder_%d" % nwi
		nsr.mesh = plate_mesh
		nsr.material_override = mat_basalt_carved if nwi % 2 == 0 else mat_basalt_dark
		nsr.position = nsp[0]
		nsr.scale = nsp[1]
		nsr.rotation_degrees = nsp[2]
		nsr.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		l_rock.add_child(nsr)
	var seam_fern_mat := StandardMaterial3D.new()
	seam_fern_mat.vertex_color_use_as_albedo = true
	seam_fern_mat.vertex_color_is_srgb = true
	seam_fern_mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	seam_fern_mat.roughness = 0.88
	var sf_mesh := SceneEnhancer.make_botanical_shrub_mesh()
	for sfp in [
		Vector3(148.8, 18.2, 62.6), Vector3(150.6, 18.4, 60.4), Vector3(152.4, 18.2, 58.4),
		Vector3(153.4, 17.8, 61.6), Vector3(154.2, 17.4, 63.1), Vector3(154.0, 18.3, 56.4)
	]:
		var sh_m := MeshInstance3D.new()
		sh_m.mesh = sf_mesh
		sh_m.material_override = seam_fern_mat
		sh_m.position = sfp
		sh_m.scale = Vector3(1.15, 0.95, 1.15)
		sh_m.rotation.y = sfp.x * 1.7
		sh_m.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		l_rock.add_child(sh_m)

	# 2. Acantilado basáltico fracturado en 3 niveles escalonados (rompe el muro plano; deja 100% libre el corredor de la plataforma x=161.6..164.8 z=71.2..73.4!)
	var south_strata := [
		# [x, y_base, z, sx, sy, sz, yaw_deg, pitch_deg, is_wet]
		[157.4, 8.8, 70.95, 3.6, 3.9, 2.2, 8.0, 5.0, false],
		[160.3, 8.4, 70.85, 3.2, 4.2, 2.0, -9.0, 4.0, false],
		[165.4, 8.6, 70.95, 2.6, 4.0, 2.2, 14.0, 6.0, false],
		[156.9, 4.2, 71.55, 3.9, 4.6, 2.7, -6.0, 4.0, false],
		[160.1, 3.8, 71.35, 3.4, 4.8, 2.4, 12.0, 5.0, false],
		[165.8, 4.1, 71.45, 3.1, 4.6, 2.6, -15.0, 5.0, false],
		# Base mojada de marea a ras de agua (sin invadir el foso vertical de la plataforma x=162.0..164.5, z=71.6..73.2)
		[156.8, -0.8, 72.10, 4.5, 3.6, 3.4, 5.0, 2.0, true],
		[160.0, -0.8, 71.85, 3.6, 3.4, 3.0, -10.0, 3.0, true],
		[166.2, -0.8, 72.15, 3.9, 3.8, 3.6, 18.0, 2.0, true],
		# Salientes del flanco Este (caída hacia el océano, x=166.0..167.8)
		[166.35, 8.8, 65.2, 2.4, 4.2, 4.2, 86.0, 4.0, false],
		[166.45, 8.5, 68.8, 2.5, 4.4, 4.0, 94.0, 5.0, false],
		[166.95, 3.9, 65.0, 3.1, 4.9, 4.8, 82.0, 5.0, false],
		[167.05, 3.6, 69.2, 3.2, 5.0, 4.6, 98.0, 4.0, false],
		[167.55, -0.8, 65.4, 3.8, 3.8, 5.4, 88.0, 2.0, true],
		[167.65, -0.8, 69.6, 3.8, 3.9, 5.2, 95.0, 2.0, true],
		# Revestimiento del acantilado bajo la plataforma (ligeramente remetido z=70.45 para dejar paso limpio al montacargas!)
		[163.2, 7.6, 70.35, 3.4, 4.5, 1.25, 3.0, 3.0, false],
		[163.2, 3.0, 70.40, 3.6, 4.8, 1.35, -4.0, 3.0, false],
		[163.2, -0.8, 70.55, 3.8, 3.2, 1.65, 2.0, 2.0, true],
	]
	for si in range(south_strata.size()):
		var cfg: Array = south_strata[si]
		var is_wet: bool = bool(cfg[8])
		var slab := MeshInstance3D.new()
		slab.name = "A2_CliffStrata_%d" % si
		slab.mesh = plate_mesh
		slab.material_override = mat_wet_basalt if is_wet else (mat_basalt_carved if si % 2 == 0 else mat_basalt_dark)
		slab.position = Vector3(float(cfg[0]), float(cfg[1]), float(cfg[2]))
		slab.scale = Vector3(float(cfg[3]), float(cfg[4]), float(cfg[5]))
		slab.rotation_degrees = Vector3(float(cfg[7]), float(cfg[6]), rng.randf_range(-3.0, 3.0))
		slab.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		l_rock.add_child(slab)

	# 3. Coronas de espuma marina suave rompiendo contra la base del acantilado de A2
	for fi in range(4):
		var fpts := [
			Vector4(157.4, 0.08, 72.8, 2.6),
			Vector4(160.5, 0.08, 72.6, 2.3),
			Vector4(166.8, 0.08, 72.8, 2.8),
			Vector4(168.0, 0.08, 67.6, 3.2)
		]
		var fp: Vector4 = fpts[fi]
		var cf := MeshInstance3D.new()
		cf.name = "A2_CliffBaseFoam_%d" % fi
		cf.mesh = _make_foam_collar_mesh(fp.w * 0.52, fp.w * 1.15, 820 + fi * 23)
		cf.material_override = mat_foam
		cf.position = Vector3(fp.x, 0.03, fp.z)
		cf.set_meta("base_y", 0.03)
		cf.add_to_group("tide_foam")
		cf.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		l_rock.add_child(cf)

# ==============================================================================
# 2. REPARACIÓN INTEGRAL DE ESCALERAS Y BARANDILLAS PERIMETRALES
# ==============================================================================

# 2A. Escalera del Acantilado Este A1 <-> A2 (x=154.5, z=91.5..72.0, y=9.0 -> 15.0)
static func build_east_cliff_a1_to_a2_stairs(builder: Node3D, stairs_parent: Node3D) -> void:
	var root := Node3D.new()
	root.name = "EastCliffA1ToA2StairCraft"
	stairs_parent.add_child(root)

	var rng := RandomNumberGenerator.new()
	rng.seed = 202611231
	var mat_ashlar := UpperArch.create_weathered_ashlar_material(builder, Color("#c6beaa"))
	var mat_ashlar_b := UpperArch.create_weathered_ashlar_material(builder, Color("#b6ae9a"))
	var mat_stone_wall := UpperArch.create_weathered_ashlar_material(builder, Color("#a49c8a"))
	var mat_basalt := _make_basalt_mat(builder, Color("#96a0a4"), 0.86)
	var mat_wet := _make_wet_basalt_mat(builder)
	var mat_wood_dark: Material = builder.get("mat_wood_dark")
	var mat_iron: Material = builder.get("mat_iron")
	var mat_flame: Material = builder.get("mat_flame")
	var mat_rope := _make_rope_mat(builder)
	var plate_mesh := UpperArch.make_angular_basalt_plate_mesh(202611232)

	var cx := 154.50
	var width := 3.04 # x = 152.98 .. 156.02

	# 1. Rellano inferior de transición desde Plaza A1 Este (x=142.8..156.2, z=91.5..94.5, y=9.0)
	_box(root, "EastFootTransitionDeck", Vector3(149.55, 8.76, 93.00), Vector3(13.5, 0.50, 3.25), mat_stone_wall)
	for ri in range(3):
		for ci in range(13):
			var fx := lerpf(143.2, 155.8, float(ci) / 12.0)
			var fz := lerpf(91.9, 94.1, float(ri) / 2.0)
			var flg := _box(root, "EastFootSlab_%d_%d" % [ri, ci], Vector3(fx, 9.018, fz), Vector3(0.98, 0.045, 0.94), mat_ashlar if (ri + ci) % 2 == 0 else mat_ashlar_b, false)
			flg.rotation.y = rng.randf_range(-0.025, 0.025)
	# Bordillo sur del acceso A1 Este (z=94.62) y pilares de arranque en la boca de la escalera (z=91.65)
	_box(root, "EastFootSouthCurb", Vector3(149.6, 9.18, 94.62), Vector3(13.4, 0.44, 0.42), mat_stone_wall)
	_box(root, "EastFootSouthCurbCap", Vector3(149.6, 9.44, 94.62), Vector3(13.5, 0.12, 0.50), mat_ashlar)
	for px in [152.76, 156.24]:
		_box(root, "EastFootNewel_%d" % int(px * 10.0), Vector3(float(px), 9.64, 91.75), Vector3(0.58, 1.28, 0.58), mat_ashlar)
		_box(root, "EastFootNewelCap_%d" % int(px * 10.0), Vector3(float(px), 10.34, 91.75), Vector3(0.68, 0.14, 0.68), mat_stone_wall)
	UpperArch._build_stone_stair_lantern(builder, root, "EastCliffFootLantern", Vector3(156.24, 10.42, 91.75), mat_iron, mat_flame, 1.75, 11.5)

	# 2. Tramo Inferior (z=91.5 -> 82.5, y=9.0 -> 12.0, 14 peldaños tallados con contrahuellas macizas)
	_build_carved_cliff_flight(root, "EastCliffLowerFlight", Vector3(cx, 9.0, 91.50), Vector3(cx, 12.0, 82.50), width, 14, mat_ashlar, mat_ashlar_b, mat_stone_wall, rng)

	# 3. Rellano Intermedio del Acantilado (z=81.0..82.5, y=12.0 — mirador de descanso con farol cálido)
	_box(root, "EastMidLandingCore", Vector3(cx, 10.75, 81.75), Vector3(width + 0.90, 2.52, 2.05), mat_stone_wall)
	_box(root, "EastMidLandingDeck", Vector3(cx, 12.01, 81.75), Vector3(width + 0.16, 0.14, 1.92), mat_ashlar)
	for mx in [152.76, 156.24]:
		_box(root, "EastMidCurb_%d" % int(mx * 10.0), Vector3(float(mx), 12.30, 81.75), Vector3(0.46, 0.66, 2.06), mat_stone_wall)
		_box(root, "EastMidCurbCap_%d" % int(mx * 10.0), Vector3(float(mx), 12.66, 81.75), Vector3(0.56, 0.14, 2.12), mat_ashlar)
	_box(root, "EastMidLanternPier", Vector3(156.24, 12.62, 81.75), Vector3(0.62, 1.24, 0.62), mat_ashlar)
	UpperArch._build_stone_stair_lantern(builder, root, "EastCliffMidLantern", Vector3(156.24, 13.30, 81.75), mat_iron, mat_flame, 1.75, 12.0)

	# 4. Tramo Superior (z=81.0 -> 72.0, y=12.0 -> 15.0, 14 peldaños tallados con contrahuellas macizas)
	_build_carved_cliff_flight(root, "EastCliffUpperFlight", Vector3(cx, 12.0, 81.00), Vector3(cx, 15.0, 72.00), width, 14, mat_ashlar, mat_ashlar_b, mat_stone_wall, rng)

	# Pilares de coronación en la llegada superior (z=72.05) — dejan el paso z=69.0..72.0 completamente despejado hacia A2 y Paseo!
	_box(root, "EastTopWestNewel", Vector3(152.76, 15.62, 72.05), Vector3(0.58, 1.24, 0.58), mat_ashlar)
	_box(root, "EastTopWestNewelCap", Vector3(152.76, 16.30, 72.05), Vector3(0.68, 0.14, 0.68), mat_stone_wall)
	UpperArch._build_stone_stair_lantern(builder, root, "EastCliffTopLantern", Vector3(152.76, 16.38, 72.05), mat_iron, mat_flame, 1.70, 11.5)
	_box(root, "EastTopEastNewel", Vector3(156.18, 15.62, 71.75), Vector3(0.56, 1.24, 0.56), mat_ashlar)
	_box(root, "EastTopEastNewelCap", Vector3(156.18, 16.30, 71.75), Vector3(0.66, 0.14, 0.66), mat_stone_wall)

	# 5. Basamento rocoso y estratos basálticos ESTRICTAMENTE BAJO la escalera (top_y siempre < peldaño más bajo; cero picos atravesando escalones o A2!)
	for bi in range(10):
		var bt := float(bi) / 9.0
		var bz := lerpf(93.4, 72.8, bt)
		var z_low := bz + 1.25
		var stair_y_low := 9.0
		if z_low >= 91.5:
			stair_y_low = 9.0
		elif z_low >= 82.5:
			stair_y_low = lerpf(9.0, 12.0, (91.5 - z_low) / 9.0)
		elif z_low >= 81.0:
			stair_y_low = 12.0
		else:
			stair_y_low = lerpf(12.0, 15.0, clampf((81.0 - z_low) / 9.0, 0.0, 1.0))
		var found_top := stair_y_low - 0.42
		var supp_h := maxf(2.0, found_top + 1.2)
		_box(root, "EastStairFoundation_%d" % bi, Vector3(cx, found_top - supp_h * 0.5, bz), Vector3(width + 0.55, supp_h, 2.55), mat_basalt)
		# Estratos costeros adosados al escarpe marino este (fuera del bordillo x=157.35 y siempre >= 0.85m por debajo de la cota del peldaño!)
		var cliff_top := minf(13.6, stair_y_low - 0.85)
		var strata_h := clampf(cliff_top * 0.46, 2.2, 4.4)
		var strata := MeshInstance3D.new()
		strata.name = "EastCliffButtress_%d" % bi
		strata.mesh = plate_mesh
		strata.material_override = mat_basalt
		strata.position = Vector3(157.45 + rng.randf_range(-0.15, 0.25), cliff_top - strata_h, bz)
		strata.scale = Vector3(2.4, strata_h, 3.1)
		strata.rotation_degrees = Vector3(3.0, 90.0 + rng.randf_range(-10.0, 10.0), -3.0)
		strata.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		root.add_child(strata)
		# Zócalo húmedo de marea a ras de agua (y=-0.9..2.2m)
		if bi % 2 == 0:
			var wet_slab := MeshInstance3D.new()
			wet_slab.name = "EastCliffWetBase_%d" % bi
			wet_slab.mesh = plate_mesh
			wet_slab.material_override = mat_wet
			wet_slab.position = Vector3(158.15, -0.9, bz)
			wet_slab.scale = Vector3(3.0, 3.1, 3.8)
			wet_slab.rotation_degrees = Vector3(2.0, 90.0 + rng.randf_range(-14.0, 14.0), -2.0)
			wet_slab.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
			root.add_child(wet_slab)

	# 6. Barandillas de postes de roble y doble cuerda en catenaria ESTRICTAMENTE PERIMETRALES (NUNCA cruzan ningún acceso)
	# Perímetro Este (borde hacia el mar): desde esquina SE del pie (z=94.62) subiendo toda la escalera hasta la esquina SO de A2 (z=70.95)
	var east_poly: Array[Vector3] = [
		Vector3(143.20, 9.00, 94.62),
		Vector3(147.40, 9.00, 94.62),
		Vector3(151.80, 9.00, 94.62),
		Vector3(156.24, 9.00, 94.62),
		Vector3(156.24, 9.00, 91.75),
		Vector3(156.24, 10.50, 87.00),
		Vector3(156.24, 12.00, 82.50),
		Vector3(156.24, 12.00, 81.00),
		Vector3(156.24, 13.50, 76.50),
		Vector3(156.18, 15.00, 71.75),
		Vector3(156.12, 15.00, 70.72)
	]
	_build_perimeter_rope_run(root, "EastCliffEastRail", east_poly, mat_wood_dark, mat_iron, mat_rope, 0.085, 1.02, 0.56, 0.09, true)

	# Perímetro Oeste (borde interior hacia la ladera): sube de z=91.75 hasta el pilar superior z=72.05 y enlaza con Paseo->A2 en (152.76, 15.0, 69.38)
	var west_poly: Array[Vector3] = [
		Vector3(152.76, 9.00, 91.75),
		Vector3(152.76, 10.50, 87.00),
		Vector3(152.76, 12.00, 82.50),
		Vector3(152.76, 12.00, 81.00),
		Vector3(152.76, 13.50, 76.50),
		Vector3(152.76, 15.00, 72.05),
		Vector3(152.76, 15.00, 69.38)
	]
	_build_perimeter_rope_run(root, "EastCliffWestRail", west_poly, mat_wood_dark, mat_iron, mat_rope, 0.085, 1.02, 0.56, 0.09, true)

	# Guardarraíl físico fino en el borde marino este (fuera de la banda transitable x=153.1..155.9)
	for seg_rail in [
		[Vector3(156.45, 9.0, 91.75), Vector3(156.45, 15.0, 71.8), "EastCliffEdgeCol_E"],
		[Vector3(152.52, 9.0, 91.75), Vector3(152.52, 15.0, 72.2), "EastCliffEdgeCol_W"]
	]:
		var ra: Vector3 = seg_rail[0]
		var rb: Vector3 = seg_rail[1]
		var sb := StaticBody3D.new()
		sb.name = str(seg_rail[2])
		root.add_child(sb)
		sb.look_at_from_position((ra + rb) * 0.5 + Vector3(0.0, 1.1, 0.0), rb + Vector3(0.0, 1.1, 0.0), Vector3.UP)
		var cs := CollisionShape3D.new()
		var bx := BoxShape3D.new()
		bx.size = Vector3(0.32, 2.4, ra.distance_to(rb))
		cs.shape = bx
		sb.add_child(cs)

static func _build_carved_cliff_flight(
	parent: Node3D,
	flight_name: String,
	a: Vector3,
	b: Vector3,
	width: float,
	step_count: int,
	mat_tread_a: Material,
	mat_tread_b: Material,
	mat_wall: Material,
	rng: RandomNumberGenerator
) -> void:
	var fl := Node3D.new()
	fl.name = flight_name
	parent.add_child(fl)
	var delta_v := b - a
	var flat_len := Vector2(delta_v.x, delta_v.z).length()
	var step_run := flat_len / float(maxi(1, step_count))
	var min_y := minf(a.y, b.y) - 0.85

	var xfs_wall: Array[Transform3D] = []
	var xfs_ta: Array[Transform3D] = []
	var xfs_tb: Array[Transform3D] = []
	for i in range(step_count + 1):
		var t := float(i) / float(maxi(1, step_count))
		var p := a.lerp(b, t)
		var tread_h := 0.14
		var tread_d := step_run + 0.18
		var body_h := maxf(0.45, (p.y - tread_h * 0.5) - min_y)
		xfs_wall.append(_box_xf(Vector3(p.x, min_y + body_h * 0.5, p.z), Vector3(width - 0.04, body_h, tread_d * 0.96)))
		var t_xf := _box_xf(Vector3(p.x, p.y - tread_h * 0.5 + 0.015, p.z), Vector3(width + rng.randf_range(-0.04, 0.05), tread_h, tread_d), rng.randf_range(-0.012, 0.012))
		if i % 3 != 1:
			xfs_ta.append(t_xf)
		else:
			xfs_tb.append(t_xf)
		for sx_s in [-1.0, 1.0]:
			var sx := p.x + float(sx_s) * (width * 0.5 + 0.22)
			var wall_top_y := p.y + 0.42
			var wh_s := maxf(0.65, wall_top_y - min_y)
			xfs_wall.append(_box_xf(Vector3(sx, min_y + wh_s * 0.5, p.z), Vector3(0.44, wh_s, step_run + 0.18)))
			if i % 2 == 0 or i == step_count:
				xfs_ta.append(_box_xf(Vector3(sx, wall_top_y + 0.06, p.z), Vector3(0.52, 0.13, step_run * 2.08)))
	_emit_box_mm(fl, "MM_RisersAndCurbs", xfs_wall, mat_wall, true)
	_emit_box_mm(fl, "MM_TreadsA", xfs_ta, mat_tread_a, true)
	_emit_box_mm(fl, "MM_TreadsB", xfs_tb, mat_tread_b, true)

# 2B. Barandillas estrictamente perimetrales en Z2 Playa -> A1 (CERO cuerdas cruzando rellanos ni interiores)
static func build_z2_perimeter_ropes(builder: Node3D, z2_node: Node3D) -> void:
	var ropes_root := Node3D.new()
	ropes_root.name = "Z2_PerimeterRopes"
	z2_node.add_child(ropes_root)

	var mat_wood_dark: Material = builder.get("mat_wood_dark")
	var mat_iron: Material = builder.get("mat_iron")
	var mat_rock_carved: Material = builder.get("mat_rock_carved")
	var mat_rope := _make_rope_mat(builder)

	# Polilínea SUR (perímetro exterior continuo junto al escarpe marino desde el plinto de entrada hasta el pilar sur de A1)
	var south_perim: Array[Vector3] = [
		Vector3(29.10, 0.25, 111.20),
		Vector3(32.15, 0.88, 111.15),
		Vector3(34.95, 1.50, 111.15),
		Vector3(37.55, 1.50, 111.15),
		Vector3(37.55, 1.50, 108.15),
		Vector3(41.40, 2.75, 108.15),
		Vector3(45.25, 4.00, 108.15),
		Vector3(48.05, 4.00, 108.15),
		Vector3(48.05, 4.00, 105.15),
		Vector3(51.90, 5.25, 105.15),
		Vector3(55.75, 6.50, 105.15),
		Vector3(58.55, 6.50, 105.15),
		Vector3(58.55, 6.50, 102.15),
		Vector3(62.40, 7.75, 102.15),
		Vector3(66.25, 9.00, 102.30)
	]

	# Polilínea NORTE (perímetro exterior continuo junto a la ladera rocosa desde el farol de entrada hasta el pilar norte de A1)
	var north_perim: Array[Vector3] = [
		Vector3(28.75, 0.28, 107.65),
		Vector3(31.85, 0.88, 107.85),
		Vector3(34.45, 1.50, 107.85),
		Vector3(34.45, 1.50, 104.85),
		Vector3(37.55, 1.50, 104.85),
		Vector3(41.40, 2.75, 104.85),
		Vector3(44.95, 4.00, 104.85),
		Vector3(44.95, 4.00, 101.85),
		Vector3(48.05, 4.00, 101.85),
		Vector3(51.90, 5.25, 101.85),
		Vector3(55.45, 6.50, 101.85),
		Vector3(55.45, 6.50, 98.85),
		Vector3(58.55, 6.50, 98.85),
		Vector3(62.40, 7.75, 98.85),
		Vector3(66.25, 9.00, 98.70)
	]

	_build_perimeter_rope_run(ropes_root, "Z2_SouthPerimeter", south_perim, mat_wood_dark, mat_iron, mat_rope, 0.088, 1.06, 0.58, 0.08, false, mat_rock_carved)
	_build_perimeter_rope_run(ropes_root, "Z2_NorthPerimeter", north_perim, mat_wood_dark, mat_iron, mat_rope, 0.088, 1.06, 0.58, 0.08, false, mat_rock_carved)

# 2C. Barandillas perimetrales limpias para el tramo Paseo Superior -> A2 (sin invadir la confluencia de A2)
static func build_paseo_to_a2_perimeter_ropes(builder: Node3D, parent: Node3D) -> void:
	var mat_wood_dark: Material = builder.get("mat_wood_dark")
	var mat_iron: Material = builder.get("mat_iron")
	var mat_rope := _make_rope_mat(builder)

	# Borde Norte: corre del pilar superior (145.15, 18.0, 65.58) por el pretil norte y cierra hasta el muro NO de A2 (156.05, 15.0, 65.58)
	var north_a2: Array[Vector3] = [
		Vector3(145.15, 18.00, 65.58),
		Vector3(147.95, 17.02, 65.58),
		Vector3(150.75, 16.02, 65.58),
		Vector3(153.55, 15.00, 65.58),
		Vector3(155.98, 15.00, 65.58)
	]
	# Borde Sur: baja del pilar superior (145.15, 18.0, 69.42) hasta el vértice común con EastStairs (152.76, 15.0, 69.38) — ¡NUNCA cruza el rellano!
	var south_a2: Array[Vector3] = [
		Vector3(145.15, 18.00, 69.42),
		Vector3(147.85, 17.06, 69.40),
		Vector3(150.45, 16.12, 69.39),
		Vector3(152.76, 15.00, 69.38)
	]
	_build_perimeter_rope_run(parent, "PaseoToA2NorthRail", north_a2, mat_wood_dark, mat_iron, mat_rope, 0.082, 1.04, 0.62, 0.08, true)
	_build_perimeter_rope_run(parent, "PaseoToA2SouthRail", south_a2, mat_wood_dark, mat_iron, mat_rope, 0.082, 1.04, 0.62, 0.08, true)

static func _build_perimeter_rope_run(
	parent: Node3D,
	run_name: String,
	pts: Array[Vector3],
	mat_wood_dark: Material,
	mat_iron: Material,
	mat_rope: Material,
	post_r: float,
	top_h: float,
	mid_h: float,
	sag: float,
	skip_endpoints_post: bool = false,
	mat_plinth: Material = null
) -> void:
	var run := Node3D.new()
	run.name = run_name
	parent.add_child(run)
	var xfs_plinth: Array[Transform3D] = []
	var xfs_posts: Array[Transform3D] = []
	var xfs_caps: Array[Transform3D] = []
	var xfs_ropes: Array[Transform3D] = []
	for i in range(pts.size()):
		var p: Vector3 = pts[i]
		var is_end := (i == 0 or i == pts.size() - 1)
		if not (skip_endpoints_post and is_end):
			if mat_plinth != null and not is_end:
				xfs_plinth.append(_box_xf(p + Vector3(0.0, 0.14, 0.0), Vector3(0.36, 0.30, 0.36)))
			xfs_posts.append(_cyl_xf(p + Vector3(0.0, top_h * 0.56, 0.0), post_r, top_h * 1.12))
			xfs_caps.append(_cyl_xf(p + Vector3(0.0, top_h * 1.12, 0.0), post_r * 1.18, 0.055))
		if i > 0:
			var a: Vector3 = pts[i - 1]
			var seg_len := a.distance_to(p)
			var seg_sag := minf(sag, seg_len * 0.032)
			_append_catenary_xfs(xfs_ropes, a + Vector3(0.0, top_h, 0.0), p + Vector3(0.0, top_h, 0.0), seg_sag, 0.034, 5)
			_append_catenary_xfs(xfs_ropes, a + Vector3(0.0, mid_h, 0.0), p + Vector3(0.0, mid_h, 0.0), seg_sag * 0.85, 0.030, 5)
	if mat_plinth != null:
		_emit_box_mm(run, "MM_Plinths", xfs_plinth, mat_plinth, true)
	_emit_cyl_mm(run, "MM_Posts", xfs_posts, mat_wood_dark, 10, true)
	_emit_cyl_mm(run, "MM_Caps", xfs_caps, mat_iron, 10, false)
	_emit_cyl_mm(run, "MM_Ropes", xfs_ropes, mat_rope, 7, false)

# 2D. Escalinata monumental Paseo Superior <-> Templo A5 (Fase 1.2: viaducto continuo con arcos,
#     pilares profundos hasta el macizo rocoso, huellas/contrahuellas macizas sin dientes de sierra,
#     desgaste central diferenciado, descansillos, postes anclados en plintos y faroles nocturnos)
static func build_upgraded_a5_bridge(builder: Node3D, parent: Node3D, a: Vector3, b: Vector3, width: float) -> void:
	var br := Node3D.new()
	br.name = "A5_WidenedBridge"
	parent.add_child(br)

	var mat_ashlar := UpperArch.create_weathered_ashlar_material(builder, Color("#cec6b3"))
	var mat_ashlar_worn := UpperArch.create_weathered_ashlar_material(builder, Color("#dad2bf"))
	var mat_ashlar_b := UpperArch.create_weathered_ashlar_material(builder, Color("#b6ae9b"))
	var mat_stone_wall := UpperArch.create_weathered_ashlar_material(builder, Color("#969083"))
	var mat_basalt := _make_basalt_mat(builder, Color("#889296"), 0.87)
	var mat_wood_dark: Material = builder.get("mat_wood_dark")
	var mat_iron: Material = builder.get("mat_iron")
	var mat_flame: Material = builder.get("mat_flame")
	var mat_rope := _make_rope_mat(builder)

	var dir := b - a
	var flat_len := Vector2(dir.x, dir.z).length() # 26.8m
	var rise := b.y - a.y # +9.0m
	var slope_len := dir.length()
	var slope_angle := atan2(rise, flat_len) # ~0.324 rad
	var steps := 32
	var rng := RandomNumberGenerator.new()
	rng.seed = 445102
	var step_run := flat_len / float(steps)
	var step_len := step_run + 0.24

	# 1. Viga/losa portante continua inclinada bajo TODA la escalinata (elimina 100% los dientes de sierra y huecos!)
	var mid_ab := (a + b) * 0.5
	var deck_spine := _box(br, "A5BridgeContinuousSpine", mid_ab + Vector3(0.0, -1.16, 0.0), Vector3(slope_len + 1.45, 2.04, width - 0.14), mat_stone_wall)
	deck_spine.rotation.z = -slope_angle
	# Molduras laterales corridas (impostas) siguiendo la pendiente del viaducto en caras Norte y Sur
	for s_zv in [-1.0, 1.0]:
		var s_z := float(s_zv)
		var cor := _box(br, "A5BridgeSlopeCornice_%s" % ("N" if s_z < 0.0 else "S"), mid_ab + Vector3(0.0, -0.34, s_z * (width * 0.5 + 0.08)), Vector3(slope_len + 1.25, 0.26, 0.42), mat_ashlar_b)
		cor.rotation.z = -slope_angle
		var soffit_rib := _box(br, "A5BridgeSlopeBeam_%s" % ("N" if s_z < 0.0 else "S"), mid_ab + Vector3(0.0, -1.94, s_z * (width * 0.5 - 0.40)), Vector3(slope_len + 1.15, 0.54, 0.64), mat_basalt)
		soffit_rib.rotation.z = -slope_angle

	# 2. Cuatro pilares monumentales empotrados hasta el macizo/acantilado inferior (y=1.5m -> viaducto, CERO flotación!)
	#    y tres arcos de descarga de sillería uniendo los pilares bajo la escalinata
	var pier_ts := [0.10, 0.37, 0.64, 0.90]
	var pier_positions: Array[Vector3] = []
	for p_idx in range(pier_ts.size()):
		var pt: float = float(pier_ts[p_idx])
		var ppos := a.lerp(b, pt)
		pier_positions.append(ppos)
		var base_y := 1.5 if p_idx > 0 else 6.5
		var top_y := ppos.y - 0.92
		var pier_h := maxf(3.0, top_y - base_y)
		# Fuste macizo de basalto tallado + zapata ensanchada + capitel de imposta
		_box(br, "BridgeMasonryPier_%d" % p_idx, Vector3(ppos.x, base_y + pier_h * 0.5, ppos.z), Vector3(1.95, pier_h, width - 0.28), mat_basalt)
		_box(br, "BridgePierFoot_%d" % p_idx, Vector3(ppos.x, base_y + 1.65, ppos.z), Vector3(2.55, 3.30, width + 0.34), mat_basalt)
		_box(br, "BridgePierCap_%d" % p_idx, Vector3(ppos.x, top_y - 0.32, ppos.z), Vector3(2.26, 0.44, width + 0.14), mat_stone_wall)
		# Contrafuertes frontales sur en cada pilar para lectura arquitectónica monumental desde el valle
		_box(br, "BridgePierSouthButtress_%d" % p_idx, Vector3(ppos.x, base_y + pier_h * 0.42, ppos.z + width * 0.5 + 0.08), Vector3(1.38, pier_h * 0.84, 0.68), mat_stone_wall)
		var bcap := _box(br, "BridgePierSouthCap_%d" % p_idx, Vector3(ppos.x, base_y + pier_h * 0.84 + 0.10, ppos.z + width * 0.5 + 0.12), Vector3(1.50, 0.24, 0.78), mat_ashlar_b)
		bcap.rotation.x = 0.24

	# Arcos de sillería y enjutas (spandrels) entre cada pareja de pilares consecutivos
	for a_idx in range(pier_positions.size() - 1):
		var pa: Vector3 = pier_positions[a_idx]
		var pb: Vector3 = pier_positions[a_idx + 1]
		var span_x := absf(pa.x - pb.x) - 1.55
		var mid_x := (pa.x + pb.x) * 0.5
		var spring_y := minf(pa.y, pb.y) - 4.45
		var crown_y := (pa.y + pb.y) * 0.5 - 1.72
		var arch_segs := 9
		for si in range(arch_segs):
			var u := (float(si) / float(arch_segs - 1)) * 2.0 - 1.0 # -1 .. +1
			var vx := mid_x + u * (span_x * 0.50)
			var arch_h := sqrt(maxf(0.0, 1.0 - u * u))
			var vy := lerpf(spring_y, crown_y, arch_h)
			var deck_y_at_x := lerpf(a.y, b.y, clampf((a.x - vx) / flat_len, 0.0, 1.0)) - 1.05
			# Dovela del arco (en toda la anchura del puente)
			var vous := _box(br, "BridgeArchVoussoir_%d_%d" % [a_idx, si], Vector3(vx, vy, a.z), Vector3(span_x / float(arch_segs) + 0.24, 0.66, width - 0.36), mat_ashlar_b if si % 2 == 0 else mat_stone_wall)
			vous.rotation.z = u * 0.62
			# Enjuta (spandrel) cerrando sólidamente entre el trasdós del arco y la viga inclinada
			var sp_h := maxf(0.35, deck_y_at_x - vy)
			_box(br, "BridgeArchSpandrel_%d_%d" % [a_idx, si], Vector3(vx, vy + sp_h * 0.5 + 0.12, a.z), Vector3(span_x / float(arch_segs) + 0.22, sp_h, width - 0.52), mat_basalt)

	# 3. Peldaños macizos con contrahuella cerrada, banda central desgastada más clara,
	#    dos descansillos sutiles de ritmo (i=10, 21) y muretes laterales con albardilla
	var xfs_wall: Array[Transform3D] = []
	var xfs_ta: Array[Transform3D] = []
	var xfs_tb: Array[Transform3D] = []
	var xfs_worn: Array[Transform3D] = []
	for i in range(steps + 1):
		var t := float(i) / float(steps)
		var pos := a.lerp(b, t)
		var is_landing := (i == 0 or i == 10 or i == 21 or i == steps)
		var eff_len := (step_len * 1.45) if is_landing else step_len
		var jitter_w := width + rng.randf_range(-0.03, 0.04)

		# Contrahuella sólida asentada dentro de la viga portante (cero huecos!)
		xfs_wall.append(_box_xf(pos + Vector3(0.0, -0.46, 0.0), Vector3(eff_len * 1.04, 0.86, width - 0.16)))

		# Huella gruesa principal (0.18m espesor real)
		var t_xf := _box_xf(pos + Vector3(0.0, -0.02, 0.0), Vector3(eff_len, 0.18, jitter_w), rng.randf_range(-0.008, 0.008))
		if i % 3 != 1 or is_landing:
			xfs_ta.append(t_xf)
		else:
			xfs_tb.append(t_xf)
		# Banda central de desgaste por el paso de peregrinos (losa ligeramente más clara y lisa)
		xfs_worn.append(_box_xf(pos + Vector3(0.0, 0.072, rng.randf_range(-0.08, 0.08)), Vector3(eff_len * 0.86, 0.018, width * 0.48), rng.randf_range(-0.01, 0.01)))

		# Muretes laterales escalonados y albardillas (respetando la salida norte a RusticStair_A5North en x<=54.0!)
		for sz_s in [-1.0, 1.0]:
			if sz_s < 0.0 and pos.x <= 54.2:
				continue
			var cz := pos.z + float(sz_s) * (width * 0.5 + 0.18)
			xfs_wall.append(_box_xf(Vector3(pos.x, pos.y - 0.16, cz), Vector3(step_len * 1.08, 0.88, 0.42)))
			if i % 2 == 0 or is_landing:
				xfs_ta.append(_box_xf(Vector3(pos.x, pos.y + 0.30, cz), Vector3(step_len * 2.04, 0.14, 0.52)))

	# Rellanos de remate en arranque Z9 (x=76.9) y llegada al umbral de A5 (x=49.6)
	xfs_ta.append(_box_xf(a + Vector3(0.55, -0.02, 0.0), Vector3(1.55, 0.18, width + 0.30)))
	xfs_ta.append(_box_xf(b + Vector3(-0.32, -0.02, 0.0), Vector3(1.30, 0.18, width + 0.40)))

	_emit_box_mm(br, "MM_BridgeRisersCurbs", xfs_wall, mat_stone_wall, true)
	_emit_box_mm(br, "MM_BridgeTreadsA", xfs_ta, mat_ashlar, true)
	_emit_box_mm(br, "MM_BridgeTreadsB", xfs_tb, mat_ashlar_b, true)
	_emit_box_mm(br, "MM_BridgeCenterWear", xfs_worn, mat_ashlar_worn, false)

	# 4. Plintos pétreos de anclaje + postes de roble + doble cuerda en catenaria (anclados, nunca atravesando peldaños!)
	var half_w := width * 0.5 + 0.18
	for side_z in [-1.0, 1.0]:
		var sgn := float(side_z)
		var end_x := 50.20 if sgn > 0.0 else 54.35
		var end_t := clampf((a.x - end_x) / maxf(0.01, a.x - b.x), 0.0, 1.0)
		var end_b := a.lerp(b, end_t)
		var seg_posts := 10 if sgn > 0.0 else 8
		var poly: Array[Vector3] = []
		for pi in range(seg_posts + 1):
			var pf := float(pi) / float(seg_posts)
			var post_base := a.lerp(end_b, pf) + Vector3(0.0, 0.34, sgn * half_w)
			poly.append(post_base)
			# Plinto pétreo moldeado que ancla cada poste al murete lateral
			_box(br, "BridgePostPlinth_%s_%d" % ["N" if sgn < 0.0 else "S", pi], post_base + Vector3(0.0, -0.04, 0.0), Vector3(0.42, 0.24, 0.42), mat_ashlar_b)
		_build_perimeter_rope_run(br, "BridgeRail_%s" % ("N" if sgn < 0.0 else "S"), poly, mat_wood_dark, mat_iron, mat_rope, 0.090, 0.98, 0.52, 0.075, false)

		# Barandilla física inclinada en el borde para no caer del puente
		var edge_a := a + Vector3(0.0, 0.9, sgn * (half_w + 0.08))
		var edge_b := end_b + Vector3(0.0, 0.9, sgn * (half_w + 0.08))
		var mid_r := (edge_a + edge_b) * 0.5
		var span_3d := edge_a.distance_to(edge_b)
		var rail_sb := StaticBody3D.new()
		rail_sb.name = "BridgeSafetyRail_%s" % ("N" if sgn < 0.0 else "S")
		br.add_child(rail_sb)
		rail_sb.look_at_from_position(mid_r, edge_b, Vector3.UP)
		var rail_col := CollisionShape3D.new()
		var rail_box := BoxShape3D.new()
		rail_box.size = Vector3(0.32, 2.8, span_3d + 0.25)
		rail_col.shape = rail_box
		rail_sb.add_child(rail_col)

	# 5. Pilares con faroles cálidos marcando arranque (Z9), punto medio y llegada al templo A5 (legible de noche!)
	var lantern_specs := [
		["A5BridgeBaseLantern", a + Vector3(-0.3, 0.36, half_w + 0.06), 1.75, 11.5],
		["A5BridgeMidLantern", a.lerp(b, 0.48) + Vector3(0.0, 0.36, half_w + 0.06), 1.85, 12.5],
		["A5BridgeTopLantern", b + Vector3(0.45, 0.36, half_w + 0.06), 1.85, 12.5],
	]
	for lspec in lantern_specs:
		var lname: String = str(lspec[0])
		var lpos: Vector3 = lspec[1]
		_box(br, lname + "_Pier", lpos + Vector3(0.0, 0.52, 0.0), Vector3(0.62, 1.12, 0.62), mat_ashlar)
		_box(br, lname + "_Cap", lpos + Vector3(0.0, 1.14, 0.0), Vector3(0.74, 0.14, 0.74), mat_ashlar_b)
		UpperArch._build_stone_stair_lantern(builder, br, lname, lpos + Vector3(0.0, 1.22, 0.0), mat_iron, mat_flame, float(lspec[2]), float(lspec[3]))

# 2E. Escalones rústicos de montaña macizos con cimentación profunda, barandillas perimetrales y faroles
static func build_upgraded_rustic_stone_flight(
	builder: Node3D,
	parent: Node3D,
	flight_name: String,
	a: Vector3,
	b: Vector3,
	width: float,
	step_count: int
) -> void:
	var fl := Node3D.new()
	fl.name = flight_name
	parent.add_child(fl)

	var mat_tread_a := UpperArch.create_weathered_ashlar_material(builder, Color("#c0b8a4"))
	var mat_tread_b := UpperArch.create_weathered_ashlar_material(builder, Color("#b0a896"))
	var mat_riser := UpperArch.create_weathered_ashlar_material(builder, Color("#969082"))
	var mat_wood_dark: Material = builder.get("mat_wood_dark")
	var mat_iron: Material = builder.get("mat_iron")
	var mat_flame: Material = builder.get("mat_flame")
	var mat_rope := _make_rope_mat(builder)

	var delta_v := b - a
	var horiz := Vector3(delta_v.x, 0.0, delta_v.z)
	var flat_len := horiz.length()
	var dir_xz := horiz.normalized() if flat_len > 0.001 else Vector3.FORWARD
	var yaw := atan2(dir_xz.x, dir_xz.z)
	var step_depth := maxf(0.48, flat_len / float(maxi(1, step_count)) + 0.18)
	var side_dir := Vector3(dir_xz.z, 0.0, -dir_xz.x).normalized()
	var rng := RandomNumberGenerator.new()
	rng.seed = flight_name.hash()

	# Cimentación profunda para eliminar cualquier peldaño o descansillo flotando sobre pendientes escarpadas
	var is_turn_or_obs := ("ObsTurn" in flight_name or "ObsNorth" in flight_name or "ObsCrown" in flight_name or "ObsCoast" in flight_name)
	var base_drop := 5.2 if "ObsTurn" in flight_name else (3.0 if is_turn_or_obs else 2.6)

	var xfs_riser: Array[Transform3D] = []
	var xfs_ta: Array[Transform3D] = []
	var xfs_tb: Array[Transform3D] = []
	for i in range(step_count + 1):
		var t := float(i) / float(maxi(1, step_count))
		var p := a.lerp(b, t)
		var tread_w := width + rng.randf_range(-0.05, 0.06)
		xfs_riser.append(_box_xf(p + Vector3(0.0, -base_drop * 0.5, 0.0), Vector3(width - 0.06, base_drop, step_depth * 0.98), yaw))
		var t_xf := _box_xf(p + Vector3(0.0, 0.02, 0.0), Vector3(tread_w, 0.16, step_depth), yaw + rng.randf_range(-0.015, 0.015))
		if i % 3 != 1:
			xfs_ta.append(t_xf)
		else:
			xfs_tb.append(t_xf)
		for s_x_v in [-1.0, 1.0]:
			var s_x := float(s_x_v)
			var side_vec := side_dir * (s_x * (width * 0.5 + 0.16))
			var curb_h := base_drop * 0.55 + 0.36
			xfs_riser.append(_box_xf(p + side_vec + Vector3(0.0, 0.24 - curb_h * 0.5, 0.0), Vector3(0.36, curb_h, step_depth * 1.04), yaw + rng.randf_range(-0.018, 0.018)))
			if i % 2 == 0 or i == step_count:
				xfs_ta.append(_box_xf(p + side_vec + Vector3(0.0, 0.26, 0.0), Vector3(0.42, 0.12, step_depth * 1.95), yaw + rng.randf_range(-0.015, 0.015)))
	_emit_box_mm(fl, "MM_RisersCurbs", xfs_riser, mat_riser, true)
	_emit_box_mm(fl, "MM_StepsA", xfs_ta, mat_tread_a, true)
	_emit_box_mm(fl, "MM_StepsB", xfs_tb, mat_tread_b, true)

	# Barandillas de postes de roble y doble cuerda en catenaria en los bordes exteriores de los tramos de montaña
	if mat_wood_dark != null and mat_iron != null and flat_len >= 3.2:
		var post_count := clampi(int(round(flat_len / 3.8)), 2, 10)
		var rail_off := width * 0.5 + 0.18
		for s_side in [-1.0, 1.0]:
			var sgn := float(s_side)
			var pts_rail: Array[Vector3] = []
			for pi in range(post_count + 1):
				var pf := float(pi) / float(post_count)
				# Dejar libres los 1.2m iniciales/finales en cruces para nunca atravesar embocaduras
				var eff_t := lerpf(0.06, 0.94, pf)
				var rp := a.lerp(b, eff_t) + side_dir * (sgn * rail_off) + Vector3(0.0, 0.26, 0.0)
				pts_rail.append(rp)
			_build_perimeter_rope_run(fl, "%s_Rail_%s" % [flight_name, "L" if sgn < 0.0 else "R"], pts_rail, mat_wood_dark, mat_iron, mat_rope, 0.072, 0.94, 0.50, 0.07, false)

	# Faroles cálidos en pilares de piedra para orientar las escaleras de montaña al anochecer/noche
	if mat_iron != null and mat_flame != null:
		var lantern_ts: Array[float] = []
		if "A5North" in flight_name:
			lantern_ts = [0.50, 0.96]
		elif "A5RidgeW" in flight_name:
			lantern_ts = [0.35, 0.72]
		elif "ObsTurn" in flight_name:
			lantern_ts = [0.55]
		elif "ObsNorth" in flight_name:
			lantern_ts = [0.45, 0.95]
		elif "ObsCrown" in flight_name:
			lantern_ts = [0.50]
		elif "ObsCoast" in flight_name:
			lantern_ts = [0.15]
		for li in range(lantern_ts.size()):
			var lt := float(lantern_ts[li])
			var lp := a.lerp(b, lt) + side_dir * (width * 0.5 + 0.22) + Vector3(0.0, 0.28, 0.0)
			_box(fl, "%s_LanternPier_%d" % [flight_name, li], lp + Vector3(0.0, 0.42, 0.0), Vector3(0.46, 0.86, 0.46), mat_tread_a)
			UpperArch._build_stone_stair_lantern(builder, fl, "%s_Lantern_%d" % [flight_name, li], lp + Vector3(0.0, 0.88, 0.0), mat_iron, mat_flame, 1.45, 11.0)
