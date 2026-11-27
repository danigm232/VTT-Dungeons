class_name CampPropFactory
extends RefCounted

## Reusable high-detail medieval camp prop factory.
## Produces organic bedrolls, weathered leather/canvas backpacks, biome-specific
## canvas shelters (never enclosed rigid cabins), hearth equipment, natural log/stone
## seats, grounded personal kits, and day/night-aware portable lanterns.

const MatKit = preload("res://scripts/camp_material_kit.gd")
const EnvKit = preload("res://scripts/camp_environment_kit.gd")

static var _prop_ao_tex: Texture2D
static var _prop_ao_mats: Dictionary = {}

static func _add_prop_contact_ao(parent: Node3D, node_name: String, pos: Vector3, size_xz: Vector2, alpha: float = 0.34) -> void:
	var key := int(round(clampf(alpha, 0.12, 0.65) * 50.0))
	var mat: StandardMaterial3D = _prop_ao_mats.get(key) as StandardMaterial3D
	if mat == null:
		if _prop_ao_tex == null:
			var sz := 64
			var img := Image.create(sz, sz, false, Image.FORMAT_RGBA8)
			for py in range(sz):
				var vv := (float(py) + 0.5) / float(sz) - 0.5
				for px in range(sz):
					var uu := (float(px) + 0.5) / float(sz) - 0.5
					var d := sqrt(uu * uu + vv * vv) / 0.45
					var a := pow(clampf(1.0 - d, 0.0, 1.0), 1.85)
					img.set_pixel(px, py, Color(0.02, 0.03, 0.035, a))
			_prop_ao_tex = ImageTexture.create_from_image(img)
		mat = StandardMaterial3D.new()
		mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		mat.albedo_texture = _prop_ao_tex
		mat.albedo_color = Color(1.0, 1.0, 1.0, float(key) / 50.0)
		mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		mat.depth_draw_mode = BaseMaterial3D.DEPTH_DRAW_DISABLED
		mat.render_priority = 1
		_prop_ao_mats[key] = mat
	var mi := MeshInstance3D.new()
	mi.name = node_name
	var pm := PlaneMesh.new()
	pm.size = size_xz
	mi.mesh = pm
	mi.material_override = mat
	mi.position = pos
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parent.add_child(mi)

static func _make_wrinkled_grid_mesh(
	size_x: float,
	size_z: float,
	nx: int,
	nz: int,
	height_fn: Callable,
	double_face_thickness: float = 0.0
) -> ArrayMesh:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)

	var verts: Array = []
	for iz in range(nz + 1):
		var v := float(iz) / float(nz)
		var row_arr: Array[Vector3] = []
		for ix in range(nx + 1):
			var u := float(ix) / float(nx)
			var px := (u - 0.5) * size_x
			var pz := (v - 0.5) * size_z
			var py := float(height_fn.call(u, v, px, pz))
			row_arr.append(Vector3(px, py, pz))
		verts.append(row_arr)

	for iz in range(nz):
		for ix in range(nx):
			var u0 := float(ix) / float(nx); var u1 := float(ix + 1) / float(nx)
			var v0 := float(iz) / float(nz); var v1 := float(iz + 1) / float(nz)
			var a: Vector3 = verts[iz][ix]
			var b: Vector3 = verts[iz][ix + 1]
			var c: Vector3 = verts[iz + 1][ix + 1]
			var d: Vector3 = verts[iz + 1][ix]

			st.set_uv(Vector2(u0, v0)); st.add_vertex(a)
			st.set_uv(Vector2(u1, v0)); st.add_vertex(b)
			st.set_uv(Vector2(u1, v1)); st.add_vertex(c)

			st.set_uv(Vector2(u0, v0)); st.add_vertex(a)
			st.set_uv(Vector2(u1, v1)); st.add_vertex(c)
			st.set_uv(Vector2(u0, v1)); st.add_vertex(d)

	if double_face_thickness > 0.001:
		var t_vec := Vector3(0.0, -double_face_thickness, 0.0)
		for ix in range(nx):
			var a_t: Vector3 = verts[0][ix]; var b_t: Vector3 = verts[0][ix + 1]
			var c_b: Vector3 = b_t + t_vec; var d_b: Vector3 = a_t + t_vec
			st.set_uv(Vector2(0, 0)); st.add_vertex(a_t); st.add_vertex(d_b); st.add_vertex(c_b)
			st.add_vertex(a_t); st.add_vertex(c_b); st.add_vertex(b_t)
			var e_t: Vector3 = verts[nz][ix]; var f_t: Vector3 = verts[nz][ix + 1]
			st.add_vertex(e_t); st.add_vertex(f_t); st.add_vertex(f_t + t_vec)
			st.add_vertex(e_t); st.add_vertex(f_t + t_vec); st.add_vertex(e_t + t_vec)
		for iz in range(nz):
			var l0: Vector3 = verts[iz][0]; var l1: Vector3 = verts[iz + 1][0]
			st.set_uv(Vector2(0, 0)); st.add_vertex(l0); st.add_vertex(l1); st.add_vertex(l1 + t_vec)
			st.add_vertex(l0); st.add_vertex(l1 + t_vec); st.add_vertex(l0 + t_vec)
			var r0: Vector3 = verts[iz][nx]; var r1: Vector3 = verts[iz + 1][nx]
			st.set_uv(Vector2(1, 0)); st.add_vertex(r0); st.add_vertex(r0 + t_vec); st.add_vertex(r1 + t_vec)
			st.add_vertex(r0); st.add_vertex(r1 + t_vec); st.add_vertex(r1)

	st.generate_normals()
	return st.commit()

## Sculpted non-rectangular tarp mesh with scalloped tension edges (Paso 11.9),
## radial corner tension folds (Paso 11.8), natural catenary sag (Paso 11.7) & 3D hem thickness.
static func _make_sculpted_tarp_mesh(
	nx: int,
	nz: int,
	point_fn: Callable,
	double_face_thickness: float = 0.016
) -> ArrayMesh:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var verts: Array = []
	for iz in range(nz + 1):
		var v := float(iz) / float(nz)
		var row_arr: Array[Vector3] = []
		for ix in range(nx + 1):
			var u := float(ix) / float(nx)
			row_arr.append(point_fn.call(u, v) as Vector3)
		verts.append(row_arr)
	for iz in range(nz):
		for ix in range(nx):
			var u0 := float(ix) / float(nx); var u1 := float(ix + 1) / float(nx)
			var v0 := float(iz) / float(nz); var v1 := float(iz + 1) / float(nz)
			var a: Vector3 = verts[iz][ix]
			var b: Vector3 = verts[iz][ix + 1]
			var c: Vector3 = verts[iz + 1][ix + 1]
			var d: Vector3 = verts[iz + 1][ix]
			st.set_uv(Vector2(u0, v0)); st.add_vertex(a)
			st.set_uv(Vector2(u1, v0)); st.add_vertex(b)
			st.set_uv(Vector2(u1, v1)); st.add_vertex(c)
			st.set_uv(Vector2(u0, v0)); st.add_vertex(a)
			st.set_uv(Vector2(u1, v1)); st.add_vertex(c)
			st.set_uv(Vector2(u0, v1)); st.add_vertex(d)
	if double_face_thickness > 0.001:
		var t_vec := Vector3(0.0, -double_face_thickness, 0.0)
		for ix in range(nx):
			var a_t: Vector3 = verts[0][ix]; var b_t: Vector3 = verts[0][ix + 1]
			st.set_uv(Vector2(float(ix) / float(nx), 0.0))
			st.add_vertex(a_t); st.add_vertex(a_t + t_vec); st.add_vertex(b_t + t_vec)
			st.add_vertex(a_t); st.add_vertex(b_t + t_vec); st.add_vertex(b_t)
			var e_t: Vector3 = verts[nz][ix]; var f_t: Vector3 = verts[nz][ix + 1]
			st.set_uv(Vector2(float(ix) / float(nx), 1.0))
			st.add_vertex(e_t); st.add_vertex(f_t); st.add_vertex(f_t + t_vec)
			st.add_vertex(e_t); st.add_vertex(f_t + t_vec); st.add_vertex(e_t + t_vec)
		for iz in range(nz):
			var l0: Vector3 = verts[iz][0]; var l1: Vector3 = verts[iz + 1][0]
			st.set_uv(Vector2(0.0, float(iz) / float(nz)))
			st.add_vertex(l0); st.add_vertex(l1); st.add_vertex(l1 + t_vec)
			st.add_vertex(l0); st.add_vertex(l1 + t_vec); st.add_vertex(l0 + t_vec)
			var r0: Vector3 = verts[iz][nx]; var r1: Vector3 = verts[iz + 1][nx]
			st.set_uv(Vector2(1.0, float(iz) / float(nz)))
			st.add_vertex(r0); st.add_vertex(r0 + t_vec); st.add_vertex(r1 + t_vec)
			st.add_vertex(r0); st.add_vertex(r1 + t_vec); st.add_vertex(r1)
	st.generate_normals()
	return st.commit()

