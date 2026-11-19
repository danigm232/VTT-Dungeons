@tool
class_name RetreatLayoutBuilder
extends Node3D

# ==============================================================================
# CONSTRUCTOR DEL LAYOUT ESPACIAL 2.5D AMPLIADO DEL RETIRO DEL DRAGÓN
# Paridad con Babylon.js (R3 + Expansion + Stone S3 + SAL1-4 + Forest/Temple):
# - 13 superficies transitables ampliadas (1.599 casillas en retreat-terrain-v2.json)
# - Módulos .glb esculpidos de Babylon (A1-A5, montaña volcánica, acantilados,
#   bosquete del embarcadero, explanada de expedición, 86 árboles y jardineras)
# - Recorte táctico (cutaway) en A2/A3/A4 para interiores legibles
# - 6 celdas excavadas de A1, hoguera, estatua de Astalagan y 16 landmarks
# ==============================================================================

const Structure = preload("res://scripts/retreat_structure.gd")
const MapExitScript = preload("res://scripts/map_exit.gd")
const SceneEnhancer = preload("res://scripts/retreat_scene_enhancer.gd")
const OcclusionCtrl = preload("res://scripts/object_occlusion_controller.gd")

const TERRAIN_JSON_PATH := "res://assets/data/retreat-terrain-v2.json"
const GLOBAL_LAYOUT_JSON_PATH := "res://assets/data/global-layout.json"

const GLB_ARCH_PATH := "res://assets/retreat-modules/retreat_architecture_canon.glb"
const GLB_GEO_PATH := "res://assets/retreat-modules/retreat_geography_stone.glb"
const GLB_R3_PATH := "res://assets/retreat-modules/retreat_landscape_r3.glb"

var _tex_cache: Dictionary = {}

# Materiales PBR / ilustrados compartidos
var mat_beach: StandardMaterial3D
var mat_wet_sand: StandardMaterial3D
var mat_plaza: StandardMaterial3D
var mat_cell_floor: StandardMaterial3D
var mat_rock: StandardMaterial3D
var mat_rock_carved: StandardMaterial3D
var mat_rock_dark: StandardMaterial3D
var mat_wood: StandardMaterial3D
var mat_wood_dark: StandardMaterial3D
var mat_upper: StandardMaterial3D
var mat_trail: StandardMaterial3D
var mat_sacred: StandardMaterial3D
var mat_column: StandardMaterial3D
var mat_ocean: Material
var mat_pool_water: Material
var mat_marker: StandardMaterial3D
var mat_bronze: StandardMaterial3D
var mat_platinum: StandardMaterial3D
var mat_gold: StandardMaterial3D
var mat_foliage_pine: StandardMaterial3D
var mat_foliage_olive: StandardMaterial3D
var mat_flame: StandardMaterial3D
var mat_cloth_blue: StandardMaterial3D
var mat_cloth_warm: StandardMaterial3D
var mat_books: StandardMaterial3D
var mat_iron: StandardMaterial3D

var _mat_paving_glb: StandardMaterial3D
var _mat_rock_glb: StandardMaterial3D
var _mat_carved_glb: StandardMaterial3D
var _mat_earth_glb: StandardMaterial3D
var _mat_wood_glb: StandardMaterial3D
var _mat_dark_wood_glb: StandardMaterial3D
var _mat_limestone_glb: StandardMaterial3D
var _mat_sculpture_glb: StandardMaterial3D
var _mat_metal_glb: StandardMaterial3D
var _mat_brass_glb: StandardMaterial3D
var _mat_pottery_glb: StandardMaterial3D
var _mat_linen_glb: StandardMaterial3D
var _mat_blue_cloth_glb: StandardMaterial3D
var _mat_red_cloth_glb: StandardMaterial3D
var _mat_flower_glb: StandardMaterial3D
var _mat_herb_glb: StandardMaterial3D
var _mat_foliage_v6_glb: StandardMaterial3D
var _mat_foliage_sage_glb: StandardMaterial3D
var _mat_foliage_dark_glb: StandardMaterial3D
var _mat_foliage_flower_glb: StandardMaterial3D
var _mat_water_glb: Material
var _mat_forest_earth_glb: StandardMaterial3D
var _mat_astalagan_glb: StandardMaterial3D

var winch_lever_pivot: Node3D
var winch_pallet_rig: Node3D
var winch_cable_mesh: MeshInstance3D
var winch_is_lowered: bool = false
var _winch_blend: float = 0.0
var _cave_roof_entries: Array[Dictionary] = []
var _cave_roofs_force_open: bool = false

func _ready() -> void:
	build_layout()

func _process(delta: float) -> void:
	if Engine.is_editor_hint():
		return
	var target_blend := 1.0 if winch_is_lowered else 0.0
	if not is_equal_approx(_winch_blend, target_blend):
		_winch_blend = move_toward(_winch_blend, target_blend, delta * 0.85)
		_apply_winch_visual_state(_winch_blend)
	if not _cave_roof_entries.is_empty() and not _cave_roofs_force_open:
		SceneEnhancer.update_cave_roof_cutaways(self, _cave_roof_entries)
	OcclusionCtrl.update(self, delta)

func set_all_cave_roofs_open(open: bool) -> void:
	_cave_roofs_force_open = open
	for entry in _cave_roof_entries:
		var roof_node: Node3D = entry.get("node", null)
		if is_instance_valid(roof_node):
			roof_node.visible = not open

func toggle_winch_lever() -> bool:
	winch_is_lowered = not winch_is_lowered
	return winch_is_lowered

func _apply_winch_visual_state(t: float) -> void:
	if winch_lever_pivot:
		winch_lever_pivot.rotation_degrees.x = lerpf(-22.0, 34.0, t)
	var pallet_y := lerpf(12.2, 0.55, t)
	if winch_pallet_rig:
		winch_pallet_rig.position.y = pallet_y
	if winch_cable_mesh:
		var top_y := 16.55
		var span := maxf(0.4, top_y - (pallet_y + 0.35))
		winch_cable_mesh.scale.y = span
		winch_cable_mesh.position.y = pallet_y + 0.35 + span * 0.5

func _load_tex(file_name: String) -> Texture2D:
	if _tex_cache.has(file_name):
		return _tex_cache[file_name]
	var res_path := "res://assets/textures/" + file_name
	if not FileAccess.file_exists(res_path):
		return null
	var bytes := FileAccess.get_file_as_bytes(res_path)
	if bytes.is_empty():
		return null
	var img := Image.new()
	var err := OK
	if bytes.size() >= 4 and bytes[0] == 0x89 and bytes[1] == 0x50 and bytes[2] == 0x4E and bytes[3] == 0x47:
		err = img.load_png_from_buffer(bytes)
	elif bytes.size() >= 3 and bytes[0] == 0xFF and bytes[1] == 0xD8 and bytes[2] == 0xFF:
		err = img.load_jpg_from_buffer(bytes)
	elif bytes.size() >= 4 and bytes[0] == 0x52 and bytes[1] == 0x49 and bytes[2] == 0x46 and bytes[3] == 0x46:
		err = img.load_webp_from_buffer(bytes)
	else:
		img = Image.load_from_file(ProjectSettings.globalize_path(res_path))
		err = OK if img and not img.is_empty() else ERR_CANT_OPEN
	if err != OK or img.is_empty():
		return null
	if img.get_width() > 1024 or img.get_height() > 1024:
		img.resize(mini(img.get_width(), 1024), mini(img.get_height(), 1024), Image.INTERPOLATE_BILINEAR)
	if not img.has_mipmaps():
		img.generate_mipmaps()
	var tex := ImageTexture.create_from_image(img)
	_tex_cache[file_name] = tex
	return tex

func _init_materials() -> void:
	if mat_beach != null:
		return

	var tex_plaza := _load_tex("a1-plaza-v6.png")
	var tex_cell := _load_tex("a1-cell-v6.png")
	var tex_basalt := _load_tex("basalt-coastal-albedo-v1.webp")
	var tex_cliff := _load_tex("a1-cliff-rugged-v8.jpg")
	var tex_coastal_rock := _load_tex("coastal-rock.png")
	var tex_oak := _load_tex("oak-v4.webp")
	var tex_limestone := _load_tex("limestone-v3.webp")
	var tex_ashlar := _load_tex("ashlar-v4.webp")
	var tex_earth := _load_tex("earth.webp")
	var tex_wool := _load_tex("wool-v4.webp")
	var tex_linen := _load_tex("linen-v4.webp")
	var tex_foliage := _load_tex("foliage-atlas.png")
	var norm_rock := _load_tex("rock-normal-v1.png")
	var norm_wood := _load_tex("wood-normal-v1.png")

	mat_beach = _make_textured_mat(Color("#dfd0ab"), 0.90, 0.0, tex_earth, 0.22, true, norm_rock, 0.24)
	mat_wet_sand = _make_textured_mat(Color("#9c896a"), 0.22, 0.04, tex_earth, 0.24, true, norm_rock, 0.18)
	mat_plaza = _make_textured_mat(Color("#d4cbb8"), 0.82, 0.0, tex_plaza, 0.30, true, norm_rock, 0.45)
	mat_cell_floor = _make_textured_mat(Color("#c4bba8"), 0.84, 0.0, tex_cell, 0.36, true, norm_rock, 0.48)
	mat_rock = _make_textured_mat(Color("#88948e"), 0.86, 0.0, tex_basalt if tex_basalt else tex_cliff, 0.16, true, norm_rock, 0.68)
	mat_rock_carved = _make_textured_mat(Color("#9ea79d"), 0.84, 0.0, tex_coastal_rock if tex_coastal_rock else tex_cliff, 0.26, true, norm_rock, 0.65)
	mat_rock_dark = _make_textured_mat(Color("#66706b"), 0.90, 0.0, tex_basalt if tex_basalt else tex_cliff, 0.16, true, norm_rock, 0.70)
	mat_wood = _make_textured_mat(Color("#bf9a70"), 0.72, 0.0, tex_oak, 0.50, true, norm_wood, 0.55)
	mat_wood_dark = _make_textured_mat(Color("#7c5b3b"), 0.80, 0.0, tex_oak, 0.50, true, norm_wood, 0.58)
	mat_upper = _make_textured_mat(Color("#cac0ab"), 0.82, 0.0, tex_ashlar if tex_ashlar else tex_plaza, 0.32, true, norm_rock, 0.48)
	mat_trail = _make_textured_mat(Color("#c4b89f"), 0.88, 0.0, tex_earth, 0.28, true, norm_rock, 0.38)
	mat_sacred = _make_textured_mat(Color("#e3dfd5"), 0.68, 0.03, tex_limestone, 0.35, true, norm_rock, 0.42)
	mat_column = _make_textured_mat(Color("#cfc6b1"), 0.74, 0.02, tex_limestone, 0.35, true, norm_rock, 0.45)

	var ocean_shader := Shader.new()
	ocean_shader.code = """
shader_type spatial;
render_mode blend_mix, depth_draw_never, cull_disabled, specular_schlick_ggx;

uniform sampler2D depth_tex : hint_depth_texture, filter_linear_mipmap;
uniform sampler2D normal_tex : hint_normal, filter_linear_mipmap, repeat_enable;
uniform vec4 shallow_color : source_color = vec4(0.11, 0.45, 0.50, 0.74);
uniform vec4 deep_color : source_color = vec4(0.035, 0.16, 0.26, 0.94);
uniform vec4 foam_color : source_color = vec4(0.89, 0.94, 0.95, 0.88);
uniform float water_depth_range = 4.2;
uniform float foam_range = 0.42;
uniform float wave_speed = 0.028;
uniform float wave_scale = 0.085;
uniform float wave_amp = 0.025;
uniform float alpha_scale = 1.0;

varying vec3 world_pos;

void vertex() {
	world_pos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	if (wave_amp > 0.001) {
		VERTEX.y += sin(world_pos.x * 0.22 + TIME * 0.95) * cos(world_pos.z * 0.20 + TIME * 0.80) * wave_amp;
	}
}

void fragment() {
	float raw_depth = texture(depth_tex, SCREEN_UV).x;
	vec3 ndc = vec3(SCREEN_UV * 2.0 - 1.0, raw_depth);
	vec4 view_p = INV_PROJECTION_MATRIX * vec4(ndc, 1.0);
	view_p.xyz /= view_p.w;
	float water_depth = max(0.0, VERTEX.z - view_p.z);
	if (raw_depth < 0.0001) {
		water_depth = water_depth_range;
	}
	float depth_t = smoothstep(0.0, 1.0, clamp(water_depth / water_depth_range, 0.0, 1.0));

	vec2 uv1 = world_pos.xz * wave_scale + vec2(TIME * wave_speed, TIME * wave_speed * 0.52);
	vec2 uv2 = world_pos.xz * (wave_scale * 1.72) + vec2(-TIME * wave_speed * 0.65, TIME * wave_speed * 0.78);
	vec3 n1 = texture(normal_tex, uv1).xyz * 2.0 - 1.0;
	vec3 n2 = texture(normal_tex, uv2).xyz * 2.0 - 1.0;
	vec3 n_mix = normalize(vec3((n1.xy + n2.xy) * 0.22, 1.0));
	NORMAL_MAP = vec3(n_mix.x * 0.5 + 0.5, n_mix.y * 0.5 + 0.5, 1.0);
	NORMAL_MAP_DEPTH = 0.52;

	float fresnel = pow(1.0 - clamp(dot(normalize(NORMAL), normalize(VIEW)), 0.0, 1.0), 3.2);
	float surf_wave = sin(world_pos.x * 0.95 + world_pos.z * 0.85 + TIME * 1.4) * 0.5 + 0.5;
	float shore_foam = (1.0 - smoothstep(0.03, foam_range, water_depth)) * (0.45 + 0.38 * surf_wave + n_mix.x * 0.28);
	float crest_foam = smoothstep(0.76, 0.98, shore_foam + n_mix.x * 0.22) * 0.18;
	float foam_mask = clamp(shore_foam + crest_foam * (1.0 - depth_t * 0.80), 0.0, 1.0);

	vec3 base_col = mix(shallow_color.rgb, deep_color.rgb, depth_t);
	vec3 sky_refl = vec3(0.70, 0.82, 0.89);
	vec3 water_col = mix(base_col, sky_refl, fresnel * 0.34);
	ALBEDO = mix(water_col, foam_color.rgb, foam_mask * 0.54);
	ALPHA = clamp(mix(shallow_color.a, deep_color.a, depth_t) + foam_mask * 0.14, 0.58, 0.97) * alpha_scale;
	ROUGHNESS = mix(0.08, 0.46, foam_mask);
	METALLIC = 0.04;
	SPECULAR = 0.65;
}
"""
	var ocean_smat := ShaderMaterial.new()
	ocean_smat.shader = ocean_shader
	if norm_rock:
		ocean_smat.set_shader_parameter("normal_tex", norm_rock)
	mat_ocean = ocean_smat

	var pool_smat := StandardMaterial3D.new()
	pool_smat.albedo_color = Color(0.16, 0.50, 0.56, 0.82)
	if norm_rock:
		pool_smat.normal_enabled = true
		pool_smat.normal_texture = norm_rock
		pool_smat.normal_scale = 0.22
	pool_smat.roughness = 0.08
	pool_smat.metallic = 0.06
	pool_smat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat_pool_water = pool_smat

	mat_marker = StandardMaterial3D.new()
	mat_marker.albedo_color = Color(0.92, 0.74, 0.30, 0.62)
	mat_marker.emission_enabled = true
	mat_marker.emission = Color(0.92, 0.72, 0.28)
	mat_marker.emission_energy_multiplier = 0.42
	mat_marker.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA

	mat_bronze = _make_mat(Color("#9a7448"), 0.36, 0.72)
	mat_platinum = _make_mat(Color("#d8dde6"), 0.28, 0.75)
	mat_gold = StandardMaterial3D.new()
	mat_gold.albedo_color = Color("#f0be42")
	mat_gold.metallic = 0.7
	mat_gold.roughness = 0.32
	mat_gold.emission_enabled = true
	mat_gold.emission = Color("#d89a1c")
	mat_gold.emission_energy_multiplier = 0.35

	mat_foliage_pine = _make_mat(Color("#2f6e36"), 0.82, 0.0)
	mat_foliage_pine.backlight_enabled = true
	mat_foliage_pine.backlight = Color(0.24, 0.46, 0.16)
	mat_foliage_olive = _make_mat(Color("#54883e"), 0.80, 0.0)
	mat_foliage_olive.backlight_enabled = true
	mat_foliage_olive.backlight = Color(0.28, 0.50, 0.18)

	mat_flame = StandardMaterial3D.new()
	mat_flame.albedo_color = Color(1.0, 0.62, 0.18)
	mat_flame.emission_enabled = true
	mat_flame.emission = Color(1.0, 0.48, 0.10)
	mat_flame.emission_energy_multiplier = 2.8

	mat_cloth_blue = _make_textured_mat(Color("#5b7892"), 0.92, 0.0, tex_wool, 0.65, true)
	mat_cloth_warm = _make_textured_mat(Color("#ae6b58"), 0.92, 0.0, tex_linen, 0.65, true)
	mat_books = _make_mat(Color("#7a3c2e"), 0.85, 0.05)
	mat_iron = _make_mat(Color("#3b4144"), 0.45, 0.75)

	# Materiales específicos para mallas importadas de Babylon (.glb)
	# Conservan vertex_color_use_as_albedo para mostrar AO/musgo/desgaste originales.
	_mat_rock_glb = _make_glb_mat(Color("#acb7b0"), 0.86, 0.0, tex_basalt if tex_basalt else tex_cliff, 0.14, norm_rock, true, 0.68)
	_mat_carved_glb = _make_glb_mat(Color("#b9c0b7"), 0.82, 0.0, tex_coastal_rock if tex_coastal_rock else tex_basalt, 0.18, norm_rock, true, 0.65)
	_mat_paving_glb = _make_glb_mat(Color("#d4cdbe"), 0.82, 0.0, tex_plaza if tex_plaza else tex_ashlar, 0.28, norm_rock, true, 0.50)
	_mat_earth_glb = _make_glb_mat(Color("#beb99c"), 0.90, 0.0, tex_earth, 0.26, null, true)
	_mat_forest_earth_glb = _make_glb_mat(Color("#559c3e"), 0.88, 0.0, tex_earth, 0.22, null, true)
	_mat_forest_earth_glb.backlight_enabled = true
	_mat_forest_earth_glb.backlight = Color(0.18, 0.38, 0.12)
	_mat_wood_glb = _make_glb_mat(Color("#c6a074"), 0.76, 0.0, tex_oak, 0.52, norm_wood, true, 0.55)
	_mat_dark_wood_glb = _make_glb_mat(Color("#8c6a48"), 0.80, 0.0, tex_oak, 0.52, null, true)
	_mat_limestone_glb = _make_glb_mat(Color("#bbb49f"), 0.80, 0.0, tex_limestone, 0.36, norm_rock, true, 0.48)
	_mat_sculpture_glb = _make_glb_mat(Color("#d2cab6"), 0.78, 0.04, tex_limestone, 0.28, norm_rock, true, 0.45)
	_mat_astalagan_glb = _make_glb_mat(Color("#9e8b6a"), 0.62, 0.22, tex_limestone, 0.28, norm_rock, true, 0.52)
	_mat_metal_glb = _make_glb_mat(Color("#545a5c"), 0.46, 0.72, null, 1.0, null, true)
	_mat_brass_glb = _make_glb_mat(Color("#be8842"), 0.32, 0.72, null, 1.0, null, true)
	_mat_pottery_glb = _make_glb_mat(Color("#b66d4b"), 0.78, 0.0, null, 1.0, null, true)
	_mat_linen_glb = _make_glb_mat(Color("#eadcc7"), 0.90, 0.0, tex_linen, 0.65, null, true, 0.50, true)
	_mat_blue_cloth_glb = _make_glb_mat(Color("#6886a0"), 0.90, 0.0, tex_linen, 0.65, null, true, 0.50, true)
	_mat_red_cloth_glb = _make_glb_mat(Color("#b66959"), 0.90, 0.0, tex_wool, 0.65, null, true, 0.50, true)
	_mat_flower_glb = _make_glb_mat(Color("#f4dc7a"), 0.76, 0.0, null, 1.0, null, true)
	_mat_herb_glb = _make_glb_mat(Color("#4ca03c"), 0.82, 0.0, null, 1.0, null, true)
	_mat_herb_glb.backlight_enabled = true
	_mat_herb_glb.backlight = Color(0.24, 0.48, 0.16)
	_mat_foliage_v6_glb = _make_foliage_cutout_mat(Color("#a8e07b"), tex_foliage)
	_mat_foliage_sage_glb = _make_foliage_cutout_mat(Color("#92d474"), tex_foliage)
	_mat_foliage_dark_glb = _make_foliage_cutout_mat(Color("#4c9642"), tex_foliage)
	_mat_foliage_flower_glb = _make_foliage_cutout_mat(Color("#f6e09e"), tex_foliage)

	var water_glb_smat := (mat_ocean as ShaderMaterial).duplicate() as ShaderMaterial
	water_glb_smat.set_shader_parameter("wave_amp", 0.0)
	water_glb_smat.set_shader_parameter("alpha_scale", 0.18)
	_mat_water_glb = water_glb_smat

func _make_mat(col: Color, rough: float, metal: float) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = col
	m.roughness = rough
	m.metallic = metal
	return m

func _make_textured_mat(col: Color, rough: float, metal: float, tex: Texture2D, world_scale: float, use_triplanar: bool, norm_tex: Texture2D = null, norm_strength: float = 0.45) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = col
	m.roughness = rough
	m.metallic = metal
	if tex:
		m.albedo_texture = tex
		if use_triplanar:
			m.uv1_triplanar = true
			m.uv1_world_triplanar = true
			m.uv1_triplanar_sharpness = 2.0
		m.uv1_scale = Vector3(world_scale, world_scale, world_scale)
	if norm_tex:
		m.normal_enabled = true
		m.normal_texture = norm_tex
		m.normal_scale = norm_strength
	return m

func _make_glb_mat(col: Color, rough: float, metal: float, tex: Texture2D, world_scale: float, norm_tex: Texture2D, use_vertex_color: bool, norm_strength: float = 0.50, _allow_two_sided: bool = true) -> StandardMaterial3D:
	var m := _make_textured_mat(col, rough, metal, tex, world_scale, true, norm_tex, norm_strength)
	m.cull_mode = BaseMaterial3D.CULL_DISABLED
	m.vertex_color_use_as_albedo = use_vertex_color
	return m

func _make_foliage_cutout_mat(col: Color, tex: Texture2D) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = col
	m.roughness = 0.82
	m.metallic = 0.0
	m.cull_mode = BaseMaterial3D.CULL_DISABLED
	m.vertex_color_use_as_albedo = true
	m.backlight_enabled = true
	m.backlight = Color(0.28, 0.52, 0.18)
	if tex:
		m.albedo_texture = tex
		m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA_SCISSOR
		m.alpha_scissor_threshold = 0.35
	return m

