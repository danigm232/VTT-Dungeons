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
	print("=== TEST PERIMETRO MARINO Y ARRECIFES: EL PECIO ===")
	var main_scene := load("res://scenes/main.tscn") as PackedScene
	check(main_scene != null, "Carga Pecio main.tscn exitosa")
	if not main_scene:
		quit(1)
		return
	var main_node := main_scene.instantiate()
	root.add_child(main_node)
	await process_frame

	var reef: Node = main_node.find_child("Reefs", true, false)
	check(reef != null, "Reefs (ReefBuilder) presente en Pecio")
	if reef:
		var perim := reef.find_child("PecioAquaticPerimeter", true, false)
		check(perim != null, "PecioAquaticPerimeter instanciado")
		if perim:
			var cols := perim.find_child("OuterReefColliders", true, false)
			check(cols != null and cols.get_child_count() >= 15, "Anillo exterior de arrecifes con colisionadores solidos (>= 15; hallados: %d)" % (cols.get_child_count() if cols else 0))
			var sharks := perim.find_child("PerimeterPatrolSharks", true, false)
			check(sharks != null and sharks.get_child_count() == 4, "4 tiburones de arrecife patrullando el perimetro exterior")
			var fish := perim.find_child("PecioReefFishSchools", true, false)
			check(fish != null and fish.get_child_count() >= 24, "Cardumenes submarinos del Pecio poblados (>= 24; hallados: %d)" % (fish.get_child_count() if fish else 0))
			for mm_name in ["MM_PecioBranchCorals", "MM_PecioBrainCorals", "MM_PecioSeaFans", "MM_PecioDeepKelp"]:
				var mm := perim.find_child(mm_name, true, false) as MultiMeshInstance3D
				check(mm != null and mm.multimesh != null and mm.multimesh.instance_count > 0, "Flora/coral submarino Pecio poblado: %s (%d)" % [mm_name, mm.multimesh.instance_count if (mm and mm.multimesh) else 0])
		var push_near: Vector3 = reef.call("sample_sea_current_push", Vector3(12.0, -4.0, 14.0))
		var push_edge: Vector3 = reef.call("sample_sea_current_push", Vector3(41.0, -4.0, 0.0))
		check(push_near.length() < 0.01, "Sin corriente artificial cerca del casco del pecio")
		check(push_edge.x < -1.5, "Corriente de resaca exterior devuelve al nadador hacia el pecio (x=%.2f)" % push_edge.x)

	main_node.free()
	print("\nRESUMEN TEST PERIMETRO PECIO: %d PASS / %d FAIL" % [passed, failed])
	quit(0 if failed == 0 else 1)
