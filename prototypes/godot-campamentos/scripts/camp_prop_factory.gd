class_name CampPropFactory
extends RefCounted

## Reusable high-detail medieval camp prop factory.
## Produces organic bedrolls, weathered leather/canvas backpacks, biome-specific
## canvas shelters (never enclosed rigid cabins), hearth equipment, natural log/stone
## seats, grounded personal kits, and day/night-aware portable lanterns.

const MatKit = preload("res://scripts/camp_material_kit.gd")
const EnvKit = preload("res://scripts/camp_environment_kit.gd")

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
		"mike": Color("#46586b"),
		"mia": Color("#7c6244"),
		"maria": Color("#554a5c"),
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

	# Groundsheet canvas mat adapted to character stature, flush with earth
	var ground_mesh := _make_wrinkled_grid_mesh(0.84 * width_scale, 1.92 * len_scale, 6, 10, func(u: float, v: float, _x: float, _z: float) -> float:
		var edge := minf(minf(u, 1.0 - u), minf(v, 1.0 - v))
		var rim := clampf(edge * 4.5, 0.0, 1.0)
		return 0.008 + rim * 0.022 + sin(u * 9.0 + v * 7.0) * 0.007
	)
	var gmat := MeshInstance3D.new()
	gmat.mesh = ground_mesh
	gmat.material_override = mat_mat
	root.add_child(gmat)

	# Quilted wool pad + blanket adapted to race proportions
	var prepared_node := Node3D.new()
	prepared_node.name = "BedPrepared"
	root.add_child(prepared_node)

	var quilt_mesh := _make_wrinkled_grid_mesh(0.76 * width_scale, 1.72 * len_scale, 7, 12, func(u: float, v: float, _x: float, _z: float) -> float:
		var crown := sin(clampf(u, 0.0, 1.0) * PI) * 0.055
		var length_drop := sin(clampf(v, 0.0, 1.0) * PI) * 0.03
		var wrinkle := sin(v * 14.0 + u * 5.0) * 0.012 + cos(u * 11.0 - v * 6.0) * 0.008
		return 0.032 + crown + length_drop + wrinkle
	)
	var blanket := MeshInstance3D.new()
	blanket.mesh = quilt_mesh
	blanket.material_override = mat_blanket
	blanket.position = Vector3(0.0, 0.0, 0.06 * len_scale)
	prepared_node.add_child(blanket)

	# Turned-down top collar cuff at head end (showing inner linen fold)
	var fold_mesh := _make_wrinkled_grid_mesh(0.74 * width_scale, 0.34, 6, 4, func(u: float, v: float, _x: float, _z: float) -> float:
		return 0.065 + sin(u * PI) * 0.035 + sin(v * PI) * 0.014
	)
	var fold := MeshInstance3D.new()
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
	anchor_b: Vector3 = Vector3(1.55, 0.0, 0.5)
) -> Dictionary:
	# Strictly open-sided weathered canvas tarp adapted per biome (zero enclosed walls!)
	var mat_canvas := MatKit.make_cloth_mat(
		Color("#b3a78e") if variant == "forest" else (Color("#bfb59d") if variant == "wreck-beach" else Color("#7d796f")),
		true, true
	)
	var mat_hem := MatKit.make_cloth_mat(Color("#777268"), true, true)
	var mat_wood := MatKit.make_wood_mat(Color("#5b4129"), true)
	var mat_rope := MatKit.make_cloth_mat(Color("#afa07b"), true, true)

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
	var span_x := 3.40 if variant == "forest" else (3.05 if variant == "wreck-beach" else 2.85)
	var span_z := 2.80 if variant == "forest" else (2.15 if variant == "wreck-beach" else 2.05)
	var capacity := 3 if variant == "forest" else 2
	var corners: Array[Vector3] = []

	if variant == "forest":
		# Overhead canopy tarp tied cleanly between two trunks (~2.08m apex so Elf can stand crouched, 3 heroes sit/sleep!)
		var ridge_h := 2.08
		var eave_h := 1.56
		var tarp_mesh := _make_wrinkled_grid_mesh(span_x, span_z, 10, 10, func(u: float, v: float, _x: float, _z: float) -> float:
			var dist_mid := absf(v - 0.5) * 2.0
			var tent_slope := lerpf(ridge_h, eave_h, pow(dist_mid, 1.1))
			var sag_x := -sin(u * PI) * 0.14 * (0.4 + dist_mid * 0.6)
			var ripple := sin(u * 12.0 + v * 7.0) * 0.025
			return tent_slope + sag_x + ripple
		)
		var tarp := MeshInstance3D.new()
		tarp.mesh = tarp_mesh
		tarp.material_override = mat_canvas
		roof_node.add_child(tarp)

		# Ridge hemp rope spanning cleanly to adjacent tree trunks + corner guy-lines to ground stakes
		var ridge_p0 := Vector3(-span_x * 0.48, ridge_h, 0.0)
		var ridge_p1 := Vector3(span_x * 0.48, ridge_h, 0.0)
		_add_guy_rope(roof_node, ridge_p0, ridge_p1, mat_rope)
		_add_guy_rope(shelter, ridge_p0, anchor_a + Vector3(0.0, 2.25, 0.0), mat_rope)
		_add_guy_rope(shelter, ridge_p1, anchor_b + Vector3(0.0, 2.25, 0.0), mat_rope)

		corners = [
			Vector3(-span_x * 0.48, eave_h, -span_z * 0.48),
			Vector3(span_x * 0.48, eave_h, -span_z * 0.48),
			Vector3(-span_x * 0.48, eave_h, span_z * 0.48),
			Vector3(span_x * 0.48, eave_h, span_z * 0.48),
		]
		# Guy-lines + wooden stakes driven diagonally into forest soil
		for c_i in range(corners.size()):
			var c: Vector3 = corners[c_i]
			var stake_pos := Vector3(c.x * 1.24, 0.0, c.z + (-0.65 if c.z < 0 else 0.65))
			_add_guy_rope(shelter, c, stake_pos + Vector3(0, 0.08, 0), mat_rope)
			var stake := MeshInstance3D.new()
			var skm := CylinderMesh.new(); skm.top_radius = 0.022; skm.bottom_radius = 0.012; skm.height = 0.34; skm.radial_segments = 6
			stake.mesh = skm; stake.material_override = mat_wood
			stake.position = stake_pos + Vector3(0, 0.12, 0)
			stake.rotation = Vector3(-0.48 if c.z < 0 else 0.48, 0.0, -0.2 if c.x < 0 else 0.2)
			shelter.add_child(stake)

	elif variant == "wreck-beach":
		# Windbreak tarp pitched for 2 huddled coastal sleepers
		var top_h := 1.48
		var bot_h := 0.20
		var tarp_mesh := _make_wrinkled_grid_mesh(span_x, span_z, 9, 8, func(u: float, v: float, _x: float, _z: float) -> float:
			var slope := lerpf(top_h, bot_h, v)
			var wind_billow := sin(u * PI) * sin(v * PI) * 0.13
			var fold := sin(u * 10.0) * 0.02
			return slope + wind_billow + fold
		)
		var tarp := MeshInstance3D.new()
		tarp.mesh = tarp_mesh
		tarp.material_override = mat_canvas
		roof_node.add_child(tarp)

		for sx in [-span_x * 0.44, span_x * 0.44]:
			var pole := MeshInstance3D.new()
			var plm := CylinderMesh.new(); plm.top_radius = 0.032; plm.bottom_radius = 0.044; plm.height = 1.48; plm.radial_segments = 7
			pole.mesh = plm; pole.material_override = mat_wood
			pole.position = Vector3(sx, 0.68, -span_z * 0.48)
			pole.rotation.x = 0.16
			shelter.add_child(pole)
			_add_guy_rope(shelter, Vector3(sx, top_h, -span_z * 0.48), Vector3(sx * 1.15, 0.12, -span_z * 0.85), mat_rope)
			env_kit.spawn_rock(shelter, Vector3(sx * 1.15, 0.06, -span_z * 0.85), Vector3(0.30, 0.20, 0.28), sx, mat_rock, 1, "rounded")

		# Hem anchor stones pinning bottom windbreak hem into sand
		for s_i in range(4):
			var hx := lerpf(-span_x * 0.40, span_x * 0.40, float(s_i) / 3.0)
			env_kit.spawn_rock(shelter, Vector3(hx, 0.06, span_z * 0.46), Vector3(0.24, 0.16, 0.22), float(s_i) * 1.1, mat_rock, s_i, "rounded")

	else:
		# cliff-observatory: Low storm-weighted tarp for 1-2 kneeling/lying defenders
		var top_h := 1.18
		var bot_h := 0.22
		var tarp_mesh := _make_wrinkled_grid_mesh(span_x, span_z, 9, 8, func(u: float, v: float, _x: float, _z: float) -> float:
			var slope := lerpf(top_h, bot_h, v)
			var wind_curve := sin(u * PI) * 0.08 + sin(u * 13.0 + v * 6.0) * 0.018
			return slope + wind_curve
		)
		var tarp := MeshInstance3D.new()
		tarp.mesh = tarp_mesh
		tarp.material_override = mat_hem
		roof_node.add_child(tarp)

		# 4 heavy basalt anchor stones + taut hemp cords (zero poles!)
		var anchors := [
			[Vector3(-span_x * 0.48, top_h, -span_z * 0.48), Vector3(-span_x * 0.62, 0.28, -span_z * 0.72)],
			[Vector3(span_x * 0.48, top_h, -span_z * 0.48), Vector3(span_x * 0.64, 0.28, -span_z * 0.68)],
			[Vector3(-span_x * 0.48, bot_h, span_z * 0.48), Vector3(-span_x * 0.56, 0.08, span_z * 0.66)],
			[Vector3(span_x * 0.48, bot_h, span_z * 0.48), Vector3(span_x * 0.56, 0.08, span_z * 0.66)],
		]
		for a_i in range(anchors.size()):
			var a_pair: Array = anchors[a_i]
			_add_guy_rope(shelter, a_pair[0], a_pair[1], mat_rope)
			env_kit.spawn_rock(shelter, Vector3(a_pair[1].x, 0.09, a_pair[1].z), Vector3(0.36, 0.25, 0.34), float(a_i) * 1.2, mat_rock, a_i, "stratified")

	return {"root": shelter, "roof": roof_node, "rect": Rect2(pos.x - 1.95, pos.z - 1.65, 3.9, 3.3), "capacity": capacity}

