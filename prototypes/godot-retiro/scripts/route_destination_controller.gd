class_name RouteDestinationController
extends Node3D

# ==============================================================================
# CONTROLADOR DE ESCENAS CONECTADAS (DESTINOS TRANSICIONABLES DESDE EL RETIRO)
# Geometria organica esculpida con texturas PBR reales del Retiro, senderos
# curvos continuos sin costuras, arboleda multi-capa, niebla radial y MapExit.
# ==============================================================================

const VttRoleUi = preload("res://scripts/vtt_role_ui.gd")
const MapExitScript = preload("res://scripts/map_exit.gd")

@export_enum("pleamar_coves", "observatory_approach", "pecio_cove_arrival") var scene_kind: String = "pleamar_coves"

@onready var camera: Node = get_node_or_null("TacticalCamera")

var party: Array[Node3D] = []
var active_party_idx: int = 0
var player: Node3D
var vtt_ui: VttRoleUi

func _ready() -> void:
	set_meta("map_bounds_xz", _get_bounds_for_kind())
	_build_destination_environment()
	_collect_party()

	var initial_role: String = "player"
	var initial_projector_ready: bool = false
	var capture_path: String = ""
	for arg in OS.get_cmdline_args() + OS.get_cmdline_user_args():
		if arg.begins_with("--role="):
			initial_role = arg.trim_prefix("--role=")
		elif arg == "--projector-ready":
			initial_projector_ready = true
		elif arg.begins_with("--capture-shot="):
			capture_path = arg.trim_prefix("--capture-shot=")

	var mt := get_node_or_null("/root/MapTransition")
	if mt and not str(mt.get("pending_role")).is_empty() and not ("--role=" in " ".join(OS.get_cmdline_args())):
		initial_role = str(mt.get("pending_role"))

	if party.size() > 0:
		select_party_member(0, false)

	_apply_initial_camera_frame()

	vtt_ui = VttRoleUi.new()
	vtt_ui.name = "VttRoleUi"
	vtt_ui.configure_initial(initial_role, initial_projector_ready, true)
	add_child(vtt_ui)
	_apply_scene_hud_title()

	if mt and not str(mt.get("pending_spawn_id")).is_empty() and mt.has_method("apply_pending_spawn"):
		mt.apply_pending_spawn(self, party, camera)
	elif player and camera:
		camera.set("target", player)
		camera.set("is_following", true)
		camera.set("target_focus", player.global_position + Vector3.UP * 0.9)
		camera.set("focus_point", player.global_position + Vector3.UP * 0.9)
		if camera.has_method("update_camera_transform"):
			camera.update_camera_transform()

	if not capture_path.is_empty():
		call_deferred("_run_capture_and_quit", capture_path)

func _apply_scene_hud_title() -> void:
	var title := "Aproximación a Cuevas de Pleamar"
	match scene_kind:
		"observatory_approach":
			title = "Aproximación al Observatorio"
		"pecio_cove_arrival":
			title = "Arrecife del Pecio Rosa"
	if vtt_ui and vtt_ui.get("player_hud"):
		var lbl = vtt_ui.player_hud.get("scene_notice_lbl")
		if lbl is Label:
			(lbl as Label).text = title
	if vtt_ui and vtt_ui.get("dm_hud"):
		var hl = vtt_ui.dm_hud.get("hdr_sub_lbl")
		if hl is Label:
			(hl as Label).text = title

func _get_bounds_for_kind() -> Rect2:
	match scene_kind:
		"pecio_cove_arrival":
			return Rect2(-32.0, -30.0, 64.0, 60.0)
		_:
			return Rect2(-36.0, -34.0, 72.0, 68.0)

func _collect_party() -> void:
	party.clear()
	for node_name in ["PlayerToken", "RogueToken", "WizardToken"]:
		var tok := get_node_or_null(node_name) as Node3D
		if tok:
			party.append(tok)

func select_party_member(idx: int, focus_camera: bool = true) -> void:
	if party.is_empty():
		return
	active_party_idx = wrapi(idx, 0, party.size())
	for i in range(party.size()):
		if party[i].has_method("set_active"):
			party[i].set_active(i == active_party_idx)
	player = party[active_party_idx]
	if camera:
		camera.set("target", player)
		if focus_camera and camera.has_method("set_target_character"):
			camera.set_target_character(player)

func _apply_initial_camera_frame() -> void:
	if not camera:
		return
	var focus := Vector3(2.0, 1.2, 2.0)
	var dist := 34.0
	match scene_kind:
		"observatory_approach":
			focus = Vector3(0.0, 33.8, 4.0)
			dist = 38.0
		"pecio_cove_arrival":
			focus = Vector3(-1.0, 0.8, 2.0)
			dist = 31.0
	camera.set("is_overview", false)
	camera.set("is_following", false)
	camera.set("target_focus", focus)
	camera.set("focus_point", focus)
	camera.set("target_distance", dist)
	camera.set("current_distance", dist)
	if camera.has_method("update_camera_transform"):
		camera.update_camera_transform()

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.is_pressed() and not event.is_echo():
		var ek := event as InputEventKey
		if ek.ctrl_pressed or ek.alt_pressed or ek.meta_pressed:
			return
		match ek.keycode:
			KEY_1:
				select_party_member(0)
				get_viewport().set_input_as_handled()
			KEY_2:
				select_party_member(1)
				get_viewport().set_input_as_handled()
			KEY_3:
				select_party_member(2)
				get_viewport().set_input_as_handled()
			KEY_TAB:
				select_party_member(active_party_idx + 1)
				get_viewport().set_input_as_handled()

