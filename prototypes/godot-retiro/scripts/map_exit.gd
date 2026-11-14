class_name MapExit
extends Node3D

# ==============================================================================
# CONEXIÓN REUTILIZABLE ENTRE MAPAS (MapExit) - VTT GODOT 2.5D
# Separa la lógica de detección/transición de la geometría escénica del camino.
# ==============================================================================

signal transition_requested(exit_node: MapExit, actor: Node)
signal proximity_changed(exit_node: MapExit, is_nearby: bool)

@export var exit_id: String = ""
@export var display_name: String = "Salida de mapa"
@export var destination_label: String = "Siguiente escenario"
@export var target_scene_path: String = ""
@export var target_spawn_id: String = ""
@export var entry_facing: String = "n"
@export_enum("trail", "stairs", "boat", "cave", "door") var transition_mode: String = "trail"
@export var trigger_radius: float = 2.4
@export var trigger_height: float = 3.2
@export var auto_trigger: bool = true
@export var reversible: bool = true
@export var dm_locked: bool = false
@export var path_direction: Vector3 = Vector3(0.0, 0.0, -1.0)
@export var interaction_hint: String = ""

var trigger_area: Area3D
var is_player_nearby: bool = false
var nearby_player: Node3D = null
var _indicator_root: Node3D
var _chevron_mesh: MeshInstance3D
var _ring_mesh: MeshInstance3D
var _suppressed_until_exit: bool = false
var _dm_highlighted: bool = false
var _auto_timer: float = -1.0

func _ready() -> void:
	add_to_group("map_exits")
	_build_trigger_area()
	_build_discreet_indicator()
	_update_indicator_visibility()

func _process(delta: float) -> void:
	if _indicator_root and _indicator_root.visible:
		var bob := sin(Time.get_ticks_msec() * 0.004) * 0.06
		if _chevron_mesh:
			_chevron_mesh.position.y = 0.24 + bob

	if _auto_timer >= 0.0:
		_auto_timer -= delta
		if _auto_timer <= 0.0:
			_auto_timer = -1.0
			if is_player_nearby and is_instance_valid(nearby_player) and auto_trigger and not dm_locked and not _suppressed_until_exit:
				execute_transition()

func _build_trigger_area() -> void:
	trigger_area = Area3D.new()
	trigger_area.name = "ExitTriggerArea"
	trigger_area.monitoring = true
	trigger_area.monitorable = false

	var col := CollisionShape3D.new()
	var cyl := CylinderShape3D.new()
	cyl.radius = trigger_radius
	cyl.height = trigger_height
	col.shape = cyl
	col.position = Vector3(0.0, trigger_height * 0.35, 0.0)
	trigger_area.add_child(col)

	trigger_area.body_entered.connect(_on_body_entered)
	trigger_area.body_exited.connect(_on_body_exited)
	add_child(trigger_area)

func _build_discreet_indicator() -> void:
	_indicator_root = Node3D.new()
	_indicator_root.name = "DiscreetExitIndicator"
	_indicator_root.visible = false
	add_child(_indicator_root)

	var mat := StandardMaterial3D.new()
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat.albedo_color = Color(0.92, 0.84, 0.62, 0.72)

	var torus := TorusMesh.new()
	torus.inner_radius = maxf(0.45, trigger_radius * 0.34)
	torus.outer_radius = maxf(0.55, trigger_radius * 0.39)
	torus.rings = 24
	torus.ring_segments = 8
	_ring_mesh = MeshInstance3D.new()
	_ring_mesh.name = "GroundHintRing"
	_ring_mesh.mesh = torus
	_ring_mesh.material_override = mat
	_ring_mesh.position = Vector3(0.0, 0.06, 0.0)
	_ring_mesh.scale = Vector3(1.0, 0.12, 1.0)
	_ring_mesh.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	_indicator_root.add_child(_ring_mesh)

	var dir_xz := Vector3(path_direction.x, 0.0, path_direction.z)
	if dir_xz.length_squared() < 0.001:
		dir_xz = Vector3(0.0, 0.0, -1.0)
	dir_xz = dir_xz.normalized()

	var prism := PrismMesh.new()
	prism.size = Vector3(0.52, 0.62, 0.16)
	_chevron_mesh = MeshInstance3D.new()
	_chevron_mesh.name = "DirectionChevron"
	_chevron_mesh.mesh = prism
	_chevron_mesh.material_override = mat
	_chevron_mesh.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	_chevron_mesh.position = dir_xz * 0.65 + Vector3(0.0, 0.24, 0.0)
	var yaw := atan2(dir_xz.x, dir_xz.z)
	_chevron_mesh.rotation = Vector3(PI * 0.5, yaw, 0.0)
	_indicator_root.add_child(_chevron_mesh)

