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

	# Pozo oscuro irregular que simula el boquete abierto hacia la sentina C8
	var pit := MeshInstance3D.new()
	pit.name = "HolePit"
	var pc := CylinderMesh.new()
	pc.top_radius = 0.66
	pc.bottom_radius = 0.60
	pc.height = 0.05
	pc.radial_segments = 10
	pit.mesh = pc
	var mat_pit := StandardMaterial3D.new()
	mat_pit.albedo_color = Color("#05090b")
	mat_pit.roughness = 0.99
	mat_pit.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	pit.material_override = mat_pit
	pit.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	pit.position = Vector3(0.0, 0.014, 0.0)
	pit.scale = Vector3(1.18, 1.0, 0.88)
	pit.rotation.x = tilt_x
	broken_visual.add_child(pit)

	# Dientes de tablas partidas y astillas de roble dobladas hacia dentro del boquete
	var mat_splint := PbrMaterialKit.create_wood_shaving_pbr("#6d573a")
	var mat_dark_rim := PbrMaterialKit.create_weathered_hull_pbr("#261d14")
	var st_splint := ShipGeometry.begin(mat_splint)
	var st_rim := ShipGeometry.begin(mat_dark_rim)
	var sides := 10
	for i in range(sides):
		var a0 := TAU * float(i) / float(sides)
		var a1 := TAU * float(i + 1) / float(sides)
		var r0 := 0.72 + sin(float(i) * 2.9) * 0.11
		var r1 := 0.72 + sin(float((i + 1) % sides) * 2.9) * 0.11
		var p0 := Vector3(cos(a0) * r0 * 1.12, 0.032, sin(a0) * r0 * 0.86)
		var p1 := Vector3(cos(a1) * r1 * 1.12, 0.032, sin(a1) * r1 * 0.86)
		ShipGeometry.beam(st_rim, p0, p1, 0.12, 0.055)
		var mid := (p0 + p1) * 0.5
		var inward := Vector3(-mid.x, -0.35, -mid.z).normalized()
		var tooth_len := 0.22 + float((i * 5) % 3) * 0.08
		ShipGeometry.beam(st_splint, mid + Vector3(0.0, 0.02, 0.0), mid + inward * tooth_len, 0.11, 0.035, 0.20)
	ShipGeometry.commit(broken_visual, "HoleSplinters", st_splint)
	ShipGeometry.commit(broken_visual, "HoleRim", st_rim)

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
