class_name CampAtmosphereFx
extends Node3D

## Environmental VFX, animated ocean/surf, camp hearth particles, day/dusk/night/dawn
## lighting, dynamic weather (rain, storm, fog, snow) and ambient wildlife (birds/insects).

const MatKit = preload("res://scripts/camp_material_kit.gd")
const FaunaKit = preload("res://scripts/camp_fauna_kit.gd")

signal weather_changed(weather_id: String)
signal phase_changed(phase_id: String)
signal campfire_lit_changed(lit: bool)

var world_env: WorldEnvironment
var sun_light: DirectionalLight3D

var current_phase: String = "dusk"
var current_weather: String = "clear"
var wetness: float = 0.0
var snow_cover: float = 0.0
var reduced_motion: bool = false
var campfire_lit: bool = true
var fire_manual_override: String = ""
var _fire_auto_schedule: bool = false

var _rain_particles: GPUParticles3D
var _snow_particles: GPUParticles3D
var _lightning_light: DirectionalLight3D
var _sky_fill_light: DirectionalLight3D
var _lightning_timer: float = 4.5
var _fire_lights: Array[Dictionary] = []
var _birds: Array[Dictionary] = []
var _insects: Array[Dictionary] = []
var _surf_meshes: Array[MeshInstance3D] = []
var _drips: Array[Dictionary] = []
var _aurora_meshes: Array[MeshInstance3D] = []
var _clouds: Array[Dictionary] = []
var _lanterns: Array[Dictionary] = []
var _smoke_materials: Array[ParticleProcessMaterial] = []
var _time: float = 0.0
var _map_center := Vector3(18.0, 0.0, 16.5)

func setup(env_node: WorldEnvironment, dir_light: DirectionalLight3D, center: Vector3, default_phase: String = "dusk") -> void:
	world_env = env_node
	sun_light = dir_light
	_map_center = center
	current_phase = default_phase
	_build_sky_fill_light()
	_build_weather_emitters()
	apply_lighting_phase(default_phase)

func _build_sky_fill_light() -> void:
	_sky_fill_light = DirectionalLight3D.new()
	_sky_fill_light.name = "SkyHemisphereFill"
	_sky_fill_light.shadow_enabled = false
	_sky_fill_light.rotation = Vector3(deg_to_rad(-34.0), deg_to_rad(145.0), 0.0)
	_sky_fill_light.light_energy = 0.24
	add_child(_sky_fill_light)

