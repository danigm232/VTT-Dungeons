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
	capture = "--capture" in OS.get_cmdline_user_args()
	for arg in OS.get_cmdline_user_args():
		if arg in ["--vfx-before", "--vfx-after"]:
			effect_pass = arg.trim_prefix("--vfx-")
	folder = ProjectSettings.globalize_path("res://../../output/stormwreck-aquatic" if effect_pass.is_empty() else "res://../../output/stormwreck-aquatic/vfx")
	DirAccess.make_dir_recursive_absolute(folder)
	root.size = Vector2i(1440,810)
	check(State.breath_capacity(6) == 30.0 and State.breath_capacity(10) == 60.0 and State.breath_capacity(14) == 180.0, "2024 breath formula and thirty-second minimum")
	var body_state := State.new()
	body_state.sample(1.0, false, false, 0.32, 1.6, "clear", false)
	check(is_equal_approx(body_state.wetness, 0.2) and not body_state.submerged, "wading only wets immersed fraction")
	body_state.sample(1.0, true, false, 1.6, 1.6, "clear", false)
	check(body_state.submerged and body_state.wetness == 1.0, "diving saturates clothes independently of sprite")
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
	body_state.wetness = 1.0
	body_state.sample(10.0, false, false, 0.0, 1.6, "clear", false)
	check(wet_rain > body_state.wetness, "clothes dry faster in clear weather")
	_check_combat()
	await _check_map()
	var report := {"checks":checks, "passed":errors.is_empty(), "errors":errors, "scope":"stormwreck-aquatic", "revision":Registry.data().get("aquatic_revision", "")}
	var report_name := "native-render.json" if capture else "native-rules.json"
	if not effect_pass.is_empty():
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
