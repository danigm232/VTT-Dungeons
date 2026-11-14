shader_type spatial;
render_mode cull_disabled, specular_schlick_ggx;

// Shader de Casco Envejecido PBR (Capa 4):
// Mezcla orgánica triplanar por cota respecto a la línea de flotación (-3.05 m):
// madera sumergida oscura con moho -> franja salina de marea -> roble curtido por viento.

uniform sampler2D albedo_tex : source_color, filter_linear_mipmap_anisotropic, repeat_enable;
uniform sampler2D normal_tex : hint_normal, filter_linear_mipmap_anisotropic, repeat_enable;
uniform sampler2D roughness_tex : filter_linear_mipmap_anisotropic, repeat_enable;
uniform sampler2D ao_tex : filter_linear_mipmap_anisotropic, repeat_enable;

uniform vec4 dry_tint : source_color = vec4(0.56, 0.49, 0.39, 1.0);
uniform vec4 salt_tint : source_color = vec4(0.48, 0.46, 0.40, 1.0);
uniform vec4 wet_rot_tint : source_color = vec4(0.16, 0.21, 0.14, 1.0);
uniform float triplanar_scale = 0.22;
uniform float sea_level = -3.05;
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
	w = pow(w, vec3(3.5));
	w /= max(0.0001, w.x + w.y + w.z);

	vec3 wood_col = sample_triplanar(albedo_tex, v_world_pos, w).rgb;
	float r_sample = sample_triplanar(roughness_tex, v_world_pos, w).r;
	float ao_sample = sample_triplanar(ao_tex, v_world_pos, w).r;

	// Gradiente orgánico por cota vertical y ondulación a lo largo de la eslora
	float wave_stain = sin(v_world_pos.x * 0.42 + v_world_pos.z * 0.65) * 0.25
		+ cos(v_world_pos.x * 1.15 - v_world_pos.z * 0.9) * 0.12;
	float h_above_sea = (v_world_pos.y - sea_level) + wave_stain;

	float wet_mask = 1.0 - smoothstep(0.0, 1.25, h_above_sea);
	float salt_mask = smoothstep(-0.2, 0.6, h_above_sea) * (1.0 - smoothstep(1.3, 2.7, h_above_sea));
	float grime_streaks = clamp(sin(v_world_pos.x * 1.7) * 0.5 + 0.5, 0.0, 1.0) * 0.25;

	vec3 tint = mix(dry_tint.rgb, salt_tint.rgb, salt_mask * 0.72);
	tint = mix(tint, wet_rot_tint.rgb, wet_mask);
	vec3 final_albedo = wood_col * tint * (1.0 - grime_streaks * (1.0 - smoothstep(0.0, 3.0, h_above_sea)));

	vec3 n_tx = texture(normal_tex, v_world_pos.zy * triplanar_scale).xyz * 2.0 - 1.0;
	vec3 n_ty = texture(normal_tex, v_world_pos.xz * triplanar_scale).xyz * 2.0 - 1.0;
	vec3 n_tz = texture(normal_tex, v_world_pos.xy * triplanar_scale).xyz * 2.0 - 1.0;
	vec3 wn = normalize(v_world_nrm) * (FRONT_FACING ? 1.0 : -1.0);
	vec3 world_nrm = normalize(
		vec3(0.0, n_tx.y, n_tx.x) * w.x +
		vec3(n_ty.x, 0.0, n_ty.y) * w.y +
		vec3(n_tz.x, n_tz.y, 0.0) * w.z +
		wn
	);

	ALBEDO = final_albedo * mix(0.68, 1.05, ao_sample) * mix(1.0, 0.76, rain_wetness);
	NORMAL = normalize((VIEW_MATRIX * vec4(world_nrm, 0.0)).xyz);
	ROUGHNESS = mix(clamp(r_sample * 0.96, 0.55, 0.95), clamp(r_sample * 0.52, 0.26, 0.58), wet_mask);
	METALLIC = 0.02;
	ROUGHNESS = mix(ROUGHNESS, 0.42, rain_wetness * 0.65);
	SPECULAR = mix(0.16, 0.36, max(wet_mask, rain_wetness));
	AO = ao_sample;
	AO_LIGHT_AFFECT = 0.55;
}
