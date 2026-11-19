class_name PbrMaterialKit
extends RefCounted

# Kit de Materiales Ilustrados PBR Completos del Pecio (Capas 3 y 4)
# Sintetiza mapas de Normales (Sobel), Roughness y Ambient Occlusion en caché
# desde las texturas autorizadas, más helpers reutilizables de colisión y oclusión.

const TEX_TIMBER = preload("res://assets/textures/ship-timber-illustrated-v1.png")
const TEX_BASALT = preload("res://assets/textures/basalt-illustrated-v1.png")
const TEX_OAK = preload("res://assets/textures/oak-illustrated-v1.png")
const TEX_COLORMAP = preload("res://assets/models/Textures/colormap.png")
const SHADER_HULL_WEATHERED = preload("res://shaders/hull_weathered.gdshader")
const SHADER_KENNEY_WEATHERED = preload("res://shaders/kenney_weathered.gdshader")
const SHADER_FLOOD_WATER = preload("res://shaders/flood_water.gdshader")
const SHADER_UNDERWATER_CAUSTICS = preload("res://shaders/underwater_caustics.gdshader")
const SHADER_WRECK_PLANK = preload("res://shaders/wreck_plank_weathered.gdshader")

static var _kenney_mat: Material = null
static var _pbr_map_cache: Dictionary = {}
static var _runtime_tex_cache: Dictionary = {}

# Compatibility for the current hull/bone builders. Keep their existing PBR family.
static func get_iron_material() -> StandardMaterial3D:
	return create_iron_pbr()

static func create_dark_hull_pbr(base_hex: String = "#23170f") -> StandardMaterial3D:
	return create_weathered_hull_pbr(base_hex)

static func create_leather_pbr(base_hex: String = "#5d3924") -> StandardMaterial3D:
	# Keep the current rough fabric family while the cabin builder shares its API.
	return create_moldy_cloth_pbr(base_hex)

static func _load_tex_safe(res_path: String, fallback: Texture2D) -> Texture2D:
	if _runtime_tex_cache.has(res_path):
		return _runtime_tex_cache[res_path]
	var tex: Texture2D = null
	if ResourceLoader.exists(res_path):
		tex = load(res_path) as Texture2D
	if not tex:
		var abs_path := ProjectSettings.globalize_path(res_path)
		if FileAccess.file_exists(abs_path):
			var img := Image.load_from_file(abs_path)
			if img and not img.is_empty():
				img.generate_mipmaps()
				tex = ImageTexture.create_from_image(img)
	if not tex:
		tex = fallback
	_runtime_tex_cache[res_path] = tex
	return tex

static func _get_pbr_maps(tex: Texture2D, strength: float = 2.4, rough_floor: float = 0.55, rough_ceil: float = 0.95) -> Dictionary:
	var key := "%s_%.2f_%.2f_%.2f" % [str(tex.resource_path if tex.resource_path != "" else tex.get_instance_id()), strength, rough_floor, rough_ceil]
	if _pbr_map_cache.has(key):
		return _pbr_map_cache[key]

	var result := {"normal": null, "roughness": null, "ao": null}
	if not tex:
		_pbr_map_cache[key] = result
		return result

	var src := tex.get_image()
	if not src:
		_pbr_map_cache[key] = result
		return result

	var img: Image = src.duplicate()
	if img.is_compressed():
		img.decompress()
	img.convert(Image.FORMAT_RGBA8)
	var sz := 256
	if img.get_width() != sz or img.get_height() != sz:
		img.resize(sz, sz, Image.INTERPOLATE_BILINEAR)

	# Buffer de luminancia rápido para derivar normal, rugosidad y oclusión de juntas
	var lum := PackedFloat32Array()
	lum.resize(sz * sz)
	for y in range(sz):
		for x in range(sz):
			var c := img.get_pixel(x, y)
			lum[y * sz + x] = c.r * 0.299 + c.g * 0.587 + c.b * 0.114

	var nrm_img := Image.create(sz, sz, false, Image.FORMAT_RGBA8)
	var rgh_img := Image.create(sz, sz, false, Image.FORMAT_RGBA8)
	var ao_img := Image.create(sz, sz, false, Image.FORMAT_RGBA8)

	for y in range(sz):
		var ym := (y - 1 + sz) % sz
		var yp := (y + 1) % sz
		for x in range(sz):
			var xm := (x - 1 + sz) % sz
			var xp := (x + 1) % sz

			var tl := lum[ym * sz + xm]; var t := lum[ym * sz + x]; var tr := lum[ym * sz + xp]
			var l := lum[y * sz + xm];   var c_l := lum[y * sz + x]; var r := lum[y * sz + xp]
			var bl := lum[yp * sz + xm]; var b := lum[yp * sz + x]; var br := lum[yp * sz + xp]

			var dx := ((tr + 2.0 * r + br) - (tl + 2.0 * l + bl)) * (strength * 0.25)
			var dy := ((bl + 2.0 * b + br) - (tl + 2.0 * t + tr)) * (strength * 0.25)
			var n := Vector3(-dx, -dy, 1.0).normalized()
			nrm_img.set_pixel(x, y, Color(n.x * 0.5 + 0.5, n.y * 0.5 + 0.5, n.z * 0.5 + 0.5, 1.0))

			# Juntas y vetas oscuras -> más ásperas y con sombra AO de cavidad
			var r_val := lerpf(rough_ceil, rough_floor, clampf(c_l * 1.15, 0.0, 1.0))
			rgh_img.set_pixel(x, y, Color(r_val, r_val, r_val, 1.0))

			var ao_val := clampf(0.45 + c_l * 0.65, 0.42, 1.0)
			ao_img.set_pixel(x, y, Color(ao_val, ao_val, ao_val, 1.0))

	nrm_img.generate_mipmaps()
	rgh_img.generate_mipmaps()
	ao_img.generate_mipmaps()

	result["normal"] = ImageTexture.create_from_image(nrm_img)
	result["roughness"] = ImageTexture.create_from_image(rgh_img)
	result["ao"] = ImageTexture.create_from_image(ao_img)
	_pbr_map_cache[key] = result
	return result