static func _add_guy_rope(parent: Node3D, from_pt: Vector3, to_pt: Vector3, mat: Material) -> void:
	var delta := to_pt - from_pt
	var dist := delta.length()
	if dist < 0.08:
		return
	var mid := (from_pt + to_pt) * 0.5
	var seg := MeshInstance3D.new()
	var cm := CylinderMesh.new(); cm.top_radius = 0.011; cm.bottom_radius = 0.011; cm.height = dist; cm.radial_segments = 5
	seg.mesh = cm; seg.material_override = mat
	seg.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parent.add_child(seg)
	seg.position = mid
	seg.look_at_from_position(mid, to_pt, Vector3.UP if absf(delta.normalized().y) < 0.95 else Vector3.FORWARD)
	seg.rotate_object_local(Vector3.RIGHT, PI * 0.5)

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
		# Gnarled mossy fallen log (~2.20m long, seats up to 3 party members!)
		seat_y = 0.36
		slots_local = [Vector3(-0.62, seat_y, 0.0), Vector3(0.0, seat_y, 0.0), Vector3(0.62, seat_y, 0.0)]
		var mat_bark := MatKit.make_wood_mat(Color("#543d2a"), true)
		var mat_moss := MatKit.make_textured_mat("moss.jpg", Color("#4e7442"), 0.90, "rock", Vector3(1.2, 1.2, 1.2), true, true)
		var seg_a := MeshInstance3D.new()
		var ca := CylinderMesh.new(); ca.top_radius = 0.21; ca.bottom_radius = 0.25; ca.height = 1.18; ca.radial_segments = 8
		seg_a.mesh = ca; seg_a.material_override = mat_bark
		seg_a.position = Vector3(-0.52, 0.19, 0.0); seg_a.rotation = Vector3(0.0, 0.06, PI * 0.5)
		sroot.add_child(seg_a)
		support_meshes.append(seg_a)

		var seg_b := MeshInstance3D.new()
		var cb := CylinderMesh.new(); cb.top_radius = 0.18; cb.bottom_radius = 0.21; cb.height = 1.05; cb.radial_segments = 8
		seg_b.mesh = cb; seg_b.material_override = mat_bark
		seg_b.position = Vector3(0.50, 0.18, 0.03); seg_b.rotation = Vector3(0.0, -0.08, PI * 0.5)
		sroot.add_child(seg_b)
		support_meshes.append(seg_b)

		var snag := MeshInstance3D.new()
		var snm := CylinderMesh.new(); snm.top_radius = 0.04; snm.bottom_radius = 0.08; snm.height = 0.34; snm.radial_segments = 6
		snag.mesh = snm; snag.material_override = mat_bark
		snag.position = Vector3(-0.82, 0.28, -0.14); snag.rotation = Vector3(-0.55, 0.2, 0.35)
		sroot.add_child(snag)

		for m_i in range(2):
			var moss_cap := MeshInstance3D.new()
			var mcm := SphereMesh.new(); mcm.radius = 0.16; mcm.height = 0.10; mcm.radial_segments = 7; mcm.rings = 3
			moss_cap.mesh = mcm; moss_cap.material_override = mat_moss
			moss_cap.position = Vector3(-0.35 + float(m_i) * 0.55, 0.35, -0.05)
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
		env_kit.spawn_rock(sroot, Vector3(0.48, 0.06, -0.22), Vector3(0.32, 0.24, 0.30), 1.4, mat_slab, int(seed_v) + 1, "craggy")

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

