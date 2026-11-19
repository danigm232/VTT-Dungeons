class_name RetreatSceneEnhancer
extends RefCounted

# ==============================================================================
# MEJORAS VISUALES Y ARQUITECTÓNICAS DEL RETIRO DEL DRAGÓN:
# 1. Techos de cueva excavados en la roca viva (A1 Celdas 1-6, A3 Comedor, A4 Biblioteca)
#    con arcos de entrada y ocultación dinámica (cutaway) al entrar con un personaje.
# 2. Mobiliario artesanal detallado en las 6 habitaciones de A1, Plaza A1, A3 y A4.
# 3. Césped vivo 3D (matas de hierba cruzada, tréboles, flores silvestres) y
#    macetas/jardineras desbordantes de vegetación mediterránea, helechos e hiedra.
# ==============================================================================

const Structure = preload("res://scripts/retreat_structure.gd")

# ------------------------------------------------------------------------------
# 1. TECHOS DE CUEVA EXCAVADOS Y OCULTACIÓN DINÁMICA AL ENTRAR
# ------------------------------------------------------------------------------
static func build_cave_roofs_and_archways(builder: Node3D) -> Array[Dictionary]:
	var roofs_root := Node3D.new()
	roofs_root.name = "ExcavatedCaveRoofs"
	builder.add_child(roofs_root)

	var rng := RandomNumberGenerator.new()
	rng.seed = 20261116

	var mat_cliff: Material = builder.get("_mat_carved_glb") if builder.get("_mat_carved_glb") else builder.get("mat_rock_carved")
	var mat_rock_dark: Material = builder.get("mat_rock_dark")
	var mat_stone_arch: Material = builder.get("_mat_limestone_glb") if builder.get("_mat_limestone_glb") else builder.get("mat_column")

	var mat_moss_roof := StandardMaterial3D.new()
	mat_moss_roof.vertex_color_use_as_albedo = true
	mat_moss_roof.vertex_color_is_srgb = true
	mat_moss_roof.cull_mode = BaseMaterial3D.CULL_DISABLED
	mat_moss_roof.roughness = 0.88
	var tex_cliff: Texture2D = builder.call("_load_tex", "coastal-rock.png")
	var norm_rock: Texture2D = builder.call("_load_tex", "rock-normal-v1.png")
	if tex_cliff:
		mat_moss_roof.albedo_texture = tex_cliff
		mat_moss_roof.uv1_triplanar = true
		mat_moss_roof.uv1_world_triplanar = true
		mat_moss_roof.uv1_scale = Vector3(0.22, 0.22, 0.22)
	if norm_rock:
		mat_moss_roof.normal_enabled = true
		mat_moss_roof.normal_texture = norm_rock
		mat_moss_roof.normal_scale = 0.65

	var roof_entries: Array[Dictionary] = []

	# 6 Celdas excavadas de A1 (cota suelo 9.0m, muros hasta 12.5m, roca superior hasta 15.2m)
	var a1_specs := [
		{"id": "cell_1", "label": "Celda 1", "x0": 76.3, "x1": 85.0, "z0": 76.0, "z1": 89.1, "door_x": 81.75},
		{"id": "cell_2", "label": "Celda de Tarak", "x0": 85.0, "x1": 95.2, "z0": 76.0, "z1": 89.1, "door_x": 90.75},
		{"id": "cell_3", "label": "Celda de Varnoth", "x0": 95.2, "x1": 106.5, "z0": 76.0, "z1": 89.1, "door_x": 101.25},
		{"id": "cell_4", "label": "Taller de Myla", "x0": 106.5, "x1": 117.8, "z0": 76.0, "z1": 89.1, "door_x": 111.75},
		{"id": "cell_5", "label": "Kobolds Oeste", "x0": 117.8, "x1": 126.6, "z0": 76.0, "z1": 89.1, "door_x": 122.25},
		{"id": "cell_6", "label": "Kobolds Este", "x0": 126.6, "x1": 136.8, "z0": 76.0, "z1": 89.1, "door_x": 131.25},
	]

	for sp in a1_specs:
		var rnode := Node3D.new()
		rnode.name = "CaveRoof_" + str(sp["id"])
		roofs_root.add_child(rnode)

		var x0 := float(sp["x0"])
		var x1 := float(sp["x1"])
		var z0 := float(sp["z0"])
		var z1 := float(sp["z1"])
		var door_x := float(sp["door_x"])

		# Bóveda pétrea esculpida que se funde con el farallón hacia el norte (las puertas ya existen en A1Room/A1Ctx)
		var vault_mesh := _create_cave_vault_mesh(x0, x1, z0, z1, 12.15, 14.95, door_x, 2.5, rng, Color("#606a68"), Color("#4b6343"))
		var v_inst := MeshInstance3D.new()
		v_inst.name = "VaultMesh"
		v_inst.mesh = vault_mesh
		v_inst.material_override = mat_moss_roof
		rnode.add_child(v_inst)

		var front_wall_w_l := (door_x - 1.35) - x0
		if front_wall_w_l > 0.35:
			add_box_collider(builder, Vector3(x0 + front_wall_w_l * 0.5, 10.6, z1 - 0.12), Vector3(front_wall_w_l, 3.2, 0.55))
		var front_wall_w_r := x1 - (door_x + 1.35)
		if front_wall_w_r > 0.35:
			add_box_collider(builder, Vector3((door_x + 1.35) + front_wall_w_r * 0.5, 10.6, z1 - 0.12), Vector3(front_wall_w_r, 3.2, 0.55))
		# Muro trasero y tabique oeste de la celda
		add_box_collider(builder, Vector3((x0 + x1) * 0.5, 10.6, z0 + 0.15), Vector3(x1 - x0, 3.2, 0.55))
		add_box_collider(builder, Vector3(x0, 10.6, (z0 + z1) * 0.5), Vector3(0.55, 3.2, (z1 - z0) - 0.4))

		roof_entries.append({
			"id": str(sp["id"]),
			"group": "a1_caves",
			"node": rnode,
			"rect": Rect2(x0, z0, x1 - x0, (z1 - z0) - 0.35),
			"door_rect": Rect2(door_x - 1.65, z1 - 1.2, 3.3, 2.1),
			"y_min": 7.5,
			"y_max": 13.8
		})
	# Tabique este final de Celda 6
	add_box_collider(builder, Vector3(136.8, 10.6, 82.55), Vector3(0.55, 3.2, 12.7))

	# Bóveda de caverna para A4 Biblioteca (cota 18.0m, empotrada hasta z=46.2 en la montaña norte)
	var a4_roof := Node3D.new()
	a4_roof.name = "CaveRoof_a4_library"
	roofs_root.add_child(a4_roof)
	var a4_mesh := _create_cave_vault_mesh(85.8, 112.55, 46.2, 65.35, 20.65, 26.85, 102.75, 3.2, rng, Color("#5f6968"), Color("#496340"))
	var a4_inst := MeshInstance3D.new()
	a4_inst.name = "A4VaultMesh"
	a4_inst.mesh = a4_mesh
	a4_inst.material_override = mat_moss_roof
	a4_roof.add_child(a4_inst)
	_build_cave_portal_trim(a4_roof, 102.75, 18.0, 65.28, 3.1, 2.75, mat_stone_arch, mat_rock_dark)
	# Muros físicos perimetrales de la caverna A4 (dejando vano amplio en x=101.1..104.4)
	add_box_collider(builder, Vector3(99.2, 19.6, 51.6), Vector3(26.8, 3.4, 0.7))
	add_box_collider(builder, Vector3(86.1, 19.6, 58.5), Vector3(0.65, 3.4, 13.8))
	add_box_collider(builder, Vector3(93.6, 19.6, 65.2), Vector3(14.8, 3.4, 0.65))
	add_box_collider(builder, Vector3(108.4, 19.6, 65.2), Vector3(8.0, 3.4, 0.65))
	var ridge_mesh_upper := make_basalt_outcrop_mesh(411)
	for rx_a4 in [90.2, 98.4, 106.8]:
		var cr := MeshInstance3D.new()
		cr.name = "A4RidgeCrag_%d" % int(rx_a4)
		cr.mesh = ridge_mesh_upper
		cr.material_override = mat_rock_dark
		cr.position = Vector3(rx_a4, 21.8, 55.5)
		cr.scale = Vector3(2.8, 2.4, 2.2)
		cr.rotation.y = rx_a4 * 0.17
		a4_roof.add_child(cr)

	roof_entries.append({
		"id": "a4_library",
		"group": "a4",
		"node": a4_roof,
		"rect": Rect2(86.2, 51.5, 25.2, 13.4),
		"door_rect": Rect2(100.8, 64.2, 3.9, 2.2),
		"y_min": 16.5,
		"y_max": 22.5
	})

	# Bóveda de caverna para A3 Comedor y Cocina (cota 18.0m, unida sin hueco a A4 y a la montaña norte)
	var a3_roof := Node3D.new()
	a3_roof.name = "CaveRoof_a3_dining"
	roofs_root.add_child(a3_roof)
	var a3_mesh := _create_cave_vault_mesh(112.45, 131.8, 46.2, 65.35, 20.65, 26.85, 121.5, 3.2, rng, Color("#606a68"), Color("#4a6441"))
	var a3_inst := MeshInstance3D.new()
	a3_inst.name = "A3VaultMesh"
	a3_inst.mesh = a3_mesh
	a3_inst.material_override = mat_moss_roof
	a3_roof.add_child(a3_inst)
	_build_cave_portal_trim(a3_roof, 121.5, 18.0, 65.28, 3.1, 2.75, mat_stone_arch, mat_rock_dark)
	# Tabique divisorio A4/A3 y muros perimetrales de caverna A3 (vano puerta en x=119.8..123.2)
	add_box_collider(builder, Vector3(112.5, 19.6, 58.3), Vector3(0.65, 3.4, 13.8))
	add_box_collider(builder, Vector3(122.1, 19.6, 50.6), Vector3(19.2, 3.4, 0.7))
	add_box_collider(builder, Vector3(131.5, 19.6, 58.3), Vector3(0.65, 3.4, 13.8))
	add_box_collider(builder, Vector3(116.2, 19.6, 65.2), Vector3(7.2, 3.4, 0.65))
	add_box_collider(builder, Vector3(127.3, 19.6, 65.2), Vector3(8.2, 3.4, 0.65))
	for rx_a3 in [116.5, 125.6]:
		var cr3 := MeshInstance3D.new()
		cr3.name = "A3RidgeCrag_%d" % int(rx_a3)
		cr3.mesh = ridge_mesh_upper
		cr3.material_override = mat_rock_dark
		cr3.position = Vector3(rx_a3, 21.8, 55.8)
		cr3.scale = Vector3(2.6, 2.3, 2.1)
		cr3.rotation.y = rx_a3 * 0.21
		a3_roof.add_child(cr3)

	roof_entries.append({
		"id": "a3_dining",
		"group": "a3",
		"node": a3_roof,
		"rect": Rect2(113.5, 50.4, 18.0, 14.5),
		"door_rect": Rect2(119.5, 64.2, 4.0, 2.2),
		"y_min": 16.5,
		"y_max": 22.5
	})

	return roof_entries

