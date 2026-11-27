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
var lighting_profile: String = "default"
var wetness: float = 0.0
var snow_cover: float = 0.0
var reduced_motion: bool = false
var campfire_lit: bool = true
var campfire_state: String = "lit"
var fire_manual_override: String = ""
var _fire_auto_schedule: bool = false
var stoke_timer_s: float = 0.0
var _stoke_duration_s: float = 16.0
var cooking_timer_s: float = 0.0

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
var _crystals: Array[Dictionary] = []
var _smoke_materials: Array[ParticleProcessMaterial] = []
var _ambient_terrain_pockets: Array[Dictionary] = []
var _rain_shelter_rects: Array[Rect2] = []
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
	if not reduced_motion:
		stoke_timer_s = maxf(0.0, stoke_timer_s - delta)
		cooking_timer_s = maxf(0.0, cooking_timer_s - delta) if campfire_lit else 0.0
	var stoke_boost := get_stoke_boost()
	var cook_boil := 1.0 if (campfire_lit and cooking_timer_s > 0.0) else 0.0
	var active_fire_state := get_campfire_state()

	# Campfire & torch warm multi-frequency organic flicker (Paso 12.17-12.19 & Paso 15.14-15.16)
	var day_scale := 0.50 if (current_phase in ["day", "arrival"] and current_weather == "clear") else 1.0
	for fl in _fire_lights:
		var light: OmniLight3D = fl.get("light")
		if not is_instance_valid(light):
			continue
		var fill_light: OmniLight3D = fl.get("fill_light")
		var flame_mesh: Node3D = fl.get("flame_node")
		var smoke: GPUParticles3D = fl.get("smoke")
		var embers: GPUParticles3D = fl.get("embers")
		var steam: GPUParticles3D = fl.get("kettle_steam")
		var bubbles: GPUParticles3D = fl.get("kettle_bubbles")
		var coals_mat: StandardMaterial3D = fl.get("coals_mat")
		var soup_sh := fl.get("soup_shader") as ShaderMaterial
		if active_fire_state == "off":
			light.light_energy = 0.0
			if is_instance_valid(fill_light):
				fill_light.light_energy = 0.0
			if is_instance_valid(flame_mesh):
				flame_mesh.visible = false
			if is_instance_valid(smoke):
				smoke.emitting = false
				smoke.visible = false
			if is_instance_valid(embers):
				embers.emitting = false
				embers.visible = false
			if is_instance_valid(steam):
				steam.emitting = false
				steam.visible = false
			if is_instance_valid(bubbles):
				bubbles.emitting = false
				bubbles.visible = false
			if is_instance_valid(coals_mat):
				coals_mat.emission_enabled = false
				coals_mat.emission_energy_multiplier = 0.0
				coals_mat.albedo_color = Color("#24211f")
			if is_instance_valid(soup_sh):
				soup_sh.set_shader_parameter("lit", 0.0)
				soup_sh.set_shader_parameter("boil", 0.0)
			continue
		var fuel: float = float(fl.get("fuel", 0.78))
		var is_embers := active_fire_state == "embers"
		var state_mult := 0.42 if is_embers else 1.0
		var stoke_e := (1.0 + stoke_boost * 0.52) * state_mult
		var base_e: float = float(fl.get("base_energy", 2.55)) * clampf(0.38 + fuel * 0.88, 0.28, 1.32) * day_scale * stoke_e
		# Non-repeating 4-frequency organic flicker + subtle color warmth & position micro-dance
		var ph := float(fl["phase"])
		var tf := _time * (1.0 + stoke_boost * 0.42)
		var wave := sin(tf * 4.7 + ph) * 0.45 + sin(tf * 8.3 - ph * 1.3) * 0.30 + cos(tf * 13.7 + ph * 0.7) * 0.15 + sin(tf * 21.1 - ph * 1.9) * 0.10
		var pulse := wave * (0.14 if is_embers else 0.24) * day_scale
		light.light_energy = maxf(0.18, base_e + pulse)
		light.light_color = Color("#e05e24").lerp(Color("#ff963d"), 0.5 + 0.5 * wave) if is_embers else Color("#ff8830").lerp(Color("#ffad52"), 0.5 + 0.5 * wave)
		light.omni_range = (8.8 if is_embers else 14.2) + stoke_boost * 3.2
		light.position = Vector3(sin(tf * 5.9 + ph) * 0.018, 0.86 + cos(tf * 7.3) * 0.014, cos(tf * 6.4 - ph) * 0.018)
		if is_instance_valid(fill_light):
			fill_light.light_energy = (0.28 if is_embers else 0.68) * day_scale * (1.0 + stoke_boost * 0.35 + wave * 0.08)
		if is_instance_valid(coals_mat):
			coals_mat.emission_enabled = true
			coals_mat.albedo_color = Color("#cc3f14") if is_embers else Color("#e85a1e")
			coals_mat.emission_energy_multiplier = (1.15 if is_embers else 1.72) + stoke_boost * 0.55 + wave * 0.18
		if is_instance_valid(flame_mesh):
			flame_mesh.visible = true
			var sc := clampf(0.55 + fuel * 0.58, 0.4, 1.15) * (0.48 if is_embers else 1.0)
			var w_sc := sc * (1.0 + stoke_boost * 0.28)
			var h_sc := sc * (0.90 + wave * 0.12) * (1.0 + stoke_boost * 0.36) * (0.55 if is_embers else 1.0)
			flame_mesh.scale = Vector3(w_sc, h_sc, w_sc)
			for f_child in flame_mesh.get_children():
				if f_child is MeshInstance3D and (f_child as MeshInstance3D).material_override is ShaderMaterial:
					((f_child as MeshInstance3D).material_override as ShaderMaterial).set_shader_parameter("stoke", stoke_boost)
		if is_instance_valid(smoke):
			smoke.emitting = true
			smoke.visible = true
			smoke.amount_ratio = clampf((0.20 if is_embers else 0.38) + fuel * 0.22 + stoke_boost * 0.52, 0.16, 1.0)
			var spm := smoke.process_material as ParticleProcessMaterial
			if spm:
				spm.initial_velocity_min = 0.52 + stoke_boost * 0.45
				spm.initial_velocity_max = 0.90 + stoke_boost * 0.70
				spm.scale_max = 1.6 + stoke_boost * 0.85
		if is_instance_valid(embers):
			embers.emitting = true
			embers.visible = true
			embers.amount_ratio = clampf((0.18 if is_embers else 0.35) + fuel * 0.25 + stoke_boost * 0.65, 0.14, 1.0)
		if is_instance_valid(steam):
			steam.emitting = true
			steam.visible = true
			steam.amount_ratio = clampf((0.24 if is_embers else 0.42) + cook_boil * 0.48 + stoke_boost * 0.25, 0.22, 1.0)
		if is_instance_valid(bubbles):
			var bub_on := cook_boil > 0.05 and not is_embers
			bubbles.emitting = bub_on
			bubbles.visible = bub_on
		if is_instance_valid(soup_sh):
			soup_sh.set_shader_parameter("lit", 0.55 if is_embers else 1.0)
			soup_sh.set_shader_parameter("boil", 0.14 if cook_boil <= 0.05 else 0.95)
			soup_sh.set_shader_parameter("stoke", stoke_boost)

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
			var u_orb := clampf(u_c / maxf(0.01, v_duty), 0.0, 1.0)
			var edge_fade := minf(u_orb, 1.0 - u_orb)
			var base_b_sc := float(b.get("base_scale", 1.0))
			var fly_sc := base_b_sc * (1.0 if edge_fade >= 0.07 else clampf(edge_fade / 0.07, 0.08, 1.0))
			node.scale = Vector3.ONE * fly_sc
			var ang := u_orb * TAU + float(b["phase"])
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

	# Evening/night fireflies & insects: subtle organic pinhead bioluminescent blinks (shelter in rain/storm/snow)
	var show_insects := (current_phase in ["dusk", "night"]) and not (current_weather in ["rain", "storm", "snow"])
	for ins in _insects:
		var node: MeshInstance3D = ins.get("node") as MeshInstance3D
		if is_instance_valid(node):
			if not show_insects:
				node.visible = false
				continue
			var c: Vector3 = ins["center"]
			var p := float(ins["phase"])
			var amp_xz := float(ins.get("amp_xz", 1.1))
			var amp_y := float(ins.get("amp_y", 0.25))
			var b_per := float(ins.get("blink_period", 5.6))
			var bu := fmod(maxf(0.0, _time + p * 2.3), b_per) / b_per
			var blink := 0.0
			if bu < 0.34:
				blink = pow(sin((bu / 0.34) * PI), 1.65)
			node.visible = blink > 0.02
			if node.visible:
				node.position = Vector3(
					c.x + sin(_time * 0.95 + p) * amp_xz + cos(_time * 0.35 + p * 0.7) * (amp_xz * 0.35),
					c.y + sin(_time * 1.55 + p * 1.7) * amp_y,
					c.z + cos(_time * 0.80 + p) * amp_xz + sin(_time * 0.31 + p * 1.1) * (amp_xz * 0.35)
				)
				node.set_instance_shader_parameter("blink", blink)
				node.scale = Vector3.ONE * lerpf(0.32, 1.0, blink)

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

	# Cozy subtle warm candle & lantern breath flicker when lit
	var lanterns_lit_now := (not (current_phase in ["day", "arrival"])) or (current_weather in ["rain", "storm", "fog"])
	if not reduced_motion:
		for lan in _lanterns:
			var is_lit_l: bool = lanterns_lit_now or bool(lan.get("always_lit", false))
			if not is_lit_l:
				continue
			var l_node: OmniLight3D = lan.get("light")
			if is_instance_valid(l_node):
				var base_e := float(lan.get("base_energy", 1.05))
				var day_dim := float(lan.get("day_scale", 0.72)) if (current_phase in ["day", "arrival"] and not lanterns_lit_now) else 1.0
				var f_amp := float(lan.get("flicker_amp", 0.06))
				var l_ph := float(lan.get("phase", 0.0))
				var l_wave := 1.0 + sin(_time * 5.6 + l_ph) * f_amp + cos(_time * 11.4 + l_ph) * (f_amp * 0.5)
				l_node.light_energy = maxf(0.05, base_e * day_dim * l_wave)

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
	var sun_yaw := deg_to_rad(-34.0)
	var fog_col := Color("#465564")
	var clear_fog_den := 0.065

	match phase_id:
		"day", "arrival":
			# Paso 15 (15.1-15.7): Crisp warm daylight, rich canopy shadow depth & woodland green-amber bounce (zero greyish wash!)
			sky_top = Color("#2e6394")
			sky_hor = Color("#94bacf")
			amb_col = Color("#5a7462")
			amb_e = 0.72
			sun_col = Color("#fff1d4")
			sun_e = 1.48
			sun_pitch = deg_to_rad(-46.0)
			sun_yaw = deg_to_rad(-36.0)
			fog_col = Color("#6b8578")
			clear_fog_den = 0.055
		"dusk":
			sky_top = Color("#232d52")
			sky_hor = Color("#c87656")
			amb_col = Color("#5f556e")
			amb_e = 0.68
			sun_col = Color("#ff9e5e")
			sun_e = 1.24
			sun_pitch = deg_to_rad(-29.0)
			sun_yaw = deg_to_rad(-44.0)
			fog_col = Color("#544858")
			clear_fog_den = 0.072
		"night":
			# Paso 15 (15.9-15.16): Readable cool silver-blue moonlight on trees/river/trails + warm golden campfire dominance
			sky_top = Color("#0a1526")
			sky_hor = Color("#1e3450")
			amb_col = Color("#2d425c")
			amb_e = 0.64
			sun_col = Color("#88b0e8")
			sun_e = 0.68
			sun_pitch = deg_to_rad(-38.0)
			sun_yaw = deg_to_rad(-28.0)
			fog_col = Color("#152436")
			clear_fog_den = 0.082
		"dawn", "finalization":
			sky_top = Color("#395376")
			sky_hor = Color("#da9c7a")
			amb_col = Color("#636d82")
			amb_e = 0.72
			sun_col = Color("#ffce9e")
			sun_e = 1.26
			sun_pitch = deg_to_rad(-31.0)
			sun_yaw = deg_to_rad(32.0)
			fog_col = Color("#7f757e")
			clear_fog_den = 0.068

	var sky_fill_col := Color("#a8c8b6")
	var sky_fill_e := 0.24
	if phase_id == "night":
		sky_fill_col = Color("#5e82b8")
		sky_fill_e = 0.26
	elif phase_id == "dusk":
		sky_fill_col = Color("#867ea8")
		sky_fill_e = 0.25

	# Profile-specific artistic lighting overrides (NEVER alters frozen "default" / forest / A1!)
	if lighting_profile == "wreck-beach":
		match phase_id:
			"day", "arrival":
				sky_top = Color("#286da8")
				sky_hor = Color("#9cc9df")
				amb_col = Color("#6a869c")
				amb_e = 0.78
				sun_col = Color("#fff4de")
				sun_e = 1.56
				sun_pitch = deg_to_rad(-47.0)
				sun_yaw = deg_to_rad(-38.0)
				fog_col = Color("#8ab0c4")
				clear_fog_den = 0.042
				sky_fill_col = Color("#a4cbe0")
				sky_fill_e = 0.28
			"dusk":
				# Balanced golden lateral coastal sunset (zero uniform brick-orange wash!)
				sky_top = Color("#24395e")
				sky_hor = Color("#d89a72")
				amb_col = Color("#6a7694")
				amb_e = 0.72
				sun_col = Color("#ffc486")
				sun_e = 1.30
				sun_pitch = deg_to_rad(-21.0)
				sun_yaw = deg_to_rad(-54.0)
				fog_col = Color("#6f7486")
				clear_fog_den = 0.056
				sky_fill_col = Color("#829cc2")
				sky_fill_e = 0.30
			"night":
				sky_top = Color("#0b182c")
				sky_hor = Color("#213a5a")
				amb_col = Color("#304968")
				amb_e = 0.64
				sun_col = Color("#94bef0")
				sun_e = 0.74
				sun_pitch = deg_to_rad(-36.0)
				sun_yaw = deg_to_rad(-30.0)
				fog_col = Color("#182c44")
				clear_fog_den = 0.068
				sky_fill_col = Color("#648cc2")
				sky_fill_e = 0.30
			"dawn", "finalization":
				sky_top = Color("#3b5d86")
				sky_hor = Color("#e2b08e")
				amb_col = Color("#6e7e94")
				amb_e = 0.74
				sun_col = Color("#ffd8b0")
				sun_e = 1.32
				sun_pitch = deg_to_rad(-26.0)
				sun_yaw = deg_to_rad(36.0)
				fog_col = Color("#848d9a")
				clear_fog_den = 0.055
				sky_fill_col = Color("#96b2cc")
				sky_fill_e = 0.28
	elif lighting_profile == "cliff-observatory":
		match phase_id:
			"day", "arrival":
				sky_top = Color("#2b5e90")
				sky_hor = Color("#98bcd2")
				amb_col = Color("#667e96")
				amb_e = 0.78
				sun_col = Color("#fff3dd")
				sun_e = 1.56
				sun_pitch = deg_to_rad(-38.0)
				sun_yaw = deg_to_rad(-48.0)
				fog_col = Color("#7c9cb2")
				clear_fog_den = 0.058
				sky_fill_col = Color("#9ec0d8")
				sky_fill_e = 0.30
			"dusk":
				sky_top = Color("#212f54")
				sky_hor = Color("#dc926c")
				amb_col = Color("#606c8e")
				amb_e = 0.72
				sun_col = Color("#ffba7c")
				sun_e = 1.34
				sun_pitch = deg_to_rad(-19.0)
				sun_yaw = deg_to_rad(-58.0)
				fog_col = Color("#666c86")
				clear_fog_den = 0.066
				sky_fill_col = Color("#8298c4")
				sky_fill_e = 0.32
			"night":
				sky_top = Color("#0c1830")
				sky_hor = Color("#253e62")
				amb_col = Color("#334c6e")
				amb_e = 0.70
				sun_col = Color("#9cc6f8")
				sun_e = 0.80
				sun_pitch = deg_to_rad(-34.0)
				sun_yaw = deg_to_rad(-34.0)
				fog_col = Color("#1d324c")
				clear_fog_den = 0.072
				sky_fill_col = Color("#6b94ca")
				sky_fill_e = 0.34
			"dawn", "finalization":
				sky_top = Color("#38547c")
				sky_hor = Color("#dfa888")
				amb_col = Color("#6c7892")
				amb_e = 0.75
				sun_col = Color("#ffd4a8")
				sun_e = 1.32
				sun_pitch = deg_to_rad(-24.0)
				sun_yaw = deg_to_rad(38.0)
				fog_col = Color("#7e889c")
				clear_fog_den = 0.062
				sky_fill_col = Color("#94aec8")
				sky_fill_e = 0.30
	elif lighting_profile == "coastal-refuge":
		match phase_id:
			"day", "arrival":
				sky_top = Color("#2869a0")
				sky_hor = Color("#98c4da")
				amb_col = Color("#637e90")
				amb_e = 0.74
				sun_col = Color("#fff2da")
				sun_e = 1.54
				sun_pitch = deg_to_rad(-46.0)
				sun_yaw = deg_to_rad(-34.0)
				fog_col = Color("#82a6ba")
				clear_fog_den = 0.048
				sky_fill_col = Color("#9ac0d6")
				sky_fill_e = 0.26
			"dusk":
				sky_top = Color("#223458")
				sky_hor = Color("#d4926c")
				amb_col = Color("#5d6c88")
				amb_e = 0.68
				sun_col = Color("#ffbe82")
				sun_e = 1.28
				sun_pitch = deg_to_rad(-22.0)
				sun_yaw = deg_to_rad(-50.0)
				fog_col = Color("#646c80")
				clear_fog_den = 0.058
				sky_fill_col = Color("#7e96bc")
				sky_fill_e = 0.28
			"night":
				sky_top = Color("#0b1628")
				sky_hor = Color("#1e3654")
				amb_col = Color("#2c4460")
				amb_e = 0.60
				sun_col = Color("#90baf0")
				sun_e = 0.72
				sun_pitch = deg_to_rad(-36.0)
				sun_yaw = deg_to_rad(-28.0)
				fog_col = Color("#172a40")
				clear_fog_den = 0.068
				sky_fill_col = Color("#6088bc")
				sky_fill_e = 0.28
			"dawn", "finalization":
				sky_top = Color("#3a5980")
				sky_hor = Color("#dfa888")
				amb_col = Color("#6a7a90")
				amb_e = 0.72
				sun_col = Color("#ffd6ae")
				sun_e = 1.30
				sun_pitch = deg_to_rad(-28.0)
				sun_yaw = deg_to_rad(34.0)
				fog_col = Color("#808a98")
				clear_fog_den = 0.056
				sky_fill_col = Color("#94aec6")
				sky_fill_e = 0.26

	if world_env and world_env.environment:
		var env := world_env.environment
		env.ambient_light_color = amb_col
		env.ambient_light_energy = amb_e
		env.tonemap_exposure = 1.02 if phase_id == "night" else (1.04 if phase_id in ["dusk", "dawn", "finalization"] else 1.05)
		env.fog_mode = Environment.FOG_MODE_DEPTH
		env.fog_depth_curve = 1.15
		env.fog_aerial_perspective = 0.0
		env.fog_light_color = fog_col
		match current_weather:
			"fog":
				env.fog_enabled = true
				env.fog_depth_begin = 36.0
				env.fog_depth_end = 130.0
				env.fog_density = 0.34
			"storm":
				env.fog_enabled = true
				env.fog_depth_begin = 50.0
				env.fog_depth_end = 155.0
				env.fog_density = 0.24
			"rain":
				env.fog_enabled = true
				env.fog_depth_begin = 58.0
				env.fog_depth_end = 175.0
				env.fog_density = 0.18
			"snow":
				env.fog_enabled = true
				env.fog_depth_begin = 54.0
				env.fog_depth_end = 165.0
				env.fog_density = 0.20
			_:
				# Far horizon depth blend starting well beyond the playable clearing (78m..215m) so daytime colors stay vivid
				env.fog_enabled = true
				env.fog_depth_begin = 78.0
				env.fog_depth_end = 215.0
				env.fog_density = clear_fog_den
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
		sun_light.rotation.y = sun_yaw
	if is_instance_valid(_sky_fill_light):
		_sky_fill_light.light_color = sky_fill_col
		_sky_fill_light.light_energy = sky_fill_e

	# Daylight lantern policy: exterior portable lanterns stay OFF in bright clear day; sheltered cave interior lanterns may stay softly lit
	var lanterns_lit := (not (phase_id in ["day", "arrival"])) or (current_weather in ["rain", "storm", "fog"])
	for lan in _lanterns:
		var l_node: OmniLight3D = lan.get("light")
		var g_mat: StandardMaterial3D = lan.get("glass_mat")
		var base_e := float(lan.get("base_energy", 1.05))
		var emit_e := float(lan.get("emit_energy", 1.55))
		var always_lit := bool(lan.get("always_lit", false))
		var lit_this := lanterns_lit or always_lit
		var day_scale_l := float(lan.get("day_scale", 0.72)) if (always_lit and not lanterns_lit) else 1.0
		if is_instance_valid(l_node):
			l_node.light_energy = (base_e * day_scale_l) if lit_this else 0.0
		if is_instance_valid(g_mat):
			g_mat.emission_enabled = lit_this
			g_mat.emission_energy_multiplier = (emit_e * day_scale_l) if lit_this else 0.0

	# Phase-modulated arcane crystals (translucent mineral quartz by day, rich localized cyan glow at dusk/night!)
	var cry_mult := 1.0 if phase_id == "night" else (0.58 if phase_id in ["dusk", "dawn", "finalization"] else 0.0)
	for cr in _crystals:
		var c_light: OmniLight3D = cr.get("light")
		var c_mat: StandardMaterial3D = cr.get("mat")
		if is_instance_valid(c_light):
			var c_e := float(cr.get("night_energy", 0.95)) * cry_mult
			c_light.light_energy = c_e
			c_light.visible = c_e > 0.04
		if is_instance_valid(c_mat):
			c_mat.emission_energy_multiplier = lerpf(float(cr.get("day_emit", 0.16)), float(cr.get("night_emit", 1.55)), cry_mult)
	if is_inside_tree():
		for nf in get_tree().get_nodes_in_group("night_flame"):
			if nf is Node3D and is_instance_valid(nf):
				(nf as Node3D).visible = lanterns_lit

	# Night-only automatic campfire schedule for exterior camps (unless character manually toggled)
	if _fire_auto_schedule:
		if fire_manual_override == "on":
			_apply_campfire_lit_state(true)
		elif fire_manual_override == "off":
			_apply_campfire_lit_state(false)
		else:
			_apply_campfire_lit_state(not (phase_id in ["day", "arrival"]))

	_sync_sky_wildlife()

