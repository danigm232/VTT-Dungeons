class_name RetreatUpperArchitecture
extends RefCounted

# ==============================================================================
# FASE 0 & FASE 1 — ARQUITECTURA SUPERIOR, GEOLOGÍA DEL ACANTILADO,
# PORTADAS EXCAVADAS (A3/A4) Y ESCALERAS/MUROS ESTE DEL RETIRO DEL DRAGÓN
# ==============================================================================
# Diseñado de forma modular para mantener separados suelo, muros interiores,
# roca exterior, fachadas, techo cutaway, mobiliario, iluminación e interactivos.

const InteractiveDoorScript = preload("res://scripts/interactive_door.gd")

# ------------------------------------------------------------------------------
# FASE 0: SEPARACIÓN ESTRUCTURAL POR GRUPOS RECONOCIBLES EN A2, A3 Y A4
# ------------------------------------------------------------------------------
static func ensure_zone_layer_groups(zone_root: Node3D, prefix: String) -> Dictionary:
	var layers := {}
	if zone_root == null:
		return layers
	for layer_key in ["Floor", "WallsInterior", "ExteriorRock", "Facade", "Furniture", "Lighting", "Interactive", "Decor"]:
		var node_name := "%s_%s" % [prefix, layer_key]
		var existing := zone_root.get_node_or_null(node_name) as Node3D
		if existing == null:
			existing = Node3D.new()
			existing.name = node_name
			zone_root.add_child(existing)
		layers[layer_key] = existing
	return layers

# ------------------------------------------------------------------------------
# FASE 1.1: MATERIALES GEOLÓGICOS DE BASALTO Y SILLERÍA (CALIBRADOS CON A1/Z1)
# ------------------------------------------------------------------------------
static func create_geological_cliff_material(builder: Node3D) -> StandardMaterial3D:
	var mat := StandardMaterial3D.new()
	mat.vertex_color_use_as_albedo = true
	mat.vertex_color_is_srgb = true
	mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	mat.roughness = 0.85
	mat.metallic = 0.0
	var tex_basalt: Texture2D = builder.call("_load_tex", "basalt-coastal-albedo-v1.webp")
	if tex_basalt == null:
		tex_basalt = builder.call("_load_tex", "a1-cliff-rugged-v8.jpg")
	if tex_basalt == null:
		tex_basalt = builder.call("_load_tex", "coastal-rock.png")
	var norm_rock: Texture2D = builder.call("_load_tex", "rock-normal-v1.png")
	if tex_basalt:
		mat.albedo_texture = tex_basalt
		mat.uv1_triplanar = true
		mat.uv1_world_triplanar = true
		mat.uv1_scale = Vector3(0.16, 0.16, 0.16)
		mat.uv1_triplanar_sharpness = 3.8
	if norm_rock:
		mat.normal_enabled = true
		mat.normal_texture = norm_rock
		mat.normal_scale = 0.78
	return mat

static func create_weathered_ashlar_material(builder: Node3D, tint: Color = Color("#cbc3af")) -> StandardMaterial3D:
	var mat := StandardMaterial3D.new()
	mat.albedo_color = tint
	mat.roughness = 0.82
	mat.metallic = 0.02
	var tex_ashlar: Texture2D = builder.call("_load_tex", "ashlar-v4.webp")
	if tex_ashlar == null:
		tex_ashlar = builder.call("_load_tex", "limestone-v3.webp")
	var norm_rock: Texture2D = builder.call("_load_tex", "rock-normal-v1.png")
	if tex_ashlar:
		mat.albedo_texture = tex_ashlar
		mat.uv1_triplanar = true
		mat.uv1_world_triplanar = true
		mat.uv1_scale = Vector3(0.36, 0.36, 0.36)
		mat.uv1_triplanar_sharpness = 4.0
	if norm_rock:
		mat.normal_enabled = true
		mat.normal_texture = norm_rock
		mat.normal_scale = 0.48
	return mat

static func create_dark_basalt_slab_material(builder: Node3D) -> StandardMaterial3D:
	# Basalto volcánico esculpido (mismo family albedo que _mat_rock_glb / _mat_carved_glb, nunca carbón negro)
	var mat := StandardMaterial3D.new()
	mat.vertex_color_use_as_albedo = true
	mat.vertex_color_is_srgb = true
	mat.roughness = 0.86
	mat.metallic = 0.0
	var tex_basalt: Texture2D = builder.call("_load_tex", "basalt-coastal-albedo-v1.webp")
	if tex_basalt == null:
		tex_basalt = builder.call("_load_tex", "a1-cliff-rugged-v8.jpg")
	var norm_rock: Texture2D = builder.call("_load_tex", "rock-normal-v1.png")
	if tex_basalt:
		mat.albedo_texture = tex_basalt
		mat.uv1_triplanar = true
		mat.uv1_world_triplanar = true
		mat.uv1_scale = Vector3(0.15, 0.15, 0.15)
		mat.uv1_triplanar_sharpness = 4.2
	if norm_rock:
		mat.normal_enabled = true
		mat.normal_texture = norm_rock
		mat.normal_scale = 0.82
	return mat

# ------------------------------------------------------------------------------
# RUIDO DETERMINISTA DE GEOLOGÍA ESTRATIFICADA (SIN ONDULACIONES SENOIDALES)
# ------------------------------------------------------------------------------
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
	var a := _hash2(ix, iz)
	var b := _hash2(ix + 1, iz)
	var c := _hash2(ix, iz + 1)
	var d := _hash2(ix + 1, iz + 1)
	return lerpf(lerpf(a, b, ux), lerpf(c, d, ux), uz)

static func _fbm2(x: float, z: float) -> float:
	var s := 0.0
	s += 0.56 * _vnoise2(x, z)
	s += 0.28 * _vnoise2(x * 2.07 + 13.4, z * 2.03 - 7.1)
	s += 0.16 * _vnoise2(x * 4.31 - 5.2, z * 4.19 + 19.7)
	return s

static func _stepped_strata(v: float, sharpness: float = 0.68) -> float:
	var base: float = floorf(v)
	var frac: float = v - base
	var stepped: float = pow(clampf(frac, 0.0, 1.0), 1.0 + sharpness * 2.5)
	if frac > 0.72:
		var t: float = (frac - 0.72) / 0.28
		stepped = lerpf(stepped, 1.0, t * t)
	return base + lerpf(frac, stepped, sharpness)

static func fract_f(v: float) -> float:
	return v - floorf(v)

