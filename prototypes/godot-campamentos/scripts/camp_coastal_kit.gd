class_name CampCoastalKit
extends RefCounted

## Shared coastal, marine, cliff, and sea-cave procedural geometry & shader kit.
## Reused cleanly across:
## - 03 · Playa del pecio (camp-wreck-beach)
## - 04 · Acantilados del Observatorio (camp-cliffs-observatory)
## - 05 · Refugio Cala Pleamar (camp-coastal-refuge)
## NOTE: camp-forest-pleamar (02) is FROZEN and does NOT use or depend on this kit.

const MatKit = preload("res://scripts/camp_material_kit.gd")
const EnvKit = preload("res://scripts/camp_environment_kit.gd")

# ==============================================================================
# 1. SHARED DEPTH-AWARE COASTAL OCEAN + LACY SURF FOAM SHADER (Phases 2, 3, 4)
# ==============================================================================
## Vertex color contract on the ocean mesh:
## - COLOR.r = normalized water depth (0.0 at waterline .. 1.0 at >= 2.6m deep)
## - COLOR.g = rock / headland / shipwreck foam proximity (0.0 .. 1.0)
## - COLOR.b = shelter attenuation (0.0 = open surf waves, 1.0 = sheltered calm cove/pool)
static func create_coastal_ocean_shader(
	deep_color: Color = Color(0.045, 0.19, 0.28, 0.96),
	mid_color: Color = Color(0.09, 0.36, 0.44, 0.88),
	shallow_color: Color = Color(0.24, 0.56, 0.56, 0.34),
	foam_color: Color = Color(0.90, 0.96, 0.98, 1.0),
	wave_amp: float = 0.085,
	speed: float = 1.0,
	exposed: bool = true
) -> ShaderMaterial:
	var sh := Shader.new()
	sh.code = """
shader_type spatial;
render_mode blend_mix, depth_draw_opaque, cull_disabled, specular_schlick_ggx;

uniform vec4 deep_col : source_color = vec4(0.045, 0.19, 0.28, 0.96);
uniform vec4 mid_col : source_color = vec4(0.09, 0.36, 0.44, 0.88);
uniform vec4 shallow_col : source_color = vec4(0.24, 0.56, 0.56, 0.34);
uniform vec4 foam_col : source_color = vec4(0.90, 0.96, 0.98, 1.0);
uniform float wave_amp = 0.085;
uniform float speed = 1.0;
uniform float swell_scale = 1.0;
uniform float whitecap_strength = 1.0;
uniform float wetness = 0.0;
uniform float snow_cover = 0.0;

varying vec3 wpos;
varying float v_depth;
varying float v_rock_foam;
varying float v_calm;

float hash21(vec2 p) {
	p = fract(p * vec2(127.1, 311.7));
	p += dot(p, p + 41.32);
	return fract(p.x * p.y);
}

float vnoise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	f = f * f * (3.0 - 2.0 * f);
	return mix(
		mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
		mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x),
		f.y
	);
}

float fbm2(vec2 p) {
	return vnoise(p) * 0.62 + vnoise(p * 2.13 + vec2(3.7, 1.9)) * 0.38;
}

float wave_field(vec2 xz, float t, float calm) {
	float s1 = sin(dot(xz, vec2(0.18, 0.98)) * 0.62 - t * 1.15);
	float s2 = sin(dot(xz, vec2(-0.52, 0.85)) * 0.95 - t * 1.48);
	float s3 = sin(dot(xz, vec2(0.76, 0.65)) * 1.42 + t * 1.22);
	float cap = fbm2(xz * 0.72 + vec2(t * 0.16, -t * 0.38)) * 2.0 - 1.0;
	float micro = vnoise(xz * 2.35 + vec2(-t * 0.28, -t * 0.52)) * 2.0 - 1.0;
	float raw = s1 * 0.34 + s2 * 0.24 + s3 * 0.14 + cap * 0.20 + micro * 0.08;
	return raw * mix(1.0, 0.38, calm);
}

void vertex() {
	float t = TIME * speed;
	v_depth = COLOR.r;
	v_rock_foam = COLOR.g;
	v_calm = COLOR.b;
	vec3 wp = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	float amp = wave_amp * smoothstep(0.01, 0.22, v_depth) * mix(1.0, 0.25, v_calm);
	float sw = sin(dot(wp.xz, vec2(0.16, 0.98)) * 0.42 - t * 1.12) * amp;
	sw += cos(dot(wp.xz, vec2(-0.48, 0.88)) * 0.68 - t * 1.46) * (amp * 0.42);
	VERTEX.y += sw;
	wpos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
}

void fragment() {
	float t = TIME * speed;
	float eps = 0.24 / max(0.5, swell_scale);
	vec2 sw_xz = wpos.xz * swell_scale;
	float h0 = wave_field(sw_xz, t, v_calm);
	float hx = wave_field(sw_xz + vec2(eps, 0.0), t, v_calm);
	float hz = wave_field(sw_xz + vec2(0.0, eps), t, v_calm);

	// Smooth controlled wave slope (no harsh high-frequency zigzag aliasing!)
	vec2 slope = vec2(h0 - hx, h0 - hz) * mix(0.88, 0.36, v_calm);

	// Organic noise-perturbed depth so shore contour is never rigid
	float n_lace = fbm2(wpos.xz * 0.85 + vec2(sin(t * 0.22) * 0.35, -t * 0.28));
	float n_fine = vnoise(wpos.xz * 2.65 + vec2(-t * 0.18, -t * 0.42));
	float swash_osc = sin(t * 1.18 + wpos.x * 0.28 + n_lace * 2.4) * 0.022 * mix(1.0, 0.32, v_calm);
	float eff_depth = max(0.0, v_depth + (n_lace - 0.5) * 0.045 + swash_osc);

	// Rich coastal color gradient: clear turquoise shallows -> mid emerald-teal -> deep sapphire ocean
	vec3 col = mix(shallow_col.rgb, mid_col.rgb, smoothstep(0.03, 0.34, eff_depth));
	col = mix(col, deep_col.rgb, smoothstep(0.28, 0.88, eff_depth));

	// Subtle sunlit subsurface turquoise scatter in wave crests over shallow/mid water
	float sss = smoothstep(0.08, 0.65, h0) * (1.0 - smoothstep(0.35, 0.92, eff_depth));
	col += vec3(0.04, 0.11, 0.10) * sss;

	// 1) Leading breaking swash foam right along the curved waterline
	float shore_band = (1.0 - smoothstep(0.004, 0.095, eff_depth)) * smoothstep(0.001, 0.018, eff_depth);
	float shore_lace = shore_band * smoothstep(0.28, 0.72, n_lace * 0.62 + n_fine * 0.38);

	// 2) Secondary rolling surf wave lines marching smoothly inward toward the curved shore
	float wave_phase = eff_depth * 24.0 + t * 1.65 + (n_lace - 0.5) * 2.8;
	float roller_crest = pow(max(0.0, sin(wave_phase)), 6.0) * smoothstep(0.04, 0.14, eff_depth) * (1.0 - smoothstep(0.18, 0.42, eff_depth));
	float roller_foam = roller_crest * smoothstep(0.34, 0.76, n_lace * 0.55 + n_fine * 0.45) * mix(0.82, 0.18, v_calm);

	// 3) Localized churning white foam collar around reef rocks, headlands & shipwreck hull
	float rock_ring = v_rock_foam * smoothstep(0.26, 0.74, n_lace * 0.58 + n_fine * 0.42 + sin(t * 1.4 + v_rock_foam * 6.0) * 0.12);

	// 4) Subtle offshore whitecap flecks on deep swell peaks
	float whitecap = smoothstep(0.68, 0.94, h0 * 0.55 + n_fine * 0.45) * smoothstep(0.35, 0.75, eff_depth) * mix(0.28, 0.0, v_calm) * whitecap_strength;

	float foam = clamp(shore_lace * 0.92 + roller_foam + rock_ring * 0.90 + whitecap, 0.0, 0.94);
	col = mix(col, foam_col.rgb, foam);

	// Grazing Fresnel sky reflection (calibrated so dusk/night never look muddy or blown out)
	float fresnel = pow(1.0 - clamp(dot(normalize(NORMAL), normalize(VIEW)), 0.0, 1.0), 3.4);
	col = mix(col, mix(mid_col.rgb * 1.35, foam_col.rgb * 0.86, 0.55), fresnel * 0.24 * (1.0 - foam * 0.7));

	// Feather alpha seamlessly to 0 right at the beach/cove waterline (zero sharp water edge!)
	float shore_alpha = smoothstep(0.002, 0.055, eff_depth);
	float depth_alpha = mix(shallow_col.a, deep_col.a, smoothstep(0.04, 0.48, eff_depth));

	ALBEDO = col;
	METALLIC = mix(0.06, 0.01, foam);
	ROUGHNESS = mix(0.11, 0.56, foam) + wetness * 0.03;
	SPECULAR = mix(0.55, 0.18, foam);
	NORMAL_MAP = vec3(clamp(0.5 + slope.x, 0.14, 0.86), clamp(0.5 + slope.y, 0.14, 0.86), 1.0);
	NORMAL_MAP_DEPTH = mix(0.62, 0.22, foam);
	ALPHA = clamp((depth_alpha + foam * 0.34) * shore_alpha, 0.0, 0.96);
}
"""
	var mat := ShaderMaterial.new()
	mat.shader = sh
	mat.set_shader_parameter("deep_col", deep_color)
	mat.set_shader_parameter("mid_col", mid_color)
	mat.set_shader_parameter("shallow_col", shallow_color)
	mat.set_shader_parameter("foam_col", foam_color)
	mat.set_shader_parameter("wave_amp", wave_amp)
	mat.set_shader_parameter("speed", speed)
	if exposed:
		MatKit._exposed_shaders.append(mat)
	return mat

