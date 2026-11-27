extends SceneTree

var passed: int = 0
var failed: int = 0

func check(cond: bool, msg: String) -> void:
	if cond:
		passed += 1
		print("[PASS] ", msg)
	else:
		failed += 1
		printerr("[FAIL] ", msg)

func _initialize() -> void:
	print("=== TEST ACUATICO INTEGRAL: RETIRO DEL DRAGON ===")
	var main_scene := load("res://scenes/main.tscn") as PackedScene
	check(main_scene != null, "Carga main.tscn exitosa")
	if not main_scene:
		quit(1)
		return

	var main_node := main_scene.instantiate()
	root.add_child(main_node)
	await process_frame

	var layout: Node = main_node.find_child("RetreatLayoutBuilder", true, false)
	var player: CharacterBody3D = main_node.find_child("PlayerToken", true, false) as CharacterBody3D
	var vtt_ui: Node = main_node.find_child("VttRoleUi", true, false)
	check(layout != null, "RetreatLayoutBuilder presente")
	check(player != null, "PlayerToken presente")
	check(vtt_ui != null, "VttRoleUi presente")

	# 1. Eliminacion de muros invisibles antiguos en mar abierto
	var safe_node := layout.find_child("SafetyColliders", true, false)
	check(safe_node != null, "SafetyColliders presente")
	if safe_node:
		check(safe_node.get_node_or_null("Safe_Edge_Sea_West") == null, "Muro invisible Safe_Edge_Sea_West eliminado")
		check(safe_node.get_node_or_null("Safe_Edge_Sea_South") == null, "Muro invisible Safe_Edge_Sea_South eliminado")
		check(safe_node.get_node_or_null("Safe_Edge_Sea_East") == null, "Muro invisible Safe_Edge_Sea_East eliminado")

	# 2. Orilla caminable ampliada y desnivel progresivo marino
	var wade_samples := 0
	for iz in range(111, 121):
		var h: float = float(layout.call("sample_aquatic_floor_height", 13.5, float(iz)))
		if h <= 0.08 and h >= -0.48:
			wade_samples += 1
	check(wade_samples >= 4, "Orilla somera caminable ampliada (>= 4m con agua en piernas; medido: %dm)" % wade_samples)

	var h_shore: float = float(layout.call("sample_aquatic_floor_height", 16.0, 115.0))
	var h_shelf: float = float(layout.call("sample_aquatic_floor_height", 16.0, 123.0))
	var h_mid: float = float(layout.call("sample_aquatic_floor_height", 16.0, 130.0))
	var h_deep: float = float(layout.call("sample_aquatic_floor_height", 16.0, 138.0))
	check(h_shore > h_shelf and h_shelf > h_mid and h_mid > h_deep, "Desnivel progresivo marino monotono (%.2f -> %.2f -> %.2f -> %.2f)" % [h_shore, h_shelf, h_mid, h_deep])
	check(h_deep <= -3.5, "Zona profunda de buceo alcanza <= -3.5m (medido: %.2fm)" % h_deep)

	# 3. Laguna interior profunda y buceable
	check(bool(layout.call("is_in_interior_lagoon", 25.0, 99.0)), "is_in_interior_lagoon detecta el centro de la laguna (25, 99)")
	var h_lag: float = float(layout.call("sample_aquatic_floor_height", 25.0, 99.0))
	check(h_lag <= -2.1, "Laguna interior suficientemente profunda para buceo (medido: %.2fm)" % h_lag)

	# 4. Limites fisicos diegeticos y ecosistemas
	var eco := layout.find_child("RetreatAquaticEcosystem", true, false)
	check(eco != null, "RetreatAquaticEcosystem presente")
	if eco:
		var reef_cols := eco.find_child("DragonTeethReefColliders", true, false)
		check(reef_cols != null and reef_cols.get_child_count() >= 16, "Corona de arrecifes con colisiones solidas (>= 16)")
		check(eco.find_child("CloisterHarborBuoys", true, false) != null, "Boyas y estacas del Claustro presentes")
		check(eco.find_child("OpenSeaCurrentStreaks", true, false) != null, "Estelas visibles de resaca presentes")
		check(eco.find_child("InteriorLagoonSanctuary", true, false) != null, "Sillares monásticos y rocas de laguna presentes")
		for mm_name in ["MM_SeaBranchCorals", "MM_SeaBrainCorals", "MM_SeaFans", "MM_DeepKelpForest", "MM_BenthicStarfish"]:
			var mm := eco.find_child(mm_name, true, false) as MultiMeshInstance3D
			check(mm != null and mm.multimesh != null and mm.multimesh.instance_count > 0, "Batch submarino poblado: %s (%d)" % [mm_name, mm.multimesh.instance_count if (mm and mm.multimesh) else 0])
		var fauna := eco.find_child("RetreatMarineFauna", true, false)
		check(fauna != null and fauna.get_child_count() >= 38, "Fauna marina + laguna poblada (>= 38 nodos; hallados: %d)" % (fauna.get_child_count() if fauna else 0))

	# 5. Empuje hidrodinamico de corriente exterior
	var push_inside: Vector3 = layout.call("sample_sea_current_push", Vector3(25.0, -1.0, 99.0))
	var push_channel: Vector3 = layout.call("sample_sea_current_push", Vector3(23.0, -1.0, 138.5))
	check(push_inside.length() < 0.01, "Sin corriente artificial dentro de la laguna interior")
	check(push_channel.z < -1.5, "Corriente de resaca empuja de vuelta hacia la cala en canal profundo (z=%.2f)" % push_channel.z)

	# 6. Fisica real de vadeo en orilla, nado en mar abierto, buceo [U] y buceo en laguna (SIN teletransporte y < -1.5)
	if player:
		# A) Vadeo en orilla ampliada (centro de la franja somera de 7m con agua por las piernas)
		var wade_y: float = float(layout.call("sample_aquatic_floor_height", 13.5, 117.5))
		player.global_position = Vector3(13.5, wade_y + 0.05, 117.5)
		for _i in range(6):
			player._physics_process(0.05)
		check(bool(player.get("in_shallow_water")) and not bool(player.get("in_deep_water")), "Personaje camina con agua en las piernas en la orilla ampliada (y=%.2f, suelo=%.2f)" % [player.global_position.y, wade_y])

		# B) Nado y buceo en mar abierto
		player.global_position = Vector3(16.0, -0.45, 130.0)
		for _i in range(10):
			player._physics_process(0.05)
		check(bool(player.get("in_deep_water")), "Personaje nada en mar abierto (z=130)")
		var aq = player.get("aquatic")
		check(aq != null and aq.surface_available, "Buceo disponible en mar abierto")
		check(player.toggle_dive(), "toggle_dive() activa buceo en mar abierto")
		for _i in range(45):
			player._physics_process(0.05)
		check(aq.submerged and player.global_position.y < -1.5, "Buceo en mar abierto desciende bajo -1.5m sin teletransporte (y=%.2f)" % player.global_position.y)
		check(player.toggle_dive(), "toggle_dive() emerge de nuevo a superficie")
		for _i in range(35):
			player._physics_process(0.05)
		check(not aq.submerged and player.global_position.y > -0.85, "Emersion devuelve suavemente a superficie (y=%.2f)" % player.global_position.y)

		# C) Nado y buceo en la laguna interior
		player.global_position = Vector3(25.0, -0.45, 99.0)
		for _i in range(10):
			player._physics_process(0.05)
		check(bool(player.get("in_deep_water")) and bool(player.get("in_lagoon")), "Personaje nada en la laguna interior")
		check(aq.surface_available and player.toggle_dive(), "Buceo habilitado en la laguna interior")
		for _i in range(45):
			player._physics_process(0.05)
		check(aq.submerged and player.global_position.y < -1.25, "Buceo en la laguna interior mantiene profundidad sin teletransporte (y=%.2f)" % player.global_position.y)

	main_node.free()
	print("\nRESUMEN TEST ACUATICO RETIRO: %d PASS / %d FAIL" % [passed, failed])
	quit(0 if failed == 0 else 1)
