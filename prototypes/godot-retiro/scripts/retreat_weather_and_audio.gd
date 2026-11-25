class_name RetreatWeatherAndAudio
extends Node3D

## Sistema unificado de climatología 3D (Despejado / Lluvia / Tormenta / Bruma)
## y paisaje sonoro interactivo para El Retiro del Dragón.
## Respeta tejados y cuevas mediante GPUParticlesCollisionBox3D para que nunca
## llueva dentro de A1, A2, A3, A4 ni A5 al abrir cutaways.

const VALID_WEATHER := ["clear", "rain", "storm", "fog"]

var weather: String = "clear"
var reduced_effects: bool = false
var wetness: float = 0.0
var target_wetness: float = 0.0

var _builder: Node3D = null
var _rain_particles: GPUParticles3D = null
var _fog_particles: GPUParticles3D = null
var _lightning_light: DirectionalLight3D = null
var _lightning_timer: float = 7.5
var _lightning_flash: float = 0.0
var _wet_materials: Array[Dictionary] = []

# Canales de mezcla DM (0..100) y generador de audio ambiental/SFX
var channel_volumes: Dictionary = {
	"music": 65.0,
	"ocean": 75.0,
	"wind": 65.0,
	"rain": 80.0
}
var _ambient_player: AudioStreamPlayer = null
var _sfx_player: AudioStreamPlayer = null
var _audio_phase: float = 0.0
var _pink_b0: float = 0.0
var _pink_b1: float = 0.0
var _pink_b2: float = 0.0
var _audio_rng := RandomNumberGenerator.new()

func setup(builder: Node3D) -> void:
	_builder = builder
	_audio_rng.seed = 20261124
	add_to_group("weather_listener")
	_build_roof_rain_colliders()
	_build_rain_particles()
	_build_fog_mist_particles()
	_build_lightning_light()
	_catalogue_wet_materials()
	_setup_audio_players()
	apply_weather_state(true)

func set_weather(w: String, immediate: bool = false) -> bool:
	var norm := w.strip_edges().to_lower()
	if norm not in VALID_WEATHER:
		norm = "clear"
	weather = norm
	target_wetness = 1.0 if weather == "storm" else (0.72 if weather == "rain" else (0.18 if weather == "fog" else 0.0))
	if immediate:
		wetness = target_wetness
	apply_weather_state(immediate)
	return true

func get_weather() -> String:
	return weather

func set_reduced_effects(v: bool) -> void:
	reduced_effects = v
	apply_weather_state(false)

func set_channel_volume(channel_id: String, value_0_100: float) -> void:
	channel_volumes[channel_id] = clampf(value_0_100, 0.0, 100.0)

func play_dm_sfx(sfx_id: String) -> void:
	if DisplayServer.get_name() == "headless" or AudioServer.get_driver_name() == "Dummy":
		return
	if not is_instance_valid(_sfx_player) or not _sfx_player.is_inside_tree():
		return
	_sfx_player.play()
	var pb := _sfx_player.get_stream_playback() as AudioStreamGeneratorPlayback
	if pb == null:
		return
	var sr := 22050.0
	var frames := mini(pb.get_frames_available(), 18000)
	var low_id := sfx_id.to_lower()
	for i in range(frames):
		var tm := float(i) / sr
		var sample := 0.0
		if "campana" in low_id or "templo" in low_id:
			var env := exp(-tm * 2.2)
			sample = (sin(tm * 330.0 * TAU) * 0.55 + sin(tm * 662.0 * TAU) * 0.25 + sin(tm * 994.0 * TAU) * 0.12) * env * 0.30
		elif "gaviota" in low_id or "arpía" in low_id or "arpia" in low_id:
			var env := sin(clampf(tm / 0.52, 0.0, 1.0) * PI) * exp(-tm * 2.4)
			var freq := lerpf(1180.0, 740.0, clampf(tm / 0.45, 0.0, 1.0)) + sin(tm * 34.0) * 45.0
			sample = sin(tm * freq * TAU) * env * 0.22
		elif "trueno" in low_id:
			var env := exp(-tm * 1.45) * (0.65 + 0.35 * sin(tm * 9.5))
			var rumble := sin(tm * (44.0 + sin(tm * 6.0) * 8.0) * TAU) * 0.55 + _audio_rng.randf_range(-0.45, 0.45)
			sample = rumble * env * 0.34
		elif "cabrestante" in low_id or "madera" in low_id or "crujido" in low_id:
			var env := exp(-tm * 3.8)
			var creak := sin(tm * lerpf(140.0, 210.0, clampf(tm / 0.4, 0.0, 1.0)) * TAU + sin(tm * 32.0) * 2.2)
			sample = creak * env * 0.25
		else:
			# Tirada de dados / choque de aceros
			var env := exp(-tm * 6.5)
			var click := sin(tm * 780.0 * TAU) * 0.45 + sin(tm * 1340.0 * TAU) * 0.25 + _audio_rng.randf_range(-0.25, 0.25)
			sample = click * env * 0.26
		pb.push_frame(Vector2(sample, sample))

