class_name CampFaunaKit
extends RefCounted

## Articulated animated wildlife builders with cached procedural species textures,
## normal-map bump detail, glossy eyes, swept airfoil wings and finned river/sea fish.

const MatKit = preload("res://scripts/camp_material_kit.gd")

static var _tex_cache: Dictionary = {}
static var _mat_cache: Dictionary = {}
static var _wing_mesh_cache: Dictionary = {}
static var _eye_mat: StandardMaterial3D

static func set_behavior(
	agent: Dictionary,
	active_phases: Array,
	blocked_weather: Array,
	visit_cycle: float = 0.0,
	visit_duty: float = 1.0,
	visit_offset: float = 0.0,
	pause_mid: bool = true,
	shy_radius: float = 0.0
) -> void:
	agent["active_phases"] = active_phases
	agent["blocked_weather"] = blocked_weather
	agent["visit_cycle"] = visit_cycle
	agent["visit_duty"] = visit_duty
	agent["visit_offset"] = visit_offset
	agent["pause_mid"] = pause_mid
	agent["shy_radius"] = shy_radius

static func _hero_too_close(pos: Vector3, hero_positions: Array, radius: float) -> bool:
	if radius <= 0.05 or hero_positions.is_empty():
		return false
	var r2 := radius * radius
	for hp in hero_positions:
		var hv: Vector3 = hp
		if pos.distance_squared_to(hv) <= r2:
			return true
	return false