static func create_bedroll(
	parent: Node3D,
	bed_id: String,
	owner: String,
	pos: Vector3,
	yaw: float
) -> Dictionary:
	var owner_wool := {
		"mike": Color("#3f5972"),
		"mia": Color("#945a3a"),
		"maria": Color("#754853"),
	}
	var base_wool: Color = owner_wool.get(owner, Color("#686153"))
	var mat_mat := MatKit.make_cloth_mat(Color("#544b3d"), true, true)
	var mat_blanket := MatKit.make_textured_mat("wool-v4.webp", base_wool, 0.91, "cloth", Vector3(1.8, 1.8, 1.8), false, true)
	mat_blanket.cull_mode = BaseMaterial3D.CULL_DISABLED
	var mat_lining := MatKit.make_cloth_mat(base_wool.lightened(0.24), true, true)
	var mat_leather := MatKit.make_leather_mat(Color("#443022"), true)
	var mat_brass := MatKit.make_bronze_mat(Color("#8c7346"))

	# Canon race proportions: Alto Elfo Mike (1.82 m) -> 2.12 m, Enana Mia (1.32 m) -> 1.66 m, Mediana Trinity (1.06 m) -> 1.42 m
	var width_scale := 1.06 if owner == "mia" else (0.90 if owner == "maria" else 1.02)
	var len_scale := 1.10 if owner == "mike" else (0.86 if owner == "mia" else 0.74)

	var root := Node3D.new()
	root.name = "Bedroll_" + bed_id
	root.position = pos
	root.rotation.y = yaw
	parent.add_child(root)
	_add_prop_contact_ao(root, "BedrollAO", Vector3(0.0, 0.004, 0.0), Vector2(1.08 * width_scale, 2.15 * len_scale), 0.34)

	# Groundsheet canvas mat adapted to character stature, flush with earth + 3D physical thickness (Paso 13.5-13.7)
	var ground_mesh := _make_wrinkled_grid_mesh(0.84 * width_scale, 1.92 * len_scale, 8, 12, func(u: float, v: float, _x: float, _z: float) -> float:
		var edge := minf(minf(u, 1.0 - u), minf(v, 1.0 - v))
		var rim := clampf(edge * 4.5, 0.0, 1.0)
		var border_roll := (1.0 - smoothstep(0.0, 0.14, minf(u, 1.0 - u))) * 0.012
		return 0.022 + rim * 0.024 + border_roll + sin(u * 9.0 + v * 7.0) * 0.008
	, 0.024)
	var gmat := MeshInstance3D.new()
	gmat.name = "BedGroundsheet"
	gmat.mesh = ground_mesh
	gmat.material_override = mat_mat
	root.add_child(gmat)

	# Quilted wool pad + blanket adapted to race proportions with 3D physical thickness & folds
	var prepared_node := Node3D.new()
	prepared_node.name = "BedPrepared"
	root.add_child(prepared_node)

	var quilt_mesh := _make_wrinkled_grid_mesh(0.76 * width_scale, 1.72 * len_scale, 9, 14, func(u: float, v: float, _x: float, _z: float) -> float:
		var crown := sin(clampf(u, 0.0, 1.0) * PI) * 0.062
		var length_drop := sin(clampf(v, 0.0, 1.0) * PI) * 0.034
		var fold_wave := sin(v * 15.0 + u * 6.0) * 0.015 + cos(u * 12.0 - v * 7.0) * 0.011
		var side_tuck := sin(u * PI * 2.0) * 0.008 * sin(v * PI)
		return 0.044 + crown + length_drop + fold_wave + side_tuck
	, 0.036)
	var blanket := MeshInstance3D.new()
	blanket.name = "BedBlanket"
	blanket.mesh = quilt_mesh
	blanket.material_override = mat_blanket
	blanket.position = Vector3(0.0, 0.0, 0.06 * len_scale)
	prepared_node.add_child(blanket)

	# Turned-down top collar cuff at head end (showing inner linen fold + 3D thickness)
	var fold_mesh := _make_wrinkled_grid_mesh(0.74 * width_scale, 0.36, 7, 5, func(u: float, v: float, _x: float, _z: float) -> float:
		var lip := sin(v * PI) * 0.022
		var crease := sin(u * 11.0 + v * 4.0) * 0.007
		return 0.078 + sin(u * PI) * 0.038 + lip + crease
	, 0.026)
	var fold := MeshInstance3D.new()
	fold.name = "BedCollarFold"
	fold.mesh = fold_mesh
	fold.material_override = mat_lining
	fold.position = Vector3(0.0, 0.01, -0.52 * len_scale)
	fold.rotation.y = 0.04
	prepared_node.add_child(fold)

	# Soft travel bolster pillow
	var pillow := MeshInstance3D.new()
	var pm := CylinderMesh.new()
	pm.top_radius = 0.115
	pm.bottom_radius = 0.125
	pm.height = 0.56 * width_scale
	pm.radial_segments = 10
	pillow.mesh = pm
	pillow.material_override = mat_lining
	pillow.position = Vector3(0.02, 0.09, -0.68 * len_scale)
	pillow.rotation = Vector3(0.0, 0.08, PI * 0.5)
	pillow.scale = Vector3(0.62, 1.0, 1.05)
	prepared_node.add_child(pillow)

	# Foot-end leather bedroll straps lying loosely open beside the blanket
	for sx in [-0.20 * width_scale, 0.20 * width_scale]:
		var strap := MeshInstance3D.new()
		var sm := CylinderMesh.new(); sm.top_radius = 0.045; sm.bottom_radius = 0.045; sm.height = 0.14; sm.radial_segments = 8
		strap.mesh = sm; strap.material_override = mat_leather
		strap.position = Vector3(sx, 0.042, 0.88 * len_scale)
		strap.rotation.z = PI * 0.5
		prepared_node.add_child(strap)

		var buckle := MeshInstance3D.new()
		var bm := BoxMesh.new(); bm.size = Vector3(0.035, 0.022, 0.045)
		buckle.mesh = bm; buckle.material_override = mat_brass
		buckle.position = Vector3(sx, 0.082, 0.88 * len_scale)
		prepared_node.add_child(buckle)

	# Rolled state bundle (hidden while prepared)
	var rolled_node := Node3D.new()
	rolled_node.name = "BedRolled"
	rolled_node.visible = false
	root.add_child(rolled_node)

	var roll_cyl := MeshInstance3D.new()
	var rcm := CylinderMesh.new(); rcm.top_radius = 0.17; rcm.bottom_radius = 0.18; rcm.height = 0.78 * width_scale; rcm.radial_segments = 10
	roll_cyl.mesh = rcm; roll_cyl.material_override = mat_blanket
	roll_cyl.position = Vector3(0.0, 0.17, -0.58 * len_scale)
	roll_cyl.rotation.z = PI * 0.5
	rolled_node.add_child(roll_cyl)

	for sx in [-0.22 * width_scale, 0.22 * width_scale]:
		var cinch := MeshInstance3D.new()
		var cmm := CylinderMesh.new(); cmm.top_radius = 0.182; cmm.bottom_radius = 0.182; cmm.height = 0.045; cmm.radial_segments = 10
		cinch.mesh = cmm; cinch.material_override = mat_leather
		cinch.position = Vector3(sx, 0.17, -0.58 * len_scale); cinch.rotation.z = PI * 0.5
		rolled_node.add_child(cinch)

	return {
		"root": root,
		"prepared": prepared_node,
		"rolled": rolled_node,
		"fold": fold,
		"fold_position": fold.position,
		"state": "prepared",
		"rest_local": Vector3(0.0, 0.06, -0.14 * len_scale),
		"rest": rest_anchor(root, Vector3(0.02, 0.187, pillow.position.z), 0.148,
			0.92 * len_scale, 0.84 * width_scale),
	}

static func rest_anchor(root: Node3D, head: Vector3, bedding_y: float, foot_z: float, width: float) -> Dictionary:
	return {
		"head": root.to_global(head),
		"bedding_y": root.to_global(Vector3(0.0, bedding_y, 0.0)).y,
		"forward": root.global_basis.z.normalized(),
		"available_length": foot_z - head.z,
		"available_width": width,
	}

static func set_bedroll_state(entry: Dictionary, new_state: String) -> void:
	if entry.is_empty():
		return
	var prep: Node3D = entry.get("prepared")
	var rolled: Node3D = entry.get("rolled")
	var fold: Node3D = entry.get("fold")
	entry["state"] = new_state
	if is_instance_valid(prep):
		prep.visible = new_state != "rolled"
	if is_instance_valid(rolled):
		rolled.visible = new_state == "rolled"
	if is_instance_valid(fold):
		var prepared_position: Vector3 = entry.get("fold_position", fold.position)
		fold.position = prepared_position + Vector3.BACK * (0.16 if new_state == "occupied" else 0.0)
		fold.rotation.y = 0.22 if new_state == "occupied" else 0.04

static func create_backpack(
	parent: Node3D,
	pack_id: String,
	owner: String,
	pos: Vector3,
	yaw: float
) -> Dictionary:
	var owner_canvas := {
		"mike": Color("#46505b"),
		"mia": Color("#6d5940"),
		"maria": Color("#474447"),
	}
	var mat_pack := MatKit.make_cloth_mat(owner_canvas.get(owner, Color("#5e5344")), true, true)
	var mat_leather := MatKit.make_leather_mat(Color("#4c3423"), true)
	var mat_trim := MatKit.make_cloth_mat(Color("#7c6f59"), true, true)
	var mat_brass := MatKit.make_bronze_mat(Color("#967b4b"))

	var root := Node3D.new()
	root.name = "Backpack_" + pack_id
	root.position = pos
	root.rotation = Vector3(-0.08, yaw, 0.04)
	# Scale pack by character race & build: Alto Elfo (tall), Enana (stout), Mediana (nimble compact)
	if owner == "mike":
		root.scale = Vector3(1.02, 1.12, 1.0)
	elif owner == "mia":
		root.scale = Vector3(1.14, 0.96, 1.08)
	else:
		root.scale = Vector3(0.80, 0.82, 0.82)
	parent.add_child(root)
	_add_prop_contact_ao(parent, "BackpackAO_" + pack_id, Vector3(pos.x, pos.y + 0.008, pos.z), Vector2(0.76 * root.scale.x, 0.62 * root.scale.z), 0.36)

	if owner == "mike":
		# Wizard leather scroll tube tied cleanly along pack flank
		var tube := MeshInstance3D.new()
		var tbm := CylinderMesh.new(); tbm.top_radius = 0.038; tbm.bottom_radius = 0.040; tbm.height = 0.42; tbm.radial_segments = 8
		tube.mesh = tbm; tube.material_override = mat_leather
		tube.position = Vector3(0.24, 0.25, -0.02); tube.rotation.z = -0.14
		root.add_child(tube)

	# Main tapered soft pack body (~0.42W x 0.46H x 0.28D)
	var body := MeshInstance3D.new()
	var bm := CylinderMesh.new()
	bm.top_radius = 0.165
	bm.bottom_radius = 0.195
	bm.height = 0.44
	bm.radial_segments = 10
	body.mesh = bm
	body.material_override = mat_pack
	body.position = Vector3(0.0, 0.21, 0.0)
	body.scale = Vector3(1.22, 1.0, 0.78)
	root.add_child(body)

	# Leather reinforced bottom boot
	var boot := MeshInstance3D.new()
	var btm := CylinderMesh.new(); btm.top_radius = 0.198; btm.bottom_radius = 0.205; btm.height = 0.11; btm.radial_segments = 10
	boot.mesh = btm; boot.material_override = mat_leather
	boot.position = Vector3(0.0, 0.055, 0.0); boot.scale = Vector3(1.23, 1.0, 0.79)
	root.add_child(boot)

	# Front & side sewn bellows pockets
	for side_x in [-0.23, 0.23]:
		var pocket := MeshInstance3D.new()
		var pkm := CylinderMesh.new(); pkm.top_radius = 0.065; pkm.bottom_radius = 0.072; pkm.height = 0.25; pkm.radial_segments = 8
		pocket.mesh = pkm; pocket.material_override = mat_pack
		pocket.position = Vector3(side_x, 0.18, 0.02); pocket.scale = Vector3(0.75, 1.0, 0.92)
		root.add_child(pocket)

	# Tightly rolled spare wool cloak strapped on top under flap
	var top_roll := MeshInstance3D.new()
	var trm := CylinderMesh.new(); trm.top_radius = 0.068; trm.bottom_radius = 0.072; trm.height = 0.36; trm.radial_segments = 8
	top_roll.mesh = trm; top_roll.material_override = mat_trim
	top_roll.position = Vector3(0.0, 0.47, -0.04); top_roll.rotation.z = PI * 0.5
	root.add_child(top_roll)

	# Rear curved shoulder harness straps resting down behind pack
	for sx in [-0.11, 0.11]:
		var strap := MeshInstance3D.new()
		var sm := BoxMesh.new(); sm.size = Vector3(0.048, 0.36, 0.022)
		strap.mesh = sm; strap.material_override = mat_leather
		strap.position = Vector3(sx, 0.22, -0.155)
		strap.rotation.x = 0.16
		root.add_child(strap)

	# Articulated leather hood flap (compatibly stored in chest_lids for toggle!)
	var pivot := Node3D.new()
	pivot.name = "ChestLidPivot"
	pivot.position = Vector3(0.0, 0.43, -0.11)
	root.add_child(pivot)

	var flap := MeshInstance3D.new()
	var flm := CylinderMesh.new(); flm.top_radius = 0.175; flm.bottom_radius = 0.19; flm.height = 0.16; flm.radial_segments = 10
	flap.mesh = flm; flap.material_override = mat_leather
	flap.position = Vector3(0.0, 0.02, 0.12); flap.scale = Vector3(1.18, 0.65, 0.92)
	pivot.add_child(flap)

	for sx in [-0.09, 0.09]:
		var cinch := MeshInstance3D.new()
		var cm := BoxMesh.new(); cm.size = Vector3(0.032, 0.18, 0.018)
		cinch.mesh = cm; cinch.material_override = mat_leather
		cinch.position = Vector3(sx, -0.07, 0.25)
		pivot.add_child(cinch)

		var buck := MeshInstance3D.new()
		var bkm := BoxMesh.new(); bkm.size = Vector3(0.044, 0.036, 0.024)
		buck.mesh = bkm; buck.material_override = mat_brass
		buck.position = Vector3(sx, -0.13, 0.255)
		pivot.add_child(buck)

	return {"root": root, "pivot": pivot, "open": false}

