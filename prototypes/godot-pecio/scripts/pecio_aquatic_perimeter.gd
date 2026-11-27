class_name PecioAquaticPerimeter
extends RefCounted

# ==============================================================================
# PERÍMETRO MARINO DIEGÉTICO Y ECOSISTEMA SUBMARINO DE EL PECIO
# - Opción 1: Corona irregular de escollos basálticos y corales oscuros con
#   espuma rompiente y colisión vertical sólida (superficie + fondo).
# - Toque Opción 2: Costillares, mástiles quebrados y vergas hundidas varadas
#   entre los arrecifes exteriores.
# - Opción 3: Estelas visibles de resaca tormentosa en los canales abiertos y
#   empuje hidrodinámico suave devolviendo al nadador hacia el pecio.
# - Opción 4: 4 tiburones de arrecife patrullando el límite exterior (2 con
#   aleta dorsal rasgando la superficie y 2 patrullando en profundidad).
# - Flora y fauna submarina: corales ramificados/cerebro, gorgonias, kelp
#   profundo mecido, estrellas de mar y 26 peces de arrecife en 5 cardúmenes.
# ==============================================================================

const PbrMaterialKit = preload("res://scripts/pbr_material_kit.gd")
const WreckStructure = preload("res://scripts/wreck_structure.gd")

