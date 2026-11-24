class_name VfxManager
extends Node3D

# Gestor Integral de Partículas Gráficas GPU (Mar, Clima, Chispas, Interiores y Bodega)
# - Emisores marinos en mundo real (top_level = true) sincronizados con OceanWaves
# - Emisores de clima/faroles/interiores/bodega sincronizados con la visibilidad de zonas y recortes

const OceanWaves = preload("res://scripts/ocean_waves.gd")

var mat_particle_spray: StandardMaterial3D
var mat_particle_mist: StandardMaterial3D
var mat_particle_wind_mist: StandardMaterial3D
var mat_particle_ember: StandardMaterial3D
var mat_particle_dust: StandardMaterial3D
var mat_particle_soot: StandardMaterial3D
var mat_particle_feather: StandardMaterial3D
var mat_particle_drip: StandardMaterial3D
var mat_particle_bubble: StandardMaterial3D
var mat_particle_spore: StandardMaterial3D

var ramp_spray: GradientTexture1D
var ramp_mist: GradientTexture1D
var ramp_wind_mist: GradientTexture1D
var ramp_ember: GradientTexture1D
var ramp_dust: GradientTexture1D
var ramp_spore: GradientTexture1D

var curve_spray_scale: CurveTexture
var curve_mist_scale: CurveTexture
var curve_ember_scale: CurveTexture

var surface_emitters: Array[Dictionary] = []
var zone_emitters: Array[Dictionary] = []
var _lit_lantern_embers: Dictionary = {}
var sim_time: float = 0.0

var cached_refs := {}
var weather_state := "clear"
var reviewing_interior := false
var gentle_effects := false
var rain: GPUParticles3D
var last_boat_xz := Vector2.ZERO
var boat_moving := false
var environment_key := ""

var _prebuilt: bool = false

func _ready() -> void:
	prebuild()

func prebuild() -> void:
	if _prebuilt:
		return
	_prebuilt = true
	setup_materials()
	# 1. Rompientes oceánicas y spray costero
	build_stern_reef_breakers_vfx()
	build_breakers_bow_reef_vfx()
	build_breakers_hull_starboard_vfx()
	build_breakers_dragon_ribs_vfx()
	build_rowboat_wake_vfx()
	# 2. Clima de cubierta y cofa exterior (C1, C2, C3, C10)
	build_exterior_weather_vfx()
	# 3. Chispas de faroles navales (exteriores, camarotes y sentina)
	build_lantern_embers_vfx()
	# 4. Atmósfera de camarotes C4–C7 (polvo, hollín frío del fogón)
	build_interior_cabins_vfx()
	# 5. Cubiertas inferiores sumergidas C8–C9 (goteras, bruma y bioluminiscencia abisal)
	build_submerged_decks_vfx()
	build_rain_vfx()

func _ensure_refs() -> void:
	if cached_refs.has("initialized"):
		return
	var root := get_tree().root
	cached_refs["sea"] = root.find_child("OceanWater", true, false) as Node3D
	cached_refs["deck_c1"] = root.find_child("Deck_C1", true, false) as Node3D
	cached_refs["deck_c2"] = root.find_child("Deck_C2", true, false) as Node3D
	cached_refs["deck_c3"] = root.find_child("Deck_C3", true, false) as Node3D
	cached_refs["rigging"] = root.find_child("Rigging", true, false) as Node3D
	cached_refs["aft_cabins"] = root.find_child("AftCabins_C4_C5", true, false) as Node3D
	cached_refs["fore_cabins"] = root.find_child("ForeCabins_C6_C7", true, false) as Node3D
	cached_refs["lower_c8"] = root.find_child("LowerDeck_C8", true, false) as Node3D
	cached_refs["submerged_c9"] = root.find_child("SubmergedHold_C9", true, false) as Node3D
	cached_refs["rowboat"] = root.find_child("Rowboat", true, false) as Node3D
	if cached_refs["rowboat"]:
		var boat_position: Vector3 = cached_refs["rowboat"].global_position
		last_boat_xz = Vector2(boat_position.x, boat_position.z)
	cached_refs["roof"] = root.find_child("RoofCutout", true, false)
	cached_refs["initialized"] = true

func _is_zone_active(zone_tag: String) -> bool:
	var roof = cached_refs.get("roof")
	var mode: String = roof.current_interior_state if roof else "exterior"
	var sea_vis: bool = cached_refs["sea"].visible if cached_refs.get("sea") else true
	var c1_vis: bool = cached_refs["deck_c1"].visible if cached_refs.get("deck_c1") else true
	var c2_vis: bool = cached_refs["deck_c2"].visible if cached_refs.get("deck_c2") else true
	var c3_vis: bool = cached_refs["deck_c3"].visible if cached_refs.get("deck_c3") else true
	var rig_vis: bool = cached_refs["rigging"].visible if cached_refs.get("rigging") else true
	var aft_vis: bool = cached_refs["aft_cabins"].visible if cached_refs.get("aft_cabins") else true
	var fore_vis: bool = cached_refs["fore_cabins"].visible if cached_refs.get("fore_cabins") else true
	var c8_vis: bool = cached_refs["lower_c8"].visible if cached_refs.get("lower_c8") else true
	var c9_vis: bool = cached_refs["submerged_c9"].visible if cached_refs.get("submerged_c9") else true

	match zone_tag:
		"c4": return mode in ["aft_c4_port", "aft_c4_c5"]
		"c5": return mode in ["aft_c5_stbd", "aft_c4_c5"]
		"c6": return mode in ["fore_c6_port", "fore_c6_c7"]
		"c7": return mode in ["fore_c7_stbd", "fore_c6_c7"]
		"sea":
			return sea_vis
		"deck_c1":
			return c1_vis and c2_vis and c3_vis
		"deck_c2":
			return c2_vis
		"deck_c3":
			return c3_vis
		"crows_nest":
			return rig_vis and c1_vis
		"aft_cabins":
			return aft_vis and (not c3_vis)
		"fore_cabins":
			return fore_vis and (not c2_vis)
		"c8_bilge":
			return mode in ["lower_c8_bilge", "lower_c8_c9"]
		"c9_hold":
			return mode in ["lower_c9_hold", "lower_c8_c9"]
		_:
			return true