static func update_agents(agents: Array[Dictionary], time_s: float, weather_id: String, phase_id: String, hero_positions: Array = []) -> void:
	for fa in agents:
		var node: Node3D = fa.get("node")
		if not is_instance_valid(node):
			continue

		var gait := str(fa.get("gait", "walk"))
		var p_val: float = float(fa.get("phase", 0.0))

		# 1. Time-of-day, weather & intermittent presence scheduling
		var vis := true
		var gate := str(fa.get("time_gate", "always"))
		if gate == "day_clear":
			vis = (phase_id in ["day", "arrival", "dawn"]) and not (weather_id in ["rain", "storm", "snow"])
		elif gate == "nocturnal":
			vis = (phase_id in ["dusk", "night", "dawn"]) and not (weather_id in ["storm"])

		var a_phases: Array = fa.get("active_phases", [])
		if vis and not a_phases.is_empty():
			vis = phase_id in a_phases
		var b_weather: Array = fa.get("blocked_weather", [])
		if vis and not b_weather.is_empty():
			vis = not (weather_id in b_weather)

		var v_cyc: float = float(fa.get("visit_cycle", 0.0))
		var v_duty: float = clampf(float(fa.get("visit_duty", 1.0)), 0.05, 1.0)
		var v_off: float = float(fa.get("visit_offset", 0.0))
		var u_active := 0.5
		if vis and v_cyc > 0.1:
			var u_c := fmod(maxf(0.0, time_s + v_off), v_cyc) / v_cyc
			if u_c >= v_duty:
				vis = false
			else:
				u_active = u_c / v_duty

		var shy_r: float = float(fa.get("shy_radius", 0.0))
		if vis and gait in ["perch", "butterfly"] and _hero_too_close(node.global_position, hero_positions, shy_r):
			vis = false

		node.visible = vis
		if not vis:
			continue

		# 2. Stationary articulated agents (perched birds & hovering butterflies)
		if gait == "perch":
			var base_pos: Vector3 = fa.get("base_pos", node.position)
			var base_yaw: float = float(fa.get("base_yaw", 0.0))
			var hop_cyc: float = fmod(time_s * 0.48 + p_val, 3.2)
			var hop_h: float = sin(hop_cyc * PI / 0.35) * 0.09 if hop_cyc < 0.35 else 0.0
			node.position = base_pos + Vector3(sin(p_val) * hop_h * 0.3, hop_h, 0.0)
			node.rotation.y = base_yaw + sin(time_s * 1.15 + p_val * 2.0) * 0.55
			var head_n: Node3D = fa.get("head_node")
			if is_instance_valid(head_n):
				var peck := maxf(0.0, sin(time_s * 2.1 + p_val * 3.0))
				head_n.rotation.x = -0.52 * pow(peck, 6.0)
				head_n.rotation.y = sin(time_s * 2.7 + p_val) * 0.38
			var lw: Node3D = fa.get("lw")
			var rw: Node3D = fa.get("rw")
			var stretch := maxf(0.0, sin(time_s * 0.85 + p_val))
			var wing_a := 0.25 if stretch < 0.92 else 0.25 + sin(time_s * 14.0) * 0.45
			if is_instance_valid(lw): lw.rotation.z = wing_a
			if is_instance_valid(rw): rw.rotation.z = -wing_a
			var tail_n: Node3D = fa.get("tail_node")
			if is_instance_valid(tail_n):
				tail_n.rotation.x = 0.18 + sin(time_s * 4.5 + p_val) * 0.14
			continue

		if gait == "butterfly":
			var anchor: Vector3 = fa.get("base_pos", node.position)
			var ang := time_s * 1.45 + p_val * 2.3
			node.position = anchor + Vector3(
				cos(ang) * 0.65 + sin(ang * 2.1) * 0.25,
				0.28 + sin(time_s * 3.1 + p_val) * 0.16,
				sin(ang * 1.3) * 0.55
			)
			node.rotation.y = -ang
			var lw_b: Node3D = fa.get("lw")
			var rw_b: Node3D = fa.get("rw")
			var flap := sin(time_s * 18.0 + p_val * 4.0) * 1.05
			if is_instance_valid(lw_b): lw_b.rotation.z = flap
			if is_instance_valid(rw_b): rw_b.rotation.z = -flap
			continue

		# 3. Natural Catmull-Rom visit trajectory (entry -> graze/look pause -> exit)
		var pts: Array = fa.get("waypoints", [])
		if pts.size() < 2:
			continue
		var period: float = maxf(2.0, float(fa.get("period", 26.0)))
		var t_raw := u_active if v_cyc > 0.1 else (fmod(time_s * float(fa.get("speed", 1.0)) + p_val, period) / period)
		var is_paused := false
		var t_spline := t_raw
		if bool(fa.get("pause_mid", false)):
			if t_raw < 0.34:
				t_spline = (t_raw / 0.34) * 0.50
			elif t_raw <= 0.66:
				t_spline = 0.50
				is_paused = not _hero_too_close(node.global_position, hero_positions, shy_r)
			else:
				t_spline = 0.50 + ((t_raw - 0.66) / 0.34) * 0.50

		var scaled := t_spline * float(pts.size() - 1)
		var idx := mini(int(floorf(scaled)), pts.size() - 2)
		var frac := scaled - float(idx)
		var p0: Vector3 = pts[maxi(0, idx - 1)]
		var p1: Vector3 = pts[idx]
		var p2: Vector3 = pts[idx + 1]
		var p3: Vector3 = pts[mini(pts.size() - 1, idx + 2)]
		var pos := _catmull_rom(p0, p1, p2, p3, frac)
		var next_pos := _catmull_rom(p0, p1, p2, p3, clampf(frac + 0.02, 0.0, 1.0))

		# Sync GLB AnimationPlayer clip between Walk & Eating/Idle during natural stops
		var ap: AnimationPlayer = fa.get("ap")
		if is_instance_valid(ap):
			var target_clip := str(fa.get("pause_clip", "Eating")) if is_paused else str(fa.get("walk_clip", "Walk"))
			if target_clip != "" and ap.current_animation != target_clip and ap.has_animation(target_clip):
				var anim_res := ap.get_animation(target_clip)
				if anim_res:
					anim_res.loop_mode = Animation.LOOP_LINEAR
				ap.play(target_clip)

		# Gait overlays on position & pitch
		var leap_pitch := 0.0
		if gait == "hop" and not is_paused:
			var arc := absf(sin(time_s * 4.2 + p_val))
			pos.y += arc * 0.22
			node.rotation.x = cos(time_s * 4.2 + p_val) * -0.18
		elif gait == "hop" and is_paused:
			node.rotation.x = sin(time_s * 5.0 + p_val) * 0.08 - 0.12
		elif gait == "bat":
			pos.y += sin(time_s * 2.6 + p_val) * 0.22
		elif gait == "swim_ocean_jump":
			var leap_period: float = float(fa.get("leap_period", 11.5))
			var l_cyc: float = fmod(time_s + p_val * 2.3, leap_period)
			if l_cyc < 1.35 and not (weather_id in ["rain", "storm", "snow"]):
				var lt := l_cyc / 1.35
				var jump_h: float = float(fa.get("leap_height", 0.36))
				pos.y += sin(lt * PI) * jump_h
				leap_pitch = -cos(lt * PI) * 0.52

		node.position = pos
		var dir := next_pos - pos
		if dir.length_squared() > 0.0001 and not is_paused:
			var yaw := atan2(dir.x, dir.z)
			if gait == "scuttle":
				yaw += PI * 0.5
			node.rotation.y = yaw
		elif is_paused and dir.length_squared() > 0.0001:
			var yaw_p := atan2(dir.x, dir.z) + sin(time_s * 0.8 + p_val) * 0.25
			if gait == "scuttle":
				yaw_p += PI * 0.5
			node.rotation.y = yaw_p
		if gait == "swim_ocean_jump":
			node.rotation.x = leap_pitch

		# Articulated limbs / wings / tail animation (standing/grazing cleanly when paused!)
		if gait == "trot":
			var legs: Array = fa.get("legs", [])
			for li in range(legs.size()):
				var leg_n: Node3D = legs[li]
				if is_instance_valid(leg_n):
					if is_paused:
						leg_n.rotation.x = 0.0
					else:
						var sgn := 1.0 if (li == 0 or li == 3) else -1.0
						leg_n.rotation.x = sin(time_s * 7.8 + p_val) * 0.42 * sgn
			var head_t: Node3D = fa.get("head_node")
			if is_instance_valid(head_t):
				head_t.rotation.x = (-0.42 + sin(time_s * 3.4 + p_val) * 0.14) if is_paused else (sin(time_s * 2.2 + p_val) * 0.14)
				head_t.rotation.y = sin(time_s * 1.4 + p_val) * 0.28 if is_paused else 0.0
			var tail_t: Node3D = fa.get("tail_node")
			if is_instance_valid(tail_t):
				tail_t.rotation.y = sin(time_s * (2.5 if is_paused else 5.2) + p_val) * 0.22
		elif gait == "scuttle":
			var wnode: Node3D = fa.get("wiggle_node")
			if is_instance_valid(wnode):
				wnode.rotation.z = 0.0 if is_paused else sin(time_s * 12.0 + p_val) * 0.09
			var claws: Array = fa.get("legs", [])
			for ci in range(claws.size()):
				var cn: Node3D = claws[ci]
				if is_instance_valid(cn):
					cn.rotation.x = -0.25 + sin(time_s * (3.2 if is_paused else 9.0) + float(ci) * 1.4 + p_val) * 0.24
		elif gait == "swim_crawl":
			var flip: Array = fa.get("legs", [])
			for fi in range(flip.size()):
				var fn: Node3D = flip[fi]
				if is_instance_valid(fn):
					var f_side := -1.0 if fi % 2 == 0 else 1.0
					fn.rotation.y = sin(time_s * (1.2 if is_paused else 3.4) + p_val + float(fi) * 0.5) * (0.15 if is_paused else 0.45) * f_side
		elif gait in ["swim_fish", "swim_ocean_jump"]:
			var tail_f: Node3D = fa.get("wiggle_node")
			if is_instance_valid(tail_f):
				tail_f.rotation.y = sin(time_s * (4.0 if is_paused else 11.5) + p_val) * (0.14 if is_paused else 0.34)
		elif gait == "bat":
			var lw_f: Node3D = fa.get("lw")
			var rw_f: Node3D = fa.get("rw")
			var bf := sin(time_s * 14.5 + p_val * 2.0) * 0.78
			if is_instance_valid(lw_f): lw_f.rotation.z = bf
			if is_instance_valid(rw_f): rw_f.rotation.z = -bf
		else:
			var wn: Node3D = fa.get("wiggle_node")
			if is_instance_valid(wn):
				wn.rotation.y = sin(time_s * 9.5 + p_val) * 0.26

