extends Node3D

const WaterState = preload("res://scripts/aquatic_state.gd")
const Facing = preload("res://sprites/sprite_facing.gd")

const WATER_RING := """
shader_type spatial;
render_mode unshaded, cull_disabled, shadows_disabled, depth_draw_never;
void fragment() {
	vec2 p = (UV - vec2(0.5)) * 2.0;
	float r = length(p);
	float rim = smoothstep(0.54, 0.70, r) * (1.0 - smoothstep(0.77, 0.92, r));
	float inner = smoothstep(0.30, 0.35, r) * (1.0 - smoothstep(0.40, 0.48, r));
	ALBEDO = vec3(0.64, 0.88, 0.88);
	ALPHA = COLOR.a * (0.44 * rim + 0.14 * inner);
}
"""
const WATER_PARTICLE := """
shader_type spatial;
render_mode unshaded, cull_disabled, shadows_disabled, depth_draw_never;
uniform bool droplet = false;

void vertex() {
	vec2 scale = vec2(length(MODEL_MATRIX[0].xyz), length(MODEL_MATRIX[1].xyz));
	vec4 center = VIEW_MATRIX * MODEL_MATRIX[3];
	MODELVIEW_MATRIX = mat4(vec4(scale.x,0.0,0.0,0.0), vec4(0.0,scale.y,0.0,0.0), vec4(0.0,0.0,1.0,0.0), center);
}

void fragment() {
	vec2 p = (UV - vec2(0.5)) * 2.0;
	if (droplet) {
		p.x *= mix(2.6, 1.45, smoothstep(-0.82, 0.45, p.y));
	}
	float radius = length(p);
	float silhouette = 1.0 - smoothstep(0.79, 0.97, radius);
	float rim = smoothstep(0.48, 0.74, radius) * silhouette;
	float glint = 1.0 - smoothstep(0.11, 0.34, length((p - vec2(-0.26,-0.46)) * vec2(0.82, 1.24)));
	ALBEDO = mix(vec3(0.28, 0.68, 0.81), vec3(0.85, 0.98, 1.0), max(rim, glint));
	ALPHA = COLOR.a * max((droplet ? 0.63 : 0.07) * silhouette, max(0.87 * rim, glint * silhouette));
}
"""

static var _meshes: Dictionary = {}
static var _process_materials: Dictionary = {}
var bubbles: GPUParticles3D
var wake: GPUParticles3D
var drips: GPUParticles3D
var body_height := 1.5
var hold_fill: OmniLight3D
var _water_contact := false
var _drip_time := 0.0
var _drip_strength := 0.0
var _reduced := false

func _ready() -> void:
	var actor_height = get_parent().get("target_height")
	if actor_height is float and actor_height > 0.0:
		body_height = actor_height
	if _meshes.is_empty():
		_build_resources()
	bubbles = _emitter("Burbujas", 10, 1.28)
	bubbles.explosiveness = 0.42
	wake = _emitter("Estela", 8, 0.64)

func update_water(delta: float, surface: float, heading: Vector3, moving: bool, state: WaterState, reduced: bool) -> void:
	if reduced != _reduced:
		_reduced = reduced
		bubbles.amount_ratio = 0.45 if reduced else 1.0
	var diving := state.submerged
	if diving:
		var direction := heading
		if direction.is_zero_approx():
			var octant: int = Facing.DIRECTIONS.find(str(get_parent().get("facing_dir")))
			if octant >= 0:
				direction = Vector3(cos(octant * PI / 4.0), 0.0, sin(octant * PI / 4.0))
		bubbles.position = Vector3.UP * body_height * 0.38 + direction * body_height * 0.24
	bubbles.emitting = diving
	var swimming := moving and state.surface_available and not diving and not reduced
	if swimming:
		wake.global_position = Vector3(global_position.x, surface + 0.055, global_position.z) - heading * 0.34
	wake.emitting = swimming
	_update_drips(delta, state)
	var in_flooded_hold := diving and not state.surface_available
	if in_flooded_hold and not hold_fill:
		hold_fill = OmniLight3D.new()
		hold_fill.name = "SubmergedBounceLight"
		hold_fill.light_color = Color(0.45, 0.73, 0.78)
		hold_fill.light_energy = 0.7
		hold_fill.omni_range = 2.65
		hold_fill.omni_attenuation = 1.6
		hold_fill.light_cull_mask = 64 | 128
		hold_fill.position = Vector3(0.45, 0.95, 0.60)
		add_child(hold_fill)
	if hold_fill:
		hold_fill.visible = in_flooded_hold

