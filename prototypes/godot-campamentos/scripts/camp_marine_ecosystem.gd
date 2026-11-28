class_name CampMarineEcosystem
extends RefCounted

## Shared coastal marine ecosystem, diegetic reef boundaries, nautical buoys,
## visible sea-current streaks, underwater flora (kelp, corals, gorgonians, starfish),
## and animated marine fauna (multi-depth reef fish schools & gliding manta rays).
## Adapted from El Retiro del Dragón's RetreatAquaticBuilder for coastal camp maps
## (03 · Playa del pecio and 05 · Refugio Cala Pleamar).

const MatKit = preload("res://scripts/camp_material_kit.gd")
const EnvKitScript = preload("res://scripts/camp_environment_kit.gd")

static func build_coastal_marine_life(
	parent: Node3D,
	env_kit: EnvKitScript,
	profile: String,
	sea_y: float,
	seabed_fn: Callable,
	foam_sources: Array,
	rng: RandomNumberGenerator
) -> Dictionary:
	var root := Node3D.new()
	root.name = "CoastalMarineEcosystem"
	parent.add_child(root)

	var anim_state := {
		"buoys": [],
		"reef_fish": [],
		"rays": [],
		"current_streaks": [],
	}

	var is_cove := profile == "coastal-refuge"
	var bay_center := Vector2(18.5, 31.5) if is_cove else Vector2(18.0, 26.8)
	var bay_rx := 21.5 if is_cove else 23.0
	var bay_rz := 22.5 if is_cove else 25.5

	var mat_reef_rock := MatKit.make_textured_mat("basalt-coastal-albedo-v1.webp", Color("#768284"), 0.84, "rock", Vector3(0.24, 0.24, 0.24), true, true)
	var mat_wet_rock := MatKit.make_textured_mat("basalt-coastal-albedo-v1.webp", Color("#4e5e60"), 0.56, "rock", Vector3(0.28, 0.28, 0.28), true, true)
	var mat_piling := MatKit.make_wood_mat(Color("#6a523c"), true)
	var mat_buoy_wood := MatKit.make_wood_mat(Color("#8c4d32"), true)
	var mat_rope := MatKit.make_cloth_mat(Color("#ab9572"), false, true)
	var mat_iron := StandardMaterial3D.new()
	mat_iron.albedo_color = Color("#31373a")
	mat_iron.roughness = 0.44
	mat_iron.metallic = 0.72
	var mat_current := _make_current_streak_mat()

	var crag_pool := env_kit.get_rock_variants("craggy")
	var strat_pool := env_kit.get_rock_variants("stratified")

	# --------------------------------------------------------------------------
	# 1. OUTER REEF BARRIER ARC (Diegetic solid map perimeter blocking swim & dive)
	#    Leaves a central open sea channel (x = 13.5..23.5) guarded by visible currents!
	# --------------------------------------------------------------------------
	var reef_root := Node3D.new()
	reef_root.name = "OuterReefPerimeter"
	root.add_child(reef_root)

	var reef_body := StaticBody3D.new()
	reef_body.name = "OuterReefColliders"
	reef_root.add_child(reef_body)

	var reef_specs: Array = []
	if is_cove:
		reef_specs = [
			# West enclosing sea-cove headland reef arc
			[Vector2(-2.2, 33.8), Vector3(3.4, 2.8, 3.0), 1.05, 18.0],
			[Vector2(-1.4, 39.2), Vector3(4.0, 3.4, 3.6), 1.45, -24.0],
			[Vector2(1.2, 44.8), Vector3(4.2, 3.6, 3.8), 1.20, 32.0],
			[Vector2(5.4, 49.4), Vector3(4.6, 4.0, 4.0), 1.75, -18.0],
			[Vector2(10.6, 52.0), Vector3(4.1, 3.5, 3.6), 0.95, 22.0],
			# West channel guardian sea stack (leaves x=13.5..23.5 open for visible tide current)
			[Vector2(12.6, 50.2), Vector3(2.5, 3.0, 2.3), 0.85, 48.0],
			# East channel guardian sea stack
			[Vector2(24.4, 50.4), Vector3(2.6, 3.1, 2.4), 0.92, -36.0],
			# East enclosing reef arc connecting back to eastern headland
			[Vector2(26.8, 52.2), Vector3(4.3, 3.8, 3.8), 1.65, 28.0],
			[Vector2(32.0, 49.4), Vector3(4.4, 3.7, 3.9), 1.25, -22.0],
			[Vector2(36.2, 44.6), Vector3(4.6, 3.9, 4.0), 1.55, 38.0],
			[Vector2(38.4, 39.0), Vector3(4.1, 3.4, 3.6), 1.15, -16.0],
			[Vector2(37.6, 33.8), Vector3(3.6, 2.9, 3.2), 1.10, 24.0],
		]
	else:
		# Playa del pecio: wide outer reef arc enclosing the swimmable bay & offshore shipwreck
		reef_specs = [
			[Vector2(-2.0, 29.8), Vector3(3.8, 3.0, 3.4), 1.15, 16.0],
			[Vector2(-1.6, 35.8), Vector3(4.2, 3.5, 3.8), 1.50, -28.0],
			[Vector2(0.8, 42.2), Vector3(4.5, 3.8, 4.0), 1.30, 34.0],
			[Vector2(5.2, 47.6), Vector3(4.8, 4.1, 4.2), 1.85, -20.0],
			[Vector2(10.6, 50.8), Vector3(4.2, 3.6, 3.7), 1.05, 19.0],
			[Vector2(12.8, 49.2), Vector3(2.6, 3.0, 2.4), 0.85, 52.0],
			[Vector2(24.6, 49.4), Vector3(2.7, 3.1, 2.4), 0.90, -40.0],
			[Vector2(27.2, 51.0), Vector3(4.4, 3.9, 3.9), 1.70, 26.0],
			[Vector2(33.2, 48.0), Vector3(4.6, 3.8, 4.0), 1.35, -18.0],
			[Vector2(38.6, 42.8), Vector3(4.8, 4.0, 4.1), 1.60, 42.0],
			[Vector2(41.4, 36.4), Vector3(4.3, 3.5, 3.7), 1.25, -26.0],
			[Vector2(41.6, 29.8), Vector3(3.8, 3.1, 3.3), 1.20, 18.0],
		]

	for ri in range(reef_specs.size()):
		var spec: Array = reef_specs[ri]
		var xz: Vector2 = spec[0]
		var sc: Vector3 = spec[1]
		var top_y: float = float(spec[2])
		var yaw: float = deg_to_rad(float(spec[3]))
		var floor_y: float = float(seabed_fn.call(xz.x, xz.y))
		var h_total := maxf(2.4, top_y - floor_y + 0.65)
		var base_y := floor_y + h_total * 0.42

		var rock := MeshInstance3D.new()
		rock.name = "OuterReefStack_%d" % ri
		rock.mesh = strat_pool[ri % strat_pool.size()] if ri % 2 == 0 else crag_pool[ri % crag_pool.size()]
		rock.material_override = mat_reef_rock
		rock.position = Vector3(xz.x, base_y, xz.y)
		rock.rotation = Vector3(rng.randf_range(-0.10, 0.10), yaw, rng.randf_range(-0.10, 0.10))
		rock.scale = Vector3(sc.x * 0.85, h_total * 0.56, sc.z * 0.82)
		reef_root.add_child(rock)

		var shoulder := MeshInstance3D.new()
		shoulder.name = "OuterReefBase_%d" % ri
		shoulder.mesh = crag_pool[(ri + 1) % crag_pool.size()]
		shoulder.material_override = mat_wet_rock
		shoulder.position = Vector3(xz.x + cos(yaw) * (sc.x * 0.45), floor_y + h_total * 0.25, xz.y + sin(yaw) * (sc.z * 0.45))
		shoulder.rotation = Vector3(0.14, yaw + 1.35, -0.12)
		shoulder.scale = Vector3(sc.x * 0.72, h_total * 0.36, sc.z * 0.68)
		reef_root.add_child(shoulder)

		foam_sources.append(Vector3(xz.x, xz.y, maxf(sc.x, sc.z) * 0.42))

		# Continuous vertical collider blocking both surface swimming and seabed diving!
		var col := CollisionShape3D.new()
		var cyl := CylinderShape3D.new()
		cyl.radius = maxf(sc.x, sc.z) * 0.64
		cyl.height = 10.0
		col.shape = cyl
		col.position = Vector3(xz.x, -1.5, xz.y)
		reef_body.add_child(col)

	# Submerged connecting reef ridges between adjacent perimeter sea stacks (channel 5..6 stays open!)
	var gap_pairs := [[0, 1], [1, 2], [2, 3], [3, 4], [7, 8], [8, 9], [9, 10], [10, 11]]
	for gp in gap_pairs:
		var p_a: Vector2 = reef_specs[gp[0]][0]
		var p_b: Vector2 = reef_specs[gp[1]][0]
		var mid := (p_a + p_b) * 0.5
		var fy: float = float(seabed_fn.call(mid.x, mid.y))
		var seg_len := p_a.distance_to(p_b)
		var seg_yaw := atan2(p_b.x - p_a.x, p_b.y - p_a.y)
		var ridge := MeshInstance3D.new()
		ridge.mesh = crag_pool[1]
		ridge.material_override = mat_wet_rock
		ridge.position = Vector3(mid.x, fy + 1.35, mid.y)
		ridge.rotation = Vector3(0.04, seg_yaw, -0.04)
		ridge.scale = Vector3(2.4, 2.6, seg_len * 0.56)
		reef_root.add_child(ridge)
		var seg_col := CollisionShape3D.new()
		var seg_box := BoxShape3D.new()
		seg_box.size = Vector3(2.1, 9.5, seg_len * 0.92)
		seg_col.shape = seg_box
		seg_col.position = Vector3(mid.x, -1.6, mid.y)
		seg_col.rotation.y = seg_yaw
		reef_body.add_child(seg_col)

	# --------------------------------------------------------------------------
	# 2. NAUTICAL MARKER PILINGS, BOBBING BARREL BUOYS & ROPE LINE
	# --------------------------------------------------------------------------
	var buoys_root := Node3D.new()
	buoys_root.name = "CoastalSafeSwimBuoys"
	root.add_child(buoys_root)

	var west_line := [Vector2(4.4, 39.2), Vector2(8.6, 43.2), Vector2(13.2, 45.2)] if is_cove else [Vector2(4.8, 36.2), Vector2(9.2, 40.8), Vector2(13.4, 43.6)]
	var east_line := [Vector2(23.8, 45.2), Vector2(28.4, 43.0), Vector2(32.4, 38.8)] if is_cove else [Vector2(24.0, 43.6), Vector2(29.2, 40.6), Vector2(33.4, 36.4)]
	for line_idx in range(2):
		var pts: Array = west_line if line_idx == 0 else east_line
		for bi in range(pts.size()):
			var p2: Vector2 = pts[bi]
			var fy: float = float(seabed_fn.call(p2.x, p2.y))
			var is_marker := (line_idx == 0 and bi == pts.size() - 1) or (line_idx == 1 and bi == 0)
			if bi % 2 == 0 or is_marker:
				var post_h := maxf(2.2, (sea_y - fy) + (1.15 if is_marker else 0.78))
				var post := MeshInstance3D.new()
				post.name = "SwimPiling_%d_%d" % [line_idx, bi]
				var pcyl := CylinderMesh.new()
				pcyl.top_radius = 0.10 if is_marker else 0.085
				pcyl.bottom_radius = 0.13 if is_marker else 0.11
				pcyl.height = post_h
				pcyl.radial_segments = 8
				post.mesh = pcyl
				post.material_override = mat_piling
				post.position = Vector3(p2.x, fy + post_h * 0.5 - 0.12, p2.y)
				buoys_root.add_child(post)
				var pcol := CollisionShape3D.new()
				var pcs := CylinderShape3D.new(); pcs.radius = 0.20; pcs.height = post_h
				pcol.shape = pcs; pcol.position = post.position
				reef_body.add_child(pcol)
			else:
				var buoy := Node3D.new()
				buoy.name = "SwimBuoy_%d_%d" % [line_idx, bi]
				buoy.position = Vector3(p2.x, sea_y + 0.03, p2.y)
				buoys_root.add_child(buoy)
				var barrel := MeshInstance3D.new()
				var bc := CylinderMesh.new()
				bc.top_radius = 0.22; bc.bottom_radius = 0.22; bc.height = 0.48; bc.radial_segments = 10
				barrel.mesh = bc; barrel.material_override = mat_buoy_wood
				barrel.rotation.z = PI * 0.5
				buoy.add_child(barrel)
				for hx: float in [-0.15, 0.15]:
					var hoop := MeshInstance3D.new()
					var hc := CylinderMesh.new()
					hc.top_radius = 0.235; hc.bottom_radius = 0.235; hc.height = 0.04; hc.radial_segments = 10
					hoop.mesh = hc; hoop.material_override = mat_iron
					hoop.rotation.z = PI * 0.5; hoop.position.x = hx
					buoy.add_child(hoop)
				var ch_h := maxf(0.8, sea_y - fy)
				var chain := MeshInstance3D.new()
				var chc := CylinderMesh.new()
				chc.top_radius = 0.02; chc.bottom_radius = 0.02; chc.height = ch_h; chc.radial_segments = 5
				chain.mesh = chc; chain.material_override = mat_iron
				chain.position = Vector3(0.0, -ch_h * 0.5, 0.0)
				buoy.add_child(chain)
				anim_state["buoys"].append({"node": buoy, "phase": float(line_idx * 4 + bi) * 1.25})
			if bi < pts.size() - 1:
				var p_next: Vector2 = pts[bi + 1]
				var seg_len := p2.distance_to(p_next)
				var mid2 := (p2 + p_next) * 0.5
				var rope := MeshInstance3D.new()
				var rb := BoxMesh.new(); rb.size = Vector3(0.038, 0.038, seg_len)
				rope.mesh = rb; rope.material_override = mat_rope
				rope.position = Vector3(mid2.x, sea_y + 0.20, mid2.y)
				rope.rotation.y = atan2(p_next.x - p2.x, p_next.y - p2.y)
				buoys_root.add_child(rope)

	# --------------------------------------------------------------------------
	# 3. VISIBLE SEA-CURRENT STREAKS AT THE OPEN SEAWARD CHANNEL
	# --------------------------------------------------------------------------
	var cur_root := Node3D.new()
	cur_root.name = "OpenSeaCurrentStreaks"
	root.add_child(cur_root)
	var chan_z := 49.2 if is_cove else 48.0
	for ci in range(5):
		var cx := lerpf(14.5, 22.8, float(ci) / 4.0) + rng.randf_range(-0.35, 0.35)
		var cz := chan_z + sin(float(ci) * 1.9) * 1.2
		var streak := MeshInstance3D.new()
		streak.name = "CurrentStreak_%d" % ci
		var pm := PlaneMesh.new()
		pm.size = Vector2(rng.randf_range(0.70, 1.15), rng.randf_range(4.2, 6.4))
		streak.mesh = pm; streak.material_override = mat_current
		streak.position = Vector3(cx, sea_y + 0.055, cz)
		streak.rotation.y = rng.randf_range(-0.16, 0.16)
		streak.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		cur_root.add_child(streak)
		anim_state["current_streaks"].append({"node": streak, "base_x": cx, "base_z": cz, "phase": float(ci) * 0.88})

	# --------------------------------------------------------------------------
	# 4. BENTHIC MARINE FLORA (MultiMesh: Kelp Forest, Corals, Sea Fans, Starfish)
	# --------------------------------------------------------------------------
	_build_marine_flora(root, sea_y, seabed_fn, reef_specs, bay_center, bay_rx, bay_rz, rng)

	# --------------------------------------------------------------------------
	# 5. UNDERWATER MARINE FAUNA (Multi-depth Reef Fish Schools & Manta Rays)
	# --------------------------------------------------------------------------
	_build_marine_fauna(root, is_cove, sea_y, seabed_fn, rng, anim_state)

	return anim_state