func _process(delta: float) -> void:
	sim_time += delta
	_ensure_refs()

	var sea_visible: bool = _is_zone_active("sea")
	var boat_node: Node3D = cached_refs.get("rowboat")
	for entry in surface_emitters:
		var node: GPUParticles3D = entry["node"]
		node.visible = sea_visible
		node.emitting = sea_visible
		if not sea_visible:
			continue
		var base_pos: Vector3 = entry["base_pos"]
		if node.name == "SeaSpray_RowboatWake" and boat_node:
			base_pos = boat_node.global_position
			var boat_xz := Vector2(base_pos.x, base_pos.z)
			if delta > 0.0:
				boat_moving = boat_xz.distance_to(last_boat_xz) > 0.003
				last_boat_xz = boat_xz
			node.emitting = boat_moving
		var state: Dictionary = OceanWaves.sample_wave_state(Vector2(base_pos.x, base_pos.z), sim_time)
		node.global_position = Vector3(base_pos.x, state["surface_y"] + entry["height_offset"], base_pos.z)
		node.amount_ratio = clampf(entry["base_ratio"] + float(state["crest"]) * entry["swell_gain"], 0.28, 1.0) * (0.30 if gentle_effects else (1.0 if weather_state == "storm" else 0.65))

	for entry in zone_emitters:
		var znode: GPUParticles3D = entry["node"]
		var active: bool = _is_zone_active(entry["zone"])
		if bool(entry.get("is_lantern_ember", false)):
			active = active and bool(_lit_lantern_embers.get(znode.name, false))
		znode.visible = active
		znode.emitting = active
		znode.amount_ratio = 0.35 if gentle_effects else 1.0
	if rain:
		var roof_ref = cached_refs.get("roof")
		var in_interior: bool = reviewing_interior or (roof_ref != null and roof_ref.current_interior_state != "exterior")
		rain.visible = weather_state in ["rain", "storm"] and not in_interior
		rain.emitting = rain.visible
		rain.amount_ratio = (0.95 if weather_state == "storm" else 0.55) * (0.30 if gentle_effects else 1.0)

func set_lantern_ember_lit(ember_name: String, lit: bool) -> void:
	_lit_lantern_embers[ember_name] = lit
	_process(0.0)

func set_time_lighting(time_of_day: String, weather: String = "clear") -> void:
	# Modula el brillo y tinte de partículas unshaded para que jamás brillen como puntos blancos de noche
	var overcast := weather in ["rain", "storm", "fog"]
	var spray_tint := Color(0.92, 0.96, 0.99, 0.82)
	var mist_tint := Color(0.84, 0.91, 0.94, 0.62)
	var wind_tint := Color(0.76, 0.86, 0.90, 0.48)
	var feather_tint := Color(0.88, 0.84, 0.78, 0.82)
	if time_of_day == "dusk":
		spray_tint = Color(0.74, 0.66, 0.64, 0.68)
		mist_tint = Color(0.66, 0.58, 0.58, 0.52)
		wind_tint = Color(0.60, 0.54, 0.56, 0.42)
		feather_tint = Color(0.72, 0.64, 0.58, 0.75)
	elif time_of_day == "night":
		spray_tint = Color(0.30, 0.42, 0.54, 0.48)
		mist_tint = Color(0.24, 0.35, 0.46, 0.36)
		wind_tint = Color(0.22, 0.33, 0.44, 0.28)
		feather_tint = Color(0.42, 0.48, 0.56, 0.62)
	if overcast:
		spray_tint = spray_tint * Color(0.86, 0.90, 0.94, 0.90)
		mist_tint = mist_tint * Color(0.88, 0.92, 0.95, 0.92)
	if mat_particle_spray: mat_particle_spray.albedo_color = spray_tint
	if mat_particle_mist: mat_particle_mist.albedo_color = mist_tint
	if mat_particle_wind_mist: mat_particle_wind_mist.albedo_color = wind_tint
	if mat_particle_feather: mat_particle_feather.albedo_color = feather_tint

func set_environment(value: String, interior: bool, gentle: bool) -> void:
	_ensure_refs()
	var mode: String = cached_refs["roof"].current_interior_state if cached_refs.get("roof") else "exterior"
	var key := value + mode + str(interior) + str(gentle)
	if key == environment_key: return
	environment_key = key
	weather_state = value
	reviewing_interior = interior
	gentle_effects = gentle
	_process(0.0)

func build_rain_vfx() -> void:
	var mat := _make_particle_mat(null, false, true)
	mat.billboard_mode = BaseMaterial3D.BILLBOARD_PARTICLES
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_PER_PIXEL
	mat.albedo_color = Color(0.70, 0.82, 0.88, 0.35)
	rain = _build_particle_node({
		"name": "WeatherRain", "world_pos": Vector3(0, 25, 0),
		"box_extents": Vector3(36, 0.1, 16), "direction": Vector3(0.16, -1, -0.08),
		"spread": 2.0, "amount": 700, "lifetime": 1.7,
		"vel_min": 18.0, "vel_max": 22.0, "gravity": Vector3(0, -2, 0),
		"scale_min": 0.8, "scale_max": 1.2, "quad_size": Vector2(0.030, 0.70),
		"material": mat, "turbulence": false, "align_vel": false,
	}, true)
	if rain.is_inside_tree():
		rain.global_basis = Basis.IDENTITY
	else:
		rain.basis = Basis.IDENTITY
	rain.visibility_aabb = AABB(Vector3(-45, -36, -24), Vector3(90, 42, 48))
	rain.emitting = false
	rain.visible = false

