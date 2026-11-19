@tool
extends SceneTree

# ==============================================================================
# SUITE DE PRUEBAS AUTOMATIZADA: LAYOUT Y CONCEPT ESPACIAL DEL RETIRO DEL DRAGÓN
# Valida la paridad 1:1 con Babylon.js (dimensiones, cotas, 11 zonas, 13 superficies,
# 16 landmarks, 6 celdas, cámara táctica y colisiones)
# ==============================================================================

const Structure = preload("res://scripts/retreat_structure.gd")

var passed: int = 0
var failures: Array[String] = []

func _init() -> void:
	print("==================================================")
	print("AUTOMATED VERIFICATION: RETIRO DEL DRAGÓN LAYOUT")
	print("==================================================")
	_run_verification()

func check(condition: bool, message: String) -> void:
	if condition:
		passed += 1
		print("  [PASS] ", message)
	else:
		failures.append(message)
		printerr("  [FAIL] ", message)

func _run_verification() -> void:
	# 1. Dimensiones de cuadrícula
	print("\n--- 1. Cuadrícula y Escala Canónica ---")
	check(Structure.GRID_COLS == 112 and Structure.GRID_ROWS == 80, "Cuadrícula global: 112 columnas x 80 filas")
	check(is_equal_approx(Structure.TILE_METERS, 1.5), "Métrica canónica de casilla: 1.5m (5 pies)")
	check(is_equal_approx(Structure.TOTAL_WIDTH_METERS, 168.0), "Ancho total del mapa: 168.0m")
	check(is_equal_approx(Structure.TOTAL_DEPTH_METERS, 120.0), "Profundidad total del mapa: 120.0m")

	# 2. Cotas de elevación
	print("\n--- 2. Cotas de Elevación Canónicas ---")
	check(is_equal_approx(Structure.ELEV_BEACH_SHORE, 0.25), "Cota orilla y desembarco: 0.25m")
	check(is_equal_approx(Structure.ELEV_A1_PLAZA, 9.0), "Cota Plaza y Celdas A1: 9.0m")
	check(is_equal_approx(Structure.ELEV_A2_WINCH, 15.0), "Cota Terraza Cabrestante A2: 15.0m")
	check(is_equal_approx(Structure.ELEV_A2_LIFT_LOW, 0.24), "Cota plataforma baja cabrestante: 0.24m")
	check(is_equal_approx(Structure.ELEV_A3_DINING, 18.0), "Cota Comedor y Cocina A3: 18.0m")
	check(is_equal_approx(Structure.ELEV_A4_LIBRARY, 18.0), "Cota Biblioteca A4: 18.0m")
	check(is_equal_approx(Structure.ELEV_A5_TEMPLE, 27.0), "Cota Templo de Bahamut A5: 27.0m")

	# 3. 11 Zonas Canónicas
	print("\n--- 3. 11 Zonas Canónicas ---")
	check(Structure.ZONES.size() == 11, "Total de zonas canónicas definidas: 11")
	var required_zones = [
		"Z1_BEACH", "Z2_ASCENT", "Z3_A1_PLAZA", "Z4_A2_WINCH",
		"Z5_A3_DINING", "Z6_A4_LIBRARY", "Z7_GARDENS", "Z8_A5_TEMPLE",
		"Z9_UPPER_WALKWAY", "Z10_ISLAND_ROUTES", "Z11_GLOBAL_ENV"
	]
	for z_id in required_zones:
		check(Structure.ZONES.has(z_id), "Zona registrada: " + z_id + " (" + Structure.ZONES.get(z_id, {}).get("name", "") + ")")
		var z: Dictionary = Structure.ZONES.get(z_id, {})
		check(z.has("bounds_x") and z.has("bounds_z"), "Límites bounding box válidos en " + z_id)
		check(z.get("elevation_max", 0.0) >= z.get("elevation_min", 0.0), "Rango de cotas válido en " + z_id)

	# 4. 13 Superficies Canónicas
	print("\n--- 4. 13 Superficies Canónicas ---")
	check(Structure.SURFACES.size() == 13, "Total de superficies registradas: 13")
	var required_surfaces = [
		"beach", "a1", "cliff", "a2", "upper", "a3", "a4", "a5",
		"pleamar", "observatorio", "island-pleamar-low", "island-pleamar-high", "island-observatory"
	]
	for s_id in required_surfaces:
		check(Structure.SURFACES.has(s_id), "Superficie canónica: " + s_id)

	# 5. Las 6 Celdas de Peregrinos de A1
	print("\n--- 5. 6 Celdas Excavadas de A1 ---")
	check(Structure.A1_ROOMS.size() == 6, "Total de celdas excavadas: 6")
	var beds_count = 0
	var hammocks_count = 0
	for room in Structure.A1_ROOMS:
		check(room.has("id") and room.has("role") and room.has("global_entry"), "Celda " + str(room["id"]) + " (" + room["label"] + ") configurada")
		for f in room["furniture"]:
			if f["kind"] == "bed":
				beds_count += 1
			elif f["kind"] == "hammock":
				hammocks_count += 1
	check(beds_count == 4, "Canon de camas en celdas: 4 camas individuales (encontradas: " + str(beds_count) + ")")
	check(hammocks_count == 8, "Canon de hamacas en celdas: 8 hamacas para kobolds (encontradas: " + str(hammocks_count) + ")")

	# 6. 16 Landmarks Canónicos
	print("\n--- 6. 16 Landmarks Canónicos ---")
	check(Structure.LANDMARKS.size() == 16, "Total de landmarks registrados: 16")
	var required_landmarks = [
		"spawn", "boat", "pleamar", "observatorio", "a2-door", "winch",
		"community", "library", "a4-door", "temple", "runara", "tarak",
		"varnoth", "myla", "kobold-west", "kobold-east"
	]
	for lm_id in required_landmarks:
		check(Structure.LANDMARKS.has(lm_id), "Landmark presente: " + lm_id + " (" + Structure.LANDMARKS.get(lm_id, {}).get("label", "") + ")")
		var lm: Dictionary = Structure.LANDMARKS.get(lm_id, {})
		var cell: Vector2i = lm["cell"]
		var world_pos: Vector3 = lm["world_pos"]
		# Verificar coincidencia entre celda y posición mundial
		var expected_x = (float(cell.x) + 0.5) * Structure.TILE_METERS
		var expected_z = (float(cell.y) + 0.5) * Structure.TILE_METERS
		check(is_equal_approx(world_pos.x, expected_x) and is_equal_approx(world_pos.z, expected_z), "Alineación celda->mundo en landmark " + lm_id)

	# 7. Conversión de Coordenadas y Búsqueda Espacial
	print("\n--- 7. Funciones de Conversión Espacial ---")
	var test_cell := Vector2i(16, 74)
	var test_world := Structure.cell_to_world(test_cell.x, test_cell.y, 0.25)
	var recovered_cell := Structure.world_to_cell(test_world)
	check(recovered_cell == test_cell, "Ida y vuelta de coordenadas: celda [16, 74] -> mundo -> celda [16, 74]")
	var test_zone := Structure.get_zone_at(test_world)
	check(test_zone["id"] == "Z1_BEACH", "Detección de zona correcta en spawn: Z1_BEACH")

	var plaza_pos := Vector3(89.25, 9.0, 86.25)
	var plaza_zone := Structure.get_zone_at(plaza_pos)
	check(plaza_zone["id"] == "Z3_A1_PLAZA", "Detección de zona correcta en A1 plaza: Z3_A1_PLAZA")

	var temple_pos := Vector3(41.25, 27.0, 65.25)
	var temple_zone := Structure.get_zone_at(temple_pos)
	check(temple_zone["id"] == "Z8_A5_TEMPLE", "Detección de zona correcta en templo: Z8_A5_TEMPLE")

	# 8. Preajustes de Cámara Táctica 2.5D
	print("\n--- 8. Preajustes de Cámara Táctica 2.5D ---")
	check(Structure.CAMERA_PRESETS.size() == 8, "Total de preajustes de cámara: 8")
	for cp_id in ["overview", "beach", "a1", "a2", "a3", "a4", "a5", "caves"]:
		check(Structure.CAMERA_PRESETS.has(cp_id), "Preajuste de cámara verificado: " + cp_id)

	# 9. Instanciación de Escena y Nodos
	print("\n--- 9. Instanciación de Escena main.tscn ---")
	var main_scene = load("res://scenes/main.tscn")
	check(main_scene != null, "Carga de res://scenes/main.tscn exitosa")
	if main_scene:
		var main_node = main_scene.instantiate()
		check(main_node != null, "Instanciación de nodo raíz Main exitosa")
		if main_node:
			root.add_child(main_node)
			var layout = main_node.find_child("RetreatLayoutBuilder", true, false)
			check(layout != null, "RetreatLayoutBuilder presente en escena")
			if layout and not layout.has_node("Surfaces"):
				layout.build_layout()
			var token = main_node.find_child("PlayerToken", true, false)
			check(token != null, "PlayerToken presente en escena")
			var cam = main_node.find_child("TacticalCamera", true, false)
			check(cam != null, "TacticalCamera presente en escena")
			var grid = main_node.find_child("TacticalGridOverlay", true, false)
			check(grid != null, "TacticalGridOverlay presente en escena")

			# Comprobar sub-nodos del layout
			for child_name in ["OceanPlane", "Surfaces", "A1_Cells", "A2_WinchAssembly", "A3_DiningHall", "A4_Library", "A5_Temple", "Staircases", "Landmarks", "SafetyColliders", "LushPlanters", "LushMountainForest", "WinchLeverAssembly", "WinchSeaRocks"]:
				var node_found = layout.find_child(child_name, true, false) if layout else null
				check(node_found != null, "Elemento de layout instanciado: " + child_name)

			if layout and layout.has_method("toggle_winch_lever"):
				var initial_winch: bool = bool(layout.get("winch_is_lowered"))
				var toggled_winch: bool = layout.toggle_winch_lever()
				check(toggled_winch != initial_winch, "toggle_winch_lever() cambia winch_is_lowered")
				var restored_winch: bool = layout.toggle_winch_lever()
				check(restored_winch == initial_winch, "toggle_winch_lever() restaura winch_is_lowered")

			main_node.free()

	# 10. Resumen y Exportación de Métricas
	var output_dir := ProjectSettings.globalize_path("res://../../output/godot-retiro-layout-20261114")
	DirAccess.make_dir_recursive_absolute(output_dir)
	var report_file = output_dir.path_join("layout-tests.json")
	var report_data := {
		"date": "2026-11-14",
		"scene": "dragon-rest",
		"engine": Engine.get_version_info().string,
		"passed": passed,
		"failures": failures,
		"total_checks": passed + failures.size(),
		"grid": {
			"cols": Structure.GRID_COLS,
			"rows": Structure.GRID_ROWS,
			"tile_meters": Structure.TILE_METERS,
			"width_m": Structure.TOTAL_WIDTH_METERS,
			"depth_m": Structure.TOTAL_DEPTH_METERS
		},
		"zones_count": Structure.ZONES.size(),
		"surfaces_count": Structure.SURFACES.size(),
		"landmarks_count": Structure.LANDMARKS.size(),
		"a1_rooms_count": Structure.A1_ROOMS.size()
	}
	var f = FileAccess.open(report_file, FileAccess.WRITE)
	if f:
		f.store_string(JSON.stringify(report_data, "\t"))
		f.close()
		print("Reporte de pruebas guardado en: ", report_file)

	print("\n==================================================")
	print("RESULTADO FINAL: ", passed, " PASS / ", failures.size(), " FAIL")
	print("==================================================")

	quit(0 if failures.is_empty() else 1)
