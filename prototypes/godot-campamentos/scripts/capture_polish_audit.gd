extends SceneTree

## Verification & Forward+ 1440x810 visual audit suite for:
## 1. Character sprite silhouette & lighting fix across ALL 5 campamentos
## 2. Refugio Cala Pleamar: thick 3D cave roof, multi-layered waterfall, zero puddle fish, shore swim & dive + marine ecosystem
## 3. Playa del Pecio: shore swim & dive + marine ecosystem + sprite lighting
## 4. Regression checks on A1 Rooms, Forest Pleamar, and Cliffs Observatory

const OUT_DIR := "C:/Users/User/Desktop/Dungeons/output/campamentos-aaa/06-polish-aquatic-audit"

var _pass_count := 0
var _fail_count := 0

func _check(cond: bool, label: String) -> void:
	if cond:
		_pass_count += 1
		print("  [PASS] " + label)
	else:
		_fail_count += 1
		printerr("  [FAIL] " + label)

func _snap(filename: String, frames: int = 8) -> void:
	for _i in range(frames):
		await process_frame
	var img := root.get_texture().get_image()
	if img:
		var path := OUT_DIR + "/" + filename
		var err := img.save_png(path)
		print("SHOT %s err=%d" % [filename, err])

func _set_cam(cam: Camera3D, focus: Vector3, dist: float, yaw_deg: float, pitch_deg: float) -> void:
	cam.is_overview = false
	cam.is_following = false
	cam.target_focus = focus
	cam.focus_point = focus
	cam.target_distance = dist
	cam.current_distance = dist
	cam.target_yaw = yaw_deg
	cam.current_yaw = yaw_deg
	cam.target_pitch = pitch_deg
	cam.current_pitch = pitch_deg
	cam.update_camera_transform()

func _load_camp(scene_path: String) -> Node:
	if current_scene:
		current_scene.queue_free()
		for _i in range(4):
			await process_frame
	var packed := load(scene_path) as PackedScene
	var inst := packed.instantiate()
	root.add_child(inst)
	current_scene = inst
	for _i in range(10):
		await process_frame
	return inst

func _initialize() -> void:
	DirAccess.make_dir_recursive_absolute(OUT_DIR)
	call_deferred("_run")