func _process(delta: float) -> void:
	var dt := 0.0 if reduced_motion else delta
	_time += dt

	# Campfire & torch warm flicker (0 energy & hidden flame when extinguished)
	var day_scale := 0.48 if (current_phase in ["day", "arrival"] and current_weather == "clear") else 1.0
	for fl in _fire_lights:
		var light: OmniLight3D = fl.get("light")
		if not is_instance_valid(light):
			continue
		var flame_mesh: Node3D = fl.get("flame_node")
		if not campfire_lit:
			light.light_energy = 0.0
			if is_instance_valid(flame_mesh):
				flame_mesh.visible = false
			continue
		var fuel: float = float(fl.get("fuel", 0.78))
		var base_e: float = float(fl.get("base_energy", 2.2)) * clampf(0.35 + fuel * 0.9, 0.25, 1.35) * day_scale
		var pulse := (sin(_time * 6.2 + float(fl["phase"])) * 0.14 + cos(_time * 10.7 + float(fl["phase"])) * 0.08) * day_scale
		light.light_energy = maxf(0.18, base_e + pulse)
		if is_instance_valid(flame_mesh):
			flame_mesh.visible = true
			var sc := clampf(0.55 + fuel * 0.65, 0.4, 1.25)
			flame_mesh.scale = Vector3(sc, sc * (0.9 + sin(_time * 9.0 + float(fl["phase"])) * 0.16), sc)

	# Breaking surf wave sliding
	for idx in range(_surf_meshes.size()):
		var sm := _surf_meshes[idx]
		if is_instance_valid(sm):
			var base_z := float(sm.get_meta("base_z", sm.position.z))
			var shift := sin(_time * 1.15 + float(idx) * 1.2) * 0.65
			sm.position.z = base_z + shift

	# Flying 3D birds (weather/phase-aware episodic sky flybys + owls at night)
	_sync_sky_wildlife()
	for b in _birds:
		var node: Node3D = b.get("node")
		if is_instance_valid(node) and node.visible:
			var v_cyc: float = float(b.get("visit_cycle", 46.0))
			var v_duty: float = float(b.get("visit_duty", 0.44))
			var v_off: float = float(b.get("visit_offset", 0.0))
			var u_c := fmod(maxf(0.0, _time + v_off), v_cyc) / v_cyc
			var ang := (u_c / v_duty) * TAU + float(b["phase"])
			var rad := float(b["radius"])
			var c: Vector3 = b["center"]
			node.position = Vector3(c.x + cos(ang) * rad, c.y + sin(ang * 2.1) * 0.65, c.z + sin(ang * 1.2) * rad * 0.62)
			var dx := -sin(ang) * rad
			var dz := cos(ang * 1.2) * rad * 0.62 * 1.2
			node.rotation.y = atan2(dx, dz)
			node.rotation.z = sin(ang) * -0.14
			var lw: Node3D = b.get("lw")
			var rw: Node3D = b.get("rw")
			var glide := maxf(0.18, sin(_time * 1.4 + float(b["phase"])) + 0.4)
			var flap := sin(_time * 9.5 + float(b["phase"])) * 0.52 * clampf(glide, 0.25, 1.0)
			if is_instance_valid(lw): lw.rotation.z = flap
			if is_instance_valid(rw): rw.rotation.z = -flap

	# Evening/night fireflies & insects (shelter cleanly in rain/storm/snow)
	var show_insects := (current_phase in ["dusk", "night"]) and not (current_weather in ["rain", "storm", "snow"])
	for ins in _insects:
		var node: Node3D = ins.get("node")
		if is_instance_valid(node):
			node.visible = show_insects
			if show_insects:
				var c: Vector3 = ins["center"]
				var p := float(ins["phase"])
				node.position = Vector3(
					c.x + sin(_time * 1.4 + p) * 1.1,
					c.y + sin(_time * 2.2 + p * 1.7) * 0.25,
					c.z + cos(_time * 1.1 + p) * 1.1
				)

	# Cave ceiling water drips
	for dr in _drips:
		var dm: Node3D = dr.get("node")
		if is_instance_valid(dm):
			var cyc := fmod(_time * float(dr["speed"]) + float(dr["phase"]), 1.0)
			var y_top := float(dr["y_top"])
			var y_bot := float(dr["y_bot"])
			dm.position.y = lerpf(y_top, y_bot, cyc * cyc)
			dm.visible = cyc < 0.92

	# Observatory 3D Aurora ribbons
	for idx in range(_aurora_meshes.size()):
		var au := _aurora_meshes[idx]
		if is_instance_valid(au):
			au.visible = current_phase in ["dusk", "night", "dawn"]
			au.position.x = float(au.get_meta("base_x", 0.0)) + sin(_time * 0.14 + float(idx)) * 1.4
			au.rotation.y = sin(_time * 0.18 + float(idx) * 1.1) * 0.04

	# Drifting clouds
	for cl in _clouds:
		var cn: Node3D = cl.get("node")
		if is_instance_valid(cn):
			var bx := float(cl["base_x"])
			var span := float(cl["span"])
			var x := fmod((bx - _map_center.x + span * 0.5) + _time * float(cl["speed"]), span) - span * 0.5 + _map_center.x
			cn.position.x = x

	# Storm lightning flash
	if current_weather == "storm" and is_instance_valid(_lightning_light) and not reduced_motion:
		_lightning_timer -= delta
		if _lightning_timer <= 0.0:
			_lightning_timer = randf_range(5.5, 13.0)
			_trigger_lightning()

func _trigger_lightning() -> void:
	if not is_instance_valid(_lightning_light):
		return
	var tw := create_tween()
	_lightning_light.light_energy = 3.2
	tw.tween_property(_lightning_light, "light_energy", 0.0, 0.22)

