extends SceneTree

# ==============================================================================
# VERIFICACION INTEGRADA DEL SISTEMA DE CAMINOS Y TRANSICIONES ENTRE MAPAS
# Valida: 5 MapExit + 5 Spawn_from_* en main.tscn, colisiones continuas de los
# 4 senderos, indicadores ocultos por defecto, bloqueo DM, transicion real
# bidireccional entre main.tscn y destinos y retorno con orientacion y anti-retrigger.
# ==============================================================================

var passed: int = 0
var failures: Array[String] = []

func _initialize() -> void:
	call_deferred("_run_all")

func check(cond: bool, msg: String) -> void:
	if cond:
		passed += 1
		print("  [PASS] ", msg)
	else:
		failures.append(msg)
		printerr("  [FAIL] ", msg)

func _step_frames(n: int = 4) -> void:
	for _i in range(n):
		await process_frame

func _wait_scene(expected: String) -> void:
	var deadline := Time.get_ticks_msec()+15000
	while Time.get_ticks_msec()<deadline:
		if current_scene != null and current_scene.name == expected and not bool(root.get_node("MapTransition").get("is_transitioning")): return
		await create_timer(0.02).timeout
	check(false,"Scene transition timed out: "+expected)

func _run_all() -> void:
	print("==================================================")
	print("VERIFICATION: MAP EXITS & SCENIC TRANSITION PATHS")
	print("==================================================")

	await _step_frames(3)
	var mt := root.get_node_or_null("MapTransition")
	check(mt != null, "Autoload MapTransition disponible en /root/MapTransition")

	# 1. Cargar main.tscn
	var err := change_scene_to_file("res://scenes/main.tscn")
	check(err == OK, "Carga de escena principal res://scenes/main.tscn")
	await _step_frames(6)

	var scene := current_scene
	check(scene != null and scene.name == "Main", "Escena actual activa: Main")
	var exits: Array = mt.get_scene_exits(scene)
	check(exits.size() == 5, "Exactamente 5 MapExit registrados en Main (actual: %d)" % exits.size())

	var expected_exits := {
		"pleamar-low": "res://scenes/pleamar_coves.tscn",
		"pleamar-high": "res://scenes/pleamar_coves.tscn",
		"observatory-inland": "res://scenes/observatory_approach.tscn",
		"observatory-coast": "res://scenes/observatory_approach.tscn",
		"boat-pecio": "res://scenes/pecio_cove_arrival.tscn"
	}
	var exit_by_id := {}
	for ex in exits:
		var eid := str(ex.get("exit_id"))
		exit_by_id[eid] = ex
		check(FileAccess.file_exists(str(ex.get("target_scene_path"))), "Destino existente para %s -> %s" % [eid, str(ex.get("target_scene_path"))])
		var ind := ex.get_node_or_null("DiscreetExitIndicator") as Node3D
		check(ind != null and not ind.visible, "Indicador de salida oculto por defecto en %s" % eid)

	for eid in expected_exits.keys():
		check(exit_by_id.has(eid), "MapExit presente: " + eid)
		if exit_by_id.has(eid):
			check(str(exit_by_id[eid].get("target_scene_path")) == expected_exits[eid], "Destino correcto en %s" % eid)

	# 2. Marcadores de retorno Spawn_from_* en Main
	for sp_name in ["Spawn_from_pleamar_low", "Spawn_from_pleamar_high", "Spawn_from_obs_inland", "Spawn_from_obs_coast", "Spawn_from_retreat_boat"]:
		var sp := scene.find_child(sp_name, true, false) as Node3D
		check(sp != null, "Marcador de retorno presente: " + sp_name)

	# 3. Continuidad fisica (colision suelo sin huecos ni muros invisibles) en los 4 senderos
	await physics_frame
	var space_state: PhysicsDirectSpaceState3D = scene.get_world_3d().direct_space_state
	var walk_samples := {
		"pleamar-low": [Vector3(12.1, 0.57, 93.5), Vector3(8.6, 0.55, 97.2), Vector3(5.6, 0.54, 99.2)],
		"pleamar-high": [Vector3(11.9, 21.24, 43.3), Vector3(7.2, 21.10, 41.45), Vector3(4.3, 20.95, 40.65)],
		"observatory-inland": [Vector3(119.8, 37.05, 14.8), Vector3(117.5, 37.22, 12.8), Vector3(115.6, 37.35, 9.8)],
		"observatory-coast": [Vector3(160.4, 32.76, 25.45), Vector3(162.3, 32.88, 24.0), Vector3(164.6, 32.98, 22.4)]
	}
	for route_id in walk_samples.keys():
		for pt in walk_samples[route_id]:
			var q := PhysicsRayQueryParameters3D.create(pt + Vector3(0.0, 2.5, 0.0), pt - Vector3(0.0, 3.0, 0.0))
			var hit: Dictionary = space_state.intersect_ray(q)
			check(not hit.is_empty(), "Suelo transitable con colision en %s punto %s" % [route_id, str(pt)])

	# 4. Resaltado DM y bloqueo dm_locked
	mt.dm_highlight_all(true, scene)
	var ind_dm := exit_by_id["pleamar-low"].get_node_or_null("DiscreetExitIndicator") as Node3D
	check(ind_dm != null and ind_dm.visible, "Resaltado DM hace visible indicador de salida")
	mt.dm_highlight_all(false, scene)
	check(not ind_dm.visible, "Al desactivar resaltado DM el indicador vuelve a ocultarse")

	mt.set_exit_locked("pleamar-low", true, scene)
	check(not exit_by_id["pleamar-low"].execute_transition(), "Salida bloqueada por DM impide transicion accidental")
	mt.set_exit_locked("pleamar-low", false, scene)

	# 5. Transicion real: Main (pleamar-low) -> pleamar_coves.tscn
	var player := scene.get_node_or_null("PlayerToken") as Node3D
	check(player != null, "PlayerToken activo en Main antes de transicionar")
	var expected_arrival_facing := str(exit_by_id["pleamar-low"].get("entry_facing"))
	var ok_go: bool = mt.begin_transition(exit_by_id["pleamar-low"], player)
	check(ok_go, "Inicio de transicion real Main -> pleamar_coves.tscn")

	# Esperar fundido + cambio de escena (~0.8s en frames simulados o hasta que cambie current_scene)
	await _wait_scene("PleamarCoves")
	await _step_frames(6)

	var dest_scene := current_scene
	check(dest_scene != null and dest_scene.name == "PleamarCoves", "Cambio efectivo de escena a PleamarCoves")
	var dest_mia := dest_scene.get_node_or_null("PlayerToken") as Node3D
	var dest_spawn := dest_scene.find_child("Spawn_from_pleamar_low", true, false) as Node3D
	check(dest_mia != null and dest_spawn != null, "Spawn_from_pleamar_low y PlayerToken presentes en destino")
	if dest_mia and dest_spawn:
		check(dest_mia.global_position.distance_to(dest_spawn.global_position) < 0.75, "Protagonista aparece sobre la continuacion logica del camino")
		check(str(dest_mia.get("facing_dir")) == expected_arrival_facing, "Orientacion coherente al entrar en Cuevas de Pleamar (facing=%s)" % str(dest_mia.get("facing_dir")))

	var dest_exits: Array = mt.get_scene_exits(dest_scene)
	check(dest_exits.size() == 2, "PleamarCoves posee 2 salidas bidireccionales de retorno (actual: %d)" % dest_exits.size())

	# 6. Validar las otras dos escenas destino cargables + retorno al Retiro
	var back_exit: Node = null
	for de in dest_exits:
		if str(de.get("exit_id")) == "back-pleamar-low":
			back_exit = de
			break
	check(back_exit != null, "Salida de retorno back-pleamar-low presente en PleamarCoves")
	if back_exit:
		check(mt.begin_transition(back_exit, dest_mia), "Inicio de retorno bidireccional PleamarCoves -> Main")
		await _wait_scene("Main")
		await _step_frames(6)
		var back_main := current_scene
		check(back_main != null and back_main.name == "Main", "Retorno completado a Main")
		var ret_mia := back_main.get_node_or_null("PlayerToken") as Node3D
		var ret_spawn := back_main.find_child("Spawn_from_pleamar_low", true, false) as Node3D
		if ret_mia and ret_spawn:
			check(ret_mia.global_position.distance_to(ret_spawn.global_position) < 0.75, "Protagonista reaparece exactamente en Spawn_from_pleamar_low")
			check(str(ret_mia.get("facing_dir")) == "ne", "Orientacion coherente al regresar al Retiro (facing=%s)" % str(ret_mia.get("facing_dir")))

	# 7. Verificar carga limpia de observatory_approach.tscn y pecio_cove_arrival.tscn
	check(change_scene_to_file("res://scenes/observatory_approach.tscn") == OK, "Carga limpia de observatory_approach.tscn")
	await _step_frames(5)
	var obs_exits: Array = mt.get_scene_exits(current_scene)
	check(current_scene != null and current_scene.name == "ObservatoryApproach" and obs_exits.size() == 2, "ObservatoryApproach operativo con 2 retornos")

	check(change_scene_to_file("res://scenes/pecio_cove_arrival.tscn") == OK, "Carga limpia de pecio_cove_arrival.tscn")
	await _step_frames(5)
	var pecio_exits: Array = mt.get_scene_exits(current_scene)
	check(current_scene != null and current_scene.name == "PecioCoveArrival" and pecio_exits.size() == 1, "PecioCoveArrival operativo con salida de regreso en bote")

	print("==================================================")
	print("RESULTS: %d PASSED, %d FAILED" % [passed, failures.size()])
	print("==================================================")
	quit(0 if failures.is_empty() else 1)