# ==============================================================================
# 2. MULTI-LAYER COASTAL BEACH TERRAIN SHADER (Phase 2 — Playa del pecio)
# ==============================================================================
## Vertex color contract:
## - COLOR.r = moisture (0 = dry upper sand, 0.5 = damp swash, 1.0 = wet shoreline & seabed)
## - COLOR.g = gravel / pebble / wrack band & rocky dune fringe
## - COLOR.b = compacted bivouac camp wear / drag furrow darkening
static func create_beach_terrain_shader(exposed: bool = true) -> ShaderMaterial:
	var sh := Shader.new()
	sh.code = """
shader_type spatial;
render_mode blend_mix, depth_draw_opaque, cull_back, specular_schlick_ggx;

uniform sampler2D tex_sand : source_color, filter_linear_mipmap, repeat_enable;
uniform sampler2D tex_pebble : source_color, filter_linear_mipmap, repeat_enable;
uniform sampler2D norm_sand : hint_normal, filter_linear_mipmap, repeat_enable;
uniform float wetness = 0.0;
uniform float snow_cover = 0.0;

varying vec3 wpos;
varying vec3 wnrm;

float hash21(vec2 p) {
	p = fract(p * vec2(127.1, 311.7));
	p += dot(p, p + 34.56);
	return fract(p.x * p.y);
}

float vnoise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	f = f * f * (3.0 - 2.0 * f);
	return mix(
		mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
		mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x),
		f.y
	);
}

void vertex() {
	wpos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	wnrm = normalize((MODEL_MATRIX * vec4(NORMAL, 0.0)).xyz);
}

void fragment() {
	// Dual rotated world-space UVs completely eliminate tiling grid patterns on broad sand beaches
	vec2 uv_a = wpos.xz * 0.16;
	vec2 uv_b = vec2(wpos.x * 0.78 - wpos.z * 0.62, wpos.x * 0.62 + wpos.z * 0.78) * 0.23 + vec2(0.37, 0.61);
	vec2 uv_fine = wpos.xz * 0.82;

	float n_macro = vnoise(wpos.xz * 0.14) * 0.60 + vnoise(wpos.xz * 0.36) * 0.40;
	float n_mid = vnoise(wpos.xz * 0.92) * 0.58 + vnoise(wpos.xz * 2.35) * 0.42;
	float n_grain = vnoise(wpos.xz * 7.5);

	// Subtle wind-carved sand ripples on dry upper dunes & beach
	float wind_rip = sin(dot(wpos.xz, vec2(0.28, 0.96)) * 5.2 + n_macro * 3.8) * 0.5 + 0.5;

	vec3 s_tex = mix(texture(tex_sand, uv_a).rgb, texture(tex_sand, uv_b).rgb, 0.48);
	// Warm sunlit golden-ochre coastal beach sand (rich warm tone under bright midday sun, never pale white!)
	vec3 sand_light = vec3(0.49, 0.39, 0.25);
	vec3 sand_deep  = vec3(0.38, 0.30, 0.19);
	vec3 dry_sand = mix(sand_deep, sand_light, n_macro) * mix(vec3(0.76), vec3(1.10), s_tex);
	dry_sand *= mix(0.94, 1.05, wind_rip * (1.0 - COLOR.r));

	// Compacted camp sand & subtle foot-traffic tracks
	vec3 camp_sand = dry_sand * vec3(0.84, 0.80, 0.74);

	// Coastal pebble, shell grit & weathered wrack-fringe gravel
	vec3 peb_tex = mix(texture(tex_pebble, uv_b * 1.45).rgb, texture(tex_pebble, uv_fine * 0.55).rgb, 0.42);
	vec3 gravel_col = peb_tex * mix(vec3(0.56, 0.51, 0.42), vec3(0.68, 0.62, 0.51), n_grain);

	// Steep upper backshore cliff/bluff sandstone slope blend
	float slope_rock = smoothstep(0.88, 0.62, wnrm.y);
	vec3 bluff_col = peb_tex * vec3(0.54, 0.47, 0.38);

	float pebble_w = clamp(COLOR.g * smoothstep(0.22, 0.78, n_mid + COLOR.g * 0.35), 0.0, 0.85);
	vec3 alb = mix(dry_sand, camp_sand, clamp(COLOR.b * (0.65 + n_mid * 0.35), 0.0, 0.82));
	alb = mix(alb, gravel_col, pebble_w * 0.76);
	alb = mix(alb, bluff_col, slope_rock * 0.88);

	// Smooth organic moisture gradient into darker damp swash sand & submerged seabed (ZERO rectangular block!)
	float moist_raw = COLOR.r + (n_mid - 0.5) * 0.14 + (n_macro - 0.5) * 0.08;
	float moist_w = smoothstep(0.08, 0.86, moist_raw);
	vec3 wet_sand = alb * mix(vec3(0.58, 0.54, 0.48), vec3(0.42, 0.45, 0.44), smoothstep(0.55, 1.0, moist_w));
	alb = mix(alb, wet_sand, moist_w);

	// Tiny bleached shell & quartz specks near tidal wrack
	float shell_fleck = smoothstep(0.87, 0.96, n_grain) * smoothstep(0.12, 0.55, COLOR.g + COLOR.r * 0.4) * (1.0 - smoothstep(0.65, 0.92, COLOR.r));
	alb = mix(alb, vec3(0.74, 0.69, 0.58), shell_fleck * 0.38);

	// Rain / snow climate response
	alb = mix(alb, alb * vec3(0.64, 0.68, 0.74), wetness * 0.82);
	alb = mix(alb, vec3(0.80, 0.84, 0.88), snow_cover * clamp(0.45 + n_mid * 0.25 - moist_w * 0.35, 0.08, 0.56));

	// Matte dry sand (0.92..0.96) -> smooth controlled satin wet swash (0.34..0.46, NO zigzag glare!)
	float base_r = mix(0.94, 0.88, pebble_w * 0.5 + slope_rock * 0.4);
	base_r = mix(base_r, 0.38, moist_w);
	float rain_r = mix(base_r, max(0.24, base_r * 0.46), wetness);
	ROUGHNESS = mix(rain_r, 0.85, snow_cover * 0.65);
	METALLIC = 0.01;
	SPECULAR = mix(0.18, 0.44, max(moist_w, wetness * 0.8));

	// Very soft sand normal map (eliminates zigzag specular streaks on wet sand!)
	vec3 n1 = texture(norm_sand, uv_a * 1.4).rgb;
	vec3 n2 = texture(norm_sand, uv_b * 1.6).rgb;
	NORMAL_MAP = mix(n1, n2, 0.5);
	NORMAL_MAP_DEPTH = mix(0.32, 0.14, moist_w) + slope_rock * 0.44;
	ALBEDO = alb;
}
"""
	var mat := ShaderMaterial.new()
	mat.shader = sh
	var t_sand := MatKit.load_tex("earth.webp")
	if t_sand == null:
		t_sand = MatKit.load_tex("limestone-v3.webp")
	var t_peb := MatKit.load_tex("coastal-rock.png")
	if t_peb == null:
		t_peb = MatKit.load_tex("earth.webp")
	var n_sand := MatKit.make_organic_normal("cloth", 128)
	if t_sand: mat.set_shader_parameter("tex_sand", t_sand)
	if t_peb: mat.set_shader_parameter("tex_pebble", t_peb)
	if n_sand: mat.set_shader_parameter("norm_sand", n_sand)
	if exposed:
		MatKit._exposed_shaders.append(mat)
	return mat