func _run() -> void:
	print("=== CAMPAMENTOS POLISH, SPRITE LIGHTING & AQUATIC AUDIT ===")

	# ------------------------------------------------------------------
	# 1. REFUGIO CALA PLEAMAR (camp-coastal-refuge)
	# ------------------------------------------------------------------
	var cove := await _load_camp("res://scenes/camp_coastal_refuge.tscn")
	var cam := cove.get_node("TacticalCamera") as Camera3D
	var ob: Node = cove.get("outdoor_builder")
	var tokens: Array = cove.get("party_tokens")
	var mia: CharacterBody3D = tokens[0] if tokens.size() > 0 else null
	var trn: CharacterBody3D = tokens[1] if tokens.size() > 1 else null
	var mike: CharacterBody3D = tokens[2] if tokens.size() > 2 else null

	# Check puddle fish removal!
	var puddle_fish := 0
	for fn_name in ["CaveFish_0", "CaveFish_1", "CaveFish_2"]:
		if cove.find_child(fn_name, true, false) != null:
			puddle_fish += 1
	_check(puddle_fish == 0, "Cala Pleamar: zero interior puddle fish (CaveFish_0/1/2 removed)")
	_check(cove.find_child("CoastalMarineEcosystem", true, false) != null, "Cala Pleamar: CoastalMarineEcosystem present")
	_check(cove.find_child("MM_DeepKelpForest", true, false) != null, "Cala Pleamar: Underwater kelp forest MultiMesh present")
	_check(cove.find_child("MM_SeaBranchCorals", true, false) != null, "Cala Pleamar: Branch corals MultiMesh present")
	_check(cove.find_child("CoastalMantaRay_0", true, false) != null, "Cala Pleamar: Manta rays present")
	_check(cove.find_child("WaterfallMistParticles", true, false) != null, "Cala Pleamar: Multi-layered waterfall mist particles present")

	# Move all 3 heroes cleanly onto sunlit cove sand to test closed cave mouth thick roof & sprite yaw lighting
	cove.set_env_time("day")
	cove.set_inspect_cutaway("")
	if mia: mia.global_position = Vector3(17.2, ob.eval_ground_height(17.2, 23.2) + 0.05, 23.2)
	if trn: trn.global_position = Vector3(19.0, ob.eval_ground_height(19.0, 23.5) + 0.05, 23.5)
	if mike: mike.global_position = Vector3(20.8, ob.eval_ground_height(20.8, 23.1) + 0.05, 23.1)
	for _f in range(10):
		await physics_frame

	# Shot 01: Cave mouth thick 3D rock roof closeup (pitch 12 deg, yaw 0 deg)
	_set_cam(cam, Vector3(18.5, 2.2, 20.5), 18.0, 0.0, 12.0)
	await _snap("01_cove_mouth_thick_roof.png", 10)

	# Shot 02: Wide overview showing western trail, thick cliff cave roof, cove, underwater marine flora, outer reef & buoys
	_set_cam(cam, Vector3(18.5, 1.0, 27.5), 34.0, -8.0, 22.0)
	await _snap("02_cove_overview_day.png", 10)

	# Shot 03: Tight sprite closeup on Mia + Trinity + Mike at yaw=+25 deg (EXACT angle of user's uploaded bug screenshot!)
	_set_cam(cam, Vector3(19.0, 1.05, 23.2), 7.8, 25.0, 16.0)
	for _f in range(12):
		await physics_frame
	var sil_leak := false
	for tok in [mia, trn, mike]:
		if tok and tok.get("silhouette_mesh") and tok.silhouette_mesh.visible:
			sil_leak = true
	_check(not sil_leak, "Cala Pleamar: unoccluded heroes have ZERO false occlusion silhouette bleed at yaw=+25 deg")
	await _snap("03_sprite_closeup_yaw25_clean.png", 10)

	# Shot 04: Dusk all-chambers cutaway (thick rock walls/rims, hearth, natural pools without fish)
	cove.set_env_time("dusk")
	cove.set_inspect_cutaway("cave_all")
	_set_cam(cam, Vector3(18.5, 1.0, 14.5), 24.0, 0.0, 24.0)
	await _snap("04_cave_cutaway_all_dusk.png", 10)

	# Shot 05: Close-up of the upgraded multi-layered natural waterfall & eastern mineral spring grotto!
	_set_cam(cam, Vector3(30.4, 1.25, 13.0), 9.2, -18.0, 15.0)
	await _snap("05_waterfall_spring_closeup.png", 10)

	# Shot 06: Functional shore wading -> swimming -> diving test in Cala Pleamar!
	cove.set_env_time("day")
	cove.set_inspect_cutaway("")
	if mia:
		# A) Shore wading
		var wy_wade: float = float(ob.sample_aquatic_floor_height(18.0, 30.8))
		mia.global_position = Vector3(18.0, wy_wade + 0.05, 30.8)
		for _i in range(10):
			await physics_frame
		_check(bool(mia.in_water), "Cala Pleamar: hero enters shallow wading water at shore (y=%.2f)" % mia.global_position.y)

		# B) Deep swimming at surface
		var wy_swim: float = float(ob.sample_aquatic_floor_height(18.5, 38.5))
		mia.global_position = Vector3(18.5, ob.get_sea_level_y() - 0.35, 38.5)
		if trn: trn.global_position = Vector3(15.2, ob.sample_aquatic_floor_height(15.2, 31.0) + 0.05, 31.0)
		for _i in range(20):
			await physics_frame
		_check(bool(mia.in_deep_water) and bool(mia.aquatic.surface_available), "Cala Pleamar: deep cove swimming & dive available (seabed=%.2f)" % wy_swim)
		_set_cam(cam, Vector3(18.5, 0.1, 37.5), 14.5, 10.0, 20.0)
		await _snap("06_cove_swim_surface.png", 10)

		# C) Dive underwater with toggle_dive() (KEY_U)!
		var dive_ok: bool = mia.toggle_dive()
		_check(dive_ok, "Cala Pleamar: toggle_dive() activates underwater diving")
		for _i in range(45):
			await physics_frame
		_check(bool(mia.aquatic.submerged) and mia.global_position.y < -1.15, "Cala Pleamar: hero dives below -1.15m smoothly (y=%.2f)" % mia.global_position.y)
		_set_cam(cam, Vector3(18.5, -1.0, 39.5), 13.0, -12.0, 22.0)
		await _snap("07_cove_diving_underwater_reef.png", 10)

		# D) Sea current boundary check
		var push_chan: Vector3 = ob.sample_sea_current_push(Vector3(18.5, -1.0, 50.8))
		_check(push_chan.z < -1.5, "Cala Pleamar: outer sea channel current pushes back into cove (z=%.2f)" % push_chan.z)

		# E) Emerge back to surface
		_check(mia.toggle_dive(), "Cala Pleamar: toggle_dive() emerges back to surface")
		for _i in range(35):
			await physics_frame
		_check(not bool(mia.aquatic.submerged), "Cala Pleamar: hero returns to surface swimming (y=%.2f)" % mia.global_position.y)

	# Shot 08: Night cutaway showing character lighting near hearth & glowing spring
	cove.set_env_time("night")
	cove.set_inspect_cutaway("cave_all")
	if mia: mia.global_position = Vector3(17.5, 0.05, 15.6)
	if mike:
		mike.global_position = Vector3(20.2, 0.05, 15.8)
		mike.set_torch_mode(true, false)
	for _f in range(10):
		await physics_frame
	_set_cam(cam, Vector3(18.8, 0.9, 15.8), 11.5, 18.0, 16.0)
	await _snap("08_cove_night_sprite_hearth_lighting.png", 10)

	# ------------------------------------------------------------------
	# 2. PLAYA DEL PECIO (camp-wreck-beach)
	# ------------------------------------------------------------------
	var beach := await _load_camp("res://scenes/camp_wreck_beach.tscn")
	var bcam := beach.get_node("TacticalCamera") as Camera3D
	var bob: Node = beach.get("outdoor_builder")
	var btoks: Array = beach.get("party_tokens")
	var b_mia: CharacterBody3D = btoks[0] if btoks.size() > 0 else null
	beach.set_env_time("day")
	_check(beach.find_child("CoastalMarineEcosystem", true, false) != null, "Playa del Pecio: CoastalMarineEcosystem present")
	if b_mia:
		b_mia.global_position = Vector3(19.0, bob.get_sea_level_y() - 0.35, 36.5)
		for _i in range(15):
			await physics_frame
		_check(bool(b_mia.in_deep_water) and bool(b_mia.aquatic.surface_available), "Playa del Pecio: deep bay swimming & dive available")
		b_mia.toggle_dive()
		for _i in range(42):
			await physics_frame
		_check(bool(b_mia.aquatic.submerged) and b_mia.global_position.y < -1.15, "Playa del Pecio: underwater diving works (y=%.2f)" % b_mia.global_position.y)
	_set_cam(bcam, Vector3(22.0, -0.4, 34.5), 24.0, 12.0, 22.0)
	await _snap("09_wreck_beach_dive_and_marine.png", 10)

	# ------------------------------------------------------------------
	# 3. CROSS-CAMP SPRITE LIGHTING & REGRESSION CHECKS (A1, Forest, Cliffs)
	# ------------------------------------------------------------------
	var a1 := await _load_camp("res://scenes/camp_a1_rooms.tscn")
	var a1_cam := a1.get_node("TacticalCamera") as Camera3D
	a1.set_env_time("day")
	var a1_toks: Array = a1.get("party_tokens")
	var a1_focus: Vector3 = a1_toks[0].global_position + Vector3(0.0, 0.9, 0.0) if not a1_toks.is_empty() else Vector3(36.0, 1.0, 24.0)
	_set_cam(a1_cam, a1_focus, 11.0, 22.0, 17.0)
	await _snap("10_a1_rooms_sprite_lighting.png", 10)

	var forest := await _load_camp("res://scenes/camp_forest_pleamar.tscn")
	var f_cam := forest.get_node("TacticalCamera") as Camera3D
	forest.set_env_time("dusk")
	var f_toks: Array = forest.get("party_tokens")
	var f_focus: Vector3 = f_toks[0].global_position + Vector3(0.0, 0.9, 0.0) if not f_toks.is_empty() else Vector3(18.0, 1.0, 16.5)
	_set_cam(f_cam, f_focus, 12.0, -22.0, 18.0)
	await _snap("11_forest_pleamar_regression_yaw22.png", 10)

	var cliffs := await _load_camp("res://scenes/camp_cliffs_observatory.tscn")
	var c_cam := cliffs.get_node("TacticalCamera") as Camera3D
	cliffs.set_env_time("dusk")
	var c_toks: Array = cliffs.get("party_tokens")
	var c_focus: Vector3 = c_toks[0].global_position + Vector3(0.0, 0.9, 0.0) if not c_toks.is_empty() else Vector3(18.5, 1.0, 15.0)
	_set_cam(c_cam, c_focus, 12.0, 24.0, 18.0)
	await _snap("12_cliffs_observatory_lighting.png", 10)

	print("=== AUDIT COMPLETE: PASS=%d FAIL=%d ===" % [_pass_count, _fail_count])
	quit(0 if _fail_count == 0 else 1)
