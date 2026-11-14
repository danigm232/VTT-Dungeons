shader_type spatial;
render_mode blend_mix, depth_draw_opaque, cull_disabled, specular_schlick_ggx;

// Shader de Agua Inundada para Sentina C8 (15-45cm) y Superficie de Bodega C9.

uniform vec4 color_shallow : source_color = vec4(0.11, 0.28, 0.24, 0.58);
uniform vec4 color_deep : source_color = vec4(0.04, 0.16, 0.22, 0.84);
uniform float is_deep_hold = 0.0;
uniform float surface_visibility = 0.50;
uniform float caustic_energy = 0.12;

varying vec3 v_world_pos;

float caustic_pattern(vec2 p, float t) {
	float a = sin(p.x * 1.45 + t * 1.05 + cos(p.y * 1.15 - t * 0.75));
	float b = cos(p.y * 1.65 - t * 0.90 + sin(p.x * 1.25 + t * 0.60));
	float ridge = 1.0 - clamp(abs(a + b) * 0.72, 0.0, 1.0);
	return pow(ridge, 2.2);
}

void vertex() {
	vec3 wp = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	float wave = sin(wp.x * 1.2 + TIME * 1.7) * 0.018 + cos(wp.z * 1.5 - TIME * 1.3) * 0.014;
	VERTEX.y += wave;
	v_world_pos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
}

void fragment() {
	float t = TIME;
	float rip1 = sin(v_world_pos.x * 2.4 + t * 1.9 + v_world_pos.z * 1.3);
	float rip2 = cos(v_world_pos.z * 2.9 - t * 1.5 - v_world_pos.x * 1.1);
	float ripple = (rip1 + rip2) * 0.5;

	// Babor (-Z local) es más profundo (45cm) que Estribor (+Z local, 15cm)
	float depth_grad = clamp((-v_world_pos.z + 4.5) / 9.0, 0.0, 1.0);
	float c_web = caustic_pattern(v_world_pos.xz * 0.65, t * 0.85) * 0.65
		+ caustic_pattern(v_world_pos.xz * 1.12 + vec2(4.1, -2.3), -t * 0.62) * 0.35;

	vec4 base = mix(color_shallow, color_deep, mix(depth_grad * 0.85, 0.88, is_deep_hold));
	vec3 caustic_col = mix(vec3(0.22, 0.42, 0.36), vec3(0.22, 0.60, 0.70), is_deep_hold);
	vec3 foam_edge = vec3(0.68, 0.78, 0.76);

	vec3 final_col = base.rgb + caustic_col * c_web * mix(0.16, 0.32, is_deep_hold);
	final_col = mix(final_col, foam_edge, smoothstep(0.65, 0.96, ripple) * 0.10);

	ALBEDO = final_col;
	ALPHA = clamp(base.a * surface_visibility + smoothstep(0.45, 0.95, ripple) * 0.025, 0.18, 0.65);
	ROUGHNESS = mix(0.32, 0.28, is_deep_hold);
	SPECULAR = 0.22;
	METALLIC = 0.0;
	EMISSION = caustic_col * c_web * caustic_energy * 0.12;
	NORMAL = normalize(vec3(ripple * 0.12, 1.0, rip2 * 0.12));
}
