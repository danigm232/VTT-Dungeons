extends RefCounted

# ==============================================================================
# GEOMETRÍA, MATERIALES GEOLÓGICOS Y RECORTES GLB CANÓNICOS PARA A1
# Compartido directamente por godot-retiro (FULL_RETREAT) y godot-campamentos (A1_CAMP).
# ==============================================================================

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

static func _fract_f(v: float) -> float:
	return v - floorf(v)

static func _emit_quad_grid_xz(st: SurfaceTool, p0: Vector3, p1: Vector3, p2: Vector3, p3: Vector3, c0: Color, c1: Color, c2: Color, c3: Color) -> void:
	st.set_color(c0); st.add_vertex(p0)
	st.set_color(c1); st.add_vertex(p1)
	st.set_color(c2); st.add_vertex(p2)
	st.set_color(c0); st.add_vertex(p0)
	st.set_color(c2); st.add_vertex(p2)
	st.set_color(c3); st.add_vertex(p3)

static func _emit_quad_cw(st: SurfaceTool, p0: Vector3, p1: Vector3, p2: Vector3, p3: Vector3, c0: Color, c1: Color, c2: Color, c3: Color) -> void:
	st.set_color(c0); st.add_vertex(p0)
	st.set_color(c2); st.add_vertex(p2)
	st.set_color(c1); st.add_vertex(p1)
	st.set_color(c0); st.add_vertex(p0)
	st.set_color(c3); st.add_vertex(p3)
	st.set_color(c2); st.add_vertex(p2)

static func _emit_botanical_leaf(st: SurfaceTool, root: Vector3, dir: Vector3, length: float, width: float, arch: float, c_base: Color, c_tip: Color) -> void:
	var f := dir.normalized()
	var right := f.cross(Vector3.UP)
	if right.length_squared() < 0.001:
		right = Vector3.RIGHT
	right = right.normalized() * (width * 0.5)
	var up := right.cross(f).normalized()
	var mid := root + f * (length * 0.52) + up * arch
	var tip := root + f * length + up * (arch * 0.35)
	var ml := mid - right
	var mr := mid + right
	var c_mid := c_base.lerp(c_tip, 0.55)
	st.set_color(c_base); st.add_vertex(root)
	st.set_color(c_mid); st.add_vertex(mr)
	st.set_color(c_mid); st.add_vertex(ml)
	st.set_color(c_mid); st.add_vertex(ml)
	st.set_color(c_mid); st.add_vertex(mr)
	st.set_color(c_tip); st.add_vertex(tip)

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

static func create_dark_basalt_slab_material(builder: Node3D) -> StandardMaterial3D:
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

static func create_rope_material(builder: Node3D) -> StandardMaterial3D:
	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color("#b99c6d")
	mat.roughness = 0.90
	mat.metallic = 0.0
	var tex: Texture2D = builder.call("_load_tex", "wool-v4.webp")
	if tex:
		mat.albedo_texture = tex
		mat.uv1_triplanar = true
		mat.uv1_scale = Vector3(1.6, 1.6, 1.6)
	return mat

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

	var grid: Array = []
	for iz in range(nz + 1):
		var fz := float(iz) / float(nz)
		var z := lerpf(z0, z1, fz)
		var row_pts: Array[Vector3] = []
		var row_meta: Array[Dictionary] = []
		for ix in range(nx + 1):
			var fx := float(ix) / float(nx)
			var x := lerpf(x0, x1, fx)

			var macro_mass := (_fbm2(x * 0.085 + 2.1, z * 0.10 - 1.4) - 0.5) * (2.85 if is_upper_mountain else 1.55)
			var fault_raw := absf(_vnoise2(x * 0.21 + z * 0.055 + 7.3, z * 0.068 + 3.1) - 0.5) * 2.0
			var fissure := clampf(1.0 - smoothstep(0.0, 0.22, fault_raw), 0.0, 1.0)
			var slope_t := pow(fz, 0.80 if is_upper_mountain else 0.76)
			var raw_y := lerpf(back_y, front_y, slope_t) + macro_mass * (1.0 - 0.50 * fz)
			var dip_offset := (x - 105.0) * 0.075
			var strata_freq := 0.68 if is_upper_mountain else 0.82
			var strata_v := (raw_y - dip_offset) * strata_freq
			var terraced_y := _stepped_strata(strata_v, 0.76) / strata_freq + dip_offset
			var facet := (_fbm2(x * 0.44 - 4.7, z * 0.48 + 8.9) - 0.5) * 0.62
			var y := terraced_y + facet - fissure * (1.05 if is_upper_mountain else 0.58)

			var z_bulge := 0.0
			if fz > 0.20 and fz < 0.98:
				var bulge_env := sin(clampf((fz - 0.20) / 0.78, 0.0, 1.0) * PI)
				var step_lip := (1.0 - smoothstep(0.0, 0.35, _fract_f(strata_v))) * 0.42
				z_bulge = ((_fbm2(x * 0.17 + 5.2, z * 0.20) - 0.44) * 1.15 + step_lip - fissure * 0.62) * bulge_env

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
				"strata_frac": _fract_f(strata_v),
				"fz": fz,
				"door_dist": door_dist
			})
		grid.append({"pts": row_pts, "meta": row_meta})

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

			var warm_band := _vnoise2(p.x * 0.14 + 3.7, p.y * 0.58)
			var sun_face := clampf(n_approx.y * 0.60 + n_approx.z * 0.40, 0.0, 1.0)
			var base_stone := rock_col.lerp(rock_col.lightened(0.22), clampf(warm_band * 0.65 + sun_face * 0.25, 0.0, 0.78))
			var ledge_shadow := 0.22 if strata_frac < 0.20 else 0.0
			var damp_base := clampf((fz - 0.74) * 0.36, 0.0, 0.16)
			var shade := clampf(fissure * 0.30 + ledge_shadow + damp_base, 0.0, 0.40)
			var col := base_stone.darkened(shade)
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