func _run_capture_and_quit(out_path: String) -> void:
	for _i in range(6):
		await get_tree().process_frame
	var img := get_viewport().get_texture().get_image()
	if img:
		var abs_path := out_path
		if out_path.begins_with("res://") or out_path.begins_with("user://"):
			abs_path = ProjectSettings.globalize_path(out_path)
		DirAccess.make_dir_recursive_absolute(abs_path.get_base_dir())
		var err := img.save_png(abs_path)
		print("CAPTURE_SAVED=", abs_path, " ERR=", err)
	get_tree().quit()

# ==============================================================================
# CONSTRUCCIÓN ORGÁNICA DE ESCENARIO DESTINO
# ==============================================================================
func _build_destination_environment() -> void:
	var env_root := Node3D.new()
	env_root.name = "DestinationWorld"
	add_child(env_root)

	# Mar texturizado continuo
	var ocean := MeshInstance3D.new()
	ocean.name = "OceanPlane"
	var om := PlaneMesh.new()
	om.size = Vector2(560.0, 560.0)
	ocean.mesh = om
	var omat := _tex_mat("res://assets/textures/bay-v3.png", Color("#19566c"), 0.22, 0.10, Vector3(26.0, 26.0, 26.0))
	ocean.material_override = omat
	env_root.add_child(ocean)

	var mat_earth := _tex_mat("res://assets/textures/earth.webp", Color("#c8b698"), 0.94, 0.02, Vector3(0.24, 0.24, 0.24))
	var mat_rock := _tex_mat("res://assets/textures/coastal-rock.png", Color("#b8b4ac"), 0.92, 0.03, Vector3(0.22, 0.22, 0.22), "res://assets/textures/rock-normal-v1.png")
	var mat_basalt := _tex_mat("res://assets/textures/basalt-coastal-albedo-v1.webp", Color("#a2a5a9"), 0.90, 0.04, Vector3(0.20, 0.20, 0.20), "res://assets/textures/rock-normal-v1.png")
	var mat_stone := _tex_mat("res://assets/textures/limestone-v3.webp", Color("#bdb7a8"), 0.88, 0.03, Vector3(0.26, 0.26, 0.26), "res://assets/textures/rock-normal-v1.png")
	var mat_wood := _tex_mat("res://assets/textures/oak-v4.webp", Color("#a68462"), 0.86, 0.03, Vector3(0.45, 0.45, 0.45), "res://assets/textures/wood-normal-v1.png")

	var rng := RandomNumberGenerator.new()
	rng.seed = hash(scene_kind)

	match scene_kind:
		"pleamar_coves":
			_build_pleamar_coves(env_root, mat_earth, mat_rock, mat_basalt, mat_wood, rng)
		"observatory_approach":
			_build_observatory_approach(env_root, mat_earth, mat_rock, mat_basalt, mat_stone, mat_wood, rng)
		"pecio_cove_arrival":
			_build_pecio_arrival(env_root, mat_earth, mat_rock, mat_basalt, mat_wood, rng)