# ==============================================================================
# 3. STRATIFIED BASALT CLIFF + ASTRONOMICAL RUIN TERRAIN SHADER (Phase 3)
# ==============================================================================
## Vertex color contract:
## - COLOR.r = ancient carved astronomical ruin plaza / flagstones (0..1)
## - COLOR.g = highland lichen / alpine moss & crevice grass (0..1)
## - COLOR.b = worn camp dust / gravel path (0..1)
static func create_cliff_basalt_shader(exposed: bool = true) -> ShaderMaterial:
	var sh := Shader.new()
	sh.code = """
shader_type spatial;
render_mode blend_mix, depth_draw_opaque, cull_back, specular_schlick_ggx;

uniform sampler2D tex_basalt : source_color, filter_linear_mipmap, repeat_enable;
uniform sampler2D tex_flagstone : source_color, filter_linear_mipmap, repeat_enable;
uniform sampler2D tex_moss : source_color, filter_linear_mipmap, repeat_enable;
uniform sampler2D norm_rock : hint_normal, filter_linear_mipmap, repeat_enable;
uniform float wetness = 0.0;
uniform float snow_cover = 0.0;

varying vec3 wpos;
varying vec3 wnrm;

float hash21(vec2 p) {
	p = fract(p * vec2(127.1, 311.7));
	p += dot(p, p + 34.56);
	return fract(p.x * p.y);
}

float vnoise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	f = f * f * (3.0 - 2.0 * f);
	return mix(
		mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
		mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x),
		f.y
	);
}

void vertex() {
	wpos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	wnrm = normalize((MODEL_MATRIX * vec4(NORMAL, 0.0)).xyz);
}

void fragment() {
	vec3 an = abs(wnrm);
	vec3 tri = pow(an, vec3(4.0));
	tri /= max(0.0001, tri.x + tri.y + tri.z);

	// Triplanar basalt sampling so sheer cliff walls never stretch vertically!
	vec2 uv_y = wpos.xz * 0.22;
	vec2 uv_x = vec2(wpos.z * 0.19, wpos.y * 0.28);
	vec2 uv_z = vec2(wpos.x * 0.19, wpos.y * 0.28);

	vec3 b_y = texture(tex_basalt, uv_y).rgb;
	vec3 b_x = texture(tex_basalt, uv_x).rgb;
	vec3 b_z = texture(tex_basalt, uv_z).rgb;
	vec3 basalt_tex = b_x * tri.x + b_y * tri.y + b_z * tri.z;

	float n_macro = vnoise(wpos.xz * 0.16) * 0.60 + vnoise(wpos.xz * 0.42) * 0.40;
	float n_detail = vnoise(wpos.xz * 1.35) * 0.55 + vnoise(wpos.xz * 3.4) * 0.45;

	// Horizontal geological strata + vertical columnar fracture grooves on cliff faces
	float steep = smoothstep(0.76, 0.34, wnrm.y);
	float strata = sin(wpos.y * 2.4 + vnoise(vec2(wpos.x * 0.18, wpos.z * 0.18)) * 3.6) * 0.5 + 0.5;
	float col_seam = abs(sin((wpos.x + wpos.z * 0.7) * 1.45 + vnoise(wpos.xz * 0.4) * 1.8));
	float cliff_shade = mix(0.74, 1.14, strata) * mix(0.84, 1.06, smoothstep(0.0, 0.32, col_seam));
	// Deepen lower abyssal cliff walls smoothly while keeping upper ridges crisp and readable
	float depth_ao = mix(0.54, 1.04, smoothstep(-14.0, 0.5, wpos.y));

	vec3 bedrock = basalt_tex * mix(vec3(0.56, 0.61, 0.67), vec3(0.70, 0.74, 0.78), n_macro);
	vec3 cliff_col = bedrock * cliff_shade * depth_ao * vec3(0.92, 0.95, 1.0);
	vec3 col = mix(bedrock, cliff_col, steep);

	// Weathered carved ruin flagstones & engraved astronomical circle on upper plateau (harmonized in value with basalt cliff, ZERO bright spotlight disk!)
	vec2 rel_a = wpos.xz - vec2(19.0, 12.6);
	float r_a = length(rel_a);
	float ang_a = atan(rel_a.y, rel_a.x);
	float edge_break = (vnoise(vec2(ang_a * 4.2 + 1.3, r_a * 0.55)) - 0.5) * 0.44 + (n_macro - 0.5) * 0.38;
	vec3 flag_tex = texture(tex_flagstone, wpos.xz * 0.34).rgb;
	vec3 ruin_col = flag_tex * mix(vec3(0.42, 0.43, 0.44), vec3(0.54, 0.52, 0.48), n_macro);
	// Radial stone paving blocks & concentric carved joints inside the sanctuary circle
	float ring_joint = 1.0 - smoothstep(0.015, 0.055, abs(fract(r_a * 0.56) - 0.5));
	float spoke_joint = pow(max(0.0, abs(cos(ang_a * 8.0))), 38.0) * smoothstep(1.2, 1.8, r_a) * (1.0 - smoothstep(6.2, 6.7, r_a));
	ruin_col *= mix(1.0, 0.76, max(ring_joint * 0.55, spoke_joint * 0.55));
	float ruin_w = smoothstep(0.24, 0.76, COLOR.r + edge_break) * (1.0 - steep);
	col = mix(col, ruin_col, ruin_w * 0.88);

	// Carved recessed astronomical compass rings & patinated antique bronze inlays (centered at x=19.0, z=12.6)
	float ring1 = 1.0 - smoothstep(0.03, 0.10, abs(r_a - 2.35));
	float ring2 = 1.0 - smoothstep(0.03, 0.11, abs(r_a - 4.45));
	float ring3 = 1.0 - smoothstep(0.04, 0.14, abs(r_a - 6.20));
	float spoke = pow(max(0.0, abs(cos(ang_a * 4.0))), 30.0) * smoothstep(0.85, 1.35, r_a) * (1.0 - smoothstep(5.95, 6.35, r_a));
	float tick_ring = pow(max(0.0, abs(cos(ang_a * 16.0))), 20.0) * smoothstep(4.15, 4.30, r_a) * (1.0 - smoothstep(4.65, 4.82, r_a));
	float inlay_wear = smoothstep(0.18, 0.64, n_detail + 0.24);
	float inlay_mask = clamp(max(max(ring1, ring2), max(ring3, max(spoke * 0.88, tick_ring * 0.72))) * inlay_wear * ruin_w, 0.0, 1.0);
	vec3 patinated_bronze = vec3(0.74, 0.58, 0.32);
	col = mix(col, patinated_bronze, inlay_mask * 0.82);

	// Highland moss / hardy lichen pockets in sheltered crevices & rocky edges
	vec3 moss_tex = texture(tex_moss, wpos.xz * 0.32).rgb;
	vec3 lichen_col = moss_tex * mix(vec3(0.46, 0.55, 0.42), vec3(0.62, 0.66, 0.50), n_detail);
	float moss_w = smoothstep(0.24, 0.76, COLOR.g + (n_macro - 0.5) * 0.32) * smoothstep(0.45, 0.86, wnrm.y);
	col = mix(col, lichen_col, moss_w * 0.68);

	// Pale coastal gravel / dust pockets around camp shelter & hearth
	vec3 dust_col = bedrock * vec3(1.12, 1.08, 0.98);
	float dust_w = smoothstep(0.24, 0.78, COLOR.b + (n_detail - 0.5) * 0.25) * (1.0 - steep);
	col = mix(col, dust_col, dust_w * 0.45);

	// Weather modulation
	col = mix(col, col * vec3(0.68, 0.72, 0.78), wetness * 0.80);
	col = mix(col, vec3(0.84, 0.88, 0.93), snow_cover * clamp(0.48 + n_detail * 0.26, 0.14, 0.66) * smoothstep(0.35, 0.85, wnrm.y));

	float base_r = mix(0.86, 0.78, ruin_w);
	base_r = mix(base_r, 0.44, inlay_mask);
	base_r = mix(base_r, 0.92, moss_w * 0.6);
	float rain_r = mix(base_r, max(0.22, base_r * 0.42), wetness);
	ROUGHNESS = mix(rain_r, 0.84, snow_cover * 0.65);
	METALLIC = mix(0.04, 0.48, inlay_mask);
	SPECULAR = mix(0.36, 0.60, inlay_mask + wetness * 0.2);

	vec3 nx = texture(norm_rock, uv_x * 1.4).rgb;
	vec3 ny = texture(norm_rock, uv_y * 1.4).rgb;
	vec3 nz = texture(norm_rock, uv_z * 1.4).rgb;
	NORMAL_MAP = nx * tri.x + ny * tri.y + nz * tri.z;
	NORMAL_MAP_DEPTH = mix(0.56, 0.78, steep);
	ALBEDO = col;
}
"""
	var mat := ShaderMaterial.new()
	mat.shader = sh
	var t_bas := MatKit.load_tex("basalt-coastal-albedo-v1.webp")
	var t_flg := MatKit.load_tex("flagstone.webp")
	if t_flg == null: t_flg = MatKit.load_tex("ashlar-v4.webp")
	var t_mos := MatKit.load_tex("moss.jpg")
	var n_rck := MatKit.load_tex("rock-normal-v1.png")
	if t_bas: mat.set_shader_parameter("tex_basalt", t_bas)
	if t_flg: mat.set_shader_parameter("tex_flagstone", t_flg)
	if t_mos: mat.set_shader_parameter("tex_moss", t_mos)
	if n_rck: mat.set_shader_parameter("norm_rock", n_rck)
	if exposed:
		MatKit._exposed_shaders.append(mat)
	return mat

