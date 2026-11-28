extends SceneTree

const State = preload("res://scripts/aquatic_state.gd")
const Rules = preload("res://combat/combat_rules.gd")
const Registry = preload("res://characters/registry.gd")
const LegacySprites = preload("res://sprites/sprite_library.gd")

var checks := 0
var errors: Array[String] = []
var capture := false
var folder: String
var effect_pass := ""

func _initialize() -> void:
	_run.call_deferred()

func check(condition: bool, message: String) -> void:
	checks += 1
	if not condition:
		errors.append(message)
		printerr("FAIL: ", message)

func _run() -> void:
	var args := OS.get_cmdline_user_args()
	capture = "--capture" in args
	var wet_rules := "--wet-rules" in args
	for arg in args:
		if arg == "--actor-light":
			await _check_actor_light()
			quit(0 if errors.is_empty() else 1)
			return
		if arg in ["--wet-before", "--wet-after"]:
			await _check_wet_surface(arg.trim_prefix("--wet-"))
			quit(0 if errors.is_empty() else 1)
			return
		if arg in ["--vfx-before", "--vfx-after"]:
			effect_pass = arg.trim_prefix("--vfx-")
	var output := "res://../../output/stormwreck-aquatic"
	if wet_rules:
		output += "/wetness"
		effect_pass = "after"
	elif not effect_pass.is_empty():
		output += "/vfx"
	folder = ProjectSettings.globalize_path(output)
	DirAccess.make_dir_recursive_absolute(folder)
	root.size = Vector2i(1440,810)
	check(State.breath_capacity(6) == 30.0 and State.breath_capacity(10) == 60.0 and State.breath_capacity(14) == 180.0, "2024 breath formula and thirty-second minimum")
	var body_state := State.new()
	body_state.sample(1.0, false, false, 0.32, 1.6, "clear", false)
	check(body_state.wet_lower.x > 0.99 and body_state.wet_lower.y > 0.50
		and body_state.wet_lower.z == 0.0 and body_state.wet_upper == Vector4.ZERO
		and not body_state.submerged, "ankle-depth wading wets only the lower bands and leaves the torso dry")
	body_state.sample(1.0, false, false, 1.15, 1.6, "clear", false)
	check(body_state.wet_upper.x > 0.99 and body_state.wet_upper.z == 0.0, "higher water wets the waist and chest before the head")
	body_state.sample(1.0, true, false, 1.6, 1.6, "clear", false)
	check(body_state.submerged and body_state.wet_lower == Vector4.ONE and body_state.wet_upper == Vector4.ONE,
		"diving saturates all bands independently of sprite")
	body_state.update_breath(12, false, 114.0)
	check(body_state.air_remaining == 6.0 and body_state.suffocation_exhaustion == 0, "uses CON to count down")
	body_state.update_breath(12, false, State.COMBAT_TURN_SECONDS, true)
	check(body_state.air_remaining == 0.0 and body_state.suffocation_exhaustion == 1, "exhaustion applies at the end of the actor turn")
	body_state.update_breath(12, false, 12.0)
	check(body_state.suffocation_exhaustion == 3, "two further six-second intervals in exploration")
	body_state.take_air()
	body_state.update_breath(12, false, 0.0)
	check(body_state.air_remaining == 120.0 and body_state.suffocation_exhaustion == 0, "air pocket restores breath and removes suffocation")
	body_state.sample(10.0, false, false, 0.0, 1.6, "rain", false)
	var wet_rain := body_state.wetness
	body_state.sample(1.0, false, true, 1.6, 1.6, "clear", false)
	body_state.sample(10.0, false, false, 0.0, 1.6, "clear", false, "night")
	var wet_night := body_state.wetness
	body_state.sample(1.0, false, true, 1.6, 1.6, "clear", false)
	body_state.sample(10.0, false, false, 0.0, 1.6, "clear", false)
	check(wet_rain > body_state.wetness, "clothes dry faster in clear weather")
	check(wet_night > body_state.wetness and body_state.wet_lower.x > body_state.wet_upper.w, "night slows drying and boots hold water longer")
	body_state.sample(1.0, false, false, 0.18, 1.6, "clear", true)
	check(body_state.wet_lower.x > body_state.wet_upper.w and body_state.wet_upper.w > 0.0,
		"returning to shallow water preserves previous dampness higher on the body")
	body_state = State.new()
	body_state.sample(12.0, false, false, 0.0, 1.6, "rain", true)
	check(body_state.wetness == 0.0, "rain cannot wet clothes under cover")
	body_state.sample(12.0, false, false, 0.0, 1.6, "rain", false)
	check(body_state.wet_upper.w > body_state.wet_lower.x, "rain wets exposed shoulders before boots")
	body_state.sample(60.0, false, false, 0.0, 1.6, "clear", false)
	check(body_state.wet_height() == 0.0 and body_state.wetness == 0.0, "all bands return to dry")
	body_state.sample(1.0, true, false, State.SURFACE_FOOT_OFFSET, 1.6, "clear", false)
	check(body_state.wet_upper.y == 1.0 and body_state.wet_upper.w == 0.0 and not body_state.submerged,
		"swimming horizontally wets the torso and leaves the head above water")
	_check_combat()
	await _check_map()
	var report := {"checks":checks, "passed":errors.is_empty(), "errors":errors, "scope":"stormwreck-aquatic", "revision":Registry.data().get("aquatic_revision", "")}
	var report_name := "native-render.json" if capture else "native-rules.json"
	if not effect_pass.is_empty() and not wet_rules:
		report_name = effect_pass + "-" + report_name
	var file := FileAccess.open(folder.path_join(report_name), FileAccess.WRITE)
	file.store_string(JSON.stringify(report) + "\n")
	print("AQUATIC AUDIT ", JSON.stringify(report))
	quit(0 if errors.is_empty() else 1)