static func _make_multimesh(mm_name: String, mesh: Mesh, mat: Material, xfs: Array[Transform3D], cols: Array[Color]) -> MultiMeshInstance3D:
	var mm := MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	mm.use_colors = true
	mm.mesh = mesh
	mm.instance_count = xfs.size()
	for i in range(xfs.size()):
		mm.set_instance_transform(i, xfs[i])
		mm.set_instance_color(i, cols[i] if i < cols.size() else Color.WHITE)
	var mmi := MultiMeshInstance3D.new()
	mmi.name = mm_name
	mmi.multimesh = mm
	mmi.material_override = mat
	mmi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	return mmi

static func _build_marine_flora(
	parent: Node3D,
	sea_y: float,
	seabed_fn: Callable,
	reef_specs: Array,
	bay_center: Vector2,
	bay_rx: float,
	bay_rz: float,
	rng: RandomNumberGenerator
) -> void:
	var branch_xf: Array[Transform3D] = []
	var branch_col: Array[Color] = []
	var brain_xf: Array[Transform3D] = []
	var brain_col: Array[Color] = []
	var fan_xf: Array[Transform3D] = []
	var fan_col: Array[Color] = []
	var kelp_xf: Array[Transform3D] = []
	var kelp_col: Array[Color] = []
	var star_xf: Array[Transform3D] = []
	var star_col: Array[Color] = []

	var branch_pal: Array[Color] = [Color("#9e523d"), Color("#a86c40"), Color("#944656"), Color("#9c783e"), Color("#754b6e")]
	var brain_pal: Array[Color] = [Color("#94763e"), Color("#687c42"), Color("#8a5442"), Color("#685c7e"), Color("#427a6e")]
	var fan_pal: Array[Color] = [Color("#8e3c4c"), Color("#9c6236"), Color("#76426e"), Color("#947e3c")]
	var kelp_pal: Array[Color] = [Color("#183c2a"), Color("#204c32"), Color("#27542e"), Color("#153428")]
	var star_pal: Array[Color] = [Color("#b84e32"), Color("#c28636"), Color("#9e3a52")]
	var water_tint := Color("#164c56")

	# Coral reef gardens along inner slopes of perimeter sea stacks & mid-bay shelf
	var clusters: Array[Vector2] = []
	for spec in reef_specs:
		var rxz: Vector2 = spec[0]
		var inward := (bay_center - rxz).normalized()
		clusters.append(rxz + inward * 3.2)
	for ci in range(14):
		var a := lerpf(0.22, PI - 0.22, float(ci) / 13.0)
		var r_f := 0.45 + fmod(float(ci) * 0.29, 0.36)
		clusters.append(Vector2(bay_center.x + cos(a) * bay_rx * r_f, bay_center.y + sin(a) * bay_rz * r_f))

	for cl in clusters:
		for _i in range(4):
			var wx := cl.x + rng.randf_range(-2.3, 2.3)
			var wz := cl.y + rng.randf_range(-2.1, 2.1)
			var sy: float = float(seabed_fn.call(wx, wz))
			var depth := sea_y - sy
			# Guarantee at least 0.38m water clearance ABOVE every coral/fan tip (ZERO dry spikes!)
			if depth < 0.72 or depth > 4.8:
				continue
			var avail_h := maxf(0.18, depth - 0.40)
			if rng.randf() < 0.56 and depth >= 0.90:
				var max_b_y := minf(1.18, avail_h / 0.88)
				var sc := minf(rng.randf_range(0.48, 1.05), max_b_y)
				var sc_y := minf(sc * rng.randf_range(0.82, 1.18), max_b_y)
				var b := Basis.from_euler(Vector3(rng.randf_range(-0.10, 0.10), rng.randf_range(0.0, TAU), rng.randf_range(-0.10, 0.10))).scaled(Vector3(sc, sc_y, sc))
				branch_xf.append(Transform3D(b, Vector3(wx, sy + 0.02, wz)))
				branch_col.append(branch_pal[rng.randi() % branch_pal.size()].lerp(water_tint, 0.24))
			else:
				var max_br_y := minf(0.95, avail_h / 0.44)
				var bsc := minf(rng.randf_range(0.42, 0.96), max_br_y)
				var bb := Basis.from_euler(Vector3(rng.randf_range(-0.08, 0.08), rng.randf_range(0.0, TAU), rng.randf_range(-0.08, 0.08))).scaled(Vector3(bsc * 1.14, minf(bsc * 0.66, max_br_y), bsc * 1.08))
				brain_xf.append(Transform3D(bb, Vector3(wx, sy + 0.01, wz)))
				brain_col.append(brain_pal[rng.randi() % brain_pal.size()].lerp(water_tint, 0.24))
			if rng.randf() < 0.40 and depth >= 1.08:
				var fx := wx + rng.randf_range(-0.55, 0.55)
				var fz := wz + rng.randf_range(-0.55, 0.55)
				var fsy: float = float(seabed_fn.call(fx, fz))
				var fdepth := sea_y - fsy
				if fdepth >= 1.05:
					var max_fy := minf(1.08, (fdepth - 0.44) / 0.74)
					var fsc := minf(rng.randf_range(0.54, 1.02), max_fy)
					var fb := Basis.from_euler(Vector3(rng.randf_range(-0.08, 0.08), rng.randf_range(0.0, TAU), rng.randf_range(-0.08, 0.08))).scaled(Vector3(fsc, minf(fsc * 1.06, max_fy), fsc))
					fan_xf.append(Transform3D(fb, Vector3(fx, fsy + 0.02, fz)))
					fan_col.append(fan_pal[rng.randi() % fan_pal.size()].lerp(water_tint, 0.28))

	# Swaying underwater kelp beds & sea-grass meadows strictly submerged (>=0.42m below water surface!)
	for _ki in range(110):
		var kx := rng.randf_range(bay_center.x - bay_rx * 0.92, bay_center.x + bay_rx * 0.92)
		var kz := rng.randf_range(bay_center.y - 1.0, bay_center.y + bay_rz * 0.92)
		var ksy: float = float(seabed_fn.call(kx, kz))
		var depth := sea_y - ksy
		if depth < 0.88 or depth > 4.9:
			continue
		var depth_f := clampf((depth - 0.85) / 2.9, 0.0, 1.0)
		var max_kh := maxf(0.28, depth - 0.45)
		var kh := minf(lerpf(0.38, 1.85, depth_f) * rng.randf_range(0.76, 1.18), max_kh)
		var kw := rng.randf_range(0.52, 0.98)
		var kb := Basis.from_euler(Vector3(rng.randf_range(-0.08, 0.08), rng.randf_range(0.0, TAU), rng.randf_range(-0.08, 0.08))).scaled(Vector3(kw, kh, kw))
		kelp_xf.append(Transform3D(kb, Vector3(kx, ksy + 0.01, kz)))
		kelp_col.append(kelp_pal[rng.randi() % kelp_pal.size()].lerp(water_tint, 0.22))

	# Starfish scattered across clear shallow sandbars & reef floor
	for _si in range(28):
		var sx := rng.randf_range(bay_center.x - bay_rx * 0.78, bay_center.x + bay_rx * 0.78)
		var sz := rng.randf_range(bay_center.y - 3.0, bay_center.y + bay_rz * 0.72)
		var ssy: float = float(seabed_fn.call(sx, sz))
		var depth := sea_y - ssy
		if depth < 0.24 or depth > 3.6:
			continue
		var st_sc := rng.randf_range(0.18, 0.34)
		var stb := Basis.from_euler(Vector3(0.0, rng.randf_range(0.0, TAU), 0.0)).scaled(Vector3(st_sc, 0.06, st_sc))
		star_xf.append(Transform3D(stb, Vector3(sx, ssy + 0.035, sz)))
		star_col.append(star_pal[rng.randi() % star_pal.size()])

	var mat_coral := StandardMaterial3D.new()
	mat_coral.vertex_color_use_as_albedo = true
	mat_coral.vertex_color_is_srgb = true
	mat_coral.roughness = 0.72
	mat_coral.metallic = 0.02

	if not branch_xf.is_empty():
		parent.add_child(_make_multimesh("MM_SeaBranchCorals", _make_branch_coral_mesh(), mat_coral, branch_xf, branch_col))
	if not brain_xf.is_empty():
		parent.add_child(_make_multimesh("MM_SeaBrainCorals", _make_brain_coral_mesh(), mat_coral, brain_xf, brain_col))
	if not fan_xf.is_empty():
		parent.add_child(_make_multimesh("MM_SeaFans", _make_sea_fan_mesh(), _make_swaying_flora_mat(0.10, 1.45), fan_xf, fan_col))
	if not kelp_xf.is_empty():
		parent.add_child(_make_multimesh("MM_DeepKelpForest", _make_tall_kelp_mesh(), _make_swaying_flora_mat(0.18, 1.15), kelp_xf, kelp_col))
	if not star_xf.is_empty():
		parent.add_child(_make_multimesh("MM_BenthicStarfish", _make_starfish_mesh(), mat_coral, star_xf, star_col))