func _process(delta: float) -> void:
	# 1. Transición suave de humedad en piedra y pavimento
	var next_w := move_toward(wetness, target_wetness, delta * 0.35)
	if not is_equal_approx(next_w, wetness):
		wetness = next_w
		_apply_wetness_to_materials()

	# 2. Seguir el encuadre de cámara con las partículas de lluvia/bruma para máxima densidad en vista actual
	if is_instance_valid(_builder) and _builder.get_parent():
		var cam := _builder.get_parent().get_node_or_null("TacticalCamera") as Camera3D
		if is_instance_valid(cam):
			var focus: Vector3 = cam.get("target_focus") if cam.get("target_focus") is Vector3 else cam.global_position
			if is_instance_valid(_rain_particles):
				_rain_particles.global_position = Vector3(clampf(focus.x, 10.0, 165.0), maxf(focus.y, 12.0) + 26.0, clampf(focus.z, 18.0, 118.0))
			if is_instance_valid(_fog_particles):
				_fog_particles.global_position = Vector3(clampf(focus.x, 12.0, 162.0), clampf(focus.y, 2.0, 28.0) + 2.2, clampf(focus.z, 22.0, 115.0))

	# 3. Relámpagos periódicos en modo Tormenta
	if is_instance_valid(_lightning_light):
		if weather == "storm" and not reduced_effects:
			_lightning_timer -= delta
			if _lightning_timer <= 0.0:
				_lightning_flash = 1.0
				_lightning_timer = _audio_rng.randf_range(6.5, 13.0)
				play_dm_sfx("trueno")
			if _lightning_flash > 0.0:
				_lightning_flash = maxf(0.0, _lightning_flash - delta * 4.2)
				var flicker := 1.0 if (_lightning_flash > 0.72 or (_lightning_flash > 0.32 and _lightning_flash < 0.52)) else 0.25
				_lightning_light.light_energy = _lightning_flash * flicker * 2.4
				_lightning_light.visible = _lightning_flash > 0.02
			else:
				_lightning_light.visible = false
				_lightning_light.light_energy = 0.0
		else:
			_lightning_flash = 0.0
			_lightning_light.visible = false
			_lightning_light.light_energy = 0.0

	# 4. Paisaje sonoro mezclado en vivo según clima y deslizadores DM
	_pump_ambient_audio()

