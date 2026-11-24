shader_type spatial;
render_mode cull_disabled, depth_draw_always, specular_schlick_ggx;

// Shader AAA de Velas Rasgadas y Lona Náutica Envejecida
// Jirones orgánicos con ruido FBM, flecos deshilachados, manchas de salitre/moho y relieve de tela
uniform vec4 albedo_color : source_color = vec4(0.66, 0.61, 0.50, 1.0);
uniform vec4 dirt_color : source_color = vec4(0.24, 0.23, 0.17, 1.0);
uniform vec3 wind_direction = vec3(0.85, 0.0, 0.45);
uniform float wind_speed : hint_range(0.2, 4.0) = 2.1;
uniform float wind_amplitude : hint_range(0.02, 0.5) = 0.18;
uniform float tear_flutter : hint_range(0.05, 1.0) = 0.35;
uniform float rain_wetness = 0.0;

float hash21(vec2 p) {
	vec3 q = fract(vec3(p.xyx) * 0.1031);
	q += dot(q, q.yzx + 33.33);
	return fract((q.x + q.y) * q.z);
}

float vnoise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	vec2 u = f * f * (3.0 - 2.0 * f);
	return mix(
		mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
		mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
		u.y
	);
}

float fbm(vec2 p) {
	float v = 0.55 * vnoise(p);
	p = mat2(vec2(0.8, -0.6), vec2(0.6, 0.8)) * p * 2.07 + vec2(9.2, 4.1);
	v += 0.30 * vnoise(p);
	p = mat2(vec2(0.8, -0.6), vec2(0.6, 0.8)) * p * 2.11 + vec2(3.7, 11.4);
	v += 0.15 * vnoise(p);
	return v;
}

void vertex() {
	vec3 norm_wind = normalize(wind_direction);
	float hang = clamp(UV.y, 0.0, 1.0);
	float billow = sin(UV.x * 3.14159) * (0.25 + 0.75 * hang);
	float wave1 = sin(VERTEX.x * 0.85 + VERTEX.y * 1.15 + TIME * wind_speed);
	float wave2 = cos(VERTEX.z * 1.10 - VERTEX.y * 0.75 + TIME * (wind_speed * 0.78));
	float flutter = sin(UV.x * 26.0 + TIME * (wind_speed * 3.8)) * cos(UV.y * 18.0 - TIME * (wind_speed * 2.9));
	vec3 displacement = norm_wind * ((wave1 + wave2 * 0.5) * wind_amplitude * (0.35 + billow) + flutter * tear_flutter * 0.09 * hang * hang);
	VERTEX += displacement;
}

void fragment() {
	// Borde inferior rasgado orgánicamente (sin dientes triangulares regulares) + jirones colgantes
	float macro_rip = fbm(vec2(UV.x * 4.2 + 1.3, 0.7)) * 0.36;
	float strip_rip = vnoise(vec2(UV.x * 22.0, 3.1)) * 0.14;
	float fray_threads = vnoise(vec2(UV.x * 84.0, UV.y * 6.0)) * 0.06;
	float bottom_cutoff = 0.58 + macro_rip + strip_rip + fray_threads;

	// Desgarros laterales irregulares y agujeros orgánicos deformados con ruido
	float side_fray = fbm(vec2(UV.y * 6.5, UV.x * 2.0 + 4.1)) * 0.11;
	float hole_field = fbm(UV * vec2(5.4, 7.2) + vec2(2.1, 6.4));
	float hole_mask = smoothstep(0.18, 0.78, UV.y) * smoothstep(0.08, 0.25, UV.x) * smoothstep(0.92, 0.75, UV.x);
	bool torn_hole = (hole_field < 0.27) && (hole_mask > 0.35);

	if (UV.y > bottom_cutoff || UV.x < side_fray * 0.65 || UV.x > (1.0 - side_fray * 0.65) || torn_hole) {
		discard;
	}

	// Paños cosidos verticales, banda de rizos horizontal y trama fina de lona tejida
	float seam_v = smoothstep(0.028, 0.0, abs(fract(UV.x * 5.0) - 0.5));
	float reef_h = smoothstep(0.022, 0.0, abs(UV.y - 0.34)) + smoothstep(0.022, 0.0, abs(UV.y - 0.62));
	float weave = (sin(UV.x * 220.0) * sin(UV.y * 220.0)) * 0.032;
	float stain = fbm(UV * vec2(4.2, 5.8) + vec2(7.3, 1.9));
	float edge_rot = smoothstep(0.12, 0.0, bottom_cutoff - UV.y);

	vec3 bleached = albedo_color.rgb * vec3(1.08, 1.05, 0.98);
	vec3 mildew_col = vec3(0.16, 0.21, 0.15);
	float grime = clamp(pow(UV.y, 1.35) * 0.45 + stain * 0.38 + seam_v * 0.28 + reef_h * 0.24 + edge_rot * 0.48 + weave, 0.0, 0.90);
	vec3 base_rgb = mix(bleached, dirt_color.rgb, grime);
	base_rgb = mix(base_rgb, mildew_col, smoothstep(0.55, 0.85, stain) * smoothstep(0.35, 0.90, UV.y) * 0.45);
	// Blanqueo salino cerca de la verga superior
	base_rgb = mix(base_rgb, vec3(0.76, 0.74, 0.68), (1.0 - smoothstep(0.0, 0.24, UV.y)) * 0.22);

	ALBEDO = base_rgb * mix(1.0, 0.72, rain_wetness);
	ROUGHNESS = mix(0.92, 0.62, rain_wetness);
	METALLIC = 0.0;
	SPECULAR = mix(0.14, 0.28, rain_wetness);
	RIM = 0.48;
	RIM_TINT = 0.65;
}
