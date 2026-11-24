@tool
class_name RetreatTempleAndCliffs
extends RefCounted

# ==============================================================================
# SEGUNDA AUDITORÍA VISUAL DEL RETIRO DEL DRAGÓN (FASES 1–5)
# - Fase 1: Macizo volcánico continuo bajo A5 (eliminando el bloque negro
#           flotante TemplePlinthCliff), cimentación de mampostería escalonada
#           con contrafuertes funcionales y hombros rocosos estratificados.
# - Fase 2: Arquitectura monumental del Templo de Bahamut A5: cubierta en
#           hiladas de pizarra/piedra con cumbrera, aleros y vigas en grupo
#           cutaway independiente (TempleRoofCutawayGroup), 4 columnas con
#           basas, fustes y capiteles tallados, frontón pétreo con emblema
#           esculpido del Dragón de Platino y muro trasero con hornacina.
# - Fase 3: Interior sagrado A5: pavimento ceremonial con eje y cenefa,
#           pedestal escalonado monumental para Bahamut, mesa de ofrendas,
#           braseros esculpidos con luz cálida y motas ambientales discretas.
# - Fase 4: Geología de acantilados facetados, sustitución de pilares cónicos
#           y suavizado costero Z1/Z2.
# - Fase 5: Jardines en terrazas Z7, bosquete orgánico y arbolado costero.
# ==============================================================================

const Structure = preload("res://scripts/retreat_structure.gd")
const SceneEnhancer = preload("res://scripts/retreat_scene_enhancer.gd")
const UpperArch = preload("res://scripts/retreat_upper_architecture.gd")

# ------------------------------------------------------------------------------
# UTILIDADES GEOMÉTRICAS Y MATERIALES UNIFICADOS
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

static func _cyl(parent: Node3D, cyl_name: String, pos: Vector3, r_top: float, r_bot: float, height: float, mat: Material, segs: int = 16, shadow: bool = true) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	mi.name = cyl_name
	var cm := CylinderMesh.new()
	cm.top_radius = r_top
	cm.bottom_radius = r_bot
	cm.height = height
	cm.radial_segments = segs
	mi.mesh = cm
	mi.material_override = mat
	mi.position = pos
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON if shadow else GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parent.add_child(mi)
	return mi

static func _emit_quad_vcol(st: SurfaceTool, p0: Vector3, p1: Vector3, p2: Vector3, p3: Vector3, c0: Color, c1: Color, c2: Color, c3: Color) -> void:
	st.set_color(c0); st.set_uv(Vector2(p0.x * 0.14, p0.y * 0.14)); st.add_vertex(p0)
	st.set_color(c1); st.set_uv(Vector2(p1.x * 0.14, p1.y * 0.14)); st.add_vertex(p1)
	st.set_color(c2); st.set_uv(Vector2(p2.x * 0.14, p2.y * 0.14)); st.add_vertex(p2)
	st.set_color(c0); st.set_uv(Vector2(p0.x * 0.14, p0.y * 0.14)); st.add_vertex(p0)
	st.set_color(c2); st.set_uv(Vector2(p2.x * 0.14, p2.y * 0.14)); st.add_vertex(p2)
	st.set_color(c3); st.set_uv(Vector2(p3.x * 0.14, p3.y * 0.14)); st.add_vertex(p3)

static func _hash2(ix: int, iz: int) -> float:
	var h := (ix * 374761393 + iz * 668265263) ^ 1274126177
	h = (h ^ (h >> 13)) * 1274126177
	return float((h ^ (h >> 16)) & 0xFFFF) / 65535.0

static func _vnoise2(x: float, z: float) -> float:
	var ix := int(floorf(x))
	var iz := int(floorf(z))
	var fx := x - float(ix)
	var fz := z - float(iz)
	var ux := fx * fx * (3.0 - 2.0 * fx)
	var uz := fz * fz * (3.0 - 2.0 * fz)
	return lerpf(
		lerpf(_hash2(ix, iz), _hash2(ix + 1, iz), ux),
		lerpf(_hash2(ix, iz + 1), _hash2(ix + 1, iz + 1), ux),
		uz
	)

static func _fbm2(x: float, z: float) -> float:
	return (
		0.56 * _vnoise2(x, z)
		+ 0.28 * _vnoise2(x * 2.09 + 11.3, z * 2.05 - 6.7)
		+ 0.16 * _vnoise2(x * 4.21 - 4.9, z * 4.17 + 15.2)
	)

# Familia única de materiales de roca y arquitectura noble del sector A5/farallón
static func create_unified_rock_vcol_material(builder: Node3D, roughness_v: float = 0.87, norm_scale: float = 0.72) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.vertex_color_use_as_albedo = true
	m.vertex_color_is_srgb = true
	m.cull_mode = BaseMaterial3D.CULL_DISABLED
	m.roughness = roughness_v
	m.metallic = 0.0
	var tex_basalt: Texture2D = builder.call("_load_tex", "basalt-coastal-albedo-v1.webp")
	if tex_basalt == null:
		tex_basalt = builder.call("_load_tex", "coastal-rock.png")
	var norm_rock: Texture2D = builder.call("_load_tex", "rock-normal-v1.png")
	if tex_basalt:
		m.albedo_texture = tex_basalt
		m.uv1_triplanar = true
		m.uv1_world_triplanar = true
		m.uv1_scale = Vector3(0.15, 0.15, 0.15)
		m.uv1_triplanar_sharpness = 3.5
	if norm_rock:
		m.normal_enabled = true
		m.normal_texture = norm_rock
		m.normal_scale = norm_scale
	return m

static func create_temple_stone_material(builder: Node3D, tint: Color, roughness_v: float = 0.78, tex_name: String = "limestone-v3.webp", uv_scale: float = 0.34, norm_scale: float = 0.48, metallic_v: float = 0.02) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = tint
	m.roughness = roughness_v
	m.metallic = metallic_v
	var tex: Texture2D = builder.call("_load_tex", tex_name)
	if tex == null:
		tex = builder.call("_load_tex", "ashlar-v4.webp")
	var norm_rock: Texture2D = builder.call("_load_tex", "rock-normal-v1.png")
	if tex:
		m.albedo_texture = tex
		m.uv1_triplanar = true
		m.uv1_world_triplanar = true
		m.uv1_scale = Vector3(uv_scale, uv_scale, uv_scale)
		m.uv1_triplanar_sharpness = 3.6
	if norm_rock and norm_scale > 0.0:
		m.normal_enabled = true
		m.normal_texture = norm_rock
		m.normal_scale = norm_scale
	return m

# Bloque rocoso facetado con estratos angulosos (reemplaza conos lisos "dedos" en todo el farallón)
static func make_faceted_cliff_block_mesh(seed_val: int = 409, tiers: int = 5) -> ArrayMesh:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	st.set_smooth_group(-1) # Planos de fractura geológica definidos
	var rng := RandomNumberGenerator.new()
	rng.seed = seed_val

	var sides := 9
	var base_angles: Array[float] = []
	var base_radii: Array[float] = []
	for s in range(sides):
		base_angles.append((float(s) / float(sides)) * TAU + rng.randf_range(-0.12, 0.12))
		base_radii.append(rng.randf_range(0.46, 0.66))

	var rings: Array = []
	var ring_cols: Array = []
	var strata_palette := [
		Color("#767f82"),
		Color("#8d9696"),
		Color("#a2aaa4"),
		Color("#889191"),
		Color("#adb3a9"),
		Color("#98a290"),
	]
	for ti in range(tiers + 1):
		var f := float(ti) / float(tiers) # 0 = base, 1 = cima plana/inclinada
		# Estrechamiento irregular por escalones de estrato (nunca cono puntiagudo!)
		var step_shrink := 1.0 - f * 0.24 - (0.07 if ti % 2 == 1 else 0.0)
		var ring: Array[Vector3] = []
		var col_row: Array[Color] = []
		var shelf_shift := Vector2(rng.randf_range(-0.05, 0.05), rng.randf_range(-0.05, 0.05)) * f
		var base_c: Color = strata_palette[ti % strata_palette.size()]
		for s in range(sides):
			var ang := base_angles[s] + float(ti) * 0.05
			var r := base_radii[s] * step_shrink * rng.randf_range(0.90, 1.10)
			var px := cos(ang) * r + shelf_shift.x
			var pz := sin(ang) * r + shelf_shift.y
			# Buzamiento geológico coherente (~6° hacia +X)
			var dip := -px * 0.11
			var py := f + dip + rng.randf_range(-0.025, 0.025) * (1.0 if ti > 0 and ti < tiers else 0.35)
			ring.append(Vector3(px, py, pz))
			var face_var := clampf((cos(ang) * 0.08 + sin(ang) * 0.06) + rng.randf_range(-0.04, 0.04), -0.12, 0.12)
			var vc := base_c.lightened(face_var) if face_var >= 0.0 else base_c.darkened(-face_var)
			col_row.append(vc)
		rings.append(ring)
		ring_cols.append(col_row)

	for ti in range(tiers):
		var r0: Array = rings[ti]
		var r1: Array = rings[ti + 1]
		var c0: Array = ring_cols[ti]
		var c1: Array = ring_cols[ti + 1]
		for s in range(sides):
			var ns := (s + 1) % sides
			_emit_quad_vcol(st, r0[ns], r0[s], r1[s], r1[ns], c0[ns], c0[s], c1[s], c1[ns])

	# Meseta superior fracturada (plana/ligeramente inclinada con musgo sutil, nunca pincho cónico)
	var top_r: Array = rings[tiers]
	var top_center := Vector3(0.0, 1.03, 0.0)
	var cap_col := Color("#9ea796")
	for s in range(sides):
		var ns := (s + 1) % sides
		st.set_color(cap_col); st.set_uv(Vector2(top_r[ns].x * 0.25, top_r[ns].z * 0.25)); st.add_vertex(top_r[ns])
		st.set_color(cap_col); st.set_uv(Vector2(top_center.x, top_center.z)); st.add_vertex(top_center)
		st.set_color(cap_col); st.set_uv(Vector2(top_r[s].x * 0.25, top_r[s].z * 0.25)); st.add_vertex(top_r[s])

	st.generate_normals()
	return st.commit()

# ==============================================================================
# FASE 1 — MACIZO VOLCÁNICO DEL FARALLÓN A5, CIMENTACIÓN Y HOMBROS ROCOSOS
# ==============================================================================
static func _build_a5_promontory_massif_mesh() -> ArrayMesh:
	# Macizo geológico continuo que desciende desde y=25.25m (bajo la mampostería de A5)
	# hasta y=-2.5m (empotrado bajo el mar), ensanchándose orgánicamente con estratos
	# inclinados, contrafuertes naturales y diaclasas verticales (cero caja negra flotante!)
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	st.set_smooth_group(-1)

	var cx := 40.5
	var cz := 69.3
	var n_rings := 18
	var n_segs := 40
	var y_top := 25.35
	var y_bot := -2.8

	var rings: Array = []
	var cols: Array = []

	for ri in range(n_rings + 1):
		var v := float(ri) / float(n_rings) # 0 = cima (25.35m), 1 = base submarina (-2.8m)
		var y_base := lerpf(y_top, y_bot, v)
		# Ensanchamiento escalonado natural hacia el pie del acantilado
		# Más pronunciado en la base para fundirse con el farallón occidental y el talud sur
		var flare_curve := pow(v, 0.88)
		var strata_bench := sin(v * PI * 7.0) * 0.34 * (1.0 - v * 0.25)
		var hx := lerpf(9.45, 14.2, flare_curve) + strata_bench
		var hz := lerpf(8.15, 11.4, flare_curve) + strata_bench * 0.85

		var ring_pts: Array[Vector3] = []
		var ring_c: Array[Color] = []

		for si in range(n_segs):
			var ang := (float(si) / float(n_segs)) * TAU
			var ca := cos(ang)
			var sa := sin(ang)
			# Superelipse rectangular-orgánica (p=3.4 arriba bajo el templo -> p=2.2 abajo en promontorio natural)
			var p_exp := lerpf(3.5, 2.15, flare_curve)
			var denom := pow(pow(absf(ca), p_exp) + pow(absf(sa), p_exp), 1.0 / p_exp)
			var rx := (ca / maxf(0.001, denom)) * hx
			var rz := (sa / maxf(0.001, denom)) * hz

			var wx_est := cx + rx
			var wz_est := cz + rz
			# Espolones y hendiduras verticales geológicas (más libres cuanto más abajo del estilóbato)
			var env := smoothstep(0.02, 0.26, v)
			var ridge_n := (_fbm2(wx_est * 0.14 + 3.1, wz_est * 0.14 - 2.4) - 0.46) * 3.15
			var strata_n := sin((y_base + (wx_est - 40.5) * 0.11) * 1.15 + _vnoise2(wx_est * 0.18, wz_est * 0.18) * 2.2) * 0.62
			var fault_raw := absf(_vnoise2(wx_est * 0.24 + 5.7, wz_est * 0.24 + 1.9) - 0.5) * 2.0
			var fissure := clampf(1.0 - smoothstep(0.0, 0.18, fault_raw), 0.0, 1.0)

			var radial_disp := (ridge_n + strata_n - fissure * 1.15) * env
			# Hombros reforzados hacia Oeste (empotrado en SAL1) y Este (bajo el arranque de la escalinata A5)
			if ca < -0.25:
				radial_disp += 1.65 * flare_curve * (-ca)
			elif ca > 0.30 and sa < 0.45:
				radial_disp += 2.20 * flare_curve * ca
			# Evitar invadir jamás el paso de Z2 al sur (z <= 83.2)
			var dir_xz := Vector2(rx, rz)
			var rlen := dir_xz.length()
			var dir_n := dir_xz / maxf(0.001, rlen)
			var final_x := wx_est + dir_n.x * radial_disp
			var final_z := minf(83.2, wz_est + dir_n.y * radial_disp)

			# Buzamiento suave de estratos en Y (0 en el borde superior para ajustar con la mampostería)
			var y_dip := -(final_x - cx) * 0.085 * env
			var y_jit := (_vnoise2(final_x * 0.30, y_base * 0.40) - 0.5) * 0.42 * env
			var final_y := y_base + y_dip + y_jit
			if ri == 0:
				final_y = y_top
			elif ri == n_rings:
				final_y = y_bot

			ring_pts.append(Vector3(final_x, final_y, final_z))

			# Color de basalto volcánico calibrado (nunca negro carbón; vetas cálidas, estratos y zona húmeda baja)
			var strata_band := 0.5 + 0.5 * sin((final_y + (final_x - cx) * 0.11) * 0.95)
			var base_stone := Color("#7d8789").lerp(Color("#aeb5ad"), clampf(strata_band * 0.65 + (1.0 - v) * 0.25, 0.0, 0.85))
			# Variación mineral sutil
			var warm_v := _vnoise2(final_x * 0.16 + 8.1, final_y * 0.26)
			base_stone = base_stone.lerp(Color("#a7a495"), warm_v * 0.24)
			# Sombra en fisuras verticales y repisas
			base_stone = base_stone.darkened(clampf(fissure * 0.24 + (0.10 if strata_n < -0.25 else 0.0), 0.0, 0.30))
			# Ligeras manchas de musgo costero en repisas soleadas superiores
			if strata_n > 0.28 and final_y > 6.0 and final_y < 24.5 and sa > -0.4:
				var m_noise := _fbm2(final_x * 0.28, final_z * 0.28)
				if m_noise > 0.52:
					base_stone = base_stone.lerp(Color("#697955"), clampf((m_noise - 0.52) * 1.15, 0.0, 0.36))
			# Banda oscura húmeda a nivel del mar (y < 2.8m)
			if final_y < 2.8:
				var wet_t := clampf((2.8 - final_y) / 3.4, 0.0, 1.0)
				base_stone = base_stone.lerp(Color("#475358"), wet_t * 0.65)
			ring_c.append(base_stone)

		rings.append(ring_pts)
		cols.append(ring_c)

	for ri in range(n_rings):
		var r0: Array = rings[ri]
		var r1: Array = rings[ri + 1]
		var c0: Array = cols[ri]
		var c1: Array = cols[ri + 1]
		for si in range(n_segs):
			var ns := (si + 1) % n_segs
			_emit_quad_vcol(st, r0[si], r0[ns], r1[ns], r1[si], c0[si], c0[ns], c1[ns], c1[si])

	# Tapa superior sellada bajo la cimentación de mampostería
	var top_ring: Array = rings[0]
	var top_col := Color("#8c9492")
	var top_c := Vector3(cx, y_top, cz)
	for si in range(n_segs):
		var ns := (si + 1) % n_segs
		st.set_color(top_col); st.set_uv(Vector2(top_ring[si].x * 0.14, top_ring[si].z * 0.14)); st.add_vertex(top_ring[si])
		st.set_color(top_col); st.set_uv(Vector2(top_c.x * 0.14, top_c.z * 0.14)); st.add_vertex(top_c)
		st.set_color(top_col); st.set_uv(Vector2(top_ring[ns].x * 0.14, top_ring[ns].z * 0.14)); st.add_vertex(top_ring[ns])

	st.generate_normals()
	return st.commit()