func apply_lighting_phase(phase_id: String) -> void:
	current_phase = phase_id
	emit_signal("phase_changed", phase_id)

	var sky_top := Color("#233a54")
	var sky_hor := Color("#5c6b7a")
	var amb_col := Color("#36495c")
	var amb_e := 0.62
	var sun_col := Color("#ffe6c4")
	var sun_e := 1.1
	var sun_pitch := deg_to_rad(-42.0)
	var fog_col := Color("#465564")
	var fog_den := 0.008

	match phase_id:
		"day", "arrival":
			sky_top = Color("#2d5a84")
			sky_hor = Color("#94b5ca")
			amb_col = Color("#657c8f")
			amb_e = 0.84
			sun_col = Color("#fff2da")
			sun_e = 1.48
			sun_pitch = deg_to_rad(-44.0)
			fog_col = Color("#8aa4b8")
			fog_den = 0.0
		"dusk":
			sky_top = Color("#242c52")
			sky_hor = Color("#c87759")
			amb_col = Color("#625775")
			amb_e = 0.72
			sun_col = Color("#ffae74")
			sun_e = 1.24
			sun_pitch = deg_to_rad(-31.0)
			fog_col = Color("#6a535d")
			fog_den = 0.0
		"night":
			sky_top = Color("#091322")
			sky_hor = Color("#1d324d")
			amb_col = Color("#395273")
			amb_e = 0.62
			sun_col = Color("#93b8ee")
			sun_e = 0.72
			sun_pitch = deg_to_rad(-36.0)
			fog_col = Color("#162336")
			fog_den = 0.0
		"dawn", "finalization":
			sky_top = Color("#3b5578")
			sky_hor = Color("#d99e7e")
			amb_col = Color("#666c82")
			amb_e = 0.76
			sun_col = Color("#ffd1a4")
			sun_e = 1.22
			sun_pitch = deg_to_rad(-32.0)
			fog_col = Color("#9b8b90")
			fog_den = 0.0

	if world_env and world_env.environment:
		var env := world_env.environment
		env.ambient_light_color = amb_col
		env.ambient_light_energy = amb_e
		env.fog_mode = Environment.FOG_MODE_DEPTH
		env.fog_depth_curve = 1.0
		env.fog_aerial_perspective = 0.0
		env.fog_light_color = fog_col
		match current_weather:
			"fog":
				env.fog_enabled = true
				env.fog_depth_begin = 38.0
				env.fog_depth_end = 135.0
				env.fog_density = 0.36
			"storm":
				env.fog_enabled = true
				env.fog_depth_begin = 54.0
				env.fog_depth_end = 165.0
				env.fog_density = 0.24
			"rain":
				env.fog_enabled = true
				env.fog_depth_begin = 64.0
				env.fog_depth_end = 190.0
				env.fog_density = 0.18
			"snow":
				env.fog_enabled = true
				env.fog_depth_begin = 58.0
				env.fog_depth_end = 180.0
				env.fog_density = 0.20
			_:
				env.fog_enabled = false
		if env.sky and env.sky.sky_material is ProceduralSkyMaterial:
			var psm := env.sky.sky_material as ProceduralSkyMaterial
			psm.sky_top_color = sky_top
			psm.sky_horizon_color = sky_hor
			psm.ground_bottom_color = sky_top.darkened(0.45)
			psm.ground_horizon_color = fog_col.darkened(0.25)

	if sun_light:
		sun_light.light_color = sun_col
		sun_light.light_energy = sun_e
		sun_light.rotation.x = sun_pitch
	if is_instance_valid(_sky_fill_light):
		if phase_id == "night":
			_sky_fill_light.light_color = Color("#6f90c4")
			_sky_fill_light.light_energy = 0.28
		elif phase_id == "dusk":
			_sky_fill_light.light_color = Color("#8f8ab8")
			_sky_fill_light.light_energy = 0.25
		else:
			_sky_fill_light.light_color = Color("#b9d0df")
			_sky_fill_light.light_energy = 0.20

	# Daylight lantern policy: portable lanterns stay OFF in bright clear day/arrival
	var lanterns_lit := (not (phase_id in ["day", "arrival"])) or (current_weather in ["storm", "fog"])
	for lan in _lanterns:
		var l_node: OmniLight3D = lan.get("light")
		var g_mat: StandardMaterial3D = lan.get("glass_mat")
		if is_instance_valid(l_node):
			l_node.light_energy = 1.05 if lanterns_lit else 0.0
		if is_instance_valid(g_mat):
			g_mat.emission_enabled = lanterns_lit
			g_mat.emission_energy_multiplier = 1.55 if lanterns_lit else 0.0

	# Night-only automatic campfire schedule for exterior camps (unless character manually toggled)
	if _fire_auto_schedule:
		if fire_manual_override == "on":
			_apply_campfire_lit_state(true)
		elif fire_manual_override == "off":
			_apply_campfire_lit_state(false)
		else:
			_apply_campfire_lit_state(not (phase_id in ["day", "arrival"]))

	_sync_sky_wildlife()

func _sync_sky_wildlife() -> void:
	var weather_ok := not (current_weather in ["rain", "storm", "snow"])
	for b in _birds:
		var node: Node3D = b.get("node")
		if not is_instance_valid(node):
			continue
		var phases: Array = b.get("phases", ["day", "arrival", "dawn"])
		var b_weather: Array = b.get("blocked_weather", ["rain", "storm", "snow"])
		var vis := (current_phase in phases) and (not (current_weather in b_weather))
		if vis:
			var v_cyc: float = float(b.get("visit_cycle", 50.0))
			var v_duty: float = float(b.get("visit_duty", 0.45))
			var v_off: float = float(b.get("visit_offset", 0.0))
			var u_c := fmod(maxf(0.0, _time + v_off), v_cyc) / v_cyc
			if u_c >= v_duty:
				vis = false
		node.visible = vis
	var show_insects := (current_phase in ["dusk", "night"]) and weather_ok
	for ins in _insects:
		var m: Node3D = ins.get("node")
		if is_instance_valid(m):
			m.visible = show_insects

func set_campfire_auto_by_phase(enabled: bool) -> void:
	_fire_auto_schedule = enabled
	if _fire_auto_schedule and fire_manual_override == "":
		_apply_campfire_lit_state(not (current_phase in ["day", "arrival"]))

func set_campfire_lit(lit: bool, manual: bool = true) -> bool:
	if manual:
		fire_manual_override = "on" if lit else "off"
	_apply_campfire_lit_state(lit)
	return campfire_lit