static func _make_simple_mat(col: Color, rough: float, met: float) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = col
	m.roughness = rough
	m.metallic = met
	return m

static func _build_marine_fauna(
	parent: Node3D,
	is_cove: bool,
	sea_y: float,
	seabed_fn: Callable,
	rng: RandomNumberGenerator,
	anim_state: Dictionary
) -> void:
	var fauna_root := Node3D.new()
	fauna_root.name = "CoastalMarineFauna"
	parent.add_child(fauna_root)

	var mat_eye := _make_simple_mat(Color("#101418"), 0.08, 0.15)
	var palettes := [
		[_make_simple_mat(Color("#de9a3c"), 0.26, 0.25), _make_simple_mat(Color("#f0c669"), 0.34, 0.14)],
		[_make_simple_mat(Color("#2c8bb6"), 0.22, 0.34), _make_simple_mat(Color("#62c4dc"), 0.32, 0.16)],
		[_make_simple_mat(Color("#456b84"), 0.24, 0.38), _make_simple_mat(Color("#7ca0b6"), 0.35, 0.18)],
	]

	var z_off := 0.0 if is_cove else -3.5
	var sea_schools := [
		{"center": Vector3(11.0, -0.95, 36.5 + z_off), "count": 5, "pal": 0, "rx": 3.2, "rz": 2.1, "scale": 0.90},
		{"center": Vector3(19.5, -1.55, 40.5 + z_off), "count": 6, "pal": 1, "rx": 3.8, "rz": 2.6, "scale": 0.98},
		{"center": Vector3(27.5, -1.25, 37.8 + z_off), "count": 5, "pal": 0, "rx": 3.0, "rz": 2.0, "scale": 0.92},
		{"center": Vector3(14.0, -2.35, 45.2 + z_off), "count": 5, "pal": 2, "rx": 4.2, "rz": 2.4, "scale": 1.18},
		{"center": Vector3(25.0, -2.25, 44.5 + z_off), "count": 5, "pal": 1, "rx": 3.8, "rz": 2.3, "scale": 1.12},
	]
	var fi_idx := 0
	for sc_def in sea_schools:
		var pal: Array = palettes[int(sc_def["pal"])]
		var cnt: int = int(sc_def["count"])
		var c0: Vector3 = sc_def["center"]
		for _k in range(cnt):
			var off := Vector3(rng.randf_range(-1.5, 1.5), rng.randf_range(-0.24, 0.22), rng.randf_range(-1.3, 1.3))
			var pos := c0 + off
			var floor_here: float = float(seabed_fn.call(pos.x, pos.z))
			var min_rel_y := (floor_here - sea_y) + 0.38
			pos.y = clampf(pos.y, min_rel_y, -0.35)
			var f_sc: float = float(sc_def["scale"]) * rng.randf_range(0.84, 1.16)
			var fnode := _create_reef_fish_node("CoastalReefFish_%d" % fi_idx, pos, f_sc, pal[0], pal[1], mat_eye)
			fauna_root.add_child(fnode)
			anim_state["reef_fish"].append({
				"node": fnode,
				"tail": fnode.get_node_or_null("TailPivot"),
				"center": pos,
				"rx": float(sc_def["rx"]) * rng.randf_range(0.75, 1.15),
				"rz": float(sc_def["rz"]) * rng.randf_range(0.75, 1.15),
				"speed": rng.randf_range(0.36, 0.64),
				"phase": float(fi_idx) * 0.85 + rng.randf_range(0.0, 1.2),
			})
			fi_idx += 1

	# 2 graceful coastal manta rays gliding smoothly above the deeper bay seabed
	var mat_ray_top := _make_simple_mat(Color("#324e5e"), 0.42, 0.12)
	var mat_ray_belly := _make_simple_mat(Color("#a8c2c8"), 0.56, 0.04)
	var ray_specs := [
		{"center": Vector3(14.5, -2.25, 43.5 + z_off), "rx": 5.4, "rz": 3.0, "speed": 0.20, "phase": 0.5, "scale": 1.12},
		{"center": Vector3(24.5, -2.45, 44.0 + z_off), "rx": 5.8, "rz": 3.2, "speed": 0.18, "phase": 2.8, "scale": 1.22},
	]
	for ri in range(ray_specs.size()):
		var rs: Dictionary = ray_specs[ri]
		var rnode := _create_manta_ray_node("CoastalMantaRay_%d" % ri, float(rs["scale"]), mat_ray_top, mat_ray_belly)
		rnode.position = rs["center"]
		fauna_root.add_child(rnode)
		anim_state["rays"].append({
			"node": rnode,
			"wing_l": rnode.get_node_or_null("WingL"),
			"wing_r": rnode.get_node_or_null("WingR"),
			"tail": rnode.get_node_or_null("RayTail"),
			"center": rs["center"],
			"rx": float(rs["rx"]),
			"rz": float(rs["rz"]),
			"speed": float(rs["speed"]),
			"phase": float(rs["phase"]),
		})