## Smooth progressive transition between lighting phases (Paso 15.8)
func transition_to_lighting_phase(phase_id: String, duration: float = 0.55) -> void:
	if duration <= 0.01 or not is_inside_tree() or reduced_motion:
		apply_lighting_phase(phase_id)
		return
	var prev_sun_col := sun_light.light_color if is_instance_valid(sun_light) else Color.WHITE
	var prev_sun_e := sun_light.light_energy if is_instance_valid(sun_light) else 1.0
	var env := world_env.environment if (world_env and world_env.environment) else null
	var prev_amb_col := env.ambient_light_color if env else Color.WHITE
	var prev_amb_e := env.ambient_light_energy if env else 0.7
	apply_lighting_phase(phase_id)
	var target_sun_col := sun_light.light_color if is_instance_valid(sun_light) else Color.WHITE
	var target_sun_e := sun_light.light_energy if is_instance_valid(sun_light) else 1.0
	var target_amb_col := env.ambient_light_color if env else Color.WHITE
	var target_amb_e := env.ambient_light_energy if env else 0.7
	if is_instance_valid(sun_light):
		sun_light.light_color = prev_sun_col
		sun_light.light_energy = prev_sun_e
	if env:
		env.ambient_light_color = prev_amb_col
		env.ambient_light_energy = prev_amb_e
	var tw := create_tween()
	tw.set_parallel(true)
	if is_instance_valid(sun_light):
		tw.tween_property(sun_light, "light_color", target_sun_col, duration)
		tw.tween_property(sun_light, "light_energy", target_sun_e, duration)
	if env:
		tw.tween_property(env, "ambient_light_color", target_amb_col, duration)
		tw.tween_property(env, "ambient_light_energy", target_amb_e, duration)

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

