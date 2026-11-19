class_name CampMaterialKit
extends RefCounted

## Shared PBR material library, procedural normal maps, cellular foam texture,
## rock weathering vertex colors, and climate surface deposition (wetness/snow)
## migrated from camp-detail-kit.ts and camp-surface-effects.ts.

const TEX_DIR := "res://assets/textures/"

static var _tex_cache: Dictionary = {}
static var _proc_cache: Dictionary = {}
static var _exposed_mats: Array[StandardMaterial3D] = []
static var _exposed_shaders: Array[ShaderMaterial] = []
static var _exposed_base: Dictionary = {}

static func reset_registry() -> void:
	_exposed_mats.clear()
	_exposed_shaders.clear()
	_exposed_base.clear()

static func load_tex(filename: String) -> Texture2D:
	if _tex_cache.has(filename):
		return _tex_cache[filename]
	var path := TEX_DIR + filename
	if ResourceLoader.exists(path):
		var tex := load(path) as Texture2D
		if tex:
			_tex_cache[filename] = tex
			return tex
	# Fallback load from image file if not yet imported in headless mode
	if FileAccess.file_exists(path):
		var img := Image.load_from_file(path)
		if img:
			var itex := ImageTexture.create_from_image(img)
			_tex_cache[filename] = itex
			return itex
	return null

static func make_cellular_foam_texture(size: int = 128) -> Texture2D:
	var key := "foam_%d" % size
	if _proc_cache.has(key):
		return _proc_cache[key]
	var img := Image.create(size, size, false, Image.FORMAT_RGBA8)
	for y in range(size):
		for x in range(size):
			var u := float(x) / float(size)
			var v := float(y) / float(size)
			var w1 := sin(u * TAU * 4.0 + cos(v * TAU * 3.0) * 1.1)
			var w2 := cos(v * TAU * 6.0 - sin(u * TAU * 5.0) * 0.9)
			var w3 := sin((u + v) * TAU * 8.0) * 0.45
			var n := clampf(0.5 + 0.25 * w1 + 0.18 * w2 + 0.12 * w3, 0.0, 1.0)
			var alpha := smoothstep(0.42, 0.88, n)
			img.set_pixel(x, y, Color(0.92, 0.96, 0.98, alpha * 0.86))
	var tex := ImageTexture.create_from_image(img)
	_proc_cache[key] = tex
	return tex

static func make_procedural_normal(kind: String, size: int = 128) -> Texture2D:
	var key := "norm_%s_%d" % [kind, size]
	if _proc_cache.has(key):
		return _proc_cache[key]
	var img := Image.create(size, size, false, Image.FORMAT_RGBA8)
	for y in range(size):
		for x in range(size):
			var u := float(x) / float(size)
			var v := float(y) / float(size)
			var gx := 0.0
			var gy := 0.0
			match kind:
				"timber":
					gx = sin(u * TAU * 18.0 + sin(v * TAU * 2.0) * 1.5) * 0.22
					gy = sin(v * TAU * 4.0) * 0.06
				"cloth":
					gx = sin(u * TAU * 24.0) * 0.12
					gy = cos(v * TAU * 24.0) * 0.12
				"water":
					gx = cos(u * TAU * 5.0 + v * TAU * 3.0) * 0.20 + sin(u * TAU * 9.0) * 0.08
					gy = sin(v * TAU * 6.0 - u * TAU * 4.0) * 0.20
				_:
					gx = cos(u * TAU * 6.0 + sin(v * TAU * 5.0)) * 0.28 + cos(u * TAU * 13.0) * 0.10
					gy = sin(v * TAU * 6.0 + cos(u * TAU * 4.0)) * 0.28 + sin(v * TAU * 11.0) * 0.10
			var n := Vector3(-gx, -gy, 1.0).normalized()
			img.set_pixel(x, y, Color(n.x * 0.5 + 0.5, n.y * 0.5 + 0.5, n.z * 0.5 + 0.5, 1.0))
	var tex := ImageTexture.create_from_image(img)
	_proc_cache[key] = tex
	return tex

static func register_exposed(mat: StandardMaterial3D) -> StandardMaterial3D:
	if not _exposed_mats.has(mat):
		_exposed_mats.append(mat)
		_exposed_base[mat.get_instance_id()] = {
			"albedo": mat.albedo_color,
			"roughness": mat.roughness,
			"metallic": mat.metallic,
		}
	return mat