func _build_pleamar_coves(root: Node3D, mat_earth: Material, mat_rock: Material, mat_basalt: Material, mat_wood: Material, rng: RandomNumberGenerator) -> void:
	# Peninsula costera organica y loma envolvente para el descenso alto (cero puentes sobre el mar)
	_build_organic_plateau_mesh(root, "CoveBasinIsland", Vector3(5.0, 0.0, 4.5), 26.0, 18.5, 0.60, -1.6, mat_earth, true, Color("#b69f79"), Color("#565046"))
	_build_organic_plateau_mesh(root, "CaveHeadlandMound", Vector3(-16.0, 0.0, -3.5), 14.0, 14.5, 4.6, -1.6, mat_basalt, true, Color("#565c62"), Color("#34373c"))
	_build_organic_plateau_mesh(root, "NorthRidgeBackdrop", Vector3(14.0, 0.0, -23.0), 34.0, 16.5, 13.4, -1.8, mat_rock, false, Color("#5d6051"), Color("#42413c"))
	_build_organic_plateau_mesh(root, "HighTrailShoulderHill", Vector3(23.0, 0.0, -16.5), 19.0, 12.5, 7.6, -1.6, mat_rock, false, Color("#605f52"), Color("#42413c"))
	_build_organic_plateau_mesh(root, "EastHeadlandSpur", Vector3(31.0, 0.0, 6.0), 15.0, 14.5, 6.4, -1.6, mat_basalt, false, Color("#585a5c"), Color("#3c3e40"))
	_add_tactical_zone_grid(root, Rect2(-9.0, -7.5, 19.5, 18.0), 0.65)

	# Entrada cavernosa natural con pilares basalticos redondeados y dintel
	for pspec in [
		{"pos": Vector3(-14.5, 2.2, 4.5), "sc": Vector3(3.4, 4.2, 3.6)},
		{"pos": Vector3(-14.5, 2.2, -9.0), "sc": Vector3(3.6, 4.4, 3.6)},
		{"pos": Vector3(-15.5, 4.8, -2.2), "sc": Vector3(4.2, 2.2, 7.6)}
	]:
		_add_boulder_cluster_mesh(root, pspec["pos"], pspec["sc"], mat_basalt, rng)
	_add_mist(root, Vector3(-11.5, 1.35, -2.2))

	# Hito exterior frente a la boca de B1 (empalado al suelo, fijo sin girar con la camara)
	var b1_cairn := Node3D.new()
	b1_cairn.name = "PleamarB1ExteriorThreshold"
	b1_cairn.position = Vector3(-11.2, 0.60, 1.6)
	b1_cairn.rotation.y = deg_to_rad(28.0)
	root.add_child(b1_cairn)
	var cairn_post := MeshInstance3D.new()
	var cp_m := CylinderMesh.new()
	cp_m.top_radius = 0.075; cp_m.bottom_radius = 0.098; cp_m.height = 2.05; cp_m.radial_segments = 8
	cairn_post.mesh = cp_m; cairn_post.material_override = mat_wood
	cairn_post.position = Vector3(0.0, 0.50, -0.03)
	b1_cairn.add_child(cairn_post)
	var cairn_board := MeshInstance3D.new()
	var cb_m := BoxMesh.new()
	cb_m.size = Vector3(1.18, 0.34, 0.055)
	cairn_board.mesh = cb_m; cairn_board.material_override = mat_wood
	cairn_board.position = Vector3(0.0, 1.32, 0.0)
	b1_cairn.add_child(cairn_board)
	var cairn_lbl := Label3D.new()
	cairn_lbl.name = "B1ApproachLabel"
	cairn_lbl.text = "Boca Exterior de Pleamar (Hacia B1)"
	cairn_lbl.font_size = 24
	cairn_lbl.pixel_size = 0.0038
	cairn_lbl.width = 270.0
	cairn_lbl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	cairn_lbl.position = Vector3(0.0, 1.32, 0.034)
	cairn_lbl.modulate = Color("#f3dfb6")
	cairn_lbl.outline_modulate = Color(0.05, 0.04, 0.03, 0.96)
	cairn_lbl.outline_size = 8
	b1_cairn.add_child(cairn_lbl)

	# Camino costero continuo desde el Retiro (este) rodeado de roca y pinos hasta la playa
	_build_continuous_trail(root, "Approach_PleamarLow", [
		Vector3(12.0, 0.62, 8.2), Vector3(17.5, 0.62, 11.4), Vector3(22.2, 0.60, 14.2),
		Vector3(27.5, 0.58, 16.8), Vector3(33.5, 0.56, 15.2), Vector3(39.0, 0.54, 11.0)
	], 3.1, 3.2, Color("#b69f79"), Color("#5f5a47"), mat_earth)

	# Sendero descendente continuo sobre la ladera HighTrailShoulderHill -> NorthRidgeBackdrop
	_build_continuous_trail(root, "Approach_PleamarHigh", [
		Vector3(4.5, 0.62, -5.8), Vector3(9.5, 2.3, -8.8), Vector3(14.5, 4.8, -11.6),
		Vector3(18.2, 7.45, -14.4), Vector3(24.5, 8.3, -18.0), Vector3(31.0, 9.8, -21.5),
		Vector3(38.0, 11.4, -23.5)
	], 2.9, 6.0, Color("#a38e6d"), Color("#565341"), mat_earth)

	_add_spawn(root, "from_pleamar_low", Vector3(22.0, 0.64, 14.0), "w")
	_add_spawn(root, "from_pleamar_sea", Vector3(-6.2, 0.65, 13.8), "nw")
	_add_spawn(root, "from_pleamar_high", Vector3(18.0, 7.55, -14.2), "sw")
	var sea_boat := MeshInstance3D.new()
	sea_boat.name = "PleamarArrivalRowboat"
	var sb_hull := CylinderMesh.new()
	sb_hull.top_radius = 0.85; sb_hull.bottom_radius = 0.58; sb_hull.height = 3.6; sb_hull.radial_segments = 10
	sea_boat.mesh = sb_hull; sea_boat.material_override = mat_wood
	sea_boat.position = Vector3(-9.4, 0.28, 17.6)
	sea_boat.rotation = Vector3(PI * 0.5, 0.35, 0.0)
	sea_boat.scale = Vector3(1.0, 1.0, 0.46)
	root.add_child(sea_boat)
	_add_exit(root, "Exit_Back_Pleamar_Low", "back-pleamar-low", "Regresar al Sendero de Pleamar", "El Retiro — Costa Baja", "res://scenes/main.tscn", "from_pleamar_low", "ne", "trail", Vector3(27.5, 0.60, 16.8), 2.1, true)
	_add_exit(root, "Exit_Back_Pleamar_High", "back-pleamar-high", "Subir al Sendero Alto del Retiro", "El Retiro — Senda Alta", "res://scenes/main.tscn", "from_pleamar_high", "se", "trail", Vector3(24.5, 8.35, -18.0), 2.1, true)

	_scatter_natural_foliage(root, rng, mat_rock, mat_wood, [
		Vector3(14.5, 0.60, 4.5), Vector3(23.5, 0.60, 11.0), Vector3(29.5, 5.2, 7.5),
		Vector3(10.5, 7.8, -19.5), Vector3(23.0, 9.2, -21.5), Vector3(-5.0, 0.60, 13.0),
		Vector3(-9.0, 3.6, -12.0), Vector3(29.0, 4.6, 11.5)
	], Rect2(-10.0, -8.0, 20.0, 18.0))

