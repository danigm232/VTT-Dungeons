class_name RouteDestinationController
extends Node3D

# ==============================================================================
# CONTROLADOR DE ESCENAS CONECTADAS (DESTINOS TRANSICIONABLES DESDE EL RETIRO)
# Provee geografia continua, colision transitable, cuadricula central discreta,
# enmarcado natural (rocas, arboles, bruma) y salidas MapExit bidireccionales.
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
	var focus := Vector3(0.0, 1.8, 2.0)
	var dist := 34.0
	match scene_kind:
		"observatory_approach":
			focus = Vector3(0.0, 34.0, 2.0)
			dist = 38.0
		"pecio_cove_arrival":
			focus = Vector3(2.0, 1.0, 1.0)
			dist = 32.0
	camera.set("is_overview", false)
	camera.set("is_following", false)
	camera.set("target_focus", focus)
	camera.set("focus_point", focus)
	if not camera.get("_restored_preferences"):
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
# CONSTRUCCIÓN DE ESCENARIO DESTINO
# ==============================================================================
func _build_destination_environment() -> void:
	var env_root := Node3D.new()
	env_root.name = "DestinationWorld"
	add_child(env_root)

	# Mar continuo que rodea la escena sin cortes
	var ocean := MeshInstance3D.new()
	ocean.name = "OceanPlane"
	var om := PlaneMesh.new()
	om.size = Vector2(560.0, 560.0)
	ocean.mesh = om
	var omat := StandardMaterial3D.new()
	omat.albedo_color = Color("#134658")
	omat.roughness = 0.24
	omat.metallic = 0.12
	ocean.material_override = omat
	ocean.position = Vector3(0.0, 0.0, 0.0)
	env_root.add_child(ocean)

	var mat_stone := _mat(Color("#54524e"), 0.92, 0.03)
	var mat_slate := _mat(Color("#3b3f44"), 0.88, 0.05)
	var mat_trail := _mat(Color("#9f8a68"), 0.94, 0.02)
	var mat_wood := _mat(Color("#694c33"), 0.86, 0.03)
	var mat_pine := _mat(Color("#214726"), 0.92, 0.0)
	var mat_moss := _mat(Color("#385b30"), 0.93, 0.0)

	var rng := RandomNumberGenerator.new()
	rng.seed = hash(scene_kind)

	match scene_kind:
		"pleamar_coves":
			_build_pleamar_coves(env_root, mat_stone, mat_slate, mat_trail, mat_moss, mat_pine, mat_wood, rng)
		"observatory_approach":
			_build_observatory_approach(env_root, mat_stone, mat_slate, mat_trail, mat_moss, mat_pine, mat_wood, rng)
		"pecio_cove_arrival":
			_build_pecio_arrival(env_root, mat_stone, mat_slate, mat_trail, mat_moss, mat_pine, mat_wood, rng)

