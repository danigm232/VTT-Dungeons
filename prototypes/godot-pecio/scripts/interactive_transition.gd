class_name InteractiveTransition
extends Node3D

# Transición Vertical Canónica para el Pecio Rosa de los Vientos (Dungeons VTT)
# Implementa los accesos autorizados entre las distintas plantas del pecio:
# - Escaleras de Proa C1 <--> Castillo de Proa C2 (+3.0 m)
# - Escaleras de Popa C1 <--> Castillo de Popa C3 (+3.0 m)
# - Escotilla P12 C1 <--> Cubierta Inundada C8 (-3.2 m)
# - Brecha P14/P16 C8 <--> Bodega Sumergida C9 (-6.4 m)
# - Escala de obenques P10 C1 <--> Cofa del Mástil C10 (+15.2 m)

signal transitioned(target_pos: Vector3)

@export var prompt_label: String = "Subir Escalera (+3 m)"
@export var destination: Vector3 = Vector3(14.2, 3.1, -3.5)
@export var transition_mode: String = "stairs" # "stairs", "hatch", "climb", "swim"
@export var visual_marker: bool = true
@export var trigger_radius: float = 2.2
@export var require_water_or_below_y: float = 999.0

var trigger_area: Area3D
var is_player_nearby: bool = false
var nearby_player: PlayerToken
var marker_torus: MeshInstance3D
var _was_prompt_active: bool = false

func _ready() -> void:
	build_trigger()
	if visual_marker:
		build_visual_marker()

func build_trigger() -> void:
	trigger_area = Area3D.new()
	trigger_area.name = "TransitionTrigger"
	var col = CollisionShape3D.new()
	var sphere = SphereShape3D.new()
	sphere.radius = trigger_radius
	col.shape = sphere
	col.position = Vector3(0, 0.8, 0)
	trigger_area.add_child(col)

	trigger_area.body_entered.connect(_on_body_entered)
	trigger_area.body_exited.connect(_on_body_exited)
	add_child(trigger_area)

func get_marker_color() -> Color:
	match transition_mode:
		"stairs":
			return Color(0.96, 0.82, 0.28, 0.85) # Ámbar dorado brillante
		"hatch":
			return Color(0.18, 0.86, 0.65, 0.85) # Verde esmeralda de escotilla marina
		"swim":
			return Color(0.22, 0.72, 0.98, 0.85) # Azul agua profunda
		"climb":
			return Color(0.98, 0.58, 0.22, 0.85) # Cobre de jarcia
		_:
			return Color(0.40, 0.80, 0.95, 0.85)

func build_visual_marker() -> void:
	var col = get_marker_color()
	
	# Marcador diegético sutil en bronce envejecido / halo discreto (sin aro neón plano)
	marker_torus = MeshInstance3D.new()
	marker_torus.name = "VerticalMarker"
	var torus = TorusMesh.new()
	torus.inner_radius = 0.28
	torus.outer_radius = 0.34
	torus.rings = 24
	torus.ring_segments = 10

	var mat = StandardMaterial3D.new()
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat.albedo_color = Color(col.r, col.g, col.b, 0.42)
	mat.roughness = 0.38
	mat.metallic = 0.45
	mat.emission_enabled = true
	mat.emission = col
	mat.emission_energy_multiplier = 0.36

	marker_torus.mesh = torus
	marker_torus.material_override = mat
	marker_torus.position = Vector3(0, 0.03, 0)
	add_child(marker_torus)

	# Glifo central discreto
	var inner_disc = MeshInstance3D.new()
	inner_disc.name = "MarkerDisc"
	var cyl = CylinderMesh.new()
	cyl.top_radius = 0.16
	cyl.bottom_radius = 0.16
	cyl.height = 0.015
	inner_disc.mesh = cyl
	
	var mat_inner = StandardMaterial3D.new()
	mat_inner.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat_inner.albedo_color = Color(col.r, col.g, col.b, 0.20)
	mat_inner.roughness = 0.45
	inner_disc.material_override = mat_inner
	inner_disc.position = Vector3(0, 0.02, 0)
	add_child(inner_disc)

func _is_eligible_player(body: Node) -> bool:
	if not (body is PlayerToken):
		return false
	var tok := body as PlayerToken
	if not tok.is_active_player or tok.is_npc or tok.in_boat:
		return false
	var vessel := get_tree().root.find_child("ShipVessel", true, false) as Node3D
	var loc_y := vessel.to_local(tok.global_position).y if vessel else tok.global_position.y
	if require_water_or_below_y < 900.0:
		return tok.in_open_ocean or tok.in_water or loc_y <= require_water_or_below_y
	var my_loc_y := vessel.to_local(global_position).y if vessel else global_position.y
	if absf(loc_y - my_loc_y) > 2.0:
		return false
	return true

func _has_closer_rowboat(tok: PlayerToken) -> bool:
	if not tok or not is_inside_tree():
		return false
	var boat := get_tree().root.find_child("Rowboat", true, false) as Node3D
	if boat and boat.get("is_player_nearby") == true:
		var boat_dist := tok.global_position.distance_to(boat.global_position)
		var my_dist := tok.global_position.distance_to(global_position)
		if boat_dist + 0.15 < my_dist:
			return true
	return false

