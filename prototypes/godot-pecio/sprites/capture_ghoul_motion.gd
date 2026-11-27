extends SceneTree
## Review the C8 actor with the same camera and lighting for each comparison.
const Registry = preload("res://characters/registry.gd")
const Facing = preload("res://sprites/sprite_facing.gd")
var errors: Array[String] = []
var checks := 0
var capture := false
var output: String

func _initialize() -> void:
	_run.call_deferred()

func check(valid: bool, label: String) -> void:
	checks += 1
	if not valid:
		errors.append(label)
		printerr("FAIL: ", label)

func _run() -> void:
	capture = "--capture" in OS.get_cmdline_user_args()
	output = ProjectSettings.globalize_path("res://../../output/stormwreck-ghoul-20261126")
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
	var actor = combat.token("ghoul_c8")
	check(actor != null and actor.char_key == "sw-ghoul", "C8 uses the ghoul")
	if actor == null:
		_finish()
		return
	for direction in Facing.DIRECTIONS:
		for state in ["idle", "combat_idle", "walk", "run", "stealth", "turn", "start", "stop", "claw", "bite", "hit", "crawl", "fall", "stand"]:
			check(_distinct(actor._pick_clip_from_profile(state, direction)) == 8, "%s %s has eight decoded poses" % [state, direction])
		check(_distinct(actor._pick_clip_from_profile("defeated", direction)) == 1, "held fallen pose " + direction)
		check(_distinct(actor._pick_clip_from_profile("condition_paralizada", direction)) == 1, "held immobilized pose " + direction)
	for direction in ["se", "nw"]:
		for state in ["run", "stealth"]:
			var clip: Dictionary = actor._pick_clip_from_profile(state, direction)
			check(clip.get("modular_definition", "") == "sw-ghoul-%s-%s" % [state,direction], "%s %s uses authored art" % [state,direction])
	check(actor._pick_clip_from_profile("idle", "nw").get("modular_definition") == "sw-ghoul-idle-nw", "rear idle is authored")
	actor.set_physics_process(false)
	camera.set_process(false)
	camera.set_physics_process(false)
	camera.projection = Camera3D.PROJECTION_ORTHOGONAL
	camera.size = 4.35
	_focus(camera, actor, 0.0)
	actor.facing_dir = "nw"
	actor._ghoul_visual_heading = "nw"
	actor.action_lock_timer = 0.0
	actor._resolve_and_apply_clip("idle", "nw", true)
	actor._process_pose_visuals(0.0, Vector2.ZERO, "idle")
	actor._process_pose_visuals(0.0, Vector2.UP, "walk")
	check(actor.current_anim == "start", "idle to gait uses the start")
	actor.anim_frame_idx = 7
	actor._process_pose_visuals(0.0, Vector2.UP, "walk")
	check(actor.current_anim == "walk", "start flows into walking")
	actor._process_pose_visuals(0.0, Vector2.ZERO, "idle")
	check(actor.current_anim == "stop", "walk to idle uses the stop")
	actor.anim_frame_idx = 7
	actor._process_pose_visuals(0.0, Vector2.ZERO, "idle")
	check(actor.current_anim == "idle" and actor.facing_dir == "nw", "after stop the world heading stays northwest")
	var rear: Dictionary = actor._pick_clip_from_profile("idle", "nw")
	check(actor.sprite.texture == rear.frames[0].tex, "after stop it shows the rear idle pose")
	actor.anim_frame_idx = 3
	_focus(camera, actor, deg_to_rad(27.0))
	actor._process_pose_visuals(0.0, Vector2.ZERO, "idle")
	var angle := Facing.view_direction(actor, actor.facing_dir)
	var turned_view: Dictionary = actor._pick_clip_from_profile("idle", angle)
	check(angle != "nw" and actor.facing_dir == "nw" and actor.anim_frame_idx == 3 and actor.sprite.texture == turned_view.frames[3].tex, "camera changes the drawn view while keeping heading and phase")
	actor.facing_dir = "se"
	actor._process_pose_visuals(0.0, Vector2.ZERO, "idle")
	check(actor.current_anim == "turn", "an actual heading change triggers a turn")
	actor._resolve_and_apply_clip("condition_derribada", "se", true)
	actor._process_pose_visuals(0.0, Vector2.ZERO, "idle")
	check(actor.current_anim == "stand", "removing prone plays recovery")
	if capture:
		ui.clock_running = false
		ui.audio_muted = true
		ui.set_role("dm")
		var roof = scene.find_child("RoofCutout", true, false)
		roof.set_interior_mode("lower_c8_bilge", true)
		for body in ui.tokens_by_node.values():
			body.set_physics_process(false)
		actor.visible = true
		_focus(camera, actor, 0.0)
		for state in ["idle", "run", "stealth"]:
			# Reproduce the previous routes through the same live profile.
			var from: String = "idle" if state == "idle" else "walk"
			_pose(actor, from, "se" if state == "idle" else "nw", 4)
			await _save(state + "-antes")
			_pose(actor, state, "nw", 4)
			await _save(state + "-despues")
		for state in ["turn", "start", "stop", "hit", "crawl", "fall", "stand"]:
			_pose(actor, state, "nw", 5)
			await _save(state)
	var rules = combat.rules
	var started: bool = rules.start(["ghoul_c8", "maria"])
	check(started and rules.submit_initiative("ghoul_c8", 20) and rules.submit_initiative("maria", 10), "start a combat turn from the existing C8 profile")
	check(rules.basic("ghoul_c8", "dash"), "DM can apply Dash")
	actor.action_lock_timer = 0.0
	check(actor._resolve_desired_state(Vector2.RIGHT) == "run", "dash selects sprint throughout movement")
	check(rules.next_turn("ghoul_c8", true) and rules.next_turn("maria", true), "next round expires sprint")
	check(actor._resolve_desired_state(Vector2.RIGHT) == "walk", "ordinary movement resumes on the next turn")
	check(rules.basic("ghoul_c8", "hide", {"dm_confirmed": true}), "DM can apply Hide")
	actor.action_lock_timer = 0.0
	check(actor._resolve_desired_state(Vector2.RIGHT) == "stealth", "hide selects stalk during movement")
	rules.finish()
	_finish()

