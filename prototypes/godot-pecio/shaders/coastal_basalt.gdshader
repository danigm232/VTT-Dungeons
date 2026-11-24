shader_type spatial;
render_mode blend_mix, depth_draw_opaque, cull_back, specular_schlick_ggx;

// Basalto costero volcánico triplanar con banda mareal húmeda, percebes y musgo marino
uniform sampler2D basalt_tex : source_color, filter_linear_mipmap, repeat_enable;
uniform sampler2D normal_tex : hint_normal, filter_linear_mipmap, repeat_enable;
uniform vec4 dry_tint : source_color = vec4(0.37, 0.42, 0.45, 1.0);
uniform vec4 wet_tint : source_color = vec4(0.12, 0.17, 0.20, 1.0);
uniform vec4 moss_tint : source_color = vec4(0.18, 0.30, 0.20, 1.0);
uniform vec4 barnacle_tint : source_color = vec4(0.64, 0.63, 0.57, 1.0);
uniform float sea_level = -3.05;
uniform float rain_wetness : hint_range(0.0, 1.0) = 0.0;

varying vec3 v_world_pos;
varying vec3 v_world_normal;

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

vec3 sample_triplanar(sampler2D tex, vec3 wp, vec3 blend, float scale) {
	vec3 tx = texture(tex, wp.zy * scale).rgb;
	vec3 ty = texture(tex, wp.xz * scale).rgb;
	vec3 tz = texture(tex, wp.xy * scale).rgb;
	return tx * blend.x + ty * blend.y + tz * blend.z;
}

void vertex() {
	v_world_pos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	v_world_normal = normalize((MODEL_MATRIX * vec4(NORMAL, 0.0)).xyz);
}

void fragment() {
	vec3 wn = normalize(v_world_normal);
	vec3 blend = pow(abs(wn), vec3(4.0));
	blend /= max(blend.x + blend.y + blend.z, 0.0001);

	vec3 base_tex = sample_triplanar(basalt_tex, v_world_pos, blend, 0.28);
	vec3 detail_tex = sample_triplanar(basalt_tex, v_world_pos + vec3(4.7, 1.3, -2.9), blend, 0.85);
	float strata = sin(v_world_pos.y * 4.2 + vnoise(v_world_pos.xz * 0.65) * 3.8) * 0.5 + 0.5;
	float macro_var = vnoise(v_world_pos.xz * 0.24 + v_world_pos.y * 0.18);
	float micro_n = vnoise(v_world_pos.xz * 2.4 + v_world_pos.y * 1.9);

	vec3 rock_col = mix(base_tex, detail_tex, 0.35) * dry_tint.rgb * mix(0.76, 1.14, strata * 0.65 + macro_var * 0.35);

	// Franja mareal mojada por oleaje alrededor de sea_level (-3.05m)
	float h_above_sea = v_world_pos.y - sea_level;
	float splash_noise = (vnoise(v_world_pos.xz * 0.55) - 0.5) * 0.48;
	float wet_band = 1.0 - smoothstep(0.15, 1.65, h_above_sea + splash_noise);
	float total_wet = clamp(max(wet_band, rain_wetness * 0.85), 0.0, 1.0);

	// Costra calcárea de percebes en la banda intermareal (0.15m..1.15m sobre el mar)
	float barnacle_zone = smoothstep(-0.15, 0.22, h_above_sea + splash_noise * 0.5) * (1.0 - smoothstep(0.75, 1.35, h_above_sea + splash_noise * 0.5));
	float fine_grain = vnoise(v_world_pos.xz * 6.8 + v_world_pos.y * 4.5);
	float barnacle_mask = barnacle_zone * smoothstep(0.58, 0.84, micro_n * 0.55 + fine_grain * 0.45) * (1.0 - smoothstep(0.62, 0.88, wn.y)) * 0.62;

	// Musgo/algas costeras en terrazas húmedas orientadas hacia arriba
	float moss_zone = smoothstep(0.10, 0.85, h_above_sea) * (1.0 - smoothstep(2.6, 4.6, h_above_sea));
	float moss_mask = smoothstep(0.40, 0.76, wn.y) * moss_zone * smoothstep(0.32, 0.70, macro_var) * 0.68;

	// Erosión mineral sutil de grano fino en aristas altas (sin manchas blancas tipo parche)
	float salt_mask = smoothstep(2.0, 3.8, h_above_sea) * smoothstep(0.60, 0.90, wn.y) * smoothstep(0.58, 0.88, fine_grain) * 0.09;

	vec3 col = mix(rock_col, rock_col * 0.40 + wet_tint.rgb * 0.34, wet_band * 0.88);
	col = mix(col, barnacle_tint.rgb * (0.72 + 0.28 * fine_grain), barnacle_mask);
	col = mix(col, moss_tint.rgb * (0.72 + 0.38 * detail_tex.g), moss_mask);
	col = mix(col, vec3(0.45, 0.49, 0.50), salt_mask);
	col *= mix(1.0, 0.78, rain_wetness * (1.0 - wet_band * 0.6));

	vec3 n_sample = sample_triplanar(normal_tex, v_world_pos, blend, 0.42);
	ALBEDO = col;
	NORMAL_MAP = n_sample;
	NORMAL_MAP_DEPTH = 1.15;
	ROUGHNESS = clamp(mix(0.88, 0.24, total_wet) + barnacle_mask * 0.22, 0.22, 0.96);
	SPECULAR = mix(0.28, 0.62, total_wet);
	METALLIC = 0.02;
	AO = clamp(0.62 + 0.38 * strata * (0.7 + 0.3 * max(wn.y, 0.0)), 0.45, 1.0);
}