func get_stoke_boost() -> float:
	if stoke_timer_s <= 0.0:
		return 0.0
	var t := clampf(stoke_timer_s / maxf(1.0, _stoke_duration_s), 0.0, 1.0)
	return pow(t, 0.72)

func stoke_campfire(duration_s: float = 16.0) -> void:
	campfire_state = "lit"
	if not campfire_lit:
		set_campfire_lit(true, true)
	_stoke_duration_s = maxf(2.0, duration_s)
	stoke_timer_s = _stoke_duration_s

func start_kettle_cooking(duration_s: float = 45.0) -> void:
	if not campfire_lit:
		set_campfire_lit(true, true)
	cooking_timer_s = maxf(cooking_timer_s, duration_s)

func is_kettle_cooking() -> bool:
	return campfire_lit and cooking_timer_s > 0.0

func set_campfire_auto_by_phase(enabled: bool) -> void:
	_fire_auto_schedule = enabled
	if _fire_auto_schedule and fire_manual_override == "":
		_apply_campfire_lit_state(not (current_phase in ["day", "arrival"]))

func get_campfire_state() -> String:
	if not campfire_lit:
		return "off"
	var avg_fuel := 0.80
	if not _fire_lights.is_empty():
		avg_fuel = float(_fire_lights[0].get("fuel", 0.80))
	if campfire_state == "embers" or (avg_fuel < 0.28 and stoke_timer_s <= 0.0):
		return "embers"
	return "lit"

func set_campfire_state(state_id: String, manual: bool = true) -> String:
	var norm := state_id.to_lower()
	if norm == "off":
		campfire_state = "off"
		set_campfire_lit(false, manual)
	elif norm == "embers":
		campfire_state = "embers"
		set_campfire_fuel(0.22)
		set_campfire_lit(true, manual)
	else:
		campfire_state = "lit"
		if not _fire_lights.is_empty() and float(_fire_lights[0].get("fuel", 0.80)) < 0.30:
			set_campfire_fuel(0.82)
		set_campfire_lit(true, manual)
	return get_campfire_state()

func set_campfire_lit(lit: bool, manual: bool = true) -> bool:
	if manual:
		fire_manual_override = "on" if lit else "off"
	if lit and campfire_state == "off":
		campfire_state = "lit"
	elif not lit:
		campfire_state = "off"
	_apply_campfire_lit_state(lit)
	return campfire_lit

func _apply_campfire_lit_state(lit: bool) -> void:
	campfire_lit = lit
	var cur_st := get_campfire_state()
	var is_embers := cur_st == "embers"
	for fl in _fire_lights:
		var light: OmniLight3D = fl.get("light")
		var fill_light: OmniLight3D = fl.get("fill_light")
		var flame_node: Node3D = fl.get("flame_node")
		var smoke: GPUParticles3D = fl.get("smoke")
		var embers: GPUParticles3D = fl.get("embers")
		var steam: GPUParticles3D = fl.get("kettle_steam")
		var bubbles: GPUParticles3D = fl.get("kettle_bubbles")
		var coals_mat: StandardMaterial3D = fl.get("coals_mat")
		var soup_sh := fl.get("soup_shader") as ShaderMaterial
		if is_instance_valid(flame_node):
			flame_node.visible = lit
			if lit:
				var sc_e := 0.45 if is_embers else 1.0
				flame_node.scale = Vector3(sc_e, sc_e * (0.55 if is_embers else 1.0), sc_e)
		if is_instance_valid(smoke):
			smoke.emitting = lit
			smoke.visible = lit
		if is_instance_valid(embers):
			embers.emitting = lit
			embers.visible = lit
		if is_instance_valid(steam):
			steam.emitting = lit
			steam.visible = lit
		if is_instance_valid(bubbles):
			var bub_on := lit and (not is_embers) and cooking_timer_s > 0.0
			bubbles.emitting = bub_on
			bubbles.visible = bub_on
		if is_instance_valid(coals_mat):
			coals_mat.emission_enabled = lit
			coals_mat.emission_energy_multiplier = (1.15 if is_embers else 1.68) if lit else 0.0
			coals_mat.albedo_color = (Color("#cc3f14") if is_embers else Color("#e4561b")) if lit else Color("#24211f")
		if is_instance_valid(soup_sh):
			soup_sh.set_shader_parameter("lit", (0.55 if is_embers else 1.0) if lit else 0.0)
			soup_sh.set_shader_parameter("boil", (0.95 if cooking_timer_s > 0.0 else 0.14) if lit else 0.0)
		if is_instance_valid(light):
			if lit:
				var fuel: float = float(fl.get("fuel", 0.8))
				var e_mult := 0.42 if is_embers else 1.0
				light.light_energy = float(fl.get("base_energy", 2.55)) * clampf(0.38 + fuel * 0.88, 0.28, 1.32) * e_mult
			else:
				light.light_energy = 0.0
		if is_instance_valid(fill_light):
			fill_light.light_energy = (0.28 if is_embers else 0.68) if lit else 0.0
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
	var clamped := clampf(fuel, 0.12, 1.0)
	for fl in _fire_lights:
		fl["fuel"] = clamped
	if campfire_lit:
		campfire_state = "embers" if clamped < 0.28 else "lit"

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

	# Snow GPUParticles3D (Paso 17.12: soft radial billboard flakes, zero white squares!)
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
	var flake := QuadMesh.new()
	flake.size = Vector2(0.10, 0.10)
	var smat := StandardMaterial3D.new()
	smat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	smat.billboard_mode = BaseMaterial3D.BILLBOARD_PARTICLES
	smat.depth_draw_mode = BaseMaterial3D.DEPTH_DRAW_DISABLED
	smat.albedo_texture = _create_soft_radial_tex(Color(0.96, 0.98, 1.0, 0.88), Color(0.96, 0.98, 1.0, 0.0), 16)
	smat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	flake.material = smat
	_snow_particles.draw_pass_1 = flake
	add_child(_snow_particles)

func _create_soft_radial_tex(inner_col: Color, outer_col: Color, sz: int = 32) -> Texture2D:
	var grad := Gradient.new()
	grad.set_color(0, inner_col)
	grad.set_color(1, outer_col)
	var gt := GradientTexture2D.new()
	gt.gradient = grad
	gt.fill = GradientTexture2D.FILL_RADIAL
	gt.fill_from = Vector2(0.5, 0.5)
	gt.fill_to = Vector2(0.95, 0.5)
	gt.width = sz
	gt.height = sz
	return gt

func _create_flame_shader_material() -> ShaderMaterial:
	var sh := Shader.new()
	sh.code = """
shader_type spatial;
render_mode blend_add, depth_draw_never, cull_disabled, unshaded;

uniform float phase = 0.0;
uniform float stoke = 0.0;

float hash21(vec2 p) {
	p = fract(p * vec2(127.1, 311.7));
	p += dot(p, p + 41.3);
	return fract(p.x * p.y);
}
float vnoise(vec2 p) {
	vec2 i = floor(p); vec2 f = fract(p);
	f = f * f * (3.0 - 2.0 * f);
	return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
	           mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x), f.y);
}
void fragment() {
	float t = TIME * (3.6 + stoke * 1.7) + phase;
	float cx = (UV.x - 0.5) * 2.0;
	float h = 1.0 - UV.y;
	float sway_a = sin(h * 5.4 - t * 1.45 + UV.x * 2.8) * (0.20 + stoke * 0.09) * h;
	float sway_b = cos(h * 7.8 - t * 2.10 - UV.x * 3.4) * (0.14 + stoke * 0.07) * h;
	float n = vnoise(vec2(cx * 2.5, h * 3.4 - t)) * 0.65 + vnoise(vec2(cx * 5.2 + 1.7, h * 6.1 - t * 1.4)) * 0.35;
	// Dual asymmetric flame tongues for irregular organic silhouette (Paso 12.10)
	float t_main = exp(-pow((cx + sway_a + (n - 0.5) * 0.30) * mix(1.50, 3.8, h), 2.0));
	float t_side = exp(-pow((cx - 0.24 * sin(phase) + sway_b + (n - 0.5) * 0.25) * mix(2.1, 4.6, h), 2.0)) * (1.0 - smoothstep(0.35, 0.82, h));
	float tongue = max(t_main, t_side * 0.82);
	float body = tongue * smoothstep(0.0, 0.14, h) * (1.0 - smoothstep(0.42, 0.98, h + n * 0.24));
	// Warm amber-gold-crimson fire palette without harsh white blow-out (Paso 12.11)
	vec3 col_core = vec3(1.0, 0.72, 0.24);
	vec3 col_mid = vec3(0.95, 0.36, 0.07);
	vec3 col_tip = vec3(0.68, 0.12, 0.02);
	vec3 col = mix(col_core, col_mid, smoothstep(0.12, 0.52, h));
	col = mix(col, col_tip, smoothstep(0.48, 0.88, h));
	ALBEDO = col * (1.04 + stoke * 0.24);
	ALPHA = clamp(body * (0.74 + stoke * 0.15), 0.0, 0.82);
}
"""
	var sm := ShaderMaterial.new()
	sm.shader = sh
	sm.set_shader_parameter("phase", randf_range(0.0, 6.28))
	return sm

