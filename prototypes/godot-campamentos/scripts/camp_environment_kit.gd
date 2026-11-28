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
	mat_moss: Material,
	seed_v: float
) -> Node3D:
	var tr := Node3D.new()
	tr.name = "Tree_%s" % species
	tr.position = pos
	var sx := scale_f * (0.90 + fmod(absf(sin(seed_v * 2.13)), 0.22))
	var sy := scale_f * (0.92 + fmod(absf(cos(seed_v * 1.77)), 0.24))
	var sz := scale_f * (0.90 + fmod(absf(sin(seed_v * 3.11 + 0.8)), 0.22))
	tr.scale = Vector3(sx, sy, sz)
	tr.rotation.y = fmod(seed_v * 1.91, TAU)
	parent.add_child(tr)

	var st_trunk := SurfaceTool.new(); st_trunk.begin(Mesh.PRIMITIVE_TRIANGLES)
	var st_canopy := SurfaceTool.new(); st_canopy.begin(Mesh.PRIMITIVE_TRIANGLES)
	var st_moss := SurfaceTool.new(); st_moss.begin(Mesh.PRIMITIVE_TRIANGLES)
	_emit_classic_tree(species, seed_v, st_trunk, st_canopy, Transform3D.IDENTITY, st_moss)

	st_trunk.deindex()
	st_trunk.generate_normals()
	var trunk_inst := MeshInstance3D.new(); trunk_inst.name = "TrunkBatch"
	trunk_inst.mesh = st_trunk.commit(); trunk_inst.material_override = mat_trunk
	tr.add_child(trunk_inst)

	if mat_moss != null:
		st_moss.deindex()
		st_moss.generate_normals()
		var moss_mesh := st_moss.commit()
		if moss_mesh and moss_mesh.get_surface_count() > 0:
			var moss_inst := MeshInstance3D.new(); moss_inst.name = "RootMossCollar"
			moss_inst.mesh = moss_mesh; moss_inst.material_override = mat_moss
			moss_inst.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
			tr.add_child(moss_inst)

	var can_inst := MeshInstance3D.new(); can_inst.name = "CanopyBatch"
	if species == "pine" or species == "spruce":
		st_canopy.deindex()
		st_canopy.generate_normals()
		st_canopy.generate_tangents()
		can_inst.mesh = st_canopy.commit()
	else:
		can_inst.mesh = _bake_cohesive_crown_normals(st_canopy, Vector3(0.0, 2.75, 0.0), 0.68)
	can_inst.material_override = mat_leaves
	tr.add_child(can_inst)
	return tr

## 7 distinct asymmetrical sculpted foliage sub-masses (Paso 23.1 & 23.2: non-spherical scalloped boughs, plumes & shelves)
func get_foliage_lobe_variants() -> Array:
	if _rock_cache.has("foliage_lobe"):
		return _rock_cache["foliage_lobe"]
	var variants: Array[ArrayMesh] = []
	for v_idx in range(7):
		var seed_p := float(v_idx) * 2.83 + 1.4
		var sp := SphereMesh.new()
		sp.radial_segments = 8
		sp.rings = 5
		sp.radius = 0.56
		sp.height = 0.94
		var st := SurfaceTool.new()
		st.create_from(sp, 0)
		var arr := st.commit_to_arrays()
		var verts: PackedVector3Array = arr[Mesh.ARRAY_VERTEX]
		for i in range(verts.size()):
			var v: Vector3 = verts[i]
			var ang := atan2(v.z, v.x)
			# Multi-harmonic leafy ridge displacement so no sub-mass has a circular or hexagonal outline
			var d1 := sin(v.x * 4.8 + seed_p) * cos(v.z * 4.3 - seed_p * 0.8) * 0.17
			var d2 := cos(v.y * 5.2 + seed_p * 1.3) * 0.11
			var petal := sin(ang * (3.0 + float(v_idx % 3)) + seed_p) * 0.11 + cos(ang * 5.0 - seed_p * 1.4) * 0.06
			var dv := v * (1.0 + d1 + d2 + petal)
			match v_idx:
				0: # Broad asymmetrical spreading bough cluster
					dv.x *= 1.16 + 0.10 * sin(v.z * 3.0)
					dv.z *= 0.94
				1: # Tall ascending ovoid / flame plume (breaks round silhouettes!)
					dv.y *= 1.28
					var tap := clampf((dv.y + 0.45) / 0.95, 0.0, 1.0)
					dv.x *= lerpf(1.08, 0.74, tap * tap) + 0.08 * tap
					dv.z *= lerpf(1.04, 0.72, tap * tap)
				2: # Three-knuckled irregular horizontal leafy shelf
					dv.x *= 1.24
					dv.y *= 0.86 + 0.12 * cos(v.x * 4.2)
					dv.z += sin(v.x * 3.6 + seed_p) * 0.10
				3: # Sweeping drooping lateral limb mass
					dv.x *= 1.18
					dv.y -= maxf(0.0, dv.x) * 0.22
				4: # Tufted asymmetrical crown crest
					dv.y *= 1.20
					if dv.y > 0.0:
						dv.x += dv.y * 0.18 * sin(seed_p)
						dv.z -= dv.y * 0.15 * cos(seed_p)
				5: # Curved kidney / crescent bough mass wrapping trunk forks
					dv.x *= 1.15
					dv.z += (dv.x * dv.x - 0.10) * 0.36
				6: # Irregular Diagonal Tiered Billow
					dv.x *= 1.08 + 0.14 * sin(ang * 2.0 + 0.6)
					dv.z *= 1.08 - 0.14 * cos(ang * 2.0 - 0.4)
					dv.y *= 1.10
			if dv.y < -0.15:
				dv.y = lerpf(dv.y, -0.16, 0.46)
			verts[i] = dv
		arr[Mesh.ARRAY_VERTEX] = verts
		var mesh := ArrayMesh.new()
		mesh.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arr)
		var fin := SurfaceTool.new()
		fin.create_from(mesh, 0)
		fin.generate_normals()
		variants.append(fin.commit())
	_rock_cache["foliage_lobe"] = variants
	return variants

## Blends individual lobe normals toward the unified tree crown dome normal (Paso 23.2:
## eliminates the dark-bottomed individual ball/bun look so overlapping masses shade as one cohesive crown!)
static func _bake_cohesive_crown_normals(st_c: SurfaceTool, crown_center: Vector3, blend: float = 0.66) -> ArrayMesh:
	st_c.deindex()
	st_c.generate_normals()
	var arr := st_c.commit_to_arrays()
	if arr.is_empty() or arr[Mesh.ARRAY_VERTEX] == null:
		return ArrayMesh.new()
	var verts: PackedVector3Array = arr[Mesh.ARRAY_VERTEX]
	var norms: PackedVector3Array = arr[Mesh.ARRAY_NORMAL]
	if verts.is_empty() or norms.size() != verts.size():
		return st_c.commit()
	for i in range(verts.size()):
		var v: Vector3 = verts[i]
		var dome_n: Vector3 = v - crown_center
		if dome_n.length_squared() < 0.001:
			dome_n = Vector3.UP
		else:
			dome_n = dome_n.normalized()
		# Prevent steep downward normals inside internal lobe overlaps from creating black bands across the crown
		dome_n.y = maxf(dome_n.y, -0.14)
		dome_n = dome_n.normalized()
		var n_orig: Vector3 = norms[i]
		n_orig.y = maxf(n_orig.y, -0.32)
		norms[i] = (n_orig.normalized() * (1.0 - blend) + dome_n * blend).normalized()
	arr[Mesh.ARRAY_NORMAL] = norms
	var tmp := ArrayMesh.new()
	tmp.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arr)
	var fin := SurfaceTool.new()
	fin.create_from(tmp, 0)
	fin.generate_tangents()
	fin.index()
	return fin.commit()

## Organic flared trunk collar & 2-segment arched root buttresses that emerge from INSIDE the trunk waist
## and plunge deep (-0.58m) into the soil (Paso 23.5: compact muscular root flare, zero floating spider legs on slopes!)
func _append_flared_buttress_base(
	st_trunk: SurfaceTool,
	base: Transform3D,
	trunk_r: float,
	root_count: int,
	seed_v: float,
	st_moss: SurfaceTool = null
) -> void:
	# Flared lower trunk skirt sunk -0.58m underground up to +0.48m waist (stays grounded even on steep 30° banks)
	_cyl_between(st_trunk, base, Vector3(0.0, -0.58, 0.0), Vector3(0.0, 0.48, 0.0), trunk_r * 1.54, trunk_r * 1.01, 7)
	var lobes := get_foliage_lobe_variants()
	for r in range(root_count):
		var a := float(r) * TAU / float(root_count) + sin(seed_v * 1.73 + float(r) * 2.19) * 0.30
		var dir2 := Vector2(cos(a), sin(a))
		var reach := trunk_r * (0.46 + fmod(absf(seed_v * 1.91 + float(r) * 0.67), 0.34))
		var start_h := 0.36 + fmod(absf(seed_v * 1.13 + float(r) * 0.37), 0.18)
		var p0 := Vector3(dir2.x * trunk_r * 0.34, start_h, dir2.y * trunk_r * 0.34)
		var knee_r := trunk_r * 1.18 + reach * 0.42
		var p1 := Vector3(dir2.x * knee_r, -0.02, dir2.y * knee_r)
		var side_bend := Vector2(-dir2.y, dir2.x) * sin(seed_v + float(r) * 1.8) * (trunk_r * 0.14)
		var toe_r := trunk_r * 1.28 + reach
		var p2 := Vector3(dir2.x * toe_r + side_bend.x, -0.58, dir2.y * toe_r + side_bend.y)
		# Upper root buttress web emerging seamlessly from inside the trunk cylinder
		_cyl_between(st_trunk, base, p0, p1, trunk_r * 0.46, trunk_r * 0.34, 5)
		# Lower root toe plunging deeply into the terrain
		_cyl_between(st_trunk, base, p1, p2, trunk_r * 0.33, trunk_r * 0.16, 5)
		if st_moss != null and (r % 2 == 0 or root_count <= 4):
			var ma := a + (PI / float(root_count)) * 0.65
			var mr := trunk_r * 1.08
			var mmesh: ArrayMesh = lobes[posmod(r, lobes.size())]
			var m_sc := Vector3(trunk_r * 1.18, trunk_r * 0.38, trunk_r * 1.02)
			st_moss.append_from(mmesh, 0, base * Transform3D(Basis(Vector3.UP, ma).scaled(m_sc), Vector3(cos(ma) * mr, -0.03, sin(ma) * mr)))