func _create_spray_cloud_texture(size: int = 64, soft_mist: bool = false) -> ImageTexture:
	var img := Image.create(size, size, false, Image.FORMAT_RGBA8)
	var lobes: Array[Vector3] = [
		Vector3(0.50, 0.52, 0.44 if soft_mist else 0.30),
		Vector3(0.38, 0.46, 0.36 if soft_mist else 0.22),
		Vector3(0.62, 0.48, 0.35 if soft_mist else 0.21),
		Vector3(0.47, 0.38, 0.33 if soft_mist else 0.19),
		Vector3(0.54, 0.62, 0.34 if soft_mist else 0.20),
	]
	for y in range(size):
		for x in range(size):
			var u := (float(x) + 0.5) / float(size)
			var v := (float(y) + 0.5) / float(size)
			var a := 0.0
			for lobe: Vector3 in lobes:
				var dx: float = (u - lobe.x) / lobe.z
				var dy: float = (v - lobe.y) / (lobe.z * (1.18 if soft_mist else 0.94))
				var d: float = clampf(1.0 - sqrt(dx * dx + dy * dy), 0.0, 1.0)
				a = maxf(a, d * d * (3.0 - 2.0 * d))
			var alpha: float = pow(a, 1.85 if soft_mist else 1.25) * (0.34 if soft_mist else 0.72)
			img.set_pixel(x, y, Color(0.92, 0.97, 0.99, clampf(alpha, 0.0, 1.0)))
	return ImageTexture.create_from_image(img)

func _create_bubble_ring_texture(size: int = 32) -> ImageTexture:
	var img := Image.create(size, size, false, Image.FORMAT_RGBA8)
	for y in range(size):
		for x in range(size):
			var u := (float(x) + 0.5) / float(size) - 0.5
			var v := (float(y) + 0.5) / float(size) - 0.5
			var r := sqrt(u * u + v * v) * 2.0
			var outer := clampf(1.0 - smoothstep(0.60, 1.0, r), 0.0, 1.0)
			var rim := exp(-pow((r - 0.58) / 0.22, 2.0)) * 0.36
			var glint := exp(-((u + 0.15) * (u + 0.15) + (v + 0.15) * (v + 0.15)) * 36.0) * 0.65
			var alpha := clampf((0.18 * outer + rim * 0.42 + glint * 0.72) * (1.0 - smoothstep(0.72, 1.0, r)), 0.0, 1.0)
			img.set_pixel(x, y, Color(0.84, 0.96, 1.0, alpha))
	return ImageTexture.create_from_image(img)

func _create_feather_texture(size: int = 32) -> ImageTexture:
	# Silueta alargada suave de pluma/briza arrastrada por el viento de altura
	var img := Image.create(size, size, false, Image.FORMAT_RGBA8)
	for y in range(size):
		for x in range(size):
			var u := (float(x) + 0.5) / float(size) - 0.5
			var v := (float(y) + 0.5) / float(size) - 0.5
			var ru := u * 0.78 - v * 0.62
			var rv := u * 0.62 + v * 0.78
			var dist := sqrt((ru / 0.14) * (ru / 0.14) + (rv / 0.42) * (rv / 0.42))
			var a := pow(clampf(1.0 - dist, 0.0, 1.0), 1.4) * 0.78
			img.set_pixel(x, y, Color(0.90, 0.88, 0.84, a))
	return ImageTexture.create_from_image(img)

func _create_radial_texture(stops: PackedFloat32Array, colors: PackedColorArray, size: int) -> GradientTexture2D:
	var grad := Gradient.new()
	grad.offsets = stops
	grad.colors = colors
	var tex := GradientTexture2D.new()
	tex.gradient = grad
	tex.fill = GradientTexture2D.FILL_RADIAL
	tex.fill_from = Vector2(0.5, 0.5)
	tex.fill_to = Vector2(1.0, 0.5)
	tex.width = size
	tex.height = size
	return tex

func _create_life_ramp(colors: PackedColorArray, offsets: PackedFloat32Array) -> GradientTexture1D:
	var grad := Gradient.new()
	grad.offsets = offsets
	grad.colors = colors
	var tex := GradientTexture1D.new()
	tex.gradient = grad
	return tex

func _create_scale_curve(points: Array[Vector2]) -> CurveTexture:
	var curve := Curve.new()
	for pt in points:
		curve.add_point(pt)
	var tex := CurveTexture.new()
	tex.curve = curve
	return tex

func _make_particle_mat(tex: Texture2D, additive: bool = false, align_vel: bool = false) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	if additive:
		m.blend_mode = BaseMaterial3D.BLEND_MODE_ADD
	m.albedo_texture = tex
	m.vertex_color_use_as_albedo = true
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.billboard_mode = BaseMaterial3D.BILLBOARD_DISABLED if align_vel else BaseMaterial3D.BILLBOARD_PARTICLES
	if align_vel:
		m.cull_mode = BaseMaterial3D.CULL_DISABLED
	m.depth_draw_mode = BaseMaterial3D.DEPTH_DRAW_DISABLED
	return m

