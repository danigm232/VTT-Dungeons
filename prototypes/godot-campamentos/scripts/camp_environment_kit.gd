class_name CampEnvironmentKit
extends RefCounted

## Shared biome environment factory: organic rock displacement, buttressed trees,
## clustered forest undergrowth, coastal wreckage/seaweed debris, and sea-cave
## geological formations. All geometry sits flush/embedded for zero floating props.

const MatKit = preload("res://scripts/camp_material_kit.gd")
const Occlusion = preload("res://scripts/object_occlusion_controller.gd")

var _rock_cache: Dictionary = {} # style -> Array[ArrayMesh]
var _tex_foliage_cut_mat_cache: Dictionary = {}
var _quad_mat_cache: Dictionary = {}

func _get_quad_mat(key: String, tex_name: String, uv_rect: Rect2, tint: Color, wind: float = 0.068, backlight: Color = Color("#8fb95c"), hang: float = 0.0) -> ShaderMaterial:
	if _quad_mat_cache.has(key):
		return _quad_mat_cache[key]
	var m := MatKit.create_foliage_wind_shader_material(tex_name, tint, wind, backlight, true, 1.0, true, uv_rect)
	if hang > 0.5:
		m.set_shader_parameter("hang", hang)
	_quad_mat_cache[key] = m
	return m

static func hash2(p: Vector2) -> float:
	var h: float = sin(p.x * 127.1 + p.y * 311.7) * 43758.5453
	return h - floorf(h)

func get_rock_variants(style: String = "craggy") -> Array:
	if _rock_cache.has(style):
		return _rock_cache[style]
	var variants: Array[ArrayMesh] = []
	var count := 6
	for v_idx in range(count):
		var seed_p := float(v_idx) * 2.37 + (7.1 if style == "flat" else (13.4 if style == "stratified" else 0.0))
		var base_sphere := SphereMesh.new()
		base_sphere.radial_segments = 10 if style == "flat" else (6 if style == "stratified" else 9)
		base_sphere.rings = 6 if style == "flat" else (3 if style == "stratified" else 5)
		base_sphere.radius = 0.54
		base_sphere.height = 1.02

		var st := SurfaceTool.new()
		st.create_from(base_sphere, 0)
		var arr := st.commit_to_arrays()
		var verts: PackedVector3Array = arr[Mesh.ARRAY_VERTEX]
		var colors := PackedColorArray()
		colors.resize(verts.size())

		for i in range(verts.size()):
			var v := verts[i]
			var n1 := sin(v.x * 4.8 + seed_p) * cos(v.z * 4.1 - seed_p * 0.7) * 0.16
			var n2 := cos(v.y * 5.6 + seed_p * 1.4) * sin((v.x - v.z) * 3.7) * 0.11
			var n3 := sin((v.x + v.y + v.z) * 7.2 + seed_p * 2.1) * 0.055
			var disp := 1.0 + n1 + n2 + n3
			var dv := v * disp

			if style == "flat":
				# Natural flat stone seat / coastal boulder slab
				dv.y *= 0.56
				if dv.y > 0.10:
					dv.y = lerpf(dv.y, 0.22, 0.65)
				dv.x *= 1.18
			elif style == "stratified":
				# Angular fractured basalt column/slab (zero bowling-ball silhouette)
				var step_snap: float = floorf(dv.y * 4.0 + 0.5) / 4.0
				dv.y = lerpf(dv.y * 1.12, step_snap, 0.44)
				dv.x = clampf(dv.x * 1.24, -0.52, 0.52)
				dv.z = clampf(dv.z * 1.18, -0.50, 0.50)
				if dv.y > 0.15:
					dv.x *= 0.76
					dv.z *= 0.78
			elif style == "rounded":
				# Tide-worn beach stone
				dv *= 0.94
				dv.y *= 0.76

			# Flatten base slightly for natural ground seating
			if dv.y < -0.22:
				dv.y = lerpf(dv.y, -0.22, 0.45)

			verts[i] = dv
			# Built-in base crevice AO + lighter weathered upper face
			var ao := clampf(0.62 + (dv.y + 0.35) * 0.65, 0.52, 1.08)
			colors[i] = Color(ao, ao, ao * 1.01, 1.0)

		arr[Mesh.ARRAY_VERTEX] = verts
		arr[Mesh.ARRAY_COLOR] = colors
		var mesh := ArrayMesh.new()
		mesh.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arr)
		var fin := SurfaceTool.new()
		fin.create_from(mesh, 0)
		if style == "stratified":
			fin.deindex()
		fin.generate_normals()
		variants.append(fin.commit())
	_rock_cache[style] = variants
	return variants

func spawn_rock(
	parent: Node3D,
	pos: Vector3,
	scale_vec: Vector3,
	rot_y: float,
	mat: Material,
	variant_idx: int = 0,
	style: String = "craggy",
	tilt: Vector3 = Vector3.ZERO
) -> MeshInstance3D:
	var pool := get_rock_variants(style)
	var mesh: ArrayMesh = pool[posmod(variant_idx, pool.size())]
	var mi := MeshInstance3D.new()
	mi.mesh = mesh
	mi.material_override = mat
	mi.position = pos
	mi.scale = scale_vec
	mi.rotation = Vector3(tilt.x, rot_y, tilt.z)
	parent.add_child(mi)
	return mi