func _create_kettle_soup_shader() -> ShaderMaterial:
	var sh := Shader.new()
	sh.code = """
shader_type spatial;
render_mode blend_mix, depth_draw_opaque, cull_back, specular_schlick_ggx;

uniform float lit = 1.0;
uniform float boil = 0.14;
uniform float stoke = 0.0;

float hash21(vec2 p) {
	p = fract(p * vec2(127.1, 311.7));
	p += dot(p, p + 34.56);
	return fract(p.x * p.y);
}
float vnoise(vec2 p) {
	vec2 i = floor(p); vec2 f = fract(p);
	f = f * f * (3.0 - 2.0 * f);
	return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
	           mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x), f.y);
}

void fragment() {
	vec2 uv = (UV - 0.5) * 2.0;
	float r = length(uv);
	float t = TIME * mix(0.6, 2.8, boil);
	float conv = vnoise(uv * 3.8 + vec2(t * 0.35, -t * 0.25));
	// Layered expanding boiling bubbles concentrated toward warmer pot center
	float bubble_mask = 0.0;
	float bubble_rim = 0.0;
	for (int k = 0; k < 6; k++) {
		float fk = float(k);
		vec2 cell_uv = uv * (4.2 + fk * 0.85) + vec2(fk * 3.1, -fk * 2.4);
		vec2 id = floor(cell_uv);
		vec2 lc = fract(cell_uv) - 0.5;
		float rnd = hash21(id + vec2(fk * 11.7, fk * 5.3));
		vec2 ctr = (vec2(fract(rnd * 17.3), fract(rnd * 31.7)) - 0.5) * 0.45;
		float life = fract(t * (0.45 + rnd * 0.55) + rnd * 6.28);
		float max_rad = mix(0.06, 0.28, clamp(boil * (1.05 - r * 0.55), 0.0, 1.0));
		float b_r = life * max_rad;
		float d = length(lc - ctr);
		float dome = smoothstep(b_r, b_r * 0.35, d) * sin(life * 3.14159);
		float pop_ring = smoothstep(0.05, 0.0, abs(d - b_r)) * smoothstep(0.55, 0.95, life) * (1.0 - smoothstep(0.92, 1.0, life));
		bubble_mask = max(bubble_mask, dome * smoothstep(0.18, 0.72, boil));
		bubble_rim = max(bubble_rim, pop_ring * smoothstep(0.25, 0.85, boil));
	}
	vec3 cold_stew = vec3(0.24, 0.16, 0.10);
	vec3 hot_stew = mix(vec3(0.48, 0.22, 0.09), vec3(0.72, 0.40, 0.15), conv);
	vec3 col = mix(cold_stew, hot_stew, lit);
	vec3 foam = vec3(0.92, 0.80, 0.58);
	col = mix(col, foam * 0.82, bubble_mask * 0.42);
	col = mix(col, foam, bubble_rim * 0.75);
	ALBEDO = col;
	ROUGHNESS = mix(0.52, 0.10, lit);
	SPECULAR = mix(0.35, 0.85, lit);
	EMISSION = col * lit * (0.28 + boil * 0.18 + stoke * 0.15 + bubble_rim * 0.22);
}
"""
	var mat := ShaderMaterial.new()
	mat.shader = sh
	return mat