# ==============================================================================
# 4. COVE + COASTAL TRAIL + SEA-CAVE FLOOR TERRAIN SHADER (Phase 4)
# ==============================================================================
## Vertex color contract:
## - COLOR.r = coastal trail dirt/stone steps (0..1)
## - COLOR.g = cove warm sand / gravel beach (0..1)
## - COLOR.b = damp water/tidepool/seepage wetness (0..1)
## - COLOR.a = interior cave shelter mask (1.0 = sheltered interior rock floor, immune to rain/snow!)
static func create_cove_cave_terrain_shader(exposed: bool = true) -> ShaderMaterial:
	var sh := Shader.new()
	sh.code = """
shader_type spatial;
render_mode blend_mix, depth_draw_opaque, cull_back, specular_schlick_ggx;

uniform sampler2D tex_rock : source_color, filter_linear_mipmap, repeat_enable;
uniform sampler2D tex_sand : source_color, filter_linear_mipmap, repeat_enable;
uniform sampler2D tex_trail : source_color, filter_linear_mipmap, repeat_enable;
uniform sampler2D tex_moss : source_color, filter_linear_mipmap, repeat_enable;
uniform sampler2D norm_rock : hint_normal, filter_linear_mipmap, repeat_enable;
uniform float wetness = 0.0;
uniform float snow_cover = 0.0;

varying vec3 wpos;
varying vec3 wnrm;

float hash21(vec2 p) {
	p = fract(p * vec2(127.1, 311.7));
	p += dot(p, p + 34.56);
	return fract(p.x * p.y);
}

float vnoise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	f = f * f * (3.0 - 2.0 * f);
	return mix(
		mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
		mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x),
		f.y
	);
}

void vertex() {
	wpos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	wnrm = normalize((MODEL_MATRIX * vec4(NORMAL, 0.0)).xyz);
}

void fragment() {
	vec3 an = abs(wnrm);
	vec3 tri = pow(an, vec3(4.0));
	tri /= max(0.0001, tri.x + tri.y + tri.z);

	vec2 uv_y = wpos.xz * 0.22;
	vec2 uv_x = vec2(wpos.z * 0.22, wpos.y * 0.26);
	vec2 uv_z = vec2(wpos.x * 0.22, wpos.y * 0.26);

	float n_macro = vnoise(wpos.xz * 0.18) * 0.60 + vnoise(wpos.xz * 0.45) * 0.40;
	float n_detail = vnoise(wpos.xz * 1.45) * 0.56 + vnoise(wpos.xz * 3.6) * 0.44;
	float steep = smoothstep(0.78, 0.38, wnrm.y);

	// 1) Coastal cliff rock & dry cave floor rock
	vec3 r_tri = texture(tex_rock, uv_x).rgb * tri.x + texture(tex_rock, uv_y).rgb * tri.y + texture(tex_rock, uv_z).rgb * tri.z;
	vec3 cliff_ext = r_tri * mix(vec3(0.68, 0.67, 0.61), vec3(0.82, 0.79, 0.72), n_macro);
	vec3 cave_floor = r_tri * mix(vec3(0.56, 0.54, 0.50), vec3(0.68, 0.64, 0.58), n_detail);

	// 2) Warm golden-ochre cove beach sand & pebbles (calibrated for ACES midday sun!)
	vec3 s_tex = mix(texture(tex_sand, uv_y * 0.85).rgb, texture(tex_sand, uv_y * 1.32 + vec2(0.37, 0.51)).rgb, 0.45);
	vec3 cove_sand = mix(vec3(0.41, 0.33, 0.22), vec3(0.54, 0.44, 0.30), n_macro) * mix(vec3(0.78), vec3(1.12), s_tex);

	// 3) Compacted warm earth & stone coastal path curving down from upper ridge
	vec3 t_tex = texture(tex_trail, uv_y * 1.15).rgb;
	vec3 trail_col = t_tex * mix(vec3(0.56, 0.47, 0.36), vec3(0.68, 0.58, 0.45), n_detail);

	// 4) Coastal bluff moss & grass patches on upper flat ledges
	vec3 m_tex = texture(tex_moss, uv_y * 1.1).rgb;
	vec3 bluff_moss = m_tex * mix(vec3(0.46, 0.60, 0.36), vec3(0.60, 0.72, 0.44), n_macro);

	float cave_mask = smoothstep(0.25, 0.75, COLOR.a);
	float sand_w = smoothstep(0.15, 0.78, COLOR.g + (n_detail - 0.5) * 0.22) * (1.0 - steep);
	float trail_w = smoothstep(0.20, 0.75, COLOR.r + (n_detail - 0.5) * 0.18) * (1.0 - steep);
	float top_grass = smoothstep(1.35, 2.8, wpos.y) * smoothstep(0.62, 0.88, wnrm.y) * (1.0 - trail_w) * (1.0 - cave_mask);

	vec3 col = mix(cliff_ext, cave_floor, cave_mask);
	col = mix(col, bluff_moss, top_grass * 0.72);
	col = mix(col, cove_sand, sand_w);
	col = mix(col, trail_col, trail_w);

	// Damp shoreline sand, tidepool basins & wet eastern spring seepage
	float damp_w = smoothstep(0.12, 0.82, COLOR.b + (n_detail - 0.5) * 0.14);
	col = mix(col, col * vec3(0.56, 0.59, 0.58), damp_w * 0.82);

	// Weather affects ONLY exterior areas (sheltered cave chambers stay dry!)
	float ext_exposure = 1.0 - cave_mask;
	float eff_wet = wetness * ext_exposure;
	float eff_snow = snow_cover * ext_exposure * smoothstep(0.40, 0.82, wnrm.y);
	col = mix(col, col * vec3(0.66, 0.70, 0.75), eff_wet * 0.80);
	col = mix(col, vec3(0.84, 0.88, 0.92), eff_snow * clamp(0.45 + n_detail * 0.25, 0.14, 0.60));

	float base_r = mix(0.88, 0.92, sand_w);
	base_r = mix(base_r, 0.26, damp_w);
	float rain_r = mix(base_r, max(0.20, base_r * 0.42), eff_wet);
	ROUGHNESS = mix(rain_r, 0.84, eff_snow * 0.65);
	METALLIC = 0.03;
	SPECULAR = mix(0.28, 0.54, max(damp_w, eff_wet));

	vec3 nx = texture(norm_rock, uv_x * 1.35).rgb;
	vec3 ny = texture(norm_rock, uv_y * 1.35).rgb;
	vec3 nz = texture(norm_rock, uv_z * 1.35).rgb;
	NORMAL_MAP = nx * tri.x + ny * tri.y + nz * tri.z;
	NORMAL_MAP_DEPTH = mix(0.54, 0.20, sand_w * (1.0 - steep));
	ALBEDO = col;
}
"""
	var mat := ShaderMaterial.new()
	mat.shader = sh
	var t_rck := MatKit.load_tex("a1-cliff-organic-v7.png")
	if t_rck == null: t_rck = MatKit.load_tex("coastal-rock.png")
	var t_snd := MatKit.load_tex("earth.webp")
	if t_snd == null: t_snd = MatKit.load_tex("limestone-v3.webp")
	var t_trl := MatKit.load_tex("path.jpg")
	if t_trl == null: t_trl = MatKit.load_tex("earth.webp")
	var t_mos := MatKit.load_tex("moss.jpg")
	var n_rck := MatKit.load_tex("rock-normal-v1.png")
	if t_rck: mat.set_shader_parameter("tex_rock", t_rck)
	if t_snd: mat.set_shader_parameter("tex_sand", t_snd)
	if t_trl: mat.set_shader_parameter("tex_trail", t_trl)
	if t_mos: mat.set_shader_parameter("tex_moss", t_mos)
	if n_rck: mat.set_shader_parameter("norm_rock", n_rck)
	if exposed:
		MatKit._exposed_shaders.append(mat)
	return mat