func setup_materials() -> void:
	var spray_cloud := _create_spray_cloud_texture(64, false)
	var mist_cloud := _create_spray_cloud_texture(64, true)
	var feather_tex := _create_feather_texture(32)
	var bubble_tex := _create_bubble_ring_texture(32)
	var soft_dot := _create_radial_texture(
		PackedFloat32Array([0.0, 0.5, 1.0]),
		PackedColorArray([Color(1.0, 1.0, 1.0, 0.90), Color(0.9, 0.95, 1.0, 0.35), Color(0.8, 0.9, 1.0, 0.0)]),
		32
	)
	var drip_tex := _create_radial_texture(
		PackedFloat32Array([0.0, 0.65, 1.0]),
		PackedColorArray([Color(0.82, 0.96, 1.0, 0.80), Color(0.65, 0.88, 0.94, 0.28), Color(0.55, 0.80, 0.88, 0.0)]),
		24
	)

	mat_particle_spray = _make_particle_mat(spray_cloud)
	mat_particle_mist = _make_particle_mat(mist_cloud)
	mat_particle_wind_mist = _make_particle_mat(mist_cloud)
	mat_particle_ember = _make_particle_mat(soft_dot, true)
	mat_particle_dust = _make_particle_mat(soft_dot)
	mat_particle_soot = _make_particle_mat(spray_cloud)
	mat_particle_feather = _make_particle_mat(feather_tex)
	mat_particle_drip = _make_particle_mat(drip_tex)
	mat_particle_bubble = _make_particle_mat(bubble_tex)
	mat_particle_spore = _make_particle_mat(soft_dot, true)

	ramp_spray = _create_life_ramp(
		PackedColorArray([
			Color(0.88, 0.95, 0.97, 0.0),
			Color(0.92, 0.97, 0.99, 0.72),
			Color(0.82, 0.92, 0.95, 0.34),
			Color(0.72, 0.86, 0.90, 0.0)
		]),
		PackedFloat32Array([0.0, 0.14, 0.55, 1.0])
	)
	ramp_mist = _create_life_ramp(
		PackedColorArray([
			Color(0.84, 0.93, 0.96, 0.0),
			Color(0.86, 0.95, 0.97, 0.44),
			Color(0.74, 0.88, 0.91, 0.18),
			Color(0.68, 0.84, 0.88, 0.0)
		]),
		PackedFloat32Array([0.0, 0.20, 0.62, 1.0])
	)
	ramp_wind_mist = _create_life_ramp(
		PackedColorArray([
			Color(0.72, 0.85, 0.88, 0.0),
			Color(0.76, 0.88, 0.90, 0.16),
			Color(0.66, 0.80, 0.84, 0.10),
			Color(0.60, 0.75, 0.80, 0.0)
		]),
		PackedFloat32Array([0.0, 0.25, 0.70, 1.0])
	)
	ramp_ember = _create_life_ramp(
		PackedColorArray([
			Color(1.0, 0.88, 0.52, 0.0),
			Color(1.0, 0.76, 0.32, 0.92),
			Color(0.98, 0.45, 0.14, 0.45),
			Color(0.75, 0.22, 0.05, 0.0)
		]),
		PackedFloat32Array([0.0, 0.15, 0.60, 1.0])
	)
	ramp_dust = _create_life_ramp(
		PackedColorArray([
			Color(1.0, 0.90, 0.68, 0.0),
			Color(1.0, 0.88, 0.62, 0.26),
			Color(0.92, 0.80, 0.58, 0.14),
			Color(0.85, 0.75, 0.58, 0.0)
		]),
		PackedFloat32Array([0.0, 0.25, 0.70, 1.0])
	)
	ramp_spore = _create_life_ramp(
		PackedColorArray([
			Color(0.32, 0.92, 0.82, 0.0),
			Color(0.38, 0.95, 0.85, 0.52),
			Color(0.24, 0.75, 0.72, 0.25),
			Color(0.18, 0.58, 0.60, 0.0)
		]),
		PackedFloat32Array([0.0, 0.22, 0.68, 1.0])
	)

	curve_spray_scale = _create_scale_curve([Vector2(0.0, 0.55), Vector2(0.35, 1.15), Vector2(1.0, 1.75)])
	curve_mist_scale = _create_scale_curve([Vector2(0.0, 0.70), Vector2(0.5, 1.40), Vector2(1.0, 2.20)])
	curve_ember_scale = _create_scale_curve([Vector2(0.0, 0.75), Vector2(0.3, 1.15), Vector2(1.0, 0.20)])