func _apply_campfire_lit_state(lit: bool) -> void:
	campfire_lit = lit
	for fl in _fire_lights:
		var light: OmniLight3D = fl.get("light")
		var flame_node: Node3D = fl.get("flame_node")
		var smoke: GPUParticles3D = fl.get("smoke")
		var embers: GPUParticles3D = fl.get("embers")
		var coals_mat: StandardMaterial3D = fl.get("coals_mat")
		var soup_mat: StandardMaterial3D = fl.get("soup_mat")
		if is_instance_valid(flame_node):
			flame_node.visible = lit
		if is_instance_valid(smoke):
			smoke.emitting = lit
			smoke.visible = lit
		if is_instance_valid(embers):
			embers.emitting = lit
			embers.visible = lit
		if is_instance_valid(coals_mat):
			coals_mat.emission_enabled = lit
			coals_mat.emission_energy_multiplier = 2.4 if lit else 0.0
			coals_mat.albedo_color = Color("#ff6522") if lit else Color("#242220")
		if is_instance_valid(soup_mat):
			soup_mat.emission_enabled = lit
			soup_mat.emission_energy_multiplier = 0.72 if lit else 0.0
			soup_mat.albedo_color = Color("#c96b2b") if lit else Color("#574331")
		if is_instance_valid(light):
			if lit:
				var fuel: float = float(fl.get("fuel", 0.8))
				light.light_energy = float(fl.get("base_energy", 2.8)) * clampf(0.35 + fuel * 0.9, 0.25, 1.35)
			else:
				light.light_energy = 0.0
	emit_signal("campfire_lit_changed", campfire_lit)

func apply_weather(weather_id: String) -> void:
	current_weather = weather_id
	emit_signal("weather_changed", weather_id)

	if _rain_particles:
		_rain_particles.emitting = weather_id in ["rain", "storm"]
		_rain_particles.visible = _rain_particles.emitting
	if _snow_particles:
		_snow_particles.emitting = weather_id == "snow"
		_snow_particles.visible = _snow_particles.emitting

	wetness = 0.85 if weather_id == "storm" else (0.62 if weather_id == "rain" else 0.0)
	snow_cover = 0.75 if weather_id == "snow" else 0.0
	MatKit.apply_weather_response(wetness, snow_cover)
	apply_lighting_phase(current_phase)

func set_campfire_fuel(fuel: float) -> void:
	for fl in _fire_lights:
		fl["fuel"] = clampf(fuel, 0.15, 1.0)

func _build_weather_emitters() -> void:
	_lightning_light = DirectionalLight3D.new()
	_lightning_light.name = "StormLightningFlash"
	_lightning_light.light_color = Color("#cde2ff")
	_lightning_light.light_energy = 0.0
	_lightning_light.rotation = Vector3(deg_to_rad(-65.0), deg_to_rad(30.0), 0.0)
	add_child(_lightning_light)

	# Rain GPUParticles3D
	_rain_particles = GPUParticles3D.new()
	_rain_particles.name = "RainParticles"
	_rain_particles.position = _map_center + Vector3(0.0, 14.0, 0.0)
	_rain_particles.amount = 280
	_rain_particles.lifetime = 1.15
	_rain_particles.emitting = false
	_rain_particles.visible = false
	var rpm := ParticleProcessMaterial.new()
	rpm.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_BOX
	rpm.emission_box_extents = Vector3(24.0, 1.0, 18.0)
	rpm.direction = Vector3(-0.15, -1.0, 0.08)
	rpm.spread = 4.0
	rpm.initial_velocity_min = 16.0
	rpm.initial_velocity_max = 21.0
	_rain_particles.process_material = rpm
	var drop := BoxMesh.new()
	drop.size = Vector3(0.025, 0.42, 0.025)
	var rmat := StandardMaterial3D.new()
	rmat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	rmat.albedo_color = Color(0.75, 0.86, 0.98, 0.42)
	rmat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	drop.material = rmat
	_rain_particles.draw_pass_1 = drop
	add_child(_rain_particles)

	# Snow GPUParticles3D
	_snow_particles = GPUParticles3D.new()
	_snow_particles.name = "SnowParticles"
	_snow_particles.position = _map_center + Vector3(0.0, 13.0, 0.0)
	_snow_particles.amount = 180
	_snow_particles.lifetime = 3.8
	_snow_particles.emitting = false
	_snow_particles.visible = false
	var spm := ParticleProcessMaterial.new()
	spm.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_BOX
	spm.emission_box_extents = Vector3(24.0, 1.0, 18.0)
	spm.direction = Vector3(0.18, -1.0, 0.1)
	spm.spread = 18.0
	spm.initial_velocity_min = 2.6
	spm.initial_velocity_max = 4.0
	_snow_particles.process_material = spm
	var flake := BoxMesh.new()
	flake.size = Vector3(0.09, 0.09, 0.09)
	var smat := StandardMaterial3D.new()
	smat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	smat.albedo_color = Color(0.95, 0.97, 1.0, 0.82)
	smat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	flake.material = smat
	_snow_particles.draw_pass_1 = flake
	add_child(_snow_particles)