func _build_observatory_approach(root: Node3D, mat_earth: Material, mat_rock: Material, mat_basalt: Material, mat_stone: Material, mat_wood: Material, rng: RandomNumberGenerator) -> void:
	# Cumbre esculpida ancha + contrafuertes sur-oeste y sur-este para que las aproximaciones nunca cuelguen
	_build_organic_plateau_mesh(root, "ObservatorySummit", Vector3(0.0, 0.0, 2.0), 33.0, 29.0, 33.4, -2.0, mat_rock, true, Color("#7d786c"), Color("#44423f"))
	_build_organic_plateau_mesh(root, "SWApproachRidge", Vector3(-18.5, 0.0, 16.5), 16.5, 13.0, 32.8, -2.0, mat_rock, false, Color("#6e6b5e"), Color("#42403c"))
	_build_organic_plateau_mesh(root, "SEApproachRidge", Vector3(20.0, 0.0, 15.5), 16.0, 13.0, 32.0, -2.0, mat_rock, false, Color("#6b685c"), Color("#413f3b"))
	_build_organic_plateau_mesh(root, "RuinsPlinth", Vector3(0.0, 32.0, -7.2), 9.5, 7.5, 34.0, 32.5, mat_stone, true, Color("#aba392"), Color("#6b665c"))
	_add_tactical_zone_grid(root, Rect2(-9.5, -9.5, 19.0, 18.0), 33.48)

	# Columnas talladas y pedestal del astrolabio (cilindros estriados + losa)
	for x_off in [-4.5, 4.5]:
		var col := CylinderMesh.new()
		col.top_radius = 0.58; col.bottom_radius = 0.68; col.height = 4.6; col.radial_segments = 12
		var ci := MeshInstance3D.new()
		ci.mesh = col; ci.material_override = mat_stone
		ci.position = Vector3(x_off, 36.2, -9.8)
		root.add_child(ci)
	var ped := CylinderMesh.new()
	ped.top_radius = 1.1; ped.bottom_radius = 1.3; ped.height = 1.6; ped.radial_segments = 12
	var pi := MeshInstance3D.new()
	pi.mesh = ped; pi.material_override = mat_stone
	pi.position = Vector3(0.0, 34.6, -8.4)
	root.add_child(pi)

	_build_continuous_trail(root, "Approach_ObsInland", [
		Vector3(-9.0, 33.42, 8.8), Vector3(-13.8, 33.4, 15.2), Vector3(-17.8, 33.2, 18.0),
		Vector3(-21.8, 33.0, 18.2), Vector3(-25.8, 32.85, 15.8), Vector3(-28.8, 32.7, 12.2)
	], 3.0, 4.2, Color("#a99a80"), Color("#5d5c48"), mat_earth)

	_build_continuous_trail(root, "Approach_ObsCoast", [
		Vector3(9.8, 33.15, 7.8), Vector3(15.0, 32.6, 12.8), Vector3(18.6, 32.28, 15.5),
		Vector3(22.4, 32.0, 16.4), Vector3(26.2, 31.8, 14.2), Vector3(29.2, 31.6, 10.6)
	], 2.75, 4.2, Color("#9f9584"), Color("#5a584a"), mat_earth)

	_add_spawn(root, "from_obs_inland", Vector3(-13.8, 33.48, 15.2), "n")
	_add_spawn(root, "from_obs_coast", Vector3(18.2, 32.32, 15.4), "nw")
	_add_exit(root, "Exit_Back_Obs_Inland", "back-obs-inland", "Descender al Paso del Retiro", "El Retiro — Paso Norte", "res://scenes/main.tscn", "from_obs_inland", "se", "trail", Vector3(-21.5, 33.05, 18.1), 2.1, true)
	_add_exit(root, "Exit_Back_Obs_Coast", "back-obs-coast", "Volver por la Cornisa Oriental", "El Retiro — Cornisa Este", "res://scenes/main.tscn", "from_obs_coast", "sw", "trail", Vector3(22.4, 32.05, 16.3), 2.1, true)

	_scatter_natural_foliage(root, rng, mat_rock, mat_wood, [
		Vector3(-12.5, 33.3, -3.5), Vector3(13.0, 33.1, -4.0), Vector3(-15.5, 33.2, 8.0),
		Vector3(16.0, 32.9, 6.0), Vector3(-22.5, 32.8, 12.0), Vector3(24.0, 31.9, 9.5),
		Vector3(-6.0, 33.3, -13.5), Vector3(7.0, 33.3, -13.0)
	], Rect2(-10.0, -11.0, 20.0, 20.0))