static func build_a5_promontory_and_foundation(builder: Node3D, parthenon: Node3D, y: float) -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = 202611231

	var mat_cliff := create_unified_rock_vcol_material(builder, 0.87, 0.72)
	var mat_masonry_dark := create_temple_stone_material(builder, Color("#8b8d87"), 0.84, "basalt-coastal-albedo-v1.webp", 0.28, 0.62, 0.02)
	var mat_masonry_mid := create_temple_stone_material(builder, Color("#aba698"), 0.80, "ashlar-v4.webp", 0.34, 0.52, 0.02)
	var mat_masonry_light := create_temple_stone_material(builder, Color("#c6beb0"), 0.76, "limestone-v3.webp", 0.36, 0.44, 0.02)

	var found_root := Node3D.new()
	found_root.name = "A5_PromontoryAndFoundation"
	parthenon.add_child(found_root)

	# 1. Macizo volcánico principal continuo hasta y=-2.8m (reemplaza TemplePlinthCliff)
	var massif := MeshInstance3D.new()
	massif.name = "A5_VolcanicPromontoryMassif"
	massif.mesh = _build_a5_promontory_massif_mesh()
	massif.material_override = mat_cliff
	massif.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	found_root.add_child(massif)

	# 2. Masas rocosas estructurales secundarias y espolones fracturados integrando el macizo
	#    con el acantilado oeste (SAL1), la caída sur hacia el mar y el apoyo este de la escalinata
	var block_a := make_faceted_cliff_block_mesh(511, 5)
	var block_b := make_faceted_cliff_block_mesh(673, 4)
	var block_c := make_faceted_cliff_block_mesh(829, 5)
	var crag_specs := [
		# Gran zócalo inferior sur y suroeste (conectando la base del farallón con el mar)
		[Vector3(33.2, -2.2, 77.6), Vector3(11.5, 16.5, 8.8), Vector3(3.0, 18.0, -4.0), 0],
		[Vector3(41.4, -2.4, 79.2), Vector3(12.8, 15.2, 8.6), Vector3(4.0, -14.0, -5.0), 1],
		[Vector3(48.6, -2.2, 77.4), Vector3(10.8, 17.0, 8.4), Vector3(3.0, 22.0, -3.0), 2],
		# Estratos medios escarpados abrazando la cimentación entre y=11..25m (solapados sin grietas negras centrales!)
		[Vector3(30.4, 11.2, 74.6), Vector3(7.6, 14.0, 7.8), Vector3(5.0, -24.0, -6.0), 2],
		[Vector3(35.6, 12.2, 78.0), Vector3(8.8, 13.0, 6.8), Vector3(6.0, 11.0, -4.0), 0],
		[Vector3(40.2, 11.4, 78.2), Vector3(8.6, 13.4, 7.0), Vector3(5.0, -6.0, -5.0), 2],
		[Vector3(44.8, 12.0, 77.9), Vector3(8.8, 13.2, 6.8), Vector3(5.0, -18.0, -5.0), 1],
		[Vector3(29.8, 13.8, 66.2), Vector3(7.4, 12.0, 8.4), Vector3(4.0, 28.0, -6.0), 1],
		# Contrafuerte rocoso oeste bajo el sendero superior izquierdo (sella peñasco saliente en x~26..30)
		[Vector3(26.2, 12.0, 74.0), Vector3(7.4, 12.8, 7.8), Vector3(4.0, -16.0, -5.0), 0],
		# Repisas y peñascos menores rompiendo el contacto roca-mampostería (erosión natural)
		[Vector3(32.5, 22.4, 77.8), Vector3(4.8, 3.0, 3.4), Vector3(7.0, 15.0, -5.0), 1],
		[Vector3(38.4, 22.0, 78.2), Vector3(5.4, 3.3, 3.4), Vector3(6.0, -12.0, -4.0), 2],
		[Vector3(45.6, 22.2, 77.9), Vector3(5.0, 3.1, 3.3), Vector3(7.0, 24.0, -6.0), 0],
		[Vector3(30.9, 22.5, 71.2), Vector3(3.8, 2.9, 4.8), Vector3(5.0, -20.0, -5.0), 0],
		[Vector3(31.2, 22.8, 63.8), Vector3(3.8, 2.7, 4.4), Vector3(4.0, 14.0, -4.0), 2],
		# Cierre este bajo el rincón SE del templo (enlace suave con la escalinata)
		[Vector3(50.2, 13.5, 74.4), Vector3(7.0, 11.8, 6.4), Vector3(5.0, -16.0, -4.0), 0],
		[Vector3(50.0, 21.8, 72.2), Vector3(4.8, 3.5, 4.8), Vector3(6.0, 19.0, -5.0), 1],
	]
	for ci in range(crag_specs.size()):
		var sp: Array = crag_specs[ci]
		var mi := MeshInstance3D.new()
		mi.name = "A5_MassifShoulder_%d" % ci
		var idx := int(sp[3])
		mi.mesh = block_a if idx == 0 else (block_b if idx == 1 else block_c)
		mi.material_override = mat_cliff
		mi.position = sp[0]
		mi.scale = sp[1]
		mi.rotation_degrees = sp[2]
		mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		found_root.add_child(mi)

	# 3. Plataforma de mampostería tallada sobre la roca viva (diferencia clara roca natural -> cimentación -> suelo sagrado)
	# 3a. Muro de contención / zócalo de sillería volcánica incrustado en la cima del macizo (y=24.1..25.95)
	_box(found_root, "TempleRetainingPlinth", Vector3(40.5, y - 2.02, 69.5), Vector3(19.0, 1.92, 16.4), mat_masonry_dark)
	# Moldura de separación / imposta de cimentación (y=25.95..26.22)
	_box(found_root, "TempleFoundationStringcourse", Vector3(40.5, y - 0.94, 69.5), Vector3(19.48, 0.26, 16.88), mat_masonry_mid)
	# 3b. Crepidoma escalonada de piedra caliza noble (2 gradas perimetrales bajo el estilóbato y=26.22..27.0)
	_box(found_root, "TempleCrepidomaMid", Vector3(40.5, y - 0.62, 69.5), Vector3(19.24, 0.38, 16.64), mat_masonry_mid)
	_box(found_root, "TempleStylobateDeck", Vector3(40.5, y - 0.24, 69.5), Vector3(18.76, 0.38, 16.16), mat_masonry_light)
	# Bordes perimetrales a cota 27.0m (sin z-fighting con las losas del santuario)
	_box(found_root, "ParthenonRimN", Vector3(40.5, y - 0.015, 62.08), Vector3(18.68, 0.14, 1.16), mat_masonry_light, false)
	_box(found_root, "ParthenonRimS", Vector3(40.5, y - 0.015, 76.48), Vector3(18.68, 0.14, 2.04), mat_masonry_light, false)
	_box(found_root, "ParthenonRimW", Vector3(32.02, y - 0.015, 69.5), Vector3(1.64, 0.14, 15.6), mat_masonry_light, false)
	_box(found_root, "ParthenonRimE_S", Vector3(48.98, y - 0.015, 73.15), Vector3(1.64, 0.14, 8.3), mat_masonry_light, false)

	# 3c. Contrafuertes de mampostería SOLO bajo cargas reales (4 esquinas de columnas + 2 ejes medios sur + 2 oeste)
	var buttress_loads := [
		# [pos_xz, size_xz, height, slope_dir_xz]
		[Vector2(31.15, 77.65), Vector2(1.42, 1.42), 4.4, Vector2(-0.5, 0.85)], # Esquina SO
		[Vector2(49.85, 77.65), Vector2(1.42, 1.42), 4.4, Vector2(0.5, 0.85)],  # Esquina SE
		[Vector2(31.15, 61.35), Vector2(1.36, 1.36), 3.6, Vector2(-0.6, -0.6)], # Esquina NO
		[Vector2(37.4, 77.82), Vector2(1.18, 0.96), 3.8, Vector2(0.0, 1.0)],    # Eje sur O
		[Vector2(43.6, 77.82), Vector2(1.18, 0.96), 3.8, Vector2(0.0, 1.0)],    # Eje sur E
		[Vector2(30.92, 66.4), Vector2(0.96, 1.18), 3.5, Vector2(-1.0, 0.0)],   # Eje oeste N
		[Vector2(30.92, 72.6), Vector2(0.96, 1.18), 3.5, Vector2(-1.0, 0.0)],   # Eje oeste S
	]
	for bi in range(buttress_loads.size()):
		var bl: Array = buttress_loads[bi]
		var bp: Vector2 = bl[0]
		var bsz: Vector2 = bl[1]
		var bh: float = float(bl[2])
		var sdir: Vector2 = bl[3]
		var top_b := y - 0.82
		# Cuerpo inferior ensanchado empotrado en el macizo
		_box(found_root, "TempleButtressBase_%d" % bi, Vector3(bp.x + sdir.x * 0.14, top_b - bh * 0.62, bp.y + sdir.y * 0.14), Vector3(bsz.x * 1.14, bh * 0.76, bsz.y * 1.14), mat_masonry_dark)
		# Cuerpo superior de sillería
		_box(found_root, "TempleButtressShaft_%d" % bi, Vector3(bp.x, top_b - bh * 0.25, bp.y), Vector3(bsz.x, bh * 0.50, bsz.y), mat_masonry_mid)
		# Albardilla inclinada en la cabeza del contrafuerte
		var cap := _box(found_root, "TempleButtressCap_%d" % bi, Vector3(bp.x + sdir.x * 0.04, top_b + 0.04, bp.y + sdir.y * 0.04), Vector3(bsz.x + 0.16, 0.22, bsz.y + 0.16), mat_masonry_light)
		cap.rotation = Vector3(sdir.y * 0.22, 0.0, -sdir.x * 0.22)

	# 3d. Sillares de esquina (quoins) y pequeños bloques de erosión/vegetación en la costura roca-mampostería
	for q_corner in [Vector2(31.2, 77.5), Vector2(49.8, 77.5), Vector2(31.2, 61.5)]:
		for qi in range(4):
			var qy := y - 1.15 - float(qi) * 0.44
			var qw := 0.84 if qi % 2 == 0 else 0.62
			var qd := 0.62 if qi % 2 == 0 else 0.84
			_box(found_root, "TempleQuoin_%d_%d_%d" % [int(q_corner.x), int(q_corner.y), qi], Vector3(q_corner.x, qy, q_corner.y), Vector3(qw, 0.40, qd), mat_masonry_light if qi % 2 == 0 else mat_masonry_mid)

	# Vegetación sobria de grieta (helechos y hiedra colgante) en repisas del macizo para dar escala natural
	var fern_xfs: Array[Transform3D] = []
	var fern_cols: Array[Color] = []
	var ivy_xfs: Array[Transform3D] = []
	var f_greens := [Color("#435835"), Color("#516640"), Color("#5d7149"), Color("#394d2e")]
	var ledge_pts := [
		Vector3(33.4, 24.4, 78.2), Vector3(38.9, 24.1, 78.4), Vector3(45.2, 24.3, 78.2),
		Vector3(31.1, 24.4, 71.8), Vector3(36.0, 17.8, 79.4), Vector3(44.6, 16.4, 79.2),
		Vector3(31.2, 16.6, 75.8), Vector3(49.4, 23.6, 74.0)
	]
	for lp in ledge_pts:
		for k in range(3):
			var fsc := rng.randf_range(0.65, 1.15)
			var fb := Basis.from_euler(Vector3(0.10, rng.randf_range(0.0, TAU), 0.0)).scaled(Vector3(fsc, fsc * 0.85, fsc))
			fern_xfs.append(Transform3D(fb, lp + Vector3(rng.randf_range(-1.1, 1.1), rng.randf_range(-0.2, 0.25), rng.randf_range(-0.2, 0.35))))
			fern_cols.append(f_greens[rng.randi() % f_greens.size()])
		for j in range(2):
			var drop := rng.randf_range(1.1, 2.2)
			var ib := Basis.from_euler(Vector3(0.06, rng.randf_range(-0.3, 0.3), 0.0)).scaled(Vector3(0.62, drop, 0.46))
			ivy_xfs.append(Transform3D(ib, lp + Vector3(rng.randf_range(-0.85, 0.85), -0.1, 0.32)))

	var f_mat := StandardMaterial3D.new()
	f_mat.vertex_color_use_as_albedo = true
	f_mat.vertex_color_is_srgb = true
	f_mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	f_mat.roughness = 0.86
	f_mat.backlight_enabled = true
	f_mat.backlight = Color(0.09, 0.14, 0.06)
	var mm_f: MultiMeshInstance3D = builder.call("_make_multimesh_batch", "MM_A5PromontoryFerns", SceneEnhancer.make_fern_cluster_mesh(), f_mat, fern_xfs, fern_cols)
	mm_f.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	found_root.add_child(mm_f)

	var iv_mat := StandardMaterial3D.new()
	iv_mat.albedo_color = Color("#3e5434")
	iv_mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	iv_mat.roughness = 0.88
	var empty_c: Array[Color] = []
	var mm_iv: MultiMeshInstance3D = builder.call("_make_multimesh_batch", "MM_A5PromontoryIvy", SceneEnhancer.make_hanging_ivy_mesh(), iv_mat, ivy_xfs, empty_c)
	mm_iv.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	found_root.add_child(mm_iv)

# Reemplaza los 9 pilares cónicos lisos ("dedos") de Retreat_WestCliffButtress por contrafuertes
# geológicos facetados, anclados hasta y=-2.4m y continuos bajo la escalinata de A5 y el enlace Z7/Z9
static func build_west_cliff_buttresses(builder: Node3D, a5_node: Node3D) -> void:
	var buttress_node := Node3D.new()
	buttress_node.name = "Retreat_WestCliffButtress"
	a5_node.add_child(buttress_node)

	var mat_cliff := create_unified_rock_vcol_material(builder, 0.87, 0.72)
	var block_a := make_faceted_cliff_block_mesh(919, 5)
	var block_b := make_faceted_cliff_block_mesh(1031, 4)
	var block_c := make_faceted_cliff_block_mesh(1187, 5)

	# Masas rocosas estratificadas anchas en base (todas arrancan en y <= -1.8m o dentro de la ladera,
	# NINGUNA flotando, NINGUNA estirada como dedo cónico vertical!)
	# Respetando estrictamente la pendiente inferior del puente A5 (y_bridge = lerpf(18.0, 27.0, (76.6-x)/26.8))
	var strata_specs := [
		# Gran bancada inferior del farallón entre A5 (x=48) y Z7/A1 oeste (x=72), desde el mar hasta media ladera
		[Vector3(51.4, -2.2, 72.0), Vector3(11.6, 15.8, 9.6), Vector3(3.0, 14.0, -4.0), 0],
		[Vector3(56.8, -2.4, 72.6), Vector3(12.4, 14.4, 9.8), Vector3(4.0, -18.0, -5.0), 1],
		[Vector3(62.4, -2.4, 73.2), Vector3(12.2, 13.4, 9.6), Vector3(3.0, 22.0, -4.0), 2],
		[Vector3(67.8, -2.2, 74.2), Vector3(11.4, 12.6, 9.2), Vector3(4.0, -12.0, -5.0), 0],
		# Estrato medio (y=9..21m) escalonado hacia atrás, cimentando los pilares del viaducto A5
		[Vector3(51.8, 10.6, 68.8), Vector3(9.4, 12.2, 8.2), Vector3(5.0, -15.0, -4.0), 2],
		[Vector3(57.2, 9.4, 68.4), Vector3(10.2, 10.8, 8.6), Vector3(4.0, 19.0, -5.0), 0],
		[Vector3(63.0, 8.4, 68.8), Vector3(10.6, 9.8, 8.8), Vector3(5.0, -21.0, -4.0), 1],
		[Vector3(68.8, 8.6, 69.8), Vector3(9.8, 8.6, 8.2), Vector3(4.0, 11.0, -5.0), 2],
		# Hombro alto de apoyo del tramo superior junto al templo (x=50..55, por debajo de los peldaños y<=24.8m)
		[Vector3(51.2, 19.2, 67.6), Vector3(6.8, 5.2, 6.8), Vector3(4.0, 12.0, -3.0), 1],
		[Vector3(55.4, 17.6, 67.2), Vector3(7.4, 4.8, 6.6), Vector3(5.0, -16.0, -4.0), 0],
		[Vector3(61.0, 15.8, 67.4), Vector3(8.2, 4.4, 6.4), Vector3(4.0, 14.0, -4.0), 2],
		# Transición orgánica hacia Z7 oeste (x=72..77, debajo de y=17.4m)
		[Vector3(73.2, 9.2, 72.4), Vector3(8.6, 7.8, 7.8), Vector3(5.0, -14.0, -5.0), 1],
	]

	for bsi in range(strata_specs.size()):
		var bsp: Array = strata_specs[bsi]
		var b_pos: Vector3 = bsp[0]
		var b_sc: Vector3 = bsp[1]
		var b_rot: Vector3 = bsp[2]
		var idx: int = int(bsp[3])
		var b_wrap := Node3D.new()
		b_wrap.name = "WestCliffButtressWrap_%d" % bsi
		b_wrap.position = b_pos
		b_wrap.rotation_degrees = b_rot
		buttress_node.add_child(b_wrap)

		var bi_inst := MeshInstance3D.new()
		bi_inst.name = "WestCliffButtress_%d" % bsi
		bi_inst.mesh = block_a if idx == 0 else (block_b if idx == 1 else block_c)
		bi_inst.material_override = mat_cliff
		bi_inst.scale = b_sc
		bi_inst.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		b_wrap.add_child(bi_inst)

		# Colisión solo bajo la zona jugable (sin bloquear el paso del puente A5)
		if b_pos.y + b_sc.y < 23.0:
			SceneEnhancer.add_cyl_collider(b_wrap, Vector3(0.0, b_sc.y * 0.45, 0.0), minf(b_sc.x, b_sc.z) * 0.34, b_sc.y)
		SceneEnhancer.tag_camera_occluder(b_wrap)

