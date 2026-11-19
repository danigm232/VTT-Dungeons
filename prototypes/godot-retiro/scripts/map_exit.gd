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
@export var sign_yaw_deg: float = INF
@export var extra_routes: Array[Dictionary] = []
@export var primary_button_text: String = ""

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

static var _shared_oak_mat: StandardMaterial3D
static var _shared_iron_mat: StandardMaterial3D
static var _shared_soil_mat: StandardMaterial3D
static var _shared_contact_shadow_mat: StandardMaterial3D

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

func _ensure_sign_materials() -> void:
	if _shared_oak_mat == null:
		var oak_m := StandardMaterial3D.new()
		oak_m.albedo_color = Color("#5d442e")
		oak_m.roughness = 0.90
		oak_m.metallic = 0.02
		var tex_oak := ThemeKit.load_ui_texture("res://assets/textures/oak-v4.webp")
		if tex_oak == null and ResourceLoader.exists("res://assets/textures/oak-v4.webp"):
			tex_oak = ResourceLoader.load("res://assets/textures/oak-v4.webp") as Texture2D
		if tex_oak:
			oak_m.albedo_texture = tex_oak
		if ResourceLoader.exists("res://assets/textures/wood-normal-v1.png"):
			var norm := ResourceLoader.load("res://assets/textures/wood-normal-v1.png") as Texture2D
			if norm:
				oak_m.normal_enabled = true
				oak_m.normal_texture = norm
				oak_m.normal_scale = 0.45
		_shared_oak_mat = oak_m
	if _shared_iron_mat == null:
		var iron_m := StandardMaterial3D.new()
		iron_m.albedo_color = Color("#2d3035")
		iron_m.metallic = 0.62
		iron_m.roughness = 0.50
		_shared_iron_mat = iron_m
	if _shared_soil_mat == null:
		var soil_m := StandardMaterial3D.new()
		soil_m.albedo_color = Color("#4d3e2d")
		soil_m.roughness = 0.96
		_shared_soil_mat = soil_m
	if _shared_contact_shadow_mat == null:
		var grad := Gradient.new()
		grad.set_color(0, Color(0.02, 0.03, 0.04, 0.54))
		grad.set_color(1, Color(0.02, 0.03, 0.04, 0.0))
		var rtex := GradientTexture2D.new()
		rtex.gradient = grad
		rtex.fill = GradientTexture2D.FILL_RADIAL
		rtex.fill_from = Vector2(0.5, 0.5)
		rtex.fill_to = Vector2(1.0, 0.5)
		rtex.width = 64
		rtex.height = 64
		var cmat := StandardMaterial3D.new()
		cmat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		cmat.albedo_texture = rtex
		cmat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		cmat.depth_draw_mode = BaseMaterial3D.DEPTH_DRAW_DISABLED
		cmat.render_priority = 1
		_shared_contact_shadow_mat = cmat

func _add_sign_cylinder(parent: Node3D, node_name: String, pos: Vector3, r_top: float, r_bot: float, h: float, segs: int, mat: Material, shadow_on: bool = true) -> MeshInstance3D:
	var m := MeshInstance3D.new()
	m.name = node_name
	var cm := CylinderMesh.new()
	cm.top_radius = r_top
	cm.bottom_radius = r_bot
	cm.height = h
	cm.radial_segments = segs
	m.mesh = cm
	m.material_override = mat
	m.position = pos
	m.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON if shadow_on else GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parent.add_child(m)
	return m

func _add_sign_box(parent: Node3D, node_name: String, pos: Vector3, sz: Vector3, mat: Material, shadow_on: bool = true) -> MeshInstance3D:
	var m := MeshInstance3D.new()
	m.name = node_name
	var bm := BoxMesh.new()
	bm.size = sz
	m.mesh = bm
	m.material_override = mat
	m.position = pos
	m.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON if shadow_on else GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parent.add_child(m)
	return m

func _add_sign_ground_anchor(parent: Node3D, node_name: String, pos_xz: Vector3, shadow_size: Vector2) -> void:
	_add_sign_cylinder(parent, node_name + "_SoilMound", Vector3(pos_xz.x, 0.02, pos_xz.z), 0.11, 0.20, 0.08, 9, _shared_soil_mat, false)
	var sh := MeshInstance3D.new()
	sh.name = node_name + "_ContactShadow"
	var pm := PlaneMesh.new()
	pm.size = shadow_size
	sh.mesh = pm
	sh.material_override = _shared_contact_shadow_mat
	sh.position = Vector3(pos_xz.x, 0.022, pos_xz.z)
	sh.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parent.add_child(sh)

