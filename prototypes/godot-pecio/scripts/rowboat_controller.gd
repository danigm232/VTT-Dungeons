class_name RowboatController
extends "res://scripts/buoyant_boat.gd"

# Bote de remos navegable con abordaje contextual [T], conducción WASD,
# animación de remos sincronizada y colisión simplificada frente al casco y arrecifes.

const WreckStructure = preload("res://scripts/wreck_structure.gd")

@export var row_speed: float = 4.6
@export var sprint_row_speed: float = 6.6
@export var turn_rate: float = 4.2

var oar_port: Node3D
var oar_stbd: Node3D
var painter_rope: Node3D
var deck_collider: CollisionShape3D

var is_occupied: bool = false
var rider: Node3D = null
var nearby_player: Node3D = null
var trigger_area: Area3D
var row_phase: float = 0.0
var ship_vessel: Node3D = null

var _oar_port_rest: Vector3 = Vector3(15, -20, 75)
var _oar_stbd_rest: Vector3 = Vector3(-15, 20, 75)

func _ready() -> void:
	super._ready()
	if oar_port:
		_oar_port_rest = oar_port.rotation_degrees
	if oar_stbd:
		_oar_stbd_rest = oar_stbd.rotation_degrees
	_setup_boarding_trigger()

func _setup_boarding_trigger() -> void:
	trigger_area = Area3D.new()
	trigger_area.name = "BoatBoardingTrigger"
	var col := CollisionShape3D.new()
	var sph := SphereShape3D.new()
	sph.radius = 3.4
	col.shape = sph
	col.position = Vector3(0, 0.5, 0)
	trigger_area.add_child(col)
	trigger_area.body_entered.connect(_on_body_entered)
	trigger_area.body_exited.connect(_on_body_exited)
	add_child(trigger_area)

func _on_body_entered(body: Node) -> void:
	if body and body.has_method("set_active") and body.get("is_active_player") and not body.get("is_npc"):
		nearby_player = body
		_update_prompt()

func _on_body_exited(body: Node) -> void:
	if body == nearby_player:
		nearby_player = null
		if not is_occupied:
			var inv := get_tree().root.find_child("InventoryManager", true, false)
			if inv:
				inv.hide_prompt()

func _update_prompt() -> void:
	var inv := get_tree().root.find_child("InventoryManager", true, false)
	if not inv:
		return
	if is_occupied and rider and rider.get("is_active_player"):
		inv.show_prompt("[T] Bajar del Bote (WASD para remar)")
	elif nearby_player and nearby_player.get("is_active_player") and not is_occupied:
		inv.show_prompt("[T] Subir al Bote de Remos")

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.is_pressed() and not event.is_echo():
		var kev := event as InputEventKey
		if kev.keycode == KEY_T:
			if is_occupied and rider and rider.get("is_active_player"):
				disembark()
				get_viewport().set_input_as_handled()
			elif not is_occupied and nearby_player and nearby_player.get("is_active_player"):
				board(nearby_player)
				get_viewport().set_input_as_handled()

func board(tok: Node3D) -> void:
	if is_occupied or not tok:
		return
	is_occupied = true
	rider = tok
	if deck_collider:
		deck_collider.disabled = true
	if painter_rope:
		painter_rope.visible = false
	if tok.has_method("enter_boat"):
		tok.enter_boat(self)
	var inv := get_tree().root.find_child("InventoryManager", true, false)
	if inv:
		inv.show_notification("🚣 Bote: WASD remar · [T] bajar")
	_update_prompt()

func disembark() -> void:
	if not is_occupied or not rider:
		return
	var tok := rider
	is_occupied = false
	rider = null
	if deck_collider:
		deck_collider.disabled = false
	# Desembarcar por el costado más cercano al pecio (-Z local del bote si está cerca)
	var exit_world := to_global(Vector3(0.0, 0.55, -2.1))
	if tok.has_method("exit_boat"):
		tok.exit_boat(exit_world)
	if nearby_player == tok:
		_update_prompt()
	else:
		var inv := get_tree().root.find_child("InventoryManager", true, false)
		if inv:
			inv.hide_prompt()

