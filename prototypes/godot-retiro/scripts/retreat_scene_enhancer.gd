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
const InteractiveDoorScript = preload("res://scripts/interactive_door.gd")
const UpperArch = preload("res://scripts/retreat_upper_architecture.gd")

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

	# Fase 1.1: Material geológico de basalto volcánico estratificado (corrige extensión .jpg y unifica familia con A1/Z1)
	var mat_moss_roof := UpperArch.create_geological_cliff_material(builder)
	var mat_ashlar_upper := UpperArch.create_weathered_ashlar_material(builder, Color("#cbc3af"))
	var mat_dark_basalt_upper := UpperArch.create_dark_basalt_slab_material(builder)
	var plate_mesh_upper := UpperArch.make_angular_basalt_plate_mesh(811)

	# Fase 0.2: Separar en grupos estructurales reconocibles A2, A3 y A4
	var a2_layers := UpperArch.ensure_zone_layer_groups(builder.get_node_or_null("A2_WinchAssembly") as Node3D, "A2")
	var a3_layers := UpperArch.ensure_zone_layer_groups(builder.get_node_or_null("A3_DiningHall") as Node3D, "A3")
	var a4_layers := UpperArch.ensure_zone_layer_groups(builder.get_node_or_null("A4_Library") as Node3D, "A4")

	var roof_entries: Array[Dictionary] = []
	var strata_mesh := make_layered_cliff_crag_mesh(701)

	# 1.1–1.8 Masa rocosa del acantilado A1: cierres laterales oeste/este, contrafuertes estratificados y grosor real de accesos
	var a1_rock_shell := Node3D.new()
	a1_rock_shell.name = "A1_ExcavatedCliffMass"
	builder.add_child(a1_rock_shell)

	# 1.8 Extremo izquierdo (Oeste, x=66.2..76.3) y extremo derecho (Este, x=136.8..151.5): estratos escalonados de basalto oscuro
	var west_terraces := [
		[Vector3(68.6, 9.0, 86.0), Vector3(4.2, 2.8, 4.4), 0.14],
		[Vector3(72.2, 9.0, 85.2), Vector3(4.6, 3.8, 4.8), -0.18],
		[Vector3(75.0, 9.0, 86.6), Vector3(3.4, 4.5, 4.0), 0.22],
		[Vector3(70.0, 11.6, 80.4), Vector3(5.2, 3.6, 4.8), -0.12],
		[Vector3(74.0, 12.4, 78.8), Vector3(4.8, 4.2, 4.8), 0.18],
	]
	for wt_i in range(west_terraces.size()):
		var wt: Array = west_terraces[wt_i]
		var wm := MeshInstance3D.new()
		wm.name = "A1WestFlankStrata_%d" % wt_i
		wm.mesh = strata_mesh
		wm.material_override = mat_moss_roof
		wm.position = wt[0]
		wm.scale = wt[1]
		wm.rotation.y = float(wt[2])
		wm.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		a1_rock_shell.add_child(wm)

	var east_terraces := [
		[Vector3(138.6, 9.0, 86.6), Vector3(4.0, 4.4, 4.2), -0.16],
		[Vector3(142.4, 9.0, 85.4), Vector3(4.8, 3.8, 4.6), 0.12],
		[Vector3(146.2, 9.0, 86.2), Vector3(4.4, 3.2, 4.2), -0.22],
		[Vector3(148.6, 9.0, 87.6), Vector3(3.4, 2.5, 3.6), 0.18],
		[Vector3(140.4, 12.2, 79.8), Vector3(5.2, 4.2, 4.8), 0.10],
		[Vector3(145.4, 11.8, 80.8), Vector3(4.6, 3.6, 4.4), -0.15],
		[Vector3(148.4, 11.4, 82.2), Vector3(3.4, 3.1, 3.8), 0.24],
	]
	for et_i in range(east_terraces.size()):
		var et: Array = east_terraces[et_i]
		var em := MeshInstance3D.new()
		em.name = "A1EastFlankStrata_%d" % et_i
		em.mesh = strata_mesh
		em.material_override = mat_moss_roof
		em.position = et[0]
		em.scale = et[1]
		em.rotation.y = float(et[2])
		em.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		a1_rock_shell.add_child(em)

	# 1.2–1.3 Contrafuertes de roca volcánica asimétricos entre celda y celda (z=88.2 -> z=75.0, Y=9..17.8m; sin discos repetitivos)
	var buttress_specs := [
		[76.1, 0.0, 1.12, 0.92, -16.0],
		[85.4, 0.45, 0.88, 1.15, 19.0],
		[95.0, -0.35, 1.24, 0.85, -11.0],
		[106.8, 0.52, 0.95, 1.18, 23.0],
		[117.5, -0.28, 1.18, 0.94, -21.0],
		[126.9, 0.38, 0.86, 1.08, 15.0],
		[136.7, -0.18, 1.10, 0.96, -13.0]
	]
	for bi in range(buttress_specs.size()):
		var bsp: Array = buttress_specs[bi]
		var bx := float(bsp[0])
		var y_var := float(bsp[1])
		var wx_mul := float(bsp[2])
		var wz_mul := float(bsp[3])
		var yaw_deg := float(bsp[4])
		for tier_i in range(3):
			var tz := lerpf(87.6, 75.8, float(tier_i) / 2.0) + (sin(float(bi) * 2.1 + float(tier_i)) * 0.75)
			var ty := lerpf(9.0, 13.6, float(tier_i) / 2.0) + y_var * (0.7 if tier_i == 1 else 0.35)
			var bm := MeshInstance3D.new()
			bm.name = "A1Buttress_%d_T%d" % [bi, tier_i]
			if tier_i == 2:
				bm.mesh = plate_mesh_upper
				bm.material_override = mat_dark_basalt_upper if bi % 2 == 0 else mat_moss_roof
				bm.position = Vector3(bx + sin(float(bi * 3 + tier_i)) * 0.45, ty + 0.60, tz)
				bm.scale = Vector3(4.6 * wx_mul, 2.15 + float(bi % 2) * 0.35, 3.5 * wz_mul)
				bm.rotation_degrees = Vector3(6.5, yaw_deg * 0.8, -4.5 + float(bi % 3) * 2.0)
			elif tier_i == 1:
				# Placa angular basáltica irregular (elimina la simetría de 5 discos escalonados idénticos)
				bm.mesh = plate_mesh_upper
				bm.material_override = mat_moss_roof if bi % 2 == 0 else mat_dark_basalt_upper
				bm.position = Vector3(bx + cos(float(bi) * 1.9) * 0.85, ty + 0.25, tz + sin(float(bi) * 1.7) * 0.90)
				bm.scale = Vector3(3.4 * wx_mul, 2.35 + float(bi % 3) * 0.35, 2.8 * wz_mul)
				bm.rotation_degrees = Vector3(11.0 + float(bi % 3) * 3.0, yaw_deg, -6.0 + float(bi % 2) * 8.0)
			else:
				bm.mesh = strata_mesh
				bm.material_override = mat_moss_roof
				bm.position = Vector3(bx + sin(float(bi * 3 + tier_i)) * 0.16, ty, tz)
				bm.scale = Vector3(2.2 * wx_mul, 3.1 + float(bi % 2) * 0.35, 2.5 * wz_mul)
				bm.rotation.y = deg_to_rad(yaw_deg * 0.6)
			bm.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
			a1_rock_shell.add_child(bm)

	# Fase 6 (A1): Muro geológico trasero permanente sellando el abismo oscuro tras las 6 celdas al abrir CaveRoof (z<=75.55)
	var a1_back_wall := _box(a1_rock_shell, Vector3(106.5, 13.45, 74.65), Vector3(62.4, 9.2, 1.85), mat_cliff)
	a1_back_wall.name = "A1_PermanentBackCliffWall"
	a1_back_wall.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	for bk_i in range(12):
		var bk_x := lerpf(78.2, 135.0, float(bk_i) / 11.0)
		var bk_slab := MeshInstance3D.new()
		bk_slab.name = "A1_BackCliffStrata_%d" % bk_i
		bk_slab.mesh = plate_mesh_upper
		bk_slab.material_override = mat_dark_basalt_upper if bk_i % 2 == 0 else mat_moss_roof
		bk_slab.position = Vector3(bk_x, 12.1 + float(bk_i % 3) * 0.45, 75.05 + sin(float(bk_i) * 1.4) * 0.22)
		bk_slab.scale = Vector3(6.2, 5.4, 2.2)
		bk_slab.rotation_degrees = Vector3(5.0, float(bk_i % 2) * 14.0 - 7.0, -3.0)
		bk_slab.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		a1_rock_shell.add_child(bk_slab)

	# 6 Celdas excavadas de A1 (cota suelo 9.0m, muros hasta 12.5m, roca superior hasta 17.8m conectando con Paseo Z9)
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

		# 1.5 Bóveda pétrea estratificada que abraza la puerta y sube orgánicamente hasta la cornisa Z9 (17.6m)
		var vault_mesh := UpperArch.build_stratified_cave_vault_mesh(x0, x1, z0 - 2.6, z1, 9.0, 12.35, 17.55, door_x, 2.5, 2.72, rng, Color("#c4cdca"), Color("#8ca26a"), false)
		var v_inst := MeshInstance3D.new()
		v_inst.name = "VaultMesh"
		v_inst.mesh = vault_mesh
		v_inst.material_override = mat_moss_roof
		rnode.add_child(v_inst)

		# Repisas angulosas anchas de basalto estratificado integradas en el talud entre A1 y Paseo Superior
		for cr_i in range(2):
			var cr_x := lerpf(x0 + 2.2, x1 - 2.2, float(cr_i))
			var cr_z := lerpf(z0 + 1.8, z1 - 3.6, 0.30 + float(cr_i) * 0.38)
			var cr_m := MeshInstance3D.new()
			cr_m.name = "VaultStrataLedge_%d" % cr_i
			cr_m.mesh = plate_mesh_upper
			cr_m.material_override = mat_dark_basalt_upper if cr_i == 0 else mat_moss_roof
			cr_m.position = Vector3(cr_x, 12.9 + float(cr_i) * 1.35, cr_z)
			cr_m.scale = Vector3(4.9, 1.25, 2.8)
			cr_m.rotation_degrees = Vector3(8.0, float(cr_i) * 12.0 - 6.0, -5.0)
			rnode.add_child(cr_m)

		# 1.4 & 1.6 Grosor real de acceso (pórtico de sillería empotrado en roca + paredes interiores excavadas + puerta doble interactiva)
		var cell_door: Node3D = _build_excavated_cell_shell_and_portal(a1_rock_shell, rnode, str(sp["id"]), str(sp["label"]), x0, x1, z0, z1, door_x, 9.0, mat_stone_arch, mat_cliff, mat_rock_dark, strata_mesh)

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
			"door": cell_door,
			"rect": Rect2(x0, z0, x1 - x0, (z1 - z0) - 0.15),
			"door_rect": Rect2(door_x - 1.75, z1 - 1.4, 3.5, 2.5),
			"y_min": 7.5,
			"y_max": 13.8
		})
	# Tabique este final de Celda 6
	add_box_collider(builder, Vector3(136.8, 10.6, 82.55), Vector3(0.55, 3.2, 12.7))

	# ==========================================================================
	# FASE 0 & FASE 1: A4 BIBLIOTECA Y A3 COMEDOR — MONTAÑA ESTRATIFICADA,
	# PORTADAS EXCAVADAS REALES CON PUERTAS INTERACTIVAS, MUROS Y ESCALERA ESTE
	# ==========================================================================
	var mat_iron_fac: Material = builder.get("mat_iron")
	var mat_flame_fac: Material = builder.get("mat_flame")
	var mat_wood_fac: Material = builder.get("mat_wood")
	var mat_wood_dark_fac: Material = builder.get("mat_wood_dark")
	var mat_bronze_fac: Material = builder.get("mat_bronze")

	# --- A4 Biblioteca / Scriptorium (x=83.8..113.1, z=45.6..65.35, suelo y=18.0m) ---
	var a4_floor_parent: Node3D = a4_layers.get("Floor", builder)
	var a4_floor := _box(a4_floor_parent, Vector3(98.5, 17.995, 57.6), Vector3(29.0, 0.04, 15.2), builder.get("mat_cell_floor"))
	a4_floor.name = "A4_ExpandedStoneFloor"
	var a4_shell := Node3D.new()
	a4_shell.name = "A4_PermanentMountainShell"
	builder.add_child(a4_shell)

	var a4_roof := Node3D.new()
	a4_roof.name = "CaveRoof_a4_library"
	roofs_root.add_child(a4_roof)
	var a4_mesh := UpperArch.build_stratified_cave_vault_mesh(
		83.6, 112.95, 45.6, 65.35, 18.0, 21.08, 27.65,
		102.75, 2.96, 2.86, rng, Color("#c8d0cc"), Color("#8fa46d"), true
	)
	var a4_inst := MeshInstance3D.new()
	a4_inst.name = "A4VaultMesh"
	a4_inst.mesh = a4_mesh
	a4_inst.material_override = mat_moss_roof
	a4_inst.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	a4_roof.add_child(a4_inst)

	var a4_facade_parent: Node3D = a4_layers.get("Facade", a4_shell)
	var a4_door := UpperArch.build_upper_excavated_portal(
		builder, a4_facade_parent, a4_roof,
		{
			"id": "a4_library",
			"door_id": "a4_library",
			"door_title": "Puerta de la Biblioteca (A4)",
			"style": "library_arch",
			"door_x": 102.75,
			"y0": 18.0,
			"z_front": 65.28,
			"clear_w": 2.84,
			"clear_h": 2.86
		},
		mat_ashlar_upper, mat_cliff, mat_dark_basalt_upper,
		mat_wood_fac, mat_wood_dark_fac, mat_iron_fac, mat_bronze_fac, mat_flame_fac, plate_mesh_upper
	)
	# Muros físicos perimetrales de la caverna A4 ampliada (x=83.8..113.0, z=49.8..65.2; puerta en x=101.2..104.3)
	add_box_collider(builder, Vector3(98.5, 19.6, 49.7), Vector3(29.4, 3.4, 0.7))
	add_box_collider(builder, Vector3(83.85, 19.6, 57.5), Vector3(0.75, 3.4, 15.6))
	add_box_collider(builder, Vector3(92.45, 19.6, 65.2), Vector3(17.2, 3.4, 0.65))
	add_box_collider(builder, Vector3(108.7, 19.6, 65.2), Vector3(8.6, 3.4, 0.65))

	roof_entries.append({
		"id": "a4_library",
		"group": "a4",
		"node": a4_roof,
		"door": a4_door,
		"extra_cutaway_nodes": [],
		"rect": Rect2(83.8, 49.8, 29.2, 15.1),
		"door_rect": Rect2(100.8, 64.0, 3.9, 2.4),
		"y_min": 16.5,
		"y_max": 22.5
	})

	# --- A3 Comedor y Cocina (x=112.9..134.9, z=45.6..65.35, suelo y=18.0m) ---
	var a3_floor_parent: Node3D = a3_layers.get("Floor", builder)
	var a3_floor := _box(a3_floor_parent, Vector3(123.75, 17.995, 57.3), Vector3(21.6, 0.04, 15.8), builder.get("mat_cell_floor"))
	a3_floor.name = "A3_ExpandedStoneFloor"
	var a3_shell := Node3D.new()
	a3_shell.name = "A3_PermanentMountainShell"
	builder.add_child(a3_shell)

	var a3_roof := Node3D.new()
	a3_roof.name = "CaveRoof_a3_dining"
	roofs_root.add_child(a3_roof)
	var a3_mesh := UpperArch.build_stratified_cave_vault_mesh(
		112.9, 134.9, 45.6, 65.35, 18.0, 21.08, 27.65,
		117.4, 2.96, 2.86, rng, Color("#c9d1cc"), Color("#91a66f"), true
	)
	var a3_inst := MeshInstance3D.new()
	a3_inst.name = "A3VaultMesh"
	a3_inst.mesh = a3_mesh
	a3_inst.material_override = mat_moss_roof
	a3_inst.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	a3_roof.add_child(a3_inst)

	var a3_facade_parent: Node3D = a3_layers.get("Facade", a3_shell)
	var a3_door := UpperArch.build_upper_excavated_portal(
		builder, a3_facade_parent, a3_roof,
		{
			"id": "a3_dining",
			"door_id": "a3_dining",
			"door_title": "Puerta del Comedor (A3)",
			"style": "refectory_lintel",
			"door_x": 117.4,
			"y0": 18.0,
			"z_front": 65.28,
			"clear_w": 2.84,
			"clear_h": 2.86
		},
		mat_ashlar_upper, mat_cliff, mat_dark_basalt_upper,
		mat_wood_fac, mat_wood_dark_fac, mat_iron_fac, mat_bronze_fac, mat_flame_fac, plate_mesh_upper
	)
	# Tabique divisorio A4/A3 y muros perimetrales de caverna A3 ampliada (vano puerta en x=115.8..119.0)
	add_box_collider(builder, Vector3(113.0, 19.6, 57.3), Vector3(0.65, 3.4, 15.6))
	add_box_collider(builder, Vector3(123.75, 19.6, 49.3), Vector3(21.6, 3.4, 0.7))
	add_box_collider(builder, Vector3(134.5, 19.6, 57.3), Vector3(0.65, 3.4, 15.6))
	add_box_collider(builder, Vector3(114.4, 19.6, 65.2), Vector3(2.8, 3.4, 0.65))
	add_box_collider(builder, Vector3(126.75, 19.6, 65.2), Vector3(15.5, 3.4, 0.65))

	roof_entries.append({
		"id": "a3_dining",
		"group": "a3",
		"node": a3_roof,
		"door": a3_door,
		"extra_cutaway_nodes": [],
		"rect": Rect2(113.1, 49.3, 21.4, 15.6),
		"door_rect": Rect2(115.4, 64.0, 4.0, 2.4),
		"y_min": 16.5,
		"y_max": 22.5
	})

	# Geología estratificada del talud superior, cornisa de apoyo del Paseo y vegetación en grietas
	var InteriorsA3A4 := load("res://scripts/retreat_interiors_a3_a4.gd")
	if InteriorsA3A4 != null:
		InteriorsA3A4.build_a4_interior_architecture(builder, a4_layers, a4_roof)
		InteriorsA3A4.build_a3_interior_architecture(builder, a3_layers, a3_roof)

	var upper_geology_root := Node3D.new()
	upper_geology_root.name = "UpperMountainGeology"
	builder.add_child(upper_geology_root)
	UpperArch.build_upper_mountain_geology(builder, upper_geology_root, a4_roof, a3_roof, mat_moss_roof, mat_ashlar_upper, mat_dark_basalt_upper)
	UpperArch.build_paseo_facade_enrichment(
		builder, a4_facade_parent, a4_roof, a3_facade_parent, a3_roof,
		mat_ashlar_upper, mat_cliff, mat_wood_fac, mat_wood_dark_fac, mat_iron_fac
	)

	# Muros laterales con espesor/coronación (A4 oeste, A3 este) y escaleras este (Observatorio + descenso a A2)
	var stairs_node := builder.get_node_or_null("Staircases") as Node3D
	if stairs_node == null:
		stairs_node = upper_geology_root
	UpperArch.build_flank_walls_and_east_stairs(
		builder, a4_shell, a3_shell, stairs_node,
		mat_moss_roof, mat_ashlar_upper, mat_cliff, mat_dark_basalt_upper,
		builder.get("mat_trail"), mat_iron_fac, mat_flame_fac, plate_mesh_upper
	)
	var a2_stair_craft := stairs_node.get_node_or_null("EastPaseoToA2StairCraft") as Node3D
	if a2_stair_craft != null:
		var WinchStairs := load("res://scripts/retreat_winch_and_stairs.gd")
		if WinchStairs != null:
			WinchStairs.build_paseo_to_a2_perimeter_ropes(builder, a2_stair_craft)

	# Tejado y muros frontales recortables de la casa del cabrestante A2 (recorte limpio al entrar sin muros bloqueando la maquinaria)
	var a2_roof_node := builder.get_node_or_null("A2_WinchAssembly/A2_WinchRoof") as Node3D
	var a2_cutaway_walls := builder.get_node_or_null("A2_WinchAssembly/A2_WinchCutawayWalls") as Node3D
	var a2_door_node := builder.get_node_or_null("A2_WinchAssembly/A2_WinchHouseStructure/Door_A2_Winch") as Node3D
	if a2_roof_node != null:
		var a2_extras: Array = []
		if a2_cutaway_walls != null:
			a2_extras.append(a2_cutaway_walls)
		roof_entries.append({
			"id": "a2_winch",
			"group": "a2",
			"node": a2_roof_node,
			"door": a2_door_node,
			"extra_cutaway_nodes": a2_extras,
			"rect": Rect2(155.8, 62.6, 10.8, 8.6),
			"door_rect": Rect2(154.9, 65.8, 2.4, 3.6),
			"y_min": 14.0,
			"y_max": 20.5
		})

	# Templo A5 (Fase 2): Cutaway independiente de cubierta + entablamento + frontones
	# (conserva visibles columnas, muro trasero, hornacina, braseros, estatua y altar!)
	var a5_roof_node := builder.find_child("TempleRoofCutawayGroup", true, false) as Node3D
	if a5_roof_node != null:
		roof_entries.append({
			"id": "a5_temple",
			"group": "a5",
			"node": a5_roof_node,
			"door": null,
			"extra_cutaway_nodes": [],
			"rect": Rect2(31.8, 62.0, 17.6, 15.0),
			"door_rect": Rect2(48.6, 63.2, 2.2, 5.6),
			"y_min": 25.5,
			"y_max": 32.0
		})

	# Apliques secundarios de Paseo Superior sobre ménsulas de piedra entre portales (evita tramos oscuros entre A4, A3 y extremos)
	for torch_x in [91.4, 109.8, 127.6]:
		var sconce := Node3D.new()
		sconce.name = "FacadeTorch_%d" % int(torch_x * 10.0)
		sconce.position = Vector3(torch_x, 19.95, 65.62)
		var host_roof: Node3D = a4_roof if torch_x < 113.0 else a3_roof
		host_roof.add_child(sconce)
		_box(sconce, Vector3(0.0, -0.05, -0.14), Vector3(0.32, 0.50, 0.22), mat_ashlar_upper)
		_box(sconce, Vector3(0.0, 0.0, -0.02), Vector3(0.14, 0.34, 0.08), mat_iron_fac)
		_cyl(sconce, Vector3(0.0, 0.14, 0.08), 0.05, 0.36, mat_wood_dark_fac)
		var flm := _cyl(sconce, Vector3(0.0, 0.40, 0.08), 0.075, 0.22, mat_flame_fac)
		flm.add_to_group("night_flame")
		var tl := OmniLight3D.new()
		tl.name = "FacadeTorchLight_%d" % int(torch_x * 10.0)
		tl.position = Vector3(0.0, 0.48, 0.38)
		tl.light_color = Color(1.0, 0.66, 0.28)
		tl.light_energy = 1.40
		tl.omni_range = 9.0
		sconce.add_child(tl)
		if builder.has_method("register_flame_fx"):
			builder.register_flame_fx(flm, tl, false)

	# 6.2–6.7 Iluminación nocturna de A1: antorchas de hierro forjado junto a los portales de las 6 celdas, faroles sobre el pretil sur y sombras de contacto
	var a1_night_rig := Node3D.new()
	a1_night_rig.name = "A1_NightLightingRig"
	builder.add_child(a1_night_rig)
	var mat_ao_dark := StandardMaterial3D.new()
	mat_ao_dark.albedo_color = Color(0.05, 0.04, 0.03, 0.42)
	mat_ao_dark.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat_ao_dark.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat_ao_dark.cull_mode = BaseMaterial3D.CULL_DISABLED

	# Antorchas murales ancladas en el frente de cada portal (en CaveRoof_cell_* para ocultarse limpiamente al abrir la fachada, mientras la luz permanece activa)
	var a1_torch_xs := [79.6, 84.0, 88.6, 93.0, 99.0, 103.5, 109.5, 114.0, 120.1, 124.4, 129.1, 133.4]
	for ti in range(a1_torch_xs.size()):
		var tx := float(a1_torch_xs[ti])
		var cell_roof_idx := mini(ti / 2, 5)
		var torch_parent: Node3D = roof_entries[cell_roof_idx]["node"] if cell_roof_idx < roof_entries.size() else a1_night_rig
		var ts := Node3D.new()
		ts.name = "A1PortalTorch_%d" % ti
		ts.position = Vector3(tx, 10.72, 88.94)
		torch_parent.add_child(ts)
		_box(ts, Vector3(0.0, 0.0, -0.06), Vector3(0.14, 0.34, 0.08), mat_iron_fac)
		var stick := _cyl(ts, Vector3(0.0, 0.14, 0.08), 0.048, 0.38, builder.get("mat_wood_dark"))
		stick.rotation.x = 0.24
		_cyl(ts, Vector3(0.0, 0.28, 0.14), 0.075, 0.06, mat_iron_fac)
		var t_flm := _cyl(ts, Vector3(0.0, 0.40, 0.16), 0.072, 0.22, mat_flame_fac)
		t_flm.add_to_group("night_flame")
		# Crear OmniLight3D cada 2 antorchas en a1_night_rig (6 focos bien repartidos con radio coherente de 8.4m)
		if ti % 2 == 0:
			var p_light := OmniLight3D.new()
			p_light.name = "A1PortalTorchLight_%d" % ti
			p_light.position = Vector3(tx + 1.8, 11.20, 89.59)
			p_light.light_color = Color(1.0, 0.66, 0.28)
			p_light.light_energy = 1.65
			p_light.omni_range = 8.4
			a1_night_rig.add_child(p_light)
			if builder.has_method("register_flame_fx"):
				builder.register_flame_fx(t_flm, p_light, false)
		else:
			if builder.has_method("register_flame_fx"):
				builder.register_flame_fx(t_flm, null, false)

	# Faroles bajos de hierro y vidrio cálido sobre los pilares del pretil sur de la plaza (ref. Imagen 3)
	for lx_p in [80.2, 90.8, 101.8, 115.2, 128.4]:
		var l_node := Node3D.new()
		l_node.name = "A1ParapetLantern_%d" % int(lx_p)
		l_node.position = Vector3(lx_p, 9.62, 96.76)
		a1_night_rig.add_child(l_node)
		_box(l_node, Vector3(0.0, 0.06, 0.0), Vector3(0.32, 0.12, 0.32), mat_stone_arch)
		_box(l_node, Vector3(0.0, 0.24, 0.0), Vector3(0.20, 0.24, 0.20), mat_iron_fac)
		var l_flm := _box(l_node, Vector3(0.0, 0.24, 0.0), Vector3(0.14, 0.18, 0.14), mat_flame_fac)
		l_flm.add_to_group("night_flame")
		_box(l_node, Vector3(0.0, 0.39, 0.0), Vector3(0.24, 0.06, 0.24), mat_iron_fac)
		var pl := OmniLight3D.new()
		pl.name = "A1ParapetLanternLight_%d" % int(lx_p)
		pl.position = Vector3(0.0, 0.35, -0.35)
		pl.light_color = Color(1.0, 0.72, 0.34)
		pl.light_energy = 1.15
		pl.omni_range = 6.8
		l_node.add_child(pl)
		if builder.has_method("register_flame_fx"):
			builder.register_flame_fx(l_flm, pl, false)

	# 6.6 Sombras de contacto (AO decals) en umbrales de puertas, bajo bancos, estatua y pozo
	for ao_spec in [
		[Vector3(81.75, 9.012, 89.05), Vector3(2.8, 0.01, 1.35)],
		[Vector3(90.75, 9.012, 89.05), Vector3(2.8, 0.01, 1.35)],
		[Vector3(101.25, 9.012, 89.05), Vector3(2.8, 0.01, 1.35)],
		[Vector3(111.75, 9.012, 89.05), Vector3(2.8, 0.01, 1.35)],
		[Vector3(122.25, 9.012, 89.05), Vector3(2.8, 0.01, 1.35)],
		[Vector3(131.25, 9.012, 89.05), Vector3(2.8, 0.01, 1.35)],
		[Vector3(85.80, 9.010, 93.35), Vector3(3.6, 0.01, 3.6)],
		[Vector3(95.60, 9.010, 93.45), Vector3(2.7, 0.01, 2.7)],
		[Vector3(86.00, 9.010, 89.58), Vector3(2.2, 0.01, 0.85)],
		[Vector3(95.30, 9.010, 89.58), Vector3(2.2, 0.01, 0.85)],
		[Vector3(117.80, 9.010, 89.58), Vector3(2.2, 0.01, 0.85)],
	]:
		var ao_m := _box(a1_night_rig, ao_spec[0], ao_spec[1], mat_ao_dark)
		ao_m.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF

	return roof_entries