func _build_particle_node(cfg: Dictionary, top_level_world: bool = false) -> GPUParticles3D:
	var particles := GPUParticles3D.new()
	particles.name = cfg["name"]
	particles.amount = cfg["amount"]
	particles.lifetime = cfg["lifetime"]
	particles.preprocess = cfg.get("preprocess", 2.0)
	particles.explosiveness = cfg.get("explosiveness", 0.08)
	particles.randomness = cfg.get("randomness", 0.70)
	particles.use_fixed_seed = true
	particles.seed = absi(hash(str(cfg["name"])))
	particles.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF

	var proc_mat := ParticleProcessMaterial.new()
	var shape: int = cfg.get("emission_shape", ParticleProcessMaterial.EMISSION_SHAPE_BOX)
	proc_mat.emission_shape = shape
	if shape == ParticleProcessMaterial.EMISSION_SHAPE_BOX:
		proc_mat.emission_box_extents = cfg["box_extents"]
	elif shape == ParticleProcessMaterial.EMISSION_SHAPE_RING:
		proc_mat.emission_ring_radius = cfg["ring_radius"]
		proc_mat.emission_ring_inner_radius = cfg["ring_inner_radius"]
		proc_mat.emission_ring_height = 0.12
	elif shape == ParticleProcessMaterial.EMISSION_SHAPE_SPHERE:
		proc_mat.emission_sphere_radius = cfg["sphere_radius"]

	proc_mat.direction = cfg["direction"]
	proc_mat.spread = cfg.get("spread", 36.0)
	proc_mat.initial_velocity_min = cfg["vel_min"]
	proc_mat.initial_velocity_max = cfg["vel_max"]
	proc_mat.gravity = cfg.get("gravity", Vector3.ZERO)
	proc_mat.damping_min = cfg.get("damping", 0.2)
	proc_mat.damping_max = cfg.get("damping", 0.2) * 1.6
	proc_mat.scale_min = cfg["scale_min"]
	proc_mat.scale_max = cfg["scale_max"]
	if cfg.has("scale_curve"):
		proc_mat.scale_curve = cfg["scale_curve"]
	if cfg.has("color_ramp"):
		proc_mat.color_ramp = cfg["color_ramp"]
	elif cfg.has("color"):
		proc_mat.color = cfg["color"]
	if cfg.get("turbulence", true):
		proc_mat.turbulence_enabled = true
		proc_mat.turbulence_noise_strength = cfg.get("turb_strength", 0.45)
		proc_mat.turbulence_noise_scale = cfg.get("turb_scale", 2.2)
	if cfg.get("align_vel", false):
		proc_mat.particle_flag_align_y = true
	particles.process_material = proc_mat

	var quad := QuadMesh.new()
	quad.size = cfg["quad_size"]
	quad.material = cfg["material"]
	particles.draw_pass_1 = quad

	add_child(particles)
	if top_level_world:
		particles.top_level = true
		if particles.is_inside_tree():
			particles.global_position = cfg["world_pos"]
		else:
			particles.position = cfg["world_pos"]
	else:
		particles.position = cfg["local_pos"]
	return particles

func _spawn_world_breaker_emitter(cfg: Dictionary) -> void:
	var particles := _build_particle_node(cfg, true)
	var world_pos: Vector3 = cfg["world_pos"]
	surface_emitters.append({
		"node": particles,
		"base_pos": world_pos,
		"height_offset": world_pos.y - OceanWaves.SEA_LEVEL,
		"base_ratio": cfg.get("base_ratio", 0.50),
		"swell_gain": cfg.get("swell_gain", 0.65),
	})

func _spawn_zone_emitter(zone_tag: String, cfg: Dictionary) -> void:
	if zone_tag == "aft_cabins": zone_tag = "c4" if cfg["local_pos"].z < 0 else "c5"
	if zone_tag == "fore_cabins": zone_tag = "c6" if cfg["local_pos"].z < 0 else "c7"
	var particles := _build_particle_node(cfg, false)
	var is_lan := bool(cfg.get("is_lantern_ember", false))
	if is_lan:
		_lit_lantern_embers[particles.name] = false
		particles.visible = false
		particles.emitting = false
	zone_emitters.append({"node": particles, "zone": zone_tag, "is_lantern_ember": is_lan})

func build_stern_reef_breakers_vfx() -> void:
	var rock_impacts := [
		{"name": "SeaSpray_SternReef_West", "pos": Vector3(-31.8, OceanWaves.SEA_LEVEL + 0.10, 16.0), "ext": Vector3(2.4, 0.18, 1.4)},
		{"name": "SeaSpray_SternReef",      "pos": Vector3(-28.8, OceanWaves.SEA_LEVEL + 0.12, 19.6), "ext": Vector3(3.0, 0.18, 1.5)},
		{"name": "SeaSpray_SternReef_East", "pos": Vector3(-23.0, OceanWaves.SEA_LEVEL + 0.10, 17.2), "ext": Vector3(2.2, 0.18, 1.2)},
	]
	for imp in rock_impacts:
		_spawn_world_breaker_emitter({
			"name": imp["name"],
			"world_pos": imp["pos"],
			"box_extents": imp["ext"],
			"direction": Vector3(0.24, 1.0, -0.42),
			"spread": 32.0,
			"amount": 115,
			"lifetime": 1.25,
			"vel_min": 2.8,
			"vel_max": 5.8,
			"gravity": Vector3(0.0, -7.8, 0.0),
			"scale_min": 0.48,
			"scale_max": 1.05,
			"quad_size": Vector2(0.78, 0.66),
			"material": mat_particle_spray,
			"color_ramp": ramp_spray,
			"scale_curve": curve_spray_scale,
			"base_ratio": 0.48,
			"swell_gain": 0.78,
		})

	_spawn_world_breaker_emitter({
		"name": "SeaMist_SternReef",
		"world_pos": Vector3(-28.0, OceanWaves.SEA_LEVEL + 0.30, 15.0),
		"box_extents": Vector3(5.2, 0.30, 2.2),
		"direction": Vector3(0.22, 0.45, -0.60),
		"spread": 48.0,
		"amount": 65,
		"lifetime": 2.0,
		"vel_min": 0.8,
		"vel_max": 1.8,
		"gravity": Vector3(0.0, -1.0, 0.0),
		"scale_min": 0.9,
		"scale_max": 1.85,
		"quad_size": Vector2(1.25, 0.95),
		"material": mat_particle_mist,
		"color_ramp": ramp_mist,
		"scale_curve": curve_mist_scale,
		"turb_strength": 0.75,
		"base_ratio": 0.55,
		"swell_gain": 0.55,
	})

