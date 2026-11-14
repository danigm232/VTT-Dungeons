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
var mat_ocean: StandardMaterial3D
var mat_pool_water: StandardMaterial3D
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
var _mat_water_glb: StandardMaterial3D
var _mat_forest_earth_glb: StandardMaterial3D
var _mat_astalagan_glb: StandardMaterial3D

var winch_lever_pivot: Node3D
var winch_pallet_rig: Node3D
var winch_cable_mesh: MeshInstance3D
var winch_is_lowered: bool = false
var _winch_blend: float = 0.0

func _ready() -> void:
	build_layout()

func _process(delta: float) -> void:
	if Engine.is_editor_hint():
		return
	var target_blend := 1.0 if winch_is_lowered else 0.0
	if not is_equal_approx(_winch_blend, target_blend):
		_winch_blend = move_toward(_winch_blend, target_blend, delta * 0.85)
		_apply_winch_visual_state(_winch_blend)

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
	var tex_bay := _load_tex("bay-v3.png")
	var tex_foliage := _load_tex("foliage-atlas.png")
	var norm_rock := _load_tex("rock-normal-v1.png")
	var norm_wood := _load_tex("wood-normal-v1.png")

	mat_beach = _make_textured_mat(Color("#dcc9a0"), 0.86, 0.0, tex_earth, 0.22, true)
	mat_wet_sand = _make_mat(Color("#9e8b6c"), 0.30, 0.06)
	mat_plaza = _make_textured_mat(Color("#d4cbb8"), 0.82, 0.0, tex_plaza, 0.30, true, norm_rock, 0.45)
	mat_cell_floor = _make_textured_mat(Color("#c4bba8"), 0.84, 0.0, tex_cell, 0.36, true, norm_rock, 0.48)
	mat_rock = _make_textured_mat(Color("#88948e"), 0.86, 0.0, tex_basalt if tex_basalt else tex_cliff, 0.16, true, norm_rock, 0.68)
	mat_rock_carved = _make_textured_mat(Color("#9ea79d"), 0.84, 0.0, tex_coastal_rock if tex_coastal_rock else tex_cliff, 0.26, true, norm_rock, 0.65)
	mat_rock_dark = _make_textured_mat(Color("#66706b"), 0.90, 0.0, tex_basalt if tex_basalt else tex_cliff, 0.16, true, norm_rock, 0.70)
	mat_wood = _make_textured_mat(Color("#bf9a70"), 0.72, 0.0, tex_oak, 0.50, true, norm_wood, 0.55)
	mat_wood_dark = _make_textured_mat(Color("#7c5b3b"), 0.80, 0.0, tex_oak, 0.50, true, norm_wood, 0.58)
	mat_upper = _make_textured_mat(Color("#cac0ab"), 0.82, 0.0, tex_ashlar if tex_ashlar else tex_plaza, 0.32, true, norm_rock, 0.48)
	mat_trail = _make_textured_mat(Color("#9aa87d"), 0.90, 0.0, tex_earth, 0.26, true)
	mat_sacred = _make_textured_mat(Color("#e3dfd5"), 0.68, 0.03, tex_limestone, 0.35, true, norm_rock, 0.42)
	mat_column = _make_textured_mat(Color("#cfc6b1"), 0.74, 0.02, tex_limestone, 0.35, true, norm_rock, 0.45)

	mat_ocean = StandardMaterial3D.new()
	mat_ocean.albedo_color = Color(0.11, 0.44, 0.56, 0.88)
	if tex_bay:
		mat_ocean.albedo_texture = tex_bay
		mat_ocean.uv1_world_triplanar = true
		mat_ocean.uv1_triplanar = true
		mat_ocean.uv1_scale = Vector3(0.06, 0.06, 0.06)
	mat_ocean.roughness = 0.11
	mat_ocean.metallic = 0.14
	mat_ocean.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA

	mat_pool_water = StandardMaterial3D.new()
	mat_pool_water.albedo_color = Color(0.20, 0.58, 0.66, 0.78)
	mat_pool_water.roughness = 0.08
	mat_pool_water.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA

	mat_marker = StandardMaterial3D.new()
	mat_marker.albedo_color = Color(0.95, 0.76, 0.25)
	mat_marker.emission_enabled = true
	mat_marker.emission = Color(0.95, 0.76, 0.25)
	mat_marker.emission_energy_multiplier = 0.7

	mat_bronze = _make_mat(Color("#9a7448"), 0.36, 0.72)
	mat_platinum = _make_mat(Color("#d8dde6"), 0.28, 0.75)
	mat_gold = StandardMaterial3D.new()
	mat_gold.albedo_color = Color("#f0be42")
	mat_gold.metallic = 0.7
	mat_gold.roughness = 0.32
	mat_gold.emission_enabled = true
	mat_gold.emission = Color("#d89a1c")
	mat_gold.emission_energy_multiplier = 0.35

	mat_foliage_pine = _make_mat(Color("#2e5834"), 0.86, 0.0)
	mat_foliage_olive = _make_mat(Color("#547442"), 0.84, 0.0)

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
	_mat_earth_glb = _make_glb_mat(Color("#b8b99d"), 0.92, 0.0, tex_earth, 0.26, null, true)
	_mat_forest_earth_glb = _make_glb_mat(Color("#6b8252"), 0.94, 0.0, tex_earth, 0.22, null, true)
	_mat_wood_glb = _make_glb_mat(Color("#c6a074"), 0.76, 0.0, tex_oak, 0.52, norm_wood, true, 0.55)
	_mat_dark_wood_glb = _make_glb_mat(Color("#8c6a48"), 0.80, 0.0, tex_oak, 0.52, null, true)
	_mat_limestone_glb = _make_glb_mat(Color("#bbb49f"), 0.80, 0.0, tex_limestone, 0.36, norm_rock, true, 0.48)
	_mat_sculpture_glb = _make_glb_mat(Color("#d2cab6"), 0.78, 0.04, tex_limestone, 0.28, norm_rock, true, 0.45)
	_mat_astalagan_glb = _make_glb_mat(Color("#9e8b6a"), 0.62, 0.22, tex_limestone, 0.28, norm_rock, true, 0.52)
	_mat_metal_glb = _make_glb_mat(Color("#545a5c"), 0.46, 0.72, null, 1.0, null, true)
	_mat_brass_glb = _make_glb_mat(Color("#be8842"), 0.32, 0.72, null, 1.0, null, true)
	_mat_pottery_glb = _make_glb_mat(Color("#9e684c"), 0.80, 0.0, null, 1.0, null, true)
	_mat_linen_glb = _make_glb_mat(Color("#eadcc7"), 0.90, 0.0, tex_linen, 0.65, null, true, 0.50, true)
	_mat_blue_cloth_glb = _make_glb_mat(Color("#6886a0"), 0.90, 0.0, tex_linen, 0.65, null, true, 0.50, true)
	_mat_red_cloth_glb = _make_glb_mat(Color("#b66959"), 0.90, 0.0, tex_wool, 0.65, null, true, 0.50, true)
	_mat_flower_glb = _make_glb_mat(Color("#e8d48c"), 0.82, 0.0, null, 1.0, null, true)
	_mat_herb_glb = _make_glb_mat(Color("#4f733f"), 0.86, 0.0, null, 1.0, null, true)
	_mat_foliage_v6_glb = _make_foliage_cutout_mat(Color("#c8d9ae"), tex_foliage)
	_mat_foliage_sage_glb = _make_foliage_cutout_mat(Color("#a8be92"), tex_foliage)
	_mat_foliage_dark_glb = _make_foliage_cutout_mat(Color("#5d7d52"), tex_foliage)
	_mat_foliage_flower_glb = _make_foliage_cutout_mat(Color("#ecd8a8"), tex_foliage)

	_mat_water_glb = StandardMaterial3D.new()
	_mat_water_glb.albedo_color = Color(0.14, 0.49, 0.60, 0.86)
	if tex_bay:
		_mat_water_glb.albedo_texture = tex_bay
		_mat_water_glb.uv1_world_triplanar = true
		_mat_water_glb.uv1_triplanar = true
		_mat_water_glb.uv1_scale = Vector3(0.08, 0.08, 0.08)
	_mat_water_glb.roughness = 0.11
	_mat_water_glb.metallic = 0.14
	_mat_water_glb.cull_mode = BaseMaterial3D.CULL_DISABLED
	_mat_water_glb.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA

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