static func _build_excavated_cell_shell_and_portal(static_parent: Node3D, roof_parent: Node3D, cell_id: String, cell_label: String, x0: float, x1: float, z0: float, z1: float, door_x: float, y0: float, mat_arch: Material, mat_rock: Material, mat_dark: Material, strata_mesh: Mesh) -> Node3D:
	var shell := Node3D.new()
	shell.name = "ExcavatedShell_" + cell_id
	static_parent.add_child(shell)

	var w := x1 - x0
	var d := z1 - z0

	# 1.4 Grosor real de acceso: umbral de lajas de piedra y jambas de sillería profunda (1.40m de espesor de roca atravesada)
	var thresh := _box(shell, Vector3(door_x, y0 + 0.045, z1 - 0.38), Vector3(2.50, 0.09, 1.48), mat_arch)
	thresh.name = "ThresholdSlab_" + cell_id
	for side_v in [-1.0, 1.0]:
		var side := float(side_v)
		var jx := door_x + side * 1.26
		# Zócalo bajo de jamba (0.85m, marca el grosor del túnel de entrada sin tapar al personaje cuando está dentro)
		for course_i in range(2):
			var cy := y0 + 0.24 + float(course_i) * 0.44
			var cw := 0.62 - float(course_i % 2) * 0.05
			var cd := 1.40 - float(course_i) * 0.06
			var blk := _box(shell, Vector3(jx, cy, z1 - 0.35), Vector3(cw, 0.42, cd), mat_arch if course_i % 2 == 0 else mat_rock)
			blk.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		# Cuerpo medio y alto de las jambas + pináculos de piedra tallada (en roof_parent para que desaparezcan limpiamente al entrar)
		for up_i in range(4):
			var uy := y0 + 1.12 + float(up_i) * 0.48
			var ublk := _box(roof_parent, Vector3(jx, uy, z1 - 0.30), Vector3(0.58 - float(up_i % 2) * 0.05, 0.46, 1.32 - float(up_i) * 0.05), mat_arch)
			ublk.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		# Contrafuertes de roca viva que abrazan las jambas del portal por fuera (en roof_parent)
		var cheek_crag := MeshInstance3D.new()
		cheek_crag.mesh = strata_mesh
		cheek_crag.material_override = mat_rock
		cheek_crag.position = Vector3(door_x + side * 2.15, y0, z1 - 0.42)
		cheek_crag.scale = Vector3(1.55, 2.95, 1.45)
		cheek_crag.rotation.y = side * 0.25
		cheek_crag.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		roof_parent.add_child(cheek_crag)

	# Dintel monolítico grueso + dovela central + ceja de roca (en roof_parent)
	var lintel := _box(roof_parent, Vector3(door_x, y0 + 2.66, z1 - 0.24), Vector3(3.18, 0.48, 1.36), mat_arch)
	lintel.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	var keystone := _box(roof_parent, Vector3(door_x, y0 + 2.80, z1 - 0.16), Vector3(0.68, 0.64, 1.44), mat_arch)
	keystone.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON

	# 3.2 Puerta monástica doble interactiva de tablones de roble y herrajes de hierro en el túnel del portal (en shell: nunca desaparece al acercarse)
	var builder_node := static_parent.get_parent()
	var mat_door_wood: Material = builder_node.get("mat_wood_dark") if (builder_node and builder_node.get("mat_wood_dark")) else mat_dark
	var mat_door_trim: Material = builder_node.get("mat_wood") if (builder_node and builder_node.get("mat_wood")) else mat_door_wood
	var mat_door_iron: Material = builder_node.get("mat_iron") if (builder_node and builder_node.get("mat_iron")) else mat_dark
	var door_ctrl := InteractiveDoorScript.new()
	door_ctrl.name = "CellDoor_" + cell_id
	door_ctrl.door_id = cell_id
	door_ctrl.door_title = "Puerta de " + cell_label
	door_ctrl.is_open = true
	door_ctrl.open_angle_rad = 1.32
	door_ctrl.interact_radius = 2.75
	door_ctrl.position = Vector3(door_x, y0 + 0.08, z1 - 0.52)
	shell.add_child(door_ctrl)
	tag_camera_occluder(door_ctrl)

	var left_piv := Node3D.new()
	left_piv.name = "LeftLeafPivot"
	left_piv.position = Vector3(-0.94, 0.0, 0.0)
	door_ctrl.add_child(left_piv)
	var l_leaf := _box(left_piv, Vector3(0.468, 1.13, 0.0), Vector3(0.935, 2.26, 0.11), mat_door_wood)
	l_leaf.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	_box(left_piv, Vector3(0.468, 1.13, 0.062), Vector3(0.84, 2.12, 0.018), mat_door_trim)
	for strap_y in [0.42, 1.13, 1.84]:
		_box(left_piv, Vector3(0.42, float(strap_y), 0.072), Vector3(0.84, 0.075, 0.022), mat_door_iron)
		_box(left_piv, Vector3(0.42, float(strap_y), -0.066), Vector3(0.84, 0.075, 0.022), mat_door_iron)
	_cyl(left_piv, Vector3(0.80, 1.06, 0.085), 0.062, 0.036, mat_door_iron)
	_cyl(left_piv, Vector3(0.80, 1.06, -0.085), 0.062, 0.036, mat_door_iron)

	var right_piv := Node3D.new()
	right_piv.name = "RightLeafPivot"
	right_piv.position = Vector3(0.94, 0.0, 0.0)
	door_ctrl.add_child(right_piv)
	var r_leaf := _box(right_piv, Vector3(-0.468, 1.13, 0.0), Vector3(0.935, 2.26, 0.11), mat_door_wood)
	r_leaf.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	_box(right_piv, Vector3(-0.468, 1.13, 0.062), Vector3(0.84, 2.12, 0.018), mat_door_trim)
	_box(right_piv, Vector3(-0.92, 1.13, 0.07), Vector3(0.06, 2.24, 0.03), mat_door_wood)
	for strap_y in [0.42, 1.13, 1.84]:
		_box(right_piv, Vector3(-0.42, float(strap_y), 0.072), Vector3(0.84, 0.075, 0.022), mat_door_iron)
		_box(right_piv, Vector3(-0.42, float(strap_y), -0.066), Vector3(0.84, 0.075, 0.022), mat_door_iron)
	_cyl(right_piv, Vector3(-0.80, 1.06, 0.085), 0.062, 0.036, mat_door_iron)
	_cyl(right_piv, Vector3(-0.80, 1.06, -0.085), 0.062, 0.036, mat_door_iron)

	var blk_body := StaticBody3D.new()
	blk_body.name = "DoorBlockerBody"
	door_ctrl.add_child(blk_body)
	var blk_col := CollisionShape3D.new()
	var blk_box := BoxShape3D.new()
	blk_box.size = Vector3(1.88, 2.26, 0.24)
	blk_col.shape = blk_box
	blk_col.position = Vector3(0.0, 1.13, 0.0)
	blk_col.disabled = true
	blk_body.add_child(blk_col)

	door_ctrl.left_pivot = left_piv
	door_ctrl.right_pivot = right_piv
	door_ctrl.blocker_shape = blk_col
	door_ctrl.set_open(true, false)

	# 1.5, 1.6, 2.2 y 2.3 Revestimiento interior de roca excavada, arcos de techo interior y hornacinas en la roca viva (sin cajas prismáticas grises)
	var back_segs := 5
	# Fase 6 (A1): Bloques estratificados angulosos integrados en el muro trasero y laterales (sin aspecto de "setas" redondas)
	var cave_plate_mesh := UpperArch.make_angular_basalt_plate_mesh(int(x0 * 17.0) + 41)
	for bi in range(back_segs):
		var bx := lerpf(x0 + 0.90, x1 - 0.90, float(bi) / float(back_segs - 1))
		var bz := z0 + 0.44 + sin(float(bi) * 1.9 + x0) * 0.18
		var rk := MeshInstance3D.new()
		rk.mesh = cave_plate_mesh
		rk.material_override = mat_rock if bi % 2 == 0 else mat_dark
		rk.position = Vector3(bx, y0 - 0.12, bz)
		rk.scale = Vector3(2.45, 3.35 + float(bi % 2) * 0.35, 1.35)
		rk.rotation_degrees = Vector3(4.0, float(bi % 2) * 12.0 - 6.0, 0.0)
		shell.add_child(rk)

	# 2.2 Paredes laterales irregulares de roca estratificada (Este y Oeste de cada celda)
	var side_segs := 5
	for s_dir in [-1.0, 1.0]:
		var sx_base := (x0 + 0.34) if s_dir < 0.0 else (x1 - 0.34)
		for si in range(side_segs):
			var sz := lerpf(z0 + 1.30, z1 - 1.65, float(si) / float(side_segs - 1))
			var inset := sin(float(si) * 2.1 + sx_base) * 0.18
			var srk := MeshInstance3D.new()
			srk.mesh = cave_plate_mesh
			srk.material_override = mat_rock if (si + int(s_dir > 0.0)) % 2 == 0 else mat_dark
			srk.position = Vector3(sx_base - s_dir * inset, y0 - 0.10, sz)
			srk.scale = Vector3(1.22, 3.25 + float(si % 2) * 0.28, 2.35)
			srk.rotation_degrees = Vector3(0.0, 90.0 + float(si % 2) * 10.0 - 5.0, s_dir * 4.0)
			shell.add_child(srk)

	# 2.5 Transición lumínica exterior-interior: 2 focos cálidos permanentes en cada celda (centro + alcoba trasera con cama y hornacina)
	var inner_warm := OmniLight3D.new()
	inner_warm.name = "CellCaveSanctuaryLight_" + cell_id
	inner_warm.position = Vector3((x0 + x1) * 0.5, y0 + 2.25, lerpf(z0, z1, 0.56))
	inner_warm.light_color = Color(1.0, 0.75, 0.42)
	inner_warm.light_energy = 2.15
	inner_warm.omni_range = 9.5
	shell.add_child(inner_warm)

	var back_warm := OmniLight3D.new()
	back_warm.name = "CellCaveBackAlcoveLight_" + cell_id
	back_warm.position = Vector3((x0 + x1) * 0.5 - 0.6, y0 + 2.05, z0 + 2.4)
	back_warm.light_color = Color(1.0, 0.72, 0.38)
	back_warm.light_energy = 2.35
	back_warm.omni_range = 8.5
	shell.add_child(back_warm)
	return door_ctrl