# ------------------------------------------------------------------------------
# FASE 1.1: BÓVEDA Y TALUD DE MONTAÑA ESTRATIFICADO CON VANO GEOMÉTRICO REAL
# ------------------------------------------------------------------------------
static func build_stratified_cave_vault_mesh(
	x0: float, x1: float, z0: float, z1: float,
	floor_y: float, front_y: float, back_y: float,
	door_x: float, door_w: float, door_h: float,
	rng: RandomNumberGenerator, rock_col: Color, moss_col: Color,
	is_upper_mountain: bool = false
) -> ArrayMesh:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)

	var span_x := maxf(4.0, x1 - x0)
	var nx := clampi(int(round(span_x * 1.75)), 24, 54)
	var nz := 24 if is_upper_mountain else 18

	# Malla de estratos volcánicos con terrazas marcadas, fracturas verticales y buzamiento natural
	var grid: Array = []
	for iz in range(nz + 1):
		var fz := float(iz) / float(nz) # 0 = norte (z0), 1 = frente sur (z1)
		var z := lerpf(z0, z1, fz)
		var row_pts: Array[Vector3] = []
		var row_meta: Array[Dictionary] = []
		for ix in range(nx + 1):
			var fx := float(ix) / float(nx)
			var x := lerpf(x0, x1, fx)

			# Bloques geológicos macro (sin repetición periódica)
			var macro_mass := (_fbm2(x * 0.085 + 2.1, z * 0.10 - 1.4) - 0.5) * (2.85 if is_upper_mountain else 1.55)
			# Grietas/diaclasas subverticales que dividen el talud en macizos rocosos diferenciados
			var fault_raw := absf(_vnoise2(x * 0.21 + z * 0.055 + 7.3, z * 0.068 + 3.1) - 0.5) * 2.0
			var fissure := clampf(1.0 - smoothstep(0.0, 0.22, fault_raw), 0.0, 1.0)
			# Perfil de pendiente escalonado en 4-5 bancos geológicos con buzamiento ~5° hacia el este
			var slope_t := pow(fz, 0.80 if is_upper_mountain else 0.76)
			var raw_y := lerpf(back_y, front_y, slope_t) + macro_mass * (1.0 - 0.50 * fz)
			var dip_offset := (x - 105.0) * 0.075
			var strata_freq := 0.68 if is_upper_mountain else 0.82
			var strata_v := (raw_y - dip_offset) * strata_freq
			var terraced_y := _stepped_strata(strata_v, 0.76) / strata_freq + dip_offset
			# Fractura media en roca
			var facet := (_fbm2(x * 0.44 - 4.7, z * 0.48 + 8.9) - 0.5) * 0.62
			var y := terraced_y + facet - fissure * (1.05 if is_upper_mountain else 0.58)

			# Protrusión diferencial por macizo (salientes y recovecos naturales)
			var z_bulge := 0.0
			if fz > 0.20 and fz < 0.98:
				var bulge_env := sin(clampf((fz - 0.20) / 0.78, 0.0, 1.0) * PI)
				var step_lip := (1.0 - smoothstep(0.0, 0.35, fract_f(strata_v))) * 0.42
				z_bulge = ((_fbm2(x * 0.17 + 5.2, z * 0.20) - 0.44) * 1.15 + step_lip - fissure * 0.62) * bulge_env

			# Ceja pétrea natural sobre la portada
			var door_dist := absf(x - door_x)
			var portal_arch_span := door_w * 0.85
			if fz > 0.66 and door_dist < portal_arch_span:
				var dt := 1.0 - (door_dist / portal_arch_span)
				var zt := (fz - 0.66) / 0.34
				y = maxf(y, floor_y + door_h + 0.36 + 0.46 * dt * dt * zt)
				z_bulge = lerpf(z_bulge, 0.12 * dt, zt)

			var min_clear := front_y - 0.18
			if fz < 0.94:
				y = maxf(y, min_clear)
			else:
				y = maxf(y, floor_y + door_h + 0.12)

			var final_z := z + z_bulge
			if iz == nz:
				var front_offset := (_fbm2(x * 0.26 + 1.9, z1 * 0.31) - 0.5) * 0.40 - fissure * 0.24
				if door_dist < door_w * 0.68:
					front_offset = 0.0
				final_z = z1 + clampf(front_offset, -0.26, 0.24)

			row_pts.append(Vector3(x, y, final_z))
			row_meta.append({
				"fissure": fissure,
				"strata_frac": fract_f(strata_v),
				"fz": fz,
				"door_dist": door_dist
			})
		grid.append({"pts": row_pts, "meta": row_meta})

	# Color geológico calibrado para textura basalt-coastal-albedo-v1.webp (evita aspecto carbón negro)
	for iz in range(nz + 1):
		var row_cols: Array[Color] = []
		var pts_row: Array = grid[iz]["pts"]
		var meta_row: Array = grid[iz]["meta"]
		for ix in range(nx + 1):
			var p: Vector3 = pts_row[ix]
			var p_l: Vector3 = pts_row[maxi(0, ix - 1)]
			var p_r: Vector3 = pts_row[mini(nx, ix + 1)]
			var p_u: Vector3 = grid[maxi(0, iz - 1)]["pts"][ix]
			var p_d: Vector3 = grid[mini(nz, iz + 1)]["pts"][ix]
			var tx := (p_r - p_l)
			var tz := (p_d - p_u)
			var n_approx := tz.cross(tx)
			if n_approx.length_squared() < 0.0001:
				n_approx = Vector3.UP
			else:
				n_approx = n_approx.normalized()
			if n_approx.y < 0.0:
				n_approx = -n_approx

			var md: Dictionary = meta_row[ix]
			var fissure := float(md["fissure"])
			var strata_frac := float(md["strata_frac"])
			var fz := float(md["fz"])

			# Bandas minerales: basalto pizarra azul-gris (#bcc6c2) + estratos claros erosionados (#d8dcd2)
			var warm_band := _vnoise2(p.x * 0.14 + 3.7, p.y * 0.58)
			var sun_face := clampf(n_approx.y * 0.60 + n_approx.z * 0.40, 0.0, 1.0)
			var base_stone := rock_col.lerp(rock_col.lightened(0.22), clampf(warm_band * 0.65 + sun_face * 0.25, 0.0, 0.78))
			# Sombra en grietas, bajo cornisas y humedad moderada en base (manteniendo legibilidad diurna y lunar)
			var ledge_shadow := 0.22 if strata_frac < 0.20 else 0.0
			var damp_base := clampf((fz - 0.74) * 0.36, 0.0, 0.16)
			var shade := clampf(fissure * 0.30 + ledge_shadow + damp_base, 0.0, 0.40)
			var col := base_stone.darkened(shade)
			# Musgo/liquen sobrio solo en repisas horizontales protegidas
			var flat_shelf := smoothstep(0.60, 0.86, n_approx.y)
			var moss_pocket := _fbm2(p.x * 0.31 - 2.3, p.z * 0.29 + 4.1)
			var moss_w := clampf(flat_shelf * smoothstep(0.44, 0.74, moss_pocket) * (1.0 - fz * 0.40) * 0.55, 0.0, 0.48)
			if rng != null:
				moss_w = clampf(moss_w + rng.randf_range(-0.02, 0.02), 0.0, 0.50)
			col = col.lerp(moss_col, moss_w)
			row_cols.append(col)
		grid[iz]["cols"] = row_cols

	for iz in range(nz):
		var ra: Array = grid[iz]["pts"]
		var rb: Array = grid[iz + 1]["pts"]
		var ca: Array = grid[iz]["cols"]
		var cb: Array = grid[iz + 1]["cols"]
		for ix in range(nx):
			_emit_quad_grid_xz(st, ra[ix], ra[ix + 1], rb[ix + 1], rb[ix], ca[ix], ca[ix + 1], cb[ix + 1], cb[ix])

	# Frente escarpado de acantilado con apertura geométrica real en la portada
	var front_row: Array = grid[nz]["pts"]
	var front_col: Array = grid[nz]["cols"]
	var half_open := door_w * 0.56 + 0.25
	for ix in range(nx):
		var pa: Vector3 = front_row[ix]
		var pb: Vector3 = front_row[ix + 1]
		var mid_x := (pa.x + pb.x) * 0.5
		var dist_door := absf(mid_x - door_x)
		var is_door_span := dist_door < half_open

		if is_door_span:
			var arch_lift := 0.26 * (1.0 - clampf(dist_door / maxf(0.1, half_open), 0.0, 1.0))
			var brow_y := floor_y + door_h + 0.06 + arch_lift
			var ba := Vector3(pa.x, minf(pa.y - 0.12, brow_y), pa.z + 0.08)
			var bb := Vector3(pb.x, minf(pb.y - 0.12, brow_y), pb.z + 0.08)
			var brow_c := rock_col.darkened(0.18)
			_emit_quad_grid_xz(st, pa, pb, bb, ba, front_col[ix], front_col[ix + 1], brow_c, brow_c)
		else:
			var bottom_y := floor_y - 0.06
			var t1_y_a := lerpf(pa.y, bottom_y, 0.35) + (_vnoise2(pa.x * 0.7, 1.3) - 0.5) * 0.24
			var t1_y_b := lerpf(pb.y, bottom_y, 0.35) + (_vnoise2(pb.x * 0.7, 1.3) - 0.5) * 0.24
			var t2_y_a := lerpf(pa.y, bottom_y, 0.72) + (_vnoise2(pa.x * 0.9, 5.7) - 0.5) * 0.20
			var t2_y_b := lerpf(pb.y, bottom_y, 0.72) + (_vnoise2(pb.x * 0.9, 5.7) - 0.5) * 0.20

			var edge_guard_a := smoothstep(half_open, half_open + 1.2, absf(pa.x - door_x))
			var edge_guard_b := smoothstep(half_open, half_open + 1.2, absf(pb.x - door_x))
			var b1_a := (0.14 + (_vnoise2(pa.x * 0.55, 2.1) - 0.5) * 0.26) * edge_guard_a
			var b1_b := (0.14 + (_vnoise2(pb.x * 0.55, 2.1) - 0.5) * 0.26) * edge_guard_b
			var b2_a := (0.28 + (_vnoise2(pa.x * 0.45, 7.9) - 0.5) * 0.28) * edge_guard_a
			var b2_b := (0.28 + (_vnoise2(pb.x * 0.45, 7.9) - 0.5) * 0.28) * edge_guard_b

			var m1a := Vector3(pa.x, t1_y_a, pa.z + b1_a)
			var m1b := Vector3(pb.x, t1_y_b, pb.z + b1_b)
			var m2a := Vector3(pa.x, t2_y_a, pa.z + b2_a)
			var m2b := Vector3(pb.x, t2_y_b, pb.z + b2_b)
			var ba := Vector3(pa.x, bottom_y, pa.z + b2_a * 1.06)
			var bb := Vector3(pb.x, bottom_y, pb.z + b2_b * 1.06)

			var c1 := rock_col.darkened(0.08)
			var c2 := rock_col.darkened(0.18)
			var c3 := rock_col.darkened(0.28)
			_emit_quad_grid_xz(st, pa, pb, m1b, m1a, front_col[ix], front_col[ix + 1], c1, c1)
			_emit_quad_grid_xz(st, m1a, m1b, m2b, m2a, c1, c1, c2, c2)
			_emit_quad_grid_xz(st, m2a, m2b, bb, ba, c2, c2, c3, c3)

	st.generate_normals()
	return st.commit()

# ------------------------------------------------------------------------------
# LOSAS ESTRATIFICADAS DE BASALTO FACETADO (ARISTAS LIMPIAS, CERO "PATATAS")
# ------------------------------------------------------------------------------
static func make_angular_basalt_plate_mesh(seed_val: int = 811) -> ArrayMesh:
	# Banco volcánico estratificado en 2 niveles escalonados con caras planas facetadas
	# (smooth_group = -1 para planos de fractura geológica nítidos coherentes con Z1/A1)
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	st.set_smooth_group(-1)
	var rng := RandomNumberGenerator.new()
	rng.seed = seed_val

	# Contorno poligonal irregular ancho en X, moderado en Z (placas de estrato, no huevos)
	var base_poly: Array[Vector2] = [
		Vector2(-0.52, -0.34), Vector2(-0.18, -0.44), Vector2(0.24, -0.40), Vector2(0.54, -0.22),
		Vector2(0.48, 0.26), Vector2(0.14, 0.42), Vector2(-0.28, 0.38), Vector2(-0.54, 0.14)
	]
	for i in range(base_poly.size()):
		base_poly[i] += Vector2(rng.randf_range(-0.06, 0.06), rng.randf_range(-0.05, 0.05))

	# Dos bancos superpuestos: banco inferior ancho con base ataludada (y=-0.16..0.54) y banco superior retraído (y=0.50..0.98)
	# (la base ataludada sella rendijas de sombra negra bajo cornisas en A4 y A3)
	var bench_specs := [
		{"y0": -0.16, "y1": 0.54, "sc": Vector2(1.04, 1.04), "off": Vector2(0.0, 0.0), "c_bot": Color("#98a1a2"), "c_top": Color("#b4bcb8"), "c_cap": Color("#c4cbc2")},
		{"y0": 0.50, "y1": 0.98, "sc": Vector2(0.78, 0.74), "off": Vector2(-0.04, -0.07), "c_bot": Color("#a4adad"), "c_top": Color("#c6cdc6"), "c_cap": Color("#d2d8cc")},
	]
	var n := base_poly.size()
	for bi in range(bench_specs.size()):
		var bs: Dictionary = bench_specs[bi]
		var y0 := float(bs["y0"])
		var y1 := float(bs["y1"])
		var sc: Vector2 = bs["sc"]
		var off: Vector2 = bs["off"]
		var c_bot: Color = bs["c_bot"]
		var c_top: Color = bs["c_top"]
		var c_cap: Color = bs["c_cap"]
		var bot_ring: Array[Vector3] = []
		var top_ring: Array[Vector3] = []
		for i in range(n):
			var p2 := base_poly[i] * sc + off
			var dip := -p2.x * 0.09 # Buzamiento suave de estrato hacia +X
			var top_sc := 0.92
			bot_ring.append(Vector3(p2.x, y0 + dip * 0.4, p2.y))
			top_ring.append(Vector3(p2.x * top_sc + off.x * 0.1, y1 + dip + rng.randf_range(-0.025, 0.025), p2.y * top_sc + off.y * 0.1))

		# Caras de fractura verticales facetadas con variación tonal según orientación
		for i in range(n):
			var ni := (i + 1) % n
			var edge := (bot_ring[ni] - bot_ring[i]).normalized()
			var face_shade := clampf(edge.x * 0.12 + rng.randf_range(-0.05, 0.05), -0.14, 0.14)
			var cb := c_bot.lightened(face_shade) if face_shade >= 0.0 else c_bot.darkened(-face_shade)
			var ct := c_top.lightened(face_shade) if face_shade >= 0.0 else c_top.darkened(-face_shade)
			_emit_quad_cw(st, bot_ring[ni], bot_ring[i], top_ring[i], top_ring[ni], cb, cb, ct, ct)

		# Terraza superior plana del banco (captura luz cenital y musgo discreto)
		var center := Vector3(off.x, y1 + 0.03, off.y)
		for i in range(n):
			var ni := (i + 1) % n
			st.set_color(c_cap); st.set_uv(Vector2(top_ring[ni].x, top_ring[ni].z)); st.add_vertex(top_ring[ni])
			st.set_color(c_cap); st.set_uv(Vector2(center.x, center.z)); st.add_vertex(center)
			st.set_color(c_cap); st.set_uv(Vector2(top_ring[i].x, top_ring[i].z)); st.add_vertex(top_ring[i])

	st.generate_normals()
	return st.commit()

