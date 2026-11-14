shader_type spatial;
render_mode depth_draw_always, specular_schlick_ggx;

// Océano Gerstner Multiarmónico con Rompientes Dinámicas y Espuma Marina Orgánica
// Sincronizado matemáticamente con OceanWaves (ocean_waves.gd) y BuoyantBoat

uniform vec4 albedo_shallow : source_color = vec4(0.085, 0.330, 0.320, 0.90);
uniform vec4 albedo_deep : source_color = vec4(0.016, 0.072, 0.110, 0.98);
uniform vec4 foam_color : source_color = vec4(0.92, 0.97, 0.96, 1.0);
uniform float foam_distance : hint_range(0.2, 4.0) = 1.65;
uniform float wave_amplitude : hint_range(0.0, 0.6) = 0.30;
uniform float wave_speed : hint_range(0.1, 3.0) = 1.15;

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
	float distant_mix = smoothstep(75.0, 100.0, length(v_world_pos.xz));
	vec3 distant_color = vec3(0.018, 0.055, 0.075);
	// Fragment-space broad ripples keep the distant ocean alive without
	// sampling scene depth or depending on the large horizon triangles.
	vec2 distant_slope = vec2(
		cos(dot(v_world_pos.xz, vec2(0.064, -0.11)) - TIME * 0.38),
		cos(dot(v_world_pos.xz, vec2(-0.081, -0.057)) - TIME * 0.29)
	) * 0.045;
	vec3 distant_normal = normalize((VIEW_MATRIX * vec4(normalize(vec3(distant_slope.x, 1.0, distant_slope.y)), 0.0)).xyz);
	if (distant_mix >= 0.999) {
		ALBEDO = distant_color;
		NORMAL = distant_normal;
		ROUGHNESS = 0.38;
		METALLIC = 0.02;
		SPECULAR = 0.22;
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

	// 1) Collar roto e irregular en el contacto exacto (deformación orgánica, cero contorno poligonal rígido)
	float lip_mask = 1.0 - smoothstep(0.01, 0.15, organic_dist);
	float lip_erode = smoothstep(0.34, 0.64, fbm_fine * 0.62 + fbm_mid * 0.38);
	float lip_core = (1.0 - smoothstep(0.0, 0.045, organic_dist)) * smoothstep(0.28, 0.52, fbm_fine);
	float lip_foam = max(lip_mask * lip_erode, lip_core * 0.85);

	// 2) Trenes de resaca/rompientes animados que marchan HACIA la roca/casco y se deshacen en encaje
	float surf_zone = smoothstep(0.03, 0.20, normalized_dist) * (1.0 - smoothstep(0.65, 1.55, normalized_dist));
	float surge_field = normalized_dist * 8.6 + TIME * 2.25 * wave_speed + fbm_mid * 3.4 + warp.x * 1.3;
	float roller_wave = max(pow(max(0.0, sin(surge_field)), 5.5), pow(max(0.0, sin(surge_field * 0.62 + 2.1)), 6.5) * 0.72);
	float wave_boost = 0.58 + 0.85 * crest_frag;
	float lace_noise = smoothstep(0.40, 0.74, fbm_fine * 0.72 + fbm_mid * 0.28);
	float roller_foam = roller_wave * surf_zone * lace_noise * wave_boost * 1.30;

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

	// Fresnel costero en espacio lineal + bruma atmosférica hacia el horizonte
	vec3 view_dir = normalize(VIEW);
	float fresnel = pow(1.0 - clamp(dot(normalize(NORMAL), view_dir), 0.0, 1.0), 4.0);
	final_color = mix(final_color, vec3(0.028, 0.062, 0.082), fresnel * 0.40 * (1.0 - total_foam));
	float far_haze = smoothstep(60.0, 125.0, length(uv));
	final_color = mix(final_color, distant_color, far_haze * 0.78);

	ALBEDO = mix(final_color, distant_color, distant_mix);
	NORMAL = normalize(mix(NORMAL, distant_normal, distant_mix));
	ROUGHNESS = mix(mix(0.28, 0.90, total_foam), 0.38, distant_mix);
	METALLIC = 0.02;
	SPECULAR = mix(mix(0.28, 0.05, total_foam), 0.22, distant_mix);
	float shore_wet_alpha = smoothstep(0.0, 0.10, ray_dist) * 0.38 + turbidity_alpha * 0.61;
	ALPHA = mix(clamp(mix(max(0.30, shore_wet_alpha), 0.995, total_foam), 0.0, 1.0), 1.0, distant_mix);
	}
}