func build_layout() -> void:
	if has_node("Surfaces"):
		return
	OcclusionCtrl.clear_registry()
	_init_materials()
	# Conservamos el nombre "RetreatLayoutBuilder" para que MainController
	# y VttRoleUi detecten correctamente la escena del Retiro del Dragón.

	var global_data: Dictionary = _load_json_dict(GLOBAL_LAYOUT_JSON_PATH)
	var terrain_data: Dictionary = _load_json_dict(TERRAIN_JSON_PATH)

	_build_ocean()
	_build_surfaces(terrain_data)
	_build_safety_colliders()
	_build_coastal_pier_and_beach()
	_build_a1_cells()
	_build_a1_plaza_details()
	_build_a2_winch_house(global_data)
	_build_a3_dining_hall(global_data)
	_build_a4_library(global_data)
	_build_a5_temple(global_data)
	_build_staircases()
	_build_babylon_glb_modules()
	SceneEnhancer.build_rooms_and_plaza_furniture(self)
	_cave_roof_entries = SceneEnhancer.build_cave_roofs_and_archways(self)
	_build_lush_planters_and_gardens()
	_build_lush_mountain_forest(terrain_data)
	SceneEnhancer.build_vibrant_grass_and_planters(self, terrain_data)
	_build_landmarks()
	_build_scenic_transition_paths()
	_optimize_scene_lights(self)

func _optimize_scene_lights(node: Node) -> void:
	if node is OmniLight3D:
		var ol := node as OmniLight3D
		ol.shadow_enabled = false
		ol.distance_fade_enabled = true
		ol.distance_fade_begin = 38.0
		ol.distance_fade_length = 12.0
	for child in node.get_children():
		_optimize_scene_lights(child)

func _load_json_dict(res_path: String) -> Dictionary:
	if not FileAccess.file_exists(res_path):
		return {}
	var txt := FileAccess.get_file_as_string(res_path)
	if txt.is_empty():
		return {}
	var parsed = JSON.parse_string(txt)
	return parsed if parsed is Dictionary else {}

# 1. Manto oceánico circundante a cota 0.0m
func _build_ocean() -> void:
	var ocean_mesh := PlaneMesh.new()
	ocean_mesh.size = Vector2(900.0, 800.0)
	ocean_mesh.subdivide_width = 24
	ocean_mesh.subdivide_depth = 24
	var inst := MeshInstance3D.new()
	inst.name = "OceanPlane"
	inst.mesh = ocean_mesh
	inst.material_override = mat_ocean
	inst.position = Vector3(84.0, Structure.ELEV_SEA, 68.0)
	inst.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(inst)

	# Fondo marino escalonado bajo la ensenada para gradiente turquesa -> azul abisal
	var seabed_mesh := PlaneMesh.new()
	seabed_mesh.size = Vector2(900.0, 800.0)
	var seabed := MeshInstance3D.new()
	seabed.name = "SeabedPlane"
	seabed.mesh = seabed_mesh
	seabed.material_override = _make_mat(Color("#16343e"), 0.96, 0.0)
	seabed.position = Vector3(84.0, -3.4, 68.0)
	seabed.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(seabed)

# 2. Las 13 superficies ampliadas (1.599 casillas) con colisión trimesh exacta
func _build_surfaces(terrain_data: Dictionary) -> void:
	var surfaces_node := Node3D.new()
	surfaces_node.name = "Surfaces"
	add_child(surfaces_node)

	var surf_array: Array = terrain_data.get("surfaces", [])
	if surf_array.is_empty():
		_build_fallback_surfaces(surfaces_node)
		return

	var id_to_node := {
		"beach": "Surface_Beach",
		"a1": "Surface_A1_Plaza",
		"cliff": "Surface_Cliff",
		"a2": "Surface_A2_WinchDeck",
		"upper": "Surface_UpperWalkway",
		"a3": "Surface_A3_DiningFloor",
		"a4": "Surface_A4_LibraryFloor",
		"a5": "Surface_A5_TemplePlatform",
		"pleamar": "Surface_PleamarTrail",
		"observatorio": "Surface_ObservatoryTrail",
		"island-pleamar-low": "Surface_IslandPleamarLow",
		"island-pleamar-high": "Surface_IslandPleamarHigh",
		"island-observatory": "Surface_IslandObservatory"
	}

	var id_to_mat := {
		"beach": mat_beach,
		"a1": mat_plaza,
		"cliff": mat_rock_carved,
		"a2": mat_wood,
		"upper": mat_upper,
		"a3": mat_cell_floor,
		"a4": mat_cell_floor,
		"a5": mat_sacred,
		"pleamar": mat_trail,
		"observatorio": mat_trail,
		"island-pleamar-low": mat_beach,
		"island-pleamar-high": mat_rock,
		"island-observatory": mat_trail
	}

	# Nota: Las superficies ya cubiertas visualmente por losas .glb esculpidas
	# reciben un desplazamiento mínimo de -0.05m y faldón corto de 0.12m para evitar
	# z-fighting o muros salientes sobre los acantilados de Babylon, manteniendo la colisión.
	var covered_by_glb := ["a1", "cliff", "a2", "a3", "a4", "a5", "upper", "observatorio", "island-observatory"]

	for surf in surf_array:
		var sid: String = str(surf.get("id", ""))
		var tiles: Array = surf.get("tiles", [])
		if sid.is_empty() or tiles.is_empty():
			continue
		var node_name: String = id_to_node.get(sid, "Surface_" + sid)
		var mat: Material = id_to_mat.get(sid, mat_upper)
		var is_sea_level := sid in ["beach", "pleamar", "island-pleamar-low"]
		var is_covered := sid in covered_by_glb
		var skin_offset := -0.02 if is_covered else 0.0
		var skirt_drop := 0.14 if is_covered else (0.55 if is_sea_level else 0.32)
		var min_skirt_y := -1.2 if is_sea_level else -9999.0
		_build_tiled_surface_mesh(surfaces_node, node_name, tiles, mat, skirt_drop, min_skirt_y, skin_offset)

func _build_tiled_surface_mesh(parent: Node, node_name: String, tiles: Array, mat: Material, skirt_drop: float, min_skirt_y: float, skin_offset: float = 0.0) -> void:
	var t := Structure.TILE_METERS
	var tile_map: Dictionary = {}
	for entry in tiles:
		var cell: Dictionary = entry.get("cell", {})
		var col: int = int(cell.get("col", 0))
		var row: int = int(cell.get("row", 0))
		tile_map[Vector2i(col, row)] = entry.get("corners", [0.0, 0.0, 0.0, 0.0])

	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)

	for entry in tiles:
		var cell: Dictionary = entry.get("cell", {})
		var col: int = int(cell.get("col", 0))
		var row: int = int(cell.get("row", 0))
		var c: Array = entry.get("corners", [0.0, 0.0, 0.0, 0.0])
		var is_sw_cove_override := (
			(node_name == "Surface_Beach" and ((col <= 17 and row >= 68) or (col <= 19 and row >= 73)))
			or (node_name in ["Surface_PleamarTrail", "Surface_IslandPleamarLow"] and col <= 11 and row >= 55)
		)
		var tile_offset := -4.2 if is_sw_cove_override else (-0.18 if (node_name == "Surface_PleamarTrail" and row >= 55) else skin_offset)
		var y00 := float(c[0]) + tile_offset
		var y10 := float(c[1]) + tile_offset
		var y11 := float(c[2]) + tile_offset
		var y01 := float(c[3]) + tile_offset

		var x0 := float(col) * t
		var x1 := float(col + 1) * t
		var z0 := float(row) * t
		var z1 := float(row + 1) * t

		var p00 := Vector3(x0, y00, z0)
		var p10 := Vector3(x1, y10, z0)
		var p11 := Vector3(x1, y11, z1)
		var p01 := Vector3(x0, y01, z1)

		st.set_uv(Vector2(x0 * 0.25, z0 * 0.25)); st.add_vertex(p00)
		st.set_uv(Vector2(x1 * 0.25, z0 * 0.25)); st.add_vertex(p10)
		st.set_uv(Vector2(x1 * 0.25, z1 * 0.25)); st.add_vertex(p11)

		st.set_uv(Vector2(x0 * 0.25, z0 * 0.25)); st.add_vertex(p00)
		st.set_uv(Vector2(x1 * 0.25, z1 * 0.25)); st.add_vertex(p11)
		st.set_uv(Vector2(x0 * 0.25, z1 * 0.25)); st.add_vertex(p01)

		var k_n := Vector2i(col, row - 1)
		if not tile_map.has(k_n):
			var b00 := Vector3(x0, minf(min_skirt_y, y00 - skirt_drop) if min_skirt_y > -9000.0 else (y00 - skirt_drop), z0)
			var b10 := Vector3(x1, minf(min_skirt_y, y10 - skirt_drop) if min_skirt_y > -9000.0 else (y10 - skirt_drop), z0)
			_add_quad_uv(st, p10, p00, b00, b10)
		else:
			var nc: Array = tile_map[k_n]
			if float(nc[3]) + skin_offset < y00 - 0.05 or float(nc[2]) + skin_offset < y10 - 0.05:
				_add_quad_uv(st, p10, p00, Vector3(x0, float(nc[3]) + skin_offset, z0), Vector3(x1, float(nc[2]) + skin_offset, z0))

		var k_s := Vector2i(col, row + 1)
		if not tile_map.has(k_s):
			var b01 := Vector3(x0, minf(min_skirt_y, y01 - skirt_drop) if min_skirt_y > -9000.0 else (y01 - skirt_drop), z1)
			var b11 := Vector3(x1, minf(min_skirt_y, y11 - skirt_drop) if min_skirt_y > -9000.0 else (y11 - skirt_drop), z1)
			_add_quad_uv(st, p01, p11, b11, b01)
		else:
			var sc: Array = tile_map[k_s]
			if float(sc[0]) + skin_offset < y01 - 0.05 or float(sc[1]) + skin_offset < y11 - 0.05:
				_add_quad_uv(st, p01, p11, Vector3(x1, float(sc[1]) + skin_offset, z1), Vector3(x0, float(sc[0]) + skin_offset, z1))

		var k_e := Vector2i(col + 1, row)
		if not tile_map.has(k_e):
			var b10e := Vector3(x1, minf(min_skirt_y, y10 - skirt_drop) if min_skirt_y > -9000.0 else (y10 - skirt_drop), z0)
			var b11e := Vector3(x1, minf(min_skirt_y, y11 - skirt_drop) if min_skirt_y > -9000.0 else (y11 - skirt_drop), z1)
			_add_quad_uv(st, p11, p10, b10e, b11e)
		else:
			var ec: Array = tile_map[k_e]
			if float(ec[0]) + skin_offset < y10 - 0.05 or float(ec[3]) + skin_offset < y11 - 0.05:
				_add_quad_uv(st, p11, p10, Vector3(x1, float(ec[0]) + skin_offset, z0), Vector3(x1, float(ec[3]) + skin_offset, z1))

		var k_w := Vector2i(col - 1, row)
		if not tile_map.has(k_w):
			var b00w := Vector3(x0, minf(min_skirt_y, y00 - skirt_drop) if min_skirt_y > -9000.0 else (y00 - skirt_drop), z0)
			var b01w := Vector3(x0, minf(min_skirt_y, y01 - skirt_drop) if min_skirt_y > -9000.0 else (y01 - skirt_drop), z1)
			_add_quad_uv(st, p00, p01, b01w, b00w)
		else:
			var wc: Array = tile_map[k_w]
			if float(wc[1]) + skin_offset < y00 - 0.05 or float(wc[2]) + skin_offset < y01 - 0.05:
				_add_quad_uv(st, p00, p01, Vector3(x0, float(wc[2]) + skin_offset, z1), Vector3(x0, float(wc[1]) + skin_offset, z0))

	st.generate_normals()
	var array_mesh := st.commit()
	var inst := MeshInstance3D.new()
	inst.name = node_name
	inst.mesh = array_mesh
	inst.material_override = mat
	if node_name == "Surface_IslandPleamarLow":
		inst.transparency = 1.0
		inst.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parent.add_child(inst)
	if not (node_name in ["Surface_Beach", "Surface_A5_TemplePlatform"]):
		inst.create_trimesh_collision()

static func _add_quad_uv(st: SurfaceTool, a: Vector3, b: Vector3, c: Vector3, d: Vector3) -> void:
	st.set_uv(Vector2(0, 0)); st.add_vertex(a)
	st.set_uv(Vector2(1, 0)); st.add_vertex(b)
	st.set_uv(Vector2(1, 1)); st.add_vertex(c)
	st.set_uv(Vector2(0, 0)); st.add_vertex(a)
	st.set_uv(Vector2(1, 1)); st.add_vertex(c)
	st.set_uv(Vector2(0, 1)); st.add_vertex(d)

func _build_fallback_surfaces(surfaces_node: Node3D) -> void:
	var z1: Dictionary = Structure.ZONES["Z1_BEACH"]
	_create_surface_slab(surfaces_node, "Surface_Beach", Vector3((z1["bounds_x"].x + z1["bounds_x"].y) * 0.5, 0.25, (z1["bounds_z"].x + z1["bounds_z"].y) * 0.5), Vector3(z1["bounds_x"].y - z1["bounds_x"].x, 0.5, z1["bounds_z"].y - z1["bounds_z"].x), mat_beach)
	var z3: Dictionary = Structure.ZONES["Z3_A1_PLAZA"]
	_create_surface_slab(surfaces_node, "Surface_A1_Plaza", Vector3((z3["bounds_x"].x + z3["bounds_x"].y) * 0.5, Structure.ELEV_A1_PLAZA, (z3["bounds_z"].x + z3["bounds_z"].y) * 0.5), Vector3(z3["bounds_x"].y - z3["bounds_x"].x, 1.0, z3["bounds_z"].y - z3["bounds_z"].x), mat_plaza)

# 2B. Embarcadero artesanal Z1, farol de puerto, arena húmeda y detalle costero
func _build_coastal_pier_and_beach() -> void:
	var pier_node := Node3D.new()
	pier_node.name = "Z1_Rowboat_Pier"
	add_child(pier_node)

	# Farol metálico de puerto sobre el poste de atraque (marco forjado + núcleo cálido)
	_create_cylinder(pier_node, "JettyLanternCollar", Vector3(21.22, 1.62, 114.2), 0.14, 0.06, mat_iron)
	_create_cylinder(pier_node, "JettyLanternCap", Vector3(21.22, 2.02, 114.2), 0.16, 0.07, mat_bronze)
	_create_cylinder(pier_node, "JettyLanternFinial", Vector3(21.22, 2.10, 114.2), 0.04, 0.10, mat_bronze)
	for cx in [-0.10, 0.10]:
		for cz in [-0.10, 0.10]:
			_create_box_prop(pier_node, "JettyLanternRib", Vector3(21.22 + cx, 1.82, 114.2 + cz), Vector3(0.024, 0.34, 0.024), mat_iron)
	var lantern := _create_box_prop(pier_node, "JettyLantern", Vector3(21.22, 1.82, 114.2), Vector3(0.18, 0.28, 0.18), mat_flame)
	lantern.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	SceneEnhancer.add_cyl_collider(pier_node, Vector3(21.22, 0.9, 114.2), 0.22, 1.8)
	var pier_light := OmniLight3D.new()
	pier_light.name = "JettyLanternLight"
	pier_light.position = Vector3(21.22, 2.05, 114.2)
	pier_light.light_color = Color(1.0, 0.72, 0.34)
	pier_light.light_energy = 1.75
	pier_light.omni_range = 12.0
	pier_node.add_child(pier_light)

	# Noray de amarre, cabo enrollado y carga de desembarco junto al muelle (fuera de la senda central)
	_create_cylinder(pier_node, "PierBollardEast", Vector3(22.55, 0.85, 115.0), 0.12, 0.65, mat_wood_dark)
	SceneEnhancer.add_cyl_collider(pier_node, Vector3(22.55, 0.85, 115.0), 0.16, 1.0)
	_create_cylinder(pier_node, "PierBollardWest", Vector3(19.95, 0.85, 114.8), 0.12, 0.65, mat_wood_dark)
	SceneEnhancer.add_cyl_collider(pier_node, Vector3(19.95, 0.85, 114.8), 0.16, 1.0)
	var rope_ring := MeshInstance3D.new()
	var rt := TorusMesh.new()
	rt.inner_radius = 0.14
	rt.outer_radius = 0.29
	rope_ring.name = "PierMooringRope"
	rope_ring.mesh = rt
	rope_ring.material_override = _make_mat(Color("#a88b5b"), 0.88, 0.0)
	rope_ring.position = Vector3(22.55, 0.76, 115.0)
	rope_ring.scale = Vector3(1.0, 0.45, 1.0)
	pier_node.add_child(rope_ring)
	var cargo_barrel := _create_cylinder(pier_node, "PierSupplyBarrel", Vector3(24.8, 0.64, 107.6), 0.28, 0.66, mat_wood)
	cargo_barrel.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	SceneEnhancer.add_cyl_collider(pier_node, Vector3(24.8, 0.64, 107.6), 0.30, 0.80)
	var cargo_crate := _create_box_prop(pier_node, "PierSupplyCrate", Vector3(25.45, 0.56, 107.85), Vector3(0.68, 0.52, 0.58), mat_wood_dark)
	cargo_crate.rotation.y = 0.38
	SceneEnhancer.add_box_collider(pier_node, Vector3(25.45, 0.56, 107.85), Vector3(0.68, 0.65, 0.58), 0.38)

	# Orilla de arena húmeda y transición orgánica desde el muelle al sendero de Pleamar
	var wet_strip := _create_box_prop(pier_node, "BeachWetShoreStrip", Vector3(46.5, 0.03, 114.9), Vector3(29.0, 0.12, 2.4), mat_wet_sand)
	wet_strip.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	# Lajas costeras desgastadas semienterradas que enlazan el borde del muelle con el sendero a Pleamar
	var sleeper_mesh := SceneEnhancer.make_basalt_outcrop_mesh(83)
	var sleeper_specs := [
		[Vector3(23.8, 0.495, 109.30), -0.22, Vector3(1.20, 0.10, 0.90)],
		[Vector3(22.1, 0.505, 108.60), 0.35, Vector3(1.05, 0.10, 0.82)],
		[Vector3(20.4, 0.518, 107.40), -0.58, Vector3(1.15, 0.10, 0.86)],
		[Vector3(18.9, 0.525, 106.05), 0.18, Vector3(1.00, 0.10, 0.78)],
	]
	for si_idx in range(sleeper_specs.size()):
		var slp: Array = sleeper_specs[si_idx]
		var st_slab := MeshInstance3D.new()
		st_slab.name = "PierWestSleeper_%d" % si_idx
		st_slab.mesh = sleeper_mesh
		st_slab.material_override = mat_rock_carved if si_idx % 2 == 0 else mat_rock
		st_slab.position = slp[0]
		st_slab.rotation.y = float(slp[1])
		st_slab.scale = slp[2]
		st_slab.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		pier_node.add_child(st_slab)
	var driftwood_specs := [
		[Vector3(31.8, 0.32, 113.4), 0.13, 2.4, 0.42],
		[Vector3(38.6, 0.31, 113.9), 0.11, 1.9, -0.28],
		[Vector3(46.2, 0.30, 112.8), 0.14, 2.7, 0.18],
	]
	for di in range(driftwood_specs.size()):
		var ds: Array = driftwood_specs[di]
		var dw := _create_cylinder(pier_node, "BeachDriftwood_%d" % di, ds[0], float(ds[1]), float(ds[2]), mat_wood)
		dw.rotation.z = PI * 0.5
		dw.rotation.y = float(ds[3])
		SceneEnhancer.add_box_collider(pier_node, ds[0], Vector3(float(ds[2]), float(ds[1]) * 2.2, float(ds[1]) * 2.2), float(ds[3]))
	var beach_stone_mesh := SceneEnhancer.make_basalt_outcrop_mesh(77)
	for si in range(7):
		var sx := 28.0 + float(si) * 4.2 + sin(float(si) * 1.9) * 0.8
		var sz := 112.2 + cos(float(si) * 2.3) * 1.15
		var st_inst := MeshInstance3D.new()
		st_inst.name = "BeachPebbleCluster_%d" % si
		st_inst.mesh = beach_stone_mesh
		st_inst.material_override = mat_rock_carved if si % 2 == 0 else mat_rock
		st_inst.position = Vector3(sx, 0.14, sz)
		st_inst.scale = Vector3(0.55 + float(si % 3) * 0.22, 0.32, 0.48 + float(si % 2) * 0.25)
		st_inst.rotation.y = float(si) * 1.1
		pier_node.add_child(st_inst)

# 3. Las 6 Celdas de A1 como excavaciones en la roca viva (la malla tallada llega en A1Bedrock/A1Room)
func _build_a1_cells() -> void:
	var cells_node := Node3D.new()
	cells_node.name = "A1_Cells"
	add_child(cells_node)

	var cell_bounds := {
		1: Rect2i(51, 55, 5, 5),
		2: Rect2i(58, 51, 4, 9),
		3: Rect2i(64, 53, 6, 7),
		4: Rect2i(72, 52, 6, 8),
		5: Rect2i(80, 51, 3, 9),
		6: Rect2i(85, 52, 6, 8)
	}

	var t := Structure.TILE_METERS

	for room in Structure.A1_ROOMS:
		var rid: int = int(room["id"])
		var room_node := Node3D.new()
		room_node.name = "Cell_" + str(rid) + "_" + room["role"]
		cells_node.add_child(room_node)

		var rect: Rect2i = cell_bounds.get(rid, Rect2i(51, 55, 5, 4))
		var x0 := float(rect.position.x) * t
		var x1 := float(rect.position.x + rect.size.x) * t
		var z0 := float(rect.position.y) * t
		var z1 := float(rect.position.y + rect.size.y) * t
		var cx := (x0 + x1) * 0.5
		var cz := (z0 + z1) * 0.5
		var w := x1 - x0
		var y_base := Structure.ELEV_A1_PLAZA

		# Suelo auxiliar oculto (el suelo tallado real llega en A1Room__a1:cell-floor*)
		var floor_box := _create_box_prop(room_node, "Floor", Vector3(cx, y_base + 0.01, cz), Vector3(w, 0.04, z1 - z0), mat_cell_floor)
		floor_box.visible = false

		# Luz cálida de antorcha y vela dentro de la celda excavada
		var cell_light := OmniLight3D.new()
		cell_light.name = "CellTorchLight_%d" % rid
		cell_light.position = Vector3(cx, y_base + 1.95, cz - 0.5)
		cell_light.light_color = Color(1.0, 0.68, 0.34)
		cell_light.light_energy = 1.55
		cell_light.omni_range = 10.5
		room_node.add_child(cell_light)