# ------------------------------------------------------------------------------
# FASE 1.1: MASAS GEOLÓGICAS SUPERIORES, CORNISA DEL PASEO, TALUD Y VEGETACIÓN EN GRIETAS
# ------------------------------------------------------------------------------
static func build_upper_mountain_geology(
	builder: Node3D,
	upper_static_root: Node3D,
	a4_roof: Node3D,
	a3_roof: Node3D,
	mat_cliff: Material,
	mat_ashlar: Material,
	mat_dark_basalt: Material
) -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = 202611221
	var slab_a := make_angular_basalt_plate_mesh(811)
	var slab_b := make_angular_basalt_plate_mesh(947)
	var slab_c := make_angular_basalt_plate_mesh(1129)

	# 1. Masas rocosas estratificadas continuas sobre A4 (sin huecos negros rectangulares ni repetición en cuadrícula)
	var a4_strata_specs := [
		[Vector3(86.4, 20.4, 62.5), Vector3(8.8, 3.0, 5.2), Vector3(7.0, 16.0, -5.0), 0],
		[Vector3(94.6, 20.6, 62.7), Vector3(10.2, 2.6, 4.8), Vector3(8.0, -12.0, -4.0), 1],
		[Vector3(102.75, 21.35, 62.6), Vector3(7.6, 2.15, 4.4), Vector3(8.0, 4.0, -2.0), 2], # Ceja continua sobre arco A4
		[Vector3(109.4, 20.5, 62.4), Vector3(9.4, 3.1, 5.0), Vector3(7.0, -18.0, -6.0), 0],
		# Respaldo geológico intermedio sellando la sombra entre la cornisa y el banco medio (elimina cavidades negras)
		[Vector3(91.0, 21.8, 59.4), Vector3(13.5, 3.4, 6.2), Vector3(6.0, 10.0, -4.0), 1],
		[Vector3(104.2, 21.9, 59.6), Vector3(14.0, 3.4, 6.2), Vector3(6.0, -9.0, -4.0), 2],
		# Banco medio irregular (contrafuertes amplios con quiebros y diaclasas)
		[Vector3(87.2, 23.2, 56.2), Vector3(11.4, 3.2, 6.2), Vector3(6.0, 22.0, -7.0), 2],
		[Vector3(96.8, 23.6, 55.2), Vector3(10.2, 2.8, 5.6), Vector3(5.0, -16.0, -4.0), 1],
		[Vector3(105.8, 23.3, 56.4), Vector3(12.2, 3.1, 6.0), Vector3(6.0, 14.0, -6.0), 0],
		# Cresta superior entrelazada con el monte y pinar
		[Vector3(88.6, 25.6, 49.6), Vector3(12.2, 3.0, 6.0), Vector3(5.0, -16.0, -5.0), 1],
		[Vector3(99.8, 26.0, 49.3), Vector3(13.0, 2.7, 5.8), Vector3(4.0, 11.0, -3.0), 0],
		[Vector3(109.4, 25.8, 49.6), Vector3(10.4, 3.0, 5.6), Vector3(5.0, -22.0, -6.0), 2],
	]
	for i in range(a4_strata_specs.size()):
		var sp: Array = a4_strata_specs[i]
		var mi := MeshInstance3D.new()
		mi.name = "A4CliffStrata_%d" % i
		var midx := int(sp[3])
		mi.mesh = slab_a if midx == 0 else (slab_b if midx == 1 else slab_c)
		mi.material_override = mat_cliff if i % 3 != 0 else mat_dark_basalt
		mi.position = sp[0]
		mi.scale = sp[1]
		mi.rotation_degrees = sp[2]
		mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		a4_roof.add_child(mi)

	# 2. Masas estratificadas continuas sobre A3 (en a3_roof -> ocultables con cutaway)
	var a3_strata_specs := [
		[Vector3(117.4, 21.35, 62.6), Vector3(7.6, 2.15, 4.4), Vector3(8.0, -6.0, -3.0), 1], # Ceja continua sobre portada A3
		[Vector3(124.2, 20.5, 62.4), Vector3(10.2, 3.0, 5.0), Vector3(7.0, 17.0, -6.0), 2],
		[Vector3(131.6, 20.6, 62.2), Vector3(8.0, 2.6, 4.6), Vector3(7.0, -14.0, -4.0), 0],
		# Respaldo geológico intermedio A3 (elimina cavidades rectangulares oscuras sobre la cornisa)
		[Vector3(118.4, 21.8, 59.5), Vector3(12.8, 3.4, 6.0), Vector3(6.0, 12.0, -4.0), 2],
		[Vector3(129.0, 21.7, 59.4), Vector3(11.8, 3.3, 5.8), Vector3(6.0, -11.0, -4.0), 1],
		# Banco medio A3
		[Vector3(117.6, 23.7, 55.4), Vector3(12.0, 3.0, 6.2), Vector3(6.0, -16.0, -5.0), 0],
		[Vector3(128.6, 23.2, 55.8), Vector3(11.6, 2.8, 5.8), Vector3(6.0, 19.0, -6.0), 2],
		# Cresta superior A3
		[Vector3(118.4, 25.9, 49.4), Vector3(12.2, 2.9, 5.8), Vector3(5.0, 14.0, -5.0), 1],
		[Vector3(129.0, 25.6, 49.6), Vector3(11.4, 2.7, 5.6), Vector3(4.0, -18.0, -4.0), 0],
	]
	for i in range(a3_strata_specs.size()):
		var sp: Array = a3_strata_specs[i]
		var mi := MeshInstance3D.new()
		mi.name = "A3CliffStrata_%d" % i
		var midx := int(sp[3])
		mi.mesh = slab_a if midx == 0 else (slab_b if midx == 1 else slab_c)
		mi.material_override = mat_cliff if i % 3 != 0 else mat_dark_basalt
		mi.position = sp[0]
		mi.scale = sp[1]
		mi.rotation_degrees = sp[2]
		mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		a3_roof.add_child(mi)

	# 3. Cornisa basáltica continua y facetada bajo el borde sur del Paseo Superior (z=72.2..74.2, y=15.9..18.0)
	var rim_root := Node3D.new()
	rim_root.name = "UpperWalkwayBedrockRim"
	upper_static_root.add_child(rim_root)

	var rim_xf: Array[Transform3D] = []
	var rim_col: Array[Color] = []
	var rim_tones := [Color("#adb6b2"), Color("#bcc2ba"), Color("#9aa4a4"), Color("#b4bcb5")]
	for rx_i in range(15):
		var rx := lerpf(77.4, 144.8, float(rx_i) / 14.0) + rng.randf_range(-0.4, 0.4)
		var rz := 72.75 + rng.randf_range(-0.15, 0.25)
		var ry := 16.05 + rng.randf_range(-0.22, 0.14)
		var sx := rng.randf_range(5.4, 7.2)
		var sy := rng.randf_range(1.75, 2.15)
		var sz := rng.randf_range(2.35, 3.05)
		var b := Basis.from_euler(Vector3(rng.randf_range(0.02, 0.10), rng.randf_range(-0.18, 0.18), rng.randf_range(-0.08, -0.02))) * Basis.from_scale(Vector3(sx, sy, sz))
		rim_xf.append(Transform3D(b, Vector3(rx, ry, rz)))
		rim_col.append(rim_tones[rx_i % rim_tones.size()])

	# Refuerzos estratificados del escarpe este bajo el Paseo (x=135..149, z=72..76.8)
	var east_under_specs := [
		[Vector3(137.4, 14.4, 73.6), Vector3(6.8, 3.2, 3.8), -0.08],
		[Vector3(142.8, 14.0, 73.4), Vector3(7.4, 3.6, 4.0), -0.10],
		[Vector3(147.8, 13.0, 72.4), Vector3(6.4, 3.4, 3.8), -0.06],
		[Vector3(141.0, 11.6, 76.0), Vector3(8.2, 3.4, 4.2), -0.08],
	]
	for esp in east_under_specs:
		var eb := Basis.from_euler(Vector3(0.06, 0.08, float(esp[2]))) * Basis.from_scale(esp[1])
		rim_xf.append(Transform3D(eb, esp[0]))
		rim_col.append(Color("#a8b1ae"))

	# Pequeñas lascas de talud / grava angulosa pegadas al pie de la pared (z=65.24..65.42, SIEMPRE lejos de actores y puertas!)
	var talus_xs := [85.6, 88.0, 93.8, 108.6, 111.4, 125.2, 131.8]
	for tx in talus_xs:
		for k in range(3):
			var ox := rng.randf_range(-0.55, 0.55)
			var oz := rng.randf_range(-0.10, 0.14)
			var sc := Vector3(rng.randf_range(0.38, 0.72), rng.randf_range(0.16, 0.34), rng.randf_range(0.28, 0.50))
			var tb := Basis.from_euler(Vector3(rng.randf_range(-0.10, 0.10), rng.randf_range(0.0, TAU), rng.randf_range(-0.08, 0.08))) * Basis.from_scale(sc)
			rim_xf.append(Transform3D(tb, Vector3(tx + ox, 17.98, 65.34 + oz)))
			rim_col.append(rim_tones[(int(tx) + k) % rim_tones.size()].darkened(0.06))

	var mm_rim: MultiMeshInstance3D = builder.call("_make_multimesh_batch", "MM_UpperCliffBedrockAndTalus", slab_a, mat_dark_basalt, rim_xf, rim_col)
	mm_rim.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	rim_root.add_child(mm_rim)

	# 4. Vegetación de grieta agrupada de forma irregular en juntas y recovecos entre estratos (no centrada en cada losa)
	var crevice_greens := [Color("#4b633a"), Color("#5a7144"), Color("#677d4d"), Color("#425734")]
	for target_pair in [
		[a4_roof, [Vector3(89.9, 22.8, 63.1), Vector3(99.2, 23.0, 63.3), Vector3(106.1, 22.9, 63.2), Vector3(92.4, 25.6, 57.6), Vector3(101.6, 25.9, 57.2)]],
		[a3_roof, [Vector3(113.8, 23.0, 63.2), Vector3(120.6, 22.9, 63.2), Vector3(128.5, 22.8, 63.0), Vector3(123.0, 25.7, 57.1)]]
	]:
		var r_parent: Node3D = target_pair[0]
		var pts: Array = target_pair[1]
		var r_fern_xf: Array[Transform3D] = []
		var r_fern_col: Array[Color] = []
		var r_ivy_xf: Array[Transform3D] = []
		for cp in pts:
			var cpos: Vector3 = cp
			for j in range(5):
				var fsc := rng.randf_range(0.55, 1.05)
				var fb := Basis.from_euler(Vector3(rng.randf_range(-0.14, 0.14), rng.randf_range(0.0, TAU), rng.randf_range(-0.14, 0.14))).scaled(Vector3(fsc * 1.15, fsc * 0.84, fsc * 1.15))
				r_fern_xf.append(Transform3D(fb, cpos + Vector3(rng.randf_range(-1.35, 1.35), rng.randf_range(-0.14, 0.18), rng.randf_range(-0.20, 0.40))))
				r_fern_col.append(crevice_greens[rng.randi() % crevice_greens.size()])
			for k in range(3):
				var drop := rng.randf_range(0.75, 1.45)
				var ib := Basis.from_euler(Vector3(0.08, rng.randf_range(-0.35, 0.35), rng.randf_range(-0.14, 0.14))).scaled(Vector3(0.56, drop, 0.44))
				r_ivy_xf.append(Transform3D(ib, cpos + Vector3(rng.randf_range(-1.05, 1.05), -0.05, 0.42)))
		var fmat := _make_crevice_foliage_mat()
		var imat := _make_crevice_ivy_mat()
		var mm_f: MultiMeshInstance3D = builder.call("_make_multimesh_batch", "MM_RoofCreviceFerns", _make_crevice_fern_mesh(), fmat, r_fern_xf, r_fern_col)
		mm_f.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		r_parent.add_child(mm_f)
		var empty_cols: Array[Color] = []
		var mm_iv: MultiMeshInstance3D = builder.call("_make_multimesh_batch", "MM_RoofCreviceIvy", _make_crevice_ivy_mesh(), imat, r_ivy_xf, empty_cols)
		mm_iv.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		r_parent.add_child(mm_iv)

	# Vegetación en grietas soleadas bajo la cornisa del Paseo Superior (talud hacia A1)
	var fern_xf: Array[Transform3D] = []
	var fern_col: Array[Color] = []
	var ivy_xf: Array[Transform3D] = []
	for mid_x in [78.8, 84.6, 91.2, 97.4, 104.0, 110.8, 117.6, 124.2, 130.8, 137.8, 143.6]:
		var base_c := Vector3(float(mid_x), 17.55 + rng.randf_range(-0.25, 0.18), 73.55)
		for j in range(5):
			var fsc := rng.randf_range(0.62, 1.12)
			var fb := Basis.from_euler(Vector3(rng.randf_range(-0.12, 0.12), rng.randf_range(0.0, TAU), rng.randf_range(-0.12, 0.12))).scaled(Vector3(fsc * 1.15, fsc * 0.85, fsc * 1.15))
			fern_xf.append(Transform3D(fb, base_c + Vector3(rng.randf_range(-1.2, 1.2), rng.randf_range(-0.18, 0.16), rng.randf_range(-0.18, 0.42))))
			fern_col.append(crevice_greens[rng.randi() % crevice_greens.size()])
		for k in range(3):
			var drop := rng.randf_range(0.95, 1.75)
			var ib := Basis.from_euler(Vector3(0.08, rng.randf_range(-0.18, 0.18), rng.randf_range(-0.08, 0.08))).scaled(Vector3(0.58, drop, 0.44))
			ivy_xf.append(Transform3D(ib, base_c + Vector3(rng.randf_range(-0.9, 0.9), -0.05, 0.36)))

	var static_fmat := _make_crevice_foliage_mat()
	var static_imat := _make_crevice_ivy_mat()
	var mm_sf: MultiMeshInstance3D = builder.call("_make_multimesh_batch", "MM_MidCliffCreviceFerns", _make_crevice_fern_mesh(), static_fmat, fern_xf, fern_col)
	mm_sf.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	rim_root.add_child(mm_sf)
	var empty_static_cols: Array[Color] = []
	var mm_si: MultiMeshInstance3D = builder.call("_make_multimesh_batch", "MM_MidCliffCreviceIvy", _make_crevice_ivy_mesh(), static_imat, ivy_xf, empty_static_cols)
	mm_si.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	rim_root.add_child(mm_si)

	# Ménsulas de sillería bajo los puntos de apoyo del Paseo Superior
	for corb_x in [81.0, 93.0, 105.0, 117.0, 129.0, 141.0]:
		var corb := _box(rim_root, Vector3(float(corb_x), 17.34, 72.18), Vector3(0.76, 1.18, 0.72), mat_ashlar)
		corb.name = "WalkwayStoneCorbel_%d" % int(corb_x)
		corb.rotation.x = -0.18
		corb.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON

# ------------------------------------------------------------------------------
# PULIDO FACHADA DEL PASEO SUPERIOR: CONTRAFUERTES, HIEDRA Y TABLÓN MONÁSTICO
# ------------------------------------------------------------------------------
static func build_paseo_facade_enrichment(
	builder: Node3D,
	a4_facade: Node3D,
	a4_roof: Node3D,
	a3_facade: Node3D,
	a3_roof: Node3D,
	mat_ashlar: Material,
	mat_basalt_carved: Material,
	mat_wood: Material,
	mat_wood_dark: Material,
	mat_iron: Material
) -> void:
	var y0 := 18.0
	var z_wall := 65.34
	var mat_stone_warm := create_weathered_ashlar_material(builder, Color("#b6ae9a"))
	var mat_paper := StandardMaterial3D.new()
	mat_paper.albedo_color = Color("#d8ccb2")
	mat_paper.roughness = 0.90

	# Contrafuertes de mampostería escalonados integrando la franja baja del muro con el talud superior
	# (zócalo bajo estático en Facade; fuste superior y capitel en Roof para ocultarse limpio al abrir cutaway)
	var buttress_specs := [
		[86.6, a4_facade, a4_roof],
		[94.8, a4_facade, a4_roof],
		[112.95, a3_facade, a3_roof], # Pilastra sobre la divisoria maciza A4/A3
		[124.2, a3_facade, a3_roof],
		[131.6, a3_facade, a3_roof],
	]
	for bsp in buttress_specs:
		var bx := float(bsp[0])
		var f_parent: Node3D = bsp[1]
		var r_parent: Node3D = bsp[2]
		# Zócalo inferior anclado al bordillo del Paseo
		var base_b := _box(f_parent, Vector3(bx, y0 + 0.42, z_wall + 0.08), Vector3(0.86, 0.84, 0.54), mat_basalt_carved)
		base_b.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		# Fuste superior y albardilla inclinada enrasados limpiamente bajo el voladizo rocoso (sin sobresalir flotando)
		var shaft_b := _box(r_parent, Vector3(bx, y0 + 1.62, z_wall + 0.04), Vector3(0.70, 1.66, 0.42), mat_stone_warm)
		shaft_b.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		var cap_b := _box(r_parent, Vector3(bx, y0 + 2.52, z_wall + 0.05), Vector3(0.80, 0.20, 0.50), mat_ashlar)
		cap_b.rotation.x = 0.24
		cap_b.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON

	# Hiedra trepadora y helechos puntuales en grietas del muro exterior (en a4_roof / a3_roof -> sin flotar en cutaway!)
	var ivy_mesh := _make_crevice_ivy_mesh()
	var fern_mesh := _make_crevice_fern_mesh()
	var ivy_mat := _make_crevice_ivy_mat()
	var fern_mat := _make_crevice_foliage_mat()
	var rng := RandomNumberGenerator.new()
	rng.seed = 202611238
	for zone_cfg in [
		[a4_roof, [87.1, 95.3, 107.1], "A4FacadeIvy"],
		[a3_roof, [123.6, 131.1], "A3FacadeIvy"]
	]:
		var r_par: Node3D = zone_cfg[0]
		var xs: Array = zone_cfg[1]
		var tag: String = str(zone_cfg[2])
		var i_xfs: Array[Transform3D] = []
		var f_xfs: Array[Transform3D] = []
		var f_cols: Array[Color] = []
		for vx in xs:
			var x_pos := float(vx)
			for k in range(3):
				var drop := rng.randf_range(0.95, 1.65)
				var ib := Basis.from_euler(Vector3(0.06, rng.randf_range(-0.15, 0.15), rng.randf_range(-0.08, 0.08))).scaled(Vector3(0.54, drop, 0.34))
				i_xfs.append(Transform3D(ib, Vector3(x_pos + rng.randf_range(-0.55, 0.55), y0 + rng.randf_range(2.35, 2.85), z_wall + 0.28)))
			for j in range(3):
				var fsc := rng.randf_range(0.48, 0.78)
				var fb := Basis.from_euler(Vector3(0.18, rng.randf_range(0.0, TAU), 0.0)).scaled(Vector3(fsc, fsc * 0.78, fsc))
				f_xfs.append(Transform3D(fb, Vector3(x_pos + rng.randf_range(-0.65, 0.65), y0 + rng.randf_range(2.65, 3.05), z_wall + 0.24)))
				f_cols.append(Color("#475d39") if j % 2 == 0 else Color("#586e44"))
		var empty_ic: Array[Color] = []
		var mm_i: MultiMeshInstance3D = builder.call("_make_multimesh_batch", tag, ivy_mesh, ivy_mat, i_xfs, empty_ic)
		mm_i.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		r_par.add_child(mm_i)
		var mm_f: MultiMeshInstance3D = builder.call("_make_multimesh_batch", tag + "Ferns", fern_mesh, fern_mat, f_xfs, f_cols)
		mm_f.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		r_par.add_child(mm_f)

	# Tablón monástico de horarios y avisos del refectorio/biblioteca montado en el muro del Paseo (x=122.45, entre maceta A3 y banco este)
	var board := Node3D.new()
	board.name = "PaseoMonasticNoticeBoard"
	board.position = Vector3(122.45, y0 + 1.72, z_wall + 0.24)
	a3_roof.add_child(board)
	_box(board, Vector3(0.0, 0.0, 0.0), Vector3(1.26, 0.88, 0.07), mat_wood_dark)
	_box(board, Vector3(0.0, 0.0, 0.03), Vector3(1.10, 0.72, 0.03), mat_wood)
	# Tejadillo protector inclinado y herrajes de forja
	var hood := _box(board, Vector3(0.0, 0.50, 0.08), Vector3(1.38, 0.07, 0.28), mat_wood_dark)
	hood.rotation.x = 0.28
	for hx in [-0.54, 0.54]:
		_box(board, Vector3(float(hx), 0.36, 0.05), Vector3(0.06, 0.12, 0.02), mat_iron)
		_box(board, Vector3(float(hx), -0.36, 0.05), Vector3(0.06, 0.12, 0.02), mat_iron)
	# 3 pergaminos clavados ligeramente asimétricos
	var p1 := _box(board, Vector3(-0.30, 0.06, 0.052), Vector3(0.32, 0.42, 0.012), mat_paper)
	p1.rotation.z = 0.04
	var p2 := _box(board, Vector3(0.10, -0.04, 0.052), Vector3(0.34, 0.36, 0.012), mat_paper)
	p2.rotation.z = -0.05
	var p3 := _box(board, Vector3(0.38, 0.14, 0.052), Vector3(0.22, 0.26, 0.012), mat_paper)
	p3.rotation.z = 0.06