static func make_angular_basalt_plate_mesh(seed_val: int = 811) -> ArrayMesh:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	st.set_smooth_group(-1)
	var rng := RandomNumberGenerator.new()
	rng.seed = seed_val

	var base_poly: Array[Vector2] = [
		Vector2(-0.52, -0.34), Vector2(-0.18, -0.44), Vector2(0.24, -0.40), Vector2(0.54, -0.22),
		Vector2(0.48, 0.26), Vector2(0.14, 0.42), Vector2(-0.28, 0.38), Vector2(-0.54, 0.14)
	]
	for i in range(base_poly.size()):
		base_poly[i] += Vector2(rng.randf_range(-0.06, 0.06), rng.randf_range(-0.05, 0.05))

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
			var dip := -p2.x * 0.09
			var top_sc := 0.92
			bot_ring.append(Vector3(p2.x, y0 + dip * 0.4, p2.y))
			top_ring.append(Vector3(p2.x * top_sc + off.x * 0.1, y1 + dip + rng.randf_range(-0.025, 0.025), p2.y * top_sc + off.y * 0.1))

		for i in range(n):
			var ni := (i + 1) % n
			var edge := (bot_ring[ni] - bot_ring[i]).normalized()
			var face_shade := clampf(edge.x * 0.12 + rng.randf_range(-0.05, 0.05), -0.14, 0.14)
			var cb := c_bot.lightened(face_shade) if face_shade >= 0.0 else c_bot.darkened(-face_shade)
			var ct := c_top.lightened(face_shade) if face_shade >= 0.0 else c_top.darkened(-face_shade)
			_emit_quad_cw(st, bot_ring[ni], bot_ring[i], top_ring[i], top_ring[ni], cb, cb, ct, ct)

		var center := Vector3(off.x, y1 + 0.03, off.y)
		for i in range(n):
			var ni := (i + 1) % n
			st.set_color(c_cap); st.add_vertex(top_ring[ni])
			st.set_color(c_cap); st.add_vertex(center)
			st.set_color(c_cap); st.add_vertex(top_ring[i])

	st.generate_normals()
	return st.commit()

static func make_layered_cliff_crag_mesh(seed_val: int = 701) -> ArrayMesh:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var rng := RandomNumberGenerator.new()
	rng.seed = seed_val
	var sides := 8
	var levels := [
		{"y": 0.00, "r": 0.66, "col": Color(0.36, 0.37, 0.38)},
		{"y": 0.34, "r": 0.62, "col": Color(0.44, 0.45, 0.44)},
		{"y": 0.68, "r": 0.54, "col": Color(0.50, 0.51, 0.49)},
		{"y": 0.96, "r": 0.42, "col": Color(0.46, 0.50, 0.43)},
	]
	var rings: Array[Array] = []
	for li in range(levels.size()):
		var ring: Array[Vector3] = []
		var ly := float(levels[li]["y"])
		var lr := float(levels[li]["r"])
		for s in range(sides):
			var ang := (float(s) / float(sides)) * TAU + float(li) * 0.11
			var jitter := rng.randf_range(0.82, 1.18)
			var yj := rng.randf_range(-0.04, 0.05) if li > 0 else 0.0
			ring.append(Vector3(cos(ang) * lr * jitter, ly + yj, sin(ang) * lr * jitter))
		rings.append(ring)

	for li in range(levels.size() - 1):
		var c0: Color = levels[li]["col"]
		var c1: Color = levels[li + 1]["col"]
		for s in range(sides):
			var ns := (s + 1) % sides
			_emit_quad_cw(st, rings[li][ns], rings[li][s], rings[li + 1][s], rings[li + 1][ns], c0, c0, c1, c1)

	var top_ring: Array = rings[rings.size() - 1]
	var apex := Vector3(rng.randf_range(-0.05, 0.05), 1.01, rng.randf_range(-0.05, 0.05))
	var c_top := Color(0.44, 0.51, 0.40)
	for s in range(sides):
		var ns := (s + 1) % sides
		st.set_color(c_top); st.add_vertex(top_ring[ns])
		st.set_color(c_top); st.add_vertex(apex)
		st.set_color(c_top); st.add_vertex(top_ring[s])

	st.generate_normals()
	return st.commit()

static func make_botanical_shrub_mesh() -> ArrayMesh:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var rng := RandomNumberGenerator.new()
	rng.seed = 4099
	for i in range(13):
		var a := (float(i) / 13.0) * TAU + rng.randf_range(-0.22, 0.22)
		var tilt := rng.randf_range(0.24, 0.72)
		var dir := Vector3(cos(a) * cos(tilt), sin(tilt), sin(a) * cos(tilt))
		var len_v := rng.randf_range(0.38, 0.62)
		var w_v := rng.randf_range(0.15, 0.24)
		_emit_botanical_leaf(st, Vector3(cos(a) * 0.05, 0.02, sin(a) * 0.05), dir, len_v, w_v, 0.06, Color(0.68, 0.78, 0.62), Color(0.96, 1.0, 0.88))
	st.generate_normals()
	return st.commit()