func _build_signpost_prop() -> void:
	if not show_signpost_3d:
		return
	var kind := _resolve_sign_kind()
	if kind == "none":
		return
	_ensure_sign_materials()

	var tex_path := ThemeKit.SIGN_DRAGON_POST_PATH
	var board_center_y := 1.04
	var sprite_center_y := 0.96
	var pixel_sz := 0.00148
	var lbl_width := 330.0
	var lbl_size := 50
	var lbl_pixel_sz := 0.0050
	var lbl_z := 0.064
	var sprite_z := 0.036
	var lbl_color := Color("#fff6de")
	var lbl_outline := Color(0.08, 0.04, 0.015, 0.99)
	var lbl_outline_sz := 9
	match kind:
		"hanging_ropes":
			tex_path = ThemeKit.SIGN_HANGING_ROPES_PATH
			sprite_center_y = 0.94
			board_center_y = 0.88
			pixel_sz = 0.00148
			lbl_width = 250.0
			lbl_size = 50
			lbl_pixel_sz = 0.0046
			sprite_z = 0.032
			lbl_z = 0.056
		"dragon_plaque":
			tex_path = ThemeKit.SIGN_DRAGON_PLAQUE_PATH
			sprite_center_y = 1.07
			board_center_y = 0.96
			pixel_sz = 0.00138
			lbl_width = 320.0
			lbl_size = 50
			lbl_pixel_sz = 0.0046
			sprite_z = 0.032
			lbl_z = 0.056

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

	# Orientacion fija clavada al mundo (nunca gira cuando se mueve o rota la camara)
	if is_finite(sign_yaw_deg):
		_signpost_root.rotation.y = deg_to_rad(sign_yaw_deg)
	else:
		var approach_xz := Vector3(-dir_xz.x, 0.0, -dir_xz.z)
		var look_dir := (approach_xz * 0.42 + Vector3(0.0, 0.0, 1.0)).normalized()
		if look_dir.z < 0.30:
			look_dir = Vector3(clampf(look_dir.x, -0.72, 0.72), 0.0, 0.85).normalized()
		_signpost_root.rotation.y = atan2(look_dir.x, look_dir.z)

	# Estructura 3D empalada profundamente bajo la rasante (-0.55m) segun tipo
	match kind:
		"hanging_ropes":
			for side_tag in [["L", -0.64], ["R", 0.64]]:
				var tag: String = str(side_tag[0])
				var sx: float = float(side_tag[1])
				# Poste vertical empalado desde y = -0.55m hasta y = +1.35m detras del plano visual del letrero
				_add_sign_cylinder(_signpost_root, "SignpostPost_" + tag, Vector3(sx, 0.40, -0.028), 0.056, 0.072, 1.90, 8, _shared_oak_mat, true)
				_add_sign_cylinder(_signpost_root, "SignpostCap_" + tag, Vector3(sx, 1.38, -0.028), 0.022, 0.062, 0.07, 6, _shared_oak_mat, true)
				_add_sign_cylinder(_signpost_root, "SignpostIronCollar_" + tag, Vector3(sx, 0.54, -0.028), 0.072, 0.074, 0.11, 8, _shared_iron_mat, true)
				_add_sign_ground_anchor(_signpost_root, "SignpostAnchor_" + tag, Vector3(sx, 0.0, -0.028), Vector2(0.75, 0.68))
				var brace := _add_sign_box(_signpost_root, "SignpostBrace_" + tag, Vector3(sx * 0.78, 1.18, -0.028), Vector3(0.28, 0.065, 0.065), _shared_oak_mat, true)
				brace.rotation.z = -0.76 * signf(sx)
			_add_sign_box(_signpost_root, "SignpostCrossbeam", Vector3(0.0, 1.31, -0.028), Vector3(1.48, 0.10, 0.085), _shared_oak_mat, true)
			_add_sign_box(_signpost_root, "SignpostBoardBack", Vector3(0.0, 0.87, 0.0), Vector3(0.98, 0.48, 0.050), _shared_oak_mat, true)
		"dragon_plaque":
			# Poste lateral con brazo en horca clavado a -0.55m para sostener la placa colgante
			_add_sign_cylinder(_signpost_root, "SignpostGallowsPost", Vector3(-0.68, 0.49, -0.028), 0.066, 0.084, 2.08, 8, _shared_oak_mat, true)
			_add_sign_cylinder(_signpost_root, "SignpostFinial", Vector3(-0.68, 1.56, -0.028), 0.016, 0.070, 0.09, 4, _shared_oak_mat, true)
			_add_sign_box(_signpost_root, "SignpostCrossbeam", Vector3(-0.02, 1.44, -0.028), Vector3(1.38, 0.095, 0.085), _shared_oak_mat, true)
			var g_brace := _add_sign_box(_signpost_root, "SignpostBrace", Vector3(-0.50, 1.30, -0.028), Vector3(0.34, 0.065, 0.065), _shared_oak_mat, true)
			g_brace.rotation.z = 0.78
			_add_sign_cylinder(_signpost_root, "SignpostIronCollar", Vector3(-0.68, 0.08, -0.028), 0.088, 0.090, 0.07, 8, _shared_iron_mat, true)
			_add_sign_ground_anchor(_signpost_root, "SignpostAnchor", Vector3(-0.68, 0.0, -0.028), Vector2(0.85, 0.75))
			_add_sign_box(_signpost_root, "SignpostBoardBack", Vector3(0.0, 0.96, 0.0), Vector3(1.22, 0.44, 0.050), _shared_oak_mat, true)
		_:
			# dragon_post: estaca central gruesa empalada desde y = -0.55m hasta base de tabla + respaldo macizo
			_add_sign_cylinder(_signpost_root, "SignpostMainPost", Vector3(0.0, 0.16, 0.0), 0.072, 0.092, 1.42, 8, _shared_oak_mat, true)
			_add_sign_cylinder(_signpost_root, "SignpostFinial", Vector3(0.0, 1.36, 0.0), 0.015, 0.070, 0.12, 4, _shared_oak_mat, true)
			_add_sign_cylinder(_signpost_root, "SignpostIronCollar", Vector3(0.0, 0.48, 0.0), 0.086, 0.090, 0.08, 8, _shared_iron_mat, true)
			_add_sign_ground_anchor(_signpost_root, "SignpostAnchor", Vector3.ZERO, Vector2(0.95, 0.85))
			_add_sign_box(_signpost_root, "SignpostBoardBack", Vector3(0.0, 1.07, 0.0), Vector3(1.06, 0.30, 0.048), _shared_oak_mat, true)
			for strap_x in [-0.24, 0.24]:
				_add_sign_box(_signpost_root, "SignpostStrap", Vector3(float(strap_x), 1.07, 0.0), Vector3(0.052, 0.31, 0.052), _shared_iron_mat, true)

	var spr := Sprite3D.new()
	spr.name = "SignpostSprite"
	spr.texture = tex
	spr.pixel_size = pixel_sz
	if kind == "hanging_ropes":
		spr.region_enabled = true
		spr.region_rect = Rect2(0.0, 0.0, float(tex.get_width()), floorf(float(tex.get_height()) * 0.88))
	spr.position = Vector3(0.0, sprite_center_y, sprite_z)
	spr.modulate = Color(0.76, 0.68, 0.58) if kind == "hanging_ropes" else Color(0.82, 0.76, 0.68)
	spr.shaded = true
	spr.alpha_cut = SpriteBase3D.ALPHA_CUT_DISCARD
	spr.alpha_scissor_threshold = 0.35
	spr.double_sided = true
	spr.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	_signpost_root.add_child(spr)

	var title_txt := sign_short_title if not sign_short_title.is_empty() else destination_label
	_sign_label_3d = Label3D.new()
	_sign_label_3d.name = "SignpostTitle"
	_sign_label_3d.text = title_txt
	_sign_label_3d.font = ThemeKit.get_title_font()
	_sign_label_3d.font_size = lbl_size
	_sign_label_3d.pixel_size = lbl_pixel_sz
	_sign_label_3d.width = lbl_width
	_sign_label_3d.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_sign_label_3d.modulate = lbl_color
	_sign_label_3d.outline_modulate = lbl_outline
	_sign_label_3d.outline_size = lbl_outline_sz
	_sign_label_3d.position = Vector3(0.0, board_center_y, lbl_z)
	_sign_label_3d.render_priority = 4
	_sign_label_3d.outline_render_priority = 3
	_sign_label_3d.alpha_cut = Label3D.ALPHA_CUT_DISABLED
	_sign_label_3d.double_sided = false
	_sign_label_3d.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_sign_label_3d.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_signpost_root.add_child(_sign_label_3d)

	var back_lbl := _sign_label_3d.duplicate() as Label3D
	back_lbl.name = "SignpostTitleBack"
	back_lbl.position = Vector3(0.0, board_center_y, -lbl_z)
	back_lbl.rotation.y = PI
	_signpost_root.add_child(back_lbl)

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
	var q := PhysicsRayQueryParameters3D.create(wp + Vector3.UP * 2.0, wp + Vector3.DOWN * 2.6)
	var hit := space.intersect_ray(q)
	if not hit.is_empty() and hit["normal"].y > 0.35:
		_signpost_root.global_position.y = float(hit["position"].y) - 0.025

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
		elif ek.keycode == KEY_M and not extra_routes.is_empty():
			execute_extra_transition(0)
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

func execute_extra_transition(idx: int = 0) -> bool:
	if idx < 0 or idx >= extra_routes.size():
		return false
	if dm_locked:
		var mgr_lock := get_node_or_null("/root/MapTransition")
		if mgr_lock and mgr_lock.has_method("notify_blocked"):
			mgr_lock.notify_blocked(self)
		return false

	var actor := nearby_player
	if not is_instance_valid(actor):
		actor = _find_active_party_actor()

	var route_cfg: Dictionary = extra_routes[idx]
	transition_requested.emit(self, actor)

	var mgr := get_node_or_null("/root/MapTransition")
	if mgr and mgr.has_method("begin_extra_transition"):
		return mgr.begin_extra_transition(self, route_cfg, actor)
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