static func _build_cave_portal_trim(roof_parent: Node3D, cx: float, y0: float, z: float, width: float, height: float, mat_arch: Material, mat_rock: Material) -> void:
	# Dintel y dovelas talladas en caliza/basalto integrados en la bóveda (desaparecen al entrar)
	_box(roof_parent, Vector3(cx, y0 + height - 0.10, z + 0.10), Vector3(width + 0.72, 0.44, 0.56), mat_arch)
	_box(roof_parent, Vector3(cx, y0 + height + 0.04, z + 0.14), Vector3(0.56, 0.58, 0.64), mat_arch)
	for side_v in [-1.0, 1.0]:
		_box(roof_parent, Vector3(cx + float(side_v) * (width * 0.5 + 0.24), y0 + height * 0.48, z + 0.08), Vector3(0.38, height * 0.92, 0.46), mat_rock)

static func _create_cave_vault_mesh(x0: float, x1: float, z0: float, z1: float, front_y: float, back_y: float, door_x: float, door_w: float, rng: RandomNumberGenerator, rock_col: Color, moss_col: Color) -> ArrayMesh:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var nx := 28
	var nz := 16
	var grid: Array = []
	for iz in range(nz + 1):
		var fz := float(iz) / float(nz) # 0 = fondo norte (z0), 1 = frente sur (z1)
		var z := lerpf(z0, z1, fz)
		var row_pts: Array[Vector3] = []
		var row_cols: Array[Color] = []
		for ix in range(nx + 1):
			var fx := float(ix) / float(nx)
			var x := lerpf(x0, x1, fx)
			# Perfil de estratos volcánicos escalonados con terrazas y fractura basáltica (sin aspecto de loma lisa)
			var arch_x := sin(fx * PI)
			var terrace_steps := floorf((1.0 - fz) * 5.0) * 0.36
			var ridge_facet := absf(sin(x * 0.82 + z * 0.42)) * 0.46 - 0.20
			var base_h := lerpf(back_y, front_y, pow(fz, 0.74)) + terrace_steps * 0.38
			var dome := 0.62 * arch_x * (1.0 - 0.25 * fz)
			var crag := 0.42 * sin(x * 0.68 + z * 0.55) + 0.26 * cos(x * 1.48 - z * 1.15) + ridge_facet
			# Hendidura en arco sobre la puerta en el frente sur
			var door_dist := absf(x - door_x)
			var door_arch := 0.0
			if fz > 0.70 and door_dist < door_w * 0.78:
				door_arch = 0.52 * (1.0 - door_dist / (door_w * 0.78)) * ((fz - 0.70) / 0.30)
			var y := base_h + dome + crag + door_arch
			row_pts.append(Vector3(x, y, z))
			# Roca basáltica tallada dominante con vetas oscuras en grietas y musgo concentrado solo en repisas horizontales
			var crevice := clampf(0.5 + 0.5 * cos(x * 1.35 - z * 1.05), 0.0, 1.0)
			var ledge_mask := clampf(0.5 + 0.5 * sin(x * 0.48 + z * 0.62), 0.0, 1.0)
			var moss_f := clampf(((1.0 - fz) * 0.34 * ledge_mask) - 0.10 + rng.randf_range(-0.04, 0.04), 0.0, 0.40)
			var strata_shade := rock_col.darkened(clampf((fz - 0.55) * 0.28 + crevice * 0.20, 0.0, 0.32))
			row_cols.append(strata_shade.lerp(moss_col, moss_f))
		grid.append({"pts": row_pts, "cols": row_cols})

	for iz in range(nz):
		var ra: Array = grid[iz]["pts"]
		var rb: Array = grid[iz + 1]["pts"]
		var ca: Array = grid[iz]["cols"]
		var cb: Array = grid[iz + 1]["cols"]
		for ix in range(nx):
			_emit_quad_grid_xz(st, ra[ix], ra[ix + 1], rb[ix + 1], rb[ix], ca[ix], ca[ix + 1], cb[ix + 1], cb[ix])

	# Frente escarpado de acantilado en 3 estratos irregulares (baja hasta el suelo de la plaza salvo en el vano de la puerta)
	var front_row: Array = grid[nz]["pts"]
	var front_col: Array = grid[nz]["cols"]
	for ix in range(nx):
		var pa: Vector3 = front_row[ix]
		var pb: Vector3 = front_row[ix + 1]
		var mid_x := (pa.x + pb.x) * 0.5
		var is_door_span := absf(mid_x - door_x) < door_w * 0.55
		var target_bottom_y := 11.72 if is_door_span else 9.00
		var mid_y_a := lerpf(pa.y, target_bottom_y, 0.48) + sin(pa.x * 1.7) * 0.16
		var mid_y_b := lerpf(pb.y, target_bottom_y, 0.48) + sin(pb.x * 1.7) * 0.16
		var bulge_a := 0.24 + cos(pa.x * 1.3) * 0.14
		var bulge_b := 0.24 + cos(pb.x * 1.3) * 0.14
		var ma := Vector3(pa.x, mid_y_a, pa.z + bulge_a)
		var mb := Vector3(pb.x, mid_y_b, pb.z + bulge_b)
		var ba := Vector3(pa.x, minf(pa.y - 0.35, target_bottom_y), pa.z + bulge_a * 0.85)
		var bb := Vector3(pb.x, minf(pb.y - 0.35, target_bottom_y), pb.z + bulge_b * 0.85)
		var mid_c := rock_col.darkened(0.16)
		var dark_c := rock_col.darkened(0.32)
		_emit_quad_grid_xz(st, pa, pb, mb, ma, front_col[ix], front_col[ix + 1], mid_c, mid_c)
		if not is_door_span:
			_emit_quad_grid_xz(st, ma, mb, bb, ba, mid_c, mid_c, dark_c, dark_c)

	st.generate_normals()
	return st.commit()

static func make_layered_cliff_crag_mesh(seed_val: int = 701) -> ArrayMesh:
	# Bloque de roca basáltica estratificada de cima ancha y terrazas horizontales (cero conos puntiagudos ni puntas blancas)
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
		var was_open := bool(entry.get("is_open", false))
		# 3.7 Histéresis (+0.45m al estar abierta) para evitar cualquier parpadeo o popping al pisar el umbral
		var margin := 0.45 if was_open else 0.0
		var rect: Rect2 = (entry["rect"] as Rect2).grow(margin)
		var door_rect: Rect2 = (entry.get("door_rect", Rect2()) as Rect2).grow(margin)
		var y_min := float(entry["y_min"])
		var y_max := float(entry["y_max"])
		var door_node: Node3D = entry.get("door")
		var door_is_closed := is_instance_valid(door_node) and not bool(door_node.get("is_open"))
		var should_open := false

		for tok in tokens:
			if tok is Node3D and not bool(tok.get("is_npc")):
				var p := (tok as Node3D).global_position
				if p.y >= y_min and p.y <= y_max:
					var inside_room := rect.has_point(Vector2(p.x, p.z))
					var in_doorway := (not door_is_closed) and door_rect.size.x > 0.0 and door_rect.has_point(Vector2(p.x, p.z))
					if inside_room or in_doorway:
						should_open = true
						break

		# 3.8 Si la cámara táctica (Jugador o DM) enfoca directamente el interior de la sala/celda, abrir también su techo y frente
		if not should_open and cam_dist < 28.0:
			if cam_focus.y >= y_min and cam_focus.y <= y_max and rect.has_point(Vector2(cam_focus.x, cam_focus.z)):
				should_open = true

		entry["is_open"] = should_open
		set_roof_entry_open(entry, should_open)

static func set_roof_entry_open(entry: Dictionary, open: bool) -> void:
	entry["is_open"] = open
	var rnode: Node3D = entry.get("node")
	if is_instance_valid(rnode):
		rnode.visible = not open
	var extras: Array = entry.get("extra_cutaway_nodes", [])
	for ex in extras:
		if ex is Node3D and is_instance_valid(ex):
			(ex as Node3D).visible = not open

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
	var mat_jute: Material = builder.call("_make_mat", Color("#9a7948"), 0.94, 0.0)
	var mat_jute_trim: Material = builder.call("_make_mat", Color("#765932"), 0.94, 0.0)
	var cell_floor_rects := [
		Rect2(76.8, 79.0, 7.6, 8.8),
		Rect2(86.2, 76.6, 7.6, 11.2),
		Rect2(96.4, 78.0, 8.6, 9.8),
		Rect2(108.2, 76.8, 8.4, 11.0),
		Rect2(119.2, 76.6, 5.8, 11.2),
		Rect2(127.8, 76.8, 7.6, 11.0),
	]
	for cf_i in range(cell_floor_rects.size()):
		var cf_r: Rect2 = cell_floor_rects[cf_i]
		var cx_f := cf_r.position.x + cf_r.size.x * 0.5
		var cz_f := cf_r.position.y + cf_r.size.y * 0.5
		_box(cells_furn, Vector3(cx_f, y_a1 + 0.075, cz_f), Vector3(cf_r.size.x, 0.03, cf_r.size.y), mat_cell_floor)
		# 2.4 Lajas individuales de piedra irregular tallada dentro de cada celda para diferenciar suelo interior vs plaza exterior
		for sl_z in range(4):
			for sl_x in range(3):
				var sx_p := lerpf(cf_r.position.x + 1.1, cf_r.end.x - 1.1, float(sl_x) / 2.0) + sin(float(sl_z * 3 + sl_x + cf_i)) * 0.22
				var sz_p := lerpf(cf_r.position.y + 1.2, cf_r.end.y - 1.0, float(sl_z) / 3.0) + cos(float(sl_x * 5 + sl_z)) * 0.18
				var slab := _box(cells_furn, Vector3(sx_p, y_a1 + 0.092, sz_p), Vector3(1.65 + float((sl_x + sl_z) % 2) * 0.35, 0.018, 1.55 + float(sl_z % 2) * 0.30), mat_rock if (sl_x + sl_z + cf_i) % 2 == 0 else mat_stone)
				slab.rotation.y = sin(float(cf_i * 7 + sl_x * 3 + sl_z)) * 0.09

	# Celda 1 (Habitación de huésped / peregrino — Dormitorio, escritura y contemplación, ref. Imagen 4)
	_build_pilgrim_bed(cells_furn, Vector3(78.5, y_a1, 81.2), 0.0, mat_dark_oak, mat_linen, mat_blanket_crimson)
	_build_guest_bedroll(cells_furn, Vector3(82.85, y_a1, 78.65), -0.18, mat_jute, mat_blanket_blue, mat_linen, "Petate de huésped (norte)")
	_build_guest_bedroll(cells_furn, Vector3(78.25, y_a1, 86.75), 0.24, mat_jute, mat_blanket_ochre, mat_linen, "Petate de huésped (sur)")
	_build_nightstand_with_candle(cells_furn, Vector3(80.0, y_a1, 80.2), mat_oak, mat_bronze, mat_flame)
	_build_monastic_desk_and_chair(cells_furn, Vector3(82.4, y_a1, 82.2), -PI * 0.5, mat_oak, mat_dark_oak, mat_linen, mat_bronze)
	_build_braided_jute_mat(cells_furn, Vector3(80.2, y_a1 + 0.105, 83.4), Vector2(2.3, 3.2), mat_jute, mat_jute_trim)
	_build_bound_chest(cells_furn, Vector3(78.3, y_a1, 84.8), 0.25, mat_dark_oak, mat_iron, mat_bronze)
	_build_pilgrim_pack_and_basket(cells_furn, Vector3(83.35, y_a1, 86.95), -0.35, mat_jute_trim, mat_jute, mat_bronze, mat_pottery)
	_build_cave_rock_niche(cells_furn, Vector3(77.05, y_a1 + 1.48, 82.0), PI * 0.5, mat_rock, mat_dark_oak, mat_blanket_crimson, mat_bronze, mat_flame)
	_build_monastic_wall_tapestry(cells_furn, Vector3(84.25, y_a1 + 1.85, 81.8), -PI * 0.5, mat_linen, mat_blanket_crimson, mat_dark_oak, mat_gold)

	# Celda 2 (Celda de Tarak — Herborista y botánica monástica + saco pestilente y dagas ocultas del canon)
	_build_pilgrim_bed(cells_furn, Vector3(87.6, y_a1, 79.4), 0.0, mat_dark_oak, mat_linen, mat_blanket_sage)
	_build_nightstand_with_candle(cells_furn, Vector3(89.1, y_a1, 78.6), mat_oak, mat_bronze, mat_flame)
	_build_monastic_desk_and_chair(cells_furn, Vector3(91.4, y_a1, 81.6), -PI * 0.5, mat_oak, mat_dark_oak, mat_linen, mat_bronze)
	_build_herbalist_rack_and_potions(cells_furn, Vector3(87.3, y_a1, 83.6), mat_dark_oak, mat_pottery, mat_glass_herb, mat_blanket_sage)
	_build_hanging_herb_bundles(cells_furn, Vector3(87.3, y_a1 + 2.18, 83.5), mat_dark_oak, mat_blanket_sage, mat_jute)
	_build_tarak_compost_sack(cells_furn, Vector3(86.45, y_a1, 86.85), mat_jute_trim, mat_jute, mat_blanket_sage)
	_build_tarak_hidden_daggers(cells_furn, Vector3(93.35, y_a1, 79.35), mat_dark_oak, mat_iron, mat_bronze)
	_build_pilgrim_pack_and_basket(cells_furn, Vector3(92.45, y_a1, 86.95), -0.28, mat_jute_trim, mat_jute, mat_bronze, mat_pottery)
	_build_braided_jute_mat(cells_furn, Vector3(89.6, y_a1 + 0.105, 82.8), Vector2(2.4, 3.4), mat_jute, mat_blanket_sage)
	_build_cave_rock_niche(cells_furn, Vector3(85.85, y_a1 + 1.48, 80.6), PI * 0.5, mat_rock, mat_dark_oak, mat_blanket_sage, mat_glass_herb, mat_flame)
	_build_monastic_wall_tapestry(cells_furn, Vector3(94.35, y_a1 + 1.85, 81.2), -PI * 0.5, mat_linen, mat_blanket_sage, mat_dark_oak, mat_gold)

	# Celda 3 (Celda de Varnoth — Comandante retirada, útiles de albañil y vieja espada corta bajo el colchón)
	_build_pilgrim_bed(cells_furn, Vector3(98.0, y_a1, 80.8), 0.0, mat_dark_oak, mat_linen, mat_blanket_blue)
	_build_varnoth_hidden_sword(cells_furn, Vector3(98.78, y_a1, 81.05), mat_iron, mat_bronze, mat_dark_oak)
	_build_nightstand_with_candle(cells_furn, Vector3(99.6, y_a1, 79.9), mat_oak, mat_bronze, mat_flame)
	_build_monastic_desk_and_chair(cells_furn, Vector3(102.6, y_a1, 81.0), -PI * 0.5, mat_oak, mat_dark_oak, mat_linen, mat_bronze)
	_build_weapon_and_shield_rack(cells_furn, Vector3(97.6, y_a1, 84.2), mat_dark_oak, mat_iron, mat_bronze, mat_blanket_blue)
	_build_bound_chest(cells_furn, Vector3(103.2, y_a1, 84.4), -0.4, mat_dark_oak, mat_iron, mat_bronze)
	_build_pilgrim_pack_and_basket(cells_furn, Vector3(103.05, y_a1, 86.95), -0.32, mat_jute_trim, mat_jute, mat_iron, mat_pottery)
	_build_braided_jute_mat(cells_furn, Vector3(100.4, y_a1 + 0.105, 83.2), Vector2(2.7, 3.3), mat_jute, mat_rug_blue)
	_build_cave_rock_niche(cells_furn, Vector3(96.05, y_a1 + 1.48, 81.4), PI * 0.5, mat_rock, mat_dark_oak, mat_blanket_blue, mat_bronze, mat_flame)
	_build_monastic_wall_tapestry(cells_furn, Vector3(105.65, y_a1 + 1.85, 81.6), -PI * 0.5, mat_linen, mat_blanket_blue, mat_dark_oak, mat_gold)

	# Celda 4 (Taller y tienda de equipo de Myla — Erudita, ingeniería, alquimia y comercio de aventureros)
	_build_pilgrim_bed(cells_furn, Vector3(109.4, y_a1, 80.8), 0.0, mat_dark_oak, mat_linen, mat_blanket_crimson)
	_build_nightstand_with_candle(cells_furn, Vector3(110.9, y_a1, 79.9), mat_oak, mat_bronze, mat_flame)
	_build_tinker_workbench(cells_furn, Vector3(113.0, y_a1, 79.8), mat_oak, mat_dark_oak, mat_bronze, mat_iron, mat_glass_herb)
	_build_myla_gear_shop_display(cells_furn, Vector3(108.25, y_a1, 85.45), mat_oak, mat_dark_oak, mat_jute, mat_iron, mat_bronze, mat_glass_herb, mat_linen)
	_build_monastic_desk_and_chair(cells_furn, Vector3(113.6, y_a1, 83.6), -PI * 0.5, mat_oak, mat_dark_oak, mat_linen, mat_bronze)
	_build_monastic_storage_crates_and_baskets(cells_furn, Vector3(115.6, y_a1, 81.4), mat_dark_oak, mat_oak, mat_jute, mat_pottery)
	_build_pilgrim_pack_and_basket(cells_furn, Vector3(113.45, y_a1, 86.95), -0.25, mat_jute_trim, mat_jute, mat_bronze, mat_pottery)
	_build_braided_jute_mat(cells_furn, Vector3(111.2, y_a1 + 0.105, 83.4), Vector2(2.6, 3.2), mat_jute, mat_rug_warm)
	_build_cave_rock_niche(cells_furn, Vector3(107.35, y_a1 + 1.48, 82.0), PI * 0.5, mat_rock, mat_dark_oak, mat_blanket_ochre, mat_bronze, mat_flame)

	# Celda 5 (Kobolds Oeste — Agga, Blepp, Frub y Kilnip)
	var kw_positions := [
		Vector3(120.1, y_a1, 79.0), Vector3(122.5, y_a1, 79.0),
		Vector3(120.1, y_a1, 82.0), Vector3(122.5, y_a1, 82.0)
	]
	var kw_mats := [mat_blanket_ochre, mat_blanket_crimson, mat_blanket_sage, mat_blanket_blue]
	for i in range(4):
		_build_kobold_hammock(cells_furn, kw_positions[i], 0.08 if i % 2 == 0 else -0.08, mat_dark_oak, kw_mats[i], mat_linen)
	_build_blepp_dagger_peg(cells_furn, Vector3(118.85, y_a1, 86.45), mat_dark_oak, mat_iron, mat_bronze)
	_build_braided_jute_mat(cells_furn, Vector3(121.3, y_a1 + 0.105, 81.5), Vector2(1.9, 3.9), mat_jute, mat_blanket_crimson)
	_build_brazier_stand(cells_furn, Vector3(121.3, y_a1, 84.6), mat_iron, mat_bronze, mat_flame)
	_build_monastic_storage_crates_and_baskets(cells_furn, Vector3(123.6, y_a1, 85.2), mat_dark_oak, mat_oak, mat_jute, mat_pottery)
	_build_cave_rock_niche(cells_furn, Vector3(118.55, y_a1 + 1.48, 83.2), PI * 0.5, mat_rock, mat_dark_oak, mat_blanket_ochre, mat_pottery, mat_flame)

	# Celda 6 (Kobolds Este — Laylee, Mumpo, Rix y Zark + altar contemplativo y moneda oculta de Mumpo)
	var ke_positions := [
		Vector3(129.1, y_a1, 79.8), Vector3(132.4, y_a1, 79.8),
		Vector3(129.1, y_a1, 82.6), Vector3(132.4, y_a1, 82.6)
	]
	for i in range(4):
		_build_kobold_hammock(cells_furn, ke_positions[i], -0.08 if i % 2 == 0 else 0.08, mat_dark_oak, kw_mats[(i + 1) % 4], mat_linen)
	_build_cell_contemplative_shrine(cells_furn, Vector3(130.8, y_a1, 77.65), mat_stone, mat_rock, mat_bronze, mat_gold, mat_flame, mat_jute, mat_rug_gold)
	_build_mumpo_hidden_coin(cells_furn, Vector3(134.95, y_a1, 79.85), mat_rock, mat_bronze, mat_gold)
	_build_braided_jute_mat(cells_furn, Vector3(130.8, y_a1 + 0.105, 81.8), Vector2(2.2, 3.8), mat_jute, mat_rug_gold)
	_build_brazier_stand(cells_furn, Vector3(130.8, y_a1, 84.8), mat_iron, mat_bronze, mat_flame)
	_build_bound_chest(cells_furn, Vector3(132.8, y_a1, 84.8), -0.35, mat_oak, mat_iron, mat_bronze)
	_build_cave_rock_niche(cells_furn, Vector3(127.45, y_a1 + 1.48, 83.0), PI * 0.5, mat_rock, mat_dark_oak, mat_blanket_blue, mat_gold, mat_flame)
	_build_monastic_wall_tapestry(cells_furn, Vector3(135.85, y_a1 + 1.85, 81.6), -PI * 0.5, mat_linen, mat_blanket_ochre, mat_dark_oak, mat_gold)

	# --- B. PLAZA CENTRAL DE A1 (Jerarquía compositiva Paso 4 + Vida monástica Paso 9) ---
	var plaza_furn := Node3D.new()
	plaza_furn.name = "A1_Plaza_Furniture"
	furn_root.add_child(plaza_furn)

	var fire_center := Structure.cell_to_world(72, 62, y_a1) # (108.75, 9.0, 93.75)
	_build_plaza_hearth_and_benches(plaza_furn, fire_center, mat_stone, mat_dark_oak, mat_oak, mat_iron, mat_bronze, mat_flame, mat_linen, mat_blanket_ochre)
	_build_plaza_monastic_life_props(plaza_furn, y_a1, mat_oak, mat_dark_oak, mat_stone, mat_pottery, mat_linen, mat_jute, mat_rug_blue, mat_blanket_ochre)

	# 4.1–4.7 Pedestal circular escalonado de mampostería bajo la estatua de Astalagan en el eje noble (85.80, 9.0, 93.35) con circulación 360°
	_build_astalagan_shrine_altar(plaza_furn, Vector3(85.80, y_a1, 93.35), mat_stone, mat_rock, mat_bronze, mat_gold, mat_flame)

	# 4.6 Pozo monástico de piedra alineado en el eje central-oeste (95.60, 9.0, 93.45) en diálogo con la estatua y los bancos
	_build_monastic_well_fountain(plaza_furn, Vector3(95.60, y_a1, 93.45), mat_stone, mat_dark_oak, mat_iron, mat_water)

	# 4.6 Bancos monásticos de roble retranqueados junto a los contrafuertes entre celdas (z=89.55, mirando al mar/plaza, ref. Imágenes 1–3)
	for bx_plaza in [86.0, 95.3, 117.8]:
		_build_interactive_bench(plaza_furn, Vector3(bx_plaza, y_a1, 89.58), 0.0, mat_oak, mat_dark_oak, mat_stone, "s", "Banco del Claustro")

	# 1 Pérgola compacta al este del paseo (123.5, 9.0, 95.0) dejando >=3.0m libres delante de C1-C6 (z=89.2..92.6)
	_build_cloister_pergola_and_table(plaza_furn, Vector3(123.5, y_a1, 95.0), mat_dark_oak, mat_oak, mat_pottery, mat_bronze, mat_flame, mat_blanket_ochre)

	# Suministros, barriles y tablón de avisos en la esquina suroeste junto a la llegada de la escalera (76.2, 9.0, 95.65)
	_build_plaza_supply_corner(plaza_furn, Vector3(76.2, y_a1, 95.65), mat_oak, mat_dark_oak, mat_iron, mat_linen)
	# Puesto de vigía discreto de Blepp junto al pretil sur mirando la bajada a la playa (sin bloquear tránsito)
	_build_blepp_lookout_post(plaza_furn, Vector3(107.4, y_a1, 95.55), mat_stone, mat_dark_oak, mat_bronze, mat_flame)

	# --- C. INTERIORES DE A3 (COMEDOR/COCINA FASE 3) Y A4 (BIBLIOTECA/SCRIPTORIUM FASE 4) ---
	var y_upper := Structure.ELEV_A3_DINING
	var a3_furn := Node3D.new()
	a3_furn.name = "A3_Refectory_Furniture"
	furn_root.add_child(a3_furn)
	var InteriorsA3A4 := load("res://scripts/retreat_interiors_a3_a4.gd")
	if InteriorsA3A4 != null:
		InteriorsA3A4.build_a3_refectory_and_kitchen(builder, a3_furn, y_upper, mat_oak, mat_dark_oak, mat_stone, mat_iron, mat_bronze, mat_pottery, mat_linen, mat_flame)
	else:
		_build_a3_banquet_and_hearth(a3_furn, y_upper, mat_oak, mat_dark_oak, mat_stone, mat_iron, mat_bronze, mat_pottery, mat_linen, mat_flame)

	var a4_furn := Node3D.new()
	a4_furn.name = "A4_Scriptorium_Furniture"
	furn_root.add_child(a4_furn)
	if InteriorsA3A4 != null:
		InteriorsA3A4.build_a4_library_and_scriptorium(builder, a4_furn, y_upper, mat_dark_oak, mat_oak, mat_linen, mat_bronze, mat_gold, mat_flame, mat_rug_blue, mat_blanket_crimson, mat_blanket_sage)
	else:
		_build_a4_scriptorium_details(a4_furn, y_upper, mat_dark_oak, mat_oak, mat_linen, mat_bronze, mat_gold, mat_flame, mat_rug_blue, mat_blanket_crimson, mat_blanket_sage)

	# Mantener A1/A3/A4 por mueble (libros/pergaminos/losas ya usan MultiMeshInstance3D) para no exceder el límite de 8 OmniLight3D por MeshInstance3D en Forward+ y preservar la iluminación cálida nocturna.

	# Fase 5: Paseo Superior, Jardines Z7, bancos con detalles monásticos y faroles de pedestal
	var upper_furn := Node3D.new()
	upper_furn.name = "UpperWalkway_Furniture"
	furn_root.add_child(upper_furn)
	var upper_lanterns := Node3D.new()
	upper_lanterns.name = "UpperWalkway_Lanterns"
	furn_root.add_child(upper_lanterns)
	for bx_up in [89.0, 108.6, 127.8]:
		_build_interactive_bench(upper_furn, Vector3(float(bx_up), y_upper, 66.15), 0.0, mat_oak, mat_dark_oak, mat_stone, "s", "Banco del Paseo")
	# Detalles discretos sobre/junto a los bancos para romper simetría (manta doblada y zurrón de viaje)
	_box(upper_furn, Vector3(88.45, y_upper + 0.51, 66.15), Vector3(0.46, 0.07, 0.34), mat_blanket_ochre)
	_box(upper_furn, Vector3(129.05, y_upper + 0.16, 66.22), Vector3(0.38, 0.32, 0.24), mat_dark_oak)
	if InteriorsA3A4 != null:
		InteriorsA3A4.build_paseo_and_z7_enhancements(builder, upper_furn, upper_lanterns)
	merge_static_children_by_material(upper_furn)