static func _catmull_rom(p0: Vector3, p1: Vector3, p2: Vector3, p3: Vector3, t: float) -> Vector3:
	var t2 := t * t
	var t3 := t2 * t
	return 0.5 * (
		(2.0 * p1)
		+ (-p0 + p2) * t
		+ (2.0 * p0 - 5.0 * p1 + 4.0 * p2 - p3) * t2
		+ (-p0 + 3.0 * p1 - 3.0 * p2 + p3) * t3
	)

# ------------------------------------------------------------------------------
# Cached procedural species textures + micro-normals (fast 1-time 96x96 synthesis)
# ------------------------------------------------------------------------------
static func _species_textures(pattern: String, col_a: Color, col_b: Color, accent: Color) -> Dictionary:
	var k := "%s_%s_%s_%s" % [pattern, col_a.to_html(false), col_b.to_html(false), accent.to_html(false)]
	if _tex_cache.has(k):
		return _tex_cache[k]

	var sz := 96
	var img_alb := Image.create(sz, sz, false, Image.FORMAT_RGBA8)
	var img_nrm := Image.create(sz, sz, false, Image.FORMAT_RGB8)
	var hmap: PackedFloat32Array = PackedFloat32Array()
	hmap.resize(sz * sz)

	for y in range(sz):
		var v := float(y) / float(sz)
		for x in range(sz):
			var u := float(x) / float(sz)
			var n := sin(u * 29.0 + cos(v * 17.0) * 1.4) * cos(v * 23.0 - u * 7.0) * 0.5 + 0.5
			var h := 0.5
			var col := col_a
			match pattern:
				"feather":
					var fx := fmod(u * 12.0 + float(y % 8) * 0.08, 1.0)
					var fy := fmod(v * 10.0, 1.0)
					var barb := sin(fx * PI) * sin(fy * PI)
					var shaft := smoothstep(0.10, 0.02, absf(fx - 0.5))
					col = col_a.lerp(col_b, clampf(0.25 + barb * 0.45 + n * 0.25, 0.0, 1.0))
					if u > 0.72: # Wingtip primary feathers darkening
						col = col.lerp(accent, smoothstep(0.70, 0.95, u) * 0.85)
					col = col.lerp(col_b.lightened(0.18), shaft * 0.28)
					h = 0.42 + barb * 0.40 + shaft * 0.16
				"fur":
					var hair := sin(u * 62.0 + sin(v * 18.0) * 2.2) * 0.5 + 0.5
					var guard := sin(u * 124.0 + v * 32.0) * 0.5 + 0.5
					col = col_a.lerp(col_b, clampf(hair * 0.55 + n * 0.35, 0.0, 1.0))
					if guard > 0.78:
						col = col.lerp(accent, 0.34)
					h = 0.35 + hair * 0.45 + guard * 0.20
				"turtle":
					var cx := floorf(u * 4.0) + (0.5 if int(floorf(v * 4.0)) % 2 == 1 else 0.0)
					var cy := floorf(v * 4.0)
					var lx := (u * 4.0) - cx
					var ly := (v * 4.0) - cy
					var dist_c := sqrt(lx * lx + ly * ly)
					var seam := smoothstep(0.42, 0.52, dist_c)
					var scute_glow := clampf(1.0 - dist_c * 1.45, 0.0, 1.0)
					col = col_a.lerp(col_b, scute_glow * 0.75 + n * 0.15)
					col = col.lerp(accent, seam * 0.88)
					h = 0.75 - seam * 0.55 + n * 0.12
				"crab":
					var spots := pow(sin(u * 19.0 + cos(v * 23.0)) * cos(v * 21.0) * 0.5 + 0.5, 2.5)
					var ridge := smoothstep(0.08, 0.01, absf(v - 0.5 - sin(u * TAU) * 0.08))
					col = col_a.lerp(col_b, spots * 0.68 + n * 0.24).lerp(accent, ridge * 0.65)
					h = 0.45 + spots * 0.32 + ridge * 0.22
				"scales":
					var sx := fmod(u * 16.0 + (0.5 if int(v * 14.0) % 2 == 1 else 0.0), 1.0) - 0.5
					var sy := fmod(v * 14.0, 1.0) - 0.5
					var s_edge := smoothstep(0.32, 0.52, sqrt(sx * sx + sy * sy))
					var dorsal := smoothstep(0.55, 0.18, v)
					var stripe := smoothstep(0.12, 0.02, absf(v - 0.48))
					col = col_a.lerp(col_b, (1.0 - dorsal) * 0.75)
					col = col.lerp(accent, stripe * 0.65 + (0.45 if (dorsal > 0.4 and n > 0.76) else 0.0))
					col = col.darkened(s_edge * 0.24)
					h = 0.68 - s_edge * 0.42
				"horn":
					var ring := sin(v * 54.0 + n * 1.5) * 0.5 + 0.5
					col = col_a.lerp(col_b, ring * 0.7 + n * 0.2)
					h = 0.35 + ring * 0.55
				"butterfly":
					var wing_d := sqrt(pow(u - 0.5, 2.0) + pow(v - 0.5, 2.0))
					var vein := smoothstep(0.06, 0.01, absf(sin((u * 3.0 + v * 2.0) * PI)))
					var rim := smoothstep(0.36, 0.49, wing_d)
					var eye_spot := smoothstep(0.11, 0.05, sqrt(pow(u - 0.72, 2.0) + pow(v - 0.35, 2.0)))
					col = col_a.lerp(col_b, n * 0.4).lerp(accent, clampf(rim * 0.9 + vein * 0.55, 0.0, 1.0))
					col = col.lerp(Color("#f7f4e4"), eye_spot * 0.85)
					h = 0.5 + vein * 0.25
			img_alb.set_pixel(x, y, col)
			hmap[y * sz + x] = h

	for y in range(sz):
		var ym := (y - 1 + sz) % sz
		var yp := (y + 1) % sz
		for x in range(sz):
			var xm := (x - 1 + sz) % sz
			var xp := (x + 1) % sz
			var dx := (hmap[y * sz + xm] - hmap[y * sz + xp]) * 1.4
			var dy := (hmap[ym * sz + x] - hmap[yp * sz + x]) * 1.4
			var nv := Vector3(dx, dy, 1.0).normalized() * 0.5 + Vector3(0.5, 0.5, 0.5)
			img_nrm.set_pixel(x, y, Color(nv.x, nv.y, nv.z, 1.0))

	var pair := {
		"alb": ImageTexture.create_from_image(img_alb),
		"nrm": ImageTexture.create_from_image(img_nrm),
	}
	_tex_cache[k] = pair
	return pair