# ==============================================================================
# FASE 2 — ARQUITECTURA MONUMENTAL DEL TEMPLO A5 (COLUMNAS, CUBIERTA CUTAWAY,
#          FRONTÓN ESCULPIDO DE BAHAMUT Y MURO TRASERO CON HORNACINA)
# ==============================================================================
static func build_a5_monumental_architecture(builder: Node3D, parthenon: Node3D, y: float) -> Node3D:
	var mat_stone_dark := create_temple_stone_material(builder, Color("#767a7d"), 0.82, "basalt-coastal-albedo-v1.webp", 0.30, 0.56, 0.03)
	var mat_stone_mid := create_temple_stone_material(builder, Color("#b0aa9c"), 0.76, "ashlar-v4.webp", 0.36, 0.48, 0.02)
	var mat_stone_noble := create_temple_stone_material(builder, Color("#ccc5b4"), 0.72, "limestone-v3.webp", 0.38, 0.42, 0.03)
	var mat_slate_a := create_temple_stone_material(builder, Color("#586168"), 0.95, "basalt-coastal-albedo-v1.webp", 0.42, 0.56, 0.0)
	mat_slate_a.metallic_specular = 0.10
	var mat_slate_b := create_temple_stone_material(builder, Color("#636c70"), 0.96, "coastal-rock.png", 0.44, 0.52, 0.0)
	mat_slate_b.metallic_specular = 0.10
	var mat_slate_ridge := create_temple_stone_material(builder, Color("#7e8380"), 0.90, "limestone-v3.webp", 0.42, 0.46, 0.0)
	mat_slate_ridge.metallic_specular = 0.14
	var mat_timber := create_temple_stone_material(builder, Color("#5f4631"), 0.84, "oak-v4.webp", 0.52, 0.45, 0.0)
	var mat_platinum_relief := StandardMaterial3D.new()
	mat_platinum_relief.albedo_color = Color("#cfd4db")
	mat_platinum_relief.metallic = 0.16
	mat_platinum_relief.roughness = 0.58
	var mat_gold_muted := StandardMaterial3D.new()
	mat_gold_muted.albedo_color = Color("#c8aa66")
	mat_gold_muted.metallic = 0.32
	mat_gold_muted.roughness = 0.50
	var mat_bronze: Material = builder.get("mat_bronze")
	var mat_flame: Material = builder.get("mat_flame")
	var mat_iron: Material = builder.get("mat_iron")

	var col_height := 7.6
	var col_top_y := y + col_height # 34.6m

	# --------------------------------------------------------------------------
	# 2.1 CUATRO COLUMNAS MONUMENTALES ESCULPIDAS (SIEMPRE VISIBLES EN CUTAWAY!)
	#     Preservan exactamente las 4 posiciones y colisionadores canónicos.
	# --------------------------------------------------------------------------
	var col_positions: Array[Vector3] = [
		Vector3(32.3, y, 62.55),
		Vector3(32.3, y, 76.45),
		Vector3(48.7, y, 62.55),
		Vector3(48.7, y, 76.45),
	]
	for ci in range(col_positions.size()):
		var cp: Vector3 = col_positions[ci]
		var col_grp := Node3D.new()
		col_grp.name = "ParthenonColumn_%d" % ci
		col_grp.position = cp
		parthenon.add_child(col_grp)

		# Basa escalonada en 3 cuerpos (plinto cuadrado + toro inferior + escocia + toro superior)
		_box(col_grp, "ParthenonColBaseLow_%d" % ci, Vector3(0.0, 0.16, 0.0), Vector3(1.56, 0.32, 1.56), mat_stone_dark)
		_box(col_grp, "ParthenonColPlinth_%d" % ci, Vector3(0.0, 0.44, 0.0), Vector3(1.32, 0.24, 1.32), mat_stone_mid)
		_cyl(col_grp, "ColBaseTorusLow_%d" % ci, Vector3(0.0, 0.64, 0.0), 0.60, 0.64, 0.18, mat_stone_noble, 16)
		_cyl(col_grp, "ColBaseTorusTop_%d" % ci, Vector3(0.0, 0.80, 0.0), 0.53, 0.58, 0.14, mat_stone_mid, 16)

		# Fuste acanalado en 4 tambores con ligera éntasis (r=0.49 abajo -> 0.43 arriba) y estrías facetadas
		var shaft := _cyl(col_grp, "ParthenonColShaft_%d" % ci, Vector3(0.0, 0.86 + (col_height - 1.72) * 0.5, 0.0), 0.43, 0.50, col_height - 1.72, mat_stone_noble, 16)
		# 8 nervaduras verticales discretas simulando acanalado dórico real
		for fl_i in range(8):
			var fang := (float(fl_i) / 8.0) * TAU
			var rib := _box(col_grp, "ColFluteRib_%d_%d" % [ci, fl_i], Vector3(cos(fang) * 0.45, 0.86 + (col_height - 1.72) * 0.5, sin(fang) * 0.45), Vector3(0.075, col_height - 1.85, 0.075), mat_stone_mid, false)
			rib.rotation.y = -fang

		# Anillos sutiles de junta entre tambores + astrágalo con motivo dracónico en bronce
		for ring_y in [2.35, 4.15, 5.95]:
			_cyl(col_grp, "ParthenonColCollar_%d_%d" % [ci, int(ring_y * 10.0)], Vector3(0.0, ring_y, 0.0), 0.50, 0.51, 0.12, mat_stone_mid, 16)
		_cyl(col_grp, "ColNeckBand_%d" % ci, Vector3(0.0, col_height - 0.96, 0.0), 0.48, 0.46, 0.12, mat_bronze, 16)

		# Capitel tallado monumental: collarino + equino acampanado + volutas/alas dracónicas estilizadas + ábaco doble
		_cyl(col_grp, "ColEchinus_%d" % ci, Vector3(0.0, col_height - 0.70, 0.0), 0.68, 0.46, 0.42, mat_stone_noble, 16)
		# Motivos alados discretos en las 4 caras del capitel (identidad Bahamut)
		for wing_side in [Vector3(0.58, 0.0, 0.0), Vector3(-0.58, 0.0, 0.0), Vector3(0.0, 0.0, 0.58), Vector3(0.0, 0.0, -0.58)]:
			var is_x := absf(wing_side.x) > 0.1
			var wsz := Vector3(0.14, 0.24, 0.72) if is_x else Vector3(0.72, 0.24, 0.14)
			_box(col_grp, "ColCapitalMotif", Vector3(wing_side.x, col_height - 0.62, wing_side.z), wsz, mat_stone_mid, false)
		_box(col_grp, "ParthenonColAbacusLow_%d" % ci, Vector3(0.0, col_height - 0.36, 0.0), Vector3(1.38, 0.24, 1.38), mat_stone_noble)
		_box(col_grp, "ParthenonColAbacus_%d" % ci, Vector3(0.0, col_height - 0.14, 0.0), Vector3(1.52, 0.28, 1.52), mat_stone_mid)

		# Aplique de antorcha ceremonial de bronce y hierro orientado al interior del santuario
		var inward_x := 0.56 if cp.x < 40.5 else -0.56
		_box(col_grp, "PillarSconceMount_%d" % ci, Vector3(inward_x, 3.20, 0.0), Vector3(0.18, 0.44, 0.22), mat_iron, false)
		_box(col_grp, "PillarSconceArm_%d" % ci, Vector3(inward_x * 1.18, 3.30, 0.0), Vector3(0.28, 0.08, 0.08), mat_bronze, false)
		_cyl(col_grp, "PillarSconceCup_%d" % ci, Vector3(inward_x * 1.36, 3.44, 0.0), 0.13, 0.09, 0.16, mat_bronze, 10, false)
		var p_flm := _cyl(col_grp, "PillarSconceFlame_%d" % ci, Vector3(inward_x * 1.36, 3.66, 0.0), 0.04, 0.10, 0.28, mat_flame, 8, false)
		p_flm.add_to_group("night_flame")
		var p_lt := OmniLight3D.new()
		p_lt.name = "ParthenonPillarLight_%d" % ci
		p_lt.position = Vector3(inward_x * 1.65, 4.05, 0.0)
		p_lt.light_color = Color(1.0, 0.72, 0.36)
		p_lt.light_energy = 1.65
		p_lt.omni_range = 11.5
		col_grp.add_child(p_lt)
		builder.call("register_flame_fx", p_flm, p_lt, false)

		SceneEnhancer.add_cyl_collider(parthenon, cp + Vector3(0.0, 1.6, 0.0), 0.68, 3.2)
		SceneEnhancer.tag_camera_occluder(shaft)

	# --------------------------------------------------------------------------
	# 2.2 MURO TRASERO NORTE CON MARCO ARQUITECTÓNICO Y HORNACINA SAGRADA
	#     Situado limpiamente en z_rear=63.48 (delante del talud A5__Basalt_Carved_Matte
	#     en z=63.3) para enmarcar la roca viva en la gran hornacina central sin quedar
	#     tapado por el muro natural ni obstruir el paso interior!
	# --------------------------------------------------------------------------
	var rear_wall := Node3D.new()
	rear_wall.name = "TempleRearSanctuaryWall"
	parthenon.add_child(rear_wall)
	var z_rear := 63.48
	# Zócalo corrido de piedra noble (y=27.0..28.05) + imposta + remate alto enmarcando la roca natural
	_box(rear_wall, "RearWallDado", Vector3(40.5, y + 0.48, z_rear), Vector3(14.6, 0.96, 0.56), mat_stone_mid)
	_box(rear_wall, "RearWallDadoCap", Vector3(40.5, y + 1.00, z_rear + 0.06), Vector3(14.8, 0.14, 0.68), mat_stone_noble)
	# Pilastras laterales adosadas junto a las columnas NO/NE + pilastras interiores enmarcando la hornacina sagrada
	for side_x_v in [-1.0, 1.0]:
		var side_x := float(side_x_v)
		var outer_pil_x := 40.5 + side_x * 6.95
		_box(rear_wall, "RearOuterPilaster_%s" % ("W" if side_x < 0.0 else "E"), Vector3(outer_pil_x, y + 3.80, z_rear + 0.02), Vector3(0.84, 5.75, 0.56), mat_stone_mid)
		_box(rear_wall, "RearOuterPilasterCap_%s" % ("W" if side_x < 0.0 else "E"), Vector3(outer_pil_x, y + 6.72, z_rear + 0.08), Vector3(1.02, 0.26, 0.68), mat_stone_noble)
		# Imposta horizontal intermedia sobre la pared de roca tallada
		var wing_x := 40.5 + side_x * 5.05
		_box(rear_wall, "RearWallString_%s" % ("W" if side_x < 0.0 else "E"), Vector3(wing_x, y + 3.65, z_rear + 0.04), Vector3(3.15, 0.20, 0.36), mat_stone_noble)
		_box(rear_wall, "RearWallUpperFrieze_%s" % ("W" if side_x < 0.0 else "E"), Vector3(wing_x, y + 6.45, z_rear + 0.02), Vector3(3.30, 0.44, 0.44), mat_stone_mid)
		# Pilastra monumental flanqueando la gran hornacina central de Bahamut (x=37.45 y 43.55)
		var pil_x := 40.5 + side_x * 3.15
		_box(rear_wall, "RearNichePilaster_%s" % ("W" if side_x < 0.0 else "E"), Vector3(pil_x, y + 3.85, z_rear + 0.14), Vector3(0.68, 5.65, 0.54), mat_stone_noble)
		_box(rear_wall, "RearNichePilasterBase_%s" % ("W" if side_x < 0.0 else "E"), Vector3(pil_x, y + 1.24, z_rear + 0.18), Vector3(0.84, 0.34, 0.64), mat_stone_dark)
		_box(rear_wall, "RearNichePilasterCap_%s" % ("W" if side_x < 0.0 else "E"), Vector3(pil_x, y + 6.66, z_rear + 0.20), Vector3(0.88, 0.28, 0.68), mat_stone_noble)
	# Dintel y cornisa coronando la hornacina sagrada central + estela tallada visible detrás de Bahamut
	_box(rear_wall, "RearNicheLintel", Vector3(40.5, y + 6.96, z_rear + 0.14), Vector3(7.30, 0.50, 0.72), mat_stone_noble)
	_box(rear_wall, "RearNicheCornice", Vector3(40.5, y + 7.30, z_rear + 0.22), Vector3(7.65, 0.22, 0.86), mat_stone_mid)
	# Estela arquitectónica tallada detrás de la estatua de Bahamut (destaca la silueta y la jerarquía sagrada)
	_box(rear_wall, "RearNicheSteleFrame", Vector3(40.5, y + 3.75, z_rear + 0.02), Vector3(3.15, 4.95, 0.22), mat_stone_mid, false)
	_box(rear_wall, "RearNicheSteleInner", Vector3(40.5, y + 3.75, z_rear + 0.12), Vector3(2.58, 4.35, 0.14), mat_stone_noble, false)
	_box(rear_wall, "RearNicheSteleArchCap", Vector3(40.5, y + 6.32, z_rear + 0.14), Vector3(3.45, 0.26, 0.34), mat_stone_noble, false)
	# Motivo discreto del Dragón de Platino en la clave alta de la estela (sin emisión exagerada)
	var niche_crest := Node3D.new()
	niche_crest.name = "RearNichePlatinumCrest"
	niche_crest.position = Vector3(40.5, y + 5.18, z_rear + 0.26)
	rear_wall.add_child(niche_crest)
	var diamond := _box(niche_crest, "CrestShield", Vector3.ZERO, Vector3(0.72, 0.72, 0.10), mat_platinum_relief, false)
	diamond.rotation.z = PI * 0.25
	for ws_v in [-1.0, 1.0]:
		var ws := float(ws_v)
		var wing_a := _box(niche_crest, "CrestWingA_%d" % int(ws), Vector3(ws * 0.78, 0.14, 0.02), Vector3(1.02, 0.16, 0.08), mat_platinum_relief, false)
		wing_a.rotation.z = ws * 0.26
		var wing_b := _box(niche_crest, "CrestWingB_%d" % int(ws), Vector3(ws * 0.66, -0.08, 0.02), Vector3(0.76, 0.12, 0.07), mat_gold_muted, false)
		wing_b.rotation.z = ws * 0.12

	# --------------------------------------------------------------------------
	# 2.3 GRUPO DE CUBIERTA INDEPENDIENTE PARA CUTAWAY (TempleRoofCutawayGroup)
	#     Al entrar un jugador en A5, SOLO se oculta este nodo: columnas,
	#     muro trasero, hornacina, braseros, altar y estatua siguen 100% visibles!
	# --------------------------------------------------------------------------
	var roof_grp := Node3D.new()
	roof_grp.name = "TempleRoofCutawayGroup"
	parthenon.add_child(roof_grp)

	# Entablamento clásico en piedra noble (arquitrabe + friso con triglifos + cornisa saliente)
	for cz_beam in [62.55, 76.45]:
		var sgn_z := -1.0 if cz_beam < 69.5 else 1.0
		_box(roof_grp, "ArchitraveNS_%d" % int(cz_beam), Vector3(40.5, col_top_y + 0.34, cz_beam), Vector3(18.0, 0.68, 1.18), mat_stone_noble)
		_box(roof_grp, "FriezeNS_%d" % int(cz_beam), Vector3(40.5, col_top_y + 0.90, cz_beam), Vector3(17.9, 0.48, 1.12), mat_stone_mid)
		_box(roof_grp, "CorniceNS_%d" % int(cz_beam), Vector3(40.5, col_top_y + 1.28, cz_beam), Vector3(18.9, 0.30, 1.62), mat_stone_noble)
		for tx in range(9):
			var tri_x := lerpf(32.4, 48.6, float(tx) / 8.0)
			_box(roof_grp, "TriglyphNS_%d_%d" % [int(cz_beam), tx], Vector3(tri_x, col_top_y + 0.90, cz_beam + sgn_z * 0.60), Vector3(0.46, 0.44, 0.14), mat_stone_dark, false)
	for cx_beam in [32.3, 48.7]:
		var sgn_x := -1.0 if cx_beam < 40.5 else 1.0
		_box(roof_grp, "ArchitraveEW_%d" % int(cx_beam), Vector3(cx_beam, col_top_y + 0.34, 69.5), Vector3(1.18, 0.68, 15.2), mat_stone_noble)
		_box(roof_grp, "FriezeEW_%d" % int(cx_beam), Vector3(cx_beam, col_top_y + 0.90, 69.5), Vector3(1.12, 0.48, 15.1), mat_stone_mid)
		_box(roof_grp, "CorniceEW_%d" % int(cx_beam), Vector3(cx_beam, col_top_y + 1.28, 69.5), Vector3(1.62, 0.30, 16.0), mat_stone_noble)
		for tz in range(7):
			var tri_z := lerpf(63.2, 75.8, float(tz) / 6.0)
			_box(roof_grp, "TriglyphEW_%d_%d" % [int(cx_beam), tz], Vector3(cx_beam + sgn_x * 0.60, col_top_y + 0.90, tri_z), Vector3(0.14, 0.44, 0.46), mat_stone_dark, false)

	# Vigas transversales de artesonado de roble oscuro visibles desde el interior/escorzo
	for bx_t in [35.0, 37.8, 40.5, 43.2, 46.0]:
		_box(roof_grp, "TempleTieBeam_%d" % int(bx_t * 10.0), Vector3(float(bx_t), col_top_y + 0.92, 69.5), Vector3(0.32, 0.38, 14.2), mat_timber)

	# --------------------------------------------------------------------------
	# 2.4 FRONTÓN PÉTREO TRIANGULAR REAL + RELIEVE DEL DRAGÓN DE PLATINO (ESTE Y OESTE)
	#     Reemplaza el disco amarillo brillante (PedimentSunburst) y evita
	#     cualquier intersección con los faldones de la cubierta!
	# --------------------------------------------------------------------------
	var ped_base_y := col_top_y + 1.42 # 36.02m
	var roof_half_z := 8.65 # Alero amplio protegiendo las columnas (z=60.85..78.15)
	var gable_half_z := 7.65
	var slope_angle := 0.315 # ~18° (clásico, monumental, armonioso)
	var ridge_rise := gable_half_z * tan(slope_angle) # ~2.49m -> cumbrera en y=38.51m
	var ridge_y := ped_base_y + ridge_rise

	var tympanum_mesh := _make_pediment_triangle_mesh(gable_half_z * 2.0, ridge_rise, 0.72)
	var mat_tympanum := create_temple_stone_material(builder, Color("#ccc5b4"), 0.78, "limestone-v3.webp", 0.38, 0.42, 0.02)
	mat_tympanum.cull_mode = BaseMaterial3D.CULL_DISABLED
	for ped_cfg in [[32.3, -1.0, "West"], [48.7, 1.0, "East"]]:
		var px: float = float(ped_cfg[0])
		var sgn_x: float = float(ped_cfg[1])
		var ptag: String = str(ped_cfg[2])
		# Tímpano triangular macizo en piedra tallada (doble cara garantizada en Este y Oeste)
		var tymp := MeshInstance3D.new()
		tymp.name = "TempleTympanum_%s" % ptag
		tymp.mesh = tympanum_mesh
		tymp.material_override = mat_tympanum
		tymp.position = Vector3(px + sgn_x * 0.04, ped_base_y, 69.5)
		tymp.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		roof_grp.add_child(tymp)

		# Cornisas rampantes (geison) enmarcando el frontón limpiamente por debajo del tablero de cubierta
		var raking_len := sqrt(gable_half_z * gable_half_z + ridge_rise * ridge_rise) + 0.55
		for sz_sv in [-1.0, 1.0]:
			var sz_s := float(sz_sv)
			var r_mid_z := 69.5 + sz_s * (gable_half_z * 0.5)
			var r_mid_y := ridge_y - (gable_half_z * 0.5) * tan(slope_angle) + 0.08
			var rc := _box(roof_grp, "PedimentRakingCornice_%s_%s" % [ptag, "N" if sz_s < 0.0 else "S"], Vector3(px + sgn_x * 0.24, r_mid_y, r_mid_z), Vector3(0.76, 0.28, raking_len), mat_stone_noble)
			rc.rotation.x = sz_s * slope_angle
		# Moldura horizontal inferior del tímpano
		_box(roof_grp, "PedimentSill_%s" % ptag, Vector3(px + sgn_x * 0.30, ped_base_y + 0.08, 69.5), Vector3(0.42, 0.20, gable_half_z * 2.0 + 0.20), mat_stone_noble)

		# Relieve escultórico integrado del Dragón de Platino (Bahamut) en piedra noble y platino discreto
		var emb := Node3D.new()
		emb.name = "PedimentBahamutEmblem_%s" % ptag
		emb.position = Vector3(px + sgn_x * 0.36, ped_base_y + 1.02, 69.5)
		roof_grp.add_child(emb)

		# Medallón octogonal tallado en piedra (marco arquitectónico sin glow artificial)
		var ring_stone := _cyl(emb, "EmblemStoneRing", Vector3.ZERO, 0.80, 0.84, 0.16, mat_stone_noble, 8, false)
		ring_stone.rotation.z = PI * 0.5
		var ring_inner := _cyl(emb, "EmblemInnerBacking", Vector3(sgn_x * 0.04, 0.0, 0.0), 0.64, 0.64, 0.14, mat_stone_dark, 8, false)
		ring_inner.rotation.z = PI * 0.5
		# Silueta esculpida en bajorrelieve: escudo + cabeza/cuello erguido + 2 pares de alas extendidas en platino y latón sobrio
		var shield := _box(emb, "DragonCrestCore", Vector3(sgn_x * 0.10, 0.0, 0.0), Vector3(0.10, 0.72, 0.72), mat_platinum_relief, false)
		shield.rotation.x = PI * 0.25
		_box(emb, "DragonNeck", Vector3(sgn_x * 0.14, 0.14, 0.0), Vector3(0.10, 0.58, 0.22), mat_platinum_relief, false)
		var head_b := _box(emb, "DragonHead", Vector3(sgn_x * 0.16, 0.44, 0.04), Vector3(0.10, 0.22, 0.32), mat_platinum_relief, false)
		head_b.rotation.x = -0.22
		for w_side_v in [-1.0, 1.0]:
			var w_side := float(w_side_v)
			# Alas principales desplegadas siguiendo la pendiente del frontón (0% intersección con el techo!)
			var w1 := _box(emb, "DragonWingUpper_%d" % int(w_side), Vector3(sgn_x * 0.11, 0.14, w_side * 1.48), Vector3(0.12, 0.26, 2.05), mat_platinum_relief, false)
			w1.rotation.x = w_side * 0.28
			var w2 := _box(emb, "DragonWingMid_%d" % int(w_side), Vector3(sgn_x * 0.10, -0.14, w_side * 1.75), Vector3(0.10, 0.20, 2.55), mat_stone_noble, false)
			w2.rotation.x = w_side * 0.16
			var w3 := _box(emb, "DragonWingTip_%d" % int(w_side), Vector3(sgn_x * 0.10, -0.40, w_side * 2.15), Vector3(0.09, 0.15, 2.75), mat_gold_muted, false)
			w3.rotation.x = w_side * 0.06
			# Estrellas discretas en los ángulos del tímpano
			var star := _box(emb, "PedimentStar_%d" % int(w_side), Vector3(sgn_x * 0.09, -0.42, w_side * 4.35), Vector3(0.08, 0.32, 0.32), mat_platinum_relief, false)
			star.rotation.x = PI * 0.25

	# --------------------------------------------------------------------------
	# 2.5 CUBIERTA ESCALONADA DE TEJAS DE PIZARRA/PIEDRA, ALEROS, PARES Y CUMBRERA
	# --------------------------------------------------------------------------
	var roof_span_x := 19.6 # Aleros generosos E/O protegiendo los frontones
	var slope_len := sqrt(roof_half_z * roof_half_z + (roof_half_z * tan(slope_angle)) * (roof_half_z * tan(slope_angle)))
	var tile_courses := 9
	var course_depth := (slope_len / float(tile_courses)) * 1.20

	var tile_xfs_a: Array[Transform3D] = []
	var tile_xfs_b: Array[Transform3D] = []
	var rib_xfs: Array[Transform3D] = []
	var rafter_xfs: Array[Transform3D] = []

	for side_z in [-1.0, 1.0]:
		var sgn := float(side_z)
		var stag := "N" if sgn < 0.0 else "S"
		var mid_dist := roof_half_z * 0.50
		var mid_y := ridge_y - mid_dist * tan(slope_angle)
		var mid_z := 69.5 + sgn * mid_dist

		# Tablero estructural base bajo las tejas (evita rendijas de luz desde abajo)
		var deck := _box(roof_grp, "ParthenonRoofDeck_%s" % stag, Vector3(40.5, mid_y + 0.02, mid_z), Vector3(roof_span_x - 0.18, 0.18, slope_len), mat_timber)
		deck.rotation.x = sgn * slope_angle
		SceneEnhancer.tag_camera_occluder(deck)

		# 9 hiladas solapadas de losas de pizarra volcánica azul-gris con variación tonal sutil
		# (Basis.from_euler * Basis.from_scale aplica escala LOCAL antes de rotar -> cero cizallamiento!)
		for ci in range(tile_courses):
			var frac := (float(ci) + 0.5) / float(tile_courses)
			var c_dist := frac * roof_half_z
			var cy := ridge_y - c_dist * tan(slope_angle) + 0.20 + (0.015 if ci % 2 == 0 else 0.0)
			var cz := 69.5 + sgn * c_dist
			var c_bas := Basis.from_euler(Vector3(sgn * (slope_angle - 0.025), 0.0, 0.0)) * Basis.from_scale(Vector3(roof_span_x, 0.10, course_depth))
			if ci % 2 == 0:
				tile_xfs_a.append(Transform3D(c_bas, Vector3(40.5, cy, cz)))
			else:
				tile_xfs_b.append(Transform3D(c_bas, Vector3(40.5, cy, cz)))

		# 11 imbrices / tapajuntas longitudinales discretos de pizarra-caliza (sin efecto chapa metálica)
		for ri in range(11):
			var rx := lerpf(31.2, 49.8, float(ri) / 10.0)
			var r_bas := Basis.from_euler(Vector3(sgn * slope_angle, 0.0, 0.0)) * Basis.from_scale(Vector3(0.15, 0.09, slope_len + 0.04))
			rib_xfs.append(Transform3D(r_bas, Vector3(rx, mid_y + 0.24, mid_z)))

		# 13 pares / canecillos de madera oscura visibles bajo el alero saliente
		for rfi in range(13):
			var rfx := lerpf(31.4, 49.6, float(rfi) / 12.0)
			var rf_bas := Basis.from_euler(Vector3(sgn * slope_angle, 0.0, 0.0)) * Basis.from_scale(Vector3(0.18, 0.22, slope_len + 0.22))
			rafter_xfs.append(Transform3D(rf_bas, Vector3(rfx, mid_y - 0.14, mid_z)))

		# Cornisa/fascia de alero con antefijas pétreas discretas
		var eave_z := 69.5 + sgn * (roof_half_z + 0.02)
		var eave_y := ridge_y - roof_half_z * tan(slope_angle) + 0.10
		_box(roof_grp, "TempleEaveFascia_%s" % stag, Vector3(40.5, eave_y, eave_z), Vector3(roof_span_x + 0.16, 0.26, 0.22), mat_stone_noble)

	var bm_unit := BoxMesh.new()
	bm_unit.size = Vector3.ONE
	var empty_roof_cols: Array[Color] = []
	var mm_ta: MultiMeshInstance3D = builder.call("_make_multimesh_batch", "MM_TempleSlateTilesA", bm_unit, mat_slate_a, tile_xfs_a, empty_roof_cols)
	mm_ta.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	roof_grp.add_child(mm_ta)
	var mm_tb: MultiMeshInstance3D = builder.call("_make_multimesh_batch", "MM_TempleSlateTilesB", bm_unit, mat_slate_b, tile_xfs_b, empty_roof_cols)
	mm_tb.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	roof_grp.add_child(mm_tb)
	var mm_ribs: MultiMeshInstance3D = builder.call("_make_multimesh_batch", "MM_TempleRoofImbrices", bm_unit, mat_slate_ridge, rib_xfs, empty_roof_cols)
	mm_ribs.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	roof_grp.add_child(mm_ribs)
	var mm_raf: MultiMeshInstance3D = builder.call("_make_multimesh_batch", "MM_TempleRoofRafters", bm_unit, mat_timber, rafter_xfs, empty_roof_cols)
	mm_raf.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	roof_grp.add_child(mm_raf)

	# Cumbrera monumental escalonada en piedra clara + remates acróteras esculpidos (reemplaza cilindros dorados simples)
	_box(roof_grp, "ParthenonRidgeBeam", Vector3(40.5, ridge_y + 0.24, 69.5), Vector3(roof_span_x + 0.34, 0.36, 0.78), mat_stone_noble)
	_box(roof_grp, "ParthenonRidgeCap", Vector3(40.5, ridge_y + 0.48, 69.5), Vector3(roof_span_x + 0.46, 0.18, 0.52), mat_slate_ridge)

	# Acróteras pétreas talladas (2 cimeras de cumbrera con cresta platino + 4 esquineras de alero)
	for ax in [31.2, 49.8]:
		var ac := Node3D.new()
		ac.name = "TempleRidgeAcroterion_%d" % int(ax)
		ac.position = Vector3(float(ax), ridge_y + 0.56, 69.5)
		roof_grp.add_child(ac)
		_box(ac, "Base", Vector3(0.0, 0.14, 0.0), Vector3(0.64, 0.28, 0.74), mat_stone_noble)
		var fan := _box(ac, "Crest", Vector3(0.0, 0.54, 0.0), Vector3(0.22, 0.58, 0.58), mat_stone_noble)
		fan.rotation.x = PI * 0.25
		var inlay := _box(ac, "PlatinumCore", Vector3(0.0, 0.54, 0.0), Vector3(0.28, 0.32, 0.32), mat_platinum_relief, false)
		inlay.rotation.x = PI * 0.25
	var eave_corner_y := ridge_y - roof_half_z * tan(slope_angle) + 0.24
	for cx_a in [31.1, 49.9]:
		for cz_a in [69.5 - roof_half_z, 69.5 + roof_half_z]:
			var ca := Node3D.new()
			ca.name = "TempleCornerAcroterion_%d_%d" % [int(cx_a), int(cz_a)]
			ca.position = Vector3(float(cx_a), eave_corner_y, float(cz_a))
			roof_grp.add_child(ca)
			_box(ca, "Plinth", Vector3(0.0, 0.14, 0.0), Vector3(0.52, 0.28, 0.52), mat_stone_noble)
			_box(ca, "Finial", Vector3(0.0, 0.42, 0.0), Vector3(0.28, 0.36, 0.28), mat_slate_ridge)

	return roof_grp

