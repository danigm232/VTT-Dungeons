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
const InteractiveDoorScript = preload("res://scripts/interactive_door.gd")
const WinchAndStairs = preload("res://scripts/retreat_winch_and_stairs.gd")
const TempleAndCliffs = preload("res://scripts/retreat_temple_and_cliffs.gd")
const WeatherAndAudioScript = preload("res://scripts/retreat_weather_and_audio.gd")

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
var winch_drum_pivot: Node3D
var winch_pulley_pivot: Node3D
var winch_guide_pulley_pivot: Node3D
var winch_is_lowered: bool = false
var _winch_blend: float = 0.0
var _cave_roof_entries: Array[Dictionary] = []
var _cave_roofs_force_open: bool = false
var _cave_roofs_mode: String = "auto" # "auto" | "open" | "closed"
var _time_of_day: String = "day"
var _flame_time: float = 0.0
var _flame_entries: Array[Dictionary] = []
var _flame_lights: Array[Dictionary] = []
var _night_glb_nodes: Array[Node3D] = []
var _boat_bob_node: Node3D
var _boat_base_pos: Vector3 = Vector3.ZERO
var _boat_base_rot: Vector3 = Vector3.ZERO
var _boat_time: float = 0.0
var _coastal_sunbeams_node: Node3D = null
var _cove_sun_patch_light: OmniLight3D = null
var _ocean_plane_node: MeshInstance3D = null
var _a1_fauna_root: Node3D = null
var _perched_gulls: Array[Dictionary] = []
var _gliding_gulls: Array[Dictionary] = []
var _garden_butterflies: Array[Dictionary] = []
var _coastal_fish: Array[Dictionary] = []
var _a5_canaries: Array[Dictionary] = []
var _canary_focus := Vector3.ZERO
var _canary_focus_until := 0.0
var _z2_reappearance_gear: Node3D = null
var _a5_revelation_fx: Node3D = null
var _fauna_time: float = 0.0
var _a1_ambient_player: AudioStreamPlayer = null
var _a1_ambient_phase: float = 0.0
var _weather_system: Node3D = null
var _prebuild_finished: bool = false

func _ready() -> void:
	add_to_group("time_of_day_listener")
	add_to_group("weather_listener")
	if not _prebuild_finished:
		build_layout()
	else:
		call_deferred("_settle_a1_fauna_clear_of_rocks")
		if is_instance_valid(_a1_ambient_player) and _a1_ambient_player.is_inside_tree() and not _a1_ambient_player.playing:
			_a1_ambient_player.play()
	_ensure_weather_system()
	set_time_of_day(_time_of_day)
	var mt := get_node_or_null("/root/MapTransition")
	if mt:
		if mt.has_signal("tide_state_changed"):
			var cb := Callable(self, "_on_tide_state_changed")
			if not mt.is_connected("tide_state_changed", cb):
				mt.connect("tide_state_changed", cb)
		_on_tide_state_changed(str(mt.get("tide_state")))

func _on_tide_state_changed(new_tide: String) -> void:
	var offset_y := 0.0
	match new_tide.strip_edges().to_lower():
		"low":
			offset_y = -0.34
		"rising":
			offset_y = 0.18
		"high":
			offset_y = 0.42
	if is_instance_valid(_ocean_plane_node):
		_ocean_plane_node.position.y = Structure.ELEV_SEA + offset_y
	if get_tree():
		for fn in get_tree().get_nodes_in_group("tide_foam"):
			if fn is Node3D:
				var f3 := fn as Node3D
				if not f3.has_meta("base_y"):
					f3.set_meta("base_y", f3.position.y)
				f3.position.y = float(f3.get_meta("base_y")) + offset_y

func _process(delta: float) -> void:
	if Engine.is_editor_hint():
		return
	var target_blend := 1.0 if winch_is_lowered else 0.0
	if not is_equal_approx(_winch_blend, target_blend):
		_winch_blend = move_toward(_winch_blend, target_blend, delta * 0.85)
		_apply_winch_visual_state(_winch_blend)
	if not _cave_roof_entries.is_empty() and _cave_roofs_mode == "auto":
		SceneEnhancer.update_cave_roof_cutaways(self, _cave_roof_entries)
	_animate_night_flames(delta)
	if is_instance_valid(_boat_bob_node):
		_boat_time += delta
		_boat_bob_node.position = _boat_base_pos + Vector3(0.0, sin(_boat_time * 1.45) * 0.024, 0.0)
		_boat_bob_node.rotation = _boat_base_rot + Vector3(cos(_boat_time * 1.15) * 0.014, 0.0, sin(_boat_time * 1.75) * 0.020)
	_animate_a1_fauna_and_sound(delta)
	OcclusionCtrl.update(self, delta)

func register_flame_fx(flame_node: Node3D, light_node: Light3D = null, is_cluster: bool = false) -> void:
	if is_instance_valid(flame_node):
		var exists := false
		for entry in _flame_entries:
			if entry.get("node") == flame_node:
				exists = true
				break
		if not exists:
			_flame_entries.append({
				"node": flame_node,
				"base_pos": flame_node.position,
				"base_scale": flame_node.scale,
				"phase": float(_flame_entries.size()) * 1.37 + flame_node.position.x * 0.31 + flame_node.position.z * 0.19,
				"is_cluster": is_cluster
			})
	if is_instance_valid(light_node):
		var l_exists := false
		for le in _flame_lights:
			if le.get("light") == light_node:
				l_exists = true
				break
		if not l_exists:
			_flame_lights.append({
				"light": light_node,
				"base_energy": light_node.light_energy,
				"phase": float(_flame_lights.size()) * 1.71
			})

func _collect_flame_nodes_recursive(root_node: Node) -> void:
	if root_node is MeshInstance3D:
		var mi := root_node as MeshInstance3D
		var low := mi.name.to_lower()
		var is_mat_flame := (mi.material_override == mat_flame)
		if is_mat_flame or "flame" in low or "ember" in low or "hearthfire" in low:
			register_flame_fx(mi, null, "cluster" in low or "campfire" in low)
	for child in root_node.get_children():
		_collect_flame_nodes_recursive(child)

func _node_or_parent_meta(node: Node, key: String, default_val: Variant) -> Variant:
	var cur: Node = node
	for _depth in range(4):
		if not is_instance_valid(cur):
			break
		if cur.has_meta(key):
			return cur.get_meta(key)
		cur = cur.get_parent()
	return default_val

func set_local_fire_fuel(fire_root: Node3D, fuel: float) -> void:
	if not is_instance_valid(fire_root):
		return
	fire_root.set_meta("stoked_boost", clampf(fuel, 0.75, 1.55))

func set_local_fire_state(fire_root: Node3D, lit: bool, fuel: float = 1.0, create_light_if_missing: bool = true) -> void:
	if not is_instance_valid(fire_root):
		return
	var clamped_fuel := clampf(fuel, 0.75, 1.55)
	fire_root.set_meta("manually_lit", lit)
	fire_root.set_meta("manually_extinguished", not lit)
	fire_root.set_meta("stoked_boost", clamped_fuel)
	var has_light := false
	var nodes_to_check: Array[Node] = [fire_root]
	nodes_to_check.append_array(fire_root.find_children("*", "Node3D", true, false))
	for child in nodes_to_check:
		if child is OmniLight3D:
			has_light = true
			var ol := child as OmniLight3D
			ol.visible = lit
			var found_reg := false
			for le in _flame_lights:
				if le.get("light") == ol:
					ol.light_energy = float(le.get("base_energy", 1.8)) * clamped_fuel if lit else 0.0
					found_reg = true
					break
			if not found_reg:
				register_flame_fx(null, ol, false)
				ol.light_energy = ol.light_energy * clamped_fuel if lit else 0.0
		elif child is MeshInstance3D:
			var mi := child as MeshInstance3D
			var low := mi.name.to_lower()
			if mi.is_in_group("night_flame") or mi.material_override == mat_flame or "flame" in low or "ember" in low:
				mi.visible = lit
				register_flame_fx(mi, null, "cluster" in low or "hearth" in low)
	if lit and not has_light and create_light_if_missing:
		var live_l := OmniLight3D.new()
		live_l.name = "StokedFireLight"
		live_l.position = Vector3(0.0, 1.15, 0.0)
		live_l.light_color = Color(1.0, 0.62, 0.24)
		live_l.light_energy = 2.10 * clamped_fuel
		live_l.omni_range = 10.5
		live_l.shadow_enabled = false
		fire_root.add_child(live_l)
		register_flame_fx(null, live_l, false)

func set_time_of_day(time_id: String) -> void:
	var norm := time_id.strip_edges().to_lower()
	if not (norm in ["day", "dusk", "night"]):
		norm = "day"
	_time_of_day = norm
	var fires_lit := (_time_of_day in ["night", "dusk"])
	var energy_mult := 1.0 if _time_of_day == "night" else (0.80 if _time_of_day == "dusk" else 0.0)
	for entry in _flame_entries:
		var fn: Node3D = entry.get("node")
		if is_instance_valid(fn):
			var manual := bool(_node_or_parent_meta(fn, "manually_lit", false))
			var manual_off := bool(_node_or_parent_meta(fn, "manually_extinguished", false))
			fn.visible = (fires_lit or manual) and not manual_off
	for le in _flame_lights:
		var ln: Light3D = le.get("light")
		if is_instance_valid(ln):
			var manual := bool(_node_or_parent_meta(ln, "manually_lit", false))
			var manual_off := bool(_node_or_parent_meta(ln, "manually_extinguished", false))
			var lit_now := (fires_lit or manual) and not manual_off
			ln.visible = lit_now
			var boost := float(_node_or_parent_meta(ln, "stoked_boost", 1.0))
			var e_mult := maxf(energy_mult, 0.85 if manual else 0.0)
			ln.light_energy = float(le.get("base_energy", 1.5)) * e_mult * boost if lit_now else 0.0
	for gn in _night_glb_nodes:
		if is_instance_valid(gn):
			gn.visible = fires_lit
	if is_instance_valid(_coastal_sunbeams_node):
		_coastal_sunbeams_node.visible = (_time_of_day != "night")
	if is_instance_valid(_cove_sun_patch_light):
		_cove_sun_patch_light.visible = (_time_of_day != "night")
		_cove_sun_patch_light.light_energy = 0.90 if _time_of_day == "day" else 0.42
	_apply_atmosphere_lighting(_time_of_day)

func get_time_of_day() -> String:
	return _time_of_day

func _ensure_weather_system() -> void:
	if is_instance_valid(_weather_system):
		return
	var ws: Node3D = WeatherAndAudioScript.new()
	ws.name = "RetreatWeatherSystem"
	add_child(ws)
	ws.call("setup", self)
	_weather_system = ws

func set_weather(w: String, immediate: bool = false) -> bool:
	_ensure_weather_system()
	if is_instance_valid(_weather_system) and _weather_system.has_method("set_weather"):
		return bool(_weather_system.call("set_weather", w, immediate))
	return false

func get_weather() -> String:
	if is_instance_valid(_weather_system) and _weather_system.has_method("get_weather"):
		return str(_weather_system.call("get_weather"))
	return "clear"

func set_reduced_effects(v: bool) -> void:
	_ensure_weather_system()
	if is_instance_valid(_weather_system) and _weather_system.has_method("set_reduced_effects"):
		_weather_system.call("set_reduced_effects", v)

func set_channel_volume(channel_id: String, value_0_100: float) -> void:
	_ensure_weather_system()
	if is_instance_valid(_weather_system) and _weather_system.has_method("set_channel_volume"):
		_weather_system.call("set_channel_volume", channel_id, value_0_100)

func play_dm_sfx(sfx_id: String) -> void:
	_ensure_weather_system()
	if is_instance_valid(_weather_system) and _weather_system.has_method("play_dm_sfx"):
		_weather_system.call("play_dm_sfx", sfx_id)

func _apply_atmosphere_lighting(mode: String) -> void:
	var parent := get_parent()
	if not parent:
		return
	var sun := parent.get_node_or_null("DirectionalLight3D") as DirectionalLight3D
	var env_node := parent.get_node_or_null("WorldEnvironment") as WorldEnvironment
	if sun:
		match mode:
			"night":
				# Fase 7: Luz lunar azul-plata que conserva relieve de acantilados, caminos y sprites mientras los faroles cálidos crean focos
				sun.light_color = Color(0.52, 0.68, 0.95)
				sun.light_energy = 0.52
				sun.rotation_degrees = Vector3(-40.0, -34.0, 0.0)
			"dusk":
				# Fase 7: Sol bajo dorado-ámbar rasante contrastado con ambiente violáceo-pizarra legible
				sun.light_color = Color(0.99, 0.66, 0.41)
				sun.light_energy = 1.02
				sun.rotation_degrees = Vector3(-22.0, -52.0, 0.0)
			_:
				# Fase 7: Luz mediterránea clara y controlada sin quemar la caliza ni hundir las sombras de acantilados a negro
				sun.light_color = Color(1.0, 0.93, 0.80)
				sun.light_energy = 1.48
				sun.rotation_degrees = Vector3(-31.0, -49.0, 0.0)
	if env_node and env_node.environment:
		var env := env_node.environment
		var sky_mat := env.sky.sky_material as ProceduralSkyMaterial if env.sky else null
		match mode:
			"night":
				env.ambient_light_color = Color(0.24, 0.34, 0.52)
				env.ambient_light_energy = 0.50
				env.tonemap_exposure = 1.04
				env.fog_light_color = Color(0.15, 0.23, 0.37)
				if sky_mat:
					sky_mat.sky_top_color = Color(0.05, 0.09, 0.19)
					sky_mat.sky_horizon_color = Color(0.16, 0.25, 0.40)
					sky_mat.ground_horizon_color = Color(0.11, 0.18, 0.30)
					sky_mat.ground_bottom_color = Color(0.06, 0.10, 0.17)
			"dusk":
				env.ambient_light_color = Color(0.38, 0.40, 0.56)
				env.ambient_light_energy = 0.50
				env.tonemap_exposure = 1.03
				env.fog_light_color = Color(0.46, 0.39, 0.44)
				if sky_mat:
					sky_mat.sky_top_color = Color(0.20, 0.21, 0.36)
					sky_mat.sky_horizon_color = Color(0.78, 0.48, 0.36)
					sky_mat.ground_horizon_color = Color(0.42, 0.32, 0.34)
					sky_mat.ground_bottom_color = Color(0.14, 0.13, 0.18)
			_:
				env.ambient_light_color = Color(0.38, 0.48, 0.58)
				env.ambient_light_energy = 0.54
				env.tonemap_exposure = 1.02
				env.fog_light_color = Color(0.45, 0.59, 0.70)
				if sky_mat:
					sky_mat.sky_top_color = Color(0.15, 0.27, 0.40)
					sky_mat.sky_horizon_color = Color(0.55, 0.69, 0.80)
					sky_mat.ground_horizon_color = Color(0.33, 0.44, 0.53)
					sky_mat.ground_bottom_color = Color(0.15, 0.22, 0.28)
		if is_instance_valid(_weather_system) and _weather_system.has_method("modulate_atmosphere"):
			_weather_system.call("modulate_atmosphere", mode, sun, env, sky_mat, mat_ocean as ShaderMaterial)

func _animate_night_flames(delta: float) -> void:
	_flame_time += delta
	var e_base_mult := 1.0 if _time_of_day == "night" else (0.80 if _time_of_day == "dusk" else 0.85)
	for entry in _flame_entries:
		var fn: Node3D = entry.get("node")
		if not is_instance_valid(fn) or not fn.visible:
			continue
		var phase: float = float(entry.get("phase", 0.0))
		var base_s: Vector3 = entry.get("base_scale", Vector3.ONE)
		var base_p: Vector3 = entry.get("base_pos", Vector3.ZERO)
		var boost := float(_node_or_parent_meta(fn, "stoked_boost", 1.0))
		var w1 := sin(_flame_time * 5.8 + phase)
		var w2 := sin(_flame_time * 9.3 + phase * 2.17)
		var w3 := cos(_flame_time * 4.1 + phase * 0.7)
		var sy := (1.0 + 0.09 * w1 + 0.05 * w2) * boost
		var sxz := (1.0 - 0.04 * w1 + 0.03 * w3) * lerpf(1.0, boost, 0.45)
		fn.scale = Vector3(base_s.x * sxz, base_s.y * sy, base_s.z * sxz)
		fn.position = base_p + Vector3(w3 * 0.008, (sy - 1.0) * 0.025, w2 * 0.007)
		fn.rotation.z = w1 * 0.05
	for le in _flame_lights:
		var ln: Light3D = le.get("light")
		if not is_instance_valid(ln) or not ln.visible:
			continue
		var lp: float = float(le.get("phase", 0.0))
		var boost := float(_node_or_parent_meta(ln, "stoked_boost", 1.0))
		var base_e: float = float(le.get("base_energy", 1.5)) * e_base_mult * boost
		# 6.4 Parpadeo orgánico muy suave y desfasado (sin efecto estroboscópico)
		var pulse := 0.93 + 0.07 * sin(_flame_time * 4.7 + lp) + 0.04 * cos(_flame_time * 8.3 + lp * 1.63)
		ln.light_energy = base_e * pulse

func set_cave_roofs_mode(mode: String) -> void:
	var norm := mode.strip_edges().to_lower()
	if not (norm in ["auto", "open", "closed"]):
		norm = "auto"
	_cave_roofs_mode = norm
	_cave_roofs_force_open = (norm == "open")
	if norm == "open" or norm == "closed":
		var open_flag := (norm == "open")
		for entry in _cave_roof_entries:
			SceneEnhancer.set_roof_entry_open(entry, open_flag)

func set_all_cave_roofs_open(open: bool) -> void:
	set_cave_roofs_mode("open" if open else "auto")
	if not open:
		for entry in _cave_roof_entries:
			SceneEnhancer.set_roof_entry_open(entry, false)

func toggle_winch_lever() -> bool:
	winch_is_lowered = not winch_is_lowered
	return winch_is_lowered

func _apply_winch_visual_state(t: float) -> void:
	if winch_lever_pivot:
		winch_lever_pivot.rotation_degrees.x = lerpf(-22.0, 34.0, t)
	if winch_drum_pivot:
		winch_drum_pivot.rotation.x = lerpf(0.0, TAU * 4.5, t)
	if winch_pulley_pivot:
		winch_pulley_pivot.rotation.x = lerpf(0.0, TAU * 9.0, t)
	if winch_guide_pulley_pivot:
		winch_guide_pulley_pivot.rotation.x = lerpf(0.0, TAU * 9.0, t)
	var pallet_y := lerpf(12.2, 0.55, t)
	if winch_pallet_rig:
		winch_pallet_rig.position.y = pallet_y
	if winch_cable_mesh:
		var top_y := 17.36
		var bottom_y := pallet_y + 1.48
		var span := maxf(0.4, top_y - bottom_y)
		winch_cable_mesh.scale.y = span
		winch_cable_mesh.position.y = bottom_y + span * 0.5

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
	mat_rock = _make_textured_mat(Color("#97a29b"), 0.86, 0.0, tex_basalt if tex_basalt else tex_cliff, 0.16, true, norm_rock, 0.68)
	mat_rock_carved = _make_textured_mat(Color("#abaFA4"), 0.84, 0.0, tex_coastal_rock if tex_coastal_rock else tex_cliff, 0.26, true, norm_rock, 0.65)
	mat_rock_dark = _make_textured_mat(Color("#7e8784"), 0.89, 0.0, tex_basalt if tex_basalt else tex_cliff, 0.16, true, norm_rock, 0.70)
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
uniform vec4 shallow_color : source_color = vec4(0.115, 0.54, 0.56, 0.18);
uniform vec4 mid_color : source_color = vec4(0.042, 0.29, 0.37, 0.74);
uniform vec4 deep_color : source_color = vec4(0.018, 0.125, 0.21, 0.96);
uniform vec4 foam_color : source_color = vec4(0.86, 0.90, 0.92, 0.92);
uniform float water_depth_range = 4.2;
uniform float foam_range = 0.76;
uniform float wave_speed = 0.042;
uniform float wave_scale = 0.095;
uniform float wave_amp = 0.095;
uniform float alpha_scale = 1.0;
uniform float storm_factor = 0.0;

varying vec3 world_pos;
varying float wave_crest;

void vertex() {
	world_pos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	wave_crest = 0.0;
	if (wave_amp > 0.001) {
		float spd = mix(1.0, 1.75, storm_factor);
		float w1 = sin(world_pos.x * 0.24 + world_pos.z * 0.19 + TIME * 1.15 * spd);
		float w2 = cos(world_pos.x * 0.17 - world_pos.z * 0.31 + TIME * 0.92 * spd);
		float w3 = sin((world_pos.x - world_pos.z) * 0.42 + TIME * 1.65 * spd);
		float h = (w1 * 0.48 + w2 * 0.34 + w3 * 0.18) * wave_amp;
		VERTEX.y += h;
		wave_crest = clamp((w1 + w2 + w3) * 0.33 + 0.5, 0.0, 1.0);
	}
}

void fragment() {
	float raw_depth = texture(depth_tex, SCREEN_UV).x;
	vec3 ndc = vec3(SCREEN_UV * 2.0 - 1.0, raw_depth);
	vec4 view_p = INV_PROJECTION_MATRIX * vec4(ndc, 1.0);
	view_p.xyz /= view_p.w;
	vec4 world_behind = INV_VIEW_MATRIX * vec4(view_p.xyz, 1.0);
	float v_depth = max(0.0, world_pos.y - world_behind.y);
	float ray_depth = max(0.0, VERTEX.z - view_p.z);
	float water_depth = mix(v_depth, ray_depth * 0.48, 0.22);
	if (raw_depth < 0.0001) {
		water_depth = water_depth_range;
	}

	vec2 uv1 = world_pos.xz * wave_scale + vec2(TIME * wave_speed, TIME * wave_speed * 0.58);
	vec2 r_xz = vec2(0.80 * world_pos.x - 0.60 * world_pos.z, 0.60 * world_pos.x + 0.80 * world_pos.z);
	vec2 uv2 = r_xz * (wave_scale * 1.55) + vec2(-TIME * wave_speed * 0.78, TIME * wave_speed * 0.88);
	vec2 uv3 = world_pos.xz * (wave_scale * 2.65) + vec2(TIME * wave_speed * 1.25, -TIME * wave_speed * 0.94);
	vec3 n1 = texture(normal_tex, uv1).xyz * 2.0 - 1.0;
	vec3 n2 = texture(normal_tex, uv2).xyz * 2.0 - 1.0;
	vec3 n3 = texture(normal_tex, uv3).xyz * 2.0 - 1.0;
	float ch1 = cos(world_pos.x * 1.25 + world_pos.z * 0.92 + TIME * 1.55);
	float ch2 = cos(r_xz.x * 1.95 - r_xz.y * 1.55 - TIME * 1.35);
	float chop = mix(1.0, 1.55, storm_factor);
	vec3 n_mix = normalize(vec3((n1.xy + n2.xy + n3.xy * 0.45) * 0.28 * chop + vec2(ch1 * 0.095 + ch2 * 0.070, ch1 * 0.070 - ch2 * 0.080) * chop, 1.0));
	NORMAL_MAP = vec3(n_mix.x * 0.5 + 0.5, n_mix.y * 0.5 + 0.5, 1.0);
	NORMAL_MAP_DEPTH = mix(0.52, 0.82, storm_factor);

	float ndotv = clamp(dot(normalize(NORMAL), normalize(VIEW)), 0.0, 1.0);
	float fresnel = pow(1.0 - ndotv, 3.2);

	// Espuma orgánica quebrada no uniforme + crestas blancas en mar agitado
	float lacy_a = clamp(0.5 + (n1.x - n2.y) * 0.74 + ch1 * 0.18, 0.0, 1.0);
	float lacy_b = clamp(0.5 + (n1.y + n2.x + n3.x * 0.5) * 0.68 - ch2 * 0.16, 0.0, 1.0);
	float lacy_lace = clamp(lacy_a * 0.58 + lacy_b * 0.42, 0.0, 1.0);
	float patch_var = clamp(0.5 + 0.5 * sin(world_pos.x * 0.47 - world_pos.z * 0.34 + n1.x * 2.6) * cos(world_pos.x * 0.29 + world_pos.z * 0.53), 0.0, 1.0);
	float local_foam_range = foam_range * (0.45 + 0.90 * patch_var);

	float surf_line = sin(water_depth * 10.5 - TIME * (1.55 + storm_factor * 1.2) + lacy_a * 4.8) * 0.5 + 0.5;
	float shore_band = (1.0 - smoothstep(0.015, local_foam_range, water_depth));
	float rock_break = smoothstep(0.24, 0.74, lacy_a * 0.7 + patch_var * 0.3);
	float shore_foam = smoothstep(0.30, 0.66, shore_band * rock_break * (0.44 + 0.56 * surf_line) * (0.38 + 1.25 * lacy_lace));
	float ripple_band = exp(-pow((water_depth - (0.42 + 0.18 * patch_var)) * 4.6, 2.0)) * smoothstep(0.50, 0.86, lacy_lace * 0.68 + surf_line * 0.32) * 0.44;
	float whitecap = smoothstep(mix(0.84, 0.66, storm_factor), 0.96, lacy_lace * 0.48 + wave_crest * 0.52) * smoothstep(0.35, 1.6, water_depth) * mix(0.18, 0.62, storm_factor);
	float foam_mask = clamp(shore_foam + ripple_band + whitecap, 0.0, 1.0);

	// 3 bandas cromáticas nítidas moduladas por tormenta
	float t_mid = smoothstep(0.08, 1.05, water_depth);
	float t_deep = smoothstep(1.10, water_depth_range, water_depth);
	vec3 water_tint = mix(shallow_color.rgb, mid_color.rgb, t_mid);
	water_tint = mix(water_tint, deep_color.rgb, t_deep);
	water_tint = mix(water_tint, water_tint * vec3(0.56, 0.64, 0.72), storm_factor * 0.75);

	// Cáusticas animadas más ricas en agua somera sobre arena y piedras sumergidas
	float caustic_a = smoothstep(0.68, 0.96, 0.5 + 0.5 * (n1.x * n2.y - n1.y * n2.x));
	float caustic_b = smoothstep(0.72, 0.98, 0.5 + 0.5 * (n2.x * n3.y + n3.x * n1.y));
	float caustic = (caustic_a * 0.65 + caustic_b * 0.45) * (1.0 - smoothstep(0.25, 1.85, water_depth)) * mix(0.22, 0.06, storm_factor);
	water_tint += vec3(0.09, 0.21, 0.20) * caustic;

	vec3 sky_refl = mix(vec3(0.18, 0.34, 0.44), vec3(0.42, 0.54, 0.64), fresnel);
	sky_refl = mix(sky_refl, vec3(0.16, 0.22, 0.28), storm_factor * 0.72);
	vec3 water_col = mix(water_tint, sky_refl, fresnel * mix(0.22, 0.34, storm_factor));

	ALBEDO = mix(water_col, foam_color.rgb, foam_mask * 0.82);
	float base_alpha = mix(shallow_color.a, mid_color.a, smoothstep(0.06, 0.92, water_depth));
	base_alpha = mix(base_alpha, deep_color.a, smoothstep(1.05, water_depth_range, water_depth));
	ALPHA = clamp(base_alpha + foam_mask * 0.44, 0.14, 0.97) * alpha_scale;
	ROUGHNESS = mix(0.32, 0.78, foam_mask);
	METALLIC = 0.0;
	SPECULAR = 0.14;
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

	mat_foliage_pine = _make_mat(Color("#2b452c"), 0.86, 0.0)
	mat_foliage_pine.backlight_enabled = true
	mat_foliage_pine.backlight = Color(0.08, 0.14, 0.06)
	mat_foliage_olive = _make_mat(Color("#4c613b"), 0.84, 0.0)
	mat_foliage_olive.backlight_enabled = true
	mat_foliage_olive.backlight = Color(0.10, 0.16, 0.07)

	mat_flame = StandardMaterial3D.new()
	mat_flame.albedo_color = Color(1.0, 0.62, 0.18)
	mat_flame.emission_enabled = true
	mat_flame.emission = Color(1.0, 0.48, 0.10)
	mat_flame.emission_energy_multiplier = 2.8

	mat_cloth_blue = _make_textured_mat(Color("#4f6982"), 0.92, 0.0, tex_wool, 0.65, true)
	mat_cloth_warm = _make_textured_mat(Color("#a46452"), 0.92, 0.0, tex_linen, 0.65, true)
	mat_books = _make_mat(Color("#7a3c2e"), 0.85, 0.05)
	mat_iron = _make_mat(Color("#3b4144"), 0.45, 0.75)

	# Materiales específicos para mallas importadas de Babylon (.glb)
	# Conservan vertex_color_use_as_albedo para mostrar AO/musgo/desgaste originales.
	_mat_rock_glb = _make_glb_mat(Color("#acb7b0"), 0.86, 0.0, tex_basalt if tex_basalt else tex_cliff, 0.14, norm_rock, true, 0.68)
	_mat_carved_glb = _make_glb_mat(Color("#b9c0b7"), 0.82, 0.0, tex_coastal_rock if tex_coastal_rock else tex_basalt, 0.18, norm_rock, true, 0.65)
	_mat_paving_glb = _make_glb_mat(Color("#d4cdbe"), 0.82, 0.0, tex_plaza if tex_plaza else tex_ashlar, 0.28, norm_rock, true, 0.50)
	_mat_earth_glb = _make_glb_mat(Color("#beb99c"), 0.90, 0.0, tex_earth, 0.26, null, true)
	_mat_forest_earth_glb = _make_glb_mat(Color("#4d633b"), 0.90, 0.0, tex_earth, 0.22, null, true)
	_mat_forest_earth_glb.backlight_enabled = true
	_mat_forest_earth_glb.backlight = Color(0.08, 0.13, 0.05)
	_mat_wood_glb = _make_glb_mat(Color("#c6a074"), 0.76, 0.0, tex_oak, 0.52, norm_wood, true, 0.55)
	_mat_dark_wood_glb = _make_glb_mat(Color("#8c6a48"), 0.80, 0.0, tex_oak, 0.52, null, true)
	_mat_limestone_glb = _make_glb_mat(Color("#bbb49f"), 0.80, 0.0, tex_limestone, 0.36, norm_rock, true, 0.48)
	_mat_sculpture_glb = _make_glb_mat(Color("#d2cab6"), 0.78, 0.04, tex_limestone, 0.28, norm_rock, true, 0.45)
	_mat_astalagan_glb = _make_glb_mat(Color("#ccc6b8"), 0.52, 0.24, tex_limestone, 0.28, norm_rock, true, 0.58)
	_mat_metal_glb = _make_glb_mat(Color("#545a5c"), 0.46, 0.72, null, 1.0, null, true)
	_mat_brass_glb = _make_glb_mat(Color("#be8842"), 0.32, 0.72, null, 1.0, null, true)
	_mat_pottery_glb = _make_glb_mat(Color("#b66d4b"), 0.78, 0.0, null, 1.0, null, true)
	_mat_linen_glb = _make_glb_mat(Color("#eadcc7"), 0.90, 0.0, tex_linen, 0.65, null, true, 0.50, true)
	_mat_blue_cloth_glb = _make_glb_mat(Color("#6886a0"), 0.90, 0.0, tex_linen, 0.65, null, true, 0.50, true)
	_mat_red_cloth_glb = _make_glb_mat(Color("#b66959"), 0.90, 0.0, tex_wool, 0.65, null, true, 0.50, true)
	_mat_flower_glb = _make_glb_mat(Color("#e8cf72"), 0.78, 0.0, null, 1.0, null, true)
	_mat_herb_glb = _make_glb_mat(Color("#4a6439"), 0.86, 0.0, null, 1.0, null, true)
	_mat_herb_glb.backlight_enabled = true
	_mat_herb_glb.backlight = Color(0.09, 0.14, 0.06)
	_mat_foliage_v6_glb = _make_foliage_cutout_mat(Color("#748a5c"), tex_foliage)
	_mat_foliage_sage_glb = _make_foliage_cutout_mat(Color("#697f59"), tex_foliage)
	_mat_foliage_dark_glb = _make_foliage_cutout_mat(Color("#425937"), tex_foliage)
	_mat_foliage_flower_glb = _make_foliage_cutout_mat(Color("#e8d69a"), tex_foliage)

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
	if has_node("Surfaces") or _prebuild_finished:
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
	_build_a1_ambient_fauna_and_sound()
	_build_landmarks()
	_build_scenic_transition_paths()
	_finalize_lights()
	_prebuild_finished = true

func _finalize_lights() -> void:
	_build_interior_contact_ao()
	_collect_flame_nodes_recursive(self)
	_optimize_scene_lights(self)
	# Mantener luces interiores suaves de caverna separadas de las llamas nocturnas
	for fire_light in _flame_lights:
		var fl: Light3D = fire_light.get("light")
		if is_instance_valid(fl):
			fl.visible = (_time_of_day in ["night", "dusk"])

func build_layout_async(tree: SceneTree, progress_cb: Callable = Callable()) -> void:
	if has_node("Surfaces") or _prebuild_finished:
		return
	OcclusionCtrl.clear_registry()
	_init_materials()
	if progress_cb.is_valid(): progress_cb.call(0.10)
	await tree.process_frame
	var global_data: Dictionary = _load_json_dict(GLOBAL_LAYOUT_JSON_PATH)
	var terrain_data: Dictionary = _load_json_dict(TERRAIN_JSON_PATH)
	_build_ocean()
	_build_surfaces(terrain_data)
	_build_safety_colliders()
	_build_coastal_pier_and_beach()
	if progress_cb.is_valid(): progress_cb.call(0.16)
	await tree.process_frame
	_build_a1_cells()
	_build_a1_plaza_details()
	_build_a2_winch_house(global_data)
	_build_a3_dining_hall(global_data)
	_build_a4_library(global_data)
	_build_a5_temple(global_data)
	_build_staircases()
	if progress_cb.is_valid(): progress_cb.call(0.25)
	await tree.process_frame

	var geo_root := Node3D.new()
	geo_root.name = "BabylonGeography"
	add_child(geo_root)
	await _load_glb_bundle_async(GLB_GEO_PATH, geo_root, {}, tree)
	if progress_cb.is_valid(): progress_cb.call(0.45)
	await tree.process_frame

	var r3_root := Node3D.new()
	r3_root.name = "BabylonLandscapeR3"
	add_child(r3_root)
	await _load_glb_bundle_async(GLB_R3_PATH, r3_root, {}, tree)
	if progress_cb.is_valid(): progress_cb.call(0.70)
	await tree.process_frame

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
	await _load_glb_bundle_async(GLB_ARCH_PATH, misc_root, zone_targets, tree)
	if progress_cb.is_valid(): progress_cb.call(0.88)
	await tree.process_frame

	SceneEnhancer.build_rooms_and_plaza_furniture(self)
	_cave_roof_entries = SceneEnhancer.build_cave_roofs_and_archways(self)
	_build_lush_planters_and_gardens()
	_build_lush_mountain_forest(terrain_data)
	SceneEnhancer.build_vibrant_grass_and_planters(self, terrain_data)
	_build_a1_ambient_fauna_and_sound()
	_build_landmarks()
	_build_scenic_transition_paths()
	_finalize_lights()
	_prebuild_finished = true
	if progress_cb.is_valid(): progress_cb.call(1.0)

func _optimize_scene_lights(node: Node) -> void:
	if node is OmniLight3D or node is SpotLight3D:
		var l3 := node as Light3D
		var is_hero_shadow := l3.name in [
			"CampfireLight", "DiningLampLight", "KitchenHearthLight",
			"LibraryStudyLight", "TempleSanctuaryLight"
		]
		l3.shadow_enabled = is_hero_shadow
		if is_hero_shadow:
			l3.shadow_bias = 0.08
			l3.shadow_blur = 1.65
		# TacticalCamera ortogonal sitúa global_position a 240m del foco; desactivar distance_fade evita que Godot apague las luces puntuales
		l3.distance_fade_enabled = false
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

# 1. Manto oceánico circundante subdividido para oleaje 3D real a cota 0.0m
func _build_ocean() -> void:
	var ocean_mesh := PlaneMesh.new()
	ocean_mesh.size = Vector2(900.0, 800.0)
	ocean_mesh.subdivide_width = 72
	ocean_mesh.subdivide_depth = 64
	var inst := MeshInstance3D.new()
	inst.name = "OceanPlane"
	inst.mesh = ocean_mesh
	inst.material_override = mat_ocean
	inst.position = Vector3(84.0, Structure.ELEV_SEA, 68.0)
	inst.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(inst)
	_ocean_plane_node = inst

	# Fondo marino con relieve sutil y grano natural bajo aguas medias y profundas
	var seabed_mesh := PlaneMesh.new()
	seabed_mesh.size = Vector2(900.0, 800.0)
	var seabed := MeshInstance3D.new()
	seabed.name = "SeabedPlane"
	seabed.mesh = seabed_mesh
	var tex_seabed := _load_tex("basalt-coastal-albedo-v1.webp")
	if not tex_seabed:
		tex_seabed = _load_tex("earth.webp")
	seabed.material_override = _make_textured_mat(Color("#15353c"), 0.96, 0.0, tex_seabed, 0.08, false)
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
		var max_cy := maxf(maxf(float(c[0]), float(c[1])), maxf(float(c[2]), float(c[3])))
		var is_sw_cove_override := (
			(node_name == "Surface_Beach" and ((col <= 21 and row >= 66) or (col >= 22 and row >= 68 and max_cy < 0.06)))
			or (node_name in ["Surface_PleamarTrail", "Surface_IslandPleamarLow"] and col <= 11 and row >= 55)
		)
		var is_obs_flicker_override := (
			(node_name == "Surface_UpperWalkway" and col >= 89 and row <= 42)
			or (node_name == "Surface_ObservatoryTrail" and col >= 92 and col <= 95 and row >= 32 and row <= 43)
			or (node_name == "Surface_IslandPleamarHigh" and ((col >= 34 and col <= 35 and row >= 32 and row <= 42) or (col >= 9 and col <= 34 and row >= 28 and row <= 30)))
		)
		var tile_offset := -4.2 if is_sw_cove_override else (-0.28 if is_obs_flicker_override else (-0.18 if (node_name == "Surface_PleamarTrail" and row >= 55) else skin_offset))
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
	if node_name in ["Surface_IslandPleamarLow", "Surface_IslandPleamarHigh", "Surface_Cliff"]:
		inst.transparency = 1.0
		inst.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parent.add_child(inst)
	if not (node_name in ["Surface_Beach", "Surface_A5_TemplePlatform", "Surface_A2_WinchDeck"]):
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

func _create_catenary_rope(parent: Node3D, node_name: String, a: Vector3, b: Vector3, sag: float, radius: float, segs: int, mat: Material) -> void:
	var n_segs := maxi(2, segs)
	var pts: Array[Vector3] = []
	for i in range(n_segs + 1):
		var t := float(i) / float(n_segs)
		var p := a.lerp(b, t)
		p.y -= 4.0 * sag * t * (1.0 - t)
		pts.append(p)
	for i in range(n_segs):
		var p0 := pts[i]
		var p1 := pts[i + 1]
		var seg_vec := p1 - p0
		var seg_len := seg_vec.length()
		if seg_len < 0.01:
			continue
		var seg := _create_cylinder(parent, "%s_%d" % [node_name, i], (p0 + p1) * 0.5, radius, seg_len + radius * 0.6, mat)
		var dir := seg_vec / seg_len
		var ref_up := Vector3.FORWARD if absf(dir.y) > 0.92 else Vector3.UP
		seg.look_at_from_position((p0 + p1) * 0.5, (p0 + p1) * 0.5 + ref_up, dir)
		seg.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF

func _build_canonical_large_rowboat(parent: Node3D, boat_pos: Vector3, yaw_rad: float, mat_hull: Material, mat_inner: Material, mat_trim: Material, mat_iron_m: Material, mat_rope: Material) -> Node3D:
	# Gran bote de remos canónico (~4.60 m eslora x ~1.68 m manga): casco hueco con cuadernas, bancadas y remos
	var boat_root := Node3D.new()
	boat_root.name = "CoastalRowboat"
	boat_root.position = boat_pos
	boat_root.rotation.y = yaw_rad
	parent.add_child(boat_root)

	var bob_pivot := Node3D.new()
	bob_pivot.name = "BoatBobPivot"
	boat_root.add_child(bob_pivot)
	_boat_bob_node = bob_pivot
	_boat_base_pos = Vector3.ZERO
	_boat_base_rot = Vector3.ZERO

	var half_len := 2.30
	var max_half_beam := 0.84
	var wall_thick := 0.065
	var n_len := 14
	var n_half_prof := 5

	var outer_rings: Array = []
	var inner_rings: Array = []
	for ix in range(n_len + 1):
		var u := lerpf(-1.0, 1.0, float(ix) / float(n_len)) # -1 = popa, +1 = proa
		var lx := u * half_len
		# Manga redondeada al centro, espejo estrecho en popa (0.34) y proa afilada (0.04)
		var beam_env: float
		if u >= 0.0:
			beam_env = maxf(0.04, pow(cos(u * PI * 0.5), 0.78))
		else:
			beam_env = maxf(0.32, pow(cos(u * PI * 0.38), 0.85))
		var hb := max_half_beam * beam_env
		var sheer_y := 0.56 + 0.14 * pow(maxf(0.0, u), 1.8) + 0.08 * pow(maxf(0.0, -u), 1.8)
		var keel_y := -0.14 + 0.06 * pow(absf(u), 2.4)

		var o_pts: Array[Vector3] = []
		var o_cols: Array[Color] = []
		var i_pts: Array[Vector3] = []
		var i_cols: Array[Color] = []
		for side in range(-n_half_prof, n_half_prof + 1):
			var s_sign := signf(float(side))
			var v := absf(float(side)) / float(n_half_prof) # 0 = quilla, 1 = regala
			var flare := pow(v, 0.62)
			var y_frac := pow(v, 1.38)
			var py := lerpf(keel_y, sheer_y, y_frac)
			var pz := s_sign * hb * flare
			var plank_step := 0.015 if (int(v * 4.0) % 2 == 1 and v > 0.15 and v < 0.96) else 0.0
			var pz_out := pz + s_sign * plank_step
			o_pts.append(Vector3(lx, py, pz_out))
			var c_out := Color("#544335").lerp(Color("#a88b6d"), smoothstep(0.18, 0.88, v))
			o_cols.append(c_out)

			var in_pz := s_sign * maxf(0.0, absf(pz) - wall_thick * (0.45 + 0.55 * v))
			var in_py := py + (wall_thick * 0.85 if v < 0.92 else 0.0)
			i_pts.append(Vector3(clampf(lx, -half_len + wall_thick * 1.4, half_len - wall_thick * 1.6), minf(sheer_y - 0.01, in_py), in_pz))
			var c_in := Color("#624d3b").lerp(Color("#967a5c"), smoothstep(0.2, 0.95, v))
			i_cols.append(c_in)

		outer_rings.append({"pts": o_pts, "cols": o_cols, "x": lx})
		inner_rings.append({"pts": i_pts, "cols": i_cols, "x": lx})

	var st_hull := SurfaceTool.new()
	st_hull.begin(Mesh.PRIMITIVE_TRIANGLES)
	st_hull.set_smooth_group(-1)
	var prof_cnt := n_half_prof * 2
	for ix in range(n_len):
		var oa: Array = outer_rings[ix]["pts"]
		var ob: Array = outer_rings[ix + 1]["pts"]
		var oca: Array = outer_rings[ix]["cols"]
		var ocb: Array = outer_rings[ix + 1]["cols"]
		var ia: Array = inner_rings[ix]["pts"]
		var ib: Array = inner_rings[ix + 1]["pts"]
		var ica: Array = inner_rings[ix]["cols"]
		var icb: Array = inner_rings[ix + 1]["cols"]
		for j in range(prof_cnt):
			# Casco exterior (babor j=0 -> quilla -> estribor j=prof_cnt) con normales hacia fuera
			_emit_quad_st(
				st_hull,
				oa[j], ob[j], ob[j + 1], oa[j + 1],
				oca[j], ocb[j], ocb[j + 1], oca[j + 1],
				Vector2(float(ix) * 0.25, float(j) * 0.12),
				Vector2(float(ix + 1) * 0.25, float(j) * 0.12),
				Vector2(float(ix + 1) * 0.25, float(j + 1) * 0.12),
				Vector2(float(ix) * 0.25, float(j + 1) * 0.12)
			)
			# Forro interior del casco con normales hacia el hueco del bote
			_emit_quad_st(
				st_hull,
				ia[j], ia[j + 1], ib[j + 1], ib[j],
				ica[j], ica[j + 1], icb[j + 1], icb[j],
				Vector2(float(ix) * 0.25, float(j) * 0.12),
				Vector2(float(ix) * 0.25, float(j + 1) * 0.12),
				Vector2(float(ix + 1) * 0.25, float(j + 1) * 0.12),
				Vector2(float(ix + 1) * 0.25, float(j) * 0.12)
			)
		# Borde superior de regala (babor y estribor) uniendo casco exterior e interior
		_emit_quad_st(
			st_hull,
			oa[0], ia[0], ib[0], ob[0],
			oca[0], ica[0], icb[0], ocb[0],
			Vector2(float(ix) * 0.25, 0.0), Vector2(float(ix) * 0.25, 0.1),
			Vector2(float(ix + 1) * 0.25, 0.1), Vector2(float(ix + 1) * 0.25, 0.0)
		)
		_emit_quad_st(
			st_hull,
			ia[prof_cnt], oa[prof_cnt], ob[prof_cnt], ib[prof_cnt],
			ica[prof_cnt], oca[prof_cnt], ocb[prof_cnt], icb[prof_cnt],
			Vector2(float(ix) * 0.25, 0.0), Vector2(float(ix) * 0.25, 0.1),
			Vector2(float(ix + 1) * 0.25, 0.1), Vector2(float(ix + 1) * 0.25, 0.0)
		)

	# Espejo de popa macizo (ix = 0) cerrando el casco en la parte trasera
	var t_out: Array = outer_rings[0]["pts"]
	var t_in: Array = inner_rings[0]["pts"]
	for j in range(prof_cnt):
		var kc := Color("#6a533f")
		_emit_quad_st(
			st_hull,
			t_out[j], t_out[j + 1], t_in[j + 1], t_in[j],
			kc, kc, kc.lightened(0.08), kc.lightened(0.08),
			Vector2(0, 0), Vector2(0.2, 0), Vector2(0.2, 0.2), Vector2(0, 0.2)
		)

	st_hull.generate_normals()
	var hull_inst := MeshInstance3D.new()
	hull_inst.name = "BoatHullMesh"
	hull_inst.mesh = st_hull.commit()
	hull_inst.material_override = mat_hull
	hull_inst.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	bob_pivot.add_child(hull_inst)

	# Quilla exterior, roda de proa y tablazón de fondo interior
	_create_box_prop(bob_pivot, "BoatKeelBeam", Vector3(0.0, -0.15, 0.0), Vector3(half_len * 1.94, 0.08, 0.10), mat_trim)
	var stem := _create_box_prop(bob_pivot, "BoatBowStempost", Vector3(half_len - 0.02, 0.34, 0.0), Vector3(0.10, 0.72, 0.10), mat_trim)
	stem.rotation.z = -0.26
	for fb_v in [-0.14, 0.0, 0.14]:
		var fb_z := float(fb_v)
		_create_box_prop(bob_pivot, "BoatFloorboard_%d" % int((fb_z + 0.2) * 10), Vector3(-0.08, -0.02, fb_z), Vector3(3.15, 0.035, 0.12), mat_inner)

	# Cuadernas transversales interiores
	for r_i in range(6):
		var rx := lerpf(-1.55, 1.45, float(r_i) / 5.0)
		var rib_w := max_half_beam * cos((rx / half_len) * 1.08) * 1.42
		_create_box_prop(bob_pivot, "BoatFloorRib_%d" % r_i, Vector3(rx, -0.04, 0.0), Vector3(0.06, 0.06, rib_w), mat_trim)

	# Tres bancadas robustas de boga + banco de popa + triángulo de proa para 4-6 viajeros
	for th_v in [-1.05, 0.0, 0.95]:
		var th_x := float(th_v)
		var th_span := max_half_beam * cos((th_x / half_len) * 1.05) * 1.82
		_create_box_prop(bob_pivot, "BoatThwart_%d" % int((th_x + 2.0) * 10), Vector3(th_x, 0.38, 0.0), Vector3(0.32, 0.055, th_span), mat_hull)
	_create_box_prop(bob_pivot, "BoatSternSeat", Vector3(-1.95, 0.40, 0.0), Vector3(0.42, 0.055, 0.76), mat_hull)
	_create_box_prop(bob_pivot, "BoatBowDeck", Vector3(1.85, 0.44, 0.0), Vector3(0.45, 0.05, 0.54), mat_hull)

	# Toletes de hierro en la regala y dos remos largos listos sobre las bancadas
	for ox_v in [-0.35, 0.55]:
		var ox := float(ox_v)
		for oz_v in [-1.0, 1.0]:
			var oz := float(oz_v)
			var z_pos: float = oz * max_half_beam * cos((ox / half_len) * 1.05) * 0.94
			_create_cylinder(bob_pivot, "BoatOarlock_%d_%s" % [int((ox + 1.0) * 10), "S" if oz > 0.0 else "P"], Vector3(ox, 0.62, z_pos), 0.022, 0.14, mat_iron_m)
	for oar_idx in range(2):
		var o_sign := -1.0 if oar_idx == 0 else 1.0
		var oar_grp := Node3D.new()
		oar_grp.name = "BoatOar_%d" % oar_idx
		oar_grp.position = Vector3(-0.15 + float(oar_idx) * 0.18, 0.44, o_sign * 0.24)
		oar_grp.rotation = Vector3(0.0, 0.08 * o_sign, 0.04)
		bob_pivot.add_child(oar_grp)
		var loom := _create_cylinder(oar_grp, "OarShaft", Vector3.ZERO, 0.025, 2.75, mat_trim)
		loom.rotation.z = PI * 0.5
		_create_box_prop(oar_grp, "OarBlade", Vector3(-1.12, 0.0, 0.0), Vector3(0.72, 0.024, 0.14), mat_hull)

	# Sombra ovalada de contacto del casco sobre la lámina de agua (evita que el bote flote)
	var hull_ao := MeshInstance3D.new()
	hull_ao.name = "BoatWaterContactAO"
	var ao_q := PlaneMesh.new()
	ao_q.size = Vector2(5.10, 2.10)
	hull_ao.mesh = ao_q
	hull_ao.position = Vector3(0.0, -0.095, 0.0)
	hull_ao.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	var ao_shader := Shader.new()
	ao_shader.code = """
shader_type spatial;
render_mode blend_mix, depth_draw_never, unshaded, cull_disabled;
void fragment() {
	vec2 p = (UV - vec2(0.5)) * vec2(2.0, 2.0);
	float d = length(vec2(p.x * 0.92, p.y * 1.15));
	float m = 1.0 - smoothstep(0.32, 0.98, d);
	ALBEDO = vec3(0.012, 0.035, 0.048);
	ALPHA = m * 0.62;
}
"""
	var ao_mat := ShaderMaterial.new()
	ao_mat.shader = ao_shader
	hull_ao.material_override = ao_mat
	boat_root.add_child(hull_ao)

	# Colisión estática sólida alrededor del casco (evita que los jugadores atraviesen el bote)
	SceneEnhancer.add_box_collider(boat_root, Vector3(0.0, 0.30, 0.0), Vector3(4.35, 0.85, 1.56), 0.0)
	_create_cylinder(bob_pivot, "BoatMooringCleatBow", Vector3(half_len - 0.18, 0.66, 0.0), 0.035, 0.14, mat_iron_m)
	_create_cylinder(bob_pivot, "BoatMooringCleatStern", Vector3(-half_len + 0.16, 0.60, -0.18), 0.035, 0.14, mat_iron_m)
	for child in bob_pivot.get_children():
		if child is MeshInstance3D and not ("Hull" in child.name):
			(child as MeshInstance3D).cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		elif child.name.begins_with("BoatOar_"):
			for oc in child.get_children():
				if oc is MeshInstance3D:
					(oc as MeshInstance3D).cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	return boat_root

# 2B. Embarcadero artesanal desvencijado Z1, gran bote de remos amarrado y elementos marítimos
func _build_coastal_pier_and_beach() -> void:
	var pier_node := Node3D.new()
	pier_node.name = "Z1_Rowboat_Pier"
	add_child(pier_node)

	var tex_oak_p := _load_tex("oak-v4.webp")
	var tex_linen_p := _load_tex("linen-v4.webp")
	var norm_wood_p := _load_tex("wood-normal-v1.png")
	var mat_pier_a := _make_textured_mat(Color("#8c7760"), 0.86, 0.0, tex_oak_p, 0.48, true, norm_wood_p, 0.65)
	var mat_pier_b := _make_textured_mat(Color("#73614e"), 0.88, 0.0, tex_oak_p, 0.48, true, norm_wood_p, 0.68)
	var mat_pier_wet := _make_textured_mat(Color("#544638"), 0.90, 0.0, tex_oak_p, 0.48, true, norm_wood_p, 0.72)
	var mat_boat_hull := _make_textured_mat(Color.WHITE, 0.82, 0.0, tex_oak_p, 0.55, true, norm_wood_p, 0.62)
	mat_boat_hull.vertex_color_use_as_albedo = true
	mat_boat_hull.vertex_color_is_srgb = true
	mat_boat_hull.cull_mode = BaseMaterial3D.CULL_DISABLED
	var mat_hemp := _make_textured_mat(Color("#a78a5d"), 0.90, 0.0, tex_linen_p if tex_linen_p else tex_oak_p, 0.65, true, norm_wood_p, 0.45)

	var pier_rng := RandomNumberGenerator.new()
	pier_rng.seed = 20261118

	var wharf := Node3D.new()
	wharf.name = "RicketyWoodenPier"
	pier_node.add_child(wharf)

	# Troncos durmientes asentados en la grava de la orilla (z=110.2) y vigas portantes bajo la cubierta
	for sz_v in [110.15, 110.55]:
		var sz_shore := float(sz_v)
		var sill := _create_box_prop(wharf, "PierShoreSill_%.2f" % sz_shore, Vector3(21.7, 0.41, sz_shore), Vector3(6.8, 0.16, 0.22), mat_pier_wet)
		sill.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	for sx_v in [18.9, 21.7, 24.5]:
		var sx := float(sx_v)
		var joist := _create_box_prop(wharf, "PierStringer_%.1f" % sx, Vector3(sx, 0.34, 112.2), Vector3(0.18, 0.20, 4.15), mat_pier_wet)
		joist.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	for cz_v in [111.2, 112.7, 114.0]:
		var cz := float(cz_v)
		_create_box_prop(wharf, "PierCrossBeam_%.1f" % cz, Vector3(21.7, 0.23, cz), Vector3(6.6, 0.18, 0.20), mat_pier_wet)

	# Tablones envejecidos e irregulares (ligera torsión, grietas entre tablas y variación de longitud)
	var plank_count := 16
	for pi in range(plank_count):
		var px := lerpf(18.62, 24.78, float(pi) / float(plank_count - 1))
		var p_len := 3.92 + pier_rng.randf_range(-0.14, 0.16)
		var p_z := 112.18 + pier_rng.randf_range(-0.08, 0.08)
		var p_y := 0.495 + pier_rng.randf_range(-0.011, 0.011)
		var p_mat := mat_pier_a if pi % 3 == 0 else (mat_pier_b if pi % 3 == 1 else mat_pier_wet)
		var plank := _create_box_prop(wharf, "PierAgedPlank_%d" % pi, Vector3(px, p_y, p_z), Vector3(0.36, 0.065, p_len), p_mat)
		plank.rotation = Vector3(pier_rng.randf_range(-0.015, 0.015), pier_rng.randf_range(-0.022, 0.022), pier_rng.randf_range(-0.016, 0.016))
		plank.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	# Acceso desde la playa (umbral con durmientes y postes bajos que delimitan la entrada al muelle)
	for ax_i in range(4):
		var ax := lerpf(19.8, 23.6, float(ax_i) / 3.0)
		var app_sl := _create_box_prop(wharf, "PierAccessSleeper_%d" % ax_i, Vector3(ax, 0.488, 109.96 + sin(float(ax_i)) * 0.04), Vector3(0.88, 0.045, 0.34), mat_pier_wet)
		app_sl.rotation.y = pier_rng.randf_range(-0.04, 0.04)
		app_sl.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	for st_side_x in [18.65, 24.85]:
		var stile := _create_cylinder(wharf, "PierAccessStile_%.1f" % st_side_x, Vector3(st_side_x, 0.82, 110.22), 0.11, 1.15, mat_pier_wet)
		stile.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		_create_cylinder(wharf, "PierAccessStileCap_%.1f" % st_side_x, Vector3(st_side_x, 1.40, 110.22), 0.125, 0.07, mat_iron)

	# Pasillo central de desgaste hacia el embarque + reborde de amarre al sur y oeste
	for ri in range(6):
		var r_z := lerpf(110.55, 113.75, float(ri) / 5.0)
		var runner := _create_box_prop(wharf, "PierWearRunner_%d" % ri, Vector3(22.15 + sin(float(ri) * 1.1) * 0.08, 0.532, r_z), Vector3(2.35, 0.018, 0.42), mat_pier_a)
		runner.rotation.y = pier_rng.randf_range(-0.018, 0.018)
	var rub_rail := _create_box_prop(wharf, "PierMooringRubRailW", Vector3(18.66, 0.555, 112.15), Vector3(0.14, 0.07, 3.85), mat_pier_wet)
	rub_rail.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	# Traviesa frontal de borde irregular en el frente sur
	_create_box_prop(wharf, "PierFrontTrimBeam", Vector3(21.65, 0.44, 114.18), Vector3(6.45, 0.12, 0.14), mat_pier_wet)

	# Prolongación frontal sutil de embarque (peldaño bajo frente al bote, y=0.33)
	for sb_i in range(7):
		var sbx := lerpf(21.10, 24.55, float(sb_i) / 6.0)
		var sbp := _create_box_prop(wharf, "PierEmbarkStepPlank_%d" % sb_i, Vector3(sbx, 0.345 + pier_rng.randf_range(-0.006, 0.006), 114.42 + pier_rng.randf_range(-0.02, 0.02)), Vector3(0.46, 0.055, 0.48), mat_pier_wet if sb_i % 2 == 0 else mat_pier_b)
		sbp.rotation.y = pier_rng.randf_range(-0.02, 0.02)
		sbp.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	_create_box_prop(wharf, "PierEmbarkStringer", Vector3(22.82, 0.27, 114.45), Vector3(3.65, 0.11, 0.22), mat_pier_wet)
	SceneEnhancer.add_box_collider(wharf, Vector3(22.82, 0.04, 114.42), Vector3(3.65, 0.58, 0.44))

	# Enlace lateral estrecho y ligeramente inclinado entre el muelle y el arranque empedrado de las escaleras Z2
	for ei in range(6):
		var ex := lerpf(25.15, 27.35, float(ei) / 5.0)
		var ey := lerpf(0.46, 0.33, float(ei) / 5.0) + pier_rng.randf_range(-0.008, 0.008)
		var ep := _create_box_prop(wharf, "PierEastLinkPlank_%d" % ei, Vector3(ex, ey, 111.15 + pier_rng.randf_range(-0.05, 0.05)), Vector3(0.38, 0.06, 1.85), mat_pier_b if ei % 2 == 0 else mat_pier_a)
		ep.rotation = Vector3(0.0, pier_rng.randf_range(-0.02, 0.02), -0.055)
		ep.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	SceneEnhancer.add_box_collider(wharf, Vector3(21.7, 0.22, 112.15), Vector3(6.6, 0.62, 4.1))
	SceneEnhancer.add_box_collider(wharf, Vector3(26.2, 0.14, 111.15), Vector3(2.5, 0.56, 1.9))

	# Pilotes gruesos de roble hincados en el fondo con inclinación natural y riostras diagonales
	var piling_specs := [
		[Vector3(18.65, 0.05, 114.10), 2.85, 0.18, Vector2(0.03, -0.04)],
		[Vector3(20.65, -0.10, 114.18), 2.55, 0.17, Vector2(-0.02, 0.03)],
		[Vector3(22.75, -0.15, 114.12), 2.45, 0.17, Vector2(0.04, 0.02)],
		[Vector3(24.75, -0.02, 114.08), 2.75, 0.18, Vector2(-0.03, -0.03)],
		[Vector3(18.62, -0.82, 112.25), 2.25, 0.16, Vector2(0.02, -0.02)],
		[Vector3(21.70, -0.82, 112.30), 2.25, 0.16, Vector2(-0.02, 0.01)],
		[Vector3(24.80, -0.82, 112.20), 2.25, 0.16, Vector2(0.02, 0.03)],
		[Vector3(18.65, -0.15, 110.35), 2.35, 0.16, Vector2(0.0, -0.02)],
		[Vector3(24.85, -0.15, 110.35), 2.35, 0.16, Vector2(0.0, 0.02)],
		# Dos pilotes exteriores de amarre ("duques de alba") donde queda amarrado el gran bote de remos
		[Vector3(20.45, -0.20, 115.05), 2.40, 0.17, Vector2(-0.04, 0.03)],
		[Vector3(25.15, -0.18, 115.15), 2.42, 0.17, Vector2(0.03, -0.02)],
	]
	for p_spec in piling_specs:
		var p_pos: Vector3 = p_spec[0]
		var p_h: float = float(p_spec[1])
		var p_r: float = float(p_spec[2])
		var p_tilt: Vector2 = p_spec[3]
		var pil := _create_cylinder(wharf, "PierOakPiling", p_pos, p_r, p_h, mat_pier_b)
		pil.rotation = Vector3(p_tilt.x, 0.0, p_tilt.y)
		pil.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		# Collar inferior oscurecido por la humedad y marea
		var wet_collar := _create_cylinder(wharf, "PierPilingWetBand", Vector3(p_pos.x, -0.15, p_pos.z), p_r + 0.015, 0.85, mat_pier_wet)
		wet_collar.rotation = pil.rotation
		wet_collar.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		if p_pos.y + p_h * 0.5 > 0.55:
			SceneEnhancer.add_cyl_collider(wharf, Vector3(p_pos.x, 0.72, p_pos.z), p_r + 0.04, 1.35)

	# Riostras diagonales y travesaños cruzados entre pilotes bajo la cubierta
	for bx_v in [18.85, 21.7, 24.55]:
		var bx := float(bx_v)
		var brace := _create_box_prop(wharf, "PierDiagBrace_%.1f" % bx, Vector3(bx, -0.05, 113.2), Vector3(0.11, 0.12, 2.25), mat_pier_wet)
		brace.rotation.x = 0.42
	for x_span in [[18.65, 20.65], [22.75, 24.75]]:
		var mid_x := (float(x_span[0]) + float(x_span[1])) * 0.5
		var c1 := _create_box_prop(wharf, "PierFrontXBraceA_%.1f" % mid_x, Vector3(mid_x, -0.10, 114.12), Vector3(2.25, 0.09, 0.09), mat_pier_wet)
		c1.rotation.z = 0.34
		var c2 := _create_box_prop(wharf, "PierFrontXBraceB_%.1f" % mid_x, Vector3(mid_x, -0.10, 114.12), Vector3(2.25, 0.09, 0.09), mat_pier_wet)
		c2.rotation.z = -0.34

	# Cuerda gruesa colgando en catenaria entre pilotes frontales (amarre típico del muelle)
	_create_catenary_rope(wharf, "PierFrontRopeW", Vector3(18.65, 1.05, 114.10), Vector3(20.65, 0.92, 114.18), 0.24, 0.030, 8, mat_hemp)
	_create_catenary_rope(wharf, "PierDolphinRope", Vector3(18.65, 0.95, 114.10), Vector3(20.45, 0.78, 115.05), 0.20, 0.028, 7, mat_hemp)

	# Farol colgante rústico en brazo de madera en la esquina oeste del muelle
	var lantern_arm := _create_box_prop(pier_node, "JettyLanternArm", Vector3(18.92, 1.56, 114.10), Vector3(0.58, 0.11, 0.11), mat_pier_wet)
	lantern_arm.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	var lantern_brace := _create_box_prop(pier_node, "JettyLanternBrace", Vector3(18.80, 1.42, 114.10), Vector3(0.36, 0.08, 0.08), mat_pier_wet)
	lantern_brace.rotation.z = 0.72
	var l_anchor := Vector3(19.14, 1.24, 114.10)
	_create_cylinder(pier_node, "JettyLanternCollar", l_anchor - Vector3(0.0, 0.18, 0.0), 0.12, 0.05, mat_iron)
	_create_cylinder(pier_node, "JettyLanternCap", l_anchor + Vector3(0.0, 0.18, 0.0), 0.14, 0.06, mat_bronze)
	_create_cylinder(pier_node, "JettyLanternFinial", l_anchor + Vector3(0.0, 0.25, 0.0), 0.035, 0.09, mat_bronze)
	for cx in [-0.09, 0.09]:
		for cz in [-0.09, 0.09]:
			_create_box_prop(pier_node, "JettyLanternRib", l_anchor + Vector3(cx, 0.0, cz), Vector3(0.022, 0.30, 0.022), mat_iron)
	var lantern := _create_box_prop(pier_node, "JettyLantern", l_anchor, Vector3(0.16, 0.24, 0.16), mat_flame)
	lantern.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	var pier_light := OmniLight3D.new()
	pier_light.name = "JettyLanternLight"
	pier_light.position = l_anchor + Vector3(0.0, 0.10, 0.0)
	pier_light.light_color = Color(1.0, 0.72, 0.34)
	pier_light.light_energy = 1.75
	pier_light.omni_range = 12.0
	pier_node.add_child(pier_light)
	register_flame_fx(lantern, pier_light, false)

	# 2.4 Gran bote de remos canónico amarrado con separación creíble y amarres tensos
	var boat_pos := Vector3(23.0, 0.12, 115.58)
	var boat_yaw := 0.14
	_build_canonical_large_rowboat(pier_node, boat_pos, boat_yaw, mat_boat_hull, mat_pier_wet, mat_pier_b, mat_iron, mat_hemp)
	var bow_world := boat_pos + Basis(Vector3.UP, boat_yaw) * Vector3(2.12, 0.66, 0.0)
	var stern_world := boat_pos + Basis(Vector3.UP, boat_yaw) * Vector3(-2.14, 0.60, -0.18)
	_create_catenary_rope(wharf, "BoatBowMooringLine", Vector3(25.15, 0.85, 115.15), bow_world, 0.07, 0.026, 6, mat_hemp)
	_create_catenary_rope(wharf, "BoatSternMooringLine", Vector3(20.95, 0.86, 113.96), stern_world, 0.09, 0.026, 6, mat_hemp)

	# 2.3 Props curados del muelle: 1 poste de amarre claro, 1 barril con aros, 2 cajas ordenadas, 1 rollo de cuerda y 1 red
	var hero_post := _create_cylinder(wharf, "PierMainMooringPost", Vector3(20.95, 0.78, 113.96), 0.135, 0.76, mat_pier_wet)
	hero_post.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	_create_cylinder(wharf, "PierMainMooringCollar", Vector3(20.95, 1.02, 113.96), 0.145, 0.06, mat_iron)
	for wrap_y in [0.84, 0.89]:
		var wrap_t := MeshInstance3D.new()
		var wt_m := TorusMesh.new()
		wt_m.inner_radius = 0.125
		wt_m.outer_radius = 0.165
		wrap_t.mesh = wt_m
		wrap_t.material_override = mat_hemp
		wrap_t.position = Vector3(20.95, float(wrap_y), 113.96)
		wharf.add_child(wrap_t)
	SceneEnhancer.add_cyl_collider(wharf, Vector3(20.95, 0.78, 113.96), 0.18, 0.90)

	# 1 único barril reforzado con aros de hierro en el lateral oeste (zona de carga despejada)
	var b_pos := Vector3(19.35, 0.80, 112.92)
	var main_barrel := _create_cylinder(wharf, "PierWestBarrel", b_pos, 0.25, 0.62, mat_pier_a)
	main_barrel.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	_create_cylinder(wharf, "PierBarrelHoopTop", b_pos + Vector3(0.0, 0.20, 0.0), 0.258, 0.045, mat_iron)
	_create_cylinder(wharf, "PierBarrelHoopBot", b_pos - Vector3(0.0, 0.20, 0.0), 0.258, 0.045, mat_iron)
	SceneEnhancer.add_cyl_collider(wharf, b_pos, 0.27, 0.72)

	# 2 cajas de carga (1 en margen norte junto al acceso muelle, 1 caja menor junto al borde oeste) sin invadir la vía Z2<->muelle
	var east_crate := _create_box_prop(wharf, "PierEastCrate", Vector3(24.15, 0.62, 107.25), Vector3(0.64, 0.42, 0.52), mat_pier_a)
	east_crate.rotation.y = 0.22
	east_crate.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	_create_box_prop(wharf, "PierEastCrateStrap", Vector3(24.15, 0.835, 107.25), Vector3(0.65, 0.025, 0.10), mat_iron).rotation.y = 0.22
	SceneEnhancer.add_box_collider(wharf, Vector3(24.15, 0.62, 107.25), Vector3(0.66, 0.58, 0.54), 0.22)
	var west_small_box := _create_box_prop(wharf, "PierSmallBox", Vector3(19.22, 0.67, 111.75), Vector3(0.44, 0.34, 0.40), mat_pier_b)
	west_small_box.rotation.y = 0.16
	west_small_box.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	SceneEnhancer.add_box_collider(wharf, Vector3(19.22, 0.67, 111.75), Vector3(0.46, 0.42, 0.42), 0.16)

	# 1 único rollo de cuerda bien formado junto a la zona de embarque
	for coil_layer in [[0.14, 0.29, 0.538], [0.09, 0.21, 0.578]]:
		var rope_ring := MeshInstance3D.new()
		var rt := TorusMesh.new()
		rt.inner_radius = float(coil_layer[0])
		rt.outer_radius = float(coil_layer[1])
		rope_ring.name = "PierMooringRopeCoil"
		rope_ring.mesh = rt
		rope_ring.material_override = mat_hemp
		rope_ring.position = Vector3(23.90, float(coil_layer[2]), 113.72)
		rope_ring.scale = Vector3(1.0, 0.42, 1.0)
		pier_node.add_child(rope_ring)

	# 1 red de pesca anudada colgando desde el pilote sureste con flotadores de corcho
	var net_grp := Node3D.new()
	net_grp.name = "PierDrapedNet"
	wharf.add_child(net_grp)
	for ni in range(7):
		var nx_p := 24.25 + float(ni) * 0.14
		var sag_y := 0.54 - 0.46 * sin((float(ni) / 6.0) * PI * 0.85)
		var strand := _create_box_prop(net_grp, "NetStrandV_%d" % ni, Vector3(nx_p, sag_y, 114.22 + sin(float(ni)) * 0.04), Vector3(0.032, 0.88, 0.025), mat_hemp)
		strand.rotation = Vector3(-0.18, 0.0, sin(float(ni) * 0.9) * 0.12)
		strand.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	for nj in range(4):
		var ny_p := 0.48 - float(nj) * 0.20
		var cross_h := _create_box_prop(net_grp, "NetStrandH_%d" % nj, Vector3(24.66, ny_p, 114.26 + float(nj) * 0.025), Vector3(0.92 - float(nj) * 0.12, 0.028, 0.025), mat_hemp)
		cross_h.rotation.z = -0.06 * float(nj)
		cross_h.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	for fl_x in [24.34, 24.68, 24.98]:
		var fl_y := 0.49 - absf(fl_x - 24.66) * 0.08
		_create_cylinder(net_grp, "NetCorkFloat_%.2f" % fl_x, Vector3(fl_x, fl_y, 114.25), 0.045, 0.08, mat_pier_a).rotation.z = PI * 0.5

	# Grupos asimétricos de guijarros y madera varada sobre la playa ampliada (orilla moldeada en PleamarCoveBeach)
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
		st_slab.material_override = mat_rock_dark if si_idx % 2 == 0 else mat_rock
		st_slab.position = slp[0]
		st_slab.rotation.y = float(slp[1])
		st_slab.scale = slp[2]
		st_slab.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		pier_node.add_child(st_slab)
	var driftwood_specs := [
		[Vector3(13.2, 0.52, 94.8), 0.11, 2.2, 0.36],
		[Vector3(12.9, 0.52, 94.3), 0.09, 1.8, 0.52],
		[Vector3(13.5, 0.62, 94.5), 0.085, 1.7, 0.22],
	]
	for di in range(driftwood_specs.size()):
		var ds: Array = driftwood_specs[di]
		var dw := _create_cylinder(pier_node, "BeachDriftwood_%d" % di, ds[0], float(ds[1]), float(ds[2]), mat_wood_dark)
		dw.rotation.z = PI * 0.5
		dw.rotation.y = float(ds[3])
		SceneEnhancer.add_box_collider(pier_node, ds[0], Vector3(float(ds[2]), float(ds[1]) * 2.2, float(ds[1]) * 2.2), float(ds[3]))
	var beach_stone_mesh := SceneEnhancer.make_basalt_outcrop_mesh(77)
	for si in range(7):
		var sx := 27.6 + float(si) * 2.4 + sin(float(si) * 1.9) * 0.65
		var sz := 110.2 + cos(float(si) * 2.3) * 0.75
		var st_inst := MeshInstance3D.new()
		st_inst.name = "BeachPebbleCluster_%d" % si
		st_inst.mesh = beach_stone_mesh
		st_inst.material_override = mat_rock_dark if si % 2 == 0 else mat_rock
		st_inst.position = Vector3(sx, 0.14, sz)
		st_inst.scale = Vector3(0.48 + float(si % 3) * 0.18, 0.24, 0.42 + float(si % 2) * 0.20)
		st_inst.rotation.y = float(si) * 1.1
		pier_node.add_child(st_inst)
	# Aparejos de pesca abandonados (toggle DM para «Reaparición de los zombis», PDF p. 12)
	_z2_reappearance_gear = TempleAndCliffs.build_zombie_reappearance_gear(self, pier_node)

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

		#Luz cálida de antorcha y vela dentro de la celda excavada
		var cell_light := OmniLight3D.new()
		cell_light.name = "CellTorchLight_%d" % rid
		cell_light.position = Vector3(cx, y_base + 2.35, cz - 0.6)
		cell_light.light_color = Color(1.0, 0.74, 0.42)
		cell_light.light_energy = 2.65
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

	var cf_flame := _create_cylinder(camp_node, "CampfireFlame", Vector3(0, 0.38, 0), 0.20, 0.48, mat_flame)

	var fire_light := OmniLight3D.new()
	fire_light.name = "CampfireLight"
	fire_light.position = Vector3(0, 1.65, 0)
	fire_light.light_color = Color(1.0, 0.58, 0.22)
	fire_light.light_energy = 3.1
	fire_light.omni_range = 17.5
	camp_node.add_child(fire_light)
	register_flame_fx(cf_flame, fire_light, true)

	# 4.1–4.7 Ancla y posición noble de la estatua de Astalagan presidiendo el eje oeste-central de la plaza (circulación 360° libre)
	var statue_node := Node3D.new()
	statue_node.name = "A1_Dragon_Statue"
	statue_node.position = Vector3(85.80, y, 93.35)
	plaza_node.add_child(statue_node)

	var statue_light := OmniLight3D.new()
	statue_light.name = "AstalaganVotiveLight"
	statue_light.position = Vector3(0, 2.4, 0.6)
	statue_light.light_color = Color(1.0, 0.78, 0.42)
	statue_light.light_energy = 1.65
	statue_light.omni_range = 9.0
	statue_node.add_child(statue_light)

# 4..8. Edificios, Cabrestante con palanca legible y vista al mar, y contenedores .glb
func _build_a2_winch_house(_global_data: Dictionary) -> void:
	var res: Dictionary = WinchAndStairs.build_a2_winch_complex(self)
	winch_lever_pivot = res.get("lever_pivot")
	winch_pallet_rig = res.get("pallet_rig")
	winch_cable_mesh = res.get("cable_mesh")
	winch_drum_pivot = res.get("drum_pivot")
	winch_pulley_pivot = res.get("head_pulley_pivot")
	winch_guide_pulley_pivot = res.get("guide_pulley_pivot")
	_apply_winch_visual_state(0.0)

func _build_a3_dining_hall(_global_data: Dictionary) -> void:
	var a3_node := Node3D.new()
	a3_node.name = "A3_DiningHall"
	add_child(a3_node)
	var y := Structure.ELEV_A3_DINING
	var hearth_light := OmniLight3D.new()
	hearth_light.name = "KitchenHearthLight"
	hearth_light.position = Vector3(117.35, y + 1.45, 51.45)
	hearth_light.light_color = Color(1.0, 0.56, 0.20)
	hearth_light.light_energy = 2.45
	hearth_light.omni_range = 13.0
	a3_node.add_child(hearth_light)

	var dining_light := OmniLight3D.new()
	dining_light.name = "DiningLampLight"
	dining_light.position = Vector3(124.2, y + 2.55, 59.4)
	dining_light.light_color = Color(1.0, 0.76, 0.42)
	dining_light.light_energy = 2.05
	dining_light.omni_range = 14.5
	a3_node.add_child(dining_light)

func _build_a4_library(_global_data: Dictionary) -> void:
	var a4_node := Node3D.new()
	a4_node.name = "A4_Library"
	add_child(a4_node)
	var y := Structure.ELEV_A4_LIBRARY
	var study_light := OmniLight3D.new()
	study_light.name = "LibraryStudyLight"
	study_light.position = Vector3(98.4, y + 2.55, 57.6)
	study_light.light_color = Color(1.0, 0.78, 0.44)
	study_light.light_energy = 2.15
	study_light.omni_range = 16.0
	a4_node.add_child(study_light)

func _build_a5_temple(_global_data: Dictionary) -> void:
	var a5_node := Node3D.new()
	a5_node.name = "A5_Temple"
	add_child(a5_node)
	var y := Structure.ELEV_A5_TEMPLE
	var temple_light := OmniLight3D.new()
	temple_light.name = "TempleSanctuaryLight"
	temple_light.position = Vector3(40.5, y + 5.6, 69.5)
	temple_light.light_color = Color(1.0, 0.88, 0.68)
	temple_light.light_energy = 2.15
	temple_light.omni_range = 24.0
	a5_node.add_child(temple_light)
	# Iluminación arquitectónica equilibrada sobre los frontones y la bóveda sin quemar la piedra noble
	for v_lt in [
		[Vector3(49.2, y + 6.4, 69.5), Color(1.0, 0.82, 0.54), 1.65, 17.0],
		[Vector3(31.8, y + 6.4, 69.5), Color(0.76, 0.86, 1.0), 1.35, 16.0],
		[Vector3(40.5, y + 10.6, 73.2), Color(0.84, 0.90, 1.0), 1.45, 20.0],
	]:
		var pl := OmniLight3D.new()
		pl.name = "ParthenonVaultGlow"
		pl.position = v_lt[0]
		pl.light_color = v_lt[1]
		pl.light_energy = v_lt[2]
		pl.omni_range = v_lt[3]
		a5_node.add_child(pl)

	# Fases 1, 2 y 3 (Segunda Auditoría): Promontorio volcánico continuo, cimentación de mampostería,
	# arquitectura monumental con cubierta cutaway independiente e interior sagrado de Bahamut
	var parthenon := Node3D.new()
	parthenon.name = "TempleParthenonExpansion"
	a5_node.add_child(parthenon)
	TempleAndCliffs.build_a5_promontory_and_foundation(self, parthenon, y)
	TempleAndCliffs.build_a5_monumental_architecture(self, parthenon, y)
	TempleAndCliffs.build_a5_sacred_interior(self, a5_node, y)

	# Incensarios y ancla interactiva [T] preservada junto al ara de Bahamut
	for cx in [-1.45, 1.45]:
		_create_cylinder(a5_node, "AltarCenserPedestal", Vector3(40.5 + cx, y + 0.28, 69.85), 0.14, 0.56, mat_bronze)
		_create_cylinder(a5_node, "AltarCenserBowl", Vector3(40.5 + cx, y + 0.60, 69.85), 0.20, 0.14, mat_gold)
		SceneEnhancer.add_cyl_collider(a5_node, Vector3(40.5 + cx, y + 0.34, 69.85), 0.22, 0.68)
	var altar_anchor := Node3D.new()
	altar_anchor.name = "BahamutAltarAnchor"
	altar_anchor.position = Vector3(40.5, y, 69.85)
	a5_node.add_child(altar_anchor)
	var altar_ip := SceneEnhancer._attach_interactive_prop(altar_anchor, "shrine", "Altar de Bahamut", "[T] Orar en el Altar de Bahamut", Vector3.ZERO, "n", "El resplandor dorado del santuario de Bahamut envuelve al grupo en una serenidad protectora.")
	if altar_ip:
		altar_ip.interact_radius = 3.4

	# 7 canarios dorados de Bahamut posados sobre superficies sólidas reales del santuario (cero flotación)
	_a5_canaries.clear()
	var canary_specs := [
		[Vector3(39.32, y + 0.45, 68.32), 0.45],
		[Vector3(41.68, y + 0.45, 68.32), -0.45],
		[Vector3(40.50, y + 1.07, 63.65), 0.05],
		[Vector3(37.45, y + 1.07, 63.62), 0.28],
		[Vector3(43.55, y + 1.07, 63.62), -0.28],
		[Vector3(35.80, y + 0.535, 73.35), 1.15],
		[Vector3(35.80, y + 0.535, 65.65), -1.15],
	]
	for csi in range(canary_specs.size()):
		var cs: Array = canary_specs[csi]
		var canary_node: Node3D = SceneEnhancer.build_sanctuary_canary(a5_node, cs[0], float(cs[1]), mat_gold)
		if is_instance_valid(canary_node):
			_a5_canaries.append({
				"root": canary_node,
				"head": canary_node.get_node_or_null("HeadPivot"),
				"base_y": float((cs[0] as Vector3).y),
				"phase": float(csi) * 1.47 + 0.35
			})

	# Contrafuertes geológicos estratificados (reemplaza los 9 conos lisos "dedos")
	TempleAndCliffs.build_west_cliff_buttresses(self, a5_node)
	# Cementerio canónico de Brastos en el acantilado noroeste (PDF p. 27)
	TempleAndCliffs.build_brastos_nw_graveyard(self, a5_node)
	# Efecto escénico DM para la revelación dracónica de Runara + Llave de piedra lunar (PDF p. 13)
	_a5_revelation_fx = TempleAndCliffs.build_a5_runara_revelation_fx(self, a5_node, y)

func set_zombie_reappearance_active(active: bool) -> bool:
	if is_instance_valid(_z2_reappearance_gear):
		_z2_reappearance_gear.visible = active
	return is_zombie_reappearance_active()

func is_zombie_reappearance_active() -> bool:
	return is_instance_valid(_z2_reappearance_gear) and _z2_reappearance_gear.visible

func set_runara_revelation_active(active: bool) -> bool:
	if is_instance_valid(_a5_revelation_fx):
		_a5_revelation_fx.visible = active
	return is_runara_revelation_active()

func is_runara_revelation_active() -> bool:
	return is_instance_valid(_a5_revelation_fx) and _a5_revelation_fx.visible

func _build_staircases() -> void:
	var stairs_node := Node3D.new()
	stairs_node.name = "Staircases"
	add_child(stairs_node)

	# 1. Puente ampliado Paseo Superior <-> Templo A5 (5.6m ancho) con pasamanos de cuerda en ambos bordes
	_build_rustic_bridge_with_ropes(stairs_node, Vector3(76.6, 18.0, 66.0), Vector3(49.8, 27.0, 66.0), 5.6)

	# 2. Escaleras rústicas talladas a mano sobre los tramos de montaña (ObsBase y enlace Paseo->A2 se construyen en Fase 1.3 con mampostería completa)
	_build_rustic_stone_flight(stairs_node, "RusticStair_A5North", Vector3(52.10, 26.42, 64.1), Vector3(52.10, 34.82, 48.0), 2.85, 24)
	_build_rustic_stone_flight(stairs_node, "RusticStair_A5RidgeW", Vector3(49.5, 34.7, 44.2), Vector3(15.2, 21.3, 44.2), 2.35, 34)
	var obs_base_placeholder := Node3D.new()
	obs_base_placeholder.name = "RusticStair_ObsBase"
	stairs_node.add_child(obs_base_placeholder)
	_build_rustic_stone_flight(stairs_node, "RusticStair_ObsTurn", Vector3(140.25, 23.0, 44.2), Vector3(145.5, 23.05, 44.2), 2.25, 6)
	_build_rustic_stone_flight(stairs_node, "RusticStair_ObsNorth", Vector3(145.5, 23.05, 43.2), Vector3(145.5, 36.98, 21.8), 2.85, 28)
	_build_rustic_stone_flight(stairs_node, "RusticStair_ObsCrown", Vector3(145.5, 36.98, 20.2), Vector3(123.0, 36.98, 20.2), 2.85, 14)
	_build_rustic_stone_flight(stairs_node, "RusticStair_ObsCoast", Vector3(160.5, 29.95, 33.8), Vector3(160.5, 32.55, 28.4), 2.55, 8)

	# 3.4 Paso 3: Artesanía, contacto rocoso, musgo en juntas, cuerdas estrictamente perimetrales y umbral de entrada Z2
	_build_z2_stair_craftsmanship(stairs_node)
	# 3.5 Fase 2: Escalera tallada del Acantilado Este A1 <-> A2 con descansillo intermedio, faroles y cuerdas perimetrales
	WinchAndStairs.build_east_cliff_a1_to_a2_stairs(self, stairs_node)

func _build_z2_stair_craftsmanship(parent: Node3D) -> void:
	var z2_node := Node3D.new()
	z2_node.name = "Z2_StairCraftsmanship"
	parent.add_child(z2_node)

	var rng := RandomNumberGenerator.new()
	rng.seed = 202611183
	var norm_rock := _load_tex("rock-normal-v1.png")
	var tex_stone := _load_tex("ashlar-v4.webp")
	if not tex_stone:
		tex_stone = _load_tex("a1-plaza-v6.png")
	var tex_basalt := _load_tex("basalt-coastal-albedo-v1.webp")

	var mat_slab := _make_textured_mat(Color("#e8dec8"), 0.88, 0.02, tex_stone, 0.34, true, norm_rock, 0.35)
	mat_slab.vertex_color_use_as_albedo = true
	mat_slab.vertex_color_is_srgb = true
	var mat_curb := _make_textured_mat(Color("#dde2e6"), 0.88, 0.02, tex_basalt, 0.22, true, norm_rock, 0.62)
	mat_curb.vertex_color_use_as_albedo = true
	mat_curb.vertex_color_is_srgb = true
	var moss_mat := _make_mat(Color.WHITE, 0.90, 0.0)
	moss_mat.vertex_color_use_as_albedo = true
	moss_mat.cull_mode = BaseMaterial3D.CULL_DISABLED

	# 3.1 Peldaños y descansillos variados: losas planas de arenisca desgastada y transición al pie
	var flat_flag_mesh := BoxMesh.new()
	flat_flag_mesh.size = Vector3(1.0, 1.0, 1.0)
	var flag_xf: Array[Transform3D] = []
	var flag_col: Array[Color] = []
	var flag_tones: Array[Color] = [
		Color("#ddd0b4"), Color("#cabaa0"), Color("#b8a88e"), Color("#a69880"), Color("#e2d6bc")
	]
	var landing_specs := [
		Vector4(36.0, 1.505, 108.0, 2.5),
		Vector4(46.5, 4.005, 105.0, 2.5),
		Vector4(57.0, 6.505, 102.0, 2.5)
	]
	for ld in landing_specs:
		var lx: float = ld.x
		var ly: float = ld.y
		var lz: float = ld.z
		for row in range(5):
			for col in range(2):
				var fx := lx + (-0.58 if col == 0 else 0.58) + rng.randf_range(-0.18, 0.18)
				var fz := lz + lerpf(-2.15, 2.15, float(row) / 4.0) + rng.randf_range(-0.14, 0.14)
				var scx := rng.randf_range(0.68, 0.98)
				var scz := rng.randf_range(0.62, 0.96)
				var fb := Basis.from_euler(Vector3(0.0, rng.randf_range(-0.14, 0.14), 0.0)).scaled(Vector3(scx, 0.022, scz))
				flag_xf.append(Transform3D(fb, Vector3(fx, ly + 0.008, fz)))
				var tone := flag_tones[rng.randi() % flag_tones.size()]
				if rng.randf() < 0.35:
					tone = tone.darkened(0.08)
				flag_col.append(tone)

	# Lajas de transición en el enlace muelle -> pie de escalera Z2 (x=27.2..29.6)
	for app_i in range(6):
		var ax := lerpf(27.35, 29.45, float(app_i) / 5.0)
		var az := 109.5 + rng.randf_range(-0.78, 0.78)
		var ay := lerpf(0.275, 0.265, float(app_i) / 5.0)
		var ab := Basis.from_euler(Vector3(0.0, rng.randf_range(-0.28, 0.28), 0.0)).scaled(Vector3(rng.randf_range(0.72, 1.02), 0.045, rng.randf_range(0.64, 0.90)))
		flag_xf.append(Transform3D(ab, Vector3(ax, ay, az)))
		flag_col.append(flag_tones[rng.randi() % flag_tones.size()].darkened(0.10))

	# Tramos de subida Z2
	var flight_specs := [
		[Vector3(29.5, 0.25, 109.5), Vector3(35.0, 1.505, 109.5), 11],
		[Vector3(37.5, 1.505, 106.5), Vector3(45.2, 4.005, 106.5), 14],
		[Vector3(48.0, 4.005, 103.5), Vector3(55.7, 6.505, 103.5), 14],
		[Vector3(58.5, 6.505, 100.5), Vector3(66.2, 9.005, 100.5), 14]
	]
	var mm_flags := _make_multimesh_batch("MM_Z2StairFlags", flat_flag_mesh, mat_slab, flag_xf, flag_col)
	mm_flags.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	z2_node.add_child(mm_flags)

	# 3.2 Contacto natural con la roca: sillares de anclaje en la base y musgo en juntas
	var slab_mesh := SceneEnhancer.make_basalt_outcrop_mesh(137)
	var anchor_xf: Array[Transform3D] = []
	var anchor_col: Array[Color] = []
	var anchor_tones: Array[Color] = [Color("#cfd6dc"), Color("#b8c0c6"), Color("#dce2e6"), Color("#a4acb3")]
	var moss_xf: Array[Transform3D] = []
	var moss_col: Array[Color] = []
	var moss_tones: Array[Color] = [Color("#395125"), Color("#4b6330"), Color("#5c6d36"), Color("#2c3f1d")]

	for fl in flight_specs:
		var fa: Vector3 = fl[0]
		var fb: Vector3 = fl[1]
		var steps: int = int(fl[2])
		for si in range(steps):
			var t := float(si) / float(maxi(1, steps - 1))
			var sp := fa.lerp(fb, t)
			for side in [-1.0, 1.0]:
				# Piedras de encaje mordiendo el bordillo bajo la barandilla sin taparla
				if rng.randf() < 0.72:
					var rk_sc := Vector3(rng.randf_range(0.50, 0.92), rng.randf_range(0.32, 0.56), rng.randf_range(0.42, 0.78))
					var rpos := sp + Vector3(rng.randf_range(-0.16, 0.16), -0.32, side * rng.randf_range(1.75, 2.15))
					var rb := Basis.from_euler(Vector3(rng.randf_range(-0.10, 0.10), rng.randf_range(0.0, TAU), rng.randf_range(-0.10, 0.10))).scaled(rk_sc)
					anchor_xf.append(Transform3D(rb, rpos))
					anchor_col.append(anchor_tones[rng.randi() % anchor_tones.size()])
				# Musgo y matojos bajos en las juntas piedra-acantilado
				if rng.randf() < 0.65:
					var msc := rng.randf_range(0.50, 0.92)
					var mpos := sp + Vector3(rng.randf_range(-0.18, 0.18), -0.02, side * rng.randf_range(1.58, 1.92))
					var mb := Basis.from_euler(Vector3(rng.randf_range(-0.10, 0.10), rng.randf_range(0.0, TAU), rng.randf_range(-0.10, 0.10))).scaled(Vector3(msc * 1.1, msc * 0.72, msc * 1.1))
					moss_xf.append(Transform3D(mb, mpos))
					moss_col.append(moss_tones[rng.randi() % moss_tones.size()])

	# Refuerzos mayores incrustados bajo el borde norte y escarpe marino de Z2 (losas bajas asentadas, sin diamantes flotantes)
	var cliff_wedge_pts := [
		Vector4(31.8, -0.35, 106.4, 1.35), Vector4(34.6, 0.15, 105.6, 1.45),
		Vector4(39.8, 0.95, 103.6, 1.55), Vector4(43.6, 2.10, 103.4, 1.50),
		Vector4(50.2, 3.40, 100.6, 1.55), Vector4(54.4, 4.80, 100.2, 1.50),
		Vector4(33.8, -0.35, 111.7, 1.50), Vector4(41.2, 1.25, 108.9, 1.55),
		Vector4(51.6, 3.70, 105.9, 1.60)
	]
	for cw in cliff_wedge_pts:
		var cbas := Basis.from_euler(Vector3(rng.randf_range(-0.08, 0.08), rng.randf_range(0.0, TAU), rng.randf_range(-0.08, 0.08))) * Basis.from_scale(Vector3(cw.w * 1.15, cw.w * 0.56, cw.w * 0.92))
		anchor_xf.append(Transform3D(cbas, Vector3(cw.x, cw.y, cw.z)))
		anchor_col.append(anchor_tones[rng.randi() % anchor_tones.size()].darkened(0.10))

	if not anchor_xf.is_empty():
		var mm_anch := _make_multimesh_batch("MM_Z2RockAnchors", slab_mesh, mat_curb, anchor_xf, anchor_col)
		mm_anch.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		z2_node.add_child(mm_anch)
	if not moss_xf.is_empty():
		var mm_moss := _make_multimesh_batch("MM_Z2JointMoss", SceneEnhancer.make_fern_cluster_mesh(), moss_mat, moss_xf, moss_col)
		mm_moss.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		z2_node.add_child(mm_moss)

	# Fase 4: Arrecifes escalonados sumergidos/emergentes y bancadas rocosas rompiendo la arista recta bajo Z1/Z2
	TempleAndCliffs.build_z1_z2_coastal_toe_and_reefs(self, z2_node)

	# 3.3 Postes y barandillas de cuerda en catenaria ESTRICTAMENTE en el perímetro exterior de Z2 (cero cuerdas cruzando rellanos ni accesos)
	WinchAndStairs.build_z2_perimeter_ropes(self, z2_node)

	# 3.4 Umbral inequívoco de entrada/salida entre playa Z1 <-> subida al Retiro (y llegada superior a A1)
	var gate_n := Vector3(28.75, 0.28, 107.65)
	var gate_s := Vector3(29.10, 0.25, 111.20)
	for gp_idx in range(2):
		var gpos: Vector3 = gate_n if gp_idx == 0 else gate_s
		var gpl := _create_box_prop(z2_node, "Z2EntryPlinth_%d" % gp_idx, gpos + Vector3(0.0, 0.24, 0.0), Vector3(0.62, 0.52, 0.62), mat_rock_carved)
		gpl.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		_create_box_prop(z2_node, "Z2EntryCapStone_%d" % gp_idx, gpos + Vector3(0.0, 0.54, 0.0), Vector3(0.68, 0.10, 0.68), mat_rock)
		_add_ground_contact_shadow(z2_node, "Z2EntryPlinthShadow_%d" % gp_idx, Vector3(gpos.x, gpos.y + 0.02, gpos.z), Vector2(1.15, 1.15), 0.44)
		SceneEnhancer.add_box_collider(z2_node, gpos + Vector3(0.0, 0.45, 0.0), Vector3(0.66, 0.95, 0.66))

	# Poste farol de entrada al sendero superior (norte del arranque de Flight 0)
	var lp_base := gate_n + Vector3(0.0, 0.58, 0.0)
	var entry_post := _create_cylinder(z2_node, "Z2EntranceLanternPost", lp_base + Vector3(0.0, 0.85, 0.0), 0.095, 1.75, mat_wood_dark)
	entry_post.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	var entry_arm := _create_box_prop(z2_node, "Z2EntranceLanternArm", lp_base + Vector3(0.28, 1.62, 0.22), Vector3(0.56, 0.09, 0.09), mat_wood_dark)
	entry_arm.rotation.y = -0.68
	entry_arm.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	var l_pos := lp_base + Vector3(0.42, 1.38, 0.34)
	_create_cylinder(z2_node, "Z2EntranceLanternCap", l_pos + Vector3(0.0, 0.16, 0.0), 0.13, 0.06, mat_iron)
	var z2_lantern := _create_box_prop(z2_node, "Z2EntranceLanternFlame", l_pos, Vector3(0.15, 0.22, 0.15), mat_flame)
	z2_lantern.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	var z2_light := OmniLight3D.new()
	z2_light.name = "Z2EntranceLanternLight"
	z2_light.position = l_pos
	z2_light.light_color = Color(1.0, 0.74, 0.36)
	z2_light.light_energy = 1.65
	z2_light.omni_range = 10.5
	z2_node.add_child(z2_light)
	register_flame_fx(z2_lantern, z2_light, false)

	# Placa tallada orientativa "Subida al Retiro" en el poste de entrada (sin tapar paso)
	var sign_board := _create_box_prop(z2_node, "Z2EntryRouteBoard", lp_base + Vector3(0.08, 1.18, 0.12), Vector3(0.68, 0.22, 0.055), mat_wood)
	sign_board.rotation.y = -0.35
	var z2_txt := Label3D.new()
	z2_txt.text = "El Retiro ↑"
	z2_txt.font_size = 24
	z2_txt.pixel_size = 0.0046
	z2_txt.modulate = Color("#efe1c2")
	z2_txt.outline_size = 4
	z2_txt.outline_modulate = Color("#24170c")
	z2_txt.position = Vector3(0.0, 0.0, 0.032)
	sign_board.add_child(z2_txt)
	var z2_sign_ip := SceneEnhancer._attach_interactive_prop(sign_board, "noticeboard", "Cartel de subida al Retiro", "[T] Leer cartel de subida", Vector3.ZERO, "n", "«↑ El Retiro del Dragón · Celdas A1, Refectorio A3, Biblioteca A4 y Templo de Bahamut A5. Todo viajero pacífico es bienvenido.»")
	z2_sign_ip.interact_radius = 2.65

	# Pilares de coronación en la llegada superior a Plaza A1 (x=66.4, y=9.0, z=98.6 y 102.2)
	for top_z in [98.65, 102.35]:
		var t_pos := Vector3(66.4, 9.0, float(top_z))
		var t_pillar := _create_box_prop(z2_node, "Z2TopExitPillar_%.1f" % float(top_z), t_pos + Vector3(0.0, 0.65, 0.0), Vector3(0.54, 1.32, 0.54), mat_rock_carved)
		t_pillar.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		_create_box_prop(z2_node, "Z2TopExitCap_%.1f" % float(top_z), t_pos + Vector3(0.0, 1.36, 0.0), Vector3(0.64, 0.12, 0.64), mat_rock)
		SceneEnhancer.add_box_collider(z2_node, t_pos + Vector3(0.0, 0.65, 0.0), Vector3(0.58, 1.35, 0.58))

	# 3.5 Reemplazo botánico en las 2 jardineras sur de Z2 (sustituye las bolas icosaédricas heredadas de Babylon)
	var z2_shrub_xf: Array[Transform3D] = []
	var z2_shrub_col: Array[Color] = []
	var z2_blossom_xf: Array[Transform3D] = []
	var z2_blossom_col: Array[Color] = []
	var z2_herb_pal: Array[Color] = [Color("#39512b"), Color("#486238"), Color("#566f43"), Color("#314626")]
	var z2_flower_pal: Array[Color] = [Color("#f0ead8"), Color("#b89ad4"), Color("#e6d58f"), Color("#f4f1e6")]
	for planter_c: Vector3 in [Vector3(46.8, 4.18, 108.75), Vector3(57.2, 6.68, 105.75)]:
		for pi_b in range(6):
			var px: float = planter_c.x + lerpf(-1.05, 1.05, float(pi_b) / 5.0) + rng.randf_range(-0.10, 0.10)
			var pz: float = planter_c.z + rng.randf_range(-0.24, 0.24)
			var sc_b := rng.randf_range(0.52, 0.82)
			var bb := Basis.from_euler(Vector3(0.0, rng.randf_range(0.0, TAU), 0.0)) * Basis.from_scale(Vector3(sc_b, sc_b * 0.78, sc_b))
			z2_shrub_xf.append(Transform3D(bb, Vector3(px, planter_c.y, pz)))
			z2_shrub_col.append(z2_herb_pal[pi_b % z2_herb_pal.size()])
			if pi_b % 2 == 0:
				var fb := Basis.from_euler(Vector3(0.0, rng.randf_range(0.0, TAU), 0.0)) * Basis.from_scale(Vector3(0.32, 0.34, 0.32))
				z2_blossom_xf.append(Transform3D(fb, Vector3(px, planter_c.y + 0.28 * sc_b, pz)))
				z2_blossom_col.append(z2_flower_pal[(pi_b / 2) % z2_flower_pal.size()])
	var z2_herb_mat := _make_mat(Color.WHITE, 0.84, 0.0)
	z2_herb_mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	z2_node.add_child(_make_multimesh_batch("MM_Z2PlanterHerbs", SceneEnhancer.make_botanical_shrub_mesh(), z2_herb_mat, z2_shrub_xf, z2_shrub_col))
	z2_node.add_child(_make_multimesh_batch("MM_Z2PlanterBlossoms", SceneEnhancer.make_blossom_cluster_mesh(), z2_herb_mat, z2_blossom_xf, z2_blossom_col))

	# 3.6 Dos faroles cálidos en el borde norte de los rellanos intermedios de Z2 (paso central 100% libre)
	for l_idx in range(2):
		var lpos := Vector3(46.8, 4.00, 103.55) if l_idx == 0 else Vector3(57.2, 6.50, 100.55)
		var lpost := _create_cylinder(z2_node, "Z2MidLanternPost_%d" % l_idx, lpos + Vector3(0.0, 0.92, 0.0), 0.085, 1.84, mat_wood_dark)
		lpost.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		var larm := _create_box_prop(z2_node, "Z2MidLanternArm_%d" % l_idx, lpos + Vector3(0.0, 1.72, 0.24), Vector3(0.09, 0.09, 0.50), mat_wood_dark)
		larm.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		var fl_pos := lpos + Vector3(0.0, 1.48, 0.42)
		_create_cylinder(z2_node, "Z2MidLanternCap_%d" % l_idx, fl_pos + Vector3(0.0, 0.15, 0.0), 0.12, 0.055, mat_iron)
		var fl_m := _create_box_prop(z2_node, "Z2MidLanternFlame_%d" % l_idx, fl_pos, Vector3(0.14, 0.20, 0.14), mat_flame)
		fl_m.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		var fl_l := OmniLight3D.new()
		fl_l.name = "Z2MidLanternLight_%d" % l_idx
		fl_l.position = fl_pos
		fl_l.light_color = Color(1.0, 0.74, 0.36)
		fl_l.light_energy = 1.55
		fl_l.omni_range = 11.0
		z2_node.add_child(fl_l)
		register_flame_fx(fl_m, fl_l, false)

func _build_rustic_bridge_with_ropes(parent: Node3D, a: Vector3, b: Vector3, width: float) -> void:
	WinchAndStairs.build_upgraded_a5_bridge(self, parent, a, b, width)

func _build_rustic_stone_flight(parent: Node3D, flight_name: String, a: Vector3, b: Vector3, width: float, step_count: int) -> void:
	WinchAndStairs.build_upgraded_rustic_stone_flight(self, parent, flight_name, a, b, width, step_count)

# 8A. Losas y rampas convexas invisibles de seguridad para garantizar cero caídas en todo el mapa
func _build_safety_colliders() -> void:
	var safe_node := Node3D.new()
	safe_node.name = "SafetyColliders"
	add_child(safe_node)

	var slabs := [
		["Safe_Beach_West", Vector3(17.5, -0.135, 104.5), Vector3(21.0, 0.80, 11.0)],
		["Safe_Beach_South", Vector3(24.0, -0.135, 110.1), Vector3(15.0, 0.80, 3.0)],
		["Safe_Pier_Deck", Vector3(21.8, 0.12, 112.1), Vector3(6.8, 0.74, 4.2)],
		["Safe_Pier_EastLink", Vector3(26.2, 0.06, 111.2), Vector3(2.8, 0.70, 2.2)],
		["Safe_Z2_Landing0", Vector3(36.0, 1.105, 108.0), Vector3(3.2, 0.80, 6.2)],
		["Safe_Z2_Landing1", Vector3(46.5, 3.605, 105.0), Vector3(3.2, 0.80, 6.2)],
		["Safe_Z2_Landing2", Vector3(57.0, 6.105, 102.0), Vector3(3.2, 0.80, 6.2)],
		["Safe_A1_Landing", Vector3(69.8, 8.615, 96.0), Vector3(8.0, 0.80, 9.2)],
		["Safe_A1_PlazaAndCaves", Vector3(107.2, 8.615, 86.2), Vector3(67.5, 0.80, 23.0)],
		["Safe_East_Cliff_Foot", Vector3(148.0, 8.615, 92.6), Vector3(14.5, 0.80, 5.2)],
		["Safe_Cliff_MidLanding", Vector3(154.5, 11.605, 81.75), Vector3(3.4, 0.80, 2.1)],
		["Safe_A2_WestPorch", Vector3(154.55, 14.605, 68.8), Vector3(3.5, 0.80, 7.0)],
		["Safe_A2_WinchDeck", Vector3(160.5, 14.605, 66.9), Vector3(12.2, 0.80, 8.6)],
		["Safe_Upper_And_A3A4", Vector3(109.15, 17.605, 60.9), Vector3(72.3, 0.80, 23.8)],
		["Safe_Upper_ObsApproach", Vector3(140.5, 17.605, 57.0), Vector3(14.0, 0.80, 15.5)],
		["Safe_A5_Temple", Vector3(40.5, 26.605, 69.5), Vector3(18.8, 0.80, 16.2)]
	]
	for s in slabs:
		var m := _create_surface_slab(safe_node, s[0], s[1], s[2], mat_plaza)
		m.visible = false

	# Rampas inclinadas continuas exactas entre rellanos, terrazas y escaleras de montaña
	_add_safety_ramp(safe_node, "Safe_Ramp_Z2_Flight0", Vector3(29.5, 0.25, 109.5), Vector3(35.0, 1.505, 109.5), 3.4)
	_add_safety_ramp(safe_node, "Safe_Ramp_Z2_Flight1", Vector3(37.5, 1.505, 106.5), Vector3(45.2, 4.005, 106.5), 3.4)
	_add_safety_ramp(safe_node, "Safe_Ramp_Z2_Flight2", Vector3(48.0, 4.005, 103.5), Vector3(55.7, 6.505, 103.5), 3.4)
	_add_safety_ramp(safe_node, "Safe_Ramp_Z2_Flight3", Vector3(58.5, 6.505, 100.5), Vector3(66.2, 9.005, 100.5), 3.4)
	_add_safety_ramp(safe_node, "Safe_Ramp_A5_Upper", Vector3(49.8, 27.005, 66.0), Vector3(76.6, 18.005, 66.0), 5.6)
	_add_safety_ramp(safe_node, "Safe_Ramp_A5_Mount_N", Vector3(52.10, 26.42, 63.25), Vector3(52.10, 34.82, 48.0), 2.9)
	_add_safety_ramp(safe_node, "Safe_Ramp_A5_Mount_Corner", Vector3(52.35, 34.72, 48.2), Vector3(49.5, 34.72, 44.2), 2.8)
	_add_safety_ramp(safe_node, "Safe_Ramp_A5_Mount_W", Vector3(49.5, 34.72, 44.2), Vector3(15.2, 21.30, 44.2), 2.4)
	_add_safety_ramp(safe_node, "Safe_Ramp_Obs_Base", Vector3(140.25, 18.02, 52.4), Vector3(140.25, 23.02, 45.35), 2.4)
	_add_safety_ramp(safe_node, "Safe_Ramp_Obs_Turn", Vector3(140.25, 23.02, 44.05), Vector3(145.5, 23.05, 44.05), 2.4)
	_add_safety_ramp(safe_node, "Safe_Ramp_Obs_North", Vector3(145.5, 23.05, 43.2), Vector3(145.5, 37.00, 21.8), 2.9)
	_add_safety_ramp(safe_node, "Safe_Ramp_Obs_Crown", Vector3(145.5, 37.00, 20.2), Vector3(123.0, 37.00, 20.2), 2.9)
	_add_safety_ramp(safe_node, "Safe_Ramp_Obs_Coast", Vector3(160.5, 29.95, 33.8), Vector3(160.5, 32.55, 28.4), 2.6)
	_add_safety_ramp(safe_node, "Safe_Ramp_Upper_A2", Vector3(145.0, 18.005, 67.5), Vector3(154.0, 15.005, 67.5), 4.2)
	_add_safety_ramp(safe_node, "Safe_Ramp_Cliff_East_Low", Vector3(154.5, 9.005, 91.75), Vector3(154.5, 12.005, 82.35), 3.3)
	_add_safety_ramp(safe_node, "Safe_Ramp_Cliff_East_High", Vector3(154.5, 12.005, 81.15), Vector3(154.5, 15.005, 71.85), 3.3)

	# Guardarraíles de seguridad perimetrales en bordes de acantilado abiertos (A2, Plaza Sur, Paseo Superior, A5)
	var edge_barriers := [
		# A2 Terraza del cabrestante ampliada (x=154.5..166.5, z=62.6..71.2; abre x=156.1 z=66.1..69.0 y EastStairs x=153.0..156.0 z=70)
		["Safe_Edge_A2_North", Vector3(160.5, 16.2, 62.65), Vector3(12.2, 2.8, 0.45)],
		["Safe_Edge_A2_East", Vector3(166.35, 16.2, 66.9), Vector3(0.45, 2.8, 8.6)],
		["Safe_Edge_A2_South", Vector3(161.4, 16.2, 71.05), Vector3(10.0, 2.8, 0.45)],
		["Safe_Edge_A2_NW", Vector3(154.8, 16.2, 63.95), Vector3(2.2, 2.8, 2.8)],
		# Plaza A1 Sur y aterrizaje Z2/Este (deja abiertas escaleras Z2 x=66 z=99..102 y EastStairs x=153.0..156.0 z=92..95)
		["Safe_Edge_Plaza_West", Vector3(69.8, 10.2, 102.2), Vector3(8.2, 2.8, 0.55)],
		["Safe_Edge_Plaza_Landing_NW", Vector3(66.0, 10.2, 95.1), Vector3(0.55, 2.8, 7.6)],
		["Safe_Edge_Plaza_Landing_Step", Vector3(73.4, 10.2, 99.6), Vector3(0.55, 2.8, 5.4)],
		["Safe_Edge_Plaza_East_1", Vector3(138.0, 10.2, 97.1), Vector3(7.4, 2.8, 0.55)],
		["Safe_Edge_Plaza_East_Step", Vector3(141.4, 10.2, 96.2), Vector3(0.55, 2.8, 2.2)],
		["Safe_Edge_Plaza_East_2", Vector3(147.2, 10.2, 95.25), Vector3(11.8, 2.8, 0.55)],
		["Safe_Edge_Plaza_East_Corner", Vector3(156.45, 10.2, 93.8), Vector3(0.55, 2.8, 3.2)],
		# Paseo Superior borde sur (deja abiertas escaleras a A5 z=63.2..68.8 y a A2 z=65.9..69.0)
		["Safe_Edge_Upper_SW_H", Vector3(75.1, 19.2, 72.70), Vector3(3.4, 2.8, 0.55)],
		["Safe_Edge_Upper_SW_V", Vector3(73.6, 19.2, 70.8), Vector3(0.55, 2.8, 3.9)],
		["Safe_Edge_Upper_East", Vector3(140.2, 19.2, 72.70), Vector3(10.6, 2.8, 0.55)],
		["Safe_Edge_Upper_SE_Turn", Vector3(145.45, 19.2, 70.95), Vector3(0.55, 2.8, 3.8)],
		# Templo A5 ampliado (x=31.2..49.8, z=61.5..77.5; deja abierta subida puente Upper->A5 en x=49.8 z=63.2..68.8 y subida norte z=61.5 x=51..54)
		["Safe_Edge_A5_North_W", Vector3(40.5, 28.2, 61.55), Vector3(18.6, 2.8, 0.55)],
		["Safe_Edge_A5_South", Vector3(40.5, 28.2, 77.45), Vector3(18.6, 2.8, 0.55)],
		["Safe_Edge_A5_West", Vector3(31.25, 28.2, 69.5), Vector3(0.55, 2.8, 16.2)],
		["Safe_Edge_A5_East_S", Vector3(49.8, 28.2, 73.1), Vector3(0.55, 2.8, 8.6)],
		["Safe_Edge_A5_East_N", Vector3(49.8, 28.2, 62.35), Vector3(0.55, 2.8, 1.7)]
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

func _parse_glb_bundle(res_path: String) -> Node:
	if not FileAccess.file_exists(res_path):
		push_warning("Missing GLB bundle: " + res_path)
		return null
	var bytes := FileAccess.get_file_as_bytes(res_path)
	if bytes.is_empty():
		return null
	var doc := GLTFDocument.new()
	var state := GLTFState.new()
	var err := doc.append_from_buffer(bytes, "", state)
	if err != OK:
		push_warning("GLTF append failed (%d): %s" % [err, res_path])
		return null
	return doc.generate_scene(state)

func _process_babylon_mesh(m_inst: MeshInstance3D, default_parent: Node3D, prefix_targets: Dictionary) -> void:
	var old_parent := m_inst.get_parent()
	if old_parent:
		old_parent.remove_child(m_inst)
	m_inst.owner = null
	if _should_skip_babylon_mesh(m_inst.name):
		m_inst.queue_free()
		return

	var target_parent: Node3D = default_parent
	var parts := m_inst.name.split("__", false, 1)
	if parts.size() >= 1 and prefix_targets.has(parts[0]) and prefix_targets[parts[0]] != null:
		target_parent = prefix_targets[parts[0]]

	_trim_babylon_mesh_extremities(m_inst)
	# 4.2 Elevar y centrar la escultura de Astalagan sobre su nuevo pedestal circular escalonado en (85.80, 9.54, 93.35)
	if "astalagan-weathered-stone" in m_inst.name.to_lower():
		var ast_pivot := Vector3(86.25, 9.00, 92.38)
		var ast_target := Vector3(85.80, 9.54, 93.35)
		var ast_scale := Vector3(1.16, 1.20, 1.16)
		m_inst.scale = ast_scale
		m_inst.position = ast_target - Vector3(ast_pivot.x * ast_scale.x, ast_pivot.y * ast_scale.y, ast_pivot.z * ast_scale.z)
	_apply_babylon_material(m_inst)
	if m_inst.name.to_lower().begins_with("a1bedrock__"):
		# Evitar que los peñascos divisorios proyecten sombra negra opaca sobre las camas interiores cuando el techo está abierto
		m_inst.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	if "cell-floor" in m_inst.name.to_lower():
		# Bajar 6cm el suelo original de Babylon para que su antiguo bordillo de z=86.05m quede oculto bajo las lajas nuevas de cada celda
		m_inst.position.y -= 0.06
	var m_low := m_inst.name.to_lower()
	if "flame" in m_low or "embers" in m_low or "fire-core" in m_low or "coal-heat" in m_low:
		_night_glb_nodes.append(m_inst)
	if _is_walkable_glb_mesh(m_inst.name) or _should_collide_glb_mesh(m_inst.name):
		_create_babylon_mesh_collision(m_inst)
		if _is_camera_occluder_glb_mesh(m_inst.name):
			m_inst.add_to_group("camera_occluder")
	target_parent.add_child(m_inst)

func _load_glb_bundle(res_path: String, default_parent: Node3D, prefix_targets: Dictionary) -> void:
	var scene_root := _parse_glb_bundle(res_path)
	if not scene_root:
		return
	var meshes: Array[MeshInstance3D] = []
	_collect_mesh_instances(scene_root, meshes)
	for m_inst in meshes:
		_process_babylon_mesh(m_inst, default_parent, prefix_targets)
	scene_root.queue_free()

func _load_glb_bundle_async(res_path: String, default_parent: Node3D, prefix_targets: Dictionary, tree: SceneTree) -> void:
	var scene_root := _parse_glb_bundle(res_path)
	if not scene_root:
		return
	var meshes: Array[MeshInstance3D] = []
	_collect_mesh_instances(scene_root, meshes)
	var slice_start := Time.get_ticks_msec()
	for m_inst in meshes:
		_process_babylon_mesh(m_inst, default_parent, prefix_targets)
		if Time.get_ticks_msec() - slice_start >= 650:
			await tree.process_frame
			slice_start = Time.get_ticks_msec()
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
	if m_inst.mesh == null or m_inst.mesh.get_surface_count() == 0:
		return
	var low := m_inst.name.to_lower()
	if not (low.begins_with("shore__a1_plaza") or low.begins_with("conn__a1_plaza")):
		m_inst.create_trimesh_collision()
		return
	var mesh := m_inst.mesh
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
			# 4. Cuerda/poste atravesado en cruce EastStairs / A2 / Upper (x=154.44..154.72)
			if v.x > 154.35 and v.x < 154.75 and v.z > 65.90 and v.z < 69.85 and v.y > 14.7 and v.y < 17.6:
				return true
			# 5. Poste/cuerda atravesado arriba de escalera Z2 Tramo 3 (x=66.1)
			if v.x > 66.00 and v.x < 66.22 and v.z > 100.35 and v.z < 101.98 and v.y > 8.8 and v.y < 10.2:
				return true
			# 6. Poste/cuerda atravesado arriba de escalera Upper -> A5 (x=49.46)
			if v.x > 49.30 and v.x < 49.65 and v.z > 64.45 and v.z < 67.55 and v.y > 26.8 and v.y < 28.6:
				return true
			# 7. Cuerdas transversales heredadas que bloquean la subida norte desde el puente A5 (todo el corredor transitable x=50.8..53.95)
			if v.x >= 50.80 and v.x <= 53.95 and v.z >= 47.60 and v.z <= 65.00 and v.y >= 25.50 and v.y <= 36.20:
				return true
			# 8. Cuerda transversal bloqueando boca del sendero al Observatorio (z=49.1..49.85) y giro z=44.8..47.6
			if v.x > 139.46 and v.x < 141.05 and v.z > 49.05 and v.z < 49.90 and v.y > 18.2 and v.y < 19.6:
				return true
			if v.x > 139.65 and v.x < 143.95 and v.z > 44.80 and v.z < 47.60 and v.y > 19.5 and v.y < 24.5:
				return true
			# 9. Antiguas barandillas estrechas del puente Upper <-> A5 (sustituidas por el puente ancho con doble cuerda)
			if v.x > 49.70 and v.x < 76.50 and v.z > 64.15 and v.z < 67.65 and v.y > 17.8 and v.y < 28.6:
				return true
			# 10. Fase 2: Retirar todas las cuerdas/postes heredados en Z2 Playa->A1 (sustituidos por cuerdas estrictamente perimetrales Z2_PerimeterRopes)
			if v.x >= 29.50 and v.x <= 66.40 and v.z >= 98.50 and v.z <= 111.50 and v.y >= 0.15 and v.y <= 10.40:
				return true
			# 11. Fase 2: Retirar todas las cuerdas/postes heredados en Paseo->A2 y Acantilado Este A1<->A2 (elimina la cuerda cruzando las escaleras)
			if v.x >= 145.10 and v.x <= 156.60 and v.z >= 65.40 and v.z <= 72.80 and v.y >= 14.50 and v.y <= 19.30:
				return true
			if v.x >= 152.30 and v.x <= 156.60 and v.z >= 69.00 and v.z <= 94.80 and v.y >= 8.60 and v.y <= 16.30:
				return true
			# 12. Fase 2: Retirar valla transversal de Babylon que tapaba el desembarco superior de la escalera Norte de A5 y el giro hacia la cresta oeste
			if v.x >= 46.20 and v.x <= 54.30 and v.z >= 44.00 and v.z <= 50.10 and v.y >= 33.20 and v.y <= 36.20:
				return true
			# 13. Fase 3: Retirar cuerda/poste residual sobresaliendo del barril NE dentro del Comedor A3
			if v.x >= 131.60 and v.x <= 132.60 and v.z >= 48.50 and v.z <= 51.50 and v.y >= 17.30 and v.y <= 19.00:
				return true
	return false

const A1_CELL_INNER_BOXES: Array[Rect2] = [
	Rect2(76.75, 76.2, 7.80, 11.6),
	Rect2(85.55, 76.2, 9.10, 11.6),
	Rect2(95.75, 76.2, 10.20, 11.6),
	Rect2(107.05, 76.2, 10.20, 11.6),
	Rect2(118.25, 76.2, 7.85, 11.6),
	Rect2(127.15, 76.2, 9.10, 11.6),
]
const A1_DOOR_XS: Array[float] = [81.75, 90.75, 101.25, 111.75, 122.25, 131.25]

static func _aabb_intersects(a: AABB, min_x: float, min_y: float, min_z: float, max_x: float, max_y: float, max_z: float) -> bool:
	return a.end.x >= min_x and a.position.x <= max_x and a.end.y >= min_y and a.position.y <= max_y and a.end.z >= min_z and a.position.z <= max_z

func _should_run_custom_trim_for_mesh(aabb: AABB, low: String) -> bool:
	if (low == "r3land__a1_dark-oak-v5" or low == "v4__a1_plaza-v6" or low == "v4__wood_oiled_used" or low == "r3land__a1_oak-v5" or low == "v4__hemp_rope_used" or low == "r3land__r3_rope") and (_aabb_intersects(aabb, 78.5, 17.8, 62.6, 134.0, 20.6, 65.65) or _aabb_intersects(aabb, 76.0, 18.0, 58.0, 80.5, 19.6, 64.6) or _aabb_intersects(aabb, 48.0, 26.2, 62.8, 53.2, 29.8, 69.2) or _aabb_intersects(aabb, 14.5, 20.5, 41.5, 55.0, 38.5, 50.0)):
		return true
	if low in ["sal1__a1_coastal-cliff-v10", "sal3__a1_earth-v6", "sal4__a1_coastal-cliff-v10", "r3paths__a1_coastal-cliff-v10", "r3land__a1_coastal-cliff-v10", "geo12__a1_coastal-cliff-v10", "stones3__stonecontact_a1_coastal-cliff-v10"] and _aabb_intersects(aabb, 14.5, 20.5, 41.8, 54.8, 39.5, 50.2):
		return true
	if low in ["r3land__r3_flower_cream", "r3land__r3_lavender"] and _aabb_intersects(aabb, 73.5, 11.0, 81.0, 139.0, 16.4, 90.6):
		return true
	if low == "v4__a1_plaza-v6" and (_aabb_intersects(aabb, 49.2, 17.8, 47.5, 76.8, 35.2, 67.8) or _aabb_intersects(aabb, 151.3, 8.6, 65.5, 156.6, 16.2, 94.8)):
		return true
	if low == "r3land__a1_coastal-cliff-v10" and (_aabb_intersects(aabb, 29.7, 0.18, 98.6, 66.3, 9.3, 111.4) or _aabb_intersects(aabb, 145.1, 14.8, 65.5, 155.0, 18.3, 69.5) or _aabb_intersects(aabb, 84.5, 17.95, 52.8, 86.4, 18.75, 63.2)):
		return true
	# Fases 3 y 4: Retirar losa plana invasora P1__a1_coastal-cliff-v10 (sepultaba 5 estanterías en A4 y el muro de cocina A3), los bordillos A4Fin/A3Fin y el antiguo borde enterrado oeste en A4
	if low == "p1__a1_coastal-cliff-v10" and _aabb_intersects(aabb, 92.0, 17.6, 50.0, 121.0, 22.0, 52.6):
		return true
	if (low == "a4fin__a1_carved-cliff-v10" or low == "a3fin__a1_carved-cliff-v10") and _aabb_intersects(aabb, 85.0, 17.8, 49.5, 133.5, 22.0, 64.5):
		return true
	if low == "r3land__a1_earth-v6" and _aabb_intersects(aabb, 84.5, 17.95, 52.8, 86.4, 18.75, 63.2):
		return true
	if low.begins_with("a4__basalt_carved") or low.begins_with("a3__basalt_carved"):
		if aabb.position.z < 64.85:
			return true
		if low.begins_with("a4__basalt_carved") and aabb.end.x >= 100.4 and aabb.position.x <= 105.2 and aabb.end.y > 18.02:
			return true
		if low.begins_with("a3__basalt_carved") and aabb.end.x >= 115.2 and aabb.position.x <= 119.6 and aabb.end.y > 18.02:
			return true
	# Fase 1: eliminar pino/vegetación invasora dentro de A3 este y bloques/vegetación residuales dentro de A4 y sus portadas; Fase 7+: limpiar parche ruidoso de hierba al este del Observatorio
	if (low.begins_with("r3land__r3_") or low.begins_with("p5__refinement_pine") or low.begins_with("p5__a1_dark-oak") or low.begins_with("conn__a1_painted-foliage") or low.begins_with("conn__a1_dark-oak") or low.begins_with("v2garden__") or low.begins_with("stones3_stone_p6__") or low.begins_with("geo11__") or low.begins_with("geo12__")) and (_aabb_intersects(aabb, 83.8, 17.8, 48.0, 136.6, 26.8, 66.4) or _aabb_intersects(aabb, 142.0, 17.4, 47.4, 153.0, 19.0, 65.4)):
		return true
	if low.begins_with("a2__basalt_carved") and aabb.end.x >= 155.0 and aabb.end.y > 14.92:
		return true
	if low == "r3paths__a1_plaza-v6":
		if _aabb_intersects(aabb, 14.5, -1000.0, 43.0, 54.5, 1000.0, 64.7) or _aabb_intersects(aabb, 139.0, -1000.0, 20.0, 147.6, 1000.0, 49.8) or _aabb_intersects(aabb, 158.5, -1000.0, 27.0, 162.5, 1000.0, 35.0):
			return true
	if low == "a5__stone_bahamut_quiet_limestone" and aabb.end.y > 27.15 and (aabb.position.x < 36.5 or aabb.end.x > 44.5):
		return true
	if (low == "r3land__a1_dark-oak-v5" or low == "r3land__a1_oak-v5") and _aabb_intersects(aabb, 16.5, -1000.0, 109.5, 28.5, 1.5, 1000.0):
		return true
	if (low == "shore__a1_coastal-cliff-v10" or low == "stones3__stonecontact_a1_coastal-cliff-v10" or low == "p3terrain__a1_coastal-cliff-v10") and _aabb_intersects(aabb, 18.0, -1000.0, 112.0, 27.2, 0.70, 1000.0):
		return true
	if low == "conn__a1_coastal-cliff-v10" and aabb.end.z > 105.0 and aabb.position.y < 0.10:
		return true
	if low == "geo14__a1_coastal-cliff-v10" and aabb.position.x < 42.0 and aabb.end.z > 110.5 and aabb.position.y < 0.35:
		return true
	if low == "conn__a1_plaza-v6" or low == "shore__a1_plaza-v6":
		return true
	if (low == "r3land__a1_earth-v6" or low == "conn__a1_earth-v6") and _aabb_intersects(aabb, 139.0, 17.7, 49.5, 143.0, 1000.0, 64.8):
		return true
	if low == "conn__a1_earth-v6" and aabb.position.x < 29.0 and aabb.end.z > 106.0 and aabb.position.y < 1.2:
		return true
	var is_a1_cliff_piece := (
		(low.begins_with("a1room__") or low.begins_with("p1__") or low.begins_with("a1fin__") or low.begins_with("v4__") or low.begins_with("a1bedrock__") or low.begins_with("a1ctx__") or low.begins_with("p3terrain__") or low.begins_with("stones3__") or low.begins_with("r3land__") or low.begins_with("p5__") or low.begins_with("conn__") or low.begins_with("shore__"))
		and ("carved-cliff" in low or "coastal-cliff" in low or "earth" in low or "wood" in low or "oak" in low or "rope" in low or "plaza" in low or "limestone" in low)
	)
	if is_a1_cliff_piece:
		if low.begins_with("a1room__") and aabb.end.y >= 11.20:
			return true
		if _aabb_intersects(aabb, 75.8, 8.92, 76.2, 137.2, 17.62, 90.6):
			return true
	return false

func _should_drop_custom_glb_tri(v0: Vector3, v1: Vector3, v2: Vector3, low: String) -> bool:
	# Eliminar bancos/apliques/tablas exteriores soterrados frente a A4/A3 (se reconstruyen limpios en Paseo Superior)
	if low == "r3land__a1_dark-oak-v5" or low == "v4__a1_plaza-v6" or low == "v4__wood_oiled_used" or low == "r3land__a1_oak-v5" or low == "v4__hemp_rope_used" or low == "r3land__r3_rope":
		for v in [v0, v1, v2]:
			# Retirar postes y cuerdas heredadas que invadían el cruce A5North / A5RidgeW / Cementerio de Brastos
			if v.x >= 42.5 and v.x <= 54.5 and v.z >= 41.8 and v.z <= 49.5 and v.y >= 33.0 and v.y <= 38.5:
				return true
			if v.x >= 14.5 and v.x <= 50.5 and v.z >= 42.2 and v.z <= 46.2 and v.y >= 20.5 and v.y <= 36.8:
				return true
			if v.x >= 78.5 and v.x <= 134.0 and v.z >= 62.6 and v.z <= 65.65 and v.y >= 17.8 and v.y <= 20.6:
				return true
			# Retirar postes/cuerdas heredados que sobresalían en la llegada de la escalinata A5 (x=48.0..53.2, z=62.8..69.2)
			if v.x >= 48.0 and v.x <= 53.2 and v.z >= 62.8 and v.z <= 69.2 and v.y >= 26.2 and v.y <= 29.8:
				return true
			# Pulido Z7: retirar antiguo banco de madera redundante dentro de Jardines Z7 (reemplazado por Z7_GardenStoneBench)
			if (low == "r3land__a1_oak-v5" or low == "r3land__a1_dark-oak-v5") and v.x >= 76.0 and v.x <= 80.5 and v.z >= 58.0 and v.z <= 64.6 and v.y >= 18.0 and v.y <= 19.6:
				return true
			if low == "v4__a1_plaza-v6" and v.x >= 49.2 and v.x <= 76.8 and v.z >= 64.1 and v.z <= 67.8 and v.y >= 17.8 and v.y <= 27.6:
				return true
			if low == "v4__a1_plaza-v6" and v.x >= 49.5 and v.x <= 54.5 and v.z >= 47.5 and v.z <= 64.2 and v.y >= 25.5 and v.y <= 35.2:
				return true
			if low == "v4__a1_plaza-v6" and v.x >= 151.3 and v.x <= 156.6 and v.z >= 65.5 and v.z <= 94.8 and v.y >= 8.6 and v.y <= 16.2:
				return true
	# Despejar bultos rocosos heredados que sepultaban el cruce A5North / A5RidgeW / Cementerio de Brastos
	if low in ["sal1__a1_coastal-cliff-v10", "sal3__a1_earth-v6", "sal4__a1_coastal-cliff-v10", "r3paths__a1_coastal-cliff-v10", "r3land__a1_coastal-cliff-v10", "geo12__a1_coastal-cliff-v10", "stones3__stonecontact_a1_coastal-cliff-v10"]:
		for v in [v0, v1, v2]:
			if v.x >= 42.8 and v.x <= 54.6 and v.z >= 42.0 and v.z <= 49.6 and v.y >= 34.35:
				return true
			if v.x >= 14.6 and v.x <= 50.4 and v.z >= 42.0 and v.z <= 46.4:
				var ridge_y := lerpf(21.1, 34.5, clampf((v.x - 15.2) / 34.3, 0.0, 1.0))
				if v.y >= ridge_y - 0.15:
					return true
	# Limpiar flores planas heredadas que flotaban sobre la roca desnuda encima de los portales A1
	if low in ["r3land__r3_flower_cream", "r3land__r3_lavender"]:
		for v in [v0, v1, v2]:
			if v.x >= 73.5 and v.x <= 139.0 and v.z >= 81.0 and v.z <= 90.6 and v.y >= 11.0 and v.y <= 16.4:
				return true
	if low == "r3land__a1_coastal-cliff-v10":
		for v in [v0, v1, v2]:
			# Antiguos plintos pequeños de postes sobre Z2 y Paseo->A2 sustituidos por barandillas perimetrales limpias
			if v.x >= 29.7 and v.x <= 66.3 and v.z >= 98.6 and v.z <= 111.4 and v.y >= 0.18 and v.y <= 9.3:
				return true
			if v.x >= 145.1 and v.x <= 155.0 and v.z >= 65.5 and v.z <= 69.5 and v.y >= 14.8 and v.y <= 18.3:
				return true
			# Antiguo bordillo enterrado en el extremo oeste del interior de A4
			if v.x >= 84.5 and v.x <= 86.4 and v.z >= 52.8 and v.z <= 63.2 and v.y >= 17.95 and v.y <= 18.75:
				return true
	# Fases 3 y 4: Retirar losa plana invasora P1__a1_coastal-cliff-v10 (z=50.3..52.3) y bordillos de suelo A4Fin/A3Fin en A4 y A3
	if low == "p1__a1_coastal-cliff-v10":
		for v in [v0, v1, v2]:
			if v.x >= 92.0 and v.x <= 121.0 and v.z >= 50.0 and v.z <= 52.6 and v.y >= 17.6 and v.y <= 22.0:
				return true
	if low == "a4fin__a1_carved-cliff-v10" or low == "a3fin__a1_carved-cliff-v10":
		for v in [v0, v1, v2]:
			if v.x >= 85.0 and v.x <= 133.5 and v.z >= 49.5 and v.z <= 64.5 and v.y >= 17.85 and v.y <= 22.0:
				return true
	if low == "r3land__a1_earth-v6":
		for v in [v0, v1, v2]:
			if v.x >= 84.5 and v.x <= 86.4 and v.z >= 52.8 and v.z <= 63.2 and v.y >= 17.95 and v.y <= 18.75:
				return true
	# Eliminar muros estrechos y tabiques interiores anteriores de A4 y A3 (y liberar completamente ambos arcos de portada)
	if low.begins_with("a4__basalt_carved") or low.begins_with("a3__basalt_carved"):
		for v in [v0, v1, v2]:
			if v.z < 64.85:
				return true
			if low.begins_with("a4__basalt_carved") and v.x >= 100.4 and v.x <= 105.2 and v.z >= 63.6 and v.z <= 66.4 and v.y > 18.02:
				return true
			if low.begins_with("a3__basalt_carved") and v.x >= 115.2 and v.x <= 119.6 and v.z >= 63.6 and v.z <= 66.4 and v.y > 18.02:
				return true
	# Fase 1: eliminar el pino verde-azulado que atravesaba el muro este de A3 (a3_01/a3_04) y vegetación/roca invasiva dentro de A4/A3 y sus umbrales
	if low.begins_with("r3land__r3_") or low.begins_with("p5__refinement_pine") or low.begins_with("p5__a1_dark-oak") or low.begins_with("conn__a1_painted-foliage") or low.begins_with("conn__a1_dark-oak") or low.begins_with("v2garden__"):
		var is_obs_meadow_noise := (low in ["r3land__r3_grass", "r3land__r3_grass_light", "r3land__r3_lavender", "r3land__r3_flower_cream", "r3land__r3_meadow_base"])
		for v in [v0, v1, v2]:
			# Pulido Observatorio NE: retirar parche moteado plano heredado al este de la escalera del Observatorio (sustituido por bancales basálticos y helechos)
			if is_obs_meadow_noise and v.x >= 142.2 and v.x <= 152.8 and v.z >= 47.5 and v.z <= 65.2 and v.y >= 17.5 and v.y <= 18.8:
				return true
			# Pino y vegetación que invadían A3 y su muro este (x=128.8..136.6, z=48.0..65.6)
			if v.x >= 128.8 and v.x <= 136.6 and v.z >= 48.0 and v.z <= 65.6 and v.y >= 17.5 and v.y <= 26.8:
				return true
			# Vegetación/troncos residuales dentro del volumen interior de A4 (x=83.8..112.9, z=49.5..65.2) y A3 (x=113.1..134.8, z=49.2..65.2)
			if v.x >= 83.8 and v.x <= 134.8 and v.z >= 49.2 and v.z <= 65.2 and v.y >= 17.8 and v.y <= 24.5:
				return true
			# Restos de madera/corteza en la portada de A4 (x=100.4..105.2, z=63.4..66.4)
			if v.x >= 100.4 and v.x <= 105.2 and v.z >= 63.4 and v.z <= 66.4 and v.y >= 17.9 and v.y <= 22.8:
				return true
	if low.begins_with("stones3_stone_p6__") or low.begins_with("geo11__") or low.begins_with("geo12__"):
		for v in [v0, v1, v2]:
			# Recortar únicamente los vértices rocosos de Babylon que invadían el espacio interior habitable de A4 y A3
			if v.x >= 84.0 and v.x <= 112.6 and v.z >= 49.9 and v.z <= 64.7 and v.y >= 18.06 and v.y <= 23.2:
				return true
			if v.x >= 113.3 and v.x <= 134.3 and v.z >= 49.6 and v.z <= 64.7 and v.y >= 18.06 and v.y <= 23.2:
				return true
	# Recortar espolón rocoso que invadía el suelo interior de la casa ampliada del cabrestante A2
	if low.begins_with("a2__basalt_carved"):
		for v in [v0, v1, v2]:
			if v.x >= 155.0 and v.y > 14.92:
				return true
	# Ocultar rampas negras de R3Paths__a1_plaza-v6 en los tramos de montaña sustituidos por peldaños tallados
	if low == "r3paths__a1_plaza-v6":
		for v in [v0, v1, v2]:
			if v.x >= 50.5 and v.x <= 54.5 and v.z >= 47.4 and v.z <= 64.7:
				return true
			if v.x >= 14.5 and v.x <= 50.5 and v.z >= 43.0 and v.z <= 46.0:
				return true
			if v.x >= 139.0 and v.x <= 147.6 and v.z >= 20.0 and v.z <= 49.8:
				return true
			if v.x >= 158.5 and v.x <= 162.5 and v.z >= 27.0 and v.z <= 35.0:
				return true
	# Retirar columnas interiores originales del templo A5 para dejar exclusivamente las 4 columnas volcánicas
	if low == "a5__stone_bahamut_quiet_limestone":
		for v in [v0, v1, v2]:
			if v.y > 27.15 and (v.x < 36.5 or v.x > 44.5):
				return true
	# Retirar antiguo espigón comercial y peñascos/losas cuadradas en la dársena del muelle Z1 y Z2
	if low == "r3land__a1_dark-oak-v5" or low == "r3land__a1_oak-v5":
		for v in [v0, v1, v2]:
			if v.x >= 16.5 and v.x <= 28.5 and v.z >= 109.5 and v.y <= 1.5:
				return true
	if low == "shore__a1_coastal-cliff-v10" or low == "stones3__stonecontact_a1_coastal-cliff-v10" or low == "p3terrain__a1_coastal-cliff-v10":
		for v in [v0, v1, v2]:
			if v.x >= 18.0 and v.x <= 27.2 and v.z >= 112.0 and v.y < 0.70:
				return true
	if low == "conn__a1_coastal-cliff-v10":
		for v in [v0, v1, v2]:
			if v.z > 105.0 and v.y < 0.10:
				return true
	if low == "geo14__a1_coastal-cliff-v10":
		for v in [v0, v1, v2]:
			if v.x < 42.0 and v.z > 110.5 and v.y < 0.35:
				return true
	if low == "conn__a1_plaza-v6":
		for v in [v0, v1, v2]:
			if v.x < 28.6 or v.z > 112.0 or v.z < 107.2 or v.y < 0.05:
				return true
	if low == "shore__a1_plaza-v6":
		for v in [v0, v1, v2]:
			if v.x < 29.4 or v.z > 112.0:
				return true
	# Limpiar parches sueltos de tierra en la senda al Observatorio para evitar z-fighting y el parche cuadrado en arena Z1
	if low == "r3land__a1_earth-v6" or low == "conn__a1_earth-v6":
		for v in [v0, v1, v2]:
			if v.x >= 139.0 and v.x <= 143.0 and v.z >= 49.5 and v.z <= 64.8 and v.y >= 17.7:
				return true
			if low == "conn__a1_earth-v6" and v.x < 29.0 and v.z > 106.0 and v.y < 1.2:
				return true
	# 1.7 Eliminar dientes almenados ortogonales, tabiques interiores atravesados, techos estáticos de Babylon sobre celdas y marcos H frontales fijos
	var is_a1_cliff_piece := (
		(low.begins_with("a1room__") or low.begins_with("p1__") or low.begins_with("a1fin__") or low.begins_with("v4__") or low.begins_with("a1bedrock__") or low.begins_with("a1ctx__") or low.begins_with("p3terrain__") or low.begins_with("stones3__") or low.begins_with("r3land__") or low.begins_with("p5__") or low.begins_with("conn__") or low.begins_with("shore__"))
		and ("carved-cliff" in low or "coastal-cliff" in low or "earth" in low or "wood" in low or "oak" in low or "rope" in low or "plaza" in low or "limestone" in low)
	)
	if is_a1_cliff_piece:
		var tri_min_x := minf(v0.x, minf(v1.x, v2.x))
		var tri_max_x := maxf(v0.x, maxf(v1.x, v2.x))
		var tri_min_y := minf(v0.y, minf(v1.y, v2.y))
		var tri_max_y := maxf(v0.y, maxf(v1.y, v2.y))
		var tri_min_z := minf(v0.z, minf(v1.z, v2.z))
		var tri_max_z := maxf(v0.z, maxf(v1.z, v2.z))
		if low.begins_with("a1room__") and tri_max_y >= 11.20:
			return true
		if tri_max_x < 75.8 or tri_min_x > 137.2 or tri_max_z < 76.2 or tri_min_z > 90.6 or tri_max_y < 8.92 or tri_min_y > 17.62:
			return false
		var tri_mid := (v0 + v1 + v2) / 3.0
		var sample_pts := [v0, v1, v2, tri_mid, (v0 + v1) * 0.5, (v1 + v2) * 0.5, (v2 + v0) * 0.5]
		var is_floor_mat := ("plaza" in low or "limestone" in low)
		var min_front_y := 9.05 if is_floor_mat else 8.92
		var check_front := (low.begins_with("a1room__") or low.begins_with("p1__") or low.begins_with("a1fin__") or low.begins_with("v4__") or low.begins_with("a1ctx__") or low.begins_with("r3land__") or low.begins_with("p5__") or low.begins_with("conn__") or low.begins_with("shore__"))
		for v in sample_pts:
			# Frente de celdas y antiguo umbral z=85.2..90.4 (x=75.8..137.2): elimina el antiguo bordillo/barra de z=86.25 y los postes/cuerdas en los vanos
			if check_front and v.x >= 75.8 and v.x <= 137.2 and v.z >= 85.15 and v.z <= 90.4 and v.y >= min_front_y and v.y <= 14.5:
				return true
			# Despejar el interior habitable y el cielo de cada celda (y=9.05..17.62) de bloques o techos estáticos que impidan ver la cama al abrir CaveRoof
			if v.y >= 9.05 and v.y <= 17.62:
				for cb in A1_CELL_INNER_BOXES:
					if cb.has_point(Vector2(v.x, v.z)):
						return true
			# Despejar cualquier barra o dintel antiguo atravesado en los 6 vanos de puerta (z=84.0..90.6)
			if v.z >= 84.0 and v.z <= 90.6 and v.y >= 9.05 and v.y <= 14.0:
				for dx_door in A1_DOOR_XS:
					if absf(v.x - dx_door) <= 1.85:
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
	var check_custom_trim := (
		low == "r3land__a1_dark-oak-v5" or low == "v4__a1_plaza-v6"
		or low == "v4__wood_oiled_used" or low == "r3land__a1_oak-v5"
		or low == "v4__hemp_rope_used" or low == "r3land__r3_rope"
		or low.begins_with("a4__basalt_carved") or low.begins_with("a3__basalt_carved")
		or low == "a4fin__a1_carved-cliff-v10" or low == "a3fin__a1_carved-cliff-v10"
		or low.begins_with("a2__basalt_carved")
		or low.begins_with("r3land__r3_") or low.begins_with("p5__refinement_pine") or low.begins_with("p5__a1_dark-oak")
		or low.begins_with("conn__a1_painted-foliage") or low.begins_with("conn__a1_dark-oak") or low.begins_with("v2garden__")
		or low.begins_with("stones3_stone_p6__") or low.begins_with("geo11__") or low.begins_with("geo12__")
		or low == "r3paths__a1_plaza-v6" or low == "r3land__a1_earth-v6" or low == "conn__a1_earth-v6"
		or low == "a5__stone_bahamut_quiet_limestone" or low == "shore__a1_coastal-cliff-v10"
		or low == "conn__a1_plaza-v6" or low == "shore__a1_plaza-v6" or low == "geo14__a1_coastal-cliff-v10" or low == "conn__a1_coastal-cliff-v10"
		or low == "stones3__stonecontact_a1_coastal-cliff-v10" or low == "p3terrain__a1_coastal-cliff-v10"
		or low in ["sal1__a1_coastal-cliff-v10", "sal3__a1_earth-v6", "sal4__a1_coastal-cliff-v10", "r3paths__a1_coastal-cliff-v10"]
		or ((low.begins_with("a1room__") or low.begins_with("p1__") or low.begins_with("a1fin__") or low.begins_with("v4__") or low.begins_with("a1bedrock__") or low.begins_with("a1ctx__") or low.begins_with("p3terrain__") or low.begins_with("stones3__") or low.begins_with("r3land__") or low.begins_with("p5__") or low.begins_with("conn__") or low.begins_with("shore__")) and ("carved-cliff" in low or "coastal-cliff" in low or "earth" in low or "wood" in low or "oak" in low or "rope" in low or "plaza" in low or "limestone" in low))
	)
	if not check_sw and not check_ne_fence and not check_c6_cavity and not check_custom_trim:
		return

	var is_sal := low.begins_with("sal4__") or low.begins_with("sal1__")
	var is_foliage_sw := ("pine" in low or "foliage" in low or "bark" in low or "olive" in low)
	var sw_max_x := 27.5 if is_sal else (20.4 if (is_foliage_sw or "oak" in low) else 17.6)
	var xf := m_inst.transform
	var aabb := xf * m_inst.get_aabb()
	var touches_sw := check_sw and (aabb.position.x < sw_max_x and aabb.end.z > 72.0 and aabb.position.y < 10.6)
	var touches_ne := check_ne_fence and (aabb.end.x > 158.5 and aabb.position.z < 27.3 and aabb.end.y > 31.8)
	var touches_c6 := check_c6_cavity and (aabb.end.x > 128.0 and aabb.position.x < 135.2 and aabb.end.z > 77.8 and aabb.position.z < 87.0 and aabb.end.y > 9.12)
	var trim_stair_fences := check_ne_fence
	var run_custom := check_custom_trim and _should_run_custom_trim_for_mesh(aabb, low)
	if not touches_sw and not touches_ne and not touches_c6 and not trim_stair_fences and not run_custom:
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
				var w0 := xf * verts[i0]
				var w1 := xf * verts[i1]
				var w2 := xf * verts[i2]
				if _should_drop_babylon_tri(w0, w1, w2, touches_sw, is_sal, is_foliage_sw, touches_ne, touches_c6, trim_stair_fences) or (run_custom and _should_drop_custom_glb_tri(w0, w1, w2, low)):
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
				var w0 := xf * verts[b_i]
				var w1 := xf * verts[b_i + 1]
				var w2 := xf * verts[b_i + 2]
				if _should_drop_babylon_tri(w0, w1, w2, touches_sw, is_sal, is_foliage_sw, touches_ne, touches_c6, trim_stair_fences) or (run_custom and _should_drop_custom_glb_tri(w0, w1, w2, low)):
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
	if low.begins_with("a1room__") or low.begins_with("a1fin__"):
		return true
	if low.begins_with("p1__") and "carved-cliff" in low:
		return true
	if low.begins_with("v4__") and ("carved-cliff" in low or "garden-soil" in low or "v2_leaves" in low or "v4_flowers" in low):
		return true
	if low.begins_with("a1plazaprop__"):
		if "astalagan" in low:
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
		"v5coast__v4_flowers",
		"r3land__r3_lamp",
		"a5__wood_endgrain",
		"a2__wood_oiled_used",
		"a2__wood_endgrain",
		"a2__hemp_rope_used",
		"a2__iron_blackened",
		"a2__stone_floor_worn",
		"p2__a1_dark-oak-v5",
		# Fase 5: sustituir pinos cónicos y olivos esféricos heredados de Babylon (~938K tris) por bosque mediterráneo orgánico unificado
		"r3land__r3_pine_dark",
		"r3land__r3_pine_sun",
		"r3land__r3_olive",
		"r3land__r3_bark",
		"p5__refinement_pine_needles",
		# Auditoría 24/11: sustituir bolas icosaédricas low-poly en jardineras de Z2 y tarjetas flotantes sobre pared A1
		"shore__a1_extension_small_flowers",
		"shore__a1_extension_herbs",
		"a1bedrock__a1_painted-foliage-sage-v6"
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
	# Safe_A5_Temple ya cubre el suelo del templo A5; las losas A5__Stone_Floor_* a y=26.94 bloqueaban el deslizamiento.
	if low.begins_with("a5__stone_floor"):
		return false
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
			fbm.backlight = Color(0.09, 0.14, 0.06)
			fbm.roughness = minf(fbm.roughness, 0.86)
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
		Color("#3f5434"), Color("#4d613c"), Color("#5b6e47"), Color("#677652"), Color("#475939")
	]
	var flower_palette: Array[Color] = [
		Color("#f8f5ec"), Color("#f2ece0"), Color("#9a7bc8"), Color("#896bb8"), Color("#e5d57e"), Color("#d8869a"), Color("#f6f2e6")
	]

	var add_planter_cluster := func(center: Vector3, span_x: float, count: int, with_ivy: bool) -> void:
		for i in range(count):
			var ox := rng.randf_range(-span_x * 0.45, span_x * 0.45)
			var oz := rng.randf_range(-0.22, 0.22)
			var sc := rng.randf_range(0.45, 0.76)
			var b := Basis.from_euler(Vector3(rng.randf_range(-0.14, 0.14), rng.randf_range(0.0, TAU), rng.randf_range(-0.14, 0.14)))
			b = b.scaled(Vector3(sc * 1.10, sc * 1.00, sc * 1.10))
			shrub_xf.append(Transform3D(b, center + Vector3(ox, 0.04, oz)))
			shrub_col.append(green_palette[rng.randi() % green_palette.size()])

			for _fl in range(2):
				if rng.randf() < 0.80:
					var fc: Color = flower_palette[rng.randi() % flower_palette.size()]
					var fsc := rng.randf_range(0.22, 0.36)
					var fb := Basis.from_euler(Vector3(0.0, rng.randf_range(0.0, TAU), 0.0)).scaled(Vector3(fsc, fsc, fsc))
					flower_xf.append(Transform3D(fb, center + Vector3(ox + rng.randf_range(-0.15, 0.15), sc * 0.40 + 0.06, oz + rng.randf_range(-0.14, 0.14))))
					flower_col.append(fc)

		if with_ivy:
			var strand_count := maxi(4, int(round(span_x * 3.0)))
			for j in range(strand_count):
				var ix := lerpf(-span_x * 0.45, span_x * 0.45, float(j) / float(maxi(1, strand_count - 1))) + rng.randf_range(-0.06, 0.06)
				var drop := rng.randf_range(0.50, 0.92)
				var ib := Basis.from_euler(Vector3(0.04, rng.randf_range(-0.18, 0.18), rng.randf_range(-0.08, 0.08)))
				ib = ib.scaled(Vector3(0.42, drop, 0.36))
				ivy_xf.append(Transform3D(ib, center + Vector3(ix, -0.02, 0.24)))

	# 1. Fase 5: Paseo Superior Z9 con ritmo arquitectónico — 4 grupos de jardineras variados
	#    separados por 4 miradores abiertos al mar con antepecho tallado (frente a A4, frente a A3, oeste y este)
	var upper_trough_specs := [
		# Grupo Oeste (entre farol oeste y mirador x=88.2..92.6)
		[81.0, 2.55, 0.44, 14, true], [84.2, 2.85, 0.38, 11, false], [86.8, 1.95, 0.48, 12, true],
		# Grupo A4 Oeste (entre mirador 1 y mirador frente a portada A4 x=101.0..104.6)
		[94.3, 2.50, 0.44, 14, true], [97.4, 2.75, 0.38, 11, false], [99.8, 1.75, 0.48, 11, true],
		# Grupo Intermedio A4–A3 (entre portada A4 y portada A3 x=115.6..119.2)
		[106.2, 2.25, 0.46, 13, true], [109.2, 2.80, 0.40, 12, true], [112.4, 2.65, 0.44, 14, true], [114.6, 1.45, 0.48, 9, false],
		# Grupo Este A3 (entre portada A3 y mirador farol este x=134.8..138.4)
		[120.8, 2.35, 0.46, 14, true], [123.8, 2.85, 0.38, 11, false], [127.0, 2.60, 0.44, 14, true], [130.2, 2.70, 0.40, 12, true], [133.2, 2.10, 0.48, 12, true],
		# Remate Este hacia rampa A2
		[140.0, 2.50, 0.44, 14, true], [143.1, 2.65, 0.38, 11, false]
	]
	for ut in upper_trough_specs:
		var x_p: float = float(ut[0])
		var tw: float = float(ut[1])
		var th: float = float(ut[2])
		var cnt: int = int(ut[3])
		var has_iv: bool = bool(ut[4])
		var trough := _create_box_prop(planters_node, "UpperTrough_%d" % int(x_p * 10.0), Vector3(x_p, 18.0 + th * 0.5 - 0.02, 71.88), Vector3(tw, th, 0.68), mat_rock_carved)
		trough.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		_create_box_prop(planters_node, "UpperTroughCap_%d" % int(x_p * 10.0), Vector3(x_p, 18.0 + th - 0.01, 71.88), Vector3(tw + 0.08, 0.07, 0.74), mat_upper)
		add_planter_cluster.call(Vector3(x_p, 18.0 + th + 0.01, 71.88), tw * 0.84, cnt, has_iv)

	# 4 Miradores abiertos al mar en el Paseo Superior Z9 (antepecho bajo tallado + pilastras + barandilla vista libre)
	var overlook_bays := [
		[88.2, 92.6],   # Mirador Oeste
		[101.0, 104.6], # Mirador axial frente a Biblioteca A4
		[115.6, 119.2], # Mirador axial frente a Comedor A3
		[134.8, 138.4], # Mirador Este junto a PaseoEastLantern
	]
	for ob_i in range(overlook_bays.size()):
		var bx0: float = float(overlook_bays[ob_i][0])
		var bx1: float = float(overlook_bays[ob_i][1])
		var bmid := (bx0 + bx1) * 0.5
		var bspan := bx1 - bx0
		# Bordillo bajo de piedra tallada dejando ver el mar y los jardines colgantes
		_create_box_prop(planters_node, "PaseoOverlookCurb_%d" % ob_i, Vector3(bmid, 18.13, 71.88), Vector3(bspan, 0.26, 0.56), mat_upper)
		# Pilastras talladas en los extremos del mirador + pasamanos de madera oscura y barra de hierro
		for end_x in [bx0 + 0.16, bx1 - 0.16]:
			_create_box_prop(planters_node, "PaseoOverlookPillar_%d_%d" % [ob_i, int(end_x * 10.0)], Vector3(float(end_x), 18.48, 71.88), Vector3(0.32, 0.96, 0.42), mat_upper)
			_create_box_prop(planters_node, "PaseoOverlookPillarCap_%d_%d" % [ob_i, int(end_x * 10.0)], Vector3(float(end_x), 18.99, 71.88), Vector3(0.38, 0.08, 0.48), mat_plaza)
		_create_box_prop(planters_node, "PaseoOverlookTopRail_%d" % ob_i, Vector3(bmid, 18.88, 71.88), Vector3(bspan - 0.30, 0.08, 0.11), mat_wood_dark)
		_create_box_prop(planters_node, "PaseoOverlookMidRail_%d" % ob_i, Vector3(bmid, 18.54, 71.88), Vector3(bspan - 0.30, 0.05, 0.06), mat_iron)
		# Barrotes verticales sobrios de hierro
		for b_k in range(5):
			var bal_x := lerpf(bx0 + 0.55, bx1 - 0.55, float(b_k) / 4.0)
			_create_box_prop(planters_node, "PaseoOverlookBal_%d_%d" % [ob_i, b_k], Vector3(bal_x, 18.56, 71.88), Vector3(0.045, 0.62, 0.045), mat_iron)
		# Ánfora de barro discreta en un extremo de cada mirador frente a A4/A3
		if ob_i == 1 or ob_i == 2:
			var urn_p := Vector3(bx0 + 0.52, 18.0, 71.48)
			_create_cylinder(planters_node, "PaseoOverlookUrn_%d" % ob_i, urn_p + Vector3(0.0, 0.24, 0.0), 0.22, 0.48, _mat_pottery_glb)
			add_planter_cluster.call(urn_p + Vector3(0.0, 0.48, 0.0), 0.38, 6, false)

	SceneEnhancer.add_box_collider(planters_node, Vector3(110.9, 18.45, 71.88), Vector3(68.2, 1.15, 0.72))

	# Macetas asimétricas flanqueando las portadas de A4 y A3 (ánfora alta + tiesto bajo de hierbas)
	var portal_pot_specs := [
		[99.45, 0.30, 0.56, 9, true],
		[106.05, 0.34, 0.38, 7, false],
		[114.05, 0.33, 0.40, 7, false],
		[120.75, 0.29, 0.54, 10, true]
	]
	for pp in portal_pot_specs:
		var x_pot: float = float(pp[0])
		var pr: float = float(pp[1])
		var ph: float = float(pp[2])
		var u_pot_pos := Vector3(x_pot, 18.0, 65.88)
		var u_pot := _create_cylinder(planters_node, "UpperPot_%d" % int(x_pot * 10.0), u_pot_pos + Vector3(0.0, ph * 0.5, 0.0), pr, ph, _mat_pottery_glb)
		u_pot.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		_create_cylinder(planters_node, "UpperPotRim_%d" % int(x_pot * 10.0), u_pot_pos + Vector3(0.0, ph - 0.03, 0.0), pr + 0.035, 0.06, _mat_pottery_glb)
		SceneEnhancer.add_cyl_collider(planters_node, u_pot_pos + Vector3(0.0, 0.38, 0.0), pr + 0.04, 0.85)
		add_planter_cluster.call(u_pot_pos + Vector3(0.0, ph - 0.02, 0.0), pr * 1.75, int(pp[3]), false)
		if bool(pp[4]):
			var sub_p := u_pot_pos + Vector3(-0.46 if x_pot < 110.0 else 0.46, 0.0, 0.14)
			_create_cylinder(planters_node, "UpperHerbPot_%d" % int(x_pot * 10.0), sub_p + Vector3(0.0, 0.14, 0.0), 0.19, 0.28, _mat_pottery_glb)
			add_planter_cluster.call(sub_p + Vector3(0.0, 0.27, 0.0), 0.34, 5, false)

	# 2. Fase 6 (A1): Jardineras del borde sur de Plaza A1 con ritmo agrupado y 3 miradores abiertos al mar (x=86.5, 103.5, 121.5)
	var a1_open_gaps := [86.5, 103.5, 121.5]
	for x_a1 in [74.0, 76.5, 79.0, 81.5, 84.0, 89.2, 92.0, 94.8, 97.5, 100.5, 106.5, 109.5, 112.5, 115.5, 118.5, 124.5, 127.5, 130.5, 133.5]:
		var cnt_a1 := 13 if int(x_a1) % 2 == 0 else 10
		add_planter_cluster.call(Vector3(float(x_a1), 9.30, 97.08), 2.15, cnt_a1, int(x_a1) % 3 != 0)
	for gap_x in a1_open_gaps:
		var gx := float(gap_x)
		_create_box_prop(planters_node, "A1SouthParapetCurb_%d" % int(gx), Vector3(gx, 9.18, 97.08), Vector3(2.85, 0.34, 0.56), mat_plaza)
		for px_g in [gx - 1.38, gx + 1.38]:
			_create_box_prop(planters_node, "A1SouthParapetPier_%d_%d" % [int(gx), int(px_g * 10.0)], Vector3(px_g, 9.38, 97.08), Vector3(0.32, 0.72, 0.52), mat_upper)
	SceneEnhancer.add_box_collider(planters_node, Vector3(103.8, 9.55, 97.08), Vector3(61.5, 1.30, 0.68))

	# 3. Paso 7 (7.1–7.8): Jardín monástico sereno en A1 — ánforas, jardineras de piedra, hierbas medicinales, flor blanca sencilla, lavanda y útiles de cuidado (regadera, tiestos, cestos)
	var a1_portal_xs := [81.75, 90.75, 101.25, 111.75, 122.25, 131.25]
	for p_idx in range(a1_portal_xs.size()):
		var px := float(a1_portal_xs[p_idx])
		for side_s in [-1.0, 1.0]:
			var pot_pos := Vector3(px + side_s * 1.95, Structure.ELEV_A1_PLAZA, 89.26)
			var pot_h := 0.52 if side_s < 0.0 else 0.44
			var pot_r := 0.31 if side_s < 0.0 else 0.27
			var pot := _create_cylinder(planters_node, "CavePot_%d_%d" % [p_idx + 1, int(side_s)], pot_pos + Vector3(0.0, pot_h * 0.5, 0.0), pot_r, pot_h, _mat_pottery_glb)
			pot.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
			_create_cylinder(planters_node, "CavePotRim_%d_%d" % [p_idx + 1, int(side_s)], pot_pos + Vector3(0.0, pot_h - 0.03, 0.0), pot_r + 0.035, 0.06, _mat_pottery_glb)
			SceneEnhancer.add_cyl_collider(planters_node, pot_pos + Vector3(0.0, 0.38, 0.0), pot_r + 0.04, 0.85)
			add_planter_cluster.call(pot_pos + Vector3(0.0, pot_h, 0.0), 0.58, 11, true)
			# Segundo tiesto bajo de barro con hierbas medicinales junto a la maceta principal (ref. Imagen 2)
			var sub_pos := pot_pos + Vector3(side_s * 0.48, 0.0, 0.12)
			_create_cylinder(planters_node, "CaveHerbPot_%d_%d" % [p_idx + 1, int(side_s)], sub_pos + Vector3(0.0, 0.16, 0.0), 0.21, 0.32, _mat_pottery_glb)
			add_planter_cluster.call(sub_pos + Vector3(0.0, 0.31, 0.0), 0.40, 7, false)

	# 7.2 y 7.7 Jardineras bajas de mampostería monástica junto a la roca entre portales y vegetación colgante en cornisas entre celdas (sin flotar sobre interiores al abrir cutaway)
	for trough_x in [78.0, 86.2, 95.3, 106.5, 117.8, 126.6, 135.2]:
		var tr_pos := Vector3(float(trough_x), Structure.ELEV_A1_PLAZA, 89.08)
		_create_box_prop(planters_node, "A1RockHerbBed_%d" % int(trough_x), tr_pos + Vector3(0.0, 0.16, 0.0), Vector3(1.55, 0.32, 0.56), mat_rock_carved)
		add_planter_cluster.call(tr_pos + Vector3(0.0, 0.32, 0.0), 1.38, 14, true)
		# Vegetación colgante solo sobre los contrafuertes macizos entre celdas (nunca sobre el vano/interior de Celda 1 o Celda 6)
		if float(trough_x) > 84.0 and float(trough_x) < 128.0:
			add_planter_cluster.call(Vector3(float(trough_x), 12.15, 88.55), 1.45, 9, true)

	# 7.8 Detalles de cuidado monástico (regadera de cobre/hierro interactiva, tiestos apilados, cesto de mimbre con salvia y útiles junto a Celda 2 de Tarak y jardín oeste)
	for care_x in [79.1, 93.4, 115.6]:
		var c_base := Vector3(float(care_x), Structure.ELEV_A1_PLAZA, 89.36)
		var care_node := Node3D.new()
		care_node.name = "MonasticGardenCare_%d" % int(care_x)
		care_node.position = c_base
		planters_node.add_child(care_node)
		# Regadera monástica (cuerpo cilíndrico + pico inclinado + asa)
		var can_parent := care_node
		if int(care_x) == 93:
			can_parent = SceneEnhancer.routine_pivot(care_node, "RetreatWateringCan", Vector3.ZERO)
		_create_cylinder(can_parent, "MonasticWateringCan_%d" % int(care_x), Vector3(0.0, 0.17, 0.0), 0.14, 0.34, mat_bronze if int(care_x) == 93 else mat_iron)
		var spout := _create_cylinder(can_parent, "WateringSpout_%d" % int(care_x), Vector3(0.18, 0.22, 0.04), 0.024, 0.28, mat_bronze if int(care_x) == 93 else mat_iron)
		spout.rotation.z = -0.78
		_create_box_prop(can_parent, "WateringHandle_%d" % int(care_x), Vector3(-0.14, 0.22, 0.0), Vector3(0.04, 0.22, 0.04), mat_iron)
		# Tiestos de terracota apilados y cesto bajo de mimbre con hierbas recién cortadas
		_create_cylinder(care_node, "StackedClayPotA_%d" % int(care_x), Vector3(-0.34, 0.12, 0.08), 0.16, 0.24, _mat_pottery_glb)
		_create_cylinder(care_node, "StackedClayPotB_%d" % int(care_x), Vector3(-0.34, 0.26, 0.08), 0.14, 0.20, _mat_pottery_glb)
		_create_cylinder(care_node, "HerbBasket_%d" % int(care_x), Vector3(0.36, 0.10, 0.10), 0.22, 0.20, mat_wood)
		add_planter_cluster.call(c_base + Vector3(0.36, 0.20, 0.10), 0.34, 5, false)
		var w_ip := SceneEnhancer._attach_interactive_prop(care_node, "watering", "Regadera monástica", "[T] Regar hierbas y flores del claustro")
		if w_ip:
			w_ip.interact_radius = 2.15

	# 4. Jardineras apoyadas en tierra firme de Z2_ASCENT, terraza de los Jardines Z7 y terraza de A2 (sin flotar en el acantilado)
	for z2_pos in [
		Vector3(64.8, 9.02, 97.8), Vector3(71.0, 9.02, 90.8),
		Vector3(77.5, 18.02, 58.0), Vector3(80.2, 18.02, 56.2), Vector3(81.8, 18.02, 59.8)
	]:
		_create_box_prop(planters_node, "GardenPlanterBase_%d_%d" % [int(z2_pos.x), int(z2_pos.z)], z2_pos + Vector3(0.0, 0.14, 0.0), Vector3(1.9, 0.30, 0.68), mat_rock_carved)
		add_planter_cluster.call(z2_pos + Vector3(0.0, 0.28, 0.0), 1.65, 10, false)

	var planter_foliage_mat := _make_mat(Color.WHITE, 0.90, 0.0)
	planter_foliage_mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	planter_foliage_mat.backlight_enabled = true
	planter_foliage_mat.backlight = Color(0.09, 0.14, 0.06)
	var planter_ivy_mat := _make_mat(Color("#3e5434"), 0.90, 0.0)
	planter_ivy_mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	planter_ivy_mat.backlight_enabled = true
	planter_ivy_mat.backlight = Color(0.08, 0.13, 0.05)
	var planter_flower_mat := _make_mat(Color.WHITE, 0.72, 0.0)
	planter_flower_mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	planters_node.add_child(_make_multimesh_batch("MM_PlanterFoliage", SceneEnhancer.make_botanical_shrub_mesh(), planter_foliage_mat, shrub_xf, shrub_col))
	planters_node.add_child(_make_multimesh_batch("MM_PlanterIvy", SceneEnhancer.make_hanging_ivy_mesh(), planter_ivy_mat, ivy_xf, []))
	planters_node.add_child(_make_multimesh_batch("MM_PlanterFlowers", SceneEnhancer.make_blossom_cluster_mesh(), planter_flower_mat, flower_xf, flower_col))
	SceneEnhancer.merge_static_children_by_material(planters_node)
	# Fase 5: Terrazas botánicas Z7, jardines colgantes en acantilados y enfoque floral al templo A5
	TempleAndCliffs.build_z7_terraced_gardens(self, self)

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
	var root_xf: Array[Transform3D] = []
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

	# Fase 5.4: Paleta de pinos y encinas costeros mediterráneos coherente con los estratos de basalto y tejados musgosos
	var pine_greens: Array[Color] = [
		Color("#213524"), Color("#2a402b"), Color("#344b32"), Color("#3f5438")
	]
	var oak_greens: Array[Color] = [
		Color("#374a30"), Color("#435739"), Color("#4e6141"), Color("#304129")
	]
	var pleamar_high_clear_pts := [
		Vector2(21.6, 50.2), Vector2(18.6, 48.2), Vector2(15.6, 46.2), Vector2(13.2, 44.5),
		Vector2(11.9, 43.3), Vector2(9.8, 42.0), Vector2(7.2, 41.5), Vector2(4.3, 40.7), Vector2(1.9, 38.4)
	]

	# Añadir árboles mediterráneos orgánicos EXCLUSIVAMENTE en laderas firmes verificadas (z<=61, cero troncos flotantes en escarpes!)
	var all_forest_pts: Array = forest_pts.duplicate()
	var slope_replacements := [
		# Ladera norte detrás del Templo A5 y corredor de montaña (asentados en ladera firme z=54..60)
		{"x": 25.4, "y": 25.6, "z": 58.6, "s": 1.22, "k": "pine"},
		{"x": 28.6, "y": 26.5, "z": 54.4, "s": 1.10, "k": "oak"},
		{"x": 34.4, "y": 27.3, "z": 56.2, "s": 1.18, "k": "pine"},
		{"x": 40.2, "y": 28.1, "z": 55.4, "s": 1.22, "k": "cypress"},
		{"x": 46.4, "y": 27.5, "z": 56.8, "s": 1.14, "k": "pine"},
		{"x": 57.6, "y": 24.2, "z": 57.2, "s": 1.18, "k": "pine"},
		{"x": 62.4, "y": 22.4, "z": 58.4, "s": 1.12, "k": "oak"},
		{"x": 66.2, "y": 21.0, "z": 56.2, "s": 1.16, "k": "pine"},
		{"x": 70.6, "y": 19.6, "z": 56.4, "s": 1.02, "k": "cypress"},
		# Ladera superior despejada al norte de los estratos A4/A3 (z=43.8..45.4, cero copas partidas por roca!)
		{"x": 85.4, "y": 26.2, "z": 44.4, "s": 1.18, "k": "pine"},
		{"x": 96.4, "y": 26.8, "z": 44.0, "s": 1.16, "k": "oak"},
		{"x": 107.8, "y": 26.4, "z": 44.2, "s": 1.22, "k": "pine"},
		{"x": 119.6, "y": 26.4, "z": 44.0, "s": 1.14, "k": "pine"},
		{"x": 131.4, "y": 25.4, "z": 44.6, "s": 1.16, "k": "oak"},
		# Ladera este (despejada de escaleras Observatorio y caseta A2)
		{"x": 150.2, "y": 18.4, "z": 54.0, "s": 1.10, "k": "pine"},
		{"x": 154.0, "y": 17.6, "z": 55.6, "s": 1.02, "k": "oak"},
		{"x": 158.4, "y": 17.0, "z": 55.8, "s": 1.06, "k": "pine"},
		{"x": 162.8, "y": 16.4, "z": 56.2, "s": 0.96, "k": "oak"},
		{"x": 150.4, "y": 20.9, "z": 46.8, "s": 1.16, "k": "pine"},
		{"x": 155.8, "y": 20.0, "z": 49.4, "s": 1.08, "k": "oak"},
		{"x": 161.2, "y": 19.2, "z": 52.8, "s": 1.14, "k": "pine"},
	]
	all_forest_pts.append_array(slope_replacements)

	for pt in all_forest_pts:
		var pos := Vector3(float(pt.get("x", 0.0)), float(pt.get("y", 20.0)) - 0.18, float(pt.get("z", 0.0)))
		if pos.x < 18.0 and pos.z > 84.0 and pos.y < 9.0:
			continue
		# Exclusión estricta de arquitectura, acantilados esculpidos A4/A3, templo A5, puente, escaleras y Cementerio de Brastos (0 trunk/canopy clips!)
		if pos.x >= 40.0 and pos.x <= 50.0 and pos.z >= 34.8 and pos.z <= 45.2:
			continue
		if pos.x >= 29.0 and pos.x <= 51.8 and pos.z >= 59.0 and pos.z <= 78.5:
			continue
		if pos.x >= 49.0 and pos.x <= 77.2 and pos.z >= 59.8 and pos.z <= 71.0:
			continue
		if pos.x >= 48.8 and pos.x <= 55.5 and pos.z >= 45.0 and pos.z <= 64.5:
			continue
		if pos.x >= 14.0 and pos.x <= 51.8 and pos.z >= 40.2 and pos.z <= 48.5:
			continue
		if pos.x >= 73.2 and pos.x <= 138.2 and pos.z >= 46.4 and pos.z <= 66.2:
			continue
		if pos.x >= 136.5 and pos.x <= 149.0 and pos.z >= 17.5 and pos.z <= 54.5:
			continue
		if pos.x >= 121.0 and pos.x <= 147.0 and pos.z >= 17.0 and pos.z <= 23.5:
			continue
		if pos.x >= 157.0 and pos.x <= 164.0 and pos.z >= 26.0 and pos.z <= 36.0:
			continue
		if pos.x >= 152.5 and pos.x <= 168.5 and pos.z >= 58.2 and pos.z <= 73.5:
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
		var lean_x := rng.randf_range(-0.05, 0.05)
		var lean_z := rng.randf_range(-0.05, 0.05)
		var base_b := Basis.from_euler(Vector3(lean_x, yaw, lean_z))

		# Collarín orgánico de raíces en la base del tronco (evita troncos clavados sin arraigo en roca)
		root_xf.append(Transform3D(Basis.from_euler(Vector3(0.0, yaw, 0.0)) * Basis.from_scale(Vector3(0.72 * sc, 0.58 * sc, 0.72 * sc)), pos + Vector3(0.0, 0.06, 0.0)))

		if kind == "pine":
			var th := 3.25 * sc
			trunk_xf.append(Transform3D(base_b * Basis.from_scale(Vector3(0.22 * sc, th, 0.22 * sc)), pos + Vector3(0.0, th * 0.48, 0.0)))
			var tone: Color = pine_greens[rng.randi() % pine_greens.size()]
			var off_m := Vector3(rng.randf_range(-0.24, 0.24) * sc, 0.0, rng.randf_range(-0.24, 0.24) * sc)
			var off_h := Vector3(rng.randf_range(-0.28, 0.28) * sc, 0.0, rng.randf_range(-0.28, 0.28) * sc)
			var b_low := (base_b * Basis.from_euler(Vector3(rng.randf_range(-0.08, 0.08), 0.0, 0.0))) * Basis.from_scale(Vector3(1.88 * sc, 1.36 * sc, 1.80 * sc))
			var b_mid := (base_b * Basis.from_euler(Vector3(0.0, 1.05 + rng.randf_range(-0.25, 0.25), rng.randf_range(-0.07, 0.07)))) * Basis.from_scale(Vector3(1.56 * sc, 1.30 * sc, 1.58 * sc))
			var b_hi := (base_b * Basis.from_euler(Vector3(0.0, 2.25 + rng.randf_range(-0.35, 0.35), 0.0))) * Basis.from_scale(Vector3(1.20 * sc, 1.20 * sc, 1.16 * sc))
			crown_low_xf.append(Transform3D(b_low, pos + Vector3(0.0, 1.98 * sc, 0.0)))
			pine_col_a.append(tone.darkened(0.04))
			crown_mid_xf.append(Transform3D(b_mid, pos + Vector3(0.0, 3.02 * sc, 0.0) + off_m))
			pine_col_b.append(tone.lightened(0.05))
			crown_high_xf.append(Transform3D(b_hi, pos + Vector3(0.0, 3.92 * sc, 0.0) + off_h))
			pine_col_c.append(tone.lightened(0.11))
		elif kind == "cypress":
			var th := 4.4 * sc
			trunk_xf.append(Transform3D(base_b * Basis.from_scale(Vector3(0.17 * sc, th, 0.17 * sc)), pos + Vector3(0.0, th * 0.5, 0.0)))
			var ctone: Color = pine_greens[0].lightened(rng.randf_range(0.0, 0.07))
			crown_low_xf.append(Transform3D(base_b * Basis.from_scale(Vector3(0.84 * sc, 2.25 * sc, 0.84 * sc)), pos + Vector3(0.0, 2.50 * sc, 0.0)))
			pine_col_a.append(ctone)
			crown_mid_xf.append(Transform3D((base_b * Basis.from_euler(Vector3(0.0, 1.15, 0.0))) * Basis.from_scale(Vector3(0.66 * sc, 2.15 * sc, 0.66 * sc)), pos + Vector3(0.0, 4.05 * sc, 0.0)))
			pine_col_b.append(ctone.lightened(0.07))
		else:
			var th := 2.6 * sc
			trunk_xf.append(Transform3D(base_b * Basis.from_scale(Vector3(0.24 * sc, th, 0.24 * sc)), pos + Vector3(0.0, th * 0.5, 0.0)))
			var otone: Color = oak_greens[rng.randi() % oak_greens.size()]
			oak_xf.append(Transform3D(base_b * Basis.from_scale(Vector3(1.92 * sc, 1.44 * sc, 1.86 * sc)), pos + Vector3(0.0, 3.00 * sc, 0.0)))
			oak_col.append(otone)
			oak_xf.append(Transform3D((base_b * Basis.from_euler(Vector3(0.0, 1.1, 0.0))) * Basis.from_scale(Vector3(1.38 * sc, 1.18 * sc, 1.32 * sc)), pos + Vector3(0.38 * sc, 3.52 * sc, -0.28 * sc)))
			oak_col.append(otone.lightened(0.07))

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
	var crown_mat := OcclusionCtrl.make_canopy_dissolve_material(Color.WHITE, 0.90, Color(0.09, 0.14, 0.06), true)
	var fl_mat := _make_mat(Color.WHITE, 0.74, 0.0)
	fl_mat.cull_mode = BaseMaterial3D.CULL_DISABLED

	var trunk_mesh := CylinderMesh.new()
	trunk_mesh.top_radius = 0.45
	trunk_mesh.bottom_radius = 0.72
	trunk_mesh.height = 1.0
	trunk_mesh.radial_segments = 7

	forest_node.add_child(_make_multimesh_batch("MM_ForestTrunks", trunk_mesh, mat_wood_dark, trunk_xf, []))
	if not root_xf.is_empty():
		var mm_roots := _make_multimesh_batch("MM_ForestTreeRoots", _make_gnarled_root_mesh(), mat_wood_dark, root_xf, [])
		mm_roots.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		forest_node.add_child(mm_roots)
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
	# Copa orgánica pictórica de pino mediterráneo costero (smooth_group = -1 para mechones de acículas facetados):
	# 8 ramas anchas asimétricas + 6 subramas escalonadas + 4 penachos irregulares en corona (cero cono rígido!)
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	st.set_smooth_group(-1)
	var rng := RandomNumberGenerator.new()
	rng.seed = 202611235

	var add_bough_tuft := func(origin: Vector3, dir_ang: float, length: float, width: float, thick: float, droop: float, c_top: Color, c_mid: Color, c_bot: Color) -> void:
		var fwd := Vector3(cos(dir_ang), 0.0, sin(dir_ang))
		var right := Vector3(-fwd.z, 0.0, fwd.x)
		var p_root := origin
		var p_mid_top := origin + fwd * (length * 0.46) + Vector3(0.0, thick * 0.64 - droop * 0.16, 0.0)
		var p_mid_l := origin + fwd * (length * 0.50) - right * (width * 0.62) + Vector3(0.0, -droop * 0.24, 0.0)
		var p_mid_r := origin + fwd * (length * 0.50) + right * (width * 0.62) + Vector3(0.0, -droop * 0.24, 0.0)
		var p_mid_bot := origin + fwd * (length * 0.44) + Vector3(0.0, -thick * 0.48 - droop * 0.34, 0.0)
		var p_tip_l := origin + fwd * (length * 0.88) - right * (width * 0.32) + Vector3(0.0, -droop * 0.70, 0.0)
		var p_tip_r := origin + fwd * (length * 0.88) + right * (width * 0.32) + Vector3(0.0, -droop * 0.70, 0.0)
		var p_tip := origin + fwd * length + Vector3(0.0, -droop * 0.82 + thick * 0.18, 0.0)

		# Cara superior soleada del ramillete de acículas
		st.set_color(c_mid); st.add_vertex(p_root); st.set_color(c_top); st.add_vertex(p_mid_top); st.set_color(c_mid); st.add_vertex(p_mid_l)
		st.set_color(c_mid); st.add_vertex(p_root); st.set_color(c_mid); st.add_vertex(p_mid_r); st.set_color(c_top); st.add_vertex(p_mid_top)
		st.set_color(c_top); st.add_vertex(p_mid_top); st.set_color(c_top); st.add_vertex(p_tip_l); st.set_color(c_mid); st.add_vertex(p_mid_l)
		st.set_color(c_top); st.add_vertex(p_mid_top); st.set_color(c_mid); st.add_vertex(p_mid_r); st.set_color(c_top); st.add_vertex(p_tip_r)
		st.set_color(c_top); st.add_vertex(p_mid_top); st.set_color(c_top); st.add_vertex(p_tip); st.set_color(c_top); st.add_vertex(p_tip_l)
		st.set_color(c_top); st.add_vertex(p_mid_top); st.set_color(c_top); st.add_vertex(p_tip_r); st.set_color(c_top); st.add_vertex(p_tip)
		# Cara inferior en sombra profunda (da volumen 3D real a la copa)
		st.set_color(c_bot); st.add_vertex(p_root); st.set_color(c_bot); st.add_vertex(p_mid_l); st.set_color(c_bot); st.add_vertex(p_mid_bot)
		st.set_color(c_bot); st.add_vertex(p_root); st.set_color(c_bot); st.add_vertex(p_mid_bot); st.set_color(c_bot); st.add_vertex(p_mid_r)
		st.set_color(c_bot); st.add_vertex(p_mid_bot); st.set_color(c_bot); st.add_vertex(p_mid_l); st.set_color(c_bot); st.add_vertex(p_tip_l)
		st.set_color(c_bot); st.add_vertex(p_mid_bot); st.set_color(c_bot); st.add_vertex(p_tip_r); st.set_color(c_bot); st.add_vertex(p_mid_r)
		st.set_color(c_bot); st.add_vertex(p_mid_bot); st.set_color(c_bot); st.add_vertex(p_tip_l); st.set_color(c_bot); st.add_vertex(p_tip)
		st.set_color(c_bot); st.add_vertex(p_mid_bot); st.set_color(c_bot); st.add_vertex(p_tip); st.set_color(c_bot); st.add_vertex(p_tip_r)

	# Anillo inferior: 8 ramas anchas de pino mediterráneo con porte tendido e irregular
	for i in range(8):
		var ang := (float(i) / 8.0) * TAU + rng.randf_range(-0.20, 0.20)
		var ln := rng.randf_range(0.98, 1.34)
		var wd := rng.randf_range(0.68, 0.90)
		var th := rng.randf_range(0.32, 0.44)
		var dr := rng.randf_range(0.20, 0.40)
		add_bough_tuft.call(Vector3(0.0, rng.randf_range(-0.14, 0.02), 0.0), ang, ln, wd, th, dr, Color(1.06, 1.10, 0.95), Color(0.86, 0.90, 0.80), Color(0.48, 0.55, 0.46))

	# Anillo medio-alto: 6 subramas elevadas giradas entre huecos
	for j in range(6):
		var ang := (float(j) / 6.0) * TAU + 0.42 + rng.randf_range(-0.22, 0.22)
		var ln := rng.randf_range(0.70, 0.98)
		var wd := rng.randf_range(0.54, 0.72)
		var th := rng.randf_range(0.28, 0.38)
		var dr := rng.randf_range(0.06, 0.20)
		add_bough_tuft.call(Vector3(0.0, rng.randf_range(0.14, 0.28), 0.0), ang, ln, wd, th, dr, Color(1.16, 1.20, 1.02), Color(0.95, 0.99, 0.88), Color(0.58, 0.64, 0.54))

	# Corona irregular aparasolada (4 ramilletes asimétricos, nunca un cono puntiagudo)
	for k in range(4):
		var ang := (float(k) / 4.0) * TAU + 0.28 + rng.randf_range(-0.24, 0.24)
		add_bough_tuft.call(Vector3(0.0, 0.34, 0.0), ang, rng.randf_range(0.46, 0.64), 0.48, 0.34, -0.10, Color(1.22, 1.26, 1.06), Color(1.02, 1.06, 0.94), Color(0.68, 0.74, 0.62))

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
	var shadow_mode := GeometryInstance3D.SHADOW_CASTING_SETTING_ON if (
		"CrownLow" in batch_name
		or "Oak" in batch_name
		or "CoastalPine" in batch_name
		or "TrailRocks" in batch_name
		or "TrailTrunks" in batch_name
	) else GeometryInstance3D.SHADOW_CASTING_SETTING_OFF

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
		mesh_inst.visible = false
		label.visible = false

# 9B. Paso 10: Fauna y ambiente costero-monástico en A1 (gaviotas posadas con idle sutil, aves planeando, mariposas en flores y paisaje sonoro suave)
func attract_sanctuary_canaries(point: Vector3) -> void:
	_canary_focus = point
	_canary_focus_until = _fauna_time + 3.0

func _build_a1_ambient_fauna_and_sound() -> void:
	_a1_fauna_root = Node3D.new()
	_a1_fauna_root.name = "A1_AmbientFauna"
	add_child(_a1_fauna_root)
	_perched_gulls.clear()
	_gliding_gulls.clear()
	_garden_butterflies.clear()
	_coastal_fish.clear()

	var mat_gull_white := _make_mat(Color("#f6f4ee"), 0.72, 0.0)
	var mat_gull_wing := _make_mat(Color("#8c97a4"), 0.76, 0.0)
	var mat_gull_tip := _make_mat(Color("#2a2f36"), 0.80, 0.0)
	var mat_gull_beak := _make_mat(Color("#e8aa38"), 0.55, 0.0)
	var mat_gull_leg := _make_mat(Color("#d48632"), 0.65, 0.0)

	# 10.1 & 10.2 Gaviotas posadas en 6 remates de sillar reales del pretil sur (100% apoyadas sobre piedra sólida, nunca flotando ni atravesando rocas)
	var parapet_perch_xs := [74.20, 77.60, 93.20, 112.80, 125.40, 133.40]
	for ppx in parapet_perch_xs:
		# Remate de sillar limpio sobre el pretil sur (despejado de macetas y arbustos, cota superior y=10.36)
		var cap := _create_box_prop(_a1_fauna_root, "A1GullPerchCapstone_%d" % int(ppx * 10.0), Vector3(float(ppx), 9.65, 96.92), Vector3(0.62, 1.30, 0.62), mat_column)
		cap.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		_create_box_prop(_a1_fauna_root, "A1GullPerchCapTrim_%d" % int(ppx * 10.0), Vector3(float(ppx), 10.32, 96.92), Vector3(0.70, 0.08, 0.70), mat_column)
	var perched_specs := [
		[Vector3(74.20, 10.365, 96.92), 0.52, 1.00, false],
		[Vector3(77.60, 10.365, 96.92), 0.36, 0.96, false],
		[Vector3(93.20, 10.365, 96.92), -0.28, 0.98, false],
		[Vector3(112.80, 10.365, 96.92), 0.34, 0.98, false],
		[Vector3(125.40, 10.365, 96.92), -0.38, 0.96, false],
		[Vector3(133.40, 10.365, 96.92), -0.46, 1.00, false],
	]
	for pi in range(perched_specs.size()):
		var ps: Array = perched_specs[pi]
		var g_node := _create_perched_seagull_node("A1PerchedGull_%d" % pi, ps[0], float(ps[1]), float(ps[2]), mat_gull_white, mat_gull_wing, mat_gull_tip, mat_gull_beak, mat_gull_leg)
		_a1_fauna_root.add_child(g_node)
		_perched_gulls.append({
			"root": g_node,
			"body": g_node.get_node_or_null("BodyPivot"),
			"head": g_node.get_node_or_null("BodyPivot/HeadPivot"),
			"base_yaw": float(ps[1]),
			"phase": float(pi) * 1.73 + 0.4,
			"raycast_settle": bool(ps[3]),
		})

	# 10.3 Gaviotas planeando con alas aerodinámicas esculpidas sobre la bahía abierta y la playa Z1
	var glide_specs := [
		[Vector3(84.6, 13.85, 107.40), 4.6, 1.55, 0.34, 0.35, 1.06],
		[Vector3(98.4, 14.95, 108.80), 5.2, 1.65, 0.31, 1.15, 1.00],
		[Vector3(116.4, 14.20, 107.60), 4.8, 1.60, 0.29, 2.25, 1.04],
		[Vector3(24.0, 11.40, 113.50), 5.8, 2.40, 0.32, 3.10, 1.02],
		[Vector3(56.0, 24.80, 78.50), 6.2, 2.80, 0.26, 4.40, 1.08],
	]
	for gi in range(glide_specs.size()):
		var gs: Array = glide_specs[gi]
		var gl_node := _create_gliding_seagull_node("A1GlidingGull_%d" % gi, gs[0], float(gs[5]), mat_gull_white, mat_gull_wing, mat_gull_tip, mat_gull_beak)
		_a1_fauna_root.add_child(gl_node)
		_gliding_gulls.append({
			"node": gl_node,
			"wing_l": gl_node.get_node_or_null("WingL"),
			"wing_r": gl_node.get_node_or_null("WingR"),
			"center": gs[0],
			"rx": float(gs[1]),
			"rz": float(gs[2]),
			"speed": float(gs[3]),
			"phase": float(gs[4])
		})

	# 10.5 Mariposas esculpidas (alas bilobuladas) sobre las flores de A1 y Jardines Z7
	var mat_bfly_cream := _make_mat(Color("#f7ebd2"), 0.55, 0.0)
	mat_bfly_cream.cull_mode = BaseMaterial3D.CULL_DISABLED
	var mat_bfly_lav := _make_mat(Color("#d8c2f0"), 0.55, 0.0)
	mat_bfly_lav.cull_mode = BaseMaterial3D.CULL_DISABLED
	var mat_bfly_gold := _make_mat(Color("#efc66a"), 0.52, 0.0)
	mat_bfly_gold.cull_mode = BaseMaterial3D.CULL_DISABLED
	var bfly_wing_l := _make_butterfly_wing_mesh(-1.0)
	var bfly_wing_r := _make_butterfly_wing_mesh(1.0)
	var bfly_centers := [
		Vector3(82.4, 10.42, 96.34),
		Vector3(87.6, 10.44, 96.32),
		Vector3(95.3, 9.96, 90.46),
		Vector3(97.8, 10.42, 96.34),
		Vector3(106.5, 9.96, 90.46),
		Vector3(110.5, 10.42, 96.34),
		Vector3(117.8, 9.96, 90.46),
		Vector3(121.4, 10.42, 96.34),
		# Jardines Z7 (terrazas de lavanda y hierbas junto al Paseo Superior)
		Vector3(75.2, 18.85, 61.4),
		Vector3(78.6, 18.92, 62.6),
		Vector3(81.0, 18.88, 59.8),
		Vector3(76.8, 18.95, 58.6),
	]
	for bi in range(bfly_centers.size()):
		var bf_node := Node3D.new()
		bf_node.name = "A1GardenButterfly_%d" % bi
		bf_node.position = bfly_centers[bi]
		_a1_fauna_root.add_child(bf_node)
		var b_mat := mat_bfly_cream if bi % 3 == 0 else (mat_bfly_lav if bi % 3 == 1 else mat_bfly_gold)
		var wl := MeshInstance3D.new()
		wl.name = "WingL"; wl.mesh = bfly_wing_l; wl.material_override = b_mat; wl.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		var wr := MeshInstance3D.new()
		wr.name = "WingR"; wr.mesh = bfly_wing_r; wr.material_override = b_mat; wr.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		bf_node.add_child(wl)
		bf_node.add_child(wr)
		_garden_butterflies.append({
			"node": bf_node,
			"wl": wl,
			"wr": wr,
			"center": bfly_centers[bi],
			"phase": float(bi) * 1.41
		})

	# 10.6 Bancos de peces costeros plateados nadando en el agua somera clara del muelle Z1 y cala
	var mat_fish_body := _make_mat(Color("#5d8ea0"), 0.24, 0.34)
	var mat_fish_fin := _make_mat(Color("#89b4c4"), 0.36, 0.14)
	var mat_fish_eye := _make_mat(Color("#12151a"), 0.08, 0.15)
	var fish_specs := [
		[Vector3(19.6, -0.44, 115.4), 1.45, 0.72, 0.62, 0.20, 0.92],
		[Vector3(21.2, -0.48, 116.2), 1.65, 0.85, 0.56, 1.35, 0.85],
		[Vector3(24.4, -0.46, 116.8), 1.80, 0.90, 0.52, 2.40, 0.96],
		[Vector3(26.2, -0.50, 115.6), 1.50, 0.75, 0.66, 3.15, 0.82],
		[Vector3(17.4, -0.42, 114.6), 1.35, 0.65, 0.58, 4.05, 0.88],
		[Vector3(28.5, -0.45, 113.8), 1.60, 0.70, 0.54, 4.95, 0.90],
		[Vector3(15.2, -0.44, 112.4), 1.40, 0.75, 0.60, 5.65, 0.84],
		[Vector3(22.6, -0.52, 117.6), 2.10, 0.95, 0.48, 0.85, 1.02],
	]
	for fi in range(fish_specs.size()):
		var fs: Array = fish_specs[fi]
		var fnode := _create_coastal_fish_node("Z1CoastalFish_%d" % fi, fs[0], float(fs[5]), mat_fish_body, mat_fish_fin, mat_fish_eye)
		_a1_fauna_root.add_child(fnode)
		_coastal_fish.append({
			"node": fnode,
			"tail": fnode.get_node_or_null("TailPivot"),
			"center": fs[0],
			"rx": float(fs[1]),
			"rz": float(fs[2]),
			"speed": float(fs[3]),
			"phase": float(fs[4])
		})

	# 10.4 Paisaje sonoro ambiental suave de costa y retiro (activo con driver de audio real)
	if DisplayServer.get_name() != "headless" and AudioServer.get_driver_name() != "Dummy":
		_a1_ambient_player = AudioStreamPlayer.new()
		_a1_ambient_player.name = "A1AmbientSoundscape"
		var gen := AudioStreamGenerator.new()
		gen.mix_rate = 22050.0
		gen.buffer_length = 0.25
		_a1_ambient_player.stream = gen
		_a1_ambient_player.volume_db = -21.0
		_a1_fauna_root.add_child(_a1_ambient_player)
		if _a1_ambient_player.is_inside_tree():
			_a1_ambient_player.play()

	_animate_a1_fauna_and_sound(0.0)
	call_deferred("_settle_a1_fauna_clear_of_rocks")

func _collect_a1_rock_meshes() -> Array[Dictionary]:
	var rocks: Array[Dictionary] = []
	for child in find_children("*", "MeshInstance3D", true, false):
		var mi := child as MeshInstance3D
		if not is_instance_valid(mi) or mi.mesh == null or not mi.visible:
			continue
		if _a1_fauna_root and _a1_fauna_root.is_ancestor_of(mi):
			continue
		var low := mi.name.to_lower()
		var p_low := mi.get_parent().name.to_lower() if mi.get_parent() else ""
		if "vault" in low or "crag" in low or "buttress" in low or "cliff" in low or "rock" in low or "strata" in low or "caveroof" in p_low or "a1_" in p_low:
			var aabb := mi.global_transform * mi.mesh.get_aabb()
			if aabb.end.x >= 70.0 and aabb.position.x <= 145.0 and aabb.end.z >= 74.0 and aabb.position.z <= 116.0:
				rocks.append({"mi": mi, "aabb": aabb, "faces": PackedVector3Array()})
	return rocks

func _sample_highest_visual_rock_y(x: float, z: float, y_top: float, y_bot: float, rock_meshes: Array) -> float:
	var best_y := -INF
	var seg_a := Vector3(x, y_top, z)
	var seg_b := Vector3(x, y_bot, z)
	for entry in rock_meshes:
		var aabb: AABB = entry["aabb"]
		if x < aabb.position.x - 0.15 or x > aabb.end.x + 0.15 or z < aabb.position.z - 0.15 or z > aabb.end.z + 0.15:
			continue
		var mi: MeshInstance3D = entry["mi"]
		var faces: PackedVector3Array = entry["faces"]
		if faces.is_empty():
			faces = mi.mesh.get_faces()
			entry["faces"] = faces
		var la := mi.to_local(seg_a)
		var lb := mi.to_local(seg_b)
		for i in range(0, faces.size(), 3):
			var hit = Geometry3D.segment_intersects_triangle(la, lb, faces[i], faces[i + 1], faces[i + 2])
			if hit != null:
				var wy := mi.to_global(hit).y
				if wy > best_y:
					best_y = wy
	return best_y

func _point_inside_visual_rock(pt: Vector3, pad: float, rock_meshes: Array) -> bool:
	for entry in rock_meshes:
		var aabb: AABB = (entry["aabb"] as AABB).grow(pad)
		if not aabb.has_point(pt):
			continue
		var top_y := _sample_highest_visual_rock_y(pt.x, pt.z, aabb.end.y + 0.5, aabb.position.y - 0.5, [entry])
		if top_y != -INF and pt.y <= top_y + pad and pt.y >= aabb.position.y - pad:
			return true
	return false

func _settle_a1_fauna_clear_of_rocks() -> void:
	if not is_inside_tree() or not get_world_3d():
		return
	var space := get_world_3d().direct_space_state
	if space == null:
		return
	var rock_meshes := _collect_a1_rock_meshes()
	var sphere := SphereShape3D.new()
	sphere.radius = 0.24
	var q_shape := PhysicsShapeQueryParameters3D.new()
	q_shape.shape = sphere
	q_shape.collide_with_areas = false
	q_shape.collide_with_bodies = true

	# 1) Asentar gaviotas posadas de acantilado exactamente sobre la superficie superior (física Y visual) sin penetrar ningún sólido
	for pg in _perched_gulls:
		var root_g: Node3D = pg.get("root")
		if not is_instance_valid(root_g):
			continue
		var pos := root_g.global_position
		if bool(pg.get("raycast_settle", false)):
			var best_surf_y := -INF
			var ray := PhysicsRayQueryParameters3D.create(Vector3(pos.x, 21.0, pos.z), Vector3(pos.x, 10.5, pos.z))
			ray.collide_with_areas = false
			var hit := space.intersect_ray(ray)
			if not hit.is_empty():
				best_surf_y = maxf(best_surf_y, float(hit.position.y))
			# Muestrear huella completa de patas (centro y 4 puntos a +-0.16m) sobre las mallas de roca visual
			for off in [Vector2.ZERO, Vector2(-0.16, 0.0), Vector2(0.16, 0.0), Vector2(0.0, -0.16), Vector2(0.0, 0.16)]:
				var vy := _sample_highest_visual_rock_y(pos.x + off.x, pos.z + off.y, 21.0, 10.5, rock_meshes)
				if vy != -INF:
					best_surf_y = maxf(best_surf_y, vy)
			if best_surf_y != -INF:
				pos.y = best_surf_y + 0.015
			else:
				pos.y = 14.20
		# Garantizar 0 intersecciones físicas en el cuerpo de la gaviota
		for _step in range(20):
			q_shape.transform = Transform3D(Basis.IDENTITY, pos + Vector3(0.0, 0.28, 0.0))
			if space.intersect_shape(q_shape, 1).is_empty():
				break
			pos.y += 0.14
		root_g.global_position = pos

	# 2) Garantizar 0 intersecciones (físicas Y mallas visuales) en los 360° de la órbita de cada gaviota planeando
	var glide_sphere := SphereShape3D.new()
	glide_sphere.radius = 0.55
	q_shape.shape = glide_sphere
	for gg in _gliding_gulls:
		var c: Vector3 = gg.get("center", Vector3.ZERO)
		var rx: float = float(gg.get("rx", 4.0))
		var rz: float = float(gg.get("rz", 1.5))
		for _tries in range(18):
			var blocked := false
			for s_i in range(24):
				var ang := float(s_i) / 24.0 * TAU
				var pt := c + Vector3(cos(ang) * rx, sin(ang * 1.5) * 0.28, sin(ang) * rz)
				q_shape.transform = Transform3D(Basis.IDENTITY, pt)
				if not space.intersect_shape(q_shape, 1).is_empty() or _point_inside_visual_rock(pt, 0.55, rock_meshes):
					blocked = true
					break
			if not blocked:
				break
			c.z += 0.85
			c.y += 0.45
		gg["center"] = c

	# 3) Garantizar 0 intersecciones en las mariposas de jardín (comprobando el volumen completo de vuelo)
	var bfly_sphere := SphereShape3D.new()
	bfly_sphere.radius = 0.14
	q_shape.shape = bfly_sphere
	for bf in _garden_butterflies:
		var bc: Vector3 = bf.get("center", Vector3.ZERO)
		for _tries in range(16):
			var blocked := false
			for s_i in range(16):
				var ang := float(s_i) / 16.0 * TAU
				var pt := bc + Vector3(sin(ang) * 0.22, absf(cos(ang * 1.7)) * 0.12, cos(ang * 0.8) * 0.14)
				q_shape.transform = Transform3D(Basis.IDENTITY, pt)
				if not space.intersect_shape(q_shape, 1).is_empty() or _point_inside_visual_rock(pt, 0.14, rock_meshes):
					blocked = true
					break
			if not blocked:
				break
			bc.z += 0.24 if bc.z < 93.0 else -0.24
			bc.y += 0.08
		bf["center"] = bc
	_animate_a1_fauna_and_sound(0.0)

func _make_swept_gull_wing_mesh(side: float) -> ArrayMesh:
	# Perfil alar aerodinámico curvado de gaviota (hombro -> codo elevado -> punta primaria ahusada)
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var p_sh_f := Vector3(0.0, 0.015, 0.12)
	var p_sh_b := Vector3(0.0, -0.005, -0.11)
	var p_el_f := Vector3(side * 0.34, 0.085, 0.09)
	var p_el_b := Vector3(side * 0.31, 0.055, -0.10)
	var p_wr_f := Vector3(side * 0.64, 0.045, 0.02)
	var p_wr_b := Vector3(side * 0.59, 0.025, -0.12)
	var p_tip := Vector3(side * 0.92, -0.015, -0.14)
	var c_in := Color("#c8cfd6")
	var c_mid := Color("#8894a2")
	var c_tip := Color("#262b33")
	var add_tri := func(a: Vector3, ca: Color, b: Vector3, cb: Color, c: Vector3, cc: Color) -> void:
		st.set_color(ca); st.add_vertex(a)
		st.set_color(cb); st.add_vertex(b)
		st.set_color(cc); st.add_vertex(c)
	if side > 0.0:
		add_tri.call(p_sh_f, c_in, p_el_f, c_mid, p_el_b, c_mid)
		add_tri.call(p_sh_f, c_in, p_el_b, c_mid, p_sh_b, c_in)
		add_tri.call(p_el_f, c_mid, p_wr_f, c_mid, p_wr_b, c_mid)
		add_tri.call(p_el_f, c_mid, p_wr_b, c_mid, p_el_b, c_mid)
		add_tri.call(p_wr_f, c_mid, p_tip, c_tip, p_wr_b, c_tip)
	else:
		add_tri.call(p_sh_f, c_in, p_el_b, c_mid, p_el_f, c_mid)
		add_tri.call(p_sh_f, c_in, p_sh_b, c_in, p_el_b, c_mid)
		add_tri.call(p_el_f, c_mid, p_wr_b, c_mid, p_wr_f, c_mid)
		add_tri.call(p_el_f, c_mid, p_el_b, c_mid, p_wr_b, c_mid)
		add_tri.call(p_wr_f, c_mid, p_wr_b, c_tip, p_tip, c_tip)
	st.generate_normals()
	return st.commit()

func _make_butterfly_wing_mesh(side: float) -> ArrayMesh:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var p0 := Vector3(0.0, 0.0, 0.015)
	var p1 := Vector3(side * 0.075, 0.012, 0.055)
	var p2 := Vector3(side * 0.088, 0.005, 0.008)
	var p3 := Vector3(0.0, 0.0, -0.018)
	var p4 := Vector3(side * 0.058, 0.004, -0.052)
	st.add_vertex(p0); st.add_vertex(p1); st.add_vertex(p2)
	st.add_vertex(p0); st.add_vertex(p2); st.add_vertex(p3)
	st.add_vertex(p3); st.add_vertex(p2); st.add_vertex(p4)
	st.generate_normals()
	return st.commit()

func _create_coastal_fish_node(f_name: String, pos: Vector3, sc: float, mat_body: Material, mat_fin: Material, mat_eye: Material) -> Node3D:
	var root_f := Node3D.new()
	root_f.name = f_name
	root_f.position = pos
	root_f.scale = Vector3.ONE * sc
	var sm := SphereMesh.new()
	sm.radius = 0.075; sm.height = 0.38; sm.radial_segments = 8; sm.rings = 4
	var body := MeshInstance3D.new()
	body.mesh = sm; body.material_override = mat_body
	body.rotation.x = PI * 0.5; body.scale = Vector3(0.62, 1.0, 1.05)
	body.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	root_f.add_child(body)
	var sm_e := SphereMesh.new()
	sm_e.radius = 0.014; sm_e.height = 0.028; sm_e.radial_segments = 6; sm_e.rings = 3
	for ex in [-0.032, 0.032]:
		var eye := MeshInstance3D.new()
		eye.mesh = sm_e; eye.material_override = mat_eye; eye.position = Vector3(ex, 0.016, 0.13)
		eye.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		root_f.add_child(eye)
	var dorsal := _create_box_prop(root_f, "DorsalFin", Vector3(0.0, 0.058, -0.02), Vector3(0.012, 0.072, 0.12), mat_fin)
	dorsal.rotation.x = -0.32; dorsal.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	var tail_piv := Node3D.new()
	tail_piv.name = "TailPivot"
	tail_piv.position = Vector3(0.0, 0.0, -0.17)
	root_f.add_child(tail_piv)
	for fd in [-1.0, 1.0]:
		var lobe := _create_box_prop(tail_piv, "TailLobe", Vector3(0.0, float(fd) * 0.026, -0.055), Vector3(0.014, 0.068, 0.11), mat_fin)
		lobe.rotation.x = float(fd) * 0.44; lobe.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	return root_f

func _create_perched_seagull_node(g_name: String, pos: Vector3, yaw: float, sc: float, mat_white: Material, mat_wing: Material, mat_tip: Material, mat_beak: Material, mat_leg: Material) -> Node3D:
	# Gaviota posada esculpida 3D (cuerpo y pecho ovalados, alas plegadas curvas, ojos brillantes y pico cónico)
	var g := Node3D.new()
	g.name = g_name
	g.position = pos
	g.rotation.y = yaw
	g.scale = Vector3.ONE * sc
	var mat_eye := _make_mat(Color("#111318"), 0.08, 0.15)
	for lx in [-0.052, 0.052]:
		_create_cylinder(g, "Leg", Vector3(lx, 0.09, 0.0), 0.013, 0.18, mat_leg)
		_create_box_prop(g, "Foot", Vector3(lx, 0.01, 0.032), Vector3(0.040, 0.012, 0.068), mat_leg)
	var body_piv := Node3D.new()
	body_piv.name = "BodyPivot"
	body_piv.position = Vector3(0.0, 0.22, 0.0)
	g.add_child(body_piv)
	var sm_body := SphereMesh.new()
	sm_body.radius = 0.125; sm_body.height = 0.25; sm_body.radial_segments = 10; sm_body.rings = 5
	var torso := MeshInstance3D.new()
	torso.name = "Torso"; torso.mesh = sm_body; torso.material_override = mat_white
	torso.scale = Vector3(0.92, 0.84, 1.75); torso.rotation.x = -0.15
	body_piv.add_child(torso)
	var breast := MeshInstance3D.new()
	breast.name = "Breast"; breast.mesh = sm_body; breast.material_override = mat_white
	breast.position = Vector3(0.0, 0.035, 0.14); breast.scale = Vector3(0.76, 0.80, 0.88)
	body_piv.add_child(breast)
	for side_v in [-1.0, 1.0]:
		var side := float(side_v)
		var fw := MeshInstance3D.new()
		fw.name = "FoldedWing"; fw.mesh = sm_body; fw.material_override = mat_wing
		fw.position = Vector3(side * 0.088, 0.035, -0.045)
		fw.scale = Vector3(0.32, 0.56, 1.65)
		fw.rotation = Vector3(-0.18, -side * 0.08, side * 0.14)
		body_piv.add_child(fw)
		var tip := _create_box_prop(body_piv, "WingTip", Vector3(side * 0.048, -0.008, -0.27), Vector3(0.036, 0.042, 0.17), mat_tip)
		tip.rotation.x = -0.20
	var tail := _create_box_prop(body_piv, "Tail", Vector3(0.0, -0.022, -0.27), Vector3(0.115, 0.022, 0.16), mat_white)
	tail.rotation.x = -0.16
	var head_piv := Node3D.new()
	head_piv.name = "HeadPivot"
	head_piv.position = Vector3(0.0, 0.15, 0.155)
	body_piv.add_child(head_piv)
	_create_cylinder(head_piv, "Neck", Vector3(0.0, -0.02, 0.0), 0.056, 0.12, mat_white)
	var sm_h := SphereMesh.new()
	sm_h.radius = 0.072; sm_h.height = 0.144; sm_h.radial_segments = 10; sm_h.rings = 5
	var head := MeshInstance3D.new()
	head.name = "Head"; head.mesh = sm_h; head.material_override = mat_white
	head.position = Vector3(0.0, 0.055, 0.015); head.scale = Vector3(0.92, 0.90, 1.15)
	head_piv.add_child(head)
	var cm_bk := CylinderMesh.new()
	cm_bk.top_radius = 0.004; cm_bk.bottom_radius = 0.024; cm_bk.height = 0.125; cm_bk.radial_segments = 7
	var beak := MeshInstance3D.new()
	beak.name = "Beak"; beak.mesh = cm_bk; beak.material_override = mat_beak
	beak.position = Vector3(0.0, 0.042, 0.13); beak.rotation.x = PI * 0.54
	head_piv.add_child(beak)
	var sm_e := SphereMesh.new()
	sm_e.radius = 0.014; sm_e.height = 0.028; sm_e.radial_segments = 6; sm_e.rings = 3
	for ex in [-0.052, 0.052]:
		var eye := MeshInstance3D.new()
		eye.mesh = sm_e; eye.material_override = mat_eye; eye.position = Vector3(ex, 0.068, 0.052)
		head_piv.add_child(eye)
	return g

func _create_gliding_seagull_node(g_name: String, pos: Vector3, sc: float, mat_white: Material, _mat_wing: Material, _mat_tip: Material, mat_beak: Material) -> Node3D:
	# Gaviota planeadora con fuselaje esculpido y alas aerodinámicas curvadas en perfil de gaviota
	var g := Node3D.new()
	g.name = g_name
	g.position = pos
	g.scale = Vector3.ONE * sc
	var sm_b := SphereMesh.new()
	sm_b.radius = 0.095; sm_b.height = 0.19; sm_b.radial_segments = 10; sm_b.rings = 5
	var body := MeshInstance3D.new()
	body.name = "Body"; body.mesh = sm_b; body.material_override = mat_white
	body.scale = Vector3(0.88, 0.72, 2.65); body.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	g.add_child(body)
	var head := MeshInstance3D.new()
	head.name = "Head"; head.mesh = sm_b; head.material_override = mat_white
	head.position = Vector3(0.0, 0.032, 0.25); head.scale = Vector3(0.64, 0.60, 0.85)
	head.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	g.add_child(head)
	var cm_bk := CylinderMesh.new()
	cm_bk.top_radius = 0.004; cm_bk.bottom_radius = 0.022; cm_bk.height = 0.115; cm_bk.radial_segments = 6
	var beak := MeshInstance3D.new()
	beak.name = "Beak"; beak.mesh = cm_bk; beak.material_override = mat_beak
	beak.position = Vector3(0.0, 0.025, 0.35); beak.rotation.x = PI * 0.52
	beak.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	g.add_child(beak)
	var tail := _create_box_prop(g, "Tail", Vector3(0.0, 0.008, -0.30), Vector3(0.20, 0.018, 0.18), mat_white)
	tail.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF

	var wing_mat := StandardMaterial3D.new()
	wing_mat.vertex_color_use_as_albedo = true
	wing_mat.vertex_color_is_srgb = true
	wing_mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	wing_mat.roughness = 0.74
	for side_v in [-1.0, 1.0]:
		var side := float(side_v)
		var w_piv := Node3D.new()
		w_piv.name = "WingL" if side < 0.0 else "WingR"
		w_piv.position = Vector3(side * 0.05, 0.02, 0.03)
		g.add_child(w_piv)
		var w_mesh := MeshInstance3D.new()
		w_mesh.name = "SweptAirfoil"
		w_mesh.mesh = _make_swept_gull_wing_mesh(side)
		w_mesh.material_override = wing_mat
		w_mesh.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		w_piv.add_child(w_mesh)
	return g

func _animate_a1_fauna_and_sound(delta: float) -> void:
	_fauna_time += delta
	# 10.2 Animación sutil de giro de cabeza y respiración en gaviotas posadas
	for pg in _perched_gulls:
		var head: Node3D = pg.get("head")
		var body: Node3D = pg.get("body")
		var ph: float = float(pg.get("phase", 0.0))
		if is_instance_valid(head):
			var look_wave := sin(_fauna_time * 1.15 + ph) + 0.35 * sin(_fauna_time * 2.7 + ph * 1.4)
			head.rotation.y = clampf(look_wave * 0.32, -0.45, 0.45)
			head.rotation.x = cos(_fauna_time * 0.85 + ph) * 0.07
		if is_instance_valid(body):
			body.rotation.x = sin(_fauna_time * 1.9 + ph) * 0.025
	# Canarios dorados de Bahamut en A5 (picoteo y giro de cabeza sereno)
	for cn in _a5_canaries:
		var c_head: Node3D = cn.get("head")
		var c_root: Node3D = cn.get("root")
		var c_ph: float = float(cn.get("phase", 0.0))
		if is_instance_valid(c_head):
			var yaw := sin(_fauna_time * 1.65 + c_ph) * 0.38
			if _fauna_time < _canary_focus_until and c_root.global_position.distance_to(_canary_focus) < 4.0:
				var nearby := c_root.to_local(_canary_focus)
				yaw = clampf(atan2(nearby.x, nearby.z), -1.2, 1.2)
			c_head.rotation.y = lerpf(c_head.rotation.y, yaw, clampf(delta * 7.0, 0.0, 1.0))
			c_head.rotation.x = 0.08 * sin(_fauna_time * 3.2 + c_ph * 1.3)
		if is_instance_valid(c_root):
			c_root.position.y = float(cn.get("base_y", c_root.position.y)) + maxf(0.0, sin(_fauna_time * 2.6 + c_ph) - 0.82) * 0.14
	# 10.3 Vuelo lento en arco suave de las gaviotas costeras
	for gg in _gliding_gulls:
		var gn: Node3D = gg.get("node")
		if not is_instance_valid(gn):
			continue
		var c: Vector3 = gg.get("center", Vector3.ZERO)
		var rx: float = float(gg.get("rx", 3.5))
		var rz: float = float(gg.get("rz", 1.2))
		var spd: float = float(gg.get("speed", 0.32))
		var ph: float = float(gg.get("phase", 0.0))
		var ang := _fauna_time * spd + ph
		var pos := c + Vector3(cos(ang) * rx, sin(ang * 1.5) * 0.28, sin(ang) * rz)
		var vel := Vector3(-sin(ang) * rx, 0.0, cos(ang) * rz).normalized()
		gn.position = pos
		if vel.length_squared() > 0.01:
			gn.rotation.y = atan2(vel.x, vel.z)
		gn.rotation.z = -cos(ang) * 0.16
		var wl: Node3D = gg.get("wing_l")
		var wr: Node3D = gg.get("wing_r")
		var flap := sin(_fauna_time * 2.4 + ph) * 0.12
		if is_instance_valid(wl):
			wl.rotation.z = flap
		if is_instance_valid(wr):
			wr.rotation.z = -flap
	# 10.5 Aleteo suave de mariposas sobre las flores de la plaza (radio compacto libre de roca y muros)
	for bf in _garden_butterflies:
		var bn: Node3D = bf.get("node")
		if not is_instance_valid(bn):
			continue
		var bc: Vector3 = bf.get("center", Vector3.ZERO)
		var ph: float = float(bf.get("phase", 0.0))
		var t_b := _fauna_time * 1.35 + ph
		bn.position = bc + Vector3(sin(t_b) * 0.22, absf(cos(t_b * 1.7)) * 0.12, cos(t_b * 0.8) * 0.14)
		bn.rotation.y = sin(t_b * 0.9) * 0.8
		var wing_ang := sin(_fauna_time * 14.0 + ph) * 0.58
		var wl: Node3D = bf.get("wl")
		var wr: Node3D = bf.get("wr")
		if is_instance_valid(wl):
			wl.rotation.z = wing_ang
		if is_instance_valid(wr):
			wr.rotation.z = -wing_ang
	# 10.6 Natación suave de bancos de peces en el agua clara del muelle Z1 (siguiendo altura de marea)
	var sea_y := _ocean_plane_node.position.y if is_instance_valid(_ocean_plane_node) else Structure.ELEV_SEA
	for cf in _coastal_fish:
		var fn: Node3D = cf.get("node")
		if not is_instance_valid(fn):
			continue
		var c: Vector3 = cf.get("center", Vector3.ZERO)
		var rx: float = float(cf.get("rx", 1.5))
		var rz: float = float(cf.get("rz", 0.75))
		var spd: float = float(cf.get("speed", 0.55))
		var ph: float = float(cf.get("phase", 0.0))
		var ang := _fauna_time * spd + ph
		var px := c.x + cos(ang) * rx
		var pz := c.z + sin(ang * 2.0) * rz * 0.55
		var vx := -sin(ang) * rx * spd
		var vz := cos(ang * 2.0) * rz * 1.1 * spd
		fn.position = Vector3(px, sea_y + c.y + sin(ang * 1.7) * 0.04, pz)
		if vx * vx + vz * vz > 0.0001:
			fn.rotation.y = atan2(vx, vz)
		var tp: Node3D = cf.get("tail")
		if is_instance_valid(tp):
			tp.rotation.y = sin(_fauna_time * 9.5 + ph) * 0.36
	# 10.4 Alimentar suavemente el generador de brisa marina y rumor costero
	if is_instance_valid(_a1_ambient_player) and _a1_ambient_player.playing:
		var pb := _a1_ambient_player.get_stream_playback() as AudioStreamGeneratorPlayback
		if pb:
			var avail := pb.get_frames_available()
			var dt := 1.0 / 22050.0
			for _i in range(mini(avail, 512)):
				_a1_ambient_phase += dt
				var surf_env := 0.55 + 0.45 * sin(_a1_ambient_phase * 0.42)
				var breeze := (sin(_a1_ambient_phase * 142.0 + sin(_a1_ambient_phase * 3.1) * 4.0) * 0.35 + cos(_a1_ambient_phase * 218.0) * 0.25) * surf_env * 0.045
				pb.push_frame(Vector2(breeze, breeze))

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
			"name": "Sendero Costero a Aproximación de Pleamar",
			"target_scene": "res://scenes/pleamar_coves.tscn",
			"target_spawn": "from_pleamar_low",
			"facing": "sw",
			"return_spawn": "from_pleamar_low",
			"return_pos": Vector3(10.8, 0.55, 99.6),
			"return_facing": "ne",
			"exit_pos": Vector3(5.6, 0.54, 98.4),
			"exit_radius": 1.95,
			"base_width": 2.35,
			"skirt_depth": 0.12,
			"tight_skirt": true,
			"sandy_merge": true,
			"ridge_height": 1.60,
			"start_tint": Color("#b49a76"),
			"tread_tint": Color("#9d8160"),
			"edge_tint": Color("#baa07d"),
			"mist": true,
			"pts": [
				Vector3(20.5, 0.48, 106.8), Vector3(17.2, 0.49, 104.6), Vector3(14.0, 0.51, 102.7),
				Vector3(10.8, 0.52, 100.8), Vector3(8.2, 0.53, 99.3), Vector3(5.6, 0.54, 97.7),
				Vector3(1.8, 0.55, 95.6), Vector3(-2.0, 0.57, 93.6), Vector3(-6.0, 0.62, 91.6),
				Vector3(-10.6, 0.68, 89.6), Vector3(-15.5, 0.74, 87.6), Vector3(-20.5, 0.85, 84.8),
				Vector3(-25.8, 0.96, 82.0)
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
			_create_coastal_mist(root, "Mist_" + rid, Vector3(-9.5, 1.05, 89.8))

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
		match rid:
			"pleamar-low":
				exit_node.signpost_style = "dragon_post"
				exit_node.sign_short_title = "Cuevas de Pleamar"
				exit_node.sign_subtitle = "Sendero costero occidental rumbo a la cala exterior de aproximación a Pleamar (antes de B1). Transitable con marea baja; con marea alta conviene usar la senda alta del collado."
				exit_node.sign_offset = Vector3(2.8, 0.0, -0.4)
				exit_node.sign_yaw_deg = -10.0
				exit_node.primary_button_text = "Seguir sendero costero (marea baja) [T]"
				exit_node.extra_routes = [{
					"label": "Aproximación a Pleamar (Senda Alta)",
					"button_text": "Tomar senda alta del collado (sin marea) [M]",
					"scene_path": "res://scenes/pleamar_coves.tscn",
					"spawn_id": "from_pleamar_high",
					"facing": "nw",
					"mode": "trail"
				}]
			"pleamar-high":
				exit_node.signpost_style = "dragon_post"
				exit_node.sign_short_title = "Collado de Pleamar"
				exit_node.sign_subtitle = "Camino elevado entre pinos y riscos hasta la aproximación exterior de las cuevas de Pleamar (no depende de la marea)."
			"observatory-inland":
				exit_node.signpost_style = "dragon_post"
				exit_node.sign_short_title = "Al Observatorio"
				exit_node.sign_subtitle = "Senda septentrional excavada en basalto hacia el Observatorio."
			"observatory-coast":
				exit_node.signpost_style = "dragon_post"
				exit_node.sign_short_title = "Observatorio (Este)"
				exit_node.sign_subtitle = "Cornisa oriental sobre los acantilados rumbo al Observatorio."
		exit_node.target_scene_path = str(route["target_scene"])
		exit_node.target_spawn_id = str(route["target_spawn"])
		exit_node.entry_facing = str(route["facing"])
		exit_node.transition_mode = "trail"
		exit_node.trigger_radius = float(route["exit_radius"])
		exit_node.trigger_height = 3.2
		exit_node.auto_trigger = false
		exit_node.prompt_before_travel = true
		exit_node.reversible = true
		exit_node.position = route["exit_pos"]
		var exit_dir: Vector3 = (smoothed[mini(6, smoothed.size() - 1)] - smoothed[0]).normalized()
		exit_node.path_direction = Vector3(exit_dir.x, 0.0, exit_dir.z)
		root.add_child(exit_node)

	# Respaldo orografico NO y N para que la camara tactica no muestre borde recto del terreno
	_build_horizon_backdrop_shoulders(root, rng, trail_rocks_xf, trail_rocks_col, trail_bushes_xf, trail_bushes_col, trail_trunks_xf, trail_pine_a_xf, trail_pine_a_col, trail_pine_b_xf, trail_pine_b_col, trail_pine_c_xf, trail_pine_c_col)

	# 5a conexion: Bote en el embarcadero (Z1 -> El Pecio / Pleamar por mar) con letrero interactivo y [T]/[M]
	var boat_spawn := Marker3D.new()
	boat_spawn.name = "Spawn_from_retreat_boat"
	boat_spawn.position = Vector3(21.2, 0.52, 111.4)
	boat_spawn.set_meta("spawn_facing", "n")
	root.add_child(boat_spawn)

	var boat_exit := MapExitScript.new()
	boat_exit.name = "Exit_Boat_Pecio"
	boat_exit.exit_id = "boat-pecio"
	boat_exit.display_name = "Embarcadero · Bote de remos"
	boat_exit.destination_label = "Travesía en bote"
	boat_exit.signpost_style = "hanging_ropes"
	boat_exit.sign_short_title = "Bote · Mar"
	boat_exit.sign_subtitle = "Un gran bote de remos aguarda amarrado junto al muelle. Elige si zarpar hacia El Pecio o rodear la costa hacia la aproximación de Pleamar."
	boat_exit.sign_offset = Vector3(-4.5, 0.0, -3.7)
	boat_exit.sign_yaw_deg = -10.0
	boat_exit.target_scene_path = "res://scenes/pecio_cove_arrival.tscn"
	boat_exit.target_spawn_id = "from_retreat_boat"
	boat_exit.entry_facing = "s"
	boat_exit.transition_mode = "boat"
	boat_exit.trigger_radius = 2.5
	boat_exit.trigger_height = 3.2
	boat_exit.auto_trigger = false
	boat_exit.prompt_before_travel = true
	boat_exit.reversible = true
	boat_exit.primary_button_text = "Zarpar hacia El Pecio [T]"
	boat_exit.interaction_hint = "[T] Zarpar a El Pecio · [M] Pleamar por mar"
	boat_exit.extra_routes = [{
		"label": "Aproximación a Pleamar (por mar)",
		"button_text": "Navegar a Pleamar (por mar) [M]",
		"scene_path": "res://scenes/pleamar_coves.tscn",
		"spawn_id": "from_pleamar_sea",
		"facing": "sw",
		"mode": "boat"
	}]
	boat_exit.path_direction = Vector3(0.0, 0.0, 1.0)
	boat_exit.position = Vector3(22.2, 0.55, 113.2)
	root.add_child(boat_exit)

	# Emitir lotes MultiMesh de todo el enmarcado natural
	var tex_basalt_trail := _load_tex("basalt-coastal-albedo-v1.webp")
	var tex_cliff_trail := _load_tex("a1-cliff-rugged-v8.jpg")
	var norm_rock_trail := _load_tex("rock-normal-v1.png")
	var rock_mesh := SceneEnhancer.make_basalt_outcrop_mesh(71)
	var rock_mat := _make_textured_mat(Color("#e8ecf0"), 0.88, 0.02, tex_basalt_trail if tex_basalt_trail else tex_cliff_trail, 0.26, true, norm_rock_trail, 0.74)
	rock_mat.vertex_color_use_as_albedo = true
	rock_mat.vertex_color_is_srgb = false
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
	var bush_mat := OcclusionCtrl.make_canopy_dissolve_material(Color.WHITE, 0.88, Color(0.09, 0.14, 0.06), true)
	if not trail_bushes_xf.is_empty():
		root.add_child(_make_multimesh_batch("MM_TrailBushes", bush_mesh, bush_mat, trail_bushes_xf, trail_bushes_col))

	if not trail_trunks_xf.is_empty():
		var cone_mesh := _make_pine_tier_mesh()
		var crown_mat := OcclusionCtrl.make_canopy_dissolve_material(Color.WHITE, 0.90, Color(0.09, 0.14, 0.06), true)
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
	var rock_col := Color("#4e4d49")
	var sand_skirt_col := Color("#9d8564")

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
		var center_lift := lerpf(-0.024 if sandy_merge else 0.002, 0.022 if sandy_merge else 0.018, smoothstep(0.18, 0.45, route_prog) if sandy_merge else blend_t)
		var tread_lift := lerpf(-0.028 if sandy_merge else 0.001, 0.014 if sandy_merge else 0.005, smoothstep(0.18, 0.45, route_prog) if sandy_merge else blend_t)
		var verge_drop := lerpf(0.030 if sandy_merge else 0.005, 0.018 if sandy_merge else (0.035 if tight_skirt else 0.14), blend_t)
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
	if route_id == "pleamar-low":
		# La senda costera de pleamar-low se integra orgánicamente en la malla continua PleamarCoveBeach
		inst.visible = false
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

static func _emit_quad_up_st(st: SurfaceTool, p0: Vector3, p1: Vector3, p2: Vector3, p3: Vector3, c0: Color, c1: Color, c2: Color, c3: Color, uv0: Vector2, uv1: Vector2, uv2: Vector2, uv3: Vector2) -> void:
	st.set_color(c0); st.set_uv(uv0); st.add_vertex(p0)
	st.set_color(c1); st.set_uv(uv1); st.add_vertex(p1)
	st.set_color(c2); st.set_uv(uv2); st.add_vertex(p2)
	st.set_color(c0); st.set_uv(uv0); st.add_vertex(p0)
	st.set_color(c2); st.set_uv(uv2); st.add_vertex(p2)
	st.set_color(c3); st.set_uv(uv3); st.add_vertex(p3)

func _eval_volcanic_cliff_y(x: float, z: float, center: Vector3, rx: float, rz: float, top_y: float, base_y: float, phase: float = 0.0) -> float:
	var dx := (x - center.x) / maxf(0.1, rx)
	var dz := (z - center.z) / maxf(0.1, rz)
	var ang := atan2(dz, dx)
	# Irregularidad angular multi-frecuencia para estribaciones de basalto fracturado
	var spur := 1.0 + 0.22 * sin(ang * 3.0 + phase) + 0.14 * cos(ang * 5.0 - phase * 0.7) + 0.08 * sin(ang * 9.0 + phase * 1.4)
	var d := sqrt(dx * dx + dz * dz) / spur
	if d >= 1.0:
		return base_y
	var wall_profile := pow(1.0 - clampf(maxf(0.0, d - 0.28) / 0.72, 0.0, 1.0), 0.72)
	var raw_h := lerpf(base_y, top_y, wall_profile)
	# Terrazas escalonadas y fracturas angulares (evita campanas suaves artificiales)
	var terrace := floorf(raw_h * 0.85) * 0.28
	var ridge_noise := 0.55 * absf(sin(x * 0.52 + z * 0.36 + phase)) + 0.32 * cos(x * 1.05 - z * 0.84)
	return clampf(lerpf(raw_h, raw_h + terrace * 0.45, 0.55) + ridge_noise * clampf(d * 1.35, 0.22, 1.0), base_y, top_y + 0.85)

func _create_volcanic_headland_mound(parent: Node, hill_name: String, center: Vector3, rx: float, rz: float, top_y: float, base_y: float, mat: Material, phase: float = 0.0) -> void:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	st.set_smooth_group(-1)
	var rings := 12
	var segs := 28

	var col_crevice := Color("#31373f")
	var col_basalt := Color("#828a94")
	var col_ridge := Color("#c6cdd4")
	var col_turf := Color("#667440")

	var ring_pts: Array = []
	for r in range(rings + 1):
		var frac := float(r) / float(rings)
		var base_ao := 1.0 - 0.34 * smoothstep(0.58, 1.0, frac)
		var row_pts: Array[Vector3] = []
		var row_cols: Array[Color] = []
		for s in range(segs + 1):
			var ang := (float(s) / float(segs)) * TAU
			var radial_warp := 1.0 + 0.18 * sin(ang * 3.0 + phase) + 0.11 * cos(ang * 6.0 - phase * 0.5) + 0.07 * sin(ang * 10.0 + frac * 2.8)
			var wx := center.x + cos(ang) * rx * frac * radial_warp
			var wz := center.z + sin(ang) * rz * frac * radial_warp
			var wy := base_y if r == rings else _eval_volcanic_cliff_y(wx, wz, center, rx, rz, top_y, base_y, phase)
			row_pts.append(Vector3(wx, wy, wz))
			var flute := 0.5 + 0.5 * sin(ang * 12.0 + phase + wy * 0.95)
			var c := col_basalt.lerp(col_crevice, flute * 0.72)
			c = c.lerp(col_ridge, clampf(smoothstep(0.6, top_y - 0.3, wy) * (1.0 - flute * 0.45) * 0.72, 0.0, 0.88))
			var crown_mask := clampf(1.0 - frac * 1.9, 0.0, 1.0) * smoothstep(top_y - 1.5, top_y + 0.2, wy) * (0.45 + 0.55 * cos(wx * 0.55 - wz * 0.42))
			c = c.lerp(col_turf, clampf(crown_mask * 0.74, 0.0, 0.74))
			c = Color(c.r * base_ao, c.g * base_ao, c.b * base_ao, 1.0)
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
			_emit_quad_st(
				st, p0, p1, p2, p3,
				a_col[s], a_col[s + 1], b_col[s + 1], b_col[s],
				Vector2(p0.x * 0.14, p0.z * 0.14),
				Vector2(p1.x * 0.14, p1.z * 0.14),
				Vector2(p2.x * 0.14, p2.z * 0.14),
				Vector2(p3.x * 0.14, p3.z * 0.14)
			)

	st.generate_normals()
	var inst := MeshInstance3D.new()
	inst.name = hill_name
	inst.mesh = st.commit()
	inst.material_override = mat
	inst.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	parent.add_child(inst)

func _eval_cove_beach_sample(wx: float, wz: float) -> Dictionary:
	var shore_noise := 0.55 * sin(wx * 0.42 + 0.6) + 0.28 * cos(wx * 0.89 - 0.3) + 0.16 * sin(wx * 1.45)
	var south_shore := 111.35
	if wx <= 1.0:
		var w_dist := 1.0 - wx
		south_shore = 99.2 - w_dist * 0.48 + shore_noise * 0.65
	elif wx <= 21.5:
		var t_cov := clampf((wx - 1.0) / 20.5, 0.0, 1.0)
		south_shore = lerpf(99.2, 111.35, pow(sin(t_cov * PI * 0.5), 0.90)) + shore_noise * (1.0 - 0.65 * smoothstep(14.5, 21.5, wx))
	elif wx <= 28.8:
		south_shore = 111.35 + 0.25 * sin(wx * 0.58)
	else:
		south_shore = lerpf(111.35, 110.1, smoothstep(28.8, 34.0, wx)) + 0.36 * sin(wx * 0.65)

	var north_shore := 82.0
	if wx < -1.0:
		north_shore = 81.2 + 0.42 * (wx + 1.0) + 0.35 * cos(wx * 0.55)
	elif wx <= 16.0:
		north_shore = 85.4 + 0.40 * sin(wx * 0.38)
	else:
		var t_bay := smoothstep(16.0, 34.5, wx)
		north_shore = lerpf(85.4, 106.8, pow(t_bay, 0.86)) + 0.35 * sin(wx * 0.46)

	var west_fade := smoothstep(-28.0, -25.2, wx)
	var d_south := south_shore - wz
	var d_north := wz - north_shore
	var d_land := minf(d_south, d_north)
	if d_land > -2.5 and wx < -25.2:
		d_land = lerpf(-2.8, d_land, west_fade)

	var trail_t := clampf((wx + 25.8) / 46.3, 0.0, 1.0)
	var trail_z := lerpf(82.0, 106.8, pow(trail_t, 1.04)) - 0.95 * sin(trail_t * PI)
	var trail_band := 1.0 - smoothstep(0.75, 2.55, absf(wz - trail_z))
	var trail_fade := smoothstep(22.2, 18.0, wx) * smoothstep(-27.2, -22.5, wx)
	var z2_t := clampf((wx - 19.8) / 9.2, 0.0, 1.0)
	var z2_line_z := lerpf(106.8, 109.4, z2_t)
	var z2_branch := (1.0 - smoothstep(0.65, 2.25, absf(wz - z2_line_z))) * smoothstep(18.2, 20.5, wx) * (1.0 - smoothstep(28.5, 30.2, wx))
	var pier_branch := (1.0 - smoothstep(0.65, 2.25, absf(wx - 21.6))) * smoothstep(106.0, 107.8, wz) * (1.0 - smoothstep(110.2, 111.3, wz))
	var pebble_mottle := 0.5 + 0.5 * sin(wx * 2.15 + wz * 1.75) * cos(wx * 1.35 - wz * 2.05)
	var trail_blend := clampf(maxf(trail_band * trail_fade, maxf(z2_branch, pier_branch * 0.85)) * (0.85 + 0.15 * pebble_mottle), 0.0, 1.0)

	var under_pier := smoothstep(17.8, 19.2, wx) * (1.0 - smoothstep(23.6, 25.4, wx)) * smoothstep(108.8, 110.2, wz)
	var wy := 0.50
	if d_land >= 1.9:
		var dune := 0.024 * sin(wx * 0.31) * cos(wz * 0.34) + 0.020 * smoothstep(2.0, 8.5, d_land)
		wy = 0.495 + dune - trail_blend * 0.024
		wy = lerpf(wy, 0.455, under_pier)
		if wx < 4.5:
			wy += smoothstep(4.5, -25.8, wx) * 0.46
	elif d_land >= 0.0:
		var wt := smoothstep(0.0, 1.9, d_land)
		var base_target := 0.495 + (smoothstep(4.5, -25.8, wx) * 0.46 if wx < 4.5 else 0.0)
		wy = lerpf(0.03, base_target, wt)
	else:
		var shallow_t := smoothstep(0.0, -3.4, d_land)
		var deep_t := smoothstep(-2.2, -5.8, d_land)
		var shoal_bank := smoothstep(12.5, 19.0, wx) * (1.0 - smoothstep(28.5, 34.5, wx)) * smoothstep(110.5, 113.4, wz) * (1.0 - smoothstep(114.6, 116.5, wz))
		var west_shoal := smoothstep(-15.0, -2.0, wx) * (1.0 - smoothstep(7.0, 14.0, wx)) * (1.0 - smoothstep(-0.2, -3.6, d_land))
		var base_shallow := lerpf(0.02, -0.78 + shoal_bank * 0.24 + west_shoal * 0.16, shallow_t)
		wy = lerpf(base_shallow, -3.55, deep_t)

	var east_feather := smoothstep(23.2, 29.0, wx) * smoothstep(-0.6, 1.2, d_land)
	wy -= east_feather * 0.23
	var z2_bank := smoothstep(29.8, 35.5, wx) * smoothstep(106.5, 113.5, wz)
	if z2_bank > 0.001:
		wy = lerpf(wy, minf(wy, -1.85), z2_bank)
	return {
		"wy": wy,
		"d_land": d_land,
		"d_north": d_north,
		"trail_blend": trail_blend,
		"under_pier": under_pier,
		"pebble_mottle": pebble_mottle
	}

func _build_pleamar_low_coastal_cove(parent: Node, rng: RandomNumberGenerator, rocks_xf: Array[Transform3D], rocks_col: Array[Color], bushes_xf: Array[Transform3D], bushes_col: Array[Color], trunks_xf: Array[Transform3D], pine_a_xf: Array[Transform3D], pine_a_col: Array[Color], pine_b_xf: Array[Transform3D], pine_b_col: Array[Color], pine_c_xf: Array[Transform3D], pine_c_col: Array[Color]) -> void:
	var cove_node := Node3D.new()
	cove_node.name = "PleamarCoastalCove"
	parent.add_child(cove_node)

	var tex_earth_beach := _load_tex("earth.webp")
	var tex_basalt_cove := _load_tex("basalt-coastal-albedo-v1.webp")
	var tex_cliff_cove := _load_tex("a1-cliff-rugged-v8.jpg")
	var norm_rock_cove := _load_tex("rock-normal-v1.png")

	# 1. Costa volcánica continua con arena irregular, grava húmeda y transición orgánica a muelle y escaleras Z2
	var beach_mat := _make_textured_mat(Color.WHITE, 0.88, 0.02, tex_earth_beach if tex_earth_beach else tex_basalt_cove, 0.24, true, norm_rock_cove, 0.34)
	beach_mat.vertex_color_use_as_albedo = true
	beach_mat.vertex_color_is_srgb = true
	beach_mat.cull_mode = BaseMaterial3D.CULL_DISABLED

	var st_beach := SurfaceTool.new()
	st_beach.begin(Mesh.PRIMITIVE_TRIANGLES)
	var nx := 72
	var nz := 44
	var x_min := -28.0
	var x_max := 42.0
	var z_min := 74.0
	var z_max := 124.0
	var col_dry_sand := Color("#ede0c2")
	var col_coarse_gravel := Color("#a99d88")
	var col_trail_tread := Color("#785e46")
	var col_apron_earth := Color("#838078")
	var col_wet := Color("#4f4338")
	var col_sandbar := Color("#8a8368")
	var col_reef := Color("#2a5d5b")
	var col_seabed := Color("#0f2830")

	var grid_rows: Array = []
	for iz in range(nz + 1):
		var tz := float(iz) / float(nz)
		var wz := lerpf(z_min, z_max, tz)
		var row_pts: Array[Vector3] = []
		var row_cols: Array[Color] = []
		for ix in range(nx + 1):
			var tx := float(ix) / float(nx)
			var wx := lerpf(x_min, x_max, tx)
			var smp := _eval_cove_beach_sample(wx, wz)
			var wy: float = float(smp["wy"])
			var d_land: float = float(smp["d_land"])
			var d_north: float = float(smp["d_north"])
			var trail_blend: float = float(smp["trail_blend"])
			var under_pier: float = float(smp["under_pier"])
			var pebble_mottle: float = float(smp["pebble_mottle"])

			var c := col_dry_sand
			var micro := 0.5 + 0.5 * sin(wx * 0.71 + cos(wz * 0.59) * 1.6) * cos(wz * 0.83 - wx * 0.31)
			var cliff_grit := 1.0 - smoothstep(1.0, 4.6, d_north)
			var pier_apron := smoothstep(16.0, 22.0, wx) * smoothstep(105.5, 110.2, wz) * (1.0 - smoothstep(29.8, 33.0, wx))
			var gravel_w := clampf(micro * 0.34 + pebble_mottle * 0.24 + cliff_grit * 0.62, 0.0, 1.0)
			var base_land_col := col_dry_sand.lerp(col_coarse_gravel, gravel_w).lerp(col_trail_tread, trail_blend * 0.86).lerp(col_apron_earth, pier_apron * 0.72)
			var cliff_foot_ao := pow(1.0 - smoothstep(0.0, 2.8, d_north), 1.35) * smoothstep(-1.5, 1.5, d_land)
			base_land_col = base_land_col.lerp(Color("#473d34"), cliff_foot_ao * 0.52)

			if d_land >= 2.1:
				c = base_land_col.lerp(Color("#362c24"), under_pier * 0.58)
			elif d_land >= 0.0:
				var wt := smoothstep(0.0, 2.1, d_land)
				c = col_wet.lerp(base_land_col, wt)
			else:
				var shallow_t := smoothstep(0.0, -3.4, d_land)
				var deep_t := smoothstep(-2.2, -5.8, d_land)
				var sand_patch := clampf((0.5 + 0.5 * sin(wx * 0.44 + wz * 0.62) * cos(wx * 0.78 - wz * 0.36)) - 0.18, 0.0, 1.0) * (1.0 - smoothstep(-0.6, -4.2, d_land))
				var col_kelp := Color("#273b17")
				var kelp_mottle := clampf((0.5 + 0.5 * sin(wx * 0.62 - wz * 0.48 + cos(wx * 0.25)) * cos(wx * 0.94 + wz * 0.72) - 0.32) * 1.65, 0.0, 1.0) * smoothstep(-0.20, -0.85, d_land) * (1.0 - smoothstep(-2.4, -4.6, d_land))
				c = col_wet.lerp(col_reef, shallow_t).lerp(col_sandbar, sand_patch * 0.72).lerp(col_kelp, kelp_mottle * 0.80).lerp(col_seabed, deep_t)

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
			_emit_quad_up_st(
				st_beach, p0, p1, p2, p3,
				a_c[ix], a_c[ix + 1], b_c[ix + 1], b_c[ix],
				Vector2(p0.x * 0.24, p0.z * 0.24),
				Vector2(p1.x * 0.24, p1.z * 0.24),
				Vector2(p2.x * 0.24, p2.z * 0.24),
				Vector2(p3.x * 0.24, p3.z * 0.24)
			)

	st_beach.generate_normals()
	var beach_inst := MeshInstance3D.new()
	beach_inst.name = "PleamarCoveBeach"
	beach_inst.mesh = st_beach.commit()
	beach_inst.material_override = beach_mat
	beach_inst.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	cove_node.add_child(beach_inst)
	var beach_faces := PackedVector3Array()
	var raw_faces := beach_inst.mesh.get_faces()
	for fi in range(0, raw_faces.size(), 3):
		var v0 := raw_faces[fi]
		var v1 := raw_faces[fi + 1]
		var v2 := raw_faces[fi + 2]
		var cx := (v0.x + v1.x + v2.x) / 3.0
		var cy_avg := (v0.y + v1.y + v2.y) / 3.0
		if cx <= 27.6 and cy_avg >= -0.02:
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

	# 2. Promontorio costero volcánico esculpido en basalto fracturado y acantilado de fondo cerrando la bahía hacia Z2
	var basalt_slate_mat := _make_glb_mat(Color("#b6bec6"), 0.86, 0.02, tex_basalt_cove if tex_basalt_cove else tex_cliff_cove, 0.22, norm_rock_cove, true, 0.88)
	var basalt_dark_mat := _make_glb_mat(Color("#767e86"), 0.82, 0.03, tex_basalt_cove if tex_basalt_cove else tex_cliff_cove, 0.20, norm_rock_cove, true, 0.88)
	var bluff_mat := _make_textured_mat(Color("#cad0d4"), 0.90, 0.03, tex_basalt_cove if tex_basalt_cove else tex_cliff_cove, 0.20, true, norm_rock_cove, 0.85)
	bluff_mat.vertex_color_use_as_albedo = true
	bluff_mat.vertex_color_is_srgb = true
	bluff_mat.vertex_color_use_as_albedo = true
	bluff_mat.vertex_color_is_srgb = true
	bluff_mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	_create_volcanic_headland_mound(cove_node, "PleamarFarWestSpurCliff", Vector3(-18.8, 0.0, 77.6), 9.2, 7.6, 3.8, -3.8, bluff_mat, 2.3)
	_create_volcanic_headland_mound(cove_node, "PleamarWestSpurCliff", Vector3(-7.2, 0.0, 81.2), 11.8, 9.2, 4.7, -3.8, bluff_mat, 0.6)
	_create_volcanic_headland_mound(cove_node, "PleamarNorthCliffBluff", Vector3(5.8, 0.0, 86.2), 10.6, 7.6, 5.0, -3.8, bluff_mat, 1.9)
	_create_volcanic_headland_mound(cove_node, "PleamarEastCliffShoulder", Vector3(14.8, 0.0, 87.2), 9.6, 7.0, 4.3, -3.8, bluff_mat, 3.2)
	_create_volcanic_headland_mound(cove_node, "PleamarInletCliffWall", Vector3(22.2, 0.0, 82.0), 9.2, 8.2, 5.8, -3.8, bluff_mat, 4.4)
	_create_volcanic_headland_mound(cove_node, "PleamarBayBackCliff_A", Vector3(26.5, 0.0, 74.2), 11.5, 9.5, 7.2, -3.8, bluff_mat, 2.7)
	_create_volcanic_headland_mound(cove_node, "PleamarBayBackCliff_B", Vector3(36.8, 0.0, 79.2), 11.8, 10.2, 8.2, -3.8, bluff_mat, 5.1)
	_create_volcanic_headland_mound(cove_node, "PleamarBayBackCliff_C", Vector3(44.8, 0.0, 85.8), 11.2, 10.5, 7.4, -3.8, bluff_mat, 1.4)
	_build_volcanic_cliff_sculpt_and_cleft(cove_node, rng, basalt_slate_mat, basalt_dark_mat, tex_basalt_cove if tex_basalt_cove else tex_cliff_cove, norm_rock_cove)

	# Contrafuertes de basalto erosionado integrando laderas, pie del promontorio y fondo de cala (familia basáltica coherente)
	var buttress_mesh := SceneEnhancer.make_basalt_outcrop_mesh(193)
	var headland_buttresses := [
		{"pos": Vector3(-11.2, -0.45, 86.8), "sc": Vector3(3.4, 2.9, 2.8), "rot": Vector3(4.0, 22.0, -5.0)},
		{"pos": Vector3(-5.2, -0.40, 89.2), "sc": Vector3(3.1, 2.8, 2.6), "rot": Vector3(-3.0, -18.0, 4.0)},
		{"pos": Vector3(0.4, -0.40, 91.6), "sc": Vector3(3.2, 3.0, 2.7), "rot": Vector3(5.0, 38.0, -4.0)},
		{"pos": Vector3(6.2, -0.35, 92.0), "sc": Vector3(3.5, 2.7, 2.8), "rot": Vector3(-4.0, 14.0, 5.0)},
		{"pos": Vector3(11.4, -0.35, 91.6), "sc": Vector3(2.9, 2.5, 2.5), "rot": Vector3(6.0, -28.0, -4.0)},
		{"pos": Vector3(16.8, -0.35, 92.8), "sc": Vector3(3.2, 2.8, 2.6), "rot": Vector3(-5.0, 46.0, 3.0)},
		{"pos": Vector3(21.4, -0.50, 94.6), "sc": Vector3(3.4, 2.9, 3.0), "rot": Vector3(3.0, -34.0, -6.0)},
		{"pos": Vector3(24.6, -0.80, 99.6), "sc": Vector3(3.6, 3.1, 3.1), "rot": Vector3(-6.0, 24.0, 4.0)},
		{"pos": Vector3(4.8, 1.80, 89.2), "sc": Vector3(3.6, 2.6, 2.9), "rot": Vector3(8.0, -18.0, -6.0)},
		{"pos": Vector3(10.6, 1.40, 88.8), "sc": Vector3(3.4, 2.5, 2.8), "rot": Vector3(-6.0, 32.0, 5.0)},
		{"pos": Vector3(29.8, -0.40, 86.2), "sc": Vector3(4.4, 4.2, 3.8), "rot": Vector3(4.0, 18.0, -4.0)},
		{"pos": Vector3(34.5, 0.20, 90.8), "sc": Vector3(4.2, 4.0, 3.6), "rot": Vector3(-5.0, -26.0, 6.0)},
		{"pos": Vector3(25.4, -0.35, 86.8), "sc": Vector3(3.6, 3.2, 3.2), "rot": Vector3(3.0, -14.0, 5.0)},
	]
	for hbi in range(headland_buttresses.size()):
		var hb: Dictionary = headland_buttresses[hbi]
		var hb_inst := MeshInstance3D.new()
		hb_inst.name = "HeadlandBasaltButtress_%d" % hbi
		hb_inst.mesh = buttress_mesh
		hb_inst.material_override = basalt_slate_mat if hbi % 2 == 0 else basalt_dark_mat
		hb_inst.position = hb["pos"]
		hb_inst.rotation_degrees = hb["rot"]
		hb_inst.scale = hb["sc"]
		hb_inst.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		cove_node.add_child(hb_inst)

	# 3. Paso costero entre farallones de basalto (cielo abierto hacia el oeste, sin túnel ni entrada artificial de gruta)
	var arch_node := Node3D.new()
	arch_node.name = "PleamarSeaArch"
	cove_node.add_child(arch_node)
	var arch_boulders := [
		{"pos": Vector3(4.0, -0.45, 93.4), "sc": Vector3(2.6, 3.0, 2.3), "rot": Vector3(6.0, 18.0, -5.0), "mat": basalt_slate_mat},
		{"pos": Vector3(1.6, -0.35, 92.6), "sc": Vector3(2.8, 3.2, 2.5), "rot": Vector3(-4.0, 34.0, 6.0), "mat": basalt_dark_mat},
		{"pos": Vector3(-0.2, -0.55, 99.6), "sc": Vector3(2.8, 3.1, 2.5), "rot": Vector3(-6.0, -24.0, 8.0), "mat": basalt_slate_mat},
		{"pos": Vector3(-3.8, -0.50, 97.4), "sc": Vector3(2.7, 2.7, 2.5), "rot": Vector3(8.0, 20.0, -7.0), "mat": basalt_dark_mat},
		{"pos": Vector3(-7.8, -0.40, 89.2), "sc": Vector3(3.1, 3.4, 2.6), "rot": Vector3(5.0, -14.0, 4.0), "mat": basalt_slate_mat},
		{"pos": Vector3(-9.2, -0.55, 94.8), "sc": Vector3(2.9, 2.6, 2.5), "rot": Vector3(-5.0, 28.0, -6.0), "mat": basalt_dark_mat},
		{"pos": Vector3(-13.4, -0.50, 92.4), "sc": Vector3(3.2, 2.9, 2.7), "rot": Vector3(6.0, -32.0, 5.0), "mat": basalt_slate_mat},
		{"pos": Vector3(-16.2, -0.40, 84.2), "sc": Vector3(2.8, 2.9, 2.4), "rot": Vector3(-4.0, 18.0, 5.0), "mat": basalt_dark_mat},
		{"pos": Vector3(-18.6, -0.45, 89.8), "sc": Vector3(3.0, 2.5, 2.5), "rot": Vector3(5.0, -24.0, -4.0), "mat": basalt_slate_mat},
		{"pos": Vector3(-22.4, -0.35, 80.6), "sc": Vector3(3.1, 2.8, 2.5), "rot": Vector3(-3.0, 32.0, 4.0), "mat": basalt_dark_mat},
		{"pos": Vector3(-23.8, -0.45, 86.2), "sc": Vector3(2.9, 2.3, 2.4), "rot": Vector3(4.0, -18.0, -5.0), "mat": basalt_slate_mat},
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
		b_inst.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		b_wrap.add_child(b_inst)
		if bi in [0, 2, 4]:
			SceneEnhancer.add_cyl_collider(b_wrap, Vector3(0.0, b_sc.y * 0.42, 0.0), minf(b_sc.x, b_sc.z) * 0.30, b_sc.y)
		SceneEnhancer.tag_camera_occluder(b_wrap)

	# Postes costeros con cabo náutico únicamente en el tramo estrecho hacia el oeste, marcando la continuidad fuera de mapa
	var mat_cove_rope := _make_mat(Color("#9e8462"), 0.92, 0.0)
	var post_coords := [
		Vector3(5.2, 0.54, 99.6), Vector3(2.0, 0.54, 97.8), Vector3(-1.8, 0.57, 95.6),
		Vector3(-5.8, 0.62, 93.4), Vector3(-9.8, 0.67, 91.2), Vector3(-13.8, 0.73, 89.0),
		Vector3(-18.2, 0.81, 86.4), Vector3(-22.6, 0.90, 83.8)
	]
	for pi in range(post_coords.size()):
		var pp: Vector3 = post_coords[pi]
		_create_cylinder(cove_node, "CovePost_%d" % pi, pp + Vector3(0.0, 0.42, 0.0), 0.075, 0.84, mat_wood_dark)
		SceneEnhancer.add_cyl_collider(cove_node, pp + Vector3(0.0, 0.55, 0.0), 0.14, 1.2)
		if pi < post_coords.size() - 1:
			var np: Vector3 = post_coords[pi + 1]
			var mid_p := (pp + np) * 0.5 + Vector3(0.0, 0.68, 0.0)
			var rope := _create_box_prop(cove_node, "CoveRope_%d" % pi, mid_p, Vector3(0.042, 0.042, pp.distance_to(np)), mat_cove_rope)
			rope.rotation.y = atan2(np.x - pp.x, np.z - pp.z)
			SceneEnhancer.add_segment_barrier(cove_node, pp, np, 0.24, 1.55)
	_build_step8_pleamar_wayfinding(cove_node, arch_node, rng)

	# Matorral mediterráneo natural y rocas de escollera (coníferas variadas, hierbas, brezo y detalles en _build_coastal_vegetation_and_detail)
	var bush_tones := [Color("#2e4422"), Color("#3b522a"), Color("#485d32")]
	var rock_tones := [Color("#b8c0c8"), Color("#ced5dc"), Color("#9da5ae")]
	var cliff_bush_xz := [
		Vector2(3.4, 90.6), Vector2(0.2, 89.8), Vector2(3.2, 89.0),
		Vector2(7.4, 88.8), Vector2(-2.6, 86.4), Vector2(14.8, 89.2),
		Vector2(-8.6, 85.8), Vector2(-14.2, 84.4), Vector2(21.4, 92.4)
	]
	for cb in cliff_bush_xz:
		var cy := maxf(
			maxf(
				_eval_volcanic_cliff_y(cb.x, cb.y, Vector3(5.8, 0.0, 86.2), 10.6, 7.6, 5.0, -3.8, 1.9),
				_eval_volcanic_cliff_y(cb.x, cb.y, Vector3(-7.2, 0.0, 81.2), 11.8, 9.2, 4.7, -3.8, 0.6)
			),
			_eval_volcanic_cliff_y(cb.x, cb.y, Vector3(14.8, 0.0, 87.2), 9.6, 7.0, 4.3, -3.8, 3.2)
		)
		var cb_sc := rng.randf_range(0.78, 1.26)
		var cbb := Basis.from_euler(Vector3(0.0, rng.randf_range(0.0, TAU), 0.0)).scaled(Vector3(cb_sc * 1.18, cb_sc * 0.90, cb_sc * 1.18))
		bushes_xf.append(Transform3D(cbb, Vector3(cb.x, cy - 0.14, cb.y)))
		bushes_col.append(bush_tones[rng.randi() % bush_tones.size()])
	# Arbustos costeros únicamente en las lindes rocosas del pie de risco, dejando despejada la playa central para combate
	for b_pt in [
		Vector3(18.6, 1.4, 92.6), Vector3(19.8, 0.45, 96.2), Vector3(23.2, 0.44, 100.8),
		Vector3(-4.6, 0.54, 88.4), Vector3(-11.4, 0.60, 87.0)
	]:
		var bsc := rng.randf_range(0.75, 1.18)
		var bb := Basis.from_euler(Vector3(0.0, rng.randf_range(0.0, TAU), 0.0)).scaled(Vector3(bsc * 1.15, bsc * 0.90, bsc * 1.15))
		bushes_xf.append(Transform3D(bb, b_pt))
		bushes_col.append(bush_tones[rng.randi() % bush_tones.size()])
	# Grupos asimétricos de rocas basálticas en la orilla, arrecifes bajo Z2, cala y costa oeste
	var shore_rock_specs := [
		[Vector3(17.4, 0.14, 111.0), Vector3(1.65, 0.68, 1.45)],
		[Vector3(16.3, 0.10, 111.3), Vector3(0.95, 0.44, 0.90)],
		[Vector3(11.6, 0.16, 109.6), Vector3(1.85, 0.76, 1.50)],
		[Vector3(6.8, 0.13, 106.8), Vector3(1.45, 0.60, 1.35)],
		[Vector3(5.6, 0.10, 105.9), Vector3(0.85, 0.42, 0.80)],
		[Vector3(0.8, 0.14, 101.2), Vector3(1.75, 0.78, 1.55)],
		[Vector3(-4.8, 0.08, 99.8), Vector3(2.10, 0.92, 1.75)],
		[Vector3(-9.6, 0.06, 97.6), Vector3(2.35, 1.10, 1.85)],
		[Vector3(-13.8, 0.04, 95.4), Vector3(2.20, 0.95, 1.80)],
		[Vector3(19.8, 0.24, 94.2), Vector3(1.90, 0.92, 1.65)],
		[Vector3(21.6, 0.16, 98.2), Vector3(1.55, 0.68, 1.40)],
		[Vector3(24.4, 0.13, 103.2), Vector3(1.30, 0.56, 1.25)],
		# Escolleras y afloramientos basálticos que enlazan la arena con el pie de la escalera Z2 sin cortes cuadrados
		[Vector3(27.8, -0.25, 113.0), Vector3(2.40, 1.15, 2.00)],
		[Vector3(30.4, -0.35, 112.6), Vector3(2.70, 1.30, 2.15)],
		[Vector3(33.2, -0.45, 111.8), Vector3(2.90, 1.45, 2.25)],
		[Vector3(35.8, -0.30, 112.4), Vector3(2.50, 1.25, 2.10)],
		[Vector3(38.6, -0.45, 113.2), Vector3(2.80, 1.40, 2.20)],
		[Vector3(29.2, 0.16, 106.4), Vector3(1.65, 0.68, 1.45)],
		[Vector3(31.0, 0.22, 105.6), Vector3(1.45, 0.62, 1.30)],
		# Ripio y lascas basálticas al pie de los contrafuertes del promontorio (detalles costeros sin invadir la playa abierta)
		[Vector3(1.8, 0.36, 92.2), Vector3(0.85, 0.34, 0.78)],
		[Vector3(3.6, 0.34, 92.8), Vector3(0.68, 0.28, 0.62)],
		[Vector3(6.4, 0.34, 93.4), Vector3(0.92, 0.36, 0.80)],
		[Vector3(9.4, 0.35, 93.2), Vector3(0.75, 0.30, 0.70)],
		[Vector3(12.2, 0.36, 93.0), Vector3(0.88, 0.34, 0.76)],
		[Vector3(15.6, 0.36, 93.8), Vector3(0.72, 0.28, 0.65)],
		[Vector3(18.8, 0.34, 94.8), Vector3(0.82, 0.32, 0.72)],
		[Vector3(14.2, 0.20, 110.2), Vector3(0.78, 0.28, 0.68)],
		[Vector3(9.4, 0.18, 108.4), Vector3(0.70, 0.24, 0.62)],
		[Vector3(3.2, 0.16, 103.6), Vector3(0.74, 0.26, 0.66)],
		[Vector3(26.8, 0.20, 111.0), Vector3(0.90, 0.34, 0.78)],
	]
	for rs_spec in shore_rock_specs:
		var r_sc: Vector3 = rs_spec[1]
		var rb := Basis.from_euler(Vector3(rng.randf_range(-0.08, 0.08), rng.randf_range(0.0, TAU), rng.randf_range(-0.08, 0.08))).scaled(r_sc)
		rocks_xf.append(Transform3D(rb, rs_spec[0]))
		rocks_col.append(rock_tones[rng.randi() % rock_tones.size()])
	# Lajas planas de granito desgastado marcando claramente la bifurcación muelle <-> escaleras Z2 <-> senda Pleamar
	var step_mesh := BoxMesh.new()
	step_mesh.size = Vector3(1.0, 1.0, 1.0)
	var step_xf: Array[Transform3D] = []
	var step_col: Array[Color] = []
	var paver_tones: Array[Color] = [Color("#cfc2a8"), Color("#bbb099"), Color("#d6cab2"), Color("#a89d88")]
	var step_coords: Array[Vector3] = [
		Vector3(26.6, 0.44, 109.2), Vector3(24.6, 0.485, 108.6), Vector3(22.5, 0.495, 108.1),
		Vector3(20.9, 0.502, 108.8), Vector3(19.6, 0.505, 106.5),
		Vector3(16.6, 0.508, 104.2), Vector3(13.8, 0.515, 102.0), Vector3(9.6, 0.530, 99.2),
		Vector3(6.2, 0.542, 97.4), Vector3(2.8, 0.555, 95.6), Vector3(-0.6, 0.575, 94.0),
		Vector3(-3.8, 0.60, 92.6), Vector3(-7.0, 0.635, 91.0), Vector3(-10.2, 0.68, 89.6),
		Vector3(-13.8, 0.73, 87.9), Vector3(-17.4, 0.79, 86.2), Vector3(-20.8, 0.85, 84.4)
	]
	for st_i in range(step_coords.size()):
		var sc_pos: Vector3 = step_coords[st_i]
		var sbas := Basis.from_euler(Vector3(rng.randf_range(-0.02, 0.02), rng.randf_range(0.0, TAU), rng.randf_range(-0.02, 0.02))).scaled(Vector3(rng.randf_range(0.88, 1.24), 0.036, rng.randf_range(0.68, 0.92)))
		step_xf.append(Transform3D(sbas, sc_pos))
		step_col.append(paver_tones[rng.randi() % paver_tones.size()])
	var paver_mat := _make_textured_mat(Color.WHITE, 0.90, 0.02, tex_basalt_cove if tex_basalt_cove else tex_cliff_cove, 0.28, true, norm_rock_cove, 0.45)
	paver_mat.vertex_color_use_as_albedo = true
	paver_mat.vertex_color_is_srgb = true
	var mm_pavers := _make_multimesh_batch("MM_BeachTrailPavers", step_mesh, paver_mat, step_xf, step_col)
	mm_pavers.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	cove_node.add_child(mm_pavers)
	_build_submerged_kelp_batch(cove_node, rng)
	_build_coastal_sunbeams(cove_node)
	_build_coastal_vegetation_and_detail(cove_node, rng)
	_build_step6_vegetation_transitions(cove_node, rng)

func _build_step8_pleamar_wayfinding(cove_node: Node3D, arch_node: Node3D, rng: RandomNumberGenerator) -> void:
	# 8.1-8.3 Paso 8: Lectura exterior de salida a Pleamar, bifurcación costa vs senda alta y señal marítima en muelle
	var norm_rock := _load_tex("rock-normal-v1.png")
	var tex_stone := _load_tex("basalt-coastal-albedo-v1.webp")
	var cairn_mat := _make_textured_mat(Color("#a8aeb4"), 0.88, 0.02, tex_stone, 0.24, true, norm_rock, 0.60)
	var board_mat := _make_textured_mat(Color("#8c6844"), 0.86, 0.0, _load_tex("oak-v4.webp"), 0.35, true)

	# 8.2 Hito principal de viaje en bifurcación exterior (lejos del centro del sendero x=5.6 z=97.7)
	var beacon_pos := Vector3(4.15, 0.54, 95.35)
	var cairn_mesh := SceneEnhancer.make_basalt_outcrop_mesh(311)
	for ci in range(4):
		var ang := float(ci) * 1.57 + 0.35
		var cst := MeshInstance3D.new()
		cst.name = "PleamarWayfinderCairnStone_%d" % ci
		cst.mesh = cairn_mesh
		cst.material_override = cairn_mat
		cst.position = beacon_pos + Vector3(cos(ang) * 0.24, -0.04, sin(ang) * 0.24)
		cst.rotation.y = rng.randf_range(0.0, TAU)
		cst.scale = Vector3(0.42, 0.28, 0.38)
		cst.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		cove_node.add_child(cst)
	_add_ground_contact_shadow(cove_node, "PleamarWayfinderShadow", Vector3(beacon_pos.x, 0.555, beacon_pos.z), Vector2(1.25, 1.25), 0.45)

	var main_post := _create_cylinder(cove_node, "PleamarWayfinderPost", beacon_pos + Vector3(0.0, 1.02, 0.0), 0.09, 2.10, mat_wood_dark)
	main_post.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	var pl_sign_ip := SceneEnhancer._attach_interactive_prop(main_post, "noticeboard", "Poste hacia las Cuevas de Pleamar", "[T] Leer señal de Pleamar", Vector3.ZERO, "w", "«← Cuevas de Pleamar · Sendero costero transitable solo en marea baja; camino alto seguro por la cresta oeste.»")
	pl_sign_ip.interact_radius = 2.75
	SceneEnhancer.add_cyl_collider(cove_node, beacon_pos + Vector3(0.0, 0.85, 0.0), 0.22, 1.85)

	var arm := _create_box_prop(cove_node, "PleamarWayfinderArm", beacon_pos + Vector3(0.30, 1.94, 0.14), Vector3(0.58, 0.08, 0.08), mat_wood_dark)
	arm.rotation.y = -0.45
	arm.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	var lan_p := beacon_pos + Vector3(0.46, 1.72, 0.22)
	_create_cylinder(cove_node, "PleamarWayfinderCap", lan_p + Vector3(0.0, 0.15, 0.0), 0.12, 0.06, mat_iron)
	var lan_flm := _create_box_prop(cove_node, "PleamarWayfinderLantern", lan_p, Vector3(0.14, 0.20, 0.14), mat_flame)
	lan_flm.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	var way_lt := OmniLight3D.new()
	way_lt.name = "PleamarWayfinderLight"
	way_lt.position = lan_p
	way_lt.light_color = Color(1.0, 0.74, 0.36)
	way_lt.light_energy = 1.50
	way_lt.omni_range = 9.5
	cove_node.add_child(way_lt)
	register_flame_fx(lan_flm, way_lt, false)

	# 8.3 Dos tablillas de bifurcación: ruta costera (marea baja) vs senda alta (marea alta)
	var low_blade := _create_box_prop(cove_node, "PleamarForkBladeCoast", beacon_pos + Vector3(-0.18, 1.48, 0.08), Vector3(0.76, 0.19, 0.045), board_mat)
	low_blade.rotation.y = 0.42
	low_blade.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	var lbl_coast := Label3D.new()
	lbl_coast.text = "← Costa Pleamar (Marea ↓)"
	lbl_coast.font_size = 20
	lbl_coast.pixel_size = 0.0040
	lbl_coast.modulate = Color("#f3e6c8")
	lbl_coast.outline_size = 4
	lbl_coast.outline_modulate = Color("#24170c")
	lbl_coast.position = Vector3(0.0, 0.0, 0.026)
	low_blade.add_child(lbl_coast)

	var high_blade := _create_box_prop(cove_node, "PleamarForkBladeHigh", beacon_pos + Vector3(0.16, 1.72, -0.06), Vector3(0.72, 0.18, 0.045), board_mat)
	high_blade.rotation.y = -0.32
	high_blade.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	var lbl_high := Label3D.new()
	lbl_high.text = "↑ Senda Alta (Collado)"
	lbl_high.font_size = 20
	lbl_high.pixel_size = 0.0040
	lbl_high.modulate = Color("#f3e6c8")
	lbl_high.outline_size = 4
	lbl_high.outline_modulate = Color("#24170c")
	lbl_high.position = Vector3(0.0, 0.0, 0.026)
	high_blade.add_child(lbl_high)

	# Peldaños bajos sugiriendo físicamente la subida de la senda alta tras la baliza (100% exteriores)
	var fork_steps := [
		Vector3(4.55, 0.60, 94.45),
		Vector3(4.85, 0.78, 93.45),
		Vector3(5.20, 1.02, 92.45)
	]
	for fsi in range(fork_steps.size()):
		var fsp := _create_box_prop(cove_node, "HighRidgeForkStep_%d" % fsi, fork_steps[fsi], Vector3(1.12, 0.16, 0.68), cairn_mat)
		fsp.rotation = Vector3(-0.18, -0.26, 0.04)
		fsp.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON

	# Farol de arco costero exterior ligeramente adelantado hacia el paso oeste (y sentinel de borde norte)
	var arch_lp := Vector3(1.2, 1.05, 94.2)
	var arch_post := _create_cylinder(arch_node, "ArchGuideLanternPost", arch_lp, 0.075, 1.08, mat_wood_dark)
	arch_post.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	var arch_flm := _create_box_prop(arch_node, "ArchGuideLantern", Vector3(1.2, 1.62, 94.2), Vector3(0.17, 0.22, 0.17), mat_flame)
	arch_flm.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	register_flame_fx(arch_flm, null, false)

	# Señal marítima compacta fijada sobre el poste oeste de entrada al muelle (sin solapar 'Bote · Mar' ni flotar)
	var pier_route_p := Vector3(18.65, 0.50, 110.22)
	var pr_board := _create_box_prop(cove_node, "PierSeaRouteBoard", pier_route_p + Vector3(0.0, 0.72, 0.11), Vector3(0.62, 0.17, 0.045), board_mat)
	pr_board.rotation.y = 0.06
	var lbl_sea := Label3D.new()
	lbl_sea.text = "Pleamar · Pecio →"
	lbl_sea.font_size = 16
	lbl_sea.pixel_size = 0.0036
	lbl_sea.modulate = Color("#f3e6c8")
	lbl_sea.outline_size = 4
	lbl_sea.outline_modulate = Color("#24170c")
	lbl_sea.position = Vector3(0.0, 0.0, 0.026)
	pr_board.add_child(lbl_sea)
	var pier_sign_ip := SceneEnhancer._attach_interactive_prop(pr_board, "noticeboard", "Cartel Marítimo del Muelle", "[T] Leer señal marítima", Vector3.ZERO, "s", "⚓ Ruta costera hacia el Este: Cavernas de Pleamar (a dos horas bordeando acantilados con marea baja) y Pecio del Rosa de los Vientos en aguas abiertas.")
	pier_sign_ip.interact_radius = 2.60

	_build_step9_monastic_narrative_props(cove_node)

func _build_step9_monastic_narrative_props(cove_node: Node3D) -> void:
	# 9.1-9.3 Paso 9: Pocos props monásticos ordenados (uso reciente sereno del Retiro del Dragón, cero caos portuario)
	var mono_node := Node3D.new()
	mono_node.name = "MonasticLandingSupplies"
	cove_node.add_child(mono_node)

	var mat_crate := _make_textured_mat(Color("#8c6a47"), 0.86, 0.0, _load_tex("oak-v4.webp"), 0.38, true, _load_tex("wood-normal-v1.png"), 0.45)
	var mat_sack := _make_textured_mat(Color("#cbb898"), 0.94, 0.0, _load_tex("linen-v4.webp"), 0.65, true)
	var mat_cord := _make_textured_mat(Color("#9e8462"), 0.92, 0.0, _load_tex("linen-v4.webp"), 0.8, true)
	var mat_herbs := _make_mat(Color("#47622d"), 0.88, 0.0)

	# 1. Caja entreabierta ordenada con atados de hierbas/provisiones (margen norte, pasillo Z2<->muelle 100% libre)
	var c_pos := Vector3(25.05, 0.58, 106.85)
	var crate_base := _create_box_prop(mono_node, "MonasticOpenHerbCrate", c_pos, Vector3(0.72, 0.36, 0.52), mat_crate)
	crate_base.rotation.y = -0.24
	crate_base.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	var bundle_a := _create_box_prop(mono_node, "MonasticCrateClothPack", c_pos + Vector3(-0.14, 0.14, 0.0), Vector3(0.24, 0.14, 0.32), mat_cloth_blue)
	bundle_a.rotation.y = -0.24
	var bundle_b := _create_box_prop(mono_node, "MonasticCrateHerbBundle", c_pos + Vector3(0.14, 0.15, -0.02), Vector3(0.24, 0.13, 0.30), mat_herbs)
	bundle_b.rotation = Vector3(0.05, -0.10, -0.06)
	var crate_lid := _create_box_prop(mono_node, "MonasticOpenCrateLid", c_pos + Vector3(-0.08, 0.24, -0.18), Vector3(0.74, 0.045, 0.36), mat_crate)
	crate_lid.rotation = Vector3(-0.42, -0.24, 0.0)
	crate_lid.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON

	# 2. Un saco de lino atado junto a la caja
	var s_pos := Vector3(24.45, 0.56, 107.18)
	var sack_body := _create_cylinder(mono_node, "MonasticHempSack", s_pos, 0.22, 0.38, mat_sack)
	sack_body.scale = Vector3(1.0, 0.92, 0.84)
	sack_body.rotation = Vector3(0.08, 0.32, -0.06)
	sack_body.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	var sack_neck := _create_cylinder(mono_node, "MonasticSackTie", s_pos + Vector3(0.02, 0.19, 0.01), 0.11, 0.07, mat_cord)
	sack_neck.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF

	# 3. Un cabo bien enrollado al pie del saco (listo para amarrar o reparar)
	for cl_i in range(2):
		var c_tor := MeshInstance3D.new()
		var cm := TorusMesh.new()
		cm.inner_radius = 0.12 - float(cl_i) * 0.03
		cm.outer_radius = 0.23 - float(cl_i) * 0.04
		c_tor.name = "MonasticSpareRopeCoil_%d" % cl_i
		c_tor.mesh = cm
		c_tor.material_override = mat_cord
		c_tor.position = Vector3(24.72, 0.505 + float(cl_i) * 0.038, 107.62)
		c_tor.scale = Vector3(1.0, 0.42, 1.0)
		c_tor.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		mono_node.add_child(c_tor)

	# 4. Una tabla de madera suelta curada apoyada junto al margen rocoso (sin invadir paso)
	var plank_p := Vector3(25.85, 0.56, 106.55)
	var rest_stone := _create_box_prop(mono_node, "MonasticPlankSupportStone", plank_p + Vector3(0.0, -0.08, 0.0), Vector3(0.40, 0.12, 0.28), mat_rock_carved)
	rest_stone.rotation.y = 0.40
	var spare_plank := _create_box_prop(mono_node, "MonasticSeasonedPlank", plank_p, Vector3(0.24, 0.048, 1.28), mat_wood)
	spare_plank.rotation = Vector3(0.08, 0.38, -0.04)
	spare_plank.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON

	# 5. Un farol austero de hierro asentado serenamente junto al cajón de hierbas
	var l_p := Vector3(25.26, 0.86, 106.74)
	_create_cylinder(mono_node, "MonasticCacheLanternBase", l_p - Vector3(0.0, 0.09, 0.0), 0.09, 0.04, mat_iron)
	_create_cylinder(mono_node, "MonasticCacheLanternCap", l_p + Vector3(0.0, 0.11, 0.0), 0.10, 0.045, mat_iron)
	var m_lan := _create_box_prop(mono_node, "MonasticCacheLanternFlame", l_p, Vector3(0.11, 0.16, 0.11), mat_flame)
	m_lan.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	register_flame_fx(m_lan, null, false)

	# Sombras de contacto AO y colisión compacta en margen norte (sin obstruir Z2<->muelle)
	_add_ground_contact_shadow(mono_node, "MonasticSuppliesAO", Vector3(24.90, 0.465, 107.02), Vector2(1.90, 1.40), 0.44)
	_add_ground_contact_shadow(mono_node, "MonasticPlankAO", Vector3(25.85, 0.455, 106.55), Vector2(0.55, 1.45), 0.38)
	SceneEnhancer.add_box_collider(mono_node, Vector3(24.95, 0.65, 106.95), Vector3(1.50, 0.78, 1.05), -0.18)

func _build_step6_vegetation_transitions(cove_node: Node3D, rng: RandomNumberGenerator) -> void:
	# 6.1-6.3 Paso 6: Variación de coníferas, transición orgánica roca-hierba en grietas/zonas protegidas y visibilidad táctica abierta
	var cr_mmi := cove_node.get_node_or_null("MM_CoastalPineCrowns") as MultiMeshInstance3D
	var tr_mmi := cove_node.get_node_or_null("MM_CoastalPineTrunks") as MultiMeshInstance3D
	var pine_tones: Array[Color] = [
		Color("#253c25"), Color("#334c2f"), Color("#435a38"), Color("#2c452d"), Color("#3c5131")
	]
	if tr_mmi:
		var t_list: Array[MultiMeshInstance3D] = [tr_mmi]
		for ch in tr_mmi.get_children():
			if ch is MultiMeshInstance3D:
				t_list.append(ch as MultiMeshInstance3D)
		for tm_node in t_list:
			if tm_node.multimesh == null:
				continue
			var t_mm := tm_node.multimesh
			for ti in range(t_mm.instance_count):
				var xf := t_mm.get_instance_transform(ti)
				var h_var := rng.randf_range(0.76, 1.38)
				var lean := Basis.from_euler(Vector3(rng.randf_range(-0.10, 0.08), rng.randf_range(-0.3, 0.3), rng.randf_range(-0.12, 0.12)))
				var new_b := lean * xf.basis.scaled(Vector3(1.0, h_var, 1.0))
				t_mm.set_instance_transform(ti, Transform3D(new_b, xf.origin))
	if cr_mmi:
		var c_list: Array[MultiMeshInstance3D] = [cr_mmi]
		for ch in cr_mmi.get_children():
			if ch is MultiMeshInstance3D:
				c_list.append(ch as MultiMeshInstance3D)
		for cm_node in c_list:
			if cm_node.multimesh == null:
				continue
			var c_mm := cm_node.multimesh
			for ci in range(c_mm.instance_count):
				var xf := c_mm.get_instance_transform(ci)
				var w_sc := rng.randf_range(0.76, 1.28)
				var h_sc := rng.randf_range(0.78, 1.44)
				var skew := Basis.from_euler(Vector3(rng.randf_range(-0.11, 0.11), rng.randf_range(0.0, TAU), rng.randf_range(-0.13, 0.13))).scaled(Vector3(w_sc, h_sc, w_sc))
				var col_orig: Color = c_mm.get_instance_color(ci) if c_mm.use_colors else pine_tones[ci % pine_tones.size()]
				c_mm.set_instance_transform(ci, Transform3D(xf.basis * skew, xf.origin + Vector3(rng.randf_range(-0.20, 0.20), (h_sc - 1.0) * 0.28, rng.randf_range(-0.20, 0.20))))
				if c_mm.use_colors:
					c_mm.set_instance_color(ci, col_orig.lerp(pine_tones[rng.randi() % pine_tones.size()], 0.65))

	# 6.2 Transiciones naturales roca <-> hierba <-> matorral en huecos protegidos (sin obstruir la playa táctica)
	var rock_grass_anchors := [
		Vector2(-10.2, 87.2), Vector2(-7.8, 88.8), Vector2(-4.4, 90.0), Vector2(-0.8, 91.6),
		Vector2(2.6, 92.2), Vector2(5.4, 92.0), Vector2(8.8, 92.4), Vector2(12.2, 92.6),
		Vector2(15.2, 93.4), Vector2(18.2, 94.0), Vector2(20.6, 96.4), Vector2(22.8, 99.6),
		Vector2(24.6, 102.8), Vector2(1.4, 98.4), Vector2(-3.2, 95.8), Vector2(-7.4, 93.6),
		Vector2(4.2, 88.0), Vector2(-5.4, 83.8), Vector2(10.8, 88.6), Vector2(15.2, 88.8),
		Vector2(26.8, 105.6), Vector2(29.8, 104.2)
	]
	var tuft_xf: Array[Transform3D] = []
	var tuft_col: Array[Color] = []
	var fern_xf: Array[Transform3D] = []
	var fern_col: Array[Color] = []
	var bloom_xf: Array[Transform3D] = []
	var bloom_col: Array[Color] = []

	var grass_palette: Array[Color] = [
		Color("#3f542b"), Color("#4d6335"), Color("#5b713f"), Color("#344723"), Color("#6b7946")
	]
	var fern_palette: Array[Color] = [
		Color("#2e4621"), Color("#3a5429"), Color("#476233")
	]
	var bloom_palette: Array[Color] = [
		Color("#7b5b8c"), Color("#8e6c9e"), Color("#6d4e7d"), Color("#9a79a8")
	]

	for rg_v in rock_grass_anchors:
		var rg: Vector2 = rg_v
		var cliff_h := _eval_cove_headland_height(rg.x, rg.y)
		var sand_h := float(_eval_cove_beach_sample(rg.x, rg.y)["wy"])
		var base_y := maxf(sand_h, cliff_h - 0.10) if cliff_h > 0.25 else sand_h
		if base_y < 0.28:
			continue
		for t_i in range(4):
			var ox := rng.randf_range(-0.95, 0.95)
			var oz := rng.randf_range(-0.75, 0.75)
			var tsc := rng.randf_range(0.68, 1.32)
			var tb := Basis.from_euler(Vector3(rng.randf_range(-0.10, 0.10), rng.randf_range(0.0, TAU), rng.randf_range(-0.10, 0.10))).scaled(Vector3(tsc, tsc * rng.randf_range(0.72, 1.18), tsc))
			tuft_xf.append(Transform3D(tb, Vector3(rg.x + ox, base_y - 0.02, rg.y + oz)))
			tuft_col.append(grass_palette[rng.randi() % grass_palette.size()])
		if rng.randf() < 0.72:
			var fsc := rng.randf_range(0.75, 1.25)
			var fb := Basis.from_euler(Vector3(rng.randf_range(-0.08, 0.08), rng.randf_range(0.0, TAU), rng.randf_range(-0.08, 0.08))).scaled(Vector3(fsc, fsc * 0.92, fsc))
			fern_xf.append(Transform3D(fb, Vector3(rg.x + rng.randf_range(-0.55, 0.55), base_y - 0.02, rg.y + rng.randf_range(-0.45, 0.45))))
			fern_col.append(fern_palette[rng.randi() % fern_palette.size()])
		if rng.randf() < 0.48:
			var bsc := rng.randf_range(0.56, 0.88)
			var bb := Basis.from_euler(Vector3(0.0, rng.randf_range(0.0, TAU), 0.0)).scaled(Vector3(bsc, bsc * 0.85, bsc))
			bloom_xf.append(Transform3D(bb, Vector3(rg.x + rng.randf_range(-0.45, 0.45), base_y + 0.08, rg.y + rng.randf_range(-0.45, 0.45))))
			bloom_col.append(bloom_palette[rng.randi() % bloom_palette.size()])

	var grass_mat := _make_mat(Color.WHITE, 0.90, 0.0)
	grass_mat.vertex_color_use_as_albedo = true
	grass_mat.vertex_color_is_srgb = true
	grass_mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	grass_mat.backlight_enabled = true
	grass_mat.backlight = Color(0.08, 0.13, 0.05)

	if not tuft_xf.is_empty():
		var mm_tuft := _make_multimesh_batch("MM_RockGrassTransitions", SceneEnhancer.make_grass_tuft_mesh(), grass_mat, tuft_xf, tuft_col)
		mm_tuft.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		cove_node.add_child(mm_tuft)
	if not fern_xf.is_empty():
		var mm_ferns := _make_multimesh_batch("MM_ShelteredCoastalFerns", SceneEnhancer.make_fern_cluster_mesh(), grass_mat, fern_xf, fern_col)
		mm_ferns.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		cove_node.add_child(mm_ferns)
	if not bloom_xf.is_empty():
		var b_mat := _make_mat(Color.WHITE, 0.86, 0.0)
		b_mat.vertex_color_use_as_albedo = true
		b_mat.vertex_color_is_srgb = true
		b_mat.cull_mode = BaseMaterial3D.CULL_DISABLED
		var mm_blooms := _make_multimesh_batch("MM_ShelteredCoastalHeather", SceneEnhancer.make_blossom_cluster_mesh(), b_mat, bloom_xf, bloom_col)
		mm_blooms.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		cove_node.add_child(mm_blooms)

func _build_volcanic_cliff_sculpt_and_cleft(cove_node: Node3D, rng: RandomNumberGenerator, basalt_slate_mat: Material, basalt_dark_mat: Material, tex_basalt: Texture2D, norm_rock: Texture2D) -> void:
	# 5.1-5.4 Paso 5: Fracturas columnares, contraste geológico, enredaderas en grietas y boca/grieta húmeda oeste
	var rib_mat := _make_textured_mat(Color.WHITE, 0.88, 0.03, tex_basalt, 0.22, true, norm_rock, 0.88)
	rib_mat.vertex_color_use_as_albedo = true
	rib_mat.vertex_color_is_srgb = true

	var rib_xf: Array[Transform3D] = []
	var rib_col: Array[Color] = []
	var rib_tones: Array[Color] = [
		Color("#aeb6be"), Color("#9da39a"), Color("#b8b2a4"), Color("#7c848a"), Color("#7d8968")
	]
	# Costillas verticales y espolones angulosos rompiendo las masas cónicas de los acantilados
	var cliff_anchors := [
		Vector2(-15.5, 81.2), Vector2(-11.8, 84.0), Vector2(-6.5, 84.8), Vector2(-1.8, 86.4),
		Vector2(2.6, 88.2), Vector2(6.8, 89.0), Vector2(11.6, 89.2), Vector2(15.6, 88.8),
		Vector2(20.2, 85.4), Vector2(24.6, 80.2), Vector2(28.4, 78.8), Vector2(33.2, 82.0),
		Vector2(38.6, 84.2), Vector2(43.2, 87.6)
	]
	for cai in range(cliff_anchors.size()):
		var ca: Vector2 = cliff_anchors[cai]
		for sub in range(4):
			var px: float = ca.x + rng.randf_range(-2.6, 2.6)
			var pz: float = ca.y + rng.randf_range(-1.8, 2.1)
			var base_y: float = _eval_cove_headland_height(px, pz)
			if base_y < -0.8:
				base_y = 0.05
			var sc := Vector3(rng.randf_range(2.25, 3.65), rng.randf_range(1.65, 2.85), rng.randf_range(1.85, 2.95))
			var tilt_x := rng.randf_range(-0.14, 0.16)
			var tilt_z := rng.randf_range(-0.16, 0.16)
			var rb := Basis.from_euler(Vector3(tilt_x, rng.randf_range(0.0, TAU), tilt_z)) * Basis.from_scale(sc)
			rib_xf.append(Transform3D(rb, Vector3(px, base_y - sc.y * 0.48, pz)))
			var col := rib_tones[rng.randi() % rib_tones.size()]
			if pz > 88.5 or base_y < 1.1:
				col = col.darkened(0.20)
			elif sub == 0:
				col = col.lerp(Color("#697954"), 0.35)
			rib_col.append(col)

	# Escarpe húmedo oscuro en zonas de salpicadura y juntas bajas de piedra
	var wet_skirt_pts := [
		Vector3(18.6, -0.35, 93.8), Vector3(22.2, -0.35, 97.6), Vector3(24.8, -0.35, 102.2),
		Vector3(-9.2, -0.25, 96.4), Vector3(-4.6, -0.25, 98.4), Vector3(1.2, -0.25, 100.4),
		Vector3(28.4, -0.40, 111.8), Vector3(31.8, -0.45, 111.2), Vector3(35.6, -0.40, 111.6)
	]
	for wsp_v in wet_skirt_pts:
		var wsp: Vector3 = wsp_v
		var sb := Basis.from_euler(Vector3(rng.randf_range(-0.08, 0.08), rng.randf_range(0.0, TAU), rng.randf_range(-0.08, 0.08))) * Basis.from_scale(Vector3(rng.randf_range(1.6, 2.5), rng.randf_range(0.75, 1.25), rng.randf_range(1.5, 2.2)))
		rib_xf.append(Transform3D(sb, wsp))
		rib_col.append(Color("#626b72"))

	var rib_mesh := SceneEnhancer.make_basalt_outcrop_mesh(211)
	var mm_ribs := _make_multimesh_batch("MM_CliffFractureRibs", rib_mesh, rib_mat, rib_xf, rib_col)
	mm_ribs.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	cove_node.add_child(mm_ribs)

	# 5.3 Contacto vivo roca-vegetación: enredaderas y helechos incrustados en grietas de acantilado
	var ivy_xf: Array[Transform3D] = []
	var fern_xf: Array[Transform3D] = []
	var fern_col: Array[Color] = []
	var fern_tones: Array[Color] = [Color("#365026"), Color("#486230"), Color("#567039"), Color("#2a3f1d")]
	var cleft_spots := [
		Vector2(-9.6, 86.2), Vector2(-6.2, 87.2), Vector2(-1.4, 88.2), Vector2(3.2, 89.2),
		Vector2(6.8, 89.8), Vector2(10.4, 89.4), Vector2(14.8, 89.6), Vector2(18.6, 88.8),
		Vector2(21.4, 86.2), Vector2(25.2, 82.4), Vector2(30.4, 85.4), Vector2(34.8, 88.2)
	]
	for cs_v in cleft_spots:
		var cs: Vector2 = cs_v
		var cy: float = maxf(1.25, _eval_cove_headland_height(cs.x, cs.y))
		for iv in range(2):
			var isc := rng.randf_range(0.85, 1.45)
			var ib := Basis.from_euler(Vector3(0.08, rng.randf_range(-0.6, 0.6), rng.randf_range(-0.12, 0.12))).scaled(Vector3(isc, isc * 1.25, isc))
			ivy_xf.append(Transform3D(ib, Vector3(cs.x + rng.randf_range(-1.1, 1.1), cy - rng.randf_range(0.15, 0.85), cs.y + 0.65)))
		for fn in range(2):
			var fsc := rng.randf_range(0.75, 1.25)
			var fb := Basis.from_euler(Vector3(0.14, rng.randf_range(0.0, TAU), rng.randf_range(-0.1, 0.1))).scaled(Vector3(fsc, fsc * 0.9, fsc))
			fern_xf.append(Transform3D(fb, Vector3(cs.x + rng.randf_range(-0.9, 0.9), cy - 0.12, cs.y + 0.35)))
			fern_col.append(fern_tones[rng.randi() % fern_tones.size()])

	if not ivy_xf.is_empty():
		var ivy_mat := _make_mat(Color("#38502c"), 0.88, 0.0)
		ivy_mat.cull_mode = BaseMaterial3D.CULL_DISABLED
		ivy_mat.backlight_enabled = true
		ivy_mat.backlight = Color(0.08, 0.13, 0.05)
		var mm_ivy := _make_multimesh_batch("MM_CliffCreviceVines", SceneEnhancer.make_hanging_ivy_mesh(), ivy_mat, ivy_xf, [])
		mm_ivy.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		cove_node.add_child(mm_ivy)
	if not fern_xf.is_empty():
		var cf_mat := _make_mat(Color.WHITE, 0.88, 0.0)
		cf_mat.vertex_color_use_as_albedo = true
		cf_mat.vertex_color_is_srgb = true
		cf_mat.cull_mode = BaseMaterial3D.CULL_DISABLED
		var mm_cf := _make_multimesh_batch("MM_CliffCreviceFerns", SceneEnhancer.make_fern_cluster_mesh(), cf_mat, fern_xf, fern_col)
		mm_cf.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		cove_node.add_child(mm_cf)

	# 5.4 Refuerzo de grieta/boca costera oeste (-9.5, 1.05, 89.8): jambas basálticas oscuras, fondo sombrío y vapor húmedo
	var cleft_node := Node3D.new()
	cleft_node.name = "WestCoastalCleftPocket"
	cove_node.add_child(cleft_node)
	var recess_mat := _make_textured_mat(Color("#23292e"), 0.95, 0.0, tex_basalt, 0.25, true, norm_rock, 0.80)
	var recess := _create_box_prop(cleft_node, "WestCleftShadowRecess", Vector3(-9.4, 1.55, 85.4), Vector3(4.2, 3.2, 1.6), recess_mat)
	recess.rotation.y = 0.28
	recess.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	var cleft_jamb_mesh := SceneEnhancer.make_basalt_outcrop_mesh(241)
	for ji in range(4):
		var jx: float = [-11.8, -10.5, -7.8, -6.2][ji]
		var jz: float = [85.8, 86.6, 86.2, 87.2][ji]
		var j_sc := Vector3(1.65, 3.4 + float(ji % 2) * 0.9, 1.55)
		var jb := MeshInstance3D.new()
		jb.name = "WestCleftBasaltJamb_%d" % ji
		jb.mesh = cleft_jamb_mesh
		jb.material_override = basalt_dark_mat if ji % 2 == 0 else basalt_slate_mat
		jb.position = Vector3(jx, -0.35, jz)
		jb.rotation_degrees = Vector3(6.0, float(ji) * 42.0, -10.0 if jx < -9.2 else 11.0)
		jb.scale = j_sc
		jb.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		cleft_node.add_child(jb)
	_create_coastal_mist(cleft_node, "Mist_WestCleftMouth", Vector3(-9.2, 1.05, 87.8))
	_create_coastal_mist(cleft_node, "Mist_WestPathHorizon", Vector3(-18.5, 1.20, 84.0))

func _build_submerged_kelp_batch(parent: Node3D, rng: RandomNumberGenerator) -> void:
	# 1.3 Algas sumergidas orgánicas, piedras subacuáticas y golpes de ola localizados sin patrón repetido
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var col_root := Color("#0e1908")
	var col_mid := Color("#203311")
	var col_tip := Color("#3a4416")
	var frond_angles := [0.12, 0.92, 1.85, 2.78, 3.72, 4.65, 5.50]
	for fi in range(frond_angles.size()):
		var yaw: float = float(frond_angles[fi]) + (0.24 if fi % 2 == 0 else -0.18)
		var dx := cos(yaw)
		var dz := sin(yaw)
		var sx := -dz
		var sz := dx
		var len_f := 0.56 + 0.22 * float((fi * 2 + 1) % 3)
		var bend := 0.16 * (1.0 if fi % 2 == 0 else -1.0)
		var w0 := 0.048
		var w1 := 0.082
		var w2 := 0.024
		var p0 := Vector3(dx * 0.03 - sx * w0, 0.01, dz * 0.03 - sz * w0)
		var p1 := Vector3(dx * 0.03 + sx * w0, 0.01, dz * 0.03 + sz * w0)
		var m_c := Vector3(dx * len_f * 0.48 + sx * bend, 0.085, dz * len_f * 0.48 + sz * bend)
		var p2 := m_c + Vector3(sx * w1, 0.0, sz * w1)
		var p3 := m_c - Vector3(sx * w1, 0.0, sz * w1)
		var t_c := Vector3(dx * len_f - sx * bend * 0.45, 0.030, dz * len_f - sz * bend * 0.45)
		var p4 := t_c + Vector3(sx * w2, 0.0, sz * w2)
		var p5 := t_c - Vector3(sx * w2, 0.0, sz * w2)
		_emit_quad_up_st(st, p0, p1, p2, p3, col_root, col_root, col_mid, col_mid, Vector2.ZERO, Vector2.RIGHT, Vector2(1, 0.5), Vector2(0, 0.5))
		_emit_quad_up_st(st, p3, p2, p4, p5, col_mid, col_mid, col_tip, col_tip, Vector2(0, 0.5), Vector2(1, 0.5), Vector2.ONE, Vector2.DOWN)
	st.generate_normals()

	var kelp_shader := Shader.new()
	kelp_shader.code = """
shader_type spatial;
render_mode cull_disabled, specular_disabled;

varying vec3 wpos;
varying vec4 vcol;

void vertex() {
	wpos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	vcol = COLOR;
	float tip = clamp(length(VERTEX.xz) * 1.45, 0.0, 1.0);
	VERTEX.x += sin(TIME * 1.10 + wpos.z * 0.65 + wpos.x * 0.45) * 0.055 * tip;
	VERTEX.z += cos(TIME * 0.92 + wpos.x * 0.55) * 0.048 * tip;
}

void fragment() {
	ALBEDO = mix(vcol.rgb, vec3(0.03, 0.14, 0.13), 0.30);
	ROUGHNESS = 0.92;
	METALLIC = 0.0;
}
"""
	var kelp_mat := ShaderMaterial.new()
	kelp_mat.shader = kelp_shader

	var kelp_xf: Array[Transform3D] = []
	var kelp_col: Array[Color] = []
	var anchors := [
		Vector2(18.2, 113.8), Vector2(19.5, 114.6), Vector2(21.1, 115.2), Vector2(23.8, 114.4),
		Vector2(25.4, 115.3), Vector2(26.6, 114.2), Vector2(17.1, 114.8), Vector2(18.8, 116.5),
		Vector2(21.8, 116.3), Vector2(24.9, 116.6), Vector2(28.2, 114.6), Vector2(30.6, 115.4),
		Vector2(32.5, 114.4), Vector2(34.2, 115.2), Vector2(15.2, 114.1), Vector2(13.2, 112.4),
		Vector2(10.2, 110.8), Vector2(7.2, 108.6), Vector2(4.4, 106.4), Vector2(1.4, 103.8),
		Vector2(-2.2, 101.8), Vector2(-6.2, 100.2), Vector2(-10.4, 98.0), Vector2(21.2, 95.2)
	]
	var tones: Array[Color] = [
		Color("#172d22"), Color("#1f3526"), Color("#243823"), Color("#13261f")
	]
	for ai in range(anchors.size()):
		var a2: Vector2 = anchors[ai]
		var sub_n := 3 if ai < 14 else 2
		for sub in range(sub_n):
			var wx := a2.x + rng.randf_range(-0.95, 0.95)
			var wz := a2.y + rng.randf_range(-0.85, 0.85)
			var sy: float = float(_eval_cove_beach_sample(wx, wz)["wy"])
			if sy > -0.18 or sy < -2.6:
				continue
			var ksc := rng.randf_range(0.42, 0.90)
			var kb := Basis.from_euler(Vector3(rng.randf_range(-0.08, 0.08), rng.randf_range(0.0, TAU), rng.randf_range(-0.08, 0.08))).scaled(Vector3(ksc, rng.randf_range(0.75, 1.25), ksc))
			kelp_xf.append(Transform3D(kb, Vector3(wx, sy + 0.02, wz)))
			kelp_col.append(tones[rng.randi() % tones.size()])
	var mm_kelp := _make_multimesh_batch("MM_SubmergedKelp", st.commit(), kelp_mat, kelp_xf, kelp_col)
	mm_kelp.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parent.add_child(mm_kelp)

	# Piedras sumergidas visibles sobre los bancos de arena en aguas someras (concentradas junto al muelle y escollera)
	var stone_xf: Array[Transform3D] = []
	var stone_col: Array[Color] = []
	var stone_tones: Array[Color] = [Color("#3b4946"), Color("#2c3736"), Color("#4b4c3f"), Color("#253132")]
	var stone_zones := [
		Vector4(16.0, 27.5, 111.5, 116.0),
		Vector4(27.5, 36.0, 111.5, 115.6),
		Vector4(3.0, 15.8, 104.5, 112.8),
		Vector4(-12.0, 3.0, 96.5, 104.8)
	]
	for zi in range(stone_zones.size()):
		var zbox: Vector4 = stone_zones[zi]
		var count := 22 if zi == 0 else (14 if zi == 1 else 11)
		for si in range(count):
			var wx := rng.randf_range(zbox.x, zbox.y)
			var wz := rng.randf_range(zbox.z, zbox.w)
			var sy: float = float(_eval_cove_beach_sample(wx, wz)["wy"])
			if sy > -0.10 or sy < -1.85:
				continue
			var sc := Vector3(rng.randf_range(0.32, 0.92), rng.randf_range(0.14, 0.34), rng.randf_range(0.28, 0.84))
			var sb := Basis.from_euler(Vector3(rng.randf_range(-0.10, 0.10), rng.randf_range(0.0, TAU), rng.randf_range(-0.10, 0.10))).scaled(sc)
			stone_xf.append(Transform3D(sb, Vector3(wx, sy + sc.y * 0.18, wz)))
			stone_col.append(stone_tones[rng.randi() % stone_tones.size()])
	if not stone_xf.is_empty():
		var stone_mesh := SceneEnhancer.make_basalt_outcrop_mesh(91)
		var stone_mat := _make_mat(Color.WHITE, 0.82, 0.0)
		stone_mat.vertex_color_use_as_albedo = true
		var mm_stones := _make_multimesh_batch("MM_SubmergedStones", stone_mesh, stone_mat, stone_xf, stone_col)
		mm_stones.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		parent.add_child(mm_stones)

	# Delicados anillos de espuma en la base real de los pilotes del muelle (sin discos en mar abierto)
	var lap_st := SurfaceTool.new()
	lap_st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var ring_segs := 24
	for ri in range(ring_segs):
		var a0 := float(ri) / float(ring_segs) * TAU
		var a1 := float(ri + 1) / float(ring_segs) * TAU
		var r_in0 := 0.22 + 0.04 * sin(a0 * 3.0 + 0.6)
		var r_in1 := 0.22 + 0.04 * sin(a1 * 3.0 + 0.6)
		var r_out0 := 0.56 + 0.09 * cos(a0 * 2.0 - 0.5)
		var r_out1 := 0.56 + 0.09 * cos(a1 * 2.0 - 0.5)
		var q0 := Vector3(cos(a0) * r_in0, 0.0, sin(a0) * r_in0)
		var q1 := Vector3(cos(a0) * r_out0, 0.0, sin(a0) * r_out0)
		var q2 := Vector3(cos(a1) * r_out1, 0.0, sin(a1) * r_out1)
		var q3 := Vector3(cos(a1) * r_in1, 0.0, sin(a1) * r_in1)
		_emit_quad_up_st(lap_st, q0, q1, q2, q3, Color.WHITE, Color.WHITE, Color.WHITE, Color.WHITE, Vector2(0.0, float(ri) / float(ring_segs)), Vector2(1.0, float(ri) / float(ring_segs)), Vector2(1.0, float(ri + 1) / float(ring_segs)), Vector2(0.0, float(ri + 1) / float(ring_segs)))
	var lap_shader := Shader.new()
	lap_shader.code = """
shader_type spatial;
render_mode blend_mix, depth_draw_never, cull_disabled, specular_disabled;

varying vec2 l_uv;
varying vec3 wpos;
varying float phase_seed;

void vertex() {
	l_uv = UV;
	phase_seed = INSTANCE_CUSTOM.x;
	float pulse = sin(TIME * 1.45 + phase_seed * 6.2831);
	VERTEX.xz *= 1.0 + pulse * 0.045;
	wpos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
}

void fragment() {
	float radial = pow(sin(clamp(l_uv.x, 0.0, 1.0) * 3.14159265), 1.6);
	float arc = sin(l_uv.y * 18.8495 + phase_seed * 7.1 + TIME * 0.55) * 0.5 + 0.5;
	float arc2 = cos(l_uv.y * 50.2654 - TIME * 0.42 + wpos.x * 2.8 + wpos.z * 2.4) * 0.5 + 0.5;
	float lace = smoothstep(0.42, 0.68, arc * 0.52 + arc2 * 0.48);
	float pulse_a = 0.72 + 0.28 * sin(TIME * 1.45 + phase_seed * 6.2831);
	ALBEDO = vec3(0.92, 0.96, 0.98);
	ALPHA = clamp(radial * lace * pulse_a * 0.48, 0.0, 0.52);
	ROUGHNESS = 0.65;
	METALLIC = 0.0;
}
"""
	var lap_mat := ShaderMaterial.new()
	lap_mat.shader = lap_shader
	var lap_specs := [
		[Vector3(18.65, 0.0, 114.10), 0.78], [Vector3(20.65, 0.0, 114.18), 0.72],
		[Vector3(22.75, 0.0, 114.12), 0.72], [Vector3(24.75, 0.0, 114.08), 0.78],
		[Vector3(20.45, 0.0, 115.05), 0.76], [Vector3(25.15, 0.0, 115.15), 0.76]
	]
	var lap_mm := MultiMesh.new()
	lap_mm.transform_format = MultiMesh.TRANSFORM_3D
	lap_mm.use_custom_data = true
	lap_mm.mesh = lap_st.commit()
	lap_mm.instance_count = lap_specs.size()
	var origin_off := _ocean_plane_node.position if is_instance_valid(_ocean_plane_node) else Vector3(0.0, Structure.ELEV_SEA, 0.0)
	for li in range(lap_specs.size()):
		var lp: Vector3 = lap_specs[li][0]
		var lrad: float = float(lap_specs[li][1])
		var lb := Basis.from_euler(Vector3(0.0, rng.randf_range(0.0, TAU), 0.0)).scaled(Vector3(lrad, 1.0, lrad * rng.randf_range(0.84, 1.16)))
		lap_mm.set_instance_transform(li, Transform3D(lb, Vector3(lp.x - origin_off.x, 0.016, lp.z - origin_off.z)))
		lap_mm.set_instance_custom_data(li, Color(rng.randf(), rng.randf(), 0.0, 0.0))
	var mm_laps := MultiMeshInstance3D.new()
	mm_laps.name = "MM_WaveLapFoam"
	mm_laps.multimesh = lap_mm
	mm_laps.material_override = lap_mat
	mm_laps.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	if is_instance_valid(_ocean_plane_node):
		_ocean_plane_node.add_child(mm_laps)
	else:
		parent.add_child(mm_laps)

func _build_coastal_sunbeams(parent: Node3D) -> void:
	# 4.5 Iluminación costera de claros de sol localizados entre nubes (SpotLight3D suaves + finos haces en altura sin bordes en el suelo)
	var beams := Node3D.new()
	beams.name = "CoastalSunbeams"
	parent.add_child(beams)
	_coastal_sunbeams_node = beams

	var beam_shader := Shader.new()
	beam_shader.code = """
shader_type spatial;
render_mode blend_add, depth_draw_never, cull_disabled, unshaded, world_vertex_coords;

uniform vec4 beam_color : source_color = vec4(1.0, 0.90, 0.70, 0.045);

varying vec3 wpos;
void vertex() {
	wpos = VERTEX;
}
void fragment() {
	float horiz = pow(sin(UV.x * 3.14159265), 2.4);
	float vfade = smoothstep(3.2, 7.8, wpos.y) * smoothstep(18.0, 11.5, wpos.y);
	ALBEDO = beam_color.rgb;
	ALPHA = horiz * vfade * beam_color.a;
}
"""
	var beam_mat := ShaderMaterial.new()
	beam_mat.shader = beam_shader
	var qm := QuadMesh.new()
	qm.size = Vector2(5.6, 13.5)
	var shaft_specs := [
		Vector3(12.5, 9.8, 100.5),
		Vector3(21.5, 9.8, 109.5),
		Vector3(3.5, 9.8, 95.0)
	]
	for si in range(shaft_specs.size()):
		var b_inst := MeshInstance3D.new()
		b_inst.name = "SunShaft_%d" % si
		b_inst.mesh = qm
		b_inst.material_override = beam_mat
		b_inst.position = shaft_specs[si]
		b_inst.rotation_degrees = Vector3(14.0, -22.0, -24.0)
		b_inst.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		beams.add_child(b_inst)

	var spot_specs := [
		# 7.4 Jerarquía focal 1-2-3: 1) Muelle y bote, 2) Arranque escalera Z2, 3) Salida costera a Pleamar
		{"pos": Vector3(22.5, 14.0, 117.5), "target": Vector3(22.0, 0.45, 112.8), "energy": 1.65, "angle": 25.0, "range": 32.0, "col": Color(1.0, 0.90, 0.70)},
		{"pos": Vector3(31.2, 13.5, 114.2), "target": Vector3(29.8, 0.65, 109.2), "energy": 1.18, "angle": 22.0, "range": 28.0, "col": Color(1.0, 0.87, 0.65)},
		{"pos": Vector3(5.2, 12.8, 103.5), "target": Vector3(4.2, 0.55, 97.6), "energy": 0.96, "angle": 23.0, "range": 28.0, "col": Color(0.96, 0.89, 0.74)}
	]
	for pi in range(spot_specs.size()):
		var sp_cfg: Dictionary = spot_specs[pi]
		var sp := SpotLight3D.new()
		sp.name = "CoveSunSpot_%d" % pi
		sp.light_color = sp_cfg["col"]
		sp.light_energy = float(sp_cfg["energy"])
		sp.spot_range = float(sp_cfg["range"])
		sp.spot_angle = float(sp_cfg["angle"])
		sp.spot_angle_attenuation = 1.65
		sp.spot_attenuation = 1.25
		sp.shadow_enabled = false
		beams.add_child(sp)
		sp.look_at_from_position(sp_cfg["pos"], sp_cfg["target"], Vector3.UP)

	var sun_patch := OmniLight3D.new()
	sun_patch.name = "CoveSunPatchLight"
	sun_patch.position = Vector3(17.5, 14.5, 104.5)
	sun_patch.omni_range = 24.0
	sun_patch.omni_attenuation = 1.75
	sun_patch.light_color = Color(1.0, 0.88, 0.66)
	sun_patch.light_energy = 0.44
	sun_patch.shadow_enabled = false
	beams.add_child(sun_patch)
	_cove_sun_patch_light = sun_patch

	# 7.3 Luz sutil de rebote marino azul-turquesa sobre bajos del muelle y escollera Z2
	for bounce_spec in [
		["CoastalWaterBounce_Pier", Vector3(21.8, 0.32, 114.2), 12.5, 0.36],
		["CoastalWaterBounce_Z2", Vector3(31.8, 0.42, 111.4), 12.0, 0.30]
	]:
		var b_lt := OmniLight3D.new()
		b_lt.name = str(bounce_spec[0])
		b_lt.position = bounce_spec[1]
		b_lt.omni_range = float(bounce_spec[2])
		b_lt.omni_attenuation = 1.60
		b_lt.light_color = Color(0.24, 0.66, 0.76)
		b_lt.light_energy = float(bounce_spec[3])
		b_lt.shadow_enabled = false
		beams.add_child(b_lt)

	# 7.2 Sombras de contacto AO en bases de rocas costeras, postes, arranque Z2 y matorrales
	var ao_contacts := [
		[Vector3(18.65, 0.42, 110.22), Vector2(0.95, 0.95)],
		[Vector3(24.85, 0.42, 110.22), Vector2(0.95, 0.95)],
		[Vector3(21.70, 0.45, 109.98), Vector2(4.60, 1.05)],
		[Vector3(17.4, 0.30, 111.0), Vector2(2.3, 2.0)],
		[Vector3(11.6, 0.32, 109.6), Vector2(2.4, 2.1)],
		[Vector3(6.8, 0.28, 106.8), Vector2(2.0, 1.8)],
		[Vector3(0.8, 0.28, 101.2), Vector2(2.3, 2.0)],
		[Vector3(19.8, 0.50, 94.2), Vector2(2.4, 2.1)],
		[Vector3(21.6, 0.46, 98.2), Vector2(2.1, 1.9)],
		[Vector3(24.4, 0.42, 103.2), Vector2(1.9, 1.7)],
		[Vector3(29.5, 0.27, 109.5), Vector2(2.2, 3.2)],
		[Vector3(5.2, 0.55, 99.6), Vector2(0.65, 0.65)],
		[Vector3(2.0, 0.55, 97.8), Vector2(0.65, 0.65)],
		[Vector3(-1.8, 0.58, 95.6), Vector2(0.65, 0.65)],
		[Vector3(18.6, 0.53, 92.6), Vector2(1.6, 1.6)],
		[Vector3(23.2, 0.47, 100.8), Vector2(1.5, 1.5)]
	]
	for ai in range(ao_contacts.size()):
		var ac: Array = ao_contacts[ai]
		var ap: Vector3 = ac[0]
		var gy: float = float(_eval_cove_beach_sample(ap.x, ap.z)["wy"])
		_add_ground_contact_shadow(beams, "CoastalContactAO_%d" % ai, Vector3(ap.x, maxf(ap.y - 0.14, gy + 0.015), ap.z), ac[1], 0.46)

func _eval_cove_headland_height(px: float, pz: float) -> float:
	var h := -3.8
	h = maxf(h, _eval_volcanic_cliff_y(px, pz, Vector3(-18.8, 0.0, 77.6), 9.2, 7.6, 3.8, -3.8, 2.3))
	h = maxf(h, _eval_volcanic_cliff_y(px, pz, Vector3(-7.2, 0.0, 81.2), 11.8, 9.2, 4.7, -3.8, 0.6))
	h = maxf(h, _eval_volcanic_cliff_y(px, pz, Vector3(5.8, 0.0, 86.2), 10.6, 7.6, 5.0, -3.8, 1.9))
	h = maxf(h, _eval_volcanic_cliff_y(px, pz, Vector3(14.8, 0.0, 87.2), 9.6, 7.0, 4.3, -3.8, 3.2))
	h = maxf(h, _eval_volcanic_cliff_y(px, pz, Vector3(22.2, 0.0, 82.0), 9.2, 8.2, 5.8, -3.8, 4.4))
	h = maxf(h, _eval_volcanic_cliff_y(px, pz, Vector3(26.5, 0.0, 74.2), 11.5, 9.5, 7.2, -3.8, 2.7))
	h = maxf(h, _eval_volcanic_cliff_y(px, pz, Vector3(36.8, 0.0, 79.2), 11.8, 10.2, 8.2, -3.8, 5.1))
	h = maxf(h, _eval_volcanic_cliff_y(px, pz, Vector3(44.8, 0.0, 85.8), 11.2, 10.5, 7.4, -3.8, 1.4))
	return h

func _make_coastal_pine_bough_mesh() -> ArrayMesh:
	# Reutiliza el mismo porte mediterráneo orgánico y facetado de _make_pine_tier_mesh (100% coherencia botánica)
	return _make_pine_tier_mesh()

func _make_gnarled_root_mesh() -> ArrayMesh:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var prongs := 4
	var c_base := Color("#54402f")
	var c_tip := Color("#3a2b1e")
	for pi in range(prongs):
		var ang := (float(pi) / float(prongs)) * TAU + float(pi) * 0.42
		var dir := Vector3(cos(ang), 0.0, sin(ang))
		var right := Vector3(-dir.z, 0.0, dir.x)
		var l_len := 0.85 + 0.25 * float(pi % 2)
		var p0 := Vector3(0.0, 0.14, 0.0) - right * 0.10
		var p1 := Vector3(0.0, 0.14, 0.0) + right * 0.10
		var pm_l := dir * (l_len * 0.52) + right * 0.07 + Vector3(0.0, 0.07, 0.0)
		var pm_r := dir * (l_len * 0.52) - right * 0.07 + Vector3(0.0, 0.07, 0.0)
		var pt := dir * l_len + right * (0.08 * sin(float(pi) * 2.1)) + Vector3(0.0, -0.08, 0.0)
		_emit_quad_up_st(st, p0, p1, pm_l, pm_r, c_base, c_base, c_base.lerp(c_tip, 0.5), c_base.lerp(c_tip, 0.5), Vector2.ZERO, Vector2.RIGHT, Vector2(1, 0.5), Vector2(0, 0.5))
		st.set_color(c_base.lerp(c_tip, 0.5)); st.add_vertex(pm_r)
		st.set_color(c_base.lerp(c_tip, 0.5)); st.add_vertex(pm_l)
		st.set_color(c_tip); st.add_vertex(pt)
	st.generate_normals()
	return st.commit()

func _build_coastal_vegetation_and_detail(cove_node: Node3D, rng: RandomNumberGenerator) -> void:
	# 5.1 Coníferas costeras variadas (tamaño, inclinación marina, copa asimétrica y distribución orgánica)
	var pine_mesh := _make_coastal_pine_bough_mesh()
	var crown_mat := OcclusionCtrl.make_canopy_dissolve_material(Color.WHITE, 0.90, Color(0.07, 0.11, 0.05), true)
	var pine_trunks_xf: Array[Transform3D] = []
	var pine_crowns_xf: Array[Transform3D] = []
	var pine_crowns_col: Array[Color] = []
	var pine_specs := [
		{"xz": Vector2(-9.8, 80.4), "sc": 0.78, "lean": Vector2(0.09, -0.06), "tiers": 3},
		{"xz": Vector2(-6.2, 80.2), "sc": 1.12, "lean": Vector2(0.06, -0.04), "tiers": 4},
		{"xz": Vector2(-3.2, 81.8), "sc": 0.92, "lean": Vector2(-0.04, 0.07), "tiers": 3},
		{"xz": Vector2(1.4, 87.2), "sc": 1.05, "lean": Vector2(0.07, 0.03), "tiers": 3},
		{"xz": Vector2(3.8, 85.4), "sc": 1.38, "lean": Vector2(0.05, -0.05), "tiers": 4},
		{"xz": Vector2(6.6, 86.0), "sc": 1.24, "lean": Vector2(-0.06, 0.04), "tiers": 4},
		{"xz": Vector2(9.2, 87.4), "sc": 0.84, "lean": Vector2(0.08, 0.05), "tiers": 3},
		{"xz": Vector2(13.8, 86.2), "sc": 0.72, "lean": Vector2(0.11, -0.04), "tiers": 3},
		{"xz": Vector2(16.4, 87.4), "sc": 0.96, "lean": Vector2(0.04, 0.06), "tiers": 3},
		{"xz": Vector2(21.2, 81.6), "sc": 1.28, "lean": Vector2(-0.05, -0.04), "tiers": 4},
		{"xz": Vector2(25.6, 75.2), "sc": 1.36, "lean": Vector2(0.06, 0.02), "tiers": 4},
		{"xz": Vector2(35.5, 79.4), "sc": 1.18, "lean": Vector2(-0.04, 0.06), "tiers": 3},
		{"xz": Vector2(41.8, 84.6), "sc": 0.94, "lean": Vector2(0.05, -0.07), "tiers": 3}
	]
	var pine_tones: Array[Color] = [Color("#243b1e"), Color("#304b24"), Color("#3e582a"), Color("#2c4221")]
	for ps in pine_specs:
		var px: float = ps["xz"].x
		var pz: float = ps["xz"].y
		var py := _eval_cove_headland_height(px, pz)
		if py < 0.8:
			continue
		var psc: float = float(ps["sc"])
		var lean: Vector2 = ps["lean"]
		var tiers: int = int(ps["tiers"])
		var base_b := Basis.from_euler(Vector3(lean.x, rng.randf_range(0.0, TAU), lean.y))
		var trunk_h := (3.2 + 0.55 * float(tiers - 3)) * psc
		var base_pos := Vector3(px, py - 0.36, pz)
		pine_trunks_xf.append(Transform3D(base_b * Basis.from_scale(Vector3(0.20 * psc, trunk_h, 0.20 * psc)), base_pos + Vector3(0.0, trunk_h * 0.48, 0.0)))
		var p_tone: Color = pine_tones[rng.randi() % pine_tones.size()]
		for ti in range(tiers):
			var frac := float(ti) / float(maxi(1, tiers - 1))
			var rad_sc := lerpf(1.68, 0.82, frac) * psc * rng.randf_range(0.92, 1.12)
			var h_sc := lerpf(1.32, 1.12, frac) * psc
			var y_off := lerpf(2.15, 4.75, frac) * psc
			var b_tier := (base_b * Basis.from_euler(Vector3(0.0, float(ti) * 1.15 + rng.randf_range(-0.2, 0.2), 0.0))) * Basis.from_scale(Vector3(rad_sc, h_sc, rad_sc * rng.randf_range(0.88, 1.14)))
			pine_crowns_xf.append(Transform3D(b_tier, base_pos + Vector3(lean.x * y_off * 0.4, y_off, lean.y * y_off * 0.4)))
			pine_crowns_col.append(p_tone.lightened(frac * 0.14))

	if not pine_trunks_xf.is_empty():
		var tr_mesh := CylinderMesh.new()
		tr_mesh.top_radius = 0.42; tr_mesh.bottom_radius = 0.76; tr_mesh.height = 1.0; tr_mesh.radial_segments = 7
		var mm_tr := _make_multimesh_batch("MM_CoastalPineTrunks", tr_mesh, mat_wood_dark, pine_trunks_xf, [])
		cove_node.add_child(mm_tr)
	if not pine_crowns_xf.is_empty():
		var mm_cr := _make_multimesh_batch("MM_CoastalPineCrowns", pine_mesh, crown_mat, pine_crowns_xf, pine_crowns_col)
		cove_node.add_child(mm_cr)

	# 5.2 Hierbas costeras, brezo violáceo mediterráneo, helechos de sombra y raíces sobre afloramientos
	var grass_xf: Array[Transform3D] = []
	var grass_col: Array[Color] = []
	var grass_tones: Array[Color] = [Color("#54622e"), Color("#677038"), Color("#445526"), Color("#757640")]
	var grass_anchors := [
		Vector3(3.4, 1.1, 91.6), Vector3(5.8, 1.3, 91.8), Vector3(8.8, 1.1, 91.8), Vector3(11.6, 0.9, 91.8),
		Vector3(14.5, 0.9, 92.4), Vector3(17.4, 0.8, 93.4), Vector3(-1.4, 1.2, 90.2), Vector3(-5.8, 1.1, 88.2),
		Vector3(-10.8, 1.0, 86.2), Vector3(-15.5, 0.9, 83.6), Vector3(-20.4, 1.0, 81.8),
		Vector3(2.2, 0.56, 97.6), Vector3(-1.2, 0.58, 95.8), Vector3(-5.0, 0.62, 93.8), Vector3(-9.2, 0.68, 91.6),
		Vector3(-13.4, 0.74, 89.4), Vector3(-17.8, 0.82, 86.8), Vector3(26.5, 0.42, 107.6), Vector3(28.2, 0.48, 106.2),
		Vector3(24.6, 0.46, 102.6), Vector3(22.4, 0.52, 99.0), Vector3(20.6, 0.54, 96.4)
	]
	for ga in grass_anchors:
		var g_pos: Vector3 = ga
		var gy := maxf(g_pos.y, _eval_cove_headland_height(g_pos.x, g_pos.z) - 0.08)
		if g_pos.z > 92.2 and g_pos.x > 0.0 and g_pos.x < 19.0:
			gy = g_pos.y
		for k in range(4):
			var off := Vector3(rng.randf_range(-0.95, 0.95), -0.02, rng.randf_range(-0.85, 0.85))
			var gs := rng.randf_range(0.80, 1.38)
			var gb := Basis.from_euler(Vector3(rng.randf_range(-0.12, 0.12), rng.randf_range(0.0, TAU), rng.randf_range(-0.12, 0.12))).scaled(Vector3(gs, gs * rng.randf_range(0.75, 1.22), gs))
			grass_xf.append(Transform3D(gb, Vector3(g_pos.x, gy, g_pos.z) + off))
			grass_col.append(grass_tones[rng.randi() % grass_tones.size()])
	cove_node.add_child(_make_multimesh_batch("MM_CoastalGrasses", SceneEnhancer.make_grass_tuft_mesh(), crown_mat, grass_xf, grass_col))

	var heather_xf: Array[Transform3D] = []
	var heather_col: Array[Color] = []
	var heather_tones: Array[Color] = [Color("#7a5588"), Color("#8e699a"), Color("#6d4c78"), Color("#998438")]
	var heather_spots := [
		Vector2(2.6, 90.8), Vector2(4.6, 90.2), Vector2(7.8, 90.4), Vector2(11.0, 90.6), Vector2(14.8, 90.2),
		Vector2(-1.8, 89.2), Vector2(-6.2, 87.6), Vector2(-11.2, 85.8), Vector2(-15.6, 84.0),
		Vector2(5.4, 87.8), Vector2(8.4, 87.6), Vector2(17.8, 93.2), Vector2(20.4, 95.4), Vector2(29.8, 93.8),
		Vector2(30.4, 105.2), Vector2(33.2, 104.2)
	]
	for hs in heather_spots:
		var hy := maxf(0.58, _eval_cove_headland_height(hs.x, hs.y) + 0.08)
		for k in range(3):
			var off := Vector3(rng.randf_range(-0.75, 0.75), rng.randf_range(0.02, 0.14), rng.randf_range(-0.65, 0.65))
			var hsc := rng.randf_range(1.45, 2.25)
			var hb := Basis.from_euler(Vector3(0.0, rng.randf_range(0.0, TAU), 0.0)).scaled(Vector3(hsc, hsc * 0.90, hsc))
			heather_xf.append(Transform3D(hb, Vector3(hs.x + off.x, hy + off.y, hs.y + off.z)))
			heather_col.append(heather_tones[rng.randi() % heather_tones.size()])
	var fl_mat := _make_mat(Color.WHITE, 0.88, 0.0)
	fl_mat.vertex_color_use_as_albedo = true
	cove_node.add_child(_make_multimesh_batch("MM_CoastalHeather", SceneEnhancer.make_blossom_cluster_mesh(), fl_mat, heather_xf, heather_col))

	var fern_xf: Array[Transform3D] = []
	var fern_col: Array[Color] = []
	var fern_tones: Array[Color] = [Color("#2b421f"), Color("#375028"), Color("#435d31")]
	for fs in [Vector2(3.8, 87.8), Vector2(6.4, 87.2), Vector2(-3.2, 84.2), Vector2(-7.8, 83.4), Vector2(14.0, 88.2), Vector2(21.2, 84.8), Vector2(27.8, 81.2)]:
		var fy := maxf(0.65, _eval_cove_headland_height(fs.x, fs.y) - 0.05)
		for k in range(3):
			var off := Vector3(rng.randf_range(-0.9, 0.9), 0.0, rng.randf_range(-0.9, 0.9))
			var fsc := rng.randf_range(0.85, 1.35)
			fern_xf.append(Transform3D(Basis.from_euler(Vector3(0.0, rng.randf_range(0.0, TAU), 0.0)).scaled(Vector3(fsc, fsc, fsc)), Vector3(fs.x + off.x, fy, fs.y + off.z)))
			fern_col.append(fern_tones[rng.randi() % fern_tones.size()])
	cove_node.add_child(_make_multimesh_batch("MM_CoastalFerns", SceneEnhancer.make_fern_cluster_mesh(), crown_mat, fern_xf, fern_col))

	var root_xf: Array[Transform3D] = []
	var root_mat := _make_textured_mat(Color("#705740"), 0.90, 0.0, _load_tex("oak-v4.webp"), 0.55, true)
	root_mat.vertex_color_use_as_albedo = true
	for r_xz in [Vector2(4.0, 88.6), Vector2(6.8, 88.2), Vector2(1.4, 89.2), Vector2(-3.6, 84.6), Vector2(-6.4, 83.2), Vector2(13.8, 88.8), Vector2(8.8, 90.0), Vector2(3.2, 91.0)]:
		var ry := _eval_cove_headland_height(r_xz.x, r_xz.y) + 0.06
		var rsc := rng.randf_range(1.10, 1.65)
		var rb := Basis.from_euler(Vector3(rng.randf_range(0.10, 0.28), rng.randf_range(0.0, TAU), rng.randf_range(-0.18, 0.18))).scaled(Vector3(rsc, rsc * 0.90, rsc))
		root_xf.append(Transform3D(rb, Vector3(r_xz.x, ry, r_xz.y)))
	cove_node.add_child(_make_multimesh_batch("MM_ExposedPineRoots", _make_gnarled_root_mesh(), root_mat, root_xf, []))

	# Pequeñas parcelas cultivadas modestas en el resguardo norte junto al sendero inferior (sin invadir playa ni ruta)
	var plots_node := Node3D.new()
	plots_node.name = "CoastalHerbPlots"
	cove_node.add_child(plots_node)
	var mat_soil := _make_textured_mat(Color("#36281c"), 0.96, 0.0, _load_tex("earth.webp"), 0.65, true)
	var basalt_border_mat := _make_textured_mat(Color("#697078"), 0.90, 0.02, _load_tex("basalt-coastal-albedo-v1.webp"), 0.30, true)
	var herb_crop_mat := OcclusionCtrl.make_canopy_dissolve_material(Color("#47622d"), 0.88, Color(0.08, 0.14, 0.06), true)
	var herb_bloom_mat := _make_mat(Color("#8c689c"), 0.88, 0.0)
	var curb_mesh := SceneEnhancer.make_basalt_outcrop_mesh(39)
	var plot_specs := [
		{"pos": Vector3(16.6, 0.53, 94.8), "yaw": 0.28, "sz": Vector2(1.85, 1.15)},
		{"pos": Vector3(19.6, 0.52, 96.4), "yaw": -0.22, "sz": Vector2(1.65, 1.10)}
	]
	for pi in range(plot_specs.size()):
		var pc: Dictionary = plot_specs[pi]
		var pl := Node3D.new()
		pl.name = "HerbPlot_%d" % pi
		pl.position = pc["pos"]
		pl.rotation.y = float(pc["yaw"])
		plots_node.add_child(pl)
		var sz: Vector2 = pc["sz"]
		_create_box_prop(pl, "SoilBed", Vector3(0.0, 0.03, 0.0), Vector3(sz.x, 0.08, sz.y), mat_soil)
		_add_ground_contact_shadow(pl, "PlotContactShadow", Vector3(0.0, 0.008, 0.0), Vector2(sz.x + 0.55, sz.y + 0.55), 0.36)
		for edge_pt in [
			Vector3(-sz.x * 0.5, 0.06, -sz.y * 0.45), Vector3(0.0, 0.06, -sz.y * 0.52), Vector3(sz.x * 0.5, 0.06, -sz.y * 0.45),
			Vector3(-sz.x * 0.5, 0.06, sz.y * 0.45), Vector3(0.0, 0.06, sz.y * 0.52), Vector3(sz.x * 0.5, 0.06, sz.y * 0.45)
		]:
			var stn := MeshInstance3D.new()
			stn.mesh = curb_mesh; stn.material_override = basalt_border_mat
			stn.position = edge_pt; stn.rotation.y = rng.randf_range(0.0, TAU)
			stn.scale = Vector3(0.32, 0.14, 0.24)
			stn.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
			pl.add_child(stn)
		for hx in [-sz.x * 0.28, 0.0, sz.x * 0.28]:
			for hz in [-sz.y * 0.20, sz.y * 0.20]:
				var h_tuft := MeshInstance3D.new()
				h_tuft.mesh = SceneEnhancer.make_grass_tuft_mesh()
				h_tuft.material_override = herb_crop_mat
				h_tuft.position = Vector3(hx + rng.randf_range(-0.06, 0.06), 0.06, hz)
				h_tuft.scale = Vector3(0.75, 0.65, 0.75)
				h_tuft.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
				pl.add_child(h_tuft)
		var bl := MeshInstance3D.new()
		bl.mesh = SceneEnhancer.make_blossom_cluster_mesh()
		bl.material_override = herb_bloom_mat
		bl.position = Vector3(0.18, 0.10, -0.05)
		bl.scale = Vector3(0.95, 0.95, 0.95)
		bl.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		pl.add_child(bl)
	var herb_crate := _create_box_prop(plots_node, "HermitHerbCrate", Vector3(18.0, 0.64, 95.3), Vector3(0.42, 0.28, 0.34), mat_wood_dark)
	herb_crate.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	_add_ground_contact_shadow(plots_node, "HermitHerbCrateShadow", Vector3(18.0, 0.515, 95.3), Vector2(0.76, 0.66), 0.42)

	# 5.3 Guijarros en la línea de marea, maderas erosionadas y detalles marítimos sutiles (sin invadir zona de combate)
	var pebble_xf: Array[Transform3D] = []
	var pebble_col: Array[Color] = []
	var pebble_tones: Array[Color] = [Color("#535960"), Color("#40454a"), Color("#6d6255"), Color("#61676d")]
	var pebble_bands := [
		Vector2(17.8, 110.2), Vector2(15.2, 109.6), Vector2(12.2, 108.8), Vector2(9.2, 107.2),
		Vector2(6.2, 104.8), Vector2(3.2, 102.2), Vector2(-0.5, 99.6), Vector2(-4.4, 97.6),
		Vector2(25.4, 110.6), Vector2(27.2, 110.2), Vector2(19.6, 97.4), Vector2(22.6, 101.6),
		Vector2(11.4, 96.4), Vector2(8.2, 95.6), Vector2(-9.6, 92.2), Vector2(-14.6, 89.6)
	]
	for pb in pebble_bands:
		for k in range(6):
			var off := Vector2(rng.randf_range(-1.35, 1.35), rng.randf_range(-0.95, 0.95))
			var px: float = pb.x + off.x
			var pz: float = pb.y + off.y
			var sc := rng.randf_range(0.11, 0.28)
			var py := 0.46 if pz < 107.0 else 0.34
			if pz > 109.5 and px > 15.0 and px < 26.0:
				py = 0.28
			var pbas := Basis.from_euler(Vector3(rng.randf_range(-0.1, 0.1), rng.randf_range(0.0, TAU), rng.randf_range(-0.1, 0.1))).scaled(Vector3(sc * rng.randf_range(1.0, 1.5), sc * 0.42, sc))
			pebble_xf.append(Transform3D(pbas, Vector3(px, py, pz)))
			pebble_col.append(pebble_tones[rng.randi() % pebble_tones.size()])
	var peb_mat := _make_textured_mat(Color.WHITE, 0.84, 0.02, _load_tex("basalt-coastal-albedo-v1.webp"), 0.4, true)
	peb_mat.vertex_color_use_as_albedo = true
	peb_mat.vertex_color_is_srgb = true
	cove_node.add_child(_make_multimesh_batch("MM_ShorePebbles", SceneEnhancer.make_basalt_outcrop_mesh(83), peb_mat, pebble_xf, pebble_col))

	# Microdetalles marítimos en márgenes (conchas/valvas en línea de resaca, dejando la arena central libre para combate)
	var shell_xf: Array[Transform3D] = []
	var shell_col: Array[Color] = []
	var shell_tones: Array[Color] = [Color("#dfd6c2"), Color("#cfc2aa"), Color("#eae2d0"), Color("#b8ad99")]
	var wrack_pts := [
		Vector2(17.2, 109.8), Vector2(14.5, 109.2), Vector2(11.4, 108.1), Vector2(8.6, 106.2),
		Vector2(5.2, 103.5), Vector2(1.8, 100.8), Vector2(-2.4, 98.4), Vector2(-6.5, 96.4),
		Vector2(18.2, 94.8), Vector2(12.8, 93.8), Vector2(6.8, 93.6)
	]
	for wp_v in wrack_pts:
		var wp: Vector2 = wp_v
		for si in range(4):
			var sx: float = wp.x + rng.randf_range(-0.95, 0.95)
			var sz: float = wp.y + rng.randf_range(-0.45, 0.45)
			var sy_s: float = float(_eval_cove_beach_sample(sx, sz)["wy"])
			if sy_s < 0.08:
				continue
			var ssc := rng.randf_range(0.065, 0.13)
			var sb := Basis.from_euler(Vector3(rng.randf_range(-0.18, 0.18), rng.randf_range(0.0, TAU), rng.randf_range(-0.18, 0.18))).scaled(Vector3(ssc * 1.35, ssc * 0.35, ssc))
			shell_xf.append(Transform3D(sb, Vector3(sx, sy_s + 0.014, sz)))
			shell_col.append(shell_tones[rng.randi() % shell_tones.size()])
	if not shell_xf.is_empty():
		var sh_mat := _make_mat(Color.WHITE, 0.78, 0.0)
		sh_mat.vertex_color_use_as_albedo = true
		sh_mat.vertex_color_is_srgb = true
		var sh_mesh := BoxMesh.new()
		sh_mesh.size = Vector3(1.0, 1.0, 1.0)
		var mm_shells := _make_multimesh_batch("MM_ShoreShells", sh_mesh, sh_mat, shell_xf, shell_col)
		mm_shells.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		cove_node.add_child(mm_shells)

	# Maderas lavadas por la marea y detalles discretos de pesca cerca de escolleras (zona central libre)
	var drift_specs := [
		{"pos": Vector3(13.8, 0.36, 108.6), "rot": Vector3(0.04, 0.42, -0.06), "len": 1.35},
		{"pos": Vector3(5.2, 0.40, 104.2), "rot": Vector3(-0.05, -0.68, 0.04), "len": 1.25},
		{"pos": Vector3(11.6, 0.52, 95.8), "rot": Vector3(0.02, 0.24, 0.05), "len": 1.10}
	]
	for di in range(drift_specs.size()):
		var ds: Dictionary = drift_specs[di]
		var dw_p: Vector3 = ds["pos"]
		var dw_ground: float = float(_eval_cove_beach_sample(dw_p.x, dw_p.z)["wy"])
		var plank := _create_box_prop(cove_node, "WeatheredDriftwood_%d" % di, Vector3(dw_p.x, maxf(dw_p.y, dw_ground + 0.01), dw_p.z), Vector3(0.16, 0.07, float(ds["len"])), mat_wood_dark)
		plank.rotation = ds["rot"]
		plank.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		if dw_ground > 0.12:
			var dw_sh := _add_ground_contact_shadow(cove_node, "DriftwoodShadow_%d" % di, Vector3(dw_p.x, dw_ground + 0.016, dw_p.z), Vector2(0.42, float(ds["len"]) + 0.35), 0.40)
			dw_sh.rotation.y = ds["rot"].y
	for st_x_v in [15.4, 16.0]:
		var st_x: float = float(st_x_v)
		var st_ground: float = float(_eval_cove_beach_sample(st_x, 109.6)["wy"])
		var stake := _create_cylinder(cove_node, "ShoreMooringStake_%d" % int(st_x * 10), Vector3(st_x, st_ground + 0.14, 109.6), 0.065, 0.84, mat_wood_dark)
		stake.rotation_degrees = Vector3(4.0, 0.0, -6.0)
		stake.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		_add_ground_contact_shadow(cove_node, "ShoreStakeShadow_%d" % int(st_x * 10), Vector3(st_x, st_ground + 0.016, 109.6), Vector2(0.48, 0.44), 0.40)
	var creel_ground: float = float(_eval_cove_beach_sample(26.15, 112.15)["wy"])
	var creel := _create_box_prop(cove_node, "CoastalCrabCreel", Vector3(26.15, maxf(0.36, creel_ground + 0.16), 112.15), Vector3(0.54, 0.36, 0.42), mat_wood)
	creel.rotation.y = 0.42
	creel.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	var cr_sh := _add_ground_contact_shadow(cove_node, "CoastalCrabCreelShadow", Vector3(26.15, creel_ground + 0.016, 112.15), Vector2(0.95, 0.80), 0.40)
	cr_sh.rotation.y = 0.42
	for sh_spec in [
		[Vector2(24.15, 107.25), Vector2(1.04, 0.90)],
		[Vector2(19.22, 111.75), Vector2(0.76, 0.72)]
	]:
		var sxz: Vector2 = sh_spec[0]
		var sy_ground: float = float(_eval_cove_beach_sample(sxz.x, sxz.y)["wy"])
		_add_ground_contact_shadow(cove_node, "PierCargoContactShadow", Vector3(sxz.x, sy_ground + 0.016, sxz.y), sh_spec[1], 0.40)

var _cached_contact_shadow_mats: Dictionary = {}
var _cached_contact_shadow_tex: Texture2D

func _get_contact_shadow_material(alpha: float) -> StandardMaterial3D:
	var key := int(round(clampf(alpha, 0.12, 0.72) * 50.0))
	if _cached_contact_shadow_mats.has(key):
		return _cached_contact_shadow_mats[key] as StandardMaterial3D
	if _cached_contact_shadow_tex == null:
		var grad := Gradient.new()
		grad.set_color(0, Color(0.02, 0.03, 0.04, 1.0))
		grad.set_color(1, Color(0.02, 0.03, 0.04, 0.0))
		var rtex := GradientTexture2D.new()
		rtex.gradient = grad
		rtex.fill = GradientTexture2D.FILL_RADIAL
		rtex.fill_from = Vector2(0.5, 0.5)
		rtex.fill_to = Vector2(1.0, 0.5)
		rtex.width = 64
		rtex.height = 64
		_cached_contact_shadow_tex = rtex
	var cmat := StandardMaterial3D.new()
	cmat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	cmat.albedo_texture = _cached_contact_shadow_tex
	cmat.albedo_color = Color(1.0, 1.0, 1.0, float(key) / 50.0)
	cmat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	cmat.depth_draw_mode = BaseMaterial3D.DEPTH_DRAW_DISABLED
	cmat.render_priority = 1
	_cached_contact_shadow_mats[key] = cmat
	return cmat

func _add_ground_contact_shadow(parent: Node, shadow_name: String, pos: Vector3, size_xz: Vector2, alpha: float = 0.40) -> MeshInstance3D:
	var inst := MeshInstance3D.new()
	inst.name = shadow_name
	var pm := PlaneMesh.new()
	pm.size = size_xz
	inst.mesh = pm
	inst.material_override = _get_contact_shadow_material(alpha)
	inst.position = pos
	inst.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parent.add_child(inst)
	return inst

func _build_interior_contact_ao() -> void:
	if has_node("InteriorContactAO"):
		return
	var ao_root := Node3D.new()
	ao_root.name = "InteriorContactAO"
	add_child(ao_root)

	# A5 Templo: columnas del partenón y braseros rituales sobre el estilóbato
	var a5 := get_node_or_null("A5_Temple")
	if a5:
		for ch in a5.find_children("ParthenonColBaseLow_*", "MeshInstance3D", true, false):
			var cm := ch as MeshInstance3D
			var gp := cm.position
			_add_ground_contact_shadow(ao_root, cm.name + "_AO", Vector3(gp.x, gp.y - 0.208, gp.z), Vector2(2.05, 2.05), 0.36)
		for ch in a5.find_children("TempleBrazier_*", "Node3D", true, false):
			var br := ch as Node3D
			var gp := br.position
			_add_ground_contact_shadow(ao_root, br.name + "_AO", Vector3(gp.x, gp.y + 0.012, gp.z), Vector2(1.45, 1.45), 0.42)

	# A3 Refectorio: mesas corridas, bancos, fogón de piedra, isla y toneles (sobre A3_ExpandedStoneFloor en +0.023m)
	var y_a3 := Structure.ELEV_A3_DINING + 0.023
	for tz in [57.8, 61.6]:
		_add_ground_contact_shadow(ao_root, "A3TableAO_%d" % int(tz * 10), Vector3(123.6, y_a3, tz), Vector2(8.7, 1.75), 0.34)
		for dz in [-0.98, 0.98]:
			_add_ground_contact_shadow(ao_root, "A3BenchAO_%d_%d" % [int(tz * 10), int((tz + dz) * 10)], Vector3(123.6, y_a3, tz + dz), Vector2(7.6, 0.72), 0.28)
	_add_ground_contact_shadow(ao_root, "A3StoveAO", Vector3(117.6, y_a3, 51.4), Vector2(3.85, 1.85), 0.42)
	_add_ground_contact_shadow(ao_root, "A3PrepIslandAO", Vector3(118.0, y_a3, 54.0), Vector2(4.05, 1.25), 0.36)
	_add_ground_contact_shadow(ao_root, "A3BarrelAO_0", Vector3(130.6, y_a3, 51.8), Vector2(1.05, 1.05), 0.38)
	_add_ground_contact_shadow(ao_root, "A3BarrelAO_1", Vector3(131.6, y_a3, 52.0), Vector2(1.05, 1.05), 0.38)

	# A4 Biblioteca: librerías murales, islas de lectura, mesa de cartografía, pupitres y pedestal central
	var y_a4 := Structure.ELEV_A4_LIBRARY + 0.023
	for sx in [87.4, 91.2, 95.0, 98.8, 102.6, 106.4, 110.2]:
		_add_ground_contact_shadow(ao_root, "A4WallCaseAO_%d" % int(sx * 10), Vector3(sx, y_a4, 51.4), Vector2(3.45, 0.96), 0.38)
	for ix in [89.6, 94.6, 103.8]:
		_add_ground_contact_shadow(ao_root, "A4IslandCaseAO_%d" % int(ix * 10), Vector3(ix, y_a4, 56.6), Vector2(0.96, 3.15), 0.38)
	_add_ground_contact_shadow(ao_root, "A4MapTableAO", Vector3(109.2, y_a4, 57.8), Vector2(2.10, 3.25), 0.36)
	_add_ground_contact_shadow(ao_root, "A4PedestalAO", Vector3(98.5, y_a4, 57.6), Vector2(0.95, 0.95), 0.34)
	for dx in [-5.4, 4.2]:
		_add_ground_contact_shadow(ao_root, "A4DeskAO_%d" % int((98.5 + dx) * 10), Vector3(98.5 + dx, y_a4, 60.4), Vector2(1.90, 1.25), 0.34)
		_add_ground_contact_shadow(ao_root, "A4StoolAO_%d" % int((98.5 + dx) * 10), Vector3(98.5 + dx, y_a4, 61.12), Vector2(0.76, 0.76), 0.30)

	# Plaza A1: pérgola comunal y esquina de suministros
	var y_a1 := Structure.ELEV_A1_PLAZA + 0.016
	_add_ground_contact_shadow(ao_root, "A1PergolaTableAO", Vector3(123.5, y_a1, 95.0), Vector2(2.65, 1.15), 0.32)
	_add_ground_contact_shadow(ao_root, "A1SupplyAO", Vector3(76.85, y_a1, 95.45), Vector2(2.35, 1.45), 0.36)

func _populate_trail_framing(parent: Node, pts: Array[Vector3], cfg: Dictionary, rng: RandomNumberGenerator, rocks_xf: Array[Transform3D], rocks_col: Array[Color], bushes_xf: Array[Transform3D], bushes_col: Array[Color], trunks_xf: Array[Transform3D], pine_a_xf: Array[Transform3D], pine_a_col: Array[Color], pine_b_xf: Array[Transform3D], pine_b_col: Array[Color], pine_c_xf: Array[Transform3D], pine_c_col: Array[Color]) -> void:
	var route_id := str(cfg.get("id", ""))
	var half_w := float(cfg["base_width"]) * 0.5
	var ridge_h := float(cfg["ridge_height"])
	var is_high := float(pts[0].y) > 10.0
	var is_obs_coast := (route_id == "observatory-coast")
	var is_pleamar_low := (route_id == "pleamar-low")
	var rock_tones := [Color("#68635a"), Color("#787166"), Color("#59554e")]
	var bush_tones := [Color("#31472a"), Color("#3e5534"), Color("#4b623f")]
	var pine_tones := [Color("#213524"), Color("#2a402b"), Color("#344b32")]

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
	# Lomas organicas esculpidas que envuelven pleamar-high y observatorio (paleta mediterránea unificada con LushMountainForest)
	var pine_tones := [Color("#213524"), Color("#2a402b"), Color("#344b32")]
	var rock_tones := [Color("#625e56"), Color("#535049")]
	var bush_tones := [Color("#31472a"), Color("#3e5534")]

	var mound_mat := _make_mat(Color.WHITE, 0.90, 0.02)
	mound_mat.vertex_color_use_as_albedo = true
	mound_mat.vertex_color_is_srgb = true
	mound_mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	if mat_rock_carved and mat_rock_carved.albedo_texture:
		mound_mat.albedo_texture = mat_rock_carved.albedo_texture
		mound_mat.uv1_scale = Vector3(0.18, 0.18, 0.18)

	var hills := [
		{"name": "Shoulder_PleamarHigh", "center": Vector3(6.5, 0.0, 40.2), "rx": 14.5, "rz": 11.0, "top_y": 20.15, "base_y": -1.5},
		{"name": "BackdropHill_NW", "center": Vector3(-8.5, 0.0, 26.5), "rx": 24.0, "rz": 26.0, "top_y": 19.8, "base_y": -2.5},
		{"name": "BackdropCoast_NW_Smooth", "center": Vector3(-16.0, 0.0, 56.0), "rx": 22.0, "rz": 20.0, "top_y": 13.5, "base_y": -3.2},
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
	var is_rock_ledge := (hill_name == "Ledge_NE_ObsCoast" or hill_name == "Shoulder_N_ObsBoardwalk" or hill_name == "BackdropCoast_NW_Smooth")
	var col_top := Color("#666d69") if is_rock_ledge else Color("#3c5033")
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
	inst.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF if ("BayBackCliff" in hill_name) else GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	parent.add_child(inst)

func _append_scenic_pine(pos: Vector3, sc: float, rng: RandomNumberGenerator, tones: Array, trunks_xf: Array[Transform3D], pine_a_xf: Array[Transform3D], pine_a_col: Array[Color], pine_b_xf: Array[Transform3D], pine_b_col: Array[Color], pine_c_xf: Array[Transform3D], pine_c_col: Array[Color]) -> void:
	var h_stretch := rng.randf_range(0.84, 1.30)
	var w_stretch := rng.randf_range(0.86, 1.18)
	var base_b := Basis.from_euler(Vector3(rng.randf_range(-0.08, 0.08), rng.randf_range(0.0, TAU), rng.randf_range(-0.09, 0.09)))
	var th := 3.6 * sc * h_stretch
	trunks_xf.append(Transform3D(base_b.scaled(Vector3(0.20 * sc * w_stretch, th, 0.20 * sc * w_stretch)), pos + Vector3(0.0, th * 0.5, 0.0)))
	var tone: Color = tones[rng.randi() % tones.size()]
	pine_a_xf.append(Transform3D(base_b.scaled(Vector3(1.58 * sc * w_stretch, 1.85 * sc * h_stretch, 1.58 * sc * w_stretch)), pos + Vector3(0.0, 2.55 * sc * h_stretch, 0.0)))
	pine_a_col.append(tone)
	pine_b_xf.append(Transform3D(base_b.rotated(Vector3.UP, 0.72).scaled(Vector3(1.22 * sc * w_stretch, 1.75 * sc * h_stretch, 1.22 * sc * w_stretch)), pos + Vector3(0.0, 3.75 * sc * h_stretch, 0.0)))
	pine_b_col.append(tone.lightened(0.05))
	pine_c_xf.append(Transform3D(base_b.rotated(Vector3.UP, 1.44).scaled(Vector3(0.84 * sc * w_stretch, 1.55 * sc * h_stretch, 0.84 * sc * w_stretch)), pos + Vector3(0.0, 4.85 * sc * h_stretch, 0.0)))
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