static func apply_weather_response(wetness: float, snow_cover: float) -> void:
	for mat in _exposed_mats:
		if not is_instance_valid(mat):
			continue
		var base: Dictionary = _exposed_base.get(mat.get_instance_id(), {})
		if base.is_empty():
			continue
		var base_col: Color = base["albedo"]
		var base_rough: float = float(base["roughness"])
		# Wet surfaces darken slightly and turn glossier
		var darkened := base_col.lerp(base_col * Color(0.68, 0.72, 0.78, 1.0), wetness * 0.85)
		# Snowfrost blends softly towards cold off-white
		mat.albedo_color = darkened.lerp(Color(0.86, 0.90, 0.94, base_col.a), snow_cover * 0.52)
		var wet_rough := lerpf(base_rough, maxf(0.18, base_rough * 0.36), wetness)
		mat.roughness = lerpf(wet_rough, 0.84, snow_cover * 0.65)
	for smat in _exposed_shaders:
		if not is_instance_valid(smat):
			continue
		smat.set_shader_parameter("wetness", wetness)
		smat.set_shader_parameter("snow_cover", snow_cover)

static func make_textured_mat(
	tex_name: String,
	tint: Color,
	roughness: float = 0.85,
	normal_kind: String = "rock",
	uv_scale: Vector3 = Vector3(1.0, 1.0, 1.0),
	triplanar: bool = false,
	exposed: bool = true
) -> StandardMaterial3D:
	var mat := StandardMaterial3D.new()
	mat.albedo_color = tint
	mat.roughness = roughness
	mat.metallic = 0.04
	var tex := load_tex(tex_name)
	if tex:
		mat.albedo_texture = tex
	if triplanar:
		mat.uv1_triplanar = true
		mat.uv1_world_triplanar = true
		mat.uv1_scale = uv_scale
	else:
		mat.uv1_scale = uv_scale

	var norm_tex: Texture2D = null
	if normal_kind == "rock":
		norm_tex = load_tex("rock-normal-v1.png")
	elif normal_kind == "timber":
		norm_tex = load_tex("wood-normal-v1.png")
	elif normal_kind == "metal":
		norm_tex = load_tex("metal-normal-v1.png")
	if norm_tex == null and normal_kind != "":
		norm_tex = make_procedural_normal(normal_kind)
	if norm_tex:
		mat.normal_enabled = true
		mat.normal_texture = norm_tex
		mat.normal_scale = 0.45 if normal_kind != "cloth" else 0.25

	if exposed:
		register_exposed(mat)
	return mat

static func make_cloth_mat(tint: Color, double_sided: bool = true, exposed: bool = true) -> StandardMaterial3D:
	var mat := make_textured_mat("linen-v4.webp", tint, 0.88, "cloth", Vector3(2.2, 2.2, 2.2), false, exposed)
	if double_sided:
		mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	return mat

static func make_wood_mat(tint: Color = Color("#8a6646"), exposed: bool = false) -> StandardMaterial3D:
	return make_textured_mat("oak-v4.webp", tint, 0.78, "timber", Vector3(1.5, 1.5, 1.5), false, exposed)

static func make_bronze_mat(tint: Color = Color("#6f5e48")) -> StandardMaterial3D:
	var mat := StandardMaterial3D.new()
	mat.albedo_color = tint
	mat.metallic = 0.72
	mat.roughness = 0.34
	mat.rim_enabled = true
	mat.rim = 0.35
	mat.rim_tint = 0.45
	var n := load_tex("metal-normal-v1.png")
	if n:
		mat.normal_enabled = true
		mat.normal_texture = n
		mat.normal_scale = 0.38
	return mat

static func make_leather_mat(tint: Color = Color("#543926"), exposed: bool = true) -> StandardMaterial3D:
	var mat := make_textured_mat("oak-v4.webp", tint, 0.54, "timber", Vector3(1.6, 1.6, 1.6), false, exposed)
	mat.specular_mode = BaseMaterial3D.SPECULAR_SCHLICK_GGX
	mat.rim_enabled = true
	mat.rim = 0.22
	mat.rim_tint = 0.30
	return mat

static func make_glow_mat(color: Color, energy: float = 2.0) -> StandardMaterial3D:
	var mat := StandardMaterial3D.new()
	mat.albedo_color = color
	mat.emission_enabled = true
	mat.emission = color
	mat.emission_energy_multiplier = energy
	mat.roughness = 0.35
	return mat