static func build_perimeter_and_marine_life(reef: Node3D) -> Dictionary:
	var root := Node3D.new()
	root.name = "PecioAquaticPerimeter"
	reef.add_child(root)

	var rng := RandomNumberGenerator.new()
	rng.seed = 202611261

	var anim := {
		"sharks": [],
		"fish": [],
		"current_streaks": []
	}

	var sea_y := WreckStructure.SEA_HEIGHT
	var mat_basalt: Material = reef.get("mat_basalt")
	var mat_wood := PbrMaterialKit.create_wood_planks_pbr("#524132", 0.36)
	var mat_foam := _make_surf_foam_mat()
	var mat_current := _make_current_streak_mat()

	# --------------------------------------------------------------------------
	# 1. OPCIÓN 1: ANILLO EXTERIOR DE ESCOLLOS VOLCÁNICOS CON COLISIÓN SÓLIDA
	#    Elipse exterior rx=41..44.5, rz=29..32 (fuera del casco y del bote)
	# --------------------------------------------------------------------------
	var ring_root := Node3D.new()
	ring_root.name = "OuterBasaltReefRing"
	root.add_child(ring_root)

	var ring_body := StaticBody3D.new()
	ring_body.name = "OuterReefColliders"
	ring_root.add_child(ring_body)

	var rock_res_a = load("res://assets/models/rocks-a.glb")
	var rock_res_b = load("res://assets/models/rocks-b.glb")
	var rock_res_c = load("res://assets/models/rocks-c.glb")
	var rock_models := [rock_res_a, rock_res_b, rock_res_c]

	var rock_count := 20
	var rock_positions: Array[Vector2] = []
	for i in range(rock_count):
		var ang := TAU * float(i) / float(rock_count) + 0.14
		# Dejar 3 canales estrechos dramáticos (Norte, Sur-Oeste, Este) donde actúa la resaca + patrulla de tiburones
		var rx := 42.5 + sin(ang * 3.0) * 1.9
		var rz := 30.2 + cos(ang * 2.0) * 1.6
		var px := cos(ang) * rx
		var pz := sin(ang) * rz
		rock_positions.append(Vector2(px, pz))

		var is_channel_gap := (i in [5, 10, 15])
		var floor_y: float = float(reef.call("_seabed_height", px, pz))

		if is_channel_gap:
			# Estelas sutiles de resaca tormentosa marcando visualmente el canal exterior
			var streak := MeshInstance3D.new()
			streak.name = "StormCurrentStreak_%d" % i
			var pm := PlaneMesh.new()
			pm.size = Vector2(1.55, 7.2)
			streak.mesh = pm
			streak.material_override = mat_current
			streak.position = Vector3(px * 0.90, sea_y + 0.05, pz * 0.90)
			streak.rotation.y = atan2(-px, -pz)
			streak.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
			ring_root.add_child(streak)
			anim["current_streaks"].append({
				"node": streak,
				"base_pos": Vector3(px * 0.90, sea_y + 0.05, pz * 0.90),
				"inward": Vector3(-px, 0.0, -pz).normalized(),
				"phase": float(i) * 0.77
			})
			continue

		var sc_base := rng.randf_range(1.65, 2.35)
		var sc_y := sc_base * rng.randf_range(0.95, 1.35)
		var yaw := rng.randf_range(0.0, TAU)
		var model_res = rock_models[i % rock_models.size()]
		if model_res:
			var inst: Node3D = model_res.instantiate()
			inst.name = "OuterReefStack_%d" % i
			inst.position = Vector3(px, sea_y - 0.55 - rng.randf_range(0.0, 0.55), pz)
			inst.rotation = Vector3(rng.randf_range(-0.10, 0.10), yaw, rng.randf_range(-0.10, 0.10))
			inst.scale = Vector3(sc_base, sc_y, sc_base * rng.randf_range(0.88, 1.15))
			reef.call("_apply_basalt_material", inst)
			ring_root.add_child(inst)

			# Farallón secundario flanqueando para formar un arrecife orgánico como SternReef/BowReef
			var side_res = rock_models[(i + 1) % rock_models.size()]
			if side_res:
				var s_inst: Node3D = side_res.instantiate()
				s_inst.position = Vector3(px + cos(yaw) * 2.1, sea_y - 1.25, pz + sin(yaw) * 2.1)
				s_inst.rotation = Vector3(rng.randf_range(-0.12, 0.12), yaw + 1.15, rng.randf_range(-0.12, 0.12))
				s_inst.scale = Vector3(sc_base * 0.80, sc_y * 0.72, sc_base * 0.78)
				reef.call("_apply_basalt_material", s_inst)
				ring_root.add_child(s_inst)

		# Disco suave de espuma orgánica con desvanecimiento radial (sin anillos poligonales blancos)
		var foam := MeshInstance3D.new()
		var fp := PlaneMesh.new()
		var f_diam := sc_base * 4.4
		fp.size = Vector2(f_diam, f_diam)
		foam.mesh = fp
		foam.material_override = mat_foam
		foam.position = Vector3(px, sea_y + 0.045, pz)
		foam.rotation.y = yaw
		foam.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		ring_root.add_child(foam)

		# Colisionador cilíndrico vertical continuo (bloquea superficie y buceo)
		var col := CollisionShape3D.new()
		col.name = "Col_OuterReef_%d" % i
		var cyl := CylinderShape3D.new()
		cyl.radius = sc_base * 1.35
		cyl.height = 12.0
		col.shape = cyl
		col.position = Vector3(px, sea_y - 2.0, pz)
		ring_body.add_child(col)

	# --------------------------------------------------------------------------
	# 2. TOQUE OPCIÓN 2: RESTOS DE NAUFRAGIO VARADOS EN LOS ARRECIFES EXTERIORES
	# --------------------------------------------------------------------------
	var wreck_debris := [
		[Vector3(-36.5, sea_y - 0.6, -18.2), Vector3(0.42, 0.42, 7.6), Vector3(0.28, 0.72, 0.14)],
		[Vector3(35.8, sea_y - 0.4, 17.5), Vector3(0.38, 0.38, 6.8), Vector3(-0.34, -0.58, 0.18)],
		[Vector3(-14.0, sea_y - 1.2, -28.4), Vector3(0.36, 0.36, 6.2), Vector3(0.42, 1.25, -0.22)],
		[Vector3(16.5, sea_y - 0.9, 27.6), Vector3(0.40, 0.40, 7.0), Vector3(-0.26, 0.44, 0.25)],
		[Vector3(-38.0, sea_y - 2.6, 4.5), Vector3(0.34, 0.34, 5.8), Vector3(0.18, -1.10, 0.30)],
		[Vector3(37.5, sea_y - 2.2, -14.0), Vector3(0.35, 0.35, 6.4), Vector3(-0.22, 0.95, -0.18)],
	]
	for di in range(wreck_debris.size()):
		var wd: Array = wreck_debris[di]
		var spar := MeshInstance3D.new()
		spar.name = "OuterWreckTimber_%d" % di
		var bm := BoxMesh.new()
		bm.size = wd[1]
		spar.mesh = bm
		spar.material_override = mat_wood
		spar.position = wd[0]
		spar.rotation = wd[2]
		ring_root.add_child(spar)
		# Costillas laterales rotas sobresaliendo del palo principal
		for ri in range(3):
			var rib := MeshInstance3D.new()
			var rbm := BoxMesh.new()
			rbm.size = Vector3(0.16, 1.85, 0.22)
			rib.mesh = rbm
			rib.material_override = mat_wood
			rib.position = Vector3(0.0, 0.35, lerpf(-2.0, 2.0, float(ri) / 2.0))
			rib.rotation = Vector3(0.15, 0.0, (0.45 if ri % 2 == 0 else -0.45))
			spar.add_child(rib)

	# --------------------------------------------------------------------------
	# 3. OPCIÓN 4: TIBURONES DE ARRECIFE PATRULLANDO EL LÍMITE EXTERIOR
	#    2 cerca de la superficie (aleta dorsal visible) + 2 en profundidad
	# --------------------------------------------------------------------------
	var shark_root := Node3D.new()
	shark_root.name = "PerimeterPatrolSharks"
	root.add_child(shark_root)

	var mat_shark_top := StandardMaterial3D.new()
	mat_shark_top.albedo_color = Color("#2c3c47")
	mat_shark_top.roughness = 0.34
	mat_shark_top.metallic = 0.14
	var mat_shark_belly := StandardMaterial3D.new()
	mat_shark_belly.albedo_color = Color("#9fb0b8")
	mat_shark_belly.roughness = 0.48

	var shark_specs := [
		{"rx": 36.8, "rz": 25.5, "y": sea_y - 0.22, "speed": 0.16, "phase": 0.3, "dir": 1.0, "scale": 1.28},
		{"rx": 38.2, "rz": 26.8, "y": sea_y - 0.20, "speed": 0.14, "phase": 3.4, "dir": -1.0, "scale": 1.36},
		{"rx": 34.5, "rz": 23.8, "y": sea_y - 2.35, "speed": 0.18, "phase": 1.8, "dir": 1.0, "scale": 1.18},
		{"rx": 36.0, "rz": 24.8, "y": sea_y - 2.65, "speed": 0.15, "phase": 4.9, "dir": -1.0, "scale": 1.24},
	]
	for si in range(shark_specs.size()):
		var ss: Dictionary = shark_specs[si]
		var snode := _create_reef_shark_node("PatrolReefShark_%d" % si, float(ss["scale"]), mat_shark_top, mat_shark_belly)
		shark_root.add_child(snode)
		anim["sharks"].append({
			"node": snode,
			"tail": snode.get_node_or_null("SharkTail"),
			"rx": float(ss["rx"]),
			"rz": float(ss["rz"]),
			"base_y": float(ss["y"]),
			"speed": float(ss["speed"]),
			"phase": float(ss["phase"]),
			"dir": float(ss["dir"])
		})

	# --------------------------------------------------------------------------
	# 4. CORALES, GORGONIAS, KELP PROFUNDO Y CARDÚMENES VISIBLES AL BUCEAR
	# --------------------------------------------------------------------------
	_build_pecio_corals_and_kelp(reef, root, rng)
	_build_pecio_fish_schools(root, rng, sea_y, anim)

	return anim

