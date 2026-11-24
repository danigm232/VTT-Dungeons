extends SceneTree
## Runs on the actual map. Without --capture, uses the same fixture headlessly.
const Catalogue = preload("res://combat/combat_catalogue.gd")
const Visuals = preload("res://combat/combat_visuals.gd")
const Overlay = preload("res://combat/combat_overlay.gd")
var folder: String
var project: String
var capture := false
var failures: Array[String] = []
var passed := 0
var records: Array[Dictionary] = []
var coverage: Array[Dictionary] = []
var main: Node3D
var camera: Camera3D
var controller: Node
var hero: Node3D
var target: Node3D

func _initialize() -> void: _run.call_deferred()

func check(result: bool, label: String) -> void:
	if result: passed += 1
	else:
		failures.append(label)
		printerr("COMBAT VISUAL FAIL: " + label)

func _load_baseline(name: String) -> GDScript:
	var script := GDScript.new()
	script.source_code = FileAccess.get_file_as_string(folder.path_join("baseline/" + name + ".gd"))
	if script.reload() != OK: return null
	return script

func _shot(name: String, phase: String) -> void:
	if not capture: return
	await RenderingServer.frame_post_draw
	var image := root.get_texture().get_image()
	var filename := project + "-" + name + "-" + phase + ".png"
	var ok := image.save_png(folder.path_join("captures/" + filename))
	check(ok == OK, "wrote " + filename)
	records.append({"file": filename, "case": name, "phase": phase,
		"camera": str(camera.global_transform), "size": camera.size, "pixels": [image.get_width(), image.get_height()],
		"tokens": [str(hero.global_position), str(target.global_position)]})

func _event(action: Dictionary, hit: bool, amount: int, actor_id := "maria", target_id := "mike") -> Dictionary:
	return {"type": "action", "actor": actor_id, "target": target_id, "action": action, "hit": hit, "amount": amount}

func _action(actor_id: String, action_id: String) -> Dictionary:
	return Catalogue.actions(actor_id).filter(func(action): return action.id == action_id)[0]

func _run() -> void:
	capture = "--capture" in OS.get_cmdline_user_args()
	folder = ProjectSettings.globalize_path("res://../../output/combat-visual-audit-20261124")
	if "--fast-render" in OS.get_cmdline_user_args(): folder = folder.path_join("review")
	var camp := not FileAccess.file_exists("res://scenes/main.tscn")
	var scene_path := "res://scenes/camp_a1_rooms.tscn" if camp else "res://scenes/main.tscn"
	root.size = Vector2i(1280, 720)
	main = load(scene_path).instantiate()
	camera = main.find_child("TacticalCamera", true, false)
	camera.persist_preferences = false
	root.add_child(main)
	current_scene = main
	for index in range(5): await process_frame
	var ui := main.find_child("VttRoleUi", true, false)
	if not is_instance_valid(ui) or not is_instance_valid(ui.combat_controller):
		check(false, "the map exposes the native combat controller"); quit(1); return
	project = "campamentos" if camp else "retiro" if ui.is_retreat else "pecio"
	controller = ui.combat_controller
	ui.audio_muted = true
	ui.clock_running = false
	ui.set_role("player")
	ui.select_player_character("maria")
	ui.player_hud.close_modals()
	ui.player_hud.show_toast("")
	ui.preferences.values["reducedMotion"] = false
	controller.layer.hide()
	hero = controller.token("maria")
	target = controller.token("mike")
	var origin: Node3D = controller.token("mia")
	var basis: Basis = origin.get_parent().global_basis
	var anchor: Vector3 = origin.global_position
	if ui.is_retreat and not camp:
		# Use the platform around Mike's authored spawn. Extending the beach
		# formation to the east intersects the rocks and the stair guard.
		anchor = target.global_position - basis * Vector3(6.3, 0, 0)
		origin.global_position = anchor
	hero.global_position = anchor + basis * Vector3(.8, 0, 0)
	target.global_position = anchor + basis * Vector3(6.3, 0, 0)
	for body in [hero, target, origin]: body.set_physics_process(false)
	camera.set_process(false)
	camera.projection = Camera3D.PROJECTION_ORTHOGONAL
	camera.size = 7.9
	var focus := (hero.global_position + target.global_position) * .5 + Vector3.UP * .8
	camera.global_position = focus + Vector3(0, 9, 21)
	camera.look_at(focus)
	controller._sync_positions()
	if capture:
		DirAccess.make_dir_recursive_absolute(folder.path_join("captures"))
		await _compare()
	else:
		await _verify()
	var result := {"project": project, "checks": passed, "errors": failures, "captures": records, "pose_coverage": coverage}
	DirAccess.make_dir_recursive_absolute(folder)
	FileAccess.open(folder.path_join(project + ("-frames.json" if capture else "-checks.json")), FileAccess.WRITE).store_string(JSON.stringify(result, "\t"))
	print("COMBAT VISUAL AUDIT %s %d checks, %d images, %d failures" % [project, passed, records.size(), failures.size()])
	main.queue_free()
	await process_frame
	await process_frame
	quit(0 if failures.is_empty() else 1)