static func _attach_pbr_channels(mat: StandardMaterial3D, tex: Texture2D, relief: float = 2.4, normal_scale: float = 0.85, rough_floor: float = 0.58, rough_ceil: float = 0.94, ao_affect: float = 0.48) -> void:
	var maps := _get_pbr_maps(tex, relief, rough_floor, rough_ceil)
	if maps["normal"]:
		mat.normal_enabled = true
		mat.normal_texture = maps["normal"]
		mat.normal_scale = normal_scale
	if maps["roughness"]:
		mat.roughness_texture = maps["roughness"]
		mat.roughness_texture_channel = BaseMaterial3D.TEXTURE_CHANNEL_RED
	if maps["ao"]:
		mat.ao_enabled = true
		mat.ao_texture = maps["ao"]
		mat.ao_texture_channel = BaseMaterial3D.TEXTURE_CHANNEL_RED
		mat.ao_light_affect = ao_affect

static func get_kenney_material() -> Material:
	if not _kenney_mat:
		var smat := ShaderMaterial.new()
		smat.shader = SHADER_KENNEY_WEATHERED
		var grime_tex := _load_tex_safe("res://assets/textures/rough_wood_diff_1k.png", TEX_TIMBER)
		var maps := _get_pbr_maps(grime_tex, 2.8, 0.62, 0.96)
		smat.set_shader_parameter("albedo_tex", TEX_COLORMAP)
		smat.set_shader_parameter("grime_tex", grime_tex)
		if maps["normal"]:
			smat.set_shader_parameter("normal_tex", maps["normal"])
		if maps["roughness"]:
			smat.set_shader_parameter("roughness_tex", maps["roughness"])
		if maps["ao"]:
			smat.set_shader_parameter("ao_tex", maps["ao"])
		_kenney_mat = smat
	return _kenney_mat

static func apply_kenney_material(node: Node) -> void:
	if node is MeshInstance3D:
		var mat := get_kenney_material()
		node.material_override = mat
		if node.mesh:
			for s in range(node.mesh.get_surface_count()):
				node.set_surface_override_material(s, mat)
	for child in node.get_children():
		apply_kenney_material(child)

static func create_wood_planks_pbr(base_hex: String = "#988975", uv_scale: float = 0.28) -> StandardMaterial3D:
	var mat := StandardMaterial3D.new()
	mat.albedo_texture = TEX_TIMBER
	mat.albedo_color = Color(base_hex)
	mat.roughness = 0.86
	mat.specular_mode = BaseMaterial3D.SPECULAR_SCHLICK_GGX
	mat.metallic_specular = 0.18
	mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	mat.texture_filter = BaseMaterial3D.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS_ANISOTROPIC
	mat.uv1_scale = Vector3(uv_scale, uv_scale, uv_scale)
	mat.uv1_triplanar = true
	mat.uv1_triplanar_sharpness = 4.0
	_attach_pbr_channels(mat, TEX_TIMBER, 2.5, 0.90, 0.60, 0.95, 0.50)
	return mat

static func create_cabin_floor_pbr(base_hex: String = "#e0d2ba", uv_scale: float = 0.28) -> StandardMaterial3D:
	var floor_tex := _load_tex_safe("res://assets/textures/old_wood_floor_diff_1k.png", TEX_TIMBER)
	var mat := StandardMaterial3D.new()
	mat.albedo_texture = floor_tex
	mat.albedo_color = Color(base_hex)
	mat.roughness = 0.80
	mat.specular_mode = BaseMaterial3D.SPECULAR_SCHLICK_GGX
	mat.metallic_specular = 0.22
	mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	mat.texture_filter = BaseMaterial3D.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS_ANISOTROPIC
	mat.uv1_scale = Vector3(uv_scale, uv_scale, uv_scale)
	mat.uv1_triplanar = true
	mat.uv1_triplanar_sharpness = 4.0
	_attach_pbr_channels(mat, floor_tex, 2.0, 0.34, 0.64, 0.94, 0.36)
	return mat