func _build_pecio_arrival(root: Node3D, mat_earth: Material, mat_rock: Material, mat_basalt: Material, mat_wood: Material, rng: RandomNumberGenerator) -> void:
	# Banco de arena organico y escollos en arco rodeando el desembarco
	_build_organic_plateau_mesh(root, "ReefSandbar", Vector3(0.5, 0.0, 1.5), 19.5, 16.0, 0.62, -1.4, mat_earth, true, Color("#cbb38a"), Color("#6d6350"))
	_build_organic_plateau_mesh(root, "NorthReefSpur", Vector3(9.5, 0.0, -9.0), 12.5, 8.5, 2.35, -1.4, mat_basalt, false, Color("#53575c"), Color("#34383d"))
	_add_walk_slab(root, "LandingPier", Vector3(-11.8, 0.36, 9.8), Vector3(9.8, 0.58, 3.6), mat_wood)
	for px in [-16.0, -8.2]:
		for pz in [8.3, 11.3]:
			var pile := MeshInstance3D.new()
			var pm := CylinderMesh.new()
			pm.top_radius = 0.22; pm.bottom_radius = 0.26; pm.height = 1.9; pm.radial_segments = 8
			pile.mesh = pm; pile.material_override = mat_wood
			pile.position = Vector3(px, -0.2, pz)
			root.add_child(pile)
	_add_tactical_zone_grid(root, Rect2(-8.0, -9.0, 18.0, 15.0), 0.68)

	# Cuadernas curvas del pecio en el bajio nordeste + bote amarrado en el muelle
	for k in range(6):
		var rx := 5.5 + float(k) * 2.1
		var rib := MeshInstance3D.new()
		var bm := BoxMesh.new()
		bm.size = Vector3(0.42, 2.9 - float(k) * 0.25, 4.8)
		rib.mesh = bm; rib.material_override = mat_wood
		rib.position = Vector3(rx, 1.35, -7.2 + float(k) * 0.35)
		rib.rotation = Vector3(0.14, 0.22, -0.18)
		root.add_child(rib)

	var boat := MeshInstance3D.new()
	boat.name = "MooredBoatHull"
	var hull_m := CylinderMesh.new()
	hull_m.top_radius = 1.05; hull_m.bottom_radius = 0.72; hull_m.height = 3.8; hull_m.radial_segments = 10
	boat.mesh = hull_m; boat.material_override = mat_wood
	boat.position = Vector3(-17.8, 0.42, 12.8)
	boat.rotation = Vector3(PI * 0.5, 0.45, 0.0)
	boat.scale = Vector3(1.0, 1.0, 0.48)
	root.add_child(boat)
	_add_mist(root, Vector3(6.5, 1.15, -7.2))

	_add_spawn(root, "from_retreat_boat", Vector3(-11.5, 0.70, 9.8), "ne")
	var boat_exit := _add_exit(root, "Exit_Return_Retreat_Boat", "back-retreat-boat", "Bote de Regreso al Retiro", "El Retiro — Embarcadero", "res://scenes/main.tscn", "from_retreat_boat", "n", "boat", Vector3(-15.6, 0.66, 11.4), 2.4, false)
	boat_exit.interaction_hint = "[T] Zarpar de vuelta al Retiro"

	# Solo peñascos y pinos costeros sobre tierra firme (sin flotar en el mar)
	_scatter_natural_foliage(root, rng, mat_basalt, mat_wood, [
		Vector3(10.5, 0.60, 4.0), Vector3(10.0, 0.75, -5.0), Vector3(4.5, 1.25, -8.8), Vector3(13.0, 1.10, -8.5)
	], Rect2(-19.0, 6.0, 16.0, 8.0))