static func _build_cave_portal_trim(roof_parent: Node3D, cx: float, y0: float, z: float, width: float, height: float, mat_arch: Material, mat_rock: Material) -> void:
	# Dintel y dovelas talladas en caliza/basalto integrados en la bóveda (desaparecen al entrar)
	_box(roof_parent, Vector3(cx, y0 + height - 0.10, z + 0.10), Vector3(width + 0.72, 0.44, 0.56), mat_arch)
	_box(roof_parent, Vector3(cx, y0 + height + 0.04, z + 0.14), Vector3(0.56, 0.58, 0.64), mat_arch)
	for side_v in [-1.0, 1.0]:
		_box(roof_parent, Vector3(cx + float(side_v) * (width * 0.5 + 0.24), y0 + height * 0.48, z + 0.08), Vector3(0.38, height * 0.92, 0.46), mat_rock)

static func _create_cave_vault_mesh(x0: float, x1: float, z0: float, z1: float, front_y: float, back_y: float, door_x: float, door_w: float, rng: RandomNumberGenerator, rock_col: Color, moss_col: Color) -> ArrayMesh:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var nx := 24
	var nz := 14
	var grid: Array = []
	for iz in range(nz + 1):
		var fz := float(iz) / float(nz) # 0 = fondo norte (z0), 1 = frente sur (z1)
		var z := lerpf(z0, z1, fz)
		var row_pts: Array[Vector3] = []
		var row_cols: Array[Color] = []
		for ix in range(nx + 1):
			var fx := float(ix) / float(nx)
			var x := lerpf(x0, x1, fx)
			# Perfil de estratos volcánicos escalonados con crestas irregulares de roca viva
			var arch_x := sin(fx * PI)
			var shelf := floorf((1.0 - fz) * 3.4) * 0.22
			var base_h := lerpf(back_y, front_y, pow(fz, 0.76)) + shelf * 0.35
			var dome := 0.72 * arch_x * (1.0 - 0.32 * fz)
			var crag := 0.34 * sin(x * 0.52 + z * 0.44) + 0.18 * cos(x * 1.15 - z * 0.92) + 0.10 * sin(x * 2.1 + z * 1.6)
			# Hendidura en arco sobre la puerta en el frente sur
			var door_dist := absf(x - door_x)
			var door_arch := 0.0
			if fz > 0.72 and door_dist < door_w * 0.75:
				door_arch = 0.46 * (1.0 - door_dist / (door_w * 0.75)) * ((fz - 0.72) / 0.28)
			var y := base_h + dome + crag + door_arch
			row_pts.append(Vector3(x, y, z))
			# Dominio de basalto tallado en el frente/escarpes y musgo agrupado en repisas superiores
			var ledge_mask := clampf(0.5 + 0.5 * sin(x * 0.42 + z * 0.55), 0.0, 1.0)
			var moss_f := clampf(((1.0 - fz) * 0.55 * ledge_mask) - 0.08 + rng.randf_range(-0.06, 0.06), 0.0, 0.62)
			var strata_shade := rock_col.darkened(clampf((fz - 0.65) * 0.32, 0.0, 0.18))
			row_cols.append(strata_shade.lerp(moss_col, moss_f))
		grid.append({"pts": row_pts, "cols": row_cols})

	for iz in range(nz):
		var ra: Array = grid[iz]["pts"]
		var rb: Array = grid[iz + 1]["pts"]
		var ca: Array = grid[iz]["cols"]
		var cb: Array = grid[iz + 1]["cols"]
		for ix in range(nx):
			_emit_quad_grid_xz(st, ra[ix], ra[ix + 1], rb[ix + 1], rb[ix], ca[ix], ca[ix + 1], cb[ix + 1], cb[ix])

	# Faldón frontal rocoso escalonado (cierra el frente salvo el vano de la puerta)
	var front_row: Array = grid[nz]["pts"]
	var front_col: Array = grid[nz]["cols"]
	for ix in range(nx):
		var pa: Vector3 = front_row[ix]
		var pb: Vector3 = front_row[ix + 1]
		var mid_x := (pa.x + pb.x) * 0.5
		var is_door_span := absf(mid_x - door_x) < door_w * 0.52
		var drop := 0.42 if is_door_span else 2.45
		var ba := Vector3(pa.x, pa.y - drop, pa.z + 0.16)
		var bb := Vector3(pb.x, pb.y - drop, pb.z + 0.16)
		var dark_c := rock_col.darkened(0.24)
		_emit_quad_grid_xz(st, pa, pb, bb, ba, front_col[ix], front_col[ix + 1], dark_c, dark_c)

	st.generate_normals()
	return st.commit()

static func _build_cave_mouth_arch(static_parent: Node3D, roof_parent: Node3D, cx: float, y0: float, z: float, width: float, height: float, mat_arch: Material, mat_rock: Material, rng: RandomNumberGenerator) -> void:
	# Jambas laterales de piedra tallada (siempre visibles para enmarcar la entrada)
	var hw := width * 0.5
	for side_v in [-1.0, 1.0]:
		var side := float(side_v)
		var jamb := MeshInstance3D.new()
		var jm := BoxMesh.new()
		jm.size = Vector3(0.46, height * 0.86, 0.68)
		jamb.mesh = jm
		jamb.material_override = mat_arch
		jamb.position = Vector3(cx + side * (hw + 0.18), y0 + height * 0.43, z)
		static_parent.add_child(jamb)
		add_box_collider(jamb, Vector3.ZERO, jm.size)
		tag_camera_occluder(jamb)

		# Peñasco de encastre junto a la jamba
		var crag := MeshInstance3D.new()
		var sm := SphereMesh.new()
		sm.radius = 0.42; sm.height = 0.88; sm.radial_segments = 7; sm.rings = 4
		crag.mesh = sm
		crag.material_override = mat_rock
		crag.position = Vector3(cx + side * (hw + 0.48), y0 + 0.42, z + 0.15)
		crag.scale = Vector3(1.1, 1.25, 0.95)
		static_parent.add_child(crag)
		add_cyl_collider(static_parent, crag.position, 0.44, 0.95)

	# Dintel y dovelas superiores (se ocultan junto con el techo al entrar para no tapar al personaje)
	var lintel := MeshInstance3D.new()
	var lm := BoxMesh.new()
	lm.size = Vector3(width + 0.95, 0.52, 0.78)
	lintel.mesh = lm
	lintel.material_override = mat_arch
	lintel.position = Vector3(cx, y0 + height - 0.12, z)
	roof_parent.add_child(lintel)

	var keystone := MeshInstance3D.new()
	var km := BoxMesh.new()
	km.size = Vector3(0.58, 0.68, 0.86)
	keystone.mesh = km
	keystone.material_override = mat_arch
	keystone.position = Vector3(cx, y0 + height - 0.06, z + 0.02)
	roof_parent.add_child(keystone)

static func update_cave_roof_cutaways(builder: Node3D, roof_entries: Array[Dictionary]) -> void:
	if roof_entries.is_empty() or not builder.is_inside_tree():
		return
	var tree := builder.get_tree()
	if not tree:
		return

	var tokens: Array = tree.get_nodes_in_group("party_tokens")
	var parent_node := builder.get_parent()
	if parent_node:
		for tname in ["PlayerToken", "RogueToken", "WizardToken"]:
			var tn := parent_node.get_node_or_null(tname)
			if tn and not tokens.has(tn):
				tokens.append(tn)
	var cam := parent_node.get_node_or_null("TacticalCamera") if parent_node else null
	var cam_focus := Vector3.ZERO
	var cam_dist := 999.0
	if cam:
		if cam.get("focus_point") is Vector3:
			cam_focus = cam.get("focus_point")
		if cam.get("current_distance") != null:
			cam_dist = float(cam.get("current_distance"))

	for entry in roof_entries:
		var rnode: Node3D = entry.get("node")
		if not is_instance_valid(rnode):
			continue
		var rect: Rect2 = entry["rect"]
		var door_rect: Rect2 = entry.get("door_rect", Rect2())
		var y_min := float(entry["y_min"])
		var y_max := float(entry["y_max"])
		var should_open := false

		for tok in tokens:
			if tok is Node3D:
				var p := (tok as Node3D).global_position
				if p.y >= y_min and p.y <= y_max and (rect.has_point(Vector2(p.x, p.z)) or (door_rect.size.x > 0.0 and door_rect.has_point(Vector2(p.x, p.z)))):
					should_open = true
					break

		# Si la cámara táctica hace zoom directo al interior de la sala/celda, abrir también su techo
		if not should_open and cam_dist < 28.0:
			if cam_focus.y >= y_min and cam_focus.y <= y_max and rect.has_point(Vector2(cam_focus.x, cam_focus.z)):
				should_open = true

		rnode.visible = not should_open

