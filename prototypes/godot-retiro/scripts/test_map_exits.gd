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
	var deadline := Time.get_ticks_msec() + 45000
	var mt := root.get_node_or_null("MapTransition")
	var loading := root.get_node_or_null("SkillLoading")
	while Time.get_ticks_msec() < deadline:
		if loading and loading.get("panel") and loading.panel.visible and loading.get("session") and loading.session.projector_ready:
			if loading.get("die") and loading.die.visible and not loading.die.disabled:
				loading.die.pressed.emit()
			if loading.get("next_button") and not loading.next_button.disabled:
				loading.next_button.pressed.emit()
		if current_scene != null and current_scene.name == expected and (mt == null or not bool(mt.get("is_transitioning"))):
			return
		await create_timer(0.05).timeout
	check(false, "Scene transition timed out: " + expected)

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
	check(ind_dm != null and not ind_dm.visible, "Al desactivar resaltado DM el indicador vuelve a ocultarse")

	mt.set_exit_locked("pleamar-low", true, scene)
	check(not exit_by_id["pleamar-low"].execute_transition(), "Salida bloqueada por DM impide transicion accidental")
	mt.set_exit_locked("pleamar-low", false, scene)

	# 4b. Letreros 3D en las 5 salidas de Main y letrero de confirmacion al acercarse
	for eid in expected_exits.keys():
		var ex: Node = exit_by_id.get(eid)
		check(ex != null and bool(ex.get("prompt_before_travel")) and not bool(ex.get("auto_trigger")), "Salida %s exige letrero antes de viajar" % eid)
		var sp_prop := ex.get_node_or_null("SignpostProp") as Node3D if ex else null
		var sp_sprite := sp_prop.get_node_or_null("SignpostSprite") as Sprite3D if sp_prop else null
		var sp_lbl := sp_prop.get_node_or_null("SignpostTitle") as Label3D if sp_prop else null
		check(sp_prop != null and sp_prop.visible and sp_sprite != null and sp_sprite.texture != null, "Letrero 3D visible con textura en %s" % eid)
		check(sp_lbl != null and not sp_lbl.text.is_empty() and sp_lbl.font != null, "Rotulo Metamorphous 3D en %s (%s)" % [eid, sp_lbl.text if sp_lbl else ""])
		if sp_prop:
			var min_post_y := INF
			var has_shadow_post := false
			for child in sp_prop.get_children():
				if child is MeshInstance3D and ("Post" in child.name or "BoardBack" in child.name):
					var mi := child as MeshInstance3D
					if mi.cast_shadow == GeometryInstance3D.SHADOW_CASTING_SETTING_ON:
						has_shadow_post = true
					if "Post" in mi.name and mi.mesh:
						var aabb: AABB = mi.mesh.get_aabb()
						min_post_y = minf(min_post_y, mi.position.y + aabb.position.y)
			check(min_post_y <= -0.35, "Cartel %s empalado bajo tierra (min_y=%.2fm)" % [eid, min_post_y])
			check(has_shadow_post, "Cartel %s proyecta sombra 3D real" % eid)

	# 4c. Carteles inmóviles al mover/rotar la camara y sombreado Z1 activo
	var cam_main := scene.get_node_or_null("TacticalCamera")
	var rot_before := {}
	for eid in expected_exits.keys():
		var ex_r: Node = exit_by_id.get(eid)
		var sp_r := ex_r.get_node_or_null("SignpostProp") as Node3D if ex_r else null
		if sp_r:
			rot_before[eid] = sp_r.global_transform.basis
	if cam_main:
		var old_focus = cam_main.get("focus_point")
		var old_tfocus = cam_main.get("target_focus")
		var old_cyaw = cam_main.get("current_yaw")
		var old_tyaw = cam_main.get("target_yaw")
		var cam_pos_before: Vector3 = (cam_main as Node3D).global_position
		cam_main.set("is_following", false)
		cam_main.set("focus_point", Vector3(24.0, 0.5, 112.0))
		cam_main.set("target_focus", Vector3(24.0, 0.5, 112.0))
		cam_main.set("current_yaw", 30.0)
		cam_main.set("target_yaw", 30.0)
		if cam_main.has_method("update_camera_transform"):
			cam_main.update_camera_transform()
		await _step_frames(6)
		check((cam_main as Node3D).global_position.distance_to(cam_pos_before) > 1.0, "Camara tactica se desplazo/roto durante prueba de carteles")
		for eid in rot_before.keys():
			var ex_r2: Node = exit_by_id.get(eid)
			var sp_r2 := ex_r2.get_node_or_null("SignpostProp") as Node3D if ex_r2 else null
			var b0: Basis = rot_before[eid]
			check(sp_r2 != null and b0.is_equal_approx(sp_r2.global_transform.basis), "Cartel %s no gira ni se mueve con la camara" % eid)
		cam_main.set("focus_point", old_focus)
		cam_main.set("target_focus", old_tfocus)
		cam_main.set("current_yaw", old_cyaw)
		cam_main.set("target_yaw", old_tyaw)
		if cam_main.has_method("update_camera_transform"):
			cam_main.update_camera_transform()
		await _step_frames(3)
	var sun_main := scene.get_node_or_null("DirectionalLight3D") as DirectionalLight3D
	check(sun_main != null and sun_main.shadow_enabled and int(sun_main.directional_shadow_mode) == 2 and sun_main.shadow_normal_bias <= 0.35, "DirectionalLight3D con PSSM 4-splits y bias de sombra ajustado")
	for sh_node_name in ["MM_CoastalPineCrowns", "MM_TrailRocks", "HeadlandBasaltButtress_0", "SeaArchCrag_0"]:
		var sh_n := scene.find_child(sh_node_name, true, false) as GeometryInstance3D
		check(sh_n != null and sh_n.cast_shadow == GeometryInstance3D.SHADOW_CASTING_SETTING_ON, "Sombra direccional activa en " + sh_node_name)

	var player := scene.get_node_or_null("PlayerToken") as Node3D
	check(player != null, "PlayerToken activo en Main antes de transicionar")

	var test_ex: Node = exit_by_id["pleamar-low"]
	test_ex._on_body_entered(player)
	await _step_frames(15)
	check(current_scene != null and current_scene.name == "Main", "Entrar en salida NO cambia de mapa directamente; permanece en Main")
	check(mt.is_exit_sign_visible(), "Entrar en salida abre el letrero interactivo de destino")
	check(mt._sign_title_lbl.text == "Cuevas de Pleamar", "Letrero muestra destino correcto (Cuevas de Pleamar)")
	var ui_theme := preload("res://scripts/vtt_ui_theme.gd")
	check(mt._sign_title_lbl.get_theme_font("font") == ui_theme.get_title_font(), "Titulo del letrero usa Metamorphous")
	check(mt._sign_subtitle_lbl.get_theme_font("font") == ui_theme.get_body_font(), "Texto narrativo del letrero usa Almendra")
	mt.dismiss_exit_sign(true)
	check(not mt.is_exit_sign_visible() and bool(test_ex.get("_suppressed_until_exit")), "Cancelar letrero oculta y suprime reapertura hasta salir del trigger")
	test_ex._on_body_exited(player)

	# 5. Transicion real: Main (pleamar-low) -> pleamar_coves.tscn
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

	# 8. Paso 2.4: Viaje en bote desde Z1 hacia Pleamar por mar (SignAltButton y Spawn_from_pleamar_sea)
	check(change_scene_to_file("res://scenes/main.tscn") == OK, "Recarga de Main para verificar ruta maritima a Pleamar")
	await _step_frames(6)
	var main2 := current_scene
	var boat_ex: Node = null
	for ex2 in mt.get_scene_exits(main2):
		if str(ex2.get("exit_id")) == "boat-pecio":
			boat_ex = ex2
			break
	check(boat_ex != null, "Salida boat-pecio presente para navegacion costera")
	if boat_ex:
		var m_player := main2.get_node_or_null("PlayerToken") as Node3D
		boat_ex._on_body_entered(m_player)
		await _step_frames(6)
		check(mt.is_exit_sign_visible(), "Letrero de embarque visible junto al bote")
		check(mt._sign_alt_btn != null and mt._sign_alt_btn.visible, "Boton secundario maritimo hacia Pleamar visible en el panel")
		var ok_sea: bool = boat_ex.execute_extra_transition(0)
		check(ok_sea, "Inicio de travesia maritima hacia Pleamar por mar")
		await _wait_scene("PleamarCoves")
		await _step_frames(5)
		var sea_dest := current_scene
		var sea_spawn := sea_dest.find_child("Spawn_from_pleamar_sea", true, false) as Node3D if sea_dest else null
		var sea_mia := sea_dest.get_node_or_null("PlayerToken") as Node3D if sea_dest else null
		check(sea_dest != null and sea_dest.name == "PleamarCoves", "Llegada efectiva por mar a PleamarCoves")
		check(sea_mia != null and sea_spawn != null and sea_mia.global_position.distance_to(sea_spawn.global_position) < 0.75, "Protagonista desembarca exactamente en Spawn_from_pleamar_sea")

	# 9. Paso 6: Colisiones playa/muelle, salidas diferenciadas, restricciones de marea y sincronizacion de retorno
	check(change_scene_to_file("res://scenes/main.tscn") == OK, "Recarga de Main para verificacion Paso 6")
	await _step_frames(6)
	var main3 := current_scene
	var ex_low3: Node = null
	var ex_boat3: Node = null
	for ex3 in mt.get_scene_exits(main3):
		if str(ex3.get("exit_id")) == "pleamar-low":
			ex_low3 = ex3
		elif str(ex3.get("exit_id")) == "boat-pecio":
			ex_boat3 = ex3
	check(ex_low3 != null and ex_boat3 != null, "Salidas de tierra (pleamar-low) y embarque (boat-pecio) diferenciadas")
	if ex_low3 and ex_boat3:
		var sep_dist: float = (ex_low3 as Node3D).global_position.distance_to((ex_boat3 as Node3D).global_position)
		check(sep_dist > 14.0, "Embarcadero y salida terrestre claramente separados sin solapamiento (dist=%.1fm)" % sep_dist)

	var space3: PhysicsDirectSpaceState3D = (main3 as Node3D).get_world_3d().direct_space_state
	var nav_probes: Array = [
		["Playa central", Vector3(17.5, 2.0, 104.5), Vector3(17.5, -2.0, 104.5), true],
		["Muelle tabla", Vector3(21.8, 2.0, 112.1), Vector3(21.8, -2.0, 112.1), true],
		["Enlace Z2 muelle", Vector3(26.2, 2.0, 111.2), Vector3(26.2, -2.0, 111.2), true],
		["Mar profundo tras bote (sin losa fantasma)", Vector3(22.0, 2.0, 117.0), Vector3(22.0, -0.1, 117.0), false]
	]
	for nav_pt in nav_probes:
		var hit_nav: Dictionary = space3.intersect_ray(PhysicsRayQueryParameters3D.create(nav_pt[1], nav_pt[2]))
		var expect_solid: bool = bool(nav_pt[3])
		check(hit_nav.is_empty() != expect_solid, "Superficie navegable/mar '%s' verificada" % str(nav_pt[0]))

	if ex_low3:
		mt.set_tide_state("high")
		check(mt.is_low_tide_blocked(), "Marea alta activa restriccion sobre la ruta inferior")
		check(not ex_low3.execute_transition(), "Marea alta bloquea transicion directa por pleamar-low")
		var actor3 := main3.get_node_or_null("PlayerToken") as Node3D
		ex_low3._on_body_entered(actor3)
		await _step_frames(6)
		check(mt._sign_confirm_btn.disabled, "Panel deshabilita paso bajo durante marea alta")
		check(mt._sign_alt_btn != null and mt._sign_alt_btn.visible and not mt._sign_alt_btn.disabled, "Panel mantiene habilitada la alternativa alta sin marea")
		var ok_bypass: bool = ex_low3.execute_extra_transition(0)
		check(ok_bypass, "Ruta terrestre alternativa por collado alto funciona en marea alta")
		await _wait_scene("PleamarCoves")
		await _step_frames(5)
		var dest_high := current_scene
		var spawn_high := dest_high.find_child("Spawn_from_pleamar_high", true, false) as Node3D if dest_high else null
		var mia_high := dest_high.get_node_or_null("PlayerToken") as Node3D if dest_high else null
		check(mia_high != null and spawn_high != null and mia_high.global_position.distance_to(spawn_high.global_position) < 0.75, "Desvio alto deposita en Spawn_from_pleamar_high")
		check(str(mt.get("tide_state")) == "high", "Estado de marea persiste entre escenas durante la transicion")
		mt.set_tide_state("low")
		check(not mt.is_low_tide_blocked(), "Restablecimiento a marea baja vuelve a permitir ruta costera")
		var sl: Node = root.get_node_or_null("SkillLoading")
		if sl and sl.get("session"):
			var sess_state: Dictionary = sl.get("session").state("desktop")
			check(str(sess_state.get("tide", "")) == "low", "LoadingSession sincroniza estado de marea para clientes conectados")
		var back_high: Node = null
		for de2 in mt.get_scene_exits(dest_high):
			if str(de2.get("exit_id")) == "back-pleamar-high":
				back_high = de2
				break
		check(back_high != null and mt.begin_transition(back_high, mia_high), "Retorno desde senda alta de Pleamar hacia Main")
		await _wait_scene("Main")
		await _step_frames(5)
		var main4 := current_scene
		var sp_ret_high := main4.find_child("Spawn_from_pleamar_high", true, false) as Node3D if main4 else null
		var mia_ret := main4.get_node_or_null("PlayerToken") as Node3D if main4 else null
		var rog_ret := main4.get_node_or_null("RogueToken") as Node3D if main4 else null
		check(mia_ret != null and sp_ret_high != null and mia_ret.global_position.distance_to(sp_ret_high.global_position) < 0.75, "Retorno de collado coloca a Mia en Spawn_from_pleamar_high")
		check(rog_ret != null and sp_ret_high != null and rog_ret.global_position.distance_to(sp_ret_high.global_position) < 3.5, "Companeros de grupo mantienen formacion al retornar de Pleamar")

	print("==================================================")
	print("RESULTS: %d PASSED, %d FAILED" % [passed, failures.size()])
	print("==================================================")
	quit(0 if failures.is_empty() else 1)