func _distinct(clip: Dictionary) -> int:
	var textures := {}
	for frame: Dictionary in clip.get("frames", []):
		if frame.tex != null:
			textures[frame.tex.get_instance_id()] = true
	return textures.size()

func _focus(camera: Camera3D, actor: Node3D, yaw: float) -> void:
	var target := actor.global_position + Vector3.UP * .78
	camera.global_position = target + Vector3(0.0, 2.45, 5.8).rotated(Vector3.UP, yaw)
	camera.look_at(target)

func _pose(actor: Node3D, state: String, direction: String, index: int) -> void:
	actor._resolve_and_apply_clip(state, direction, true)
	actor.anim_frame_idx = index
	actor.update_sprite_frame()
	actor._apply_procedural_motion(0, Vector2.ZERO, state)

func _save(id: String) -> void:
	await process_frame
	await RenderingServer.frame_post_draw
	var image := root.get_texture().get_image()
	check(image != null and image.save_png(output.path_join(id + ".png")) == OK, "captured " + id)

func _finish() -> void:
	var report := {"scope": "stormwreck-beasts", "revision": Registry.data().get("beast_revision", ""), "passed": errors.is_empty(), "checks": checks, "errors": errors}
	var file := FileAccess.open(output.path_join("native-render.json" if capture else "native-rules.json"), FileAccess.WRITE)
	file.store_string(JSON.stringify(report) + "\n")
	print("GHOUL MOTION ", JSON.stringify(report))
	quit(0 if errors.is_empty() else 1)