func build_campfire(parent: Node3D, pos: Vector3, with_kettle: bool = true, include_base: bool = true) -> Node3D:
	var root := Node3D.new()
	root.name = "CampHearth"
	root.position = pos
	parent.add_child(root)

	var mat_stone := MatKit.make_textured_mat("coastal-rock.png", Color("#565a59"), 0.90, "rock", Vector3.ONE, false, true)
	var mat_soot_stone := MatKit.make_textured_mat("coastal-rock.png", Color("#3d3a37"), 0.94, "rock", Vector3.ONE, false, true)
	var mat_ash := MatKit.make_textured_mat("earth.webp", Color("#25211e"), 0.96, "rock", Vector3(2.2, 2.2, 2.2), false, true)
	var mat_log := MatKit.make_wood_mat(Color("#543822"), false)
	var mat_char := MatKit.make_wood_mat(Color("#231914"), false)
	var mat_rope := MatKit.make_cloth_mat(Color("#9e8860"), true, true)
	var mat_ember := MatKit.make_glow_mat(Color("#e4561b"), 1.65)
	var mat_iron := MatKit.make_bronze_mat(Color("#292c30"))
	var mat_soup: ShaderMaterial = _create_kettle_soup_shader() if with_kettle else null

	# Contact shadow decal under firewood, cauldron and tripod base (Paso 12.13)
	var ao_mi := MeshInstance3D.new()
	ao_mi.name = "CampfireContactAO"
	var ao_pm := PlaneMesh.new(); ao_pm.size = Vector2(1.52, 1.52)
	ao_mi.mesh = ao_pm
	var ao_mat := StandardMaterial3D.new()
	ao_mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	ao_mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	ao_mat.depth_draw_mode = BaseMaterial3D.DEPTH_DRAW_DISABLED
	ao_mat.albedo_texture = _create_soft_radial_tex(Color(0.02, 0.02, 0.02, 0.72), Color(0.02, 0.02, 0.02, 0.0), 64)
	ao_mi.material_override = ao_mat
	ao_mi.position = Vector3(0.0, 0.008, 0.0)
	ao_mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	root.add_child(ao_mi)

	if include_base:
		# Soot-darkened ash hearth bed
		var ash := MeshInstance3D.new()
		ash.name = "AshHearthBed"
		var ac := CylinderMesh.new()
		ac.top_radius = 0.56
		ac.bottom_radius = 0.68
		ac.height = 0.042
		ash.mesh = ac
		ash.material_override = mat_ash
		ash.position.y = 0.02
		root.add_child(ash)

		# 11 irregular non-repeating fire-blackened inner hearth stones (Paso 12.12)
		for i in range(11):
			var a := float(i) * TAU / 11.0 + sin(float(i) * 2.3 + 0.4) * 0.19
			var r_stone := 0.49 + cos(float(i) * 1.9) * 0.065
			var st := MeshInstance3D.new()
			st.name = "HearthStone_%d" % i
			var sm := SphereMesh.new()
			sm.radius = 0.11 + fmod(float(i) * 0.029, 0.055)
			sm.height = 0.13 + fmod(float(i) * 0.021, 0.045)
			sm.radial_segments = 5 + (i % 3)
			sm.rings = 2 + (i % 2)
			st.mesh = sm
			st.material_override = mat_soot_stone if (i % 2 == 0) else mat_stone
			st.position = Vector3(cos(a) * r_stone, 0.048 + fmod(float(i) * 0.011, 0.025), sin(a) * r_stone)
			st.scale = Vector3(
				1.05 + fmod(float(i) * 0.17, 0.42),
				0.54 + fmod(float(i) * 0.13, 0.28),
				0.82 + fmod(float(i) * 0.19, 0.36)
			)
			st.rotation = Vector3(sin(float(i) * 1.7) * 0.22, a + float(i) * 0.35, cos(float(i) * 1.3) * 0.18)
			root.add_child(st)

		# 6 partially charred firewood logs with glowing ember fissures where they meet (Paso 12.8 & 12.9)
		for i in range(6):
			var ang := float(i) * (TAU / 6.0) + 0.16 + sin(float(i) * 1.8) * 0.12
			var tilt_rot := Vector3(cos(ang) * 1.26, ang, sin(ang) * 0.32)
			var log_len := 0.58 + fmod(float(i) * 0.07, 0.16)
			var rad_b := 0.048 + fmod(float(i) * 0.011, 0.022)
			var lg := MeshInstance3D.new()
			lg.name = "CampfireLog_%d" % i
			var lm := CylinderMesh.new()
			lm.top_radius = rad_b * 0.78; lm.bottom_radius = rad_b; lm.height = log_len; lm.radial_segments = 7
			lg.mesh = lm; lg.material_override = mat_log
			lg.position = Vector3(cos(ang) * 0.18, 0.105 + float(i % 2) * 0.018, sin(ang) * 0.18)
			lg.rotation = tilt_rot
			root.add_child(lg)

			var char_tip := MeshInstance3D.new()
			char_tip.name = "CharredLogSection_%d" % i
			var cm_t := CylinderMesh.new()
			cm_t.top_radius = rad_b * 0.64; cm_t.bottom_radius = rad_b * 0.84; cm_t.height = log_len * 0.48; cm_t.radial_segments = 7
			char_tip.mesh = cm_t; char_tip.material_override = mat_char
			char_tip.position = Vector3(cos(ang) * 0.04, 0.115 + float(i % 2) * 0.015, sin(ang) * 0.04)
			char_tip.rotation = tilt_rot
			root.add_child(char_tip)

			var fissure := MeshInstance3D.new()
			fissure.name = "LogEmberFissure_%d" % i
			var fm_e := CylinderMesh.new()
			fm_e.top_radius = rad_b * 0.38; fm_e.bottom_radius = rad_b * 0.48; fm_e.height = 0.16; fm_e.radial_segments = 6
			fissure.mesh = fm_e; fissure.material_override = mat_ember
			fissure.position = Vector3(cos(ang) * 0.055, 0.10 + float(i % 2) * 0.012, sin(ang) * 0.055)
			fissure.rotation = tilt_rot
			root.add_child(fissure)

		# Sculpted bed of 7 irregular glowing coals nestled between the logs (Paso 12.9)
		for c_i in range(7):
			var ca := float(c_i) * (TAU / 6.0) + 0.32
			var cr := 0.0 if c_i == 0 else (0.11 + float(c_i % 2) * 0.07)
			var coals := MeshInstance3D.new()
			coals.name = "GlowingCoal_%d" % c_i
			var cm := SphereMesh.new()
			cm.radius = 0.16 if c_i == 0 else (0.075 + fmod(float(c_i) * 0.019, 0.035))
			cm.height = 0.085 if c_i == 0 else 0.065
			cm.radial_segments = 5; cm.rings = 2
			coals.mesh = cm; coals.material_override = mat_ember
			coals.position = Vector3(cos(ca) * cr, 0.058, sin(ca) * cr)
			coals.scale = Vector3(1.15, 0.72, 0.92)
			coals.rotation.y = ca * 1.3
			root.add_child(coals)

	# 5 asymmetric multi-height shader-driven flame blades (Paso 12.10: irregular heights & silhouettes!)
	var flame_node := Node3D.new()
	flame_node.name = "FlameCluster"
	flame_node.position = Vector3(0.0, 0.12, 0.0)
	root.add_child(flame_node)
	var flame_defs := [
		[Vector2(0.46, 0.42), Vector3(0.0, 0.17, 0.0), 0.0],
		[Vector2(0.38, 0.35), Vector3(0.06, 0.14, -0.04), 1.05],
		[Vector2(0.34, 0.31), Vector3(-0.07, 0.13, 0.05), 2.15],
		[Vector2(0.28, 0.26), Vector3(0.08, 0.11, 0.07), 0.55],
		[Vector2(0.30, 0.28), Vector3(-0.06, 0.12, -0.07), 2.65],
	]
	for idx in range(flame_defs.size()):
		var fd: Array = flame_defs[idx]
		var fmesh := MeshInstance3D.new()
		fmesh.name = "FlameBlade_%d" % idx
		var qm := QuadMesh.new()
		qm.size = fd[0] as Vector2
		fmesh.mesh = qm
		var fmat := _create_flame_shader_material()
		fmat.set_shader_parameter("phase", float(idx) * 1.37 + 0.4)
		fmesh.material_override = fmat
		fmesh.position = fd[1] as Vector3
		fmesh.rotation.y = float(fd[2])
		fmesh.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		flame_node.add_child(fmesh)

	# Annular combustion wood-smoke drafting around the outside of the cauldron (Paso 12.14 & 12.21: zero pot clipping!)
	var smoke := GPUParticles3D.new()
	smoke.name = "CampfireSmokeParticles"
	smoke.amount = 32
	smoke.amount_ratio = 0.44
	smoke.lifetime = 2.8
	smoke.position = Vector3(0.0, 0.46, 0.0)
	var sm_pm := ParticleProcessMaterial.new()
	sm_pm.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_RING
	sm_pm.emission_ring_axis = Vector3(0.0, 1.0, 0.0)
	sm_pm.emission_ring_height = 0.04
	sm_pm.emission_ring_radius = 0.24 if with_kettle else 0.14
	sm_pm.emission_ring_inner_radius = 0.185 if with_kettle else 0.04
	sm_pm.direction = Vector3(0.12, 1.0, -0.06)
	sm_pm.spread = 18.0
	sm_pm.initial_velocity_min = 0.50
	sm_pm.initial_velocity_max = 0.88
	sm_pm.gravity = Vector3(0.0, 0.12, 0.0)
	sm_pm.scale_min = 0.82
	sm_pm.scale_max = 1.58
	sm_pm.turbulence_enabled = true
	sm_pm.turbulence_noise_strength = 0.35
	var sm_grad := Gradient.new()
	sm_grad.offsets = PackedFloat32Array([0.0, 0.22, 0.72, 1.0])
	sm_grad.colors = PackedColorArray([Color(0.58, 0.56, 0.55, 0.0), Color(0.58, 0.56, 0.55, 0.30), Color(0.66, 0.66, 0.68, 0.16), Color(0.70, 0.72, 0.75, 0.0)])
	var sm_ramp := GradientTexture1D.new(); sm_ramp.gradient = sm_grad
	sm_pm.color_ramp = sm_ramp
	smoke.process_material = sm_pm
	_smoke_materials.append(sm_pm)
	var puffs := QuadMesh.new()
	puffs.size = Vector2(0.44, 0.44)
	var puff_mat := StandardMaterial3D.new()
	puff_mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	puff_mat.billboard_mode = BaseMaterial3D.BILLBOARD_PARTICLES
	puff_mat.depth_draw_mode = BaseMaterial3D.DEPTH_DRAW_DISABLED
	puff_mat.vertex_color_use_as_albedo = true
	puff_mat.albedo_texture = _create_soft_radial_tex(Color(1.0, 1.0, 1.0, 0.62), Color(1.0, 1.0, 1.0, 0.0), 32)
	puff_mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	puffs.material = puff_mat
	smoke.draw_pass_1 = puffs
	root.add_child(smoke)

	# Occasional small crackle sparks curling around the hearth (Paso 12.16)
	var embers := GPUParticles3D.new()
	embers.name = "CampfireEmbersParticles"
	embers.amount = 22
	embers.amount_ratio = 0.42
	embers.lifetime = 1.65
	embers.position = Vector3(0.0, 0.28, 0.0)
	var em_pm := ParticleProcessMaterial.new()
	em_pm.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_RING
	em_pm.emission_ring_axis = Vector3(0.0, 1.0, 0.0)
	em_pm.emission_ring_height = 0.03
	em_pm.emission_ring_radius = 0.22 if with_kettle else 0.14
	em_pm.emission_ring_inner_radius = 0.17 if with_kettle else 0.03
	em_pm.direction = Vector3(0.0, 1.0, 0.0)
	em_pm.spread = 28.0
	em_pm.initial_velocity_min = 0.78
	em_pm.initial_velocity_max = 1.45
	em_pm.turbulence_enabled = true
	em_pm.turbulence_noise_strength = 0.38
	embers.process_material = em_pm
	var spark := QuadMesh.new()
	spark.size = Vector2(0.062, 0.062)
	var sp_mat := StandardMaterial3D.new()
	sp_mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	sp_mat.billboard_mode = BaseMaterial3D.BILLBOARD_PARTICLES
	sp_mat.blend_mode = BaseMaterial3D.BLEND_MODE_ADD
	sp_mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	sp_mat.depth_draw_mode = BaseMaterial3D.DEPTH_DRAW_DISABLED
	sp_mat.albedo_texture = _create_soft_radial_tex(Color(1.0, 0.72, 0.26, 0.95), Color(1.0, 0.36, 0.06, 0.0), 16)
	spark.material = sp_mat
	embers.draw_pass_1 = spark
	root.add_child(embers)

	var kettle_steam: GPUParticles3D = null
	var kettle_bubbles: GPUParticles3D = null
	if with_kettle:
		# Delicate translucent white water-vapor steam rising cleanly out of the cauldron rim (Paso 12.15)
		kettle_steam = GPUParticles3D.new()
		kettle_steam.name = "KettleSteamParticles"
		kettle_steam.amount = 24
		kettle_steam.amount_ratio = 0.45
		kettle_steam.lifetime = 2.0
		kettle_steam.position = Vector3(0.0, 0.60, 0.0)
		var st_pm := ParticleProcessMaterial.new()
		st_pm.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_RING
		st_pm.emission_ring_axis = Vector3(0.0, 1.0, 0.0)
		st_pm.emission_ring_height = 0.02
		st_pm.emission_ring_radius = 0.105
		st_pm.emission_ring_inner_radius = 0.0
		st_pm.direction = Vector3(0.04, 1.0, 0.03)
		st_pm.spread = 14.0
		st_pm.initial_velocity_min = 0.36
		st_pm.initial_velocity_max = 0.62
		st_pm.gravity = Vector3(0.0, 0.08, 0.0)
		st_pm.scale_min = 0.38
		st_pm.scale_max = 0.92
		st_pm.turbulence_enabled = true
		st_pm.turbulence_noise_strength = 0.45
		var st_grad := Gradient.new()
		st_grad.offsets = PackedFloat32Array([0.0, 0.18, 0.68, 1.0])
		st_grad.colors = PackedColorArray([Color(0.96, 0.98, 1.0, 0.0), Color(0.96, 0.98, 1.0, 0.38), Color(0.95, 0.97, 0.99, 0.20), Color(0.95, 0.97, 0.99, 0.0)])
		var st_ramp := GradientTexture1D.new(); st_ramp.gradient = st_grad
		st_pm.color_ramp = st_ramp
		kettle_steam.process_material = st_pm
		var steam_q := QuadMesh.new()
		steam_q.size = Vector2(0.26, 0.26)
		var steam_mat := StandardMaterial3D.new()
		steam_mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		steam_mat.billboard_mode = BaseMaterial3D.BILLBOARD_PARTICLES
		steam_mat.depth_draw_mode = BaseMaterial3D.DEPTH_DRAW_DISABLED
		steam_mat.vertex_color_use_as_albedo = true
		steam_mat.albedo_texture = _create_soft_radial_tex(Color(1.0, 1.0, 1.0, 0.68), Color(1.0, 1.0, 1.0, 0.0), 32)
		steam_mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		steam_q.material = steam_mat
		kettle_steam.draw_pass_1 = steam_q
		root.add_child(kettle_steam)

		# Simmering broth micro-bubbles popping above the soup surface when cooking
		kettle_bubbles = GPUParticles3D.new()
		kettle_bubbles.name = "KettleBubblesParticles"
		kettle_bubbles.amount = 18
		kettle_bubbles.lifetime = 0.38
		kettle_bubbles.emitting = false
		kettle_bubbles.visible = false
		kettle_bubbles.position = Vector3(0.0, 0.58, 0.0)
		var bp_pm := ParticleProcessMaterial.new()
		bp_pm.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_RING
		bp_pm.emission_ring_axis = Vector3(0.0, 1.0, 0.0)
		bp_pm.emission_ring_height = 0.01
		bp_pm.emission_ring_radius = 0.105
		bp_pm.emission_ring_inner_radius = 0.0
		bp_pm.direction = Vector3(0.0, 1.0, 0.0)
		bp_pm.spread = 32.0
		bp_pm.initial_velocity_min = 0.16
		bp_pm.initial_velocity_max = 0.34
		bp_pm.gravity = Vector3(0.0, -0.95, 0.0)
		bp_pm.scale_min = 0.75
		bp_pm.scale_max = 1.35
		kettle_bubbles.process_material = bp_pm
		var bm := SphereMesh.new()
		bm.radius = 0.013; bm.height = 0.024; bm.radial_segments = 6; bm.rings = 3
		var b_mat := StandardMaterial3D.new()
		b_mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		b_mat.albedo_color = Color(0.96, 0.86, 0.64, 0.78)
		b_mat.roughness = 0.12
		b_mat.emission_enabled = true
		b_mat.emission = Color(0.92, 0.62, 0.28)
		b_mat.emission_energy_multiplier = 0.35
		bm.material = b_mat
		kettle_bubbles.draw_pass_1 = bm
		root.add_child(kettle_bubbles)

	# Calibrated warm amber campfire pool + gentle shadowless fill right around hearth (Paso 15.14-15.16)
	var light := OmniLight3D.new()
	light.name = "CampfireMainLight"
	light.light_color = Color("#ff933b")
	light.light_energy = 2.55
	light.omni_range = 14.2
	light.omni_attenuation = 1.38
	light.shadow_enabled = true
	light.shadow_bias = 0.06
	light.shadow_blur = 2.0
	light.position = Vector3(0.0, 0.86, 0.0)
	root.add_child(light)

	var fill_light := OmniLight3D.new()
	fill_light.name = "CampfireBounceFill"
	fill_light.light_color = Color("#ffa856")
	fill_light.light_energy = 0.68
	fill_light.omni_range = 6.2
	fill_light.omni_attenuation = 1.35
	fill_light.shadow_enabled = false
	fill_light.position = Vector3(0.0, 1.35, 0.0)
	root.add_child(fill_light)

	_fire_lights.append({
		"light": light,
		"fill_light": fill_light,
		"flame_node": flame_node,
		"smoke": smoke,
		"embers": embers,
		"kettle_steam": kettle_steam,
		"kettle_bubbles": kettle_bubbles,
		"coals_mat": mat_ember,
		"soup_shader": mat_soup,
		"base_energy": 2.55,
		"fuel": 0.82,
		"phase": pos.x * 0.7 + pos.z * 0.4,
	})

	if with_kettle:
		# Paso 12 (12.2-12.7): 3 grounded tripod poles angling radially inward to a single coherent top joint
		# at (0, 1.28, 0), bound with rope lashings & an iron ring, suspending the cauldron via chain, S-hook & bail handle!
		var apex_pt := Vector3(0.0, 1.28, 0.0)
		for i in range(3):
			var a := float(i) * TAU / 3.0 + 0.38
			var base_pt := Vector3(cos(a) * 0.58, -0.04, sin(a) * 0.58)
			var dir_to_apex := (apex_pt - base_pt).normalized()
			var top_pt := apex_pt + dir_to_apex * 0.11
			var leg_vec := top_pt - base_pt
			var leg_len := leg_vec.length()
			var y_ax := leg_vec / leg_len
			var x_ax := Vector3.UP.cross(y_ax).normalized()
			var z_ax := x_ax.cross(y_ax).normalized()
			var leg := MeshInstance3D.new()
			leg.name = "TripodLeg_%d" % i
			var lm := CylinderMesh.new()
			lm.top_radius = 0.024; lm.bottom_radius = 0.040; lm.height = leg_len; lm.radial_segments = 7
			leg.mesh = lm; leg.material_override = mat_log
			leg.transform = Transform3D(Basis(x_ax, y_ax, z_ax), (base_pt + top_pt) * 0.5)
			leg.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
			root.add_child(leg)

		# Coherent top lashing collar + forged iron suspension ring at the tripod apex (Paso 12.4)
		for turn_i in range(3):
			var lash := MeshInstance3D.new()
			lash.name = "TripodApexLashing_%d" % turn_i
			var ltm := TorusMesh.new(); ltm.inner_radius = 0.036; ltm.outer_radius = 0.056; ltm.rings = 10; ltm.ring_segments = 6
			lash.mesh = ltm; lash.material_override = mat_rope
			lash.position = apex_pt + Vector3(0.0, -0.02 + float(turn_i) * 0.020, 0.0)
			root.add_child(lash)

		var apex_ring := MeshInstance3D.new()
		apex_ring.name = "TripodApexRing"
		var arm := TorusMesh.new(); arm.inner_radius = 0.028; arm.outer_radius = 0.044; arm.rings = 10; arm.ring_segments = 6
		apex_ring.mesh = arm; apex_ring.material_override = mat_iron
		apex_ring.position = apex_pt + Vector3(0.0, -0.045, 0.0)
		root.add_child(apex_ring)

		# Forged iron suspension chain + visible links + S-hook (Paso 12.5)
		var chain := MeshInstance3D.new()
		chain.name = "CauldronChain"
		var chm := CylinderMesh.new(); chm.top_radius = 0.011; chm.bottom_radius = 0.011; chm.height = 0.48; chm.radial_segments = 6
		chain.mesh = chm; chain.material_override = mat_iron
		chain.position = Vector3(0.0, 0.99, 0.0)
		root.add_child(chain)

		for lk_i in range(5):
			var link := MeshInstance3D.new()
			link.name = "ChainLink_%d" % lk_i
			var lkm := TorusMesh.new(); lkm.inner_radius = 0.014; lkm.outer_radius = 0.024; lkm.rings = 8; lkm.ring_segments = 5
			link.mesh = lkm; link.material_override = mat_iron
			link.position = Vector3(0.0, 1.18 - float(lk_i) * 0.09, 0.0)
			link.rotation = Vector3(PI * 0.5, float(lk_i % 2) * PI * 0.5, 0.0)
			root.add_child(link)

		var hook := MeshInstance3D.new()
		hook.name = "CauldronHook"
		var hkm := TorusMesh.new(); hkm.inner_radius = 0.018; hkm.outer_radius = 0.032; hkm.rings = 8; hkm.ring_segments = 6
		hook.mesh = hkm; hook.material_override = mat_iron
		hook.position = Vector3(0.0, 0.74, 0.0)
		hook.rotation.x = PI * 0.5
		root.add_child(hook)

		# Curved wrought-iron bail handle (asa) hooking the cauldron rim lugs to the S-hook (Paso 12.5 & 12.6)
		var bail := MeshInstance3D.new()
		bail.name = "CauldronBailHandle"
		var blm := TorusMesh.new(); blm.inner_radius = 0.155; blm.outer_radius = 0.169; blm.rings = 14; blm.ring_segments = 6
		bail.mesh = blm; bail.material_override = mat_iron
		bail.position = Vector3(0.0, 0.58, 0.0)
		bail.rotation.x = PI * 0.5
		root.add_child(bail)

		for side_i in [-1, 1]:
			var lug := MeshInstance3D.new()
			lug.name = "CauldronLug_L" if side_i < 0 else "CauldronLug_R"
			var lgm := BoxMesh.new(); lgm.size = Vector3(0.032, 0.042, 0.028)
			lug.mesh = lgm; lug.material_override = mat_iron
			lug.position = Vector3(float(side_i) * 0.162, 0.575, 0.0)
			root.add_child(lug)

		# Cast-iron belly cauldron positioned at y = 0.49m right above the flames (Paso 12.6 & 12.7)
		var kettle := MeshInstance3D.new()
		kettle.name = "CampfireKettle"
		var km := SphereMesh.new()
		km.radius = 0.19; km.height = 0.25; km.radial_segments = 12; km.rings = 7
		kettle.mesh = km; kettle.material_override = mat_iron
		kettle.position = Vector3(0.0, 0.49, 0.0)
		kettle.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		root.add_child(kettle)

		var rim := MeshInstance3D.new()
		rim.name = "KettleRim"
		var rm := TorusMesh.new(); rm.inner_radius = 0.135; rm.outer_radius = 0.162; rm.rings = 12
		rim.mesh = rm; rim.material_override = mat_iron
		rim.position = Vector3(0.0, 0.58, 0.0)
		root.add_child(rim)

		var soup := MeshInstance3D.new()
		soup.name = "KettleBroth"
		var sm := CylinderMesh.new()
		sm.top_radius = 0.136; sm.bottom_radius = 0.136; sm.height = 0.02; sm.radial_segments = 10
		soup.mesh = sm; soup.material_override = mat_soup
		soup.position = Vector3(0.0, 0.57, 0.0)
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