func _verify() -> void:
	var visuals = controller.visuals
	for actor_id in controller.rules.actors:
		var body: Node3D = controller.token(actor_id)
		if not is_instance_valid(body): continue
		for action in controller.rules.actors[actor_id].actions:
			var poses: Dictionary = {}
			for direction in ["n", "ne", "e", "se", "s", "sw", "w", "nw"]:
				var pose: String = visuals.pose_for(body, action, direction)
				var clip: Dictionary = body._pick_clip_from_profile(pose, direction)
				var frames: Array = clip.get("frames", [])
				check(not frames.is_empty() and frames.all(func(frame): return is_instance_valid(frame.get("tex"))), "%s %s %s has a decoded pose" % [actor_id, action.id, direction])
				poses[direction] = {"clip": pose, "frames": frames.size()}
			coverage.append({"actor": actor_id, "action": action.id, "directions": poses})
	for animation in visuals.cues.profiles.projectiles:
		var action := {"id": "sample", "animationType": animation}
		var calls: Array[int] = []
		visuals.cues.launch(action, hero.global_position + Vector3.UP, target.global_position + Vector3.UP, .10, false, func(): calls.append(1))
		check(calls.is_empty() and visuals.cues.get_child_count() == 1, animation + " displays a traveling shape before contact")
		await create_timer(.18).timeout
		check(visuals.cues.get_child_count() == 0 and calls.size() == 1, animation + " contacts once and frees its model")
	var calls: Array[int] = []
	visuals.cues.launch({"id":"shortbow","animationType":"arrow"}, hero.global_position, target.global_position, .3, true, func(): calls.append(1))
	check(calls.size() == 1 and visuals.cues.get_child_count() == 0, "reduced motion preserves contact without a traveling projectile")
	var arrow := _action("maria", "shortbow")
	visuals.play(_event(arrow, true, 4))
	check(visuals.cues.get_child_count() == 0 and not target.action_anim_name.begins_with("hit"), "receiver waits during wind-up")
	await create_timer(.85).timeout
	check(target.action_anim_name.begins_with("hit") and visuals.cues.find_child("CombatImpact", false, false) != null, "confirmed arrow hit and receiver react at contact")
	await create_timer(.65).timeout
	target.play_action_animation("idle")
	visuals.play(_event(arrow, false, 0))
	await create_timer(.95).timeout
	check(not target.action_anim_name.begins_with("hit") and visuals.cues.find_child("CombatImpact", false, false) == null, "miss does not trigger a wound or an impact")
	await create_timer(.55).timeout
	visuals.play(_event(_action("mike", "ray-of-frost"), true, 4, "mike", "maria"))
	await create_timer(.95).timeout
	check(hero.action_anim_name.begins_with("hit"), "frost uses an existing reaction or documented hit fallback")
	await create_timer(.65).timeout
	var point := hero.global_position + Vector3(2.1, 0, 0)
	controller.rules.effects.append({"actor":"maria", "kind":"fog", "point":point, "radius":6.0})
	await process_frame
	await process_frame
	check(visuals.clouds.has("maria") and visuals.clouds.maria.global_position.is_equal_approx(point), "fog exists at the selected world point")
	check(visuals.clouds.has("maria") and visuals.clouds.maria.get_child_count() == 18 and visuals.clouds.maria.get_child(0).modulate.a < .5, "clouds remain layered and readable")
	controller.rules.effects.clear()
	await process_frame
	await process_frame
	check(visuals.clouds.is_empty(), "end of concentration clears the volume")
	var actor: Dictionary = controller.rules.actors.mike
	actor.defeated = true
	actor.defeat_style = "unconscious"
	await process_frame
	await process_frame
	check(visuals.pools.has("mike") and visuals.pools.mike.visible and target.is_defeated, "fallen actor uses its own pose and a floor marker")
	target.hide()
	await process_frame
	await process_frame
	check(visuals.pools.has("mike") and not visuals.pools.mike.visible, "hidden body hides its floor marker")
	actor.defeated = false
	await process_frame
	await process_frame
	check(not visuals.pools.has("mike") and not target.is_physics_processing(), "hidden recovered actor remains inactive and leaves no stain")
	controller.rules.actors.maria.defeated = true
	controller.rules.actors.maria.defeat_style = "blood"
	await process_frame
	await process_frame
	check(hero.current_anim == "fall" and hero.is_defeated, "Trinity advances the authored fall after resolution")
	await create_timer(1.4).timeout
	check(hero.current_anim == "defeated" and hero.is_defeated, "fall settles on the existing ground pose")