# Prisma triangular limpio para el tímpano del frontón
static func _make_pediment_triangle_mesh(span_z: float, ridge_h: float, thickness_x: float) -> ArrayMesh:
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
	# Cara -X (Oeste): normal hacia -X (sentido horario visto desde -X)
	st.set_uv(Vector2(0.0, 0.0)); st.add_vertex(a0)
	st.set_uv(Vector2(0.5, 1.0)); st.add_vertex(c0)
	st.set_uv(Vector2(1.0, 0.0)); st.add_vertex(b0)
	# Cara +X (Este): normal hacia +X (sentido horario visto desde +X)
	st.set_uv(Vector2(0.0, 0.0)); st.add_vertex(b1)
	st.set_uv(Vector2(0.5, 1.0)); st.add_vertex(c1)
	st.set_uv(Vector2(1.0, 0.0)); st.add_vertex(a1)
	# Base y caras inclinadas (winding hacia el exterior)
	for q in [[a0, b0, b1, a1], [a1, c1, c0, a0], [b0, c0, c1, b1]]:
		st.set_uv(Vector2(0.0, 0.0)); st.add_vertex(q[0])
		st.set_uv(Vector2(1.0, 0.0)); st.add_vertex(q[1])
		st.set_uv(Vector2(1.0, 1.0)); st.add_vertex(q[2])
		st.set_uv(Vector2(0.0, 0.0)); st.add_vertex(q[0])
		st.set_uv(Vector2(1.0, 1.0)); st.add_vertex(q[2])
		st.set_uv(Vector2(0.0, 1.0)); st.add_vertex(q[3])
	st.generate_normals()
	return st.commit()