func suppress_until_exit() -> void:
	_suppressed_until_exit = true
	_auto_timer = -1.0

func set_dm_locked(locked: bool) -> void:
	dm_locked = locked
	_update_indicator_visibility()

func set_dm_highlighted(enabled: bool) -> void:
	_dm_highlighted = enabled
	_update_indicator_visibility()

func _update_indicator_visibility() -> void:
	if _indicator_root:
		_indicator_root.visible = is_player_nearby or _dm_highlighted

func _is_active_actor(body: Node) -> bool:
	if body == null or not (body is Node3D):
		return false
	if body.has_method("set_active"):
		return bool(body.get("is_active_player")) and not bool(body.get("is_npc"))
	return false

func _on_body_entered(body: Node) -> void:
	if not _is_active_actor(body):
		return
	if bool(body.get("is_transitioning")):
		return
	is_player_nearby = true
	nearby_player = body as Node3D
	_update_indicator_visibility()
	proximity_changed.emit(self, true)

	if _suppressed_until_exit:
		return

	var mgr := get_node_or_null("/root/MapTransition")
	if mgr and mgr.has_method("show_exit_prompt"):
		mgr.show_exit_prompt(self)

	if auto_trigger and not dm_locked:
		_auto_timer = 0.22

func _on_body_exited(body: Node) -> void:
	if body == nearby_player or _is_active_actor(body):
		is_player_nearby = false
		nearby_player = null
		_suppressed_until_exit = false
		_auto_timer = -1.0
		_update_indicator_visibility()
		proximity_changed.emit(self, false)
		var mgr := get_node_or_null("/root/MapTransition")
		if mgr and mgr.has_method("hide_exit_prompt"):
			mgr.hide_exit_prompt(self)

func _unhandled_input(event: InputEvent) -> void:
	if not is_player_nearby or not is_instance_valid(nearby_player):
		return
	if bool(nearby_player.get("is_transitioning")):
		return
	if event is InputEventKey and event.is_pressed() and not event.is_echo():
		var ek := event as InputEventKey
		if ek.ctrl_pressed or ek.alt_pressed or ek.meta_pressed:
			return
		if ek.keycode == KEY_T:
			execute_transition()
			get_viewport().set_input_as_handled()

func get_prompt_text() -> String:
	if dm_locked:
		return "%s (Paso cerrado por el DM)" % display_name
	if not interaction_hint.is_empty():
		return "[T] " + interaction_hint
	return "[T] Continuar hacia %s" % destination_label

func execute_transition() -> bool:
	if dm_locked:
		var mgr_lock := get_node_or_null("/root/MapTransition")
		if mgr_lock and mgr_lock.has_method("notify_blocked"):
			mgr_lock.notify_blocked(self)
		return false

	var actor := nearby_player
	if not is_instance_valid(actor):
		actor = _find_active_party_actor()

	transition_requested.emit(self, actor)

	var mgr := get_node_or_null("/root/MapTransition")
	if mgr and mgr.has_method("begin_transition") and not target_scene_path.is_empty():
		return mgr.begin_transition(self, actor)
	return false

func _find_active_party_actor() -> Node3D:
	for node in get_tree().get_nodes_in_group("party_tokens"):
		if _is_active_actor(node):
			return node as Node3D
	var root := get_tree().current_scene
	if root:
		for n in ["PlayerToken", "RogueToken", "WizardToken"]:
			var tok := root.get_node_or_null(n) as Node3D
			if tok and _is_active_actor(tok):
				return tok
	return null