func build_campfire(parent: Node3D, pos: Vector3, with_kettle: bool = true, include_base: bool = true) -> Node3D:
	var root := Node3D.new()
	root.name = "CampHearth"
	root.position = pos
	parent.add_child(root)

	var mat_stone := MatKit.make_textured_mat("coastal-rock.png", Color("#6a7074"), 0.88, "rock", Vector3.ONE, false, true)
	var mat_log := MatKit.make_wood_mat(Color("#5b3b24"), false)
	var mat_ember := MatKit.make_glow_mat(Color("#ff6522"), 2.4)
	var mat_iron := MatKit.make_bronze_mat(Color("#2d3136"))
	var mat_soup := MatKit.make_glow_mat(Color("#c96b2b"), 0.85)

	if include_base:
		# Ash bed
		var ash := MeshInstance3D.new()
		var ac := CylinderMesh.new()
		ac.top_radius = 0.56
		ac.bottom_radius = 0.62
		ac.height = 0.08
		ash.mesh = ac
		ash.material_override = mat_stone
		ash.position.y = 0.04
		root.add_child(ash)

		# Ring of 10 stones
		for i in range(10):
			var a := float(i) * TAU / 10.0
			var st := MeshInstance3D.new()
			var sm := SphereMesh.new()
			sm.radius = 0.14
			sm.height = 0.18
			st.mesh = sm
			st.material_override = mat_stone
			st.position = Vector3(cos(a) * 0.56, 0.09, sin(a) * 0.56)
			st.scale = Vector3(1.15, 0.72, 0.92)
			st.rotation.y = a
			root.add_child(st)

		# Crossed logs + glowing ember core
		for i in range(4):
			var lg := MeshInstance3D.new()
			var lm := CylinderMesh.new()
			lm.top_radius = 0.065
			lm.bottom_radius = 0.075
			lm.height = 0.78
			lg.mesh = lm
			lg.material_override = mat_log
			var ang := float(i) * PI * 0.25
			lg.position = Vector3(cos(ang) * 0.06, 0.14, sin(ang) * 0.06)
			lg.rotation = Vector3(cos(ang) * 1.15, ang, sin(ang) * 0.35)
			root.add_child(lg)

		var coals := MeshInstance3D.new()
		var cm := SphereMesh.new()
		cm.radius = 0.24
		cm.height = 0.16
		coals.mesh = cm
		coals.material_override = mat_ember
		coals.position.y = 0.11
		root.add_child(coals)

	# Multi-tongue stylized 3D flame node
	var flame_node := Node3D.new()
	flame_node.name = "FlameCluster"
	flame_node.position = Vector3(0.0, 0.18, 0.0)
	root.add_child(flame_node)
	for idx in range(3):
		var fmesh := MeshInstance3D.new()
		var cone := CylinderMesh.new()
		cone.top_radius = 0.01
		cone.bottom_radius = 0.18 - float(idx) * 0.04
		cone.height = 0.48 - float(idx) * 0.09
		fmesh.mesh = cone
		fmesh.material_override = MatKit.make_glow_mat(
			Color("#ffb347") if idx == 0 else (Color("#ff6a1f") if idx == 1 else Color("#ffe799")),
			2.8 - float(idx) * 0.3
		)
		fmesh.position = Vector3(float(idx - 1) * 0.05, cone.height * 0.45, (float(idx) - 1.0) * 0.03)
		fmesh.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		flame_node.add_child(fmesh)

	# Smoke & ember GPU particles
	var smoke := GPUParticles3D.new()
	smoke.amount = 16
	smoke.lifetime = 2.4
	smoke.position = Vector3(0.0, 0.48, 0.0)
	var sm_pm := ParticleProcessMaterial.new()
	sm_pm.direction = Vector3(0.12, 1.0, -0.05)
	sm_pm.spread = 16.0
	sm_pm.initial_velocity_min = 0.55
	sm_pm.initial_velocity_max = 0.95
	smoke.process_material = sm_pm
	_smoke_materials.append(sm_pm)
	var puffs := SphereMesh.new()
	puffs.radius = 0.14
	puffs.height = 0.24
	var puff_mat := StandardMaterial3D.new()
	puff_mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	puff_mat.albedo_color = Color(0.65, 0.67, 0.72, 0.18)
	puff_mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	puffs.material = puff_mat
	smoke.draw_pass_1 = puffs
	root.add_child(smoke)

	var embers := GPUParticles3D.new()
	embers.amount = 14
	embers.lifetime = 1.6
	embers.position = Vector3(0.0, 0.32, 0.0)
	var em_pm := ParticleProcessMaterial.new()
	em_pm.direction = Vector3(0.0, 1.0, 0.0)
	em_pm.spread = 32.0
	em_pm.initial_velocity_min = 0.85
	em_pm.initial_velocity_max = 1.55
	embers.process_material = em_pm
	var spark := BoxMesh.new()
	spark.size = Vector3(0.035, 0.035, 0.035)
	spark.material = MatKit.make_glow_mat(Color("#ff9d42"), 3.2)
	embers.draw_pass_1 = spark
	root.add_child(embers)

	# Warm campfire light
	var light := OmniLight3D.new()
	light.light_color = Color("#ff9a48")
	light.light_energy = 2.9
	light.omni_range = 14.5
	light.omni_attenuation = 1.3
	light.shadow_enabled = true
	light.shadow_bias = 0.06
	light.shadow_blur = 2.0
	light.position = Vector3(0.0, 0.82, 0.0)
	root.add_child(light)

	_fire_lights.append({
		"light": light,
		"flame_node": flame_node,
		"smoke": smoke,
		"embers": embers,
		"coals_mat": mat_ember,
		"soup_mat": mat_soup,
		"base_energy": 2.8,
		"fuel": 0.82,
		"phase": pos.x * 0.7 + pos.z * 0.4,
	})

	if with_kettle:
		# Tripod + hanging pot + soup + wooden spoons
		for i in range(3):
			var leg := MeshInstance3D.new()
			var lm := CylinderMesh.new()
			lm.top_radius = 0.028
			lm.bottom_radius = 0.034
			lm.height = 1.48
			leg.mesh = lm
			leg.material_override = mat_log
			var a := float(i) * TAU / 3.0 + 0.4
			leg.position = Vector3(cos(a) * 0.34, 0.62, sin(a) * 0.34)
			leg.rotation = Vector3(sin(a) * 0.36, 0.0, -cos(a) * 0.36)
			root.add_child(leg)

		var kettle := MeshInstance3D.new()
		var km := CylinderMesh.new()
		km.top_radius = 0.21
		km.bottom_radius = 0.17
		km.height = 0.24
		kettle.mesh = km
		kettle.material_override = mat_iron
		kettle.position = Vector3(0.0, 0.54, 0.0)
		root.add_child(kettle)

		var soup := MeshInstance3D.new()
		var sm := CylinderMesh.new()
		sm.top_radius = 0.18
		sm.bottom_radius = 0.18
		sm.height = 0.02
		soup.mesh = sm
		soup.material_override = mat_soup
		soup.position = Vector3(0.0, 0.65, 0.0)
		root.add_child(soup)

	_apply_campfire_lit_state(campfire_lit)
	return root