func apply_weather_state(immediate: bool = false) -> void:
	if not is_instance_valid(_builder):
		return
	if immediate:
		wetness = target_wetness
	_apply_wetness_to_materials()

	# Configurar partículas de lluvia y bruma
	if is_instance_valid(_rain_particles):
		var rain_active := weather in ["rain", "storm"]
		_rain_particles.visible = rain_active
		_rain_particles.emitting = rain_active
		if rain_active:
			var pm := _rain_particles.process_material as ParticleProcessMaterial
			if pm:
				if weather == "storm":
					pm.direction = Vector3(-0.28, -1.0, 0.14).normalized()
					pm.initial_velocity_min = 24.0
					pm.initial_velocity_max = 32.0
				else:
					pm.direction = Vector3(-0.08, -1.0, 0.04).normalized()
					pm.initial_velocity_min = 16.5
					pm.initial_velocity_max = 22.0
			var target_amt := (2200 if weather == "storm" else 1200)
			if reduced_effects:
				target_amt = int(target_amt * 0.45)
			if _rain_particles.amount != target_amt:
				_rain_particles.amount = target_amt

	if is_instance_valid(_fog_particles):
		var fog_active := weather in ["fog", "storm"]
		_fog_particles.visible = fog_active
		_fog_particles.emitting = fog_active
		var f_amt := 88 if weather == "fog" else 36
		if reduced_effects:
			f_amt = int(f_amt * 0.5)
		if _fog_particles.amount != f_amt:
			_fog_particles.amount = f_amt

	# Reaplicar atmósfera (hora + clima + oleaje) en el layout builder
	if _builder.has_method("_apply_atmosphere_lighting") and _builder.has_method("get_time_of_day"):
		_builder.call("_apply_atmosphere_lighting", str(_builder.call("get_time_of_day")))

func modulate_atmosphere(mode: String, sun: DirectionalLight3D, env: Environment, sky_mat: ProceduralSkyMaterial, ocean_mat: ShaderMaterial) -> void:
	var is_overcast := weather in ["rain", "storm", "fog"]
	if sun:
		match weather:
			"rain":
				sun.light_energy *= 0.62
				sun.light_color = sun.light_color.lerp(Color(0.72, 0.80, 0.90), 0.52)
			"storm":
				sun.light_energy *= 0.46
				sun.light_color = sun.light_color.lerp(Color(0.56, 0.66, 0.80), 0.66)
			"fog":
				sun.light_energy *= 0.68
				sun.light_color = sun.light_color.lerp(Color(0.86, 0.90, 0.92), 0.52)

	if env:
		match weather:
			"rain":
				env.ambient_light_color = env.ambient_light_color.lerp(Color(0.32, 0.40, 0.50), 0.55)
				env.ambient_light_energy *= 0.92
				env.fog_enabled = true
				env.fog_density = 0.0068
				env.fog_depth_begin = 16.0
				env.fog_depth_end = 150.0
				env.fog_light_color = env.fog_light_color.lerp(Color(0.36, 0.45, 0.55), 0.62)
				env.fog_sky_affect = 0.58
			"storm":
				env.ambient_light_color = env.ambient_light_color.lerp(Color(0.26, 0.34, 0.46), 0.68)
				env.ambient_light_energy *= 0.86
				env.fog_enabled = true
				env.fog_density = 0.0095
				env.fog_depth_begin = 12.0
				env.fog_depth_end = 128.0
				env.fog_light_color = env.fog_light_color.lerp(Color(0.24, 0.32, 0.43), 0.72)
				env.fog_sky_affect = 0.72
			"fog":
				env.ambient_light_color = env.ambient_light_color.lerp(Color(0.64, 0.70, 0.75), 0.60)
				env.ambient_light_energy *= 1.08
				env.fog_enabled = true
				env.fog_density = 0.0175
				env.fog_depth_begin = 6.0
				env.fog_depth_end = 98.0
				env.fog_light_color = (Color(0.24, 0.30, 0.38) if mode == "night" else Color(0.75, 0.81, 0.85))
				env.fog_sky_affect = 0.86
			_:
				env.fog_enabled = true
				env.fog_density = 0.0031
				env.fog_depth_begin = 26.0
				env.fog_depth_end = 200.0
				env.fog_sky_affect = 0.42

	if sky_mat and is_overcast:
		var top_t := Color(0.12, 0.16, 0.22) if weather == "storm" else (Color(0.34, 0.40, 0.46) if weather == "rain" else Color(0.55, 0.62, 0.66))
		var hor_t := Color(0.22, 0.28, 0.36) if weather == "storm" else (Color(0.46, 0.52, 0.58) if weather == "rain" else Color(0.72, 0.77, 0.80))
		if mode == "night":
			top_t = top_t.darkened(0.62)
			hor_t = hor_t.darkened(0.58)
		elif mode == "dusk":
			hor_t = hor_t.lerp(Color(0.45, 0.35, 0.38), 0.35)
		var mix_w := 0.78 if weather == "storm" else 0.62
		sky_mat.sky_top_color = sky_mat.sky_top_color.lerp(top_t, mix_w)
		sky_mat.sky_horizon_color = sky_mat.sky_horizon_color.lerp(hor_t, mix_w)
		sky_mat.ground_horizon_color = sky_mat.sky_horizon_color.darkened(0.18)

	if ocean_mat:
		match weather:
			"storm":
				ocean_mat.set_shader_parameter("wave_amp", 0.24 if not reduced_effects else 0.12)
				ocean_mat.set_shader_parameter("wave_speed", 0.088)
				ocean_mat.set_shader_parameter("foam_range", 1.18)
				ocean_mat.set_shader_parameter("storm_factor", 1.0)
			"rain":
				ocean_mat.set_shader_parameter("wave_amp", 0.13 if not reduced_effects else 0.07)
				ocean_mat.set_shader_parameter("wave_speed", 0.056)
				ocean_mat.set_shader_parameter("foam_range", 0.86)
				ocean_mat.set_shader_parameter("storm_factor", 0.45)
			"fog":
				ocean_mat.set_shader_parameter("wave_amp", 0.055)
				ocean_mat.set_shader_parameter("wave_speed", 0.026)
				ocean_mat.set_shader_parameter("foam_range", 0.68)
				ocean_mat.set_shader_parameter("storm_factor", 0.15)
			_:
				ocean_mat.set_shader_parameter("wave_amp", 0.095)
				ocean_mat.set_shader_parameter("wave_speed", 0.042)
				ocean_mat.set_shader_parameter("foam_range", 0.76)
				ocean_mat.set_shader_parameter("storm_factor", 0.0)