# ------------------------------------------------------------------------------
# FASE 1.2: PORTADAS REALES EXCAVADAS EN LA ROCA PARA A4 (BIBLIOTECA) Y A3 (COMEDOR)
# ------------------------------------------------------------------------------
static func build_upper_excavated_portal(
	builder: Node3D,
	static_facade_parent: Node3D,
	roof_cutaway_parent: Node3D,
	cfg: Dictionary,
	mat_ashlar: Material,
	mat_basalt_carved: Material,
	mat_basalt_dark: Material,
	mat_wood: Material,
	mat_wood_dark: Material,
	mat_iron: Material,
	mat_bronze: Material,
	mat_flame: Material,
	plate_mesh: Mesh
) -> Node3D:
	var portal_id := str(cfg.get("id", "portal"))
	var door_id := str(cfg.get("door_id", portal_id))
	var door_title := str(cfg.get("door_title", "Puerta"))
	var style := str(cfg.get("style", "library_arch")) # "library_arch" (A4) | "refectory_lintel" (A3)
	var cx := float(cfg.get("door_x", 102.75))
	var y0 := float(cfg.get("y0", 18.0))
	var z_front := float(cfg.get("z_front", 65.28))
	var clear_w := float(cfg.get("clear_w", 2.84))
	var clear_h := float(cfg.get("clear_h", 2.86))
	var tunnel_d := 1.66
	var z_mid := z_front - tunnel_d * 0.42
	var half_w := clear_w * 0.5
	var mat_stone_warm := create_weathered_ashlar_material(builder, Color("#b9b19d"))

	var static_portal := Node3D.new()
	static_portal.name = "ExcavatedPortalStatic_" + portal_id
	static_facade_parent.add_child(static_portal)

	var roof_portal := Node3D.new()
	roof_portal.name = "ExcavatedPortalUpper_" + portal_id
	roof_cutaway_parent.add_child(roof_portal)

	# 1. Umbral desgastado de losas talladas conectando Paseo Superior <-> suelo interior
	var thresh_specs := [
		[Vector3(cx, y0 + 0.022, z_mid + 0.05), Vector3(clear_w + 0.72, 0.044, tunnel_d + 0.36), mat_ashlar],
		[Vector3(cx - 0.92, y0 + 0.028, z_front + 0.24), Vector3(0.96, 0.042, 0.54), mat_stone_warm],
		[Vector3(cx + 0.02, y0 + 0.025, z_front + 0.26), Vector3(1.06, 0.036, 0.58), mat_ashlar],
		[Vector3(cx + 0.95, y0 + 0.028, z_front + 0.23), Vector3(0.94, 0.042, 0.52), mat_stone_warm],
		[Vector3(cx, y0 + 0.024, z_front - tunnel_d + 0.04), Vector3(clear_w + 0.45, 0.040, 0.46), mat_ashlar],
	]
	for ti in range(thresh_specs.size()):
		var ts: Array = thresh_specs[ti]
		var tm := _box(static_portal, ts[0], ts[1], ts[2])
		tm.name = "ThresholdStone_%s_%d" % [portal_id, ti]
		tm.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF

	# 2. Profundidad real del túnel (paredes laterales de piedra tallada + encastre escalonado en basalto)
	for side_v in [-1.0, 1.0]:
		var s := float(side_v)
		var jx := cx + s * (half_w + 0.34)
		var outer_x := cx + s * (half_w + 1.08)

		# Zócalo inferior y 2 primeras hiladas irregulares (estáticas: leen el grosor del túnel incluso en cutaway)
		var plinth := _box(static_portal, Vector3(jx, y0 + 0.22, z_mid + 0.04), Vector3(0.76, 0.44, tunnel_d + 0.16), mat_basalt_carved)
		plinth.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		var course1 := _box(static_portal, Vector3(jx + s * 0.02, y0 + 0.68, z_mid), Vector3(0.68, 0.48, tunnel_d + 0.06), mat_ashlar)
		course1.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON

		# Encastre de estratos basálticos horizontales detrás de la jamba (cero salchichas verticales!)
		var base_cheek := MeshInstance3D.new()
		base_cheek.name = "PortalBaseRock_%s_%d" % [portal_id, int(s)]
		base_cheek.mesh = plate_mesh
		base_cheek.material_override = mat_basalt_dark
		base_cheek.position = Vector3(outer_x + s * 0.32, y0 - 0.04, z_front - 0.44)
		base_cheek.scale = Vector3(2.2, 1.05, 1.45)
		base_cheek.rotation_degrees = Vector3(4.0, s * 16.0, -s * 4.0)
		static_portal.add_child(base_cheek)

		# Hiladas superiores irregulares de jambas (en roof_portal -> se ocultan al entrar)
		for ci in range(4):
			var cy := y0 + 1.15 + float(ci) * 0.44
			var w_var := 0.68 - float(ci % 2) * 0.07 + (0.04 if style == "refectory_lintel" else 0.0)
			var d_var := tunnel_d + 0.04 - float(ci % 2) * 0.08
			var x_shift := s * (0.03 if ci % 2 == 1 else -0.02)
			var mat_c: Material = mat_ashlar if (ci % 2 == 0 or style == "library_arch") else mat_stone_warm
			var jblk := _box(roof_portal, Vector3(jx + x_shift, cy, z_mid), Vector3(w_var, 0.42, d_var), mat_c)
			jblk.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON

		# Revestimiento oscuro interior del paso excavado
		var inner_reveal := _box(roof_portal, Vector3(cx + s * (half_w + 0.06), y0 + clear_h * 0.54, z_front - tunnel_d * 0.56), Vector3(0.18, clear_h * 0.92, tunnel_d * 0.78), mat_basalt_carved)
		inner_reveal.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON

		# Dos bancos horizontales escalonados de basalto retranqueados tras las jambas (integración orgánica con la montaña)
		for tier_i in range(2):
			var upper_cheek := MeshInstance3D.new()
			upper_cheek.name = "PortalUpperRockLedge_%s_%d_%d" % [portal_id, int(s), tier_i]
			upper_cheek.mesh = plate_mesh
			upper_cheek.material_override = mat_basalt_dark
			upper_cheek.position = Vector3(outer_x + s * (0.48 + float(tier_i) * 0.18), y0 + 0.92 + float(tier_i) * 1.12, z_front - 0.58 - float(tier_i) * 0.14)
			upper_cheek.scale = Vector3(2.45 - float(tier_i) * 0.25, 1.18, 1.55)
			upper_cheek.rotation_degrees = Vector3(6.0, s * (14.0 - float(tier_i) * 8.0), -5.0)
			upper_cheek.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
			roof_portal.add_child(upper_cheek)

		# Pilastras / columnas diferenciadas por edificio
		if style == "library_arch":
			var pil := _box(roof_portal, Vector3(cx + s * (half_w + 0.54), y0 + 1.88, z_front + 0.16), Vector3(0.36, 1.92, 0.42), mat_ashlar)
			pil.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
			var cap := _box(roof_portal, Vector3(cx + s * (half_w + 0.52), y0 + 2.86, z_front + 0.20), Vector3(0.54, 0.22, 0.56), mat_ashlar)
			cap.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		else:
			var corb := _box(roof_portal, Vector3(cx + s * (half_w + 0.12), y0 + 2.68, z_front + 0.06), Vector3(0.52, 0.36, 1.38), mat_stone_warm)
			corb.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
			var pier := _box(roof_portal, Vector3(cx + s * (half_w + 0.62), y0 + 1.90, z_front + 0.12), Vector3(0.48, 1.96, 0.52), mat_basalt_carved)
			pier.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON

	# 3. Techo interior del túnel excavado
	var soffit := _box(roof_portal, Vector3(cx, y0 + clear_h + 0.12, z_mid - 0.08), Vector3(clear_w + 0.42, 0.28, tunnel_d + 0.08), mat_basalt_carved)
	soffit.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON

	# 4. Coronación arquitectónica claramente distinta entre Biblioteca A4 y Comedor A3
	if style == "library_arch":
		# Arco monumental rebajado de 9 dovelas talladas en caliza + clave destacada + emblema de bronce
		var voussoir_count := 9
		var arch_span := clear_w + 1.04
		for vi in range(voussoir_count):
			var t := float(vi) / float(voussoir_count - 1)
			var u := (t - 0.5) * 2.0
			var vx := cx + u * (arch_span * 0.46)
			var vy := y0 + clear_h + 0.02 + (1.0 - u * u) * 0.58
			var is_key := (vi == 4)
			var vw := 0.52 if is_key else 0.44
			var vh := 0.72 if is_key else 0.48
			var vd := 1.48 if is_key else 1.32
			var vblk := _box(roof_portal, Vector3(vx, vy, z_mid + (0.16 if is_key else 0.09)), Vector3(vw, vh, vd), mat_ashlar if (is_key or vi % 2 == 0) else mat_stone_warm)
			vblk.rotation.z = -u * 0.36
			vblk.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		# Emblema de bronce en la clave de la biblioteca
		_box(roof_portal, Vector3(cx, y0 + clear_h + 0.62, z_front + 0.30), Vector3(0.26, 0.32, 0.08), mat_bronze)
	else:
		# Dintel doble rústico del Comedor A3: gruesa viga de roble con pletinas de forja + gran dintel pétreo + clave
		var oak_beam := _box(roof_portal, Vector3(cx, y0 + clear_h + 0.02, z_front + 0.10), Vector3(clear_w + 1.36, 0.34, 0.62), mat_wood_dark)
		oak_beam.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		for strap_x in [-1.35, 0.0, 1.35]:
			_box(roof_portal, Vector3(cx + float(strap_x), y0 + clear_h + 0.02, z_front + 0.12), Vector3(0.14, 0.38, 0.66), mat_iron)
		var stone_lintel := _box(roof_portal, Vector3(cx, y0 + clear_h + 0.38, z_mid + 0.08), Vector3(clear_w + 1.62, 0.44, 1.42), mat_ashlar)
		stone_lintel.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		var keystone := _box(roof_portal, Vector3(cx, y0 + clear_h + 0.50, z_front + 0.14), Vector3(0.72, 0.52, 0.86), mat_stone_warm)
		keystone.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON

	# 5. Puerta doble interactiva de roble con tablas, travesaños, bisagras y tiradores
	var door_ctrl := InteractiveDoorScript.new()
	door_ctrl.name = "Door_" + portal_id
	door_ctrl.door_id = door_id
	door_ctrl.door_title = door_title
	door_ctrl.is_open = true
	door_ctrl.open_angle_rad = 1.24
	door_ctrl.interact_radius = 2.90
	door_ctrl.position = Vector3(cx, y0 + 0.04, z_front - 0.58)
	static_portal.add_child(door_ctrl)
	door_ctrl.add_to_group("camera_occluder")

	var leaf_w := (clear_w - 0.12) * 0.5
	var leaf_h := clear_h - 0.24
	var left_piv := Node3D.new()
	left_piv.name = "LeftLeafPivot"
	left_piv.position = Vector3(-leaf_w - 0.02, 0.0, 0.0)
	door_ctrl.add_child(left_piv)
	var right_piv := Node3D.new()
	right_piv.name = "RightLeafPivot"
	right_piv.position = Vector3(leaf_w + 0.02, 0.0, 0.0)
	door_ctrl.add_child(right_piv)

	for leaf_cfg in [[left_piv, 1.0, "Left"], [right_piv, -1.0, "Right"]]:
		var piv: Node3D = leaf_cfg[0]
		var sgn: float = float(leaf_cfg[1])
		var tag: String = str(leaf_cfg[2])
		var cx_l := sgn * (leaf_w * 0.5)
		var plank_count := 4
		var pw := (leaf_w - 0.04) / float(plank_count)
		for pi in range(plank_count):
			var px := sgn * (0.02 + pw * (float(pi) + 0.5))
			var pmat: Material = mat_wood_dark if ((pi + (0 if style == "library_arch" else 1)) % 2 == 0) else mat_wood
			var plank := _box(piv, Vector3(px, leaf_h * 0.5, 0.0), Vector3(pw - 0.015, leaf_h, 0.11), pmat)
			plank.name = "DoorPlank_%s_%d" % [tag, pi]
			plank.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		for rail_y in [0.18, leaf_h * 0.50, leaf_h - 0.18]:
			_box(piv, Vector3(cx_l, rail_y, 0.062), Vector3(leaf_w - 0.04, 0.14, 0.028), mat_wood_dark)
			_box(piv, Vector3(cx_l, rail_y, -0.062), Vector3(leaf_w - 0.04, 0.14, 0.028), mat_wood_dark)
		if style == "refectory_lintel":
			var brace := _box(piv, Vector3(cx_l, leaf_h * 0.5, 0.066), Vector3(0.11, leaf_h * 0.72, 0.024), mat_wood_dark)
			brace.rotation.z = sgn * 0.42
		for strap_y in [0.46, 1.34, 2.20]:
			_box(piv, Vector3(sgn * (leaf_w * 0.40), strap_y, 0.074), Vector3(leaf_w * 0.78, 0.08, 0.024), mat_iron)
			_box(piv, Vector3(sgn * (leaf_w * 0.40), strap_y, -0.074), Vector3(leaf_w * 0.78, 0.08, 0.024), mat_iron)
		var handle_mat: Material = mat_bronze if style == "library_arch" else mat_iron
		_box(piv, Vector3(sgn * (leaf_w - 0.18), 1.18, 0.076), Vector3(0.10, 0.22, 0.024), mat_iron)
		_cyl(piv, Vector3(sgn * (leaf_w - 0.18), 1.16, 0.095), 0.068, 0.036, handle_mat)
		_cyl(piv, Vector3(sgn * (leaf_w - 0.18), 1.16, -0.095), 0.068, 0.036, handle_mat)

	var blk_body := StaticBody3D.new()
	blk_body.name = "DoorBlockerBody"
	door_ctrl.add_child(blk_body)
	var blk_col := CollisionShape3D.new()
	var blk_box := BoxShape3D.new()
	blk_box.size = Vector3(clear_w, leaf_h, 0.28)
	blk_col.shape = blk_box
	blk_col.position = Vector3(0.0, leaf_h * 0.5, 0.0)
	blk_col.disabled = true
	blk_body.add_child(blk_col)

	door_ctrl.left_pivot = left_piv
	door_ctrl.right_pivot = right_piv
	door_ctrl.blocker_shape = blk_col
	door_ctrl.set_open(true, false)

	# 6. Apliques de antorcha montados sobre las pilastras + derrame cálido desde el interior
	for side_v in [-1.0, 1.0]:
		var s := float(side_v)
		var sx := cx + s * (half_w + 0.66)
		var sconce := Node3D.new()
		sconce.name = "PortalSconce_%s_%d" % [portal_id, int(s)]
		sconce.position = Vector3(sx, y0 + 2.02, z_front + 0.34)
		roof_portal.add_child(sconce)
		_box(sconce, Vector3(0.0, 0.0, -0.06), Vector3(0.16, 0.38, 0.08), mat_iron)
		var arm := _cyl(sconce, Vector3(0.0, 0.14, 0.09), 0.048, 0.36, mat_wood_dark)
		arm.rotation.x = 0.24
		_cyl(sconce, Vector3(0.0, 0.28, 0.15), 0.08, 0.06, mat_iron)
		var flm := _cyl(sconce, Vector3(0.0, 0.40, 0.17), 0.075, 0.24, mat_flame)
		flm.add_to_group("night_flame")
		var tl := OmniLight3D.new()
		tl.name = "PortalSconceLight_%s_%d" % [portal_id, int(s)]
		tl.position = Vector3(0.0, 0.48, 0.42)
		tl.light_color = Color(1.0, 0.68, 0.30) if style == "refectory_lintel" else Color(1.0, 0.72, 0.36)
		tl.light_energy = 1.65
		tl.omni_range = 9.5
		sconce.add_child(tl)
		if builder.has_method("register_flame_fx"):
			builder.register_flame_fx(flm, tl, false)

	var spill_light := OmniLight3D.new()
	spill_light.name = "PortalInteriorSpillLight_" + portal_id
	spill_light.position = Vector3(cx, y0 + 2.15, z_front - 1.55)
	spill_light.light_color = Color(1.0, 0.70, 0.32) if style == "refectory_lintel" else Color(1.0, 0.76, 0.42)
	spill_light.light_energy = 2.05
	spill_light.omni_range = 9.0
	static_portal.add_child(spill_light)

	var v_lan := Node3D.new()
	v_lan.name = "VestibuleLantern_" + portal_id
	v_lan.position = Vector3(cx, y0 + 2.52, z_front - 1.15)
	roof_portal.add_child(v_lan)
	_cyl(v_lan, Vector3(0.0, 0.22, 0.0), 0.025, 0.42, mat_iron)
	_box(v_lan, Vector3(0.0, 0.0, 0.0), Vector3(0.24, 0.28, 0.24), mat_iron)
	var v_flm := _box(v_lan, Vector3(0.0, -0.01, 0.0), Vector3(0.16, 0.20, 0.16), mat_flame)
	v_flm.add_to_group("night_flame")
	if builder.has_method("register_flame_fx"):
		builder.register_flame_fx(v_flm, spill_light, false)

	return door_ctrl