func _check_combat() -> void:
	var rules := Rules.new()
	var attacks := [
		{"id":"blade", "label":"Blade", "attackBonus":3, "damageType":"cortante", "range":{"kind":"melee","normalMeters":1.5}},
		{"id":"pike", "label":"Pike", "attackBonus":3, "damageType":"perforante", "range":{"kind":"melee","normalMeters":1.5}},
		{"id":"bow", "label":"Bow", "attackBonus":3, "damageType":"perforante", "range":{"kind":"ranged","normalMeters":2.0,"longMeters":9.0}},
	]
	rules.register({"id":"a","underwater":true,"swimming":true},attacks)
	rules.register({"id":"b","kind":"enemy","position":Vector3(1.3,0,0),"underwater":true})
	rules.start(["a","b"])
	rules.submit_initiative("a",20)
	rules.submit_initiative("b",10)
	check(rules.spend_movement("a",1.0) and rules.actors.a.movement == 7.0, "swimming without a swimming speed doubles movement cost")
	check(rules.declare("a","blade","b") and "desventaja" in rules.pending.label, "non-piercing underwater weapon attacks have disadvantage")
	rules.cancel()
	check(rules.declare("a","pike","b") and not ("desventaja" in rules.pending.label), "piercing melee weapon bypasses water penalty")
	rules.cancel()
	rules.actors.a.actions[0]["magical"] = true
	rules.actors.a.actions[0]["animationType"] = "melee"
	check(rules.declare("a","blade","b") and "desventaja" in rules.pending.label, "a magical blade remains a weapon for the underwater rule")
	rules.cancel()
	rules.actors.b.position = Vector3(6,0,0)
	check(rules.declare("a","bow","b") and rules.pending.kind == "blocked", "long range underwater missile misses without a die")
	rules.cancel()
	rules.damage("b",6,"fuego")
	check(rules.actors.b.hp == 7, "underwater fire resistance halves fire damage")
	rules.set_suffocation_level("a",2)
	check(rules.effective_speed("a") == 6.0 and rules._attack_modifier("a",attacks[0]) == -1, "suffocation applies speed and d20 penalties")
	check(rules.actors.a.movement == 4.0, "suffocation changes remaining movement without undoing the part already spent")
	rules.set_suffocation_level("a",0)
	check(rules.actors.a.movement == 7.0, "breathing restores the movement allowance for the rest of the turn")