func _build_roof_rain_colliders() -> void:
	# Colisionadores de partículas sobre los techos de A1, A2, A3, A4 y A5 para que la lluvia no caiga dentro
	var col_root := Node3D.new()
	col_root.name = "RainRoofBlockers"
	add_child(col_root)
	var roofs := [
		["Block_A1Cells", Vector3(106.5, 13.8, 83.2), Vector3(64.0, 1.8, 14.5)],
		["Block_A2Winch", Vector3(160.2, 18.8, 66.8), Vector3(13.2, 1.8, 10.4)],
		["Block_A3A4Caves", Vector3(109.5, 22.8, 57.5), Vector3(53.0, 2.2, 17.0)],
		["Block_A5Temple", Vector3(40.5, 34.0, 69.5), Vector3(20.0, 1.8, 17.5)],
	]
	for rf in roofs:
		var bc := GPUParticlesCollisionBox3D.new()
		bc.name = str(rf[0])
		bc.position = rf[1]
		bc.size = rf[2]
		col_root.add_child(bc)

func _build_rain_particles() -> void:
	var p := GPUParticles3D.new()
	p.name = "RetreatRainParticles"
	p.position = Vector3(88.0, 42.0, 78.0)
	p.amount = 1200
	p.lifetime = 2.10
	p.preprocess = 1.4
	p.emitting = false
	p.visible = false
	p.visibility_aabb = AABB(Vector3(-95.0, -58.0, -95.0), Vector3(190.0, 85.0, 190.0))

	var pm := ParticleProcessMaterial.new()
	pm.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_BOX
	pm.emission_box_extents = Vector3(58.0, 14.0, 50.0)
	pm.direction = Vector3(-0.10, -1.0, 0.05).normalized()
	pm.spread = 3.5
	pm.initial_velocity_min = 18.0
	pm.initial_velocity_max = 24.0
	pm.gravity = Vector3(0.0, -12.0, 0.0)
	pm.particle_flag_align_y = true
	pm.collision_mode = ParticleProcessMaterial.COLLISION_HIDE_ON_CONTACT
	pm.color = Color(0.80, 0.89, 0.98, 0.52)
	p.process_material = pm

	var q := QuadMesh.new()
	q.size = Vector2(0.06, 1.42)
	var rmat := StandardMaterial3D.new()
	rmat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	rmat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	rmat.cull_mode = BaseMaterial3D.CULL_DISABLED
	rmat.albedo_color = Color(0.82, 0.90, 0.98, 0.50)
	rmat.depth_draw_mode = BaseMaterial3D.DEPTH_DRAW_DISABLED
	p.draw_pass_1 = q
	p.material_override = rmat
	p.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(p)
	_rain_particles = p