static func create_structural_deck_pbr() -> StandardMaterial3D:
	# Existing illustrated planks: 8 m along grain / 4 m across (13 rows).
	# Keep grain and joints readable without deriving strong relief from paint.
	var mat := create_wood_planks_pbr("#b3b5a2", 0.25)
	mat.uv1_scale = Vector3(0.125, 0.25, 0.25)
	mat.normal_scale = 0.22
	mat.roughness = 0.96
	mat.metallic_specular = 0.10
	mat.ao_light_affect = 0.25
	return mat

static func create_weathered_hull_pbr(base_hex: String = "#5e5244") -> StandardMaterial3D:
	var rough_tex := _load_tex_safe("res://assets/textures/rough_wood_diff_1k.png", TEX_TIMBER)
	var mat := StandardMaterial3D.new()
	mat.albedo_texture = rough_tex
	mat.albedo_color = Color(base_hex)
	mat.roughness = 0.90
	mat.specular_mode = BaseMaterial3D.SPECULAR_SCHLICK_GGX
	mat.metallic_specular = 0.16
	mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	mat.texture_filter = BaseMaterial3D.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS_ANISOTROPIC
	mat.uv1_scale = Vector3(0.24, 0.24, 0.24)
	mat.uv1_triplanar = true
	mat.uv1_triplanar_sharpness = 3.5
	_attach_pbr_channels(mat, rough_tex, 2.6, 0.95, 0.62, 0.96, 0.52)
	return mat

static func create_hull_weathered_shader_material() -> ShaderMaterial:
	var smat := ShaderMaterial.new()
	smat.shader = SHADER_HULL_WEATHERED
	var hull_tex := _load_tex_safe("res://assets/textures/rough_wood_diff_1k.png", TEX_TIMBER)
	var maps := _get_pbr_maps(hull_tex, 2.7, 0.58, 0.95)
	smat.set_shader_parameter("albedo_tex", hull_tex)
	if maps["normal"]:
		smat.set_shader_parameter("normal_tex", maps["normal"])
	if maps["roughness"]:
		smat.set_shader_parameter("roughness_tex", maps["roughness"])
	if maps["ao"]:
		smat.set_shader_parameter("ao_tex", maps["ao"])
	return smat

static func create_oak_furniture_pbr(base_hex: String = "#82674a", uv_scale: float = 0.42) -> StandardMaterial3D:
	var mat := StandardMaterial3D.new()
	mat.albedo_texture = TEX_OAK
	mat.albedo_color = Color(base_hex)
	mat.roughness = 0.72
	mat.specular_mode = BaseMaterial3D.SPECULAR_SCHLICK_GGX
	mat.metallic_specular = 0.24
	mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	mat.texture_filter = BaseMaterial3D.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS_ANISOTROPIC
	mat.uv1_scale = Vector3(uv_scale, uv_scale, uv_scale)
	mat.uv1_triplanar = true
	mat.uv1_triplanar_sharpness = 4.0
	_attach_pbr_channels(mat, TEX_OAK, 2.2, 0.72, 0.48, 0.86, 0.40)
	return mat

static func create_fossil_bone_pbr(base_hex: String = "#a3957f") -> StandardMaterial3D:
	var mat := StandardMaterial3D.new()
	mat.albedo_texture = TEX_OAK
	mat.albedo_color = Color(base_hex)
	mat.roughness = 0.76
	mat.specular_mode = BaseMaterial3D.SPECULAR_SCHLICK_GGX
	mat.metallic_specular = 0.18
	mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	mat.texture_filter = BaseMaterial3D.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS_ANISOTROPIC
	mat.uv1_scale = Vector3(0.25, 0.25, 0.25)
	mat.uv1_triplanar = true
	mat.uv1_triplanar_sharpness = 4.0
	_attach_pbr_channels(mat, TEX_OAK, 1.9, 0.65, 0.56, 0.86, 0.38)
	return mat

static func create_basalt_rock_pbr(base_hex: String = "#4e585b", uv_scale: float = 0.18) -> StandardMaterial3D:
	var mat := StandardMaterial3D.new()
	mat.albedo_texture = TEX_BASALT
	mat.albedo_color = Color(base_hex)
	mat.roughness = 0.76
	mat.specular_mode = BaseMaterial3D.SPECULAR_SCHLICK_GGX
	mat.metallic_specular = 0.30
	mat.texture_filter = BaseMaterial3D.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS_ANISOTROPIC
	mat.uv1_scale = Vector3(uv_scale, uv_scale, uv_scale)
	mat.uv1_triplanar = true
	mat.uv1_triplanar_sharpness = 3.0
	_attach_pbr_channels(mat, TEX_BASALT, 2.6, 0.78, 0.56, 0.90, 0.42)
	return mat

static func create_iron_pbr(base_hex: String = "#2e3436", metallic_val: float = 0.62, rough_val: float = 0.68) -> StandardMaterial3D:
	var mat := StandardMaterial3D.new()
	mat.albedo_texture = TEX_BASALT
	mat.albedo_color = Color(base_hex).lerp(Color("#473124"), 0.28)
	mat.metallic = metallic_val
	mat.roughness = rough_val
	mat.specular_mode = BaseMaterial3D.SPECULAR_SCHLICK_GGX
	mat.uv1_scale = Vector3(1.2, 1.2, 1.2)
	mat.uv1_triplanar = true
	_attach_pbr_channels(mat, TEX_BASALT, 2.1, 0.55, 0.52, 0.88, 0.42)
	return mat