static func create_campfire_hearth_kit(
	parent: Node3D,
	fx: CampAtmosphereFx,
	pos: Vector3,
	profile: String,
	env_kit: EnvKit
) -> Node3D:
	# Core campfire flame, coals, crossed logs, light & suspended pot (shared fx)
	var hearth := fx.build_campfire(parent, pos, true, true)
	_add_prop_contact_ao(hearth, "CampfireRingAO", Vector3(0.0, 0.007, 0.0), Vector2(2.10, 2.10), 0.34)

	# Surround hearth with 10 natural biome-matched irregular stones + supplies
	var stone_col := Color("#6b706b")
	if profile == "wreck-beach":
		stone_col = Color("#8f8474")
	elif profile == "cliff-observatory":
		stone_col = Color("#4a535e")
	var mat_stone := MatKit.make_textured_mat("coastal-rock.png", stone_col, 0.88, "rock", Vector3(1.2, 1.2, 1.2), true, true)
	var mat_wood := MatKit.make_wood_mat(Color("#5b3f28"), true)
	var mat_bark := MatKit.make_wood_mat(Color("#473020"), true)
	var mat_sack := MatKit.make_cloth_mat(Color("#9f9072"), true, true)
	var mat_leather := MatKit.make_cloth_mat(Color("#5c3f28"), true, true)
	var mat_rope := MatKit.make_cloth_mat(Color("#ab9872"), true, true)
	var mat_iron := MatKit.make_bronze_mat(Color("#32363b"))

	# Replace uniform look with asymmetric outer hearth boulders
	for i in range(9):
		var a := float(i) * TAU / 9.0 + sin(float(i) * 1.7) * 0.24
		var r := 0.68 + sin(float(i) * 2.3) * 0.08
		env_kit.spawn_rock(
			hearth,
			Vector3(cos(a) * r, 0.04, sin(a) * r),
			Vector3(0.28 + fmod(float(i) * 0.07, 0.14), 0.19, 0.24 + fmod(float(i) * 0.05, 0.12)),
			a,
			mat_stone,
			i,
			"rounded" if profile == "wreck-beach" else "craggy"
		)

	# Small stacked firewood pile neatly to one side (~0.85m off center)
	var wood_pile := Node3D.new()
	wood_pile.name = "FirewoodReserve"
	wood_pile.position = Vector3(-0.98, 0.0, -0.45)
	wood_pile.rotation.y = 0.42
	hearth.add_child(wood_pile)
	var log_offsets := [
		Vector3(0.0, 0.06, -0.12), Vector3(0.04, 0.06, 0.0), Vector3(-0.02, 0.06, 0.12),
		Vector3(0.02, 0.15, -0.05), Vector3(-0.03, 0.15, 0.07), Vector3(0.0, 0.23, 0.01)
	]
	for idx in range(log_offsets.size()):
		var lg := MeshInstance3D.new()
		var lm := CylinderMesh.new(); lm.top_radius = 0.052; lm.bottom_radius = 0.064; lm.height = 0.56 - float(idx % 2) * 0.08; lm.radial_segments = 7
		lg.mesh = lm; lg.material_override = mat_bark if idx % 2 == 0 else mat_wood
		lg.position = log_offsets[idx]
		lg.rotation = Vector3(0.0, float(idx) * 0.08, PI * 0.5)
		wood_pile.add_child(lg)

	# Cooking gear beside fire: skillet & ladle on a flat stone slab
	env_kit.spawn_rock(hearth, Vector3(0.88, 0.01, 0.36), Vector3(0.55, 0.14, 0.48), 0.35, mat_stone, 2, "flat")
	var pan := MeshInstance3D.new()
	var pm := CylinderMesh.new(); pm.top_radius = 0.16; pm.bottom_radius = 0.14; pm.height = 0.04; pm.radial_segments = 10
	pan.mesh = pm; pan.material_override = mat_iron
	pan.position = Vector3(0.86, 0.09, 0.34)
	hearth.add_child(pan)
	var handle := MeshInstance3D.new()
	var hm := BoxMesh.new(); hm.size = Vector3(0.24, 0.018, 0.028)
	handle.mesh = hm; handle.material_override = mat_iron
	handle.position = Vector3(1.06, 0.105, 0.39); handle.rotation.y = -0.26
	hearth.add_child(handle)

	# Warm ceramic stew bowls & mugs waiting beside the skillet slab
	var mat_mug := MatKit.make_cloth_mat(Color("#a85d3b"), false, true)
	var mat_tin := MatKit.make_bronze_mat(Color("#8c9296"))
	for m_i in range(2):
		var mug := MeshInstance3D.new()
		mug.name = "HearthStewMug_%d" % m_i
		var mgm := CylinderMesh.new(); mgm.top_radius = 0.046; mgm.bottom_radius = 0.038; mgm.height = 0.088; mgm.radial_segments = 8
		mug.mesh = mgm; mug.material_override = mat_mug if m_i == 0 else mat_tin
		mug.position = Vector3(0.72 + float(m_i) * 0.16, 0.115, 0.50 - float(m_i) * 0.05)
		hearth.add_child(mug)

	# Shared supplies cluster: provisions sack + 2 leather waterskins + coiled rope
	var sup := Node3D.new()
	sup.name = "SharedCampSupplies"
	sup.position = Vector3(-0.78, 0.0, 0.72)
	hearth.add_child(sup)

	var sack := MeshInstance3D.new()
	var skm := CylinderMesh.new(); skm.top_radius = 0.12; skm.bottom_radius = 0.21; skm.height = 0.34; skm.radial_segments = 9
	sack.mesh = skm; sack.material_override = mat_sack
	sack.position = Vector3(0.0, 0.16, 0.0); sack.scale = Vector3(1.15, 1.0, 0.92)
	sup.add_child(sack)
	var tie := MeshInstance3D.new()
	var tm := TorusMesh.new(); tm.inner_radius = 0.065; tm.outer_radius = 0.088; tm.rings = 10
	tie.mesh = tm; tie.material_override = mat_rope
	tie.position = Vector3(0.0, 0.29, 0.0)
	sup.add_child(tie)

	# Two waterskins resting against the provisions sack
	for w_i in range(2):
		var ws := MeshInstance3D.new()
		var wm := SphereMesh.new(); wm.radius = 0.11; wm.height = 0.16; wm.radial_segments = 8; wm.rings = 5
		ws.mesh = wm; ws.material_override = mat_leather
		ws.position = Vector3(0.24 + float(w_i) * 0.12, 0.065, -0.06 + float(w_i) * 0.16)
		ws.rotation = Vector3(0.2, float(w_i) * 0.9, 0.4)
		ws.scale = Vector3(1.2, 0.68, 0.9)
		sup.add_child(ws)

	# Coiled hemp rope (3 stacked turns)
	var rope_pos := Vector3(-0.32, 0.03, 0.16)
	for turn in range(3):
		var ring := MeshInstance3D.new()
		var rnm := TorusMesh.new(); rnm.inner_radius = 0.13 - float(turn) * 0.008; rnm.outer_radius = 0.165 - float(turn) * 0.008; rnm.rings = 14
		ring.mesh = rnm; ring.material_override = mat_rope
		ring.position = rope_pos + Vector3(0.0, float(turn) * 0.032, 0.0)
		ring.rotation.y = float(turn) * 0.4
		sup.add_child(ring)

	return hearth