# ------------------------------------------------------------------------------
# 2. MOBILIARIO ARTESANAL DE LAS HABITACIONES (A1, A3, A4) Y DE LA PLAZA (A1)
# ------------------------------------------------------------------------------
static func build_rooms_and_plaza_furniture(builder: Node3D) -> void:
	var furn_root := Node3D.new()
	furn_root.name = "ArtisanFurniture"
	builder.add_child(furn_root)

	var mat_oak: Material = builder.get("mat_wood")
	var mat_dark_oak: Material = builder.get("mat_wood_dark")
	var mat_stone: Material = builder.get("mat_column")
	var mat_rock: Material = builder.get("mat_rock_carved")
	var mat_iron: Material = builder.get("mat_iron")
	var mat_bronze: Material = builder.get("mat_bronze")
	var mat_gold: Material = builder.get("mat_gold")
	var mat_flame: Material = builder.get("mat_flame")
	var mat_water: Material = builder.get("mat_pool_water")
	var mat_linen: Material = builder.get("_mat_linen_glb") if builder.get("_mat_linen_glb") else builder.get("mat_cloth_warm")
	var mat_pottery: Material = builder.get("_mat_pottery_glb") if builder.get("_mat_pottery_glb") else builder.get("mat_cloth_warm")

	var mat_blanket_ochre: Material = builder.call("_make_mat", Color("#c88a36"), 0.88, 0.0)
	var mat_blanket_sage: Material = builder.call("_make_mat", Color("#4a7c4e"), 0.88, 0.0)
	var mat_blanket_blue: Material = builder.call("_make_mat", Color("#3b6285"), 0.88, 0.0)
	var mat_blanket_crimson: Material = builder.call("_make_mat", Color("#a63e38"), 0.88, 0.0)
	var mat_rug_warm: Material = builder.call("_make_mat", Color("#8c4436"), 0.92, 0.0)
	var mat_rug_blue: Material = builder.call("_make_mat", Color("#3d5a73"), 0.92, 0.0)
	var mat_rug_gold: Material = builder.call("_make_mat", Color("#b88e44"), 0.92, 0.0)
	var mat_glass_herb: Material = builder.call("_make_mat", Color(0.32, 0.76, 0.48, 0.85), 0.18, 0.1)

	var y_a1 := Structure.ELEV_A1_PLAZA

	# --- A. LAS 6 CELDAS EXCAVADAS DE A1 ---
	var cells_furn := Node3D.new()
	cells_furn.name = "A1_Cells_Furniture"
	furn_root.add_child(cells_furn)

	var mat_cell_floor: Material = builder.get("mat_cell_floor") if builder.get("mat_cell_floor") else mat_stone
	var cell_floor_rects := [
		Rect2(76.8, 79.0, 7.6, 8.8),
		Rect2(86.2, 76.6, 7.6, 11.2),
		Rect2(96.4, 78.0, 8.6, 9.8),
		Rect2(108.2, 76.8, 8.4, 11.0),
		Rect2(119.2, 76.6, 5.8, 11.2),
		Rect2(127.8, 76.8, 7.6, 11.0),
	]
	for cf_r in cell_floor_rects:
		_box(cells_furn, Vector3(cf_r.position.x + cf_r.size.x * 0.5, y_a1 + 0.08, cf_r.position.y + cf_r.size.y * 0.5), Vector3(cf_r.size.x, 0.03, cf_r.size.y), mat_cell_floor)

	# Celda 1 (Habitación libre de peregrinos): cama, mesita, escritorio, silla, alfombra, baúl
	_build_pilgrim_bed(cells_furn, "a1-room-1-bed", Vector3(78.5, y_a1, 81.2), 0.0, mat_dark_oak, mat_linen, mat_blanket_ochre)
	_build_nightstand_with_candle(cells_furn, Vector3(80.0, y_a1, 80.2), mat_oak, mat_bronze, mat_flame)
	_build_monastic_desk_and_chair(cells_furn, Vector3(81.8, y_a1, 81.8), -PI * 0.5, mat_oak, mat_dark_oak, mat_linen, mat_bronze)
	_build_woven_rug(cells_furn, Vector3(80.2, y_a1 + 0.11, 83.2), Vector2(2.4, 3.0), mat_rug_gold, mat_blanket_ochre)
	_build_bound_chest(cells_furn, Vector3(78.3, y_a1, 84.6), 0.25, mat_dark_oak, mat_iron, mat_bronze)

	# Celda 2 (Celda de Tarak — Herborista): cama, mesita, mesa herbolaria con mortero y frascos, estante de hierbas
	_build_pilgrim_bed(cells_furn, "a1-room-2-bed", Vector3(87.6, y_a1, 79.4), 0.0, mat_dark_oak, mat_linen, mat_blanket_sage)
	_build_nightstand_with_candle(cells_furn, Vector3(89.1, y_a1, 78.6), mat_oak, mat_bronze, mat_flame)
	_build_monastic_desk_and_chair(cells_furn, Vector3(90.9, y_a1, 81.6), -PI * 0.5, mat_oak, mat_dark_oak, mat_linen, mat_bronze)
	_build_herbalist_rack_and_potions(cells_furn, Vector3(87.5, y_a1, 83.6), mat_dark_oak, mat_pottery, mat_glass_herb, mat_blanket_sage)
	_build_woven_rug(cells_furn, Vector3(89.5, y_a1 + 0.11, 82.8), Vector2(2.5, 3.4), mat_blanket_sage, mat_rug_gold)

	# Celda 3 (Celda de Varnoth — Comandante): cama, mesita, escritorio con mapa táctico, armero con escudo y espada, arcón
	_build_pilgrim_bed(cells_furn, "a1-room-3-bed", Vector3(98.0, y_a1, 80.8), 0.0, mat_dark_oak, mat_linen, mat_blanket_blue)
	_build_nightstand_with_candle(cells_furn, Vector3(99.6, y_a1, 79.9), mat_oak, mat_bronze, mat_flame)
	_build_monastic_desk_and_chair(cells_furn, Vector3(102.2, y_a1, 80.6), -PI * 0.5, mat_oak, mat_dark_oak, mat_linen, mat_bronze)
	_build_weapon_and_shield_rack(cells_furn, Vector3(97.8, y_a1, 84.2), mat_dark_oak, mat_iron, mat_bronze, mat_blanket_blue)
	_build_bound_chest(cells_furn, Vector3(102.6, y_a1, 84.2), -0.4, mat_dark_oak, mat_iron, mat_bronze)
	_build_woven_rug(cells_furn, Vector3(100.2, y_a1 + 0.11, 83.2), Vector2(2.8, 3.2), mat_rug_blue, mat_rug_gold)

	# Celda 4 (Taller de Myla — Artesana): cama, mesita, banco de artificiero con engranajes y alambique, cajas
	_build_pilgrim_bed(cells_furn, "a1-room-4-bed", Vector3(109.6, y_a1, 80.8), 0.0, mat_dark_oak, mat_linen, mat_blanket_crimson)
	_build_nightstand_with_candle(cells_furn, Vector3(111.1, y_a1, 79.9), mat_oak, mat_bronze, mat_flame)
	_build_tinker_workbench(cells_furn, Vector3(112.8, y_a1, 80.2), mat_oak, mat_dark_oak, mat_bronze, mat_iron, mat_glass_herb)
	_build_monastic_desk_and_chair(cells_furn, Vector3(113.0, y_a1, 83.6), -PI * 0.5, mat_oak, mat_dark_oak, mat_linen, mat_bronze)
	_build_woven_rug(cells_furn, Vector3(111.2, y_a1 + 0.11, 83.4), Vector2(2.6, 3.2), mat_rug_warm, mat_rug_gold)

	# Celda 5 (Kobolds Oeste — 4 hamacas colgadas + alfombra + brasero)
	var kw_positions := [
		Vector3(120.3, y_a1, 79.0), Vector3(122.3, y_a1, 79.0),
		Vector3(120.3, y_a1, 82.0), Vector3(122.3, y_a1, 82.0)
	]
	var kw_mats := [mat_blanket_ochre, mat_blanket_crimson, mat_blanket_sage, mat_blanket_blue]
	for i in range(4):
		_build_kobold_hammock(cells_furn, kw_positions[i], 0.08 if i % 2 == 0 else -0.08, mat_dark_oak, kw_mats[i], mat_linen)
	_build_woven_rug(cells_furn, Vector3(121.3, y_a1 + 0.11, 81.5), Vector2(1.8, 3.8), mat_rug_gold, mat_blanket_crimson)
	_build_brazier_stand(cells_furn, Vector3(121.3, y_a1, 84.6), mat_iron, mat_bronze, mat_flame)

	# Celda 6 (Kobolds Este — 4 hamacas colgadas + alfombra + brasero + baúl)
	var ke_positions := [
		Vector3(129.3, y_a1, 79.4), Vector3(132.2, y_a1, 79.4),
		Vector3(129.3, y_a1, 82.4), Vector3(132.2, y_a1, 82.4)
	]
	for i in range(4):
		_build_kobold_hammock(cells_furn, ke_positions[i], -0.08 if i % 2 == 0 else 0.08, mat_dark_oak, kw_mats[(i + 1) % 4], mat_linen)
	_build_woven_rug(cells_furn, Vector3(130.8, y_a1 + 0.11, 81.8), Vector2(2.2, 3.8), mat_rug_warm, mat_rug_gold)
	_build_brazier_stand(cells_furn, Vector3(130.8, y_a1, 84.8), mat_iron, mat_bronze, mat_flame)
	_build_bound_chest(cells_furn, Vector3(132.6, y_a1, 84.8), -0.35, mat_oak, mat_iron, mat_bronze)

	# --- B. PLAZA CENTRAL DE A1 (Hoguera, trébede con caldero, bancos curvos, pérgolas, pozo/fuente, altar de Astalagan) ---
	var plaza_furn := Node3D.new()
	plaza_furn.name = "A1_Plaza_Furniture"
	furn_root.add_child(plaza_furn)

	var fire_center := Structure.cell_to_world(72, 62, y_a1) # (108.75, 9.0, 93.75)
	_build_plaza_hearth_and_benches(plaza_furn, fire_center, mat_stone, mat_dark_oak, mat_oak, mat_iron, mat_bronze, mat_flame, mat_blanket_crimson, mat_blanket_blue)

	# Altar votivo frente a la estatua de Astalagan desplazado al borde sur para despejar el paseo frente a C1-C6
	_build_astalagan_shrine_altar(plaza_furn, Vector3(86.25, y_a1, 95.55), mat_stone, mat_bronze, mat_gold, mat_flame, mat_blanket_ochre)

	# Fuente / pozo monástico de piedra desplazado al sur de la franja central (94.2, 9.0, 95.15)
	_build_monastic_well_fountain(plaza_furn, Vector3(94.2, y_a1, 95.15), mat_stone, mat_dark_oak, mat_iron, mat_water)

	# 1 Pérgola compacta al este del paseo (123.5, 9.0, 95.0) dejando >=3.0m libres delante de C1-C6 (z=89.2..92.6)
	_build_cloister_pergola_and_table(plaza_furn, Vector3(123.5, y_a1, 95.0), mat_dark_oak, mat_oak, mat_pottery, mat_bronze, mat_flame, mat_blanket_ochre)

	# Suministros, barriles y tablón de avisos en la esquina suroeste junto a la llegada de la escalera (76.2, 9.0, 95.65)
	_build_plaza_supply_corner(plaza_furn, Vector3(76.2, y_a1, 95.65), mat_oak, mat_dark_oak, mat_iron, mat_linen)

	# --- C. REFUERZO DE MOBILIARIO EN A3 (COMEDOR/COCINA) Y A4 (BIBLIOTECA) ---
	var y_upper := Structure.ELEV_A3_DINING
	var a3_furn := Node3D.new()
	a3_furn.name = "A3_Refectory_Furniture"
	furn_root.add_child(a3_furn)
	_build_a3_banquet_and_hearth(a3_furn, y_upper, mat_oak, mat_dark_oak, mat_stone, mat_iron, mat_bronze, mat_pottery, mat_linen, mat_flame)

	var a4_furn := Node3D.new()
	a4_furn.name = "A4_Scriptorium_Furniture"
	furn_root.add_child(a4_furn)
	_build_a4_scriptorium_details(a4_furn, y_upper, mat_dark_oak, mat_oak, mat_linen, mat_bronze, mat_gold, mat_flame, mat_rug_blue, mat_blanket_crimson, mat_blanket_sage)

	# Consolidar mallas estáticas por material y sombra dentro de cada bloque para reducir draw calls
	merge_static_children_by_material(cells_furn)
	merge_static_children_by_material(plaza_furn)
	merge_static_children_by_material(a3_furn)
	merge_static_children_by_material(a4_furn)