static func sample_sea_current_push(world_pos: Vector3) -> Vector3:
	# Empuje hidrodinámico suave en los canales exteriores y borde de la corona de arrecifes
	var rx := 37.8
	var rz := 26.2
	var rel := Vector2(world_pos.x / rx, world_pos.z / rz)
	var r := rel.length()
	if r <= 0.96:
		return Vector3.ZERO
	var t := clampf((r - 0.96) / 0.18, 0.0, 1.0)
	var inward := Vector2(-world_pos.x, -world_pos.z).normalized()
	var mag := lerpf(1.6, 8.2, t * t)
	return Vector3(inward.x * mag, 0.0, inward.y * mag)

static func animate_marine_life(anim: Dictionary, t: float, sea_y: float) -> void:
	if anim.is_empty():
		return
	for cs in anim.get("current_streaks", []):
		var cn: Node3D = cs.get("node")
		if not is_instance_valid(cn):
			continue
		var ph: float = float(cs["phase"])
		var cycle := fposmod(t * 0.52 + ph, 1.0)
		var base_p: Vector3 = cs["base_pos"]
		var inw: Vector3 = cs["inward"]
		cn.position = base_p - inw * 2.4 + inw * (cycle * 4.8)
		cn.position.y = sea_y + 0.06

	for sh in anim.get("sharks", []):
		var sn: Node3D = sh.get("node")
		if not is_instance_valid(sn):
			continue
		var d: float = float(sh["dir"])
		var spd: float = float(sh["speed"]) * d
		var ang := t * spd + float(sh["phase"])
		var rx: float = float(sh["rx"])
		var rz: float = float(sh["rz"])
		var px := cos(ang) * rx
		var pz := sin(ang) * rz
		var vx := -sin(ang) * rx * spd
		var vz := cos(ang) * rz * spd
		sn.position = Vector3(px, float(sh["base_y"]) + sin(t * 1.4 + float(sh["phase"])) * 0.10, pz)
		if vx * vx + vz * vz > 0.0001:
			sn.rotation.y = atan2(vx, vz)
		var tp: Node3D = sh.get("tail")
		if is_instance_valid(tp):
			tp.rotation.y = sin(t * 5.2 + float(sh["phase"])) * 0.34

	for fi in anim.get("fish", []):
		var fn: Node3D = fi.get("node")
		if not is_instance_valid(fn):
			continue
		var c: Vector3 = fi["center"]
		var rx: float = float(fi["rx"])
		var rz: float = float(fi["rz"])
		var spd: float = float(fi["speed"])
		var ph: float = float(fi["phase"])
		var ang := t * spd + ph
		var px := c.x + cos(ang) * rx
		var pz := c.z + sin(ang * 2.0) * rz * 0.55
		var vx := -sin(ang) * rx * spd
		var vz := cos(ang * 2.0) * rz * 1.1 * spd
		fn.position = Vector3(px, c.y + sin(ang * 1.5) * 0.14, pz)
		if vx * vx + vz * vz > 0.0001:
			fn.rotation.y = atan2(vx, vz)
		var tp: Node3D = fi.get("tail")
		if is_instance_valid(tp):
			tp.rotation.y = sin(t * 9.5 + ph) * 0.38