static func make_grass_tuft_mesh() -> ArrayMesh:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var blades := 7
	for i in range(blades):
		var ang := (float(i) / float(blades)) * TAU + float(i % 2) * 0.25
		var dist := 0.08 + float(i % 3) * 0.07
		var bx := cos(ang) * dist
		var bz := sin(ang) * dist
		var tx := cos(ang) * (dist + 0.24)
		var tz := sin(ang) * (dist + 0.24)
		var w := 0.085
		var h := 0.42 + float(i % 3) * 0.14
		var right := Vector3(-sin(ang) * w, 0.0, cos(ang) * w)
		var p0 := Vector3(bx, 0.0, bz) - right
		var p1 := Vector3(bx, 0.0, bz) + right
		var tip := Vector3(tx, h, tz)
		var c_base := Color(0.56, 0.68, 0.50)
		var c_tip := Color(0.92, 0.94, 0.82)
		st.set_color(c_base); st.add_vertex(p0)
		st.set_color(c_tip); st.add_vertex(tip)
		st.set_color(c_base); st.add_vertex(p1)
	st.generate_normals()
	return st.commit()

static func make_fern_cluster_mesh() -> ArrayMesh:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var fronds := 8
	for i in range(fronds):
		var ang := (float(i) / float(fronds)) * TAU
		var dir := Vector3(cos(ang), 0.0, sin(ang))
		var right := Vector3(-dir.z * 0.13, 0.0, dir.x * 0.13)
		var base := Vector3(0.0, 0.04, 0.0)
		var mid_l := dir * 0.36 + Vector3(0.0, 0.34, 0.0) - right
		var mid_r := dir * 0.36 + Vector3(0.0, 0.34, 0.0) + right
		var tip := dir * 0.68 + Vector3(0.0, 0.14, 0.0)
		var c_in := Color(0.66, 0.80, 0.58)
		var c_out := Color(0.98, 1.0, 0.86)
		st.set_color(c_in); st.add_vertex(base)
		st.set_color(c_out); st.add_vertex(mid_r)
		st.set_color(c_out); st.add_vertex(mid_l)
		st.set_color(c_out); st.add_vertex(mid_l)
		st.set_color(c_out); st.add_vertex(mid_r)
		st.set_color(c_out); st.add_vertex(tip)
	st.generate_normals()
	return st.commit()

static func make_hanging_ivy_mesh() -> ArrayMesh:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	for strand in range(3):
		var spread := (float(strand) - 1.0) * 0.24
		var c_base := Color(0.42, 0.54, 0.38)
		var c_tip := Color(0.82, 0.90, 0.70)
		for step in range(4):
			var fy := -float(step) * 0.22 - (0.06 if strand == 1 else 0.02)
			var fz := 0.08 + sin(float(step) * 0.9 + float(strand)) * 0.05
			var root := Vector3(spread * (1.0 + float(step) * 0.18), fy, fz)
			var side := 1.0 if step % 2 == 0 else -1.0
			var dir := Vector3(side * 0.42 + spread * 0.3, -0.78, 0.48).normalized()
			var sz := 0.28 - float(step) * 0.03
			_emit_botanical_leaf(st, root, dir, sz, sz * 0.44, 0.03, c_base, c_tip)
	st.generate_normals()
	return st.commit()

static func make_blossom_cluster_mesh() -> ArrayMesh:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var centers := [
		{"pos": Vector3(0.0, 0.06, 0.0), "sc": 1.0, "tilt": Vector3(0.08, 0.0, 0.0)},
		{"pos": Vector3(0.24, -0.02, 0.14), "sc": 0.82, "tilt": Vector3(0.28, 0.4, -0.22)},
		{"pos": Vector3(-0.22, 0.01, -0.14), "sc": 0.86, "tilt": Vector3(-0.22, -0.5, 0.25)},
	]
	for fc in centers:
		var base: Vector3 = fc["pos"]
		var sc := float(fc["sc"])
		var basis := Basis.from_euler(fc["tilt"])
		var stamen := Color(1.0, 0.90, 0.56)
		var petal_in := Color(0.86, 0.84, 0.84)
		var petal_out := Color(1.0, 0.99, 0.97)
		for p in range(5):
			var a := float(p) / 5.0 * TAU
			var dir := basis * Vector3(cos(a), 0.18, sin(a)).normalized()
			_emit_botanical_leaf(st, base, dir, 0.30 * sc, 0.14 * sc, 0.04 * sc, petal_in, petal_out)
		var apex := base + basis * Vector3(0.0, 0.08 * sc, 0.0)
		for p in range(5):
			var a0 := float(p) / 5.0 * TAU
			var a1 := float(p + 1) / 5.0 * TAU
			var q0 := base + basis * Vector3(cos(a0) * 0.085 * sc, 0.02 * sc, sin(a0) * 0.085 * sc)
			var q1 := base + basis * Vector3(cos(a1) * 0.085 * sc, 0.02 * sc, sin(a1) * 0.085 * sc)
			st.set_color(stamen); st.add_vertex(q0)
			st.set_color(stamen); st.add_vertex(apex)
			st.set_color(stamen); st.add_vertex(q1)
	st.generate_normals()
	return st.commit()