# 3B. Plaza A1: Hoguera central + Ancla estatua de Astalagan
func _build_a1_plaza_details() -> void:
	var plaza_node := Node3D.new()
	plaza_node.name = "A1_PlazaDetails"
	add_child(plaza_node)

	var y := Structure.ELEV_A1_PLAZA

	var fire_pos := Structure.cell_to_world(72, 62, y)
	var camp_node := Node3D.new()
	camp_node.name = "A1_Campfire"
	camp_node.position = fire_pos
	plaza_node.add_child(camp_node)
	SceneEnhancer.add_cyl_collider(camp_node, Vector3(0.0, 0.45, 0.0), 0.58, 1.0)
	SceneEnhancer.tag_camera_occluder(camp_node)

	_create_cylinder(camp_node, "CampfireFlame", Vector3(0, 0.38, 0), 0.20, 0.48, mat_flame)

	var fire_light := OmniLight3D.new()
	fire_light.name = "CampfireLight"
	fire_light.position = Vector3(0, 1.65, 0)
	fire_light.light_color = Color(1.0, 0.58, 0.22)
	fire_light.light_energy = 3.1
	fire_light.omni_range = 17.5
	camp_node.add_child(fire_light)

	# Ancla lógica de Astalagan (malla esculpida llega en A1PlazaProp__a1:astalagan-weathered-stone)
	var statue_pos := Structure.cell_to_world(57, 61, y)
	var statue_node := Node3D.new()
	statue_node.name = "A1_Dragon_Statue"
	statue_node.position = statue_pos
	plaza_node.add_child(statue_node)

	var statue_light := OmniLight3D.new()
	statue_light.name = "AstalaganVotiveLight"
	statue_light.position = Vector3(0, 2.2, 0.8)
	statue_light.light_color = Color(1.0, 0.78, 0.42)
	statue_light.light_energy = 1.25
	statue_light.omni_range = 8.0
	statue_node.add_child(statue_light)

# 4..8. Edificios, Cabrestante con palanca legible y vista al mar, y contenedores .glb
func _build_a2_winch_house(_global_data: Dictionary) -> void:
	var a2_node := Node3D.new()
	a2_node.name = "A2_WinchAssembly"
	add_child(a2_node)

	var y := Structure.ELEV_A2_WINCH
	var l := OmniLight3D.new()
	l.name = "A2_WinchLight"
	l.position = Vector3(160.8, y + 2.4, 67.4)
	l.light_color = Color(1.0, 0.76, 0.44)
	l.light_energy = 1.85
	l.omni_range = 12.0
	a2_node.add_child(l)

	var sea_light := OmniLight3D.new()
	sea_light.name = "A2_SeaViewLight"
	sea_light.position = Vector3(161.2, 5.5, 72.5)
	sea_light.light_color = Color(0.86, 0.94, 1.0)
	sea_light.light_energy = 1.45
	sea_light.omni_range = 18.0
	a2_node.add_child(sea_light)

	# Conjunto destacado e interactivo de la Palanca de Retención del Cabrestante [Tecla E]
	var lever_asm := Node3D.new()
	lever_asm.name = "WinchLeverAssembly"
	lever_asm.position = Vector3(160.07, y, 67.62)
	a2_node.add_child(lever_asm)
	SceneEnhancer.add_box_collider(lever_asm, Vector3(0.0, 0.45, 0.0), Vector3(0.52, 0.90, 0.62))
	SceneEnhancer.tag_camera_occluder(lever_asm)

	_create_box_prop(lever_asm, "LeverPedestal", Vector3(0.0, 0.16, 0.0), Vector3(0.46, 0.32, 0.56), mat_iron)
	_create_box_prop(lever_asm, "LeverHousing", Vector3(0.0, 0.36, 0.0), Vector3(0.28, 0.24, 0.36), mat_bronze)

	winch_lever_pivot = Node3D.new()
	winch_lever_pivot.name = "WinchLeverArm"
	winch_lever_pivot.position = Vector3(0.0, 0.44, 0.0)
	winch_lever_pivot.rotation_degrees.x = -22.0
	lever_asm.add_child(winch_lever_pivot)

	var rod := _create_cylinder(winch_lever_pivot, "LeverRod", Vector3(0.0, 0.62, 0.0), 0.048, 1.24, mat_bronze)
	rod.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	var grip_mat := _make_mat(Color("#a83828"), 0.48, 0.15)
	_create_cylinder(winch_lever_pivot, "LeverGrip", Vector3(0.0, 1.22, 0.0), 0.078, 0.34, grip_mat)
	_create_cylinder(winch_lever_pivot, "LeverPommel", Vector3(0.0, 1.42, 0.0), 0.092, 0.09, mat_gold)

	var lever_lbl := Label3D.new()
	lever_lbl.name = "WinchLeverLabel"
	lever_lbl.text = "Palanca [G]"
	lever_lbl.font_size = 18
	lever_lbl.pixel_size = 0.015
	lever_lbl.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	lever_lbl.position = Vector3(-0.38, 2.32, -0.35)
	lever_lbl.modulate = Color(1.0, 0.90, 0.56)
	lever_asm.add_child(lever_lbl)

	# Plataforma animada + cable conectado al agua abajo cuando se acciona la palanca
	winch_pallet_rig = Node3D.new()
	winch_pallet_rig.name = "WinchLivePallet"
	winch_pallet_rig.position = Vector3(160.8, 12.2, 70.15)
	a2_node.add_child(winch_pallet_rig)

	_create_box_prop(winch_pallet_rig, "LivePalletDeck", Vector3(0.0, 0.0, 0.0), Vector3(1.95, 0.16, 1.55), mat_wood)
	_create_box_prop(winch_pallet_rig, "LivePalletCrateA", Vector3(-0.32, 0.36, 0.08), Vector3(0.68, 0.56, 0.68), mat_wood_dark)
	_create_cylinder(winch_pallet_rig, "LivePalletBarrel", Vector3(0.42, 0.34, -0.10), 0.24, 0.54, mat_bronze)

	winch_cable_mesh = _create_cylinder(a2_node, "WinchLiveCable", Vector3(160.8, 14.4, 70.15), 0.036, 1.0, mat_iron)
	# Pescante de roble, polea superior de hierro y pertrechos de izado en el muelle de la grúa
	var crane_beam := _create_box_prop(a2_node, "WinchCraneJib", Vector3(160.8, 16.68, 68.75), Vector3(0.32, 0.34, 3.35), mat_wood_dark)
	crane_beam.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	var crane_brace := _create_box_prop(a2_node, "WinchCraneBrace", Vector3(160.8, 16.05, 68.25), Vector3(0.24, 0.24, 1.85), mat_wood)
	crane_brace.rotation.x = 0.58
	var pulley := _create_cylinder(a2_node, "WinchPulleyWheel", Vector3(160.8, 16.48, 70.15), 0.22, 0.14, mat_iron)
	pulley.rotation.z = PI * 0.5
	_create_box_prop(a2_node, "WinchDeckCrate", Vector3(158.95, y + 0.32, 66.25), Vector3(0.68, 0.64, 0.68), mat_wood_dark)
	SceneEnhancer.add_box_collider(a2_node, Vector3(158.95, y + 0.36, 66.25), Vector3(0.72, 0.72, 0.72))
	_create_cylinder(a2_node, "WinchDeckBarrel", Vector3(159.65, y + 0.36, 66.10), 0.25, 0.72, mat_wood)
	SceneEnhancer.add_cyl_collider(a2_node, Vector3(159.65, y + 0.40, 66.10), 0.28, 0.80)
	_apply_winch_visual_state(0.0)

	# 7 escollos marinos esculpidos en basalto (espuma generada por profundidad real en OceanPlane)
	var sea_rocks_node := Node3D.new()
	sea_rocks_node.name = "WinchSeaRocks"
	a2_node.add_child(sea_rocks_node)

	var rocks_spec := [
		[164.6, 0.25, 74.8, 3.3, 3.2, 2.5, 0.18],
		[167.0, 0.50, 77.5, 4.2, 4.5, 3.6, -0.34],
		[163.8, 0.00, 81.3, 2.3, 2.3, 2.5, 0.68],
		[166.9, 0.50, 84.7, 5.0, 4.4, 3.3, 0.21],
		[163.1, -0.10, 90.2, 3.1, 2.8, 2.8, -0.56],
		[168.0, 0.40, 93.2, 3.9, 4.0, 3.7, 0.50],
		[163.8, -0.10, 97.6, 3.0, 2.4, 2.8, -0.22]
	]
	for idx in range(rocks_spec.size()):
		var sp: Array = rocks_spec[idx]
		var top_y := float(sp[1]) + float(sp[4]) * 0.24
		var rock_h := top_y + 1.85
		var r_wrap := Node3D.new()
		r_wrap.name = "SeaOutcropWrap_%d" % idx
		r_wrap.position = Vector3(float(sp[0]), -1.85, float(sp[2]))
		r_wrap.rotation.y = float(sp[6])
		sea_rocks_node.add_child(r_wrap)
		var r_inst := MeshInstance3D.new()
		r_inst.name = "SeaOutcrop_%d" % idx
		r_inst.mesh = SceneEnhancer.make_basalt_outcrop_mesh(110 + idx * 13)
		r_inst.material_override = _mat_carved_glb if idx % 2 == 0 else _mat_rock_glb
		r_inst.scale = Vector3(float(sp[3]) * 0.85, rock_h, float(sp[5]) * 0.85)
		r_inst.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		r_wrap.add_child(r_inst)
		SceneEnhancer.add_cyl_collider(r_wrap, Vector3(0.0, rock_h * 0.5, 0.0), minf(float(sp[3]), float(sp[5])) * 0.34, rock_h)
		SceneEnhancer.tag_camera_occluder(r_wrap)

func _build_a3_dining_hall(_global_data: Dictionary) -> void:
	var a3_node := Node3D.new()
	a3_node.name = "A3_DiningHall"
	add_child(a3_node)
	var y := Structure.ELEV_A3_DINING
	var hearth_light := OmniLight3D.new()
	hearth_light.name = "KitchenHearthLight"
	hearth_light.position = Vector3(115.2, y + 1.5, 52.0)
	hearth_light.light_color = Color(1.0, 0.56, 0.20)
	hearth_light.light_energy = 2.15
	hearth_light.omni_range = 12.0
	a3_node.add_child(hearth_light)

	var dining_light := OmniLight3D.new()
	dining_light.name = "DiningLampLight"
	dining_light.position = Vector3(122.5, y + 2.4, 59.2)
	dining_light.light_color = Color(1.0, 0.76, 0.42)
	dining_light.light_energy = 1.8
	dining_light.omni_range = 14.0
	a3_node.add_child(dining_light)

func _build_a4_library(_global_data: Dictionary) -> void:
	var a4_node := Node3D.new()
	a4_node.name = "A4_Library"
	add_child(a4_node)
	var y := Structure.ELEV_A4_LIBRARY
	var study_light := OmniLight3D.new()
	study_light.name = "LibraryStudyLight"
	study_light.position = Vector3(101.0, y + 2.3, 57.8)
	study_light.light_color = Color(1.0, 0.78, 0.44)
	study_light.light_energy = 1.9
	study_light.omni_range = 16.0
	a4_node.add_child(study_light)

func _build_a5_temple(_global_data: Dictionary) -> void:
	var a5_node := Node3D.new()
	a5_node.name = "A5_Temple"
	add_child(a5_node)
	var y := Structure.ELEV_A5_TEMPLE
	var temple_light := OmniLight3D.new()
	temple_light.name = "TempleSanctuaryLight"
	temple_light.position = Vector3(40.5, y + 3.2, 68.5)
	temple_light.light_color = Color(0.95, 0.92, 0.85)
	temple_light.light_energy = 1.6
	temple_light.omni_range = 16.0
	a5_node.add_child(temple_light)

	# 4 braseros ceremoniales de bronce en las esquinas de la plataforma sagrada de Bahamut
	var brazier_pts := [
		Vector3(34.9, y, 64.2), Vector3(46.1, y, 64.2),
		Vector3(34.9, y, 74.8), Vector3(46.1, y, 74.8),
	]
	for bi in range(brazier_pts.size()):
		var bp: Vector3 = brazier_pts[bi]
		var br := Node3D.new()
		br.name = "TempleBrazier_%d" % bi
		br.position = bp
		a5_node.add_child(br)
		_create_cylinder(br, "BrazierBase", Vector3(0.0, 0.10, 0.0), 0.34, 0.20, mat_rock_carved)
		_create_cylinder(br, "BrazierStem", Vector3(0.0, 0.42, 0.0), 0.14, 0.56, mat_bronze)
		_create_cylinder(br, "BrazierBowl", Vector3(0.0, 0.78, 0.0), 0.32, 0.22, mat_bronze)
		_create_cylinder(br, "BrazierEmbers", Vector3(0.0, 0.90, 0.0), 0.22, 0.08, mat_flame)
		var f_core := _create_cylinder(br, "BrazierFlame", Vector3(0.0, 1.04, 0.0), 0.11, 0.24, mat_flame)
		f_core.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		var bl := OmniLight3D.new()
		bl.position = Vector3(0.0, 1.25, 0.0)
		bl.light_color = Color(1.0, 0.64, 0.24)
		bl.light_energy = 1.15
		bl.omni_range = 7.5
		br.add_child(bl)
		SceneEnhancer.add_cyl_collider(br, Vector3(0.0, 0.55, 0.0), 0.36, 1.10)
		SceneEnhancer.tag_camera_occluder(br)

	# Incensarios y ofrendas junto al ara de Bahamut
	for cx in [-1.15, 1.15]:
		_create_cylinder(a5_node, "AltarCenserPedestal", Vector3(40.5 + cx, y + 0.24, 69.85), 0.14, 0.48, mat_bronze)
		_create_cylinder(a5_node, "AltarCenserBowl", Vector3(40.5 + cx, y + 0.52, 69.85), 0.18, 0.12, mat_gold)
		SceneEnhancer.add_cyl_collider(a5_node, Vector3(40.5 + cx, y + 0.32, 69.85), 0.20, 0.64)

	# 7 canarios dorados de Bahamut posados en el altar y los pilares del santuario
	var canary_specs := [
		[Vector3(39.05, y + 1.32, 66.05), 0.45],
		[Vector3(41.95, y + 1.32, 66.05), -0.45],
		[Vector3(40.50, y + 4.92, 67.15), 0.05],
		[Vector3(37.45, y + 1.18, 64.25), 0.28],
		[Vector3(43.55, y + 1.18, 64.25), -0.28],
		[Vector3(35.15, y + 1.12, 71.10), 1.15],
		[Vector3(45.85, y + 1.12, 71.10), -1.15],
	]
	for cs in canary_specs:
		SceneEnhancer.build_sanctuary_canary(a5_node, cs[0], float(cs[1]), mat_gold)

	# Contrafuertes de basalto esculpido que sellan la oquedad negra bajo A5 y la rampa oeste
	var buttress_node := Node3D.new()
	buttress_node.name = "Retreat_WestCliffButtress"
	a5_node.add_child(buttress_node)
	var b_mesh := SceneEnhancer.make_basalt_outcrop_mesh(313)
	var buttress_specs := [
		[Vector3(49.2, 11.0, 67.2), Vector3(4.8, 13.8, 5.2), 0.24],
		[Vector3(50.6, 9.8, 70.8), Vector3(4.4, 14.4, 5.4), -0.42],
		[Vector3(48.1, 13.5, 65.1), Vector3(3.8, 11.4, 4.2), 0.85],
		[Vector3(49.8, 10.4, 73.2), Vector3(4.0, 12.6, 4.5), 1.32],
		[Vector3(53.4, 0.5, 70.4), Vector3(6.8, 19.6, 6.4), 0.62],
		[Vector3(57.6, -0.5, 71.8), Vector3(7.2, 18.8, 6.2), -0.35],
		[Vector3(61.8, -0.5, 72.4), Vector3(6.6, 17.6, 5.8), 0.94],
		[Vector3(55.5, 1.0, 66.8), Vector3(6.2, 19.2, 5.4), 1.48],
		[Vector3(64.5, -0.8, 73.2), Vector3(5.8, 15.8, 5.4), -0.82],
	]
	for bsi in range(buttress_specs.size()):
		var bsp: Array = buttress_specs[bsi]
		var b_sc: Vector3 = bsp[1]
		var b_wrap := Node3D.new()
		b_wrap.name = "WestCliffButtressWrap_%d" % bsi
		b_wrap.position = bsp[0]
		b_wrap.rotation.y = float(bsp[2])
		buttress_node.add_child(b_wrap)
		var bi_inst := MeshInstance3D.new()
		bi_inst.name = "WestCliffButtress_%d" % bsi
		bi_inst.mesh = b_mesh
		bi_inst.material_override = _mat_carved_glb if bsi % 2 == 0 else _mat_rock_glb
		bi_inst.scale = b_sc
		bi_inst.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		b_wrap.add_child(bi_inst)
		SceneEnhancer.add_cyl_collider(b_wrap, Vector3(0.0, b_sc.y * 0.45, 0.0), minf(b_sc.x, b_sc.z) * 0.36, b_sc.y)
		SceneEnhancer.tag_camera_occluder(b_wrap)

func _build_staircases() -> void:
	var stairs_node := Node3D.new()
	stairs_node.name = "Staircases"
	add_child(stairs_node)

# 8A. Losas y rampas convexas invisibles de seguridad para garantizar cero caídas en todo el mapa
func _build_safety_colliders() -> void:
	var safe_node := Node3D.new()
	safe_node.name = "SafetyColliders"
	add_child(safe_node)

	var slabs := [
		["Safe_Beach_West", Vector3(16.0, -0.149, 111.5), Vector3(29.0, 0.80, 14.5)],
		["Safe_Beach_South", Vector3(23.5, -0.149, 114.8), Vector3(27.0, 0.80, 7.5)],
		["Safe_Pier_Deck", Vector3(20.6, 0.08, 115.4), Vector3(6.0, 0.76, 8.2)],
		["Safe_Z2_Landing0", Vector3(36.0, 1.09, 108.0), Vector3(3.2, 0.80, 6.2)],
		["Safe_Z2_Landing1", Vector3(46.5, 3.59, 105.0), Vector3(3.2, 0.80, 6.2)],
		["Safe_Z2_Landing2", Vector3(57.0, 6.09, 102.0), Vector3(3.2, 0.80, 6.2)],
		["Safe_A1_Landing", Vector3(69.8, 8.59, 96.0), Vector3(8.0, 0.80, 9.2)],
		["Safe_A1_PlazaAndCaves", Vector3(107.2, 8.59, 86.2), Vector3(67.5, 0.80, 23.0)],
		["Safe_East_Cliff_Foot", Vector3(148.0, 8.59, 92.6), Vector3(14.5, 0.80, 5.2)],
		["Safe_A2_WinchDeck", Vector3(158.6, 14.59, 67.2), Vector3(10.5, 0.80, 5.6)],
		["Safe_Upper_And_A3A4", Vector3(110.5, 17.59, 60.5), Vector3(70.0, 0.80, 20.5)],
		["Safe_A5_Temple", Vector3(41.0, 26.59, 69.0), Vector3(18.0, 0.80, 14.0)]
	]
	for s in slabs:
		var m := _create_surface_slab(safe_node, s[0], s[1], s[2], mat_plaza)
		m.visible = false

	# Rampas inclinadas continuas exactas entre rellanos y terrazas
	_add_safety_ramp(safe_node, "Safe_Ramp_Z2_Flight0", Vector3(29.5, 0.245, 109.5), Vector3(35.0, 1.50, 109.5), 3.4)
	_add_safety_ramp(safe_node, "Safe_Ramp_Z2_Flight1", Vector3(37.5, 1.49, 106.5), Vector3(45.2, 3.99, 106.5), 3.4)
	_add_safety_ramp(safe_node, "Safe_Ramp_Z2_Flight2", Vector3(48.0, 3.99, 103.5), Vector3(55.7, 6.49, 103.5), 3.4)
	_add_safety_ramp(safe_node, "Safe_Ramp_Z2_Flight3", Vector3(58.5, 6.49, 100.5), Vector3(66.2, 8.99, 100.5), 3.4)
	_add_safety_ramp(safe_node, "Safe_Ramp_A5_Upper", Vector3(50.0, 26.99, 66.0), Vector3(76.6, 17.99, 66.0), 4.8)
	_add_safety_ramp(safe_node, "Safe_Ramp_Upper_A2", Vector3(145.3, 17.99, 67.5), Vector3(154.7, 14.99, 67.5), 4.6)
	_add_safety_ramp(safe_node, "Safe_Ramp_Cliff_East", Vector3(154.5, 8.99, 92.25), Vector3(154.5, 14.99, 72.0), 4.2)

	# Guardarraíles de seguridad perimetrales en bordes de acantilado abiertos (A2, Plaza Sur, Paseo Superior, A5)
	var edge_barriers := [
		# A2 Terraza del cabrestante (deja abiertos x=154.5 z=65.9..69.1 hacia Upper y x=153.1..155.9 z=70 hacia EastStairs)
		["Safe_Edge_A2_North", Vector3(158.6, 16.2, 64.32), Vector3(10.6, 2.8, 0.45)],
		["Safe_Edge_A2_East", Vector3(163.9, 16.2, 67.2), Vector3(0.45, 2.8, 5.9)],
		["Safe_Edge_A2_South", Vector3(159.95, 16.2, 70.05), Vector3(7.9, 2.8, 0.45)],
		["Safe_Edge_A2_NW", Vector3(154.0, 16.2, 65.1), Vector3(1.4, 2.8, 1.5)],
		# Plaza A1 Sur y aterrizaje Z2/Este (deja abiertas escaleras Z2 x=66 z=99..102 y EastStairs x=153.1..155.9 z=92..95)
		["Safe_Edge_Plaza_West", Vector3(69.8, 10.2, 102.2), Vector3(8.2, 2.8, 0.55)],
		["Safe_Edge_Plaza_Landing_NW", Vector3(66.0, 10.2, 95.1), Vector3(0.55, 2.8, 7.6)],
		["Safe_Edge_Plaza_Landing_Step", Vector3(73.4, 10.2, 99.6), Vector3(0.55, 2.8, 5.4)],
		["Safe_Edge_Plaza_East_1", Vector3(138.0, 10.2, 97.1), Vector3(7.4, 2.8, 0.55)],
		["Safe_Edge_Plaza_East_Step", Vector3(141.4, 10.2, 96.2), Vector3(0.55, 2.8, 2.2)],
		["Safe_Edge_Plaza_East_2", Vector3(147.2, 10.2, 95.25), Vector3(11.8, 2.8, 0.55)],
		["Safe_Edge_Plaza_East_Corner", Vector3(155.8, 10.2, 93.8), Vector3(0.55, 2.8, 3.2)],
		# Paseo Superior borde sur (deja abiertas escaleras a A5 z=64.4..67.4 y a A2 z=65.9..69.0)
		["Safe_Edge_Upper_SW_H", Vector3(75.1, 19.2, 72.70), Vector3(3.4, 2.8, 0.55)],
		["Safe_Edge_Upper_SW_V", Vector3(73.6, 19.2, 70.1), Vector3(0.55, 2.8, 5.4)],
		["Safe_Edge_Upper_East", Vector3(140.2, 19.2, 72.70), Vector3(10.6, 2.8, 0.55)],
		["Safe_Edge_Upper_SE_Turn", Vector3(145.45, 19.2, 70.95), Vector3(0.55, 2.8, 3.8)],
		# Templo A5 esquinas N/S/O/E (deja abierta subida Upper->A5 en x=50 z=64.35..67.5)
		["Safe_Edge_A5_NW", Vector3(33.5, 28.2, 62.0), Vector3(4.0, 2.8, 0.55)],
		["Safe_Edge_A5_SW", Vector3(33.5, 28.2, 76.0), Vector3(4.0, 2.8, 0.55)],
		["Safe_Edge_A5_West", Vector3(32.0, 28.2, 69.0), Vector3(0.55, 2.8, 14.4)],
		["Safe_Edge_A5_NE", Vector3(48.0, 28.2, 62.0), Vector3(4.4, 2.8, 0.55)],
		["Safe_Edge_A5_SE", Vector3(48.0, 28.2, 76.0), Vector3(4.4, 2.8, 0.55)],
		["Safe_Edge_A5_East_S", Vector3(50.0, 28.2, 71.8), Vector3(0.55, 2.8, 8.6)],
		["Safe_Edge_A5_East_N", Vector3(50.0, 28.2, 63.1), Vector3(0.55, 2.8, 2.5)]
	]
	for eb in edge_barriers:
		var sb := SceneEnhancer.add_box_collider(safe_node, eb[1], eb[2])
		sb.name = eb[0]

