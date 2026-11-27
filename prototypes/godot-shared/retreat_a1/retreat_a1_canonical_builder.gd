extends RefCounted

# ==============================================================================
# CONSTRUCTOR CANÓNICO ÚNICO DEL SECTOR A1 (EL RETIRO DEL DRAGÓN <-> A1 ROOMS)
# Única fuente de arquitectura, mobiliario, iluminación de A1, bóvedas cutaway,
# jardineras de A1, AO de contacto y manifiesto de paridad.
#
# Perfiles de carga:
# - LoadProfile.FULL_RETREAT: llamado desde godot-retiro; construye A1 y permite
#   al ensamblador del Retiro continuar con A2–A5, playa, bosque y habitantes.
# - LoadProfile.A1_CAMP: llamado desde godot-campamentos; construye exactamente
#   el mismo A1 + contexto visual inmediato recortado + cierres de plaza exclusivos,
#   sin instanciar jamás A2–A5, muelle, bosque lejano, escaleras ni PNJ externos.
# ==============================================================================

static var _cfg_cache: GDScript = null
static var _geo_cache: GDScript = null

static func _shared_dir() -> String:
	return ProjectSettings.globalize_path("res://").path_join("../godot-shared/retreat_a1").simplify_path()

static func cfg() -> GDScript:
	if _cfg_cache == null:
		_cfg_cache = ResourceLoader.load(_shared_dir().path_join("retreat_a1_config.gd")) as GDScript
	return _cfg_cache

static func geo() -> GDScript:
	if _geo_cache == null:
		_geo_cache = ResourceLoader.load(_shared_dir().path_join("retreat_a1_geometry.gd")) as GDScript
	return _geo_cache

# ==============================================================================
# 1. CELDAS A1 (Nodos raíz + luces base) Y DETALLES DE PLAZA A1
# ==============================================================================
static func build_a1_cells(builder: Node3D) -> Node3D:
	var C := cfg()
	var cells_node := Node3D.new()
	cells_node.name = "A1_Cells"
	builder.add_child(cells_node)

	var t: float = float(C.TILE_METERS)
	var y_base: float = float(C.ELEV_A1_PLAZA)
	var mat_cell_floor: Material = builder.get("mat_cell_floor")

	for cdef: Dictionary in C.A1_CELLS:
		var rid := int(cdef["room_id"])
		var room_node := Node3D.new()
		room_node.name = "Cell_%d_%s" % [rid, str(cdef["role"])]
		room_node.set_meta("canonical_id", str(cdef["id"]))
		cells_node.add_child(room_node)

		var rect: Rect2i = cdef["rect_tiles"]
		var x0 := float(rect.position.x) * t
		var x1 := float(rect.position.x + rect.size.x) * t
		var z0 := float(rect.position.y) * t
		var z1 := float(rect.position.y + rect.size.y) * t
		var cx := (x0 + x1) * 0.5
		var cz := (z0 + z1) * 0.5
		var w := x1 - x0

		var floor_box := _box(room_node, Vector3(cx, y_base + 0.01, cz), Vector3(w, 0.04, z1 - z0), mat_cell_floor)
		floor_box.name = "Floor"
		floor_box.visible = false

		var cell_light := OmniLight3D.new()
		cell_light.name = "CellTorchLight_%d" % rid
		cell_light.position = Vector3(cx, y_base + 2.35, cz - 0.6)
		cell_light.light_color = Color(1.0, 0.74, 0.42)
		cell_light.light_energy = 2.65
		cell_light.omni_range = 10.5
		room_node.add_child(cell_light)

	return cells_node

static func build_a1_plaza_details(builder: Node3D) -> Node3D:
	var C := cfg()
	var plaza_node := Node3D.new()
	plaza_node.name = "A1_PlazaDetails"
	builder.add_child(plaza_node)

	var mat_flame: Material = builder.get("mat_flame")
	var fire_pos: Vector3 = C.PLAZA_FIRE_POS
	var camp_node := Node3D.new()
	camp_node.name = "A1_Campfire"
	camp_node.set_meta("canonical_id", "a1-plaza-fire-point")
	camp_node.position = fire_pos
	plaza_node.add_child(camp_node)
	_add_cyl_collider(camp_node, Vector3(0.0, 0.45, 0.0), 0.58, 1.0)
	_tag_camera_occluder(camp_node)

	var cf_flame := _cyl(camp_node, Vector3(0.0, 0.38, 0.0), 0.20, 0.48, mat_flame)
	cf_flame.name = "CampfireFlame"

	var fire_light := OmniLight3D.new()
	fire_light.name = "CampfireLight"
	fire_light.position = Vector3(0.0, 1.65, 0.0)
	fire_light.light_color = Color(1.0, 0.58, 0.22)
	fire_light.light_energy = 3.1
	fire_light.omni_range = 17.5
	camp_node.add_child(fire_light)
	if builder.has_method("register_flame_fx"):
		builder.call("register_flame_fx", cf_flame, fire_light, true)

	var statue_node := Node3D.new()
	statue_node.name = "A1_Dragon_Statue"
	statue_node.set_meta("canonical_id", "a1-astalagan-point")
	statue_node.position = C.ASTALAGAN_POS
	plaza_node.add_child(statue_node)

	var statue_light := OmniLight3D.new()
	statue_light.name = "AstalaganVotiveLight"
	statue_light.position = Vector3(0.0, 2.4, 0.6)
	statue_light.light_color = Color(1.0, 0.78, 0.42)
	statue_light.light_energy = 1.65
	statue_light.omni_range = 9.0
	statue_node.add_child(statue_light)

	return plaza_node

