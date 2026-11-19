extends SceneTree

const PecioWorldState = preload("res://scripts/pecio_world_state.gd")
const Structure = preload("res://scripts/wreck_structure.gd")

var failures: Array[String] = []
var passed := 0
var main: Node3D
var vessel: Node3D

func _initialize() -> void:
	_run.call_deferred()

func check(condition: bool, message: String) -> void:
	if condition:
		passed += 1
	else:
		failures.append(message)
		printerr("FAIL ", message)

func _ray(a_local: Vector3, b_local: Vector3) -> Dictionary:
	return main.get_world_3d().direct_space_state.intersect_ray(
		PhysicsRayQueryParameters3D.create(vessel.to_global(a_local), vessel.to_global(b_local))
	)

func _run() -> void:
	seed(18112026)
	main = load("res://scenes/main.tscn").instantiate() as Node3D
	root.add_child(main)
	await process_frame
	await process_frame
	await physics_frame
	await physics_frame

	vessel = main.find_child("ShipVessel", true, false) as Node3D
	var vtt_ui = main.find_child("VttRoleUi", true, false)
	var inv_mgr = main.find_child("InventoryManager", true, false)
	var hero = main.find_child("PlayerToken", true, false) as Node3D

	# Test isolation: back PecioWorldState by a clean temp file removed at exit
	var tmp_save := "user://test-pecio-world-state-tmp.cfg"
	if vtt_ui:
		vtt_ui.set_meta("capture_hidden", true)
		vtt_ui.world_state = PecioWorldState.new(tmp_save, true)
		vtt_ui.world_state.reset_defaults()

	# --------------------------------------------------------------------------
	# ZONA 2: C3 PUESTO DE MANDO
	# --------------------------------------------------------------------------
	var wheel_root := main.find_child("SteeringWheel_C3", true, false) as Node3D
	var wheel_pivot := main.find_child("HelmWheelPivot", true, false) as Node3D
	var helm_ctrl = main.find_child("PropWheelC3", true, false)
	var mizzen_root := main.find_child("BrokenMizzenMast_C3", true, false) as Node3D
	var narrative_root := main.find_child("C3_AgingAndNarrative", true, false) as Node3D

	check(wheel_root != null and wheel_pivot != null and helm_ctrl != null, "C3 helm nodes present")
	check(mizzen_root != null and mizzen_root.find_child("MizzenSplintersInner", true, false) != null, "C3 broken spear mizzen stump present")
	check(narrative_root != null and narrative_root.find_child("HelmRustedHardware_C3", true, false) != null and narrative_root.find_child("SeaBoots_C3", true, false) != null, "C3 aging & narrative details present")

	# Timón inicialmente torcido / descentrado
	if wheel_pivot:
		check(wheel_pivot.rotation_degrees.length() > 10.0 and wheel_pivot.position.x > 0.25, "C3 helm starts crooked and offset")
		var labels := wheel_pivot.find_children("*", "Label3D", false, false)
		check(labels.size() >= 30, "C3 wheel has curved double-sided inlay glyphs (%d)" % labels.size())
		var all_inverted := true
		for lbl: Label3D in labels:
			var rad_out := Vector3(0.0, lbl.position.y, lbl.position.z).normalized()
			var up_glyph := lbl.basis.y.normalized()
			if up_glyph.dot(rad_out) > -0.75:
				all_inverted = false
				break
		check(all_inverted and not labels.is_empty(), "C3 'Rosa de los Vientos' letters oriented upside down (180 deg)")

	# Examinar sin alterar el estado del timón
	if helm_ctrl:
		helm_ctrl.examine_helm()
		check(helm_ctrl.helm_state == "attached" and not helm_ctrl.c4_zombies_alerted, "C3 examine leaves helm attached and C4 unalerted")

		# Girar con salvación DES CD 10 SUPERADA
		var res_pass: Dictionary = helm_ctrl.attempt_turn_helm(15)
		await create_timer(0.6).timeout
		check(bool(res_pass.get("success", false)) and helm_ctrl.helm_state == "caught" and not helm_ctrl.c4_zombies_alerted, "C3 turn DEX pass detaches & catches helm quietly")

		# Reiniciar y girar con salvación FALLIDA -> caída + alerta C4 + timer 10-15s
		helm_ctrl.reset_helm_to_attached()
		check(helm_ctrl.helm_state == "attached", "C3 DM helm reset restores attached")
		var res_fail: Dictionary = helm_ctrl.attempt_turn_helm(2)
		await create_timer(0.45).timeout
		check((not bool(res_fail.get("success", true))) and helm_ctrl.helm_state == "fallen" and helm_ctrl.c4_zombies_alerted, "C3 turn DEX fail drops helm and alerts C4 zombies")
		var bang_timer := helm_ctrl.find_child("C4BangRepeatTimer", true, false) as Timer
		check(bang_timer != null and not bang_timer.is_stopped() and bang_timer.wait_time >= 2.0 and bang_timer.wait_time <= 15.0, "C4 zombie bang loop timer running")
		helm_ctrl.trigger_c4_bang_pulse()
		# Verifica el rango 10-15 s explícito tras arranque normal
		helm_ctrl.start_c4_bang_loop(false)
		check(bang_timer.wait_time >= 10.0 and bang_timer.wait_time <= 15.0, "C4 steady repeat cadence is strictly 10-15 s (got %.2f)" % bang_timer.wait_time)

	# Persistencia de guardado y carga sin duplicación / reinicio accidental
	var ws_reload := PecioWorldState.new(tmp_save, true)
	check(ws_reload.load_state(), "PecioWorldState loads persisted cfg")
	check(ws_reload.helm_state == "fallen" and ws_reload.c4_zombies_alerted, "C3 fallen helm & C4 alert survive save/reload")

	# --------------------------------------------------------------------------
	# ZONA 1: C1 COFA DE LA ARPÍA / C10
	# --------------------------------------------------------------------------
	check(is_equal_approx(Structure.CROW_HEIGHT, 15.0), "Cofa remains at canonical 15m height")
	var cofa := main.find_child("CrowsNest_P10", true, false) as Node3D
	check(cofa != null and cofa.find_child("MastFloorCollar", true, false) != null, "Cofa mast-floor collar repaired")
	check(main.find_child("CrowsNestRopeLadder_Ropes", true, false) != null and main.find_child("CrowsNestRopeLadder_Rungs", true, false) != null, "Cofa 15m hanging rope ladder built")

	# Escudo/nido PDF completo + arquitectura MultiMesh + cero colisiones en ramas decorativas
	for nname in ["NestWoodShavings", "NestStrawBundles", "NestDryGrassBase", "NestSailRags", "NestBones", "NestHairTufts", "NestTreasures_C10", "NestFeathersRust", "NestPreyClothScraps", "NestAmbianceController"]:
		check(main.find_child(nname, true, false) != null, "Cofa PDF nest element present: " + nname)
	var nest_zone := main.find_child("Zone_C10_CrowsNest", true, false) as Node3D
	check(nest_zone != null and nest_zone.find_children("*", "CollisionShape3D", true, false).size() <= 1, "Cofa decorative nest twigs/straw have NO physical colliders (only PropHarpyNestC10 trigger)")
	var treasures_n := main.find_child("NestTreasures_C10", true, false) as Node3D
	check(treasures_n != null and treasures_n.get_child_count() == 5, "Cofa nest represents all 5 canonical PDF treasures individually")
	var mm_twigs := main.find_child("NestWovenTwigs", true, false)
	var total_mm := 0
	if nest_zone:
		for mm: MultiMeshInstance3D in nest_zone.find_children("*", "MultiMeshInstance3D", false, false):
			if mm.multimesh:
				total_mm += mm.multimesh.instance_count
	check(mm_twigs is MultiMeshInstance3D and total_mm > 350, "Cofa branch/straw library instanced via MultiMeshInstance3D (total=%d)" % total_mm)
	var nest_amb = main.find_child("NestAmbianceController", true, false)
	if nest_amb:
		nest_amb.play_harpy_landing()
		nest_amb._apply_rim_occlusion(0.28)
		check(nest_amb.sway_materials.size() >= 2 and nest_amb.front_rim_nodes.size() >= 1, "Nest wind sway & 2.5D camera rim occlusion configured")

	# Entrada libre vs barandilla cerrada en perímetro
	var notch_a := 3.0 / 16.0 * TAU
	var notch_in := Vector3(0.35 + cos(notch_a) * 1.9, 15.55, -0.48 + sin(notch_a) * 1.9)
	var notch_out := Vector3(0.35 + cos(notch_a) * 3.1, 15.55, -0.48 + sin(notch_a) * 3.1)
	check(_ray(notch_in, notch_out).is_empty(), "Cofa ladder climb notch is clear of guardrail collision")
	var rail_a := PI
	var rail_in := Vector3(0.35 + cos(rail_a) * 2.1, 15.55, -0.48 + sin(rail_a) * 2.1)
	var rail_out := Vector3(0.35 + cos(rail_a) * 3.1, 15.55, -0.48 + sin(rail_a) * 3.1)
	check(not _ray(rail_in, rail_out).is_empty(), "Cofa perimeter guardrail blocks accidental fall")
	check(not _ray(Vector3(1.2, 15.6, 0.2), Vector3(1.2, 14.5, 0.2)).is_empty(), "Cofa floor supports exploration & combat")

	# Balanceo progresivo del mástil al subir sin romper cámara
	var ladder_cofa = main.find_child("LadderCofa", true, false)
	var mast_rig := main.find_child("MainMastRigging", true, false) as Node3D
	if ladder_cofa and hero and mast_rig:
		hero.position = ladder_cofa.position
		ladder_cofa.nearby_player = hero
		ladder_cofa.is_player_nearby = true
		var cam := main.get_node("TacticalCamera") as Camera3D
		var cam_roll_before := cam.rotation_degrees.z
		ladder_cofa.execute_transition()
		await create_timer(0.32).timeout
		var rot_mid := mast_rig.rotation_degrees.length()
		var cam_roll_mid := cam.rotation_degrees.z
		await create_timer(0.90).timeout
		check(rot_mid > 0.05, "Mast sways progressively during 15m climb (mid rot=%.3f)" % rot_mid)
		check(is_equal_approx(mast_rig.rotation_degrees.length(), 0.0), "Mast returns cleanly upright after climb")
		check(hero.position.y > 14.5, "Hero arrives on crow's nest deck after climb")
		check(cam.get_parent() != mast_rig and is_equal_approx(cam_roll_before, cam_roll_mid), "Camera remains decoupled and unjarring during mast sway")

	# Tesoro canónico del nido sin duplicación al guardar/cargar
	var prop_nest = main.find_child("PropHarpyNestC10", true, false)
	var pick_gems = main.find_child("PickupGemsCofa", true, false)
	if prop_nest and inv_mgr and vtt_ui:
		prop_nest.interact()
		check(treasures_n != null and not treasures_n.visible, "Cofa treasures hide from nest after looting")
		check(inv_mgr.items["gold_bracelet_c10"]["count"] == 1, "Cofa treasure 3.1: gold bracelet 25 po x1")
		check(inv_mgr.items["gold_earring_c10"]["count"] == 1, "Cofa treasure 3.2: single gold earring 25 po x1")
		check(inv_mgr.items["tiger_eye_gem_c10"]["count"] == 2, "Cofa treasure 3.3: 2x tiger's-eye gems 10 po")
		check(inv_mgr.items["bloodstone_gem_c10"]["count"] == 1, "Cofa treasure 3.4: 1x heliotrope gem 50 po")
		# Segunda interacción y recarga no deben duplicar
		prop_nest.interact()
		if pick_gems and pick_gems.has_method("collect"):
			pick_gems.collect()
		check(inv_mgr.items["gold_bracelet_c10"]["count"] == 1 and inv_mgr.items["tiger_eye_gem_c10"]["count"] == 2, "Cofa second search/pickup does NOT duplicate loot")
		var ws_nest_reload := PecioWorldState.new(tmp_save, true)
		ws_nest_reload.load_state()
		check(ws_nest_reload.c10_nest_looted and not ws_nest_reload.mark_c10_nest_looted(), "Cofa nest looted state persists & blocks duplication across save/load")

	# Estado de presencia / ausencia de la arpía según aventura
	var harpy_tok := main.find_child("HarpyToken", true, false) as Node3D
	var cutout = main.find_child("RoofCutout", true, false)
	if vtt_ui and harpy_tok:
		vtt_ui.set_harpy_present(false)
		check(not harpy_tok.visible, "DM toggles harpy absent -> hidden")
		if cutout:
			cutout.set_interior_mode("exterior", true)
			check(not harpy_tok.visible, "RoofCutout exterior preserves absent harpy adventure state")
		vtt_ui.set_harpy_present(true)
		if cutout:
			cutout.set_interior_mode("exterior", true)
			check(harpy_tok.visible, "DM toggles harpy present -> visible")

	# Limpieza de fichero temporal de prueba
	DirAccess.remove_absolute(ProjectSettings.globalize_path(tmp_save))

	print("VERIFY_C1_C3_RESULT passed=%d failed=%d" % [passed, failures.size()])
	quit(0 if failures.is_empty() else 1)