static func _build_pecio_corals_and_kelp(reef: Node3D, parent: Node3D, rng: RandomNumberGenerator) -> void:
	var branch_xf: Array[Transform3D] = []
	var branch_col: Array[Color] = []
	var brain_xf: Array[Transform3D] = []
	var brain_col: Array[Color] = []
	var fan_xf: Array[Transform3D] = []
	var fan_col: Array[Color] = []
	var kelp_xf: Array[Transform3D] = []
	var kelp_col: Array[Color] = []

	var branch_pal: Array[Color] = [Color("#c95a48"), Color("#d68346"), Color("#a64d68"), Color("#b88e42"), Color("#7c4f84")]
	var brain_pal: Array[Color] = [Color("#ad8a44"), Color("#6d8c52"), Color("#9e5d4a"), Color("#6c628a"), Color("#488a7c")]
	var fan_pal: Array[Color] = [Color("#b84458"), Color("#cf7838"), Color("#8e4a82"), Color("#bfa346")]
	var kelp_pal: Array[Color] = [Color("#183828"), Color("#204730"), Color("#26522e"), Color("#142e24")]

	# Corales densos alrededor de SternReef, BowReef y el lecho circundante (sin invadir bodega C9)
	for _ci in range(95):
		var ang := rng.randf_range(0.0, TAU)
		var rad := rng.randf_range(12.5, 37.5)
		var wx := cos(ang) * rad * 1.12
		var wz := sin(ang) * rad * 0.78
		if absf(wx) < 28.5 and absf(wz) < 10.8:
			continue
		var sy: float = float(reef.call("_seabed_height", wx, wz))
		var sc := rng.randf_range(0.75, 1.55)
		var b := Basis.from_euler(Vector3(rng.randf_range(-0.14, 0.14), rng.randf_range(0.0, TAU), rng.randf_range(-0.14, 0.14))).scaled(Vector3(sc, sc * rng.randf_range(0.9, 1.35), sc))
		if rng.randf() < 0.52:
			branch_xf.append(Transform3D(b, Vector3(wx, sy + 0.05, wz)))
			branch_col.append(branch_pal[rng.randi() % branch_pal.size()])
		else:
			var bb := Basis.from_euler(Vector3(rng.randf_range(-0.1, 0.1), rng.randf_range(0.0, TAU), rng.randf_range(-0.1, 0.1))).scaled(Vector3(sc * 1.25, sc * 0.78, sc * 1.20))
			brain_xf.append(Transform3D(bb, Vector3(wx, sy + 0.04, wz)))
			brain_col.append(brain_pal[rng.randi() % brain_pal.size()])
		if rng.randf() < 0.45:
			var fb := Basis.from_euler(Vector3(rng.randf_range(-0.12, 0.12), rng.randf_range(0.0, TAU), rng.randf_range(-0.12, 0.12))).scaled(Vector3(sc * 1.05, sc * 1.35, sc * 1.05))
			fan_xf.append(Transform3D(fb, Vector3(wx + rng.randf_range(-0.8, 0.8), sy + 0.05, wz + rng.randf_range(-0.8, 0.8))))
			fan_col.append(fan_pal[rng.randi() % fan_pal.size()])

	# Bosque de kelp profundo alabeado por la corriente alrededor del pecio
	for _ki in range(125):
		var ang := rng.randf_range(0.0, TAU)
		var rad := rng.randf_range(13.0, 39.5)
		var kx := cos(ang) * rad * 1.12
		var kz := sin(ang) * rad * 0.78
		if absf(kx) < 28.0 and absf(kz) < 10.6:
			continue
		var ksy: float = float(reef.call("_seabed_height", kx, kz))
		var kh := rng.randf_range(1.6, 3.2)
		var kw := rng.randf_range(0.75, 1.35)
		var kb := Basis.from_euler(Vector3(rng.randf_range(-0.12, 0.12), rng.randf_range(0.0, TAU), rng.randf_range(-0.12, 0.12))).scaled(Vector3(kw, kh, kw))
		kelp_xf.append(Transform3D(kb, Vector3(kx, ksy + 0.04, kz)))
		kelp_col.append(kelp_pal[rng.randi() % kelp_pal.size()])

	var mat_coral := StandardMaterial3D.new()
	mat_coral.vertex_color_use_as_albedo = true
	mat_coral.vertex_color_is_srgb = true
	mat_coral.roughness = 0.74

	_add_multimesh(parent, "MM_PecioBranchCorals", _make_branch_coral_mesh(), mat_coral, branch_xf, branch_col)
	_add_multimesh(parent, "MM_PecioBrainCorals", _make_brain_coral_mesh(), mat_coral, brain_xf, brain_col)
	_add_multimesh(parent, "MM_PecioSeaFans", _make_sea_fan_mesh(), _make_swaying_flora_mat(0.12, 1.55), fan_xf, fan_col)
	_add_multimesh(parent, "MM_PecioDeepKelp", _make_tall_kelp_mesh(), _make_swaying_flora_mat(0.22, 1.25), kelp_xf, kelp_col)