static func _build_pilgrim_bed(parent: Node3D, pos: Vector3, yaw: float, mat_frame: Material, mat_sheet: Material, mat_blanket: Material) -> void:
	var bed := Node3D.new()
	bed.name = "PilgrimBed_%d_%d" % [int(pos.x), int(pos.z)]
	bed.position = pos
	bed.rotation.y = yaw
	bed.set_meta("rest_head", Vector3(0.0, 0.681, -0.84))
	bed.set_meta("rest_bedding", 0.622)
	bed.set_meta("rest_foot", 1.02)
	bed.set_meta("rest_width", 1.12)
	parent.add_child(bed)
	# Bastidor y 4 postes torneados
	_box(bed, Vector3(0.0, 0.28, 0.0), Vector3(1.22, 0.22, 2.15), mat_frame)
	_box(bed, Vector3(0.0, 0.68, -1.02), Vector3(1.24, 0.78, 0.12), mat_frame) # cabecero
	_box(bed, Vector3(0.0, 0.48, 1.02), Vector3(1.24, 0.44, 0.10), mat_frame)  # piecero
	for dx in [-0.56, 0.56]:
		for dz in [-1.02, 1.02]:
			_cyl(bed, Vector3(dx, 0.52, dz), 0.07, 1.04, mat_frame)
	# Colchón de lino, almohada y manta tejida doblada con caída lateral (ref. Imagen 4)
	_box(bed, Vector3(0.0, 0.45, 0.0), Vector3(1.10, 0.20, 1.94), mat_sheet)
	_box(bed, Vector3(0.0, 0.59, -0.72), Vector3(0.86, 0.14, 0.38), mat_sheet)
	_box(bed, Vector3(0.0, 0.48, 0.32), Vector3(1.14, 0.22, 1.22), mat_blanket)
	var throw_fold := _box(bed, Vector3(0.32, 0.49, 0.52), Vector3(0.66, 0.24, 0.76), mat_blanket)
	throw_fold.rotation.y = 0.08
	add_box_collider(bed, Vector3(0.0, 0.52, 0.0), Vector3(1.26, 1.04, 2.20))
	# 8.3–8.8 Interacción usable para tumbarse y descansar sobre la cama (con busto 3D y manta)
	var ip := _attach_interactive_prop(bed, "bed", "Camastro de peregrino", "[T] Tumbarse a descansar", Vector3(0.0, 0.54, 0.05), "s")
	ip.interact_radius = 2.65

static func _build_nightstand_with_candle(parent: Node3D, pos: Vector3, mat_wood: Material, mat_brass: Material, mat_flame: Material) -> void:
	var ns := Node3D.new()
	ns.position = pos
	parent.add_child(ns)
	_box(ns, Vector3(0.0, 0.38, 0.0), Vector3(0.62, 0.76, 0.56), mat_wood)
	_box(ns, Vector3(0.0, 0.78, 0.0), Vector3(0.68, 0.06, 0.62), mat_wood)
	_cyl(ns, Vector3(0.0, 0.84, 0.0), 0.09, 0.06, mat_brass)
	_cyl(ns, Vector3(0.0, 0.94, 0.0), 0.035, 0.16, mat_flame)
	add_box_collider(ns, Vector3(0.0, 0.45, 0.0), Vector3(0.68, 0.90, 0.62))

const InteractivePropScript = preload("res://scripts/interactive_prop.gd")

static func _attach_interactive_prop(node: Node3D, kind: String, prop_name: String, hint: String, seat_off: Vector3 = Vector3.ZERO, facing: String = "s", toast: String = "") -> Node3D:
	if not node:
		return null
	var ip := InteractivePropScript.new()
	ip.name = "Interactive_" + kind.capitalize()
	ip.prop_kind = kind
	ip.display_name = prop_name
	ip.interaction_hint = hint
	ip.seat_offset = seat_off
	ip.seat_facing = facing
	ip.toast_text = toast
	node.add_child(ip)
	return ip

static func _attach_seat_prop(node: Node3D, kind: String, prop_name: String, hint: String, slots: Array[Vector3], heading_local: Vector3, front_radius: float, facing: String = "s", face_approach: bool = false, radius: float = 2.45) -> Node3D:
	var ip := _attach_interactive_prop(node, kind, prop_name, hint, slots[0] if not slots.is_empty() else Vector3(0.0, 0.48, 0.0), facing)
	if ip:
		ip.seat_slots_local = slots
		ip.seat_heading_local = heading_local
		ip.seat_front_radius = front_radius
		ip.seat_face_approach = face_approach
		ip.interact_radius = radius
	return ip

static func _build_interactive_bench(parent: Node3D, pos: Vector3, yaw: float, mat_oak: Material, mat_dark: Material, mat_stone: Material, facing: String, label: String) -> void:
	var bench := Node3D.new()
	bench.position = pos
	bench.rotation.y = yaw
	parent.add_child(bench)
	_box(bench, Vector3(0.0, 0.46, 0.0), Vector3(1.95, 0.09, 0.58), mat_oak)
	_box(bench, Vector3(0.0, 0.84, -0.24), Vector3(1.90, 0.42, 0.08), mat_dark)
	for lx in [-0.74, 0.74]:
		_box(bench, Vector3(lx, 0.23, 0.0), Vector3(0.20, 0.46, 0.50), mat_stone)
	add_box_collider(bench, Vector3(0.0, 0.50, 0.0), Vector3(1.98, 1.00, 0.62))
	var slots: Array[Vector3] = [Vector3(-0.46, 0.505, 0.04), Vector3(0.46, 0.505, 0.04)]
	_attach_seat_prop(bench, "bench", label, "[T] Sentarse en banco", slots, Vector3(0.0, 0.0, 1.0), 0.29, facing, false, 2.55)

static func _build_monastic_desk_and_chair(parent: Node3D, pos: Vector3, yaw: float, mat_wood: Material, mat_dark: Material, mat_paper: Material, mat_brass: Material) -> void:
	var d := Node3D.new()
	d.position = pos
	d.rotation.y = yaw
	parent.add_child(d)
	_box(d, Vector3(0.0, 0.78, 0.0), Vector3(1.52, 0.09, 0.84), mat_wood)
	for dx in [-0.64, 0.64]:
		_box(d, Vector3(dx, 0.39, 0.0), Vector3(0.13, 0.78, 0.70), mat_dark)
	# 9.2 Detalles sobrios sobre la mesa de celda: jarra cerámica con asa, cuenco de barro, libro encuadernado y palmatoria con vela (ref. Imagen 4)
	var paper := _box(d, Vector3(-0.12, 0.835, 0.04), Vector3(0.46, 0.02, 0.34), mat_paper)
	if absf(pos.x - 113.6) < 0.08 and absf(pos.y - 9.0) < 0.1:
		routine_target(paper, "RetreatWorkshopPaper")
	# Jarra cerámica (panza, cuello, boca y asa)
	_cyl(d, Vector3(-0.48, 0.90, -0.18), 0.095, 0.16, mat_paper)
	_cyl(d, Vector3(-0.48, 1.00, -0.18), 0.048, 0.08, mat_paper)
	_cyl(d, Vector3(-0.48, 1.04, -0.18), 0.064, 0.025, mat_brass)
	_box(d, Vector3(-0.56, 0.95, -0.18), Vector3(0.05, 0.12, 0.025), mat_dark)
	# Cuenco de barro torneado
	_cyl(d, Vector3(-0.22, 0.86, -0.16), 0.095, 0.07, mat_dark)
	_cyl(d, Vector3(-0.22, 0.88, -0.16), 0.078, 0.04, mat_brass)
	# Libro cerrado encuadernado con lomo y páginas
	var codex := _box(d, Vector3(0.22, 0.855, 0.14), Vector3(0.32, 0.06, 0.24), mat_dark)
	codex.rotation.y = 0.14
	var pages := _box(d, Vector3(0.22, 0.855, 0.145), Vector3(0.30, 0.044, 0.22), mat_paper)
	pages.rotation.y = 0.14
	# Palmatoria de latón con vela encendida
	_cyl(d, Vector3(0.42, 0.84, -0.15), 0.095, 0.03, mat_brass)
	_cyl(d, Vector3(0.42, 0.92, -0.15), 0.038, 0.15, mat_paper)
	# 8.1 Taburete monástico de asiento circular de roble y 4 patas abiertas con travesaños (ref. Imagen 4)
	_cyl(d, Vector3(0.0, 0.46, 0.72), 0.27, 0.065, mat_wood)
	_cyl(d, Vector3(0.0, 0.43, 0.72), 0.23, 0.04, mat_dark)
	for sx in [-0.17, 0.17]:
		for sz in [0.55, 0.89]:
			var s_leg := _cyl(d, Vector3(sx, 0.22, sz), 0.038, 0.44, mat_dark)
			s_leg.rotation = Vector3((sz - 0.72) * 0.35, 0.0, -sx * 0.35)
	_box(d, Vector3(0.0, 0.16, 0.56), Vector3(0.32, 0.035, 0.035), mat_dark)
	_box(d, Vector3(0.0, 0.16, 0.88), Vector3(0.32, 0.035, 0.035), mat_dark)
	add_box_collider(d, Vector3(0.0, 0.50, 0.0), Vector3(1.55, 1.00, 0.86))
	add_box_collider(d, Vector3(0.0, 0.32, 0.72), Vector3(0.56, 0.64, 0.56))
	_attach_interactive_prop(d, "table", "Escritorio de estudio", "[T] Examinar escritorio", Vector3.ZERO, "n", "Revisas los pergaminos y notas manuscritas sobre el escritorio.")
	var chair_anchor := Node3D.new()
	chair_anchor.name = "DeskChairAnchor"
	chair_anchor.position = Vector3(0.0, 0.0, 0.72)
	d.add_child(chair_anchor)
	var stool_slots: Array[Vector3] = [Vector3(0.0, 0.495, 0.0)]
	_attach_seat_prop(chair_anchor, "chair", "Taburete monástico", "[T] Sentarse en taburete", stool_slots, Vector3(0.0, 0.0, -1.0), 0.26, "n" if is_zero_approx(yaw) else "e", false, 2.2)

static func _build_kobold_hammock(parent: Node3D, pos: Vector3, yaw: float, mat_wood: Material, mat_cloth: Material, mat_pillow: Material) -> void:
	var h := Node3D.new()
	h.name = "KoboldHammock_%d_%d" % [int(pos.x * 10.0), int(pos.z * 10.0)]
	h.position = pos
	h.rotation.y = yaw
	h.set_meta("rest_head", Vector3(0.0, 0.66, -0.76))
	h.set_meta("rest_bedding", 0.56)
	h.set_meta("rest_foot", 0.96)
	h.set_meta("rest_width", 0.86)
	parent.add_child(h)
	# 2 Postes de anclaje de roble con travesaño
	for dz in [-1.05, 1.05]:
		_cyl(h, Vector3(0.0, 0.62, dz), 0.08, 1.24, mat_wood)
	# Lona curva en catenaria (3 segmentos)
	var cloth: Node3D = h
	var routine_cloths := {
		"KoboldHammock_1200_820": "RetreatHammockWestCloth",
		"KoboldHammock_1225_820": "RetreatHammockWest2Cloth",
		"KoboldHammock_1323_825": "RetreatHammockEastCloth",
		"KoboldHammock_1291_825": "RetreatHammockEast2Cloth",
	}
	if routine_cloths.has(str(h.name)):
		cloth = routine_pivot(h, routine_cloths[str(h.name)], Vector3.ZERO)
	var b0 := _box(cloth, Vector3(0.0, 0.56, -0.58), Vector3(0.82, 0.07, 0.68), mat_cloth)
	b0.rotation.x = 0.22
	_box(cloth, Vector3(0.0, 0.48, 0.0), Vector3(0.86, 0.08, 0.64), mat_cloth)
	var b1 := _box(cloth, Vector3(0.0, 0.56, 0.58), Vector3(0.82, 0.07, 0.68), mat_cloth)
	b1.rotation.x = -0.22
	_box(cloth, Vector3(0.0, 0.62, -0.62), Vector3(0.54, 0.10, 0.28), mat_pillow)
	add_box_collider(h, Vector3(0.0, 0.62, 0.0), Vector3(0.92, 1.25, 2.24))
	# 8.3–8.8 Interacción usable para descansar en las hamacas de las celdas 5 y 6
	var hip := _attach_interactive_prop(h, "hammock", "Hamaca del claustro", "[T] Tumbarse en hamaca", Vector3(0.0, 0.52, 0.0), "s")
	hip.interact_radius = 2.55