static func build_perimeter_rope_run(
	parent: Node3D,
	run_name: String,
	pts: Array[Vector3],
	mat_post: Material,
	mat_iron: Material,
	mat_rope: Material,
	post_rad: float = 0.080,
	post_h: float = 1.08,
	mid_h: float = 0.62,
	sag: float = 0.075
) -> Node3D:
	var root := Node3D.new()
	root.name = run_name
	parent.add_child(root)
	if pts.size() < 2:
		return root

	var post_xfs: Array[Transform3D] = []
	var cap_xfs: Array[Transform3D] = []
	var rope_xfs: Array[Transform3D] = []

	for i in range(pts.size()):
		var p := pts[i]
		post_xfs.append(Transform3D(Basis().scaled(Vector3(post_rad * 2.0, post_h, post_rad * 2.0)), p + Vector3(0.0, post_h * 0.5, 0.0)))
		cap_xfs.append(Transform3D(Basis().scaled(Vector3(post_rad * 2.35, 0.07, post_rad * 2.35)), p + Vector3(0.0, post_h + 0.025, 0.0)))
		if i < pts.size() - 1:
			var a := pts[i]
			var b := pts[i + 1]
			var segs := 5
			for h_off in [post_h - 0.14, mid_h]:
				for s in range(segs):
					var t0 := float(s) / float(segs)
					var t1 := float(s + 1) / float(segs)
					var p0 := a.lerp(b, t0) + Vector3(0.0, float(h_off) - sin(t0 * PI) * sag, 0.0)
					var p1 := a.lerp(b, t1) + Vector3(0.0, float(h_off) - sin(t1 * PI) * sag, 0.0)
					var mid := (p0 + p1) * 0.5
					var d := p1 - p0
					var l := d.length()
					if l < 0.01:
						continue
					var basis := Basis.looking_at(d.normalized(), Vector3.UP)
					basis = basis.scaled_local(Vector3(0.056, 0.056, l + 0.025))
					rope_xfs.append(Transform3D(basis, mid))

	var cyl := CylinderMesh.new()
	cyl.top_radius = 0.5; cyl.bottom_radius = 0.5; cyl.height = 1.0; cyl.radial_segments = 8
	var box := BoxMesh.new()
	box.size = Vector3.ONE

	_add_mm(root, "MM_Posts", cyl, mat_post, post_xfs, true)
	_add_mm(root, "MM_Caps", cyl, mat_iron, cap_xfs, false)
	_add_mm(root, "MM_Ropes", box, mat_rope, rope_xfs, false)
	return root

static func _add_mm(parent: Node3D, mname: String, mesh: Mesh, mat: Material, xfs: Array[Transform3D], cast_shadow: bool) -> void:
	if xfs.is_empty():
		return
	var mm := MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	mm.mesh = mesh
	mm.instance_count = xfs.size()
	for i in range(xfs.size()):
		mm.set_instance_transform(i, xfs[i])
	var mmi := MultiMeshInstance3D.new()
	mmi.name = mname
	mmi.multimesh = mm
	mmi.material_override = mat
	mmi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON if cast_shadow else GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parent.add_child(mmi)

# Recorta triángulos de una malla GLB fuera del volumen A1_CAMP para evitar geometría de otros sectores
# Devuelve true si quedan triángulos válidos dentro del volumen; false si la malla debe descartarse.
static func clip_mesh_to_aabb(m_inst: MeshInstance3D, clip_min: Vector3, clip_max: Vector3) -> bool:
	if m_inst == null or m_inst.mesh == null or m_inst.mesh.get_surface_count() == 0:
		return false
	var xf := m_inst.transform
	var world_aabb := xf * m_inst.get_aabb()
	var clip_box := AABB(clip_min, clip_max - clip_min)
	if not world_aabb.intersects(clip_box):
		return false
	# Si la malla entera cabe ya dentro de la envolvente, conservar intacta sin reconstruir
	if clip_box.encloses(world_aabb):
		return true

	var src := m_inst.mesh
	var out_mesh := ArrayMesh.new()
	var kept_total := 0
	var is_ident := xf.is_equal_approx(Transform3D.IDENTITY)
	var min_x := clip_min.x; var min_y := clip_min.y; var min_z := clip_min.z
	var max_x := clip_max.x; var max_y := clip_max.y; var max_z := clip_max.z

	for s in range(src.get_surface_count()):
		var arrays := src.surface_get_arrays(s)
		if arrays.is_empty():
			continue
		var verts: PackedVector3Array = arrays[Mesh.ARRAY_VERTEX]
		if verts.is_empty():
			continue
		var norms: PackedVector3Array = arrays[Mesh.ARRAY_NORMAL] if arrays.size() > Mesh.ARRAY_NORMAL and arrays[Mesh.ARRAY_NORMAL] != null else PackedVector3Array()
		var uvs: PackedVector2Array = arrays[Mesh.ARRAY_TEX_UV] if arrays.size() > Mesh.ARRAY_TEX_UV and arrays[Mesh.ARRAY_TEX_UV] != null else PackedVector2Array()
		var cols: PackedColorArray = arrays[Mesh.ARRAY_COLOR] if arrays.size() > Mesh.ARRAY_COLOR and arrays[Mesh.ARRAY_COLOR] != null else PackedColorArray()
		var indices: PackedInt32Array = arrays[Mesh.ARRAY_INDEX] if arrays.size() > Mesh.ARRAY_INDEX and arrays[Mesh.ARRAY_INDEX] != null else PackedInt32Array()

		var vcount := verts.size()
		var has_n := norms.size() == vcount
		var has_uv := uvs.size() == vcount
		var has_col := cols.size() == vcount
		var use_idx := indices.size() >= 3
		var count := indices.size() if use_idx else vcount

		var remap := PackedInt32Array()
		remap.resize(vcount)
		remap.fill(-1)

		var out_v := PackedVector3Array()
		var out_n := PackedVector3Array()
		var out_uv := PackedVector2Array()
		var out_c := PackedColorArray()
		var out_i := PackedInt32Array()
		var kept_s := 0

		for i in range(0, count - 2, 3):
			var i0 := indices[i] if use_idx else i
			var i1 := indices[i + 1] if use_idx else i + 1
			var i2 := indices[i + 2] if use_idx else i + 2
			var w0 := verts[i0] if is_ident else (xf * verts[i0])
			var w1 := verts[i1] if is_ident else (xf * verts[i1])
			var w2 := verts[i2] if is_ident else (xf * verts[i2])
			if (w0.x < min_x and w1.x < min_x and w2.x < min_x) or (w0.x > max_x and w1.x > max_x and w2.x > max_x):
				continue
			if (w0.z < min_z and w1.z < min_z and w2.z < min_z) or (w0.z > max_z and w1.z > max_z and w2.z > max_z):
				continue
			if (w0.y < min_y and w1.y < min_y and w2.y < min_y) or (w0.y > max_y and w1.y > max_y and w2.y > max_y):
				continue
			var r0 := remap[i0]
			if r0 == -1:
				r0 = out_v.size()
				remap[i0] = r0
				out_v.append(verts[i0])
				if has_n: out_n.append(norms[i0])
				if has_uv: out_uv.append(uvs[i0])
				if has_col: out_c.append(cols[i0])
			var r1 := remap[i1]
			if r1 == -1:
				r1 = out_v.size()
				remap[i1] = r1
				out_v.append(verts[i1])
				if has_n: out_n.append(norms[i1])
				if has_uv: out_uv.append(uvs[i1])
				if has_col: out_c.append(cols[i1])
			var r2 := remap[i2]
			if r2 == -1:
				r2 = out_v.size()
				remap[i2] = r2
				out_v.append(verts[i2])
				if has_n: out_n.append(norms[i2])
				if has_uv: out_uv.append(uvs[i2])
				if has_col: out_c.append(cols[i2])
			out_i.append(r0)
			out_i.append(r1)
			out_i.append(r2)
			kept_s += 1

		if kept_s > 0:
			var out_arr := []
			out_arr.resize(Mesh.ARRAY_MAX)
			out_arr[Mesh.ARRAY_VERTEX] = out_v
			if has_n: out_arr[Mesh.ARRAY_NORMAL] = out_n
			if has_uv: out_arr[Mesh.ARRAY_TEX_UV] = out_uv
			if has_col: out_arr[Mesh.ARRAY_COLOR] = out_c
			out_arr[Mesh.ARRAY_INDEX] = out_i
			var surf_idx := out_mesh.get_surface_count()
			out_mesh.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, out_arr)
			var orig_mat := src.surface_get_material(s)
			if orig_mat:
				out_mesh.surface_set_material(surf_idx, orig_mat)
			kept_total += kept_s
	if kept_total == 0:
		return false
	m_inst.mesh = out_mesh
	return true