static func animate_marine_life(anim_state: Dictionary, t: float, sea_y: float) -> void:
	if anim_state.is_empty():
		return
	for b in anim_state.get("buoys", []):
		var bn: Node3D = b.get("node")
		if not is_instance_valid(bn):
			continue
		var ph: float = float(b.get("phase", 0.0))
		bn.position.y = sea_y + 0.03 + sin(t * 1.85 + ph) * 0.08
		bn.rotation.x = sin(t * 1.45 + ph) * 0.10
		bn.rotation.z = cos(t * 1.25 + ph * 0.7) * 0.12

	for cs in anim_state.get("current_streaks", []):
		var cn: Node3D = cs.get("node")
		if not is_instance_valid(cn):
			continue
		var ph: float = float(cs.get("phase", 0.0))
		var cycle := fposmod(t * 0.55 + ph, 1.0)
		cn.position = Vector3(float(cs["base_x"]) + sin(t * 1.1 + ph) * 0.22, sea_y + 0.055, float(cs["base_z"]) + 2.0 - cycle * 4.0)

	for cf in anim_state.get("reef_fish", []):
		var fn: Node3D = cf.get("node")
		if not is_instance_valid(fn):
			continue
		var c: Vector3 = cf["center"]
		var rx: float = float(cf["rx"])
		var rz: float = float(cf["rz"])
		var spd: float = float(cf["speed"])
		var ph: float = float(cf["phase"])
		var ang := t * spd + ph
		var px := c.x + cos(ang) * rx
		var pz := c.z + sin(ang * 2.0) * rz * 0.55
		var vx := -sin(ang) * rx * spd
		var vz := cos(ang * 2.0) * rz * 1.1 * spd
		fn.position = Vector3(px, sea_y + c.y + sin(ang * 1.6) * 0.09, pz)
		if vx * vx + vz * vz > 0.0001:
			fn.rotation.y = atan2(vx, vz)
		var tp: Node3D = cf.get("tail")
		if is_instance_valid(tp):
			tp.rotation.y = sin(t * 9.0 + ph) * 0.36

	for mr in anim_state.get("rays", []):
		var rn: Node3D = mr.get("node")
		if not is_instance_valid(rn):
			continue
		var c: Vector3 = mr["center"]
		var rx: float = float(mr["rx"])
		var rz: float = float(mr["rz"])
		var spd: float = float(mr["speed"])
		var ph: float = float(mr["phase"])
		var ang := t * spd + ph
		var px := c.x + cos(ang) * rx
		var pz := c.z + sin(ang) * rz
		var vx := -sin(ang) * rx * spd
		var vz := cos(ang) * rz * spd
		rn.position = Vector3(px, sea_y + c.y + sin(t * 1.2 + ph) * 0.14, pz)
		if vx * vx + vz * vz > 0.0001:
			rn.rotation.y = atan2(vx, vz)
		var flap := sin(t * 2.6 + ph) * 0.24
		var wl: Node3D = mr.get("wing_l")
		var wr: Node3D = mr.get("wing_r")
		var rt: Node3D = mr.get("tail")
		if is_instance_valid(wl): wl.rotation.z = flap
		if is_instance_valid(wr): wr.rotation.z = -flap
		if is_instance_valid(rt): rt.rotation.y = sin(t * 2.6 + ph - 0.8) * 0.18