func make_alpha_foliage_mat(
	key: String,
	tint: Color,
	tex_name: String = "foliage-atlas-v5.png",
	wind_strength: float = 0.068,
	backlight: Color = Color("#8fb95c"),
	uv_mult: float = 1.0
) -> ShaderMaterial:
	if _tex_foliage_cut_mat_cache.has(key):
		return _tex_foliage_cut_mat_cache[key]
	var mat := MatKit.create_foliage_wind_shader_material(tex_name, tint, wind_strength, backlight, true, uv_mult, true)
	_tex_foliage_cut_mat_cache[key] = mat
	return mat

func build_organic_tree(
	parent: Node3D,
	species: String,
	pos: Vector3,
	scale_f: float,
	mat_trunk: Material,
	mat_leaves: Material,
	_mat_moss: Material,
	seed_v: float
) -> Node3D:
	var tr := Node3D.new()
	tr.name = "Tree_%s" % species
	tr.position = pos
	tr.scale = Vector3.ONE * scale_f
	tr.rotation.y = fmod(seed_v * 1.91, TAU)
	parent.add_child(tr)

	var st_trunk := SurfaceTool.new(); st_trunk.begin(Mesh.PRIMITIVE_TRIANGLES)
	var st_canopy := SurfaceTool.new(); st_canopy.begin(Mesh.PRIMITIVE_TRIANGLES)
	_emit_classic_tree(species, seed_v, st_trunk, st_canopy, Transform3D.IDENTITY)

	st_trunk.generate_normals()
	var trunk_inst := MeshInstance3D.new(); trunk_inst.name = "TrunkBatch"
	trunk_inst.mesh = st_trunk.commit(); trunk_inst.material_override = mat_trunk
	tr.add_child(trunk_inst)

	st_canopy.generate_normals()
	var can_inst := MeshInstance3D.new(); can_inst.name = "CanopyBatch"
	can_inst.mesh = st_canopy.commit(); can_inst.material_override = mat_leaves
	tr.add_child(can_inst)
	return tr

## Shared pine/oak geometry (classic camp species) emitted into caller SurfaceTools
## with an arbitrary base transform, so the same silhouette can be batched.
func _emit_classic_tree(species: String, seed_v: float, st_trunk: SurfaceTool, st_canopy: SurfaceTool, base: Transform3D) -> void:
	var lean_x := sin(seed_v * 1.3) * 0.06
	var lean_z := cos(seed_v * 1.7) * 0.05

	# Flared buttress roots gripping soil (-0.12m embedded to avoid any gap)
	var root_count := 4 + (int(round(seed_v * 3.0)) % 2)
	for r in range(root_count):
		var a := float(r) * TAU / float(root_count) + sin(seed_v + float(r)) * 0.25
		var root_len := 0.72 + fmod(seed_v + float(r) * 0.31, 0.38)
		var rc := CylinderMesh.new()
		rc.top_radius = 0.075; rc.bottom_radius = 0.165; rc.height = root_len; rc.radial_segments = 6
		var r_basis := Basis.from_euler(Vector3(-sin(a) * 0.92, a, cos(a) * 0.92))
		st_trunk.append_from(rc, 0, base * Transform3D(r_basis, Vector3(cos(a) * 0.36, 0.08, sin(a) * 0.36)))

	if species == "pine":
		var m1 := CylinderMesh.new(); m1.top_radius = 0.22; m1.bottom_radius = 0.34; m1.height = 2.2; m1.radial_segments = 7
		st_trunk.append_from(m1, 0, base * Transform3D(Basis.from_euler(Vector3(lean_z, 0.0, -lean_x)), Vector3(0.0, 1.05, 0.0)))

		var m2 := CylinderMesh.new(); m2.top_radius = 0.08; m2.bottom_radius = 0.22; m2.height = 2.6; m2.radial_segments = 7
		st_trunk.append_from(m2, 0, base * Transform3D(Basis.from_euler(Vector3(-lean_z * 0.6, 0.2, lean_x * 0.8)), Vector3(lean_x * 1.4, 3.25, -lean_z * 1.4)))

		for tier in range(4):
			var base_y := 2.25 + float(tier) * 0.92
			var tier_rad := 1.68 - float(tier) * 0.30
			var lobes := 5 if tier < 2 else 4
			for l in range(lobes):
				var la := float(l) * TAU / float(lobes) + float(tier) * 0.65
				var dist := tier_rad * 0.36
				var cm := CylinderMesh.new()
				cm.top_radius = 0.14; cm.bottom_radius = tier_rad * 0.72; cm.height = 1.05 - float(tier) * 0.12; cm.radial_segments = 6
				var c_basis := Basis.from_euler(Vector3(sin(la) * 0.16, la, -cos(la) * 0.16))
				st_canopy.append_from(cm, 0, base * Transform3D(c_basis, Vector3(cos(la) * dist, base_y + sin(la * 2.0) * 0.08, sin(la) * dist)))
	else:
		var bm := CylinderMesh.new(); bm.top_radius = 0.24; bm.bottom_radius = 0.38; bm.height = 2.1; bm.radial_segments = 7
		st_trunk.append_from(bm, 0, base * Transform3D(Basis.from_euler(Vector3(lean_z, 0.0, -lean_x)), Vector3(0.0, 1.02, 0.0)))

		var branch_dirs := [
			Vector3(-0.65, 2.55, 0.32),
			Vector3(0.68, 2.68, -0.28),
			Vector3(0.18, 2.75, 0.66),
			Vector3(-0.14, 3.05, -0.45),
		]
		var rock_boughs := get_rock_variants("craggy")
		for i in range(branch_dirs.size()):
			var tip: Vector3 = branch_dirs[i]
			var lm := CylinderMesh.new(); lm.top_radius = 0.09; lm.bottom_radius = 0.16; lm.height = 1.45; lm.radial_segments = 6
			var mid := Vector3(0.0, 1.85, 0.0).lerp(tip, 0.5)
			var xf := Transform3D(Basis.IDENTITY, mid).looking_at(tip + Vector3(0.0, 0.4, 0.0), Vector3.FORWARD)
			xf = xf * Transform3D(Basis.from_euler(Vector3(PI * 0.5, 0.0, 0.0)), Vector3.ZERO)
			st_trunk.append_from(lm, 0, base * xf)

			var bmesh: ArrayMesh = rock_boughs[posmod(i + int(seed_v), rock_boughs.size())]
			var t_basis := Basis.from_euler(Vector3(0.12 * float(i), float(i) * 1.3, -0.1)).scaled(Vector3(1.85, 1.28, 1.78) * (1.0 - float(i) * 0.06))
			st_canopy.append_from(bmesh, 0, base * Transform3D(t_basis, tip + Vector3(0.0, 0.52, 0.0)))

