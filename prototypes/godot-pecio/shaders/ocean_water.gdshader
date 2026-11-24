shader_type spatial;
render_mode depth_draw_always, specular_schlick_ggx;

// Océano Gerstner Multiarmónico con Rompientes Dinámicas y Espuma Marina Orgánica
// Sincronizado matemáticamente con OceanWaves (ocean_waves.gd) y BuoyantBoat

uniform vec4 albedo_shallow : source_color = vec4(0.085, 0.330, 0.320, 0.90);
uniform vec4 albedo_deep : source_color = vec4(0.016, 0.072, 0.110, 0.98);
uniform vec4 foam_color : source_color = vec4(0.92, 0.97, 0.96, 1.0);
uniform vec4 fresnel_sky_color : source_color = vec4(0.028, 0.062, 0.082, 1.0);
uniform vec4 distant_color_tint : source_color = vec4(0.018, 0.055, 0.075, 1.0);
uniform float fresnel_strength = 0.44;
uniform float foam_distance : hint_range(0.2, 4.0) = 1.65;
uniform float wave_amplitude : hint_range(0.0, 0.6) = 0.30;
uniform float wave_speed : hint_range(0.1, 3.0) = 1.15;
uniform mat4 hull_inv_matrix = mat4(1.0);
uniform float hull_mask_enabled = 0.0;

uniform sampler2D depth_texture : hint_depth_texture, filter_linear_mipmap;

varying vec3 v_world_pos;
varying vec3 v_wave_normal;
varying float v_crest_factor;

float hash21(vec2 p) {
	vec3 q = fract(vec3(p.xyx) * 0.1031);
	q += dot(q, q.yzx + 33.33);
	return fract((q.x + q.y) * q.z);
}

float vnoise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	vec2 u = f * f * (3.0 - 2.0 * f);
	float a = hash21(i);
	float b = hash21(i + vec2(1.0, 0.0));
	float c = hash21(i + vec2(0.0, 1.0));
	float d = hash21(i + vec2(1.0, 1.0));
	return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm2(vec2 p) {
	float v = 0.62 * vnoise(p);
	vec2 p2 = mat2(vec2(0.80, -0.60), vec2(0.60, 0.80)) * p * 2.13 + vec2(13.1, 7.7);
	v += 0.38 * vnoise(p2);
	return v;
}

float wreck_half_beam(float lx) {
	const float S = 41.0 / 42.0;
	vec2 pts[12] = vec2[](
		vec2(-31.5 * S, 4.2 * S),
		vec2(-30.0 * S, 6.35 * S),
		vec2(-27.0 * S, 8.8 * S),
		vec2(-22.0 * S, 10.1 * S),
		vec2(-18.0 * S, 10.5 * S),
		vec2(0.0 * S, 10.55 * S),
		vec2(14.0 * S, 10.5 * S),
		vec2(20.0 * S, 10.3 * S),
		vec2(24.0 * S, 8.4 * S),
		vec2(28.0 * S, 5.2 * S),
		vec2(30.0 * S, 2.4 * S),
		vec2(31.5 * S, 0.12 * S)
	);
	if (lx < pts[0].x || lx > pts[11].x) {
		return 0.0;
	}
	for (int i = 1; i < 12; i++) {
		if (lx <= pts[i].x) {
			float t = (lx - pts[i - 1].x) / max(0.0001, pts[i].x - pts[i - 1].x);
			return mix(pts[i - 1].y, pts[i].y, t);
		}
	}
	return pts[11].y;
}

void gerstner_wave(
	vec2 xz, float t, vec2 raw_dir, float wavelength, float weight, float pinch_ratio,
	inout vec3 offset, inout vec3 tangent, inout vec3 binormal, inout float crest_acc
) {
	vec2 dir = normalize(raw_dir);
	float a = wave_amplitude * weight;
	float k = 6.2831853 / wavelength;
	float h = a * pinch_ratio;
	float omega = sqrt(9.81 * k) * wave_speed * 0.42;
	float phase = k * dot(dir, xz) - omega * t;
	float c = cos(phase);
	float s = sin(phase);

	offset.x += dir.x * h * c;
	offset.y += a * s;
	offset.z += dir.y * h * c;

	float kh_s = k * h * s;
	float ka_c = k * a * c;
	tangent.x -= dir.x * dir.x * kh_s;
	tangent.y += dir.x * ka_c;
	tangent.z -= dir.x * dir.y * kh_s;

	binormal.x -= dir.x * dir.y * kh_s;
	binormal.y += dir.y * ka_c;
	binormal.z -= dir.y * dir.y * kh_s;

	crest_acc += max(0.0, s) * weight;
}