static func _create_reef_fish_node(f_name: String, pos: Vector3, sc: float, mat_body: Material, mat_fin: Material, mat_eye: Material) -> Node3D:
	var root := Node3D.new()
	root.name = f_name
	root.position = pos
	root.scale = Vector3.ONE * sc
	var body := MeshInstance3D.new()
	var bm := SphereMesh.new()
	bm.radius = 0.095; bm.height = 0.24; bm.radial_segments = 8; bm.rings = 4
	body.mesh = bm; body.material_override = mat_body
	body.scale = Vector3(0.55, 0.85, 1.45)
	body.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	root.add_child(body)
	var dorsal := MeshInstance3D.new()
	var dm := PrismMesh.new(); dm.size = Vector3(0.025, 0.09, 0.16)
	dorsal.mesh = dm; dorsal.material_override = mat_fin
	dorsal.position = Vector3(0.0, 0.095, -0.02)
	dorsal.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	root.add_child(dorsal)
	for es: float in [-1.0, 1.0]:
		var eye := MeshInstance3D.new()
		var em := SphereMesh.new(); em.radius = 0.014; em.height = 0.028; em.radial_segments = 6; em.rings = 3
		eye.mesh = em; eye.material_override = mat_eye
		eye.position = Vector3(es * 0.044, 0.022, 0.115)
		eye.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		root.add_child(eye)
	var tp := Node3D.new(); tp.name = "TailPivot"; tp.position = Vector3(0.0, 0.0, -0.15); root.add_child(tp)
	var tail := MeshInstance3D.new()
	var tm := PrismMesh.new(); tm.size = Vector3(0.024, 0.14, 0.12)
	tail.mesh = tm; tail.material_override = mat_fin
	tail.rotation.x = PI * 0.5
	tail.position = Vector3(0.0, 0.0, -0.07)
	tail.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	tp.add_child(tail)
	return root

