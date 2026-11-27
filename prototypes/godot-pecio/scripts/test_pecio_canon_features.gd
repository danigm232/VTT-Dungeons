extends SceneTree

# Verificación integral de todas las mejoras canónicas Cap. 3 (Parte A y Parte B)
# y los 8 requisitos adicionales del usuario (trampas C1, esqueletos, fauna viva,
# choques de olas, reforma C8 + chapoteos + brechas de huesos C1/C8, pickups VTT,
# faroles apagados por defecto y velas ampliadas con desgarros verticales).

const PecioWorldState = preload("res://scripts/pecio_world_state.gd")

var passed: int = 0
var failures: Array[String] = []

func _initialize() -> void:
	_run.call_deferred()

func check(cond: bool, msg: String) -> void:
	if cond:
		passed += 1
	else:
		failures.append(msg)
		printerr("FAIL: ", msg)

func _run() -> void:
	seed(24112026)
	var main := load("res://scenes/main.tscn").instantiate() as Node3D
	root.add_child(main)
	await process_frame
	await process_frame
	await physics_frame
	await physics_frame

	var vessel := main.find_child("ShipVessel", true, false) as Node3D
	var vtt_ui = main.find_child("VttRoleUi", true, false)
	var canon = main.find_child("PecioCanonController", true, false)
	var inv = main.find_child("InventoryManager", true, false)
	var roof = main.find_child("RoofCutout", true, false)
	var env = main.find_child("ShipEnvironment", true, false)
	var vfx = main.find_child("Vfx", true, false)
	var hero := main.find_child("PlayerToken", true, false) as CharacterBody3D

	check(canon != null, "PecioCanonController instantiated")
	var tmp_save := "user://test-pecio-canon-features-tmp.cfg"
	if vtt_ui:
		vtt_ui.world_state = PecioWorldState.new(tmp_save, true)
		vtt_ui.world_state.reset_defaults()
		canon._post_ready_sync()

	# 1. Parte A: Bestiario canónico completo (Zombis C4, Gul C8 marcado Codex, Nivel 2)
	for tok_nm in ["ZombieC4_A", "ZombieC4_B", "ZombieC4_C_Lvl2", "GhoulToken", "ZombieC8_B_Lvl2", "ZombieC8_C_Lvl2", "HarpyToken_C2"]:
		check(vessel.get_node_or_null(tok_nm) != null, "Canonical creature spawned: " + tok_nm)
	var ghoul := vessel.get_node_or_null("GhoulToken")
	check(ghoul != null and ghoul.char_profile.get("npc_species","") == "ghoul", "C8 uses the ghoul's registered appearance")
	check(vtt_ui.combat_controller.rules.actors.has("harpy_c2_lvl2") and not vtt_ui.combat_controller.rules.actors.has("harpy-2"), "C2 registers one reinforcement")

	var z4_lvl2 := vessel.get_node_or_null("ZombieC4_C_Lvl2") as Node3D
	check(z4_lvl2 != null and not z4_lvl2.visible, "Level 2 reinforcements hidden at Level 1")
	canon.apply_party_level(2, true)
	check(z4_lvl2.visible and bool(z4_lvl2.get_meta("adventure_present", false)), "Level 2 toggle reveals C4/C8/C2 reinforcements")
	canon.apply_party_level(1, true)
	check(not z4_lvl2.visible, "Level 1 toggle hides Level 2 reinforcements")

	# 2. Parte B: Puerta atrancada C4 (CD 10, >1 fallo alerta a C4, éxito quita tranca)
	var door_c4 = main.find_child("DoorC4", true, false)
	check(door_c4 != null and not door_c4.is_open, "DoorC4 starts closed & barred")
	canon.resolve_c4_barred_door(door_c4, false)
	check(not vtt_ui.world_state.c4_zombies_alerted and vtt_ui.world_state.c4_door_fail_count == 1, "First C4 door fail does not alert yet")
	canon.resolve_c4_barred_door(door_c4, false)
	check(vtt_ui.world_state.c4_zombies_alerted and vtt_ui.world_state.c4_door_fail_count == 2, "Second C4 door fail alerts C4 zombies")
	canon.resolve_c4_barred_door(door_c4, true)
	check(door_c4.is_open and door_c4.has_bar_removed and vtt_ui.world_state.c4_door_unbarred, "Success unbars and opens DoorC4")

	# 3. C4 escritorio/cajones/brújula + Daga normal + anti-duplicado + C5 cangrejos + C6 retrato canónico + C6 trampa de aguja 200 po
	var gold_pre_c4: int = int(inv.items["gold"]["count"])
	var pick_comp_c4 := main.find_child("PickupCompassC4", true, false)
	if pick_comp_c4 and pick_comp_c4.has_method("collect"):
		pick_comp_c4.collect()
	var comp_after_pickup: int = int(inv.items["compass"]["count"])
	canon._loot_c4_compass()
	check(int(inv.items["compass"]["count"]) == comp_after_pickup and comp_after_pickup == 1, "C4 compass pickup + desk modal does not duplicate compass")
	canon._loot_c4_drawers()
	canon._loot_c4_drawers()
	check(int(inv.items["gold"]["count"]) == gold_pre_c4 + 50 and inv.items["cartographer_tools"]["count"] >= 1 and inv.items["dagger"]["count"] >= 1, "C4 desk drawers looted cleanly without duplication")
	check(str(inv.items["dagger"]["name"]) == "Daga", "Dagger name is canonical 'Daga' (not silver)")
	var pick_dag = main.find_child("PickupDaggerC4", true, false)
	check(pick_dag != null and str(pick_dag.item_name) == "Daga (C4)", "PickupDaggerC4 renamed to canonical Daga")
	check(main.find_child("GalleyCrab_0", true, false) != null and main.find_child("GalleyCrab_2", true, false) != null, "C5 crabs named GalleyCrab_*")
	canon.trigger_c5_crabs_scatter()

	# Retrato canónico de Aleitha y Brastos en C6 (trigger a altura de suelo, handout modal, aplique, descolgar/colgar y persistencia)
	var portrait_root := main.find_child("C6_AleithaPortrait", true, false) as Node3D
	var prop_portrait := main.find_child("PropPortraitC6", true, false) as Node3D
	check(portrait_root != null and prop_portrait != null, "C6 canonical portrait & PropPortraitC6 present")
	if prop_portrait:
		var port_loc := vessel.to_local(prop_portrait.global_position)
		check(port_loc.y < 0.85, "PropPortraitC6 trigger positioned at reachable floor height (y=%.2f)" % port_loc.y)
		prop_portrait.interact()
	check(vtt_ui.world_state.c6_portrait_examined, "Interacting with PropPortraitC6 marks portrait examined")
	var portrait_canvas := portrait_root.get_node_or_null("PortraitHangingCanvas") as Node3D if portrait_root else null
	var portrait_mark := portrait_root.get_node_or_null("PortraitWallMark") as Node3D if portrait_root else null
	check(portrait_canvas != null and portrait_canvas.visible and portrait_mark != null and not portrait_mark.visible, "C6 portrait starts hung on bulkhead")
	canon.take_or_hang_c6_portrait(true)
	check(vtt_ui.world_state.c6_portrait_taken and int(inv.items["aleitha_portrait"]["count"]) == 1 and not portrait_canvas.visible and portrait_mark.visible, "Taking C6 portrait moves it to inventory and leaves wall mark")
	canon.take_or_hang_c6_portrait(false)
	check(not vtt_ui.world_state.c6_portrait_taken and int(inv.items["aleitha_portrait"]["count"]) == 0 and portrait_canvas.visible and not portrait_mark.visible, "Re-hanging C6 portrait restores canvas on bulkhead")
	var sconce_l := main.find_child("C6_PortraitSconceLight", true, false) as OmniLight3D
	check(sconce_l != null and is_equal_approx(sconce_l.light_energy, 0.0), "C6 portrait sconce starts OFF")
	canon.toggle_lantern("C6_PortraitSconceLight")
	check(sconce_l != null and sconce_l.light_energy > 0.3, "C6 portrait sconce toggles ON via canon controller")

	# C7 props separados en extremos opuestos de la mesa + reenvío de notificaciones en modo VTT
	var prop_log_c7 := main.find_child("PropLogC7", true, false) as Node3D
	var prop_plates_c7 := main.find_child("PropPlatesC7", true, false) as Node3D
	check(prop_log_c7 != null and prop_plates_c7 != null and prop_log_c7.position.distance_to(prop_plates_c7.position) >= 1.5, "C7 logbook and tableware props separated on opposite ends of table")
	inv.set_external_ui_managed(true)
	inv.show_notification("Prueba notificación VTT")
	check(vtt_ui.toast_timer > 4.0, "InventoryManager.show_notification forwards to VttRoleUi toast when external_ui_managed")

	var trap_needle := main.find_child("TrapNeedleC6", true, false) as Node3D
	var loose_plank := main.find_child("LoosePlankMeshC6", true, false) as Node3D
	check(trap_needle != null and not trap_needle.visible and loose_plank != null and loose_plank.position.y < 0.035, "C6 needle trap hidden and plank flush until discovered")
	canon._discover_c6_stash()
	check(trap_needle.visible and loose_plank.position.y > 0.04 and vtt_ui.world_state.c6_stash_state == "discovered", "C6 needle trap visible and plank physically lifted once discovered")
	var gold_before_c6: int = int(inv.items["gold"]["count"])
	canon._open_c6_safe_distance()
	check(int(inv.items["gold"]["count"]) == gold_before_c6 + 200 and vtt_ui.world_state.c6_stash_state == "looted", "C6 safe distance triggers dart & grants 200 real gold")

	# 4. C8 cajas + barriles saqueables 1d6 únicos + C9 cofre hierro + bolsas de aire + P12/P13/P14/P16 + regreso/resolución arpía + epílogo
	for i in range(5):
		check(main.find_child("PropC8Crate_%d" % i, true, false) != null, "C8 lootable crate #%d present" % i)
	for bi in range(4):
		check(main.find_child("PropC8Barrel_%d" % bi, true, false) != null, "C8 lootable barrel #%d present" % bi)
	canon.resolve_c8_crate("c8_crate_0", 1)
	canon.resolve_c8_crate("c8_crate_1", 1) # repetido -> mercancía podrida
	canon.resolve_c8_crate("c8_crate_2", 3)
	check(inv.items["c8_fine_wine"]["count"] == 1 and inv.items["c8_silver_ingots"]["count"] == 1, "C8 1d6 unique crate rolls grant canonical items once")
	check(vtt_ui.world_state.c8_rolled_results.size() == 2, "C8 duplicate roll does not duplicate treasure")

	for tr_name in ["Trans_P12_Down", "Trans_P12_Up", "Trans_P13_Down", "Trans_P13_Up", "Trans_P14_Down", "Trans_P14_Up", "Trans_P16_In", "Trans_P16_Out", "PropMooringP01", "PropIronChestC9", "PropAirPocket_Stairs", "PropAirPocket_P14"]:
		check(main.find_child(tr_name, true, false) != null, "Canonical port/interactable present: " + tr_name)

	# Cofre C9 -> 5 ítems canónicos + regreso de arpía al volver de C9 a C8
	vtt_ui.world_state.harpy_state = "absent"
	vtt_ui.world_state.harpy_present = false
	vtt_ui.world_state.harpy_return_triggered = false
	var gold_before_c9: int = int(inv.items["gold"]["count"])
	canon._collect_c9_chest(true)
	check(
		int(inv.items["gold"]["count"]) == gold_before_c9 + 55
		and inv.items["turquoise_c9"]["count"] == 3
		and inv.items["boots_of_elvenkind"]["count"] == 1
		and inv.items["captain_logbook"]["count"] == 1
		and inv.items["orcus_talisman"]["count"] == 1,
		"C9 iron chest awards all 5 canonical PDF treasures"
	)
	roof.set_interior_mode("lower_c9_hold", true)
	canon._check_harpy_return_on_c8_reentry(vtt_ui.world_state)
	roof.set_interior_mode("lower_c8_bilge", true)
	canon._check_harpy_return_on_c8_reentry(vtt_ui.world_state)
	check(vtt_ui.world_state.harpy_return_triggered and vtt_ui.world_state.harpy_present, "Harpy returns automatically on leaving C9 after finding iron chest")
	canon.resolve_harpy("negotiated")
	check(vtt_ui.world_state.harpy_state == "negotiated" and not vtt_ui.world_state.harpy_present, "Harpy non-lethal resolution works")
	canon._resolve_curse("buried_brastos")
	check(vtt_ui.world_state.talisman_state == "buried_brastos", "Orcus talisman curse epilogue state recorded")

	# Strict canon toggle (confirmar también que PickupPotionC5 permanece oculta en C8)
	var pot_c5 := main.find_child("PickupPotionC5", true, false) as Node3D
	roof.set_interior_mode("lower_c8_bilge", true)
	canon.apply_strict_canon_mode(false, true)
	check(pot_c5 != null and not pot_c5.visible, "Upper-deck C5 potion stays hidden while in C8 bilge cutaway")
	roof.set_interior_mode("exterior", true)
	canon.apply_strict_canon_mode(true, true)
	check(pot_c5 != null and not pot_c5.visible, "Strict canon mode hides VTT-extra C5 potion")
	canon.apply_strict_canon_mode(false, true)
	check(pot_c5.visible, "Disabling strict canon restores VTT-extra C5 potion on exterior")

	# 5. Req #1: >= 3 trampas sutiles de tablones en C1 que abren agujero, tiran a C8 y abren haz de luz en C8
	var traps := main.find_children("WeakPlankTrap_*", "Node3D", true, false)
	check(traps.size() >= 3, "At least 3 subtle weak-plank traps on C1 (found %d)" % traps.size())
	var trap0 = traps[0]
	var shaft0 := main.find_child("C8TrapLightShaft_" + str(trap0.trap_id), true, false) as Node3D
	check(not trap0.is_broken and shaft0 != null and not shaft0.visible, "Weak plank starts intact and C8 shaft starts hidden")
	trap0.trigger_collapse(hero)
	check(trap0.is_broken and shaft0.visible and hero.position.y < -2.5, "Stepping on weak plank breaks hole, reveals C8 light shaft, and drops hero to C8")

	# 6. Req #2 & #3: Esqueletos en cubierta y fauna viva (gaviotas articuladas + bandada planeando)
	for sk_name in ["DeckSkeleton_C1_Stbd", "DeckSkeleton_C2_Fore", "DeckSkeleton_C3_Stern"]:
		check(main.find_child(sk_name, true, false) != null, "Deck skeleton present: " + sk_name)
	var flock := main.find_child("SoaringSeagullFlock", true, false) as Node3D
	check(flock != null and flock.get_child_count() >= 4, "Soaring seabird flock present (count=%d)" % (flock.get_child_count() if flock else 0))
	var dress = main.find_child("DeckDressing", true, false)
	var gull_count := 0
	var all_gulls_articulated := true
	for f in dress.animated_fauna:
		if str(f.get_meta("type", "")) == "seagull":
			gull_count += 1
			if f.get_node_or_null("LeftWingPivot") == null or f.get_node_or_null("RightWingPivot") == null:
				all_gulls_articulated = false
	check(gull_count >= 4 and all_gulls_articulated, "All perched seagulls (%d) have articulated animated wings" % gull_count)

	# 7. Req #4: Choques de olas contra rocas y TODOS los huesos de dragón
	var rib_breakers := vfx.find_children("SeaSpray_DragonRibs_*", "GPUParticles3D", true, false)
	check(rib_breakers.size() >= 14, "Wave impact spray emitters cover dragon bones all around wreck (found %d)" % rib_breakers.size())

	# 8. Req #5: Reforma integral C8 (fondo oscuro, luz baja, haces cenitales, cierre sin huecos, chapoteo y brechas reales)
	roof.set_interior_mode("lower_c8_bilge", true)
	env.sync_zone_lighting()
	check(env.environment.background_mode == Environment.BG_COLOR and env.environment.ambient_light_energy <= 0.34, "C8 switches to dark enclosed bilge atmosphere")
	var bowsprit := main.find_child("Bowsprit", true, false) as Node3D
	check(bowsprit == null or not bowsprit.visible, "Bowsprit hidden in C8 cutaway")
	for c8_req in ["Bulkhead_C8_BowWall", "Bulkhead_C8_SternWall", "C8_StairWellAbyss", "C8LightShaft_P11Stair", "C8LightShaft_P12Hatch", "C8LightShaft_P13Hole", "C8BoneBreachSplinters", "C8BoneBreachFracture"]:
		check(main.find_child(c8_req, true, false) != null, "C8 overhaul node present: " + c8_req)
	check(hero.get_node_or_null("WadeSplashParticles") != null and hero.get_node_or_null("WadeRippleRing_0") != null, "PlayerToken has C8 wading splash & ripple rings")

	# 9. Req #6: Pickups apoyados en suelo con estética VTT (sin girar/flotar)
	var torch_c1 := main.find_child("PickupTorchC1", true, false) as Node3D
	check(torch_c1 != null and not torch_c1.is_processing() and torch_c1.position.y <= 0.05, "PickupTorchC1 grounded on deck without arcade spinning")

	# 10. Req #7: Faroles del barco apagados por defecto y encendibles/apagables
	var lan_c1 := main.find_child("Lantern_C1_Mid", true, false) as OmniLight3D
	var lan_stern := main.find_child("SternAdmiralLantern", true, false) as OmniLight3D
	var lan_c4 := main.find_child("Lantern_C4_Captain", true, false) as OmniLight3D
	check(lan_c1 != null and is_equal_approx(lan_c1.light_energy, 0.0), "Lantern_C1_Mid starts OFF")
	check(lan_stern != null and is_equal_approx(lan_stern.light_energy, 0.0), "SternAdmiralLantern starts OFF")
	check(lan_c4 != null and is_equal_approx(lan_c4.light_energy, 0.0), "Lantern_C4_Captain starts OFF")
	canon.toggle_lantern("Lantern_C1_Mid")
	check(lan_c1.light_energy > 0.5 and canon.is_lantern_lit("Lantern_C1_Mid"), "Toggling lantern turns it ON")
	canon.toggle_lantern("Lantern_C1_Mid")
	check(is_equal_approx(lan_c1.light_energy, 0.0) and not canon.is_lantern_lit("Lantern_C1_Mid"), "Toggling lantern again turns it OFF")

	# 11. Req #8: Velas ampliadas, asimétricas y desgarradas verticalmente
	var sails := main.find_child("TatteredSails", true, false) as Node3D
	check(sails != null and sails.get_child_count() >= 4, "TatteredSails has 4 enlarged asymmetric sail patches")
	if sails and sails.get_child_count() >= 2:
		var m0 := (sails.get_child(0) as MeshInstance3D).mesh as PlaneMesh
		var m1 := (sails.get_child(1) as MeshInstance3D).mesh as PlaneMesh
		check(m0.size.y > m1.size.y + 1.0 and m0.size.y >= 5.0, "Mainsails enlarged asymmetrically (port %.1fm vs stbd %.1fm)" % [m0.size.y, m1.size.y])

	DirAccess.remove_absolute(ProjectSettings.globalize_path(tmp_save))
	print("PECIO CANON FEATURES: %d PASS / %d FAIL" % [passed, failures.size()])
	main.free()
	quit(0 if failures.is_empty() else 1)