static func create_aged_copper_pbr(base_hex: String = "#5b4836") -> StandardMaterial3D:
	# Bronce/cobre con pátina verdosa (verdigris) de 50 años de humedad salina
	var mat := StandardMaterial3D.new()
	mat.albedo_texture = TEX_BASALT
	mat.albedo_color = Color(base_hex).lerp(Color("#4c6c59"), 0.38)
	mat.metallic = 0.48
	mat.roughness = 0.72
	mat.specular_mode = BaseMaterial3D.SPECULAR_SCHLICK_GGX
	mat.uv1_scale = Vector3(1.6, 1.6, 1.6)
	mat.uv1_triplanar = true
	_attach_pbr_channels(mat, TEX_BASALT, 2.0, 0.50, 0.55, 0.86, 0.45)
	return mat

static func create_stained_bone_pbr(base_hex: String = "#938b76") -> StandardMaterial3D:
	var mat := StandardMaterial3D.new()
	mat.albedo_texture = TEX_OAK
	mat.albedo_color = Color(base_hex)
	mat.roughness = 0.90
	mat.metallic_specular = 0.10
	mat.specular_mode = BaseMaterial3D.SPECULAR_SCHLICK_GGX
	mat.uv1_scale = Vector3(0.65, 0.65, 0.65)
	mat.uv1_triplanar = true
	_attach_pbr_channels(mat, TEX_BASALT, 2.4, 0.72, 0.68, 0.96, 0.52)
	return mat

static func _get_dragon_bone_texture() -> Texture2D:
	const CACHE_KEY := "__dragon_bone_albedo_v1__"
	if _runtime_tex_cache.has(CACHE_KEY):
		return _runtime_tex_cache[CACHE_KEY]

	const SZ := 256
	var grain_noise := FastNoiseLite.new()
	grain_noise.seed = 4049
	grain_noise.noise_type = FastNoiseLite.TYPE_SIMPLEX_SMOOTH
	grain_noise.fractal_type = FastNoiseLite.FRACTAL_FBM
	grain_noise.fractal_octaves = 4
	grain_noise.frequency = 0.032

	var crack_noise := FastNoiseLite.new()
	crack_noise.seed = 9187
	crack_noise.noise_type = FastNoiseLite.TYPE_CELLULAR
	crack_noise.cellular_distance_function = FastNoiseLite.DISTANCE_EUCLIDEAN
	crack_noise.cellular_return_type = FastNoiseLite.RETURN_DISTANCE2_SUB
	crack_noise.frequency = 0.028

	var moss_noise := FastNoiseLite.new()
	moss_noise.seed = 7723
	moss_noise.noise_type = FastNoiseLite.TYPE_PERLIN
	moss_noise.fractal_type = FastNoiseLite.FRACTAL_FBM
	moss_noise.fractal_octaves = 3
	moss_noise.frequency = 0.022

	var img_grain: Image = grain_noise.get_seamless_image(SZ, SZ)
	var img_crack: Image = crack_noise.get_seamless_image(SZ, SZ)
	var img_moss: Image = moss_noise.get_seamless_image(SZ, SZ)

	var out := Image.create(SZ, SZ, false, Image.FORMAT_RGBA8)
	var col_bone_warm := Color("#dbd0b7")
	var col_bone_deep := Color("#9e8f6f")
	var col_brine := Color("#6b563c")
	var col_moss := Color("#4c5c43")
	var col_crack := Color("#2e261b")

	for y in range(SZ):
		for x in range(SZ):
			var g := img_grain.get_pixel(x, y).r
			var c := img_crack.get_pixel(x, y).r
			var m := img_moss.get_pixel(x, y).r
			# Striated longitudinal osteon fibers blended with weathered fossil ivory base
			var striation := 0.5 + 0.5 * sin(float(y) * 0.32 + g * 4.4)
			var base := col_bone_deep.lerp(col_bone_warm, clampf(0.32 + g * 0.50 + striation * 0.16, 0.0, 1.0))
			# Subtle brine/sediment patina in grain troughs (no spotty blotches)
			var brine_w := smoothstep(0.62, 0.86, m * 0.55 + (1.0 - g) * 0.45)
			base = base.lerp(col_brine, brine_w * 0.38)
			# Fine lichen patina only deep inside organic cracks
			var moss_w := smoothstep(0.58, 0.84, m) * (1.0 - smoothstep(0.05, 0.20, c))
			base = base.lerp(col_moss, clampf(moss_w * 0.42, 0.0, 0.48))
			# Sharp fossilized fracture fissures
			var fissure := 1.0 - smoothstep(0.025, 0.11, c)
			base = base.lerp(col_crack, fissure * 0.68)
			out.set_pixel(x, y, base)

	out.generate_mipmaps()
	var tex := ImageTexture.create_from_image(out)
	_runtime_tex_cache[CACHE_KEY] = tex
	return tex

