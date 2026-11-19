class_name MapExit
extends Node3D

# ==============================================================================
# CONEXIÓN REUTILIZABLE ENTRE MAPAS (MapExit) - VTT GODOT 2.5D
# Separa la lógica de detección/transición de la geometría escénica del camino.
# Incluye letrero 3D visible en escena y apertura de letrero de destino antes
# de confirmar el cambio de mapa.
# ==============================================================================

const ThemeKit = preload("res://scripts/vtt_ui_theme.gd")

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
@export var auto_trigger: bool = false
@export var prompt_before_travel: bool = true
@export var reversible: bool = true
@export var dm_locked: bool = false
@export var path_direction: Vector3 = Vector3(0.0, 0.0, -1.0)
@export var interaction_hint: String = ""
@export var show_signpost_3d: bool = true
@export_enum("auto", "dragon_post", "dragon_plaque", "hanging_ropes", "none") var signpost_style: String = "auto"
@export var sign_short_title: String = ""
@export var sign_subtitle: String = ""
@export var sign_offset: Vector3 = Vector3.ZERO

var trigger_area: Area3D
var is_player_nearby: bool = false
var nearby_player: Node3D = null
var _indicator_root: Node3D
var _chevron_mesh: MeshInstance3D
var _ring_mesh: MeshInstance3D
var _signpost_root: Node3D
var _sign_label_3d: Label3D
var _suppressed_until_exit: bool = false
var _dm_highlighted: bool = false
var _auto_timer: float = -1.0

func _ready() -> void:
	add_to_group("map_exits")
	_build_trigger_area()
	_build_discreet_indicator()
	_build_signpost_prop()
	_update_indicator_visibility()

func _process(delta: float) -> void:
	if _indicator_root and _indicator_root.visible:
		var bob := sin(Time.get_ticks_msec() * 0.004) * 0.06
		if _chevron_mesh:
			_chevron_mesh.position.y = 0.24 + bob

	if is_instance_valid(_signpost_root) and _signpost_root.visible:
		var vp := get_viewport()
		var cam := vp.get_camera_3d() if vp else null
		if is_instance_valid(cam):
			var target_xz := Vector3(cam.global_position.x, _signpost_root.global_position.y, cam.global_position.z)
			if target_xz.distance_squared_to(_signpost_root.global_position) > 0.01:
				_signpost_root.look_at(target_xz, Vector3.UP, true)

	if _auto_timer >= 0.0:
		_auto_timer -= delta
		if _auto_timer <= 0.0:
			_auto_timer = -1.0
			if is_player_nearby and is_instance_valid(nearby_player) and auto_trigger and not prompt_before_travel and not dm_locked and not _suppressed_until_exit:
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

func _resolve_sign_kind() -> String:
	if signpost_style != "auto":
		return signpost_style
	if transition_mode == "boat":
		return "hanging_ropes"
	if destination_label.to_lower().contains("retiro"):
		return "dragon_plaque"
	return "dragon_post"

func _build_signpost_prop() -> void:
	if not show_signpost_3d:
		return
	var kind := _resolve_sign_kind()
	if kind == "none":
		return
	var tex_path := ThemeKit.SIGN_DRAGON_POST_PATH
	var board_center_y := 0.88
	var sprite_center_y := 0.72
	var pixel_sz := 0.0021
	var lbl_width := 340.0
	var lbl_size := 40
	match kind:
		"hanging_ropes":
			tex_path = ThemeKit.SIGN_HANGING_ROPES_PATH
			sprite_center_y = 0.72
			board_center_y = 0.65
			pixel_sz = 0.0021
			lbl_width = 270.0
			lbl_size = 38
		"dragon_plaque":
			tex_path = ThemeKit.SIGN_DRAGON_PLAQUE_PATH
			sprite_center_y = 0.92
			board_center_y = 0.80
			pixel_sz = 0.0020
			lbl_width = 330.0
			lbl_size = 38

	var tex := ThemeKit.load_ui_texture(tex_path)
	if not tex:
		return

	_signpost_root = Node3D.new()
	_signpost_root.name = "SignpostProp"
	add_child(_signpost_root)

	var dir_xz := Vector3(path_direction.x, 0.0, path_direction.z)
	if dir_xz.length_squared() < 0.001:
		dir_xz = Vector3(0.0, 0.0, -1.0)
	dir_xz = dir_xz.normalized()
	var local_off := sign_offset
	if local_off.length_squared() < 0.0001:
		var side := Vector3(-dir_xz.z, 0.0, dir_xz.x).normalized()
		local_off = side * 1.55 - dir_xz * 0.55
	_signpost_root.position = local_off

	var base_mesh := MeshInstance3D.new()
	base_mesh.name = "SignpostStoneBase"
	var cyl := CylinderMesh.new()
	cyl.top_radius = 0.16
	cyl.bottom_radius = 0.24
	cyl.height = 0.16
	base_mesh.mesh = cyl
	var stone_mat := StandardMaterial3D.new()
	stone_mat.albedo_color = Color(0.24, 0.23, 0.21, 1.0)
	stone_mat.roughness = 0.94
	base_mesh.material_override = stone_mat
	base_mesh.position = Vector3(0.0, 0.05, 0.0)
	_signpost_root.add_child(base_mesh)

	var spr := Sprite3D.new()
	spr.name = "SignpostSprite"
	spr.texture = tex
	spr.pixel_size = pixel_sz
	spr.position = Vector3(0.0, sprite_center_y, 0.0)
	spr.shaded = true
	spr.alpha_cut = SpriteBase3D.ALPHA_CUT_DISCARD
	spr.alpha_scissor_threshold = 0.35
	spr.double_sided = true
	_signpost_root.add_child(spr)

	_sign_label_3d = Label3D.new()
	_sign_label_3d.name = "SignpostTitle"
	_sign_label_3d.text = sign_short_title if not sign_short_title.is_empty() else destination_label
	_sign_label_3d.font = ThemeKit.get_title_font()
	_sign_label_3d.font_size = lbl_size
	_sign_label_3d.pixel_size = 0.0036
	_sign_label_3d.width = lbl_width
	_sign_label_3d.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_sign_label_3d.modulate = Color("#fff3d6")
	_sign_label_3d.outline_modulate = Color(0.06, 0.03, 0.01, 0.98)
	_sign_label_3d.outline_size = 11
	_sign_label_3d.position = Vector3(0.0, board_center_y, 0.05)
	_sign_label_3d.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_sign_label_3d.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_signpost_root.add_child(_sign_label_3d)

	call_deferred("_snap_signpost_to_ground")

func _snap_signpost_to_ground() -> void:
	if not is_instance_valid(_signpost_root) or not is_inside_tree():
		return
	var w3d := get_world_3d()
	if not w3d:
		return
	var space := w3d.direct_space_state
	if not space:
		return
	var wp := _signpost_root.global_position
	var q := PhysicsRayQueryParameters3D.create(wp + Vector3.UP * 1.8, wp + Vector3.DOWN * 2.2)
	var hit := space.intersect_ray(q)
	if not hit.is_empty() and hit["normal"].y > 0.4:
		_signpost_root.global_position.y = float(hit["position"].y)

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

	if prompt_before_travel:
		if mgr and mgr.has_method("show_exit_sign"):
			mgr.show_exit_sign(self)
	elif auto_trigger and not dm_locked:
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
		if mgr and mgr.has_method("hide_exit_sign"):
			mgr.hide_exit_sign(self)

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