# ==============================================================================
# GENERADORES ORGANICOS DE MALLA Y VEGETACIÓN COMPARTIDOS
# ==============================================================================
func _build_organic_plateau_mesh(root: Node3D, mound_name: String, center: Vector3, rx: float, rz: float, top_y: float, base_y: float, base_mat: Material, walkable: bool, top_tint: Color, rim_tint: Color) -> void:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var rings := 9
	var segs := 24
	var rows: Array = []
	for r in range(rings + 1):
		var f := float(r) / float(rings)
		var rpts: Array[Vector3] = []
		var rcols: Array[Color] = []
		for s in range(segs + 1):
			var ang := (float(s) / float(segs)) * TAU
			var warp := 1.0 + 0.14 * sin(ang * 3.0 + center.x * 0.2) + 0.08 * cos(ang * 5.0)
			var wx := center.x + cos(ang) * rx * f * warp
			var wz := center.z + sin(ang) * rz * f * warp
			# Meseta superior ancha hasta f=0.68 y caida talud en borde
			var slope_f := clampf((1.0 - f) / 0.34, 0.0, 1.0) if f > 0.66 else 1.0
			var micro := 0.10 * sin(wx * 0.35) * cos(wz * 0.35) * (1.0 - slope_f * 0.6)
			var wy := lerpf(base_y, top_y, pow(slope_f, 0.8)) + micro
			rpts.append(Vector3(wx, wy, wz))
			rcols.append(rim_tint.lerp(top_tint, pow(slope_f, 0.65)))
		rows.append({"pts": rpts, "cols": rcols})

	for r in range(rings):
		var a_pts: Array = rows[r]["pts"]
		var b_pts: Array = rows[r + 1]["pts"]
		var a_col: Array = rows[r]["cols"]
		var b_col: Array = rows[r + 1]["cols"]
		for s in range(segs):
			_emit_quad(st, a_pts[s], a_pts[s + 1], b_pts[s + 1], b_pts[s], a_col[s], a_col[s + 1], b_col[s + 1], b_col[s])

	st.generate_normals()
	var mesh := st.commit()
	var inst := MeshInstance3D.new()
	inst.name = mound_name
	inst.set_meta("grid_surface",walkable)
	inst.mesh = mesh
	var m := (base_mat as BaseMaterial3D).duplicate() as BaseMaterial3D
	m.vertex_color_use_as_albedo = true
	m.vertex_color_is_srgb = true
	inst.material_override = m
	root.add_child(inst)

	if walkable:
		var sb := StaticBody3D.new()
		var col := CollisionShape3D.new()
		var box := BoxShape3D.new()
		box.size = Vector3(rx * 1.45, 1.4, rz * 1.45)
		col.shape = box
		col.position = Vector3(center.x, top_y - 0.70, center.z)
		sb.add_child(col)
		root.add_child(sb)

func _build_continuous_trail(root: Node3D, trail_name: String, raw_pts: Array, width: float, skirt_drop: float, tread_col: Color, edge_col: Color, base_mat: Material) -> void:
	# Chaikin 1 pasada + ribbon continuo + colliders de rampa sin grietas
	var pts: Array[Vector3] = []
	for p in raw_pts:
		pts.append(p as Vector3)
	if pts.size() >= 3:
		var sm: Array[Vector3] = [pts[0]]
		for i in range(pts.size() - 1):
			sm.append(pts[i].lerp(pts[i + 1], 0.25))
			sm.append(pts[i].lerp(pts[i + 1], 0.75))
		sm.append(pts[pts.size() - 1])
		pts = sm

	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var rings: Array = []
	for i in range(pts.size()):
		var p := pts[i]
		var fwd := pts[1] - pts[0] if i == 0 else (pts[i] - pts[i - 1] if i == pts.size() - 1 else pts[i + 1] - pts[i - 1])
		fwd.y = 0.0
		if fwd.length_squared() < 0.001:
			fwd = Vector3.FORWARD
		fwd = fwd.normalized()
		var right := Vector3(-fwd.z, 0.0, fwd.x)
		var hw := width * 0.5 * (1.0 + 0.12 * sin(float(i) * 1.4))
		var ow := hw + 0.85
		rings.append({
			"pts": [p - right * (ow + 0.9) - Vector3(0.0, skirt_drop, 0.0), p - right * ow - Vector3(0.0, 0.22, 0.0), p - right * hw + Vector3(0.0, 0.015, 0.0), p + Vector3(0.0, 0.035, 0.0), p + right * hw + Vector3(0.0, 0.015, 0.0), p + right * ow - Vector3(0.0, 0.22, 0.0), p + right * (ow + 0.9) - Vector3(0.0, skirt_drop, 0.0)],
			"cols": [Color("#3b3b39"), edge_col, tread_col.darkened(0.05), tread_col.lightened(0.04), tread_col.darkened(0.05), edge_col, Color("#3b3b39")]
		})
	for i in range(rings.size() - 1):
		var pa: Array = rings[i]["pts"]
		var pb: Array = rings[i + 1]["pts"]
		var ca: Array = rings[i]["cols"]
		var cb: Array = rings[i + 1]["cols"]
		for s in range(6):
			_emit_quad(st, pa[s], pa[s + 1], pb[s + 1], pb[s], ca[s], ca[s + 1], cb[s + 1], cb[s])

	st.generate_normals()
	var inst := MeshInstance3D.new()
	inst.name = trail_name
	inst.set_meta("grid_surface",true)
	inst.mesh = st.commit()
	var m := (base_mat as BaseMaterial3D).duplicate() as BaseMaterial3D
	m.vertex_color_use_as_albedo = true
	m.vertex_color_is_srgb = true
	inst.material_override = m
	root.add_child(inst)

	var sb := StaticBody3D.new()
	sb.name = trail_name + "_Col"
	root.add_child(sb)
	for i in range(pts.size() - 1):
		var a := pts[i]
		var b := pts[i + 1]
		var mid := (a + b) * 0.5
		var seg := b - a
		var horiz := Vector2(seg.x, seg.z).length()
		if horiz < 0.05:
			continue
		var col := CollisionShape3D.new()
		var box := BoxShape3D.new()
		box.size = Vector3(width + 0.6, 1.4, seg.length() + 0.5)
		col.shape = box
		col.transform = Transform3D(Basis.from_euler(Vector3(-atan2(seg.y, horiz), atan2(seg.x, seg.z), 0.0)), mid - Vector3(0.0, 0.70, 0.0))
		sb.add_child(col)