func _add_safety_ramp(parent: Node, ramp_name: String, a: Vector3, b: Vector3, width: float) -> void:
	var mid := (a + b) * 0.5
	var dir := b - a
	var length := dir.length()
	if length < 0.05:
		return
	var sb := StaticBody3D.new()
	sb.name = ramp_name
	parent.add_child(sb)
	sb.look_at_from_position(mid, b, Vector3.UP)
	sb.translate_object_local(Vector3(0.0, -0.22, 0.0))
	var col := CollisionShape3D.new()
	var box := BoxShape3D.new()
	box.size = Vector3(width, 0.44, length + 0.6)
	col.shape = box
	sb.add_child(col)

# 8B. Carga de los 3 paquetes .glb canónicos de Babylon ya orientados en espacio Godot (+Z)
func _build_babylon_glb_modules() -> void:
	var geo_root := Node3D.new()
	geo_root.name = "BabylonGeography"
	add_child(geo_root)
	_load_glb_bundle(GLB_GEO_PATH, geo_root, {})

	var r3_root := Node3D.new()
	r3_root.name = "BabylonLandscapeR3"
	add_child(r3_root)
	_load_glb_bundle(GLB_R3_PATH, r3_root, {})

	var misc_root := Node3D.new()
	misc_root.name = "BabylonArchitecture"
	add_child(misc_root)

	var zone_targets := {
		"A2": get_node_or_null("A2_WinchAssembly"),
		"A2Fin": get_node_or_null("A2_WinchAssembly"),
		"A3": get_node_or_null("A3_DiningHall"),
		"A3Fin": get_node_or_null("A3_DiningHall"),
		"A4": get_node_or_null("A4_Library"),
		"A4Fin": get_node_or_null("A4_Library"),
		"A5": get_node_or_null("A5_Temple"),
		"A5Fin": get_node_or_null("A5_Temple"),
		"A1Room": get_node_or_null("A1_Cells"),
		"A1Bedrock": get_node_or_null("A1_Cells"),
		"A1PlazaProp": get_node_or_null("A1_PlazaDetails"),
		"Shore": get_node_or_null("Staircases"),
		"Conn": get_node_or_null("Staircases")
	}
	_load_glb_bundle(GLB_ARCH_PATH, misc_root, zone_targets)

func _load_glb_bundle(res_path: String, default_parent: Node3D, prefix_targets: Dictionary) -> void:
	if not FileAccess.file_exists(res_path):
		push_warning("Missing GLB bundle: " + res_path)
		return
	var bytes := FileAccess.get_file_as_bytes(res_path)
	if bytes.is_empty():
		return
	var doc := GLTFDocument.new()
	var state := GLTFState.new()
	var err := doc.append_from_buffer(bytes, "", state)
	if err != OK:
		push_warning("GLTF append failed (%d): %s" % [err, res_path])
		return
	var scene_root := doc.generate_scene(state)
	if not scene_root:
		return

	var meshes: Array[MeshInstance3D] = []
	_collect_mesh_instances(scene_root, meshes)
	for m_inst in meshes:
		var old_parent := m_inst.get_parent()
		if old_parent:
			old_parent.remove_child(m_inst)
		m_inst.owner = null
		if _should_skip_babylon_mesh(m_inst.name):
			m_inst.queue_free()
			continue

		var target_parent: Node3D = default_parent
		var parts := m_inst.name.split("__", false, 1)
		if parts.size() >= 1 and prefix_targets.has(parts[0]) and prefix_targets[parts[0]] != null:
			target_parent = prefix_targets[parts[0]]

		_trim_babylon_mesh_extremities(m_inst)
		_apply_babylon_material(m_inst)
		if _is_walkable_glb_mesh(m_inst.name) or _should_collide_glb_mesh(m_inst.name):
			_create_babylon_mesh_collision(m_inst)
			if _is_camera_occluder_glb_mesh(m_inst.name):
				m_inst.add_to_group("camera_occluder")
		target_parent.add_child(m_inst)

	scene_root.queue_free()

func _is_in_smooth_stair_zone(p: Vector3) -> bool:
	# Interiores transitables de peldaños de Z2, Upper_A5, Upper_A2 y EastStairs (conservando muros/bordillos laterales)
	if p.x >= 29.4 and p.x <= 35.2 and p.z >= 108.1 and p.z <= 110.9 and p.y >= 0.05 and p.y <= 1.75:
		return true
	if p.x >= 37.2 and p.x <= 45.6 and p.z >= 105.1 and p.z <= 107.9 and p.y >= 1.25 and p.y <= 4.25:
		return true
	if p.x >= 47.7 and p.x <= 56.1 and p.z >= 102.1 and p.z <= 104.9 and p.y >= 3.75 and p.y <= 6.75:
		return true
	if p.x >= 58.2 and p.x <= 66.6 and p.z >= 99.1 and p.z <= 101.9 and p.y >= 6.25 and p.y <= 9.25:
		return true
	if p.x >= 49.3 and p.x <= 76.8 and p.z >= 64.65 and p.z <= 67.35 and p.y >= 17.65 and p.y <= 27.30:
		return true
	if p.x >= 145.0 and p.x <= 154.8 and p.z >= 66.15 and p.z <= 68.85 and p.y >= 14.65 and p.y <= 18.25:
		return true
	if p.x >= 153.25 and p.x <= 155.75 and p.z >= 71.7 and p.z <= 92.6 and p.y >= 8.75 and p.y <= 15.25:
		return true
	return false

func _create_babylon_mesh_collision(m_inst: MeshInstance3D) -> void:
	var low := m_inst.name.to_lower()
	if not (low.begins_with("shore__a1_plaza") or low.begins_with("conn__a1_plaza")):
		m_inst.create_trimesh_collision()
		return
	var mesh := m_inst.mesh
	if mesh == null:
		return
	var faces := PackedVector3Array()
	var xf := m_inst.transform
	for s in range(mesh.get_surface_count()):
		var arrays := mesh.surface_get_arrays(s)
		if arrays.is_empty():
			continue
		var verts: PackedVector3Array = arrays[Mesh.ARRAY_VERTEX]
		var indices: PackedInt32Array = arrays[Mesh.ARRAY_INDEX]
		var count := indices.size() if indices.size() >= 3 else verts.size()
		for i in range(0, count - 2, 3):
			var v0 := verts[indices[i] if indices.size() >= 3 else i]
			var v1 := verts[indices[i + 1] if indices.size() >= 3 else i + 1]
			var v2 := verts[indices[i + 2] if indices.size() >= 3 else i + 2]
			var w0 := xf * v0
			var w1 := xf * v1
			var w2 := xf * v2
			var c := (w0 + w1 + w2) / 3.0
			if _is_in_smooth_stair_zone(c):
				# Omitir peldaños y contrahuellas dentadas donde ya existe rampa lisa Safe_Ramp_*
				continue
			faces.append(v0)
			faces.append(v1)
			faces.append(v2)
	if faces.is_empty():
		return
	var sb := StaticBody3D.new()
	sb.name = "%s_col" % m_inst.name
	var cs := CollisionShape3D.new()
	var shape := ConcavePolygonShape3D.new()
	shape.set_faces(faces)
	cs.shape = shape
	sb.add_child(cs)
	m_inst.add_child(sb)

func _should_drop_babylon_tri(v0: Vector3, v1: Vector3, v2: Vector3, touches_sw: bool, is_sal: bool, is_foliage_sw: bool, touches_ne: bool, touches_c6: bool, trim_stair_fences: bool) -> bool:
	if touches_sw:
		for v in [v0, v1, v2]:
			if v.x < 17.6 and v.z > 72.0 and v.y < 9.2:
				return true
			if v.x < 18.6 and v.z > 98.0 and v.z < 106.8 and v.y > 1.35 and v.y < 6.5:
				return true
			if is_foliage_sw and v.x < 20.2 and v.z > 84.0 and v.y < 10.6:
				return true
			if is_sal and v.x < 28.8 and v.z > 74.0 and v.y < 15.0:
				return true
			if is_sal and v.x < 57.2 and v.z > 70.0 and v.z < 96.0 and v.y < 14.2:
				return true
	if touches_ne:
		for v in [v0, v1, v2]:
			if v.x > 158.5 and v.z < 27.3 and v.y > 31.8:
				return true
	if touches_c6:
		for v in [v0, v1, v2]:
			if v.x > 128.2 and v.x < 135.0 and v.z > 78.0 and v.z < 86.8 and v.y > 9.12 and v.y < 14.5:
				return true
	if trim_stair_fences:
		for v in [v0, v1, v2]:
			# 1. Barrera N-S cruzando Paseo Superior Oeste (x=76.45)
			if v.x > 76.35 and v.x < 76.56 and v.z > 67.55 and v.z < 72.58 and v.y > 17.8 and v.y < 19.3:
				return true
			# 2. Barrera N-S cruzando Paseo Superior Este (x=135.05)
			if v.x > 134.94 and v.x < 135.16 and v.z > 67.35 and v.z < 72.58 and v.y > 17.8 and v.y < 19.3:
				return true
			# 3. Cuerda/poste atravesado arriba de escalera Upper -> A2 (x=145.4)
			if v.x > 145.30 and v.x < 145.52 and v.z > 66.02 and v.z < 68.92 and v.y > 17.5 and v.y < 19.3:
				return true
			# 4. Cuerda/poste atravesado abajo de escalera Upper -> A2 (x=154.6)
			if v.x > 154.50 and v.x < 154.72 and v.z > 66.02 and v.z < 68.92 and v.y > 14.8 and v.y < 16.8:
				return true
			# 5. Poste/cuerda atravesado arriba de escalera Z2 Tramo 3 (x=66.1)
			if v.x > 66.00 and v.x < 66.22 and v.z > 100.35 and v.z < 101.98 and v.y > 8.8 and v.y < 10.2:
				return true
	return false

func _trim_babylon_mesh_extremities(m_inst: MeshInstance3D) -> void:
	if not m_inst.mesh or not (m_inst.mesh is ArrayMesh):
		return
	var low := m_inst.name.to_lower()
	var check_sw := (
		low.begins_with("sal4__") or low.begins_with("sal1__") or low.begins_with("geo14__")
		or low.begins_with("p3terrain__") or low.begins_with("r3paths__") or low.begins_with("r3land__")
		or low.begins_with("conn__") or low.begins_with("p5__") or low.begins_with("v4__")
	)
	var check_ne_fence := (
		low == "v4__wood_oiled_used" or low == "v4__hemp_rope_used"
		or low == "r3land__a1_oak-v5" or low == "r3land__r3_rope"
	)
	var check_c6_cavity := (
		not low.begins_with("a1room__") and (
			"cliff" in low or "earth" in low or "bark" in low or "pine" in low or "olive" in low
			or low.begins_with("a1bedrock__") or low.begins_with("p3terrain__") or low.begins_with("r3land__")
			or low.begins_with("stones3__") or low.begins_with("a1ctx__") or low.begins_with("conn__")
		)
	)
	if not check_sw and not check_ne_fence and not check_c6_cavity:
		return

	var is_sal := low.begins_with("sal4__") or low.begins_with("sal1__")
	var is_foliage_sw := ("pine" in low or "foliage" in low or "bark" in low or "olive" in low)
	var sw_max_x := 27.5 if is_sal else (20.4 if (is_foliage_sw or "oak" in low) else 17.6)
	var aabb := m_inst.get_aabb()
	var touches_sw := check_sw and (aabb.position.x < sw_max_x and aabb.end.z > 72.0 and aabb.position.y < 10.6)
	var touches_ne := check_ne_fence and (aabb.end.x > 158.5 and aabb.position.z < 27.3 and aabb.end.y > 31.8)
	var touches_c6 := check_c6_cavity and (aabb.end.x > 128.0 and aabb.position.x < 135.2 and aabb.end.z > 77.8 and aabb.position.z < 87.0 and aabb.end.y > 9.12)
	var trim_stair_fences := check_ne_fence
	if not touches_sw and not touches_ne and not touches_c6 and not trim_stair_fences:
		return

	var src_mesh := m_inst.mesh as ArrayMesh
	var new_mesh := ArrayMesh.new()
	var modified := false

	for s in range(src_mesh.get_surface_count()):
		var arrays := src_mesh.surface_get_arrays(s)
		if arrays.is_empty():
			continue
		var verts: PackedVector3Array = arrays[Mesh.ARRAY_VERTEX]
		var indices: PackedInt32Array = arrays[Mesh.ARRAY_INDEX]
		var mat: Material = src_mesh.surface_get_material(s)
		if indices.size() >= 3:
			var kept_idx := PackedInt32Array()
			var tri_count := indices.size() / 3
			for t_i in range(tri_count):
				var i0 := indices[t_i * 3]
				var i1 := indices[t_i * 3 + 1]
				var i2 := indices[t_i * 3 + 2]
				if _should_drop_babylon_tri(verts[i0], verts[i1], verts[i2], touches_sw, is_sal, is_foliage_sw, touches_ne, touches_c6, trim_stair_fences):
					modified = true
				else:
					kept_idx.append(i0)
					kept_idx.append(i1)
					kept_idx.append(i2)
			if kept_idx.size() >= 3:
				arrays[Mesh.ARRAY_INDEX] = kept_idx
				new_mesh.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arrays)
				new_mesh.surface_set_material(new_mesh.get_surface_count() - 1, mat)
		elif verts.size() >= 3:
			# Algunas superficies .glb vienen sin buffer ARRAY_INDEX; filtrar sus triángulos directamente
			var kept_v := PackedVector3Array()
			var src_n: PackedVector3Array = arrays[Mesh.ARRAY_NORMAL] if arrays[Mesh.ARRAY_NORMAL] != null else PackedVector3Array()
			var src_t: PackedFloat32Array = arrays[Mesh.ARRAY_TANGENT] if arrays[Mesh.ARRAY_TANGENT] != null else PackedFloat32Array()
			var src_c: PackedColorArray = arrays[Mesh.ARRAY_COLOR] if arrays[Mesh.ARRAY_COLOR] != null else PackedColorArray()
			var src_uv: PackedVector2Array = arrays[Mesh.ARRAY_TEX_UV] if arrays[Mesh.ARRAY_TEX_UV] != null else PackedVector2Array()
			var src_uv2: PackedVector2Array = arrays[Mesh.ARRAY_TEX_UV2] if arrays[Mesh.ARRAY_TEX_UV2] != null else PackedVector2Array()
			var dst_n := PackedVector3Array()
			var dst_t := PackedFloat32Array()
			var dst_c := PackedColorArray()
			var dst_uv := PackedVector2Array()
			var dst_uv2 := PackedVector2Array()
			var tri_count := verts.size() / 3
			for t_i in range(tri_count):
				var b_i := t_i * 3
				if _should_drop_babylon_tri(verts[b_i], verts[b_i + 1], verts[b_i + 2], touches_sw, is_sal, is_foliage_sw, touches_ne, touches_c6, trim_stair_fences):
					modified = true
					continue
				for k in range(3):
					var vi := b_i + k
					kept_v.append(verts[vi])
					if vi < src_n.size(): dst_n.append(src_n[vi])
					if vi * 4 + 3 < src_t.size():
						dst_t.append(src_t[vi * 4]); dst_t.append(src_t[vi * 4 + 1]); dst_t.append(src_t[vi * 4 + 2]); dst_t.append(src_t[vi * 4 + 3])
					if vi < src_c.size(): dst_c.append(src_c[vi])
					if vi < src_uv.size(): dst_uv.append(src_uv[vi])
					if vi < src_uv2.size(): dst_uv2.append(src_uv2[vi])
			if kept_v.size() >= 3:
				var out_arr := []
				out_arr.resize(Mesh.ARRAY_MAX)
				out_arr[Mesh.ARRAY_VERTEX] = kept_v
				if dst_n.size() == kept_v.size(): out_arr[Mesh.ARRAY_NORMAL] = dst_n
				if dst_t.size() == kept_v.size() * 4: out_arr[Mesh.ARRAY_TANGENT] = dst_t
				if dst_c.size() == kept_v.size(): out_arr[Mesh.ARRAY_COLOR] = dst_c
				if dst_uv.size() == kept_v.size(): out_arr[Mesh.ARRAY_TEX_UV] = dst_uv
				if dst_uv2.size() == kept_v.size(): out_arr[Mesh.ARRAY_TEX_UV2] = dst_uv2
				new_mesh.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, out_arr)
				new_mesh.surface_set_material(new_mesh.get_surface_count() - 1, mat)

	if modified:
		m_inst.mesh = new_mesh

func _should_skip_babylon_mesh(mesh_name: String) -> bool:
	var low := mesh_name.to_lower()
	# Ocultar mobiliario antiguo fusionado en bloque de A1Room, A1PlazaProp, A1Ctx, A3 y A4
	# (reemplazado por mobiliario 3D detallado en retreat_scene_enhancer.gd).
	if low.begins_with("a1room__"):
		if "cell-floor" in low or "carved-cliff" in low or "coastal-cliff" in low:
			return false
		return true
	if low.begins_with("a1plazaprop__"):
		if "astalagan" in low or "carved-cliff" in low:
			return false
		return true
	if low.begins_with("a3__") or low.begins_with("a3fin__") or low.begins_with("a4__") or low.begins_with("a4fin__"):
		if "basalt_carved" in low or "carved-cliff" in low or "stone_floor" in low:
			return false
		return true
	if low.begins_with("a1ctx__"):
		for prop_kw in ["oak-v5", "dark-oak-v5", "linen-v5", "blue-cloth-v5", "red-cloth-v5", "iron-v5", "brass-v5", "pottery-v5", "lamp-glow", "warm-bounce", "contact-shadow"]:
			if prop_kw in low:
				return true
	# Ocultar la antigua losa cuadrada de pleamar-low importada de Babylon (rehecha desde cero)
	if low in [
		"r3paths__a1_earth-v6",
		"r3shoulder__a1_earth-v6",
		"sal4__a1_painted-foliage-v6",
		"v5coast__v2_leaves",
		"v5coast__v5_dry_grass",
		"v5coast__v4_flowers"
	] or low.begins_with("r2ext__"):
		return true
	return false

func _is_walkable_glb_mesh(mesh_name: String) -> bool:
	var low := mesh_name.to_lower()
	if "foliage" in low or "flower" in low or "herb" in low or "water" in low or "pine" in low or "flame" in low or "planter" in low or "rope" in low or "lavender" in low or "bush" in low or "shrub" in low or "fern" in low:
		return false
	if "plaza" in low or "stone_floor" in low or "cell-floor" in low or "jetty_deck" in low:
		return true
	if ("earth" in low or "coastal-cliff" in low or "carved-cliff" in low) and (
		low.begins_with("shore__") or low.begins_with("conn__") or low.begins_with("r3paths__")
	):
		return true
	return false

func _should_collide_glb_mesh(mesh_name: String) -> bool:
	var low := mesh_name.to_lower()
	for non_solid_kw in [
		"foliage", "flower", "herb", "water", "bay", "pine", "flame", "lamp",
		"embers", "fire-core", "coal-heat", "contact-shadow", "warm-bounce",
		"fire-glow", "ash", "grass", "moss", "meadow", "vine", "ivy",
		"lavender", "bush", "shrub", "fern", "reed", "sage", "hedge",
		"planter", "pebble", "rubble", "linen", "paper", "rug", "cloth"
	]:
		if non_solid_kw in low:
			return false
	# Evitar mallas puramente de horizonte o faldas lejanas fuera de la zona jugable
	for horizon_pfx in ["geo", "g2_", "v5coast", "sal", "p3terrain", "r3shoulder", "r3paths__"]:
		if low.begins_with(horizon_pfx):
			return false
	for active_pfx in [
		"a1room__", "a1bedrock__", "a1plazaprop__", "a1ctx__",
		"a2__", "a2fin__", "a3__", "a3fin__", "a4__", "a4fin__",
		"a5__", "a5fin__", "shore__", "conn__", "v4__", "r3land__"
	]:
		if low.begins_with(active_pfx):
			return true
	return false

func _is_camera_occluder_glb_mesh(mesh_name: String) -> bool:
	var low := mesh_name.to_lower()
	if _is_walkable_glb_mesh(mesh_name):
		return false
	for huge_shell in ["a1room__", "a1bedrock__", "a1ctx__", "a3__", "a4__", "shore__", "conn__"]:
		if low.begins_with(huge_shell):
			return false
	if low.begins_with("a1plazaprop__") or low.begins_with("a5__") or low.begins_with("a5fin__"):
		return true
	if low.begins_with("a2__") or low.begins_with("a2fin__") or low.begins_with("v4__"):
		return true
	if low.begins_with("r3land__") and ("bark" in low or "oak" in low or "rope" in low):
		return true
	return false

func _should_cast_babylon_shadow(node_low: String, n: String) -> bool:
	if node_low.begins_with("r3land__") or node_low.begins_with("r3shoulder__") or node_low.begins_with("r3paths__"):
		return false
	for skip_kw in [
		"foliage", "flower", "herb", "water", "bay", "flame", "lamp", "embers", "fire-core", "coal-heat",
		"contact-shadow", "warm-bounce", "fire-glow", "planter", "vine", "ivy", "grass", "moss", "meadow",
		"book", "scroll", "bottle", "plate", "cup", "bowl", "jar", "candle", "pottery", "lantern",
		"chain", "iron", "rail", "crate", "barrel", "bed", "hammock", "cushion", "linen", "paper", "rug", "cloth", "rope", "pebble", "rubble",
		"bookshelf", "shelf", "table", "chair", "bench", "desk", "cabinet", "cauldron", "kettle", "stool"
	]:
		if skip_kw in n or skip_kw in node_low:
			return false
	return true

func _collect_mesh_instances(node: Node, out: Array[MeshInstance3D]) -> void:
	if node is MeshInstance3D:
		out.append(node)
	for c in node.get_children():
		_collect_mesh_instances(c, out)