static func _build_pilgrim_bed(parent: Node3D, id: String, pos: Vector3, yaw: float, mat_frame: Material, mat_sheet: Material, mat_blanket: Material) -> void:
	var bed := Node3D.new()
	bed.name = id
	bed.position = pos
	bed.rotation.y = yaw
	bed.set_meta("rest_head", Vector3(0.0, 0.681, -0.72))
	bed.set_meta("rest_bedding", 0.622)
	bed.set_meta("rest_foot", 0.96)
	bed.set_meta("rest_width", 1.10)
	parent.add_child(bed)
	# Bastidor y 4 postes torneados
	_box(bed, Vector3(0.0, 0.28, 0.0), Vector3(1.22, 0.22, 2.15), mat_frame)
	_box(bed, Vector3(0.0, 0.68, -1.02), Vector3(1.24, 0.78, 0.12), mat_frame) # cabecero
	_box(bed, Vector3(0.0, 0.48, 1.02), Vector3(1.24, 0.44, 0.10), mat_frame)  # piecero
	for dx in [-0.56, 0.56]:
		for dz in [-1.02, 1.02]:
			_cyl(bed, Vector3(dx, 0.52, dz), 0.07, 1.04, mat_frame)
	# Colchón de lino, almohada y manta doblada
	_box(bed, Vector3(0.0, 0.45, 0.0), Vector3(1.10, 0.20, 1.94), mat_sheet)
	_box(bed, Vector3(0.0, 0.59, -0.72), Vector3(0.86, 0.14, 0.38), mat_sheet)
	_box(bed, Vector3(0.0, 0.48, 0.32), Vector3(1.14, 0.22, 1.22), mat_blanket)
	add_box_collider(bed, Vector3(0.0, 0.52, 0.0), Vector3(1.26, 1.04, 2.20))

static func _build_nightstand_with_candle(parent: Node3D, pos: Vector3, mat_wood: Material, mat_brass: Material, mat_flame: Material) -> void:
	var ns := Node3D.new()
	ns.position = pos
	parent.add_child(ns)
	_box(ns, Vector3(0.0, 0.38, 0.0), Vector3(0.62, 0.76, 0.56), mat_wood)
	_box(ns, Vector3(0.0, 0.78, 0.0), Vector3(0.68, 0.06, 0.62), mat_wood)
	_cyl(ns, Vector3(0.0, 0.84, 0.0), 0.09, 0.06, mat_brass)
	_cyl(ns, Vector3(0.0, 0.94, 0.0), 0.035, 0.16, mat_flame)
	add_box_collider(ns, Vector3(0.0, 0.45, 0.0), Vector3(0.68, 0.90, 0.62))

static func _build_monastic_desk_and_chair(parent: Node3D, pos: Vector3, yaw: float, mat_wood: Material, mat_dark: Material, mat_paper: Material, mat_brass: Material) -> void:
	var d := Node3D.new()
	d.position = pos
	d.rotation.y = yaw
	parent.add_child(d)
	_box(d, Vector3(0.0, 0.76, 0.0), Vector3(1.45, 0.08, 0.78), mat_wood)
	for dx in [-0.62, 0.62]:
		_box(d, Vector3(dx, 0.38, 0.0), Vector3(0.12, 0.76, 0.68), mat_dark)
	# Pergamino abierto y tintero
	_box(d, Vector3(-0.15, 0.81, 0.02), Vector3(0.46, 0.02, 0.34), mat_paper)
	_cyl(d, Vector3(0.35, 0.84, -0.15), 0.05, 0.09, mat_brass)
	# Silla con respaldo
	_box(d, Vector3(0.0, 0.45, 0.68), Vector3(0.52, 0.06, 0.50), mat_dark)
	_box(d, Vector3(0.0, 0.76, 0.90), Vector3(0.50, 0.58, 0.07), mat_dark)
	for sx in [-0.21, 0.21]:
		for sz in [0.47, 0.89]:
			_cyl(d, Vector3(sx, 0.22, sz), 0.04, 0.44, mat_dark)
	add_box_collider(d, Vector3(0.0, 0.48, 0.0), Vector3(1.48, 0.96, 0.80))
	add_box_collider(d, Vector3(0.0, 0.50, 0.68), Vector3(0.56, 1.00, 0.54))

static func _build_kobold_hammock(parent: Node3D, pos: Vector3, yaw: float, mat_wood: Material, mat_cloth: Material, mat_pillow: Material) -> void:
	var h := Node3D.new()
	h.position = pos
	h.rotation.y = yaw
	parent.add_child(h)
	# 2 Postes de anclaje de roble con travesaño
	for dz in [-1.05, 1.05]:
		_cyl(h, Vector3(0.0, 0.62, dz), 0.08, 1.24, mat_wood)
	# Lona curva en catenaria (3 segmentos)
	var b0 := _box(h, Vector3(0.0, 0.56, -0.58), Vector3(0.82, 0.07, 0.68), mat_cloth)
	b0.rotation.x = 0.22
	_box(h, Vector3(0.0, 0.48, 0.0), Vector3(0.86, 0.08, 0.64), mat_cloth)
	var b1 := _box(h, Vector3(0.0, 0.56, 0.58), Vector3(0.82, 0.07, 0.68), mat_cloth)
	b1.rotation.x = -0.22
	_box(h, Vector3(0.0, 0.62, -0.62), Vector3(0.54, 0.10, 0.28), mat_pillow)
	add_box_collider(h, Vector3(0.0, 0.62, 0.0), Vector3(0.92, 1.25, 2.24))

static func _build_herbalist_rack_and_potions(parent: Node3D, pos: Vector3, mat_wood: Material, mat_pot: Material, mat_glass: Material, mat_herb: Material) -> void:
	var r := Node3D.new()
	r.position = pos
	parent.add_child(r)
	_box(r, Vector3(0.0, 0.95, 0.0), Vector3(1.5, 1.9, 0.42), mat_wood)
	for dx in [-0.45, 0.0, 0.45]:
		_cyl(r, Vector3(dx, 1.15, 0.05), 0.11, 0.26, mat_glass)
		_cyl(r, Vector3(dx, 0.62, 0.05), 0.14, 0.28, mat_pot)
		_box(r, Vector3(dx, 1.62, 0.08), Vector3(0.22, 0.34, 0.18), mat_herb)
	add_box_collider(r, Vector3(0.0, 0.95, 0.0), Vector3(1.52, 1.90, 0.46))
	tag_camera_occluder(r)

static func _build_weapon_and_shield_rack(parent: Node3D, pos: Vector3, mat_wood: Material, mat_iron: Material, mat_brass: Material, mat_emblem: Material) -> void:
	var w := Node3D.new()
	w.position = pos
	parent.add_child(w)
	_box(w, Vector3(0.0, 0.85, 0.0), Vector3(1.4, 1.7, 0.38), mat_wood)
	_cyl(w, Vector3(-0.35, 0.95, 0.22), 0.38, 0.08, mat_emblem) # escudo
	_cyl(w, Vector3(-0.35, 0.95, 0.26), 0.12, 0.10, mat_brass)
	for dx in [0.15, 0.42]:
		_box(w, Vector3(dx, 0.95, 0.20), Vector3(0.08, 1.25, 0.04), mat_iron)
		_box(w, Vector3(dx, 1.38, 0.20), Vector3(0.28, 0.06, 0.06), mat_brass)
	add_box_collider(w, Vector3(0.0, 0.85, 0.0), Vector3(1.44, 1.70, 0.48))
	tag_camera_occluder(w)

static func _build_tinker_workbench(parent: Node3D, pos: Vector3, mat_wood: Material, mat_dark: Material, mat_brass: Material, mat_iron: Material, mat_glass: Material) -> void:
	var tb := Node3D.new()
	tb.position = pos
	parent.add_child(tb)
	_box(tb, Vector3(0.0, 0.42, 0.0), Vector3(2.1, 0.84, 0.82), mat_dark)
	_box(tb, Vector3(0.0, 0.86, 0.0), Vector3(2.2, 0.08, 0.90), mat_wood)
	# Engranajes de bronce y alambique
	_cyl(tb, Vector3(-0.55, 0.94, 0.0), 0.22, 0.06, mat_brass)
	_cyl(tb, Vector3(-0.18, 0.94, 0.12), 0.15, 0.06, mat_iron)
	_cyl(tb, Vector3(0.48, 1.08, -0.05), 0.16, 0.38, mat_glass)
	_cyl(tb, Vector3(0.48, 1.34, -0.05), 0.06, 0.22, mat_brass)
	add_box_collider(tb, Vector3(0.0, 0.50, 0.0), Vector3(2.22, 1.00, 0.92))

static func _build_bound_chest(parent: Node3D, pos: Vector3, yaw: float, mat_wood: Material, mat_iron: Material, mat_brass: Material) -> void:
	var c := Node3D.new()
	c.position = pos
	c.rotation.y = yaw
	parent.add_child(c)
	_box(c, Vector3(0.0, 0.28, 0.0), Vector3(0.92, 0.56, 0.54), mat_wood)
	_box(c, Vector3(-0.32, 0.29, 0.0), Vector3(0.08, 0.58, 0.56), mat_iron)
	_box(c, Vector3(0.32, 0.29, 0.0), Vector3(0.08, 0.58, 0.56), mat_iron)
	_box(c, Vector3(0.0, 0.34, 0.28), Vector3(0.14, 0.16, 0.04), mat_brass)
	add_box_collider(c, Vector3(0.0, 0.35, 0.0), Vector3(0.96, 0.70, 0.58))

static func _build_woven_rug(parent: Node3D, pos: Vector3, size: Vector2, mat_main: Material, mat_border: Material) -> void:
	var r := Node3D.new()
	r.position = pos
	parent.add_child(r)
	_box(r, Vector3.ZERO, Vector3(size.x, 0.025, size.y), mat_border)
	_box(r, Vector3(0.0, 0.008, 0.0), Vector3(size.x * 0.82, 0.025, size.y * 0.82), mat_main)

static func _build_brazier_stand(parent: Node3D, pos: Vector3, mat_iron: Material, mat_brass: Material, mat_flame: Material) -> void:
	var b := Node3D.new()
	b.position = pos
	parent.add_child(b)
	_cyl(b, Vector3(0.0, 0.35, 0.0), 0.28, 0.70, mat_iron)
	_cyl(b, Vector3(0.0, 0.72, 0.0), 0.42, 0.16, mat_brass)
	_cyl(b, Vector3(0.0, 0.86, 0.0), 0.24, 0.22, mat_flame)
	add_cyl_collider(b, Vector3(0.0, 0.50, 0.0), 0.44, 1.00)