func _process(delta: float) -> void:
	if not ship_vessel:
		ship_vessel = get_tree().root.find_child("ShipVessel", true, false) as Node3D

	var row_input := Vector2.ZERO
	var rowing_fast := false
	if is_occupied and rider and rider.get("is_active_player"):
		if Input.is_action_pressed("ui_right") or Input.is_key_pressed(KEY_D):
			row_input.x += 1.0
		if Input.is_action_pressed("ui_left") or Input.is_key_pressed(KEY_A):
			row_input.x -= 1.0
		if Input.is_action_pressed("ui_down") or Input.is_key_pressed(KEY_S):
			row_input.y += 1.0
		if Input.is_action_pressed("ui_up") or Input.is_key_pressed(KEY_W):
			row_input.y -= 1.0
		rowing_fast = Input.is_key_pressed(KEY_SHIFT)
		row_input = row_input.normalized()

	var is_moving := row_input.length_squared() > 0.04
	if is_moving:
		var move_dir := Vector3(row_input.x, 0.0, row_input.y)
		var cam := get_viewport().get_camera_3d()
		if cam and cam.has_method("screen_vector_to_world"):
			move_dir = cam.screen_vector_to_world(row_input)
		move_dir.y = 0.0
		if move_dir.length_squared() > 0.001:
			move_dir = move_dir.normalized()

		var spd := sprint_row_speed if rowing_fast else row_speed
		var next_pos := position + move_dir * spd * delta
		next_pos = _resolve_sea_bounds_and_hull(position, next_pos)
		position.x = next_pos.x
		position.z = next_pos.z

		# Orientar la proa del bote (+X local) hacia el rumbo de remo
		var desired_yaw := -atan2(move_dir.z, move_dir.x)
		initial_rot_y = lerp_angle(initial_rot_y, desired_yaw, clampf(delta * turn_rate, 0.0, 1.0))
		rotation.y = initial_rot_y

		row_phase += delta * (7.8 if rowing_fast else 5.4)
		var stroke := sin(row_phase)
		var dip := cos(row_phase)
		if oar_port:
			oar_port.rotation_degrees = _oar_port_rest + Vector3(dip * 14.0, stroke * 28.0, dip * 8.0)
		if oar_stbd:
			oar_stbd.rotation_degrees = _oar_stbd_rest + Vector3(-dip * 14.0, -stroke * 28.0, dip * 8.0)
	else:
		if oar_port:
			oar_port.rotation_degrees = oar_port.rotation_degrees.lerp(_oar_port_rest, clampf(delta * 5.0, 0.0, 1.0))
		if oar_stbd:
			oar_stbd.rotation_degrees = oar_stbd.rotation_degrees.lerp(_oar_stbd_rest, clampf(delta * 5.0, 0.0, 1.0))

	super._process(delta)

	if is_occupied and rider:
		rider.global_position = to_global(Vector3(0.0, 0.30, 0.0))
		if rider.has_method("sync_boat_heading"):
			var fwd := Vector3(cos(-initial_rot_y), 0.0, sin(-initial_rot_y))
			rider.sync_boat_heading(Vector2(fwd.x, fwd.z))

func _resolve_sea_bounds_and_hull(cur_pos: Vector3, next_pos: Vector3) -> Vector3:
	var out := next_pos
	out.x = clampf(out.x, -110.0, 110.0)
	out.z = clampf(out.z, -90.0, 90.0)

	# Evitar que el bote traspase el casco del pecio Rosa de los Vientos
	if ship_vessel:
		var loc := ship_vessel.to_local(out)
		if loc.x > -31.8 and loc.x < 32.0:
			var beam := WreckStructure.get_beam_at(clampf(loc.x, WreckStructure.STERN_X, WreckStructure.BOW_X))
			var safe_z := beam + 1.65
			if absf(loc.z) < safe_z:
				var sign_z := 1.0 if loc.z >= 0.0 else -1.0
				if absf(cur_pos.z - ship_vessel.global_position.z) < 0.01:
					sign_z = 1.0
				loc.z = sign_z * safe_z
				var pushed := ship_vessel.to_global(loc)
				out.x = pushed.x
				out.z = pushed.z

	# Deslizamiento simple frente a escollos principales del arrecife
	for reef_pt: Vector2 in [Vector2(-30.5, 14.0), Vector2(28.0, -11.5), Vector2(32.5, -5.0)]:
		var diff: Vector2 = Vector2(out.x, out.z) - reef_pt
		var dist: float = diff.length()
		var min_r: float = 4.4
		if dist < min_r and dist > 0.001:
			var push: Vector2 = reef_pt + (diff / dist) * min_r
			out.x = push.x
			out.z = push.y
	return out