static func _build_herbalist_rack_and_potions(parent: Node3D, pos: Vector3, mat_wood: Material, mat_pot: Material, mat_glass: Material, mat_herb: Material) -> void:
	var r := Node3D.new()
	r.name = "HerbalistRackTarak"
	r.position = pos
	parent.add_child(r)
	_box(r, Vector3(0.0, 0.95, 0.0), Vector3(1.5, 1.9, 0.42), mat_wood)
	var mat_potion_ruby := StandardMaterial3D.new()
	mat_potion_ruby.albedo_color = Color("#b32934")
	mat_potion_ruby.roughness = 0.18
	mat_potion_ruby.metallic = 0.06
	mat_potion_ruby.emission_enabled = true
	mat_potion_ruby.emission = Color("#7d1822")
	mat_potion_ruby.emission_energy_multiplier = 0.35
	for dx in [-0.45, 0.0, 0.45]:
		_cyl(r, Vector3(dx, 1.15, 0.05), 0.11, 0.26, mat_glass)
		_cyl(r, Vector3(dx, 0.62, 0.05), 0.14, 0.28, mat_pot)
		var herbs := _box(r, Vector3(dx, 1.62, 0.08), Vector3(0.22, 0.34, 0.18), mat_herb)
		if is_zero_approx(dx):
			routine_target(herbs, "RetreatHerbBundle")
	# Dos frascos de poción de curación canónicos de Tarak (hongos sombrero de corazón)
	for pdx in [-0.22, 0.22]:
		_cyl(r, Vector3(pdx, 1.14, 0.14), 0.065, 0.18, mat_potion_ruby)
		_cyl(r, Vector3(pdx, 1.25, 0.14), 0.032, 0.05, mat_wood)
	add_box_collider(r, Vector3(0.0, 0.95, 0.0), Vector3(1.52, 1.90, 0.46))
	tag_camera_occluder(r)
	_attach_interactive_prop(r, "herbrack", "Estantería de Tarak", "[T] Examinar hierbas y pociones")

static func _build_weapon_and_shield_rack(parent: Node3D, pos: Vector3, mat_wood: Material, mat_iron: Material, mat_brass: Material, mat_emblem: Material) -> void:
	var w := Node3D.new()
	w.name = "WeaponRackVarnoth"
	w.position = pos
	parent.add_child(w)
	# Estante de herramientas de albañil de Varnoth + su antiguo escudo retirado de los Lobos Celestes (canon p. 9 y p. 48)
	_box(w, Vector3(0.0, 0.85, 0.0), Vector3(1.4, 1.7, 0.38), mat_wood)
	# Conserva el pivote RetreatRackShield esperado por la rutina nocturna de Varnoth
	var shield := routine_pivot(w, "RetreatRackShield", Vector3(-0.35, 0.95, 0.22))
	_cyl(shield, Vector3.ZERO, 0.38, 0.08, mat_emblem)
	_cyl(shield, Vector3(0, 0, 0.04), 0.12, 0.10, mat_brass)
	# Herramientas de albañil colgadas y dispuestas en la balda derecha (mazo, cincel, paleta, plomada y planos)
	_box(w, Vector3(0.28, 0.82, 0.20), Vector3(0.68, 0.06, 0.22), mat_wood)
	_box(w, Vector3(0.28, 1.28, 0.20), Vector3(0.68, 0.06, 0.22), mat_wood)
	# Mazo de albañil (cabeza de madera/hierro + mango)
	_box(w, Vector3(0.14, 1.40, 0.22), Vector3(0.18, 0.11, 0.10), mat_iron)
	_cyl(w, Vector3(0.14, 1.22, 0.22), 0.024, 0.30, mat_wood)
	# Cincel de piedra + paleta de mortero + plomada de latón
	_box(w, Vector3(0.34, 1.41, 0.22), Vector3(0.045, 0.26, 0.035), mat_iron)
	_box(w, Vector3(0.49, 1.39, 0.22), Vector3(0.11, 0.16, 0.025), mat_iron)
	_cyl(w, Vector3(0.48, 0.94, 0.23), 0.042, 0.14, mat_brass)
	# Caja de herramientas de albañil en el nivel medio
	_box(w, Vector3(0.22, 0.94, 0.21), Vector3(0.36, 0.16, 0.18), mat_wood)
	_box(w, Vector3(0.22, 1.03, 0.21), Vector3(0.32, 0.03, 0.03), mat_iron)
	add_box_collider(w, Vector3(0.0, 0.85, 0.0), Vector3(1.44, 1.70, 0.48))
	tag_camera_occluder(w)
	_attach_interactive_prop(w, "weaponrack", "Útiles de albañil y escudo de Varnoth", "[T] Inspeccionar herramientas y escudo retirado")

static func _build_guest_bedroll(parent: Node3D, pos: Vector3, yaw: float, mat_mat: Material, mat_blanket: Material, mat_pillow: Material, label: String) -> void:
	var br := Node3D.new()
	br.name = "GuestBedroll_%d_%d" % [int(pos.x), int(pos.z)]
	br.position = pos
	br.rotation.y = yaw
	parent.add_child(br)
	# Estera tejida, manta mullida de viaje y almohada enrollada lista para los PJ en Celda 1
	_box(br, Vector3(0.0, 0.045, 0.0), Vector3(0.96, 0.05, 1.92), mat_mat)
	_box(br, Vector3(0.0, 0.095, 0.14), Vector3(0.88, 0.06, 1.48), mat_blanket)
	var pillow := _cyl(br, Vector3(0.0, 0.13, -0.72), 0.11, 0.68, mat_pillow)
	pillow.rotation.z = PI * 0.5
	var roll := _cyl(br, Vector3(0.0, 0.14, 0.86), 0.095, 0.82, mat_blanket)
	roll.rotation.z = PI * 0.5
	var bip := _attach_interactive_prop(br, "bed", label, "[T] Descansar en %s" % label.to_lower(), Vector3(0.0, 0.16, 0.0), "s")
	bip.interact_radius = 2.25

static func _build_tarak_compost_sack(parent: Node3D, pos: Vector3, mat_sack: Material, mat_rope: Material, mat_herb: Material) -> void:
	var sk := Node3D.new()
	sk.name = "TarakCompostSack"
	sk.position = pos
	parent.add_child(sk)
	# Saco pestilente de restos de comida preparado para los micónidos de Pleamar (p. 9 y p. 16)
	_cyl(sk, Vector3(0.0, 0.28, 0.0), 0.24, 0.56, mat_sack)
	_cyl(sk, Vector3(0.0, 0.52, 0.0), 0.13, 0.10, mat_rope)
	_cyl(sk, Vector3(0.0, 0.61, 0.0), 0.17, 0.12, mat_sack)
	_box(sk, Vector3(0.28, 0.10, 0.14), Vector3(0.22, 0.14, 0.18), mat_herb)
	# Vaho verdoso discreto indicando el olor penetrante del compost
	var odor := GPUParticles3D.new()
	odor.name = "CompostOdorWisps"
	odor.position = Vector3(0.0, 0.68, 0.0)
	odor.amount = 6
	odor.lifetime = 2.6
	var pm := ParticleProcessMaterial.new()
	pm.direction = Vector3(0.0, 1.0, 0.0)
	pm.spread = 24.0
	pm.initial_velocity_min = 0.08
	pm.initial_velocity_max = 0.16
	pm.gravity = Vector3(0.0, 0.04, 0.0)
	pm.scale_min = 0.07
	pm.scale_max = 0.14
	pm.color = Color(0.56, 0.68, 0.36, 0.34)
	odor.process_material = pm
	var qm := QuadMesh.new()
	qm.size = Vector2(0.16, 0.16)
	var qmat := StandardMaterial3D.new()
	qmat.albedo_color = Color(0.58, 0.70, 0.38, 0.30)
	qmat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	qmat.billboard_mode = BaseMaterial3D.BILLBOARD_ENABLED
	qmat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	qm.material = qmat
	odor.draw_pass_1 = qm
	odor.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	sk.add_child(odor)
	add_cyl_collider(sk, Vector3(0.0, 0.32, 0.0), 0.30, 0.66)
	var sip := _attach_interactive_prop(sk, "secret", "Saco pestilente de Tarak", "[T] Examinar saco pestilente", Vector3.ZERO, "n", "Saco de restos de comida fermentados con un olor penetrante: Tarak lo preparó como obsequio para los micónidos de las Cuevas de Pleamar.")
	sip.set_meta("secret_id", "tarak_compost")
	sip.interact_radius = 2.25

static func _build_tarak_hidden_daggers(parent: Node3D, pos: Vector3, mat_wood: Material, mat_iron: Material, mat_brass: Material) -> void:
	var hd := Node3D.new()
	hd.name = "TarakHiddenDaggers"
	hd.position = pos
	parent.add_child(hd)
	# Tabla suelta discreta junto al muro este con 3 dagas equilibradas envueltas (secreto Apéndice B p. 47)
	var board := _box(hd, Vector3(0.0, 0.11, 0.0), Vector3(0.54, 0.035, 0.32), mat_wood)
	board.rotation.y = 0.09
	for di in range(3):
		var dz := -0.08 + float(di) * 0.08
		_box(hd, Vector3(-0.04, 0.132, dz), Vector3(0.24, 0.014, 0.028), mat_iron)
		_box(hd, Vector3(0.11, 0.134, dz), Vector3(0.09, 0.022, 0.024), mat_brass)
	var dip := _attach_interactive_prop(hd, "secret", "Tabla suelta de Celda 2", "[T] Revisar tabla holgada", Vector3.ZERO, "n", "Bajo la tabla reposan tres dagas equilibradas de acero oscuro envueltas en cuero engrasado; no son herramientas de jardinería.")
	dip.set_meta("secret_id", "tarak_daggers")
	dip.interact_radius = 2.15

static func _build_varnoth_hidden_sword(parent: Node3D, pos: Vector3, mat_iron: Material, mat_brass: Material, mat_leather: Material) -> void:
	var hs := Node3D.new()
	hs.name = "VarnothHiddenSword"
	hs.position = pos
	parent.add_child(hs)
	# Empuñadura gastada asomando apenas bajo el colchón de Varnoth (secreto Apéndice B p. 48)
	var hilt := _box(hs, Vector3(0.0, 0.44, 0.0), Vector3(0.16, 0.035, 0.035), mat_leather)
	hilt.rotation.y = 0.24
	var guard := _box(hs, Vector3(-0.08, 0.44, -0.02), Vector3(0.025, 0.035, 0.14), mat_brass)
	guard.rotation.y = 0.24
	var blade_tip := _box(hs, Vector3(-0.18, 0.44, -0.045), Vector3(0.18, 0.015, 0.042), mat_iron)
	blade_tip.rotation.y = 0.24
	var sip := _attach_interactive_prop(hs, "secret", "Colchón de Varnoth", "[T] Mirar bajo el colchón", Vector3.ZERO, "w", "Bajo el colchón de paja descansa una vieja espada corta bien afilada con el emblema raspado de los Lobos Celestes.")
	sip.set_meta("secret_id", "varnoth_sword")
	sip.interact_radius = 2.25

static func _build_myla_gear_shop_display(parent: Node3D, pos: Vector3, mat_oak: Material, mat_dark: Material, mat_rope: Material, mat_iron: Material, mat_brass: Material, mat_glass: Material, mat_paper: Material) -> void:
	var sh := Node3D.new()
	sh.name = "MylaGearShopDisplay"
	sh.position = pos
	sh.rotation.y = PI * 0.5
	parent.add_child(sh)
	# Expositor compacto de la tienda de equipo del claustro (p. 8: los PJ pueden comprar equipo del reglamento a Myla)
	_box(sh, Vector3(0.0, 0.46, 0.0), Vector3(1.56, 0.92, 0.48), mat_dark)
	_box(sh, Vector3(0.0, 0.94, 0.0), Vector3(1.64, 0.07, 0.54), mat_oak)
	_box(sh, Vector3(0.0, 1.38, -0.14), Vector3(1.52, 0.06, 0.24), mat_oak)
	for lx in [-0.72, 0.72]:
		_box(sh, Vector3(lx, 1.16, -0.14), Vector3(0.08, 0.50, 0.08), mat_dark)
	# Rollo de cuerda de cáñamo, farol de latón, haz de antorchas, palanca de hierro y frascos alquímicos
	_cyl(sh, Vector3(-0.48, 1.03, 0.04), 0.16, 0.11, mat_rope)
	_cyl(sh, Vector3(-0.08, 1.09, 0.04), 0.09, 0.22, mat_brass)
	for ti in range(3):
		var t_stick := _cyl(sh, Vector3(0.28 + float(ti) * 0.06, 1.04, 0.06), 0.025, 0.34, mat_oak)
		t_stick.rotation.x = PI * 0.5
	_box(sh, Vector3(0.58, 1.01, 0.04), Vector3(0.32, 0.03, 0.04), mat_iron)
	for vi in range(3):
		_cyl(sh, Vector3(-0.40 + float(vi) * 0.24, 1.50, -0.14), 0.055, 0.16, mat_glass)
	# Tablilla de lista de precios sobre el expositor
	_box(sh, Vector3(0.36, 1.50, -0.14), Vector3(0.42, 0.24, 0.03), mat_paper)
	add_box_collider(sh, Vector3(0.0, 0.74, 0.0), Vector3(1.68, 1.48, 0.58))
	tag_camera_occluder(sh)
	var shp := _attach_interactive_prop(sh, "shop", "Tienda de equipo de Myla", "[T] Ver catálogo de equipo de Myla", Vector3.ZERO, "e")
	shp.interact_radius = 2.50

static func _build_blepp_dagger_peg(parent: Node3D, pos: Vector3, mat_wood: Material, mat_iron: Material, mat_brass: Material) -> void:
	var bp := Node3D.new()
	bp.name = "BleppDaggerPeg"
	bp.position = pos
	parent.add_child(bp)
	_box(bp, Vector3(0.0, 0.92, 0.0), Vector3(0.08, 0.22, 0.28), mat_wood)
	_box(bp, Vector3(0.06, 0.84, 0.0), Vector3(0.04, 0.26, 0.05), mat_iron)
	_box(bp, Vector3(0.06, 0.98, 0.0), Vector3(0.04, 0.04, 0.12), mat_brass)
	var bip := _attach_interactive_prop(bp, "secret", "Funda de Blepp", "[T] Examinar funda de Blepp", Vector3.ZERO, "w", "La funda remendada donde Blepp guarda su «daga mágica de la suerte». A simple vista es una daga común, pulida con devoción obsesiva.")
	bip.set_meta("secret_id", "blepp_dagger")
	bip.interact_radius = 2.10

static func _build_mumpo_hidden_coin(parent: Node3D, pos: Vector3, mat_rock: Material, mat_bronze: Material, mat_gold: Material) -> void:
	var mc := Node3D.new()
	mc.name = "MumpoHiddenCoin"
	mc.position = pos
	parent.add_child(mc)
	_cyl(mc, Vector3(0.0, 0.11, 0.0), 0.14, 0.08, mat_rock)
	_cyl(mc, Vector3(0.09, 0.115, 0.05), 0.032, 0.012, mat_bronze)
	_cyl(mc, Vector3(0.09, 0.122, 0.05), 0.022, 0.008, mat_gold)
	var mip := _attach_interactive_prop(mc, "secret", "Escondite de Mumpo", "[T] Revisar piedra suelta", Vector3.ZERO, "e", "Bajo un guijarro brilla una única moneda de cobre lustrada: el «gran botín» que Mumpo sustrajo en secreto del tesoro de Runara.")
	mip.set_meta("secret_id", "mumpo_coin")
	mip.interact_radius = 2.15

static func _build_blepp_lookout_post(parent: Node3D, pos: Vector3, mat_stone: Material, mat_wood: Material, mat_brass: Material, mat_flame: Material) -> void:
	var lp := Node3D.new()
	lp.name = "BleppLookoutPost"
	lp.position = pos
	parent.add_child(lp)
	# Pequeño hito de vigía junto al pretil sur de A1 con farol de guardia y catalejo corto (0 bloqueo de paso)
	_box(lp, Vector3(0.0, 0.34, 0.0), Vector3(0.46, 0.68, 0.42), mat_stone)
	_box(lp, Vector3(0.0, 0.71, 0.0), Vector3(0.52, 0.07, 0.48), mat_wood)
	_cyl(lp, Vector3(-0.10, 0.85, 0.0), 0.075, 0.22, mat_brass)
	var lf := _cyl(lp, Vector3(-0.10, 0.86, 0.0), 0.038, 0.10, mat_flame)
	lf.add_to_group("night_flame")
	var spy := _cyl(lp, Vector3(0.11, 0.77, 0.02), 0.030, 0.26, mat_brass)
	spy.rotation = Vector3(0.0, 0.45, PI * 0.5)
	add_box_collider(lp, Vector3(0.0, 0.40, 0.0), Vector3(0.52, 0.80, 0.48))
	var lip := _attach_interactive_prop(lp, "table", "Puesto de vigía de Blepp", "[T] Otear la bajada a la playa", Vector3.ZERO, "s", "Desde este pretil Blepp vigila cada ola y cada sombra que sube desde la playa y el embarcadero.")
	lip.interact_radius = 2.35

static func _build_tinker_workbench(parent: Node3D, pos: Vector3, mat_wood: Material, mat_dark: Material, mat_brass: Material, mat_iron: Material, mat_glass: Material) -> void:
	var tb := Node3D.new()
	tb.name = "MylaTinkerWorkbench"
	tb.position = pos
	parent.add_child(tb)
	_box(tb, Vector3(0.0, 0.42, 0.0), Vector3(2.1, 0.84, 0.82), mat_dark)
	_box(tb, Vector3(0.0, 0.86, 0.0), Vector3(2.2, 0.08, 0.90), mat_wood)
	# Engranaje de bronce animado y alambique
	var gear_piv := Node3D.new()
	gear_piv.name = "BrassGearPivot"
	gear_piv.position = Vector3(-0.55, 0.94, 0.0)
	gear_piv.add_to_group("dynamic_prop")
	tb.add_child(gear_piv)
	_cyl(gear_piv, Vector3.ZERO, 0.22, 0.06, mat_brass)
	_box(gear_piv, Vector3(0.0, 0.01, 0.0), Vector3(0.48, 0.04, 0.06), mat_brass)
	_box(gear_piv, Vector3(0.0, 0.01, 0.0), Vector3(0.06, 0.04, 0.48), mat_brass)
	var tray := routine_pivot(tb, "RetreatPartsTray", Vector3(-0.18, 0.94, 0.12))
	_cyl(tray, Vector3.ZERO, 0.15, 0.06, mat_iron)
	_box(tray, Vector3(0.031, 0.036, 0), Vector3(0.10, 0.035, 0.035), mat_brass)
	_box(tray, Vector3(-0.047, 0.033, 0.043), Vector3(0.08, 0.028, 0.04), mat_iron)
	var alembic := routine_pivot(tb, "RetreatAlembic", Vector3(0.48, 1.08, -0.05))
	_cyl(alembic, Vector3.ZERO, 0.16, 0.38, mat_glass)
	_cyl(alembic, Vector3(0, 0.26, 0), 0.06, 0.22, mat_brass)
	routine_target(_box(tb, Vector3(0.79, 0.93, 0.17), Vector3(0.32, 0.028, 0.052), mat_iron), "RetreatColdTool")
	add_box_collider(tb, Vector3(0.0, 0.50, 0.0), Vector3(2.22, 1.00, 0.92))
	var wip := _attach_interactive_prop(tb, "workbench", "Banco de artesanía de Myla", "[T] Probar engranajes y alambique")
	wip.interact_radius = 2.65