static func create_canvas_shelter(
	parent: Node3D,
	variant: String,
	pos: Vector3,
	yaw: float,
	env_kit: EnvKit,
	mat_rock: Material,
	anchor_a: Vector3 = Vector3(-1.55, 0.0, -0.5),
	anchor_b: Vector3 = Vector3(1.55, 0.0, 0.5),
	fx: CampAtmosphereFx = null
) -> Dictionary:
	# Strictly open-sided weathered canvas tarp adapted per biome (zero enclosed walls!)
	var base_tarp_col := Color("#b5a07a") if variant == "forest" else (Color("#d2c6ad") if variant == "wreck-beach" else Color("#a69882"))
	var mat_canvas: Material
	if variant == "forest":
		mat_canvas = MatKit.create_tarp_canvas_shader_material(base_tarp_col, Color("#6a583f"), true)
	elif variant == "wreck-beach":
		# Reused salt-bleached ship sail canvas with weathered maritime ochre seam & hem wear!
		mat_canvas = MatKit.create_tarp_canvas_shader_material(base_tarp_col, Color("#8b5a3c"), true)
	else:
		# Weathered warm oatmeal-linen highland storm tarp (stands out warmly against dark basalt cliff!)
		mat_canvas = MatKit.create_tarp_canvas_shader_material(base_tarp_col, Color("#766852"), true)
	var mat_hem := MatKit.make_textured_mat("linen.webp", Color("#6a5b44"), 0.90, "cloth", Vector3(1.15, 1.15, 1.15), false, true)
	mat_hem.cull_mode = BaseMaterial3D.CULL_DISABLED
	var mat_leather := MatKit.make_leather_mat(Color("#4c3422"), true)
	var mat_brass := MatKit.make_bronze_mat(Color("#9e824c"))
	var mat_wood := MatKit.make_wood_mat(Color("#543b24"), true)
	var mat_rope := MatKit.make_cloth_mat(Color("#b19c70"), true, true)
	var mat_sack := MatKit.make_textured_mat("linen.webp", Color("#9a8768"), 0.90, "cloth", Vector3(1.4, 1.4, 1.4), false, true)

	var shelter := Node3D.new()
	shelter.name = "CanvasShelter_%s" % variant
	shelter.position = pos
	shelter.rotation.y = yaw
	parent.add_child(shelter)

	# Named CutawayTentRoof_mia for camera/character roof cutaway contract
	var roof_node := Node3D.new()
	roof_node.name = "CutawayTentRoof_mia"
	shelter.add_child(roof_node)

	# Multi-character realistic tarp sizing & headroom for Elf (1.82 m), Dwarf (1.32 m) & Halfling (1.06 m)
	var span_x := 3.62 if variant == "forest" else (3.05 if variant == "wreck-beach" else 2.85)
	var span_z := 2.82 if variant == "forest" else (2.15 if variant == "wreck-beach" else 2.05)
	_add_prop_contact_ao(shelter, "ShelterCanopyAO", Vector3(0.0, 0.005, 0.0), Vector2(span_x * 1.04, span_z * 1.04), 0.34 if variant == "forest" else 0.24)
	var capacity := 3 if variant == "forest" else 2
	var min_clear_h := 1.18

	if variant == "forest":
		# Paso 11 + Altura despejada para Elfo alto Mike (1.80-1.92m con aura/gorro):
		# cumbrera trasera alta (2.86m) descendiendo hacia el alero frontal (2.28m) sobre 4 postes
		# y amarres firmes a los troncos traseros; conserva pendiente legible desde la cámara VTT sin roces de cabeza.
		var rear_h := 2.86
		var front_h := 2.28
		var front_z := span_z * 0.42
		var rear_z := -span_z * 0.48
		var half_x := span_x * 0.48
		min_clear_h = 2.14

		var tarp_pt_fn := func(u: float, v: float) -> Vector3:
			var raw_x := lerpf(-half_x, half_x, u)
			var raw_z := lerpf(rear_z, front_z, v)
			var mid_u := sin(u * PI)
			var mid_v := sin(v * PI)
			# Scalloped tension borders (Paso 11.9: edges pull inward between corner grommets, non-rectangular!)
			var scallop_x := -signf(u - 0.5) * pow(absf(u - 0.5) * 2.0, 1.6) * mid_v * 0.14
			var scallop_z := -signf(v - 0.5) * pow(absf(v - 0.5) * 2.0, 1.6) * mid_u * 0.10
			var y_slope := lerpf(rear_h, front_h, v)
			var catenary := -mid_u * (0.065 + 0.045 * mid_v)
			# Radial tension wrinkles from all 4 corner tie points (Paso 11.8)
			var tension_folds := 0.0
			for c_uv: Vector2 in [Vector2(0.0, 0.0), Vector2(1.0, 0.0), Vector2(0.0, 1.0), Vector2(1.0, 1.0)]:
				var du: float = u - c_uv.x
				var dv: float = v - c_uv.y
				var r: float = sqrt(du * du + dv * dv)
				var ang: float = atan2(dv, du)
				tension_folds += sin(ang * 14.0 + r * 9.0) * exp(-r * 3.6) * smoothstep(0.03, 0.18, r) * 0.024
			var ripple := sin(u * 15.0 + v * 6.0) * 0.015 * mid_u + cos(v * 12.0 - u * 5.0) * 0.012 * mid_v
			var corner_pin := pow(absf(u - 0.5) * 2.0, 2.4) * pow(absf(v - 0.5) * 2.0, 2.4) * 0.035
			return Vector3(raw_x + scallop_x, y_slope + catenary + corner_pin + tension_folds + ripple, raw_z + scallop_z)

		var tarp_mesh := _make_sculpted_tarp_mesh(18, 14, tarp_pt_fn, 0.016)
		var tarp := MeshInstance3D.new()
		tarp.name = "ShelterCanvasMesh"
		tarp.mesh = tarp_mesh
		tarp.material_override = mat_canvas
		tarp.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		roof_node.add_child(tarp)

		# Curved catenary stitched hem piping following all 4 scalloped edges
		var hem_segs := 8
		for s_i in range(hem_segs):
			var t0 := float(s_i) / float(hem_segs)
			var t1 := float(s_i + 1) / float(hem_segs)
			_add_guy_rope(roof_node, tarp_pt_fn.call(t0, 1.0), tarp_pt_fn.call(t1, 1.0), mat_hem, 0.020)
			_add_guy_rope(roof_node, tarp_pt_fn.call(t0, 0.0), tarp_pt_fn.call(t1, 0.0), mat_hem, 0.019)
			_add_guy_rope(roof_node, tarp_pt_fn.call(0.0, t0), tarp_pt_fn.call(0.0, t1), mat_hem, 0.018)
			_add_guy_rope(roof_node, tarp_pt_fn.call(1.0, t0), tarp_pt_fn.call(1.0, t1), mat_hem, 0.018)

		# 4 Corner coordinates + reinforced leather corner patches & brass grommet rings
		var c_front_l: Vector3 = tarp_pt_fn.call(0.0, 1.0)
		var c_front_r: Vector3 = tarp_pt_fn.call(1.0, 1.0)
		var c_rear_l: Vector3 = tarp_pt_fn.call(0.0, 0.0)
		var c_rear_r: Vector3 = tarp_pt_fn.call(1.0, 0.0)
		var corner_pts: Array[Vector3] = [c_front_l, c_front_r, c_rear_l, c_rear_r]
		for cp_i in range(corner_pts.size()):
			var cpt: Vector3 = corner_pts[cp_i]
			var patch := MeshInstance3D.new()
			patch.name = "CornerPatch_%d" % cp_i
			var pcm := CylinderMesh.new(); pcm.top_radius = 0.095; pcm.bottom_radius = 0.105; pcm.height = 0.024; pcm.radial_segments = 7
			patch.mesh = pcm; patch.material_override = mat_leather
			patch.position = cpt + Vector3(0.0, 0.005, 0.0)
			roof_node.add_child(patch)

			var grommet := MeshInstance3D.new()
			grommet.name = "CornerGrommet_%d" % cp_i
			var gtm := TorusMesh.new(); gtm.inner_radius = 0.026; gtm.outer_radius = 0.044; gtm.rings = 10; gtm.ring_segments = 6
			grommet.mesh = gtm; grommet.material_override = mat_brass
			grommet.position = cpt + Vector3(0.0, 0.012, 0.0)
			roof_node.add_child(grommet)

		# Two stout debarked front corner upright poles supporting front eave
		for p_idx in range(2):
			var c_top := c_front_l if p_idx == 0 else c_front_r
			var pole_h := c_top.y + 0.22
			var pole := MeshInstance3D.new()
			pole.name = "FrontPole_%d" % p_idx
			var plm := CylinderMesh.new(); plm.top_radius = 0.044; plm.bottom_radius = 0.060; plm.height = pole_h; plm.radial_segments = 8
			pole.mesh = plm; pole.material_override = mat_wood
			pole.position = Vector3(c_top.x, pole_h * 0.5 - 0.08, c_top.z)
			pole.rotation.z = -0.035 if p_idx == 0 else 0.035
			pole.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
			shelter.add_child(pole)
			# Multi-turn hemp lashing collar binding canvas grommet to upright post
			for turn_i in range(2):
				var lashing := MeshInstance3D.new()
				lashing.name = "FrontLashing_%d_%d" % [p_idx, turn_i]
				var ltm := TorusMesh.new(); ltm.inner_radius = 0.044; ltm.outer_radius = 0.068; ltm.rings = 10
				lashing.mesh = ltm; lashing.material_override = mat_rope
				lashing.position = Vector3(c_top.x, c_top.y - 0.01 + float(turn_i) * 0.028, c_top.z)
				shelter.add_child(lashing)

		# Horizontal rustic ridgepole spanning tall rear ridge posts
		var ridge_bar := MeshInstance3D.new()
		ridge_bar.name = "RidgePole"
		var rbm := CylinderMesh.new(); rbm.top_radius = 0.038; rbm.bottom_radius = 0.044; rbm.height = span_x + 0.38; rbm.radial_segments = 8
		ridge_bar.mesh = rbm; ridge_bar.material_override = mat_wood
		ridge_bar.position = Vector3(0.0, c_rear_l.y + 0.025, rear_z)
		ridge_bar.rotation.z = PI * 0.5
		ridge_bar.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		shelter.add_child(ridge_bar)

		# Two tall grounded rear corner support poles supporting the high rear ridge (Paso 11.3 & 11.4)
		for rp_idx in range(2):
			var r_top := c_rear_l if rp_idx == 0 else c_rear_r
			var r_pole_h := r_top.y + 0.22
			var r_pole := MeshInstance3D.new()
			r_pole.name = "RearPole_%d" % rp_idx
			var rplm := CylinderMesh.new(); rplm.top_radius = 0.042; rplm.bottom_radius = 0.058; rplm.height = r_pole_h; rplm.radial_segments = 8
			r_pole.mesh = rplm; r_pole.material_override = mat_wood
			r_pole.position = Vector3(r_top.x, r_pole_h * 0.5 - 0.08, r_top.z)
			r_pole.rotation = Vector3(-0.025, 0.0, -0.03 if rp_idx == 0 else 0.03)
			r_pole.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
			shelter.add_child(r_pole)

			var r_lash := MeshInstance3D.new()
			r_lash.name = "RearLashing_%d" % rp_idx
			var rltm := TorusMesh.new(); rltm.inner_radius = 0.042; rltm.outer_radius = 0.066; rltm.rings = 10
			r_lash.mesh = rltm; r_lash.material_override = mat_rope
			r_lash.position = Vector3(r_top.x, r_top.y, r_top.z)
			shelter.add_child(r_lash)

		# Left upright projecting lantern hook arm + warm iron lantern (day OFF, dusk/night warm amber!)
		var crook := MeshInstance3D.new()
		var crm := CylinderMesh.new(); crm.top_radius = 0.024; crm.bottom_radius = 0.030; crm.height = 0.62; crm.radial_segments = 6
		crook.mesh = crm; crook.material_override = mat_wood
		crook.position = Vector3(c_front_l.x - 0.16, c_front_l.y + 0.14, front_z + 0.04)
		crook.rotation = Vector3(0.0, 0.0, -1.18)
		shelter.add_child(crook)
		var hang_lan := create_portable_lantern(shelter, fx, Vector3(c_front_l.x - 0.42, c_front_l.y - 0.28, front_z + 0.06))
		hang_lan.name = "ShelterHangingLantern"
		_add_guy_rope(shelter, Vector3(c_front_l.x - 0.42, c_front_l.y + 0.04, front_z + 0.06), Vector3(c_front_l.x - 0.42, c_front_l.y - 0.02, front_z + 0.06), mat_rope, 0.014)

		# Stout hemp ropes anchoring high rear corner posts/grommets to adjacent anchor tree trunks
		var tree_tie_a := Vector3(clampf(anchor_a.x, -3.4, -half_x - 0.45), 2.48, clampf(anchor_a.z, rear_z - 1.6, rear_z - 0.3))
		var tree_tie_b := Vector3(clampf(anchor_b.x, half_x + 0.45, 3.4), 2.48, clampf(anchor_b.z, rear_z - 1.6, rear_z - 0.3))
		_add_guy_rope(shelter, c_rear_l, tree_tie_a, mat_rope, 0.016)
		_add_guy_rope(shelter, c_rear_r, tree_tie_b, mat_rope, 0.016)
		for ta in [tree_tie_a, tree_tie_b]:
			var wrap := MeshInstance3D.new()
			var wtm := TorusMesh.new(); wtm.inner_radius = 0.24; wtm.outer_radius = 0.275; wtm.rings = 12
			wrap.mesh = wtm; wrap.material_override = mat_rope
			wrap.position = Vector3(ta.x, ta.y, ta.z)
			shelter.add_child(wrap)

		# 4 diagonal guy-ropes pegged into thick angled wooden stakes driven into soil (Paso 11.5 & 11.6)
		var stake_pairs := [
			[c_front_l, Vector3(c_front_l.x - 0.76, 0.08, front_z + 0.70)],
			[c_front_r, Vector3(c_front_r.x + 0.76, 0.08, front_z + 0.70)],
			[c_rear_l, Vector3(c_rear_l.x - 0.62, 0.08, rear_z - 0.72)],
			[c_rear_r, Vector3(c_rear_r.x + 0.62, 0.08, rear_z - 0.72)],
		]
		for sp_i in range(stake_pairs.size()):
			var sp: Array = stake_pairs[sp_i]
			var c_pt: Vector3 = sp[0]
			var s_pt: Vector3 = sp[1]
			_add_guy_rope(shelter, c_pt, s_pt, mat_rope, 0.015)
			var stake := MeshInstance3D.new()
			stake.name = "ShelterStake_%d" % sp_i
			var skm := CylinderMesh.new(); skm.top_radius = 0.032; skm.bottom_radius = 0.014; skm.height = 0.42; skm.radial_segments = 7
			stake.mesh = skm; stake.material_override = mat_wood
			stake.position = Vector3(s_pt.x, 0.10, s_pt.z)
			stake.rotation = Vector3(-0.44 if s_pt.z < 0 else 0.44, 0.0, -0.24 if s_pt.x < 0 else 0.24)
			shelter.add_child(stake)

			var s_loop := MeshInstance3D.new()
			s_loop.name = "StakeLoop_%d" % sp_i
			var slm := TorusMesh.new(); slm.inner_radius = 0.026; slm.outer_radius = 0.044; slm.rings = 9
			s_loop.mesh = slm; s_loop.material_override = mat_rope
			s_loop.position = Vector3(s_pt.x, 0.09, s_pt.z)
			shelter.add_child(s_loop)

		# Small provisions sack & wicker basket nestled cleanly inside left corner of shelter
		var sack := MeshInstance3D.new()
		var skm2 := CylinderMesh.new(); skm2.top_radius = 0.13; skm2.bottom_radius = 0.22; skm2.height = 0.36; skm2.radial_segments = 8
		sack.mesh = skm2; sack.material_override = mat_sack
		sack.position = Vector3(-half_x + 0.34, 0.16, front_z - 0.34); sack.scale = Vector3(1.12, 1.0, 0.92)
		shelter.add_child(sack)
		var basket := MeshInstance3D.new()
		var bkm := CylinderMesh.new(); bkm.top_radius = 0.19; bkm.bottom_radius = 0.14; bkm.height = 0.26; bkm.radial_segments = 9
		basket.mesh = bkm; basket.material_override = MatKit.make_wood_mat(Color("#7a5c38"), true)
		basket.position = Vector3(-half_x + 0.64, 0.13, rear_z + 0.56)
		shelter.add_child(basket)

		# Cozy woven shelter floor rug + warm underside firelight bounce pool at dusk/night
		create_woven_rug(shelter, "ShelterWovenRug", Vector3(0.15, 0.0, -0.05), Vector2(2.35, 1.75), Color("#7d563c"), Color("#b89566"), 0.05)
		if fx and fx.has_method("register_lantern"):
			var under_warm := OmniLight3D.new()
			under_warm.name = "ShelterWarmBounceLight"
			under_warm.light_color = Color("#ffac58")
			under_warm.light_energy = 0.0
			under_warm.omni_range = 4.4
			under_warm.omni_attenuation = 1.45
			under_warm.position = Vector3(0.0, rear_h - 0.38, -0.15)
			shelter.add_child(under_warm)
			fx.register_lantern(under_warm, null, 0.72, 0.08)

	elif variant == "wreck-beach":
		# Reused ship's sail tarp pitched over weathered driftwood spars:
		# tall rear ridge (2.56m) sloping naturally forward to 2.08m front eave so the full sculpted
		# sail canopy + red maritime stripe read clearly from VTT pitch 25° with ample >=2.08m headroom!
		var rear_h := 2.58
		var front_h := 2.08
		var half_x := span_x * 0.56
		var front_z := span_z * 0.52
		var rear_z := -span_z * 0.56
		min_clear_h = 2.08

		var sail_pt := func(u: float, v: float) -> Vector3:
			var raw_x := lerpf(-half_x, half_x, u)
			var raw_z := lerpf(rear_z, front_z, v)
			var mid_u := sin(u * PI)
			var mid_v := sin(v * PI)
			# Scalloped sailcloth edges pulling inward between lashed grommet corners
			var sc_x := -signf(u - 0.5) * pow(absf(u - 0.5) * 2.0, 1.6) * mid_v * 0.16
			var sc_z := -signf(v - 0.5) * pow(absf(v - 0.5) * 2.0, 1.6) * mid_u * 0.12
			var y_slope := lerpf(rear_h, front_h, v)
			# Natural sea-breeze catenary sag & wind-billow folds
			var cat_sag := -mid_u * (0.09 + 0.06 * mid_v) + sin(u * PI) * sin(v * PI) * 0.05
			var folds := sin(u * 13.0 + v * 5.0) * 0.024 * mid_u + cos(v * 10.0 - u * 4.0) * 0.015 * mid_v
			return Vector3(raw_x + sc_x, y_slope + cat_sag + folds, raw_z + sc_z)

		var tarp_mesh := _make_sculpted_tarp_mesh(16, 12, sail_pt, 0.015)
		var tarp := MeshInstance3D.new()
		tarp.name = "BeachSailTarpMesh"
		tarp.mesh = tarp_mesh
		tarp.material_override = mat_canvas
		tarp.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		roof_node.add_child(tarp)

		# Weathered red-ochre maritime identification stripe stitched across the sailcloth
		var stripe_mat := MatKit.make_cloth_mat(Color("#9e4232"), true, true)
		var st_stripe := SurfaceTool.new(); st_stripe.begin(Mesh.PRIMITIVE_TRIANGLES)
		for si in range(10):
			var u0 := lerpf(0.06, 0.94, float(si) / 10.0)
			var u1 := lerpf(0.06, 0.94, float(si + 1) / 10.0)
			var p00: Vector3 = sail_pt.call(u0, 0.42) + Vector3(0.0, 0.014, 0.0)
			var p10: Vector3 = sail_pt.call(u1, 0.42) + Vector3(0.0, 0.014, 0.0)
			var p11: Vector3 = sail_pt.call(u1, 0.56) + Vector3(0.0, 0.014, 0.0)
			var p01: Vector3 = sail_pt.call(u0, 0.56) + Vector3(0.0, 0.014, 0.0)
			st_stripe.set_uv(Vector2(u0, 0.0)); st_stripe.add_vertex(p00)
			st_stripe.set_uv(Vector2(u1, 0.0)); st_stripe.add_vertex(p10)
			st_stripe.set_uv(Vector2(u1, 1.0)); st_stripe.add_vertex(p11)
			st_stripe.set_uv(Vector2(u0, 0.0)); st_stripe.add_vertex(p00)
			st_stripe.set_uv(Vector2(u1, 1.0)); st_stripe.add_vertex(p11)
			st_stripe.set_uv(Vector2(u0, 1.0)); st_stripe.add_vertex(p01)
		st_stripe.generate_normals()
		var stripe_mi := MeshInstance3D.new()
		stripe_mi.name = "SailMaritimeStripe"
		stripe_mi.mesh = st_stripe.commit()
		stripe_mi.material_override = stripe_mat
		stripe_mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		roof_node.add_child(stripe_mi)

		# Weathered driftwood/ship-spar support poles + horizontal rear ridge spar + guy ropes & stakes
		var mat_spar := MatKit.make_wood_mat(Color("#8c7c66"), true)
		var fl_top: Vector3 = sail_pt.call(0.0, 1.0)
		var fr_top: Vector3 = sail_pt.call(1.0, 1.0)
		var rl_top: Vector3 = sail_pt.call(0.0, 0.0)
		var rr_top: Vector3 = sail_pt.call(1.0, 0.0)
		_add_guy_rope(shelter, rl_top + Vector3(-0.18, -0.02, 0.0), rr_top + Vector3(0.18, -0.02, 0.0), mat_spar, 0.042)
		_add_guy_rope(shelter, fl_top + Vector3(-0.14, -0.02, 0.0), fr_top + Vector3(0.14, -0.02, 0.0), mat_spar, 0.032)
		for corner_pair in [
			[fl_top, Vector3(fl_top.x - 0.05, -0.08, fl_top.z + 0.05), Vector3(fl_top.x - 0.72, 0.04, fl_top.z + 0.64), 0.040],
			[fr_top, Vector3(fr_top.x + 0.05, -0.08, fr_top.z + 0.05), Vector3(fr_top.x + 0.62, 0.04, fr_top.z + 0.56), 0.040],
			[rl_top, Vector3(rl_top.x - 0.05, -0.08, rl_top.z - 0.05), Vector3(rl_top.x - 0.66, 0.04, rl_top.z - 0.66), 0.046],
			[rr_top, Vector3(rr_top.x + 0.05, -0.08, rr_top.z - 0.05), Vector3(rr_top.x + 0.66, 0.04, rr_top.z - 0.66), 0.046],
		]:
			var c_top: Vector3 = corner_pair[0]
			var c_bot: Vector3 = corner_pair[1]
			var c_stake: Vector3 = corner_pair[2]
			var c_rad: float = float(corner_pair[3])
			_add_guy_rope(shelter, c_bot, c_top + Vector3(0.0, 0.08, 0.0), mat_spar, c_rad)
			var lash := MeshInstance3D.new()
			var lm := TorusMesh.new(); lm.inner_radius = c_rad * 0.9; lm.outer_radius = c_rad * 1.45; lm.rings = 10
			lash.mesh = lm; lash.material_override = mat_rope; lash.position = c_top + Vector3(0.0, -0.02, 0.0)
			shelter.add_child(lash)
			_add_guy_rope(shelter, c_top, c_stake + Vector3(0.0, 0.14, 0.0), mat_rope, 0.012)
			_add_guy_rope(shelter, c_stake + Vector3(0.0, -0.08, 0.0), c_stake + Vector3(0.0, 0.24, 0.0), mat_wood, 0.024)
			env_kit.spawn_rock(shelter, c_stake + Vector3(0.12, 0.05, 0.05), Vector3(0.26, 0.16, 0.24), c_stake.x, mat_rock, 1, "craggy")

		# Draped salvage fishing net mesh hanging on the west flank of the sail shelter
		var net_root := Node3D.new()
		net_root.name = "SailSideFishingNet"
		shelter.add_child(net_root)
		for ni in range(5):
			var vf := float(ni) / 4.0
			var n_top: Vector3 = sail_pt.call(0.02, vf)
			var n_bot := Vector3(n_top.x - 0.16, 0.04, n_top.z)
			_add_guy_rope(net_root, n_top, n_bot, mat_rope, 0.008)
		for nh in range(3):
			var hf := 0.28 + float(nh) * 0.26
			var a_pt := lerpf(rl_top.y, 0.04, hf)
			var b_pt := lerpf(fl_top.y, 0.04, hf)
			_add_guy_rope(net_root, Vector3(rl_top.x - 0.10 * hf, a_pt, rl_top.z), Vector3(fl_top.x - 0.10 * hf, b_pt, fl_top.z), mat_rope, 0.007)

		# Cozy woven coastal mat under the sail shelter
		create_woven_rug(shelter, "BeachShelterRug", Vector3(0.0, 0.006, 0.02), Vector2(2.35, 1.55), Color("#8c5e3f"), Color("#d2b98c"), 0.0)

	else:
		# cliff-observatory: Low wind-taut storm tarp anchored between basalt windbreak & weighted boulders
		# Raised front lip (1.92m) tapering sharply into rear windbreak (0.68m) for aerodynamic silhouette + clear headroom
		var front_h := 1.94
		var rear_h := 0.68
		var half_x := span_x * 0.54
		var front_z := span_z * 0.48
		var rear_z := -span_z * 0.52
		min_clear_h = 1.76

		var storm_pt := func(u: float, v: float) -> Vector3:
			var raw_x := lerpf(-half_x, half_x, u)
			var raw_z := lerpf(rear_z, front_z, v)
			var mid_u := sin(u * PI)
			var mid_v := sin(v * PI)
			var sc_x := -signf(u - 0.5) * pow(absf(u - 0.5) * 2.0, 1.6) * mid_v * 0.14
			var sc_z := -signf(v - 0.5) * pow(absf(v - 0.5) * 2.0, 1.6) * mid_u * 0.10
			var y_slope := lerpf(rear_h, front_h, v)
			var taut_sag := -mid_u * (0.05 + 0.04 * mid_v) + sin(u * 13.0 + v * 6.0) * 0.020 * mid_u
			return Vector3(raw_x + sc_x, y_slope + taut_sag, raw_z + sc_z)

		var tarp_mesh := _make_sculpted_tarp_mesh(14, 10, storm_pt, 0.015)
		var tarp := MeshInstance3D.new()
		tarp.name = "CliffStormTarpMesh"
		tarp.mesh = tarp_mesh
		tarp.material_override = mat_canvas
		tarp.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		roof_node.add_child(tarp)
		create_woven_rug(shelter, "CliffShelterRug", Vector3(0.0, 0.006, 0.0), Vector2(2.25, 1.45), Color("#8e4c36"), Color("#cf9e68"), 0.0)

		# 2 sturdy lashed front timber poles + 4 heavy basalt wind-anchor boulders with taut ropes
		var c_fl: Vector3 = storm_pt.call(0.0, 1.0)
		var c_fr: Vector3 = storm_pt.call(1.0, 1.0)
		var c_rl: Vector3 = storm_pt.call(0.0, 0.0)
		var c_rr: Vector3 = storm_pt.call(1.0, 0.0)
		_add_guy_rope(shelter, Vector3(c_fl.x, -0.06, c_fl.z), c_fl + Vector3(0.0, 0.08, 0.0), mat_wood, 0.036)
		_add_guy_rope(shelter, Vector3(c_fr.x, -0.06, c_fr.z), c_fr + Vector3(0.0, 0.08, 0.0), mat_wood, 0.036)
		var anchors := [
			[c_fl, Vector3(c_fl.x - 0.72, 0.16, c_fl.z + 0.65)],
			[c_fr, Vector3(c_fr.x + 0.72, 0.16, c_fr.z + 0.65)],
			[c_rl, Vector3(c_rl.x - 0.62, 0.16, c_rl.z - 0.68)],
			[c_rr, Vector3(c_rr.x + 0.62, 0.16, c_rr.z - 0.68)],
		]
		for a_i in range(anchors.size()):
			var a_pair: Array = anchors[a_i]
			_add_guy_rope(shelter, a_pair[0], a_pair[1], mat_rope, 0.012)
			env_kit.spawn_rock(shelter, Vector3(a_pair[1].x, 0.12, a_pair[1].z), Vector3(0.42, 0.28, 0.38), float(a_i) * 1.2, mat_rock, a_i, "stratified")

	return {
		"root": shelter,
		"roof": roof_node,
		"rect": Rect2(pos.x - 1.95, pos.z - 1.65, 3.9, 3.3),
		"capacity": capacity,
		"tarp_mat": mat_canvas,
		"min_clear_height": min_clear_h,
	}