func _emit_quad(st: SurfaceTool, p0: Vector3, p1: Vector3, p2: Vector3, p3: Vector3, c0: Color, c1: Color, c2: Color, c3: Color) -> void:
	st.set_color(c0); st.set_uv(Vector2(p0.x * 0.25, p0.z * 0.25)); st.add_vertex(p0)
	st.set_color(c3); st.set_uv(Vector2(p3.x * 0.25, p3.z * 0.25)); st.add_vertex(p3)
	st.set_color(c2); st.set_uv(Vector2(p2.x * 0.25, p2.z * 0.25)); st.add_vertex(p2)
	st.set_color(c0); st.set_uv(Vector2(p0.x * 0.25, p0.z * 0.25)); st.add_vertex(p0)
	st.set_color(c2); st.set_uv(Vector2(p2.x * 0.25, p2.z * 0.25)); st.add_vertex(p2)
	st.set_color(c1); st.set_uv(Vector2(p1.x * 0.25, p1.z * 0.25)); st.add_vertex(p1)

func _scatter_natural_foliage(root: Node3D, rng: RandomNumberGenerator, mat_rock: Material, mat_wood: Material, anchors: Array, clear_zone: Rect2) -> void:
	var foliage_mat := _mat(Color("#254f2b"), 0.92, 0.0)
	var bush_mat := _mat(Color("#395d31"), 0.93, 0.0)
	var tier_m := _make_pine_tier_mesh()
	for a in anchors:
		var pos := a as Vector3
		if clear_zone.has_point(Vector2(pos.x, pos.z)):
			continue
		_add_boulder_cluster_mesh(root, pos + Vector3(rng.randf_range(-1.4, 1.4), 0.1, rng.randf_range(-1.4, 1.4)), Vector3(rng.randf_range(0.9, 1.8), rng.randf_range(0.7, 1.3), rng.randf_range(0.9, 1.8)), mat_rock, rng)
		# Pino 3 capas
		var sc := rng.randf_range(0.9, 1.35)
		var trunk := CylinderMesh.new()
		trunk.top_radius = 0.14 * sc; trunk.bottom_radius = 0.24 * sc; trunk.height = 3.2 * sc; trunk.radial_segments = 7
		var ti := MeshInstance3D.new()
		ti.mesh = trunk; ti.material_override = mat_wood; ti.position = pos + Vector3(0.0, 1.4 * sc, 0.0)
		root.add_child(ti)
		for t_i in range(3):
			var ci := MeshInstance3D.new()
			ci.mesh = tier_m; ci.material_override = foliage_mat
			var w: float = float([1.55, 1.20, 0.82][t_i]) * sc
			var h: float = float([1.80, 1.70, 1.50][t_i]) * sc
			var yoff: float = float([2.4, 3.55, 4.6][t_i]) * sc
			ci.position = pos + Vector3(0.0, yoff, 0.0)
			ci.scale = Vector3(w, h, w)
			ci.rotation.y = float(t_i) * 0.7
			root.add_child(ci)
		var bm := SphereMesh.new()
		bm.radius = 0.65; bm.height = 0.72; bm.radial_segments = 8; bm.rings = 4
		var bi := MeshInstance3D.new()
		bi.mesh = bm; bi.material_override = bush_mat
		bi.position = pos + Vector3(rng.randf_range(-1.5, 1.5), 0.25, rng.randf_range(-1.5, 1.5))
		root.add_child(bi)

func _add_boulder_cluster_mesh(root: Node3D, pos: Vector3, sc: Vector3, mat: Material, rng: RandomNumberGenerator) -> void:
	var sm := SphereMesh.new()
	sm.radius = 0.75; sm.height = 1.0; sm.radial_segments = 7; sm.rings = 4
	var inst := MeshInstance3D.new()
	inst.mesh = sm; inst.material_override = mat
	inst.position = pos
	inst.scale = sc
	inst.rotation = Vector3(rng.randf_range(-0.15, 0.15), rng.randf_range(0.0, TAU), rng.randf_range(-0.15, 0.15))
	root.add_child(inst)

func _make_pine_tier_mesh() -> ArrayMesh:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var boughs := 16
	var apex := Vector3(0.0, 0.56, 0.0)
	var skirt_ring: Array[Vector3] = []
	for i in range(boughs):
		var ang := float(i) / float(boughs) * TAU
		var rad := 1.02 if (i % 2 == 0) else 0.64
		var drop := -0.50 if (i % 2 == 0) else -0.42
		skirt_ring.append(Vector3(cos(ang) * rad, drop, sin(ang) * rad))
	var center_bottom := Vector3(0.0, -0.34, 0.0)
	for i in range(boughs):
		var next_i := (i + 1) % boughs
		var p1 := skirt_ring[i]
		var p2 := skirt_ring[next_i]
		st.add_vertex(apex)
		st.add_vertex(p1)
		st.add_vertex(p2)
		st.add_vertex(center_bottom)
		st.add_vertex(p2)
		st.add_vertex(p1)
	st.generate_normals()
	return st.commit()