static func make_wet_sand_mat(tint: Color = Color("#7e6d52")) -> StandardMaterial3D:
	var mat := make_textured_mat("earth.webp", tint, 0.24, "rock", Vector3(0.28, 0.28, 0.28), true, true)
	mat.metallic = 0.08
	return mat

static func create_water_shader_material(
	deep_color: Color = Color("#123947"),
	shallow_color: Color = Color("#2b6f7c"),
	foam_color: Color = Color("#d9eff4"),
	wave_amp: float = 0.14,
	speed: float = 1.0,
	shore_foam_strength: float = 1.0,
	flow_dir: Vector2 = Vector2.ZERO,
	flow_speed: float = 0.0,
	ripple_strength: float = 0.0
) -> ShaderMaterial:
	var shader := Shader.new()
	shader.code = """
shader_type spatial;
render_mode blend_mix, depth_draw_opaque, cull_disabled, specular_schlick_ggx;

uniform vec4 deep_col : source_color = vec4(0.06, 0.20, 0.28, 0.96);
uniform vec4 shallow_col : source_color = vec4(0.16, 0.42, 0.48, 0.90);
uniform vec4 foam_col : source_color = vec4(0.86, 0.94, 0.96, 1.0);
uniform float wave_amp = 0.14;
uniform float speed = 1.0;
uniform float shore_foam = 1.0;
uniform vec2 flow_dir = vec2(0.0, 0.0);
uniform float flow_speed = 0.0;
uniform float ripple_strength = 0.0;

varying vec3 wpos;

float hash21(vec2 p) {
	p = fract(p * vec2(123.34, 456.21));
	p += dot(p, p + 45.32);
	return fract(p.x * p.y);
}

float vnoise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	f = f * f * (3.0 - 2.0 * f);
	float a = hash21(i);
	float b = hash21(i + vec2(1.0, 0.0));
	float c = hash21(i + vec2(0.0, 1.0));
	float d = hash21(i + vec2(1.0, 1.0));
	return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float wave_height(vec2 xz, float t) {
	vec2 p = xz - flow_dir * (t * flow_speed);
	// Six rotated directional wave trains + stream current Advection
	float w1 = sin(dot(p, vec2(0.86, 0.51)) * 0.28 + t * 0.95);
	float w2 = sin(dot(p, vec2(-0.42, 0.91)) * 0.42 - t * 1.24);
	float w3 = sin(dot(p, vec2(0.28, -0.96)) * 0.72 + t * 1.54);
	float w4 = sin(dot(p, vec2(-0.92, -0.38)) * 1.08 - t * 1.85);
	float w5 = sin(dot(p, vec2(0.64, -0.77)) * 1.65 + t * 2.15);
	float w6 = sin(dot(p, vec2(-0.73, 0.68)) * 2.35 - t * 2.45);
	return 0.5 + (w1 * 0.34 + w2 * 0.26 + w3 * 0.18 + w4 * 0.11 + w5 * 0.07 + w6 * 0.04) * 0.48;
}

void vertex() {
	float t = TIME * speed;
	vec3 wp = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	float swell = sin(dot(wp.xz, vec2(0.22, 0.97)) * 0.32 + t * 1.05) * wave_amp;
	swell += sin(dot(wp.xz, vec2(-0.68, 0.73)) * 0.54 - t * 1.42) * (wave_amp * 0.45);
	VERTEX.y += swell;
	wpos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
}

void fragment() {
	float t = TIME * speed;
	float eps = 0.14;
	float h0 = wave_height(wpos.xz, t);
	float hx = wave_height(wpos.xz + vec2(eps, 0.0), t);
	float hz = wave_height(wpos.xz + vec2(0.0, eps), t);

	// Expanding drip ripple rings for calm cave tidepools
	float ring_val = 0.0;
	if (ripple_strength > 0.01) {
		float d_pool = length(fract(wpos.xz * 0.45) - 0.5);
		ring_val = sin(d_pool * 28.0 - t * 4.5) * smoothstep(0.45, 0.06, d_pool) * ripple_strength;
	}

	vec2 slope = vec2(h0 - hx, h0 - hz) * 1.35 + vec2(ring_val * 0.45);

	float shore_dist = clamp(min(UV.y, 1.0 - UV.y), 0.0, 1.0);
	float shore_swash = sin(wpos.x * 0.24 + t * 1.08) * 0.014;
	float shore = (1.0 - smoothstep(0.0, 0.06 + shore_swash, shore_dist)) * shore_foam;
	float lacy_shore = shore * smoothstep(-0.15, 0.72, h0);

	// Downstream flow glints & current foam streaks in rivers
	float current_streak = flow_speed > 0.1 ? smoothstep(0.68, 0.94, h0) * 0.28 : 0.0;

	float depth_mix = smoothstep(0.015, 0.28, shore_dist);
	vec3 water_col = mix(shallow_col.rgb, deep_col.rgb, depth_mix);
	water_col = mix(water_col, shallow_col.rgb * 1.12, (h0 - 0.5) * 0.22);
	water_col = mix(water_col, foam_col.rgb, clamp(lacy_shore * 0.65 + current_streak + max(0.0, ring_val) * 0.25, 0.0, 0.80));

	float fresnel = pow(1.0 - clamp(dot(normalize(NORMAL), normalize(VIEW)), 0.0, 1.0), 3.2);
	water_col = mix(water_col, foam_col.rgb * 0.85, fresnel * 0.24);

	ALBEDO = water_col;
	METALLIC = 0.08;
	ROUGHNESS = mix(0.09, 0.34, clamp(lacy_shore + current_streak * 0.5, 0.0, 1.0));
	SPECULAR = 0.52;
	NORMAL_MAP = vec3(clamp(0.5 + slope.x, 0.12, 0.88), clamp(0.5 + slope.y, 0.12, 0.88), 1.0);
	ALPHA = clamp(mix(shallow_col.a, deep_col.a, depth_mix) + lacy_shore * 0.14, 0.54, 0.96);
}
"""
	var smat := ShaderMaterial.new()
	smat.shader = shader
	smat.set_shader_parameter("deep_col", deep_color)
	smat.set_shader_parameter("shallow_col", shallow_color)
	smat.set_shader_parameter("foam_col", foam_color)
	smat.set_shader_parameter("wave_amp", wave_amp)
	smat.set_shader_parameter("speed", speed)
	smat.set_shader_parameter("shore_foam", shore_foam_strength)
	smat.set_shader_parameter("flow_dir", flow_dir)
	smat.set_shader_parameter("flow_speed", flow_speed)
	smat.set_shader_parameter("ripple_strength", ripple_strength)
	return smat

