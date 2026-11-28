class_name WeakPlankTrap
extends Node3D

# Trampa sutil e impredecible de tablones podridos en la Cubierta Principal (C1)
# - Antes de activarse: grietas discretas y madera ligeramente hundida (sin iconos chillones)
# - Al pasar por encima: crujido, apertura real de boquete astillado, caída a la sentina C8
#   y revelación de un nuevo haz de luz cenital cayendo hacia C8 desde el agujero recién abierto.

const PbrMaterialKit = preload("res://scripts/pbr_material_kit.gd")
const ShipGeometry = preload("res://scripts/ship_geometry.gd")
const SfxKit = preload("res://scripts/pecio_sfx_kit.gd")
const WreckStructure = preload("res://scripts/wreck_structure.gd")

@export var trap_id: String = "c1_weak_plank_1"
@export var trap_x: float = -4.2
@export var trap_z: float = -1.6
@export var trigger_radius: float = 0.78

var intact_visual: Node3D
var broken_visual: Node3D
var trigger_area: Area3D
var is_broken: bool = false
var _sfx_player: AudioStreamPlayer

func _ready() -> void:
	position = WreckStructure.get_world_pos(trap_x, 0.0, trap_z)
	_sfx_player = AudioStreamPlayer.new()
	_sfx_player.name = "WeakPlankSfx"
	_sfx_player.volume_db = -3.0
	add_child(_sfx_player)
	_build_intact_cracks()
	_build_broken_hole()
	_build_trigger()
	call_deferred("_sync_from_world_state")

func _sync_from_world_state() -> void:
	if not is_inside_tree():
		return
	var ui := get_tree().root.find_child("VttRoleUi", true, false)
	if ui and "world_state" in ui and ui.world_state and ui.world_state.is_weak_plank_broken(trap_id):
		_set_broken_visual(true)

func _build_intact_cracks() -> void:
	intact_visual = Node3D.new()
	intact_visual.name = "IntactCrackedPlanks"
	add_child(intact_visual)

	# Sin parches oscuros llamativos: solo finas grietas y astillas casi imperceptibles integradas en Deck_C1
	var mat_crack := StandardMaterial3D.new()
	mat_crack.albedo_color = Color(0.11, 0.09, 0.06, 0.74)
	mat_crack.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat_crack.roughness = 0.98
	mat_crack.metallic_specular = 0.02

	var mat_sliver := PbrMaterialKit.create_wet_wreck_wood_pbr("#554a39", 0.55, 0.92, 0.10)
	var tilt_x := -atan(WreckStructure.LIST_SLOPE)

	var crack_specs := [
		[Vector3(-0.28, 0.008, -0.14), Vector3(0.42, 0.005, 0.017), 16.0],
		[Vector3(0.16, 0.008, 0.11),   Vector3(0.46, 0.005, 0.018), -22.0],
		[Vector3(-0.05, 0.008, -0.02), Vector3(0.30, 0.005, 0.014), 68.0],
		[Vector3(0.22, 0.008, -0.22),  Vector3(0.26, 0.005, 0.014), 9.0],
		[Vector3(-0.18, 0.008, 0.24),  Vector3(0.28, 0.005, 0.015), -13.0],
	]
	for ci in range(crack_specs.size()):
		var cs: Array = crack_specs[ci]
		var cr := MeshInstance3D.new()
		cr.name = "HairlineCrack_%d" % ci
		var cb := BoxMesh.new()
		cb.size = cs[1]
		cr.mesh = cb
		cr.material_override = mat_crack
		cr.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		cr.position = cs[0]
		cr.rotation = Vector3(tilt_x, deg_to_rad(float(cs[2])), 0.0)
		intact_visual.add_child(cr)

	for si in range(2):
		var sl := MeshInstance3D.new()
		sl.name = "SubtleSplinter_%d" % si
		var sb := BoxMesh.new()
		sb.size = Vector3(0.18, 0.009, 0.024)
		sl.mesh = sb
		sl.material_override = mat_sliver
		sl.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		sl.position = Vector3(-0.12 + float(si) * 0.34, 0.010, -0.06 + float(si) * 0.15)
		sl.rotation = Vector3(tilt_x, deg_to_rad(14.0 if si == 0 else -19.0), deg_to_rad(3.5))
		intact_visual.add_child(sl)