func _build_pleamar_coves(root: Node3D, mat_stone: Material, mat_slate: Material, mat_trail: Material, mat_moss: Material, mat_pine: Material, mat_wood: Material, rng: RandomNumberGenerator) -> void:
	# Playa basaltica principal y explanada frente a la bocana
	_add_walk_slab(root, "CoveBasinFloor", Vector3(3.0, 0.28, 4.0), Vector3(34.0, 0.6, 28.0), mat_trail)
	_add_walk_slab(root, "CaveThresholdFloor", Vector3(-13.0, 0.34, -2.0), Vector3(14.0, 0.6, 16.0), mat_slate)
	_add_tactical_zone_grid(root, Rect2(-10.0, -8.0, 22.0, 20.0), 0.62)

	# Camino costero continuo desde el Retiro (este) oculto tras cabo rocoso
	_build_curved_approach_path(root, "Approach_PleamarLow", [
		Vector3(14.0, 0.56, 9.0), Vector3(19.0, 0.56, 12.2), Vector3(24.0, 0.55, 15.6),
		Vector3(28.5, 0.55, 18.2), Vector3(34.5, 0.52, 20.0), Vector3(41.0, 0.48, 19.0)
	], 3.1, 2.6, mat_trail, mat_slate, true)

	# Camino descendente desde el collado alto del Retiro (noreste)
	_build_curved_approach_path(root, "Approach_PleamarHigh", [
		Vector3(5.0, 0.62, -6.5), Vector3(10.5, 2.5, -9.8), Vector3(15.2, 5.2, -13.0),
		Vector3(19.0, 7.6, -15.6), Vector3(24.5, 8.2, -19.5), Vector3(31.0, 9.6, -24.0),
		Vector3(38.0, 11.2, -26.5)
	], 2.9, 10.0, mat_trail, mat_stone, true)

	# Taludes y acantilados envolventes + arco natural de entrada a la cueva oeste
	_add_box(root, "NorthCliffWall", Vector3(2.0, 7.0, -24.0), Vector3(58.0, 16.0, 14.0), mat_slate)
	_add_box(root, "EastHeadland", Vector3(32.0, 5.5, 6.0), Vector3(14.0, 12.0, 16.0), mat_stone)
	_add_box(root, "CaveLeftPillar", Vector3(-18.5, 4.2, 6.0), Vector3(9.0, 9.0, 10.0), mat_slate)
	_add_box(root, "CaveRightPillar", Vector3(-18.5, 4.2, -10.5), Vector3(9.0, 9.0, 10.0), mat_slate)
	_add_box(root, "CaveArchLintels", Vector3(-21.0, 7.6, -2.2), Vector3(10.0, 3.2, 18.0), mat_slate)
	_add_mist(root, Vector3(-13.0, 1.4, -2.0))

	# Spawns de llegada + salidas bidireccionales al Retiro
	_add_spawn(root, "from_pleamar_low", Vector3(22.0, 0.58, 14.0), "w")
	_add_spawn(root, "from_pleamar_high", Vector3(18.0, 7.6, -15.0), "sw")

	_add_exit(root, "Exit_Back_Pleamar_Low", "back-pleamar-low", "Regresar al Sendero de Pleamar", "El Retiro — Costa Baja", "res://scenes/main.tscn", "from_pleamar_low", "ne", "trail", Vector3(27.5, 0.55, 17.5), 2.1, true)
	_add_exit(root, "Exit_Back_Pleamar_High", "back-pleamar-high", "Subir al Sendero Alto del Retiro", "El Retiro — Senda Alta", "res://scenes/main.tscn", "from_pleamar_high", "se", "trail", Vector3(24.5, 8.2, -19.5), 2.1, true)

	_scatter_framing_props(root, rng, mat_stone, mat_moss, mat_pine, mat_wood, Vector2(-12.0, 26.0), Vector2(-20.0, 18.0), 0.58, 18, 14)