static func create_personal_kit(
	parent: Node3D,
	owner: String,
	pos: Vector3,
	yaw: float
) -> Node3D:
	var kroot := Node3D.new()
	kroot.name = "PersonalKit_" + owner
	kroot.position = pos
	kroot.rotation.y = yaw
	parent.add_child(kroot)

	var mat_leather := MatKit.make_textured_mat("oak-v4.webp", Color("#4e3422"), 0.72, "timber", Vector3(1.4, 1.4, 1.4), false, true)
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

	elif owner == "mia":
		# Woven travel prayer mat + bronze sacred medallion + tinder/incense box
		var mat_pad := MeshInstance3D.new()
		var mpm := BoxMesh.new(); mpm.size = Vector3(0.66, 0.016, 0.48)
		mat_pad.mesh = mpm; mat_pad.material_override = MatKit.make_textured_mat("wool-v4.webp", Color("#7b6043"), 0.90, "cloth", Vector3(1.5, 1.5, 1.5), false, true)
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

		# Two-tone rectangular whetstone + oil vial
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

	return kroot

static func create_portable_lantern(
	parent: Node3D,
	fx: CampAtmosphereFx,
	pos: Vector3
) -> Node3D:
	# Small portable ground-placed lantern (NEVER lit by default during bright day!)
	var lroot := Node3D.new()
	lroot.name = "PortableWatchLantern"
	lroot.position = pos
	parent.add_child(lroot)

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
		fx.register_lantern(light, mat_glass)

	return lroot