static func _build_pecio_fish_schools(parent: Node3D, rng: RandomNumberGenerator, sea_y: float, anim: Dictionary) -> void:
	var froot := Node3D.new()
	froot.name = "PecioReefFishSchools"
	parent.add_child(froot)

	var mat_eye := StandardMaterial3D.new()
	mat_eye.albedo_color = Color("#101418")
	mat_eye.roughness = 0.1

	var pals := [
		[_make_fish_mat(Color("#4c98b5"), 0.24, 0.34), _make_fish_mat(Color("#87cbe0"), 0.34, 0.16)],
		[_make_fish_mat(Color("#db8d3a"), 0.26, 0.24), _make_fish_mat(Color("#f0be64"), 0.36, 0.14)],
		[_make_fish_mat(Color("#3a647a"), 0.24, 0.36), _make_fish_mat(Color("#6b9cb0"), 0.35, 0.18)],
	]

	var schools := [
		{"center": Vector3(-22.0, sea_y - 1.9, 17.5), "count": 6, "pal": 0, "rx": 4.2, "rz": 2.6, "scale": 1.05},
		{"center": Vector3(22.0, sea_y - 2.1, -16.5), "count": 5, "pal": 1, "rx": 4.0, "rz": 2.4, "scale": 0.98},
		{"center": Vector3(0.0, sea_y - 2.5, -18.0), "count": 5, "pal": 0, "rx": 5.5, "rz": 2.8, "scale": 1.10},
		{"center": Vector3(12.0, sea_y - 2.8, 19.0), "count": 5, "pal": 2, "rx": 4.8, "rz": 2.6, "scale": 1.22},
		{"center": Vector3(-31.0, sea_y - 2.4, -8.5), "count": 5, "pal": 1, "rx": 3.8, "rz": 2.8, "scale": 1.02},
	]
	var idx := 0
	for sc in schools:
		var pal: Array = pals[int(sc["pal"])]
		var c0: Vector3 = sc["center"]
		for _k in range(int(sc["count"])):
			var pos := c0 + Vector3(rng.randf_range(-1.8, 1.8), rng.randf_range(-0.45, 0.35), rng.randf_range(-1.5, 1.5))
			var fn := _create_fish_node("PecioReefFish_%d" % idx, pos, float(sc["scale"]) * rng.randf_range(0.84, 1.18), pal[0], pal[1], mat_eye)
			froot.add_child(fn)
			anim["fish"].append({
				"node": fn,
				"tail": fn.get_node_or_null("TailPivot"),
				"center": pos,
				"rx": float(sc["rx"]) * rng.randf_range(0.75, 1.15),
				"rz": float(sc["rz"]) * rng.randf_range(0.75, 1.15),
				"speed": rng.randf_range(0.36, 0.62),
				"phase": float(idx) * 0.92 + rng.randf_range(0.0, 1.2)
			})
			idx += 1