## Star-scalloped drooping conifer bough whorl (only ~32-48 tris per tier — feathery evergreen tips, ZERO flat cones or pillow blobs!)
static func _append_evergreen_whorl(
	st: SurfaceTool,
	base: Transform3D,
	center_pos: Vector3,
	outer_rad: float,
	tier_h: float,
	bough_count: int,
	droop: float,
	seed_v: float
) -> void:
	var n_ring := bough_count * 2
	var top_pt := base * (center_pos + Vector3(0.0, tier_h, 0.0))
	var bot_pt := base * (center_pos + Vector3(0.0, -droop * 0.45, 0.0))
	var ring_pts: Array[Vector3] = []
	var ring_uvs: Array[Vector2] = []
	for i in range(n_ring):
		var a := float(i) * TAU / float(n_ring) + seed_v
		var is_tip := (i % 2) == 0
		var jitter_r := 0.86 + fmod(absf(sin(seed_v * 3.7 + float(i) * 2.13)), 0.30)
		var r := (outer_rad * jitter_r) if is_tip else (outer_rad * (0.46 + fmod(absf(cos(seed_v + float(i) * 1.7)), 0.12)))
		var y_off := (-droop * (0.85 + fmod(absf(sin(float(i) * 1.9 + seed_v)), 0.35))) if is_tip else (tier_h * 0.14)
		var lp := center_pos + Vector3(cos(a) * r, y_off, sin(a) * r)
		ring_pts.append(base * lp)
		ring_uvs.append(Vector2(0.5 + cos(a) * (0.48 if is_tip else 0.24), 0.5 + sin(a) * (0.48 if is_tip else 0.24)))
	var uv_c := Vector2(0.5, 0.5)
	for i in range(n_ring):
		var j := (i + 1) % n_ring
		# Upper sloped evergreen bough facets
		st.set_uv(uv_c); st.add_vertex(top_pt)
		st.set_uv(ring_uvs[j]); st.add_vertex(ring_pts[j])
		st.set_uv(ring_uvs[i]); st.add_vertex(ring_pts[i])
		# Underside bough shadow facets (closed volumetric silhouette from low oblique cameras)
		st.set_uv(uv_c); st.add_vertex(bot_pt)
		st.set_uv(ring_uvs[i]); st.add_vertex(ring_pts[i])
		st.set_uv(ring_uvs[j]); st.add_vertex(ring_pts[j])

## Emits 4 distinct asymmetrical broadleaf crown archetypes (Paso 23.1 & 23.2:
## 0 = Wide spreading veteran with low side limb; 1 = Tall ascending ovoid/flame woodland crown;
## 2 = Forked twin-crown split bole with open notch; 3 = Wind-swept diagonal cascading crown)
func _emit_broadleaf_archetype(
	st_trunk: SurfaceTool,
	st_canopy: SurfaceTool,
	base: Transform3D,
	b_h: float,
	trunk_r: float,
	variant_idx: int,
	seed_v: float
) -> void:
	var lobes := get_foliage_lobe_variants()
	var v_arch := posmod(variant_idx, 4)
	var lx := sin(seed_v * 1.37) * 0.12
	var lz := cos(seed_v * 1.71) * 0.11
	if v_arch == 2:
		# Archetype 2: Low-forked twin-crown tree (two diverging trunks supporting two unequal canopy domes)
		var fork_pt := Vector3(lx * 0.5, 1.32, lz * 0.5)
		_cyl_between(st_trunk, base, Vector3(0.0, -0.22, 0.0), fork_pt, trunk_r, trunk_r * 0.78, 6)
		var top_a := Vector3(-0.78 + lx, b_h + 0.45, 0.32 + lz)
		var top_b := Vector3(0.76 + lx, b_h + 0.05, -0.36 + lz)
		_cyl_between(st_trunk, base, fork_pt, top_a, trunk_r * 0.62, trunk_r * 0.28, 6)
		_cyl_between(st_trunk, base, fork_pt, top_b, trunk_r * 0.56, trunk_r * 0.25, 6)
		var sub_specs := [
			# Crown A (taller northwest dome)
			[top_a, Vector3(-0.65, 0.62, 0.35), Vector3(1.85, 1.35, 1.72), 0],
			[top_a, Vector3(0.22, 0.75, 0.58), Vector3(1.75, 1.28, 1.68), 5],
			[top_a, Vector3(-0.28, 0.82, -0.52), Vector3(1.72, 1.32, 1.65), 2],
			[top_a, Vector3(-0.18, 1.55, 0.08), Vector3(1.92, 1.58, 1.82), 1],
			# Central bridging saddle (lower than both peaks so a natural twin-crown notch is visible)
			[fork_pt, Vector3(0.0, 1.55, 0.0), Vector3(1.95, 1.22, 1.80), 5],
			# Crown B (lower wider southeast dome)
			[top_b, Vector3(0.68, 0.52, -0.28), Vector3(1.96, 1.18, 1.82), 3],
			[top_b, Vector3(0.18, 0.65, -0.68), Vector3(1.72, 1.16, 1.64), 6],
			[top_b, Vector3(0.32, 1.22, -0.14), Vector3(1.88, 1.34, 1.78), 4],
		]
		for si in range(sub_specs.size()):
			var sp_item: Array = sub_specs[si]
			var origin_p: Vector3 = sp_item[0]
			var off_p: Vector3 = sp_item[1]
			var sc_p: Vector3 = sp_item[2]
			var l_idx: int = int(sp_item[3])
			var tip_p := origin_p + off_p
			if si != 4 and si != 3 and si != 7:
				_cyl_between(st_trunk, base, origin_p - Vector3(0.0, 0.14, 0.0), tip_p, trunk_r * 0.25, trunk_r * 0.10, 5)
			var lmesh: ArrayMesh = lobes[posmod(l_idx + int(absf(seed_v)), lobes.size())]
			var rot_b := Basis.from_euler(Vector3(0.06 * sin(float(si) + seed_v), float(si) * 1.17 + seed_v, -0.05 * cos(float(si)))).scaled(sc_p)
			st_canopy.append_from(lmesh, 0, base * Transform3D(rot_b, tip_p + Vector3(0.0, 0.24, 0.0)))
	elif v_arch == 1:
		# Archetype 1: Tall upright multi-tiered woodland tree (ascending ovoid/flame crown silhouette)
		var mid_bole := Vector3(lx * 0.9, b_h * 0.58, -lz * 0.8)
		var top_bole := Vector3(-lx * 0.5, b_h + 0.52, lz * 0.6)
		_cyl_between(st_trunk, base, Vector3(0.0, -0.22, 0.0), mid_bole, trunk_r * 0.94, trunk_r * 0.68, 6)
		_cyl_between(st_trunk, base, mid_bole - Vector3(0.0, 0.08, 0.0), top_bole, trunk_r * 0.68, trunk_r * 0.34, 6)
		var tiers := [
			# Core bridging mass hiding trunk fork
			[ Vector3(0.0, 0.35, 0.0), Vector3(1.92, 1.48, 1.85), 5, false ],
			# Lower irregular bough skirt
			[ Vector3(-0.88, 0.48, 0.32), Vector3(1.76, 1.24, 1.64), 3, true ],
			[ Vector3(0.78, 0.62, -0.38), Vector3(1.68, 1.28, 1.62), 0, true ],
			[ Vector3(0.18, 0.56, 0.82), Vector3(1.65, 1.22, 1.72), 2, true ],
			# Mid-crown ascending tier
			[ Vector3(-0.48, 1.38, -0.46), Vector3(1.78, 1.56, 1.68), 1, true ],
			[ Vector3(0.46, 1.52, 0.36), Vector3(1.72, 1.62, 1.64), 4, true ],
			# Tall tapered upper spire plume
			[ Vector3(-0.14, 2.38, 0.12), Vector3(1.58, 1.82, 1.52), 1, false ],
			[ Vector3(0.16, 2.95, -0.10), Vector3(1.18, 1.46, 1.14), 4, false ],
		]
		for ti in range(tiers.size()):
			var t_it: Array = tiers[ti]
			var off_t: Vector3 = t_it[0]
			var sc_t: Vector3 = t_it[1]
			var l_i: int = int(t_it[2])
			var has_br: bool = bool(t_it[3])
			var p_tip := top_bole + off_t
			if has_br:
				_cyl_between(st_trunk, base, top_bole - Vector3(0.0, 0.25, 0.0), p_tip, trunk_r * 0.30, trunk_r * 0.11, 5)
			var lm: ArrayMesh = lobes[posmod(l_i + ti, lobes.size())]
			var rb := Basis.from_euler(Vector3(0.05, float(ti) * 1.43 + seed_v, -0.04)).scaled(sc_t)
			st_canopy.append_from(lm, 0, base * Transform3D(rb, p_tip))
	elif v_arch == 3:
		# Archetype 3: Wind-swept leaning tree with low counter-bough and diagonal cascading crown tiers
		var elbow := Vector3(0.22 + lx, b_h * 0.56, 0.14 + lz)
		var bole_top3 := Vector3(0.42 + lx, b_h + 0.12, 0.26 + lz)
		_cyl_between(st_trunk, base, Vector3(0.0, -0.22, 0.0), elbow, trunk_r, trunk_r * 0.72, 6)
		_cyl_between(st_trunk, base, elbow - Vector3(0.0, 0.08, 0.0), bole_top3, trunk_r * 0.72, trunk_r * 0.36, 6)
		var wind_masses := [
			# Central core mass enveloping upper trunk
			[ Vector3(0.05, 0.55, 0.04), Vector3(2.10, 1.42, 1.96), 5, true ],
			# Windward low counter-shelf
			[ Vector3(-0.98, 0.42, -0.45), Vector3(1.78, 1.16, 1.65), 3, true ],
			# Diagonal ascending cascade toward +X/+Z
			[ Vector3(-0.25, 1.08, 0.72), Vector3(1.94, 1.34, 1.84), 2, true ],
			[ Vector3(0.75, 0.92, -0.58), Vector3(1.88, 1.28, 1.78), 6, true ],
			[ Vector3(1.18, 0.68, 0.38), Vector3(2.05, 1.22, 1.86), 3, true ],
			[ Vector3(0.45, 1.68, 0.24), Vector3(2.12, 1.54, 1.98), 4, false ],
			[ Vector3(0.92, 1.38, 0.52), Vector3(1.74, 1.36, 1.68), 1, false ],
		]
		for wi in range(wind_masses.size()):
			var w_it: Array = wind_masses[wi]
			var w_off: Vector3 = w_it[0]
			var w_sc: Vector3 = w_it[1]
			var wl_i: int = int(w_it[2])
			var w_br: bool = bool(w_it[3])
			var w_tip := bole_top3 + w_off
			if w_br:
				_cyl_between(st_trunk, base, bole_top3 - Vector3(0.0, 0.22, 0.0), w_tip, trunk_r * 0.34, trunk_r * 0.12, 5)
			var w_m: ArrayMesh = lobes[posmod(wl_i + wi, lobes.size())]
			var w_rot := Basis.from_euler(Vector3(0.07, float(wi) * 1.25 + seed_v, -0.09)).scaled(w_sc)
			st_canopy.append_from(w_m, 0, base * Transform3D(w_rot, w_tip + Vector3(0.0, 0.22, 0.0)))
	else:
		# Archetype 0: Spreading asymmetrical veteran oak/beech with heavy low sweeping limb & offset multi-dome crest
		var mid0 := Vector3(lx * 0.7, b_h * 0.52, -lz * 0.6)
		var bole_top0 := Vector3(lx * 1.1, b_h, -lz * 0.9)
		_cyl_between(st_trunk, base, Vector3(0.0, -0.22, 0.0), mid0, trunk_r * 1.04, trunk_r * 0.76, 6)
		_cyl_between(st_trunk, base, mid0 - Vector3(0.0, 0.08, 0.0), bole_top0, trunk_r * 0.76, trunk_r * 0.40, 6)
		var spread_masses := [
			# Central core mass completely enclosing trunk crotch
			[ Vector3(0.0, 0.68, 0.0), Vector3(2.28, 1.48, 2.16), 5, false ],
			# Heavy low sweeping lateral bough on -X/+Z
			[ Vector3(-1.32, 0.56, 0.48), Vector3(2.14, 1.22, 1.92), 3, true ],
			# Unequal radial primary boughs (non-pentagonal angles & varied heights/radii!)
			[ Vector3(1.08, 0.88, -0.28), Vector3(2.04, 1.34, 1.96), 0, true ],
			[ Vector3(0.34, 0.78, 1.06), Vector3(1.92, 1.26, 2.08), 2, true ],
			[ Vector3(-0.46, 1.02, -0.94), Vector3(1.98, 1.38, 1.88), 6, true ],
			[ Vector3(-0.76, 1.38, 0.14), Vector3(1.88, 1.42, 1.82), 1, false ],
			# Offset upper crown crest + secondary shoulder
			[ Vector3(0.28, 1.72, -0.18), Vector3(2.16, 1.56, 2.04), 4, false ],
			[ Vector3(-0.24, 1.98, 0.22), Vector3(1.68, 1.38, 1.62), 1, false ],
		]
		for i in range(spread_masses.size()):
			var s_it: Array = spread_masses[i]
			var s_off: Vector3 = s_it[0] + Vector3(sin(seed_v + float(i)) * 0.14, cos(seed_v * 1.3 + float(i)) * 0.08, cos(seed_v + float(i)) * 0.14)
			var sc_main: Vector3 = s_it[1] * (0.94 + fmod(float(i) * 0.19 + absf(seed_v) * 0.13, 0.16))
			var l_idx0: int = int(s_it[2])
			var draw_br: bool = bool(s_it[3])
			var tip := bole_top0 + s_off
			if draw_br:
				_cyl_between(st_trunk, base, bole_top0 - Vector3(0.0, 0.24, 0.0), tip, trunk_r * 0.36, trunk_r * 0.13, 5)
			var bmesh: ArrayMesh = lobes[posmod(l_idx0 + i + int(absf(seed_v) * 2.0), lobes.size())]
			var t_basis := Basis.from_euler(Vector3(0.06 * sin(float(i)), float(i) * 1.37 + seed_v * 0.5, -0.05 * cos(float(i)))).scaled(sc_main)
			st_canopy.append_from(bmesh, 0, base * Transform3D(t_basis, tip + Vector3(0.0, 0.24, 0.0)))

