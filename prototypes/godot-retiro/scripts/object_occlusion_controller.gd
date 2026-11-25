class_name ObjectOcclusionController
extends RefCounted

# ==============================================================================
# CONTROLADOR DE OCLUSIONES PARA CÁMARA TÁCTICA 2.5D
# 1. Desvanece progresivamente props/obstáculos entre cámara y ficha activa.
# 2. Actualiza los uniforms de recorte radial en copas de árboles y arbustos.
# ==============================================================================

const FADE_ALPHA_OCCLUDING: float = 0.72
const FADE_SPEED: float = 7.5
const MAX_CANOPY_MATERIALS: int = 16

static var _fade_levels: Dictionary = {} # instance_id -> {"node": GeometryInstance3D, "value": float}
static var _canopy_shaders: Array[ShaderMaterial] = []
static var _canopy_shader_res: Shader
static var _last_occluded_ids: Dictionary = {}
static var _last_probe_pos := Vector3(-9999.0, 0.0, -9999.0)
static var _last_probe_yaw: float = -999.0
static var _probe_tick: int = 0

static func clear_registry() -> void:
	_fade_levels.clear()
	_canopy_shaders.clear()
	_last_occluded_ids.clear()
	_last_probe_pos = Vector3(-9999.0, 0.0, -9999.0)
	_last_probe_yaw = -999.0
	_probe_tick = 0

static func make_canopy_dissolve_material(base_color: Color = Color.WHITE, roughness_val: float = 0.88, backlight_col: Color = Color(0.24, 0.42, 0.16), use_vertex_col: bool = true) -> ShaderMaterial:
	if _canopy_shader_res == null:
		var sh := Shader.new()
		sh.code = """shader_type spatial;
render_mode cull_disabled;

uniform vec4 base_tint : source_color = vec4(1.0);
uniform bool use_vertex_color = true;
uniform float roughness_val : hint_range(0.0, 1.0) = 0.88;
uniform vec3 backlight_tint : source_color = vec3(0.24, 0.42, 0.16);
uniform vec3 focus_world_0 = vec3(-9999.0);
uniform vec3 focus_world_1 = vec3(-9999.0);
uniform vec3 cam_to_eye = vec3(0.0, 0.5, 0.866);
uniform float dissolve_radius = 3.25;

varying vec3 v_world_pos;
varying vec3 v_albedo_col;

float bayer4x4(vec2 frag_xy) {
	int x = int(mod(frag_xy.x, 4.0));
	int y = int(mod(frag_xy.y, 4.0));
	int idx = x + y * 4;
	const float m[16] = float[16](
		0.0/16.0,  8.0/16.0,  2.0/16.0, 10.0/16.0,
		12.0/16.0, 4.0/16.0, 14.0/16.0,  6.0/16.0,
		3.0/16.0, 11.0/16.0,  1.0/16.0,  9.0/16.0,
		15.0/16.0, 7.0/16.0, 13.0/16.0,  5.0/16.0
	);
	return m[idx];
}

float ray_occlude_factor(vec3 frag_w, vec3 tok_w, vec3 eye_dir, float rad) {
	if (tok_w.x < -5000.0) return 0.0;
	vec3 tok_mid = tok_w + vec3(0.0, 0.95, 0.0);
	vec3 delta = frag_w - tok_mid;
	float along = dot(delta, eye_dir);
	if (along < 0.25 || along > 26.0) return 0.0;
	vec3 perp = delta - eye_dir * along;
	float d = length(perp);
	if (d >= rad) return 0.0;
	return clamp(1.0 - (d / rad), 0.0, 1.0) * smoothstep(0.25, 1.1, along);
}

void vertex() {
	v_world_pos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	vec3 col = base_tint.rgb;
	if (use_vertex_color) {
		vec3 vc = COLOR.rgb;
		vc = mix(vc / 12.92, pow((vc + 0.055) / 1.055, vec3(2.4)), step(0.04045, vc));
		col *= vc;
	}
	v_albedo_col = col;
}

void fragment() {
	float occ = max(
		ray_occlude_factor(v_world_pos, focus_world_0, cam_to_eye, dissolve_radius),
		ray_occlude_factor(v_world_pos, focus_world_1, cam_to_eye, dissolve_radius * 0.85)
	);
	if (occ > 0.05) {
		float keep_alpha = mix(1.0, 0.14, occ);
		if (keep_alpha < bayer4x4(FRAGCOORD.xy) + 0.04) {
			discard;
		}
	}
	ALBEDO = v_albedo_col;
	ROUGHNESS = roughness_val;
	METALLIC = 0.0;
	BACKLIGHT = backlight_tint;
}
"""
		_canopy_shader_res = sh

	var mat := ShaderMaterial.new()
	mat.shader = _canopy_shader_res
	mat.set_shader_parameter("base_tint", base_color)
	mat.set_shader_parameter("use_vertex_color", use_vertex_col)
	mat.set_shader_parameter("roughness_val", roughness_val)
	mat.set_shader_parameter("backlight_tint", backlight_col)
	if _canopy_shaders.size() >= MAX_CANOPY_MATERIALS:
		_canopy_shaders = _canopy_shaders.filter(func(m): return is_instance_valid(m))
	_canopy_shaders.append(mat)
	return mat