func _make_glb_mat(col: Color, rough: float, metal: float, tex: Texture2D, world_scale: float, norm_tex: Texture2D, use_vertex_color: bool, norm_strength: float = 0.50, allow_two_sided: bool = false) -> StandardMaterial3D:
	var m := _make_textured_mat(col, rough, metal, tex, world_scale, true, norm_tex, norm_strength)
	m.cull_mode = BaseMaterial3D.CULL_DISABLED if allow_two_sided else BaseMaterial3D.CULL_BACK
	m.vertex_color_use_as_albedo = use_vertex_color
	return m

func _make_foliage_cutout_mat(col: Color, tex: Texture2D) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = col
	m.roughness = 0.88
	m.metallic = 0.0
	m.cull_mode = BaseMaterial3D.CULL_DISABLED
	m.vertex_color_use_as_albedo = true
	if tex:
		m.albedo_texture = tex
		m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA_SCISSOR
		m.alpha_scissor_threshold = 0.35
	return m

func build_layout() -> void:
	if has_node("Surfaces"):
		return
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
	_build_lush_planters_and_gardens()
	_build_lush_mountain_forest(terrain_data)
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
	var inst := MeshInstance3D.new()
	inst.name = "OceanPlane"
	inst.mesh = ocean_mesh
	inst.material_override = mat_ocean
	inst.position = Vector3(84.0, Structure.ELEV_SEA, 68.0)
	inst.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(inst)

	# Fondo marino somero bajo la ensenada para dar profundidad turquesa al agua
	var seabed_mesh := PlaneMesh.new()
	seabed_mesh.size = Vector2(900.0, 800.0)
	var seabed := MeshInstance3D.new()
	seabed.name = "SeabedPlane"
	seabed.mesh = seabed_mesh
	seabed.material_override = _make_mat(Color("#254a52"), 0.95, 0.0)
	seabed.position = Vector3(84.0, -1.6, 68.0)
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
		var y00 := float(c[0]) + skin_offset
		var y10 := float(c[1]) + skin_offset
		var y11 := float(c[2]) + skin_offset
		var y01 := float(c[3]) + skin_offset

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
	parent.add_child(inst)
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