# ------------------------------------------------------------------------------
# Batched flora (one draw call per material) — forest expansion 17/11/2026
# ------------------------------------------------------------------------------
var _batches: Dictionary = {} # key -> {"st", "mat", "shadow", "count", "layer"}

func define_batch(key: String, mat: Material, cast_shadow: bool = true) -> void:
	if _batches.has(key):
		return
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	_batches[key] = {"st": st, "mat": mat, "shadow": cast_shadow, "count": 0}

func batch_st(key: String) -> SurfaceTool:
	var b: Dictionary = _batches[key]
	b["count"] = int(b["count"]) + 1
	return b["st"]

func flush_batches(parent: Node3D, prefix: String) -> Dictionary:
	var stats := {}
	for key in _batches.keys():
		var b: Dictionary = _batches[key]
		if int(b["count"]) <= 0:
			continue
		var st: SurfaceTool = b["st"]
		st.generate_tangents()
		var mi := MeshInstance3D.new()
		mi.name = prefix + str(key)
		mi.mesh = st.commit()
		mi.material_override = b["mat"]
		mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON if bool(b["shadow"]) else GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		parent.add_child(mi)
		stats[key] = int(b["count"])
	_batches.clear()
	return stats

static func _cyl_between(st: SurfaceTool, base: Transform3D, a: Vector3, b: Vector3, r_bottom: float, r_top: float, segs: int = 6) -> void:
	var d := b - a
	var length := d.length()
	if length < 0.001:
		return
	var y := d / length
	var ref := Vector3.RIGHT if absf(y.dot(Vector3.RIGHT)) < 0.9 else Vector3.FORWARD
	var x := y.cross(ref).normalized()
	var z := x.cross(y).normalized()
	var cm := CylinderMesh.new()
	cm.top_radius = r_top; cm.bottom_radius = r_bottom; cm.height = length; cm.radial_segments = segs; cm.rings = 1
	st.append_from(cm, 0, base * Transform3D(Basis(x, y, z), (a + b) * 0.5))

static func append_card(st: SurfaceTool, xf: Transform3D, w: float, h: float, uv: Rect2, normal_local: Vector3 = Vector3(0.0, 1.0, 0.25), y0: float = 0.0) -> void:
	var n := (xf.basis * normal_local).normalized()
	var p0 := xf * Vector3(-w * 0.5, y0, 0.0)
	var p1 := xf * Vector3(w * 0.5, y0, 0.0)
	var p2 := xf * Vector3(w * 0.5, y0 + h, 0.0)
	var p3 := xf * Vector3(-w * 0.5, y0 + h, 0.0)
	var uv0 := Vector2(uv.position.x, uv.end.y)
	var uv1 := Vector2(uv.end.x, uv.end.y)
	var uv2 := Vector2(uv.end.x, uv.position.y)
	var uv3 := Vector2(uv.position.x, uv.position.y)
	for pair in [[p0, uv0], [p1, uv1], [p2, uv2], [p0, uv0], [p2, uv2], [p3, uv3]]:
		st.set_normal(n)
		st.set_uv(pair[1])
		st.add_vertex(pair[0])

## Crossed alpha-cut bush/fern/flower clump from an atlas quadrant (3 planes).
func append_bush(key: String, pos: Vector3, size: float, yaw: float, uv: Rect2, aspect: float = 1.15) -> void:
	var st := batch_st(key)
	for k in range(3):
		var b := Basis(Vector3.UP, yaw + float(k) * PI / 3.0)
		append_card(st, Transform3D(b, pos), size * aspect, size, uv, Vector3(0.0, 1.0, 0.35), -0.05 * size)

