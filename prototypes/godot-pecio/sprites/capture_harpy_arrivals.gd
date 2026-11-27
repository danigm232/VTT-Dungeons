extends SceneTree
const Registry = preload("res://characters/registry.gd")
const Facing = preload("res://sprites/sprite_facing.gd")

class PerchProbe extends Node:
	var contacts := 0
	func play_harpy_landing() -> void:
		contacts += 1

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
	output = ProjectSettings.globalize_path("res://../../output/stormwreck-harpy-arrivals-20261126")
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
	var cofa = combat.token("harpy")
	var ballista = combat.token("harpy_c2_lvl2")
	check(cofa != null and ballista != null and cofa != ballista, "two campaign harpies")
	check(combat.token("harpy-2") == null and not ballista.visible, "only one level-two reinforcement")
	for actor in [cofa, ballista]:
		for dir in Facing.DIRECTIONS:
			var bank: Dictionary = actor._pick_clip_from_profile("flight_turn", dir)
			check(bank.get("modular_definition") == "sw-harpy-flight-turn-" + dir, "%s turn uses authored %s" % [actor.name, dir])
			check(_distinct(bank) == 8 and not bank.get("flip_h", false), "%s bank uses eight unmirrored sprites" % dir)
			var landing: Dictionary = actor._pick_clip_from_profile("land", dir)
			check(str(landing.get("modular_definition", "")).begins_with("sw-harpy-land-") and _distinct(landing) == 8, "%s landing resolves its directional cycle" % dir)
		actor.set_physics_process(false)
	ui.clock_running = false
	ui.audio_muted = true
	var roof = scene.find_child("RoofCutout", true, false)
	roof.set_interior_mode("exterior", true)
	for body in ui.tokens_by_node.values():
		body.set_physics_process(false)
	camera.set_process(false)
	camera.set_physics_process(false)
	camera.projection = Camera3D.PROJECTION_ORTHOGONAL
	camera.size = 4.45
	ui._apply_harpy_world_presence(false, false)
	ui._apply_harpy_world_presence(true, false)
	check(cofa.current_anim == "flight_turn", "the canonical C10 return begins with a bank")
	scene.canon_ctrl.apply_party_level(2, false)
	ballista.set_meta("npc_reinforcement_visible", true)
	ballista.set_physics_process(false)
	check(ballista.visible and ballista.current_anim == "flight_turn", "the level-two C2 reveal begins with a bank")
	await create_timer(0.73).timeout
	check(cofa.current_anim == "land" and ballista.current_anim == "land", "both banks finish in landing")
	var probe := PerchProbe.new()
	root.add_child(probe)
	for actor in [cofa, ballista]:
		_focus(camera, actor)
		var position: Vector3 = actor.global_position
		actor.facing_dir = "w"
		_pose(actor, "flight_turn", "w", 3)
		var original_face: String = actor.facing_dir
		camera.look_at(camera.global_position + Vector3(0.4, -0.30, -1.0))
		actor._process_pose_visuals(0.0, Vector2.ZERO, "flight_turn")
		check(actor.facing_dir == original_face and actor.anim_frame_idx == 3, "camera orbit keeps body heading and bank frame")
		_focus(camera, actor)
		_pose(actor, "land", "w", 0)
		var tall: float = actor.harpy_arrival_lift("land")
		actor.queue_harpy_perch_contact(probe)
		_pose(actor, "land", "w", 4)
		var old_contacts := probe.contacts
		check(tall >= .35 and actor.harpy_arrival_lift("land") > 0.0, "talons approach from above")
		_pose(actor, "land", "w", 5)
		check(is_zero_approx(actor.harpy_arrival_lift("land")) and probe.contacts == old_contacts + 1, "contact begins on the grounded frame")
		_pose(actor, "land", "w", 7)
		check(probe.contacts == old_contacts + 1 and actor.global_position.is_equal_approx(position), "one contact and unchanged perch position")
	if capture:
		ui.set_role("dm")
		for entry in [[cofa,"cofa","n"], [ballista,"c2","w"]]:
			var actor = entry[0]
			var label: String = entry[1]
			var direction: String = entry[2]
			_focus(camera, actor)
			_pose(actor, "fly", direction, 4)
			await _save(label + "-antes")
			_pose(actor, "flight_turn", direction, 4)
			await _save(label + "-despues")
			_pose(actor, "land", direction, 5)
			await _save(label + "-aterrizaje")
	_finish()

func _distinct(clip: Dictionary) -> int:
	var textures := {}
	for frame: Dictionary in clip.get("frames", []):
		if frame.tex != null:
			textures[frame.tex.get_instance_id()] = true
	return textures.size()

func _focus(camera: Camera3D, actor: Node3D) -> void:
	var target := actor.global_position + Vector3.UP * .88
	camera.global_position = target + Vector3(0.0, 2.65, 6.0)
	camera.look_at(target)

func _pose(actor, state: String, direction: String, index: int) -> void:
	actor._resolve_and_apply_clip(state, direction, true)
	actor.anim_frame_idx = index
	actor.anim_timer = 0.0
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
	print("HARPY ARRIVALS ", JSON.stringify(report))
	quit(0 if errors.is_empty() else 1)