# 2B. Ancla y luz del embarcadero Z1 (la geometría del bote/muelle llega en P2 + R3Land)
func _build_coastal_pier_and_beach() -> void:
	var pier_node := Node3D.new()
	pier_node.name = "Z1_Rowboat_Pier"
	add_child(pier_node)

	var lantern := _create_box_prop(pier_node, "JettyLantern", Vector3(21.22, 1.82, 114.2), Vector3(0.22, 0.28, 0.22), mat_flame)
	lantern.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	var pier_light := OmniLight3D.new()
	pier_light.name = "JettyLanternLight"
	pier_light.position = Vector3(21.22, 2.05, 114.2)
	pier_light.light_color = Color(1.0, 0.72, 0.34)
	pier_light.light_energy = 1.6
	pier_light.omni_range = 12.0
	pier_node.add_child(pier_light)

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
	_apply_winch_visual_state(0.0)

	# 7 escollos marinos bajos + aureola sutil de espuma en la línea de agua (retreat-winch-sea-rocks.ts)
	var sea_rocks_node := Node3D.new()
	sea_rocks_node.name = "WinchSeaRocks"
	a2_node.add_child(sea_rocks_node)

	var foam_mat := StandardMaterial3D.new()
	foam_mat.albedo_color = Color(0.76, 0.92, 0.96, 0.24)
	foam_mat.roughness = 0.55
	foam_mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	foam_mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA

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
		var r_mesh := SphereMesh.new()
		r_mesh.radius = 0.5
		r_mesh.height = 1.0
		r_mesh.radial_segments = 14
		r_mesh.rings = 8
		var r_inst := MeshInstance3D.new()
		r_inst.name = "SeaOutcrop_%d" % idx
		r_inst.mesh = r_mesh
		r_inst.material_override = mat_rock_dark if idx % 2 == 0 else mat_rock
		r_inst.position = Vector3(float(sp[0]), float(sp[1]) - float(sp[4]) * 0.28, float(sp[2]))
		r_inst.scale = Vector3(float(sp[3]), float(sp[4]) * 0.58, float(sp[5]))
		r_inst.rotation.y = float(sp[6])
		sea_rocks_node.add_child(r_inst)

		var ring_mesh := TorusMesh.new()
		var base_r := maxf(float(sp[3]), float(sp[5])) * 0.44
		ring_mesh.inner_radius = base_r * 0.84
		ring_mesh.outer_radius = base_r
		ring_mesh.rings = 18
		ring_mesh.ring_segments = 6
		var ring := MeshInstance3D.new()
		ring.name = "SeaRockFoam_%d" % idx
		ring.mesh = ring_mesh
		ring.material_override = foam_mat
		ring.position = Vector3(float(sp[0]), 0.02, float(sp[2]))
		ring.scale = Vector3(1.0, 0.08, 1.0)
		ring.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		sea_rocks_node.add_child(ring)

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
		["Safe_Beach_West", Vector3(16.0, -0.16, 111.5), Vector3(29.0, 0.80, 14.5)],
		["Safe_Beach_South", Vector3(28.0, -0.16, 114.8), Vector3(36.0, 0.80, 7.5)],
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
	_add_safety_ramp(safe_node, "Safe_Ramp_Z2_Flight0", Vector3(30.0, 0.24, 109.5), Vector3(34.5, 1.49, 109.5), 3.4)
	_add_safety_ramp(safe_node, "Safe_Ramp_Z2_Flight1", Vector3(37.5, 1.49, 106.5), Vector3(45.0, 3.99, 106.5), 3.4)
	_add_safety_ramp(safe_node, "Safe_Ramp_Z2_Flight2", Vector3(48.0, 3.99, 103.5), Vector3(55.5, 6.49, 103.5), 3.4)
	_add_safety_ramp(safe_node, "Safe_Ramp_Z2_Flight3", Vector3(58.5, 6.49, 100.5), Vector3(66.0, 8.99, 100.5), 3.4)
	_add_safety_ramp(safe_node, "Safe_Ramp_A5_Upper", Vector3(49.5, 26.98, 66.5), Vector3(76.5, 17.98, 66.5), 5.6)
	_add_safety_ramp(safe_node, "Safe_Ramp_Upper_A2", Vector3(144.0, 17.98, 67.5), Vector3(154.5, 14.98, 67.5), 4.6)
	_add_safety_ramp(safe_node, "Safe_Ramp_Cliff_East", Vector3(154.5, 8.98, 92.25), Vector3(154.5, 14.98, 70.5), 4.2)

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

		var target_parent: Node3D = default_parent
		var parts := m_inst.name.split("__", false, 1)
		if parts.size() >= 1 and prefix_targets.has(parts[0]) and prefix_targets[parts[0]] != null:
			target_parent = prefix_targets[parts[0]]

		_apply_babylon_material(m_inst)
		if _is_walkable_glb_mesh(m_inst.name):
			m_inst.create_trimesh_collision()
		target_parent.add_child(m_inst)

	scene_root.queue_free()

func _is_walkable_glb_mesh(mesh_name: String) -> bool:
	var low := mesh_name.to_lower()
	if "foliage" in low or "flower" in low or "herb" in low or "water" in low or "pine" in low or "flame" in low or "planter" in low or "rope" in low:
		return false
	if "plaza" in low or "stone_floor" in low or "cell-floor" in low or "jetty_deck" in low:
		return true
	if ("earth" in low or "coastal-cliff" in low or "carved-cliff" in low) and (
		low.begins_with("shore__") or low.begins_with("conn__") or low.begins_with("r3paths__")
	):
		return true
	return false