func _apply_babylon_material(m_inst: MeshInstance3D) -> void:
	if not m_inst.mesh or m_inst.mesh.get_surface_count() == 0:
		return
	var orig_mat: Material = m_inst.mesh.surface_get_material(0)
	var mat_name := ""
	if orig_mat and not orig_mat.resource_name.is_empty():
		mat_name = orig_mat.resource_name
	elif m_inst.name.contains("__"):
		mat_name = m_inst.name.split("__", false, 1)[1]

	var n := mat_name.to_lower()
	var node_low := m_inst.name.to_lower()

	m_inst.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON if _should_cast_babylon_shadow(node_low, n) else GeometryInstance3D.SHADOW_CASTING_SETTING_OFF

	# Preservar vertex colors en materiales originales no reemplazados; usar CULL_DISABLED para evitar triángulos huecos en acantilados de Babylon
	if orig_mat is BaseMaterial3D:
		var bm := orig_mat as BaseMaterial3D
		bm.cull_mode = BaseMaterial3D.CULL_DISABLED
		bm.vertex_color_use_as_albedo = true

	if "coastal_water" in n or "bay" in n:
		m_inst.material_override = _mat_water_glb
		m_inst.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		return

	if "flame" in n or "lamp" in n or "embers" in n or "fire-core" in n or "coal-heat" in n:
		if orig_mat is BaseMaterial3D:
			var bm := orig_mat as BaseMaterial3D
			bm.emission_enabled = true
			bm.emission_energy_multiplier = 2.4
		m_inst.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		return

	if "contact-shadow" in n or "warm-bounce" in n or "fire-glow" in n:
		m_inst.visible = false
		return

	# Follaje y enredaderas pintadas de A1 con atlas y recorte alfa
	if "painted-foliage-sage" in n:
		m_inst.material_override = _mat_foliage_sage_glb
		m_inst.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		return
	if "painted-foliage-dark" in n:
		m_inst.material_override = _mat_foliage_dark_glb
		m_inst.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		return
	if "painted-foliage-flower" in n:
		m_inst.material_override = _mat_foliage_flower_glb
		m_inst.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		return
	if "painted-foliage" in n:
		m_inst.material_override = _mat_foliage_v6_glb
		m_inst.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		return

	if "a1_extension_small_flowers" in n or "herb_blossoms" in n:
		m_inst.material_override = _mat_flower_glb
		return
	if "a1_extension_herbs" in n or "refinement_cliff_herbs" in n:
		m_inst.material_override = _mat_herb_glb
		return

	if "astalagan" in n:
		m_inst.material_override = _mat_astalagan_glb
		return

	# A5 Escultura de Bahamut, pedestal, canarios y columnas
	if node_low.begins_with("a5__") and ("stone_bahamut" in n or "limestone" in n):
		m_inst.material_override = _mat_sculpture_glb
		return

	if "cell-floor" in n:
		m_inst.material_override = mat_cell_floor
		return

	if "plaza" in n or "stone_floor" in n:
		m_inst.material_override = _mat_paving_glb
		return

	if "meadow_base" in n or (("earth" in n) and (node_low.begins_with("sal1__") or node_low.begins_with("sal2__") or node_low.begins_with("sal2r__") or node_low.begins_with("sal3__"))):
		m_inst.material_override = _mat_forest_earth_glb
		return

	if "earth" in n or "garden-soil" in n:
		m_inst.material_override = _mat_earth_glb
		return

	if "carved-cliff" in n or "basalt" in n:
		m_inst.material_override = _mat_carved_glb
		return

	if "coastal-cliff" in n or "stonecontact" in n:
		m_inst.material_override = _mat_rock_glb
		return

	if "limestone" in n:
		m_inst.material_override = _mat_limestone_glb
		return

	if "blue-cloth" in n:
		m_inst.material_override = _mat_blue_cloth_glb
		return
	if "red-cloth" in n:
		m_inst.material_override = _mat_red_cloth_glb
		return
	if "green-cloth" in n:
		m_inst.material_override = _mat_foliage_sage_glb
		return
	if "linen" in n or "paper" in n:
		m_inst.material_override = _mat_linen_glb
		return
	if "brass" in n:
		m_inst.material_override = _mat_brass_glb
		return
	if "pottery" in n:
		m_inst.material_override = _mat_pottery_glb
		return

	if "dark-oak" in n or "wood_endgrain" in n:
		m_inst.material_override = _mat_dark_wood_glb
		return

	if "oak" in n or "wood_oiled" in n:
		m_inst.material_override = _mat_wood_glb
		return

	if "iron" in n:
		m_inst.material_override = _mat_metal_glb
		return

	# Follaje, césped y árboles de Babylon mejorados con tonos vivos, clorofila cálida y backlight
	if "r3_grass" in n or "v2_garden_turf" in n or "v2_grass" in n or "v5_dry_grass" in n:
		m_inst.material_override = _mat_forest_earth_glb
		return
	if "r3_pine_sun" in n or "v2_leaves" in n or "refinement_garden_leaf" in n:
		m_inst.material_override = mat_foliage_olive
		return
	if "r3_pine_dark" in n:
		m_inst.material_override = mat_foliage_pine
		return
	if "r3_olive" in n or "r3_sage" in n:
		m_inst.material_override = _mat_herb_glb
		return
	if "r3_" in n or "foliage" in n or "v2_" in n or "v4_" in n or "v5_" in n or "refinement_" in n:
		if orig_mat is BaseMaterial3D:
			var fbm := orig_mat as BaseMaterial3D
			fbm.backlight_enabled = true
			fbm.backlight = Color(0.24, 0.46, 0.16)
			fbm.roughness = minf(fbm.roughness, 0.82)
		return

# 8C. Macetas, jardineras y entradas de cuevas rebosantes de vegetación y flores mediterráneas
func _build_lush_planters_and_gardens() -> void:
	var planters_node := Node3D.new()
	planters_node.name = "LushPlanters"
	add_child(planters_node)

	var shrub_xf: Array[Transform3D] = []
	var shrub_col: Array[Color] = []
	var ivy_xf: Array[Transform3D] = []
	var flower_xf: Array[Transform3D] = []
	var flower_col: Array[Color] = []

	var rng := RandomNumberGenerator.new()
	rng.seed = 987654

	var green_palette: Array[Color] = [
		Color("#3e5c36"), Color("#4b6b40"), Color("#5c7c4b"), Color("#6d8a55"), Color("#48643d")
	]
	var flower_palette: Array[Color] = [
		Color("#9a7bc8"), Color("#dfd080"), Color("#d48652"), Color("#c86b74"), Color("#c46d8c"), Color("#ede4cc")
	]

	var add_planter_cluster := func(center: Vector3, span_x: float, count: int, with_ivy: bool) -> void:
		for i in range(count):
			var ox := rng.randf_range(-span_x * 0.48, span_x * 0.48)
			var oz := rng.randf_range(-0.32, 0.32)
			var sc := rng.randf_range(0.48, 0.84)
			var b := Basis.from_euler(Vector3(rng.randf_range(-0.14, 0.14), rng.randf_range(0.0, TAU), rng.randf_range(-0.14, 0.14)))
			b = b.scaled(Vector3(sc * 1.12, sc * 1.02, sc * 1.12))
			shrub_xf.append(Transform3D(b, center + Vector3(ox, 0.04, oz)))
			shrub_col.append(green_palette[rng.randi() % green_palette.size()])

			for _fl in range(2):
				if rng.randf() < 0.82:
					var fc: Color = flower_palette[rng.randi() % flower_palette.size()]
					var fsc := rng.randf_range(0.24, 0.40)
					var fb := Basis.from_euler(Vector3(0.0, rng.randf_range(0.0, TAU), 0.0)).scaled(Vector3(fsc, fsc, fsc))
					flower_xf.append(Transform3D(fb, center + Vector3(ox + rng.randf_range(-0.18, 0.18), sc * 0.42 + 0.08, oz + rng.randf_range(-0.16, 0.16))))
					flower_col.append(fc)

		if with_ivy:
			var strand_count := maxi(5, int(round(span_x * 3.8)))
			for j in range(strand_count):
				var ix := lerpf(-span_x * 0.48, span_x * 0.48, float(j) / float(maxi(1, strand_count - 1))) + rng.randf_range(-0.08, 0.08)
				var drop := rng.randf_range(0.75, 1.45)
				var ib := Basis.from_euler(Vector3(0.04, rng.randf_range(-0.22, 0.22), rng.randf_range(-0.08, 0.08)))
				ib = ib.scaled(Vector3(0.48, drop, 0.45))
				ivy_xf.append(Transform3D(ib, center + Vector3(ix, 0.06, 0.30)))

	# 1. Las jardineras del borde sur del Paseo Superior (con hiedra colgante densa y flores)
	for x_p in [75.0, 78.0, 81.0, 84.0, 87.0, 90.0, 93.0, 96.0, 99.0, 102.0, 105.0, 108.0, 111.0, 114.0, 117.0, 120.0, 123.0, 126.0, 129.0, 132.0, 135.0, 138.0, 141.0, 144.0]:
		add_planter_cluster.call(Vector3(x_p, 18.52, 72.35), 2.3, 14, true)

	# Macetas de terracota pegadas al muro flanqueando solo los arcos de A4 y A3 (despejando el Paseo Superior)
	for x_pot in [99.8, 105.8, 118.4, 124.6]:
		var u_pot_pos := Vector3(x_pot, 18.0, 65.58)
		var u_pot := _create_cylinder(planters_node, "UpperPot_%d" % int(x_pot * 10.0), u_pot_pos + Vector3(0.0, 0.24, 0.0), 0.30, 0.48, _mat_pottery_glb)
		u_pot.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		SceneEnhancer.add_cyl_collider(planters_node, u_pot_pos + Vector3(0.0, 0.38, 0.0), 0.33, 0.85)
		add_planter_cluster.call(u_pot_pos + Vector3(0.0, 0.46, 0.0), 0.52, 8, true)

	# 2. Jardineras del borde sur de la Plaza A1 (encajadas dentro de la barandilla/jardinera)
	for x_a1 in [74.0, 76.5, 79.0, 81.5, 84.0, 86.5, 89.2, 92.0, 94.8, 97.5, 100.5, 103.5, 106.5, 109.5, 112.5, 115.5, 118.5, 121.5, 124.5, 127.5, 130.5, 133.5]:
		add_planter_cluster.call(Vector3(x_a1, 9.30, 97.08), 2.2, 13, true)
	SceneEnhancer.add_box_collider(planters_node, Vector3(103.8, 9.55, 97.08), Vector3(61.5, 1.30, 0.68))

	# 3. Macetas de terracota retranqueadas junto al muro rocoso de las Cuevas A1 (pasillo frontal libre frente a C1-C6)
	for room in Structure.A1_ROOMS:
		var ec: Vector2i = room["global_entry"]
		var door_pos := Structure.cell_to_world(ec.x, ec.y, Structure.ELEV_A1_PLAZA)
		for side_dx in [-2.05]:
			var pot_pos := Vector3(door_pos.x + side_dx, Structure.ELEV_A1_PLAZA, door_pos.z + 0.32)
			var pot := _create_cylinder(planters_node, "CavePot_%d_%d" % [int(room["id"]), int(sign(side_dx))], pot_pos + Vector3(0.0, 0.24, 0.0), 0.30, 0.48, _mat_pottery_glb)
			pot.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
			SceneEnhancer.add_cyl_collider(planters_node, pot_pos + Vector3(0.0, 0.38, 0.0), 0.34, 0.85)
			add_planter_cluster.call(pot_pos + Vector3(0.0, 0.46, 0.0), 0.52, 8, true)

	# 4. Jardineras y macetas en rellanos de Z2_ASCENT, terraza de los Jardines Z7 y Templo A5
	for z2_pos in [
		Vector3(56.5, 7.20, 99.0), Vector3(64.8, 9.20, 97.8), Vector3(71.0, 9.20, 90.8),
		Vector3(80.2, 18.10, 56.2), Vector3(82.4, 18.10, 59.8), Vector3(84.6, 18.10, 62.6),
		Vector3(77.5, 18.10, 58.0), Vector3(86.5, 18.10, 57.5),
		Vector3(145.5, 19.52, 66.2), Vector3(145.5, 19.52, 74.2), Vector3(153.5, 19.52, 63.2), Vector3(153.5, 19.52, 77.2)
	]:
		add_planter_cluster.call(z2_pos, 1.85, 11, true)

	var planter_foliage_mat := _make_mat(Color.WHITE, 0.88, 0.0)
	planter_foliage_mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	planter_foliage_mat.backlight_enabled = true
	planter_foliage_mat.backlight = Color(0.26, 0.44, 0.18)
	var planter_ivy_mat := _make_mat(Color("#43633a"), 0.88, 0.0)
	planter_ivy_mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	planter_ivy_mat.backlight_enabled = true
	planter_ivy_mat.backlight = Color(0.22, 0.40, 0.16)
	var planter_flower_mat := _make_mat(Color.WHITE, 0.72, 0.0)
	planter_flower_mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	planters_node.add_child(_make_multimesh_batch("MM_PlanterFoliage", SceneEnhancer.make_botanical_shrub_mesh(), planter_foliage_mat, shrub_xf, shrub_col))
	planters_node.add_child(_make_multimesh_batch("MM_PlanterIvy", SceneEnhancer.make_hanging_ivy_mesh(), planter_ivy_mat, ivy_xf, []))
	planters_node.add_child(_make_multimesh_batch("MM_PlanterFlowers", SceneEnhancer.make_blossom_cluster_mesh(), planter_flower_mat, flower_xf, flower_col))
	SceneEnhancer.merge_static_children_by_material(planters_node)

# 8D. Bosque frondoso en la montaña mediante MultiMeshInstance3D sobre puntos muestreados
func _build_lush_mountain_forest(terrain_data: Dictionary) -> void:
	var forest_node := Node3D.new()
	forest_node.name = "LushMountainForest"
	add_child(forest_node)

	var forest_pts: Array = terrain_data.get("forest_points", [])
	var under_pts: Array = terrain_data.get("understory_points", [])
	if forest_pts.is_empty():
		return

	var trunk_xf: Array[Transform3D] = []
	var crown_low_xf: Array[Transform3D] = []
	var crown_mid_xf: Array[Transform3D] = []
	var crown_high_xf: Array[Transform3D] = []
	var oak_xf: Array[Transform3D] = []
	var pine_col_a: Array[Color] = []
	var pine_col_b: Array[Color] = []
	var pine_col_c: Array[Color] = []
	var oak_col: Array[Color] = []

	var rng := RandomNumberGenerator.new()
	rng.seed = 20261114

	var pine_greens: Array[Color] = [
		Color("#2d4a31"), Color("#3b5c3b"), Color("#496d44"), Color("#567d4f")
	]
	var oak_greens: Array[Color] = [
		Color("#435e37"), Color("#536f41"), Color("#647f4b"), Color("#3a5130")
	]
	var pleamar_high_clear_pts := [
		Vector2(21.6, 50.2), Vector2(18.6, 48.2), Vector2(15.6, 46.2), Vector2(13.2, 44.5),
		Vector2(11.9, 43.3), Vector2(9.8, 42.0), Vector2(7.2, 41.5), Vector2(4.3, 40.7), Vector2(1.9, 38.4)
	]

	for pt in forest_pts:
		var pos := Vector3(float(pt.get("x", 0.0)), float(pt.get("y", 20.0)) - 0.18, float(pt.get("z", 0.0)))
		if pos.x < 18.0 and pos.z > 84.0 and pos.y < 9.0:
			continue
		var blocks_pleamar_high := false
		for cp in pleamar_high_clear_pts:
			if Vector2(pos.x, pos.z).distance_to(cp) < 3.9:
				blocks_pleamar_high = true
				break
		if blocks_pleamar_high:
			continue
		var sc := float(pt.get("s", 1.0))
		var kind := str(pt.get("k", "pine"))
		var yaw := rng.randf_range(0.0, TAU)
		var lean_x := rng.randf_range(-0.04, 0.04)
		var lean_z := rng.randf_range(-0.04, 0.04)
		var base_b := Basis.from_euler(Vector3(lean_x, yaw, lean_z))

		if kind == "pine":
			var th := 3.6 * sc
			trunk_xf.append(Transform3D(base_b.scaled(Vector3(0.20 * sc, th, 0.20 * sc)), pos + Vector3(0.0, th * 0.5, 0.0)))
			var tone: Color = pine_greens[rng.randi() % pine_greens.size()]
			crown_low_xf.append(Transform3D(base_b.scaled(Vector3(1.58 * sc, 1.85 * sc, 1.58 * sc)), pos + Vector3(0.0, 2.55 * sc, 0.0)))
			pine_col_a.append(tone)
			crown_mid_xf.append(Transform3D(base_b.rotated(Vector3.UP, 0.72).scaled(Vector3(1.22 * sc, 1.75 * sc, 1.22 * sc)), pos + Vector3(0.0, 3.75 * sc, 0.0)))
			pine_col_b.append(tone.lightened(0.05))
			crown_high_xf.append(Transform3D(base_b.rotated(Vector3.UP, 1.44).scaled(Vector3(0.84 * sc, 1.55 * sc, 0.84 * sc)), pos + Vector3(0.0, 4.85 * sc, 0.0)))
			pine_col_c.append(tone.lightened(0.10))
		elif kind == "cypress":
			var th := 4.4 * sc
			trunk_xf.append(Transform3D(base_b.scaled(Vector3(0.18 * sc, th, 0.18 * sc)), pos + Vector3(0.0, th * 0.5, 0.0)))
			var ctone: Color = pine_greens[0].lightened(rng.randf_range(0.0, 0.06))
			crown_low_xf.append(Transform3D(base_b.scaled(Vector3(0.95 * sc, 2.75 * sc, 0.95 * sc)), pos + Vector3(0.0, 2.75 * sc, 0.0)))
			pine_col_a.append(ctone)
			crown_mid_xf.append(Transform3D(base_b.rotated(Vector3.UP, 0.45).scaled(Vector3(0.72 * sc, 2.55 * sc, 0.72 * sc)), pos + Vector3(0.0, 4.35 * sc, 0.0)))
			pine_col_b.append(ctone.lightened(0.05))
		else:
			var th := 2.6 * sc
			trunk_xf.append(Transform3D(base_b.scaled(Vector3(0.24 * sc, th, 0.24 * sc)), pos + Vector3(0.0, th * 0.5, 0.0)))
			var otone: Color = oak_greens[rng.randi() % oak_greens.size()]
			oak_xf.append(Transform3D(base_b.scaled(Vector3(1.85 * sc, 1.50 * sc, 1.80 * sc)), pos + Vector3(0.0, 3.05 * sc, 0.0)))
			oak_col.append(otone)
			oak_xf.append(Transform3D(base_b.rotated(Vector3.UP, 1.1).scaled(Vector3(1.32 * sc, 1.25 * sc, 1.28 * sc)), pos + Vector3(0.35 * sc, 3.60 * sc, -0.28 * sc)))
			oak_col.append(otone.lightened(0.06))

	var bush_xf: Array[Transform3D] = []
	var bush_col: Array[Color] = []
	var fl_xf: Array[Transform3D] = []
	var fl_col: Array[Color] = []
	var flower_colors: Array[Color] = [Color("#cdb460"), Color("#8e74b8"), Color("#dfd6ba")]

	for u in under_pts:
		var upos := Vector3(float(u.get("x", 0.0)), float(u.get("y", 20.0)) - 0.08, float(u.get("z", 0.0)))
		if upos.x < 18.0 and upos.z > 84.0 and upos.y < 9.0:
			continue
		var blocks_under := false
		for cp in pleamar_high_clear_pts:
			if Vector2(upos.x, upos.z).distance_to(cp) < 3.9:
				blocks_under = true
				break
		if blocks_under:
			continue
		var usc := float(u.get("s", 1.0))
		var ub := Basis.from_euler(Vector3(0.0, rng.randf_range(0.0, TAU), 0.0)).scaled(Vector3(1.12 * usc, 1.02 * usc, 1.12 * usc))
		bush_xf.append(Transform3D(ub, upos + Vector3(0.0, 0.04, 0.0)))
		bush_col.append(oak_greens[rng.randi() % oak_greens.size()].darkened(0.05))
		if int(u.get("f", 0)) == 1:
			var fb := Basis.from_euler(Vector3(0.0, rng.randf_range(0.0, TAU), 0.0)).scaled(Vector3(0.32 * usc, 0.32 * usc, 0.32 * usc))
			fl_xf.append(Transform3D(fb, upos + Vector3(rng.randf_range(-0.22, 0.22), 0.36 * usc, rng.randf_range(-0.22, 0.22))))
			fl_col.append(flower_colors[rng.randi() % flower_colors.size()])

	var cone_mesh := _make_pine_tier_mesh()
	var crown_mat := OcclusionCtrl.make_canopy_dissolve_material(Color.WHITE, 0.90, Color(0.24, 0.42, 0.16), true)
	var fl_mat := _make_mat(Color.WHITE, 0.74, 0.0)
	fl_mat.cull_mode = BaseMaterial3D.CULL_DISABLED

	var trunk_mesh := CylinderMesh.new()
	trunk_mesh.top_radius = 0.45
	trunk_mesh.bottom_radius = 0.72
	trunk_mesh.height = 1.0
	trunk_mesh.radial_segments = 7

	forest_node.add_child(_make_multimesh_batch("MM_ForestTrunks", trunk_mesh, mat_wood_dark, trunk_xf, []))
	if not trunk_xf.is_empty():
		var trunk_body := StaticBody3D.new()
		trunk_body.name = "ForestTrunkColliders"
		forest_node.add_child(trunk_body)
		for xf in trunk_xf:
			var sc_t: Vector3 = xf.basis.get_scale()
			var c_col := CollisionShape3D.new()
			var c_shp := CylinderShape3D.new()
			c_shp.radius = maxf(0.18, maxf(sc_t.x, sc_t.z) * 0.68)
			c_shp.height = maxf(1.2, sc_t.y)
			c_col.shape = c_shp
			c_col.position = xf.origin
			trunk_body.add_child(c_col)
	forest_node.add_child(_make_multimesh_batch("MM_PineCrownLow", cone_mesh, crown_mat, crown_low_xf, pine_col_a))
	forest_node.add_child(_make_multimesh_batch("MM_PineCrownMid", cone_mesh, crown_mat, crown_mid_xf, pine_col_b))
	forest_node.add_child(_make_multimesh_batch("MM_PineCrownHigh", cone_mesh, crown_mat, crown_high_xf, pine_col_c))
	forest_node.add_child(_make_multimesh_batch("MM_OakCanopies", _make_bush_mesh(), crown_mat, oak_xf, oak_col))
	forest_node.add_child(_make_multimesh_batch("MM_UnderstoryBushes", SceneEnhancer.make_botanical_shrub_mesh(), crown_mat, bush_xf, bush_col))
	forest_node.add_child(_make_multimesh_batch("MM_ForestFlowers", SceneEnhancer.make_blossom_cluster_mesh(), fl_mat, fl_xf, fl_col))