static func _build_bound_chest(parent: Node3D, pos: Vector3, yaw: float, mat_wood: Material, mat_iron: Material, mat_brass: Material) -> void:
	var c := Node3D.new()
	c.name = "BoundChest_%d_%d" % [int(pos.x), int(pos.z)]
	c.position = pos
	c.rotation.y = yaw
	parent.add_child(c)
	# Cuerpo inferior del baúl
	_box(c, Vector3(0.0, 0.22, 0.0), Vector3(0.92, 0.44, 0.54), mat_wood)
	_box(c, Vector3(-0.32, 0.22, 0.0), Vector3(0.08, 0.45, 0.56), mat_iron)
	_box(c, Vector3(0.32, 0.22, 0.0), Vector3(0.08, 0.45, 0.56), mat_iron)
	if c.name == "BoundChest_132_84":
		var latch := routine_pivot(c, "RetreatChestLatch", Vector3(0.0, 0.34, 0.28))
		_box(latch, Vector3.ZERO, Vector3(0.14, 0.16, 0.04), mat_brass)
	else:
		_box(c, Vector3(0.0, 0.34, 0.28), Vector3(0.14, 0.16, 0.04), mat_brass)
	# Tapa abatible con bisagras traseras para animación de apertura/cierre
	var lid_piv := Node3D.new()
	lid_piv.name = "ChestLidPivot"
	lid_piv.position = Vector3(0.0, 0.44, -0.27)
	lid_piv.add_to_group("dynamic_prop")
	c.add_child(lid_piv)
	_box(lid_piv, Vector3(0.0, 0.07, 0.27), Vector3(0.94, 0.14, 0.56), mat_wood)
	_box(lid_piv, Vector3(-0.32, 0.08, 0.27), Vector3(0.085, 0.15, 0.58), mat_iron)
	_box(lid_piv, Vector3(0.32, 0.08, 0.27), Vector3(0.085, 0.15, 0.58), mat_iron)
	add_box_collider(c, Vector3(0.0, 0.35, 0.0), Vector3(0.96, 0.70, 0.58))
	_attach_interactive_prop(c, "chest", "Baúl de peregrino", "[T] Abrir baúl")

static func _build_woven_rug(parent: Node3D, pos: Vector3, size: Vector2, mat_main: Material, mat_border: Material) -> void:
	var r := Node3D.new()
	r.position = pos
	parent.add_child(r)
	_box(r, Vector3.ZERO, Vector3(size.x, 0.025, size.y), mat_border)
	_box(r, Vector3(0.0, 0.008, 0.0), Vector3(size.x * 0.82, 0.025, size.y * 0.82), mat_main)

static func _build_braided_jute_mat(parent: Node3D, pos: Vector3, size: Vector2, mat_jute: Material, mat_border: Material) -> void:
	var r := Node3D.new()
	r.position = pos
	parent.add_child(r)
	_box(r, Vector3.ZERO, Vector3(size.x, 0.022, size.y), mat_border)
	_box(r, Vector3(0.0, 0.007, 0.0), Vector3(size.x * 0.88, 0.022, size.y * 0.88), mat_jute)
	# Trenzado transversal en relieve para lectura artesanal de estera monástica (ref. Imagen 4)
	var ribs := 7
	for ri in range(ribs):
		var rz := lerpf(-size.y * 0.38, size.y * 0.38, float(ri) / float(ribs - 1))
		_box(r, Vector3(0.0, 0.016, rz), Vector3(size.x * 0.82, 0.012, 0.11), mat_border if ri % 2 == 0 else mat_jute)

static func _build_cave_rock_niche(parent: Node3D, pos: Vector3, yaw: float, mat_rock: Material, mat_wood: Material, mat_book: Material, mat_accent: Material, mat_flame: Material) -> void:
	# 2.2 Hornacina excavada en la pared lateral de roca viva con repisa de piedra, tomos y vela encendida (ref. Imagen 4)
	var n := Node3D.new()
	n.name = "CaveRockNiche"
	n.position = pos
	n.rotation.y = yaw
	parent.add_child(n)
	# Repisa inferior y ceja superior de roca tallada
	_box(n, Vector3(0.0, 0.0, 0.14), Vector3(1.45, 0.16, 0.52), mat_rock)
	_box(n, Vector3(0.0, 0.72, 0.14), Vector3(1.38, 0.18, 0.48), mat_rock)
	for sx in [-0.64, 0.64]:
		_box(n, Vector3(sx, 0.36, 0.12), Vector3(0.18, 0.58, 0.44), mat_rock)
	# 4 Tomos encuadernados apoyados y palmatoria con vela viva
	for bi in range(4):
		var bx := -0.38 + float(bi) * 0.13
		var bh := 0.28 + float(bi % 2) * 0.05
		var bk := _box(n, Vector3(bx, 0.08 + bh * 0.5, 0.16), Vector3(0.10, bh, 0.24), mat_book if bi % 2 == 0 else mat_wood)
		bk.rotation.z = -0.06 if bi == 3 else 0.0
	_cyl(n, Vector3(0.34, 0.10, 0.18), 0.10, 0.04, mat_accent)
	_cyl(n, Vector3(0.34, 0.20, 0.18), 0.042, 0.18, mat_book)
	var fl := _cyl(n, Vector3(0.34, 0.33, 0.18), 0.028, 0.11, mat_flame)
	fl.visible = true

static func _build_monastic_wall_tapestry(parent: Node3D, pos: Vector3, yaw: float, mat_cloth: Material, mat_emblem: Material, mat_wood: Material, mat_gold: Material) -> void:
	# Tapiz monástico con emblema dracónico colgado de travesaño de madera sobre la roca (ref. Imagen 4)
	var t := Node3D.new()
	t.name = "MonasticWallTapestry"
	t.position = pos
	t.rotation.y = yaw
	parent.add_child(t)
	var rod := _cyl(t, Vector3(0.0, 0.62, 0.06), 0.038, 1.38, mat_wood)
	rod.rotation.z = PI * 0.5
	_box(t, Vector3(0.0, 0.0, 0.06), Vector3(1.12, 1.18, 0.03), mat_cloth)
	_box(t, Vector3(0.0, -0.52, 0.065), Vector3(1.12, 0.09, 0.032), mat_emblem)
	_box(t, Vector3(0.0, 0.48, 0.065), Vector3(1.12, 0.07, 0.032), mat_emblem)
	# Emblema dracónico en espiral en el centro del paño
	_cyl(t, Vector3(0.0, 0.02, 0.075), 0.28, 0.02, mat_emblem)
	_cyl(t, Vector3(0.04, 0.02, 0.082), 0.16, 0.02, mat_cloth)
	_box(t, Vector3(0.0, 0.16, 0.085), Vector3(0.24, 0.08, 0.02), mat_gold)

static func _build_brazier_stand(parent: Node3D, pos: Vector3, mat_iron: Material, mat_brass: Material, mat_flame: Material) -> void:
	var b := Node3D.new()
	b.name = "CellBrazier_%d_%d" % [int(pos.x), int(pos.z)]
	b.position = pos
	parent.add_child(b)
	_cyl(b, Vector3(0.0, 0.35, 0.0), 0.28, 0.70, mat_iron)
	_cyl(b, Vector3(0.0, 0.72, 0.0), 0.42, 0.16, mat_brass)
	var bf := _cyl(b, Vector3(0.0, 0.86, 0.0), 0.24, 0.22, mat_flame)
	bf.name = "BrazierFlame"
	bf.add_to_group("night_flame")
	var bl := OmniLight3D.new()
	bl.name = "CellBrazierLight"
	bl.position = Vector3(0.0, 1.15, 0.0)
	bl.light_color = Color(1.0, 0.62, 0.24)
	bl.light_energy = 1.35
	bl.omni_range = 7.5
	b.add_child(bl)
	var furn_root := parent.get_parent()
	var builder := furn_root.get_parent() if furn_root else null
	if builder and builder.has_method("register_flame_fx"):
		builder.register_flame_fx(bf, bl, false)
	add_cyl_collider(b, Vector3(0.0, 0.50, 0.0), 0.44, 1.00)
	var bip := _attach_interactive_prop(b, "brazier", "el brasero de la celda", "[T] Avivar brasero")
	bip.interact_radius = 2.45

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
	var fip := _attach_interactive_prop(h, "fire", "la hoguera de la plaza", "[T] Avivar fuego")
	fip.interact_radius = 3.15
	fip.linked_fire_node_name = "A1_Campfire"

	# 2 Bancos monásticos alineados Este-Oeste junto a la hoguera con mantas sobrias tejidas (9.4 & 9.6: sin bloques saturados rojo/azul)
	var bench_angles := [0.0, PI]
	for idx in range(bench_angles.size()):
		var ang: float = bench_angles[idx]
		var dist := 2.45
		var bp := Vector3(cos(ang) * dist, 0.0, sin(ang) * dist)
		var bench := Node3D.new()
		bench.name = "PlazaBenchEast" if idx == 0 else "PlazaBenchWest"
		bench.position = bp
		# Orientar el frente del asiento (+Z local) hacia el centro de la hoguera
		bench.rotation.y = -ang - PI * 0.5
		h.add_child(bench)
		_box(bench, Vector3(0.0, 0.46, 0.0), Vector3(1.95, 0.09, 0.58), mat_oak)
		_box(bench, Vector3(0.0, 0.84, -0.24), Vector3(1.90, 0.42, 0.08), mat_dark_oak)
		# Manta doblada de lino y lana ocre sobria sobre un extremo del banco (con caída frontal)
		var runner_x := -0.42 if idx == 0 else 0.42
		_box(bench, Vector3(runner_x, 0.515, 0.02), Vector3(0.68, 0.035, 0.54), mat_cush_a)
		_box(bench, Vector3(runner_x, 0.528, 0.02), Vector3(0.48, 0.025, 0.55), mat_cush_b)
		_box(bench, Vector3(runner_x, 0.39, 0.28), Vector3(0.66, 0.22, 0.03), mat_cush_a)
		for lx in [-0.74, 0.74]:
			_box(bench, Vector3(lx, 0.23, 0.0), Vector3(0.20, 0.46, 0.50), mat_stone)
		add_box_collider(bench, Vector3(0.0, 0.50, 0.0), Vector3(1.98, 1.00, 0.62))
		var h_slots: Array[Vector3] = [Vector3(-0.44, 0.515, 0.03), Vector3(0.44, 0.515, 0.03)]
		_attach_seat_prop(bench, "bench", "Banco de la plaza", "[T] Sentarse junto al fuego", h_slots, Vector3(0.0, 0.0, 1.0), 0.29, "w" if idx == 0 else "e", false, 2.35)

static func _build_pilgrim_pack_and_basket(parent: Node3D, pos: Vector3, yaw: float, mat_leather: Material, mat_wicker: Material, mat_buckle: Material, mat_pot: Material) -> void:
	# 9.2 Petate/mochila de cuero con correas y cesta de mimbre junto a la jamba interior de la celda (ref. Imagen 4)
	var p := Node3D.new()
	p.name = "PilgrimPackCluster"
	p.add_to_group("step9_prop")
	p.position = pos
	p.rotation.y = yaw
	parent.add_child(p)
	var pack := _box(p, Vector3(0.0, 0.30, 0.0), Vector3(0.42, 0.54, 0.26), mat_leather)
	pack.rotation.x = -0.14
	_box(p, Vector3(0.0, 0.46, 0.02), Vector3(0.44, 0.16, 0.28), mat_leather)
	for sx in [-0.12, 0.12]:
		_box(p, Vector3(sx, 0.34, 0.14), Vector3(0.045, 0.38, 0.03), mat_wicker)
		_box(p, Vector3(sx, 0.28, 0.155), Vector3(0.06, 0.06, 0.02), mat_buckle)
	# Cesta de mimbre tejida y cántaro pequeño de barro al lado
	_cyl(p, Vector3(-0.46, 0.16, 0.08), 0.20, 0.32, mat_wicker)
	_cyl(p, Vector3(-0.46, 0.31, 0.08), 0.215, 0.04, mat_leather)
	_cyl(p, Vector3(0.36, 0.15, 0.12), 0.11, 0.28, mat_pot)

static func _build_hanging_herb_bundles(parent: Node3D, pos: Vector3, mat_wood: Material, mat_herb: Material, mat_twine: Material) -> void:
	# 9.3 Ramo de hierbas medicinales secándose en travesaño alto en la celda de Tarak
	var h := Node3D.new()
	h.name = "DryingHerbBundles"
	h.add_to_group("step9_prop")
	h.position = pos
	parent.add_child(h)
	var bar := _cyl(h, Vector3.ZERO, 0.032, 1.42, mat_wood)
	bar.rotation.z = PI * 0.5
	for i in range(5):
		var bx := -0.52 + float(i) * 0.26
		_cyl(h, Vector3(bx, -0.08, 0.0), 0.014, 0.16, mat_twine)
		var bnd := _cyl(h, Vector3(bx, -0.24, 0.0), 0.075, 0.26, mat_herb)
		bnd.rotation.z = sin(float(i) * 1.7) * 0.12

static func _build_monastic_storage_crates_and_baskets(parent: Node3D, pos: Vector3, mat_dark: Material, mat_oak: Material, mat_wicker: Material, mat_pot: Material) -> void:
	# 9.2 & 9.3 Almacenamiento ligero ordenado: cajón de madera, cesta de mimbre y ánfora cerámica
	var s := Node3D.new()
	s.name = "MonasticLightStorage"
	s.position = pos
	parent.add_child(s)
	_box(s, Vector3(0.0, 0.24, 0.0), Vector3(0.68, 0.48, 0.52), mat_oak)
	_cyl(s, Vector3(0.0, 0.62, -0.04), 0.21, 0.28, mat_wicker)
	_cyl(s, Vector3(0.48, 0.22, 0.08), 0.16, 0.44, mat_pot)
	_cyl(s, Vector3(-0.46, 0.17, 0.10), 0.19, 0.34, mat_wicker)
	add_box_collider(s, Vector3(0.0, 0.38, 0.0), Vector3(1.15, 0.76, 0.58))

static func _build_cell_contemplative_shrine(parent: Node3D, pos: Vector3, mat_stone: Material, mat_rock: Material, mat_bronze: Material, mat_gold: Material, mat_flame: Material, mat_jute: Material, mat_cush: Material) -> void:
	# 9.3 Pequeño altar contemplativo dracónico al fondo de la Celda 6 con incensario, velas y cojín de meditación interactivo
	var sh := Node3D.new()
	sh.name = "CellContemplativeShrine"
	sh.position = pos
	parent.add_child(sh)
	_box(sh, Vector3(0.0, 0.32, 0.0), Vector3(1.48, 0.64, 0.62), mat_rock)
	_box(sh, Vector3(0.0, 0.68, 0.02), Vector3(1.58, 0.10, 0.68), mat_stone)
	# Pequeña efigie de bronce de Astalagan e incensario central
	_cyl(sh, Vector3(0.0, 0.78, -0.06), 0.18, 0.10, mat_bronze)
	_box(sh, Vector3(0.0, 0.96, -0.06), Vector3(0.22, 0.30, 0.18), mat_gold)
	routine_target(_cyl(sh, Vector3(0.0, 0.76, 0.18), 0.09, 0.07, mat_bronze), "RetreatCellVessel")
	for vx in [-0.48, 0.48]:
		_cyl(sh, Vector3(vx, 0.75, 0.04), 0.06, 0.04, mat_bronze)
		_cyl(sh, Vector3(vx, 0.82, 0.04), 0.032, 0.12, mat_gold)
		_cyl(sh, Vector3(vx, 0.91, 0.04), 0.022, 0.08, mat_flame)
	add_box_collider(sh, Vector3(0.0, 0.45, 0.0), Vector3(1.58, 0.90, 0.68))
	_attach_interactive_prop(sh, "shrine", "Altar contemplativo", "[T] Orar ante el altar dracónico", Vector3.ZERO, "n", "El incienso del pequeño altar de la celda desprende un aroma sereno a cedro y mirra.")
	# Cojín de meditación frente al altar
	var med := Node3D.new()
	med.name = "ShrineMeditationMat"
	med.position = Vector3(0.0, 0.08, 0.95)
	sh.add_child(med)
	_box(med, Vector3.ZERO, Vector3(0.86, 0.06, 0.68), mat_jute)
	_box(med, Vector3(0.0, 0.035, 0.0), Vector3(0.72, 0.05, 0.54), mat_cush)
	var med_slots: Array[Vector3] = [Vector3(0.0, 0.14, 0.0)]
	_attach_seat_prop(med, "chair", "Cojín de contemplación", "[T] Sentarse a meditar", med_slots, Vector3(0.0, 0.0, -1.0), 0.25, "n", false, 1.95)