func build_ocean_backdrop(parent: Node3D, bounds_x: float, start_z: float, depth_z: float, water_y: float = -1.2) -> void:
	var ocean := MeshInstance3D.new()
	ocean.name = "OceanWater"
	var pm := PlaneMesh.new()
	pm.size = Vector2(maxf(bounds_x * 3.6, 130.0), depth_z)
	pm.subdivide_width = 44
	pm.subdivide_depth = 28
	ocean.mesh = pm
	ocean.material_override = MatKit.create_water_shader_material(
		Color(0.047, 0.169, 0.231, 0.90),
		Color(0.141, 0.408, 0.459, 0.62),
		Color("#dcf2f6"),
		0.12,
		0.95
	)
	ocean.position = Vector3(bounds_x * 0.5, water_y, start_z + depth_z * 0.5)
	parent.add_child(ocean)

	# Soft lacy shoreline surf wash without harsh rectangular border
	var surf := MeshInstance3D.new()
	surf.name = "BreakingSurfRibbon"
	var sm := PlaneMesh.new()
	sm.size = Vector2(bounds_x * 1.45, 4.2)
	sm.subdivide_width = 24
	surf.mesh = sm
	surf.material_override = MatKit.create_surf_foam_shader_material(Color("#e3f5f8"))
	surf.position = Vector3(bounds_x * 0.5, water_y + 0.06, start_z + 1.8)
	surf.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	surf.set_meta("base_z", start_z + 1.8)
	parent.add_child(surf)
	_surf_meshes.append(surf)

