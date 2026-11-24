shader_type spatial;
render_mode blend_mix, depth_draw_opaque, cull_disabled, specular_schlick_ggx;

// Shader de Agua Inundada protegida para Sentina C8 (15-45cm) y Superficie de Bodega C9.
// Movimiento casi imperceptible e independiente del oleaje exterior del océano.

uniform vec4 color_shallow : source_color = vec4(0.048, 0.132, 0.124, 0.85);
uniform vec4 color_deep : source_color = vec4(0.020, 0.070, 0.084, 0.94);
uniform float is_deep_hold = 0.0;
uniform float surface_visibility = 0.82;
uniform float caustic_energy = 0.05;

varying vec3 v_world_pos;

float caustic_pattern(vec2 p, float t) {
	float a = sin(p.x * 1.15 + t * 0.30 + cos(p.y * 0.95 - t * 0.22));
	float b = cos(p.y * 1.30 - t * 0.26 + sin(p.x * 1.05 + t * 0.18));
	float ridge = 1.0 - clamp(abs(a + b) * 0.72, 0.0, 1.0);
	return pow(ridge, 2.4);
}

void vertex() {
	vec3 wp = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	// Apenas 2 mm de vaivén lento en agua estancada protegida por el casco
	float wave = sin(wp.x * 0.65 + TIME * 0.35) * 0.0020 + cos(wp.z * 0.75 - TIME * 0.28) * 0.0015;
	VERTEX.y += wave;
	v_world_pos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
}

void fragment() {
	float t = TIME;
	float rip1 = sin(v_world_pos.x * 1.5 + t * 0.32 + v_world_pos.z * 0.9);
	float rip2 = cos(v_world_pos.z * 1.7 - t * 0.26 - v_world_pos.x * 0.8);
	float ripple = (rip1 + rip2) * 0.5;

	// Babor (-Z local) es más profundo (45cm) que Estribor (+Z local, 15cm)
	float depth_grad = clamp((-v_world_pos.z + 4.5) / 9.0, 0.0, 1.0);
	float c_web = caustic_pattern(v_world_pos.xz * 0.55, t * 0.30) * 0.65
		+ caustic_pattern(v_world_pos.xz * 0.90 + vec2(4.1, -2.3), -t * 0.22) * 0.35;

	vec4 base = mix(color_shallow, color_deep, mix(depth_grad * 0.85, 0.88, is_deep_hold));
	vec3 caustic_col = mix(vec3(0.14, 0.28, 0.24), vec3(0.14, 0.38, 0.46), is_deep_hold);

	// Transformar normal de onda a espacio vista (Godot 4 fragment() exige NORMAL en view-space)
	vec3 world_n = normalize(vec3(ripple * 0.032, 1.0, rip2 * 0.032));
	vec3 view_n = normalize((VIEW_MATRIX * vec4(world_n, 0.0)).xyz);
	float fresnel = pow(1.0 - clamp(dot(view_n, normalize(VIEW)), 0.0, 1.0), 3.0);
	vec3 sheen_col = mix(vec3(0.05, 0.12, 0.13), vec3(0.10, 0.28, 0.36), is_deep_hold);
	vec3 final_col = base.rgb + caustic_col * c_web * mix(0.08, 0.22, is_deep_hold) + sheen_col * fresnel * mix(0.22, 0.34, is_deep_hold);

	ALBEDO = final_col;
	ALPHA = clamp(base.a * surface_visibility + fresnel * 0.10, 0.42, 0.92);
	ROUGHNESS = mix(0.56, 0.20, is_deep_hold);
	SPECULAR = mix(0.08, 0.36, is_deep_hold);
	METALLIC = 0.02;
	EMISSION = caustic_col * c_web * caustic_energy * mix(0.06, 0.14, is_deep_hold);
	NORMAL = view_n;
}