func build_breakers_bow_reef_vfx() -> void:
	var bow_rocks := [
		{"name": "SeaSpray_BowReef",       "pos": Vector3(26.5, OceanWaves.SEA_LEVEL + 0.08, -11.5), "ext": Vector3(3.8, 0.18, 2.2), "dir": Vector3(-0.30, 1.0, 0.42), "amt": 95},
		{"name": "SeaSpray_BowReef_East",  "pos": Vector3(33.5, OceanWaves.SEA_LEVEL + 0.10, -8.5),  "ext": Vector3(2.8, 0.18, 1.8), "dir": Vector3(-0.40, 1.0, 0.35), "amt": 78},
		{"name": "SeaSpray_PortReef_Mid",  "pos": Vector3(-16.0, OceanWaves.SEA_LEVEL + 0.08, -13.5),"ext": Vector3(3.4, 0.16, 1.6), "dir": Vector3(0.25, 0.95, 0.45), "amt": 72},
		{"name": "SeaSpray_StbdOutcrop",   "pos": Vector3(26.5, OceanWaves.SEA_LEVEL + 0.10, 18.8),  "ext": Vector3(3.2, 0.18, 1.6), "dir": Vector3(-0.22, 1.0, -0.45),"amt": 80},
	]
	for br in bow_rocks:
		_spawn_world_breaker_emitter({
			"name": br["name"],
			"world_pos": br["pos"],
			"box_extents": br["ext"],
			"direction": br["dir"],
			"spread": 36.0,
			"amount": int(br["amt"]),
			"lifetime": 1.25,
			"vel_min": 2.4,
			"vel_max": 5.0,
			"gravity": Vector3(0.0, -7.2, 0.0),
			"scale_min": 0.44,
			"scale_max": 0.96,
			"quad_size": Vector2(0.76, 0.64),
			"material": mat_particle_spray,
			"color_ramp": ramp_spray,
			"scale_curve": curve_spray_scale,
			"base_ratio": 0.50,
			"swell_gain": 0.82,
		})

func build_breakers_hull_starboard_vfx() -> void:
	_spawn_world_breaker_emitter({
		"name": "SeaSpray_HullStarboard",
		"world_pos": Vector3(-2.5, OceanWaves.SEA_LEVEL + 0.08, 10.5),
		"box_extents": Vector3(15.0, 0.14, 0.42),
		"direction": Vector3(0.16, 0.85, 0.42),
		"spread": 28.0,
		"amount": 115,
		"lifetime": 1.05,
		"vel_min": 1.4,
		"vel_max": 3.0,
		"gravity": Vector3(0.0, -6.5, 0.0),
		"scale_min": 0.35,
		"scale_max": 0.72,
		"quad_size": Vector2(0.68, 0.54),
		"material": mat_particle_mist,
		"color_ramp": ramp_mist,
		"scale_curve": curve_mist_scale,
		"base_ratio": 0.48,
		"swell_gain": 0.65,
	})

func build_breakers_dragon_ribs_vfx() -> void:
	# Choque real de olas contra TODOS los huesos de dragón en flotación (estribor popa, babor popa, proa, ala y cráneo)
	var rib_entries: Array[Dictionary] = [
		# Costillas titánicas de estribor (popa y cintura)
		{"pt": Vector2(-28.8, 14.8), "dir": Vector3(0.22, 1.05, -0.40), "amt": 40},
		{"pt": Vector2(-24.8, 15.2), "dir": Vector3(0.22, 1.05, -0.38), "amt": 42},
		{"pt": Vector2(-21.2, 14.3), "dir": Vector3(0.20, 1.00, -0.36), "amt": 38},
		{"pt": Vector2(-17.8, 14.1), "dir": Vector3(0.20, 1.00, -0.36), "amt": 36},
		{"pt": Vector2(-14.3, 13.4), "dir": Vector3(0.20, 0.98, -0.36), "amt": 34},
		{"pt": Vector2(-10.8, 12.6), "dir": Vector3(0.20, 0.95, -0.36), "amt": 32},
		{"pt": Vector2(-7.3,  11.7), "dir": Vector3(0.20, 0.95, -0.36), "amt": 30},
		# Costillas de proa-babor y esqueleto del ala
		{"pt": Vector2(18.5, -13.2), "dir": Vector3(-0.24, 1.00, 0.42), "amt": 36},
		{"pt": Vector2(22.0, -13.6), "dir": Vector3(-0.24, 1.00, 0.42), "amt": 38},
		{"pt": Vector2(25.5, -13.2), "dir": Vector3(-0.24, 1.00, 0.42), "amt": 38},
		{"pt": Vector2(30.2, -13.8), "dir": Vector3(-0.28, 1.05, 0.40), "amt": 42},
		# Costillas de proa-estribor mordiendo la amura
		{"pt": Vector2(17.5, 11.4),  "dir": Vector3(-0.18, 0.98, -0.40), "amt": 34},
		{"pt": Vector2(21.3, 10.6),  "dir": Vector3(-0.18, 0.98, -0.40), "amt": 34},
		{"pt": Vector2(25.1,  9.2),  "dir": Vector3(-0.20, 0.98, -0.40), "amt": 32},
		# Contracostillas de babor-popa y espinazo sumergido
		{"pt": Vector2(-31.8, -10.8), "dir": Vector3(0.26, 0.98, 0.36), "amt": 34},
		{"pt": Vector2(-39.5,  11.4), "dir": Vector3(0.28, 1.05, -0.32),"amt": 42},
	]
	for idx in range(rib_entries.size()):
		var entry: Dictionary = rib_entries[idx]
		var pt: Vector2 = entry["pt"]
		_spawn_world_breaker_emitter({
			"name": "SeaSpray_DragonRibs_%d" % idx,
			"world_pos": Vector3(pt.x, OceanWaves.SEA_LEVEL + 0.08, pt.y),
			"box_extents": Vector3(0.55, 0.14, 0.55),
			"direction": entry["dir"],
			"spread": 34.0,
			"amount": int(entry["amt"]),
			"lifetime": 1.02,
			"vel_min": 1.8,
			"vel_max": 3.8,
			"gravity": Vector3(0.0, -7.4, 0.0),
			"scale_min": 0.34,
			"scale_max": 0.72,
			"quad_size": Vector2(0.60, 0.52),
			"material": mat_particle_spray,
			"color_ramp": ramp_spray,
			"scale_curve": curve_spray_scale,
			"base_ratio": 0.48,
			"swell_gain": 0.85,
		})

