@tool
extends SceneTree

# Verificación automatizada de paridad completa con el sistema de cámara Babylon
# Cubre: frente de camarote (C4-C7), límites orbitales ±30°, tap vs hold vertical,
# cruce de umbral interior/exterior, Overview dinámico mástil-quilla, Cofa centrada,
# encuadre de grupo/combate, detalle de actor, proyección ortográfica y WASD relativo.

func _initialize() -> void:
	var scene: PackedScene = load("res://scenes/main.tscn")
	if not scene:
		printerr("FAIL: No se pudo cargar main.tscn")
		quit(1)
		return
	var root_node: Node = scene.instantiate()
	root.add_child(root_node)
	_verify.call_deferred(root_node)

func _assert_near(a: float, b: float, tol: float, label: String) -> bool:
	if absf(a - b) > tol:
		printerr("FAIL [", label, "]: got=", a, " expected=", b)
		return false
	return true

func _verify(root_node: Node) -> void:
	var ok := true
	var cam := root_node.find_child("TacticalCamera", true, false) as TacticalCamera
	if not cam:
		printerr("FAIL: No se encontró TacticalCamera")
		quit(1)
		return

	# 1. Frente canónico por camarote (wreckCameraFront) y límites ±30°
	ok = _assert_near(TacticalCamera.wreck_camera_front_offset("c4"), 45.0, 0.01, "C4 front offset") and ok
	ok = _assert_near(TacticalCamera.wreck_camera_front_offset("fore_c6_port"), -45.0, 0.01, "C6 front offset") and ok
	ok = _assert_near(TacticalCamera.wreck_camera_front_offset("exterior"), 0.0, 0.01, "Exterior front offset") and ok

	cam.step_orbit(-5)
	ok = _assert_near(cam.target_yaw, -30.0, 0.01, "Orbit min clamp -30") and ok
	cam.step_orbit(+5)
	ok = _assert_near(cam.target_yaw, 30.0, 0.01, "Orbit max clamp +30") and ok
	cam.reset_camera_view()

	# 2. Tap vs Hold vertical (CameraTiltHold)
	cam._begin_tilt_hold(-1)
	cam._advance_tilt_hold(80.0) # < 180 ms -> tap = salto exacto a siguiente hito 20°
	cam._end_tilt_hold()
	ok = _assert_near(cam.target_pitch, 20.0, 0.01, "Tilt tap 25->20") and ok

	cam._begin_tilt_hold(-1)
	cam._advance_tilt_hold(380.0) # Hold -> avanza continuamente por grados fraccionarios (~18°)
	cam._end_tilt_hold()
	if not (cam.target_pitch < 19.5 and cam.target_pitch > 16.0):
		printerr("FAIL [Tilt hold continuous]: got=", cam.target_pitch)
		ok = false
	cam.reset_camera_view()

	# 3. Transición inteligente solo al cruzar umbral interior/exterior (D8InteriorCameraTilt)
	cam.set_interior_cutout(true, 10.0, "aft_c4_port")
	ok = _assert_near(cam.target_pitch, 10.0, 0.01, "Enter C4 auto tilt 10") and ok
	ok = _assert_near(cam.room_front_offset, 45.0, 0.01, "Enter C4 auto front +45") and ok
	cam.step_tilt(+1) # Usuario ajusta manualmente a 15° dentro del camarote
	ok = _assert_near(cam.target_pitch, 15.0, 0.01, "Manual step inside C4 -> 15") and ok
	cam.set_interior_cutout(true, 10.0, "aft_c4_port") # Seguir dentro NO sobrescribe
	ok = _assert_near(cam.target_pitch, 15.0, 0.01, "Stay in C4 preserves manual 15") and ok
	cam.set_interior_cutout(false, 25.0, "exterior") # Salir sí cruza frontera -> 25° y frente 0°
	ok = _assert_near(cam.target_pitch, 25.0, 0.01, "Exit to exterior restores 25") and ok
	ok = _assert_near(cam.room_front_offset, 0.0, 0.01, "Exit to exterior restores front 0") and ok

	# 4. Encuadre de Cofa centrada, quilla longitudinal y Overview dinámico mástil-quilla
	var cofa_focus := cam.calculate_zone_follow_target(Vector3(2.2, 15.2, 1.8), "c10")
	ok = _assert_near(cofa_focus.x, 0.35, 0.01, "Cofa centers X") and ok
	ok = _assert_near(cofa_focus.z, -0.48, 0.01, "Cofa centers Z") and ok

	var deck_focus := cam.calculate_zone_follow_target(Vector3(12.0, 0.0, 1.5), "main")
	ok = _assert_near(deck_focus.x, 8.5, 0.01, "Main longitudinal keel run clamp") and ok
	ok = _assert_near(deck_focus.z, 0.0, 0.01, "Main keel centerline Z") and ok

	var ov_low := cam.calculate_wreck_overview_frame(0.0, 5.0, 16.0 / 9.0)
	var ov_high := cam.calculate_wreck_overview_frame(30.0, 25.0, 16.0 / 9.0)
	if ov_low["distance"] < 34.0 or ov_high["distance"] < 34.0:
		printerr("FAIL [Overview fit]: distance too small: ", ov_low["distance"], " / ", ov_high["distance"])
		ok = false

	# 5. Encuadre de Grupo / Combate y Detalle de Actor + Proyección Ortográfica
	cam.step_orbit(1)
	cam.zoom_camera_step(-4.0)
	var saved_dist := cam.target_distance
	cam.toggle_combat_group_view()
	if not cam.is_combat_group_mode:
		printerr("FAIL [Group mode]: did not activate")
		ok = false
	cam.toggle_combat_group_view()
	ok = _assert_near(cam.target_distance, saved_dist, 0.05, "Group mode restores distance") and ok
	ok = _assert_near(cam.orbit_step, 1.0, 0.01, "Group mode restores orbit step") and ok

	cam.frame_actor_detail()
	if not cam.is_detail_mode or cam.target_distance > 11.0:
		printerr("FAIL [Detail mode]: dist=", cam.target_distance)
		ok = false

	cam.toggle_projection_mode()
	if cam.projection != Camera3D.PROJECTION_ORTHOGONAL:
		printerr("FAIL [Projection]: should switch to PROJECTION_ORTHOGONAL")
		ok = false
	cam.toggle_projection_mode()

	# 6. Movimiento WASD relativo a la vista actual (screenVectorToWorld)
	cam.current_yaw = 45.0
	var w_dir := cam.screen_vector_to_world(Vector2(0.0, -1.0))
	var d_dir := cam.screen_vector_to_world(Vector2(1.0, 0.0))
	ok = _assert_near(w_dir.dot(d_dir), 0.0, 0.001, "WASD screen axes orthogonal") and ok
	ok = _assert_near(w_dir.x, 0.0, 0.01, "WASD retains authored direction at +45 camera yaw X") and ok
	ok = _assert_near(w_dir.z, -1.0, 0.01, "WASD retains authored direction at +45 camera yaw Z") and ok

	if ok:
		print("==================================================")
		print("RESULT: FULL BABYLON CAMERA PARITY VERIFIED (6/6 SUITES)!")
		print("==================================================")
	quit(0 if ok else 1)