func build_camp_life(parent: Node3D, center: Vector3, count_birds: int = 4, count_insects: int = 12, bird_tint: Color = Color("#eef2f6"), nocturnal_owls: int = 1, orbit_scale: float = 1.0, spread_xz: Vector2 = Vector2.ZERO) -> void:
	var wing_tint := bird_tint.darkened(0.24)
	var wide_forest := spread_xz.x > 1.0 and spread_xz.y > 1.0
	var bird_sectors: Array[Vector3] = [
		Vector3(-24.0, 2.8, -18.0),
		Vector3(24.0, 3.1, -24.0),
		Vector3(-26.0, 2.5, 22.0),
		Vector3(24.0, 2.7, 26.0),
		Vector3(-4.0, 3.5, -40.0),
		Vector3(2.0, 3.2, 38.0),
		Vector3(-34.0, 2.9, 2.0),
		Vector3(34.0, 3.4, -2.0),
	]
	for i in range(count_birds):
		var b_res := FaunaKit.build_bird_node("AmbientBird_%d" % i, bird_tint, wing_tint, 1.24, true)
		var bird: Node3D = b_res["root"]
		var ang := float(i) * 1.85 + 0.35
		var rad := (12.5 + float(i % 3) * 3.4) if wide_forest else ((9.2 + float(i) * 2.4) * orbit_scale)
		var arc_c := center + Vector3(cos(float(i)) * 2.6 * orbit_scale, 3.8 + float(i % 3) * 0.75, sin(float(i)) * 2.0 * orbit_scale)
		if wide_forest:
			var sec: Vector3 = bird_sectors[i % bird_sectors.size()]
			arc_c = Vector3(center.x + sec.x * (spread_xz.x / 102.0), center.y + 3.9 + sec.y * 0.55 + float(i % 3) * 0.65, center.z + sec.z * (spread_xz.y / 120.0))
		var b_phases := ["day", "arrival", "dawn"] if i < 2 else (["day", "dawn", "dusk"] if wide_forest else ["dawn", "dusk"])
		var v_cyc := 48.0 + float(i) * 6.0
		var v_duty := 0.54 if wide_forest else 0.42
		var offsets: Array[float] = [4.0, 26.0, 11.0, 34.0, 16.0, 2.0, 22.0, 30.0]
		var v_off: float = offsets[i % offsets.size()]
		bird.position = Vector3(arc_c.x + cos(ang) * rad, arc_c.y + sin(ang * 2.1) * 0.65, arc_c.z + sin(ang * 1.2) * rad * 0.62)
		parent.add_child(bird)
		_birds.append({
			"node": bird, "lw": b_res["lw"], "rw": b_res["rw"],
			"center": arc_c, "radius": rad,
			"speed": 0.25 + float(i % 3) * 0.055,
			"phase": ang, "nocturnal": false,
			"phases": b_phases,
			"blocked_weather": ["storm", "snow"] if i == 0 else ["rain", "storm", "snow"],
			"visit_cycle": v_cyc, "visit_duty": v_duty, "visit_offset": v_off,
		})

	var owl_sectors: Array[Vector3] = [
		Vector3(-22.0, 2.8, -22.0),
		Vector3(24.0, 3.0, 20.0),
		Vector3(0.0, 3.4, -36.0),
	]
	for j in range(nocturnal_owls):
		var o_res := FaunaKit.build_bird_node("AmbientOwl_%d" % j, Color("#9e9688"), Color("#635b50"), 1.32, true)
		var owl: Node3D = o_res["root"]
		var ang_o := float(j) * 2.5 + 1.1
		var rad_o := (11.5 + float(j) * 2.8) if wide_forest else ((8.8 + float(j) * 2.5) * orbit_scale)
		var arc_o := center + Vector3(0.0, 4.1 + float(j) * 0.8, -1.5 * orbit_scale)
		if wide_forest:
			var osec: Vector3 = owl_sectors[j % owl_sectors.size()]
			arc_o = Vector3(center.x + osec.x, center.y + 4.1 + osec.y * 0.55, center.z + osec.z)
		owl.position = Vector3(arc_o.x + cos(ang_o) * rad_o, arc_o.y, arc_o.z + sin(ang_o * 1.2) * rad_o * 0.62)
		parent.add_child(owl)
		_birds.append({
			"node": owl, "lw": o_res["lw"], "rw": o_res["rw"],
			"center": arc_o, "radius": rad_o,
			"speed": 0.23 + float(j) * 0.045,
			"phase": ang_o, "nocturnal": true,
			"phases": ["night", "dusk"],
			"blocked_weather": ["storm", "rain"],
			"visit_cycle": 56.0, "visit_duty": 0.52 if wide_forest else 0.48, "visit_offset": 8.0 + float(j) * 18.0,
		})
	_sync_sky_wildlife()
	call_deferred("_settle_sky_birds_clear_of_obstacles")

	var ish := Shader.new()
	ish.code = """
shader_type spatial;
render_mode blend_add, depth_draw_never, cull_disabled, unshaded;
uniform vec4 glow_col : source_color = vec4(0.92, 0.90, 0.46, 0.42);
instance uniform float blink = 1.0;
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
	float d = clamp(length(UV - vec2(0.5)) * 2.0, 0.0, 1.0);
	float core = pow(1.0 - d, 3.2);
	ALBEDO = glow_col.rgb;
	ALPHA = glow_col.a * core * blink;
}
"""
	var imat := ShaderMaterial.new()
	imat.shader = ish
	var fquad := QuadMesh.new()
	fquad.size = Vector2(0.115, 0.115)
	# Non-uniform irregular firefly pockets across the forest floor & riverbanks (zero single camp-center cube)
	var forest_pockets: Array[Dictionary] = [
		{"pos": Vector3(-5.0, 0.85, -36.0), "rx": 6.5, "rz": 8.0, "count": 5},
		{"pos": Vector3(20.0, 1.05, -38.0), "rx": 7.0, "rz": 6.5, "count": 4},
		{"pos": Vector3(6.5, 0.78, -16.0), "rx": 5.5, "rz": 6.5, "count": 5},
		{"pos": Vector3(-13.0, 0.95, -2.0), "rx": 6.5, "rz": 7.5, "count": 4},
		{"pos": Vector3(2.0, 0.82, 12.0), "rx": 5.0, "rz": 5.5, "count": 4},
		{"pos": Vector3(9.5, 0.70, 20.0), "rx": 4.5, "rz": 4.0, "count": 4},
		{"pos": Vector3(38.0, 1.15, 8.0), "rx": 7.0, "rz": 8.5, "count": 4},
		{"pos": Vector3(36.0, 1.15, -20.0), "rx": 6.5, "rz": 7.0, "count": 3},
		{"pos": Vector3(26.5, 0.92, 22.0), "rx": 4.2, "rz": 4.2, "count": 3},
		{"pos": Vector3(2.0, 0.78, 35.0), "rx": 6.0, "rz": 7.0, "count": 4},
		{"pos": Vector3(24.0, 0.92, 43.0), "rx": 6.5, "rz": 7.5, "count": 4},
		{"pos": Vector3(-22.0, 1.02, 18.0), "rx": 6.5, "rz": 7.5, "count": 3},
		{"pos": Vector3(-22.0, 1.05, -22.0), "rx": 6.5, "rz": 6.5, "count": 3},
		{"pos": Vector3(37.0, 1.02, 36.0), "rx": 6.5, "rz": 7.0, "count": 4},
	]
	var pocket_cursor := 0
	var pocket_left := int(forest_pockets[0]["count"])
	for i in range(count_insects):
		var m := MeshInstance3D.new()
		m.mesh = fquad
		m.material_override = imat
		m.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		parent.add_child(m)
		var icenter := center + Vector3(randf_range(-11.0, 11.0), randf_range(0.55, 2.0), randf_range(-9.0, 9.0))
		var h_off := randf_range(0.55, 2.05)
		var amp_xz := 1.1
		if wide_forest:
			var pk: Dictionary = forest_pockets[pocket_cursor % forest_pockets.size()]
			var ppos: Vector3 = pk["pos"]
			var rx := float(pk["rx"])
			var rz := float(pk["rz"])
			# Organic cluster radius skewed inward + irregular angle so pockets read naturally non-uniform
			var rad_u := sqrt(randf()) * randf_range(0.35, 1.05)
			var ang_u := randf_range(0.0, TAU)
			icenter = Vector3(ppos.x + cos(ang_u) * rx * rad_u, h_off, ppos.z + sin(ang_u) * rz * rad_u)
			amp_xz = randf_range(0.75, 1.75)
			pocket_left -= 1
			if pocket_left <= 0:
				pocket_cursor += 1
				pocket_left = int(forest_pockets[pocket_cursor % forest_pockets.size()]["count"])
		_insects.append({
			"node": m,
			"center": icenter,
			"height_above": h_off,
			"amp_xz": amp_xz,
			"amp_y": randf_range(0.16, 0.36),
			"blink_period": randf_range(4.2, 7.6),
			"phase": randf_range(0.0, TAU),
		})
	if wide_forest:
		call_deferred("_settle_fx_to_terrain")