static func _add_guy_rope(parent: Node3D, from_pt: Vector3, to_pt: Vector3, mat: Material, radius: float = 0.013) -> void:
	var delta := to_pt - from_pt
	var dist := delta.length()
	if dist < 0.05:
		return
	var mid := (from_pt + to_pt) * 0.5
	var y_ax := delta / dist
	var ref := Vector3.UP if absf(y_ax.y) < 0.95 else Vector3.FORWARD
	var x_ax := ref.cross(y_ax).normalized()
	var z_ax := x_ax.cross(y_ax).normalized()
	var seg := MeshInstance3D.new()
	var cm := CylinderMesh.new(); cm.top_radius = radius; cm.bottom_radius = radius; cm.height = dist; cm.radial_segments = 5
	seg.mesh = cm; seg.material_override = mat
	seg.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	seg.transform = Transform3D(Basis(x_ax, y_ax, z_ax), mid)
	parent.add_child(seg)

static func create_natural_seat(
	parent: Node3D,
	variant: String,
	pos: Vector3,
	yaw: float,
	env_kit: EnvKit,
	seed_v: float
) -> Dictionary:
	var sroot := Node3D.new()
	sroot.name = "NaturalSeat_" + variant
	sroot.position = pos
	sroot.rotation.y = yaw
	parent.add_child(sroot)

	var seat_y := 0.36
	var seat_type := "flat-stone"
	var slots_local: Array[Vector3] = []
	var support_meshes: Array[MeshInstance3D] = []

	if variant == "forest":
		seat_type = "fallen-log"
		# Paso 13 (13.1-13.4): Gnarled mossy fallen log embedded firmly into soil,
		# sawn/split heartwood cut end-caps, worn flattened seating top & wedged chock stones!
		seat_y = 0.36
		slots_local = [Vector3(-0.62, seat_y, 0.0), Vector3(0.0, seat_y, 0.0), Vector3(0.62, seat_y, 0.0)]
		var mat_bark := MatKit.make_wood_mat(Color("#543d2a"), true)
		var mat_heartwood := MatKit.make_wood_mat(Color("#b58c5a"), true)
		var mat_pith := MatKit.make_wood_mat(Color("#765332"), true)
		var mat_worn_top := MatKit.make_wood_mat(Color("#7c5d3e"), true)
		var mat_moss := MatKit.make_textured_mat("moss.jpg", Color("#4e7442"), 0.90, "rock", Vector3(1.2, 1.2, 1.2), true, true)
		var mat_stone := MatKit.make_textured_mat("coastal-rock.png", Color("#666f62"), 0.88, "rock", Vector3(0.8, 0.8, 0.8), true, true)

		var seg_a := MeshInstance3D.new()
		seg_a.name = "LogSegment_A"
		var ca := CylinderMesh.new(); ca.top_radius = 0.215; ca.bottom_radius = 0.255; ca.height = 1.20; ca.radial_segments = 10
		seg_a.mesh = ca; seg_a.material_override = mat_bark
		seg_a.position = Vector3(-0.52, 0.165, 0.0); seg_a.rotation = Vector3(0.0, 0.06, PI * 0.5)
		sroot.add_child(seg_a)
		support_meshes.append(seg_a)

		var seg_b := MeshInstance3D.new()
		seg_b.name = "LogSegment_B"
		var cb := CylinderMesh.new(); cb.top_radius = 0.185; cb.bottom_radius = 0.218; cb.height = 1.08; cb.radial_segments = 10
		seg_b.mesh = cb; seg_b.material_override = mat_bark
		seg_b.position = Vector3(0.50, 0.158, 0.03); seg_b.rotation = Vector3(0.0, -0.08, PI * 0.5)
		sroot.add_child(seg_b)
		support_meshes.append(seg_b)

		# Sawn/chopped heartwood cut end-caps + darker inner core rings at both ends of each log segment (Paso 13.2)
		var end_defs := [
			[Vector3(-1.12, 0.165, -0.036), 0.242, 0.06],
			[Vector3(0.08, 0.165, 0.036), 0.205, 0.06],
			[Vector3(-0.04, 0.158, -0.013), 0.208, -0.08],
			[Vector3(1.04, 0.158, 0.073), 0.176, -0.08],
		]
		for ed_i in range(end_defs.size()):
			var ed: Array = end_defs[ed_i]
			var e_pos: Vector3 = ed[0]
			var e_rad: float = float(ed[1])
			var e_yaw: float = float(ed[2])
			var cap := MeshInstance3D.new()
			cap.name = "LogCutEnd_%d" % ed_i
			var cm := CylinderMesh.new(); cm.top_radius = e_rad; cm.bottom_radius = e_rad; cm.height = 0.022; cm.radial_segments = 10
			cap.mesh = cm; cap.material_override = mat_heartwood
			cap.position = e_pos; cap.rotation = Vector3(0.0, e_yaw, PI * 0.5)
			sroot.add_child(cap)

			var pith := MeshInstance3D.new()
			pith.name = "LogCutCore_%d" % ed_i
			var pm := CylinderMesh.new(); pm.top_radius = e_rad * 0.54; pm.bottom_radius = e_rad * 0.54; pm.height = 0.027; pm.radial_segments = 8
			pith.mesh = pm; pith.material_override = mat_pith
			pith.position = e_pos; pith.rotation = Vector3(0.0, e_yaw, PI * 0.5)
			sroot.add_child(pith)

		# Flattened worn upper seating surfaces along the log crowns (Paso 13.4)
		for w_i in range(2):
			var worn := MeshInstance3D.new()
			worn.name = "LogWornSeatFlat_%d" % w_i
			var wm := BoxMesh.new()
			wm.size = Vector3(0.92 if w_i == 0 else 0.82, 0.028, 0.19)
			worn.mesh = wm; worn.material_override = mat_worn_top
			worn.position = Vector3(-0.52, 0.365, 0.0) if w_i == 0 else Vector3(0.50, 0.342, 0.03)
			worn.rotation.y = 0.06 if w_i == 0 else -0.08
			sroot.add_child(worn)
			support_meshes.append(worn)

		var snag := MeshInstance3D.new()
		var snm := CylinderMesh.new(); snm.top_radius = 0.04; snm.bottom_radius = 0.08; snm.height = 0.34; snm.radial_segments = 6
		snag.mesh = snm; snag.material_override = mat_bark
		snag.position = Vector3(-0.82, 0.25, -0.14); snag.rotation = Vector3(-0.55, 0.2, 0.35)
		sroot.add_child(snag)

		var knot := MeshInstance3D.new()
		var knm := CylinderMesh.new(); knm.top_radius = 0.045; knm.bottom_radius = 0.072; knm.height = 0.22; knm.radial_segments = 6
		knot.mesh = knm; knot.material_override = mat_bark
		knot.position = Vector3(0.32, 0.20, 0.16); knot.rotation = Vector3(0.62, -0.25, -0.3)
		sroot.add_child(knot)

		# Wedged earth/stone chocks grounding the log seat into the clearing floor (Paso 13.3)
		env_kit.spawn_rock(sroot, Vector3(-0.88, 0.04, 0.19), Vector3(0.24, 0.13, 0.20), 0.5, mat_stone, 0, "craggy")
		env_kit.spawn_rock(sroot, Vector3(0.04, 0.04, -0.18), Vector3(0.26, 0.14, 0.22), 1.7, mat_stone, 1, "flat")
		env_kit.spawn_rock(sroot, Vector3(0.76, 0.04, 0.20), Vector3(0.22, 0.12, 0.18), 2.6, mat_stone, 2, "craggy")

		for m_i in range(2):
			var moss_cap := MeshInstance3D.new()
			var mcm := SphereMesh.new(); mcm.radius = 0.16; mcm.height = 0.10; mcm.radial_segments = 7; mcm.rings = 3
			moss_cap.mesh = mcm; moss_cap.material_override = mat_moss
			moss_cap.position = Vector3(-0.35 + float(m_i) * 0.55, 0.33, -0.10)
			moss_cap.scale = Vector3(1.8, 0.45, 0.9)
			sroot.add_child(moss_cap)

	elif variant == "wreck-beach":
		seat_type = "driftwood"
		# Salt-bleached weathered driftwood timber log (~2.30m long, seats up to 3!)
		seat_y = 0.35
		slots_local = [Vector3(-0.65, seat_y, 0.0), Vector3(0.0, seat_y, 0.0), Vector3(0.65, seat_y, 0.0)]
		var mat_drift := MatKit.make_wood_mat(Color("#a19784"), true)
		var log := MeshInstance3D.new()
		var lm := CylinderMesh.new(); lm.top_radius = 0.17; lm.bottom_radius = 0.22; lm.height = 2.30; lm.radial_segments = 8
		log.mesh = lm; log.material_override = mat_drift
		log.position = Vector3(0.0, 0.16, 0.0); log.rotation = Vector3(0.04, 0.05, PI * 0.5)
		sroot.add_child(log)
		support_meshes.append(log)
		# Draped warm wool salt-cloak/blanket pad over half the driftwood log
		var seat_pad := MeshInstance3D.new()
		seat_pad.name = "DriftwoodSeatBlanket"
		seat_pad.mesh = _make_wrinkled_grid_mesh(0.92, 0.42, 6, 5, func(u: float, v: float, _x: float, _z: float) -> float:
			return 0.345 - pow(absf(v - 0.5) * 2.0, 2.0) * 0.14 + sin(u * 9.0) * 0.008
		, 0.018)
		seat_pad.material_override = MatKit.make_textured_mat("wool-v4.webp", Color("#8e583b"), 0.90, "cloth", Vector3(1.6, 1.6, 1.6), false, true)
		seat_pad.position = Vector3(-0.34, 0.0, 0.0)
		sroot.add_child(seat_pad)
		env_kit.spawn_seaweed_clump(sroot, Vector3(0.75, 0.01, 0.22), seed_v)

	else:
		# Flat-topped fractured basalt or cave stone slab (1.35m wide, seats 1-2!)
		seat_y = 0.32
		slots_local = [Vector3(-0.28, seat_y, 0.0), Vector3(0.28, seat_y, 0.0)]
		var col := Color("#586169") if variant == "cliff-observatory" else Color("#727973")
		if variant == "forest-stone":
			col = Color("#6b735b")
		var mat_slab := MatKit.make_textured_mat("coastal-rock.png", col, 0.86, "rock", Vector3(0.45, 0.45, 0.45), true, true)
		var slab := env_kit.spawn_rock(sroot, Vector3(0.0, 0.15, 0.0), Vector3(1.36, 0.64, 0.76), 0.12, mat_slab, int(seed_v), "flat")
		support_meshes.append(slab)
		if variant == "cliff-observatory":
			var cliff_pad := MeshInstance3D.new()
			cliff_pad.name = "CliffSeatBlanket"
			cliff_pad.mesh = _make_wrinkled_grid_mesh(0.72, 0.42, 6, 5, func(u: float, v: float, _x: float, _z: float) -> float:
				return 0.325 - pow(absf(v - 0.5) * 2.0, 2.0) * 0.08 + cos(u * 8.0) * 0.006
			, 0.016)
			cliff_pad.material_override = MatKit.make_textured_mat("wool-v4.webp", Color("#9a4f36"), 0.90, "cloth", Vector3(1.6, 1.6, 1.6), false, true)
			sroot.add_child(cliff_pad)
		env_kit.spawn_rock(sroot, Vector3(0.48, 0.06, -0.22), Vector3(0.32, 0.24, 0.30), 1.4, mat_slab, int(seed_v) + 1, "craggy")

	_add_prop_contact_ao(
		sroot,
		"NaturalSeatAO",
		Vector3(0.0, 0.009, 0.0),
		Vector2(2.65, 0.96) if variant in ["forest", "wreck-beach"] else Vector2(1.75, 1.15),
		0.38
	)

	return {
		"root": sroot,
		"type": seat_type,
		"seat_y": seat_y,
		"slots_local": slots_local,
		"capacity": slots_local.size(),
		"front_radius": 0.25 if variant in ["forest", "wreck-beach"] else 0.38,
		"support_meshes": support_meshes,
	}