# ==============================================================================
# FASE 3 — INTERIOR SAGRADO A5 (PAVIMENTO CEREMONIAL, ALTAR ESCALONADO,
#          BRASEROS ESCULPIDOS, OFRENDAS Y MOTAS AMBIENTALES)
# ==============================================================================
static func build_a5_sacred_interior(builder: Node3D, a5_node: Node3D, y: float) -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = 202611233

	var interior := Node3D.new()
	interior.name = "A5_SacredInterior"
	a5_node.add_child(interior)

	var mat_stone_pale := create_temple_stone_material(builder, Color("#d4ccb9"), 0.74, "limestone-v3.webp", 0.36, 0.34, 0.03)
	var mat_stone_inlay := create_temple_stone_material(builder, Color("#969ea6"), 0.72, "ashlar-v4.webp", 0.42, 0.36, 0.05)
	var mat_stone_border := create_temple_stone_material(builder, Color("#7d848b"), 0.78, "basalt-coastal-albedo-v1.webp", 0.38, 0.42, 0.04)
	var mat_carpet_blue := create_temple_stone_material(builder, Color("#355e8c"), 0.94, "linen-v4.webp", 0.75, 0.0, 0.0)
	var mat_carpet_trim := StandardMaterial3D.new()
	mat_carpet_trim.albedo_color = Color("#d8c284")
	mat_carpet_trim.roughness = 0.78
	mat_carpet_trim.metallic = 0.24
	var mat_ember_bed := StandardMaterial3D.new()
	mat_ember_bed.albedo_color = Color("#3a271f")
	mat_ember_bed.roughness = 0.92
	mat_ember_bed.emission_enabled = true
	mat_ember_bed.emission = Color("#b83c12")
	mat_ember_bed.emission_energy_multiplier = 0.42
	var mat_charcoal := StandardMaterial3D.new()
	mat_charcoal.albedo_color = Color("#241e1c")
	mat_charcoal.roughness = 0.96
	var mat_urn_laurel := StandardMaterial3D.new()
	mat_urn_laurel.albedo_color = Color("#4d663e")
	mat_urn_laurel.roughness = 0.86
	mat_urn_laurel.cull_mode = BaseMaterial3D.CULL_DISABLED
	var mat_platinum_trim := StandardMaterial3D.new()
	mat_platinum_trim.albedo_color = Color("#d4dae4")
	mat_platinum_trim.metallic = 0.62
	mat_platinum_trim.roughness = 0.32
	var mat_bronze: Material = builder.get("mat_bronze")
	var mat_gold: Material = builder.get("mat_gold")
	var mat_iron: Material = builder.get("mat_iron")
	var mat_flame: Material = builder.get("mat_flame")
	var mat_pottery: Material = builder.get("_mat_pottery_glb") if builder.get("_mat_pottery_glb") else builder.get("mat_cloth_warm")

	# --------------------------------------------------------------------------
	# 3.1 PAVIMENTO CEREMONIAL CON JERARQUÍA ESPACIAL (EJE DE ENTRADA + CENEFAS)
	#     Asentado a y+0.016..0.034m sin alterar navegación ni provocar z-fighting
	# --------------------------------------------------------------------------
	# Cenefa perimetral sobria de piedra azulada enmarcando el recinto sagrado (x=33.7..47.3, z=63.4..75.6)
	_box(interior, "SanctuaryBorderN", Vector3(40.5, y + 0.016, 63.55), Vector3(13.6, 0.022, 0.42), mat_stone_border, false)
	_box(interior, "SanctuaryBorderS", Vector3(40.5, y + 0.016, 75.45), Vector3(13.6, 0.022, 0.42), mat_stone_border, false)
	_box(interior, "SanctuaryBorderW", Vector3(33.90, y + 0.016, 69.50), Vector3(0.42, 0.022, 11.6), mat_stone_border, false)
	_box(interior, "SanctuaryBorderE_S", Vector3(47.10, y + 0.016, 72.30), Vector3(0.42, 0.022, 6.0), mat_stone_border, false)

	# Eje ceremonial desde la llegada de la escalinata este (x=48.8, z=66.0) girando al corazón del altar (40.5, 69.5)
	_box(interior, "CeremonialEntryThreshold", Vector3(48.35, y + 0.020, 66.0), Vector3(2.45, 0.028, 3.65), mat_stone_pale, false)
	_box(interior, "CeremonialAxisEast", Vector3(45.10, y + 0.018, 67.6), Vector3(4.30, 0.024, 2.30), mat_stone_pale, false)
	# Tapiz/corredor ceremonial sobrio azul-pizarra con ribete dorado frente al altar (eje de oración este-oeste)
	_box(interior, "CeremonialRunnerBorder", Vector3(44.65, y + 0.028, 69.50), Vector3(5.60, 0.016, 2.18), mat_carpet_trim, false)
	_box(interior, "CeremonialRunnerCloth", Vector3(44.65, y + 0.034, 69.50), Vector3(5.36, 0.014, 1.90), mat_carpet_blue, false)

	# Rosetón / octógono pavimentado sagrado bajo la estatua de Bahamut (radio 3.1m, centrado en 40.5, 69.5)
	_cyl(interior, "SanctuaryOctagonOuter", Vector3(40.5, y + 0.018, 69.5), 3.35, 3.42, 0.028, mat_stone_border, 8, false)
	_cyl(interior, "SanctuaryOctagonMid", Vector3(40.5, y + 0.025, 69.5), 2.98, 3.04, 0.024, mat_stone_pale, 8, false)
	_cyl(interior, "SanctuaryOctagonInlay", Vector3(40.5, y + 0.032, 69.5), 2.48, 2.52, 0.018, mat_stone_inlay, 8, false)
	# 8 líneas radiales de piedra pálida convergiendo hacia el altar
	for ri in range(4):
		var rad_bar := _box(interior, "SanctuaryRadial_%d" % ri, Vector3(40.5, y + 0.035, 69.5), Vector3(5.75, 0.012, 0.14), mat_stone_pale, false)
		rad_bar.rotation.y = float(ri) * (PI * 0.25)

	# --------------------------------------------------------------------------
	# 3.2 ESTRADO ESCALONADO Y MESA DE OFRENDAS PARA BAHAMUT (PRESERVA ESTATUA + [T])
	#     La estatua .glb (A5__Stone_Bahamut_Quiet_Limestone) está centrada en
	#     (40.5, 27.0, 69.5) con zócalo original ~2.0m x 2.0m. Lo arropamos con
	#     gradas anchas, molduras y altar votivo frontal sin enterrar ni tapar la talla!
	# --------------------------------------------------------------------------
	var dais := Node3D.new()
	dais.name = "BahamutSacredDais"
	dais.position = Vector3(40.5, y, 69.5)
	interior.add_child(dais)

	# Grada inferior octogonal (pisable/baja, h=0.14m) + grada moldurada arropando el plinto original
	_cyl(dais, "DaisStepLower", Vector3(0.0, 0.07, 0.0), 2.38, 2.48, 0.14, mat_stone_pale, 8)
	_cyl(dais, "DaisStepTrim", Vector3(0.0, 0.15, 0.0), 2.24, 2.30, 0.04, mat_stone_inlay, 8, false)
	# Esquinas talladas con relieves de platino rodeando el zócalo existente de la estatua (sin subir más de 0.34m)
	_box(dais, "DaisPlinthCollar", Vector3(0.0, 0.22, 0.0), Vector3(2.44, 0.18, 2.44), mat_stone_pale)
	_box(dais, "DaisPlinthPlatinumBand", Vector3(0.0, 0.32, 0.0), Vector3(2.48, 0.05, 2.48), mat_platinum_trim, false)
	for dc in [Vector2(-1.18, -1.18), Vector2(1.18, -1.18), Vector2(-1.18, 1.18), Vector2(1.18, 1.18)]:
		_box(dais, "DaisCornerPost_%d_%d" % [int(dc.x * 10.0), int(dc.y * 10.0)], Vector3(dc.x, 0.28, dc.y), Vector3(0.28, 0.34, 0.28), mat_stone_border)

	# 4 hendiduras cardinales (N/S/E/O) talladas en el pedestal de Bahamut para ofrendas de incienso (canon p. 11)
	for card in [
		["N", Vector3(0.0, 0.32, -1.24), Vector3(0.42, 0.10, 0.14), Vector3(0.0, 0.0, 0.0)],
		["S", Vector3(0.0, 0.32, 1.24), Vector3(0.42, 0.10, 0.14), Vector3(0.0, PI, 0.0)],
		["W", Vector3(-1.24, 0.32, 0.0), Vector3(0.14, 0.10, 0.42), Vector3(0.0, PI * 0.5, 0.0)],
		["E", Vector3(1.24, 0.32, 0.0), Vector3(0.14, 0.10, 0.42), Vector3(0.0, -PI * 0.5, 0.0)],
	]:
		var ctag: String = str(card[0])
		var cpos: Vector3 = card[1]
		var csz: Vector3 = card[2]
		_box(dais, "CardinalIncenseSlot_%s" % ctag, cpos, csz, mat_stone_border, false)
		_box(dais, "CardinalIncenseTray_%s" % ctag, cpos + Vector3(0.0, 0.045, 0.0), Vector3(csz.x * 0.72, 0.035, csz.z * 0.72), mat_bronze, false)
		var stick := _cyl(dais, "CardinalIncenseStick_%s" % ctag, cpos + Vector3(0.0, 0.11, 0.0), 0.010, 0.012, 0.14, mat_charcoal, 6, false)
		stick.rotation.z = 0.28 if ctag in ["N", "S"] else 0.0
		stick.rotation.x = 0.28 if ctag in ["W", "E"] else 0.0
		_cyl(dais, "CardinalIncenseEmber_%s" % ctag, cpos + Vector3(0.0, 0.17, 0.0), 0.014, 0.014, 0.022, mat_flame, 6, false)

	# Útiles de albañilería de Varnoth junto al zócalo norte-oeste del templo (encaja con su rutina retreat_masonry sin obstruir paso)
	var mason_kit := Node3D.new()
	mason_kit.name = "A5_VarnothMasonryKit"
	mason_kit.position = Vector3(35.05, y, 64.08)
	interior.add_child(mason_kit)
	_box(mason_kit, "DressedAshlarBlock", Vector3(0.0, 0.16, 0.0), Vector3(0.62, 0.32, 0.42), mat_stone_pale)
	_box(mason_kit, "MasonMalletHead", Vector3(-0.14, 0.36, 0.04), Vector3(0.16, 0.09, 0.09), mat_iron, false)
	_cyl(mason_kit, "MasonMalletHandle", Vector3(-0.04, 0.35, 0.04), 0.020, 0.022, 0.24, mat_bronze, 7, false).rotation.z = PI * 0.5
	_box(mason_kit, "MasonChisel", Vector3(0.14, 0.335, -0.05), Vector3(0.22, 0.025, 0.035), mat_iron, false)
	_cyl(mason_kit, "MortarBucket", Vector3(0.46, 0.16, 0.06), 0.14, 0.11, 0.32, mat_stone_border, 10)
	SceneEnhancer.add_box_collider(mason_kit, Vector3(0.16, 0.20, 0.0), Vector3(0.95, 0.40, 0.52))
	var mkip := SceneEnhancer._attach_interactive_prop(mason_kit, "table", "Sillar y herramientas de Varnoth", "[T] Examinar trabajo de albañilería", Vector3.ZERO, "n", "Bloque de caliza recién labrado, mazo y cincel: Varnoth restaura cada grieta que abre el salitre en el templo.")
	mkip.interact_radius = 2.25

	# Mesa/Ara de ofrendas situada delante del altar hacia la entrada este (x=42.85, z=69.5)
	var offering := Node3D.new()
	offering.name = "BahamutOfferingAltar"
	offering.position = Vector3(42.75, y, 69.5)
	interior.add_child(offering)
	_box(offering, "OfferingBase", Vector3(0.0, 0.10, 0.0), Vector3(0.92, 0.20, 1.72), mat_stone_border)
	_box(offering, "OfferingShaft", Vector3(0.0, 0.48, 0.0), Vector3(0.68, 0.62, 1.42), mat_stone_pale)
	_box(offering, "OfferingTableTop", Vector3(0.0, 0.84, 0.0), Vector3(0.98, 0.12, 1.78), mat_stone_pale)
	_box(offering, "OfferingPlatinumInlay", Vector3(0.0, 0.905, 0.0), Vector3(0.76, 0.02, 1.48), mat_platinum_trim, false)
	# Cuenco ceremonial de ofrendas + 2 candelabros votivos + pergamino sagrado
	var offering_bowl := _cyl(offering, "OfferingBowl", Vector3(0.0, 0.98, 0.0), 0.22, 0.13, 0.14, mat_bronze, 12, false)
	offering_bowl.add_to_group("retreat_routine_props")
	offering_bowl.add_to_group("dynamic_prop")
	_cyl(offering, "OfferingIncenseGlow", Vector3(0.0, 1.04, 0.0), 0.14, 0.14, 0.04, mat_flame, 10, false)
	for cz_v in [-0.62, 0.62]:
		_cyl(offering, "VotiveCandleBase_%d" % int(cz_v * 10.0), Vector3(-0.08, 0.96, float(cz_v)), 0.09, 0.12, 0.12, mat_bronze, 10, false)
		_cyl(offering, "VotiveCandleWax_%d" % int(cz_v * 10.0), Vector3(-0.08, 1.12, float(cz_v)), 0.045, 0.048, 0.22, mat_stone_pale, 8, false)
		var vfl := _cyl(offering, "VotiveCandleFlame_%d" % int(cz_v * 10.0), Vector3(-0.08, 1.28, float(cz_v)), 0.015, 0.045, 0.12, mat_flame, 7, false)
		vfl.add_to_group("night_flame")
		builder.call("register_flame_fx", vfl, null, false)
	SceneEnhancer.add_box_collider(offering, Vector3(0.0, 0.48, 0.0), Vector3(1.02, 0.96, 1.82))

	# Dos pebeteros/ánforas de ofrenda y bancos bajos de contemplación junto al borde sur/oeste (sin bloquear paso)
	for side_z_v in [-1.0, 1.0]:
		var side_z := float(side_z_v)
		var wz := 69.5 + side_z * 3.85
		var bench := Node3D.new()
		bench.name = "TempleContemplationBench_%s" % ("N" if side_z < 0.0 else "S")
		bench.position = Vector3(36.35, y, wz)
		interior.add_child(bench)
		_box(bench, "Seat", Vector3(0.0, 0.46, 0.0), Vector3(2.35, 0.14, 0.62), mat_stone_pale)
		_box(bench, "LegW", Vector3(-0.88, 0.21, 0.0), Vector3(0.32, 0.42, 0.54), mat_stone_border)
		_box(bench, "LegE", Vector3(0.88, 0.21, 0.0), Vector3(0.32, 0.42, 0.54), mat_stone_border)
		SceneEnhancer.add_box_collider(bench, Vector3(0.0, 0.28, 0.0), Vector3(2.40, 0.56, 0.66))
		var b_slots: Array[Vector3] = [Vector3(-0.55, 0.535, 0.0), Vector3(0.55, 0.535, 0.0)]
		SceneEnhancer._attach_seat_prop(bench, "bench", "Banco de oración", "[T] Sentarse a meditar", b_slots, Vector3(1.0, 0.0, 0.0), 0.24, "e", false, 2.4)

	# Ánforas votivas nobles de piedra y bronce con laurel discreto flanqueando la hornacina trasera (x=36.95 y 44.05, z=64.25)
	for urn_x in [36.95, 44.05]:
		var u_pos := Vector3(float(urn_x), y, 64.25)
		_box(interior, "VotiveUrnPlinth_%d" % int(urn_x * 10.0), u_pos + Vector3(0.0, 0.14, 0.0), Vector3(0.72, 0.28, 0.72), mat_stone_border)
		_cyl(interior, "VotiveUrnBody_%d" % int(urn_x * 10.0), u_pos + Vector3(0.0, 0.56, 0.0), 0.24, 0.18, 0.58, mat_stone_pale, 12)
		_cyl(interior, "VotiveUrnBand_%d" % int(urn_x * 10.0), u_pos + Vector3(0.0, 0.58, 0.0), 0.25, 0.24, 0.10, mat_bronze, 12, false)
		_cyl(interior, "VotiveUrnRim_%d" % int(urn_x * 10.0), u_pos + Vector3(0.0, 0.88, 0.0), 0.28, 0.22, 0.09, mat_bronze, 12, false)
		var laurel := MeshInstance3D.new()
		laurel.name = "VotiveUrnLaurel_%d" % int(urn_x * 10.0)
		laurel.mesh = SceneEnhancer.make_botanical_shrub_mesh()
		laurel.material_override = mat_urn_laurel
		laurel.position = u_pos + Vector3(0.0, 0.92, 0.0)
		laurel.scale = Vector3(0.65, 0.70, 0.65)
		laurel.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		interior.add_child(laurel)
		SceneEnhancer.add_cyl_collider(interior, u_pos + Vector3(0.0, 0.45, 0.0), 0.36, 0.92)

	# --------------------------------------------------------------------------
	# 3.3 CUATRO BRASEROS MONUMENTALES ESCULPIDOS EN PIEDRA Y BRONCE (EN LAS 4 ESQUINAS)
	#     Preservan posiciones y nombre TempleBrazier_0..3 + interacción [T]
	# --------------------------------------------------------------------------
	var brazier_pts := [
		Vector3(34.2, y, 64.4), Vector3(46.8, y, 64.4),
		Vector3(34.2, y, 74.7), Vector3(46.8, y, 74.7),
	]
	for bi in range(brazier_pts.size()):
		var bp: Vector3 = brazier_pts[bi]
		var br := Node3D.new()
		br.name = "TempleBrazier_%d" % bi
		br.position = bp
		a5_node.add_child(br)
		# Pedestal octogonal de piedra tallada + trípode de hierro/bronce + gran cuenco con aro hueco y brasas vivas
		_box(br, "BrazierPlinth", Vector3(0.0, 0.11, 0.0), Vector3(0.92, 0.22, 0.92), mat_stone_border)
		_cyl(br, "BrazierBase", Vector3(0.0, 0.32, 0.0), 0.34, 0.42, 0.22, mat_stone_pale, 8)
		_cyl(br, "BrazierStem", Vector3(0.0, 0.68, 0.0), 0.17, 0.23, 0.52, mat_stone_border, 8)
		for leg_i in range(4):
			var lang := float(leg_i) * (PI * 0.5) + PI * 0.25
			var lg := _box(br, "BrazierRib_%d" % leg_i, Vector3(cos(lang) * 0.24, 0.80, sin(lang) * 0.24), Vector3(0.06, 0.56, 0.06), mat_bronze, false)
			lg.rotation = Vector3(-sin(lang) * 0.24, 0.0, cos(lang) * 0.24)
		_cyl(br, "BrazierBowl", Vector3(0.0, 1.05, 0.0), 0.46, 0.25, 0.26, mat_bronze, 12)
		# Aro toroidal hueco en el labio superior (evita disco plano oscuro sobre las brasas!)
		var rim_t := MeshInstance3D.new()
		rim_t.name = "BrazierRimTorus"
		var tm := TorusMesh.new()
		tm.inner_radius = 0.41
		tm.outer_radius = 0.49
		tm.rings = 16
		tm.ring_segments = 8
		rim_t.mesh = tm
		rim_t.material_override = mat_bronze
		rim_t.position = Vector3(0.0, 1.18, 0.0)
		br.add_child(rim_t)
		# Lecho hundido de carbón y brasas tenues (día y noche) + fragmentos de carbón + llama ceremonial nocturna
		_cyl(br, "BrazierCoalBed", Vector3(0.0, 1.13, 0.0), 0.37, 0.34, 0.07, mat_ember_bed, 12, false)
		for ck_i in range(4):
			var cka := float(ck_i) * (PI * 0.5) + float(bi) * 0.45
			var c_lump := _box(br, "BrazierCharcoal_%d" % ck_i, Vector3(cos(cka) * 0.14, 1.18, sin(cka) * 0.14), Vector3(0.11, 0.06, 0.09), mat_charcoal, false)
			c_lump.rotation = Vector3(0.22, cka, 0.18)
		var f_core := _cyl(br, "BrazierFlame", Vector3(0.0, 1.40, 0.0), 0.04, 0.18, 0.42, mat_flame, 8, false)
		f_core.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		var bl := OmniLight3D.new()
		bl.position = Vector3(0.0, 1.75, 0.0)
		bl.light_color = Color(1.0, 0.68, 0.28)
		bl.light_energy = 1.85
		bl.omni_range = 12.5
		br.add_child(bl)
		builder.call("register_flame_fx", f_core, bl, false)
		SceneEnhancer.add_cyl_collider(br, Vector3(0.0, 0.68, 0.0), 0.48, 1.36)
		SceneEnhancer.tag_camera_occluder(br)
		SceneEnhancer._attach_interactive_prop(br, "fire", "Brasero de Bahamut", "[T] Avivar brasero sagrado", Vector3.ZERO, "n", "Las brasas sagradas del templo de Bahamut cobran un resplandor dorado.")

	# Luz focal sagrada cálida-dorada resaltando la estatua y el altar (siempre activa como foco del santuario)
	var altar_spot := OmniLight3D.new()
	altar_spot.name = "BahamutAltarWarmGlow"
	altar_spot.position = Vector3(41.2, y + 3.6, 69.8)
	altar_spot.light_color = Color(1.0, 0.84, 0.54)
	altar_spot.light_energy = 2.25
	altar_spot.omni_range = 15.0
	interior.add_child(altar_spot)

	# --------------------------------------------------------------------------
	# 3.4 MOTAS AMBIENTALES DISCRETAS EN SUSPENSIÓN DENTRO DEL SANTUARIO
	# --------------------------------------------------------------------------
	var dust := GPUParticles3D.new()
	dust.name = "TempleSanctuaryDustMotes"
	dust.position = Vector3(40.5, y + 2.6, 69.5)
	dust.amount = 28
	dust.lifetime = 5.5
	dust.preprocess = 2.5
	var pm := ParticleProcessMaterial.new()
	pm.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_BOX
	pm.emission_box_extents = Vector3(5.8, 2.2, 4.8)
	pm.direction = Vector3(0.0, 1.0, 0.0)
	pm.spread = 35.0
	pm.initial_velocity_min = 0.04
	pm.initial_velocity_max = 0.14
	pm.gravity = Vector3(0.0, 0.015, 0.0)
	pm.scale_min = 0.045
	pm.scale_max = 0.095
	pm.color = Color(1.0, 0.90, 0.64, 0.42)
	dust.process_material = pm
	var mote_mesh := QuadMesh.new()
	mote_mesh.size = Vector2(0.11, 0.11)
	var mote_mat := StandardMaterial3D.new()
	mote_mat.albedo_color = Color(1.0, 0.92, 0.68, 0.44)
	mote_mat.emission_enabled = true
	mote_mat.emission = Color(1.0, 0.86, 0.52)
	mote_mat.emission_energy_multiplier = 0.75
	mote_mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mote_mat.billboard_mode = BaseMaterial3D.BILLBOARD_ENABLED
	mote_mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mote_mesh.material = mote_mat
	dust.draw_pass_1 = mote_mesh
	dust.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	interior.add_child(dust)