## Shared pine/oak geometry (classic camp species) emitted into caller SurfaceTools
## with an arbitrary base transform, so the same silhouette can be batched.
func _emit_classic_tree(
	species: String,
	seed_v: float,
	st_trunk: SurfaceTool,
	st_canopy: SurfaceTool,
	base: Transform3D,
	st_moss: SurfaceTool = null
) -> void:
	var lean_x := sin(seed_v * 1.3) * 0.09
	var lean_z := cos(seed_v * 1.7) * 0.08
	var root_count := 5 + (int(round(absf(seed_v) * 3.0)) % 2)
	var base_r := 0.35 if species == "pine" else 0.42
	_append_flared_buttress_base(st_trunk, base, base_r, root_count, seed_v, st_moss)

	if species == "pine":
		_cyl_between(st_trunk, base, Vector3(0.0, -0.18, 0.0), Vector3(lean_x * 1.1, 2.25, -lean_z * 1.0), 0.35, 0.22, 6)
		_cyl_between(st_trunk, base, Vector3(lean_x * 1.1, 2.15, -lean_z * 1.0), Vector3(lean_x * 0.5, 5.45, lean_z * 0.7), 0.22, 0.06, 6)
		# Feathery multi-tiered drooping conifer whorls (organic jagged branch fans, low tri count!)
		for tier in range(6):
			var tf := float(tier) / 5.0
			var base_y := 1.85 + float(tier) * 0.68
			var rad := lerpf(2.05, 0.54, pow(tf, 0.85))
			var th := lerpf(1.18, 0.88, tf)
			var pts := 8 if tier < 3 else (7 if tier < 5 else 5)
			var cx := lean_x * (0.9 - tf * 0.4) + sin(seed_v + float(tier) * 1.5) * 0.08
			var cz := -lean_z * (0.8 - tf * 1.2) + cos(seed_v + float(tier) * 1.3) * 0.08
			_append_evergreen_whorl(st_canopy, base, Vector3(cx, base_y, cz), rad, th, pts, lerpf(0.38, 0.14, tf), seed_v + float(tier) * 0.85)
		# Crisp natural feathered spire tip
		_append_evergreen_whorl(st_canopy, base, Vector3(lean_x * 0.5, 5.45, lean_z * 0.7), 0.42, 1.05, 5, 0.08, seed_v + 5.1)
	else:
		var arch_idx := posmod(int(round(absf(seed_v) * 5.3)), 4)
		_emit_broadleaf_archetype(st_trunk, st_canopy, base, 2.28, 0.42, arch_idx, seed_v)

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
		# De-index before tangent generation so mixed append_from primitives never corrupt triangle indices
		st.deindex()
		st.generate_normals()
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

# ------------------------------------------------------------------------------
# MultiMesh instanced flora & prototype cache (fast build + low draw/tri cost)
# ------------------------------------------------------------------------------
var _mm_batches: Dictionary = {} # key -> {"mesh": Mesh, "mat": Material, "shadow": bool, "items": Array[Dictionary]}
static var _tree_proto_cache: Dictionary = {}
static var _bush_proto_cache: Dictionary = {}
static var _mush_proto_cache: Dictionary = {}
static var _debris_proto_cache: Dictionary = {}

func define_multimesh(key: String, mesh: Mesh, mat: Material, cast_shadow: bool = true) -> void:
	if _mm_batches.has(key) or mesh == null:
		return
	_mm_batches[key] = {
		"mesh": mesh,
		"mat": mat,
		"shadow": cast_shadow,
		"items": [],
	}

func append_multimesh(key: String, xf: Transform3D, inst_color: Color = Color(1.0, 1.0, 1.0, 1.0)) -> void:
	if not _mm_batches.has(key):
		return
	(_mm_batches[key]["items"] as Array).append({"xf": xf, "col": inst_color})

func flush_multimeshes(parent: Node3D, prefix: String) -> Dictionary:
	var stats := {}
	for key in _mm_batches.keys():
		var b: Dictionary = _mm_batches[key]
		var items: Array = b["items"]
		if items.is_empty():
			continue
		var mm := MultiMesh.new()
		mm.transform_format = MultiMesh.TRANSFORM_3D
		mm.use_colors = true
		mm.mesh = b["mesh"]
		mm.instance_count = items.size()
		for i in range(items.size()):
			var it: Dictionary = items[i]
			mm.set_instance_transform(i, it["xf"] as Transform3D)
			mm.set_instance_color(i, it["col"] as Color)
		var mmi := MultiMeshInstance3D.new()
		mmi.name = prefix + str(key)
		mmi.multimesh = mm
		mmi.material_override = b["mat"]
		mmi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON if bool(b["shadow"]) else GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		parent.add_child(mmi)
		stats[key] = items.size()
	_mm_batches.clear()
	return stats

func get_bush_quad_proto(uv: Rect2, aspect: float = 1.15) -> ArrayMesh:
	var ck := "%s_%.2f" % [str(uv), aspect]
	if _bush_proto_cache.has(ck):
		return _bush_proto_cache[ck] as ArrayMesh
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	for k in range(3):
		var b := Basis(Vector3.UP, float(k) * PI / 3.0)
		append_card(st, Transform3D(b, Vector3.ZERO), aspect, 1.0, uv, Vector3(0.0, 1.0, 0.35), -0.05)
	st.generate_tangents()
	var m := st.commit()
	_bush_proto_cache[ck] = m
	return m