static func create_river_shader_material(
	deep_color: Color = Color("#114554"),
	shallow_color: Color = Color("#2e8286"),
	foam_color: Color = Color("#dff5f8"),
	flow_speed: float = 1.65,
	wave_amp: float = 0.015,
	exposed: bool = true
) -> ShaderMaterial:
	var shader := Shader.new()
	shader.code = """
shader_type spatial;
render_mode blend_mix, depth_draw_opaque, cull_disabled, specular_schlick_ggx;

uniform vec4 deep_col : source_color = vec4(0.07, 0.27, 0.33, 0.90);
uniform vec4 shallow_col : source_color = vec4(0.18, 0.51, 0.53, 0.64);
uniform vec4 foam_col : source_color = vec4(0.88, 0.96, 0.98, 1.0);
uniform float flow_speed = 1.65;
uniform float wave_amp = 0.015;
uniform float flow_phase = 0.0;
uniform float reduced_motion = 0.0;
uniform float wetness = 0.0;
uniform float snow_cover = 0.0;

varying vec3 wpos;

float hash21(vec2 p) {
	p = fract(p * vec2(127.1, 311.7));
	p += dot(p, p + 45.32);
	return fract(p.x * p.y);
}

float vnoise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	f = f * f * (3.0 - 2.0 * f);
	float a = hash21(i);
	float b = hash21(i + vec2(1.0, 0.0));
	float c = hash21(i + vec2(0.0, 1.0));
	float d = hash21(i + vec2(1.0, 1.0));
	return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float river_fbm(vec2 uv_flow, float t) {
	float v = 0.0;
	v += vnoise(uv_flow * vec2(3.6, 0.42) + vec2(0.0, -t * 1.0)) * 0.52;
	v += vnoise(uv_flow * vec2(7.4, 0.88) + vec2(sin(uv_flow.y * 0.4 - t) * 0.25, -t * 1.38)) * 0.32;
	v += vnoise(uv_flow * vec2(14.0, 1.75) + vec2(-0.18 * t, -t * 1.72)) * 0.16;
	return v;
}

void vertex() {
	float t = reduced_motion > 0.5 ? flow_phase : (TIME + flow_phase);
	float u_chan = clamp(UV.x, 0.0, 1.0);
	float bank_profile = sin(u_chan * 3.14159265);
	float swell = sin(UV.y * 2.1 - t * flow_speed * 2.2) * wave_amp;
	swell += cos(UV.x * 8.0 + UV.y * 1.4 - t * flow_speed * 1.6) * (wave_amp * 0.55);
	VERTEX.y += swell * bank_profile;
	wpos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
}

void fragment() {
	float t = reduced_motion > 0.5 ? flow_phase : (TIME + flow_phase);
	float u_chan = clamp(UV.x, 0.0, 1.0);
	float bank_dist = min(u_chan, 1.0 - u_chan);
	float bank_profile = sin(u_chan * 3.14159265);
	float local_vel = mix(0.48, 1.16, bank_profile);

	vec2 flow_uv = vec2(u_chan, UV.y);
	float n_main = river_fbm(flow_uv, t * flow_speed * local_vel);
	float n_fast = river_fbm(flow_uv + vec2(0.37, 1.9), t * flow_speed * local_vel * 1.28);

	// Downstream normal perturbation for crisp sunlight & campfire glints
	float eps = 0.035;
	float nx = river_fbm(flow_uv + vec2(eps, 0.0), t * flow_speed * local_vel);
	float ny = river_fbm(flow_uv + vec2(0.0, eps), t * flow_speed * local_vel);
	vec2 slope = vec2((n_main - nx) * 2.8, (n_main - ny) * 2.1);

	// Elongated directional current streaks flowing downstream in mid-channel
	float streak_wave = sin(u_chan * 18.0 + n_main * 5.2) * 0.5 + 0.5;
	float streak = smoothstep(0.68, 0.93, n_main * 0.65 + n_fast * 0.35) * smoothstep(0.32, 0.85, streak_wave);
	streak *= smoothstep(0.06, 0.26, bank_dist);

	// Lacy bank foam & shallow riffle froth hugging both banks
	float bank_wobble = (n_fast - 0.5) * 0.09;
	float bank_foam = (1.0 - smoothstep(0.015, 0.145 + bank_wobble, bank_dist)) * smoothstep(0.36, 0.72, n_fast);
	float ripple_ring = smoothstep(0.76, 0.95, n_fast) * (0.28 + 0.35 * sin(UV.y * 2.4 - t * flow_speed * 2.6));

	float depth_mix = smoothstep(0.02, 0.32, bank_dist);
	vec3 water_col = mix(shallow_col.rgb, deep_col.rgb, depth_mix);
	water_col = mix(water_col, shallow_col.rgb * 1.24, (n_main - 0.45) * 0.38);

	float foam_mask = clamp(streak * 0.62 + bank_foam * 0.74 + max(0.0, ripple_ring) * 0.35, 0.0, 0.88);
	water_col = mix(water_col, foam_col.rgb, foam_mask);
	water_col = mix(water_col, foam_col.rgb * 0.9, snow_cover * 0.14);

	float fresnel = pow(1.0 - clamp(dot(normalize(NORMAL), normalize(VIEW)), 0.0, 1.0), 3.0);
	water_col = mix(water_col, foam_col.rgb * 0.88, fresnel * 0.26);

	float edge_fade = smoothstep(0.0, 0.045, bank_dist);
	ALBEDO = water_col;
	METALLIC = 0.08;
	ROUGHNESS = mix(0.07, 0.36, foam_mask + wetness * 0.05);
	SPECULAR = 0.64;
	NORMAL_MAP = vec3(clamp(0.5 + slope.x, 0.08, 0.92), clamp(0.5 + slope.y, 0.08, 0.92), 1.0);
	ALPHA = clamp(mix(shallow_col.a, deep_col.a, depth_mix) + foam_mask * 0.16, 0.42, 0.86) * edge_fade;
}
"""
	var smat := ShaderMaterial.new()
	smat.shader = shader
	smat.set_shader_parameter("deep_col", deep_color)
	smat.set_shader_parameter("shallow_col", shallow_color)
	smat.set_shader_parameter("foam_col", foam_color)
	smat.set_shader_parameter("flow_speed", flow_speed)
	smat.set_shader_parameter("wave_amp", wave_amp)
	smat.set_shader_parameter("flow_phase", 0.0)
	smat.set_shader_parameter("reduced_motion", 0.0)
	if exposed:
		_exposed_shaders.append(smat)
	return smat