func _settle_sky_birds_clear_of_obstacles() -> void:
	if not is_inside_tree() or not get_world_3d():
		return
	var space := get_world_3d().direct_space_state
	var root := get_parent()
	if not root:
		return
	var builder_obj: Object = root.get("outdoor_builder")
	var tree_spots: Array = builder_obj.get("_tree_spots") if builder_obj != null and builder_obj.get("_tree_spots") is Array else []
	var has_terrain_eval := builder_obj != null and builder_obj.has_method("eval_ground_height")
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

	for b_i in range(_birds.size()):
		var b: Dictionary = _birds[b_i]
		var c: Vector3 = b.get("center", Vector3.ZERO)
		var rad: float = float(b.get("radius", 9.0))
		var ph: float = float(b.get("phase", 0.0))
		# Ensure flight altitude clears ALL hilltops & multi-mesh conifer/broadleaf treetops cleanly
		if has_terrain_eval:
			var max_canopy_y := c.y
			for si_t in range(24):
				var ang_t := float(si_t) / 24.0 * TAU + ph
				var px_t := c.x + cos(ang_t) * rad
				var pz_t := c.z + sin(ang_t * 1.2) * rad * 0.62
				var gy_t: float = float(builder_obj.call("eval_ground_height", px_t, pz_t))
				var canopy_margin := 4.4
				for ts_v in tree_spots:
					var t2: Vector2 = ts_v
					if Vector2(px_t - t2.x, pz_t - t2.y).length_squared() <= 22.0:
						canopy_margin = 8.8
						break
				max_canopy_y = maxf(max_canopy_y, gy_t + canopy_margin + float(b_i % 3) * 0.55)
			c.y = maxf(c.y, max_canopy_y)
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

func _settle_fx_to_terrain() -> void:
	if not is_inside_tree() or not get_world_3d():
		return
	var space := get_world_3d().direct_space_state
	if not space:
		return
	var _sample_y := func(xz: Vector2) -> float:
		var excl: Array[RID] = []
		for _step in range(5):
			var q := PhysicsRayQueryParameters3D.create(Vector3(xz.x, 14.0, xz.y), Vector3(xz.x, -6.0, xz.y))
			q.collide_with_areas = false
			q.collide_with_bodies = true
			q.exclude = excl
			var hit := space.intersect_ray(q)
			if hit.is_empty():
				break
			var col_obj: Object = hit.get("collider")
			var cname: String = str((col_obj as Node).name).to_lower() if (col_obj is Node) else ""
			var nrm: Vector3 = hit.get("normal", Vector3.UP)
			var pos: Vector3 = hit.get("position", Vector3.ZERO)
			var is_prop_or_tree := ("tree" in cname or "trunk" in cname or "canopy" in cname or "rock" in cname or "shelter" in cname or "boulder" in cname)
			if not is_prop_or_tree and pos.y <= 4.0 and nrm.y >= 0.55:
				return clampf(pos.y, -1.5, 3.8)
			var rid_val: RID = hit.get("rid", RID())
			if rid_val.is_valid():
				excl.append(rid_val)
			else:
				break
		return 0.0

	for ins in _insects:
		var c: Vector3 = ins.get("center", Vector3.ZERO)
		var h_off: float = float(ins.get("height_above", 0.9))
		if h_off > 0.0:
			var gy: float = float(_sample_y.call(Vector2(c.x, c.z)))
			ins["center"] = Vector3(c.x, gy + h_off, c.z)
			var node: Node3D = ins.get("node")
			if is_instance_valid(node):
				node.position = ins["center"]

	for pk in _ambient_terrain_pockets:
		var pnode: Node3D = pk.get("node")
		if is_instance_valid(pnode):
			var h_off: float = float(pk.get("height_above", 2.0))
			var gy: float = float(_sample_y.call(Vector2(pnode.position.x, pnode.position.z)))
			pnode.position.y = gy + h_off