func get_tree_species_proto(species: String, variant_idx: int = 0) -> Dictionary:
	var v_mod := posmod(variant_idx, 4)
	var cache_key := species if variant_idx == 0 else ("%s_v%d" % [species, v_mod])
	if _tree_proto_cache.has(cache_key):
		return _tree_proto_cache[cache_key] as Dictionary
	var st_t := SurfaceTool.new(); st_t.begin(Mesh.PRIMITIVE_TRIANGLES)
	var st_c := SurfaceTool.new(); st_c.begin(Mesh.PRIMITIVE_TRIANGLES)
	var st_k := SurfaceTool.new(); st_k.begin(Mesh.PRIMITIVE_TRIANGLES)
	var has_canopy := false
	var has_cards := false
	var lumps := get_foliage_lobe_variants()
	var seed_v := float(v_mod) * 2.37 + float(species.hash() % 17) * 0.41

	# Paso 23.5: Integrated flared trunk collar & arched root buttresses plunging -0.25m into soil
	var is_slender := species in ["birch", "sapling"]
	var base_r := 0.175 if is_slender else (0.31 if species in ["spruce", "snag"] else (0.34 if species == "pine" else 0.44))
	var root_count := (4 if is_slender else 5) + (v_mod % 2)
	_append_flared_buttress_base(st_t, Transform3D.IDENTITY, base_r, root_count, seed_v)

	var crown_dome_center := Vector3(0.0, 2.85, 0.0)
	match species:
		"pine":
			has_canopy = true
			var px_lean := (float(v_mod) - 1.5) * 0.055
			var pz_lean := sin(seed_v) * 0.05
			var ph := 5.15 + float(v_mod % 3) * 0.28
			_cyl_between(st_t, Transform3D.IDENTITY, Vector3(0.0, -0.18, 0.0), Vector3(px_lean, ph, pz_lean), 0.34, 0.06, 6)
			# Feathery jagged coastal pine bough whorls (fast low-tri star skirts, zero pillows/cones!)
			for tier in range(6):
				var tf := float(tier) / 5.0
				var by := 1.80 + float(tier) * ((ph - 1.85) / 5.0)
				var trad := lerpf(1.94 + float(v_mod % 2) * 0.14, 0.48, pow(tf, 0.86))
				var pts := 8 if tier < 3 else (7 if tier < 5 else 5)
				_append_evergreen_whorl(st_c, Transform3D.IDENTITY, Vector3(px_lean * tf, by, pz_lean * tf), trad, lerpf(1.14, 0.86, tf), pts, lerpf(0.36, 0.14, tf), float(tier) * 0.92 + seed_v)
			_append_evergreen_whorl(st_c, Transform3D.IDENTITY, Vector3(px_lean, ph + 0.18, pz_lean), 0.40, 1.02, 5, 0.08, 4.7 + seed_v)
		"spruce":
			has_canopy = true
			var sx_lean := cos(seed_v) * 0.05
			var sz_lean := sin(seed_v * 1.3) * 0.05
			var sh := 6.25 + float(v_mod % 3) * 0.34
			_cyl_between(st_t, Transform3D.IDENTITY, Vector3(0.0, -0.18, 0.0), Vector3(sx_lean, sh, sz_lean), 0.31, 0.055, 6)
			# Tall jagged coastal spruce with drooping multi-tip evergreen whorls
			for tier in range(7):
				var tf2 := float(tier) / 6.0
				var y := 1.42 + float(tier) * ((sh - 1.48) / 6.0)
				var rad := lerpf(2.02 + float(v_mod % 2) * 0.12, 0.40, pow(tf2, 0.90))
				var pts2 := 8 if tier < 4 else (6 if tier < 6 else 5)
				_append_evergreen_whorl(st_c, Transform3D.IDENTITY, Vector3(sx_lean * tf2, y, sz_lean * tf2), rad, lerpf(1.26, 0.92, tf2), pts2, lerpf(0.42, 0.14, tf2), float(tier) * 1.13 + seed_v)
			_append_evergreen_whorl(st_c, Transform3D.IDENTITY, Vector3(sx_lean, sh + 0.06, sz_lean), 0.36, 1.15, 5, 0.07, 6.3 + seed_v)
		"birch", "sapling":
			has_canopy = true
			crown_dome_center = Vector3(0.0, 3.25, 0.0)
			if v_mod == 2:
				# Variant 2: Multi-stemmed forked silver birch clump (two diverging slender trunks, tall airy plumes)
				var fork_b := Vector3(0.0, 0.45, 0.0)
				var b_top_a := Vector3(-0.46, 2.85, 0.18)
				var b_top_b := Vector3(0.42, 2.48, -0.22)
				_cyl_between(st_t, Transform3D.IDENTITY, Vector3(0.0, -0.20, 0.0), fork_b, 0.185, 0.155, 6)
				_cyl_between(st_t, Transform3D.IDENTITY, fork_b, b_top_a, 0.125, 0.052, 5)
				_cyl_between(st_t, Transform3D.IDENTITY, fork_b, b_top_b, 0.110, 0.048, 5)
				var birch_v2 := [
					[ b_top_a + Vector3(0.0, 0.18, 0.0), Vector3(1.18, 1.12, 1.12), 5 ],
					[ b_top_a + Vector3(-0.34, 0.56, 0.22), Vector3(1.14, 1.24, 1.08), 1 ],
					[ b_top_a + Vector3(0.18, 0.68, -0.26), Vector3(1.08, 1.18, 1.04), 4 ],
					[ b_top_a + Vector3(-0.12, 1.28, 0.06), Vector3(1.06, 1.38, 1.02), 1 ],
					[ b_top_b + Vector3(0.0, 0.16, 0.0), Vector3(1.12, 1.04, 1.08), 5 ],
					[ b_top_b + Vector3(0.32, 0.48, -0.18), Vector3(1.14, 1.16, 1.06), 3 ],
					[ b_top_b + Vector3(0.14, 0.96, 0.12), Vector3(1.02, 1.22, 0.98), 4 ],
				]
				for bi2 in range(birch_v2.size()):
					var bit2: Array = birch_v2[bi2]
					var bp2: Vector3 = bit2[0]
					var bsc2: Vector3 = bit2[1]
					var bli2: int = int(bit2[2])
					st_c.append_from(lumps[posmod(bli2 + bi2, lumps.size())], 0, Transform3D(Basis.from_euler(Vector3(0.05, float(bi2) * 1.31 + seed_v, -0.04)).scaled(bsc2), bp2))
			else:
				# Variants 0, 1, 3: Curved slender bole terminating INSIDE lower crown (y=2.78..2.98m) — zero bare pole tip!
				var bx_lean := (0.14 if v_mod == 0 else (-0.18 if v_mod == 1 else 0.26))
				var bz_lean := (-0.08 if v_mod == 0 else (0.12 if v_mod == 1 else 0.16))
				var mid_b := Vector3(bx_lean * 0.45, 1.48, bz_lean * 0.45)
				var top_b := Vector3(bx_lean, 2.86 + float(v_mod % 2) * 0.16, bz_lean)
				_cyl_between(st_t, Transform3D.IDENTITY, Vector3(0.0, -0.20, 0.0), mid_b, 0.175, 0.125, 6)
				_cyl_between(st_t, Transform3D.IDENTITY, mid_b - Vector3(0.0, 0.05, 0.0), top_b, 0.125, 0.058, 5)
				for k in range(3):
					var a := 0.45 + float(k) * 2.09 + seed_v * 0.5
					var s := top_b - Vector3(0.0, 0.38 - float(k) * 0.14, 0.0)
					_cyl_between(st_t, Transform3D.IDENTITY, s, s + Vector3(cos(a) * 0.54, 0.46, sin(a) * 0.54), 0.046, 0.018, 5)
				var h_mult := 1.16 if v_mod == 1 else 1.0
				var birch_masses := [
					# Central core mass completely covering top_b
					[ top_b + Vector3(0.0, 0.18, 0.0), Vector3(1.36, 1.18 * h_mult, 1.28), 5 ],
					# Irregular lower bough tufts
					[ top_b + Vector3(-0.56, 0.24, 0.26), Vector3(1.22, 1.06, 1.14), 3 ],
					[ top_b + Vector3(0.52, 0.36, -0.24), Vector3(1.18, 1.12, 1.12), 0 ],
					[ top_b + Vector3(0.12, 0.32, 0.54), Vector3(1.16, 1.08, 1.20), 2 ],
					# Mid ascending ovoid crown
					[ top_b + Vector3(-0.28, 0.82 * h_mult, -0.26), Vector3(1.24, 1.32 * h_mult, 1.18), 1 ],
					[ top_b + Vector3(0.24, 0.94 * h_mult, 0.20), Vector3(1.20, 1.36 * h_mult, 1.14), 4 ],
					# Tapered airy birch crown plume
					[ top_b + Vector3(-0.08 + bx_lean * 0.3, 1.48 * h_mult, 0.06), Vector3(1.06, 1.42 * h_mult, 1.02), 1 ],
				]
				for bm_i in range(birch_masses.size()):
					var b_it: Array = birch_masses[bm_i]
					var bp: Vector3 = b_it[0]
					var bsc: Vector3 = b_it[1]
					var bli: int = int(b_it[2])
					st_c.append_from(lumps[posmod(bli + bm_i, lumps.size())], 0, Transform3D(Basis.from_euler(Vector3(0.06, float(bm_i) * 1.28 + seed_v, -0.05)).scaled(bsc), bp))
		"beech", "beech_copper", "oak":
			has_canopy = true
			var b_h := (2.28 if species == "oak" else 2.64) + float(v_mod % 2) * 0.14
			crown_dome_center = Vector3(0.0, b_h + 0.55, 0.0)
			_emit_broadleaf_archetype(st_t, st_c, Transform3D.IDENTITY, b_h, 0.44, v_mod, seed_v)
		"willow":
			has_canopy = true
			has_cards = true
			var wx := 0.20 + float(v_mod % 3) * 0.08 * (1.0 if v_mod % 2 == 0 else -1.0)
			var wz := 0.18 - float(v_mod % 2) * 0.12
			var w_top := Vector3(wx, 2.38 + float(v_mod % 2) * 0.16, wz)
			crown_dome_center = w_top + Vector3(0.0, 0.45, 0.0)
			_cyl_between(st_t, Transform3D.IDENTITY, Vector3(0.0, -0.20, 0.0), w_top, 0.46, 0.27, 6)
			# Central bridging willow dome + 6 irregular overarching weeping boughs
			st_c.append_from(lumps[5], 0, Transform3D(Basis(Vector3.UP, seed_v).scaled(Vector3(2.24, 1.32, 2.12)), w_top + Vector3(0.0, 0.62, 0.0)))
			var w_offs := [
				Vector3(-1.12, 0.68, 0.36), Vector3(1.06, 0.78, -0.32),
				Vector3(0.26, 0.74, 1.08), Vector3(-0.34, 0.84, -1.02),
				Vector3(-0.56, 1.32, 0.24), Vector3(0.48, 1.42, -0.18),
			]
			for k in range(w_offs.size()):
				var w_off: Vector3 = w_offs[k].rotated(Vector3.UP, seed_v * 0.6)
				var w_tip := w_top + w_off
				if k < 4:
					_cyl_between(st_t, Transform3D.IDENTITY, w_top - Vector3(0.0, 0.18, 0.0), w_tip, 0.16, 0.068, 5)
				var w_sc := Vector3(1.94, 1.18, 1.84) * (0.92 + float(k % 3) * 0.11)
				st_c.append_from(lumps[posmod(k + v_mod, lumps.size())], 0, Transform3D(Basis.from_euler(Vector3(0.05, float(k) * 1.18 + seed_v, -0.05)).scaled(w_sc), w_tip + Vector3(0.0, 0.18, 0.0)))
			var ivy_uv := Rect2(0.02, 0.51, 0.46, 0.47)
			for k in range(10):
				var a6 := float(k) * TAU / 10.0 + seed_v * 0.35
				var rr6 := 1.38 + fmod(float(k) * 0.43 + float(v_mod) * 0.19, 0.76)
				var top_y := 3.68 + sin(float(k) * 1.7 + seed_v) * 0.24
				var length := 2.08 + fmod(float(k) * 0.49 + float(v_mod) * 0.23, 0.68)
				var cp := w_top + Vector3(cos(a6) * rr6, 0.0, sin(a6) * rr6)
				append_card(st_k, Transform3D(Basis(Vector3.UP, -a6 + PI * 0.5), Vector3(cp.x, top_y - length, cp.z)), 1.05, length, ivy_uv, Vector3(0.0, 0.55, 0.8), 0.0)
		"snag":
			_cyl_between(st_t, Transform3D.IDENTITY, Vector3(0.0, -0.20, 0.0), Vector3(0.14, 3.85, -0.06), 0.34, 0.13, 6)
			for k in range(4):
				var a7 := float(k) * 1.85 + 0.3 + seed_v
				var s7 := Vector3(0.07, 1.65 + float(k) * 0.55, -0.03)
				var mid7 := s7 + Vector3(cos(a7) * 0.65, 0.48, sin(a7) * 0.65)
				_cyl_between(st_t, Transform3D.IDENTITY, s7, mid7, 0.09, 0.042, 5)
				_cyl_between(st_t, Transform3D.IDENTITY, mid7, mid7 + Vector3(cos(a7 + 0.4) * 0.48, 0.36 - float(k) * 0.08, sin(a7 + 0.4) * 0.48), 0.042, 0.016, 4)

	st_t.deindex()
	st_t.generate_normals()
	st_t.index()
	var proto := {"trunk": st_t.commit()}
	if has_canopy:
		if species in ["pine", "spruce"]:
			st_c.deindex()
			st_c.generate_normals()
			st_c.generate_tangents()
			st_c.index()
			proto["canopy"] = st_c.commit()
		else:
			proto["canopy"] = _bake_cohesive_crown_normals(st_c, crown_dome_center, 0.68)
	if has_cards:
		st_k.generate_tangents()
		proto["cards"] = st_k.commit()
	_tree_proto_cache[cache_key] = proto
	return proto