func _check_map() -> void:
	var scene = load("res://scenes/main.tscn").instantiate()
	scene.get_node("TacticalCamera").set("persist_preferences", false)
	root.add_child(scene)
	current_scene = scene
	for frame in range(8):
		await process_frame
	var ui = scene.vtt_ui
	ui.clock_running = false
	ui.audio_muted = true
	ui.set_role("player")
	var combat = ui.combat_controller
	var registered: Dictionary = Registry.data().get("animations", {})
	for id in ["mia","mike","maria"]:
		var body: PlayerToken = combat.token(id)
		body._update_aquatic_breath(0.0)
		check(body.aquatic.air_remaining == (180.0 if id == "mia" else 120.0), "%s breath uses active sheet CON" % id)
		for pair in [["swim","w"],["dive","e"]]:
			var loaded: Dictionary = body._pick_clip_from_profile(pair[0], pair[1])
			check(loaded.get("frames", []).size() == 8 and str(loaded.get("modular_definition", "")).begins_with("sw-" + id), "%s %s uses eight authored phases" % [id, pair[0]])
		if capture:
			continue
		for definition: Dictionary in registered.values():
			if definition.get("character", "") != id or definition.get("action", "") not in ["swim","dive","open_door","open_chest","dive_chest","stow_item"]:
				continue
			var clip: Dictionary = body._pick_clip_from_profile(definition.action, definition.direction)
			var distinct := {}
			for pose: Dictionary in clip.get("frames", []):
				if pose.get("tex"):
					distinct[pose.tex.get_instance_id()] = true
			check(clip.get("modular_definition", "") == definition.id and distinct.size() == 8, "%s decodes and selects all registered frames" % definition.id)
	check(Registry._water_clips.size() <= Registry.WATER_CLIP_CACHE_LIMIT, "water poses are decoded on demand in a bounded cache")
	var hero: PlayerToken = ui.get_active_token_node()
	var dry_deck := hero.global_position
	check(hero is PlayerToken and not hero.toggle_dive(), "no depth toggle on dry deck")
	var door := scene.find_child("DoorC5", true, false) as InteractiveDoor
	var door_was_open := door.is_open
	hero.global_position = door.global_position + Vector3.LEFT * 1.05
	door.is_player_nearby = true
	door.interact_or_toggle()
	check(door.is_open != door_was_open and hero.action_anim_name == "open_door", "the C5 door uses the handle-facing interaction")
	var dry_chest := scene.find_child("PropChestC6", true, false) as InteractiveProp
	var dry_lid := dry_chest.get_parent().find_child("AnimationPlayer", true, false) as AnimationPlayer
	hero.global_position = dry_chest.global_position + Vector3.LEFT * 1.0
	dry_chest.nearby_player = hero
	dry_chest.interact()
	check(dry_lid.assigned_animation == "open" and hero.action_anim_name == "open_chest", "the C6 chest opens with its own gesture")
	var pickup := scene.find_child("PickupPotionC5", true, false) as InteractivePickup
	hero.global_position = pickup.global_position + Vector3.LEFT * 0.8
	pickup.nearby_player = hero
	pickup.collect()
	check(not pickup.visible and hero.action_anim_name == "stow_item", "the pickup hides and plays the bag gesture after collection")
	hero.play_action_animation("idle")
	hero.global_position = Vector3(32.5,-3.55,12.0)
	await create_timer(0.7).timeout
	check(hero.aquatic.surface_available and not hero.aquatic.submerged, "ocean surface is breathable")
	hero.input_override = Vector2.LEFT
	await create_timer(0.34).timeout
	check(hero.aquatic_effects.wake.emitting and not hero.aquatic_effects.bubbles.emitting, "surface movement makes a wake independently of deep water bubbles")
	if capture:
		hero.facing_dir = "w"
		await _compare_surface(scene.get_node("TacticalCamera"), hero)
	hero.input_override = Vector2.ZERO
	check(ui.toggle_aquatic_depth(), "same toggle invoked from keyboard and HUD")
	await create_timer(1.3).timeout
	check(hero.aquatic.submerged and hero.current_anim == "dive" and hero.aquatic_effects.bubbles.emitting, "open sea reaches a submerged pose and independent bubbles")
	check(ui.player_hud.dive_btn.visible and ui.player_hud.dive_btn.text == "Emerger", "player has a contextual ascent button")
	var camera: Camera3D = scene.get_node("TacticalCamera")
	var original_rotation := camera.rotation
	var heading := hero.facing_dir
	var phase := hero.anim_frame_idx
	camera.rotate_y(PI / 4.0)
	hero._process_pose_visuals(0.0, Vector2.ZERO, "dive")
	check(hero.facing_dir == heading and hero.anim_frame_idx == phase, "camera orbit preserves diver heading and phase")
	camera.rotation = original_rotation
	if capture:
		hero.facing_dir = "e"
		await _save(scene.get_node("TacticalCamera"), hero, "buceo")
		if not effect_pass.is_empty():
			await _save(camera, hero, "buceo-" + effect_pass)
	if effect_pass == "after":
		var effects = hero.aquatic_effects
		var other: PlayerToken = combat.token("mike")
		check(effects.bubbles.draw_pass_1 == other.aquatic_effects.bubbles.draw_pass_1
			and effects.bubbles.process_material == other.aquatic_effects.bubbles.process_material,
			"heroes share their bubble geometry and particle material")
		check(effects.bubbles.draw_pass_1 is QuadMesh and effects.bubbles.fixed_fps == 30,
			"bubbles use one flat quad and a capped simulation rate")
		effects.update_water(0.0, 0.0, Vector3.ZERO, false, hero.aquatic, true)
		check(effects.bubbles.emitting and effects.bubbles.amount_ratio > 0.0 and effects.bubbles.amount_ratio < 1.0,
			"reduced effects keep a lighter visible bubble trail")
	var ascend_key := InputEventKey.new()
	ascend_key.keycode = KEY_U
	ascend_key.pressed = true
	ui._unhandled_input(ascend_key)
	await create_timer(1.3).timeout
	check(hero.aquatic.surface_available and not hero.aquatic.submerged and not hero.aquatic_effects.bubbles.emitting, "ascent returns to the real sea surface")
	if not effect_pass.is_empty():
		hero.global_position = dry_deck
		hero.velocity = Vector3.ZERO
		await create_timer(0.52).timeout
		check(hero.aquatic.wetness > 0.7 and not hero.in_water, "water exit leaves the hero soaked on deck")
		if effect_pass == "after":
			check(hero.aquatic_effects.drips != null and hero.aquatic_effects.drips.emitting,
				"coming out of the water emits drops on dry deck")
		if capture:
			hero.facing_dir = "se"
			await _save(camera, hero, "salida-" + effect_pass)
	hero.global_position = Vector3(-20.69,-6.38,-3.2)
	await create_timer(0.55).timeout
	check(hero.aquatic.submerged and not hero.aquatic.surface_available, "C9 uses its existing hatch and air pockets")
	if effect_pass == "after":
		check(hero.aquatic_effects.drips != null and not hero.aquatic_effects.drips.emitting,
			"wet clothes stop dripping when the hero re-enters the water")
	var chest = scene.find_child("PropIronChestC9", true, false)
	check(chest != null and scene.canon_ctrl._c9_chest_mechanism() != null, "C9 retains the original animated chest model")
	scene.canon_ctrl._collect_c9_chest(true)
	check(hero.action_anim_name == "dive_chest", "C9 opening gesture begins only when the underwater route is chosen")
	check(scene.canon_ctrl._c9_chest_mechanism().assigned_animation == "open", "the original C9 lid moves with the underwater interaction")
	if capture:
		scene.find_child("RoofCutout", true, false).set_interior_mode("lower_c9_hold", true)
		if is_instance_valid(scene.canon_ctrl._modal):
			scene.canon_ctrl._modal.hide()
		await create_timer(0.38).timeout
		var focus: Vector3 = hero.global_position.lerp(chest.global_position, 0.5) + Vector3.UP * 0.48
		camera.global_position = focus + Vector3(0.0, 1.65, 2.8)
		camera.look_at(focus)
		camera.size = 3.8
		await _capture_frame("cofre-c9")