static func create_mineralized_bone_pbr(base_hex: String = "#d2be90") -> StandardMaterial3D:
	# Weathered Gold Dragon bone PBR: procedural fossilized ochre/moss/brine texture,
	# never inherits planks/nails from TEX_OAK, and supports wetness & normal/roughness relief.
	var bone_tex := _get_dragon_bone_texture()
	var mat := StandardMaterial3D.new()
	mat.albedo_texture = bone_tex
	mat.albedo_color = Color(base_hex)
	mat.roughness = 0.84
	mat.metallic = 0.06
	mat.metallic_specular = 0.22
	mat.specular_mode = BaseMaterial3D.SPECULAR_SCHLICK_GGX
	mat.uv1_scale = Vector3(0.42, 0.42, 0.42)
	mat.uv1_triplanar = true
	mat.uv1_triplanar_sharpness = 2.6
	mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	_attach_pbr_channels(mat, bone_tex, 2.8, 0.92, 0.58, 0.96, 0.55)
	return mat

static func create_moldy_cloth_pbr(base_hex: String = "#4e493d") -> StandardMaterial3D:
	var mat := StandardMaterial3D.new()
	var linen := _load_tex_safe("res://assets/textures/linen-reused-v4.webp", TEX_TIMBER)
	mat.albedo_texture = linen
	mat.albedo_color = Color(base_hex)
	mat.roughness = 0.97
	mat.metallic_specular = 0.06
	mat.specular_mode = BaseMaterial3D.SPECULAR_SCHLICK_GGX
	mat.uv1_scale = Vector3(0.75, 0.75, 0.75)
	mat.uv1_triplanar = true
	_attach_pbr_channels(mat, linen, 1.4, 0.16, 0.84, 0.98, 0.18)
	return mat

static func create_flood_water_material(deep_hold: bool = false) -> ShaderMaterial:
	var smat := ShaderMaterial.new()
	smat.shader = SHADER_FLOOD_WATER
	smat.set_shader_parameter("is_deep_hold", 1.0 if deep_hold else 0.0)
	return smat

static func create_underwater_caustics_material() -> ShaderMaterial:
	var smat := ShaderMaterial.new()
	smat.shader = SHADER_UNDERWATER_CAUSTICS
	return smat

static func create_rope_cable_pbr(base_hex: String = "#5c4e38") -> StandardMaterial3D:
	var mat := StandardMaterial3D.new()
	mat.albedo_texture = TEX_OAK
	mat.albedo_color = Color(base_hex)
	mat.roughness = 0.92
	mat.specular_mode = BaseMaterial3D.SPECULAR_SCHLICK_GGX
	mat.uv1_scale = Vector3(1.8, 1.8, 1.8)
	mat.uv1_triplanar = true
	_attach_pbr_channels(mat, TEX_OAK, 2.2, 0.70, 0.65, 0.95, 0.42)
	return mat

static func create_salt_bleached_wood_pbr(base_hex: String = "#a39e91") -> StandardMaterial3D:
	var mat := StandardMaterial3D.new()
	mat.albedo_texture = TEX_TIMBER
	mat.albedo_color = Color(base_hex)
	mat.roughness = 0.94
	mat.specular_mode = BaseMaterial3D.SPECULAR_SCHLICK_GGX
	mat.metallic_specular = 0.10
	mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	mat.texture_filter = BaseMaterial3D.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS_ANISOTROPIC
	mat.uv1_scale = Vector3(0.24, 0.24, 0.24)
	mat.uv1_triplanar = true
	mat.uv1_triplanar_sharpness = 3.5
	_attach_pbr_channels(mat, TEX_TIMBER, 2.2, 0.78, 0.74, 0.98, 0.45)
	return mat

static func create_waterlogged_wood_pbr(base_hex: String = "#2e342a") -> StandardMaterial3D:
	var mat := StandardMaterial3D.new()
	mat.albedo_texture = TEX_TIMBER
	mat.albedo_color = Color(base_hex)
	mat.roughness = 0.50
	mat.specular_mode = BaseMaterial3D.SPECULAR_SCHLICK_GGX
	mat.metallic_specular = 0.36
	mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	mat.texture_filter = BaseMaterial3D.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS_ANISOTROPIC
	mat.uv1_scale = Vector3(0.22, 0.22, 0.22)
	mat.uv1_triplanar = true
	mat.uv1_triplanar_sharpness = 3.5
	_attach_pbr_channels(mat, TEX_TIMBER, 2.4, 0.85, 0.28, 0.66, 0.45)
	return mat

static func create_barnacle_pbr(base_hex: String = "#bfb8a8") -> StandardMaterial3D:
	var mat := StandardMaterial3D.new()
	mat.albedo_texture = TEX_BASALT
	mat.albedo_color = Color(base_hex)
	mat.roughness = 0.96
	mat.specular_mode = BaseMaterial3D.SPECULAR_SCHLICK_GGX
	mat.metallic_specular = 0.08
	mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	mat.texture_filter = BaseMaterial3D.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS_ANISOTROPIC
	mat.uv1_scale = Vector3(0.45, 0.45, 0.45)
	mat.uv1_triplanar = true
	mat.uv1_triplanar_sharpness = 4.0
	_attach_pbr_channels(mat, TEX_BASALT, 3.2, 1.15, 0.76, 0.98, 0.55)
	return mat