## Volumetric 3D woodland hedgerow / dense bramble-holly-laurel thicket prototype (Paso 23:
## wide, lush, impenetrable multi-layered foliage banks with basal stems, cohesive 3D billows & outer leafy fronds)
func get_hedge_thicket_proto(variant_idx: int = 0) -> Dictionary:
	var v_mod := posmod(variant_idx, 3)
	var ck := "hedge_thicket_v%d" % v_mod
	if _bush_proto_cache.has(ck):
		return _bush_proto_cache[ck] as Dictionary
	var st_stems := SurfaceTool.new(); st_stems.begin(Mesh.PRIMITIVE_TRIANGLES)
	var st_fol := SurfaceTool.new(); st_fol.begin(Mesh.PRIMITIVE_TRIANGLES)
	var st_fronds := SurfaceTool.new(); st_fronds.begin(Mesh.PRIMITIVE_TRIANGLES)
	var lobes := get_foliage_lobe_variants()
	var seed_v := float(v_mod) * 3.17 + 0.9

	# Variant 0 = wide sweeping hedgerow bank (~3.2m x 1.38m x 1.65m);
	# Variant 1 = dense L-curved corner bramble thicket (~2.7m x 1.45m x 2.05m);
	# Variant 2 = sprawling wild woodland hedge wall (~3.5m x 1.32m x 1.55m)
	var billow_pts: Array = []
	if v_mod == 0:
		billow_pts = [
			[ Vector3(-1.08, 0.42, 0.06), Vector3(1.28, 0.88, 1.14), 0 ],
			[ Vector3(-0.52, 0.56, -0.18), Vector3(1.42, 1.06, 1.26), 2 ],
			[ Vector3(0.06, 0.64, 0.12), Vector3(1.54, 1.16, 1.34), 5 ],
			[ Vector3(0.64, 0.54, -0.10), Vector3(1.38, 1.02, 1.22), 6 ],
			[ Vector3(1.14, 0.40, 0.14), Vector3(1.22, 0.84, 1.10), 3 ],
			[ Vector3(-0.78, 0.34, 0.44), Vector3(1.12, 0.72, 1.02), 3 ],
			[ Vector3(0.34, 0.36, 0.48), Vector3(1.24, 0.76, 1.08), 0 ],
			[ Vector3(-0.22, 0.88, -0.04), Vector3(1.32, 0.96, 1.16), 4 ],
			[ Vector3(0.42, 0.84, 0.06), Vector3(1.24, 0.92, 1.12), 1 ],
		]
	elif v_mod == 1:
		billow_pts = [
			[ Vector3(-0.88, 0.46, -0.32), Vector3(1.36, 0.96, 1.28), 5 ],
			[ Vector3(-0.24, 0.62, -0.12), Vector3(1.52, 1.18, 1.42), 0 ],
			[ Vector3(0.46, 0.58, 0.18), Vector3(1.46, 1.12, 1.36), 6 ],
			[ Vector3(0.86, 0.44, 0.56), Vector3(1.28, 0.88, 1.24), 3 ],
			[ Vector3(-0.42, 0.40, 0.48), Vector3(1.32, 0.84, 1.26), 2 ],
			[ Vector3(0.16, 0.38, -0.54), Vector3(1.26, 0.82, 1.18), 3 ],
			[ Vector3(-0.14, 0.94, 0.04), Vector3(1.36, 1.04, 1.26), 1 ],
			[ Vector3(0.38, 0.86, 0.28), Vector3(1.22, 0.96, 1.18), 4 ],
		]
	else:
		billow_pts = [
			[ Vector3(-1.26, 0.38, -0.10), Vector3(1.24, 0.82, 1.12), 3 ],
			[ Vector3(-0.72, 0.54, 0.16), Vector3(1.44, 1.04, 1.28), 6 ],
			[ Vector3(-0.12, 0.60, -0.14), Vector3(1.48, 1.12, 1.32), 0 ],
			[ Vector3(0.52, 0.64, 0.10), Vector3(1.52, 1.16, 1.34), 5 ],
			[ Vector3(1.12, 0.48, -0.08), Vector3(1.34, 0.94, 1.18), 2 ],
			[ Vector3(-0.38, 0.34, -0.46), Vector3(1.18, 0.74, 1.04), 3 ],
			[ Vector3(0.28, 0.36, 0.48), Vector3(1.26, 0.78, 1.10), 0 ],
			[ Vector3(-0.48, 0.86, 0.04), Vector3(1.28, 0.94, 1.14), 1 ],
			[ Vector3(0.36, 0.90, -0.02), Vector3(1.34, 0.98, 1.18), 4 ],
		]

	for bi in range(billow_pts.size()):
		var b_entry: Array = billow_pts[bi]
		var bp: Vector3 = b_entry[0]
		var bsc: Vector3 = b_entry[1]
		var li: int = int(b_entry[2])
		if bi < 6:
			# Grounded crooked woody stems anchoring the thicket base into the soil (-0.22m)
			var stem_base := Vector3(bp.x * 0.78, -0.22, bp.z * 0.72)
			_cyl_between(st_stems, Transform3D.IDENTITY, stem_base, bp + Vector3(0.0, 0.08, 0.0), 0.085, 0.038, 5)
		var lmesh: ArrayMesh = lobes[posmod(li + bi, lobes.size())]
		var rot := Basis.from_euler(Vector3(0.05 * sin(float(bi) + seed_v), float(bi) * 1.19 + seed_v, -0.05 * cos(float(bi)))).scaled(bsc)
		st_fol.append_from(lmesh, 0, Transform3D(rot, bp))

	# Outer feathery leafy sprays & bramble fronds emerging along the hedge flanks and crest
	var q_tl := Rect2(0.01, 0.01, 0.48, 0.48)
	var q_tr := Rect2(0.51, 0.01, 0.48, 0.48)
	for fi in range(12):
		var u_f := (float(fi) / 11.0) * 2.0 - 1.0
		var fx := u_f * 1.32 + sin(float(fi) * 2.1 + seed_v) * 0.18
		var fz := cos(float(fi) * 1.7 + seed_v) * 0.46
		var fy := 0.04 + (1.0 - absf(u_f) * 0.45) * 0.24
		var yaw_f := float(fi) * 1.13 + seed_v
		var uv_f := q_tl if (fi % 2 == 0) else q_tr
		var sc_f := 0.88 + fmod(float(fi) * 0.23, 0.34)
		var xf_f := Transform3D(Basis(Vector3.UP, yaw_f).scaled(Vector3(sc_f * 1.15, sc_f * 0.98, sc_f * 1.15)), Vector3(fx, fy, fz))
		append_card(st_fronds, xf_f, 1.18, 1.05, uv_f, Vector3(0.0, 0.92, 0.38), -0.06)
		append_card(st_fronds, xf_f * Transform3D(Basis(Vector3.UP, PI * 0.48), Vector3.ZERO), 1.14, 1.02, uv_f, Vector3(0.0, 0.92, 0.38), -0.06)

	st_stems.deindex()
	st_stems.generate_normals()
	st_stems.index()
	st_fronds.generate_tangents()
	var out_dict := {
		"stems": st_stems.commit(),
		"foliage": _bake_cohesive_crown_normals(st_fol, Vector3(0.0, 0.15, 0.0), 0.65),
		"fronds": st_fronds.commit(),
	}
	_bush_proto_cache[ck] = out_dict
	return out_dict