# ==============================================================================
# 5. CONTINUOUS OCEAN MESH BUILDER WITH DEPTH & ROCK-FOAM BAKING
# ==============================================================================
static func build_coastal_ocean_mesh(
	parent: Node3D,
	node_name: String,
	x_min: float,
	x_max: float,
	z_min: float,
	z_max: float,
	nx: int,
	nz: int,
	water_y: float,
	seabed_fn: Callable,
	foam_sources: Array, # Array of Vector3(x, z, radius)
	calm_fn: Callable,
	mat: Material
) -> MeshInstance3D:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var pts: Array = []
	var cols: Array = []
	for iz in range(nz + 1):
		var vz := lerpf(z_min, z_max, float(iz) / float(nz))
		var p_row: Array[Vector3] = []
		var c_row: Array[Color] = []
		for ix in range(nx + 1):
			var vx := lerpf(x_min, x_max, float(ix) / float(nx))
			var bed_y := float(seabed_fn.call(vx, vz))
			var depth_m := maxf(0.0, water_y - bed_y)
			var norm_depth := clampf(depth_m / 2.6, 0.0, 1.0)
			var rock_foam := 0.0
			for fs in foam_sources:
				var fv: Vector3 = fs
				var dist := Vector2(vx - fv.x, vz - fv.y).length()
				if dist < fv.z * 2.1:
					rock_foam = maxf(rock_foam, 1.0 - smoothstep(fv.z * 0.45, fv.z * 1.95, dist))
			var calm_v := float(calm_fn.call(vx, vz)) if calm_fn.is_valid() else 0.0
			p_row.append(Vector3(vx, water_y, vz))
			c_row.append(Color(norm_depth, clampf(rock_foam, 0.0, 1.0), clampf(calm_v, 0.0, 1.0), 1.0))
		pts.append(p_row)
		cols.append(c_row)

	for iz in range(nz):
		for ix in range(nx):
			var a: Vector3 = pts[iz][ix]
			var b: Vector3 = pts[iz][ix + 1]
			var c: Vector3 = pts[iz + 1][ix + 1]
			var d: Vector3 = pts[iz + 1][ix]
			var ca: Color = cols[iz][ix]
			var cb: Color = cols[iz][ix + 1]
			var cc: Color = cols[iz + 1][ix + 1]
			var cd: Color = cols[iz + 1][ix]
			# Skip quads completely inland where all 4 corners have zero depth
			if ca.r <= 0.0001 and cb.r <= 0.0001 and cc.r <= 0.0001 and cd.r <= 0.0001:
				continue
			st.set_normal(Vector3.UP); st.set_color(ca); st.set_uv(Vector2(a.x * 0.1, a.z * 0.1)); st.add_vertex(a)
			st.set_normal(Vector3.UP); st.set_color(cb); st.set_uv(Vector2(b.x * 0.1, b.z * 0.1)); st.add_vertex(b)
			st.set_normal(Vector3.UP); st.set_color(cc); st.set_uv(Vector2(c.x * 0.1, c.z * 0.1)); st.add_vertex(c)
			st.set_normal(Vector3.UP); st.set_color(ca); st.set_uv(Vector2(a.x * 0.1, a.z * 0.1)); st.add_vertex(a)
			st.set_normal(Vector3.UP); st.set_color(cc); st.set_uv(Vector2(c.x * 0.1, c.z * 0.1)); st.add_vertex(c)
			st.set_normal(Vector3.UP); st.set_color(cd); st.set_uv(Vector2(d.x * 0.1, d.z * 0.1)); st.add_vertex(d)

	var mi := MeshInstance3D.new()
	mi.name = node_name
	mi.mesh = st.commit()
	mi.material_override = mat
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parent.add_child(mi)
	return mi