static func _species_mat(key: String, pattern: String, col_a: Color, col_b: Color, accent: Color, rough: float = 0.72, metallic: float = 0.0, double_sided: bool = false) -> StandardMaterial3D:
	if _mat_cache.has(key):
		return _mat_cache[key]
	var texs := _species_textures(pattern, col_a, col_b, accent)
	var m := StandardMaterial3D.new()
	m.albedo_texture = texs["alb"]
	m.normal_enabled = true
	m.normal_texture = texs["nrm"]
	m.normal_scale = 0.52
	m.roughness = rough
	m.metallic = metallic
	m.rim_enabled = true
	m.rim = 0.10
	m.rim_tint = 0.25
	if double_sided:
		m.cull_mode = BaseMaterial3D.CULL_DISABLED
	_mat_cache[key] = m
	return m

static func _get_eye_mat() -> StandardMaterial3D:
	if _eye_mat == null:
		_eye_mat = StandardMaterial3D.new()
		_eye_mat.albedo_color = Color("#111318")
		_eye_mat.roughness = 0.05
		_eye_mat.metallic = 0.15
		_eye_mat.metallic_specular = 0.96
	return _eye_mat

static func _add_eyes(parent: Node3D, offsets: Array[Vector3], r: float) -> void:
	var m_eye := _get_eye_mat()
	var sm := SphereMesh.new(); sm.radius = r; sm.height = r * 2.0; sm.radial_segments = 6; sm.rings = 3
	for off in offsets:
		var e := MeshInstance3D.new(); e.mesh = sm; e.material_override = m_eye; e.position = off
		e.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		parent.add_child(e)

static func _add_sphere(parent: Node3D, r: float, h: float, pos: Vector3, scl: Vector3, mat: Material, shadow: bool = true) -> MeshInstance3D:
	var m := MeshInstance3D.new()
	var sm := SphereMesh.new(); sm.radius = r; sm.height = h; sm.radial_segments = 8; sm.rings = 4
	m.mesh = sm; m.material_override = mat
	m.position = pos; m.scale = scl
	m.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON if shadow else GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parent.add_child(m)
	return m

static func _add_leg_pivot(parent: Node3D, pivot_pos: Vector3, r_top: float, r_bot: float, len_m: float, mat: Material) -> Node3D:
	var piv := Node3D.new(); piv.position = pivot_pos; parent.add_child(piv)
	var m := MeshInstance3D.new()
	var cm := CylinderMesh.new(); cm.top_radius = r_top; cm.bottom_radius = r_bot; cm.height = len_m; cm.radial_segments = 6
	m.mesh = cm; m.material_override = mat; m.position.y = -len_m * 0.5
	m.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	piv.add_child(m)
	return piv

static func _get_wing_mesh(side: float, s: float) -> ArrayMesh:
	var key := "wing_%.2f_%.2f" % [side, s]
	if _wing_mesh_cache.has(key):
		return _wing_mesh_cache[key]
	# Swept curved bird airfoil (inner shoulder -> elbow -> swept wrist -> tapered primary tip)
	var st := SurfaceTool.new(); st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var p_sh_f := Vector3(0.0, 0.01 * s, 0.09 * s)
	var p_sh_b := Vector3(0.0, -0.005 * s, -0.09 * s)
	var p_md_f := Vector3(side * 0.22 * s, 0.03 * s, 0.08 * s)
	var p_md_b := Vector3(side * 0.20 * s, 0.01 * s, -0.08 * s)
	var p_tp_f := Vector3(side * 0.44 * s, 0.01 * s, -0.02 * s)
	var p_tp_b := Vector3(side * 0.41 * s, 0.0, -0.11 * s)
	var tris := [
		[p_sh_f, Vector2(0.0, 0.2), p_md_f, Vector2(0.48, 0.2), p_md_b, Vector2(0.48, 0.8)],
		[p_sh_f, Vector2(0.0, 0.2), p_md_b, Vector2(0.48, 0.8), p_sh_b, Vector2(0.0, 0.8)],
		[p_md_f, Vector2(0.48, 0.2), p_tp_f, Vector2(0.98, 0.25), p_tp_b, Vector2(0.98, 0.82)],
		[p_md_f, Vector2(0.48, 0.2), p_tp_b, Vector2(0.98, 0.82), p_md_b, Vector2(0.48, 0.8)],
	]
	for t in tris:
		st.set_uv(t[1]); st.add_vertex(t[0])
		st.set_uv(t[3]); st.add_vertex(t[2])
		st.set_uv(t[5]); st.add_vertex(t[4])
	st.generate_normals()
	var mesh := st.commit()
	_wing_mesh_cache[key] = mesh
	return mesh