static func _create_manta_ray_node(r_name: String, sc: float, mat_top: Material, mat_belly: Material) -> Node3D:
	var root := Node3D.new()
	root.name = r_name
	root.scale = Vector3(sc, sc, sc)
	var body := MeshInstance3D.new()
	var bm := SphereMesh.new()
	bm.radius = 0.40; bm.height = 0.20; bm.radial_segments = 10; bm.rings = 5
	body.mesh = bm; body.material_override = mat_top
	body.scale = Vector3(1.15, 0.55, 1.55)
	body.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	root.add_child(body)
	var belly := MeshInstance3D.new()
	belly.mesh = bm; belly.material_override = mat_belly
	belly.scale = Vector3(1.02, 0.35, 1.38)
	belly.position.y = -0.04
	belly.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	root.add_child(belly)
	for side: float in [-1.0, 1.0]:
		var wp := Node3D.new()
		wp.name = "WingL" if side < 0.0 else "WingR"
		wp.position = Vector3(side * 0.30, 0.0, 0.05)
		root.add_child(wp)
		var wm := MeshInstance3D.new()
		var wb := PrismMesh.new(); wb.size = Vector3(0.92, 0.08, 1.02)
		wm.mesh = wb; wm.material_override = mat_top
		wm.position = Vector3(side * 0.42, 0.0, -0.05)
		wm.rotation.y = side * 0.38
		wm.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		wp.add_child(wm)
	var tp := Node3D.new(); tp.name = "RayTail"; tp.position = Vector3(0.0, 0.0, -0.52); root.add_child(tp)
	var tm := MeshInstance3D.new()
	var tc := CylinderMesh.new(); tc.top_radius = 0.015; tc.bottom_radius = 0.052; tc.height = 1.10; tc.radial_segments = 5
	tm.mesh = tc; tm.material_override = mat_top
	tm.rotation.x = PI * 0.5; tm.position = Vector3(0.0, 0.0, -0.52)
	tm.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	tp.add_child(tm)
	return root