# ==============================================================================
# 6. SHARED LAYERED ROCK OUTCROP & MULTIMESH MATERIAL HELPERS
# ==============================================================================
static func make_multimesh_rock_mat(tex_name: String, tint: Color, roughness: float = 0.86, uv_scale: float = 0.45, exposed: bool = true) -> StandardMaterial3D:
	var mat := MatKit.make_textured_mat(tex_name, tint, roughness, "rock", Vector3(uv_scale, uv_scale, uv_scale), true, exposed)
	mat.vertex_color_use_as_albedo = true
	mat.vertex_color_is_srgb = true
	return mat

static func make_multimesh_wood_mat(tint: Color, exposed: bool = true) -> StandardMaterial3D:
	var mat := MatKit.make_wood_mat(tint, exposed)
	mat.vertex_color_use_as_albedo = true
	mat.vertex_color_is_srgb = true
	return mat

static func append_rock_cluster_mm(
	env_kit: EnvKit,
	mm_keys: Array[String],
	center: Vector3,
	base_scale: Vector3,
	yaw: float,
	seed_v: float,
	sub_count: int = 3,
	color_tint: Color = Color(1.0, 1.0, 1.0, 1.0)
) -> void:
	if mm_keys.is_empty():
		return
	var k0: String = mm_keys[posmod(int(absf(seed_v) * 7.0), mm_keys.size())]
	var b0 := Basis.from_euler(Vector3(sin(seed_v) * 0.08, yaw, cos(seed_v * 1.3) * 0.08)).scaled_local(base_scale)
	env_kit.append_multimesh(k0, Transform3D(b0, center), color_tint)
	for i in range(1, sub_count):
		var a := yaw + float(i) * (TAU / float(max(2, sub_count - 1))) + sin(seed_v + float(i) * 1.9) * 0.45
		var dist_f := 0.42 + fmod(absf(seed_v * 0.73 + float(i) * 0.37), 0.32)
		var off := Vector3(cos(a) * base_scale.x * dist_f, -base_scale.y * (0.14 + float(i % 2) * 0.10), sin(a) * base_scale.z * dist_f)
		var sc_f := lerpf(0.68, 0.42, float(i) / float(max(2, sub_count)))
		var sub_sc := Vector3(base_scale.x * sc_f * (0.85 + fmod(float(i) * 0.31, 0.35)), base_scale.y * sc_f * (0.72 + fmod(float(i) * 0.27, 0.38)), base_scale.z * sc_f * (0.88 + fmod(float(i) * 0.19, 0.28)))
		var ki: String = mm_keys[posmod(int(absf(seed_v) * 5.0) + i, mm_keys.size())]
		var bi := Basis.from_euler(Vector3(sin(a) * 0.14, a + float(i) * 0.7, cos(a) * 0.12)).scaled_local(sub_sc)
		var tint_i := color_tint.darkened(0.04 * float(i % 2)) if i % 2 == 1 else color_tint.lightened(0.04)
		env_kit.append_multimesh(ki, Transform3D(bi, center + off), tint_i)

static func add_oriented_cyl(parent: Node3D, a: Vector3, b: Vector3, r_bot: float, r_top: float, mat: Material, segs: int = 7, cast_sh: bool = true, node_name: String = "") -> MeshInstance3D:
	var d := b - a
	var length := d.length()
	if length < 0.02:
		return null
	var y_ax := d / length
	var ref := Vector3.UP if absf(y_ax.y) < 0.94 else Vector3.FORWARD
	var x_ax := ref.cross(y_ax).normalized()
	var z_ax := x_ax.cross(y_ax).normalized()
	var mi := MeshInstance3D.new()
	if node_name != "":
		mi.name = node_name
	var cm := CylinderMesh.new()
	cm.bottom_radius = r_bot; cm.top_radius = r_top; cm.height = length; cm.radial_segments = segs
	mi.mesh = cm
	mi.material_override = mat
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON if cast_sh else GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	mi.transform = Transform3D(Basis(x_ax, y_ax, z_ax), (a + b) * 0.5)
	parent.add_child(mi)
	return mi