# ------------------------------------------------------------------------------
# Species builders
# ------------------------------------------------------------------------------
static func spawn_fox(parent: Node3D, agents: Array[Dictionary], node_name: String, waypoints: Array, period: float, phase: float) -> void:
	var root := Node3D.new(); root.name = node_name; root.position = waypoints[0]; parent.add_child(root)
	var m_fur := _species_mat("fox_fur_v2", "fur", Color("#9e3e16"), Color("#ba5624"), Color("#421d0c"), 0.74)
	var m_cream := _species_mat("fox_cream_v2", "fur", Color("#d8cbb2"), Color("#e8dec8"), Color("#a8967d"), 0.78)
	var m_dark := _species_mat("fox_dark_v2", "fur", Color("#221b17"), Color("#342a24"), Color("#120e0c"), 0.68)

	_add_sphere(root, 0.135, 0.24, Vector3(0, 0.24, 0.0), Vector3(0.84, 0.86, 1.95), m_fur)
	_add_sphere(root, 0.095, 0.18, Vector3(0, 0.27, 0.16), Vector3(0.85, 0.95, 1.15), m_cream)

	var head := Node3D.new(); head.position = Vector3(0, 0.32, 0.21); root.add_child(head)
	_add_sphere(head, 0.09, 0.15, Vector3(0, 0.02, 0.06), Vector3(0.92, 0.86, 1.32), m_fur)
	_add_sphere(head, 0.038, 0.085, Vector3(0, 0.0, 0.17), Vector3(0.78, 0.68, 1.35), m_fur)
	_add_sphere(head, 0.018, 0.02, Vector3(0, 0.01, 0.23), Vector3.ONE, m_dark, false)
	_add_eyes(head, [Vector3(-0.046, 0.055, 0.12), Vector3(0.046, 0.055, 0.12)], 0.016)
	for es in [-1.0, 1.0]:
		var ear := MeshInstance3D.new()
		var em := CylinderMesh.new(); em.top_radius = 0.006; em.bottom_radius = 0.032; em.height = 0.09; em.radial_segments = 4
		ear.mesh = em; ear.material_override = m_dark; ear.position = Vector3(es * 0.055, 0.11, 0.02); ear.rotation.z = -es * 0.18
		head.add_child(ear)

	var tail := Node3D.new(); tail.position = Vector3(0, 0.27, -0.24); tail.rotation.x = 0.28; root.add_child(tail)
	_add_sphere(tail, 0.072, 0.36, Vector3(0, 0.0, -0.17), Vector3(0.9, 0.88, 1.15), m_fur)
	_add_sphere(tail, 0.056, 0.15, Vector3(0, 0.0, -0.34), Vector3(0.9, 0.9, 1.1), m_cream, false)

	var legs: Array = []
	for lp in [Vector3(-0.075, 0.20, 0.14), Vector3(0.075, 0.20, 0.14), Vector3(-0.075, 0.20, -0.14), Vector3(0.075, 0.20, -0.14)]:
		legs.append(_add_leg_pivot(root, lp, 0.032, 0.018, 0.20, m_dark))

	agents.append({
		"node": root, "waypoints": waypoints, "period": period, "speed": 1.0, "phase": phase,
		"gait": "trot", "legs": legs, "head_node": head, "tail_node": tail,
	})

static func spawn_rabbit(parent: Node3D, agents: Array[Dictionary], node_name: String, waypoints: Array, period: float, phase: float, fur_tint: Color = Color("#6b5644")) -> void:
	var root := Node3D.new(); root.name = node_name; root.position = waypoints[0]; parent.add_child(root)
	var m_fur := _species_mat("rab2_" + fur_tint.to_html(false), "fur", fur_tint.darkened(0.18), fur_tint, fur_tint.darkened(0.45), 0.80)
	var m_tail := _species_mat("rab_tail2", "fur", Color("#ded8cb"), Color("#eee9df"), Color("#bfb7a6"), 0.86)
	_add_sphere(root, 0.105, 0.20, Vector3(0, 0.10, -0.01), Vector3(0.88, 0.88, 1.32), m_fur)
	_add_sphere(root, 0.068, 0.13, Vector3(0, 0.17, 0.11), Vector3(0.9, 0.9, 1.05), m_fur)
	_add_sphere(root, 0.038, 0.05, Vector3(0, 0.11, -0.14), Vector3.ONE, m_tail, false)
	_add_eyes(root, [Vector3(-0.044, 0.19, 0.155), Vector3(0.044, 0.19, 0.155)], 0.013)
	for es in [-1.0, 1.0]:
		var ear := MeshInstance3D.new()
		var em := CylinderMesh.new(); em.top_radius = 0.012; em.bottom_radius = 0.022; em.height = 0.13; em.radial_segments = 5
		ear.mesh = em; ear.material_override = m_fur; ear.position = Vector3(es * 0.032, 0.26, 0.10); ear.rotation = Vector3(-0.22, 0.0, -es * 0.18)
		root.add_child(ear)
	agents.append({
		"node": root, "waypoints": waypoints, "period": period, "speed": 1.0, "phase": phase,
		"gait": "hop",
	})