static func _build_plaza_monastic_life_props(parent: Node3D, y_a1: float, mat_oak: Material, mat_dark: Material, mat_stone: Material, mat_pot: Material, mat_linen: Material, mat_wicker: Material, mat_stripe: Material, mat_ochre: Material) -> void:
	# 9.1 & 9.4 Elementos sobrios de vida cotidiana en la plaza: mesa auxiliar de agua/cuencos, leñera junto al hogar y manta doblada en el pretil (ref. Imagen 3)
	var tbl := Node3D.new()
	tbl.name = "CloisterRefreshmentTable"
	tbl.position = Vector3(106.4, y_a1, 89.48)
	parent.add_child(tbl)
	_box(tbl, Vector3(0.0, 0.64, 0.0), Vector3(1.24, 0.08, 0.56), mat_oak)
	for lx in [-0.48, 0.48]:
		_box(tbl, Vector3(lx, 0.32, 0.0), Vector3(0.14, 0.64, 0.46), mat_stone)
	_box(tbl, Vector3(0.0, 0.69, 0.0), Vector3(0.95, 0.02, 0.42), mat_linen)
	routine_target(_cyl(tbl, Vector3(-0.28, 0.79, -0.04), 0.10, 0.22, mat_pot), "RetreatRefreshmentJug")
	routine_target(_cyl(tbl, Vector3(0.04, 0.73, 0.06), 0.08, 0.07, mat_dark), "RetreatRefreshmentCup")
	_cyl(tbl, Vector3(0.24, 0.73, -0.05), 0.08, 0.07, mat_dark)
	routine_target(_cyl(tbl, Vector3(0.52, 0.18, 0.06), 0.21, 0.34, mat_wicker), "RetreatRefreshmentBasket")
	add_box_collider(tbl, Vector3(0.0, 0.42, 0.0), Vector3(1.28, 0.84, 0.60))
	_attach_interactive_prop(tbl, "refreshments", "Mesa de refrigerios", "[T] Servirse agua y pan del claustro")

	# Manta de lana listada doblada sobre el pretil sur frente al pozo (ref. Imagen 3)
	var throw_node := Node3D.new()
	throw_node.name = "ParapetFoldedBlanket"
	throw_node.position = Vector3(88.8, y_a1 + 0.56, 96.76)
	parent.add_child(throw_node)
	_box(throw_node, Vector3(0.0, 0.03, 0.0), Vector3(0.84, 0.06, 0.48), mat_linen)
	_box(throw_node, Vector3(0.0, 0.05, 0.0), Vector3(0.82, 0.035, 0.14), mat_stripe)
	_box(throw_node, Vector3(0.0, -0.10, -0.23), Vector3(0.82, 0.24, 0.04), mat_linen)

	# Pequeña pila ordenada de leña seca y cesta de vituallas junto al banco este de la hoguera
	var wood_pile := Node3D.new()
	wood_pile.name = "HearthFirewoodStack"
	wood_pile.position = Vector3(111.4, y_a1, 95.35)
	parent.add_child(wood_pile)
	for li in range(3):
		var lg := _cyl(wood_pile, Vector3(-0.18 + float(li) * 0.18, 0.10, 0.0), 0.085, 0.68, mat_dark)
		lg.rotation.x = PI * 0.5
	for li in range(2):
		var lg2 := _cyl(wood_pile, Vector3(-0.09 + float(li) * 0.18, 0.23, 0.0), 0.08, 0.64, mat_oak)
		lg2.rotation.x = PI * 0.5
		if li == 0:
			routine_target(lg2, "RetreatFirewoodBillet")
	_cyl(wood_pile, Vector3(0.52, 0.17, -0.08), 0.22, 0.32, mat_wicker)
	_box(wood_pile, Vector3(0.52, 0.32, -0.08), Vector3(0.32, 0.05, 0.28), mat_ochre)
	_attach_interactive_prop(wood_pile, "firewood", "Pila de leña seca", "[T] Recoger leña seca")

static func _build_flame_cluster(parent: Node3D, pos: Vector3, scale_mul: float, mat_flame: Material) -> void:
	for offset_spec in [
		[Vector3(0.0, 0.28, 0.0), 0.24, 0.56],
		[Vector3(-0.14, 0.20, 0.08), 0.14, 0.38],
		[Vector3(0.15, 0.22, -0.09), 0.15, 0.42],
		[Vector3(0.04, 0.18, 0.14), 0.12, 0.32],
	]:
		var f_inst := MeshInstance3D.new()
		f_inst.name = "ClusterFlameCone"
		var cm := CylinderMesh.new()
		cm.top_radius = 0.02 * scale_mul
		cm.bottom_radius = float(offset_spec[1]) * scale_mul
		cm.height = float(offset_spec[2]) * scale_mul
		cm.radial_segments = 7
		f_inst.mesh = cm
		f_inst.material_override = mat_flame
		f_inst.position = pos + (offset_spec[0] as Vector3) * scale_mul
		f_inst.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		f_inst.add_to_group("night_flame")
		parent.add_child(f_inst)

static func _build_astalagan_shrine_altar(parent: Node3D, pos: Vector3, mat_stone: Material, mat_rock: Material, mat_brass: Material, mat_gold: Material, mat_flame: Material) -> void:
	# 4.2–4.5 Pedestal circular escalonado de mampostería de 3 niveles bajo la estatua del dragón Astalagan (ref. Imágenes 1–4)
	var a := Node3D.new()
	a.name = "AstalaganCircularPedestal"
	a.position = pos
	parent.add_child(a)

	# Anillo pavimentado de losas radiales alrededor de la base (circulación libre 360°)
	for i in range(16):
		var ang := (float(i) / 16.0) * TAU
		var p_slab := _box(a, Vector3(cos(ang) * 1.92, 0.015, sin(ang) * 1.92), Vector3(0.76, 0.03, 0.58), mat_stone if i % 2 == 0 else mat_rock)
		p_slab.rotation.y = -ang + PI * 0.5

	# Nivel 1 (Base circular escalonada de 16 sillares rústicos, radio 1.56m)
	for i in range(16):
		var ang := (float(i) / 16.0) * TAU
		var b1 := _box(a, Vector3(cos(ang) * 1.38, 0.13, sin(ang) * 1.38), Vector3(0.60, 0.26, 0.52), mat_stone if i % 2 == 0 else mat_rock)
		b1.rotation.y = -ang + PI * 0.5
		b1.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	_cyl(a, Vector3(0.0, 0.13, 0.0), 1.36, 0.26, mat_rock)

	# Nivel 2 (Tambor intermedio de 12 sillares tallados, radio 1.16m)
	for i in range(12):
		var ang := (float(i) / 12.0) * TAU + 0.13
		var b2 := _box(a, Vector3(cos(ang) * 1.04, 0.36, sin(ang) * 1.04), Vector3(0.58, 0.24, 0.46), mat_stone)
		b2.rotation.y = -ang + PI * 0.5
		b2.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	_cyl(a, Vector3(0.0, 0.36, 0.0), 1.02, 0.24, mat_stone)

	# Nivel 3 (Cornisa superior y plinto donde posa las garras Astalagan, cota +0.54m)
	_cyl(a, Vector3(0.0, 0.53, 0.0), 0.96, 0.12, mat_stone)
	_cyl(a, Vector3(0.0, 0.48, 0.0), 1.06, 0.05, mat_brass)

	# Corona de 8 velas votivas alrededor del primer escalón del pedestal (visibles de día como cera y encendidas de noche, ref. Imagen 3)
	for vi in range(8):
		var vang := (float(vi) / 8.0) * TAU + 0.22
		var vx := cos(vang) * 1.26
		var vz := sin(vang) * 1.26
		_cyl(a, Vector3(vx, 0.27, vz), 0.065, 0.03, mat_brass)
		_cyl(a, Vector3(vx, 0.33, vz), 0.036, 0.11, mat_gold)
		_cyl(a, Vector3(vx, 0.41, vz), 0.024, 0.09, mat_flame)

	add_cyl_collider(a, Vector3(0.0, 0.95, 0.0), 1.38, 1.90)
	tag_camera_occluder(a)
	var sip := _attach_interactive_prop(a, "shrine", "Estatua de Astalagan", "[T] Honrar y contemplar a Astalagan", Vector3.ZERO, "n", "«En memoria de Astalagan, el dragón de bronce que dio reposo a esta isla frente a la furia de Sharruth.»")
	sip.interact_radius = 3.15

static func _build_monastic_well_fountain(parent: Node3D, pos: Vector3, mat_stone: Material, mat_wood: Material, mat_iron: Material, mat_water: Material) -> void:
	# 5.1–5.9 Pozo monástico de mampostería rústica: boca superior seca/profunda (sin disco cian superficial), polea, cuerda enrollada, cubo animado, farol y accesorios
	var w := Node3D.new()
	w.name = "MonasticFountainWell"
	w.position = pos
	parent.add_child(w)

	var furn_root := parent.get_parent()
	var builder := furn_root.get_parent() if furn_root else null
	var mat_rock: Material = builder.get("mat_rock_carved") if (builder and builder.get("mat_rock_carved")) else mat_stone
	var mat_dark_pit: Material = builder.call("_make_mat", Color("#0b0d10"), 0.96, 0.0) if (builder and builder.has_method("_make_mat")) else mat_iron
	var mat_rope: Material = builder.call("_make_mat", Color("#b4935e"), 0.88, 0.0) if (builder and builder.has_method("_make_mat")) else mat_wood
	var mat_sack: Material = builder.call("_make_mat", Color("#9a7f56"), 0.92, 0.0) if (builder and builder.has_method("_make_mat")) else mat_wood
	var mat_flame: Material = builder.get("mat_flame") if (builder and builder.get("mat_flame")) else mat_stone

	# 5.1 Interior oscuro y profundo del pozo (seco en la parte alta, con sombra de abismo para entender que el agua está al fondo)
	_cyl(w, Vector3(0.0, 0.36, 0.0), 0.94, 0.70, mat_dark_pit)
	_cyl(w, Vector3(0.0, 0.04, 0.0), 0.88, 0.03, mat_water)

	# 5.2 Brocal de mampostería rústica en 3 hiladas trabadas + coronación desgastada (ref. Imágenes 1–3)
	var courses := 3
	var blocks_per_ring := 14
	for c_i in range(courses):
		var cy := 0.14 + float(c_i) * 0.27
		var stagger := float(c_i % 2) * (TAU / float(blocks_per_ring) * 0.5)
		for b_i in range(blocks_per_ring):
			var ang := (float(b_i) / float(blocks_per_ring)) * TAU + stagger
			var r_off := 1.07 + sin(float(b_i * 3 + c_i)) * 0.025
			var blk := _box(w, Vector3(cos(ang) * r_off, cy, sin(ang) * r_off), Vector3(0.52, 0.25, 0.38), mat_stone if (b_i + c_i) % 2 == 0 else mat_rock)
			blk.rotation.y = -ang + PI * 0.5
			blk.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	for b_i in range(blocks_per_ring):
		var ang := (float(b_i) / float(blocks_per_ring)) * TAU
		var cap := _box(w, Vector3(cos(ang) * 1.08, 0.88, sin(ang) * 1.08), Vector3(0.55, 0.11, 0.44), mat_stone)
		cap.rotation.y = -ang + PI * 0.5
		cap.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON

	# Postes verticales de roble con herrajes, travesaño superior, rollo grueso de cuerda y polea de hierro forjado
	for dx in [-1.06, 1.06]:
		var post := _box(w, Vector3(dx, 1.44, 0.0), Vector3(0.22, 2.02, 0.22), mat_wood)
		post.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		_box(w, Vector3(dx, 0.96, 0.0), Vector3(0.26, 0.16, 0.26), mat_iron)
	var beam := _box(w, Vector3(0.0, 2.38, 0.0), Vector3(2.52, 0.22, 0.28), mat_wood)
	beam.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON

	# 5.2–5.3 Eje / rodillo con devanado de cuerda de cáñamo y polea central (WellRollerNode)
	var roller_node := Node3D.new()
	roller_node.name = "WellRollerNode"
	roller_node.position = Vector3(0.0, 1.98, 0.0)
	w.add_child(roller_node)
	var axle := _cyl(roller_node, Vector3.ZERO, 0.11, 1.96, mat_wood)
	axle.rotation.z = PI * 0.5
	for ri in range(7):
		var rx := -0.18 + float(ri) * 0.06
		var coil := _cyl(roller_node, Vector3(rx, 0.0, 0.0), 0.175, 0.052, mat_rope)
		coil.rotation.z = PI * 0.5
	var pulley := _cyl(w, Vector3(0.0, 1.76, 0.0), 0.14, 0.06, mat_iron)
	pulley.rotation.z = PI * 0.5

	# Cuerda vertical dinámica (WellRopeMesh) y Cubo cinchado animado (WellBucketRig)
	var rope_mesh := _cyl(w, Vector3(0.0, 1.56, 0.0), 0.028, 0.78, mat_rope)
	rope_mesh.name = "WellRopeMesh"

	var bucket_rig := Node3D.new()
	bucket_rig.name = "WellBucketRig"
	bucket_rig.position = Vector3(0.0, 1.18, 0.0)
	w.add_child(bucket_rig)
	_cyl(bucket_rig, Vector3.ZERO, 0.19, 0.34, mat_wood)
	_cyl(bucket_rig, Vector3(0.0, 0.11, 0.0), 0.202, 0.045, mat_iron)
	_cyl(bucket_rig, Vector3(0.0, -0.11, 0.0), 0.202, 0.045, mat_iron)
	_cyl(bucket_rig, Vector3(0.0, 0.02, 0.0), 0.155, 0.26, mat_dark_pit)
	var b_water := _cyl(bucket_rig, Vector3(0.0, 0.12, 0.0), 0.152, 0.03, mat_water)
	b_water.name = "BucketWaterFill"
	b_water.visible = false
	for h_side in [-0.17, 0.17]:
		_box(bucket_rig, Vector3(h_side, 0.22, 0.0), Vector3(0.03, 0.14, 0.03), mat_iron)
	_box(bucket_rig, Vector3(0.0, 0.28, 0.0), Vector3(0.36, 0.03, 0.03), mat_rope)

	# Farol de hierro colgado del travesaño del pozo + cabo de cuerda apoyado en el brocal + cubo auxiliar y saco al pie (ref. Imagen 3)
	_cyl(w, Vector3(0.58, 1.92, 0.0), 0.018, 0.36, mat_iron)
	_cyl(w, Vector3(0.58, 1.72, 0.0), 0.12, 0.05, mat_iron)
	var wl_flm := _box(w, Vector3(0.58, 1.60, 0.0), Vector3(0.13, 0.18, 0.13), mat_flame)
	wl_flm.add_to_group("night_flame")
	_cyl(w, Vector3(0.58, 1.49, 0.0), 0.11, 0.04, mat_iron)
	var wl_light := OmniLight3D.new()
	wl_light.name = "WellLanternLight"
	wl_light.position = Vector3(0.58, 1.58, 0.18)
	wl_light.light_color = Color(1.0, 0.72, 0.34)
	wl_light.light_energy = 1.65
	wl_light.omni_range = 8.5
	w.add_child(wl_light)
	if builder and builder.has_method("register_flame_fx"):
		builder.register_flame_fx(wl_flm, wl_light, false)

	# Cabo de cuerda colgando por el exterior del poste derecho y cubo/saco de apoyo junto al brocal
	var tail_rope := _cyl(w, Vector3(1.12, 1.05, 0.28), 0.035, 1.15, mat_rope)
	tail_rope.rotation.x = 0.22
	_cyl(w, Vector3(-1.32, 0.17, 0.38), 0.18, 0.34, mat_wood)
	_cyl(w, Vector3(-1.32, 0.26, 0.38), 0.19, 0.04, mat_iron)
	var sack := _box(w, Vector3(-1.12, 0.16, 0.74), Vector3(0.42, 0.32, 0.34), mat_sack)
	sack.rotation.y = 0.38

	add_cyl_collider(w, Vector3(0.0, 1.10, 0.0), 1.12, 2.20)
	add_box_collider(w, Vector3(0.0, 2.38, 0.0), Vector3(2.52, 0.30, 0.36))
	tag_camera_occluder(w)
	_attach_interactive_prop(w, "well", "Pozo del Claustro", "[T] Sacar agua del pozo · Llenar cantimplora")

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
		var p_bench := Node3D.new()
		p_bench.name = "PergolaBenchAnchor_%s" % ("N" if dz < 0.0 else "S")
		p_bench.position = Vector3(0.0, 0.0, dz)
		p.add_child(p_bench)
		var p_slots: Array[Vector3] = [Vector3(-0.52, 0.48, 0.0), Vector3(0.52, 0.48, 0.0)]
		_attach_seat_prop(p_bench, "bench", "Banco de la pérgola", "[T] Sentarse a la sombra", p_slots, Vector3(0.0, 0.0, 1.0 if dz < 0.0 else -1.0), 0.22, "s" if dz < 0.0 else "n", false, 2.35)
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
	var nb_anchor := Node3D.new()
	nb_anchor.name = "MonasteryNoticeboardAnchor"
	nb_anchor.position = Vector3(-1.2, 0.0, -0.3)
	s.add_child(nb_anchor)
	_attach_interactive_prop(nb_anchor, "noticeboard", "Tablón del claustro", "[T] Leer tablón de avisos")

static func _build_a3_banquet_and_hearth(parent: Node3D, y: float, mat_oak: Material, mat_dark: Material, mat_stone: Material, mat_iron: Material, mat_brass: Material, mat_pot: Material, mat_linen: Material, mat_flame: Material) -> void:
	# 2 Grandes mesas de refectorio en A3 ampliada (x=123.6, z=57.8 y z=61.6) + bancos corridos interactivos y vajilla
	for tz in [57.8, 61.6]:
		var b := Node3D.new()
		b.position = Vector3(123.6, y, tz)
		parent.add_child(b)
		_box(b, Vector3(0.0, 0.78, 0.0), Vector3(8.2, 0.11, 1.32), mat_oak)
		_box(b, Vector3(0.0, 0.84, 0.0), Vector3(7.6, 0.02, 0.46), mat_linen)
		for dx in [-3.1, 0.0, 3.1]:
			_box(b, Vector3(dx, 0.39, 0.0), Vector3(0.24, 0.78, 1.06), mat_dark)
			_cyl(b, Vector3(dx, 0.90, 0.0), 0.14, 0.08, mat_brass)
			_cyl(b, Vector3(dx, 0.99, 0.0), 0.04, 0.12, mat_flame)
			_cyl(b, Vector3(dx + 0.72, 0.93, 0.24), 0.10, 0.22, mat_pot)
			for p_side in [-0.34, 0.34]:
				_cyl(b, Vector3(dx + 0.35, 0.86, p_side), 0.15, 0.025, mat_linen)
				_cyl(b, Vector3(dx - 0.55, 0.86, p_side), 0.14, 0.025, mat_linen)
				_cyl(b, Vector3(dx - 0.35, 0.91, p_side * 0.78), 0.06, 0.12, mat_brass)
		for dz in [-0.98, 0.98]:
			_box(b, Vector3(0.0, 0.45, dz), Vector3(7.4, 0.08, 0.42), mat_oak)
			for lx in [-3.0, 0.0, 3.0]:
				_box(b, Vector3(lx, 0.22, dz), Vector3(0.18, 0.44, 0.38), mat_dark)
			add_box_collider(b, Vector3(0.0, 0.34, dz), Vector3(7.45, 0.68, 0.46))
			var bench_anchor := Node3D.new()
			bench_anchor.position = Vector3(0.0, 0.0, dz)
			b.add_child(bench_anchor)
			var a3_slots: Array[Vector3] = [Vector3(-2.1, 0.49, 0.0), Vector3(0.0, 0.49, 0.0), Vector3(2.1, 0.49, 0.0)]
			_attach_seat_prop(bench_anchor, "bench", "Banco del comedor", "[T] Sentarse a la mesa", a3_slots, Vector3(0.0, 0.0, 1.0 if dz < 0.0 else -1.0), 0.23, "s" if dz < 0.0 else "n", false, 3.6)
		add_box_collider(b, Vector3(0.0, 0.48, 0.0), Vector3(8.25, 0.96, 1.36))
		_attach_interactive_prop(b, "table", "Mesa del comedor", "[T] Examinar mesa del refectorio", Vector3.ZERO, "n", "Cuencos de caldo caliente, pan recién horneado y jarras de sidra aguardan a los comensales.")

	# Fogón de piedra con brasas vivas, caldero, mortero y repisa de cocina en el ala norte ampliada
	var k := Node3D.new()
	k.name = "A3_KitchenStove"
	k.position = Vector3(117.6, y, 51.4)
	parent.add_child(k)
	_box(k, Vector3(0.0, 0.52, 0.0), Vector3(3.4, 1.04, 1.45), mat_stone)
	_box(k, Vector3(-0.55, 1.10, -0.35), Vector3(1.4, 0.55, 0.45), mat_stone)
	_cyl(k, Vector3(-0.55, 1.08, 0.08), 0.42, 0.06, mat_iron)
	_build_flame_cluster(k, Vector3(-0.55, 1.09, 0.08), 0.65, mat_flame)
	_cyl(k, Vector3(-0.55, 1.42, 0.08), 0.42, 0.40, mat_iron)
	_cyl(k, Vector3(-0.55, 1.62, 0.08), 0.44, 0.05, mat_brass)
	_cyl(k, Vector3(0.75, 1.24, 0.05), 0.22, 0.36, mat_pot)
	_cyl(k, Vector3(1.18, 1.16, 0.15), 0.14, 0.20, mat_oak)
	add_box_collider(k, Vector3(0.0, 0.72, 0.0), Vector3(3.45, 1.44, 1.50))
	var kip := _attach_interactive_prop(k, "stove", "el fogón del refectorio", "[T] Avivar fogón y remover caldero")
	kip.interact_radius = 2.95
	kip.linked_fire_node_name = "KitchenHearthLight"
	# Isla/mostrador de preparación, cajas de víveres y toneles de despensa
	_box(parent, Vector3(118.0, y + 0.44, 54.0), Vector3(3.6, 0.88, 0.84), mat_dark)
	_box(parent, Vector3(118.0, y + 0.90, 54.0), Vector3(3.8, 0.08, 0.94), mat_oak)
	_cyl(parent, Vector3(117.2, y + 0.98, 54.0), 0.24, 0.05, mat_oak)
	_cyl(parent, Vector3(118.9, y + 1.06, 53.9), 0.14, 0.26, mat_pot)
	_cyl(parent, Vector3(130.6, y + 0.48, 51.8), 0.38, 0.96, mat_dark)
	_cyl(parent, Vector3(131.6, y + 0.48, 52.0), 0.38, 0.96, mat_oak)
	add_box_collider(parent, Vector3(118.0, y + 0.50, 54.0), Vector3(3.82, 1.00, 0.96))
	add_cyl_collider(parent, Vector3(130.6, y + 0.50, 51.8), 0.40, 1.00)
	add_cyl_collider(parent, Vector3(131.6, y + 0.50, 52.0), 0.40, 1.00)

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
	_attach_interactive_prop(sh, "bookshelf", "Estantería del Scriptorium", "[T] Consultar estantería")