static func update(scene_root: Node, delta: float) -> void:
	if scene_root == null or not scene_root.is_inside_tree():
		return
	var viewport := scene_root.get_viewport()
	if viewport == null:
		return
	var cam := viewport.get_camera_3d()
	if cam == null or not is_instance_valid(cam):
		return

	var tree := scene_root.get_tree()
	var tokens: Array[Node3D] = []
	for t in tree.get_nodes_in_group("party_tokens"):
		if t is Node3D and is_instance_valid(t) and t.visible and not bool(t.get("is_npc")):
			if bool(t.get("is_active_player")):
				tokens.push_front(t as Node3D)
			else:
				tokens.append(t as Node3D)
	if tokens.is_empty():
		return

	# Dirección desde el foco hacia la cámara (en ortogonal todas las líneas visuales son paralelas a +basis.z)
	var cam_to_eye: Vector3 = cam.global_basis.z.normalized()
	if cam.projection == Camera3D.PROJECTION_PERSPECTIVE:
		cam_to_eye = (cam.global_position - (tokens[0].global_position + Vector3(0.0, 0.95, 0.0))).normalized()

	var f0 := tokens[0].global_position
	var f1 := tokens[1].global_position if tokens.size() > 1 else Vector3(-9999.0, 0.0, -9999.0)
	for sh_mat in _canopy_shaders:
		if is_instance_valid(sh_mat):
			sh_mat.set_shader_parameter("focus_world_0", f0)
			sh_mat.set_shader_parameter("focus_world_1", f1)
			sh_mat.set_shader_parameter("cam_to_eye", cam_to_eye)

	# Sondear obstáculos sólidos entre cámara y ficha activa cada 4 frames o al moverse/girar
	_probe_tick += 1
	var cam_yaw: float = cam.global_rotation.y
	var moved: bool = f0.distance_squared_to(_last_probe_pos) > 0.04 or absf(cam_yaw - _last_probe_yaw) > 0.03
	var occluded_ids: Dictionary = _last_occluded_ids
	if moved or (_probe_tick % 4) == 0:
		_last_probe_pos = f0
		_last_probe_yaw = cam_yaw
		var w3d := viewport.get_world_3d()
		if w3d != null:
			var space := w3d.direct_space_state
			occluded_ids = {}
			var probe_offsets := [
				Vector3(0.0, 0.95, 0.0),
				Vector3(0.45, 0.95, 0.0),
				Vector3(-0.45, 0.95, 0.0),
				Vector3(0.0, 1.55, 0.0),
			]
			var tok := tokens[0]
			var excluded: Array[RID] = []
			if tok is CollisionObject3D:
				excluded.append((tok as CollisionObject3D).get_rid())
			for off in probe_offsets:
				var target_pt: Vector3 = tok.global_position + off
				var ray_start: Vector3 = cam.global_position if cam.projection == Camera3D.PROJECTION_PERSPECTIVE else (target_pt + cam_to_eye * 36.0)
				for _step in range(3):
					var q := PhysicsRayQueryParameters3D.create(ray_start, target_pt, 1)
					q.exclude = excluded
					var hit := space.intersect_ray(q)
					if hit.is_empty():
						break
					var collider: Object = hit.get("collider")
					var rid: RID = hit.get("rid", RID())
					if rid.is_valid():
						excluded.append(rid)
					if collider is Node:
						var occ_root := _find_occluder_ancestor(collider as Node)
						if occ_root != null:
							_collect_geometry_ids(occ_root, occluded_ids)
					ray_start = (hit["position"] as Vector3) + (target_pt - ray_start).normalized() * 0.12
			_last_occluded_ids = occluded_ids

	# Actualizar suavemente transparencia en geometrías tocadas y restaurar el resto
	for gid in occluded_ids.keys():
		var gi: GeometryInstance3D = occluded_ids[gid]
		if not _fade_levels.has(gid):
			_fade_levels[gid] = {"node": gi, "value": 0.0}

	var to_erase: Array = []
	for gid in _fade_levels.keys():
		var rec: Dictionary = _fade_levels[gid]
		var gi: GeometryInstance3D = rec["node"]
		if not is_instance_valid(gi):
			to_erase.append(gid)
			continue
		var target_val: float = FADE_ALPHA_OCCLUDING if occluded_ids.has(gid) else 0.0
		var cur_val: float = move_toward(float(rec["value"]), target_val, delta * FADE_SPEED)
		rec["value"] = cur_val
		gi.transparency = cur_val
		if is_zero_approx(cur_val) and not occluded_ids.has(gid):
			gi.transparency = 0.0
			to_erase.append(gid)
	for gid in to_erase:
		_fade_levels.erase(gid)

static func _find_occluder_ancestor(node: Node) -> Node:
	var cur := node
	for _depth in range(4):
		if cur == null:
			break
		if cur.is_in_group("camera_occluder"):
			return cur
		cur = cur.get_parent()
	return null

static func _collect_geometry_ids(root: Node, out: Dictionary) -> void:
	if root is GeometryInstance3D:
		out[root.get_instance_id()] = root
	for child in root.get_children():
		_collect_geometry_ids(child, out)
