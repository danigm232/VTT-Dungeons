shader_type spatial;
render_mode cull_disabled, specular_schlick_ggx;

// Shader de Envejecimiento para Modelos Kenney (50 años de naufragio):
// Desatura tonos nuevos, superpone veta triplanar, moho marino, salitre y mugre en cavidades.

uniform sampler2D albedo_tex : source_color, filter_linear_mipmap_anisotropic, repeat_enable;
uniform sampler2D grime_tex : source_color, filter_linear_mipmap_anisotropic, repeat_enable;
uniform sampler2D normal_tex : hint_normal, filter_linear_mipmap_anisotropic, repeat_enable;
uniform sampler2D roughness_tex : filter_linear_mipmap_anisotropic, repeat_enable;
uniform sampler2D ao_tex : filter_linear_mipmap_anisotropic, repeat_enable;

uniform float triplanar_scale = 0.72;
uniform float sea_level = -3.05;
uniform float age_desaturate = 0.54;
uniform float weather_darken = 0.44;
uniform float rain_wetness = 0.0;

varying vec3 v_world_pos;
varying vec3 v_world_nrm;

vec4 sample_triplanar(sampler2D tex, vec3 p, vec3 w) {
	vec4 tx = texture(tex, p.zy * triplanar_scale);
	vec4 ty = texture(tex, p.xz * triplanar_scale);
	vec4 tz = texture(tex, p.xy * triplanar_scale);
	return tx * w.x + ty * w.y + tz * w.z;
}

void vertex() {
	v_world_pos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	v_world_nrm = normalize((MODEL_MATRIX * vec4(NORMAL, 0.0)).xyz);
}

void fragment() {
	vec3 w = abs(v_world_nrm);
	w = pow(w, vec3(3.2));
	w /= max(0.0001, w.x + w.y + w.z);

	vec3 base_col = texture(albedo_tex, UV).rgb;
	float lum = dot(base_col, vec3(0.299, 0.587, 0.114));
	vec3 aged_col = mix(base_col, vec3(lum), age_desaturate) * weather_darken;

	vec3 grime_wood = sample_triplanar(grime_tex, v_world_pos, w).rgb;
	float grime_l = dot(grime_wood, vec3(0.299, 0.587, 0.114));
	float r_sample = sample_triplanar(roughness_tex, v_world_pos, w).r;
	float ao_sample = sample_triplanar(ao_tex, v_world_pos, w).r;

	// Ruido orgánico espacial para manchas de sal, hollín y musgo verde
	float patch_n = sin(v_world_pos.x * 2.1 + v_world_pos.z * 1.7) * 0.5
		+ cos(v_world_pos.y * 3.4 - v_world_pos.x * 1.9) * 0.5;
	float moss_mask = smoothstep(0.18, 0.65, patch_n) * clamp(1.0 - (v_world_pos.y - sea_level) * 0.14, 0.22, 0.92);
	float salt_bleach = smoothstep(0.35, 0.85, sin(v_world_pos.y * 4.5 + v_world_pos.z * 2.8) * 0.5 + 0.5)
		* smoothstep(-0.2, 2.5, v_world_pos.y - sea_level);

	// Desgaste y vetas en cavidades
	aged_col *= mix(0.68, 1.08, grime_l);
	aged_col = mix(aged_col, vec3(0.17, 0.24, 0.14), moss_mask * 0.44);
	aged_col = mix(aged_col, vec3(0.56, 0.54, 0.48), salt_bleach * 0.18);

	vec3 n_tx = texture(normal_tex, v_world_pos.zy * triplanar_scale).xyz * 2.0 - 1.0;
	vec3 n_ty = texture(normal_tex, v_world_pos.xz * triplanar_scale).xyz * 2.0 - 1.0;
	vec3 n_tz = texture(normal_tex, v_world_pos.xy * triplanar_scale).xyz * 2.0 - 1.0;
	vec3 wn = normalize(v_world_nrm) * (FRONT_FACING ? 1.0 : -1.0);
	vec3 world_nrm = normalize(
		vec3(0.0, n_tx.y, n_tx.x) * w.x +
		vec3(n_ty.x, 0.0, n_ty.y) * w.y +
		vec3(n_tz.x, n_tz.y, 0.0) * w.z +
		wn * 1.15
	);

	ALBEDO = aged_col * mix(0.75, 1.02, ao_sample) * mix(1.0, 0.80, rain_wetness);
	NORMAL = normalize((VIEW_MATRIX * vec4(world_nrm, 0.0)).xyz);
	ROUGHNESS = mix(clamp(mix(0.70, 0.96, r_sample), 0.58, 0.98), 0.44, rain_wetness);
	METALLIC = 0.04;
	SPECULAR = 0.15;
	AO = ao_sample;
	AO_LIGHT_AFFECT = 0.55;
}
