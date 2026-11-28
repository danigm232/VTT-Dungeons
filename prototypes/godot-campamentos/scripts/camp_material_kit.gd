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

static var _organic_normal_cache: Dictionary = {}

static func _hash_lattice(ix: int, iy: int, seed_k: int) -> float:
	var n: int = (ix * 374761393 + iy * 668265263 + seed_k * 1442695041) & 0x7fffffff
	n = ((n ^ (n >> 13)) * 1274126177) & 0x7fffffff
	return float(n & 0xffff) / 65535.0

static func _tile_value_noise(u: float, v: float, period_x: int, period_y: int, seed_k: int) -> float:
	var fx := u * float(period_x)
	var fy := v * float(period_y)
	var x0 := int(floor(fx))
	var y0 := int(floor(fy))
	var tx := fx - float(x0)
	var ty := fy - float(y0)
	var sx := tx * tx * (3.0 - 2.0 * tx)
	var sy := ty * ty * (3.0 - 2.0 * ty)
	var wx0 := posmod(x0, period_x)
	var wx1 := posmod(x0 + 1, period_x)
	var wy0 := posmod(y0, period_y)
	var wy1 := posmod(y0 + 1, period_y)
	var c00 := _hash_lattice(wx0, wy0, seed_k)
	var c10 := _hash_lattice(wx1, wy0, seed_k)
	var c01 := _hash_lattice(wx0, wy1, seed_k)
	var c11 := _hash_lattice(wx1, wy1, seed_k)
	return lerpf(lerpf(c00, c10, sx), lerpf(c01, c11, sx), sy)

