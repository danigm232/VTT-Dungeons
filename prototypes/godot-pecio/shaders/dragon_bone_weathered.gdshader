shader_type spatial;
render_mode blend_mix, depth_draw_opaque, cull_back, specular_schlick_ggx;

// Hueso mineralizado antiguo de Clyssavar (Dragón de Oro): pátina marina, estrías fósiles y algas basales
uniform sampler2D bone_tex : source_color, filter_linear_mipmap, repeat_enable;
uniform sampler2D normal_tex : hint_normal, filter_linear_mipmap, repeat_enable;
uniform vec4 bone_tint : source_color = vec4(0.76, 0.67, 0.47, 1.0);
uniform vec4 crevice_tint : source_color = vec4(0.32, 0.26, 0.17, 1.0);
uniform vec4 algae_tint : source_color = vec4(0.16, 0.25, 0.17, 1.0);
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

void vertex() {
	v_world_pos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	v_world_normal = normalize((MODEL_MATRIX * vec4(NORMAL, 0.0)).xyz);
}

void fragment() {
	vec3 wn = normalize(v_world_normal);
	vec3 blend = pow(abs(wn), vec3(3.0));
	blend /= max(blend.x + blend.y + blend.z, 0.0001);

	vec2 uv_a = v_world_pos.xz * 0.45;
	vec2 uv_b = v_world_pos.xy * 0.45;
	vec2 uv_c = v_world_pos.zy * 0.45;
	vec3 grain = texture(bone_tex, uv_c).rgb * blend.x + texture(bone_tex, uv_a).rgb * blend.y + texture(bone_tex, uv_b).rgb * blend.z;
	vec3 n_map = texture(normal_tex, uv_c).rgb * blend.x + texture(normal_tex, uv_a).rgb * blend.y + texture(normal_tex, uv_b).rgb * blend.z;

	float pores = vnoise(v_world_pos.xz * 2.6 + v_world_pos.y * 3.1);
	float streak = vnoise(vec2(v_world_pos.x * 0.65 + v_world_pos.z * 0.65, v_world_pos.y * 2.2));
	float cavity = smoothstep(0.18, 0.72, grain.r * 0.6 + pores * 0.4);

	// Tono marfil dorado antiguo con estrías fósiles y oscurecimiento en cavidades
	vec3 col = mix(crevice_tint.rgb, bone_tint.rgb * (0.86 + 0.24 * streak), cavity);
	// Blanqueado solar suave en caras superiores altas
	float sun_bleach = smoothstep(0.35, 0.90, wn.y) * smoothstep(0.8, 3.8, v_world_pos.y - sea_level);
	col = mix(col, col * vec3(1.12, 1.10, 1.04), sun_bleach * 0.40);

	// Pátina húmeda, algas y percebes cerca de la línea de flotación y bajo el agua
	float h_sea = v_world_pos.y - sea_level;
	float wave_n = (vnoise(v_world_pos.xz * 0.85) - 0.5) * 0.45;
	float wet_band = 1.0 - smoothstep(-0.10, 1.55, h_sea + wave_n);
	float algae_band = (1.0 - smoothstep(-0.30, 1.25, h_sea + wave_n * 0.7)) * smoothstep(0.34, 0.76, pores);
	float barnacle_speck = smoothstep(-0.20, 0.35, h_sea) * (1.0 - smoothstep(0.65, 1.35, h_sea)) * smoothstep(0.66, 0.86, vnoise(v_world_pos.xz * 5.2 + v_world_pos.y * 4.5));

	col = mix(col, col * 0.56, wet_band * 0.72);
	col = mix(col, algae_tint.rgb * (0.80 + 0.35 * streak), algae_band * 0.68);
	col = mix(col, vec3(0.68, 0.67, 0.60), barnacle_speck * 0.55);

	float total_wet = clamp(max(wet_band, rain_wetness * 0.75), 0.0, 1.0);
	ALBEDO = col * mix(1.0, 0.84, rain_wetness * (1.0 - wet_band * 0.5));
	NORMAL_MAP = n_map;
	NORMAL_MAP_DEPTH = 0.92;
	ROUGHNESS = clamp(mix(0.76, 0.30, total_wet) + barnacle_speck * 0.18, 0.26, 0.92);
	SPECULAR = mix(0.30, 0.55, total_wet);
	METALLIC = 0.04;
	AO = clamp(0.60 + 0.40 * cavity, 0.46, 1.0);
}