func build_camp_life(parent: Node3D, center: Vector3, count_birds: int = 4, count_insects: int = 12, bird_tint: Color = Color("#eef2f6"), nocturnal_owls: int = 1, orbit_scale: float = 1.0) -> void:
	var wing_tint := bird_tint.darkened(0.24)
	for i in range(count_birds):
		var b_res := FaunaKit.build_bird_node("AmbientBird_%d" % i, bird_tint, wing_tint, 1.24, true)
		var bird: Node3D = b_res["root"]
		var ang := float(i) * 1.85 + 0.35
		var rad := (9.2 + float(i) * 2.4) * orbit_scale
		var arc_c := center + Vector3(cos(float(i)) * 2.6 * orbit_scale, 3.8 + float(i % 3) * 0.75, sin(float(i)) * 2.0 * orbit_scale)
		var b_phases := ["day", "arrival", "dawn"] if i < 2 else ["dawn", "dusk"]
		var v_cyc := 48.0 + float(i) * 6.0
		var v_duty := 0.42
		var offsets: Array[float] = [4.0, 26.0, 11.0, 34.0]
		var v_off: float = offsets[i % 4]
		bird.position = Vector3(arc_c.x + cos(ang) * rad, arc_c.y + sin(ang * 2.1) * 0.65, arc_c.z + sin(ang * 1.2) * rad * 0.62)
		parent.add_child(bird)
		_birds.append({
			"node": bird, "lw": b_res["lw"], "rw": b_res["rw"],
			"center": arc_c, "radius": rad,
			"speed": 0.28 + float(i % 3) * 0.06,
			"phase": ang, "nocturnal": false,
			"phases": b_phases,
			"blocked_weather": ["storm", "snow"] if i == 0 else ["rain", "storm", "snow"],
			"visit_cycle": v_cyc, "visit_duty": v_duty, "visit_offset": v_off,
		})

	for j in range(nocturnal_owls):
		var o_res := FaunaKit.build_bird_node("AmbientOwl_%d" % j, Color("#9e9688"), Color("#635b50"), 1.32, true)
		var owl: Node3D = o_res["root"]
		var ang_o := float(j) * 2.5 + 1.1
		var rad_o := (8.8 + float(j) * 2.5) * orbit_scale
		var arc_o := center + Vector3(0.0, 4.1 + float(j) * 0.8, -1.5 * orbit_scale)
		owl.position = Vector3(arc_o.x + cos(ang_o) * rad_o, arc_o.y, arc_o.z + sin(ang_o * 1.2) * rad_o * 0.62)
		parent.add_child(owl)
		_birds.append({
			"node": owl, "lw": o_res["lw"], "rw": o_res["rw"],
			"center": arc_o, "radius": rad_o,
			"speed": 0.24 + float(j) * 0.05,
			"phase": ang_o, "nocturnal": true,
			"phases": ["night", "dusk"],
			"blocked_weather": ["storm", "rain"],
			"visit_cycle": 56.0, "visit_duty": 0.48, "visit_offset": 8.0 + float(j) * 22.0,
		})
	_sync_sky_wildlife()
	call_deferred("_settle_sky_birds_clear_of_obstacles")

	var imat := MatKit.make_glow_mat(Color("#e8ff85"), 2.4)
	for i in range(count_insects):
		var m := MeshInstance3D.new()
		var bm := BoxMesh.new()
		bm.size = Vector3(0.055, 0.055, 0.055)
		m.mesh = bm
		m.material_override = imat
		parent.add_child(m)
		_insects.append({
			"node": m,
			"center": center + Vector3(randf_range(-11.0, 11.0), randf_range(0.5, 2.1), randf_range(-9.0, 9.0)),
			"phase": randf_range(0.0, TAU),
		})

func _settle_sky_birds_clear_of_obstacles() -> void:
	if not is_inside_tree() or not get_world_3d():
		return
	var space := get_world_3d().direct_space_state
	var root := get_parent()
	if not root:
		return
	var obstacle_aabbs: Array[AABB] = []
	for child in root.find_children("*", "MeshInstance3D", true, false):
		var mi := child as MeshInstance3D
		if not is_instance_valid(mi) or mi.mesh == null or not mi.visible:
			continue
		var low := mi.name.to_lower()
		var p_low := mi.get_parent().name.to_lower() if mi.get_parent() else ""
		if "rock" in low or "cliff" in low or "vault" in low or "roof" in low or "pillar" in low or "crag" in low or "grotto" in low or "overhang" in p_low or "caveroof" in p_low or "cutawayroof" in p_low:
			obstacle_aabbs.append((mi.global_transform * mi.mesh.get_aabb()).grow(0.55))

	var sphere := SphereShape3D.new()
	sphere.radius = 0.55
	var q_shape := PhysicsShapeQueryParameters3D.new()
	q_shape.shape = sphere
	q_shape.collide_with_areas = false
	q_shape.collide_with_bodies = true

	for b in _birds:
		var c: Vector3 = b.get("center", Vector3.ZERO)
		var rad: float = float(b.get("radius", 9.0))
		var ph: float = float(b.get("phase", 0.0))
		for _try in range(16):
			var blocked := false
			for si in range(24):
				var ang := float(si) / 24.0 * TAU + ph
				var pt := Vector3(c.x + cos(ang) * rad, c.y + sin(ang * 2.1) * 0.65, c.z + sin(ang * 1.2) * rad * 0.62)
				if space != null:
					q_shape.transform = Transform3D(Basis.IDENTITY, pt)
					if not space.intersect_shape(q_shape, 1).is_empty():
						blocked = true
						break
				for box in obstacle_aabbs:
					if box.has_point(pt):
						blocked = true
						break
				if blocked:
					break
			if not blocked:
				break
			c.y += 1.05
			c.z += 0.65
		b["center"] = c

