shader_type spatial;
render_mode blend_add, depth_draw_never, cull_disabled, unshaded;

// Proyección animada de cáusticas submarinas en la Bodega Sumergida C9 (-6.4m)

uniform vec4 caustic_tint : source_color = vec4(0.24, 0.72, 0.84, 0.42);
uniform float light_energy = 0.25;

varying vec3 v_world_pos;

float web(vec2 p, float t) {
	float a = sin(p.x * 2.1 + t * 1.4 + sin(p.y * 1.7 - t));
	float b = cos(p.y * 2.4 - t * 1.2 + cos(p.x * 1.9 + t * 0.8));
	return clamp(1.0 - abs(a + b) * 0.55, 0.0, 1.0);
}

void vertex() {
	v_world_pos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
}

void fragment() {
	float w1 = pow(web(v_world_pos.xz * 0.78, TIME * 0.95), 2.5);
	float w2 = pow(web(v_world_pos.xz * 1.15 + vec2(3.7, 1.9), -TIME * 0.72), 2.8);
	float intensity = clamp(w1 * 0.65 + w2 * 0.45, 0.0, 1.0);
	ALBEDO = caustic_tint.rgb * intensity;
	ALPHA = caustic_tint.a * intensity * light_energy;
}
