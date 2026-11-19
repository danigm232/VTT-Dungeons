class_name NestAmbianceController
extends Node3D

# Controlador ambiental y de visibilidad 2.5D para el Nido de la Arpía (C1 / C10):
# - Mueve suavemente hierbas y plumas con el viento marino (Paso 7.4)
# - Flexiona ramas y reproduce crujidos sutiles al aterrizar la arpía (Paso 7.5-7.6)
# - Atenúa ramas frontales cercanas a la cámara si tapan un sprite 2D (Paso 9.5)

const PecioSfxKit = preload("res://scripts/pecio_sfx_kit.gd")

var sway_materials: Array[ShaderMaterial] = []
var front_rim_nodes: Array[Node3D] = []
var flex_branch_nodes: Array[Node3D] = []
var nest_center_local: Vector3 = Vector3(0.35, 15.02, -0.48)

var _sfx_player: AudioStreamPlayer3D
var _landing_flex: float = 0.0
var _camera: Camera3D
var _tokens: Array[Node3D] = []
var _is_headless := false

func _ready() -> void:
	_is_headless = (DisplayServer.get_name() == "headless")
	_sfx_player = AudioStreamPlayer3D.new()
	_sfx_player.name = "NestAmbianceSfx"
	_sfx_player.position = nest_center_local
	_sfx_player.max_distance = 24.0
	_sfx_player.volume_db = -6.0
	add_child(_sfx_player)
	_resolve_scene_refs.call_deferred()

func _resolve_scene_refs() -> void:
	var root_n := get_tree().root
	_camera = root_n.find_child("TacticalCamera", true, false) as Camera3D
	_tokens.clear()
	for tname in ["PlayerToken", "RogueToken", "WizardToken", "HarpyToken"]:
		var tok := root_n.find_child(tname, true, false) as Node3D
		if tok:
			_tokens.append(tok)

func play_harpy_landing() -> void:
	if _sfx_player and is_inside_tree() and not _is_headless:
		_sfx_player.stream = PecioSfxKit.make_wood_creak()
		_sfx_player.play()
	var tw := create_tween()
	tw.tween_method(_set_landing_flex, 0.0, 1.0, 0.16).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	tw.tween_method(_set_landing_flex, 1.0, 0.0, 0.42).set_trans(Tween.TRANS_ELASTIC).set_ease(Tween.EASE_OUT)

func play_nest_rustle() -> void:
	if _sfx_player and is_inside_tree() and not _is_headless:
		_sfx_player.stream = PecioSfxKit.make_wood_creak()
		_sfx_player.pitch_scale = 1.28
		_sfx_player.play()

func _set_landing_flex(v: float) -> void:
	_landing_flex = v
	for sm in sway_materials:
		if is_instance_valid(sm):
			sm.set_shader_parameter("landing_flex", v)
	for fn in flex_branch_nodes:
		if is_instance_valid(fn):
			fn.position.y = -v * 0.032

func _process(_delta: float) -> void:
	_update_camera_rim_occlusion()

func _update_camera_rim_occlusion() -> void:
	if not is_instance_valid(_camera) or front_rim_nodes.is_empty():
		return
	var cofa_global := to_global(nest_center_local)
	var cam_pos := _camera.global_position
	if cam_pos.distance_to(cofa_global) > 22.0 or cam_pos.y < 12.0:
		_apply_rim_occlusion(1.0)
		return

	var cam_horiz := Vector2(cam_pos.x - cofa_global.x, cam_pos.z - cofa_global.z)
	if cam_horiz.length_squared() < 0.05:
		_apply_rim_occlusion(1.0)
		return
	var cam_dir := cam_horiz.normalized()

	var occluding := false
	for tok in _tokens:
		if not is_instance_valid(tok) or not tok.visible:
			continue
		if tok.global_position.y < cofa_global.y - 1.0:
			continue
		var t_horiz := Vector2(tok.global_position.x - cofa_global.x, tok.global_position.z - cofa_global.z)
		var r_t := t_horiz.length()
		if r_t > 0.65 and r_t < 2.85 and t_horiz.normalized().dot(cam_dir) > 0.35:
			occluding = true
			break

	_apply_rim_occlusion(0.28 if occluding else 1.0)

func _apply_rim_occlusion(target_alpha: float) -> void:
	for rn in front_rim_nodes:
		if not is_instance_valid(rn):
			continue
		var mat = rn.get("material_override")
		if mat is ShaderMaterial:
			var cur: float = float(mat.get_shader_parameter("occlusion_alpha"))
			var next_a := lerpf(cur, target_alpha, 0.25)
			mat.set_shader_parameter("occlusion_alpha", next_a)