## Seat models place pelvis contacts in local space and point their front along +Z.
## Symmetric seats can opt to face the approach side. Backed seats use the model front.
static func seat_anchor(seat: Node3D, slots_local: Array, front_radius: float,
		stand_pos: Vector3, face_approach: bool = false, side_hint: Vector3 = Vector3.ZERO,
		support_meshes: Array = []) -> Dictionary:
	var forward := seat.global_basis.z
	forward.y = 0.0
	if forward.length_squared() < 0.0001 or slots_local.is_empty():
		return {}
	forward = forward.normalized()
	if face_approach:
		var side := (stand_pos - seat.global_position).dot(forward)
		if is_zero_approx(side):
			side = side_hint.dot(forward)
		if side < 0.0:
			forward = -forward
	var slots_world: Array[Vector3] = []
	for slot: Vector3 in slots_local:
		var contact := seat.to_global(slot)
		contact.y = _seat_surface_height(contact, support_meshes)
		slots_world.append(contact)
	return {
		"slots_world": slots_world,
		"world_forward": forward,
		"front_radius": front_radius,
		"stand_pos": stand_pos,
		"capacity": slots_world.size(),
	}

static func _seat_surface_height(contact: Vector3, support_meshes: Array) -> float:
	var height := -INF
	for support: MeshInstance3D in support_meshes:
		var ray_start := support.to_local(contact + Vector3.UP)
		var ray_end := support.to_local(contact - Vector3.UP)
		var faces := support.mesh.get_faces()
		for i in range(0, faces.size(), 3):
			var hit = Geometry3D.segment_intersects_triangle(ray_start, ray_end, faces[i], faces[i + 1], faces[i + 2])
			if hit != null:
				height = maxf(height, support.to_global(hit).y)
	return contact.y if height == -INF else height