func _build_observatory_approach(root: Node3D, mat_stone: Material, mat_slate: Material, mat_trail: Material, mat_moss: Material, mat_pine: Material, mat_wood: Material, rng: RandomNumberGenerator) -> void:
	# Meseta de aproximacion en altura + explanada de losas antiguas del observatorio
	_add_walk_slab(root, "PlateauBase", Vector3(0.0, 32.8, 0.0), Vector3(30.0, 1.2, 26.0), mat_stone)
	_add_walk_slab(root, "ObservatoryPlinth", Vector3(0.0, 33.6, -7.0), Vector3(14.0, 0.8, 12.0), mat_slate)
	_add_box(root, "CliffPedestalCore", Vector3(0.0, 15.8, -4.0), Vector3(52.0, 32.5, 42.0), mat_slate)
	_add_tactical_zone_grid(root, Rect2(-10.5, -10.5, 21.0, 20.0), 33.46)

	# Columnata rota y pedestal del astrolabio en la cima norte
	for x_off in [-4.5, 4.5]:
		_add_box(root, "RuinPillar_" + str(int(x_off)), Vector3(x_off, 36.4, -10.0), Vector3(1.4, 4.8, 1.4), mat_stone)
	_add_box(root, "AstrolabePedestal", Vector3(0.0, 34.8, -8.5), Vector3(2.4, 1.8, 2.4), mat_stone)

	# Camino desde Paso Norte (inland SO)
	_build_curved_approach_path(root, "Approach_ObsInland", [
		Vector3(-9.5, 33.4, 9.5), Vector3(-13.8, 33.4, 15.8), Vector3(-17.5, 33.15, 20.2),
		Vector3(-20.2, 32.9, 24.0), Vector3(-23.0, 32.6, 29.5), Vector3(-26.0, 32.2, 35.0)
	], 3.0, 18.0, mat_trail, mat_stone, true)

	# Camino desde Cornisa Oriental (SE)
	_build_curved_approach_path(root, "Approach_ObsCoast", [
		Vector3(10.5, 33.1, 8.0), Vector3(15.2, 32.5, 13.0), Vector3(18.5, 32.2, 16.8),
		Vector3(22.5, 31.85, 21.6), Vector3(26.0, 31.4, 27.0), Vector3(30.0, 31.0, 33.0)
	], 2.75, 18.0, mat_trail, mat_stone, true)

	_add_spawn(root, "from_obs_inland", Vector3(-13.8, 33.45, 15.8), "n")
	_add_spawn(root, "from_obs_coast", Vector3(18.2, 32.25, 16.5), "nw")

	_add_exit(root, "Exit_Back_Obs_Inland", "back-obs-inland", "Descender al Paso del Retiro", "El Retiro — Paso Norte", "res://scenes/main.tscn", "from_obs_inland", "se", "trail", Vector3(-19.5, 32.95, 23.5), 2.1, true)
	_add_exit(root, "Exit_Back_Obs_Coast", "back-obs-coast", "Volver por la Cornisa Oriental", "El Retiro — Cornisa Este", "res://scenes/main.tscn", "from_obs_coast", "sw", "trail", Vector3(22.8, 31.85, 22.0), 2.1, true)

	_scatter_framing_props(root, rng, mat_stone, mat_moss, mat_pine, mat_wood, Vector2(-22.0, 22.0), Vector2(-12.0, 24.0), 33.2, 16, 16)

func _build_pecio_arrival(root: Node3D, mat_stone: Material, mat_slate: Material, mat_trail: Material, mat_moss: Material, mat_pine: Material, mat_wood: Material, rng: RandomNumberGenerator) -> void:
	# Banco de arena, arrecife y muelle de desembarco frente a proa naufragada
	_add_walk_slab(root, "ReefSandbar", Vector3(2.0, 0.28, -2.0), Vector3(28.0, 0.65, 24.0), mat_trail)
	_add_walk_slab(root, "LandingPier", Vector3(-14.5, 0.32, 11.5), Vector3(10.0, 0.6, 4.4), mat_wood)
	_add_tactical_zone_grid(root, Rect2(-9.0, -10.0, 21.0, 16.0), 0.64)

	# Silueta parcial de cuadernas del pecio en el bajio nordeste
	for k in range(5):
		var rx := 7.0 + float(k) * 2.2
		_add_box(root, "WreckRib_" + str(k), Vector3(rx, 1.4, -7.5 + float(k) * 0.4), Vector3(0.45, 2.8, 5.2), mat_wood)
	_add_box(root, "MooredBoatHull", Vector3(-20.2, 0.45, 14.5), Vector3(3.6, 0.75, 1.9), mat_wood)
	_add_mist(root, Vector3(6.0, 1.1, -6.0))

	_add_spawn(root, "from_retreat_boat", Vector3(-13.5, 0.64, 11.5), "ne")
	var boat_exit := _add_exit(root, "Exit_Return_Retreat_Boat", "back-retreat-boat", "Bote de Regreso al Retiro", "El Retiro — Embarcadero", "res://scenes/main.tscn", "from_retreat_boat", "n", "boat", Vector3(-17.8, 0.62, 14.5), 2.4, false)
	boat_exit.interaction_hint = "[T] Zarpar de vuelta al Retiro"

	_scatter_framing_props(root, rng, mat_slate, mat_moss, mat_pine, mat_wood, Vector2(-14.0, 18.0), Vector2(-14.0, 14.0), 0.58, 12, 4)