# ------------------------------------------------------------------------------
# FASE 1.3: MUROS LATERALES CON ESPESOR/CORONACIÓN Y ESCALERAS ESTE REPARADAS
# ------------------------------------------------------------------------------
static func build_flank_walls_and_east_stairs(
	builder: Node3D,
	a4_shell: Node3D,
	a3_shell: Node3D,
	stairs_parent: Node3D,
	mat_cliff: Material,
	mat_ashlar: Material,
	mat_basalt_carved: Material,
	mat_basalt_dark: Material,
	mat_trail: Material,
	mat_iron: Material,
	mat_flame: Material,
	plate_mesh: Mesh
) -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = 202611223
	var y_up := 18.0
	# Dos tonos armoniosos de caliza envejecida para peldaños y losas (sin efecto tablero de ajedrez)
	var mat_stone_b := create_weathered_ashlar_material(builder, Color("#b8b09c"))
	var mat_stone_c := create_weathered_ashlar_material(builder, Color("#c4bca8"))

	# --------------------------------------------------------------------------
	# A. Flanco Oeste de A4 (x=82.4..83.78, z=49.0..65.4) — integrado en el talud hacia Z7
	# --------------------------------------------------------------------------
	_box(a4_shell, Vector3(98.5, 21.0, 49.05), Vector3(30.0, 6.4, 1.30), mat_basalt_carved)
	_box(a4_shell, Vector3(83.22, 19.55, 57.6), Vector3(1.14, 3.3, 15.8), mat_basalt_carved)
	_box(a4_shell, Vector3(83.32, 21.65, 59.8), Vector3(0.94, 1.4, 11.2), mat_stone_b)
	for bz in [55.2, 60.0, 64.4]:
		var but_w := _box(a4_shell, Vector3(82.62, 19.65, bz), Vector3(0.84, 3.5, 1.16), mat_ashlar)
		but_w.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		var cap_w := _box(a4_shell, Vector3(82.62, 21.48, bz), Vector3(0.94, 0.22, 1.28), mat_ashlar)
		cap_w.rotation.z = 0.14
	# Coronación escalonada solo en el tramo visible sur (z=54..65); al norte se funde bajo el basalto del talud
	for ci in range(8):
		var cz := lerpf(54.4, 64.9, float(ci) / 7.0)
		var cy := lerpf(22.12, 22.42, float(ci) / 7.0) + rng.randf_range(-0.04, 0.04)
		var cope := _box(a4_shell, Vector3(83.30 + rng.randf_range(-0.03, 0.03), cy, cz), Vector3(1.08, 0.24, 1.36), mat_ashlar if ci % 2 == 0 else mat_stone_c)
		cope.rotation.y = rng.randf_range(-0.03, 0.03)
		cope.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	for wsp in [
		[Vector3(81.6, 18.0, 50.8), Vector3(4.2, 4.4, 4.2), -5.0],
		[Vector3(81.6, 17.9, 55.6), Vector3(3.8, 3.4, 3.8), -4.0],
		[Vector3(81.8, 17.9, 60.4), Vector3(3.2, 2.5, 3.2), -6.0],
	]:
		var wm := MeshInstance3D.new()
		wm.name = "A4WestStratifiedShoulder_%d" % int((wsp[0] as Vector3).z)
		wm.mesh = plate_mesh
		wm.material_override = mat_basalt_dark
		wm.position = wsp[0]
		wm.scale = wsp[1]
		wm.rotation_degrees = Vector3(5.0, 12.0, float(wsp[2]))
		wm.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		a4_shell.add_child(wm)

	# --------------------------------------------------------------------------
	# B. Flanco Este de A3 (x=134.65..136.6, z=48.8..65.4) — espesor real, contrafuertes y coronación escalonada
	# --------------------------------------------------------------------------
	_box(a3_shell, Vector3(123.75, 21.0, 48.75), Vector3(22.6, 6.4, 1.25), mat_basalt_carved)
	var e_base := _box(a3_shell, Vector3(135.28, 19.35, 57.1), Vector3(1.48, 2.90, 16.5), mat_basalt_carved)
	e_base.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	var e_upper := _box(a3_shell, Vector3(135.06, 21.65, 58.6), Vector3(1.08, 1.85, 13.4), mat_stone_c)
	e_upper.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	for bz in [52.4, 56.6, 60.4, 64.0]:
		var b_low := _box(a3_shell, Vector3(136.12, 19.15, bz), Vector3(0.86, 2.50, 1.24), mat_basalt_carved)
		b_low.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		var b_up := _box(a3_shell, Vector3(135.92, 20.95, bz), Vector3(0.64, 1.45, 1.08), mat_ashlar)
		b_up.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		var b_cap := _box(a3_shell, Vector3(135.96, 21.78, bz), Vector3(0.76, 0.22, 1.22), mat_ashlar)
		b_cap.rotation.z = -0.18
	for ci in range(10):
		var cz := lerpf(52.2, 64.9, float(ci) / 9.0)
		var cy := lerpf(22.25, 22.62, float(ci) / 9.0) + rng.randf_range(-0.04, 0.04)
		var cope := _box(a3_shell, Vector3(135.08 + rng.randf_range(-0.03, 0.04), cy, cz), Vector3(1.24, 0.26, 1.32), mat_ashlar if ci % 2 == 0 else mat_stone_b)
		cope.rotation.y = rng.randf_range(-0.03, 0.03)
		cope.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	# Hombros basálticos estratificados que funden el extremo norte del muro con la roca de la montaña
	for esp in [
		[Vector3(136.4, 18.2, 49.6), Vector3(4.2, 4.4, 4.2), -6.0],
		[Vector3(136.7, 18.0, 53.8), Vector3(3.4, 2.4, 3.4), -5.0],
	]:
		var em := MeshInstance3D.new()
		em.name = "A3EastStratifiedShoulder_%d" % int((esp[0] as Vector3).z)
		em.mesh = plate_mesh
		em.material_override = mat_basalt_dark
		em.position = esp[0]
		em.scale = esp[1]
		em.rotation_degrees = Vector3(5.0, -14.0, float(esp[2]))
		em.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		a3_shell.add_child(em)

	# --------------------------------------------------------------------------
	# C. Terraza de enlace y Escalera Este al Observatorio (x=135.8..146.5, z=43.5..65.2)
	# --------------------------------------------------------------------------
	var obs_stair_root := Node3D.new()
	obs_stair_root.name = "EastObservatoryStairCraft"
	stairs_parent.add_child(obs_stair_root)

	# Terraza escalonada luminosa entre el muro este de A3 (x=136.0) y la escalera (x=138.8) cerrando por completo el foso oscuro
	var fill_slab := _box(obs_stair_root, Vector3(139.8, y_up - 0.42, 58.6), Vector3(8.8, 0.88, 13.8), mat_basalt_carved)
	fill_slab.name = "ObsTerraceFoundationSlab"
	var west_terrace_a := _box(obs_stair_root, Vector3(137.4, y_up + 0.06, 58.6), Vector3(3.0, 0.24, 12.6), mat_stone_b)
	west_terrace_a.name = "ObsWestStoneTerrace"
	var west_terrace_b := _box(obs_stair_root, Vector3(136.9, y_up + 0.36, 56.2), Vector3(1.9, 0.48, 8.8), mat_basalt_carved)
	west_terrace_b.name = "ObsWestSteppedPlinth"
	var west_terrace_cap := _box(obs_stair_root, Vector3(136.9, y_up + 0.64, 56.2), Vector3(2.02, 0.12, 8.95), mat_ashlar)
	west_terrace_cap.name = "ObsWestSteppedCap"
	# Pequeños bancos de roca basáltica clara + helechos ornamentales suavizando el rincón junto a A3
	var corner_fern_xf: Array[Transform3D] = []
	var corner_fern_col: Array[Color] = []
	for r_z in [54.2, 57.6, 61.2, 63.8]:
		var rk := MeshInstance3D.new()
		rk.mesh = plate_mesh
		rk.material_override = mat_basalt_dark
		rk.position = Vector3(137.15 + rng.randf_range(-0.18, 0.18), y_up + 0.18, r_z)
		rk.scale = Vector3(rng.randf_range(1.4, 1.9), rng.randf_range(0.52, 0.88), rng.randf_range(1.2, 1.6))
		rk.rotation_degrees = Vector3(3.0, rng.randf_range(-25.0, 25.0), -4.0)
		obs_stair_root.add_child(rk)
		for fi in range(3):
			var fb := Basis.from_euler(Vector3(0.0, rng.randf_range(0.0, TAU), 0.0)).scaled(Vector3(0.82, 0.72, 0.82))
			corner_fern_xf.append(Transform3D(fb, Vector3(137.45 + rng.randf_range(-0.4, 0.5), y_up + 0.68, r_z + rng.randf_range(-0.4, 0.4))))
			corner_fern_col.append(Color("#587244"))
	var mm_cf: MultiMeshInstance3D = builder.call("_make_multimesh_batch", "MM_ObsCornerFerns", _make_crevice_fern_mesh(), _make_crevice_foliage_mat(), corner_fern_xf, corner_fern_col)
	mm_cf.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	obs_stair_root.add_child(mm_cf)

	# Pavimento de losas naturales de caliza (sin contraste tablero de ajedrez!) conectando Paseo -> escalera Observatorio
	var flag_mats := [mat_ashlar, mat_stone_c, mat_stone_b]
	for row_i in range(16):
		var fz := lerpf(64.8, 52.2, float(row_i) / 15.0)
		for col_i in range(3):
			var fx := 140.25 + (float(col_i) - 1.0) * 0.84 + rng.randf_range(-0.05, 0.05)
			var slab_w := rng.randf_range(0.75, 0.86)
			var slab_d := rng.randf_range(0.70, 0.82)
			var fm: Material = flag_mats[(row_i * 5 + col_i * 2 + rng.randi_range(0, 1)) % flag_mats.size()]
			var flg := _box(obs_stair_root, Vector3(fx, y_up + 0.022 + rng.randf_range(-0.006, 0.008), fz + rng.randf_range(-0.04, 0.04)), Vector3(slab_w, 0.065, slab_d), fm)
			flg.rotation.y = rng.randf_range(-0.04, 0.04)
			flg.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF

	# Descansillo inferior de piedra tallada al pie de la escalera (z=51.4..52.8) + muretes laterales con albardilla
	var bot_land := _box(obs_stair_root, Vector3(140.25, y_up - 0.06, 52.1), Vector3(3.10, 0.22, 1.65), mat_ashlar)
	bot_land.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	for side_x in [-1.45, 1.45]:
		var curb_w := _box(obs_stair_root, Vector3(140.25 + float(side_x), y_up + 0.24, 58.6), Vector3(0.48, 0.52, 11.8), mat_stone_b)
		curb_w.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		for cap_i in range(9):
			var cz := lerpf(64.1, 53.3, float(cap_i) / 8.0)
			var cap := _box(obs_stair_root, Vector3(140.25 + float(side_x), y_up + 0.54, cz), Vector3(0.56, 0.14, 1.26), mat_ashlar)
			cap.rotation.y = rng.randf_range(-0.025, 0.025)
		var newel := _box(obs_stair_root, Vector3(140.25 + float(side_x) * 1.04, y_up + 0.62, 52.2), Vector3(0.64, 1.28, 0.64), mat_ashlar)
		newel.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		_box(obs_stair_root, Vector3(140.25 + float(side_x) * 1.04, y_up + 1.32, 52.2), Vector3(0.76, 0.16, 0.76), mat_stone_b)

	_build_stone_stair_lantern(builder, obs_stair_root, "ObsStairBaseLantern", Vector3(138.74, y_up + 1.40, 52.2), mat_iron, mat_flame, 1.65, 10.5)

	# Tramo principal escalonado RusticStair_ObsBase con peldaños armoniosos, contrahuellas cerradas, descansillo intermedio y muros con albardilla
	_build_masonry_stone_stair_flight(
		obs_stair_root, "ObsBaseMasonryFlight",
		Vector3(140.25, 18.0, 51.6), Vector3(140.25, 23.0, 44.2),
		2.42, 16, 8,
		mat_ashlar, mat_stone_c, mat_stone_b, mat_basalt_carved, rng, false
	)
	var turn_land := _box(obs_stair_root, Vector3(140.25, 22.15, 44.0), Vector3(3.25, 1.72, 2.85), mat_basalt_carved)
	turn_land.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	_box(obs_stair_root, Vector3(140.25, 23.04, 44.0), Vector3(3.32, 0.12, 2.92), mat_ashlar)
	var turn_newel := _box(obs_stair_root, Vector3(138.80, 23.62, 43.9), Vector3(0.64, 1.24, 0.64), mat_ashlar)
	turn_newel.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	_build_stone_stair_lantern(builder, obs_stair_root, "ObsStairTurnLantern", Vector3(138.80, 24.30, 43.9), mat_iron, mat_flame, 1.50, 10.5)

	# Pulido ladera NE junto a la escalera del Observatorio (x=142.3..152.2, z=48.5..64.8):
	# sustituye el antiguo parche moteado de Babylon por bancales basálticos, murete de contención y helechos/romero costeros
	var obs_east_bank := Node3D.new()
	obs_east_bank.name = "ObsEastBasaltEmbankment"
	obs_stair_root.add_child(obs_east_bank)
	# Murete seco de piedra acompañando el borde este de la escalera inferior
	var east_retain := _box(obs_east_bank, Vector3(142.45, y_up + 0.14, 58.6), Vector3(0.95, 0.42, 12.2), mat_basalt_carved)
	east_retain.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	var east_retain_cap := _box(obs_east_bank, Vector3(142.45, y_up + 0.38, 58.6), Vector3(1.06, 0.10, 12.35), mat_stone_b)
	east_retain_cap.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	# Bancales estratificados de basalto descendiendo hacia el acantilado oriental (armonizados con A2/A3)
	var bank_slab_specs := [
		[Vector3(144.8, y_up - 0.10, 62.6), Vector3(4.8, 0.85, 4.4), Vector3(3.0, 14.0, -5.0)],
		[Vector3(148.6, y_up - 0.18, 62.2), Vector3(5.2, 0.92, 4.8), Vector3(4.0, -18.0, -6.0)],
		[Vector3(145.2, y_up + 0.05, 57.6), Vector3(5.4, 1.05, 5.2), Vector3(4.0, -11.0, -4.0)],
		[Vector3(149.4, y_up - 0.05, 56.8), Vector3(5.6, 1.25, 5.4), Vector3(5.0, 22.0, -6.0)],
		[Vector3(145.4, y_up + 0.32, 52.2), Vector3(5.6, 1.55, 5.4), Vector3(6.0, 16.0, -5.0)],
		[Vector3(149.8, y_up + 0.45, 51.4), Vector3(5.8, 1.85, 5.6), Vector3(7.0, -14.0, -7.0)],
		[Vector3(144.6, y_up + 0.85, 48.2), Vector3(5.2, 2.15, 4.6), Vector3(8.0, -9.0, -4.0)],
	]
	for bsi in range(bank_slab_specs.size()):
		var bsp: Array = bank_slab_specs[bsi]
		var sm := MeshInstance3D.new()
		sm.name = "ObsEastBasaltLedge_%d" % bsi
		sm.mesh = plate_mesh
		sm.material_override = mat_basalt_dark if bsi % 2 == 0 else mat_cliff
		sm.position = bsp[0]
		sm.scale = bsp[1]
		sm.rotation_degrees = bsp[2]
		sm.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		obs_east_bank.add_child(sm)
	# Helechos y matas mediterráneas agrupadas en MultiMesh sobre las juntas de los bancales
	var bank_fern_xfs: Array[Transform3D] = []
	var bank_fern_cols: Array[Color] = []
	var bank_greens: Array[Color] = [Color("#3b5031"), Color("#4a603b"), Color("#566b45"), Color("#33462c")]
	for fi in range(28):
		var fx := rng.randf_range(143.0, 151.2)
		var fz := rng.randf_range(49.2, 64.2)
		var fy := y_up + lerpf(0.75, 1.85, clampf((64.5 - fz) / 15.0, 0.0, 1.0)) * 0.55 + rng.randf_range(0.05, 0.35)
		var fsc := rng.randf_range(0.72, 1.25)
		var fb := Basis.from_euler(Vector3(rng.randf_range(-0.10, 0.10), rng.randf_range(0.0, TAU), rng.randf_range(-0.10, 0.10))).scaled(Vector3(fsc * 1.15, fsc * 0.88, fsc * 1.15))
		bank_fern_xfs.append(Transform3D(fb, Vector3(fx, fy, fz)))
		bank_fern_cols.append(bank_greens[fi % bank_greens.size()])
	var mm_bf: MultiMeshInstance3D = builder.call("_make_multimesh_batch", "MM_ObsEastBankFerns", _make_crevice_fern_mesh(), _make_crevice_foliage_mat(), bank_fern_xfs, bank_fern_cols)
	mm_bf.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	obs_east_bank.add_child(mm_bf)

	# --------------------------------------------------------------------------
	# D. Escalera Este Paseo Superior -> A2 (x=145.2..153.55, z=67.5, y=18.0 -> 15.0)
	# --------------------------------------------------------------------------
	var a2_stair_root := Node3D.new()
	a2_stair_root.name = "EastPaseoToA2StairCraft"
	stairs_parent.add_child(a2_stair_root)

	_build_masonry_stone_stair_flight(
		a2_stair_root, "PaseoToA2MasonryFlight",
		Vector3(145.2, 18.0, 67.5), Vector3(153.55, 15.0, 67.5),
		3.25, 13, -1,
		mat_ashlar, mat_stone_c, mat_stone_b, mat_stone_b, rng, true
	)
	for head_z in [65.58, 69.42]:
		var hp := _box(a2_stair_root, Vector3(145.15, 18.62, float(head_z)), Vector3(0.62, 1.26, 0.62), mat_ashlar)
		hp.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		_box(a2_stair_root, Vector3(145.15, 19.30, float(head_z)), Vector3(0.74, 0.14, 0.74), mat_stone_b)
	_build_stone_stair_lantern(builder, a2_stair_root, "PaseoToA2HeadLantern", Vector3(145.15, 19.40, 65.58), mat_iron, mat_flame, 1.55, 10.5)

	# Contrafuertes rocosos cimentando el pretil sur sin invadir jamás los peldaños ni el borde
	for ab_i in range(4):
		var t := float(ab_i) / 3.0
		var ax := lerpf(146.2, 151.8, t)
		var ay := lerpf(12.6, 10.6, t)
		var ab := MeshInstance3D.new()
		ab.mesh = plate_mesh
		ab.material_override = mat_basalt_dark
		ab.position = Vector3(ax, ay, 70.95 + rng.randf_range(-0.10, 0.10))
		ab.scale = Vector3(3.2, 2.2, 2.0)
		ab.rotation_degrees = Vector3(4.0, float(ab_i) * 18.0 - 10.0, -4.0)
		a2_stair_root.add_child(ab)