## Clean isolated MultiMesh prototype for a single mushroom kind (prevents any cross-cluster stretched triangles!)
func get_mushroom_proto(kind: String) -> Dictionary:
	if _mush_proto_cache.has(kind):
		return _mush_proto_cache[kind] as Dictionary
	var st_stem := SurfaceTool.new(); st_stem.begin(Mesh.PRIMITIVE_TRIANGLES)
	var st_cap := SurfaceTool.new(); st_cap.begin(Mesh.PRIMITIVE_TRIANGLES)
	var st_dots := SurfaceTool.new(); st_dots.begin(Mesh.PRIMITIVE_TRIANGLES)
	var has_stem := false
	var has_cap := false
	var has_dots := false
	match kind:
		"amanita":
			has_stem = true; has_cap = true; has_dots = true
			_cyl_between(st_stem, Transform3D.IDENTITY, Vector3(0, -0.015, 0), Vector3(0, 0.15, 0), 0.026, 0.018, 5)
			var cap := SphereMesh.new(); cap.radius = 0.078; cap.height = 0.075; cap.is_hemisphere = true; cap.radial_segments = 7; cap.rings = 2
			st_cap.append_from(cap, 0, Transform3D(Basis.IDENTITY.scaled(Vector3(1.0, 0.75, 1.0)), Vector3(0, 0.145, 0)))
			var dot := SphereMesh.new(); dot.radius = 0.012; dot.height = 0.012; dot.radial_segments = 4; dot.rings = 1
			for d in range(5):
				var da := float(d) * TAU / 5.0
				var dr := 0.03 + float(d % 2) * 0.02
				st_dots.append_from(dot, 0, Transform3D(Basis.IDENTITY, Vector3(cos(da) * dr, 0.197 - dr * 0.45, sin(da) * dr)))
		"porcini":
			has_stem = true; has_cap = true
			_cyl_between(st_stem, Transform3D.IDENTITY, Vector3(0, -0.015, 0), Vector3(0, 0.09, 0), 0.045, 0.032, 5)
			var cap2 := SphereMesh.new(); cap2.radius = 0.08; cap2.height = 0.07; cap2.is_hemisphere = true; cap2.radial_segments = 7; cap2.rings = 2
			st_cap.append_from(cap2, 0, Transform3D(Basis.IDENTITY, Vector3(0, 0.085, 0)))
		"chanterelle":
			has_cap = true
			var fun := CylinderMesh.new(); fun.top_radius = 0.06; fun.bottom_radius = 0.012; fun.height = 0.088; fun.radial_segments = 6; fun.rings = 1
			st_cap.append_from(fun, 0, Transform3D(Basis.IDENTITY, Vector3(0, 0.04, 0)))
		"parasol":
			has_stem = true; has_cap = true
			_cyl_between(st_stem, Transform3D.IDENTITY, Vector3(0, -0.015, 0), Vector3(0, 0.28, 0), 0.016, 0.011, 5)
			var cap3 := CylinderMesh.new(); cap3.top_radius = 0.02; cap3.bottom_radius = 0.115; cap3.height = 0.045; cap3.radial_segments = 7; cap3.rings = 1
			st_cap.append_from(cap3, 0, Transform3D(Basis.IDENTITY, Vector3(0, 0.29, 0)))
		"puffball":
			has_stem = true
			var pb := SphereMesh.new(); pb.radius = 0.048; pb.height = 0.07; pb.radial_segments = 6; pb.rings = 2
			st_stem.append_from(pb, 0, Transform3D(Basis.IDENTITY, Vector3(0, 0.03, 0)))
		_:
			has_stem = true; has_cap = true
			_cyl_between(st_stem, Transform3D.IDENTITY, Vector3(0, -0.015, 0), Vector3(0, 0.08, 0), 0.014, 0.010, 5)
			var cap4 := SphereMesh.new(); cap4.radius = 0.042; cap4.height = 0.04; cap4.is_hemisphere = true; cap4.radial_segments = 6; cap4.rings = 2
			st_cap.append_from(cap4, 0, Transform3D(Basis.IDENTITY, Vector3(0, 0.078, 0)))
	var out := {}
	if has_stem:
		st_stem.deindex(); st_stem.generate_normals()
		out["stem"] = st_stem.commit()
	if has_cap:
		st_cap.deindex(); st_cap.generate_normals()
		out["cap"] = st_cap.commit()
	if has_dots:
		st_dots.deindex(); st_dots.generate_normals()
		out["dots"] = st_dots.commit()
	_mush_proto_cache[kind] = out
	return out

## Fallen forest twigs/branches & root segments for woodland floor & riverbank microdetail (Pasos 4, 6, 9)
func get_twig_debris_proto(variant: String = "twig") -> ArrayMesh:
	if _debris_proto_cache.has(variant):
		return _debris_proto_cache[variant] as ArrayMesh
	var st := SurfaceTool.new(); st.begin(Mesh.PRIMITIVE_TRIANGLES)
	if variant == "root":
		# Arched exposed tree root snaking out of bank or trailside soil
		_cyl_between(st, Transform3D.IDENTITY, Vector3(-0.62, -0.06, -0.04), Vector3(-0.14, 0.09, 0.03), 0.085, 0.062, 6)
		_cyl_between(st, Transform3D.IDENTITY, Vector3(-0.14, 0.09, 0.03), Vector3(0.45, 0.02, -0.05), 0.062, 0.038, 6)
		_cyl_between(st, Transform3D.IDENTITY, Vector3(0.45, 0.02, -0.05), Vector3(0.84, -0.07, 0.08), 0.038, 0.018, 5)
		_cyl_between(st, Transform3D.IDENTITY, Vector3(0.08, 0.06, 0.01), Vector3(0.42, -0.04, 0.34), 0.042, 0.016, 5)
	else:
		# Small fallen forked branch/twig cluster resting on forest floor
		_cyl_between(st, Transform3D.IDENTITY, Vector3(-0.34, 0.018, 0.0), Vector3(0.32, 0.024, 0.04), 0.024, 0.013, 5)
		_cyl_between(st, Transform3D.IDENTITY, Vector3(0.04, 0.022, 0.02), Vector3(0.28, 0.018, -0.18), 0.014, 0.007, 4)
		_cyl_between(st, Transform3D.IDENTITY, Vector3(-0.18, 0.016, 0.14), Vector3(0.12, 0.014, 0.22), 0.012, 0.008, 4)
	st.deindex()
	st.generate_normals()
	var m := st.commit()
	_debris_proto_cache[variant] = m
	return m

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
	var tint_r := Color(0.58, 0.68, 0.46)
	if not with_cattails and mat_reed is ShaderMaterial:
		var trc: Variant = (mat_reed as ShaderMaterial).get_shader_parameter("tint_col")
		if trc is Color:
			tint_r = (trc as Color).lightened(0.18)
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

# ------------------------------------------------------------------------------
# Dedicated Columnar Basalt, Weathered Observatory Ruins, Faceted Crystals &
# Windswept Krummholz Pines (Camp 04 Option A — ZERO impact on forest/beach/cove!)
# ------------------------------------------------------------------------------

