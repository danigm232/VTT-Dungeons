shader_type spatial;
render_mode cull_disabled, specular_schlick_ggx;

// Shader unificado de tablazón húmeda, verdosa y desgastada del Pecio "Rosa de los Vientos"
// Aporta variación por tablón (evita repetición), humedad con variación de rugosidad/reflejo,
// salitre en zonas expuestas y verdín orgánico en juntas y bordes.

uniform sampler2D albedo_tex : source_color, filter_linear_mipmap_anisotropic, repeat_enable;
uniform sampler2D normal_tex : hint_normal, filter_linear_mipmap_anisotropic, repeat_enable;
uniform sampler2D roughness_tex : filter_linear_mipmap_anisotropic, repeat_enable;
uniform sampler2D ao_tex : filter_linear_mipmap_anisotropic, repeat_enable;

uniform vec4 plank_dark_tint : source_color = vec4(0.42, 0.49, 0.41, 1.0);
uniform vec4 plank_dry_tint : source_color = vec4(0.68, 0.67, 0.56, 1.0);
uniform vec4 plank_warm_tint : source_color = vec4(0.56, 0.50, 0.39, 1.0);
uniform vec4 algae_tint : source_color = vec4(0.24, 0.38, 0.21, 1.0);
uniform vec4 salt_tint : source_color = vec4(0.76, 0.75, 0.68, 1.0);

uniform float plank_scale = 0.22;
uniform float plank_width = 0.34;
uniform float moss_strength = 0.48;
uniform float puddle_strength = 0.52;
uniform float edge_grime_width = 0.0;
uniform float rain_wetness = 0.0;

varying vec3 v_local_pos;
varying vec3 v_local_nrm;

float hash21(vec2 p) {
	p = fract(p * vec2(123.34, 456.21));
	p += dot(p, p + 45.32);
	return fract(p.x * p.y);
}

float value_noise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	f = f * f * (3.0 - 2.0 * f);
	float a = hash21(i);
	float b = hash21(i + vec2(1.0, 0.0));
	float c = hash21(i + vec2(0.0, 1.0));
	float d = hash21(i + vec2(1.0, 1.0));
	return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
	float v = 0.0;
	float amp = 0.5;
	for (int i = 0; i < 4; i++) {
		v += amp * value_noise(p);
		p *= 2.04;
		amp *= 0.5;
	}
	return v;
}

vec4 sample_triplanar(sampler2D tex, vec3 p, vec3 w) {
	vec4 tx = texture(tex, p.zy * plank_scale);
	vec4 ty = texture(tex, p.xz * plank_scale);
	vec4 tz = texture(tex, p.xy * plank_scale);
	return tx * w.x + ty * w.y + tz * w.z;
}

void vertex() {
	v_local_pos = VERTEX;
	v_local_nrm = NORMAL;
}