func _build_fog_mist_particles() -> void:
	var p := GPUParticles3D.new()
	p.name = "RetreatFogMistParticles"
	p.position = Vector3(88.0, 14.0, 78.0)
	p.amount = 48
	p.lifetime = 6.2
	p.preprocess = 3.0
	p.emitting = false
	p.visible = false
	p.visibility_aabb = AABB(Vector3(-90.0, -25.0, -90.0), Vector3(180.0, 50.0, 180.0))

	var pm := ParticleProcessMaterial.new()
	pm.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_BOX
	pm.emission_box_extents = Vector3(44.0, 5.0, 38.0)
	pm.direction = Vector3(0.8, 0.05, 0.25).normalized()
	pm.spread = 22.0
	pm.initial_velocity_min = 0.65
	pm.initial_velocity_max = 1.45
	pm.gravity = Vector3.ZERO
	pm.scale_min = 4.5
	pm.scale_max = 9.0
	pm.color = Color(0.84, 0.89, 0.93, 0.20)
	p.process_material = pm

	var grad := Gradient.new()
	grad.offsets = PackedFloat32Array([0.0, 0.5, 1.0])
	grad.colors = PackedColorArray([Color(0.86, 0.90, 0.94, 0.42), Color(0.84, 0.88, 0.92, 0.16), Color(0.84, 0.88, 0.92, 0.0)])
	var gtex := GradientTexture2D.new()
	gtex.width = 64
	gtex.height = 64
	gtex.fill = GradientTexture2D.FILL_RADIAL
	gtex.fill_from = Vector2(0.5, 0.5)
	gtex.fill_to = Vector2(0.96, 0.5)
	gtex.gradient = grad

	var q := QuadMesh.new()
	q.size = Vector2(3.6, 2.2)
	var m := StandardMaterial3D.new()
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.billboard_mode = BaseMaterial3D.BILLBOARD_ENABLED
	m.albedo_texture = gtex
	m.albedo_color = Color(0.88, 0.92, 0.96, 0.34)
	m.depth_draw_mode = BaseMaterial3D.DEPTH_DRAW_DISABLED
	p.draw_pass_1 = q
	p.material_override = m
	p.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(p)
	_fog_particles = p

func _build_lightning_light() -> void:
	var lt := DirectionalLight3D.new()
	lt.name = "StormLightningLight"
	lt.rotation_degrees = Vector3(-54.0, 32.0, 0.0)
	lt.light_color = Color(0.80, 0.88, 1.0)
	lt.light_energy = 0.0
	lt.shadow_enabled = false
	lt.visible = false
	add_child(lt)
	_lightning_light = lt

func _catalogue_wet_materials() -> void:
	_wet_materials.clear()
	if not is_instance_valid(_builder):
		return
	var keys := [
		"mat_beach", "mat_plaza", "mat_rock", "mat_rock_dark", "mat_rock_carved",
		"mat_upper", "mat_trail", "mat_sacred", "mat_column", "mat_wood", "mat_wood_dark",
		"_mat_paving_glb", "_mat_carved_glb", "_mat_rock_glb", "_mat_earth_glb"
	]
	for k in keys:
		var m = _builder.get(k)
		if m is StandardMaterial3D:
			var sm := m as StandardMaterial3D
			_wet_materials.append({
				"mat": sm,
				"albedo": sm.albedo_color,
				"roughness": sm.roughness,
				"specular": sm.metallic_specular
			})

