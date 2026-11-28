shader_type spatial;
render_mode unshaded, cull_disabled, depth_draw_never, shadows_disabled, blend_mul;

instance uniform float strength = .64;

void fragment() {
	float distance_to_feet = length((UV - vec2(.5)) * 2.0);
	float edge = 1.0 - smoothstep(.06, .98, distance_to_feet);
	float occlusion = edge * edge * strength;
	if (occlusion < .006) { discard; }
	ALBEDO = vec3(1.0 - occlusion);
	ALPHA = 1.0;
}