static func spawn_ibex(parent: Node3D, agents: Array[Dictionary], node_name: String, waypoints: Array, period: float, phase: float) -> void:
	var root := Node3D.new(); root.name = node_name; root.position = waypoints[0]; parent.add_child(root)
	var m_coat := _species_mat("ibex_coat2", "fur", Color("#5c4f44"), Color("#75675a"), Color("#2c251f"), 0.84)
	var m_horn := _species_mat("ibex_horn2", "horn", Color("#352d26"), Color("#4f4339"), Color("#1e1814"), 0.56)
	var m_hoof := _species_mat("ibex_hoof2", "fur", Color("#221e1b"), Color("#302b27"), Color("#12100e"), 0.68)
	_add_sphere(root, 0.19, 0.34, Vector3(0, 0.39, 0.0), Vector3(0.82, 0.90, 1.65), m_coat)
	_add_sphere(root, 0.12, 0.24, Vector3(0, 0.48, 0.20), Vector3(0.78, 1.15, 0.95), m_coat)
	var head := Node3D.new(); head.position = Vector3(0, 0.56, 0.25); root.add_child(head)
	_add_sphere(head, 0.10, 0.20, Vector3(0, 0.03, 0.06), Vector3(0.82, 0.88, 1.35), m_coat)
	_add_sphere(head, 0.038, 0.11, Vector3(0, -0.07, 0.09), Vector3(0.65, 1.1, 0.7), m_horn, false) # goatee
	_add_eyes(head, [Vector3(-0.058, 0.06, 0.11), Vector3(0.058, 0.06, 0.11)], 0.017)
	for hs in [-1.0, 1.0]:
		var h1 := MeshInstance3D.new()
		var hm1 := CylinderMesh.new(); hm1.top_radius = 0.024; hm1.bottom_radius = 0.034; hm1.height = 0.22; hm1.radial_segments = 6
		h1.mesh = hm1; h1.material_override = m_horn
		h1.position = Vector3(hs * 0.055, 0.16, -0.03); h1.rotation = Vector3(-0.55, 0.0, -hs * 0.18)
		head.add_child(h1)
		var h2 := MeshInstance3D.new()
		var hm2 := CylinderMesh.new(); hm2.top_radius = 0.010; hm2.bottom_radius = 0.023; hm2.height = 0.20; hm2.radial_segments = 6
		h2.mesh = hm2; h2.material_override = m_horn
		h2.position = Vector3(hs * 0.088, 0.22, -0.15); h2.rotation = Vector3(-1.32, 0.0, -hs * 0.26)
		head.add_child(h2)
	var legs: Array = []
	for lp in [Vector3(-0.10, 0.28, 0.18), Vector3(0.10, 0.28, 0.18), Vector3(-0.10, 0.28, -0.20), Vector3(0.10, 0.28, -0.20)]:
		legs.append(_add_leg_pivot(root, lp, 0.044, 0.024, 0.28, m_hoof))
	agents.append({
		"node": root, "waypoints": waypoints, "period": period, "speed": 1.0, "phase": phase,
		"gait": "trot", "legs": legs, "head_node": head,
	})

static func spawn_turtle(parent: Node3D, agents: Array[Dictionary], node_name: String, waypoints: Array, period: float, phase: float) -> void:
	var root := Node3D.new(); root.name = node_name; root.position = waypoints[0]; parent.add_child(root)
	var m_shell := _species_mat("turtle_shell", "turtle", Color("#56663c"), Color("#a58b46"), Color("#2c2516"), 0.42)
	var m_skin := _species_mat("turtle_skin", "crab", Color("#6a7449"), Color("#868e5e"), Color("#3d442a"), 0.56)
	_add_sphere(root, 0.26, 0.20, Vector3(0, 0.09, 0.0), Vector3(0.95, 0.72, 1.24), m_shell)
	_add_sphere(root, 0.07, 0.14, Vector3(0, 0.09, 0.34), Vector3(0.88, 0.82, 1.15), m_skin)
	_add_eyes(root, [Vector3(-0.044, 0.11, 0.39), Vector3(0.044, 0.11, 0.39)], 0.014)
	var legs: Array = []
	for fp in [Vector3(-0.22, 0.06, 0.16), Vector3(0.22, 0.06, 0.16), Vector3(-0.18, 0.05, -0.20), Vector3(0.18, 0.05, -0.20)]:
		var piv := Node3D.new(); piv.position = fp; root.add_child(piv)
		var fm := _add_sphere(piv, 0.095, 0.035, Vector3(signf(fp.x) * 0.11, 0.0, -0.03), Vector3(1.45, 0.45, 0.65), m_skin, false)
		fm.rotation.y = signf(fp.x) * -0.4
		legs.append(piv)
	agents.append({
		"node": root, "waypoints": waypoints, "period": period, "speed": 1.0, "phase": phase,
		"gait": "swim_crawl", "legs": legs,
	})

