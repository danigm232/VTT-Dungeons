extends SceneTree
## Audits the campaign actors. --capture records the same view before and after.
const Catalogue = preload("res://combat/combat_catalogue.gd")
const Registry = preload("res://characters/registry.gd")
const Facing = preload("res://sprites/sprite_facing.gd")
const Legacy = preload("res://scripts/character_sprite_catalog.gd")
var errors: Array[String] = []
var checks := 0
var capture := false
var output: String

func _initialize() -> void:
	_run.call_deferred()

func check(ok: bool, label: String) -> void:
	checks += 1
	if not ok:
		errors.append(label)
		printerr("FAIL: ", label)

func _run() -> void:
	capture = "--capture" in OS.get_cmdline_user_args()
	output = ProjectSettings.globalize_path("res://../../output/stormwreck-beasts-20261126")
	DirAccess.make_dir_recursive_absolute(output)
	root.size = Vector2i(1440, 810)
	var scene = load("res://scenes/main.tscn").instantiate()
	var camera: Camera3D = scene.get_node("TacticalCamera")
	camera.set("persist_preferences", false)
	root.add_child(scene)
	current_scene = scene
	for index in range(8):
		await process_frame
	var ui = scene.vtt_ui
	var combat = ui.combat_controller
	var ghoul: Node3D = combat.token("ghoul_c8")
	var harpy: Node3D = combat.token("harpy")
	var second: Node3D = combat.token("harpy_c2_lvl2")
	check(is_instance_valid(ghoul) and is_instance_valid(harpy) and is_instance_valid(second), "three canonical actors present")
	if not errors.is_empty():
		_finish()
		return
	check(combat.token("harpy-2") == null, "no duplicate reinforcement in C2")
	check(harpy != second and not second.visible, "separate bodies; C2 starts hidden")
	check(second.get("collision").disabled and not second.is_physics_processing(), "hidden C2 has no collision")
	var actions: Array = combat.rules.actors.ghoul_c8.actions
	check(actions.any(func(action): return action.id == "ghoul-claws") and actions.any(func(action): return action.id == "ghoul-bite"), "both ghoul attacks reach the DM")
	for action in actions:
		if action.id in ["ghoul-claws", "ghoul-bite"]:
			var expected := "claw" if action.id == "ghoul-claws" else "bite"
			check(combat.visuals.pose_for(ghoul, action, "se") == expected, "distinct event pose for " + str(action.id))
	check(ghoul.get("char_key") == "sw-ghoul", "real C8 actor uses the ghoul definition")
	for dir in Facing.DIRECTIONS:
		for state in ["walk", "run", "stealth", "claw", "bite", "crawl", "fall", "stand", "hit"]:
			check(_unique_frames(ghoul._pick_clip_from_profile(state, dir)) == 8, "%s %s has eight decoded poses" % [state, dir])
		check(_unique_frames(ghoul._pick_clip_from_profile("defeated", dir)) == 1, "corpse pose " + dir)
	check(ghoul._pick_clip_from_profile("walk", "nw").get("modular_definition") == "sw-ghoul-walk-nw", "rear walk uses own drawings")
	check(ghoul._pick_clip_from_profile("walk", "sw").get("flip_h", false), "front southwest reflects southeast")
	for actor in [harpy, second]:
		for pose: String in ["fly", "walk", "attack", "attack_club", "takeoff", "land", "song"]:
			check(_unique_frames(actor._pick_clip_from_profile(pose, "e")) == 8, "%s %s" % [actor.name, pose])
		check(actor._pick_clip_from_profile("flight_turn", "e").get("modular_definition") == "sw-harpy-flight-turn-e", "%s selects the edited bank" % actor.name)
		check(_unique_frames(actor._pick_clip_from_profile("flight_turn", "n")) == 8, "%s flies in alternate view" % actor.name)
		check(Catalogue.actions(str(actor.get_meta("combat_id"))).any(func(action): return action.id == "harpy-multiattack"), "%s owns multiattack" % actor.name)
	if capture:
		ui.clock_running = false
		ui.audio_muted = true
		ui.set_role("dm")
		for body in ui.tokens_by_node.values():
			body.set_physics_process(false)
		camera.set_process(false)
		camera.set_physics_process(false)
		camera.projection = Camera3D.PROJECTION_ORTHOGONAL
		camera.size = 4.35
		var roof = scene.find_child("RoofCutout", true, false)
		roof.set_interior_mode("lower_c8_bilge", true)
		ghoul.visible = true
		_focus(camera, ghoul)
		var profile: Dictionary = ghoul.char_profile
		ghoul.char_key = "cleric"
		ghoul.char_profile = Legacy.get_character_clips("cleric")
		_pose(ghoul, "idle", "se", 0)
		await _save("gul-antes")
		ghoul.char_key = "sw-ghoul"
		ghoul.char_profile = profile
		_pose(ghoul, "idle", "se", 0)
		await _save("gul-despues")
		for state: String in ["walk", "claw", "bite", "crawl", "fall", "hit"]:
			_pose(ghoul, state, "se", 5)
			await _save("gul-" + state)
		roof.set_interior_mode("exterior", true)
		second.set_meta("adventure_present", true)
		second.set_meta("npc_reinforcement_visible", true)
		second.visible = true
		_focus(camera, second)
		_pose(second, "fly", "e", 4)
		await _save("arpia-antes")
		_pose(second, "flight_turn", "e", 4)
		await _save("arpia-despues")
		var bank: Dictionary = second._pick_clip_from_profile("flight_turn", "e")
		check(second.sprite.texture == bank.frames[4].tex, "C2 capture preserves east bank frame 5")
		_pose(second, "land", "e", 5)
		await _save("arpia-land")
		second.set_meta("adventure_present", false)
		second.hide()
	harpy.set_physics_process(false)
	ui._apply_harpy_world_presence(false, false)
	ui._apply_harpy_world_presence(true, false)
	check(harpy.get("current_anim") == "flight_turn", "arrival starts with turn")
	await create_timer(0.72).timeout
	check(harpy.get("current_anim") == "land", "arrival ends with landing")
	_finish()

func _unique_frames(clip: Dictionary) -> int:
	var textures := {}
	for frame: Dictionary in clip.get("frames", []):
		if frame.tex != null:
			textures[frame.tex.get_instance_id()] = true
	return textures.size()

func _focus(camera: Camera3D, body: Node3D) -> void:
	var target := body.global_position + Vector3.UP * .78
	camera.global_position = target + Vector3(0.0, 2.45, 5.8)
	camera.look_at(target)

func _pose(body: Node3D, state: String, direction: String, frame: int) -> void:
	body._resolve_and_apply_clip(state, direction, true)
	body.anim_frame_idx = frame
	body.update_sprite_frame()
	body._apply_procedural_motion(0, Vector2.ZERO, state)

func _save(key: String) -> void:
	await process_frame
	await RenderingServer.frame_post_draw
	var image := root.get_texture().get_image()
	check(image != null and image.save_png(output.path_join(key + ".png")) == OK, "captured " + key)

func _finish() -> void:
	var revision: String = Registry.data().get("beast_revision", "")
	var report := {"revision": revision, "passed": errors.is_empty(), "checks": checks, "errors": errors}
	var file := FileAccess.open(output.path_join("native-render.json" if capture else "native-rules.json"), FileAccess.WRITE)
	file.store_string(JSON.stringify(report) + "\n")
	print("STORMWRECK BEASTS ", JSON.stringify(report))
	quit(0 if errors.is_empty() else 1)