# ==============================================================================
# INICIALIZADOR CANÓNICO ÚNICO DE MATERIALES DE A1 Y OCÉANO
# Llamado desde godot-retiro (FULL_RETREAT) y godot-campamentos (A1_CAMP) para
# garantizar paridad cromática y PBR 1:1 sin copiar definiciones de materiales.
# ==============================================================================
static func init_canonical_a1_materials(builder: Node3D) -> void:
	var tex_plaza: Texture2D = builder.call("_load_tex", "a1-plaza-v6.png")
	var tex_cell: Texture2D = builder.call("_load_tex", "a1-cell-v6.png")
	var tex_basalt: Texture2D = builder.call("_load_tex", "basalt-coastal-albedo-v1.webp")
	var tex_cliff: Texture2D = builder.call("_load_tex", "a1-cliff-rugged-v8.jpg")
	var tex_coastal_rock: Texture2D = builder.call("_load_tex", "coastal-rock.png")
	var tex_oak: Texture2D = builder.call("_load_tex", "oak-v4.webp")
	var tex_limestone: Texture2D = builder.call("_load_tex", "limestone-v3.webp")
	var tex_ashlar: Texture2D = builder.call("_load_tex", "ashlar-v4.webp")
	var tex_earth: Texture2D = builder.call("_load_tex", "earth.webp")
	var tex_wool: Texture2D = builder.call("_load_tex", "wool-v4.webp")
	var tex_linen: Texture2D = builder.call("_load_tex", "linen-v4.webp")
	var tex_foliage: Texture2D = builder.call("_load_tex", "foliage-atlas.png")
	var norm_rock: Texture2D = builder.call("_load_tex", "rock-normal-v1.png")
	var norm_wood: Texture2D = builder.call("_load_tex", "wood-normal-v1.png")

	builder.set("mat_plaza", builder.call("_make_textured_mat", Color("#d4cbb8"), 0.82, 0.0, tex_plaza, 0.30, true, norm_rock, 0.45))
	builder.set("mat_cell_floor", builder.call("_make_textured_mat", Color("#c4bba8"), 0.84, 0.0, tex_cell, 0.36, true, norm_rock, 0.48))
	builder.set("mat_rock", builder.call("_make_textured_mat", Color("#97a29b"), 0.86, 0.0, tex_basalt if tex_basalt else tex_cliff, 0.16, true, norm_rock, 0.68))
	builder.set("mat_rock_carved", builder.call("_make_textured_mat", Color("#abafa4"), 0.84, 0.0, tex_coastal_rock if tex_coastal_rock else tex_cliff, 0.26, true, norm_rock, 0.65))
	builder.set("mat_rock_dark", builder.call("_make_textured_mat", Color("#7e8784"), 0.89, 0.0, tex_basalt if tex_basalt else tex_cliff, 0.16, true, norm_rock, 0.70))
	builder.set("mat_wood", builder.call("_make_textured_mat", Color("#bf9a70"), 0.72, 0.0, tex_oak, 0.50, true, norm_wood, 0.55))
	builder.set("mat_wood_dark", builder.call("_make_textured_mat", Color("#7c5b3b"), 0.80, 0.0, tex_oak, 0.50, true, norm_wood, 0.58))
	builder.set("mat_upper", builder.call("_make_textured_mat", Color("#cac0ab"), 0.82, 0.0, tex_ashlar if tex_ashlar else tex_plaza, 0.32, true, norm_rock, 0.48))
	builder.set("mat_column", builder.call("_make_textured_mat", Color("#cfc6b1"), 0.74, 0.02, tex_limestone, 0.35, true, norm_rock, 0.45))
	builder.set("mat_bronze", builder.call("_make_mat", Color("#9a7448"), 0.36, 0.72))
	builder.set("mat_iron", builder.call("_make_mat", Color("#3b4144"), 0.45, 0.75))
	builder.set("mat_cloth_blue", builder.call("_make_textured_mat", Color("#4f6982"), 0.92, 0.0, tex_wool, 0.65, true))
	builder.set("mat_cloth_warm", builder.call("_make_textured_mat", Color("#a46452"), 0.92, 0.0, tex_linen, 0.65, true))

	var mat_gold := StandardMaterial3D.new()
	mat_gold.albedo_color = Color("#f0be42")
	mat_gold.metallic = 0.7
	mat_gold.roughness = 0.32
	mat_gold.emission_enabled = true
	mat_gold.emission = Color("#d89a1c")
	mat_gold.emission_energy_multiplier = 0.35
	builder.set("mat_gold", mat_gold)

	var mat_flame := StandardMaterial3D.new()
	mat_flame.albedo_color = Color(1.0, 0.62, 0.18)
	mat_flame.emission_enabled = true
	mat_flame.emission = Color(1.0, 0.48, 0.10)
	mat_flame.emission_energy_multiplier = 2.8
	builder.set("mat_flame", mat_flame)

	var pool_smat := StandardMaterial3D.new()
	pool_smat.albedo_color = Color(0.16, 0.50, 0.56, 0.82)
	if norm_rock:
		pool_smat.normal_enabled = true
		pool_smat.normal_texture = norm_rock
		pool_smat.normal_scale = 0.22
	pool_smat.roughness = 0.08
	pool_smat.metallic = 0.06
	pool_smat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	builder.set("mat_pool_water", pool_smat)

	builder.set("_mat_rock_glb", builder.call("_make_glb_mat", Color("#acb7b0"), 0.86, 0.0, tex_basalt if tex_basalt else tex_cliff, 0.14, norm_rock, true, 0.68))
	builder.set("_mat_carved_glb", builder.call("_make_glb_mat", Color("#b9c0b7"), 0.82, 0.0, tex_coastal_rock if tex_coastal_rock else tex_basalt, 0.18, norm_rock, true, 0.65))
	builder.set("_mat_paving_glb", builder.call("_make_glb_mat", Color("#d4cdbe"), 0.82, 0.0, tex_plaza if tex_plaza else tex_ashlar, 0.28, norm_rock, true, 0.50))
	builder.set("_mat_earth_glb", builder.call("_make_glb_mat", Color("#beb99c"), 0.90, 0.0, tex_earth, 0.26, null, true))
	builder.set("_mat_wood_glb", builder.call("_make_glb_mat", Color("#c6a074"), 0.76, 0.0, tex_oak, 0.52, norm_wood, true, 0.55))
	builder.set("_mat_dark_wood_glb", builder.call("_make_glb_mat", Color("#8c6a48"), 0.80, 0.0, tex_oak, 0.52, null, true))
	builder.set("_mat_limestone_glb", builder.call("_make_glb_mat", Color("#bbb49f"), 0.80, 0.0, tex_limestone, 0.36, norm_rock, true, 0.48))
	builder.set("_mat_sculpture_glb", builder.call("_make_glb_mat", Color("#d2cab6"), 0.78, 0.04, tex_limestone, 0.28, norm_rock, true, 0.45))
	builder.set("_mat_astalagan_glb", builder.call("_make_glb_mat", Color("#ccc6b8"), 0.52, 0.24, tex_limestone, 0.28, norm_rock, true, 0.58))
	builder.set("_mat_metal_glb", builder.call("_make_glb_mat", Color("#545a5c"), 0.46, 0.72, null, 1.0, null, true))
	builder.set("_mat_brass_glb", builder.call("_make_glb_mat", Color("#be8842"), 0.32, 0.72, null, 1.0, null, true))
	builder.set("_mat_pottery_glb", builder.call("_make_glb_mat", Color("#b66d4b"), 0.78, 0.0, null, 1.0, null, true))
	builder.set("_mat_linen_glb", builder.call("_make_glb_mat", Color("#eadcc7"), 0.90, 0.0, tex_linen, 0.65, null, true, 0.50, true))
	builder.set("_mat_blue_cloth_glb", builder.call("_make_glb_mat", Color("#6886a0"), 0.90, 0.0, tex_linen, 0.65, null, true, 0.50, true))
	builder.set("_mat_red_cloth_glb", builder.call("_make_glb_mat", Color("#b66959"), 0.90, 0.0, tex_wool, 0.65, null, true, 0.50, true))
	builder.set("_mat_flower_glb", builder.call("_make_glb_mat", Color("#e8cf72"), 0.78, 0.0, null, 1.0, null, true))
	var herb_glb: StandardMaterial3D = builder.call("_make_glb_mat", Color("#4a6439"), 0.86, 0.0, null, 1.0, null, true)
	herb_glb.backlight_enabled = true
	herb_glb.backlight = Color(0.09, 0.14, 0.06)
	builder.set("_mat_herb_glb", herb_glb)
	builder.set("_mat_foliage_v6_glb", builder.call("_make_foliage_cutout_mat", Color("#748a5c"), tex_foliage))
	builder.set("_mat_foliage_sage_glb", builder.call("_make_foliage_cutout_mat", Color("#697f59"), tex_foliage))
	builder.set("_mat_foliage_dark_glb", builder.call("_make_foliage_cutout_mat", Color("#425937"), tex_foliage))
	builder.set("_mat_foliage_flower_glb", builder.call("_make_foliage_cutout_mat", Color("#e8d69a"), tex_foliage))

	var ocean_shader := Shader.new()
	ocean_shader.code = """
shader_type spatial;
render_mode blend_mix, depth_draw_never, cull_disabled, specular_schlick_ggx;

uniform sampler2D depth_tex : hint_depth_texture, filter_linear_mipmap;
uniform sampler2D normal_tex : hint_normal, filter_linear_mipmap, repeat_enable;
uniform vec4 shallow_color : source_color = vec4(0.115, 0.54, 0.56, 0.18);
uniform vec4 mid_color : source_color = vec4(0.042, 0.29, 0.37, 0.74);
uniform vec4 deep_color : source_color = vec4(0.018, 0.125, 0.21, 0.96);
uniform vec4 foam_color : source_color = vec4(0.86, 0.90, 0.92, 0.92);
uniform float water_depth_range = 4.2;
uniform float foam_range = 0.76;
uniform float wave_speed = 0.042;
uniform float wave_scale = 0.095;
uniform float wave_amp = 0.095;
uniform float alpha_scale = 1.0;
uniform float storm_factor = 0.0;

varying vec3 world_pos;
varying float wave_crest;

void vertex() {
	world_pos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	wave_crest = 0.0;
	if (wave_amp > 0.001) {
		vec2 d_lag = (world_pos.xz - vec2(24.5, 98.4)) / vec2(10.0, 9.2);
		float lag_calm = smoothstep(0.42, 1.08, dot(d_lag, d_lag));
		float spd = mix(1.0, 1.75, storm_factor);
		float w1 = sin(world_pos.x * 0.14 + world_pos.z * 0.26 + TIME * 1.25 * spd);
		float w2 = cos(-world_pos.x * 0.12 + world_pos.z * 0.34 + TIME * 1.05 * spd);
		float w3 = sin(world_pos.x * 0.10 + world_pos.z * 0.46 + TIME * 1.65 * spd);
		float h = (w1 * 0.48 + w2 * 0.34 + w3 * 0.18) * wave_amp * mix(0.05, 1.0, lag_calm);
		VERTEX.y += h;
		wave_crest = clamp((w1 + w2 + w3) * 0.33 + 0.5, 0.0, 1.0) * lag_calm;
	}
}

void fragment() {
	float raw_depth = texture(depth_tex, SCREEN_UV).x;
	vec3 ndc = vec3(SCREEN_UV * 2.0 - 1.0, raw_depth);
	vec4 view_p = INV_PROJECTION_MATRIX * vec4(ndc, 1.0);
	view_p.xyz /= view_p.w;
	vec4 world_behind = INV_VIEW_MATRIX * vec4(view_p.xyz, 1.0);
	float v_depth = max(0.0, world_pos.y - world_behind.y);
	float ray_depth = max(0.0, VERTEX.z - view_p.z);
	float water_depth = mix(v_depth, ray_depth * 0.48, 0.22);
	if (raw_depth < 0.0001) {
		water_depth = water_depth_range;
	}

	vec2 d_lag = (world_pos.xz - vec2(24.5, 97.4)) / vec2(11.4, 10.6);
	float lagoon_w = 1.0 - smoothstep(0.40, 1.08, dot(d_lag, d_lag));
	float spd_f = mix(1.0, 0.24, lagoon_w);

	vec2 uv1 = world_pos.xz * wave_scale + vec2(TIME * wave_speed * 0.24 * spd_f, TIME * wave_speed * 0.96 * spd_f);
	vec2 r_xz = vec2(0.92 * world_pos.x - 0.39 * world_pos.z, 0.39 * world_pos.x + 0.92 * world_pos.z);
	vec2 uv2 = r_xz * (wave_scale * 1.55) + vec2(-TIME * wave_speed * 0.28 * spd_f, TIME * wave_speed * 0.88 * spd_f);
	vec2 uv3 = world_pos.xz * (wave_scale * 2.65) + vec2(TIME * wave_speed * 0.36 * spd_f, TIME * wave_speed * 1.18 * spd_f);
	vec3 n1 = texture(normal_tex, uv1).xyz * 2.0 - 1.0;
	vec3 n2 = texture(normal_tex, uv2).xyz * 2.0 - 1.0;
	vec3 n3 = texture(normal_tex, uv3).xyz * 2.0 - 1.0;
	float ch1 = cos(world_pos.x * 0.72 + world_pos.z * 1.22 + TIME * 1.55 * spd_f);
	float ch2 = cos(-world_pos.x * 0.54 + world_pos.z * 1.82 + TIME * 1.35 * spd_f);
	float chop = mix(1.0, 1.55, storm_factor) * mix(1.0, 0.20, lagoon_w);
	vec3 n_mix = normalize(vec3((n1.xy + n2.xy + n3.xy * 0.45) * 0.28 * chop + vec2(ch1 * 0.095 + ch2 * 0.070, ch1 * 0.070 - ch2 * 0.080) * chop, 1.0));
	NORMAL_MAP = vec3(n_mix.x * 0.5 + 0.5, n_mix.y * 0.5 + 0.5, 1.0);
	NORMAL_MAP_DEPTH = mix(mix(0.52, 0.82, storm_factor), 0.24, lagoon_w);

	float ndotv = clamp(dot(normalize(NORMAL), normalize(VIEW)), 0.0, 1.0);
	float fresnel = pow(1.0 - ndotv, 3.2);

	float lacy_a = clamp(0.5 + (n1.x - n2.y) * 0.74 + ch1 * 0.18, 0.0, 1.0);
	float lacy_b = clamp(0.5 + (n1.y + n2.x + n3.x * 0.5) * 0.68 - ch2 * 0.16, 0.0, 1.0);
	float lacy_lace = clamp(lacy_a * 0.58 + lacy_b * 0.42, 0.0, 1.0);
	float patch_var = clamp(0.5 + 0.5 * sin(world_pos.x * 0.47 - world_pos.z * 0.34 + n1.x * 2.6) * cos(world_pos.x * 0.29 + world_pos.z * 0.53), 0.0, 1.0);
	float local_foam_range = foam_range * (0.45 + 0.90 * patch_var);

	float surf_line = sin(water_depth * 10.5 + TIME * (1.72 + storm_factor * 1.25) + lacy_a * 4.2) * 0.5 + 0.5;
	float shore_band = (1.0 - smoothstep(0.015, local_foam_range, water_depth));
	float rock_break = smoothstep(0.24, 0.74, lacy_a * 0.7 + patch_var * 0.3);
	float shore_foam = smoothstep(0.30, 0.66, shore_band * rock_break * (0.44 + 0.56 * surf_line) * (0.38 + 1.25 * lacy_lace));
	float ripple_band = exp(-pow((water_depth - (0.42 + 0.18 * patch_var)) * 4.6, 2.0)) * smoothstep(0.50, 0.86, lacy_lace * 0.68 + surf_line * 0.32) * 0.44;
	float whitecap = smoothstep(mix(0.84, 0.66, storm_factor), 0.96, lacy_lace * 0.48 + wave_crest * 0.52) * smoothstep(0.35, 1.6, water_depth) * mix(0.18, 0.62, storm_factor);
	float foam_mask = clamp((shore_foam + ripple_band + whitecap) * mix(1.0, 0.04, lagoon_w), 0.0, 1.0);

	float t_mid = smoothstep(0.08, 1.05, water_depth);
	float t_deep = smoothstep(1.10, water_depth_range, water_depth);
	vec3 water_tint = mix(shallow_color.rgb, mid_color.rgb, t_mid);
	water_tint = mix(water_tint, deep_color.rgb, t_deep);
	vec3 lag_tint = mix(vec3(0.14, 0.48, 0.42), vec3(0.05, 0.30, 0.28), smoothstep(0.06, 0.75, water_depth));
	lag_tint = mix(lag_tint, vec3(0.024, 0.145, 0.165), smoothstep(0.75, water_depth_range * 0.65, water_depth));
	water_tint = mix(water_tint, lag_tint, lagoon_w);
	water_tint = mix(water_tint, water_tint * vec3(0.56, 0.64, 0.72), storm_factor * 0.75);

	float caustic_a = smoothstep(0.68, 0.96, 0.5 + 0.5 * (n1.x * n2.y - n1.y * n2.x));
	float caustic_b = smoothstep(0.72, 0.98, 0.5 + 0.5 * (n2.x * n3.y + n3.x * n1.y));
	float caustic = (caustic_a * 0.65 + caustic_b * 0.45) * (1.0 - smoothstep(0.25, 1.85, water_depth)) * mix(0.22, 0.06, storm_factor);
	water_tint += vec3(0.09, 0.21, 0.20) * caustic;

	vec3 sky_refl = mix(vec3(0.18, 0.34, 0.44), vec3(0.42, 0.54, 0.64), fresnel);
	sky_refl = mix(sky_refl, vec3(0.16, 0.22, 0.28), storm_factor * 0.72);
	vec3 water_col = mix(water_tint, sky_refl, fresnel * mix(0.22, 0.34, storm_factor) * mix(1.0, 0.65, lagoon_w));

	ALBEDO = mix(water_col, foam_color.rgb, foam_mask * 0.82);
	float base_alpha = mix(shallow_color.a, mid_color.a, smoothstep(0.06, 0.92, water_depth));
	base_alpha = mix(base_alpha, deep_color.a, smoothstep(1.05, water_depth_range, water_depth));
	float lag_alpha = mix(0.42, 0.88, smoothstep(0.05, 1.15, water_depth));
	base_alpha = mix(base_alpha, lag_alpha, lagoon_w);
	ALPHA = clamp(base_alpha + foam_mask * 0.44, 0.14, 0.97) * alpha_scale;
	ROUGHNESS = mix(0.32, 0.78, foam_mask);
	METALLIC = 0.0;
	SPECULAR = 0.14;
}
"""
	var ocean_smat := ShaderMaterial.new()
	ocean_smat.shader = ocean_shader
	if norm_rock:
		ocean_smat.set_shader_parameter("normal_tex", norm_rock)
	builder.set("mat_ocean", ocean_smat)

	var water_glb_smat := ocean_smat.duplicate() as ShaderMaterial
	water_glb_smat.set_shader_parameter("wave_amp", 0.0)
	water_glb_smat.set_shader_parameter("alpha_scale", 0.18)
	builder.set("_mat_water_glb", water_glb_smat)