static func _build_plaza_hearth_and_benches(parent: Node3D, center: Vector3, mat_stone: Material, mat_dark_oak: Material, mat_oak: Material, mat_iron: Material, mat_brass: Material, mat_flame: Material, mat_cush_a: Material, mat_cush_b: Material) -> void:
	var h := Node3D.new()
	h.name = "PlazaHearthRing"
	h.position = center
	parent.add_child(h)

	# Anillo de bloques de piedra caliza tallada y lecho de brasas vivas
	for i in range(12):
		var ang := (float(i) / 12.0) * TAU
		var b := _box(h, Vector3(cos(ang) * 1.18, 0.20, sin(ang) * 1.18), Vector3(0.62, 0.40, 0.42), mat_stone)
		b.rotation.y = -ang + PI * 0.5
	_cyl(h, Vector3(0.0, 0.06, 0.0), 0.92, 0.10, mat_iron)
	_cyl(h, Vector3(0.0, 0.12, 0.0), 0.64, 0.06, mat_flame)

	# Troncos cruzados de roble y llamas en varias lenguas
	for i in range(4):
		var lang := float(i) * PI * 0.25
		var lg := _cyl(h, Vector3(0.0, 0.22, 0.0), 0.12, 1.45, mat_dark_oak)
		lg.rotation = Vector3(PI * 0.5, lang, 0.15)
	_build_flame_cluster(h, Vector3(0.0, 0.26, 0.0), 1.0, mat_flame)

	# Trébede de hierro forjado con caldero suspendido
	for i in range(3):
		var tang := (float(i) / 3.0) * TAU + 0.3
		var leg := _cyl(h, Vector3(cos(tang) * 0.62, 0.92, sin(tang) * 0.62), 0.04, 1.95, mat_iron)
		leg.rotation = Vector3(sin(tang) * 0.34, 0.0, -cos(tang) * 0.34)
	_cyl(h, Vector3(0.0, 0.78, 0.0), 0.38, 0.42, mat_iron)
	_cyl(h, Vector3(0.0, 0.98, 0.0), 0.41, 0.06, mat_brass)
	_cyl(h, Vector3(0.0, 1.32, 0.0), 0.025, 0.75, mat_brass)
	add_cyl_collider(h, Vector3(0.0, 0.65, 0.0), 1.44, 1.30)

	# 2 Bancos monásticos alineados Este-Oeste junto a la hoguera (despeja el corredor norte frente a C1-C6 y paso sur)
	var bench_angles := [0.0, PI]
	for idx in range(bench_angles.size()):
		var ang: float = bench_angles[idx]
		var dist := 2.45
		var bp := Vector3(cos(ang) * dist, 0.0, sin(ang) * dist)
		var bench := Node3D.new()
		bench.name = "PlazaBenchEast" if idx == 0 else "PlazaBenchWest"
		bench.position = bp
		bench.rotation.y = -ang + PI * 0.5
		h.add_child(bench)
		_box(bench, Vector3(0.0, 0.44, 0.0), Vector3(1.90, 0.09, 0.56), mat_oak)
		_box(bench, Vector3(0.0, 0.80, -0.24), Vector3(1.85, 0.42, 0.08), mat_dark_oak)
		var left := _box(bench, Vector3(-0.44, 0.51, 0.02), Vector3(0.76, 0.07, 0.44), mat_cush_a if idx % 2 == 0 else mat_cush_b)
		var right := _box(bench, Vector3(0.44, 0.51, 0.02), Vector3(0.76, 0.07, 0.44), mat_cush_b if idx % 2 == 0 else mat_cush_a)
		left.name = "LeftCushion"
		right.name = "RightCushion"
		for lx in [-0.74, 0.74]:
			_box(bench, Vector3(lx, 0.22, 0.0), Vector3(0.20, 0.44, 0.50), mat_stone)
		add_box_collider(bench, Vector3(0.0, 0.50, 0.0), Vector3(1.94, 1.00, 0.60))

static func _build_flame_cluster(parent: Node3D, pos: Vector3, scale_mul: float, mat_flame: Material) -> void:
	for offset_spec in [
		[Vector3(0.0, 0.28, 0.0), 0.24, 0.56],
		[Vector3(-0.14, 0.20, 0.08), 0.14, 0.38],
		[Vector3(0.15, 0.22, -0.09), 0.15, 0.42],
		[Vector3(0.04, 0.18, 0.14), 0.12, 0.32],
	]:
		var f_inst := MeshInstance3D.new()
		var cm := CylinderMesh.new()
		cm.top_radius = 0.02 * scale_mul
		cm.bottom_radius = float(offset_spec[1]) * scale_mul
		cm.height = float(offset_spec[2]) * scale_mul
		cm.radial_segments = 7
		f_inst.mesh = cm
		f_inst.material_override = mat_flame
		f_inst.position = pos + (offset_spec[0] as Vector3) * scale_mul
		f_inst.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		parent.add_child(f_inst)

static func _build_astalagan_shrine_altar(parent: Node3D, pos: Vector3, mat_stone: Material, mat_brass: Material, mat_gold: Material, mat_flame: Material, mat_cloth: Material) -> void:
	var a := Node3D.new()
	a.name = "AstalaganAltar"
	a.position = pos
	parent.add_child(a)
	_box(a, Vector3(0.0, 0.42, 0.0), Vector3(1.85, 0.84, 0.92), mat_stone)
	_box(a, Vector3(0.0, 0.86, 0.0), Vector3(2.02, 0.10, 1.06), mat_stone)
	_box(a, Vector3(0.0, 0.46, 0.0), Vector3(0.76, 0.88, 0.96), mat_cloth)
	_cyl(a, Vector3(0.0, 0.98, 0.0), 0.26, 0.14, mat_gold)
	for dx in [-0.68, 0.68]:
		_cyl(a, Vector3(dx, 0.98, 0.0), 0.10, 0.16, mat_brass)
		_cyl(a, Vector3(dx, 1.12, 0.0), 0.05, 0.16, mat_flame)
	add_box_collider(a, Vector3(0.0, 0.55, 0.0), Vector3(2.04, 1.10, 1.08))

static func _build_monastic_well_fountain(parent: Node3D, pos: Vector3, mat_stone: Material, mat_wood: Material, mat_iron: Material, mat_water: Material) -> void:
	var w := Node3D.new()
	w.name = "MonasticFountainWell"
	w.position = pos
	parent.add_child(w)
	# Brocal de sillería segmentado en piedra y espejo interior de agua profunda
	for i in range(10):
		var ang := (float(i) / 10.0) * TAU
		var seg := _box(w, Vector3(cos(ang) * 1.08, 0.44, sin(ang) * 1.08), Vector3(0.74, 0.88, 0.34), mat_stone)
		seg.rotation.y = -ang + PI * 0.5
		var cap := _box(w, Vector3(cos(ang) * 1.08, 0.91, sin(ang) * 1.08), Vector3(0.78, 0.10, 0.42), mat_stone)
		cap.rotation.y = -ang + PI * 0.5
	_cyl(w, Vector3(0.0, 0.42, 0.0), 0.96, 0.65, mat_iron)
	_cyl(w, Vector3(0.0, 0.78, 0.0), 0.96, 0.06, mat_water)
	for dx in [-1.05, 1.05]:
		_box(w, Vector3(dx, 1.42, 0.0), Vector3(0.20, 1.98, 0.20), mat_wood)
	_box(w, Vector3(0.0, 2.38, 0.0), Vector3(2.45, 0.20, 0.30), mat_wood)
	# Rodillo de torno con cuerda y cubo de roble cinchado en hierro
	var roller := _cyl(w, Vector3(0.0, 1.96, 0.0), 0.14, 1.92, mat_wood)
	roller.rotation.z = PI * 0.5
	_cyl(w, Vector3(0.0, 1.56, 0.0), 0.025, 0.80, mat_wood)
	_cyl(w, Vector3(0.0, 1.12, 0.0), 0.18, 0.32, mat_wood)
	_cyl(w, Vector3(0.0, 1.22, 0.0), 0.19, 0.05, mat_iron)
	_cyl(w, Vector3(0.0, 1.02, 0.0), 0.19, 0.05, mat_iron)
	add_cyl_collider(w, Vector3(0.0, 1.10, 0.0), 1.10, 2.20)
	add_box_collider(w, Vector3(0.0, 2.38, 0.0), Vector3(2.45, 0.30, 0.36))
	tag_camera_occluder(w)

static func _build_cloister_pergola_and_table(parent: Node3D, pos: Vector3, mat_dark: Material, mat_oak: Material, mat_pot: Material, mat_brass: Material, mat_flame: Material, mat_runner: Material) -> void:
	var p := Node3D.new()
	p.position = pos
	parent.add_child(p)
	# 4 Columnas de madera y emparrado superior compacto (dz = +-0.98 para mantener libres los carriles N y S)
	for dx in [-1.65, 1.65]:
		for dz in [-0.98, 0.98]:
			_cyl(p, Vector3(dx, 1.55, dz), 0.10, 3.10, mat_dark)
			add_cyl_collider(p, Vector3(dx, 1.25, dz), 0.15, 2.50)
	for dz in [-0.98, 0.98]:
		_box(p, Vector3(0.0, 3.08, dz), Vector3(3.7, 0.16, 0.16), mat_dark)
		add_box_collider(p, Vector3(0.0, 3.08, dz), Vector3(3.7, 0.28, 0.24))
	for i in range(6):
		var rx := lerpf(-1.6, 1.6, float(i) / 5.0)
		_box(p, Vector3(rx, 3.20, 0.0), Vector3(0.11, 0.11, 2.3), mat_oak)

	# Mesa comunal compacta + 2 bancos estrechos + jarras y farol
	_box(p, Vector3(0.0, 0.76, 0.0), Vector3(2.4, 0.09, 0.86), mat_oak)
	_box(p, Vector3(0.0, 0.81, 0.0), Vector3(2.15, 0.02, 0.34), mat_runner)
	for dx in [-0.92, 0.92]:
		_box(p, Vector3(dx, 0.38, 0.0), Vector3(0.16, 0.76, 0.68), mat_dark)
	for dz in [-0.66, 0.66]:
		_box(p, Vector3(0.0, 0.44, dz), Vector3(2.25, 0.08, 0.36), mat_oak)
		for lx in [-0.82, 0.82]:
			_box(p, Vector3(lx, 0.22, dz), Vector3(0.13, 0.44, 0.30), mat_dark)
		add_box_collider(p, Vector3(0.0, 0.34, dz), Vector3(2.30, 0.68, 0.40))
	add_box_collider(p, Vector3(0.0, 0.48, 0.0), Vector3(2.45, 0.96, 0.90))
	tag_camera_occluder(p)
	_cyl(p, Vector3(-0.65, 0.94, -0.12), 0.14, 0.28, mat_pot)
	_cyl(p, Vector3(0.55, 0.90, 0.10), 0.18, 0.12, mat_brass)
	_cyl(p, Vector3(0.0, 2.75, 0.0), 0.12, 0.26, mat_flame)

static func _build_plaza_supply_corner(parent: Node3D, pos: Vector3, mat_oak: Material, mat_dark: Material, mat_iron: Material, mat_paper: Material) -> void:
	var s := Node3D.new()
	s.position = pos
	parent.add_child(s)
	# Tablón de anuncios del monasterio
	_box(s, Vector3(-1.2, 1.1, -0.4), Vector3(1.35, 1.10, 0.12), mat_oak)
	_box(s, Vector3(-1.75, 0.85, -0.4), Vector3(0.14, 1.70, 0.14), mat_dark)
	_box(s, Vector3(-0.65, 0.85, -0.4), Vector3(0.14, 1.70, 0.14), mat_dark)
	_box(s, Vector3(-1.35, 1.15, -0.32), Vector3(0.38, 0.46, 0.02), mat_paper)
	_box(s, Vector3(-0.95, 1.08, -0.32), Vector3(0.34, 0.38, 0.02), mat_paper)
	# Barriles y cajas apiladas
	_cyl(s, Vector3(0.3, 0.45, 0.2), 0.34, 0.90, mat_dark)
	_cyl(s, Vector3(1.05, 0.45, 0.35), 0.34, 0.90, mat_oak)
	_box(s, Vector3(0.65, 0.38, -0.45), Vector3(0.78, 0.76, 0.78), mat_oak)
	_box(s, Vector3(0.65, 0.98, -0.45), Vector3(0.56, 0.48, 0.56), mat_dark)
	add_box_collider(s, Vector3(-1.2, 0.85, -0.4), Vector3(1.42, 1.70, 0.30))
	add_cyl_collider(s, Vector3(0.3, 0.45, 0.2), 0.36, 0.95)
	add_cyl_collider(s, Vector3(1.05, 0.45, 0.35), 0.36, 0.95)
	add_box_collider(s, Vector3(0.65, 0.62, -0.45), Vector3(0.84, 1.24, 0.84))
	tag_camera_occluder(s)