## Batched tree species. keys = {"trunk": key, "canopy": key, "cards": key (willow)}
func append_tree(species: String, pos: Vector3, scale_f: float, yaw: float, seed_v: float, keys: Dictionary) -> void:
	var base := Transform3D(Basis(Vector3.UP, yaw).scaled(Vector3.ONE * scale_f), pos)
	var st_t: SurfaceTool = batch_st(str(keys["trunk"]))
	var st_c: SurfaceTool = batch_st(str(keys["canopy"])) if keys.has("canopy") else null
	var lean := Vector3(sin(seed_v * 1.3) * 0.08, 0.0, cos(seed_v * 1.7) * 0.07)
	var lumps := get_rock_variants("craggy")
	match species:
		"pine", "oak":
			_emit_classic_tree(species, seed_v, st_t, st_c, base)
		"spruce":
			_cyl_between(st_t, base, Vector3(0, -0.15, 0), Vector3(lean.x, 6.6, lean.z), 0.27, 0.06, 7)
			for k in range(7):
				var y := 1.45 + float(k) * 0.78
				var r := 1.78 - float(k) * 0.215
				var cm := CylinderMesh.new()
				cm.top_radius = 0.03; cm.bottom_radius = r; cm.height = 1.5 - float(k) * 0.07; cm.radial_segments = 9; cm.rings = 1
				var tilt := Basis.from_euler(Vector3(sin(seed_v + float(k)) * 0.07, float(k) * 0.7, cos(seed_v * 1.3 + float(k)) * 0.07))
				st_c.append_from(cm, 0, base * Transform3D(tilt, Vector3(lean.x * y / 6.6, y, lean.z * y / 6.6)))
			var tip := CylinderMesh.new(); tip.top_radius = 0.01; tip.bottom_radius = 0.28; tip.height = 1.0; tip.radial_segments = 7; tip.rings = 1
			st_c.append_from(tip, 0, base * Transform3D(Basis.IDENTITY, Vector3(lean.x, 7.15, lean.z)))
		"birch", "sapling":
			var top := Vector3(lean.x * 1.6, 5.3, lean.z * 1.6)
			_cyl_between(st_t, base, Vector3(0, -0.12, 0), top, 0.15, 0.055, 7)
			for k in range(3):
				var a := seed_v + float(k) * 2.2
				var s := Vector3(lean.x * 0.6, 2.9 + float(k) * 0.55, lean.z * 0.6)
				_cyl_between(st_t, base, s, s + Vector3(cos(a) * 0.8, 0.9, sin(a) * 0.8), 0.05, 0.02, 5)
			for k in range(5):
				var a2 := seed_v * 0.7 + float(k) * TAU / 5.0
				var rr := 0.45 + fmod(seed_v + float(k) * 0.37, 0.45)
				var lp := Vector3(cos(a2) * rr + top.x * 0.7, 3.7 + float(k % 3) * 0.6, sin(a2) * rr + top.z * 0.7)
				var sc := (1.02 + fmod(float(k) * 0.29 + seed_v, 0.35)) * Vector3(1.0, 0.88, 1.0)
				st_c.append_from(lumps[posmod(k + int(seed_v), lumps.size())], 0, base * Transform3D(Basis.from_euler(Vector3(0.1, a2, 0.0)).scaled(sc), lp))
		"beech", "beech_copper":
			_cyl_between(st_t, base, Vector3(0, -0.15, 0), Vector3(lean.x, 2.9, lean.z), 0.46, 0.27, 7)
			for k in range(4):
				var a3 := seed_v + float(k) * TAU / 4.0
				var s3 := Vector3(lean.x, 2.4, lean.z)
				_cyl_between(st_t, base, s3, s3 + Vector3(cos(a3) * 1.2, 1.25, sin(a3) * 1.2), 0.17, 0.08, 6)
			for k in range(5):
				var a4 := seed_v * 0.5 + float(k) * TAU / 4.0
				var rr4 := 1.35 if k < 4 else 0.0
				var lp4 := Vector3(cos(a4) * rr4 + lean.x, 3.9 + (0.75 if k == 4 else sin(a4 * 2.0) * 0.3), sin(a4) * rr4 + lean.z)
				var sc4 := Vector3(2.15, 1.5, 2.05) * (0.94 + fmod(float(k) * 0.23, 0.2))
				st_c.append_from(lumps[posmod(k + 2 + int(seed_v), lumps.size())], 0, base * Transform3D(Basis.from_euler(Vector3(0.0, a4, 0.08)).scaled(sc4), lp4))
		"willow":
			var w_top := Vector3(lean.x * 4.0, 2.5, lean.z * 4.0 + 0.25)
			_cyl_between(st_t, base, Vector3(0, -0.15, 0), w_top, 0.48, 0.30, 8)
			for k in range(4):
				var a5 := seed_v + float(k) * TAU / 4.0
				_cyl_between(st_t, base, w_top, w_top + Vector3(cos(a5) * 1.1, 1.15, sin(a5) * 1.1), 0.16, 0.07, 6)
			for k in range(5):
				var a6 := seed_v + float(k) * TAU / 5.0
				var lp6 := w_top + Vector3(cos(a6) * 0.95, 1.25 + float(k % 2) * 0.25, sin(a6) * 0.95)
				st_c.append_from(lumps[posmod(k + int(seed_v), lumps.size())], 0, base * Transform3D(Basis.from_euler(Vector3(0.0, a6, 0.0)).scaled(Vector3(1.75, 1.0, 1.75)), lp6))
			if keys.has("cards"):
				var st_k: SurfaceTool = batch_st(str(keys["cards"]))
				var ivy_uv := Rect2(0.02, 0.51, 0.46, 0.47)
				for k in range(16):
					var a7 := seed_v * 1.1 + float(k) * TAU / 16.0
					var rr7 := 1.45 + fmod(float(k) * 0.41 + seed_v, 0.85)
					var top_y := 3.75 + sin(float(k) * 1.7) * 0.25
					var length := 2.3 + fmod(float(k) * 0.53, 0.75)
					var cp := w_top + Vector3(cos(a7) * rr7, 0.0, sin(a7) * rr7)
					var card_xf := base * Transform3D(Basis(Vector3.UP, -a7 + PI * 0.5), Vector3(cp.x, top_y - length, cp.z))
					append_card(st_k, card_xf, 1.05, length, ivy_uv, Vector3(0.0, 0.55, 0.8), 0.0)
		"snag":
			_cyl_between(st_t, base, Vector3(0, -0.15, 0), Vector3(lean.x * 1.5, 3.7, lean.z * 1.5), 0.33, 0.15, 7)
			for k in range(3):
				var a8 := seed_v + float(k) * 2.4
				var s8 := Vector3(lean.x, 1.9 + float(k) * 0.65, lean.z)
				_cyl_between(st_t, base, s8, s8 + Vector3(cos(a8) * 0.95, 0.75 - float(k) * 0.15, sin(a8) * 0.95), 0.09, 0.025, 5)