static func spawn_crab(parent: Node3D, agents: Array[Dictionary], node_name: String, waypoints: Array, period: float, phase: float, tint: Color = Color("#b8452a")) -> void:
	var root := Node3D.new(); root.name = node_name; root.position = waypoints[0]; parent.add_child(root)
	var mat_shell := _species_mat("crab_" + tint.to_html(false), "crab", tint, tint.lightened(0.28), tint.darkened(0.45), 0.36)
	var mat_leg := _species_mat("crab_leg_" + tint.to_html(false), "crab", tint.darkened(0.22), tint, tint.darkened(0.55), 0.48)
	var carapace := _add_sphere(root, 0.125, 0.09, Vector3(0, 0.06, 0.0), Vector3(1.24, 0.58, 0.92), mat_shell)
	_add_eyes(root, [Vector3(-0.045, 0.095, 0.088), Vector3(0.045, 0.095, 0.088)], 0.012)
	var claws: Array = []
	for s_side in [-1.0, 1.0]:
		for l_i in range(3):
			var leg := MeshInstance3D.new()
			var lm := CylinderMesh.new(); lm.top_radius = 0.011; lm.bottom_radius = 0.016; lm.height = 0.15; lm.radial_segments = 4
			leg.mesh = lm; leg.material_override = mat_leg
			leg.position = Vector3(s_side * 0.13, 0.042, float(l_i - 1) * 0.055)
			leg.rotation = Vector3(0.0, 0.0, s_side * 1.12)
			root.add_child(leg)
		var cpiv := Node3D.new(); cpiv.position = Vector3(s_side * 0.11, 0.055, 0.11); root.add_child(cpiv)
		_add_sphere(cpiv, 0.042, 0.065, Vector3(0, 0, 0.045), Vector3(0.88, 0.68, 1.38), mat_shell, false)
		claws.append(cpiv)
	agents.append({
		"node": root, "waypoints": waypoints, "period": period, "speed": 1.0, "phase": phase,
		"gait": "scuttle", "wiggle_node": carapace, "legs": claws,
	})

static func spawn_fish(parent: Node3D, agents: Array[Dictionary], node_name: String, waypoints: Array, period: float, phase: float, tint: Color = Color("#2f5866"), gait_mode: String = "swim_fish", scale_v: float = 1.0) -> void:
	var root := Node3D.new(); root.name = node_name; root.position = waypoints[0]; parent.add_child(root)
	var is_trout := tint.g > tint.b * 0.92 and tint.r > 0.25
	var col_top := tint
	var col_belly := tint.lightened(0.45) if not is_trout else Color("#d2dad6")
	var col_stripe := Color("#d88682") if is_trout else Color("#9fd8ea")
	var mat_f := _species_mat("fish_" + tint.to_html(false), "scales", col_top, col_belly, col_stripe, 0.22, 0.28, true)
	var mat_fin := _species_mat("fin_" + tint.to_html(false), "scales", col_top.darkened(0.1), col_belly, col_stripe, 0.34, 0.12, true)

	var body := _add_sphere(root, 0.062 * scale_v, 0.34 * scale_v, Vector3.ZERO, Vector3(0.68, 1.0, 1.12), mat_f, false)
	body.rotation.x = PI * 0.5
	_add_eyes(root, [Vector3(-0.028 * scale_v, 0.015 * scale_v, 0.12 * scale_v), Vector3(0.028 * scale_v, 0.015 * scale_v, 0.12 * scale_v)], 0.012 * scale_v)

	# Dorsal fin & paired pectoral fins
	var dorsal := MeshInstance3D.new()
	var dm := BoxMesh.new(); dm.size = Vector3(0.012 * scale_v, 0.075 * scale_v, 0.11 * scale_v)
	dorsal.mesh = dm; dorsal.material_override = mat_fin
	dorsal.position = Vector3(0, 0.055 * scale_v, -0.02 * scale_v); dorsal.rotation.x = -0.32
	root.add_child(dorsal)
	for side_f in [-1.0, 1.0]:
		var pf := MeshInstance3D.new()
		var pfm := PlaneMesh.new(); pfm.size = Vector2(0.07 * scale_v, 0.055 * scale_v)
		pf.mesh = pfm; pf.material_override = mat_fin
		pf.position = Vector3(side_f * 0.055 * scale_v, -0.015 * scale_v, 0.04 * scale_v)
		pf.rotation = Vector3(0.1, side_f * 0.55, side_f * -0.25)
		root.add_child(pf)

	var tail_piv := Node3D.new(); tail_piv.position = Vector3(0.0, 0.0, -0.15 * scale_v); root.add_child(tail_piv)
	for f_dir in [-1.0, 1.0]:
		var lobe := MeshInstance3D.new()
		var lm := BoxMesh.new(); lm.size = Vector3(0.014 * scale_v, 0.065 * scale_v, 0.11 * scale_v)
		lobe.mesh = lm; lobe.material_override = mat_fin
		lobe.position = Vector3(0, f_dir * 0.022 * scale_v, -0.055 * scale_v)
		lobe.rotation.x = f_dir * 0.42
		tail_piv.add_child(lobe)

	agents.append({
		"node": root, "waypoints": waypoints, "period": period, "speed": 1.0, "phase": phase,
		"gait": gait_mode, "wiggle_node": tail_piv, "leap_period": 11.5, "leap_height": 0.36 * scale_v,
	})