func _check_actor_light() -> void:
	folder = ProjectSettings.globalize_path("res://../../output/stormwreck-aquatic/actor-light")
	DirAccess.make_dir_recursive_absolute(folder)
	root.size = Vector2i(1440, 810)
	var scene = load("res://scenes/main.tscn").instantiate()
	var camera: Camera3D = scene.get_node("TacticalCamera")
	camera.set("persist_preferences", false)
	root.add_child(scene)
	current_scene = scene
	await create_timer(0.8).timeout
	var ui = scene.vtt_ui
	ui.clock_running = false
	ui.audio_muted = true
	ui.set_role("player")
	var hero: PlayerToken = ui.get_active_token_node()
	ui.set_env_time("day")
	ui.set_env_weather("clear")
	await create_timer(0.6).timeout
	var deck := hero.global_position
	hero.set_physics_process(false)
	_focus(camera, hero)
	camera.size = 3.6
	hero._resolve_and_apply_clip("idle", "se", true)
	hero.anim_frame_idx = 0
	hero.update_sprite_frame()
	hero._apply_procedural_motion(0.0, Vector2.ZERO, "idle")
	var env := scene.get_node("ShipEnvironment") as ShipEnvironment
	var fill_day := float(hero.sprite_material.get_shader_parameter("bounce_energy"))
	check(hero.sprite.layers == 1 and env.sun.light_cull_mask & hero.sprite.layers != 0, "deck actor receives actual sun and moon")
	check(hero.contact_shadow.visible and hero.sprite.cast_shadow != GeometryInstance3D.SHADOW_CASTING_SETTING_OFF, "actor has both contact and projected shadows")
	await _capture_frame("cubierta-dia")
	ui.set_env_time("dusk")
	await _capture_frame("cubierta-ocaso")
	ui.set_env_time("night")
	ui.set_env_weather("storm")
	await create_timer(0.55).timeout
	check(float(hero.sprite_material.get_shader_parameter("bounce_energy")) < fill_day and env.sun.light_energy < 0.5, "night storm changes shadow source and sprite fill")
	await _capture_frame("cubierta-tormenta")
	ui.set_env_time("day")
	ui.set_env_weather("clear")
	env.set_weather("clear", true)
	await create_timer(.25).timeout
	hero.aquatic = State.new()
	hero.aquatic.sample(1.0, false, true, hero.target_height, hero.target_height, "clear", false)
	hero.aquatic.sample(0.5, false, false, 0.0, hero.target_height, "clear", true)
	hero._apply_procedural_motion(0.0, Vector2.ZERO, "idle")
	var effects := hero.get_node("CharacterVisual/BodyStateSurface") as MeshInstance3D
	await process_frame
	check(not effects.visible and hero.sprite_material.get_shader_parameter("wet_upper").w > .95, "soaked alpha comes only from the original sprite material")
	await _capture_frame("cubierta-empapado")
	hero.contact_shadow.hide()
	await _capture_frame("sombra-sin-contacto")
	hero.contact_shadow.show()
	await _capture_frame("sombra-contacto")
	hero.global_position = deck + Vector3(4.5, 0.0, 1.1)
	hero._update_floor_shadow(1.0)
	var shadow_focus := hero.global_position + Vector3(.65, .3, -.7)
	camera.global_position = shadow_focus + Vector3(3.6, 4.5, 4.0)
	camera.look_at(shadow_focus)
	camera.size = 6.0
	await create_timer(.3).timeout
	hero.sprite.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	await _capture_frame("sombra-sin-proyectar")
	hero.sprite.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_DOUBLE_SIDED
	await _capture_frame("sombra-proyectada")
	hero.global_position = deck
	_focus(camera, hero)
	camera.size = 3.6
	hero.aquatic.sample(1.0, false, true, hero.target_height, hero.target_height, "clear", false)
	hero.aquatic_effects.update_water(0.0, 0.0, Vector3.ZERO, false, hero.aquatic, false)
	hero.aquatic.sample(0.02, false, false, 0.0, hero.target_height, "clear", false)
	hero.aquatic_effects.update_water(0.0, 0.0, Vector3.ZERO, false, hero.aquatic, false)
	hero.set_physics_process(true)
	await create_timer(0.36).timeout
	hero.set_physics_process(false)
	hero._resolve_and_apply_clip("idle", "se", true)
	hero.anim_frame_idx = 0
	hero.update_sprite_frame()
	hero._apply_procedural_motion(0.0, Vector2.ZERO, "idle")
	var trail := hero.wet_footprints
	var slots := trail.CAPACITY
	check(trail.multimesh != null and trail._moisture[slots] > 0.5 and trail._moisture[slots + 1] == 0.0,
		"fully wet actor has one puddle before taking a step")
	if trail.multimesh:
		trail.hide()
		await _capture_frame("salida-sin-charco")
		trail.show()
		await _capture_frame("salida-charco")
		hero.set_physics_process(true)
		hero.input_override = Vector2.LEFT
		await create_timer(0.42).timeout
		hero.input_override = Vector2.ZERO
		hero.set_physics_process(false)
		check(trail._moisture[0] > 0.14 and trail._moisture[slots + 1] > 0.45, "first dry steps leave both prints and more puddles")
		var trail_focus := deck.lerp(hero.global_position, .55) + Vector3.UP * .22
		camera.global_position = trail_focus + Vector3(0, 3.2, 5.2)
		camera.look_at(trail_focus)
		camera.size = 4.9
		await _capture_frame("pasos-y-charcos")
		trail.set_climate(1.0, 35.0)
		trail._process(0.11)
		check(not trail.is_processing() and trail.multimesh.visible_instance_count == 0, "puddles use the bounded pool and dry away")
	var vessel := hero.get_parent() as Node3D
	var roof := scene.find_child("RoofCutout", true, false) as RoofCutoutController
	var ghoul: PlayerToken = vessel.get_node("GhoulToken")
	hero.aquatic = State.new()
	hero.aquatic_effects.update_water(12.0, 0.0, Vector3.ZERO, false, hero.aquatic, false)
	hero.set_torch_mode(false, false)
	for example in [
		["c4", "aft_c4_port", Vector3(-19.0, -0.18, -3.3), hero],
		["c8", "lower_c8_bilge", Vector3(-17.0, -3.2, -0.4), ghoul],
		["c9", "lower_c9_hold", Vector3(-20.69, -6.38, -3.2), hero],
	]:
		var actor: PlayerToken = example[3]
		actor.set_physics_process(false)
		actor.global_position = vessel.to_global(example[2])
		actor.show()
		var pose := "idle"
		if example[0] == "c8":
			hero.global_position = vessel.to_global(Vector3(-22.0, -3.2, 0.0))
			hero.hide()
		elif example[0] == "c9":
			pose = "dive"
			hero.in_water = true
			hero.aquatic.sample(1.0, false, true, hero.target_height, hero.target_height, "clear", true)
			hero.aquatic_effects.update_water(0.0, 0.0, Vector3.ZERO, false, hero.aquatic, false)
		actor._resolve_and_apply_clip(pose, "se", true)
		actor.anim_frame_idx = 0
		actor.update_sprite_frame()
		actor._apply_procedural_motion(0.0, Vector2.ZERO, pose)
		roof.set_interior_mode(example[1], true)
		actor._update_floor_shadow(1.0)
		_focus(camera, actor)
		camera.size = 4.6
		await _capture_frame(str(example[0]))
		check(actor.sprite.layers == int({"c4":2, "c8":32, "c9":64}[example[0]]), "actor is lit in its local compartment " + str(example[0]))
		if example[0] == "c9":
			actor.set_torch_mode(true, false)
			await _capture_frame("c9-luz-portada")
	var audited := 0
	for actor: PlayerToken in env.actors:
		check(actor.sprite.material_override == actor.sprite_material
			and actor.sprite.cast_shadow == GeometryInstance3D.SHADOW_CASTING_SETTING_DOUBLE_SIDED,
			"all registered actor sprites use the same lighting and shadow contract: " + actor.name)
		audited += 1
	check(audited >= 12, "the existing player and creature tokens are registered")
	var result := {"checks": checks, "passed": errors.is_empty(), "errors": errors}
	FileAccess.open(folder.path_join("native-actors.json"), FileAccess.WRITE).store_string(JSON.stringify(result) + "\n")
	print("ACTOR LIGHT ", JSON.stringify(result))
	scene.queue_free()
	await process_frame