## Fallen mossy log decor (trunk batch) lying along the ground.
func append_fallen_log(key: String, pos: Vector3, yaw: float, length: float, radius: float) -> void:
	var st := batch_st(key)
	var dir := Vector3(cos(yaw), 0.0, sin(yaw))
	_cyl_between(st, Transform3D.IDENTITY, pos - dir * length * 0.5 + Vector3(0, radius * 0.8, 0), pos + dir * length * 0.5 + Vector3(0, radius * 0.75, 0), radius, radius * 0.86, 8)

## Batched mushrooms. keys: {"stem","dots","cap_<kind>"}; scale is stylised for tactical zoom legibility.
func append_mushroom_cluster(keys: Dictionary, kind: String, pos: Vector3, seed_v: float, count: int, scale_f: float = 1.45) -> void:
	var st_stem: SurfaceTool = batch_st(str(keys["stem"]))
	var cap_key := "cap_" + kind
	var st_cap: SurfaceTool = batch_st(str(keys[cap_key])) if keys.has(cap_key) else st_stem
	for i in range(count):
		var a := seed_v + float(i) * 2.399
		var rad := (0.03 + sqrt(float(i)) * 0.07) * scale_f
		var s := scale_f * (0.75 + fmod(seed_v * 0.37 + float(i) * 0.29, 0.5))
		var p := pos + Vector3(cos(a) * rad, 0.0, sin(a) * rad)
		var lean := Basis.from_euler(Vector3(sin(a) * 0.12, a, cos(a) * 0.1))
		var b := Transform3D(lean.scaled(Vector3.ONE * s), p)
		match kind:
			"amanita":
				_cyl_between(st_stem, b, Vector3(0, -0.01, 0), Vector3(0, 0.15, 0), 0.026, 0.018, 5)
				var cap := SphereMesh.new(); cap.radius = 0.078; cap.height = 0.075; cap.is_hemisphere = true; cap.radial_segments = 7; cap.rings = 2
				st_cap.append_from(cap, 0, b * Transform3D(Basis.IDENTITY.scaled(Vector3(1.0, 0.75, 1.0)), Vector3(0, 0.145, 0)))
				if keys.has("dots"):
					var st_d: SurfaceTool = batch_st(str(keys["dots"]))
					var dot := SphereMesh.new(); dot.radius = 0.012; dot.height = 0.012; dot.radial_segments = 4; dot.rings = 1
					for d in range(5):
						var da := float(d) * TAU / 5.0 + a
						var dr := 0.03 + float(d % 2) * 0.02
						st_d.append_from(dot, 0, b * Transform3D(Basis.IDENTITY, Vector3(cos(da) * dr, 0.145 + 0.052 - dr * 0.45, sin(da) * dr)))
			"porcini":
				_cyl_between(st_stem, b, Vector3(0, -0.01, 0), Vector3(0, 0.09, 0), 0.045, 0.032, 5)
				var cap2 := SphereMesh.new(); cap2.radius = 0.08; cap2.height = 0.07; cap2.is_hemisphere = true; cap2.radial_segments = 7; cap2.rings = 2
				st_cap.append_from(cap2, 0, b * Transform3D(Basis.IDENTITY, Vector3(0, 0.085, 0)))
			"chanterelle":
				var fun := CylinderMesh.new(); fun.top_radius = 0.06; fun.bottom_radius = 0.012; fun.height = 0.088; fun.radial_segments = 6; fun.rings = 1
				st_cap.append_from(fun, 0, b * Transform3D(Basis.IDENTITY, Vector3(0, 0.04, 0)))
			"parasol":
				_cyl_between(st_stem, b, Vector3(0, -0.01, 0), Vector3(0, 0.28, 0), 0.016, 0.011, 5)
				var cap3 := CylinderMesh.new(); cap3.top_radius = 0.02; cap3.bottom_radius = 0.115; cap3.height = 0.045; cap3.radial_segments = 7; cap3.rings = 1
				st_cap.append_from(cap3, 0, b * Transform3D(Basis.IDENTITY, Vector3(0, 0.29, 0)))
			"puffball":
				var pb := SphereMesh.new(); pb.radius = 0.048; pb.height = 0.07; pb.radial_segments = 6; pb.rings = 2
				st_stem.append_from(pb, 0, b * Transform3D(Basis.IDENTITY, Vector3(0, 0.03, 0)))
			_:
				_cyl_between(st_stem, b, Vector3(0, -0.01, 0), Vector3(0, 0.08, 0), 0.014, 0.01, 5)
				var cap4 := SphereMesh.new(); cap4.radius = 0.042; cap4.height = 0.04; cap4.is_hemisphere = true; cap4.radial_segments = 6; cap4.rings = 2
				st_cap.append_from(cap4, 0, b * Transform3D(Basis.IDENTITY, Vector3(0, 0.078, 0)))