static func create_surf_foam_shader_material(foam_color: Color = Color("#e2f5f8")) -> ShaderMaterial:
	var shader := Shader.new()
	shader.code = """
shader_type spatial;
render_mode blend_mix, depth_draw_never, cull_disabled, unshaded;

uniform vec4 foam_col : source_color = vec4(0.89, 0.96, 0.97, 0.72);
varying vec3 wpos;

float hash21(vec2 p) {
	p = fract(p * vec2(127.1, 311.7));
	p += dot(p, p + 34.12);
	return fract(p.x * p.y);
}

float vnoise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	f = f * f * (3.0 - 2.0 * f);
	return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
	           mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x), f.y);
}

void vertex() {
	wpos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
}

void fragment() {
	float t = TIME * 1.1;
	float edge_x = smoothstep(0.0, 0.18, UV.x) * smoothstep(1.0, 0.82, UV.x);
	float edge_y = smoothstep(0.0, 0.25, UV.y) * smoothstep(1.0, 0.28, UV.y);
	float lacy = vnoise(wpos.xz * 1.85 + vec2(sin(t * 0.4), -t * 0.45)) * 0.65
	           + vnoise(wpos.xz * 4.2 + vec2(-t * 0.35, t * 0.3)) * 0.35;
	float ripple = sin((UV.y + lacy * 0.32) * 9.0 - t * 2.2) * 0.5 + 0.5;
	float alpha = edge_x * edge_y * smoothstep(0.38, 0.78, lacy + ripple * 0.25) * foam_col.a;
	ALBEDO = foam_col.rgb;
	ALPHA = clamp(alpha, 0.0, 0.85);
}
"""
	var mat := ShaderMaterial.new()
	mat.shader = shader
	mat.set_shader_parameter("foam_col", foam_color)
	return mat