static func _build_a3_banquet_and_hearth(parent: Node3D, y: float, mat_oak: Material, mat_dark: Material, mat_stone: Material, mat_iron: Material, mat_brass: Material, mat_pot: Material, mat_linen: Material, mat_flame: Material) -> void:
	# 2 Grandes mesas de refectorio en A3 (z=58.2 y z=61.8) + bancos corridos y vajilla agrupada
	for tz in [58.2, 61.8]:
		var b := Node3D.new()
		b.position = Vector3(122.4, y, tz)
		parent.add_child(b)
		_box(b, Vector3(0.0, 0.78, 0.0), Vector3(7.4, 0.11, 1.25), mat_oak)
		_box(b, Vector3(0.0, 0.84, 0.0), Vector3(6.9, 0.02, 0.44), mat_linen)
		for dx in [-2.8, 0.0, 2.8]:
			_box(b, Vector3(dx, 0.39, 0.0), Vector3(0.24, 0.78, 1.02), mat_dark)
			_cyl(b, Vector3(dx, 0.90, 0.0), 0.14, 0.08, mat_brass)
			_cyl(b, Vector3(dx, 0.99, 0.0), 0.04, 0.12, mat_flame)
			_cyl(b, Vector3(dx + 0.72, 0.93, 0.24), 0.10, 0.22, mat_pot)
			for p_side in [-0.34, 0.34]:
				_cyl(b, Vector3(dx + 0.35, 0.86, p_side), 0.15, 0.025, mat_linen)
				_cyl(b, Vector3(dx - 0.55, 0.86, p_side), 0.14, 0.025, mat_linen)
				_cyl(b, Vector3(dx - 0.35, 0.91, p_side * 0.78), 0.06, 0.12, mat_brass)
		for dz in [-0.96, 0.96]:
			_box(b, Vector3(0.0, 0.45, dz), Vector3(6.8, 0.08, 0.40), mat_oak)
			for lx in [-2.7, 0.0, 2.7]:
				_box(b, Vector3(lx, 0.22, dz), Vector3(0.18, 0.44, 0.36), mat_dark)
			add_box_collider(b, Vector3(0.0, 0.34, dz), Vector3(6.85, 0.68, 0.44))
		add_box_collider(b, Vector3(0.0, 0.48, 0.0), Vector3(7.45, 0.96, 1.30))

	# Fogón de piedra con brasas vivas, caldero, mortero y repisa de cocina en el ala norte
	var k := Node3D.new()
	k.position = Vector3(116.8, y, 52.3)
	parent.add_child(k)
	_box(k, Vector3(0.0, 0.52, 0.0), Vector3(3.2, 1.04, 1.45), mat_stone)
	_box(k, Vector3(-0.55, 1.10, -0.35), Vector3(1.4, 0.55, 0.45), mat_stone)
	_cyl(k, Vector3(-0.55, 1.08, 0.08), 0.42, 0.06, mat_iron)
	_build_flame_cluster(k, Vector3(-0.55, 1.09, 0.08), 0.65, mat_flame)
	_cyl(k, Vector3(-0.55, 1.42, 0.08), 0.42, 0.40, mat_iron)
	_cyl(k, Vector3(-0.55, 1.62, 0.08), 0.44, 0.05, mat_brass)
	_cyl(k, Vector3(0.75, 1.24, 0.05), 0.22, 0.36, mat_pot)
	_cyl(k, Vector3(1.18, 1.16, 0.15), 0.14, 0.20, mat_oak)
	add_box_collider(k, Vector3(0.0, 0.72, 0.0), Vector3(3.25, 1.44, 1.50))
	# Isla/mostrador de preparación, cajas de víveres y toneles de despensa
	_box(parent, Vector3(117.2, y + 0.44, 54.6), Vector3(3.4, 0.88, 0.82), mat_dark)
	_box(parent, Vector3(117.2, y + 0.90, 54.6), Vector3(3.6, 0.08, 0.92), mat_oak)
	_cyl(parent, Vector3(116.4, y + 0.98, 54.6), 0.24, 0.05, mat_oak)
	_cyl(parent, Vector3(118.1, y + 1.06, 54.5), 0.14, 0.26, mat_pot)
	_cyl(parent, Vector3(128.4, y + 0.48, 52.6), 0.38, 0.96, mat_dark)
	_cyl(parent, Vector3(129.4, y + 0.48, 52.8), 0.38, 0.96, mat_oak)
	add_box_collider(parent, Vector3(117.2, y + 0.50, 54.6), Vector3(3.62, 1.00, 0.95))
	add_cyl_collider(parent, Vector3(128.4, y + 0.50, 52.6), 0.40, 1.00)
	add_cyl_collider(parent, Vector3(129.4, y + 0.50, 52.8), 0.40, 1.00)

static func _build_bookcase_unit(parent: Node3D, pos: Vector3, yaw: float, width: float, mat_dark: Material, mat_oak: Material, mat_brass: Material, mat_paper: Material, book_mats: Array, is_island: bool) -> void:
	var sh := Node3D.new()
	sh.position = pos
	sh.rotation.y = yaw
	parent.add_child(sh)
	var height := 2.18 if is_island else 2.48
	var depth := 0.56
	# Montantes laterales, cornisa superior y zócalo (sin bloquear el hueco donde van los libros)
	for sx in [-width * 0.47, width * 0.47]:
		_box(sh, Vector3(sx, height * 0.5, 0.0), Vector3(0.14, height, depth), mat_dark)
	_box(sh, Vector3(0.0, height - 0.07, 0.02), Vector3(width + 0.10, 0.14, depth + 0.08), mat_dark)
	_box(sh, Vector3(0.0, 0.10, 0.0), Vector3(width, 0.20, depth), mat_dark)
	if not is_island:
		_box(sh, Vector3(0.0, height * 0.5, -depth * 0.42), Vector3(width - 0.12, height - 0.16, 0.07), mat_dark)

	var shelf_count := 3
	var slot_cols := 7 if is_island else 8
	for row_i in range(shelf_count):
		var sy := 0.34 + float(row_i) * 0.66
		_box(sh, Vector3(0.0, sy, 0.0), Vector3(width - 0.14, 0.07, depth - 0.04), mat_oak)
		for b_i in range(slot_cols):
			var bx := lerpf(-width * 0.39, width * 0.39, float(b_i) / float(slot_cols - 1))
			if (row_i + b_i) % 7 == 5:
				# Pergamino enrollado y palmatoria de latón alternados entre los tomos
				var sc := _cyl(sh, Vector3(bx, sy + 0.11, 0.08), 0.07, 0.34, mat_paper)
				sc.rotation.z = PI * 0.5
			else:
				var bh := 0.34 + float((row_i * 3 + b_i) % 4) * 0.045
				var bz_off := 0.08 if not is_island else 0.0
				_box(sh, Vector3(bx, sy + 0.035 + bh * 0.5, bz_off), Vector3(0.24, bh, 0.34), book_mats[(row_i * 2 + b_i) % book_mats.size()])
	_cyl(sh, Vector3(width * 0.25, height + 0.07, 0.05), 0.09, 0.14, mat_brass)
	add_box_collider(sh, Vector3(0.0, height * 0.5, 0.0), Vector3(width + 0.10, height, depth + 0.12))
	tag_camera_occluder(sh)

static func _build_a4_scriptorium_details(parent: Node3D, y: float, mat_dark: Material, mat_oak: Material, mat_paper: Material, mat_brass: Material, mat_gold: Material, _mat_flame: Material, mat_blue: Material, mat_red: Material, mat_green: Material) -> void:
	# Alfombra central de estudio, globo celeste, atriles y estanterías con baldas abiertas y libros visibles
	_build_woven_rug(parent, Vector3(99.5, y + 0.06, 58.8), Vector2(11.2, 5.2), mat_blue, mat_gold)
	var g := Node3D.new()
	g.position = Vector3(99.5, y, 58.8)
	parent.add_child(g)
	_cyl(g, Vector3(0.0, 0.48, 0.0), 0.26, 0.96, mat_dark)
	_cyl(g, Vector3(0.0, 1.22, 0.0), 0.46, 0.46, mat_brass)
	add_cyl_collider(g, Vector3(0.0, 0.72, 0.0), 0.48, 1.44)
	for dx in [-4.2, 4.2]:
		_build_monastic_desk_and_chair(parent, Vector3(99.5 + dx, y, 60.8), 0.0, mat_oak, mat_dark, mat_paper, mat_brass)

	# Mesa de cartografía en el ala este con códice, brújula y candelabro
	_box(parent, Vector3(107.6, y + 0.42, 58.2), Vector3(1.6, 0.84, 2.8), mat_dark)
	_box(parent, Vector3(107.6, y + 0.86, 58.2), Vector3(1.75, 0.08, 2.95), mat_oak)
	_box(parent, Vector3(107.6, y + 0.91, 58.2), Vector3(1.15, 0.02, 2.10), mat_paper)
	_cyl(parent, Vector3(107.3, y + 0.97, 57.5), 0.10, 0.12, mat_brass)
	_cyl(parent, Vector3(107.3, y + 1.07, 57.5), 0.035, 0.12, _mat_flame)
	_box(parent, Vector3(108.05, y + 0.95, 59.0), Vector3(0.38, 0.10, 0.48), mat_red)
	add_box_collider(parent, Vector3(107.6, y + 0.50, 58.2), Vector3(1.80, 1.00, 3.00))

	# Estanterías murales norte (z=53.1) y 3 islas de lectura abiertas (x=91.5, 95.8, 103.5)
	var book_mats := [mat_red, mat_blue, mat_green, mat_gold]
	for sx in [89.8, 93.4, 97.0, 100.6, 104.2, 107.8]:
		_build_bookcase_unit(parent, Vector3(sx, y, 53.1), 0.0, 3.1, mat_dark, mat_oak, mat_brass, mat_paper, book_mats, false)

	for ix in [91.5, 95.8, 103.5]:
		_build_bookcase_unit(parent, Vector3(ix, y, 57.2), PI * 0.5, 2.8, mat_dark, mat_oak, mat_brass, mat_paper, book_mats, true)