# ==============================================================================
# FASE 4 — COSTA Z1/Z2: ARRECIFES ESCALONADOS, UNIÓN ROCA-MAR Y APOYO BAJO Z2
#          Rompe el borde recto sumergido en Z1/Z2 y envuelve las losas/contrafuertes
#          del escarpe costero con estratos volcánicos continuos hasta el fondo marino.
# ==============================================================================
static func build_z1_z2_coastal_toe_and_reefs(builder: Node3D, parent: Node3D) -> void:
	var coast_root := Node3D.new()
	coast_root.name = "Z1Z2_CoastalGeologicalReefs"
	parent.add_child(coast_root)

	var mat_rock_dry := create_unified_rock_vcol_material(builder, 0.87, 0.70)
	var mat_rock_wet := create_unified_rock_vcol_material(builder, 0.56, 0.72)
	mat_rock_wet.albedo_color = Color.WHITE
	var block_a := make_faceted_cliff_block_mesh(1423, 4)
	var block_b := make_faceted_cliff_block_mesh(1579, 5)
	var block_c := make_faceted_cliff_block_mesh(1733, 4)

	var rng := RandomNumberGenerator.new()
	rng.seed = 202611234

	# 1. Arrecifes sumergidos y bancadas irregulares a ras de marea a lo largo de x=29..76, z=104..116
	#    Ocultan y rompen por completo la arista recta sumergida del frente costero Z1/Z2 (captura 12)
	var reef_xf: Array[Transform3D] = []
	var reef_col: Array[Color] = []
	var reef_tones: Array[Color] = [
		Color("#9ba7a8"), Color("#8e9a9d"), Color("#aab4b2"), Color("#849194")
	]
	var submerged_specs := [
		# Bancadas bajas sumergidas/semi-sumergidas que sobresalen orgánicamente hacia el mar (z=110.5..116.8)
		[Vector3(31.8, -2.55, 113.4), Vector3(7.2, 2.35, 6.4), Vector3(4.0, 18.0, -3.0)],
		[Vector3(37.6, -2.50, 113.8), Vector3(8.4, 2.65, 7.2), Vector3(3.0, -22.0, -4.0)],
		[Vector3(43.8, -2.45, 112.4), Vector3(7.8, 2.85, 6.8), Vector3(5.0, 26.0, -3.0)],
		[Vector3(49.6, -2.50, 112.9), Vector3(8.6, 2.45, 7.4), Vector3(4.0, -14.0, -4.0)],
		[Vector3(55.4, -2.45, 111.6), Vector3(8.2, 2.75, 6.8), Vector3(3.0, 19.0, -3.0)],
		[Vector3(61.2, -2.50, 111.2), Vector3(8.6, 2.55, 7.0), Vector3(5.0, -25.0, -4.0)],
		[Vector3(67.0, -2.45, 110.8), Vector3(9.0, 2.85, 7.4), Vector3(4.0, 15.0, -3.0)],
		[Vector3(73.4, -2.55, 111.4), Vector3(8.4, 2.40, 6.8), Vector3(3.0, -18.0, -4.0)],
		# Escollos costeros emergentes que quiebran la espuma y dan profundidad geológica real
		[Vector3(34.6, -1.85, 112.8), Vector3(3.6, 2.45, 3.2), Vector3(6.0, 32.0, -5.0)],
		[Vector3(41.8, -1.85, 111.8), Vector3(4.2, 2.75, 3.6), Vector3(4.0, -28.0, -4.0)],
		[Vector3(47.2, -1.90, 113.6), Vector3(3.4, 2.25, 2.9), Vector3(5.0, 44.0, -3.0)],
		[Vector3(53.4, -1.85, 110.9), Vector3(4.6, 2.95, 3.8), Vector3(3.0, -16.0, -5.0)],
		[Vector3(59.6, -1.90, 111.6), Vector3(3.8, 2.35, 3.4), Vector3(6.0, 21.0, -4.0)],
		[Vector3(65.4, -1.80, 109.6), Vector3(5.2, 3.45, 4.4), Vector3(4.0, -34.0, -3.0)],
		[Vector3(70.8, -1.85, 110.2), Vector3(4.4, 2.85, 3.8), Vector3(5.0, 14.0, -5.0)],
		# Rampa sumergida suave hacia mar abierto (rompe el escalón azul-marino recto en primer plano)
		[Vector3(39.4, -3.10, 116.2), Vector3(10.5, 2.10, 6.2), Vector3(2.0, 11.0, -2.0)],
		[Vector3(51.8, -3.15, 115.6), Vector3(11.4, 2.15, 6.6), Vector3(2.0, -15.0, -2.0)],
		[Vector3(64.2, -3.10, 114.2), Vector3(10.8, 2.20, 6.4), Vector3(3.0, 17.0, -2.0)],
	]
	for s_i in range(submerged_specs.size()):
		var sp: Array = submerged_specs[s_i]
		var r_pos: Vector3 = sp[0]
		var r_sc: Vector3 = sp[1]
		var r_rot: Vector3 = sp[2]
		var r_bas := Basis.from_euler(Vector3(deg_to_rad(r_rot.x), deg_to_rad(r_rot.y), deg_to_rad(r_rot.z))) * Basis.from_scale(r_sc)
		reef_xf.append(Transform3D(r_bas, r_pos))
		reef_col.append(reef_tones[s_i % reef_tones.size()])

	var mm_reefs: MultiMeshInstance3D = builder.call("_make_multimesh_batch", "MM_Z1Z2SubmergedReefs", block_a, mat_rock_wet, reef_xf, reef_col)
	mm_reefs.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	coast_root.add_child(mm_reefs)

	# 2. Espolones secos integrados bajo el escarpe Z2 y el aterrizaje a A1 (x=61..73, z=98.5..109)
	#    Envuelve las dos losas planas tipo "tortita" del borde derecho de captura 12 y el bloque marrón bajo la llegada Z2->A1
	var dry_specs := [
		# Apoyo rocoso estratificado bajo los tramos Z2 (x=37..62, sin invadir los peldaños ni barandillas)
		[Vector3(40.2, -1.2, 109.8), Vector3(5.6, 3.1, 4.4), Vector3(4.0, 16.0, -4.0), 0],
		[Vector3(46.2, -1.2, 108.8), Vector3(6.2, 4.2, 4.8), Vector3(3.0, -19.0, -3.0), 1],
		[Vector3(52.4, -1.2, 107.6), Vector3(6.8, 5.4, 5.2), Vector3(5.0, 22.0, -4.0), 2],
		[Vector3(58.4, -1.2, 105.6), Vector3(7.2, 6.8, 5.6), Vector3(4.0, -14.0, -5.0), 0],
		# Macizo envolvente del saliente este de Z2 (cubre las losas planas y une Z2 con el acantilado de A1)
		[Vector3(64.8, -1.4, 105.4), Vector3(8.2, 6.2, 6.8), Vector3(5.0, 18.0, -4.0), 1],
		[Vector3(68.2, 1.2, 103.6), Vector3(7.4, 6.6, 6.0), Vector3(4.0, -24.0, -4.0), 2],
		[Vector3(66.8, 4.2, 101.6), Vector3(5.4, 4.4, 4.4), Vector3(3.0, 12.0, -3.0), 0],
		# Revestimiento pétreo que disimula el zócalo naranja bajo la llegada Z2->A1 (x=66.4, y=6..9, z=99.6..102.2)
		[Vector3(67.2, 5.2, 102.2), Vector3(4.2, 3.6, 3.4), Vector3(4.0, -16.0, -3.0), 1],
		[Vector3(71.4, -1.2, 105.8), Vector3(8.4, 8.8, 6.8), Vector3(5.0, 20.0, -5.0), 2],
	]
	for di in range(dry_specs.size()):
		var dsp: Array = dry_specs[di]
		var inst := MeshInstance3D.new()
		inst.name = "Z2CoastalStrataShoulder_%d" % di
		var midx := int(dsp[3])
		inst.mesh = block_a if midx == 0 else (block_b if midx == 1 else block_c)
		inst.material_override = mat_rock_dry
		inst.position = dsp[0]
		inst.rotation_degrees = dsp[2]
		inst.scale = dsp[1]
		inst.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		coast_root.add_child(inst)

	# Helechos y musgo costero en las juntas altas entre Z2 y el macizo rocoso (escala y frescura)
	var fern_xf: Array[Transform3D] = []
	var fern_col: Array[Color] = []
	var f_tones := [Color("#3b532c"), Color("#4c6438"), Color("#5a7144")]
	for fp in [
		Vector3(44.2, 2.6, 108.6), Vector3(51.8, 4.8, 106.8), Vector3(59.4, 6.1, 104.8),
		Vector3(64.6, 5.4, 105.2), Vector3(68.0, 7.6, 103.2), Vector3(70.4, 7.8, 104.8)
	]:
		for k in range(3):
			var fsc := rng.randf_range(0.55, 0.95)
			var fb := Basis.from_euler(Vector3(0.08, rng.randf_range(0.0, TAU), 0.0)) * Basis.from_scale(Vector3(fsc, fsc * 0.8, fsc))
			fern_xf.append(Transform3D(fb, fp + Vector3(rng.randf_range(-0.9, 0.9), rng.randf_range(-0.15, 0.2), rng.randf_range(-0.3, 0.4))))
			fern_col.append(f_tones[rng.randi() % f_tones.size()])
	var f_mat := StandardMaterial3D.new()
	f_mat.vertex_color_use_as_albedo = true
	f_mat.vertex_color_is_srgb = true
	f_mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	f_mat.roughness = 0.88
	var mm_cf: MultiMeshInstance3D = builder.call("_make_multimesh_batch", "MM_Z2CoastalCreviceFerns", SceneEnhancer.make_fern_cluster_mesh(), f_mat, fern_xf, fern_col)
	mm_cf.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	coast_root.add_child(mm_cf)

