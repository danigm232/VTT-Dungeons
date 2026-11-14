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

var trigger_area: Area3D
var is_player_nearby: bool = false
var nearby_player: PlayerToken
var marker_torus: MeshInstance3D

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

	# Anillo exterior
	marker_torus = MeshInstance3D.new()
	marker_torus.name = "VerticalMarker"
	var torus = TorusMesh.new()
	torus.inner_radius = 0.42
	torus.outer_radius = 0.52
	torus.rings = 28
	torus.ring_segments = 14

	var mat = StandardMaterial3D.new()
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat.albedo_color = col
	mat.emission_enabled = true
	mat.emission = col
	mat.emission_energy_multiplier = 1.4

	marker_torus.mesh = torus
	marker_torus.material_override = mat
	marker_torus.position = Vector3(0, 0.05, 0)
	add_child(marker_torus)

	# Glifo central de escalones / flecha táctica
	var inner_disc = MeshInstance3D.new()
	inner_disc.name = "MarkerDisc"
	var cyl = CylinderMesh.new()
	cyl.top_radius = 0.24
	cyl.bottom_radius = 0.24
	cyl.height = 0.02
	inner_disc.mesh = cyl

	var mat_inner = StandardMaterial3D.new()
	mat_inner.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat_inner.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat_inner.albedo_color = Color(col.r, col.g, col.b, 0.45)
	inner_disc.material_override = mat_inner
	inner_disc.position = Vector3(0, 0.04, 0)
	add_child(inner_disc)

func _on_body_entered(body: Node) -> void:
	if body is PlayerToken and body.is_active_player:
		is_player_nearby = true
		nearby_player = body
		var inv = get_tree().root.find_child("InventoryManager", true, false)
		if inv:
			inv.show_prompt("[T] " + prompt_label)

func _on_body_exited(body: Node) -> void:
	if body == nearby_player:
		is_player_nearby = false
		nearby_player = null
		var inv = get_tree().root.find_child("InventoryManager", true, false)
		if inv:
			inv.hide_prompt()

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
		inv.show_notification("Acceso: " + prompt_label)
		inv.hide_prompt()

	var start_pos = target_player.position
	var mid_y = max(start_pos.y, destination.y) + (0.6 if transition_mode == "stairs" else 0.8)
	var mid_pos = Vector3(
		lerp(start_pos.x, destination.x, 0.5),
		mid_y,
		lerp(start_pos.z, destination.z, 0.5)
	)

	# Desplazamiento cinematográfico en arco con Tween
	var tw = create_tween()
	tw.set_parallel(false)
	tw.tween_property(target_player, "position", mid_pos, move_duration).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)
	tw.tween_property(target_player, "position", destination, move_duration).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN)

	tw.finished.connect(func():
		if is_instance_valid(target_player):
			target_player.position = destination
			target_player.velocity = Vector3.ZERO
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
	if is_player_nearby and nearby_player and not nearby_player.is_transitioning:
		if event is InputEventKey and event.is_pressed() and not event.is_echo() and not event.ctrl_pressed and not event.alt_pressed:
			if event.keycode == KEY_T:
				execute_transition()
				get_viewport().set_input_as_handled()
				get_viewport().set_input_as_handled()