void eval_ocean_surface(vec2 base_xz, float t, out vec3 disp, out vec3 normal_w, out float crest) {
	disp = vec3(0.0);
	vec3 tangent = vec3(1.0, 0.0, 0.0);
	vec3 binormal = vec3(0.0, 0.0, 1.0);
	crest = 0.0;

	gerstner_wave(base_xz, t, vec2(0.42, -0.9075), 21.0, 0.48, 3.2, disp, tangent, binormal, crest);
	gerstner_wave(base_xz, t, vec2(-0.48, -0.8773), 12.8, 0.27, 2.6, disp, tangent, binormal, crest);
	gerstner_wave(base_xz, t, vec2(0.86, -0.5103), 6.8, 0.16, 2.0, disp, tangent, binormal, crest);
	gerstner_wave(base_xz, t, vec2(0.24, -0.9708), 3.6, 0.09, 1.6, disp, tangent, binormal, crest);

	normal_w = normalize(cross(binormal, tangent));
	if (normal_w.y < 0.0) {
		normal_w = -normal_w;
	}
}

vec2 capillary_slope(vec2 uv, vec2 warp, float t) {
	// Micro-rizos suaves deformados orgánicamente para romper reflejos plásticos sin chispas punteadas
	vec2 p = uv + warp * 0.70;
	float r1 = sin(dot(p, vec2(1.4, -2.5)) - t * 2.3);
	float r2 = sin(dot(p * 1.15 + vec2(4.2, -1.7), vec2(-2.9, -1.4)) - t * 2.9);
	float r3 = sin(dot(uv, vec2(3.8, 2.5)) + r1 * 0.8 + t * 3.4);
	float dr1 = cos(dot(p, vec2(1.4, -2.5)) - t * 2.3);
	float dr2 = cos(dot(p * 1.15 + vec2(4.2, -1.7), vec2(-2.9, -1.4)) - t * 2.9);
	float dr3 = cos(dot(uv, vec2(3.8, 2.5)) + r1 * 0.8 + t * 3.4);

	return vec2(1.4, -2.5) * dr1 * 0.011
		+ vec2(-2.9, -1.4) * dr2 * 0.008
		+ vec2(3.8, 2.5) * dr3 * 0.005 * (0.7 + 0.3 * r2);
}

void vertex() {
	vec3 world_base = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;

	vec3 disp;
	vec3 normal_w;
	float crest;
	eval_ocean_surface(world_base.xz, TIME, disp, normal_w, crest);

	VERTEX += disp;
	v_world_pos = world_base + disp;
	v_wave_normal = normal_w;
	v_crest_factor = crest;
	NORMAL = normal_w;
}