func spawn_fern_clump(parent: Node3D, pos: Vector3, scale_val: float, mat_fern: Material, seed_v: float, clump_count: int = 3) -> void:
	# Multi-frond radial arched fern rosette sampling crisp serrated fern quadrant at 4x resolution
	var st := SurfaceTool.new(); st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var uv_fern := Rect2(0.51, 0.01, 0.48, 0.48)
	for i in range(clump_count):
		var offset := Vector3(cos(seed_v + float(i) * 2.1) * 0.26 * float(i > 0), -0.03, sin(seed_v + float(i) * 2.1) * 0.26 * float(i > 0))
		var sc := scale_val * (1.0 - float(i) * 0.14)
		for f_idx in range(3):
			var ang := seed_v + float(f_idx) * (PI / 3.0) + float(i) * 0.45
			var b := Basis(Vector3.UP, ang)
			append_card(st, Transform3D(b, offset), 0.92 * sc, 0.72 * sc, uv_fern, Vector3(0.0, 1.0, 0.35), -0.02 * sc)
	st.generate_tangents()
	var tint_c := Color(0.88, 0.95, 0.84)
	if mat_fern is ShaderMaterial:
		var tc: Variant = (mat_fern as ShaderMaterial).get_shader_parameter("tint_col")
		if tc is Color:
			tint_c = (tc as Color).lightened(0.35)
	var clump := MeshInstance3D.new()
	clump.mesh = st.commit()
	clump.material_override = _get_quad_mat("fern_" + tint_c.to_html(false), "foliage-atlas.png", uv_fern, tint_c, 0.072, Color("#8db85e"))
	clump.position = pos
	clump.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	parent.add_child(clump)

func spawn_reed_cluster(parent: Node3D, pos: Vector3, mat_reed: Material, seed_v: float, with_cattails: bool = true) -> void:
	# Tall swaying riverbank reeds & pampas plumes + cattail spikes
	var st_blades := SurfaceTool.new(); st_blades.begin(Mesh.PRIMITIVE_TRIANGLES)
	var st_heads := SurfaceTool.new(); st_heads.begin(Mesh.PRIMITIVE_TRIANGLES)
	var uv_reed := Rect2(0.51, 0.01, 0.48, 0.48)
	for i in range(4):
		var a := seed_v + float(i) * (PI / 4.0)
		var r := 0.04 + float(i % 2) * 0.08
		var off := Vector3(cos(a) * r, -0.02, sin(a) * r)
		append_card(st_blades, Transform3D(Basis(Vector3.UP, a), off), 0.78, 0.98, uv_reed, Vector3(0.0, 1.0, 0.3), -0.03)
	st_blades.generate_tangents()
	var tint_r := Color(0.92, 0.96, 0.86)
	if not with_cattails and mat_reed is ShaderMaterial:
		var trc: Variant = (mat_reed as ShaderMaterial).get_shader_parameter("tint_col")
		if trc is Color:
			tint_r = (trc as Color).lightened(0.40)
	var blades := MeshInstance3D.new(); blades.mesh = st_blades.commit()
	blades.material_override = _get_quad_mat("reed_" + tint_r.to_html(false), "foliage-atlas-v5.png", uv_reed, tint_r, 0.082, Color("#9bc46a"))
	blades.position = pos; blades.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	parent.add_child(blades)

	if with_cattails:
		var stem_m := CylinderMesh.new(); stem_m.top_radius = 0.010; stem_m.bottom_radius = 0.015; stem_m.height = 0.98; stem_m.radial_segments = 5
		var head_m := CylinderMesh.new(); head_m.top_radius = 0.026; head_m.bottom_radius = 0.026; head_m.height = 0.20; head_m.radial_segments = 6
		for c_i in range(3):
			var a := seed_v + float(c_i) * 2.1
			var ox := cos(a) * 0.14; var oz := sin(a) * 0.14
			var b_lean := Basis.from_euler(Vector3(sin(a) * 0.1, 0.0, cos(a) * 0.08))
			st_heads.append_from(stem_m, 0, Transform3D(b_lean, Vector3(ox, 0.46, oz)))
			st_heads.append_from(head_m, 0, Transform3D(b_lean, Vector3(ox, 0.90, oz)))
		st_heads.generate_normals()
		var cats := MeshInstance3D.new(); cats.mesh = st_heads.commit()
		cats.material_override = MatKit.make_textured_mat("earth.webp", Color("#563b29"), 0.88, "rock", Vector3.ONE, false, true)
		cats.position = pos; cats.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		parent.add_child(cats)

func spawn_shelf_fungi(parent: Node3D, pos: Vector3, seed_v: float) -> void:
	# Layered wood-bracket shelf fungi along decaying stumps & logs
	var st := SurfaceTool.new(); st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var cm := CylinderMesh.new(); cm.top_radius = 0.11; cm.bottom_radius = 0.09; cm.height = 0.024; cm.radial_segments = 7
	for i in range(4):
		var a := seed_v + float(i) * 0.52
		var sc := 1.0 - float(i) * 0.15
		var xf := Transform3D(Basis.IDENTITY.scaled(Vector3(sc, 1.0, sc * 0.72)).rotated(Vector3.UP, a), Vector3(cos(a) * 0.14, float(i) * 0.085, sin(a) * 0.14))
		st.append_from(cm, 0, xf)
	st.generate_normals()
	var shelf := MeshInstance3D.new(); shelf.mesh = st.commit()
	shelf.material_override = MatKit.make_textured_mat("earth.webp", Color("#c29c68"), 0.78, "timber", Vector3(2.0, 2.0, 2.0), false, true)
	shelf.position = pos
	parent.add_child(shelf)