func _should_cast_babylon_shadow(node_low: String, n: String) -> bool:
	if node_low.begins_with("r3land__") or node_low.begins_with("r3shoulder__") or node_low.begins_with("r3paths__"):
		return false
	for skip_kw in [
		"foliage", "flower", "herb", "water", "bay", "flame", "lamp", "embers", "fire-core", "coal-heat",
		"contact-shadow", "warm-bounce", "fire-glow", "planter", "vine", "ivy", "grass", "moss", "meadow",
		"book", "scroll", "bottle", "plate", "cup", "bowl", "jar", "candle", "pottery", "lantern",
		"chain", "crate", "barrel", "bed", "hammock", "cushion", "linen", "paper", "rug", "cloth", "rope", "pebble", "rubble",
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

	# Preservar vertex colors en materiales originales no reemplazados; usar CULL_BACK en sólidos pesados
	if orig_mat is BaseMaterial3D:
		var bm := orig_mat as BaseMaterial3D
		var keep_two_sided := ("foliage" in n or "flower" in n or "cloth" in n or "water" in n or "flame" in n or "a1:room" in node_low or "pine" in node_low or "tree" in node_low or "bush" in node_low)
		bm.cull_mode = BaseMaterial3D.CULL_DISABLED if keep_two_sided else BaseMaterial3D.CULL_BACK
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

	if "plaza" in n or "stone_floor" in n or "cell-floor" in n:
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

	# Follaje y árboles conservan sus colores PBR + vertex colors de Babylon
	if "r3_" in n or "foliage" in n or "v2_" in n or "v4_" in n or "v5_" in n or "refinement_" in n:
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
		Color("#1f4725"), Color("#29562d"), Color("#346536"), Color("#417440")
	]
	var flower_palette: Array[Color] = [
		Color("#7b55c7"), Color("#e0cf8b"), Color("#d68e28"), Color("#c74859"), Color("#9469d9")
	]

	var add_planter_cluster := func(center: Vector3, span_x: float, count: int, with_ivy: bool) -> void:
		for i in range(count):
			var ox := rng.randf_range(-span_x * 0.46, span_x * 0.46)
			var oz := rng.randf_range(-0.24, 0.24)
			var sc := rng.randf_range(0.24, 0.42)
			var b := Basis.from_euler(Vector3(rng.randf_range(-0.18, 0.18), rng.randf_range(0.0, TAU), rng.randf_range(-0.18, 0.18)))
			b = b.scaled(Vector3(sc * 1.12, sc * 0.90, sc * 1.10))
			shrub_xf.append(Transform3D(b, center + Vector3(ox, sc * 0.30, oz)))
			shrub_col.append(green_palette[rng.randi() % green_palette.size()])

			if rng.randf() < 0.78:
				var fc: Color = flower_palette[rng.randi() % flower_palette.size()]
				var fsc := rng.randf_range(0.09, 0.16)
				var fb := Basis().scaled(Vector3(fsc, fsc * 1.15, fsc))
				flower_xf.append(Transform3D(fb, center + Vector3(ox + rng.randf_range(-0.12, 0.12), sc * 0.62 + 0.05, oz + rng.randf_range(-0.10, 0.10))))
				flower_col.append(fc)

		if with_ivy:
			var strand_count := maxi(3, int(round(span_x * 2.4)))
			for j in range(strand_count):
				var ix := lerpf(-span_x * 0.46, span_x * 0.46, float(j) / float(maxi(1, strand_count - 1))) + rng.randf_range(-0.10, 0.10)
				var drop := rng.randf_range(0.55, 1.30)
				var ib := Basis.from_euler(Vector3(0.08, rng.randf_range(-0.2, 0.2), rng.randf_range(-0.08, 0.08)))
				ib = ib.scaled(Vector3(0.22, drop, 0.16))
				ivy_xf.append(Transform3D(ib, center + Vector3(ix, -drop * 0.38, 0.32)))

	# 1. Las jardineras del borde sur del Paseo Superior (con hiedra colgante y flores)
	for x_p in [78.0, 84.0, 90.0, 96.0, 102.0, 108.0, 114.0, 120.0, 126.0, 132.0, 138.0, 144.0]:
		add_planter_cluster.call(Vector3(x_p, 18.52, 72.35), 2.1, 10, true)

	# Macetas de terracota flanqueando entradas de A3/A4 y bancos del Paseo Superior
	for x_pot in [81.0, 92.0, 100.5, 108.5, 118.0, 127.0]:
		var u_pot_pos := Vector3(x_pot, 18.0, 66.25)
		var u_pot := _create_cylinder(planters_node, "UpperPot_%d" % int(x_pot), u_pot_pos + Vector3(0.0, 0.24, 0.0), 0.32, 0.48, _mat_pottery_glb)
		u_pot.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		add_planter_cluster.call(u_pot_pos + Vector3(0.0, 0.46, 0.0), 0.45, 5, false)

	# 2. Jardineras del borde sur de la Plaza A1 (encajadas dentro de la barandilla/jardinera)
	for x_a1 in [76.5, 81.5, 86.5, 92.0, 97.5, 103.5, 109.5, 115.5, 121.5, 127.5, 133.5]:
		add_planter_cluster.call(Vector3(x_a1, 9.30, 97.08), 2.0, 9, true)

	# 3. Macetas de terracota y arbustos flanqueando los arcos de entrada de las 6 Cuevas A1
	for room in Structure.A1_ROOMS:
		var ec: Vector2i = room["global_entry"]
		var door_pos := Structure.cell_to_world(ec.x, ec.y, Structure.ELEV_A1_PLAZA)
		for side_dx in [-1.55, 1.55]:
			var pot_pos := Vector3(door_pos.x + side_dx, Structure.ELEV_A1_PLAZA, door_pos.z + 1.35)
			var pot := _create_cylinder(planters_node, "CavePot_%d_%d" % [int(room["id"]), int(sign(side_dx))], pot_pos + Vector3(0.0, 0.24, 0.0), 0.34, 0.48, _mat_pottery_glb)
			pot.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
			add_planter_cluster.call(pot_pos + Vector3(0.0, 0.46, 0.0), 0.48, 5, true)

	# 4. Jardineras y macetas en rellanos de Z2_ASCENT y terraza de los Jardines Z7
	for z2_pos in [
		Vector3(56.5, 6.75, 103.5), Vector3(64.8, 9.20, 97.8), Vector3(71.0, 9.20, 90.8),
		Vector3(80.2, 18.10, 56.2), Vector3(82.4, 18.10, 59.8), Vector3(84.6, 18.10, 62.6)
	]:
		add_planter_cluster.call(z2_pos, 1.5, 7, false)

	planters_node.add_child(_make_multimesh_batch("MM_PlanterFoliage", _make_bush_mesh(), _make_mat(Color.WHITE, 0.86, 0.0), shrub_xf, shrub_col))
	planters_node.add_child(_make_multimesh_batch("MM_PlanterIvy", _make_bush_mesh(), _make_mat(Color("#2d5e31"), 0.88, 0.0), ivy_xf, []))
	planters_node.add_child(_make_multimesh_batch("MM_PlanterFlowers", _make_flower_mesh(), _make_mat(Color.WHITE, 0.75, 0.0), flower_xf, flower_col))

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
		Color("#1a3c20"), Color("#204726"), Color("#26522c"), Color("#2d5a32")
	]
	var oak_greens: Array[Color] = [
		Color("#2b4f26"), Color("#365d2d"), Color("#426934"), Color("#24441f")
	]

	for pt in forest_pts:
		var pos := Vector3(float(pt.get("x", 0.0)), float(pt.get("y", 20.0)) - 0.18, float(pt.get("z", 0.0)))
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
	var flower_colors: Array[Color] = [Color("#cdb460"), Color("#7c5fc4"), Color("#d6ceb0")]

	for u in under_pts:
		var upos := Vector3(float(u.get("x", 0.0)), float(u.get("y", 20.0)) - 0.08, float(u.get("z", 0.0)))
		var usc := float(u.get("s", 1.0))
		var ub := Basis.from_euler(Vector3(0.0, rng.randf_range(0.0, TAU), 0.0)).scaled(Vector3(0.85 * usc, 0.58 * usc, 0.82 * usc))
		bush_xf.append(Transform3D(ub, upos + Vector3(0.0, 0.22 * usc, 0.0)))
		bush_col.append(oak_greens[rng.randi() % oak_greens.size()].darkened(0.05))
		if int(u.get("f", 0)) == 1:
			var fb := Basis().scaled(Vector3(0.18 * usc, 0.22 * usc, 0.18 * usc))
			fl_xf.append(Transform3D(fb, upos + Vector3(rng.randf_range(-0.22, 0.22), 0.42 * usc, rng.randf_range(-0.22, 0.22))))
			fl_col.append(flower_colors[rng.randi() % flower_colors.size()])

	var cone_mesh := _make_pine_tier_mesh()
	var crown_mat := _make_mat(Color.WHITE, 0.92, 0.0)

	var trunk_mesh := CylinderMesh.new()
	trunk_mesh.top_radius = 0.45
	trunk_mesh.bottom_radius = 0.72
	trunk_mesh.height = 1.0
	trunk_mesh.radial_segments = 7

	forest_node.add_child(_make_multimesh_batch("MM_ForestTrunks", trunk_mesh, mat_wood_dark, trunk_xf, []))
	forest_node.add_child(_make_multimesh_batch("MM_PineCrownLow", cone_mesh, crown_mat, crown_low_xf, pine_col_a))
	forest_node.add_child(_make_multimesh_batch("MM_PineCrownMid", cone_mesh, crown_mat, crown_mid_xf, pine_col_b))
	forest_node.add_child(_make_multimesh_batch("MM_PineCrownHigh", cone_mesh, crown_mat, crown_high_xf, pine_col_c))
	forest_node.add_child(_make_multimesh_batch("MM_OakCanopies", _make_bush_mesh(), crown_mat, oak_xf, oak_col))
	forest_node.add_child(_make_multimesh_batch("MM_UnderstoryBushes", _make_bush_mesh(), crown_mat, bush_xf, bush_col))
	forest_node.add_child(_make_multimesh_batch("MM_ForestFlowers", _make_flower_mesh(), _make_mat(Color.WHITE, 0.80, 0.0), fl_xf, fl_col))