## 6 angular interlocking volcanic basalt column clusters (flat-faceted strata, zero rounded blobs)
func get_basalt_column_variants() -> Array:
	if _rock_cache.has("basalt_column"):
		return _rock_cache["basalt_column"]
	var variants: Array[ArrayMesh] = []
	for v_idx in range(6):
		var st := SurfaceTool.new()
		st.begin(Mesh.PRIMITIVE_TRIANGLES)
		var seed_p := float(v_idx) * 3.17 + 1.9
		var col_count := 4 + (v_idx % 3)
		for ci in range(col_count):
			var sides := 6 if (ci + v_idx) % 3 != 0 else 5
			var rad := (0.42 if ci == 0 else (0.24 + fmod(absf(sin(seed_p + float(ci) * 1.7)), 0.14)))
			var h_top := (0.52 if ci == 0 else (0.10 + fmod(absf(cos(seed_p * 1.3 + float(ci) * 2.1)), 0.40)))
			var h_bot := -0.58
			var ang_off := float(ci) * (TAU / float(max(1, col_count - 1))) + seed_p * 0.4
			var dist_r := 0.0 if ci == 0 else (0.30 + fmod(absf(sin(seed_p * 2.1 + float(ci))), 0.18))
			var cx := cos(ang_off) * dist_r
			var cz := sin(ang_off) * dist_r
			var tilt_x := sin(seed_p + float(ci) * 1.5) * 0.06
			var tilt_z := cos(seed_p - float(ci) * 1.2) * 0.06
			var ring_b: Array[Vector3] = []
			var ring_m: Array[Vector3] = []
			var ring_t: Array[Vector3] = []
			var ring_c: Array[Vector3] = []
			var h_mid := lerpf(h_bot, h_top, 0.56)
			for si in range(sides):
				var a := float(si) * TAU / float(sides) + seed_p * 0.5 + float(ci) * 0.35
				var r_var := rad * (0.86 + 0.24 * hash2(Vector2(float(si) + seed_p, float(ci) * 3.1)))
				var px := cos(a) * r_var
				var pz := sin(a) * r_var
				var top_dip := sin(a * 2.0 + seed_p + float(ci)) * 0.055
				ring_b.append(Vector3(cx + px * 1.14, h_bot, cz + pz * 1.14))
				ring_m.append(Vector3(cx + px * 1.04 + tilt_x * 0.4, h_mid + top_dip * 0.4, cz + pz * 1.04 + tilt_z * 0.4))
				ring_t.append(Vector3(cx + px * 0.96 + tilt_x, h_top - 0.045 + top_dip, cz + pz * 0.96 + tilt_z))
				ring_c.append(Vector3(cx + px * 0.82 + tilt_x, h_top + top_dip * 0.9, cz + pz * 0.82 + tilt_z))
			var col_bot := Color(0.56, 0.59, 0.64, 1.0)
			var col_mid := Color(0.78, 0.81, 0.85, 1.0)
			var col_top := Color(0.96, 0.98, 1.00, 1.0)
			var center_top := Vector3(cx + tilt_x, h_top + 0.015, cz + tilt_z)
			for si in range(sides):
				var sn := (si + 1) % sides
				var u0 := float(si) / float(sides)
				var u1 := float(si + 1) / float(sides)
				# Lower shaft quad
				st.set_color(col_bot); st.set_uv(Vector2(u0, 0.0)); st.add_vertex(ring_b[si])
				st.set_color(col_bot); st.set_uv(Vector2(u1, 0.0)); st.add_vertex(ring_b[sn])
				st.set_color(col_mid); st.set_uv(Vector2(u1, 0.5)); st.add_vertex(ring_m[sn])
				st.set_color(col_bot); st.set_uv(Vector2(u0, 0.0)); st.add_vertex(ring_b[si])
				st.set_color(col_mid); st.set_uv(Vector2(u1, 0.5)); st.add_vertex(ring_m[sn])
				st.set_color(col_mid); st.set_uv(Vector2(u0, 0.5)); st.add_vertex(ring_m[si])
				# Upper shaft quad
				st.set_color(col_mid); st.set_uv(Vector2(u0, 0.5)); st.add_vertex(ring_m[si])
				st.set_color(col_mid); st.set_uv(Vector2(u1, 0.5)); st.add_vertex(ring_m[sn])
				st.set_color(col_top); st.set_uv(Vector2(u1, 0.92)); st.add_vertex(ring_t[sn])
				st.set_color(col_mid); st.set_uv(Vector2(u0, 0.5)); st.add_vertex(ring_m[si])
				st.set_color(col_top); st.set_uv(Vector2(u1, 0.92)); st.add_vertex(ring_t[sn])
				st.set_color(col_top); st.set_uv(Vector2(u0, 0.92)); st.add_vertex(ring_t[si])
				# Beveled fracture rim quad
				st.set_color(col_top); st.set_uv(Vector2(u0, 0.92)); st.add_vertex(ring_t[si])
				st.set_color(col_top); st.set_uv(Vector2(u1, 0.92)); st.add_vertex(ring_t[sn])
				st.set_color(col_top); st.set_uv(Vector2(u1, 1.0)); st.add_vertex(ring_c[sn])
				st.set_color(col_top); st.set_uv(Vector2(u0, 0.92)); st.add_vertex(ring_t[si])
				st.set_color(col_top); st.set_uv(Vector2(u1, 1.0)); st.add_vertex(ring_c[sn])
				st.set_color(col_top); st.set_uv(Vector2(u0, 1.0)); st.add_vertex(ring_c[si])
				# Flat broken top cap triangle
				st.set_color(col_top); st.set_uv(Vector2(0.5, 0.5)); st.add_vertex(center_top)
				st.set_color(col_top); st.set_uv(Vector2(u0, 1.0)); st.add_vertex(ring_c[si])
				st.set_color(col_top); st.set_uv(Vector2(u1, 1.0)); st.add_vertex(ring_c[sn])
		st.deindex()
		st.generate_normals()
		variants.append(st.commit())
	_rock_cache["basalt_column"] = variants
	return variants

## Chamfered & subtly weathered stone ashlar block (eliminates razor-sharp un-beveled BoxMesh silhouettes!)
func build_beveled_ruin_block(size: Vector3, bevel: float = 0.055, seed_v: float = 0.0, chipped_top: bool = true) -> ArrayMesh:
	var hx := maxf(0.06, size.x * 0.5)
	var hy := maxf(0.05, size.y * 0.5)
	var hz := maxf(0.06, size.z * 0.5)
	var bv := minf(bevel, minf(hx, minf(hy, hz)) * 0.42)
	var ix := hx - bv
	var iz := hz - bv
	# 8-vertex chamfered footprint profile in XZ
	var profile := [
		Vector2(-ix, -hz), Vector2(ix, -hz), Vector2(hx, -iz), Vector2(hx, iz),
		Vector2(ix, hz), Vector2(-ix, hz), Vector2(-hx, iz), Vector2(-hx, -iz),
	]
	var y_levels := [-hy, -hy + bv, hy - bv, hy]
	var scales := [0.97, 1.0, 1.0, 0.95]
	var rings: Array = []
	for li in range(4):
		var ring: Array[Vector3] = []
		var sc: float = scales[li]
		var yv: float = y_levels[li]
		for pi in range(8):
			var p2: Vector2 = profile[pi]
			var jitter := (hash2(Vector2(float(pi) + seed_v * 3.1, float(li) * 2.7)) - 0.5) * bv * 0.55
			var chip_y := 0.0
			if chipped_top and li >= 2:
				chip_y = -maxf(0.0, sin(float(pi) * 1.9 + seed_v * 2.3)) * minf(bv * 1.35, size.y * 0.12)
			ring.append(Vector3(p2.x * sc + jitter, yv + chip_y, p2.y * sc + jitter))
		rings.append(ring)

	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	for li in range(3):
		var r0: Array = rings[li]
		var r1: Array = rings[li + 1]
		var v0 := float(li) / 3.0
		var v1 := float(li + 1) / 3.0
		for pi in range(8):
			var pn := (pi + 1) % 8
			var u0 := float(pi) / 8.0
			var u1 := float(pi + 1) / 8.0
			st.set_uv(Vector2(u0, v0)); st.add_vertex(r0[pi])
			st.set_uv(Vector2(u1, v0)); st.add_vertex(r0[pn])
			st.set_uv(Vector2(u1, v1)); st.add_vertex(r1[pn])
			st.set_uv(Vector2(u0, v0)); st.add_vertex(r0[pi])
			st.set_uv(Vector2(u1, v1)); st.add_vertex(r1[pn])
			st.set_uv(Vector2(u0, v1)); st.add_vertex(r1[pi])
	# Top & bottom caps
	var top_r: Array = rings[3]
	var bot_r: Array = rings[0]
	var top_c := Vector3(0.0, hy - (bv * 0.15 if chipped_top else 0.0), 0.0)
	var bot_c := Vector3(0.0, -hy, 0.0)
	for pi in range(8):
		var pn := (pi + 1) % 8
		st.set_uv(Vector2(0.5, 0.5)); st.add_vertex(top_c)
		st.set_uv(Vector2(0.5 + top_r[pi].x / maxf(0.1, size.x), 0.5 + top_r[pi].z / maxf(0.1, size.z))); st.add_vertex(top_r[pi])
		st.set_uv(Vector2(0.5 + top_r[pn].x / maxf(0.1, size.x), 0.5 + top_r[pn].z / maxf(0.1, size.z))); st.add_vertex(top_r[pn])
		st.set_uv(Vector2(0.5, 0.5)); st.add_vertex(bot_c)
		st.set_uv(Vector2(0.5 + bot_r[pn].x / maxf(0.1, size.x), 0.5 + bot_r[pn].z / maxf(0.1, size.z))); st.add_vertex(bot_r[pn])
		st.set_uv(Vector2(0.5 + bot_r[pi].x / maxf(0.1, size.x), 0.5 + bot_r[pi].z / maxf(0.1, size.z))); st.add_vertex(bot_r[pi])
	st.deindex()
	st.generate_normals()
	return st.commit()

## Canonical fluted limestone/ashlar observatory column (matching ObservatoryApproach striated columns!)
func build_fluted_column(radius: float, height: float, broken_top: bool = false, flutes: int = 12, seed_v: float = 0.0) -> ArrayMesh:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var segs := flutes * 2
	var stacks := 7
	var rings: Array = []
	for si in range(stacks + 1):
		var t := float(si) / float(stacks)
		var ring: Array[Vector3] = []
		var entasis := lerpf(1.06, 0.88, t) + sin(t * PI) * 0.04
		for ai in range(segs):
			var a := float(ai) * TAU / float(segs)
			var is_groove := (ai % 2) == 1
			var flute_r := (0.91 if is_groove else 1.0) if (t > 0.08 and t < 0.92) else 1.05
			var r := radius * entasis * flute_r
			var y_h := t * height
			if broken_top and si == stacks:
				y_h += (cos(a + seed_v) * 0.24 + sin(a * 3.0 - seed_v) * 0.08) * radius * 1.4
			elif broken_top and si == stacks - 1:
				y_h += cos(a + seed_v) * 0.08 * radius
			ring.append(Vector3(cos(a) * r, y_h, sin(a) * r))
		rings.append(ring)

	for si in range(stacks):
		var r0: Array = rings[si]
		var r1: Array = rings[si + 1]
		var v0 := float(si) / float(stacks) * height * 0.5
		var v1 := float(si + 1) / float(stacks) * height * 0.5
		for ai in range(segs):
			var an := (ai + 1) % segs
			var u0 := float(ai) / float(segs) * 2.0
			var u1 := float(ai + 1) / float(segs) * 2.0
			st.set_uv(Vector2(u0, v0)); st.add_vertex(r0[ai])
			st.set_uv(Vector2(u1, v0)); st.add_vertex(r0[an])
			st.set_uv(Vector2(u1, v1)); st.add_vertex(r1[an])
			st.set_uv(Vector2(u0, v0)); st.add_vertex(r0[ai])
			st.set_uv(Vector2(u1, v1)); st.add_vertex(r1[an])
			st.set_uv(Vector2(u0, v1)); st.add_vertex(r1[ai])
	var top_r: Array = rings[stacks]
	var top_c := Vector3(0.0, height + (0.04 if not broken_top else -0.02), 0.0)
	for ai in range(segs):
		var an := (ai + 1) % segs
		st.set_uv(Vector2(0.5, 0.5)); st.add_vertex(top_c)
		st.set_uv(Vector2(0.5 + cos(float(ai) * TAU / float(segs)) * 0.4, 0.5 + sin(float(ai) * TAU / float(segs)) * 0.4)); st.add_vertex(top_r[ai])
		st.set_uv(Vector2(0.5 + cos(float(an) * TAU / float(segs)) * 0.4, 0.5 + sin(float(an) * TAU / float(segs)) * 0.4)); st.add_vertex(top_r[an])
	st.deindex()
	st.generate_normals()
	return st.commit()