static func create_aurora_shader_material(
	col_a: Color = Color("#46f0b6"),
	col_b: Color = Color("#6e72ff"),
	phase_offset: float = 0.0
) -> ShaderMaterial:
	var shader := Shader.new()
	shader.code = """
shader_type spatial;
render_mode blend_add, depth_draw_never, cull_disabled, unshaded;

uniform vec4 color_a : source_color = vec4(0.28, 0.94, 0.72, 1.0);
uniform vec4 color_b : source_color = vec4(0.45, 0.45, 1.0, 1.0);
uniform float phase_offset = 0.0;

void vertex() {
	float t = TIME * 0.55 + phase_offset;
	VERTEX.z += sin(VERTEX.x * 0.22 + t) * 1.25 + cos(VERTEX.x * 0.45 - t * 0.7) * 0.55;
	VERTEX.y += sin(VERTEX.x * 0.16 + t * 0.6) * 0.35;
}

void fragment() {
	float t = TIME * 0.42 + phase_offset;
	float h_fade = smoothstep(0.0, 0.26, UV.x) * smoothstep(1.0, 0.74, UV.x);
	float v_fade = smoothstep(0.0, 0.38, UV.y) * smoothstep(1.0, 0.18, UV.y);
	float ray1 = sin(UV.x * 26.0 + t * 1.4 + sin(UV.x * 7.0 - t)) * 0.5 + 0.5;
	float ray2 = sin(UV.x * 48.0 - t * 1.9 + UV.y * 2.5) * 0.5 + 0.5;
	float curtain = pow(ray1 * 0.65 + ray2 * 0.35, 1.45);
	vec3 col = mix(color_a.rgb, color_b.rgb, smoothstep(0.2, 0.85, UV.y) * 0.75 + ray2 * 0.25);
	ALBEDO = col * 1.35;
	ALPHA = h_fade * v_fade * curtain * 0.58;
}
"""
	var mat := ShaderMaterial.new()
	mat.shader = shader
	mat.set_shader_parameter("color_a", col_a)
	mat.set_shader_parameter("color_b", col_b)
	mat.set_shader_parameter("phase_offset", phase_offset)
	return mat