func _build_curved_approach_path(root: Node3D, node_name: String, pts: Array, width: float, skirt_drop: float, mat_top: Material, mat_skirt: Material, create_colliders: bool) -> void:
	for i in range(pts.size() - 1):
		var a: Vector3 = pts[i]
		var b: Vector3 = pts[i + 1]
		var mid := (a + b) * 0.5
		var seg := b - a
		var horiz := Vector2(seg.x, seg.z).length()
		if horiz < 0.05:
			continue
		var yaw := atan2(seg.x, seg.z)
		var pitch := -atan2(seg.y, horiz)
		var xf_basis := Basis.from_euler(Vector3(pitch, yaw, 0.0))

		var top_mesh := BoxMesh.new()
		top_mesh.size = Vector3(width, 0.35, seg.length() + 0.5)
		var top_inst := MeshInstance3D.new()
		top_inst.name = "%s_Seg_%d" % [node_name, i]
		top_inst.mesh = top_mesh
		top_inst.material_override = mat_top
		top_inst.transform = Transform3D(xf_basis, mid - Vector3(0.0, 0.16, 0.0))
		root.add_child(top_inst)

		var skirt_mesh := BoxMesh.new()
		skirt_mesh.size = Vector3(width + 2.2, skirt_drop, seg.length() + 0.7)
		var skirt_inst := MeshInstance3D.new()
		skirt_inst.mesh = skirt_mesh
		skirt_inst.material_override = mat_skirt
		skirt_inst.transform = Transform3D(Basis.from_euler(Vector3(0.0, yaw, 0.0)), mid - Vector3(0.0, skirt_drop * 0.5 + 0.18, 0.0))
		root.add_child(skirt_inst)

		if create_colliders:
			var sb := StaticBody3D.new()
			var col := CollisionShape3D.new()
			var bshape := BoxShape3D.new()
			bshape.size = Vector3(width + 0.4, 1.2, seg.length() + 0.6)
			col.shape = bshape
			col.transform = Transform3D(xf_basis, mid - Vector3(0.0, 0.60, 0.0))
			sb.add_child(col)
			root.add_child(sb)

func _add_tactical_zone_grid(root: Node3D, area: Rect2, y_level: float) -> void:
	var im := ImmediateMesh.new()
	var mat := StandardMaterial3D.new()
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat.albedo_color = Color(0.95, 0.94, 0.88, 0.14)
	im.surface_begin(Mesh.PRIMITIVE_LINES, mat)
	var step := 1.5
	var x0 := area.position.x
	var x1 := area.position.x + area.size.x
	var z0 := area.position.y
	var z1 := area.position.y + area.size.y
	var x := x0
	while x <= x1 + 0.01:
		im.surface_add_vertex(Vector3(x, y_level, z0))
		im.surface_add_vertex(Vector3(x, y_level, z1))
		x += step
	var z := z0
	while z <= z1 + 0.01:
		im.surface_add_vertex(Vector3(x0, y_level, z))
		im.surface_add_vertex(Vector3(x1, y_level, z))
		z += step
	im.surface_end()
	var inst := MeshInstance3D.new()
	inst.name = "DestinationGrid"
	inst.mesh = im
	inst.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	root.add_child(inst)