static func make_organic_normal(kind: String, size: int = 128) -> Texture2D:
	var cache_key := "%s_%d" % [kind, size]
	if _organic_normal_cache.has(cache_key):
		return _organic_normal_cache[cache_key] as Texture2D
	var heights := PackedFloat32Array()
	heights.resize(size * size)
	for y in range(size):
		var v := float(y) / float(size)
		for x in range(size):
			var u := float(x) / float(size)
			var h := 0.0
			match kind:
				"cloth":
					var fold := _tile_value_noise(u, v, 4, 4, 11) * 0.58 + _tile_value_noise(u, v, 10, 10, 23) * 0.32
					var micro := _tile_value_noise(u, v, 32, 32, 29) * 0.10
					var thread_u := cos(u * TAU * 80.0) * 0.5 + 0.5
					var thread_v := cos(v * TAU * 80.0) * 0.5 + 0.5
					h = (fold + micro) * 0.88 + lerpf(thread_u, thread_v, 0.5) * 0.12
				"leather":
					var p0 := _tile_value_noise(u, v, 8, 8, 31)
					var p1 := _tile_value_noise(u, v, 18, 18, 47)
					var p2 := _tile_value_noise(u, v, 36, 36, 71)
					h = p0 * 0.45 + p1 * 0.33 + (1.0 - absf(p2 * 2.0 - 1.0)) * 0.22
				"timber":
					var g0 := _tile_value_noise(u, v, 6, 20, 83)
					var g1 := _tile_value_noise(u, v, 12, 42, 97)
					var crack := 1.0 - absf(_tile_value_noise(u, v, 8, 28, 113) * 2.0 - 1.0)
					h = g0 * 0.52 + g1 * 0.30 + crack * 0.18
				_:
					var r0 := _tile_value_noise(u, v, 6, 6, 131)
					var r1 := 1.0 - absf(_tile_value_noise(u, v, 14, 14, 149) * 2.0 - 1.0)
					var r2 := _tile_value_noise(u, v, 28, 28, 167)
					h = r0 * 0.46 + r1 * 0.34 + r2 * 0.20
			heights[y * size + x] = h

	var strength := 2.4 if kind == "rock" else (2.0 if kind == "timber" else (1.55 if kind == "leather" else 0.72))
	var img := Image.create(size, size, true, Image.FORMAT_RGBA8)
	for y in range(size):
		var ym := posmod(y - 1, size)
		var yp := posmod(y + 1, size)
		for x in range(size):
			var xm := posmod(x - 1, size)
			var xp := posmod(x + 1, size)
			var dx := (heights[y * size + xp] - heights[y * size + xm]) * strength
			var dy := (heights[yp * size + x] - heights[ym * size + x]) * strength
			var n := Vector3(-dx, -dy, 1.0).normalized()
			img.set_pixel(x, y, Color(0.5 + n.x * 0.5, 0.5 + n.y * 0.5, 0.5 + n.z * 0.5, 1.0))
	img.generate_mipmaps()
	var tex := ImageTexture.create_from_image(img)
	_organic_normal_cache[cache_key] = tex
	return tex

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
		norm_tex = make_organic_normal(normal_kind)
	if norm_tex:
		mat.normal_enabled = true
		mat.normal_texture = norm_tex
		mat.normal_scale = 0.46 if normal_kind in ["rock", "timber"] else (0.34 if normal_kind == "leather" else 0.22)

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
	var mat := make_textured_mat("oak-v4.webp", tint, 0.54, "leather", Vector3(1.6, 1.6, 1.6), false, exposed)
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

	// Subtle organic cave-pool drip shimmer & natural mineral caustics (zero repeating bullseye rings!)
	float ring_val = 0.0;
	if (ripple_strength > 0.01) {
		float c1 = vnoise(wpos.xz * 2.4 + vec2(t * 0.28, -t * 0.22));
		float c2 = vnoise(wpos.xz * 4.6 + vec2(-t * 0.34, t * 0.26));
		float caust = smoothstep(0.56, 0.88, c1 * 0.55 + c2 * 0.45);
		ring_val = (caust - 0.35) * 0.55 * ripple_strength;
	}

	vec2 slope = vec2(h0 - hx, h0 - hz) * 1.35 + vec2(ring_val * 0.22);

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
	deep_color: Color = Color("#13363e"),
	shallow_color: Color = Color("#2f5f58"),
	foam_color: Color = Color("#ddece8"),
	flow_speed: float = 1.25,
	wave_amp: float = 0.013,
	exposed: bool = true
) -> ShaderMaterial:
	var shader := Shader.new()
	shader.code = """
shader_type spatial;
render_mode blend_mix, depth_draw_opaque, cull_disabled, specular_schlick_ggx;

uniform vec4 deep_col : source_color = vec4(0.06, 0.20, 0.24, 0.84);
uniform vec4 shallow_col : source_color = vec4(0.18, 0.37, 0.34, 0.38);
uniform vec4 foam_col : source_color = vec4(0.86, 0.93, 0.91, 1.0);
uniform float flow_speed = 1.25;
uniform float wave_amp = 0.013;
uniform float flow_phase = 0.0;
uniform float reduced_motion = 0.0;
uniform float wetness = 0.0;
uniform float snow_cover = 0.0;
uniform float river_time = 0.0;
uniform vec4 wake_pts[10];
uniform vec4 mover_ripples[8];

varying vec3 wpos;
varying vec2 flow_uv;

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

// Dual-scale flow-aligned wave height in curved river UV space (zero longitudinal shear bands!)
float river_waves_macro(vec2 fuv, vec2 wp, float t) {
	// Scale 1: broad gentle current swells following the curved river channel (UV.y = arc meters)
	vec2 p1 = vec2(fuv.x * 2.15, fuv.y * 0.68 - t * 0.62);
	vec2 w1 = vec2(vnoise(p1 * 0.55 + vec2(1.7, 3.1)), vnoise(p1 * 0.55 + vec2(6.4, 2.2))) - 0.5;
	vec2 p2 = vec2(fuv.x * 3.40 + w1.x * 0.75, fuv.y * 1.12 - t * 0.86 + w1.y * 0.75);
	// Mix slight isotropic world-space noise so curves never show any repeating UV tile
	float iso = vnoise(wp * 0.58 + vec2(w1.x * 0.6, -t * 0.34));
	return vnoise(p1 + w1 * 0.55) * 0.42 + vnoise(p2) * 0.36 + iso * 0.22;
}

float river_waves_fine(vec2 fuv, vec2 wp, float t) {
	// Scale 2: crisp rotated capillary wavelets moving downstream along curved flow
	vec2 r1 = vec2(fuv.x * 5.2 + fuv.y * 0.85, fuv.y * 2.15 - t * 1.32);
	vec2 r2 = vec2(fuv.x * -4.6 + fuv.y * 1.15, fuv.y * 2.65 - t * 1.68);
	float fine_a = vnoise(r1);
	float fine_b = vnoise(r2 + vec2(3.9, 1.4));
	float micro = vnoise(wp * 3.85 + vec2(fine_a * 0.55, -t * 1.15));
	return fine_a * 0.40 + fine_b * 0.35 + micro * 0.25;
}

void vertex() {
	float t = reduced_motion > 0.5 ? flow_phase : (TIME + flow_phase);
	float u_chan = clamp(UV.x, 0.0, 1.0);
	float bank_profile = sin(u_chan * 3.14159265);
	vec3 wp = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	float swell = sin(UV.y * 1.45 - t * flow_speed * 1.65 + u_chan * 2.4) * wave_amp;
	swell += cos(UV.y * 2.35 - t * flow_speed * 1.25 - u_chan * 4.2) * (wave_amp * 0.45);
	float wader_disp = 0.0;
	for (int i = 0; i < 8; i++) {
		vec4 mr = mover_ripples[i];
		if (mr.w > 0.01) {
			float d = length(wp.xz - mr.xy);
			float age = max(0.0, river_time - mr.z);
			wader_disp += sin(d * 10.5 - age * 11.0) * exp(-d * 1.15) * exp(-age * 1.4) * mr.w * 0.042;
		}
	}
	VERTEX.y += (swell + wader_disp) * bank_profile;
	wpos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	flow_uv = UV;
}

void fragment() {
	float t = reduced_motion > 0.5 ? flow_phase : (TIME + flow_phase);
	float tf = t * flow_speed;
	float u_chan = clamp(flow_uv.x, 0.0, 1.0);
	float raw_bank = clamp(min(u_chan, 1.0 - u_chan) * 2.0, 0.0, 1.0);

	// Two distinct wave scales (macro flow swells + fine sparkling capillary ripples)
	float h_macro = river_waves_macro(flow_uv, wpos.xz, tf);
	float h_fine = river_waves_fine(flow_uv, wpos.xz, tf);
	float n_shore = vnoise(wpos.xz * 2.1 + vec2(0.4, -tf * 0.25)) * 0.65 + vnoise(wpos.xz * 5.2) * 0.35;

	// Irregular organic shoreline transition (no straight ribbon borders)
	float bank_dist = clamp(raw_bank + (n_shore - 0.5) * 0.32, 0.0, 1.0);

	// Dual-scale moving normal perturbation (finite differences in flow & world space)
	float eps_u = 0.020;
	float eps_v = 0.070;
	float mx = river_waves_macro(flow_uv + vec2(eps_u, 0.0), wpos.xz + vec2(0.07, 0.0), tf);
	float mz = river_waves_macro(flow_uv + vec2(0.0, eps_v), wpos.xz + vec2(0.0, 0.07), tf);
	float fx = river_waves_fine(flow_uv + vec2(eps_u * 0.65, 0.0), wpos.xz + vec2(0.04, 0.0), tf);
	float fz = river_waves_fine(flow_uv + vec2(0.0, eps_v * 0.65), wpos.xz + vec2(0.0, 0.04), tf);
	vec2 slope = vec2((h_macro - mx) * 1.15 + (h_fine - fx) * 0.88, (h_macro - mz) * 1.15 + (h_fine - fz) * 0.88);

	// Localized non-repeating V-shaped obstacle wakes & eddies behind submerged rocks & bridge pilings
	float wake_foam = 0.0;
	for (int i = 0; i < 10; i++) {
		vec4 wp = wake_pts[i];
		if (wp.w > 0.01) {
			vec2 dv = wpos.xz - wp.xy;
			float rad = max(0.22, wp.z);
			// Upstream cushion bow-wave + elongated lacy downstream V-plume
			float upstream_ring = (1.0 - smoothstep(rad * 0.42, rad * 1.02, length(dv + vec2(0.0, rad * 0.25))));
			vec2 ds = vec2(dv.x / (rad * (0.85 + max(0.0, dv.y) * 0.34)), (dv.y - rad * 0.52) / (rad * 1.85));
			float d_plume = length(ds);
			float break_n = vnoise(wpos.xz * 4.2 + vec2(float(i) * 2.3, -tf * 1.55)) * 0.55 + h_fine * 0.45;
			float plume_m = (1.0 - smoothstep(0.22, 1.12, d_plume)) * smoothstep(0.50, 0.82, break_n);
			float bow_m = upstream_ring * smoothstep(0.52, 0.84, h_fine * 0.65 + h_macro * 0.35);
			wake_foam = max(wake_foam, max(plume_m * 0.82, bow_m * 0.72) * wp.w);
			if (d_plume < 1.25) {
				slope += vec2(dv.x, dv.y - rad * 0.3) * (1.0 - smoothstep(0.2, 1.25, d_plume)) * (break_n - 0.5) * 0.65 * wp.w;
			}
		}
	}

	// Expanding concentric ripples & churned whitewater where heroes wade across creek
	float wader_foam = 0.0;
	for (int i = 0; i < 8; i++) {
		vec4 mr = mover_ripples[i];
		if (mr.w > 0.01) {
			vec2 dv = wpos.xz - mr.xy;
			float d = length(dv);
			float age = max(0.0, river_time - mr.z);
			float ring_r = 0.22 + age * 1.45;
			float band = exp(-pow((d - ring_r) * 5.2, 2.0)) * exp(-age * 1.25);
			float splash_core = (1.0 - smoothstep(0.18, 0.95, d)) * exp(-age * 2.2);
			float ring_mod = smoothstep(0.32, 0.76, h_fine);
			wader_foam = max(wader_foam, (band * 0.82 + splash_core * 0.66) * ring_mod * mr.w);
			if (d > 0.04 && d < 2.8) {
				slope += normalize(dv) * sin(d * 10.5 - age * 11.0) * exp(-d * 1.15) * exp(-age * 1.4) * mr.w * 0.56;
			}
		}
	}

	// Non-repeating sparse shore froth (only where current brushes bends) + crisp current glints
	float shore_break = vnoise(wpos.xz * 1.8 + vec2(2.1, -tf * 0.42));
	float bank_froth = (1.0 - smoothstep(0.02, 0.16, bank_dist)) * smoothstep(0.58, 0.84, h_fine * 0.55 + shore_break * 0.45);
	float crest_glint = smoothstep(0.68, 0.88, h_macro * 0.46 + h_fine * 0.54) * smoothstep(0.16, 0.58, bank_dist) * 0.28;

	// Shallow pebble-tinted edge -> deeper cool coastal-forest emerald-teal center
	float depth_mix = smoothstep(0.08, 0.72, bank_dist);
	vec3 water_col = mix(shallow_col.rgb, deep_col.rgb, depth_mix);
	water_col = mix(water_col, shallow_col.rgb * 1.24, (h_macro - 0.5) * 0.28 + (h_fine - 0.5) * 0.16);

	float foam_mask = clamp(wake_foam * 0.82 + wader_foam * 0.95 + bank_froth * 0.36 + crest_glint, 0.0, 0.86);
	water_col = mix(water_col, foam_col.rgb, foam_mask);
	water_col = mix(water_col, foam_col.rgb * 0.92, snow_cover * 0.16);

	// Controlled grazing-angle Fresnel reflection (coherent across day/dusk/night)
	float fresnel = pow(1.0 - clamp(dot(normalize(NORMAL), normalize(VIEW)), 0.0, 1.0), 3.0);
	water_col = mix(water_col, foam_col.rgb * 0.68, fresnel * 0.18 * (1.0 - foam_mask * 0.6));

	float edge_fade = smoothstep(0.0, 0.18, raw_bank);
	ALBEDO = water_col;
	METALLIC = mix(0.09, 0.02, foam_mask);
	ROUGHNESS = mix(0.09, 0.42, foam_mask + wetness * 0.04);
	SPECULAR = mix(0.64, 0.25, foam_mask);
	NORMAL_MAP = vec3(clamp(0.5 + slope.x, 0.10, 0.90), clamp(0.5 + slope.y, 0.10, 0.90), 1.0);
	NORMAL_MAP_DEPTH = 0.88;
	ALPHA = clamp(mix(shallow_col.a, deep_col.a, depth_mix) + foam_mask * 0.28, 0.20, 0.84) * edge_fade;
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
	smat.set_shader_parameter("river_time", 0.0)
	var wakes: Array[Vector4] = []
	for _wi in range(10):
		wakes.append(Vector4.ZERO)
	smat.set_shader_parameter("wake_pts", wakes)
	smat.set_shader_parameter("mover_ripples", [
		Vector4.ZERO, Vector4.ZERO, Vector4.ZERO, Vector4.ZERO,
		Vector4.ZERO, Vector4.ZERO, Vector4.ZERO, Vector4.ZERO
	])
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
uniform sampler2D depth_tex : hint_depth_texture, filter_nearest;

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
	float rad = smoothstep(1.0, 0.24, length(p * vec2(1.0, 1.35)));
	float wisp = vnoise(UV * 5.0 + TIME * 0.04) * 0.65 + vnoise(UV * 11.0 - TIME * 0.07) * 0.35;
	float raw_d = texture(depth_tex, SCREEN_UV).r;
	vec4 scene_v = INV_PROJECTION_MATRIX * vec4(SCREEN_UV * 2.0 - 1.0, raw_d, 1.0);
	float scene_dist = -(scene_v.z / max(abs(scene_v.w), 0.0001));
	float frag_dist = -VERTEX.z;
	float prox_fade = smoothstep(0.0, 3.2, scene_dist - frag_dist);
	ALBEDO = tint_col.rgb;
	ALPHA = rad * smoothstep(0.28, 0.86, wisp) * tint_col.a * prox_fade;
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
uniform float canopy_volume_boost = 0.0;
uniform float occlude_fade_enabled = 0.0;
uniform vec3 cam_world_pos = vec3(0.0);
uniform vec4 hero_occlude_pts[4];

varying vec3 wpos;
varying vec3 wnrm;
varying float v_local_y;

float bayer4(vec2 p) {
	ivec2 ip = ivec2(mod(floor(p), 4.0));
	int idx = ip.y * 4 + ip.x;
	const float m[16] = float[16](
		0.0/16.0,  8.0/16.0,  2.0/16.0, 10.0/16.0,
		12.0/16.0, 4.0/16.0, 14.0/16.0,  6.0/16.0,
		3.0/16.0, 11.0/16.0,  1.0/16.0,  9.0/16.0,
		15.0/16.0, 7.0/16.0, 13.0/16.0,  5.0/16.0
	);
	return m[idx];
}

void vertex() {
	vec3 wp = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	v_local_y = VERTEX.y;
	// Lock ground/roots near bottom of active UV rect and sway upper fronds/crowns
	float v_span = max(0.001, uv_rect.w - uv_rect.y);
	float norm_v = clamp((UV.y - uv_rect.y) / v_span, 0.0, 1.0);
	float height_factor = hang > 0.5 ? clamp(norm_v * 1.15, 0.0, 1.0) : clamp((1.0 - norm_v) * 1.15, 0.0, 1.0);
	float sway_a = sin(TIME * 2.1 + wp.x * 0.9 + wp.z * 0.7);
	float sway_b = cos(TIME * 3.4 + wp.x * 1.7 - wp.z * 1.3);
	VERTEX.x += (sway_a * 0.65 + sway_b * 0.35) * wind_strength * height_factor;
	VERTEX.z += (sway_b * 0.55 - sway_a * 0.25) * wind_strength * 0.7 * height_factor;
	wpos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	wnrm = normalize((MODEL_MATRIX * vec4(NORMAL, 0.0)).xyz);
}

void fragment() {
	vec4 tex = texture(albedo_tex, UV * uv_mult);
	if (alpha_cut > 0.5 && tex.a < 0.34) {
		discard;
	}

	// Paso 10 (O2-scoped): progressive foliage transparency when canopy lies between camera & characters
	if (occlude_fade_enabled > 0.5 && wpos.y > 0.88) {
		float max_fade = 0.0;
		for (int i = 0; i < 4; i++) {
			vec4 hp = hero_occlude_pts[i];
			if (hp.w > 0.01) {
				vec3 seg = hp.xyz - cam_world_pos;
				float seg_len = length(seg);
				if (seg_len > 0.5) {
					vec3 seg_dir = seg / seg_len;
					vec3 rel = wpos - cam_world_pos;
					float proj = dot(rel, seg_dir);
					// Only fade foliage strictly IN FRONT of the hero toward the camera
					if (proj > 1.2 && proj < seg_len - 0.15) {
						vec3 closest = cam_world_pos + seg_dir * proj;
						float perp_d = length(wpos - closest);
						float cone_r = mix(1.05, 1.95, clamp(proj / seg_len, 0.0, 1.0));
						float rad_fade = 1.0 - smoothstep(cone_r * 0.32, cone_r, perp_d);
						float depth_fade = smoothstep(1.2, 2.8, proj) * smoothstep(seg_len - 0.10, seg_len - 0.95, proj);
						max_fade = max(max_fade, rad_fade * depth_fade * hp.w);
					}
				}
			}
		}
		if (max_fade > 0.02) {
			float fade_amt = clamp(max_fade * 0.86, 0.0, 0.86);
			if (bayer4(FRAGCOORD.xy) < fade_amt) {
				discard;
			}
		}
	}

	// Rich botanical light variation across clusters + per-instance MultiMesh tint
	float leaf_var = 0.88 + 0.18 * sin(wpos.x * 0.85 + wpos.z * 0.78 + sin(wpos.x * 0.32) * 1.4);
	vec3 inst_col = COLOR.rgb;
	vec3 col = tex.rgb * tint_col.rgb * inst_col * leaf_var;

	// Paso 8 & Paso 23.2-23.3: cohesive 3D canopy volume with softened natural woodland greens
	// (avoids individual lobe ball-shading & tones down overly bright yellow-green crown highlights)
	if (canopy_volume_boost > 0.05) {
		float up_lit = smoothstep(-0.45, 0.88, wnrm.y);
		float crown_h = smoothstep(1.3, 5.2, v_local_y);
		float dapple = 0.5 + 0.5 * sin(wpos.x * 1.55 + cos(wpos.z * 1.45) * 1.4 + wpos.y * 0.95);
		vec3 sunlit_tint = col * vec3(1.12, 1.13, 1.01) + vec3(0.006, 0.009, 0.003);
		vec3 deep_core = col * vec3(0.74, 0.80, 0.77);
		float crown_mix = clamp(up_lit * 0.34 + crown_h * 0.48 + dapple * 0.22 - 0.06, 0.0, 1.0);
		col = mix(col, mix(deep_core, sunlit_tint, crown_mix), canopy_volume_boost);
	}

	col = mix(col, col * vec3(0.68, 0.74, 0.78), wetness * 0.78);
	col = mix(col, vec3(0.84, 0.88, 0.92), snow_cover * 0.45);

	ALBEDO = col;
	ROUGHNESS = mix(mix(0.76, 0.26, wetness * 0.8), 0.82, snow_cover * 0.5);
	SPECULAR = mix(0.32, 0.62, wetness);
	METALLIC = 0.02;
	NORMAL_MAP = texture(norm_tex, UV * uv_mult * 2.4).rgb;
	NORMAL_MAP_DEPTH = 0.48;
	BACKLIGHT = backlight_tint * mix(0.45, 0.68, canopy_volume_boost) * (1.0 - snow_cover * 0.6);
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
	smat.set_shader_parameter("canopy_volume_boost", 0.0)
	smat.set_shader_parameter("occlude_fade_enabled", 0.0)
	smat.set_shader_parameter("cam_world_pos", Vector3.ZERO)
	smat.set_shader_parameter("hero_occlude_pts", [Vector4.ZERO, Vector4.ZERO, Vector4.ZERO, Vector4.ZERO])
	if exposed:
		_exposed_shaders.append(smat)
	return smat

## Unified continuous layered woodland terrain shader used on BOTH walkable clearing
## and outer forest skirt so dirt trails, moss turf, leaf litter, sediment bars and wet stream banks blend seamlessly.
static func create_forest_terrain_shader_material(exposed: bool = true) -> ShaderMaterial:
	var shader := Shader.new()
	shader.code = """