func _apply_wetness_to_materials() -> void:
	for entry in _wet_materials:
		var sm: StandardMaterial3D = entry["mat"]
		if not is_instance_valid(sm):
			continue
		var base_col: Color = entry["albedo"]
		sm.albedo_color = Color(
			base_col.r * (1.0 - wetness * 0.22),
			base_col.g * (1.0 - wetness * 0.19),
			base_col.b * (1.0 - wetness * 0.15),
			base_col.a
		)
		sm.roughness = lerpf(float(entry["roughness"]), 0.36, wetness)
		sm.metallic_specular = lerpf(float(entry["specular"]), 0.42, wetness)

func _setup_audio_players() -> void:
	if DisplayServer.get_name() == "headless" or AudioServer.get_driver_name() == "Dummy":
		return
	_ambient_player = AudioStreamPlayer.new()
	_ambient_player.name = "RetreatWeatherAmbientPlayer"
	var gen := AudioStreamGenerator.new()
	gen.mix_rate = 22050.0
	gen.buffer_length = 0.25
	_ambient_player.stream = gen
	_ambient_player.volume_db = -14.0
	add_child(_ambient_player)
	if _ambient_player.is_inside_tree():
		_ambient_player.play()

	_sfx_player = AudioStreamPlayer.new()
	_sfx_player.name = "RetreatDmSfxPlayer"
	var sgen := AudioStreamGenerator.new()
	sgen.mix_rate = 22050.0
	sgen.buffer_length = 0.85
	_sfx_player.stream = sgen
	_sfx_player.volume_db = -8.0
	add_child(_sfx_player)

func _pump_ambient_audio() -> void:
	if DisplayServer.get_name() == "headless" or AudioServer.get_driver_name() == "Dummy":
		return
	if not is_instance_valid(_ambient_player) or not _ambient_player.playing:
		return
	var pb := _ambient_player.get_stream_playback() as AudioStreamGeneratorPlayback
	if pb == null:
		return
	var avail := pb.get_frames_available()
	if avail < 64:
		return
	var v_music := float(channel_volumes.get("music", 65.0)) / 100.0
	var v_ocean := float(channel_volumes.get("ocean", 75.0)) / 100.0
	var v_wind := float(channel_volumes.get("wind", 65.0)) / 100.0
	var v_rain := float(channel_volumes.get("rain", 80.0)) / 100.0
	if v_music + v_ocean + v_wind + v_rain <= 0.01:
		return
	var rain_mult := 1.0 if weather == "storm" else (0.58 if weather == "rain" else 0.0)
	var wind_mult := 1.0 if weather == "storm" else (0.55 if weather == "rain" else (0.35 if weather == "fog" else 0.22))
	var dt := 1.0 / 22050.0
	var steps := mini(avail, 256)
	for _i in range(steps):
		_audio_phase += dt
		var white := _audio_rng.randf_range(-1.0, 1.0)
		_pink_b0 = 0.997 * _pink_b0 + white * 0.029
		_pink_b1 = 0.985 * _pink_b1 + white * 0.032
		_pink_b2 = 0.950 * _pink_b2 + white * 0.048
		var pink := _pink_b0 + _pink_b1 + _pink_b2
		var surf_env := 0.55 + 0.45 * sin(_audio_phase * (0.95 if weather == "storm" else 0.48))
		var ocean_s := pink * surf_env * v_ocean * 0.22
		var wind_s := (_pink_b1 * 1.4 + sin(_audio_phase * 215.0 * TAU) * 0.03) * wind_mult * v_wind * 0.24
		var rain_s := (white * 0.26 + pink * 0.35) * rain_mult * v_rain * 0.26
		var choir_s := (sin(_audio_phase * 220.0 * TAU) * 0.022 + sin(_audio_phase * 330.0 * TAU) * 0.014) * (0.5 + 0.5 * sin(_audio_phase * 0.22)) * v_music
		var out_s := clampf(ocean_s + wind_s + rain_s + choir_s, -0.85, 0.85)
		pb.push_frame(Vector2(out_s, out_s))