# ==============================================================================
# FASE 5 — JARDINES Z7 (TERRAZAS DE HIERBAS, JARDINES COLGANTES EN ACANTILADO Y
#          ACCESO AL TEMPLO) + BOSQUETE MEDITERRÁNEO DE LADERA
# ==============================================================================
static func build_z7_terraced_gardens(builder: Node3D, parent: Node3D) -> void:
	var z7_root := Node3D.new()
	z7_root.name = "Z7_TerracedSanctuaryGardens"
	parent.add_child(z7_root)

	var rng := RandomNumberGenerator.new()
	rng.seed = 202611235

	var mat_wall := create_temple_stone_material(builder, Color("#b6ae9b"), 0.84, "ashlar-v4.webp", 0.38, 0.44, 0.0)
	var mat_coping := create_temple_stone_material(builder, Color("#cfc7b4"), 0.78, "limestone-v3.webp", 0.40, 0.38, 0.02)
	var mat_soil := create_temple_stone_material(builder, Color("#564636"), 0.96, "earth.webp", 0.48, 0.28, 0.0)
	var mat_wood: Material = builder.get("mat_wood")
	var mat_wood_dark: Material = builder.get("mat_wood_dark")
	var mat_pottery: Material = builder.get("_mat_pottery_glb")
	if mat_pottery == null:
		mat_pottery = create_temple_stone_material(builder, Color("#b56c4a"), 0.78, "earth.webp", 0.60, 0.15, 0.0)
	var mat_water: Material = builder.get("mat_pool_water")

	var shrub_xf: Array[Transform3D] = []
	var shrub_col: Array[Color] = []
	var flower_xf: Array[Transform3D] = []
	var flower_col: Array[Color] = []
	var fern_xf: Array[Transform3D] = []
	var fern_col: Array[Color] = []
	var ivy_xf: Array[Transform3D] = []
	var trunk_xf: Array[Transform3D] = []
	var oak_xf: Array[Transform3D] = []
	var oak_col: Array[Color] = []
	var pine_xf: Array[Transform3D] = []
	var pine_col: Array[Color] = []

	var herb_greens: Array[Color] = [
		Color("#3f5935"), Color("#4e693f"), Color("#5d764b"), Color("#6d8259"), Color("#4b6142")
	]
	var lavender_pal: Array[Color] = [
		Color("#8d74c6"), Color("#a58dd6"), Color("#7c64b4"), Color("#d6ccf0")
	]
	var warm_bloom_pal: Array[Color] = [
		Color("#efe5c8"), Color("#e8c86a"), Color("#df9e74"), Color("#9a80ce")
	]
	var olive_greens: Array[Color] = [
		Color("#4a5f3b"), Color("#586d46"), Color("#637750"), Color("#3e5232")
	]
	var pine_greens: Array[Color] = [
		Color("#2b422d"), Color("#364e36"), Color("#40583c")
	]

	var populate_bed := func(center: Vector3, span_x: float, span_z: float, density: int, blooms: Array[Color], with_ivy_south: bool, ivy_drop_max: float) -> void:
		for _i in range(density):
			var ox := rng.randf_range(-span_x * 0.44, span_x * 0.44)
			var oz := rng.randf_range(-span_z * 0.42, span_z * 0.42)
			var sc := rng.randf_range(0.55, 0.98)
			var sb := Basis.from_euler(Vector3(rng.randf_range(-0.10, 0.10), rng.randf_range(0.0, TAU), rng.randf_range(-0.10, 0.10))) * Basis.from_scale(Vector3(sc * 1.12, sc * 0.96, sc * 1.12))
			shrub_xf.append(Transform3D(sb, center + Vector3(ox, 0.03, oz)))
			shrub_col.append(herb_greens[rng.randi() % herb_greens.size()])
			if rng.randf() < 0.78:
				var fsc := rng.randf_range(0.28, 0.46)
				var fb := Basis.from_euler(Vector3(0.0, rng.randf_range(0.0, TAU), 0.0)) * Basis.from_scale(Vector3(fsc, fsc, fsc))
				flower_xf.append(Transform3D(fb, center + Vector3(ox + rng.randf_range(-0.16, 0.16), sc * 0.42 + 0.05, oz + rng.randf_range(-0.16, 0.16))))
				flower_col.append(blooms[rng.randi() % blooms.size()])
		if with_ivy_south:
			var n_iv := maxi(4, int(round(span_x * 1.8)))
			for j in range(n_iv):
				var ix := lerpf(-span_x * 0.44, span_x * 0.44, float(j) / float(maxi(1, n_iv - 1))) + rng.randf_range(-0.12, 0.12)
				var dr := rng.randf_range(ivy_drop_max * 0.55, ivy_drop_max)
				var ib := Basis.from_euler(Vector3(0.07, rng.randf_range(-0.22, 0.22), rng.randf_range(-0.08, 0.08))) * Basis.from_scale(Vector3(0.54, dr, 0.42))
				ivy_xf.append(Transform3D(ib, center + Vector3(ix, -0.04, span_z * 0.48)))

	# --------------------------------------------------------------------------
	# Z7-A: TERRAZAS ESCALONADAS DE HIERBAS Y LAVANDA (x=73.5..83.2, z=54.4..64.8, y=18.0)
	#       Respeta intacto el sendero MM_Z7SteppingPath (x=79..81.5, z=59..65.4) y Z7_GardenStoneBench!
	# --------------------------------------------------------------------------
	var y_u := 18.0
	var upper_beds := [
		# Bancal bajo oeste (hierbas aromáticas y lavanda junto al sendero)
		{"name": "Z7_BedWestLow", "pos": Vector3(76.4, y_u, 60.4), "sz": Vector3(3.4, 0.42, 3.0), "pal": lavender_pal, "n": 24, "ivy": true},
		# Bancal medio oeste-norte escalonado
		{"name": "Z7_BedWestMid", "pos": Vector3(76.6, y_u + 0.32, 57.0), "sz": Vector3(4.2, 0.78, 2.8), "pal": warm_bloom_pal, "n": 26, "ivy": true},
		# Bancal alto norte (terraza superior junto a la pared del monte con pérgola de hierbas)
		{"name": "Z7_BedNorthHigh", "pos": Vector3(79.4, y_u + 0.58, 54.8), "sz": Vector3(6.6, 1.18, 2.2), "pal": lavender_pal, "n": 32, "ivy": true},
		# Bancal este-norte cerrando el rincón tras el banco Z7
		{"name": "Z7_BedEastCorner", "pos": Vector3(82.4, y_u + 0.22, 57.6), "sz": Vector3(2.2, 0.62, 3.4), "pal": warm_bloom_pal, "n": 18, "ivy": false},
	]
	for ub in upper_beds:
		var bpos: Vector3 = ub["pos"]
		var bsz: Vector3 = ub["sz"]
		var top_y := y_u + bsz.y
		_box(z7_root, ub["name"] + "_Wall", Vector3(bpos.x, y_u + bsz.y * 0.5, bpos.z), bsz, mat_wall)
		_box(z7_root, ub["name"] + "_Coping", Vector3(bpos.x, top_y + 0.04, bpos.z), Vector3(bsz.x + 0.14, 0.09, bsz.z + 0.14), mat_coping)
		_box(z7_root, ub["name"] + "_Soil", Vector3(bpos.x, top_y + 0.05, bpos.z), Vector3(bsz.x - 0.24, 0.08, bsz.z - 0.24), mat_soil, false)
		SceneEnhancer.add_box_collider(z7_root, Vector3(bpos.x, y_u + bsz.y * 0.5, bpos.z), bsz)
		populate_bed.call(Vector3(bpos.x, top_y + 0.08, bpos.z), bsz.x - 0.35, bsz.z - 0.35, int(ub["n"]), ub["pal"], bool(ub["ivy"]), 0.72)

	# Pila/fuente serena tallada en piedra caliza en el claro central de Z7 (x=77.8, z=62.5)
	var basin := Node3D.new()
	basin.name = "Z7_SanctuaryWaterBasin"
	basin.position = Vector3(77.8, y_u, 62.5)
	z7_root.add_child(basin)
	_cyl(basin, "PedestalBase", Vector3(0.0, 0.12, 0.0), 0.52, 0.60, 0.24, mat_wall, 8)
	_cyl(basin, "PedestalStem", Vector3(0.0, 0.42, 0.0), 0.24, 0.30, 0.42, mat_coping, 8)
	_cyl(basin, "BasinBowl", Vector3(0.0, 0.74, 0.0), 0.72, 0.44, 0.26, mat_coping, 10)
	if mat_water:
		_cyl(basin, "BasinWater", Vector3(0.0, 0.84, 0.0), 0.60, 0.58, 0.04, mat_water, 10, false)
	SceneEnhancer.add_cyl_collider(basin, Vector3(0.0, 0.48, 0.0), 0.70, 0.96)

	# Enrejado artesanal de madera para hierbas trepadoras en la terraza norte (z=54.2)
	for tx in [77.2, 79.4, 81.6]:
		_box(z7_root, "Z7TrellisPost_%d" % int(tx * 10.0), Vector3(float(tx), y_u + 1.85, 54.05), Vector3(0.14, 2.35, 0.14), mat_wood_dark)
	_box(z7_root, "Z7TrellisBeamTop", Vector3(79.4, y_u + 2.95, 54.05), Vector3(4.95, 0.14, 0.18), mat_wood)
	_box(z7_root, "Z7TrellisBeamMid", Vector3(79.4, y_u + 2.15, 54.05), Vector3(4.65, 0.08, 0.10), mat_wood, false)
	for sl_i in range(6):
		var sx := lerpf(77.4, 81.4, float(sl_i) / 5.0)
		var ib := Basis.from_euler(Vector3(0.05, 0.0, 0.0)) * Basis.from_scale(Vector3(0.52, 1.35, 0.36))
		ivy_xf.append(Transform3D(ib, Vector3(sx, y_u + 2.90, 54.18)))

	# Ánforas de terracota artesanales en los bordes de Z7
	for amp_p in [Vector3(78.6, y_u, 61.5), Vector3(81.8, y_u, 60.4), Vector3(75.0, y_u, 62.6)]:
		_cyl(z7_root, "Z7Amphora_%d_%d" % [int(amp_p.x * 10.0), int(amp_p.z * 10.0)], amp_p + Vector3(0.0, 0.34, 0.0), 0.20, 0.26, 0.68, mat_pottery, 10)
		_cyl(z7_root, "Z7AmphoraNeck", amp_p + Vector3(0.0, 0.72, 0.0), 0.14, 0.11, 0.16, mat_pottery, 10, false)

	# --------------------------------------------------------------------------
	# Z7-B: FLORA NATURAL DE REPISAS EN EL ACANTILADO SUR (SIN CAJAS FLOTANTES NI INTRUSIÓN EN CELDAS A1!)
	#       Bolsas orgánicas de romero, lavanda, brezo, helechos y cascadas de hiedra sobre las
	#       repisas reales del acantilado visibles en 09, 10 y 11.
	# --------------------------------------------------------------------------
	var cliff_pocket_spots := [
		# Repisas reales bajo Paseo Oeste y enlace del puente A5 (visibles en 09 y 11)
		[Vector3(76.2, 16.4, 73.9), 3.6, 1.4, 16, lavender_pal, 1.65],
		[Vector3(81.5, 16.5, 73.7), 3.4, 1.3, 14, warm_bloom_pal, 1.55],
		[Vector3(71.4, 14.9, 74.6), 3.2, 1.4, 14, warm_bloom_pal, 1.75],
		[Vector3(74.8, 13.6, 79.4), 3.4, 1.5, 14, lavender_pal, 1.45],
		[Vector3(68.2, 12.6, 80.2), 3.0, 1.4, 12, warm_bloom_pal, 1.40],
		# Repisas soleadas a lo largo de la cornisa bajo Paseo Z9 (z=73.4..74.1 -> nunca entra en celdas A1!)
		[Vector3(87.8, 16.5, 73.6), 3.6, 1.2, 14, lavender_pal, 1.55],
		[Vector3(96.4, 16.4, 73.6), 3.8, 1.2, 14, warm_bloom_pal, 1.55],
		[Vector3(107.2, 16.5, 73.6), 3.6, 1.2, 14, lavender_pal, 1.50],
		[Vector3(119.8, 16.4, 73.6), 3.8, 1.2, 14, warm_bloom_pal, 1.55],
		[Vector3(130.6, 16.5, 73.6), 3.6, 1.2, 14, lavender_pal, 1.55],
	]
	for cp_s in cliff_pocket_spots:
		var cpos: Vector3 = cp_s[0]
		var csx := float(cp_s[1])
		var csz := float(cp_s[2])
		var ccnt := int(cp_s[3])
		var cpal: Array[Color] = cp_s[4]
		var cdrop := float(cp_s[5])
		populate_bed.call(cpos, csx, csz, ccnt, cpal, true, cdrop)
		for kf in range(4):
			var fsc := rng.randf_range(0.75, 1.28)
			var fb := Basis.from_euler(Vector3(0.12, rng.randf_range(0.0, TAU), 0.0)) * Basis.from_scale(Vector3(fsc, fsc * 0.85, fsc))
			fern_xf.append(Transform3D(fb, cpos + Vector3(rng.randf_range(-csx * 0.45, csx * 0.45), rng.randf_range(-0.18, 0.15), rng.randf_range(-0.2, 0.5))))
			fern_col.append(herb_greens[rng.randi() % herb_greens.size()])

	# Árboles mediterráneos orgánicos enraizados EXCLUSIVAMENTE sobre tierra firme de las terrazas Z7-A (y=18.0+, cero troncos flotantes!)
	var garden_trees := [
		{"kind": "cypress", "pos": Vector3(75.3, y_u + 0.32, 56.5), "sc": 0.96},
		{"kind": "cypress", "pos": Vector3(82.4, y_u + 0.22, 56.4), "sc": 0.92},
		{"kind": "pine", "pos": Vector3(74.6, y_u + 0.55, 54.4), "sc": 1.08},
		{"kind": "olive", "pos": Vector3(77.0, y_u + 0.38, 59.8), "sc": 0.72},
		{"kind": "olive", "pos": Vector3(82.2, y_u + 0.22, 58.6), "sc": 0.68},
	]
	for gt in garden_trees:
		var gpos: Vector3 = gt["pos"]
		var gsc := float(gt["sc"])
		var gkind := str(gt["kind"])
		var gyaw := rng.randf_range(0.0, TAU)
		var lean := Vector3(rng.randf_range(-0.07, 0.07), gyaw, rng.randf_range(-0.07, 0.07))
		var bb := Basis.from_euler(lean)
		if gkind == "olive":
			var th := 1.95 * gsc
			trunk_xf.append(Transform3D(bb * Basis.from_scale(Vector3(0.20 * gsc, th, 0.20 * gsc)), gpos + Vector3(0.0, th * 0.46, 0.0)))
			var oc: Color = olive_greens[rng.randi() % olive_greens.size()]
			oak_xf.append(Transform3D(bb * Basis.from_scale(Vector3(1.55 * gsc, 1.18 * gsc, 1.48 * gsc)), gpos + Vector3(0.0, th + 0.35 * gsc, 0.0)))
			oak_col.append(oc)
			oak_xf.append(Transform3D((bb * Basis.from_euler(Vector3(0.0, 1.2, 0.0))) * Basis.from_scale(Vector3(1.12 * gsc, 0.96 * gsc, 1.08 * gsc)), gpos + Vector3(0.38 * gsc, th + 0.72 * gsc, -0.24 * gsc)))
			oak_col.append(oc.lightened(0.08))
		elif gkind == "cypress":
			var th := 3.6 * gsc
			trunk_xf.append(Transform3D(bb * Basis.from_scale(Vector3(0.14 * gsc, th, 0.14 * gsc)), gpos + Vector3(0.0, th * 0.48, 0.0)))
			var cc := pine_greens[0].lightened(0.04)
			pine_xf.append(Transform3D(bb * Basis.from_scale(Vector3(0.68 * gsc, 1.95 * gsc, 0.68 * gsc)), gpos + Vector3(0.0, 1.85 * gsc, 0.0)))
			pine_col.append(cc)
			pine_xf.append(Transform3D((bb * Basis.from_euler(Vector3(0.0, 1.4, 0.0))) * Basis.from_scale(Vector3(0.52 * gsc, 1.85 * gsc, 0.52 * gsc)), gpos + Vector3(0.0, 3.15 * gsc, 0.0)))
			pine_col.append(cc.lightened(0.08))
		else:
			var th := 2.9 * gsc
			trunk_xf.append(Transform3D(bb * Basis.from_scale(Vector3(0.18 * gsc, th, 0.18 * gsc)), gpos + Vector3(0.0, th * 0.48, 0.0)))
			var pc: Color = pine_greens[rng.randi() % pine_greens.size()]
			pine_xf.append(Transform3D(bb * Basis.from_scale(Vector3(1.42 * gsc, 1.15 * gsc, 1.38 * gsc)), gpos + Vector3(0.0, 2.05 * gsc, 0.0)))
			pine_col.append(pc)
			pine_xf.append(Transform3D((bb * Basis.from_euler(Vector3(0.0, 1.1, 0.0))) * Basis.from_scale(Vector3(1.06 * gsc, 1.05 * gsc, 1.02 * gsc)), gpos + Vector3(0.16 * gsc, 3.05 * gsc, -0.10 * gsc)))
			pine_col.append(pc.lightened(0.09))

	# --------------------------------------------------------------------------
	# Z7-C: UMBRAL FLORAL DEL ENFOQUE AL TEMPLO A5 (flanquea puente x=76.8, z=63.2 y 68.8)
	# --------------------------------------------------------------------------
	for ap_z in [63.25, 68.75]:
		var apos := Vector3(76.8, y_u, float(ap_z))
		_box(z7_root, "A5ApproachPlinth_%d" % int(ap_z * 10.0), apos + Vector3(0.0, 0.24, 0.0), Vector3(1.15, 0.48, 0.72), mat_wall)
		_box(z7_root, "A5ApproachCoping_%d" % int(ap_z * 10.0), apos + Vector3(0.0, 0.50, 0.0), Vector3(1.24, 0.08, 0.80), mat_coping)
		_box(z7_root, "A5ApproachSoil_%d" % int(ap_z * 10.0), apos + Vector3(0.0, 0.51, 0.0), Vector3(0.95, 0.06, 0.54), mat_soil, false)
		populate_bed.call(apos + Vector3(0.0, 0.54, 0.0), 0.90, 0.48, 8, lavender_pal, true, 0.65)

	# Emitir MultiMeshes GPU de toda la vegetación de Z7 y terrazas colgantes
	var shrub_mat := StandardMaterial3D.new()
	shrub_mat.vertex_color_use_as_albedo = true
	shrub_mat.vertex_color_is_srgb = true
	shrub_mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	shrub_mat.roughness = 0.88
	shrub_mat.backlight_enabled = true
	shrub_mat.backlight = Color(0.09, 0.14, 0.06)

	var fl_mat := StandardMaterial3D.new()
	fl_mat.vertex_color_use_as_albedo = true
	fl_mat.vertex_color_is_srgb = true
	fl_mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	fl_mat.roughness = 0.74

	var iv_mat := StandardMaterial3D.new()
	iv_mat.albedo_color = Color("#3e5534")
	iv_mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	iv_mat.roughness = 0.88
	iv_mat.backlight_enabled = true
	iv_mat.backlight = Color(0.07, 0.12, 0.05)

	var mm_sh: MultiMeshInstance3D = builder.call("_make_multimesh_batch", "MM_Z7GardenShrubs", SceneEnhancer.make_botanical_shrub_mesh(), shrub_mat, shrub_xf, shrub_col)
	mm_sh.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	z7_root.add_child(mm_sh)
	var mm_fl: MultiMeshInstance3D = builder.call("_make_multimesh_batch", "MM_Z7GardenFlowers", SceneEnhancer.make_blossom_cluster_mesh(), fl_mat, flower_xf, flower_col)
	mm_fl.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	z7_root.add_child(mm_fl)
	var mm_fe: MultiMeshInstance3D = builder.call("_make_multimesh_batch", "MM_Z7CliffFerns", SceneEnhancer.make_fern_cluster_mesh(), shrub_mat, fern_xf, fern_col)
	mm_fe.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	z7_root.add_child(mm_fe)
	var empty_iv: Array[Color] = []
	var mm_iv: MultiMeshInstance3D = builder.call("_make_multimesh_batch", "MM_Z7CliffIvy", SceneEnhancer.make_hanging_ivy_mesh(), iv_mat, ivy_xf, empty_iv)
	mm_iv.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	z7_root.add_child(mm_iv)

	if not trunk_xf.is_empty():
		var tr_m := CylinderMesh.new()
		tr_m.top_radius = 0.42; tr_m.bottom_radius = 0.78; tr_m.height = 1.0; tr_m.radial_segments = 7
		var empty_tr: Array[Color] = []
		var mm_tr: MultiMeshInstance3D = builder.call("_make_multimesh_batch", "MM_Z7GardenTrunks", tr_m, mat_wood_dark, trunk_xf, empty_tr)
		mm_tr.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		z7_root.add_child(mm_tr)
	if not oak_xf.is_empty():
		var mm_ok: MultiMeshInstance3D = builder.call("_make_multimesh_batch", "MM_Z7GardenOlives", SceneEnhancer.make_lush_canopy_cluster_mesh(), shrub_mat, oak_xf, oak_col)
		mm_ok.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		z7_root.add_child(mm_ok)
	if not pine_xf.is_empty():
		var p_mesh: ArrayMesh = builder.call("_make_pine_tier_mesh")
		var mm_pn: MultiMeshInstance3D = builder.call("_make_multimesh_batch", "MM_Z7GardenConifers", p_mesh, shrub_mat, pine_xf, pine_col)
		mm_pn.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		z7_root.add_child(mm_pn)