# ------------------------------------------------------------------------------
# 3. CÉSPED VIVO 3D, PRADERAS FLORIDAS Y MACETAS REBOSANTES
# ------------------------------------------------------------------------------
static func build_vibrant_grass_and_planters(builder: Node3D, terrain_data: Dictionary) -> void:
	var grass_root := Node3D.new()
	grass_root.name = "VibrantMeadowsAndPlanters"
	builder.add_child(grass_root)

	var rng := RandomNumberGenerator.new()
	rng.seed = 20261117

	var tuft_xf: Array[Transform3D] = []
	var tuft_col: Array[Color] = []
	var fern_xf: Array[Transform3D] = []
	var fern_col: Array[Color] = []
	var wildflower_xf: Array[Transform3D] = []
	var wildflower_col: Array[Color] = []

	var grass_tones: Array[Color] = [
		Color("#4b6b3a"), Color("#5b7d46"), Color("#6d8f52"), Color("#3e5b32"), Color("#7d995c")
	]
	var fern_tones: Array[Color] = [
		Color("#36552c"), Color("#436636"), Color("#517642"), Color("#2e4a26")
	]
	var blossom_tones: Array[Color] = [
		Color("#d6b45a"), Color("#9a7cc4"), Color("#c96972"), Color("#efe6cb"), Color("#d4824e"), Color("#b8567c")
	]

	# A. Sembrar matas de césped vivo 3D y flores silvestres sobre las zonas verdes y jardines (sin invadir escaleras ni pasarelas de madera)
	var surf_array: Array = terrain_data.get("surfaces", [])
	for surf in surf_array:
		var sid: String = str(surf.get("id", ""))
		var tiles: Array = surf.get("tiles", [])
		if not (sid in ["upper", "a1", "a5"]):
			continue
		for entry in tiles:
			var cell: Dictionary = entry.get("cell", {})
			var col := int(cell.get("col", 0))
			var row := int(cell.get("row", 0))
			var corners: Array = entry.get("corners", [0.0, 0.0, 0.0, 0.0])
			var y_avg := (float(corners[0]) + float(corners[1]) + float(corners[2]) + float(corners[3])) * 0.25
			var wx := (float(col) + 0.5) * Structure.TILE_METERS
			var wz := (float(row) + 0.5) * Structure.TILE_METERS
			if wx < 18.0 and wz > 85.0 and y_avg < 8.5:
				continue

			# En A1, A5 y Upper, concentrar el césped en Z7 Gardens y bordes verdes (nunca sobre el pavimento del templo A5 ni escaleras)
			var is_garden_zone := (wx >= 72.0 and wx <= 85.8 and wz >= 54.0 and wz <= 64.8)
			var is_a5_stone := (sid == "a5" and wx >= 33.4 and wx <= 47.6 and wz >= 62.5 and wz <= 76.8)
			var is_verge := is_garden_zone or (sid == "a5" and not is_a5_stone) or (sid == "a1" and (wz > 96.4 and wx >= 74.0 and wx <= 134.0))
			if not is_verge:
				continue
			if rng.randf() > (0.85 if is_garden_zone else 0.52):
				continue

			var count := rng.randi_range(2, 4) if is_garden_zone else rng.randi_range(1, 3)
			for _k in range(count):
				var gx := wx + rng.randf_range(-0.68, 0.68)
				var gz := wz + rng.randf_range(-0.68, 0.68)
				var gsc := rng.randf_range(0.55, 1.05)
				var gb := Basis.from_euler(Vector3(rng.randf_range(-0.08, 0.08), rng.randf_range(0.0, TAU), rng.randf_range(-0.08, 0.08))).scaled(Vector3(gsc, gsc * rng.randf_range(0.85, 1.25), gsc))
				tuft_xf.append(Transform3D(gb, Vector3(gx, y_avg + 0.02, gz)))
				tuft_col.append(grass_tones[rng.randi() % grass_tones.size()])

				if rng.randf() < 0.34:
					var fsc := rng.randf_range(0.11, 0.19)
					var fb := Basis().scaled(Vector3(fsc, fsc * 1.15, fsc))
					wildflower_xf.append(Transform3D(fb, Vector3(gx + rng.randf_range(-0.15, 0.15), y_avg + 0.22 * gsc, gz + rng.randf_range(-0.15, 0.15))))
					wildflower_col.append(blossom_tones[rng.randi() % blossom_tones.size()])

			if rng.randf() < 0.32:
				var fsc2 := rng.randf_range(0.55, 0.95)
				var fnb := Basis.from_euler(Vector3(0.0, rng.randf_range(0.0, TAU), 0.0)).scaled(Vector3(fsc2, fsc2, fsc2))
				fern_xf.append(Transform3D(fnb, Vector3(wx + rng.randf_range(-0.5, 0.5), y_avg + 0.04, wz + rng.randf_range(-0.5, 0.5))))
				fern_col.append(fern_tones[rng.randi() % fern_tones.size()])

	# B. Sembrar césped vivo sobre los techos de las cuevas y las praderas del bosque
	var under_pts: Array = terrain_data.get("understory_points", [])
	for u in under_pts:
		var upos := Vector3(float(u.get("x", 0.0)), float(u.get("y", 20.0)), float(u.get("z", 0.0)))
		for _j in range(2):
			var gsc := rng.randf_range(0.75, 1.35)
			var gb := Basis.from_euler(Vector3(0.0, rng.randf_range(0.0, TAU), 0.0)).scaled(Vector3(gsc, gsc, gsc))
			tuft_xf.append(Transform3D(gb, upos + Vector3(rng.randf_range(-1.1, 1.1), -0.05, rng.randf_range(-1.1, 1.1))))
			tuft_col.append(grass_tones[rng.randi() % grass_tones.size()])
		if rng.randf() < 0.55:
			var fsc := rng.randf_range(0.75, 1.25)
			var fnb := Basis.from_euler(Vector3(0.0, rng.randf_range(0.0, TAU), 0.0)).scaled(Vector3(fsc, fsc, fsc))
			fern_xf.append(Transform3D(fnb, upos + Vector3(rng.randf_range(-0.8, 0.8), -0.02, rng.randf_range(-0.8, 0.8))))
			fern_col.append(fern_tones[rng.randi() % fern_tones.size()])

	var grass_mat := StandardMaterial3D.new()
	grass_mat.vertex_color_use_as_albedo = true
	grass_mat.vertex_color_is_srgb = true
	grass_mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	grass_mat.roughness = 0.76
	grass_mat.backlight_enabled = true
	grass_mat.backlight = Color(0.35, 0.55, 0.22)

	grass_root.add_child(builder.call("_make_multimesh_batch", "MM_VibrantGrassTufts", make_grass_tuft_mesh(), grass_mat, tuft_xf, tuft_col))
	grass_root.add_child(builder.call("_make_multimesh_batch", "MM_LushFerns", make_fern_cluster_mesh(), grass_mat, fern_xf, fern_col))
	grass_root.add_child(builder.call("_make_multimesh_batch", "MM_WildflowerBlossoms", builder.call("_make_flower_mesh"), grass_mat, wildflower_xf, wildflower_col))

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
		var c_base := Color(0.58, 0.72, 0.52)
		var c_tip := Color(1.0, 1.0, 0.88)
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
		var r_mid := 0.36
		var r_tip := 0.68
		var h_mid := 0.34
		var h_tip := 0.14
		var w := 0.13
		var dir := Vector3(cos(ang), 0.0, sin(ang))
		var right := Vector3(-dir.z * w, 0.0, dir.x * w)
		var base := Vector3(0.0, 0.04, 0.0)
		var mid_l := dir * r_mid + Vector3(0.0, h_mid, 0.0) - right
		var mid_r := dir * r_mid + Vector3(0.0, h_mid, 0.0) + right
		var tip := dir * r_tip + Vector3(0.0, h_tip, 0.0)
		var c_in := Color(0.62, 0.78, 0.56)
		var c_out := Color(0.98, 1.0, 0.85)
		st.set_color(c_in); st.add_vertex(base)
		st.set_color(c_out); st.add_vertex(mid_r)
		st.set_color(c_out); st.add_vertex(mid_l)
		st.set_color(c_out); st.add_vertex(mid_l)
		st.set_color(c_out); st.add_vertex(mid_r)
		st.set_color(c_out); st.add_vertex(tip)
	st.generate_normals()
	return st.commit()

static func make_lush_canopy_cluster_mesh() -> ArrayMesh:
	# Reemplaza las esferas simples por una copa orgánica de 5 lóbulos con gradiente de luz solar
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var lobes := [
		{"pos": Vector3(0.0, 0.14, 0.0), "rx": 0.48, "ry": 0.42, "rz": 0.48},
		{"pos": Vector3(0.24, -0.02, 0.16), "rx": 0.38, "ry": 0.34, "rz": 0.38},
		{"pos": Vector3(-0.24, 0.0, 0.14), "rx": 0.38, "ry": 0.35, "rz": 0.36},
		{"pos": Vector3(0.14, 0.02, -0.24), "rx": 0.36, "ry": 0.34, "rz": 0.38},
		{"pos": Vector3(-0.18, -0.03, -0.20), "rx": 0.37, "ry": 0.32, "rz": 0.37},
	]
	var segs := 8
	var rings := 4
	for lb in lobes:
		var c: Vector3 = lb["pos"]
		var rx := float(lb["rx"])
		var ry := float(lb["ry"])
		var rz := float(lb["rz"])
		for r in range(rings):
			var v0 := float(r) / float(rings) * PI
			var v1 := float(r + 1) / float(rings) * PI
			var col0 := Color(0.58, 0.68, 0.54).lerp(Color(1.0, 1.0, 0.90), clampf(cos(v0) * 0.5 + 0.5, 0.0, 1.0))
			var col1 := Color(0.58, 0.68, 0.54).lerp(Color(1.0, 1.0, 0.90), clampf(cos(v1) * 0.5 + 0.5, 0.0, 1.0))
			for s in range(segs):
				var u0 := float(s) / float(segs) * TAU
				var u1 := float(s + 1) / float(segs) * TAU
				var p00 := c + Vector3(sin(v0) * cos(u0) * rx, cos(v0) * ry, sin(v0) * sin(u0) * rz)
				var p10 := c + Vector3(sin(v0) * cos(u1) * rx, cos(v0) * ry, sin(v0) * sin(u1) * rz)
				var p11 := c + Vector3(sin(v1) * cos(u1) * rx, cos(v1) * ry, sin(v1) * sin(u1) * rz)
				var p01 := c + Vector3(sin(v1) * cos(u0) * rx, cos(v1) * ry, sin(v1) * sin(u0) * rz)
				_emit_quad_cw(st, p00, p10, p11, p01, col0, col0, col1, col1)
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

