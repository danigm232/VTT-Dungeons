class_name RowboatController
extends "res://scripts/buoyant_boat.gd"

# Bote de remos canónico (misma embarcación que El Retiro del Dragón)
# Abordaje contextual [T] para 1–4 jugadores, conducción WASD y 2 remos sincronizados en chumaceras.

const WreckStructure = preload("res://scripts/wreck_structure.gd")

const MAX_SEATS: int = 4
const SEAT_OFFSETS: Array[Vector3] = [
	Vector3(-1.32, 0.42, -0.34),
	Vector3(-0.45, 0.42, 0.36),
	Vector3(0.45, 0.42, -0.34),
	Vector3(1.12, 0.42, 0.22),
]

@export var row_speed: float = 4.6
@export var sprint_row_speed: float = 6.6
@export var turn_rate: float = 4.2

var oar_port: Node3D
var oar_stbd: Node3D
var painter_rope: Node3D
var deck_collider: CollisionShape3D

var is_occupied: bool = false
var is_player_nearby: bool = false
var rider: Node3D = null
var riders: Array[Node3D] = []
var nearby_player: Node3D = null
var nearby_players: Array[Node3D] = []
var trigger_area: Area3D
var row_phase: float = 0.0
var ship_vessel: Node3D = null
var _was_prompt_active: bool = false
var _last_prompt_key: String = ""

var _oar_port_rest: Vector3 = Vector3(10.0, 188.0, 0.0)
var _oar_stbd_rest: Vector3 = Vector3(10.0, -8.0, 0.0)

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
	var cyl := CylinderShape3D.new()
	cyl.radius = 4.2
	cyl.height = 4.6
	col.shape = cyl
	col.position = Vector3(0.0, -0.2, 0.0)
	trigger_area.add_child(col)
	trigger_area.body_entered.connect(_on_body_entered)
	trigger_area.body_exited.connect(_on_body_exited)
	add_child(trigger_area)

func _on_body_entered(body: Node) -> void:
	if body and body.has_method("set_active") and not body.get("is_npc"):
		if not nearby_players.has(body):
			nearby_players.append(body)
		_sync_boarding_state(true)

func _on_body_exited(body: Node) -> void:
	nearby_players.erase(body)
	_sync_boarding_state(false)

func _find_active_nearby_player() -> Node3D:
	for candidate in nearby_players:
		if is_instance_valid(candidate) and candidate.get("is_active_player"):
			return candidate
	return null

func _find_active_rider() -> Node3D:
	for r in riders:
		if is_instance_valid(r) and r.get("is_active_player"):
			return r
	return riders[0] if not riders.is_empty() and is_instance_valid(riders[0]) else null

func _desired_prompt_text() -> String:
	var active_rider := _find_active_rider()
	if active_rider and active_rider.get("is_active_player"):
		return "[T] Bajar del Bote (%d/%d) · WASD remar" % [riders.size(), MAX_SEATS]
	var candidate := _find_active_nearby_player()
	if candidate and riders.size() < MAX_SEATS:
		if riders.is_empty():
			return "[T] Subir al Bote de Remos (%d/%d plazas)" % [riders.size(), MAX_SEATS]
		return "[T] Subir al Bote (%d/%d a bordo)" % [riders.size(), MAX_SEATS]
	return ""

func _update_prompt() -> void:
	var inv := get_tree().root.find_child("InventoryManager", true, false)
	if not inv:
		return
	var msg := _desired_prompt_text()
	if msg != "":
		_last_prompt_key = msg
		inv.show_prompt(msg)

func _sync_boarding_state(force_prompt: bool = false) -> void:
	if trigger_area and is_inside_tree():
		for body in trigger_area.get_overlapping_bodies():
			if body and body.has_method("set_active") and not body.get("is_npc") and not nearby_players.has(body):
				nearby_players.append(body)
	for i in range(nearby_players.size() - 1, -1, -1):
		var c := nearby_players[i]
		if not is_instance_valid(c) or c.get("in_boat"):
			nearby_players.remove_at(i)
		elif trigger_area and is_inside_tree() and not trigger_area.overlaps_body(c):
			nearby_players.remove_at(i)

	var active_rider := _find_active_rider()
	var rider_is_active := active_rider != null and bool(active_rider.get("is_active_player"))
	nearby_player = _find_active_nearby_player()
	is_player_nearby = rider_is_active or (nearby_player != null and riders.size() < MAX_SEATS)

	var inv := get_tree().root.find_child("InventoryManager", true, false) if is_inside_tree() else null
	if not inv:
		_was_prompt_active = is_player_nearby
		return

	var msg := _desired_prompt_text()
	if is_player_nearby and msg != "":
		var defer_to_closer := (not rider_is_active) and _has_closer_nearby_interactable(nearby_player)
		if not defer_to_closer and (force_prompt or not _was_prompt_active or msg != _last_prompt_key or str(inv.prompt_text) == ""):
			_last_prompt_key = msg
			inv.show_prompt(msg)
	elif _was_prompt_active and not is_player_nearby:
		if str(inv.prompt_text) == _last_prompt_key:
			inv.hide_prompt()
		_last_prompt_key = ""
	_was_prompt_active = is_player_nearby

func _has_closer_nearby_interactable(tok: Node3D) -> bool:
	if not tok or not is_inside_tree():
		return false
	var my_dist := tok.global_position.distance_to(global_position)
	for node in get_tree().root.find_children("*", "Node3D", true, false):
		if node == self or not (node is Node3D):
			continue
		if node.get("is_player_nearby") == true and (node.has_method("execute_transition") or node.has_method("toggle_door") or node.has_method("collect")):
			if tok.global_position.distance_to((node as Node3D).global_position) + 0.15 < my_dist:
				return true
	return false