static func create_woven_rug(
	parent: Node3D,
	node_name: String,
	pos: Vector3,
	size_xz: Vector2,
	col_main: Color,
	col_trim: Color,
	yaw: float = 0.0
) -> Node3D:
	var rroot := Node3D.new()
	rroot.name = node_name
	rroot.position = pos
	rroot.rotation.y = yaw
	parent.add_child(rroot)
	_add_prop_contact_ao(rroot, node_name + "_AO", Vector3(0.0, 0.004, 0.0), size_xz + Vector2(0.16, 0.16), 0.24)

	var mat_main := MatKit.make_textured_mat("wool-v4.webp", col_main, 0.92, "cloth", Vector3(2.2, 2.2, 2.2), false, true)
	var mat_trim := MatKit.make_cloth_mat(col_trim, false, true)

	var body := MeshInstance3D.new()
	body.mesh = _make_wrinkled_grid_mesh(size_xz.x, size_xz.y, 7, 5, func(u: float, v: float, _x: float, _z: float) -> float:
		return 0.015 + sin(u * 8.0 + v * 6.0) * 0.004
	, 0.014)
	body.material_override = mat_main
	body.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	rroot.add_child(body)

	var trim := MeshInstance3D.new()
	var tm := BoxMesh.new(); tm.size = Vector3(size_xz.x * 0.90, 0.012, size_xz.y * 0.84)
	trim.mesh = tm; trim.material_override = mat_trim; trim.position.y = 0.011
	trim.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	rroot.add_child(trim)
	return rroot