func _make_pine_tier_mesh() -> ArrayMesh:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var boughs := 16
	var apex := Vector3(0.0, 0.52, 0.0)
	var skirt_ring: Array[Vector3] = []
	for i in range(boughs):
		var ang := float(i) / float(boughs) * TAU
		var rad := 1.02 if (i % 2 == 0) else 0.64
		var drop := -0.52 if (i % 2 == 0) else -0.44
		skirt_ring.append(Vector3(cos(ang) * rad, drop, sin(ang) * rad))
	var center_bottom := Vector3(0.0, -0.34, 0.0)
	for i in range(boughs):
		var next_i := (i + 1) % boughs
		var p1 := skirt_ring[i]
		var p2 := skirt_ring[next_i]
		st.add_vertex(apex)
		st.add_vertex(p2)
		st.add_vertex(p1)
		st.add_vertex(center_bottom)
		st.add_vertex(p1)
		st.add_vertex(p2)
	st.generate_normals()
	return st.commit()

func _make_bush_mesh() -> Mesh:
	var s := SphereMesh.new()
	s.radius = 0.55
	s.height = 0.92
	s.radial_segments = 9
	s.rings = 5
	return s

func _make_flower_mesh() -> Mesh:
	var s := SphereMesh.new()
	s.radius = 0.5
	s.height = 0.8
	s.radial_segments = 7
	s.rings = 4
	return s