func _make_pine_tier_mesh() -> ArrayMesh:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var boughs := 18
	var apex := Vector3(0.0, 0.56, 0.0)
	var mid_ring: Array[Vector3] = []
	var skirt_ring: Array[Vector3] = []
	for i in range(boughs):
		var ang := float(i) / float(boughs) * TAU
		var is_lobe := (i % 2 == 0)
		var mid_rad := 0.58 if is_lobe else 0.44
		var mid_y := 0.06 if is_lobe else 0.12
		mid_ring.append(Vector3(cos(ang) * mid_rad, mid_y, sin(ang) * mid_rad))
		var rad := 1.06 if is_lobe else 0.72
		var drop := -0.52 if is_lobe else -0.40
		skirt_ring.append(Vector3(cos(ang + 0.08) * rad, drop, sin(ang + 0.08) * rad))
	var center_bottom := Vector3(0.0, -0.32, 0.0)
	var col_apex := Color(1.16, 1.20, 1.04)
	var col_mid := Color(1.0, 1.02, 0.96)
	var col_tip := Color(0.84, 0.88, 0.80)
	var col_under := Color(0.58, 0.62, 0.56)
	for i in range(boughs):
		var next_i := (i + 1) % boughs
		var m1 := mid_ring[i]
		var m2 := mid_ring[next_i]
		var p1 := skirt_ring[i]
		var p2 := skirt_ring[next_i]
		st.set_color(col_apex); st.add_vertex(apex)
		st.set_color(col_mid); st.add_vertex(m1)
		st.set_color(col_mid); st.add_vertex(m2)

		st.set_color(col_mid); st.add_vertex(m1)
		st.set_color(col_tip); st.add_vertex(p1)
		st.set_color(col_tip); st.add_vertex(p2)

		st.set_color(col_mid); st.add_vertex(m1)
		st.set_color(col_tip); st.add_vertex(p2)
		st.set_color(col_mid); st.add_vertex(m2)

		st.set_color(col_under); st.add_vertex(center_bottom)
		st.set_color(col_under); st.add_vertex(p2)
		st.set_color(col_under); st.add_vertex(p1)
	st.generate_normals()
	return st.commit()

func _make_bush_mesh() -> Mesh:
	return SceneEnhancer.make_lush_canopy_cluster_mesh()

func _make_flower_mesh() -> Mesh:
	var s := SphereMesh.new()
	s.radius = 0.5
	s.height = 0.8
	s.radial_segments = 7
	s.rings = 4
	return s

func _build_single_multimesh_node(batch_name: String, mesh_res: Mesh, mat: Material, transforms: Array[Transform3D], colors: Array[Color], use_colors: bool, shadow_mode: GeometryInstance3D.ShadowCastingSetting) -> MultiMeshInstance3D:
	var mmi := MultiMeshInstance3D.new()
	mmi.name = batch_name
	var mm := MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	mm.use_colors = use_colors
	mm.mesh = mesh_res
	mm.instance_count = transforms.size()
	for i in range(transforms.size()):
		mm.set_instance_transform(i, transforms[i])
		if use_colors and i < colors.size():
			mm.set_instance_color(i, colors[i])
	mmi.multimesh = mm
	mmi.material_override = mat
	mmi.cast_shadow = shadow_mode
	return mmi

func _make_multimesh_batch(batch_name: String, mesh_res: Mesh, mat: Material, transforms: Array[Transform3D], colors: Array[Color]) -> MultiMeshInstance3D:
	var use_colors := not colors.is_empty()
	var resolved_mat: Material = mat
	if use_colors and mat is BaseMaterial3D:
		var colored_mat := (mat as BaseMaterial3D).duplicate() as BaseMaterial3D
		colored_mat.vertex_color_use_as_albedo = true
		colored_mat.vertex_color_is_srgb = true
		resolved_mat = colored_mat
	var shadow_mode := GeometryInstance3D.SHADOW_CASTING_SETTING_ON if ("CrownLow" in batch_name or "Oak" in batch_name) else GeometryInstance3D.SHADOW_CASTING_SETTING_OFF

	if transforms.size() > 140:
		var min_x := INF
		var max_x := -INF
		var min_z := INF
		var max_z := -INF
		for xf in transforms:
			min_x = minf(min_x, xf.origin.x)
			max_x = maxf(max_x, xf.origin.x)
			min_z = minf(min_z, xf.origin.z)
			max_z = maxf(max_z, xf.origin.z)
		var span_x := maxf(0.01, max_x - min_x)
		var span_z := maxf(0.01, max_z - min_z)
		if span_x > 36.0 or span_z > 36.0:
			const GX := 4
			const GZ := 3
			var cell_xfs: Array = []
			var cell_cols: Array = []
			for _ci in range(GX * GZ):
				var arr_xf: Array[Transform3D] = []
				var arr_col: Array[Color] = []
				cell_xfs.append(arr_xf)
				cell_cols.append(arr_col)
			for i in range(transforms.size()):
				var xf := transforms[i]
				var gx := clampi(int(((xf.origin.x - min_x) / span_x) * float(GX)), 0, GX - 1)
				var gz := clampi(int(((xf.origin.z - min_z) / span_z) * float(GZ)), 0, GZ - 1)
				var idx := gz * GX + gx
				(cell_xfs[idx] as Array[Transform3D]).append(xf)
				if use_colors and i < colors.size():
					(cell_cols[idx] as Array[Color]).append(colors[i])
			var primary_mmi: MultiMeshInstance3D = null
			var chunk_idx := 1
			for bi in range(GX * GZ):
				var bxfs: Array[Transform3D] = cell_xfs[bi]
				if bxfs.is_empty():
					continue
				var bcols: Array[Color] = cell_cols[bi]
				if primary_mmi == null:
					primary_mmi = _build_single_multimesh_node(batch_name, mesh_res, resolved_mat, bxfs, bcols, use_colors, shadow_mode)
				else:
					var child_mmi := _build_single_multimesh_node("%s_chunk_%d" % [batch_name, chunk_idx], mesh_res, resolved_mat, bxfs, bcols, use_colors, shadow_mode)
					primary_mmi.add_child(child_mmi)
					chunk_idx += 1
			if primary_mmi != null:
				return primary_mmi

	return _build_single_multimesh_node(batch_name, mesh_res, resolved_mat, transforms, colors, use_colors, shadow_mode)

# 9. Marcadores de los 16 Landmarks canónicos
func _build_landmarks() -> void:
	var landmarks_node := Node3D.new()
	landmarks_node.name = "Landmarks"
	add_child(landmarks_node)

	for lm_id in Structure.LANDMARKS.keys():
		var lm: Dictionary = Structure.LANDMARKS[lm_id]
		var world_pos: Vector3 = lm["world_pos"]

		var marker := Node3D.new()
		marker.name = "Marker_" + lm_id
		marker.position = world_pos
		landmarks_node.add_child(marker)

		var mesh_inst := MeshInstance3D.new()
		var sphere := SphereMesh.new()
		sphere.radius = 0.095
		sphere.height = 0.19
		mesh_inst.mesh = sphere
		mesh_inst.material_override = mat_marker
		mesh_inst.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		mesh_inst.position = Vector3(0, 0.35, 0)
		marker.add_child(mesh_inst)

		var label := Label3D.new()
		label.text = lm["label"]
		label.font_size = 13
		label.pixel_size = 0.011
		label.billboard = BaseMaterial3D.BILLBOARD_ENABLED
		label.position = Vector3(0, 1.05, 0)
		label.modulate = Color(1.0, 0.94, 0.78, 0.78)
		marker.add_child(label)
		if lm_id == "pleamar":
			mesh_inst.visible = false
			label.visible = false

# Auxiliares de geometría
func _create_surface_slab(parent: Node, slab_name: String, pos: Vector3, size: Vector3, mat: Material) -> MeshInstance3D:
	var mesh := BoxMesh.new()
	mesh.size = size
	var inst := MeshInstance3D.new()
	inst.name = slab_name
	inst.mesh = mesh
	inst.material_override = mat
	inst.position = pos

	var sb := StaticBody3D.new()
	sb.name = slab_name + "_StaticBody"
	var col := CollisionShape3D.new()
	var box_shape := BoxShape3D.new()
	box_shape.size = size
	col.shape = box_shape
	sb.add_child(col)
	inst.add_child(sb)

	parent.add_child(inst)
	return inst

func _create_box_prop(parent: Node, prop_name: String, pos: Vector3, size: Vector3, mat: Material) -> MeshInstance3D:
	var mesh := BoxMesh.new()
	mesh.size = size
	var inst := MeshInstance3D.new()
	inst.name = prop_name
	inst.mesh = mesh
	inst.material_override = mat
	inst.position = pos
	parent.add_child(inst)
	return inst

func _create_cylinder(parent: Node, prop_name: String, pos: Vector3, radius: float, height: float, mat: Material) -> MeshInstance3D:
	var mesh := CylinderMesh.new()
	mesh.top_radius = radius
	mesh.bottom_radius = radius
	mesh.height = height
	mesh.radial_segments = 12
	var inst := MeshInstance3D.new()
	inst.name = prop_name
	inst.mesh = mesh
	inst.material_override = mat
	inst.position = pos
	parent.add_child(inst)
	return inst

# ==============================================================================
# 10. CAMINOS SCÉNICOS DE TRANSICIÓN ENTRE MAPAS Y SALIDAS (MapExit + Spawns)
# ==============================================================================
func _build_scenic_transition_paths() -> void:
	var root := Node3D.new()
	root.name = "MapTransitionPaths"
	add_child(root)

	# Compartir batches MultiMesh ligeros para bordes, rocas y arboledas de cierre
	var trail_rocks_xf: Array[Transform3D] = []
	var trail_rocks_col: Array[Color] = []
	var trail_bushes_xf: Array[Transform3D] = []
	var trail_bushes_col: Array[Color] = []
	var trail_trunks_xf: Array[Transform3D] = []
	var trail_pine_a_xf: Array[Transform3D] = []
	var trail_pine_a_col: Array[Color] = []
	var trail_pine_b_xf: Array[Transform3D] = []
	var trail_pine_b_col: Array[Color] = []
	var trail_pine_c_xf: Array[Transform3D] = []
	var trail_pine_c_col: Array[Color] = []

	var rng := RandomNumberGenerator.new()
	rng.seed = 20261115

	var routes := [
		{
			"id": "pleamar-low",
			"name": "Sendero Costero a Cuevas de Pleamar",
			"target_scene": "res://scenes/pleamar_coves.tscn",
			"target_spawn": "from_pleamar_low",
			"facing": "sw",
			"return_spawn": "from_pleamar_low",
			"return_pos": Vector3(10.6, 0.58, 95.3),
			"return_facing": "ne",
			"exit_pos": Vector3(5.6, 0.54, 99.2),
			"exit_radius": 1.95,
			"base_width": 2.60,
			"skirt_depth": 0.12,
			"tight_skirt": true,
			"sandy_merge": true,
			"ridge_height": 1.75,
			"start_tint": Color("#d5b988"),
			"tread_tint": Color("#c6a473"),
			"edge_tint": Color("#dcc497"),
			"mist": true,
			"pts": [
				Vector3(25.0, 0.51, 109.5), Vector3(22.4, 0.52, 108.7), Vector3(19.6, 0.535, 106.8),
				Vector3(16.9, 0.55, 103.4), Vector3(15.2, 0.56, 98.4), Vector3(14.3, 0.565, 95.1),
				Vector3(13.3, 0.568, 93.7), Vector3(12.1, 0.57, 93.5), Vector3(10.6, 0.56, 95.1),
				Vector3(8.6, 0.55, 97.2), Vector3(6.9, 0.545, 98.5), Vector3(5.6, 0.54, 99.2),
				Vector3(3.8, 0.53, 98.6), Vector3(2.2, 0.52, 97.0), Vector3(1.4, 0.50, 94.8)
			]
		},
		{
			"id": "pleamar-high",
			"name": "Senda Alta hacia el Collado de Pleamar",
			"target_scene": "res://scenes/pleamar_coves.tscn",
			"target_spawn": "from_pleamar_high",
			"facing": "nw",
			"return_spawn": "from_pleamar_high",
			"return_pos": Vector3(9.8, 21.25, 42.0),
			"return_facing": "se",
			"exit_pos": Vector3(4.3, 20.95, 40.65),
			"exit_radius": 1.95,
			"base_width": 2.45,
			"skirt_depth": 0.35,
			"tight_skirt": true,
			"ridge_height": 2.1,
			"start_tint": Color("#b49a76"),
			"tread_tint": Color("#ab9474"),
			"edge_tint": Color("#6d6654"),
			"mist": false,
			"pts": [
				Vector3(21.6, 21.25, 50.2), Vector3(18.6, 21.25, 48.2),
				Vector3(15.6, 21.25, 46.2), Vector3(13.2, 21.25, 44.5), Vector3(11.9, 21.24, 43.33),
				Vector3(10.92, 21.22, 42.59), Vector3(9.82, 21.18, 41.99), Vector3(8.58, 21.14, 41.60),
				Vector3(7.22, 21.10, 41.46), Vector3(5.80, 21.02, 41.20), Vector3(4.28, 20.95, 40.66),
				Vector3(2.92, 20.72, 39.61), Vector3(1.85, 20.38, 38.40), Vector3(0.40, 19.85, 36.60),
				Vector3(-2.2, 19.10, 34.0), Vector3(-5.8, 18.20, 31.2), Vector3(-9.8, 17.30, 28.4)
			]
		},
		{
			"id": "observatory-inland",
			"name": "Paso Norte hacia el Observatorio",
			"target_scene": "res://scenes/observatory_approach.tscn",
			"target_spawn": "from_obs_inland",
			"facing": "nw",
			"return_spawn": "from_obs_inland",
			"return_pos": Vector3(118.8, 37.05, 13.9),
			"return_facing": "se",
			"exit_pos": Vector3(115.6, 37.35, 9.8),
			"exit_radius": 1.95,
			"base_width": 2.35,
			"skirt_depth": 0.32,
			"tight_skirt": true,
			"ridge_height": 2.3,
			"start_tint": Color("#b49064"),
			"tread_tint": Color("#ad8c64"),
			"edge_tint": Color("#636b4a"),
			"mist": false,
			"pts": [
				Vector3(123.0, 36.88, 18.0), Vector3(121.8, 36.95, 16.8), Vector3(120.75, 37.0, 15.75),
				Vector3(119.8, 37.05, 14.8), Vector3(118.8, 37.12, 13.9), Vector3(117.5, 37.22, 12.8),
				Vector3(116.5, 37.30, 11.5), Vector3(115.6, 37.35, 9.8), Vector3(114.6, 37.55, 6.8),
				Vector3(114.8, 37.82, 3.2), Vector3(116.5, 38.12, -0.5), Vector3(119.8, 38.45, -3.8)
			]
		},
		{
			"id": "observatory-coast",
			"name": "Cornisa Oriental al Observatorio",
			"target_scene": "res://scenes/observatory_approach.tscn",
			"target_spawn": "from_obs_coast",
			"facing": "ne",
			"return_spawn": "from_obs_coast",
			"return_pos": Vector3(161.2, 32.75, 24.8),
			"return_facing": "sw",
			"exit_pos": Vector3(164.6, 32.98, 22.4),
			"exit_radius": 1.95,
			"base_width": 2.25,
			"skirt_depth": 0.28,
			"tight_skirt": true,
			"ridge_height": 1.85,
			"start_tint": Color("#b8966c"),
			"tread_tint": Color("#ae8e68"),
			"edge_tint": Color("#6d6856"),
			"mist": false,
			"pts": [
				Vector3(160.5, 32.35, 28.4), Vector3(160.5, 32.66, 26.8), Vector3(160.4, 32.76, 25.45),
				Vector3(161.3, 32.82, 24.7), Vector3(162.3, 32.88, 24.0), Vector3(163.5, 32.93, 23.2),
				Vector3(164.6, 32.98, 22.4), Vector3(163.2, 33.12, 19.6), Vector3(160.5, 33.30, 16.2),
				Vector3(157.0, 33.52, 12.4), Vector3(153.5, 33.78, 8.2)
			]
		}
	]

	# Construir cala costera natural y arco de roca marina para pleamar-low (rehecho desde cero)
	_build_pleamar_low_coastal_cove(root, rng, trail_rocks_xf, trail_rocks_col, trail_bushes_xf, trail_bushes_col, trail_trunks_xf, trail_pine_a_xf, trail_pine_a_col, trail_pine_b_xf, trail_pine_b_col, trail_pine_c_xf, trail_pine_c_col)

	for route in routes:
		var rid: String = str(route["id"])
		var smoothed: Array[Vector3] = _chaikin_smooth_3d(route["pts"], 1)
		_create_trail_ribbon_mesh(root, rid, smoothed, route, rng)
		_create_trail_colliders(root, rid, smoothed, route["exit_pos"], float(route["base_width"]))
		_populate_trail_framing(root, smoothed, route, rng, trail_rocks_xf, trail_rocks_col, trail_bushes_xf, trail_bushes_col, trail_trunks_xf, trail_pine_a_xf, trail_pine_a_col, trail_pine_b_xf, trail_pine_b_col, trail_pine_c_xf, trail_pine_c_col)

		if bool(route.get("mist", false)):
			_create_coastal_mist(root, "Mist_" + rid, Vector3(1.5, 1.35, 99.2))

		# Marcador de aparicion al regresar por este camino
		var sp := Marker3D.new()
		sp.name = "Spawn_" + str(route["return_spawn"])
		sp.position = route["return_pos"]
		sp.set_meta("spawn_facing", str(route["return_facing"]))
		root.add_child(sp)

		# Zona de activacion MapExit integrada en el tramo de curva oculto
		var exit_node := MapExitScript.new()
		exit_node.name = "Exit_" + rid.capitalize().replace("-", "_")
		exit_node.exit_id = rid
		exit_node.display_name = str(route["name"])
		exit_node.destination_label = "Cuevas de Pleamar" if rid.begins_with("pleamar") else "Aproximación al Observatorio"
		exit_node.target_scene_path = str(route["target_scene"])
		exit_node.target_spawn_id = str(route["target_spawn"])
		exit_node.entry_facing = str(route["facing"])
		exit_node.transition_mode = "trail"
		exit_node.trigger_radius = float(route["exit_radius"])
		exit_node.trigger_height = 3.2
		exit_node.auto_trigger = true
		exit_node.reversible = true
		exit_node.position = route["exit_pos"]
		var exit_dir: Vector3 = (smoothed[mini(6, smoothed.size() - 1)] - smoothed[0]).normalized()
		exit_node.path_direction = Vector3(exit_dir.x, 0.0, exit_dir.z)
		root.add_child(exit_node)

	# Respaldo orografico NO y N para que la camara tactica no muestre borde recto del terreno
	_build_horizon_backdrop_shoulders(root, rng, trail_rocks_xf, trail_rocks_col, trail_bushes_xf, trail_bushes_col, trail_trunks_xf, trail_pine_a_xf, trail_pine_a_col, trail_pine_b_xf, trail_pine_b_col, trail_pine_c_xf, trail_pine_c_col)

	# 5a conexion: Bote en el embarcadero (Z1 -> Pecio) con activacion manual [T] o HUD
	var boat_spawn := Marker3D.new()
	boat_spawn.name = "Spawn_from_retreat_boat"
	boat_spawn.position = Vector3(20.6, 0.58, 110.2)
	boat_spawn.set_meta("spawn_facing", "n")
	root.add_child(boat_spawn)

	var boat_exit := MapExitScript.new()
	boat_exit.name = "Exit_Boat_Pecio"
	boat_exit.exit_id = "boat-pecio"
	boat_exit.display_name = "Bote hacia El Pecio"
	boat_exit.destination_label = "Arribo al Pecio Rosa de los Vientos"
	boat_exit.target_scene_path = "res://scenes/pecio_cove_arrival.tscn"
	boat_exit.target_spawn_id = "from_retreat_boat"
	boat_exit.entry_facing = "s"
	boat_exit.transition_mode = "boat"
	boat_exit.trigger_radius = 2.4
	boat_exit.trigger_height = 3.2
	boat_exit.auto_trigger = false
	boat_exit.reversible = true
	boat_exit.interaction_hint = "[T] Embarcar hacia El Pecio"
	boat_exit.path_direction = Vector3(0.0, 0.0, 1.0)
	boat_exit.position = Vector3(20.6, 0.55, 114.1)
	root.add_child(boat_exit)

	# Emitir lotes MultiMesh de todo el enmarcado natural
	var rock_mesh := SceneEnhancer.make_basalt_outcrop_mesh(71)
	var rock_mat := _make_mat(Color.WHITE, 0.94, 0.02)
	if not trail_rocks_xf.is_empty():
		root.add_child(_make_multimesh_batch("MM_TrailRocks", rock_mesh, rock_mat, trail_rocks_xf, trail_rocks_col))
		var tr_rock_body := StaticBody3D.new()
		tr_rock_body.name = "TrailRockColliders"
		root.add_child(tr_rock_body)
		for rxf in trail_rocks_xf:
			var rs: Vector3 = rxf.basis.get_scale()
			if maxf(rs.x, rs.z) < 0.70:
				continue
			var rcol := CollisionShape3D.new()
			var rshp := SphereShape3D.new()
			rshp.radius = clampf(minf(rs.x, rs.z) * 0.45, 0.26, 1.35)
			rcol.shape = rshp
			rcol.position = rxf.origin + Vector3(0.0, rshp.radius * 0.35, 0.0)
			tr_rock_body.add_child(rcol)

	var bush_mesh := SceneEnhancer.make_botanical_shrub_mesh()
	var bush_mat := OcclusionCtrl.make_canopy_dissolve_material(Color.WHITE, 0.88, Color(0.24, 0.42, 0.16), true)
	if not trail_bushes_xf.is_empty():
		root.add_child(_make_multimesh_batch("MM_TrailBushes", bush_mesh, bush_mat, trail_bushes_xf, trail_bushes_col))

	if not trail_trunks_xf.is_empty():
		var cone_mesh := _make_pine_tier_mesh()
		var crown_mat := OcclusionCtrl.make_canopy_dissolve_material(Color.WHITE, 0.90, Color(0.24, 0.42, 0.16), true)
		var trunk_mesh := CylinderMesh.new()
		trunk_mesh.top_radius = 0.45
		trunk_mesh.bottom_radius = 0.72
		trunk_mesh.height = 1.0
		trunk_mesh.radial_segments = 7
		root.add_child(_make_multimesh_batch("MM_TrailTrunks", trunk_mesh, mat_wood_dark, trail_trunks_xf, []))
		var tr_trunk_body := StaticBody3D.new()
		tr_trunk_body.name = "TrailTrunkColliders"
		root.add_child(tr_trunk_body)
		for txf in trail_trunks_xf:
			var ts: Vector3 = txf.basis.get_scale()
			var tcol := CollisionShape3D.new()
			var tshp := CylinderShape3D.new()
			tshp.radius = maxf(0.18, maxf(ts.x, ts.z) * 0.68)
			tshp.height = maxf(1.2, ts.y)
			tcol.shape = tshp
			tcol.position = txf.origin
			tr_trunk_body.add_child(tcol)
		root.add_child(_make_multimesh_batch("MM_TrailCrownLow", cone_mesh, crown_mat, trail_pine_a_xf, trail_pine_a_col))
		root.add_child(_make_multimesh_batch("MM_TrailCrownMid", cone_mesh, crown_mat, trail_pine_b_xf, trail_pine_b_col))
		root.add_child(_make_multimesh_batch("MM_TrailCrownHigh", cone_mesh, crown_mat, trail_pine_c_xf, trail_pine_c_col))