static func _make_branch_coral_mesh() -> ArrayMesh:
	var st := SurfaceTool.new(); st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var branches := [
		[Vector3(0.0, 0.0, 0.0), Vector3(0.02, 0.42, 0.01), 0.09, 0.05],
		[Vector3(0.01, 0.24, 0.0), Vector3(0.24, 0.68, 0.14), 0.06, 0.025],
		[Vector3(0.01, 0.28, 0.0), Vector3(-0.22, 0.72, 0.12), 0.06, 0.024],
		[Vector3(0.0, 0.22, 0.01), Vector3(0.10, 0.66, -0.24), 0.055, 0.022],
		[Vector3(-0.02, 0.32, 0.02), Vector3(-0.14, 0.78, -0.18), 0.05, 0.020],
		[Vector3(0.14, 0.48, 0.08), Vector3(0.34, 0.82, 0.22), 0.04, 0.016],
		[Vector3(-0.13, 0.50, 0.06), Vector3(-0.34, 0.85, 0.18), 0.04, 0.016],
	]
	for br in branches:
		_add_taper_limb(st, br[0], br[1], float(br[2]), float(br[3]), 5)
	st.generate_normals()
	return st.commit()

static func _add_taper_limb(st: SurfaceTool, a: Vector3, b: Vector3, r0: float, r1: float, sides: int) -> void:
	var axis := (b - a).normalized()
	var up := Vector3.UP if absf(axis.dot(Vector3.UP)) < 0.92 else Vector3.RIGHT
	var u := axis.cross(up).normalized()
	var v := axis.cross(u).normalized()
	var ring0: Array[Vector3] = []
	var ring1: Array[Vector3] = []
	for i in range(sides):
		var ang := TAU * float(i) / float(sides)
		var d := u * cos(ang) + v * sin(ang)
		ring0.append(a + d * r0)
		ring1.append(b + d * r1)
	for i in range(sides):
		var ni := (i + 1) % sides
		st.set_color(Color.WHITE); st.add_vertex(ring0[i])
		st.set_color(Color.WHITE); st.add_vertex(ring0[ni])
		st.set_color(Color.WHITE); st.add_vertex(ring1[ni])
		st.set_color(Color.WHITE); st.add_vertex(ring0[i])
		st.set_color(Color.WHITE); st.add_vertex(ring1[ni])
		st.set_color(Color.WHITE); st.add_vertex(ring1[i])

static func _make_brain_coral_mesh() -> ArrayMesh:
	var st := SurfaceTool.new(); st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var rings := 4; var segs := 10
	var layers: Array = []
	for ri in range(rings + 1):
		var phi := (float(ri) / float(rings)) * (PI * 0.5)
		var rr := cos(phi) * 0.45
		var yy := sin(phi) * 0.36
		var row: Array[Vector3] = []
		for si in range(segs):
			var th := TAU * float(si) / float(segs)
			var bump := 1.0 + 0.14 * sin(th * 5.0 + float(ri) * 1.4) * cos(phi * 3.0)
			row.append(Vector3(cos(th) * rr * bump, yy * bump, sin(th) * rr * bump))
		layers.append(row)
	for ri in range(rings):
		var a: Array = layers[ri]; var b: Array = layers[ri + 1]
		for si in range(segs):
			var ns := (si + 1) % segs
			st.set_color(Color.WHITE); st.add_vertex(a[si])
			st.set_color(Color.WHITE); st.add_vertex(a[ns])
			st.set_color(Color.WHITE); st.add_vertex(b[ns])
			st.set_color(Color.WHITE); st.add_vertex(a[si])
			st.set_color(Color.WHITE); st.add_vertex(b[ns])
			st.set_color(Color.WHITE); st.add_vertex(b[si])
	st.generate_normals()
	return st.commit()