shader_type spatial;
render_mode blend_mix, depth_draw_opaque, cull_back, specular_schlick_ggx;

uniform sampler2D tex_turf : source_color, filter_linear_mipmap, repeat_enable;
uniform sampler2D tex_dirt : source_color, filter_linear_mipmap, repeat_enable;
uniform sampler2D tex_litter : source_color, filter_linear_mipmap, repeat_enable;
uniform sampler2D norm_tex : hint_normal, filter_linear_mipmap, repeat_enable;
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

float seg_dist(vec2 p, vec2 a, vec2 b) {
	vec2 pa = p - a;
	vec2 ba = b - a;
	float h = clamp(dot(pa, ba) / max(0.0001, dot(ba, ba)), 0.0, 1.0);
	return length(pa - ba * h);
}

void vertex() {
	wpos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
}

void fragment() {
	vec2 uv_a = wpos.xz * 0.22;
	vec2 uv_rot = vec2(wpos.x * 0.82 - wpos.z * 0.57, wpos.x * 0.57 + wpos.z * 0.82) * 0.25;
	vec2 uv_micro = wpos.xz * 0.72;
	float n_macro = vnoise(wpos.xz * 0.13) * 0.58 + vnoise(wpos.xz * 0.34) * 0.42;
	float n_detail = vnoise(wpos.xz * 1.12) * 0.56 + vnoise(wpos.xz * 2.95) * 0.44;
	float n_pebble = vnoise(wpos.xz * 6.4);

	// 1. Lush coastal woodland moss-turf (varied olive/emerald macro patches)
	vec3 t_m1 = texture(tex_turf, uv_a).rgb;
	vec3 t_m2 = texture(tex_turf, uv_rot * 1.35 + vec2(0.37, 0.61)).rgb;
	vec3 turf_col = mix(t_m1, t_m2, 0.45) * mix(vec3(0.46, 0.67, 0.34), vec3(0.68, 0.86, 0.45), n_macro);

	// 2. Fallen leaf litter, pine needles & rich woodland humus
	vec3 litter_tex = mix(texture(tex_litter, uv_rot * 1.18).rgb, texture(tex_litter, uv_a * 1.65 + vec2(0.29, 0.53)).rgb, 0.44);
	vec3 litter_col = litter_tex * mix(vec3(0.50, 0.39, 0.25), vec3(0.64, 0.50, 0.32), n_detail);

	// 3. Dry compacted earth trail (warm inner wear track vs cooler loamy border)
	vec3 dirt_base = mix(texture(tex_dirt, uv_rot).rgb, texture(tex_dirt, uv_a * 0.82 + vec2(0.41, 0.19)).rgb, 0.46);
	vec3 dirt_outer = dirt_base * vec3(0.68, 0.56, 0.42);
	vec3 dirt_worn = dirt_base * vec3(0.84, 0.70, 0.53);

	// 4. Sandy-pebble fluvial sediment bars & small gravel micro-detail
	vec3 sediment_col = dirt_base * mix(vec3(0.64, 0.59, 0.48), vec3(0.76, 0.71, 0.59), n_pebble);

	// Organic central clearing + gentle meandering trails (bridge -> clearing -> curved Pleamar N/S route)
	vec2 warp = vec2(n_detail - 0.5, vnoise(wpos.xz * 0.78 + vec2(4.2, 1.9)) - 0.5) * 2.15;
	vec2 wp = wpos.xz + warp;
	float d_clear = length((wp - vec2(17.8, 16.0)) * vec2(0.88, 1.08));
	float m_clear = 1.0 - smoothstep(3.6, 7.8, d_clear);

	// Curved west bridge path (slight organic meander outside bridge deck)
	float d_west_a = seg_dist(wp, vec2(-30.0, 19.2), vec2(-15.5, 16.2));
	float d_west_b = seg_dist(wp, vec2(-15.5, 16.2), vec2(-2.2, 17.5));
	float d_bridge = seg_dist(wp, vec2(-2.2, 17.5), vec2(6.5, 17.0));
	float d_bridge_in = seg_dist(wp, vec2(6.5, 17.0), vec2(15.5, 16.3));

	// Curved northern road toward Pleamar (gentle S-bends breaking straight lines)
	float d_north_a = seg_dist(wp, vec2(18.0, 13.8), vec2(19.6, 4.5));
	float d_north_b = seg_dist(wp, vec2(19.6, 4.5), vec2(17.8, -8.5));
	float d_north_c = seg_dist(wp, vec2(17.8, -8.5), vec2(22.8, -24.0));
	float d_north_d = seg_dist(wp, vec2(22.8, -24.0), vec2(21.2, -48.0));
	float d_north_e = seg_dist(wp, vec2(21.2, -48.0), vec2(26.0, -96.0));

	// Curved southern road from camp
	float d_south_a = seg_dist(wp, vec2(18.5, 19.2), vec2(20.6, 30.5));
	float d_south_b = seg_dist(wp, vec2(20.6, 30.5), vec2(24.0, 48.0));
	float d_south_c = seg_dist(wp, vec2(24.0, 48.0), vec2(21.8, 76.0));
	float d_south_d = seg_dist(wp, vec2(21.8, 76.0), vec2(25.2, 116.0));

	float d_w = min(min(d_west_a, d_west_b), min(d_bridge, d_bridge_in));
	float d_n = min(min(d_north_a, d_north_b), min(d_north_c, min(d_north_d, d_north_e)));
	float d_s = min(min(d_south_a, d_south_b), min(d_south_c, d_south_d));
	float d_trail = min(d_w, min(d_n, d_s));

	// Subtle organic trail width variation along the route
	float width_mod = 0.84 + 0.34 * vnoise(wpos.xz * 0.21 + vec2(3.1, 7.4));
	float m_trail_edge = 1.0 - smoothstep(0.95 * width_mod, 2.55 * width_mod, d_trail);
	float m_trail_core = 1.0 - smoothstep(0.25 * width_mod, 1.18 * width_mod, d_trail);

	float map_v_fade = smoothstep(0.0, 2.2, wpos.x) * smoothstep(0.0, 2.2, wpos.z) * (1.0 - smoothstep(30.8, 33.2, wpos.z));
	float packed_dirt = clamp(max(max(m_clear, m_trail_edge), COLOR.r * 0.55 * map_v_fade) + (n_detail - 0.5) * 0.28, 0.0, 1.0);
	packed_dirt = smoothstep(0.24, 0.80, packed_dirt);
	float worn_core = clamp(max(m_trail_core * 0.85, (1.0 - smoothstep(1.8, 4.8, d_clear)) * 0.72), 0.0, 1.0);

	// Litter & needle fringe concentrated around dirt transitions & wooded ground
	float trail_fringe = smoothstep(1.2, 2.4, d_trail) * (1.0 - smoothstep(2.4, 4.6, d_trail));
	float litter_w = clamp(smoothstep(0.42, 0.82, n_macro * 0.64 + n_detail * 0.36) * (1.0 - packed_dirt * 0.72) + trail_fringe * 0.42, 0.0, 0.88);
	vec3 dirt_col = mix(dirt_outer, dirt_worn, worn_core);
	// Sprinkle subtle tiny dry pebbles along trails & camp edges
	dirt_col = mix(dirt_col, sediment_col * 0.94, smoothstep(0.72, 0.90, n_pebble) * 0.38);

	vec3 ground = mix(turf_col, litter_col, litter_w * 0.62);
	ground = mix(ground, dirt_col, packed_dirt);

	// Irregular scalloped wet riverbank mud + natural inner-bend pebble/sand sediment bars
	float bank_noise = (n_detail - 0.5) * 0.055 + (n_macro - 0.5) * 0.035;
	float bank_wet = smoothstep(0.045, -0.095, wpos.y + bank_noise);
	float damp_hollow = smoothstep(-0.015, -0.075, wpos.y) * (1.0 - packed_dirt * 0.6);
	float sediment_bar = bank_wet * smoothstep(-0.18, -0.04, wpos.y) * smoothstep(0.42, 0.78, n_macro * 0.65 + n_pebble * 0.35);
	vec3 wet_mud = ground * vec3(0.46, 0.48, 0.43);
	ground = mix(ground, wet_mud, clamp(bank_wet * 0.82 + damp_hollow * 0.30, 0.0, 0.88));
	ground = mix(ground, sediment_col * 0.68, sediment_bar * 0.58);

	// Subtle organic canopy dapple variation across woodland floor
	ground *= 0.88 + n_macro * 0.25;

	// Weather modulation
	ground = mix(ground, ground * vec3(0.68, 0.72, 0.76), wetness * 0.82);
	ground = mix(ground, vec3(0.82, 0.87, 0.91), snow_cover * clamp(0.42 + n_detail * 0.28 - packed_dirt * 0.16, 0.14, 0.60));

	float base_r = mix(0.91, 0.82, packed_dirt);
	base_r = mix(base_r, 0.94, litter_w * 0.35);
	base_r = mix(base_r, 0.30, clamp(bank_wet * 0.82 + damp_hollow * 0.25, 0.0, 0.92));
	float wet_r = mix(base_r, max(0.18, base_r * 0.38), wetness);
	ROUGHNESS = mix(wet_r, 0.84, snow_cover * 0.65);
	METALLIC = 0.03;
	vec3 n_macro_map = texture(norm_tex, uv_rot * 1.45).rgb;
	vec3 n_micro_map = texture(norm_tex, uv_micro * 1.85).rgb;
	NORMAL_MAP = mix(n_macro_map, n_micro_map, 0.32 + packed_dirt * 0.18);
	NORMAL_MAP_DEPTH = mix(0.46, 0.62, packed_dirt + bank_wet * 0.25);
	ALBEDO = ground;
}
"""
	var smat := ShaderMaterial.new()
	smat.shader = shader
	var t_turf := load_tex("moss.jpg")
	var t_dirt := load_tex("path.jpg")
	var t_lit := load_tex("earth.webp")
	var nrm := load_tex("rock-normal-v1.png")
	if t_turf: smat.set_shader_parameter("tex_turf", t_turf)
	if t_dirt: smat.set_shader_parameter("tex_dirt", t_dirt)
	if t_lit: smat.set_shader_parameter("tex_litter", t_lit)
	if nrm: smat.set_shader_parameter("norm_tex", nrm)
	if exposed:
		_exposed_shaders.append(smat)
	return smat

## Weathered woven canvas tarp shader (Paso 11.10 & 11.13):
## - Visible warp/weft thread weave, stitched panel seams, edge wear/stains, roughness variation (0.78..0.95)
## - Warm fabric subsurface backlight from sun & campfire
## - Gentle local dither peek window (max 42%) strictly over an occluded character's torso while keeping
##   the tarp permanently visible and steady (User Rule #8 + OccludedSilhouette).
static func create_tarp_canvas_shader_material(
	base_tint: Color = Color("#b29d78"),
	hem_tint: Color = Color("#6e5b42"),
	exposed: bool = true
) -> ShaderMaterial:
	var shader := Shader.new()
	shader.code = """