func _check_wet_surface(pass_name: String) -> void:
	folder = ProjectSettings.globalize_path("res://../../output/stormwreck-aquatic/wetness")
	DirAccess.make_dir_recursive_absolute(folder)
	root.size = Vector2i(1440, 810)
	var scene = load("res://scenes/main.tscn").instantiate()
	var camera: Camera3D = scene.get_node("TacticalCamera")
	camera.set("persist_preferences", false)
	root.add_child(scene)
	current_scene = scene
	await create_timer(0.8).timeout
	var ui = scene.vtt_ui
	ui.clock_running = false
	ui.audio_muted = true
	ui.set_role("player")
	ui.set_env_time("day")
	ui.set_env_weather("clear")
	await create_timer(0.7).timeout
	var hero: PlayerToken = ui.get_active_token_node()
	var deck := hero.global_position
	hero.set_physics_process(false)
	_focus(camera, hero)
	camera.size = 3.6
	var direction := "se"
	hero._resolve_and_apply_clip("idle", direction, true)
	hero.anim_frame_idx = 0
	hero.update_sprite_frame()
	for depth: float in [0.0, 0.32, 0.72, 1.0]:
		hero.aquatic = State.new()
		hero.aquatic.sample(1.0, false, depth == 1.0, depth * hero.target_height, hero.target_height, "clear", true)
		hero.aquatic.sample(0.5, false, false, 0.0, hero.target_height, "clear", true)
		hero._apply_procedural_motion(0.0, Vector2.ZERO, "idle")
		var title: String = {0.0:"seco", 0.32:"vadeo", 0.72:"pecho", 1.0:"inmersion"}[depth]
		if pass_name == "after":
			ui.player_hud.refresh_aquatic_status(hero)
			var labels := {0.32:"Piernas mojadas", 0.72:"Ropa mojada", 1.0:"Empapado"}
			var correct: bool = ui.player_hud.air_lbl.text == labels.get(depth) if depth > 0.0 else not ui.player_hud.air_lbl.visible
			check(correct, "%s displays its correct moisture label" % title)
		await _capture_frame(title + "-" + pass_name)
	if pass_name == "after":
		await _check_wet_footprints(hero, camera)
		for id in ["mike", "maria"]:
			var peer: PlayerToken = ui.combat_controller.token(id)
			peer.set_physics_process(false)
			peer.aquatic.sample(1.0, false, true, peer.target_height, peer.target_height, "clear", true)
			peer._sync_sprite_wetness()
			var surface := peer.get_node("CharacterVisual/BodyStateSurface") as MeshInstance3D
			check(not surface.visible and peer.sprite_material.get_shader_parameter("wet_upper") == Vector4.ONE, "%s shares the wet sprite material path without a second silhouette" % id)
	var result := {"checks": checks, "passed": errors.is_empty(), "errors": errors}
	FileAccess.open(folder.path_join("native-" + pass_name + ".json"), FileAccess.WRITE).store_string(JSON.stringify(result) + "\n")
	print("WET SURFACE ", pass_name, " deck=", deck, " checks=", checks, " errors=", errors)