## Sharp chiseled hexagonal quartz crystal spire with asymmetric pyramidal apex & root-to-tip vertex depth color
func build_faceted_crystal_mesh(height: float, radius: float, seed_v: float = 0.0) -> ArrayMesh:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var sides := 6
	var h_shoulder := height * (0.64 + fmod(absf(sin(seed_v * 1.9)), 0.14))
	var h_mid := height * 0.32
	var base_r: Array[Vector3] = []
	var mid_r: Array[Vector3] = []
	var top_r: Array[Vector3] = []
	for si in range(sides):
		var a := float(si) * TAU / float(sides) + seed_v * 0.6
		var asym := 0.82 + 0.34 * hash2(Vector2(float(si) + seed_v, seed_v * 2.1))
		var r0 := radius * asym * 1.08
		var r1 := radius * asym * 0.98
		var r2 := radius * asym * 0.80
		var sh_var := (hash2(Vector2(float(si) * 1.7, seed_v)) - 0.5) * height * 0.10
		base_r.append(Vector3(cos(a) * r0, 0.0, sin(a) * r0))
		mid_r.append(Vector3(cos(a) * r1, h_mid, sin(a) * r1))
		top_r.append(Vector3(cos(a) * r2, h_shoulder + sh_var, sin(a) * r2))
	var apex := Vector3(sin(seed_v * 2.3) * radius * 0.18, height, cos(seed_v * 1.7) * radius * 0.18)
	var c_root := Color(0.20, 0.42, 0.58, 1.0)
	var c_mid := Color(0.56, 0.84, 0.96, 1.0)
	var c_tip := Color(0.94, 0.99, 1.00, 1.0)
	for si in range(sides):
		var sn := (si + 1) % sides
		var u0 := float(si) / float(sides)
		var u1 := float(si + 1) / float(sides)
		st.set_color(c_root); st.set_uv(Vector2(u0, 0.0)); st.add_vertex(base_r[si])
		st.set_color(c_root); st.set_uv(Vector2(u1, 0.0)); st.add_vertex(base_r[sn])
		st.set_color(c_mid); st.set_uv(Vector2(u1, 0.35)); st.add_vertex(mid_r[sn])
		st.set_color(c_root); st.set_uv(Vector2(u0, 0.0)); st.add_vertex(base_r[si])
		st.set_color(c_mid); st.set_uv(Vector2(u1, 0.35)); st.add_vertex(mid_r[sn])
		st.set_color(c_mid); st.set_uv(Vector2(u0, 0.35)); st.add_vertex(mid_r[si])
		st.set_color(c_mid); st.set_uv(Vector2(u0, 0.35)); st.add_vertex(mid_r[si])
		st.set_color(c_mid); st.set_uv(Vector2(u1, 0.35)); st.add_vertex(mid_r[sn])
		st.set_color(c_tip); st.set_uv(Vector2(u1, 0.72)); st.add_vertex(top_r[sn])
		st.set_color(c_mid); st.set_uv(Vector2(u0, 0.35)); st.add_vertex(mid_r[si])
		st.set_color(c_tip); st.set_uv(Vector2(u1, 0.72)); st.add_vertex(top_r[sn])
		st.set_color(c_tip); st.set_uv(Vector2(u0, 0.72)); st.add_vertex(top_r[si])
		# Chiseled pyramidal crystal apex
		st.set_color(c_tip); st.set_uv(Vector2(u0, 0.72)); st.add_vertex(top_r[si])
		st.set_color(c_tip); st.set_uv(Vector2(u1, 0.72)); st.add_vertex(top_r[sn])
		st.set_color(c_tip); st.set_uv(Vector2(0.5, 1.0)); st.add_vertex(apex)
	st.deindex()
	st.generate_normals()
	return st.commit()

## Gnarled wind-sculpted coastal krummholz pine leaning away from ocean gales with exposed roots & wind-swept needle shelves
func build_windswept_pine(
	parent: Node3D,
	pos: Vector3,
	scale_f: float,
	lean_dir: Vector2,
	mat_trunk: Material,
	mat_leaves: Material,
	seed_v: float
) -> Node3D:
	var root := Node3D.new()
	root.name = "WindsweptPine"
	root.position = pos
	root.scale = Vector3.ONE * scale_f
	parent.add_child(root)

	var ld := lean_dir.normalized() if lean_dir.length_squared() > 0.001 else Vector2(-0.85, 0.52)
	var st_t := SurfaceTool.new(); st_t.begin(Mesh.PRIMITIVE_TRIANGLES)
	var st_c := SurfaceTool.new(); st_c.begin(Mesh.PRIMITIVE_TRIANGLES)
	var lobes := get_foliage_lobe_variants()

	# Splayed gripping coastal rock roots
	for ri in range(4):
		var ra := float(ri) * (TAU / 4.0) + seed_v
		var r_end := Vector3(cos(ra) * 0.92, -0.34, sin(ra) * 0.92)
		var r_mid := Vector3(cos(ra) * 0.42, 0.10, sin(ra) * 0.42)
		_cyl_between(st_t, Transform3D.IDENTITY, Vector3(0.0, 0.32, 0.0), r_mid, 0.16, 0.11, 6)
		_cyl_between(st_t, Transform3D.IDENTITY, r_mid, r_end, 0.11, 0.045, 5)

	# Crooked wind-bent trunk segments sweeping leeward
	var p0 := Vector3(0.0, -0.18, 0.0)
	var p1 := Vector3(ld.x * 0.35 + sin(seed_v) * 0.12, 1.25, ld.y * 0.35)
	var p2 := Vector3(ld.x * 1.15 - cos(seed_v) * 0.14, 2.55, ld.y * 1.15)
	var p3 := Vector3(ld.x * 2.15, 3.45, ld.y * 2.15)
	_cyl_between(st_t, Transform3D.IDENTITY, p0, p1, 0.28, 0.21, 7)
	_cyl_between(st_t, Transform3D.IDENTITY, p1, p2, 0.21, 0.14, 7)
	_cyl_between(st_t, Transform3D.IDENTITY, p2, p3, 0.14, 0.065, 6)

	# Swept lateral boughs & multi-tiered lush wind-sculpted coastal pine needle crowns
	var branch_specs := [
		[p1.lerp(p2, 0.48), Vector3(ld.x * 1.48 + ld.y * 0.88, 0.34, ld.y * 1.48 - ld.x * 0.88), Vector3(1.65, 0.88, 1.38)],
		[p2, Vector3(ld.x * 1.72 - ld.y * 0.92, 0.46, ld.y * 1.72 + ld.x * 0.92), Vector3(1.78, 0.94, 1.44)],
		[p2.lerp(p3, 0.50), Vector3(ld.x * 1.42 + ld.y * 0.48, 0.56, ld.y * 1.42 - ld.x * 0.48), Vector3(1.56, 0.86, 1.28)],
		[p3, Vector3(ld.x * 1.12, 0.44, ld.y * 1.12), Vector3(1.50, 0.82, 1.24)],
	]
	var yaw_wind := atan2(ld.x, ld.y)
	for bi in range(branch_specs.size()):
		var bs: Array = branch_specs[bi]
		var b_start: Vector3 = bs[0]
		var b_off: Vector3 = bs[1]
		var pad_sc: Vector3 = bs[2]
		var b_end := b_start + b_off
		_cyl_between(st_t, Transform3D.IDENTITY, b_start, b_end, 0.085 - float(bi) * 0.012, 0.028, 5)
		var lobe_m: ArrayMesh = lobes[posmod(bi + int(round(seed_v * 3.0)), lobes.size())]
		var pad_b := Basis.from_euler(Vector3(0.08, yaw_wind + float(bi) * 0.55, -0.10)).scaled_local(pad_sc)
		st_c.append_from(lobe_m, 0, Transform3D(pad_b, b_end + Vector3(0.0, 0.24, 0.0)))
		var sub_b := Basis.from_euler(Vector3(-0.06, yaw_wind - float(bi) * 0.8, 0.08)).scaled_local(pad_sc * Vector3(0.76, 0.88, 0.78))
		st_c.append_from(lobe_m, 0, Transform3D(sub_b, b_end + Vector3(ld.x * 0.52, 0.42, ld.y * 0.52)))
		var crest_b := Basis.from_euler(Vector3(0.04, yaw_wind + float(bi) * 1.2, 0.05)).scaled_local(pad_sc * Vector3(0.58, 0.76, 0.60))
		st_c.append_from(lobe_m, 0, Transform3D(crest_b, b_end + Vector3(ld.x * 0.22, 0.62, ld.y * 0.22)))

	st_t.deindex()
	st_t.generate_normals()
	var t_mi := MeshInstance3D.new()
	t_mi.name = "PineTrunk"
	t_mi.mesh = st_t.commit()
	t_mi.material_override = mat_trunk
	root.add_child(t_mi)

	var c_mi := MeshInstance3D.new()
	c_mi.name = "PineCanopy"
	c_mi.mesh = _bake_cohesive_crown_normals(st_c, p2 + Vector3(ld.x * 1.1, 0.65, ld.y * 1.1), 0.70)
	c_mi.material_override = mat_leaves
	root.add_child(c_mi)
	return root

## Single-card hanging cliff ivy drape prototype for MultiMesh batching over ruin walls & cliffs
func get_hanging_ivy_proto(uv_rect: Rect2, width: float = 1.15, length: float = 1.35) -> ArrayMesh:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	append_card(st, Transform3D.IDENTITY, width, length, uv_rect, Vector3(0.0, 0.45, 0.88), -length)
	st.generate_tangents()
	return st.commit()