# ==============================================================================
# CANON PDF (p. 27): CEMENTERIO DE BRASTOS EN LOS ACANTILADOS AL NOROESTE
# Pequeña terraza natural conectada a la cima NO (x=44.25..45.75, z=44.25, y=35.50m)
# con tumbas cubiertas de flores silvestres blancas y lápidas sencillas de madera.
# ==============================================================================
static func build_brastos_nw_graveyard(builder: Node3D, parent: Node3D) -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = 202611241

	var gy_root := Node3D.new()
	gy_root.name = "NW_BrastosCliffGraveyard"
	parent.add_child(gy_root)

	var y_top := 36.85
	var cx := 45.0
	var cz := 39.4

	var mat_cliff := create_unified_rock_vcol_material(builder, 0.88, 0.72)
	var mat_wall := create_temple_stone_material(builder, Color("#9a978c"), 0.84, "ashlar-v4.webp", 0.34, 0.50, 0.01)
	var mat_flag := create_temple_stone_material(builder, Color("#b8b2a2"), 0.80, "limestone-v3.webp", 0.36, 0.40, 0.01)
	var mat_turf := StandardMaterial3D.new()
	mat_turf.albedo_color = Color("#4a5f3b")
	mat_turf.roughness = 0.94
	var mat_soil := StandardMaterial3D.new()
	mat_soil.albedo_color = Color("#4d3f31")
	mat_soil.roughness = 0.96
	var mat_plank_a := StandardMaterial3D.new()
	mat_plank_a.albedo_color = Color("#6e5b47")
	mat_plank_a.roughness = 0.88
	var mat_plank_b := StandardMaterial3D.new()
	mat_plank_b.albedo_color = Color("#5b4c3d")
	mat_plank_b.roughness = 0.90
	var mat_bronze: Material = builder.get("mat_bronze")
	var mat_flame: Material = builder.get("mat_flame")

	# 1. Plinto volcánico estratificado estrictamente bajo la terraza del cementerio (sin sobresalir hacia el cruce A5North/A5RidgeW en z>42.8 ni x>49.2)
	var cliff_block := make_faceted_cliff_block_mesh(20261124, 5)
	for b_cfg in [
		[Vector3(45.0, 26.2, 39.0), Vector3(7.4, 9.6, 7.0), 0.10],
		[Vector3(41.4, 26.4, 39.4), Vector3(3.2, 9.2, 4.4), -0.26],
		[Vector3(48.2, 26.4, 39.0), Vector3(3.0, 9.2, 4.2), 0.20],
		[Vector3(45.0, 26.8, 35.6), Vector3(6.8, 8.8, 3.8), 0.04],
	]:
		var cb := MeshInstance3D.new()
		cb.name = "GraveyardCliffBase"
		cb.mesh = cliff_block
		cb.material_override = mat_cliff
		cb.position = b_cfg[0]
		cb.scale = b_cfg[1]
		cb.rotation.y = float(b_cfg[2])
		cb.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		gy_root.add_child(cb)

	# 1B. Descansillo de piedra tallada uniendo limpiamente RusticStair_A5North (52.1, 34.82, 48.0),
	#     RusticStair_A5RidgeW (49.5, 34.7, 44.2) y el acceso al Cementerio de Brastos (45.0, 35.5, 44.2)
	var summit_land := Node3D.new()
	summit_land.name = "A5NorthSummitLanding"
	gy_root.add_child(summit_land)
	_box(summit_land, "SummitLandingCore", Vector3(48.8, 33.4, 46.2), Vector3(9.6, 3.1, 5.2), mat_wall)
	_box(summit_land, "SummitLandingDeck", Vector3(48.8, 34.96, 46.2), Vector3(9.8, 0.18, 5.4), mat_flag)
	SceneEnhancer.add_box_collider(summit_land, Vector3(48.8, 34.86, 46.2), Vector3(9.8, 0.36, 5.4))
	# Enlace inclinado suave desde el descansillo (x=48.8, y=35.0) hasta la base de los escalones del cementerio (x=45.0, z=44.2, y=35.5)
	_box(summit_land, "SummitToGraveApron", Vector3(45.4, 35.22, 44.6), Vector3(3.6, 0.56, 1.6), mat_flag)
	SceneEnhancer.add_box_collider(summit_land, Vector3(45.4, 35.22, 44.6), Vector3(3.6, 0.56, 1.6))
	# Bordillo protector norte del descansillo (entre cementerio y cima de A5North) + farol de cumbre
	_box(summit_land, "SummitNorthCurb", Vector3(51.4, 35.34, 43.75), Vector3(4.2, 0.58, 0.42), mat_wall)
	_box(summit_land, "SummitNorthCurbCap", Vector3(51.4, 35.68, 43.75), Vector3(4.3, 0.12, 0.50), mat_flag)
	_box(summit_land, "SummitCornerPillar", Vector3(53.45, 35.60, 44.05), Vector3(0.56, 1.15, 0.56), mat_flag)
	var sl_flm := _cyl(summit_land, "SummitCornerLanternFlame", Vector3(53.45, 36.32, 44.05), 0.055, 0.075, 0.20, mat_flame, 7, false)
	sl_flm.add_to_group("night_flame")
	var sl_lt := OmniLight3D.new()
	sl_lt.name = "SummitCornerLanternLight"
	sl_lt.position = Vector3(53.45, 36.65, 44.05)
	sl_lt.light_color = Color(1.0, 0.78, 0.42)
	sl_lt.light_energy = 1.45
	sl_lt.omni_range = 12.0
	summit_land.add_child(sl_lt)
	builder.call("register_flame_fx", sl_flm, sl_lt, false)

	# 2. Terraza elevada sobre la cresta rocosa + escalinata de 5 peldaños de piedra subiendo desde la senda alta (y=35.50 -> 36.85m)
	_box(gy_root, "GraveyardStoneBase", Vector3(cx, y_top - 0.56, cz), Vector3(7.9, 0.90, 7.5), mat_wall)
	_box(gy_root, "GraveyardTurfTerrace", Vector3(cx, y_top - 0.06, cz), Vector3(7.6, 0.14, 7.2), mat_turf)
	SceneEnhancer.add_box_collider(gy_root, Vector3(cx, y_top - 0.14, cz), Vector3(7.6, 0.28, 7.2))
	# 5 peldaños firmes en piedra caliza + rampa de colisión suave conectando z=44.20 (y=35.50) con z=42.85 (y=36.85)
	var y_start := 35.52
	for st_i in range(5):
		var frac := float(st_i + 1) / 5.0
		var sy := lerpf(y_start, y_top, frac)
		var sz := lerpf(44.20, 42.98, frac)
		_box(gy_root, "GraveyardAccessStep_%d" % st_i, Vector3(cx, sy - 0.16, sz), Vector3(2.85, 0.34, 0.34), mat_flag)
	var ramp_sb := StaticBody3D.new()
	ramp_sb.name = "GraveyardAccessRampCollider"
	var ramp_cs := CollisionShape3D.new()
	var ramp_box := BoxShape3D.new()
	ramp_box.size = Vector3(2.90, 0.30, 1.95)
	ramp_cs.shape = ramp_box
	ramp_sb.add_child(ramp_cs)
	ramp_sb.position = Vector3(cx, (y_start + y_top) * 0.5 - 0.14, 43.55)
	ramp_sb.rotation.x = atan2(y_top - y_start, 1.45)
	gy_root.add_child(ramp_sb)

	# Lajas desgastadas guiando desde la entrada sur hasta la tumba central de Brastos
	for step_i in range(4):
		var sz := lerpf(42.55, 40.05, float(step_i) / 3.0)
		var sx := cx + sin(float(step_i) * 1.4) * 0.20
		var sl := _box(gy_root, "GraveyardStepSlab_%d" % step_i, Vector3(sx, y_top + 0.025, sz), Vector3(0.86, 0.04, 0.54), mat_flag, false)
		sl.rotation.y = rng.randf_range(-0.14, 0.14)

	# Muro bajo de piedra seca protegiendo el borde del acantilado (N, O, E y flancos de entrada sur)
	for wall_cfg in [
		["WallN", Vector3(cx, y_top + 0.30, cz - 3.45), Vector3(7.5, 0.62, 0.42)],
		["WallW", Vector3(cx - 3.65, y_top + 0.30, cz), Vector3(0.42, 0.62, 6.8)],
		["WallE", Vector3(cx + 3.65, y_top + 0.30, cz), Vector3(0.42, 0.62, 6.8)],
		["WallSW", Vector3(cx - 2.55, y_top + 0.30, cz + 3.45), Vector3(2.3, 0.62, 0.42)],
		["WallSE", Vector3(cx + 2.55, y_top + 0.30, cz + 3.45), Vector3(2.3, 0.62, 0.42)],
	]:
		_box(gy_root, "Graveyard" + str(wall_cfg[0]), wall_cfg[1], wall_cfg[2], mat_wall)
		SceneEnhancer.add_box_collider(gy_root, wall_cfg[1], wall_cfg[2])

	# Postes sencillos de madera desgastada en la entrada + farol sereno de bronce
	for px in [cx - 1.32, cx + 1.32]:
		_box(gy_root, "GraveyardGatePost_%d" % int(px * 10.0), Vector3(float(px), y_top + 0.62, cz + 3.45), Vector3(0.22, 1.24, 0.22), mat_plank_b)
	_cyl(gy_root, "GraveyardLanternBase", Vector3(cx + 1.32, y_top + 1.30, cz + 3.45), 0.11, 0.13, 0.10, mat_bronze, 8, false)
	var gy_flm := _cyl(gy_root, "GraveyardLanternFlame", Vector3(cx + 1.32, y_top + 1.44, cz + 3.45), 0.04, 0.055, 0.18, mat_flame, 7, false)
	gy_flm.add_to_group("night_flame")
	var gy_lt := OmniLight3D.new()
	gy_lt.name = "GraveyardLanternLight"
	gy_lt.position = Vector3(cx + 1.32, y_top + 1.72, cz + 3.45)
	gy_lt.light_color = Color(0.95, 0.84, 0.62)
	gy_lt.light_energy = 1.15
	gy_lt.omni_range = 9.5
	gy_root.add_child(gy_lt)
	builder.call("register_flame_fx", gy_flm, gy_lt, false)

	# 3. Seis tumbas humildes con planchas de madera a modo de lápidas y flores silvestres blancas (p. 27)
	var flower_xf: Array[Transform3D] = []
	var flower_col: Array[Color] = []
	var shrub_xf: Array[Transform3D] = []
	var shrub_col: Array[Color] = []
	var white_bloom_pal: Array[Color] = [Color("#f4f3ec"), Color("#ebe9de"), Color("#fafaf4"), Color("#dde6e4")]
	var turf_greens: Array[Color] = [Color("#4e6a3e"), Color("#5c7848"), Color("#425c35")]

	var grave_specs := [
		{"name": "BrastosGrave", "pos": Vector3(45.0, y_top, 38.55), "yaw": 0.0, "is_brastos": true},
		{"name": "GraveNW", "pos": Vector3(42.75, y_top, 38.75), "yaw": 0.12, "is_brastos": false},
		{"name": "GraveNE", "pos": Vector3(47.20, y_top, 38.65), "yaw": -0.10, "is_brastos": false},
		{"name": "GraveSW", "pos": Vector3(42.95, y_top, 41.05), "yaw": 0.08, "is_brastos": false},
		{"name": "GraveSE", "pos": Vector3(47.05, y_top, 41.15), "yaw": -0.14, "is_brastos": false},
		{"name": "GraveFarN", "pos": Vector3(45.0, y_top, 37.15), "yaw": 0.04, "is_brastos": false},
	]
	for gi in range(grave_specs.size()):
		var gs: Dictionary = grave_specs[gi]
		var gpos: Vector3 = gs["pos"]
		var gyaw := float(gs["yaw"])
		var is_b := bool(gs["is_brastos"])
		var gnode := Node3D.new()
		gnode.name = str(gs["name"])
		gnode.position = gpos
		gnode.rotation.y = gyaw
		gy_root.add_child(gnode)

		# Túmulo bajo de tierra cubierta de hierba y flores blancas
		var mound_w := 0.96 if is_b else 0.80
		var mound_l := 1.65 if is_b else 1.42
		_box(gnode, "Mound", Vector3(0.0, 0.06, 0.24), Vector3(mound_w, 0.12, mound_l), mat_soil, false)
		# Plancha de madera desgastada a modo de lápida (p. 27)
		var plank_h := 0.92 if is_b else rng.randf_range(0.68, 0.82)
		var plank := _box(gnode, "WoodHeadstone", Vector3(0.0, plank_h * 0.5, -0.56), Vector3(0.42 if is_b else 0.34, plank_h, 0.075), mat_plank_a if gi % 2 == 0 else mat_plank_b)
		plank.rotation.z = rng.randf_range(-0.07, 0.07) if not is_b else 0.02
		plank.rotation.x = rng.randf_range(-0.05, 0.06)
		if is_b:
			# Detalle discreto de ofrenda y pequeña inscripción tallada en la lápida de Brastos
			_box(gnode, "BrastosPlaqueTrim", Vector3(0.0, 0.58, -0.515), Vector3(0.30, 0.16, 0.02), mat_bronze, false)
			_cyl(gnode, "BrastosOfferingDish", Vector3(0.0, 0.15, -0.34), 0.13, 0.10, 0.06, mat_flag, 10, false)
			SceneEnhancer.add_box_collider(gnode, Vector3(0.0, 0.45, -0.56), Vector3(0.50, 0.90, 0.22))
			var bip := SceneEnhancer._attach_interactive_prop(gnode, "shrine", "Tumba de Brastos", "[T] Examinar tumba de Brastos", Vector3.ZERO, "n", "Plancha de madera gastada por el salitre con el nombre «Brastos», rodeada de flores silvestres blancas. Aquí descansa el esposo de Aleitha, capitana del Rosa de los Vientos.")
			bip.set_meta("secret_id", "brastos_grave")
			bip.interact_radius = 2.65
		else:
			SceneEnhancer.add_box_collider(gnode, Vector3(0.0, 0.36, -0.56), Vector3(0.40, 0.72, 0.18))

		# Flores silvestres blancas cubriendo cada túmulo
		var n_fl := 10 if is_b else 6
		for fi in range(n_fl):
			var fx := gpos.x + rng.randf_range(-mound_w * 0.48, mound_w * 0.48)
			var fz := gpos.z + 0.22 + rng.randf_range(-mound_l * 0.46, mound_l * 0.46)
			var fsc := rng.randf_range(0.24, 0.42)
			var fb := Basis.from_euler(Vector3(0.0, rng.randf_range(0.0, TAU), 0.0)) * Basis.from_scale(Vector3(fsc, fsc * 0.85, fsc))
			flower_xf.append(Transform3D(fb, Vector3(fx, y_top + 0.14, fz)))
			flower_col.append(white_bloom_pal[rng.randi() % white_bloom_pal.size()])
		for si in range(3):
			var sx := gpos.x + rng.randf_range(-mound_w * 0.55, mound_w * 0.55)
			var sz := gpos.z + 0.20 + rng.randf_range(-mound_l * 0.50, mound_l * 0.50)
			var ssc := rng.randf_range(0.28, 0.46)
			var sb := Basis.from_euler(Vector3(0.0, rng.randf_range(0.0, TAU), 0.0)) * Basis.from_scale(Vector3(ssc, ssc * 0.58, ssc))
			shrub_xf.append(Transform3D(sb, Vector3(sx, y_top + 0.10, sz)))
			shrub_col.append(turf_greens[rng.randi() % turf_greens.size()])

	var gy_shrub_mat := StandardMaterial3D.new()
	gy_shrub_mat.vertex_color_use_as_albedo = true
	gy_shrub_mat.vertex_color_is_srgb = true
	gy_shrub_mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	gy_shrub_mat.roughness = 0.88
	var gy_fl_mat := StandardMaterial3D.new()
	gy_fl_mat.vertex_color_use_as_albedo = true
	gy_fl_mat.vertex_color_is_srgb = true
	gy_fl_mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	gy_fl_mat.roughness = 0.72
	var mm_gsh: MultiMeshInstance3D = builder.call("_make_multimesh_batch", "MM_GraveyardGrass", SceneEnhancer.make_botanical_shrub_mesh(), gy_shrub_mat, shrub_xf, shrub_col)
	mm_gsh.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	gy_root.add_child(mm_gsh)
	var mm_gfl: MultiMeshInstance3D = builder.call("_make_multimesh_batch", "MM_GraveyardWhiteWildflowers", SceneEnhancer.make_blossom_cluster_mesh(), gy_fl_mat, flower_xf, flower_col)
	mm_gfl.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	gy_root.add_child(mm_gfl)

# ==============================================================================
# HITO DM (PDF p. 12): APAREJOS DE PESCA ABANDONADOS ("Reaparición de zombis")
# ==============================================================================
static func build_zombie_reappearance_gear(builder: Node3D, parent: Node3D) -> Node3D:
	var gear := Node3D.new()
	gear.name = "Z2_ZombieReappearanceGear"
	gear.position = Vector3(36.2, 1.50, 108.65)
	gear.visible = false
	parent.add_child(gear)

	var mat_wood: Material = builder.get("mat_wood")
	var mat_wood_dark: Material = builder.get("mat_wood_dark")
	var mat_rope := StandardMaterial3D.new()
	mat_rope.albedo_color = Color("#b89e72")
	mat_rope.roughness = 0.92
	var mat_wicker := StandardMaterial3D.new()
	mat_wicker.albedo_color = Color("#9b7c52")
	mat_wicker.roughness = 0.90
	var mat_fish := StandardMaterial3D.new()
	mat_fish.albedo_color = Color("#98aeb8")
	mat_fish.metallic = 0.38
	mat_fish.roughness = 0.34

	# 2 cañas de pescar caídas en diagonal en el descansillo inferior de Z2
	var rod_a := _cyl(gear, "DroppedFishingRodA", Vector3(-0.35, 0.06, -0.18), 0.014, 0.026, 2.05, mat_wood, 7)
	rod_a.rotation = Vector3(0.05, 0.58, PI * 0.5)
	var rod_b := _cyl(gear, "DroppedFishingRodB", Vector3(0.28, 0.07, 0.22), 0.012, 0.024, 1.85, mat_wood_dark, 7)
	rod_b.rotation = Vector3(-0.04, -0.72, PI * 0.5)
	# Cesto de pesca volcado + 3 peces plateados desparramados + carrete de sedal
	var creel := _cyl(gear, "OverturnedCreel", Vector3(0.08, 0.17, -0.04), 0.22, 0.18, 0.42, mat_wicker, 10)
	creel.rotation = Vector3(0.0, 0.45, PI * 0.46)
	for f_cfg in [[Vector3(0.42, 0.045, -0.12), 0.35], [Vector3(0.56, 0.045, 0.08), -0.62], [Vector3(0.32, 0.045, 0.18), 1.15]]:
		var fish := _box(gear, "SpilledFish", f_cfg[0], Vector3(0.30, 0.055, 0.10), mat_fish, false)
		fish.rotation.y = float(f_cfg[1])
	_cyl(gear, "FishingLineCoil", Vector3(-0.48, 0.05, 0.24), 0.14, 0.14, 0.08, mat_rope, 10, false)
	var gip := SceneEnhancer._attach_interactive_prop(gear, "table", "Aparejos de pesca abandonados", "[T] Examinar aparejos tirados", Vector3.ZERO, "s", "Cañas de pescar, cesto volcado y captura reciente: Tarak y Blepp soltaron el equipo al huir cuesta arriba perseguidos por tres marineros ahogados.")
	gip.interact_radius = 2.65
	return gear

# ==============================================================================
# HITO DM (PDF p. 13): REVELACIÓN DE RUNARA EN A5 + LLAVE DE PIEDRA LUNAR
# ==============================================================================
static func build_a5_runara_revelation_fx(builder: Node3D, a5_node: Node3D, y: float) -> Node3D:
	var rev := Node3D.new()
	rev.name = "A5_RunaraRevelationFx"
	rev.visible = false
	a5_node.add_child(rev)

	# Halo radiante de bronce-oro envolviendo el octógono sagrado de Bahamut
	var mat_aura := StandardMaterial3D.new()
	mat_aura.albedo_color = Color(0.95, 0.74, 0.32, 0.42)
	mat_aura.emission_enabled = true
	mat_aura.emission = Color(1.0, 0.78, 0.34)
	mat_aura.emission_energy_multiplier = 1.45
	mat_aura.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat_aura.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	var ring_mi := MeshInstance3D.new()
	ring_mi.name = "BronzeDragonSanctuaryHalo"
	var tm := TorusMesh.new()
	tm.inner_radius = 3.05
	tm.outer_radius = 3.28
	tm.rings = 32
	tm.ring_segments = 10
	ring_mi.mesh = tm
	ring_mi.material_override = mat_aura
	ring_mi.position = Vector3(40.5, y + 0.10, 69.5)
	ring_mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	rev.add_child(ring_mi)

	var drac_light := OmniLight3D.new()
	drac_light.name = "RunaraDragonPresenceLight"
	drac_light.position = Vector3(40.5, y + 4.4, 69.5)
	drac_light.light_color = Color(1.0, 0.80, 0.40)
	drac_light.light_energy = 3.2
	drac_light.omni_range = 18.0
	rev.add_child(drac_light)

	# Llave de piedra lunar resplandeciente sobre el ara de ofrendas (x=42.75, y+0.94, z=69.5)
	var key_node := Node3D.new()
	key_node.name = "MoonstoneKeyDisplay"
	key_node.position = Vector3(42.75, y + 0.94, 69.5)
	rev.add_child(key_node)
	var mat_velvet := StandardMaterial3D.new()
	mat_velvet.albedo_color = Color("#243b57")
	mat_velvet.roughness = 0.92
	var mat_moonstone := StandardMaterial3D.new()
	mat_moonstone.albedo_color = Color("#dceeff")
	mat_moonstone.roughness = 0.14
	mat_moonstone.metallic = 0.25
	mat_moonstone.emission_enabled = true
	mat_moonstone.emission = Color("#82c6ff")
	mat_moonstone.emission_energy_multiplier = 1.65
	_box(key_node, "VelvetCushion", Vector3(0.0, 0.03, 0.28), Vector3(0.32, 0.06, 0.24), mat_velvet, false)
	_cyl(key_node, "MoonstoneKeyBow", Vector3(-0.07, 0.085, 0.28), 0.048, 0.048, 0.025, mat_moonstone, 12, false)
	_box(key_node, "MoonstoneKeyShaft", Vector3(0.04, 0.085, 0.28), Vector3(0.16, 0.022, 0.028), mat_moonstone, false)
	_box(key_node, "MoonstoneKeyBit", Vector3(0.10, 0.085, 0.31), Vector3(0.04, 0.022, 0.05), mat_moonstone, false)
	var key_lt := OmniLight3D.new()
	key_lt.name = "MoonstoneKeyGlow"
	key_lt.position = Vector3(0.0, 0.26, 0.28)
	key_lt.light_color = Color(0.62, 0.85, 1.0)
	key_lt.light_energy = 1.35
	key_lt.omni_range = 4.5
	key_node.add_child(key_lt)
	var kip := SceneEnhancer._attach_interactive_prop(key_node, "secret", "Llave de piedra lunar", "[T] Examinar llave de piedra lunar", Vector3.ZERO, "w", "La llave tallada en piedra lunar que Runara confía al grupo tras revelar su forma de dragona de bronce: abre el acceso al Observatorio oriental.")
	kip.set_meta("secret_id", "moonstone_key")
	kip.interact_radius = 2.65
	return rev