void fragment() {
	if (hull_mask_enabled > 0.5) {
		vec3 hull_local = (hull_inv_matrix * vec4(v_world_pos, 1.0)).xyz;
		// No dibujar oleaje ni espuma del mar abierto dentro del casco cerrado (C8/C9 usan su propia agua interior)
		if (hull_local.x >= -24.5 && hull_local.x <= 30.0) {
			float half_b = wreck_half_beam(hull_local.x);
			if (abs(hull_local.z) < half_b * 0.93) {
				discard;
			}
		}
	}
	float dist_xz = length(v_world_pos.xz);
	float distant_mix = smoothstep(72.0, 148.0, dist_xz);
	float horizon_haze = smoothstep(150.0, 760.0, dist_xz);
	vec3 distant_color = distant_color_tint.rgb;
	// Ondas multi-direccionales con warping de dominio para evitar bandas paralelas en el horizonte
	vec2 dw = vec2(
		vnoise(v_world_pos.xz * 0.035 + vec2(TIME * 0.018, -TIME * 0.014)),
		vnoise(v_world_pos.xz * 0.035 + vec2(17.3, -TIME * 0.016))
	) * 6.5;
	vec2 dp = v_world_pos.xz + dw;
	float dsx = cos(dot(dp, vec2(0.072, -0.098)) - TIME * 0.42) * 0.022
		+ cos(dot(dp, vec2(-0.115, -0.044)) + TIME * 0.31) * 0.018
		+ cos(dot(dp, vec2(0.041, 0.128)) - TIME * 0.25) * 0.014;
	float dsz = sin(dot(dp, vec2(-0.088, 0.068)) - TIME * 0.36) * 0.022
		+ sin(dot(dp, vec2(0.056, -0.118)) + TIME * 0.29) * 0.018
		+ cos(dot(dp, vec2(-0.132, -0.052)) - TIME * 0.21) * 0.014;
	float swell_atten = 1.0 - smoothstep(82.0, 320.0, dist_xz) * 0.88;
	vec3 distant_normal = normalize((VIEW_MATRIX * vec4(normalize(vec3(dsx * swell_atten, 1.0, dsz * swell_atten)), 0.0)).xyz);
	vec3 view_dir_far = normalize(VIEW);
	float far_fresnel = pow(1.0 - clamp(dot(distant_normal, view_dir_far), 0.0, 1.0), 3.6);
	float far_patch = vnoise(v_world_pos.xz * 0.022 + vec2(TIME * 0.012, -TIME * 0.009));
	vec3 far_water_col = mix(distant_color * 0.90, distant_color * 1.16, far_patch);
	far_water_col = mix(far_water_col, fresnel_sky_color.rgb, clamp(far_fresnel * fresnel_strength * 1.05, 0.0, 0.78));
	far_water_col = mix(far_water_col, fresnel_sky_color.rgb, horizon_haze * 0.56);
	if (distant_mix >= 0.999) {
		ALBEDO = far_water_col;
		NORMAL = distant_normal;
		ROUGHNESS = mix(0.28, 0.42, horizon_haze);
		METALLIC = 0.02;
		SPECULAR = mix(0.30, 0.16, horizon_haze);
		ALPHA = 1.0;
	} else {
	vec2 uv = v_world_pos.xz;
	vec2 warp = vec2(
		vnoise(uv * 0.28 + vec2(TIME * 0.07, -TIME * 0.05)),
		vnoise(uv * 0.28 + vec2(19.4, -TIME * 0.06))
	) * 1.25;

	// Normal Gerstner + micro-rizos capilares por viento
	vec3 wave_normal_w = normalize(v_wave_normal);
	vec2 micro_slope = capillary_slope(uv, warp, TIME);
	vec3 perturbed_w = normalize(wave_normal_w - vec3(micro_slope.x, 0.0, micro_slope.y));
	NORMAL = (VIEW_MATRIX * vec4(perturbed_w, 0.0)).xyz;

	// Reconstrucción exacta de geometría sumergida (Reversed-Z Vulkan: depth_raw <= 0.0001 = mar abierto profundo)
	float depth_raw = texture(depth_texture, SCREEN_UV).r;
	float ray_dist = 20.0;
	float vertical_depth = 20.0;
	if (depth_raw > 0.0001) {
		vec4 upos = INV_PROJECTION_MATRIX * vec4(SCREEN_UV * 2.0 - 1.0, depth_raw, 1.0);
		if (abs(upos.w) > 0.0001) {
			vec3 view_geo = upos.xyz / upos.w;
			vec3 world_geo = (INV_VIEW_MATRIX * vec4(view_geo, 1.0)).xyz;
			ray_dist = clamp(distance(VERTEX, view_geo), 0.0, 20.0);
			vertical_depth = clamp(v_world_pos.y - world_geo.y, 0.0, 20.0);
		}
	}

	float crest_frag = clamp(v_crest_factor, 0.0, 1.0);
	float turbidity_alpha = 1.0 - exp(-ray_dist * 2.85);
	float shoal_mask = clamp(1.0 - vertical_depth / 1.45, 0.0, 1.0);

	// Ruido orgánico multi-escala con deformación de dominio
	float macro_n = vnoise(uv * 0.085 + vec2(TIME * 0.03, -TIME * 0.02));
	float fbm_mid = fbm2((uv + warp) * 0.85 - vec2(TIME * 0.16, -TIME * 0.12));
	float fbm_fine = fbm2((uv - warp * 0.55) * 2.55 + vec2(-TIME * 0.26, TIME * 0.21));

	// Paleta marina en espacio LINEAL (evita saturación pastel tras el mapeo ACES/sRGB)
	vec3 storm_teal = vec3(0.010, 0.050, 0.068);
	vec3 ocean_base = mix(albedo_deep.rgb, storm_teal, smoothstep(0.18, 0.82, macro_n));
	ocean_base = mix(ocean_base, albedo_shallow.rgb, shoal_mask * 0.62);

	// Subsurface scattering esmeralda contenido en crestas altas de olas
	float sss = pow(crest_frag, 2.3) * smoothstep(0.30, 0.82, crest_frag);
	ocean_base += vec3(0.008, 0.055, 0.052) * sss * 0.90;

	// Cáusticas sutiles confinadas a bajíos someros (< 1.2m)
	float c1 = sin(uv.x * 2.3 + sin(uv.y * 2.7 + TIME * 1.15) + TIME * 0.85);
	float c2 = sin(uv.y * 2.1 + cos(uv.x * 2.5 - TIME * 1.05) - TIME * 0.75);
	float caustics = pow(max(0.0, (c1 + c2) * 0.5), 3.8) * shoal_mask * (1.0 - smoothstep(0.1, 1.2, ray_dist));
	ocean_base += vec3(0.018, 0.052, 0.048) * caustics * 0.45;

	// === ROMPIENTES DE OLAS Y ESPUMA ORGÁNICA CONTRA ARRECIFES, CASCO, COSTILLAS Y BOTE ===
	float contact_metric = mix(vertical_depth, ray_dist, 0.45);
	float normalized_dist = contact_metric / max(0.3, foam_distance);
	float organic_dist = normalized_dist + (fbm_mid - 0.5) * 0.44 + (fbm_fine - 0.5) * 0.18;

	// 1) Collar roto e irregular en el contacto exacto (suave, sin artefactos triangulares en la línea de flotación)
	float edge_aa = smoothstep(0.015, 0.14, ray_dist);
	float lip_mask = 1.0 - smoothstep(0.04, 0.34, organic_dist);
	float lip_erode = smoothstep(0.46, 0.78, fbm_fine * 0.52 + fbm_mid * 0.48);
	float lip_core = (1.0 - smoothstep(0.02, 0.16, organic_dist)) * smoothstep(0.50, 0.78, fbm_fine * 0.58 + fbm_mid * 0.42);
	float lip_foam = max(lip_mask * lip_erode, lip_core * 0.48) * edge_aa;

	// 2) Trenes de resaca/rompientes animados que marchan HACIA la roca/casco y se deshacen en encaje
	float surf_zone = smoothstep(0.06, 0.28, normalized_dist) * (1.0 - smoothstep(0.68, 1.55, normalized_dist));
	float surge_field = normalized_dist * 6.8 + TIME * 2.15 * wave_speed + fbm_mid * 3.6 + warp.x * 1.3;
	float roller_wave = max(pow(max(0.0, sin(surge_field)), 3.5), pow(max(0.0, sin(surge_field * 0.62 + 2.1)), 4.5) * 0.68);
	float wave_boost = 0.50 + 0.65 * crest_frag;
	float lace_noise = smoothstep(0.42, 0.76, fbm_fine * 0.68 + fbm_mid * 0.32);
	float roller_foam = roller_wave * surf_zone * lace_noise * wave_boost * 0.88 * edge_aa;

	// 3) Encaje espumoso y burbujas en la estela del reflujo junto al obstáculo
	float trail_zone = (1.0 - smoothstep(0.14, 1.18, normalized_dist)) * smoothstep(0.04, 0.22, normalized_dist);
	float lacy_bubbles = smoothstep(0.56, 0.78, fbm_fine) * (0.35 + 0.65 * fbm_mid) * trail_zone * 0.56;

	// 4) Borreguitos rasgados y espuma de viento en crestas altas de mar abierto
	vec2 wind_uv = vec2(uv.x * 0.90 + uv.y * 0.42, -uv.x * 0.42 + uv.y * 0.90);
	float wind_streaks = fbm2(vec2(wind_uv.x * 0.42, wind_uv.y * 1.55) - vec2(TIME * 0.28, TIME * 0.14));
	float open_peak = smoothstep(0.48, 0.88, crest_frag);
	float whitecap = open_peak * smoothstep(0.50, 0.78, wind_streaks * 0.62 + fbm_fine * 0.38) * 0.78;

	float contact_foam = clamp(lip_foam + roller_foam + lacy_bubbles, 0.0, 1.0);
	float total_foam = clamp(contact_foam + whitecap, 0.0, 1.0);

	vec3 foam_edge_tint = vec3(0.16, 0.38, 0.42);
	vec3 foam_lit = mix(foam_edge_tint, foam_color.rgb, smoothstep(0.22, 0.74, total_foam));
	vec3 final_color = mix(ocean_base, foam_lit, total_foam);

	// Fresnel costero en espacio lineal + transición continua sin costura hacia el mar abierto
	vec3 view_dir = normalize(VIEW);
	float fresnel = pow(1.0 - clamp(dot(normalize(NORMAL), view_dir), 0.0, 1.0), 3.8);
	final_color = mix(final_color, fresnel_sky_color.rgb, fresnel * fresnel_strength * (1.0 - total_foam));

	ALBEDO = mix(final_color, far_water_col, distant_mix);
	NORMAL = normalize(mix(NORMAL, distant_normal, distant_mix));
	ROUGHNESS = mix(mix(0.26, 0.90, total_foam), mix(0.28, 0.42, horizon_haze), distant_mix);
	METALLIC = 0.02;
	SPECULAR = mix(mix(0.30, 0.05, total_foam), mix(0.30, 0.16, horizon_haze), distant_mix);
	float shore_wet_alpha = smoothstep(0.0, 0.10, ray_dist) * 0.38 + turbidity_alpha * 0.61;
	ALPHA = mix(clamp(mix(max(0.30, shore_wet_alpha), 0.995, total_foam), 0.0, 1.0), 1.0, distant_mix);
	}
}