# ==============================================================================
# 2. MASA ROCOSA EXCAVADA, BÓVEDAS CUTAWAY, PORTALES CON PUERTAS DOBLES Y LUCES A1
# ==============================================================================
static func build_a1_cave_roofs_and_archways(builder: Node3D, roofs_root: Node3D, rng: RandomNumberGenerator, fx: Node = null) -> Array[Dictionary]:
	var C := cfg()
	var G := geo()
	var style: Dictionary = C.STYLE_TUNING

	var mat_cliff: Material = builder.get("_mat_carved_glb") if builder.get("_mat_carved_glb") else builder.get("mat_rock_carved")
	var mat_rock_dark: Material = builder.get("mat_rock_dark")
	var mat_stone_arch: Material = builder.get("_mat_limestone_glb") if builder.get("_mat_limestone_glb") else builder.get("mat_column")
	var mat_iron_fac: Material = builder.get("mat_iron")
	var mat_flame_fac: Material = builder.get("mat_flame")
	var mat_wood_dark_fac: Material = builder.get("mat_wood_dark")

	var mat_moss_roof: Material = G.create_geological_cliff_material(builder)
	var mat_dark_basalt_upper: Material = G.create_dark_basalt_slab_material(builder)
	var plate_mesh_upper: ArrayMesh = G.make_angular_basalt_plate_mesh(811)
	var strata_mesh: ArrayMesh = G.make_layered_cliff_crag_mesh(701)

	var roof_entries: Array[Dictionary] = []

	var a1_rock_shell := Node3D.new()
	a1_rock_shell.name = "A1_ExcavatedCliffMass"
	builder.add_child(a1_rock_shell)

	var strata_moss_xfs: Array[Transform3D] = []
	var plate_moss_xfs: Array[Transform3D] = []
	var plate_dark_xfs: Array[Transform3D] = []

	var west_terraces := [
		[Vector3(68.6, 9.0, 86.0), Vector3(4.2, 2.8, 4.4), 0.14],
		[Vector3(72.2, 9.0, 85.2), Vector3(4.6, 3.8, 4.8), -0.18],
		[Vector3(75.0, 9.0, 86.6), Vector3(3.4, 4.5, 4.0), 0.22],
		[Vector3(70.0, 11.6, 80.4), Vector3(5.2, 3.6, 4.8), -0.12],
		[Vector3(74.0, 12.4, 78.8), Vector3(4.8, 4.2, 4.8), 0.18],
	]
	for wt: Array in west_terraces:
		strata_moss_xfs.append(_xf_trs(wt[0], Vector3(0.0, float(wt[2]), 0.0), wt[1]))

	var east_terraces := [
		[Vector3(138.6, 9.0, 86.6), Vector3(4.0, 4.4, 4.2), -0.16],
		[Vector3(142.4, 9.0, 85.4), Vector3(4.8, 3.8, 4.6), 0.12],
		[Vector3(146.2, 9.0, 86.2), Vector3(4.4, 3.2, 4.2), -0.22],
		[Vector3(148.6, 9.0, 87.6), Vector3(3.4, 2.5, 3.6), 0.18],
		[Vector3(140.4, 12.2, 79.8), Vector3(5.2, 4.2, 4.8), 0.10],
		[Vector3(145.4, 11.8, 80.8), Vector3(4.6, 3.6, 4.4), -0.15],
		[Vector3(148.4, 11.4, 82.2), Vector3(3.4, 3.1, 3.8), 0.24],
	]
	for et: Array in east_terraces:
		strata_moss_xfs.append(_xf_trs(et[0], Vector3(0.0, float(et[2]), 0.0), et[1]))

	var buttress_specs := [
		[76.1, 0.0, 1.12, 0.92, -16.0],
		[85.4, 0.45, 0.88, 1.15, 19.0],
		[95.0, -0.35, 1.24, 0.85, -11.0],
		[106.8, 0.52, 0.95, 1.18, 23.0],
		[117.5, -0.28, 1.18, 0.94, -21.0],
		[126.9, 0.38, 0.86, 1.08, 15.0],
		[136.7, -0.18, 1.10, 0.96, -13.0],
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
			if tier_i == 2:
				var xf2 := _xf_trs_deg(
					Vector3(bx + sin(float(bi * 3 + tier_i)) * 0.45, ty + 0.60, tz),
					Vector3(6.5, yaw_deg * 0.8, -4.5 + float(bi % 3) * 2.0),
					Vector3(4.6 * wx_mul, 2.15 + float(bi % 2) * 0.35, 3.5 * wz_mul)
				)
				if bi % 2 == 0:
					plate_dark_xfs.append(xf2)
				else:
					plate_moss_xfs.append(xf2)
			elif tier_i == 1:
				var xf1 := _xf_trs_deg(
					Vector3(bx + cos(float(bi) * 1.9) * 0.85, ty + 0.25, tz + sin(float(bi) * 1.7) * 0.90),
					Vector3(11.0 + float(bi % 3) * 3.0, yaw_deg, -6.0 + float(bi % 2) * 8.0),
					Vector3(3.4 * wx_mul, 2.35 + float(bi % 3) * 0.35, 2.8 * wz_mul)
				)
				if bi % 2 == 0:
					plate_moss_xfs.append(xf1)
				else:
					plate_dark_xfs.append(xf1)
			else:
				strata_moss_xfs.append(_xf_trs(
					Vector3(bx + sin(float(bi * 3 + tier_i)) * 0.16, ty, tz),
					Vector3(0.0, deg_to_rad(yaw_deg * 0.6), 0.0),
					Vector3(2.2 * wx_mul, 3.1 + float(bi % 2) * 0.35, 2.5 * wz_mul)
				))

	var a1_back_wall := _box(a1_rock_shell, Vector3(106.5, 13.45, 74.65), Vector3(62.4, 9.2, 1.85), mat_cliff, true)
	a1_back_wall.name = "A1_PermanentBackCliffWall"
	for bk_i in range(12):
		var bk_x := lerpf(78.2, 135.0, float(bk_i) / 11.0)
		var xfb := _xf_trs_deg(
			Vector3(bk_x, 12.1 + float(bk_i % 3) * 0.45, 75.05 + sin(float(bk_i) * 1.4) * 0.22),
			Vector3(5.0, float(bk_i % 2) * 14.0 - 7.0, -3.0),
			Vector3(6.2, 5.4, 2.2)
		)
		if bk_i % 2 == 0:
			plate_dark_xfs.append(xfb)
		else:
			plate_moss_xfs.append(xfb)

	_add_static_mm(a1_rock_shell, "MM_A1FlankAndButtressStrata", strata_mesh, mat_moss_roof, strata_moss_xfs, true)
	_add_static_mm(a1_rock_shell, "MM_A1ButtressPlatesMoss", plate_mesh_upper, mat_moss_roof, plate_moss_xfs, true)
	_add_static_mm(a1_rock_shell, "MM_A1ButtressPlatesDark", plate_mesh_upper, mat_dark_basalt_upper, plate_dark_xfs, true)

	var door_script: Script = load("res://scripts/interactive_door.gd") if ResourceLoader.exists("res://scripts/interactive_door.gd") else null

	for sp: Dictionary in C.A1_CELLS:
		var cid := str(sp["id"])
		var rnode := Node3D.new()
		rnode.name = "CaveRoof_" + cid
		rnode.set_meta("canonical_id", "cutaway-" + str(sp["camp_key"]))
		roofs_root.add_child(rnode)

		var x0 := float(sp["x0"])
		var x1 := float(sp["x1"])
		var z0 := float(sp["z0"])
		var z1 := float(sp["z1"])
		var door_x := float(sp["door_x"])

		var vault_mesh: ArrayMesh = G.build_stratified_cave_vault_mesh(
			x0, x1, z0 - 2.6, z1, 9.0, 12.35, 17.55,
			door_x, 2.5, 2.72, rng, Color("#c4cdca"), Color("#8ca26a"), false
		)
		var v_inst := MeshInstance3D.new()
		v_inst.name = "VaultMesh"
		v_inst.mesh = vault_mesh
		v_inst.material_override = mat_moss_roof
		rnode.add_child(v_inst)

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

		var cell_door: Node3D = _build_excavated_cell_shell_and_portal(
			builder, a1_rock_shell, rnode, cid, str(sp["label"]),
			x0, x1, z0, z1, door_x, 9.0, mat_stone_arch, mat_cliff, mat_rock_dark, strata_mesh, door_script
		)

		var front_wall_w_l := (door_x - 1.35) - x0
		if front_wall_w_l > 0.35:
			_add_box_collider(builder, Vector3(x0 + front_wall_w_l * 0.5, 10.6, z1 - 0.12), Vector3(front_wall_w_l, 3.2, 0.55))
		var front_wall_w_r := x1 - (door_x + 1.35)
		if front_wall_w_r > 0.35:
			_add_box_collider(builder, Vector3((door_x + 1.35) + front_wall_w_r * 0.5, 10.6, z1 - 0.12), Vector3(front_wall_w_r, 3.2, 0.55))
		_add_box_collider(builder, Vector3((x0 + x1) * 0.5, 10.6, z0 + 0.15), Vector3(x1 - x0, 3.2, 0.55))
		_add_box_collider(builder, Vector3(x0, 10.6, (z0 + z1) * 0.5), Vector3(0.55, 3.2, (z1 - z0) - 0.4))

		roof_entries.append({
			"id": cid,
			"camp_key": str(sp["camp_key"]),
			"group": "a1_caves",
			"node": rnode,
			"door": cell_door,
			"rect": Rect2(x0, z0, x1 - x0, (z1 - z0) - 0.15),
			"door_rect": Rect2(door_x - 1.75, z1 - 1.4, 3.5, 2.5),
			"y_min": 7.5,
			"y_max": 13.8,
		})
	_add_box_collider(builder, Vector3(136.8, 10.6, 82.55), Vector3(0.55, 3.2, 12.7))

	# Iluminación nocturna de A1: antorchas murales, faroles del pretil sur y AO de umbrales
	var a1_night_rig := Node3D.new()
	a1_night_rig.name = "A1_NightLightingRig"
	builder.add_child(a1_night_rig)
	var mat_ao_dark := StandardMaterial3D.new()
	mat_ao_dark.albedo_color = Color(0.05, 0.04, 0.03, 0.42)
	mat_ao_dark.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat_ao_dark.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat_ao_dark.cull_mode = BaseMaterial3D.CULL_DISABLED

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
		var stick := _cyl(ts, Vector3(0.0, 0.14, 0.08), 0.048, 0.38, mat_wood_dark_fac)
		stick.rotation.x = 0.24
		_cyl(ts, Vector3(0.0, 0.28, 0.14), 0.075, 0.06, mat_iron_fac)
		var t_flm := _cyl(ts, Vector3(0.0, 0.40, 0.16), 0.072, 0.22, mat_flame_fac)
		t_flm.add_to_group("night_flame")
		if ti % 2 == 0:
			var p_light := OmniLight3D.new()
			p_light.name = "A1PortalTorchLight_%d" % ti
			p_light.position = Vector3(tx + 1.8, 11.20, 89.59)
			p_light.light_color = Color(1.0, 0.66, 0.28)
			p_light.light_energy = float(style["portal_torch_energy"])
			p_light.omni_range = 8.4
			a1_night_rig.add_child(p_light)
			_register_a1_light(builder, fx, t_flm, p_light, float(style["portal_torch_energy"]), 0.09)
		else:
			if builder.has_method("register_flame_fx"):
				builder.call("register_flame_fx", t_flm, null, false)

	for lx_p in [80.2, 90.8, 101.8, 115.2, 128.4]:
		var l_node := Node3D.new()
		l_node.name = "A1ParapetLantern_%d" % int(lx_p)
		l_node.position = Vector3(float(lx_p), 9.62, 96.76)
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
		pl.light_energy = float(style["parapet_lantern_energy"])
		pl.omni_range = 6.8
		l_node.add_child(pl)
		_register_a1_light(builder, fx, l_flm, pl, float(style["parapet_lantern_energy"]), 0.06)

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

static func _build_excavated_cell_shell_and_portal(
	builder: Node3D,
	static_parent: Node3D,
	roof_parent: Node3D,
	cell_id: String,
	cell_label: String,
	x0: float, x1: float, z0: float, z1: float,
	door_x: float, y0: float,
	mat_arch: Material, mat_rock: Material, mat_dark: Material,
	strata_mesh: Mesh,
	door_script: Script
) -> Node3D:
	var G := geo()
	var shell := Node3D.new()
	shell.name = "ExcavatedShell_" + cell_id
	static_parent.add_child(shell)

	var thresh := _box(shell, Vector3(door_x, y0 + 0.045, z1 - 0.38), Vector3(2.50, 0.09, 1.48), mat_arch)
	thresh.name = "ThresholdSlab_" + cell_id
	for side_v in [-1.0, 1.0]:
		var side := float(side_v)
		var jx := door_x + side * 1.26
		for course_i in range(2):
			var cy := y0 + 0.24 + float(course_i) * 0.44
			var cw := 0.62 - float(course_i % 2) * 0.05
			var cd := 1.40 - float(course_i) * 0.06
			var blk := _box(shell, Vector3(jx, cy, z1 - 0.35), Vector3(cw, 0.42, cd), mat_arch if course_i % 2 == 0 else mat_rock, true)
			blk.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		_add_box_collider(shell, Vector3(jx, y0 + 1.40, z1 - 0.35), Vector3(0.72, 2.80, 1.46))
		for up_i in range(4):
			var uy := y0 + 1.12 + float(up_i) * 0.48
			_box(roof_parent, Vector3(jx, uy, z1 - 0.30), Vector3(0.58 - float(up_i % 2) * 0.05, 0.46, 1.32 - float(up_i) * 0.05), mat_arch, true)
		var cheek_crag := MeshInstance3D.new()
		cheek_crag.mesh = strata_mesh
		cheek_crag.material_override = mat_rock
		cheek_crag.position = Vector3(door_x + side * 2.15, y0, z1 - 0.42)
		cheek_crag.scale = Vector3(1.55, 2.95, 1.45)
		cheek_crag.rotation.y = side * 0.25
		cheek_crag.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		roof_parent.add_child(cheek_crag)

	_box(roof_parent, Vector3(door_x, y0 + 2.66, z1 - 0.24), Vector3(3.18, 0.48, 1.36), mat_arch, true)
	_box(roof_parent, Vector3(door_x, y0 + 2.80, z1 - 0.16), Vector3(0.68, 0.64, 1.44), mat_arch, true)

	var mat_door_wood: Material = builder.get("mat_wood_dark") if builder.get("mat_wood_dark") else mat_dark
	var mat_door_trim: Material = builder.get("mat_wood") if builder.get("mat_wood") else mat_door_wood
	var mat_door_iron: Material = builder.get("mat_iron") if builder.get("mat_iron") else mat_dark

	var door_ctrl: Node3D = door_script.new() if door_script != null else Node3D.new()
	door_ctrl.name = "CellDoor_" + cell_id
	door_ctrl.position = Vector3(door_x, y0 + 0.08, z1 - 0.52)
	if door_script != null:
		door_ctrl.set("door_id", cell_id)
		door_ctrl.set("door_title", "Puerta de " + cell_label)
		door_ctrl.set("is_open", true)
		door_ctrl.set("open_angle_rad", 1.32)
		door_ctrl.set("interact_radius", 2.75)
	shell.add_child(door_ctrl)
	_tag_camera_occluder(door_ctrl)

	var left_piv := Node3D.new()
	left_piv.name = "LeftLeafPivot"
	left_piv.position = Vector3(-0.94, 0.0, 0.0)
	door_ctrl.add_child(left_piv)
	_box(left_piv, Vector3(0.468, 1.13, 0.0), Vector3(0.935, 2.26, 0.11), mat_door_wood, true)
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
	_box(right_piv, Vector3(-0.468, 1.13, 0.0), Vector3(0.935, 2.26, 0.11), mat_door_wood, true)
	_box(right_piv, Vector3(-0.468, 1.13, 0.062), Vector3(0.84, 2.12, 0.018), mat_door_trim)
	_box(right_piv, Vector3(-0.92, 1.13, 0.07), Vector3(0.06, 2.24, 0.03), mat_door_wood)
	for strap_y in [0.42, 1.13, 1.84]:
		_box(right_piv, Vector3(-0.42, float(strap_y), 0.072), Vector3(0.84, 0.075, 0.022), mat_door_iron)
		_box(right_piv, Vector3(-0.42, float(strap_y), -0.066), Vector3(0.84, 0.075, 0.022), mat_door_iron)
	_cyl(right_piv, Vector3(-0.80, 1.06, 0.085), 0.062, 0.036, mat_door_iron)
	_cyl(right_piv, Vector3(-0.80, 1.06, -0.085), 0.062, 0.036, mat_door_iron)

	if door_script != null:
		var blk_body := StaticBody3D.new()
		blk_body.name = "DoorBlockerBody"
		door_ctrl.add_child(blk_body)
		var blk_col := CollisionShape3D.new()
		var blk_box := BoxShape3D.new()
		blk_box.size = Vector3(2.24, 2.40, 0.40)
		blk_col.shape = blk_box
		blk_col.position = Vector3(0.0, 1.12, 0.0)
		blk_col.disabled = true
		blk_body.add_child(blk_col)
		door_ctrl.set("left_pivot", left_piv)
		door_ctrl.set("right_pivot", right_piv)
		door_ctrl.set("blocker_shape", blk_col)
		door_ctrl.call("set_open", true, false)
	else:
		# En modo campamento (sin InteractiveDoorScript), mantener ambas hojas abiertas hacia el interior igual que en Retiro
		left_piv.rotation.y = 1.32
		right_piv.rotation.y = -1.32

	var cave_plate_mesh: ArrayMesh = G.make_angular_basalt_plate_mesh(int(x0 * 17.0) + 41)
	var plate_rock_xfs: Array[Transform3D] = []
	var plate_dark_xfs: Array[Transform3D] = []
	for bi in range(5):
		var bx := lerpf(x0 + 0.90, x1 - 0.90, float(bi) / 4.0)
		var bz := z0 + 0.44 + sin(float(bi) * 1.9 + x0) * 0.18
		var xf_b := _xf_trs_deg(Vector3(bx, y0 - 0.12, bz), Vector3(4.0, float(bi % 2) * 12.0 - 6.0, 0.0), Vector3(2.45, 3.35 + float(bi % 2) * 0.35, 1.35))
		if bi % 2 == 0:
			plate_rock_xfs.append(xf_b)
		else:
			plate_dark_xfs.append(xf_b)

	for s_dir in [-1.0, 1.0]:
		var sx_base := (x0 + 0.34) if s_dir < 0.0 else (x1 - 0.34)
		for si in range(5):
			var sz := lerpf(z0 + 1.30, z1 - 1.65, float(si) / 4.0)
			var inset := sin(float(si) * 2.1 + sx_base) * 0.18
			var xf_s := _xf_trs_deg(Vector3(sx_base - s_dir * inset, y0 - 0.10, sz), Vector3(0.0, 90.0 + float(si % 2) * 10.0 - 5.0, s_dir * 4.0), Vector3(1.22, 3.25 + float(si % 2) * 0.28, 2.35))
			if (si + int(s_dir > 0.0)) % 2 == 0:
				plate_rock_xfs.append(xf_s)
			else:
				plate_dark_xfs.append(xf_s)
	_add_static_mm(shell, "MM_CavePlatesRock_" + cell_id, cave_plate_mesh, mat_rock, plate_rock_xfs, false)
	_add_static_mm(shell, "MM_CavePlatesDark_" + cell_id, cave_plate_mesh, mat_dark, plate_dark_xfs, false)

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

# ==============================================================================
# 3. MOBILIARIO CANÓNICO DE LAS 6 CELDAS A1 Y DE LA PLAZA A1
# ==============================================================================
static func build_a1_furniture(builder: Node3D, furn_root: Node3D, fx: Node = null) -> void:
	var C := cfg()
	var style: Dictionary = C.STYLE_TUNING
	var y_a1: float = float(C.ELEV_A1_PLAZA)

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
	var mat_cell_floor: Material = builder.get("mat_cell_floor") if builder.get("mat_cell_floor") else mat_stone

	var mat_blanket_ochre: Material = _make_mat(builder, style["plaza_bench_runner_b"], 0.88, 0.0)
	var mat_blanket_sage: Material = _make_mat(builder, Color("#4a7c4e"), 0.88, 0.0)
	var mat_blanket_blue: Material = _make_mat(builder, Color("#3b6285"), 0.88, 0.0)
	var mat_blanket_crimson: Material = _make_mat(builder, Color("#a63e38"), 0.88, 0.0)
	var mat_rug_warm: Material = _make_mat(builder, Color("#8c4436"), 0.92, 0.0)
	var mat_rug_blue: Material = _make_mat(builder, Color("#3d5a73"), 0.92, 0.0)
	var mat_rug_gold: Material = _make_mat(builder, Color("#b88e44"), 0.92, 0.0)
	var mat_glass_herb: Material = _make_mat(builder, Color(0.32, 0.76, 0.48, 0.85), 0.18, 0.1)
	var mat_jute: Material = _make_mat(builder, Color("#9a7948"), 0.94, 0.0)
	var mat_jute_trim: Material = _make_mat(builder, Color("#765932"), 0.94, 0.0)
	var mat_cozy_rug_main: Material = _make_mat(builder, style["bench_rug_main"], 0.93, 0.0)
	var mat_cozy_rug_border: Material = _make_mat(builder, style["bench_rug_border"], 0.93, 0.0)
	var mat_door_mat_main: Material = _make_mat(builder, style["door_mat_main"], 0.94, 0.0)
	var mat_door_mat_border: Material = _make_mat(builder, style["door_mat_border"], 0.94, 0.0)

	var ip_script: Script = load("res://scripts/interactive_prop.gd") if ResourceLoader.exists("res://scripts/interactive_prop.gd") else null

	# --- A. LAS 6 CELDAS EXCAVADAS DE A1 ---
	var cells_furn := Node3D.new()
	cells_furn.name = "A1_Cells_Furniture"
	furn_root.add_child(cells_furn)

	var slab_rock_xfs: Array[Transform3D] = []
	var slab_stone_xfs: Array[Transform3D] = []
	for cf_i in range(C.A1_CELLS.size()):
		var cf_r: Rect2 = C.A1_CELLS[cf_i]["floor_rect"]
		var cx_f := cf_r.position.x + cf_r.size.x * 0.5
		var cz_f := cf_r.position.y + cf_r.size.y * 0.5
		_box(cells_furn, Vector3(cx_f, y_a1 + 0.075, cz_f), Vector3(cf_r.size.x, 0.03, cf_r.size.y), mat_cell_floor)
		for sl_z in range(4):
			for sl_x in range(3):
				var sx_p := lerpf(cf_r.position.x + 1.1, cf_r.end.x - 1.1, float(sl_x) / 2.0) + sin(float(sl_z * 3 + sl_x + cf_i)) * 0.22
				var sz_p := lerpf(cf_r.position.y + 1.2, cf_r.end.y - 1.0, float(sl_z) / 3.0) + cos(float(sl_x * 5 + sl_z)) * 0.18
				var s_xf := _xf_trs(
					Vector3(sx_p, y_a1 + 0.092, sz_p),
					Vector3(0.0, sin(float(cf_i * 7 + sl_x * 3 + sl_z)) * 0.09, 0.0),
					Vector3(1.65 + float((sl_x + sl_z) % 2) * 0.35, 0.018, 1.55 + float(sl_z % 2) * 0.30)
				)
				if (sl_x + sl_z + cf_i) % 2 == 0:
					slab_rock_xfs.append(s_xf)
				else:
					slab_stone_xfs.append(s_xf)
	var unit_box := BoxMesh.new()
	unit_box.size = Vector3.ONE
	_add_static_mm(cells_furn, "MM_CellFloorSlabsRock", unit_box, mat_rock, slab_rock_xfs, false)
	_add_static_mm(cells_furn, "MM_CellFloorSlabsStone", unit_box, mat_stone, slab_stone_xfs, false)

	# Celda 1
	_build_pilgrim_bed(cells_furn, Vector3(78.5, y_a1, 81.2), 0.0, mat_dark_oak, mat_linen, mat_blanket_crimson, "a1-room-1-bed", ip_script)
	_build_guest_bedroll(cells_furn, Vector3(82.85, y_a1, 78.65), -0.18, mat_jute, mat_blanket_blue, mat_linen, "Petate de huésped (norte)", ip_script)
	_build_guest_bedroll(cells_furn, Vector3(78.25, y_a1, 86.75), 0.24, mat_jute, mat_blanket_ochre, mat_linen, "Petate de huésped (sur)", ip_script)
	_build_nightstand_with_candle(cells_furn, Vector3(80.0, y_a1, 80.2), mat_oak, mat_bronze, mat_flame)
	_build_monastic_desk_and_chair(cells_furn, Vector3(82.4, y_a1, 82.2), -PI * 0.5, mat_oak, mat_dark_oak, mat_linen, mat_bronze, ip_script)
	_build_braided_jute_mat(cells_furn, Vector3(80.2, y_a1 + 0.105, 83.4), Vector2(2.3, 3.2), mat_jute, mat_jute_trim)
	_build_bound_chest(cells_furn, Vector3(78.3, y_a1, 84.8), 0.25, mat_dark_oak, mat_iron, mat_bronze, ip_script)
	_build_pilgrim_pack_and_basket(cells_furn, Vector3(83.35, y_a1, 86.95), -0.35, mat_jute_trim, mat_jute, mat_bronze, mat_pottery)
	_build_cave_rock_niche(cells_furn, Vector3(77.05, y_a1 + 1.48, 82.0), PI * 0.5, mat_rock, mat_dark_oak, mat_blanket_crimson, mat_bronze, mat_flame)
	_build_monastic_wall_tapestry(cells_furn, Vector3(84.25, y_a1 + 1.85, 81.8), -PI * 0.5, mat_linen, mat_blanket_crimson, mat_dark_oak, mat_gold)

	# Celda 2 (Tarak)
	_build_pilgrim_bed(cells_furn, Vector3(87.6, y_a1, 79.4), 0.0, mat_dark_oak, mat_linen, mat_blanket_sage, "a1-room-2-bed", ip_script)
	_build_nightstand_with_candle(cells_furn, Vector3(89.1, y_a1, 78.6), mat_oak, mat_bronze, mat_flame)
	_build_monastic_desk_and_chair(cells_furn, Vector3(91.4, y_a1, 81.6), -PI * 0.5, mat_oak, mat_dark_oak, mat_linen, mat_bronze, ip_script)
	_build_herbalist_rack_and_potions(cells_furn, Vector3(87.3, y_a1, 83.6), mat_dark_oak, mat_pottery, mat_glass_herb, mat_blanket_sage, ip_script)
	_build_hanging_herb_bundles(cells_furn, Vector3(87.3, y_a1 + 2.18, 83.5), mat_dark_oak, mat_blanket_sage, mat_jute)
	_build_tarak_compost_sack(cells_furn, Vector3(86.45, y_a1, 86.85), mat_jute_trim, mat_jute, mat_blanket_sage, ip_script)
	_build_tarak_hidden_daggers(cells_furn, Vector3(93.35, y_a1, 79.35), mat_dark_oak, mat_iron, mat_bronze, ip_script)
	_build_pilgrim_pack_and_basket(cells_furn, Vector3(92.45, y_a1, 86.95), -0.28, mat_jute_trim, mat_jute, mat_bronze, mat_pottery)
	_build_braided_jute_mat(cells_furn, Vector3(89.6, y_a1 + 0.105, 82.8), Vector2(2.4, 3.4), mat_jute, mat_blanket_sage)
	_build_cave_rock_niche(cells_furn, Vector3(85.85, y_a1 + 1.48, 80.6), PI * 0.5, mat_rock, mat_dark_oak, mat_blanket_sage, mat_glass_herb, mat_flame)
	_build_monastic_wall_tapestry(cells_furn, Vector3(94.35, y_a1 + 1.85, 81.2), -PI * 0.5, mat_linen, mat_blanket_sage, mat_dark_oak, mat_gold)

	# Celda 3 (Varnoth)
	_build_pilgrim_bed(cells_furn, Vector3(98.0, y_a1, 80.8), 0.0, mat_dark_oak, mat_linen, mat_blanket_blue, "a1-room-3-bed", ip_script)
	_build_varnoth_hidden_sword(cells_furn, Vector3(98.78, y_a1, 81.05), mat_iron, mat_bronze, mat_dark_oak, ip_script)
	_build_nightstand_with_candle(cells_furn, Vector3(99.6, y_a1, 79.9), mat_oak, mat_bronze, mat_flame)
	_build_monastic_desk_and_chair(cells_furn, Vector3(102.6, y_a1, 81.0), -PI * 0.5, mat_oak, mat_dark_oak, mat_linen, mat_bronze, ip_script)
	_build_weapon_and_shield_rack(cells_furn, Vector3(97.6, y_a1, 84.2), mat_dark_oak, mat_iron, mat_bronze, mat_blanket_blue, ip_script)
	_build_bound_chest(cells_furn, Vector3(103.2, y_a1, 84.4), -0.4, mat_dark_oak, mat_iron, mat_bronze, ip_script)
	_build_pilgrim_pack_and_basket(cells_furn, Vector3(103.05, y_a1, 86.95), -0.32, mat_jute_trim, mat_jute, mat_iron, mat_pottery)
	_build_braided_jute_mat(cells_furn, Vector3(100.4, y_a1 + 0.105, 83.2), Vector2(2.7, 3.3), mat_jute, mat_rug_blue)
	_build_cave_rock_niche(cells_furn, Vector3(96.05, y_a1 + 1.48, 81.4), PI * 0.5, mat_rock, mat_dark_oak, mat_blanket_blue, mat_bronze, mat_flame)
	_build_monastic_wall_tapestry(cells_furn, Vector3(105.65, y_a1 + 1.85, 81.6), -PI * 0.5, mat_linen, mat_blanket_blue, mat_dark_oak, mat_gold)

	# Celda 4 (Myla)
	_build_pilgrim_bed(cells_furn, Vector3(109.4, y_a1, 80.8), 0.0, mat_dark_oak, mat_linen, mat_blanket_crimson, "a1-room-4-bed", ip_script)
	_build_nightstand_with_candle(cells_furn, Vector3(110.9, y_a1, 79.9), mat_oak, mat_bronze, mat_flame)
	_build_tinker_workbench(cells_furn, Vector3(113.0, y_a1, 79.8), mat_oak, mat_dark_oak, mat_bronze, mat_iron, mat_glass_herb, ip_script)
	_build_myla_gear_shop_display(cells_furn, Vector3(108.25, y_a1, 85.45), mat_oak, mat_dark_oak, mat_jute, mat_iron, mat_bronze, mat_glass_herb, mat_linen, ip_script)
	_build_monastic_desk_and_chair(cells_furn, Vector3(113.6, y_a1, 83.6), -PI * 0.5, mat_oak, mat_dark_oak, mat_linen, mat_bronze, ip_script)
	_build_monastic_storage_crates_and_baskets(cells_furn, Vector3(115.6, y_a1, 81.4), mat_dark_oak, mat_oak, mat_jute, mat_pottery)
	_build_pilgrim_pack_and_basket(cells_furn, Vector3(113.45, y_a1, 86.95), -0.25, mat_jute_trim, mat_jute, mat_bronze, mat_pottery)
	_build_braided_jute_mat(cells_furn, Vector3(111.2, y_a1 + 0.105, 83.4), Vector2(2.6, 3.2), mat_jute, mat_rug_warm)
	_build_cave_rock_niche(cells_furn, Vector3(107.35, y_a1 + 1.48, 82.0), PI * 0.5, mat_rock, mat_dark_oak, mat_blanket_ochre, mat_bronze, mat_flame)

	# Celda 5 (Kobolds Oeste)
	var kw_positions := [
		Vector3(120.1, y_a1, 79.0), Vector3(122.5, y_a1, 79.0),
		Vector3(120.1, y_a1, 82.0), Vector3(122.5, y_a1, 82.0),
	]
	var kw_mats := [mat_blanket_ochre, mat_blanket_crimson, mat_blanket_sage, mat_blanket_blue]
	for i in range(4):
		_build_kobold_hammock(cells_furn, kw_positions[i], 0.08 if i % 2 == 0 else -0.08, mat_dark_oak, kw_mats[i], mat_linen, "a1-room-5-hammocks" if i == 0 else "", ip_script)
	_build_blepp_dagger_peg(cells_furn, Vector3(118.85, y_a1, 86.45), mat_dark_oak, mat_iron, mat_bronze, ip_script)
	_build_braided_jute_mat(cells_furn, Vector3(121.3, y_a1 + 0.105, 81.5), Vector2(1.9, 3.9), mat_jute, mat_blanket_crimson)
	_build_brazier_stand(builder, cells_furn, Vector3(121.3, y_a1, 84.6), mat_iron, mat_bronze, mat_flame, ip_script, fx)
	_build_monastic_storage_crates_and_baskets(cells_furn, Vector3(123.6, y_a1, 85.2), mat_dark_oak, mat_oak, mat_jute, mat_pottery)
	_build_cave_rock_niche(cells_furn, Vector3(118.55, y_a1 + 1.48, 83.2), PI * 0.5, mat_rock, mat_dark_oak, mat_blanket_ochre, mat_pottery, mat_flame)

	# Celda 6 (Kobolds Este)
	var ke_positions := [
		Vector3(129.1, y_a1, 79.8), Vector3(132.4, y_a1, 79.8),
		Vector3(129.1, y_a1, 82.6), Vector3(132.4, y_a1, 82.6),
	]
	for i in range(4):
		_build_kobold_hammock(cells_furn, ke_positions[i], -0.08 if i % 2 == 0 else 0.08, mat_dark_oak, kw_mats[(i + 1) % 4], mat_linen, "a1-room-6-hammocks" if i == 0 else "", ip_script)
	_build_cell_contemplative_shrine(cells_furn, Vector3(130.8, y_a1, 77.65), mat_stone, mat_rock, mat_bronze, mat_gold, mat_flame, mat_jute, mat_rug_gold, ip_script)
	_build_mumpo_hidden_coin(cells_furn, Vector3(134.95, y_a1, 79.85), mat_rock, mat_bronze, mat_gold, ip_script)
	_build_braided_jute_mat(cells_furn, Vector3(130.8, y_a1 + 0.105, 81.8), Vector2(2.2, 3.8), mat_jute, mat_rug_gold)
	_build_brazier_stand(builder, cells_furn, Vector3(130.8, y_a1, 84.8), mat_iron, mat_bronze, mat_flame, ip_script, fx)
	_build_bound_chest(cells_furn, Vector3(132.8, y_a1, 84.8), -0.35, mat_oak, mat_iron, mat_bronze, ip_script)
	_build_cave_rock_niche(cells_furn, Vector3(127.45, y_a1 + 1.48, 83.0), PI * 0.5, mat_rock, mat_dark_oak, mat_blanket_blue, mat_gold, mat_flame)
	_build_monastic_wall_tapestry(cells_furn, Vector3(135.85, y_a1 + 1.85, 81.6), -PI * 0.5, mat_linen, mat_blanket_ochre, mat_dark_oak, mat_gold)

	# --- B. PLAZA CENTRAL DE A1 ---
	var plaza_furn := Node3D.new()
	plaza_furn.name = "A1_Plaza_Furniture"
	furn_root.add_child(plaza_furn)

	_build_plaza_hearth_and_benches(
		plaza_furn, C.PLAZA_FIRE_POS, mat_stone, mat_dark_oak, mat_oak,
		mat_iron, mat_bronze, mat_flame, mat_linen, mat_blanket_ochre,
		mat_cozy_rug_main, mat_cozy_rug_border, style, ip_script
	)
	_build_plaza_monastic_life_props(plaza_furn, y_a1, mat_oak, mat_dark_oak, mat_stone, mat_pottery, mat_linen, mat_jute, mat_rug_blue, mat_blanket_ochre, ip_script)
	_build_astalagan_shrine_altar(plaza_furn, C.ASTALAGAN_POS, mat_stone, mat_rock, mat_bronze, mat_gold, mat_flame, ip_script)
	_build_monastic_well_fountain(builder, plaza_furn, C.WELL_POS, mat_stone, mat_dark_oak, mat_iron, mat_water, ip_script, fx)

	for bx_plaza in C.CLOISTER_BENCH_XS:
		_build_interactive_bench(plaza_furn, Vector3(float(bx_plaza), y_a1, 89.58), 0.0, mat_oak, mat_dark_oak, mat_stone, "s", "Banco del Claustro", ip_script)

	_build_cloister_pergola_and_table(plaza_furn, C.PERGOLA_POS, mat_dark_oak, mat_oak, mat_pottery, mat_bronze, mat_flame, mat_blanket_ochre, ip_script)
	_build_plaza_supply_corner(plaza_furn, C.SUPPLY_CORNER_POS, mat_oak, mat_dark_oak, mat_iron, mat_linen, ip_script)
	_build_blepp_lookout_post(plaza_furn, C.BLEPP_LOOKOUT_POS, mat_stone, mat_dark_oak, mat_bronze, mat_flame, ip_script)

	# Felpudos tejidos de umbral y faroles bajos de puerta canónicos (en ambos modos, sin invadir el vano libre de 2.2m)
	var mat_lan_glass := StandardMaterial3D.new()
	mat_lan_glass.albedo_color = Color("#ffcf86")
	mat_lan_glass.emission_enabled = true
	mat_lan_glass.emission = style["door_lantern_color"]
	mat_lan_glass.emission_energy_multiplier = 1.65
	mat_lan_glass.roughness = 0.25

	for sp: Dictionary in C.A1_CELLS:
		var rid := int(sp["room_id"])
		var dx := float(sp["door_x"])
		var dm_pos := Vector3(dx, y_a1 + 0.020, 89.62)
		var dm_node := _build_woven_rug_named(plaza_furn, "A1DoorMat_%d" % rid, dm_pos, style["door_mat_size"], mat_door_mat_main, mat_door_mat_border)
		dm_node.set_meta("canonical_id", "a1-door-mat-%d" % rid)

		var dlan := Node3D.new()
		dlan.name = "A1DoorLantern_%d" % rid
		dlan.set_meta("canonical_id", "a1-door-lantern-%d" % rid)
		dlan.position = Vector3(dx + 1.46, y_a1 + 0.02, 89.34)
		plaza_furn.add_child(dlan)
		_cyl(dlan, Vector3(0.0, 0.04, 0.0), 0.12, 0.08, mat_iron)
		var glass := _cyl(dlan, Vector3(0.0, 0.16, 0.0), 0.082, 0.17, mat_lan_glass)
		glass.add_to_group("night_flame")
		_cyl(dlan, Vector3(0.0, 0.27, 0.0), 0.115, 0.055, mat_bronze)
		var dl_light := OmniLight3D.new()
		dl_light.name = "DoorLanternLight_%d" % rid
		dl_light.position = Vector3(0.0, 0.24, 0.14)
		dl_light.light_color = style["door_lantern_color"]
		dl_light.light_energy = float(style["door_lantern_energy"])
		dl_light.omni_range = float(style["door_lantern_range"])
		dlan.add_child(dl_light)
		_register_a1_light(builder, fx, glass, dl_light, float(style["door_lantern_energy"]), 0.06, mat_lan_glass)

# ==============================================================================
# 4. JARDINERAS CANÓNICAS DE A1, BARANDILLA SUR DE CUERDAS Y AO DE CONTACTO A1
# ==============================================================================
static func build_a1_planters(
	builder: Node3D,
	planters_node: Node3D,
	add_planter_cluster: Callable,
	ip_script: Script = null
) -> void:
	var C := cfg()
	var y_a1: float = float(C.ELEV_A1_PLAZA)
	var mat_plaza: Material = builder.get("mat_plaza")
	var mat_upper: Material = builder.get("mat_upper")
	var mat_rock_carved: Material = builder.get("mat_rock_carved")
	var mat_pottery: Material = builder.get("_mat_pottery_glb") if builder.get("_mat_pottery_glb") else builder.get("mat_cloth_warm")
	var mat_bronze: Material = builder.get("mat_bronze")
	var mat_iron: Material = builder.get("mat_iron")
	var mat_wood: Material = builder.get("mat_wood")

	var a1_open_gaps := [86.5, 103.5, 121.5]
	for x_a1 in [74.0, 76.5, 79.0, 81.5, 84.0, 89.2, 92.0, 94.8, 97.5, 100.5, 106.5, 109.5, 112.5, 115.5, 118.5, 124.5, 127.5, 130.5, 133.5]:
		var cnt_a1 := 13 if int(x_a1) % 2 == 0 else 10
		add_planter_cluster.call(Vector3(float(x_a1), 9.30, 97.08), 2.15, cnt_a1, int(x_a1) % 3 != 0)
	for gap_x in a1_open_gaps:
		var gx := float(gap_x)
		var curb := _box(planters_node, Vector3(gx, 9.18, 97.08), Vector3(2.85, 0.34, 0.56), mat_plaza)
		curb.name = "A1SouthParapetCurb_%d" % int(gx)
		for px_g in [gx - 1.38, gx + 1.38]:
			var pier := _box(planters_node, Vector3(px_g, 9.38, 97.08), Vector3(0.32, 0.72, 0.52), mat_upper)
			pier.name = "A1SouthParapetPier_%d_%d" % [int(gx), int(px_g * 10.0)]
	_add_box_collider(planters_node, Vector3(103.8, 9.55, 97.08), Vector3(61.5, 1.30, 0.68))

	for p_idx in range(C.A1_CELLS.size()):
		var px := float(C.A1_CELLS[p_idx]["door_x"])
		for side_s in [-1.0, 1.0]:
			var pot_pos := Vector3(px + side_s * 1.95, y_a1, 89.26)
			var pot_h := 0.52 if side_s < 0.0 else 0.44
			var pot_r := 0.31 if side_s < 0.0 else 0.27
			var pot := _cyl(planters_node, pot_pos + Vector3(0.0, pot_h * 0.5, 0.0), pot_r, pot_h, mat_pottery)
			pot.name = "CavePot_%d_%d" % [p_idx + 1, int(side_s)]
			pot.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
			var rim := _cyl(planters_node, pot_pos + Vector3(0.0, pot_h - 0.03, 0.0), pot_r + 0.035, 0.06, mat_pottery)
			rim.name = "CavePotRim_%d_%d" % [p_idx + 1, int(side_s)]
			_add_cyl_collider(planters_node, pot_pos + Vector3(0.0, 0.38, 0.0), pot_r + 0.04, 0.85)
			add_planter_cluster.call(pot_pos + Vector3(0.0, pot_h, 0.0), 0.58, 11, true)
			var sub_pos := pot_pos + Vector3(side_s * 0.48, 0.0, 0.12)
			var sub := _cyl(planters_node, sub_pos + Vector3(0.0, 0.16, 0.0), 0.21, 0.32, mat_pottery)
			sub.name = "CaveHerbPot_%d_%d" % [p_idx + 1, int(side_s)]
			add_planter_cluster.call(sub_pos + Vector3(0.0, 0.31, 0.0), 0.40, 7, false)

	# Jardineras bajas junto a la roca y matas colgadas asentadas en la repisa de roca (corrige matas flotantes en z=88.55)
	for trough_x in [78.0, 86.2, 95.3, 106.5, 117.8, 126.6, 135.2]:
		var tr_pos := Vector3(float(trough_x), y_a1, 89.08)
		var bed_m := _box(planters_node, tr_pos + Vector3(0.0, 0.16, 0.0), Vector3(1.55, 0.32, 0.56), mat_rock_carved)
		bed_m.name = "A1RockHerbBed_%d" % int(trough_x)
		add_planter_cluster.call(tr_pos + Vector3(0.0, 0.32, 0.0), 1.38, 14, true)
		if float(trough_x) > 84.0 and float(trough_x) < 128.0:
			# Anclado en la repisa real del contrafuerte (y=11.45, z=87.65) para eliminar flotación visual
			add_planter_cluster.call(Vector3(float(trough_x), 11.45, 87.65), 1.32, 8, true)

	for care_x in [79.1, 93.4, 115.6]:
		var c_base := Vector3(float(care_x), y_a1, 89.36)
		var care_node := Node3D.new()
		care_node.name = "MonasticGardenCare_%d" % int(care_x)
		care_node.position = c_base
		planters_node.add_child(care_node)
		var can_parent := care_node
		if int(care_x) == 93:
			can_parent = _routine_pivot(care_node, "RetreatWateringCan", Vector3.ZERO)
		elif int(care_x) == 79:
			can_parent = _routine_pivot(care_node, "RetreatWateringCanSecondary", Vector3.ZERO)
		var can_m := _cyl(can_parent, Vector3(0.0, 0.17, 0.0), 0.14, 0.34, mat_bronze if int(care_x) == 93 else mat_iron)
		can_m.name = "MonasticWateringCan_%d" % int(care_x)
		var spout := _cyl(can_parent, Vector3(0.18, 0.22, 0.04), 0.024, 0.28, mat_bronze if int(care_x) == 93 else mat_iron)
		spout.name = "WateringSpout_%d" % int(care_x)
		spout.rotation.z = -0.78
		var hdl := _box(can_parent, Vector3(-0.14, 0.22, 0.0), Vector3(0.04, 0.22, 0.04), mat_iron)
		hdl.name = "WateringHandle_%d" % int(care_x)
		var pot_a := _cyl(care_node, Vector3(-0.34, 0.12, 0.08), 0.16, 0.24, mat_pottery)
		pot_a.name = "StackedClayPotA_%d" % int(care_x)
		var pot_b := _cyl(care_node, Vector3(-0.34, 0.26, 0.08), 0.14, 0.20, mat_pottery)
		pot_b.name = "StackedClayPotB_%d" % int(care_x)
		var bsk := _cyl(care_node, Vector3(0.36, 0.10, 0.10), 0.22, 0.20, mat_wood)
		bsk.name = "HerbBasket_%d" % int(care_x)
		add_planter_cluster.call(c_base + Vector3(0.36, 0.20, 0.10), 0.34, 5, false)
		var w_ip := _attach_interactive_prop(care_node, ip_script, "watering", "Regadera monástica", "[T] Regar hierbas y flores del claustro")
		if w_ip:
			w_ip.set("interact_radius", 2.15)

static func build_a1_south_parapet_ropes(builder: Node3D, parent: Node3D) -> Node3D:
	var G := geo()
	var mat_wood_dark: Material = builder.get("mat_wood_dark")
	var mat_iron: Material = builder.get("mat_iron")
	var mat_rope: Material = G.create_rope_material(builder)
	var a1_rim: Array[Vector3] = [
		Vector3(73.75, 9.00, 97.08),
		Vector3(76.80, 9.00, 97.08),
		Vector3(81.80, 9.00, 97.08),
		Vector3(85.12, 9.00, 97.08),
		Vector3(87.88, 9.00, 97.08),
		Vector3(92.40, 9.00, 97.08),
		Vector3(96.40, 9.00, 97.08),
		Vector3(100.20, 9.00, 97.08),
		Vector3(102.12, 9.00, 97.08),
		Vector3(104.88, 9.00, 97.08),
		Vector3(108.90, 9.00, 97.08),
		Vector3(113.20, 9.00, 97.08),
		Vector3(117.20, 9.00, 97.08),
		Vector3(120.12, 9.00, 97.08),
		Vector3(122.88, 9.00, 97.08),
		Vector3(126.80, 9.00, 97.08),
		Vector3(130.80, 9.00, 97.08),
		Vector3(134.80, 9.00, 97.08),
		Vector3(138.10, 9.00, 97.08),
		Vector3(140.35, 9.00, 96.92),
	]
	return G.build_perimeter_rope_run(parent, "A1SouthPrecipiceRail", a1_rim, mat_wood_dark, mat_iron, mat_rope, 0.080, 1.08, 0.62, 0.075)

static func build_a1_contact_ao(builder: Node3D, ao_root: Node3D) -> void:
	var C := cfg()
	var y_a1: float = float(C.ELEV_A1_PLAZA) + 0.016
	if builder.has_method("_add_ground_contact_shadow"):
		builder.call("_add_ground_contact_shadow", ao_root, "A1PergolaTableAO", Vector3(123.5, y_a1, 95.0), Vector2(2.65, 1.15), 0.32)
		builder.call("_add_ground_contact_shadow", ao_root, "A1SupplyAO", Vector3(76.85, y_a1, 95.45), Vector2(2.35, 1.45), 0.36)
	else:
		var mat_ao := StandardMaterial3D.new()
		mat_ao.albedo_color = Color(0.05, 0.04, 0.03, 0.34)
		mat_ao.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		mat_ao.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		mat_ao.cull_mode = BaseMaterial3D.CULL_DISABLED
		var p_ao := _box(ao_root, Vector3(123.5, y_a1, 95.0), Vector3(2.65, 0.01, 1.15), mat_ao)
		p_ao.name = "A1PergolaTableAO"
		var s_ao := _box(ao_root, Vector3(76.85, y_a1, 95.45), Vector3(2.35, 0.01, 1.45), mat_ao)
		s_ao.name = "A1SupplyAO"

# ==============================================================================
# 5. MODO RESTRINGIDO A1_CAMP (SOLO A1 + CONTEXTO INMEDIATO + CIERRES DE PLAZA)
# ==============================================================================
static func build_a1_camp_world(builder: Node3D, terrain_data: Dictionary, fx: Node = null) -> Array[Dictionary]:
	var C := cfg()
	var G := geo()
	# 1. Océano y fondo marino inmediato (visible al sur del acantilado)
	builder.call("_build_ocean")
	# 2. Únicamente superficie transitable "a1" (CERO beach/a2/a3/a4/a5/upper/pleamar/observatorio)
	_build_a1_only_surface(builder, terrain_data)
	# 3. Celdas A1 y detalles de Plaza A1 canónicos
	build_a1_cells(builder)
	build_a1_plaza_details(builder)
	# 4. Carga restringida y recortada de GLB (solo arquitectura A1 y roca del acantilado inmediato; NUNCA retreat_landscape_r3.glb)
	_build_a1_camp_glb_context(builder)
	# 5. Mobiliario canónico de las 6 celdas y la plaza
	var furn_root := Node3D.new()
	furn_root.name = "ArtisanFurniture"
	builder.add_child(furn_root)
	build_a1_furniture(builder, furn_root, fx)
	# 6. Bóvedas cutaway, portales, contrafuertes, muro trasero y luces nocturnas A1
	var roofs_root := Node3D.new()
	roofs_root.name = "ExcavatedCaveRoofs"
	builder.add_child(roofs_root)
	var rng := RandomNumberGenerator.new()
	rng.seed = 20261116
	var roof_entries := build_a1_cave_roofs_and_archways(builder, roofs_root, rng, fx)
	# 7. Jardineras exclusivas de A1 + barandilla sur de cuerdas + césped de A1
	_build_a1_only_planters_and_grass(builder, terrain_data)
	# 8. AO de contacto de A1
	var ao_root := Node3D.new()
	ao_root.name = "InteriorContactAO"
	builder.add_child(ao_root)
	build_a1_contact_ao(builder, ao_root)
	# 8b. Corona rocosa norte ligera exclusiva de A1_CAMP (sella la vista del mar detrás del risco a pitch=5° sin instanciar A2-A5)
	_build_a1_camp_north_crown(builder)
	# 9. Cierres físicos y visuales exclusivos de A1_CAMP (verjas oeste y este + colisión de perímetro)
	build_a1_camp_closures(builder, fx)
	return roof_entries

static func _build_a1_camp_north_crown(builder: Node3D) -> void:
	var G := geo()
	var crown_root := Node3D.new()
	crown_root.name = "A1CampNorthCliffCrown"
	builder.add_child(crown_root)

	var mat_cliff: Material = G.create_geological_cliff_material(builder)
	var mat_dark: Material = G.create_dark_basalt_slab_material(builder)
	var plate_mesh: ArrayMesh = G.make_angular_basalt_plate_mesh(913)
	var xfs_moss: Array[Transform3D] = []
	var xfs_dark: Array[Transform3D] = []

	for i in range(15):
		var t := float(i) / 14.0
		var rx := lerpf(50.0, 164.0, t)
		var ry := 15.8 + sin(float(i) * 1.45) * 1.15 + (0.9 if i % 3 == 0 else 0.0)
		var rz := 67.8 + cos(float(i) * 1.85) * 2.1
		var xf := _xf_trs_deg(
			Vector3(rx, ry, rz),
			Vector3(4.5, sin(float(i) * 2.3) * 18.0, -3.5 + float(i % 3) * 2.5),
			Vector3(11.5 + float(i % 2) * 2.4, 7.2 + float(i % 3) * 1.4, 7.6)
		)
		if i % 2 == 0:
			xfs_dark.append(xf)
		else:
			xfs_moss.append(xf)

	_add_static_mm(crown_root, "MM_NorthCrownDark", plate_mesh, mat_dark, xfs_dark, false)
	_add_static_mm(crown_root, "MM_NorthCrownMoss", plate_mesh, mat_cliff, xfs_moss, false)
	# Telón geológico trasero para evitar cualquier rendija hacia el océano norte a pitch 5°
	var back_ridge := _box(crown_root, Vector3(107.0, 18.6, 62.5), Vector3(124.0, 14.5, 2.2), mat_dark, false)
	back_ridge.name = "A1CampNorthBackdropRidge"

static func _build_a1_only_surface(builder: Node3D, terrain_data: Dictionary) -> void:
	var surfaces_node := Node3D.new()
	surfaces_node.name = "Surfaces"
	builder.add_child(surfaces_node)
	var surf_array: Array = terrain_data.get("surfaces", [])
	var mat_plaza: Material = builder.get("mat_plaza")
	for surf in surf_array:
		var sid := str(surf.get("id", ""))
		if sid != "a1":
			continue
		var tiles: Array = surf.get("tiles", [])
		if not tiles.is_empty() and builder.has_method("_build_tiled_surface_mesh"):
			builder.call("_build_tiled_surface_mesh", surfaces_node, "Surface_A1_Plaza", tiles, mat_plaza, 0.14, -9999.0, -0.02)

static func _should_include_glb_in_a1_camp(mesh_name: String) -> bool:
	var C := cfg()
	var low := mesh_name.to_lower()
	for pfx: String in C.A1_CAMP_FORBIDDEN_PREFIXES:
		if low.begins_with(pfx):
			return false
	if low.begins_with("a1room__") or low.begins_with("a1fin__"):
		return false
	if low.begins_with("a1plazaprop__"):
		return "astalagan" in low
	if low.begins_with("a1ctx__"):
		for prop_kw in ["oak-v5", "dark-oak-v5", "linen-v5", "blue-cloth-v5", "red-cloth-v5", "iron-v5", "brass-v5", "pottery-v5", "lamp-glow", "warm-bounce", "contact-shadow"]:
			if prop_kw in low:
				return false
		return true
	if low.begins_with("a1bedrock__"):
		if "painted-foliage-sage" in low:
			return false
		return true
	# Contexto geológico visible inmediato alrededor de A1 (acantilado sur bajo la plaza, hombros E/O y corona trasera)
	if low.begins_with("stones3__") or low.begins_with("p3terrain__") or low.begins_with("v5coast__a1_coastal") or low.begins_with("sal3__a1_coastal") or low.begins_with("sal4__a1_coastal") or low.begins_with("geo11__") or low.begins_with("geo12__") or low.begins_with("sal1__a1_coastal"):
		return true
	return false

static func _build_a1_camp_glb_context(builder: Node3D) -> void:
	var C := cfg()
	var G := geo()
	var geo_root := Node3D.new()
	geo_root.name = "BabylonGeography"
	builder.add_child(geo_root)
	_load_glb_filtered_a1(builder, "res://assets/retreat-modules/retreat_geography_stone.glb", geo_root, {}, C.A1_CAMP_CLIP_MIN, C.A1_CAMP_CLIP_MAX, G)

	var arch_root := Node3D.new()
	arch_root.name = "BabylonArchitecture"
	builder.add_child(arch_root)
	var zone_targets := {
		"A1Bedrock": builder.get_node_or_null("A1_Cells"),
		"A1PlazaProp": builder.get_node_or_null("A1_PlazaDetails"),
	}
	_load_glb_filtered_a1(builder, "res://assets/retreat-modules/retreat_architecture_canon.glb", arch_root, zone_targets, C.A1_CAMP_CLIP_MIN, C.A1_CAMP_CLIP_MAX, G)

static func _load_glb_filtered_a1(builder: Node3D, res_path: String, default_parent: Node3D, prefix_targets: Dictionary, clip_min: Vector3, clip_max: Vector3, G: GDScript) -> void:
	if not FileAccess.file_exists(res_path):
		return
	var bytes := FileAccess.get_file_as_bytes(res_path)
	if bytes.is_empty():
		return
	var doc := GLTFDocument.new()
	var state := GLTFState.new()
	if doc.append_from_buffer(bytes, "", state) != OK:
		return
	var scene_root := doc.generate_scene(state)
	if not scene_root:
		return

	var meshes: Array[MeshInstance3D] = []
	_collect_meshes(scene_root, meshes)
	for m_inst in meshes:
		var old_parent := m_inst.get_parent()
		if old_parent:
			old_parent.remove_child(m_inst)
		m_inst.owner = null
		if not _should_include_glb_in_a1_camp(m_inst.name):
			m_inst.free()
			continue
		var low := m_inst.name.to_lower()
		# A1PlazaProp Astalagan conserva su malla completa y se eleva sobre su pedestal canónico
		if "astalagan-weathered-stone" in low:
			var ast_pivot := Vector3(86.25, 9.00, 92.38)
			var ast_target := Vector3(85.80, 9.54, 93.35)
			var ast_scale := Vector3(1.16, 1.20, 1.16)
			m_inst.scale = ast_scale
			m_inst.position = ast_target - Vector3(ast_pivot.x * ast_scale.x, ast_pivot.y * ast_scale.y, ast_pivot.z * ast_scale.z)
		elif not low.begins_with("a1ctx__") and not low.begins_with("a1bedrock__"):
			if not G.clip_mesh_to_aabb(m_inst, clip_min, clip_max):
				m_inst.free()
				continue

		if builder.has_method("_apply_babylon_material"):
			builder.call("_apply_babylon_material", m_inst)
		if low.begins_with("a1bedrock__"):
			m_inst.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		if "cell-floor" in low:
			m_inst.position.y -= 0.06
		if low == "a1ctx__a1:plaza-v6" or low == "a1ctx__a1:coastal-cliff-v10":
			m_inst.create_trimesh_collision()

		var target_parent: Node3D = default_parent
		var parts := m_inst.name.split("__", false, 1)
		if parts.size() >= 1 and prefix_targets.has(parts[0]) and prefix_targets[parts[0]] != null:
			target_parent = prefix_targets[parts[0]]
		target_parent.add_child(m_inst)

	scene_root.free()

static func _build_a1_only_planters_and_grass(builder: Node3D, _terrain_data: Dictionary) -> void:
	var G := geo()
	var planters_node := Node3D.new()
	planters_node.name = "LushPlanters"
	builder.add_child(planters_node)

	var shrub_xf: Array[Transform3D] = []
	var shrub_col: Array[Color] = []
	var ivy_xf: Array[Transform3D] = []
	var flower_xf: Array[Transform3D] = []
	var flower_col: Array[Color] = []

	var rng := RandomNumberGenerator.new()
	rng.seed = 987654
	var green_palette: Array[Color] = [
		Color("#3f5434"), Color("#4d613c"), Color("#5b6e47"), Color("#677652"), Color("#475939")
	]
	var flower_palette: Array[Color] = [
		Color("#f8f5ec"), Color("#f2ece0"), Color("#9a7bc8"), Color("#896bb8"), Color("#e5d57e"), Color("#d8869a"), Color("#f6f2e6")
	]

	var add_planter_cluster := func(center: Vector3, span_x: float, count: int, with_ivy: bool) -> void:
		for _i in range(count):
			var ox := rng.randf_range(-span_x * 0.45, span_x * 0.45)
			var oz := rng.randf_range(-0.22, 0.22)
			var sc := rng.randf_range(0.45, 0.76)
			var b := Basis.from_euler(Vector3(rng.randf_range(-0.14, 0.14), rng.randf_range(0.0, TAU), rng.randf_range(-0.14, 0.14)))
			b = b.scaled(Vector3(sc * 1.10, sc * 1.00, sc * 1.10))
			shrub_xf.append(Transform3D(b, center + Vector3(ox, 0.04, oz)))
			shrub_col.append(green_palette[rng.randi() % green_palette.size()])
			for _fl in range(2):
				if rng.randf() < 0.80:
					var fc: Color = flower_palette[rng.randi() % flower_palette.size()]
					var fsc := rng.randf_range(0.22, 0.36)
					var fb := Basis.from_euler(Vector3(0.0, rng.randf_range(0.0, TAU), 0.0)).scaled(Vector3(fsc, fsc, fsc))
					flower_xf.append(Transform3D(fb, center + Vector3(ox + rng.randf_range(-0.15, 0.15), sc * 0.40 + 0.06, oz + rng.randf_range(-0.14, 0.14))))
					flower_col.append(fc)
		if with_ivy:
			var strand_count := maxi(4, int(round(span_x * 3.0)))
			for j in range(strand_count):
				var ix := lerpf(-span_x * 0.45, span_x * 0.45, float(j) / float(maxi(1, strand_count - 1))) + rng.randf_range(-0.06, 0.06)
				var drop := rng.randf_range(0.50, 0.92)
				var ib := Basis.from_euler(Vector3(0.04, rng.randf_range(-0.18, 0.18), rng.randf_range(-0.08, 0.08)))
				ib = ib.scaled(Vector3(0.42, drop, 0.36))
				ivy_xf.append(Transform3D(ib, center + Vector3(ix, -0.02, 0.24)))

	build_a1_planters(builder, planters_node, add_planter_cluster, null)
	build_a1_south_parapet_ropes(builder, planters_node)

	# 14 jardineras pétreas canónicas del borde sur de A1 (paridad exacta con El Retiro sin cargar retreat_landscape_r3.glb de 1.33M tris)
	var C := cfg()
	var trough_box_xfs: Array[Transform3D] = []
	var trough_soil_xfs: Array[Transform3D] = []
	for tsp: Array in C.A1_SOUTH_RIM_TROUGHS:
		var tcx := float(tsp[0])
		var tw := float(tsp[1])
		trough_box_xfs.append(_xf_trs(Vector3(tcx, 9.28, 98.55), Vector3.ZERO, Vector3(tw, 0.56, 0.66)))
		trough_soil_xfs.append(_xf_trs(Vector3(tcx, 9.575, 98.55), Vector3.ZERO, Vector3(tw - 0.14, 0.04, 0.48)))
		add_planter_cluster.call(Vector3(tcx, 9.58, 98.55), tw * 0.88, 9, true)
	var unit_box := BoxMesh.new()
	unit_box.size = Vector3.ONE
	var mat_trough_stone: Material = builder.get("mat_rock_dark") if builder.get("mat_rock_dark") else builder.get("mat_rock_carved")
	var mat_trough_soil: Material = builder.get("_mat_earth_glb") if builder.get("_mat_earth_glb") else _make_mat(builder, Color("#4a3f2f"), 0.94, 0.0)
	_add_static_mm(planters_node, "MM_A1RimPlanterBoxes", unit_box, mat_trough_stone, trough_box_xfs, true)
	_add_static_mm(planters_node, "MM_A1RimPlanterSoil", unit_box, mat_trough_soil, trough_soil_xfs, false)

	# Césped y helechos del borde sur de A1 (paridad con VibrantMeadowsAndPlanters del Retiro)
	var tuft_xf: Array[Transform3D] = []
	var tuft_col: Array[Color] = []
	var fern_xf: Array[Transform3D] = []
	var fern_col: Array[Color] = []
	var grass_tones: Array[Color] = [Color("#4a5e39"), Color("#556b41"), Color("#62774b"), Color("#405231"), Color("#6d7d52")]
	var fern_tones: Array[Color] = [Color("#364a2d"), Color("#425636"), Color("#4d623f"), Color("#2f4127")]
	var rng_g := RandomNumberGenerator.new()
	rng_g.seed = 20261117
	for gx_step in range(38):
		var wx := lerpf(74.4, 134.0, float(gx_step) / 37.0)
		var wz := 97.25 + rng_g.randf_range(-0.35, 0.55)
		for _k in range(2):
			var gsc := rng_g.randf_range(0.55, 0.96)
			var gb := Basis.from_euler(Vector3(rng_g.randf_range(-0.08, 0.08), rng_g.randf_range(0.0, TAU), rng_g.randf_range(-0.08, 0.08))).scaled_local(Vector3(gsc, gsc * rng_g.randf_range(0.85, 1.2), gsc))
			tuft_xf.append(Transform3D(gb, Vector3(wx + rng_g.randf_range(-0.55, 0.55), 9.02, wz + rng_g.randf_range(-0.35, 0.35))))
			tuft_col.append(grass_tones[rng_g.randi() % grass_tones.size()])
		if rng_g.randf() < 0.42:
			var fsc := rng_g.randf_range(0.52, 0.88)
			var fb := Basis.from_euler(Vector3(0.0, rng_g.randf_range(0.0, TAU), 0.0)).scaled_local(Vector3(fsc, fsc, fsc))
			fern_xf.append(Transform3D(fb, Vector3(wx + rng_g.randf_range(-0.4, 0.4), 9.04, 97.65 + rng_g.randf_range(-0.25, 0.25))))
			fern_col.append(fern_tones[rng_g.randi() % fern_tones.size()])

	var planter_foliage_mat := _make_mat(builder, Color.WHITE, 0.88, 0.0)
	planter_foliage_mat.vertex_color_use_as_albedo = true
	planter_foliage_mat.vertex_color_is_srgb = true
	planter_foliage_mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	planter_foliage_mat.backlight_enabled = true
	planter_foliage_mat.backlight = Color(0.09, 0.14, 0.06)
	var planter_ivy_mat := _make_mat(builder, Color("#3e5434"), 0.88, 0.0)
	planter_ivy_mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	planter_ivy_mat.backlight_enabled = true
	planter_ivy_mat.backlight = Color(0.08, 0.13, 0.05)
	var planter_flower_mat := _make_mat(builder, Color.WHITE, 0.72, 0.0)
	planter_flower_mat.vertex_color_use_as_albedo = true
	planter_flower_mat.vertex_color_is_srgb = true
	planter_flower_mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	var grass_mat := StandardMaterial3D.new()
	grass_mat.vertex_color_use_as_albedo = true
	grass_mat.vertex_color_is_srgb = true
	grass_mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	grass_mat.roughness = 0.78
	grass_mat.backlight_enabled = true
	grass_mat.backlight = Color(0.11, 0.17, 0.07)

	_add_colored_mm(planters_node, "MM_PlanterFoliage", G.make_botanical_shrub_mesh(), planter_foliage_mat, shrub_xf, shrub_col)
	_add_colored_mm(planters_node, "MM_PlanterIvy", G.make_hanging_ivy_mesh(), planter_ivy_mat, ivy_xf, [])
	_add_colored_mm(planters_node, "MM_PlanterFlowers", G.make_blossom_cluster_mesh(), planter_flower_mat, flower_xf, flower_col)
	_add_colored_mm(planters_node, "MM_A1VergeGrass", G.make_grass_tuft_mesh(), grass_mat, tuft_xf, tuft_col)
	_add_colored_mm(planters_node, "MM_A1VergeFerns", G.make_fern_cluster_mesh(), grass_mat, fern_xf, fern_col)

# ==============================================================================
# 6. CIERRES EXCLUSIVOS DE MODO A1_CAMP (VERJAS MONÁSTICAS DISCRETAS + COLISIÓN)
# ==============================================================================
static func build_a1_camp_closures(builder: Node3D, fx: Node = null) -> Node3D:
	var C := cfg()
	var G := geo()
	var closures_root := Node3D.new()
	closures_root.name = "A1CampClosures"
	closures_root.set_meta("camp_only_closure", true)
	builder.add_child(closures_root)

	var mat_stone: Material = G.create_weathered_ashlar_material(builder, Color("#c4bba8"))
	var mat_wood_dark: Material = builder.get("mat_wood_dark")
	var mat_wood: Material = builder.get("mat_wood")
	var mat_iron: Material = builder.get("mat_iron")
	var mat_bronze: Material = builder.get("mat_bronze")
	var mat_rope: Material = G.create_rope_material(builder)
	var mat_flame: Material = builder.get("mat_flame")

	for side_key: String in ["west", "east"]:
		var spec: Dictionary = C.A1_CAMP_CLOSURES[side_key]
		var gnode := Node3D.new()
		gnode.name = str(spec["name"])
		gnode.set_meta("camp_only_closure", true)
		gnode.set_meta("closure_side", side_key)
		var gx := float(spec["x"])
		var gy := float(spec["y"])
		var zn := float(spec["z_north"])
		var zs := float(spec["z_south"])
		var wn := float(spec["wing_north_z"])
		var ws := float(spec["wing_south_z"])
		var mid_z := (zn + zs) * 0.5
		var span_z := zs - zn
		gnode.position = Vector3(gx, gy, mid_z)
		closures_root.add_child(gnode)

		var half_span := span_z * 0.5
		var stone_xfs: Array[Transform3D] = []
		var wood_xfs: Array[Transform3D] = []
		var iron_box_xfs: Array[Transform3D] = []
		var iron_cyl_xfs: Array[Transform3D] = []
		var bronze_cyl_xfs: Array[Transform3D] = []

		# Dos pilastras de sillería tallada con zócalo y capitel flanqueando el paso
		for p_sign in [-1.0, 1.0]:
			var pz := float(p_sign) * half_span
			stone_xfs.append(_xf_trs(Vector3(0.0, 0.14, pz), Vector3.ZERO, Vector3(0.64, 0.28, 0.64)))
			stone_xfs.append(_xf_trs(Vector3(0.0, 0.78, pz), Vector3.ZERO, Vector3(0.50, 1.08, 0.50)))
			stone_xfs.append(_xf_trs(Vector3(0.0, 1.38, pz), Vector3.ZERO, Vector3(0.62, 0.14, 0.62)))
			stone_xfs.append(_xf_trs(Vector3(0.0, 1.48, pz), Vector3.ZERO, Vector3(0.46, 0.10, 0.46)))

		# Farol de hierro discreto sobre el pilar norte de cada verja
		var lan_z := -half_span
		iron_cyl_xfs.append(_xf_trs(Vector3(0.0, 1.62, lan_z), Vector3.ZERO, Vector3(0.22, 0.16, 0.22)))
		var g_flm := _box(gnode, Vector3(0.0, 1.72, lan_z), Vector3(0.12, 0.17, 0.12), mat_flame)
		g_flm.add_to_group("night_flame")
		iron_cyl_xfs.append(_xf_trs(Vector3(0.0, 1.85, lan_z), Vector3.ZERO, Vector3(0.28, 0.06, 0.28)))
		var gl := OmniLight3D.new()
		gl.name = "%s_LanternLight" % str(spec["name"])
		gl.position = Vector3(float(spec["facing_sign"]) * 0.45, 1.80, lan_z)
		gl.light_color = Color(1.0, 0.70, 0.34)
		gl.light_energy = 1.05
		gl.omni_range = 6.5
		gnode.add_child(gl)
		_register_a1_light(builder, fx, g_flm, gl, 1.05, 0.06)

		# Doble hoja cerrada de verja monástica (marco de roble oscuro + barrotes de hierro forjado + cadena central)
		var leaf_span := (span_z - 0.56) * 0.5
		for l_sign in [-1.0, 1.0]:
			var l_center := float(l_sign) * (leaf_span * 0.5 + 0.03)
			wood_xfs.append(_xf_trs(Vector3(0.0, 1.18, l_center), Vector3.ZERO, Vector3(0.10, 0.09, leaf_span)))
			wood_xfs.append(_xf_trs(Vector3(0.0, 0.68, l_center), Vector3.ZERO, Vector3(0.09, 0.08, leaf_span)))
			wood_xfs.append(_xf_trs(Vector3(0.0, 0.24, l_center), Vector3.ZERO, Vector3(0.10, 0.09, leaf_span)))
			for end_s in [-1.0, 1.0]:
				wood_xfs.append(_xf_trs(Vector3(0.0, 0.72, l_center + float(end_s) * (leaf_span * 0.46)), Vector3.ZERO, Vector3(0.11, 1.12, 0.09)))
			var bar_cnt := 6
			for bi in range(bar_cnt):
				var bz := l_center + lerpf(-leaf_span * 0.38, leaf_span * 0.38, float(bi) / float(bar_cnt - 1))
				iron_cyl_xfs.append(_xf_trs(Vector3(0.0, 0.72, bz), Vector3.ZERO, Vector3(0.044, 1.04, 0.044)))
				bronze_cyl_xfs.append(_xf_trs(Vector3(0.0, 1.27, bz), Vector3.ZERO, Vector3(0.056, 0.10, 0.056)))

		# Cadena de hierro forjado y pasador de bronce cerrando el encuentro central
		iron_box_xfs.append(_xf_trs(Vector3(0.0, 0.74, 0.0), Vector3.ZERO, Vector3(0.16, 0.14, 0.30)))
		bronze_cyl_xfs.append(_xf_trs(Vector3(float(spec["facing_sign"]) * 0.08, 0.68, 0.0), Vector3.ZERO, Vector3(0.11, 0.12, 0.11)))
		for ci in range(5):
			var ct := float(ci) / 4.0
			var cz_c := lerpf(-0.34, 0.34, ct)
			var cy_c := 0.72 - sin(ct * PI) * 0.12
			iron_box_xfs.append(_xf_trs(Vector3(float(spec["facing_sign"]) * 0.07, cy_c, cz_c), Vector3.ZERO, Vector3(0.035, 0.045, 0.09)))

		# Cierre lateral corto de murete bajo + cabo hasta el acantilado norte y el pretil sur
		var n_wing_len := absf(zn - wn)
		if n_wing_len > 0.25:
			var nz_mid := ((wn + zn) * 0.5) - mid_z
			stone_xfs.append(_xf_trs(Vector3(0.0, 0.32, nz_mid), Vector3.ZERO, Vector3(0.42, 0.64, n_wing_len)))
			_box(gnode, Vector3(0.0, 0.86, nz_mid), Vector3(0.05, 0.05, n_wing_len), mat_rope)
		var s_wing_len := absf(ws - zs)
		if s_wing_len > 0.25:
			var sz_mid := ((zs + ws) * 0.5) - mid_z
			stone_xfs.append(_xf_trs(Vector3(0.0, 0.32, sz_mid), Vector3.ZERO, Vector3(0.42, 0.64, s_wing_len)))
			_box(gnode, Vector3(0.0, 0.86, sz_mid), Vector3(0.05, 0.05, s_wing_len), mat_rope)

		var u_box := BoxMesh.new()
		u_box.size = Vector3.ONE
		var u_cyl := CylinderMesh.new()
		u_cyl.top_radius = 0.5; u_cyl.bottom_radius = 0.5; u_cyl.height = 1.0; u_cyl.radial_segments = 8
		_add_static_mm(gnode, "MM_GateStone", u_box, mat_stone, stone_xfs, true)
		_add_static_mm(gnode, "MM_GateWood", u_box, mat_wood_dark, wood_xfs, true)
		_add_static_mm(gnode, "MM_GateIronBoxes", u_box, mat_iron, iron_box_xfs, false)
		_add_static_mm(gnode, "MM_GateIronBars", u_cyl, mat_iron, iron_cyl_xfs, false)
		_add_static_mm(gnode, "MM_GateBronze", u_cyl, mat_bronze, bronze_cyl_xfs, false)

		# Colisión sólida alineada a todo el ancho de la salida (impide salir de la plaza en modo campamento)
		var total_block_z := absf(ws - wn) + 1.2
		var block_mid_z := ((wn + ws) * 0.5) - mid_z
		_add_box_collider(gnode, Vector3(0.0, 1.35, block_mid_z), Vector3(0.68, 2.70, total_block_z))
		_tag_camera_occluder(gnode)

	# Peñascos costeros discretos más allá de las verjas cerradas (suavizan el remate visual de las sendas exteriores)
	var flank_mesh: ArrayMesh = G.make_angular_basalt_plate_mesh(607)
	var flank_mat: Material = G.create_geological_cliff_material(builder)
	var flank_xfs: Array[Transform3D] = [
		_xf_trs_deg(Vector3(65.2, 8.85, 92.2), Vector3(6.0, 22.0, -4.0), Vector3(3.2, 2.1, 2.8)),
		_xf_trs_deg(Vector3(66.4, 8.75, 96.4), Vector3(-4.0, -18.0, 5.0), Vector3(2.4, 1.4, 2.2)),
		_xf_trs_deg(Vector3(147.8, 8.85, 91.6), Vector3(5.0, -24.0, 4.0), Vector3(3.4, 2.2, 2.9)),
		_xf_trs_deg(Vector3(146.6, 8.75, 95.8), Vector3(-5.0, 16.0, -4.0), Vector3(2.5, 1.45, 2.3)),
	]
	_add_static_mm(closures_root, "MM_ClosureFlankOutcrops", flank_mesh, flank_mat, flank_xfs, true)

	return closures_root

# ==============================================================================
# 7. MANIFIESTO DETERMINISTA DE A1 PARA PRUEBAS AUTOMATIZADAS DE PARIDAD
# ==============================================================================
static func collect_a1_manifest(root_node: Node3D, origin_offset: Vector3 = Vector3.ZERO) -> Dictionary:
	var C := cfg()
	var rooms := {}
	var key_nodes := {}
	var cutaways := {}
	var outer_found: Array[String] = []
	var closures_found: Array[String] = []

	var check_names := [
		"A1_Cells", "A1_PlazaDetails", "A1_Campfire", "A1_Dragon_Statue",
		"A1_ExcavatedCliffMass", "A1_PermanentBackCliffWall", "A1_NightLightingRig",
		"A1_Cells_Furniture", "A1_Plaza_Furniture",
		"PlazaHearthRing", "PlazaBenchWest", "PlazaBenchEast",
		"A1CozyRug_PlazaBenchWest", "A1CozyRug_PlazaBenchEast",
		"AstalaganCircularPedestal", "MonasticFountainWell",
		"CloisterRefreshmentTable", "HearthFirewoodStack", "BleppLookoutPost",
	]
	for i in range(1, 7):
		check_names.append("A1DoorMat_%d" % i)
		check_names.append("A1DoorLantern_%d" % i)
		check_names.append("CellDoor_cell_%d" % i)

	for cname: String in check_names:
		var found := root_node.find_child(cname, true, false) as Node3D
		if found == null and cname == "A1_Dragon_Statue":
			found = root_node.find_child("AstalaganStatue", true, false) as Node3D
		if found != null:
			var rel_pos := _relative_pos(found, root_node) - origin_offset
			key_nodes[cname] = {
				"present": true,
				"pos": [snappedf(rel_pos.x, 0.02), snappedf(rel_pos.y, 0.02), snappedf(rel_pos.z, 0.02)],
			}

	for cdef: Dictionary in C.A1_CELLS:
		var cid := str(cdef["id"])
		var bname := str(cdef["bed_node_name"])
		var bnode := root_node.find_child(bname, true, false) as Node3D
		var rnode := root_node.find_child("CaveRoof_" + cid, true, false) as Node3D
		if rnode == null:
			rnode = root_node.find_child("CutawayRoof_" + str(cdef["camp_key"]), true, false) as Node3D
		rooms[cid] = {
			"bed_present": bnode != null,
			"bed_canonical_id": str(bnode.get_meta("canonical_id", "")) if bnode else "",
			"bed_pos": [
				snappedf((_relative_pos(bnode, root_node) - origin_offset).x, 0.02),
				snappedf((_relative_pos(bnode, root_node) - origin_offset).y, 0.02),
				snappedf((_relative_pos(bnode, root_node) - origin_offset).z, 0.02),
			] if bnode else [],
			"roof_present": rnode != null,
		}
		if rnode:
			cutaways[cid] = true

	for out_name: String in C.FORBIDDEN_OUTER_NODES_IN_CAMP:
		if root_node.find_child(out_name, true, false) != null:
			outer_found.append(out_name)

	var cl_root := root_node.find_child("A1CampClosures", true, false)
	if cl_root != null:
		for ch in cl_root.get_children():
			closures_found.append(ch.name)

	# Firma de estilo canónico (para verificar sincronización automática de materiales)
	var bench_rug_color := ""
	var wr := root_node.find_child("A1CozyRug_PlazaBenchWest", true, false)
	if wr and wr.get_child_count() >= 2 and wr.get_child(1) is MeshInstance3D:
		var m := (wr.get_child(1) as MeshInstance3D).material_override
		if m is StandardMaterial3D:
			bench_rug_color = (m as StandardMaterial3D).albedo_color.to_html(false)

	return {
		"style_version": str(C.STYLE_TUNING.get("version", "")),
		"bench_rug_color": bench_rug_color,
		"key_nodes": key_nodes,
		"rooms": rooms,
		"cutaway_count": cutaways.size(),
		"outer_nodes_present": outer_found,
		"camp_closures": closures_found,
	}

static func _relative_pos(node: Node3D, ancestor: Node3D) -> Vector3:
	var p := Vector3.ZERO
	var cur: Node = node
	while cur != null and cur != ancestor:
		if cur is Node3D:
			p = (cur as Node3D).transform * p
		cur = cur.get_parent()
	return p

# ==============================================================================
# HELPERS INTERNOS DE MOBILIARIO A1 (PARIDAD 1:1 CON RETIRO DEL DRAGÓN)
# ==============================================================================
static func _register_a1_light(builder: Node3D, fx: Node, flame_node: Node3D, light: OmniLight3D, base_energy: float, flicker_amp: float, glass_mat: StandardMaterial3D = null) -> void:
	if builder != null and builder.has_method("register_flame_fx"):
		builder.call("register_flame_fx", flame_node, light, false)
	if fx != null and fx.has_method("register_lantern") and light != null:
		fx.call("register_lantern", light, glass_mat, base_energy, flicker_amp, 1.55)

static func _build_woven_rug_named(parent: Node3D, rug_name: String, pos: Vector3, size: Vector2, mat_main: Material, mat_border: Material) -> Node3D:
	var r := Node3D.new()
	r.name = rug_name
	r.position = pos
	parent.add_child(r)
	_box(r, Vector3.ZERO, Vector3(size.x, 0.022, size.y), mat_border)
	_box(r, Vector3(0.0, 0.007, 0.0), Vector3(size.x * 0.84, 0.022, size.y * 0.84), mat_main)
	return r

static func _build_pilgrim_bed(parent: Node3D, pos: Vector3, yaw: float, mat_frame: Material, mat_sheet: Material, mat_blanket: Material, canonical_id: String, ip_script: Script) -> void:
	var bed := Node3D.new()
	bed.name = "PilgrimBed_%d_%d" % [int(pos.x), int(pos.z)]
	bed.position = pos
	bed.rotation.y = yaw
	bed.set_meta("canonical_id", canonical_id)
	bed.set_meta("rest_head", Vector3(0.0, 0.681, -0.84))
	bed.set_meta("rest_bedding", 0.622)
	bed.set_meta("rest_foot", 1.02)
	bed.set_meta("rest_width", 1.12)
	parent.add_child(bed)
	_box(bed, Vector3(0.0, 0.28, 0.0), Vector3(1.22, 0.22, 2.15), mat_frame)
	_box(bed, Vector3(0.0, 0.68, -1.02), Vector3(1.24, 0.78, 0.12), mat_frame)
	_box(bed, Vector3(0.0, 0.48, 1.02), Vector3(1.24, 0.44, 0.10), mat_frame)
	for dx in [-0.56, 0.56]:
		for dz in [-1.02, 1.02]:
			_cyl(bed, Vector3(dx, 0.52, dz), 0.07, 1.04, mat_frame)
	_box(bed, Vector3(0.0, 0.45, 0.0), Vector3(1.10, 0.20, 1.94), mat_sheet)
	_box(bed, Vector3(0.0, 0.59, -0.72), Vector3(0.86, 0.14, 0.38), mat_sheet)
	_box(bed, Vector3(0.0, 0.48, 0.32), Vector3(1.14, 0.22, 1.22), mat_blanket)
	var throw_fold := _box(bed, Vector3(0.32, 0.49, 0.52), Vector3(0.66, 0.24, 0.76), mat_blanket)
	throw_fold.rotation.y = 0.08
	_add_box_collider(bed, Vector3(0.0, 0.52, 0.0), Vector3(1.26, 1.04, 2.20))
	var ip := _attach_interactive_prop(bed, ip_script, "bed", "Camastro de peregrino", "[T] Tumbarse a descansar", Vector3(0.0, 0.54, 0.05), "s")
	if ip:
		ip.set("interact_radius", 2.65)

static func _build_guest_bedroll(parent: Node3D, pos: Vector3, yaw: float, mat_mat: Material, mat_blanket: Material, mat_pillow: Material, label: String, ip_script: Script) -> void:
	var br := Node3D.new()
	br.name = "GuestBedroll_%d_%d" % [int(pos.x * 10.0), int(pos.z * 10.0)]
	br.position = pos
	br.rotation.y = yaw
	br.set_meta("rest_head", Vector3(0.0, 0.27, -0.82))
	br.set_meta("rest_bedding", 0.215)
	br.set_meta("rest_foot", 0.96)
	br.set_meta("rest_width", 0.84)
	parent.add_child(br)
	_box(br, Vector3(0.0, 0.08, 0.0), Vector3(0.92, 0.06, 1.92), mat_mat)
	_box(br, Vector3(0.0, 0.13, 0.20), Vector3(0.88, 0.08, 1.28), mat_blanket)
	_box(br, Vector3(0.0, 0.16, -0.70), Vector3(0.66, 0.12, 0.30), mat_pillow)
	var ip := _attach_interactive_prop(br, ip_script, "bed", label, "[T] Tumbarse en petate", Vector3(0.0, 0.20, 0.0), "s")
	if ip:
		ip.set("interact_radius", 2.45)

static func _build_nightstand_with_candle(parent: Node3D, pos: Vector3, mat_wood: Material, mat_brass: Material, mat_flame: Material) -> void:
	var ns := Node3D.new()
	ns.position = pos
	parent.add_child(ns)
	_box(ns, Vector3(0.0, 0.38, 0.0), Vector3(0.62, 0.76, 0.56), mat_wood)
	_box(ns, Vector3(0.0, 0.78, 0.0), Vector3(0.68, 0.06, 0.62), mat_wood)
	_cyl(ns, Vector3(0.0, 0.84, 0.0), 0.09, 0.06, mat_brass)
	_cyl(ns, Vector3(0.0, 0.94, 0.0), 0.035, 0.16, mat_flame)
	_add_box_collider(ns, Vector3(0.0, 0.45, 0.0), Vector3(0.68, 0.90, 0.62))

static func _build_monastic_desk_and_chair(parent: Node3D, pos: Vector3, yaw: float, mat_wood: Material, mat_dark: Material, mat_paper: Material, mat_brass: Material, ip_script: Script) -> void:
	var d := Node3D.new()
	d.position = pos
	d.rotation.y = yaw
	parent.add_child(d)
	_box(d, Vector3(0.0, 0.78, 0.0), Vector3(1.52, 0.09, 0.84), mat_wood)
	for dx in [-0.64, 0.64]:
		_box(d, Vector3(dx, 0.39, 0.0), Vector3(0.13, 0.78, 0.70), mat_dark)
	var paper := _box(d, Vector3(-0.12, 0.835, 0.04), Vector3(0.46, 0.02, 0.34), mat_paper)
	if absf(pos.x - 113.6) < 0.08 and absf(pos.y - 9.0) < 0.1:
		_routine_target(paper, "RetreatWorkshopPaper")
	_cyl(d, Vector3(-0.48, 0.90, -0.18), 0.095, 0.16, mat_paper)
	_cyl(d, Vector3(-0.48, 1.00, -0.18), 0.048, 0.08, mat_paper)
	_cyl(d, Vector3(-0.48, 1.04, -0.18), 0.064, 0.025, mat_brass)
	_box(d, Vector3(-0.56, 0.95, -0.18), Vector3(0.05, 0.12, 0.025), mat_dark)
	_cyl(d, Vector3(-0.22, 0.86, -0.16), 0.095, 0.07, mat_dark)
	_cyl(d, Vector3(-0.22, 0.88, -0.16), 0.078, 0.04, mat_brass)
	var codex := _box(d, Vector3(0.22, 0.855, 0.14), Vector3(0.32, 0.06, 0.24), mat_dark)
	codex.rotation.y = 0.14
	var pages := _box(d, Vector3(0.22, 0.855, 0.145), Vector3(0.30, 0.044, 0.22), mat_paper)
	pages.rotation.y = 0.14
	_cyl(d, Vector3(0.42, 0.84, -0.15), 0.095, 0.03, mat_brass)
	_cyl(d, Vector3(0.42, 0.92, -0.15), 0.038, 0.15, mat_paper)
	_cyl(d, Vector3(0.0, 0.46, 0.72), 0.27, 0.065, mat_wood)
	_cyl(d, Vector3(0.0, 0.43, 0.72), 0.23, 0.04, mat_dark)
	for sx in [-0.17, 0.17]:
		for sz in [0.55, 0.89]:
			var s_leg := _cyl(d, Vector3(sx, 0.22, sz), 0.038, 0.44, mat_dark)
			s_leg.rotation = Vector3((sz - 0.72) * 0.35, 0.0, -sx * 0.35)
	_box(d, Vector3(0.0, 0.16, 0.56), Vector3(0.32, 0.035, 0.035), mat_dark)
	_box(d, Vector3(0.0, 0.16, 0.88), Vector3(0.32, 0.035, 0.035), mat_dark)
	_add_box_collider(d, Vector3(0.0, 0.50, 0.0), Vector3(1.55, 1.00, 0.86))
	_add_box_collider(d, Vector3(0.0, 0.32, 0.72), Vector3(0.56, 0.64, 0.56))
	_attach_interactive_prop(d, ip_script, "table", "Escritorio de estudio", "[T] Examinar escritorio", Vector3.ZERO, "n", "Revisas los pergaminos y notas manuscritas sobre el escritorio.")
	var chair_anchor := Node3D.new()
	chair_anchor.name = "DeskChairAnchor"
	chair_anchor.position = Vector3(0.0, 0.0, 0.72)
	d.add_child(chair_anchor)
	var stool_slots: Array[Vector3] = [Vector3(0.0, 0.495, 0.0)]
	_attach_seat_prop(chair_anchor, ip_script, "chair", "Taburete monástico", "[T] Sentarse en taburete", stool_slots, Vector3(0.0, 0.0, -1.0), 0.26, "n" if is_zero_approx(yaw) else "e", false, 2.2)

static func _build_kobold_hammock(parent: Node3D, pos: Vector3, yaw: float, mat_wood: Material, mat_cloth: Material, mat_pillow: Material, canonical_id: String, ip_script: Script) -> void:
	var h := Node3D.new()
	h.name = "KoboldHammock_%d_%d" % [int(pos.x * 10.0), int(pos.z * 10.0)]
	h.position = pos
	h.rotation.y = yaw
	if not canonical_id.is_empty():
		h.set_meta("canonical_id", canonical_id)
	h.set_meta("rest_head", Vector3(0.0, 0.708, -0.75))
	h.set_meta("rest_bedding", 0.556)
	h.set_meta("rest_pillow_end", -0.48)
	h.set_meta("rest_foot", 0.96)
	h.set_meta("rest_width", 0.86)
	parent.add_child(h)
	for dz in [-1.05, 1.05]:
		_cyl(h, Vector3(0.0, 0.62, dz), 0.08, 1.24, mat_wood)
	var cloth: Node3D = h
	var routine_cloths := {
		"KoboldHammock_1200_820": "RetreatHammockWestCloth",
		"KoboldHammock_1225_820": "RetreatHammockWest2Cloth",
		"KoboldHammock_1323_825": "RetreatHammockEastCloth",
		"KoboldHammock_1291_825": "RetreatHammockEast2Cloth",
	}
	if routine_cloths.has(str(h.name)):
		cloth = _routine_pivot(h, routine_cloths[str(h.name)], Vector3.ZERO)
	var b0 := _box(cloth, Vector3(0.0, 0.56, -0.58), Vector3(0.82, 0.07, 0.68), mat_cloth)
	b0.rotation.x = 0.22
	_box(cloth, Vector3(0.0, 0.48, 0.0), Vector3(0.86, 0.08, 0.64), mat_cloth)
	var b1 := _box(cloth, Vector3(0.0, 0.56, 0.58), Vector3(0.82, 0.07, 0.68), mat_cloth)
	b1.rotation.x = -0.22
	_box(cloth, Vector3(0.0, 0.62, -0.62), Vector3(0.54, 0.10, 0.28), mat_pillow)
	_add_box_collider(h, Vector3(0.0, 0.62, 0.0), Vector3(0.92, 1.25, 2.24))
	var hip := _attach_interactive_prop(h, ip_script, "hammock", "Hamaca del claustro", "[T] Tumbarse en hamaca", Vector3(0.0, 0.52, 0.0), "s")
	if hip:
		hip.set("interact_radius", 2.55)

static func _build_herbalist_rack_and_potions(parent: Node3D, pos: Vector3, mat_wood: Material, mat_pot: Material, mat_glass: Material, mat_herb: Material, ip_script: Script) -> void:
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
			_routine_target(herbs, "RetreatHerbBundle")
	for pdx in [-0.22, 0.22]:
		_cyl(r, Vector3(pdx, 1.14, 0.14), 0.065, 0.18, mat_potion_ruby)
		_cyl(r, Vector3(pdx, 1.25, 0.14), 0.032, 0.05, mat_wood)
	_add_box_collider(r, Vector3(0.0, 0.95, 0.0), Vector3(1.52, 1.90, 0.46))
	_tag_camera_occluder(r)
	_attach_interactive_prop(r, ip_script, "herbrack", "Estantería de Tarak", "[T] Examinar hierbas y pociones")

static func _build_weapon_and_shield_rack(parent: Node3D, pos: Vector3, mat_wood: Material, mat_iron: Material, mat_brass: Material, mat_emblem: Material, ip_script: Script) -> void:
	var w := Node3D.new()
	w.name = "WeaponRackVarnoth"
	w.position = pos
	parent.add_child(w)
	_box(w, Vector3(0.0, 0.85, 0.0), Vector3(1.4, 1.7, 0.38), mat_wood)
	var shield := _routine_pivot(w, "RetreatRackShield", Vector3(-0.35, 0.95, 0.22))
	_cyl(shield, Vector3.ZERO, 0.38, 0.08, mat_emblem)
	_cyl(shield, Vector3(0.0, 0.0, 0.04), 0.12, 0.10, mat_brass)
	_box(w, Vector3(0.28, 0.82, 0.20), Vector3(0.68, 0.06, 0.22), mat_wood)
	_box(w, Vector3(0.28, 1.28, 0.20), Vector3(0.68, 0.06, 0.22), mat_wood)
	_box(w, Vector3(0.14, 1.40, 0.22), Vector3(0.18, 0.11, 0.10), mat_iron)
	_cyl(w, Vector3(0.14, 1.22, 0.22), 0.024, 0.30, mat_wood)
	_box(w, Vector3(0.34, 1.41, 0.22), Vector3(0.045, 0.26, 0.035), mat_iron)
	_box(w, Vector3(0.49, 1.39, 0.22), Vector3(0.11, 0.16, 0.025), mat_iron)
	_cyl(w, Vector3(0.48, 0.94, 0.23), 0.042, 0.14, mat_brass)
	_box(w, Vector3(0.22, 0.94, 0.21), Vector3(0.36, 0.16, 0.18), mat_wood)
	_box(w, Vector3(0.22, 1.03, 0.21), Vector3(0.32, 0.03, 0.03), mat_iron)
	_add_box_collider(w, Vector3(0.0, 0.85, 0.0), Vector3(1.44, 1.70, 0.48))
	_tag_camera_occluder(w)
	_attach_interactive_prop(w, ip_script, "weaponrack", "Útiles de albañil y escudo de Varnoth", "[T] Inspeccionar herramientas y escudo retirado")

static func _build_tarak_compost_sack(parent: Node3D, pos: Vector3, mat_sack: Material, mat_rope: Material, mat_herb: Material, ip_script: Script) -> void:
	var sk := Node3D.new()
	sk.name = "TarakCompostSack"
	sk.position = pos
	parent.add_child(sk)
	_cyl(sk, Vector3(0.0, 0.28, 0.0), 0.24, 0.56, mat_sack)
	_cyl(sk, Vector3(0.0, 0.52, 0.0), 0.13, 0.10, mat_rope)
	_cyl(sk, Vector3(0.0, 0.61, 0.0), 0.17, 0.12, mat_sack)
	_box(sk, Vector3(0.28, 0.10, 0.14), Vector3(0.22, 0.14, 0.18), mat_herb)
	_add_cyl_collider(sk, Vector3(0.0, 0.32, 0.0), 0.30, 0.66)
	var sip := _attach_interactive_prop(sk, ip_script, "secret", "Saco pestilente de Tarak", "[T] Examinar saco pestilente", Vector3.ZERO, "n", "Saco de restos de comida fermentados con un olor penetrante: Tarak lo preparó como obsequio para los micónidos de las Cuevas de Pleamar.")
	if sip:
		sip.set_meta("secret_id", "tarak_compost")
		sip.set("interact_radius", 2.25)

static func _build_tarak_hidden_daggers(parent: Node3D, pos: Vector3, mat_wood: Material, mat_iron: Material, mat_brass: Material, ip_script: Script) -> void:
	var hd := Node3D.new()
	hd.name = "TarakHiddenDaggers"
	hd.position = pos
	parent.add_child(hd)
	var board := _box(hd, Vector3(0.0, 0.11, 0.0), Vector3(0.54, 0.035, 0.32), mat_wood)
	board.rotation.y = 0.09
	for di in range(3):
		var dz := -0.08 + float(di) * 0.08
		_box(hd, Vector3(-0.04, 0.132, dz), Vector3(0.24, 0.014, 0.028), mat_iron)
		_box(hd, Vector3(0.11, 0.134, dz), Vector3(0.09, 0.022, 0.024), mat_brass)
	var dip := _attach_interactive_prop(hd, ip_script, "secret", "Tabla suelta de Celda 2", "[T] Revisar tabla holgada", Vector3.ZERO, "n", "Bajo la tabla reposan tres dagas equilibradas de acero oscuro envueltas en cuero engrasado; no son herramientas de jardinería.")
	if dip:
		dip.set_meta("secret_id", "tarak_daggers")
		dip.set("interact_radius", 2.15)

static func _build_varnoth_hidden_sword(parent: Node3D, pos: Vector3, mat_iron: Material, mat_brass: Material, mat_leather: Material, ip_script: Script) -> void:
	var hs := Node3D.new()
	hs.name = "VarnothHiddenSword"
	hs.position = pos
	parent.add_child(hs)
	var hilt := _box(hs, Vector3(0.0, 0.44, 0.0), Vector3(0.16, 0.035, 0.035), mat_leather)
	hilt.rotation.y = 0.24
	var guard := _box(hs, Vector3(-0.08, 0.44, -0.02), Vector3(0.025, 0.035, 0.14), mat_brass)
	guard.rotation.y = 0.24
	var blade_tip := _box(hs, Vector3(-0.18, 0.44, -0.045), Vector3(0.18, 0.015, 0.042), mat_iron)
	blade_tip.rotation.y = 0.24
	var sip := _attach_interactive_prop(hs, ip_script, "secret", "Colchón de Varnoth", "[T] Mirar bajo el colchón", Vector3.ZERO, "w", "Bajo el colchón de paja descansa una vieja espada corta bien afilada con el emblema raspado de los Lobos Celestes.")
	if sip:
		sip.set_meta("secret_id", "varnoth_sword")
		sip.set("interact_radius", 2.25)

static func _build_myla_gear_shop_display(parent: Node3D, pos: Vector3, mat_oak: Material, mat_dark: Material, mat_rope: Material, mat_iron: Material, mat_brass: Material, mat_glass: Material, mat_paper: Material, ip_script: Script) -> void:
	var sh := Node3D.new()
	sh.name = "MylaGearShopDisplay"
	sh.position = pos
	sh.rotation.y = PI * 0.5
	parent.add_child(sh)
	_box(sh, Vector3(0.0, 0.46, 0.0), Vector3(1.56, 0.92, 0.48), mat_dark)
	_box(sh, Vector3(0.0, 0.94, 0.0), Vector3(1.64, 0.07, 0.54), mat_oak)
	_box(sh, Vector3(0.0, 1.38, -0.14), Vector3(1.52, 0.06, 0.24), mat_oak)
	for lx in [-0.72, 0.72]:
		_box(sh, Vector3(lx, 1.16, -0.14), Vector3(0.08, 0.50, 0.08), mat_dark)
	_cyl(sh, Vector3(-0.48, 1.03, 0.04), 0.16, 0.11, mat_rope)
	_cyl(sh, Vector3(-0.08, 1.09, 0.04), 0.09, 0.22, mat_brass)
	for ti in range(3):
		var t_stick := _cyl(sh, Vector3(0.28 + float(ti) * 0.06, 1.04, 0.06), 0.025, 0.34, mat_oak)
		t_stick.rotation.x = PI * 0.5
	_box(sh, Vector3(0.58, 1.01, 0.04), Vector3(0.32, 0.03, 0.04), mat_iron)
	for vi in range(3):
		_cyl(sh, Vector3(-0.40 + float(vi) * 0.24, 1.50, -0.14), 0.055, 0.16, mat_glass)
	_box(sh, Vector3(0.36, 1.50, -0.14), Vector3(0.42, 0.24, 0.03), mat_paper)
	_add_box_collider(sh, Vector3(0.0, 0.74, 0.0), Vector3(1.68, 1.48, 0.58))
	_tag_camera_occluder(sh)
	var shp := _attach_interactive_prop(sh, ip_script, "shop", "Tienda de equipo de Myla", "[T] Ver catálogo de equipo de Myla", Vector3.ZERO, "e")
	if shp:
		shp.set("interact_radius", 2.50)

static func _build_blepp_dagger_peg(parent: Node3D, pos: Vector3, mat_wood: Material, mat_iron: Material, mat_brass: Material, ip_script: Script) -> void:
	var bp := Node3D.new()
	bp.name = "BleppDaggerPeg"
	bp.position = pos
	parent.add_child(bp)
	_box(bp, Vector3(0.0, 0.92, 0.0), Vector3(0.08, 0.22, 0.28), mat_wood)
	_box(bp, Vector3(0.06, 0.84, 0.0), Vector3(0.04, 0.26, 0.05), mat_iron)
	_box(bp, Vector3(0.06, 0.98, 0.0), Vector3(0.04, 0.04, 0.12), mat_brass)
	var bip := _attach_interactive_prop(bp, ip_script, "secret", "Funda de Blepp", "[T] Examinar funda de Blepp", Vector3.ZERO, "w", "La funda remendada donde Blepp guarda su «daga mágica de la suerte». A simple vista es una daga común, pulida con devoción obsesiva.")
	if bip:
		bip.set_meta("secret_id", "blepp_dagger")
		bip.set("interact_radius", 2.10)

static func _build_mumpo_hidden_coin(parent: Node3D, pos: Vector3, mat_rock: Material, mat_bronze: Material, mat_gold: Material, ip_script: Script) -> void:
	var mc := Node3D.new()
	mc.name = "MumpoHiddenCoin"
	mc.position = pos
	parent.add_child(mc)
	_cyl(mc, Vector3(0.0, 0.11, 0.0), 0.14, 0.08, mat_rock)
	_cyl(mc, Vector3(0.09, 0.115, 0.05), 0.032, 0.012, mat_bronze)
	_cyl(mc, Vector3(0.09, 0.122, 0.05), 0.022, 0.008, mat_gold)
	var mip := _attach_interactive_prop(mc, ip_script, "secret", "Escondite de Mumpo", "[T] Revisar piedra suelta", Vector3.ZERO, "e", "Bajo un guijarro brilla una única moneda de cobre lustrada: el «gran botín» que Mumpo sustrajo en secreto del tesoro de Runara.")
	if mip:
		mip.set_meta("secret_id", "mumpo_coin")
		mip.set("interact_radius", 2.15)

static func _build_blepp_lookout_post(parent: Node3D, pos: Vector3, mat_stone: Material, mat_wood: Material, mat_brass: Material, mat_flame: Material, ip_script: Script) -> void:
	var lp := Node3D.new()
	lp.name = "BleppLookoutPost"
	lp.position = pos
	parent.add_child(lp)
	_box(lp, Vector3(0.0, 0.34, 0.0), Vector3(0.46, 0.68, 0.42), mat_stone)
	_box(lp, Vector3(0.0, 0.71, 0.0), Vector3(0.52, 0.07, 0.48), mat_wood)
	_cyl(lp, Vector3(-0.10, 0.85, 0.0), 0.075, 0.22, mat_brass)
	var lf := _cyl(lp, Vector3(-0.10, 0.86, 0.0), 0.038, 0.10, mat_flame)
	lf.add_to_group("night_flame")
	var spy := _cyl(lp, Vector3(0.11, 0.77, 0.02), 0.030, 0.26, mat_brass)
	spy.rotation = Vector3(0.0, 0.45, PI * 0.5)
	_add_box_collider(lp, Vector3(0.0, 0.40, 0.0), Vector3(0.52, 0.80, 0.48))
	var lip := _attach_interactive_prop(lp, ip_script, "table", "Puesto de vigía de Blepp", "[T] Otear la bajada a la playa", Vector3.ZERO, "s", "Desde este pretil Blepp vigila cada ola y cada sombra que sube desde la playa y el embarcadero.")
	if lip:
		lip.set("interact_radius", 2.35)

static func _build_tinker_workbench(parent: Node3D, pos: Vector3, mat_wood: Material, mat_dark: Material, mat_brass: Material, mat_iron: Material, mat_glass: Material, ip_script: Script) -> void:
	var tb := Node3D.new()
	tb.name = "MylaTinkerWorkbench"
	tb.position = pos
	parent.add_child(tb)
	_box(tb, Vector3(0.0, 0.42, 0.0), Vector3(2.1, 0.84, 0.82), mat_dark)
	_box(tb, Vector3(0.0, 0.86, 0.0), Vector3(2.2, 0.08, 0.90), mat_wood)
	var gear_piv := Node3D.new()
	gear_piv.name = "BrassGearPivot"
	gear_piv.position = Vector3(-0.55, 0.94, 0.0)
	gear_piv.add_to_group("dynamic_prop")
	tb.add_child(gear_piv)
	_cyl(gear_piv, Vector3.ZERO, 0.22, 0.06, mat_brass)
	_box(gear_piv, Vector3(0.0, 0.01, 0.0), Vector3(0.48, 0.04, 0.06), mat_brass)
	_box(gear_piv, Vector3(0.0, 0.01, 0.0), Vector3(0.06, 0.04, 0.48), mat_brass)
	var tray := _routine_pivot(tb, "RetreatPartsTray", Vector3(-0.18, 0.94, 0.12))
	_cyl(tray, Vector3.ZERO, 0.15, 0.06, mat_iron)
	_box(tray, Vector3(0.031, 0.036, 0.0), Vector3(0.10, 0.035, 0.035), mat_brass)
	_box(tray, Vector3(-0.047, 0.033, 0.043), Vector3(0.08, 0.028, 0.04), mat_iron)
	var alembic := _routine_pivot(tb, "RetreatAlembic", Vector3(0.48, 1.08, -0.05))
	_cyl(alembic, Vector3.ZERO, 0.16, 0.38, mat_glass)
	_cyl(alembic, Vector3(0.0, 0.26, 0.0), 0.06, 0.22, mat_brass)
	_routine_target(_box(tb, Vector3(0.79, 0.93, 0.17), Vector3(0.32, 0.028, 0.052), mat_iron), "RetreatColdTool")
	_box(tb, Vector3(-0.18, 0.56, 0.49), Vector3(0.30, 0.11, 0.23), mat_iron)
	_box(tb, Vector3(-0.16, 0.623, 0.53), Vector3(0.11, 0.023, 0.075), mat_brass)
	_routine_pivot(tb, "RetreatMylaWorkpiece", Vector3(-0.16, 0.636, 0.53))
	_box(tb, Vector3(0.71, 0.56, 0.49), Vector3(0.28, 0.105, 0.21), mat_iron)
	_box(tb, Vector3(0.69, 0.629, 0.55), Vector3(0.34, 0.034, 0.13), mat_wood)
	_routine_pivot(tb, "RetreatLayleeWorkpiece", Vector3(0.77, 0.647, 0.55))
	_add_box_collider(tb, Vector3(0.0, 0.50, 0.0), Vector3(2.22, 1.00, 0.92))
	var wip := _attach_interactive_prop(tb, ip_script, "workbench", "Banco de artesanía de Myla", "[T] Probar engranajes y alambique")
	if wip:
		wip.set("interact_radius", 2.65)

static func _build_bound_chest(parent: Node3D, pos: Vector3, yaw: float, mat_wood: Material, mat_iron: Material, mat_brass: Material, ip_script: Script) -> void:
	var c := Node3D.new()
	c.name = "BoundChest_%d_%d" % [int(pos.x), int(pos.z)]
	c.position = pos
	c.rotation.y = yaw
	parent.add_child(c)
	_box(c, Vector3(0.0, 0.22, 0.0), Vector3(0.92, 0.44, 0.54), mat_wood)
	_box(c, Vector3(-0.32, 0.22, 0.0), Vector3(0.08, 0.45, 0.56), mat_iron)
	_box(c, Vector3(0.32, 0.22, 0.0), Vector3(0.08, 0.45, 0.56), mat_iron)
	if c.name == "BoundChest_132_84":
		var latch := _routine_pivot(c, "RetreatChestLatch", Vector3(0.0, 0.34, 0.28))
		_box(latch, Vector3.ZERO, Vector3(0.14, 0.16, 0.04), mat_brass)
	else:
		_box(c, Vector3(0.0, 0.34, 0.28), Vector3(0.14, 0.16, 0.04), mat_brass)
	var lid_piv := Node3D.new()
	lid_piv.name = "ChestLidPivot"
	lid_piv.position = Vector3(0.0, 0.44, -0.27)
	lid_piv.add_to_group("dynamic_prop")
	c.add_child(lid_piv)
	_box(lid_piv, Vector3(0.0, 0.07, 0.27), Vector3(0.94, 0.14, 0.56), mat_wood)
	_box(lid_piv, Vector3(-0.32, 0.08, 0.27), Vector3(0.085, 0.15, 0.58), mat_iron)
	_box(lid_piv, Vector3(0.32, 0.08, 0.27), Vector3(0.085, 0.15, 0.58), mat_iron)
	_add_box_collider(c, Vector3(0.0, 0.35, 0.0), Vector3(0.96, 0.70, 0.58))
	_attach_interactive_prop(c, ip_script, "chest", "Baúl de peregrino", "[T] Abrir baúl")

static func _build_braided_jute_mat(parent: Node3D, pos: Vector3, size: Vector2, mat_jute: Material, mat_border: Material) -> void:
	var r := Node3D.new()
	r.position = pos
	parent.add_child(r)
	_box(r, Vector3.ZERO, Vector3(size.x, 0.022, size.y), mat_border)
	_box(r, Vector3(0.0, 0.007, 0.0), Vector3(size.x * 0.88, 0.022, size.y * 0.88), mat_jute)
	for ri in range(7):
		var rz := lerpf(-size.y * 0.38, size.y * 0.38, float(ri) / 6.0)
		_box(r, Vector3(0.0, 0.016, rz), Vector3(size.x * 0.82, 0.012, 0.11), mat_border if ri % 2 == 0 else mat_jute)

static func _build_cave_rock_niche(parent: Node3D, pos: Vector3, yaw: float, mat_rock: Material, mat_wood: Material, mat_book: Material, mat_accent: Material, mat_flame: Material) -> void:
	var n := Node3D.new()
	n.name = "CaveRockNiche"
	n.position = pos
	n.rotation.y = yaw
	parent.add_child(n)
	_box(n, Vector3(0.0, 0.0, 0.14), Vector3(1.45, 0.16, 0.52), mat_rock)
	_box(n, Vector3(0.0, 0.72, 0.14), Vector3(1.38, 0.18, 0.48), mat_rock)
	for sx in [-0.64, 0.64]:
		_box(n, Vector3(sx, 0.36, 0.12), Vector3(0.18, 0.58, 0.44), mat_rock)
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
	_cyl(t, Vector3(0.0, 0.02, 0.075), 0.28, 0.02, mat_emblem)
	_cyl(t, Vector3(0.04, 0.02, 0.082), 0.16, 0.02, mat_cloth)
	_box(t, Vector3(0.0, 0.16, 0.085), Vector3(0.24, 0.08, 0.02), mat_gold)

static func _build_brazier_stand(builder: Node3D, parent: Node3D, pos: Vector3, mat_iron: Material, mat_brass: Material, mat_flame: Material, ip_script: Script, fx: Node = null) -> void:
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
	_register_a1_light(builder, fx, bf, bl, 1.35, 0.08)
	_add_cyl_collider(b, Vector3(0.0, 0.50, 0.0), 0.44, 1.00)
	var bip := _attach_interactive_prop(b, ip_script, "brazier", "el brasero de la celda", "[T] Avivar brasero")
	if bip:
		bip.set("interact_radius", 2.45)

static func _build_plaza_hearth_and_benches(
	parent: Node3D, center: Vector3,
	mat_stone: Material, mat_dark_oak: Material, mat_oak: Material,
	mat_iron: Material, mat_brass: Material, mat_flame: Material,
	mat_cush_a: Material, mat_cush_b: Material,
	mat_rug_main: Material, mat_rug_border: Material,
	style: Dictionary, ip_script: Script
) -> void:
	var h := Node3D.new()
	h.name = "PlazaHearthRing"
	h.position = center
	parent.add_child(h)

	var ring_xfs: Array[Transform3D] = []
	for i in range(12):
		var ang := (float(i) / 12.0) * TAU
		ring_xfs.append(_xf_trs(Vector3(cos(ang) * 1.18, 0.20, sin(ang) * 1.18), Vector3(0.0, -ang + PI * 0.5, 0.0), Vector3(0.62, 0.40, 0.42)))
	var ring_box := BoxMesh.new()
	ring_box.size = Vector3.ONE
	_add_static_mm(h, "MM_HearthStones", ring_box, mat_stone, ring_xfs, false)
	_cyl(h, Vector3(0.0, 0.06, 0.0), 0.92, 0.10, mat_iron)
	_cyl(h, Vector3(0.0, 0.12, 0.0), 0.64, 0.06, mat_flame)

	for i in range(4):
		var lang := float(i) * PI * 0.25
		var lg := _cyl(h, Vector3(0.0, 0.22, 0.0), 0.12, 1.45, mat_dark_oak)
		lg.rotation = Vector3(PI * 0.5, lang, 0.15)
	_build_flame_cluster(h, Vector3(0.0, 0.26, 0.0), 1.0, mat_flame)

	for i in range(3):
		var tang := (float(i) / 3.0) * TAU + 0.3
		var leg := _cyl(h, Vector3(cos(tang) * 0.62, 0.92, sin(tang) * 0.62), 0.04, 1.95, mat_iron)
		leg.rotation = Vector3(sin(tang) * 0.34, 0.0, -cos(tang) * 0.34)
	_cyl(h, Vector3(0.0, 0.78, 0.0), 0.38, 0.42, mat_iron)
	_cyl(h, Vector3(0.0, 0.98, 0.0), 0.41, 0.06, mat_brass)
	_cyl(h, Vector3(0.0, 1.32, 0.0), 0.025, 0.75, mat_brass)
	_add_cyl_collider(h, Vector3(0.0, 0.65, 0.0), 1.44, 1.30)
	var fip := _attach_interactive_prop(h, ip_script, "fire", "la hoguera de la plaza", "[T] Avivar fuego")
	if fip:
		fip.set("interact_radius", 3.15)
		fip.set("linked_fire_node_name", "A1_Campfire")

	var bench_angles := [0.0, PI]
	for idx in range(bench_angles.size()):
		var ang: float = bench_angles[idx]
		var dist := 2.45
		var bp := Vector3(cos(ang) * dist, 0.0, sin(ang) * dist)
		var bench := Node3D.new()
		bench.name = "PlazaBenchEast" if idx == 0 else "PlazaBenchWest"
		bench.set_meta("canonical_id", "a1-seat-east-point" if idx == 0 else "a1-seat-west-point")
		bench.position = bp
		bench.rotation.y = -ang - PI * 0.5
		h.add_child(bench)
		_box(bench, Vector3(0.0, 0.46, 0.0), Vector3(1.95, 0.09, 0.58), mat_oak)
		_box(bench, Vector3(0.0, 0.84, -0.24), Vector3(1.90, 0.42, 0.08), mat_dark_oak)
		var runner_x := -0.42 if idx == 0 else 0.42
		_box(bench, Vector3(runner_x, 0.515, 0.02), Vector3(0.68, 0.035, 0.54), mat_cush_a)
		_box(bench, Vector3(runner_x, 0.528, 0.02), Vector3(0.48, 0.025, 0.55), mat_cush_b)
		_box(bench, Vector3(runner_x, 0.39, 0.28), Vector3(0.66, 0.22, 0.03), mat_cush_a)
		for lx in [-0.74, 0.74]:
			_box(bench, Vector3(lx, 0.23, 0.0), Vector3(0.20, 0.46, 0.50), mat_stone)
		# Alfombra tejida canónica adelantada frente al banco hacia la hoguera (visible en ambos modos)
		_build_woven_rug_named(
			bench,
			"A1CozyRug_" + bench.name,
			Vector3(0.0, 0.015, float(style["bench_rug_offset_z"])),
			style["bench_rug_size"],
			mat_rug_main,
			mat_rug_border
		)
		_add_box_collider(bench, Vector3(0.0, 0.50, 0.0), Vector3(1.98, 1.00, 0.62))
		var h_slots: Array[Vector3] = [Vector3(-0.44, 0.515, 0.03), Vector3(0.44, 0.515, 0.03)]
		bench.set_meta("seat_slots", h_slots)
		_attach_seat_prop(bench, ip_script, "bench", "Banco de la plaza", "[T] Sentarse junto al fuego", h_slots, Vector3(0.0, 0.0, 1.0), 0.29, "w" if idx == 0 else "e", false, 2.35)

static func _build_interactive_bench(parent: Node3D, pos: Vector3, yaw: float, mat_oak: Material, mat_dark: Material, mat_stone: Material, facing: String, label: String, ip_script: Script) -> void:
	var bench := Node3D.new()
	bench.position = pos
	bench.rotation.y = yaw
	parent.add_child(bench)
	_box(bench, Vector3(0.0, 0.46, 0.0), Vector3(1.95, 0.09, 0.58), mat_oak)
	_box(bench, Vector3(0.0, 0.84, -0.24), Vector3(1.90, 0.42, 0.08), mat_dark)
	for lx in [-0.74, 0.74]:
		_box(bench, Vector3(lx, 0.23, 0.0), Vector3(0.20, 0.46, 0.50), mat_stone)
	_add_box_collider(bench, Vector3(0.0, 0.50, 0.0), Vector3(1.98, 1.00, 0.62))
	var slots: Array[Vector3] = [Vector3(-0.46, 0.505, 0.04), Vector3(0.46, 0.505, 0.04)]
	_attach_seat_prop(bench, ip_script, "bench", label, "[T] Sentarse en banco", slots, Vector3(0.0, 0.0, 1.0), 0.29, facing, false, 2.55)

static func _build_pilgrim_pack_and_basket(parent: Node3D, pos: Vector3, yaw: float, mat_leather: Material, mat_wicker: Material, mat_buckle: Material, mat_pot: Material) -> void:
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
	_cyl(p, Vector3(-0.46, 0.16, 0.08), 0.20, 0.32, mat_wicker)
	_cyl(p, Vector3(-0.46, 0.31, 0.08), 0.215, 0.04, mat_leather)
	_cyl(p, Vector3(0.36, 0.15, 0.12), 0.11, 0.28, mat_pot)

static func _build_hanging_herb_bundles(parent: Node3D, pos: Vector3, mat_wood: Material, mat_herb: Material, mat_twine: Material) -> void:
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

static func _build_monastic_storage_crates_and_baskets(parent: Node3D, pos: Vector3, _mat_dark: Material, mat_oak: Material, mat_wicker: Material, mat_pot: Material) -> void:
	var s := Node3D.new()
	s.name = "MonasticLightStorage"
	s.position = pos
	parent.add_child(s)
	_box(s, Vector3(0.0, 0.24, 0.0), Vector3(0.68, 0.48, 0.52), mat_oak)
	_cyl(s, Vector3(0.0, 0.62, -0.04), 0.21, 0.28, mat_wicker)
	_cyl(s, Vector3(0.48, 0.22, 0.08), 0.16, 0.44, mat_pot)
	_cyl(s, Vector3(-0.46, 0.17, 0.10), 0.19, 0.34, mat_wicker)
	_add_box_collider(s, Vector3(0.0, 0.38, 0.0), Vector3(1.15, 0.76, 0.58))

static func _build_cell_contemplative_shrine(parent: Node3D, pos: Vector3, mat_stone: Material, mat_rock: Material, mat_bronze: Material, mat_gold: Material, mat_flame: Material, mat_jute: Material, mat_cush: Material, ip_script: Script) -> void:
	var sh := Node3D.new()
	sh.name = "CellContemplativeShrine"
	sh.position = pos
	parent.add_child(sh)
	_box(sh, Vector3(0.0, 0.32, 0.0), Vector3(1.48, 0.64, 0.62), mat_rock)
	_box(sh, Vector3(0.0, 0.68, 0.02), Vector3(1.58, 0.10, 0.68), mat_stone)
	_cyl(sh, Vector3(0.0, 0.78, -0.06), 0.18, 0.10, mat_bronze)
	_box(sh, Vector3(0.0, 0.96, -0.06), Vector3(0.22, 0.30, 0.18), mat_gold)
	_routine_target(_cyl(sh, Vector3(0.0, 0.76, 0.18), 0.09, 0.07, mat_bronze), "RetreatCellVessel")
	for vx in [-0.48, 0.48]:
		_cyl(sh, Vector3(vx, 0.75, 0.04), 0.06, 0.04, mat_bronze)
		_cyl(sh, Vector3(vx, 0.82, 0.04), 0.032, 0.12, mat_gold)
		_cyl(sh, Vector3(vx, 0.91, 0.04), 0.022, 0.08, mat_flame)
	_add_box_collider(sh, Vector3(0.0, 0.45, 0.0), Vector3(1.58, 0.90, 0.68))
	_attach_interactive_prop(sh, ip_script, "shrine", "Altar contemplativo", "[T] Orar ante el altar dracónico", Vector3.ZERO, "n", "El incienso del pequeño altar de la celda desprende un aroma sereno a cedro y mirra.")
	var med := Node3D.new()
	med.name = "ShrineMeditationMat"
	med.position = Vector3(0.0, 0.08, 0.95)
	sh.add_child(med)
	_box(med, Vector3.ZERO, Vector3(0.86, 0.06, 0.68), mat_jute)
	_box(med, Vector3(0.0, 0.035, 0.0), Vector3(0.72, 0.05, 0.54), mat_cush)
	var med_slots: Array[Vector3] = [Vector3(0.0, 0.14, 0.0)]
	_attach_seat_prop(med, ip_script, "chair", "Cojín de contemplación", "[T] Sentarse a meditar", med_slots, Vector3(0.0, 0.0, -1.0), 0.25, "n", false, 1.95)

static func _build_plaza_monastic_life_props(parent: Node3D, y_a1: float, mat_oak: Material, mat_dark: Material, mat_stone: Material, mat_pot: Material, mat_linen: Material, mat_wicker: Material, mat_stripe: Material, mat_ochre: Material, ip_script: Script) -> void:
	var C := cfg()
	var tbl := Node3D.new()
	tbl.name = "CloisterRefreshmentTable"
	tbl.position = Vector3(C.REFRESHMENT_TABLE_POS.x, y_a1, C.REFRESHMENT_TABLE_POS.z)
	parent.add_child(tbl)
	_box(tbl, Vector3(0.0, 0.64, 0.0), Vector3(1.24, 0.08, 0.56), mat_oak)
	for lx in [-0.48, 0.48]:
		_box(tbl, Vector3(lx, 0.32, 0.0), Vector3(0.14, 0.64, 0.46), mat_stone)
	_box(tbl, Vector3(0.0, 0.69, 0.0), Vector3(0.95, 0.02, 0.42), mat_linen)
	_routine_target(_cyl(tbl, Vector3(-0.28, 0.79, -0.04), 0.10, 0.22, mat_pot), "RetreatRefreshmentJug")
	_routine_target(_cyl(tbl, Vector3(0.04, 0.73, 0.06), 0.08, 0.07, mat_dark), "RetreatRefreshmentCup")
	_cyl(tbl, Vector3(0.24, 0.73, -0.05), 0.08, 0.07, mat_dark)
	_routine_target(_cyl(tbl, Vector3(0.52, 0.18, 0.06), 0.21, 0.34, mat_wicker), "RetreatRefreshmentBasket")
	_add_box_collider(tbl, Vector3(0.0, 0.42, 0.0), Vector3(1.28, 0.84, 0.60))
	_attach_interactive_prop(tbl, ip_script, "refreshments", "Mesa de refrigerios", "[T] Servirse agua y pan del claustro")

	var throw_node := Node3D.new()
	throw_node.name = "ParapetFoldedBlanket"
	throw_node.position = C.PARAPET_BLANKET_POS
	parent.add_child(throw_node)
	_box(throw_node, Vector3(0.0, 0.03, 0.0), Vector3(0.84, 0.06, 0.48), mat_linen)
	_box(throw_node, Vector3(0.0, 0.05, 0.0), Vector3(0.82, 0.035, 0.14), mat_stripe)
	_box(throw_node, Vector3(0.0, -0.10, -0.23), Vector3(0.82, 0.24, 0.04), mat_linen)

	var wood_pile := Node3D.new()
	wood_pile.name = "HearthFirewoodStack"
	wood_pile.position = C.FIREWOOD_STACK_POS
	parent.add_child(wood_pile)
	for li in range(3):
		var lg := _cyl(wood_pile, Vector3(-0.18 + float(li) * 0.18, 0.10, 0.0), 0.085, 0.68, mat_dark)
		lg.rotation.x = PI * 0.5
	for li in range(2):
		var lg2 := _cyl(wood_pile, Vector3(-0.09 + float(li) * 0.18, 0.23, 0.0), 0.08, 0.64, mat_oak)
		lg2.rotation.x = PI * 0.5
		if li == 0:
			_routine_target(lg2, "RetreatFirewoodBillet")
	_cyl(wood_pile, Vector3(0.52, 0.17, -0.08), 0.22, 0.32, mat_wicker)
	_box(wood_pile, Vector3(0.52, 0.32, -0.08), Vector3(0.32, 0.05, 0.28), mat_ochre)
	_attach_interactive_prop(wood_pile, ip_script, "firewood", "Pila de leña seca", "[T] Recoger leña seca")

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

static func _build_astalagan_shrine_altar(parent: Node3D, pos: Vector3, mat_stone: Material, mat_rock: Material, mat_brass: Material, mat_gold: Material, mat_flame: Material, ip_script: Script) -> void:
	var a := Node3D.new()
	a.name = "AstalaganCircularPedestal"
	a.position = pos
	parent.add_child(a)
	var ped_stone_xfs: Array[Transform3D] = []
	var ped_rock_xfs: Array[Transform3D] = []
	var ped_stone_sh_xfs: Array[Transform3D] = []
	var ped_rock_sh_xfs: Array[Transform3D] = []
	for i in range(16):
		var ang := (float(i) / 16.0) * TAU
		var xf_s := _xf_trs(Vector3(cos(ang) * 1.92, 0.015, sin(ang) * 1.92), Vector3(0.0, -ang + PI * 0.5, 0.0), Vector3(0.76, 0.03, 0.58))
		if i % 2 == 0: ped_stone_xfs.append(xf_s)
		else: ped_rock_xfs.append(xf_s)
		var xf_b1 := _xf_trs(Vector3(cos(ang) * 1.38, 0.13, sin(ang) * 1.38), Vector3(0.0, -ang + PI * 0.5, 0.0), Vector3(0.60, 0.26, 0.52))
		if i % 2 == 0: ped_stone_sh_xfs.append(xf_b1)
		else: ped_rock_sh_xfs.append(xf_b1)
	for i in range(12):
		var ang := (float(i) / 12.0) * TAU + 0.13
		ped_stone_sh_xfs.append(_xf_trs(Vector3(cos(ang) * 1.04, 0.36, sin(ang) * 1.04), Vector3(0.0, -ang + PI * 0.5, 0.0), Vector3(0.58, 0.24, 0.46)))
	var ub := BoxMesh.new(); ub.size = Vector3.ONE
	_add_static_mm(a, "MM_PedestalSlabsStone", ub, mat_stone, ped_stone_xfs, false)
	_add_static_mm(a, "MM_PedestalSlabsRock", ub, mat_rock, ped_rock_xfs, false)
	_add_static_mm(a, "MM_PedestalBlocksStone", ub, mat_stone, ped_stone_sh_xfs, true)
	_add_static_mm(a, "MM_PedestalBlocksRock", ub, mat_rock, ped_rock_sh_xfs, true)
	_cyl(a, Vector3(0.0, 0.13, 0.0), 1.36, 0.26, mat_rock)
	_cyl(a, Vector3(0.0, 0.36, 0.0), 1.02, 0.24, mat_stone)
	_cyl(a, Vector3(0.0, 0.53, 0.0), 0.96, 0.12, mat_stone)
	_cyl(a, Vector3(0.0, 0.48, 0.0), 1.06, 0.05, mat_brass)
	var vot_brass_xfs: Array[Transform3D] = []
	var vot_gold_xfs: Array[Transform3D] = []
	var vot_flame_xfs: Array[Transform3D] = []
	for vi in range(8):
		var vang := (float(vi) / 8.0) * TAU + 0.22
		var vx := cos(vang) * 1.26
		var vz := sin(vang) * 1.26
		vot_brass_xfs.append(_xf_trs(Vector3(vx, 0.27, vz), Vector3.ZERO, Vector3(0.13, 0.03, 0.13)))
		vot_gold_xfs.append(_xf_trs(Vector3(vx, 0.33, vz), Vector3.ZERO, Vector3(0.072, 0.11, 0.072)))
		vot_flame_xfs.append(_xf_trs(Vector3(vx, 0.41, vz), Vector3.ZERO, Vector3(0.048, 0.09, 0.048)))
	var uc := CylinderMesh.new(); uc.top_radius = 0.5; uc.bottom_radius = 0.5; uc.height = 1.0; uc.radial_segments = 8
	_add_static_mm(a, "MM_VotiveBases", uc, mat_brass, vot_brass_xfs, false)
	_add_static_mm(a, "MM_VotiveCandles", uc, mat_gold, vot_gold_xfs, false)
	var mm_vf := _add_static_mm(a, "MM_VotiveFlames", uc, mat_flame, vot_flame_xfs, false)
	if mm_vf:
		mm_vf.add_to_group("night_flame")
	_add_cyl_collider(a, Vector3(0.0, 0.95, 0.0), 1.38, 1.90)
	_tag_camera_occluder(a)
	var sip := _attach_interactive_prop(a, ip_script, "shrine", "Estatua de Astalagan", "[T] Honrar y contemplar a Astalagan", Vector3.ZERO, "n", "«En memoria de Astalagan, el dragón de bronce que dio reposo a esta isla frente a la furia de Sharruth.»")
	if sip:
		sip.set("interact_radius", 3.15)

static func _build_monastic_well_fountain(builder: Node3D, parent: Node3D, pos: Vector3, mat_stone: Material, mat_wood: Material, mat_iron: Material, mat_water: Material, ip_script: Script, fx: Node = null) -> void:
	var C := cfg()
	var style: Dictionary = C.STYLE_TUNING
	var w := Node3D.new()
	w.name = "MonasticFountainWell"
	w.position = pos
	parent.add_child(w)

	var mat_rock: Material = builder.get("mat_rock_carved") if builder.get("mat_rock_carved") else mat_stone
	var mat_dark_pit: Material = _make_mat(builder, Color("#0b0d10"), 0.96, 0.0)
	var mat_rope: Material = _make_mat(builder, Color("#b4935e"), 0.88, 0.0)
	var mat_sack: Material = _make_mat(builder, Color("#9a7f56"), 0.92, 0.0)
	var mat_flame: Material = builder.get("mat_flame") if builder.get("mat_flame") else mat_stone

	_cyl(w, Vector3(0.0, 0.36, 0.0), 0.94, 0.70, mat_dark_pit)
	_cyl(w, Vector3(0.0, 0.04, 0.0), 0.88, 0.03, mat_water)

	var blocks_per_ring := 14
	var well_stone_xfs: Array[Transform3D] = []
	var well_rock_xfs: Array[Transform3D] = []
	for c_i in range(3):
		var cy := 0.14 + float(c_i) * 0.27
		var stagger := float(c_i % 2) * (TAU / float(blocks_per_ring) * 0.5)
		for b_i in range(blocks_per_ring):
			var ang := (float(b_i) / float(blocks_per_ring)) * TAU + stagger
			var r_off := 1.07 + sin(float(b_i * 3 + c_i)) * 0.025
			var b_xf := _xf_trs(Vector3(cos(ang) * r_off, cy, sin(ang) * r_off), Vector3(0.0, -ang + PI * 0.5, 0.0), Vector3(0.52, 0.25, 0.38))
			if (b_i + c_i) % 2 == 0: well_stone_xfs.append(b_xf)
			else: well_rock_xfs.append(b_xf)
	for b_i in range(blocks_per_ring):
		var ang := (float(b_i) / float(blocks_per_ring)) * TAU
		well_stone_xfs.append(_xf_trs(Vector3(cos(ang) * 1.08, 0.88, sin(ang) * 1.08), Vector3(0.0, -ang + PI * 0.5, 0.0), Vector3(0.55, 0.11, 0.44)))
	var w_ub := BoxMesh.new(); w_ub.size = Vector3.ONE
	_add_static_mm(w, "MM_WellStoneBlocks", w_ub, mat_stone, well_stone_xfs, true)
	_add_static_mm(w, "MM_WellRockBlocks", w_ub, mat_rock, well_rock_xfs, true)

	for dx in [-1.06, 1.06]:
		_box(w, Vector3(dx, 1.44, 0.0), Vector3(0.22, 2.02, 0.22), mat_wood, true)
		_box(w, Vector3(dx, 0.96, 0.0), Vector3(0.26, 0.16, 0.26), mat_iron)
	_box(w, Vector3(0.0, 2.38, 0.0), Vector3(2.52, 0.22, 0.28), mat_wood, true)

	var roller_node := Node3D.new()
	roller_node.name = "WellRollerNode"
	roller_node.position = Vector3(0.0, 1.98, 0.0)
	w.add_child(roller_node)
	var axle := _cyl(roller_node, Vector3.ZERO, 0.11, 1.96, mat_wood)
	axle.rotation.z = PI * 0.5
	var coil_xfs: Array[Transform3D] = []
	for ri in range(7):
		coil_xfs.append(_xf_trs(Vector3(-0.18 + float(ri) * 0.06, 0.0, 0.0), Vector3(0.0, 0.0, PI * 0.5), Vector3(0.35, 0.052, 0.35)))
	var w_uc := CylinderMesh.new(); w_uc.top_radius = 0.5; w_uc.bottom_radius = 0.5; w_uc.height = 1.0; w_uc.radial_segments = 10
	_add_static_mm(roller_node, "MM_WellRopeCoils", w_uc, mat_rope, coil_xfs, false)
	var pulley := _cyl(w, Vector3(0.0, 1.76, 0.0), 0.14, 0.06, mat_iron)
	pulley.rotation.z = PI * 0.5

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

	_cyl(w, Vector3(0.58, 1.92, 0.0), 0.018, 0.36, mat_iron)
	_cyl(w, Vector3(0.58, 1.72, 0.0), 0.12, 0.05, mat_iron)
	var wl_flm := _box(w, Vector3(0.58, 1.60, 0.0), Vector3(0.13, 0.18, 0.13), mat_flame)
	wl_flm.add_to_group("night_flame")
	_cyl(w, Vector3(0.58, 1.49, 0.0), 0.11, 0.04, mat_iron)
	var wl_light := OmniLight3D.new()
	wl_light.name = "WellLanternLight"
	wl_light.position = Vector3(0.58, 1.58, 0.18)
	wl_light.light_color = Color(1.0, 0.72, 0.34)
	wl_light.light_energy = float(style["well_lantern_energy"])
	wl_light.omni_range = 8.5
	w.add_child(wl_light)
	_register_a1_light(builder, fx, wl_flm, wl_light, float(style["well_lantern_energy"]), 0.06)

	var tail_rope := _cyl(w, Vector3(1.12, 1.05, 0.28), 0.035, 1.15, mat_rope)
	tail_rope.rotation.x = 0.22
	_cyl(w, Vector3(-1.32, 0.17, 0.38), 0.18, 0.34, mat_wood)
	_cyl(w, Vector3(-1.32, 0.26, 0.38), 0.19, 0.04, mat_iron)
	var sack := _box(w, Vector3(-1.12, 0.16, 0.74), Vector3(0.42, 0.32, 0.34), mat_sack)
	sack.rotation.y = 0.38

	_add_cyl_collider(w, Vector3(0.0, 1.10, 0.0), 1.12, 2.20)
	_add_box_collider(w, Vector3(0.0, 2.38, 0.0), Vector3(2.52, 0.30, 0.36))
	_tag_camera_occluder(w)
	_attach_interactive_prop(w, ip_script, "well", "Pozo del Claustro", "[T] Sacar agua del pozo · Llenar cantimplora")

static func _build_cloister_pergola_and_table(parent: Node3D, pos: Vector3, mat_dark: Material, mat_oak: Material, mat_pot: Material, mat_brass: Material, mat_flame: Material, mat_runner: Material, ip_script: Script) -> void:
	var p := Node3D.new()
	p.name = "CloisterPergola"
	p.position = pos
	parent.add_child(p)
	for dx in [-1.65, 1.65]:
		for dz in [-0.98, 0.98]:
			_cyl(p, Vector3(dx, 1.55, dz), 0.10, 3.10, mat_dark)
			_add_cyl_collider(p, Vector3(dx, 1.25, dz), 0.15, 2.50)
	for dz in [-0.98, 0.98]:
		_box(p, Vector3(0.0, 3.08, dz), Vector3(3.7, 0.16, 0.16), mat_dark)
		_add_box_collider(p, Vector3(0.0, 3.08, dz), Vector3(3.7, 0.28, 0.24))
	for i in range(6):
		var rx := lerpf(-1.6, 1.6, float(i) / 5.0)
		_box(p, Vector3(rx, 3.20, 0.0), Vector3(0.11, 0.11, 2.3), mat_oak)
	_box(p, Vector3(0.0, 0.76, 0.0), Vector3(2.4, 0.09, 0.86), mat_oak)
	_box(p, Vector3(0.0, 0.81, 0.0), Vector3(2.15, 0.02, 0.34), mat_runner)
	for dx in [-0.92, 0.92]:
		_box(p, Vector3(dx, 0.38, 0.0), Vector3(0.16, 0.76, 0.68), mat_dark)
	for dz in [-0.66, 0.66]:
		_box(p, Vector3(0.0, 0.44, dz), Vector3(2.25, 0.08, 0.36), mat_oak)
		for lx in [-0.82, 0.82]:
			_box(p, Vector3(lx, 0.22, dz), Vector3(0.13, 0.44, 0.30), mat_dark)
		_add_box_collider(p, Vector3(0.0, 0.34, dz), Vector3(2.30, 0.68, 0.40))
		var p_bench := Node3D.new()
		p_bench.name = "PergolaBenchAnchor_%s" % ("N" if dz < 0.0 else "S")
		p_bench.position = Vector3(0.0, 0.0, dz)
		p.add_child(p_bench)
		var p_slots: Array[Vector3] = [Vector3(-0.52, 0.48, 0.0), Vector3(0.52, 0.48, 0.0)]
		_attach_seat_prop(p_bench, ip_script, "bench", "Banco de la pérgola", "[T] Sentarse a la sombra", p_slots, Vector3(0.0, 0.0, 1.0 if dz < 0.0 else -1.0), 0.22, "s" if dz < 0.0 else "n", false, 2.35)
	_add_box_collider(p, Vector3(0.0, 0.48, 0.0), Vector3(2.45, 0.96, 0.90))
	_tag_camera_occluder(p)
	_cyl(p, Vector3(-0.65, 0.94, -0.12), 0.14, 0.28, mat_pot)
	_cyl(p, Vector3(0.55, 0.90, 0.10), 0.18, 0.12, mat_brass)
	_cyl(p, Vector3(0.0, 2.75, 0.0), 0.12, 0.26, mat_flame)

static func _build_plaza_supply_corner(parent: Node3D, pos: Vector3, mat_oak: Material, mat_dark: Material, _mat_iron: Material, mat_paper: Material, ip_script: Script) -> void:
	var s := Node3D.new()
	s.name = "PlazaSupplyCorner"
	s.position = pos
	parent.add_child(s)
	_box(s, Vector3(-1.2, 1.1, -0.4), Vector3(1.35, 1.10, 0.12), mat_oak)
	_box(s, Vector3(-1.75, 0.85, -0.4), Vector3(0.14, 1.70, 0.14), mat_dark)
	_box(s, Vector3(-0.65, 0.85, -0.4), Vector3(0.14, 1.70, 0.14), mat_dark)
	_box(s, Vector3(-1.35, 1.15, -0.32), Vector3(0.38, 0.46, 0.02), mat_paper)
	_box(s, Vector3(-0.95, 1.08, -0.32), Vector3(0.34, 0.38, 0.02), mat_paper)
	_cyl(s, Vector3(0.3, 0.45, 0.2), 0.34, 0.90, mat_dark)
	_cyl(s, Vector3(1.05, 0.45, 0.35), 0.34, 0.90, mat_oak)
	_box(s, Vector3(0.65, 0.38, -0.45), Vector3(0.78, 0.76, 0.78), mat_oak)
	_box(s, Vector3(0.65, 0.98, -0.45), Vector3(0.56, 0.48, 0.56), mat_dark)
	_add_box_collider(s, Vector3(-1.2, 0.85, -0.4), Vector3(1.42, 1.70, 0.30))
	_add_cyl_collider(s, Vector3(0.3, 0.45, 0.2), 0.36, 0.95)
	_add_cyl_collider(s, Vector3(1.05, 0.45, 0.35), 0.36, 0.95)
	_add_box_collider(s, Vector3(0.65, 0.62, -0.45), Vector3(0.84, 1.24, 0.84))
	_tag_camera_occluder(s)
	var nb_anchor := Node3D.new()
	nb_anchor.name = "MonasteryNoticeboardAnchor"
	nb_anchor.position = Vector3(-1.2, 0.0, -0.3)
	s.add_child(nb_anchor)
	_attach_interactive_prop(nb_anchor, ip_script, "noticeboard", "Tablón del claustro", "[T] Leer tablón de avisos")

# ==============================================================================
# UTILIDADES INTERNAS AUTOCONTENIDAS
# ==============================================================================
static func _make_mat(builder: Node3D, col: Color, rough: float, metal: float) -> StandardMaterial3D:
	if builder != null and builder.has_method("_make_mat"):
		return builder.call("_make_mat", col, rough, metal) as StandardMaterial3D
	var m := StandardMaterial3D.new()
	m.albedo_color = col
	m.roughness = rough
	m.metallic = metal
	return m

static func _attach_interactive_prop(node: Node3D, ip_script: Script, kind: String, prop_name: String, hint: String, seat_off: Vector3 = Vector3.ZERO, facing: String = "s", toast: String = "") -> Node3D:
	if node == null or ip_script == null:
		return null
	var ip: Node3D = ip_script.new()
	ip.name = "Interactive_" + kind.capitalize()
	ip.set("prop_kind", kind)
	ip.set("display_name", prop_name)
	ip.set("interaction_hint", hint)
	ip.set("seat_offset", seat_off)
	ip.set("seat_facing", facing)
	ip.set("toast_text", toast)
	node.add_child(ip)
	return ip

static func _attach_seat_prop(node: Node3D, ip_script: Script, kind: String, prop_name: String, hint: String, slots: Array[Vector3], heading_local: Vector3, front_radius: float, facing: String = "s", face_approach: bool = false, radius: float = 2.45) -> Node3D:
	var ip := _attach_interactive_prop(node, ip_script, kind, prop_name, hint, slots[0] if not slots.is_empty() else Vector3(0.0, 0.48, 0.0), facing)
	if ip:
		ip.set("seat_slots_local", slots)
		ip.set("seat_heading_local", heading_local)
		ip.set("seat_front_radius", front_radius)
		ip.set("seat_face_approach", face_approach)
		ip.set("interact_radius", radius)
	return ip

static func _get_or_create_static_body(parent: Node3D) -> StaticBody3D:
	var existing := parent.get_node_or_null("StaticCollider") as StaticBody3D
	if existing:
		return existing
	var sb := StaticBody3D.new()
	sb.name = "StaticCollider"
	parent.add_child(sb)
	return sb

static func _add_box_collider(parent: Node3D, pos: Vector3, size: Vector3, yaw: float = 0.0) -> StaticBody3D:
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

static func _add_cyl_collider(parent: Node3D, pos: Vector3, radius: float, height: float) -> StaticBody3D:
	var sb := _get_or_create_static_body(parent)
	var col := CollisionShape3D.new()
	var cyl := CylinderShape3D.new()
	cyl.radius = radius
	cyl.height = height
	col.shape = cyl
	col.position = pos
	sb.add_child(col)
	return sb

static func _tag_camera_occluder(node: Node3D) -> void:
	if node and not node.is_in_group("camera_occluder"):
		node.add_to_group("camera_occluder")

static func _routine_pivot(parent: Node3D, id: String, local_position: Vector3) -> Node3D:
	var pivot := Node3D.new()
	pivot.position = local_position
	parent.add_child(pivot)
	return _routine_target(pivot, id)

static func _routine_target(node: Node3D, id: String) -> Node3D:
	node.name = id
	node.add_to_group("retreat_routine_props")
	node.add_to_group("dynamic_prop")
	return node

static func _collect_meshes(n: Node, out: Array[MeshInstance3D]) -> void:
	if n is MeshInstance3D:
		out.append(n)
	for ch in n.get_children():
		_collect_meshes(ch, out)

static func _xf_trs(pos: Vector3, rot_rad: Vector3, scl: Vector3) -> Transform3D:
	return Transform3D(Basis.from_euler(rot_rad).scaled_local(scl), pos)

static func _xf_trs_deg(pos: Vector3, rot_deg: Vector3, scl: Vector3) -> Transform3D:
	return Transform3D(Basis.from_euler(Vector3(deg_to_rad(rot_deg.x), deg_to_rad(rot_deg.y), deg_to_rad(rot_deg.z))).scaled_local(scl), pos)

static func _add_static_mm(parent: Node3D, mname: String, mesh: Mesh, mat: Material, xfs: Array[Transform3D], cast_shadow: bool) -> MultiMeshInstance3D:
	if xfs.is_empty():
		return null
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
	return mmi

static func _add_colored_mm(parent: Node3D, mname: String, mesh: Mesh, mat: Material, xfs: Array[Transform3D], cols: Array[Color]) -> void:
	if xfs.is_empty():
		return
	var use_col := not cols.is_empty()
	var resolved_mat: Material = mat
	if use_col and mat is BaseMaterial3D:
		var bm := (mat as BaseMaterial3D).duplicate() as BaseMaterial3D
		bm.vertex_color_use_as_albedo = true
		bm.vertex_color_is_srgb = true
		resolved_mat = bm
	var mm := MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	mm.use_colors = use_col
	mm.mesh = mesh
	mm.instance_count = xfs.size()
	for i in range(xfs.size()):
		mm.set_instance_transform(i, xfs[i])
		if use_col and i < cols.size():
			mm.set_instance_color(i, cols[i])
	var mmi := MultiMeshInstance3D.new()
	mmi.name = mname
	mmi.multimesh = mm
	mmi.material_override = resolved_mat
	mmi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parent.add_child(mmi)

static func _box(parent: Node3D, pos: Vector3, size: Vector3, mat: Material, shadow_on: bool = false) -> MeshInstance3D:
	var inst := MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = size
	inst.mesh = bm
	inst.material_override = mat
	inst.position = pos
	inst.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON if shadow_on else GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
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