func _add_tactical_zone_grid(root: Node3D, _area: Rect2, _y_level: float) -> void:
	var grid:=preload("res://player/walkable_grid.gd").new()
	grid.name="TacticalGridOverlay"; root.add_child(grid)
	grid.configure_box_surfaces.call_deferred(root)

func _add_spawn(root: Node3D, spawn_id: String, pos: Vector3, facing: String) -> Marker3D:
	var sp := Marker3D.new()
	sp.name = "Spawn_" + spawn_id
	sp.position = pos
	sp.set_meta("spawn_facing", facing)
	root.add_child(sp)
	return sp

func _add_exit(root: Node3D, node_name: String, id: String, title: String, dest_label: String, scene_path: String, spawn_id: String, facing: String, mode: String, pos: Vector3, radius: float, _is_auto: bool) -> Node:
	var ex := MapExitScript.new()
	ex.name = node_name
	ex.exit_id = id
	ex.display_name = title
	ex.destination_label = dest_label
	ex.target_scene_path = scene_path
	ex.target_spawn_id = spawn_id
	ex.entry_facing = facing
	ex.transition_mode = mode
	ex.trigger_radius = radius
	ex.trigger_height = 3.2
	ex.auto_trigger = false
	ex.prompt_before_travel = true
	ex.signpost_style = "hanging_ropes" if mode == "boat" else "dragon_plaque"
	ex.sign_short_title = dest_label
	ex.sign_subtitle = "Embarcar de regreso hacia El Retiro del Dragón." if mode == "boat" else ("%s · Camino de regreso al claustro de El Retiro del Dragón." % title)
	ex.reversible = true
	ex.position = pos
	root.add_child(ex)
	return ex

func _add_walk_slab(root: Node3D, slab_name: String, pos: Vector3, size: Vector3, mat: Material) -> void:
	var inst := MeshInstance3D.new()
	inst.name = slab_name
	var bm := BoxMesh.new()
	bm.size = size
	inst.mesh = bm; inst.material_override = mat; inst.position = pos
	inst.set_meta("grid_surface",true)
	root.add_child(inst)
	var sb := StaticBody3D.new()
	var col := CollisionShape3D.new()
	var bshape := BoxShape3D.new()
	bshape.size = size
	col.shape = bshape
	sb.add_child(col)
	inst.add_child(sb)

func _add_mist(root: Node3D, pos: Vector3) -> void:
	var p := GPUParticles3D.new()
	p.position = pos
	p.amount = 14
	p.lifetime = 4.4
	p.preprocess = 2.0
	var pm := ParticleProcessMaterial.new()
	pm.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_BOX
	pm.emission_box_extents = Vector3(4.5, 0.4, 3.2)
	pm.initial_velocity_min = 0.2
	pm.initial_velocity_max = 0.5
	pm.gravity = Vector3.ZERO
	pm.scale_min = 1.8
	pm.scale_max = 3.4
	pm.color = Color(0.84, 0.91, 0.96, 0.16)
	p.process_material = pm

	var grad := Gradient.new()
	grad.offsets = PackedFloat32Array([0.0, 0.45, 1.0])
	grad.colors = PackedColorArray([Color(0.88, 0.94, 0.98, 0.46), Color(0.85, 0.92, 0.96, 0.16), Color(0.85, 0.92, 0.96, 0.0)])
	var gtex := GradientTexture2D.new()
	gtex.width = 64; gtex.height = 64; gtex.fill = GradientTexture2D.FILL_RADIAL
	gtex.fill_from = Vector2(0.5, 0.5); gtex.fill_to = Vector2(0.95, 0.5); gtex.gradient = grad

	var q := QuadMesh.new()
	q.size = Vector2(2.6, 1.8)
	var m := StandardMaterial3D.new()
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.billboard_mode = BaseMaterial3D.BILLBOARD_ENABLED
	m.albedo_texture = gtex
	m.albedo_color = Color(1.0, 1.0, 1.0, 0.45)
	m.depth_draw_mode = BaseMaterial3D.DEPTH_DRAW_DISABLED
	p.draw_pass_1 = q; p.material_override = m; p.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	root.add_child(p)

func _tex_mat(tex_path: String, tint: Color, rough: float, met: float, uv_scale: Vector3, normal_path: String = "") -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = tint
	m.roughness = rough
	m.metallic = met
	m.uv1_scale = uv_scale
	if ResourceLoader.exists(tex_path):
		m.albedo_texture = load(tex_path)
	if not normal_path.is_empty() and ResourceLoader.exists(normal_path):
		m.normal_enabled = true
		m.normal_texture = load(normal_path)
		m.normal_scale = 0.65
	return m

func _mat(col: Color, rough: float, met: float) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = col; m.roughness = rough; m.metallic = met
	return m