func _chaikin_smooth_3d(pts: Array, iterations: int = 1) -> Array[Vector3]:
	var current: Array[Vector3] = []
	for p in pts:
		current.append(p as Vector3)
	for _it in range(iterations):
		if current.size() < 3:
			break
		var next: Array[Vector3] = [current[0]]
		for i in range(current.size() - 1):
			var a := current[i]
			var b := current[i + 1]
			next.append(a.lerp(b, 0.25))
			next.append(a.lerp(b, 0.75))
		next.append(current[current.size() - 1])
		current = next
	return current

func _create_trail_ribbon_mesh(parent: Node, route_id: String, pts: Array[Vector3], cfg: Dictionary, rng: RandomNumberGenerator) -> void:
	if pts.size() < 2:
		return
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)

	var base_w := float(cfg["base_width"])
	var skirt := float(cfg["skirt_depth"])
	var start_col: Color = cfg.get("start_tint", cfg["tread_tint"])
	var tread_col: Color = cfg["tread_tint"]
	var edge_col: Color = cfg["edge_tint"]
	var sandy_merge := bool(cfg.get("sandy_merge", false))
	var rock_col := Color("#545049")
	var sand_skirt_col := Color("#e0ca9d")

	var rings: Array[Dictionary] = []
	for i in range(pts.size()):
		var p := pts[i]
		var fwd: Vector3
		if i == 0:
			fwd = pts[1] - pts[0]
		elif i == pts.size() - 1:
			fwd = pts[i] - pts[i - 1]
		else:
			fwd = pts[i + 1] - pts[i - 1]
		fwd.y = 0.0
		if fwd.length_squared() < 0.0001:
			fwd = Vector3.FORWARD
		fwd = fwd.normalized()
		var right := Vector3(-fwd.z, 0.0, fwd.x)

		# Fundido progresivo (feathering) en los primeros tramos para igualar anchura y color del suelo previo
		var tight_skirt := bool(cfg.get("tight_skirt", false))
		var route_prog := float(i) / maxf(1.0, float(pts.size() - 1))
		var blend_t := clampf(float(i) / (4.5 if sandy_merge else 7.0), 0.0, 1.0)
		var w_jitter := 1.0 + (0.08 * sin(float(i) * 1.35) + rng.randf_range(-0.03, 0.03)) * blend_t
		var entry_w_mult := lerpf(1.24 if sandy_merge else 0.92, 1.0, blend_t)
		var half_w := base_w * 0.5 * w_jitter * entry_w_mult
		var outer_w := half_w + lerpf(0.32 if sandy_merge else 0.10, 0.30 if sandy_merge else (0.24 if tight_skirt else 0.56), blend_t)
		var skirt_span := 0.32 if sandy_merge else (0.22 if tight_skirt else 0.85)
		var c_noise := rng.randf_range(-0.025, 0.025) * blend_t

		var cur_tread: Color = start_col.lerp(tread_col, blend_t)
		var cur_edge: Color = (sand_skirt_col if sandy_merge else start_col.darkened(0.05)).lerp(edge_col, blend_t)
		var cur_skirt: Color = sand_skirt_col.lerp(rock_col, smoothstep(0.68, 0.94, route_prog)) if sandy_merge else rock_col
		var center_lift := lerpf(0.018 if sandy_merge else 0.002, 0.026 if sandy_merge else 0.018, blend_t)
		var tread_lift := lerpf(0.010 if sandy_merge else 0.001, 0.016 if sandy_merge else 0.005, blend_t)
		var verge_drop := lerpf(0.014 if sandy_merge else 0.005, 0.018 if sandy_merge else (0.035 if tight_skirt else 0.14), blend_t)
		var skirt_drop_cur := lerpf(0.08, skirt, blend_t)

		var l_skirt := p - right * (outer_w + skirt_span) - Vector3(0.0, skirt_drop_cur, 0.0)
		var l_verge := p - right * outer_w - Vector3(0.0, verge_drop, 0.0)
		var l_tread := p - right * half_w + Vector3(0.0, tread_lift, 0.0)
		var center := p + Vector3(0.0, center_lift, 0.0)
		var r_tread := p + right * half_w + Vector3(0.0, tread_lift, 0.0)
		var r_verge := p + right * outer_w - Vector3(0.0, verge_drop, 0.0)
		var r_skirt := p + right * (outer_w + skirt_span) - Vector3(0.0, skirt_drop_cur, 0.0)

		rings.append({
			"pts": [l_skirt, l_verge, l_tread, center, r_tread, r_verge, r_skirt],
			"cols": [
				cur_skirt,
				cur_edge.darkened(0.03 + c_noise),
				cur_tread.darkened(0.03 + c_noise),
				cur_tread.lightened(0.03 + c_noise),
				cur_tread.darkened(0.03 - c_noise),
				cur_edge.darkened(0.03 - c_noise),
				cur_skirt
			],
			"u": float(i) * 0.45
		})

	var vs := [0.0, 0.18, 0.34, 0.5, 0.66, 0.82, 1.0]
	for i in range(rings.size() - 1):
		var a := rings[i]
		var b := rings[i + 1]
		var pa: Array = a["pts"]
		var pb: Array = b["pts"]
		var ca: Array = a["cols"]
		var cb: Array = b["cols"]
		var ua := float(a["u"])
		var ub := float(b["u"])
		for s in range(6):
			_emit_quad_st(st, pa[s], pa[s + 1], pb[s + 1], pb[s], ca[s], ca[s + 1], cb[s + 1], cb[s], Vector2(ua, vs[s]), Vector2(ua, vs[s + 1]), Vector2(ub, vs[s + 1]), Vector2(ub, vs[s]))

	st.generate_normals()
	var inst := MeshInstance3D.new()
	inst.name = "TrailMesh_" + route_id
	inst.mesh = st.commit()
	var trail_mat := StandardMaterial3D.new()
	trail_mat.vertex_color_use_as_albedo = true
	trail_mat.vertex_color_is_srgb = true
	trail_mat.roughness = 0.90
	trail_mat.metallic = 0.02
	if mat_trail and mat_trail.albedo_texture:
		trail_mat.albedo_texture = mat_trail.albedo_texture
		trail_mat.uv1_scale = Vector3(0.42, 0.42, 0.42)
	inst.material_override = trail_mat
	inst.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	parent.add_child(inst)

func _emit_quad_st(st: SurfaceTool, p0: Vector3, p1: Vector3, p2: Vector3, p3: Vector3, c0: Color, c1: Color, c2: Color, c3: Color, uv0: Vector2, uv1: Vector2, uv2: Vector2, uv3: Vector2) -> void:
	st.set_color(c0); st.set_uv(uv0); st.add_vertex(p0)
	st.set_color(c3); st.set_uv(uv3); st.add_vertex(p3)
	st.set_color(c2); st.set_uv(uv2); st.add_vertex(p2)
	st.set_color(c0); st.set_uv(uv0); st.add_vertex(p0)
	st.set_color(c2); st.set_uv(uv2); st.add_vertex(p2)
	st.set_color(c1); st.set_uv(uv1); st.add_vertex(p1)

func _create_trail_colliders(parent: Node, route_id: String, pts: Array[Vector3], exit_pos: Vector3, base_w: float) -> void:
	var sb := StaticBody3D.new()
	sb.name = "TrailCollision_" + route_id
	parent.add_child(sb)
	var stop_after_exit := false
	for i in range(pts.size() - 1):
		var a := pts[i]
		var b := pts[i + 1]
		var mid := (a + b) * 0.5
		var seg := b - a
		var horiz := Vector2(seg.x, seg.z).length()
		if horiz < 0.05:
			continue
		var col := CollisionShape3D.new()
		var box := BoxShape3D.new()
		box.size = Vector3(base_w + 0.6, 1.4, seg.length() + 0.55)
		col.shape = box
		var yaw := atan2(seg.x, seg.z)
		var pitch := -atan2(seg.y, horiz)
		var xf := Transform3D(Basis.from_euler(Vector3(pitch, yaw, 0.0)), mid - Vector3(0.0, 0.70, 0.0))
		col.transform = xf
		sb.add_child(col)
		if mid.distance_to(exit_pos) < 1.8:
			stop_after_exit = true
		elif stop_after_exit and mid.distance_to(exit_pos) > 3.6:
			break

func _build_pleamar_low_coastal_cove(parent: Node, rng: RandomNumberGenerator, rocks_xf: Array[Transform3D], rocks_col: Array[Color], bushes_xf: Array[Transform3D], bushes_col: Array[Color], trunks_xf: Array[Transform3D], pine_a_xf: Array[Transform3D], pine_a_col: Array[Color], pine_b_xf: Array[Transform3D], pine_b_col: Array[Color], pine_c_xf: Array[Transform3D], pine_c_col: Array[Color]) -> void:
	var cove_node := Node3D.new()
	cove_node.name = "PleamarCoastalCove"
	parent.add_child(cove_node)

	# 1. Gran playa costera continua que amplía la cala oeste y se fusiona sin cortes con el embarcadero Z1
	var beach_mat := StandardMaterial3D.new()
	beach_mat.vertex_color_use_as_albedo = true
	beach_mat.vertex_color_is_srgb = true
	beach_mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	beach_mat.roughness = 0.88
	if mat_beach and mat_beach.albedo_texture:
		beach_mat.albedo_texture = mat_beach.albedo_texture
		beach_mat.uv1_scale = Vector3(1.0, 1.0, 1.0)

	var st_beach := SurfaceTool.new()
	st_beach.begin(Mesh.PRIMITIVE_TRIANGLES)
	var nx := 56
	var nz := 52
	var x_min := -6.5
	var x_max := 33.5
	var z_min := 79.5
	var z_max := 119.5
	var col_dry := Color("#e4d0a4")
	var col_wet := Color("#b49d78")
	var col_reef := Color("#2a5860")
	var col_seabed := Color("#16343e")

	var grid_rows: Array = []
	for iz in range(nz + 1):
		var tz := float(iz) / float(nz)
		var wz := lerpf(z_min, z_max, tz)
		var row_pts: Array[Vector3] = []
		var row_cols: Array[Color] = []
		for ix in range(nx + 1):
			var tx := float(ix) / float(nx)
			var wx := lerpf(x_min, x_max, tx)

			# Orilla sur ampliada suavemente y abrazando el muelle sin entrantes ni escalones
			var south_shore := 111.55
			if wx <= 19.2:
				var t_cov := clampf((wx + 1.5) / 20.7, 0.0, 1.0)
				south_shore = 99.8 + 11.75 * sin(t_cov * PI * 0.50)
				var ripple := (0.45 * sin(wx * 0.34 + 0.5) + 0.22 * cos(wx * 0.72)) * (1.0 - smoothstep(14.0, 19.0, wx))
				south_shore += ripple
			elif wx > 26.5:
				south_shore = lerpf(111.55, 113.0, smoothstep(26.5, 32.5, wx))

			# Orilla norte curvada de forma orgánica hacia el este evitando esquinas cuadradas en la bahía
			var north_shore := 87.5
			if wx > 14.2:
				var t_bay := smoothstep(14.2, 31.8, wx)
				north_shore = lerpf(87.8, 107.6, pow(t_bay, 0.84)) + 0.32 * sin(wx * 0.45)

			var west_margin := wx - (-1.4)
			var d_land := minf(minf(south_shore - wz, wz - north_shore), west_margin)
			var wy := 0.50
			var c := col_dry

			if d_land >= 2.0:
				var swell := 0.018 * sin(wx * 0.28) * cos(wz * 0.30) + 0.022 * smoothstep(2.4, 9.0, d_land)
				wy = 0.495 + swell
				# Mantener arena firme ligeramente por debajo de las tablas del muelle (y~0.56) para unión limpia
				var under_pier := smoothstep(18.5, 19.8, wx) * (1.0 - smoothstep(27.5, 29.0, wx)) * smoothstep(108.6, 109.9, wz)
				wy = lerpf(wy, 0.465, under_pier)
				c = col_dry.lerp(col_wet, under_pier * 0.16)
			elif d_land >= 0.0:
				var wt := smoothstep(0.0, 2.0, d_land)
				wy = lerpf(0.04, 0.495, wt)
				c = col_wet.lerp(col_dry, wt)
			else:
				var shallow_t := smoothstep(0.0, -2.2, d_land)
				var deep_t := smoothstep(-0.8, -5.8, d_land)
				wy = lerpf(0.04, -1.05, shallow_t)
				wy = lerpf(wy, -3.65, deep_t)
				var c_shallow := col_wet.lerp(col_reef, shallow_t)
				c = c_shallow.lerp(col_seabed, deep_t)

			# Empalme suave al este hacia Z1 (Safe_Beach_West y=0.251) sin rebabas ni bloqueo de rampa
			var east_feather := smoothstep(24.6, 27.6, wx) * smoothstep(-0.8, 0.8, d_land)
			wy -= east_feather * 0.29

			row_pts.append(Vector3(wx, wy, wz))
			row_cols.append(c)
		grid_rows.append({"pts": row_pts, "cols": row_cols})

	for iz in range(nz):
		var a_r: Array = grid_rows[iz]["pts"]
		var b_r: Array = grid_rows[iz + 1]["pts"]
		var a_c: Array = grid_rows[iz]["cols"]
		var b_c: Array = grid_rows[iz + 1]["cols"]
		for ix in range(nx):
			var p0: Vector3 = a_r[ix]
			var p1: Vector3 = a_r[ix + 1]
			var p2: Vector3 = b_r[ix + 1]
			var p3: Vector3 = b_r[ix]
			_emit_quad_st(
				st_beach, p0, p1, p2, p3,
				a_c[ix], a_c[ix + 1], b_c[ix + 1], b_c[ix],
				Vector2(p0.x * 0.25, p0.z * 0.25),
				Vector2(p1.x * 0.25, p1.z * 0.25),
				Vector2(p2.x * 0.25, p2.z * 0.25),
				Vector2(p3.x * 0.25, p3.z * 0.25)
			)

	st_beach.generate_normals()
	var beach_inst := MeshInstance3D.new()
	beach_inst.name = "PleamarCoveBeach"
	beach_inst.mesh = st_beach.commit()
	beach_inst.material_override = beach_mat
	cove_node.add_child(beach_inst)
	var beach_faces := PackedVector3Array()
	var raw_faces := beach_inst.mesh.get_faces()
	for fi in range(0, raw_faces.size(), 3):
		var v0 := raw_faces[fi]
		var v1 := raw_faces[fi + 1]
		var v2 := raw_faces[fi + 2]
		var cx := (v0.x + v1.x + v2.x) / 3.0
		if cx <= 25.8:
			beach_faces.append(v0)
			beach_faces.append(v1)
			beach_faces.append(v2)
	if beach_faces.size() >= 3:
		var beach_sb := StaticBody3D.new()
		beach_sb.name = "PleamarCoveBeach_col"
		var beach_cs := CollisionShape3D.new()
		var beach_shape := ConcavePolygonShape3D.new()
		beach_shape.set_faces(beach_faces)
		beach_cs.shape = beach_shape
		beach_sb.add_child(beach_cs)
		beach_inst.add_child(beach_sb)

	# 2. Promontorio costero y hombro rocoso al norte de la cala (fusionados sin cortes con Z1/Z2)
	var bluff_mat := _make_mat(Color.WHITE, 0.90, 0.02)
	bluff_mat.vertex_color_use_as_albedo = true
	bluff_mat.vertex_color_is_srgb = true
	if mat_rock_carved and mat_rock_carved.albedo_texture:
		bluff_mat.albedo_texture = mat_rock_carved.albedo_texture
		bluff_mat.uv1_scale = Vector3(0.20, 0.20, 0.20)
	_create_sculpted_hill_mound(cove_node, "PleamarNorthCliffBluff", Vector3(6.2, 0.0, 87.2), 9.6, 6.2, 6.2, -3.6, bluff_mat, rng)
	_create_sculpted_hill_mound(cove_node, "PleamarEastCliffShoulder", Vector3(14.8, 0.0, 88.0), 9.4, 6.6, 5.2, -3.6, bluff_mat, rng)

	# 3. Boca de Gruta Marina y Arco Natural de Peñascos Esculpidos en basalto
	var arch_node := Node3D.new()
	arch_node.name = "PleamarSeaArch"
	cove_node.add_child(arch_node)
	var arch_boulders := [
		{"pos": Vector3(3.8, -0.4, 95.8), "sc": Vector3(2.8, 3.8, 2.4), "rot": Vector3(8.0, 15.0, -6.0), "mat": _mat_carved_glb},
		{"pos": Vector3(2.8, 1.2, 94.8), "sc": Vector3(3.0, 3.6, 2.6), "rot": Vector3(-5.0, 32.0, 8.0), "mat": _mat_rock_glb},
		{"pos": Vector3(0.2, -0.4, 98.2), "sc": Vector3(2.9, 3.9, 2.6), "rot": Vector3(-6.0, -24.0, 9.0), "mat": mat_rock_dark},
		{"pos": Vector3(-0.4, 1.2, 96.6), "sc": Vector3(2.7, 3.4, 2.7), "rot": Vector3(10.0, 18.0, -8.0), "mat": _mat_rock_glb},
		{"pos": Vector3(1.6, 3.2, 96.8), "sc": Vector3(3.6, 2.1, 3.2), "rot": Vector3(4.0, -18.0, 5.0), "mat": _mat_carved_glb},
		{"pos": Vector3(1.4, 3.6, 95.2), "sc": Vector3(3.2, 1.9, 3.0), "rot": Vector3(-6.0, 12.0, -4.0), "mat": _mat_rock_glb},
	]
	for bi in range(arch_boulders.size()):
		var bd: Dictionary = arch_boulders[bi]
		var b_sc: Vector3 = bd["sc"]
		var b_wrap := Node3D.new()
		b_wrap.name = "SeaArchCragWrap_%d" % bi
		b_wrap.position = bd["pos"]
		b_wrap.rotation_degrees = bd["rot"]
		arch_node.add_child(b_wrap)
		var b_inst := MeshInstance3D.new()
		b_inst.name = "SeaArchCrag_%d" % bi
		b_inst.mesh = SceneEnhancer.make_basalt_outcrop_mesh(200 + bi * 11)
		b_inst.material_override = bd["mat"]
		b_inst.scale = b_sc
		b_wrap.add_child(b_inst)
		if bi in [0, 2]:
			SceneEnhancer.add_cyl_collider(b_wrap, Vector3(0.0, b_sc.y * 0.42, 0.0), minf(b_sc.x, b_sc.z) * 0.30, b_sc.y)
		SceneEnhancer.tag_camera_occluder(b_wrap)

	# Postes costeros con cabo náutico y farol cálido bordeando la arena hacia el arco
	var post_coords := [
		Vector3(12.6, 0.56, 94.8), Vector3(10.2, 0.55, 97.0), Vector3(7.6, 0.54, 98.9), Vector3(4.8, 0.53, 99.8)
	]
	for pi in range(post_coords.size()):
		var pp: Vector3 = post_coords[pi]
		_create_cylinder(cove_node, "CovePost_%d" % pi, pp + Vector3(0.0, 0.45, 0.0), 0.08, 0.90, mat_wood_dark)
		SceneEnhancer.add_cyl_collider(cove_node, pp + Vector3(0.0, 0.55, 0.0), 0.14, 1.2)
		if pi < post_coords.size() - 1:
			var np: Vector3 = post_coords[pi + 1]
			var mid_p := (pp + np) * 0.5 + Vector3(0.0, 0.72, 0.0)
			var rope := _create_box_prop(cove_node, "CoveRope_%d" % pi, mid_p, Vector3(0.045, 0.045, pp.distance_to(np)), mat_wood)
			rope.rotation.y = atan2(np.x - pp.x, np.z - pp.z)
			SceneEnhancer.add_segment_barrier(cove_node, pp, np, 0.24, 1.55)
	_create_box_prop(arch_node, "ArchGuideLantern", Vector3(3.4, 1.85, 96.8), Vector3(0.20, 0.28, 0.20), mat_flame)

	# Pinos costeros, matorrales botánicos y escolleras naturales asentados sobre el promontorio y la orilla
	var pine_tones := [Color("#2d4a31"), Color("#3b5c3b"), Color("#496d44")]
	var bush_tones := [Color("#3e5c36"), Color("#4b6b40"), Color("#5c7c4b")]
	var rock_tones := [Color("#6e6a5f"), Color("#5c5951"), Color("#7d776a")]
	for p_pt in [Vector3(4.2, 5.2, 87.2), Vector3(6.8, 5.0, 86.4), Vector3(2.2, 4.1, 88.4), Vector3(8.8, 4.4, 87.8)]:
		_append_scenic_pine(p_pt, rng.randf_range(0.95, 1.32), rng, pine_tones, trunks_xf, pine_a_xf, pine_a_col, pine_b_xf, pine_b_col, pine_c_xf, pine_c_col)
	for b_pt in [
		Vector3(1.8, 4.4, 96.4), Vector3(1.2, 4.5, 95.2), Vector3(4.5, 4.4, 88.8), Vector3(7.4, 3.8, 89.2),
		Vector3(15.0, 3.5, 89.8), Vector3(18.6, 1.4, 92.6), Vector3(19.8, 0.45, 96.2), Vector3(16.8, 0.46, 108.8),
		Vector3(11.6, 0.46, 107.6), Vector3(7.4, 0.45, 104.2), Vector3(23.8, 0.46, 103.5)
	]:
		var bsc := rng.randf_range(0.85, 1.32)
		var bb := Basis.from_euler(Vector3(0.0, rng.randf_range(0.0, TAU), 0.0)).scaled(Vector3(bsc * 1.15, bsc * 0.95, bsc * 1.15))
		bushes_xf.append(Transform3D(bb, b_pt))
		bushes_col.append(bush_tones[rng.randi() % bush_tones.size()])
	# Grupos asimétricos de rocas costeras en la orilla sur, cala y promontorio noreste
	var shore_rock_specs := [
		[Vector3(17.4, 0.16, 111.0), Vector3(1.65, 0.65, 1.45)],
		[Vector3(16.3, 0.12, 111.3), Vector3(0.95, 0.42, 0.90)],
		[Vector3(11.6, 0.18, 109.6), Vector3(1.85, 0.72, 1.50)],
		[Vector3(6.8, 0.15, 106.8), Vector3(1.45, 0.56, 1.35)],
		[Vector3(5.6, 0.12, 105.9), Vector3(0.85, 0.38, 0.80)],
		[Vector3(0.8, 0.16, 101.2), Vector3(1.75, 0.75, 1.55)],
		[Vector3(19.8, 0.28, 94.2), Vector3(1.90, 0.88, 1.65)],
		[Vector3(21.6, 0.18, 98.2), Vector3(1.55, 0.64, 1.40)],
		[Vector3(24.4, 0.15, 103.2), Vector3(1.30, 0.52, 1.25)],
	]
	for rs_spec in shore_rock_specs:
		var r_sc: Vector3 = rs_spec[1]
		var rb := Basis.from_euler(Vector3(rng.randf_range(-0.08, 0.08), rng.randf_range(0.0, TAU), rng.randf_range(-0.08, 0.08))).scaled(r_sc)
		rocks_xf.append(Transform3D(rb, rs_spec[0]))
		rocks_col.append(rock_tones[rng.randi() % rock_tones.size()])
	# Lajas costeras planas y transitables incrustadas en la arena guiando el paso desde el muelle (sin colisión de obstáculo)
	var step_mesh := SceneEnhancer.make_basalt_outcrop_mesh(77)
	var step_coords: Array[Vector3] = [Vector3(18.2, 0.49, 105.0), Vector3(16.9, 0.50, 102.6), Vector3(15.6, 0.51, 99.6)]
	for st_i in range(step_coords.size()):
		var st_coords: Vector3 = step_coords[st_i]
		var st_inst := MeshInstance3D.new()
		st_inst.name = "CovePathFlagstone_%d" % st_i
		st_inst.mesh = step_mesh
		st_inst.material_override = mat_rock_carved
		st_inst.position = st_coords
		st_inst.rotation.y = rng.randf_range(0.0, TAU)
		st_inst.scale = Vector3(1.05, 0.11, 0.85)
		st_inst.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		cove_node.add_child(st_inst)
	var guide_pos := Vector3(16.0, 0.53, 106.6)
	_create_cylinder(cove_node, "CoveEntryLanternPost", guide_pos + Vector3(0.0, 0.72, 0.0), 0.075, 1.44, mat_wood_dark)
	_create_box_prop(cove_node, "CoveEntryLantern", guide_pos + Vector3(0.0, 1.52, 0.0), Vector3(0.18, 0.24, 0.18), mat_flame)
	SceneEnhancer.add_cyl_collider(cove_node, guide_pos + Vector3(0.0, 0.72, 0.0), 0.14, 1.50)