func build_biome_ambience(profile: String, bounds_m: Vector2, map_center_xz: Vector2 = Vector2(-9999.0, -9999.0)) -> void:
	var cx := bounds_m.x * 0.5 if map_center_xz.x < -9000.0 else map_center_xz.x
	var cz := bounds_m.y * 0.5 if map_center_xz.y < -9000.0 else map_center_xz.y
	if bounds_m.x > 60.0 or bounds_m.y > 60.0:
		if is_instance_valid(_rain_particles) and _rain_particles.process_material is ParticleProcessMaterial:
			_rain_particles.position = Vector3(cx, 14.0, cz)
			_rain_particles.amount = 540
			(_rain_particles.process_material as ParticleProcessMaterial).emission_box_extents = Vector3(bounds_m.x * 0.52, 1.0, bounds_m.y * 0.52)
		if is_instance_valid(_snow_particles) and _snow_particles.process_material is ParticleProcessMaterial:
			_snow_particles.position = Vector3(cx, 13.0, cz)
			_snow_particles.amount = 340
			(_snow_particles.process_material as ParticleProcessMaterial).emission_box_extents = Vector3(bounds_m.x * 0.52, 1.0, bounds_m.y * 0.52)

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
			# Subtle wide-map canopy pollen background + distinct non-uniform micro-habitat pockets across all quadrants
			gp.amount = 44
			gp.lifetime = 5.4
			gp.position = Vector3(cx, 3.8, cz)
			pm.emission_box_extents = Vector3(bounds_m.x * 0.48, 2.5, bounds_m.y * 0.48)
			pm.direction = Vector3(0.28, -0.45, 0.22)
			pm.spread = 38.0
			pm.initial_velocity_min = 0.24
			pm.initial_velocity_max = 0.62
			pm.gravity = Vector3(0.0, -0.05, 0.0)
			mote.size = Vector2(0.085, 0.085)
			tint_c = Color(0.78, 0.86, 0.48, 0.36)
		"wreck-beach":
			# Subtle coastal sea-spray mist hugging ONLY the offshore breaking surf (zero generic floating orbs over sand!)
			gp.amount = 22
			gp.lifetime = 3.2
			gp.position = Vector3(bounds_m.x * 0.52, 0.55, bounds_m.y * 0.84)
			pm.emission_box_extents = Vector3(bounds_m.x * 0.48, 0.25, 2.2)
			pm.direction = Vector3(-0.35, 0.32, -0.45)
			pm.spread = 22.0
			pm.initial_velocity_min = 0.45
			pm.initial_velocity_max = 0.95
			pm.gravity = Vector3(0.0, -0.08, 0.0)
			mote.size = Vector2(0.85, 0.42)
			tint_c = Color(0.86, 0.93, 0.97, 0.065)
		"cliff-observatory":
			# Subtle high-altitude wind mist streaks drifting past the cliff precipice (zero floating white polka dots!)
			gp.amount = 18
			gp.lifetime = 3.4
			gp.position = Vector3(bounds_m.x * 0.5, -2.2, bounds_m.y * 0.78)
			pm.emission_box_extents = Vector3(bounds_m.x * 0.65, 1.8, 5.0)
			pm.direction = Vector3(0.88, 0.08, 0.36)
			pm.spread = 14.0
			pm.initial_velocity_min = 1.45
			pm.initial_velocity_max = 2.45
			pm.gravity = Vector3(0.0, 0.02, 0.0)
			mote.size = Vector2(1.45, 0.55)
			tint_c = Color(0.76, 0.86, 0.96, 0.065)
		_:
			# Subtle damp mist localized strictly in the eastern sea-cave spring alcove (zero bright floating dots!)
			gp.amount = 18
			gp.lifetime = 4.4
			gp.position = Vector3(28.0, 1.25, 13.8)
			pm.emission_box_extents = Vector3(3.2, 0.75, 2.8)
			pm.direction = Vector3(-0.08, 0.18, 0.16)
			pm.spread = 36.0
			pm.initial_velocity_min = 0.10
			pm.initial_velocity_max = 0.26
			pm.gravity = Vector3(0.0, 0.01, 0.0)
			mote.size = Vector2(0.42, 0.30)
			tint_c = Color(0.78, 0.92, 0.96, 0.085)

	mat.set_shader_parameter("tint", tint_c)
	mote.material = mat
	gp.process_material = pm
	gp.draw_pass_1 = mote
	gp.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(gp)

	if profile == "forest":
		# Non-uniform micro-habitat pockets across the full woodland & river (zero single-box camp cluster)
		var pollen_specs: Array[Dictionary] = [
			{"xz": Vector2(-14.0, -28.0), "ext": Vector3(4.8, 1.5, 5.4), "amt": 16, "h": 2.2, "col": Color(0.88, 0.90, 0.50, 0.56), "dir": Vector3(0.18, -0.25, 0.14)},
			{"xz": Vector2(16.0, -38.0),  "ext": Vector3(6.2, 1.8, 5.0), "amt": 20, "h": 2.4, "col": Color(0.92, 0.84, 0.44, 0.54), "dir": Vector3(0.24, -0.18, 0.10)},
			{"xz": Vector2(-16.0, 2.0),   "ext": Vector3(4.2, 1.4, 6.4), "amt": 14, "h": 2.0, "col": Color(0.84, 0.89, 0.48, 0.52), "dir": Vector3(0.12, -0.30, 0.22)},
			{"xz": Vector2(40.0, -8.0),   "ext": Vector3(5.6, 1.7, 5.8), "amt": 18, "h": 2.5, "col": Color(0.86, 0.88, 0.46, 0.50), "dir": Vector3(-0.14, -0.24, 0.18)},
			{"xz": Vector2(-8.0, 28.0),   "ext": Vector3(5.2, 1.5, 4.4), "amt": 15, "h": 1.9, "col": Color(0.90, 0.85, 0.45, 0.54), "dir": Vector3(0.20, -0.22, -0.12)},
			{"xz": Vector2(36.0, 30.0),   "ext": Vector3(6.4, 1.8, 6.0), "amt": 21, "h": 2.3, "col": Color(0.85, 0.88, 0.46, 0.52), "dir": Vector3(0.15, -0.26, 0.20)},
		]
		for pi in range(pollen_specs.size()):
			var ps: Dictionary = pollen_specs[pi]
			var pgp := GPUParticles3D.new()
			pgp.name = "ForestPollenPocket_%d" % pi
			var pxz: Vector2 = ps["xz"]
			var h_abv := float(ps["h"])
			pgp.position = Vector3(pxz.x, h_abv, pxz.y)
			pgp.amount = int(ps["amt"])
			pgp.lifetime = 4.6 + float(pi % 3) * 0.65
			var ppm := ParticleProcessMaterial.new()
			ppm.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_BOX
			ppm.emission_box_extents = ps["ext"]
			ppm.direction = ps["dir"]
			ppm.spread = 42.0
			ppm.initial_velocity_min = 0.18
			ppm.initial_velocity_max = 0.54
			ppm.gravity = Vector3(0.0, -0.04, 0.0)
			var pmote := QuadMesh.new()
			pmote.size = Vector2(0.078 + float(pi % 2) * 0.018, 0.078 + float(pi % 2) * 0.018)
			var pmat := ShaderMaterial.new()
			pmat.shader = sh
			pmat.set_shader_parameter("tint", ps["col"])
			pmote.material = pmat
			pgp.process_material = ppm
			pgp.draw_pass_1 = pmote
			pgp.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
			add_child(pgp)
			_ambient_terrain_pockets.append({"node": pgp, "height_above": h_abv})

		var swirl_specs: Array[Dictionary] = [
			{"xz": Vector2(34.0, -28.0),  "ext": Vector3(5.5, 2.0, 5.2), "amt": 14, "h": 3.4, "col": Color(0.70, 0.68, 0.34, 0.62), "dir": Vector3(-0.36, -0.45, 0.26)},
			{"xz": Vector2(-26.0, -12.0), "ext": Vector3(5.8, 2.1, 6.4), "amt": 16, "h": 3.5, "col": Color(0.64, 0.72, 0.32, 0.58), "dir": Vector3(0.32, -0.48, 0.22)},
			{"xz": Vector2(-24.0, 20.0),  "ext": Vector3(4.8, 1.9, 5.5), "amt": 13, "h": 3.2, "col": Color(0.74, 0.62, 0.30, 0.58), "dir": Vector3(0.28, -0.42, -0.24)},
			{"xz": Vector2(16.0, 44.0),   "ext": Vector3(6.2, 2.0, 5.8), "amt": 17, "h": 3.4, "col": Color(0.68, 0.70, 0.34, 0.60), "dir": Vector3(0.22, -0.50, 0.30)},
			{"xz": Vector2(46.0, 14.0),   "ext": Vector3(5.4, 2.2, 6.2), "amt": 15, "h": 3.6, "col": Color(0.72, 0.64, 0.32, 0.58), "dir": Vector3(-0.26, -0.44, 0.28)},
		]
		for si in range(swirl_specs.size()):
			var ss: Dictionary = swirl_specs[si]
			var sgp := GPUParticles3D.new()
			sgp.name = "ForestLeafSwirl_%d" % si
			var sxz: Vector2 = ss["xz"]
			var h_abv := float(ss["h"])
			sgp.position = Vector3(sxz.x, h_abv, sxz.y)
			sgp.amount = int(ss["amt"])
			sgp.lifetime = 5.0 + float(si % 3) * 0.55
			var spm := ParticleProcessMaterial.new()
			spm.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_BOX
			spm.emission_box_extents = ss["ext"]
			spm.direction = ss["dir"]
			spm.spread = 34.0
			spm.initial_velocity_min = 0.34
			spm.initial_velocity_max = 0.82
			spm.gravity = Vector3(0.0, -0.09, 0.0)
			var smote := QuadMesh.new()
			smote.size = Vector2(0.13, 0.085)
			var smat := ShaderMaterial.new()
			smat.shader = sh
			smat.set_shader_parameter("tint", ss["col"])
			smote.material = smat
			sgp.process_material = spm
			sgp.draw_pass_1 = smote
			sgp.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
			add_child(sgp)
			_ambient_terrain_pockets.append({"node": sgp, "height_above": h_abv})

		var builder_obj: Object = get_parent().get("outdoor_builder") if get_parent() else null
		var mist_specs: Array[Dictionary] = [
			{"xz": Vector2(4.0, -24.0), "ext": Vector3(3.4, 0.45, 7.5), "amt": 16, "h": 0.90},
			{"xz": Vector2(6.5, 2.0),   "ext": Vector3(3.2, 0.45, 6.8), "amt": 14, "h": 0.85},
			{"xz": Vector2(9.2, 34.0),  "ext": Vector3(3.6, 0.45, 7.8), "amt": 16, "h": 0.90},
		]
		for mi in range(mist_specs.size()):
			var ms: Dictionary = mist_specs[mi]
			var mgp := GPUParticles3D.new()
			mgp.name = "RiverMistDrift_%d" % mi
			var mxz: Vector2 = ms["xz"]
			if builder_obj != null and builder_obj.has_method("get_nearest_river_point"):
				var rpt: Vector3 = builder_obj.call("get_nearest_river_point", Vector3(mxz.x, 0.0, mxz.y))
				mxz = Vector2(rpt.x, mxz.y)
			var h_abv := float(ms["h"])
			mgp.position = Vector3(mxz.x, h_abv, mxz.y)
			mgp.amount = int(ms["amt"])
			mgp.lifetime = 4.2
			var mpm := ParticleProcessMaterial.new()
			mpm.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_BOX
			mpm.emission_box_extents = ms["ext"]
			mpm.direction = Vector3(0.14, 0.22, 0.55)
			mpm.spread = 28.0
			mpm.initial_velocity_min = 0.22
			mpm.initial_velocity_max = 0.48
			mpm.gravity = Vector3(0.0, 0.02, 0.0)
			var mmote := QuadMesh.new()
			mmote.size = Vector2(0.56, 0.36)
			var mmat := ShaderMaterial.new()
			mmat.shader = sh
			mmat.set_shader_parameter("tint", Color(0.80, 0.90, 0.96, 0.11))
			mmote.material = mmat
			mgp.process_material = mpm
			mgp.draw_pass_1 = mmote
			mgp.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
			add_child(mgp)
			_ambient_terrain_pockets.append({"node": mgp, "height_above": h_abv})

		call_deferred("_settle_fx_to_terrain")

func register_drip(node: Node3D, y_top: float, y_bot: float, speed: float, phase: float) -> void:
	_drips.append({"node": node, "y_top": y_top, "y_bot": y_bot, "speed": speed, "phase": phase})

func register_aurora(mesh: MeshInstance3D) -> void:
	mesh.set_meta("base_x", mesh.position.x)
	_aurora_meshes.append(mesh)

func register_cloud(node: Node3D, base_x: float, span: float, speed: float) -> void:
	_clouds.append({"node": node, "base_x": base_x, "span": span, "speed": speed})

func register_lantern(light: OmniLight3D, glass_mat: StandardMaterial3D = null, base_energy: float = 1.05, flicker_amp: float = 0.06, emit_energy: float = 1.55, always_lit: bool = false, day_scale: float = 0.72) -> void:
	_lanterns.append({
		"light": light,
		"glass_mat": glass_mat,
		"base_energy": base_energy,
		"flicker_amp": flicker_amp,
		"emit_energy": emit_energy,
		"always_lit": always_lit,
		"day_scale": day_scale,
		"phase": randf_range(0.0, TAU),
	})
	var lanterns_lit := (not (current_phase in ["day", "arrival"])) or (current_weather in ["rain", "storm", "fog"])
	var lit_this := lanterns_lit or always_lit
	var ds := day_scale if (always_lit and not lanterns_lit) else 1.0
	if is_instance_valid(light):
		light.light_energy = (base_energy * ds) if lit_this else 0.0
	if is_instance_valid(glass_mat):
		glass_mat.emission_enabled = lit_this
		glass_mat.emission_energy_multiplier = (emit_energy * ds) if lit_this else 0.0

func register_arcane_crystal(light: OmniLight3D, mat: StandardMaterial3D, night_energy: float = 0.95, day_emit: float = 0.14, night_emit: float = 1.55) -> void:
	_crystals.append({
		"light": light,
		"mat": mat,
		"night_energy": night_energy,
		"day_emit": day_emit,
		"night_emit": night_emit,
	})

func configure_exterior_weather_bounds(center: Vector3, extents: Vector3) -> void:
	var ry := center.y if center.y > 2.0 else 14.0
	if is_instance_valid(_rain_particles) and _rain_particles.process_material is ParticleProcessMaterial:
		_rain_particles.position = Vector3(center.x, ry, center.z)
		(_rain_particles.process_material as ParticleProcessMaterial).emission_box_extents = Vector3(extents.x, 1.0, extents.z)
	if is_instance_valid(_snow_particles) and _snow_particles.process_material is ParticleProcessMaterial:
		_snow_particles.position = Vector3(center.x, maxf(6.5, ry - 0.8), center.z)
		(_snow_particles.process_material as ParticleProcessMaterial).emission_box_extents = Vector3(extents.x, 1.0, extents.z)

func set_smoke_wind(wind_dir: Vector3) -> void:
	for sm_pm in _smoke_materials:
		if is_instance_valid(sm_pm):
			sm_pm.direction = wind_dir.normalized()