func _check_wet_footprints(hero: PlayerToken, camera: Camera3D) -> void:
	var trail := hero.wet_footprints
	var origin := hero.global_position
	hero.set_physics_process(true)
	await create_timer(0.25).timeout
	check(trail.multimesh == null, "standing soaked on the deck allocates no footprint batch")
	hero.input_override = Vector2.LEFT
	await create_timer(0.51).timeout
	hero.input_override = Vector2.ZERO
	hero.set_physics_process(false)
	check(hero.global_position.distance_to(origin) > 0.7, "the fixture travels across the live C1 deck")
	check(trail.multimesh != null and trail.multimesh.visible_instance_count >= 2, "real grounded steps leave consecutive wet footprints")
	if trail.multimesh == null or trail.multimesh.visible_instance_count < 2:
		return
	var first := trail.multimesh.get_instance_transform(0)
	var second := trail.multimesh.get_instance_transform(1)
	check(first.origin.distance_to(second.origin) > 0.24 and trail._sides[0] != trail._sides[1],
		"left and right footprints stay at distinct supports")
	var center := origin.lerp(hero.global_position, 0.55) + Vector3.UP * 0.25
	camera.global_position = center + Vector3(0,3.2,5.2)
	camera.look_at(center)
	camera.size = 4.9
	hero._resolve_and_apply_clip("idle", "se", true)
	hero._apply_procedural_motion(0.0, Vector2.ZERO, "idle")
	trail.hide()
	await _capture_frame("huellas-before")
	trail.show()
	await _capture_frame("huellas-after")
	var state := State.new()
	state.sample(0.0, false, false, 0.0, 1.6, "clear", false)
	var sun := state.drying_factor
	state.sample(0.0, false, false, 0.0, 1.6, "rain", false, "night")
	var rain := state.drying_factor
	var original := trail._moisture[0]
	trail.set_climate(rain, 10.0)
	trail._process(0.11)
	var humid_loss := original - trail._moisture[0]
	trail.set_climate(sun, 10.0)
	trail._process(0.11)
	check(humid_loss > 0.0 and humid_loss < original - trail._moisture[0] - humid_loss,
		"existing footprints adjust their fade when the weather and time change")
	trail.set_climate(sun, 24.0)
	trail._process(0.11)
	check(trail.multimesh.visible_instance_count == 0 and not trail.is_processing(), "dry marks disappear and the batch stops updating")
	await _capture_frame("huellas-secas")
	var old_transform := trail.multimesh.get_instance_transform(0)
	trail.record_motion(hero, hero.global_position + Vector3.LEFT, 1.0, false, hero.target_height)
	trail.record_motion(hero, hero.global_position + Vector3.LEFT * 4.0, 1.0, true, hero.target_height)
	check(old_transform == trail.multimesh.get_instance_transform(0) and trail.multimesh.visible_instance_count == 0,
		"water, airborne travel and scene jumps leave no walking prints")