func build_rowboat_wake_vfx() -> void:
	_spawn_world_breaker_emitter({
		"name": "SeaSpray_RowboatWake",
		"world_pos": Vector3(2.5, OceanWaves.SEA_LEVEL + 0.05, 14.8),
		"emission_shape": ParticleProcessMaterial.EMISSION_SHAPE_RING,
		"ring_radius": 2.0,
		"ring_inner_radius": 1.4,
		"direction": Vector3(0.0, 0.35, 0.0),
		"spread": 25.0,
		"amount": 48,
		"lifetime": 1.4,
		"vel_min": 0.25,
		"vel_max": 0.70,
		"gravity": Vector3(0.0, -1.4, 0.0),
		"scale_min": 0.35,
		"scale_max": 0.68,
		"quad_size": Vector2(0.65, 0.45),
		"material": mat_particle_mist,
		"color_ramp": ramp_mist,
		"scale_curve": curve_mist_scale,
		"base_ratio": 0.50,
		"swell_gain": 0.45,
	})

func build_exterior_weather_vfx() -> void:
	# Ráfagas suaves de bruma salina cruzando la cubierta principal (C1) y castillos (C2/C3)
	_spawn_zone_emitter("deck_c1", {
		"name": "SeaWindMist_DeckC1",
		"local_pos": Vector3(-2.0, 1.0, 1.5),
		"box_extents": Vector3(16.0, 0.55, 5.2),
		"direction": Vector3(0.75, 0.12, -0.55),
		"spread": 18.0,
		"amount": 42,
		"lifetime": 3.6,
		"vel_min": 1.1,
		"vel_max": 2.2,
		"scale_min": 1.3,
		"scale_max": 2.4,
		"quad_size": Vector2(1.4, 0.85),
		"material": mat_particle_wind_mist,
		"color_ramp": ramp_wind_mist,
		"scale_curve": curve_mist_scale,
		"turb_strength": 0.40,
	})

	# Plumas de arpía y jirones de viento girando en la cofa C10 (+15.2 m)
	_spawn_zone_emitter("crows_nest", {
		"name": "CrowsNest_FeathersC10",
		"local_pos": Vector3(0.35, 16.0, -0.48),
		"emission_shape": ParticleProcessMaterial.EMISSION_SHAPE_SPHERE,
		"sphere_radius": 2.1,
		"direction": Vector3(0.55, 0.18, -0.40),
		"spread": 55.0,
		"amount": 22,
		"lifetime": 3.4,
		"vel_min": 0.25,
		"vel_max": 0.75,
		"gravity": Vector3(0.0, -0.18, 0.0),
		"scale_min": 0.18,
		"scale_max": 0.34,
		"quad_size": Vector2(0.28, 0.28),
		"material": mat_particle_feather,
		"color": Color(0.88, 0.86, 0.80, 0.72),
		"turb_strength": 0.85,
	})

func build_lantern_embers_vfx() -> void:
	# Pavesas y chispas ascendentes cálidas en todos los faroles encendidos del barco
	var lanterns := [
		{"name": "LanternEmbers_SternC3", "zone": "deck_c3",    "pos": Vector3(-30.98, 3.54, 0.0),  "amt": 18},
		{"name": "LanternEmbers_DeckC1",  "zone": "deck_c1",    "pos": Vector3(0.95, 1.95, 0.78),   "amt": 14},
		{"name": "LanternEmbers_BowC2",   "zone": "deck_c2",    "pos": Vector3(21.0, 4.82, -0.92),  "amt": 14},
		{"name": "LanternEmbers_C4",      "zone": "c4",         "pos": Vector3(-27.25, 1.05, -2.05),"amt": 12},
		{"name": "LanternEmbers_C5",      "zone": "c5",         "pos": Vector3(-19.5, 1.94, 0.32),  "amt": 12},
		{"name": "LanternEmbers_C6_A",    "zone": "c6",         "pos": Vector3(18.5, 2.04, -9.55),  "amt": 10},
		{"name": "LanternEmbers_C6_B",    "zone": "c6",         "pos": Vector3(26.86, 1.98, -1.10), "amt": 10},
		{"name": "LanternEmbers_C7",      "zone": "c7",         "pos": Vector3(18.5, 1.14, 3.55),   "amt": 12},
		{"name": "LanternEmbers_C8",      "zone": "c8_bilge",   "pos": Vector3(-5.5, -1.25, 2.18),  "amt": 14},
	]
	for lt in lanterns:
		_spawn_zone_emitter(lt["zone"], {
			"name": lt["name"],
			"local_pos": lt["pos"],
			"is_lantern_ember": true,
			"emission_shape": ParticleProcessMaterial.EMISSION_SHAPE_SPHERE,
			"sphere_radius": 0.14,
			"direction": Vector3(0.15, 1.0, -0.10),
			"spread": 30.0,
			"amount": lt["amt"],
			"lifetime": 1.15,
			"vel_min": 0.25,
			"vel_max": 0.65,
			"gravity": Vector3(0.0, 0.45, 0.0),
			"scale_min": 0.06,
			"scale_max": 0.14,
			"quad_size": Vector2(0.16, 0.16),
			"material": mat_particle_ember,
			"color_ramp": ramp_ember,
			"scale_curve": curve_ember_scale,
			"turb_strength": 0.35,
		})