static func _emit_botanical_leaf(st: SurfaceTool, root: Vector3, dir: Vector3, length: float, width: float, arch: float, c_base: Color, c_tip: Color) -> void:
	# Emite una hoja plegada en V con nervio central para lectura orgánica desde 2.5D sin aspecto plástico
	var f := dir.normalized()
	var up := Vector3.UP if absf(f.y) < 0.92 else Vector3.FORWARD
	var right := f.cross(up).normalized()
	var leaf_up := right.cross(f).normalized()
	var mid := root + f * (length * 0.48) + leaf_up * arch
	var mid_ridge := mid + leaf_up * (width * 0.14)
	var left_p := mid - right * width
	var right_p := mid + right * width
	var tip := root + f * length + leaf_up * (arch * 0.55)
	var c_mid := c_base.lerp(c_tip, 0.55)
	st.set_color(c_base); st.add_vertex(root)
	st.set_color(c_mid); st.add_vertex(mid_ridge)
	st.set_color(c_mid); st.add_vertex(left_p)
	st.set_color(c_base); st.add_vertex(root)
	st.set_color(c_mid); st.add_vertex(right_p)
	st.set_color(c_mid); st.add_vertex(mid_ridge)
	st.set_color(c_mid); st.add_vertex(left_p)
	st.set_color(c_mid); st.add_vertex(mid_ridge)
	st.set_color(c_tip); st.add_vertex(tip)
	st.set_color(c_mid); st.add_vertex(mid_ridge)
	st.set_color(c_mid); st.add_vertex(right_p)
	st.set_color(c_tip); st.add_vertex(tip)

static func make_botanical_shrub_mesh() -> ArrayMesh:
	# Mata botánica densa de 3 coronas de frondas arqueadas y hojas lanceoladas (cero esferas plásticas)
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var tiers := [
		{"n": 9, "y": -0.02, "tilt": 0.28, "len": 0.62, "w": 0.14, "arch": 0.16, "c0": Color(0.46, 0.58, 0.42), "c1": Color(0.84, 0.92, 0.72), "off": 0.0},
		{"n": 7, "y": 0.08, "tilt": 0.58, "len": 0.48, "w": 0.12, "arch": 0.14, "c0": Color(0.54, 0.66, 0.48), "c1": Color(0.94, 0.98, 0.80), "off": 0.36},
		{"n": 5, "y": 0.16, "tilt": 0.94, "len": 0.36, "w": 0.095, "arch": 0.09, "c0": Color(0.62, 0.74, 0.54), "c1": Color(1.0, 1.0, 0.86), "off": 0.18},
	]
	for t in tiers:
		var count := int(t["n"])
		for i in range(count):
			var a := (float(i) / float(count)) * TAU + float(t["off"])
			var horiz := Vector3(cos(a), 0.0, sin(a))
			var dir := (horiz * cos(float(t["tilt"])) + Vector3.UP * sin(float(t["tilt"]))).normalized()
			var r0 := Vector3(horiz.x * 0.07, float(t["y"]), horiz.z * 0.07)
			_emit_botanical_leaf(st, r0, dir, float(t["len"]), float(t["w"]), float(t["arch"]), t["c0"], t["c1"])
	st.generate_normals()
	return st.commit()

static func make_hanging_ivy_mesh() -> ArrayMesh:
	# Guirnalda de hiedra colgante desde el borde de las macetas con hojas alternas hacia abajo
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
	# Ramillete de 3 flores de 5 pétalos con corazón dorado cálido (cero esferas de caramelo)
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
		# Corona central dorada pequeña en pirámide de 5 caras
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

static func make_basalt_outcrop_mesh(seed_val: int = 17) -> ArrayMesh:
	# Columna/promontorio escalonado de basalto volcánico multifacetado (sustituye esferas lisas en escollos y contrafuertes)
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var rng := RandomNumberGenerator.new()
	rng.seed = seed_val
	var sides := 7
	var levels := [
		{"y": 0.00, "r": 0.62, "col": Color(0.56, 0.60, 0.62)},
		{"y": 0.36, "r": 0.56, "col": Color(0.68, 0.72, 0.73)},
		{"y": 0.74, "r": 0.42, "col": Color(0.82, 0.84, 0.82)},
		{"y": 1.00, "r": 0.20, "col": Color(0.94, 0.94, 0.88)},
	]
	var rings: Array[Array] = []
	for li in range(levels.size()):
		var ring: Array[Vector3] = []
		var ly := float(levels[li]["y"])
		var lr := float(levels[li]["r"])
		for s in range(sides):
			var ang := (float(s) / float(sides)) * TAU + float(li) * 0.14
			var jitter := rng.randf_range(0.76, 1.24)
			var yj := rng.randf_range(-0.06, 0.08) if li > 0 else 0.0
			ring.append(Vector3(cos(ang) * lr * jitter, ly + yj, sin(ang) * lr * jitter))
		rings.append(ring)

	for li in range(levels.size() - 1):
		var c0: Color = levels[li]["col"]
		var c1: Color = levels[li + 1]["col"]
		for s in range(sides):
			var ns := (s + 1) % sides
			_emit_quad_cw(st, rings[li][ns], rings[li][s], rings[li + 1][s], rings[li + 1][ns], c0, c0, c1, c1)

	# Tapa superior facetada irregular
	var top_ring: Array = rings[rings.size() - 1]
	var apex := Vector3(rng.randf_range(-0.08, 0.08), 1.10, rng.randf_range(-0.08, 0.08))
	var c_top := Color(0.98, 0.97, 0.90)
	for s in range(sides):
		var ns := (s + 1) % sides
		st.set_color(c_top); st.add_vertex(top_ring[ns])
		st.set_color(c_top); st.add_vertex(apex)
		st.set_color(c_top); st.add_vertex(top_ring[s])

	st.generate_normals()
	return st.commit()

static func build_sanctuary_canary(parent: Node3D, pos: Vector3, yaw: float, mat_gold: Material) -> void:
	var b := Node3D.new()
	b.position = pos
	b.rotation.y = yaw
	parent.add_child(b)
	_cyl(b, Vector3(0.0, 0.09, 0.0), 0.045, 0.14, mat_gold)
	var head := _cyl(b, Vector3(0.0, 0.18, 0.045), 0.032, 0.06, mat_gold)
	head.rotation.x = 0.25
	var tail := _box(b, Vector3(0.0, 0.09, -0.075), Vector3(0.035, 0.025, 0.10), mat_gold)
	tail.rotation.x = -0.35

static func _get_or_create_static_body(parent: Node3D) -> StaticBody3D:
	var existing := parent.get_node_or_null("StaticCollider") as StaticBody3D
	if existing:
		return existing
	var sb := StaticBody3D.new()
	sb.name = "StaticCollider"
	parent.add_child(sb)
	return sb

static func add_box_collider(parent: Node3D, pos: Vector3, size: Vector3, yaw: float = 0.0) -> StaticBody3D:
	var sb := _get_or_create_static_body(parent)
	var col := CollisionShape3D.new()
	var box := BoxShape3D.new()
	box.size = size
	col.shape = box
	col.position = pos
	if not is_zero_approx(yaw):
		col.rotation.y = yaw
	sb.add_child(col)
	return sb

static func add_cyl_collider(parent: Node3D, pos: Vector3, radius: float, height: float) -> StaticBody3D:
	var sb := _get_or_create_static_body(parent)
	var col := CollisionShape3D.new()
	var cyl := CylinderShape3D.new()
	cyl.radius = radius
	cyl.height = height
	col.shape = cyl
	col.position = pos
	sb.add_child(col)
	return sb

static func add_segment_barrier(parent: Node3D, p0: Vector3, p1: Vector3, thickness: float = 0.28, height: float = 1.65) -> StaticBody3D:
	var delta := p1 - p0
	var horiz := Vector2(delta.x, delta.z).length()
	if horiz < 0.05:
		return null
	var mid := (p0 + p1) * 0.5 + Vector3(0.0, height * 0.42, 0.0)
	var sb := StaticBody3D.new()
	sb.name = "SegmentBarrier"
	sb.add_to_group("segment_barrier")
	parent.add_child(sb)
	sb.look_at_from_position(mid, p1 + Vector3(0.0, height * 0.42, 0.0), Vector3.UP)
	var col := CollisionShape3D.new()
	var box := BoxShape3D.new()
	box.size = Vector3(thickness, height, delta.length() + 0.20)
	col.shape = box
	sb.add_child(col)
	return sb

static func tag_camera_occluder(node: Node3D) -> void:
	if node and not node.is_in_group("camera_occluder"):
		node.add_to_group("camera_occluder")

static func merge_static_children_by_material(container: Node3D) -> void:
	if container == null:
		return
	var buckets := {}
	var stack: Array = [[container, Transform3D.IDENTITY]]
	while not stack.is_empty():
		var item: Array = stack.pop_back()
		var node: Node = item[0]
		var xf_acc: Transform3D = item[1]
		for c in node.get_children():
			if c is Node3D:
				var c3 := c as Node3D
				var next_xf: Transform3D = xf_acc * c3.transform if node != container else c3.transform
				if c3 is MeshInstance3D:
					var mi := c3 as MeshInstance3D
					if not mi.visible or mi.is_in_group("camera_occluder") or mi.mesh == null or mi.mesh.get_surface_count() != 1:
						continue
					var mat: Material = mi.material_override if mi.material_override else mi.mesh.surface_get_material(0)
					var mat_key: String = str(mat.get_instance_id()) if mat else "none"
					var fmt: int = int((mi.mesh as ArrayMesh).surface_get_format(0)) if mi.mesh is ArrayMesh else 0
					var has_col: bool = (fmt & Mesh.ARRAY_FORMAT_COLOR) != 0
					var bkey: String = "%s_%d_%s" % [mat_key, int(mi.cast_shadow), "c" if has_col else "n"]
					if not buckets.has(bkey):
						buckets[bkey] = {"mat": mat, "shadow": mi.cast_shadow, "entries": []}
					(buckets[bkey]["entries"] as Array).append({"mi": mi, "xf": next_xf})
				else:
					stack.append([c3, next_xf])

	var batch_idx := 0
	for bkey in buckets.keys():
		var bucket: Dictionary = buckets[bkey]
		var entries: Array = bucket["entries"]
		if entries.size() < 2:
			continue
		var st := SurfaceTool.new()
		st.begin(Mesh.PRIMITIVE_TRIANGLES)
		for e in entries:
			var ed: Dictionary = e
			var mi := ed["mi"] as MeshInstance3D
			var rel_xf: Transform3D = ed["xf"]
			st.append_from(mi.mesh, 0, rel_xf)
			mi.queue_free()
		var merged := MeshInstance3D.new()
		merged.name = "MergedBatch_%d" % batch_idx
		merged.mesh = st.commit()
		merged.material_override = bucket["mat"]
		merged.cast_shadow = int(bucket["shadow"]) as GeometryInstance3D.ShadowCastingSetting
		container.add_child(merged)
		batch_idx += 1

static func _box(parent: Node3D, pos: Vector3, size: Vector3, mat: Material) -> MeshInstance3D:
	var inst := MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = size
	inst.mesh = bm
	inst.material_override = mat
	inst.position = pos
	inst.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parent.add_child(inst)
	return inst

static func _cyl(parent: Node3D, pos: Vector3, radius: float, height: float, mat: Material) -> MeshInstance3D:
	var inst := MeshInstance3D.new()
	var cm := CylinderMesh.new()
	cm.top_radius = radius
	cm.bottom_radius = radius
	cm.height = height
	cm.radial_segments = 10
	inst.mesh = cm
	inst.material_override = mat
	inst.position = pos
	inst.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parent.add_child(inst)
	return inst