func _scatter_framing_props(root: Node3D, rng: RandomNumberGenerator, mat_rock: Material, mat_bush: Material, mat_pine: Material, mat_wood: Material, xr: Vector2, zr: Vector2, base_y: float, rock_count: int, tree_count: int) -> void:
	for i in range(rock_count):
		var px := rng.randf_range(xr.x, xr.y)
		var pz := rng.randf_range(zr.x, zr.y)
		if absf(px) < 7.5 and absf(pz) < 7.5:
			continue
		var sx := rng.randf_range(1.1, 2.6)
		var sy := rng.randf_range(0.8, 1.9)
		_add_box(root, "Boulder_" + str(i), Vector3(px, base_y + sy * 0.25, pz), Vector3(sx, sy, rng.randf_range(1.1, 2.5)), mat_rock)
	for j in range(tree_count):
		var px := rng.randf_range(xr.x - 4.0, xr.y + 4.0)
		var pz := rng.randf_range(zr.x - 4.0, zr.y + 4.0)
		if absf(px) < 9.5 and absf(pz) < 9.5:
			continue
		var trunk := CylinderMesh.new()
		trunk.top_radius = 0.16; trunk.bottom_radius = 0.26; trunk.height = 2.8
		var ti := MeshInstance3D.new()
		ti.mesh = trunk; ti.material_override = mat_wood
		ti.position = Vector3(px, base_y + 1.3, pz)
		root.add_child(ti)
		var cone := CylinderMesh.new()
		cone.top_radius = 0.05; cone.bottom_radius = 1.65; cone.height = 3.2; cone.radial_segments = 8
		var ci := MeshInstance3D.new()
		ci.mesh = cone; ci.material_override = mat_pine if (j % 2 == 0) else mat_bush
		ci.position = Vector3(px, base_y + 3.2, pz)
		root.add_child(ci)

func _add_spawn(root: Node3D, spawn_id: String, pos: Vector3, facing: String) -> Marker3D:
	var sp := Marker3D.new()
	sp.name = "Spawn_" + spawn_id
	sp.position = pos
	sp.set_meta("spawn_facing", facing)
	root.add_child(sp)
	return sp

func _add_exit(root: Node3D, node_name: String, id: String, title: String, dest_label: String, scene_path: String, spawn_id: String, facing: String, mode: String, pos: Vector3, radius: float, is_auto: bool) -> Node:
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
	ex.auto_trigger = is_auto
	ex.reversible = true
	ex.position = pos
	root.add_child(ex)
	return ex

func _add_walk_slab(root: Node3D, slab_name: String, pos: Vector3, size: Vector3, mat: Material) -> void:
	var inst := _add_box(root, slab_name, pos, size, mat)
	var sb := StaticBody3D.new()
	var col := CollisionShape3D.new()
	var bshape := BoxShape3D.new()
	bshape.size = size
	col.shape = bshape
	sb.add_child(col)
	inst.add_child(sb)

func _add_box(root: Node3D, box_name: String, pos: Vector3, size: Vector3, mat: Material) -> MeshInstance3D:
	var inst := MeshInstance3D.new()
	inst.name = box_name
	var bm := BoxMesh.new()
	bm.size = size
	inst.mesh = bm
	inst.material_override = mat
	inst.position = pos
	root.add_child(inst)
	return inst

func _add_mist(root: Node3D, pos: Vector3) -> void:
	var p := GPUParticles3D.new()
	p.position = pos
	p.amount = 16
	p.lifetime = 4.0
	var pm := ParticleProcessMaterial.new()
	pm.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_BOX
	pm.emission_box_extents = Vector3(4.5, 0.5, 3.5)
	pm.initial_velocity_min = 0.2
	pm.initial_velocity_max = 0.55
	pm.gravity = Vector3.ZERO
	pm.scale_min = 1.6
	pm.scale_max = 3.0
	pm.color = Color(0.82, 0.90, 0.95, 0.14)
	p.process_material = pm
	var q := QuadMesh.new()
	q.size = Vector2(2.4, 1.5)
	var m := StandardMaterial3D.new()
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.billboard_mode = BaseMaterial3D.BILLBOARD_ENABLED
	m.albedo_color = Color(0.85, 0.92, 0.96, 0.12)
	p.draw_pass_1 = q
	p.material_override = m
	p.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	root.add_child(p)

func _mat(col: Color, rough: float, met: float) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = col
	m.roughness = rough
	m.metallic = met
	return m
