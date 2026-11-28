extends SceneTree

const Waves = preload("res://scripts/ocean_waves.gd")
var passed := 0
var failures: Array[String] = []

func _initialize() -> void:
	_run.call_deferred()

func check(condition: bool, message: String) -> void:
	if condition: passed += 1
	else:
		failures.append(message)
		printerr("FAIL ", message)

func _run() -> void:
	var main := load("res://scenes/main.tscn").instantiate() as Node3D
	root.add_child(main)
	await process_frame
	await process_frame
	var env := main.get_node("ShipEnvironment")
	if not env.ready_for_review:
		printerr("FAIL environment not initialized")
		quit(1)
		return
	var roof := main.find_child("RoofCutout", true, false)
	var vfx := main.find_child("Vfx", true, false)
	var boat := main.find_child("Rowboat", true, false)
	var ocean := main.get_node("OceanWater") as MeshInstance3D
	var hero := main.find_child("PlayerToken", true, false) as Node3D
	var initial_meshes := main.find_children("*", "MeshInstance3D", true, false).size()
	var initial_collisions := main.find_children("*", "CollisionShape3D", true, false).size()
	check(env.wet_materials.size() > 10, "wettable exterior material registry")
	check(env.shader_materials.size() >= 3, "hull / props / sails weather variants")
	check(env.get_node("InteriorShadowBlockers").get_child_count() > 10, "cutaway rooms retain light blockers")
	for blocker: MeshInstance3D in env.get_node("InteriorShadowBlockers").get_children():
		check(blocker.cast_shadow == GeometryInstance3D.SHADOW_CASTING_SETTING_SHADOWS_ONLY and blocker.get_child_count() == 0, "non-colliding shadow-only blocker")
	check(ocean.get_node_or_null("OceanHorizon") != null, "continuous distant sea")
	var ocean_mat := ocean.get_active_material(0) as ShaderMaterial
	check(ocean_mat != null and is_equal_approx(float(ocean_mat.get_shader_parameter("hull_mask_enabled")), 1.0), "exterior ocean masked out inside enclosed ship hull")
	check(vfx.rain.global_position.y > 20.0, "rain starts above the crow's nest")
	check(main.find_child("C9_DepthGlimmer", true, false).light_energy == 0.0 and main.find_child("C9_HoldAmbient", true, false).light_energy == 0.0, "no artificial cyan fill in the hold")
	check(not env.set_weather("invalid") and not env.set_time_of_day("invalid"), "reject invalid presets")
	var cabin_material := main.find_child("Interiors", true, false).mat_bedding as StandardMaterial3D
	check(cabin_material.albedo_texture != null and cabin_material.albedo_texture != preload("res://assets/textures/oak-illustrated-v1.png"), "bedding uses reused linen rather than oak")
	check((hero.get_node("Sprite3D") as Sprite3D).get_draw_flag(SpriteBase3D.FLAG_SHADED), "actor receives scene lighting")
	var zones := ["exterior", "aft_c4_port", "aft_c5_stbd", "fore_c6_port", "fore_c7_stbd", "lower_c8_bilge", "lower_c9_hold"]
	for hour in ["day", "dusk", "night"]:
		env.set_time_of_day(hour)
		check(env.sun.global_basis.z.y > 0.0, "sun and moon rays descend from the sky")
		for weather in ["clear", "rain", "storm", "fog"]:
			env.set_weather(weather, true)
			check(is_equal_approx(Waves.current_amplitude, boat.wave_amplitude) and is_equal_approx(Waves.current_amplitude, ocean.get_active_material(0).get_shader_parameter("wave_amplitude")), hour + weather + " CPU/GPU/boat waves agree")
			for mode in zones:
				roof.set_interior_mode(mode, true)
				env.sync_zone_lighting()
				var rain_expected: bool = weather in ["rain", "storm"] and mode == "exterior"
				check(vfx.rain.visible == rain_expected and vfx.rain.emitting == rain_expected, hour + weather + mode + " rain coverage")
				for entry in vfx.zone_emitters:
					check(entry["node"].emitting == entry["node"].visible, "hidden zone emitter stopped")
				for tag in ["c4", "c5", "c6", "c7"]:
					check(vfx._is_zone_active(tag) == ((tag == "c4" and mode == "aft_c4_port") or (tag == "c5" and mode == "aft_c5_stbd") or (tag == "c6" and mode == "fore_c6_port") or (tag == "c7" and mode == "fore_c7_stbd")), "room-specific particles " + tag)
	check(main.find_children("*", "MeshInstance3D", true, false).size() == initial_meshes, "state cycling creates no meshes")
	check(main.find_children("*", "CollisionShape3D", true, false).size() == initial_collisions, "weather changes no collisions")
	for state in [[Vector3(-18, 0.1, -4), 2], [Vector3(-18, 0.1, 4), 4], [Vector3(18, 0.1, -4), 8], [Vector3(18, 0.1, 4), 16], [Vector3(0, -3.3, 2), 32], [Vector3(0, -6.3, 2), 64], [Vector3(2, -3, 15), 1]]:
		hero.position = state[0]
		env.sync_zone_lighting()
		check(hero.get_node("CarriedLantern").light_cull_mask == (state[1] | 128) and hero.get_node("Sprite3D").layers == state[1],
			"actor and carried light use the same compartment and exterior receives the sun")
	env.set_weather("storm", true)
	var full_rain: float = vfx.rain.amount_ratio
	env.set_reduced_effects(true)
	check(vfx.rain.amount_ratio < full_rain, "gentle effects reduce particle density")
	env.set_weather("clear", false)
	var previous: float = env.wetness
	for i in range(7):
		env._process(1.0)
		check(env.wetness <= previous, "monotonic drying")
		previous = env.wetness
	for entry in env.wet_materials:
		check(entry["material"].albedo_color.is_equal_approx(entry["albedo"]) and is_equal_approx(entry["material"].roughness, entry["roughness"]), "dry material restored exactly")
	check(not env.water.get_shader_parameter("wave_amplitude") > 0.6, "swell remains bounded")
	roof.set_interior_mode("exterior", true)
	env.sync_zone_lighting()
	vfx._process(0.1)
	var wake := vfx.find_child("SeaSpray_RowboatWake", true, false) as GPUParticles3D
	check(not wake.emitting, "stationary boat has no rowing wake")
	boat.position.x += 0.5
	vfx._process(0.1)
	check(wake.emitting, "moving boat produces wake")
	vfx._process(0.1)
	check(not wake.emitting, "wake stops when rowing stops")
	var output := ProjectSettings.globalize_path("res://../../output/godot-pecio-layers-20261114/environment-tests.json")
	FileAccess.open(output, FileAccess.WRITE).store_string(JSON.stringify({"passed": passed, "failures": failures, "presets": 12, "zones_per_preset": zones.size(), "collision_shapes": initial_collisions, "meshes": initial_meshes, "fps_measured": false}, "\t"))
	print("SHIP ENVIRONMENT: ", passed, " PASS / ", failures.size(), " FAIL")
	main.free()
	quit(0 if failures.is_empty() else 1)