static func create_personal_kit(
	parent: Node3D,
	owner: String,
	pos: Vector3,
	yaw: float,
	fx: CampAtmosphereFx = null
) -> Node3D:
	var kroot := Node3D.new()
	kroot.name = "PersonalKit_" + owner
	kroot.position = pos
	kroot.rotation.y = yaw
	parent.add_child(kroot)
	_add_prop_contact_ao(kroot, "PersonalKitAO", Vector3(0.0, 0.005, 0.0), Vector2(0.84, 0.72), 0.30)

	var mat_leather := MatKit.make_leather_mat(Color("#4e3422"), true)
	var mat_brass := MatKit.make_bronze_mat(Color("#a88948"))
	var mat_steel := MatKit.make_bronze_mat(Color("#7c848c"))
	var mat_paper := MatKit.make_cloth_mat(Color("#dfd4bc"), false, true)

	if owner == "mike":
		# Folded indigo cloth pad + open grimoire + suede pouch + brass quill
		var cloth := MeshInstance3D.new()
		var cm := BoxMesh.new(); cm.size = Vector3(0.54, 0.016, 0.42)
		cloth.mesh = cm; cloth.material_override = MatKit.make_cloth_mat(Color("#36455a"), false, true)
		cloth.position = Vector3(0.0, 0.008, 0.0)
		kroot.add_child(cloth)

		var book := Node3D.new()
		book.position = Vector3(-0.08, 0.025, 0.02); book.rotation.y = 0.18
		kroot.add_child(book)
		for side in [-1.0, 1.0]:
			var leaf := MeshInstance3D.new()
			var bm := BoxMesh.new(); bm.size = Vector3(0.16, 0.024, 0.24)
			leaf.mesh = bm; leaf.material_override = mat_paper
			leaf.position = Vector3(side * 0.082, 0.012, 0.0)
			leaf.rotation.z = -side * 0.12
			book.add_child(leaf)
			var cover := MeshInstance3D.new()
			var cvm := BoxMesh.new(); cvm.size = Vector3(0.17, 0.008, 0.255)
			cover.mesh = cvm; cover.material_override = mat_leather
			cover.position = Vector3(side * 0.084, 0.0, 0.0)
			cover.rotation.z = -side * 0.12
			book.add_child(cover)

		var pouch := MeshInstance3D.new()
		var pm := SphereMesh.new(); pm.radius = 0.075; pm.height = 0.12; pm.radial_segments = 8
		pouch.mesh = pm; pouch.material_override = MatKit.make_cloth_mat(Color("#6b4a33"), false, true)
		pouch.position = Vector3(0.17, 0.055, -0.06)
		kroot.add_child(pouch)

		var vial := MeshInstance3D.new()
		var vm := CylinderMesh.new(); vm.top_radius = 0.018; vm.bottom_radius = 0.026; vm.height = 0.075; vm.radial_segments = 6
		vial.mesh = vm; vial.material_override = MatKit.make_bronze_mat(Color("#394b59"))
		vial.position = Vector3(0.16, 0.05, 0.09)
		kroot.add_child(vial)

		# Brass bedside candlestick with warm night reading glow next to Mike's grimoire
		var saucer := MeshInstance3D.new()
		var scm2 := CylinderMesh.new(); scm2.top_radius = 0.052; scm2.bottom_radius = 0.058; scm2.height = 0.018; scm2.radial_segments = 8
		saucer.mesh = scm2; saucer.material_override = mat_brass; saucer.position = Vector3(-0.22, 0.022, -0.11)
		kroot.add_child(saucer)
		var wax := MeshInstance3D.new()
		var wxm := CylinderMesh.new(); wxm.top_radius = 0.018; wxm.bottom_radius = 0.021; wxm.height = 0.085; wxm.radial_segments = 7
		wax.mesh = wxm; wax.material_override = mat_paper; wax.position = Vector3(-0.22, 0.068, -0.11)
		kroot.add_child(wax)
		var wick_mat := StandardMaterial3D.new()
		wick_mat.albedo_color = Color("#ffcf7a"); wick_mat.emission = Color("#ffb355"); wick_mat.emission_enabled = false
		var flame_tip := MeshInstance3D.new()
		var ftm := SphereMesh.new(); ftm.radius = 0.016; ftm.height = 0.036; ftm.radial_segments = 6; ftm.rings = 3
		flame_tip.mesh = ftm; flame_tip.material_override = wick_mat; flame_tip.position = Vector3(-0.22, 0.125, -0.11)
		kroot.add_child(flame_tip)
		if fx and fx.has_method("register_lantern"):
			var cl_candle := OmniLight3D.new()
			cl_candle.light_color = Color("#ffba6a"); cl_candle.omni_range = 2.6; cl_candle.omni_attenuation = 1.65; cl_candle.light_energy = 0.0
			cl_candle.position = Vector3(-0.22, 0.17, -0.11)
			kroot.add_child(cl_candle)
			fx.register_lantern(cl_candle, wick_mat, 0.46, 0.12, 2.2)

	elif owner == "mia":
		# Woven travel prayer mat + bronze sacred medallion + tinder/incense box
		var mat_pad := MeshInstance3D.new()
		var mpm := BoxMesh.new(); mpm.size = Vector3(0.66, 0.016, 0.48)
		mat_pad.mesh = mpm; mat_pad.material_override = MatKit.make_textured_mat("wool-v4.webp", Color("#8a5f42"), 0.90, "cloth", Vector3(1.5, 1.5, 1.5), false, true)
		mat_pad.position = Vector3(0.0, 0.008, 0.0)
		kroot.add_child(mat_pad)

		# Bronze sun/anvil sacred medallion resting on linen stand
		var linen := MeshInstance3D.new()
		var lm := BoxMesh.new(); lm.size = Vector3(0.24, 0.014, 0.20)
		linen.mesh = lm; linen.material_override = mat_paper
		linen.position = Vector3(-0.04, 0.022, -0.02)
		kroot.add_child(linen)

		var ring := MeshInstance3D.new()
		var rnm := TorusMesh.new(); rnm.inner_radius = 0.055; rnm.outer_radius = 0.075; rnm.rings = 14
		ring.mesh = rnm; ring.material_override = mat_brass
		ring.position = Vector3(-0.04, 0.045, -0.02)
		kroot.add_child(ring)

		var sun_core := MeshInstance3D.new()
		var scm := CylinderMesh.new(); scm.top_radius = 0.032; scm.bottom_radius = 0.032; scm.height = 0.022; scm.radial_segments = 8
		sun_core.mesh = scm; sun_core.material_override = mat_brass
		sun_core.position = Vector3(-0.04, 0.045, -0.02)
		kroot.add_child(sun_core)

		var tin := MeshInstance3D.new()
		var tnm := CylinderMesh.new(); tnm.top_radius = 0.042; tnm.bottom_radius = 0.044; tnm.height = 0.048; tnm.radial_segments = 8
		tin.mesh = tnm; tin.material_override = mat_brass
		tin.position = Vector3(0.16, 0.038, 0.06)
		kroot.add_child(tin)

		# Cozy clay herbal teacup beside Mia's mat
		var cup := MeshInstance3D.new()
		var cpm := CylinderMesh.new(); cpm.top_radius = 0.040; cpm.bottom_radius = 0.032; cpm.height = 0.076; cpm.radial_segments = 8
		cup.mesh = cpm; cup.material_override = MatKit.make_cloth_mat(Color("#a85c3d"), false, true)
		cup.position = Vector3(0.22, 0.052, -0.09)
		kroot.add_child(cup)

	else:
		# Trinity: unrolled leather tool wrap + slender picks + rectangular whetstone
		var wrap := MeshInstance3D.new()
		var wm := BoxMesh.new(); wm.size = Vector3(0.56, 0.014, 0.36)
		wrap.mesh = wm; wrap.material_override = mat_leather
		wrap.position = Vector3(0.0, 0.008, 0.0)
		kroot.add_child(wrap)

		var rolled_edge := MeshInstance3D.new()
		var rem := CylinderMesh.new(); rem.top_radius = 0.035; rem.bottom_radius = 0.035; rem.height = 0.36; rem.radial_segments = 8
		rolled_edge.mesh = rem; rolled_edge.material_override = mat_leather
		rolled_edge.position = Vector3(-0.24, 0.034, 0.0); rolled_edge.rotation.x = PI * 0.5
		kroot.add_child(rolled_edge)

		# Tool picks / blades arranged naturally in pockets
		for t_i in range(4):
			var tool := MeshInstance3D.new()
			var tlm := BoxMesh.new(); tlm.size = Vector3(0.014, 0.012, 0.19 - float(t_i % 2) * 0.04)
			tool.mesh = tlm; tool.material_override = mat_steel
			tool.position = Vector3(-0.09 + float(t_i) * 0.055, 0.020, 0.0)
			tool.rotation.y = sin(float(t_i)) * 0.06
			kroot.add_child(tool)

		# Two-tone rectangular whetstone + oil vial + folded warm wool scarf
		var whetstone := MeshInstance3D.new()
		var wsm := BoxMesh.new(); wsm.size = Vector3(0.15, 0.032, 0.065)
		whetstone.mesh = wsm; whetstone.material_override = MatKit.make_textured_mat("coastal-rock.png", Color("#64696d"), 0.65, "rock", Vector3.ONE, false, true)
		whetstone.position = Vector3(0.18, 0.026, -0.05); whetstone.rotation.y = 0.28
		kroot.add_child(whetstone)

		var oil := MeshInstance3D.new()
		var om := CylinderMesh.new(); om.top_radius = 0.020; om.bottom_radius = 0.028; om.height = 0.07; om.radial_segments = 6
		oil.mesh = om; oil.material_override = mat_brass
		oil.position = Vector3(0.20, 0.045, 0.09)
		kroot.add_child(oil)

		var scarf := MeshInstance3D.new()
		var sfm := BoxMesh.new(); sfm.size = Vector3(0.22, 0.028, 0.14)
		scarf.mesh = sfm; scarf.material_override = MatKit.make_textured_mat("wool-v4.webp", Color("#8b4a4b"), 0.90, "cloth", Vector3(1.5, 1.5, 1.5), false, true)
		scarf.position = Vector3(-0.18, 0.022, -0.14); scarf.rotation.y = -0.32
		kroot.add_child(scarf)

	return kroot

static func create_portable_lantern(
	parent: Node3D,
	fx: CampAtmosphereFx,
	pos: Vector3,
	always_lit: bool = false,
	day_scale: float = 0.72
) -> Node3D:
	# Small portable ground-placed lantern (NEVER lit by default during bright day!)
	var lroot := Node3D.new()
	lroot.name = "PortableWatchLantern"
	lroot.position = pos
	parent.add_child(lroot)
	_add_prop_contact_ao(lroot, "LanternAO", Vector3(0.0, 0.004, 0.0), Vector2(0.40, 0.40), 0.34)

	var mat_iron := MatKit.make_bronze_mat(Color("#2f3338"))
	var mat_brass := MatKit.make_bronze_mat(Color("#7f6940"))
	var mat_glass := StandardMaterial3D.new()
	mat_glass.albedo_color = Color("#8f7e5b")
	mat_glass.roughness = 0.35
	mat_glass.emission_enabled = false
	mat_glass.emission = Color("#ffbf68")
	mat_glass.emission_energy_multiplier = 0.0

	var base := MeshInstance3D.new()
	var bm := CylinderMesh.new(); bm.top_radius = 0.085; bm.bottom_radius = 0.105; bm.height = 0.05; bm.radial_segments = 8
	base.mesh = bm; base.material_override = mat_iron; base.position.y = 0.025
	lroot.add_child(base)

	var core := MeshInstance3D.new()
	var cm := CylinderMesh.new(); cm.top_radius = 0.068; cm.bottom_radius = 0.068; cm.height = 0.16; cm.radial_segments = 8
	core.mesh = cm; core.material_override = mat_glass; core.position.y = 0.13
	lroot.add_child(core)

	var cap := MeshInstance3D.new()
	var cpm := CylinderMesh.new(); cpm.top_radius = 0.035; cpm.bottom_radius = 0.11; cpm.height = 0.06; cpm.radial_segments = 8
	cap.mesh = cpm; cap.material_override = mat_brass; cap.position.y = 0.24
	lroot.add_child(cap)

	var bail := MeshInstance3D.new()
	var blm := TorusMesh.new(); blm.inner_radius = 0.06; blm.outer_radius = 0.072; blm.rings = 10
	bail.mesh = blm; bail.material_override = mat_iron
	bail.position = Vector3(0.0, 0.25, 0.02)
	bail.rotation.x = 0.65
	lroot.add_child(bail)

	var light := OmniLight3D.new()
	light.light_color = Color("#ffbf70")
	light.light_energy = 0.0
	light.omni_range = 5.8
	light.omni_attenuation = 1.6
	light.position = Vector3(0.0, 0.18, 0.0)
	lroot.add_child(light)

	if fx and fx.has_method("register_lantern"):
		fx.register_lantern(light, mat_glass, 1.15 if always_lit else 1.05, 0.06, 1.65 if always_lit else 1.55, always_lit, day_scale)

	return lroot