func _build_broken_hole() -> void:
	broken_visual = Node3D.new()
	broken_visual.name = "BrokenDeckHole"
	broken_visual.visible = false
	add_child(broken_visual)

	var tilt_x := -atan(WreckStructure.LIST_SLOPE)

	# Boquete orgánico a ras de entarimado (sin cilindro negro elevado que entierre las astillas)
	var pit := MeshInstance3D.new()
	pit.name = "HolePit"
	var pq := QuadMesh.new()
	pq.size = Vector2(1.48, 0.96)
	pq.orientation = PlaneMesh.FACE_Y
	pit.mesh = pq
	var grad := Gradient.new()
	grad.offsets = PackedFloat32Array([0.0, 0.56, 0.80, 1.0])
	grad.colors = PackedColorArray([
		Color(0.02, 0.04, 0.05, 0.97),
		Color(0.05, 0.07, 0.08, 0.92),
		Color(0.14, 0.11, 0.08, 0.52),
		Color(0.18, 0.14, 0.10, 0.0),
	])
	var gtex := GradientTexture2D.new()
	gtex.width = 64
	gtex.height = 64
	gtex.fill = GradientTexture2D.FILL_RADIAL
	gtex.fill_from = Vector2(0.5, 0.5)
	gtex.fill_to = Vector2(0.98, 0.5)
	gtex.gradient = grad
	var mat_pit := StandardMaterial3D.new()
	mat_pit.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat_pit.albedo_texture = gtex
	mat_pit.albedo_color = Color.WHITE
	mat_pit.roughness = 0.98
	mat_pit.metallic_specular = 0.04
	pit.material_override = mat_pit
	pit.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	pit.position = Vector3(0.0, 0.008, 0.0)
	pit.rotation.x = tilt_x
	broken_visual.add_child(pit)

	# Tablones longitudinales quebrados (eje X proa-popa) y astillas de roble visibles SOBRE el vano
	var mat_splint := PbrMaterialKit.create_wood_shaving_pbr("#7a6244")
	var mat_dark_rim := PbrMaterialKit.create_weathered_hull_pbr("#3c2e20")
	var st_splint := ShipGeometry.begin(mat_splint)
	var st_rim := ShipGeometry.begin(mat_dark_rim)
	var plank_lanes: Array[float] = [-0.30, -0.15, 0.0, 0.15, 0.30]
	for li in range(plank_lanes.size()):
		var lz: float = plank_lanes[li]
		var span_x: float = 0.56 - absf(lz) * 0.48 + float((li * 3) % 2) * 0.07
		for side_s: float in [-1.0, 1.0]:
			var outer_x: float = side_s * (span_x + 0.18)
			var snap_x: float = side_s * span_x
			var p_outer := Vector3(outer_x, 0.016, lz)
			var p_snap := Vector3(snap_x, 0.014, lz)
			ShipGeometry.beam(st_rim, p_outer, p_snap, 0.135, 0.024)
			var tip_x: float = snap_x - side_s * (0.20 + float((li + int(side_s > 0.0)) % 3) * 0.06)
			var tip_z: float = lz + sin(float(li) * 2.1 + side_s) * 0.03
			ShipGeometry.beam(st_splint, p_snap + Vector3(0.0, 0.008, 0.0), Vector3(tip_x, 0.009, tip_z), 0.095, 0.018, 0.18)
	for side_z in [-0.41, 0.41]:
		ShipGeometry.beam(st_rim, Vector3(-0.46, 0.014, side_z), Vector3(0.46, 0.014, side_z), 0.08, 0.020)
	var splinters_node := ShipGeometry.commit(broken_visual, "HoleSplinters", st_splint)
	var rim_node := ShipGeometry.commit(broken_visual, "HoleRim", st_rim)
	if splinters_node:
		splinters_node.rotation.x = tilt_x
	if rim_node:
		rim_node.rotation.x = tilt_x

func _build_trigger() -> void:
	trigger_area = Area3D.new()
	trigger_area.name = "WeakPlankTrigger"
	var cs := CollisionShape3D.new()
	var sph := SphereShape3D.new()
	sph.radius = trigger_radius
	cs.shape = sph
	cs.position = Vector3(0.0, 0.45, 0.0)
	trigger_area.add_child(cs)
	trigger_area.body_entered.connect(_on_body_entered)
	add_child(trigger_area)