void fragment() {
	vec3 wn = normalize((MODEL_MATRIX * vec4(v_local_nrm, 0.0)).xyz);
	vec3 lw = abs(v_local_nrm);
	lw = pow(lw, vec3(3.5));
	lw /= max(0.0001, lw.x + lw.y + lw.z);

	// Bandas de tablón longitudinales con juntas escalonadas y variación individual por tabla
	float row_idx = floor(v_local_pos.z / plank_width);
	float row_f = fract(v_local_pos.z / plank_width);
	float row_shift = hash21(vec2(row_idx, 11.7)) * 2.8;
	float col_idx = floor((v_local_pos.x + row_shift) / 4.2);
	float col_f = fract((v_local_pos.x + row_shift) / 4.2);

	float plank_seed = hash21(vec2(row_idx + 17.0, col_idx + 31.0));
	float plank_seed2 = hash21(vec2(row_idx * 3.1 + 5.0, col_idx * 2.3 + 19.0));

	// Desplazamiento de textura por tabla para romper repeticiones
	vec3 sample_p = v_local_pos + vec3(plank_seed * 4.7, 0.0, plank_seed2 * 3.9);
	vec3 tex_col = sample_triplanar(albedo_tex, sample_p, lw).rgb;
	float r_sample = sample_triplanar(roughness_tex, sample_p, lw).r;
	float ao_sample = sample_triplanar(ao_tex, sample_p, lw).r;

	// Ranuras entre tablones y cabeceras
	float seam_z = 1.0 - smoothstep(0.0, 0.055, min(row_f, 1.0 - row_f));
	float seam_x = 1.0 - smoothstep(0.0, 0.014, min(col_f, 1.0 - col_f));
	float seam = max(seam_z, seam_x * 0.85) * step(0.45, abs(v_local_nrm.y));

	// Color base de cada tablón entre madera negro-verdosa húmeda, parda vieja y seca salina
	vec3 board_tint = mix(plank_dark_tint.rgb, plank_warm_tint.rgb, plank_seed);
	board_tint = mix(board_tint, plank_dry_tint.rgb, smoothstep(0.55, 0.95, plank_seed2) * 0.65);

	// Manchas orgánicas de humedad, verdín en juntas y trazos fibrosos de salitre siguiendo la veta
	float macro_n = fbm(v_local_pos.xz * 0.34 + vec2(4.2, -1.7));
	float detail_n = fbm(v_local_pos.xz * 1.45 + vec2(-3.1, 7.4));
	float salt_streak_n = fbm(vec2(v_local_pos.x * 0.45, v_local_pos.z * 3.8) + vec2(plank_seed * 7.0, 1.3));
	float wetness_pool = smoothstep(0.48, 0.78, macro_n + (detail_n - 0.5) * 0.22) * puddle_strength;
	float moss_mask = clamp((seam * 0.72 + smoothstep(0.58, 0.88, detail_n) * 0.38) * moss_strength, 0.0, 0.78);
	float salt_mask = smoothstep(0.62, 0.84, salt_streak_n) * (1.0 - wetness_pool * 0.85) * 0.24;

	vec3 tinted = mix(tex_col, vec3(0.45, 0.44, 0.38), 0.22) * board_tint * 1.38 * mix(0.88, 1.12, detail_n);
	tinted = mix(tinted, algae_tint.rgb, moss_mask);
	tinted = mix(tinted, salt_tint.rgb, salt_mask * step(0.35, abs(v_local_nrm.y)));
	tinted *= mix(1.0, 0.56, seam * 0.78);
	tinted *= mix(1.0, 0.72, clamp(wetness_pool * 0.65 + rain_wetness * 0.40, 0.0, 0.88));

	// Oscurecimiento en bordes exteriores cuando procede (cofa / borde de cubierta)
	if (edge_grime_width > 0.01) {
		float edge_r = length(v_local_pos.xz);
		float rim = smoothstep(max(0.1, edge_grime_width - 0.95), edge_grime_width, edge_r);
		tinted = mix(tinted, algae_tint.rgb * 0.62, rim * 0.58);
		wetness_pool = max(wetness_pool, rim * 0.42);
	}

	vec3 n_tx = texture(normal_tex, sample_p.zy * plank_scale).xyz * 2.0 - 1.0;
	vec3 n_ty = texture(normal_tex, sample_p.xz * plank_scale).xyz * 2.0 - 1.0;
	vec3 n_tz = texture(normal_tex, sample_p.xy * plank_scale).xyz * 2.0 - 1.0;
	vec3 local_base_nrm = normalize(
		vec3(0.0, n_tx.y, n_tx.x) * lw.x +
		vec3(n_ty.x, 0.0, n_ty.y) * lw.y +
		vec3(n_tz.x, n_tz.y, 0.0) * lw.z +
		v_local_nrm
	);
	vec3 world_nrm = normalize((MODEL_MATRIX * vec4(local_base_nrm, 0.0)).xyz) * (FRONT_FACING ? 1.0 : -1.0);

	float dry_rough = clamp(r_sample * 0.94 + seam * 0.08, 0.62, 0.96);
	float wet_rough = clamp(r_sample * 0.34, 0.16, 0.38);
	float eff_wet = clamp(wetness_pool + rain_wetness * 0.68, 0.0, 1.0);

	ALBEDO = tinted * mix(0.68, 1.06, ao_sample);
	NORMAL = normalize((VIEW_MATRIX * vec4(world_nrm, 0.0)).xyz);
	ROUGHNESS = mix(dry_rough, wet_rough, eff_wet);
	METALLIC = 0.02;
	SPECULAR = mix(0.14, 0.58, eff_wet);
	AO = ao_sample * (1.0 - seam * 0.55);
	AO_LIGHT_AFFECT = 0.58;
}