func _populate_trail_framing(parent: Node, pts: Array[Vector3], cfg: Dictionary, rng: RandomNumberGenerator, rocks_xf: Array[Transform3D], rocks_col: Array[Color], bushes_xf: Array[Transform3D], bushes_col: Array[Color], trunks_xf: Array[Transform3D], pine_a_xf: Array[Transform3D], pine_a_col: Array[Color], pine_b_xf: Array[Transform3D], pine_b_col: Array[Color], pine_c_xf: Array[Transform3D], pine_c_col: Array[Color]) -> void:
	var route_id := str(cfg.get("id", ""))
	var half_w := float(cfg["base_width"]) * 0.5
	var ridge_h := float(cfg["ridge_height"])
	var is_high := float(pts[0].y) > 10.0
	var is_obs_coast := (route_id == "observatory-coast")
	var is_pleamar_low := (route_id == "pleamar-low")
	var rock_tones := [Color("#68635a"), Color("#787166"), Color("#59554e")]
	var bush_tones := [Color("#3e5c36"), Color("#4b6b40"), Color("#5c7c4b")]
	var pine_tones := [Color("#2d4a31"), Color("#3b5c3b"), Color("#496d44")]

	# Guardarraíl de postes de madera y cabo en el borde de acantilado de pleamar-high y observatory-coast
	if route_id == "pleamar-high" or route_id == "observatory-coast":
		var cliff_side := -1.0 if route_id == "pleamar-high" else 1.0
		var start_post_i := 2 if route_id == "pleamar-high" else 5
		var rail_offset := (half_w + 0.30) if route_id == "pleamar-high" else (half_w + 0.42)
		var max_post_i := mini(pts.size() - 4, 20) if route_id == "pleamar-high" else mini(pts.size() - 4, 17)
		var last_post := Vector3.ZERO
		for i in range(start_post_i, max_post_i, 3):
			var p := pts[i]
			var fwd := (pts[i + 1] - pts[i - 1])
			fwd.y = 0.0
			if fwd.length_squared() < 0.001:
				continue
			fwd = fwd.normalized()
			var right := Vector3(-fwd.z, 0.0, fwd.x)
			var post_pos := p + right * (cliff_side * rail_offset)
			_create_cylinder(parent, "CliffPost_%s_%d" % [route_id, i], post_pos + Vector3(0.0, 0.46, 0.0), 0.075, 0.92, mat_wood_dark)
			SceneEnhancer.add_cyl_collider(parent, post_pos + Vector3(0.0, 0.55, 0.0), 0.14, 1.2)
			if last_post != Vector3.ZERO:
				var mid_r := (last_post + post_pos) * 0.5 + Vector3(0.0, 0.74, 0.0)
				var r_seg := _create_box_prop(parent, "CliffRope_%s_%d" % [route_id, i], mid_r, Vector3(0.045, 0.045, last_post.distance_to(post_pos)), mat_wood)
				r_seg.rotation.y = atan2(post_pos.x - last_post.x, post_pos.z - last_post.z)
				SceneEnhancer.add_segment_barrier(parent, last_post, post_pos, 0.24, 1.55)
			last_post = post_pos

	for i in range(2, pts.size()):
		var p := pts[i]
		var fwd := (pts[i] - pts[i - 1])
		fwd.y = 0.0
		if fwd.length_squared() < 0.001:
			continue
		fwd = fwd.normalized()
		var right := Vector3(-fwd.z, 0.0, fwd.x)

		# Piedras irregulares de cuneta/deslinde y vegetación de borde
		for side_v in [-1.0, 1.0]:
			var side := float(side_v)
			# En pleamar-low la playa sur queda abierta al mar y los primeros metros enlazan al muelle sin piedras en la arena
			if is_pleamar_low and (side < 0.0 or i < 8):
				continue
			# En observatory-coast, NUNCA colocar objetos fuera del borde oriental del acantilado (x > 161.2)
			if is_obs_coast and side > 0.0:
				if rng.randf() < 0.65:
					# Pretil bajo de piedra pegado al borde mismo del sendero (sobre roca firme)
					var parapet_pos: Vector3 = p + right * (half_w + 0.22) + Vector3(0.0, 0.08, 0.0)
					var pb := Basis.from_euler(Vector3(0.0, rng.randf_range(0.0, TAU), 0.0)).scaled(Vector3(0.65, 0.42, 0.75))
					rocks_xf.append(Transform3D(pb, parapet_pos))
					rocks_col.append(rock_tones[rng.randi() % rock_tones.size()])
				continue

			if rng.randf() < 0.78:
				var dist := half_w + rng.randf_range(0.45, 1.15)
				var rpos: Vector3 = p + right * (side * dist) + Vector3(0.0, rng.randf_range(-0.14, 0.08), 0.0)
				if is_obs_coast and rpos.x > 161.2:
					continue
				var rock_clear := (half_w + 1.05) if is_obs_coast else (half_w + 0.72)
				if _is_near_any_trail_pt(rpos, pts, rock_clear):
					continue
				var sx := rng.randf_range(0.55, 1.18)
				var sy := rng.randf_range(0.38, 0.88) * (1.18 if i > pts.size() * 0.55 else 1.0)
				var sz := rng.randf_range(0.55, 1.22)
				var rb := Basis.from_euler(Vector3(rng.randf_range(-0.18, 0.18), rng.randf_range(0.0, TAU), rng.randf_range(-0.18, 0.18))).scaled(Vector3(sx, sy, sz))
				rocks_xf.append(Transform3D(rb, rpos))
				rocks_col.append(rock_tones[rng.randi() % rock_tones.size()])

			if rng.randf() < 0.74:
				var bdist := half_w + rng.randf_range(0.65, 1.65)
				var bpos: Vector3 = p + right * (side * bdist) + Vector3(0.0, rng.randf_range(0.02, 0.18), 0.0)
				if is_obs_coast and bpos.x > 160.6:
					continue
				if _is_near_any_trail_pt(bpos, pts, half_w + 0.55):
					continue
				var bsc := rng.randf_range(0.65, 1.15)
				var bb := Basis.from_euler(Vector3(0.0, rng.randf_range(0.0, TAU), 0.0)).scaled(Vector3(bsc * 1.15, bsc * 0.76, bsc))
				bushes_xf.append(Transform3D(bb, bpos))
				bushes_col.append(bush_tones[rng.randi() % bush_tones.size()])

		# A partir del tramo medio-final, ocultar el horizonte del camino tras arboles y taludes (sin invadir la entrada)
		if not is_pleamar_low and not (route_id == "pleamar-high" and i < 7) and i >= int(float(pts.size()) * 0.42) and (i % 2 == 0 or i >= int(float(pts.size()) * 0.65)):
			for side_v in [-1.0, 1.0]:
				var side := float(side_v)
				# En observatory-coast solo plantar en el lado interior de la montaña (side < 0.0 y x <= 159.5)
				if is_obs_coast and side > 0.0:
					continue
				var tdist := half_w + rng.randf_range(2.2, 3.8)
				var tpos: Vector3 = p + right * (side * tdist) - Vector3(0.0, 0.35, 0.0)
				if is_obs_coast and tpos.x > 159.5:
					continue
				if _is_near_any_trail_pt(tpos, pts, half_w + 2.15):
					continue
				var tsc := rng.randf_range(0.95, 1.42)
				_append_scenic_pine(tpos, tsc, rng, pine_tones, trunks_xf, pine_a_xf, pine_a_col, pine_b_xf, pine_b_col, pine_c_xf, pine_c_col)
				if is_high and not is_obs_coast and i >= int(float(pts.size()) * 0.55):
					var kpos: Vector3 = p + right * (side * (tdist + 0.8)) + Vector3(0.0, ridge_h * 0.30, 0.0)
					if _is_near_any_trail_pt(kpos, pts, half_w + 1.8):
						continue
					var kb := Basis.from_euler(Vector3(0.0, rng.randf_range(0.0, TAU), 0.0)).scaled(Vector3(2.6, ridge_h * 1.35, 2.4))
					rocks_xf.append(Transform3D(kb, kpos))
					rocks_col.append(rock_tones[0])

func _is_near_any_trail_pt(pos: Vector3, pts: Array[Vector3], min_dist: float) -> bool:
	var min_d2 := min_dist * min_dist
	for q in pts:
		var dx := pos.x - q.x
		var dz := pos.z - q.z
		if dx * dx + dz * dz < min_d2:
			return true
	return false

func _build_horizon_backdrop_shoulders(parent: Node, rng: RandomNumberGenerator, rocks_xf: Array[Transform3D], rocks_col: Array[Color], bushes_xf: Array[Transform3D], bushes_col: Array[Color], trunks_xf: Array[Transform3D], pine_a_xf: Array[Transform3D], pine_a_col: Array[Color], pine_b_xf: Array[Transform3D], pine_b_col: Array[Color], pine_c_xf: Array[Transform3D], pine_c_col: Array[Color]) -> void:
	# Lomas organicas esculpidas que envuelven pleamar-high y observatorio (pleamar-low usa PleamarCoastalCove)
	var pine_tones := [Color("#255c2b"), Color("#2e6b34"), Color("#38793d")]
	var rock_tones := [Color("#625e56"), Color("#535049")]
	var bush_tones := [Color("#366e2f"), Color("#45813b")]

	var mound_mat := _make_mat(Color.WHITE, 0.90, 0.02)
	mound_mat.vertex_color_use_as_albedo = true
	mound_mat.vertex_color_is_srgb = true
	mound_mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	if mat_rock_carved and mat_rock_carved.albedo_texture:
		mound_mat.albedo_texture = mat_rock_carved.albedo_texture
		mound_mat.uv1_scale = Vector3(0.18, 0.18, 0.18)

	var hills := [
		{"name": "Shoulder_PleamarHigh", "center": Vector3(6.5, 0.0, 40.2), "rx": 14.5, "rz": 11.0, "top_y": 20.15, "base_y": -1.5},
		{"name": "BackdropHill_NW", "center": Vector3(-8.5, 0.0, 26.5), "rx": 22.0, "rz": 24.0, "top_y": 19.8, "base_y": -1.5},
		{"name": "Shoulder_N_ObsBoardwalk", "center": Vector3(128.5, 0.0, 20.5), "rx": 12.5, "rz": 9.0, "top_y": 36.4, "base_y": 18.0},
		{"name": "BackdropHill_N_Obs", "center": Vector3(121.0, 0.0, -5.5), "rx": 25.0, "rz": 18.0, "top_y": 38.6, "base_y": -1.5},
		{"name": "Ledge_NE_ObsCoast", "center": Vector3(161.2, 0.0, 22.8), "rx": 11.5, "rz": 12.0, "top_y": 32.72, "base_y": 10.0},
		{"name": "BackdropHill_NE_Obs", "center": Vector3(153.0, 0.0, 7.5), "rx": 18.5, "rz": 18.5, "top_y": 35.8, "base_y": -1.5},
	]
	for h in hills:
		_create_sculpted_hill_mound(parent, h["name"], h["center"], float(h["rx"]), float(h["rz"]), float(h["top_y"]), float(h["base_y"]), mound_mat, rng)

	# Arboleda asentada directamente sobre la cota exacta de BackdropHill_NW (pleamar-high)
	for _k in range(26):
		var ang := rng.randf_range(0.0, TAU)
		var rad := sqrt(rng.randf_range(0.05, 0.68))
		var px := -8.5 + cos(ang) * 19.5 * rad
		var pz := 26.5 + sin(ang) * 21.0 * rad
		if px > 1.5 and pz > 34.5:
			continue
		var py := _eval_hill_y(px, pz, Vector3(-8.5, 0.0, 26.5), 22.0, 24.0, 19.8, -1.5)
		if py < 13.5:
			continue
		_append_scenic_pine(Vector3(px, py - 0.42, pz), rng.randf_range(1.05, 1.52), rng, pine_tones, trunks_xf, pine_a_xf, pine_a_col, pine_b_xf, pine_b_col, pine_c_xf, pine_c_col)
		if rng.randf() < 0.65:
			var bb := Basis().scaled(Vector3(1.2, 0.85, 1.2))
			bushes_xf.append(Transform3D(bb, Vector3(px + rng.randf_range(-1.2, 1.2), py + 0.12, pz + rng.randf_range(-1.2, 1.2))))
			bushes_col.append(bush_tones[rng.randi() % bush_tones.size()])

	# Arboleda asentada sobre BackdropHill_N_Obs y BackdropHill_NE_Obs (estrictamente en tierra firme, 0 árboles volando)
	for _k in range(28):
		var east := _k >= 16
		var cx := 153.0 if east else 121.0
		var cz := 7.5 if east else -5.5
		var rx := 15.0 if east else 21.0
		var rz := 15.0 if east else 14.5
		var ty := 35.8 if east else 38.6
		var ang := rng.randf_range(0.0, TAU)
		var rad := sqrt(rng.randf_range(0.05, 0.58))
		var px := cx + cos(ang) * rx * rad
		var pz := cz + sin(ang) * rz * rad
		# Prohibir cualquier árbol al este de x = 158.8 o sobre la traza misma del sendero
		if east and (px > 158.8 or (px > 151.0 and pz > 10.5)):
			continue
		var py := _eval_hill_y(px, pz, Vector3(cx, 0.0, cz), 18.5 if east else 25.0, 18.5 if east else 18.0, ty, -1.5)
		if py < ty - 3.8:
			continue
		_append_scenic_pine(Vector3(px, py - 0.45, pz), rng.randf_range(1.0, 1.45), rng, pine_tones, trunks_xf, pine_a_xf, pine_a_col, pine_b_xf, pine_b_col, pine_c_xf, pine_c_col)
		if rng.randf() < 0.55:
			var rb := Basis.from_euler(Vector3(0.0, rng.randf_range(0.0, TAU), 0.0)).scaled(Vector3(1.9, 1.2, 1.8))
			rocks_xf.append(Transform3D(rb, Vector3(px + rng.randf_range(-1.3, 1.3), py + 0.05, pz + rng.randf_range(-1.3, 1.3))))
			rocks_col.append(rock_tones[rng.randi() % rock_tones.size()])

func _eval_hill_y(x: float, z: float, center: Vector3, rx: float, rz: float, top_y: float, base_y: float) -> float:
	var dx := (x - center.x) / rx
	var dz := (z - center.z) / rz
	var d2 := dx * dx + dz * dz
	if d2 >= 1.0:
		return base_y
	var eff_d2 := maxf(0.0, d2 - 0.16) / 0.84
	var bell := pow(1.0 - eff_d2, 0.68)
	var ripple := 0.55 * sin(x * 0.24) * cos(z * 0.21)
	return clampf(lerpf(base_y, top_y, bell) + ripple * bell * eff_d2, base_y, top_y + 0.8)

func _create_sculpted_hill_mound(parent: Node, hill_name: String, center: Vector3, rx: float, rz: float, top_y: float, base_y: float, mat: Material, _rng: RandomNumberGenerator) -> void:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var rings := 10
	var segs := 20
	var is_rock_ledge := (hill_name == "Ledge_NE_ObsCoast" or hill_name == "Shoulder_N_ObsBoardwalk")
	var col_top := Color("#6a706c") if is_rock_ledge else Color("#4c823d")
	var col_mid := Color("#6e7670")
	var col_base := Color("#545b57")

	var ring_pts: Array = []
	for r in range(rings + 1):
		var frac := float(r) / float(rings)
		var row_pts: Array[Vector3] = []
		var row_cols: Array[Color] = []
		for s in range(segs + 1):
			var ang := (float(s) / float(segs)) * TAU
			var radial_warp := 1.0 + 0.14 * sin(ang * 3.0 + center.x * 0.1) + 0.08 * cos(ang * 5.0)
			var wx := center.x + cos(ang) * rx * frac * radial_warp
			var wz := center.z + sin(ang) * rz * frac * radial_warp
			var wy := _eval_hill_y(wx, wz, center, rx * radial_warp, rz * radial_warp, top_y, base_y)
			row_pts.append(Vector3(wx, wy, wz))
			var c := col_base.lerp(col_mid, clampf(frac * 1.4, 0.0, 1.0)).lerp(col_top, clampf(1.0 - frac * 1.3, 0.0, 1.0))
			row_cols.append(c)
		ring_pts.append({"pts": row_pts, "cols": row_cols})

	for r in range(rings):
		var a_row: Array = ring_pts[r]["pts"]
		var b_row: Array = ring_pts[r + 1]["pts"]
		var a_col: Array = ring_pts[r]["cols"]
		var b_col: Array = ring_pts[r + 1]["cols"]
		for s in range(segs):
			var p0: Vector3 = a_row[s]
			var p1: Vector3 = a_row[s + 1]
			var p2: Vector3 = b_row[s + 1]
			var p3: Vector3 = b_row[s]
			_emit_quad_st(st, p0, p1, p2, p3, a_col[s], a_col[s + 1], b_col[s + 1], b_col[s], Vector2(p0.x * 0.1, p0.z * 0.1), Vector2(p1.x * 0.1, p1.z * 0.1), Vector2(p2.x * 0.1, p2.z * 0.1), Vector2(p3.x * 0.1, p3.z * 0.1))

	st.generate_normals()
	var inst := MeshInstance3D.new()
	inst.name = hill_name
	inst.mesh = st.commit()
	inst.material_override = mat
	inst.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	parent.add_child(inst)

func _append_scenic_pine(pos: Vector3, sc: float, rng: RandomNumberGenerator, tones: Array, trunks_xf: Array[Transform3D], pine_a_xf: Array[Transform3D], pine_a_col: Array[Color], pine_b_xf: Array[Transform3D], pine_b_col: Array[Color], pine_c_xf: Array[Transform3D], pine_c_col: Array[Color]) -> void:
	var base_b := Basis.from_euler(Vector3(rng.randf_range(-0.04, 0.04), rng.randf_range(0.0, TAU), rng.randf_range(-0.04, 0.04)))
	var th := 3.6 * sc
	trunks_xf.append(Transform3D(base_b.scaled(Vector3(0.20 * sc, th, 0.20 * sc)), pos + Vector3(0.0, th * 0.5, 0.0)))
	var tone: Color = tones[rng.randi() % tones.size()]
	pine_a_xf.append(Transform3D(base_b.scaled(Vector3(1.58 * sc, 1.85 * sc, 1.58 * sc)), pos + Vector3(0.0, 2.55 * sc, 0.0)))
	pine_a_col.append(tone)
	pine_b_xf.append(Transform3D(base_b.rotated(Vector3.UP, 0.72).scaled(Vector3(1.22 * sc, 1.75 * sc, 1.22 * sc)), pos + Vector3(0.0, 3.75 * sc, 0.0)))
	pine_b_col.append(tone.lightened(0.05))
	pine_c_xf.append(Transform3D(base_b.rotated(Vector3.UP, 1.44).scaled(Vector3(0.84 * sc, 1.55 * sc, 0.84 * sc)), pos + Vector3(0.0, 4.85 * sc, 0.0)))
	pine_c_col.append(tone.lightened(0.10))

func _create_coastal_mist(parent: Node, mist_name: String, pos: Vector3) -> void:
	var p := GPUParticles3D.new()
	p.name = mist_name
	p.position = pos
	p.amount = 14
	p.lifetime = 4.6
	p.preprocess = 2.0
	var pm := ParticleProcessMaterial.new()
	pm.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_BOX
	pm.emission_box_extents = Vector3(4.5, 0.35, 3.2)
	pm.direction = Vector3(0.4, 0.10, 0.12)
	pm.spread = 28.0
	pm.initial_velocity_min = 0.22
	pm.initial_velocity_max = 0.55
	pm.gravity = Vector3.ZERO
	pm.scale_min = 1.8
	pm.scale_max = 3.6
	pm.color = Color(0.84, 0.91, 0.96, 0.16)
	p.process_material = pm

	var grad := Gradient.new()
	grad.offsets = PackedFloat32Array([0.0, 0.45, 1.0])
	grad.colors = PackedColorArray([Color(0.88, 0.94, 0.98, 0.48), Color(0.85, 0.92, 0.96, 0.18), Color(0.85, 0.92, 0.96, 0.0)])
	var grad_tex := GradientTexture2D.new()
	grad_tex.width = 64
	grad_tex.height = 64
	grad_tex.fill = GradientTexture2D.FILL_RADIAL
	grad_tex.fill_from = Vector2(0.5, 0.5)
	grad_tex.fill_to = Vector2(0.95, 0.5)
	grad_tex.gradient = grad

	var q := QuadMesh.new()
	q.size = Vector2(2.6, 1.8)
	var m := StandardMaterial3D.new()
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.billboard_mode = BaseMaterial3D.BILLBOARD_ENABLED
	m.albedo_texture = grad_tex
	m.albedo_color = Color(1.0, 1.0, 1.0, 0.45)
	m.depth_draw_mode = BaseMaterial3D.DEPTH_DRAW_DISABLED
	p.draw_pass_1 = q
	p.material_override = m
	p.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parent.add_child(p)