static func _create_reef_shark_node(s_name: String, sc: float, mat_top: Material, mat_belly: Material) -> Node3D:
	var root := Node3D.new()
	root.name = s_name
	root.scale = Vector3(sc, sc, sc)

	var torso := MeshInstance3D.new()
	var sm := SphereMesh.new()
	sm.radius = 0.28; sm.height = 1.85; sm.radial_segments = 10; sm.rings = 6
	torso.mesh = sm
	torso.material_override = mat_top
	torso.rotation.x = PI * 0.5
	torso.scale = Vector3(1.0, 1.0, 0.85)
	torso.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	root.add_child(torso)

	var belly := MeshInstance3D.new()
	belly.mesh = sm
	belly.material_override = mat_belly
	belly.rotation.x = PI * 0.5
	belly.scale = Vector3(0.86, 0.86, 0.62)
	belly.position.y = -0.08
	belly.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	root.add_child(belly)

	# Aleta dorsal prominente (rompe las olas en los tiburones de superficie)
	var dorsal := MeshInstance3D.new()
	var dm := PrismMesh.new()
	dm.size = Vector3(0.07, 0.44, 0.36)
	dorsal.mesh = dm
	dorsal.material_override = mat_top
	dorsal.position = Vector3(0.0, 0.32, 0.05)
	dorsal.rotation.x = -0.22
	dorsal.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	root.add_child(dorsal)

	# Aletas pectorales
	for side in [-1.0, 1.0]:
		var pec := MeshInstance3D.new()
		var pm := PrismMesh.new()
		pm.size = Vector3(0.56, 0.05, 0.28)
		pec.mesh = pm
		pec.material_override = mat_top
		pec.position = Vector3(side * 0.36, -0.08, 0.22)
		pec.rotation = Vector3(0.0, side * 0.35, -side * 0.16)
		pec.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		root.add_child(pec)

	# Cola animada
	var tail := Node3D.new()
	tail.name = "SharkTail"
	tail.position = Vector3(0.0, 0.0, -0.82)
	root.add_child(tail)
	var ped := MeshInstance3D.new()
	var pc := CylinderMesh.new()
	pc.top_radius = 0.05; pc.bottom_radius = 0.14; pc.height = 0.65; pc.radial_segments = 6
	ped.mesh = pc
	ped.material_override = mat_top
	ped.rotation.x = PI * 0.5
	ped.position = Vector3(0.0, 0.0, -0.32)
	ped.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	tail.add_child(ped)
	var fluke := MeshInstance3D.new()
	var fm := PrismMesh.new()
	fm.size = Vector3(0.05, 0.56, 0.32)
	fluke.mesh = fm
	fluke.material_override = mat_top
	fluke.position = Vector3(0.0, 0.08, -0.68)
	fluke.rotation.x = -0.32
	fluke.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	tail.add_child(fluke)

	return root