func build_biome_ambience(profile: String, bounds_m: Vector2) -> void:
	var gp := GPUParticles3D.new()
	gp.name = "BiomeAmbientParticles_%s" % profile
	var pm := ParticleProcessMaterial.new()
	pm.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_BOX
	var mote := QuadMesh.new()
	var sh := Shader.new()
	sh.code = """
shader_type spatial;
render_mode blend_mix, depth_draw_never, cull_disabled, unshaded;
uniform vec4 tint : source_color = vec4(0.85, 0.92, 0.96, 0.25);
void vertex() {
	MODELVIEW_MATRIX = VIEW_MATRIX * mat4(
		INV_VIEW_MATRIX[0],
		INV_VIEW_MATRIX[1],
		INV_VIEW_MATRIX[2],
		MODEL_MATRIX[3]
	);
	MODELVIEW_MATRIX = MODELVIEW_MATRIX * mat4(
		vec4(length(MODEL_MATRIX[0].xyz), 0.0, 0.0, 0.0),
		vec4(0.0, length(MODEL_MATRIX[1].xyz), 0.0, 0.0),
		vec4(0.0, 0.0, length(MODEL_MATRIX[2].xyz), 0.0),
		vec4(0.0, 0.0, 0.0, 1.0)
	);
}
void fragment() {
	float d = length(UV - vec2(0.5));
	float soft = smoothstep(0.5, 0.02, d);
	ALBEDO = tint.rgb;
	ALPHA = tint.a * soft * soft;
}
"""
	var mat := ShaderMaterial.new()
	mat.shader = sh
	var tint_c := Color(0.85, 0.92, 0.96, 0.25)

	match profile:
		"forest":
			# Drifting sunlit leaves & golden woodland pollen
			gp.amount = 34
			gp.lifetime = 5.2
			gp.position = Vector3(bounds_m.x * 0.5, 4.2, bounds_m.y * 0.5)
			pm.emission_box_extents = Vector3(bounds_m.x * 0.48, 2.2, bounds_m.y * 0.48)
			pm.direction = Vector3(0.28, -0.45, 0.22)
			pm.spread = 35.0
			pm.initial_velocity_min = 0.28
			pm.initial_velocity_max = 0.68
			pm.gravity = Vector3(0.0, -0.06, 0.0)
			mote.size = Vector2(0.09, 0.09)
			tint_c = Color(0.76, 0.85, 0.45, 0.65)
		"wreck-beach":
			# Salty coastal sea-spray mist rising off the breaking surf
			gp.amount = 38
			gp.lifetime = 2.8
			gp.position = Vector3(bounds_m.x * 0.5, 0.95, bounds_m.y * 0.72)
			pm.emission_box_extents = Vector3(bounds_m.x * 0.52, 0.45, 2.8)
			pm.direction = Vector3(-0.32, 0.55, -0.42)
			pm.spread = 28.0
			pm.initial_velocity_min = 0.65
			pm.initial_velocity_max = 1.45
			pm.gravity = Vector3(0.0, -0.15, 0.0)
			mote.size = Vector2(0.42, 0.42)
			tint_c = Color(0.86, 0.93, 0.97, 0.14)
		"cliff-observatory":
			# Exposed highland crosswind mist / spindrift wisps
			gp.amount = 34
			gp.lifetime = 2.6
			gp.position = Vector3(bounds_m.x * 0.5, 1.8, bounds_m.y * 0.46)
			pm.emission_box_extents = Vector3(bounds_m.x * 0.5, 1.4, bounds_m.y * 0.45)
			pm.direction = Vector3(0.85, 0.14, 0.48)
			pm.spread = 16.0
			pm.initial_velocity_min = 1.65
			pm.initial_velocity_max = 2.85
			pm.gravity = Vector3(0.0, 0.02, 0.0)
			mote.size = Vector2(0.55, 0.35)
			tint_c = Color(0.76, 0.86, 0.96, 0.13)
		_:
			# Damp sea-cave humidity spores softly suspended near roof & tidepools
			gp.amount = 26
			gp.lifetime = 4.6
			gp.position = Vector3(bounds_m.x * 0.5, 1.65, bounds_m.y * 0.42)
			pm.emission_box_extents = Vector3(bounds_m.x * 0.42, 1.1, bounds_m.y * 0.36)
			pm.direction = Vector3(0.05, 0.25, 0.12)
			pm.spread = 45.0
			pm.initial_velocity_min = 0.12
			pm.initial_velocity_max = 0.35
			pm.gravity = Vector3(0.0, 0.01, 0.0)
			mote.size = Vector2(0.11, 0.11)
			tint_c = Color(0.75, 0.92, 0.96, 0.36)

	mat.set_shader_parameter("tint", tint_c)
	mote.material = mat
	gp.process_material = pm
	gp.draw_pass_1 = mote
	gp.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(gp)

func register_drip(node: Node3D, y_top: float, y_bot: float, speed: float, phase: float) -> void:
	_drips.append({"node": node, "y_top": y_top, "y_bot": y_bot, "speed": speed, "phase": phase})

func register_aurora(mesh: MeshInstance3D) -> void:
	mesh.set_meta("base_x", mesh.position.x)
	_aurora_meshes.append(mesh)

func register_cloud(node: Node3D, base_x: float, span: float, speed: float) -> void:
	_clouds.append({"node": node, "base_x": base_x, "span": span, "speed": speed})

func register_lantern(light: OmniLight3D, glass_mat: StandardMaterial3D) -> void:
	_lanterns.append({"light": light, "glass_mat": glass_mat})
	var lanterns_lit := (not (current_phase in ["day", "arrival"])) or (current_weather in ["storm", "fog"])
	light.light_energy = 1.05 if lanterns_lit else 0.0
	glass_mat.emission_enabled = lanterns_lit
	glass_mat.emission_energy_multiplier = 1.55 if lanterns_lit else 0.0

func set_smoke_wind(wind_dir: Vector3) -> void:
	for sm_pm in _smoke_materials:
		if is_instance_valid(sm_pm):
			sm_pm.direction = wind_dir.normalized()
