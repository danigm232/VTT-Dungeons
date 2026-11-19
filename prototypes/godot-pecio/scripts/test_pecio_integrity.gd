@tool
extends SceneTree

const PbrMaterialKit = preload("res://scripts/pbr_material_kit.gd")

func _initialize() -> void:
	var scene = load("res://scenes/main.tscn")
	if not scene:
		printerr("FAIL: main.tscn load error")
		quit(1)
		return
	var root_node = scene.instantiate()
	root.add_child(root_node)
	_verify.call_deferred(root_node)

func _verify(root_node: Node) -> void:
	var ok = true
	var hero_tok: Node3D = root_node.find_child("PlayerToken", true, false) as Node3D
	for name in ["Floor_AftCabins", "Floor_ForeCabins", "StairStringers", "Frames_AftUpper", "Frames_ForeUpper", "BreachP13Coaming"]:
		var node = root_node.find_child(name, true, false)
		if not node:
			printerr("FAIL: Missing required node ", name)
			ok = false
		else:
			print("OK node: ", name)

	for fl_name in ["Floor_AftCabins", "Floor_ForeCabins"]:
		var fl = root_node.find_child(fl_name, true, false)
		if fl:
			var has_col = false
			for ch in fl.get_children():
				if ch is StaticBody3D:
					has_col = true
					break
			if not has_col:
				printerr("FAIL: Missing StaticBody3D collision on ", fl_name)
				ok = false
			else:
				print("OK collision on: ", fl_name)

	var roof_ctrl = root_node.find_child("RoofCutout", true, false)
	var ship_vessel = root_node.find_child("ShipVessel", true, false)
	if roof_ctrl and ship_vessel:
		var c8_node = root_node.find_child("LowerDeck_C8", true, false)
		var aft_spine = root_node.find_child("Bulkhead_Spine_Aft", true, false)
		roof_ctrl.set_interior_mode("aft_c4_port", true)
		if aft_spine and aft_spine.visible:
			printerr("FAIL: Bulkhead_Spine_Aft should be hidden in aft_c4_port")
			ok = false
		roof_ctrl.set_interior_mode("lower_c9_hold", true)
		if c8_node and c8_node.visible:
			printerr("FAIL: LowerDeck_C8 should be hidden in lower_c9_hold")
			ok = false

		# Verificar grids multicubierta y recorte superior casco/oclusor
		var tgrid = root_node.find_child("TacticalGrid", true, false)
		for g_name in ["Grid_C1", "Grid_C2", "Grid_C3", "Grid_CabinsAft", "Grid_CabinsFore", "Grid_C8", "Grid_C9", "Grid_C10"]:
			if not tgrid or not tgrid.find_child(g_name, true, false):
				printerr("FAIL: Missing tactical grid layer ", g_name)
				ok = false

		var g_c1 = tgrid.find_child("Grid_C1", true, false) as Node3D if tgrid else null
		var g_c8 = tgrid.find_child("Grid_C8", true, false) as Node3D if tgrid else null
		var g_aft = tgrid.find_child("Grid_CabinsAft", true, false) as Node3D if tgrid else null
		var hull_up_aft_front = root_node.find_child("Hull_Upper_Aft_Front", true, false) as Node3D
		var hull_up_aft_port = root_node.find_child("Hull_Upper_Aft_Port", true, false) as Node3D
		var hull_core_occ = root_node.find_child("HullCoreOccluder", true, false) as Node3D

		roof_ctrl.set_interior_mode("lower_c8_bilge", true)
		if g_c1 and g_c1.visible:
			printerr("FAIL: Grid_C1 should be hidden in lower_c8_bilge")
			ok = false
		if g_c8 and not g_c8.visible:
			printerr("FAIL: Grid_C8 should be visible in lower_c8_bilge")
			ok = false
		if hull_core_occ and hull_core_occ.visible:
			printerr("FAIL: HullCoreOccluder should be hidden in lower_c8_bilge")
			ok = false

		roof_ctrl.set_interior_mode("aft_c4_port", true)
		if hull_up_aft_front and hull_up_aft_front.visible:
			printerr("FAIL: Hull_Upper_Aft_Front should hide in aft_c4_port")
			ok = false
		if hull_up_aft_port and not hull_up_aft_port.visible:
			printerr("FAIL: Hull_Upper_Aft_Port must remain visible in aft_c4_port")
			ok = false
		if g_aft and not g_aft.visible:
			printerr("FAIL: Grid_CabinsAft should be visible in aft_c4_port")
			ok = false

		roof_ctrl.set_interior_mode("exterior", true)
		if hull_core_occ and not hull_core_occ.visible:
			printerr("FAIL: HullCoreOccluder should be visible in exterior")
			ok = false

		# Nuevas aserciones: muro frontal inferior recortado, agua C8/C9, escaleras físicas, ocultación de tokens superiores
		var hull_front_low = root_node.find_child("HullStrakes_Front", true, false) as Node3D
		var c8_water = root_node.find_child("C8_FloodWater", true, false) as MeshInstance3D
		var c9_water = root_node.find_child("C9_WaterSurface", true, false) as MeshInstance3D
		var c9_caustics = root_node.find_child("C9_CausticsOverlay", true, false) as MeshInstance3D
		var wiz_tok = root_node.find_child("WizardToken", true, false) as Node3D
		var harpy_tok = root_node.find_child("HarpyToken", true, false) as Node3D
		hero_tok = root_node.find_child("PlayerToken", true, false) as Node3D

		roof_ctrl.set_interior_mode("lower_c8_bilge", true)
		var dbones = root_node.find_child("DragonBones", true, false) as Node3D
		if dbones and dbones.visible:
			printerr("FAIL: DragonBones must hide in lower_c8_bilge cutaway")
			ok = false
		var cw_front = root_node.find_child("Chainwales_Front", true, false) as Node3D
		if cw_front and cw_front.visible:
			printerr("FAIL: Chainwales_Front must hide in lower_c8_bilge cutaway")
			ok = false
		if hull_front_low and hull_front_low.visible:
			printerr("FAIL: HullStrakes_Front must hide in lower_c8_bilge cutaway")
			ok = false
		if wiz_tok and wiz_tok.visible:
			printerr("FAIL: WizardToken on C2 must hide during lower_c8_bilge")
			ok = false
		if harpy_tok and harpy_tok.visible:
			printerr("FAIL: HarpyToken on C10 must hide during lower_c8_bilge")
			ok = false
		if c8_water and not c8_water.is_visible_in_tree():
			printerr("FAIL: C8_FloodWater must be visible in lower_c8_bilge")
			ok = false

		roof_ctrl.set_interior_mode("lower_c9_hold", true)
		if not (c9_water and c9_water.is_visible_in_tree() and c9_caustics and c9_caustics.is_visible_in_tree()):
			printerr("FAIL: C9_WaterSurface & C9_CausticsOverlay must be visible in lower_c9_hold")
			ok = false

		roof_ctrl.set_interior_mode("fore_c6_port", true)
		if wiz_tok and wiz_tok.visible:
			printerr("FAIL: WizardToken on C2 above C6 must hide during fore_c6_port")
			ok = false

		roof_ctrl.set_interior_mode("exterior", true)
		if root_node.find_child("HatchC8", true, false):
			printerr("FAIL: Legacy teleport HatchC8 should be removed in favor of physical stairs")
			ok = false
		if hero_tok and not hero_tok.visible:
			printerr("FAIL: Active hero PlayerToken must remain visible in exterior")
			ok = false
		print("OK RoofCutout cutaway + multi-deck grid + upper entity hiding verified")
	else:
		printerr("FAIL: Missing RoofCutout or ShipVessel")
		ok = false

	# Capa 2 + 3 + 4 + Oclusiones
	for hull_req in [
		"Hull_Upper_Aft_Port", "Hull_Upper_Aft_Front", "Hull_Upper_Fore_Port", "Hull_Upper_Fore_Front",
		"Bulwark_Waist_Port", "Bulwark_Waist_Front", "GunwaleColliders", "BowBeakhead", "Bowsprit",
		"RudderBlade", "SternGallery", "C2_BrowBalustrade", "C3_BrowBalustrade", "SeabedTerrain", "Chain_C2",
		"HullStrakes_Front", "HullLowerColliders", "Stairs_C1_C8", "Stairs_C8_C9",
		"HullInner_Aft_Port", "HullInner_Fore_Port", "InteriorWall_Stern_C4", "InteriorWall_Stern_C5",
		"SideBoardingLadder", "Chainwales_Port", "Chainwales_Front", "SternBreachSplinters",
		"BowForepeakWall_Fore", "BreachP13Coaming_C8", "HullLowerStanchions_C8", "HullHoldStanchions_C9"
	]:
		if not root_node.find_child(hull_req, true, false):
			printerr("FAIL: Missing geometry node ", hull_req)
			ok = false
		else:
			print("OK node: ", hull_req)

	for col_owner in ["CaptainsDesk", "CaptainsBed", "OverturnedBookshelf", "GalleyStove", "GalleyCounter", "MessTable_C7", "CargoHatch_C1", "MastFifeRail", "Capstan_C2", "SteeringWheel_C3", "Binnacle_C3", "Rowboat", "Bunk_16", "AftCabins_C4_C5", "LowerDeck_C8", "SubmergedHold_C9"]:
		var owner_n := root_node.find_child(col_owner, true, false)
		var found_sb := owner_n is StaticBody3D if owner_n else false
		if owner_n and not found_sb:
			for c in owner_n.get_children():
				if c is StaticBody3D:
					found_sb = true
					break
		if not found_sb:
			printerr("FAIL: Missing StaticBody3D collider under ", col_owner)
			ok = false

	# Verificar material envejecido Kenney y bote navegable
	var rowboat := root_node.find_child("Rowboat", true, false)
	if not rowboat or not rowboat.has_method("board") or not rowboat.has_method("disembark"):
		printerr("FAIL: Rowboat must have RowboatController (board/disembark)")
		ok = false
	elif hero_tok:
		if rowboat.get_node_or_null("RetiroRowboatHull") == null:
			printerr("FAIL: Rowboat must use RetiroRowboatHull canonical mesh")
			ok = false
		if rowboat.find_child("paddles", true, false) != null:
			printerr("FAIL: Legacy static 'paddles' mesh must not exist alongside animated oars")
			ok = false
		if rowboat.oar_port == null or rowboat.oar_stbd == null:
			printerr("FAIL: Rowboat must expose exactly two mounted oar pivots (oar_port, oar_stbd)")
			ok = false
		else:
			if rowboat.oar_port.get_child_count() < 2 or rowboat.oar_stbd.get_child_count() < 2:
				printerr("FAIL: Both oars must mount shaft + blade (port=", rowboat.oar_port.get_child_count(), ", stbd=", rowboat.oar_stbd.get_child_count(), ")")
				ok = false
			var p_blade: Node3D = rowboat.oar_port.get_child(rowboat.oar_port.get_child_count() - 1) as Node3D
			var s_blade: Node3D = rowboat.oar_stbd.get_child(rowboat.oar_stbd.get_child_count() - 1) as Node3D
			print("INFO: Port blade global_pos=", p_blade.global_position, " Stbd blade global_pos=", s_blade.global_position)
			if p_blade.global_position.z >= rowboat.global_position.z or s_blade.global_position.z <= rowboat.global_position.z:
				printerr("FAIL: Oar blades must extend outward on opposite sides of hull (port_z=", p_blade.global_position.z, ", boat_z=", rowboat.global_position.z, ", stbd_z=", s_blade.global_position.z, ")")
				ok = false
		var rogue_tok := root_node.find_child("RogueToken", true, false)
		var wiz_tok := root_node.find_child("WizardToken", true, false)
		rowboat.board(hero_tok)
		if rogue_tok: rowboat.board(rogue_tok)
		if wiz_tok: rowboat.board(wiz_tok)
		if not hero_tok.in_boat or not rowboat.is_occupied or rowboat.riders.size() < 3 or rowboat.MAX_SEATS < 4:
			printerr("FAIL: Rowboat must fit 3-4 players simultaneously (riders=", rowboat.riders.size(), ", MAX_SEATS=", rowboat.MAX_SEATS, ")")
			ok = false
		if wiz_tok: rowboat.disembark(wiz_tok)
		if rogue_tok: rowboat.disembark(rogue_tok)
		rowboat.disembark(hero_tok)
		if hero_tok.in_boat or rowboat.is_occupied or not rowboat.riders.is_empty():
			printerr("FAIL: Rowboat.disembark() failed to release all passengers")
			ok = false
	var kenney_mat := PbrMaterialKit.get_kenney_material()
	if not (kenney_mat is ShaderMaterial):
		printerr("FAIL: PbrMaterialKit.get_kenney_material() must return weathered ShaderMaterial")
		ok = false

	if not ProjectSettings.get_setting("rendering/occlusion_culling/use_occlusion_culling"):
		printerr("FAIL: Occlusion culling disabled in project settings")
		ok = false

	var occ_count := _count_type(root_node, "OccluderInstance3D")
	if occ_count < 9:
		printerr("FAIL: Expected >= 9 OccluderInstance3D nodes, got ", occ_count)
		ok = false
	else:
		print("OK OccluderInstance3D count: ", occ_count)

	var hull_strakes := root_node.find_child("HullStrakes", true, false) as MeshInstance3D
	if hull_strakes and hull_strakes.mesh:
		var hmat := hull_strakes.mesh.surface_get_material(0)
		if not (hmat is ShaderMaterial):
			printerr("FAIL: HullStrakes material is not ShaderMaterial")
			ok = false
		else:
			var sm: ShaderMaterial = hmat
			if not (sm.get_shader_parameter("normal_tex") and sm.get_shader_parameter("roughness_tex") and sm.get_shader_parameter("ao_tex")):
				printerr("FAIL: HullStrakes ShaderMaterial missing normal/roughness/ao maps")
				ok = false
			else:
				print("OK HullStrakes ShaderMaterial PBR maps attached")

	var floor_aft := root_node.find_child("Floor_AftCabins", true, false) as MeshInstance3D
	if floor_aft and floor_aft.mesh:
		var fmat := floor_aft.mesh.surface_get_material(0) as StandardMaterial3D
		if not fmat or not fmat.normal_enabled or not fmat.roughness_texture or not fmat.ao_enabled:
			printerr("FAIL: Floor_AftCabins StandardMaterial3D missing full PBR maps")
			ok = false
		else:
			print("OK Floor_AftCabins StandardMaterial3D PBR maps attached")

	# Verificar objetos canónicos de camarotes C4–C7, puerta atrancada C4 y recorte de pickups en cubierta inferior
	for cname in [
		"PickupTorchC4", "PickupCartographerC4", "PickupDaggerC4", "PickupTorchC7",
		"C6_AleithaPortrait", "GalleyCrab_0", "GalleyCrab_1", "GalleyCrab_2",
		"C7_Chair_01", "C7_Chair_02", "C7_Chair_03", "C7_Chair_04",
		"PropBookshelfC4", "PropCounterC5", "PropPortraitC6", "PropChestC6",
		"C7_InteriorFill", "CaptainCarpet_C4"
	]:
		if not root_node.find_child(cname, true, false):
			printerr("FAIL: Missing canonical cabin node ", cname)
			ok = false
	var d_c4 := root_node.find_child("DoorC4", true, false)
	if not d_c4 or not d_c4.find_child("BarredDoorTimber", true, false):
		printerr("FAIL: DoorC4 missing canonical BarredDoorTimber")
		ok = false
	var carpet_c4 := root_node.find_child("CaptainCarpet_C4", true, false) as Node3D
	if carpet_c4 and carpet_c4.rotation.x >= 0.0:
		printerr("FAIL: CaptainCarpet_C4 slope sign should be negative (-atan(LIST_SLOPE)), got ", carpet_c4.rotation.x)
		ok = false
	for cofa_node in ["CrowsNestBulwark", "CrowsNestFuttockShrouds", "Cofa_LookoutLanternLight", "NestFibreBowl", "NestWovenTwigs", "NestBones", "NestFeathersDark", "SideBoardingLadder_Rungs"]:
		if not root_node.find_child(cofa_node, true, false):
			printerr("FAIL: Missing upgraded Cofa / boarding ladder node ", cofa_node)
			ok = false
	var harpy_tok := root_node.find_child("HarpyToken", true, false) as Node3D
	var mast_spar := root_node.find_child("MainMastSpar", true, false) as Node3D
	if harpy_tok and mast_spar:
		var mast_xz := Vector2(mast_spar.global_position.x, mast_spar.global_position.z)
		var harpy_xz := Vector2(harpy_tok.global_position.x, harpy_tok.global_position.z)
		if harpy_xz.distance_to(mast_xz) < 0.70:
			printerr("FAIL: HarpyToken clipped inside MainMastSpar! dist=", harpy_xz.distance_to(mast_xz))
			ok = false
	var boarding_mesh := root_node.find_child("SideBoardingLadder_Mesh", true, false) as MeshInstance3D
	if boarding_mesh and boarding_mesh.get_aabb().position.y < -1.85:
		printerr("FAIL: SideBoardingLadder_Mesh protrudes too deep underwater! min_y=", boarding_mesh.get_aabb().position.y)
		ok = false
	if roof_ctrl:
		roof_ctrl.set_interior_mode("lower_c8_bilge", true)
		for pname in ["PickupTorchC4", "PickupCartographerC4", "PickupDaggerC4", "PickupTorchC7"]:
			var pn := root_node.find_child(pname, true, false) as Node3D
			if pn and pn.visible:
				printerr("FAIL: Upper pickup must hide in lower_c8_bilge: ", pname)
				ok = false
		roof_ctrl.set_interior_mode("exterior", true)

	quit(0 if ok else 1)

func _count_type(node: Node, type_name: String) -> int:
	var n := 1 if node.get_class() == type_name else 0
	for ch in node.get_children():
		n += _count_type(ch, type_name)
	return n