func build_interior_cabins_vfx() -> void:
	# Motas de polvo iluminadas flotando en camarotes C4, C6 y C7 (ocultas en sentina C8/C9)
	var dust_rooms := [
		{"name": "CabinDust_C4", "zone": "c4", "pos": Vector3(-18.5, 1.3, -3.2), "ext": Vector3(4.0, 1.0, 2.2)},
		{"name": "CabinDust_C6", "zone": "c6", "pos": Vector3(18.5, 1.3, -3.0),  "ext": Vector3(4.0, 1.0, 2.2)},
		{"name": "CabinDust_C7", "zone": "c7", "pos": Vector3(18.0, 1.3, 3.5),   "ext": Vector3(3.8, 1.0, 2.2)},
	]
	for dr in dust_rooms:
		_spawn_zone_emitter(dr["zone"], {
			"name": dr["name"],
			"local_pos": dr["pos"],
			"box_extents": dr["ext"],
			"direction": Vector3(0.0, 0.15, 0.0),
			"spread": 70.0,
			"amount": 28,
			"lifetime": 4.2,
			"vel_min": 0.03,
			"vel_max": 0.14,
			"gravity": Vector3(0.0, -0.015, 0.0),
			"scale_min": 0.035,
			"scale_max": 0.075,
			"quad_size": Vector2(0.08, 0.08),
			"material": mat_particle_dust,
			"color_ramp": ramp_dust,
			"turb_strength": 0.25,
		})

	# Pavesas frías y polvo de hollín alrededor del fogón extinguido de C5
	_spawn_zone_emitter("c5", {
		"name": "GalleySoot_C5",
		"local_pos": Vector3(-22.2, 1.35, 4.4),
		"box_extents": Vector3(0.95, 0.75, 0.85),
		"direction": Vector3(0.05, 0.65, -0.05),
		"spread": 35.0,
		"amount": 22,
		"lifetime": 3.0,
		"vel_min": 0.06,
		"vel_max": 0.18,
		"gravity": Vector3(0.0, 0.04, 0.0),
		"scale_min": 0.08,
		"scale_max": 0.18,
		"quad_size": Vector2(0.18, 0.18),
		"material": mat_particle_soot,
		"color": Color(0.26, 0.28, 0.30, 0.40),
		"turb_strength": 0.35,
	})

func build_submerged_decks_vfx() -> void:
	# Goteras cayendo desde los tablones resquebrajados de C1 hacia la sentina inundada C8
	_spawn_zone_emitter("c8_bilge", {
		"name": "BilgeDrips_C8",
		"local_pos": Vector3(-17.5, -0.65, -3.2),
		"box_extents": Vector3(0.55, 0.08, 0.55),
		"direction": Vector3(0.0, -1.0, 0.0),
		"spread": 3.0,
		"amount": 8,
		"lifetime": 0.90,
		"vel_min": 1.4,
		"vel_max": 2.1,
		"gravity": Vector3(0.0, -7.2, 0.0),
		"scale_min": 0.65,
		"scale_max": 1.0,
		"quad_size": Vector2(0.035, 0.14),
		"material": mat_particle_drip,
		"color": Color(0.58, 0.82, 0.88, 0.30),
		"turb_strength": 0.04,
		"align_vel": true,
	})

	# Bruma húmeda baja y sutil flotando sobre el agua estancada de C8 (sin quads rectangulares claros)
	_spawn_zone_emitter("c8_bilge", {
		"name": "BilgeMist_C8",
		"local_pos": Vector3(-4.0, -2.80, 0.0),
		"box_extents": Vector3(16.0, 0.24, 3.8),
		"direction": Vector3(0.2, 0.03, 0.0),
		"spread": 60.0,
		"amount": 18,
		"lifetime": 4.4,
		"vel_min": 0.06,
		"vel_max": 0.16,
		"scale_min": 0.85,
		"scale_max": 1.45,
		"quad_size": Vector2(1.15, 0.68),
		"material": mat_particle_wind_mist,
		"color": Color(0.45, 0.62, 0.64, 0.22),
		"turb_strength": 0.26,
	})

	# Burbujas huecas con reflejo especular distribuidas por la bodega sumergida C9 y brecha P16
	_spawn_zone_emitter("c9_hold", {
		"name": "UnderwaterBubbles_C9",
		"local_pos": Vector3(-16.0, -5.8, -0.5),
		"box_extents": Vector3(11.0, 0.6, 4.0),
		"direction": Vector3(0, 1, 0),
		"spread": 14.0,
		"amount": 65,
		"lifetime": 3.4,
		"vel_min": 0.35,
		"vel_max": 1.15,
		"gravity": Vector3(0, 0.25, 0),
		"scale_min": 0.04,
		"scale_max": 0.10,
		"quad_size": Vector2(0.085, 0.085),
		"material": mat_particle_bubble,
		"color": Color(0.76, 0.92, 0.98, 0.42),
		"turb_strength": 0.45,
	})

	# Plancton/esporas abisales luminiscentes en la bodega inundada C9
	_spawn_zone_emitter("c9_hold", {
		"name": "AbyssalSpores_C9",
		"local_pos": Vector3(-16.5, -5.0, -0.5),
		"box_extents": Vector3(12.0, 1.2, 4.5),
		"direction": Vector3(0.0, 0.20, 0.0),
		"spread": 85.0,
		"amount": 42,
		"lifetime": 4.0,
		"vel_min": 0.04,
		"vel_max": 0.16,
		"scale_min": 0.04,
		"scale_max": 0.11,
		"quad_size": Vector2(0.12, 0.12),
		"material": mat_particle_spore,
		"color_ramp": ramp_spore,
		"turb_strength": 0.55,
	})