static func create_cloud_wisp_shader_material(tint: Color = Color(0.56, 0.66, 0.78, 0.28)) -> ShaderMaterial:
	var shader := Shader.new()
	shader.code = """
shader_type spatial;
render_mode blend_mix, depth_draw_never, cull_disabled, unshaded;

uniform vec4 tint_col : source_color = vec4(0.56, 0.66, 0.78, 0.28);

float hash21(vec2 p) {
	p = fract(p * vec2(234.12, 519.34));
	p += dot(p, p + 19.83);
	return fract(p.x * p.y);
}

float vnoise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	f = f * f * (3.0 - 2.0 * f);
	return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
	           mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x), f.y);
}

void fragment() {
	vec2 p = (UV - 0.5) * 2.0;
	float rad = smoothstep(1.0, 0.18, length(p * vec2(1.0, 1.35)));
	float wisp = vnoise(UV * 5.0 + TIME * 0.04) * 0.65 + vnoise(UV * 11.0 - TIME * 0.07) * 0.35;
	ALBEDO = tint_col.rgb;
	ALPHA = rad * smoothstep(0.25, 0.85, wisp) * tint_col.a;
}
"""
	var mat := ShaderMaterial.new()
	mat.shader = shader
	mat.set_shader_parameter("tint_col", tint)
	return mat

static func create_terrain_splat_material(
	tex_primary_name: String,
	tint_primary: Color,
	tex_secondary_name: String,
	tint_secondary: Color,
	uv_scale: float = 0.28,
	sec_roughness: float = 0.88,
	exposed: bool = true
) -> ShaderMaterial:
	var shader := Shader.new()
	shader.code = """
shader_type spatial;
render_mode blend_mix, depth_draw_opaque, cull_back, specular_schlick_ggx;

uniform sampler2D tex_a : source_color, filter_linear_mipmap, repeat_enable;
uniform sampler2D tex_b : source_color, filter_linear_mipmap, repeat_enable;
uniform sampler2D norm_tex : hint_normal, filter_linear_mipmap, repeat_enable;
uniform vec4 col_a : source_color = vec4(1.0);
uniform vec4 col_b : source_color = vec4(1.0);
uniform float uv_scale = 0.28;
uniform float rough_a = 0.90;
uniform float rough_b = 0.86;
uniform float wetness = 0.0;
uniform float snow_cover = 0.0;

varying vec3 wpos;

float hash21(vec2 p) {
	p = fract(p * vec2(127.1, 311.7));
	p += dot(p, p + 34.56);
	return fract(p.x * p.y);
}

float vnoise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	f = f * f * (3.0 - 2.0 * f);
	return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
	           mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x), f.y);
}

void vertex() {
	wpos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
}

void fragment() {
	vec2 uv_w = wpos.xz * uv_scale;
	vec3 ta = texture(tex_a, uv_w).rgb * col_a.rgb;
	vec3 tb = texture(tex_b, uv_w * 1.08).rgb * col_b.rgb;

	// Organic multi-octave noise perturbing vertex splat weight (zero square grid seams)
	float n1 = vnoise(wpos.xz * 0.72) * 0.62 + vnoise(wpos.xz * 2.15) * 0.38;
	float macro_v = vnoise(wpos.xz * 0.24) * 0.16 - 0.08;
	float blend_w = smoothstep(0.24, 0.76, COLOR.r + (n1 - 0.5) * 0.65);

	vec3 alb = mix(ta, tb, blend_w);
	alb *= (1.0 + macro_v);

	// Weather response (wet darkening + frost)
	alb = mix(alb, alb * vec3(0.66, 0.70, 0.76), wetness * 0.85);
	alb = mix(alb, vec3(0.84, 0.88, 0.92), snow_cover * clamp(0.45 + n1 * 0.25 - blend_w * 0.15, 0.15, 0.62));

	float base_r = mix(rough_a, rough_b, blend_w);
	float wet_r = mix(base_r, max(0.16, base_r * 0.35), wetness);
	ROUGHNESS = mix(wet_r, 0.84, snow_cover * 0.65);
	METALLIC = 0.03;
	NORMAL_MAP = texture(norm_tex, uv_w * 1.4).rgb;
	NORMAL_MAP_DEPTH = 0.48;
	ALBEDO = alb;
}
"""
	var smat := ShaderMaterial.new()
	smat.shader = shader
	var ta := load_tex(tex_primary_name)
	var tb := load_tex(tex_secondary_name)
	var nrm := load_tex("rock-normal-v1.png")
	if ta: smat.set_shader_parameter("tex_a", ta)
	if tb: smat.set_shader_parameter("tex_b", tb)
	if nrm: smat.set_shader_parameter("norm_tex", nrm)
	smat.set_shader_parameter("col_a", tint_primary)
	smat.set_shader_parameter("col_b", tint_secondary)
	smat.set_shader_parameter("uv_scale", uv_scale)
	smat.set_shader_parameter("rough_b", sec_roughness)
	if exposed:
		_exposed_shaders.append(smat)
	return smat