static func create_algae_pbr(base_hex: String = "#253b28") -> StandardMaterial3D:
	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color(base_hex)
	mat.roughness = 0.38
	mat.metallic_specular = 0.40
	mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	return mat

static func add_box_collider(parent: Node3D, col_name: String, size: Vector3, local_pos: Vector3 = Vector3.ZERO) -> StaticBody3D:
	var body := StaticBody3D.new()
	body.name = col_name
	body.position = local_pos
	var cs := CollisionShape3D.new()
	var box := BoxShape3D.new()
	box.size = size
	cs.shape = box
	body.add_child(cs)
	parent.add_child(body)
	return body

static func add_cyl_collider(parent: Node3D, col_name: String, radius: float, height: float, local_pos: Vector3 = Vector3.ZERO) -> StaticBody3D:
	var body := StaticBody3D.new()
	body.name = col_name
	body.position = local_pos
	var cs := CollisionShape3D.new()
	var cyl := CylinderShape3D.new()
	cyl.radius = radius
	cyl.height = height
	cs.shape = cyl
	body.add_child(cs)
	parent.add_child(body)
	return body

static func add_occluder_box(parent: Node3D, occ_name: String, size: Vector3, local_pos: Vector3 = Vector3.ZERO) -> OccluderInstance3D:
	var occ := OccluderInstance3D.new()
	occ.name = occ_name
	occ.position = local_pos
	var box := BoxOccluder3D.new()
	box.size = size
	occ.occluder = box
	parent.add_child(occ)
	return occ

static func create_rust_stain_mesh(size_x: float = 1.0, size_z: float = 1.0, opacity: float = 0.7) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	mi.name = "RustStain"
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	var plane := PlaneMesh.new()
	plane.size = Vector2(size_x, size_z)
	mi.mesh = plane

	var grad := Gradient.new()
	grad.set_color(0, Color(0.48, 0.22, 0.08, opacity))
	grad.set_color(1, Color(0.35, 0.16, 0.06, 0.0))

	var tex := GradientTexture2D.new()
	tex.gradient = grad
	tex.fill = GradientTexture2D.FILL_RADIAL
	tex.fill_from = Vector2(0.5, 0.5)
	tex.fill_to = Vector2(0.5, 0.0)
	tex.width = 64
	tex.height = 64

	var mat := StandardMaterial3D.new()
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.albedo_texture = tex
	mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	mat.depth_draw_mode = BaseMaterial3D.DEPTH_DRAW_DISABLED
	mat.render_priority = 2
	mi.material_override = mat
	return mi

static func create_blob_shadow(radius_x: float = 0.6, radius_z: float = 0.6, opacity: float = 0.58) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	mi.name = "BlobShadow"
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	var plane := PlaneMesh.new()
	plane.size = Vector2(radius_x * 2.0, radius_z * 2.0)
	mi.mesh = plane

	var grad := Gradient.new()
	grad.set_color(0, Color(0.015, 0.02, 0.03, opacity))
	grad.add_point(0.45, Color(0.015, 0.02, 0.03, opacity * 0.58))
	grad.set_color(2, Color(0.015, 0.02, 0.03, 0.0))

	var tex := GradientTexture2D.new()
	tex.gradient = grad
	tex.fill = GradientTexture2D.FILL_RADIAL
	tex.fill_from = Vector2(0.5, 0.5)
	tex.fill_to = Vector2(0.5, 0.0)
	tex.width = 64
	tex.height = 64

	var mat := StandardMaterial3D.new()
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.albedo_texture = tex
	mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	mat.depth_draw_mode = BaseMaterial3D.DEPTH_DRAW_DISABLED
	mat.render_priority = 2
	mi.material_override = mat
	return mi

static func create_contact_shadow_rect(width_x: float = 1.6, depth_z: float = 1.0, opacity: float = 0.72, slope_z: float = 0.015) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	mi.name = "ContactShadowRect"
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	var plane := PlaneMesh.new()
	plane.size = Vector2(width_x, depth_z)
	mi.mesh = plane
	mi.rotation.x = -atan(slope_z)

	var tex_key := "__contact_rect_tex__"
	var tex: Texture2D
	if _runtime_tex_cache.has(tex_key):
		tex = _runtime_tex_cache[tex_key]
	else:
		var sz := 64
		var img := Image.create(sz, sz, false, Image.FORMAT_RGBA8)
		for py in range(sz):
			var ny := absf((float(py) + 0.5) / float(sz) * 2.0 - 1.0)
			for px in range(sz):
				var nx := absf((float(px) + 0.5) / float(sz) * 2.0 - 1.0)
				# Rounded-rectangle contact AO falloff (dense under legs/plinth, smooth outer penumbra)
				var qx := maxf(nx - 0.52, 0.0)
				var qy := maxf(ny - 0.52, 0.0)
				var d := (sqrt(qx * qx + qy * qy) + minf(maxf(nx - 0.52, ny - 0.52), 0.0)) / 0.48
				var a := clampf(1.0 - smoothstep(0.0, 1.0, clampf(d + 0.35, 0.0, 1.0)), 0.0, 1.0)
				img.set_pixel(px, py, Color(0.015, 0.02, 0.03, a))
		img.generate_mipmaps()
		tex = ImageTexture.create_from_image(img)
		_runtime_tex_cache[tex_key] = tex

	var mat := StandardMaterial3D.new()
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.albedo_color = Color(1.0, 1.0, 1.0, opacity)
	mat.albedo_texture = tex
	mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	mat.depth_draw_mode = BaseMaterial3D.DEPTH_DRAW_DISABLED
	mat.render_priority = 2
	mi.material_override = mat
	return mi