func _save(camera: Camera3D, body: PlayerToken, id: String) -> void:
	_focus(camera, body)
	await _capture_frame(id)

func _capture_frame(id: String) -> void:
	await process_frame
	await RenderingServer.frame_post_draw
	check(root.get_texture().get_image().save_png(folder.path_join(id + ".png")) == OK, "captured " + id)

func _compare_surface(camera: Camera3D, body: PlayerToken) -> void:
	body.set_physics_process(false)
	body.aquatic_effects.wake.speed_scale = 0.0
	_focus(camera, body)
	var before: Dictionary = LegacySprites._row(body.char_key + "-actions", 3, 10.0, true)
	body.active_clip_frames = before.frames
	body.active_clip_flip_h = true
	body.anim_frame_idx = 3
	body.update_sprite_frame()
	body._apply_procedural_motion(0.0, Vector2.ZERO, "swim")
	await _save(camera, body, "superficie-antes")
	body._resolve_and_apply_clip("swim", "w", false)
	body.anim_frame_idx = 3
	body.update_sprite_frame()
	body._apply_procedural_motion(0.0, Vector2.ZERO, "swim")
	await _save(camera, body, "superficie")
	body.aquatic_effects.wake.speed_scale = 1.0
	body.set_physics_process(true)

func _focus(camera: Camera3D, body: PlayerToken) -> void:
	camera.set_process(false)
	camera.set_physics_process(false)
	camera.projection = Camera3D.PROJECTION_ORTHOGONAL
	var look := body.global_position + Vector3(0,0.45,0)
	camera.global_position = look + Vector3(0,3.2,5.2)
	camera.look_at(look)
	camera.size = 4.3