static func _make_sea_fan_mesh() -> ArrayMesh:
	var st := SurfaceTool.new(); st.begin(Mesh.PRIMITIVE_TRIANGLES)
	for fi in range(5):
		var spread := lerpf(-0.55, 0.55, float(fi) / 4.0)
		var h := 0.72 - absf(spread) * 0.25
		var p0 := Vector3(-0.04, 0.0, 0.0)
		var p1 := Vector3(0.04, 0.0, 0.0)
		var p2 := Vector3(spread + 0.10, h, sin(float(fi)) * 0.06)
		var p3 := Vector3(spread - 0.10, h, sin(float(fi)) * 0.06)
		st.set_color(Color.WHITE); st.set_uv(Vector2(0, 0)); st.add_vertex(p0)
		st.set_color(Color.WHITE); st.set_uv(Vector2(1, 0)); st.add_vertex(p1)
		st.set_color(Color.WHITE); st.set_uv(Vector2(1, 1)); st.add_vertex(p2)
		st.set_color(Color.WHITE); st.set_uv(Vector2(0, 0)); st.add_vertex(p0)
		st.set_color(Color.WHITE); st.set_uv(Vector2(1, 1)); st.add_vertex(p2)
		st.set_color(Color.WHITE); st.set_uv(Vector2(0, 1)); st.add_vertex(p3)
	st.generate_normals()
	return st.commit()

static func _make_tall_kelp_mesh() -> ArrayMesh:
	var st := SurfaceTool.new(); st.begin(Mesh.PRIMITIVE_TRIANGLES)
	for bi in range(4):
		var yaw := float(bi) * (TAU / 4.0) + 0.25
		var ca := cos(yaw); var sa := sin(yaw)
		var w0 := 0.085; var segs := 4
		for si in range(segs):
			var t0 := float(si) / float(segs); var t1 := float(si + 1) / float(segs)
			var x_off0 := sin(t0 * PI) * 0.14; var x_off1 := sin(t1 * PI) * 0.14
			var hw0 := w0 * (1.0 - t0 * 0.55); var hw1 := w0 * (1.0 - t1 * 0.65)
			var a0 := Vector3(ca * (x_off0 - hw0), t0, sa * (x_off0 - hw0))
			var b0 := Vector3(ca * (x_off0 + hw0), t0, sa * (x_off0 + hw0))
			var b1 := Vector3(ca * (x_off1 + hw1), t1, sa * (x_off1 + hw1))
			var a1 := Vector3(ca * (x_off1 - hw1), t1, sa * (x_off1 - hw1))
			st.set_color(Color.WHITE); st.set_uv(Vector2(0, t0)); st.add_vertex(a0)
			st.set_color(Color.WHITE); st.set_uv(Vector2(1, t0)); st.add_vertex(b0)
			st.set_color(Color.WHITE); st.set_uv(Vector2(1, t1)); st.add_vertex(b1)
			st.set_color(Color.WHITE); st.set_uv(Vector2(0, t0)); st.add_vertex(a0)
			st.set_color(Color.WHITE); st.set_uv(Vector2(1, t1)); st.add_vertex(b1)
			st.set_color(Color.WHITE); st.set_uv(Vector2(0, t1)); st.add_vertex(a1)
	st.generate_normals()
	return st.commit()

static func _make_starfish_mesh() -> ArrayMesh:
	var st := SurfaceTool.new(); st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var center_top := Vector3(0.0, 0.25, 0.0)
	for i in range(5):
		var a_tip := TAU * float(i) / 5.0
		var a_l := a_tip - TAU / 10.0
		var a_r := a_tip + TAU / 10.0
		var tip := Vector3(cos(a_tip), 0.0, sin(a_tip))
		var pl := Vector3(cos(a_l) * 0.36, 0.04, sin(a_l) * 0.36)
		var pr := Vector3(cos(a_r) * 0.36, 0.04, sin(a_r) * 0.36)
		st.set_color(Color.WHITE); st.add_vertex(center_top)
		st.set_color(Color.WHITE); st.add_vertex(pl)
		st.set_color(Color.WHITE); st.add_vertex(tip)
		st.set_color(Color.WHITE); st.add_vertex(center_top)
		st.set_color(Color.WHITE); st.add_vertex(tip)
		st.set_color(Color.WHITE); st.add_vertex(pr)
	st.generate_normals()
	return st.commit()

static func _make_swaying_flora_mat(sway_amp: float, sway_spd: float) -> ShaderMaterial:
	var sh := Shader.new()
	sh.code = """
shader_type spatial;
render_mode cull_disabled;
uniform float sway_amp = %.3f;
uniform float sway_spd = %.3f;
varying vec4 vcol;
void vertex() {
	vcol = COLOR;
	vec3 wp = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	float h = clamp(VERTEX.y, 0.0, 1.5);
	VERTEX.x += sin(TIME * sway_spd + wp.x * 0.45 + wp.z * 0.35 + h * 2.2) * sway_amp * h;
	VERTEX.z += cos(TIME * sway_spd * 0.82 + wp.z * 0.42) * sway_amp * 0.72 * h;
}
void fragment() {
	ALBEDO = vcol.rgb;
	ROUGHNESS = 0.82;
	METALLIC = 0.0;
}
""" % [sway_amp, sway_spd]
	var sm := ShaderMaterial.new()
	sm.shader = sh
	return sm

static func _make_current_streak_mat() -> ShaderMaterial:
	var sh := Shader.new()
	sh.code = """
shader_type spatial;
render_mode unshaded, cull_disabled, shadows_disabled, depth_draw_never;
void fragment() {
	vec2 p = UV * 2.0 - 1.0;
	float r_ell = length(vec2(p.x * 1.12, p.y));
	float mask = 1.0 - smoothstep(0.18, 0.96, r_ell);
	float flow = 0.5 + 0.5 * sin(UV.y * 7.5 + TIME * 2.4 + sin(UV.x * 4.5) * 1.4);
	float rib = smoothstep(0.32, 0.88, flow) * (1.0 - abs(p.x) * 0.55);
	ALBEDO = mix(vec3(0.34, 0.66, 0.72), vec3(0.76, 0.88, 0.90), rib);
	ALPHA = mask * rib * 0.14;
}
"""
	var sm := ShaderMaterial.new()
	sm.shader = sh
	sm.render_priority = 2
	return sm