static func create_wreck_plank_shader_material(plank_width: float = 0.34, moss_strength: float = 0.48, puddle_strength: float = 0.52, edge_grime_width: float = 0.0) -> ShaderMaterial:
	var smat := ShaderMaterial.new()
	smat.shader = SHADER_WRECK_PLANK
	var plank_tex := _load_tex_safe("res://assets/textures/rough_wood_diff_1k.png", TEX_TIMBER)
	var maps := _get_pbr_maps(plank_tex, 2.75, 0.44, 0.94)
	smat.set_shader_parameter("albedo_tex", plank_tex)
	if maps["normal"]:
		smat.set_shader_parameter("normal_tex", maps["normal"])
	if maps["roughness"]:
		smat.set_shader_parameter("roughness_tex", maps["roughness"])
	if maps["ao"]:
		smat.set_shader_parameter("ao_tex", maps["ao"])
	smat.set_shader_parameter("plank_width", plank_width)
	smat.set_shader_parameter("moss_strength", moss_strength)
	smat.set_shader_parameter("puddle_strength", puddle_strength)
	smat.set_shader_parameter("edge_grime_width", edge_grime_width)
	return smat

static func create_wet_wreck_wood_pbr(base_hex: String = "#3a463d", uv_scale: float = 0.28, roughness_val: float = 0.62, specular_val: float = 0.34) -> StandardMaterial3D:
	var rough_tex := _load_tex_safe("res://assets/textures/rough_wood_diff_1k.png", TEX_TIMBER)
	var mat := StandardMaterial3D.new()
	mat.albedo_texture = rough_tex
	mat.albedo_color = Color(base_hex)
	mat.roughness = roughness_val
	mat.specular_mode = BaseMaterial3D.SPECULAR_SCHLICK_GGX
	mat.metallic_specular = specular_val
	mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	mat.texture_filter = BaseMaterial3D.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS_ANISOTROPIC
	mat.uv1_scale = Vector3(uv_scale, uv_scale, uv_scale)
	mat.uv1_triplanar = true
	mat.uv1_triplanar_sharpness = 4.0
	_attach_pbr_channels(mat, rough_tex, 2.8, 1.05, clampf(roughness_val - 0.16, 0.24, 0.72), 0.92, 0.56)
	return mat

static func create_nacre_inlay_material() -> StandardMaterial3D:
	# Nácar envejecido con iridiscencia perlada tenue para la inscripción invertida "Rosa de los Vientos"
	var mat := StandardMaterial3D.new()
	mat.albedo_texture = TEX_BASALT
	mat.albedo_color = Color("#d9e8e4")
	mat.metallic = 0.26
	mat.roughness = 0.24
	mat.specular_mode = BaseMaterial3D.SPECULAR_SCHLICK_GGX
	mat.metallic_specular = 0.72
	mat.clearcoat_enabled = true
	mat.clearcoat = 0.58
	mat.clearcoat_roughness = 0.22
	mat.emission_enabled = true
	mat.emission = Color("#8fb9b6")
	mat.emission_energy_multiplier = 0.14
	mat.uv1_scale = Vector3(2.5, 2.5, 2.5)
	mat.uv1_triplanar = true
	return mat

static func create_dry_straw_pbr(base_hex: String = "#977f4c") -> StandardMaterial3D:
	var mat := StandardMaterial3D.new()
	mat.albedo_texture = TEX_OAK
	mat.albedo_color = Color(base_hex)
	mat.roughness = 0.93
	mat.metallic_specular = 0.08
	mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	mat.uv1_scale = Vector3(1.4, 1.4, 1.4)
	mat.uv1_triplanar = true
	_attach_pbr_channels(mat, TEX_OAK, 2.9, 0.85, 0.78, 0.96, 0.52)
	return mat

static func create_wood_shaving_pbr(base_hex: String = "#a88f63") -> StandardMaterial3D:
	var mat := StandardMaterial3D.new()
	mat.albedo_texture = TEX_OAK
	mat.albedo_color = Color(base_hex)
	mat.roughness = 0.84
	mat.metallic_specular = 0.14
	mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	mat.uv1_scale = Vector3(2.2, 2.2, 2.2)
	mat.uv1_triplanar = true
	_attach_pbr_channels(mat, TEX_OAK, 2.2, 0.62, 0.68, 0.92, 0.42)
	return mat