static func _create_fish_node(f_name: String, pos: Vector3, sc: float, mat_body: Material, mat_fin: Material, mat_eye: Material) -> Node3D:
	var root := Node3D.new()
	root.name = f_name
	root.position = pos
	root.scale = Vector3(sc, sc, sc)
	var body := MeshInstance3D.new()
	var bm := SphereMesh.new()
	bm.radius = 0.11; bm.height = 0.44; bm.radial_segments = 8; bm.rings = 4
	body.mesh = bm
	body.material_override = mat_body
	body.rotation.x = PI * 0.5
	body.scale = Vector3(0.55, 1.0, 0.85)
	body.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	root.add_child(body)
	var dorsal := MeshInstance3D.new()
	var dm := PrismMesh.new()
	dm.size = Vector3(0.025, 0.09, 0.16)
	dorsal.mesh = dm
	dorsal.material_override = mat_fin
	dorsal.position = Vector3(0.0, 0.10, -0.02)
	dorsal.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	root.add_child(dorsal)
	var tp := Node3D.new()
	tp.name = "TailPivot"
	tp.position = Vector3(0.0, 0.0, -0.20)
	root.add_child(tp)
	var tail := MeshInstance3D.new()
	var tm := PrismMesh.new()
	tm.size = Vector3(0.025, 0.15, 0.14)
	tail.mesh = tm
	tail.material_override = mat_fin
	tail.position = Vector3(0.0, 0.0, -0.07)
	tail.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	tp.add_child(tail)
	for side in [-1.0, 1.0]:
		var eye := MeshInstance3D.new()
		var em := SphereMesh.new()
		em.radius = 0.018; em.height = 0.036; em.radial_segments = 6; em.rings = 3
		eye.mesh = em
		eye.material_override = mat_eye
		eye.position = Vector3(side * 0.055, 0.025, 0.13)
		eye.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		root.add_child(eye)
	return root

static func _make_fish_mat(col: Color, rough: float, met: float) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = col
	m.roughness = rough
	m.metallic = met
	return m

static func _add_multimesh(parent: Node3D, mm_name: String, mesh: Mesh, mat: Material, xfs: Array[Transform3D], cols: Array[Color]) -> void:
	if xfs.is_empty():
		return
	var mm := MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	mm.use_colors = true
	mm.mesh = mesh
	mm.instance_count = xfs.size()
	for i in range(xfs.size()):
		mm.set_instance_transform(i, xfs[i])
		mm.set_instance_color(i, cols[i])
	var mmi := MultiMeshInstance3D.new()
	mmi.name = mm_name
	mmi.multimesh = mm
	mmi.material_override = mat
	mmi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parent.add_child(mmi)

static func _make_branch_coral_mesh() -> ArrayMesh:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var branches := [
		[Vector3(0.0, 0.0, 0.0), Vector3(0.02, 0.44, 0.01), 0.10, 0.055],
		[Vector3(0.01, 0.25, 0.0), Vector3(0.26, 0.72, 0.15), 0.065, 0.025],
		[Vector3(0.01, 0.30, 0.0), Vector3(-0.24, 0.76, 0.13), 0.065, 0.024],
		[Vector3(0.0, 0.24, 0.01), Vector3(0.11, 0.70, -0.25), 0.058, 0.022],
		[Vector3(-0.02, 0.34, 0.02), Vector3(-0.15, 0.84, -0.19), 0.052, 0.020],
	]
	for br in branches:
		_add_limb(st, br[0], br[1], float(br[2]), float(br[3]), 5)
	st.generate_normals()
	return st.commit()

static func _add_limb(st: SurfaceTool, a: Vector3, b: Vector3, r0: float, r1: float, sides: int) -> void:
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
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var rings := 4
	var segs := 10
	var layers: Array = []
	for ri in range(rings + 1):
		var phi := (float(ri) / float(rings)) * (PI * 0.5)
		var rr := cos(phi) * 0.48
		var yy := sin(phi) * 0.38
		var row: Array[Vector3] = []
		for si in range(segs):
			var th := TAU * float(si) / float(segs)
			var bump := 1.0 + 0.14 * sin(th * 5.0 + float(ri) * 1.4) * cos(phi * 3.0)
			row.append(Vector3(cos(th) * rr * bump, yy * bump, sin(th) * rr * bump))
		layers.append(row)
	for ri in range(rings):
		var a: Array = layers[ri]
		var b: Array = layers[ri + 1]
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
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	for fi in range(5):
		var spread := lerpf(-0.55, 0.55, float(fi) / 4.0)
		var h := 0.78 - absf(spread) * 0.25
		var p0 := Vector3(-0.04, 0.0, 0.0)
		var p1 := Vector3(0.04, 0.0, 0.0)
		var p2 := Vector3(spread + 0.11, h, sin(float(fi)) * 0.06)
		var p3 := Vector3(spread - 0.11, h, sin(float(fi)) * 0.06)
		st.set_color(Color.WHITE); st.set_uv(Vector2(0, 0)); st.add_vertex(p0)
		st.set_color(Color.WHITE); st.set_uv(Vector2(1, 0)); st.add_vertex(p1)
		st.set_color(Color.WHITE); st.set_uv(Vector2(1, 1)); st.add_vertex(p2)
		st.set_color(Color.WHITE); st.set_uv(Vector2(0, 0)); st.add_vertex(p0)
		st.set_color(Color.WHITE); st.set_uv(Vector2(1, 1)); st.add_vertex(p2)
		st.set_color(Color.WHITE); st.set_uv(Vector2(0, 1)); st.add_vertex(p3)
	st.generate_normals()
	return st.commit()