shader_type spatial;
render_mode blend_mix, depth_draw_opaque, cull_disabled, specular_schlick_ggx;

uniform sampler2D linen_tex : source_color, filter_linear_mipmap, repeat_enable;
uniform sampler2D cloth_norm : hint_normal, filter_linear_mipmap, repeat_enable;
uniform vec4 base_col : source_color = vec4(0.70, 0.62, 0.47, 1.0);
uniform vec4 edge_col : source_color = vec4(0.43, 0.36, 0.26, 1.0);
uniform float wetness = 0.0;
uniform float snow_cover = 0.0;
uniform float occlude_fade_enabled = 0.0;
uniform vec3 cam_world_pos = vec3(0.0);
uniform vec4 hero_occlude_pts[4];

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

float bayer4(vec2 p) {
	ivec2 ip = ivec2(mod(floor(p), 4.0));
	int idx = ip.y * 4 + ip.x;
	const float m[16] = float[16](
		0.0/16.0,  8.0/16.0,  2.0/16.0, 10.0/16.0,
		12.0/16.0, 4.0/16.0, 14.0/16.0,  6.0/16.0,
		3.0/16.0, 11.0/16.0,  1.0/16.0,  9.0/16.0,
		15.0/16.0, 7.0/16.0, 13.0/16.0,  5.0/16.0
	);
	return m[idx];
}