static func _build_masonry_stone_stair_flight(
	parent: Node3D,
	flight_name: String,
	a: Vector3,
	b: Vector3,
	width: float,
	step_count: int,
	landing_step_idx: int,
	mat_tread_a: Material,
	mat_tread_b: Material,
	mat_wall: Material,
	mat_riser: Material,
	rng: RandomNumberGenerator,
	open_south_end_for_east_stairs: bool = false
) -> void:
	var fl := Node3D.new()
	fl.name = flight_name
	parent.add_child(fl)
	var delta_v := b - a
	var horiz := Vector3(delta_v.x, 0.0, delta_v.z)
	var flat_len := horiz.length()
	var dir_xz := horiz.normalized()
	var right_xz := Vector3(dir_xz.z, 0.0, -dir_xz.x).normalized()
	var yaw := atan2(dir_xz.x, dir_xz.z)
	var step_run := flat_len / float(maxi(1, step_count))
	var min_y := minf(a.y, b.y) - 1.45

	for i in range(step_count + 1):
		var t := float(i) / float(maxi(1, step_count))
		var p := a.lerp(b, t)
		var is_landing := (landing_step_idx >= 0 and i == landing_step_idx)
		var tread_d := (step_run * 1.95) if is_landing else (step_run + 0.14)
		var tread_w := width + rng.randf_range(-0.05, 0.06)
		var tread_h := 0.14

		var body_h := maxf(0.45, (p.y - tread_h * 0.5) - min_y)
		var riser := _box(fl, Vector3(p.x, min_y + body_h * 0.5, p.z), Vector3(width - 0.04, body_h, tread_d * 0.96), mat_riser)
		riser.rotation.y = yaw
		riser.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON

		# Tonos suaves y orgánicos en peldaños (sin rayas cebra)
		var tread := _box(fl, Vector3(p.x, p.y - tread_h * 0.5 + 0.015, p.z), Vector3(tread_w, tread_h, tread_d), mat_tread_a if (i % 3 != 1) else mat_tread_b)
		tread.rotation.y = yaw + rng.randf_range(-0.016, 0.016)
		tread.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON

		for s_side in [-1.0, 1.0]:
			var side_off := right_xz * (float(s_side) * (width * 0.5 + 0.22))
			if open_south_end_for_east_stairs and side_off.z > 0.0 and p.x >= 152.0:
				continue
			var wall_top_y := p.y + 0.52 + (0.04 if is_landing else 0.0)
			var wall_h := maxf(0.75, wall_top_y - min_y)
			var wblk := _box(fl, Vector3(p.x + side_off.x, min_y + wall_h * 0.5, p.z + side_off.z), Vector3(0.46, wall_h, step_run + 0.16), mat_wall)
			wblk.rotation.y = yaw
			wblk.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
			if i % 2 == 0 or is_landing or i == step_count:
				var c_len := (step_run * 2.08) if not is_landing else (step_run * 2.20)
				var cope := _box(fl, Vector3(p.x + side_off.x, wall_top_y + 0.07, p.z + side_off.z), Vector3(0.56, 0.15, c_len), mat_tread_a)
				cope.rotation.y = yaw + rng.randf_range(-0.022, 0.022)
				cope.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON

static func _build_stone_stair_lantern(
	builder: Node3D,
	parent: Node3D,
	l_name: String,
	pos: Vector3,
	mat_iron: Material,
	mat_flame: Material,
	energy: float,
	omni_range: float
) -> void:
	var ln := Node3D.new()
	ln.name = l_name
	ln.position = pos
	parent.add_child(ln)
	_box(ln, Vector3(0.0, 0.08, 0.0), Vector3(0.28, 0.14, 0.28), mat_iron)
	_box(ln, Vector3(0.0, 0.30, 0.0), Vector3(0.22, 0.30, 0.22), mat_iron)
	var flm := _box(ln, Vector3(0.0, 0.30, 0.0), Vector3(0.15, 0.22, 0.15), mat_flame)
	flm.add_to_group("night_flame")
	_box(ln, Vector3(0.0, 0.48, 0.0), Vector3(0.30, 0.08, 0.30), mat_iron)
	var ol := OmniLight3D.new()
	ol.name = l_name + "_Light"
	ol.position = Vector3(0.0, 0.42, 0.28)
	ol.light_color = Color(1.0, 0.72, 0.34)
	ol.light_energy = energy
	ol.omni_range = omni_range
	ln.add_child(ol)
	if builder.has_method("register_flame_fx"):
		builder.register_flame_fx(flm, ol, false)

# ------------------------------------------------------------------------------
# UTILIDADES DE MALLA Y PRIMITIVAS
# ------------------------------------------------------------------------------
static func _make_crevice_foliage_mat() -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = Color.WHITE
	m.vertex_color_use_as_albedo = true
	m.vertex_color_is_srgb = true
	m.roughness = 0.86
	m.cull_mode = BaseMaterial3D.CULL_DISABLED
	m.backlight_enabled = true
	m.backlight = Color(0.11, 0.17, 0.07)
	return m

static func _make_crevice_ivy_mat() -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = Color("#466039")
	m.roughness = 0.86
	m.cull_mode = BaseMaterial3D.CULL_DISABLED
	m.backlight_enabled = true
	m.backlight = Color(0.09, 0.15, 0.06)
	return m

static func _make_crevice_fern_mesh() -> ArrayMesh:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var rng := RandomNumberGenerator.new()
	rng.seed = 44123
	for i in range(6):
		var ang := (float(i) / 6.0) * TAU + rng.randf_range(-0.22, 0.22)
		var dir := Vector3(cos(ang), rng.randf_range(0.28, 0.62), sin(ang)).normalized()
		var length := rng.randf_range(0.48, 0.82)
		var width := length * 0.28
		var right := dir.cross(Vector3.UP).normalized()
		var up := right.cross(dir).normalized()
		var root := Vector3(cos(ang) * 0.05, 0.0, sin(ang) * 0.05)
		var mid := root + dir * (length * 0.52) + up * 0.12
		var tip := root + dir * length - Vector3(0.0, 0.08, 0.0)
		var c0 := Color(0.75, 0.82, 0.70)
		var c1 := Color(0.96, 1.0, 0.90)
		st.set_color(c0); st.add_vertex(root)
		st.set_color(c1); st.add_vertex(mid - right * width)
		st.set_color(c1); st.add_vertex(tip)
		st.set_color(c0); st.add_vertex(root)
		st.set_color(c1); st.add_vertex(tip)
		st.set_color(c1); st.add_vertex(mid + right * width)
	st.generate_normals()
	return st.commit()

static func _make_crevice_ivy_mesh() -> ArrayMesh:
	# Zarcillos colgantes orgánicos de hojas asimétricas alternadas (sin filas geométricas de rombos)
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var rng := RandomNumberGenerator.new()
	rng.seed = 55391
	for strand in range(3):
		var base_x := (float(strand) - 1.0) * rng.randf_range(0.18, 0.28)
		var leaf_n := 4 + (strand % 2)
		for li in range(leaf_n):
			var t := float(li) / float(maxi(1, leaf_n - 1))
			var ly := -t * rng.randf_range(0.72, 0.96)
			var lx := base_x + sin(t * 4.2 + float(strand) * 1.7) * 0.12
			var lz := 0.03 + cos(t * 3.1 + float(strand)) * 0.05
			var sgn := -1.0 if (li % 2 == 0) else 1.0
			var w := rng.randf_range(0.09, 0.17) * (1.15 - t * 0.35)
			var h := rng.randf_range(0.14, 0.22) * (1.15 - t * 0.35)
			var p0 := Vector3(lx, ly, lz)
			var p1 := Vector3(lx + sgn * w * 1.15, ly - h * 0.35, lz + 0.06)
			var p2 := Vector3(lx + sgn * w * 0.55, ly - h, lz + 0.02)
			var p3 := Vector3(lx - sgn * w * 0.35, ly - h * 0.55, lz + 0.04)
			st.add_vertex(p0); st.add_vertex(p1); st.add_vertex(p2)
			st.add_vertex(p0); st.add_vertex(p2); st.add_vertex(p3)
	st.generate_normals()
	return st.commit()

static func _emit_quad_grid_xz(st: SurfaceTool, p0: Vector3, p1: Vector3, p2: Vector3, p3: Vector3, c0: Color, c1: Color, c2: Color, c3: Color) -> void:
	st.set_color(c0); st.set_uv(Vector2(p0.x * 0.2, p0.z * 0.2)); st.add_vertex(p0)
	st.set_color(c1); st.set_uv(Vector2(p1.x * 0.2, p1.z * 0.2)); st.add_vertex(p1)
	st.set_color(c2); st.set_uv(Vector2(p2.x * 0.2, p2.z * 0.2)); st.add_vertex(p2)
	st.set_color(c0); st.set_uv(Vector2(p0.x * 0.2, p0.z * 0.2)); st.add_vertex(p0)
	st.set_color(c2); st.set_uv(Vector2(p2.x * 0.2, p2.z * 0.2)); st.add_vertex(p2)
	st.set_color(c3); st.set_uv(Vector2(p3.x * 0.2, p3.z * 0.2)); st.add_vertex(p3)

static func _emit_quad_cw(st: SurfaceTool, p0: Vector3, p1: Vector3, p2: Vector3, p3: Vector3, c0: Color, c1: Color, c2: Color, c3: Color) -> void:
	st.set_color(c0); st.set_uv(Vector2(p0.x * 0.2, p0.z * 0.2)); st.add_vertex(p0)
	st.set_color(c3); st.set_uv(Vector2(p3.x * 0.2, p3.z * 0.2)); st.add_vertex(p3)
	st.set_color(c2); st.set_uv(Vector2(p2.x * 0.2, p2.z * 0.2)); st.add_vertex(p2)
	st.set_color(c0); st.set_uv(Vector2(p0.x * 0.2, p0.z * 0.2)); st.add_vertex(p0)
	st.set_color(c2); st.set_uv(Vector2(p2.x * 0.2, p2.z * 0.2)); st.add_vertex(p2)
	st.set_color(c1); st.set_uv(Vector2(p1.x * 0.2, p1.z * 0.2)); st.add_vertex(p1)

static func _box(parent: Node3D, pos: Vector3, size: Vector3, mat: Material) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = size
	mi.mesh = bm
	mi.material_override = mat
	mi.position = pos
	parent.add_child(mi)
	return mi

static func _cyl(parent: Node3D, pos: Vector3, radius: float, height: float, mat: Material) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	var cm := CylinderMesh.new()
	cm.top_radius = radius
	cm.bottom_radius = radius
	cm.height = height
	cm.radial_segments = 10
	mi.mesh = cm
	mi.material_override = mat
	mi.position = pos
	parent.add_child(mi)
	return mi