static func add_barnacle_cluster(parent: Node3D, pos: Vector3, surface_normal: Vector3, count: int = 7, base_scale: float = 0.042, seed_val: int = 101) -> Node3D:
	var rng := RandomNumberGenerator.new()
	rng.seed = seed_val
	var cluster := Node3D.new()
	cluster.name = "BarnacleCluster_%d" % seed_val
	cluster.position = pos
	var up_n := surface_normal.normalized()
	if up_n.length_squared() < 0.01:
		up_n = Vector3.UP
	var ref := Vector3.FORWARD if absf(up_n.dot(Vector3.UP)) > 0.9 else Vector3.UP
	var tx := up_n.cross(ref).normalized()
	var tz := tx.cross(up_n).normalized()
	cluster.basis = Basis(tx, up_n, tz)
	parent.add_child(cluster)

	var shell_mat := create_barnacle_pbr("#c4beb0")
	var hole_mat := create_iron_pbr("#1d201d", 0.05, 0.95)
	for i in range(count):
		var a := rng.randf_range(0.0, TAU)
		var r := rng.randf_range(0.0, base_scale * 2.1)
		var s := rng.randf_range(0.68, 1.32) * base_scale
		var b_node := MeshInstance3D.new()
		var cone := CylinderMesh.new()
		cone.top_radius = s * 0.44
		cone.bottom_radius = s
		cone.height = s * 1.15
		cone.radial_segments = 7
		b_node.mesh = cone
		b_node.material_override = shell_mat
		b_node.position = Vector3(cos(a) * r, s * 0.45, sin(a) * r)
		b_node.rotation = Vector3(rng.randf_range(-0.18, 0.18), rng.randf_range(0.0, TAU), rng.randf_range(-0.18, 0.18))
		cluster.add_child(b_node)

		var pore := MeshInstance3D.new()
		var p_cyl := CylinderMesh.new()
		p_cyl.top_radius = s * 0.25
		p_cyl.bottom_radius = s * 0.22
		p_cyl.height = s * 0.22
		p_cyl.radial_segments = 6
		pore.mesh = p_cyl
		pore.material_override = hole_mat
		pore.position = Vector3(0, s * 0.50, 0)
		b_node.add_child(pore)
	return cluster

static func add_kelp_strand(parent: Node3D, pos: Vector3, hang_axis: Vector3, length: float = 0.55, width: float = 0.08, seed_val: int = 202) -> MeshInstance3D:
	var rng := RandomNumberGenerator.new()
	rng.seed = seed_val
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var mat := create_algae_pbr("#264024")
	mat.roughness = 0.34
	mat.metallic_specular = 0.44
	st.set_material(mat)

	var dir := hang_axis.normalized()
	if dir.length_squared() < 0.01:
		dir = Vector3.DOWN
	var side := dir.cross(Vector3.UP if absf(dir.y) < 0.92 else Vector3.FORWARD).normalized()
	var norm_out := side.cross(dir).normalized()
	var segs := 5
	for i in range(segs):
		var t0 := float(i) / float(segs)
		var t1 := float(i + 1) / float(segs)
		var w0 := width * (1.0 - t0 * 0.65)
		var w1 := width * (1.0 - t1 * 0.65)
		var sw0 := sin(t0 * 4.5 + rng.randf() * 1.2) * width * 0.35
		var sw1 := sin(t1 * 4.5 + rng.randf() * 1.2) * width * 0.35
		var p0 := dir * (t0 * length) + side * sw0 + norm_out * (sin(t0 * PI) * 0.028)
		var p1 := dir * (t1 * length) + side * sw1 + norm_out * (sin(t1 * PI) * 0.028)
		var a := p0 - side * w0 * 0.5
		var b := p0 + side * w0 * 0.5
		var c := p1 + side * w1 * 0.5
		var d := p1 - side * w1 * 0.5
		st.set_uv(Vector2(0, t0)); st.add_vertex(a)
		st.set_uv(Vector2(1, t0)); st.add_vertex(b)
		st.set_uv(Vector2(1, t1)); st.add_vertex(c)
		st.set_uv(Vector2(0, t0)); st.add_vertex(a)
		st.set_uv(Vector2(1, t1)); st.add_vertex(c)
		st.set_uv(Vector2(0, t1)); st.add_vertex(d)
	st.generate_normals()
	var mi := MeshInstance3D.new()
	mi.name = "KelpStrand_%d" % seed_val
	mi.position = pos
	mi.mesh = st.commit()
	parent.add_child(mi)
	return mi

static func add_contact_ao_disc(parent: Node3D, pos: Vector3, radius_x: float = 0.6, radius_z: float = 0.6, opacity: float = 0.62, slope_z: float = 0.015) -> MeshInstance3D:
	var ao := create_blob_shadow(radius_x, radius_z, opacity)
	ao.name = "ContactAO"
	ao.position = pos
	ao.rotation.x = -atan(slope_z)
	parent.add_child(ao)
	return ao