func _on_body_entered(body: Node) -> void:
	if not (body is PlayerToken):
		return
	var tok := body as PlayerToken
	if not tok.is_active_player or tok.is_npc or tok.is_transitioning or tok.in_boat:
		return
	var vessel := get_tree().root.find_child("ShipVessel", true, false) as Node3D
	var lp := vessel.to_local(tok.global_position) if vessel else tok.position
	if absf(lp.y) > 0.95:
		return
	# Solo se activa al caminar encima (evita falsos disparos en teletransportes estáticos de prueba)
	if Vector2(tok.velocity.x, tok.velocity.z).length() < 0.25 and DisplayServer.get_name() == "headless":
		return
	trigger_collapse(tok)

func _set_broken_visual(broken: bool) -> void:
	is_broken = broken
	if intact_visual:
		intact_visual.visible = not broken
	if broken_visual:
		broken_visual.visible = broken
	# Revelar el haz de luz cenital correspondiente dentro de C8 al abrirse el boquete
	var shaft := get_tree().root.find_child("C8TrapLightShaft_" + trap_id, true, false) as Node3D
	if shaft:
		shaft.visible = broken

func trigger_collapse(tok: PlayerToken) -> void:
	if not is_instance_valid(tok) or tok.is_transitioning:
		return
	var first_break := not is_broken
	_set_broken_visual(true)

	var ui := get_tree().root.find_child("VttRoleUi", true, false)
	if ui and "world_state" in ui and ui.world_state:
		ui.world_state.mark_weak_plank_broken(trap_id)

	if DisplayServer.get_name() != "headless" and _sfx_player:
		_sfx_player.stream = SfxKit.make_plank_snap() if first_break else SfxKit.make_water_splash(true)
		_sfx_player.play()

	var msg := (
		"💥 ¡CRAC! Las tablas podridas de C1 ceden bajo %s y abren un boquete hacia la sentina inundada (C8)." % tok.token_name
		if first_break else
		"💦 %s vuelve a caer por el boquete abierto de C1 hacia la sentina C8." % tok.token_name
	)
	if ui and ui.has_method("notify_mesa"):
		ui.notify_mesa(msg)
	else:
		var inv := get_tree().root.find_child("InventoryManager", true, false)
		if inv and inv.has_method("show_notification"):
			inv.show_notification(msg)

	var dest := Vector3(clampf(trap_x, -24.0, 22.0), -3.22, clampf(trap_z, -4.5, 4.5))
	tok.is_transitioning = true
	if tok.collision:
		tok.collision.disabled = true
	if tok.has_method("play_action_animation"):
		tok.play_action_animation("hit", 0.55)

	if DisplayServer.get_name() == "headless":
		tok.position = dest
		tok.velocity = Vector3.ZERO
		if tok.collision:
			tok.collision.disabled = false
		tok.is_transitioning = false
		var cutout_h := get_tree().root.find_child("RoofCutout", true, false)
		if cutout_h and cutout_h.has_method("check_exit_to_exterior"):
			cutout_h.check_exit_to_exterior()
		return

	var tw := create_tween()
	tw.tween_property(tok, "position", dest, 0.42).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)
	tw.finished.connect(func():
		if is_instance_valid(tok):
			tok.position = dest
			tok.velocity = Vector3.ZERO
			if tok.collision:
				tok.collision.disabled = false
			tok.is_transitioning = false
			if tok.has_method("trigger_bilge_splash"):
				tok.trigger_bilge_splash(true)
		if _sfx_player and is_inside_tree():
			_sfx_player.stream = SfxKit.make_water_splash(true)
			_sfx_player.play()
		var cutout := get_tree().root.find_child("RoofCutout", true, false)
		if cutout and cutout.has_method("check_exit_to_exterior"):
			cutout.check_exit_to_exterior()
		var cam := get_tree().root.find_child("TacticalCamera", true, false)
		if cam and cam.target == tok and cam.has_method("detect_wreck_zone"):
			var z: String = cam.detect_wreck_zone(tok.global_position)
			cam.set_interior_cutout(cam.is_interior_zone(z), 10.0, z)
			cam.target_focus = cam.calculate_zone_follow_target(tok.global_position, z)
	)