static func build_bird_node(bird_name: String, body_col: Color, wing_col: Color, scale_v: float = 1.0, cast_shadow: bool = false) -> Dictionary:
	var root := Node3D.new(); root.name = bird_name
	var m_body := _species_mat("bird_b_" + body_col.to_html(false), "feather", body_col, body_col.lightened(0.08), wing_col, 0.66)
	var m_wing := _species_mat("bird_w_" + wing_col.to_html(false), "feather", wing_col.lightened(0.06), body_col, wing_col.darkened(0.45), 0.64, 0.0, true)
	var m_beak := _species_mat("bird_bk", "horn", Color("#e2a238"), Color("#f0be59"), Color("#8e5e18"), 0.48)

	_add_sphere(root, 0.08 * scale_v, 0.28 * scale_v, Vector3.ZERO, Vector3(0.95, 0.85, 1.35), m_body, cast_shadow).rotation.x = PI * 0.45

	var head := Node3D.new(); head.position = Vector3(0, 0.075 * scale_v, 0.14 * scale_v); root.add_child(head)
	_add_sphere(head, 0.052 * scale_v, 0.10 * scale_v, Vector3.ZERO, Vector3(0.92, 0.92, 1.05), m_body, cast_shadow)
	_add_eyes(head, [Vector3(-0.034 * scale_v, 0.015 * scale_v, 0.036 * scale_v), Vector3(0.034 * scale_v, 0.015 * scale_v, 0.036 * scale_v)], 0.011 * scale_v)
	var beak := MeshInstance3D.new()
	var bkm := CylinderMesh.new(); bkm.top_radius = 0.004 * scale_v; bkm.bottom_radius = 0.018 * scale_v; bkm.height = 0.075 * scale_v; bkm.radial_segments = 4
	beak.mesh = bkm; beak.material_override = m_beak; beak.position = Vector3(0, -0.005 * scale_v, 0.068 * scale_v); beak.rotation.x = PI * 0.5
	head.add_child(beak)

	var tail := Node3D.new(); tail.position = Vector3(0, 0.02 * scale_v, -0.15 * scale_v); root.add_child(tail)
	for tf in [-0.22, 0.0, 0.22]:
		var tm := MeshInstance3D.new()
		var tbm := PlaneMesh.new(); tbm.size = Vector2(0.07 * scale_v, 0.18 * scale_v)
		tm.mesh = tbm; tm.material_override = m_wing; tm.position.z = -0.085 * scale_v; tm.rotation.y = tf
		tail.add_child(tm)

	var lw := Node3D.new(); lw.position = Vector3(-0.042 * scale_v, 0.03 * scale_v, 0.02 * scale_v); root.add_child(lw)
	var lwm := MeshInstance3D.new(); lwm.mesh = _get_wing_mesh(-1.0, scale_v); lwm.material_override = m_wing
	lwm.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON if cast_shadow else GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	lw.add_child(lwm)

	var rw := Node3D.new(); rw.position = Vector3(0.042 * scale_v, 0.03 * scale_v, 0.02 * scale_v); root.add_child(rw)
	var rwm := MeshInstance3D.new(); rwm.mesh = _get_wing_mesh(1.0, scale_v); rwm.material_override = m_wing
	rwm.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON if cast_shadow else GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	rw.add_child(rwm)

	return {"root": root, "lw": lw, "rw": rw, "head": head, "tail": tail}

static func spawn_perched_bird(parent: Node3D, agents: Array[Dictionary], node_name: String, pos: Vector3, yaw: float, body_col: Color, wing_col: Color, scale_v: float, phase: float) -> void:
	var b := build_bird_node(node_name, body_col, wing_col, scale_v, true)
	var root: Node3D = b["root"]
	root.position = pos; root.rotation.y = yaw
	parent.add_child(root)
	agents.append({
		"node": root, "gait": "perch", "base_pos": pos, "base_yaw": yaw, "phase": phase,
		"lw": b["lw"], "rw": b["rw"], "head_node": b["head"], "tail_node": b["tail"],
	})

static func spawn_bat(parent: Node3D, agents: Array[Dictionary], node_name: String, waypoints: Array, period: float, phase: float) -> void:
	var b := build_bird_node(node_name, Color("#3a2f2b"), Color("#29211f"), 0.85, false)
	var root: Node3D = b["root"]
	root.position = waypoints[0]; parent.add_child(root)
	agents.append({
		"node": root, "waypoints": waypoints, "period": period, "speed": 1.0, "phase": phase,
		"gait": "bat", "time_gate": "nocturnal", "lw": b["lw"], "rw": b["rw"],
	})

static func spawn_butterflies(parent: Node3D, agents: Array[Dictionary], prefix: String, anchor: Vector3, count: int, seed_v: float) -> void:
	var cols: Array[Color] = [Color("#f0c850"), Color("#7abbe8"), Color("#e88a5a"), Color("#d69be6")]
	for i in range(count):
		var root := Node3D.new(); root.name = "%s_%d" % [prefix, i]
		var wcol: Color = cols[(i + int(round(seed_v))) % cols.size()]
		var mat := _species_mat("bfly_" + wcol.to_html(false), "butterfly", wcol, wcol.lightened(0.25), Color("#261d19"), 0.55, 0.0, true)
		var wm := PlaneMesh.new(); wm.size = Vector2(0.095, 0.12)
		var lw := Node3D.new(); root.add_child(lw)
		var lwm := MeshInstance3D.new(); lwm.mesh = wm; lwm.material_override = mat; lwm.position.x = -0.048; lw.add_child(lwm)
		var rw := Node3D.new(); root.add_child(rw)
		var rwm := MeshInstance3D.new(); rwm.mesh = wm; rwm.material_override = mat; rwm.position.x = 0.048; rw.add_child(rwm)
		parent.add_child(root)
		agents.append({
			"node": root, "gait": "butterfly", "time_gate": "day_clear",
			"base_pos": anchor + Vector3(cos(seed_v + float(i) * 2.1) * 0.4, 0.25, sin(seed_v + float(i) * 2.1) * 0.4),
			"phase": seed_v + float(i) * 1.37, "lw": lw, "rw": rw,
		})

static func spawn_seastar(parent: Node3D, pos: Vector3, tint: Color, seed_v: float) -> void:
	var st := SurfaceTool.new(); st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var sm := SphereMesh.new(); sm.radius = 0.045; sm.height = 0.025; sm.radial_segments = 6; sm.rings = 3
	for i in range(5):
		var a := seed_v + float(i) * (TAU / 5.0)
		var b := Basis.from_euler(Vector3(0.0, -a, 0.0)).scaled(Vector3(1.65, 0.6, 0.42))
		st.append_from(sm, 0, Transform3D(b, Vector3(cos(a) * 0.055, 0.012, sin(a) * 0.055)))
	st.generate_normals()
	var m := MeshInstance3D.new(); m.mesh = st.commit()
	m.material_override = _species_mat("star_" + tint.to_html(false), "crab", tint, tint.lightened(0.32), tint.darkened(0.35), 0.44)
	m.position = pos; m.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parent.add_child(m)