func _update_drips(delta: float, state: WaterState) -> void:
	var contact := state.in_water or state.immersion > WaterState.MOISTURE_THRESHOLD
	if contact:
		_drip_time = 0.0
		if not _water_contact:
			get_parent().wet_footprints.end_water_exit()
	elif _water_contact:
		var wet_height := state.wet_height(0.42)
		if wet_height > 0.0:
			get_parent().wet_footprints.begin_water_exit(state.wetness)
			_drip_strength = maxf(0.23, state.wetness)
			_drip_time = lerpf(1.1, 7.5, wet_height)
			if not drips:
				drips = _emitter("Goteo", 8, 0.53)
				drips.explosiveness = 0.31
			drips.position.y = body_height * clampf(wet_height - 0.065, 0.11, 0.76)
	_water_contact = contact
	_drip_time = maxf(0.0, _drip_time - delta)
	if drips:
		drips.emitting = _drip_time > 0.0
		if drips.emitting:
			drips.amount_ratio = minf(_drip_strength * minf(1.0, _drip_time), 0.6 if _reduced else 1.0)

static func _build_resources() -> void:
	var ripple := PlaneMesh.new()
	ripple.size = Vector2(0.8, 0.66)
	ripple.material = _material(WATER_RING)
	ripple.material.render_priority = 2
	_meshes["Estela"] = ripple
	var particle_shader := Shader.new()
	particle_shader.code = WATER_PARTICLE
	_meshes["Burbujas"] = _particle_quad(particle_shader, Vector2(0.255, 0.255), false, -2)
	_meshes["Goteo"] = _particle_quad(particle_shader, Vector2(0.064, 0.105), true, 2)
	_process_materials["Estela"] = _motion(Vector3.UP, Vector3.ZERO, Vector2.ZERO, Vector3.ZERO)
	_process_materials["Burbujas"] = _motion(Vector3.UP, Vector3.UP * 0.40, Vector2(0.31, 0.57), Vector3(0.15, 0.045, 0.12))
	_process_materials["Goteo"] = _motion(Vector3.DOWN, Vector3.DOWN * 3.5, Vector2(0.10, 0.31), Vector3(0.38, 0.12, 0.21))

static func _particle_quad(shader: Shader, size: Vector2, droplet: bool, priority: int) -> QuadMesh:
	var mesh := QuadMesh.new()
	mesh.size = size
	var material := ShaderMaterial.new()
	material.shader = shader
	material.set_shader_parameter("droplet", droplet)
	material.render_priority = priority
	mesh.material = material
	return mesh

static func _material(shader_code: String) -> ShaderMaterial:
	var shader := Shader.new()
	shader.code = shader_code
	var material := ShaderMaterial.new()
	material.shader = shader
	return material

func _emitter(node_name: String, count: int, life: float) -> GPUParticles3D:
	var particle := GPUParticles3D.new()
	particle.name = node_name
	particle.amount = count
	particle.lifetime = life
	particle.fixed_fps = 30
	particle.local_coords = false
	particle.emitting = false
	particle.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	particle.process_material = _process_materials[node_name]
	particle.draw_pass_1 = _meshes[node_name]
	add_child(particle)
	return particle

static func _motion(direction: Vector3, gravity: Vector3, speed: Vector2, spread_volume: Vector3) -> ParticleProcessMaterial:
	var process := ParticleProcessMaterial.new()
	process.direction = direction
	process.gravity = gravity
	process.spread = 13.0
	process.initial_velocity_min = speed.x
	process.initial_velocity_max = speed.y
	process.scale_min = 0.53
	process.scale_max = 1.05
	if not spread_volume.is_zero_approx():
		process.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_BOX
		process.emission_box_extents = spread_volume
	var fade := Gradient.new()
	fade.offsets = PackedFloat32Array([0.0, 0.15, 0.55, 1.0])
	fade.colors = PackedColorArray([Color(1,1,1,0), Color.WHITE, Color(1,1,1,0.62), Color(1,1,1,0)])
	var ramp := GradientTexture1D.new()
	ramp.gradient = fade
	process.color_ramp = ramp
	return process
