extends Node3D

const WATER_RING := """
shader_type spatial;
render_mode unshaded, cull_disabled, shadows_disabled, depth_draw_never;
void fragment() {
	vec2 p = (UV - vec2(0.5)) * 2.0;
	float r = length(p);
	float rim = smoothstep(0.54, 0.70, r) * (1.0 - smoothstep(0.77, 0.92, r));
	float inner = smoothstep(0.30, 0.35, r) * (1.0 - smoothstep(0.40, 0.48, r));
	ALBEDO = vec3(0.70, 0.92, 0.92);
	ALPHA = COLOR.a * (0.48 * rim + 0.16 * inner);
}
"""
const BUBBLE_SHELL := """
shader_type spatial;
render_mode unshaded, shadows_disabled, depth_draw_never;
void fragment() {
	float edge = pow(1.0 - max(dot(NORMAL, VIEW), 0.0), 2.0);
	ALBEDO = mix(vec3(0.24, 0.58, 0.68), vec3(0.82, 0.96, 0.99), edge);
	ALPHA = (0.16 + 0.58 * edge) * COLOR.a;
}
"""

var bubbles: GPUParticles3D
var wake: GPUParticles3D
var body_height := 1.5
var dive_fill: OmniLight3D

func _ready() -> void:
	var actor_height = get_parent().get("target_height")
	if actor_height is float and actor_height > 0.0:
		body_height = actor_height
	var shell := SphereMesh.new()
	shell.radius = 0.052
	shell.height = 0.104
	shell.radial_segments = 8
	shell.rings = 4
	shell.material = _material(BUBBLE_SHELL)
	shell.material.render_priority = -1
	bubbles = _emitter("Burbujas", shell, 7, 1.55, Vector3.UP, Vector3(0.0, 0.34, 0.0))
	bubbles.explosiveness = 0.62
	var ripple := PlaneMesh.new()
	ripple.size = Vector2(0.86, 0.72)
	ripple.material = _material(WATER_RING)
	ripple.material.render_priority = 2
	wake = _emitter("Estela", ripple, 8, 0.68, Vector3.UP, Vector3.ZERO)

func update_water(surface: float, heading: Vector3, swimming_or_wading: bool, diving: bool, can_breathe: bool, reduced: bool) -> void:
	var direction := heading
	if direction.is_zero_approx():
		var facing: String = str(get_parent().get("facing_dir"))
		const DIRS := ["e", "se", "s", "sw", "w", "nw", "n", "ne"]
		var octant: int = DIRS.find(facing)
		if octant >= 0:
			direction = Vector3(cos(octant * PI / 4.0), 0.0, sin(octant * PI / 4.0))
	bubbles.position = Vector3.UP * body_height * 0.44 + direction * body_height * 0.18
	bubbles.emitting = diving and not can_breathe and not reduced
	wake.global_position = Vector3(global_position.x, surface + 0.055, global_position.z) - heading * 0.28
	wake.emitting = swimming_or_wading and not diving and not reduced
	if diving and not dive_fill:
		dive_fill = OmniLight3D.new()
		dive_fill.name = "SubmergedBounceLight"
		dive_fill.light_color = Color(0.42, 0.80, 0.84)
		dive_fill.light_energy = 1.15
		dive_fill.omni_range = 6.2
		dive_fill.omni_attenuation = 1.35
		dive_fill.distance_fade_enabled = false
		dive_fill.position = Vector3(0.25, 0.95, 0.35)
		add_child(dive_fill)
	if dive_fill:
		dive_fill.visible = diving

func _material(shader_code: String) -> ShaderMaterial:
	var shader := Shader.new()
	shader.code = shader_code
	var material := ShaderMaterial.new()
	material.shader = shader
	return material

func _emitter(node_name: String, mesh: Mesh, count: int, life: float, direction: Vector3, lift: Vector3) -> GPUParticles3D:
	var particle := GPUParticles3D.new()
	particle.name = node_name
	particle.amount = count
	particle.lifetime = life
	particle.local_coords = false
	particle.emitting = false
	particle.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	var process := ParticleProcessMaterial.new()
	process.direction = direction
	process.gravity = lift
	process.spread = 15.0
	process.initial_velocity_min = 0.14 if lift.y > 0.0 else 0.0
	process.initial_velocity_max = 0.36 if lift.y > 0.0 else 0.0
	process.scale_min = 0.45
	process.scale_max = 0.92
	var fade := Gradient.new()
	fade.offsets = PackedFloat32Array([0.0, 0.15, 0.55, 1.0])
	fade.colors = PackedColorArray([Color(1,1,1,0), Color.WHITE, Color(1,1,1,0.68), Color(1,1,1,0)])
	var ramp := GradientTexture1D.new()
	ramp.gradient = fade
	process.color_ramp = ramp
	particle.process_material = process
	particle.draw_pass_1 = mesh
	add_child(particle)
	return particle