func _make_multimesh_batch(batch_name: String, mesh_res: Mesh, mat: Material, transforms: Array[Transform3D], colors: Array[Color]) -> MultiMeshInstance3D:
	var mmi := MultiMeshInstance3D.new()
	mmi.name = batch_name
	var mm := MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	mm.use_colors = not colors.is_empty()
	mm.mesh = mesh_res
	mm.instance_count = transforms.size()
	for i in range(transforms.size()):
		mm.set_instance_transform(i, transforms[i])
		if mm.use_colors and i < colors.size():
			mm.set_instance_color(i, colors[i])
	mmi.multimesh = mm
	if mm.use_colors and mat is BaseMaterial3D:
		var colored_mat := (mat as BaseMaterial3D).duplicate() as BaseMaterial3D
		colored_mat.vertex_color_use_as_albedo = true
		colored_mat.vertex_color_is_srgb = true
		mmi.material_override = colored_mat
	else:
		mmi.material_override = mat
	mmi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON if ("CrownLow" in batch_name or "Oak" in batch_name) else GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	return mmi

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
		sphere.radius = 0.24
		sphere.height = 0.48
		mesh_inst.mesh = sphere
		mesh_inst.material_override = mat_marker
		mesh_inst.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		mesh_inst.position = Vector3(0, 0.55, 0)
		marker.add_child(mesh_inst)

		var label := Label3D.new()
		label.text = lm["label"]
		label.font_size = 16
		label.pixel_size = 0.014
		label.billboard = BaseMaterial3D.BILLBOARD_ENABLED
		label.position = Vector3(0, 1.35, 0)
		label.modulate = Color(1.0, 0.95, 0.8)
		marker.add_child(label)

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
			"base_width": 2.95,
			"skirt_depth": 3.5,
			"ridge_height": 1.75,
			"tread_tint": Color("#b29a76"),
			"edge_tint": Color("#6e654d"),
			"mist": true,
			"pts": [
				Vector3(13.6, 0.569, 92.25), Vector3(12.1, 0.569, 93.5), Vector3(10.8, 0.56, 95.1),
				Vector3(8.6, 0.545, 97.2), Vector3(5.8, 0.525, 99.0), Vector3(3.2, 0.495, 102.1),
				Vector3(-1.0, 0.45, 104.2), Vector3(-6.0, 0.42, 106.0), Vector3(-11.0, 0.40, 105.8),
				Vector3(-16.0, 0.38, 103.0), Vector3(-20.0, 0.38, 99.0)
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
			"base_width": 2.65,
			"skirt_depth": 18.0,
			"ridge_height": 2.1,
			"tread_tint": Color("#9f8967"),
			"edge_tint": Color("#59563d"),
			"mist": false,
			"pts": [
				Vector3(13.2, 21.25, 44.5), Vector3(11.9, 21.24, 43.33), Vector3(10.92, 21.22, 42.59),
				Vector3(9.82, 21.18, 41.99), Vector3(8.58, 21.14, 41.60), Vector3(7.22, 21.10, 41.46),
				Vector3(5.80, 21.02, 41.20), Vector3(4.28, 20.90, 40.66), Vector3(2.92, 20.65, 39.61),
				Vector3(2.21, 20.30, 38.52), Vector3(1.90, 19.85, 37.50), Vector3(-1.0, 18.8, 34.0),
				Vector3(-5.0, 17.6, 31.0), Vector3(-10.0, 16.5, 29.0), Vector3(-15.0, 15.6, 25.0),
				Vector3(-18.0, 14.8, 19.0)
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
			"base_width": 2.85,
			"skirt_depth": 18.0,
			"ridge_height": 2.3,
			"tread_tint": Color("#a99a80"),
			"edge_tint": Color("#5d5c48"),
			"mist": false,
			"pts": [
				Vector3(120.75, 37.0, 15.75), Vector3(119.8, 37.05, 14.8), Vector3(118.8, 37.12, 13.9),
				Vector3(117.5, 37.22, 12.8), Vector3(116.5, 37.32, 11.5), Vector3(115.5, 37.45, 9.7),
				Vector3(114.0, 37.65, 6.5), Vector3(114.5, 37.95, 3.0), Vector3(116.5, 38.30, -1.0),
				Vector3(120.0, 38.65, -4.0), Vector3(125.0, 39.00, -8.0), Vector3(130.0, 39.30, -11.0)
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
			"base_width": 2.55,
			"skirt_depth": 18.0,
			"ridge_height": 1.85,
			"tread_tint": Color("#9f9584"),
			"edge_tint": Color("#5a584a"),
			"mist": false,
			"pts": [
				Vector3(159.75, 32.7, 26.25), Vector3(160.4, 32.76, 25.45), Vector3(161.3, 32.82, 24.7),
				Vector3(162.3, 32.88, 24.0), Vector3(163.6, 32.94, 23.3), Vector3(164.7, 33.00, 22.6),
				Vector3(165.4, 33.15, 20.0), Vector3(165.3, 33.35, 16.5), Vector3(164.4, 33.60, 13.0),
				Vector3(162.7, 33.85, 10.0), Vector3(161.5, 34.10, 5.5), Vector3(162.0, 34.35, 0.0),
				Vector3(164.0, 34.60, -5.0)
			]
		}
	]

	for route in routes:
		var rid: String = str(route["id"])
		var smoothed: Array[Vector3] = _chaikin_smooth_3d(route["pts"], 1)
		_create_trail_ribbon_mesh(root, rid, smoothed, route, rng)
		_create_trail_colliders(root, rid, smoothed, route["exit_pos"], float(route["base_width"]))
		_populate_trail_framing(smoothed, route, rng, trail_rocks_xf, trail_rocks_col, trail_bushes_xf, trail_bushes_col, trail_trunks_xf, trail_pine_a_xf, trail_pine_a_col, trail_pine_b_xf, trail_pine_b_col, trail_pine_c_xf, trail_pine_c_col)

		if bool(route.get("mist", false)):
			_create_coastal_mist(root, "Mist_" + rid, Vector3(0.5, 1.35, 103.5))

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
	var rock_mesh := SphereMesh.new()
	rock_mesh.radius = 0.62
	rock_mesh.height = 0.92
	rock_mesh.radial_segments = 6
	rock_mesh.rings = 3
	var rock_mat := _make_mat(Color.WHITE, 0.94, 0.02)
	if not trail_rocks_xf.is_empty():
		root.add_child(_make_multimesh_batch("MM_TrailRocks", rock_mesh, rock_mat, trail_rocks_xf, trail_rocks_col))

	var bush_mesh := SphereMesh.new()
	bush_mesh.radius = 0.65
	bush_mesh.height = 0.78
	bush_mesh.radial_segments = 8
	bush_mesh.rings = 4
	var bush_mat := _make_mat(Color.WHITE, 0.93, 0.0)
	if not trail_bushes_xf.is_empty():
		root.add_child(_make_multimesh_batch("MM_TrailBushes", bush_mesh, bush_mat, trail_bushes_xf, trail_bushes_col))

	if not trail_trunks_xf.is_empty():
		var cone_mesh := _make_pine_tier_mesh()
		var crown_mat := _make_mat(Color.WHITE, 0.92, 0.0)
		var trunk_mesh := CylinderMesh.new()
		trunk_mesh.top_radius = 0.45
		trunk_mesh.bottom_radius = 0.72
		trunk_mesh.height = 1.0
		trunk_mesh.radial_segments = 7
		root.add_child(_make_multimesh_batch("MM_TrailTrunks", trunk_mesh, mat_wood_dark, trail_trunks_xf, []))
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
	var tread_col: Color = cfg["tread_tint"]
	var edge_col: Color = cfg["edge_tint"]
	var rock_col := Color("#46423d")

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

		# Anchura organica asimetrica que se ensancha ligeramente en la entrada
		var w_jitter := 1.0 + 0.14 * sin(float(i) * 1.45) + rng.randf_range(-0.07, 0.07)
		var half_w := base_w * 0.5 * w_jitter
		var outer_w := half_w + rng.randf_range(0.55, 0.95)
		var c_noise := rng.randf_range(-0.04, 0.04)

		var l_skirt := p - right * (outer_w + 1.1) - Vector3(0.0, skirt, 0.0)
		var l_verge := p - right * outer_w - Vector3(0.0, 0.24, 0.0)
		var l_tread := p - right * half_w + Vector3(0.0, 0.012, 0.0)
		var center := p + Vector3(0.0, 0.032, 0.0)
		var r_tread := p + right * half_w + Vector3(0.0, 0.012, 0.0)
		var r_verge := p + right * outer_w - Vector3(0.0, 0.24, 0.0)
		var r_skirt := p + right * (outer_w + 1.1) - Vector3(0.0, skirt, 0.0)

		rings.append({
			"pts": [l_skirt, l_verge, l_tread, center, r_tread, r_verge, r_skirt],
			"cols": [
				rock_col,
				edge_col.darkened(0.08 + c_noise),
				tread_col.darkened(0.06 + c_noise),
				tread_col.lightened(0.05 + c_noise),
				tread_col.darkened(0.06 - c_noise),
				edge_col.darkened(0.08 - c_noise),
				rock_col
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
	trail_mat.roughness = 0.93
	trail_mat.metallic = 0.02
	if mat_trail and mat_trail.albedo_texture:
		trail_mat.albedo_texture = mat_trail.albedo_texture
		trail_mat.uv1_scale = Vector3(0.45, 0.45, 0.45)
	inst.material_override = trail_mat
	inst.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	parent.add_child(inst)

func _emit_quad_st(st: SurfaceTool, p0: Vector3, p1: Vector3, p2: Vector3, p3: Vector3, c0: Color, c1: Color, c2: Color, c3: Color, uv0: Vector2, uv1: Vector2, uv2: Vector2, uv3: Vector2) -> void:
	st.set_color(c0); st.set_uv(uv0); st.add_vertex(p0)
	st.set_color(c1); st.set_uv(uv1); st.add_vertex(p1)
	st.set_color(c2); st.set_uv(uv2); st.add_vertex(p2)
	st.set_color(c0); st.set_uv(uv0); st.add_vertex(p0)
	st.set_color(c2); st.set_uv(uv2); st.add_vertex(p2)
	st.set_color(c3); st.set_uv(uv3); st.add_vertex(p3)

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

func _populate_trail_framing(pts: Array[Vector3], cfg: Dictionary, rng: RandomNumberGenerator, rocks_xf: Array[Transform3D], rocks_col: Array[Color], bushes_xf: Array[Transform3D], bushes_col: Array[Color], trunks_xf: Array[Transform3D], pine_a_xf: Array[Transform3D], pine_a_col: Array[Color], pine_b_xf: Array[Transform3D], pine_b_col: Array[Color], pine_c_xf: Array[Transform3D], pine_c_col: Array[Color]) -> void:
	var half_w := float(cfg["base_width"]) * 0.5
	var ridge_h := float(cfg["ridge_height"])
	var is_high := float(pts[0].y) > 10.0
	var rock_tones := [Color("#54524e"), Color("#635d55"), Color("#4a4946")]
	var bush_tones := [Color("#2e5128"), Color("#3c6232"), Color("#486935")]
	var pine_tones := [Color("#1d4124"), Color("#244c29"), Color("#2b5630")]

	for i in range(1, pts.size()):
		var p := pts[i]
		var fwd := (pts[i] - pts[i - 1])
		fwd.y = 0.0
		if fwd.length_squared() < 0.001:
			continue
		fwd = fwd.normalized()
		var right := Vector3(-fwd.z, 0.0, fwd.x)

		# Piedras irregulares de cuneta/deslinde a ambos lados
		for side_v in [-1.0, 1.0]:
			var side := float(side_v)
			if rng.randf() < 0.82:
				var dist := half_w + rng.randf_range(0.55, 1.45)
				var rpos: Vector3 = p + right * (side * dist) + Vector3(0.0, rng.randf_range(-0.18, 0.15), 0.0)
				var sx := rng.randf_range(0.55, 1.35)
				var sy := rng.randf_range(0.42, 1.05) * (1.25 if i > pts.size() * 0.55 else 1.0)
				var sz := rng.randf_range(0.55, 1.40)
				var rb := Basis.from_euler(Vector3(rng.randf_range(-0.2, 0.2), rng.randf_range(0.0, TAU), rng.randf_range(-0.2, 0.2))).scaled(Vector3(sx, sy, sz))
				rocks_xf.append(Transform3D(rb, rpos))
				rocks_col.append(rock_tones[rng.randi() % rock_tones.size()])

			if rng.randf() < 0.72:
				var bdist := half_w + rng.randf_range(0.75, 2.2)
				var bpos: Vector3 = p + right * (side * bdist) + Vector3(0.0, rng.randf_range(0.05, 0.28), 0.0)
				var bsc := rng.randf_range(0.65, 1.25)
				var bb := Basis.from_euler(Vector3(0.0, rng.randf_range(0.0, TAU), 0.0)).scaled(Vector3(bsc * 1.15, bsc * 0.72, bsc))
				bushes_xf.append(Transform3D(bb, bpos))
				bushes_col.append(bush_tones[rng.randi() % bush_tones.size()])

		# A partir del tramo medio-final, ocultar el horizonte del camino tras arboles y taludes
		if i >= int(float(pts.size()) * 0.42) and (i % 2 == 0 or i >= int(float(pts.size()) * 0.65)):
			for side_v in [-1.0, 1.0]:
				var side := float(side_v)
				if is_high or side > 0.0 or i >= pts.size() - 3:
					var tdist := half_w + rng.randf_range(1.9, 4.8)
					var tpos: Vector3 = p + right * (side * tdist) - Vector3(0.0, 0.25, 0.0)
					var tsc := rng.randf_range(0.95, 1.48)
					_append_scenic_pine(tpos, tsc, rng, pine_tones, trunks_xf, pine_a_xf, pine_a_col, pine_b_xf, pine_b_col, pine_c_xf, pine_c_col)
					if is_high and i >= int(float(pts.size()) * 0.55):
						# Espolon rocoso en ladera alta que envuelve el recodo
						var kpos: Vector3 = p + right * (side * (tdist + 0.9)) + Vector3(0.0, ridge_h * 0.35, 0.0)
						var kb := Basis.from_euler(Vector3(0.0, rng.randf_range(0.0, TAU), 0.0)).scaled(Vector3(2.8, ridge_h * 1.4, 2.6))
						rocks_xf.append(Transform3D(kb, kpos))
						rocks_col.append(rock_tones[0])

func _build_horizon_backdrop_shoulders(parent: Node, rng: RandomNumberGenerator, rocks_xf: Array[Transform3D], rocks_col: Array[Color], bushes_xf: Array[Transform3D], bushes_col: Array[Color], trunks_xf: Array[Transform3D], pine_a_xf: Array[Transform3D], pine_a_col: Array[Color], pine_b_xf: Array[Transform3D], pine_b_col: Array[Color], pine_c_xf: Array[Transform3D], pine_c_col: Array[Color]) -> void:
	# Cerrar visualmente la esquina NO (detras de pleamar-high) y borde N (observatorio)
	var shoulder_mat := _make_mat(Color("#47443b"), 0.95, 0.02)
	var pine_tones := [Color("#1a3c20"), Color("#224927"), Color("#29532d")]
	var rock_tones := [Color("#504d48"), Color("#43413d")]
	var bush_tones := [Color("#2d4e26"), Color("#385b2f")]

	var shoulder_specs := [
		{"name": "BackdropRidge_NW_A", "pos": Vector3(-8.0, 9.5, 22.0), "size": Vector3(28.0, 22.0, 26.0)},
		{"name": "BackdropRidge_NW_B", "pos": Vector3(-12.0, 12.0, 38.0), "size": Vector3(22.0, 25.0, 22.0)},
		{"name": "BackdropRidge_N_Obs", "pos": Vector3(122.0, 19.0, -7.0), "size": Vector3(38.0, 41.0, 22.0)},
		{"name": "BackdropRidge_NE_Obs", "pos": Vector3(166.0, 16.5, -2.0), "size": Vector3(24.0, 36.0, 22.0)},
	]
	for s in shoulder_specs:
		var box := BoxMesh.new()
		box.size = s["size"]
		var inst := MeshInstance3D.new()
		inst.name = s["name"]
		inst.mesh = box
		inst.material_override = shoulder_mat
		inst.position = s["pos"]
		parent.add_child(inst)

	# Arboleda de respaldo sobre ambas lomas para esconder bordes del mapa en vista overview
	for _k in range(28):
		var px := rng.randf_range(-19.0, 8.0)
		var pz := rng.randf_range(12.0, 44.0)
		if px > -1.0 and pz > 35.0:
			continue
		var py := 19.2 + rng.randf_range(-0.6, 1.4)
		_append_scenic_pine(Vector3(px, py, pz), rng.randf_range(1.05, 1.65), rng, pine_tones, trunks_xf, pine_a_xf, pine_a_col, pine_b_xf, pine_b_col, pine_c_xf, pine_c_col)
		if rng.randf() < 0.65:
			var bb := Basis().scaled(Vector3(1.2, 0.8, 1.2))
			bushes_xf.append(Transform3D(bb, Vector3(px + rng.randf_range(-1.4, 1.4), py + 0.3, pz + rng.randf_range(-1.4, 1.4))))
			bushes_col.append(bush_tones[rng.randi() % bush_tones.size()])

	for _k in range(24):
		var px := rng.randf_range(108.0, 168.0)
		var pz := rng.randf_range(-14.0, 12.0)
		var py := 38.2 if px < 142.0 else 33.8
		_append_scenic_pine(Vector3(px, py, pz), rng.randf_range(1.0, 1.55), rng, pine_tones, trunks_xf, pine_a_xf, pine_a_col, pine_b_xf, pine_b_col, pine_c_xf, pine_c_col)
		if rng.randf() < 0.55:
			var rb := Basis.from_euler(Vector3(0.0, rng.randf_range(0.0, TAU), 0.0)).scaled(Vector3(2.2, 1.4, 2.0))
			rocks_xf.append(Transform3D(rb, Vector3(px + rng.randf_range(-1.8, 1.8), py + 0.25, pz + rng.randf_range(-1.8, 1.8))))
			rocks_col.append(rock_tones[rng.randi() % rock_tones.size()])

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
	p.amount = 18
	p.lifetime = 4.2
	p.preprocess = 2.0
	var pm := ParticleProcessMaterial.new()
	pm.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_BOX
	pm.emission_box_extents = Vector3(5.5, 0.5, 4.0)
	pm.direction = Vector3(0.4, 0.12, 0.15)
	pm.spread = 28.0
	pm.initial_velocity_min = 0.25
	pm.initial_velocity_max = 0.65
	pm.gravity = Vector3.ZERO
	pm.scale_min = 1.6
	pm.scale_max = 3.2
	pm.color = Color(0.82, 0.90, 0.95, 0.14)
	p.process_material = pm

	var q := QuadMesh.new()
	q.size = Vector2(2.4, 1.6)
	var m := StandardMaterial3D.new()
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.billboard_mode = BaseMaterial3D.BILLBOARD_ENABLED
	m.albedo_color = Color(0.85, 0.92, 0.96, 0.12)
	m.depth_draw_mode = BaseMaterial3D.DEPTH_DRAW_DISABLED
	p.draw_pass_1 = q
	p.material_override = m
	p.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parent.add_child(p)