static func create_foliage_wind_shader_material(
	tex_name: String,
	tint: Color,
	wind_strength: float = 0.065,
	backlight_col: Color = Color("#88b058"),
	alpha_cut: bool = true,
	uv_mult: float = 1.0,
	exposed: bool = true,
	uv_rect: Rect2 = Rect2(0.0, 0.0, 1.0, 1.0)
) -> ShaderMaterial:
	var shader := Shader.new()
	shader.code = """
shader_type spatial;
render_mode blend_mix, depth_draw_opaque, cull_disabled, specular_schlick_ggx;

uniform sampler2D albedo_tex : source_color, filter_linear_mipmap, repeat_enable;
uniform sampler2D norm_tex : hint_normal, filter_linear_mipmap, repeat_enable;
uniform vec4 tint_col : source_color = vec4(1.0);
uniform vec3 backlight_tint : source_color = vec3(0.45, 0.62, 0.28);
uniform float wind_strength = 0.065;
uniform float alpha_cut = 1.0;
uniform float uv_mult = 1.0;
uniform vec4 uv_rect = vec4(0.0, 0.0, 1.0, 1.0);
uniform float hang = 0.0;
uniform float wetness = 0.0;
uniform float snow_cover = 0.0;

varying vec3 wpos;

void vertex() {
	vec3 wp = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	// Lock ground/roots near bottom of active UV rect and sway upper fronds/crowns
	float v_span = max(0.001, uv_rect.w - uv_rect.y);
	float norm_v = clamp((UV.y - uv_rect.y) / v_span, 0.0, 1.0);
	float height_factor = hang > 0.5 ? clamp(norm_v * 1.15, 0.0, 1.0) : clamp((1.0 - norm_v) * 1.15, 0.0, 1.0);
	float sway_a = sin(TIME * 2.1 + wp.x * 0.9 + wp.z * 0.7);
	float sway_b = cos(TIME * 3.4 + wp.x * 1.7 - wp.z * 1.3);
	VERTEX.x += (sway_a * 0.65 + sway_b * 0.35) * wind_strength * height_factor;
	VERTEX.z += (sway_b * 0.55 - sway_a * 0.25) * wind_strength * 0.7 * height_factor;
	wpos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
}

void fragment() {
	vec4 tex = texture(albedo_tex, UV * uv_mult);
	if (alpha_cut > 0.5 && tex.a < 0.34) {
		discard;
	}
	// Rich botanical light variation across clusters + sunlit warm top modulation
	float leaf_var = 0.88 + 0.24 * sin(wpos.x * 1.3 + wpos.z * 1.1);
	vec3 col = tex.rgb * tint_col.rgb * leaf_var;
	col = mix(col, col * vec3(0.66, 0.72, 0.76), wetness * 0.78);
	col = mix(col, vec3(0.84, 0.88, 0.92), snow_cover * 0.45);

	ALBEDO = col;
	ROUGHNESS = mix(mix(0.76, 0.26, wetness * 0.8), 0.82, snow_cover * 0.5);
	SPECULAR = mix(0.32, 0.62, wetness);
	METALLIC = 0.02;
	NORMAL_MAP = texture(norm_tex, UV * uv_mult * 2.4).rgb;
	NORMAL_MAP_DEPTH = 0.45;
	BACKLIGHT = backlight_tint * 0.45 * (1.0 - snow_cover * 0.6);
}
"""
	var smat := ShaderMaterial.new()
	smat.shader = shader
	var t := load_tex(tex_name)
	var n := load_tex("rock-normal-v1.png")
	if t: smat.set_shader_parameter("albedo_tex", t)
	if n: smat.set_shader_parameter("norm_tex", n)
	smat.set_shader_parameter("tint_col", tint)
	smat.set_shader_parameter("backlight_tint", Vector3(backlight_col.r, backlight_col.g, backlight_col.b))
	smat.set_shader_parameter("wind_strength", wind_strength)
	smat.set_shader_parameter("alpha_cut", 1.0 if alpha_cut else 0.0)
	smat.set_shader_parameter("uv_mult", uv_mult)
	smat.set_shader_parameter("uv_rect", Vector4(uv_rect.position.x, uv_rect.position.y, uv_rect.end.x, uv_rect.end.y))
	if exposed:
		_exposed_shaders.append(smat)
	return smat
