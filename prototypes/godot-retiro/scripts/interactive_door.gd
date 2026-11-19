class_name InteractiveDoor
extends Node3D

## Puerta interactiva abatible (hoja doble monástica en celdas A1 o hoja simple en A2).
## Soporta apertura/cierre por Jugador ([T] / botón HUD) y DM (panel Objetos -> Puertas),
## colisión física cuando está cerrada, animación suave de bisagras y sonido procedural.

@export var door_id: String = "cell_1"
@export var door_title: String = "Puerta de Celda 1"
@export var is_open: bool = true
@export var interact_radius: float = 2.65
@export var open_angle_rad: float = 1.32
@export var single_leaf_closed_rad: float = 0.0
@export var single_leaf_open_rad: float = 1.26

signal door_toggled(opened: bool)

var is_player_nearby: bool = false
var left_pivot: Node3D = null
var right_pivot: Node3D = null
var blocker_shape: CollisionShape3D = null

var _open_blend: float = 1.0
var _check_accum: float = 0.0
var _audio_player: AudioStreamPlayer3D = null
var _feedback_lbl: Label3D = null
var _feedback_timer: float = 0.0

func _ready() -> void:
	add_to_group("interactive_doors")
	add_to_group("interactive_props")
	_open_blend = 1.0 if is_open else 0.0
	_apply_leaf_angles()
	_sync_blocker()

func _process(delta: float) -> void:
	var target := 1.0 if is_open else 0.0
	if not is_equal_approx(_open_blend, target):
		_open_blend = move_toward(_open_blend, target, delta * 2.75)
		_apply_leaf_angles()

	if _feedback_timer > 0.0:
		_feedback_timer = maxf(0.0, _feedback_timer - delta)
		if is_instance_valid(_feedback_lbl):
			_feedback_lbl.position.y += delta * 0.14
			if _feedback_timer <= 0.0:
				_feedback_lbl.visible = false

	_check_accum += delta
	if _check_accum < 0.05:
		return
	_check_accum = 0.0
	refresh_proximity()

func refresh_proximity() -> void:
	var tok := _get_active_player()
	if not is_instance_valid(tok):
		is_player_nearby = false
		return
	var d_xz := Vector2(global_position.x - tok.global_position.x, global_position.z - tok.global_position.z).length()
	is_player_nearby = d_xz <= interact_radius and absf(global_position.y - tok.global_position.y) <= 2.1

func get_interaction_prompt() -> String:
	return "[T] Cerrar %s" % door_title if is_open else "[T] Abrir %s" % door_title

func interact() -> void:
	toggle_door()

func toggle_door(actor: Node3D = null) -> bool:
	set_open(not is_open, true, actor)
	return is_open

func set_open(open_state: bool, play_fx: bool = true, actor: Node3D = null) -> void:
	if is_open == open_state and play_fx:
		return
	is_open = open_state
	_sync_blocker()
	if not play_fx:
		_open_blend = 1.0 if is_open else 0.0
		_apply_leaf_angles()
		emit_signal("door_toggled", is_open)
		return

	var tok := actor if is_instance_valid(actor) else _get_active_player()
	if is_instance_valid(tok):
		# Evitar atrapar al jugador en el umbral al cerrar la puerta (en espacio local de la puerta)
		if not is_open:
			var lp := to_local(tok.global_position)
			if absf(lp.x) < 1.35 and absf(lp.z) < 0.48:
				var push_dir := 1.0 if lp.z >= 0.0 else -1.0
				var pushed := to_global(Vector3(lp.x, lp.y, push_dir * 0.65))
				tok.global_position = Vector3(pushed.x, tok.global_position.y, pushed.z)
		if tok.has_method("face_world_direction"):
			tok.face_world_direction(global_position - tok.global_position)
		if tok.has_method("play_action_animation"):
			tok.play_action_animation("open_door", 0.50)

	_play_door_sound(is_open)
	_show_door_feedback("Puerta abierta" if is_open else "Puerta cerrada", Color("#f2d58a") if is_open else Color("#d2b27c"))
	var ui := _get_vtt_ui()
	if ui and ui.has_method("notify_mesa"):
		var actor_n := _actor_label(tok) if is_instance_valid(tok) else "El grupo"
		ui.notify_mesa("%s %s %s." % [actor_n, "abre" if is_open else "cierra", door_title])
	emit_signal("door_toggled", is_open)