func _sync_nearby_state(force_prompt: bool = false) -> void:
	var candidate: PlayerToken = null
	if trigger_area and is_inside_tree():
		for body in trigger_area.get_overlapping_bodies():
			if _is_eligible_player(body):
				candidate = body as PlayerToken
				break
	nearby_player = candidate
	is_player_nearby = candidate != null
	var inv := get_tree().root.find_child("InventoryManager", true, false) if is_inside_tree() else null
	if not inv:
		_was_prompt_active = is_player_nearby
		return
	var prompt_str := "[T] " + prompt_label
	if is_player_nearby and not nearby_player.is_transitioning:
		if not _has_closer_rowboat(nearby_player):
			if force_prompt or not _was_prompt_active or str(inv.prompt_text) == "":
				inv.show_prompt(prompt_str)
	elif _was_prompt_active and not is_player_nearby:
		if str(inv.prompt_text) == prompt_str:
			inv.hide_prompt()
	_was_prompt_active = is_player_nearby

func _process(_delta: float) -> void:
	_sync_nearby_state(false)

func _on_body_entered(body: Node) -> void:
	if _is_eligible_player(body):
		_sync_nearby_state(true)

func _on_body_exited(_body: Node) -> void:
	_sync_nearby_state(false)

func execute_transition() -> void:
	if not nearby_player:
		print("[TRANSITION BLOCKED] nearby_player is null on ", name)
		return
	if nearby_player.is_transitioning:
		print("[TRANSITION BLOCKED] player is already transitioning on ", name)
		return

	var target_player: PlayerToken = nearby_player
	print("[TRANSITION START] ", name, " -> ", destination, " mode=", transition_mode)
	target_player.is_transitioning = true
	if target_player.collision:
		target_player.collision.disabled = true

	# Secuencia animada acorde al tipo de transición (escalar, nadar, caminar o interactuar)
	var trans_anim := "climb" if transition_mode == "climb" else ("swim" if transition_mode == "swim" else ("walk" if transition_mode == "stairs" else "interact"))
	var move_duration = 0.35 if transition_mode == "stairs" else 0.50
	target_player.play_action_animation(trans_anim, move_duration * 2.1)

	var inv = get_tree().root.find_child("InventoryManager", true, false)
	if inv:
		if destination.y < -4.15 and not target_player.is_torch_lit:
			inv.show_notification("🌊 Bodega sumergida C9: oscuridad total sin fuente de luz. Busca bolsas de aire en la escalera P15 o bajo P14.")
		else:
			inv.show_notification("Acceso: " + prompt_label)
		inv.hide_prompt()

	var start_pos = target_player.position
	var mid_y = max(start_pos.y, destination.y) + (0.6 if transition_mode == "stairs" else 0.8)
	var mid_pos = Vector3(
		lerp(start_pos.x, destination.x, 0.5),
		mid_y,
		lerp(start_pos.z, destination.z, 0.5)
	)

	var mast_rigging: Node3D = null
	var orig_mast_rot := Vector3.ZERO
	if transition_mode == "climb":
		mast_rigging = get_tree().root.find_child("MainMastRigging", true, false) as Node3D
		if mast_rigging:
			orig_mast_rot = mast_rigging.rotation_degrees

	# Desplazamiento cinematográfico en arco con Tween
	var tw = create_tween()
	tw.set_parallel(false)
	tw.tween_property(target_player, "position", mid_pos, move_duration).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)
	tw.tween_property(target_player, "position", destination, move_duration).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN)

	# Balanceo progresivo sutil del mástil en ascenso/descenso sin sacudir la cámara
	if mast_rigging:
		var sway_tw := create_tween()
		sway_tw.tween_method(func(progress: float) -> void:
			if not is_instance_valid(mast_rigging):
				return
			var p_y := clampf(target_player.position.y / 15.0, 0.0, 1.0)
			var env := sin(progress * PI) * lerpf(0.20, 1.0, p_y)
			var sway_x := sin(progress * TAU * 1.5) * 1.15 * env
			var sway_z := cos(progress * TAU * 1.5) * 0.95 * env
			mast_rigging.rotation_degrees = orig_mast_rot + Vector3(sway_x, 0.0, sway_z)
		, 0.0, 1.0, move_duration * 2.0)

	tw.finished.connect(func():
		if is_instance_valid(mast_rigging):
			mast_rigging.rotation_degrees = orig_mast_rot
		if is_instance_valid(target_player):
			target_player.position = destination
			target_player.velocity = Vector3.ZERO
			target_player.in_water = false
			target_player.in_open_ocean = false
			target_player.in_shallow_water = false
			if target_player.collision:
				target_player.collision.disabled = false
			target_player.is_transitioning = false
			target_player.play_action_animation("idle")

		# Actualización inmediata de foco de cámara
		var cam = get_tree().root.find_child("TacticalCamera", true, false) as TacticalCamera
		if cam and cam.target == target_player:
			var zone := cam.detect_wreck_zone(target_player.global_position)
			cam.set_interior_cutout(cam.is_interior_zone(zone), 10.0, zone)
			cam.target_focus = cam.calculate_zone_follow_target(target_player.global_position, zone)

		# Actualización de mamparos / recorte de techos
		var cutout = get_tree().root.find_child("RoofCutout", true, false)
		if cutout and cutout.has_method("check_exit_to_exterior"):
			cutout.check_exit_to_exterior()

		print("[TRANSITION FINISHED] ", name, " arrived at ", destination)
		emit_signal("transitioned", destination)
	)

func _unhandled_input(event: InputEvent) -> void:
	if is_player_nearby and nearby_player and not nearby_player.is_transitioning and not nearby_player.in_boat:
		if event is InputEventKey and event.is_pressed() and not event.is_echo() and not event.ctrl_pressed and not event.alt_pressed:
			if event.keycode == KEY_T and not _has_closer_rowboat(nearby_player):
				execute_transition()
				get_viewport().set_input_as_handled()