static func _make_tall_kelp_mesh() -> ArrayMesh:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	for bi in range(4):
		var yaw := float(bi) * (TAU / 4.0) + 0.25
		var ca := cos(yaw)
		var sa := sin(yaw)
		var w0 := 0.085
		var segs := 4
		for si in range(segs):
			var t0 := float(si) / float(segs)
			var t1 := float(si + 1) / float(segs)
			var x_off0 := sin(t0 * PI) * 0.15
			var x_off1 := sin(t1 * PI) * 0.15
			var hw0 := w0 * (1.0 - t0 * 0.55)
			var hw1 := w0 * (1.0 - t1 * 0.65)
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
	float h = clamp(VERTEX.y, 0.0, 1.8);
	VERTEX.x += sin(TIME * sway_spd + wp.x * 0.42 + wp.z * 0.34 + h * 2.1) * sway_amp * h;
	VERTEX.z += cos(TIME * sway_spd * 0.85 + wp.z * 0.38) * sway_amp * 0.74 * h;
}
void fragment() {
	ALBEDO = vcol.rgb;
	ROUGHNESS = 0.86;
	METALLIC = 0.0;
}
""" % [sway_amp, sway_spd]
	var sm := ShaderMaterial.new()
	sm.shader = sh
	return sm

static func _make_surf_foam_mat() -> ShaderMaterial:
	var sh := Shader.new()
	sh.code = """
shader_type spatial;
render_mode unshaded, cull_disabled, shadows_disabled, depth_draw_never;
void fragment() {
	vec2 p = UV * 2.0 - 1.0;
	float r = length(p);
	float ang = atan(p.y, p.x);
	float wobble = 0.07 * sin(ang * 5.0 + TIME * 1.3) + 0.05 * cos(ang * 9.0 - TIME * 1.9);
	float rr = r + wobble;
	float ring = smoothstep(0.34, 0.52, rr) * (1.0 - smoothstep(0.58, 0.94, rr));
	float lace = 0.5 + 0.5 * sin(ang * 14.0 + TIME * 1.6 + r * 12.0) * cos(r * 18.0 - TIME * 2.4);
	float surf = smoothstep(0.32, 0.86, lace) * ring;
	ALBEDO = mix(vec3(0.68, 0.84, 0.88), vec3(0.92, 0.96, 0.98), surf);
	ALPHA = clamp(surf * 0.52, 0.0, 0.52);
}
"""
	var sm := ShaderMaterial.new()
	sm.shader = sh
	sm.render_priority = 1
	return sm

static func _make_current_streak_mat() -> ShaderMaterial:
	var sh := Shader.new()
	sh.code = """
shader_type spatial;
render_mode unshaded, cull_disabled, shadows_disabled, depth_draw_never;
void fragment() {
	vec2 p = UV * 2.0 - 1.0;
	float r_ell = length(vec2(p.x * 1.15, p.y));
	float mask = 1.0 - smoothstep(0.25, 0.95, r_ell);
	float wisp = 0.5 + 0.5 * sin(UV.y * 14.0 + TIME * 3.8 + sin(UV.x * 9.0) * 2.0) * cos(UV.x * 11.0 - TIME * 1.8);
	float lace = smoothstep(0.36, 0.84, wisp);
	ALBEDO = mix(vec3(0.45, 0.76, 0.84), vec3(0.86, 0.94, 0.96), lace);
	ALPHA = mask * lace * 0.28;
}
"""
	var sm := ShaderMaterial.new()
	sm.shader = sh
	sm.render_priority = 2
	return sm