func _apply_leaf_angles() -> void:
	var eased := smoothstep(0.0, 1.0, _open_blend)
	if is_instance_valid(left_pivot) and is_instance_valid(right_pivot):
		# Hoja doble: izquierda gira en +Y (hacia -Z interior), derecha gira en -Y (hacia -Z interior)
		left_pivot.rotation.y = eased * open_angle_rad
		right_pivot.rotation.y = -eased * open_angle_rad
	elif is_instance_valid(left_pivot):
		left_pivot.rotation.y = lerpf(single_leaf_closed_rad, single_leaf_open_rad, eased)

func _sync_blocker() -> void:
	if is_instance_valid(blocker_shape):
		blocker_shape.disabled = is_open

func _show_door_feedback(text: String, col: Color) -> void:
	if not is_instance_valid(_feedback_lbl):
		_feedback_lbl = Label3D.new()
		_feedback_lbl.name = "DoorFeedbackLabel3D"
		_feedback_lbl.billboard = BaseMaterial3D.BILLBOARD_ENABLED
		_feedback_lbl.font_size = 24
		_feedback_lbl.pixel_size = 0.0046
		_feedback_lbl.outline_size = 5
		_feedback_lbl.outline_modulate = Color(0.08, 0.06, 0.04, 0.92)
		add_child(_feedback_lbl)
	_feedback_lbl.text = text
	_feedback_lbl.modulate = col
	_feedback_lbl.position = Vector3(0.0, 2.38, 0.15)
	_feedback_lbl.visible = true
	_feedback_timer = 1.6

func _play_door_sound(opening: bool) -> void:
	if DisplayServer.get_name() == "headless" or AudioServer.get_driver_name() == "Dummy":
		return
	if not is_instance_valid(_audio_player):
		_audio_player = AudioStreamPlayer3D.new()
		_audio_player.name = "DoorAudioPlayer3D"
		_audio_player.max_distance = 22.0
		var gen := AudioStreamGenerator.new()
		gen.mix_rate = 22050.0
		gen.buffer_length = 0.42
		_audio_player.stream = gen
		add_child(_audio_player)
	_audio_player.play()
	var pb := _audio_player.get_stream_playback() as AudioStreamGeneratorPlayback
	if pb == null:
		return
	var frames := mini(pb.get_frames_available(), 7600)
	for i in range(frames):
		var tm := float(i) / 22050.0
		var env := exp(-tm * (5.2 if opening else 6.8))
		var sample := 0.0
		if opening:
			# Chirrido suave de bisagra de roble + clic de picaporte
			var f_creak := lerpf(165.0, 235.0, clampf(tm / 0.30, 0.0, 1.0))
			var latch := sin(tm * 980.0) * exp(-tm * 34.0) * 0.35
			sample = (sin(tm * f_creak * TAU * 0.16 + sin(tm * 29.0) * 2.4) * 0.55 + latch) * env * 0.19
		else:
			# Golpe grave de madera pesada al encajar + cierre de cerrojo
			var thud := sin(tm * 74.0 * TAU * 0.25) * exp(-tm * 16.0) * 0.72
			var clank := sin(tm * 740.0) * exp(-maxf(0.0, tm - 0.08) * 28.0) * (1.0 if tm >= 0.08 else 0.0) * 0.28
			sample = (thud + clank) * 0.24
		pb.push_frame(Vector2(sample, sample))

func _actor_label(tok: Node3D) -> String:
	var n := String(tok.get("token_name")) if tok.get("token_name") != null else String(tok.name)
	return n.capitalize() if not n.is_empty() else "Aventurero"

func _get_active_player() -> Node3D:
	var tree := get_tree()
	if not tree:
		return null
	var fallback: Node3D = null
	for p in tree.get_nodes_in_group("party_tokens"):
		if p is Node3D:
			if bool(p.get("is_active_player")):
				return p as Node3D
			if fallback == null and not bool(p.get("is_npc")):
				fallback = p as Node3D
	return fallback

func _get_vtt_ui() -> Node:
	var tree := get_tree()
	if not tree:
		return null
	return tree.get_first_node_in_group("vtt_role_ui")