func _compare() -> void:
	var before_script := _load_baseline("combat_visuals")
	var before_overlay := _load_baseline("combat_overlay")
	if not before_script or not before_overlay:
		check(false, "baseline source loads"); return
	controller.visuals.set_process(false)
	controller.visuals.hide()
	Engine.time_scale = 0.0
	for phase in ["antes", "despues"]:
		_reset_fixture()
		var visuals: Node3D = (before_script if phase == "antes" else Visuals).new()
		visuals.controller = controller
		main.add_child(visuals)
		visuals.set_process(false)
		var overlay: Control = (before_overlay if phase == "antes" else Overlay).new()
		overlay.controller = controller
		ui_canvas().add_child(overlay)
		controller.armed = _action("maria", "thrown-dagger")
		controller.preview_valid = true
		controller.preview_target = "mike"
		camera.size = 25.0
		await process_frame
		await _shot("alcance-lanzamiento", phase)
		camera.size = 7.9
		overlay.free()
		controller.armed = {}
		controller.ui.preferences.values["reducedMotion"] = true
		controller.rules.effects.append({"actor":"maria", "kind":"fog", "point":(hero.global_position+target.global_position)*.5, "radius":6.0})
		visuals._process(0)
		await _shot("niebla", phase)
		controller.rules.effects.clear()
		controller.ui.preferences.values["reducedMotion"] = false
		visuals._process(0)
		var other_tweens := get_processed_tweens()
		visuals.play(_event(_action("maria", "shortbow"), true, 4))
		_advance_tweens(other_tweens, .41)
		_advance_pose(hero, .41)
		await _shot("flecha", phase)
		_advance_tweens(other_tweens, 1.2)
		visuals._process(2)
		_reset_fixture()
		visuals.play(_event(_action("mike", "burning-hands"), true, 0, "mike", "").merged({"point":hero.global_position}))
		_advance_tweens(other_tweens, .53)
		_advance_pose(target, .53)
		await _shot("cono", phase)
		_advance_tweens(other_tweens, .8)
		visuals._process(2)
		_reset_fixture()
		controller.rules.actors.mike.defeated = true
		controller.rules.actors.mike.defeat_style = "blood"
		visuals._process(1.3)
		target.hide()
		visuals._process(0)
		await _shot("derrota-oculta", phase)
		controller.rules.actors.mike.defeated = false
		target.show()
		for tween in get_processed_tweens():
			if tween not in other_tweens: tween.kill()
		visuals.free()
	Engine.time_scale = 1.0

func ui_canvas() -> Control: return controller.ui.ui_root

func _reset_fixture() -> void:
	for body in [hero, target]:
		body.facing_dir = "s"
		body.play_action_animation("idle")
		body.vfx_timer = 0.0
		body.action_vfx_sprite.hide()
		body.set_physics_process(false)
		body._apply_procedural_motion(0.0, Vector2.ZERO, "idle")

func _advance_pose(body: Node3D, time: float) -> void:
	if body.has_method("process_frame_animation"): body.process_frame_animation(time)
	else: body._process_frame_animation(time)
	body._apply_procedural_motion(0.0, Vector2.ZERO, body.current_anim)

func _advance_tweens(existing: Array[Tween], time: float) -> void:
	for step in range(roundi(time * 60.0)):
		for tween in get_processed_tweens():
			if tween not in existing and tween.is_valid():
				tween.pause()
				tween.custom_step(1.0 / 60.0)