func spawn_cliff_heather(parent: Node3D, pos: Vector3, seed_v: float) -> void:
	# Textured purple flowering highland heather shrublet sampling bottom-right atlas quadrant
	var uv_h := Rect2(0.51, 0.51, 0.48, 0.48)
	var st := SurfaceTool.new(); st.begin(Mesh.PRIMITIVE_TRIANGLES)
	for i in range(3):
		var ang := seed_v + float(i) * (PI / 3.0)
		append_card(st, Transform3D(Basis(Vector3.UP, ang), Vector3.ZERO), 0.72, 0.52, uv_h, Vector3(0.0, 1.0, 0.35), -0.02)
	st.generate_tangents()
	var h := MeshInstance3D.new(); h.mesh = st.commit()
	h.material_override = _get_quad_mat("cliff_heather", "foliage-atlas-v5.png", uv_h, Color(0.95, 0.92, 0.96), 0.055, Color("#887aa8"))
	h.position = pos; h.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	parent.add_child(h)

func spawn_hanging_vine(parent: Node3D, pos: Vector3, yaw: float, w: float, h_len: float) -> void:
	var uv_ivy := Rect2(0.02, 0.51, 0.46, 0.47)
	var st := SurfaceTool.new(); st.begin(Mesh.PRIMITIVE_TRIANGLES)
	append_card(st, Transform3D(Basis(Vector3.UP, yaw), Vector3.ZERO), w, h_len, uv_ivy, Vector3(0.0, 0.4, 0.9), -h_len)
	st.generate_tangents()
	var v := MeshInstance3D.new(); v.mesh = st.commit()
	v.material_override = _get_quad_mat("cave_vine_hang", "foliage-atlas.png", uv_ivy, Color("#739c70"), 0.06, Color("#7ba86e"), 1.0)
	v.position = pos; v.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parent.add_child(v)

func spawn_mushroom_cluster(parent: Node3D, pos: Vector3, seed_v: float, count: int = 5) -> void:
	var g := Node3D.new()
	g.position = pos
	parent.add_child(g)
	var mat_stem := MatKit.make_cloth_mat(Color("#cfc3a8"), false, true)
	var mat_cap := MatKit.make_textured_mat("earth.webp", Color("#8a5838"), 0.72, "", Vector3.ONE, false, true)
	for i in range(count):
		var a := seed_v + float(i) * 1.45
		var rad := 0.04 + float(i) * 0.042
		var h := 0.055 + fmod(seed_v * 0.3 + float(i) * 0.025, 0.06)
		var ox := cos(a) * rad
		var oz := sin(a) * rad
		var stem := MeshInstance3D.new()
		var sm := CylinderMesh.new(); sm.top_radius = 0.012; sm.bottom_radius = 0.017; sm.height = h; sm.radial_segments = 6
		stem.mesh = sm; stem.material_override = mat_stem
		stem.position = Vector3(ox, h * 0.45, oz)
		g.add_child(stem)

		var cap := MeshInstance3D.new()
		var cm := SphereMesh.new(); cm.radius = 0.036 + float(i % 2) * 0.014; cm.height = 0.028; cm.radial_segments = 7; cm.rings = 3
		cap.mesh = cm; cap.material_override = mat_cap
		cap.position = Vector3(ox, h * 0.92, oz)
		g.add_child(cap)

func spawn_leaf_litter_patch(parent: Node3D, pos: Vector3, radius: float, tint: Color, rot_y: float) -> void:
	var patch := MeshInstance3D.new()
	var pm := CylinderMesh.new()
	pm.top_radius = radius
	pm.bottom_radius = radius * 1.06
	pm.height = 0.016
	pm.radial_segments = 9
	patch.mesh = pm
	patch.material_override = MatKit.make_textured_mat("earth.webp", tint, 0.94, "rock", Vector3(1.8, 1.8, 1.8), true, true)
	patch.position = pos + Vector3(0.0, 0.006, 0.0)
	patch.rotation.y = rot_y
	patch.scale = Vector3(1.18, 1.0, 0.86)
	patch.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parent.add_child(patch)

func spawn_driftwood_plank(parent: Node3D, pos: Vector3, yaw: float, length_m: float, mat_wood: Material) -> void:
	var p := MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = Vector3(length_m, 0.048, 0.21)
	p.mesh = bm
	p.material_override = mat_wood
	p.position = pos + Vector3(0.0, 0.014, 0.0)
	p.rotation = Vector3(sin(yaw) * 0.04, yaw, cos(yaw) * 0.03)
	parent.add_child(p)

func spawn_seaweed_clump(parent: Node3D, pos: Vector3, seed_v: float) -> void:
	var mat_kelp := MatKit.make_textured_mat("moss.jpg", Color("#3b5230"), 0.22, "rock", Vector3(1.5, 1.5, 1.5), true, true)
	var st := SurfaceTool.new(); st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var sm := SphereMesh.new(); sm.radius = 0.22; sm.height = 0.032; sm.radial_segments = 8; sm.rings = 3
	for i in range(4):
		var a := float(i) * 0.72 + seed_v
		var b := Basis.from_euler(Vector3(0.02, a, 0.0)).scaled(Vector3(1.45 - float(i) * 0.14, 0.65, 0.34))
		st.append_from(sm, 0, Transform3D(b, Vector3(cos(a) * 0.16, 0.012, sin(a) * 0.16)))
	st.generate_normals()
	var g := MeshInstance3D.new()
	g.mesh = st.commit(); g.material_override = mat_kelp
	g.position = pos; g.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parent.add_child(g)