static func _build_a4_scriptorium_details(parent: Node3D, y: float, mat_dark: Material, mat_oak: Material, mat_paper: Material, mat_brass: Material, mat_gold: Material, _mat_flame: Material, mat_blue: Material, mat_red: Material, mat_green: Material) -> void:
	# Tapiz tejido con textura real de lana azul y ribete dorado (sin bloque plano celeste)
	var mat_woven_blue: Material = mat_blue
	var mat_woven_border: Material = mat_brass
	var main_parent := parent.get_parent()
	if main_parent and main_parent.get_parent() and main_parent.get_parent().get("mat_cloth_blue") != null:
		mat_woven_blue = main_parent.get_parent().get("mat_cloth_blue")
	_build_woven_rug(parent, Vector3(98.5, y + 0.016, 58.0), Vector2(6.4, 3.0), mat_woven_blue, mat_woven_border)
	var g := Node3D.new()
	g.position = Vector3(98.5, y, 57.6)
	parent.add_child(g)
	_cyl(g, Vector3(0.0, 0.48, 0.0), 0.26, 0.96, mat_dark)
	_cyl(g, Vector3(0.0, 1.22, 0.0), 0.46, 0.46, mat_brass)
	add_cyl_collider(g, Vector3(0.0, 0.72, 0.0), 0.48, 1.44)
	for dx in [-5.4, 4.2]:
		_build_monastic_desk_and_chair(parent, Vector3(98.5 + dx, y, 60.4), 0.0, mat_oak, mat_dark, mat_paper, mat_brass)

	# Mesa de cartografía en el ala este ampliada con códice, brújula y candelabro
	var map_tbl := Node3D.new()
	map_tbl.position = Vector3(109.2, y, 57.8)
	parent.add_child(map_tbl)
	_box(map_tbl, Vector3(0.0, 0.42, 0.0), Vector3(1.6, 0.84, 2.8), mat_dark)
	_box(map_tbl, Vector3(0.0, 0.86, 0.0), Vector3(1.75, 0.08, 2.95), mat_oak)
	_box(map_tbl, Vector3(0.0, 0.91, 0.0), Vector3(1.15, 0.02, 2.10), mat_paper)
	_cyl(map_tbl, Vector3(-0.3, 0.97, -0.7), 0.10, 0.12, mat_brass)
	_cyl(map_tbl, Vector3(-0.3, 1.07, -0.7), 0.035, 0.12, _mat_flame)
	_box(map_tbl, Vector3(0.45, 0.95, 0.8), Vector3(0.38, 0.10, 0.48), mat_red)
	add_box_collider(map_tbl, Vector3(0.0, 0.50, 0.0), Vector3(1.80, 1.00, 3.00))
	_attach_interactive_prop(map_tbl, "table", "Mesa de cartografía", "[T] Examinar mapa insular", Vector3.ZERO, "w", "Cartas náuticas detallan el Retiro, Pleamar y el Observatorio de la isla.")

	# Estanterías murales norte en A4 ensanchada (z=51.4) y 3 islas de lectura abiertas (x=89.6, 94.6, 103.6)
	var book_mats := [mat_red, mat_blue, mat_green, mat_gold]
	for sx in [87.4, 91.2, 95.0, 98.8, 102.6, 106.4, 110.2]:
		_build_bookcase_unit(parent, Vector3(sx, y, 51.4), 0.0, 3.1, mat_dark, mat_oak, mat_brass, mat_paper, book_mats, false)

	for ix in [89.6, 94.6, 103.8]:
		_build_bookcase_unit(parent, Vector3(ix, y, 56.6), PI * 0.5, 2.8, mat_dark, mat_oak, mat_brass, mat_paper, book_mats, true)

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
		Color("#4a5e39"), Color("#556b41"), Color("#62774b"), Color("#405231"), Color("#6d7d52")
	]
	var fern_tones: Array[Color] = [
		Color("#364a2d"), Color("#425636"), Color("#4d623f"), Color("#2f4127")
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

			# En A1, A5 y Upper, concentrar el césped en Z7 Gardens (x<=83.2 para no invadir el muro oeste de A4) y bordes verdes (nunca sobre el pavimento del templo A5 ni escaleras)
			var is_garden_zone := (wx >= 72.0 and wx <= 83.2 and wz >= 54.0 and wz <= 64.8)
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
	grass_mat.backlight = Color(0.11, 0.17, 0.07)

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
		var c_base := Color(0.46, 0.58, 0.42)
		var c_tip := Color(0.84, 0.86, 0.74)
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
	# Copa mediterránea pictórica de encina/olivo: 11 ramilletes poligonales facetados (smooth_group = -1)
	# con asimetría orgánica y gradiente solar cálido-oliva (elimina aspecto de globo/chupa-chups liso)
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	st.set_smooth_group(-1)
	var rng := RandomNumberGenerator.new()
	rng.seed = 202611239

	var tufts := [
		{"pos": Vector3(0.02, 0.24, -0.02), "rx": 0.44, "ry": 0.30, "rz": 0.42, "tint": 1.08},
		{"pos": Vector3(0.32, 0.08, 0.22), "rx": 0.36, "ry": 0.24, "rz": 0.34, "tint": 1.02},
		{"pos": Vector3(-0.34, 0.11, 0.18), "rx": 0.38, "ry": 0.25, "rz": 0.34, "tint": 1.04},
		{"pos": Vector3(0.24, 0.10, -0.32), "rx": 0.35, "ry": 0.25, "rz": 0.36, "tint": 1.00},
		{"pos": Vector3(-0.26, 0.06, -0.28), "rx": 0.36, "ry": 0.24, "rz": 0.35, "tint": 0.96},
		{"pos": Vector3(0.48, -0.08, -0.06), "rx": 0.30, "ry": 0.20, "rz": 0.28, "tint": 0.90},
		{"pos": Vector3(-0.46, -0.10, -0.04), "rx": 0.32, "ry": 0.20, "rz": 0.30, "tint": 0.88},
		{"pos": Vector3(0.06, -0.08, 0.46), "rx": 0.32, "ry": 0.19, "rz": 0.28, "tint": 0.92},
		{"pos": Vector3(-0.08, -0.09, -0.46), "rx": 0.30, "ry": 0.20, "rz": 0.28, "tint": 0.86},
		{"pos": Vector3(0.18, 0.36, 0.10), "rx": 0.28, "ry": 0.20, "rz": 0.26, "tint": 1.14},
		{"pos": Vector3(-0.18, 0.34, -0.10), "rx": 0.26, "ry": 0.19, "rz": 0.26, "tint": 1.12},
	]
	var segs := 6
	var rings := 3
	for lb in tufts:
		var c: Vector3 = lb["pos"]
		var rx := float(lb["rx"])
		var ry := float(lb["ry"])
		var rz := float(lb["rz"])
		var tint := float(lb["tint"])
		var ang_off := rng.randf_range(0.0, TAU)
		var rad_j: Array[float] = []
		for sj in range(segs):
			rad_j.append(rng.randf_range(0.84, 1.18))
		for r in range(rings):
			var v0 := float(r) / float(rings) * PI
			var v1 := float(r + 1) / float(rings) * PI
			var t0 := clampf(cos(v0) * 0.5 + 0.5, 0.0, 1.0)
			var t1 := clampf(cos(v1) * 0.5 + 0.5, 0.0, 1.0)
			var col0 := Color(0.50, 0.60, 0.46).lerp(Color(1.06, 1.08, 0.88), t0) * tint
			var col1 := Color(0.50, 0.60, 0.46).lerp(Color(1.06, 1.08, 0.88), t1) * tint
			col0 = Color(clampf(col0.r, 0.32, 1.18), clampf(col0.g, 0.38, 1.22), clampf(col0.b, 0.30, 1.05))
			col1 = Color(clampf(col1.r, 0.32, 1.18), clampf(col1.g, 0.38, 1.22), clampf(col1.b, 0.30, 1.05))
			for s in range(segs):
				var ns := (s + 1) % segs
				var u0 := ang_off + float(s) / float(segs) * TAU
				var u1 := ang_off + float(s + 1) / float(segs) * TAU
				var j0 := rad_j[s]
				var j1 := rad_j[ns]
				var p00 := c + Vector3(sin(v0) * cos(u0) * rx * j0, cos(v0) * ry, sin(v0) * sin(u0) * rz * j0)
				var p10 := c + Vector3(sin(v0) * cos(u1) * rx * j1, cos(v0) * ry, sin(v0) * sin(u1) * rz * j1)
				var p11 := c + Vector3(sin(v1) * cos(u1) * rx * j1, cos(v1) * ry, sin(v1) * sin(u1) * rz * j1)
				var p01 := c + Vector3(sin(v1) * cos(u0) * rx * j0, cos(v1) * ry, sin(v1) * sin(u0) * rz * j0)
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
	# Bloque estratificado de basalto volcánico multifacetado con planos nítidos (smooth_group = -1)
	# y meseta superior erosionada (elimina los conos lisos y "huevos" en acantilados, cala y escollos)
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	st.set_smooth_group(-1)
	var rng := RandomNumberGenerator.new()
	rng.seed = seed_val
	var sides := 7
	var levels := [
		{"y": 0.00, "r": 0.66, "col": Color(0.68, 0.72, 0.73)},
		{"y": 0.34, "r": 0.62, "col": Color(0.77, 0.80, 0.80)},
		{"y": 0.68, "r": 0.54, "col": Color(0.86, 0.88, 0.85)},
		{"y": 0.94, "r": 0.42, "col": Color(0.95, 0.96, 0.91)},
	]
	var base_rad: Array[float] = []
	for s in range(sides):
		base_rad.append(rng.randf_range(0.80, 1.20))

	var rings: Array[Array] = []
	for li in range(levels.size()):
		var ring: Array[Vector3] = []
		var ly := float(levels[li]["y"])
		var lr := float(levels[li]["r"])
		var shear_x := float(li) * rng.randf_range(-0.025, 0.025)
		var shear_z := float(li) * rng.randf_range(-0.025, 0.025)
		for s in range(sides):
			var ang := (float(s) / float(sides)) * TAU + float(li) * 0.07
			var jitter := base_rad[s] * rng.randf_range(0.92, 1.08)
			var dip := -cos(ang) * 0.045 * float(li) / 3.0
			var yj := (rng.randf_range(-0.03, 0.04) + dip) if li > 0 else 0.0
			ring.append(Vector3(cos(ang) * lr * jitter + shear_x, ly + yj, sin(ang) * lr * jitter + shear_z))
		rings.append(ring)

	for li in range(levels.size() - 1):
		var c0: Color = levels[li]["col"]
		var c1: Color = levels[li + 1]["col"]
		for s in range(sides):
			var ns := (s + 1) % sides
			var shade := rng.randf_range(-0.07, 0.08)
			var fc0 := c0.lightened(shade) if shade >= 0.0 else c0.darkened(-shade)
			var fc1 := c1.lightened(shade) if shade >= 0.0 else c1.darkened(-shade)
			_emit_quad_cw(st, rings[li][ns], rings[li][s], rings[li + 1][s], rings[li + 1][ns], fc0, fc0, fc1, fc1)

	# Meseta superior facetada irregular (sin pico cónico artificial)
	var top_ring: Array = rings[rings.size() - 1]
	var apex := Vector3(rng.randf_range(-0.06, 0.06), 1.00, rng.randf_range(-0.06, 0.06))
	var c_top := Color(0.96, 0.96, 0.90)
	for s in range(sides):
		var ns := (s + 1) % sides
		st.set_color(c_top); st.add_vertex(top_ring[ns])
		st.set_color(c_top); st.add_vertex(apex)
		st.set_color(c_top); st.add_vertex(top_ring[s])

	st.generate_normals()
	return st.commit()

static func build_sanctuary_canary(parent: Node3D, pos: Vector3, yaw: float, mat_gold: Material) -> Node3D:
	# Canario dorado esculpido 3D (cuerpo fusiforme, alas plegadas, cola en abanico, ojos brillantes y pico fino)
	var b := Node3D.new()
	b.name = "SanctuaryCanary"
	b.position = pos
	b.rotation.y = yaw
	parent.add_child(b)

	var mat_body := StandardMaterial3D.new()
	mat_body.albedo_color = Color("#f4c842")
	mat_body.roughness = 0.56
	mat_body.metallic = 0.08
	var mat_wing := StandardMaterial3D.new()
	mat_wing.albedo_color = Color("#d9a224")
	mat_wing.roughness = 0.62
	mat_wing.metallic = 0.05
	var mat_beak := StandardMaterial3D.new()
	mat_beak.albedo_color = Color("#d97e2a")
	mat_beak.roughness = 0.45
	var mat_eye := StandardMaterial3D.new()
	mat_eye.albedo_color = Color("#121318")
	mat_eye.roughness = 0.08
	mat_eye.metallic_specular = 0.95

	# Patitas finas
	for lx in [-0.018, 0.018]:
		_cyl(b, Vector3(lx, 0.028, 0.0), 0.0055, 0.056, mat_beak)

	# Cuerpo ovalado suave (SphereMesh esculpido)
	var sm_body := SphereMesh.new()
	sm_body.radius = 0.052; sm_body.height = 0.104; sm_body.radial_segments = 10; sm_body.rings = 5
	var torso := MeshInstance3D.new()
	torso.name = "CanaryTorso"
	torso.mesh = sm_body
	torso.material_override = mat_body
	torso.position = Vector3(0.0, 0.085, 0.0)
	torso.scale = Vector3(0.86, 0.82, 1.48)
	torso.rotation.x = -0.18
	b.add_child(torso)

	# Alas plegadas aerodinámicas
	var sm_wing := SphereMesh.new()
	sm_wing.radius = 0.042; sm_wing.height = 0.084; sm_wing.radial_segments = 8; sm_wing.rings = 4
	for side_v in [-1.0, 1.0]:
		var side := float(side_v)
		var wg := MeshInstance3D.new()
		wg.mesh = sm_wing
		wg.material_override = mat_wing
		wg.position = Vector3(side * 0.036, 0.092, -0.014)
		wg.scale = Vector3(0.32, 0.62, 1.55)
		wg.rotation = Vector3(-0.22, -side * 0.10, side * 0.14)
		b.add_child(wg)

	# Cola fina ahusada
	var tail := _box(b, Vector3(0.0, 0.072, -0.105), Vector3(0.038, 0.012, 0.105), mat_wing)
	tail.rotation.x = -0.26

	# Cabeza con pivote (preserva animación de giro y picoteo en retreat_layout_builder.gd)
	var head_piv := Node3D.new()
	head_piv.name = "HeadPivot"
	head_piv.position = Vector3(0.0, 0.132, 0.048)
	b.add_child(head_piv)

	var sm_head := SphereMesh.new()
	sm_head.radius = 0.036; sm_head.height = 0.072; sm_head.radial_segments = 10; sm_head.rings = 5
	var head := MeshInstance3D.new()
	head.mesh = sm_head
	head.material_override = mat_gold if mat_gold is StandardMaterial3D else mat_body
	head.position = Vector3(0.0, 0.018, 0.008)
	head.scale = Vector3(0.95, 0.92, 1.08)
	head_piv.add_child(head)

	# Pico cónico y ojitos oscuros brillantes
	var cm_beak := CylinderMesh.new()
	cm_beak.top_radius = 0.002; cm_beak.bottom_radius = 0.012; cm_beak.height = 0.036; cm_beak.radial_segments = 6
	var beak := MeshInstance3D.new()
	beak.mesh = cm_beak
	beak.material_override = mat_beak
	beak.position = Vector3(0.0, 0.015, 0.056)
	beak.rotation.x = PI * 0.52
	head_piv.add_child(beak)

	var sm_eye := SphereMesh.new()
	sm_eye.radius = 0.0075; sm_eye.height = 0.015; sm_eye.radial_segments = 6; sm_eye.rings = 3
	for ex in [-0.025, 0.025]:
		var eye := MeshInstance3D.new()
		eye.mesh = sm_eye
		eye.material_override = mat_eye
		eye.position = Vector3(ex, 0.026, 0.028)
		head_piv.add_child(eye)
	return b

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

static func routine_pivot(parent: Node3D, id: String, local_position: Vector3) -> Node3D:
	var pivot := Node3D.new()
	pivot.position = local_position
	parent.add_child(pivot)
	return routine_target(pivot, id)

static func routine_target(node: Node3D, id: String) -> Node3D:
	node.name = id
	node.add_to_group("retreat_routine_props")
	node.add_to_group("dynamic_prop")
	return node

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
				if c3.is_in_group("dynamic_prop") or c3.is_in_group("interactive_doors"):
					continue
				if c3 is MeshInstance3D:
					var mi := c3 as MeshInstance3D
					if not mi.visible or mi.is_in_group("camera_occluder") or mi.is_in_group("night_flame") or mi.mesh == null or mi.mesh.get_surface_count() != 1:
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
	if mat is StandardMaterial3D and (mat as StandardMaterial3D).emission_enabled and (mat as StandardMaterial3D).emission_energy_multiplier >= 2.0:
		inst.add_to_group("night_flame")
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
	if mat is StandardMaterial3D and (mat as StandardMaterial3D).emission_enabled and (mat as StandardMaterial3D).emission_energy_multiplier >= 2.0:
		inst.add_to_group("night_flame")
	parent.add_child(inst)
	return inst