func interact() -> void:
	_toggle_boarding()

func _toggle_boarding() -> bool:
	var active_rider := _find_active_rider()
	if active_rider and active_rider.get("is_active_player"):
		disembark(active_rider)
		return true
	var candidate := _find_active_nearby_player()
	if candidate and riders.size() < MAX_SEATS:
		board(candidate)
		return true
	return false

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.is_pressed() and not event.is_echo() and not event.ctrl_pressed and not event.alt_pressed:
		var kev := event as InputEventKey
		if kev.keycode == KEY_T:
			var active_rider := _find_active_rider()
			if active_rider and active_rider.get("is_active_player"):
				disembark(active_rider)
				get_viewport().set_input_as_handled()
				return
			var candidate := _find_active_nearby_player()
			if candidate and riders.size() < MAX_SEATS and not _has_closer_nearby_interactable(candidate):
				board(candidate)
				get_viewport().set_input_as_handled()

func board(tok: Node3D) -> void:
	if not tok or riders.size() >= MAX_SEATS or riders.has(tok):
		return
	riders.append(tok)
	is_occupied = true
	rider = _find_active_rider()
	if deck_collider:
		deck_collider.disabled = true
	if painter_rope:
		painter_rope.visible = false
	var seat_idx := mini(riders.size() - 1, SEAT_OFFSETS.size() - 1)
	tok.global_position = to_global(SEAT_OFFSETS[seat_idx])
	if tok.has_method("enter_boat"):
		tok.enter_boat(self)
	var inv := get_tree().root.find_child("InventoryManager", true, false)
	if inv:
		inv.show_notification("🚣 Bote (%d/%d): WASD remar · [T] bajar" % [riders.size(), MAX_SEATS])
	_sync_boarding_state(true)

func disembark(tok: Node3D = null) -> void:
	if riders.is_empty():
		return
	var target: Node3D = tok if tok != null else _find_active_rider()
	if not target or not riders.has(target):
		return
	riders.erase(target)
	is_occupied = not riders.is_empty()
	rider = _find_active_rider()
	if deck_collider and not is_occupied:
		deck_collider.disabled = false
	var exit_world := to_global(Vector3(0.0, 0.55, -2.35))
	if ship_vessel:
		var loc := ship_vessel.to_local(exit_world)
		if loc.x > WreckStructure.STERN_X - 0.5 and loc.x < WreckStructure.BOW_X + 0.5:
			var beam := WreckStructure.get_beam_at(clampf(loc.x, WreckStructure.STERN_X, WreckStructure.BOW_X))
			if absf(loc.z) < beam + 0.70:
				var outer_world := to_global(Vector3(0.0, 0.55, 2.35))
				var outer_loc := ship_vessel.to_local(outer_world)
				if absf(outer_loc.z) >= beam + 0.70:
					exit_world = outer_world
				else:
					loc.z = (beam + 0.90) * (1.0 if loc.z >= 0.0 else -1.0)
					exit_world = ship_vessel.to_global(loc)
	if target.has_method("exit_boat"):
		target.exit_boat(exit_world)
	_sync_boarding_state(true)

func _process(delta: float) -> void:
	if not ship_vessel:
		ship_vessel = get_tree().root.find_child("ShipVessel", true, false) as Node3D

	for i in range(riders.size() - 1, -1, -1):
		if not is_instance_valid(riders[i]):
			riders.remove_at(i)
	is_occupied = not riders.is_empty()
	rider = _find_active_rider()
	_sync_boarding_state(false)

	var row_input := Vector2.ZERO
	var rowing_fast := false
	var active_pilot := _find_active_rider()
	if active_pilot and active_pilot.get("is_active_player"):
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
		var stroke := cos(row_phase)
		var dip := sin(row_phase)
		if oar_port:
			oar_port.rotation_degrees = _oar_port_rest + Vector3(dip * 12.0, stroke * 26.0, 0.0)
		if oar_stbd:
			oar_stbd.rotation_degrees = _oar_stbd_rest + Vector3(dip * 12.0, -stroke * 26.0, 0.0)
	else:
		if oar_port:
			oar_port.rotation_degrees = oar_port.rotation_degrees.lerp(_oar_port_rest, clampf(delta * 5.0, 0.0, 1.0))
		if oar_stbd:
			oar_stbd.rotation_degrees = oar_stbd.rotation_degrees.lerp(_oar_stbd_rest, clampf(delta * 5.0, 0.0, 1.0))

	super._process(delta)

	var fwd := Vector3(cos(-initial_rot_y), 0.0, sin(-initial_rot_y))
	for i in range(riders.size()):
		var passenger := riders[i]
		var seat_idx := mini(i, SEAT_OFFSETS.size() - 1)
		passenger.global_position = to_global(SEAT_OFFSETS[seat_idx])
		if passenger.has_method("sync_boat_heading"):
			passenger.sync_boat_heading(Vector2(fwd.x, fwd.z))

func _resolve_sea_bounds_and_hull(cur_pos: Vector3, next_pos: Vector3) -> Vector3:
	var out := next_pos
	out.x = clampf(out.x, -110.0, 110.0)
	out.z = clampf(out.z, -90.0, 90.0)

	# Evitar que el bote traspase el casco del pecio Rosa de los Vientos
	if ship_vessel:
		var loc := ship_vessel.to_local(out)
		if loc.x > -31.8 and loc.x < 32.0:
			var beam := WreckStructure.get_beam_at(clampf(loc.x, WreckStructure.STERN_X, WreckStructure.BOW_X))
			var safe_z := beam + 1.85
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
		if dist < 4.5 and dist > 0.001:
			var push: Vector2 = reef_pt + diff.normalized() * 4.5
			out.x = push.x
			out.z = push.y

	return out