func spawn_wildflower_patch(parent: Node3D, pos: Vector3, seed_v: float, _count: int = 7, palette: String = "forest") -> void:
	# Sharp crossed botanical flower clusters sampling high-res floral atlas quadrants
	var use_alt := int(round(seed_v * 3.0)) % 2 == 1
	var tex := "foliage-atlas-v5.png" if (use_alt or palette in ["cliff", "refuge"]) else "foliage-atlas.png"
	var uv_fl := Rect2(0.51, 0.51, 0.48, 0.48)
	var st := SurfaceTool.new(); st.begin(Mesh.PRIMITIVE_TRIANGLES)
	for k in range(3):
		var a := seed_v + float(k) * (PI / 3.0)
		append_card(st, Transform3D(Basis(Vector3.UP, a), Vector3.ZERO), 0.64, 0.46, uv_fl, Vector3(0.0, 1.0, 0.35), -0.02)
	st.generate_tangents()
	var tint := Color(0.96, 0.96, 0.90)
	var back := Color("#a8c26a")
	match palette:
		"beach":
			tint = Color(0.92, 0.96, 0.98) if use_alt else Color(1.0, 0.94, 0.78)
			back = Color("#8fb08e")
		"cliff":
			tint = Color(0.92, 0.86, 0.96)
			back = Color("#8874a0")
		"refuge":
			tint = Color(0.78, 0.94, 0.90)
			back = Color("#6aa89c")
		_:
			tint = Color(0.95, 0.92, 0.96) if use_alt else Color(0.98, 0.96, 0.86)
	var mi := MeshInstance3D.new(); mi.mesh = st.commit()
	mi.material_override = _get_quad_mat("wf_%s_%s" % [palette, str(use_alt)], tex, uv_fl, tint, 0.06, back)
	mi.position = pos; mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parent.add_child(mi)

func spawn_moss_cushion(parent: Node3D, pos: Vector3, tint: Color, scale_v: float = 1.0, seed_v: float = 0.0) -> void:
	var st := SurfaceTool.new(); st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var sm := SphereMesh.new(); sm.radius = 0.24 * scale_v; sm.height = 0.14 * scale_v; sm.radial_segments = 7; sm.rings = 3
	for i in range(4):
		var a := seed_v + float(i) * 1.57
		var r := 0.14 * scale_v if i > 0 else 0.0
		var b := Basis.from_euler(Vector3(0.0, a, 0.0)).scaled(Vector3(1.15, 0.72, 0.92))
		st.append_from(sm, 0, Transform3D(b, Vector3(cos(a) * r, 0.03 * scale_v, sin(a) * r)))
	st.generate_normals()
	var m := MeshInstance3D.new(); m.mesh = st.commit()
	var m_mat := MatKit.make_textured_mat("moss.jpg", tint, 0.86, "rock", Vector3(2.8, 2.8, 2.8), true, true)
	m_mat.normal_scale = 0.85
	m.material_override = m_mat
	m.position = pos; m.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	parent.add_child(m)

func spawn_woodland_shrub(parent: Node3D, pos: Vector3, _mat_leaves: Material, berry_col: Color, seed_v: float = 0.0) -> void:
	# Multi-card woody leafy bush (laurel/holly atlas quadrants) + glossy berries
	var uv_sh := Rect2(0.01, 0.01, 0.48, 0.48)
	var st := SurfaceTool.new(); st.begin(Mesh.PRIMITIVE_TRIANGLES)
	for k in range(3):
		var a := seed_v + float(k) * (PI / 3.0)
		append_card(st, Transform3D(Basis(Vector3.UP, a), Vector3.ZERO), 1.08, 0.92, uv_sh, Vector3(0.0, 1.0, 0.35), -0.04)
	st.generate_tangents()
	var bush := MeshInstance3D.new(); bush.mesh = st.commit()
	bush.material_override = _get_quad_mat("shrub_laurel", "foliage-atlas-v5.png", uv_sh, Color(0.92, 0.96, 0.86), 0.052, Color("#88b058"))
	bush.position = pos; bush.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	parent.add_child(bush)

	var st_b := SurfaceTool.new(); st_b.begin(Mesh.PRIMITIVE_TRIANGLES)
	var bm := SphereMesh.new(); bm.radius = 0.026; bm.height = 0.048; bm.radial_segments = 5; bm.rings = 2
	for j in range(6):
		var a2 := seed_v * 1.7 + float(j) * 1.05
		st_b.append_from(bm, 0, Transform3D(Basis.IDENTITY, Vector3(cos(a2) * 0.24, 0.34 + float(j % 2) * 0.14, sin(a2) * 0.24)))
	st_b.generate_normals()
	var bmat := StandardMaterial3D.new()
	bmat.albedo_color = berry_col; bmat.roughness = 0.24; bmat.metallic_specular = 0.72; bmat.rim_enabled = true; bmat.rim = 0.22
	var berries := MeshInstance3D.new(); berries.mesh = st_b.commit()
	berries.material_override = bmat
	berries.position = pos; berries.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parent.add_child(berries)