void vertex() {
	wpos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
}

void fragment() {
	// Gentle local see-through dither window ONLY where tarp directly blocks camera->hero line of sight
	// Tarp remains permanently visible & camera never changes (User Rule #8 + Paso 11.13)
	if (occlude_fade_enabled > 0.5) {
		float max_peek = 0.0;
		for (int i = 0; i < 4; i++) {
			vec4 hp = hero_occlude_pts[i];
			if (hp.w > 0.01) {
				vec3 seg = hp.xyz - cam_world_pos;
				float seg_len = length(seg);
				if (seg_len > 0.5) {
					vec3 seg_dir = seg / seg_len;
					vec3 rel = wpos - cam_world_pos;
					float proj = dot(rel, seg_dir);
					if (proj > 0.8 && proj < seg_len - 0.05) {
						vec3 closest = cam_world_pos + seg_dir * proj;
						float perp_d = length(wpos - closest);
						float rad = 0.72;
						float r_fade = 1.0 - smoothstep(rad * 0.25, rad, perp_d);
						max_peek = max(max_peek, r_fade * hp.w);
					}
				}
			}
		}
		if (max_peek > 0.04) {
			float peek_amt = clamp(max_peek * 0.42, 0.0, 0.42);
			if (bayer4(FRAGCOORD.xy) < peek_amt) {
				discard;
			}
		}
	}

	vec2 uv_weave = UV * 3.2;
	vec3 tex_col = texture(linen_tex, uv_weave).rgb;

	// Visible fine warp/weft thread relief
	float warp = sin(UV.x * 260.0) * 0.5 + 0.5;
	float weft = sin(UV.y * 240.0) * 0.5 + 0.5;
	float weave_grain = mix(0.93, 1.07, (warp * 0.52 + weft * 0.48));

	// Stitched longitudinal canvas panel seams at u = 0.33 and u = 0.67
	float seam_1 = 1.0 - smoothstep(0.0, 0.011, abs(UV.x - 0.333));
	float seam_2 = 1.0 - smoothstep(0.0, 0.011, abs(UV.x - 0.667));
	float stitch_dash = step(0.35, fract(UV.y * 46.0));
	float seam_mask = max(seam_1, seam_2);

	// Weathering: sun-bleached ridge crown + damp/stained hem borders & corner tension patches
	float n_stain = vnoise(UV * 4.5 + vec2(1.7, 2.9)) * 0.62 + vnoise(UV * 11.5) * 0.38;
	float border_d = min(min(UV.x, 1.0 - UV.x), min(UV.y, 1.0 - UV.y));
	float edge_wear = 1.0 - smoothstep(0.015, 0.14, border_d + (n_stain - 0.5) * 0.05);
	float sun_bleach = smoothstep(0.18, 0.72, border_d) * smoothstep(0.38, 0.85, n_stain);

	vec3 alb = tex_col * base_col.rgb * weave_grain;
	alb = mix(alb, alb * vec3(1.12, 1.09, 1.03), sun_bleach * 0.42);
	alb = mix(alb, tex_col * edge_col.rgb, clamp(edge_wear * 0.68 + (1.0 - n_stain) * 0.24, 0.0, 0.78));
	alb = mix(alb, tex_col * edge_col.rgb * (0.76 + stitch_dash * 0.34), seam_mask * 0.65);

	// Weather response (rain darkening + frost)
	alb = mix(alb, alb * vec3(0.65, 0.69, 0.73), wetness * 0.82);
	alb = mix(alb, vec3(0.86, 0.89, 0.92), snow_cover * clamp(0.45 + n_stain * 0.25 - edge_wear * 0.2, 0.12, 0.58));

	float rough = clamp(0.84 + (1.0 - n_stain) * 0.11 - sun_bleach * 0.06 + edge_wear * 0.05, 0.76, 0.95);
	rough = mix(rough, max(0.28, rough * 0.48), wetness);
	ROUGHNESS = mix(rough, 0.86, snow_cover * 0.6);
	METALLIC = 0.02;
	SPECULAR = 0.28;
	NORMAL_MAP = texture(cloth_norm, uv_weave * 1.4).rgb;
	NORMAL_MAP_DEPTH = 0.52;
	BACKLIGHT = base_col.rgb * vec3(0.46, 0.38, 0.26) * (1.0 - wetness * 0.4);
	ALBEDO = alb;
}
"""
	var smat := ShaderMaterial.new()
	smat.shader = shader
	var t_lin := load_tex("linen.webp")
	if t_lin == null:
		t_lin = load_tex("linen-v4.webp")
	var n_cloth := make_organic_normal("cloth", 128)
	if t_lin: smat.set_shader_parameter("linen_tex", t_lin)
	if n_cloth: smat.set_shader_parameter("cloth_norm", n_cloth)
	smat.set_shader_parameter("base_col", base_tint)
	smat.set_shader_parameter("edge_col", hem_tint)
	smat.set_shader_parameter("occlude_fade_enabled", 0.0)
	smat.set_shader_parameter("cam_world_pos", Vector3.ZERO)
	smat.set_shader_parameter("hero_occlude_pts", [Vector4.ZERO, Vector4.ZERO, Vector4.ZERO, Vector4.ZERO])
	if exposed:
		_exposed_shaders.append(smat)
	return smat
